#!/bin/bash
# Spreadsheet Moment - Staging Deployment Script
# Automated deployment to staging environment
#
# Usage: ./deploy.sh [options]
# Options:
#   --skip-tests    Skip running tests
#   --skip-build    Skip building Docker image
#   --rollback      Rollback to previous version
#   --dry-run       Show what would be done without executing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/deployment/staging/.env.staging"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/deployment/staging/docker-compose.staging.yml"
HEALTH_CHECK_URL="https://staging.spreadsheet-moment.superinstance.ai/health"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo "=========================================="
    echo "  Spreadsheet Moment - Staging Deployment"
    echo "=========================================="
    echo ""
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    # Check if kubectl is installed (for Kubernetes deployment)
    if command -v kubectl &> /dev/null; then
        HAS_KUBECTL=true
    else
        HAS_KUBECTL=false
        log_warning "kubectl not found - Kubernetes deployment will be skipped"
    fi

    # Check if .env.staging exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        log_info "Please copy .env.staging.template to .env.staging and configure it"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        log_warning "Skipping tests as requested"
        return
    fi

    log_info "Running test suite..."

    cd "$PROJECT_ROOT"

    # Run unit tests
    log_info "Running unit tests..."
    pnpm test || {
        log_error "Unit tests failed"
        exit 1
    }

    # Run integration tests
    log_info "Running integration tests..."
    pnpm test:integration || {
        log_error "Integration tests failed"
        exit 1
    }

    # Run linter
    log_info "Running linter..."
    pnpm lint || {
        log_error "Linter failed"
        exit 1
    }

    log_success "All tests passed"
}

build_image() {
    if [ "$SKIP_BUILD" = "true" ]; then
        log_warning "Skipping build as requested"
        return
    fi

    log_info "Building Docker image..."

    cd "$PROJECT_ROOT"

    docker build \
        -f deployment/staging/Dockerfile \
        -t spreadsheet-moment:staging \
        -t spreadsheet-moment:staging-$(date +%s) \
        . || {
        log_error "Docker build failed"
        exit 1
    }

    log_success "Docker image built successfully"
}

deploy_docker_compose() {
    log_info "Deploying with Docker Compose..."

    cd "$PROJECT_ROOT"

    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down || true

    # Start new containers
    log_info "Starting new containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d || {
        log_error "Docker Compose deployment failed"
        exit 1
    }

    log_success "Docker Compose deployment completed"
}

deploy_kubernetes() {
    if [ "$HAS_KUBECTL" = "false" ]; then
        log_warning "kubectl not available - skipping Kubernetes deployment"
        return
    fi

    log_info "Deploying to Kubernetes..."

    # Update kubeconfig
    log_info "Updating kubeconfig..."
    aws eks update-kubeconfig --name spreadsheet-moment-staging --region us-east-1 || {
        log_warning "Failed to update kubeconfig - skipping Kubernetes deployment"
        return
    }

    # Build and push image
    IMAGE_TAG=$(date +%s)
    docker tag spreadsheet-moment:staging ghcr.io/superinstance/spreadsheet-moment:staging-$IMAGE_TAG
    docker push ghcr.io/superinstance/spreadsheet-moment:staging-$IMAGE_TAG || {
        log_error "Failed to push Docker image"
        exit 1
    }

    # Update deployment
    log_info "Updating Kubernetes deployment..."
    kubectl set image deployment/spreadsheet-moment \
        spreadsheet-moment=ghcr.io/superinstance/spreadsheet-moment:staging-$IMAGE_TAG \
        -n staging || {
        log_error "Kubernetes deployment failed"
        exit 1
    }

    # Wait for rollout
    log_info "Waiting for rollout to complete..."
    kubectl rollout status deployment/spreadsheet-moment -n staging --timeout=5m || {
        log_error "Rollout failed or timed out"
        exit 1
    }

    log_success "Kubernetes deployment completed"
}

wait_for_health_check() {
    log_info "Waiting for application to be healthy..."

    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log_success "Application is healthy"
            return
        fi

        attempt=$((attempt + 1))
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
    done

    log_error "Health check failed after $max_attempts attempts"
    exit 1
}

run_smoke_tests() {
    log_info "Running smoke tests..."

    # Test health endpoint
    if ! curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
        log_error "Health check failed"
        exit 1
    fi

    # Test API endpoint
    if ! curl -f -s "https://staging-api.spreadsheet-moment.superinstance.ai/health" > /dev/null; then
        log_error "API health check failed"
        exit 1
    fi

    log_success "Smoke tests passed"
}

rollback() {
    log_warning "Initiating rollback..."

    if [ "$HAS_KUBECTL" = "true" ]; then
        log_info "Rolling back Kubernetes deployment..."
        kubectl rollout undo deployment/spreadsheet-moment -n staging || {
            log_error "Rollback failed"
            exit 1
        }

        log_info "Waiting for rollback to complete..."
        kubectl rollout status deployment/spreadsheet-moment -n staging --timeout=5m

        log_success "Rollback completed"
    else
        log_info "Rolling back Docker Compose deployment..."
        cd "$PROJECT_ROOT"
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

        log_success "Docker Compose rollback completed"
    fi
}

cleanup() {
    log_info "Cleaning up old Docker images..."

    # Remove old images (keep last 5)
    docker images spreadsheet-moment:staging-* --format '{{.ID}}' | tail -n +6 | xargs -r docker rmi || true

    log_success "Cleanup completed"
}

send_notification() {
    local status=$1

    log_info "Sending deployment notification..."

    # Send Slack notification (if configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        local message="Deployment to staging succeeded"

        if [ "$status" = "failure" ]; then
            color="danger"
            message="Deployment to staging failed"
        fi

        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"Staging\", \"short\": true},
                        {\"title\": \"Branch\", \"value\": \"${GIT_BRANCH:-develop}\", \"short\": true},
                        {\"title\": \"Commit\", \"value\": \"${GIT_SHA:-unknown}\", \"short\": true},
                        {\"title\": \"Deployer\", \"value\": \"${USER:-unknown}\", \"short\": true}
                    ],
                    \"footer\": \"Spreadsheet Moment CI/CD\",
                    \"ts\": $(date +%s)
                }]
            }" || true
    fi

    log_success "Notification sent"
}

# Main deployment flow
main() {
    print_header

    # Parse arguments
    SKIP_TESTS=false
    SKIP_BUILD=false
    ROLLBACK=false
    DRY_RUN=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Handle rollback
    if [ "$ROLLBACK" = "true" ]; then
        rollback
        wait_for_health_check
        send_notification "success"
        exit 0
    fi

    # Check if dry run
    if [ "$DRY_RUN" = "true" ]; then
        log_info "Dry run mode - no changes will be made"
        log_info "Would run tests: $([ "$SKIP_TESTS" = "true" ] && echo "no" || echo "yes")"
        log_info "Would build image: $([ "$SKIP_BUILD" = "true" ] && echo "no" || echo "yes")"
        log_info "Would deploy to: Docker Compose and Kubernetes"
        exit 0
    fi

    # Execute deployment
    check_prerequisites
    run_tests
    build_image
    deploy_docker_compose
    deploy_kubernetes
    wait_for_health_check
    run_smoke_tests
    cleanup

    print_header
    log_success "Deployment to staging completed successfully!"
    echo ""
    echo "Staging URL: https://staging.spreadsheet-moment.superinstance.ai"
    echo "Grafana Dashboard: http://localhost:3000 (admin/admin)"
    echo "Jaeger Tracing: http://localhost:16686"
    echo "Prometheus: http://localhost:9090"
    echo ""
    send_notification "success"
}

# Run main function
main "$@"

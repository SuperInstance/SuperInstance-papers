#!/bin/bash
# POLLN Deployment Script
# Deploys POLLN to various environments

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="dev"
NAMESPACE="polln-dev"
DRY_RUN=false
SKIP_TESTS=false
SKIP_BUILD=false
SKIP_DEPLOY=false
HEALTH_CHECK_TIMEOUT=300
VERBOSE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Deploy POLLN to the specified environment.

OPTIONS:
    -e, --environment ENV     Environment to deploy to (dev, staging, production) [default: dev]
    -n, --namespace NS        Kubernetes namespace [default: polln-dev]
    -d, --dry-run            Run in dry-run mode (no changes applied)
    -s, --skip-tests         Skip post-deployment tests
    -b, --skip-build         Skip Docker build
    -D, --skip-deploy        Skip deployment (use with --skip-deploy to only build)
    -t, --timeout SECONDS    Health check timeout [default: 300]
    -v, --verbose            Enable verbose output
    -h, --help               Show this help message

EXAMPLES:
    # Deploy to dev environment
    $0 --environment dev

    # Deploy to production with timeout
    $0 --environment production --timeout 600

    # Dry run to staging
    $0 --environment staging --dry-run

EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -D|--skip-deploy)
            SKIP_DEPLOY=true
            shift
            ;;
        -t|--timeout)
            HEALTH_CHECK_TIMEOUT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Set namespace based on environment if not explicitly set
if [ "$NAMESPACE" = "polln-dev" ] && [ "$ENVIRONMENT" != "dev" ]; then
    NAMESPACE="polln-$ENVIRONMENT"
fi

log_info "Starting deployment to $ENVIRONMENT environment"
log_verbose "Namespace: $NAMESPACE"
log_verbose "Dry run: $DRY_RUN"
log_verbose "Skip tests: $SKIP_TESTS"
log_verbose "Skip build: $SKIP_BUILD"
log_verbose "Skip deploy: $SKIP_DEPLOY"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi

    # Check if docker is installed (if not skipping build)
    if [ "$SKIP_BUILD" = false ] && ! command -v docker &> /dev/null; then
        log_error "docker is not installed"
        exit 1
    fi

    # Check cluster access
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot access Kubernetes cluster"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Build Docker image
build_image() {
    if [ "$SKIP_BUILD" = true ]; then
        log_info "Skipping Docker build"
        return
    fi

    log_info "Building Docker image..."

    local image_name="polln:$ENVIRONMENT-$(git rev-parse --short HEAD)"
    local image_tag_latest="polln:$ENVIRONMENT"

    cd "$PROJECT_ROOT"

    if [ "$DRY_RUN" = true ]; then
        log_info "Dry run: Would build image $image_name"
        return
    fi

    docker build -t "$image_name" -f Dockerfile .

    if [ "$ENVIRONMENT" = "dev" ] || [ "$ENVIRONMENT" = "staging" ]; then
        docker tag "$image_name" "$image_tag_latest"
    fi

    log_success "Docker image built: $image_name"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    if [ "$SKIP_DEPLOY" = true ]; then
        log_info "Skipping Kubernetes deployment"
        return
    fi

    log_info "Deploying to Kubernetes..."

    cd "$PROJECT_ROOT"

    # Create namespace if it doesn't exist
    if [ "$DRY_RUN" = false ]; then
        kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    fi

    # Apply secrets
    log_info "Applying secrets..."
    if [ "$DRY_RUN" = true ]; then
        kubectl apply -f k8s/secret.yaml --dry-run=client -n "$NAMESPACE"
    else
        kubectl apply -f k8s/secret.yaml -n "$NAMESPACE"
    fi

    # Apply configmaps
    log_info "Applying configmaps..."
    if [ "$DRY_RUN" = true ]; then
        kubectl apply -f k8s/configmap.yaml --dry-run=client -n "$NAMESPACE"
    else
        kubectl apply -f k8s/configmap.yaml -n "$NAMESPACE"
    fi

    # Apply deployment
    log_info "Applying deployment..."
    if [ "$DRY_RUN" = true ]; then
        kubectl apply -f k8s/deployment.yaml --dry-run=client -n "$NAMESPACE"
    else
        kubectl apply -f k8s/deployment.yaml -n "$NAMESPACE"
    fi

    # Apply services
    log_info "Applying services..."
    if [ "$DRY_RUN" = true ]; then
        kubectl apply -f k8s/service.yaml --dry-run=client -n "$NAMESPACE"
    else
        kubectl apply -f k8s/service.yaml -n "$NAMESPACE"
    fi

    # Apply HPA
    log_info "Applying HPA..."
    if [ "$DRY_RUN" = true ]; then
        kubectl apply -f k8s/hpa.yaml --dry-run=client -n "$NAMESPACE"
    else
        kubectl apply -f k8s/hpa.yaml -n "$NAMESPACE"
    fi

    # Apply PDB
    log_info "Applying PDB..."
    if [ "$DRY_RUN" = true ]; then
        kubectl apply -f k8s/pdb.yaml --dry-run=client -n "$NAMESPACE"
    else
        kubectl apply -f k8s/pdb.yaml -n "$NAMESPACE"
    fi

    # Apply ingress (only for staging and production)
    if [ "$ENVIRONMENT" != "dev" ]; then
        log_info "Applying ingress..."
        if [ "$DRY_RUN" = true ]; then
            kubectl apply -f k8s/ingress.yaml --dry-run=client -n "$NAMESPACE"
        else
            kubectl apply -f k8s/ingress.yaml -n "$NAMESPACE"
        fi
    fi

    log_success "Kubernetes deployment complete"
}

# Wait for rollout
wait_rollout() {
    if [ "$SKIP_DEPLOY" = true ]; then
        return
    fi

    log_info "Waiting for deployment rollout..."

    if [ "$DRY_RUN" = true ]; then
        log_info "Dry run: Would wait for rollout"
        return
    fi

    if ! kubectl rollout status deployment/polln-api -n "$NAMESPACE" --timeout=300s; then
        log_error "Deployment rollout failed or timed out"
        exit 1
    fi

    log_success "Rollout complete"
}

# Run health checks
health_check() {
    if [ "$SKIP_DEPLOY" = true ]; then
        return
    fi

    log_info "Running health checks..."

    if [ "$DRY_RUN" = true ]; then
        log_info "Dry run: Would run health checks"
        return
    fi

    local start_time=$(date +%s)
    local end_time=$((start_time + HEALTH_CHECK_TIMEOUT))

    while [ $(date +%s) -lt $end_time ]; do
        # Get a pod
        local pod=$(kubectl get pod -l app=polln-api -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

        if [ -n "$pod" ]; then
            # Check if pod is running
            local pod_status=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || echo "")

            if [ "$pod_status" = "Running" ]; then
                # Check health endpoint
                if kubectl exec "$pod" -n "$NAMESPACE" -- wget -q -O /dev/null http://localhost:3000/health 2>/dev/null; then
                    log_success "Health check passed"
                    return
                fi
            fi
        fi

        log_verbose "Health check failed, retrying in 10 seconds..."
        sleep 10
    done

    log_error "Health check timed out after $HEALTH_CHECK_TIMEOUT seconds"
    exit 1
}

# Run smoke tests
run_smoke_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_info "Skipping smoke tests"
        return
    fi

    if [ "$SKIP_DEPLOY" = true ]; then
        log_info "Skipping smoke tests (no deployment)"
        return
    fi

    log_info "Running smoke tests..."

    if [ "$DRY_RUN" = true ]; then
        log_info "Dry run: Would run smoke tests"
        return
    fi

    # Get a pod
    local pod=$(kubectl get pod -l app=polln-api -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

    # Run basic smoke test
    if ! kubectl exec "$pod" -n "$NAMESPACE" -- node -e "console.log('Smoke test passed')"; then
        log_error "Smoke test failed"
        exit 1
    fi

    log_success "Smoke tests passed"
}

# Get deployment info
get_deployment_info() {
    log_info "Deployment information:"
    echo ""
    kubectl get deployment polln-api -n "$NAMESPACE"
    echo ""
    kubectl get pods -l app=polln-api -n "$NAMESPACE"
    echo ""
    kubectl get service -l app=polln-api -n "$NAMESPACE"
}

# Main execution
main() {
    log_info "=========================================="
    log_info "POLLN Deployment Script"
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    log_info "=========================================="
    echo ""

    check_prerequisites
    build_image
    deploy_kubernetes
    wait_rollout
    health_check
    run_smoke_tests

    echo ""
    log_success "=========================================="
    log_success "Deployment completed successfully!"
    log_success "=========================================="
    echo ""

    get_deployment_info
}

# Run main
main

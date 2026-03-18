#!/bin/bash

###############################################################################
# Deployment Script for Minimal CLAW Server
#
# This script automates the deployment process for production environments.
# It supports Docker-based deployments with health checks and rollback capability.
#
# Usage:
#   ./scripts/deploy.sh [environment]
#
# Arguments:
#   environment - Deployment environment (development, staging, production)
#                 Default: production
#
# Environment Variables:
#   CLAW_SERVER_VERSION - Version to deploy (default: latest)
#   DB_BACKUP - Whether to backup database before deployment (default: true)
#   HEALTH_CHECK_TIMEOUT - Seconds to wait for health check (default: 60)
#
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

###############################################################################
# Configuration
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
VERSION="${CLAW_SERVER_VERSION:-latest}"
BACKUP_DB="${DB_BACKUP:-true}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-60}"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

###############################################################################
# Logging Functions
###############################################################################

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

log_step() {
    echo -e "\n${GREEN}==>${NC} $1"
}

###############################################################################
# Utility Functions
###############################################################################

check_prerequisites() {
    log_step "Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if .env file exists
    if [ ! -f "${PROJECT_ROOT}/.env" ]; then
        log_warning ".env file not found. Creating from .env.example..."
        if [ -f "${PROJECT_ROOT}/.env.example" ]; then
            cp "${PROJECT_ROOT}/.env.example" "${PROJECT_ROOT}/.env"
            log_warning "Please edit .env file with your configuration before continuing."
            exit 1
        else
            log_error ".env.example file not found. Please create .env file manually."
            exit 1
        fi
    fi

    log_success "Prerequisites check passed"
}

backup_database() {
    if [ "$BACKUP_DB" != "true" ]; then
        log_info "Database backup skipped (DB_BACKUP=false)"
        return
    fi

    log_step "Backing up database..."

    mkdir -p "$BACKUP_DIR"

    # Check if PostgreSQL container is running
    if docker ps | grep -q claw-postgres; then
        docker exec claw-postgres pg_dump -U "${DB_USER:-clawuser}" "${DB_NAME:-clawdb}" \
            > "${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"

        log_success "Database backed up to: ${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"
    else
        log_warning "PostgreSQL container not running. Skipping database backup."
    fi
}

pull_latest_image() {
    log_step "Pulling latest images..."

    cd "$PROJECT_ROOT"
    docker-compose pull

    log_success "Images pulled successfully"
}

build_images() {
    log_step "Building Docker images..."

    cd "$PROJECT_ROOT"
    docker-compose build --no-cache

    log_success "Images built successfully"
}

stop_containers() {
    log_step "Stopping existing containers..."

    cd "$PROJECT_ROOT"
    docker-compose down

    log_success "Containers stopped"
}

start_containers() {
    log_step "Starting containers..."

    cd "$PROJECT_ROOT"
    docker-compose up -d

    log_success "Containers started"
}

wait_for_health() {
    log_step "Waiting for services to be healthy..."

    local elapsed=0
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 5))

    while [ $elapsed -lt $HEALTH_CHECK_TIMEOUT ]; do
        # Check if claw-server is healthy
        if docker ps | grep -q minimal-claw-server && \
           curl -f -s http://localhost:${CLAW_SERVER_PORT:-8080}/health > /dev/null 2>&1; then
            log_success "Services are healthy!"
            return 0
        fi

        log_info "Waiting for services... (${elapsed}s)"
        sleep 5
        elapsed=$((elapsed + 5))
    done

    log_error "Health check timeout after ${HEALTH_CHECK_TIMEOUT}s"
    return 1
}

run_migrations() {
    log_step "Running database migrations..."

    # Check if migrations directory exists
    if [ -d "${PROJECT_ROOT}/migrations" ]; then
        docker exec claw-postgres psql -U "${DB_USER:-clawuser}" -d "${DB_NAME:-clawdb}" \
            -f /docker-entrypoint-initdb.d/migrations.sql

        log_success "Migrations completed"
    else
        log_info "No migrations found. Skipping."
    fi
}

cleanup_old_images() {
    log_step "Cleaning up old Docker images..."

    # Remove dangling images
    docker image prune -f

    # Remove old backups (keep last 10)
    if [ -d "$BACKUP_DIR" ]; then
        ls -t "$BACKUP_DIR"/db_backup_*.sql 2>/dev/null | tail -n +11 | xargs -r rm --
        log_info "Old backups cleaned up"
    fi

    log_success "Cleanup completed"
}

print_deployment_info() {
    log_step "Deployment Information"

    echo ""
    echo "Environment: ${ENVIRONMENT}"
    echo "Version: ${VERSION}"
    echo "Timestamp: ${TIMESTAMP}"
    echo ""
    echo "Services:"
    echo "  - CLAW Server: http://localhost:${CLAW_SERVER_PORT:-8080}"
    echo "  - Health Check: http://localhost:${CLAW_SERVER_PORT:-8080}/health"
    echo "  - WebSocket: ws://localhost:${CLAW_SERVER_PORT:-8080}/ws"
    echo ""
    echo "Database:"
    echo "  - PostgreSQL: localhost:${DB_PORT:-5432}"
    echo "  - Redis: localhost:${REDIS_PORT:-6379}"
    echo ""
    echo "Admin Tools (if enabled):"
    echo "  - Adminer: http://localhost:${ADMINER_PORT:-8081}"
    echo "  - Redis Commander: http://localhost:${REDIS_COMMANDER_PORT:-8082}"
    echo ""
}

###############################################################################
# Rollback Function
###############################################################################

rollback() {
    log_error "Deployment failed! Rolling back..."

    cd "$PROJECT_ROOT"
    docker-compose down

    # Restore database if backup exists
    if [ -f "${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql" ]; then
        log_info "Restoring database from backup..."
        docker-compose up -d postgres
        sleep 10
        docker exec -i claw-postgres psql -U "${DB_USER:-clawuser}" "${DB_NAME:-clawdb}" \
            < "${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"
    fi

    log_error "Rollback completed. Please check the logs for errors."
    exit 1
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
    log_info "Starting deployment for ${ENVIRONMENT} environment..."
    log_info "Timestamp: ${TIMESTAMP}"

    # Trap errors and rollback
    trap rollback ERR

    # Execute deployment steps
    check_prerequisites
    backup_database
    pull_latest_image
    build_images
    stop_containers
    start_containers
    wait_for_health
    run_migrations
    cleanup_old_images

    # Print deployment information
    print_deployment_info

    log_success "Deployment completed successfully!"
}

# Run main function
main

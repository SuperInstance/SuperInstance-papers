#!/bin/bash

###############################################################################
# Rollback Script for Minimal CLAW Server
#
# This script rolls back to a previous deployment by restoring from backup.
#
# Usage:
#   ./scripts/rollback.sh [backup_file]
#
# Arguments:
#   backup_file - Optional: Specific backup file to restore
#                 If not provided, the most recent backup will be used
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
BACKUP_DIR="${PROJECT_ROOT}/backups"
SPECIFIC_BACKUP="$1"

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

find_latest_backup() {
    log_step "Finding latest backup..."

    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi

    local latest_backup=$(ls -t "$BACKUP_DIR"/db_backup_*.sql 2>/dev/null | head -n 1)

    if [ -z "$latest_backup" ]; then
        log_error "No backup files found in $BACKUP_DIR"
        exit 1
    fi

    log_success "Latest backup found: $latest_backup"
    echo "$latest_backup"
}

confirm_rollback() {
    local backup_file="$1"

    log_warning "You are about to rollback to: $backup_file"
    log_warning "This will replace the current database with the backup."
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirmation

    if [ "$confirmation" != "yes" ]; then
        log_info "Rollback cancelled."
        exit 0
    fi
}

stop_containers() {
    log_step "Stopping containers..."

    cd "$PROJECT_ROOT"
    docker-compose down

    log_success "Containers stopped"
}

start_postgres() {
    log_step "Starting PostgreSQL container..."

    cd "$PROJECT_ROOT"
    docker-compose up -d postgres

    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker exec claw-postgres pg_isready -U "${DB_USER:-clawuser}" &> /dev/null; then
            log_success "PostgreSQL is ready"
            return 0
        fi

        attempt=$((attempt + 1))
        sleep 2
    done

    log_error "PostgreSQL failed to start"
    exit 1
}

restore_database() {
    local backup_file="$1"

    log_step "Restoring database from backup..."

    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi

    # Drop existing database and create new one
    docker exec claw-postgres psql -U "${DB_USER:-clawuser}" -d postgres \
        -c "DROP DATABASE IF EXISTS ${DB_NAME:-clawdb};"
    docker exec claw-postgres psql -U "${DB_USER:-clawuser}" -d postgres \
        -c "CREATE DATABASE ${DB_NAME:-clawdb};"

    # Restore from backup
    docker exec -i claw-postgres psql -U "${DB_USER:-clawuser}" "${DB_NAME:-clawdb}" < "$backup_file"

    log_success "Database restored successfully"
}

start_all_containers() {
    log_step "Starting all containers..."

    cd "$PROJECT_ROOT"
    docker-compose up -d

    log_success "Containers started"
}

wait_for_health() {
    log_step "Waiting for services to be healthy..."

    local elapsed=0
    local max_attempts=30

    while [ $elapsed -lt $max_attempts ]; do
        if curl -f -s http://localhost:${CLAW_SERVER_PORT:-8080}/health > /dev/null 2>&1; then
            log_success "Services are healthy!"
            return 0
        fi

        log_info "Waiting for services... (${elapsed}s)"
        sleep 5
        elapsed=$((elapsed + 5))
    done

    log_warning "Health check timeout, but rollback completed"
}

print_rollback_info() {
    log_step "Rollback Information"

    echo ""
    echo "Rollback completed successfully!"
    echo ""
    echo "Services:"
    echo "  - CLAW Server: http://localhost:${CLAW_SERVER_PORT:-8080}"
    echo "  - Health Check: http://localhost:${CLAW_SERVER_PORT:-8080}/health"
    echo ""
    echo "Database restored from: $1"
    echo ""
}

###############################################################################
# Main Rollback Flow
###############################################################################

main() {
    log_info "Starting rollback process..."

    # Determine which backup to use
    local backup_file
    if [ -n "$SPECIFIC_BACKUP" ]; then
        backup_file="$SPECIFIC_BACKUP"
        if [ ! -f "$backup_file" ]; then
            # Check if it's a relative path
            if [ -f "$BACKUP_DIR/$backup_file" ]; then
                backup_file="$BACKUP_DIR/$backup_file"
            else
                log_error "Backup file not found: $backup_file"
                exit 1
            fi
        fi
    else
        backup_file=$(find_latest_backup)
    fi

    # Confirm rollback
    confirm_rollback "$backup_file"

    # Execute rollback
    stop_containers
    start_postgres
    restore_database "$backup_file"
    start_all_containers
    wait_for_health

    # Print rollback information
    print_rollback_info "$backup_file"

    log_success "Rollback completed successfully!"
}

# Run main function
main

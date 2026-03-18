#!/bin/bash

###############################################################################
# Backup Script for Minimal CLAW Server
#
# This script creates backups of the database and important configuration files.
#
# Usage:
#   ./scripts/backup.sh [--database] [--config] [--all]
#
# Options:
#   --database  - Backup database only (default)
#   --config    - Backup configuration files only
#   --all       - Backup everything
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
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

BACKUP_DATABASE=true
BACKUP_CONFIG=false
BACKUP_ALL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --database)
            BACKUP_DATABASE=true
            shift
            ;;
        --config)
            BACKUP_CONFIG=true
            BACKUP_DATABASE=false
            shift
            ;;
        --all)
            BACKUP_ALL=true
            BACKUP_DATABASE=true
            BACKUP_CONFIG=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--database] [--config] [--all]"
            exit 1
            ;;
    esac
done

# Colors for output
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

log_step() {
    echo -e "\n${GREEN}==>${NC} $1"
}

###############################################################################
# Backup Functions
###############################################################################

setup_backup_dir() {
    log_step "Setting up backup directory..."

    mkdir -p "$BACKUP_DIR"

    log_success "Backup directory ready: $BACKUP_DIR"
}

backup_database() {
    log_step "Backing up PostgreSQL database..."

    # Check if PostgreSQL container is running
    if ! docker ps | grep -q claw-postgres; then
        log_warning "PostgreSQL container is not running. Skipping database backup."
        return 1
    fi

    # Create database backup
    local backup_file="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"

    docker exec claw-postgres pg_dump -U "${DB_USER:-clawuser}" "${DB_NAME:-clawdb}" \
        --no-owner --no-acl > "$backup_file"

    # Compress backup
    gzip "$backup_file"

    log_success "Database backed up to: ${backup_file}.gz"
}

backup_redis() {
    log_step "Backing up Redis data..."

    # Check if Redis container is running
    if ! docker ps | grep -q claw-redis; then
        log_warning "Redis container is not running. Skipping Redis backup."
        return 1
    fi

    # Create Redis backup
    local backup_file="${BACKUP_DIR}/redis_backup_${TIMESTAMP}.rdb"

    docker exec claw-redis redis-cli --rdb - > "$backup_file" 2>/dev/null || \
        docker cp claw-redis:/data/dump.rdb "$backup_file"

    # Compress backup
    gzip "$backup_file"

    log_success "Redis backed up to: ${backup_file}.gz"
}

backup_config() {
    log_step "Backing up configuration files..."

    # Create config backup directory
    local config_backup_dir="${BACKUP_DIR}/config_${TIMESTAMP}"
    mkdir -p "$config_backup_dir"

    # Backup .env file
    if [ -f "${PROJECT_ROOT}/.env" ]; then
        cp "${PROJECT_ROOT}/.env" "${config_backup_dir}/.env"
        log_success ".env file backed up"
    fi

    # Backup docker-compose.yml
    if [ -f "${PROJECT_ROOT}/docker-compose.yml" ]; then
        cp "${PROJECT_ROOT}/docker-compose.yml" "${config_backup_dir}/"
        log_success "docker-compose.yml backed up"
    }

    # Backup nginx configuration
    if [ -d "${PROJECT_ROOT}/nginx" ]; then
        cp -r "${PROJECT_ROOT}/nginx" "${config_backup_dir}/"
        log_success "nginx configuration backed up"
    fi

    # Create tarball
    tar -czf "${config_backup_dir}.tar.gz" -C "$BACKUP_DIR" "config_${TIMESTAMP}"
    rm -rf "$config_backup_dir"

    log_success "Configuration backed up to: ${config_backup_dir}.tar.gz"
}

cleanup_old_backups() {
    log_step "Cleaning up old backups..."

    # Find and remove backups older than RETENTION_DAYS
    find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "redis_backup_*.rdb.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime +$RETENTION_DAYS -delete

    log_success "Old backups cleaned up (older than ${RETENTION_DAYS} days)"
}

print_backup_summary() {
    log_step "Backup Summary"

    echo ""
    echo "Backup completed at: $(date)"
    echo "Backup location: $BACKUP_DIR"
    echo ""

    # List all backups
    echo "Available backups:"
    echo "=================="

    if ls "$BACKUP_DIR"/db_backup_*.sql.gz 1> /dev/null 2>&1; then
        echo ""
        echo "Database backups:"
        ls -lh "$BACKUP_DIR"/db_backup_*.sql.gz | awk '{print "  " $9 " (" $5 ")"}'
    fi

    if ls "$BACKUP_DIR"/redis_backup_*.rdb.gz 1> /dev/null 2>&1; then
        echo ""
        echo "Redis backups:"
        ls -lh "$BACKUP_DIR"/redis_backup_*.rdb.gz | awk '{print "  " $9 " (" $5 ")"}'
    fi

    if ls "$BACKUP_DIR"/config_*.tar.gz 1> /dev/null 2>&1; then
        echo ""
        echo "Configuration backups:"
        ls -lh "$BACKUP_DIR"/config_*.tar.gz | awk '{print "  " $9 " (" $5 ")"}'
    fi

    echo ""
}

upload_to_remote() {
    # Optional: Upload backups to remote storage
    # This is a placeholder for remote backup functionality
    #
    # Example implementations:
    # - AWS S3: aws s3 cp $BACKUP_DIR s3://your-bucket/backups/ --recursive
    # - Google Cloud Storage: gsutil -m cp -r $BACKUP_DIR gs://your-bucket/backups/
    # - Azure Blob Storage: az storage blob upload-batch -d backups -s $BACKUP_DIR

    log_info "Remote backup upload not configured"
}

###############################################################################
# Main Backup Flow
###############################################################################

main() {
    log_info "Starting backup process..."
    log_info "Timestamp: $TIMESTAMP"

    # Setup backup directory
    setup_backup_dir

    # Perform backups
    if [ "$BACKUP_DATABASE" = true ] || [ "$BACKUP_ALL" = true ]; then
        backup_database
        backup_redis
    fi

    if [ "$BACKUP_CONFIG" = true ] || [ "$BACKUP_ALL" = true ]; then
        backup_config
    fi

    # Cleanup old backups
    cleanup_old_backups

    # Print summary
    print_backup_summary

    # Optional: Upload to remote
    # upload_to_remote

    log_success "Backup completed successfully!"
}

# Run main function
main

#!/bin/bash
# POLLN Database Migration Script
# Runs database migrations safely

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
NAMESPACE="${NAMESPACE:-polln-prod}"
DEPLOYMENT="${DEPLOYMENT:-polln-api}"
MIGRATION_DIR="${MIGRATION_DIR:-${PROJECT_ROOT}/migrations}"
TIMEOUT="${TIMEOUT:-10m}"
DRY_RUN="${DRY_RUN:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Functions
# =============================================================================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

check_migrations() {
    if [[ ! -d "$MIGRATION_DIR" ]]; then
        log_error "Migration directory not found: $MIGRATION_DIR"
        exit 1
    fi

    local migration_count=$(find "$MIGRATION_DIR" -name "*.sql" | wc -l)

    if [[ $migration_count -eq 0 ]]; then
        log_warn "No migration files found"
        return 1
    fi

    log_info "Found $migration_count migration(s)"
}

get_pod() {
    kubectl get pods -n "$NAMESPACE" -l app=polln,component=api -o jsonpath='{.items[0].metadata.name}'
}

run_migration() {
    local migration_file="$1"
    local pod="$2"

    log_info "Running migration: $(basename "$migration_file")"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would execute $(basename "$migration_file")"
        return
    fi

    # Copy migration file to pod
    kubectl cp "$migration_file" "$NAMESPACE/$pod:/tmp/migration.sql"

    # Execute migration
    kubectl exec -n "$NAMESPACE" "$pod" -- \
        psql \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -f /tmp/migration.sql

    # Clean up
    kubectl exec -n "$NAMESPACE" "$pod" -- rm -f /tmp/migration.sql
}

backup_database() {
    local pod="$1"

    log_step "Creating database backup..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would create backup"
        return
    fi

    local timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
    local backup_file="/tmp/polln-backup-${timestamp}.sql"

    kubectl exec -n "$NAMESPACE" "$pod" -- \
        pg_dump \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --clean \
        --if-exists \
        > "$backup_file"

    log_info "Backup saved to $backup_file"
}

verify_migration() {
    local pod="$1"

    log_step "Verifying migration..."

    # Run verification query
    kubectl exec -n "$NAMESPACE" "$pod" -- \
        psql \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -c "SELECT COUNT(*) FROM schema_migrations;"
}

list_migrations() {
    log_info "Pending migrations:"

    for migration in "$MIGRATION_DIR"/*.sql; do
        if [[ -f "$migration" ]]; then
            echo "  - $(basename "$migration")"
        fi
    done
}

print_usage() {
    cat <<EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    run             Run pending migrations (default)
    list            List pending migrations
    backup          Create database backup
    verify          Verify migration status
    help            Show this help message

Options:
    NAMESPACE       Kubernetes namespace (default: polln-prod)
    MIGRATION_DIR   Directory containing migration files
    DRY_RUN         Print what would be done (default: false)
    TIMEOUT         Pod execution timeout (default: 10m)

Environment Variables:
    NAMESPACE       Override namespace
    MIGRATION_DIR   Override migration directory
    DRY_RUN         Set to "true" for dry run
    TIMEOUT         Set timeout duration

Database Configuration:
    POSTGRES_HOST   PostgreSQL host (default from ConfigMap)
    POSTGRES_USER   PostgreSQL user (default from Secret)
    POSTGRES_DB     PostgreSQL database (default from ConfigMap)

Examples:
    $0 run
    $0 list
    $0 backup
    $0 run DRY_RUN=true
    $0 run MIGRATION_DIR=./custom-migrations

EOF
}

# =============================================================================
# Commands
# =============================================================================
cmd_run() {
    log_info "Running database migrations..."

    check_kubectl
    check_migrations || exit 0

    local pod=$(get_pod)

    if [[ -z "$pod" ]]; then
        log_error "No running pods found"
        exit 1
    fi

    log_info "Using pod: $pod"

    # Backup before migration
    backup_database "$pod"

    # Run migrations
    for migration in "$MIGRATION_DIR"/*.sql; do
        if [[ -f "$migration" ]]; then
            run_migration "$migration" "$pod"
        fi
    done

    # Verify migrations
    verify_migration "$pod"

    log_info "Migrations complete!"
}

cmd_list() {
    log_info "Listing migrations..."

    check_migrations || exit 0
    list_migrations
}

cmd_backup() {
    log_info "Creating database backup..."

    check_kubectl

    local pod=$(get_pod)

    if [[ -z "$pod" ]]; then
        log_error "No running pods found"
        exit 1
    fi

    backup_database "$pod"

    log_info "Backup complete!"
}

cmd_verify() {
    log_info "Verifying migration status..."

    check_kubectl

    local pod=$(get_pod)

    if [[ -z "$pod" ]]; then
        log_error "No running pods found"
        exit 1
    fi

    verify_migration "$pod"

    log_info "Verification complete!"
}

# =============================================================================
# Main
# =============================================================================
main() {
    local command="${1:-run}"
    shift || true

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            NAMESPACE=*)
                NAMESPACE="${1#*=}"
                shift
                ;;
            MIGRATION_DIR=*)
                MIGRATION_DIR="${1#*=}"
                shift
                ;;
            DRY_RUN=*)
                DRY_RUN="${1#*=}"
                shift
                ;;
            TIMEOUT=*)
                TIMEOUT="${1#*=}"
                shift
                ;;
            POSTGRES_HOST=*)
                export POSTGRES_HOST="${1#*=}"
                shift
                ;;
            POSTGRES_USER=*)
                export POSTGRES_USER="${1#*=}"
                shift
                ;;
            POSTGRES_DB=*)
                export POSTGRES_DB="${1#*=}"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Execute command
    case $command in
        run)
            cmd_run
            ;;
        list)
            cmd_list
            ;;
        backup)
            cmd_backup
            ;;
        verify)
            cmd_verify
            ;;
        help|--help|-h)
            print_usage
            ;;
        *)
            log_error "Unknown command: $command"
            print_usage
            exit 1
            ;;
    esac
}

main "$@"

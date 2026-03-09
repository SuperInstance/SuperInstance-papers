#!/bin/bash
# POLLN Rollback Script
# Rolls back deployment to previous version

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
NAMESPACE="${NAMESPACE:-polln-prod}"
DEPLOYMENT="${DEPLOYMENT:-polln-api}"
TIMEOUT="${TIMEOUT:-5m}"
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

confirm_rollback() {
    log_warn "About to rollback $DEPLOYMENT in namespace $NAMESPACE"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
}

check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
}

get_current_replicas() {
    kubectl get deployment "$DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}'
}

get_current_image() {
    kubectl get deployment "$DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}'
}

get_revisions() {
    kubectl rollout history deployment "$DEPLOYMENT" -n "$NAMESPACE"
}

rollback_undo() {
    log_step "Rolling back to previous revision..."

    if [[ "$DRY_RUN" == "true" ]]; then
        kubectl rollout undo deployment "$DEPLOYMENT" -n "$NAMESPACE" --dry-run=server
    else
        kubectl rollout undo deployment "$DEPLOYMENT" -n "$NAMESPACE"
    fi
}

rollback_to_revision() {
    local revision="$1"

    log_step "Rolling back to revision $revision..."

    if [[ "$DRY_RUN" == "true" ]]; then
        kubectl rollout undo deployment "$DEPLOYMENT" -n "$NAMESPACE" --to-revision="$revision" --dry-run=server
    else
        kubectl rollout undo deployment "$DEPLOYMENT" -n "$NAMESPACE" --to-revision="$revision"
    fi
}

wait_for_rollout() {
    log_step "Waiting for rollout..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Skipping rollout wait"
        return
    fi

    kubectl rollout status deployment "$DEPLOYMENT" -n "$NAMESPACE" --timeout="$TIMEOUT"
}

verify_rollback() {
    log_step "Verifying rollback..."

    local current_image=$(get_current_image)
    local current_replicas=$(get_current_replicas)

    log_info "Current image: $current_image"
    log_info "Current replicas: $current_replicas"

    log_info "Pod status:"
    kubectl get pods -n "$NAMESPACE" -l app=polln,component=api
}

save_state() {
    local timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
    local state_file="/tmp/polln-rollback-${timestamp}.json"

    log_info "Saving state to $state_file"

    kubectl get deployment "$DEPLOYMENT" -n "$NAMESPACE" -o json > "$state_file"

    log_info "State saved"
}

print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS] [REVISION]

Rollback POLLN deployment to previous revision.

Arguments:
    REVISION        Specific revision to rollback to (optional)

Options:
    NAMESPACE       Kubernetes namespace (default: polln-prod)
    DEPLOYMENT      Deployment name (default: polln-api)
    TIMEOUT         Rollout timeout (default: 5m)
    DRY_RUN         Print what would be done (default: false)
    SKIP_CONFIRM    Skip confirmation prompt (default: false)

Environment Variables:
    NAMESPACE       Override namespace
    DEPLOYMENT      Override deployment name
    TIMEOUT         Set timeout duration
    DRY_RUN         Set to "true" for dry run

Examples:
    $0                           # Rollback to previous revision
    $0 5                         # Rollback to revision 5
    $0 NAMESPACE=polln-staging    # Rollback in staging
    $0 DRY_RUN=true              # Show what would be done
    $0 --skip-confirm            # Rollback without prompting

EOF
}

# =============================================================================
# Main
# =============================================================================
main() {
    local revision=""
    local skip_confirm=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            NAMESPACE=*)
                NAMESPACE="${1#*=}"
                shift
                ;;
            DEPLOYMENT=*)
                DEPLOYMENT="${1#*=}"
                shift
                ;;
            TIMEOUT=*)
                TIMEOUT="${1#*=}"
                shift
                ;;
            DRY_RUN=*)
                DRY_RUN="${1#*=}"
                shift
                ;;
            --skip-confirm)
                skip_confirm=true
                shift
                ;;
            --help|-h)
                print_usage
                exit 0
                ;;
            -*)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
            *)
                revision="$1"
                shift
                ;;
        esac
    done

    log_info "POLLN Rollback Script"
    log_info "Namespace: $NAMESPACE"
    log_info "Deployment: $DEPLOYMENT"
    log_info "Dry run: $DRY_RUN"

    check_kubectl

    log_info "Current state:"
    log_info "  Image: $(get_current_image)"
    log_info "  Replicas: $(get_current_replicas)"

    log_info "Revision history:"
    get_revisions

    # Confirm rollback
    if [[ "$skip_confirm" == false ]]; then
        confirm_rollback
    fi

    # Save current state before rollback
    save_state

    # Perform rollback
    if [[ -n "$revision" ]]; then
        rollback_to_revision "$revision"
    else
        rollback_undo
    fi

    # Wait for rollout
    wait_for_rollout

    # Verify rollback
    verify_rollback

    log_info "Rollback complete!"
}

main "$@"

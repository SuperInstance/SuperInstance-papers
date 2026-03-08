#!/bin/bash
# POLLN Rollback Script
# Rolls back POLLN deployment to previous version

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values
NAMESPACE="polln-dev"
REVISION=""
DRY_RUN=false
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

Rollback POLLN deployment to previous version.

OPTIONS:
    -n, --namespace NS        Kubernetes namespace [default: polln-dev]
    -r, --revision REV        Specific revision to rollback to (default: previous)
    -d, --dry-run            Run in dry-run mode (no changes applied)
    -v, --verbose            Enable verbose output
    -h, --help               Show this help message

EXAMPLES:
    # Rollback to previous version
    $0

    # Rollback to specific revision
    $0 --revision 3

    # Rollback in production namespace
    $0 --namespace polln-prod

    # Dry run to preview changes
    $0 --dry-run

EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--revision)
            REVISION="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
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

log_info "Starting rollback in namespace $NAMESPACE"
log_verbose "Dry run: $DRY_RUN"
log_verbose "Revision: ${REVISION:-previous}"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi

    # Check cluster access
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot access Kubernetes cluster"
        exit 1
    fi

    # Check if deployment exists
    if ! kubectl get deployment polln-api -n "$NAMESPACE" &> /dev/null; then
        log_error "Deployment polln-api not found in namespace $NAMESPACE"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Show current deployment status
show_current_status() {
    log_info "Current deployment status:"
    echo ""
    kubectl rollout history deployment/polln-api -n "$NAMESPACE"
    echo ""
}

# Confirm rollback
confirm_rollback() {
    if [ "$DRY_RUN" = true ]; then
        return
    fi

    log_warning "This will rollback the deployment in namespace $NAMESPACE"
    read -p "Are you sure? (yes/no): " confirmation

    if [ "$confirmation" != "yes" ]; then
        log_info "Rollback cancelled"
        exit 0
    fi
}

# Perform rollback
perform_rollback() {
    log_info "Performing rollback..."

    if [ -n "$REVISION" ]; then
        log_info "Rolling back to revision $REVISION"
        if [ "$DRY_RUN" = true ]; then
            kubectl rollout undo deployment/polln-api --to-revision="$REVISION" --dry-run=client -n "$NAMESPACE"
        else
            kubectl rollout undo deployment/polln-api --to-revision="$REVISION" -n "$NAMESPACE"
        fi
    else
        log_info "Rolling back to previous revision"
        if [ "$DRY_RUN" = true ]; then
            kubectl rollout undo deployment/polln-api --dry-run=client -n "$NAMESPACE"
        else
            kubectl rollout undo deployment/polln-api -n "$NAMESPACE"
        fi
    fi

    log_success "Rollback initiated"
}

# Wait for rollback
wait_rollback() {
    log_info "Waiting for rollback to complete..."

    if [ "$DRY_RUN" = true ]; then
        log_info "Dry run: Would wait for rollback"
        return
    fi

    if ! kubectl rollout status deployment/polln-api -n "$NAMESPACE" --timeout=300s; then
        log_error "Rollback failed or timed out"
        exit 1
    fi

    log_success "Rollback complete"
}

# Verify rollback
verify_rollback() {
    log_info "Verifying rollback..."

    if [ "$DRY_RUN" = true ]; then
        log_info "Dry run: Would verify rollback"
        return
    fi

    # Get a pod
    local pod=$(kubectl get pod -l app=polln-api -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -n "$pod" ]; then
        # Check if pod is running
        local pod_status=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || echo "")

        if [ "$pod_status" = "Running" ]; then
            # Check health endpoint
            if kubectl exec "$pod" -n "$NAMESPACE" -- wget -q -O /dev/null http://localhost:3000/health 2>/dev/null; then
                log_success "Rollback verification passed"
                return
            fi
        fi
    fi

    log_error "Rollback verification failed"
    exit 1
}

# Show rollback status
show_rollback_status() {
    log_info "Rollback deployment status:"
    echo ""
    kubectl get deployment polln-api -n "$NAMESPACE"
    echo ""
    kubectl get pods -l app=polln-api -n "$NAMESPACE"
    echo ""
    kubectl rollout history deployment/polln-api -n "$NAMESPACE"
}

# Main execution
main() {
    log_info "=========================================="
    log_info "POLLN Rollback Script"
    log_info "Namespace: $NAMESPACE"
    log_info "=========================================="
    echo ""

    check_prerequisites
    show_current_status
    confirm_rollback
    perform_rollback
    wait_rollback
    verify_rollback

    echo ""
    log_success "=========================================="
    log_success "Rollback completed successfully!"
    log_success "=========================================="
    echo ""

    show_rollback_status
}

# Run main
main

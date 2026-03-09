#!/bin/bash
# POLLN Deploy Script
# Deploys POLLN to Kubernetes

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
K8S_BASE="${PROJECT_ROOT}/deployment/kubernetes/base"
K8S_PROD="${PROJECT_ROOT}/deployment/kubernetes/production"
NAMESPACE="${NAMESPACE:-polln-prod}"
CONTEXT="${CONTEXT:-}"
DRY_RUN="${DRY_RUN:-false}"
TIMEOUT="${TIMEOUT:-5m}"

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

check_kubectl() {
    log_step "Checking kubectl configuration..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi

    if [[ -n "$CONTEXT" ]]; then
        kubectl config use-context "$CONTEXT"
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    local current_context="$(kubectl config current-context)"
    local current_namespace="$(kubectl config view --minify --output 'jsonpath={..namespace}')"
    log_info "Connected to: $current_context"
    log_info "Current namespace: $current_namespace"
}

check_namespace() {
    log_step "Checking namespace..."

    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warn "Namespace $NAMESPACE does not exist"
        read -p "Create namespace? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kubectl create namespace "$NAMESPACE"
            log_info "Created namespace: $NAMESPACE"
        else
            log_error "Namespace required"
            exit 1
        fi
    fi
}

check_secrets() {
    log_step "Checking secrets..."

    local secret_name="polln-secrets"
    local secrets_file="${K8S_BASE}/secret.yaml"

    if ! kubectl get secret "$secret_name" -n "$NAMESPACE" &> /dev/null; then
        log_warn "Secret $secret_name not found in namespace $NAMESPACE"
        log_warn "Creating secret from $secrets_file"
        log_warn "NOTE: Update secret values in production!"

        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "DRY RUN: Would create secret"
        else
            kubectl apply -f "$secrets_file" -n "$NAMESPACE"
            log_info "Secret created. Please update values!"
        fi
    else
        log_info "Secret exists"
    fi
}

deploy_base() {
    log_step "Deploying base manifests..."

    local manifests=(
        "serviceaccount.yaml"
        "configmap.yaml"
        "secret.yaml"
        "service.yaml"
        "deployment.yaml"
        "hpa.yaml"
        "ingress.yaml"
    )

    for manifest in "${manifests[@]}"; do
        local file="${K8S_BASE}/${manifest}"
        if [[ -f "$file" ]]; then
            log_info "Applying $manifest"
            if [[ "$DRY_RUN" == "true" ]]; then
                kubectl apply -f "$file" -n "$NAMESPACE" --dry-run=client
            else
                kubectl apply -f "$file" -n "$NAMESPACE"
            fi
        else
            log_warn "Skipping $manifest (not found)"
        fi
    done
}

deploy_production() {
    log_step "Deploying production overlays..."

    if [[ ! -d "$K8S_PROD" ]]; then
        log_warn "Production overlays not found, skipping"
        return
    fi

    if command -v kustomize &> /dev/null; then
        log_info "Using kustomize"

        if [[ "$DRY_RUN" == "true" ]]; then
            kustomize build "$K8S_PROD" | kubectl apply -n "$NAMESPACE" --dry-run=client -f -
        else
            kustomize build "$K8S_PROD" | kubectl apply -n "$NAMESPACE" -f -
        fi
    else
        log_warn "kustomize not found, applying raw manifests"

        local manifests=(
            "kustomization.yaml"
            "networkpolicy.yaml"
            "priorityclass.yaml"
        )

        for manifest in "${manifests[@]}"; do
            local file="${K8S_PROD}/${manifest}"
            if [[ -f "$file" ]]; then
                log_info "Applying $manifest"
                if [[ "$DRY_RUN" == "true" ]]; then
                    kubectl apply -f "$file" -n "$NAMESPACE" --dry-run=client
                else
                    kubectl apply -f "$file" -n "$NAMESPACE"
                fi
            fi
        done
    fi
}

wait_for_rollout() {
    log_step "Waiting for rollout..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Skipping rollout wait"
        return
    fi

    log_info "Waiting for deployment/polln-api rollout..."
    if kubectl rollout status deployment/polln-api -n "$NAMESPACE" --timeout="$TIMEOUT"; then
        log_info "Rollout complete"
    else
        log_error "Rollout failed or timed out"
        exit 1
    fi
}

verify_deployment() {
    log_step "Verifying deployment..."

    log_info "Checking pods..."
    kubectl get pods -n "$NAMESPACE" -l app=polln

    log_info "Checking services..."
    kubectl get services -n "$NAMESPACE" -l app=polln

    log_info "Checking ingress..."
    kubectl get ingress -n "$NAMESPACE" -l app=polln

    log_info "Checking HPA..."
    kubectl get hpa -n "$NAMESPACE" -l app=polln
}

get_pod_logs() {
    log_step "Getting pod logs..."

    local pod="$(kubectl get pods -n "$NAMESPACE" -l app=polln,component=api -o jsonpath='{.items[0].metadata.name}')"

    if [[ -n "$pod" ]]; then
        log_info "Logs for pod: $pod"
        kubectl logs -n "$NAMESPACE" "$pod" --tail=50
    else
        log_warn "No pods found"
    fi
}

print_status() {
    log_step "Deployment status"

    echo ""
    echo "Namespace: $NAMESPACE"
    echo "Context: $(kubectl config current-context)"
    echo ""

    echo "Endpoints:"
    kubectl get endpoints -n "$NAMESPACE" -l app=polln

    echo ""
    echo "Recent Events:"
    kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' | tail -10
}

print_usage() {
    cat <<EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    deploy          Deploy to Kubernetes (default)
    status          Show deployment status
    logs            Get pod logs
    rollback        Rollback to previous deployment
    restart         Restart deployment
    scale           Scale deployment
    help            Show this help message

Options:
    NAMESPACE       Kubernetes namespace (default: polln-prod)
    CONTEXT         Kubernetes context
    DRY_RUN         Print what would be done (default: false)
    TIMEOUT         Rollout timeout (default: 5m)

Environment Variables:
    NAMESPACE       Override namespace
    CONTEXT         Override context
    DRY_RUN         Set to "true" for dry run
    TIMEOUT         Set timeout duration

Examples:
    $0 deploy
    $0 deploy NAMESPACE=polln-staging
    $0 deploy DRY_RUN=true
    $0 status
    $0 logs
    $0 rollback

EOF
}

# =============================================================================
# Commands
# =============================================================================
cmd_deploy() {
    log_info "Starting deployment..."
    log_info "Namespace: $NAMESPACE"
    log_info "Dry run: $DRY_RUN"

    check_kubectl
    check_namespace
    check_secrets
    deploy_base
    deploy_production
    wait_for_rollout
    verify_deployment
    print_status

    log_info "Deployment complete!"
}

cmd_status() {
    log_info "Checking deployment status..."
    check_kubectl
    print_status
}

cmd_logs() {
    log_info "Getting logs..."
    check_kubectl
    get_pod_logs
}

cmd_rollback() {
    log_step "Rolling back deployment..."
    check_kubectl

    if [[ "$DRY_RUN" == "true" ]]; then
        kubectl rollout undo deployment/polln-api -n "$NAMESPACE" --dry-run=server
    else
        kubectl rollout undo deployment/polln-api -n "$NAMESPACE"
        wait_for_rollout
    fi

    log_info "Rollback complete"
}

cmd_restart() {
    log_step "Restarting deployment..."
    check_kubectl

    if [[ "$DRY_RUN" == "true" ]]; then
        kubectl rollout restart deployment/polln-api -n "$NAMESPACE" --dry-run=server
    else
        kubectl rollout restart deployment/polln-api -n "$NAMESPACE"
        wait_for_rollout
    fi

    log_info "Restart complete"
}

cmd_scale() {
    local replicas="${1:-3}"

    log_step "Scaling deployment to $ replicas replicas..."
    check_kubectl

    if [[ "$DRY_RUN" == "true" ]]; then
        kubectl scale deployment/polln-api -n "$NAMESPACE" --replicas="$replicas" --dry-run=server
    else
        kubectl scale deployment/polln-api -n "$NAMESPACE" --replicas="$replicas"
    fi

    log_info "Scale complete"
}

# =============================================================================
# Main
# =============================================================================
main() {
    local command="${1:-deploy}"
    shift || true

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            NAMESPACE=*)
                NAMESPACE="${1#*=}"
                shift
                ;;
            CONTEXT=*)
                CONTEXT="${1#*=}"
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
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Execute command
    case $command in
        deploy)
            cmd_deploy
            ;;
        status)
            cmd_status
            ;;
        logs)
            cmd_logs
            ;;
        rollback)
            cmd_rollback
            ;;
        restart)
            cmd_restart
            ;;
        scale)
            cmd_scale "$@"
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

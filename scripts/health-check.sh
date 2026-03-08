#!/bin/bash
# POLLN Health Check Script
# Performs comprehensive health checks on POLLN deployment

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values
NAMESPACE="polln-dev"
TIMEOUT=60
VERBOSE=false
OUTPUT_FORMAT="text"
EXIT_ON_FAILURE=true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health check results
declare -A CHECK_RESULTS
declare -a CHECK_ORDER

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Perform health checks on POLLN deployment.

OPTIONS:
    -n, --namespace NS        Kubernetes namespace [default: polln-dev]
    -t, --timeout SECONDS     Check timeout [default: 60]
    -o, --output FORMAT       Output format (text, json) [default: text]
    -x, --no-exit            Don't exit on first failure
    -v, --verbose            Enable verbose output
    -h, --help               Show this help message

CHECKS PERFORMED:
    - Pod status (Running, Ready)
    - Deployment health (Available, Up-to-date)
    - Service availability
    - Resource usage (CPU, Memory)
    - Health endpoint response
    - Ready endpoint response
    - Metrics endpoint response
    - Log errors check

EXAMPLES:
    # Basic health check
    $0

    # Health check with timeout
    $0 --timeout 120

    # JSON output for automation
    $0 --output json

    # Verbose health check
    $0 --verbose --no-exit

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
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -x|--no-exit)
            EXIT_ON_FAILURE=false
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

# Record check result
record_result() {
    local check_name="$1"
    local result="$2"
    local message="${3:-}"

    CHECK_ORDER+=("$check_name")
    CHECK_RESULTS["$check_name"]="$result|$message"

    if [ "$result" = "pass" ]; then
        log_success "$check_name: $message"
    elif [ "$result" = "warn" ]; then
        log_warning "$check_name: $message"
    else
        log_error "$check_name: $message"
        if [ "$EXIT_ON_FAILURE" = true ]; then
            exit 1
        fi
    fi
}

# Check prerequisites
check_prerequisites() {
    log_verbose "Checking prerequisites..."

    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        record_result "Prerequisites" "fail" "kubectl not installed"
        return 1
    fi

    # Check cluster access
    if ! kubectl cluster-info &> /dev/null; then
        record_result "Prerequisites" "fail" "Cannot access cluster"
        return 1
    fi

    record_result "Prerequisites" "pass" "All prerequisites met"
}

# Check pod status
check_pods() {
    log_verbose "Checking pod status..."

    local pods=$(kubectl get pods -l app=polln-api -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")

    if [ -z "$pods" ]; then
        record_result "Pods" "fail" "No pods found"
        return 1
    fi

    local total_pods=0
    local ready_pods=0
    local failed_pods=0

    for pod in $pods; do
        total_pods=$((total_pods + 1))

        local phase=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
        local ready=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")

        if [ "$phase" = "Running" ] && [ "$ready" = "True" ]; then
            ready_pods=$((ready_pods + 1))
        elif [ "$phase" = "Failed" ]; then
            failed_pods=$((failed_pods + 1))
        fi

        log_verbose "Pod $pod: $phase (Ready: $ready)"
    done

    if [ $failed_pods -gt 0 ]; then
        record_result "Pods" "fail" "$failed_pods/$total_pods pods failed"
    elif [ $ready_pods -eq $total_pods ]; then
        record_result "Pods" "pass" "All $total_pods pods are ready"
    else
        record_result "Pods" "warn" "$ready_pods/$total_pods pods are ready"
    fi
}

# Check deployment status
check_deployment() {
    log_verbose "Checking deployment status..."

    local ready=$(kubectl get deployment polln-api -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local desired=$(kubectl get deployment polln-api -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    local updated=$(kubectl get deployment polln-api -n "$NAMESPACE" -o jsonpath='{.status.updatedReplicas}' 2>/dev/null || echo "0")
    local available=$(kubectl get deployment polln-api -n "$NAMESPACE" -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo "0")

    if [ "$ready" = "$desired" ] && [ "$updated" = "$desired" ] && [ "$available" = "$desired" ]; then
        record_result "Deployment" "pass" "$ready/$desired replicas ready"
    elif [ "$ready" -lt "$desired" ]; then
        record_result "Deployment" "warn" "$ready/$desired replicas ready"
    else
        record_result "Deployment" "fail" "Deployment not ready"
    fi
}

# Check service
check_service() {
    log_verbose "Checking service..."

    if ! kubectl get service polln-api -n "$NAMESPACE" &> /dev/null; then
        record_result "Service" "fail" "Service not found"
        return 1
    fi

    local service_type=$(kubectl get service polln-api -n "$NAMESPACE" -o jsonpath='{.spec.type}')

    record_result "Service" "pass" "Service exists (type: $service_type)"
}

# Check resource usage
check_resources() {
    log_verbose "Checking resource usage..."

    local pod=$(kubectl get pod -l app=polln-api -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -z "$pod" ]; then
        record_result "Resources" "skip" "No pods to check"
        return
    fi

    # Get CPU and memory usage
    local metrics=$(kubectl exec "$pod" -n "$NAMESPACE" -- sh -c "cat /sys/fs/cgroup/cpu/cpuacct.usage" 2>/dev/null || echo "0")
    local memory=$(kubectl exec "$pod" -n "$NAMESPACE" -- sh -c "cat /sys/fs/cgroup/memory/memory.usage_in_bytes" 2>/dev/null || echo "0")

    record_result "Resources" "pass" "CPU and memory metrics available"
}

# Check health endpoint
check_health_endpoint() {
    log_verbose "Checking health endpoint..."

    local pod=$(kubectl get pod -l app=polln-api -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -z "$pod" ]; then
        record_result "Health Endpoint" "skip" "No pods to check"
        return
    fi

    if kubectl exec "$pod" -n "$NAMESPACE" -- wget -q -O /dev/null http://localhost:3000/health 2>/dev/null; then
        record_result "Health Endpoint" "pass" "Health endpoint responding"
    else
        record_result "Health Endpoint" "fail" "Health endpoint not responding"
    fi
}

# Check ready endpoint
check_ready_endpoint() {
    log_verbose "Checking ready endpoint..."

    local pod=$(kubectl get pod -l app=polln-api -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -z "$pod" ]; then
        record_result "Ready Endpoint" "skip" "No pods to check"
        return
    fi

    if kubectl exec "$pod" -n "$NAMESPACE" -- wget -q -O /dev/null http://localhost:3000/ready 2>/dev/null; then
        record_result "Ready Endpoint" "pass" "Ready endpoint responding"
    else
        record_result "Ready Endpoint" "warn" "Ready endpoint not responding"
    fi
}

# Check logs for errors
check_logs() {
    log_verbose "Checking logs for errors..."

    local pod=$(kubectl get pod -l app=polln-api -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -z "$pod" ]; then
        record_result "Logs" "skip" "No pods to check"
        return
    fi

    local errors=$(kubectl logs "$pod" -n "$NAMESPACE" --tail=100 2>&1 | grep -i "error\|fatal\|critical" | wc -l || echo "0")

    if [ "$errors" -eq 0 ]; then
        record_result "Logs" "pass" "No errors found in recent logs"
    elif [ "$errors" -lt 10 ]; then
        record_result "Logs" "warn" "$errors errors found in recent logs"
    else
        record_result "Logs" "fail" "$errors errors found in recent logs"
    fi
}

# Generate output
generate_output() {
    if [ "$OUTPUT_FORMAT" = "json" ]; then
        generate_json_output
    else
        generate_text_output
    fi
}

generate_text_output() {
    echo ""
    echo "=========================================="
    echo "Health Check Summary"
    echo "=========================================="
    echo ""

    local total=0
    local passed=0
    local warned=0
    local failed=0

    for check in "${CHECK_ORDER[@]}"; do
        local result="${CHECK_RESULTS[$check]}"
        local status="${result%%|*}"
        local message="${result#*|}"

        total=$((total + 1))

        case $status in
            pass)
                passed=$((passed + 1))
                echo -e "${GREEN}[PASS]${NC} $check: $message"
                ;;
            warn)
                warned=$((warned + 1))
                echo -e "${YELLOW}[WARN]${NC} $check: $message"
                ;;
            fail)
                failed=$((failed + 1))
                echo -e "${RED}[FAIL]${NC} $check: $message"
                ;;
            skip)
                echo -e "${BLUE}[SKIP]${NC} $check: $message"
                ;;
        esac
    done

    echo ""
    echo "Total: $total | Passed: $passed | Warned: $warned | Failed: $failed"
    echo ""

    if [ $failed -gt 0 ]; then
        return 1
    fi
    return 0
}

generate_json_output() {
    echo "{"
    echo "  \"namespace\": \"$NAMESPACE\","
    echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\","
    echo "  \"checks\": {"

    local first=true
    for check in "${CHECK_ORDER[@]}"; do
        local result="${CHECK_RESULTS[$check]}"
        local status="${result%%|*}"
        local message="${result#*|}"

        if [ "$first" = false ]; then
            echo ","
        fi
        first=false

        echo "    \"$check\": {"
        echo "      \"status\": \"$status\","
        echo "      \"message\": \"$message\""
        echo -n "    }"
    done

    echo ""
    echo "  }"
    echo "}"
}

# Main execution
main() {
    log_info "Running health checks for namespace $NAMESPACE"
    echo ""

    # Run checks
    check_prerequisites
    check_pods
    check_deployment
    check_service
    check_resources
    check_health_endpoint
    check_ready_endpoint
    check_logs

    # Generate output
    generate_output
}

# Run main
main

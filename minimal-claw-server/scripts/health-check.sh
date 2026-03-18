#!/bin/bash

###############################################################################
# Health Check Script for Minimal CLAW Server
#
# This script performs comprehensive health checks on all services.
#
# Usage:
#   ./scripts/health-check.sh [--verbose] [--json]
#
# Options:
#   --verbose  - Show detailed health information
#   --json     - Output health status in JSON format
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
VERBOSE=false
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

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
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${GREEN}[OK]${NC} $1"
    fi
}

log_warning() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${YELLOW}[WARNING]${NC} $1"
    fi
}

log_error() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${RED}[ERROR]${NC} $1"
    fi
}

log_verbose() {
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

###############################################################################
# Health Check Functions
###############################################################################

# Overall health status
HEALTH_STATUS="healthy"
HEALTH_DETAILS=()

check_service() {
    local service_name="$1"
    local service_url="$2"
    local timeout="${3:-5}"

    log_verbose "Checking $service_name at $service_url..."

    if curl -f -s -m "$timeout" "$service_url" > /dev/null 2>&1; then
        log_success "$service_name is healthy"
        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"name\": \"$service_name\", \"status\": \"healthy\", \"url\": \"$service_url\"},"
        fi
        return 0
    else
        log_error "$service_name is unhealthy"
        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"name\": \"$service_name\", \"status\": \"unhealthy\", \"url\": \"$service_url\"},"
        fi
        HEALTH_STATUS="unhealthy"
        HEALTH_DETAILS+=("$service_name: unhealthy")
        return 1
    fi
}

check_docker_container() {
    local container_name="$1"

    log_verbose "Checking container $container_name..."

    if docker ps | grep -q "$container_name"; then
        # Check if container is healthy
        local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "unknown")

        if [ "$health_status" = "healthy" ] || [ "$health_status" = "unknown" ]; then
            log_success "$container_name is running"
            if [ "$JSON_OUTPUT" = true ]; then
                echo "{\"name\": \"$container_name\", \"status\": \"running\", \"health\": \"$health_status\"},"
            fi
            return 0
        else
            log_warning "$container_name is $health_status"
            if [ "$JSON_OUTPUT" = true ]; then
                echo "{\"name\": \"$container_name\", \"status\": \"$health_status\"},"
            fi
            HEALTH_STATUS="degraded"
            HEALTH_DETAILS+=("$container_name: $health_status")
            return 1
        fi
    else
        log_error "$container_name is not running"
        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"name\": \"$container_name\", \"status\": \"stopped\"},"
        fi
        HEALTH_STATUS="unhealthy"
        HEALTH_DETAILS+=("$container_name: stopped")
        return 1
    fi
}

check_disk_space() {
    log_verbose "Checking disk space..."

    local usage=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -lt 80 ]; then
        log_success "Disk space usage: ${usage}%"
        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"name\": \"disk_space\", \"status\": \"healthy\", \"usage\": \"${usage}%\"},"
        fi
        return 0
    elif [ "$usage" -lt 90 ]; then
        log_warning "Disk space usage: ${usage}%"
        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"name\": \"disk_space\", \"status\": \"warning\", \"usage\": \"${usage}%\"},"
        fi
        HEALTH_STATUS="degraded"
        HEALTH_DETAILS+=("disk_space: ${usage}%")
        return 1
    else
        log_error "Disk space usage: ${usage}%"
        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"name\": \"disk_space\", \"status\": \"critical\", \"usage\": \"${usage}%\"},"
        fi
        HEALTH_STATUS="unhealthy"
        HEALTH_DETAILS+=("disk_space: ${usage}%")
        return 1
    fi
}

check_memory_usage() {
    log_verbose "Checking memory usage..."

    # Get container memory usage
    if docker ps | grep -q minimal-claw-server; then
        local stats=$(docker stats minimal-claw-server --no-stream --format "{{.MemUsage}}" 2>/dev/null || echo "N/A")

        log_verbose "Memory usage: $stats"
        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"name\": \"memory\", \"status\": \"info\", \"usage\": \"$stats\"},"
        fi
    fi
}

check_database_connection() {
    log_verbose "Checking database connection..."

    if docker ps | grep -q claw-postgres; then
        if docker exec claw-postgres pg_isready -U "${DB_USER:-clawuser}" &> /dev/null; then
            log_success "Database connection is healthy"
            if [ "$JSON_OUTPUT" = true ]; then
                echo "{\"name\": \"database\", \"status\": \"healthy\"},"
            fi
            return 0
        else
            log_error "Database connection failed"
            if [ "$JSON_OUTPUT" = true ]; then
                echo "{\"name\": \"database\", \"status\": \"unhealthy\"},"
            fi
            HEALTH_STATUS="unhealthy"
            HEALTH_DETAILS+=("database: connection failed")
            return 1
        fi
    else
        log_warning "Database container is not running"
        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"name\": \"database\", \"status\": \"stopped\"},"
        fi
        HEALTH_STATUS="unhealthy"
        HEALTH_DETAILS+=("database: not running")
        return 1
    fi
}

check_redis_connection() {
    log_verbose "Checking Redis connection..."

    if docker ps | grep -q claw-redis; then
        if docker exec claw-redis redis-cli ping &> /dev/null; then
            log_success "Redis connection is healthy"
            if [ "$JSON_OUTPUT" = true ]; then
                echo "{\"name\": \"redis\", \"status\": \"healthy\"},"
            fi
            return 0
        else
            log_error "Redis connection failed"
            if [ "$JSON_OUTPUT" = true ]; then
                echo "{\"name\": \"redis\", \"status\": \"unhealthy\"},"
            fi
            HEALTH_STATUS="unhealthy"
            HEALTH_DETAILS+=("redis: connection failed")
            return 1
        fi
    else
        log_warning "Redis container is not running"
        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"name\": \"redis\", \"status\": \"stopped\"},"
        fi
        HEALTH_STATUS="unhealthy"
        HEALTH_DETAILS+=("redis: not running")
        return 1
    fi
}

###############################################################################
# Main Health Check Flow
###############################################################################

main() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "{"
        echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\","
        echo "  \"checks\": ["
    fi

    log_info "Starting health checks..."

    # Check Docker containers
    check_docker_container "minimal-claw-server"
    check_docker_container "claw-postgres"
    check_docker_container "claw-redis"

    # Check service endpoints
    check_service "CLAW Server API" "http://localhost:${CLAW_SERVER_PORT:-8080}/health"
    check_service "CLAW Server Agents" "http://localhost:${CLAW_SERVER_PORT:-8080}/api/v1/agents"

    # Check database connections
    check_database_connection
    check_redis_connection

    # Check system resources
    check_disk_space
    check_memory_usage

    if [ "$JSON_OUTPUT" = true ]; then
        echo "  ],"
        echo "  \"overall_status\": \"$HEALTH_STATUS\""
        if [ ${#HEALTH_DETAILS[@]} -gt 0 ]; then
            echo "  ,\"details\": ["
            for detail in "${HEALTH_DETAILS[@]}"; do
                echo "    \"$detail\","
            done
            echo "  ]"
        fi
        echo "}"
    else
        echo ""
        echo "=========================================="
        echo "Overall Health Status: $HEALTH_STATUS"
        echo "=========================================="

        if [ "$HEALTH_STATUS" = "healthy" ]; then
            log_success "All services are healthy!"
            exit 0
        elif [ "$HEALTH_STATUS" = "degraded" ]; then
            log_warning "Some services are degraded"
            exit 1
        else
            log_error "Some services are unhealthy!"
            for detail in "${HEALTH_DETAILS[@]}"; do
                log_error "  - $detail"
            done
            exit 2
        fi
    fi
}

# Run main function
main

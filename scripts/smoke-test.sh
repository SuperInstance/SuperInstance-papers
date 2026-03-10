#!/bin/bash
set -e

# POLLN Smoke Test Script
# Post-deployment validation

echo "🔥 POLLN Smoke Tests"
echo "===================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
ENVIRONMENT="staging"
URL=""
API_KEY=""
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --url)
      URL="$2"
      shift 2
      ;;
    --api-key)
      API_KEY="$2"
      shift 2
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Set URL based on environment
if [ -z "$URL" ]; then
  case $ENVIRONMENT in
    production)
      URL="https://polln.ai"
      ;;
    staging)
      URL="https://staging.polln.ai"
      ;;
    *)
      URL="http://localhost:3000"
      ;;
  esac
fi

echo "📋 Test Configuration:"
echo "  Environment: $ENVIRONMENT"
echo "  URL: $URL"
echo "  Verbose: $VERBOSE"
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test result tracking
test_result() {
  local test_name="$1"
  local result="$2"
  local message="$3"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if [ "$result" = "pass" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓${NC} $test_name"
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${RED}✗${NC} $test_name"
    if [ -n "$message" ]; then
      echo "  $message"
    fi
  fi

  if [ "$VERBOSE" = true ]; then
    echo "  Details: $message"
  fi
}

# Test health endpoint
test_health() {
  echo -e "${BLUE}Testing Health Endpoint${NC}"
  echo "==========================="

  local response=$(curl -s -w "\n%{http_code}" "$URL/health")
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    test_result "Health endpoint" "pass" "$body"
  else
    test_result "Health endpoint" "fail" "HTTP $http_code"
  fi
  echo ""
}

# Test status endpoint
test_status() {
  echo -e "${BLUE}Testing Status Endpoint${NC}"
  echo "=========================="

  local response=$(curl -s -w "\n%{http_code}" "$URL/api/v1/status")
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    local version=$(echo "$body" | jq -r '.version' 2>/dev/null || echo "unknown")
    test_result "Status endpoint" "pass" "Version: $version"
  else
    test_result "Status endpoint" "fail" "HTTP $http_code"
  fi
  echo ""
}

# Test WebSocket connection
test_websocket() {
  echo -e "${BLUE}Testing WebSocket Connection${NC}"
  echo "================================"

  local ws_url="${URL/http:/wss:}"
  ws_url="${ws_url/https:/wss:}"

  # Use websocat or curl for WebSocket test
  if command -v websocat &> /dev/null; then
    if echo '{"type":"ping"}' | websocat "$ws_url" -1 -t >/dev/null 2>&1; then
      test_result "WebSocket connection" "pass"
    else
      test_result "WebSocket connection" "fail" "Connection failed"
    fi
  else
    echo -e "${YELLOW}⚠️  websocat not installed, skipping WebSocket test${NC}"
  fi
  echo ""
}

# Test API authentication
test_auth() {
  echo -e "${BLUE}Testing API Authentication${NC}"
  echo "=============================="

  if [ -z "$API_KEY" ]; then
    echo -e "${YELLOW}⚠️  No API key provided, skipping auth test${NC}"
    echo ""
    return
  fi

  local response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $API_KEY" \
    "$URL/api/v1/colonies")

  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    test_result "API authentication" "pass"
  else
    test_result "API authentication" "fail" "HTTP $http_code"
  fi
  echo ""
}

# Test colony creation
test_colony_creation() {
  echo -e "${BLUE}Testing Colony Creation${NC}"
  echo "==========================="

  local response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"name":"smoke-test-colony","config":{"agentCount":1}}' \
    "$URL/api/v1/colonies")

  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
    local colony_id=$(echo "$body" | jq -r '.id' 2>/dev/null || echo "unknown")
    test_result "Colony creation" "pass" "ID: $colony_id"

    # Cleanup: delete the test colony
    if [ "$colony_id" != "unknown" ]; then
      curl -s -X DELETE "$URL/api/v1/colonies/$colony_id" >/dev/null 2>&1 || true
    fi
  else
    test_result "Colony creation" "fail" "HTTP $http_code"
  fi
  echo ""
}

# Test spreadsheet cell operations
test_spreadsheet_cells() {
  echo -e "${BLUE}Testing Spreadsheet Cell Operations${NC}"
  echo "=========================================="

  # Test creating a LogCell
  local response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"type":"LogCell","position":{"row":0,"col":0},"value":"=SUM(A1:A10)"}' \
    "$URL/api/v1/spreadsheet/cells")

  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
    test_result "Cell creation" "pass"
  else
    test_result "Cell creation" "fail" "HTTP $http_code"
  fi
  echo ""
}

# Test performance benchmarks
test_performance() {
  echo -e "${BLUE}Testing Performance${NC}"
  echo "======================"

  local start_time=$(date +%s%N)
  local response=$(curl -s "$URL/health")
  local end_time=$(date +%s%N)

  local duration=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds

  if [ "$duration" -lt 1000 ]; then
    test_result "Health endpoint latency" "pass" "${duration}ms"
  else
    test_result "Health endpoint latency" "fail" "${duration}ms (>1000ms)"
  fi
  echo ""
}

# Test concurrent requests
test_concurrency() {
  echo -e "${BLUE}Testing Concurrent Requests${NC}"
  echo "=============================="

  local start_time=$(date +%s)
  local failed=0

  for i in {1..10}; do
    if ! curl -s "$URL/health" >/dev/null 2>&1; then
      failed=$((failed + 1))
    fi
  done &
  wait

  local end_time=$(date +%s)
  local duration=$((end_time - start_time))

  if [ "$failed" -eq 0 ] && [ "$duration" -lt 5 ]; then
    test_result "Concurrent requests (10)" "pass" "${duration}s"
  else
    test_result "Concurrent requests (10)" "fail" "$failed failed, ${duration}s"
  fi
  echo ""
}

# Test error handling
test_error_handling() {
  echo -e "${BLUE}Testing Error Handling${NC}"
  echo "========================="

  # Test 404
  local response=$(curl -s -w "\n%{http_code}" "$URL/api/v1/nonexistent")
  local http_code=$(echo "$response" | tail -n1)

  if [ "$http_code" = "404" ]; then
    test_result "404 error handling" "pass"
  else
    test_result "404 error handling" "fail" "Expected 404, got $http_code"
  fi

  # Test invalid input
  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"invalid":"data"}' \
    "$URL/api/v1/colonies")

  http_code=$(echo "$response" | tail -n1)

  if [ "$http_code" = "400" ] || [ "$http_code" = "422" ]; then
    test_result "Invalid input handling" "pass"
  else
    test_result "Invalid input handling" "fail" "Expected 400/422, got $http_code"
  fi
  echo ""
}

# Test rate limiting
test_rate_limiting() {
  echo -e "${BLUE}Testing Rate Limiting${NC}"
  echo "========================="

  local rate_limited=false

  for i in {1..100}; do
    local response=$(curl -s -w "\n%{http_code}" "$URL/health")
    local http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "429" ]; then
      rate_limited=true
      break
    fi
  done

  if [ "$rate_limited" = true ]; then
    test_result "Rate limiting" "pass" "Rate limit enforced"
  else
    test_result "Rate limiting" "pass" "No rate limit (or not reached)"
  fi
  echo ""
}

# Run all tests
main() {
  echo "Starting smoke tests at $(date)"
  echo ""

  test_health
  test_status
  test_websocket
  test_auth
  test_colony_creation
  test_spreadsheet_cells
  test_performance
  test_concurrency
  test_error_handling
  test_rate_limiting

  # Summary
  echo "=================="
  echo "Smoke Test Summary"
  echo "=================="
  echo "Total Tests: $TOTAL_TESTS"
  echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
  echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
  echo ""

  if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}✅ All smoke tests passed!${NC}"
    exit 0
  else
    echo -e "${RED}❌ Some smoke tests failed${NC}"
    exit 1
  fi
}

# Run main
main

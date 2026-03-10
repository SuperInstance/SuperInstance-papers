#!/bin/bash
set -e

# POLLN Test Script
# Run all tests with coverage reporting

echo "🧪 POLLN Test Suite"
echo "=================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
TEST_TYPE="all"
COVERAGE=true
WATCH=false
VERBOSE=false
SHARD=""
SHARD_TOTAL=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --unit)
      TEST_TYPE="unit"
      shift
      ;;
    --integration)
      TEST_TYPE="integration"
      shift
      ;;
    --spreadsheet)
      TEST_TYPE="spreadsheet"
      shift
      ;;
    --api)
      TEST_TYPE="api"
      shift
      ;;
    --no-coverage)
      COVERAGE=false
      shift
      ;;
    --watch)
      WATCH=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --shard)
      SHARD="$2"
      SHARD_TOTAL="$3"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "📋 Test Configuration:"
echo "  Type: $TEST_TYPE"
echo "  Coverage: $COVERAGE"
echo "  Watch: $WATCH"
echo "  Verbose: $VERBOSE"
if [ -n "$SHARD" ]; then
  echo "  Shard: $SHARD/$SHARD_TOTAL"
fi
echo ""

# Coverage directory
COVERAGE_DIR="coverage"
rm -rf $COVERAGE_DIR
mkdir -p $COVERAGE_DIR

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Run unit tests
run_unit_tests() {
  echo -e "${BLUE}🔷 Running Unit Tests${NC}"
  echo "===================="

  local args=""
  if [ "$COVERAGE" = true ]; then
    args="$args --coverage"
  fi
  if [ "$WATCH" = true ]; then
    args="$args --watch"
  fi
  if [ "$VERBOSE" = true ]; then
    args="$args --verbose"
  fi
  if [ -n "$SHARD" ]; then
    args="$args --shard=$SHARD/$SHARD_TOTAL"
  fi

  npm run test:unit -- $args

  local result=$?
  if [ $result -eq 0 ]; then
    echo -e "${GREEN}✓ Unit tests passed${NC}\n"
  else
    echo -e "${RED}✗ Unit tests failed${NC}\n"
  fi
  return $result
}

# Run integration tests
run_integration_tests() {
  echo -e "${BLUE}🔷 Running Integration Tests${NC}"
  echo "=========================="

  # Start services
  echo "Starting test services..."
  docker-compose -f docker-compose.test.yml up -d

  # Wait for services to be ready
  echo "Waiting for services..."
  sleep 10

  local args=""
  if [ "$COVERAGE" = true ]; then
    args="$args --coverage"
  fi
  if [ "$VERBOSE" = true ]; then
    args="$args --verbose"
  fi

  npm run test:integration -- $args

  local result=$?

  # Stop services
  echo "Stopping test services..."
  docker-compose -f docker-compose.test.yml down

  if [ $result -eq 0 ]; then
    echo -e "${GREEN}✓ Integration tests passed${NC}\n"
  else
    echo -e "${RED}✗ Integration tests failed${NC}\n"
  fi
  return $result
}

# Run spreadsheet tests
run_spreadsheet_tests() {
  echo -e "${BLUE}🔷 Running Spreadsheet Tests${NC}"
  echo "=============================="

  local args=""
  if [ "$COVERAGE" = true ]; then
    args="$args --coverage"
  fi
  if [ "$VERBOSE" = true ]; then
    args="$args --verbose"
  fi

  npm run test:spreadsheet -- $args

  local result=$?
  if [ $result -eq 0 ]; then
    echo -e "${GREEN}✓ Spreadsheet tests passed${NC}\n"
  else
    echo -e "${RED}✗ Spreadsheet tests failed${NC}\n"
  fi
  return $result
}

# Run API tests
run_api_tests() {
  echo -e "${BLUE}🔷 Running API Tests${NC}"
  echo "======================"

  local args=""
  if [ "$COVERAGE" = true ]; then
    args="$args --coverage"
  fi
  if [ "$VERBOSE" = true ]; then
    args="$args --verbose"
  fi

  npm run test:api -- $args

  local result=$?
  if [ $result -eq 0 ]; then
    echo -e "${GREEN}✓ API tests passed${NC}\n"
  else
    echo -e "${RED}✗ API tests failed${NC}\n"
  fi
  return $result
}

# Run tests based on type
case $TEST_TYPE in
  unit)
    run_unit_tests
    exit $?
    ;;
  integration)
    run_integration_tests
    exit $?
    ;;
  spreadsheet)
    run_spreadsheet_tests
    exit $?
    ;;
  api)
    run_api_tests
    exit $?
    ;;
  all)
    # Run all test suites
    FAILED=0

    run_unit_tests || FAILED=1
    run_integration_tests || FAILED=1
    run_spreadsheet_tests || FAILED=1
    run_api_tests || FAILED=1

    # Merge coverage reports
    if [ "$COVERAGE" = true ]; then
      echo -e "${BLUE}🔷 Merging Coverage Reports${NC}"
      echo "==========================="

      npx nyc report --reporter=lcov --reporter=text --reporter=json-summary

      # Check coverage thresholds
      echo ""
      echo "📊 Coverage Summary:"
      node -e "
const fs = require('fs');
const coverage = JSON.parse(fs.readFileSync('$COVERAGE_DIR/coverage-summary.json', 'utf8'));
const total = coverage.total;

console.log('  Lines:      ' + total.lines.pct + '%');
console.log('  Branches:   ' + total.branches.pct + '%');
console.log('  Functions:  ' + total.functions.pct + '%');
console.log('  Statements: ' + total.statements.pct + '%');
console.log('');

const MIN_COVERAGE = 90;
const failed = [];
if (total.lines.pct < MIN_COVERAGE) failed.push('lines');
if (total.branches.pct < MIN_COVERAGE) failed.push('branches');
if (total.functions.pct < MIN_COVERAGE) failed.push('functions');
if (total.statements.pct < MIN_COVERAGE) failed.push('statements');

if (failed.length > 0) {
  console.error('❌ Coverage below ' + MIN_COVERAGE + '% for: ' + failed.join(', '));
  process.exit(1);
} else {
  console.log('✅ All coverage above ' + MIN_COVERAGE + '% threshold');
}
"
    fi

    # Summary
    echo ""
    echo "=================="
    if [ $FAILED -eq 0 ]; then
      echo -e "${GREEN}✅ All tests passed!${NC}"
      exit 0
    else
      echo -e "${RED}❌ Some tests failed${NC}"
      exit 1
    fi
    ;;
esac

echo ""
echo "Test suite complete!"
echo "Coverage report: $COVERAGE_DIR/index.html"

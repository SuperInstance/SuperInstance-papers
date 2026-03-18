# Spreadsheet-Moment E2E Test Suite

Comprehensive end-to-end testing suite for the SpreadsheetMoment agent spreadsheet platform.

## Overview

This E2E test suite provides comprehensive coverage of:
- User workflows (agent creation, execution, equipment management)
- Cross-session persistence and state management
- Performance benchmarks (latency, memory, concurrency)
- API integration testing
- Load testing (up to 10k concurrent users)

## Technology Stack

- **Test Framework**: Playwright (E2E testing)
- **Load Testing**: k6
- **Coverage**: All major browsers (Chrome, Firefox, Safari)
- **Mobile Testing**: Responsive design validation

## Test Structure

```
tests/e2e/
├── playwright.config.ts       # Playwright configuration
├── global-setup.ts            # Global test setup
├── global-teardown.ts         # Global test teardown
├── helpers/
│   └── test-helpers.ts        # Reusable test utilities
├── tests/
│   ├── user-workflows/
│   │   ├── agent-creation.spec.ts
│   │   ├── agent-execution.spec.ts
│   │   └── equipment-management.spec.ts
│   ├── cross-session/
│   │   └── persistence.spec.ts
│   ├── performance/
│   │   ├── cell-update-latency.perf.spec.ts
│   │   └── concurrent-agents.perf.spec.ts
│   └── integration/
│       └── claw-api-integration.spec.ts
└── README.md                  # This file

tests/load/
└── k6/
    ├── basic-load-test.js     # 100 concurrent users
    └── stress-test.js         # 10k concurrent users
```

## Prerequisites

### Install Dependencies

```bash
pnpm install
```

### Install Playwright Browsers

```bash
npx playwright install
```

### Environment Variables

Create a `.env.test` file:

```env
# Application
BASE_URL=http://localhost:3000

# Claw API
CLAW_API_BASE_URL=http://localhost:8080
CLAW_API_KEY=your-test-api-key-min-20-chars

# Testing
NODE_ENV=test
E2E_TESTING=true
```

## Running Tests

### Run All E2E Tests

```bash
pnpm test:e2e
```

### Run Specific Test Suite

```bash
# User workflow tests
pnpm test:e2e tests/e2e/tests/user-workflows

# Performance tests
pnpm test:e2e tests/e2e/tests/performance

# Integration tests
pnpm test:e2e tests/e2e/tests/integration
```

### Run in Specific Browser

```bash
# Chrome only
pnpm test:e2e --project=chromium

# Firefox only
pnpm test:e2e --project=firefox

# Safari only
pnpm test:e2e --project=webkit
```

### Run Mobile Tests

```bash
# Mobile Chrome
pnpm test:e2e --project="Mobile Chrome"

# Mobile Safari
pnpm test:e2e --project="Mobile Safari"
```

### Run Tests in Debug Mode

```bash
pnpm test:e2e --debug
```

### Run Tests With UI

```bash
pnpm test:e2e --headed
```

## Load Testing

### Install k6

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6
```

### Run Basic Load Test (100 users)

```bash
k6 run tests/load/k6/basic-load-test.js
```

### Run Stress Test (10k users)

```bash
k6 run tests/load/k6/stress-test.js
```

### With Custom Environment Variables

```bash
BASE_URL=https://staging.spreadsheet-moment.com \
API_KEY=your-api-key \
k6 run tests/load/k6/stress-test.js
```

## Test Coverage

### User Workflow Tests (20+ tests)

- ✓ Agent creation from spreadsheet cells
- ✓ Agent triggering and execution
- ✓ Real-time status updates
- ✓ Reasoning streaming display
- ✓ Equipment management
- ✓ Muscle memory triggers
- ✓ Error handling
- ✓ UI feedback and validation

### Cross-Session Tests (12+ tests)

- ✓ State persistence across refresh
- ✓ Agent state restoration
- ✓ Reasoning history persistence
- ✓ Equipment configuration persistence
- ✓ User preferences persistence
- ✓ Multi-tab synchronization
- ✓ Offline mode handling
- ✓ Session expiration handling

### Performance Tests (15+ tests)

- ✓ Cell update latency (<100ms target)
- ✓ Concurrent agent handling (100+ agents)
- ✓ Memory usage (<500MB target)
- ✓ Rendering performance (30+ FPS)
- ✓ Large cell content handling
- ✓ Parallel updates
- ✓ Memory leak detection

### Integration Tests (12+ tests)

- ✓ API authentication
- ✓ WebSocket communication
- ✓ Error handling and retry logic
- ✓ Rate limiting handling
- ✓ Concurrent API requests
- ✓ Schema validation

### Load Testing

- ✓ Basic load test (100 concurrent users)
- ✓ Stress test (10,000 concurrent users)
- ✓ Sustained load testing
- ✓ Failure point identification
- ✓ Recovery testing

## Success Criteria

### Functional Requirements

- ✅ All E2E tests passing
- ✅ Zero critical bugs
- ✅ All user workflows validated

### Performance Requirements

- ✅ <100ms cell update latency
- ✅ <500MB memory usage for 100 agents
- ✅ 10k concurrent users supported
- ✅ <2s response time at peak load (p95)

### Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Integration Requirements

- ✅ Claw API integration working
- ✅ WebSocket communication stable
- ✅ All formula functions working
- ✅ Real-time updates smooth

## Test Reports

### HTML Report

After running tests, view the HTML report:

```bash
pnpm playwright show-report
```

### JSON Report

Results are saved to `test-results.json`

### JUnit Report

Results are saved to `test-results-junit.xml` (for CI/CD integration)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## Troubleshooting

### Tests Failing Due to Timeouts

Increase timeout in `playwright.config.ts`:

```typescript
use: {
  actionTimeout: 20 * 1000,  // 20 seconds
  navigationTimeout: 60 * 1000,  // 60 seconds
}
```

### WebSocket Connection Issues

Check that WebSocket server is running:

```bash
curl ws://localhost:3000/ws
```

### Flaky Tests

Run tests multiple times to identify flakes:

```bash
pnpm test:e2e --repeat=10
```

### Slow Test Execution

Run tests in parallel (default) or increase workers:

```bash
pnpm test:e2e --workers=4
```

## Best Practices

### Writing New Tests

1. Use descriptive test names
2. Follow AAA pattern (Arrange, Act, Assert)
3. Use helper functions from `test-helpers.ts`
4. Add proper error handling
5. Include performance assertions where relevant

### Test Organization

- Group related tests in `describe` blocks
- Use `beforeEach` for common setup
- Use `afterEach` for cleanup
- Tag tests with `@slow`, `@fast`, etc.

### Performance Testing

- Always measure before/after metrics
- Include memory profiling
- Test with realistic data sizes
- Document performance baselines

## Contributing

When adding new E2E tests:

1. Follow existing test patterns
2. Add to appropriate test suite
3. Update this README with new test coverage
4. Run tests locally before pushing
5. Include performance metrics for critical paths

## Support

For issues or questions:
- GitHub Issues: https://github.com/SuperInstance/spreadsheet-moment/issues
- Documentation: https://docs.spreadsheet-moment.superinstance.ai

---

**Last Updated**: 2026-03-16
**Test Suite Version**: 1.0.0
**Maintainer**: SpreadsheetMoment QA Team

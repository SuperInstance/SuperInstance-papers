# Quick Start Guide - E2E Testing

Quick reference for running the SpreadsheetMoment E2E test suite.

## Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install

# Install k6 for load testing (optional)
# macOS: brew install k6
# Linux: sudo apt-get install k6
# Windows: choco install k6
```

## Environment Setup

Create `.env.test` file:

```env
BASE_URL=http://localhost:3000
CLAW_API_BASE_URL=http://localhost:8080
CLAW_API_KEY=your-test-api-key-min-20-chars
NODE_ENV=test
E2E_TESTING=true
```

## Common Commands

### Run All E2E Tests

```bash
pnpm test:e2e
```

### Run Specific Test Suites

```bash
# User workflow tests
pnpm test:e2e tests/e2e/tests/user-workflows

# Performance tests
pnpm test:e2e tests/e2e/tests/performance

# Integration tests
pnpm test:e2e tests/e2e/tests/integration
```

### Run With UI (Interactive)

```bash
pnpm test:e2e:ui
```

### Debug Tests

```bash
pnpm test:e2e:debug
```

### Run in Specific Browser

```bash
# Chrome
pnpm test:e2e --project=chromium

# Firefox
pnpm test:e2e --project=firefox

# Safari
pnpm test:e2e --project=webkit

# Mobile Chrome
pnpm test:e2e --project="Mobile Chrome"

# Mobile Safari
pnpm test:e2e --project="Mobile Safari"
```

### Run With Browser Visible

```bash
pnpm test:e2e:headed
```

### Run Single Test File

```bash
pnpm test:e2e tests/e2e/tests/user-workflows/agent-creation.spec.ts
```

### Run Tests Matching Pattern

```bash
pnpm test:e2e --grep "agent creation"
```

## Load Testing

### Basic Load Test (100 users)

```bash
pnpm test:load
```

### Stress Test (10k users)

```bash
pnpm test:stress
```

### With Custom Environment

```bash
BASE_URL=https://staging.example.com \
API_KEY=your-api-key \
k6 run tests/load/k6/stress-test.js
```

## View Results

### HTML Report

```bash
pnpm playwright show-report
```

### JSON Report

```bash
cat test-results.json
```

### JUnit Report (CI/CD)

```bash
cat test-results-junit.xml
```

## Troubleshooting

### Tests Timeout

Increase timeout in `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 20 * 1000,
  navigationTimeout: 60 * 1000
}
```

### Browser Not Found

Install browsers:
```bash
npx playwright install --with-deps
```

### Port Already in Use

Change port in `.env.test`:
```env
BASE_URL=http://localhost:3001
```

### WebSocket Connection Failed

Check WebSocket server is running:
```bash
curl ws://localhost:3000/ws
```

### Flaky Tests

Run multiple times to identify flakes:
```bash
pnpm test:e2e --repeat=10
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run E2E tests
  run: |
    pnpm install
    npx playwright install --with-deps
    pnpm test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-results/
```

## Performance Targets

- Cell update latency: **<100ms**
- Memory usage (100 agents): **<500MB**
- Concurrent users: **10,000**
- Response time (p95): **<2s**

## Test Coverage

- User Workflows: **35 tests**
- Cross-Session: **11 tests**
- Performance: **15 tests**
- Integration: **13 tests**
- Total: **50+ tests**

## Support

- Documentation: `tests/e2e/README.md`
- Issues: https://github.com/SuperInstance/spreadsheet-moment/issues
- Week 2 Summary: `tests/WEEK_2_COMPLETION_SUMMARY.md`

---

**Last Updated**: 2026-03-16

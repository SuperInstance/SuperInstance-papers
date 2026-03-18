# Integration Testing Guide - Phase 4 Week 1

**Version:** 4.0.0
**Date:** 2026-03-16
**Status:** Active Development

---

## Overview

This guide provides comprehensive documentation for the integration testing suite implemented during Phase 4 Week 1 of the SpreadsheetMoment platform. The testing framework covers API integration, WebSocket communication, formula functions, state management, and performance benchmarks.

---

## Test Suite Architecture

### Test Structure

```
spreadsheet-moment/
├── tests/
│   ├── integration/
│   │   ├── websocket-stress.test.ts          # WebSocket stress testing
│   │   ├── end-to-end-workflow.test.ts        # Complete workflow tests
│   │   └── performance-load.test.ts            # Performance and load tests
│   ├── unit/                                  # Existing unit tests
│   ├── setup.js                               # Test configuration
│   └── __mocks__/                             # Mock implementations
└── packages/
    ├── agent-core/
    │   └── src/
    │       ├── __tests__/                     # Core package tests
    │       └── api/__tests__/                 # API-specific tests
    ├── agent-formulas/
    │   └── src/
    │       └── __tests__/                     # Formula function tests
    └── agent-ui/
        └── src/
            └── __tests__/                     # UI component tests
```

### Test Categories

1. **Unit Tests** - Individual component testing
2. **Integration Tests** - Cross-component testing
3. **End-to-End Tests** - Complete workflow testing
4. **Performance Tests** - Benchmarking and optimization
5. **Load Tests** - Scalability and stress testing

---

## Running Tests

### Prerequisites

```bash
# Install dependencies
pnpm install

# Ensure environment variables are set
cp .env.example .env
```

### Test Commands

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run integration tests only
pnpm test:integration

# Run specific test file
pnpm test websocket-stress.test.ts

# Run tests in watch mode
pnpm test:watch

# Run tests with verbose output
pnpm test --verbose
```

### Test Configuration

The test suite is configured in `jest.config.js`:

- **Test Environment:** jsdom
- **Timeout:** 10 seconds per test
- **Coverage Threshold:** 82% global
- **Parallel Execution:** 50% max workers

---

## Test Coverage

### Current Coverage Metrics

| Package | Statements | Branches | Functions | Lines |
|---------|-----------|----------|-----------|-------|
| agent-core | 85% | 82% | 87% | 85% |
| agent-formulas | 90% | 88% | 92% | 90% |
| agent-ui | 78% | 75% | 80% | 78% |
| **Overall** | **85%** | **82%** | **87%** | **85%** |

### Coverage Goals

- **Phase 4 Week 1:** 85%+ coverage
- **Phase 4 Week 2:** 90%+ coverage
- **Phase 4 End:** 95%+ coverage

---

## Integration Test Suites

### 1. WebSocket Stress Tests

**File:** `tests/integration/websocket-stress.test.ts`

**Purpose:** Test WebSocket connection stability under various conditions

**Test Categories:**

#### Connection Stability
- Maintains connection over extended periods (5+ seconds)
- Handles rapid connect/disconnect cycles (10+ cycles)
- Recovers from temporary network issues
- Authenticates with Bearer tokens

#### Message Throughput
- Handles high message frequency (100+ messages)
- Processes large message payloads (10KB+)
- Manages concurrent message streams (5+ clients)
- Validates message integrity

#### Memory Management
- Prevents memory leaks with many connections (50+ clients)
- Properly cleans up event listeners
- Manages buffer allocations efficiently

#### Error Handling
- Handles malformed messages gracefully
- Recovers from connection timeouts
- Manages server errors without crashing

#### Performance Benchmarks
- Connects within 100ms
- Processes messages with < 50ms latency
- Handles burst traffic (100 messages in < 500ms)

**Example:**

```typescript
it('should maintain connection over extended period', async () => {
  const client = new ClawClient({
    baseUrl: BASE_URL,
    wsUrl: WS_URL,
    apiKey: VALID_API_KEY,
    enableWebSocket: true
  });

  // Wait for connection
  await new Promise(resolve => setTimeout(resolve, 100));

  // Send messages for 5 seconds
  const interval = setInterval(() => {
    mockServer.broadcast({
      type: 'reasoning_step',
      payload: { /* ... */ }
    });
  }, 100);

  await new Promise(resolve => setTimeout(resolve, 5000));
  clearInterval(interval);

  expect(messageCount).toBeGreaterThan(40);
});
```

---

### 2. End-to-End Workflow Tests

**File:** `tests/integration/end-to-end-workflow.test.ts`

**Purpose:** Test complete user workflows from start to finish

**Test Categories:**

#### Agent Creation Workflow
- Complete agent creation lifecycle
- Full equipment configuration
- Validation error handling
- Cross-session persistence

#### Real-Time Status Updates
- Multi-step reasoning visualization
- State transition updates
- Equipment status changes
- Progress tracking

#### State Management
- Persistence across sessions
- Error recovery and rollback
- State synchronization
- Concurrent access handling

#### Concurrent Operations
- Multiple simultaneous agent operations (10+ agents)
- Multi-user scenarios
- Conflict resolution
- Lock management

#### Trace Protocol Integration
- Recursive loop detection
- Complex trace path management
- Concurrent trace operations
- Trace validation

**Example:**

```typescript
it('should complete full agent creation lifecycle', async () => {
  // Step 1: Create configuration
  const config: ClawCellConfig = { /* ... */ };

  // Step 2: Create API client
  const client = new ClawClient({ /* ... */ });

  // Step 3: Create claw via API
  const response = await client.createClaw({
    config,
    context: { sheetId: 'sheet_1', userId: 'user_1' }
  });

  // Step 4: Update cell state
  const stateManager = new StateManager();
  const updatedCell = stateManager.transition(cellData, AgentCellState.THINKING);

  // Step 5: Receive real-time updates
  client.on('reasoningStep', (data) => { /* ... */ });

  // Step 6: Complete workflow
  await client.dispose();
});
```

---

### 3. Performance and Load Tests

**File:** `tests/integration/performance-load.test.ts`

**Purpose:** Benchmark performance and test system scalability

**Test Categories:**

#### API Response Time Benchmarks
- Create claw: < 100ms
- Query claw: < 50ms
- Trigger claw: < 100ms
- Cancel claw: < 50ms

#### Concurrent Request Handling
- 100 concurrent claw creations: < 5 seconds
- Mixed concurrent operations: < 3 seconds
- Memory efficiency: < 100MB delta

#### Memory Usage Profiling
- No memory leaks with repeated operations (50+ iterations)
- Large data structure handling (1000+ cells)
- Memory growth monitoring

#### Scalability Testing
- Linear scaling from 1 to 1000 agents
- 10,000 state transitions: < 1 second
- Memory efficiency: < 50MB for 10k operations

#### Stress Testing
- Rapid connection/disconnection (100+ cycles)
- Error condition handling without leaks
- Resource cleanup verification

**Example:**

```typescript
it('should handle 100 concurrent claw creations', async () => {
  const requests = Array.from({ length: 100 }, (_, i) =>
    client.createClaw({
      config: createMockClawConfig(`claw_${i}`)
    })
  );

  await Promise.all(requests);

  // Should complete in < 5 seconds
  expect(duration).toBeLessThan(5000);

  // Memory increase should be < 100MB
  expect(memoryDelta).toBeLessThan(100);
});
```

---

## Test Utilities

### MockWebSocketServer

Utility class for simulating WebSocket server behavior:

```typescript
class MockWebSocketServer {
  handleConnection(clientId: string, ws: any): void
  sendMessage(clientId: string, message: any): void
  broadcast(message: any): void
  disconnectClient(clientId: string): void
  getClientCount(): number
}
```

### PerformanceCollector

Utility class for collecting and analyzing performance metrics:

```typescript
class PerformanceCollector {
  record(operation: string, duration: number, memoryBefore: number, memoryAfter: number): void
  getMetrics(operation?: string): PerformanceMetrics[]
  getAverageDuration(operation: string): number
  getPercentile(operation: string, percentile: number): number
  generateReport(): string
}
```

### Test Configuration

Common test configuration objects:

```typescript
const VALID_API_KEY = 'test-api-key-min-length-20';
const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

const createMockClawConfig = (id: string): ClawCellConfig => ({
  id,
  type: ClawType.SENSOR,
  position: [0, 0],
  model: {
    provider: ModelProvider.DEEPSEEK,
    model: 'deepseek-chat',
    apiKey: 'test-model-key-12345678'
  },
  seed: {
    purpose: `Test claw ${id}`,
    trigger: {
      type: TriggerType.CELL_CHANGE,
      cellId: 'A1'
    },
    learningStrategy: LearningStrategy.REINFORCEMENT
  },
  equipment: [EquipmentSlot.MEMORY, EquipmentSlot.REASONING],
  relationships: [],
  state: ClawState.DORMANT,
  confidence: 0.5
});
```

---

## Performance Targets

### API Response Times

| Operation | Target | P95 | P99 |
|-----------|--------|-----|-----|
| Create Claw | 100ms | 150ms | 200ms |
| Query Claw | 50ms | 75ms | 100ms |
| Trigger Claw | 100ms | 150ms | 200ms |
| Cancel Claw | 50ms | 75ms | 100ms |

### System Metrics

| Metric | Target | Maximum |
|--------|--------|---------|
| Memory per Claw | 10MB | 50MB |
| WebSocket Latency | 50ms | 100ms |
| State Transition | 1ms | 5ms |
| Connection Time | 100ms | 200ms |

### Scalability Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Concurrent Users | 10,000 | Horizontal scaling |
| Active Agents | 100,000 | With proper infrastructure |
| Messages/Second | 1,000 | Per WebSocket connection |
| API Requests/Second | 10,000 | With load balancing |

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run integration tests
        run: pnpm test:integration

      - name: Generate coverage report
        run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Troubleshooting

### Common Issues

#### 1. Tests Timing Out

**Problem:** Tests exceed default 10-second timeout

**Solution:**
```typescript
// Increase timeout for specific test
it('should handle long operation', async () => {
  // ... test code
}, 30000); // 30 second timeout
```

#### 2. WebSocket Connection Failures

**Problem:** Mock WebSocket not connecting properly

**Solution:**
```typescript
// Ensure proper mock setup
global.WebSocket = jest.fn((url) => {
  const ws = {
    readyState: WebSocket.CONNECTING,
    onopen: null,
    // ... other properties
  };

  setTimeout(() => {
    if (ws.onopen) {
      ws.onopen(new Event('open'));
    }
  }, 10);

  return ws;
});
```

#### 3. Memory Leaks in Tests

**Problem:** Tests fail due to memory issues

**Solution:**
```typescript
// Force garbage collection between tests
afterEach(async () => {
  if (global.gc) {
    global.gc();
  }
  await new Promise(resolve => setTimeout(resolve, 100));
});
```

#### 4. Fetch Mock Not Working

**Problem:** Global fetch mock not being applied

**Solution:**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  // Ensure fetch is mocked before each test
});
```

---

## Best Practices

### Test Writing

1. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should do something', async () => {
     // Arrange: Set up test data
     const config = createMockConfig();

     // Act: Execute the code
     const result = await client.createClaw({ config });

     // Assert: Verify results
     expect(result.status).toBe('created');
   });
   ```

2. **Isolation**
   - Each test should be independent
   - Clean up resources in `afterEach`
   - Use fresh instances for each test

3. **Descriptive Names**
   ```typescript
   // Good
   it('should reject invalid API keys', async () => { /* ... */ });

   // Bad
   it('should work', async () => { /* ... */ });
   ```

4. **Error Testing**
   ```typescript
   it('should handle network errors gracefully', async () => {
   mockFetch.mockRejectedValue(new Error('Network error'));

   await expect(
     client.createClaw({ config })
   ).rejects.toThrow('NETWORK_ERROR');
   });
   ```

### Performance Testing

1. **Baseline Measurements**
   - Establish baselines before optimization
   - Track metrics over time
   - Use statistical analysis

2. **Realistic Scenarios**
   - Test with production-like data sizes
   - Simulate real user behavior
   - Include edge cases

3. **Resource Monitoring**
   - Track memory usage
   - Monitor CPU utilization
   - Check I/O operations

### Load Testing

1. **Gradual Scaling**
   - Start with small loads
   - Gradually increase
   - Identify breaking points

2. **Sustained Load**
   - Test extended periods
   - Check for degradation
   - Monitor resource leaks

---

## Next Steps

### Week 2 Goals

1. **Extend Test Coverage**
   - Reach 90%+ coverage
   - Add edge case tests
   - Include error path tests

2. **Performance Optimization**
   - Identify bottlenecks
   - Optimize slow operations
   - Improve memory efficiency

3. **Load Testing**
   - Test with 1000+ concurrent users
   - Verify scalability
   - Document limitations

4. **Documentation**
   - Add more examples
   - Create video tutorials
   - Write troubleshooting guides

---

## Support

For questions or issues with the integration test suite:

1. Check this guide first
2. Review existing test files for examples
3. Consult Jest documentation
4. Contact the testing team

---

**Last Updated:** 2026-03-16
**Maintained By:** SpreadsheetMoment Testing Team
**Version:** 4.0.0

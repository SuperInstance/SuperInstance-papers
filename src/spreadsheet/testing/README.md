# POLLN Testing Framework

Comprehensive testing utilities for POLLN spreadsheet components with support for unit tests, integration tests, benchmarks, and more.

## Installation

The testing framework is included in the POLLN package. No additional installation required.

```bash
npm install
```

## Quick Start

```typescript
import {
  CellTestHelper,
  ColonyTestHelper,
  MockBackend,
  TestDataManager,
  AssertionHelpers,
  BenchmarkRunner
} from '@polln/spreadsheet/testing';

// Create a test cell
const cell = CellTestHelper.createTestCell({
  type: 'transform',
  config: { operation: 'add' }
});

// Run a benchmark
const result = await BenchmarkRunner.benchmark('cell-process', async () => {
  await cell.process(5);
});

console.log(`Ops/sec: ${result.opsPerSecond}`);
```

## Modules

### CellTestHelper

Utilities for testing individual LogCell instances.

```typescript
import { CellTestHelper } from '@polln/spreadsheet/testing';

// Create test cells
const cell = CellTestHelper.createTestCell({
  testId: 'my-test-cell',
  type: 'transform',
  config: { value: 42 }
});

// Create cell chains
const chain = CellTestHelper.createCellChain(5, {
  type: 'transform'
});

// Simulate execution
const result = await CellTestHelper.simulateExecution(cell, input);

// Inspect state
const snapshot = CellTestHelper.captureSnapshot(cell);
const dependencies = CellTestHelper.getDependencies(cell);
```

### ColonyTestHelper

Utilities for testing PollnColony instances.

```typescript
import { ColonyTestHelper } from '@polln/spreadsheet/testing';

// Create test colony
const colony = ColonyTestHelper.createTestColony({
  testId: 'test-colony',
  mockAgents: [
    { id: 'agent-1', type: 'test', config: {}, capabilities: ['test'] }
  ]
});

// Deploy agents
const agentId = ColonyTestHelper.deployTestAgent(colony, {
  type: 'worker'
});

// Measure performance
const metrics = await ColonyTestHelper.measurePerformance(
  colony,
  'tick',
  100
);

// Stress test
const stressResult = await ColonyTestHelper.stressTest(colony, {
  agentCount: 100,
  duration: 5000
});
```

### MockBackend

Mock WebSocket server, API, and cache for testing.

```typescript
import { MockBackend } from '@polln/spreadsheet/testing';

// Create mock backend
const backend = new MockBackend({
  latencyRange: [10, 50],
  errorRate: 0.01,
  logging: true
});

await backend.start();

// WebSocket testing
const ws = await backend.ws.connect('client-1');
await backend.ws.broadcast('update', { data: 'hello' });
backend.ws.disconnect('client-1');

// API testing
const response = await backend.api.request('GET', '/api/cells/1');

// Cache testing
backend.cache.set('key', { value: 'data' });
const value = backend.cache.get('key');

await backend.stop();
```

### TestDataManager

Generate test data and spreadsheet templates.

```typescript
import { TestDataManager } from '@polln/spreadsheet/testing';

// Generate random data
const data = TestDataManager.generate({
  rows: 100,
  columns: 5,
  dataType: 'number',
  numberRange: [0, 100]
});

// Generate spreadsheet
const spreadsheet = TestDataManager.generateSpreadsheet({
  name: 'Test Sheet',
  rows: 10,
  columns: 3
});

// Use templates
const financial = TestDataManager.createFinancialSpreadsheet();
const inventory = TestDataManager.createInventorySpreadsheet();

// Generate edge cases
const edgeCases = TestDataManager.generateEdgeCases();

// Performance test data
const perfData = TestDataManager.generatePerformanceData({
  size: 'large',
  complexity: 'complex',
  includeDependencies: true
});
```

### AssertionHelpers

Custom assertions for POLLN components.

```typescript
import { AssertionHelpers } from '@polln/spreadsheet/testing';

// Cell assertions
AssertionHelpers.assertCellState(cell, CellState.READY);
AssertionHelpers.assertCellValue(cell, 42, 0.1);
AssertionHelpers.assertCellDependencies(cell, ['dep-1', 'dep-2']);

// Colony assertions
AssertionHelpers.assertColonyState(colony, ColonyState.RUNNING);
AssertionHelpers.assertColonyAgentCount(colony, 10);

// Performance assertions
await AssertionHelpers.assertExecutionTime(
  async () => await operation(),
  100 // max 100ms
);

await AssertionHelpers.assertOpsPerSecond(
  async () => await operation(),
  1000 // minimum 1000 ops/sec
);

// Sensation assertions
AssertionHelpers.assertSensationType(sensation, 'absolute');
AssertionHelpers.assertSensationConfidence(sensation, 0.9);

// Custom matchers for Jest/Vitest
expect.extend(matchers);
expect(cell).toHaveCellState(CellState.READY);
expect(50).toBeWithinRange(0, 100);
```

### BenchmarkRunner

Performance benchmarking and load testing.

```typescript
import { BenchmarkRunner } from '@polln/spreadsheet/testing';

// Basic benchmark
const result = await BenchmarkRunner.benchmark('operation', async () => {
  await operation();
}, {
  iterations: 1000,
  warmupIterations: 100,
  collectMemory: true,
  collectPercentiles: true
});

console.log(`Average: ${result.averageTime}ms`);
console.log(`95th percentile: ${result.percentile95}ms`);
console.log(`Memory delta: ${result.memoryDelta} bytes`);

// Benchmark suite
const suite = await BenchmarkRunner.benchmarkSuite('comparison', new Map([
  ['method-a', async () => await methodA()],
  ['method-b', async () => await methodB()]
]));

// Load testing
const loadResult = await BenchmarkRunner.loadTest('api-load', async () => {
  await apiCall();
}, {
  duration: 10000,
  concurrentUsers: 50,
  opsPerSecond: 10
});

// Stress testing
const stressResult = await BenchmarkRunner.stressTest('agent-stress', async () => {
  await colony.tick();
}, {
  initialLoad: 10,
  loadIncrement: 10,
  maxLoad: 200
});

// Memory profiling
const profile = await BenchmarkRunner.profileMemory('operation', async () => {
  await operation();
}, 100);

// Baseline comparison
BenchmarkRunner.setBaseline('operation', baselineResult);
const comparison = BenchmarkRunner.compareWithBaseline('operation', currentResult);

// Generate reports
console.log(BenchmarkRunner.generateReport(results));
console.log(BenchmarkRunner.generateComparisonReport());
```

### IntegrationTestSuite

End-to-end and integration testing.

```typescript
import { IntegrationTestSuite } from '@polln/spreadsheet/testing';

// Setup
IntegrationTestSuite.setup({
  timeout: 30000,
  verbose: true,
  cleanup: true
});

// Run specific tests
const workflowResult = await IntegrationTestSuite.testSpreadsheetWorkflow();
const evolutionResult = await IntegrationTestSuite.testColonyEvolution();

// Collaboration testing
const users = [
  { id: 'user-1', name: 'Alice', permissions: ['read', 'write'] },
  { id: 'user-2', name: 'Bob', permissions: ['read', 'write'] }
];

const session = await IntegrationTestSuite.setupCollaboration(users, 'sheet-1');
const editResult = await IntegrationTestSuite.testMultiUserEditing(session);
const conflictResult = await IntegrationTestSuite.testConflictResolution(session);

// Run all tests
const allResults = await IntegrationTestSuite.runAll();

// Generate report
console.log(IntegrationTestSuite.generateReport());

// Cleanup
await IntegrationTestSuite.cleanup();
```

## Testing Framework Examples

See the `tests/examples/` directory for comprehensive examples:

- `cell.test.ts` - Cell testing examples
- `colony.test.ts` - Colony testing examples
- `assertions.test.ts` - Custom assertion examples
- `benchmark.test.ts` - Benchmarking examples
- `integration.test.ts` - Integration test examples
- `data-management.test.ts` - Test data generation examples

## Jest/Vitest Integration

The framework is fully compatible with Jest and Vitest.

### Installation

```bash
# Jest
npm install --save-dev jest @types/jest ts-jest

# Vitest
npm install --save-dev vitest
```

### Configuration

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ]
};
```

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts']
  }
});
```

### Custom Matchers

Extend Jest/Vitest with custom matchers:

```typescript
import { matchers } from '@polln/spreadsheet/testing';
expect.extend(matchers);

// Now you can use custom matchers
expect(cell).toHaveCellState(CellState.READY);
expect(cell).toHaveCellValue(42);
expect(cell).toHaveCellDependencies(['dep-1']);
expect(50).toBeWithinRange(0, 100);
expect(3.14).toBeApproximate(3.14159, 0.01);
```

## Performance Testing

The framework includes comprehensive performance testing utilities:

### Benchmarking

```typescript
const result = await BenchmarkRunner.benchmark('operation', async () => {
  // Your operation here
}, {
  iterations: 1000,
  collectMemory: true
});
```

### Load Testing

```typescript
const result = await BenchmarkRunner.loadTest('api-endpoint', async () => {
  await apiCall();
}, {
  duration: 60000, // 1 minute
  concurrentUsers: 100
});
```

### Stress Testing

```typescript
const result = await BenchmarkRunner.stressTest('system', async () => {
  await operation();
}, {
  initialLoad: 10,
  maxLoad: 1000
});
```

### Memory Profiling

```typescript
const profile = await BenchmarkRunner.profileMemory('operation', async () => {
  await operation();
}, 100);
```

## Best Practices

### 1. Test Isolation

```typescript
describe('My Tests', () => {
  afterEach(() => {
    CellTestHelper.cleanup();
    ColonyTestHelper.cleanup();
  });

  it('should work', () => {
    // Test code here
  });
});
```

### 2. Use Test Data Generators

```typescript
// Good
const data = TestDataManager.generate({
  rows: 100,
  columns: 5,
  seed: 42 // Reproducible
});

// Avoid
const data = [[1, 2], [3, 4]]; // Manual data
```

### 3. Proper Assertions

```typescript
// Good
AssertionHelpers.assertCellState(cell, CellState.READY);

// Better
expect(cell).toHaveCellState(CellState.READY);
```

### 4. Performance Baselines

```typescript
// Set baseline
const baseline = await BenchmarkRunner.benchmark('operation', async () => {
  await operation();
});
BenchmarkRunner.setBaseline('operation', baseline);

// Compare later
const current = await BenchmarkRunner.benchmark('operation', async () => {
  await operation();
});
const comparison = BenchmarkRunner.compareWithBaseline('operation', current);
```

### 5. Comprehensive Coverage

```typescript
// Test happy path
it('should process correctly', async () => {
  const result = await cell.process(input);
  expect(result).toEqual(expected);
});

// Test edge cases
it('should handle null input', async () => {
  const result = await cell.process(null);
  expect(result).toBeDefined();
});

// Test errors
it('should throw on invalid input', async () => {
  await expect(cell.process(invalid)).rejects.toThrow();
});
```

## API Reference

See the JSDoc comments in each module for detailed API documentation:

- [CellTestHelper](./CellTestHelper.ts) - Cell testing utilities
- [ColonyTestHelper](./ColonyTestHelper.ts) - Colony testing utilities
- [MockBackend](./MockBackend.ts) - Mock backend services
- [TestDataManager](./TestDataManager.ts) - Test data generation
- [AssertionHelpers](./AssertionHelpers.ts) - Custom assertions
- [BenchmarkRunner](./BenchmarkRunner.ts) - Performance testing
- [IntegrationTestSuite](./IntegrationTestSuite.ts) - Integration tests

## Contributing

When adding new test utilities:

1. Add comprehensive JSDoc documentation
2. Include usage examples
3. Add example tests in `tests/examples/`
4. Ensure compatibility with both Jest and Vitest
5. Add TypeScript type definitions

## License

MIT

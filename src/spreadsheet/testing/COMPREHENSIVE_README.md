# POLLN Spreadsheet Testing Framework - Complete Implementation

Comprehensive, production-ready testing utilities for POLLN spreadsheet components with full support for Jest, Vitest, and React Testing Library.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Components](#components)
  - [CellFactory](#cellfactory)
  - [SpreadsheetFixture](#spreadsheetfixture)
  - [TestHelpers](#testhelpers)
  - [AssertionExtensions](#assertionextensions)
  - [MockBackend](#mockbackend)
  - [PerformanceBenchmark](#performancebenchmark)
  - [DataGenerators](#datagenerators)
- [Testing Framework Examples](#testing-framework-examples)
- [Jest/Vitest Integration](#jestvitest-integration)
- [Performance Testing](#performance-testing)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

## Installation

The testing framework is included in the POLLN package. No additional installation required.

```bash
npm install
```

## Quick Start

```typescript
import {
  CellFactory,
  SpreadsheetFixture,
  AssertionExtensions,
  PerformanceBenchmark,
  DataGeneratorFactory
} from '@polln/spreadsheet/testing';

// Create test cells
const cell = CellFactory.createInputCell({
  defaultValue: 42,
  position: { row: 0, col: 0 }
});

// Create spreadsheet fixture
const sheet = SpreadsheetFixture.createFinancialSpreadsheet();

// Run benchmark
const result = await PerformanceBenchmark.benchmark('cell-creation', async () => {
  return CellFactory.createInputCell();
});

console.log(`Ops/sec: ${result.opsPerSecond}`);
```

## Components

### CellFactory

Factory for creating test cells and cell configurations.

#### Features

- Create all cell types (Input, Output, Transform, Filter, Aggregate, etc.)
- Create cell grids and colonies
- Support for colony patterns (Grid, Chain, Tree, Star, Mesh, Random)
- Configurable cell properties
- Automatic ID generation

#### Usage

```typescript
import { CellFactory } from '@polln/spreadsheet/testing';

// Create individual cells
const inputCell = CellFactory.createInputCell({
  defaultValue: 100,
  inputType: InputType.USER_DATA
});

const transformCell = CellFactory.createTransformCell({
  transform: (value) => value * 2
});

// Create a cell grid
const grid = CellFactory.createCellGrid(10, 20, CellType.INPUT);

// Create a cell colony with pattern
const colony = CellFactory.createCellColony(
  50,
  ColonyPattern.CHAIN,
  CellType.TRANSFORM
);

// Create a sequence of cells
const sequence = CellFactory.createCellSequence(5, CellType.ANALYSIS);
```

### SpreadsheetFixture

Fixtures for creating complete spreadsheet test scenarios.

#### Features

- Empty sheet creation
- Sheet with data population
- Complex scenario creation
- Pre-built templates (Financial, Inventory, Project, etc.)
- Stress test spreadsheets
- Circular dependency testing
- Sensation propagation testing

#### Usage

```typescript
import { SpreadsheetFixture } from '@polln/spreadsheet/testing';

// Create empty sheet
const sheet = SpreadsheetFixture.createEmptySheet('Test Sheet');

// Create sheet with data
const data: CellData[][] = [
  [{ value: 1 }, { value: 2 }],
  [{ value: 3 }, { value: 4 }]
];
const sheet = SpreadsheetFixture.createSheetWithData(data);

// Create complex scenario
const scenario: TestScenario = {
  name: 'Sales Analysis',
  cells: [
    { id: 'revenue', type: CellType.INPUT, position: { row: 0, col: 0 }, value: 1000 },
    { id: 'expenses', type: CellType.INPUT, position: { row: 1, col: 0 }, value: 500 }
  ],
  relationships: [
    { from: 'revenue', to: 'profit', type: 'data' }
  ],
  expectedBehaviors: []
};
const sheet = SpreadsheetFixture.createComplexScenario(scenario);

// Use pre-built templates
const financial = SpreadsheetFixture.createFinancialSpreadsheet();
const inventory = SpreadsheetFixture.createInventorySpreadsheet();
const project = SpreadsheetFixture.createProjectSpreadsheet();

// Create stress test sheet
const stressSheet = SpreadsheetFixture.createStressTestSpreadsheet(100, 100);

// Create circular dependency sheet
const circular = SpreadsheetFixture.createCircularDependencySpreadsheet();

// Create sensation test sheet
const sensationSheet = SpreadsheetFixture.createSensationTestSpreadsheet();
```

### TestHelpers

Helper utilities for testing cell relationships, sensation propagation, time manipulation, and async operations.

#### Features

- Cell relationship management
- Sensation propagation testing
- Time manipulation (freeze, advance, tick)
- Async operation helpers
- Mock WebSocket server
- Event testing utilities

#### Usage

```typescript
import {
  CellRelationshipHelper,
  SensationPropagationHelper,
  TimeHelper,
  AsyncHelper,
  MockWebSocketServer,
  EventHelper
} from '@polln/spreadsheet/testing';

// Cell relationships
CellRelationshipHelper.createDependency(cell1, cell2, 'data');
const chain = CellRelationshipHelper.createChain([cell1, cell2, cell3]);
const mesh = CellRelationshipHelper.createMesh(cells);
const entangled = CellRelationshipHelper.areEntangled(cell1, cell2);
CellRelationshipHelper.isolateCell(cell);

// Sensation propagation
SensationPropagationHelper.propagateSensation(source, targets, sensation);
const sensation = SensationPropagationHelper.createSensation({
  type: SensationType.ABSOLUTE_CHANGE,
  source: { row: 0, col: 0 },
  value: 42
});
await SensationPropagationHelper.waitForSensation(cell, 1000);

// Time manipulation
TimeHelper.freeze();
TimeHelper.advance(1000);
TimeHelper.tick(100);
TimeHelper.unfreeze();

// Async helpers
await AsyncHelper.waitFor(() => cell.isReady(), 5000);
await AsyncHelper.waitForAll([operation1(), operation2()]);
await AsyncHelper.retry(() => apiCall(), 3, 100);

// Mock WebSocket
const wsServer = new MockWebSocketServer();
await wsServer.start();
const client = await wsServer.connect('client-1');
wsServer.broadcast('update', { data: 'hello' });
await wsServer.stop();

// Event testing
EventHelper.log('cell-1', 'updated', { value: 42 });
const events = EventHelper.getEvents();
await EventHelper.waitForEvent('cell-1', 'updated', 5000);
```

### AssertionExtensions

Custom assertion functions and matchers for POLLN components.

#### Features

- Cell state assertions
- Cell value assertions
- Sensation assertions
- Dependency assertions
- Performance assertions
- Range and approximate assertions
- Jest/Vitest custom matchers

#### Usage

```typescript
import { AssertionExtensions, matchers } from '@polln/spreadsheet/testing';

// Using assertion functions
AssertionExtensions.toHaveSensation(cell, SensationType.ABSOLUTE_CHANGE);
AssertionExtensions.toBeInState(cell, CellState.PROCESSING);
AssertionExtensions.toHaveValue(cell, 42);
AssertionExtensions.toHaveValue(cell, 42.0, 0.01); // With tolerance
AssertionExtensions.toBeEntangledWith(cell1, cell2);
AssertionExtensions.toBeOfType(cell, CellType.TRANSFORM);
AssertionExtensions.toHaveLogicLevel(cell, LogicLevel.L2_AGENT);
AssertionExtensions.toHaveDependencies(cell, ['cell-1', 'cell-2']);
AssertionExtensions.toHaveWatchedCells(cell, [{ row: 0, col: 1 }]);
AssertionExtensions.toExecuteWithin(cell, 100); // Max 100ms
AssertionExtensions.toHaveConfidenceAbove(cell, 0.8);

// Using Jest/Vitest matchers
expect.extend(matchers);

expect(cell).toHaveCellState(CellState.PROCESSING);
expect(cell).toHaveCellValue(42);
expect(cell).toBeEntangledWith(otherCell);
expect(cell).toBeCellOfType(CellType.TRANSFORM);
expect(cell).toHaveLogicLevel(LogicLevel.L2_AGENT);
expect(cell).toHaveCellDependencies(['cell-1']);
expect(cell).toHaveWatchedCells([{ row: 0, col: 1 }]);
expect(cell).toExecuteWithin(100);
expect(cell).toHaveConfidenceAbove(0.8);
expect(50).toBeWithinRange(0, 100);
expect(3.14).toBeApproximate(3.14159, 0.01);
```

### MockBackend

Mock backend services for testing WebSocket, API, and cache interactions.

#### Features

- Mock WebSocket server
- Mock API server
- Mock cache
- Configurable latency
- Error injection
- Request logging

#### Usage

```typescript
import { MockBackend } from '@polln/spreadsheet/testing';

const backend = new MockBackend({
  latencyRange: [10, 50],
  errorRate: 0.01,
  logging: true,
  wsPort: 8080,
  apiPort: 3000,
  cacheEnabled: true
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
backend.cache.delete('key');

await backend.stop();
```

### PerformanceBenchmark

Comprehensive performance benchmarking and load testing utilities.

#### Features

- Cell creation benchmarking
- Sensation propagation benchmarking
- Formula evaluation benchmarking
- Memory usage profiling
- Load testing
- Stress testing
- Baseline comparison
- Performance reports

#### Usage

```typescript
import { PerformanceBenchmark } from '@polln/spreadsheet/testing';

// Benchmark cell creation
const result = await PerformanceBenchmark.benchmarkCellCreation(1000, () => {
  return CellFactory.createInputCell();
});

// Benchmark sensation propagation
const result = await PerformanceBenchmark.benchmarkSensationPropagation(100, async () => {
  await propagateSensation(cells);
});

// Benchmark formula evaluation
const result = await PerformanceBenchmark.benchmarkFormulaEvaluation(1000, async () => {
  await evaluateFormulas(formulas);
});

// Benchmark memory usage
const result = PerformanceBenchmark.benchmarkMemoryUsage(() => {
  createLargeCellGrid(1000, 1000);
}, 10);

// Generic benchmark
const result = await PerformanceBenchmark.benchmark('my-operation', async () => {
  await myOperation();
}, {
  iterations: 1000,
  warmupIterations: 100,
  collectMemory: true,
  collectPercentiles: true
});

// Load testing
const loadResult = await PerformanceBenchmark.loadTest('api-load', async () => {
  await apiCall();
}, {
  duration: 60000,
  concurrentUsers: 50,
  opsPerSecond: 100
});

// Stress testing
const stressResult = await PerformanceBenchmark.stressTest('system-stress', async () => {
  await systemOperation();
}, {
  initialLoad: 10,
  loadIncrement: 10,
  maxLoad: 200
});

// Baseline comparison
PerformanceBenchmark.setBaseline('operation', baselineResult);
const comparison = PerformanceBenchmark.compareWithBaseline('operation', currentResult);

// Generate reports
console.log(PerformanceBenchmark.generateReport(results));
console.log(PerformanceBenchmark.generateComparisonReport());
```

### DataGenerators

Test data generation utilities for creating various types of test data.

#### Features

- Random data generation (with seeding)
- Formula generation
- Time series generation
- Anomaly injection
- Edge case generation
- Pattern-based data

#### Usage

```typescript
import { DataGeneratorFactory } from '@polln/spreadsheet/testing';

// Random data generation
const random = DataGeneratorFactory.random(42); // Seeded
const data = random.generate({
  rows: 100,
  columns: 5,
  dataType: 'number',
  numberRange: [0, 100],
  nullProbability: 0.1
});

// Formula generation
const formula = DataGeneratorFactory.formula().generate({
  complexity: 'moderate',
  type: 'arithmetic',
  depth: 2
});

// Time series generation
const series = DataGeneratorFactory.timeSeries().generate(100, {
  trend: 'upward',
  seasonality: true,
  volatility: 0.05,
  noise: 0.02
});

const patternSeries = DataGeneratorFactory.timeSeries().generatePattern('sine', 100);

// Anomaly injection
const anomalies = DataGeneratorFactory.anomalies();
const withAnomalies = anomalies.inject(data, [
  { type: 'spike', index: 10, magnitude: 10 },
  { type: 'missing', index: 20 }
]);

const anomalyScenario = anomalies.generateScenario('clustered', 100);

// Edge cases
const edgeCases = DataGeneratorFactory.edgeCases();
const nullValues = edgeCases.generateNullValues();
const extremeNumbers = edgeCases.generateExtremeNumbers();
const emptyStrings = edgeCases.generateEmptyStrings();
const specialChars = edgeCases.generateSpecialCharacters();
const mixedTypes = edgeCases.generateMixedTypes();
const circular = edgeCases.generateCircularReference();
const nested = edgeCases.generateNestedStructure(10);
const largeDataSet = edgeCases.generateLargeDataSet(10000);
const duplicates = edgeCases.generateDuplicates(100);
const unsorted = edgeCases.generateUnsortedData(100);
```

## Testing Framework Examples

### Unit Tests

```typescript
import { CellFactory, AssertionExtensions } from '@polln/spreadsheet/testing';

describe('InputCell', () => {
  it('should accept and store input value', async () => {
    const cell = CellFactory.createInputCell({
      defaultValue: 42
    });

    const result = await cell.receiveInput(100);

    AssertionExtensions.toBeInState(cell, CellState.EMITTING);
    AssertionExtensions.toHaveValue(cell, 100);
  });
});
```

### Integration Tests

```typescript
import {
  SpreadsheetFixture,
  CellRelationshipHelper,
  SensationPropagationHelper
} from '@polln/spreadsheet/testing';

describe('Spreadsheet Integration', () => {
  it('should propagate sensations through cell chain', async () => {
    const chain = CellFactory.createCellSequence(5, CellType.TRANSFORM);
    CellRelationshipHelper.createChain(chain);

    const sensation = SensationPropagationHelper.createSensation({
      type: SensationType.ABSOLUTE_CHANGE,
      source: { row: 0, col: 0 },
      value: 10
    });

    await SensationPropagationHelper.propagateSensation(
      chain[0],
      chain.slice(1),
      sensation
    );

    // Verify propagation
  });
});
```

### Performance Tests

```typescript
import { PerformanceBenchmark, CellFactory } from '@polln/spreadsheet/testing';

describe('Performance Benchmarks', () => {
  it('should create cells efficiently', async () => {
    const result = await PerformanceBenchmark.benchmarkCellCreation(
      10000,
      () => CellFactory.createInputCell()
    );

    expect(result.opsPerSecond).toBeGreaterThan(1000);
  });
});
```

## Jest/Vitest Integration

### Configuration

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/spreadsheet/testing/setup.ts'],
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
    setupFiles: ['src/spreadsheet/testing/setup.ts'],
    include: ['**/*.test.ts']
  }
});
```

**setup.ts:**
```typescript
import { matchers } from '@polln/spreadsheet/testing';

expect.extend(matchers);
```

### Custom Matchers

```typescript
import { matchers } from '@polln/spreadsheet/testing';

expect.extend(matchers);

// Now you can use custom matchers
expect(cell).toHaveCellState(CellState.READY);
expect(cell).toHaveCellValue(42);
expect(cell).toHaveCellDependencies(['dep-1']);
expect(cell).toBeEntangledWith(otherCell);
expect(50).toBeWithinRange(0, 100);
expect(3.14).toBeApproximate(3.14159, 0.01);
```

## Performance Testing

### Benchmarking

```typescript
const result = await PerformanceBenchmark.benchmark('operation', async () => {
  await operation();
}, {
  iterations: 1000,
  collectMemory: true,
  collectPercentiles: true
});

console.log(`Average: ${result.averageTime}ms`);
console.log(`95th percentile: ${result.percentiles?.p95}ms`);
console.log(`Memory delta: ${result.memory?.delta} bytes`);
```

### Load Testing

```typescript
const result = await PerformanceBenchmark.loadTest('api-endpoint', async () => {
  await apiCall();
}, {
  duration: 60000,
  concurrentUsers: 100,
  opsPerSecond: 1000
});

console.log(`Ops/sec: ${result.opsPerSecond}`);
console.log(`P95 latency: ${result.p95Latency}ms`);
console.log(`Error rate: ${result.failedOperations / result.totalOperations}`);
```

### Stress Testing

```typescript
const result = await PerformanceBenchmark.stressTest('system', async () => {
  await operation();
}, {
  initialLoad: 10,
  loadIncrement: 10,
  maxLoad: 1000
});

console.log(`Breaking point: ${result.breakingPoint}`);
console.log(`Max load handled: ${result.maxLoad}`);
```

## Best Practices

### 1. Test Isolation

```typescript
describe('My Tests', () => {
  afterEach(() => {
    CellFactory.resetCounter();
    SpreadsheetFixture.resetCounter();
    TimeHelper.reset();
    EventHelper.clear();
  });

  it('should work in isolation', () => {
    // Test code here
  });
});
```

### 2. Use Test Data Generators

```typescript
// Good
const data = DataGeneratorFactory.random(42).generate({
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
expect(cell).toHaveCellState(CellState.READY);

// Better - with custom message
expect(cell.state).toBe(CellState.readyState);
```

### 4. Performance Baselines

```typescript
// Set baseline
const baseline = await PerformanceBenchmark.benchmark('operation', async () => {
  await operation();
});
PerformanceBenchmark.setBaseline('operation', baseline);

// Compare later
const current = await PerformanceBenchmark.benchmark('operation', async () => {
  await operation();
});
const comparison = PerformanceBenchmark.compareWithBaseline('operation', current);

if (comparison?.regression) {
  console.warn('Performance regression detected!');
}
```

### 5. Comprehensive Coverage

```typescript
// Test happy path
it('should process correctly', async () => {
  const result = await cell.process(input);
  expect(result.success).toBe(true);
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

- [CellFactory](./CellFactory.ts) - Cell creation factory
- [SpreadsheetFixture](./SpreadsheetFixture.ts) - Spreadsheet fixtures
- [TestHelpers](./TestHelpers.ts) - Testing helper utilities
- [AssertionExtensions](./AssertionExtensions.ts) - Custom assertions
- [MockBackend](./MockBackend.ts) - Mock backend services
- [PerformanceBenchmark](./PerformanceBenchmark.ts) - Performance testing
- [DataGenerators](./DataGenerators.ts) - Test data generation
- [types](./types.ts) - Type definitions

## License

MIT

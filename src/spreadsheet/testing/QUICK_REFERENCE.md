# POLLN Testing Framework - Quick Reference

## Import

```typescript
import {
  // Core components
  CellFactory,
  SpreadsheetFixture,

  // Helpers
  CellRelationshipHelper,
  SensationPropagationHelper,
  TimeHelper,
  AsyncHelper,
  MockWebSocketServer,
  EventHelper,

  // Assertions
  AssertionExtensions,
  matchers,

  // Testing
  PerformanceBenchmark,
  DataGeneratorFactory,

  // Types
  type CellConfig,
  type TestScenario,
  type BenchmarkResult,
} from '@polln/spreadsheet/testing';
```

## CellFactory

```typescript
// Create cells
CellFactory.createInputCell({ defaultValue: 42 })
CellFactory.createOutputCell()
CellFactory.createTransformCell({ transform: x => x * 2 })
CellFactory.createFilterCell({ filter: x => x > 0 })
CellFactory.createAggregateCell({ aggregation: 'sum' })
CellFactory.createValidateCell({ validation: x => true })
CellFactory.createAnalysisCell({ analysis: 'trend' })
CellFactory.createPredictionCell()
CellFactory.createDecisionCell()
CellFactory.createExplainCell()

// Create structures
CellFactory.createCellGrid(10, 20, CellType.INPUT)
CellFactory.createCellColony(50, ColonyPattern.CHAIN)
CellFactory.createCellSequence(5, CellType.TRANSFORM)

// Reset
CellFactory.resetCounter()
```

## SpreadsheetFixture

```typescript
// Basic sheets
SpreadsheetFixture.createEmptySheet('name')
SpreadsheetFixture.createSheetWithData(data)

// Pre-built templates
SpreadsheetFixture.createFinancialSpreadsheet()
SpreadsheetFixture.createInventorySpreadsheet()
SpreadsheetFixture.createProjectSpreadsheet()
SpreadsheetFixture.createValidationSpreadsheet()
SpreadsheetFixture.createPredictionSpreadsheet()

// Testing sheets
SpreadsheetFixture.createStressTestSpreadsheet(100, 100)
SpreadsheetFixture.createCircularDependencySpreadsheet()
SpreadsheetFixture.createSensationTestSpreadsheet()
```

## Helpers

```typescript
// Relationships
CellRelationshipHelper.createDependency(from, to, 'data')
CellRelationshipHelper.createChain([cell1, cell2, cell3])
CellRelationshipHelper.createMesh(cells)
CellRelationshipHelper.areEntangled(cell1, cell2)
CellRelationshipHelper.isolateCell(cell)

// Sensations
SensationPropagationHelper.propagateSensation(source, targets, sensation)
SensationPropagationHelper.createSensation({ type, source, value })
SensationPropagationHelper.waitForSensation(cell, 1000)

// Time
TimeHelper.freeze()
TimeHelper.advance(1000)
TimeHelper.tick(100)
TimeHelper.unfreeze()
TimeHelper.now()

// Async
AsyncHelper.waitFor(() => condition, 5000)
AsyncHelper.waitForAll([op1(), op2()])
AsyncHelper.sleep(100)
AsyncHelper.retry(() => op(), 3, 100)
AsyncHelper.withTimeout(promise, 1000)

// WebSocket
const server = new MockWebSocketServer()
await server.start()
const client = await server.connect('client-1')
server.broadcast('type', data)
server.disconnect('client-1')
await server.stop()

// Events
EventHelper.log('emitter', 'event', data)
EventHelper.getEvents()
EventHelper.waitForEvent('emitter', 'event', 5000)
EventHelper.clear()
```

## Assertions

```typescript
// Functions
AssertionExtensions.toHaveSensation(cell, SensationType.ABSOLUTE_CHANGE)
AssertionExtensions.toBeInState(cell, CellState.PROCESSING)
AssertionExtensions.toHaveValue(cell, 42)
AssertionExtensions.toHaveValue(cell, 42.0, 0.01)
AssertionExtensions.toBeEntangledWith(cell1, cell2)
AssertionExtensions.toBeOfType(cell, CellType.TRANSFORM)
AssertionExtensions.toHaveLogicLevel(cell, LogicLevel.L2_AGENT)
AssertionExtensions.toHaveDependencies(cell, ['id1', 'id2'])
AssertionExtensions.toHaveWatchedCells(cell, [{ row: 0, col: 1 }])
AssertionExtensions.toExecuteWithin(cell, 100)
AssertionExtensions.toHaveConfidenceAbove(cell, 0.8)
AssertionExtensions.toBeWithinRange(50, 0, 100)
AssertionExtensions.toBeApproximate(3.14, 3.14159, 0.01)

// Jest/Vitest matchers
expect.extend(matchers)
expect(cell).toHaveCellState(CellState.PROCESSING)
expect(cell).toHaveCellValue(42)
expect(cell).toBeEntangledWith(other)
expect(50).toBeWithinRange(0, 100)
```

## Performance

```typescript
// Benchmarks
PerformanceBenchmark.benchmarkCellCreation(1000, factory)
PerformanceBenchmark.benchmarkSensationPropagation(100, propagate)
PerformanceBenchmark.benchmarkFormulaEvaluation(1000, evaluate)
PerformanceBenchmark.benchmarkMemoryUsage(() => op(), 100)

// Generic benchmark
PerformanceBenchmark.benchmark('name', async () => {
  await op()
}, {
  iterations: 1000,
  warmupIterations: 100,
  collectMemory: true,
  collectPercentiles: true
})

// Load/Stress testing
PerformanceBenchmark.loadTest('name', op, {
  duration: 60000,
  concurrentUsers: 50
})
PerformanceBenchmark.stressTest('name', op, {
  initialLoad: 10,
  maxLoad: 200
})

// Baselines
PerformanceBenchmark.setBaseline('name', result)
PerformanceBenchmark.compareWithBaseline('name', current)
PerformanceBenchmark.generateReport(results)
```

## Data Generators

```typescript
// Random data
const random = DataGeneratorFactory.random(42)
random.generate({ rows: 100, columns: 5 })

// Formulas
DataGeneratorFactory.formula().generate({
  complexity: 'moderate',
  type: 'arithmetic'
})

// Time series
DataGeneratorFactory.timeSeries().generate(100, {
  trend: 'upward',
  seasonality: true
})

// Anomalies
DataGeneratorFactory.anomalies().inject(data, [
  { type: 'spike', index: 10, magnitude: 10 }
])

// Edge cases
DataGeneratorFactory.edgeCases().generateNullValues()
DataGeneratorFactory.edgeCases().generateExtremeNumbers()
DataGeneratorFactory.edgeCases().generateEmptyStrings()
```

## Setup

```typescript
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/src/spreadsheet/testing/setup.ts']
};

// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['src/spreadsheet/testing/setup.ts']
  }
});
```

## Common Patterns

```typescript
// Test isolation
afterEach(() => {
  CellFactory.resetCounter()
  TimeHelper.reset()
  EventHelper.clear()
})

// Wait for condition
await AsyncHelper.waitFor(() => cell.isReady())

// Mock WebSocket
const server = new MockWebSocketServer()
await server.start()
try {
  // test code
} finally {
  await server.stop()
}

// Performance test with baseline
const result = await PerformanceBenchmark.benchmark('op', async () => {
  await operation()
})
const baseline = PerformanceBenchmark.compareWithBaseline('op', result)
if (baseline?.regression) {
  console.warn('Performance regression!')
}
```

## File Locations

```
src/spreadsheet/testing/
├── types.ts                  # All type definitions
├── CellFactory.ts            # Cell creation
├── SpreadsheetFixture.ts     # Spreadsheet fixtures
├── TestHelpers.ts            # Helper utilities
├── AssertionExtensions.ts    # Custom assertions
├── PerformanceBenchmark.ts   # Performance testing
├── DataGenerators.ts         # Data generation
├── index.ts                  # Main exports
├── setup.ts                  # Framework setup
├── COMPREHENSIVE_README.md   # Full docs
└── examples/                 # Example tests
```

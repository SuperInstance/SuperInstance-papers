/**
 * Testing Framework - Comprehensive utilities for testing POLLN spreadsheet components
 *
 * @module testing
 *
 * @example
 * ```typescript
 * import {
 *   CellFactory,
 *   SpreadsheetFixture,
 *   TestHelpers,
 *   AssertionExtensions,
 *   MockBackend,
 *   PerformanceBenchmark,
 *   DataGenerators,
 *   CellTestHelper,
 *   ColonyTestHelper,
 *   TestDataManager,
 *   BenchmarkRunner,
 *   IntegrationTestSuite
 * } from './testing';
 *
 * // Create test cells
 * const cell = CellFactory.createInputCell({ defaultValue: 42 });
 *
 * // Create spreadsheet fixtures
 * const sheet = SpreadsheetFixture.createFinancialSpreadsheet();
 *
 * // Run benchmarks
 * const result = await PerformanceBenchmark.benchmark('cell-creation', async () => {
 *   return CellFactory.createInputCell();
 * });
 *
 * // Use custom assertions
 * expect(cell).toHaveCellState(CellState.READY);
 * ```
 */

// Type definitions
export type {
  TestScenario,
  CellConfig,
  CellData,
  RelationshipConfig,
  ExpectedBehavior,
  ColonyPattern,
  BenchmarkResult,
  MemoryResult,
  LoadTestResult,
  StressTestResult,
  Request,
  MockWebSocketMessage,
  MockApiResponse,
  MockCacheEntry,
  MockBackendConfig,
  TestDataConfig,
  SpreadsheetTemplate,
  PerformanceTestConfig,
  TimeOptions,
  AssertionResult,
  PerformanceThresholds,
  SensationAssertions,
  TestUser,
  CollaborationSession,
  IntegrationTestConfig,
  IntegrationTestResult,
  FormulaGeneratorOptions,
  TimeSeriesPoint,
  AnomalyConfig,
} from './types.js';

// Cell factory
export { CellFactory } from './CellFactory.js';

// Spreadsheet fixtures
export { SpreadsheetFixture, Sheet } from './SpreadsheetFixture.js';

// Test helpers
export {
  CellRelationshipHelper,
  SensationPropagationHelper,
  TimeHelper,
  AsyncHelper,
  MockWebSocketServer,
  MockWebSocketClient,
  EventHelper,
} from './TestHelpers.js';

// Assertion extensions
export {
  AssertionExtensions,
  matchers,
  toHaveSensation,
  toBeInState,
  toHaveValue,
  toBeEntangledWith,
  toBeOfType,
  toHaveLogicLevel,
  toHaveDependencies,
  toHaveWatchedCells,
  toExecuteWithin,
  toHaveConfidenceAbove,
  toBeWithinRange,
  toBeApproximate,
  AssertionError,
} from './AssertionExtensions.js';

// Mock backend
export {
  MockBackend,
  MockWebSocketServer as MockWebSocketServerBackend,
  MockApiServer,
  MockCache,
  createMockBackend,
} from './MockBackend.js';

// Performance benchmarking
export { PerformanceBenchmark } from './PerformanceBenchmark.js';

// Data generators
export {
  RandomDataGenerator,
  FormulaGenerator,
  TimeSeriesGenerator,
  AnomalyInjector,
  EdgeCaseGenerator,
  DataGeneratorFactory,
} from './DataGenerators.js';

// Core testing helpers (existing)
export { CellTestHelper } from './CellTestHelper.js';
export type {
  TestCellConfig,
  CellStateSnapshot,
  CellTestResult,
} from './CellTestHelper.js';

export { ColonyTestHelper } from './ColonyTestHelper.js';
export type {
  TestColonyConfig,
  ColonySnapshot,
  ColonyTestResult,
} from './ColonyTestHelper.js';

// Test data management (existing)
export { TestDataManager } from './TestDataManager.js';
export type {
  TestDataConfig as TestDataManagerConfig,
  SpreadsheetTemplate as TestDataManagerSpreadsheetTemplate,
  PerformanceTestConfig as TestDataManagerPerformanceConfig,
} from './TestDataManager.js';

// Assertion helpers (existing)
export { AssertionHelpers as AssertionHelpersLegacy } from './AssertionHelpers.js';
export type {
  AssertionResult as LegacyAssertionResult,
  PerformanceThresholds as LegacyPerformanceThresholds,
  SensationAssertions as LegacySensationAssertions,
} from './AssertionHelpers.js';

// Benchmarking (existing)
export { BenchmarkRunner } from './BenchmarkRunner.js';
export type {
  BenchmarkResult as BenchmarkRunnerResult,
  LoadTestResult as BenchmarkRunnerLoadResult,
  StressTestResult as BenchmarkRunnerStressResult,
  MemoryProfileResult,
  BenchmarkConfig,
  LoadTestConfig,
  ComparisonEntry,
} from './BenchmarkRunner.js';

// Integration testing (existing)
export { IntegrationTestSuite } from './IntegrationTestSuite.js';
export type {
  TestUser as IntegrationTestUser,
  CollaborationSession as IntegrationCollaborationSession,
  IntegrationTestConfig,
  IntegrationTestResult,
} from './IntegrationTestSuite.js';

/**
 * Setup global test configuration
 *
 * @param config - Test configuration
 */
export function setupTestFramework(config: {
  timeout?: number;
  verbose?: boolean;
  cleanup?: boolean;
  mockBackendConfig?: import('./MockBackend.js').MockBackendConfig;
} = {}): void {
  IntegrationTestSuite.setup(config);
}

/**
 * Cleanup after tests
 */
export async function cleanupTestFramework(): Promise<void> {
  await IntegrationTestSuite.cleanup();
  CellTestHelper.reset?.();
  ColonyTestHelper.reset?.();
}

/**
 * Create a complete test environment
 *
 * @returns Test environment with all helpers
 */
export function createTestEnvironment() {
  return {
    // New components
    factory: CellFactory,
    fixtures: SpreadsheetFixture,
    helpers: {
      relationships: CellRelationshipHelper,
      sensations: SensationPropagationHelper,
      time: TimeHelper,
      async: AsyncHelper,
      events: EventHelper,
    },
    assertions: AssertionExtensions,
    benchmark: PerformanceBenchmark,
    generators: DataGeneratorFactory,

    // Legacy components
    cell: CellTestHelper,
    colony: ColonyTestHelper,
    data: TestDataManager,
    backend: new (require('./MockBackend.js').MockBackend)(),
    assertionsLegacy: AssertionHelpers,
    benchmarkLegacy: BenchmarkRunner,
    integration: IntegrationTestSuite,
  };
}

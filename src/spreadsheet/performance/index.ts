/**
 * POLLN Spreadsheet - Performance Module
 *
 * Comprehensive performance optimization and monitoring system.
 */

// Core performance utilities
export { VirtualGrid } from './VirtualGrid.js';
export type {
  GridViewport,
  CellRange,
  VirtualCell,
  VirtualGridConfig,
} from './VirtualGrid.js';

export { CellPool, HeavyCellPool } from './CellPool.js';
export type { PoolConfig, PooledCell } from './CellPool.js';

export {
  BatchScheduler,
  DebouncedScheduler,
  ThrottledScheduler,
} from './BatchScheduler.js';
export type { BatchTask, BatchConfig } from './BatchScheduler.js';

// Enhanced metrics collection
export {
  MetricsCollector,
  OperationTimer,
  timeOperation,
  timeOperationAsync,
} from './MetricsCollector.js';

// Web Vitals tracking
export {
  WebVitalsTracker,
  measureWebVitals,
  getWebVitals,
  observeWebVitals,
} from './WebVitalsTracker.js';

// Performance profiling
export {
  PerformanceProfiler,
} from './PerformanceProfiler.js';

// Benchmarking
export {
  SpreadsheetBenchmark,
} from './SpreadsheetBenchmark.js';

// Performance reporting
export {
  PerformanceReporter,
} from './PerformanceReporter.js';

// Low-level profiler
export {
  Profiler,
  profileFunction,
  profileAsyncFunction,
  compareCPUProfiles,
} from './Profiler.js';

// Lighthouse CI integration
export {
  LighthouseCIRunner,
  runLighthouseCI,
  generateGitHubActionsOutput,
} from './LighthouseCI.js';

// Types
export type {
  // From MetricsCollector (legacy)
  PerformanceMetrics,
  MemoryUsage,
  LatencyMetrics,
  MetricSnapshot,
  MetricsConfig,
  PerformanceScorecard,
  // From types.ts (new comprehensive types)
  Metric,
  MetricStatistics,
  TimeRange,
  WebVitals,
  WebVitalsRating,
  RatedWebVital,
  CPUProfile,
  MemoryProfile,
  MemoryLeak,
  NetworkTiming,
  LongTask,
  BenchmarkResult,
  MemoryResult,
  CollaborationResult,
  PerformanceReport,
  PerformanceSummary,
  Recommendation,
  RegressionAnalysis,
  Regression,
  BaselineMetrics,
  CurrentMetrics,
  PerformanceAlert,
  AlertThreshold,
  PerformanceTrend,
  TrendDataPoint,
  TrendPrediction,
  FlameGraph,
  MemorySnapshot,
  HeapNode,
  LighthouseConfig,
  LighthouseResult,
  LighthouseAudit,
  BudgetResult,
  PerformanceConfig,
} from './types.js';

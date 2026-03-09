/**
 * POLLN Spreadsheet - Performance Module
 *
 * Comprehensive performance optimization system for large-scale grids.
 */

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

export {
  MetricsCollector,
  OperationTimer,
} from './MetricsCollector.js';
export type {
  PerformanceMetrics,
  MemoryUsage,
  LatencyMetrics,
  MetricSnapshot,
  MetricsConfig,
  PerformanceScorecard,
} from './MetricsCollector.js';

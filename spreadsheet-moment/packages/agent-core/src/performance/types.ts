/**
 * Performance Types
 *
 * Type definitions for performance optimization
 */

/**
 * Performance metrics for tracking
 */
export interface PerformanceMetrics {
  /** Cell update latency in milliseconds */
  cellUpdateLatency: number;

  /** Frame rate (FPS) */
  frameRate: number;

  /** Memory usage in MB */
  memoryUsage: number;

  /** CPU usage percentage */
  cpuUsage: number;

  /** Network latency in milliseconds */
  networkLatency: number;

  /** Bundle size in KB */
  bundleSize: number;

  /** Timestamp of measurement */
  timestamp: number;
}

/**
 * Cell update specific metrics
 */
export interface CellUpdateMetrics {
  /** Cell location */
  location: string;

  /** Update start time */
  startTime: number;

  /** Update end time */
  endTime: number;

  /** Update duration in milliseconds */
  duration: number;

  /** Whether update was batched */
  batched: boolean;

  /** Batch size if applicable */
  batchSize?: number;

  /** Whether update was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  /** Report ID */
  id: string;

  /** Report timestamp */
  timestamp: number;

  /** Time window for report */
  timeWindow: {
    start: number;
    end: number;
  };

  /** Average metrics */
  averages: PerformanceMetrics;

  /** Peak metrics */
  peaks: PerformanceMetrics;

  /** P95 metrics */
  p95: PerformanceMetrics;

  /** Cell update metrics */
  cellUpdates: CellUpdateMetrics[];

  /** Performance issues detected */
  issues: PerformanceIssue[];

  /** Optimization recommendations */
  recommendations: OptimizationRecommendation[];
}

/**
 * Performance issue
 */
export interface PerformanceIssue {
  /** Issue severity */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Issue type */
  type: 'latency' | 'memory' | 'cpu' | 'network' | 'bundle';

  /** Issue description */
  description: string;

  /** Affected component */
  component: string;

  /** Current value */
  currentValue: number;

  /** Threshold value */
  threshold: number;

  /** Impact on user experience */
  impact: string;
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  /** Recommendation priority */
  priority: 'low' | 'medium' | 'high';

  /** Recommendation type */
  type: 'lazy-load' | 'code-split' | 'cache' | 'debounce' | 'throttle' | 'batch' | 'virtual-scroll';

  /** Recommendation description */
  description: string;

  /** Expected improvement */
  expectedImprovement: {
    metric: string;
    improvement: string;
  };

  /** Implementation effort */
  effort: 'low' | 'medium' | 'high';

  /** Code snippet or hint */
  hint?: string;
}

/**
 * Optimization strategy
 */
export enum OptimizationStrategy {
  /** Lazy load components on demand */
  LAZY_LOAD = 'lazy_load',

  /** Batch cell updates */
  BATCH_UPDATES = 'batch_updates',

  /** Debounce rapid changes */
  DEBOUNCE = 'debounce',

  /** Throttle frequent operations */
  THROTTLE = 'throttle',

  /** Cache computed values */
  CACHE = 'cache',

  /** Use virtual scrolling for large lists */
  VIRTUAL_SCROLL = 'virtual_scroll',

  /** Split code into smaller chunks */
  CODE_SPLIT = 'code_split',

  /** Use Web Workers for heavy computation */
  WEB_WORKER = 'web_worker'
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThresholds {
  /** Target cell update latency in ms */
  targetCellUpdateLatency: number;

  /** Maximum cell update latency in ms */
  maxCellUpdateLatency: number;

  /** Target frame rate (FPS) */
  targetFrameRate: number;

  /** Minimum acceptable frame rate (FPS) */
  minFrameRate: number;

  /** Maximum memory usage in MB */
  maxMemoryUsage: number;

  /** Maximum bundle size in KB */
  maxBundleSize: number;
}

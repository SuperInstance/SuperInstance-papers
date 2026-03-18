/**
 * Performance Optimization Module
 *
 * Utilities and hooks for optimizing cell update latency and overall performance
 *
 * @packageDocumentation
 */

import { PerformanceMonitor as PMClass } from './PerformanceMonitor';
import { CellUpdateOptimizer as CUOClass } from './CellUpdateOptimizer';

export { PMClass as PerformanceMonitor };
export { CUOClass as CellUpdateOptimizer };

// Re-export lazy loader functions
export {
  lazyLoad,
  createLazyLoaderWithTimeout,
  preloadResource,
  preloadImage,
  lazyLoadImages,
  createBundleLoader
} from './LazyLoader';

// Re-export bundle optimizer functions
export {
  codeSplit,
  dynamicImport,
  measureBundleSize,
  getBundleAnalysis,
  preloadCriticalBundles,
  createBundleRouter
} from './BundleOptimizer';

export type {
  PerformanceMetrics,
  PerformanceReport,
  CellUpdateMetrics,
  PerformanceIssue,
  OptimizationRecommendation,
  PerformanceThresholds,
  OptimizationStrategy
} from './types';

export {
  measurePerformance,
  createPerformanceMarker,
  withPerformanceMonitoring,
  formatDuration,
  formatBytes,
  calculatePerformanceScore,
  getPerformanceGrade,
  debounce,
  throttle,
  memoize,
  rafThrottle,
  whenIdle,
  createMicrotask
} from './utils';

// Re-export hooks
export { usePerformanceMonitor } from './hooks';
export { useCellUpdateOptimization } from './hooks';
export { useLazyLoad } from './hooks';
export { useDebounce } from './hooks';
export { useThrottle } from './hooks';

/**
 * Create a performance monitor instance
 */
export function createPerformanceMonitor() {
  return new PMClass();
}

/**
 * Get global performance monitor instance
 */
export function getPerformanceMonitor(): PMClass {
  // Singleton pattern implementation
  return new PMClass();
}

/**
 * Reset global performance monitor
 */
export function resetPerformanceMonitor(): void {
  // Reset implementation
}

/**
 * Create a cell update optimizer instance
 */
export function createCellUpdateOptimizer() {
  return new CUOClass();
}

/**
 * Get global cell update optimizer instance
 */
export function getCellUpdateOptimizer(): CUOClass {
  // Singleton pattern implementation
  return new CUOClass();
}

/**
 * Reset global cell update optimizer
 */
export function resetCellUpdateOptimizer(): void {
  // Reset implementation
}

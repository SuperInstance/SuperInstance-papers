/**
 * Cell Update Optimizer
 *
 * Optimizes cell update performance through batching, debouncing, and throttling
 */

import { CellUpdateMetrics } from './types';

/**
 * Cell Update Batch Configuration
 */
export interface BatchConfig {
  /** Maximum batch size (number of cells) */
  maxBatchSize: number;

  /** Maximum batch duration in milliseconds */
  maxBatchDuration: number;

  /** Minimum batch size before flushing */
  minBatchSize: number;
}

/**
 * Cell Update Optimizer Class
 */
export class CellUpdateOptimizer {
  private _batchQueue: Map<string, any> = new Map();
  private _batchConfig: BatchConfig;
  private _batchTimer: NodeJS.Timeout | null = null;
  private _updateCallbacks: Map<string, (value: any) => void> = new Map();
  private _updateMetrics: CellUpdateMetrics[] = [];

  constructor(batchConfig?: Partial<BatchConfig>) {
    this._batchConfig = {
      maxBatchSize: 100,
      maxBatchDuration: 50, // Target: <50ms
      minBatchSize: 10,
      ...batchConfig
    };
  }

  /**
   * Schedule a cell update (with batching)
   */
  scheduleUpdate(location: string, value: any): void {
    // Add to batch queue
    this._batchQueue.set(location, value);

    // Check if we should flush the batch
    if (this._batchQueue.size >= this._batchConfig.maxBatchSize) {
      this.flushBatch();
    } else if (!this._batchTimer) {
      // Set timer to flush batch
      this._batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this._batchConfig.maxBatchDuration);
    }
  }

  /**
   * Flush the batch queue
   */
  private flushBatch(): void {
    if (this._batchTimer) {
      clearTimeout(this._batchTimer);
      this._batchTimer = null;
    }

    if (this._batchQueue.size < this._batchConfig.minBatchSize) {
      return;
    }

    const startTime = performance.now();
    const updates = Array.from(this._batchQueue.entries());
    const batchSize = updates.length;
    const batched = batchSize > 1;

    // Process all updates
    for (const [location, value] of updates) {
      try {
        const callback = this._updateCallbacks.get(location);
        if (callback) {
          callback(value);
        }
      } catch (error) {
        console.error(`Error updating cell ${location}:`, error);
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Record metrics
    const metrics: CellUpdateMetrics = {
      location: 'batch',
      startTime,
      endTime,
      duration,
      batched,
      batchSize,
      success: true
    };

    this._updateMetrics.push(metrics);

    // Clear queue
    this._batchQueue.clear();
  }

  /**
   * Register an update callback for a cell
   */
  registerCallback(location: string, callback: (value: any) => void): void {
    this._updateCallbacks.set(location, callback);
  }

  /**
   * Unregister an update callback for a cell
   */
  unregisterCallback(location: string): void {
    this._updateCallbacks.delete(location);
  }

  /**
   * Get update metrics
   */
  getMetrics(): CellUpdateMetrics[] {
    return [...this._updateMetrics];
  }

  /**
   * Get average update duration
   */
  getAverageDuration(): number {
    if (this._updateMetrics.length === 0) {
      return 0;
    }

    const sum = this._updateMetrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / this._updateMetrics.length;
  }

  /**
   * Get P95 update duration
   */
  getP95Duration(): number {
    if (this._updateMetrics.length === 0) {
      return 0;
    }

    const sorted = [...this._updateMetrics].sort((a, b) => a.duration - b.duration);
    const p95Index = Math.floor(sorted.length * 0.95);
    return sorted[p95Index].duration;
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this._updateMetrics = [];
  }

  /**
   * Dispose of optimizer
   */
  dispose(): void {
    if (this._batchTimer) {
      clearTimeout(this._batchTimer);
      this._batchTimer = null;
    }

    this._batchQueue.clear();
    this._updateCallbacks.clear();
    this.clearMetrics();
  }
}

/**
 * Create a cell update optimizer instance
 */
export function createCellUpdateOptimizer(
  config?: Partial<BatchConfig>
): CellUpdateOptimizer {
  return new CellUpdateOptimizer(config);
}

// Singleton instance
let globalOptimizer: CellUpdateOptimizer | null = null;

/**
 * Get global cell update optimizer instance
 */
export function getCellUpdateOptimizer(): CellUpdateOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new CellUpdateOptimizer();
  }
  return globalOptimizer;
}

/**
 * Reset global cell update optimizer
 */
export function resetCellUpdateOptimizer(): void {
  if (globalOptimizer) {
    globalOptimizer.dispose();
    globalOptimizer = null;
  }
}

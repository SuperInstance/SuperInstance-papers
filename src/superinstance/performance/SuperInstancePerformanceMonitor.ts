/**
 * SuperInstance Performance Monitor
 *
 * Lightweight performance monitoring for SuperInstance system operations.
 * Tracks metrics for Cloudflare deployment optimization.
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  tags: Record<string, string>;
}

export interface PerformanceStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export class SuperInstancePerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;
  private enabled: boolean = true;

  // Singleton instance
  private static instance: SuperInstancePerformanceMonitor;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SuperInstancePerformanceMonitor {
    if (!SuperInstancePerformanceMonitor.instance) {
      SuperInstancePerformanceMonitor.instance = new SuperInstancePerformanceMonitor();
    }
    return SuperInstancePerformanceMonitor.instance;
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, unit: 'ms' | 'bytes' | 'count' | 'percentage', tags: Record<string, string> = {}): void {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);

    // Limit metrics array size
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Time an operation and record its duration
   */
  timeOperation<T>(name: string, operation: () => T, tags: Record<string, string> = {}): T {
    if (!this.enabled) {
      return operation();
    }

    const start = performance.now();
    try {
      const result = operation();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'ms', tags);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration, 'ms', { ...tags, error: 'true' });
      throw error;
    }
  }

  /**
   * Time an async operation and record its duration
   */
  async timeOperationAsync<T>(name: string, operation: () => Promise<T>, tags: Record<string, string> = {}): Promise<T> {
    if (!this.enabled) {
      return operation();
    }

    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'ms', tags);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration, 'ms', { ...tags, error: 'true' });
      throw error;
    }
  }

  /**
   * Get metrics by name and optional tag filters
   */
  getMetrics(name: string, tagFilters: Record<string, string> = {}, timeRange?: { start: number; end: number }): PerformanceMetric[] {
    return this.metrics.filter(metric => {
      if (metric.name !== name) return false;

      // Check tag filters
      for (const [key, value] of Object.entries(tagFilters)) {
        if (metric.tags[key] !== value) return false;
      }

      // Check time range
      if (timeRange) {
        if (metric.timestamp < timeRange.start || metric.timestamp > timeRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string, tagFilters: Record<string, string> = {}, timeRange?: { start: number; end: number }): PerformanceStats | null {
    const metrics = this.getMetrics(name, tagFilters, timeRange);
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const min = values[0];
    const max = values[values.length - 1];
    const avg = sum / count;
    const p50 = values[Math.floor(count * 0.5)];
    const p95 = values[Math.floor(count * 0.95)];
    const p99 = values[Math.floor(count * 0.99)];

    return { count, sum, min, max, avg, p50, p95, p99 };
  }

  /**
   * Get all metrics grouped by name
   */
  getAllMetrics(): Record<string, PerformanceMetric[]> {
    const grouped: Record<string, PerformanceMetric[]> = {};

    for (const metric of this.metrics) {
      if (!grouped[metric.name]) {
        grouped[metric.name] = [];
      }
      grouped[metric.name].push(metric);
    }

    return grouped;
  }

  /**
   * Get summary statistics for all metrics
   */
  getAllStats(): Record<string, PerformanceStats> {
    const grouped = this.getAllMetrics();
    const stats: Record<string, PerformanceStats> = {};

    for (const [name, metrics] of Object.entries(grouped)) {
      const values = metrics.map(m => m.value).sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const count = values.length;
      const min = values[0];
      const max = values[values.length - 1];
      const avg = sum / count;
      const p50 = values[Math.floor(count * 0.5)];
      const p95 = values[Math.floor(count * 0.95)];
      const p99 = values[Math.floor(count * 0.99)];

      stats[name] = { count, sum, min, max, avg, p50, p95, p99 };
    }

    return stats;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set maximum number of metrics to keep
   */
  setMaxMetrics(max: number): void {
    this.maxMetrics = max;
    if (this.metrics.length > max) {
      this.metrics = this.metrics.slice(-max);
    }
  }

  /**
   * Export metrics as JSON
   */
  export(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Import metrics from JSON
   */
  import(metrics: PerformanceMetric[]): void {
    this.metrics.push(...metrics);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get memory usage metrics
   */
  recordMemoryUsage(): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('memory_used', memory.usedJSHeapSize, 'bytes', { type: 'heap' });
      this.recordMetric('memory_total', memory.totalJSHeapSize, 'bytes', { type: 'heap' });
      this.recordMetric('memory_limit', memory.jsHeapSizeLimit, 'bytes', { type: 'heap' });
    }
  }

  /**
   * Record Cloudflare-specific metrics
   */
  recordCloudflareMetrics(): void {
    // Record CPU time if available (Cloudflare Workers)
    if (typeof performance !== 'undefined') {
      const marks = performance.getEntriesByType('mark');
      const measures = performance.getEntriesByType('measure');

      for (const measure of measures) {
        this.recordMetric(`cf_${measure.name}`, measure.duration, 'ms', { source: 'performance_api' });
      }
    }
  }
}

// Convenience functions
export const performanceMonitor = SuperInstancePerformanceMonitor.getInstance();

/**
 * Decorator for timing class methods
 */
export function timed(tags: Record<string, string> = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    if (typeof originalMethod === 'function') {
      descriptor.value = function (...args: any[]) {
        return performanceMonitor.timeOperation(
          `${target.constructor.name}.${propertyKey}`,
          () => originalMethod.apply(this, args),
          tags
        );
      };
    }

    return descriptor;
  };
}

/**
 * Decorator for timing async class methods
 */
export function timedAsync(tags: Record<string, string> = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    if (typeof originalMethod === 'function') {
      descriptor.value = async function (...args: any[]) {
        return performanceMonitor.timeOperationAsync(
          `${target.constructor.name}.${propertyKey}`,
          () => originalMethod.apply(this, args),
          tags
        );
      };
    }

    return descriptor;
  };
}
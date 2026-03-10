/**
 * POLLN Spreadsheet - Enhanced MetricsCollector
 *
 * Comprehensive metrics collection with tagging, filtering, and aggregation.
 * Extends the base MetricsCollector with advanced features.
 */

import {
  Metric,
  MetricStatistics,
  TimeRange,
  AlertThreshold,
  PerformanceAlert,
} from './types';

/**
 * Metrics storage bucket
 */
interface MetricBucket {
  name: string;
  samples: number[];
  tags?: Record<string, string>;
  timestamps: number[];
}

/**
 * Aggregated bucket statistics
 */
interface BucketAggregation {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  values: number[];
}

/**
 * Alert cooldown tracker
 */
interface AlertCooldown {
  metricName: string;
  threshold: AlertThreshold;
  lastAlert: number;
}

/**
 * Enhanced MetricsCollector with tagging, filtering, and alerting
 */
export class MetricsCollector {
  private buckets: Map<string, MetricBucket> = new Map();
  private alertCooldowns: Map<string, AlertCooldown> = new Map();
  private alertCallbacks: Set<(alert: PerformanceAlert) => void> = new Set();
  private maxSamplesPerBucket = 1000;
  private retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Record a metric with optional tags
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const bucketKey = this.getBucketKey(name, tags);

    if (!this.buckets.has(bucketKey)) {
      this.buckets.set(bucketKey, {
        name,
        samples: [],
        tags,
        timestamps: [],
      });
    }

    const bucket = this.buckets.get(bucketKey)!;
    bucket.samples.push(value);
    bucket.timestamps.push(Date.now());

    // Enforce max samples
    if (bucket.samples.length > this.maxSamplesPerBucket) {
      bucket.samples.shift();
      bucket.timestamps.shift();
    }

    // Check alerts
    this.checkAlerts(name, value, tags);
  }

  /**
   * Get all metrics, optionally filtered by time range
   */
  getMetrics(timeRange?: TimeRange): Metric[] {
    const metrics: Metric[] = [];

    for (const bucket of this.buckets.values()) {
      const startIndex = timeRange
        ? bucket.timestamps.findIndex((t) => t >= timeRange.start)
        : 0;
      const endIndex = timeRange
        ? bucket.timestamps.findIndex((t) => t > timeRange.end)
        : bucket.samples.length;

      const samplesToAdd = bucket.samples.slice(startIndex, endIndex);
      const timestampsToAdd = bucket.timestamps.slice(startIndex, endIndex);

      for (let i = 0; i < samplesToAdd.length; i++) {
        metrics.push({
          name: bucket.name,
          value: samplesToAdd[i],
          timestamp: timestampsToAdd[i],
          tags: bucket.tags,
        });
      }
    }

    return metrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get a specific metric by name, optionally with tags
   */
  getMetric(name: string, tags?: Record<string, string>): Metric | null {
    const bucketKey = this.getBucketKey(name, tags);
    const bucket = this.buckets.get(bucketKey);

    if (!bucket || bucket.samples.length === 0) {
      return null;
    }

    const lastIndex = bucket.samples.length - 1;
    return {
      name: bucket.name,
      value: bucket.samples[lastIndex],
      timestamp: bucket.timestamps[lastIndex],
      tags: bucket.tags,
    };
  }

  /**
   * Get statistics for a specific metric
   */
  getMetricStatistics(name: string, tags?: Record<string, string>): MetricStatistics | null {
    const bucketKey = this.getBucketKey(name, tags);
    const bucket = this.buckets.get(bucketKey);

    if (!bucket || bucket.samples.length === 0) {
      return null;
    }

    return this.calculateStatistics(bucket.name, bucket.samples);
  }

  /**
   * Get all metric statistics
   */
  getAllStatistics(): MetricStatistics[] {
    const stats: MetricStatistics[] = [];

    for (const bucket of this.buckets.values()) {
      if (bucket.samples.length > 0) {
        stats.push(this.calculateStatistics(bucket.name, bucket.samples));
      }
    }

    return stats;
  }

  /**
   * Calculate statistics from samples
   */
  private calculateStatistics(name: string, samples: number[]): MetricStatistics {
    if (samples.length === 0) {
      throw new Error('Cannot calculate statistics from empty samples');
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / sorted.length;

    return {
      name,
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      median: sorted[Math.floor(sorted.length / 2)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev: Math.sqrt(variance),
    };
  }

  /**
   * Query metrics by tags
   */
  queryByTags(tagFilters: Record<string, string>): Metric[] {
    const results: Metric[] = [];

    for (const bucket of this.buckets.values()) {
      if (this.matchTags(bucket.tags, tagFilters)) {
        for (let i = 0; i < bucket.samples.length; i++) {
          results.push({
            name: bucket.name,
            value: bucket.samples[i],
            timestamp: bucket.timestamps[i],
            tags: bucket.tags,
          });
        }
      }
    }

    return results;
  }

  /**
   * Check if tags match filters
   */
  private matchTags(tags?: Record<string, string>, filters?: Record<string, string>): boolean {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    if (!tags) {
      return false;
    }

    for (const [key, value] of Object.entries(filters)) {
      if (tags[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get bucket key with tags
   */
  private getBucketKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }

    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    return `${name}?${tagString}`;
  }

  /**
   * Set up alert threshold
   */
  setupAlert(threshold: AlertThreshold): void {
    const cooldownKey = `${threshold.metricName}_${threshold.operator}_${threshold.threshold}`;
    this.alertCooldowns.set(cooldownKey, {
      metricName: threshold.metricName,
      threshold,
      lastAlert: 0,
    });
  }

  /**
   * Check if any alerts should fire
   */
  private checkAlerts(name: string, value: number, tags?: Record<string, string>): void {
    for (const [cooldownKey, cooldown] of this.alertCooldowns.entries()) {
      if (cooldown.metricName !== name) {
        continue;
      }

      // Check cooldown
      if (cooldown.threshold.cooldown) {
        const timeSinceLastAlert = Date.now() - cooldown.lastAlert;
        if (timeSinceLastAlert < cooldown.threshold.cooldown) {
          continue;
        }
      }

      // Check threshold
      let shouldAlert = false;
      switch (cooldown.threshold.operator) {
        case '>':
          shouldAlert = value > cooldown.threshold.threshold;
          break;
        case '<':
          shouldAlert = value < cooldown.threshold.threshold;
          break;
        case '>=':
          shouldAlert = value >= cooldown.threshold.threshold;
          break;
        case '<=':
          shouldAlert = value <= cooldown.threshold.threshold;
          break;
        case '==':
          shouldAlert = value === cooldown.threshold.threshold;
          break;
      }

      if (shouldAlert) {
        this.fireAlert(cooldown.threshold, value, tags);
        cooldown.lastAlert = Date.now();
      }
    }
  }

  /**
   * Fire an alert
   */
  private fireAlert(threshold: AlertThreshold, value: number, tags?: Record<string, string>): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      severity: threshold.severity,
      type: 'threshold',
      metric: threshold.metricName,
      currentValue: value,
      threshold: threshold.threshold,
      message: `Metric "${threshold.metricName}" is ${threshold.operator} ${threshold.threshold} (current: ${value})`,
      resolved: false,
    };

    // Notify all callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    }
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.add(callback);
    return () => {
      this.alertCallbacks.delete(callback);
    };
  }

  /**
   * Aggregate metrics by time interval
   */
  aggregateByInterval(
    name: string,
    intervalMs: number,
    tags?: Record<string, string>,
    timeRange?: TimeRange
  ): Metric[] {
    const metrics = this.getMetrics(timeRange).filter(
      (m) => m.name === name && this.matchTags(m.tags, tags)
    );

    if (metrics.length === 0) {
      return [];
    }

    const aggregated = new Map<number, number[]>();

    for (const metric of metrics) {
      const bucketTime = Math.floor(metric.timestamp / intervalMs) * intervalMs;
      if (!aggregated.has(bucketTime)) {
        aggregated.set(bucketTime, []);
      }
      aggregated.get(bucketTime)!.push(metric.value);
    }

    const result: Metric[] = [];
    for (const [timestamp, values] of aggregated.entries()) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      result.push({
        name,
        value: avg,
        timestamp,
        tags,
      });
    }

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get percentiles for a metric
   */
  getPercentiles(name: string, percentiles: number[], tags?: Record<string, string>): Record<number, number> {
    const bucketKey = this.getBucketKey(name, tags);
    const bucket = this.buckets.get(bucketKey);

    if (!bucket || bucket.samples.length === 0) {
      return {};
    }

    const sorted = [...bucket.samples].sort((a, b) => a - b);
    const result: Record<number, number> = {};

    for (const p of percentiles) {
      const index = Math.floor(sorted.length * (p / 100));
      result[p] = sorted[Math.min(index, sorted.length - 1)];
    }

    return result;
  }

  /**
   * Get metric rate (change per time unit)
   */
  getRate(name: string, timeWindowMs: number, tags?: Record<string, string>): number {
    const now = Date.now();
    const timeRange: TimeRange = {
      start: now - timeWindowMs,
      end: now,
    };

    const metrics = this.getMetrics(timeRange).filter(
      (m) => m.name === name && this.matchTags(m.tags, tags)
    );

    if (metrics.length < 2) {
      return 0;
    }

    const oldest = metrics[0];
    const newest = metrics[metrics.length - 1];
    const timeDelta = newest.timestamp - oldest.timestamp;

    if (timeDelta === 0) {
      return 0;
    }

    return (newest.value - oldest.value) / (timeDelta / 1000);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.buckets.clear();
    this.alertCooldowns.clear();
  }

  /**
   * Reset specific metric
   */
  resetMetric(name: string, tags?: Record<string, string>): void {
    const bucketKey = this.getBucketKey(name, tags);
    this.buckets.delete(bucketKey);
  }

  /**
   * Get bucket count
   */
  getBucketCount(): number {
    return this.buckets.size;
  }

  /**
   * Get total sample count
   */
  getTotalSampleCount(): number {
    let count = 0;
    for (const bucket of this.buckets.values()) {
      count += bucket.samples.length;
    }
    return count;
  }

  /**
   * Clean up old samples based on retention period
   */
  cleanup(): void {
    const cutoff = Date.now() - this.retentionPeriod;

    for (const [key, bucket] of this.buckets.entries()) {
      const keepFrom = bucket.timestamps.findIndex((t) => t > cutoff);

      if (keepFrom === -1) {
        // All samples are old, delete the bucket
        this.buckets.delete(key);
      } else if (keepFrom > 0) {
        // Remove old samples
        bucket.samples = bucket.samples.slice(keepFrom);
        bucket.timestamps = bucket.timestamps.slice(keepFrom);
      }
    }
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    const data = {
      buckets: Array.from(this.buckets.entries()).map(([key, bucket]) => ({
        key,
        name: bucket.name,
        samples: bucket.samples,
        tags: bucket.tags,
        timestamps: bucket.timestamps,
      })),
      alertCooldowns: Array.from(this.alertCooldowns.entries()),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import metrics from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);

      this.buckets.clear();
      for (const bucketData of data.buckets) {
        this.buckets.set(bucketData.key, {
          name: bucketData.name,
          samples: bucketData.samples,
          tags: bucketData.tags,
          timestamps: bucketData.timestamps,
        });
      }

      this.alertCooldowns = new Map(data.alertCooldowns);
    } catch (error) {
      throw new Error(`Failed to import metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Utility class for timing operations with automatic metric recording
 */
export class OperationTimer {
  private collector: MetricsCollector;
  private operationName: string;
  private startTime: number;
  private tags?: Record<string, string>;

  constructor(collector: MetricsCollector, operationName: string, tags?: Record<string, string>) {
    this.collector = collector;
    this.operationName = operationName;
    this.tags = tags;
    this.startTime = performance.now();
  }

  /**
   * End timing and record metric
   */
  end(): number {
    const duration = performance.now() - this.startTime;
    this.collector.recordMetric(this.operationName, duration, this.tags);
    return duration;
  }

  /**
   * End timing with custom value
   */
  endWithValue(value: number): void {
    this.collector.recordMetric(this.operationName, value, this.tags);
  }

  /**
   * Get elapsed time without ending the timer
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * Utility function to time an operation
 */
export function timeOperation<T>(
  collector: MetricsCollector,
  operationName: string,
  operation: () => T,
  tags?: Record<string, string>
): T {
  const timer = new OperationTimer(collector, operationName, tags);
  try {
    const result = operation();
    timer.end();
    return result;
  } catch (error) {
    timer.end();
    throw error;
  }
}

/**
 * Utility function to time an async operation
 */
export async function timeOperationAsync<T>(
  collector: MetricsCollector,
  operationName: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const timer = new OperationTimer(collector, operationName, tags);
  try {
    const result = await operation();
    timer.end();
    return result;
  } catch (error) {
    timer.end();
    throw error;
  }
}

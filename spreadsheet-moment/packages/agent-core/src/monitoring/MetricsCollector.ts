/**
 * MetricsCollector - Production Metrics Collection System
 *
 * Comprehensive metrics collection for Claw API operations including:
 * - Request/response metrics
 * - WebSocket connection metrics
 * - Error tracking
 * - Performance monitoring
 * - Custom business metrics
 *
 * @packageDocumentation
 * @version 1.0.0 - Week 4: Production Deployment
 */

import { EventEmitter } from 'events';

// ============================================================================
// METRIC TYPES
// ============================================================================

/**
 * Metric types supported by the collector
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

/**
 * Metric category for organization
 */
export enum MetricCategory {
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  BUSINESS = 'business',
  SYSTEM = 'system'
}

/**
 * Base metric interface
 */
export interface Metric {
  name: string;
  type: MetricType;
  category: MetricCategory;
  description: string;
  labels?: Record<string, string>;
  timestamp: number;
}

/**
 * Counter metric (monotonically increasing)
 */
export interface CounterMetric extends Metric {
  type: MetricType.COUNTER;
  value: number;
}

/**
 * Gauge metric (can go up or down)
 */
export interface GaugeMetric extends Metric {
  type: MetricType.GAUGE;
  value: number;
}

/**
 * Histogram metric (distribution of values)
 */
export interface HistogramMetric extends Metric {
  type: MetricType.HISTOGRAM;
  value: number;
  buckets?: number[];
}

/**
 * Summary metric (statistical summary)
 */
export interface SummaryMetric extends Metric {
  type: MetricType.SUMMARY;
  count: number;
  sum: number;
  avg: number;
  min?: number;
  max?: number;
  p50?: number;
  p95?: number;
  p99?: number;
}

// ============================================================================
// METRICS STORAGE
// ============================================================================

/**
 * Metric storage interface
 */
interface MetricStorage {
  push(metric: Metric): void;
  get(category?: MetricCategory, since?: number): Metric[];
  clear(category?: MetricCategory): void;
  getStats(): StorageStats;
}

/**
 * Storage statistics
 */
interface StorageStats {
  totalMetrics: number;
  metricsByCategory: Record<MetricCategory, number>;
  oldestMetric?: number;
  newestMetric?: number;
}

/**
 * In-memory metric storage with rotation
 */
class InMemoryMetricStorage implements MetricStorage {
  private metrics: Map<string, Metric[]> = new Map();
  private maxMetricsPerCategory: number = 10000;
  private maxAge: number = 24 * 60 * 60 * 1000; // 24 hours

  push(metric: Metric): void {
    const categoryKey = metric.category;
    let categoryMetrics = this.metrics.get(categoryKey) || [];

    // Add new metric
    categoryMetrics.push(metric);

    // Rotate old metrics
    const now = Date.now();
    categoryMetrics = categoryMetrics.filter(m => m.timestamp > now - this.maxAge);

    // Limit size
    if (categoryMetrics.length > this.maxMetricsPerCategory) {
      categoryMetrics = categoryMetrics.slice(-this.maxMetricsPerCategory);
    }

    this.metrics.set(categoryKey, categoryMetrics);
  }

  get(category?: MetricCategory, since?: number): Metric[] {
    if (category) {
      const categoryMetrics = this.metrics.get(category) || [];
      return since
        ? categoryMetrics.filter(m => m.timestamp >= since)
        : categoryMetrics;
    }

    // Return all metrics
    let allMetrics: Metric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics = allMetrics.concat(metrics);
    }

    return since
      ? allMetrics.filter(m => m.timestamp >= since)
      : allMetrics;
  }

  clear(category?: MetricCategory): void {
    if (category) {
      this.metrics.delete(category);
    } else {
      this.metrics.clear();
    }
  }

  getStats(): StorageStats {
    let totalMetrics = 0;
    const metricsByCategory: Record<MetricCategory, number> = {
      [MetricCategory.HTTP]: 0,
      [MetricCategory.WEBSOCKET]: 0,
      [MetricCategory.ERROR]: 0,
      [MetricCategory.PERFORMANCE]: 0,
      [MetricCategory.BUSINESS]: 0,
      [MetricCategory.SYSTEM]: 0
    };

    let oldestMetric: number | undefined;
    let newestMetric: number | undefined;

    for (const [category, metrics] of this.metrics.entries()) {
      metricsByCategory[category as MetricCategory] = metrics.length;
      totalMetrics += metrics.length;

      for (const metric of metrics) {
        if (!oldestMetric || metric.timestamp < oldestMetric) {
          oldestMetric = metric.timestamp;
        }
        if (!newestMetric || metric.timestamp > newestMetric) {
          newestMetric = metric.timestamp;
        }
      }
    }

    return {
      totalMetrics,
      metricsByCategory,
      oldestMetric,
      newestMetric
    };
  }
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

/**
 * MetricsCollector configuration
 */
export interface MetricsCollectorConfig {
  /** Storage implementation (default: in-memory) */
  storage?: MetricStorage;

  /** Enable debug logging */
  debug?: boolean;

  /** Custom tags to add to all metrics */
  globalTags?: Record<string, string>;

  /** Sampling rate (0-1, default: 1) */
  samplingRate?: number;
}

/**
 * MetricsCollector - Production metrics collection
 *
 * Collects and aggregates metrics for:
 * - HTTP requests (latency, success rate, error rate)
 * - WebSocket connections (connection count, message rate)
 * - Errors (error count by type, error rate)
 * - Performance (operation latencies, throughput)
 * - Business metrics (claw creation rate, trigger rate)
 *
 * Usage:
 * ```typescript
 * const collector = new MetricsCollector({
 *   debug: true,
 *   globalTags: { environment: 'production' }
 * });
 *
 * // Record HTTP request
 * collector.recordHttpRequest('POST', '/api/claws', 200, 150);
 *
 * // Record WebSocket message
 * collector.recordWebSocketMessage('reasoningStep', 25);
 *
 * // Record error
 * collector.recordError('validation_error', 'Invalid request');
 *
 * // Get metrics
 * const httpMetrics = collector.getMetrics(MetricCategory.HTTP);
 * ```
 */
export class MetricsCollector extends EventEmitter {
  private config: Required<MetricsCollectorConfig>;
  private storage: MetricStorage;
  private histograms: Map<string, number[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private alertThresholds: Map<string, { type: MetricType; threshold: number }> = new Map();
  private metrics: Map<string, Metric> = new Map();

  // Pre-computed histogram buckets (in milliseconds)
  private readonly latencyBuckets = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

  constructor(config: MetricsCollectorConfig = {}) {
    super();

    this.config = {
      storage: config.storage || new InMemoryMetricStorage(),
      debug: config.debug || false,
      globalTags: config.globalTags || {},
      samplingRate: config.samplingRate || 1.0
    };

    this.storage = this.config.storage;

    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  // ========================================================================
  // HTTP METRICS
  // ========================================================================

  /**
   * Record HTTP request metric
   */
  recordHttpRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    latencyMs: number,
    labels?: Record<string, string>
  ): void {
    if (!this.shouldSample()) {
      return;
    }

    const metric: CounterMetric = {
      name: 'http_requests_total',
      type: MetricType.COUNTER,
      category: MetricCategory.HTTP,
      description: 'Total HTTP requests',
      labels: {
        ...this.config.globalTags,
        ...labels,
        method,
        endpoint,
        status: statusCode.toString()
      },
      timestamp: Date.now(),
      value: 1
    };

    this.recordMetric(metric);
    this.recordLatencyHistogram('http_request_duration_ms', latencyMs, MetricCategory.HTTP, {
      method,
      endpoint,
      status: statusCode.toString()
    });

    this.debugLog(`HTTP request: ${method} ${endpoint} - ${statusCode} (${latencyMs}ms)`);
  }

  /**
   * Record HTTP error
   */
  recordHttpError(
    method: string,
    endpoint: string,
    error: string,
    statusCode?: number,
    labels?: Record<string, string>
  ): void {
    if (!this.shouldSample()) {
      return;
    }

    const metric: CounterMetric = {
      name: 'http_errors_total',
      type: MetricType.COUNTER,
      category: MetricCategory.ERROR,
      description: 'Total HTTP errors',
      labels: {
        ...this.config.globalTags,
        ...labels,
        method,
        endpoint,
        error,
        status: statusCode?.toString() || 'none'
      },
      timestamp: Date.now(),
      value: 1
    };

    this.recordMetric(metric);
    this.debugLog(`HTTP error: ${method} ${endpoint} - ${error}`);
  }

  // ========================================================================
  // WEBSOCKET METRICS
  // ========================================================================

  /**
   * Record WebSocket connection
   */
  recordWebSocketConnection(labels?: Record<string, string>): void {
    if (!this.shouldSample()) {
      return;
    }

    const counterMetric: CounterMetric = {
      name: 'websocket_connections_total',
      type: MetricType.COUNTER,
      category: MetricCategory.WEBSOCKET,
      description: 'Total WebSocket connections',
      labels: {
        ...this.config.globalTags,
        ...labels
      },
      timestamp: Date.now(),
      value: 1
    };

    const gaugeMetric: GaugeMetric = {
      name: 'websocket_connections_active',
      type: MetricType.GAUGE,
      category: MetricCategory.WEBSOCKET,
      description: 'Active WebSocket connections',
      labels: {
        ...this.config.globalTags,
        ...labels
      },
      timestamp: Date.now(),
      value: 1
    };

    this.recordMetric(counterMetric);
    this.recordMetric(gaugeMetric);
    this.debugLog('WebSocket connection established');
  }

  /**
   * Record WebSocket disconnection
   */
  recordWebSocketDisconnection(reason: string, labels?: Record<string, string>): void {
    if (!this.shouldSample()) {
      return;
    }

    const counterMetric: CounterMetric = {
      name: 'websocket_disconnections_total',
      type: MetricType.COUNTER,
      category: MetricCategory.WEBSOCKET,
      description: 'Total WebSocket disconnections',
      labels: {
        ...this.config.globalTags,
        ...labels,
        reason
      },
      timestamp: Date.now(),
      value: 1
    };

    const gaugeMetric: GaugeMetric = {
      name: 'websocket_connections_active',
      type: MetricType.GAUGE,
      category: MetricCategory.WEBSOCKET,
      description: 'Active WebSocket connections',
      labels: {
        ...this.config.globalTags,
        ...labels
      },
      timestamp: Date.now(),
      value: -1
    };

    this.recordMetric(counterMetric);
    this.recordMetric(gaugeMetric);
    this.debugLog(`WebSocket disconnection: ${reason}`);
  }

  /**
   * Record WebSocket message
   */
  recordWebSocketMessage(
    messageType: string,
    latencyMs: number,
    labels?: Record<string, string>
  ): void {
    if (!this.shouldSample()) {
      return;
    }

    const counterMetric: CounterMetric = {
      name: 'websocket_messages_total',
      type: MetricType.COUNTER,
      category: MetricCategory.WEBSOCKET,
      description: 'Total WebSocket messages',
      labels: {
        ...this.config.globalTags,
        ...labels,
        message_type: messageType
      },
      timestamp: Date.now(),
      value: 1
    };

    this.recordMetric(counterMetric);
    this.recordLatencyHistogram('websocket_message_duration_ms', latencyMs, MetricCategory.WEBSOCKET, {
      message_type: messageType
    });

    this.debugLog(`WebSocket message: ${messageType} (${latencyMs}ms)`);
  }

  // ========================================================================
  // ERROR METRICS
  // ========================================================================

  /**
   * Record error
   */
  recordError(
    errorType: string,
    errorMessage: string,
    labels?: Record<string, string>
  ): void {
    if (!this.shouldSample()) {
      return;
    }

    const metric: CounterMetric = {
      name: 'errors_total',
      type: MetricType.COUNTER,
      category: MetricCategory.ERROR,
      description: 'Total errors',
      labels: {
        ...this.config.globalTags,
        ...labels,
        error_type: errorType
      },
      timestamp: Date.now(),
      value: 1
    };

    this.recordMetric(metric);
    this.debugLog(`Error: ${errorType} - ${errorMessage}`);
  }

  // ========================================================================
  // BUSINESS METRICS
  // ========================================================================

  /**
   * Record claw creation
   */
  recordClawCreation(labels?: Record<string, string>): void {
    if (!this.shouldSample()) {
      return;
    }

    const metric: CounterMetric = {
      name: 'claw_creations_total',
      type: MetricType.COUNTER,
      category: MetricCategory.BUSINESS,
      description: 'Total claw creations',
      labels: {
        ...this.config.globalTags,
        ...labels
      },
      timestamp: Date.now(),
      value: 1
    };

    this.recordMetric(metric);
    this.debugLog('Claw created');
  }

  /**
   * Record claw trigger
   */
  recordClawTrigger(labels?: Record<string, string>): void {
    if (!this.shouldSample()) {
      return;
    }

    const metric: CounterMetric = {
      name: 'claw_triggers_total',
      type: MetricType.COUNTER,
      category: MetricCategory.BUSINESS,
      description: 'Total claw triggers',
      labels: {
        ...this.config.globalTags,
        ...labels
      },
      timestamp: Date.now(),
      value: 1
    };

    this.recordMetric(metric);
    this.debugLog('Claw triggered');
  }

  /**
   * Record claw completion
   */
  recordClawCompletion(
    success: boolean,
    durationMs: number,
    labels?: Record<string, string>
  ): void {
    if (!this.shouldSample()) {
      return;
    }

    const metric: CounterMetric = {
      name: 'claw_completions_total',
      type: MetricType.COUNTER,
      category: MetricCategory.BUSINESS,
      description: 'Total claw completions',
      labels: {
        ...this.config.globalTags,
        ...labels,
        success: success.toString()
      },
      timestamp: Date.now(),
      value: 1
    };

    this.recordMetric(metric);
    this.recordLatencyHistogram('claw_execution_duration_ms', durationMs, MetricCategory.BUSINESS, {
      success: success.toString()
    });

    this.debugLog(`Claw completed: ${success} (${durationMs}ms)`);
  }

  // ========================================================================
  // PERFORMANCE METRICS
  // ========================================================================

  /**
   * Record operation duration
   */
  recordOperationDuration(
    operation: string,
    durationMs: number,
    labels?: Record<string, string>
  ): void {
    if (!this.shouldSample()) {
      return;
    }

    this.recordLatencyHistogram('operation_duration_ms', durationMs, MetricCategory.PERFORMANCE, {
      operation,
      ...labels
    });

    this.debugLog(`Operation: ${operation} (${durationMs}ms)`);
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const heapUsed = usage.heapUsed;
      const heapTotal = usage.heapTotal;

      const metric: GaugeMetric = {
        name: 'memory_usage_bytes',
        type: MetricType.GAUGE,
        category: MetricCategory.SYSTEM,
        description: 'Memory usage in bytes',
        labels: {
          ...this.config.globalTags,
          type: 'heap_used'
        },
        timestamp: Date.now(),
        value: heapUsed
      };

      this.recordMetric(metric);
    }
  }

  // ========================================================================
  // HISTOGRAM HELPERS
  // ========================================================================

  /**
   * Record latency histogram
   */
  private recordLatencyHistogram(
    name: string,
    value: number,
    category: MetricCategory,
    labels?: Record<string, string>
  ): void {
    const key = JSON.stringify({ name, category, labels });
    const values = this.histograms.get(key) || [];
    values.push(value);

    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }

    this.histograms.set(key, values);

    // Calculate histogram buckets
    const buckets = this.calculateBuckets(values, this.latencyBuckets);

    const metric: HistogramMetric = {
      name,
      type: MetricType.HISTOGRAM,
      category,
      description: `${name} distribution`,
      labels: {
        ...this.config.globalTags,
        ...labels
      },
      timestamp: Date.now(),
      value,
      buckets
    };

    this.recordMetric(metric);
  }

  /**
   * Calculate histogram buckets
   */
  private calculateBuckets(values: number[], buckets: number[]): number[] {
    const counts = new Array(buckets.length + 1).fill(0);

    for (const value of values) {
      let bucketIndex = buckets.length;
      for (let i = 0; i < buckets.length; i++) {
        if (value <= buckets[i]) {
          bucketIndex = i;
          break;
        }
      }
      counts[bucketIndex]++;
    }

    return counts;
  }

  // ========================================================================
  // METRIC QUERY & EXPORT
  // ========================================================================

  /**
   * Get metrics by category
   */
  getMetrics(category?: MetricCategory, since?: number): Metric[] {
    return this.storage.get(category, since);
  }

  /**
   * Get metric statistics
   */
  getStats(): StorageStats {
    return this.storage.getStats();
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];

    // Group metrics by name
    const grouped = new Map<string, Metric[]>();
    for (const metric of metrics) {
      const group = grouped.get(metric.name) || [];
      group.push(metric);
      grouped.set(metric.name, group);
    }

    // Format each metric
    for (const [name, metricGroup] of grouped.entries()) {
      const first = metricGroup[0];

      // Add HELP and TYPE
      lines.push(`# HELP ${name} ${first.description}`);
      lines.push(`# TYPE ${name} ${first.type}`);

      // Add metric values
      for (const metric of metricGroup) {
        const labels = metric.labels
          ? '{' + Object.entries(metric.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',') + '}'
          : '';

        if (metric.type === MetricType.COUNTER || metric.type === MetricType.GAUGE) {
          lines.push(`${name}${labels} ${(metric as CounterMetric | GaugeMetric).value} ${metric.timestamp}`);
        }
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): string {
    const metrics = this.getMetrics();
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Clear all metrics
   */
  clear(category?: MetricCategory): void {
    this.storage.clear(category);
    if (!category) {
      this.histograms.clear();
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Record a metric
   */
  private recordMetric(metric: Metric): void {
    this.storage.push(metric);
    this.emit('metric', metric);
  }

  /**
   * Check if should sample based on sampling rate
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  /**
   * Debug logging
   */
  private debugLog(message: string): void {
    if (this.config.debug) {
      console.log(`[MetricsCollector] ${message}`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      // Trim histograms
      for (const [key, values] of this.histograms.entries()) {
        if (values.length > 1000) {
          this.histograms.set(key, values.slice(-1000));
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Dispose of collector
   */
  dispose(): void {
    this.clear();
    this.removeAllListeners();
  }

  // ========================================================================
  // SIMPLE COUNTER & GAUGE METHODS (for mutation tests)
  // ========================================================================

  /**
   * Record a counter value (adds to existing)
   */
  recordCounter(name: string, value: number, labels?: Record<string, string>): void {
    // Create a unique key based on name and labels
    const key = JSON.stringify({ name, labels });
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    const metric: CounterMetric = {
      name,
      type: MetricType.COUNTER,
      category: MetricCategory.BUSINESS,
      description: `Counter: ${name}`,
      labels: {
        ...this.config.globalTags,
        ...labels
      },
      timestamp: Date.now(),
      value: current + value
    };

    this.metrics.set(key, metric);
    this.recordMetric(metric);
  }

  /**
   * Record a gauge value (sets to value)
   */
  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.gauges.set(name, value);

    const metric: GaugeMetric = {
      name,
      type: MetricType.GAUGE,
      category: MetricCategory.BUSINESS,
      description: `Gauge: ${name}`,
      labels: {
        ...this.config.globalTags,
        ...labels
      },
      timestamp: Date.now(),
      value
    };

    this.metrics.set(name, metric);
    this.recordMetric(metric);

    // Check alert threshold
    const threshold = this.alertThresholds.get(name);
    if (threshold && threshold.type === MetricType.GAUGE && value > threshold.threshold) {
      this.emit('alert', { name, value, threshold: threshold.threshold });
    }
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = JSON.stringify({ name, labels });
    const values = this.histograms.get(key) || [];
    values.push(value);

    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }

    this.histograms.set(key, values);

    const metric: HistogramMetric = {
      name,
      type: MetricType.HISTOGRAM,
      category: MetricCategory.BUSINESS,
      description: `Histogram: ${name}`,
      labels: {
        ...this.config.globalTags,
        ...labels
      },
      timestamp: Date.now(),
      value
    };

    this.recordMetric(metric);
  }

  /**
   * Get counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const key = JSON.stringify({ name, labels });
    return this.counters.get(key) || 0;
  }

  /**
   * Get gauge value
   */
  getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }

  /**
   * Get histogram stats
   */
  getHistogramStats(name: string, labels?: Record<string, string>): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  } {
    const key = JSON.stringify({ name, labels });
    const values = this.histograms.get(key) || [];

    if (values.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: values.length,
      sum,
      avg: sum / values.length,
      min,
      max
    };
  }

  /**
   * Get all counters
   */
  getAllCounters(): Array<{ name: string; value: number }> {
    return Array.from(this.counters.entries()).map(([name, value]) => ({ name, value }));
  }

  /**
   * Check if metric exists
   */
  hasMetric(name: string): boolean {
    return this.metrics.has(name) || this.counters.has(name) || this.gauges.has(name);
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get counter by tags
   */
  getCounterByTags(tags: Record<string, string>): number {
    let sum = 0;
    for (const [key, metric] of this.metrics.entries()) {
      if (metric.type === MetricType.COUNTER && metric.labels) {
        const matches = Object.entries(tags).every(([key, value]) => metric.labels![key] === value);
        if (matches) {
          sum += this.counters.get(key) || 0;
        }
      }
    }
    return sum;
  }

  /**
   * Get counter in time window
   */
  getCounterInTimeWindow(name: string, windowMs: number, labels?: Record<string, string>): number {
    const key = JSON.stringify({ name, labels });
    const metric = this.metrics.get(key);
    if (!metric) return 0;

    const now = Date.now();
    if (metric.timestamp >= now - windowMs) {
      return this.counters.get(key) || 0;
    }
    return 0;
  }

  /**
   * Set alert threshold
   */
  setAlertThreshold(name: string, type: MetricType, threshold: number): void {
    this.alertThresholds.set(name, { type, threshold });
  }

  /**
   * Get alerts
   */
  getAlerts(): Array<{ name: string; value: number; threshold: number }> {
    const alerts: Array<{ name: string; value: number; threshold: number }> = [];

    for (const [name, threshold] of this.alertThresholds.entries()) {
      const value = this.gauges.get(name);
      if (value !== undefined && value > threshold.threshold) {
        alerts.push({ name, value, threshold: threshold.threshold });
      }
    }

    return alerts;
  }

  /**
   * Reset all counters and gauges
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.metrics.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalCollector: MetricsCollector | null = null;

/**
 * Get or create global metrics collector
 */
export function getMetricsCollector(config?: MetricsCollectorConfig): MetricsCollector {
  if (!globalCollector) {
    globalCollector = new MetricsCollector(config);
  }
  return globalCollector;
}

/**
 * Reset global metrics collector
 */
export function resetMetricsCollector(): void {
  if (globalCollector) {
    globalCollector.dispose();
    globalCollector = null;
  }
}

export default MetricsCollector;

/**
 * Queue Metrics - Comprehensive Queue Monitoring
 *
 * Provides real-time monitoring and metrics for all queue operations.
 * Tracks throughput, latency, queue depth, error rates, and consumer lag.
 *
 * Features:
 * - Message throughput tracking
 * - Latency measurements (p50, p95, p99)
 * - Queue depth monitoring
 * - Error rate tracking
 * - Consumer lag monitoring
 * - Real-time metrics aggregation
 * - Historical data retention
 * - Alert generation
 */

import { Logger } from '../../../io/Logger.js';

/**
 * Metric data point
 */
export interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

/**
 * Throughput metrics
 */
export interface ThroughputMetrics {
  messagesPerSecond: number;
  peakMessagesPerSecond: number;
  totalMessages: number;
  windowStart: number;
}

/**
 * Latency metrics
 */
export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  samples: number;
}

/**
 * Queue depth metrics
 */
export interface QueueDepthMetrics {
  currentDepth: number;
  maxDepth: number;
  avgDepth: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Error metrics
 */
export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByType: Map<string, number>;
  recentErrors: MetricPoint[];
}

/**
 * Consumer lag metrics
 */
export interface ConsumerLagMetrics {
  currentLag: number;
  maxLag: number;
  avgLag: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  throughputThreshold?: number;
  latencyThreshold?: number;
  errorRateThreshold?: number;
  lagThreshold?: number;
  depthThreshold?: number;
}

/**
 * Alert information
 */
export interface Alert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
}

/**
 * Overall queue health status
 */
export interface QueueHealth {
  healthy: boolean;
  score: number; // 0-100
  issues: string[];
  alerts: Alert[];
}

/**
 * Queue Metrics class
 */
export class QueueMetrics {
  private throughputHistory: MetricPoint[];
  private latencyHistory: MetricPoint[];
  private depthHistory: MetricPoint[];
  private errorHistory: MetricPoint[];
  private lagHistory: MetricPoint[];
  private alertConfigs: Map<string, AlertConfig>;
  private alerts: Alert[];
  private maxHistorySize: number;
  private aggregationWindow: number;
  private stats: {
    totalMessages: number;
    totalErrors: number;
    startTime: number;
  };
  private logger: Logger;
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute

  constructor() {
    this.throughputHistory = [];
    this.latencyHistory = [];
    this.depthHistory = [];
    this.errorHistory = [];
    this.lagHistory = [];
    this.alertConfigs = new Map();
    this.alerts = [];
    this.maxHistorySize = 1000;
    this.aggregationWindow = 10000; // 10 seconds
    this.stats = {
      totalMessages: 0,
      totalErrors: 0,
      startTime: Date.now(),
    };
    this.logger = Logger.getInstance().child({ component: 'QueueMetrics' });

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Record a message processed
   */
  public recordMessage(labels?: Record<string, string>): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      value: 1,
      labels,
    };

    this.throughputHistory.push(point);
    this.stats.totalMessages++;

    this.checkAlerts('throughput', this.getCurrentThroughput());
  }

  /**
   * Record messages processed in batch
   */
  public recordMessages(count: number, labels?: Record<string, string>): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      value: count,
      labels,
    };

    this.throughputHistory.push(point);
    this.stats.totalMessages += count;

    this.checkAlerts('throughput', this.getCurrentThroughput());
  }

  /**
   * Record latency measurement
   */
  public recordLatency(latency: number, labels?: Record<string, string>): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      value: latency,
      labels,
    };

    this.latencyHistory.push(point);

    this.checkAlerts('latency', this.getCurrentLatency().p99);
  }

  /**
   * Record queue depth
   */
  public recordDepth(depth: number, labels?: Record<string, string>): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      value: depth,
      labels,
    };

    this.depthHistory.push(point);

    this.checkAlerts('depth', depth);
  }

  /**
   * Record error
   */
  public recordError(errorType: string, labels?: Record<string, string>): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      value: 1,
      labels: { ...labels, errorType },
    };

    this.errorHistory.push(point);
    this.stats.totalErrors++;

    this.checkAlerts('errorRate', this.getCurrentErrorRate());
  }

  /**
   * Record consumer lag
   */
  public recordLag(lag: number, labels?: Record<string, string>): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      value: lag,
      labels,
    };

    this.lagHistory.push(point);

    this.checkAlerts('lag', lag);
  }

  /**
   * Get current throughput (messages per second)
   */
  public getCurrentThroughput(): number {
    const now = Date.now();
    const windowStart = now - this.aggregationWindow;

    const recentMessages = this.throughputHistory.filter((p) => p.timestamp >= windowStart);
    const totalCount = recentMessages.reduce((sum, p) => sum + p.value, 0);

    return totalCount / (this.aggregationWindow / 1000);
  }

  /**
   * Get throughput metrics
   */
  public getThroughputMetrics(): ThroughputMetrics {
    const now = Date.now();
    const windowStart = now - this.aggregationWindow;

    const recentMessages = this.throughputHistory.filter((p) => p.timestamp >= windowStart);
    const totalCount = recentMessages.reduce((sum, p) => sum + p.value, 0);
    const messagesPerSecond = totalCount / (this.aggregationWindow / 1000);

    // Calculate peak
    const peakMessagesPerSecond = this.calculatePeakThroughput();

    return {
      messagesPerSecond,
      peakMessagesPerSecond,
      totalMessages: this.stats.totalMessages,
      windowStart,
    };
  }

  /**
   * Calculate peak throughput
   */
  private calculatePeakThroughput(): number {
    if (this.throughputHistory.length < 2) {
      return 0;
    }

    let maxThroughput = 0;
    const windowSize = 1000; // 1 second

    for (let i = 0; i < this.throughputHistory.length; i++) {
      const start = this.throughputHistory[i].timestamp;
      const end = start + windowSize;

      const count = this.throughputHistory
        .filter((p) => p.timestamp >= start && p.timestamp < end)
        .reduce((sum, p) => sum + p.value, 0);

      maxThroughput = Math.max(maxThroughput, count);
    }

    return maxThroughput;
  }

  /**
   * Get current latency metrics
   */
  public getCurrentLatency(): LatencyMetrics {
    const now = Date.now();
    const windowStart = now - this.aggregationWindow;

    const recentLatencies = this.latencyHistory.filter((p) => p.timestamp >= windowStart);

    if (recentLatencies.length === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        avg: 0,
        min: 0,
        max: 0,
        samples: 0,
      };
    }

    const values = recentLatencies.map((p) => p.value).sort((a, b) => a - b);

    const p50 = this.percentile(values, 50);
    const p95 = this.percentile(values, 95);
    const p99 = this.percentile(values, 99);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = values[0];
    const max = values[values.length - 1];

    return {
      p50,
      p95,
      p99,
      avg,
      min,
      max,
      samples: values.length,
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Get queue depth metrics
   */
  public getDepthMetrics(): QueueDepthMetrics {
    if (this.depthHistory.length === 0) {
      return {
        currentDepth: 0,
        maxDepth: 0,
        avgDepth: 0,
        trend: 'stable',
      };
    }

    const currentDepth = this.depthHistory[this.depthHistory.length - 1].value;
    const maxDepth = Math.max(...this.depthHistory.map((p) => p.value));
    const avgDepth = this.depthHistory.reduce((sum, p) => sum + p.value, 0) / this.depthHistory.length;

    // Calculate trend
    const recent = this.depthHistory.slice(-10);
    const trend = this.calculateTrend(recent);

    return {
      currentDepth,
      maxDepth,
      avgDepth,
      trend,
    };
  }

  /**
   * Get error metrics
   */
  public getErrorMetrics(): ErrorMetrics {
    const now = Date.now();
    const windowStart = now - this.aggregationWindow;

    const recentErrors = this.errorHistory.filter((p) => p.timestamp >= windowStart);
    const errorCount = recentErrors.reduce((sum, p) => sum + p.value, 0);

    const totalRequests = this.stats.totalMessages;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

    const errorsByType = new Map<string, number>();
    for (const point of recentErrors) {
      const errorType = point.labels?.errorType || 'unknown';
      errorsByType.set(errorType, (errorsByType.get(errorType) || 0) + 1);
    }

    return {
      totalErrors: this.stats.totalErrors,
      errorRate,
      errorsByType,
      recentErrors: recentErrors.slice(-100),
    };
  }

  /**
   * Get current error rate
   */
  public getCurrentErrorRate(): number {
    return this.getErrorMetrics().errorRate;
  }

  /**
   * Get consumer lag metrics
   */
  public getLagMetrics(): ConsumerLagMetrics {
    if (this.lagHistory.length === 0) {
      return {
        currentLag: 0,
        maxLag: 0,
        avgLag: 0,
        trend: 'stable',
      };
    }

    const currentLag = this.lagHistory[this.lagHistory.length - 1].value;
    const maxLag = Math.max(...this.lagHistory.map((p) => p.value));
    const avgLag = this.lagHistory.reduce((sum, p) => sum + p.value, 0) / this.lagHistory.length;

    // Calculate trend
    const recent = this.lagHistory.slice(-10);
    const trend = this.calculateTrend(recent);

    return {
      currentLag,
      maxLag,
      avgLag,
      trend,
    };
  }

  /**
   * Calculate trend from recent data points
   */
  private calculateTrend(points: MetricPoint[]): 'increasing' | 'decreasing' | 'stable' {
    if (points.length < 2) {
      return 'stable';
    }

    const first = points[0].value;
    const last = points[points.length - 1].value;
    const change = Math.abs((last - first) / first);

    if (change < 0.05) {
      return 'stable';
    }

    return last > first ? 'increasing' : 'decreasing';
  }

  /**
   * Configure alert for a metric type
   */
  public configureAlert(type: string, config: AlertConfig): void {
    this.alertConfigs.set(type, config);
    this.logger.info('Alert configured', { type, config });
  }

  /**
   * Check if any alerts should be triggered
   */
  private checkAlerts(type: string, value: number): void {
    const config = this.alertConfigs.get(type);
    if (!config) {
      return;
    }

    let threshold: number | undefined;
    let severity: 'info' | 'warning' | 'critical' = 'warning';

    switch (type) {
      case 'throughput':
        threshold = config.throughputThreshold;
        break;
      case 'latency':
        threshold = config.latencyThreshold;
        break;
      case 'errorRate':
        threshold = config.errorRateThreshold;
        severity = 'critical';
        break;
      case 'lag':
        threshold = config.lagThreshold;
        severity = 'critical';
        break;
      case 'depth':
        threshold = config.depthThreshold;
        break;
    }

    if (threshold !== undefined && value > threshold) {
      const alert: Alert = {
        type,
        severity,
        message: `${type} exceeded threshold: ${value.toFixed(2)} > ${threshold}`,
        timestamp: Date.now(),
        value,
        threshold,
      };

      this.alerts.push(alert);
      this.logger.warn('Alert triggered', alert);

      // Keep only recent alerts
      if (this.alerts.length > 100) {
        this.alerts.shift();
      }
    }
  }

  /**
   * Get recent alerts
   */
  public getAlerts(limit: number = 10): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get overall queue health
   */
  public getQueueHealth(): QueueHealth {
    const issues: string[] = [];
    let score = 100;

    const throughput = this.getThroughputMetrics();
    const latency = this.getCurrentLatency();
    const errorRate = this.getCurrentErrorRate();
    const lag = this.getLagMetrics();

    // Check throughput
    if (throughput.messagesPerSecond === 0) {
      issues.push('No throughput detected');
      score -= 30;
    }

    // Check latency
    if (latency.p99 > 1000) {
      issues.push(`High p99 latency: ${latency.p99}ms`);
      score -= 20;
    }

    // Check error rate
    if (errorRate > 0.05) {
      issues.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
      score -= 30;
    }

    // Check lag
    if (lag.currentLag > 1000) {
      issues.push(`High consumer lag: ${lag.currentLag}`);
      score -= 20;
    }

    return {
      healthy: score >= 70,
      score,
      issues,
      alerts: this.getAlerts(5),
    };
  }

  /**
   * Get metrics summary
   */
  public getSummary(): {
    throughput: ThroughputMetrics;
    latency: LatencyMetrics;
    depth: QueueDepthMetrics;
    errors: ErrorMetrics;
    lag: ConsumerLagMetrics;
    health: QueueHealth;
  } {
    return {
      throughput: this.getThroughputMetrics(),
      latency: this.getCurrentLatency(),
      depth: this.getDepthMetrics(),
      errors: this.getErrorMetrics(),
      lag: this.getLagMetrics(),
      health: this.getQueueHealth(),
    };
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.throughputHistory = [];
    this.latencyHistory = [];
    this.depthHistory = [];
    this.errorHistory = [];
    this.lagHistory = [];
    this.alerts = [];
    this.stats = {
      totalMessages: 0,
      totalErrors: 0,
      startTime: Date.now(),
    };

    this.logger.info('Metrics reset');
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Clean up old data points
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    this.throughputHistory = this.throughputHistory.filter(
      (p) => now - p.timestamp < maxAge
    );
    this.latencyHistory = this.latencyHistory.filter((p) => now - p.timestamp < maxAge);
    this.depthHistory = this.depthHistory.filter((p) => now - p.timestamp < maxAge);
    this.errorHistory = this.errorHistory.filter((p) => now - p.timestamp < maxAge);
    this.lagHistory = this.lagHistory.filter((p) => now - p.timestamp < maxAge);

    // Enforce max size
    if (this.throughputHistory.length > this.maxHistorySize) {
      this.throughputHistory = this.throughputHistory.slice(-this.maxHistorySize);
    }
    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory = this.latencyHistory.slice(-this.maxHistorySize);
    }
    if (this.depthHistory.length > this.maxHistorySize) {
      this.depthHistory = this.depthHistory.slice(-this.maxHistorySize);
    }
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
    if (this.lagHistory.length > this.maxHistorySize) {
      this.lagHistory = this.lagHistory.slice(-this.maxHistorySize);
    }
  }
}

/**
 * Singleton instance
 */
let instance: QueueMetrics | null = null;

/**
 * Get or create the QueueMetrics singleton
 */
export function getQueueMetrics(): QueueMetrics {
  if (!instance) {
    instance = new QueueMetrics();
  }
  return instance;
}

/**
 * Reset the QueueMetrics singleton
 */
export function resetQueueMetrics(): void {
  if (instance) {
    instance.reset();
  }
}

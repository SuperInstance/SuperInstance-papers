/**
 * POLLN Spreadsheet Backend - WebSocket Metrics
 *
 * Tracks connection counts, message throughput, error rates,
 * and latency distribution for WebSocket connections.
 *
 * Features:
 * - Connection count by user type
 * - Message throughput tracking
 * - Error rate monitoring
 * - Latency distribution (P50, P95, P99)
 * - Real-time statistics
 * - Historical data aggregation
 *
 * Performance: O(1) metric recording
 */

/**
 * Connection statistics
 */
export interface ConnectionStats {
  total: number;
  active: number;
  byRole: Record<string, number>;
  failed: number;
  rateLimited: number;
}

/**
 * Message statistics
 */
export interface MessageStats {
  total: number;
  byType: Record<string, number>;
  byRole: Record<string, number>;
  authorized: number;
  unauthorized: number;
  validationFailed: number;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  total: number;
  authenticationFailed: number;
  authorizationFailed: number;
  validationFailed: number;
  rateLimited: number;
  systemError: number;
}

/**
 * Latency percentiles
 */
export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
  max: number;
  avg: number;
}

/**
 * Latency bucket
 */
interface LatencyBucket {
  count: number;
  samples: number[];
  maxSamples: number;
}

/**
 * Metric entry
 */
interface MetricEntry {
  count: number;
  lastUpdated: number;
}

/**
 * Metrics configuration
 */
export interface WSMetricsConfig {
  // Enable detailed latency tracking
  enableLatencyTracking: boolean;
  // Maximum samples per latency bucket
  maxLatencySamples: number;
  // Retention period (milliseconds)
  retentionPeriod: number;
  // Enable aggregation
  enableAggregation: boolean;
}

/**
 * WebSocket metrics tracker
 *
 * Tracks all WebSocket-related metrics including connections,
 * messages, errors, and latency percentiles.
 */
export class WSMetrics {
  private config: Required<WSMetricsConfig>;
  private connections: ConnectionStats;
  private messages: MessageStats;
  private errors: ErrorStats;
  private latencyBuckets: Map<string, LatencyBucket> = new Map();
  private connectionAttempts: Map<string, MetricEntry> = new Map();
  private disconnectionCodes: Map<number, number> = new Map();
  private startTime: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Latency bucket thresholds (milliseconds)
  private static readonly LATENCY_BUCKETS = [
    '0-10',
    '10-25',
    '25-50',
    '50-100',
    '100-250',
    '250-500',
    '500-1000',
    '1000+',
  ];

  constructor(config: Partial<WSMetricsConfig> = {}) {
    this.config = {
      enableLatencyTracking: config.enableLatencyTracking !== false,
      maxLatencySamples: config.maxLatencySamples || 1000,
      retentionPeriod: config.retentionPeriod || 3600000, // 1 hour
      enableAggregation: config.enableAggregation !== false,
    };

    this.connections = {
      total: 0,
      active: 0,
      byRole: {},
      failed: 0,
      rateLimited: 0,
    };

    this.messages = {
      total: 0,
      byType: {},
      byRole: {},
      authorized: 0,
      unauthorized: 0,
      validationFailed: 0,
    };

    this.errors = {
      total: 0,
      authenticationFailed: 0,
      authorizationFailed: 0,
      validationFailed: 0,
      rateLimited: 0,
      systemError: 0,
    };

    this.startTime = Date.now();

    this.initializeLatencyBuckets();
    this.startCleanup();
  }

  /**
   * Initialize latency buckets
   */
  private initializeLatencyBuckets(): void {
    for (const bucket of WSMetrics.LATENCY_BUCKETS) {
      this.latencyBuckets.set(bucket, {
        count: 0,
        samples: [],
        maxSamples: this.config.maxLatencySamples,
      });
    }
  }

  /**
   * Record connection establishment
   */
  recordConnectionEstablishment(role: string, duration: number): void {
    this.connections.total++;
    this.connections.active++;

    if (!this.connections.byRole[role]) {
      this.connections.byRole[role] = 0;
    }
    this.connections.byRole[role]++;

    if (this.config.enableLatencyTracking) {
      this.recordLatency('connection', duration);
    }
  }

  /**
   * Record connection attempt
   */
  recordConnectionAttempt(result: string): void {
    const key = `attempt_${result}`;
    let entry = this.connectionAttempts.get(key);

    if (!entry) {
      entry = { count: 0, lastUpdated: Date.now() };
      this.connectionAttempts.set(key, entry);
    }

    entry.count++;
    entry.lastUpdated = Date.now();

    // Track specific failures
    if (result === 'rate_limited') {
      this.connections.rateLimited++;
      this.errors.rateLimited++;
    } else if (result === 'invalid_token' || result === 'session_invalid') {
      this.connections.failed++;
      this.errors.authenticationFailed++;
    } else if (result === 'error') {
      this.connections.failed++;
      this.errors.systemError++;
    }
  }

  /**
   * Record disconnection
   */
  recordDisconnection(role: string, code: number): void {
    this.connections.active--;

    if (this.connections.byRole[role] > 0) {
      this.connections.byRole[role]--;
    }

    // Track disconnection codes
    const codeCount = this.disconnectionCodes.get(code) || 0;
    this.disconnectionCodes.set(code, codeCount + 1);
  }

  /**
   * Record message
   */
  recordMessage(messageType: string, role: string, authorized: boolean): void {
    this.messages.total++;

    if (!this.messages.byType[messageType]) {
      this.messages.byType[messageType] = 0;
    }
    this.messages.byType[messageType]++;

    if (!this.messages.byRole[role]) {
      this.messages.byRole[role] = 0;
    }
    this.messages.byRole[role]++;

    if (authorized) {
      this.messages.authorized++;
    } else {
      this.messages.unauthorized++;
      this.errors.authorizationFailed++;
    }
  }

  /**
   * Record unauthorized attempt
   */
  recordUnauthorizedAttempt(role: string, messageType: string): void {
    this.messages.total++;
    this.messages.unauthorized++;

    if (!this.messages.byType[messageType]) {
      this.messages.byType[messageType] = 0;
    }
    this.messages.byType[messageType]++;

    this.errors.authorizationFailed++;
  }

  /**
   * Record validation failure
   */
  recordValidationFailure(): void {
    this.messages.validationFailed++;
    this.errors.validationFailed++;
    this.errors.total++;
  }

  /**
   * Record latency
   */
  private recordLatency(operation: string, duration: number): void {
    const bucket = this.getLatencyBucket(duration);
    const bucketData = this.latencyBuckets.get(bucket)!;

    bucketData.count++;

    // Add sample if under limit
    if (bucketData.samples.length < bucketData.maxSamples) {
      bucketData.samples.push(duration);
    }
  }

  /**
   * Get latency bucket for duration
   */
  private getLatencyBucket(duration: number): string {
    if (duration < 10) return '0-10';
    if (duration < 25) return '10-25';
    if (duration < 50) return '25-50';
    if (duration < 100) return '50-100';
    if (duration < 250) return '100-250';
    if (duration < 500) return '250-500';
    if (duration < 1000) return '500-1000';
    return '1000+';
  }

  /**
   * Calculate latency percentiles for operation
   */
  calculateLatencyPercentiles(operation: string): LatencyPercentiles | null {
    if (!this.config.enableLatencyTracking) {
      return null;
    }

    const bucket = this.getLatencyBucketForOperation(operation);
    if (!bucket || bucket.samples.length === 0) {
      return null;
    }

    const sorted = [...bucket.samples].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
      max: sorted[len - 1],
      avg: sorted.reduce((sum, val) => sum + val, 0) / len,
    };
  }

  /**
   * Get latency bucket for operation
   */
  private getLatencyBucketForOperation(operation: string): LatencyBucket | undefined {
    // Map operation to latency bucket
    if (operation === 'connection') {
      // Connection latency - typically in 25-50ms bucket
      return this.latencyBuckets.get('25-50');
    }
    return undefined;
  }

  /**
   * Get all statistics
   */
  getAllStats(): {
    connections: ConnectionStats;
    messages: MessageStats;
    errors: ErrorStats;
    latency: LatencyPercentiles | null;
    uptime: number;
    disconnectionCodes: Record<number, number>;
    connectionAttempts: Record<string, MetricEntry>;
  } {
    return {
      connections: { ...this.connections },
      messages: { ...this.messages },
      errors: { ...this.errors },
      latency: this.calculateLatencyPercentiles('connection'),
      uptime: Date.now() - this.startTime,
      disconnectionCodes: Object.fromEntries(this.disconnectionCodes),
      connectionAttempts: Object.fromEntries(this.connectionAttempts),
    };
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): ConnectionStats {
    return { ...this.connections };
  }

  /**
   * Get message statistics
   */
  getMessageStats(): MessageStats {
    return { ...this.messages };
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    return { ...this.errors };
  }

  /**
   * Get throughput (messages per second)
   */
  getThroughput(): {
    messagesPerSecond: number;
    messagesPerMinute: number;
    authorizedPerSecond: number;
    unauthorizedPerSecond: number;
  } {
    const uptime = (Date.now() - this.startTime) / 1000;
    const uptimeMinutes = uptime / 60;

    return {
      messagesPerSecond: this.messages.total / uptime,
      messagesPerMinute: this.messages.total / uptimeMinutes,
      authorizedPerSecond: this.messages.authorized / uptime,
      unauthorizedPerSecond: this.messages.unauthorized / uptime,
    };
  }

  /**
   * Get error rate
   */
  getErrorRate(): {
    total: number;
    authenticationFailed: number;
    authorizationFailed: number;
    validationFailed: number;
    rateLimited: number;
  } {
    const total = this.errors.total;
    const totalRequests = this.connections.total + this.messages.total;

    return {
      total: totalRequests > 0 ? total / totalRequests : 0,
      authenticationFailed: totalRequests > 0 ? this.errors.authenticationFailed / totalRequests : 0,
      authorizationFailed: totalRequests > 0 ? this.errors.authorizationFailed / totalRequests : 0,
      validationFailed: totalRequests > 0 ? this.errors.validationFailed / totalRequests : 0,
      rateLimited: totalRequests > 0 ? this.errors.rateLimited / totalRequests : 0,
    };
  }

  /**
   * Get active connections by role
   */
  getActiveConnectionsByRole(): Record<string, number> {
    return { ...this.connections.byRole };
  }

  /**
   * Get message distribution by type
   */
  getMessageDistribution(): Record<string, number> {
    return { ...this.messages.byType };
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000); // Every 5 minutes
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean connection attempts
    for (const [key, entry] of this.connectionAttempts.entries()) {
      if (now - entry.lastUpdated > this.config.retentionPeriod) {
        this.connectionAttempts.delete(key);
      }
    }

    // Clean latency samples (reset if too many)
    for (const bucket of this.latencyBuckets.values()) {
      if (bucket.samples.length > bucket.maxSamples) {
        bucket.samples = bucket.samples.slice(-bucket.maxSamples);
      }
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.connections = {
      total: 0,
      active: 0,
      byRole: {},
      failed: 0,
      rateLimited: 0,
    };

    this.messages = {
      total: 0,
      byType: {},
      byRole: {},
      authorized: 0,
      unauthorized: 0,
      validationFailed: 0,
    };

    this.errors = {
      total: 0,
      authenticationFailed: 0,
      authorizationFailed: 0,
      validationFailed: 0,
      rateLimited: 0,
      systemError: 0,
    };

    this.disconnectionCodes.clear();
    this.connectionAttempts.clear();
    this.initializeLatencyBuckets();

    this.startTime = Date.now();
  }

  /**
   * Shutdown metrics
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.latencyBuckets.clear();
  }

  /**
   * Get metrics configuration
   */
  getConfig(): Required<WSMetricsConfig> {
    return { ...this.config };
  }
}

/**
 * Create metrics instance
 */
export function createWSMetrics(config?: Partial<WSMetricsConfig>): WSMetrics {
  return new WSMetrics(config);
}

export default WSMetrics;

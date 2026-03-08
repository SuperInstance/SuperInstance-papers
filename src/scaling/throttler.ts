/**
 * Request Throttler
 *
 * Rate limiting and request throttling
 */

import { EventEmitter } from 'events';
import type { ThrottlingConfig } from './types.js';

/**
 * Request queue item
 */
interface QueuedRequest {
  id: string;
  priority: number;
  timestamp: number;
  timeout: NodeJS.Timeout;
  resolve: (value: boolean) => void;
  reject: (error: Error) => void;
}

/**
 * Priority level
 */
enum Priority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  CRITICAL = 10,
}

/**
 * Request Throttler
 */
export class RequestThrottler extends EventEmitter {
  private config: ThrottlingConfig;
  private activeRequests: number = 0;
  private queue: QueuedRequest[] = [];
  private requestCount: number[] = [];
  private lastReset: number = Date.now();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: ThrottlingConfig) {
    super();
    this.config = config;
    this.initialize();

    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Initialize throttler
   */
  private initialize(): void {
    // Initialize request counter array (1 second buckets)
    const buckets = 60;
    this.requestCount = new Array(buckets).fill(0);
  }

  /**
   * Submit request for throttling
   */
  public async request(
    priority: number = Priority.NORMAL
  ): Promise<boolean> {
    if (!this.config.enabled) {
      return true;
    }

    // Check if we can process immediately
    if (this.canProcess()) {
      this.activeRequests++;
      this.recordRequest();
      return true;
    }

    // Check if queue is full
    if (this.queue.length >= this.config.queueSize) {
      this.emit('rejected', { reason: 'queue_full' });
      return false;
    }

    // Add to queue
    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${Math.random()}`;
      const timeout = setTimeout(() => {
        this.removeFromQueue(id);
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      this.queue.push({
        id,
        priority,
        timestamp: Date.now(),
        timeout,
        resolve,
        reject,
      });

      // Sort by priority
      this.queue.sort((a, b) => b.priority - a.priority);

      this.emit('queued', { id, priority });
    });
  }

  /**
   * Complete request
   */
  public complete(): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }

    // Process queue
    this.processQueue();
  }

  /**
   * Check if we can process a request
   */
  private canProcess(): boolean {
    // Check concurrent request limit
    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      return false;
    }

    // Check rate limit
    const currentRate = this.getCurrentRate();
    if (currentRate >= this.config.maxRequestsPerSecond) {
      return false;
    }

    return true;
  }

  /**
   * Get current request rate
   */
  private getCurrentRate(): number {
    // Sum requests in last second
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Count requests in last second
    let count = 0;
    const bucketSize = 1000; // 1 second
    const currentBucket = Math.floor((now - this.lastReset) / bucketSize) % this.requestCount.length;

    // This is a simplified version - real implementation would track per-second
    return this.requestCount[currentBucket];
  }

  /**
   * Record request
   */
  private recordRequest(): void {
    const now = Date.now();
    const bucketSize = 1000; // 1 second
    const bucketIndex = Math.floor((now - this.lastReset) / bucketSize) % this.requestCount.length;

    this.requestCount[bucketIndex]++;

    // Reset old buckets periodically
    if (now - this.lastReset > this.requestCount.length * bucketSize) {
      const resetIndex = Math.floor((now - this.lastReset) / bucketSize) % this.requestCount.length;
      this.requestCount[resetIndex] = 0;
    }
  }

  /**
   * Process queue
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.canProcess()) {
      const item = this.queue.shift()!;

      clearTimeout(item.timeout);
      this.activeRequests++;
      this.recordRequest();

      item.resolve(true);
      this.emit('dequeued', { id: item.id });
    }
  }

  /**
   * Remove from queue
   */
  private removeFromQueue(id: string): void {
    const index = this.queue.findIndex((item) => item.id === id);

    if (index !== -1) {
      const item = this.queue.splice(index, 1)[0];
      clearTimeout(item.timeout);
      this.emit('timeout', { id: item.id });
    }
  }

  /**
   * Cleanup old request counters
   */
  private cleanup(): void {
    const now = Date.now();
    const bucketSize = 1000; // 1 second

    // Reset counters that are older than our window
    for (let i = 0; i < this.requestCount.length; i++) {
      const bucketTime = this.lastReset + i * bucketSize;
      if (now - bucketTime > this.requestCount.length * bucketSize) {
        this.requestCount[i] = 0;
      }
    }

    // Move last reset forward
    const elapsedBuckets = Math.floor((now - this.lastReset) / bucketSize);
    if (elapsedBuckets > this.requestCount.length / 2) {
      this.lastReset += elapsedBuckets * bucketSize;
    }
  }

  /**
   * Get statistics
   */
  public getStats(): {
    activeRequests: number;
    queuedRequests: number;
    currentRate: number;
    utilization: number;
  } {
    const currentRate = this.getCurrentRate();

    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.queue.length,
      currentRate,
      utilization: currentRate / this.config.maxRequestsPerSecond,
    };
  }

  /**
   * Get queue length
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get active request count
   */
  public getActiveRequestCount(): number {
    return this.activeRequests;
  }

  /**
   * Update config
   */
  public updateConfig(updates: Partial<ThrottlingConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };

    this.emit('config_updated', this.config);
  }

  /**
   * Get config
   */
  public getConfig(): ThrottlingConfig {
    return { ...this.config };
  }

  /**
   * Clear queue
   */
  public clearQueue(): void {
    for (const item of this.queue) {
      clearTimeout(item.timeout);
      item.reject(new Error('Queue cleared'));
    }

    this.queue = [];
    this.emit('queue_cleared');
  }

  /**
   * Stop throttler
   */
  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.clearQueue();
  }
}

/**
 * Create default throttling config
 */
export function createDefaultThrottlingConfig(): ThrottlingConfig {
  return {
    enabled: true,
    maxRequestsPerSecond: 1000,
    maxConcurrentRequests: 100,
    queueSize: 1000,
    timeout: 30000, // 30 seconds
    priorityLevels: 4,
  };
}

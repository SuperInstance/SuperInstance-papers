/**
 * Sensation Queue - Redis Pub/Sub for Cell Sensations
 *
 * Handles real-time sensation distribution between cells using Redis Pub/Sub.
 * Supports neighborhood subscriptions, pattern matching, and message batching.
 *
 * Features:
 * - Publish sensations to channels
 * - Subscribe to cell neighborhoods
 * - Pattern-based subscriptions
 * - Message batching for efficiency
 * - Backpressure handling
 * - Automatic reconnection
 */

import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { Logger } from '../../../io/Logger.js';
import { getRedisConnection } from './RedisConnection.js';

/**
 * Sensation types
 */
export enum SensationType {
  ABSOLUTE_CHANGE = 'absolute',
  RATE_OF_CHANGE = 'velocity',
  ACCELERATION = 'trend',
  PRESENCE = 'existence',
  PATTERN = 'recognition',
  ANOMALY = 'outlier',
}

/**
 * Sensation message structure
 */
export interface SensationMessage {
  id: string;
  sourceCellId: string;
  targetCellId?: string;
  sensationType: SensationType;
  timestamp: number;
  data: any;
  metadata?: Record<string, any>;
}

/**
 * Subscription configuration
 */
export interface SubscriptionConfig {
  pattern?: string;
  batchSize?: number;
  batchTimeout?: number;
  backpressureThreshold?: number;
}

/**
 * Pub/Sub statistics
 */
export interface PubSubStats {
  messagesPublished: number;
  messagesReceived: number;
  messagesDropped: number;
  avgPublishLatency: number;
  avgReceiveLatency: number;
  activeSubscriptions: number;
}

/**
 * Sensation Queue class
 */
export class SensationQueue extends EventEmitter {
  private publisher: Redis.Redis | Redis.Cluster;
  private subscriber: Redis.Redis | Redis.Cluster;
  private subscriptions: Map<string, Set<string>>;
  private patterns: Map<string, RegExp>;
  private batches: Map<string, SensationMessage[]>;
  private batchTimers: Map<string, NodeJS.Timeout>;
  private config: SubscriptionConfig;
  private stats: PubSubStats;
  private logger: Logger;
  private initialized: boolean;

  constructor(config: SubscriptionConfig = {}) {
    super();
    this.config = {
      batchSize: 100,
      batchTimeout: 10,
      backpressureThreshold: 10000,
      ...config,
    };

    this.subscriptions = new Map();
    this.patterns = new Map();
    this.batches = new Map();
    this.batchTimers = new Map();
    this.logger = Logger.getInstance().child({ component: 'SensationQueue' });
    this.initialized = false;

    this.stats = {
      messagesPublished: 0,
      messagesReceived: 0,
      messagesDropped: 0,
      avgPublishLatency: 0,
      avgReceiveLatency: 0,
      activeSubscriptions: 0,
    };

    // Lazy initialization - will be done in init()
    this.publisher = null as any;
    this.subscriber = null as any;
  }

  /**
   * Initialize the queue
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing SensationQueue');

    try {
      const connection = getRedisConnection();
      this.publisher = await connection.getClient('publisher');
      this.subscriber = await connection.getClient('subscriber');

      // Setup event handlers for subscriber
      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message);
      });

      this.subscriber.on('pmessage', (pattern, channel, message) => {
        this.handlePatternMessage(pattern, channel, message);
      });

      this.initialized = true;
      this.logger.info('SensationQueue initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SensationQueue', { error });
      throw error;
    }
  }

  /**
   * Publish a sensation to a channel
   */
  public async publish(channel: string, sensation: SensationMessage): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    const startTime = Date.now();

    try {
      const message = JSON.stringify(sensation);
      await this.publisher.publish(channel, message);

      const latency = Date.now() - startTime;
      this.stats.messagesPublished++;
      this.stats.avgPublishLatency =
        (this.stats.avgPublishLatency * (this.stats.messagesPublished - 1) + latency) /
        this.stats.messagesPublished;

      this.logger.debug('Sensation published', {
        channel,
        sensationId: sensation.id,
        latency,
      });
    } catch (error) {
      this.logger.error('Failed to publish sensation', { channel, sensationId: sensation.id, error });
      throw error;
    }
  }

  /**
   * Publish multiple sensations in a pipeline
   */
  public async publishBatch(channel: string, sensations: SensationMessage[]): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    const startTime = Date.now();

    try {
      const pipeline = this.publisher.pipeline();
      for (const sensation of sensations) {
        const message = JSON.stringify(sensation);
        pipeline.publish(channel, message);
      }
      await pipeline.exec();

      const latency = Date.now() - startTime;
      this.stats.messagesPublished += sensations.length;
      this.stats.avgPublishLatency =
        (this.stats.avgPublishLatency * (this.stats.messagesPublished - sensations.length) + latency) /
        this.stats.messagesPublished;

      this.logger.debug('Sensation batch published', {
        channel,
        count: sensations.length,
        latency,
      });
    } catch (error) {
      this.logger.error('Failed to publish sensation batch', { channel, count: sensations.length, error });
      throw error;
    }
  }

  /**
   * Subscribe to a specific channel
   */
  public async subscribe(channel: string, handler: (sensation: SensationMessage) => void): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      await this.subscriber.subscribe(channel);

      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
        this.stats.activeSubscriptions++;
      }

      this.subscriptions.get(channel)!.add(String(handler));

      this.on(`message:${channel}`, handler);

      this.logger.debug('Subscribed to channel', { channel });
    } catch (error) {
      this.logger.error('Failed to subscribe to channel', { channel, error });
      throw error;
    }
  }

  /**
   * Subscribe to a channel pattern
   */
  public async psubscribe(pattern: string, handler: (sensation: SensationMessage) => void): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      await this.subscriber.psubscribe(pattern);

      const regex = new RegExp(pattern.replace('*', '.*'));

      if (!this.patterns.has(pattern)) {
        this.patterns.set(pattern, regex);
        this.stats.activeSubscriptions++;
      }

      this.subscriptions.set(pattern, this.subscriptions.get(pattern) || new Set());
      this.subscriptions.get(pattern)!.add(String(handler));

      this.on(`pmessage:${pattern}`, handler);

      this.logger.debug('Subscribed to pattern', { pattern });
    } catch (error) {
      this.logger.error('Failed to subscribe to pattern', { pattern, error });
      throw error;
    }
  }

  /**
   * Unsubscribe from a specific channel
   */
  public async unsubscribe(channel: string): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.subscriber.unsubscribe(channel);

      this.subscriptions.delete(channel);
      this.stats.activeSubscriptions--;
      this.removeAllListeners(`message:${channel}`);

      this.logger.debug('Unsubscribed from channel', { channel });
    } catch (error) {
      this.logger.error('Failed to unsubscribe from channel', { channel, error });
      throw error;
    }
  }

  /**
   * Unsubscribe from a pattern
   */
  public async punsubscribe(pattern: string): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.subscriber.punsubscribe(pattern);

      this.patterns.delete(pattern);
      this.subscriptions.delete(pattern);
      this.stats.activeSubscriptions--;
      this.removeAllListeners(`pmessage:${pattern}`);

      this.logger.debug('Unsubscribed from pattern', { pattern });
    } catch (error) {
      this.logger.error('Failed to unsubscribe from pattern', { pattern, error });
      throw error;
    }
  }

  /**
   * Handle incoming message from channel subscription
   */
  private handleMessage(channel: string, message: string): void {
    const startTime = Date.now();

    try {
      const sensation: SensationMessage = JSON.parse(message);

      // Check backpressure
      if (this.stats.messagesReceived - this.stats.messagesDropped > this.config.backpressureThreshold!) {
        this.stats.messagesDropped++;
        this.logger.warn('Message dropped due to backpressure', { channel });
        return;
      }

      // Add to batch or emit immediately
      if (this.config.batchSize! > 1) {
        this.addToBatch(channel, sensation);
      } else {
        this.stats.messagesReceived++;
        const latency = Date.now() - startTime;
        this.stats.avgReceiveLatency =
          (this.stats.avgReceiveLatency * (this.stats.messagesReceived - 1) + latency) /
          this.stats.messagesReceived;
        this.emit(`message:${channel}`, sensation);
      }
    } catch (error) {
      this.logger.error('Failed to handle message', { channel, error });
    }
  }

  /**
   * Handle incoming message from pattern subscription
   */
  private handlePatternMessage(pattern: string, channel: string, message: string): void {
    const startTime = Date.now();

    try {
      const sensation: SensationMessage = JSON.parse(message);

      // Check backpressure
      if (this.stats.messagesReceived - this.stats.messagesDropped > this.config.backpressureThreshold!) {
        this.stats.messagesDropped++;
        this.logger.warn('Message dropped due to backpressure', { pattern, channel });
        return;
      }

      // Add to batch or emit immediately
      if (this.config.batchSize! > 1) {
        this.addToBatch(pattern, sensation);
      } else {
        this.stats.messagesReceived++;
        const latency = Date.now() - startTime;
        this.stats.avgReceiveLatency =
          (this.stats.avgReceiveLatency * (this.stats.messagesReceived - 1) + latency) /
          this.stats.messagesReceived;
        this.emit(`pmessage:${pattern}`, sensation);
      }
    } catch (error) {
      this.logger.error('Failed to handle pattern message', { pattern, channel, error });
    }
  }

  /**
   * Add sensation to batch
   */
  private addToBatch(key: string, sensation: SensationMessage): void {
    if (!this.batches.has(key)) {
      this.batches.set(key, []);
    }

    this.batches.get(key)!.push(sensation);

    // Check if batch is full
    if (this.batches.get(key)!.length >= this.config.batchSize!) {
      this.flushBatch(key);
    } else {
      // Set timeout for partial batch
      if (!this.batchTimers.has(key)) {
        const timer = setTimeout(() => this.flushBatch(key), this.config.batchTimeout);
        this.batchTimers.set(key, timer);
      }
    }
  }

  /**
   * Flush batched sensations
   */
  private flushBatch(key: string): void {
    const batch = this.batches.get(key);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear timer
    if (this.batchTimers.has(key)) {
      clearTimeout(this.batchTimers.get(key)!);
      this.batchTimers.delete(key);
    }

    // Emit all sensations
    const eventName = key.includes('*') ? `pmessage:${key}` : `message:${key}`;
    for (const sensation of batch) {
      this.stats.messagesReceived++;
      this.emit(eventName, sensation);
    }

    // Clear batch
    this.batches.set(key, []);

    this.logger.debug('Batch flushed', { key, size: batch.length });
  }

  /**
   * Get statistics
   */
  public getStats(): PubSubStats {
    return { ...this.stats };
  }

  /**
   * Get active subscriptions
   */
  public getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Check if subscribed to a channel
   */
  public isSubscribed(channel: string): boolean {
    return this.subscriptions.has(channel);
  }

  /**
   * Close the queue and cleanup
   */
  public async close(): Promise<void> {
    this.logger.info('Closing SensationQueue');

    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Flush all batches
    for (const key of this.batches.keys()) {
      this.flushBatch(key);
    }
    this.batches.clear();

    // Unsubscribe from all channels
    if (this.initialized && this.subscriber) {
      try {
        await this.subscriber.quit();
      } catch (error) {
        this.logger.error('Error closing subscriber', { error });
      }
    }

    this.initialized = false;
    this.removeAllListeners();

    this.logger.info('SensationQueue closed');
  }
}

/**
 * Singleton instance
 */
let instance: SensationQueue | null = null;

/**
 * Get or create the SensationQueue singleton
 */
export function getSensationQueue(config?: SubscriptionConfig): SensationQueue {
  if (!instance) {
    instance = new SensationQueue(config);
  }
  return instance;
}

/**
 * Close the SensationQueue singleton
 */
export async function closeSensationQueue(): Promise<void> {
  if (instance) {
    await instance.close();
    instance = null;
  }
}

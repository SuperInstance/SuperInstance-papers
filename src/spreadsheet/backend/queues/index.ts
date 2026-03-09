/**
 * Redis Queue System - Export Index
 *
 * Comprehensive Redis-based message queue infrastructure for distributed architecture.
 * Provides high-throughput, low-latency message passing with reliable delivery.
 *
 * Target Performance:
 * - 4M+ sensations/second throughput
 * - <10ms latency for p99
 * - Horizontal scaling via sharding
 * - High availability via replication and sentinel
 */

// Core Connection Management
export * from './RedisConnection.js';
export { getRedisConnection, closeRedisConnection } from './RedisConnection.js';

// Sensation Queue (Pub/Sub)
export * from './SensationQueue.js';
export { getSensationQueue, closeSensationQueue } from './SensationQueue.js';

// Event Queue (Reliable Streams)
export * from './EventQueue.js';
export { createEventQueue } from './EventQueue.js';

// Cache Coordinator (Distributed Cache)
export * from './CacheCoordinator.js';
export { getCacheCoordinator, closeCacheCoordinator } from './CacheCoordinator.js';

// Shard Manager (Database Sharding)
export * from './ShardManager.js';
export { createShardManager } from './ShardManager.js';

// Queue Metrics (Monitoring)
export * from './QueueMetrics.js';
export { getQueueMetrics, resetQueueMetrics } from './QueueMetrics.js';

/**
 * Queue System Factory
 *
 * Creates a fully configured queue system with all components.
 */
export interface QueueSystemConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  sensation?: {
    batchSize?: number;
    batchTimeout?: number;
    backpressureThreshold?: number;
  };
  event?: {
    groupName: string;
    consumerName: string;
    maxRetries?: number;
  };
  cache?: {
    defaultTTL?: number;
    maxSize?: number;
    enableDistributed?: boolean;
  };
  shards?: Array<{
    id: string;
    host: string;
    port: number;
    db: number;
    weight?: number;
  }>;
}

/**
 * Queue System class
 *
 * Manages all queue components together.
 */
export class QueueSystem {
  private initialized: boolean;

  constructor(private config: QueueSystemConfig) {
    this.initialized = false;
  }

  /**
   * Initialize all queue components
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize Redis connection
    const connection = getRedisConnection(this.config.redis);

    // Initialize components if configured
    if (this.config.sensation) {
      const sensationQueue = getSensationQueue(this.config.sensation);
      await sensationQueue.init();
    }

    if (this.config.cache) {
      const cache = getCacheCoordinator(this.config.cache);
      await cache.init();
    }

    if (this.config.shards) {
      const shardManager = createShardManager(
        this.config.shards.map((s) => ({
          id: s.id,
          host: s.host,
          port: s.port,
          db: s.db,
          healthy: true,
          weight: s.weight || 1,
          lastHealthCheck: new Date(),
          connectionCount: 0,
        }))
      );
      await shardManager.init();
    }

    this.initialized = true;
  }

  /**
   * Get sensation queue
   */
  public getSensationQueue() {
    return getSensationQueue(this.config.sensation);
  }

  /**
   * Create event queue
   */
  public createEventQueue(streamName: string, consumerName: string) {
    return createEventQueue(
      streamName,
      {
        name: this.config.event?.groupName || 'default-group',
        consumerName,
      },
      {
        maxRetries: this.config.event?.maxRetries,
      }
    );
  }

  /**
   * Get cache coordinator
   */
  public getCacheCoordinator() {
    return getCacheCoordinator(this.config.cache);
  }

  /**
   * Get shard manager
   */
  public getShardManager() {
    if (!this.config.shards) {
      throw new Error('Shards not configured');
    }

    return createShardManager(
      this.config.shards.map((s) => ({
        id: s.id,
        host: s.host,
        port: s.port,
        db: s.db,
        healthy: true,
        weight: s.weight || 1,
        lastHealthCheck: new Date(),
        connectionCount: 0,
      }))
    );
  }

  /**
   * Get queue metrics
   */
  public getMetrics() {
    return getQueueMetrics();
  }

  /**
   * Close all components
   */
  public async close(): Promise<void> {
    await closeSensationQueue();
    await closeCacheCoordinator();
    await closeRedisConnection();
    this.initialized = false;
  }
}

/**
 * Factory function to create a queue system
 */
export function createQueueSystem(config: QueueSystemConfig): QueueSystem {
  return new QueueSystem(config);
}

/**
 * Default configuration for development
 */
export function getDefaultConfig(): QueueSystemConfig {
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    sensation: {
      batchSize: 100,
      batchTimeout: 10,
      backpressureThreshold: 10000,
    },
    event: {
      groupName: 'polln-events',
      consumerName: 'polln-consumer',
      maxRetries: 3,
    },
    cache: {
      defaultTTL: 3600000,
      maxSize: 10000,
      enableDistributed: true,
    },
    shards: [
      {
        id: 'shard-1',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: 0,
        weight: 1,
      },
    ],
  };
}

/**
 * Production configuration
 */
export function getProductionConfig(): QueueSystemConfig {
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
    },
    sensation: {
      batchSize: 1000,
      batchTimeout: 5,
      backpressureThreshold: 100000,
    },
    event: {
      groupName: 'polln-events-prod',
      consumerName: process.env.HOSTNAME || 'polln-consumer',
      maxRetries: 5,
    },
    cache: {
      defaultTTL: 3600000,
      maxSize: 100000,
      enableDistributed: true,
    },
    shards: process.env.REDIS_SHARDS
      ? JSON.parse(process.env.REDIS_SHARDS)
      : [
          {
            id: 'shard-1',
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            db: 0,
            weight: 1,
          },
        ],
  };
}

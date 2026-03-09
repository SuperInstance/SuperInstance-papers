/**
 * Cache Coordinator - Distributed Cache Management
 *
 * Coordinates distributed caching across multiple instances using Redis as L2 cache.
 * Handles cache invalidation via pub/sub, multi-instance coordination, and lock distribution.
 *
 * Features:
 * - Redis as L2 distributed cache
 * - Cache invalidation pub/sub
 * - Multi-instance coordination
 * - Distributed locks
 * - Cache warming strategies
 * - Automatic expiration
 * - Statistics and monitoring
 */

import Redis from 'ioredis';
import { Logger } from '../../../io/Logger.js';
import { getRedisConnection } from './RedisConnection.js';

/**
 * Cache entry structure
 */
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  version: number;
  metadata?: Record<string, any>;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  enableDistributed: boolean;
  enableStats: boolean;
}

/**
 * Lock configuration
 */
export interface LockConfig {
  acquireTimeout: number;
  lockTimeout: number;
  retryDelay: number;
  maxRetries: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  invalidations: number;
  hitRate: number;
  avgLatency: number;
  size: number;
  locksAcquired: number;
  locksReleased: number;
  lockErrors: number;
}

/**
 * Lock information
 */
export interface LockInfo {
  key: string;
  holder: string;
  acquiredAt: number;
  expiresAt: number;
}

/**
 * Cache Coordinator class
 */
export class CacheCoordinator {
  private redis: Redis.Redis | Redis.Cluster;
  private localCache: Map<string, CacheEntry<any>>;
  private config: CacheConfig;
  private lockConfig: LockConfig;
  private stats: CacheStats;
  private instanceId: string;
  private invalidationChannel: string;
  private lockChannel: string;
  private logger: Logger;
  private initialized: boolean;
  localCacheOrder?: string[];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 3600000, // 1 hour
      maxSize: 10000,
      evictionPolicy: 'lru',
      enableDistributed: true,
      enableStats: true,
      ...config,
    };

    this.lockConfig = {
      acquireTimeout: 10000,
      lockTimeout: 30000,
      retryDelay: 100,
      maxRetries: 10,
    };

    this.localCache = new Map();
    this.localCacheOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      invalidations: 0,
      hitRate: 0,
      avgLatency: 0,
      size: 0,
      locksAcquired: 0,
      locksReleased: 0,
      lockErrors: 0,
    };

    this.instanceId = `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.invalidationChannel = 'cache:invalidation';
    this.lockChannel = 'cache:lock';
    this.logger = Logger.getInstance().child({ component: 'CacheCoordinator' });
    this.initialized = false;

    // Lazy initialization
    this.redis = null as any;
  }

  /**
   * Initialize the cache coordinator
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing CacheCoordinator', {
      instanceId: this.instanceId,
      config: this.config,
    });

    try {
      const connection = getRedisConnection();
      this.redis = await connection.getClient('cache');

      if (this.config.enableDistributed) {
        // Subscribe to invalidation channel
        const subscriber = await connection.getClient('cache-subscriber');
        subscriber.subscribe(this.invalidationChannel);

        subscriber.on('message', (channel, message) => {
          if (channel === this.invalidationChannel) {
            this.handleInvalidation(message);
          }
        });

        this.logger.info('Subscribed to invalidation channel');
      }

      this.initialized = true;
      this.logger.info('CacheCoordinator initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CacheCoordinator', { error });
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    if (!this.initialized) {
      await this.init();
    }

    const startTime = Date.now();

    try {
      // Check local cache first
      const localEntry = this.localCache.get(key);
      if (localEntry && Date.now() - localEntry.timestamp < localEntry.ttl) {
        this.stats.hits++;
        this.updateHitRate();
        this.updateLatency(Date.now() - startTime);
        return localEntry.value as T;
      }

      // Check Redis cache
      if (this.config.enableDistributed) {
        const redisData = await this.redis.get(`cache:${key}`);
        if (redisData) {
          const entry: CacheEntry<T> = JSON.parse(redisData);

          // Check if expired
          if (Date.now() - entry.timestamp < entry.ttl) {
            // Populate local cache
            this.setLocalCache(key, entry);
            this.stats.hits++;
            this.updateHitRate();
            this.updateLatency(Date.now() - startTime);
            return entry.value;
          }
        }
      }

      this.stats.misses++;
      this.updateHitRate();
      this.updateLatency(Date.now() - startTime);
      return null;
    } catch (error) {
      this.logger.error('Failed to get from cache', { key, error });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    const startTime = Date.now();
    const cacheTTL = ttl || this.config.defaultTTL;

    try {
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl: cacheTTL,
        version: 1,
      };

      // Set in local cache
      this.setLocalCache(key, entry);

      // Set in Redis cache
      if (this.config.enableDistributed) {
        await this.redis.setex(
          `cache:${key}`,
          Math.floor(cacheTTL / 1000),
          JSON.stringify(entry)
        );
      }

      this.stats.sets++;
      this.updateLatency(Date.now() - startTime);

      this.logger.debug('Value set in cache', { key, ttl: cacheTTL });
    } catch (error) {
      this.logger.error('Failed to set in cache', { key, error });
      throw error;
    }
  }

  /**
   * Set value in local cache with eviction
   */
  private setLocalCache<T>(key: string, entry: CacheEntry<T>): void {
    // Check size limit
    if (this.localCache.size >= this.config.maxSize) {
      this.evictFromLocalCache();
    }

    this.localCache.set(key, entry);
    if (this.localCacheOrder) {
      this.localCacheOrder.push(key);
    }
    this.stats.size = this.localCache.size;
  }

  /**
   * Evict from local cache based on policy
   */
  private evictFromLocalCache(): void {
    let keyToRemove: string | undefined;

    switch (this.config.evictionPolicy) {
      case 'lru':
        // Remove least recently used (first in order array)
        if (this.localCacheOrder && this.localCacheOrder.length > 0) {
          keyToRemove = this.localCacheOrder.shift();
        }
        break;

      case 'lfu':
        // Remove least frequently used
        let minAccessCount = Infinity;
        for (const [key, entry] of this.localCache) {
          const accessCount = entry.metadata?.accessCount || 0;
          if (accessCount < minAccessCount) {
            minAccessCount = accessCount;
            keyToRemove = key;
          }
        }
        break;

      case 'fifo':
        // First in first out
        if (this.localCacheOrder && this.localCacheOrder.length > 0) {
          keyToRemove = this.localCacheOrder.shift();
        }
        break;
    }

    if (keyToRemove) {
      this.localCache.delete(keyToRemove);
      this.stats.size = this.localCache.size;
    }
  }

  /**
   * Delete a value from cache
   */
  public async delete(key: string): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      // Delete from local cache
      this.localCache.delete(key);
      if (this.localCacheOrder) {
        const index = this.localCacheOrder.indexOf(key);
        if (index > -1) {
          this.localCacheOrder.splice(index, 1);
        }
      }

      // Delete from Redis cache
      if (this.config.enableDistributed) {
        await this.redis.del(`cache:${key}`);

        // Publish invalidation
        await this.redis.publish(this.invalidationChannel, JSON.stringify({ key, instanceId: this.instanceId }));
      }

      this.stats.deletes++;
      this.stats.size = this.localCache.size;

      this.logger.debug('Value deleted from cache', { key });
    } catch (error) {
      this.logger.error('Failed to delete from cache', { key, error });
      throw error;
    }
  }

  /**
   * Invalidate cache entry
   */
  public async invalidate(key: string): Promise<void> {
    await this.delete(key);
    this.stats.invalidations++;
  }

  /**
   * Invalidate multiple keys
   */
  public async invalidateMultiple(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.invalidate(key)));
  }

  /**
   * Invalidate all cache entries
   */
  public async invalidateAll(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      // Clear local cache
      this.localCache.clear();
      if (this.localCacheOrder) {
        this.localCacheOrder = [];
      }

      // Clear Redis cache
      if (this.config.enableDistributed) {
        const keys = await this.redis.keys('cache:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }

        // Publish invalidation
        await this.redis.publish(this.invalidationChannel, JSON.stringify({ key: '*', instanceId: this.instanceId }));
      }

      this.stats.size = 0;
      this.logger.info('All cache invalidated');
    } catch (error) {
      this.logger.error('Failed to invalidate all cache', { error });
      throw error;
    }
  }

  /**
   * Handle cache invalidation message
   */
  private handleInvalidation(message: string): void {
    try {
      const data = JSON.parse(message);

      // Skip if from this instance
      if (data.instanceId === this.instanceId) {
        return;
      }

      if (data.key === '*') {
        this.localCache.clear();
        if (this.localCacheOrder) {
          this.localCacheOrder = [];
        }
        this.stats.size = 0;
        this.logger.info('All local cache invalidated by remote instance');
      } else {
        this.localCache.delete(data.key);
        if (this.localCacheOrder) {
          const index = this.localCacheOrder.indexOf(data.key);
          if (index > -1) {
            this.localCacheOrder.splice(index, 1);
          }
        }
        this.stats.size = this.localCache.size;
        this.logger.debug('Local cache entry invalidated', { key: data.key });
      }
    } catch (error) {
      this.logger.error('Failed to handle invalidation', { error });
    }
  }

  /**
   * Acquire a distributed lock
   */
  public async acquireLock(key: string, holder: string): Promise<boolean> {
    if (!this.initialized) {
      await this.init();
    }

    const lockKey = `lock:${key}`;
    const lockValue = `${holder}:${Date.now()}`;

    for (let i = 0; i < this.lockConfig.maxRetries; i++) {
      try {
        const acquired = await this.redis.set(
          lockKey,
          lockValue,
          'PX',
          this.lockConfig.lockTimeout,
          'NX'
        );

        if (acquired === 'OK') {
          this.stats.locksAcquired++;
          this.logger.debug('Lock acquired', { key: lockKey, holder });
          return true;
        }

        await this.sleep(this.lockConfig.retryDelay);
      } catch (error) {
        this.logger.error('Failed to acquire lock', { key: lockKey, error, attempt: i + 1 });
      }
    }

    this.stats.lockErrors++;
    return false;
  }

  /**
   * Release a distributed lock
   */
  public async releaseLock(key: string, holder: string): Promise<boolean> {
    if (!this.initialized) {
      await this.init();
    }

    const lockKey = `lock:${key}`;
    const lockValue = `${holder}:${Date.now()}`;

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(script, 1, lockKey, lockValue);

      if (result === 1) {
        this.stats.locksReleased++;
        this.logger.debug('Lock released', { key: lockKey, holder });
        return true;
      }

      this.stats.lockErrors++;
      return false;
    } catch (error) {
      this.logger.error('Failed to release lock', { key: lockKey, error });
      this.stats.lockErrors++;
      return false;
    }
  }

  /**
   * Warm up cache with predefined data
   */
  public async warmUp(data: Map<string, any>, ttl?: number): Promise<void> {
    this.logger.info('Warming up cache', { size: data.size });

    const promises = Array.from(data.entries()).map(([key, value]) => this.set(key, value, ttl));

    await Promise.all(promises);

    this.logger.info('Cache warmed up successfully');
  }

  /**
   * Get statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear local cache only
   */
  public clearLocal(): void {
    this.localCache.clear();
    if (this.localCacheOrder) {
      this.localCacheOrder = [];
    }
    this.stats.size = 0;
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Update average latency
   */
  private updateLatency(latency: number): void {
    const totalOps = this.stats.hits + this.stats.misses + this.stats.sets;
    this.stats.avgLatency =
      (this.stats.avgLatency * (totalOps - 1) + latency) / totalOps;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Close the cache coordinator
   */
  public async close(): Promise<void> {
    this.logger.info('Closing CacheCoordinator');
    this.clearLocal();
    this.initialized = false;
  }
}

/**
 * Singleton instance
 */
let instance: CacheCoordinator | null = null;

/**
 * Get or create the CacheCoordinator singleton
 */
export function getCacheCoordinator(config?: Partial<CacheConfig>): CacheCoordinator {
  if (!instance) {
    instance = new CacheCoordinator(config);
  }
  return instance;
}

/**
 * Close the CacheCoordinator singleton
 */
export async function closeCacheCoordinator(): Promise<void> {
  if (instance) {
    await instance.close();
    instance = null;
  }
}

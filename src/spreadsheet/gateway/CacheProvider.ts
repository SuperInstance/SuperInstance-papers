/**
 * POLLN Gateway Cache Provider
 * In-memory and Redis-based caching for API gateway
 */

import { randomUUID } from 'crypto';
import type { GatewayConfig } from './types.js';

/**
 * Cache entry
 */
interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessedAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
  totalMemoryBytes: number;
}

/**
 * Cache options
 */
export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number;
  maxSizeBytes?: number;
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
}

/**
 * Cache provider interface
 */
export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats(): CacheStats;
}

/**
 * In-memory cache provider
 */
export class MemoryCacheProvider implements ICacheProvider {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    evictions: 0,
    totalMemoryBytes: 0
  };
  private defaultTTL: number;
  private maxSize: number;
  private maxSizeBytes: number;
  private evictionPolicy: 'lru' | 'lfu' | 'fifo';

  constructor(config: GatewayConfig['cache'] = {}) {
    this.defaultTTL = config.ttl || 300000; // 5 minutes
    this.maxSize = config.maxSize || 10000;
    this.maxSizeBytes = config.maxSizeBytes || 100 * 1024 * 1024; // 100MB
    this.evictionPolicy = config.evictionPolicy || 'lru';

    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      this.updateHitRate();
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();

    this.stats.hits++;
    this.updateHitRate();

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const now = Date.now();
    const ttl = options?.ttl || this.defaultTTL;
    const size = this.calculateSize(value);

    // Check if we need to evict
    await this.ensureCapacity(size);

    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt: now + ttl,
      createdAt: now,
      accessCount: 0,
      lastAccessedAt: now,
      metadata: options ? { ttl, ...options } : undefined
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
    this.stats.totalMemoryBytes += size;
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.totalMemoryBytes = 0;
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() <= entry.expiresAt;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        const size = this.calculateSize(entry.value);
        this.cache.delete(key);
        this.stats.totalMemoryBytes -= size;
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Ensure capacity by evicting entries if needed
   */
  private async ensureCapacity(newItemSize: number): Promise<void> {
    // Check size limit
    while (this.cache.size >= this.maxSize || this.stats.totalMemoryBytes + newItemSize > this.maxSizeBytes) {
      const evicted = await this.evictOne();
      if (!evicted) break;
    }
  }

  /**
   * Evict one entry based on policy
   */
  private async evictOne(): Promise<boolean> {
    if (this.cache.size === 0) return false;

    let keyToEvict: string | null = null;

    switch (this.evictionPolicy) {
      case 'lru':
        // Least Recently Used
        let oldestAccess = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.lastAccessedAt < oldestAccess) {
            oldestAccess = entry.lastAccessedAt;
            keyToEvict = key;
          }
        }
        break;

      case 'lfu':
        // Least Frequently Used
        let minAccess = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.accessCount < minAccess) {
            minAccess = entry.accessCount;
            keyToEvict = key;
          }
        }
        break;

      case 'fifo':
        // First In First Out
        let oldestCreated = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.createdAt < oldestCreated) {
            oldestCreated = entry.createdAt;
            keyToEvict = key;
          }
        }
        break;
    }

    if (keyToEvict) {
      const entry = this.cache.get(keyToEvict);
      if (entry) {
        const size = this.calculateSize(entry.value);
        this.cache.delete(keyToEvict);
        this.stats.totalMemoryBytes -= size;
        this.stats.evictions++;
        this.stats.size = this.cache.size;
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate approximate size of value
   */
  private calculateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate (2 bytes per char)
    } catch {
      return 100; // Default estimate
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Cache key builder
 */
export class CacheKeyBuilder {
  static build(prefix: string, parts: (string | number)[]): string {
    parts.sort();
    return `${prefix}:${parts.join(':')}`;
  }

  static forRequest(method: string, path: string, query?: Record<string, string>): string {
    const parts = [method.toUpperCase(), path];
    if (query) {
      const sortedQuery = Object.keys(query).sort().map(k => `${k}=${query[k]}`);
      parts.push(...sortedQuery);
    }
    return this.build('req', parts);
  }

  static forResponse(route: string, identifier: string): string {
    return this.build('resp', [route, identifier]);
  }

  static forRateLimit(identifier: string, window: string): string {
    return this.build('rl', [identifier, window]);
  }

  static forAuth(token: string): string {
    return this.build('auth', [token.substring(0, 16)]);
  }
}

/**
 * Cache decorator for memoizing function results
 */
export function Cacheable(
  cacheProvider: ICacheProvider,
  keyPrefix: string,
  options?: CacheOptions
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = CacheKeyBuilder.build(keyPrefix, [
        propertyKey,
        ...args.map(a => String(a ?? ''))
      ]);

      // Try to get from cache
      const cached = await cacheProvider.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      await cacheProvider.set(cacheKey, result, options);

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation helper
 */
export class CacheInvalidator {
  constructor(private cacheProvider: ICacheProvider) {}

  async invalidatePattern(pattern: string): Promise<void> {
    if (this.cacheProvider instanceof MemoryCacheProvider) {
      const stats = this.cacheProvider.getStats();
      // For in-memory, we'd need to track keys by pattern
      // This is a simplified implementation
      await this.cacheProvider.clear();
    }
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    if (this.cacheProvider instanceof MemoryCacheProvider) {
      // Similar to pattern matching
      await this.cacheProvider.clear();
    }
  }
}

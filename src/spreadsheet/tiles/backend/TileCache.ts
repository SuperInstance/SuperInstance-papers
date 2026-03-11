/**
 * Tile Cache - KV-Cache Sharing
 *
 * Enables multiple tiles to share cached key-value states:
 * reducing memory and and improving performance
 *
 * Features:
 * - LRU/LRU cache eviction
 * - Configurable max size
 * - Cache hit/miss tracking
 * - Automatic cleanup of expired entries
 *
 * Part of Phase 2: Infrastructure
 */

import { Tile } from '../core/Tile';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Cache entry
 */
interface CacheEntry {
  key: string;
  value: unknown;
  timestamp: number;
  accessCount: number;
  size: number;
}

/**
 * Cache configuration
 */
export interface TileCacheConfig {
  /** Maximum cache size in bytes */
  maxSize?: number;
  /** Time to live for cache entries in ms */
  ttl?: number;
  /** Enable LRU eviction */
  lruEviction?: boolean;
  /** Enable size tracking */
  trackSize?: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  entries: number;
}

// ============================================================================
// TILE CACHE
// ============================================================================

/**
 * TileCache - Shared KV-cache for tile execution
 *
 * Enables tiles to share cached computation results:
 */
export class TileCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: Required<TileCacheConfig>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    entries: 0,
  };

  private maxSize: number;
  private ttl: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: TileCacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? 100 * 1024 * 1024, // 100MB default
      ttl: config.ttl ?? 60000, // 60 seconds default
      lruEviction: config.lruEviction ?? true,
      trackSize: config.trackSize ?? true,
    };
    this.maxSize = this.config.maxSize;
    this.ttl = this.config.ttl;

    // Start cleanup interval if TTL is set
    if (this.ttl > 0) {
      this.cleanupInterval = setInterval(() => this.cleanupExpired(), Math.min(this.ttl / 2, 30000));
    }
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    entry.accessCount++;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      this.stats.evictions++;
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T): void {
    const size = this.calculateSize(value);

    // Check if we need to evict
    while (this.stats.size + size > this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 1,
      size,
    };

    this.cache.set(key, entry);
    this.stats.entries = this.cache.size;
    this.stats.size += size;
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.stats.entries--;
      this.stats.size -= entry.size;
      return true;
    }
    return false;
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.entries = 0;
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        this.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.stats.evictions += expiredCount;
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Save cache to file (persistence)
   */
  async saveToFile(filePath: string): Promise<void> {
    const data = {
      config: this.config,
      entries: Array.from(this.cache.entries()),
      stats: this.stats,
      timestamp: Date.now(),
    };

    // In a real implementation, we would write to file
    // For now, we'll just log that this method would be called
    console.log(`[TileCache] Would save ${this.cache.size} entries to ${filePath}`);
    // Actual implementation would use fs.promises.writeFile
  }

  /**
   * Load cache from file (persistence)
   */
  async loadFromFile(filePath: string): Promise<void> {
    // In a real implementation, we would read from file
    // For now, we'll just log that this method would be called
    console.log(`[TileCache] Would load from ${filePath}`);
    // Actual implementation would use fs.promises.readFile
    // and validate/restore entries
  }

  /**
   * Evict least recently used entry (LRU)
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruAccess = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < lruAccess) {
        lruKey = key;
        lruAccess = entry.accessCount;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Calculate size of a value in bytes
   */
  private calculateSize(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }

    switch (typeof value) {
      case 'boolean':
        return 4; // Boolean size approximation
      case 'number':
        return 8; // 64-bit float
      case 'string':
        // UTF-16 string: 2 bytes per character + overhead
        return value.length * 2 + 8;
      case 'object':
        if (Array.isArray(value)) {
          // Array: sum of elements + array overhead
          return value.reduce((sum, item) => sum + this.calculateSize(item), 0) + 16;
        } else if (value instanceof Date) {
          return 8; // Date object size
        } else if (value instanceof Buffer) {
          return value.length; // Buffer size is exact
        } else {
          // Object: sum of property values + object overhead
          let size = 16; // Object overhead
          for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
              size += key.length * 2 + 8; // Key size
              size += this.calculateSize((value as Record<string, unknown>)[key]);
            }
          }
          return size;
        }
      default:
        // Function, symbol, etc.
        return 8;
    }
  }
}

/**
 * Shared instance
 */
export const tileCache = new TileCache();

/**
 * Get global cache size in bytes
 */
export function getCacheSize(): number {
  return tileCache.stats.size;
}

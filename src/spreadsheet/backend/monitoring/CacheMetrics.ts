/**
 * CacheMetrics.ts
 *
 * Cache performance metrics for multi-tier caching system.
 * Tracks hit/miss rates, eviction counts, promotion/demotion rates, and latency by tier.
 */

import { getMetricsCollector, MetricLabels } from './MetricsCollector';

/**
 * Cache tiers
 */
export enum CacheTier {
  L1 = 'l1',    // In-memory cache
  L2 = 'l2',    // Redis cache
  L3 = 'l3',    // Persistent cache
}

/**
 * Cache operation types
 */
export enum CacheOperation {
  GET = 'get',
  SET = 'set',
  DELETE = 'delete',
  CLEAR = 'clear',
  PROMOTE = 'promote',
  DEMOTE = 'demote',
  EVICT = 'evict',
}

/**
 * Cache operation result
 */
export enum CacheResult {
  HIT = 'hit',
  MISS = 'miss',
  SUCCESS = 'success',
  FAILURE = 'failure',
}

/**
 * Cache entry metadata
 */
interface CacheEntryMetrics {
  tier: CacheTier;
  key: string;
  size: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  hitCount: number;
  missCount: number;
}

/**
 * Cache-specific metrics manager
 */
export class CacheMetrics {
  private readonly metrics = getMetricsCollector();
  private readonly entries = new Map<string, CacheEntryMetrics>();
  private readonly tierSizes = new Map<CacheTier, number>();

  /**
   * Track a cache GET operation
   */
  trackGet(tier: CacheTier, key: string, hit: boolean, duration: number): void {
    // Track operation count
    this.metrics.incrementCacheOperations({
      tier,
      operation: CacheOperation.GET,
      status_code: hit ? CacheResult.HIT : CacheResult.MISS,
    });

    // Track operation duration
    this.metrics.observeCacheOperationDuration(duration, {
      tier,
      operation: CacheOperation.GET,
    });

    // Update entry metrics
    const entry = this.entries.get(key);
    if (entry) {
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
      if (hit) {
        entry.hitCount++;
      } else {
        entry.missCount++;
      }
    }
  }

  /**
   * Track a cache SET operation
   */
  trackSet(tier: CacheTier, key: string, size: number, duration: number): void {
    // Track operation count
    this.metrics.incrementCacheOperations({
      tier,
      operation: CacheOperation.SET,
      status_code: CacheResult.SUCCESS,
    });

    // Track operation duration
    this.metrics.observeCacheOperationDuration(duration, {
      tier,
      operation: CacheOperation.SET,
    });

    // Update entry metrics
    const now = Date.now();
    const existingEntry = this.entries.get(key);

    if (existingEntry) {
      // Update existing entry
      existingEntry.size = size;
      existingEntry.lastAccessedAt = now;
    } else {
      // Create new entry
      this.entries.set(key, {
        tier,
        key,
        size,
        createdAt: now,
        lastAccessedAt: now,
        accessCount: 0,
        hitCount: 0,
        missCount: 0,
      });
    }

    // Update tier size
    const currentSize = this.tierSizes.get(tier) || 0;
    this.tierSizes.set(tier, currentSize + size);

    // Update cache size gauge
    this.updateCacheSizeGauge();
  }

  /**
   * Track a cache DELETE operation
   */
  trackDelete(tier: CacheTier, key: string, duration: number): void {
    // Track operation count
    this.metrics.incrementCacheOperations({
      tier,
      operation: CacheOperation.DELETE,
      status_code: CacheResult.SUCCESS,
    });

    // Track operation duration
    this.metrics.observeCacheOperationDuration(duration, {
      tier,
      operation: CacheOperation.DELETE,
    });

    // Remove entry metrics
    const entry = this.entries.get(key);
    if (entry) {
      // Update tier size
      const currentSize = this.tierSizes.get(tier) || 0;
      this.tierSizes.set(tier, Math.max(0, currentSize - entry.size));

      this.entries.delete(key);

      // Update cache size gauge
      this.updateCacheSizeGauge();
    }
  }

  /**
   * Track a cache CLEAR operation
   */
  trackClear(tier: CacheTier, duration: number): void {
    // Track operation count
    this.metrics.incrementCacheOperations({
      tier,
      operation: CacheOperation.CLEAR,
      status_code: CacheResult.SUCCESS,
    });

    // Track operation duration
    this.metrics.observeCacheOperationDuration(duration, {
      tier,
      operation: CacheOperation.CLEAR,
    });

    // Clear entries for this tier
    for (const [key, entry] of this.entries.entries()) {
      if (entry.tier === tier) {
        this.entries.delete(key);
      }
    }

    // Reset tier size
    this.tierSizes.set(tier, 0);

    // Update cache size gauge
    this.updateCacheSizeGauge();
  }

  /**
   * Track a cache promotion (moving entry to a higher tier)
   */
  trackPromotion(fromTier: CacheTier, toTier: CacheTier, key: string): void {
    // Track promotion operation
    this.metrics.incrementCacheOperations({
      tier: toTier,
      operation: CacheOperation.PROMOTE,
      status_code: CacheResult.SUCCESS,
    });

    // Update entry tier
    const entry = this.entries.get(key);
    if (entry) {
      // Update tier sizes
      const fromSize = this.tierSizes.get(fromTier) || 0;
      const toSize = this.tierSizes.get(toTier) || 0;

      this.tierSizes.set(fromTier, Math.max(0, fromSize - entry.size));
      this.tierSizes.set(toTier, toSize + entry.size);

      entry.tier = toTier;

      // Update cache size gauge
      this.updateCacheSizeGauge();
    }
  }

  /**
   * Track a cache demotion (moving entry to a lower tier)
   */
  trackDemotion(fromTier: CacheTier, toTier: CacheTier, key: string): void {
    // Track demotion operation
    this.metrics.incrementCacheOperations({
      tier: toTier,
      operation: CacheOperation.DEMOTE,
      status_code: CacheResult.SUCCESS,
    });

    // Update entry tier
    const entry = this.entries.get(key);
    if (entry) {
      // Update tier sizes
      const fromSize = this.tierSizes.get(fromTier) || 0;
      const toSize = this.tierSizes.get(toTier) || 0;

      this.tierSizes.set(fromTier, Math.max(0, fromSize - entry.size));
      this.tierSizes.set(toTier, toSize + entry.size);

      entry.tier = toTier;

      // Update cache size gauge
      this.updateCacheSizeGauge();
    }
  }

  /**
   * Track a cache eviction
   */
  trackEviction(tier: CacheTier, key: string, reason: string): void {
    // Track eviction operation
    this.metrics.incrementCacheOperations({
      tier,
      operation: CacheOperation.EVICT,
      status_code: reason,
    });

    // Remove entry metrics
    const entry = this.entries.get(key);
    if (entry) {
      // Update tier size
      const currentSize = this.tierSizes.get(tier) || 0;
      this.tierSizes.set(tier, Math.max(0, currentSize - entry.size));

      this.entries.delete(key);

      // Update cache size gauge
      this.updateCacheSizeGauge();
    }
  }

  /**
   * Track a cache error
   */
  trackError(tier: CacheTier, operation: CacheOperation, error: Error): void {
    this.metrics.incrementErrors({
      error_type: error.name || 'cache_error',
      cell_type: `${tier}_${operation}`,
    });
  }

  /**
   * Calculate hit rate for a specific tier
   */
  getHitRate(tier: CacheTier): number {
    let hits = 0;
    let misses = 0;

    for (const entry of this.entries.values()) {
      if (entry.tier === tier) {
        hits += entry.hitCount;
        misses += entry.missCount;
      }
    }

    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  }

  /**
   * Calculate miss rate for a specific tier
   */
  getMissRate(tier: CacheTier): number {
    return 1 - this.getHitRate(tier);
  }

  /**
   * Get cache size for a specific tier
   */
  getTierSize(tier: CacheTier): number {
    return this.tierSizes.get(tier) || 0;
  }

  /**
   * Get entry count for a specific tier
   */
  getTierEntryCount(tier: CacheTier): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (entry.tier === tier) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get average entry size for a specific tier
   */
  getAverageEntrySize(tier: CacheTier): number {
    const count = this.getTierEntryCount(tier);
    const size = this.getTierSize(tier);
    return count > 0 ? size / count : 0;
  }

  /**
   * Get cache statistics for all tiers
   */
  getCacheStats(): {
    [key in CacheTier]: {
      size: number;
      entryCount: number;
      hitRate: number;
      missRate: number;
      averageEntrySize: number;
    };
  } {
    return {
      [CacheTier.L1]: {
        size: this.getTierSize(CacheTier.L1),
        entryCount: this.getTierEntryCount(CacheTier.L1),
        hitRate: this.getHitRate(CacheTier.L1),
        missRate: this.getMissRate(CacheTier.L1),
        averageEntrySize: this.getAverageEntrySize(CacheTier.L1),
      },
      [CacheTier.L2]: {
        size: this.getTierSize(CacheTier.L2),
        entryCount: this.getTierEntryCount(CacheTier.L2),
        hitRate: this.getHitRate(CacheTier.L2),
        missRate: this.getMissRate(CacheTier.L2),
        averageEntrySize: this.getAverageEntrySize(CacheTier.L2),
      },
      [CacheTier.L3]: {
        size: this.getTierSize(CacheTier.L3),
        entryCount: this.getTierEntryCount(CacheTier.L3),
        hitRate: this.getHitRate(CacheTier.L3),
        missRate: this.getMissRate(CacheTier.L3),
        averageEntrySize: this.getAverageEntrySize(CacheTier.L3),
      },
    };
  }

  /**
   * Get most frequently accessed entries
   */
  getTopEntries(limit: number = 10): CacheEntryMetrics[] {
    return Array.from(this.entries.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Get least recently used entries
   */
  getLRUEntries(limit: number = 10): CacheEntryMetrics[] {
    return Array.from(this.entries.values())
      .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)
      .slice(0, limit);
  }

  /**
   * Get entries by access count range
   */
  getEntriesByAccessCount(min: number, max: number): CacheEntryMetrics[] {
    return Array.from(this.entries.values()).filter(
      entry => entry.accessCount >= min && entry.accessCount <= max
    );
  }

  /**
   * Update cache size gauge for all tiers
   */
  private updateCacheSizeGauge(): void {
    for (const tier of Object.values(CacheTier)) {
      const size = this.tierSizes.get(tier) || 0;
      this.metrics.setCacheSize(size, tier);
    }
  }

  /**
   * Clean up stale cache entries
   */
  cleanupStaleEntries(maxAge: number = 3600000): void {
    const now = Date.now();
    const staleEntries: Array<{ tier: CacheTier; key: string }> = [];

    for (const entry of this.entries.values()) {
      if (now - entry.lastAccessedAt > maxAge) {
        staleEntries.push({ tier: entry.tier, key: entry.key });
      }
    }

    // Evict stale entries
    for (const { tier, key } of staleEntries) {
      this.trackEviction(tier, key, 'stale');
    }

    return staleEntries.length;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.entries.clear();
    this.tierSizes.clear();
    this.updateCacheSizeGauge();
  }

  /**
   * Get entry metrics for a specific key
   */
  getEntryMetrics(key: string): CacheEntryMetrics | undefined {
    return this.entries.get(key);
  }

  /**
   * Check if a key exists in the cache
   */
  hasKey(key: string): boolean {
    return this.entries.has(key);
  }

  /**
   * Get all keys for a specific tier
   */
  getKeysByTier(tier: CacheTier): string[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.tier === tier)
      .map(entry => entry.key);
  }
}

/**
 * Singleton instance of CacheMetrics
 */
let cacheMetricsInstance: CacheMetrics | null = null;

/**
 * Get or create the CacheMetrics singleton
 */
export function getCacheMetrics(): CacheMetrics {
  if (!cacheMetricsInstance) {
    cacheMetricsInstance = new CacheMetrics();
  }
  return cacheMetricsInstance;
}

/**
 * Reset the CacheMetrics singleton (useful for testing)
 */
export function resetCacheMetrics(): void {
  if (cacheMetricsInstance) {
    cacheMetricsInstance.reset();
  }
  cacheMetricsInstance = null;
}

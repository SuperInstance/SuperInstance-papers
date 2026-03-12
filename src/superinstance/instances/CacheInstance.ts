/**
 * CacheInstance - Implementation for caching instances
 */

import {
  BaseSuperInstance, InstanceType, InstanceState, InstanceCapability,
  CellPosition, InstanceConfiguration, InstancePermissions,
  InstanceMessage, InstanceMessageResponse, InstanceStatus, InstanceMetrics,
  Connection, ConnectionType, InstanceSnapshot, RateBasedState
} from '../types/base';

/**
 * CachePolicy - Caching policy configuration
 */
export interface CachePolicy {
  policyType: 'FIFO' | 'LRU' | 'LFU' | 'TTL' | 'NONE';
  maxSize?: number;
  ttl?: number; // milliseconds
  evictionInterval?: number; // milliseconds
  samplingSize?: number; // for probabilistic eviction
}

/**
 * CacheEntry - Individual cache entry
 */
export interface CacheEntry {
  key: string;
  value: any;
  hits: number;
  createdAt: number;
  accessedAt: number;
  expiresAt?: number;
  size: number;
  metadata?: Record<string, any>;
}

/**
 * CacheMetrics - Detailed cache metrics
 */
export interface CacheMetrics {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  totalExpirations: number;
  hitRate: number;
  missRate: number;
  evictionRate: number;
  averageEntrySize: number;
  maxEntrySize: number;
  minEntrySize: number;
  totalSize: number;
  oldestEntryAge: number;
  newestEntryAge: number;
}

/**
 * BatchGetResult - Result of batch get operations
 */
export interface BatchGetResult {
  found: Record<string, CacheEntry>;
  missing: string[];
  stats: {
    hits: number;
    misses: number;
    total: number;
  };
}

/**
 * CachePrefetchConfig - Prefetch configuration
 */
export interface CachePrefetchConfig {
  enabled: boolean;
  strategy: 'sequential' | 'parallel' | 'demand';
  prefetchDistance: number; // how many ahead to prefetch
  prefetchSize: number;     // how many items per prefetch
  prefetchThreshold: number; // hit rate threshold to trigger prefetch
}

/**
 * CacheInstance - Interface for caching instances
 */
export interface CacheInstance {
  type: InstanceType.CACHE;
  policy: CachePolicy;

  // Core operations
  set(key: string, value: any, ttl?: number): Promise<void>;
  get(key: string): Promise<any>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;

  // Batch operations
  batchSet(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void>;
  batchGet(keys: string[]): Promise<BatchGetResult>;
  []<key>(...keys: string[]): Promise<void>;

  // Advanced operations
  getEntry(key: string): Promise<CacheEntry | undefined>;
  getMultiple(keys: string[]): Promise<Array<{ key: string; value: any } | undefined>>;
  peek(key: string): Promise<any | undefined>; // get without updating access time
  update(key: string, value: any): Promise<void>;
  increment(key: string, amount?: number): Promise<number>;
  decrement(key: string, amount?: number): Promise<number>;

  // Prefetch operations
  enablePrefetch(config: CachePrefetchConfig): void;
  disablePrefetch(): void;
  prefetch(predictedKeys: string[]): Promise<void>;

  // Expiration management
  setExpiration(key: string, expiresAt: number): Promise<void>;
  getExpiration(key: string): Promise<number | undefined>;
  touch(key: string): Promise<void>; // update access time
  expire(key: string): Promise<void>; // set immediate expiration

  // Statistics and monitoring
  getCacheMetrics(): CacheMetrics;
  getStatistics(): {
    totalSize: number;
    entryCount: number;
    hitRate: number;
    missRate: number;
    evictionCount: number;
    expirationCount: number;
    performance: {
      getTime: number;
      setTime: number;
      deleteTime: number;
    };
  };

  // Policy management
  updatePolicy(newPolicy: CachePolicy): Promise<void>;
  evict(entries?: CacheEntry[]): Promise<CacheEntry[]>;
  refresh(key: string): Promise<void>; // refresh metadata without changing value

  // Export/Import
  exportCache(): Promise<{
    entries: CacheEntry[];
    metadata: {
      exportTime: number;
      policy: CachePolicy;
      metrics: CacheMetrics;
    };
  }>;
  importCache(data: {
    entries: CacheEntry[];
    metadata: {
      policy: CachePolicy;
    };
  }): Promise<void>;
}

/**
 * ConcreteCacheInstance - Implementation of CacheInstance
 */
export class ConcreteCacheInstance extends BaseSuperInstance implements CacheInstance {
  type = InstanceType.CACHE;
  policy: CachePolicy;
  private cache: Map<string, CacheEntry> = new Map();
  private metricsCache = new Map<string, { timestamp: number; value: any }[]>();
  private prefetch: boolean = false;
  private prefetchConfig?: CachePrefetchConfig;
  private evictionTimer?: NodeJS.Timeout;

  constructor(config: {
    id: string;
    name: string;
    description: string;
    cellPosition: CellPosition;
    spreadsheetId: string;
    policy?: Partial<CachePolicy>;
    configuration?: Partial<InstanceConfiguration>;
  }) {
    super({
      id: config.id,
      type: InstanceType.CACHE,
      name: config.name,
      description: config.description,
      cellPosition: config.cellPosition,
      spreadsheetId: config.spreadsheetId,
      configuration: config.configuration,
      capabilities: ['read', 'write', 'storage']
    });

    this.policy = {
      policyType: 'LRU',
      maxSize: 1000,
      ttl: 3600000, // 1 hour
      evictionInterval: 300000, // 5 minutes
      samplingSize: 5,
      ...config.policy
    };
  }

  async initialize(config?: Partial<InstanceConfiguration>): Promise<void> {
    if (config) {
      this.configuration = { ...this.configuration, ...config };
    }

    // Initialize rate-based state for cache metrics
    this.rateState = {
      currentValue: {
        operationRate: 0,
        hitRate: 0,
        cacheUtilization: 0,
        active: true
      },
      rateOfChange: {
        value: 0,
        acceleration: 0,
        timestamp: Date.now(),
        confidence: 1.0
      },
      lastUpdate: Date.now(),
      predictState: (atTime: number) => {
        if (!this.rateState) return { active: true };

        const dt = (atTime - this.rateState.lastUpdate) / 1000;
        if (dt <= 0) return this.rateState.currentValue;

        const currentCnt = this.cache.size;
        const entryGrowth = this.rateState.currentValue.operationRate / 1000;

        return {
          operationRate: this.rateState.currentValue.operationRate,
          hitRate: this.rateState.currentValue.hitRate,
          cacheUtilization: Math.min((currentCnt + entryGrowth * dt) / this.policy.maxSize!, 1),
          active: true
        };
      }
    };
  }

  async activate(): Promise<void> {
    if (this.state !== InstanceState.INITIALIZED && this.state !== InstanceState.IDLE) {
      throw new Error(`Cannot activate from state: ${this.state}`);
    }

    // Start eviction if needed
    if (this.policy.evictionInterval) {
      this.startEviction();
    }

    this.updateState(InstanceState.RUNNING);
  }

  async deactivate(): Promise<void> {
    // Stop eviction
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
      this.evictionTimer = undefined;
    }

    this.updateState(InstanceState.IDLE);
  }

  async terminate(): Promise<void> {
    await this.deactivate();

    // Clear all data
    this.cache.clear();
    this.metricsCache.clear();

    this.updateState(InstanceState.TERMINATED);
  }

  async serialize(): Promise<InstanceSnapshot> {
    // Export cache data
    const cacheEntries = Array.from(this.cache.values());

    return {
      id: this.id,
      type: this.type,
      state: this.state,
      data: {
        configuration: this.configuration,
        policy: this.policy,
        cacheEntries: cacheEntries,
        prefetchEnabled: this.prefetch,
        prefetchConfig: this.prefetchConfig,
        metrics: this.getCacheMetrics(),
        operationMetrics: this.getStatistics()
      },
      configuration: this.configuration,
      timestamp: Date.now(),
      version: '1.0.0',
      rateState: this.rateState,
      originReference: this.originReference
    };
  }

  async deserialize(snapshot: InstanceSnapshot): Promise<void> {
    if (snapshot.type !== InstanceType.CACHE) {
      throw new Error(`Cannot deserialize snapshot of type ${snapshot.type} into Cache`);
    }

    const data = snapshot.data;
    this.configuration = data.configuration;
    this.policy = data.policy;
    this.prefetch = data.prefetchEnabled;
    this.prefetchConfig = data.prefetchConfig;

    // Restore cache entries
    this.cache.clear();
    data.cacheEntries.forEach((entry: CacheEntry) => {
      this.cache.set(entry.key, entry);
    });

    this.rateState = data.rateState;
    this.originReference = data.originReference;

    this.updateState(snapshot.state);
  }

  // Core operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const now = Date.now();
    const effectiveTtl = ttl ?? this.policy.ttl;

    // Calculate size estimate
    const size = this.estimateSize(value);

    // Check if we need to evict before adding
    if (this.policy.maxSize && this.cache.size >= this.policy.maxSize!) {
      await this.evict();
    }

    const entry: CacheEntry = {
      key,
      value: this.cloneValue(value),
      hits: 0,
      createdAt: now,
      accessedAt: now,
      expiresAt: effectiveTtl ? now + effectiveTtl : undefined,
      size
    };

    this.cache.set(key, entry);
    this.lastActive = now;

    // Update metrics
    this.recordOperation('set', performance.now() - now);
  }

  async get(key: string): Promise<any> {
    const startTime = performance.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.recordOperation('get', performance.now() - startTime);
      throw new Error(`Key ${key} not found in cache`);
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.recordOperation('get', performance.now() - startTime);
      throw new Error(`Key ${key} has expired (-expired)`);
    }

    // Update access time and hits
    entry.accessedAt = Date.now();
    entry.hits++;

    this.lastActive = Date.now();
    this.recordOperation('get', performance.now() - startTime);

    return this.cloneValue(entry.value);
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async delete(key: string): Promise<void> {
    const startTime = performance.now();
    this.cache.delete(key);
    this.lastActive = performance.now();

    // Update metrics
    this.recordOperation('delete', this.lastActive - startTime);
  }

  async clear(): Promise<void> {
    const startTime = performance.now();
    const size = this.cache.size;
    this.cache.clear();

    // Recording time taken to clear entire cache
    this.recordOperation('clear', performance.now() - startTime);

    // Update rate state based on cache operations
    this.updateRateState({
      operationRate: (Date.now() - this.createdAt) / 1000,
      hitRate: 0, // Reset as cache is now empty
      cacheUtilization: 0,
      active: true
    });
  }

  // Batch operations
  async batchSet(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    const startTime = Date.now();
    const promises = entries.map(entry => {
      // Estimate data size and check limit
      const size = this.estimateSize(entry.value);
      if (size > 10 * 1024 * 1024) { // 10MB max individual
        console.warn(`Large cache item detected: ${size} bytes`);
      }
      return this.set(entry.key, entry.value, entry.ttl);
    });

    await Promise.all(promises);

    this.recordOperation('batchSet', performance.now() - startTime);
  }

  async batchGet(keys: string[]): Promise<BatchGetResult> {
    const startTime = Date.now();
    const results: BatchGetResult = {
      found: {},
      missing: [],
      stats: { hits: 0, misses: 0, total: keys.length }
    };

    const promises = keys.map(async key => {
      try {
        const entry = await this.getEntry(key);
        if (entry) {
          results.found[key] = entry;
          results.stats.hits++;
        } else {
          results.missing.push(key);
          results.stats.misses++;
        }
      } catch (error) {
        results.missing.push(key);
        results.stats.misses++;
      }
    });

    await Promise.all(promises);

    this.recordOperation('batchGet', performance.now() - startTime);

    return results;
  }

  async batchDelete(...keys: string[]): Promise<void> {
    const deletePromises = keys.map(key => this.delete(key));

    await Promise.all(deletePromises);
  }

  // Advanced operations
  async getEntry(key: string): Promise<CacheEntry | undefined> {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return this.cloneValue(entry);
  }

  async getMultiple(keys: string[]): Promise<Array<{ key: string; value: any } | undefined>> {
    return Promise.all(
      keys.map(async key => {
        try {
          const value = await this.get(key);
          return { key, value };
        } catch {
          return undefined;
        }
      })
    );
  }

  async peek(key: string): Promise<any | undefined> {
    // Get without updating access time
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return this.cloneValue(entry.value);
  }

  async update(key: string, value: any): Promise<void> {
    const entry = this.cache.get(key);

    if (!entry) {
      throw new Error(`Key ${key} not found in cache`);
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      throw new Error(`Key ${key} has expired`);
    }

    // Update value and size
    const oldSize = entry.size;
    entry.value = this.cloneValue(value);
    entry.size = this.estimateSize(value);

    // Update metrics cache with estimated operation time
    this.recordOperation('update', Math.abs(oldSize - entry.size));
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    const entry = this.cache.get(key);

    if (!entry) {
      // Create new entry with 0
      await this.set(key, amount);
      return amount;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      await this.set(key, amount);
      return amount;
    }

    // Update value
    if (typeof entry.value !== 'number') {
      entry.value = Number(entry.value) || 0;
    }

    entry.value += amount;
    entry.size = this.estimateSize(entry.value);
    entry.accessedAt = Date.now();

    this.recordOperation('increment', amount);

    return entry.value;
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    return this.increment(key, -amount);
  }

  // Prefetch operations
  enablePrefetch(config: CachePrefetchConfig): void {
    this.prefetch = true;
    this.prefetchConfig = config;
  }

  disablePrefetch(): void {
    this.prefetch = false;
    this.prefetchConfig = undefined;
  }

  async prefetch(predictedKeys: string[]): Promise<void> {
    if (!this.prefetchConfig?.enabled) return;

    const startTime = Date.now();
    const config = this.prefetchConfig!;

    if (config.threshold) {
      const metrics = this.getCacheMetrics();
      if (metrics.hitRate < config.threshold) return;
    }

    const keysToPrefetch = predictedKeys.slice(0, config.prefetchSize);

    switch (config.strategy) {
      case 'parallel':
        await this.batchGet(keysToPrefetch);
        break;

      case 'sequential':
        for (const key of keysToPrefetch) {
          await this.get(key);
        }
        break;

      case 'demand':
        // Lazy loading - just push to buffer for future
        break;
    }

    console.log(`Prefetched ${keysToPrefetch.length} keys in ${performance.now() - startTime}ms`);
  }

  // Expiration management
  async setExpiration(key: string, expiresAt: number): Promise<void> {
    const entry = this.cache.get(key);
    if (!entry) {
      throw new Error(`Key ${key} not found in cache`);
    }

    entry.expiresAt = expiresAt;
  }

  async getExpiration(key: string): Promise<number | undefined> {
    const entry = this.cache.get(key);
    return entry?.expiresAt;
  }

  async touch(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (!entry) {
      throw new Error(`Key ${key} not found in cache`);
    }

    entry.accessedAt = Date.now();
  }

  async expire(key: string): Promise<void> {
    await this.setExpiration(key, Date.now());
  }

  // Statistics and monitoring
  getCacheMetrics(): CacheMetrics {
    const now = Date.now();
    const entries = Array.from(this.cache.values());

    let totalHits = 0;
    let totalMisses = this.metricsCache.get('misses')?.length || 0;
    let totalSize = 0;
    let oldestEntryAge = 0;
    let newestEntryAge = 0;
    let maxEntrySize = 0;
    let minEntrySize = Infinity;

    entries.forEach(entry => {
      totalHits += entry.hits;
      totalSize += entry.size;

      maxEntrySize = Math.max(maxEntrySize, entry.size);
      minEntrySize = Math.min(minEntrySize, entry.size);
      oldestEntryAge = Math.max(oldestEntryAge, now - entry.createdAt);
      newestEntryAge = Math.min(newestEntryAge, now - entry.createdAt);
    });

    minEntrySize = minEntrySize === Infinity ? 0 : minEntrySize;

    return {
      totalEntries: entries.length,
      totalHits,
      totalMisses,
      totalEvictions: this.metricsCache.get('evictions')?.length || 0,
      totalExpirations: this.metricsCache.get('expirations')?.length || 0,
      hitRate: hits / (hits + misses) || 0,
      missRate: misses / (hits + misses) || 0,
      evictionRate: totalEvictions / now - this.createdAt || 0,
      averageEntrySize: entries.length > 0 ? totalSize / entries.length : 0,
      maxEntrySize,
      minEntrySize,
      totalSize,
      oldestEntryAge,
      newestEntryAge
    };
  }

  getStatistics(): {
    totalSize: number;
    entryCount: number;
    hitRate: number;
    missRate: number;
    evictionCount: number;
    expirationCount: number;
    performance: {
      getTime: number;
      setTime: number;
      deleteTime: number;
    };
  } {
    const metrics = this.getCacheMetrics();
    const performance = this.getPerformanceMetrics();

    return {
      totalSize: metrics.totalSize,
      entryCount: metrics.totalEntries,
      hitRate: metrics.hitRate,
      missRate: metrics.missRate,
      evictionCount: metrics.totalEvictions,
      expirationCount: metrics.totalExpirations,
      performance
    };
  }

  // Policy management
  async updatePolicy(newPolicy: CachePolicy): Promise<void> {
    this.policy = newPolicy;

    // Restart eviction if interval changed
    if (this.policy.evictionInterval !== this.policy.evictionInterval) {
      if (this.evictionTimer) {
        clearInterval(this.evictionTimer);
      }
      this.startEviction();
    }

    // Check size constraint immediately
    if (this.policy.maxSize && this.cache.size > this.policy.maxSize) {
      await this.evictUntilSize();
    }
  }

  async evict(entries?: CacheEntry[]): Promise<CacheEntry[]> {
    const evicted: CacheEntry[] = [];

    if (entries?.length) {
      // Specific entries
      for (const entry of entries) {
        this.cache.delete(entry.key);
        this.recordEviction(entry);
        evicted.push(entry);
      }
    } else {
      // Policy-based eviction
      switch (this.policy.policyType) {
        case 'FIFO':
          await this.evictFIFO();
          break;
        case 'LRU':
          await this.evictLRU();
          break;
        case 'LFU':
          await this.evictLFU();
          break;
        case 'TTL':
          await this.evictExpired();
          break;
        default:
          console.log(`Unknown eviction policy: ${this.policy.policyType}`);
      }
    }

    return evicted;
  }

  async refresh(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessedAt = Date.now();
      this.recordOperation('refresh', 0);
    }
  }

  // Export/Import
  async exportCache(): Promise<{
    entries: CacheEntry[];
    metadata: {
      exportTime: number;
      policy: CachePolicy;
      metrics: CacheMetrics;
    };
  }> {
    return {
      entries: Array.from(this.cache.values()),
      metadata: {
        exportTime: Date.now(),
        policy: { ...this.policy },
        metrics: this.getCacheMetrics()
      }
    };
  }

  async importCache(data: {
    entries: CacheEntry[];
    metadata: {
      policy: CachePolicy;
    };
  }): Promise<void> {
    this.cache.clear();

    // Import entries
    for (const entry of data.entries) {
      // Check if entry is expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) continue;

      this.cache.set(entry.key, entry);
    }

    // Update policy if needed
    if (data.metadata.policy) {
      this.policy = data.metadata.policy;
    }
  }

  // Relationship methods
  async getStatus(): Promise<InstanceStatus> {
    return {
      state: this.state,
      health: this.calculateHealth(),
      uptime: Date.now() - this.createdAt,
      warnings: this.getWarnings(),
      lastError: undefined
    };
  }

  async getMetrics(): Promise<InstanceMetrics> {
    const metrics = this.getCacheMetrics();
    const stats = this.getStatistics();

    return {
      cpuUsage: stats.performance.getTime / 1000 * 100, // Convert ms to %
      memoryUsage: metrics.totalSize / 1024 / 1024, // MB
      diskUsage: 0,
      networkIn: 0,
      networkOut: 0,
      requestCount: metrics.totalHits + metrics.totalMisses,
      errorRate: this.cache.size > this.policy.maxSize! ? 0.1 : 0,
      latency: {
        p50: stats.performance.getTime,
        p90: stats.performance.getTime * 1.5,
        p95: stats.performance.getTime * 2,
        p99: stats.performance.getTime * 3,
        max: stats.performance.getTime * 5
      }
    };
  }

  // Private helper methods
  private estimateSize(value: any): number {
    // Return the estimated size of the value in memory. This is a very rough estimate.
    if (value === null || value === undefined) return 0;

    switch (typeof value) {
      case 'boolean': return 4;
      case 'number': return 8;
      case 'string': return value.length * 2;
      case 'object':
        if (Array.isArray(value)) {
          return value.reduce((size, item) => size + this.estimateSize(item), 24); // Array header
        }
        if (value instanceof Date) return 24;
        if (value instanceof RegExp) return value.source.length * 2 + 24;
        // Object
        return Object.entries(value).reduce((size, [k, v]) => {
          return size + k.length * 2 + this.estimateSize(v) + 24; // Entry overhead
        }, 32); // Object header
      default: return 100; // Default estimate
    }
  }

  private cloneValue<T>(value: T): T {
    // Deep clone immutable values
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return value;
    }
  }

  private startEviction(): void {
    if (!this.policy.evictionInterval) return;

    this.evictionTimer = setInterval(() => {
      this.evict().then(evicted => {
        if (evicted.length > 0) {
          console.log(`Evicted ${evicted.length} cache entries`);
        }
      }).catch(console.error);
    }, this.policy.evictionInterval);
  }

  private async evictFIFO(): Promise<void> {
    if (!this.policy.maxSize || this.cache.size <= this.policy.maxSize) return;

    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => a.entry.createdAt - b.entry.createdAt);

    const toEvict = entries.slice(0, Math.ceil((this.cache.size - this.policy.maxSize) * 0.1));
    for (const item of toEvict) {
      this.cache.delete(item.key);
      this.recordEviction(item.entry);
    }
  }

  private async evictLRU(): Promise<void> {
    if (!this.policy.maxSize || this.cache.size <= this.policy.maxSize) return;

    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => a.entry.accessedAt - b.entry.accessedAt);

    const toEvict = entries.slice(0, Math.ceil((this.cache.size - this.policy.maxSize) * 0.1));
    for (const item of toEvict) {
      this.cache.delete(item.key);
      this.recordEviction(item.entry);
    }
  }

  private async evictLFU(): Promise<void> {
    if (!this.policy.maxSize || this.cache.size <= this.policy.maxSize) return;

    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => a.entry.hits - b.entry.hits);

    const toEvict = entries.slice(0, Math.ceil((this.cache.size - this.policy.maxSize) * 0.1));
    for (const item of toEvict) {
      this.cache.delete(item.key);
      this.recordEviction(item.entry);
    }
  }

  private async evictExpired(): Promise<void> {
    const now = Date.now();
    let toEvict: [string, CacheEntry][] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        toEvict.push([key, entry]);
      }
    }

    for (const [key, entry] of toEvict) {
      this.cache.delete(key);
      this.recordExpiration(entry);
    }
  }

  private async evictUntilSize(): Promise<void> {
    if (!this.policy.maxSize) return;

    let remaining = this.cache.size - this.policy.maxSize;
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => a.entry.accessedAt - b.entry.accessedAt);

    for (const item of entries) {
      if (remaining <= 0) break;
      this.cache.delete(item.key);
      this.recordEviction(item.entry);
      remaining--;
    }
  }

  private recordOperation(type: string, duration: number): void {
    if (!this.metricsCache.has(type)) {
      this.metricsCache.set(type, []);
    }

    const metrics = this.metricsCache.get(type)!;
    metrics.push({ timestamp: Date.now(), value: duration });

    // Keep last 1000 operations
    if (metrics.length > 1000) {
      metrics.shift();
    }

    // Update hit rate
    if (type === 'get') {
      const h = this.metricsCache.get('hits')?.length || 0;
      const m = this.metricsCache.get('misses')?.length || 0;
      if (h+m > 0) {
        this.updateRateState({
          operationRate: (h+m) / (Date.now() - this.createdAt) * 1000,
          hitRate: h / (h+m),
          cacheUtilization: this.cache.size / this.policy.maxSize!,
          active: true
        });
      }
    }
  }

  private recordEviction(entry: CacheEntry): void {
    if (!this.metricsCache.has('evictions')) {
      this.metricsCache.set('evictions', []);
    }

    this.metricsCache.get('evictions')!.push({
      timestamp: Date.now(),
      value: entry.size
    });
  }

  private recordExpiration(entry: CacheEntry): void {
    if (!this.metricsCache.has('expirations')) {
      this.metricsCache.set('expirations', []);
    }

    this.metricsCache.get('expirations')!.push({
      timestamp: Date.now(),
      value: entry.size
    });
  }

  private getPerformanceMetrics(): {
    getTime: number;
    setTime: number;
    deleteTime: number;
  } {
    const metrics = this.metricsCache;

    const calculateAvg = (type: string): number => {
      const ops = metrics.get(type);
      if (!ops || ops.length === 0) return 0;

      const recentOps = ops.slice(-100); // Last 100 operations
      const totalTime = recentOps.reduce((sum, op) => sum + op.value, 0);
      return totalTime / recentOps.length;
    };

    return {
      getTime: calculateAvg('get'),
      setTime: calculateAvg('set'),
      deleteTime: calculateAvg('delete')
    };
  }

  private calculateHealth(): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    const stats = this.getStatistics();
    const utilization = this.cache.size / this.policy.maxSize!;

    if (this.state === InstanceState.ERROR) {
      return 'unhealthy';
    }

    if (stats.hitRate < 0.5 || utilization > 0.9) {
      return 'degraded';
    }

    return this.state === InstanceState.RUNNING ? 'healthy' : 'unknown';
  }

  private getWarnings(): string[] {
    const warnings: string[] = [];
    const metrics = this.getCacheMetrics();
    const utilization = this.cache.size / this.policy.maxSize!;

    if (utilization > 0.8) {
      warnings.push(`High cache utilization: ${(utilization * 100).toFixed(1)}%`);
    }

    if (metrics.hitRate < 0.7) {
      warnings.push(`Low hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
    }

    if (metrics.totalExpirations > metrics.totalHits * 0.1) {
      warnings.push(`High expiration rate detected (${metrics.totalExpirations} expirations)`);
    }

    return warnings;
  }

  async sendMessage(message: InstanceMessage): Promise<InstanceMessageResponse> {
    try {
      await this.receiveMessage(message);

      const metrics = this.getCacheMetrics();
      return {
        messageId: message.id,
        status: 'success',
        payload: {
          entryCount: metrics.totalEntries,
          hitRate: metrics.hitRate,
          health: this.calculateHealth()
        }
      };
    } catch (error) {
      return {
        messageId: message.id,
        status: 'error',
        error: {
          code: 'CACHE_MESSAGE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true,
          context: { cacheSize: this.cache.size }
        }
      };
    }
  }

  async receiveMessage(message: InstanceMessage): Promise<void> {
    if (message.type === 'data' && message.payload) {
      // Handle cache operations via messages
      const { operation, key, value } = message.payload;

      try {
        switch (operation) {
          case 'get':
            await this.get(key);
            break;
          case 'set':
            await this.set(key, value);
            break;
          case 'delete':
            await this.delete(key);
            break;
          case 'clear':
            await this.clear();
            break;
          case 'stats':
            // Service capabilities
            break;
        }
      } catch (error) {
        console.error(`Cache operation failed:`, error);
      }
    }
  }
}
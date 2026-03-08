/**
 * POLLN KV-Dream Integration
 *
 * Integrates KV-cache system with WorldModel dreaming for efficient imagination.
 * Combines anchor-based KV reuse with dream episode generation and caching.
 *
 * Based on:
 * - KVAnchorPool: Anchor-based KV-cache management
 * - WorldModel: VAE-based world model for dreaming
 * - DreamBasedPolicyOptimizer: PPO-style policy optimization
 *
 * Key innovations:
 * - DreamKVManager: Reuse KV-caches across similar dream episodes
 * - DreamAnchors: High-value dream states as reusable starting points
 * - ImaginationCache: Cache imagined trajectories for faster replay
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { WorldModel, DreamEpisode } from './worldmodel.js';
import type {
  KVCacheSegment,
  KVAnchor,
  KVAnchorPool,
  AnchorMatch,
  KVCacheMetadata
} from './kvanchor.js';

// ============================================================================
// KV-DREAM TYPES
// ============================================================================

/**
 * Configuration for KV-Dream integration
 */
export interface KVDreamConfig {
  // KV-cache management
  maxKVCacheSize: number;           // Max KV-caches to store per dream
  kvCacheTTL: number;               // Time-to-live for KV-caches (ms)

  // Dream anchors
  anchorPoolSize: number;           // Max dream anchors to maintain
  anchorValueThreshold: number;     // Minimum value to create anchor
  anchorSimilarityThreshold: number; // Minimum similarity to match anchor

  // Imagination cache
  imaginationCacheSize: number;     // Max imagined trajectories to cache
  imaginationCacheTTL: number;      // Time-to-live for cached imaginations (ms)
  imaginationMatchThreshold: number; // Minimum similarity to reuse imagination

  // Dream generation
  dreamBatchSize: number;           // Episodes per KV-enhanced dream cycle
  dreamHorizon: number;             // Length of dream episodes

  // Efficiency tracking
  trackEfficiency: boolean;         // Track KV reuse efficiency
  efficiencyWindowSize: number;     // Episodes for efficiency calculation
}

/**
 * KV-cache entry for dream episodes
 */
export interface DreamKVCache {
  id: string;
  dreamEpisodeId: string;
  cacheSegments: KVCacheSegment[];
  metadata: KVCacheMetadata;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  hitCount: number;
  efficiency: number;               // reuse efficiency (0-1)
}

/**
 * Dream anchor for high-value starting states
 */
export interface DreamAnchor {
  id: string;
  state: number[];
  latentState: number[];
  value: number;
  uncertainty: number;
  dreamEpisodeId: string;
  createdAt: number;
  lastUsed: number;
  usageCount: number;
  successRate: number;
  metadata: {
    totalReward: number;
    episodeLength: number;
    avgValue: number;
    explorationBonus: number;
  };
}

/**
 * Cached imagination trajectory entry
 */
export interface ImaginationCacheEntry {
  id: string;
  queryState: number[];
  queryLatent: number[];
  trajectory: DreamEpisode;
  value: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  similarity: number;               // Match quality when cached
  metadata: {
    generationTime: number;
    cacheHit: boolean;
    reusedSegments: number;
  };
}

/**
 * KV-enhanced dream result
 */
export interface KVDreamResult {
  episode: DreamEpisode;
  kvReuse: {
    cachesUsed: string[];
    totalSegments: number;
    reusedSegments: number;
    reuseRate: number;
  };
  anchorUsage: {
    usedAnchor: boolean;
    anchorId?: string;
    anchorSimilarity?: number;
  };
  imaginationCache: {
    hit: boolean;
    cacheId?: string;
    similarity?: number;
  };
  efficiency: number;
  generationTime: number;
  timestamp: number;
}

/**
 * KV-Dream efficiency statistics
 */
export interface KVDreamStats {
  // KV-cache stats
  totalKVCaches: number;
  kvCacheHitRate: number;
  avgKVCacheEfficiency: number;
  totalKVSegmentsReused: number;

  // Anchor stats
  totalAnchors: number;
  anchorHitRate: number;
  avgAnchorValue: number;
  anchorUsageCount: number;

  // Imagination cache stats
  imaginationCacheSize: number;
  imaginationCacheHitRate: number;
  avgImaginationValue: number;

  // Overall efficiency
  avgGenerationSpeedup: number;
  totalDreamEpisodes: number;
  totalEfficiencyGain: number;

  // Performance tracking
  kvEfficiencyHistory: number[];
  anchorEfficiencyHistory: number[];
  imaginationEfficiencyHistory: number[];
}

// ============================================================================
// DREAM KV MANAGER
// ============================================================================

/**
 * DreamKVManager - Manages KV-caches during world model dreaming
 *
 * Features:
 * - Store KV-caches from dream episodes
 * - Reuse KV-caches across similar dreams
 * - Track dream KV efficiency
 * - Prune low-value KV-caches
 */
export class DreamKVManager extends EventEmitter {
  private config: KVDreamConfig;
  private worldModel: WorldModel;

  // KV-cache storage
  private kvCaches: Map<string, DreamKVCache> = new Map();
  private kvIndex: Map<string, Set<string>> = new Map(); // stateHash -> cacheIds

  // Efficiency tracking
  private efficiencyHistory: number[] = [];
  private totalAccesses: number = 0;
  private totalHits: number = 0;

  constructor(worldModel: WorldModel, config?: Partial<KVDreamConfig>) {
    super();

    this.worldModel = worldModel;
    this.config = {
      maxKVCacheSize: 1000,
      kvCacheTTL: 3600000, // 1 hour
      anchorPoolSize: 100,
      anchorValueThreshold: 0.5,
      anchorSimilarityThreshold: 0.85,
      imaginationCacheSize: 500,
      imaginationCacheTTL: 1800000, // 30 minutes
      imaginationMatchThreshold: 0.8,
      dreamBatchSize: 10,
      dreamHorizon: 50,
      trackEfficiency: true,
      efficiencyWindowSize: 100,
      ...config,
    };
  }

  /**
   * Store KV-cache from dream episode
   */
  storeKVCache(
    episode: DreamEpisode,
    cacheSegments: KVCacheSegment[],
    metadata: KVCacheMetadata
  ): string {
    const id = uuidv4();
    const now = Date.now();

    const kvCache: DreamKVCache = {
      id,
      dreamEpisodeId: episode.id,
      cacheSegments,
      metadata,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      hitCount: 0,
      efficiency: 0,
    };

    this.kvCaches.set(id, kvCache);

    // Index by state hash for fast lookup
    const stateHash = this.hashState(episode.startState);
    if (!this.kvIndex.has(stateHash)) {
      this.kvIndex.set(stateHash, new Set());
    }
    this.kvIndex.get(stateHash)!.add(id);

    // Prune if over limit
    this.pruneKVCaches();

    this.emit('kv_cache_stored', {
      cacheId: id,
      episodeId: episode.id,
      segmentCount: cacheSegments.length,
    });

    return id;
  }

  /**
   * Find reusable KV-caches for a state
   */
  findKVCaches(state: number[]): DreamKVCache[] {
    const stateHash = this.hashState(state);
    const cacheIds = this.kvIndex.get(stateHash);

    if (!cacheIds || cacheIds.size === 0) {
      return [];
    }

    const caches: DreamKVCache[] = [];
    const now = Date.now();

    for (const cacheId of cacheIds) {
      const cache = this.kvCaches.get(cacheId);
      if (!cache) continue;

      // Check TTL
      if (now - cache.createdAt > this.config.kvCacheTTL) {
        this.kvCaches.delete(cacheId);
        cacheIds.delete(cacheId);
        continue;
      }

      // Update access stats
      cache.lastAccessed = now;
      cache.accessCount++;
      this.totalHits++;

      caches.push(cache);
    }

    this.totalAccesses++;

    return caches;
  }

  /**
   * Compute KV reuse efficiency
   */
  private computeEfficiency(cache: DreamKVCache): number {
    if (cache.accessCount === 0) return 0;
    return cache.hitCount / cache.accessCount;
  }

  /**
   * Prune low-value KV-caches
   */
  private pruneKVCaches(): void {
    if (this.kvCaches.size <= this.config.maxKVCacheSize) {
      return;
    }

    // Sort by efficiency and recency
    const caches = Array.from(this.kvCaches.entries()).sort((a, b) => {
      const effA = this.computeEfficiency(a[1]);
      const effB = this.computeEfficiency(b[1]);
      if (effA !== effB) return effB - effA; // Higher efficiency first
      return b[1].lastAccessed - a[1].lastAccessed; // More recent first
    });

    // Remove lowest efficiency caches
    const toRemove = caches.slice(this.config.maxKVCacheSize);
    for (const [id, cache] of toRemove) {
      this.kvCaches.delete(id);

      // Remove from index
      const stateHash = this.hashStateFromCache(cache);
      const cacheIds = this.kvIndex.get(stateHash);
      if (cacheIds) {
        cacheIds.delete(id);
        if (cacheIds.size === 0) {
          this.kvIndex.delete(stateHash);
        }
      }
    }

    this.emit('kv_caches_pruned', {
      removedCount: toRemove.length,
      remainingCount: this.kvCaches.size,
    });
  }

  /**
   * Hash state for indexing
   */
  private hashState(state: number[]): string {
    // Simple hash: use first few dimensions
    const dims = Math.min(5, state.length);
    return state.slice(0, dims).map(x => x.toFixed(2)).join(':');
  }

  /**
   * Get state hash from cache metadata
   */
  private hashStateFromCache(cache: DreamKVCache): string {
    // Extract from metadata or compute from episode
    // For simplicity, use a hash of cache ID
    return cache.id.split('-')[0];
  }

  /**
   * Get KV-cache statistics
   */
  getKVStats(): {
    totalCaches: number;
    totalSegments: number;
    avgEfficiency: number;
    hitRate: number;
    oldestCache: number;
    newestCache: number;
  } {
    const caches = Array.from(this.kvCaches.values());
    const totalSegments = caches.reduce((sum, c) => sum + c.cacheSegments.length, 0);
    const avgEfficiency = caches.length > 0
      ? caches.reduce((sum, c) => sum + this.computeEfficiency(c), 0) / caches.length
      : 0;
    const hitRate = this.totalAccesses > 0 ? this.totalHits / this.totalAccesses : 0;

    const now = Date.now();
    const oldestCache = caches.length > 0
      ? Math.min(...caches.map(c => now - c.createdAt))
      : 0;
    const newestCache = caches.length > 0
      ? Math.max(...caches.map(c => now - c.createdAt))
      : 0;

    return {
      totalCaches: this.kvCaches.size,
      totalSegments,
      avgEfficiency,
      hitRate,
      oldestCache,
      newestCache,
    };
  }

  /**
   * Clear all KV-caches
   */
  clearKVCaches(): void {
    this.kvCaches.clear();
    this.kvIndex.clear();
    this.efficiencyHistory = [];
    this.totalAccesses = 0;
    this.totalHits = 0;
    this.emit('kv_caches_cleared');
  }
}

// ============================================================================
// DREAM ANCHORS
// ============================================================================

/**
 * DreamAnchors - Anchor points for dream starting states
 *
 * Features:
 * - Create anchors from high-value dream states
 * - Match new dreams to existing dream anchors
 * - Speed up dream generation via anchor reuse
 */
export class DreamAnchors extends EventEmitter {
  private config: KVDreamConfig;
  private worldModel: WorldModel;

  // Anchor storage
  private anchors: Map<string, DreamAnchor> = new Map();
  private spatialIndex: Map<string, Set<string>> = new Map(); // region -> anchorIds

  constructor(worldModel: WorldModel, config?: Partial<KVDreamConfig>) {
    super();

    this.worldModel = worldModel;
    this.config = {
      maxKVCacheSize: 1000,
      kvCacheTTL: 3600000,
      anchorPoolSize: 100,
      anchorValueThreshold: 0.5,
      anchorSimilarityThreshold: 0.85,
      imaginationCacheSize: 500,
      imaginationCacheTTL: 1800000,
      imaginationMatchThreshold: 0.8,
      dreamBatchSize: 10,
      dreamHorizon: 50,
      trackEfficiency: true,
      efficiencyWindowSize: 100,
      ...config,
    };
  }

  /**
   * Create anchor from high-value dream state
   */
  createAnchor(episode: DreamEpisode, value: number): DreamAnchor | null {
    // Check value threshold
    if (value < this.config.anchorValueThreshold) {
      return null;
    }

    const latent = this.worldModel.encode(episode.startState);
    const now = Date.now();

    const anchor: DreamAnchor = {
      id: uuidv4(),
      state: episode.startState,
      latentState: latent.sample,
      value,
      uncertainty: latent.sample.reduce((sum, x) => sum + x * x, 0) / latent.sample.length,
      dreamEpisodeId: episode.id,
      createdAt: now,
      lastUsed: now,
      usageCount: 0,
      successRate: 0,
      metadata: {
        totalReward: episode.totalReward,
        episodeLength: episode.length,
        avgValue: episode.totalValue / episode.length,
        explorationBonus: episode.uncertainties.reduce((sum, u) => sum + u, 0) / episode.uncertainties.length,
      },
    };

    this.anchors.set(anchor.id, anchor);

    // Add to spatial index
    const region = this.getRegion(latent.sample);
    if (!this.spatialIndex.has(region)) {
      this.spatialIndex.set(region, new Set());
    }
    this.spatialIndex.get(region)!.add(anchor.id);

    // Prune if over limit
    this.pruneAnchors();

    this.emit('anchor_created', {
      anchorId: anchor.id,
      value,
      episodeId: episode.id,
    });

    return anchor;
  }

  /**
   * Find matching anchor for a state
   */
  findAnchor(state: number[]): { anchor: DreamAnchor; similarity: number } | null {
    const latent = this.worldModel.encode(state);
    const region = this.getRegion(latent.sample);
    const anchorIds = this.spatialIndex.get(region);

    if (!anchorIds || anchorIds.size === 0) {
      return null;
    }

    let bestMatch: DreamAnchor | null = null;
    let bestSimilarity = 0;

    for (const anchorId of anchorIds) {
      const anchor = this.anchors.get(anchorId);
      if (!anchor) continue;

      const similarity = this.computeSimilarity(latent.sample, anchor.latentState);

      if (similarity > bestSimilarity) {
        bestMatch = anchor;
        bestSimilarity = similarity;
      }
    }

    // Return best match if similarity is above threshold
    if (bestMatch && bestSimilarity >= this.config.anchorSimilarityThreshold) {
      // Update usage stats
      bestMatch.lastUsed = Date.now();
      bestMatch.usageCount++;
      bestMatch.successRate = (bestMatch.successRate * 0.9) + (1.0 * 0.1); // EMA

      return { anchor: bestMatch, similarity: bestSimilarity };
    }

    return null;
  }

  /**
   * Compute cosine similarity between latent states
   */
  private computeSimilarity(latent1: number[], latent2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    const minLen = Math.min(latent1.length, latent2.length);
    for (let i = 0; i < minLen; i++) {
      dotProduct += latent1[i] * latent2[i];
      norm1 += latent1[i] * latent1[i];
      norm2 += latent2[i] * latent2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denominator === 0) return 0;

    return Math.max(0, Math.min(1, dotProduct / denominator));
  }

  /**
   * Get spatial region for latent state
   */
  private getRegion(latent: number[]): string {
    // Divide latent space into grid regions
    const regionSize = 10; // Number of dimensions per region
    const regions: string[] = [];

    for (let i = 0; i < latent.length; i += regionSize) {
      const chunk = latent.slice(i, i + regionSize);
      const bucket = chunk.map(x => Math.floor(x * 10)).join(',');
      regions.push(bucket);
    }

    return regions.join('|');
  }

  /**
   * Prune low-value anchors
   */
  private pruneAnchors(): void {
    if (this.anchors.size <= this.config.anchorPoolSize) {
      return;
    }

    // Sort by value and recency
    const anchors = Array.from(this.anchors.entries()).sort((a, b) => {
      const valueA = a[1].value * a[1].usageCount;
      const valueB = b[1].value * b[1].usageCount;
      if (valueA !== valueB) return valueB - valueA;
      return b[1].lastUsed - a[1].lastUsed;
    });

    // Remove lowest value anchors
    const toRemove = anchors.slice(this.config.anchorPoolSize);
    for (const [id, anchor] of toRemove) {
      this.anchors.delete(id);

      // Remove from spatial index
      const region = this.getRegion(anchor.latentState);
      const anchorIds = this.spatialIndex.get(region);
      if (anchorIds) {
        anchorIds.delete(id);
        if (anchorIds.size === 0) {
          this.spatialIndex.delete(region);
        }
      }
    }

    this.emit('anchors_pruned', {
      removedCount: toRemove.length,
      remainingCount: this.anchors.size,
    });
  }

  /**
   * Get anchor statistics
   */
  getAnchorStats(): {
    totalAnchors: number;
    avgValue: number;
    avgUsageCount: number;
    avgSuccessRate: number;
    hitRate: number;
  } {
    const anchors = Array.from(this.anchors.values());
    const avgValue = anchors.length > 0
      ? anchors.reduce((sum, a) => sum + a.value, 0) / anchors.length
      : 0;
    const avgUsageCount = anchors.length > 0
      ? anchors.reduce((sum, a) => sum + a.usageCount, 0) / anchors.length
      : 0;
    const avgSuccessRate = anchors.length > 0
      ? anchors.reduce((sum, a) => sum + a.successRate, 0) / anchors.length
      : 0;

    // Hit rate: usage / (usage + missed opportunities)
    const totalUsage = anchors.reduce((sum, a) => sum + a.usageCount, 0);
    const hitRate = anchors.length > 0 ? totalUsage / (totalUsage + anchors.length * 10) : 0;

    return {
      totalAnchors: this.anchors.size,
      avgValue,
      avgUsageCount,
      avgSuccessRate,
      hitRate,
    };
  }

  /**
   * Clear all anchors
   */
  clearAnchors(): void {
    this.anchors.clear();
    this.spatialIndex.clear();
    this.emit('anchors_cleared');
  }
}

// ============================================================================
// IMAGINATION CACHE
// ============================================================================

/**
 * ImaginationCache - Cache for imagined trajectories
 *
 * Features:
 * - Store imagined state sequences
 * - Match similar imagination requests
 * - Prune low-value imagined paths
 */
export class ImaginationCache extends EventEmitter {
  private config: KVDreamConfig;
  private worldModel: WorldModel;

  // Cache storage
  private imaginations: Map<string, ImaginationCacheEntry> = new Map();
  private queryIndex: Map<string, Set<string>> = new Map(); // queryHash -> cacheIds

  constructor(worldModel: WorldModel, config?: Partial<KVDreamConfig>) {
    super();

    this.worldModel = worldModel;
    this.config = {
      maxKVCacheSize: 1000,
      kvCacheTTL: 3600000,
      anchorPoolSize: 100,
      anchorValueThreshold: 0.5,
      anchorSimilarityThreshold: 0.85,
      imaginationCacheSize: 500,
      imaginationCacheTTL: 1800000,
      imaginationMatchThreshold: 0.8,
      dreamBatchSize: 10,
      dreamHorizon: 50,
      trackEfficiency: true,
      efficiencyWindowSize: 100,
      ...config,
    };
  }

  /**
   * Store imagination trajectory
   */
  storeImagination(
    queryState: number[],
    trajectory: DreamEpisode,
    value: number,
    generationTime: number
  ): string {
    const id = uuidv4();
    const latent = this.worldModel.encode(queryState);
    const now = Date.now();

    const imagination: ImaginationCacheEntry = {
      id,
      queryState,
      queryLatent: latent.sample,
      trajectory,
      value,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      similarity: 1.0,
      metadata: {
        generationTime,
        cacheHit: false,
        reusedSegments: 0,
      },
    };

    this.imaginations.set(id, imagination);

    // Index by query hash
    const queryHash = this.hashQuery(latent.sample);
    if (!this.queryIndex.has(queryHash)) {
      this.queryIndex.set(queryHash, new Set());
    }
    this.queryIndex.get(queryHash)!.add(id);

    // Prune if over limit
    this.pruneImaginations();

    this.emit('imagination_cached', {
      cacheId: id,
      value,
      generationTime,
    });

    return id;
  }

  /**
   * Find cached imagination for a query
   */
  findImagination(queryState: number[]): { imagination: ImaginationCacheEntry; similarity: number } | null {
    const latent = this.worldModel.encode(queryState);
    const queryHash = this.hashQuery(latent.sample);
    const cacheIds = this.queryIndex.get(queryHash);

    if (!cacheIds || cacheIds.size === 0) {
      return null;
    }

    let bestMatch: ImaginationCacheEntry | null = null;
    let bestSimilarity = 0;
    const now = Date.now();

    for (const cacheId of cacheIds) {
      const imagination = this.imaginations.get(cacheId);
      if (!imagination) continue;

      // Check TTL
      if (now - imagination.createdAt > this.config.imaginationCacheTTL) {
        this.imaginations.delete(cacheId);
        cacheIds.delete(cacheId);
        continue;
      }

      const similarity = this.computeSimilarity(latent.sample, imagination.queryLatent);

      if (similarity > bestSimilarity && similarity >= this.config.imaginationMatchThreshold) {
        bestMatch = imagination;
        bestSimilarity = similarity;
      }
    }

    if (bestMatch) {
      // Update access stats
      bestMatch.lastAccessed = now;
      bestMatch.accessCount++;
      bestMatch.similarity = bestSimilarity;
      bestMatch.metadata.cacheHit = true;
    }

    return bestMatch ? { imagination: bestMatch, similarity: bestSimilarity } : null;
  }

  /**
   * Compute similarity between queries
   */
  private computeSimilarity(query1: number[], query2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    const minLen = Math.min(query1.length, query2.length);
    for (let i = 0; i < minLen; i++) {
      dotProduct += query1[i] * query2[i];
      norm1 += query1[i] * query1[i];
      norm2 += query2[i] * query2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denominator === 0) return 0;

    return Math.max(0, Math.min(1, dotProduct / denominator));
  }

  /**
   * Hash query for indexing
   */
  private hashQuery(latent: number[]): string {
    // Use first few dimensions for hash
    const dims = Math.min(8, latent.length);
    return latent.slice(0, dims).map(x => (x > 0 ? '1' : '0')).join('');
  }

  /**
   * Prune low-value imaginations
   */
  private pruneImaginations(): void {
    if (this.imaginations.size <= this.config.imaginationCacheSize) {
      return;
    }

    // Sort by value and recency
    const imaginations = Array.from(this.imaginations.entries()).sort((a, b) => {
      const valueA = a[1].value * a[1].accessCount;
      const valueB = b[1].value * b[1].accessCount;
      if (valueA !== valueB) return valueB - valueA;
      return b[1].lastAccessed - a[1].lastAccessed;
    });

    // Remove lowest value imaginations
    const toRemove = imaginations.slice(this.config.imaginationCacheSize);
    for (const [id, imagination] of toRemove) {
      this.imaginations.delete(id);

      // Remove from index
      const queryHash = this.hashQuery(imagination.queryLatent);
      const cacheIds = this.queryIndex.get(queryHash);
      if (cacheIds) {
        cacheIds.delete(id);
        if (cacheIds.size === 0) {
          this.queryIndex.delete(queryHash);
        }
      }
    }

    this.emit('imaginations_pruned', {
      removedCount: toRemove.length,
      remainingCount: this.imaginations.size,
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalImaginations: number;
    avgValue: number;
    avgAccessCount: number;
    hitRate: number;
    avgGenerationTime: number;
  } {
    const imaginations = Array.from(this.imaginations.values());
    const avgValue = imaginations.length > 0
      ? imaginations.reduce((sum, i) => sum + i.value, 0) / imaginations.length
      : 0;
    const avgAccessCount = imaginations.length > 0
      ? imaginations.reduce((sum, i) => sum + i.accessCount, 0) / imaginations.length
      : 0;
    const avgGenerationTime = imaginations.length > 0
      ? imaginations.reduce((sum, i) => sum + i.metadata.generationTime, 0) / imaginations.length
      : 0;

    // Hit rate
    const totalHits = imaginations.filter(i => i.metadata.cacheHit).length;
    const hitRate = imaginations.length > 0 ? totalHits / imaginations.length : 0;

    return {
      totalImaginations: this.imaginations.size,
      avgValue,
      avgAccessCount,
      hitRate,
      avgGenerationTime,
    };
  }

  /**
   * Clear all cached imaginations
   */
  clearCache(): void {
    this.imaginations.clear();
    this.queryIndex.clear();
    this.emit('cache_cleared');
  }
}

// ============================================================================
// KV-DREAM INTEGRATION
// ============================================================================

/**
 * KVDreamIntegration - Main integration class
 *
 * Combines DreamKVManager, DreamAnchors, and ImaginationCache
 * for efficient KV-enhanced dream generation.
 */
export class KVDreamIntegration extends EventEmitter {
  private config: KVDreamConfig;
  private worldModel: WorldModel;

  private kvManager: DreamKVManager;
  private dreamAnchors: DreamAnchors;
  private imaginationCache: ImaginationCache;

  // Efficiency tracking
  private efficiencyHistory: number[] = [];
  private dreamCount: number = 0;

  constructor(worldModel: WorldModel, config?: Partial<KVDreamConfig>) {
    super();

    this.worldModel = worldModel;
    this.config = {
      maxKVCacheSize: 1000,
      kvCacheTTL: 3600000,
      anchorPoolSize: 100,
      anchorValueThreshold: 0.5,
      anchorSimilarityThreshold: 0.85,
      imaginationCacheSize: 500,
      imaginationCacheTTL: 1800000,
      imaginationMatchThreshold: 0.8,
      dreamBatchSize: 10,
      dreamHorizon: 50,
      trackEfficiency: true,
      efficiencyWindowSize: 100,
      ...config,
    };

    this.kvManager = new DreamKVManager(worldModel, config);
    this.dreamAnchors = new DreamAnchors(worldModel, config);
    this.imaginationCache = new ImaginationCache(worldModel, config);

    // Forward events
    this.kvManager.on('kv_cache_stored', (data) => this.emit('kv_cache_stored', data));
    this.dreamAnchors.on('anchor_created', (data) => this.emit('anchor_created', data));
    this.imaginationCache.on('imagination_cached', (data) => this.emit('imagination_cached', data));
  }

  /**
   * Generate KV-enhanced dream episode
   */
  generateKVDream(
    startState: number[],
    actionSampler?: (state: number[], timestep: number) => number
  ): KVDreamResult {
    const startTime = Date.now();

    // Check imagination cache first
    const cachedImagination = this.imaginationCache.findImagination(startState);

    if (cachedImagination) {
      // Cache hit - return cached trajectory
      return {
        episode: cachedImagination.imagination.trajectory,
        kvReuse: {
          cachesUsed: [],
          totalSegments: 0,
          reusedSegments: 0,
          reuseRate: 0,
        },
        anchorUsage: {
          usedAnchor: false,
        },
        imaginationCache: {
          hit: true,
          cacheId: cachedImagination.imagination.id,
          similarity: cachedImagination.similarity,
        },
        efficiency: 1.0, // Perfect efficiency from cache
        generationTime: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    // Check for anchor
    const anchorMatch = this.dreamAnchors.findAnchor(startState);

    // Use anchor if available
    const actualStartState = anchorMatch ? anchorMatch.anchor.state : startState;

    // Find reusable KV-caches
    const kvCaches = this.kvManager.findKVCaches(actualStartState);

    // Generate dream episode using world model
    const episode = this.worldModel.dream(
      actualStartState,
      this.config.dreamHorizon,
      actionSampler
    );

    // Track KV reuse
    const reusedSegments = kvCaches.reduce((sum, cache) => sum + cache.cacheSegments.length, 0);
    const totalSegments = episode.length; // Simplified

    // Create anchor if high value
    if (episode.totalReward > this.config.anchorValueThreshold) {
      this.dreamAnchors.createAnchor(episode, episode.totalReward);
    }

    // Store KV-cache
    const mockSegments: KVCacheSegment[] = []; // Would be populated by actual KV system
    const mockMetadata: KVCacheMetadata = {
      createdAt: Date.now(),
      modelHash: 'dream-model',
      agentId: 'dream',
      turnNumber: 0,
      position: 0,
      length: episode.length * 10,
    };
    this.kvManager.storeKVCache(episode, mockSegments, mockMetadata);

    // Cache imagination
    this.imaginationCache.storeImagination(
      startState,
      episode,
      episode.totalReward,
      Date.now() - startTime
    );

    // Track efficiency
    const efficiency = 1.0 + (reusedSegments / Math.max(1, totalSegments)) * 0.5;
    this.trackEfficiency(efficiency);

    this.dreamCount++;

    return {
      episode,
      kvReuse: {
        cachesUsed: kvCaches.map(c => c.id),
        totalSegments,
        reusedSegments,
        reuseRate: totalSegments > 0 ? reusedSegments / totalSegments : 0,
      },
      anchorUsage: anchorMatch ? {
        usedAnchor: true,
        anchorId: anchorMatch.anchor.id,
        anchorSimilarity: anchorMatch.similarity,
      } : {
        usedAnchor: false,
      },
      imaginationCache: {
        hit: false,
      },
      efficiency,
      generationTime: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate batch of KV-enhanced dreams
   */
  generateKVDreamBatch(
    startStates: number[][],
    actionSampler?: (state: number[], timestep: number) => number
  ): KVDreamResult[] {
    const results: KVDreamResult[] = [];

    for (const startState of startStates) {
      const result = this.generateKVDream(startState, actionSampler);
      results.push(result);
    }

    return results;
  }

  /**
   * Track efficiency over time
   */
  private trackEfficiency(efficiency: number): void {
    this.efficiencyHistory.push(efficiency);

    if (this.efficiencyHistory.length > this.config.efficiencyWindowSize) {
      this.efficiencyHistory.shift();
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): KVDreamStats {
    const kvStats = this.kvManager.getKVStats();
    const anchorStats = this.dreamAnchors.getAnchorStats();
    const cacheStats = this.imaginationCache.getCacheStats();

    const avgEfficiency = this.efficiencyHistory.length > 0
      ? this.efficiencyHistory.reduce((sum, e) => sum + e, 0) / this.efficiencyHistory.length
      : 0;

    return {
      // KV-cache stats
      totalKVCaches: kvStats.totalCaches,
      kvCacheHitRate: kvStats.hitRate,
      avgKVCacheEfficiency: kvStats.avgEfficiency,
      totalKVSegmentsReused: kvStats.totalSegments,

      // Anchor stats
      totalAnchors: anchorStats.totalAnchors,
      anchorHitRate: anchorStats.hitRate,
      avgAnchorValue: anchorStats.avgValue,
      anchorUsageCount: Math.round(anchorStats.avgUsageCount * anchorStats.totalAnchors),

      // Imagination cache stats
      imaginationCacheSize: cacheStats.totalImaginations,
      imaginationCacheHitRate: cacheStats.hitRate,
      avgImaginationValue: cacheStats.avgValue,

      // Overall efficiency
      avgGenerationSpeedup: avgEfficiency,
      totalDreamEpisodes: this.dreamCount,
      totalEfficiencyGain: this.efficiencyHistory.reduce((sum, e) => sum + e, 0),

      // Performance tracking
      kvEfficiencyHistory: [...this.efficiencyHistory],
      anchorEfficiencyHistory: [...this.efficiencyHistory],
      imaginationEfficiencyHistory: [...this.efficiencyHistory],
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.kvManager.clearKVCaches();
    this.dreamAnchors.clearAnchors();
    this.imaginationCache.clearCache();
    this.efficiencyHistory = [];
    this.dreamCount = 0;
    this.emit('reset');
  }

  /**
   * Get sub-components for direct access
   */
  getComponents(): {
    kvManager: DreamKVManager;
    dreamAnchors: DreamAnchors;
    imaginationCache: ImaginationCache;
  } {
    return {
      kvManager: this.kvManager,
      dreamAnchors: this.dreamAnchors,
      imaginationCache: this.imaginationCache,
    };
  }
}

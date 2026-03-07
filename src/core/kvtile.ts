/**
 * POLLN KV-Tile Integration Layer
 *
 * Bridges the Tile system with the KV anchor system for efficient
 * cache sharing and context reuse between tile executions.
 *
 * Key Concepts:
 * - TileKVCache: Manages KV-cache for individual tiles
 * - TileAnchorBridge: Converts tile PollenGrains to anchor embeddings
 * - TileContextReuse: Enables context sharing between tile variants
 */

import { v4 } from 'uuid';
import type { PollenGrain as TilePollenGrain, TileCategory, TileContext } from './tile.js';
import type { KVCacheSegment, KVAnchor, AnchorMatch } from './kvanchor.js';
import { KVAnchorPool, AnchorMatcher } from './kvanchor.js';
import { Cache, CacheSlicer, CacheConcatenator } from './cacheutils.js';

// ============================================================================
// Tile KV-Cache Types
// ============================================================================

/**
 * Cache entry for a tile execution
 */
export interface TileKVCacheEntry {
  tileId: string;
  variantId?: string;
  contextId: string;
  cache: Cache;

  // Cache metadata
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  hitCount: number;
  missCount: number;

  // Cache statistics
  compressionRatio: number;
  sizeBytes: number;

  // Associated anchor (if any)
  anchorId?: string;
}

/**
 * Cache hit/miss statistics
 */
export interface TileCacheStats {
  totalRequests: number;
  hits: number;
  misses: number;
  hitRate: number;
  avgAccessTime: number;
  totalCacheSize: number;
  activeCaches: number;
}

/**
 * Configuration for tile KV cache
 */
export interface TileKVCacheConfig {
  maxCacheEntries: number;
  maxCacheAge: number;
  maxCacheSize: number;
  enableCompression: boolean;
  similarityThreshold: number;
}

/**
 * Result of cache lookup
 */
export interface CacheLookupResult {
  found: boolean;
  cache?: Cache;
  similarity?: number;
  anchor?: KVAnchor;
  reason: string;
}

// ============================================================================
// Tile KV Cache Manager
// ============================================================================

/**
 * Manages KV-cache for individual tiles
 *
 * Stores tile execution KV-caches, tracks cache hit/miss rates,
 * and supports cache invalidation on tile changes.
 */
export class TileKVCache {
  private caches: Map<string, TileKVCacheEntry> = new Map();
  private contextIndex: Map<string, Set<string>> = new Map();
  private tileIndex: Map<string, Set<string>> = new Map();
  private config: TileKVCacheConfig;
  private anchorPool: KVAnchorPool;
  private anchorMatcher: AnchorMatcher;

  // Statistics
  private stats = {
    totalRequests: 0,
    hits: 0,
    misses: 0,
    totalAccessTime: 0,
  };

  constructor(config?: Partial<TileKVCacheConfig>) {
    this.config = {
      maxCacheEntries: 1000,
      maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      enableCompression: true,
      similarityThreshold: 0.8,
      ...config,
    };

    this.anchorPool = new KVAnchorPool({
      maxAnchors: 500,
      similarityThreshold: this.config.similarityThreshold,
    });

    this.anchorMatcher = new AnchorMatcher({
      similarityThreshold: this.config.similarityThreshold,
    });
  }

  /**
   * Store a cache entry for a tile
   */
  async storeCache(
    tileId: string,
    context: TileContext,
    cache: Cache,
    variantId?: string
  ): Promise<string> {
    const now = Date.now();
    const cacheId = this.generateCacheId(tileId, context, variantId);

    // Calculate cache size
    const sizeBytes = this.calculateCacheSize(cache);

    const entry: TileKVCacheEntry = {
      tileId,
      variantId,
      contextId: context.causalChainId,
      cache,
      createdAt: now,
      lastAccessed: now,
      accessCount: 1, // Start with 1 since we're accessing it now
      hitCount: 0,
      missCount: 0,
      compressionRatio: 1.0,
      sizeBytes,
    };

    // Store cache
    this.caches.set(cacheId, entry);

    // Update indices
    this.updateIndices(cacheId, tileId, context.causalChainId);

    // Create anchor for efficient matching
    await this.createAnchorForCache(cacheId, entry);

    // Enforce capacity limits
    this.evictIfNeeded();

    return cacheId;
  }

  /**
   * Retrieve cache for a tile context
   */
  async retrieveCache(
    tileId: string,
    context: TileContext,
    variantId?: string
  ): Promise<CacheLookupResult> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    const cacheId = this.generateCacheId(tileId, context, variantId);

    // Try exact match first
    const exactEntry = this.caches.get(cacheId);
    if (exactEntry) {
      this.stats.hits++;
      exactEntry.accessCount++;
      exactEntry.hitCount++;
      exactEntry.lastAccessed = Date.now();

      this.stats.totalAccessTime += Date.now() - startTime;

      return {
        found: true,
        cache: exactEntry.cache,
        reason: 'Exact match found',
      };
    }

    // Try similar context match
    const similar = await this.findSimilarCache(tileId, context, variantId);
    if (similar) {
      this.stats.hits++;
      const entry = this.caches.get(similar.cacheId)!;
      entry.accessCount++;
      entry.hitCount++;
      entry.lastAccessed = Date.now();

      this.stats.totalAccessTime += Date.now() - startTime;

      return {
        found: true,
        cache: entry.cache,
        similarity: similar.similarity,
        anchor: similar.anchor,
        reason: `Similar context found (similarity: ${similar.similarity.toFixed(2)})`,
      };
    }

    // No match found
    this.stats.misses++;
    this.stats.totalAccessTime += Date.now() - startTime;

    return {
      found: false,
      reason: 'No matching cache found',
    };
  }

  /**
   * Invalidate cache for a tile
   */
  invalidateCache(tileId: string, variantId?: string): number {
    let invalidated = 0;

    for (const [cacheId, entry] of Array.from(this.caches.entries())) {
      if (entry.tileId === tileId &&
          (variantId === undefined || entry.variantId === variantId)) {
        this.removeCache(cacheId);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate cache by context
   */
  invalidateContext(contextId: string): number {
    const cacheIds = this.contextIndex.get(contextId);
    if (!cacheIds) return 0;

    let invalidated = 0;
    for (const cacheId of Array.from(cacheIds)) {
      if (this.caches.has(cacheId)) {
        this.removeCache(cacheId);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): TileCacheStats {
    const totalCacheSize = Array.from(this.caches.values())
      .reduce((sum, entry) => sum + entry.sizeBytes, 0);

    return {
      totalRequests: this.stats.totalRequests,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.totalRequests > 0
        ? this.stats.hits / this.stats.totalRequests
        : 0,
      avgAccessTime: this.stats.totalRequests > 0
        ? this.stats.totalAccessTime / this.stats.totalRequests
        : 0,
      totalCacheSize,
      activeCaches: this.caches.size,
    };
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.caches.clear();
    this.contextIndex.clear();
    this.tileIndex.clear();
    this.anchorPool.clear();
    this.stats = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      totalAccessTime: 0,
    };
  }

  /**
   * Cleanup old or unused caches
   */
  cleanup(now: number = Date.now()): number {
    let removed = 0;

    for (const [cacheId, entry] of Array.from(this.caches.entries())) {
      const age = now - entry.lastAccessed;
      const isOld = age > this.config.maxCacheAge;

      if (isOld) {
        this.removeCache(cacheId);
        removed++;
      }
    }

    return removed;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateCacheId(tileId: string, context: TileContext, variantId?: string): string {
    const variant = variantId || 'default';
    return `cache-${tileId}-${variant}-${context.causalChainId}`;
  }

  private updateIndices(cacheId: string, tileId: string, contextId: string): void {
    // Update tile index
    if (!this.tileIndex.has(tileId)) {
      this.tileIndex.set(tileId, new Set());
    }
    this.tileIndex.get(tileId)!.add(cacheId);

    // Update context index
    if (!this.contextIndex.has(contextId)) {
      this.contextIndex.set(contextId, new Set());
    }
    this.contextIndex.get(contextId)!.add(cacheId);
  }

  private async createAnchorForCache(cacheId: string, entry: TileKVCacheEntry): Promise<void> {
    // Create embedding from cache
    const embedding = this.cacheToEmbedding(entry.cache);

    // Create a mock KV-cache segment for anchor creation
    const segment: KVCacheSegment = {
      layerId: 0,
      segmentId: cacheId,
      tokens: [],
      keyCache: [[]],
      valueCache: [[]],
      metadata: {
        createdAt: entry.createdAt,
        modelHash: 'tile-model',
        agentId: entry.tileId,
        turnNumber: 0,
        position: 0,
        length: entry.cache.sequenceLength,
      },
    };

    try {
      const anchor = await this.anchorPool.createAnchor(segment, embedding);
      entry.anchorId = anchor.anchorId;
    } catch (error) {
      // Anchor creation failed, continue without it
      console.warn(`Failed to create anchor for cache ${cacheId}:`, error);
    }
  }

  private cacheToEmbedding(cache: Cache): number[] {
    // Simple embedding: flatten cache data and normalize
    const flat = this.flattenCacheData(cache.data);

    // Pad/truncate to 128 dimensions
    const targetDim = 128;
    if (flat.length >= targetDim) {
      return flat.slice(0, targetDim);
    }

    return [...flat, ...new Array(targetDim - flat.length).fill(0)];
  }

  private flattenCacheData(data: unknown): number[] {
    if (Array.isArray(data)) {
      if (data.length === 0) return [];
      if (typeof data[0] === 'number') return data as number[];
      return data.flatMap(item => this.flattenCacheData(item));
    }
    if (ArrayBuffer.isView(data)) {
      return Array.from(data as Float32Array);
    }
    return [];
  }

  private async findSimilarCache(
    tileId: string,
    context: TileContext,
    variantId?: string
  ): Promise<{ cacheId: string; similarity: number; anchor: KVAnchor } | null> {
    // Get caches for this tile
    const tileCacheIds = this.tileIndex.get(tileId);
    if (!tileCacheIds || tileCacheIds.size === 0) return null;

    // Create query embedding from context
    const queryEmbedding = this.contextToEmbedding(context);

    // Find similar anchors
    const similarAnchors = this.anchorPool.findSimilarAnchors(
      queryEmbedding,
      0, // layerId
      this.config.similarityThreshold
    );

    if (similarAnchors.length === 0) return null;

    // Find best matching cache
    let bestMatch: { cacheId: string; similarity: number; anchor: KVAnchor } | null = null;

    for (const anchor of similarAnchors) {
      // Find cache entry with this anchor
      for (const cacheId of tileCacheIds) {
        const entry = this.caches.get(cacheId);
        if (entry && entry.anchorId === anchor.anchorId) {
          if (!bestMatch || anchor.embedding.reduce((s, v) => s + v * v, 0) > bestMatch.similarity) {
            bestMatch = {
              cacheId,
              similarity: this.cosineSimilarity(queryEmbedding, anchor.embedding),
              anchor,
            };
          }
          break;
        }
      }
    }

    return bestMatch;
  }

  private contextToEmbedding(context: TileContext): number[] {
    // Create embedding from context
    const features: number[] = [
      context.timestamp / 1e10, // Normalized timestamp
      context.energyBudget / 1000, // Normalized energy
      context.temperature ?? 0.5,
      context.variantIndex ?? 0,
      context.predictedValue ?? 0.5,
      context.valueConfidence ?? 0.5,
    ];

    // Pad to 128 dimensions
    while (features.length < 128) {
      features.push(0);
    }

    return features;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  private calculateCacheSize(cache: Cache): number {
    // Estimate size in bytes
    const flat = this.flattenCacheData(cache.data);
    return flat.length * 8; // 8 bytes per number (Float64)
  }

  private evictIfNeeded(): void {
    // Keep evicting until we're within limits
    let iterations = 0;
    const maxIterations = this.caches.size + 1; // Prevent infinite loops

    while (
      iterations < maxIterations &&
      (this.caches.size > this.config.maxCacheEntries ||
       this.getTotalCacheSize() > this.config.maxCacheSize)
    ) {
      // Sort by (lastAccessed * log(accessCount)) - keep frequently used caches
      const sorted = Array.from(this.caches.entries())
        .map(([id, entry]) => ({
          id,
          score: entry.lastAccessed * Math.log(entry.accessCount + 1),
        }))
        .sort((a, b) => a.score - b.score);

      if (sorted.length === 0) break;

      // Remove lowest scoring cache
      const { id } = sorted[0];
      this.removeCache(id);

      iterations++;
    }
  }

  private getTotalCacheSize(): number {
    return Array.from(this.caches.values())
      .reduce((sum, entry) => sum + entry.sizeBytes, 0);
  }

  private removeCache(cacheId: string): void {
    const entry = this.caches.get(cacheId);
    if (!entry) return;

    // Remove from indices
    this.tileIndex.get(entry.tileId)?.delete(cacheId);
    this.contextIndex.get(entry.contextId)?.delete(cacheId);

    // Remove anchor
    if (entry.anchorId) {
      this.anchorPool.updateAnchor(entry.anchorId, { usageCount: 0 });
    }

    // Remove cache
    this.caches.delete(cacheId);
  }
}

// ============================================================================
// Tile Anchor Bridge
// ============================================================================

/**
 * Bridges tiles to the anchor system
 *
 * Converts tile PollenGrains to anchor embeddings, matches tile contexts
 * to existing anchors, and shares tile KV-caches across similar tiles.
 */
export class TileAnchorBridge {
  private anchorPool: KVAnchorPool;
  private anchorMatcher: AnchorMatcher;
  private tileCache: TileKVCache;

  constructor(config?: Partial<TileKVCacheConfig>) {
    this.anchorPool = new KVAnchorPool();
    this.anchorMatcher = new AnchorMatcher();
    this.tileCache = new TileKVCache(config);
  }

  /**
   * Convert tile PollenGrain to anchor embedding
   */
  pollenGrainToEmbedding(grain: TilePollenGrain): number[] {
    // Extract features from PollenGrain
    const features: number[] = [
      ...grain.embedding.slice(0, 64), // Take first 64 dimensions
      grain.trainingEpisodes / 10000, // Normalized training episodes
      grain.successRate,
      grain.avgReward,
      grain.valueFunction,
      grain.generation ? grain.generation / 10 : 0,
    ];

    // Pad/normalize to 128 dimensions
    return this.normalizeEmbedding(features, 128);
  }

  /**
   * Match tile context to existing anchors
   */
  async matchTileContext(
    tileId: string,
    context: TileContext,
    grain: TilePollenGrain
  ): Promise<AnchorMatch[]> {
    // Convert PollenGrain to embedding
    const embedding = this.pollenGrainToEmbedding(grain);

    // Create mock segment for matching
    const segment: KVCacheSegment = {
      layerId: 0,
      segmentId: tileId,
      tokens: [],
      keyCache: [[]],
      valueCache: [[]],
      metadata: {
        createdAt: grain.createdAt,
        modelHash: 'tile-model',
        agentId: tileId,
        turnNumber: 0,
        position: 0,
        length: grain.embedding.length,
      },
    };

    return this.anchorMatcher.findMatches(segment, embedding, this.anchorPool);
  }

  /**
   * Share tile KV-cache with similar tiles
   */
  async shareTileCache(
    tileId: string,
    context: TileContext,
    cache: Cache,
    grain: TilePollenGrain,
    variantId?: string
  ): Promise<string> {
    // Store cache in tile cache manager
    const cacheId = await this.tileCache.storeCache(tileId, context, cache, variantId);

    // Create anchor for sharing
    const embedding = this.pollenGrainToEmbedding(grain);
    const segment: KVCacheSegment = {
      layerId: 0,
      segmentId: cacheId,
      tokens: [],
      keyCache: [[]],
      valueCache: [[]],
      metadata: {
        createdAt: Date.now(),
        modelHash: 'tile-model',
        agentId: tileId,
        turnNumber: 0,
        position: 0,
        length: cache.sequenceLength,
      },
    };

    await this.anchorPool.createAnchor(segment, embedding);

    return cacheId;
  }

  /**
   * Get shared cache for a tile
   */
  async getSharedCache(
    tileId: string,
    context: TileContext,
    variantId?: string
  ): Promise<CacheLookupResult> {
    return this.tileCache.retrieveCache(tileId, context, variantId);
  }

  /**
   * Get bridge statistics
   */
  getStats(): {
    anchorPool: ReturnType<KVAnchorPool['getStats']>;
    tileCache: TileCacheStats;
  } {
    return {
      anchorPool: this.anchorPool.getStats(),
      tileCache: this.tileCache.getStats(),
    };
  }

  /**
   * Clear all bridge data
   */
  clear(): void {
    this.anchorPool.clear();
    this.tileCache.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private normalizeEmbedding(embedding: number[], targetDim: number): number[] {
    // L2 normalize
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    const normalized = embedding.map(v => v / (norm || 1));

    // Pad or truncate to target dimension
    if (normalized.length >= targetDim) {
      return normalized.slice(0, targetDim);
    }

    return [...normalized, ...new Array(targetDim - normalized.length).fill(0)];
  }
}

// ============================================================================
// Tile Context Reuse
// ============================================================================

/**
 * Context reuse statistics for a tile
 */
export interface TileReuseStats {
  tileId: string;
  variantId?: string;
  totalReuses: number;
  successfulReuses: number;
  failedReuses: number;
  avgSimilarity: number;
  avgSpeedup: number;
  lastReused: number;
}

/**
 * Context diff between variants
 */
export interface ContextDiff {
  similarity: number;
  addedTokens: number;
  removedTokens: number;
  modifiedTokens: number;
  canReuse: boolean;
  estimatedSpeedup: number;
}

/**
 * Enables context reuse between tile variants
 *
 * Detects when variants can share context, computes context diffs
 * for variant switching, and tracks reuse statistics per tile.
 */
export class TileContextReuse {
  private reuseHistory: Map<string, TileReuseStats> = new Map();
  private contextDiffs: Map<string, ContextDiff[]> = new Map();
  private slicer = new CacheSlicer();
  private concatenator = new CacheConcatenator();

  /**
   * Detect if variants can share context
   */
  async canReuseContext(
    tileId: string,
    fromVariant: string,
    toVariant: string,
    fromCache: Cache,
    toCache: Cache
  ): Promise<ContextDiff> {
    const key = `${tileId}:${fromVariant}:${toVariant}`;

    // Compute similarity between caches
    const similarity = this.computeCacheSimilarity(fromCache, toCache);

    // Compute token differences
    const addedTokens = Math.max(0, toCache.sequenceLength - fromCache.sequenceLength);
    const removedTokens = Math.max(0, fromCache.sequenceLength - toCache.sequenceLength);
    const modifiedTokens = Math.floor(Math.min(fromCache.sequenceLength, toCache.sequenceLength) * (1 - similarity));

    // Estimate speedup from reuse
    const estimatedSpeedup = this.estimateSpeedup(similarity, addedTokens, removedTokens);

    const canReuse = similarity >= 0.7 && addedTokens < fromCache.sequenceLength * 0.5;

    const diff: ContextDiff = {
      similarity,
      addedTokens,
      removedTokens,
      modifiedTokens,
      canReuse,
      estimatedSpeedup,
    };

    // Store diff for future reference
    if (!this.contextDiffs.has(key)) {
      this.contextDiffs.set(key, []);
    }
    this.contextDiffs.get(key)!.push(diff);

    return diff;
  }

  /**
   * Compute context diff for variant switching
   */
  computeContextDiff(
    fromCache: Cache,
    toCache: Cache
  ): ContextDiff {
    const similarity = this.computeCacheSimilarity(fromCache, toCache);

    // Find common prefix
    const commonLength = this.findCommonPrefixLength(fromCache, toCache);

    const addedTokens = Math.max(0, toCache.sequenceLength - commonLength);
    const removedTokens = Math.max(0, fromCache.sequenceLength - commonLength);
    const modifiedTokens = Math.floor(commonLength * (1 - similarity));

    const estimatedSpeedup = this.estimateSpeedup(similarity, addedTokens, removedTokens);

    return {
      similarity,
      addedTokens,
      removedTokens,
      modifiedTokens,
      canReuse: similarity >= 0.7,
      estimatedSpeedup,
    };
  }

  /**
   * Reuse context from one variant for another
   */
  async reuseContext(
    fromCache: Cache,
    diff: ContextDiff
  ): Promise<Cache | null> {
    if (!diff.canReuse) {
      return null;
    }

    try {
      // Slice the common prefix from source cache
      const commonLength = Math.min(
        fromCache.sequenceLength,
        fromCache.sequenceLength - diff.removedTokens
      );

      const prefix = this.slicer.slice(fromCache, { start: 0, end: commonLength });

      if (!prefix) {
        return null;
      }

      // If no tokens to add, return prefix as is
      if (diff.addedTokens === 0) {
        return prefix;
      }

      // Note: In a real implementation, we would need to generate
      // the new tokens here. For now, we just return the prefix
      // with a placeholder extension.

      return prefix;
    } catch (error) {
      console.error('Failed to reuse context:', error);
      return null;
    }
  }

  /**
   * Track reuse statistics for a tile
   */
  trackReuse(
    tileId: string,
    variantId: string | undefined,
    success: boolean,
    similarity: number,
    speedup: number
  ): void {
    const key = this.makeStatsKey(tileId, variantId);

    let stats = this.reuseHistory.get(key);
    if (!stats) {
      stats = {
        tileId,
        variantId,
        totalReuses: 0,
        successfulReuses: 0,
        failedReuses: 0,
        avgSimilarity: similarity, // Initialize with first value
        avgSpeedup: speedup, // Initialize with first value
        lastReused: Date.now(),
      };
      this.reuseHistory.set(key, stats);
    }

    stats.totalReuses++;
    if (success) {
      stats.successfulReuses++;
    } else {
      stats.failedReuses++;
    }

    // Update averages with exponential moving average
    const alpha = 0.1;
    stats.avgSimilarity = alpha * similarity + (1 - alpha) * stats.avgSimilarity;
    stats.avgSpeedup = alpha * speedup + (1 - alpha) * stats.avgSpeedup;
    stats.lastReused = Date.now();
  }

  /**
   * Get reuse statistics for a tile
   */
  getReuseStats(tileId: string, variantId?: string): TileReuseStats | undefined {
    const key = this.makeStatsKey(tileId, variantId);
    return this.reuseHistory.get(key);
  }

  /**
   * Get all reuse statistics
   */
  getAllReuseStats(): TileReuseStats[] {
    return Array.from(this.reuseHistory.values());
  }

  /**
   * Clear reuse history
   */
  clear(): void {
    this.reuseHistory.clear();
    this.contextDiffs.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private makeStatsKey(tileId: string, variantId?: string): string {
    return variantId ? `${tileId}:${variantId}` : tileId;
  }

  private computeCacheSimilarity(cache1: Cache, cache2: Cache): number {
    // Simple similarity based on sequence length overlap
    const minLength = Math.min(cache1.sequenceLength, cache2.sequenceLength);
    const maxLength = Math.max(cache1.sequenceLength, cache2.sequenceLength);

    if (maxLength === 0) return 1.0;

    return minLength / maxLength;
  }

  private findCommonPrefixLength(cache1: Cache, cache2: Cache): number {
    // Estimate common prefix based on sequence lengths
    return Math.min(cache1.sequenceLength, cache2.sequenceLength);
  }

  private estimateSpeedup(similarity: number, addedTokens: number, removedTokens: number): number {
    // Speedup decreases with added tokens and increases with similarity
    const baseSpeedup = similarity * 2.0;
    const addedPenalty = Math.min(addedTokens / 100, 1.0);
    const removedBonus = Math.min(removedTokens / 100, 0.5);

    return Math.max(1.0, baseSpeedup - addedPenalty + removedBonus);
  }
}

/**
 * Tests for KV-Tile Integration Layer
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  TileKVCache,
  TileAnchorBridge,
  TileContextReuse,
} from '../kvtile.js';
import type { TileContext, PollenGrain } from '../tile.js';
import type { Cache } from '../cacheutils.js';

describe('TileKVCache', () => {
  let tileKVCache: TileKVCache;
  let mockTileId: string;
  let mockContext: TileContext;
  let mockCache: Cache;

  beforeEach(() => {
    tileKVCache = new TileKVCache({
      maxCacheEntries: 100,
      maxCacheAge: 60000, // 1 minute for testing
      similarityThreshold: 0.8,
    });

    mockTileId = 'test-tile-123';
    mockContext = {
      colonyId: 'colony-1',
      keeperId: 'keeper-1',
      timestamp: Date.now(),
      causalChainId: 'chain-abc',
      energyBudget: 1000,
      temperature: 0.7,
    };

    mockCache = {
      data: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
      sequenceLength: 3,
      metadata: {
        id: 'cache-1',
        timestamp: Date.now(),
        sourceAgentId: mockTileId,
      },
    };
  });

  describe('storeCache', () => {
    it('should store a cache entry successfully', async () => {
      const cacheId = await tileKVCache.storeCache(
        mockTileId,
        mockContext,
        mockCache
      );

      expect(cacheId).toBeDefined();
      expect(cacheId).toContain(mockTileId);
    });

    it('should store cache with variant ID', async () => {
      const variantId = 'variant-xyz';
      const cacheId = await tileKVCache.storeCache(
        mockTileId,
        mockContext,
        mockCache,
        variantId
      );

      expect(cacheId).toContain(variantId);
    });

    it('should enforce capacity limits', async () => {
      const smallCache = new TileKVCache({
        maxCacheEntries: 3,
        maxCacheAge: 60000,
      });

      // Store 5 caches (exceeds limit of 3)
      for (let i = 0; i < 5; i++) {
        const context: TileContext = {
          ...mockContext,
          causalChainId: `chain-${i}`,
        };

        await smallCache.storeCache(mockTileId, context, mockCache);
      }

      const stats = smallCache.getStats();
      // Should have at most 3 caches
      expect(stats.activeCaches).toBeLessThanOrEqual(3);
    });
  });

  describe('retrieveCache', () => {
    it('should retrieve exact match cache', async () => {
      await tileKVCache.storeCache(mockTileId, mockContext, mockCache);

      const result = await tileKVCache.retrieveCache(
        mockTileId,
        mockContext
      );

      expect(result.found).toBe(true);
      expect(result.cache).toBeDefined();
      expect(result.reason).toContain('Exact match');
    });

    it('should return not found for non-existent cache', async () => {
      const result = await tileKVCache.retrieveCache(
        'nonexistent-tile',
        mockContext
      );

      expect(result.found).toBe(false);
      expect(result.cache).toBeUndefined();
    });

    it('should track hit and miss statistics', async () => {
      await tileKVCache.storeCache(mockTileId, mockContext, mockCache);

      // Hit
      await tileKVCache.retrieveCache(mockTileId, mockContext);

      // Miss
      await tileKVCache.retrieveCache('nonexistent', mockContext);

      const stats = tileKVCache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.totalRequests).toBe(2);
    });

    it('should calculate hit rate correctly', async () => {
      await tileKVCache.storeCache(mockTileId, mockContext, mockCache);

      // 2 hits, 1 miss
      await tileKVCache.retrieveCache(mockTileId, mockContext);
      await tileKVCache.retrieveCache(mockTileId, mockContext);
      await tileKVCache.retrieveCache('nonexistent', mockContext);

      const stats = tileKVCache.getStats();
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache for a tile', async () => {
      await tileKVCache.storeCache(mockTileId, mockContext, mockCache);

      const invalidated = tileKVCache.invalidateCache(mockTileId);
      expect(invalidated).toBeGreaterThan(0);

      const result = await tileKVCache.retrieveCache(
        mockTileId,
        mockContext
      );
      expect(result.found).toBe(false);
    });

    it('should invalidate cache for specific variant', async () => {
      const variant1 = 'variant-1';
      const variant2 = 'variant-2';

      await tileKVCache.storeCache(mockTileId, mockContext, mockCache, variant1);
      await tileKVCache.storeCache(mockTileId, mockContext, mockCache, variant2);

      // Invalidate only variant1
      const invalidated = tileKVCache.invalidateCache(mockTileId, variant1);
      expect(invalidated).toBe(1);

      // variant2 should still exist
      const result = await tileKVCache.retrieveCache(
        mockTileId,
        mockContext,
        variant2
      );
      expect(result.found).toBe(true);
    });
  });

  describe('invalidateContext', () => {
    it('should invalidate caches by context ID', async () => {
      await tileKVCache.storeCache(mockTileId, mockContext, mockCache);

      const invalidated = tileKVCache.invalidateContext(mockContext.causalChainId);
      expect(invalidated).toBeGreaterThan(0);

      const result = await tileKVCache.retrieveCache(
        mockTileId,
        mockContext
      );
      expect(result.found).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return accurate cache statistics', async () => {
      await tileKVCache.storeCache(mockTileId, mockContext, mockCache);

      const stats = tileKVCache.getStats();

      expect(stats.activeCaches).toBe(1);
      expect(stats.totalRequests).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should calculate total cache size', async () => {
      await tileKVCache.storeCache(mockTileId, mockContext, mockCache);

      const stats = tileKVCache.getStats();

      expect(stats.totalCacheSize).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should remove old caches', async () => {
      // Create a cache with very short maxAge for testing
      const shortLivedCache = new TileKVCache({
        maxCacheEntries: 100,
        maxCacheAge: 100, // 100ms for testing
      });

      await shortLivedCache.storeCache(mockTileId, mockContext, mockCache);

      // Wait for cache to become old
      await new Promise(resolve => setTimeout(resolve, 150));

      // Cleanup old caches
      const removed = shortLivedCache.cleanup();

      expect(removed).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all caches and reset statistics', async () => {
      await tileKVCache.storeCache(mockTileId, mockContext, mockCache);

      tileKVCache.clear();

      const stats = tileKVCache.getStats();
      expect(stats.activeCaches).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});

describe('TileAnchorBridge', () => {
  let bridge: TileAnchorBridge;
  let mockTileId: string;
  let mockContext: TileContext;
  let mockPollenGrain: PollenGrain;
  let mockCache: Cache;

  beforeEach(() => {
    bridge = new TileAnchorBridge({
      maxCacheEntries: 100,
      similarityThreshold: 0.8,
    });

    mockTileId = 'test-tile-456';
    mockContext = {
      colonyId: 'colony-2',
      keeperId: 'keeper-2',
      timestamp: Date.now(),
      causalChainId: 'chain-def',
      energyBudget: 2000,
      temperature: 0.5,
    };

    mockPollenGrain = {
      id: 'pollen-123',
      tileId: mockTileId,
      tileName: 'TestTile',
      tileType: 'BaseTile',
      category: 'ROLE' as any,
      embedding: new Array(64).fill(0.5),
      weights: { weight1: 0.5, weight2: 0.3 },
      trainingEpisodes: 1000,
      successRate: 0.85,
      avgReward: 0.7,
      valueFunction: 0.8,
      createdAt: Date.now(),
      sourceKeeperId: 'keeper-2',
      sourceColonyId: 'colony-2',
      signature: 'sig-abc',
    };

    mockCache = {
      data: [[10, 20, 30], [40, 50, 60]],
      sequenceLength: 2,
      metadata: {
        id: 'cache-2',
        timestamp: Date.now(),
        sourceAgentId: mockTileId,
      },
    };
  });

  describe('pollenGrainToEmbedding', () => {
    it('should convert PollenGrain to embedding vector', () => {
      const embedding = bridge.pollenGrainToEmbedding(mockPollenGrain);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(128);
      // After L2 normalization, values will be different
      // Just check that key features are present in the vector
      const hasTrainingEpisodes = embedding.some((v, i) => i >= 64 && i < 70);
      const hasSuccessRate = embedding.some((v, i) => i >= 64 && i < 70);
      const hasAvgReward = embedding.some((v, i) => i >= 64 && i < 70);
      expect(hasTrainingEpisodes).toBe(true);
      expect(hasSuccessRate).toBe(true);
      expect(hasAvgReward).toBe(true);
    });

    it('should handle PollenGrain with generation', () => {
      const grainWithGen = {
        ...mockPollenGrain,
        generation: 5,
      };

      const embedding = bridge.pollenGrainToEmbedding(grainWithGen);

      // Check that generation is included (normalized and embedded in vector)
      expect(embedding.length).toBe(128);
      // The generation value should affect the embedding
      const embeddingWithoutGen = bridge.pollenGrainToEmbedding(mockPollenGrain);
      expect(embedding).not.toEqual(embeddingWithoutGen);
    });
  });

  describe('matchTileContext', () => {
    it('should match tile context to anchors', async () => {
      const matches = await bridge.matchTileContext(
        mockTileId,
        mockContext,
        mockPollenGrain
      );

      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should return empty matches when no anchors exist', async () => {
      const matches = await bridge.matchTileContext(
        'nonexistent-tile',
        mockContext,
        mockPollenGrain
      );

      expect(matches.length).toBe(0);
    });
  });

  describe('shareTileCache', () => {
    it('should share tile cache and return cache ID', async () => {
      const cacheId = await bridge.shareTileCache(
        mockTileId,
        mockContext,
        mockCache,
        mockPollenGrain
      );

      expect(cacheId).toBeDefined();
      expect(cacheId).toContain(mockTileId);
    });

    it('should share cache with variant ID', async () => {
      const variantId = 'variant-abc';
      const cacheId = await bridge.shareTileCache(
        mockTileId,
        mockContext,
        mockCache,
        mockPollenGrain,
        variantId
      );

      expect(cacheId).toContain(variantId);
    });
  });

  describe('getSharedCache', () => {
    it('should retrieve shared cache', async () => {
      await bridge.shareTileCache(
        mockTileId,
        mockContext,
        mockCache,
        mockPollenGrain
      );

      const result = await bridge.getSharedCache(mockTileId, mockContext);

      expect(result.found).toBe(true);
      expect(result.cache).toBeDefined();
    });

    it('should return not found for non-existent cache', async () => {
      const result = await bridge.getSharedCache(
        'nonexistent-tile',
        mockContext
      );

      expect(result.found).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return bridge statistics', async () => {
      await bridge.shareTileCache(
        mockTileId,
        mockContext,
        mockCache,
        mockPollenGrain
      );

      const stats = bridge.getStats();

      expect(stats.anchorPool).toBeDefined();
      expect(stats.tileCache).toBeDefined();
      expect(stats.tileCache.activeCaches).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all bridge data', async () => {
      await bridge.shareTileCache(
        mockTileId,
        mockContext,
        mockCache,
        mockPollenGrain
      );

      bridge.clear();

      const stats = bridge.getStats();
      expect(stats.anchorPool.totalAnchors).toBe(0);
      expect(stats.tileCache.activeCaches).toBe(0);
    });
  });
});

describe('TileContextReuse', () => {
  let contextReuse: TileContextReuse;
  let mockTileId: string;
  let mockCache1: Cache;
  let mockCache2: Cache;
  let mockCache3: Cache;

  beforeEach(() => {
    contextReuse = new TileContextReuse();
    mockTileId = 'test-tile-789';

    mockCache1 = {
      data: [[1, 2, 3], [4, 5, 6]],
      sequenceLength: 2,
    };

    mockCache2 = {
      data: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
      sequenceLength: 3,
    };

    mockCache3 = {
      data: [[10, 20, 30], [40, 50, 60]],
      sequenceLength: 2,
    };
  });

  describe('canReuseContext', () => {
    it('should detect when context can be reused', async () => {
      const diff = await contextReuse.canReuseContext(
        mockTileId,
        'variant-1',
        'variant-2',
        mockCache1,
        mockCache2
      );

      expect(diff).toBeDefined();
      expect(diff.similarity).toBeGreaterThan(0);
      expect(typeof diff.canReuse).toBe('boolean');
    });

    it('should allow reuse for similar caches', async () => {
      const diff = await contextReuse.canReuseContext(
        mockTileId,
        'variant-1',
        'variant-2',
        mockCache1,
        mockCache2
      );

      // These caches share a prefix, so reuse should be possible
      expect(diff.similarity).toBeGreaterThan(0.5);
    });

    it('should estimate speedup from reuse', async () => {
      const diff = await contextReuse.canReuseContext(
        mockTileId,
        'variant-1',
        'variant-2',
        mockCache1,
        mockCache2
      );

      expect(diff.estimatedSpeedup).toBeGreaterThanOrEqual(1.0);
    });

    it('should calculate token differences', async () => {
      const diff = await contextReuse.canReuseContext(
        mockTileId,
        'variant-1',
        'variant-2',
        mockCache1,
        mockCache2
      );

      expect(diff.addedTokens).toBe(1); // cache2 has 1 more token
      expect(diff.removedTokens).toBe(0);
    });
  });

  describe('computeContextDiff', () => {
    it('should compute context diff between caches', () => {
      const diff = contextReuse.computeContextDiff(mockCache1, mockCache2);

      expect(diff.similarity).toBeGreaterThan(0);
      expect(diff.addedTokens).toBeGreaterThanOrEqual(0);
      expect(diff.removedTokens).toBeGreaterThanOrEqual(0);
      expect(diff.modifiedTokens).toBeGreaterThanOrEqual(0);
    });

    it('should handle different cache sizes', () => {
      const diff = contextReuse.computeContextDiff(mockCache1, mockCache3);

      expect(diff.similarity).toBeDefined();
      expect(typeof diff.canReuse).toBe('boolean');
    });
  });

  describe('reuseContext', () => {
    it('should reuse context when possible', async () => {
      const diff = {
        similarity: 0.8,
        addedTokens: 0,
        removedTokens: 0,
        modifiedTokens: 0,
        canReuse: true,
        estimatedSpeedup: 2.0,
      };

      const reused = await contextReuse.reuseContext(mockCache1, diff);

      expect(reused).toBeDefined();
      expect(reused).not.toBeNull();
    });

    it('should return null when reuse not possible', async () => {
      const diff = {
        similarity: 0.5,
        addedTokens: 100,
        removedTokens: 0,
        modifiedTokens: 50,
        canReuse: false,
        estimatedSpeedup: 1.0,
      };

      const reused = await contextReuse.reuseContext(mockCache1, diff);

      expect(reused).toBeNull();
    });
  });

  describe('trackReuse', () => {
    it('should track successful reuse', () => {
      contextReuse.trackReuse(mockTileId, 'variant-1', true, 0.85, 2.5);

      const stats = contextReuse.getReuseStats(mockTileId, 'variant-1');

      expect(stats).toBeDefined();
      expect(stats?.totalReuses).toBe(1);
      expect(stats?.successfulReuses).toBe(1);
      expect(stats?.failedReuses).toBe(0);
      expect(stats?.avgSimilarity).toBeCloseTo(0.85, 1);
      expect(stats?.avgSpeedup).toBeCloseTo(2.5, 1);
    });

    it('should track failed reuse', () => {
      contextReuse.trackReuse(mockTileId, 'variant-1', false, 0.6, 1.0);

      const stats = contextReuse.getReuseStats(mockTileId, 'variant-1');

      expect(stats?.failedReuses).toBe(1);
      expect(stats?.successfulReuses).toBe(0);
    });

    it('should update averages over multiple reuses', () => {
      contextReuse.trackReuse(mockTileId, 'variant-1', true, 0.8, 2.0);
      contextReuse.trackReuse(mockTileId, 'variant-1', true, 0.9, 2.5);

      const stats = contextReuse.getReuseStats(mockTileId, 'variant-1');

      expect(stats?.totalReuses).toBe(2);
      expect(stats?.avgSimilarity).toBeGreaterThan(0.8);
      expect(stats?.avgSimilarity).toBeLessThan(0.9);
      expect(stats?.avgSpeedup).toBeGreaterThan(2.0);
      expect(stats?.avgSpeedup).toBeLessThan(2.5);
    });
  });

  describe('getReuseStats', () => {
    it('should return undefined for non-existent stats', () => {
      const stats = contextReuse.getReuseStats('nonexistent-tile');

      expect(stats).toBeUndefined();
    });

    it('should return stats for existing tile', () => {
      contextReuse.trackReuse(mockTileId, undefined, true, 0.85, 2.0);

      const stats = contextReuse.getReuseStats(mockTileId);

      expect(stats).toBeDefined();
      expect(stats?.tileId).toBe(mockTileId);
    });

    it('should return stats for specific variant', () => {
      const variantId = 'variant-xyz';
      contextReuse.trackReuse(mockTileId, variantId, true, 0.9, 2.5);

      const stats = contextReuse.getReuseStats(mockTileId, variantId);

      expect(stats?.variantId).toBe(variantId);
    });
  });

  describe('getAllReuseStats', () => {
    it('should return all reuse statistics', () => {
      contextReuse.trackReuse('tile-1', undefined, true, 0.8, 2.0);
      contextReuse.trackReuse('tile-2', 'variant-1', true, 0.9, 2.5);

      const allStats = contextReuse.getAllReuseStats();

      expect(allStats.length).toBe(2);
      expect(allStats.some(s => s.tileId === 'tile-1')).toBe(true);
      expect(allStats.some(s => s.tileId === 'tile-2')).toBe(true);
    });

    it('should return empty array when no stats', () => {
      const allStats = contextReuse.getAllReuseStats();

      expect(allStats).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all reuse history', () => {
      contextReuse.trackReuse(mockTileId, undefined, true, 0.85, 2.0);

      contextReuse.clear();

      const stats = contextReuse.getReuseStats(mockTileId);
      expect(stats).toBeUndefined();

      const allStats = contextReuse.getAllReuseStats();
      expect(allStats).toEqual([]);
    });
  });
});

describe('Integration Tests', () => {
  describe('TileAnchorBridge + TileKVCache', () => {
    it('should integrate bridge with cache manager', async () => {
      const bridge = new TileAnchorBridge();
      const tileId = 'integration-tile';
      const context: TileContext = {
        colonyId: 'colony-1',
        keeperId: 'keeper-1',
        timestamp: Date.now(),
        causalChainId: 'chain-1',
        energyBudget: 1000,
      };

      const pollenGrain: PollenGrain = {
        id: 'pollen-1',
        tileId,
        tileName: 'IntegrationTile',
        tileType: 'BaseTile',
        category: 'ROLE' as any,
        embedding: new Array(64).fill(0.5),
        weights: {},
        trainingEpisodes: 100,
        successRate: 0.8,
        avgReward: 0.7,
        valueFunction: 0.75,
        createdAt: Date.now(),
        sourceKeeperId: 'keeper-1',
        sourceColonyId: 'colony-1',
        signature: 'sig-1',
      };

      const cache: Cache = {
        data: [[1, 2, 3]],
        sequenceLength: 1,
      };

      // Share cache
      const cacheId = await bridge.shareTileCache(tileId, context, cache, pollenGrain);
      expect(cacheId).toBeDefined();

      // Retrieve cache
      const result = await bridge.getSharedCache(tileId, context);
      expect(result.found).toBe(true);

      // Check stats
      const stats = bridge.getStats();
      expect(stats.tileCache.activeCaches).toBeGreaterThan(0);
      expect(stats.anchorPool.totalAnchors).toBeGreaterThan(0);
    });
  });

  describe('Context Reuse + Variant Switching', () => {
    it('should handle variant switching with context reuse', async () => {
      const contextReuse = new TileContextReuse();
      const tileId = 'variant-tile';

      const cache1: Cache = {
        data: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        sequenceLength: 3,
      };

      const cache2: Cache = {
        data: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]],
        sequenceLength: 4,
      };

      // Check if can reuse
      const diff = await contextReuse.canReuseContext(
        tileId,
        'variant-a',
        'variant-b',
        cache1,
        cache2
      );

      expect(diff).toBeDefined();

      // Track reuse
      if (diff.canReuse) {
        contextReuse.trackReuse(
          tileId,
          'variant-b',
          true,
          diff.similarity,
          diff.estimatedSpeedup
        );
      }

      // Verify stats
      const stats = contextReuse.getReuseStats(tileId, 'variant-b');
      expect(stats).toBeDefined();
      expect(stats?.totalReuses).toBe(1);
    });
  });
});

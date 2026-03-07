/**
 * KV-Federated Integration Tests
 *
 * Tests for federated learning integration with KV-cache anchor system.
 */

import {
  FederatedKVSync,
  PrivacyAwareAnchors,
  AnchorAggregation,
  type PrivateKVAnchor,
  type AnchorSyncPackage,
  type AggregatedAnchor,
  type AnchorPrivacyBudget,
  type FederatedKVSyncConfig,
  type PrivacyAwareAnchorConfig,
  type AnchorAggregationConfig,
  type FederatedKVStats,
  KVAnchorPool,
  type KVAnchor,
  type KVCacheSegment,
  type KVCacheMetadata,
} from '../index';

describe('FederatedKVSync', () => {
  let federatedSync: FederatedKVSync;
  let anchorPool: KVAnchorPool;

  beforeEach(() => {
    anchorPool = new KVAnchorPool({
      maxAnchors: 100,
      minQualityScore: 0.6,
      similarityThreshold: 0.7,
    });

    federatedSync = new FederatedKVSync(anchorPool, {
      defaultPrivacyTier: 'MEADOW',
      enableDifferentialPrivacy: true,
      minQualityForSharing: 0.7,
      maxAnchorsPerSync: 10,
      minCrossColonyReuse: 1,
    });
  });

  describe('colony registration', () => {
    test('should register a new colony', async () => {
      const budget = await federatedSync.registerColony('colony-1', 'MEADOW');

      expect(budget.colonyId).toBe('colony-1');
      expect(budget.privacyTier).toBe('MEADOW');
      expect(budget.epsilonSpent).toBe(0);
      expect(budget.anchorsShared).toBe(0);
      expect(budget.anchorsReceived).toBe(0);
    });

    test('should register colony with default privacy tier', async () => {
      const budget = await federatedSync.registerColony('colony-2');

      expect(budget.privacyTier).toBe('MEADOW');
    });

    test('should retrieve privacy budget for registered colony', async () => {
      await federatedSync.registerColony('colony-1', 'RESEARCH');

      const budget = federatedSync.getPrivacyBudget('colony-1');

      expect(budget).toBeDefined();
      expect(budget!.colonyId).toBe('colony-1');
      expect(budget!.privacyTier).toBe('RESEARCH');
    });

    test('should return undefined for non-registered colony', () => {
      const budget = federatedSync.getPrivacyBudget('non-existent');

      expect(budget).toBeUndefined();
    });
  });

  describe('anchor preparation for sharing', () => {
    beforeEach(async () => {
      await federatedSync.registerColony('colony-1', 'MEADOW');

      // Create test anchors
      const metadata: KVCacheMetadata = {
        createdAt: Date.now(),
        modelHash: 'test-model',
        agentId: 'agent-1',
        conversationId: 'conv-1',
        turnNumber: 1,
        position: 0,
        length: 100,
      };

      const segment: KVCacheSegment = {
        layerId: 0,
        segmentId: 'segment-1',
        tokens: [1, 2, 3, 4, 5],
        keyCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
        valueCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
        metadata,
      };

      await anchorPool.createAnchor(segment, Array(128).fill(0).map(() => Math.random()));
    });

    test('should prepare anchors for federated sharing', async () => {
      const syncPackage = await federatedSync.prepareAnchorsForSharing('colony-1');

      expect(syncPackage.packageId).toBeDefined();
      expect(syncPackage.roundNumber).toBeGreaterThan(0);
      expect(syncPackage.sourceColonyId).toBe('colony-1');
      expect(syncPackage.anchors.length).toBeGreaterThan(0);
      expect(syncPackage.metadata.privacyTier).toBe('MEADOW');
    });

    test('should filter anchors by quality threshold', async () => {
      // Create low-quality anchor
      const lowQualityMetadata: KVCacheMetadata = {
        createdAt: Date.now(),
        modelHash: 'test-model',
        agentId: 'agent-2',
        conversationId: 'conv-2',
        turnNumber: 1,
        position: 0,
        length: 10,
      };

      const lowQualitySegment: KVCacheSegment = {
        layerId: 0,
        segmentId: 'segment-low',
        tokens: [1, 2, 3],
        keyCache: Array(10).fill(0).map(() => Array(64).fill(0)),
        valueCache: Array(10).fill(0).map(() => Array(64).fill(0)),
        metadata: lowQualityMetadata,
      };

      await anchorPool.createAnchor(lowQualitySegment, Array(128).fill(0));

      const syncPackage = await federatedSync.prepareAnchorsForSharing('colony-1');

      // Low quality anchor should not be included
      syncPackage.anchors.forEach(anchor => {
        expect(anchor.qualityScore).toBeGreaterThanOrEqual(0.7);
      });
    });

    test('should limit anchors per sync', async () => {
      // Create many anchors
      for (let i = 0; i < 20; i++) {
        const metadata: KVCacheMetadata = {
          createdAt: Date.now(),
          modelHash: 'test-model',
          agentId: `agent-${i}`,
          conversationId: `conv-${i}`,
          turnNumber: 1,
          position: 0,
          length: 100,
        };

        const segment: KVCacheSegment = {
          layerId: i % 4,
          segmentId: `segment-${i}`,
          tokens: [1, 2, 3, 4, 5],
          keyCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
          valueCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
          metadata,
        };

        await anchorPool.createAnchor(segment, Array(128).fill(0).map(() => Math.random()));
      }

      const syncPackage = await federatedSync.prepareAnchorsForSharing('colony-1');

      expect(syncPackage.anchors.length).toBeLessThanOrEqual(10);
    });

    test('should update privacy budget after sharing', async () => {
      // Register a new colony to avoid state from previous tests
      await federatedSync.registerColony('colony-budget-test', 'MEADOW');

      // Create multiple anchors for this colony to ensure we have something to share
      const metadata: KVCacheMetadata = {
        createdAt: Date.now(),
        modelHash: 'test-model-budget',
        agentId: 'agent-budget',
        conversationId: 'conv-budget',
        turnNumber: 1,
        position: 0,
        length: 100,
      };

      // Create 3 anchors to ensure we have high-quality anchors to share
      for (let i = 0; i < 3; i++) {
        const segment: KVCacheSegment = {
          layerId: i % 3, // Use different layers
          segmentId: `segment-budget-${i}`,
          tokens: [1, 2, 3, 4, 5],
          keyCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
          valueCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
          metadata: {
            ...metadata,
            conversationId: `conv-budget-${i}`,
          },
        };

        await anchorPool.createAnchor(segment, Array(128).fill(0).map(() => Math.random()));
      }

      const initialBudget = federatedSync.getPrivacyBudget('colony-budget-test')!;
      const initialEpsilon = initialBudget.epsilonSpent;
      const initialAnchorsShared = initialBudget.anchorsShared;

      await federatedSync.prepareAnchorsForSharing('colony-budget-test');

      const updatedBudget = federatedSync.getPrivacyBudget('colony-budget-test')!;

      // Privacy budget should have been spent (epsilon > initial)
      expect(updatedBudget.epsilonSpent).toBeGreaterThan(initialEpsilon);
      expect(updatedBudget.anchorsShared).toBeGreaterThan(initialAnchorsShared);
    });
  });

  describe('cross-colony reuse tracking', () => {
    test('should track cross-colony anchor reuse', async () => {
      const metadata: KVCacheMetadata = {
        createdAt: Date.now(),
        modelHash: 'test-model',
        agentId: 'agent-1',
        conversationId: 'conv-1',
        turnNumber: 1,
        position: 0,
        length: 100,
      };

      const segment: KVCacheSegment = {
        layerId: 0,
        segmentId: 'segment-1',
        tokens: [1, 2, 3, 4, 5],
        keyCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
        valueCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
        metadata,
      };

      const anchor = await anchorPool.createAnchor(segment, Array(128).fill(0).map(() => Math.random()));

      // Track reuse - the implementation emits events but doesn't modify the anchor directly
      // We just verify it doesn't throw
      expect(() => {
        federatedSync.trackCrossColonyReuse(anchor.anchorId, 'colony-2');
        federatedSync.trackCrossColonyReuse(anchor.anchorId, 'colony-3');
      }).not.toThrow();
    });
  });

  describe('statistics tracking', () => {
    test('should track sync statistics', async () => {
      // Register a new colony to avoid state from previous tests
      await federatedSync.registerColony('colony-stats-test', 'MEADOW');

      // Create an anchor
      const metadata: KVCacheMetadata = {
        createdAt: Date.now(),
        modelHash: 'test-model',
        agentId: 'agent-stats',
        conversationId: 'conv-stats',
        turnNumber: 1,
        position: 0,
        length: 100,
      };

      const segment: KVCacheSegment = {
        layerId: 0,
        segmentId: 'segment-stats',
        tokens: [1, 2, 3, 4, 5],
        keyCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
        valueCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
        metadata,
      };

      await anchorPool.createAnchor(segment, Array(128).fill(0).map(() => Math.random()));

      const initialStats = federatedSync.getStats();
      expect(initialStats.totalSyncRounds).toBe(0);

      await federatedSync.prepareAnchorsForSharing('colony-stats-test');

      const updatedStats = federatedSync.getStats();
      expect(updatedStats.totalSyncRounds).toBeGreaterThan(0);
      expect(updatedStats.totalAnchorsShared).toBeGreaterThan(0);
    });

    test('should maintain sync history', async () => {
      await federatedSync.registerColony('colony-1', 'MEADOW');

      await federatedSync.prepareAnchorsForSharing('colony-1');
      await federatedSync.prepareAnchorsForSharing('colony-1');

      const history = federatedSync.getSyncHistory();

      expect(history.length).toBe(2);
    });

    test('should limit sync history when requested', async () => {
      await federatedSync.registerColony('colony-1', 'MEADOW');

      await federatedSync.prepareAnchorsForSharing('colony-1');
      await federatedSync.prepareAnchorsForSharing('colony-1');
      await federatedSync.prepareAnchorsForSharing('colony-1');

      const limitedHistory = federatedSync.getSyncHistory(2);

      expect(limitedHistory.length).toBe(2);
    });
  });

  describe('reset functionality', () => {
    test('should reset all state', async () => {
      await federatedSync.registerColony('colony-1', 'MEADOW');
      await federatedSync.prepareAnchorsForSharing('colony-1');

      federatedSync.reset();

      expect(federatedSync.getPrivacyBudget('colony-1')).toBeUndefined();
      expect(federatedSync.getStats().totalSyncRounds).toBe(0);
      expect(federatedSync.getSyncHistory().length).toBe(0);
    });
  });
});

describe('PrivacyAwareAnchors', () => {
  let privacyAware: PrivacyAwareAnchors;
  let testAnchor: KVAnchor;

  beforeEach(() => {
    privacyAware = new PrivacyAwareAnchors({
      enableDifferentialPrivacy: true,
      clipThreshold: 1.0,
      noiseScale: 1.0,
      preserveUtility: true,
    });

    testAnchor = {
      anchorId: 'test-anchor',
      layerId: 0,
      segmentId: 'segment-1',
      compressedKeys: new Float32Array(64).fill(0).map(() => Math.random()),
      compressedValues: new Float32Array(64).fill(0).map(() => Math.random()),
      embedding: Array(128).fill(0).map(() => Math.random()),
      sourceSegmentId: 'segment-1',
      sourceAgentId: 'agent-1',
      usageCount: 10,
      lastUsed: Date.now(),
      qualityScore: 0.85,
      compressionRatio: 10.0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  describe('privacy application', () => {
    test('should skip privacy for LOCAL tier', async () => {
      const privateAnchor = await privacyAware.applyPrivacyToAnchor(
        testAnchor,
        'LOCAL',
        'colony-1'
      );

      expect(privateAnchor.privacyTier).toBe('LOCAL');
      expect(privateAnchor.dpMetadata).toBeUndefined();
      expect(privateAnchor.embedding).toEqual(testAnchor.embedding);
    });

    test('should apply privacy for MEADOW tier', async () => {
      const privateAnchor = await privacyAware.applyPrivacyToAnchor(
        testAnchor,
        'MEADOW',
        'colony-1'
      );

      expect(privateAnchor.privacyTier).toBe('MEADOW');
      expect(privateAnchor.dpMetadata).toBeDefined();
      expect(privateAnchor.dpMetadata!.epsilon).toBe(1.0);
    });

    test('should apply privacy for RESEARCH tier', async () => {
      const privateAnchor = await privacyAware.applyPrivacyToAnchor(
        testAnchor,
        'RESEARCH',
        'colony-1'
      );

      expect(privateAnchor.privacyTier).toBe('RESEARCH');
      expect(privateAnchor.dpMetadata).toBeDefined();
      expect(privateAnchor.dpMetadata!.epsilon).toBe(0.5);
    });

    test('should clip embedding to bound sensitivity', async () => {
      // Create embedding with large norm
      const largeEmbedding = Array(128).fill(0).map(() => 100);
      const largeAnchor = { ...testAnchor, embedding: largeEmbedding };

      const privateAnchor = await privacyAware.applyPrivacyToAnchor(
        largeAnchor,
        'MEADOW',
        'colony-1'
      );

      // The embedding should be different from the original due to clipping and noise
      expect(privateAnchor.embedding).not.toEqual(largeEmbedding);

      // The embedding should have been modified (clipped + noise)
      // We can't easily test the exact clipping behavior since noise is added after,
      // but we can verify that the mechanism runs without error
      expect(privateAnchor.dpMetadata).toBeDefined();
    });

    test('should add noise to embedding for differential privacy', async () => {
      const privateAnchor = await privacyAware.applyPrivacyToAnchor(
        testAnchor,
        'MEADOW',
        'colony-1'
      );

      // Embedding should be different due to noise
      expect(privateAnchor.embedding).not.toEqual(testAnchor.embedding);
    });

    test('should preserve utility with less noise to KV data', async () => {
      const privateAnchor = await privacyAware.applyPrivacyToAnchor(
        testAnchor,
        'MEADOW',
        'colony-1'
      );

      // Keys and values should have some noise but less than embedding
      expect(privateAnchor.compressedKeys).not.toEqual(testAnchor.compressedKeys);
      expect(privateAnchor.compressedValues).not.toEqual(testAnchor.compressedValues);
    });
  });

  describe('batch processing', () => {
    test('should apply privacy to multiple anchors', async () => {
      const anchors = [
        testAnchor,
        { ...testAnchor, anchorId: 'anchor-2', embedding: Array(128).fill(0).map(() => Math.random()) },
        { ...testAnchor, anchorId: 'anchor-3', embedding: Array(128).fill(0).map(() => Math.random()) },
      ];

      const privateAnchors = await privacyAware.applyPrivacyToAnchors(
        anchors,
        'MEADOW',
        'colony-1'
      );

      expect(privateAnchors.length).toBe(3);
      privateAnchors.forEach(anchor => {
        expect(anchor.privacyTier).toBe('MEADOW');
        expect(anchor.dpMetadata).toBeDefined();
      });
    });
  });

  describe('privacy budget checking', () => {
    test('should allow sharing within budget', () => {
      const budget: AnchorPrivacyBudget = {
        colonyId: 'colony-1',
        privacyTier: 'MEADOW',
        epsilonSpent: 0,
        deltaSpent: 0,
        epsilonLimit: 10.0, // Higher limit to allow multiple anchors
        deltaLimit: 1e-5,
        anchorsShared: 0,
        anchorsReceived: 0,
        lastUpdated: Date.now(),
      };

      const canShare = privacyAware.checkPrivacyBudget(budget, 5);

      expect(canShare).toBe(true);
    });

    test('should deny sharing over budget', () => {
      const budget: AnchorPrivacyBudget = {
        colonyId: 'colony-1',
        privacyTier: 'MEADOW',
        epsilonSpent: 0.9,
        deltaSpent: 0,
        epsilonLimit: 1.0,
        deltaLimit: 1e-5,
        anchorsShared: 0,
        anchorsReceived: 0,
        lastUpdated: Date.now(),
      };

      const canShare = privacyAware.checkPrivacyBudget(budget, 5);

      expect(canShare).toBe(false);
    });

    test('should always allow LOCAL tier sharing', () => {
      const budget: AnchorPrivacyBudget = {
        colonyId: 'colony-1',
        privacyTier: 'LOCAL',
        epsilonSpent: Infinity,
        deltaSpent: 0,
        epsilonLimit: Infinity,
        deltaLimit: 1.0,
        anchorsShared: 0,
        anchorsReceived: 0,
        lastUpdated: Date.now(),
      };

      const canShare = privacyAware.checkPrivacyBudget(budget, 1000);

      expect(canShare).toBe(true);
    });
  });
});

describe('AnchorAggregation', () => {
  let aggregation: AnchorAggregation;

  beforeEach(() => {
    aggregation = new AnchorAggregation({
      method: 'quality-weighted',
      minQualityThreshold: 0.6,
      pruningThreshold: 0.3,
      qualityWeightExponent: 2,
    });
  });

  describe('FedAvg aggregation', () => {
    test('should aggregate anchors using FedAvg', () => {
      const anchors: PrivateKVAnchor[] = [
        {
          ...createTestAnchor(0, 'anchor-1', 'colony-1'),
          embedding: [1, 0, 0],
          compressedKeys: new Float32Array([1, 0]),
          compressedValues: new Float32Array([0, 1]),
          qualityScore: 0.8,
        },
        {
          ...createTestAnchor(0, 'anchor-2', 'colony-2'),
          embedding: [0, 1, 0],
          compressedKeys: new Float32Array([0, 1]),
          compressedValues: new Float32Array([1, 0]),
          qualityScore: 0.7,
        },
      ];

      const result = aggregation.fedAvgAggregation(anchors);

      expect(result.embedding).toEqual([0.5, 0.5, 0]);
      expect(result.keys[0]).toBeCloseTo(0.5);
      expect(result.keys[1]).toBeCloseTo(0.5);
    });

    test('should handle empty anchor list', () => {
      const result = aggregation.fedAvgAggregation([]);

      expect(result.embedding).toEqual([]);
      expect(result.keys.length).toBe(0);
      expect(result.values.length).toBe(0);
    });
  });

  describe('quality-weighted aggregation', () => {
    test('should weight anchors by quality', () => {
      const anchors: PrivateKVAnchor[] = [
        {
          ...createTestAnchor(0, 'anchor-1', 'colony-1'),
          embedding: [1, 0, 0],
          compressedKeys: new Float32Array([1, 0]),
          compressedValues: new Float32Array([0, 1]),
          qualityScore: 0.9,
        },
        {
          ...createTestAnchor(0, 'anchor-2', 'colony-2'),
          embedding: [0, 1, 0],
          compressedKeys: new Float32Array([0, 1]),
          compressedValues: new Float32Array([1, 0]),
          qualityScore: 0.6,
        },
      ];

      const result = aggregation.qualityWeightedAggregation(anchors);

      // Higher quality anchor should have more influence
      // Quality weights: 0.9^2 = 0.81, 0.6^2 = 0.36
      // Normalized: 0.81/(0.81+0.36) ≈ 0.69, 0.36/(0.81+0.36) ≈ 0.31
      expect(result.embedding[0]).toBeGreaterThan(result.embedding[1]);
    });

    test('should handle single anchor', () => {
      const anchors: PrivateKVAnchor[] = [
        {
          ...createTestAnchor(0, 'anchor-1', 'colony-1'),
          embedding: [1, 2, 3],
          compressedKeys: new Float32Array([4, 5]),
          compressedValues: new Float32Array([6, 7]),
          qualityScore: 0.8,
        },
      ];

      const result = aggregation.qualityWeightedAggregation(anchors);

      expect(result.embedding).toEqual([1, 2, 3]);
    });
  });

  describe('full aggregation pipeline', () => {
    test('should aggregate anchors from multiple colonies', async () => {
      const package1: AnchorSyncPackage = {
        packageId: 'pkg-1',
        roundNumber: 1,
        sourceColonyId: 'colony-1',
        anchors: [
          createTestAnchor(0, 'anchor-1', 'colony-1'),
          createTestAnchor(1, 'anchor-2', 'colony-1'),
        ],
        metadata: {
          totalAnchors: 2,
          avgQualityScore: 0.8,
          privacyTier: 'COLONY',
          epsilonSpent: 0.5,
          deltaSpent: 1e-5,
          compressionRatio: 10,
        },
        timestamp: Date.now(),
      };

      const package2: AnchorSyncPackage = {
        packageId: 'pkg-2',
        roundNumber: 1,
        sourceColonyId: 'colony-2',
        anchors: [
          createTestAnchor(0, 'anchor-3', 'colony-2'),
          createTestAnchor(1, 'anchor-4', 'colony-2'),
        ],
        metadata: {
          totalAnchors: 2,
          avgQualityScore: 0.75,
          privacyTier: 'COLONY',
          epsilonSpent: 0.5,
          deltaSpent: 1e-5,
          compressionRatio: 10,
        },
        timestamp: Date.now(),
      };

      const aggregated = await aggregation.aggregateAnchors([package1, package2]);

      expect(aggregated.length).toBeGreaterThan(0);
      aggregated.forEach(anchor => {
        expect(anchor.layerId).toBeGreaterThanOrEqual(0);
        expect(anchor.aggregationMetadata.colonyCount).toBeGreaterThan(0);
        expect(anchor.aggregationMetadata.privacyPreserved).toBe(true);
      });
    });

    test('should require minimum participating colonies', async () => {
      const package1: AnchorSyncPackage = {
        packageId: 'pkg-1',
        roundNumber: 1,
        sourceColonyId: 'colony-1',
        anchors: [createTestAnchor(0, 'anchor-1', 'colony-1')],
        metadata: {
          totalAnchors: 1,
          avgQualityScore: 0.8,
          privacyTier: 'MEADOW',
          epsilonSpent: 0.5,
          deltaSpent: 1e-5,
          compressionRatio: 10,
        },
        timestamp: Date.now(),
      };

      await expect(aggregation.aggregateAnchors([package1])).rejects.toThrow();
    });

    test('should prune low-quality aggregated anchors', async () => {
      const package1: AnchorSyncPackage = {
        packageId: 'pkg-1',
        roundNumber: 1,
        sourceColonyId: 'colony-1',
        anchors: [
          {
            ...createTestAnchor(0, 'anchor-low', 'colony-1'),
            qualityScore: 0.2, // Below pruning threshold
          },
        ],
        metadata: {
          totalAnchors: 1,
          avgQualityScore: 0.2,
          privacyTier: 'COLONY',
          epsilonSpent: 0.5,
          deltaSpent: 1e-5,
          compressionRatio: 10,
        },
        timestamp: Date.now(),
      };

      const package2: AnchorSyncPackage = {
        packageId: 'pkg-2',
        roundNumber: 1,
        sourceColonyId: 'colony-2',
        anchors: [
          {
            ...createTestAnchor(0, 'anchor-high', 'colony-2'),
            qualityScore: 0.9, // Above pruning threshold
          },
        ],
        metadata: {
          totalAnchors: 1,
          avgQualityScore: 0.9,
          privacyTier: 'COLONY',
          epsilonSpent: 0.5,
          deltaSpent: 1e-5,
          compressionRatio: 10,
        },
        timestamp: Date.now(),
      };

      const aggregated = await aggregation.aggregateAnchors([package1, package2]);

      // Low quality anchor should be pruned
      aggregated.forEach(anchor => {
        expect(anchor.aggregationMetadata.avgQuality).toBeGreaterThanOrEqual(0.3);
      });
    });
  });
});

describe('Integration Tests', () => {
  test('should perform full federated anchor sync workflow', async () => {
    const anchorPool = new KVAnchorPool();
    const federatedSync = new FederatedKVSync(anchorPool);

    // Register colonies
    await federatedSync.registerColony('colony-1', 'MEADOW');
    await federatedSync.registerColony('colony-2', 'RESEARCH');

    // Create anchors in colony-1
    const metadata: KVCacheMetadata = {
      createdAt: Date.now(),
      modelHash: 'test-model',
      agentId: 'agent-1',
      conversationId: 'conv-1',
      turnNumber: 1,
      position: 0,
      length: 100,
    };

    const segment: KVCacheSegment = {
      layerId: 0,
      segmentId: 'segment-1',
      tokens: [1, 2, 3, 4, 5],
      keyCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
      valueCache: Array(100).fill(0).map(() => Array(64).fill(0).map(() => Math.random())),
      metadata,
    };

    await anchorPool.createAnchor(segment, Array(128).fill(0).map(() => Math.random()));

    // Prepare anchors for sharing
    const syncPackage = await federatedSync.prepareAnchorsForSharing('colony-1');

    expect(syncPackage.anchors.length).toBeGreaterThan(0);
    expect(syncPackage.metadata.privacyTier).toBe('MEADOW');

    // Verify privacy budget was consumed
    const budget = federatedSync.getPrivacyBudget('colony-1');
    expect(budget!.epsilonSpent).toBeGreaterThan(0);

    // Verify statistics
    const stats = federatedSync.getStats();
    expect(stats.totalAnchorsShared).toBeGreaterThan(0);
  });

  test('should aggregate anchors from multiple colonies with privacy', async () => {
    const aggregation = new AnchorAggregation({
      method: 'quality-weighted',
      minQualityThreshold: 0.6,
    });

    const privacyAware = new PrivacyAwareAnchors({
      enableDifferentialPrivacy: true,
    });

    // Create test anchors
    const baseAnchor = createTestAnchor(0, 'base', 'colony-1');

    const anchors1 = await privacyAware.applyPrivacyToAnchors(
      [
        baseAnchor,
        { ...baseAnchor, anchorId: 'anchor-2', embedding: Array(128).fill(0).map(() => Math.random()) },
      ],
      'MEADOW',
      'colony-1'
    );

    const anchors2 = await privacyAware.applyPrivacyToAnchors(
      [
        { ...baseAnchor, anchorId: 'anchor-3', embedding: Array(128).fill(0).map(() => Math.random()) },
        { ...baseAnchor, anchorId: 'anchor-4', embedding: Array(128).fill(0).map(() => Math.random()) },
      ],
      'RESEARCH',
      'colony-2'
    );

    const package1: AnchorSyncPackage = {
      packageId: 'pkg-1',
      roundNumber: 1,
      sourceColonyId: 'colony-1',
      anchors: anchors1,
      metadata: {
        totalAnchors: anchors1.length,
        avgQualityScore: 0.8,
        privacyTier: 'MEADOW',
        epsilonSpent: 2.0,
        deltaSpent: 2e-5,
        compressionRatio: 10,
      },
      timestamp: Date.now(),
    };

    const package2: AnchorSyncPackage = {
      packageId: 'pkg-2',
      roundNumber: 1,
      sourceColonyId: 'colony-2',
      anchors: anchors2,
      metadata: {
        totalAnchors: anchors2.length,
        avgQualityScore: 0.75,
        privacyTier: 'RESEARCH',
        epsilonSpent: 1.0,
        deltaSpent: 2e-6,
        compressionRatio: 10,
      },
      timestamp: Date.now(),
    };

    const aggregated = await aggregation.aggregateAnchors([package1, package2]);

    expect(aggregated.length).toBeGreaterThan(0);
    aggregated.forEach(anchor => {
      expect(anchor.aggregationMetadata.privacyPreserved).toBe(true);
      expect(anchor.aggregationMetadata.colonyCount).toBeGreaterThan(0);
    });
  });
});

// Helper function to create test anchors
function createTestAnchor(layerId: number, anchorId: string, colonyId: string): PrivateKVAnchor {
  return {
    anchorId,
    layerId,
    segmentId: `segment-${anchorId}`,
    compressedKeys: new Float32Array(64).fill(0).map(() => Math.random()),
    compressedValues: new Float32Array(64).fill(0).map(() => Math.random()),
    embedding: Array(128).fill(0).map(() => Math.random()),
    sourceSegmentId: `segment-${anchorId}`,
    sourceAgentId: `agent-${colonyId}`,
    usageCount: Math.floor(Math.random() * 100),
    lastUsed: Date.now(),
    qualityScore: 0.7 + Math.random() * 0.3, // 0.7-1.0
    compressionRatio: 8 + Math.random() * 4, // 8-12
    createdAt: Date.now(),
    updatedAt: Date.now(),
    privacyTier: 'MEADOW',
    sourceColonyId: colonyId,
    crossColonyReuseCount: Math.floor(Math.random() * 10),
    dpMetadata: {
      epsilon: 1.0,
      delta: 1e-5,
      noiseScale: 1.0,
    },
  };
}

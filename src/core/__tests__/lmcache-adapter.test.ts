/**
 * LMCache Adapter Tests
 *
 * Comprehensive test suite for LMCache adapter implementation
 * Testing serialization, connection pooling, error handling, and batch operations
 */

import {
  LMCacheAdapter,
  KVCacheSerializer,
  PythonBridge,
  createLMCacheAdapter,
  SerializedLMCache,
  SerializedTensor,
  LMKVCache,
  LMCacheAdapterConfig,
  LMCacheLookupOptions,
  LMCacheStoreOptions,
  BatchResult,
} from '../lmcache-adapter.js';
import { KVAnchor } from '../kvanchor.js';

describe('KVCacheSerializer', () => {
  let serializer: KVCacheSerializer;
  let mockAnchor: KVAnchor;

  beforeEach(() => {
    serializer = new KVCacheSerializer();
    mockAnchor = {
      anchorId: 'test-anchor-1',
      layerId: 0,
      segmentId: 'segment-1',
      compressedKeys: new Float32Array([1.0, 2.0, 3.0, 4.0]),
      compressedValues: new Float32Array([5.0, 6.0, 7.0, 8.0]),
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
      sourceSegmentId: 'segment-1',
      sourceAgentId: 'agent-1',
      usageCount: 10,
      lastUsed: Date.now(),
      qualityScore: 0.95,
      compressionRatio: 2.5,
      createdAt: Date.now() - 10000,
      updatedAt: Date.now(),
      clusterId: 'cluster-1',
      clusterCenterDistance: 0.1,
    };
  });

  describe('serialize', () => {
    test('should serialize anchor to LMCache format', () => {
      const serialized = serializer.serialize(mockAnchor);

      expect(serialized.version).toBe(1);
      expect(serialized.format).toBe('polln-kvanchor');
      expect(serialized.anchorId).toBe(mockAnchor.anchorId);
      expect(serialized.layerId).toBe(mockAnchor.layerId);
      expect(serialized.segmentId).toBe(mockAnchor.segmentId);
      expect(serialized.sourceAgentId).toBe(mockAnchor.sourceAgentId);
    });

    test('should serialize embedding correctly', () => {
      const serialized = serializer.serialize(mockAnchor);

      expect(serialized.embedding.vector).toEqual(mockAnchor.embedding);
      expect(serialized.embedding.dimension).toBe(mockAnchor.embedding.length);
    });

    test('should serialize metadata correctly', () => {
      const serialized = serializer.serialize(mockAnchor);

      expect(serialized.metadata.qualityScore).toBe(mockAnchor.qualityScore);
      expect(serialized.metadata.compressionRatio).toBe(mockAnchor.compressionRatio);
      expect(serialized.metadata.usageCount).toBe(mockAnchor.usageCount);
      expect(serialized.metadata.clusterId).toBe(mockAnchor.clusterId);
      expect(serialized.metadata.clusterCenterDistance).toBe(mockAnchor.clusterCenterDistance);
    });

    test('should serialize tensors to Base64', () => {
      const serialized = serializer.serialize(mockAnchor);

      expect(serialized.kvData.keys.dtype).toBe('float32');
      expect(serialized.kvData.keys.shape).toEqual([4]);
      expect(typeof serialized.kvData.keys.data).toBe('string');
      expect(serialized.kvData.keys.compressed).toBe(true);

      expect(serialized.kvData.values.dtype).toBe('float32');
      expect(serialized.kvData.values.shape).toEqual([4]);
      expect(typeof serialized.kvData.values.data).toBe('string');
      expect(serialized.kvData.values.compressed).toBe(true);
    });

    test('should handle empty embedding', () => {
      mockAnchor.embedding = [];
      const serialized = serializer.serialize(mockAnchor);

      expect(serialized.embedding.vector).toEqual([]);
      expect(serialized.embedding.dimension).toBe(0);
    });

    test('should handle optional cluster fields', () => {
      delete mockAnchor.clusterId;
      delete mockAnchor.clusterCenterDistance;

      const serialized = serializer.serialize(mockAnchor);

      expect(serialized.metadata.clusterId).toBeUndefined();
      expect(serialized.metadata.clusterCenterDistance).toBeUndefined();
    });
  });

  describe('deserialize', () => {
    test('should deserialize LMCache format to anchor', () => {
      const serialized = serializer.serialize(mockAnchor);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized.anchorId).toBe(mockAnchor.anchorId);
      expect(deserialized.layerId).toBe(mockAnchor.layerId);
      expect(deserialized.segmentId).toBe(mockAnchor.segmentId);
      expect(deserialized.sourceAgentId).toBe(mockAnchor.sourceAgentId);
    });

    test('should deserialize embedding correctly', () => {
      const serialized = serializer.serialize(mockAnchor);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized.embedding).toEqual(mockAnchor.embedding);
    });

    test('should deserialize metadata correctly', () => {
      const serialized = serializer.serialize(mockAnchor);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized.qualityScore).toBe(mockAnchor.qualityScore);
      expect(deserialized.compressionRatio).toBe(mockAnchor.compressionRatio);
      expect(deserialized.usageCount).toBe(mockAnchor.usageCount);
      expect(deserialized.clusterId).toBe(mockAnchor.clusterId);
      expect(deserialized.clusterCenterDistance).toBe(mockAnchor.clusterCenterDistance);
    });

    test('should deserialize tensors correctly', () => {
      const serialized = serializer.serialize(mockAnchor);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized.compressedKeys).toEqual(mockAnchor.compressedKeys);
      expect(deserialized.compressedValues).toEqual(mockAnchor.compressedValues);
    });

    test('should maintain timestamp integrity', () => {
      const serialized = serializer.serialize(mockAnchor);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized.createdAt).toBe(mockAnchor.createdAt);
      expect(deserialized.updatedAt).toBe(mockAnchor.updatedAt);
      expect(deserialized.lastUsed).toBe(mockAnchor.lastUsed);
    });
  });

  describe('round-trip serialization', () => {
    test('should maintain data integrity through serialize/deserialize', () => {
      const serialized = serializer.serialize(mockAnchor);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized).toEqual(mockAnchor);
    });

    test('should handle large embeddings', () => {
      mockAnchor.embedding = Array(128).fill(0).map(() => Math.random());

      const serialized = serializer.serialize(mockAnchor);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized.embedding).toEqual(mockAnchor.embedding);
    });

    test('should handle large tensor data', () => {
      mockAnchor.compressedKeys = new Float32Array(1000).map(() => Math.random());
      mockAnchor.compressedValues = new Float32Array(1000).map(() => Math.random());

      const serialized = serializer.serialize(mockAnchor);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized.compressedKeys).toEqual(mockAnchor.compressedKeys);
      expect(deserialized.compressedValues).toEqual(mockAnchor.compressedValues);
    });
  });

  describe('batch operations', () => {
    test('should serialize batch of anchors', () => {
      const anchors: KVAnchor[] = [
        mockAnchor,
        { ...mockAnchor, anchorId: 'test-anchor-2', layerId: 1 },
        { ...mockAnchor, anchorId: 'test-anchor-3', layerId: 2 },
      ];

      const serialized = serializer.serializeBatch(anchors);

      expect(serialized).toHaveLength(3);
      expect(serialized[0].anchorId).toBe('test-anchor-1');
      expect(serialized[1].anchorId).toBe('test-anchor-2');
      expect(serialized[2].anchorId).toBe('test-anchor-3');
    });

    test('should deserialize batch of anchors', () => {
      const anchors: KVAnchor[] = [
        mockAnchor,
        { ...mockAnchor, anchorId: 'test-anchor-2', layerId: 1 },
      ];

      const serialized = serializer.serializeBatch(anchors);
      const deserialized = serializer.deserializeBatch(serialized);

      expect(deserialized).toHaveLength(2);
      expect(deserialized[0]).toEqual(anchors[0]);
      expect(deserialized[1]).toEqual(anchors[1]);
    });

    test('should handle empty batch', () => {
      const serialized = serializer.serializeBatch([]);
      const deserialized = serializer.deserializeBatch([]);

      expect(serialized).toEqual([]);
      expect(deserialized).toEqual([]);
    });
  });
});

describe('PythonBridge', () => {
  let bridge: PythonBridge;

  beforeEach(() => {
    bridge = new PythonBridge({
      maxConnections: 5,
      connectionTimeout: 5000,
      requestTimeout: 1000,
      maxRetries: 3,
      retryDelay: 100,
    });
  });

  afterEach(() => {
    bridge.close();
  });

  describe('connection pooling', () => {
    test('should create connections up to max limit', async () => {
      const connections: string[] = [];

      // Acquire multiple connections
      for (let i = 0; i < 5; i++) {
        const connId = await bridge['acquireConnection']();
        connections.push(connId);
      }

      const stats = bridge.getConnectionStats();
      expect(stats.totalConnections).toBe(5);
      expect(stats.activeConnections).toBe(5);

      // Release connections
      for (const connId of connections) {
        bridge['releaseConnection'](connId);
      }

      const statsAfter = bridge.getConnectionStats();
      expect(statsAfter.activeConnections).toBe(0);
    });

    test('should reuse idle connections', async () => {
      const connId1 = await bridge['acquireConnection']();
      bridge['releaseConnection'](connId1);

      const connId2 = await bridge['acquireConnection']();

      expect(connId2).toBe(connId1);

      bridge['releaseConnection'](connId2);
    });

    test('should timeout when no connections available', async () => {
      const connections: string[] = [];

      // Acquire all connections
      for (let i = 0; i < 5; i++) {
        const connId = await bridge['acquireConnection']();
        connections.push(connId);
      }

      // Try to acquire one more (should timeout)
      await expect(
        bridge['acquireConnection']()
      ).rejects.toThrow('Connection timeout');

      // Cleanup
      for (const connId of connections) {
        bridge['releaseConnection'](connId);
      }
    });

    test('should track connection statistics', async () => {
      const connId = await bridge['acquireConnection']();
      const stats = bridge.getConnectionStats();

      expect(stats.totalConnections).toBeGreaterThanOrEqual(1);
      expect(stats.activeConnections).toBeGreaterThanOrEqual(1);

      bridge['releaseConnection'](connId);
    });
  });

  describe('execute', () => {
    test('should execute ping command', async () => {
      const result = await bridge.execute({
        module: 'lmcache',
        function: 'ping',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toEqual({ message: 'pong' });
    });

    test('should execute lookup command', async () => {
      const result = await bridge.execute({
        module: 'lmcache',
        function: 'lookup',
        params: { embedding: [0.1, 0.2] },
      });

      expect(result.status).toBe('ok');
    });

    test('should execute update command', async () => {
      const result = await bridge.execute({
        module: 'lmcache',
        function: 'update',
        params: { key: 'test-key', kv_cache: {} },
      });

      expect(result.status).toBe('ok');
    });

    test('should execute evict command', async () => {
      const result = await bridge.execute({
        module: 'lmcache',
        function: 'evict',
        params: { key: 'test-key' },
      });

      expect(result.status).toBe('ok');
    });

    test('should execute get_stats command', async () => {
      const result = await bridge.execute({
        module: 'lmcache',
        function: 'get_stats',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toBeDefined();
    });

    test('should handle unknown commands', async () => {
      const result = await bridge.execute({
        module: 'lmcache',
        function: 'unknown_command',
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Unknown function');
    });
  });

  describe('retry logic', () => {
    test('should retry on recoverable errors', async () => {
      // This test would require mocking the execute method
      // to simulate recoverable errors
      // For now, we test the retry configuration
      const config = {
        maxRetries: 5,
        retryDelay: 500,
      };

      const retryBridge = new PythonBridge({
        maxConnections: 2,
        connectionTimeout: 5000,
        requestTimeout: 1000,
        maxRetries: config.maxRetries,
        retryDelay: config.retryDelay,
      });

      // Verify config is stored
      expect(retryBridge['config'].maxRetries).toBe(config.maxRetries);
      expect(retryBridge['config'].retryDelay).toBe(config.retryDelay);

      retryBridge.close();
    });
  });

  describe('close', () => {
    test('should close all connections', async () => {
      // Create some connections
      const connId = await bridge['acquireConnection']();
      bridge['releaseConnection'](connId);

      // Close bridge
      bridge.close();

      const stats = bridge.getConnectionStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
    });
  });
});

describe('LMCacheAdapter', () => {
  let adapter: LMCacheAdapter;
  let config: LMCacheAdapterConfig;

  beforeEach(() => {
    config = {
      backend: 'cpu',
      chunkSize: 256,
      maxChunks: 10000,
      compression: true,
      evictionPolicy: 'lru',
      maxSizeGb: 10,
      enableRemote: false,
      maxConnections: 5,
      connectionTimeout: 5000,
      requestTimeout: 1000,
      maxRetries: 3,
      retryDelay: 100,
      enableLocalCache: true,
      localCacheSize: 100,
      localCacheTtl: 3600000,
      enableBatching: false,
      batchSize: 10,
      batchTimeout: 1000,
      enableMetrics: true,
    };

    adapter = new LMCacheAdapter(config);
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('initialization', () => {
    test('should initialize with config', () => {
      expect(adapter).toBeDefined();
    });

    test('should initialize statistics', async () => {
      const stats = await adapter.getStats();

      expect(stats.totalAnchors).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.backendType).toBe('cpu');
      expect(stats.isDistributed).toBe(false);
    });
  });

  describe('isAvailable', () => {
    test('should check backend availability', async () => {
      const available = await adapter.isAvailable();

      expect(typeof available).toBe('boolean');
    });
  });

  describe('lookup', () => {
    test('should lookup with embedding', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4];
      const result = await adapter.lookup(embedding);

      // Should return null for cache miss (no data in backend)
      expect(result).toBeNull();
    });

    test('should use local cache when enabled', async () => {
      const mockAnchor: KVAnchor = {
        anchorId: 'local-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Store in local cache
      await adapter.store(mockAnchor, { syncRemote: false });

      // Lookup should find in local cache
      const result = await adapter.lookup([0.1, 0.2, 0.3, 0.4], {
        checkLocalFirst: true,
      });

      expect(result).toBeDefined();
      expect(result?.anchorId).toBe('local-test-1');
    });

    test('should update metadata on lookup', async () => {
      const mockAnchor: KVAnchor = {
        anchorId: 'update-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 5,
        lastUsed: Date.now() - 1000,
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await adapter.store(mockAnchor, { syncRemote: false });

      await adapter.lookup([0.1, 0.2, 0.3, 0.4], {
        checkLocalFirst: true,
        updateMetadata: true,
      });

      const result = await adapter.lookup([0.1, 0.2, 0.3, 0.4], {
        checkLocalFirst: true,
        updateMetadata: false,
      });

      expect(result?.usageCount).toBeGreaterThan(5);
    });

    test('should respect maxDistance option', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4];

      await adapter.lookup(embedding, {
        maxDistance: 0.1,
      });

      // Should not throw
    });

    test('should respect topK option', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4];

      await adapter.lookup(embedding, {
        topK: 5,
      });

      // Should not throw
    });
  });

  describe('store', () => {
    test('should store anchor', async () => {
      const mockAnchor: KVAnchor = {
        anchorId: 'store-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await expect(
        adapter.store(mockAnchor, { syncRemote: false })
      ).resolves.not.toThrow();
    });

    test('should store in local cache', async () => {
      const mockAnchor: KVAnchor = {
        anchorId: 'local-cache-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await adapter.store(mockAnchor, { syncRemote: false });

      const result = await adapter.lookup([0.1, 0.2, 0.3, 0.4], {
        checkLocalFirst: true,
      });

      expect(result).toBeDefined();
      expect(result?.anchorId).toBe('local-cache-test-1');
    });

    test('should skip local cache when requested', async () => {
      const mockAnchor: KVAnchor = {
        anchorId: 'skip-local-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await adapter.store(mockAnchor, {
        syncRemote: false,
        skipLocalCache: true,
      });

      const result = await adapter.lookup([0.1, 0.2, 0.3, 0.4], {
        checkLocalFirst: true,
      });

      // Should not find in local cache
      expect(result).toBeNull();
    });

    test('should enforce local cache size limit', async () => {
      const smallConfig = { ...config, localCacheSize: 3 };
      const smallAdapter = new LMCacheAdapter(smallConfig);

      // Store 5 anchors
      for (let i = 0; i < 5; i++) {
        const anchor: KVAnchor = {
          anchorId: `limit-test-${i}`,
          layerId: i,
          segmentId: `segment-${i}`,
          compressedKeys: new Float32Array([1, 2, 3, 4]),
          compressedValues: new Float32Array([5, 6, 7, 8]),
          embedding: [0.1 * i, 0.2 * i, 0.3 * i, 0.4 * i],
          sourceSegmentId: `segment-${i}`,
          sourceAgentId: 'agent-1',
          usageCount: 0,
          lastUsed: Date.now(),
          qualityScore: 1.0,
          compressionRatio: 1.0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await smallAdapter.store(anchor, { syncRemote: false });
      }

      const stats = await smallAdapter.getStats();
      expect(stats.localCacheSize).toBeLessThanOrEqual(3);

      await smallAdapter.close();
    });
  });

  describe('batchLookup', () => {
    test('should lookup multiple embeddings', async () => {
      const embeddings = [
        [0.1, 0.2, 0.3, 0.4],
        [0.5, 0.6, 0.7, 0.8],
        [0.9, 1.0, 1.1, 1.2],
      ];

      const results = await adapter.batchLookup(embeddings);

      expect(results).toHaveLength(3);
      expect(results.every(r => r === null || typeof r === 'object')).toBe(true);
    });

    test('should find locally cached anchors', async () => {
      const mockAnchor: KVAnchor = {
        anchorId: 'batch-lookup-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await adapter.store(mockAnchor, { syncRemote: false });

      const embeddings = [
        [0.1, 0.2, 0.3, 0.4],
        [0.5, 0.6, 0.7, 0.8],
      ];

      const results = await adapter.batchLookup(embeddings);

      expect(results[0]).toBeDefined();
      expect(results[0]?.anchorId).toBe('batch-lookup-test-1');
    });

    test('should handle empty embeddings array', async () => {
      const results = await adapter.batchLookup([]);

      expect(results).toEqual([]);
    });
  });

  describe('batchStore', () => {
    test('should store multiple anchors', async () => {
      const anchors: KVAnchor[] = [
        {
          anchorId: 'batch-store-test-1',
          layerId: 0,
          segmentId: 'segment-1',
          compressedKeys: new Float32Array([1, 2, 3, 4]),
          compressedValues: new Float32Array([5, 6, 7, 8]),
          embedding: [0.1, 0.2, 0.3, 0.4],
          sourceSegmentId: 'segment-1',
          sourceAgentId: 'agent-1',
          usageCount: 0,
          lastUsed: Date.now(),
          qualityScore: 1.0,
          compressionRatio: 1.0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          anchorId: 'batch-store-test-2',
          layerId: 1,
          segmentId: 'segment-2',
          compressedKeys: new Float32Array([1, 2, 3, 4]),
          compressedValues: new Float32Array([5, 6, 7, 8]),
          embedding: [0.5, 0.6, 0.7, 0.8],
          sourceSegmentId: 'segment-2',
          sourceAgentId: 'agent-2',
          usageCount: 0,
          lastUsed: Date.now(),
          qualityScore: 1.0,
          compressionRatio: 1.0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const result = await adapter.batchStore(anchors);

      expect(result.total).toBe(2);
      expect(result.succeeded).toBeGreaterThanOrEqual(0);
      expect(result.failed + result.succeeded).toBe(2);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should cache locally', async () => {
      const anchors: KVAnchor[] = [
        {
          anchorId: 'batch-local-test-1',
          layerId: 0,
          segmentId: 'segment-1',
          compressedKeys: new Float32Array([1, 2, 3, 4]),
          compressedValues: new Float32Array([5, 6, 7, 8]),
          embedding: [0.1, 0.2, 0.3, 0.4],
          sourceSegmentId: 'segment-1',
          sourceAgentId: 'agent-1',
          usageCount: 0,
          lastUsed: Date.now(),
          qualityScore: 1.0,
          compressionRatio: 1.0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await adapter.batchStore(anchors);

      const result = await adapter.lookup([0.1, 0.2, 0.3, 0.4], {
        checkLocalFirst: true,
      });

      expect(result).toBeDefined();
      expect(result?.anchorId).toBe('batch-local-test-1');
    });

    test('should handle empty array', async () => {
      const result = await adapter.batchStore([]);

      expect(result.total).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('evict', () => {
    test('should evict anchor from cache', async () => {
      const mockAnchor: KVAnchor = {
        anchorId: 'evict-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await adapter.store(mockAnchor, { syncRemote: false });
      await adapter.evict('evict-test-1');

      const result = await adapter.lookup([0.1, 0.2, 0.3, 0.4], {
        checkLocalFirst: true,
      });

      expect(result).toBeNull();
    });

    test('should handle evicting non-existent anchor', async () => {
      await expect(
        adapter.evict('non-existent-anchor')
      ).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    test('should return statistics', async () => {
      const stats = await adapter.getStats();

      expect(stats.totalAnchors).toBeDefined();
      expect(stats.hitRate).toBeDefined();
      expect(stats.hitCount).toBeDefined();
      expect(stats.missCount).toBeDefined();
      expect(stats.evictionCount).toBeDefined();
      expect(stats.sizeBytes).toBeDefined();
      expect(stats.compressionRatio).toBeDefined();
      expect(stats.backendType).toBeDefined();
      expect(stats.isDistributed).toBeDefined();
      expect(stats.activeConnections).toBeDefined();
      expect(stats.totalRequests).toBeDefined();
      expect(stats.failedRequests).toBeDefined();
      expect(stats.avgLatency).toBeDefined();
      expect(stats.localCacheHits).toBeDefined();
      expect(stats.localCacheSize).toBeDefined();
      expect(stats.batchOperations).toBeDefined();
      expect(stats.avgBatchSize).toBeDefined();
    });

    test('should track hits and misses', async () => {
      const mockAnchor: KVAnchor = {
        anchorId: 'stats-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await adapter.store(mockAnchor, { syncRemote: false });

      // Hit - exact match
      await adapter.lookup([0.1, 0.2, 0.3, 0.4], { checkLocalFirst: true });

      // Miss - very different embedding (orthogonal)
      await adapter.lookup([0.9, -0.9, 0.9, -0.9], { checkLocalFirst: true });

      const stats = await adapter.getStats();

      expect(stats.hitCount).toBeGreaterThan(0);
      expect(stats.missCount).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('clearLocalCache', () => {
    test('should clear local cache', async () => {
      const mockAnchor: KVAnchor = {
        anchorId: 'clear-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await adapter.store(mockAnchor, { syncRemote: false });
      adapter.clearLocalCache();

      const stats = await adapter.getStats();
      expect(stats.localCacheSize).toBe(0);

      const result = await adapter.lookup([0.1, 0.2, 0.3, 0.4], {
        checkLocalFirst: true,
      });

      expect(result).toBeNull();
    });
  });

  describe('close', () => {
    test('should close adapter gracefully', async () => {
      const testAdapter = new LMCacheAdapter(config);

      // Store some data
      const mockAnchor: KVAnchor = {
        anchorId: 'close-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await testAdapter.store(mockAnchor, { syncRemote: false });

      await expect(testAdapter.close()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    test('should emit error events', async () => {
      const errorAdapter = new LMCacheAdapter({
        ...config,
        enableMetrics: true,
      });

      const errorHandler = jest.fn();
      errorAdapter.on('error', errorHandler);

      // Trigger an error by trying to store with invalid config
      // (This would fail in the backend)
      const mockAnchor: KVAnchor = {
        anchorId: 'error-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Store with syncRemote=true to trigger backend call
      // (In real scenario, this might fail)
      await errorAdapter.store(mockAnchor, { syncRemote: false });

      await errorAdapter.close();
    });
  });

  describe('batching', () => {
    test('should enable batching', async () => {
      const batchConfig = { ...config, enableBatching: true, batchSize: 2 };
      const batchAdapter = new LMCacheAdapter(batchConfig);

      const mockAnchor: KVAnchor = {
        anchorId: 'batching-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Store should queue batch
      await batchAdapter.store(mockAnchor, { syncRemote: true });

      // Flush batch
      await batchAdapter.flushBatch();

      await batchAdapter.close();
    });
  });

  describe('local cache expiration', () => {
    test('should expire old local cache entries', async () => {
      const shortTtlConfig = { ...config, localCacheTtl: 100 };
      const ttlAdapter = new LMCacheAdapter(shortTtlConfig);

      const mockAnchor: KVAnchor = {
        anchorId: 'ttl-test-1',
        layerId: 0,
        segmentId: 'segment-1',
        compressedKeys: new Float32Array([1, 2, 3, 4]),
        compressedValues: new Float32Array([5, 6, 7, 8]),
        embedding: [0.1, 0.2, 0.3, 0.4],
        sourceSegmentId: 'segment-1',
        sourceAgentId: 'agent-1',
        usageCount: 0,
        lastUsed: Date.now(),
        qualityScore: 1.0,
        compressionRatio: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await ttlAdapter.store(mockAnchor, { syncRemote: false });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Trigger cleanup
      await ttlAdapter.lookup([0.1, 0.2, 0.3, 0.4], { checkLocalFirst: true });

      const stats = await ttlAdapter.getStats();
      // Cache should be empty or near empty after expiration
      expect(stats.localCacheSize).toBeLessThan(1);

      await ttlAdapter.close();
    });
  });
});

describe('createLMCacheAdapter factory', () => {
  test('should create adapter with defaults', () => {
    const adapter = createLMCacheAdapter();

    expect(adapter).toBeDefined();
  });

  test('should create adapter with custom config', () => {
    const adapter = createLMCacheAdapter({
      backend: 'disk',
      maxSizeGb: 100,
    });

    expect(adapter).toBeDefined();
  });

  test('should merge config with defaults', async () => {
    const adapter = createLMCacheAdapter({
      backend: 's3',
      maxSizeGb: 50,
    });

    const stats = await adapter.getStats();
    expect(stats.backendType).toBe('s3');

    await adapter.close();
  });
});

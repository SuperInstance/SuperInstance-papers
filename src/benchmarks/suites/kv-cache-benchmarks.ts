/**
 * POLLN KV-Cache Benchmarks
 *
 * Measure performance of KV-cache operations including
 * anchor pool management, ANN search, and LMCache adapter.
 */

import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import type { BenchmarkSuite, BenchmarkConfig, BenchmarkMetrics } from '../types.js';
import {
  KVAnchorPool,
  AnchorMatcher,
  OffsetPredictor,
  KVCacheSegment,
} from '../../core/kvanchor.js';
import { ANNIndex } from '../../core/ann-index.js';
import { LMCacheAdapter } from '../../core/lmcache-adapter.js';
import { calculateStats, calculateThroughput } from '../benchmark-profiler.js';

/**
 * KVCacheBenchmarks - KV-cache system performance tests
 */
export class K VCacheBenchmarks implements BenchmarkSuite {
  name = 'kv-cache';
  description = 'KV-cache and anchor management benchmarks';
  version = '1.0.0';

  private anchorPool?: KVAnchorPool;
  private annIndex?: ANNIndex;
  private lmcacheAdapter?: LMCacheAdapter;

  async setup(): Promise<void> {
    this.anchorPool = new KVAnchorPool({
      maxAnchors: 1000,
      similarityThreshold: 0.8,
      embeddingDim: 128,
    });

    this.annIndex = new ANNIndex({
      type: 'hnsw',
      dim: 128,
      maxElements: 10000,
    });

    this.lmcacheAdapter = new LMCacheAdapter({
      backendUrl: 'http://localhost:8080',
      enableCompression: true,
    });
  }

  async teardown(): Promise<void> {
    this.anchorPool?.clear();
    this.annIndex?.clear();
    this.anchorPool = undefined;
    this.annIndex = undefined;
    this.lmcacheAdapter = undefined;
  }

  benchmarks = new Map<string, (config: BenchmarkConfig) => Promise<BenchmarkMetrics>>([
    ['anchor-create', this.benchmarkAnchorCreate.bind(this)],
    ['anchor-retrieve', this.benchmarkAnchorRetrieve.bind(this)],
    ['anchor-match', this.benchmarkAnchorMatch.bind(this)],
    ['anchor-pool-operations', this.benchmarkAnchorPoolOperations.bind(this)],
    ['ann-index-build', this.benchmarkANNIndexBuild.bind(this)],
    ['ann-search', this.benchmarkANNSearch.bind(this)],
    ['ann-batch-search', this.benchmarkANNBatchSearch.bind(this)],
    ['lmcache-serialize', this.benchmarkLMCacheSerialize.bind(this)],
    ['lmcache-deserialize', this.benchmarkLMCacheDeserialize.bind(this)],
    ['kv-integration', this.benchmarkKVIntegration.bind(this)],
  ]);

  /**
   * Benchmark: Anchor creation
   */
  private async benchmarkAnchorCreate(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.anchorPool) throw new Error('AnchorPool not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const segment = this.createMockSegment(i);
      const embedding = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();
      await this.anchorPool.createAnchor(segment, embedding);
      const end = performance.now();

      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Anchor retrieval
   */
  private async benchmarkAnchorRetrieve(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.anchorPool) throw new Error('AnchorPool not initialized');

    // Create anchors first
    const anchorIds: string[] = [];
    for (let i = 0; i < config.iterations; i++) {
      const segment = this.createMockSegment(i);
      const embedding = new Array(128).fill(0).map(() => Math.random());
      const anchor = await this.anchorPool.createAnchor(segment, embedding);
      anchorIds.push(anchor.anchorId);
    }

    const samples: number[] = [];

    for (const anchorId of anchorIds) {
      const start = performance.now();
      this.anchorPool.getAnchor(anchorId);
      const end = performance.now();

      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Anchor matching
   */
  private async benchmarkAnchorMatch(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.anchorPool) throw new Error('AnchorPool not initialized');

    // Create anchors
    for (let i = 0; i < 100; i++) {
      const segment = this.createMockSegment(i);
      const embedding = new Array(128).fill(0).map(() => Math.random());
      await this.anchorPool.createAnchor(segment, embedding);
    }

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const queryEmbedding = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();
      this.anchorPool.findSimilarAnchors(queryEmbedding, 0, 0.8);
      const end = performance.now();

      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Anchor pool operations
   */
  private async benchmarkAnchorPoolOperations(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.anchorPool) throw new Error('AnchorPool not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const segment = this.createMockSegment(i);
      const embedding = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();

      // Create anchor
      await this.anchorPool.createAnchor(segment, embedding);

      // Find similar
      this.anchorPool.findSimilarAnchors(embedding, 0, 0.8);

      // Get stats
      this.anchorPool.getStats();

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: ANN index build
   */
  private async benchmarkANNIndexBuild(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.annIndex) throw new Error('ANNIndex not initialized');

    const batchSize = 100;
    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const vectors = Array.from({ length: batchSize }, () =>
        new Array(128).fill(0).map(() => Math.random())
      );

      const start = performance.now();

      for (const vector of vectors) {
        this.annIndex.insert(uuidv4(), vector);
      }

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, batchSize);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: ANN search
   */
  private async benchmarkANNSearch(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.annIndex) throw new Error('ANNIndex not initialized');

    // Build index
    for (let i = 0; i < 1000; i++) {
      this.annIndex.insert(uuidv4(), new Array(128).fill(0).map(() => Math.random()));
    }

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const query = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();
      this.annIndex.search(query, 10);
      const end = performance.now();

      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: ANN batch search
   */
  private async benchmarkANNBatchSearch(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.annIndex) throw new Error('ANNIndex not initialized');

    // Build index
    for (let i = 0; i < 1000; i++) {
      this.annIndex.insert(uuidv4(), new Array(128).fill(0).map(() => Math.random()));
    }

    const batchSize = 10;
    const samples: number[] = [];

    for (let i = 0; i < Math.floor(config.iterations / batchSize); i++) {
      const queries = Array.from({ length: batchSize }, () =>
        new Array(128).fill(0).map(() => Math.random())
      );

      const start = performance.now();

      for (const query of queries) {
        this.annIndex.search(query, 10);
      }

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, batchSize);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: LMCache serialization
   */
  private async benchmarkLMCacheSerialize(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.lmcacheAdapter) throw new Error('LMCacheAdapter not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const segment = this.createMockSegment(i);

      const start = performance.now();
      await this.lmcacheAdapter.serializeSegment(segment);
      const end = performance.now();

      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: LMCache deserialization
   */
  private async benchmarkLMCacheDeserialize(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.lmcacheAdapter) throw new Error('LMCacheAdapter not initialized');

    // Serialize some segments first
    const serializedData: string[] = [];
    for (let i = 0; i < config.iterations; i++) {
      const segment = this.createMockSegment(i);
      const serialized = await this.lmcacheAdapter.serializeSegment(segment);
      serializedData.push(serialized);
    }

    const samples: number[] = [];

    for (const data of serializedData) {
      const start = performance.now();
      await this.lmcacheAdapter.deserializeSegment(data);
      const end = performance.now();

      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: KV-cache integration
   */
  private async benchmarkKVIntegration(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.anchorPool || !this.annIndex) throw new Error('KV components not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const segment = this.createMockSegment(i);
      const embedding = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();

      // Create anchor
      const anchor = await this.anchorPool.createAnchor(segment, embedding);

      // Insert into ANN
      this.annIndex.insert(anchor.anchorId, embedding);

      // Search
      this.annIndex.search(embedding, 5);

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Helper: Create mock KV-cache segment
   */
  private createMockSegment(index: number): KVCacheSegment {
    const dModel = 64;
    const seqLen = 128;

    return {
      layerId: index % 32,
      segmentId: uuidv4(),
      tokens: Array.from({ length: seqLen }, () => Math.floor(Math.random() * 50000)),
      keyCache: Array.from({ length: seqLen }, () =>
        Array.from({ length: dModel }, () => Math.random())
      ),
      valueCache: Array.from({ length: seqLen }, () =>
        Array.from({ length: dModel }, () => Math.random())
      ),
      metadata: {
        createdAt: Date.now(),
        modelHash: 'mock-model',
        agentId: uuidv4(),
        conversationId: uuidv4(),
        turnNumber: 1,
        position: 0,
        length: seqLen,
      },
    };
  }
}

/**
 * POLLN World Model and Dreaming Benchmarks
 *
 * Measure performance of VAE world model, dreaming optimization,
 * and tile system operations.
 */

import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import type { BenchmarkSuite, BenchmarkConfig, BenchmarkMetrics } from '../types.js';
import { WorldModel } from '../../core/worldmodel.js';
import { DreamBasedPolicyOptimizer } from '../../core/dreaming.js';
import { TileDreaming } from '../../core/tiledreaming.js';
import { calculateStats, calculateThroughput } from '../benchmark-profiler.js';

/**
 * WorldModelBenchmarks - World model and dreaming performance tests
 */
export class WorldModelBenchmarks implements BenchmarkSuite {
  name = 'worldmodel';
  description = 'World model and dreaming benchmarks';
  version = '1.0.0';

  private worldModel?: WorldModel;
  private dreamOptimizer?: DreamBasedPolicyOptimizer;
  private tileDreaming?: TileDreaming;

  async setup(): Promise<void> {
    this.worldModel = new WorldModel({
      stateDim: 128,
      latentDim: 32,
      learningRate: 0.001,
    });

    this.dreamOptimizer = new DreamBasedPolicyOptimizer({
      numDreams: 100,
      dreamLength: 10,
      explorationRate: 0.1,
    });

    this.tileDreaming = new TileDreaming({
      optimizationIterations: 50,
      batchSize: 20,
    });
  }

  async teardown(): Promise<void> {
    this.worldModel = undefined;
    this.dreamOptimizer = undefined;
    this.tileDreaming = undefined;
  }

  benchmarks = new Map<string, (config: BenchmarkConfig) => Promise<BenchmarkMetrics>>([
    ['worldmodel-encode', this.benchmarkWorldModelEncode.bind(this)],
    ['worldmodel-decode', this.benchmarkWorldModelDecode.bind(this)],
    ['worldmodel-reconstruct', this.benchmarkWorldModelReconstruct.bind(this)],
    ['dreaming-single', this.benchmarkDreamingSingle.bind(this)],
    ['dreaming-batch', this.benchmarkDreamingBatch.bind(this)],
    ['dreaming-optimization', this.benchmarkDreamingOptimization.bind(this)],
    ['tile-dreaming', this.benchmarkTileDreaming.bind(this)],
    ['tile-dreaming-overnight', this.benchmarkTileDreamingOvernight.bind(this)],
    ['worldmodel-training', this.benchmarkWorldModelTraining.bind(this)],
    ['dreaming-integration', this.benchmarkDreamingIntegration.bind(this)],
  ]);

  /**
   * Benchmark: World model encoding
   */
  private async benchmarkWorldModelEncode(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.worldModel) throw new Error('WorldModel not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const state = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();
      await this.worldModel.encode(state);
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
   * Benchmark: World model decoding
   */
  private async benchmarkWorldModelDecode(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.worldModel) throw new Error('WorldModel not initialized');

    // Encode some states first
    const latents = [];
    for (let i = 0; i < config.iterations; i++) {
      const state = new Array(128).fill(0).map(() => Math.random());
      const latent = await this.worldModel.encode(state);
      latents.push(latent);
    }

    const samples: number[] = [];

    for (const latent of latents) {
      const start = performance.now();
      await this.worldModel.decode(latent);
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
   * Benchmark: World model reconstruction
   */
  private async benchmarkWorldModelReconstruct(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.worldModel) throw new Error('WorldModel not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const state = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();

      const latent = await this.worldModel.encode(state);
      await this.worldModel.decode(latent);

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
   * Benchmark: Single dream generation
   */
  private async benchmarkDreamingSingle(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.dreamOptimizer) throw new Error('DreamOptimizer not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const currentState = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();
      await this.dreamOptimizer.generateDream(currentState);
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
   * Benchmark: Batch dream generation
   */
  private async benchmarkDreamingBatch(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.dreamOptimizer) throw new Error('DreamOptimizer not initialized');

    const batchSize = 10;
    const samples: number[] = [];

    for (let i = 0; i < Math.floor(config.iterations / batchSize); i++) {
      const currentState = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();

      for (let j = 0; j < batchSize; j++) {
        await this.dreamOptimizer!.generateDream(currentState);
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
   * Benchmark: Dreaming optimization cycle
   */
  private async benchmarkDreamingOptimization(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.dreamOptimizer) throw new Error('DreamOptimizer not initialized');

    const samples: number[] = [];

    for (let i = 0; i < Math.min(config.iterations, 50); i++) {
      const currentState = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();

      // Generate multiple dreams
      const dreams = [];
      for (let j = 0; j < 10; j++) {
        dreams.push(await this.dreamOptimizer.generateDream(currentState));
      }

      // Optimize policy based on dreams
      await this.dreamOptimizer.optimizePolicy(dreams);

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
   * Benchmark: Tile dreaming
   */
  private async benchmarkTileDreaming(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.tileDreaming) throw new Error('TileDreaming not initialized');

    const samples: number[] = [];

    for (let i = 0; i < Math.min(config.iterations, 30); i++) {
      const tileStates = Array.from({ length: 10 }, () =>
        new Array(128).fill(0).map(() => Math.random())
      );

      const start = performance.now();
      await this.tileDreaming.optimize(tileStates);
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
   * Benchmark: Overnight tile dreaming
   */
  private async benchmarkTileDreamingOvernight(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.tileDreaming) throw new Error('TileDreaming not initialized');

    const samples: number[] = [];

    for (let i = 0; i < Math.min(config.iterations, 10); i++) {
      const experiences = Array.from({ length: 100 }, () => ({
        state: new Array(128).fill(0).map(() => Math.random()),
        action: Math.floor(Math.random() * 10),
        reward: Math.random() * 2 - 1,
        nextState: new Array(128).fill(0).map(() => Math.random()),
      }));

      const start = performance.now();

      // Simulate overnight optimization
      await this.tileDreaming.optimizeOvernight(experiences, 50);

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
   * Benchmark: World model training
   */
  private async benchmarkWorldModelTraining(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.worldModel) throw new Error('WorldModel not initialized');

    const batchSize = 20;
    const samples: number[] = [];

    for (let i = 0; i < Math.floor(config.iterations / batchSize); i++) {
      const states = Array.from({ length: batchSize }, () =>
        new Array(128).fill(0).map(() => Math.random())
      );

      const start = performance.now();

      // Train on batch
      for (const state of states) {
        await this.worldModel!.train(state);
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
   * Benchmark: Dreaming integration with world model
   */
  private async benchmarkDreamingIntegration(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.worldModel || !this.dreamOptimizer) throw new Error('Components not initialized');

    const samples: number[] = [];

    for (let i = 0; i < Math.min(config.iterations, 30); i++) {
      const currentState = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();

      // Encode state
      const latent = await this.worldModel.encode(currentState);

      // Generate dream from latent
      await this.dreamOptimizer.generateDreamFromLatent(latent);

      // Decode dream
      await this.worldModel.decode(latent);

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
}

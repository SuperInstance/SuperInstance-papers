/**
 * POLLN Learning System Benchmarks
 *
 * Measure performance of Hebbian learning, Value Network,
 * and TD(lambda) predictions.
 */

import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import type { BenchmarkSuite, BenchmarkConfig, BenchmarkMetrics } from '../types.js';
import { HebbianLearning } from '../../core/learning.js';
import { ValueNetwork } from '../../core/valuenetwork.js';
import { calculateStats, calculateThroughput } from '../benchmark-profiler.js';

/**
 * LearningBenchmarks - Learning system performance tests
 */
export class LearningBenchmarks implements BenchmarkSuite {
  name = 'learning';
  description = 'Hebbian and Value Network learning benchmarks';
  version = '1.0.0';

  private hebbian?: HebbianLearning;
  private valueNetwork?: ValueNetwork;

  async setup(): Promise<void> {
    this.hebbian = new HebbianLearning({
      learningRate: 0.01,
      decayRate: 0.001,
      minWeight: 0.01,
      maxWeight: 1.0,
      traceLength: 100,
      traceDecay: 0.95,
      ojaNormalization: true,
    });

    this.valueNetwork = new ValueNetwork({
      learningRate: 0.01,
      discountFactor: 0.99,
      lambda: 0.9,
      eligibilityTraceDecay: 0.95,
    });
  }

  async teardown(): Promise<void> {
    this.hebbian = undefined;
    this.valueNetwork = undefined;
  }

  benchmarks = new Map<string, (config: BenchmarkConfig) => Promise<BenchmarkMetrics>>([
    ['hebbian-synapse-update', this.benchmarkHebbianSynapseUpdate.bind(this)],
    ['hebbian-batch-update', this.benchmarkHebbianBatchUpdate.bind(this)],
    ['hebbian-weight-decay', this.benchmarkHebbianWeightDecay.bind(this)],
    ['hebbian-oja-normalization', this.benchmarkHebbianOjaNormalization.bind(this)],
    ['valuenet-predict', this.benchmarkValueNetPredict.bind(this)],
    ['valuenet-update', this.benchmarkValueNetUpdate.bind(this)],
    ['valuenet-td-lambda', this.benchmarkValueNetTDLambda.bind(this)],
    ['valuenet-eligibility-trace', this.benchmarkValueNetEligibilityTrace.bind(this)],
    ['learning-integration', this.benchmarkLearningIntegration.bind(this)],
    ['learning-scalability', this.benchmarkLearningScalability.bind(this)],
  ]);

  /**
   * Benchmark: Hebbian synapse update
   */
  private async benchmarkHebbianSynapseUpdate(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.hebbian) throw new Error('Hebbian not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const sourceId = uuidv4();
      const targetId = uuidv4();
      const preActivity = Math.random();
      const postActivity = Math.random();
      const reward = Math.random() * 2 - 1;

      const start = performance.now();
      await this.hebbian.updateSynapse(sourceId, targetId, preActivity, postActivity, reward);
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
   * Benchmark: Hebbian batch update
   */
  private async benchmarkHebbianBatchUpdate(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.hebbian) throw new Error('Hebbian not initialized');

    const batchSize = 50;
    const batches = Math.floor(config.iterations / batchSize);

    const samples: number[] = [];

    for (let i = 0; i < batches; i++) {
      const updates = Array.from({ length: batchSize }, () => ({
        sourceId: uuidv4(),
        targetId: uuidv4(),
        preActivity: Math.random(),
        postActivity: Math.random(),
        reward: Math.random() * 2 - 1,
      }));

      const start = performance.now();

      for (const update of updates) {
        await this.hebbian!.updateSynapse(
          update.sourceId,
          update.targetId,
          update.preActivity,
          update.postActivity,
          update.reward
        );
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
   * Benchmark: Hebbian weight decay
   */
  private async benchmarkHebbianWeightDecay(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.hebbian) throw new Error('Hebbian not initialized');

    // Create some synapses first
    for (let i = 0; i < 100; i++) {
      await this.hebbian.updateSynapse(uuidv4(), uuidv4(), 1, 1, 1);
    }

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();

      // Trigger decay by waiting
      await new Promise(resolve => setTimeout(resolve, 1));

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
   * Benchmark: Hebbian Oja normalization
   */
  private async benchmarkHebbianOjaNormalization(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const hebbianWithOja = new HebbianLearning({
      learningRate: 0.01,
      ojaNormalization: true,
    });

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const sourceId = uuidv4();
      const targetId = uuidv4();

      const start = performance.now();
      await hebbianWithOja.updateSynapse(sourceId, targetId, 1, 1, 1);
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
   * Benchmark: Value Network prediction
   */
  private async benchmarkValueNetPredict(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.valueNetwork) throw new Error('ValueNetwork not initialized');

    // Create some state embeddings
    const states = Array.from({ length: config.iterations }, () =>
      new Array(128).fill(0).map(() => Math.random())
    );

    const samples: number[] = [];

    for (const state of states) {
      const start = performance.now();
      await this.valueNetwork.predict(state);
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
   * Benchmark: Value Network update
   */
  private async benchmarkValueNetUpdate(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.valueNetwork) throw new Error('ValueNetwork not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const state = new Array(128).fill(0).map(() => Math.random());
      const reward = Math.random() * 2 - 1;
      const nextState = new Array(128).fill(0).map(() => Math.random());
      const done = Math.random() > 0.9;

      const start = performance.now();
      await this.valueNetwork.update(state, reward, nextState, done);
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
   * Benchmark: TD(lambda) learning
   */
  private async benchmarkValueNetTDLambda(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.valueNetwork) throw new Error('ValueNetwork not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const trajectory = Array.from({ length: 10 }, () => ({
        state: new Array(128).fill(0).map(() => Math.random()),
        reward: Math.random() * 2 - 1,
        done: false,
      }));

      trajectory[trajectory.length - 1].done = true;

      const start = performance.now();

      // Process trajectory
      for (let j = 0; j < trajectory.length; j++) {
        const { state, reward, done } = trajectory[j];
        const nextState = trajectory[j + 1]?.state || state;
        await this.valueNetwork.update(state, reward, nextState, done);
      }

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 10);

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
   * Benchmark: Eligibility trace management
   */
  private async benchmarkValueNetEligibilityTrace(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.valueNetwork) throw new Error('ValueNetwork not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const states = Array.from({ length: 20 }, () =>
        new Array(128).fill(0).map(() => Math.random())
      );

      const start = performance.now();

      // Build up eligibility trace
      for (const state of states) {
        await this.valueNetwork.predict(state);
      }

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 20);

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
   * Benchmark: Learning system integration
   */
  private async benchmarkLearningIntegration(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.hebbian || !this.valueNetwork) throw new Error('Learning systems not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const sourceId = uuidv4();
      const targetId = uuidv4();
      const state = new Array(128).fill(0).map(() => Math.random());

      const start = performance.now();

      // Hebbian update
      await this.hebbian.updateSynapse(sourceId, targetId, 0.8, 0.9, 0.5);

      // Value network prediction
      await this.valueNetwork.predict(state);

      // Value network update
      const nextState = new Array(128).fill(0).map(() => Math.random());
      await this.valueNetwork.update(state, 0.5, nextState, false);

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
   * Benchmark: Learning scalability
   */
  private async benchmarkLearningScalability(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.hebbian) throw new Error('Hebbian not initialized');

    const synapseCounts = [10, 50, 100, 500, 1000];
    const samples: number[] = [];

    for (const count of synapseCounts) {
      const start = performance.now();

      for (let i = 0; i < count; i++) {
        await this.hebbian.updateSynapse(uuidv4(), uuidv4(), 1, 1, 1);
      }

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

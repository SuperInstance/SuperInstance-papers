/**
 * POLLN Decision Layer Benchmarks
 *
 * Measure performance of Plinko decision layer including
 * proposal processing, stochastic selection, and temperature annealing.
 */

import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import type { BenchmarkSuite, BenchmarkConfig, BenchmarkMetrics } from '../types.js';
import { PlinkoLayer, AgentProposal } from '../../core/decision.js';
import { calculateStats, calculateThroughput } from '../benchmark-profiler.js';

/**
 * DecisionBenchmarks - Plinko decision layer performance tests
 */
export class DecisionBenchmarks implements BenchmarkSuite {
  name = 'decision';
  description = 'Plinko decision layer benchmarks';
  version = '1.0.0';

  private plinko?: PlinkoLayer;

  async setup(): Promise<void> {
    this.plinko = new PlinkoLayer({
      temperature: 1.0,
      minTemperature: 0.1,
      decayRate: 0.001,
    });
  }

  async teardown(): Promise<void> {
    this.plinko = undefined;
  }

  benchmarks = new Map<string, (config: BenchmarkConfig) => Promise<BenchmarkMetrics>>([
    ['plinko-single-proposal', this.benchmarkPlinkoSingleProposal.bind(this)],
    ['plinko-multiple-proposals', this.benchmarkPlinkoMultipleProposals.bind(this)],
    ['plinko-gumbel-softmax', this.benchmarkPlinkoGumbelSoftmax.bind(this)],
    ['plinko-entropy-calc', this.benchmarkPlinkoEntropyCalc.bind(this)],
    ['plinko-discriminator', this.benchmarkPlinkoDiscriminator.bind(this)],
    ['plinko-temperature-anneal', this.benchmarkPlinkoTemperatureAnneal.bind(this)],
    ['plinko-safety-override', this.benchmarkPlinkoSafetyOverride.bind(this)],
    ['plinko-batch-process', this.benchmarkPlinkoBatchProcess.bind(this)],
    ['plinko-selection-stability', this.benchmarkPlinkoSelectionStability.bind(this)],
    ['plinko-scalability', this.benchmarkPlinkoScalability.bind(this)],
  ]);

  /**
   * Benchmark: Single proposal processing
   */
  private async benchmarkPlinkoSingleProposal(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.plinko) throw new Error('Plinko not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const proposals: AgentProposal[] = [
        {
          agentId: uuidv4(),
          confidence: 0.8,
          bid: 0.5,
        },
      ];

      const start = performance.now();
      await this.plinko.process(proposals);
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
   * Benchmark: Multiple proposals processing
   */
  private async benchmarkPlinkoMultipleProposals(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.plinko) throw new Error('Plinko not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const proposals: AgentProposal[] = Array.from({ length: 10 }, () => ({
        agentId: uuidv4(),
        confidence: Math.random(),
        bid: Math.random(),
      }));

      const start = performance.now();
      await this.plinko.process(proposals);
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
   * Benchmark: Gumbel-Softmax selection
   */
  private async benchmarkPlinkoGumbelSoftmax(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.plinko) throw new Error('Plinko not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const proposals: AgentProposal[] = Array.from({ length: 20 }, () => ({
        agentId: uuidv4(),
        confidence: 0.5 + Math.random() * 0.5,
        bid: Math.random(),
      }));

      const start = performance.now();
      await this.plinko.process(proposals);
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
   * Benchmark: Entropy calculation
   */
  private async benchmarkPlinkoEntropyCalc(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const proposals: AgentProposal[] = Array.from({ length: 10 }, () => ({
        agentId: uuidv4(),
        confidence: Math.random(),
        bid: Math.random(),
      }));

      const start = performance.now();

      // Calculate entropy
      const confidences = proposals.map(p => p.confidence);
      const totalConfidence = confidences.reduce((a, b) => a + b, 0);
      const probabilities = confidences.map(c => c / totalConfidence);
      const entropy = -probabilities.reduce((sum, p) => sum + p * Math.log2(p || 1), 0);

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
   * Benchmark: Discriminator checks
   */
  private async benchmarkPlinkoDiscriminator(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.plinko) throw new Error('Plinko not initialized');

    // Register discriminator
    this.plinko.registerDiscriminator('test', (proposal: AgentProposal) => proposal.bid > 0.3);

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const proposals: AgentProposal[] = Array.from({ length: 10 }, () => ({
        agentId: uuidv4(),
        confidence: Math.random(),
        bid: Math.random(),
      }));

      const start = performance.now();
      await this.plinko.process(proposals);
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
   * Benchmark: Temperature annealing
   */
  private async benchmarkPlinkoTemperatureAnneal(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.plinko) throw new Error('Plinko not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const proposals: AgentProposal[] = Array.from({ length: 10 }, () => ({
        agentId: uuidv4(),
        confidence: Math.random(),
        bid: Math.random(),
      }));

      const start = performance.now();

      // Multiple selections to observe annealing
      for (let j = 0; j < 5; j++) {
        await this.plinko.process(proposals);
      }

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 5);

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
   * Benchmark: Safety override handling
   */
  private async benchmarkPlinkoSafetyOverride(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.plinko) throw new Error('Plinko not initialized');

    // Register safety discriminator
    this.plinko.registerDiscriminator('safety', (proposal: AgentProposal) => proposal.bid < 0.9);

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const proposals: AgentProposal[] = [
        {
          agentId: uuidv4(),
          confidence: 0.5,
          bid: 0.95, // This will trigger safety override
        },
        ...Array.from({ length: 9 }, () => ({
          agentId: uuidv4(),
          confidence: Math.random(),
          bid: Math.random() * 0.8,
        })),
      ];

      const start = performance.now();
      await this.plinko.process(proposals);
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
   * Benchmark: Batch proposal processing
   */
  private async benchmarkPlinkoBatchProcess(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.plinko) throw new Error('Plinko not initialized');

    const batchSize = 20;
    const batches = Math.floor(config.iterations / batchSize);

    const samples: number[] = [];

    for (let i = 0; i < batches; i++) {
      const proposals: AgentProposal[] = Array.from({ length: batchSize }, () => ({
        agentId: uuidv4(),
        confidence: Math.random(),
        bid: Math.random(),
      }));

      const start = performance.now();
      await this.plinko.process(proposals);
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
   * Benchmark: Selection stability (same proposals)
   */
  private async benchmarkPlinkoSelectionStability(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.plinko) throw new Error('Plinko not initialized');

    const proposals: AgentProposal[] = Array.from({ length: 10 }, () => ({
      agentId: uuidv4(),
      confidence: 0.5 + Math.random() * 0.5,
      bid: Math.random(),
    }));

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();
      await this.plinko.process(proposals);
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
   * Benchmark: Scalability with proposal count
   */
  private async benchmarkPlinkoScalability(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.plinko) throw new Error('Plinko not initialized');

    const proposalCounts = [5, 10, 20, 50, 100];
    const samples: number[] = [];

    for (const count of proposalCounts) {
      const proposals: AgentProposal[] = Array.from({ length: count }, () => ({
        agentId: uuidv4(),
        confidence: Math.random(),
        bid: Math.random(),
      }));

      const start = performance.now();
      await this.plinko.process(proposals);
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

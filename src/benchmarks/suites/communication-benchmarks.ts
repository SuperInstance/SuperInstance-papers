/**
 * POLLN Communication Benchmarks
 *
 * Measure performance of A2A package creation, serialization,
 * transmission, and deserialization.
 */

import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import type { BenchmarkSuite, BenchmarkConfig, BenchmarkMetrics } from '../types.js';
import { A2APackage, PollenGrain } from '../../core/communication.js';
import { calculateStats, calculateThroughput } from '../benchmark-profiler.js';

/**
 * CommunicationBenchmarks - A2A package performance tests
 */
export class CommunicationBenchmarks implements BenchmarkSuite {
  name = 'communication';
  description = 'A2A package communication benchmarks';
  version = '1.0.0';

  async setup(): Promise<void> {
    // No setup needed
  }

  async teardown(): Promise<void> {
    // No teardown needed
  }

  benchmarks = new Map<string, (config: BenchmarkConfig) => Promise<BenchmarkMetrics>>([
    ['a2a-create', this.benchmarkA2ACreate.bind(this)],
    ['a2a-serialize', this.benchmarkA2ASerialize.bind(this)],
    ['a2a-deserialize', this.benchmarkA2ADeserialize.bind(this)],
    ['a2a-roundtrip', this.benchmarkA2ARoundtrip.bind(this)],
    ['pollen-grain-create', this.benchmarkPollenGrainCreate.bind(this)],
    ['pollen-grain-embed', this.benchmarkPollenGrainEmbed.bind(this)],
    ['a2a-large-payload', this.benchmarkA2ALargePayload.bind(this)],
    ['a2a-batch-create', this.benchmarkA2ABatchCreate.bind(this)],
    ['a2a-trace-validation', this.benchmarkA2ATraceValidation.bind(this)],
    ['a2a-compression', this.benchmarkA2ACompression.bind(this)],
  ]);

  /**
   * Benchmark: A2A package creation
   */
  private async benchmarkA2ACreate(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();

      const pkg: A2APackage = {
        packageId: uuidv4(),
        sourceAgentId: uuidv4(),
        targetAgentId: uuidv4(),
        payload: { message: `Test message ${i}` },
        timestamp: Date.now(),
        parentIds: [],
        causalChainId: uuidv4(),
        pollenGrain: this.createMockPollenGrain(),
      };

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
   * Benchmark: A2A package serialization
   */
  private async benchmarkA2ASerialize(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const packages = this.createMockPackages(config.iterations);

    const samples: number[] = [];

    for (const pkg of packages) {
      const start = performance.now();
      JSON.stringify(pkg);
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
   * Benchmark: A2A package deserialization
   */
  private async benchmarkA2ADeserialize(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const packages = this.createMockPackages(config.iterations);
    const serialized = packages.map(p => JSON.stringify(p));

    const samples: number[] = [];

    for (const str of serialized) {
      const start = performance.now();
      JSON.parse(str);
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
   * Benchmark: A2A package roundtrip (serialize + deserialize)
   */
  private async benchmarkA2ARoundtrip(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const packages = this.createMockPackages(config.iterations);

    const samples: number[] = [];

    for (const pkg of packages) {
      const start = performance.now();

      const serialized = JSON.stringify(pkg);
      const deserialized = JSON.parse(serialized);

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
   * Benchmark: Pollen grain creation
   */
  private async benchmarkPollenGrainCreate(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();

      const grain: PollenGrain = {
        id: uuidv4(),
        embedding: new Array(128).fill(0).map(() => Math.random()),
        pattern: {
          action: 'test-action',
          context: 'test-context',
          outcome: 'test-outcome',
        },
        metadata: {
          createdAt: Date.now(),
          sourceAgent: uuidv4(),
          weight: Math.random(),
        },
      };

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
   * Benchmark: Pollen grain embedding
   */
  private async benchmarkPollenGrainEmbed(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const samples: number[] = [];
    const dim = 128;

    for (let i = 0; i < config.iterations; i++) {
      const input = `Test input for embedding ${i}`;

      const start = performance.now();

      // Simulate embedding generation
      const embedding = new Array(dim).fill(0).map(() => Math.random());

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
   * Benchmark: A2A package with large payload
   */
  private async benchmarkA2ALargePayload(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();

      const pkg: A2APackage = {
        packageId: uuidv4(),
        sourceAgentId: uuidv4(),
        targetAgentId: uuidv4(),
        payload: {
          data: 'x'.repeat(10000), // 10KB payload
          items: Array.from({ length: 100 }, (_, j) => ({ id: j, value: `item-${j}` })),
        },
        timestamp: Date.now(),
        parentIds: [],
        causalChainId: uuidv4(),
        pollenGrain: this.createMockPollenGrain(),
      };

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
   * Benchmark: Batch A2A package creation
   */
  private async benchmarkA2ABatchCreate(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const batchSize = 50;
    const batches = Math.floor(config.iterations / batchSize);

    const samples: number[] = [];

    for (let i = 0; i < batches; i++) {
      const start = performance.now();

      for (let j = 0; j < batchSize; j++) {
        const pkg: A2APackage = {
          packageId: uuidv4(),
          sourceAgentId: uuidv4(),
          targetAgentId: uuidv4(),
          payload: { message: `Batch ${i} message ${j}` },
          timestamp: Date.now(),
          parentIds: [],
          causalChainId: uuidv4(),
          pollenGrain: this.createMockPollenGrain(),
        };
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
   * Benchmark: A2A package trace validation
   */
  private async benchmarkA2ATraceValidation(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const pkg: A2APackage = {
        packageId: uuidv4(),
        sourceAgentId: uuidv4(),
        targetAgentId: uuidv4(),
        payload: { message: `Test ${i}` },
        timestamp: Date.now(),
        parentIds: Array.from({ length: 10 }, () => uuidv4()),
        causalChainId: uuidv4(),
        pollenGrain: this.createMockPollenGrain(),
      };

      const start = performance.now();

      // Simulate trace validation
      const hasValidTrace = pkg.parentIds.length > 0 && pkg.causalChainId;
      const traceDepth = pkg.parentIds.length;

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
   * Benchmark: A2A package compression
   */
  private async benchmarkA2ACompression(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const packages = this.createMockPackages(config.iterations);

    const samples: number[] = [];

    for (const pkg of packages) {
      const start = performance.now();

      const serialized = JSON.stringify(pkg);
      const originalSize = serialized.length;

      // Simulate compression by checking if JSON stringification reduces size
      // (in real implementation, would use actual compression)
      const compressed = serialized;
      const compressedSize = compressed.length;

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
   * Helper: Create mock pollen grain
   */
  private createMockPollenGrain(): PollenGrain {
    return {
      id: uuidv4(),
      embedding: new Array(128).fill(0).map(() => Math.random()),
      pattern: {
        action: 'test-action',
        context: 'test-context',
        outcome: 'test-outcome',
      },
      metadata: {
        createdAt: Date.now(),
        sourceAgent: uuidv4(),
        weight: Math.random(),
      },
    };
  }

  /**
   * Helper: Create mock A2A packages
   */
  private createMockPackages(count: number): A2APackage[] {
    const packages: A2APackage[] = [];

    for (let i = 0; i < count; i++) {
      packages.push({
        packageId: uuidv4(),
        sourceAgentId: uuidv4(),
        targetAgentId: uuidv4(),
        payload: { message: `Test message ${i}` },
        timestamp: Date.now(),
        parentIds: [],
        causalChainId: uuidv4(),
        pollenGrain: this.createMockPollenGrain(),
      });
    }

    return packages;
  }
}

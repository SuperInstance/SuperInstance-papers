/**
 * POLLN Benchmark Runner
 *
 * Core infrastructure for executing benchmarks with statistical analysis,
 * warmup phases, and memory profiling.
 */

import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import type {
  BenchmarkConfig,
  BenchmarkResult,
  BenchmarkMetrics,
  BenchmarkSuite,
  BenchmarkContext,
  ProfilingData
} from './types.js';
import { BenchmarkProfiler } from './benchmark-profiler.js';

export interface RunOptions {
  suites?: string[];
  benchmarks?: string[];
  filter?: string;
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;

  results: BenchmarkResult[];
  totalTime: number;
}

/**
 * BenchmarkRunner - Main orchestrator for benchmark execution
 */
export class BenchmarkRunner {
  private config: Partial<BenchmarkConfig>;
  private suites: Map<string, BenchmarkSuite> = new Map();
  private profiler: BenchmarkProfiler;
  private results: Map<string, BenchmarkResult> = new Map();

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = {
      iterations: 100,
      warmupIterations: 10,
      timeout: 300000,
      seed: Date.now(),
      sampleSize: 1000,
      concurrency: 1,
      enableMemoryProfiling: true,
      enableCpuProfiling: false,
      gcBetweenRuns: true,
      verbose: false,
      outputFormat: 'json',
      ...config,
    };

    this.profiler = new BenchmarkProfiler();
  }

  /**
   * Register a benchmark suite
   */
  registerSuite(suite: BenchmarkSuite): void {
    this.suites.set(suite.name, suite);
  }

  /**
   * Run all registered benchmarks
   */
  async run(options: RunOptions = {}): Promise<RunSummary> {
    const startTime = performance.now();
    const results: BenchmarkResult[] = [];

    // Filter suites if specified
    let suitesToRun = Array.from(this.suites.values());
    if (options.suites && options.suites.length > 0) {
      suitesToRun = suitesToRun.filter(s => options.suites!.includes(s.name));
    }

    // Filter benchmarks if specified
    const benchmarkFilter = options.filter || options.benchmarks?.join('|');

    for (const suite of suitesToRun) {
      if (this.config.verbose) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Running Suite: ${suite.name}`);
        console.log(`${'='.repeat(60)}`);
      }

      try {
        await suite.setup();

        for (const [name, benchmarkFn] of suite.benchmarks) {
          // Apply filter
          if (benchmarkFilter && !name.match(benchmarkFilter)) {
            continue;
          }

          if (this.config.verbose) {
            console.log(`\nRunning: ${name}`);
          }

          try {
            const result = await this.runBenchmark(name, suite.name, benchmarkFn);
            results.push(result);
            this.results.set(`${suite.name}:${name}`, result);
          } catch (error) {
            const failedResult: BenchmarkResult = {
              name,
              suite: suite.name,
              category: suite.name,
              timestamp: Date.now(),
              config: this.getConfig(),
              metrics: this.getEmptyMetrics(),
              samples: [],
              memorySamples: [],
              passed: false,
              error: error instanceof Error ? error.message : String(error),
              metadata: {},
            };
            results.push(failedResult);

            if (this.config.verbose) {
              console.error(`  ERROR: ${error}`);
            }
          }
        }

        await suite.teardown();
      } catch (error) {
        console.error(`Suite ${suite.name} setup/teardown failed:`, error);
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const summary: RunSummary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      skipped: 0,
      results,
      totalTime,
    };

    return summary;
  }

  /**
   * Run a single benchmark
   */
  private async runBenchmark(
    name: string,
    suiteName: string,
    benchmarkFn: (config: BenchmarkConfig) => Promise<BenchmarkMetrics>
  ): Promise<BenchmarkResult> {
    const config = this.getConfig();
    const timestamp = Date.now();

    // Start profiling
    const profilingData = config.enableMemoryProfiling
      ? this.profiler.start()
      : undefined;

    // Warmup phase
    if (config.warmupIterations > 0) {
      await this.runPhase(benchmarkFn, config, 'warmup');
    }

    // Force GC if enabled
    if (config.gcBetweenRuns && global.gc) {
      global.gc();
    }

    // Measurement phase
    const samples: number[] = [];
    const memorySamples: number[] = [];

    const metrics = await this.runPhase(benchmarkFn, config, 'measure', samples, memorySamples);

    // Stop profiling
    if (profilingData) {
      this.profiler.stop(profilingData);
    }

    return {
      name,
      suite: suiteName,
      category: suiteName,
      timestamp,
      config,
      metrics,
      samples,
      memorySamples,
      passed: true,
      metadata: {},
    };
  }

  /**
   * Run a benchmark phase (warmup or measure)
   */
  private async runPhase(
    benchmarkFn: (config: BenchmarkConfig) => Promise<BenchmarkMetrics>,
    config: BenchmarkConfig,
    phase: 'warmup' | 'measure',
    samples?: number[],
    memorySamples?: number[]
  ): Promise<BenchmarkMetrics> {
    const iterations = phase === 'warmup' ? config.warmupIterations : config.iterations;
    const isWarmup = phase === 'warmup';

    let totalMetrics: BenchmarkMetrics | undefined;

    for (let i = 0; i < iterations; i++) {
      const startMemory = config.enableMemoryProfiling
        ? process.memoryUsage().heapUsed
        : 0;

      const startTime = performance.now();

      // Run the benchmark
      const metrics = await benchmarkFn(config);

      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!isWarmup && samples && memorySamples) {
        samples.push(duration);

        if (config.enableMemoryProfiling) {
          const endMemory = process.memoryUsage().heapUsed;
          memorySamples.push(endMemory - startMemory);
        }
      }

      // Accumulate metrics
      if (!totalMetrics) {
        totalMetrics = metrics;
      } else {
        // Aggregate metrics
        if (metrics.customMetrics) {
          for (const [key, value] of metrics.customMetrics) {
            if (!totalMetrics.customMetrics) {
              totalMetrics.customMetrics = new Map();
            }
            const existing = totalMetrics.customMetrics.get(key) || 0;
            totalMetrics.customMetrics.set(key, existing + value);
          }
        }
      }

      // Check timeout
      if (endTime - startTime > config.timeout) {
        throw new Error(`Benchmark timeout after ${config.timeout}ms`);
      }

      // Force GC between runs if enabled
      if (config.gcBetweenRuns && global.gc && i < iterations - 1) {
        global.gc();
      }
    }

    // Average custom metrics
    if (totalMetrics?.customMetrics) {
      for (const [key, value] of totalMetrics.customMetrics) {
        totalMetrics.customMetrics.set(key, value / iterations);
      }
    }

    return totalMetrics || this.getEmptyMetrics();
  }

  /**
   * Get merged configuration
   */
  private getConfig(): BenchmarkConfig {
    return {
      iterations: 100,
      warmupIterations: 10,
      timeout: 300000,
      seed: Date.now(),
      sampleSize: 1000,
      concurrency: 1,
      enableMemoryProfiling: true,
      enableCpuProfiling: false,
      gcBetweenRuns: true,
      verbose: false,
      outputFormat: 'json',
      ...this.config,
    };
  }

  /**
   * Get empty metrics
   */
  private getEmptyMetrics(): BenchmarkMetrics {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      opsPerSecond: 0,
      totalOps: 0,
      totalTime: 0,
    };
  }

  /**
   * Get all results
   */
  getResults(): Map<string, BenchmarkResult> {
    return new Map(this.results);
  }

  /**
   * Get result by name
   */
  getResult(name: string): BenchmarkResult | undefined {
    return this.results.get(name);
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results.clear();
  }
}

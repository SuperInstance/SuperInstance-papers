/**
 * BenchmarkRunner - Performance benchmarking and load testing utilities
 *
 * Provides:
 * - Performance benchmarking
 * - Load testing
 * - Stress testing
 * - Memory profiling
 * - Comparison tracking
 *
 * @module testing
 */

import type { LogCell } from '../LogCell';
import type { PollnColony } from '../../core/Colony';

/**
 * Benchmark result
 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  percentile95: number;
  percentile99: number;
  opsPerSecond: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  timestamp: number;
  metadata: Record<string, any>;
}

/**
 * Load test result
 */
export interface LoadTestResult {
  name: string;
  duration: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number;
  errorRate: number;
  concurrentUsers: number;
  timestamp: number;
}

/**
 * Stress test result
 */
export interface StressTestResult {
  name: string;
  maxLoad: number;
  breakingPoint: number;
  maxThroughput: number;
  errorsAtMaxLoad: number;
  recoveryTime: number;
  timestamp: number;
}

/**
 * Memory profile result
 */
export interface MemoryProfileResult {
  name: string;
  heapBefore: number;
  heapAfter: number;
  heapDelta: number;
  externalBefore: number;
  externalAfter: number;
  externalDelta: number;
  arrayBuffersBefore: number;
  arrayBuffersAfter: number;
  arrayBuffersDelta: number;
  timestamp: number;
}

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
  /** Number of iterations */
  iterations?: number;
  /** Warmup iterations */
  warmupIterations?: number;
  /** Minimum duration in ms */
  minDuration?: number;
  /** Collect memory stats */
  collectMemory?: boolean;
  /** Collect percentiles */
  collectPercentiles?: boolean;
  /** Metadata to attach */
  metadata?: Record<string, any>;
}

/**
 * Load test configuration
 */
export interface LoadTestConfig {
  /** Test duration in ms */
  duration?: number;
  /** Number of concurrent users */
  concurrentUsers?: number;
  /** Ramp-up time in ms */
  rampUpTime?: number;
  /** Operations per second per user */
  opsPerSecond?: number;
  /** Think time between operations in ms */
  thinkTime?: number;
}

/**
 * Comparison tracking entry
 */
export interface ComparisonEntry {
  name: string;
  baseline: BenchmarkResult;
  current: BenchmarkResult;
  improvement: number;
  significant: boolean;
  timestamp: number;
}

/**
 * Comprehensive benchmarking and load testing
 */
export class BenchmarkRunner {
  private static baselineResults = new Map<string, BenchmarkResult>();
  private static comparisonHistory: ComparisonEntry[] = [];

  // ==================== Benchmarking ====================

  /**
   * Run a performance benchmark
   *
   * @param name - Benchmark name
   * @param operation - Operation to benchmark
   * @param config - Benchmark configuration
   * @returns Benchmark result
   *
   * @example
   * ```typescript
   * const result = await BenchmarkRunner.benchmark('cell-process', async () => {
   *   await cell.process(input);
   * }, { iterations: 1000 });
   * ```
   */
  static async benchmark<T>(
    name: string,
    operation: () => Promise<T> | T,
    config: BenchmarkConfig = {}
  ): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmupIterations = 10,
      minDuration = 0,
      collectMemory = true,
      collectPercentiles = true,
      metadata = {}
    } = config;

    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      await operation();
    }

    // Memory snapshot
    const memoryBefore = collectMemory ? process.memoryUsage() : null;

    // Benchmark iterations
    const times: number[] = [];
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      const iterStart = Date.now();
      await operation();
      times.push(Date.now() - iterStart);

      // Ensure minimum duration
      if (minDuration > 0 && Date.now() - startTime < minDuration) {
        continue;
      }
    }

    const memoryAfter = collectMemory ? process.memoryUsage() : null;

    // Calculate statistics
    times.sort((a, b) => a - b);
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const percentile95 = times[Math.floor(times.length * 0.95)];
    const percentile99 = times[Math.floor(times.length * 0.99)];
    const opsPerSecond = 1000 / averageTime;

    const result: BenchmarkResult = {
      name,
      iterations: times.length,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      percentile95: collectPercentiles ? percentile95 : 0,
      percentile99: collectPercentiles ? percentile99 : 0,
      opsPerSecond,
      memoryBefore: memoryBefore?.heapUsed || 0,
      memoryAfter: memoryAfter?.heapUsed || 0,
      memoryDelta: (memoryAfter?.heapUsed || 0) - (memoryBefore?.heapUsed || 0),
      timestamp: Date.now(),
      metadata
    };

    return result;
  }

  /**
   * Benchmark multiple operations and compare
   *
   * @param name - Benchmark suite name
   * @param operations - Operations to benchmark
   * @param config - Benchmark configuration
   * @returns Array of benchmark results
   */
  static async benchmarkSuite<T>(
    name: string,
    operations: Map<string, () => Promise<T> | T>,
    config: BenchmarkConfig = {}
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const [opName, operation] of operations.entries()) {
      const result = await this.benchmark(`${name} - ${opName}`, operation, config);
      results.push(result);
    }

    return results;
  }

  /**
   * Benchmark cell processing
   *
   * @param cell - Cell to benchmark
   * @param inputs - Input values to process
   * @param config - Benchmark configuration
   * @returns Benchmark result
   */
  static async benchmarkCell(
    cell: LogCell,
    inputs: any[],
    config: BenchmarkConfig = {}
  ): Promise<BenchmarkResult> {
    return this.benchmark(
      `cell-${cell.id}`,
      async () => {
        for (const input of inputs) {
          await cell.process(input);
        }
      },
      config
    );
  }

  /**
   * Benchmark colony tick
   *
   * @param colony - Colony to benchmark
   * @param config - Benchmark configuration
   * @returns Benchmark result
   */
  static async benchmarkColony(
    colony: PollnColony,
    config: BenchmarkConfig = {}
  ): Promise<BenchmarkResult> {
    return this.benchmark(
      `colony-${colony.id}`,
      async () => {
        await colony.tick();
      },
      config
    );
  }

  // ==================== Load Testing ====================

  /**
   * Run a load test
   *
   * @param name - Test name
   * @param operation - Operation to load test
   * @param config - Load test configuration
   * @returns Load test result
   *
   * @example
   * ```typescript
   * const result = await BenchmarkRunner.loadTest('api-load', async () => {
   *   await api.request('GET', '/cells');
   * }, { duration: 10000, concurrentUsers: 50 });
   * ```
   */
  static async loadTest(
    name: string,
    operation: () => Promise<void>,
    config: LoadTestConfig = {}
  ): Promise<LoadTestResult> {
    const {
      duration = 10000,
      concurrentUsers = 10,
      rampUpTime = 1000,
      opsPerSecond = 10,
      thinkTime = 0
    } = config;

    const startTime = Date.now();
    const endTime = startTime + duration;
    const responseTimes: number[] = [];
    let totalOperations = 0;
    let failedOperations = 0;

    // Simulate concurrent users
    const users = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      const userStartTime = startTime + (rampUpTime / concurrentUsers) * userIndex;
      const userDelay = Math.max(0, userStartTime - Date.now());

      await new Promise(resolve => setTimeout(resolve, userDelay));

      while (Date.now() < endTime) {
        const opStart = Date.now();

        try {
          await operation();
          responseTimes.push(Date.now() - opStart);
        } catch {
          failedOperations++;
          responseTimes.push(Date.now() - opStart);
        }

        totalOperations++;

        // Think time
        if (thinkTime > 0) {
          await new Promise(resolve => setTimeout(resolve, thinkTime));
        }

        // Ops per second limit
        const opDelay = 1000 / opsPerSecond;
        await new Promise(resolve => setTimeout(resolve, opDelay));
      }
    });

    await Promise.all(users);

    responseTimes.sort((a, b) => a - b);
    const actualDuration = Date.now() - startTime;
    const successfulOperations = totalOperations - failedOperations;

    const result: LoadTestResult = {
      name,
      duration: actualDuration,
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime: responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length,
      minResponseTime: responseTimes[0],
      maxResponseTime: responseTimes[responseTimes.length - 1],
      throughput: (totalOperations / actualDuration) * 1000,
      errorRate: failedOperations / totalOperations,
      concurrentUsers,
      timestamp: Date.now()
    };

    return result;
  }

  // ==================== Stress Testing ====================

  /**
   * Run a stress test to find breaking point
   *
   * @param name - Test name
   * @param operation - Operation to stress test
   * @param config - Test configuration
   * @returns Stress test result
   */
  static async stressTest(
    name: string,
    operation: () => Promise<void>,
    config: {
      initialLoad?: number;
      loadIncrement?: number;
      maxLoad?: number;
      durationPerLevel?: number;
      errorThreshold?: number;
    } = {}
  ): Promise<StressTestResult> {
    const {
      initialLoad = 10,
      loadIncrement = 10,
      maxLoad = 1000,
      durationPerLevel = 5000,
      errorThreshold = 0.05
    } = config;

    let currentLoad = initialLoad;
    let breakingPoint = maxLoad;
    let maxThroughput = 0;
    let errorsAtMaxLoad = 0;
    let recoveryTime = 0;

    while (currentLoad <= maxLoad) {
      const startTime = Date.now();
      let operations = 0;
      let errors = 0;

      const workers = Array.from({ length: currentLoad }, async () => {
        while (Date.now() - startTime < durationPerLevel) {
          try {
            await operation();
            operations++;
          } catch {
            errors++;
          }
        }
      });

      await Promise.all(workers);

      const actualDuration = Date.now() - startTime;
      const throughput = (operations / actualDuration) * 1000;
      const errorRate = errors / operations;

      if (throughput > maxThroughput) {
        maxThroughput = throughput;
        errorsAtMaxLoad = errors;
      }

      if (errorRate > errorThreshold) {
        breakingPoint = currentLoad;
        break;
      }

      currentLoad += loadIncrement;
    }

    // Test recovery
    const recoveryStart = Date.now();
    try {
      await operation();
      recoveryTime = Date.now() - recoveryStart;
    } catch {
      recoveryTime = -1; // Failed to recover
    }

    return {
      name,
      maxLoad: currentLoad,
      breakingPoint,
      maxThroughput,
      errorsAtMaxLoad,
      recoveryTime,
      timestamp: Date.now()
    };
  }

  // ==================== Memory Profiling ====================

  /**
   * Profile memory usage of an operation
   *
   * @param name - Profile name
   * @param operation - Operation to profile
   * @param iterations - Number of iterations
   * @returns Memory profile result
   */
  static async profileMemory(
    name: string,
    operation: () => Promise<void> | void,
    iterations: number = 100
  ): Promise<MemoryProfileResult> {
    // Force GC if available
    if (global.gc) {
      global.gc();
    }

    const before = process.memoryUsage();

    for (let i = 0; i < iterations; i++) {
      await operation();
    }

    // Force GC again
    if (global.gc) {
      global.gc();
    }

    const after = process.memoryUsage();

    return {
      name,
      heapBefore: before.heapUsed,
      heapAfter: after.heapUsed,
      heapDelta: after.heapUsed - before.heapUsed,
      externalBefore: before.external,
      externalAfter: after.external,
      externalDelta: after.external - before.external,
      arrayBuffersBefore: before.arrayBuffers,
      arrayBuffersAfter: after.arrayBuffers,
      arrayBuffersDelta: after.arrayBuffers - before.arrayBuffers,
      timestamp: Date.now()
    };
  }

  /**
   * Detect memory leaks
   *
   * @param name - Test name
   * @param operation - Operation to test
   * @param iterations - Number of iterations
   * @returns True if memory leak detected
   */
  static async detectMemoryLeak(
    name: string,
    operation: () => Promise<void> | void,
    iterations: number = 100
  ): Promise<boolean> {
    const profiles: MemoryProfileResult[] = [];
    const samples = 5;

    for (let i = 0; i < samples; i++) {
      const profile = await this.profileMemory(`${name}-${i}`, operation, iterations);
      profiles.push(profile);
    }

    // Check for consistent growth
    let growthCount = 0;
    for (let i = 1; i < profiles.length; i++) {
      if (profiles[i].heapDelta > profiles[i - 1].heapDelta * 1.1) {
        growthCount++;
      }
    }

    return growthCount >= samples / 2;
  }

  // ==================== Comparison Tracking ====================

  /**
   * Set a baseline result
   *
   * @param name - Benchmark name
   * @param result - Baseline result
   */
  static setBaseline(name: string, result: BenchmarkResult): void {
    this.baselineResults.set(name, result);
  }

  /**
   * Compare current result to baseline
   *
   * @param name - Benchmark name
   * @param current - Current result
   * @returns Comparison entry
   */
  static compareWithBaseline(name: string, current: BenchmarkResult): ComparisonEntry | null {
    const baseline = this.baselineResults.get(name);
    if (!baseline) return null;

    const improvement = ((baseline.averageTime - current.averageTime) / baseline.averageTime) * 100;
    const significant = Math.abs(improvement) > 5; // 5% threshold

    const entry: ComparisonEntry = {
      name,
      baseline,
      current,
      improvement,
      significant,
      timestamp: Date.now()
    };

    this.comparisonHistory.push(entry);
    return entry;
  }

  /**
   * Get comparison history
   *
   * @returns Comparison history
   */
  static getComparisonHistory(): ComparisonEntry[] {
    return [...this.comparisonHistory];
  }

  /**
   * Generate benchmark report
   *
   * @param results - Benchmark results
   * @returns Formatted report
   */
  static generateReport(results: BenchmarkResult[]): string {
    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push('BENCHMARK REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    results.forEach(result => {
      lines.push(`Name: ${result.name}`);
      lines.push(`Iterations: ${result.iterations}`);
      lines.push(`Average Time: ${result.averageTime.toFixed(4)}ms`);
      lines.push(`Min Time: ${result.minTime.toFixed(4)}ms`);
      lines.push(`Max Time: ${result.maxTime.toFixed(4)}ms`);
      lines.push(`95th Percentile: ${result.percentile95.toFixed(4)}ms`);
      lines.push(`99th Percentile: ${result.percentile99.toFixed(4)}ms`);
      lines.push(`Ops/Second: ${result.opsPerSecond.toFixed(2)}`);
      lines.push(`Memory Delta: ${(result.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
      lines.push('');
    });

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Generate comparison report
   *
   * @returns Comparison report
   */
  static generateComparisonReport(): string {
    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push('COMPARISON REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    this.comparisonHistory.forEach(entry => {
      lines.push(`Name: ${entry.name}`);
      lines.push(`Baseline: ${entry.baseline.averageTime.toFixed(4)}ms`);
      lines.push(`Current: ${entry.current.averageTime.toFixed(4)}ms`);
      lines.push(`Improvement: ${entry.improvement > 0 ? '+' : ''}${entry.improvement.toFixed(2)}%`);
      lines.push(`Significant: ${entry.significant ? 'Yes' : 'No'}`);
      lines.push('');
    });

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Export results to JSON
   *
   * @param results - Results to export
   * @param filepath - File path to save to
   */
  static async exportResults(
    results: Array<BenchmarkResult | LoadTestResult | StressTestResult>,
    filepath: string
  ): Promise<void> {
    const { writeFile } = await import('fs/promises');
    await writeFile(filepath, JSON.stringify(results, null, 2));
  }

  /**
   * Clear all stored data
   */
  static clear(): void {
    this.baselineResults.clear();
    this.comparisonHistory = [];
  }
}

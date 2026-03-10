/**
 * PerformanceBenchmark - Performance testing and benchmarking utilities
 *
 * Provides comprehensive benchmarking capabilities including execution time,
 * memory usage, operations per second, and percentile measurements.
 */

import type {
  BenchmarkResult,
  MemoryResult,
  LoadTestResult,
  StressTestResult,
} from './types.js';

/**
 * Performance benchmarking utilities
 */
export class PerformanceBenchmark {
  private static baselines: Map<string, BenchmarkResult> = new Map();

  /**
   * Benchmark a cell creation operation
   *
   * @param count - Number of cells to create
   * @param factory - Factory function to create cells
   * @returns Benchmark result
   *
   * @example
   * ```typescript
   * const result = await PerformanceBenchmark.benchmarkCellCreation(1000, () => {
   *   return CellFactory.createInputCell();
   * });
   * console.log(`Created ${count} cells in ${result.totalTime}ms`);
   * ```
   */
  static async benchmarkCellCreation<T>(
    count: number,
    factory: () => T
  ): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    // Create cells
    const cells: T[] = [];
    for (let i = 0; i < count; i++) {
      cells.push(factory());
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();

    const totalTime = endTime - startTime;
    const averageTime = totalTime / count;
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    return {
      name: `cell-creation-${count}`,
      iterations: count,
      totalTime,
      averageTime,
      minTime: averageTime,
      maxTime: averageTime,
      opsPerSecond: (count / totalTime) * 1000,
      memory: {
        heapUsed: endMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external,
        arrayBuffers: endMemory.arrayBuffers,
        delta: memoryDelta,
      },
    };
  }

  /**
   * Benchmark sensation propagation through cells
   *
   * @param cellCount - Number of cells in the propagation chain
   * @param propagate - Function to trigger propagation
   * @returns Benchmark result
   *
   * @example
   * ```typescript
   * const result = await PerformanceBenchmark.benchmarkSensationPropagation(100, async () => {
   *   await propagateSensation(cells);
   * });
   * ```
   */
  static async benchmarkSensationPropagation(
    cellCount: number,
    propagate: () => Promise<void>
  ): Promise<BenchmarkResult> {
    const warmupIterations = 10;
    const measurementIterations = 100;

    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      await propagate();
    }

    // Measurement
    const times: number[] = [];
    const startMemory = this.getMemoryUsage();

    for (let i = 0; i < measurementIterations; i++) {
      const start = performance.now();
      await propagate();
      const end = performance.now();
      times.push(end - start);
    }

    const endMemory = this.getMemoryUsage();

    const totalTime = times.reduce((a, b) => a + b, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const sortedTimes = times.sort((a, b) => a - b);

    return {
      name: `sensation-propagation-${cellCount}`,
      iterations: measurementIterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      opsPerSecond: (measurementIterations / totalTime) * 1000,
      memory: {
        heapUsed: endMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external,
        arrayBuffers: endMemory.arrayBuffers,
        delta: endMemory.heapUsed - startMemory.heapUsed,
      },
      percentiles: {
        p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)],
        p75: sortedTimes[Math.floor(sortedTimes.length * 0.75)],
        p90: sortedTimes[Math.floor(sortedTimes.length * 0.9)],
        p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
        p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      },
    };
  }

  /**
   * Benchmark formula evaluation
   *
   * @param formulas - Number of formulas to evaluate
   * @param evaluate - Function to evaluate formulas
   * @returns Benchmark result
   *
   * @example
   * ```typescript
   * const result = await PerformanceBenchmark.benchmarkFormulaEvaluation(1000, async () => {
   *   await evaluateFormulas(formulas);
   * });
   * ```
   */
  static async benchmarkFormulaEvaluation(
    formulas: number,
    evaluate: () => Promise<void>
  ): Promise<BenchmarkResult> {
    const iterations = 100;
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < 10; i++) {
      await evaluate();
    }

    // Measurement
    const startMemory = this.getMemoryUsage();
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await evaluate();
      const end = performance.now();
      times.push(end - start);
    }
    const endMemory = this.getMemoryUsage();

    const totalTime = times.reduce((a, b) => a + b, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const sortedTimes = times.sort((a, b) => a - b);

    return {
      name: `formula-evaluation-${formulas}`,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      opsPerSecond: (iterations * formulas) / (totalTime / 1000),
      memory: {
        heapUsed: endMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external,
        arrayBuffers: endMemory.arrayBuffers,
        delta: endMemory.heapUsed - startMemory.heapUsed,
      },
      percentiles: {
        p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)],
        p75: sortedTimes[Math.floor(sortedTimes.length * 0.75)],
        p90: sortedTimes[Math.floor(sortedTimes.length * 0.9)],
        p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
        p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      },
    };
  }

  /**
   * Benchmark memory usage for an operation
   *
   * @param operation - Function to benchmark
   * @param iterations - Number of iterations
   * @returns Memory usage result
   *
   * @example
   * ```typescript
   * const result = PerformanceBenchmark.benchmarkMemoryUsage(() => {
   *   const cells = createLargeCellGrid(1000, 1000);
   * }, 10);
   * console.log(`Memory delta: ${result.delta} bytes`);
   * ```
   */
  static benchmarkMemoryUsage(
    operation: () => void,
    iterations: number = 100
  ): MemoryResult {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const startMemory = this.getMemoryUsage();

    for (let i = 0; i < iterations; i++) {
      operation();
    }

    const endMemory = this.getMemoryUsage();

    return {
      heapUsed: endMemory.heapUsed,
      heapTotal: endMemory.heapTotal,
      external: endMemory.external,
      arrayBuffers: endMemory.arrayBuffers,
      delta: endMemory.heapUsed - startMemory.heapUsed,
    };
  }

  /**
   * Run a generic benchmark
   *
   * @param name - Benchmark name
   * @param operation - Operation to benchmark
   * @param options - Benchmark options
   * @returns Benchmark result
   *
   * @example
   * ```typescript
   * const result = await PerformanceBenchmark.benchmark('my-operation', async () => {
   *   await myOperation();
   * }, {
   *   iterations: 1000,
   *   warmupIterations: 100,
   *   collectMemory: true,
   *   collectPercentiles: true
   * });
   * ```
   */
  static async benchmark(
    name: string,
    operation: () => Promise<void> | void,
    options: {
      iterations?: number;
      warmupIterations?: number;
      collectMemory?: boolean;
      collectPercentiles?: boolean;
    } = {}
  ): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmupIterations = 10,
      collectMemory = true,
      collectPercentiles = true,
    } = options;

    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      await operation();
    }

    // Force GC if available and collecting memory
    if (collectMemory && global.gc) {
      global.gc();
    }

    const times: number[] = [];
    const startMemory = collectMemory ? this.getMemoryUsage() : null;

    // Measurement
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      times.push(end - start);
    }

    const endMemory = collectMemory ? this.getMemoryUsage() : null;
    const totalTime = times.reduce((a, b) => a + b, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      opsPerSecond: (iterations / totalTime) * 1000,
    };

    if (collectMemory && startMemory && endMemory) {
      result.memory = {
        heapUsed: endMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external,
        arrayBuffers: endMemory.arrayBuffers,
        delta: endMemory.heapUsed - startMemory.heapUsed,
      };
    }

    if (collectPercentiles) {
      const sortedTimes = times.sort((a, b) => a - b);
      result.percentiles = {
        p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)],
        p75: sortedTimes[Math.floor(sortedTimes.length * 0.75)],
        p90: sortedTimes[Math.floor(sortedTimes.length * 0.9)],
        p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
        p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      };
    }

    return result;
  }

  /**
   * Run a load test
   *
   * @param name - Load test name
   * @param operation - Operation to test
   * @param options - Load test options
   * @returns Load test result
   *
   * @example
   * ```typescript
   * const result = await PerformanceBenchmark.loadTest('api-load', async () => {
   *   await apiCall();
   * }, {
   *   duration: 60000, // 1 minute
   *   concurrentUsers: 50
   * });
   * ```
   */
  static async loadTest(
    name: string,
    operation: () => Promise<void>,
    options: {
      duration?: number;
      concurrentUsers?: number;
      opsPerSecond?: number;
    } = {}
  ): Promise<LoadTestResult> {
    const {
      duration = 10000,
      concurrentUsers = 10,
      opsPerSecond: targetOpsPerSecond,
    } = options;

    const startTime = Date.now();
    const endTime = startTime + duration;
    const latencies: number[] = [];
    const errors: Map<string, number> = new Map();
    let totalOperations = 0;
    let successfulOperations = 0;
    let failedOperations = 0;

    // Create concurrent workers
    const workers: Promise<void>[] = [];
    const operationsPerWorker = Math.ceil((targetOpsPerSecond || 100) * (duration / 1000) / concurrentUsers);

    for (let i = 0; i < concurrentUsers; i++) {
      const worker = (async () => {
        while (Date.now() < endTime) {
          try {
            const start = performance.now();
            await operation();
            const end = performance.now();

            latencies.push(end - start);
            successfulOperations++;
          } catch (error) {
            failedOperations++;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1);
          }

          totalOperations++;

          // Rate limiting if opsPerSecond is specified
          if (targetOpsPerSecond) {
            const delay = 1000 / (targetOpsPerSecond / concurrentUsers);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      })();

      workers.push(worker);
    }

    await Promise.all(workers);

    // Calculate statistics
    const sortedLatencies = latencies.sort((a, b) => a - b);
    const actualDuration = Date.now() - startTime;

    return {
      name,
      duration: actualDuration,
      totalOperations,
      successfulOperations,
      failedOperations,
      opsPerSecond: (totalOperations / actualDuration) * 1000,
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)],
      p95Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
      p99Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)],
      errors: Array.from(errors.entries()).map(([error, count]) => ({
        error,
        count,
        timestamp: Date.now(),
      })),
    };
  }

  /**
   * Run a stress test
   *
   * @param name - Stress test name
   * @param operation - Operation to test
   * @param options - Stress test options
   * @returns Stress test result
   *
   * @example
   * ```typescript
   * const result = await PerformanceBenchmark.stressTest('system-stress', async () => {
   *   await systemOperation();
   * }, {
   *   initialLoad: 10,
   *   loadIncrement: 10,
   *   maxLoad: 200
   * });
   * ```
   */
  static async stressTest(
    name: string,
    operation: () => Promise<void>,
    options: {
      initialLoad?: number;
      loadIncrement?: number;
      maxLoad?: number;
      iterationsPerLoad?: number;
    } = {}
  ): Promise<StressTestResult> {
    const {
      initialLoad = 10,
      loadIncrement = 10,
      maxLoad = 200,
      iterationsPerLoad = 100,
    } = options;

    const results: StressTestResult['results'] = [];
    let breakingPoint = maxLoad;
    let foundBreakingPoint = false;

    for (let load = initialLoad; load <= maxLoad; load += loadIncrement) {
      const times: number[] = [];
      let errors = 0;

      // Run operations at current load level
      for (let i = 0; i < iterationsPerLoad; i++) {
        try {
          const start = performance.now();
          await Promise.all(Array.from({ length: load }, () => operation()));
          const end = performance.now();
          times.push(end - start);
        } catch {
          errors++;
        }
      }

      const averageTime = times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : 0;

      const errorRate = errors / iterationsPerLoad;
      const passed = errorRate < 0.05 && times.every((t) => t < 1000);

      results.push({
        load,
        passed,
        averageTime,
        errorRate,
      });

      // Check if we found the breaking point
      if (!passed && !foundBreakingPoint) {
        breakingPoint = load;
        foundBreakingPoint = true;
      }
    }

    return {
      name,
      maxLoad,
      breakingPoint,
      results,
    };
  }

  /**
   * Set a baseline for comparison
   *
   * @param name - Benchmark name
   * @param result - Benchmark result to use as baseline
   *
   * @example
   * ```typescript
   * const baseline = await PerformanceBenchmark.benchmark('operation', async () => {
   *   await operation();
   * });
   * PerformanceBenchmark.setBaseline('operation', baseline);
   * ```
   */
  static setBaseline(name: string, result: BenchmarkResult): void {
    this.baselines.set(name, result);
  }

  /**
   * Compare result with baseline
   *
   * @param name - Benchmark name
   * @param current - Current benchmark result
   * @returns Comparison result
   *
   * @example
   * ```typescript
   * const current = await PerformanceBenchmark.benchmark('operation', async () => {
   *   await operation();
   * });
   * const comparison = PerformanceBenchmark.compareWithBaseline('operation', current);
   * console.log(`Performance change: ${comparison.changePercent}%`);
   * ```
   */
  static compareWithBaseline(
    name: string,
    current: BenchmarkResult
  ): {
    baseline: BenchmarkResult;
    current: BenchmarkResult;
    changePercent: number;
    improved: boolean;
    regression: boolean;
  } | null {
    const baseline = this.baselines.get(name);
    if (!baseline) {
      return null;
    }

    const changePercent = ((current.averageTime - baseline.averageTime) / baseline.averageTime) * 100;
    const improved = changePercent < -5; // 5% improvement
    const regression = changePercent > 5; // 5% regression

    return {
      baseline,
      current,
      changePercent,
      improved,
      regression,
    };
  }

  /**
   * Get current memory usage
   *
   * @returns Memory usage statistics
   */
  private static getMemoryUsage(): MemoryResult {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      delta: 0,
    };
  }

  /**
   * Generate a benchmark report
   *
   * @param results - Array of benchmark results
   * @returns Formatted report string
   *
   * @example
   * ```typescript
   * const results = await runBenchmarks();
   * const report = PerformanceBenchmark.generateReport(results);
   * console.log(report);
   * ```
   */
  static generateReport(results: BenchmarkResult[]): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('PERFORMANCE BENCHMARK REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    results.forEach((result) => {
      lines.push(`Benchmark: ${result.name}`);
      lines.push('-'.repeat(80));
      lines.push(`Iterations:       ${result.iterations.toLocaleString()}`);
      lines.push(`Total Time:       ${result.totalTime.toFixed(2)}ms`);
      lines.push(`Average Time:     ${result.averageTime.toFixed(4)}ms`);
      lines.push(`Min Time:         ${result.minTime.toFixed(4)}ms`);
      lines.push(`Max Time:         ${result.maxTime.toFixed(4)}ms`);
      lines.push(`Ops/Second:       ${result.opsPerSecond.toLocaleString()}`);

      if (result.percentiles) {
        lines.push('');
        lines.push('Percentiles:');
        lines.push(`  p50:           ${result.percentiles.p50.toFixed(4)}ms`);
        lines.push(`  p75:           ${result.percentiles.p75.toFixed(4)}ms`);
        lines.push(`  p90:           ${result.percentiles.p90.toFixed(4)}ms`);
        lines.push(`  p95:           ${result.percentiles.p95.toFixed(4)}ms`);
        lines.push(`  p99:           ${result.percentiles.p99.toFixed(4)}ms`);
      }

      if (result.memory) {
        lines.push('');
        lines.push('Memory Usage:');
        lines.push(`  Heap Used:     ${(result.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        lines.push(`  Heap Total:    ${(result.memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
        lines.push(`  Delta:         ${(result.memory.delta / 1024 / 1024).toFixed(2)} MB`);
      }

      lines.push('');
    });

    // Summary
    lines.push('='.repeat(80));
    lines.push('SUMMARY');
    lines.push('='.repeat(80));
    lines.push(`Total Benchmarks: ${results.length}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate a comparison report with baselines
   *
   * @returns Formatted comparison report
   *
   * @example
   * ```typescript
   * const report = PerformanceBenchmark.generateComparisonReport();
   * console.log(report);
   * ```
   */
  static generateComparisonReport(): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('BASELINE COMPARISON REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    if (this.baselines.size === 0) {
      lines.push('No baselines set.');
      return lines.join('\n');
    }

    this.baselines.forEach((baseline, name) => {
      lines.push(`Benchmark: ${name}`);
      lines.push('-'.repeat(80));
      lines.push(`Baseline Time:    ${baseline.averageTime.toFixed(4)}ms`);
      lines.push(`Baseline Ops/s:   ${baseline.opsPerSecond.toLocaleString()}`);

      if (baseline.memory) {
        lines.push(`Baseline Memory:  ${(baseline.memory.delta / 1024 / 1024).toFixed(2)} MB`);
      }

      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Clear all baselines
   */
  static clearBaselines(): void {
    this.baselines.clear();
  }

  /**
   * Get all baselines
   *
   * @returns Map of baseline names to results
   */
  static getBaselines(): Map<string, BenchmarkResult> {
    return new Map(this.baselines);
  }
}

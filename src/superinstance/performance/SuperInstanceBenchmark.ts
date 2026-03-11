/**
 * SuperInstance Benchmark Suite
 *
 * Performance benchmarks for SuperInstance system components.
 * Focused on Cloudflare deployment optimization.
 */

import { SuperInstanceSystem } from '../index';
import { InstanceType } from '../types/base';
import { performanceMonitor } from './SuperInstancePerformanceMonitor';

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p95: number;
  p99: number;
  memoryBefore?: number;
  memoryAfter?: number;
  memoryDelta?: number;
}

export class SuperInstanceBenchmark {
  private system: SuperInstanceSystem;

  constructor() {
    this.system = new SuperInstanceSystem();
  }

  /**
   * Run all benchmarks
   */
  async runAllBenchmarks(iterations: number = 100): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    results.push(await this.benchmarkInstanceCreation(iterations));
    results.push(await this.benchmarkDataOperations(iterations));
    results.push(await this.benchmarkRateCalculations(iterations));
    results.push(await this.benchmarkConnectionManagement(iterations));
    results.push(await this.benchmarkSerialization(iterations));

    return results;
  }

  /**
   * Benchmark instance creation
   */
  async benchmarkInstanceCreation(iterations: number): Promise<BenchmarkResult> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      await this.system.createInstance({
        type: InstanceType.DATA_BLOCK,
        id: `benchmark-${i}`,
        name: `Benchmark Instance ${i}`,
        description: 'Benchmark instance',
        cellPosition: { row: i, col: i },
        spreadsheetId: 'benchmark-spreadsheet',
        dataFormat: 'json',
        data: { test: 'data' }
      });

      const end = performance.now();
      times.push(end - start);
    }

    return this.calculateStats('Instance Creation', times, iterations);
  }

  /**
   * Benchmark data operations
   */
  async benchmarkDataOperations(iterations: number): Promise<BenchmarkResult> {
    const instance = await this.system.createInstance({
      type: InstanceType.DATA_BLOCK,
      id: 'data-benchmark',
      name: 'Data Benchmark',
      description: 'Data operations benchmark',
      cellPosition: { row: 0, col: 0 },
      spreadsheetId: 'benchmark-spreadsheet',
      dataFormat: 'json',
      data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: Math.random() }))
    });

    const times: number[] = [];

    // Benchmark read operations
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await instance.read({ limit: 100 });
      const end = performance.now();
      times.push(end - start);
    }

    // Benchmark write operations
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await instance.write({ test: i });
      const end = performance.now();
      times.push(end - start);
    }

    await this.system.removeInstance(instance.id);

    return this.calculateStats('Data Operations', times, iterations * 2);
  }

  /**
   * Benchmark rate calculations
   */
  async benchmarkRateCalculations(iterations: number): Promise<BenchmarkResult> {
    const instance = await this.system.createInstance({
      type: InstanceType.DATA_BLOCK,
      id: 'rate-benchmark',
      name: 'Rate Benchmark',
      description: 'Rate calculations benchmark',
      cellPosition: { row: 0, col: 0 },
      spreadsheetId: 'benchmark-spreadsheet',
      dataFormat: 'json'
    });

    const times: number[] = [];

    // Initialize rate state
    (instance as any).updateRateState(0);

    // Benchmark rate updates
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      (instance as any).updateRateState(Math.random() * 100);
      const end = performance.now();
      times.push(end - start);
    }

    await this.system.removeInstance(instance.id);

    return this.calculateStats('Rate Calculations', times, iterations);
  }

  /**
   * Benchmark connection management
   */
  async benchmarkConnectionManagement(iterations: number): Promise<BenchmarkResult> {
    const instance1 = await this.system.createInstance({
      type: InstanceType.DATA_BLOCK,
      id: 'conn-benchmark-1',
      name: 'Connection Benchmark 1',
      description: 'Connection benchmark',
      cellPosition: { row: 0, col: 0 },
      spreadsheetId: 'benchmark-spreadsheet',
      dataFormat: 'json'
    });

    const instance2 = await this.system.createInstance({
      type: InstanceType.DATA_BLOCK,
      id: 'conn-benchmark-2',
      name: 'Connection Benchmark 2',
      description: 'Connection benchmark',
      cellPosition: { row: 1, col: 1 },
      spreadsheetId: 'benchmark-spreadsheet',
      dataFormat: 'json'
    });

    const times: number[] = [];

    // Benchmark connection creation
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await instance1.connectTo(instance2, 'data_flow');
      const end = performance.now();
      times.push(end - start);
    }

    // Benchmark connection removal
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await instance1.disconnectFrom(instance2);
      const end = performance.now();
      times.push(end - start);
    }

    await this.system.removeInstance(instance1.id);
    await this.system.removeInstance(instance2.id);

    return this.calculateStats('Connection Management', times, iterations * 2);
  }

  /**
   * Benchmark serialization
   */
  async benchmarkSerialization(iterations: number): Promise<BenchmarkResult> {
    const instance = await this.system.createInstance({
      type: InstanceType.DATA_BLOCK,
      id: 'serialize-benchmark',
      name: 'Serialize Benchmark',
      description: 'Serialization benchmark',
      cellPosition: { row: 0, col: 0 },
      spreadsheetId: 'benchmark-spreadsheet',
      dataFormat: 'json',
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random(),
        timestamp: Date.now()
      }))
    });

    const times: number[] = [];

    // Benchmark serialization
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await instance.serialize();
      const end = performance.now();
      times.push(end - start);
    }

    await this.system.removeInstance(instance.id);

    return this.calculateStats('Serialization', times, iterations);
  }

  /**
   * Calculate statistics from timing data
   */
  private calculateStats(name: string, times: number[], iterations: number): BenchmarkResult {
    times.sort((a, b) => a - b);
    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const avgTime = totalTime / iterations;
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const p95 = times[Math.floor(iterations * 0.95)];
    const p99 = times[Math.floor(iterations * 0.99)];

    // Record metrics
    performanceMonitor.recordMetric(`benchmark_${name.toLowerCase().replace(/\s+/g, '_')}_avg`, avgTime, 'ms');
    performanceMonitor.recordMetric(`benchmark_${name.toLowerCase().replace(/\s+/g, '_')}_p95`, p95, 'ms');
    performanceMonitor.recordMetric(`benchmark_${name.toLowerCase().replace(/\s+/g, '_')}_p99`, p99, 'ms');

    return {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      p95,
      p99
    };
  }

  /**
   * Print benchmark results as table
   */
  printResults(results: BenchmarkResult[]): void {
    console.log('\n=== SuperInstance Benchmark Results ===\n');
    console.table(
      results.map(r => ({
        Benchmark: r.name,
        Iterations: r.iterations,
        'Avg (ms)': r.avgTime.toFixed(3),
        'P95 (ms)': r.p95.toFixed(3),
        'P99 (ms)': r.p99.toFixed(3),
        'Total (ms)': r.totalTime.toFixed(1)
      }))
    );

    // Summary
    const totalIterations = results.reduce((sum, r) => sum + r.iterations, 0);
    const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
    const avgOpsPerSecond = totalIterations / (totalTime / 1000);

    console.log('\n=== Summary ===');
    console.log(`Total operations: ${totalIterations}`);
    console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Average throughput: ${avgOpsPerSecond.toFixed(0)} ops/s`);
  }

  /**
   * Run benchmarks and print results
   */
  async runAndPrint(iterations: number = 100): Promise<void> {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║        SuperInstance Performance Benchmarks           ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    const results = await this.runAllBenchmarks(iterations);
    this.printResults(results);

    // Also print performance monitor stats
    const stats = performanceMonitor.getAllStats();
    console.log('\n=== Performance Monitor Statistics ===\n');
    for (const [name, stat] of Object.entries(stats)) {
      console.log(`${name}: avg=${stat.avg.toFixed(3)}ms, p95=${stat.p95.toFixed(3)}ms, count=${stat.count}`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const benchmark = new SuperInstanceBenchmark();
  benchmark.runAndPrint(100)
    .then(() => {
      console.log('\n✓ All benchmarks completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Benchmark failed:', error);
      process.exit(1);
    });
}
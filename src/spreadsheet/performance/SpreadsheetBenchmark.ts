/**
 * POLLN Spreadsheet - Spreadsheet Benchmark
 *
 * Comprehensive benchmarking suite for spreadsheet operations.
 * Tests rendering, formula complexity, memory usage, and collaboration.
 */

import { BenchmarkResult, MemoryResult, CollaborationResult, MetricStatistics } from './types';
import { MetricsCollector } from './MetricsCollector';

/**
 * Benchmark configuration
 */
interface BenchmarkConfig {
  warmupIterations?: number;
  benchmarkIterations?: number;
  memoryIterations?: number;
  collaborationIterations?: number;
}

/**
 * Formula complexity level
 */
type FormulaComplexity = 'simple' | 'medium' | 'complex' | 'extreme';

/**
 * Spreadsheet cell data
 */
interface SpreadsheetCell {
  row: number;
  column: number;
  value: string | number;
  formula?: string;
}

/**
 * Simulated user operation
 */
interface UserOperation {
  type: 'read' | 'write' | 'formula' | 'format';
  cell: string;
  value?: any;
  timestamp: number;
}

/**
 * Spreadsheet Benchmark
 *
 * Comprehensive benchmarking for spreadsheet operations.
 * Tests performance across various scenarios and workloads.
 */
export class SpreadsheetBenchmark {
  private config: Required<BenchmarkConfig>;
  private metricsCollector: MetricsCollector;
  private container: HTMLElement | null = null;

  constructor(config: BenchmarkConfig = {}, metricsCollector?: MetricsCollector) {
    this.config = {
      warmupIterations: 3,
      benchmarkIterations: 10,
      memoryIterations: 5,
      collaborationIterations: 20,
      ...config,
    };

    this.metricsCollector = metricsCollector || new MetricsCollector();
  }

  /**
   * Benchmark rendering performance with varying cell counts
   */
  benchmarkRender(cellCount: number): BenchmarkResult {
    const name = `render_${cellCount}_cells`;
    const samples: number[] = [];
    const operations: number[] = [];

    // Warmup
    for (let i = 0; i < this.config.warmupIterations; i++) {
      this.createSpreadsheet(cellCount);
      this.cleanupSpreadsheet();
    }

    // Benchmark
    for (let i = 0; i < this.config.benchmarkIterations; i++) {
      const startTime = performance.now();

      const spreadsheet = this.createSpreadsheet(cellCount);
      const cellsRendered = spreadsheet.querySelectorAll('.cell').length;

      const endTime = performance.now();
      const duration = endTime - startTime;

      samples.push(duration);
      operations.push(cellsRendered);

      this.metricsCollector.recordMetric(name, duration, { cellCount: cellCount.toString() });

      this.cleanupSpreadsheet();
    }

    const statistics = this.calculateStatistics(name, samples);
    const avgDuration = statistics.avg;
    const avgOperations = operations.reduce((a, b) => a + b, 0) / operations.length;

    // Memory delta (simplified)
    const memoryBefore = this.getMemoryUsage();
    const spreadsheet = this.createSpreadsheet(cellCount);
    const memoryAfter = this.getMemoryUsage();
    this.cleanupSpreadsheet();

    return {
      name,
      duration: avgDuration,
      operations: avgOperations,
      opsPerSecond: (avgOperations / avgDuration) * 1000,
      memoryDelta: memoryAfter - memoryBefore,
      samples,
      statistics,
      timestamp: Date.now(),
      tags: { cellCount: cellCount.toString() },
    };
  }

  /**
   * Benchmark formula complexity
   */
  benchmarkFormulaComplexity(formulas: string[]): BenchmarkResult {
    const name = `formulas_${formulas.length}`;
    const samples: number[] = [];
    const operations: number[] = [];

    // Warmup
    for (let i = 0; i < this.config.warmupIterations; i++) {
      this.evaluateFormulas(formulas);
    }

    // Benchmark
    for (let i = 0; i < this.config.benchmarkIterations; i++) {
      const startTime = performance.now();

      const results = this.evaluateFormulas(formulas);

      const endTime = performance.now();
      const duration = endTime - startTime;

      samples.push(duration);
      operations.push(results.length);

      this.metricsCollector.recordMetric(name, duration, {
        formulaCount: formulas.length.toString(),
      });
    }

    const statistics = this.calculateStatistics(name, samples);
    const avgDuration = statistics.avg;
    const avgOperations = operations.reduce((a, b) => a + b, 0) / operations.length;

    // Calculate complexity score
    const complexityScore = this.calculateComplexityScore(formulas);

    return {
      name,
      duration: avgDuration,
      operations: avgOperations,
      opsPerSecond: (avgOperations / avgDuration) * 1000,
      memoryDelta: 0,
      samples,
      statistics,
      timestamp: Date.now(),
      tags: {
        formulaCount: formulas.length.toString(),
        complexityScore: complexityScore.toString(),
      },
    };
  }

  /**
   * Benchmark memory usage with varying cell counts
   */
  benchmarkMemoryUsage(cellCount: number): MemoryResult {
    const name = `memory_${cellCount}_cells`;
    const samples: number[] = [];

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = this.getMemoryUsage();

    // Create spreadsheets and measure memory
    for (let i = 0; i < this.config.memoryIterations; i++) {
      this.createSpreadsheet(cellCount);
      const currentMemory = this.getMemoryUsage();
      samples.push(currentMemory);
    }

    const finalMemory = this.getMemoryUsage();
    const peakMemory = Math.max(...samples);

    // Clean up and measure again
    this.cleanupSpreadsheet();

    if (global.gc) {
      global.gc();
    }

    const afterCleanupMemory = this.getMemoryUsage();
    const memoryLeaked = afterCleanupMemory - initialMemory;

    // Estimate garbage collections (simplified)
    const garbageCollections = Math.floor(cellCount / 1000);

    return {
      name,
      initialMemory,
      peakMemory,
      finalMemory: afterCleanupMemory,
      memoryLeaked,
      garbageCollections,
      timestamp: Date.now(),
    };
  }

  /**
   * Benchmark collaboration performance
   */
  benchmarkCollaboration(userCount: number): CollaborationResult {
    const name = `collaboration_${userCount}_users`;
    const latencies: number[] = [];
    const conflicts = 0;

    // Simulate concurrent user operations
    const operationsPerUser = 50;
    const allOperations: UserOperation[] = [];

    for (let user = 0; user < userCount; user++) {
      for (let i = 0; i < operationsPerUser; i++) {
        allOperations.push({
          type: this.randomOperationType(),
          cell: this.randomCell(),
          value: Math.random(),
          timestamp: Date.now() + Math.random() * 1000,
        });
      }
    }

    // Sort by timestamp and process
    allOperations.sort((a, b) => a.timestamp - b.timestamp);

    const startTime = performance.now();

    for (const operation of allOperations) {
      const opStart = performance.now();

      // Simulate operation processing
      this.processOperation(operation);

      const opEnd = performance.now();
      latencies.push(opEnd - opStart);
    }

    const endTime = performance.now();

    // Calculate statistics
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const avgLatency = sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length;
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];

    return {
      name,
      userCount,
      operationsPerUser,
      avgLatency,
      p95Latency,
      p99Latency,
      conflictsResolved: conflicts,
      conflictsResolvedPerUser: conflicts / userCount,
      timestamp: Date.now(),
    };
  }

  /**
   * Run all benchmarks with default configurations
   */
  async runAllBenchmarks(): Promise<{
    render: BenchmarkResult[];
    formulas: BenchmarkResult[];
    memory: MemoryResult[];
    collaboration: CollaborationResult[];
  }> {
    const results = {
      render: [],
      formulas: [],
      memory: [],
      collaboration: [],
    };

    // Render benchmarks
    const cellCounts = [100, 500, 1000, 5000, 10000];
    for (const count of cellCounts) {
      results.render.push(this.benchmarkRender(count));
      await this.delay(100); // Prevent overwhelming the browser
    }

    // Formula benchmarks
    const formulaSets = this.getFormulaBenchmarkSets();
    for (const formulas of formulaSets) {
      results.formulas.push(this.benchmarkFormulaComplexity(formulas));
      await this.delay(100);
    }

    // Memory benchmarks
    for (const count of cellCounts.slice(0, 3)) {
      results.memory.push(this.benchmarkMemoryUsage(count));
      await this.delay(100);
    }

    // Collaboration benchmarks
    const userCounts = [1, 5, 10, 25];
    for (const count of userCounts) {
      results.collaboration.push(this.benchmarkCollaboration(count));
      await this.delay(100);
    }

    return results;
  }

  /**
   * Create a simulated spreadsheet
   */
  private createSpreadsheet(cellCount: number): HTMLElement {
    const container = document.createElement('div');
    container.className = 'spreadsheet';

    for (let i = 0; i < cellCount; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = this.randomCellValue();
      cell.dataset.row = Math.floor(i / 26).toString();
      cell.dataset.column = String.fromCharCode(65 + (i % 26));
      container.appendChild(cell);
    }

    this.container = container;
    return container;
  }

  /**
   * Clean up spreadsheet
   */
  private cleanupSpreadsheet(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  /**
   * Evaluate formulas (simplified simulation)
   */
  private evaluateFormulas(formulas: string[]): number[] {
    const results: number[] = [];

    for (const formula of formulas) {
      // Simplified formula evaluation
      try {
        const result = this.evaluateFormula(formula);
        results.push(result);
      } catch (error) {
        results.push(0);
      }
    }

    return results;
  }

  /**
   * Evaluate a single formula (simplified)
   */
  private evaluateFormula(formula: string): number {
    // Remove leading '='
    formula = formula.replace(/^=/, '');

    // Simple arithmetic evaluation
    const match = formula.match(/(\d+)([+\-*/])(\d+)/);
    if (match) {
      const a = parseInt(match[1], 10);
      const op = match[2];
      const b = parseInt(match[3], 10);

      switch (op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return b !== 0 ? a / b : 0;
      }
    }

    return Math.random() * 100;
  }

  /**
   * Process a user operation
   */
  private processOperation(operation: UserOperation): void {
    // Simulate operation processing
    switch (operation.type) {
      case 'read':
        // Simulate read operation
        break;
      case 'write':
        // Simulate write operation
        break;
      case 'formula':
        // Simulate formula evaluation
        this.evaluateFormula(operation.value as string);
        break;
      case 'format':
        // Simulate formatting operation
        break;
    }
  }

  /**
   * Get random operation type
   */
  private randomOperationType(): UserOperation['type'] {
    const types: UserOperation['type'][] = ['read', 'write', 'formula', 'format'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Get random cell reference
   */
  private randomCell(): string {
    const column = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const row = Math.floor(Math.random() * 100) + 1;
    return `${column}${row}`;
  }

  /**
   * Get random cell value
   */
  private randomCellValue(): string | number {
    return Math.random() > 0.5 ? Math.random() * 1000 : `Value ${Math.floor(Math.random() * 100)}`;
  }

  /**
   * Calculate complexity score for formulas
   */
  private calculateComplexityScore(formulas: string[]): number {
    let score = 0;

    for (const formula of formulas) {
      // Count operators
      const operatorCount = (formula.match(/[+\-*/^]/g) || []).length;
      score += operatorCount * 10;

      // Count function calls
      const functionCount = (formula.match(/[A-Z]+\(/g) || []).length;
      score += functionCount * 20;

      // Count cell references
      const cellRefCount = (formula.match(/[A-Z]+\d+/g) || []).length;
      score += cellRefCount * 5;

      // Count nested parentheses
      const maxDepth = this.getMaxNesting(formula);
      score += maxDepth * 15;
    }

    return score;
  }

  /**
   * Get maximum nesting depth of parentheses
   */
  private getMaxNesting(formula: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of formula) {
      if (char === '(') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === ')') {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  /**
   * Get formula benchmark sets
   */
  private getFormulaBenchmarkSets(): string[][] {
    return [
      // Simple
      ['=1+1', '=2*3', '=10/2'],
      // Medium
      ['=SUM(A1:A10)', '=AVERAGE(B1:B20)', '=MAX(C1:C15)'],
      // Complex
      [
        '=SUMIF(A1:A100,">50")',
        '=AVERAGEIFS(B1:B50,C1:C50,">0",D1:D50,"<100")',
        '=VLOOKUP(E1,F1:G100,2,FALSE)',
      ],
      // Extreme
      [
        '=INDEX(Sheet2!A1:Z1000,MATCH(H1,Sheet2!A1:A1000,0),5)',
        '=SUMPRODUCT((A1:A100>0)*(B1:B100<50)*(C1:C100))',
        '=IFERROR(OFFSET(INDIRECT("A"&ROW()),0,0,COUNT(A:A),1),"Error")',
      ],
    ];
  }

  /**
   * Calculate statistics from samples
   */
  private calculateStatistics(name: string, samples: number[]): MetricStatistics {
    if (samples.length === 0) {
      return {
        name,
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        stdDev: 0,
      };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / sorted.length;

    return {
      name,
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      median: sorted[Math.floor(sorted.length / 2)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev: Math.sqrt(variance),
    };
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    const memory = (performance as any).memory;
    return memory ? memory.usedJSHeapSize : 0;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Compare two benchmark results
   */
  compareBenchmarks(
    baseline: BenchmarkResult,
    current: BenchmarkResult
  ): {
    durationChange: number;
    durationChangePercent: number;
    opsPerSecondChange: number;
    opsPerSecondChangePercent: number;
    improved: boolean;
  } {
    const durationChange = current.duration - baseline.duration;
    const durationChangePercent = (durationChange / baseline.duration) * 100;
    const opsPerSecondChange = current.opsPerSecond - baseline.opsPerSecond;
    const opsPerSecondChangePercent = (opsPerSecondChange / baseline.opsPerSecond) * 100;

    return {
      durationChange,
      durationChangePercent,
      opsPerSecondChange,
      opsPerSecondChangePercent,
      improved: durationChange < 0 || opsPerSecondChange > 0,
    };
  }
}

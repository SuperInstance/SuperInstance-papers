/**
 * SMPbot GPU Benchmark Runner
 *
 * Simple runner for executing SMPbot GPU benchmarks.
 */

import { BenchmarkRunner } from '../benchmark-runner.js';
import { BenchmarkReporter } from '../benchmark-reporter.js';
import { createSMPbotGPUBenchmarkSuite } from './SMPbotGPUBenchmarkSuite.js';

export interface RunOptions {
  suites?: string[];
  benchmarks?: string[];
  filter?: string;
  iterations?: number;
  warmup?: number;
  outputFormat?: 'json' | 'markdown' | 'html';
  verbose?: boolean;
}

/**
 * Run SMPbot GPU benchmarks
 */
export async function runSMPbotGPUBenchmarks(options: RunOptions = {}): Promise<any> {
  const {
    suites = ['smpbot-gpu'],
    benchmarks,
    filter,
    iterations = 100,
    warmup = 10,
    outputFormat = 'markdown',
    verbose = false,
  } = options;

  console.log('🚀 Running SMPbot GPU Benchmarks');
  console.log('='.repeat(60));

  // Create benchmark runner
  const runner = new BenchmarkRunner({
    iterations,
    warmupIterations: warmup,
    verbose,
    outputFormat,
    enableMemoryProfiling: true,
    gcBetweenRuns: true,
  });

  // Register SMPbot GPU benchmark suite
  const smpbotSuite = createSMPbotGPUBenchmarkSuite();
  runner.registerSuite(smpbotSuite);

  // Run benchmarks
  const startTime = Date.now();
  const summary = await runner.run({
    suites,
    benchmarks,
    filter,
  });

  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;

  // Generate report
  const reporter = new BenchmarkReporter();
  const report = reporter.generateReport(summary);

  // Output results
  if (outputFormat === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n' + report.markdown);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Benchmark Summary');
  console.log('='.repeat(60));
  console.log(`Total benchmarks: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Total time: ${totalTime.toFixed(2)}s`);
  console.log('='.repeat(60));

  return {
    summary,
    report,
    totalTime,
  };
}

/**
 * Run specific benchmark suite
 */
export async function runBenchmarkSuite(
  suiteName: string,
  options: RunOptions = {}
): Promise<any> {
  return runSMPbotGPUBenchmarks({
    ...options,
    suites: [suiteName],
  });
}

/**
 * Run single benchmark
 */
export async function runSingleBenchmark(
  suiteName: string,
  benchmarkName: string,
  options: RunOptions = {}
): Promise<any> {
  return runSMPbotGPUBenchmarks({
    ...options,
    suites: [suiteName],
    benchmarks: [benchmarkName],
  });
}

/**
 * Run all benchmarks with default settings
 */
export async function runAllBenchmarks(): Promise<any> {
  return runSMPbotGPUBenchmarks();
}

/**
 * Run performance regression tests
 */
export async function runRegressionTests(baselineFile?: string): Promise<any> {
  console.log('📊 Running SMPbot GPU Regression Tests');
  console.log('='.repeat(60));

  // Run current benchmarks
  const currentResults = await runSMPbotGPUBenchmarks({
    outputFormat: 'json',
    verbose: false,
  });

  // Load baseline if provided
  let baselineResults = null;
  if (baselineFile) {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(baselineFile, 'utf-8');
      baselineResults = JSON.parse(content);
      console.log(`Loaded baseline from: ${baselineFile}`);
    } catch (error) {
      console.warn(`Failed to load baseline from ${baselineFile}:`, error);
    }
  }

  // Compare results
  const regressionReport = compareWithBaseline(currentResults, baselineResults);

  // Output regression report
  console.log('\n' + '='.repeat(60));
  console.log('Regression Test Report');
  console.log('='.repeat(60));

  if (regressionReport.regressions.length > 0) {
    console.log('❌ REGRESSIONS DETECTED:');
    for (const reg of regressionReport.regressions) {
      console.log(`  - ${reg.benchmarkName}: ${reg.percentChange.toFixed(2)}% slower`);
    }
  } else {
    console.log('✅ No regressions detected');
  }

  if (regressionReport.improvements.length > 0) {
    console.log('\n✅ IMPROVEMENTS:');
    for (const imp of regressionReport.improvements) {
      console.log(`  - ${imp.benchmarkName}: ${Math.abs(imp.percentChange).toFixed(2)}% faster`);
    }
  }

  console.log('='.repeat(60));

  return regressionReport;
}

/**
 * Compare current results with baseline
 */
function compareWithBaseline(current: any, baseline: any): any {
  if (!baseline) {
    return {
      regressions: [],
      improvements: [],
      summary: {
        total: 0,
        regressed: 0,
        improved: 0,
      },
    };
  }

  const regressions: any[] = [];
  const improvements: any[] = [];

  // Simple comparison logic
  // In real implementation, this would use statistical significance tests
  for (const result of current.summary.results) {
    const baselineResult = baseline.summary.results.find(
      (r: any) => r.name === result.name && r.suite === result.suite
    );

    if (baselineResult) {
      const currentMean = result.metrics.mean;
      const baselineMean = baselineResult.metrics.mean;

      if (currentMean > 0 && baselineMean > 0) {
        const percentChange = ((currentMean - baselineMean) / baselineMean) * 100;

        if (percentChange > 10) {
          // 10% slower = regression
          regressions.push({
            benchmarkName: result.name,
            suite: result.suite,
            percentChange,
            baselineMean,
            currentMean,
          });
        } else if (percentChange < -10) {
          // 10% faster = improvement
          improvements.push({
            benchmarkName: result.name,
            suite: result.suite,
            percentChange,
            baselineMean,
            currentMean,
          });
        }
      }
    }
  }

  return {
    regressions,
    improvements,
    summary: {
      total: current.summary.results.length,
      regressed: regressions.length,
      improved: improvements.length,
    },
  };
}

/**
 * Export for use in other modules
 */
export default {
  runSMPbotGPUBenchmarks,
  runBenchmarkSuite,
  runSingleBenchmark,
  runAllBenchmarks,
  runRegressionTests,
};
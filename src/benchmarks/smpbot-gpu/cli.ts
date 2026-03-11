#!/usr/bin/env node

/**
 * SMPbot GPU Benchmark CLI
 *
 * Command-line interface for running SMPbot GPU performance benchmarks.
 */

import { BenchmarkRunner } from '../benchmark-runner.js';
import { createSMPbotGPUBenchmarkSuite } from './SMPbotGPUBenchmarkSuite.js';
import { BenchmarkReporter } from '../benchmark-reporter.js';

interface CLIOptions {
  suites?: string[];
  benchmarks?: string[];
  filter?: string;
  iterations?: number;
  warmup?: number;
  output?: string;
  verbose?: boolean;
  config?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--suites':
        options.suites = args[++i]?.split(',') || [];
        break;
      case '--benchmarks':
        options.benchmarks = args[++i]?.split(',') || [];
        break;
      case '--filter':
        options.filter = args[++i];
        break;
      case '--iterations':
        options.iterations = parseInt(args[++i] || '100', 10);
        break;
      case '--warmup':
        options.warmup = parseInt(args[++i] || '10', 10);
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--config':
        options.config = args[++i];
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
SMPbot GPU Benchmark CLI
========================

Usage:
  node smpbot-gpu-benchmark [options]

Options:
  --suites <list>        Comma-separated list of benchmark suites to run
  --benchmarks <list>    Comma-separated list of benchmarks to run
  --filter <regex>       Regex filter for benchmark names
  --iterations <n>       Number of iterations per benchmark (default: 100)
  --warmup <n>           Number of warmup iterations (default: 10)
  --output <format>      Output format: json, markdown, html (default: markdown)
  --verbose              Enable verbose output
  --config <file>        JSON configuration file
  --help                 Show this help message

Available Benchmark Suites:
  - smpbot-gpu: SMPbot GPU performance benchmarks

Available Benchmarks (smpbot-gpu suite):
  - inference-latency: Single bot inference latency
  - batch-throughput: Batch processing throughput
  - memory-efficiency: GPU memory efficiency
  - model-loading: Model loading performance
  - scaling-characteristics: Scaling characteristics
  - cache-performance: Cache performance
  - end-to-end: End-to-end performance

Examples:
  node smpbot-gpu-benchmark --suites smpbot-gpu
  node smpbot-gpu-benchmark --benchmarks inference-latency,batch-throughput
  node smpbot-gpu-benchmark --filter "latency|throughput" --iterations 1000
  node smpbot-gpu-benchmark --output json --verbose
`);
}

/**
 * Load configuration from file
 */
async function loadConfig(filePath: string): Promise<any> {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load config from ${filePath}:`, error);
    return {};
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  // Load configuration if specified
  let config = {};
  if (options.config) {
    config = await loadConfig(options.config);
  }

  console.log('🚀 Starting SMPbot GPU Benchmarks\n');

  // Create benchmark runner
  const runner = new BenchmarkRunner({
    iterations: options.iterations,
    warmupIterations: options.warmup,
    verbose: options.verbose,
    outputFormat: (options.output as any) || 'markdown',
    enableMemoryProfiling: true,
    gcBetweenRuns: true,
  });

  // Register SMPbot GPU benchmark suite
  const smpbotSuite = createSMPbotGPUBenchmarkSuite(config);
  runner.registerSuite(smpbotSuite);

  // Run benchmarks
  const startTime = Date.now();
  const summary = await runner.run({
    suites: options.suites,
    benchmarks: options.benchmarks,
    filter: options.filter,
  });

  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;

  // Create reporter
  const reporter = new BenchmarkReporter();
  const report = reporter.generateReport(summary);

  // Output results
  if (options.output === 'json') {
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

  // Exit with appropriate code
  if (summary.failed > 0) {
    console.error('\n❌ Some benchmarks failed');
    process.exit(1);
  } else {
    console.log('\n✅ All benchmarks passed');
    process.exit(0);
  }
}

/**
 * Error handling
 */
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
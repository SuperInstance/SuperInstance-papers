/**
 * POLLN Benchmark CLI
 *
 * Command-line interface for running benchmarks and generating reports.
 */

import { Command } from 'commander';
import { BenchmarkRunner } from './benchmark-runner.js';
import { BenchmarkReporter } from './benchmark-reporter.js';
import { BaselineManager } from './baseline-manager.js';
import { AgentBenchmarks } from './suites/agent-benchmarks.js';
import { CommunicationBenchmarks } from './suites/communication-benchmarks.js';
import { DecisionBenchmarks } from './suites/decision-benchmarks.js';
import { LearningBenchmarks } from './suites/learning-benchmarks.js';
import { K VCacheBenchmarks } from './suites/kv-cache-benchmarks.js';
import { WorldModelBenchmarks } from './suites/worldmodel-benchmarks.js';
import { IntegrationBenchmarks } from './suites/integration-benchmarks.js';

export interface CliOptions {
  suites?: string[];
  benchmarks?: string[];
  filter?: string;
  iterations?: number;
  warmupIterations?: number;
  output?: string;
  format?: 'json' | 'markdown' | 'html';
  baseline?: string;
  saveBaseline?: string;
  verbose?: boolean;
}

/**
 * Run benchmark CLI
 */
export async function runBenchmarkCli(): Promise<void> {
  const program = new Command();

  program
    .name('polln-bench')
    .description('POLLN Performance Benchmarking Suite')
    .version('1.0.0');

  program
    .command('run')
    .description('Run benchmarks')
    .option('-s, --suites <suites>', 'Comma-separated list of suites to run')
    .option('-b, --benchmarks <benchmarks>', 'Comma-separated list of benchmarks to run')
    .option('-f, --filter <pattern>', 'Filter benchmarks by regex pattern')
    .option('-i, --iterations <number>', 'Number of iterations per benchmark', '100')
    .option('-w, --warmup <number>', 'Number of warmup iterations', '10')
    .option('-o, --output <path>', 'Output file path')
    .option('--format <format>', 'Output format (json, markdown, html)', 'json')
    .option('--baseline <path>', 'Baseline file for comparison')
    .option('--save-baseline <path>', 'Save results as baseline')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options: CliOptions) => {
      await runBenchmarks(options);
    });

  program
    .command('list')
    .description('List all available benchmarks')
    .action(listBenchmarks);

  program
    .command('compare')
    .description('Compare against baseline')
    .option('-b, --baseline <path>', 'Baseline file path', './benchmarks/baseline.json')
    .option('-r, --report <path>', 'Report output path', './benchmarks/report.html')
    .option('--threshold <number>', 'Regression threshold percentage', '10')
    .action(compareBaseline);

  await program.parseAsync(process.argv);
}

/**
 * Run benchmarks
 */
async function runBenchmarks(options: CliOptions): Promise<void> {
  console.log('POLLN Benchmark Suite');
  console.log('=====================\n');

  // Parse options
  const iterations = parseInt(options.iterations?.toString() || '100');
  const warmupIterations = parseInt(options.warmupIterations?.toString() || '10');
  const format = options.format || 'json';
  const verbose = options.verbose || false;

  // Create runner
  const runner = new BenchmarkRunner({
    iterations,
    warmupIterations,
    verbose,
    outputFormat: format,
  });

  // Register suites
  const suites = {
    agent: new AgentBenchmarks(),
    communication: new CommunicationBenchmarks(),
    decision: new DecisionBenchmarks(),
    learning: new LearningBenchmarks(),
    'kv-cache': new K VCacheBenchmarks(),
    worldmodel: new WorldModelBenchmarks(),
    integration: new IntegrationBenchmarks(),
  };

  // Filter suites if specified
  const suiteNames = options.suites ? options.suites.split(',') : Object.keys(suites);
  for (const name of suiteNames) {
    if (suites[name as keyof typeof suites]) {
      runner.registerSuite(suites[name as keyof typeof suites]);
    }
  }

  // Load baseline if specified
  let baseline;
  if (options.baseline) {
    console.log(`Loading baseline from: ${options.baseline}`);
    try {
      const baselineManager = await BaselineManager.load(options.baseline);
      baseline = baselineManager.getCurrentBaseline();
      console.log('Baseline loaded successfully\n');
    } catch (error) {
      console.error(`Warning: Failed to load baseline: ${error}`);
    }
  }

  // Run benchmarks
  console.log('Running benchmarks...\n');
  const summary = await runner.run({
    benchmarks: options.benchmarks?.split(','),
    filter: options.filter,
  });

  // Print summary
  console.log('\n=====================');
  console.log('Benchmark Results');
  console.log('=====================\n');
  console.log(`Total: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Total Time: ${(summary.totalTime / 1000).toFixed(2)}s`);

  // Generate report
  const report = BenchmarkReporter.generateReport(summary.results, format, baseline);

  if (options.output) {
    await BenchmarkReporter.saveReport(report, options.output);
    console.log(`\nReport saved to: ${options.output}`);
  } else {
    console.log('\n' + report);
  }

  // Save as baseline if specified
  if (options.saveBaseline) {
    console.log(`\nSaving baseline to: ${options.saveBaseline}`);
    const baselineManager = new BaselineManager();
    await baselineManager.save(options.saveBaseline, summary.results);
    console.log('Baseline saved successfully');
  }

  // Check for regressions if baseline provided
  if (baseline) {
    console.log('\nChecking for regressions...');
    const baselineManager = new BaselineManager();
    Object.assign(baselineManager, { currentBaseline: baseline });

    try {
      const regressionReport = baselineManager.checkRegressions(summary.results);

      console.log(`\nRegressions: ${regressionReport.summary.regressed}`);
      console.log(`Improvements: ${regressionReport.summary.improved}`);

      if (regressionReport.regressions.length > 0) {
        console.log('\n⚠️  Regressions detected:');
        for (const regression of regressionReport.regressions) {
          console.log(`  - ${regression.suite}/${regression.benchmarkName}`);
          console.log(`    ${regression.metricName}: +${regression.percentChange.toFixed(1)}%`);
        }
      }

      if (regressionReport.improvements.length > 0) {
        console.log('\n✨ Improvements detected:');
        for (const improvement of regressionReport.improvements) {
          console.log(`  - ${improvement.suite}/${improvement.benchmarkName}`);
          console.log(`    ${improvement.metricName}: -${improvement.percentChange.toFixed(1)}%`);
        }
      }
    } catch (error) {
      console.error(`Warning: Regression check failed: ${error}`);
    }
  }

  // Exit with error code if any benchmarks failed
  if (summary.failed > 0) {
    process.exit(1);
  }
}

/**
 * List all benchmarks
 */
function listBenchmarks(): void {
  console.log('Available Benchmark Suites:\n');

  const suites = [
    {
      name: 'agent',
      description: 'Agent lifecycle and operations',
      benchmarks: [
        'agent-spawn',
        'agent-initialize',
        'agent-process',
        'agent-state-get',
        'agent-state-set',
        'agent-value-update',
        'agent-shutdown',
        'agent-batch-spawn',
        'agent-communication',
        'agent-lifecycle-full',
      ],
    },
    {
      name: 'communication',
      description: 'A2A package communication',
      benchmarks: [
        'a2a-create',
        'a2a-serialize',
        'a2a-deserialize',
        'a2a-roundtrip',
        'pollen-grain-create',
        'pollen-grain-embed',
        'a2a-large-payload',
        'a2a-batch-create',
        'a2a-trace-validation',
        'a2a-compression',
      ],
    },
    {
      name: 'decision',
      description: 'Plinko decision layer',
      benchmarks: [
        'plinko-single-proposal',
        'plinko-multiple-proposals',
        'plinko-gumbel-softmax',
        'plinko-entropy-calc',
        'plinko-discriminator',
        'plinko-temperature-anneal',
        'plinko-safety-override',
        'plinko-batch-process',
        'plinko-selection-stability',
        'plinko-scalability',
      ],
    },
    {
      name: 'learning',
      description: 'Hebbian and Value Network learning',
      benchmarks: [
        'hebbian-synapse-update',
        'hebbian-batch-update',
        'hebbian-weight-decay',
        'hebbian-oja-normalization',
        'valuenet-predict',
        'valuenet-update',
        'valuenet-td-lambda',
        'valuenet-eligibility-trace',
        'learning-integration',
        'learning-scalability',
      ],
    },
    {
      name: 'kv-cache',
      description: 'KV-cache and anchor management',
      benchmarks: [
        'anchor-create',
        'anchor-retrieve',
        'anchor-match',
        'anchor-pool-operations',
        'ann-index-build',
        'ann-search',
        'ann-batch-search',
        'lmcache-serialize',
        'lmcache-deserialize',
        'kv-integration',
      ],
    },
    {
      name: 'worldmodel',
      description: 'World model and dreaming',
      benchmarks: [
        'worldmodel-encode',
        'worldmodel-decode',
        'worldmodel-reconstruct',
        'dreaming-single',
        'dreaming-batch',
        'dreaming-optimization',
        'tile-dreaming',
        'tile-dreaming-overnight',
        'worldmodel-training',
        'dreaming-integration',
      ],
    },
    {
      name: 'integration',
      description: 'End-to-end integration workflows',
      benchmarks: [
        'workflow-single-agent',
        'workflow-multi-agent',
        'workflow-dream-cycle',
        'workflow-meadow-share',
        'workflow-full-pipeline',
        'coordination-consensus',
        'coordination-pipeline',
        'federated-sync',
        'evolution-pruning',
        'scalability-large-colony',
      ],
    },
  ];

  for (const suite of suites) {
    console.log(`  ${suite.name}`);
    console.log(`    Description: ${suite.description}`);
    console.log(`    Benchmarks: ${suite.benchmarks.length}`);
    console.log('');
  }

  console.log(`\nTotal benchmarks: ${suites.reduce((sum, s) => sum + s.benchmarks.length, 0)}`);
  console.log('\nRun specific suite:');
  console.log('  npm run bench -- run -s agent');
  console.log('\nRun specific benchmark:');
  console.log('  npm run bench -- run -b agent-spawn');
  console.log('\nRun with filter:');
  console.log('  npm run bench -- run -f ".*spawn.*"');
}

/**
 * Compare against baseline
 */
async function compareBaseline(options: {
  baseline: string;
  report: string;
  threshold: string;
}): Promise<void> {
  console.log(`Loading baseline from: ${options.baseline}`);

  const baselineManager = await BaselineManager.load(options.baseline);
  const baseline = baselineManager.getCurrentBaseline();

  if (!baseline) {
    console.error('No baseline data found');
    process.exit(1);
  }

  console.log('Running current benchmarks...');

  const runner = new BenchmarkRunner();
  const allSuites = [
    new AgentBenchmarks(),
    new CommunicationBenchmarks(),
    new DecisionBenchmarks(),
    new LearningBenchmarks(),
    new K VCacheBenchmarks(),
    new WorldModelBenchmarks(),
    new IntegrationBenchmarks(),
  ];

  for (const suite of allSuites) {
    runner.registerSuite(suite);
  }

  const summary = await runner.run();

  console.log('\nChecking for regressions...');
  const threshold = parseFloat(options.threshold) / 100;
  const regressionReport = baselineManager.checkRegressions(summary.results, {
    critical: threshold * 2,
    major: threshold,
    minor: threshold / 2,
  });

  console.log(`\nRegressions: ${regressionReport.summary.regressed}`);
  console.log(`Improvements: ${regressionReport.summary.improved}`);

  // Generate comparison report
  const report = BenchmarkReporter.generateReport(summary.results, 'html', baseline);
  await BenchmarkReporter.saveReport(report, options.report);

  console.log(`\nComparison report saved to: ${options.report}`);

  if (regressionReport.summary.regressed > 0) {
    process.exit(1);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarkCli().catch(console.error);
}

/**
 * POLLN Comprehensive Benchmarking Suite
 *
 * A complete performance testing framework for measuring and tracking
 * performance across all POLLN core operations.
 *
 * Features:
 * - Modular benchmark system for different components
 * - Statistical analysis with percentiles
 * - Memory profiling integration
 * - Historical comparison and regression detection
 * - HTML report generation with charts
 * - CI/CD integration support
 */

// Core infrastructure
export { BenchmarkRunner } from './benchmark-runner.js';
export { BenchmarkReporter } from './benchmark-reporter.js';
export { BenchmarkProfiler } from './benchmark-profiler.js';
export { BaselineManager } from './baseline-manager.js';

// Benchmark suites
export { AgentBenchmarks } from './suites/agent-benchmarks.js';
export { CommunicationBenchmarks } from './suites/communication-benchmarks.js';
export { DecisionBenchmarks } from './suites/decision-benchmarks.js';
export { LearningBenchmarks } from './suites/learning-benchmarks.js';
export { K VCacheBenchmarks } from './suites/kv-cache-benchmarks.js';
export { WorldModelBenchmarks } from './suites/worldmodel-benchmarks.js';
export { IntegrationBenchmarks } from './suites/integration-benchmarks.js';

// Types
export type {
  BenchmarkConfig,
  BenchmarkResult,
  BenchmarkMetrics,
  BenchmarkSuite,
  RegressionReport,
  BaselineData
} from './types.js';

// CLI entry point
export { runBenchmarkCli } from './cli.js';

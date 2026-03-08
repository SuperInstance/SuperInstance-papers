/**
 * POLLN Benchmark Type Definitions
 */

import { performance } from 'perf_hooks';

/**
 * Core benchmark configuration
 */
export interface BenchmarkConfig {
  // Test execution
  iterations: number;
  warmupIterations: number;
  timeout: number;
  seed: number;

  // Workload parameters
  sampleSize: number;
  concurrency: number;

  // Measurement
  enableMemoryProfiling: boolean;
  enableCpuProfiling: boolean;
  gcBetweenRuns: boolean;

  // Output
  verbose: boolean;
  outputFormat: 'json' | 'markdown' | 'html';
}

/**
 * Benchmark result metrics
 */
export interface BenchmarkMetrics {
  // Timing
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;

  // Memory
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  memoryPeak: number;

  // Throughput
  opsPerSecond: number;
  totalOps: number;
  totalTime: number;

  // Custom metrics
  customMetrics?: Map<string, number>;
}

/**
 * Individual benchmark result
 */
export interface BenchmarkResult {
  name: string;
  suite: string;
  category: string;

  timestamp: number;
  config: BenchmarkConfig;
  metrics: BenchmarkMetrics;

  // Raw samples
  samples: number[];
  memorySamples: number[];

  // Status
  passed: boolean;
  error?: string;

  // Metadata
  metadata: Record<string, unknown>;
}

/**
 * Benchmark suite definition
 */
export interface BenchmarkSuite {
  name: string;
  description: string;
  version: string;

  setup(): Promise<void>;
  teardown(): Promise<void>;

  benchmarks: Map<string, BenchmarkFunction>;
}

/**
 * Benchmark function signature
 */
export type BenchmarkFunction = (
  config: BenchmarkConfig
) => Promise<BenchmarkMetrics>;

/**
 * Regression detection report
 */
export interface RegressionReport {
  timestamp: number;
  commitHash?: string;
  branch?: string;

  regressions: RegressionIssue[];
  improvements: RegressionIssue[];

  summary: {
    total: number;
    passed: number;
    failed: number;
    regressed: number;
    improved: number;
  };
}

/**
 * Individual regression issue
 */
export interface RegressionIssue {
  benchmarkName: string;
  suite: string;

  metricName: string;
  baselineValue: number;
  currentValue: number;

  percentChange: number;
  threshold: number;

  severity: 'critical' | 'major' | 'minor';
}

/**
 * Baseline data for comparison
 */
export interface BaselineData {
  timestamp: number;
  commitHash?: string;
  branch?: string;

  results: Map<string, BenchmarkResult>;

  systemInfo: SystemInfo;
}

/**
 * System information
 */
export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  freemMemory: number;
}

/**
 * Benchmark execution context
 */
export interface BenchmarkContext {
  name: string;
  suite: string;
  config: BenchmarkConfig;

  startTime: number;
  iteration: number;
  isWarmup: boolean;

  metadata: Record<string, unknown>;
}

/**
 * Profiling data
 */
export interface ProfilingData {
  cpuProfile?: unknown; // CPU profiling data
  memoryProfile?: MemoryProfile;
  heapSnapshot?: unknown;

  customMetrics: Map<string, number[]>;
}

/**
 * Memory profile
 */
export interface MemoryProfile {
  samples: {
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  }[];
}

/**
 * Comparison result
 */
export interface ComparisonResult {
  benchmarkName: string;
  suite: string;

  baseline: BenchmarkMetrics;
  current: BenchmarkMetrics;

  differences: Map<string, number>;
  percentChanges: Map<string, number>;

  status: 'improved' | 'regressed' | 'stable';
}

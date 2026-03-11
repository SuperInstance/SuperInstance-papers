/**
 * SMPbot GPU Benchmark Index
 *
 * Main entry point for SMPbot GPU performance benchmarks.
 */

export { SMPbotGPUBenchmarkSuite, createSMPbotGPUBenchmarkSuite } from './SMPbotGPUBenchmarkSuite.js';
export type { SMPbotBenchmarkConfig, SMPbotBenchmarkResult } from './SMPbotGPUBenchmarkSuite.js';

export { runSMPbotGPUBenchmarks } from './runner.js';

/**
 * Quick start function for running SMPbot GPU benchmarks
 */
export async function quickStart(): Promise<void> {
  console.log('🚀 Starting SMPbot GPU Benchmarks (Quick Start)');
  console.log('='.repeat(60));

  const { runSMPbotGPUBenchmarks } = await import('./runner.js');
  await runSMPbotGPUBenchmarks();

  console.log('='.repeat(60));
  console.log('✅ SMPbot GPU Benchmarks Complete');
}

/**
 * Default export for convenience
 */
export default {
  SMPbotGPUBenchmarkSuite,
  createSMPbotGPUBenchmarkSuite,
  quickStart,
};
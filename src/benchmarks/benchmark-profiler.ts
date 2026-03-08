/**
 * POLLN Benchmark Profiler
 *
 * Memory and CPU profiling utilities for detailed performance analysis.
 */

import { performance } from 'perf_hooks';
import type { ProfilingData, MemoryProfile } from './types.js';

/**
 * BenchmarkProfiler - Collect profiling data during benchmarks
 */
export class BenchmarkProfiler {
  private activeProfiles: Map<string, ProfilingData> = new Map();

  /**
   * Start profiling a benchmark
   */
  start(benchmarkName?: string): ProfilingData {
    const profileId = benchmarkName || `profile_${Date.now()}_${Math.random()}`;

    const profilingData: ProfilingData = {
      memoryProfile: {
        samples: [],
      },
      customMetrics: new Map(),
    };

    // Start memory sampling
    if (profilingData.memoryProfile) {
      this.startMemorySampling(profilingData);
    }

    this.activeProfiles.set(profileId, profilingData);
    return profilingData;
  }

  /**
   * Stop profiling a benchmark
   */
  stop(profilingData: ProfilingData): void {
    // Stop memory sampling
    if (profilingData.memoryProfile) {
      this.stopMemorySampling(profilingData);
    }

    // Remove from active profiles
    for (const [id, profile] of this.activeProfiles) {
      if (profile === profilingData) {
        this.activeProfiles.delete(id);
        break;
      }
    }
  }

  /**
   * Start memory sampling
   */
  private startMemorySampling(profilingData: ProfilingData): void {
    if (!profilingData.memoryProfile) return;

    const sampleInterval = setInterval(() => {
      const usage = process.memoryUsage();
      profilingData.memoryProfile!.samples.push({
        timestamp: performance.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers,
      });
    }, 10); // Sample every 10ms

    // Store interval ID for cleanup
    (profilingData as unknown as { _sampleInterval: NodeJS.Timeout })._sampleInterval = sampleInterval;
  }

  /**
   * Stop memory sampling
   */
  private stopMemorySampling(profilingData: ProfilingData): void {
    const interval = (profilingData as unknown as { _sampleInterval?: NodeJS.Timeout })._sampleInterval;
    if (interval) {
      clearInterval(interval);
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(profilingData: ProfilingData, name: string, value: number): void {
    if (!profilingData.customMetrics.has(name)) {
      profilingData.customMetrics.set(name, []);
    }
    profilingData.customMetrics.get(name)!.push(value);
  }

  /**
   * Get statistics for memory profile
   */
  getMemoryStats(profilingData: ProfilingData): {
    minHeap: number;
    maxHeap: number;
    avgHeap: number;
    heapGrowth: number;
  } | undefined {
    const profile = profilingData.memoryProfile;
    if (!profile || profile.samples.length === 0) {
      return undefined;
    }

    const heapUsed = profile.samples.map(s => s.heapUsed);
    const minHeap = Math.min(...heapUsed);
    const maxHeap = Math.max(...heapUsed);
    const avgHeap = heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length;
    const heapGrowth = heapUsed[heapUsed.length - 1] - heapUsed[0];

    return {
      minHeap,
      maxHeap,
      avgHeap,
      heapGrowth,
    };
  }

  /**
   * Get statistics for custom metric
   */
  getMetricStats(profilingData: ProfilingData, name: string): {
    count: number;
    mean: number;
    min: number;
    max: number;
    sum: number;
  } | undefined {
    const values = profilingData.customMetrics.get(name);
    if (!values || values.length === 0) {
      return undefined;
    }

    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { count, mean, min, max, sum };
  }
}

/**
 * Calculate statistics from samples
 */
export function calculateStats(samples: number[]): {
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
} {
  if (samples.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
    };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / count;

  // Standard deviation
  const squaredDiffs = sorted.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
  const stdDev = Math.sqrt(variance);

  // Percentiles
  const getPercentile = (p: number) => {
    const index = Math.ceil(count * p) - 1;
    return sorted[Math.max(0, Math.min(index, count - 1))];
  };

  return {
    mean,
    median: sorted[Math.floor(count / 2)],
    min: sorted[0],
    max: sorted[count - 1],
    stdDev,
    p50: getPercentile(0.50),
    p75: getPercentile(0.75),
    p90: getPercentile(0.90),
    p95: getPercentile(0.95),
    p99: getPercentile(0.99),
  };
}

/**
 * Calculate throughput metrics
 */
export function calculateThroughput(samples: number[], opsPerSample: number = 1): {
  opsPerSecond: number;
  totalOps: number;
  totalTime: number;
} {
  if (samples.length === 0) {
    return {
      opsPerSecond: 0,
      totalOps: 0,
      totalTime: 0,
    };
  }

  const totalTime = samples.reduce((a, b) => a + b, 0) / 1000; // Convert to seconds
  const totalOps = samples.length * opsPerSample;
  const opsPerSecond = totalOps / totalTime;

  return {
    opsPerSecond,
    totalOps,
    totalTime,
  };
}

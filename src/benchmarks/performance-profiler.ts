/**
 * Performance Profiler
 *
 * Memory profiling, hotspot detection, and optimization opportunity identification
 */

import { performanceMonitor } from '../superinstance/performance/SuperInstancePerformanceMonitor';

export interface ProfilingData {
  startTime: number;
  endTime: number;
  peakMemoryUsage: number;
  memorySnapshots: MemorySnapshot[];
  hotspots: Hotspot[];
  potentialLeaks: MemoryLeak[];
  optimizationOpportunities: OptimizationOpportunity[];
  methodCallCounts: Map<string, number>;
  executionTraces: ExecutionTrace[];
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface Hotspot {
  method: string;
  totalTime: number;
  callCount: number;
  avgTime: number;
  p95Time: number;
  p99Time: number;
  selfTime: number;
  childrenTime: number;
}

export interface MemoryLeak {
  type: string;
  location: string;
  growth: number;
  samples: number[];
  confidence: number;
}

export interface OptimizationOpportunity {
  type: 'caching' | 'batching' | 'parallelization' | 'streaming' | 'indexing' | 'memory_pool';
  location: string;
  description: string;
  potentialImprovement: number; // percentage
  complexity: 'low' | 'medium' | 'high';
  estimatedEffort: number; // hours
}

export interface ExecutionTrace {
  method: string;
  startTime: number;
  endTime: number;
  depth: number;
  parent?: string;
  memoryDelta: number;
}

export class PerformanceProfiler {
  private isRunning = false;
  private memorySnapshots: MemorySnapshot[] = [];
  private methodTraces: ExecutionTrace[] = [];
  private methodCallCounts: Map<string, number> = new Map();
  private startTime = 0;
  private monitoringInterval: any = null;
  private methodInterceptor: any = null;

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Profiler is already running');
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.memorySnapshots = [];
    this.methodTraces = [];
    this.methodCallCounts.clear();

    // Start memory monitoring
    this.startMemoryMonitoring();

    // Start method tracing
    this.startMethodTracing();

    console.log('🔍 Performance profiling started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Profiler is not running');
    }

    this.isRunning = false;

    // Stop memory monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Stop method tracing
    this.stopMethodTracing();

    console.log('✋ Performance profiling stopped');
  }

  getResults(): ProfilingData {
    if (this.isRunning) {
      throw new Error('Cannot get results while profiler is running');
    }

    const endTime = Date.now();
    const peakMemory = Math.max(...this.memorySnapshots.map(s => s.heapUsed));
    const hotspots = this.identifyHotspots();
    const leaks = this.identifyMemoryLeaks();
    const opportunities = this.identifyOptimizationOpportunities();

    return {
      startTime: this.startTime,
      endTime,
      peakMemoryUsage: peakMemory,
      memorySnapshots: this.memorySnapshots,
      hotspots,
      potentialLeaks: leaks,
      optimizationOpportunities: opportunities,
      methodCallCounts: this.methodCallCounts,
      executionTraces: this.methodTraces
    };
  }

  private startMemoryMonitoring(): void {
    // Initial snapshot
    this.captureMemorySnapshot();

    // Monitor every 100ms
    this.monitoringInterval = setInterval(() => {
      this.captureMemorySnapshot();
    }, 100);
  }

  private captureMemorySnapshot(): void {
    const memUsage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers || 0
    };

    this.memorySnapshots.push(snapshot);

    // Keep only last 1000 snapshots (100 seconds)
    if (this.memorySnapshots.length > 1000) {
      this.memorySnapshots = this.memorySnapshots.slice(-1000);
    }
  }

  private startMethodTracing(): void {
    // Record method calls performance monitor is already tracking
    const monitor = performanceMonitor;
    const originalRecord = monitor.recordMetric.bind(monitor);

    performanceMonitor.recordMetric = (name: string, value: number, unit: string, tags?: Record<string, string>) => {
      if (name.includes('method') || name.includes('operation')) {
        this.recordMethodCall(name, value);
      }
      return originalRecord(name, value, unit, tags);
    };
  }

  private stopMethodTracing(): void {
    // Restore original behavior
    // (In a real implementation, we'd restore the original method)
  }

  private recordMethodCall(methodName: string, duration: number): void {
    const callCount = this.methodCallCounts.get(methodName) || 0;
    this.methodCallCounts.set(methodName, callCount + 1);

    const trace: ExecutionTrace = {
      method: methodName,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      depth: 0, // Would need stack tracking for real depth
      memoryDelta: 0 // Would need snapshot comparison for real delta
    };

    this.methodTraces.push(trace);

    // Keep only last 10000 traces
    if (this.methodTraces.length > 10000) {
      this.methodTraces = this.methodTraces.slice(-10000);
    }
  }

  private identifyHotspots(): Hotspot[] {
    const methodStats = new Map<string, { times: number[], totalTime: number, selfTime: number }>();

    // Aggregate timing data
    for (const trace of this.methodTraces) {
      const method = trace.method;
      if (!methodStats.has(method)) {
        methodStats.set(method, { times: [], totalTime: 0, selfTime: 0 });
      }

      const stats = methodStats.get(method)!;
      const duration = trace.endTime - trace.startTime;
      stats.times.push(duration);
      stats.totalTime += duration;
      stats.selfTime += duration; // For now, assume no children
    }

    // Calculate hotspots
    const hotspots: Hotspot[] = [];
    for (const [method, stats] of methodStats) {
      const times = stats.times.sort((a, b) => a - b);
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const p95Time = times[Math.floor(times.length * 0.95)];
      const p99Time = times[Math.floor(times.length * 0.99)];

      hotspots.push({
        method,
        totalTime: stats.totalTime,
        callCount: times.length,
        avgTime,
        p95Time,
        p99Time,
        selfTime: stats.selfTime,
        childrenTime: 0
      });
    }

    // Sort by total time
    hotspots.sort((a, b) => b.totalTime - a.totalTime);

    return hotspots.slice(0, 20); // Top 20 hotspots
  }

  private identifyMemoryLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    // Analyze memory growth patterns
    if (this.memorySnapshots.length < 10) {
      return leaks;
    }

    // Simple leak detection: sustained growth
    const windowSize = 100; // 10 seconds of data
    for (let i = windowSize; i < this.memorySnapshots.length; i += windowSize) {
      const startSnapshot = this.memorySnapshots[i - windowSize];
      const endSnapshot = this.memorySnapshots[i];

      const growth = endSnapshot.heapUsed - startSnapshot.heapUsed;
      const growthRate = growth / windowSize; // bytes per snapshot

      if (growth > 10 * 1024 * 1024) { // 10MB growth
        // Check if growth is consistent (not just a spike)
        const samples = this.memorySnapshots
          .slice(i - windowSize, i)
          .map(s => {
            const base = startSnapshot.heapUsed;
            return (s.heapUsed - base) / base;
          });

        const avgGrowth = samples.reduce((sum, s) => sum + s, 0) / samples.length;
        const variance = samples.reduce((sum, s) => sum + Math.pow(s - avgGrowth, 2), 0) / samples.length;
        const isConsistent = variance < 0.01; // Low variance indicates steady growth

        if (isConsistent) {
          leaks.push({
            type: 'heap_growth',
            location: 'system_wide',
            growth,
            samples,
            confidence: 0.8
          });
        }
      }
    }

    return leaks;
  }

  private identifyOptimizationOpportunities(): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Analyze hotspots for optimization opportunities
    const hotspots = this.identifyHotspots();

    for (const hotspot of hotspots) {
      // Check for repeated method calls that could benefit from caching
      if (hotspot.callCount > 1000 && hotspot.avgTime > 10) {
        opportunities.push({
          type: 'caching',
          location: hotspot.method,
          description: `Method ${hotspot.method} called ${hotspot.callCount} times with avg duration ${hotspot.avgTime.toFixed(2)}ms. Consider caching results.`,
          potentialImprovement: 30,
          complexity: 'low',
          estimatedEffort: 4
        });
      }

      // Check for high variance indicating potential batching opportunities
      const variance = this.calculateMethodVariance(hotspot.method);
      if (variance > hotspot.avgTime * 2) {
        opportunities.push({
          type: 'batching',
          location: hotspot.method,
          description: `High variance (${variance.toFixed(2)}) in ${hotspot.method} execution time. Consider batching operations.`,
          potentialImprovement: 40,
          complexity: 'medium',
          estimatedEffort: 8
        });
      }

      // Check for memory-intensive operations
      const memoryTrace = this.getMethodMemoryPattern(hotspot.method);
      if (memoryTrace.avgDelta > 1024 * 1024) { // More than 1MB average
        opportunities.push({
          type: 'streaming',
          location: hotspot.method,
          description: `Method ${hotspot.method} has high memory usage pattern. Consider streaming or chunked processing.`,
          potentialImprovement: 50,
          complexity: 'high',
          estimatedEffort: 16
        });
      }
    }

    // Analyze memory leaks for optimization opportunities
    const leaks = this.identifyMemoryLeaks();
    for (const leak of leaks) {
      if (leak.confidence > 0.7) {
        opportunities.push({
          type: 'memory_pool',
          location: leak.location,
          description: `Potential memory leak detected with ${(leak.growth / 1024 / 1024).toFixed(2)}MB growth. Consider object pooling or immediate cleanup.`,
          potentialImprovement: 60,
          complexity: 'high',
          estimatedEffort: 20
        });
      }
    }

    return opportunities.slice(0, 10); // Top 10 opportunities
  }

  private calculateMethodVariance(method: string): number {
    const traces = this.methodTraces.filter(t => t.method === method);
    if (traces.length < 2) return 0;

    const times = traces.map(t => t.endTime - t.startTime);
    const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
    const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
    return Math.sqrt(variance); // Return standard deviation
  }

  private getMethodMemoryPattern(method: string): { avgDelta: number, maxDelta: number } {
    const traces = this.methodTraces.filter(t => t.method === method);
    if (traces.length === 0) return { avgDelta: 0, maxDelta: 0 };

    const deltas = traces.map(t => t.memoryDelta);
    const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
    const maxDelta = Math.max(...deltas);

    return { avgDelta, maxDelta };
  }

  // Real-time monitoring during benchmarks
  printCurrentStats(): void {
    if (!this.isRunning) return;

    const currentMemory = process.memoryUsage();
    const uptime = Date.now() - this.startTime;
    const totalMethods = this.methodTraces.length;
    const peakMemory = Math.max(...this.memorySnapshots.map(s => s.heapUsed));

    console.log('\n--- Current Profiling Stats ---');
    console.log(`Uptime: ${(uptime / 1000).toFixed(1)}s`);
    console.log(`Current Memory: ${(currentMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Peak Memory: ${(peakMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total Method Calls: ${totalMethods}`);

    if (this.methodCallCounts.size > 0) {
      console.log('Top 5 Methods by Call Count:');
      const sortedMethods = Array.from(this.methodCallCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      sortedMethods.forEach(([method, count]) => {
        console.log(`  - ${method}: ${count.toLocaleString()} calls`);
      });
    }

    console.log('------------------------------\n');
  }

  // Generate optimization report
  generateReport(): string {
    const data = this.getResults();

    const report = [
      '# Performance Profiling Report\n',
      `**Duration**: ${((data.endTime - data.startTime) / 1000).toFixed(1)}s`,
      `**Peak Memory**: ${(data.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
      `**Total Method Calls**: ${data.methodCallCounts.size.toLocaleString()}\n`,

      '## Top Hotspots',
      data.hotspots.slice(0, 5).map(hotspot =>
        `- **${hotspot.method}**: ${hotspot.callCount.toLocaleString()} calls, ${hotspot.avgTime.toFixed(2)}ms avg, ${hotspot.p95Time.toFixed(2)}ms p95`
      ).join('\n'),

      '\n## Optimizations',
      data.optimizationOpportunities.map(opp =>
        `- **${opp.type}** at ${opp.location}: ${opp.description}\n  ` +
        `Potential improvement: ${opp.potentialImprovement}%, ` +
        `Complexity: ${opp.complexity}, ` +
        `Effort: ${opp.estimatedEffort}h`
      ).join('\n\n'),

      '\n## Memory Leaks',
      data.potentialLeaks.length > 0
        ? data.potentialLeaks.map(leak =>
          `- **${leak.type}** at ${leak.location}: ${(leak.growth / 1024 / 1024).toFixed(2)}MB growth (confidence: ${(leak.confidence * 100).toFixed(0)}%)`
        ).join('\n')
        : 'No memory leaks detected'
    ].join('\n');

    return report;
  }
}

// Utility functions for benchmark integration
export function profileBenchmark(
  name: string,
  operation: () => Promise<void>
): Promise<ProfilingData> {
  const profiler = new PerformanceProfiler();

  return profiler.start()
    .then(() => operation())
    .then(() => profiler.stop())
    .then(() => profiler.getResults())
    .finally(() => {
      console.log(`[${name}] Profiling complete - ${profiler.getResults().hotspots.length} hotspots identified`);
    });
}
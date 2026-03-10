/**
 * POLLN Spreadsheet - Performance Profiler
 *
 * Comprehensive performance profiling including:
 * - CPU profiling with flame graphs
 * - Memory profiling and leak detection
 * - Network timing analysis
 * - Long task detection and attribution
 * - Stack trace capture
 */

import {
  CPUProfile,
  MemoryProfile,
  MemoryLeak,
  NetworkTiming,
  LongTask,
  FlameGraph,
} from './types';
import { MetricsCollector } from './MetricsCollector';

/**
 * Profiling configuration
 */
interface ProfilerConfig {
  enableCPU: boolean;
  enableMemory: boolean;
  enableNetwork: boolean;
  enableLongTasks: boolean;
  sampleInterval?: number; // CPU profiling sample interval (μs)
  maxSamples?: number;
}

/**
 * Stack frame for CPU profiling
 */
interface StackFrame {
  name: string;
  url: string;
  line: number;
  column: number;
}

/**
 * Stack sample
 */
interface StackSample {
  timestamp: number;
  stack: StackFrame[];
}

/**
 * Memory allocation
 */
interface MemoryAllocation {
  timestamp: number;
  size: number;
  type: string;
}

/**
 * Network request data
 */
interface NetworkRequest {
  url: string;
  method: string;
  startTime: number;
  duration: number;
  size: number;
  status: number;
  cacheHit: boolean;
}

/**
 * Performance Profiler
 *
 * Provides comprehensive profiling capabilities for performance analysis.
 * Supports CPU, memory, network, and long task profiling.
 */
export class PerformanceProfiler {
  private config: ProfilerConfig;
  private metricsCollector: MetricsCollector;

  // CPU profiling
  private cpuProfiling = false;
  private cpuSamples: StackSample[] = [];
  private cpuStartTime = 0;

  // Memory profiling
  private memoryProfiling = false;
  private memorySnapshots: MemoryProfile[] = [];
  private memoryAllocations: MemoryAllocation[] = [];
  private memoryBaseline: MemoryProfile | null = null;

  // Network profiling
  private networkProfiling = false;
  private networkRequests: NetworkRequest[] = [];
  private networkObserver: PerformanceObserver | null = null;

  // Long task profiling
  private longTaskProfiling = false;
  private longTasks: LongTask[] = [];
  private longTaskObserver: PerformanceObserver | null = null;

  // Sampling intervals
  private cpuSamplingInterval: number | null = null;
  private memorySamplingInterval: number | null = null;

  constructor(config: Partial<ProfilerConfig> = {}, metricsCollector?: MetricsCollector) {
    this.config = {
      enableCPU: true,
      enableMemory: true,
      enableNetwork: true,
      enableLongTasks: true,
      sampleInterval: 100, // 100μs default
      maxSamples: 10000,
      ...config,
    };

    this.metricsCollector = metricsCollector || new MetricsCollector();
  }

  /**
   * Start all profiling
   */
  startProfiling(): void {
    if (this.config.enableCPU) this.startCPUProfiling();
    if (this.config.enableMemory) this.startMemoryProfiling();
    if (this.config.enableNetwork) this.startNetworkProfiling();
    if (this.config.enableLongTasks) this.startLongTaskProfiling();
  }

  /**
   * Stop all profiling
   */
  stopProfiling(): void {
    this.stopCPUProfiling();
    this.stopMemoryProfiling();
    this.stopNetworkProfiling();
    this.stopLongTaskProfiling();
  }

  /**
   * Start CPU profiling
   */
  startCPUProfiling(): void {
    if (this.cpuProfiling) return;

    this.cpuProfiling = true;
    this.cpuStartTime = performance.now();
    this.cpuSamples = [];

    // Sample stack at regular intervals
    const sampleStack = () => {
      if (!this.cpuProfiling) return;

      const stack = this.captureStackTrace();

      this.cpuSamples.push({
        timestamp: performance.now() - this.cpuStartTime,
        stack,
      });

      // Enforce max samples
      if (this.config.maxSamples && this.cpuSamples.length > this.config.maxSamples) {
        this.cpuSamples.shift();
      }
    };

    // Sample every 10ms
    this.cpuSamplingInterval = window.setInterval(sampleStack, 10) as unknown as number;
  }

  /**
   * Stop CPU profiling and return profile
   */
  stopCPUProfiling(): CPUProfile | null {
    if (!this.cpuProfiling) return null;

    this.cpuProfiling = false;

    if (this.cpuSamplingInterval !== null) {
      clearInterval(this.cpuSamplingInterval);
      this.cpuSamplingInterval = null;
    }

    const endTime = performance.now();
    const duration = endTime - this.cpuStartTime;

    // Convert samples to CPU profile format
    const profile = this.buildCPUProfile(this.cpuSamples, this.cpuStartTime, endTime);

    // Record metric
    this.metricsCollector.recordMetric('cpu_profile_duration', duration);

    return profile;
  }

  /**
   * Capture current stack trace
   */
  private captureStackTrace(): StackFrame[] {
    const stack: StackFrame[] = [];

    // Try to capture stack using Error
    try {
      throw new Error();
    } catch (error) {
      const errorStack = (error as Error).stack;

      if (errorStack) {
        const lines = errorStack.split('\n').slice(2); // Skip captureStackTrace and this function

        for (const line of lines) {
          const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ||
                       line.match(/at\s+(.+?):(\d+):(\d+)/);

          if (match) {
            const frame: StackFrame = {
              name: match[1] || 'anonymous',
              url: match[2] || '',
              line: parseInt(match[3] || '0', 10),
              column: parseInt(match[4] || '0', 10),
            };

            stack.push(frame);
          }
        }
      }
    }

    return stack;
  }

  /**
   * Build CPU profile from samples
   */
  private buildCPUProfile(samples: StackSample[], startTime: number, endTime: number): CPUProfile {
    // Build profile nodes from unique stack frames
    const nodeMap = new Map<string, number>();
    const nodes: CPUProfile['nodes'] = [];
    let nodeIdCounter = 1;

    // Root node
    const rootNode: ProfileNode = {
      id: 0,
      callFrame: {
        functionName: '(root)',
        scriptId: '0',
        url: '',
        lineNumber: 0,
        columnNumber: 0,
      },
      hitCount: 0,
      children: [],
    };

    nodes.push(rootNode);
    nodeMap.set('(root)', 0);

    // Process samples to build tree
    for (const sample of samples) {
      let parentId = 0;

      for (const frame of sample.stack) {
        const key = `${frame.name}@${frame.url}:${frame.line}:${frame.column}`;

        if (!nodeMap.has(key)) {
          const node: ProfileNode = {
            id: nodeIdCounter++,
            callFrame: {
              functionName: frame.name,
              scriptId: nodeIdCounter.toString(),
              url: frame.url,
              lineNumber: frame.line,
              columnNumber: frame.column,
            },
            hitCount: 0,
            children: [],
          };

          nodes.push(node);
          nodeMap.set(key, node.id);

          // Add to parent's children
          const parent = nodes[parentId];
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node.id);
        }

        const nodeId = nodeMap.get(key)!;
        nodes[nodeId].hitCount++;
        parentId = nodeId;
      }
    }

    // Convert samples to profile format
    const profileSamples = samples.map((sample, index) => {
      // Find leaf node ID
      let leafNodeId = 0;

      if (sample.stack.length > 0) {
        const lastFrame = sample.stack[sample.stack.length - 1];
        const key = `${lastFrame.name}@${lastFrame.url}:${lastFrame.line}:${lastFrame.column}`;
        leafNodeId = nodeMap.get(key) || 0;
      }

      return {
        timestamp: sample.timestamp,
        stackId: leafNodeId,
      };
    });

    return {
      id: `cpu_profile_${Date.now()}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      samples: profileSamples,
      nodes,
    };
  }

  /**
   * Generate flame graph from CPU profile
   */
  generateFlameGraph(profile: CPUProfile): FlameGraph {
    const buildNode = (nodeId: number): FlameGraph => {
      const node = profile.nodes.find((n) => n.id === nodeId);

      if (!node) {
        return { name: 'unknown', value: 0, children: [] };
      }

      const children = node.children?.map(buildNode) || [];
      const totalHitCount = node.hitCount + children.reduce((sum, child) => sum + child.value, 0);

      return {
        name: node.callFrame.functionName || '(anonymous)',
        value: totalHitCount,
        children,
      };
    };

    return buildNode(0); // Start from root
  }

  /**
   * Start memory profiling
   */
  startMemoryProfiling(): void {
    if (this.memoryProfiling) return;

    this.memoryProfiling = true;
    this.memorySnapshots = [];
    this.memoryAllocations = [];
    this.memoryBaseline = this.captureMemorySnapshot();

    // Sample memory every second
    this.memorySamplingInterval = window.setInterval(() => {
      if (this.memoryProfiling) {
        const snapshot = this.captureMemorySnapshot();
        this.memorySnapshots.push(snapshot);

        // Record metric
        this.metricsCollector.recordMetric(
          'memory_usage',
          snapshot.usagePercentage,
          { unit: 'percent' }
        );
      }
    }, 1000) as unknown as number;
  }

  /**
   * Stop memory profiling
   */
  stopMemoryProfiling(): MemoryProfile[] {
    if (!this.memoryProfiling) return [];

    this.memoryProfiling = false;

    if (this.memorySamplingInterval !== null) {
      clearInterval(this.memorySamplingInterval);
      this.memorySamplingInterval = null;
    }

    // Detect memory leaks
    const leaks = this.detectMemoryLeaks();

    // Add leak info to last snapshot
    if (this.memorySnapshots.length > 0) {
      const lastSnapshot = this.memorySnapshots[this.memorySnapshots.length - 1];
      lastSnapshot.memoryLeaks = leaks;
    }

    return this.memorySnapshots;
  }

  /**
   * Capture memory snapshot
   */
  private captureMemorySnapshot(): MemoryProfile {
    const memory = (performance as any).memory;

    if (!memory) {
      return {
        timestamp: Date.now(),
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        usagePercentage: 0,
      };
    }

    const used = memory.usedJSHeapSize;
    const total = memory.totalJSHeapSize;
    const limit = memory.jsHeapSizeLimit;

    return {
      timestamp: Date.now(),
      usedJSHeapSize: used,
      totalJSHeapSize: total,
      jsHeapSizeLimit: limit,
      usagePercentage: (used / limit) * 100,
    };
  }

  /**
   * Detect memory leaks
   */
  private detectMemoryLeaks(): MemoryLeak[] {
    if (this.memorySnapshots.length < 5) {
      return [];
    }

    const leaks: MemoryLeak[] = [];
    const recentSnapshots = this.memorySnapshots.slice(-10);

    // Check for consistent memory growth
    let growthCount = 0;
    for (let i = 1; i < recentSnapshots.length; i++) {
      if (recentSnapshots[i].usedJSHeapSize > recentSnapshots[i - 1].usedJSHeapSize) {
        growthCount++;
      }
    }

    // If 80%+ of snapshots show growth, potential leak
    if (growthCount / recentSnapshots.length >= 0.8) {
      const totalGrowth = recentSnapshots[recentSnapshots.length - 1].usedJSHeapSize -
                         recentSnapshots[0].usedJSHeapSize;

      leaks.push({
        objectId: 0,
        size: totalGrowth,
        type: 'unknown',
        retained: totalGrowth,
      });
    }

    return leaks;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    current: MemoryProfile;
    peak: MemoryProfile;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } | null {
    if (this.memorySnapshots.length === 0) {
      return null;
    }

    const current = this.memorySnapshots[this.memorySnapshots.length - 1];
    const peak = this.memorySnapshots.reduce((max, snapshot) =>
      snapshot.usedJSHeapSize > max.usedJSHeapSize ? snapshot : max
    );

    const average = this.memorySnapshots.reduce((sum, s) => sum + s.usedJSHeapSize, 0) /
                   this.memorySnapshots.length;

    // Determine trend
    const recent = this.memorySnapshots.slice(-5);
    const trendValues = recent.map((s) => s.usedJSHeapSize);
    const firstAvg = trendValues.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    const lastAvg = trendValues.slice(-2).reduce((a, b) => a + b, 0) / 2;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (lastAvg > firstAvg * 1.05) trend = 'increasing';
    else if (lastAvg < firstAvg * 0.95) trend = 'decreasing';
    else trend = 'stable';

    return { current, peak, average, trend };
  }

  /**
   * Start network profiling
   */
  startNetworkProfiling(): void {
    if (this.networkProfiling || !window.PerformanceObserver) return;

    this.networkProfiling = true;
    this.networkRequests = [];

    try {
      this.networkObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;

          this.networkRequests.push({
            url: resource.name,
            method: this.getRequestMethod(resource.name),
            startTime: resource.startTime,
            duration: resource.duration,
            size: resource.transferSize,
            status: 0, // Not available in ResourceTiming
            cacheHit: resource.transferSize === 0,
          });

          // Record metric
          this.metricsCollector.recordMetric(
            'network_request_duration',
            resource.duration,
            { url: resource.name }
          );
        }
      });

      this.networkObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('Network profiling not supported', e);
    }
  }

  /**
   * Stop network profiling
   */
  stopNetworkProfiling(): NetworkTiming[] {
    if (!this.networkProfiling) return [];

    this.networkProfiling = false;

    if (this.networkObserver) {
      this.networkObserver.disconnect();
      this.networkObserver = null;
    }

    // Convert to NetworkTiming format
    return this.networkRequests.map((req) => ({
      url: req.url,
      startTime: req.startTime,
      duration: req.duration,
      transferSize: req.size,
      encodedBodySize: req.size,
      decodedBodySize: req.size,
      timing: {
        dns: 0,
        tcp: 0,
        tls: 0,
        ttfb: 0,
        download: req.duration,
        total: req.duration,
      },
      status: req.status,
      cacheHit: req.cacheHit,
    }));
  }

  /**
   * Get request method from URL (simplified)
   */
  private getRequestMethod(url: string): string {
    // This is a simplification - actual method detection would require instrumentation
    return 'GET';
  }

  /**
   * Start long task profiling
   */
  startLongTaskProfiling(): void {
    if (this.longTaskProfiling || !window.PerformanceObserver) return;

    this.longTaskProfiling = true;
    this.longTasks = [];

    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const longTask = {
            startTime: entry.startTime,
            duration: entry.duration,
            attribution: (entry as any).attribution,
          };

          this.longTasks.push(longTask);

          // Record metric
          this.metricsCollector.recordMetric('long_task_duration', entry.duration);
        }
      });

      this.longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn('Long task profiling not supported', e);
    }
  }

  /**
   * Stop long task profiling
   */
  stopLongTaskProfiling(): LongTask[] {
    if (!this.longTaskProfiling) return [];

    this.longTaskProfiling = false;

    if (this.longTaskObserver) {
      this.longTaskObserver.disconnect();
      this.longTaskObserver = null;
    }

    return [...this.longTasks];
  }

  /**
   * Get profiling summary
   */
  getSummary(): {
    cpu: {
      profiling: boolean;
      samples: number;
      duration: number;
    };
    memory: {
      profiling: boolean;
      snapshots: number;
      currentUsage: number;
      trend: 'increasing' | 'decreasing' | 'stable' | null;
    };
    network: {
      profiling: boolean;
      requests: number;
      totalDuration: number;
      cacheHitRate: number;
    };
    longTasks: {
      profiling: boolean;
      count: number;
      totalDuration: number;
      avgDuration: number;
    };
  } {
    const memoryStats = this.getMemoryStats();
    const networkRequests = this.networkRequests;

    return {
      cpu: {
        profiling: this.cpuProfiling,
        samples: this.cpuSamples.length,
        duration: this.cpuProfiling ? performance.now() - this.cpuStartTime : 0,
      },
      memory: {
        profiling: this.memoryProfiling,
        snapshots: this.memorySnapshots.length,
        currentUsage: this.memorySnapshots.length > 0
          ? this.memorySnapshots[this.memorySnapshots.length - 1].usagePercentage
          : 0,
        trend: memoryStats?.trend || null,
      },
      network: {
        profiling: this.networkProfiling,
        requests: networkRequests.length,
        totalDuration: networkRequests.reduce((sum, req) => sum + req.duration, 0),
        cacheHitRate: networkRequests.length > 0
          ? networkRequests.filter((req) => req.cacheHit).length / networkRequests.length
          : 0,
      },
      longTasks: {
        profiling: this.longTaskProfiling,
        count: this.longTasks.length,
        totalDuration: this.longTasks.reduce((sum, task) => sum + task.duration, 0),
        avgDuration: this.longTasks.length > 0
          ? this.longTasks.reduce((sum, task) => sum + task.duration, 0) / this.longTasks.length
          : 0,
      },
    };
  }

  /**
   * Reset all profiling data
   */
  reset(): void {
    this.cpuSamples = [];
    this.memorySnapshots = [];
    this.memoryAllocations = [];
    this.networkRequests = [];
    this.longTasks = [];
    this.memoryBaseline = null;
  }
}

// Fix: Add ProfileNode type that was referenced
interface ProfileNode {
  id: number;
  callFrame: {
    functionName: string;
    scriptId: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  hitCount: number;
  children?: number[];
}

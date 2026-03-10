/**
 * POLLN Spreadsheet - Profiler
 *
 * Low-level profiling interface for CPU and memory profiling.
 * Integrates with Chrome DevTools Profiler API when available.
 */

import { CPUProfile, MemorySnapshot, FlameGraph } from './types';
import { MetricsCollector } from './MetricsCollector';

/**
 * Profiling session state
 */
interface ProfilingSession {
  id: string;
  type: 'cpu' | 'memory' | 'both';
  startTime: number;
  endTime?: number;
  samples?: any[];
}

/**
 * Profiler configuration
 */
interface ProfilerConfig {
  enableSampling?: boolean;
  samplingInterval?: number; // μs
  enableMemoryTracking?: boolean;
  captureStackTrace?: boolean;
}

/**
 * DevTools Profiler interface (not standard API)
 */
interface ChromeDevToolsProfiler {
  start(): Promise<void>;
  stop(): Promise<CPUProfile>;
  startPreciseCoverage(): Promise<void>;
  takePreciseCoverage(): Promise<any>;
}

/**
 * Memory Profiler interface
 */
interface MemoryProfiler {
  start(): Promise<void>;
  stop(): Promise<MemorySnapshot>;
}

/**
 * Profiler
 *
 * Low-level profiling interface with support for:
 * - CPU profiling with flame graphs
 * - Memory profiling and snapshots
 * - Integration with Chrome DevTools Profiler
 * - Standalone profiling implementation
 */
export class Profiler {
  private config: Required<ProfilerConfig>;
  private metricsCollector: MetricsCollector;
  private sessions: Map<string, ProfilingSession> = new Map();

  // Chrome DevTools integration (when available)
  private devToolsProfiler: ChromeDevToolsProfiler | null = null;
  private memoryProfiler: MemoryProfiler | null = null;

  // Standalone profiling
  private standaloneProfiling = false;
  private standaloneSamples: {
    timestamp: number;
    stack: string[];
  }[] = [];

  constructor(config: ProfilerConfig = {}, metricsCollector?: MetricsCollector) {
    this.config = {
      enableSampling: true,
      samplingInterval: 100, // 100μs
      enableMemoryTracking: true,
      captureStackTrace: true,
      ...config,
    };

    this.metricsCollector = metricsCollector || new MetricsCollector();
    this.initializeDevTools();
  }

  /**
   * Initialize Chrome DevTools integration
   */
  private initializeDevTools(): void {
    // Check if running in Chrome with DevTools protocol
    if (typeof (window as any).chrome !== 'undefined' &&
        typeof (window as any).chrome?.prototype !== 'undefined') {
      // This is a placeholder - actual DevTools integration requires CDP
      this.devToolsProfiler = null;
    }
  }

  /**
   * Start CPU profiling
   */
  async startProfiling(type: 'cpu' | 'memory' | 'both' = 'cpu'): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: ProfilingSession = {
      id: sessionId,
      type,
      startTime: performance.now(),
    };

    this.sessions.set(sessionId, session);

    // Try DevTools profiler first
    if (type === 'cpu' || type === 'both') {
      try {
        if (this.devToolsProfiler) {
          await this.devToolsProfiler.start();
        } else {
          this.startStandaloneProfiling();
        }
      } catch (error) {
        console.warn('DevTools profiler not available, using standalone profiling');
        this.startStandaloneProfiling();
      }
    }

    // Memory profiling
    if (type === 'memory' || type === 'both') {
      try {
        if (this.memoryProfiler) {
          await this.memoryProfiler.start();
        }
      } catch (error) {
        console.warn('Memory profiler not available');
      }
    }

    return sessionId;
  }

  /**
   * Stop profiling and get results
   */
  async stopProfiling(sessionId: string): Promise<{
    cpu?: CPUProfile;
    memory?: MemorySnapshot;
  }> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.endTime = performance.now();

    const results: {
      cpu?: CPUProfile;
      memory?: MemorySnapshot;
    } = {};

    // Stop CPU profiling
    if (session.type === 'cpu' || session.type === 'both') {
      try {
        if (this.devToolsProfiler) {
          results.cpu = await this.devToolsProfiler.stop();
        } else {
          results.cpu = this.stopStandaloneProfiling(session.startTime, session.endTime!);
        }
      } catch (error) {
        console.error('Error stopping CPU profiling:', error);
      }
    }

    // Stop memory profiling
    if (session.type === 'memory' || session.type === 'both') {
      try {
        if (this.memoryProfiler) {
          results.memory = await this.memoryProfiler.stop();
        } else {
          results.memory = this.captureMemorySnapshot();
        }
      } catch (error) {
        console.error('Error stopping memory profiling:', error);
      }
    }

    // Record metrics
    const duration = (session.endTime! - session.startTime) / 1000;
    this.metricsCollector.recordMetric('profiling_duration', duration, {
      type: session.type,
    });

    return results;
  }

  /**
   * Start standalone CPU profiling
   */
  private startStandaloneProfiling(): void {
    this.standaloneProfiling = true;
    this.standaloneSamples = [];

    // Sample stack at regular intervals
    const sampleStack = () => {
      if (!this.standaloneProfiling) return;

      const stack = this.captureStackTrace();
      this.standaloneSamples.push({
        timestamp: performance.now(),
        stack,
      });
    };

    // Sample every 10ms
    window.setTimeout(() => {
      if (this.standaloneProfiling) {
        sampleStack();
        window.setTimeout(arguments.callee as any, 10);
      }
    }, 10);
  }

  /**
   * Stop standalone CPU profiling
   */
  private stopStandaloneProfiling(startTime: number, endTime: number): CPUProfile {
    this.standaloneProfiling = false;

    // Convert samples to CPU profile format
    const profile = this.buildCPUProfile(this.standaloneSamples, startTime, endTime);

    this.standaloneSamples = [];

    return profile;
  }

  /**
   * Capture current stack trace
   */
  private captureStackTrace(): string[] {
    const stack: string[] = [];

    try {
      throw new Error();
    } catch (error) {
      const errorStack = (error as Error).stack;

      if (errorStack) {
        const lines = errorStack.split('\n').slice(2);

        for (const line of lines) {
          const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ||
                       line.match(/at\s+(.+?):(\d+):(\d+)/);

          if (match) {
            const functionName = match[1] || 'anonymous';
            const fileName = match[2]?.split('/').pop() || 'unknown';
            stack.push(`${functionName} (${fileName}:${match[3]})`);
          }
        }
      }
    }

    return stack;
  }

  /**
   * Build CPU profile from samples
   */
  private buildCPUProfile(
    samples: { timestamp: number; stack: string[] }[],
    startTime: number,
    endTime: number
  ): CPUProfile {
    // Build node tree from stack samples
    const nodeMap = new Map<string, number>();
    const nodes: CPUProfile['nodes'] = [];
    let nodeIdCounter = 1;

    // Root node
    const rootNode: any = {
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

    // Process each sample
    for (const sample of samples) {
      let parentId = 0;

      for (const frame of sample.stack) {
        if (!nodeMap.has(frame)) {
          const node: any = {
            id: nodeIdCounter++,
            callFrame: {
              functionName: frame,
              scriptId: nodeIdCounter.toString(),
              url: '',
              lineNumber: 0,
              columnNumber: 0,
            },
            hitCount: 0,
            children: [],
          };

          nodes.push(node);
          nodeMap.set(frame, node.id);

          // Add to parent
          const parent = nodes[parentId];
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node.id);
        }

        const nodeId = nodeMap.get(frame)!;
        nodes[nodeId].hitCount++;
        parentId = nodeId;
      }
    }

    // Build profile samples
    const profileSamples = samples.map((sample, index) => {
      let leafNodeId = 0;

      if (sample.stack.length > 0) {
        const lastFrame = sample.stack[sample.stack.length - 1];
        leafNodeId = nodeMap.get(lastFrame) || 0;
      }

      return {
        timestamp: sample.timestamp - startTime,
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
      const node = profile.nodes.find((n: any) => n.id === nodeId);

      if (!node) {
        return { name: 'unknown', value: 0, children: [] };
      }

      const children = (node.children || []).map((childId: number) => buildNode(childId));
      const totalHitCount = node.hitCount + children.reduce((sum: number, child: FlameGraph) => sum + child.value, 0);

      return {
        name: node.callFrame.functionName || '(anonymous)',
        value: totalHitCount,
        children,
      };
    };

    return buildNode(0);
  }

  /**
   * Capture memory snapshot
   */
  private captureMemorySnapshot(): MemorySnapshot {
    const memory = (performance as any).memory;

    return {
      id: `memory_snapshot_${Date.now()}`,
      timestamp: Date.now(),
      size: memory ? memory.usedJSHeapSize : 0,
      nodes: [],
      strings: [],
    };
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): ProfilingSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => !session.endTime
    );
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ProfilingSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Cancel active profiling session
   */
  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);

    if (session && !session.endTime) {
      session.endTime = performance.now();
      this.standaloneProfiling = false;
    }
  }

  /**
   * Export CPU profile as JSON
   */
  exportCPUProfile(profile: CPUProfile): string {
    return JSON.stringify(profile, null, 2);
  }

  /**
   * Import CPU profile from JSON
   */
  importCPUProfile(json: string): CPUProfile {
    try {
      return JSON.parse(json) as CPUProfile;
    } catch (error) {
      throw new Error(`Failed to import CPU profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if profiling is supported
   */
  static isSupported(): boolean {
    return typeof performance !== 'undefined' && typeof Error !== 'undefined';
  }

  /**
   * Check if DevTools profiler is available
   */
  static isDevToolsAvailable(): boolean {
    return typeof (window as any).chrome !== 'undefined';
  }
}

/**
 * Quick profiling utility
 */
export async function profileFunction<T>(
  fn: () => T,
  profiler?: Profiler
): Promise<{
  result: T;
  profile?: CPUProfile;
}> {
  const actualProfiler = profiler || new Profiler();

  const sessionId = await actualProfiler.startProfiling('cpu');

  try {
    const result = fn();
    const { cpu } = await actualProfiler.stopProfiling(sessionId);

    return { result, profile: cpu };
  } catch (error) {
    await actualProfiler.cancelSession(sessionId);
    throw error;
  }
}

/**
 * Quick async profiling utility
 */
export async function profileAsyncFunction<T>(
  fn: () => Promise<T>,
  profiler?: Profiler
): Promise<{
  result: T;
  profile?: CPUProfile;
}> {
  const actualProfiler = profiler || new Profiler();

  const sessionId = await actualProfiler.startProfiling('cpu');

  try {
    const result = await fn();
    const { cpu } = await actualProfiler.stopProfiling(sessionId);

    return { result, profile: cpu };
  } catch (error) {
    await actualProfiler.cancelSession(sessionId);
    throw error;
  }
}

/**
 * Compare two CPU profiles
 */
export function compareCPUProfiles(
  baseline: CPUProfile,
  current: CPUProfile
): {
  baselineDuration: number;
  currentDuration: number;
  durationChange: number;
  durationChangePercent: number;
  sampleCountChange: number;
  topFunctionsChanged: Array<{
    name: string;
    baselineHitCount: number;
    currentHitCount: number;
    changePercent: number;
  }>;
} {
  const baselineDuration = baseline.duration;
  const currentDuration = current.duration;
  const durationChange = currentDuration - baselineDuration;
  const durationChangePercent = (durationChange / baselineDuration) * 100;
  const sampleCountChange = current.samples.length - baseline.samples.length;

  // Find top functions with significant changes
  const baselineNodes = new Map(
    baseline.nodes.map((node: any) => [node.id, node])
  );
  const currentNodes = new Map(
    current.nodes.map((node: any) => [node.id, node])
  );

  const topFunctionsChanged: Array<{
    name: string;
    baselineHitCount: number;
    currentHitCount: number;
    changePercent: number;
  }> = [];

  for (const [id, node] of currentNodes) {
    const baselineNode = baselineNodes.get(id);

    if (baselineNode) {
      const changePercent = ((node.hitCount - baselineNode.hitCount) / baselineNode.hitCount) * 100;

      if (Math.abs(changePercent) > 20) {
        topFunctionsChanged.push({
          name: node.callFrame.functionName || '(anonymous)',
          baselineHitCount: baselineNode.hitCount,
          currentHitCount: node.hitCount,
          changePercent,
        });
      }
    }
  }

  // Sort by absolute change
  topFunctionsChanged.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  return {
    baselineDuration,
    currentDuration,
    durationChange,
    durationChangePercent,
    sampleCountChange,
    topFunctionsChanged: topFunctionsChanged.slice(0, 10),
  };
}

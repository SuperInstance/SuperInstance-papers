/**
 * POLLN Spreadsheet - MetricsCollector
 *
 * Comprehensive performance metrics collection and analysis.
 * Tracks FPS, memory, latency, and custom metrics.
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: MemoryUsage;
  latency: LatencyMetrics;
  custom: Map<string, number>;
}

export interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
}

export interface LatencyMetrics {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface MetricSnapshot {
  timestamp: number;
  fps: number;
  frameTime: number;
  memory: MemoryUsage;
  operations: number;
}

export interface MetricsConfig {
  sampleInterval: number; // ms
  historySize: number;
  enableMemoryTracking: boolean;
  enableFPSTracking: boolean;
  enableLatencyTracking: boolean;
}

/**
 * MetricsCollector - Performance monitoring and analysis
 *
 * Features:
 * - Real-time FPS tracking
 * - Memory usage monitoring
 * - Latency percentile calculations
 * - Custom metric registration
 * - Historical data analysis
 */
export class MetricsCollector {
  private config: MetricsConfig;
  private history: MetricSnapshot[] = [];
  private frameTimestamps: number[] = [];
  private latencySamples: number[] = [];
  private customMetrics: Map<string, number[]> = new Map();
  private operationCount = 0;

  private intervalId: NodeJS.Timeout | null = null;
  private rafId: number | null = null;
  private lastFrameTime = performance.now();

  // Performance observers
  private performanceObserver: PerformanceObserver | null = null;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = {
      sampleInterval: 1000,
      historySize: 60,
      enableMemoryTracking: true,
      enableFPSTracking: true,
      enableLatencyTracking: true,
      ...config,
    };

    this.setupPerformanceObserver();
  }

  /**
   * Start collecting metrics
   */
  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.config.sampleInterval);

    if (this.config.enableFPSTracking) {
      this.startFPSTracking();
    }
  }

  /**
   * Stop collecting metrics
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  /**
   * Setup performance observer for long tasks
   */
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // Long task detected
            this.recordMetric('long_task', entry.duration);
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'longtask'] });
    } catch (e) {
      // PerformanceObserver not supported
    }
  }

  /**
   * Start FPS tracking
   */
  private startFPSTracking(): void {
    const trackFrame = () => {
      const now = performance.now();
      const delta = now - this.lastFrameTime;

      this.frameTimestamps.push(now);

      // Keep only last second of frames
      const oneSecondAgo = now - 1000;
      this.frameTimestamps = this.frameTimestamps.filter((t) => t > oneSecondAgo);

      this.lastFrameTime = now;
      this.rafId = requestAnimationFrame(trackFrame);
    };

    this.rafId = requestAnimationFrame(trackFrame);
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    const snapshot: MetricSnapshot = {
      timestamp: Date.now(),
      fps: this.getCurrentFPS(),
      frameTime: this.getCurrentFrameTime(),
      memory: this.getMemoryUsage(),
      operations: this.operationCount,
    };

    this.history.push(snapshot);

    // Limit history size
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    // Reset operation count
    this.operationCount = 0;
  }

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    if (this.frameTimestamps.length < 2) return 0;

    const timeSpan = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
    if (timeSpan === 0) return 0;

    return (this.frameTimestamps.length / timeSpan) * 1000;
  }

  /**
   * Get current frame time
   */
  getCurrentFrameTime(): number {
    if (this.frameTimestamps.length < 2) return 0;

    let totalDelta = 0;
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      totalDelta += this.frameTimestamps[i] - this.frameTimestamps[i - 1];
    }

    return totalDelta / (this.frameTimestamps.length - 1);
  }

  /**
   * Get memory usage
   */
  getMemoryUsage(): MemoryUsage {
    if (!this.config.enableMemoryTracking || !(performance as any).memory) {
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        usagePercentage: 0,
      };
    }

    const memory = (performance as any).memory;
    const used = memory.usedJSHeapSize;
    const total = memory.totalJSHeapSize;
    const limit = memory.jsHeapSizeLimit;

    return {
      usedJSHeapSize: used,
      totalJSHeapSize: total,
      jsHeapSizeLimit: limit,
      usagePercentage: (used / limit) * 100,
    };
  }

  /**
   * Record latency sample
   */
  recordLatency(value: number): void {
    if (!this.config.enableLatencyTracking) return;

    this.latencySamples.push(value);

    // Keep only last 1000 samples
    if (this.latencySamples.length > 1000) {
      this.latencySamples.shift();
    }
  }

  /**
   * Get latency metrics
   */
  getLatencyMetrics(): LatencyMetrics {
    if (this.latencySamples.length === 0) {
      return {
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Record custom metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.customMetrics.has(name)) {
      this.customMetrics.set(name, []);
    }

    const samples = this.customMetrics.get(name)!;
    samples.push(value);

    // Keep only last 100 samples
    if (samples.length > 100) {
      samples.shift();
    }
  }

  /**
   * Get custom metric
   */
  getMetric(name: string): number | null {
    const samples = this.customMetrics.get(name);
    if (!samples || samples.length === 0) return null;

    // Return average
    const sum = samples.reduce((a, b) => a + b, 0);
    return sum / samples.length;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      fps: this.getCurrentFPS(),
      frameTime: this.getCurrentFrameTime(),
      memoryUsage: this.getMemoryUsage(),
      latency: this.getLatencyMetrics(),
      custom: new Map(
        Array.from(this.customMetrics.entries()).map(([name, samples]) => [
          name,
          samples.reduce((a, b) => a + b, 0) / samples.length,
        ])
      ),
    };
  }

  /**
   * Get metrics history
   */
  getHistory(): MetricSnapshot[] {
    return [...this.history];
  }

  /**
   * Get performance scorecard
   */
  getScorecard(): PerformanceScorecard {
    const current = this.getMetrics();
    const history = this.getHistory();

    // Calculate trends
    const recentFPS = history.slice(-10).map((s) => s.fps);
    const avgFPS = recentFPS.reduce((a, b) => a + b, 0) / recentFPS.length;

    const recentMemory = history.slice(-10).map((s) => s.memory.usagePercentage);
    const avgMemory = recentMemory.reduce((a, b) => a + b, 0) / recentMemory.length;

    return {
      fps: {
        current: current.fps,
        average: avgFPS,
        target: 60,
        status: current.fps >= 55 ? 'good' : current.fps >= 30 ? 'ok' : 'poor',
      },
      memory: {
        current: current.memoryUsage.usagePercentage,
        average: avgMemory,
        target: 80,
        status:
          current.memoryUsage.usagePercentage < 70
            ? 'good'
            : current.memoryUsage.usagePercentage < 90
            ? 'ok'
            : 'poor',
      },
      latency: {
        current: current.latency.avg,
        p95: current.latency.p95,
        p99: current.latency.p99,
        target: 16,
        status: current.latency.p95 < 16 ? 'good' : current.latency.p95 < 50 ? 'ok' : 'poor',
      },
      overall: this.calculateOverallScore(current),
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(metrics: PerformanceMetrics): 'good' | 'ok' | 'poor' {
    const fpsGood = metrics.fps >= 55;
    const memoryGood = metrics.memoryUsage.usagePercentage < 70;
    const latencyGood = metrics.latency.p95 < 16;

    const goodCount = [fpsGood, memoryGood, latencyGood].filter(Boolean).length;

    if (goodCount === 3) return 'good';
    if (goodCount === 2) return 'ok';
    return 'poor';
  }

  /**
   * Increment operation count
   */
  incrementOperation(): void {
    this.operationCount++;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.history = [];
    this.frameTimestamps = [];
    this.latencySamples = [];
    this.customMetrics.clear();
    this.operationCount = 0;
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        history: this.history,
        customMetrics: Array.from(this.customMetrics.entries()),
        latencySamples: this.latencySamples,
      },
      null,
      2
    );
  }

  /**
   * Get metrics summary
   */
  getSummary(): string {
    const scorecard = this.getScorecard();
    const metrics = this.getMetrics();

    return `
Performance Summary:
==================
FPS: ${metrics.fps.toFixed(1)} (avg: ${scorecard.fps.average.toFixed(1)})
Frame Time: ${metrics.frameTime.toFixed(2)}ms
Memory: ${metrics.memoryUsage.usagePercentage.toFixed(1)}%
Latency: ${metrics.latency.avg.toFixed(2)}ms (p95: ${metrics.latency.p95.toFixed(2)}ms)
Overall Status: ${scorecard.overall.toUpperCase()}
    `.trim();
  }
}

export interface PerformanceScorecard {
  fps: {
    current: number;
    average: number;
    target: number;
    status: 'good' | 'ok' | 'poor';
  };
  memory: {
    current: number;
    average: number;
    target: number;
    status: 'good' | 'ok' | 'poor';
  };
  latency: {
    current: number;
    p95: number;
    p99: number;
    target: number;
    status: 'good' | 'ok' | 'poor';
  };
  overall: 'good' | 'ok' | 'poor';
}

/**
 * Utility class for timing operations
 */
export class OperationTimer {
  private collector: MetricsCollector;
  private operationName: string;
  private startTime: number;

  constructor(collector: MetricsCollector, operationName: string) {
    this.collector = collector;
    this.operationName = operationName;
    this.startTime = performance.now();
  }

  /**
   * End timing and record metric
   */
  end(): number {
    const duration = performance.now() - this.startTime;
    this.collector.recordMetric(this.operationName, duration);
    this.collector.recordLatency(duration);
    this.collector.incrementOperation();
    return duration;
  }

  /**
   * End timing with custom value
   */
  endWithValue(value: number): void {
    this.collector.recordMetric(this.operationName, value);
    this.collector.recordLatency(value);
    this.collector.incrementOperation();
  }
}

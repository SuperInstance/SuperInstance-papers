/**
 * Performance Monitor
 *
 * Monitors and tracks application performance metrics
 */

import {
  PerformanceMetrics,
  PerformanceReport,
  CellUpdateMetrics,
  PerformanceIssue,
  OptimizationRecommendation,
  PerformanceThresholds
} from './types';

/**
 * Default performance thresholds
 */
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  targetCellUpdateLatency: 50, // Target: <50ms
  maxCellUpdateLatency: 100, // Max acceptable: <100ms
  targetFrameRate: 60, // Target: 60 FPS
  minFrameRate: 30, // Min acceptable: 30 FPS
  maxMemoryUsage: 500, // Max: 500MB
  maxBundleSize: 2000 // Max: 2000KB
};

/**
 * Performance Monitor Class
 */
export class PerformanceMonitor {
  private _metrics: PerformanceMetrics[] = [];
  private _cellUpdates: CellUpdateMetrics[] = [];
  private _thresholds: PerformanceThresholds;
  private _isMonitoring = false;
  private _monitoringInterval: NodeJS.Timeout | null = null;
  private _maxMetrics = 1000; // Keep last 1000 metrics

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this._thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Start monitoring performance
   */
  startMonitoring(interval = 1000): void {
    if (this._isMonitoring) {
      return;
    }

    this._isMonitoring = true;
    this._monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, interval);
  }

  /**
   * Stop monitoring performance
   */
  stopMonitoring(): void {
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
      this._monitoringInterval = null;
    }
    this._isMonitoring = false;
  }

  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      cellUpdateLatency: this.getAverageCellUpdateLatency(),
      frameRate: this.measureFrameRate(),
      memoryUsage: this.measureMemoryUsage(),
      cpuUsage: this.measureCpuUsage(),
      networkLatency: this.measureNetworkLatency(),
      bundleSize: this.measureBundleSize(),
      timestamp: Date.now()
    };

    this._metrics.push(metrics);

    // Keep only recent metrics
    if (this._metrics.length > this._maxMetrics) {
      this._metrics = this._metrics.slice(-this._maxMetrics);
    }
  }

  /**
   * Record cell update metrics
   */
  recordCellUpdate(metrics: CellUpdateMetrics): void {
    this._cellUpdates.push(metrics);

    // Keep only recent updates
    if (this._cellUpdates.length > this._maxMetrics) {
      this._cellUpdates = this._cellUpdates.slice(-this._maxMetrics);
    }
  }

  /**
   * Get average cell update latency
   */
  private getAverageCellUpdateLatency(): number {
    if (this._cellUpdates.length === 0) {
      return 0;
    }

    const recent = this._cellUpdates.slice(-100); // Last 100 updates
    const sum = recent.reduce((acc, m) => acc + m.duration, 0);
    return sum / recent.length;
  }

  /**
   * Measure frame rate
   */
  private measureFrameRate(): number {
    if (typeof window === 'undefined') {
      return 60;
    }

    // Use requestAnimationFrame to measure FPS
    let frames = 0;
    let start = performance.now();
    let fps = 60;

    const measureFrame = () => {
      frames++;
      const elapsed = performance.now() - start;

      if (elapsed >= 1000) {
        fps = Math.round((frames * 1000) / elapsed);
        frames = 0;
        start = performance.now();
      }

      if (this._isMonitoring) {
        requestAnimationFrame(measureFrame);
      }
    };

    requestAnimationFrame(measureFrame);
    return fps;
  }

  /**
   * Measure memory usage
   */
  private measureMemoryUsage(): number {
    if (typeof performance === 'undefined' || !(performance as any).memory) {
      return 0;
    }

    const memory = (performance as any).memory;
    return Math.round(memory.usedJSHeapSize / 1024 / 1024); // Convert to MB
  }

  /**
   * Measure CPU usage (approximation)
   */
  private measureCpuUsage(): number {
    // CPU usage is not directly measurable in browsers
    // This is a placeholder for future implementation
    return 0;
  }

  /**
   * Measure network latency
   */
  private measureNetworkLatency(): number {
    if (typeof navigator === 'undefined' || !(navigator as any).connection) {
      return 0;
    }

    const connection = (navigator as any).connection;
    return connection.rtt || 0;
  }

  /**
   * Measure bundle size
   */
  private measureBundleSize(): number {
    if (typeof performance === 'undefined') {
      return 0;
    }

    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsEntries = entries.filter(entry => entry.name.endsWith('.js'));
    const totalSize = jsEntries.reduce((acc, entry) => acc + (entry.transferSize || 0), 0);
    return Math.round(totalSize / 1024); // Convert to KB
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this._metrics[this._metrics.length - 1] || null;
  }

  /**
   * Get performance report
   */
  getReport(timeWindow = 60000): PerformanceReport {
    const now = Date.now();
    const windowStart = now - timeWindow;

    // Filter metrics within time window
    const windowMetrics = this._metrics.filter(m => m.timestamp >= windowStart);

    if (windowMetrics.length === 0) {
      return this.createEmptyReport(now, timeWindow);
    }

    // Calculate averages
    const averages = this.calculateAverages(windowMetrics);

    // Calculate peaks
    const peaks = this.calculatePeaks(windowMetrics);

    // Calculate P95
    const p95 = this.calculateP95(windowMetrics);

    // Detect issues
    const issues = this.detectIssues(averages, peaks);

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues);

    return {
      id: `report-${now}`,
      timestamp: now,
      timeWindow: { start: windowStart, end: now },
      averages,
      peaks,
      p95,
      cellUpdates: this._cellUpdates.filter(cu => cu.endTime >= windowStart),
      issues,
      recommendations
    };
  }

  /**
   * Calculate average metrics
   */
  private calculateAverages(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const sum = metrics.reduce(
      (acc, m) => ({
        cellUpdateLatency: acc.cellUpdateLatency + m.cellUpdateLatency,
        frameRate: acc.frameRate + m.frameRate,
        memoryUsage: acc.memoryUsage + m.memoryUsage,
        cpuUsage: acc.cpuUsage + m.cpuUsage,
        networkLatency: acc.networkLatency + m.networkLatency,
        bundleSize: acc.bundleSize + m.bundleSize,
        timestamp: acc.timestamp + m.timestamp
      }),
      {
        cellUpdateLatency: 0,
        frameRate: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        networkLatency: 0,
        bundleSize: 0,
        timestamp: 0
      }
    );

    const count = metrics.length;
    return {
      cellUpdateLatency: sum.cellUpdateLatency / count,
      frameRate: sum.frameRate / count,
      memoryUsage: sum.memoryUsage / count,
      cpuUsage: sum.cpuUsage / count,
      networkLatency: sum.networkLatency / count,
      bundleSize: sum.bundleSize / count,
      timestamp: sum.timestamp / count
    };
  }

  /**
   * Calculate peak metrics
   */
  private calculatePeaks(metrics: PerformanceMetrics[]): PerformanceMetrics {
    return metrics.reduce(
      (max, m) => ({
        cellUpdateLatency: Math.max(max.cellUpdateLatency, m.cellUpdateLatency),
        frameRate: Math.max(max.frameRate, m.frameRate),
        memoryUsage: Math.max(max.memoryUsage, m.memoryUsage),
        cpuUsage: Math.max(max.cpuUsage, m.cpuUsage),
        networkLatency: Math.max(max.networkLatency, m.networkLatency),
        bundleSize: Math.max(max.bundleSize, m.bundleSize),
        timestamp: Math.max(max.timestamp, m.timestamp)
      }),
      metrics[0]
    );
  }

  /**
   * Calculate P95 metrics
   */
  private calculateP95(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const sorted = [...metrics].sort((a, b) => a.timestamp - b.timestamp);
    const p95Index = Math.floor(sorted.length * 0.95);

    return sorted[p95Index] || sorted[sorted.length - 1];
  }

  /**
   * Detect performance issues
   */
  private detectIssues(
    averages: PerformanceMetrics,
    peaks: PerformanceMetrics
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Check cell update latency
    if (averages.cellUpdateLatency > this._thresholds.maxCellUpdateLatency) {
      issues.push({
        severity: 'high',
        type: 'latency',
        description: `Cell update latency (${averages.cellUpdateLatency.toFixed(2)}ms) exceeds threshold`,
        component: 'cell-updates',
        currentValue: averages.cellUpdateLatency,
        threshold: this._thresholds.maxCellUpdateLatency,
        impact: 'Sluggish user interface, delayed feedback'
      });
    } else if (averages.cellUpdateLatency > this._thresholds.targetCellUpdateLatency) {
      issues.push({
        severity: 'medium',
        type: 'latency',
        description: `Cell update latency (${averages.cellUpdateLatency.toFixed(2)}ms) above target`,
        component: 'cell-updates',
        currentValue: averages.cellUpdateLatency,
        threshold: this._thresholds.targetCellUpdateLatency,
        impact: 'Noticeable delay in cell updates'
      });
    }

    // Check frame rate
    if (averages.frameRate < this._thresholds.minFrameRate) {
      issues.push({
        severity: 'high',
        type: 'cpu',
        description: `Frame rate (${averages.frameRate} FPS) below minimum`,
        component: 'rendering',
        currentValue: averages.frameRate,
        threshold: this._thresholds.minFrameRate,
        impact: 'Janky animations, poor UX'
      });
    }

    // Check memory usage
    if (averages.memoryUsage > this._thresholds.maxMemoryUsage) {
      issues.push({
        severity: 'critical',
        type: 'memory',
        description: `Memory usage (${averages.memoryUsage} MB) exceeds threshold`,
        component: 'memory',
        currentValue: averages.memoryUsage,
        threshold: this._thresholds.maxMemoryUsage,
        impact: 'Risk of browser crash, tab freeze'
      });
    }

    // Check bundle size
    if (averages.bundleSize > this._thresholds.maxBundleSize) {
      issues.push({
        severity: 'medium',
        type: 'bundle',
        description: `Bundle size (${averages.bundleSize} KB) exceeds threshold`,
        component: 'bundle',
        currentValue: averages.bundleSize,
        threshold: this._thresholds.maxBundleSize,
        impact: 'Slow initial load time'
      });
    }

    return issues;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(issues: PerformanceIssue[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    for (const issue of issues) {
      switch (issue.type) {
        case 'latency':
          recommendations.push({
            priority: issue.severity === 'high' ? 'high' : 'medium',
            type: 'batch',
            description: 'Implement batch cell updates to reduce overhead',
            expectedImprovement: {
              metric: 'cellUpdateLatency',
              improvement: '30-50% reduction'
            },
            effort: 'medium',
            hint: 'Use CellUpdateOptimizer for automatic batching'
          });
          break;

        case 'memory':
          recommendations.push({
            priority: 'high',
            type: 'lazy-load',
            description: 'Lazy load components to reduce initial memory footprint',
            expectedImprovement: {
              metric: 'memoryUsage',
              improvement: '40-60% reduction'
            },
            effort: 'low',
            hint: 'Use React.lazy() and Suspense for component splitting'
          });
          break;

        case 'cpu':
          recommendations.push({
            priority: 'medium',
            type: 'virtual-scroll',
            description: 'Implement virtual scrolling for large cell lists',
            expectedImprovement: {
              metric: 'frameRate',
              improvement: '20-40 FPS increase'
            },
            effort: 'medium',
            hint: 'Use react-window or react-virtualized'
          });
          break;

        case 'bundle':
          recommendations.push({
            priority: 'medium',
            type: 'code-split',
            description: 'Split code into smaller chunks for on-demand loading',
            expectedImprovement: {
              metric: 'bundleSize',
              improvement: '50-70% reduction'
            },
            effort: 'high',
            hint: 'Use dynamic imports and webpack chunk splitting'
          });
          break;
      }
    }

    return recommendations;
  }

  /**
   * Create empty report
   */
  private createEmptyReport(timestamp: number, timeWindow: number): PerformanceReport {
    return {
      id: `report-${timestamp}`,
      timestamp,
      timeWindow: { start: timestamp - timeWindow, end: timestamp },
      averages: {
        cellUpdateLatency: 0,
        frameRate: 60,
        memoryUsage: 0,
        cpuUsage: 0,
        networkLatency: 0,
        bundleSize: 0,
        timestamp
      },
      peaks: {
        cellUpdateLatency: 0,
        frameRate: 60,
        memoryUsage: 0,
        cpuUsage: 0,
        networkLatency: 0,
        bundleSize: 0,
        timestamp
      },
      p95: {
        cellUpdateLatency: 0,
        frameRate: 60,
        memoryUsage: 0,
        cpuUsage: 0,
        networkLatency: 0,
        bundleSize: 0,
        timestamp
      },
      cellUpdates: [],
      issues: [],
      recommendations: []
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this._metrics = [];
    this._cellUpdates = [];
  }

  /**
   * Dispose of monitor
   */
  dispose(): void {
    this.stopMonitoring();
    this.clearMetrics();
  }
}

/**
 * Create a performance monitor instance
 */
export function createPerformanceMonitor(
  thresholds?: Partial<PerformanceThresholds>
): PerformanceMonitor {
  return new PerformanceMonitor(thresholds);
}

// Singleton instance
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get global performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Reset global performance monitor
 */
export function resetPerformanceMonitor(): void {
  if (globalMonitor) {
    globalMonitor.dispose();
    globalMonitor = null;
  }
}

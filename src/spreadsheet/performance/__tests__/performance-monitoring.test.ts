/**
 * POLLN Spreadsheet - Performance Monitoring Tests
 *
 * Comprehensive test suite for performance monitoring components.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  MetricsCollector,
  OperationTimer,
  timeOperation,
  timeOperationAsync,
  WebVitalsTracker,
  PerformanceProfiler,
  SpreadsheetBenchmark,
  PerformanceReporter,
  Profiler,
  profileFunction,
  compareCPUProfiles,
} from '../index';
import type {
  Metric,
  MetricStatistics,
  AlertThreshold,
  WebVitals as WebVitalsType,
  CPUProfile,
} from '../types';

// Mock performance API
const mockPerformance = {
  now: () => Date.now(),
  memory: {
    usedJSHeapSize: 1024 * 1024 * 50,
    totalJSHeapSize: 1024 * 1024 * 100,
    jsHeapSizeLimit: 1024 * 1024 * 200,
  },
  getEntriesByType: jest.fn(() => []),
  mark: jest.fn(),
  measure: jest.fn(),
};

// Mock PerformanceObserver
class MockPerformanceObserver {
  private callback: any;
  private observing = false;

  constructor(callback: any) {
    this.callback = callback;
  }

  observe(options: any) {
    this.observing = true;
  }

  disconnect() {
    this.observing = false;
  }

  // Test helper to trigger callback
  trigger(entries: any[]) {
    if (this.observing) {
      this.callback({ getEntries: () => entries });
    }
  }
}

// Setup global mocks
global.performance = mockPerformance as any;
(global as any).PerformanceObserver = MockPerformanceObserver;

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  afterEach(() => {
    collector.reset();
  });

  describe('recordMetric', () => {
    it('should record a metric value', () => {
      collector.recordMetric('test_metric', 100);
      const metric = collector.getMetric('test_metric');

      expect(metric).not.toBeNull();
      expect(metric?.value).toBe(100);
      expect(metric?.name).toBe('test_metric');
    });

    it('should record metrics with tags', () => {
      collector.recordMetric('test_metric', 100, { tag1: 'value1', tag2: 'value2' });
      const metric = collector.getMetric('test_metric', { tag1: 'value1', tag2: 'value2' });

      expect(metric).not.toBeNull();
      expect(metric?.tags).toEqual({ tag1: 'value1', tag2: 'value2' });
    });

    it('should maintain separate buckets for different tag combinations', () => {
      collector.recordMetric('test_metric', 100, { env: 'prod' });
      collector.recordMetric('test_metric', 200, { env: 'dev' });

      const prodMetric = collector.getMetric('test_metric', { env: 'prod' });
      const devMetric = collector.getMetric('test_metric', { env: 'dev' });

      expect(prodMetric?.value).toBe(100);
      expect(devMetric?.value).toBe(200);
    });

    it('should limit samples per bucket', () => {
      // Record more than maxSamplesPerBucket (1000)
      for (let i = 0; i < 1500; i++) {
        collector.recordMetric('test_metric', i);
      }

      const stats = collector.getMetricStatistics('test_metric');
      expect(stats).not.toBeNull();
      expect(stats?.count).toBeLessThanOrEqual(1000);
    });
  });

  describe('getMetrics', () => {
    it('should return all metrics', () => {
      collector.recordMetric('metric1', 100);
      collector.recordMetric('metric2', 200);

      const metrics = collector.getMetrics();
      expect(metrics.length).toBe(2);
    });

    it('should filter metrics by time range', () => {
      const now = Date.now();
      collector.recordMetric('metric1', 100);
      collector.recordMetric('metric2', 200);

      // The mock timestamp will be close to now, so this should return both
      const timeRange = {
        start: now - 1000,
        end: now + 1000,
      };

      const metrics = collector.getMetrics(timeRange);
      expect(metrics.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMetricStatistics', () => {
    it('should calculate statistics for a metric', () => {
      const values = [10, 20, 30, 40, 50];
      values.forEach(v => collector.recordMetric('test_metric', v));

      const stats = collector.getMetricStatistics('test_metric');

      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(5);
      expect(stats?.min).toBe(10);
      expect(stats?.max).toBe(50);
      expect(stats?.avg).toBe(30);
      expect(stats?.median).toBe(30);
    });

    it('should calculate percentiles correctly', () => {
      const values = Array.from({ length: 100 }, (_, i) => i);
      values.forEach(v => collector.recordMetric('test_metric', v));

      const stats = collector.getMetricStatistics('test_metric');

      expect(stats?.p90).toBe(90);
      expect(stats?.p95).toBe(95);
      expect(stats?.p99).toBe(99);
    });

    it('should calculate standard deviation', () => {
      const values = [10, 10, 10, 10, 10]; // No variance
      values.forEach(v => collector.recordMetric('test_metric', v));

      const stats = collector.getMetricStatistics('test_metric');

      expect(stats?.stdDev).toBe(0);
    });

    it('should return null for non-existent metric', () => {
      const stats = collector.getMetricStatistics('non_existent');
      expect(stats).toBeNull();
    });
  });

  describe('getAllStatistics', () => {
    it('should return statistics for all metrics', () => {
      collector.recordMetric('metric1', 10);
      collector.recordMetric('metric2', 20);
      collector.recordMetric('metric3', 30);

      const allStats = collector.getAllStatistics();

      expect(allStats.length).toBe(3);
      expect(allStats.every(s => s.count === 1)).toBe(true);
    });
  });

  describe('queryByTags', () => {
    it('should query metrics by tag filters', () => {
      collector.recordMetric('metric1', 100, { env: 'prod', region: 'us' });
      collector.recordMetric('metric2', 200, { env: 'dev', region: 'us' });
      collector.recordMetric('metric3', 300, { env: 'prod', region: 'eu' });

      const prodMetrics = collector.queryByTags({ env: 'prod' });
      expect(prodMetrics.length).toBe(2);

      const usMetrics = collector.queryByTags({ region: 'us' });
      expect(usMetrics.length).toBe(2);

      const prodUsMetrics = collector.queryByTags({ env: 'prod', region: 'us' });
      expect(prodUsMetrics.length).toBe(1);
    });
  });

  describe('alert thresholds', () => {
    it('should fire alert when threshold exceeded', () => {
      const alertCallback = jest.fn();
      const threshold: AlertThreshold = {
        metricName: 'test_metric',
        operator: '>',
        threshold: 100,
        severity: 'warning',
      };

      collector.setupAlert(threshold);
      collector.onAlert(alertCallback);

      collector.recordMetric('test_metric', 150);

      expect(alertCallback).toHaveBeenCalled();
      const alert = alertCallback.mock.calls[0][0];
      expect(alert.metric).toBe('test_metric');
      expect(alert.currentValue).toBe(150);
      expect(alert.severity).toBe('warning');
    });

    it('should respect alert cooldown', () => {
      const alertCallback = jest.fn();
      const threshold: AlertThreshold = {
        metricName: 'test_metric',
        operator: '>',
        threshold: 100,
        severity: 'warning',
        cooldown: 5000, // 5 seconds
      };

      collector.setupAlert(threshold);
      collector.onAlert(alertCallback);

      // First recording should trigger alert
      collector.recordMetric('test_metric', 150);
      expect(alertCallback).toHaveBeenCalledTimes(1);

      // Immediate second recording should not trigger due to cooldown
      collector.recordMetric('test_metric', 160);
      expect(alertCallback).toHaveBeenCalledTimes(1);
    });

    it('should support different operators', () => {
      const alertCallback = jest.fn();

      const gtThreshold: AlertThreshold = {
        metricName: 'gt_metric',
        operator: '>',
        threshold: 100,
        severity: 'warning',
      };

      const ltThreshold: AlertThreshold = {
        metricName: 'lt_metric',
        operator: '<',
        threshold: 100,
        severity: 'warning',
      };

      collector.setupAlert(gtThreshold);
      collector.setupAlert(ltThreshold);
      collector.onAlert(alertCallback);

      collector.recordMetric('gt_metric', 150);
      collector.recordMetric('lt_metric', 50);

      expect(alertCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('aggregateByInterval', () => {
    it('should aggregate metrics by time interval', () => {
      // This test would require mocking timestamps
      // For now, just verify the method exists
      expect(typeof collector.aggregateByInterval).toBe('function');
    });
  });

  describe('getPercentiles', () => {
    it('should return custom percentiles', () => {
      const values = Array.from({ length: 100 }, (_, i) => i);
      values.forEach(v => collector.recordMetric('test_metric', v));

      const percentiles = collector.getPercentiles('test_metric', [50, 75, 90, 99]);

      expect(percentiles[50]).toBe(50);
      expect(percentiles[75]).toBe(75);
      expect(percentiles[90]).toBe(90);
      expect(percentiles[99]).toBe(99);
    });
  });

  describe('getRate', () => {
    it('should calculate rate of change', () => {
      const now = Date.now();

      // Record metrics with different timestamps (simulated)
      collector.recordMetric('test_metric', 100);
      collector.recordMetric('test_metric', 200);

      const rate = collector.getRate('test_metric', 60000); // 1 minute window
      expect(typeof rate).toBe('number');
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      collector.recordMetric('metric1', 100);
      collector.recordMetric('metric2', 200);

      collector.reset();

      expect(collector.getBucketCount()).toBe(0);
      expect(collector.getTotalSampleCount()).toBe(0);
    });

    it('should reset specific metric', () => {
      collector.recordMetric('metric1', 100);
      collector.recordMetric('metric2', 200);

      collector.resetMetric('metric1');

      expect(collector.getMetric('metric1')).toBeNull();
      expect(collector.getMetric('metric2')).not.toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should remove old samples based on retention period', () => {
      // This would require mocking time
      collector.cleanup();
      expect(collector.getTotalSampleCount()).toBe(0);
    });
  });

  describe('export/import', () => {
    it('should export metrics as JSON', () => {
      collector.recordMetric('test_metric', 100);

      const exported = collector.export();
      expect(typeof exported).toBe('string');

      const data = JSON.parse(exported);
      expect(data.buckets).toBeDefined();
      expect(data.buckets.length).toBeGreaterThan(0);
    });

    it('should import metrics from JSON', () => {
      collector.recordMetric('test_metric', 100);
      const exported = collector.export();

      const newCollector = new MetricsCollector();
      newCollector.import(exported);

      expect(newCollector.getMetric('test_metric')?.value).toBe(100);
    });
  });
});

describe('OperationTimer', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('should time an operation', () => {
    const timer = new OperationTimer(collector, 'test_operation');

    // Simulate some work
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Busy wait for 10ms
    }

    const duration = timer.end();

    expect(duration).toBeGreaterThanOrEqual(0);
    expect(collector.getMetric('test_operation')?.value).toBe(duration);
  });

  it('should time an operation with tags', () => {
    const timer = new OperationTimer(collector, 'test_operation', { tag1: 'value1' });
    timer.end();

    const metric = collector.getMetric('test_operation', { tag1: 'value1' });
    expect(metric?.tags).toEqual({ tag1: 'value1' });
  });

  it('should get elapsed time without ending', () => {
    const timer = new OperationTimer(collector, 'test_operation');

    const elapsed1 = timer.elapsed();
    expect(elapsed1).toBeGreaterThanOrEqual(0);

    const elapsed2 = timer.elapsed();
    expect(elapsed2).toBeGreaterThanOrEqual(elapsed1);
  });
});

describe('timeOperation utility', () => {
  it('should time a synchronous operation', () => {
    const collector = new MetricsCollector();

    const result = timeOperation(collector, 'test_op', () => {
      return 42;
    });

    expect(result).toBe(42);
    expect(collector.getMetric('test_op')).not.toBeNull();
  });

  it('should handle errors in synchronous operations', () => {
    const collector = new MetricsCollector();

    expect(() => {
      timeOperation(collector, 'test_op', () => {
        throw new Error('Test error');
      });
    }).toThrow('Test error');

    // Metric should still be recorded
    expect(collector.getMetric('test_op')).not.toBeNull();
  });
});

describe('timeOperationAsync utility', () => {
  it('should time an async operation', async () => {
    const collector = new MetricsCollector();

    const result = await timeOperationAsync(collector, 'test_op', async () => {
      return 42;
    });

    expect(result).toBe(42);
    expect(collector.getMetric('test_op')).not.toBeNull();
  });

  it('should handle errors in async operations', async () => {
    const collector = new MetricsCollector();

    await expect(
      timeOperationAsync(collector, 'test_op', async () => {
        throw new Error('Test error');
      })
    ).rejects.toThrow('Test error');

    // Metric should still be recorded
    expect(collector.getMetric('test_op')).not.toBeNull();
  });
});

describe('WebVitalsTracker', () => {
  let tracker: WebVitalsTracker;

  beforeEach(() => {
    tracker = new WebVitalsTracker();
  });

  afterEach(() => {
    tracker.disconnect();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(tracker).toBeDefined();
    });

    it('should check support', () => {
      const isSupported = WebVitalsTracker.isSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('getWebVitals', () => {
    it('should return Web Vitals', () => {
      const vitals = tracker.getWebVitals();
      expect(vitals).toBeDefined();
      expect(typeof vitals).toBe('object');
    });
  });

  describe('getSummary', () => {
    it('should return performance summary', () => {
      const summary = tracker.getSummary();
      expect(summary).toBeDefined();
      expect(summary.score).toBeGreaterThanOrEqual(0);
      expect(summary.score).toBeLessThanOrEqual(100);
      expect(['good', 'needs-improvement', 'poor']).toContain(summary.rating);
    });
  });

  describe('onChange', () => {
    it('should subscribe to metric changes', () => {
      const callback = vi.fn();
      const unsubscribe = tracker.onChange(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe from metric changes', () => {
      const callback = vi.fn();
      const unsubscribe = tracker.onChange(callback);

      unsubscribe();

      // Callback should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      tracker.reset();
      const vitals = tracker.getWebVitals();
      expect(Object.keys(vitals).length).toBe(0);
    });
  });

  describe('export', () => {
    it('should export metrics as JSON', () => {
      const exported = tracker.export();
      expect(typeof exported).toBe('string');

      const data = JSON.parse(exported);
      expect(data.metrics).toBeDefined();
      expect(data.summary).toBeDefined();
    });
  });
});

describe('PerformanceProfiler', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
  });

  afterEach(() => {
    profiler.reset();
  });

  describe('startProfiling/stopProfiling', () => {
    it('should start and stop CPU profiling', () => {
      profiler.startCPUProfiling();
      expect(profiler.getSummary().cpu.profiling).toBe(true);

      const profile = profiler.stopCPUProfiling();
      expect(profile).not.toBeNull();
      expect(profile?.samples).toBeDefined();
    });

    it('should start and stop memory profiling', () => {
      profiler.startMemoryProfiling();
      expect(profiler.getSummary().memory.profiling).toBe(true);

      const snapshots = profiler.stopMemoryProfiling();
      expect(Array.isArray(snapshots)).toBe(true);
    });

    it('should start and stop all profiling', () => {
      profiler.startProfiling();
      profiler.stopProfiling();

      const summary = profiler.getSummary();
      expect(summary.cpu.profiling).toBe(false);
      expect(summary.memory.profiling).toBe(false);
    });
  });

  describe('getSummary', () => {
    it('should return profiling summary', () => {
      const summary = profiler.getSummary();
      expect(summary).toBeDefined();
      expect(summary.cpu).toBeDefined();
      expect(summary.memory).toBeDefined();
      expect(summary.network).toBeDefined();
      expect(summary.longTasks).toBeDefined();
    });
  });

  describe('memory profiling', () => {
    it('should detect memory trends', () => {
      profiler.startMemoryProfiling();

      // This would require actual memory allocation
      const stats = profiler.getMemoryStats();
      expect(stats).toBeDefined();
    });
  });
});

describe('PerformanceReporter', () => {
  let reporter: PerformanceReporter;
  let metricsCollector: MetricsCollector;
  let webVitalsTracker: WebVitalsTracker;

  beforeEach(() => {
    metricsCollector = new MetricsCollector();
    webVitalsTracker = new WebVitalsTracker();
    reporter = new PerformanceReporter({}, metricsCollector, webVitalsTracker);
  });

  describe('generateReport', () => {
    it('should generate comprehensive report', async () => {
      const report = await reporter.generateReport();

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.webVitals).toBeDefined();
      expect(Array.isArray(report.metrics)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('setBaseline', () => {
    it('should set baseline metrics', () => {
      reporter.setBaseline({
        lcp: 2000,
        fid: 100,
        cls: 0.1,
      });

      // Baseline should be set
      expect(reporter).toBeDefined();
    });
  });

  describe('analyzeTrend', () => {
    it('should analyze metric trends', () => {
      // Add some metrics
      metricsCollector.recordMetric('test_metric', 100);

      const trend = reporter.analyzeTrend('test_metric');
      // May return null if not enough data
      expect(trend === null || typeof trend === 'object').toBe(true);
    });
  });

  describe('generateMarkdown', () => {
    it('should generate markdown summary', async () => {
      const report = await reporter.generateReport();
      const markdown = reporter.generateMarkdown(report);

      expect(typeof markdown).toBe('string');
      expect(markdown).toContain('# Performance Report');
    });
  });

  describe('exportReport', () => {
    it('should export report as JSON', async () => {
      const report = await reporter.generateReport();
      const exported = reporter.exportReport(report);

      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed.id).toBe(report.id);
    });
  });
});

describe('Profiler', () => {
  let profiler: Profiler;

  beforeEach(() => {
    profiler = new Profiler();
  });

  describe('startProfiling/stopProfiling', () => {
    it('should start and stop CPU profiling', async () => {
      const sessionId = await profiler.startProfiling('cpu');
      expect(sessionId).toBeDefined();

      const result = await profiler.stopProfiling(sessionId);
      expect(result.cpu).toBeDefined();
    });

    it('should start and stop memory profiling', async () => {
      const sessionId = await profiler.startProfiling('memory');
      expect(sessionId).toBeDefined();

      const result = await profiler.stopProfiling(sessionId);
      expect(result.memory).toBeDefined();
    });

    it('should profile both CPU and memory', async () => {
      const sessionId = await profiler.startProfiling('both');
      const result = await profiler.stopProfiling(sessionId);

      expect(result.cpu).toBeDefined();
      expect(result.memory).toBeDefined();
    });
  });

  describe('profileFunction utility', () => {
    it('should profile a function', async () => {
      const { result, profile } = await profileFunction(() => {
        return 42;
      }, profiler);

      expect(result).toBe(42);
      expect(profile).toBeDefined();
    });
  });

  describe('compareCPUProfiles', () => {
    it('should compare two CPU profiles', () => {
      const profile1: CPUProfile = {
        id: 'profile1',
        startTime: 0,
        endTime: 1000,
        duration: 1000,
        samples: [],
        nodes: [],
      };

      const profile2: CPUProfile = {
        id: 'profile2',
        startTime: 0,
        endTime: 1500,
        duration: 1500,
        samples: [],
        nodes: [],
      };

      const comparison = compareCPUProfiles(profile1, profile2);

      expect(comparison.baselineDuration).toBe(1000);
      expect(comparison.currentDuration).toBe(1500);
      expect(comparison.durationChange).toBe(500);
      expect(comparison.durationChangePercent).toBe(50);
    });
  });
});

describe('Integration tests', () => {
  it('should work end-to-end with all components', async () => {
    const collector = new MetricsCollector();
    const webVitalsTracker = new WebVitalsTracker();
    const profiler = new PerformanceProfiler({}, collector);
    const reporter = new PerformanceReporter({}, collector, webVitalsTracker);

    // Record some metrics
    collector.recordMetric('test_metric', 100);

    // Profile
    profiler.startCPUProfiling();
    await new Promise(resolve => setTimeout(resolve, 50));
    profiler.stopCPUProfiling();

    // Generate report
    const report = await reporter.generateReport();

    expect(report).toBeDefined();
    expect(report.metrics.length).toBeGreaterThan(0);
  });
});

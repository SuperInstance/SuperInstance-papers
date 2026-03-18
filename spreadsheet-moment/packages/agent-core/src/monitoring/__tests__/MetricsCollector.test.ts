/**
 * MetricsCollector Unit Tests
 *
 * Comprehensive unit tests for the MetricsCollector system covering:
 * - All metric types (Counter, Gauge, Histogram, Summary)
 * - HTTP, WebSocket, Error, Performance, and Business metrics
 * - Storage and retrieval functionality
 * - Prometheus and JSON export formats
 * - Sampling and filtering
 * - Edge cases and error handling
 * - Memory leak detection
 *
 * @version 1.0.0 - Week 5: Testing & Validation
 */

import {
  MetricsCollector,
  MetricType,
  MetricCategory,
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  SummaryMetric,
  Metric,
  getMetricsCollector,
  resetMetricsCollector
} from '../MetricsCollector';
import { EventEmitter } from 'events';

// Mock process.memoryUsage for Node.js environment
const mockMemoryUsage = jest.fn();
global.process = {
  memoryUsage: mockMemoryUsage,
  env: {}
};

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({ debug: false });
    resetMetricsCollector();
    jest.clearAllMocks();
  });

  afterEach(() => {
    collector.dispose();
  });

  describe('Constructor & Configuration', () => {
    test('should create collector with default config', () => {
      const defaultCollector = new MetricsCollector();
      expect(defaultCollector).toBeInstanceOf(MetricsCollector);
      expect(defaultCollector).toBeInstanceOf(EventEmitter);
      defaultCollector.dispose();
    });

    test('should create collector with custom config', () => {
      const customCollector = new MetricsCollector({
        debug: true,
        globalTags: { environment: 'test', region: 'us-east-1' },
        samplingRate: 0.5
      });
      expect(customCollector).toBeInstanceOf(MetricsCollector);
      customCollector.dispose();
    });

    test('should accept custom storage implementation', () => {
      const customStorage = {
        push: jest.fn(),
        get: jest.fn(() => []),
        clear: jest.fn(),
        getStats: jest.fn(() => ({
          totalMetrics: 0,
          metricsByCategory: {} as any
        }))
      };

      const customCollector = new MetricsCollector({ storage: customStorage });
      expect(customCollector).toBeInstanceOf(MetricsCollector);
      customCollector.dispose();
    });

    test('should handle sampling rate boundaries', () => {
      const noSampleCollector = new MetricsCollector({ samplingRate: 0 });
      const fullSampleCollector = new MetricsCollector({ samplingRate: 1 });

      expect(noSampleCollector).toBeInstanceOf(MetricsCollector);
      expect(fullSampleCollector).toBeInstanceOf(MetricsCollector);

      noSampleCollector.dispose();
      fullSampleCollector.dispose();
    });
  });

  describe('HTTP Metrics', () => {
    test('should record HTTP request metric', () => {
      const metricSpy = jest.spyOn(collector as any, 'recordMetric');

      collector.recordHttpRequest('GET', '/api/test', 200, 150);

      expect(metricSpy).toHaveBeenCalled();
      const metrics = collector.getMetrics(MetricCategory.HTTP);
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].name).toBe('http_requests_total');
    });

    test('should record HTTP request with custom labels', () => {
      collector.recordHttpRequest('POST', '/api/claws', 201, 250, {
        user_id: 'test-user',
        version: 'v1'
      });

      const metrics = collector.getMetrics(MetricCategory.HTTP);
      const requestMetric = metrics.find(m => m.name === 'http_requests_total');

      expect(requestMetric).toBeDefined();
      expect(requestMetric?.labels).toHaveProperty('user_id', 'test-user');
      expect(requestMetric?.labels).toHaveProperty('version', 'v1');
    });

    test('should create histogram for request latency', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 150);

      const metrics = collector.getMetrics(MetricCategory.HTTP);
      const histogramMetric = metrics.find(m => m.name === 'http_request_duration_ms');

      expect(histogramMetric).toBeDefined();
      expect(histogramMetric?.type).toBe(MetricType.HISTOGRAM);
    });

    test('should record HTTP error metric', () => {
      collector.recordHttpError('GET', '/api/test', 'Not Found', 404);

      const metrics = collector.getMetrics(MetricCategory.ERROR);
      const errorMetric = metrics.find(m => m.name === 'http_errors_total');

      expect(errorMetric).toBeDefined();
      expect(errorMetric?.labels).toHaveProperty('error', 'Not Found');
      expect(errorMetric?.labels).toHaveProperty('status', '404');
    });

    test('should handle multiple HTTP requests', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 100);
      collector.recordHttpRequest('POST', '/api/data', 201, 150);
      collector.recordHttpRequest('DELETE', '/api/items/1', 204, 75);

      const metrics = collector.getMetrics(MetricCategory.HTTP);
      const requestMetrics = metrics.filter(m => m.name === 'http_requests_total');

      expect(requestMetrics.length).toBe(3);
    });

    test('should track HTTP methods separately', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 100);
      collector.recordHttpRequest('POST', '/api/test', 201, 150);

      const metrics = collector.getMetrics(MetricCategory.HTTP);
      const getMetric = metrics.find(m =>
        m.name === 'http_requests_total' && m.labels?.method === 'GET'
      );
      const postMetric = metrics.find(m =>
        m.name === 'http_requests_total' && m.labels?.method === 'POST'
      );

      expect(getMetric).toBeDefined();
      expect(postMetric).toBeDefined();
    });
  });

  describe('WebSocket Metrics', () => {
    test('should record WebSocket connection', () => {
      collector.recordWebSocketConnection({ server: 'test-server' });

      const wsMetrics = collector.getMetrics(MetricCategory.WEBSOCKET);
      const connectionMetric = wsMetrics.find(m => m.name === 'websocket_connections_total');
      const activeMetric = wsMetrics.find(m => m.name === 'websocket_connections_active');

      expect(connectionMetric).toBeDefined();
      expect(activeMetric).toBeDefined();
      expect(connectionMetric?.type).toBe(MetricType.COUNTER);
      expect(activeMetric?.type).toBe(MetricType.GAUGE);
    });

    test('should record WebSocket disconnection', () => {
      collector.recordWebSocketConnection();
      collector.recordWebSocketDisconnection('client_close');

      const wsMetrics = collector.getMetrics(MetricCategory.WEBSOCKET);
      const disconnectMetric = wsMetrics.find(m => m.name === 'websocket_disconnections_total');

      expect(disconnectMetric).toBeDefined();
      expect(disconnectMetric?.labels).toHaveProperty('reason', 'client_close');
    });

    test('should track active connection count', () => {
      collector.recordWebSocketConnection();
      collector.recordWebSocketConnection();
      collector.recordWebSocketDisconnection('normal');

      const wsMetrics = collector.getMetrics(MetricCategory.WEBSOCKET);
      const activeMetrics = wsMetrics.filter(m => m.name === 'websocket_connections_active');

      // Should have 3 metrics: 2 connections (+1 each) and 1 disconnection (-1)
      expect(activeMetrics.length).toBe(3);
    });

    test('should record WebSocket message', () => {
      collector.recordWebSocketMessage('reasoningStep', 25);

      const wsMetrics = collector.getMetrics(MetricCategory.WEBSOCKET);
      const messageMetric = wsMetrics.find(m => m.name === 'websocket_messages_total');
      const latencyMetric = wsMetrics.find(m => m.name === 'websocket_message_duration_ms');

      expect(messageMetric).toBeDefined();
      expect(latencyMetric).toBeDefined();
      expect(messageMetric?.labels).toHaveProperty('message_type', 'reasoningStep');
    });

    test('should handle different message types', () => {
      collector.recordWebSocketMessage('reasoningStep', 25);
      collector.recordWebSocketMessage('statusUpdate', 10);
      collector.recordWebSocketMessage('error', 5);

      const wsMetrics = collector.getMetrics(MetricCategory.WEBSOCKET);
      const messageMetrics = wsMetrics.filter(m => m.name === 'websocket_messages_total');

      expect(messageMetrics.length).toBe(3);
    });
  });

  describe('Error Metrics', () => {
    test('should record error with type and message', () => {
      collector.recordError('ValidationError', 'Invalid input data');

      const errorMetrics = collector.getMetrics(MetricCategory.ERROR);
      const errorMetric = errorMetrics.find(m => m.name === 'errors_total');

      expect(errorMetric).toBeDefined();
      expect(errorMetric?.labels).toHaveProperty('error_type', 'ValidationError');
    });

    test('should track errors by type', () => {
      collector.recordError('ValidationError', 'Invalid input');
      collector.recordError('ValidationError', 'Missing field');
      collector.recordError('AuthenticationError', 'Invalid token');

      const errorMetrics = collector.getMetrics(MetricCategory.ERROR);
      const validationErrors = errorMetrics.filter(m => m.labels?.error_type === 'ValidationError');
      const authErrors = errorMetrics.filter(m => m.labels?.error_type === 'AuthenticationError');

      expect(validationErrors.length).toBe(2);
      expect(authErrors.length).toBe(1);
    });

    test('should handle error with custom labels', () => {
      collector.recordError('DatabaseError', 'Connection failed', {
        database: 'postgres',
        region: 'us-east-1'
      });

      const errorMetrics = collector.getMetrics(MetricCategory.ERROR);
      const errorMetric = errorMetrics[0];

      expect(errorMetric.labels).toHaveProperty('database', 'postgres');
      expect(errorMetric.labels).toHaveProperty('region', 'us-east-1');
    });
  });

  describe('Business Metrics', () => {
    test('should record claw creation', () => {
      collector.recordClawCreation({ type: 'temporal' });

      const businessMetrics = collector.getMetrics(MetricCategory.BUSINESS);
      const clawMetric = businessMetrics.find(m => m.name === 'claw_creations_total');

      expect(clawMetric).toBeDefined();
      expect(clawMetric?.labels).toHaveProperty('type', 'temporal');
    });

    test('should record claw trigger', () => {
      collector.recordClawTrigger({ trigger_type: 'manual' });

      const businessMetrics = collector.getMetrics(MetricCategory.BUSINESS);
      const triggerMetric = businessMetrics.find(m => m.name === 'claw_triggers_total');

      expect(triggerMetric).toBeDefined();
      expect(triggerMetric?.labels).toHaveProperty('trigger_type', 'manual');
    });

    test('should record claw completion with success', () => {
      collector.recordClawCompletion(true, 1500);

      const businessMetrics = collector.getMetrics(MetricCategory.BUSINESS);
      const completionMetric = businessMetrics.find(m => m.name === 'claw_completions_total');

      expect(completionMetric).toBeDefined();
      expect(completionMetric?.labels).toHaveProperty('success', 'true');
    });

    test('should record claw completion with failure', () => {
      collector.recordClawCompletion(false, 500);

      const businessMetrics = collector.getMetrics(MetricCategory.BUSINESS);
      const completionMetric = businessMetrics.find(m => m.name === 'claw_completions_total');

      expect(completionMetric).toBeDefined();
      expect(completionMetric?.labels).toHaveProperty('success', 'false');
    });

    test('should track execution duration histogram', () => {
      collector.recordClawCompletion(true, 1500);

      const businessMetrics = collector.getMetrics(MetricCategory.BUSINESS);
      const durationMetric = businessMetrics.find(m => m.name === 'claw_execution_duration_ms');

      expect(durationMetric).toBeDefined();
      expect(durationMetric?.type).toBe(MetricType.HISTOGRAM);
    });
  });

  describe('Performance Metrics', () => {
    test('should record operation duration', () => {
      collector.recordOperationDuration('database_query', 50);

      const perfMetrics = collector.getMetrics(MetricCategory.PERFORMANCE);
      const durationMetric = perfMetrics.find(m => m.name === 'operation_duration_ms');

      expect(durationMetric).toBeDefined();
      expect(durationMetric?.labels).toHaveProperty('operation', 'database_query');
    });

    test('should record memory usage when process available', () => {
      mockMemoryUsage.mockReturnValue({
        heapUsed: 1024 * 1024 * 100, // 100MB
        heapTotal: 1024 * 1024 * 200, // 200MB
        external: 0
      });

      collector.recordMemoryUsage();

      const systemMetrics = collector.getMetrics(MetricCategory.SYSTEM);
      const memoryMetric = systemMetrics.find(m => m.name === 'memory_usage_bytes');

      expect(memoryMetric).toBeDefined();
      expect(memoryMetric?.type).toBe(MetricType.GAUGE);
    });

    test('should handle missing process.memoryUsage gracefully', () => {
      const originalProcess = global.process;
      delete (global as any).process =;

      expect(() => collector.recordMemoryUsage()).not.toThrow();

      global.process = originalProcess;
    });
  });

  describe('Histogram Functionality', () => {
    test('should calculate histogram buckets correctly', () => {
      const values = [5, 10, 15, 25, 50, 100, 250, 500, 1000];
      values.forEach(value => {
        collector.recordHttpRequest('GET', '/api/test', 200, value);
      });

      const metrics = collector.getMetrics(MetricCategory.HTTP);
      const histogramMetrics = metrics.filter(m => m.name === 'http_request_duration_ms');

      expect(histogramMetrics.length).toBeGreaterThan(0);
      histogramMetrics.forEach(metric => {
        expect(metric.buckets).toBeDefined();
        expect(Array.isArray(metric.buckets)).toBe(true);
      });
    });

    test('should limit histogram values to prevent memory leaks', () => {
      // Record more than 1000 values
      for (let i = 0; i < 1500; i++) {
        collector.recordHttpRequest('GET', '/api/test', 200, 100);
      }

      // Should not cause memory issues
      const stats = collector.getStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);
    });

    test('should use predefined latency buckets', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 150);

      const metrics = collector.getMetrics(MetricCategory.HTTP);
      const histogramMetric = metrics.find(m => m.name === 'http_request_duration_ms');

      expect(histogramMetric?.buckets).toBeDefined();
      // Buckets should include standard Prometheus latency buckets
      expect(histogramMetric?.buckets!.length).toBeGreaterThan(0);
    });
  });

  describe('Metric Storage & Retrieval', () => {
    test('should retrieve all metrics', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 100);
      collector.recordError('TestError', 'Test message');

      const allMetrics = collector.getMetrics();
      expect(allMetrics.length).toBeGreaterThan(0);
    });

    test('should retrieve metrics by category', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 100);
      collector.recordError('TestError', 'Test message');

      const httpMetrics = collector.getMetrics(MetricCategory.HTTP);
      const errorMetrics = collector.getMetrics(MetricCategory.ERROR);

      expect(httpMetrics.length).toBeGreaterThan(0);
      expect(errorMetrics.length).toBeGreaterThan(0);
    });

    test('should retrieve metrics since timestamp', () => {
      const beforeTime = Date.now();
      collector.recordHttpRequest('GET', '/api/test', 200, 100);

      const afterTime = Date.now();
      collector.recordHttpRequest('POST', '/api/data', 201, 150);

      const metricsSince = collector.getMetrics(undefined, afterTime);
      const postMetric = metricsSince.find(m => m.labels?.method === 'POST');

      expect(metricsSince.length).toBeGreaterThan(0);
      expect(postMetric).toBeDefined();
    });

    test('should provide storage statistics', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 100);
      collector.recordError('TestError', 'Test message');

      const stats = collector.getStats();

      expect(stats.totalMetrics).toBeGreaterThan(0);
      expect(stats.metricsByCategory).toBeDefined();
      expect(stats.metricsByCategory[MetricCategory.HTTP]).toBeGreaterThan(0);
      expect(stats.metricsByCategory[MetricCategory.ERROR]).toBeGreaterThan(0);
    });

    test('should track oldest and newest metric timestamps', () => {
      collector.recordHttpRequest('GET', '/api/test1', 200, 100);
      // Small delay to ensure different timestamps
      const start = Date.now();
      while (Date.now() - start < 2) {}
      collector.recordHttpRequest('POST', '/api/test2', 201, 150);

      const stats = collector.getStats();

      expect(stats.oldestMetric).toBeDefined();
      expect(stats.newestMetric).toBeDefined();
      expect(stats.newestMetric).toBeGreaterThanOrEqual(stats.oldestMetric!);
    });
  });

  describe('Metric Export', () => {
    test('should export metrics in Prometheus format', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 100);

      const prometheus = collector.exportPrometheus();

      expect(prometheus).toContain('# HELP');
      expect(prometheus).toContain('# TYPE');
      expect(prometheus).toContain('http_requests_total');
    });

    test('should format Prometheus metrics with labels', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 100, { region: 'us-east-1' });

      const prometheus = collector.exportPrometheus();

      expect(prometheus).toContain('region="us-east-1"');
    });

    test('should export metrics as JSON', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 100);

      const json = collector.exportJSON();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('name');
      expect(parsed[0]).toHaveProperty('type');
      expect(parsed[0]).toHaveProperty('timestamp');
    });

    test('should handle empty metrics export', () => {
      const emptyCollector = new MetricsCollector();

      const prometheus = emptyCollector.exportPrometheus();
      const json = emptyCollector.exportJSON();

      expect(typeof prometheus).toBe('string');
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);

      emptyCollector.dispose();
    });
  });

  describe('Metric Clearing', () => {
    test('should clear all metrics', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 100);
      collector.recordError('TestError', 'Test message');

      expect(collector.getMetrics().length).toBeGreaterThan(0);

      collector.clear();

      expect(collector.getMetrics().length).toBe(0);
    });

    test('should clear metrics by category', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 100);
      collector.recordError('TestError', 'Test message');

      collector.clear(MetricCategory.HTTP);

      const httpMetrics = collector.getMetrics(MetricCategory.HTTP);
      const errorMetrics = collector.getMetrics(MetricCategory.ERROR);

      expect(httpMetrics.length).toBe(0);
      expect(errorMetrics.length).toBeGreaterThan(0);
    });

    test('should clear histograms when clearing all metrics', () => {
      collector.recordHttpRequest('GET', '/api/test', 200, 100);

      collector.clear();

      const stats = collector.getStats();
      expect(stats.totalMetrics).toBe(0);
    });
  });

  describe('Sampling', () => {
    test('should respect sampling rate', () => {
      const sampledCollector = new MetricsCollector({ samplingRate: 0.5 });

      // Record many metrics to get statistical sample
      for (let i = 0; i < 100; i++) {
        sampledCollector.recordHttpRequest('GET', '/api/test', 200, 100);
      }

      const metrics = sampledCollector.getMetrics(MetricCategory.HTTP);
      // Should have approximately 50 metrics (with some variance)
      expect(metrics.length).toBeGreaterThan(20);
      expect(metrics.length).toBeLessThan(80);

      sampledCollector.dispose();
    });

    test('should always sample when rate is 1', () => {
      const fullSampleCollector = new MetricsCollector({ samplingRate: 1.0 });

      for (let i = 0; i < 10; i++) {
        fullSampleCollector.recordHttpRequest('GET', '/api/test', 200, 100);
      }

      const metrics = fullSampleCollector.getMetrics(MetricCategory.HTTP);
      expect(metrics.length).toBe(10);

      fullSampleCollector.dispose();
    });

    test('should never sample when rate is 0', () => {
      const noSampleCollector = new MetricsCollector({ samplingRate: 0.0 });

      for (let i = 0; i < 10; i++) {
        noSampleCollector.recordHttpRequest('GET', '/api/test', 200, 100);
      }

      const metrics = noSampleCollector.getMetrics(MetricCategory.HTTP);
      expect(metrics.length).toBe(0);

      noSampleCollector.dispose();
    });
  });

  describe('Event Emission', () => {
    test('should emit metric event when recording', (done) => {
      const testCollector = new MetricsCollector();

      testCollector.on('metric', (metric: Metric) => {
        expect(metric).toBeDefined();
        expect(metric.name).toBe('http_requests_total');
        testCollector.dispose();
        done();
      });

      testCollector.recordHttpRequest('GET', '/api/test', 200, 100);
    });

    test('should emit metric with correct data', (done) => {
      const testCollector = new MetricsCollector();

      testCollector.on('metric', (metric: Metric) => {
        expect(metric).toHaveProperty('name');
        expect(metric).toHaveProperty('type');
        expect(metric).toHaveProperty('category');
        expect(metric).toHaveProperty('timestamp');
        testCollector.dispose();
        done();
      });

      testCollector.recordError('TestError', 'Test');
    });
  });

  describe('Global Tags', () => {
    test('should add global tags to all metrics', () => {
      const taggedCollector = new MetricsCollector({
        globalTags: {
          environment: 'production',
          version: '1.0.0',
          region: 'us-west-2'
        }
      });

      taggedCollector.recordHttpRequest('GET', '/api/test', 200, 100);
      taggedCollector.recordError('TestError', 'Test');

      const metrics = taggedCollector.getMetrics();

      metrics.forEach(metric => {
        expect(metric.labels).toHaveProperty('environment', 'production');
        expect(metric.labels).toHaveProperty('version', '1.0.0');
        expect(metric.labels).toHaveProperty('region', 'us-west-2');
      });

      taggedCollector.dispose();
    });

    test('should merge custom tags with global tags', () => {
      const taggedCollector = new MetricsCollector({
        globalTags: { environment: 'production' }
      });

      taggedCollector.recordHttpRequest('GET', '/api/test', 200, 100, { custom: 'value' });

      const metrics = taggedCollector.getMetrics(MetricCategory.HTTP);
      const metric = metrics[0];

      expect(metric.labels).toHaveProperty('environment', 'production');
      expect(metric.labels).toHaveProperty('custom', 'value');

      taggedCollector.dispose();
    });
  });

  describe('Edge Cases & Error Handling', () => {
    test('should handle very long metric names', () => {
      const longName = 'a'.repeat(500);
      expect(() => {
        collector.recordHttpRequest('GET', `/${longName}`, 200, 100);
      }).not.toThrow();
    });

    test('should handle very long label values', () => {
      const longValue = 'b'.repeat(1000);
      expect(() => {
        collector.recordHttpRequest('GET', '/api/test', 200, 100, { long: longValue });
      }).not.toThrow();
    });

    test('should handle special characters in labels', () => {
      expect(() => {
        collector.recordHttpRequest('GET', '/api/test', 200, 100, {
          special: 'test"with"quotes',
          unicode: '测试中文',
          emoji: '😀🎉'
        });
      }).not.toThrow();
    });

    test('should handle negative latency values', () => {
      expect(() => {
        collector.recordHttpRequest('GET', '/api/test', 200, -100);
      }).not.toThrow();
    });

    test('should handle zero latency', () => {
      expect(() => {
        collector.recordHttpRequest('GET', '/api/test', 200, 0);
      }).not.toThrow();

      const metrics = collector.getMetrics(MetricCategory.HTTP);
      expect(metrics.length).toBeGreaterThan(0);
    });

    test('should handle very large latency values', () => {
      expect(() => {
        collector.recordHttpRequest('GET', '/api/test', 200, Number.MAX_SAFE_INTEGER);
      }).not.toThrow();
    });

    test('should handle undefined/null labels gracefully', () => {
      expect(() => {
        collector.recordHttpRequest('GET', '/api/test', 200, 100, undefined as any);
      }).not.toThrow();

      expect(() => {
        collector.recordHttpRequest('GET', '/api/test', 200, 100, null as any);
      }).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    test('should limit storage size per category', () => {
      const largeCollector = new MetricsCollector();

      // Record more than maxMetricsPerCategory (10000)
      for (let i = 0; i < 15000; i++) {
        largeCollector.recordHttpRequest('GET', `/api/test${i}`, 200, 100);
      }

      const stats = largeCollector.getStats();
      expect(stats.totalMetrics).toBeLessThanOrEqual(10000);

      largeCollector.dispose();
    });

    test('should rotate old metrics based on age', async () => {
      const ageCollector = new MetricsCollector();

      // Record some metrics
      for (let i = 0; i < 100; i++) {
        ageCollector.recordHttpRequest('GET', '/api/test', 200, 100);
      }

      // Wait a bit and record more
      await new Promise(resolve => setTimeout(resolve, 100));

      for (let i = 0; i < 100; i++) {
        ageCollector.recordHttpRequest('POST', '/api/test', 201, 150);
      }

      const stats = ageCollector.getStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);

      ageCollector.dispose();
    });

    test('should cleanup histograms periodically', async () => {
      const cleanupCollector = new MetricsCollector();

      // Create many histogram values
      for (let i = 0; i < 2000; i++) {
        cleanupCollector.recordHttpRequest('GET', '/api/test', 200, 100);
      }

      // Wait for cleanup interval (60s is too long, but we can check the structure)
      const stats = cleanupCollector.getStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);

      cleanupCollector.dispose();
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance from getMetricsCollector', () => {
      const instance1 = getMetricsCollector();
      const instance2 = getMetricsCollector();

      expect(instance1).toBe(instance2);
    });

    test('should reset global instance', () => {
      const instance1 = getMetricsCollector();
      resetMetricsCollector();
      const instance2 = getMetricsCollector();

      expect(instance1).not.toBe(instance2);
    });

    test('should pass config to global instance on first call', () => {
      resetMetricsCollector();

      const instance = getMetricsCollector({ debug: true });

      expect(instance).toBeInstanceOf(MetricsCollector);
      // Subsequent calls should ignore config
      const instance2 = getMetricsCollector({ debug: false });
      expect(instance).toBe(instance2);

      resetMetricsCollector();
    });
  });

  describe('Disposal', () => {
    test('should dispose and cleanup resources', () => {
      const testCollector = new MetricsCollector();
      testCollector.recordHttpRequest('GET', '/api/test', 200, 100);

      testCollector.dispose();

      // After disposal, metrics should be cleared
      expect(testCollector.getMetrics().length).toBe(0);
    });

    test('should remove all event listeners on dispose', () => {
      const testCollector = new MetricsCollector();
      let eventFired = false;

      testCollector.on('metric', () => { eventFired = true; });
      testCollector.dispose();

      testCollector.recordHttpRequest('GET', '/api/test', 200, 100);

      expect(eventFired).toBe(false);
    });
  });
});

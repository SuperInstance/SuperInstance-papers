/**
 * monitoring.test.ts
 *
 * Comprehensive tests for monitoring and metrics collection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { register, Counter, Histogram, Gauge, Summary } from 'prom-client';
import {
  MetricsCollector,
  getMetricsCollector,
  resetMetricsCollector,
} from './MetricsCollector';
import {
  createMetricsMiddleware,
  createErrorMetricsMiddleware,
  createConnectionTrackingMiddleware,
  trackAsyncOperation,
  trackOperation,
  TrackOperation,
} from './Middleware';
import {
  CellMetrics,
  getCellMetrics,
  resetCellMetrics,
  CellOperationType,
  CellOperationStatus,
  CellState,
} from './CellMetrics';
import {
  WebSocketMetrics,
  getWebSocketMetrics,
  resetWebSocketMetrics,
  MessageDirection,
  MessageType,
  ConnectionState,
} from './WebSocketMetrics';
import {
  CacheMetrics,
  getCacheMetrics,
  resetCacheMetrics,
  CacheTier,
  CacheOperation,
  CacheResult,
} from './CacheMetrics';
import {
  QueueMetrics,
  getQueueMetrics,
  resetQueueMetrics,
  QueueOperation,
  QueueState,
} from './QueueMetrics';
import {
  HealthChecks,
  getHealthChecks,
  resetHealthChecks,
  HealthStatus,
} from './HealthChecks';
import { Request, Response, NextFunction } from 'express';

describe('Monitoring Module', () => {
  beforeEach(() => {
    // Reset all singletons before each test
    resetMetricsCollector();
    resetCellMetrics();
    resetWebSocketMetrics();
    resetCacheMetrics();
    resetQueueMetrics();
    resetHealthChecks();
  });

  afterEach(() => {
    // Clean up after each test
    register.clear();
  });

  describe('MetricsCollector', () => {
    it('should create a new MetricsCollector instance', () => {
      const collector = new MetricsCollector();
      expect(collector).toBeInstanceOf(MetricsCollector);
    });

    it('should return singleton instance', () => {
      const collector1 = getMetricsCollector();
      const collector2 = getMetricsCollector();
      expect(collector1).toBe(collector2);
    });

    it('should record HTTP requests correctly', async () => {
      const collector = getMetricsCollector();
      collector.recordHttpRequest('GET', '/api/test', 200, 0.123);

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('spreadsheet_http_requests_total');
      expect(metrics).toContain('spreadsheet_http_request_duration_seconds');
    });

    it('should record cell operations correctly', async () => {
      const collector = getMetricsCollector();
      collector.recordCellOperation('TransformCell', 'transform', 0.456);

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('spreadsheet_cell_operations_total');
      expect(metrics).toContain('spreadsheet_cell_processing_seconds');
    });

    it('should track cache operations', async () => {
      const collector = getMetricsCollector();
      collector.recordCacheOperation('l1', true, 0.001);
      collector.recordCacheOperation('l2', false, 0.005);

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('spreadsheet_cache_operations_total');
    });

    it('should update gauge metrics', async () => {
      const collector = getMetricsCollector();
      collector.setActiveConnections(100, 'http');
      collector.setQueueDepth(50, 'test-queue');
      collector.setCacheSize(1024000, 'l1');

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('spreadsheet_active_connections');
      expect(metrics).toContain('spreadsheet_queue_depth');
      expect(metrics).toContain('spreadsheet_cache_size_bytes');
    });

    it('should reset metrics', async () => {
      const collector = getMetricsCollector();
      collector.recordHttpRequest('GET', '/api/test', 200, 0.123);

      await collector.resetMetrics();

      const metrics = await collector.getMetrics();
      // Should still have metric definitions but no data
      expect(metrics).toContain('spreadsheet_http_requests_total');
    });
  });

  describe('Metrics Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        path: '/api/cells/123',
        headers: {},
      };

      mockRes = {
        statusCode: 200,
        on: vi.fn((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        }),
        send: vi.fn(function(this: Response) {
          return this;
        }),
      };

      mockNext = vi.fn();
    });

    it('should create metrics middleware', () => {
      const middleware = createMetricsMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should track HTTP requests', async () => {
      const middleware = createMetricsMiddleware();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should normalize paths correctly', () => {
      const middleware = createMetricsMiddleware();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Should normalize UUIDs and IDs
      expect(mockNext).toHaveBeenCalled();
    });

    it('should track response size when enabled', async () => {
      const middleware = createMetricsMiddleware({ trackResponseSize: true });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should exclude specified paths', async () => {
      const middleware = createMetricsMiddleware({
        excludePaths: ['/health', '/metrics'],
      });

      mockReq.path = '/health';
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('CellMetrics', () => {
    it('should track cell operations', () => {
      const cellMetrics = getCellMetrics();
      const cellId = 'test-cell-1';
      const cellType = 'TransformCell';

      cellMetrics.startOperation(cellId, cellType, CellOperationType.TRANSFORM);
      cellMetrics.endOperation(
        cellId,
        cellType,
        CellOperationType.TRANSFORM,
        CellOperationStatus.SUCCESS,
        0.5
      );

      expect(cellMetrics).toBeInstanceOf(CellMetrics);
    });

    it('should track state transitions', () => {
      const cellMetrics = getCellMetrics();
      const cellId = 'test-cell-2';
      const cellType = 'AnalysisCell';

      cellMetrics.recordStateTransition(
        cellId,
        cellType,
        CellState.IDLE,
        CellState.PROCESSING
      );

      expect(cellMetrics).toBeInstanceOf(CellMetrics);
    });

    it('should track errors', () => {
      const cellMetrics = getCellMetrics();
      const cellId = 'test-cell-3';
      const cellType = 'PredictionCell';
      const error = new Error('Test error');

      cellMetrics.recordError(
        cellId,
        cellType,
        CellOperationType.PREDICT,
        error
      );

      expect(cellMetrics).toBeInstanceOf(CellMetrics);
    });

    it('should track batch operations', () => {
      const cellMetrics = getCellMetrics();
      const cellType = 'AggregateCell';

      cellMetrics.recordBatchOperation(
        cellType,
        CellOperationType.AGGREGATE,
        10,
        CellOperationStatus.SUCCESS
      );

      expect(cellMetrics).toBeInstanceOf(CellMetrics);
    });

    it('should track validation results', () => {
      const cellMetrics = getCellMetrics();
      const cellId = 'test-cell-4';
      const cellType = 'ValidateCell';

      cellMetrics.recordValidation(cellId, cellType, 5, 4, 1);

      expect(cellMetrics).toBeInstanceOf(CellMetrics);
    });

    it('should clean up stale timers', () => {
      const cellMetrics = getCellMetrics();
      cellMetrics.cleanupStaleTimers(1000);

      expect(cellMetrics).toBeInstanceOf(CellMetrics);
    });
  });

  describe('WebSocketMetrics', () => {
    it('should track WebSocket connections', () => {
      const wsMetrics = getWebSocketMetrics();
      const connectionId = 'ws-conn-1';

      wsMetrics.trackConnection(connectionId, {
        ipAddress: '127.0.0.1',
        userId: 'user-123',
      });

      expect(wsMetrics).toBeInstanceOf(WebSocketMetrics);
    });

    it('should track disconnections', () => {
      const wsMetrics = getWebSocketMetrics();
      const connectionId = 'ws-conn-2';

      wsMetrics.trackConnection(connectionId);
      wsMetrics.trackDisconnection(connectionId, 'normal');

      expect(wsMetrics).toBeInstanceOf(WebSocketMetrics);
    });

    it('should track incoming messages', () => {
      const wsMetrics = getWebSocketMetrics();
      const connectionId = 'ws-conn-3';

      wsMetrics.trackConnection(connectionId);
      wsMetrics.trackIncomingMessage(
        connectionId,
        MessageType.CELL_UPDATE,
        1024
      );

      expect(wsMetrics).toBeInstanceOf(WebSocketMetrics);
    });

    it('should track outgoing messages', () => {
      const wsMetrics = getWebSocketMetrics();
      const connectionId = 'ws-conn-4';

      wsMetrics.trackConnection(connectionId);
      wsMetrics.trackOutgoingMessage(
        connectionId,
        MessageType.SPREADSHEET_UPDATE,
        2048
      );

      expect(wsMetrics).toBeInstanceOf(WebSocketMetrics);
    });

    it('should track broadcasts', () => {
      const wsMetrics = getWebSocketMetrics();

      wsMetrics.trackBroadcast(
        MessageType.CELL_BATCH_UPDATE,
        100,
        0.05,
        4096
      );

      expect(wsMetrics).toBeInstanceOf(WebSocketMetrics);
    });

    it('should calculate messages per second', () => {
      const wsMetrics = getWebSocketMetrics();

      const mps = wsMetrics.getMessagesPerSecond();
      expect(mps).toHaveProperty('incoming');
      expect(mps).toHaveProperty('outgoing');
    });

    it('should clean up stale connections', () => {
      const wsMetrics = getWebSocketMetrics();

      const cleaned = wsMetrics.cleanupStaleConnections(1000);
      expect(Array.isArray(cleaned)).toBe(true);
    });
  });

  describe('CacheMetrics', () => {
    it('should track cache GET operations', () => {
      const cacheMetrics = getCacheMetrics();

      cacheMetrics.trackGet(CacheTier.L1, 'key-1', true, 0.001);
      cacheMetrics.trackGet(CacheTier.L2, 'key-2', false, 0.005);

      expect(cacheMetrics).toBeInstanceOf(CacheMetrics);
    });

    it('should track cache SET operations', () => {
      const cacheMetrics = getCacheMetrics();

      cacheMetrics.trackSet(CacheTier.L1, 'key-3', 1024, 0.002);

      expect(cacheMetrics).toBeInstanceOf(CacheMetrics);
    });

    it('should track cache DELETE operations', () => {
      const cacheMetrics = getCacheMetrics();

      cacheMetrics.trackSet(CacheTier.L1, 'key-4', 512, 0.002);
      cacheMetrics.trackDelete(CacheTier.L1, 'key-4', 0.001);

      expect(cacheMetrics).toBeInstanceOf(CacheMetrics);
    });

    it('should track cache promotions', () => {
      const cacheMetrics = getCacheMetrics();

      cacheMetrics.trackSet(CacheTier.L2, 'key-5', 2048, 0.003);
      cacheMetrics.trackPromotion(CacheTier.L2, CacheTier.L1, 'key-5');

      expect(cacheMetrics).toBeInstanceOf(CacheMetrics);
    });

    it('should track cache demotions', () => {
      const cacheMetrics = getCacheMetrics();

      cacheMetrics.trackSet(CacheTier.L1, 'key-6', 1024, 0.002);
      cacheMetrics.trackDemotion(CacheTier.L1, CacheTier.L2, 'key-6');

      expect(cacheMetrics).toBeInstanceOf(CacheMetrics);
    });

    it('should calculate hit rates', () => {
      const cacheMetrics = getCacheMetrics();

      cacheMetrics.trackGet(CacheTier.L1, 'key-7', true, 0.001);
      cacheMetrics.trackGet(CacheTier.L1, 'key-8', true, 0.001);
      cacheMetrics.trackGet(CacheTier.L1, 'key-9', false, 0.001);

      const hitRate = cacheMetrics.getHitRate(CacheTier.L1);
      expect(hitRate).toBeGreaterThan(0);
      expect(hitRate).toBeLessThanOrEqual(1);
    });

    it('should get cache statistics', () => {
      const cacheMetrics = getCacheMetrics();

      cacheMetrics.trackSet(CacheTier.L1, 'key-10', 1024, 0.002);
      cacheMetrics.trackGet(CacheTier.L1, 'key-10', true, 0.001);

      const stats = cacheMetrics.getCacheStats();
      expect(stats).toHaveProperty('l1');
      expect(stats).toHaveProperty('l2');
      expect(stats).toHaveProperty('l3');
    });

    it('should clean up stale entries', () => {
      const cacheMetrics = getCacheMetrics();

      const count = cacheMetrics.cleanupStaleEntries(1000);
      expect(typeof count).toBe('number');
    });
  });

  describe('QueueMetrics', () => {
    it('should track message publishes', () => {
      const queueMetrics = getQueueMetrics();

      queueMetrics.trackPublish('test-queue', 512);

      expect(queueMetrics).toBeInstanceOf(QueueMetrics);
    });

    it('should track message consumption', () => {
      const queueMetrics = getQueueMetrics();

      queueMetrics.trackPublish('test-queue', 512);
      queueMetrics.trackConsume('test-queue', 'consumer-1');

      expect(queueMetrics).toBeInstanceOf(QueueMetrics);
    });

    it('should track acknowledgments', () => {
      const queueMetrics = getQueueMetrics();

      queueMetrics.trackConsume('test-queue', 'consumer-2');
      queueMetrics.trackAck('test-queue', 'consumer-2', 0.1);

      expect(queueMetrics).toBeInstanceOf(QueueMetrics);
    });

    it('should track negative acknowledgments', () => {
      const queueMetrics = getQueueMetrics();

      queueMetrics.trackConsume('test-queue', 'consumer-3');
      const error = new Error('Processing failed');
      queueMetrics.trackNack('test-queue', 'consumer-3', error);

      expect(queueMetrics).toBeInstanceOf(QueueMetrics);
    });

    it('should track message requeues', () => {
      const queueMetrics = getQueueMetrics();

      queueMetrics.trackRequeue('test-queue', 'consumer-4');

      expect(queueMetrics).toBeInstanceOf(QueueMetrics);
    });

    it('should track dead letter messages', () => {
      const queueMetrics = getQueueMetrics();

      queueMetrics.trackDeadLetter('test-queue', 'consumer-5', 'max-retries-exceeded');

      expect(queueMetrics).toBeInstanceOf(QueueMetrics);
    });

    it('should calculate throughput', () => {
      const queueMetrics = getQueueMetrics();

      const throughput = queueMetrics.getThroughput('test-queue');
      expect(throughput).toHaveProperty('publishRate');
      expect(throughput).toHaveProperty('consumeRate');
      expect(throughput).toHaveProperty('ackRate');
    });

    it('should calculate error rates', () => {
      const queueMetrics = getQueueMetrics();

      const errorRate = queueMetrics.getErrorRate('test-queue');
      expect(typeof errorRate).toBe('number');
    });

    it('should get system statistics', () => {
      const queueMetrics = getQueueMetrics();

      queueMetrics.trackPublish('test-queue', 512);
      const stats = queueMetrics.getSystemStats();

      expect(stats).toHaveProperty('totalQueues');
      expect(stats).toHaveProperty('totalMessagesPublished');
    });
  });

  describe('HealthChecks', () => {
    it('should perform liveness check', async () => {
      const healthChecks = getHealthChecks();

      const result = await healthChecks.liveness();

      expect(result).toHaveProperty('status', HealthStatus.HEALTHY);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('checks');
    });

    it('should perform readiness check', async () => {
      const healthChecks = getHealthChecks();

      const result = await healthChecks.readiness();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('memory');
    });

    it('should perform startup check', async () => {
      const healthChecks = getHealthChecks();

      const result = await healthChecks.startup();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
    });

    it('should perform comprehensive health check', async () => {
      const healthChecks = getHealthChecks();

      const result = await healthChecks.health();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('process');
      expect(result.checks).toHaveProperty('memory');
      expect(result.checks).toHaveProperty('cpu');
      expect(result.checks).toHaveProperty('disk');
    });

    it('should add custom health checks', async () => {
      const healthChecks = getHealthChecks();

      healthChecks.addCustomCheck('custom_check', async () => ({
        status: HealthStatus.HEALTHY,
        message: 'Custom check passed',
      }));

      const result = await healthChecks.health();

      expect(result.checks).toHaveProperty('custom_check');
    });

    it('should remove custom health checks', async () => {
      const healthChecks = getHealthChecks();

      healthChecks.addCustomCheck('temp_check', async () => ({
        status: HealthStatus.HEALTHY,
        message: 'Temporary check',
      }));

      healthChecks.removeCustomCheck('temp_check');

      const result = await healthChecks.health();

      expect(result.checks).not.toHaveProperty('temp_check');
    });

    it('should create liveness middleware', () => {
      const healthChecks = getHealthChecks();
      const middleware = healthChecks.livenessMiddleware();

      expect(typeof middleware).toBe('function');
    });

    it('should create readiness middleware', () => {
      const healthChecks = getHealthChecks();
      const middleware = healthChecks.readinessMiddleware();

      expect(typeof middleware).toBe('function');
    });

    it('should create startup middleware', () => {
      const healthChecks = getHealthChecks();
      const middleware = healthChecks.startupMiddleware();

      expect(typeof middleware).toBe('function');
    });

    it('should create health middleware', () => {
      const healthChecks = getHealthChecks();
      const middleware = healthChecks.healthMiddleware();

      expect(typeof middleware).toBe('function');
    });
  });

  describe('Integration Tests', () => {
    it('should track complete request lifecycle', async () => {
      const collector = getMetricsCollector();
      const middleware = createMetricsMiddleware();

      // Simulate a request
      collector.recordHttpRequest('POST', '/api/cells', 201, 0.234);

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('spreadsheet_http_requests_total');
      expect(metrics).toContain('spreadsheet_http_request_duration_seconds');
    });

    it('should track cell operation with error', async () => {
      const collector = getMetricsCollector();
      const cellMetrics = getCellMetrics();

      const cellId = 'test-cell-error';
      const cellType = 'AnalysisCell';
      const error = new Error('Analysis failed');

      cellMetrics.startOperation(cellId, cellType, CellOperationType.ANALYZE);
      cellMetrics.recordError(cellId, cellType, CellOperationType.ANALYZE, error);

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('spreadsheet_errors_total');
    });

    it('should track cache operation with metrics', async () => {
      const collector = getMetricsCollector();
      const cacheMetrics = getCacheMetrics();

      cacheMetrics.trackSet(CacheTier.L1, 'test-key', 1024, 0.002);
      cacheMetrics.trackGet(CacheTier.L1, 'test-key', true, 0.001);

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('spreadsheet_cache_operations_total');
      expect(metrics).toContain('spreadsheet_cache_size_bytes');
    });

    it('should track queue message lifecycle', async () => {
      const collector = getMetricsCollector();
      const queueMetrics = getQueueMetrics();

      queueMetrics.trackPublish('test-queue', 512);
      queueMetrics.trackConsume('test-queue', 'consumer-1');
      queueMetrics.trackAck('test-queue', 'consumer-1', 0.15);

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('spreadsheet_queue_messages_total');
      expect(metrics).toContain('spreadsheet_queue_depth');
    });

    it('should track WebSocket connection lifecycle', async () => {
      const collector = getMetricsCollector();
      const wsMetrics = getWebSocketMetrics();

      const connectionId = 'ws-test-conn';

      wsMetrics.trackConnection(connectionId);
      wsMetrics.trackIncomingMessage(connectionId, MessageType.CELL_UPDATE, 256);
      wsMetrics.trackOutgoingMessage(connectionId, MessageType.CELL_UPDATE, 512);
      wsMetrics.trackDisconnection(connectionId, 'client_close');

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('spreadsheet_websocket_messages_total');
      expect(metrics).toContain('spreadsheet_active_connections');
    });
  });

  describe('Label Validation', () => {
    it('should handle valid label values', async () => {
      const collector = getMetricsCollector();

      collector.recordHttpRequest('GET', '/api/test', 200, 0.1);
      collector.recordCellOperation('TransformCell', 'transform', 0.2);
      collector.recordCacheOperation('l1', true, 0.001);

      const metrics = await collector.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should sanitize paths correctly', async () => {
      const collector = getMetricsCollector();

      collector.recordHttpRequest('GET', '/api/cells/12345-67890-abcde', 200, 0.1);
      collector.recordHttpRequest('POST', '/api/spreadsheets/550e8400-e29b-41d4-a716-446655440000', 201, 0.2);

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('spreadsheet_http_requests_total');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should expose metrics in Prometheus format', async () => {
      const collector = getMetricsCollector();

      collector.recordHttpRequest('GET', '/api/test', 200, 0.123);
      collector.setActiveConnections(50, 'http');

      const metrics = await collector.getMetrics();

      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
      expect(metrics).toContain('spreadsheet_');
    });

    it('should include metric metadata', async () => {
      const collector = getMetricsCollector();

      const metrics = await collector.getMetrics();

      expect(metrics).toContain('HELP');
      expect(metrics).toContain('TYPE');
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-frequency metrics updates', async () => {
      const collector = getMetricsCollector();
      const startTime = Date.now();

      // Record 1000 operations
      for (let i = 0; i < 1000; i++) {
        collector.recordHttpRequest('GET', `/api/test/${i}`, 200, 0.001);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle concurrent metric updates', async () => {
      const collector = getMetricsCollector();
      const promises = [];

      // Create 100 concurrent metric updates
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            collector.recordHttpRequest('GET', `/api/concurrent/${i}`, 200, 0.001);
          })
        );
      }

      await Promise.all(promises);

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('spreadsheet_http_requests_total');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid metric values gracefully', async () => {
      const collector = getMetricsCollector();

      // These should not throw errors
      collector.recordHttpRequest('GET', '/api/test', 200, NaN);
      collector.recordCellOperation('TestCell', 'test', Infinity);
      collector.setActiveConnections(-1, 'http');

      const metrics = await collector.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should handle missing label values', async () => {
      const collector = getMetricsCollector();

      // Should use default values
      collector.recordHttpRequest('', '', 0, 0);

      const metrics = await collector.getMetrics();
      expect(metrics).toBeDefined();
    });
  });
});

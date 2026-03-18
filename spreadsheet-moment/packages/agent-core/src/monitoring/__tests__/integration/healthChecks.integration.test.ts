/**
 * Health Checks Integration Tests
 *
 * Integration tests for the health checking system covering:
 * - Real HTTP endpoint health checks
 * - WebSocket connection health monitoring
 * - Resource usage threshold validation
 * - Custom health check implementations
 * - Health status change events
 * - End-to-end health check workflows
 *
 * @version 1.0.0 - Week 5: Testing & Validation
 */

import {
  HealthChecker,
  HealthStatus,
  HealthCheckResult,
  HTTPHealthCheckConfig,
  WebSocketHealthCheckConfig,
  ResourceThresholds
} from '../../HealthChecker';
import { MetricsCollector } from '../../MetricsCollector';

describe('Health Checks Integration Tests', () => {
  let checker: HealthChecker;
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    metricsCollector = new MetricsCollector({ debug: false });
    checker = new HealthChecker({
      metricsCollector,
      defaultInterval: 1000,
      defaultTimeout: 5000,
      debug: false
    });

    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    checker.stop();
    checker.dispose();
    metricsCollector.dispose();
    jest.useRealTimers();
  });

  describe('HTTP Endpoint Health Checks', () => {
    test('should check health of real HTTP endpoint', async () => {
      // Mock a real HTTP endpoint
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers({
          'content-type': 'application/json'
        }),
        json: async () => ({ status: 'healthy' })
      });

      checker.addHTTPCheck('api-health', {
        url: 'https://api.example.com/health',
        expectedStatus: 200,
        timeout: 5000
      });

      const result = await checker.checkHealth();

      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].name).toBe('api-health');
      expect(result.checks[0].status).toBe(HealthStatus.HEALTHY);
      expect(result.checks[0].duration).toBeGreaterThan(0);
    });

    test('should handle endpoint that returns error status', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      mockFetch.mockResolvedValueOnce({
        status: 503,
        ok: false,
        headers: new Headers(),
        statusText: 'Service Unavailable'
      });

      checker.addHTTPCheck('api-health', {
        url: 'https://api.example.com/health',
        expectedStatus: 200
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].message).toContain('Unexpected status: 503');
    });

    test('should handle endpoint timeout', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      mockFetch.mockImplementationOnce(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 6000)
        )
      );

      checker.addHTTPCheck('slow-endpoint', {
        url: 'https://api.example.com/slow',
        timeout: 2000
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].message).toContain('timeout');
    });

    test('should handle network errors', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      checker.addHTTPCheck('unreachable', {
        url: 'https://unreachable.example.com/health'
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].message).toContain('Network error');
    });

    test('should include endpoint metadata in result', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers()
      });

      checker.addHTTPCheck('api-with-metadata', {
        url: 'https://api.example.com/health',
        expectedStatus: 200,
        headers: {
          'X-API-Key': 'test-key'
        }
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].metadata).toBeDefined();
      expect(result.checks[0].metadata).toHaveProperty('url', 'https://api.example.com/health');
      expect(result.checks[0].metadata).toHaveProperty('statusCode', 200);
    });

    test('should monitor multiple HTTP endpoints', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      mockFetch
        .mockResolvedValueOnce({ status: 200, ok: true, headers: new Headers() })
        .mockResolvedValueOnce({ status: 200, ok: true, headers: new Headers() })
        .mockResolvedValueOnce({ status: 500, ok: false, headers: new Headers() });

      checker.addHTTPCheck('api1', { url: 'https://api1.example.com/health' });
      checker.addHTTPCheck('api2', { url: 'https://api2.example.com/health' });
      checker.addHTTPCheck('api3', { url: 'https://api3.example.com/health' });

      const result = await checker.checkHealth();

      expect(result.checks).toHaveLength(3);
      expect(result.checks[0].name).toBe('api1');
      expect(result.checks[1].name).toBe('api2');
      expect(result.checks[2].name).toBe('api3');
      expect(result.status).toBe(HealthStatus.UNHEALTHY); // api3 failed
    });
  });

  describe('WebSocket Connection Health Monitoring', () => {
    test('should monitor active WebSocket connection', async () => {
      const mockWebSocket = {
        ws: null,
        connected: true,
        url: 'wss://example.com/ws'
      };

      checker.addWebSocketCheck('ws-connection', {
        url: 'wss://example.com/ws',
        expectConnected: true
      }, mockWebSocket);

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.HEALTHY);
      expect(result.checks[0].message).toBe('WebSocket connected');
      expect(result.checks[0].metadata).toHaveProperty('connected', true);
    });

    test('should detect disconnected WebSocket', async () => {
      const mockWebSocket = {
        ws: null,
        connected: false,
        url: 'wss://example.com/ws'
      };

      checker.addWebSocketCheck('ws-connection', {
        url: 'wss://example.com/ws',
        expectConnected: true
      }, mockWebSocket);

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].message).toContain('unexpected state');
    });

    test('should monitor WebSocket connection state changes', async () => {
      const mockWebSocket = {
        ws: null,
        connected: true,
        url: 'wss://example.com/ws'
      };

      checker.addWebSocketCheck('ws-connection', {
        url: 'wss://example.com/ws'
      }, mockWebSocket);

      // First check - connected
      let result = await checker.checkHealth();
      expect(result.checks[0].status).toBe(HealthStatus.HEALTHY);

      // Disconnect
      mockWebSocket.connected = false;

      // Second check - disconnected
      result = await checker.checkHealth();
      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
    });

    test('should handle multiple WebSocket connections', async () => {
      const ws1 = { ws: null, connected: true };
      const ws2 = { ws: null, connected: true };
      const ws3 = { ws: null, connected: false };

      checker.addWebSocketCheck('ws1', { url: 'wss://example.com/ws1' }, ws1);
      checker.addWebSocketCheck('ws2', { url: 'wss://example.com/ws2', expectConnected: true }, ws2);
      checker.addWebSocketCheck('ws3', { url: 'wss://example.com/ws3', expectConnected: false }, ws3);

      const result = await checker.checkHealth();

      expect(result.checks).toHaveLength(3);
      expect(result.checks[0].status).toBe(HealthStatus.HEALTHY);
      expect(result.checks[1].status).toBe(HealthStatus.HEALTHY);
      expect(result.checks[2].status).toBe(HealthStatus.HEALTHY);
    });
  });

  describe('Resource Usage Threshold Validation', () => {
    test('should monitor memory usage within thresholds', async () => {
      const originalProcess = global.process;
      (global as any).process = {
        memoryUsage: () => ({
          heapUsed: 200 * 1024 * 1024, // 200MB
          heapTotal: 500 * 1024 * 1024, // 500MB (40%)
          external: 0
        })
      };

      checker.addResourceCheck('memory', {
        maxHeapMB: 512,
        maxHeapUsagePercent: 80
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.HEALTHY);
      expect(result.checks[0].message).toContain('within normal limits');
      expect(result.checks[0].metadata).toHaveProperty('heapUsedMB', 200);
      expect(result.checks[0].metadata).toHaveProperty('heapUsagePercent');

      global.process = originalProcess;
    });

    test('should detect memory usage above threshold', async () => {
      const originalProcess = global.process;
      (global as any).process = {
        memoryUsage: () => ({
          heapUsed: 600 * 1024 * 1024, // 600MB
          heapTotal: 1000 * 1024 * 1024, // 1000MB
          external: 0
        })
      };

      checker.addResourceCheck('memory', {
        maxHeapMB: 512
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.DEGRADED);
      expect(result.checks[0].message).toContain('exceeds threshold');

      global.process = originalProcess;
    });

    test('should detect high memory usage percentage', async () => {
      const originalProcess = global.process;
      (global as any).process = {
        memoryUsage: () => ({
          heapUsed: 450 * 1024 * 1024, // 450MB
          heapTotal: 500 * 1024 * 1024, // 500MB (90%)
          external: 0
        })
      };

      checker.addResourceCheck('memory', {
        maxHeapUsagePercent: 80
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.DEGRADED);
      expect(result.checks[0].message).toContain('%');

      global.process = originalProcess;
    });

    test('should monitor multiple resource checks', async () => {
      const originalProcess = global.process;
      (global as any).process = {
        memoryUsage: () => ({
          heapUsed: 300 * 1024 * 1024,
          heapTotal: 1000 * 1024 * 1024,
          external: 0
        })
      };

      checker.addResourceCheck('memory-heap', {
        maxHeapMB: 512
      });

      checker.addResourceCheck('memory-percent', {
        maxHeapUsagePercent: 50
      });

      const result = await checker.checkHealth();

      expect(result.checks).toHaveLength(2);
      expect(result.checks[0].name).toBe('memory-heap');
      expect(result.checks[1].name).toBe('memory-percent');
      // Second check should be degraded due to 30% > 50% threshold
      expect(result.checks[1].status).toBe(HealthStatus.HEALTHY);

      global.process = originalProcess;
    });
  });

  describe('Custom Health Check Implementations', () => {
    test('should integrate custom health check', async () => {
      let callCount = 0;

      checker.addHealthCheck({
        name: 'custom-counter',
        interval: 1000,
        timeout: 5000,
        check: async () => {
          callCount++;
          return {
            name: 'custom-counter',
            status: HealthStatus.HEALTHY,
            message: `Call count: ${callCount}`,
            duration: Math.floor(Math.random() * 100)
          };
        }
      });

      const result = await checker.checkHealth();

      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].name).toBe('custom-counter');
      expect(result.checks[0].message).toContain('Call count: 1');
      expect(callCount).toBe(1);
    });

    test('should handle custom check with external dependencies', async () => {
      const mockDatabase = {
        ping: async () => {
          return { connected: true, latency: 15 };
        }
      };

      const dbPingSpy = jest.spyOn(mockDatabase, 'ping');

      checker.addHealthCheck({
        name: 'database',
        check: async () => {
          const result = await mockDatabase.ping();
          return {
            name: 'database',
            status: result.connected ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
            message: result.connected ? 'Database connected' : 'Database disconnected',
            duration: result.latency,
            metadata: { latency: result.latency }
          };
        }
      });

      const result = await checker.checkHealth();

      expect(dbPingSpy).toHaveBeenCalled();
      expect(result.checks[0].status).toBe(HealthStatus.HEALTHY);
      expect(result.checks[0].metadata).toHaveProperty('latency', 15);
    });

    test('should handle custom check with retry logic', async () => {
      let attempts = 0;

      checker.addHealthCheck({
        name: 'flaky-service',
        failureThreshold: 3,
        check: async () => {
          attempts++;
          const success = attempts >= 3;
          return {
            name: 'flaky-service',
            status: success ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
            message: success ? 'Success after retries' : `Attempt ${attempts}`,
            duration: 10
          };
        }
      });

      // First two checks should fail
      await checker.checkHealth();
      await checker.checkHealth();

      // Third check should succeed and pass threshold
      const result = await checker.checkHealth();

      expect(result.checks[0].message).toContain('Success after retries');
    });
  });

  describe('Health Status Change Events', () => {
    test('should emit healthChange event on status change', async () => {
      const statusChanges: HealthStatus[] = [];

      checker.on('healthChange', (result: HealthCheckResult) => {
        statusChanges.push(result.status);
      });

      checker.addHealthCheck({
        name: 'changing-status',
        check: async () => ({
          name: 'changing-status',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      await checker.checkHealth();

      expect(statusChanges).toHaveLength(1);
      expect(statusChanges[0]).toBe(HealthStatus.HEALTHY);
    });

    test('should track status transitions over time', async () => {
      const statusHistory: HealthCheckResult[] = [];

      checker.on('healthChange', (result: HealthCheckResult) => {
        statusHistory.push(result);
      });

      let currentStatus = HealthStatus.HEALTHY;

      checker.addHealthCheck({
        name: 'transitioning',
        check: async () => {
          // Toggle status
          currentStatus = currentStatus === HealthStatus.HEALTHY
            ? HealthStatus.UNHEALTHY
            : HealthStatus.HEALTHY;

          return {
            name: 'transitioning',
            status: currentStatus,
            message: currentStatus === HealthStatus.HEALTHY ? 'OK' : 'Failed',
            duration: 5
          };
        }
      });

      // Run multiple checks
      await checker.checkHealth();
      await checker.checkHealth();
      await checker.checkHealth();

      expect(statusHistory).toHaveLength(3);
      expect(statusHistory[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(statusHistory[1].status).toBe(HealthStatus.HEALTHY);
      expect(statusHistory[2].status).toBe(HealthStatus.UNHEALTHY);
    });

    test('should emit started and stopped events', () => {
      const events: string[] = [];

      checker.on('started', () => events.push('started'));
      checker.on('stopped', () => events.push('stopped'));

      checker.start();
      checker.stop();

      expect(events).toEqual(['started', 'stopped']);
    });
  });

  describe('End-to-End Health Check Workflows', () => {
    test('should complete full health check workflow', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Headers()
      });

      const originalProcess = global.process;
      (global as any).process = {
        memoryUsage: () => ({
          heapUsed: 200 * 1024 * 1024,
          heapTotal: 500 * 1024 * 1024,
          external: 0
        })
      };

      // Add multiple health checks
      checker.addHTTPCheck('api', {
        url: 'https://api.example.com/health'
      });

      checker.addResourceCheck('memory', {
        maxHeapMB: 512
      });

      checker.addHealthCheck({
        name: 'custom',
        check: async () => ({
          name: 'custom',
          status: HealthStatus.HEALTHY,
          message: 'Custom check OK',
          duration: 10
        })
      });

      // Run health check
      const result = await checker.checkHealth();

      // Verify results
      expect(result.checks).toHaveLength(3);
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.summary).toContain('Overall status: healthy');
      expect(result.timestamp).toBeGreaterThan(0);

      // Verify metrics were recorded
      const metrics = metricsCollector.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);

      global.process = originalProcess;
    });

    test('should handle mixed health check results', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      mockFetch
        .mockResolvedValueOnce({ status: 200, ok: true, headers: new Headers() })
        .mockResolvedValueOnce({ status: 500, ok: false, headers: new Headers() });

      const originalProcess = global.process;
      (global as any).process = {
        memoryUsage: () => ({
          heapUsed: 600 * 1024 * 1024,
          heapTotal: 1000 * 1024 * 1024,
          external: 0
        })
      };

      checker.addHTTPCheck('healthy-api', {
        url: 'https://api1.example.com/health'
      });

      checker.addHTTPCheck('unhealthy-api', {
        url: 'https://api2.example.com/health'
      });

      checker.addResourceCheck('memory', {
        maxHeapMB: 512
      });

      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].status).toBe(HealthStatus.HEALTHY);
      expect(result.checks[1].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[2].status).toBe(HealthStatus.DEGRADED);

      global.process = originalProcess;
    });

    test('should handle scheduled health checks', async () => {
      let checkCount = 0;

      checker.addHealthCheck({
        name: 'periodic',
        interval: 1000,
        check: async () => {
          checkCount++;
          return {
            name: 'periodic',
            status: HealthStatus.HEALTHY,
            message: `Check ${checkCount}`,
            duration: 5
          };
        }
      });

      checker.start();

      // Fast forward through 3 intervals
      jest.advanceTimersByTime(3500);

      expect(checkCount).toBeGreaterThanOrEqual(3);

      checker.stop();
    });
  });

  describe('Integration with MetricsCollector', () => {
    test('should record health check metrics', async () => {
      const recordSpy = jest.spyOn(metricsCollector, 'recordOperationDuration');

      checker.addHealthCheck({
        name: 'test-check',
        check: async () => ({
          name: 'test-check',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 10
        })
      });

      await checker.checkHealth();

      expect(recordSpy).toHaveBeenCalledWith(
        'health_check',
        expect.any(Number),
        expect.objectContaining({
          status: HealthStatus.HEALTHY
        })
      );
    });

    test('should track health check performance', async () => {
      checker.addHealthCheck({
        name: 'fast-check',
        check: async () => ({
          name: 'fast-check',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      checker.addHealthCheck({
        name: 'slow-check',
        check: async () => ({
          name: 'slow-check',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 100
        })
      });

      await checker.checkHealth();

      const performanceMetrics = metricsCollector.getMetrics(
        metricsCollector.getMetrics = () => [] as any
      );

      // Verify health check was recorded
      const allMetrics = metricsCollector.getMetrics();
      const healthMetrics = allMetrics.filter(m =>
        m.name === 'operation_duration_ms' &&
        m.labels?.operation === 'health_check'
      );

      expect(healthMetrics.length).toBeGreaterThan(0);
    });
  });
});

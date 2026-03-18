/**
 * HealthChecker Unit Tests
 *
 * Comprehensive unit tests for the HealthChecker system covering:
 * - All health check types (HTTP, WebSocket, Resource)
 * - Health status calculation and aggregation
 * - Check scheduling and execution
 * - Failure threshold handling
 * - Custom health check implementations
 * - Resource monitoring
 * - Event emission
 * - Edge cases and error handling
 *
 * @version 1.0.0 - Week 5: Testing & Validation
 */

import {
  HealthChecker,
  HealthStatus,
  HealthCheckConfig,
  HealthCheckResult,
  CheckResult,
  HTTPHealthCheckConfig,
  WebSocketHealthCheckConfig,
  ResourceThresholds,
  getHealthChecker,
  resetHealthChecker
} from '../HealthChecker';
import { MetricsCollector } from '../MetricsCollector';

// Mock fetch for HTTP health checks
global.fetch = jest.fn();

describe('HealthChecker', () => {
  let checker: HealthChecker;
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    checker = new HealthChecker({ debug: false });
    metricsCollector = new MetricsCollector();
    resetHealthChecker();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    checker.stop();
    checker.dispose();
    metricsCollector.dispose();
    jest.useRealTimers();
  });

  describe('Constructor & Configuration', () => {
    test('should create checker with default config', () => {
      const defaultChecker = new HealthChecker();
      expect(defaultChecker).toBeInstanceOf(HealthChecker);
      defaultChecker.dispose();
    });

    test('should create checker with custom config', () => {
      const customChecker = new HealthChecker({
        metricsCollector,
        defaultInterval: 30000,
        defaultTimeout: 3000,
        defaultFailureThreshold: 5,
        debug: true
      });

      expect(customChecker).toBeInstanceOf(HealthChecker);
      customChecker.dispose();
    });

    test('should not be running initially', () => {
      expect(checker.isActive()).toBe(false);
    });
  });

  describe('Custom Health Checks', () => {
    test('should add custom health check', () => {
      const checkFn = async () => ({
        name: 'custom',
        status: HealthStatus.HEALTHY,
        message: 'All good',
        duration: 10
      });

      checker.addHealthCheck({
        name: 'custom',
        check: checkFn
      });

      expect(checker.getHealthChecks()).toContain('custom');
    });

    test('should execute custom health check', async () => {
      const checkFn = async () => ({
        name: 'custom',
        status: HealthStatus.HEALTHY,
        message: 'Check passed',
        duration: 5
      });

      checker.addHealthCheck({
        name: 'custom',
        check: checkFn
      });

      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].name).toBe('custom');
    });

    test('should handle failing custom health check', async () => {
      const checkFn = async () => ({
        name: 'failing',
        status: HealthStatus.UNHEALTHY,
        message: 'Check failed',
        duration: 5
      });

      checker.addHealthCheck({
        name: 'failing',
        check: checkFn
      });

      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
    });

    test('should handle check that throws error', async () => {
      const checkFn = async () => {
        throw new Error('Check error');
      };

      checker.addHealthCheck({
        name: 'error',
        check: checkFn
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].message).toContain('Check error');
    });

    test('should use custom interval and timeout', async () => {
      const checkFn = async () => ({
        name: 'custom',
        status: HealthStatus.HEALTHY,
        message: 'OK',
        duration: 5
      });

      checker.addHealthCheck({
        name: 'custom',
        interval: 10000,
        timeout: 2000,
        check: checkFn
      });

      expect(checker.getHealthChecks()).toContain('custom');
    });

    test('should use custom failure threshold', async () => {
      let failCount = 0;
      const checkFn = async () => {
        failCount++;
        return {
          name: 'flaky',
          status: HealthStatus.UNHEALTHY,
          message: 'Failing',
          duration: 5
        };
      };

      checker.addHealthCheck({
        name: 'flaky',
        failureThreshold: 3,
        check: checkFn
      });

      // First 2 failures should not mark as unhealthy
      await checker.checkHealth();
      await checker.checkHealth();

      let result = await checker.checkHealth();
      expect(result.checks[0].message).toContain('failed 3 times');
    });
  });

  describe('HTTP Health Checks', () => {
    test('should add HTTP health check', () => {
      checker.addHTTPCheck('api', {
        url: 'https://api.example.com/health'
      });

      expect(checker.getHealthChecks()).toContain('api');
    });

    test('should execute HTTP health check successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true
      });

      checker.addHTTPCheck('api', {
        url: 'https://api.example.com/health'
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.HEALTHY);
      expect(result.checks[0].message).toBe('HTTP 200 OK');
    });

    test('should handle HTTP error status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 500,
        ok: false
      });

      checker.addHTTPCheck('api', {
        url: 'https://api.example.com/health'
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].message).toContain('Unexpected status: 500');
    });

    test('should handle network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      checker.addHTTPCheck('api', {
        url: 'https://api.example.com/health'
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].message).toContain('Network error');
    });

    test('should use custom expected status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 204,
        ok: true
      });

      checker.addHTTPCheck('api', {
        url: 'https://api.example.com/health',
        expectedStatus: 204
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.HEALTHY);
    });

    test('should include custom headers in request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true
      });

      checker.addHTTPCheck('api', {
        url: 'https://api.example.com/health',
        headers: {
          'Authorization': 'Bearer token',
          'X-Custom-Header': 'value'
        }
      });

      await checker.checkHealth();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/health',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token',
            'X-Custom-Header': 'value'
          })
        })
      );
    });

    test('should timeout HTTP request', async () => {
      // Use real timers for this test since we need actual timeout behavior
      jest.useRealTimers();

      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise(() => {}) // Never resolves
      );

      checker.addHTTPCheck('api', {
        url: 'https://api.example.com/health',
        timeout: 100
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].message).toContain('timeout');

      // Reset to fake timers for other tests
      jest.useFakeTimers();
    }, 20000);
  });

  describe('WebSocket Health Checks', () => {
    test('should add WebSocket health check', () => {
      checker.addWebSocketCheck('ws', {
        url: 'wss://example.com/ws'
      });

      expect(checker.getHealthChecks()).toContain('ws');
    });

    test('should check connected WebSocket', async () => {
      const wsRef = { ws: null, connected: true };

      checker.addWebSocketCheck('ws', {
        url: 'wss://example.com/ws',
        expectConnected: true
      }, wsRef);

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.HEALTHY);
      expect(result.checks[0].message).toBe('WebSocket connected');
    });

    test('should check disconnected WebSocket', async () => {
      const wsRef = { ws: null, connected: false };

      checker.addWebSocketCheck('ws', {
        url: 'wss://example.com/ws',
        expectConnected: false
      }, wsRef);

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.HEALTHY);
      expect(result.checks[0].message).toBe('WebSocket disconnected');
    });

    test('should detect unexpected WebSocket state', async () => {
      const wsRef = { ws: null, connected: false };

      checker.addWebSocketCheck('ws', {
        url: 'wss://example.com/ws',
        expectConnected: true
      }, wsRef);

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].message).toContain('unexpected state');
    });

    test('should handle missing WebSocket reference', async () => {
      checker.addWebSocketCheck('ws', {
        url: 'wss://example.com/ws'
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.UNKNOWN);
      expect(result.checks[0].message).toContain('reference not provided');
    });

    test('should include metadata in WebSocket check result', async () => {
      const wsRef = { ws: null, connected: true };

      checker.addWebSocketCheck('ws', {
        url: 'wss://example.com/ws'
      }, wsRef);

      const result = await checker.checkHealth();

      expect(result.checks[0].metadata).toHaveProperty('url', 'wss://example.com/ws');
      expect(result.checks[0].metadata).toHaveProperty('connected', true);
    });
  });

  describe('Resource Health Checks', () => {
    test('should add resource health check', () => {
      checker.addResourceCheck('memory', {
        maxHeapMB: 512,
        maxHeapUsagePercent: 80
      });

      expect(checker.getHealthChecks()).toContain('memory');
    });

    test('should check healthy memory usage', async () => {
      const originalProcess = global.process;
      (global as any).process = {
        memoryUsage: () => ({
          heapUsed: 100 * 1024 * 1024, // 100MB
          heapTotal: 500 * 1024 * 1024, // 500MB
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

      global.process = originalProcess;
    });

    test('should detect high heap usage', async () => {
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

    test('should detect high heap usage percentage', async () => {
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

    test('should handle missing process.memoryUsage', async () => {
      const originalProcess = global.process;
      delete (global as any).process;

      checker.addResourceCheck('memory', {
        maxHeapMB: 512
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].status).toBe(HealthStatus.UNKNOWN);
      expect(result.checks[0].message).toContain('not available');

      global.process = originalProcess;
    });

    test('should include memory metadata in result', async () => {
      const originalProcess = global.process;
      (global as any).process = {
        memoryUsage: () => ({
          heapUsed: 100 * 1024 * 1024,
          heapTotal: 500 * 1024 * 1024,
          external: 0
        })
      };

      checker.addResourceCheck('memory', {
        maxHeapMB: 512
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].metadata).toHaveProperty('heapUsedMB');
      expect(result.checks[0].metadata).toHaveProperty('heapTotalMB');
      expect(result.checks[0].metadata).toHaveProperty('heapUsagePercent');

      global.process = originalProcess;
    });
  });

  describe('Health Status Calculation', () => {
    test('should calculate HEALTHY status when all checks pass', async () => {
      checker.addHealthCheck({
        name: 'check1',
        check: async () => ({
          name: 'check1',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      checker.addHealthCheck({
        name: 'check2',
        check: async () => ({
          name: 'check2',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.HEALTHY);
    });

    test('should calculate DEGRADED status when some checks degraded', async () => {
      checker.addHealthCheck({
        name: 'check1',
        check: async () => ({
          name: 'check1',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      checker.addHealthCheck({
        name: 'check2',
        check: async () => ({
          name: 'check2',
          status: HealthStatus.DEGRADED,
          message: 'Warning',
          duration: 5
        })
      });

      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.DEGRADED);
    });

    test('should calculate UNHEALTHY status when any check fails', async () => {
      checker.addHealthCheck({
        name: 'check1',
        check: async () => ({
          name: 'check1',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      checker.addHealthCheck({
        name: 'check2',
        check: async () => ({
          name: 'check2',
          status: HealthStatus.UNHEALTHY,
          message: 'Failed',
          duration: 5
        })
      });

      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
    });

    test('should return UNKNOWN status when no checks', async () => {
      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.UNKNOWN);
      expect(result.checks).toHaveLength(0);
    });

    test('should prioritize UNHEALTHY over DEGRADED', async () => {
      checker.addHealthCheck({
        name: 'check1',
        check: async () => ({
          name: 'check1',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      checker.addHealthCheck({
        name: 'check2',
        check: async () => ({
          name: 'check2',
          status: HealthStatus.DEGRADED,
          message: 'Warning',
          duration: 5
        })
      });

      checker.addHealthCheck({
        name: 'check3',
        check: async () => ({
          name: 'check3',
          status: HealthStatus.UNHEALTHY,
          message: 'Failed',
          duration: 5
        })
      });

      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
    });
  });

  describe('Health Summary Generation', () => {
    test('should generate summary for all healthy', async () => {
      for (let i = 1; i <= 3; i++) {
        checker.addHealthCheck({
          name: `check${i}`,
          check: async () => ({
            name: `check${i}`,
            status: HealthStatus.HEALTHY,
            message: 'OK',
            duration: 5
          })
        });
      }

      const result = await checker.checkHealth();

      expect(result.summary).toContain('Overall status: healthy');
      expect(result.summary).toContain('3 healthy');
    });

    test('should generate summary for mixed status', async () => {
      checker.addHealthCheck({
        name: 'check1',
        check: async () => ({
          name: 'check1',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      checker.addHealthCheck({
        name: 'check2',
        check: async () => ({
          name: 'check2',
          status: HealthStatus.DEGRADED,
          message: 'Warning',
          duration: 5
        })
      });

      checker.addHealthCheck({
        name: 'check3',
        check: async () => ({
          name: 'check3',
          status: HealthStatus.UNHEALTHY,
          message: 'Failed',
          duration: 5
        })
      });

      const result = await checker.checkHealth();

      expect(result.summary).toContain('1 healthy');
      expect(result.summary).toContain('1 degraded');
      expect(result.summary).toContain('1 unhealthy');
    });
  });

  describe('Scheduling & Execution', () => {
    test('should start health checker', () => {
      checker.addHealthCheck({
        name: 'test',
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      checker.start();

      expect(checker.isActive()).toBe(true);
    });

    test('should stop health checker', () => {
      checker.addHealthCheck({
        name: 'test',
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      checker.start();
      checker.stop();

      expect(checker.isActive()).toBe(false);
    });

    test('should emit started event', () => {
      const startSpy = jest.fn();
      checker.on('started', startSpy);

      checker.start();

      expect(startSpy).toHaveBeenCalled();
    });

    test('should emit stopped event', () => {
      const stopSpy = jest.fn();
      checker.on('stopped', stopSpy);

      checker.start();
      checker.stop();

      expect(stopSpy).toHaveBeenCalled();
    });

    test('should schedule checks after starting', async () => {
      const checkFn = jest.fn(async () => ({
        name: 'test',
        status: HealthStatus.HEALTHY,
        message: 'OK',
        duration: 5
      }));

      checker.addHealthCheck({
        name: 'test',
        interval: 1000,
        check: checkFn
      });

      checker.start();

      // Fast forward time
      jest.advanceTimersByTime(1500);

      expect(checkFn).toHaveBeenCalled();

      checker.stop();
    });

    test('should reschedule checks after execution', async () => {
      // Use real timers for this test to avoid fake timer complexity
      jest.useRealTimers();

      const checkFn = jest.fn(async () => ({
        name: 'test',
        status: HealthStatus.HEALTHY,
        message: 'OK',
        duration: 5
      }));

      checker.addHealthCheck({
        name: 'test',
        interval: 50,
        check: checkFn
      });

      checker.start();

      // Wait for checks to run (first runs immediately, then at 50ms, 100ms, 150ms)
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(checkFn).toHaveBeenCalledTimes(3);

      checker.stop();

      // Reset to fake timers for other tests
      jest.useFakeTimers();
    });

    test('should not schedule checks when stopped', async () => {
      const checkFn = jest.fn(async () => ({
        name: 'test',
        status: HealthStatus.HEALTHY,
        message: 'OK',
        duration: 5
      }));

      checker.addHealthCheck({
        name: 'test',
        interval: 1000,
        check: checkFn
      });

      // Don't start checker
      jest.advanceTimersByTime(2000);

      expect(checkFn).not.toHaveBeenCalled();
    });
  });

  describe('Health Check Removal', () => {
    test('should remove health check', () => {
      checker.addHealthCheck({
        name: 'test',
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      expect(checker.getHealthChecks()).toContain('test');

      checker.removeHealthCheck('test');

      expect(checker.getHealthChecks()).not.toContain('test');
    });

    test('should clear timer when removing check', () => {
      checker.addHealthCheck({
        name: 'test',
        interval: 1000,
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      checker.start();
      checker.removeHealthCheck('test');

      // Should not cause issues
      jest.advanceTimersByTime(2000);

      checker.stop();
    });

    test('should handle removing non-existent check', () => {
      expect(() => {
        checker.removeHealthCheck('non-existent');
      }).not.toThrow();
    });
  });

  describe('Last Result Tracking', () => {
    test('should track last check result', async () => {
      checker.addHealthCheck({
        name: 'test',
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 10
        })
      });

      await checker.checkHealth();

      const lastResult = checker.getLastResult('test');

      expect(lastResult).toBeDefined();
      expect(lastResult?.name).toBe('test');
      expect(lastResult?.status).toBe(HealthStatus.HEALTHY);
    });

    test('should return undefined for non-existent check', () => {
      const lastResult = checker.getLastResult('non-existent');
      expect(lastResult).toBeUndefined();
    });

    test('should update last result on each check', async () => {
      let count = 0;
      checker.addHealthCheck({
        name: 'test',
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: `Check ${++count}`,
          duration: 5
        })
      });

      await checker.checkHealth();
      await checker.checkHealth();

      const lastResult = checker.getLastResult('test');
      expect(lastResult?.message).toBe('Check 2');
    });
  });

  describe('Event Emission', () => {
    test('should emit healthChange event', async () => {
      const changeSpy = jest.fn();
      checker.on('healthChange', changeSpy);

      checker.addHealthCheck({
        name: 'test',
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      await checker.checkHealth();

      expect(changeSpy).toHaveBeenCalled();
      const emittedResult = changeSpy.mock.calls[0][0] as HealthCheckResult;
      expect(emittedResult.status).toBe(HealthStatus.HEALTHY);
    });

    test('should record health metrics when metrics collector provided', async () => {
      const recordSpy = jest.spyOn(metricsCollector, 'recordOperationDuration');

      const checkerWithMetrics = new HealthChecker({
        metricsCollector
      });

      checkerWithMetrics.addHealthCheck({
        name: 'test',
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      await checkerWithMetrics.checkHealth();

      expect(recordSpy).toHaveBeenCalledWith(
        'health_check',
        expect.any(Number),
        expect.objectContaining({
          status: HealthStatus.HEALTHY
        })
      );

      checkerWithMetrics.dispose();
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance from getHealthChecker', () => {
      const instance1 = getHealthChecker();
      const instance2 = getHealthChecker();

      expect(instance1).toBe(instance2);

      resetHealthChecker();
    });

    test('should reset global instance', () => {
      const instance1 = getHealthChecker();
      resetHealthChecker();
      const instance2 = getHealthChecker();

      expect(instance1).not.toBe(instance2);

      resetHealthChecker();
    });
  });

  describe('Disposal', () => {
    test('should dispose and cleanup resources', () => {
      checker.addHealthCheck({
        name: 'test',
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      checker.dispose();

      expect(checker.getHealthChecks()).toHaveLength(0);
      expect(checker.isActive()).toBe(false);
    });

    test('should stop checker on disposal', () => {
      checker.addHealthCheck({
        name: 'test',
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      checker.start();
      checker.dispose();

      expect(checker.isActive()).toBe(false);
    });

    test('should remove all event listeners on dispose', () => {
      const eventSpy = jest.fn();
      checker.on('healthChange', eventSpy);

      checker.dispose();

      // Add health check after disposal (for testing)
      checker.addHealthCheck({
        name: 'test',
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      // Event should not fire
      checker.checkHealth();

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases & Error Handling', () => {
    test('should handle check with very long duration', async () => {
      checker.addHealthCheck({
        name: 'slow',
        check: async () => ({
          name: 'slow',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: Number.MAX_SAFE_INTEGER
        })
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].duration).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('should handle check with zero duration', async () => {
      checker.addHealthCheck({
        name: 'instant',
        check: async () => ({
          name: 'instant',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 0
        })
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].duration).toBe(0);
    });

    test('should handle check with negative duration', async () => {
      checker.addHealthCheck({
        name: 'negative',
        check: async () => ({
          name: 'negative',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: -100
        })
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].duration).toBe(-100);
    });

    test('should handle very long check name', () => {
      const longName = 'a'.repeat(1000);

      expect(() => {
        checker.addHealthCheck({
          name: longName,
          check: async () => ({
            name: longName,
            status: HealthStatus.HEALTHY,
            message: 'OK',
            duration: 5
          })
        });
      }).not.toThrow();
    });

    test('should handle very long message', async () => {
      const longMessage = 'b'.repeat(10000);

      checker.addHealthCheck({
        name: 'test',
        check: async () => ({
          name: 'test',
          status: HealthStatus.HEALTHY,
          message: longMessage,
          duration: 5
        })
      });

      const result = await checker.checkHealth();

      expect(result.checks[0].message).toBe(longMessage);
    });
  });
});

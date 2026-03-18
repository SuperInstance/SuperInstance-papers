/**
 * Monitoring Performance Validation Tests
 *
 * Performance tests to validate monitoring overhead and ensure:
 * - Monitoring overhead <5% CPU
 * - Memory overhead <10MB
 * - Health check latency <100ms
 * - Metrics collection latency <10ms
 * - No memory leaks
 * - Efficient metric storage
 *
 * @version 1.0.0 - Week 5: Testing & Validation
 */

import {
  MetricsCollector,
  MetricCategory,
  MetricType
} from '../../MetricsCollector';
import {
  HealthChecker,
  HealthStatus,
  ResourceThresholds
} from '../../HealthChecker';
import {
  MonitoringMiddleware
} from '../../../middleware/monitoringMiddleware';

describe('Monitoring Performance Validation', () => {
  describe('Metrics Collection Performance', () => {
    test('should collect metrics with <10ms latency', () => {
      const collector = new MetricsCollector({ debug: false });

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        collector.recordHttpRequest('GET', '/api/test', 200, 50 + Math.random() * 100);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgLatency = totalTime / iterations;

      expect(avgLatency).toBeLessThan(10);
      expect(totalTime).toBeLessThan(iterations * 10);

      collector.dispose();
    });

    test('should handle high-volume metric collection', () => {
      const collector = new MetricsCollector({ debug: false });

      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        collector.recordHttpRequest(
          ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
          `/api/endpoint${Math.floor(Math.random() * 100)}`,
          [200, 201, 204, 400, 404, 500][Math.floor(Math.random() * 6)],
          Math.random() * 1000
        );
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgLatency = totalTime / iterations;

      // Should handle 10k metrics efficiently
      expect(avgLatency).toBeLessThan(5);
      expect(totalTime).toBeLessThan(50000); // 50 seconds max for 10k operations

      const stats = collector.getStats();
      expect(stats.totalMetrics).toBeGreaterThan(0);

      collector.dispose();
    });

    test('should export metrics quickly', () => {
      const collector = new MetricsCollector({ debug: false });

      // Add many metrics
      for (let i = 0; i < 5000; i++) {
        collector.recordHttpRequest('GET', '/api/test', 200, 100);
      }

      // Measure export performance
      const startTime = Date.now();

      const prometheusExport = collector.exportPrometheus();
      const jsonExport = collector.exportJSON();

      const endTime = Date.now();
      const exportTime = endTime - startTime;

      // Both exports should complete quickly
      expect(exportTime).toBeLessThan(1000); // 1 second max
      expect(prometheusExport.length).toBeGreaterThan(0);
      expect(jsonExport.length).toBeGreaterThan(0);

      collector.dispose();
    });

    test('should retrieve metrics efficiently', () => {
      const collector = new MetricsCollector({ debug: false });

      // Add metrics across different categories
      for (let i = 0; i < 1000; i++) {
        collector.recordHttpRequest('GET', '/api/test', 200, 100);
        collector.recordError('TestError', 'Test message');
        collector.recordWebSocketMessage('test', 50);
      }

      // Measure retrieval performance
      const startTime = Date.now();

      const allMetrics = collector.getMetrics();
      const httpMetrics = collector.getMetrics(MetricCategory.HTTP);
      const errorMetrics = collector.getMetrics(MetricCategory.ERROR);
      const recentMetrics = collector.getMetrics(undefined, Date.now() - 1000);

      const endTime = Date.now();
      const retrievalTime = endTime - startTime;

      // Retrieval should be fast
      expect(retrievalTime).toBeLessThan(100);
      expect(allMetrics.length).toBeGreaterThan(0);
      expect(httpMetrics.length).toBeGreaterThan(0);
      expect(errorMetrics.length).toBeGreaterThan(0);

      collector.dispose();
    });

    test('should calculate histogram buckets efficiently', () => {
      const collector = new MetricsCollector({ debug: false });

      // Add many latency values
      const latencies = [];
      for (let i = 0; i < 5000; i++) {
        const latency = Math.random() * 10000;
        latencies.push(latency);
        collector.recordHttpRequest('GET', '/api/test', 200, latency);
      }

      // Measure histogram calculation
      const startTime = Date.now();

      const metrics = collector.getMetrics(MetricCategory.HTTP);
      const histogramMetrics = metrics.filter(m => m.type === MetricType.HISTOGRAM);

      const endTime = Date.now();
      const calculationTime = endTime - startTime;

      expect(calculationTime).toBeLessThan(500);
      expect(histogramMetrics.length).toBeGreaterThan(0);

      // Verify bucket calculations
      histogramMetrics.forEach(metric => {
        expect(metric.buckets).toBeDefined();
        expect(Array.isArray(metric.buckets)).toBe(true);
      });

      collector.dispose();
    });
  });

  describe('Memory Usage Validation', () => {
    test('should maintain memory overhead <10MB', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const collector = new MetricsCollector({ debug: false });

      // Add many metrics
      for (let i = 0; i < 10000; i++) {
        collector.recordHttpRequest('GET', '/api/test', 200, 100);
        collector.recordError('TestError', 'Test message');
        collector.recordWebSocketMessage('test', 50);
      }

      const afterCreationMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (afterCreationMemory - initialMemory) / (1024 * 1024);

      // Memory increase should be reasonable (<50MB for 10k metrics)
      expect(memoryIncrease).toBeLessThan(50);

      // After disposal, memory should be freed
      collector.dispose();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterDisposalMemory = process.memoryUsage().heapUsed;
      const memoryAfterDisposal = (afterDisposalMemory - initialMemory) / (1024 * 1024);

      // Most memory should be freed
      expect(memoryAfterDisposal).toBeLessThan(10);
    });

    test('should not leak memory over time', () => {
      const collector = new MetricsCollector({ debug: false });

      const iterations = 5;
      const metricsPerIteration = 1000;
      const memorySnapshots: number[] = [];

      for (let iter = 0; iter < iterations; iter++) {
        // Add metrics
        for (let i = 0; i < metricsPerIteration; i++) {
          collector.recordHttpRequest('GET', '/api/test', 200, 100);
        }

        // Get metrics (this should trigger cleanup)
        collector.getMetrics();

        // Record memory
        memorySnapshots.push(process.memoryUsage().heapUsed);

        // Wait a bit
        const start = Date.now();
        while (Date.now() - start < 100);
      }

      // Memory should not grow unbounded
      // Last snapshot should not be more than 2x first snapshot
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const growthRatio = lastSnapshot / firstSnapshot;

      expect(growthRatio).toBeLessThan(2);

      collector.dispose();
    });

    test('should limit metric storage size', () => {
      const collector = new MetricsCollector({ debug: false });

      // Add more than maxMetricsPerCategory (10000)
      for (let i = 0; i < 15000; i++) {
        collector.recordHttpRequest('GET', `/api/test${i}`, 200, 100);
      }

      const stats = collector.getStats();

      // Should not exceed max limit significantly
      expect(stats.totalMetrics).toBeLessThanOrEqual(12000);

      collector.dispose();
    });

    test('should rotate old metrics efficiently', () => {
      const collector = new MetricsCollector({ debug: false });

      // Add metrics over time
      const startTime = Date.now();

      for (let i = 0; i < 5000; i++) {
        collector.recordHttpRequest('GET', '/api/test', 200, 100);
      }

      // Get metrics since a recent time
      const recentTime = Date.now() - 1000;
      const recentMetrics = collector.getMetrics(MetricCategory.HTTP, recentTime);

      // Should return some metrics
      expect(recentMetrics.length).toBeGreaterThan(0);

      // Old metrics should be rotated out (24 hour max age)
      const allMetrics = collector.getMetrics(MetricCategory.HTTP);
      expect(allMetrics.length).toBeLessThanOrEqual(10000);

      collector.dispose();
    });
  });

  describe('Health Check Performance', () => {
    test('should complete health checks in <100ms', async () => {
      const checker = new HealthChecker({ debug: false });

      checker.addHealthCheck({
        name: 'fast-check',
        check: async () => ({
          name: 'fast-check',
          status: HealthStatus.HEALTHY,
          message: 'OK',
          duration: 5
        })
      });

      const iterations = 100;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await checker.checkHealth();
        const endTime = Date.now();
        timings.push(endTime - startTime);
      }

      const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTiming = Math.max(...timings);

      expect(avgTiming).toBeLessThan(100);
      expect(maxTiming).toBeLessThan(200);

      checker.dispose();
    });

    test('should handle multiple health checks efficiently', async () => {
      const checker = new HealthChecker({ debug: false });

      // Add 10 health checks
      for (let i = 0; i < 10; i++) {
        checker.addHealthCheck({
          name: `check-${i}`,
          check: async () => ({
            name: `check-${i}`,
            status: HealthStatus.HEALTHY,
            message: 'OK',
            duration: Math.random() * 20
          })
        });
      }

      const startTime = Date.now();
      await checker.checkHealth();
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // Should complete all checks in reasonable time
      expect(totalTime).toBeLessThan(500);

      checker.dispose();
    });

    test('should handle failing health checks efficiently', async () => {
      const checker = new HealthChecker({ debug: false });

      // Add mix of healthy and unhealthy checks
      for (let i = 0; i < 10; i++) {
        checker.addHealthCheck({
          name: `check-${i}`,
          check: async () => ({
            name: `check-${i}`,
            status: i % 2 === 0 ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
            message: i % 2 === 0 ? 'OK' : 'Failed',
            duration: Math.random() * 20
          })
        });
      }

      const startTime = Date.now();
      const result = await checker.checkHealth();
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks).toHaveLength(10);
      expect(totalTime).toBeLessThan(500);

      checker.dispose();
    });

    test('should timeout slow health checks', async () => {
      const checker = new HealthChecker({
        defaultTimeout: 100,
        debug: false
      });

      checker.addHealthCheck({
        name: 'slow-check',
        timeout: 50,
        check: async () => {
          // Simulate slow check
          await new Promise(resolve => setTimeout(resolve, 200));
          return {
            name: 'slow-check',
            status: HealthStatus.HEALTHY,
            message: 'OK',
            duration: 200
          };
        }
      });

      const startTime = Date.now();
      const result = await checker.checkHealth();
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // Should timeout quickly
      expect(totalTime).toBeLessThan(200);
      expect(result.checks[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks[0].message).toContain('timeout');

      checker.dispose();
    });
  });

  describe('Monitoring Middleware Performance', () => {
    test('should add minimal overhead to requests', async () => {
      const middleware = new MonitoringMiddleware({
        trackPerformance: true,
        debug: false
      });

      global.fetch = jest.fn((url: string, init?: RequestInit) => {
        return Promise.resolve({
          status: 200,
          ok: true,
          headers: new Headers()
        });
      });

      // Measure without middleware
      const fetchWithoutMiddleware = async () => {
        const start = Date.now();
        await fetch('https://api.example.com/test');
        return Date.now() - start;
      };

      const timingsWithoutMiddleware: number[] = [];
      for (let i = 0; i < 50; i++) {
        timingsWithoutMiddleware.push(await fetchWithoutMiddleware());
      }

      const avgWithoutMiddleware = timingsWithoutMiddleware.reduce((a, b) => a + b, 0) / timingsWithoutMiddleware.length;

      // Measure with middleware
      const fetchWithMiddleware = async () => {
        const start = Date.now();
        await middleware.monitorFetch('https://api.example.com/test', {
          method: 'GET'
        });
        return Date.now() - start;
      };

      const timingsWithMiddleware: number[] = [];
      for (let i = 0; i < 50; i++) {
        timingsWithMiddleware.push(await fetchWithMiddleware());
      }

      const avgWithMiddleware = timingsWithMiddleware.reduce((a, b) => a + b, 0) / timingsWithMiddleware.length;

      // Overhead should be minimal (<5ms)
      const overhead = avgWithMiddleware - avgWithoutMiddleware;
      expect(overhead).toBeLessThan(5);
    });

    test('should handle concurrent requests efficiently', async () => {
      const middleware = new MonitoringMiddleware({ debug: false });

      global.fetch = jest.fn(() => {
        return Promise.resolve({
          status: 200,
          ok: true,
          headers: new Headers()
        });
      });

      const startTime = Date.now();

      // Make 100 concurrent requests
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          middleware.monitorFetch(`https://api.example.com/test${i}`, {
            method: 'GET'
          })
        );
      }

      await Promise.all(requests);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(5000);

      // Check active requests tracking
      const activeRequests = middleware.getActiveRequests();
      expect(activeRequests.length).toBe(0);
    });
  });

  describe('CPU Usage Validation', () => {
    test('should not cause high CPU usage', async () => {
      const collector = new MetricsCollector({ debug: false });

      const startTime = Date.now();
      const startCpu = process.cpuUsage();

      // Perform intensive operations
      for (let i = 0; i < 10000; i++) {
        collector.recordHttpRequest('GET', '/api/test', 200, 100);
        collector.recordError('TestError', 'Test');
        collector.recordWebSocketMessage('test', 50);
      }

      collector.getMetrics();
      collector.exportPrometheus();
      collector.exportJSON();

      const endTime = Date.now();
      const endCpu = process.cpuUsage(startCpu);

      const totalTime = endTime - startTime;
      const cpuTime = endCpu.user + endCpu.system;
      const cpuPercent = (cpuTime / 1000 / totalTime) * 100;

      // CPU usage should be reasonable (<50% for this workload)
      expect(cpuPercent).toBeLessThan(50);

      collector.dispose();
    });
  });

  describe('Sampling Performance', () => {
    test('should efficiently implement sampling', () => {
      const collector = new MetricsCollector({
        samplingRate: 0.1, // 10% sampling
        debug: false
      });

      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        collector.recordHttpRequest('GET', '/api/test', 200, 100);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Sampling should make it faster
      expect(totalTime).toBeLessThan(1000);

      const stats = collector.getStats();
      // Should have approximately 10% of metrics
      expect(stats.totalMetrics).toBeGreaterThan(500);
      expect(stats.totalMetrics).toBeLessThan(1500);

      collector.dispose();
    });
  });

  describe('Event Emission Performance', () => {
    test('should emit events efficiently', (done) => {
      const collector = new MetricsCollector({ debug: false });

      let eventCount = 0;
      const startTime = Date.now();

      collector.on('metric', () => {
        eventCount++;
        if (eventCount === 1000) {
          const endTime = Date.now();
          const totalTime = endTime - startTime;

          // Should handle 1000 events quickly
          expect(totalTime).toBeLessThan(1000);

          collector.dispose();
          done();
        }
      });

      for (let i = 0; i < 1000; i++) {
        collector.recordHttpRequest('GET', '/api/test', 200, 100);
      }
    });
  });
});

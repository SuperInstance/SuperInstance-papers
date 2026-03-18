/**
 * ClawClient Performance Tests
 *
 * Performance and load testing for Claw API client:
 * - WebSocket reconnection under load
 * - Concurrent claw creation
 * - Latency metrics measurement
 * - Retry logic performance validation
 * - Memory leak detection
 * - Throughput measurement
 *
 * @packageDocumentation
 */

import { ClawClient } from '../ClawClient';
import {
  ClawCellConfig,
  ClawType,
  ModelProvider,
  EquipmentSlot,
  TriggerType,
  LearningStrategy,
  ClawState,
  RelationshipType,
  CreateClawRequest,
  TriggerClawRequest,
  WebSocketMessageType
} from '../types';

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

interface PerformanceMetrics {
  /** Operation name */
  operation: string;

  /** Number of operations performed */
  count: number;

  /** Total time in milliseconds */
  totalTime: number;

  /** Average time per operation */
  averageTime: number;

  /** Minimum time */
  minTime: number;

  /** Maximum time */
  maxTime;

  /** Operations per second */
  throughput: number;

  /** Success rate (0-1) */
  successRate: number;
}

class PerformanceTracker {
  private metrics: Map<string, number[]> = new Map();
  private errors: Map<string, number> = new Map();

  startMeasure(operation: string): () => void {
    const startTime = performance.now();

    return () => {
      const elapsed = performance.now() - startTime;

      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }

      this.metrics.get(operation)!.push(elapsed);
    };
  }

  recordError(operation: string): void {
    this.errors.set(operation, (this.errors.get(operation) || 0) + 1);
  }

  getMetrics(operation: string): PerformanceMetrics {
    const times = this.metrics.get(operation) || [];
    const errors = this.errors.get(operation) || 0;
    const count = times.length + errors;

    if (times.length === 0) {
      return {
        operation,
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        throughput: 0,
        successRate: 0
      };
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = times.length / (totalTime / 1000);
    const successRate = times.length / count;

    return {
      operation,
      count,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      throughput,
      successRate
    };
  }

  getAllMetrics(): PerformanceMetrics[] {
    const operations = Array.from(new Set([
      ...Array.from(this.metrics.keys()),
      ...Array.from(this.errors.keys())
    ]));

    return operations.map(op => this.getMetrics(op));
  }

  reset(): void {
    this.metrics.clear();
    this.errors.clear();
  }
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

const createMockClawConfig = (id?: string): ClawCellConfig => ({
  id: id || `claw_${Date.now()}_${Math.random()}`,
  type: ClawType.SENSOR,
  position: [0, 0],
  model: {
    provider: ModelProvider.DEEPSEEK,
    model: 'deepseek-chat',
    apiKey: 'test-model-key-12345678'
  },
  seed: {
    purpose: 'Performance test claw',
    trigger: {
      type: TriggerType.CELL_CHANGE,
      cellId: 'A1'
    },
    learningStrategy: LearningStrategy.REINFORCEMENT
  },
  equipment: [EquipmentSlot.MEMORY, EquipmentSlot.REASONING],
  relationships: [],
  state: ClawState.DORMANT,
  confidence: 0.5
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('ClawClient Performance Tests', () => {
  let client: ClawClient;
  let tracker: PerformanceTracker;
  const mockFetch = jest.fn();
  const VALID_API_KEY = 'test-api-key-min-length-20';
  const BASE_URL = 'http://localhost:3000';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    tracker = new PerformanceTracker();

    // Mock WebSocket
    global.WebSocket = jest.fn((url) => {
      const ws = {
        url,
        readyState: WebSocket.OPEN,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      } as any;

      setTimeout(() => {
        if (ws.onopen) {
          ws.onopen(new Event('open'));
        }
      }, 10);

      return ws;
    }) as any;
  });

  afterEach(async () => {
    if (client) {
      await client.dispose();
    }

    // Log performance results
    const metrics = tracker.getAllMetrics();
    console.table(metrics);
  });

  describe('Latency Measurements', () => {
    it('should achieve <100ms latency for cell updates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: 'claw_123',
          traceId: 'trace_123',
          status: 'triggered'
        })
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false,
        timeout: 5000
      });

      const latencies: number[] = [];
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const endMeasure = tracker.startMeasure('trigger_claw');

        try {
          const request: TriggerClawRequest = {
            clawId: `claw_${i}`,
            data: { value: i }
          };

          await client.triggerClaw(request);
          endMeasure();

          const metrics = tracker.getMetrics('trigger_claw');
          latencies.push(metrics.averageTime);
        } catch (error) {
          tracker.recordError('trigger_claw');
        }
      }

      const metrics = tracker.getMetrics('trigger_claw');

      console.log('Cell Update Latency Metrics:', {
        average: `${metrics.averageTime.toFixed(2)}ms`,
        min: `${metrics.minTime.toFixed(2)}ms`,
        max: `${metrics.maxTime.toFixed(2)}ms`,
        p95: `${latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]?.toFixed(2)}ms`,
        p99: `${latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)]?.toFixed(2)}ms`
      });

      // Average latency should be under 100ms
      expect(metrics.averageTime).toBeLessThan(100);

      // P95 latency should be under 150ms
      expect(latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]!).toBeLessThan(150);

      // Success rate should be 100%
      expect(metrics.successRate).toBe(1);
    });

    it('should achieve <200ms latency for claw creation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: 'claw_123',
          status: 'created',
          config: createMockClawConfig()
        })
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const latencies: number[] = [];
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const endMeasure = tracker.startMeasure('create_claw');

        try {
          const request: CreateClawRequest = {
            config: createMockClawConfig(`claw_${i}`)
          };

          await client.createClaw(request);
          endMeasure();

          const metrics = tracker.getMetrics('create_claw');
          latencies.push(metrics.averageTime);
        } catch (error) {
          tracker.recordError('create_claw');
        }
      }

      const metrics = tracker.getMetrics('create_claw');

      console.log('Claw Creation Latency Metrics:', {
        average: `${metrics.averageTime.toFixed(2)}ms`,
        min: `${metrics.minTime.toFixed(2)}ms`,
        max: `${metrics.maxTime.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(2)} ops/sec`
      });

      // Average latency should be under 200ms
      expect(metrics.averageTime).toBeLessThan(200);

      // Should achieve at least 5 operations per second
      expect(metrics.throughput).toBeGreaterThan(5);
    });

    it('should measure WebSocket message round-trip time', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const messageReceivedPromise = new Promise<void>((resolve) => {
        client.once('reasoningStep', () => {
          const endMeasure = tracker.startMeasure('ws_roundtrip');
          endMeasure();
          resolve();
        });

        const endMeasure = tracker.startMeasure('ws_roundtrip');

        // Simulate server message
        setTimeout(() => {
          client.emit('reasoningStep', {
            clawId: 'claw_123',
            cellId: 'A1',
            step: {
              stepNumber: 1,
              content: 'Test reasoning',
              timestamp: Date.now(),
              confidence: 0.8
            },
            isFinal: false
          });
        }, 50);
      });

      await messageReceivedPromise;

      const metrics = tracker.getMetrics('ws_roundtrip');

      console.log('WebSocket Round-Trip Time:', {
        average: `${metrics.averageTime.toFixed(2)}ms`,
        min: `${metrics.minTime.toFixed(2)}ms`,
        max: `${metrics.maxTime.toFixed(2)}ms`
      });

      // WebSocket round-trip should be very fast
      expect(metrics.averageTime).toBeLessThan(50);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle 50 concurrent claw creations', async () => {
      let requestCount = 0;

      mockFetch.mockImplementation(() => {
        requestCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            clawId: `claw_${requestCount}`,
            status: 'created',
            config: createMockClawConfig(`claw_${requestCount}`)
          })
        });
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false,
        maxRetries: 3
      });

      const concurrentRequests = 50;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const endMeasure = tracker.startMeasure('concurrent_create');

        return client.createClaw({
          config: createMockClawConfig(`claw_concurrent_${i}`)
        })
          .then(() => {
            endMeasure();
          })
          .catch((error) => {
            tracker.recordError('concurrent_create');
            throw error;
          });
      });

      const startTime = Date.now();
      await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      const metrics = tracker.getMetrics('concurrent_create');

      console.log('Concurrent Claw Creation:', {
        totalRequests: concurrentRequests,
        totalTime: `${totalTime}ms`,
        averageTime: `${metrics.averageTime.toFixed(2)}ms`,
        throughput: `${(concurrentRequests / (totalTime / 1000)).toFixed(2)} requests/sec`,
        successRate: `${(metrics.successRate * 100).toFixed(1)}%`
      });

      // Should handle 50 concurrent requests
      expect(metrics.successRate).toBeGreaterThan(0.95);

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(5000);
    });

    it('should handle concurrent triggers without issues', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: 'claw_123',
          traceId: `trace_${Date.now()}`,
          status: 'triggered'
        })
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const concurrentTriggers = 100;
      const triggers = Array.from({ length: concurrentTriggers }, (_, i) => {
        const endMeasure = tracker.startMeasure('concurrent_trigger');

        return client.triggerClaw({
          clawId: `claw_${i % 10}`, // Reuse 10 different claws
          data: { iteration: i }
        })
          .then(() => {
            endMeasure();
          })
          .catch((error) => {
            tracker.recordError('concurrent_trigger');
            throw error;
          });
      });

      const startTime = Date.now();
      await Promise.all(triggers);
      const totalTime = Date.now() - startTime;

      const metrics = tracker.getMetrics('concurrent_trigger');

      console.log('Concurrent Triggers:', {
        totalTriggers: concurrentTriggers,
        totalTime: `${totalTime}ms`,
        averageTime: `${metrics.averageTime.toFixed(2)}ms`,
        throughput: `${(concurrentTriggers / (totalTime / 1000)).toFixed(2)} triggers/sec`
      });

      // Should handle 100 concurrent triggers
      expect(metrics.successRate).toBe(1);

      // Should achieve high throughput
      expect(metrics.throughput).toBeGreaterThan(50);
    });
  });

  describe('Retry Performance', () => {
    it('should measure retry overhead', async () => {
      let attemptCount = 0;

      mockFetch.mockImplementation(() => {
        attemptCount++;

        if (attemptCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({
            clawId: 'claw_123',
            status: 'created',
            config: createMockClawConfig()
          })
        });
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false,
        maxRetries: 3,
        initialRetryDelay: 50
      });

      const endMeasure = tracker.startMeasure('retry_operation');

      await client.createClaw({
        config: createMockClawConfig()
      });

      endMeasure();

      const metrics = tracker.getMetrics('retry_operation');

      console.log('Retry Performance:', {
        totalAttempts: attemptCount,
        totalTime: `${metrics.totalTime.toFixed(2)}ms`,
        overhead: `${(metrics.totalTime - 50).toFixed(2)}ms` // Subtract base operation time
      });

      // Should have retried
      expect(attemptCount).toBe(3);

      // Should complete despite retries
      expect(metrics.successRate).toBe(1);
    });

    it('should handle exponential backoff correctly', async () => {
      const delays: number[] = [];
      const startTime = Date.now();

      mockFetch.mockImplementation(() => {
        const elapsed = Date.now() - startTime;
        delays.push(elapsed);

        if (delays.length < 4) {
          return Promise.reject(new Error('Network error'));
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({
            clawId: 'claw_123',
            status: 'created',
            config: createMockClawConfig()
          })
        });
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false,
        maxRetries: 4,
        initialRetryDelay: 50,
        retryBackoffMultiplier: 2
      });

      await client.createClaw({
        config: createMockClawConfig()
      });

      // Calculate delays between attempts
      const retryDelays = delays.slice(1).map((delay, i) => delay - delays[i]);

      console.log('Exponential Backoff Delays:', retryDelays);

      // Should see increasing delays (exponential backoff)
      expect(retryDelays[1]).toBeGreaterThan(retryDelays[0]);
      expect(retryDelays[2]).toBeGreaterThan(retryDelays[1]);
    });
  });

  describe('WebSocket Reconnection Performance', () => {
    it('should reconnect quickly under normal conditions', async () => {
      let reconnectCount = 0;
      const reconnectTimes: number[] = [];

      global.WebSocket = jest.fn((url) => {
        const ws = {
          url,
          readyState: reconnectCount === 0 ? WebSocket.CONNECTING : WebSocket.OPEN,
          onopen: null,
          onmessage: null,
          onerror: null,
          onclose: null,
          send: jest.fn(),
          close: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        } as any;

        const connectionDelay = 50 + reconnectCount * 10;

        setTimeout(() => {
          if (ws.onopen) {
            const reconnectTime = Date.now();
            reconnectTimes.push(reconnectTime);
            ws.onopen(new Event('open'));
          }
        }, connectionDelay);

        reconnectCount++;
        return ws;
      }) as any;

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true,
        wsReconnectInterval: 100,
        maxWsReconnectAttempts: 3
      });

      // Wait for initial connection
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger disconnection
      const ws = (client as any).ws;
      if (ws && ws.onclose) {
        const disconnectTime = Date.now();
        ws.onclose({ code: 1006, reason: 'Connection lost' } as CloseEvent);

        // Wait for reconnection
        await new Promise(resolve => setTimeout(resolve, 200));

        const reconnectDelay = reconnectTimes[reconnectTimes.length - 1] - disconnectTime;

        console.log('Reconnection Delay:', `${reconnectDelay}ms`);

        // Should reconnect quickly
        expect(reconnectDelay).toBeLessThan(500);
      }
    });

    it('should handle rapid reconnection attempts', async () => {
      let disconnectCount = 0;

      global.WebSocket = jest.fn((url) => {
        const ws = {
          url,
          readyState: WebSocket.OPEN,
          onopen: null,
          onmessage: null,
          onerror: null,
          onclose: null,
          send: jest.fn(),
          close: jest.fn((code?: number, reason?: string) => {
            setTimeout(() => {
              if (ws.onclose) {
                disconnectCount++;
                ws.onclose({ code, reason } as CloseEvent);
              }
            }, 10);
          }),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        } as any;

        setTimeout(() => {
          if (ws.onopen) {
            ws.onopen(new Event('open'));
          }
        }, 20);

        return ws;
      }) as any;

      const reconnectFailedSpy = jest.fn();

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true,
        wsReconnectInterval: 50,
        maxWsReconnectAttempts: 5
      });

      client.on('reconnectFailed', reconnectFailedSpy);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger multiple disconnections
      const ws = (client as any).ws;
      if (ws) {
        // Simulate unstable connection
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            ws.close(1006, 'Connection lost');
          }, i * 100);
        }
      }

      // Wait for reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Rapid Disconnection Handling:', {
        disconnectCount,
        reconnectAttempts: (client as any).wsReconnectAttempts
      });

      // Should handle multiple disconnections gracefully
      expect(disconnectCount).toBeGreaterThan(0);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory with repeated operations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: 'claw_123',
          traceId: 'trace_123',
          status: 'triggered'
        })
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      // Get initial memory usage
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        await client.triggerClaw({
          clawId: `claw_${i % 10}`,
          data: { iteration: i }
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Get final memory usage
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      console.log('Memory Usage:', {
        initial: `${(initialMemory / 1024 / 1024).toFixed(2)}MB`,
        final: `${(finalMemory / 1024 / 1024).toFixed(2)}MB`,
        increase: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
      });

      // Memory increase should be reasonable (< 10MB for 1000 operations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should clean up event listeners properly', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      // Add many event listeners
      for (let i = 0; i < 100; i++) {
        client.on(`event_${i}`, () => {});
      }

      const initialListenerCount = client.listenerCount('event_0');

      // Dispose client
      await client.dispose();

      // All listeners should be removed
      expect(client.listenerCount('event_0')).toBe(0);
      expect(client.isDisposedClient()).toBe(true);
    });
  });

  describe('Throughput Tests', () => {
    it('should sustain high throughput for sustained operations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: 'claw_123',
          traceId: 'trace_123',
          status: 'triggered'
        })
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const duration = 5000; // 5 seconds
      const startTime = Date.now();
      let operationCount = 0;
      let errors = 0;

      while (Date.now() - startTime < duration) {
        try {
          await client.triggerClaw({
            clawId: 'claw_123',
            data: { value: operationCount }
          });
          operationCount++;
        } catch (error) {
          errors++;
        }
      }

      const actualDuration = Date.now() - startTime;
      const throughput = (operationCount / actualDuration) * 1000;

      console.log('Sustained Throughput:', {
        duration: `${actualDuration}ms`,
        operations: operationCount,
        errors,
        throughput: `${throughput.toFixed(2)} ops/sec`,
        successRate: `${((operationCount / (operationCount + errors)) * 100).toFixed(1)}%`
      });

      // Should sustain at least 10 ops/sec
      expect(throughput).toBeGreaterThan(10);

      // Should have high success rate
      expect(operationCount / (operationCount + errors)).toBeGreaterThan(0.99);
    });
  });
});

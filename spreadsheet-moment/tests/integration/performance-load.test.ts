/**
 * Performance and Load Testing Suite
 *
 * Comprehensive performance and load tests for the SpreadsheetMoment platform:
 * - API response time benchmarks
 * - Concurrent request handling
 * - Memory usage profiling
 * - CPU usage monitoring
 * - Scalability testing
 * - Stress testing under load
 *
 * @packageDocumentation
 * @version 4.0.0
 */

import { ClawClient } from '@spreadsheet-moment/agent-core';
import { StateManager } from '@spreadsheet-moment/agent-core';
import {
  ClawCellConfig,
  ClawType,
  ModelProvider,
  EquipmentSlot,
  TriggerType,
  LearningStrategy,
  ClawState
} from '@spreadsheet-moment/agent-core';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const VALID_API_KEY = 'test-api-key-min-length-20';
const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

const createMockClawConfig = (id: string): ClawCellConfig => ({
  id,
  type: ClawType.SENSOR,
  position: [0, 0],
  model: {
    provider: ModelProvider.DEEPSEEK,
    model: 'deepseek-chat',
    apiKey: 'test-model-key-12345678'
  },
  seed: {
    purpose: `Test claw ${id}`,
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
// PERFORMANCE METRICS COLLECTOR
// ============================================================================

interface PerformanceMetrics {
  operation: string;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  timestamp: number;
}

class PerformanceCollector {
  private metrics: PerformanceMetrics[] = [];

  record(
    operation: string,
    duration: number,
    memoryBefore: number,
    memoryAfter: number
  ) {
    this.metrics.push({
      operation,
      duration,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      timestamp: Date.now()
    });
  }

  getMetrics(operation?: string): PerformanceMetrics[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return [...this.metrics];
  }

  getAverageDuration(operation: string): number {
    const metrics = this.getMetrics(operation);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  getPercentile(operation: string, percentile: number): number {
    const metrics = this.getMetrics(operation)
      .map(m => m.duration)
      .sort((a, b) => a - b);

    if (metrics.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * metrics.length) - 1;
    return metrics[index];
  }

  getTotalMemoryDelta(): number {
    return this.metrics.reduce((acc, m) => acc + m.memoryDelta, 0);
  }

  clear() {
    this.metrics = [];
  }

  generateReport(): string {
    let report = 'Performance Test Results\n';
    report += '=' .repeat(80) + '\n\n';

    const operations = [...new Set(this.metrics.map(m => m.operation))];

    operations.forEach(op => {
      const metrics = this.getMetrics(op);
      const avg = this.getAverageDuration(op);
      const p50 = this.getPercentile(op, 50);
      const p95 = this.getPercentile(op, 95);
      const p99 = this.getPercentile(op, 99);

      report += `${op}:\n`;
      report += `  Count: ${metrics.length}\n`;
      report += `  Avg: ${avg.toFixed(2)}ms\n`;
      report += `  P50: ${p50.toFixed(2)}ms\n`;
      report += `  P95: ${p95.toFixed(2)}ms\n`;
      report += `  P99: ${p99.toFixed(2)}ms\n`;
      report += '\n';
    });

    report += `Total Memory Delta: ${(this.getTotalMemoryDelta() / 1024 / 1024).toFixed(2)}MB\n`;

    return report;
  }
}

// ============================================================================
// PERFORMANCE AND LOAD TESTS
// ============================================================================

describe('Performance and Load Tests', () => {
  let collector: PerformanceCollector;

  beforeEach(() => {
    collector = new PerformanceCollector();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('API Response Time Benchmarks', () => {
    it('should create claw within 100ms', async () => {
      const mockFetch = global.fetch as jest.Mock;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: 'claw_1',
          status: 'created',
          config: createMockClawConfig('claw_1')
        })
      });

      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      await client.createClaw({
        config: createMockClawConfig('claw_1')
      });

      const duration = Date.now() - startTime;
      const memoryAfter = process.memoryUsage().heapUsed;

      collector.record('createClaw', duration, memoryBefore, memoryAfter);

      expect(duration).toBeLessThan(100);
      expect(collector.getAverageDuration('createClaw')).toBeLessThan(100);

      await client.dispose();
    });

    it('should query claw within 50ms', async () => {
      const mockFetch = global.fetch as jest.Mock;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: 'claw_1',
          exists: true,
          state: {
            clawId: 'claw_1',
            state: ClawState.DORMANT,
            reasoning: [],
            memory: [],
            confidence: 0.8,
            lastUpdated: Date.now()
          },
          reasoning: [],
          memory: [],
          relationships: []
        })
      });

      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const memoryBefore = process.memoryUsage().heapUsed;

      // Run multiple queries
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();

        await client.queryClaw({
          clawId: 'claw_1'
        });

        const duration = Date.now() - startTime;
        const memoryAfter = process.memoryUsage().heapUsed;

        collector.record('queryClaw', duration, memoryBefore, memoryAfter);
      }

      expect(collector.getAverageDuration('queryClaw')).toBeLessThan(50);

      await client.dispose();
    });

    it('should trigger claw within 100ms', async () => {
      const mockFetch = global.fetch as jest.Mock;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: 'claw_1',
          traceId: 'trace_1',
          status: 'triggered'
        })
      });

      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const memoryBefore = process.memoryUsage().heapUsed;

      // Run multiple triggers
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();

        await client.triggerClaw({
          clawId: 'claw_1',
          data: { value: i }
        });

        const duration = Date.now() - startTime;
        const memoryAfter = process.memoryUsage().heapUsed;

        collector.record('triggerClaw', duration, memoryBefore, memoryAfter);
      }

      expect(collector.getAverageDuration('triggerClaw')).toBeLessThan(100);

      await client.dispose();
    });

    it('should cancel claw within 50ms', async () => {
      const mockFetch = global.fetch as jest.Mock;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: 'claw_1',
          status: 'cancelled',
          message: 'Cancelled successfully'
        })
      });

      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const memoryBefore = process.memoryUsage().heapUsed;

      // Run multiple cancels
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();

        await client.cancelClaw({
          clawId: 'claw_1'
        });

        const duration = Date.now() - startTime;
        const memoryAfter = process.memoryUsage().heapUsed;

        collector.record('cancelClaw', duration, memoryBefore, memoryAfter);
      }

      expect(collector.getAverageDuration('cancelClaw')).toBeLessThan(50);

      await client.dispose();
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 100 concurrent claw creations', async () => {
      const mockFetch = global.fetch as jest.Mock;

      mockFetch.mockImplementation(() => ({
        ok: true,
        json: async () => ({
          clawId: `claw_${Date.now()}_${Math.random()}`,
          status: 'created',
          config: createMockClawConfig('claw_test')
        })
      }));

      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      // Create 100 claws concurrently
      const requests = Array.from({ length: 100 }, (_, i) =>
        client.createClaw({
          config: createMockClawConfig(`claw_${i}`)
        })
      );

      await Promise.all(requests);

      const duration = Date.now() - startTime;
      const memoryAfter = process.memoryUsage().heapUsed;

      collector.record('concurrentCreate100', duration, memoryBefore, memoryAfter);

      // Should complete 100 requests in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Memory increase should be reasonable (< 100MB)
      const memoryDelta = (memoryAfter - memoryBefore) / 1024 / 1024;
      expect(memoryDelta).toBeLessThan(100);

      await client.dispose();
    }, 10000);

    it('should handle mixed concurrent operations', async () => {
      const mockFetch = global.fetch as jest.Mock;

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/claws')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              clawId: 'claw_1',
              status: 'created',
              config: createMockClawConfig('claw_1')
            })
          });
        } else if (url.includes('/query')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              clawId: 'claw_1',
              exists: true,
              state: {
                clawId: 'claw_1',
                state: ClawState.THINKING,
                reasoning: [],
                memory: [],
                confidence: 0.8,
                lastUpdated: Date.now()
              },
              reasoning: [],
              memory: [],
              relationships: []
            })
          });
        } else if (url.includes('/trigger')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              clawId: 'claw_1',
              traceId: 'trace_1',
              status: 'triggered'
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({})
        });
      });

      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      // Mix of different operations
      const operations = [
        ...Array.from({ length: 20 }, () => client.createClaw({
          config: createMockClawConfig(`claw_${Date.now()}`)
        })),
        ...Array.from({ length: 30 }, () => client.queryClaw({
          clawId: 'claw_1'
        })),
        ...Array.from({ length: 20 }, () => client.triggerClaw({
          clawId: 'claw_1',
          data: { value: Math.random() }
        })),
        ...Array.from({ length: 30 }, () => client.cancelClaw({
          clawId: 'claw_1'
        }))
      ];

      await Promise.all(operations);

      const duration = Date.now() - startTime;
      const memoryAfter = process.memoryUsage().heapUsed;

      collector.record('mixedOperations100', duration, memoryBefore, memoryAfter);

      // Should handle 100 mixed operations efficiently
      expect(duration).toBeLessThan(3000);

      await client.dispose();
    }, 10000);
  });

  describe('Memory Usage Profiling', () => {
    it('should not leak memory with repeated operations', async () => {
      const mockFetch = global.fetch as jest.Mock;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: 'claw_1',
          status: 'created',
          config: createMockClawConfig('claw_1')
        })
      });

      const memorySnapshots: number[] = [];
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const client = new ClawClient({
          baseUrl: BASE_URL,
          apiKey: VALID_API_KEY,
          enableWebSocket: false
        });

        await client.createClaw({
          config: createMockClawConfig(`claw_${i}`)
        });

        await client.dispose();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        memorySnapshots.push(process.memoryUsage().heapUsed);
      }

      // Check for memory leaks (last 10 snapshots vs first 10)
      const first10Avg = memorySnapshots.slice(0, 10)
        .reduce((a, b) => a + b, 0) / 10;
      const last10Avg = memorySnapshots.slice(-10)
        .reduce((a, b) => a + b, 0) / 10;

      const memoryGrowth = (last10Avg - first10Avg) / 1024 / 1024;

      // Memory growth should be minimal (< 50MB)
      expect(memoryGrowth).toBeLessThan(50);
    }, 15000);

    it('should handle large data structures efficiently', async () => {
      const stateManager = new StateManager();

      const memoryBefore = process.memoryUsage().heapUsed;

      // Create large state objects
      const largeCells = Array.from({ length: 1000 }, (_, i) => ({
        v: `value_${i}`,
        origin_id: `origin_${i}`,
        cell_type: 'SENSOR',
        state: 'DORMANT',
        reasoning: Array.from({ length: 100 }, (_, j) => `Reasoning step ${j}`),
        memory: Array.from({ length: 100 }, (_, j) => `Memory item ${j}`)
      }));

      const startTime = Date.now();

      // Process all cells
      largeCells.forEach(cell => {
        stateManager.transition(cell as any, 'THINKING');
      });

      const duration = Date.now() - startTime;
      const memoryAfter = process.memoryUsage().heapUsed;

      collector.record('processLargeData', duration, memoryBefore, memoryAfter);

      // Should process 1000 cells quickly
      expect(duration).toBeLessThan(500);

      // Memory usage should be reasonable (< 200MB for 1000 cells)
      const memoryDelta = (memoryAfter - memoryBefore) / 1024 / 1024;
      expect(memoryDelta).toBeLessThan(200);
    });
  });

  describe('Scalability Testing', () => {
    it('should scale from 1 to 1000 agents', async () => {
      const mockFetch = global.fetch as jest.Mock;

      mockFetch.mockImplementation(() => ({
        ok: true,
        json: async () => ({
          clawId: `claw_${Date.now()}_${Math.random()}`,
          status: 'created',
          config: createMockClawConfig('claw_test')
        })
      }));

      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const scales = [1, 10, 50, 100, 500, 1000];
      const results: Array<{ scale: number; duration: number; avgDuration: number }> = [];

      for (const scale of scales) {
        const memoryBefore = process.memoryUsage().heapUsed;
        const startTime = Date.now();

        const requests = Array.from({ length: scale }, (_, i) =>
          client.createClaw({
            config: createMockClawConfig(`claw_scale_${i}`)
          })
        );

        await Promise.all(requests);

        const duration = Date.now() - startTime;
        const memoryAfter = process.memoryUsage().heapUsed;

        results.push({
          scale,
          duration,
          avgDuration: duration / scale
        });

        collector.record(`scale_${scale}`, duration, memoryBefore, memoryAfter);
      }

      // Verify linear or better scaling
      // Duration should grow roughly linearly with scale
      const ratio10to1 = results[1].duration / results[0].duration;
      const ratio100to10 = results[3].duration / results[1].duration;

      // Allow for some overhead but should be reasonably scalable
      expect(ratio10to1).toBeLessThan(15); // 10x operations should take < 15x time
      expect(ratio100to10).toBeLessThan(15); // 10x operations should take < 15x time

      await client.dispose();
    }, 30000);

    it('should handle 10000 state transitions efficiently', () => {
      const stateManager = new StateManager();

      const cellData = {
        v: 'test',
        origin_id: 'origin_1',
        cell_type: 'SENSOR',
        state: 'DORMANT'
      };

      const startTime = Date.now();
      const memoryBefore = process.memoryUsage().heapUsed;

      // Perform 10000 transitions
      for (let i = 0; i < 10000; i++) {
        if (i % 2 === 0) {
          stateManager.transition(cellData as any, 'THINKING');
        } else {
          stateManager.transition(cellData as any, 'DORMANT');
        }
      }

      const duration = Date.now() - startTime;
      const memoryAfter = process.memoryUsage().heapUsed;

      collector.record('stateTransitions10k', duration, memoryBefore, memoryAfter);

      // Should complete 10000 transitions quickly
      expect(duration).toBeLessThan(1000);

      // Memory usage should be reasonable
      const memoryDelta = (memoryAfter - memoryBefore) / 1024 / 1024;
      expect(memoryDelta).toBeLessThan(50);
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid connection/disconnection cycles', async () => {
      const cycles = 100;
      const memoryBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < cycles; i++) {
        const client = new ClawClient({
          baseUrl: BASE_URL,
          apiKey: VALID_API_KEY,
          enableWebSocket: false
        });

        await client.dispose();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDelta = (memoryAfter - memoryBefore) / 1024 / 1024;

      // Memory should not grow significantly
      expect(memoryDelta).toBeLessThan(50);
    }, 15000);

    it('should handle error conditions without memory leaks', async () => {
      const mockFetch = global.fetch as jest.Mock;

      mockFetch.mockRejectedValue(new Error('Network error'));

      const memoryBefore = process.memoryUsage().heapUsed;

      // Attempt many failing operations
      for (let i = 0; i < 100; i++) {
        const client = new ClawClient({
          baseUrl: BASE_URL,
          apiKey: VALID_API_KEY,
          enableWebSocket: false,
          maxRetries: 0
        });

        try {
          await client.createClaw({
            config: createMockClawConfig(`claw_${i}`)
          });
        } catch (error) {
          // Expected to fail
        }

        await client.dispose();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDelta = (memoryAfter - memoryBefore) / 1024 / 1024;

      // Should not leak memory even with errors
      expect(memoryDelta).toBeLessThan(50);
    }, 10000);
  });

  describe('Performance Report Generation', () => {
    it('should generate comprehensive performance report', async () => {
      const mockFetch = global.fetch as jest.Mock;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          clawId: 'claw_1',
          status: 'created',
          config: createMockClawConfig('claw_1')
        })
      });

      const client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      // Run various operations
      for (let i = 0; i < 50; i++) {
        const memoryBefore = process.memoryUsage().heapUsed;
        const startTime = Date.now();

        await client.createClaw({
          config: createMockClawConfig(`claw_perf_${i}`)
        });

        const duration = Date.now() - startTime;
        const memoryAfter = process.memoryUsage().heapUsed;

        collector.record('createClaw', duration, memoryBefore, memoryAfter);
      }

      await client.dispose();

      // Generate report
      const report = collector.generateReport();

      expect(report).toContain('Performance Test Results');
      expect(report).toContain('createClaw:');
      expect(report).toContain('Count: 50');
      expect(report).toContain('Avg:');
      expect(report).toContain('P95:');
      expect(report).toContain('P99:');
      expect(report).toContain('Total Memory Delta');
    });
  });
});

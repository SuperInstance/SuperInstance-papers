/**
 * Performance Tests
 *
 * Performance benchmarks and load testing for Claw API integration
 *
 * @packageDocumentation
 */

import {
  ClawAPIClient,
  createClawAPIClient,
  ClawWebSocketClient,
  createClawWebSocketClient
} from '../api';

// Mock fetch
(global as any).fetch = jest.fn();

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);

    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string) {}
  close() {
    this.readyState = 3;
  }

  static clear() {
    MockWebSocket.instances = [];
  }
}

(global as any).WebSocket = MockWebSocket;

describe('Performance Tests', () => {
  describe('API Client Performance', () => {
    let client: ClawAPIClient;

    beforeEach(() => {
      client = createClawAPIClient('test-key', 'https://api.test.claw.com');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agentId: 'test-123', response: 'OK' })
      });
    });

    afterEach(async () => {
      await client.close();
    });

    it('should handle 100+ sequential requests', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await client.queryAgent({
          agentId: `claw-${i}`,
          query: `Query ${i}`
        });
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / 100;

      // Average should be under 100ms
      expect(avgTime).toBeLessThan(100);

      const metrics = client.getMetrics();
      expect(metrics.totalRequests).toBe(100);
      expect(metrics.successfulRequests).toBe(100);
    });

    it('should handle parallel requests', async () => {
      const startTime = Date.now();
      const requests = [];

      for (let i = 0; i < 50; i++) {
        requests.push(
          client.queryAgent({
            agentId: `claw-${i}`,
            query: `Query ${i}`
          })
        );
      }

      await Promise.all(requests);
      const duration = Date.now() - startTime;

      // Parallel requests should be faster than sequential
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

      const metrics = client.getMetrics();
      expect(metrics.successfulRequests).toBe(50);
    });

    it('should maintain <100ms average response time', async () => {
      const times: number[] = [];

      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        await client.queryAgent({
          agentId: 'test-123',
          query: `Query ${i}`
        });
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(100);
    });

    it('should use memory efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create many agents
      for (let i = 0; i < 100; i++) {
        await client.createAgent({
          config: {
            id: `claw-${i}`,
            model: 'deepseek-chat',
            seed: {
              purpose: `Agent ${i}`,
              trigger: { type: 'manual' as any },
              learningStrategy: 'reinforcement' as any,
              defaultEquipment: []
            },
            equipment: []
          },
          cellId: 'A1',
          sheetId: 'sheet1'
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (<50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('WebSocket Performance', () => {
    let client: ClawWebSocketClient;

    beforeEach(() => {
      MockWebSocket.clear();
      client = createClawWebSocketClient('test-key', 'wss://api.test.claw.com/ws');
    });

    afterEach(() => {
      client.disconnect();
    });

    it('should handle high message throughput', async () => {
      await client.connect();

      const messageCount = 1000;
      let receivedCount = 0;

      client.on('status_update' as any, () => {
        receivedCount++;
      });

      const startTime = Date.now();

      for (let i = 0; i < messageCount; i++) {
        MockWebSocket.instances[0].onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'status_update',
              agentId: 'claw-123',
              timestamp: new Date().toISOString(),
              state: 'thinking'
            })
          })
        );
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const duration = Date.now() - startTime;
      const messagesPerSecond = (messageCount / duration) * 1000;

      expect(receivedCount).toBe(messageCount);
      expect(messagesPerSecond).toBeGreaterThan(100); // Should handle 100+ msg/sec
    });

    it('should reconnect quickly', async () => {
      await client.connect();

      const startTime = Date.now();
      let reconnectTime = 0;

      client.onConnectionChange((state) => {
        if (state === 'reconnecting') {
          reconnectTime = Date.now();
        }
        if (state === 'connected' && reconnectTime > 0) {
          const duration = Date.now() - reconnectTime;
          expect(duration).toBeLessThan(5000); // Should reconnect within 5 seconds
        }
      });

      // Trigger disconnect
      MockWebSocket.instances[0].onclose?.(new CloseEvent('close'));

      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should queue messages efficiently', async () => {
      const queueSize = 100;

      // Send messages while disconnected
      for (let i = 0; i < queueSize; i++) {
        client.send(`message-${i}`);
      }

      const stats = client.getStats();
      expect(stats.queuedMessages).toBe(queueSize);

      // Connect and verify queue flushes
      await client.connect();
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalStats = client.getStats();
      expect(finalStats.queuedMessages).toBe(0);
    });
  });

  describe('Load Testing', () => {
    it('should handle 100+ simultaneous agents', async () => {
      const client = createClawAPIClient('test-key', 'https://api.test.claw.com');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          agentId: 'test-123',
          state: 'idle',
          equipment: [],
          uptime: 0,
          lastActivity: new Date().toISOString()
        })
      });

      const startTime = Date.now();
      const agents = [];

      for (let i = 0; i < 100; i++) {
        agents.push(
          client.createAgent({
            config: {
              id: `claw-${i}`,
              model: 'deepseek-chat',
              seed: {
                purpose: `Agent ${i}`,
                trigger: { type: 'manual' as any },
                learningStrategy: 'reinforcement' as any,
                defaultEquipment: []
              },
              equipment: []
            },
            cellId: 'A1',
            sheetId: 'sheet1'
          })
        );
      }

      await Promise.all(agents);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds

      await client.close();
    });

    it('should handle burst traffic', async () => {
      const client = createClawAPIClient('test-key', 'https://api.test.claw.com');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'OK' })
      });

      // Send burst of requests
      const burstSize = 50;
      const startTime = Date.now();
      const requests = [];

      for (let i = 0; i < burstSize; i++) {
        requests.push(
          client.queryAgent({
            agentId: 'claw-123',
            query: `Burst query ${i}`
          })
        );
      }

      await Promise.all(requests);
      const duration = Date.now() - startTime;

      // Connection pool should handle burst efficiently
      expect(duration).toBeLessThan(5000);

      const poolStats = client.getPoolStats();
      expect(poolStats.active).toBe(0); // All connections released
      expect(poolStats.total).toBeGreaterThan(0);

      await client.close();
    });
  });

  describe('Memory and Resource Management', () => {
    it('should clean up resources properly', async () => {
      const client = createClawAPIClient('test-key', 'https://api.test.claw.com');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agentId: 'test-123' })
      });

      // Use client
      await client.createAgent({
        config: {
          id: 'test-123',
          model: 'deepseek-chat',
          seed: {
            purpose: 'Test',
            trigger: { type: 'manual' as any },
            learningStrategy: 'reinforcement' as any,
            defaultEquipment: []
          },
          equipment: []
        },
        cellId: 'A1',
        sheetId: 'sheet1'
      });

      // Close and verify cleanup
      await client.close();

      const poolStats = client.getPoolStats();
      expect(poolStats.total).toBe(0);
    });

    it('should reset metrics correctly', async () => {
      const client = createClawAPIClient('test-key', 'https://api.test.claw.com');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agentId: 'test-123' })
      });

      // Generate some metrics
      await client.queryAgent({ agentId: 'test-123', query: 'test' });
      await client.queryAgent({ agentId: 'test-123', query: 'test2' });

      let metrics = client.getMetrics();
      expect(metrics.totalRequests).toBe(2);

      // Reset
      client.resetMetrics();
      metrics = client.getMetrics();
      expect(metrics.totalRequests).toBe(0);

      await client.close();
    });
  });

  describe('Benchmark Metrics', () => {
    it('should meet target latencies', async () => {
      const client = createClawAPIClient('test-key', 'https://api.test.claw.com');

      (global.fetch as jest.Mock).mockImplementation(async () => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          ok: true,
          json: async () => ({ response: 'OK' })
        };
      });

      const latencies: number[] = [];

      for (let i = 0; i < 50; i++) {
        const start = Date.now();
        await client.queryAgent({ agentId: 'test-123', query: `test ${i}` });
        latencies.push(Date.now() - start);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);

      // All latencies should be under 100ms
      expect(avgLatency).toBeLessThan(100);
      expect(maxLatency).toBeLessThan(100);

      console.log(`Latency stats - Avg: ${avgLatency.toFixed(2)}ms, Min: ${minLatency}ms, Max: ${maxLatency}ms`);

      await client.close();
    });

    it('should maintain performance under load', async () => {
      const client = createClawAPIClient('test-key', 'https://api.test.claw.com');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'OK' })
      });

      const results = {
        cold: [] as number[],
        warm: [] as number[]
      };

      // Cold start requests
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await client.queryAgent({ agentId: 'test-123', query: `cold ${i}` });
        results.cold.push(Date.now() - start);
      }

      // Warm requests
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await client.queryAgent({ agentId: 'test-123', query: `warm ${i}` });
        results.warm.push(Date.now() - start);
      }

      const avgCold = results.cold.reduce((a, b) => a + b, 0) / results.cold.length;
      const avgWarm = results.warm.reduce((a, b) => a + b, 0) / results.warm.length;

      console.log(`Cold start avg: ${avgCold.toFixed(2)}ms, Warm avg: ${avgWarm.toFixed(2)}ms`);

      // Both should meet targets
      expect(avgCold).toBeLessThan(100);
      expect(avgWarm).toBeLessThan(100);

      await client.close();
    });
  });
});

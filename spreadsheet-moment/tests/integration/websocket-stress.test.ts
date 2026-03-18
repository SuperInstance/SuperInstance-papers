/**
 * WebSocket Stress Tests
 *
 * Comprehensive stress testing for WebSocket connections including:
 * - Connection stability under load
 * - Message throughput testing
 * - Reconnection behavior
 * - Memory leak detection
 * - Concurrent connection handling
 *
 * @packageDocumentation
 * @version 4.0.0
 */

import { ClawClient } from '@spreadsheet-moment/agent-core';
import {
  ClawCellConfig,
  ClawType,
  ModelProvider,
  EquipmentSlot,
  TriggerType,
  LearningStrategy,
  ClawState,
  WebSocketMessageType
} from '@spreadsheet-moment/agent-core';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const VALID_API_KEY = 'test-api-key-min-length-20';
const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

const createMockClawConfig = (): ClawCellConfig => ({
  id: `claw_${Date.now()}_${Math.random()}`,
  type: ClawType.SENSOR,
  position: [0, 0],
  model: {
    provider: ModelProvider.DEEPSEEK,
    model: 'deepseek-chat',
    apiKey: 'test-model-key-12345678'
  },
  seed: {
    purpose: 'Test sensor claw',
    trigger: {
      type: TriggerType.CELL_CHANGE,
      cellId: 'A1'
    },
    learningStrategy: LearningStrategy.REINFORCEMENT
  },
  equipment: [EquipmentSlot.MEMORY, EquipmentSlot.REASONING],
  relationships: [],
  state: ClawState.DORMANT,
  confidence: 0.5,
  maxReasoningSteps: 10,
  timeout: 30000
});

// ============================================================================
// MOCK WEBSOCKET SERVER
// ============================================================================

class MockWebSocketServer {
  private clients: Map<string, any> = new Map();
  private messageQueue: Map<string, any[]> = new Map();

  handleConnection(clientId: string, ws: any) {
    this.clients.set(clientId, ws);
    this.messageQueue.set(clientId, []);

    // Simulate connection
    setTimeout(() => {
      if (ws.onopen) {
        ws.onopen(new Event('open'));
      }
    }, 10);
  }

  sendMessage(clientId: string, message: any) {
    const ws = this.clients.get(clientId);
    if (ws && ws.onmessage) {
      setTimeout(() => {
        ws.onmessage({ data: JSON.stringify(message) } as MessageEvent);
      }, Math.random() * 10); // Add small delay
    }
  }

  broadcast(message: any) {
    this.clients.forEach((ws, clientId) => {
      this.sendMessage(clientId, message);
    });
  }

  disconnectClient(clientId: string, code?: number, reason?: string) {
    const ws = this.clients.get(clientId);
    if (ws && ws.onclose) {
      ws.onclose({ code, reason } as CloseEvent);
    }
    this.clients.delete(clientId);
    this.messageQueue.delete(clientId);
  }

  disconnectAll(code?: number, reason?: string) {
    this.clients.forEach((_, clientId) => {
      this.disconnectClient(clientId, code, reason);
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

// ============================================================================
// WEBSOCKET STRESS TESTS
// ============================================================================

describe('WebSocket Stress Tests', () => {
  let mockServer: MockWebSocketServer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServer = new MockWebSocketServer();

    global.WebSocket = jest.fn((url) => {
      const clientId = url.split('/').pop() || `client_${Date.now()}`;
      const ws = {
        url,
        readyState: WebSocket.CONNECTING,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        send: jest.fn(),
        close: jest.fn((code?: number, reason?: string) => {
          ws.readyState = WebSocket.CLOSED;
          if (ws.onclose) {
            ws.onclose({ code, reason } as CloseEvent);
          }
        }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      } as any;

      mockServer.handleConnection(clientId, ws);
      return ws;
    }) as any;
  });

  afterEach(async () => {
    mockServer.disconnectAll();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Connection Stability', () => {
    it('should maintain connection over extended period', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true,
        debug: false
      });

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = client.getConnectionStatus();
      expect(status.websocket).toBe(true);

      // Simulate extended operation (5 seconds)
      const startTime = Date.now();
      let messageCount = 0;

      const messageHandler = () => {
        messageCount++;
      };

      client.on('reasoningStep', messageHandler);

      // Send messages periodically
      const interval = setInterval(() => {
        mockServer.broadcast({
          type: WebSocketMessageType.REASONING_STEP,
          traceId: `trace_${Date.now()}`,
          timestamp: Date.now(),
          payload: {
            clawId: 'claw_1',
            cellId: 'A1',
            step: {
              stepNumber: messageCount + 1,
              content: 'Processing...',
              timestamp: Date.now(),
              confidence: 0.8
            },
            isFinal: false
          }
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 5000));
      clearInterval(interval);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(4900);
      expect(messageCount).toBeGreaterThan(40);

      await client.dispose();
    }, 10000);

    it('should handle rapid connect/disconnect cycles', async () => {
      const cycles = 10;
      const clients: ClawClient[] = [];

      for (let i = 0; i < cycles; i++) {
        const client = new ClawClient({
          baseUrl: BASE_URL,
          wsUrl: WS_URL,
          apiKey: VALID_API_KEY,
          enableWebSocket: true
        });

        clients.push(client);

        // Wait briefly for connection
        await new Promise(resolve => setTimeout(resolve, 50));

        // Verify connection
        const status = client.getConnectionStatus();
        expect(status.websocket).toBe(true);

        // Disconnect
        await client.dispose();
      }

      // All clients should be properly cleaned up
      expect(mockServer.getClientCount()).toBe(0);
    }, 15000);

    it('should recover from temporary network issues', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true,
        wsReconnectInterval: 100,
        maxWsReconnectAttempts: 5
      });

      // Wait for initial connection
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(client.getConnectionStatus().websocket).toBe(true);

      // Simulate network issue
      mockServer.disconnectAll();

      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should reconnect
      expect(client.getConnectionStatus().websocket).toBe(true);

      await client.dispose();
    });
  });

  describe('Message Throughput', () => {
    it('should handle high message frequency', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const messagesReceived: any[] = [];
      client.on('reasoningStep', (data) => {
        messagesReceived.push(data);
      });

      // Send 100 messages rapidly
      const messageCount = 100;
      for (let i = 0; i < messageCount; i++) {
        mockServer.broadcast({
          type: WebSocketMessageType.REASONING_STEP,
          traceId: `trace_${i}`,
          timestamp: Date.now(),
          payload: {
            clawId: 'claw_1',
            cellId: 'A1',
            step: {
              stepNumber: i + 1,
              content: `Step ${i + 1}`,
              timestamp: Date.now(),
              confidence: 0.8
            },
            isFinal: i === messageCount - 1
          }
        });
      }

      // Wait for all messages to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(messagesReceived.length).toBeGreaterThanOrEqual(messageCount * 0.95); // Allow 5% loss

      await client.dispose();
    }, 10000);

    it('should handle large message payloads', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const largePayload = {
        type: WebSocketMessageType.REASONING_STEP,
        traceId: 'trace_large',
        timestamp: Date.now(),
        payload: {
          clawId: 'claw_1',
          cellId: 'A1',
          step: {
            stepNumber: 1,
            content: 'A'.repeat(10000), // 10KB message
            timestamp: Date.now(),
            confidence: 0.8
          },
          isFinal: false
        }
      };

      const messageReceived = new Promise<void>((resolve) => {
        client.on('reasoningStep', (data) => {
          expect(data.payload.step.content.length).toBe(10000);
          resolve();
        });
      });

      mockServer.broadcast(largePayload);

      await messageReceived;
      await client.dispose();
    });

    it('should handle concurrent message streams', async () => {
      const clientCount = 5;
      const clients: ClawClient[] = [];
      const messageCounts: number[] = new Array(clientCount).fill(0);

      // Create multiple clients
      for (let i = 0; i < clientCount; i++) {
        const client = new ClawClient({
          baseUrl: BASE_URL,
          wsUrl: `${WS_URL}/${i}`,
          apiKey: VALID_API_KEY,
          enableWebSocket: true
        });

        client.on('reasoningStep', () => {
          messageCounts[i]++;
        });

        clients.push(client);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Broadcast messages to all clients
      for (let i = 0; i < 50; i++) {
        mockServer.broadcast({
          type: WebSocketMessageType.REASONING_STEP,
          traceId: `trace_${i}`,
          timestamp: Date.now(),
          payload: {
            clawId: 'claw_1',
            cellId: 'A1',
            step: {
              stepNumber: i + 1,
              content: `Step ${i + 1}`,
              timestamp: Date.now(),
              confidence: 0.8
            },
            isFinal: false
          }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // All clients should receive messages
      messageCounts.forEach(count => {
        expect(count).toBeGreaterThan(40);
      });

      // Cleanup
      await Promise.all(clients.map(c => c.dispose()));
    }, 10000);
  });

  describe('Memory Management', () => {
    it('should not leak memory with many connections', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const clients: ClawClient[] = [];

      // Create and dispose 50 clients
      for (let i = 0; i < 50; i++) {
        const client = new ClawClient({
          baseUrl: BASE_URL,
          wsUrl: `${WS_URL}/${i}`,
          apiKey: VALID_API_KEY,
          enableWebSocket: true
        });

        await new Promise(resolve => setTimeout(resolve, 10));
        await client.dispose();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }, 15000);

    it('should clean up event listeners properly', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Add many listeners
      const handlers: Array<() => void> = [];
      for (let i = 0; i < 100; i++) {
        const handler = jest.fn();
        client.on('testEvent', handler);
        handlers.push(handler);
      }

      // Emit event
      client.emit('testEvent', 'data');

      // All handlers should be called
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalled();
      });

      // Dispose
      await client.dispose();

      // Emit again - no handlers should be called
      client.emit('testEvent', 'data');

      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1); // Only called before dispose
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages gracefully', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const errorSpy = jest.fn();
      client.on('validationError', errorSpy);

      // Send malformed messages
      mockServer.broadcast('invalid json');
      mockServer.broadcast({ invalid: 'structure' });
      mockServer.broadcast({ type: 'unknown_type' });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should handle errors without crashing
      expect(client.getConnectionStatus().websocket).toBe(true);
      expect(errorSpy).toHaveBeenCalled();

      await client.dispose();
    });

    it('should handle connection timeout', async () => {
      let connectionAttempt = 0;
      global.WebSocket = jest.fn(() => {
        connectionAttempt++;
        const ws = {
          readyState: WebSocket.CONNECTING,
          onopen: null,
          onmessage: null,
          onerror: null,
          onclose: null,
          send: jest.fn(),
          close: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        } as any;

        // Never open connection
        setTimeout(() => {
          if (ws.onerror) {
            ws.onerror(new Error('Connection timeout'));
          }
        }, 100);

        return ws;
      }) as any;

      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true,
        wsReconnectInterval: 50,
        maxWsReconnectAttempts: 3
      });

      // Wait for connection attempts
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(connectionAttempt).toBeGreaterThan(1);

      await client.dispose();
    }, 10000);

    it('should recover from server errors', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true,
        wsReconnectInterval: 100,
        maxWsReconnectAttempts: 5
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate server error
      const ws = (global.WebSocket as any).mock.results[0].value;
      if (ws.onerror) {
        ws.onerror(new Error('Server error'));
      }

      // Should recover
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(client.getConnectionStatus().websocket).toBe(true);

      await client.dispose();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should connect within acceptable time', async () => {
      const startTime = Date.now();

      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const connectionTime = Date.now() - startTime;

      // Should connect within 100ms
      expect(connectionTime).toBeLessThan(100);
      expect(client.getConnectionStatus().websocket).toBe(true);

      await client.dispose();
    });

    it('should process messages with low latency', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const latencies: number[] = [];

      client.on('reasoningStep', (data) => {
        const now = Date.now();
        const latency = now - data.payload.step.timestamp;
        latencies.push(latency);
      });

      // Send messages and measure latency
      for (let i = 0; i < 50; i++) {
        const timestamp = Date.now();
        mockServer.broadcast({
          type: WebSocketMessageType.REASONING_STEP,
          traceId: `trace_${i}`,
          timestamp,
          payload: {
            clawId: 'claw_1',
            cellId: 'A1',
            step: {
              stepNumber: i + 1,
              content: `Step ${i + 1}`,
              timestamp,
              confidence: 0.8
            },
            isFinal: false
          }
        });

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Calculate average latency
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

      // Average latency should be < 50ms
      expect(avgLatency).toBeLessThan(50);

      await client.dispose();
    });

    it('should handle burst traffic', async () => {
      const client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const messagesReceived: any[] = [];
      client.on('reasoningStep', (data) => {
        messagesReceived.push(data);
      });

      // Send burst of 100 messages
      for (let i = 0; i < 100; i++) {
        mockServer.broadcast({
          type: WebSocketMessageType.REASONING_STEP,
          traceId: `trace_${i}`,
          timestamp: Date.now(),
          payload: {
            clawId: 'claw_1',
            cellId: 'A1',
            step: {
              stepNumber: i + 1,
              content: `Step ${i + 1}`,
              timestamp: Date.now(),
              confidence: 0.8
            },
            isFinal: false
          }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Should handle burst without losing messages
      expect(messagesReceived.length).toBeGreaterThan(90);

      await client.dispose();
    });
  });
});

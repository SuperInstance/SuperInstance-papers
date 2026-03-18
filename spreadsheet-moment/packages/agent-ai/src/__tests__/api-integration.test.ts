/**
 * Claw API Integration Tests
 *
 * Comprehensive integration tests for ClawAPIClient and ClawWebSocketClient
 *
 * @packageDocumentation
 */

import {
  ClawAPIClient,
  createClawAPIClient,
  ClawWebSocketClient,
  createClawWebSocketClient,
  ClawState,
  WSMessageType,
  EquipmentSlot
} from '../api';

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
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

  send(data: string) {
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = 3;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  static mockMessage(data: any) {
    MockWebSocket.instances.forEach(ws => {
      if (ws.onmessage) {
        ws.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
      }
    });
  }

  static clear() {
    MockWebSocket.instances = [];
  }
}

(global as any).WebSocket = MockWebSocket;

describe('ClawAPIClient', () => {
  let client: ClawAPIClient;
  const mockApiKey = 'test-api-key-12345';

  beforeEach(() => {
    client = createClawAPIClient(mockApiKey, 'https://api.test.claw.com');
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await client.close();
  });

  describe('connection pooling', () => {
    it('should initialize with minimum connections', () => {
      const stats = client.getPoolStats();
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.minConnections).toBe(2);
    });

    it('should acquire and release connections', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agentId: 'test-123', status: 'created' })
      });

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

      const stats = client.getPoolStats();
      expect(stats.active).toBe(0); // Released after request
    });

    it('should respect max connections limit', async () => {
      const limitedClient = new ClawAPIClient({
        baseUrl: 'https://api.test.claw.com',
        apiKey: mockApiKey,
        poolConfig: {
          maxConnections: 2,
          minConnections: 1
        }
      });

      const stats = limitedClient.getPoolStats();
      expect(stats.maxConnections).toBe(2);

      await limitedClient.close();
    });
  });

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      let attempts = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('ECONNRESET'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ agentId: 'test-123', status: 'created' })
        });
      });

      const result = await client.createAgent({
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

      expect(result.agentId).toBe('test-123');
      expect(attempts).toBe(3);
    });

    it('should respect max retries', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNRESET'));

      await expect(
        client.createAgent({
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
        })
      ).rejects.toThrow();

      const metrics = client.getMetrics();
      expect(metrics.retries).toBe(3);
    });

    it('should use exponential backoff', async () => {
      const timestamps: number[] = [];
      let attempts = 0;

      (global.fetch as jest.Mock).mockImplementation(() => {
        attempts++;
        timestamps.push(Date.now());
        if (attempts < 3) {
          return Promise.reject(new Error('ETIMEDOUT'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ agentId: 'test-123' })
        });
      });

      await client.queryAgent({ agentId: 'test-123', query: 'test' });

      expect(timestamps.length).toBe(3);
      // Verify exponential backoff (second delay should be longer than first)
      const delay1 = timestamps[1] - timestamps[0];
      const delay2 = timestamps[2] - timestamps[1];
      expect(delay2).toBeGreaterThan(delay1);
    });
  });

  describe('request/response interceptors', () => {
    it('should apply request interceptors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agentId: 'test-123' })
      });

      client.addRequestInterceptor((request) => {
        (request.headers as any)['X-Custom-Header'] = 'test-value';
        return request;
      });

      await client.queryAgent({ agentId: 'test-123', query: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test-value'
          })
        })
      );
    });

    it('should apply response interceptors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agentId: 'test-123' })
      });

      let intercepted = false;
      client.addResponseInterceptor((response) => {
        intercepted = true;
        return response;
      });

      await client.queryAgent({ agentId: 'test-123', query: 'test' });
      expect(intercepted).toBe(true);
    });
  });

  describe('API methods', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({})
      });
    });

    it('should create agent', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          agentId: 'claw-123',
          status: ClawState.IDLE,
          createdAt: '2024-03-16T10:00:00Z',
          message: 'Agent created'
        })
      });

      const result = await client.createAgent({
        config: {
          id: 'test-123',
          model: 'deepseek-chat',
          seed: {
            purpose: 'Monitor stocks',
            trigger: { type: 'manual' as any },
            learningStrategy: 'reinforcement' as any,
            defaultEquipment: []
          },
          equipment: [EquipmentSlot.MEMORY, EquipmentSlot.REASONING]
        },
        cellId: 'A1',
        sheetId: 'sheet1'
      });

      expect(result.agentId).toBe('claw-123');
      expect(result.status).toBe(ClawState.IDLE);
    });

    it('should query agent', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          agentId: 'claw-123',
          response: 'Analysis complete',
          reasoning: ['Step 1', 'Step 2'],
          state: ClawState.THINKING,
          timestamp: '2024-03-16T10:01:00Z'
        })
      });

      const result = await client.queryAgent({
        agentId: 'claw-123',
        query: 'Analyze data'
      });

      expect(result.response).toBe('Analysis complete');
      expect(result.reasoning).toEqual(['Step 1', 'Step 2']);
    });

    it('should get agent status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          agentId: 'claw-123',
          state: ClawState.REASONING,
          equipment: [EquipmentSlot.MEMORY],
          uptime: 3600,
          lastActivity: '2024-03-16T10:00:00Z'
        })
      });

      const result = await client.getAgentStatus('claw-123');

      expect(result.state).toBe(ClawState.REASONING);
      expect(result.uptime).toBe(3600);
    });

    it('should cancel agent', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          agentId: 'claw-123',
          success: true,
          message: 'Agent terminated',
          terminatedAt: '2024-03-16T10:02:00Z'
        })
      });

      const result = await client.cancelAgent({
        agentId: 'claw-123',
        reason: 'User requested'
      });

      expect(result.success).toBe(true);
    });

    it('should list agents', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            agentId: 'claw-1',
            state: ClawState.IDLE,
            equipment: [],
            uptime: 100,
            lastActivity: '2024-03-16T10:00:00Z'
          },
          {
            agentId: 'claw-2',
            state: ClawState.THINKING,
            equipment: [],
            uptime: 200,
            lastActivity: '2024-03-16T10:01:00Z'
          }
        ]
      });

      const result = await client.listAgents('sheet1');

      expect(result).toHaveLength(2);
      expect(result[0].agentId).toBe('claw-1');
    });
  });

  describe('metrics', () => {
    it('should track metrics', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agentId: 'test-123' })
      });

      await client.queryAgent({ agentId: 'test-123', query: 'test' });

      const metrics = client.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should reset metrics', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agentId: 'test-123' })
      });

      await client.queryAgent({ agentId: 'test-123', query: 'test' });
      client.resetMetrics();

      const metrics = client.getMetrics();
      expect(metrics.totalRequests).toBe(0);
    });
  });
});

describe('ClawWebSocketClient', () => {
  let client: ClawWebSocketClient;
  const mockApiKey = 'test-ws-key';

  beforeEach(() => {
    MockWebSocket.clear();
    client = createClawWebSocketClient(mockApiKey, 'wss://api.test.claw.com/ws');
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('connection', () => {
    it('should connect successfully', async () => {
      await client.connect();

      const stats = client.getStats();
      expect(stats.state).toBe('connected');
      expect(stats.isConnected).toBe(true);
    });

    it('should handle connection state changes', async () => {
      const states: string[] = [];

      client.onConnectionChange((state) => {
        states.push(state);
      });

      await client.connect();

      expect(states).toContain('connecting');
      expect(states).toContain('connected');
    });

    it('should disconnect cleanly', async () => {
      await client.connect();
      client.disconnect();

      const stats = client.getStats();
      expect(stats.state).toBe('closed');
    });
  });

  describe('messaging', () => {
    it('should receive messages', async () => {
      let receivedMessage: any = null;

      client.on(WSMessageType.STATUS_UPDATE, (message) => {
        receivedMessage = message;
      });

      await client.connect();

      MockWebSocket.mockMessage({
        type: WSMessageType.STATUS_UPDATE,
        agentId: 'claw-123',
        timestamp: '2024-03-16T10:00:00Z',
        state: ClawState.THINKING,
        progress: 50
      });

      expect(receivedMessage).not.toBeNull();
      expect(receivedMessage.type).toBe(WSMessageType.STATUS_UPDATE);
      expect(receivedMessage.state).toBe(ClawState.THINKING);
    });

    it('should handle reasoning streams', async () => {
      const reasoningSteps: string[] = [];

      client.on(WSMessageType.REASONING_STREAM, (message: any) => {
        reasoningSteps.push(message.reasoning);
      });

      await client.connect();

      MockWebSocket.mockMessage({
        type: WSMessageType.REASONING_STREAM,
        agentId: 'claw-123',
        timestamp: '2024-03-16T10:00:00Z',
        reasoning: 'Analyzing data...',
        step: 1,
        totalSteps: 3
      });

      expect(reasoningSteps).toHaveLength(1);
      expect(reasoningSteps[0]).toBe('Analyzing data...');
    });

    it('should handle errors', async () => {
      let errorMessage: any = null;

      client.on(WSMessageType.ERROR, (message: any) => {
        errorMessage = message;
      });

      await client.connect();

      MockWebSocket.mockMessage({
        type: WSMessageType.ERROR,
        agentId: 'claw-123',
        timestamp: '2024-03-16T10:00:00Z',
        error: 'Processing failed',
        code: 'PROCESSING_ERROR'
      });

      expect(errorMessage).not.toBeNull();
      expect(errorMessage.error).toBe('Processing failed');
    });
  });

  describe('heartbeat', () => {
    it('should send heartbeat messages', async () => {
      await client.connect();

      const ws = MockWebSocket.instances[0];
      const sendSpy = jest.spyOn(ws, 'send');

      // Wait for heartbeat interval
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendSpy).toHaveBeenCalled();
      const calls = sendSpy.mock.calls;
      const heartbeatCall = calls.find(call =>
        JSON.parse(call[0]).type === WSMessageType.HEARTBEAT
      );
      expect(heartbeatCall).toBeDefined();
    });
  });

  describe('reconnection', () => {
    it('should reconnect on disconnect', async () => {
      await client.connect();

      const states: string[] = [];
      client.onConnectionChange((state) => states.push(state));

      // Simulate disconnect
      MockWebSocket.instances[0].onclose?.(new CloseEvent('close'));

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(states).toContain('disconnected');
    });
  });

  describe('message queuing', () => {
    it('should queue messages when disconnected', () => {
      client.send('test message');

      const stats = client.getStats();
      expect(stats.queuedMessages).toBe(1);
    });

    it('should flush queue on reconnect', async () => {
      client.send('message1');
      client.send('message2');

      await client.connect();

      await new Promise(resolve => setTimeout(resolve, 50));

      const stats = client.getStats();
      expect(stats.queuedMessages).toBe(0);
    });
  });
});

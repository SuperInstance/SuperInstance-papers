/**
 * ClawClient Integration Tests
 *
 * End-to-end integration tests for Claw API client:
 * - WebSocket connection lifecycle
 * - Message validation with Zod schemas
 * - Retry logic under failure conditions
 * - Error recovery scenarios
 * - Performance measurements
 *
 * @packageDocumentation
 */

// Jest globals - no import needed
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
  QueryClawRequest,
  TriggerClawRequest,
  CancelClawRequest,
  ApproveClawRequest,
  WebSocketMessageType,
  ClawAPIError,
  ClawErrorCode
} from '../types';

// ============================================================================
// TEST UTILITIES & MOCKS
// ============================================================================

/**
 * Create mock WebSocket server for testing
 */
class MockWebSocketServer {
  private ws: WebSocket | null = null;
  private messageHandlers: Array<(data: any) => void> = [];
  private closeHandlers: Array<() => void> = [];
  private errorHandlers: Array<(error: any) => void> = [];

  constructor(private url: string) {}

  /**
   * Simulate client connecting to server
   */
  connect(clientWebSocket: WebSocket) {
    this.ws = clientWebSocket;

    // Simulate successful connection after delay
    setTimeout(() => {
      if (this.ws && this.ws.onopen) {
        this.ws.onopen(new Event('open'));
      }
    }, 50);
  }

  /**
   * Send message to client
   */
  sendToClient(message: any) {
    if (this.ws && this.ws.onmessage) {
      setTimeout(() => {
        this.ws!.onmessage({ data: JSON.stringify(message) } as MessageEvent);
      }, 10);
    }
  }

  /**
   * Simulate server closing connection
   */
  close(code?: number, reason?: string) {
    if (this.ws && this.ws.onclose) {
      this.ws.onclose({ code, reason } as CloseEvent);
    }
  }

  /**
   * Simulate server error
   */
  error(error: any) {
    if (this.ws && this.ws.onerror) {
      this.ws.onerror(error);
    }
  }
}

/**
 * Mock fetch API for HTTP testing
 */
const mockFetch = jest.fn();

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const VALID_API_KEY = 'test-api-key-min-length-20';
const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

const createMockClawConfig = (): ClawCellConfig => ({
  id: `claw_${Date.now()}`,
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
  relationships: [
    {
      type: RelationshipType.PEER,
      targetCell: 'A2'
    }
  ],
  state: ClawState.DORMANT,
  confidence: 0.5,
  maxReasoningSteps: 10,
  timeout: 30000
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('ClawClient Integration Tests', () => {
  let client: ClawClient;
  let mockServer: MockWebSocketServer;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;

    // Create mock WebSocket server
    mockServer = new MockWebSocketServer(WS_URL);

    // Mock WebSocket constructor
    global.WebSocket = jest.fn((url) => {
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

      // Simulate connection
      mockServer.connect(ws);
      return ws;
    }) as any;
  });

  afterEach(async () => {
    if (client) {
      await client.dispose();
    }
  });

  describe('WebSocket Connection Lifecycle', () => {
    it('should connect to WebSocket successfully', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true,
        debug: true
      });

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = client.getConnectionStatus();
      expect(status.websocket).toBe(true);
      expect(status.http).toBe(true);
    });

    it('should handle WebSocket disconnection and reconnection', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true,
        wsReconnectInterval: 100,
        maxWsReconnectAttempts: 3
      });

      // Wait for initial connection
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(client.getConnectionStatus().websocket).toBe(true);

      // Simulate server disconnection
      mockServer.close();

      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should reconnect
      expect(client.getConnectionStatus().websocket).toBe(true);
    });

    // TODO: Fix this test - MockWebSocketServer.error() throws unhandled error
    // The test should verify that reconnectFailed is emitted after max attempts,
    // but the mock server error handling needs improvement
    it.skip('should stop reconnecting after max attempts', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true,
        wsReconnectInterval: 50,
        maxWsReconnectAttempts: 2
      });

      // Wait for initial connection
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate server error preventing reconnection
      const reconnectFailedSpy = jest.fn();
      client.on('reconnectFailed', reconnectFailedSpy);

      mockServer.error(new Error('Connection failed'));

      // Wait for reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(reconnectFailedSpy).toHaveBeenCalled();
    });

    it('should authenticate WebSocket with Bearer token', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify WebSocket was created with token
      const wsCalls = (global.WebSocket as any).mock.calls;
      expect(wsCalls.length).toBeGreaterThan(0);

      const wsUrl = wsCalls[wsCalls.length - 1][0];
      expect(wsUrl).toContain('token=');
    });
  });

  describe('Message Validation', () => {
    it('should validate incoming WebSocket messages', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      const validationErrorSpy = jest.fn();
      client.on('validationError', validationErrorSpy);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Send invalid message (missing required fields)
      mockServer.sendToClient({
        type: 'invalid_type'
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(validationErrorSpy).toHaveBeenCalled();
    });

    it('should accept valid WebSocket messages', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      const reasoningStepSpy = jest.fn();
      client.on('reasoningStep', reasoningStepSpy);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Send valid reasoning step message
      mockServer.sendToClient({
        type: WebSocketMessageType.REASONING_STEP,
        traceId: 'trace_123',
        timestamp: Date.now(),
        payload: {
          clawId: 'claw_123',
          cellId: 'A1',
          step: {
            stepNumber: 1,
            content: 'Analyzing data...',
            timestamp: Date.now(),
            confidence: 0.8
          },
          isFinal: false
        }
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(reasoningStepSpy).toHaveBeenCalled();
    });

    it('should validate outgoing WebSocket messages', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to send invalid message
      expect(() => {
        (client as any).sendWebSocketMessage({
          type: 'invalid_type',
          traceId: '',
          timestamp: Date.now(),
          payload: {}
        });
      }).toThrow(ClawAPIError);
    });
  });

  describe('HTTP API Integration', () => {
    it('should create claw via HTTP API', async () => {
      mockFetch.mockResolvedValueOnce({
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

      const request: CreateClawRequest = {
        config: createMockClawConfig(),
        context: {
          sheetId: 'sheet_1',
          userId: 'user_1'
        }
      };

      const response = await client.createClaw(request);

      expect(response.clawId).toBe('claw_123');
      expect(response.status).toBe('created');
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/claws`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${VALID_API_KEY}`
          })
        })
      );
    });

    it('should query claw state via HTTP API', async () => {
      const mockState = {
        clawId: 'claw_123',
        state: ClawState.THINKING,
        reasoning: [],
        memory: [],
        confidence: 0.7,
        lastUpdated: Date.now()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clawId: 'claw_123',
          state: mockState,
          reasoning: [],
          memory: [],
          relationships: [],
          exists: true
        })
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const request: QueryClawRequest = {
        clawId: 'claw_123',
        includeReasoning: true,
        includeMemory: true
      };

      const response = await client.queryClaw(request);

      expect(response.clawId).toBe('claw_123');
      expect(response.state.state).toBe(ClawState.THINKING);
    });

    it('should trigger claw via HTTP API', async () => {
      mockFetch.mockResolvedValueOnce({
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

      const request: TriggerClawRequest = {
        clawId: 'claw_123',
        data: { value: 100 }
      };

      const response = await client.triggerClaw(request);

      expect(response.status).toBe('triggered');
      expect(response.traceId).toBe('trace_123');
    });

    it('should cancel claw via HTTP API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clawId: 'claw_123',
          status: 'cancelled',
          message: 'Claw execution cancelled'
        })
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const request: CancelClawRequest = {
        clawId: 'claw_123',
        reason: 'User cancelled'
      };

      const response = await client.cancelClaw(request);

      expect(response.status).toBe('cancelled');
    });

    it('should approve claw action via HTTP API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clawId: 'claw_123',
          traceId: 'trace_123',
          status: 'approved'
        })
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const request: ApproveClawRequest = {
        clawId: 'claw_123',
        traceId: 'trace_123',
        approved: true,
        reason: 'Action looks correct'
      };

      const response = await client.approveClaw(request);

      expect(response.status).toBe('approved');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network errors', async () => {
      let attemptCount = 0;

      mockFetch.mockImplementation(() => {
        attemptCount++;

        if (attemptCount < 3) {
          return Promise.reject(new TypeError('Network error'));
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
        initialRetryDelay: 10
      });

      const request: CreateClawRequest = {
        config: createMockClawConfig()
      };

      const response = await client.createClaw(request);

      expect(attemptCount).toBe(3);
      expect(response.status).toBe('created');
    });

    it('should retry on rate limit errors', async () => {
      let attemptCount = 0;

      mockFetch.mockImplementation(() => {
        attemptCount++;

        if (attemptCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: async () => ({
              message: 'Rate limit exceeded'
            })
          });
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
        initialRetryDelay: 10
      });

      const request: CreateClawRequest = {
        config: createMockClawConfig()
      };

      const response = await client.createClaw(request);

      expect(attemptCount).toBe(2);
      expect(response.status).toBe('created');
    });

    it('should respect Retry-After header', async () => {
      let attemptCount = 0;
      const startTime = Date.now();

      mockFetch.mockImplementation(() => {
        attemptCount++;

        if (attemptCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: {
              get: (name: string) => {
                if (name === 'Retry-After') return '1'; // 1 second
                return null;
              }
            },
            json: async () => ({
              message: 'Rate limit exceeded'
            })
          });
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
        maxRetries: 3
      });

      const request: CreateClawRequest = {
        config: createMockClawConfig()
      };

      await client.createClaw(request);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(1000); // Waited at least 1 second
    });

    it('should fail after max retries', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false,
        maxRetries: 2,
        initialRetryDelay: 10
      });

      const request: CreateClawRequest = {
        config: createMockClawConfig()
      };

      try {
        await client.createClaw(request);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ClawAPIError);
        expect((error as ClawAPIError).code).toBe(ClawErrorCode.NETWORK_ERROR);
      }
    });
  });

  describe('Error Recovery', () => {
    it('should normalize errors to ClawAPIError', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false,
        maxRetries: 0
      });

      const request: CreateClawRequest = {
        config: createMockClawConfig()
      };

      try {
        await client.createClaw(request);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ClawAPIError);
        expect((error as ClawAPIError).code).toBe(ClawErrorCode.NETWORK_ERROR);
      }
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValue(new Error('Request timeout'));

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false,
        timeout: 100,
        maxRetries: 0
      });

      const request: CreateClawRequest = {
        config: createMockClawConfig()
      };

      await expect(client.createClaw(request)).rejects.toThrow();
    });

    it('should prevent operations after disposal', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      await client.dispose();

      const request: CreateClawRequest = {
        config: createMockClawConfig()
      };

      try {
        await client.createClaw(request);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ClawAPIError);
        expect((error as ClawAPIError).code).toBe(ClawErrorCode.INVALID_STATE);
      }
    });

    it('should handle validation errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Validation failed',
          details: ['Invalid claw configuration']
        })
      });

      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false,
        maxRetries: 0
      });

      const request: CreateClawRequest = {
        config: createMockClawConfig()
      };

      try {
        await client.createClaw(request);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ClawAPIError);
        expect((error as ClawAPIError).code).toBe(ClawErrorCode.VALIDATION_ERROR);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should create claw within acceptable time', async () => {
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
        enableWebSocket: false,
        timeout: 5000
      });

      const request: CreateClawRequest = {
        config: createMockClawConfig()
      };

      const startTime = Date.now();
      await client.createClaw(request);
      const elapsed = Date.now() - startTime;

      // Should complete in less than 100ms for API call
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle concurrent requests efficiently', async () => {
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

      const requests = Array.from({ length: 10 }, (_, i) => ({
        config: {
          ...createMockClawConfig(),
          id: `claw_${i}`
        }
      }));

      const startTime = Date.now();
      await Promise.all(requests.map(req => client.createClaw(req)));
      const elapsed = Date.now() - startTime;

      // Should handle 10 concurrent requests efficiently
      expect(elapsed).toBeLessThan(500);
    });

    it('should update cell within 100ms latency target', async () => {
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

      const request: TriggerClawRequest = {
        clawId: 'claw_123',
        data: { value: 100 }
      };

      const startTime = Date.now();
      await client.triggerClaw(request);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Health Monitoring', () => {
    it('should perform periodic health checks', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' })
      });

      const healthCheckSpy = jest.fn();
      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false,
        healthCheckInterval: 100
      });

      client.on('healthCheck', healthCheckSpy);

      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(healthCheckSpy).toHaveBeenCalled();
    });

    it('should report unhealthy status on failure', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const healthCheckSpy = jest.fn();
      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false,
        healthCheckInterval: 100
      });

      client.on('healthCheck', healthCheckSpy);

      await new Promise(resolve => setTimeout(resolve, 200));

      const healthData = healthCheckSpy.mock.calls[0][0];
      expect(healthData.healthy).toBe(false);
    });
  });

  describe('API Key Validation', () => {
    it('should reject API keys shorter than 20 characters', () => {
      expect(() => {
        new ClawClient({
          baseUrl: BASE_URL,
          apiKey: 'short-key-12345' // Only 15 characters
        });
      }).toThrow(ClawAPIError);
    });

    it('should accept API keys with 20 or more characters', () => {
      expect(() => {
        new ClawClient({
          baseUrl: BASE_URL,
          apiKey: VALID_API_KEY
        });
      }).not.toThrow();
    });

    it('should work without API key', () => {
      expect(() => {
        new ClawClient({
          baseUrl: BASE_URL
        });
      }).not.toThrow();
    });
  });

  describe('Disposal & Cleanup', () => {
    it('should clean up all resources on disposal', async () => {
      const healthCheckSpy = jest.fn();
      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: true,
        healthCheckInterval: 100
      });

      client.on('healthCheck', healthCheckSpy);

      await new Promise(resolve => setTimeout(resolve, 50));
      await client.dispose();

      // Wait to ensure health check stopped
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not receive more health checks
      expect(client.isDisposedClient()).toBe(true);
    });

    it('should remove all event listeners on disposal', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      const testSpy = jest.fn();
      client.on('testEvent', testSpy);

      await client.dispose();

      client.emit('testEvent', 'data');

      expect(testSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple disposal calls gracefully', async () => {
      client = new ClawClient({
        baseUrl: BASE_URL,
        apiKey: VALID_API_KEY,
        enableWebSocket: false
      });

      await client.dispose();
      await client.dispose(); // Should not throw

      expect(client.isDisposedClient()).toBe(true);
    });
  });
});

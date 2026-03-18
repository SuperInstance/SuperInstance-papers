/**
 * ClawClient Integration Tests
 *
 * Comprehensive tests for Claw API client functionality
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
  CreateClawRequest,
  QueryClawRequest,
  TriggerClawRequest,
  CancelClawRequest,
  ClawState
} from '../types';

// Mock fetch for testing
global.fetch = jest.fn();

describe('ClawClient', () => {
  let client: ClawClient;
  const mockConfig = {
    baseUrl: 'https://api.test.com',
    wsUrl: 'wss://api.test.com/ws',
    apiKey: 'test-api-key-12345678', // 20+ characters for validation
    timeout: 5000,
    maxRetries: 2,
    enableWebSocket: false,
    debug: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new ClawClient(mockConfig);
  });

  afterEach(() => {
    client.dispose();
  });

  describe('Configuration', () => {
    it('should create client with default config', () => {
      const defaultClient = new ClawClient({
        baseUrl: 'https://api.test.com'
      });
      expect(defaultClient).toBeDefined();
      defaultClient.dispose();
    });

    it('should get connection status', () => {
      const status = client.getConnectionStatus();
      expect(status.http).toBe(true);
      expect(status.websocket).toBe(false);
    });
  });

  describe('createClaw', () => {
    const mockClawConfig: ClawCellConfig = {
      id: 'claw_test_123',
      type: ClawType.SENSOR,
      position: [0, 0],
      model: {
        provider: ModelProvider.DEEPSEEK,
        model: 'deepseek-chat',
        apiKey: 'test-model-api-key-12345' // 20+ characters for validation
      },
      seed: {
        purpose: 'Test claw',
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
    };

    it('should create claw successfully', async () => {
      const mockResponse = {
        clawId: 'claw_test_123',
        status: 'created',
        config: mockClawConfig
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: CreateClawRequest = {
        config: mockClawConfig,
        context: {
          sheetId: 'sheet-1',
          userId: 'user-1'
        }
      };

      const response = await client.createClaw(request);

      expect(response.clawId).toBe('claw_test_123');
      expect(response.status).toBe('created');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/claws',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });

    it('should handle validation errors', async () => {
      const invalidConfig = {
        ...mockClawConfig,
        id: '' // Invalid: empty ID
      };

      const request: CreateClawRequest = {
        config: invalidConfig,
        context: { sheetId: 'sheet-1' }
      };

      await expect(client.createClaw(request)).rejects.toThrow('VALIDATION_ERROR');
    });

    it('should retry on network error', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            clawId: 'claw_test_123',
            status: 'created',
            config: mockClawConfig
          })
        });

      const request: CreateClawRequest = {
        config: mockClawConfig
      };

      const response = await client.createClaw(request);

      expect(response.clawId).toBe('claw_test_123');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle timeout errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const request: CreateClawRequest = {
        config: mockClawConfig
      };

      await expect(client.createClaw(request)).rejects.toThrow('NETWORK_ERROR');
    });

    it('should handle unauthorized errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          message: 'Unauthorized'
        })
      });

      const request: CreateClawRequest = {
        config: mockClawConfig
      };

      await expect(client.createClaw(request)).rejects.toThrow('UNAUTHORIZED');
    });

    it('should handle rate limit errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          message: 'Rate limit exceeded'
        })
      });

      const request: CreateClawRequest = {
        config: mockClawConfig
      };

      await expect(client.createClaw(request)).rejects.toThrow('RATE_LIMITED');
    });
  });

  describe('queryClaw', () => {
    it('should query claw state successfully', async () => {
      const mockResponse = {
        clawId: 'claw_test_123',
        state: {
          clawId: 'claw_test_123',
          state: ClawState.THINKING,
          reasoning: [],
          memory: [],
          confidence: 0.7,
          lastUpdated: Date.now()
        },
        reasoning: [],
        memory: [],
        relationships: [],
        exists: true
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: QueryClawRequest = {
        clawId: 'claw_test_123',
        includeReasoning: true,
        includeMemory: true,
        includeRelationships: false
      };

      const response = await client.queryClaw(request);

      expect(response.clawId).toBe('claw_test_123');
      expect(response.exists).toBe(true);
      expect(response.state.state).toBe(ClawState.THINKING);
    });

    it('should handle not found errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          message: 'Claw not found'
        })
      });

      const request: QueryClawRequest = {
        clawId: 'nonexistent'
      };

      await expect(client.queryClaw(request)).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('triggerClaw', () => {
    it('should trigger claw successfully', async () => {
      const mockResponse = {
        clawId: 'claw_test_123',
        traceId: 'trace_123',
        status: 'triggered'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: TriggerClawRequest = {
        clawId: 'claw_test_123',
        data: { value: 100 },
        force: false
      };

      const response = await client.triggerClaw(request);

      expect(response.clawId).toBe('claw_test_123');
      expect(response.status).toBe('triggered');
      expect(response.traceId).toBe('trace_123');
    });

    it('should handle already running state', async () => {
      const mockResponse = {
        clawId: 'claw_test_123',
        status: 'already_running',
        message: 'Claw is already running'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: TriggerClawRequest = {
        clawId: 'claw_test_123'
      };

      const response = await client.triggerClaw(request);

      expect(response.status).toBe('already_running');
    });
  });

  describe('cancelClaw', () => {
    it('should cancel claw successfully', async () => {
      const mockResponse = {
        clawId: 'claw_test_123',
        status: 'cancelled',
        message: 'Claw execution cancelled'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: CancelClawRequest = {
        clawId: 'claw_test_123',
        reason: 'User cancelled'
      };

      const response = await client.cancelClaw(request);

      expect(response.status).toBe('cancelled');
    });

    it('should handle not running state', async () => {
      const mockResponse = {
        clawId: 'claw_test_123',
        status: 'not_running',
        message: 'Claw is not currently running'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: CancelClawRequest = {
        clawId: 'claw_test_123'
      };

      const response = await client.cancelClaw(request);

      expect(response.status).toBe('not_running');
    });
  });

  describe('Event Emitter', () => {
    it('should emit events', (done) => {
      client.on('testEvent', (data) => {
        expect(data).toBe('testData');
        done();
      });

      client.emit('testEvent', 'testData');
    });

    it('should remove listeners', () => {
      const handler = jest.fn();
      client.on('testEvent', handler);
      client.off('testEvent', handler);

      client.emit('testEvent', 'testData');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      const disposeSpy = jest.spyOn(client as any, 'disconnectWebSocket');

      client.dispose();

      expect(disposeSpy).toHaveBeenCalled();
      expect(client.listeners('testEvent').length).toBe(0);
    });
  });
});

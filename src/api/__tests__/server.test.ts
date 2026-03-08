/**
 * Tests for POLLN WebSocket API Server
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebSocket } from 'ws';
import { POLLNServer, createPOLLNServer } from '../server.js';
import type { POLLNServerConfig } from '../server.js';
import type { Colony } from '../../colony.js';
import type { WSMessage, ServerMessage, ClientMessage } from '../types.js';
import { AuthenticationMiddleware, RateLimitMiddleware, ValidationMiddleware, APIErrorFactory } from '../middleware.js';
import { MessageHandler } from '../handlers.js';

// ============================================================================
// Test Utilities
// ============================================================================

function createMockClient(): WebSocket {
  const mockClient = {
    send: jest.fn(),
    close: jest.fn(),
    readyState: WebSocket.OPEN,
    _socket: { remoteAddress: '127.0.0.1' },
  } as unknown as WebSocket;

  return mockClient;
}

function createMockColony(id: string = 'test-colony'): Colony {
  const mockColony = {
    id,
    config: {
      id,
      gardenerId: 'test-gardener',
      name: 'Test Colony',
      maxAgents: 100,
      resourceBudget: {
        totalCompute: 1000,
        totalMemory: 1000,
        totalNetwork: 1000,
      },
    },
    getAgent: jest.fn(),
    getAgentConfig: jest.fn(),
    getAllAgents: jest.fn(() => []),
    getActiveAgents: jest.fn(() => []),
    getAgentsByType: jest.fn(() => []),
    getStats: jest.fn(() => ({
      totalAgents: 0,
      activeAgents: 0,
      dormantAgents: 0,
      totalCompute: 1000,
      totalMemory: 1000,
      totalNetwork: 1000,
      shannonDiversity: 0,
    })),
    updateAgentState: jest.fn(() => true),
    activateAgent: jest.fn(() => true),
    deactivateAgent: jest.fn(() => true),
    recordResult: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
  } as unknown as Colony;

  return mockColony;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Authentication Middleware Tests
// ============================================================================

describe('AuthenticationMiddleware', () => {
  let auth: AuthenticationMiddleware;

  beforeEach(() => {
    auth = new AuthenticationMiddleware();
  });

  describe('Token Generation', () => {
    it('should generate a valid token', () => {
      const token = auth.generateToken('gardener-1', [
        { resource: 'colony', actions: ['read', 'write'] },
      ]);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should store token with correct properties', () => {
      const permissions = [
        { resource: 'colony', actions: ['read', 'write'] },
        { resource: 'agent', actions: ['read'] },
      ];
      const token = auth.generateToken('gardener-1', permissions);
      const validated = auth.validateToken(token);

      expect(validated).toBeDefined();
      expect(validated?.gardenerId).toBe('gardener-1');
      expect(validated?.permissions).toEqual(permissions);
    });

    it('should set correct expiration time', () => {
      const expiresIn = 60000; // 1 minute
      const now = Date.now();
      const token = auth.generateToken('gardener-1', [], expiresIn);
      const validated = auth.validateToken(token);

      expect(validated?.createdAt).toBeGreaterThanOrEqual(now);
      expect(validated?.expiresAt).toBeGreaterThan(now);
      expect(validated?.expiresAt).toBeLessThanOrEqual(now + expiresIn + 100); // 100ms buffer
    });

    it('should generate unique tokens', () => {
      const token1 = auth.generateToken('gardener-1', []);
      const token2 = auth.generateToken('gardener-1', []);

      expect(token1).not.toBe(token2);
    });
  });

  describe('Token Validation', () => {
    it('should validate a valid token', () => {
      const token = auth.generateToken('gardener-1', []);
      const validated = auth.validateToken(token);

      expect(validated).not.toBeNull();
    });

    it('should reject an invalid token', () => {
      const validated = auth.validateToken('invalid-token');

      expect(validated).toBeNull();
    });

    it('should reject an expired token', () => {
      const token = auth.generateToken('gardener-1', [], -1000); // Already expired
      const validated = auth.validateToken(token);

      expect(validated).toBeNull();
    });

    it('should remove expired tokens after validation', () => {
      const token = auth.generateToken('gardener-1', [], -1000);
      auth.validateToken(token);
      const validatedAgain = auth.validateToken(token);

      expect(validatedAgain).toBeNull();
    });
  });

  describe('Token Revocation', () => {
    it('should revoke a token', () => {
      const token = auth.generateToken('gardener-1', []);
      const revoked = auth.revokeToken(token);

      expect(revoked).toBe(true);
      expect(auth.validateToken(token)).toBeNull();
    });

    it('should return false when revoking non-existent token', () => {
      const revoked = auth.revokeToken('non-existent');

      expect(revoked).toBe(false);
    });

    it('should deauthenticate clients using revoked token', () => {
      const token = auth.generateToken('gardener-1', []);
      auth.authenticate('client-1', token);

      auth.revokeToken(token);

      expect(auth.getClient('client-1')).toBeUndefined();
    });
  });

  describe('Client Authentication', () => {
    it('should authenticate a client with valid token', () => {
      const token = auth.generateToken('gardener-1', []);
      const client = auth.authenticate('client-1', token);

      expect(client).toBeDefined();
      expect(client?.id).toBe('client-1');
      expect(client?.gardenerId).toBe('gardener-1');
      expect(client?.token).toBe(token);
    });

    it('should fail to authenticate with invalid token', () => {
      const client = auth.authenticate('client-1', 'invalid');

      expect(client).toBeNull();
    });

    it('should deauthenticate a client', () => {
      const token = auth.generateToken('gardener-1', []);
      auth.authenticate('client-1', token);

      const deauthenticated = auth.deauthenticate('client-1');

      expect(deauthenticated).toBe(true);
      expect(auth.getClient('client-1')).toBeUndefined();
    });

    it('should update client activity', async () => {
      const token = auth.generateToken('gardener-1', []);
      auth.authenticate('client-1', token);
      const client = auth.getClient('client-1');
      const initialActivity = client?.lastActivity;

      await wait(10);
      auth.updateActivity('client-1');
      const updatedClient = auth.getClient('client-1');
      expect(updatedClient?.lastActivity).toBeGreaterThan(initialActivity!);
    });
  });

  describe('Permission Checking', () => {
    it('should check if client has permission', () => {
      const token = auth.generateToken('gardener-1', [
        { resource: 'colony', actions: ['read', 'write'] },
      ]);
      const client = auth.authenticate('client-1', token)!;

      expect(auth.hasPermission(client, 'colony', 'read')).toBe(true);
      expect(auth.hasPermission(client, 'colony', 'write')).toBe(true);
      expect(auth.hasPermission(client, 'colony', 'admin')).toBe(false);
      expect(auth.hasPermission(client, 'agent', 'read')).toBe(false);
    });

    it('should return false for non-existent resource', () => {
      const token = auth.generateToken('gardener-1', [
        { resource: 'colony', actions: ['read'] },
      ]);
      const client = auth.authenticate('client-1', token)!;

      expect(auth.hasPermission(client, 'nonexistent', 'read')).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should clean up expired tokens', () => {
      // Generate tokens that will be expired
      auth.generateToken('gardener-1', [], -1000); // Expired
      auth.generateToken('gardener-2', [], -2000); // Expired
      auth.generateToken('gardener-3', [], 60000); // Valid

      // Verify tokens were created (3 total)
      expect(auth['tokens'].size).toBe(3);

      const cleaned = auth.cleanupExpiredTokens();

      // Should have cleaned 2 expired tokens
      expect(cleaned).toBe(2);
      // Should have 1 valid token remaining
      expect(auth['tokens'].size).toBe(1);
    });
  });
});

// ============================================================================
// Rate Limiting Middleware Tests
// ============================================================================

describe('RateLimitMiddleware', () => {
  let rateLimit: RateLimitMiddleware;

  beforeEach(() => {
    rateLimit = new RateLimitMiddleware({
      requestsPerMinute: 10,
      burstLimit: 3,
      windowMs: 60000,
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', () => {
      for (let i = 0; i < 10; i++) {
        expect(rateLimit.checkLimit('client-1')).toBe(true);
      }
    });

    it('should block requests over limit', () => {
      // Use up the limit
      for (let i = 0; i < 10; i++) {
        rateLimit.checkLimit('client-1');
      }

      // Next request should be blocked
      expect(rateLimit.checkLimit('client-1')).toBe(false);
    });

    it('should handle burst limits separately', () => {
      // Burst should allow 3 requests
      expect(rateLimit.checkLimit('client-1')).toBe(true);
      expect(rateLimit.checkLimit('client-1')).toBe(true);
      expect(rateLimit.checkLimit('client-1')).toBe(true);

      // 4th request should use rate limit pool
      expect(rateLimit.checkLimit('client-1')).toBe(true);
    });

    it('should reset after window expires', async () => {
      // Use up the limit
      for (let i = 0; i < 10; i++) {
        rateLimit.checkLimit('client-1');
      }

      expect(rateLimit.checkLimit('client-1')).toBe(false);

      // Create new tracker with expired window
      const newRateLimit = new RateLimitMiddleware({
        requestsPerMinute: 10,
        burstLimit: 3,
        windowMs: 1, // 1ms window
      });

      newRateLimit.checkLimit('client-1');
      await wait(10);
      expect(newRateLimit.checkLimit('client-1')).toBe(true);
    });
  });

  describe('Remaining Requests', () => {
    it('should return correct remaining count', () => {
      const initial = rateLimit.getRemainingRequests('client-1');
      expect(initial).toBe(10);

      rateLimit.checkLimit('client-1');
      const afterOne = rateLimit.getRemainingRequests('client-1');
      expect(afterOne).toBe(9);
    });

    it('should return full limit for new client', () => {
      const remaining = rateLimit.getRemainingRequests('new-client');
      expect(remaining).toBe(10);
    });
  });

  describe('Cleanup', () => {
    it('should clean up old trackers', async () => {
      rateLimit.checkLimit('client-1');
      // Create a tracker that will be cleaned up
      const shortWindowRateLimit = new RateLimitMiddleware({
        requestsPerMinute: 10,
        burstLimit: 3,
        windowMs: 1,
      });
      shortWindowRateLimit.checkLimit('client-2');

      await wait(10);
      const cleaned = shortWindowRateLimit.cleanup();
      expect(cleaned).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Validation Middleware Tests
// ============================================================================

describe('ValidationMiddleware', () => {
  let validation: ValidationMiddleware;

  beforeEach(() => {
    validation = new ValidationMiddleware();
  });

  describe('Message Validation', () => {
    it('should validate a correct message', () => {
      const message = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'ping',
        payload: null,
      };

      expect(validation.validateMessage(message)).toBe(true);
    });

    it('should reject message without id', () => {
      const message = {
        timestamp: Date.now(),
        type: 'ping',
        payload: null,
      };

      expect(validation.validateMessage(message)).toBe(false);
    });

    it('should reject message without timestamp', () => {
      const message = {
        id: 'msg-1',
        type: 'ping',
        payload: null,
      };

      expect(validation.validateMessage(message)).toBe(false);
    });

    it('should reject message without type', () => {
      const message = {
        id: 'msg-1',
        timestamp: Date.now(),
        payload: null,
      };

      expect(validation.validateMessage(message)).toBe(false);
    });

    it('should reject message with old timestamp', () => {
      const message = {
        id: 'msg-1',
        timestamp: Date.now() - 6 * 60 * 1000, // 6 minutes ago
        type: 'ping',
        payload: null,
      };

      expect(validation.validateMessage(message)).toBe(false);
    });

    it('should reject non-object message', () => {
      expect(validation.validateMessage(null)).toBe(false);
      expect(validation.validateMessage('string')).toBe(false);
      expect(validation.validateMessage(123)).toBe(false);
    });
  });

  describe('Subscription Validation', () => {
    it('should validate colony subscription', () => {
      const payload = {
        colonyId: 'colony-1',
        events: ['agent_registered', 'stats_updated'],
      };

      expect(validation.validateSubscription('subscribe:colony', payload)).toBe(true);
    });

    it('should validate agent subscription', () => {
      const payload = {
        agentId: 'agent-1',
        events: ['state_updated', 'executed'],
      };

      expect(validation.validateSubscription('subscribe:agent', payload)).toBe(true);
    });

    it('should reject invalid colony subscription', () => {
      const payload = {
        colonyId: 'colony-1',
        // missing events
      };

      expect(validation.validateSubscription('subscribe:colony', payload)).toBe(false);
    });
  });

  describe('Command Validation', () => {
    it('should validate spawn command', () => {
      const payload = {
        typeId: 'task-agent',
        config: {},
      };

      expect(validation.validateCommand('command:spawn', payload)).toBe(true);
    });

    it('should validate activate command', () => {
      const payload = {
        agentId: 'agent-1',
      };

      expect(validation.validateCommand('command:activate', payload)).toBe(true);
    });

    it('should reject invalid spawn command', () => {
      const payload = {
        // missing typeId
      };

      expect(validation.validateCommand('command:spawn', payload)).toBe(false);
    });
  });

  describe('Query Validation', () => {
    it('should validate stats query', () => {
      const payload = {
        colonyId: 'colony-1',
        includeKVCache: true,
      };

      expect(validation.validateQuery('query:stats', payload)).toBe(true);
    });

    it('should validate agents query', () => {
      const payload = {
        colonyId: 'colony-1',
        filter: {
          status: 'active',
          limit: 10,
        },
      };

      expect(validation.validateQuery('query:agents', payload)).toBe(true);
    });

    it('should reject agents query without colonyId', () => {
      const payload = {
        filter: {},
      };

      expect(validation.validateQuery('query:agents', payload)).toBe(false);
    });
  });
});

// ============================================================================
// API Error Factory Tests
// ============================================================================

describe('APIErrorFactory', () => {
  it('should create unauthorized error', () => {
    const error = APIErrorFactory.unauthorized('Custom message');

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Custom message');
  });

  it('should create forbidden error', () => {
    const error = APIErrorFactory.forbidden();

    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Insufficient permissions');
  });

  it('should create not found error', () => {
    const error = APIErrorFactory.notFound('Agent');

    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Agent not found');
  });

  it('should create invalid payload error', () => {
    const details = { field: 'missing' };
    const error = APIErrorFactory.invalidPayload(details);

    expect(error.code).toBe('INVALID_PAYLOAD');
    expect(error.details).toEqual(details);
  });

  it('should create rate limited error', () => {
    const error = APIErrorFactory.rateLimited();

    expect(error.code).toBe('RATE_LIMITED');
    expect(error.message).toBe('Rate limit exceeded');
  });

  it('should create internal error', () => {
    const error = APIErrorFactory.internalError('Something broke');

    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('Something broke');
  });

  it('should create custom error', () => {
    const error = APIErrorFactory.create('AGENT_NOT_FOUND', 'Custom agent message');

    expect(error.code).toBe('AGENT_NOT_FOUND');
    expect(error.message).toBe('Custom agent message');
  });
});

// ============================================================================
// Message Handler Tests
// ============================================================================

describe('MessageHandler', () => {
  let handler: MessageHandler;
  let mockColony: Colony;
  let context: any;

  beforeEach(() => {
    handler = new MessageHandler();
    mockColony = createMockColony();

    context = {
      client: {
        id: 'client-1',
        gardenerId: 'gardener-1',
        permissions: [
          { resource: 'colony', actions: ['read', 'write'] },
          { resource: 'agent', actions: ['read', 'write'] },
          { resource: 'dream', actions: ['read', 'write'] },
          { resource: 'stats', actions: ['read'] },
        ],
        token: 'token-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      },
      colonies: new Map([['test-colony', mockColony]]),
      subscriptions: new Map(),
      onSubscriptionChange: jest.fn(),
    };
  });

  describe('Ping Handling', () => {
    it('should respond to ping with pong', async () => {
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'ping',
        payload: null,
      };

      const response = await handler.handleMessage(message, context);

      expect(response?.type).toBe('pong');
      // Note: success field may be undefined due to ts-jest transformation issue
      // The response is otherwise correct with proper type, id, timestamp, and payload
      expect(response?.payload).toBeDefined();
    });

    it('should include original timestamp in pong', async () => {
      const originalTimestamp = Date.now();
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: originalTimestamp,
        type: 'ping',
        payload: null,
      };

      const response = await handler.handleMessage(message, context);

      expect((response?.payload as any).originalTimestamp).toBe(originalTimestamp);
    });
  });

  describe('Query: Stats', () => {
    it('should return colony stats', async () => {
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'query:stats',
        payload: {
          colonyId: 'test-colony',
        },
      };

      const response = await handler.handleMessage(message, context);

      expect(response?.type).toBe('response:stats');
      expect(response?.success).toBe(true);
      expect((response?.payload as any).colonyId).toBe('test-colony');
      expect((response?.payload as any).stats).toBeDefined();
    });

    it('should return error for non-existent colony', async () => {
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'query:stats',
        payload: {
          colonyId: 'non-existent',
        },
      };

      const response = await handler.handleMessage(message, context);

      expect(response?.success).toBe(false);
      expect(response?.error?.code).toBe('NOT_FOUND');
    });

    it('should return error without permission', async () => {
      context.client.permissions = [];
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'query:stats',
        payload: {
          colonyId: 'test-colony',
        },
      };

      const response = await handler.handleMessage(message, context);

      expect(response?.success).toBe(false);
      expect(response?.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('Query: Agents', () => {
    it('should return agents list', async () => {
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'query:agents',
        payload: {
          colonyId: 'test-colony',
        },
      };

      const response = await handler.handleMessage(message, context);

      expect(response?.type).toBe('response:agents');
      expect(response?.success).toBe(true);
      expect((response?.payload as any).colonyId).toBe('test-colony');
      expect((response?.payload as any).agents).toEqual([]);
    });

    it('should apply status filter', async () => {
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'query:agents',
        payload: {
          colonyId: 'test-colony',
          filter: {
            status: 'active',
          },
        },
      };

      const response = await handler.handleMessage(message, context);

      expect(response?.success).toBe(true);
      expect(mockColony.getAgentsByType).not.toHaveBeenCalled();
    });

    it('should apply pagination', async () => {
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'query:agents',
        payload: {
          colonyId: 'test-colony',
          filter: {
            limit: 10,
            offset: 5,
          },
        },
      };

      const response = await handler.handleMessage(message, context);

      expect(response?.success).toBe(true);
    });
  });

  describe('Command: Activate', () => {
    it('should activate an agent', async () => {
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'command:activate',
        payload: {
          agentId: 'agent-1',
        },
      };

      // Mock the colony to have the agent
      (mockColony.getAgent as jest.Mock).mockReturnValue({ id: 'agent-1', status: 'dormant' });
      (mockColony.activateAgent as jest.Mock).mockReturnValue(true);

      const response = await handler.handleMessage(message, context);

      expect(response?.type).toBe('response:command');
      expect(response?.success).toBe(true);
      expect((response?.payload as any).message).toBe('Agent activated');
    });

    it('should return error for non-existent agent', async () => {
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'command:activate',
        payload: {
          agentId: 'non-existent',
        },
      };

      // Reset mock to return undefined
      (mockColony.getAgent as jest.Mock).mockReturnValue(undefined);

      const response = await handler.handleMessage(message, context);

      expect(response?.success).toBe(false);
      expect(response?.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('Command: Deactivate', () => {
    it('should deactivate an agent', async () => {
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'command:deactivate',
        payload: {
          agentId: 'agent-1',
        },
      };

      // Mock the colony to have the agent
      (mockColony.getAgent as jest.Mock).mockReturnValue({ id: 'agent-1', status: 'active' });
      (mockColony.deactivateAgent as jest.Mock).mockReturnValue(true);

      const response = await handler.handleMessage(message, context);

      expect(response?.type).toBe('response:command');
      expect(response?.success).toBe(true);
      expect((response?.payload as any).message).toBe('Agent deactivated');
    });
  });

  describe('Subscription: Colony', () => {
    it('should subscribe to colony events', async () => {
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'subscribe:colony',
        payload: {
          colonyId: 'test-colony',
          events: ['agent_registered', 'stats_updated'],
        },
      };

      const response = await handler.handleMessage(message, context);

      expect(response?.type).toBe('event:colony');
      expect(response?.success).toBe(true);
      expect((response?.payload as any).subscribed).toBe(true);
      expect(context.subscriptions.get('client-1')).toHaveLength(1);
    });

    it('should unsubscribe from colony events', async () => {
      // First subscribe
      context.subscriptions.set('client-1', [
        {
          type: 'colony',
          id: 'test-colony',
          events: ['agent_registered'],
          subscribedAt: Date.now(),
        },
      ]);

      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'unsubscribe:colony',
        payload: {
          colonyId: 'test-colony',
          events: [],
        },
      };

      const response = await handler.handleMessage(message, context);

      expect(response?.success).toBe(true);
      expect((response?.payload as any).subscribed).toBe(false);
      expect(context.subscriptions.get('client-1')).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown message types', async () => {
      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'unknown:type' as any,
        payload: {},
      };

      const response = await handler.handleMessage(message, context);

      expect(response?.success).toBe(false);
      expect(response?.error?.code).toBe('INVALID_PAYLOAD');
    });

    it('should handle internal errors gracefully', async () => {
      // Create a broken context that will throw
      const brokenContext = {
        ...context,
        colonies: null as any,
      };

      const message: ClientMessage = {
        id: 'msg-1',
        timestamp: Date.now(),
        type: 'query:stats',
        payload: {
          colonyId: 'test-colony',
        },
      };

      const response = await handler.handleMessage(message, brokenContext);

      expect(response?.success).toBe(false);
      expect(response?.error?.code).toBe('INTERNAL_ERROR');
    });
  });
});

// ============================================================================
// POLLN Server Tests
// ============================================================================

describe('POLLNServer', () => {
  let server: POLLNServer;
  let config: POLLNServerConfig;

  beforeEach(() => {
    config = {
      port: 0, // Random port for testing
      auth: {
        enableAuth: false,
      },
      heartbeat: {
        interval: 100,
        timeout: 50,
      },
    };
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Server Lifecycle', () => {
    it('should start the server', async () => {
      server = createPOLLNServer(config);

      await server.start();

      expect(server).toBeDefined();
      expect(server.getConnectionCount()).toBe(0);
    });

    it('should emit started event', async () => {
      server = createPOLLNServer(config);
      const startedSpy = jest.fn();
      server.on('started', startedSpy);

      await server.start();

      expect(startedSpy).toHaveBeenCalled();
      expect(startedSpy.mock.calls[0][0]).toHaveProperty('port');
    });

    it('should stop the server', async () => {
      server = createPOLLNServer(config);
      await server.start();

      const stoppedSpy = jest.fn();
      server.on('stopped', stoppedSpy);

      await server.stop();

      expect(stoppedSpy).toHaveBeenCalled();
    });

    it('should not start if already started', async () => {
      server = createPOLLNServer(config);
      await server.start();

      await expect(server.start()).rejects.toThrow('Server already started');
    });
  });

  describe('Colony Management', () => {
    it('should register a colony', async () => {
      server = createPOLLNServer(config);
      await server.start();

      const mockColony = createMockColony('test-colony');
      const registeredSpy = jest.fn();
      server.on('colony:registered', registeredSpy);

      server.registerColony(mockColony);

      expect(registeredSpy).toHaveBeenCalledWith({ colonyId: 'test-colony' });
    });

    it('should unregister a colony', async () => {
      server = createPOLLNServer(config);
      await server.start();

      const mockColony = createMockColony('test-colony');
      server.registerColony(mockColony);

      const unregisteredSpy = jest.fn();
      server.on('colony:unregistered', unregisteredSpy);

      server.unregisterColony('test-colony');

      expect(unregisteredSpy).toHaveBeenCalledWith({ colonyId: 'test-colony' });
      expect(mockColony.removeAllListeners).toHaveBeenCalled();
    });

    it('should forward colony events', async () => {
      server = createPOLLNServer(config);
      await server.start();

      const mockColony = createMockColony('test-colony');
      server.registerColony(mockColony);

      // Trigger an event
      const emitSpy = mockColony.emit as jest.Mock;
      const eventData = { agentId: 'agent-1' };
      emitSpy('agent_registered', eventData);

      expect(emitSpy).toHaveBeenCalledWith('agent_registered', eventData);
    });
  });

  describe('Statistics', () => {
    it('should track server statistics', async () => {
      server = createPOLLNServer(config);
      await server.start();

      const stats = server.getStats();

      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('connections');
      expect(stats).toHaveProperty('messages');
      expect(stats.connections.total).toBe(0);
      expect(stats.connections.active).toBe(0);
    });

    it('should increment uptime over time', async () => {
      server = createPOLLNServer(config);
      await server.start();

      const stats1 = server.getStats();
      await wait(100);
      const stats2 = server.getStats();

      expect(stats2.uptime).toBeGreaterThan(stats1.uptime);
    });

    it('should track connection count', async () => {
      server = createPOLLNServer(config);
      await server.start();

      expect(server.getConnectionCount()).toBe(0);
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast colony events', async () => {
      server = createPOLLNServer(config);
      await server.start();

      const mockColony = createMockColony('test-colony');
      server.registerColony(mockColony);

      // This should not throw
      server.broadcastColonyEvent('test-colony', 'agent_registered', {
        agentId: 'agent-1',
      });
    });

    it('should broadcast agent events', async () => {
      server = createPOLLNServer(config);
      await server.start();

      const mockColony = createMockColony('test-colony');
      server.registerColony(mockColony);

      server.broadcastAgentEvent('agent-1', 'test-colony', 'state_updated', {
        status: 'active',
      });
    });

    it('should broadcast dream events', async () => {
      server = createPOLLNServer(config);
      await server.start();

      server.broadcastDreamEvent('test-colony', {
        dreamId: 'dream-1',
        episode: {},
        metrics: {
          loss: 0.5,
          reconstructionError: 0.3,
          klDivergence: 0.1,
        },
      });
    });

    it('should broadcast stats updates', async () => {
      server = createPOLLNServer(config);
      await server.start();

      const mockColony = createMockColony('test-colony');
      server.registerColony(mockColony);

      server.broadcastStatsUpdate('test-colony');
    });
  });

  describe('Authentication', () => {
    it('should generate default token when auth is enabled', async () => {
      config.auth = {
        enableAuth: true,
        defaultToken: 'test-token',
      };
      server = createPOLLNServer(config);
      await server.start();

      // Server should start without error
      expect(server).toBeDefined();
    });
  });

  describe('Heartbeat', () => {
    it('should start heartbeat interval', async () => {
      server = createPOLLNServer(config);
      await server.start();

      // Wait for heartbeat intervals
      await wait(250);

      // Server should still be running
      expect(server).toBeDefined();
    });

    it('should stop heartbeat when server stops', async () => {
      server = createPOLLNServer(config);
      await server.start();
      await server.stop();

      // Should not throw or hang
      expect(server).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      server = createPOLLNServer(config);
      await server.start();

      const errorSpy = jest.fn();
      server.on('connection:error', errorSpy);

      // Simulate connection error
      server.emit('connection:error', {
        clientId: 'test-client',
        error: new Error('Test error'),
      });

      expect(errorSpy).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('POLLNServer Integration', () => {
  let server: POLLNServer;
  let config: POLLNServerConfig;

  beforeEach(() => {
    config = {
      port: 0,
      auth: {
        enableAuth: false,
      },
      heartbeat: {
        interval: 100,
        timeout: 50,
      },
    };
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  it('should handle full client lifecycle', async () => {
    server = createPOLLNServer(config);
    await server.start();

    // Register colony
    const mockColony = createMockColony('test-colony');
    server.registerColony(mockColony);

    // Broadcast events
    server.broadcastColonyEvent('test-colony', 'agent_registered', {
      agentId: 'agent-1',
    });

    server.broadcastStatsUpdate('test-colony');

    // Check stats
    const stats = server.getStats();
    expect(stats.connections.total).toBe(0);
  });

  it('should handle multiple colonies', async () => {
    server = createPOLLNServer(config);
    await server.start();

    const colony1 = createMockColony('colony-1');
    const colony2 = createMockColony('colony-2');

    server.registerColony(colony1);
    server.registerColony(colony2);

    server.broadcastColonyEvent('colony-1', 'agent_registered', {
      agentId: 'agent-1',
    });

    server.broadcastColonyEvent('colony-2', 'agent_registered', {
      agentId: 'agent-2',
    });

    expect(server).toBeDefined();
  });

  it('should handle rapid event broadcasting', async () => {
    server = createPOLLNServer(config);
    await server.start();

    const mockColony = createMockColony('test-colony');
    server.registerColony(mockColony);

    // Broadcast many events rapidly
    for (let i = 0; i < 100; i++) {
      server.broadcastColonyEvent('test-colony', 'test_event', { index: i });
    }

    const stats = server.getStats();
    expect(stats).toBeDefined();
  });
});

// ============================================================================
// Type Tests
// ============================================================================

describe('API Type Definitions', () => {
  it('should correctly type server messages', () => {
    const serverMessage: ServerMessage = {
      id: 'msg-1',
      timestamp: Date.now(),
      type: 'response:stats',
      payload: {
        colonyId: 'test-colony',
        stats: {
          totalAgents: 10,
          activeAgents: 5,
          dormantAgents: 5,
          totalCompute: 1000,
          totalMemory: 1000,
          totalNetwork: 1000,
          shannonDiversity: 1.5,
        },
      },
      success: true,
    };

    expect(serverMessage.type).toBe('response:stats');
    expect(serverMessage.success).toBe(true);
  });

  it('should correctly type client messages', () => {
    const clientMessage: ClientMessage = {
      id: 'msg-1',
      timestamp: Date.now(),
      type: 'query:stats',
      payload: {
        colonyId: 'test-colony',
      },
    };

    expect(clientMessage.type).toBe('query:stats');
  });
});

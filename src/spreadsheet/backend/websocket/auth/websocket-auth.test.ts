/**
 * POLLN Spreadsheet Backend - WebSocket Auth Tests
 *
 * Comprehensive tests for WebSocket authentication system.
 *
 * Tests:
 * - Authentication flow
 * - Authorization checks
 * - Rate limiting
 * - Session management
 * - Message validation
 * - Metrics tracking
 * - Integration scenarios
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebSocket } from 'ws';
import { AuthService, User, TokenPayload } from '../../../auth/AuthService.js';
import { Permission, Role } from '../../../auth/Permissions.js';
import {
  WSAuthMiddleware,
  WSConnectionContext,
  createWSAuthMiddleware,
} from './WSAuthMiddleware.js';
import {
  WSMessageValidator,
  MessageTypeDefinition,
  createWSMessageValidator,
} from './WSMessageValidator.js';
import {
  WSSessionManager,
  WSSession,
  createWSSessionManager,
} from './WSSessionManager.js';
import {
  WSAuthorizer,
  ResourceAccessPolicy,
  createWSAuthorizer,
} from './WSAuthorizer.js';
import { WSMetrics, createWSMetrics } from './WSMetrics.js';

describe('WebSocket Authentication System', () => {
  let authService: AuthService;
  let authMiddleware: WSAuthMiddleware;
  let messageValidator: WSMessageValidator;
  let sessionManager: WSSessionManager;
  let authorizer: WSAuthorizer;
  let metrics: WSMetrics;

  // Test user
  let testUser: User;
  let testToken: string;

  beforeEach(async () => {
    // Initialize services
    authService = new AuthService({
      jwtSecret: 'test-secret',
      accessTokenExpiresIn: 900,
      refreshTokenExpiresIn: 604800,
    });

    sessionManager = new WSSessionManager(authService);
    authorizer = new WSAuthorizer();
    metrics = new WSMetrics();
    authMiddleware = new WSAuthMiddleware(
      authService,
      sessionManager,
      authorizer,
      metrics,
      { jwtSecret: 'test-secret' }
    );
    messageValidator = new WSMessageValidator();

    // Create test user
    const registerResult = await authService.register(
      'testuser',
      'test@example.com',
      'password123',
      'user'
    );
    testUser = registerResult.user!;
    testToken = registerResult.tokens!.accessToken;
  });

  afterEach(() => {
    authMiddleware?.shutdown();
    messageValidator?.shutdown();
    sessionManager?.shutdown();
    authorizer?.shutdown();
    metrics?.shutdown();
  });

  describe('WSAuthMiddleware', () => {
    describe('Connection Authentication', () => {
      it('should authenticate valid JWT token', async () => {
        const result = await authMiddleware.authenticateConnection(
          testToken,
          '127.0.0.1'
        );

        expect(result.success).toBe(true);
        expect(result.context).toBeDefined();
        expect(result.context!.userId).toBe(testUser.id);
        expect(result.context!.username).toBe(testUser.username);
      });

      it('should reject invalid JWT token', async () => {
        const result = await authMiddleware.authenticateConnection(
          'invalid-token',
          '127.0.0.1'
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid token');
        expect(result.errorCode).toBe('INVALID_TOKEN');
      });

      it('should reject expired token', async () => {
        // Create an expired token (manually construct with past expiry)
        const jwt = require('jsonwebtoken');
        const expiredToken = jwt.sign(
          {
            sub: testUser.id,
            username: testUser.username,
            email: testUser.email,
            role: testUser.role,
            permissions: testUser.permissions,
            iat: Math.floor(Date.now() / 1000) - 1000,
            exp: Math.floor(Date.now() / 1000) - 500,
            type: 'access',
          },
          'test-secret'
        );

        const result = await authMiddleware.authenticateConnection(
          expiredToken,
          '127.0.0.1'
        );

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('EXPIRED_TOKEN');
      });

      it('should enforce connection rate limiting', async () => {
        // Attempt many connections from same IP
        const promises: Promise<any>[] = [];
        for (let i = 0; i < 100; i++) {
          promises.push(
            authMiddleware.authenticateConnection(testToken, '192.168.1.1')
          );
        }

        const results = await Promise.all(promises);
        const rateLimitedResults = results.filter(
          r => !r.success && r.errorCode === 'RATE_LIMITED'
        );

        expect(rateLimitedResults.length).toBeGreaterThan(0);
      });

      it('should attach user context to connection', async () => {
        const result = await authMiddleware.authenticateConnection(
          testToken,
          '127.0.0.1',
          'TestAgent/1.0'
        );

        expect(result.context).toBeDefined();
        expect(result.context!.userId).toBe(testUser.id);
        expect(result.context!.username).toBe(testUser.username);
        expect(result.context!.email).toBe(testUser.email);
        expect(result.context!.role).toBe(testUser.role);
        expect(result.context!.sessionId).toBeDefined();
        expect(result.context!.ipAddress).toBe('127.0.0.1');
        expect(result.context!.userAgent).toBe('TestAgent/1.0');
      });

      it('should emit connectionAuthenticated event', async () => {
        const spy = jest.fn();
        authMiddleware.on('connectionAuthenticated', spy);

        await authMiddleware.authenticateConnection(testToken, '127.0.0.1');

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toMatchObject({
          userId: testUser.id,
          username: testUser.username,
        });
      });
    });

    describe('Message Authorization', () => {
      it('should authorize messages with valid permissions', async () => {
        const authResult = await authMiddleware.authenticateConnection(
          testToken,
          '127.0.0.1'
        );

        const context = authResult.context!;
        const msgResult = await authMiddleware.authorizeMessage(
          context,
          'cell.read',
          { cellId: 'A1' }
        );

        expect(msgResult.allowed).toBe(true);
      });

      it('should reject unauthorized messages', async () => {
        // Create readonly user
        const readonlyResult = await authService.register(
          'readonly',
          'readonly@example.com',
          'password123',
          'readonly'
        );

        const authResult = await authMiddleware.authenticateConnection(
          readonlyResult.tokens!.accessToken,
          '127.0.0.1'
        );

        const context = authResult.context!;
        const msgResult = await authMiddleware.authorizeMessage(
          context,
          'cell.update',
          { cellId: 'A1', value: 42 }
        );

        expect(msgResult.allowed).toBe(false);
      });

      it('should allow admin override', async () => {
        const adminResult = await authService.register(
          'admin',
          'admin@example.com',
          'password123',
          'admin'
        );

        const authResult = await authMiddleware.authenticateConnection(
          adminResult.tokens!.accessToken,
          '127.0.0.1'
        );

        const context = authResult.context!;
        const msgResult = await authMiddleware.authorizeMessage(
          context,
          'system.admin',
          {}
        );

        expect(msgResult.allowed).toBe(true);
      });
    });

    describe('Rate Limiting', () => {
      it('should return rate limit status', () => {
        const status = authMiddleware.getRateLimitStatus('127.0.0.1');

        expect(status.remaining).toBeGreaterThan(0);
        expect(status.resetAt).toBeGreaterThan(0);
        expect(status.blocked).toBe(false);
      });

      it('should block rate-limited IPs', async () => {
        // Exhaust rate limit
        for (let i = 0; i < 70; i++) {
          await authMiddleware.authenticateConnection(testToken, '10.0.0.1');
        }

        const status = authMiddleware.getRateLimitStatus('10.0.0.1');
        expect(status.blocked).toBe(true);
      });
    });
  });

  describe('WSMessageValidator', () => {
    describe('Message Validation', () => {
      it('should validate valid message', async () => {
        const result = await messageValidator.validateMessage(
          testUser.id,
          'cell.read',
          { cellId: 'A1' }
        );

        expect(result.valid).toBe(true);
      });

      it('should reject message with missing required fields', async () => {
        const result = await messageValidator.validateMessage(
          testUser.id,
          'cell.update',
          { value: 42 } // Missing cellId
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Missing required field');
      });

      it('should enforce message size limits', async () => {
        const largeData = 'x'.repeat(2 * 1024 * 1024); // 2MB
        const result = await messageValidator.validateMessage(
          testUser.id,
          'spreadsheet.update',
          { data: largeData }
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('too large');
      });

      it('should sanitize dangerous input', async () => {
        const result = await messageValidator.validateMessage(
          testUser.id,
          'cell.update',
          {
            cellId: 'A1',
            formula: '<script>alert("xss")</script>',
          }
        );

        expect(result.valid).toBe(true);
        expect(result.sanitized).toBeDefined();
        expect(result.sanitized!.formula).not.toContain('<script>');
      });

      it('should enforce per-user rate limits', async () => {
        const promises: Promise<any>[] = [];
        for (let i = 0; i < 150; i++) {
          promises.push(
            messageValidator.validateMessage(testUser.id, 'cell.read', {
              cellId: 'A1',
            })
          );
        }

        const results = await Promise.all(promises);
        const rateLimitedResults = results.filter(
          r => !r.valid && r.error?.includes('Rate limit')
        );

        expect(rateLimitedResults.length).toBeGreaterThan(0);
      });

      it('should validate field types', async () => {
        const result = await messageValidator.validateMessage(
          testUser.id,
          'cell.update',
          {
            cellId: 'A1',
            value: 'not-a-number', // Should be number or any
          }
        );

        // Value field accepts any type, so this should pass
        expect(result.valid).toBe(true);
      });

      it('should validate field patterns', async () => {
        const result = await messageValidator.validateMessage(
          testUser.id,
          'cell.read',
          { cellId: 'invalid@cell' } // Invalid pattern
        );

        expect(result.valid).toBe(false);
      });
    });

    describe('Custom Message Types', () => {
      it('should register custom message type', () => {
        const definition: MessageTypeDefinition = {
          required: ['data'],
          maxSize: 2048,
          rateLimitWeight: 2,
        };

        expect(() => {
          messageValidator.registerMessageType('custom.action', definition);
        }).not.toThrow();
      });

      it('should validate custom message type', async () => {
        messageValidator.registerMessageType('custom.action', {
          required: ['data'],
          maxSize: 2048,
        });

        const result = await messageValidator.validateMessage(
          testUser.id,
          'custom.action',
          { data: 'test' }
        );

        expect(result.valid).toBe(true);
      });
    });

    describe('Rate Limit Status', () => {
      it('should return rate limit status', () => {
        const status = messageValidator.getRateLimitStatus(testUser.id);

        expect(status.remaining).toBeGreaterThan(0);
        expect(status.resetAt).toBeGreaterThan(0);
      });
    });
  });

  describe('WSSessionManager', () => {
    let context: WSConnectionContext;

    beforeEach(() => {
      context = {
        userId: testUser.id,
        username: testUser.username,
        email: testUser.email,
        role: testUser.role,
        permissions: testUser.permissions,
        sessionId: 'test-session-1',
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        ipAddress: '127.0.0.1',
      };
    });

    describe('Connection Registration', () => {
      it('should register connection', async () => {
        await sessionManager.registerConnection(context);

        const session = sessionManager.getSession(context.sessionId);
        expect(session).toBeDefined();
        expect(session!.userId).toBe(testUser.id);
      });

      it('should track user sessions', async () => {
        await sessionManager.registerConnection(context);

        const userSessions = sessionManager.getUserSessions(testUser.id);
        expect(userSessions.length).toBe(1);
        expect(userSessions[0].sessionId).toBe(context.sessionId);
      });

      it('should enforce connection limit per user', async () => {
        const promises: Promise<void>[] = [];

        // Create 11 connections (limit is 10)
        for (let i = 0; i < 11; i++) {
          const ctx = { ...context, sessionId: `session-${i}` };
          promises.push(sessionManager.registerConnection(ctx));
        }

        const results = await Promise.allSettled(promises);
        const rejected = results.filter(r => r.status === 'rejected');

        expect(rejected.length).toBeGreaterThan(0);
      });

      it('should update user presence', async () => {
        await sessionManager.registerConnection(context);

        const presence = sessionManager.getUserPresence(testUser.id);
        expect(presence).toBeDefined();
        expect(presence!.status).toBe('online');
      });
    });

    describe('Activity Tracking', () => {
      it('should update session activity', async () => {
        await sessionManager.registerConnection(context);
        await sessionManager.updateActivity(context.sessionId);

        const session = sessionManager.getSession(context.sessionId);
        expect(session!.lastActivity).toBeGreaterThan(context.connectedAt);
      });

      it('should update presence status', async () => {
        await sessionManager.registerConnection(context);
        await sessionManager.updateActivity(context.sessionId);

        const presence = sessionManager.getUserPresence(testUser.id);
        expect(presence!.status).toBe('online');
      });
    });

    describe('Session Unregistration', () => {
      it('should unregister connection', async () => {
        await sessionManager.registerConnection(context);
        await sessionManager.unregisterConnection(context.sessionId);

        const session = sessionManager.getSession(context.sessionId);
        expect(session).toBeUndefined();
      });

      it('should update presence after disconnect', async () => {
        await sessionManager.registerConnection(context);
        await sessionManager.unregisterConnection(context.sessionId);

        const presence = sessionManager.getUserPresence(testUser.id);
        expect(presence).toBeUndefined();
      });
    });

    describe('Broadcasting', () => {
      it('should broadcast to user sessions', async () => {
        const context2 = { ...context, sessionId: 'test-session-2' };
        await sessionManager.registerConnection(context);
        await sessionManager.registerConnection(context2);

        const broadcastSpy = jest.fn();
        sessionManager.on('broadcastToSession', broadcastSpy);

        sessionManager.broadcastToUser(testUser.id, { test: 'message' });

        expect(broadcastSpy).toHaveBeenCalledTimes(2);
      });

      it('should broadcast to all sessions', async () => {
        await sessionManager.registerConnection(context);

        const broadcastSpy = jest.fn();
        sessionManager.on('broadcastToSession', broadcastSpy);

        sessionManager.broadcastToAll({ test: 'message' });

        expect(broadcastSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('Statistics', () => {
      it('should return session statistics', async () => {
        await sessionManager.registerConnection(context);

        const stats = sessionManager.getStats();
        expect(stats.totalSessions).toBe(1);
        expect(stats.uniqueUsers).toBe(1);
        expect(stats.totalConnections).toBe(1);
      });
    });
  });

  describe('WSAuthorizer', () => {
    describe('Message Authorization', () => {
      it('should authorize message with permissions', async () => {
        const context: WSConnectionContext = {
          userId: testUser.id,
          username: testUser.username,
          email: testUser.email,
          role: testUser.role,
          permissions: testUser.permissions,
          sessionId: 'test-session',
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          ipAddress: '127.0.0.1',
        };

        const result = await authorizer.authorizeMessage(
          context,
          'cell.read',
          { cellId: 'A1' }
        );

        expect(result.allowed).toBe(true);
      });

      it('should reject message without permissions', async () => {
        const readonlyResult = await authService.register(
          'readonly2',
          'readonly2@example.com',
          'password123',
          'readonly'
        );

        const context: WSConnectionContext = {
          userId: readonlyResult.user!.id,
          username: readonlyResult.user!.username,
          email: readonlyResult.user!.email,
          role: readonlyResult.user!.role,
          permissions: readonlyResult.user!.permissions,
          sessionId: 'test-session',
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          ipAddress: '127.0.0.1',
        };

        const result = await authorizer.authorizeMessage(
          context,
          'cell.update',
          { cellId: 'A1', value: 42 }
        );

        expect(result.allowed).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should allow admin override', async () => {
        const adminResult = await authService.register(
          'admin2',
          'admin2@example.com',
          'password123',
          'admin'
        );

        const context: WSConnectionContext = {
          userId: adminResult.user!.id,
          username: adminResult.user!.username,
          email: adminResult.user!.email,
          role: adminResult.user!.role,
          permissions: adminResult.user!.permissions,
          sessionId: 'test-session',
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          ipAddress: '127.0.0.1',
        };

        const result = await authorizer.authorizeMessage(
          context,
          'system.admin',
          {}
        );

        expect(result.allowed).toBe(true);
      });
    });

    describe('Cell Access Control', () => {
      it('should enforce cell-level permissions', async () => {
        authorizer.setCellAccessControl('A1', {
          cellId: 'A1',
          ownerId: 'other-user',
          readUsers: [],
          writeUsers: [],
          publicRead: false,
          publicWrite: false,
        });

        const context: WSConnectionContext = {
          userId: testUser.id,
          username: testUser.username,
          email: testUser.email,
          role: testUser.role,
          permissions: testUser.permissions,
          sessionId: 'test-session',
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          ipAddress: '127.0.0.1',
        };

        const result = await authorizer.authorizeMessage(context, 'cell.read', {
          cellId: 'A1',
        });

        expect(result.allowed).toBe(false);
      });

      it('should allow owner access', async () => {
        authorizer.setCellAccessControl('B1', {
          cellId: 'B1',
          ownerId: testUser.id,
          readUsers: [],
          writeUsers: [],
          publicRead: false,
          publicWrite: false,
        });

        const context: WSConnectionContext = {
          userId: testUser.id,
          username: testUser.username,
          email: testUser.email,
          role: testUser.role,
          permissions: testUser.permissions,
          sessionId: 'test-session',
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          ipAddress: '127.0.0.1',
        };

        const result = await authorizer.authorizeMessage(context, 'cell.read', {
          cellId: 'B1',
        });

        expect(result.allowed).toBe(true);
      });
    });

    describe('Permission Helpers', () => {
      it('should check user has permission', () => {
        const context: WSConnectionContext = {
          userId: testUser.id,
          username: testUser.username,
          email: testUser.email,
          role: testUser.role,
          permissions: testUser.permissions,
          sessionId: 'test-session',
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          ipAddress: '127.0.0.1',
        };

        const hasPermission = authorizer.userHasPermission(
          context,
          Permission.CELLS_READ
        );

        expect(hasPermission).toBe(true);
      });

      it('should check user has any permission', () => {
        const context: WSConnectionContext = {
          userId: testUser.id,
          username: testUser.username,
          email: testUser.email,
          role: testUser.role,
          permissions: testUser.permissions,
          sessionId: 'test-session',
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          ipAddress: '127.0.0.1',
        };

        const hasAny = authorizer.userHasAnyPermission(context, [
          Permission.CELLS_READ,
          Permission.SYSTEM_ADMIN,
        ]);

        expect(hasAny).toBe(true);
      });

      it('should check user has all permissions', () => {
        const context: WSConnectionContext = {
          userId: testUser.id,
          username: testUser.username,
          email: testUser.email,
          role: testUser.role,
          permissions: testUser.permissions,
          sessionId: 'test-session',
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          ipAddress: '127.0.0.1',
        };

        const hasAll = authorizer.userHasAllPermissions(context, [
          Permission.CELLS_READ,
          Permission.CELLS_WRITE,
        ]);

        expect(hasAll).toBe(true);
      });
    });
  });

  describe('WSMetrics', () => {
    describe('Connection Metrics', () => {
      it('should record connection establishment', () => {
        metrics.recordConnectionEstablishment('user', 45);

        const stats = metrics.getConnectionStats();
        expect(stats.total).toBe(1);
        expect(stats.active).toBe(1);
        expect(stats.byRole.user).toBe(1);
      });

      it('should record connection attempts', () => {
        metrics.recordConnectionAttempt('success');
        metrics.recordConnectionAttempt('invalid_token');
        metrics.recordConnectionAttempt('rate_limited');

        const allStats = metrics.getAllStats();
        expect(allStats.connectionAttempts.attempt_success).toBeDefined();
        expect(allStats.connectionAttempts.attempt_invalid_token).toBeDefined();
        expect(allStats.connectionAttempts.attempt_rate_limited).toBeDefined();
      });

      it('should record disconnections', () => {
        metrics.recordConnectionEstablishment('user', 45);
        metrics.recordDisconnection('user', 1000);

        const stats = metrics.getConnectionStats();
        expect(stats.active).toBe(0);
      });
    });

    describe('Message Metrics', () => {
      it('should record messages', () => {
        metrics.recordMessage('cell.read', 'user', true);
        metrics.recordMessage('cell.update', 'user', false);

        const stats = metrics.getMessageStats();
        expect(stats.total).toBe(2);
        expect(stats.byType['cell.read']).toBe(1);
        expect(stats.byType['cell.update']).toBe(1);
        expect(stats.authorized).toBe(1);
        expect(stats.unauthorized).toBe(1);
      });
    });

    describe('Error Metrics', () => {
      it('should record errors', () => {
        metrics.recordConnectionAttempt('invalid_token');
        metrics.recordUnauthorizedAttempt('user', 'cell.update');
        metrics.recordValidationFailure();

        const stats = metrics.getErrorStats();
        expect(stats.authenticationFailed).toBeGreaterThan(0);
        expect(stats.authorizationFailed).toBeGreaterThan(0);
        expect(stats.validationFailed).toBeGreaterThan(0);
      });
    });

    describe('Throughput', () => {
      it('should calculate throughput', () => {
        metrics.recordMessage('cell.read', 'user', true);
        metrics.recordMessage('cell.update', 'user', true);

        const throughput = metrics.getThroughput();
        expect(throughput.messagesPerSecond).toBeGreaterThan(0);
        expect(throughput.messagesPerMinute).toBeGreaterThan(0);
      });
    });

    describe('Error Rate', () => {
      it('should calculate error rate', () => {
        metrics.recordConnectionAttempt('success');
        metrics.recordConnectionAttempt('invalid_token');

        const errorRate = metrics.getErrorRate();
        expect(errorRate.total).toBeGreaterThan(0);
      });
    });

    describe('Statistics', () => {
      it('should return all statistics', () => {
        metrics.recordConnectionEstablishment('user', 45);
        metrics.recordMessage('cell.read', 'user', true);

        const stats = metrics.getAllStats();
        expect(stats.connections).toBeDefined();
        expect(stats.messages).toBeDefined();
        expect(stats.errors).toBeDefined();
        expect(stats.uptime).toBeGreaterThan(0);
      });
    });

    describe('Reset', () => {
      it('should reset all metrics', () => {
        metrics.recordConnectionEstablishment('user', 45);
        metrics.recordMessage('cell.read', 'user', true);

        metrics.reset();

        const stats = metrics.getAllStats();
        expect(stats.connections.total).toBe(0);
        expect(stats.messages.total).toBe(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete authentication flow', async () => {
      // Authenticate connection
      const authResult = await authMiddleware.authenticateConnection(
        testToken,
        '127.0.0.1'
      );

      expect(authResult.success).toBe(true);
      expect(authResult.context).toBeDefined();

      // Authorize message
      const msgResult = await authMiddleware.authorizeMessage(
        authResult.context!,
        'cell.read',
        { cellId: 'A1' }
      );

      expect(msgResult.allowed).toBe(true);

      // Validate message
      const validationResult = await messageValidator.validateMessage(
        authResult.context!.userId,
        'cell.read',
        { cellId: 'A1' }
      );

      expect(validationResult.valid).toBe(true);

      // Check session is registered
      const session = sessionManager.getSession(authResult.context!.sessionId);
      expect(session).toBeDefined();

      // Check metrics
      const connStats = metrics.getConnectionStats();
      expect(connStats.active).toBe(1);
    });

    it('should handle unauthorized message flow', async () => {
      const readonlyResult = await authService.register(
        'readonly3',
        'readonly3@example.com',
        'password123',
        'readonly'
      );

      // Authenticate
      const authResult = await authMiddleware.authenticateConnection(
        readonlyResult.tokens!.accessToken,
        '127.0.0.1'
      );

      expect(authResult.success).toBe(true);

      // Try to authorize write operation
      const msgResult = await authMiddleware.authorizeMessage(
        authResult.context!,
        'cell.update',
        { cellId: 'A1', value: 42 }
      );

      expect(msgResult.allowed).toBe(false);

      // Check unauthorized attempts in metrics
      const errorStats = metrics.getErrorStats();
      expect(errorStats.authorizationFailed).toBeGreaterThan(0);
    });

    it('should handle rate limiting flow', async () => {
      // Exhaust rate limit
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 70; i++) {
        promises.push(
          authMiddleware.authenticateConnection(testToken, '10.0.0.2')
        );
      }

      await Promise.all(promises);

      // Check rate limit status
      const status = authMiddleware.getRateLimitStatus('10.0.0.2');
      expect(status.blocked).toBe(true);

      // Check rate limit in metrics
      const errorStats = metrics.getErrorStats();
      expect(errorStats.rateLimited).toBeGreaterThan(0);
    });

    it('should handle graceful disconnect', async () => {
      const authResult = await authMiddleware.authenticateConnection(
        testToken,
        '127.0.0.1'
      );

      expect(authResult.success).toBe(true);

      // Handle disconnect
      await authMiddleware.handleDisconnect(authResult.context!, 1000);

      // Check session is unregistered
      const session = sessionManager.getSession(authResult.context!.sessionId);
      expect(session).toBeUndefined();

      // Check metrics
      const connStats = metrics.getConnectionStats();
      expect(connStats.active).toBe(0);
    });
  });
});

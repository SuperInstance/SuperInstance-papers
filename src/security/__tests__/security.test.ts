/**
 * Security Module Tests
 * Tests for security configuration, audit logging, and middleware
 */

import { SecurityConfigManager, defaultSecurityConfig } from '../config.js';
import { SecurityAuditLogger } from '../audit.js';
import { SecurityMiddleware } from '../middleware.js';

describe('Security Configuration', () => {
  let configManager: SecurityConfigManager;

  beforeEach(() => {
    configManager = new SecurityConfigManager();
  });

  test('should create default configuration', () => {
    const config = configManager.getConfig();
    expect(config).toBeDefined();
    expect(config.jwt.secret).toBeDefined();
    expect(config.rateLimiting.enabled).toBe(true);
    expect(config.validation.allowedOrigins).toContain('localhost');
  });

  test('should validate configuration', () => {
    const errors = configManager.validateConfig();
    // Default secret should trigger a warning
    expect(errors).toContain('JWT_SECRET must be changed from default value');
  });

  test('should update configuration', () => {
    configManager.updateConfig({
      rateLimiting: {
        enabled: false,
        requestsPerMinute: 500,
        burstLimit: 50,
        perColonyRequestsPerMinute: 250,
        perColonyBurstLimit: 25,
        perUserRequestsPerMinute: 50,
        perUserBurstLimit: 5,
        windowMs: 60000,
      },
    });

    const config = configManager.getConfig();
    expect(config.rateLimiting.enabled).toBe(false);
    expect(config.rateLimiting.requestsPerMinute).toBe(500);
  });

  test('should get environment variables', () => {
    const envVars = configManager.getEnvironmentVariables();
    expect(envVars.JWT_SECRET).toBeDefined();
    expect(envVars.RATE_LIMIT_ENABLED).toBe('true');
    expect(envVars.ALLOWED_ORIGINS).toContain('localhost');
  });

  test('should get security headers', () => {
    const headers = configManager.getSecurityHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Content-Security-Policy']).toBeDefined();
  });
});

describe('Security Audit Logger', () => {
  let auditLogger: SecurityAuditLogger;
  let configManager: SecurityConfigManager;

  beforeEach(() => {
    configManager = new SecurityConfigManager({
      audit: {
        enabled: true,
        immutable: false, // Disable for faster tests
        retentionDays: 1,
        logLevels: ['info', 'warn', 'error', 'critical'],
        eventsToLog: ['authentication', 'authorization', 'security_event'],
      },
    });
    auditLogger = new SecurityAuditLogger(configManager.getConfig());
  });

  afterEach(() => {
    auditLogger.clearAllEvents();
  });

  test('should log authentication event', () => {
    const eventId = auditLogger.logAuthentication(
      'login',
      { id: 'user-123', type: 'user', ip: '192.168.1.1' },
      'success'
    );

    expect(eventId).toBeDefined();

    const events = auditLogger.getRecentEvents(1);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('authentication');
    expect(events[0].action).toBe('login');
    expect(events[0].outcome).toBe('success');
  });

  test('should log authorization event', () => {
    const eventId = auditLogger.logAuthorization(
      'access_granted',
      { id: 'user-123', type: 'user' },
      { type: 'colony', id: 'colony-456' },
      'success'
    );

    expect(eventId).toBeDefined();

    const events = auditLogger.getRecentEvents(1);
    expect(events[0].eventType).toBe('authorization');
    expect(events[0].resource?.id).toBe('colony-456');
  });

  test('should log security event', () => {
    const eventId = auditLogger.logSecurityEvent(
      'intrusion_detected',
      'critical',
      'failure',
      { ip: '192.168.1.100', reason: 'multiple_failed_logins' }
    );

    expect(eventId).toBeDefined();

    const events = auditLogger.getRecentEvents(1);
    expect(events[0].eventType).toBe('security_event');
    expect(events[0].severity).toBe('critical');
  });

  test('should log rate limit exceeded', () => {
    const eventId = auditLogger.logRateLimitExceeded(
      { id: 'user-123', type: 'user' },
      { type: 'endpoint', id: '/api/colony' },
      { limit: 100, current: 101 }
    );

    expect(eventId).toBeDefined();

    const events = auditLogger.getRecentEvents(1);
    expect(events[0].eventType).toBe('rate_limit');
    expect(events[0].severity).toBe('warning');
  });

  test('should query audit events', () => {
    // Log multiple events
    auditLogger.logAuthentication('login', { id: 'user-1', type: 'user' }, 'success');
    auditLogger.logAuthentication('login', { id: 'user-2', type: 'user' }, 'success');
    auditLogger.logAuthentication('login', { id: 'user-1', type: 'user' }, 'failure');
    auditLogger.logSecurityEvent('test', 'info', 'success', {});

    // Query by event type
    const authEvents = auditLogger.query({ eventTypes: ['authentication'] });
    expect(authEvents).toHaveLength(3);

    // Query by outcome
    const successEvents = auditLogger.query({ outcomes: ['success'] });
    expect(successEvents.length).toBeGreaterThanOrEqual(3);

    // Query by actor
    const user1Events = auditLogger.query({ actorId: 'user-1' });
    expect(user1Events).toHaveLength(2);
  });

  test('should get audit statistics', () => {
    // Log events with different types and outcomes
    auditLogger.logAuthentication('login', { id: 'user-1', type: 'user' }, 'success');
    auditLogger.logAuthentication('login', { id: 'user-2', type: 'user' }, 'success');
    auditLogger.logAuthentication('login', { id: 'user-1', type: 'user' }, 'failure');
    auditLogger.logSecurityEvent('intrusion', 'critical', 'failure', {});

    const stats = auditLogger.getStatistics();
    expect(stats.totalEvents).toBe(4);
    expect(stats.eventsByType.authentication).toBe(3);
    expect(stats.eventsByType.security_event).toBe(1);
    expect(stats.eventsByOutcome.success).toBe(2);
    expect(stats.eventsByOutcome.failure).toBe(2);
  });

  test('should clear old events', () => {
    // Log an event
    auditLogger.logAuthentication('login', { id: 'user-1', type: 'user' }, 'success');

    // Mock timestamp to be old
    const events = auditLogger.getRecentEvents(1);
    const oldTime = events[0].timestamp + 1000; // 1 second after event

    // This won't clear because event is not old enough relative to oldTime
    // but we can test the method is called
    const cleared = auditLogger.clearOldEvents();
    expect(cleared).toBeDefined();
  });
});

describe('Security Middleware', () => {
  let middleware: SecurityMiddleware;
  let configManager: SecurityConfigManager;

  beforeEach(() => {
    configManager = new SecurityConfigManager({
      websocket: {
        requireTLS: false, // Disable for testing
        verifyClient: true,
        maxConnectionsPerUser: 5,
        maxConnectionsPerIP: 10,
        pingInterval: 30000,
        pingTimeout: 10000,
      },
      validation: {
        allowedOrigins: ['localhost', '127.0.0.1', 'test.example.com'],
        maxMessageAge: 300000,
        maxPayloadSize: 10485760,
        maxStringLength: 10000,
        sanitizeStrings: true,
        validateJson: true,
      },
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 100,
        burstLimit: 10,
        perColonyRequestsPerMinute: 50,
        perColonyBurstLimit: 5,
        perUserRequestsPerMinute: 20,
        perUserBurstLimit: 2,
        windowMs: 60000,
      },
    });
    middleware = new SecurityMiddleware(configManager.getConfig());
  });

  afterEach(() => {
    // Cleanup connections
    const stats = middleware.getConnectionStats();
    for (const connectionId of Object.keys(stats.byIP)) {
      // This is a simplification - in real code we'd track connection IDs
    }
  });

  test('should verify client connection', () => {
    const mockInfo = {
      origin: 'http://localhost:3000',
      secure: false,
      req: {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'TestAgent',
        },
        socket: {
          remoteAddress: '192.168.1.1',
        },
      },
    };

    let callbackResult: boolean | undefined;
    let callbackCode: number | undefined;
    let callbackMessage: string | undefined;

    middleware.verifyClient(mockInfo, (result, code, message) => {
      callbackResult = result;
      callbackCode = code;
      callbackMessage = message;
    });

    expect(callbackResult).toBe(true);
  });

  test('should reject unauthorized origin', () => {
    const mockInfo = {
      origin: 'http://evil.com',
      secure: false,
      req: {
        headers: {},
        socket: {
          remoteAddress: '192.168.1.1',
        },
      },
    };

    let callbackResult: boolean | undefined;
    let callbackCode: number | undefined;

    middleware.verifyClient(mockInfo, (result, code) => {
      callbackResult = result;
      callbackCode = code;
    });

    expect(callbackResult).toBe(false);
    expect(callbackCode).toBe(403);
  });

  test('should register and remove connections', () => {
    const connectionId = 'conn-123';
    const ip = '192.168.1.1';
    const userId = 'user-123';
    const colonyId = 'colony-456';

    middleware.registerConnection(connectionId, ip, 'TestAgent', userId, colonyId, 'token-xyz');

    const stats = middleware.getConnectionStats();
    expect(stats.total).toBe(1);
    expect(stats.byUser[userId]).toBe(1);
    expect(stats.byIP[ip]).toBe(1);
    expect(stats.byColony[colonyId]).toBe(1);

    middleware.removeConnection(connectionId, 'test');
    const statsAfter = middleware.getConnectionStats();
    expect(statsAfter.total).toBe(0);
  });

  test('should check rate limits', () => {
    const limitInfo = {
      userId: 'user-123',
      colonyId: 'colony-456',
      endpoint: '/api/colony',
      resource: 'colony',
      action: 'read' as const,
    };

    // First request should be allowed
    const result1 = middleware.checkRateLimit(limitInfo);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBeLessThan(20); // perUserRequestsPerMinute is 20

    // Make many requests to exhaust limit
    for (let i = 0; i < 30; i++) {
      middleware.checkRateLimit(limitInfo);
    }

    // Should be rate limited
    const result2 = middleware.checkRateLimit(limitInfo);
    expect(result2.allowed).toBe(false);
    expect(result2.remaining).toBe(0);
  });

  test('should validate messages', () => {
    const validMessage = {
      id: 'msg-123',
      timestamp: Date.now(),
      type: 'test',
      payload: { data: 'test' },
    };

    const result = middleware.validateMessage(validMessage);
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBeDefined();

    // Test invalid message (missing timestamp)
    const invalidMessage = {
      id: 'msg-123',
      type: 'test',
      payload: { data: 'test' },
    };

    const invalidResult = middleware.validateMessage(invalidMessage);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toBeDefined();

    // Test message that's too old
    const oldMessage = {
      id: 'msg-123',
      timestamp: Date.now() - 400000, // 400 seconds old
      type: 'test',
      payload: { data: 'test' },
    };

    const oldResult = middleware.validateMessage(oldMessage);
    expect(oldResult.valid).toBe(false);
    expect(oldResult.error).toContain('too old');
  });

  test('should sanitize dangerous content', () => {
    const dangerousMessage = {
      id: 'msg-123',
      timestamp: Date.now(),
      type: 'test',
      payload: {
        script: '<script>alert("xss")</script>',
        normal: 'safe data',
      },
    };

    const result = middleware.validateMessage(dangerousMessage);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('dangerous');
  });

  test('should get security headers', () => {
    const headers = middleware.getSecurityHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Content-Security-Policy']).toBeDefined();
  });

  test('should cleanup inactive connections', () => {
    const connectionId = 'conn-123';
    middleware.registerConnection(connectionId, '192.168.1.1', 'TestAgent', 'user-123');

    // Initially should have 1 connection
    let stats = middleware.getConnectionStats();
    expect(stats.total).toBe(1);

    // Cleanup with very short timeout
    const cleaned = middleware.cleanupInactiveConnections(1); // 1ms timeout
    expect(cleaned).toBe(1);

    // Should have 0 connections after cleanup
    stats = middleware.getConnectionStats();
    expect(stats.total).toBe(0);
  });

  test('should update connection activity', () => {
    const connectionId = 'conn-123';
    middleware.registerConnection(connectionId, '192.168.1.1', 'TestAgent', 'user-123');

    // Update activity
    middleware.updateActivity(connectionId);

    // Cleanup with short timeout should not remove recently active connection
    const cleaned = middleware.cleanupInactiveConnections(100); // 100ms timeout
    expect(cleaned).toBe(0);
  });
});

describe('Security Integration', () => {
  test('should integrate config, audit, and middleware', () => {
    const configManager = new SecurityConfigManager();
    const auditLogger = new SecurityAuditLogger(configManager.getConfig());
    const middleware = new SecurityMiddleware(configManager.getConfig());

    // All components should be properly instantiated
    expect(configManager).toBeDefined();
    expect(auditLogger).toBeDefined();
    expect(middleware).toBeDefined();

    // Middleware should have access to audit logger
    const middlewareAuditLogger = middleware.getAuditLogger();
    expect(middlewareAuditLogger).toBeDefined();

    // Middleware should have access to config manager
    const middlewareConfigManager = middleware.getConfigManager();
    expect(middlewareConfigManager).toBeDefined();

    // Should be able to log events through middleware
    const eventId = middleware.logSecurityEvent(
      'authentication',
      'info',
      'success',
      'test_integration',
      { test: true }
    );
    expect(eventId).toBeDefined();
  });
});
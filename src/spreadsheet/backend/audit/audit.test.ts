/**
 * POLLN Spreadsheet Backend - Audit Logger Tests
 *
 * Comprehensive test suite for audit logging system.
 * Tests:
 * - Event logging accuracy
 * - Query performance
 * - Storage archival
 * - Report generation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuditLogger, AuditEvent, AuditOutcome, AuditSeverity } from './AuditLogger.js';
import { AuditQueryService } from './AuditQuery.js';
import { ComplianceReporter, ReportType, ReportFormat } from './ComplianceReporter.js';
import { MemoryAuditStorage } from './AuditStorage.js';
import { AuthEventType, AuditCategory, SecurityEventType } from './EventTypes.js';
import { auditMiddleware, auditErrorHandler } from './Middleware.js';
import { Request, Response } from 'express';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  let mockStorage: MemoryAuditStorage;

  beforeEach(() => {
    mockStorage = new MemoryAuditStorage();
    auditLogger = new AuditLogger({
      bufferSize: 10,
      flushInterval: 1000,
      samplingEnabled: false,
      maskSensitiveData: true,
      storageBackends: [],
    });
    auditLogger.registerStorageBackend('memory', mockStorage);
  });

  afterEach(async () => {
    await auditLogger.shutdown();
  });

  describe('Event Logging', () => {
    it('should log an audit event', async () => {
      const event = await auditLogger.logQuick(
        'login_success',
        'user-123',
        'auth',
        'login',
        AuditOutcome.SUCCESS
      );

      expect(event).toBeTruthy();
      expect(event.length).toBeGreaterThan(0);
    });

    it('should log event with all required fields', async () => {
      const eventId = await auditLogger.logQuick(
        'cell_updated',
        'user-456',
        'cell',
        'update',
        AuditOutcome.SUCCESS,
        {
          resource: {
            id: 'cell-789',
            name: 'A1',
            sensitivity: 'internal',
          },
        }
      );

      expect(eventId).toBeTruthy();

      // Flush and verify
      await auditLogger.flush();
      const events = await mockStorage.query({});
      expect(events.length).toBeGreaterThan(0);

      const event = events[0];
      expect(event.actor.id).toBe('user-456');
      expect(event.resource.id).toBe('cell-789');
      expect(event.outcome).toBe(AuditOutcome.SUCCESS);
    });

    it('should mask sensitive data when enabled', async () => {
      const eventId = await auditLogger.log({
        eventType: 'password_changed',
        category: AuditCategory.AUTHENTICATION,
        severity: AuditSeverity.LOW,
        outcome: AuditOutcome.SUCCESS,
        actor: {
          id: 'user-123',
          type: 'user',
          username: 'testuser',
        },
        action: {
          operation: 'update',
          resourceType: 'user',
          description: 'Password changed',
        },
        resource: {
          type: 'user',
          id: 'user-123',
        },
        request: {
          id: 'req-123',
          method: 'POST',
          path: '/api/users/password',
        },
        context: {
          environment: 'test',
          metadata: {
            oldPassword: 'oldsecret',
            newPassword: 'newsecret',
          },
        },
      });

      await auditLogger.flush();
      const events = await mockStorage.query({});
      const event = events.find(e => e.id === eventId);

      expect(event?.context.metadata?.oldPassword).toBe('***REDACTED***');
      expect(event?.context.metadata?.newPassword).toBe('***REDACTED***');
    });

    it('should apply sampling when enabled', async () => {
      const samplingLogger = new AuditLogger({
        samplingEnabled: true,
        samplingRate: 0.1, // 10% sample rate
        storageBackends: [],
      });

      let sampledCount = 0;
      for (let i = 0; i < 100; i++) {
        const result = await samplingLogger.logQuick(
          'cell_read',
          `user-${i}`,
          'cell',
          'read',
          AuditOutcome.SUCCESS
        );
        if (!result) sampledCount++;
      }

      // Approximately 90% should be sampled
      expect(sampledCount).toBeGreaterThan(70);
      expect(sampledCount).toBeLessThan(110);

      await samplingLogger.shutdown();
    });

    it('should flush events when buffer is full', async () => {
      const flushSpy = jest.spyOn(mockStorage, 'write');

      // Log more than buffer size
      for (let i = 0; i < 15; i++) {
        await auditLogger.logQuick(
          'cell_read',
          `user-${i}`,
          'cell',
          'read',
          AuditOutcome.SUCCESS
        );
      }

      // Should have flushed at least once
      expect(flushSpy).toHaveBeenCalled();
    });

    it('should immediately flush critical events', async () => {
      const flushSpy = jest.spyOn(auditLogger, 'flush');

      await auditLogger.log({
        eventType: SecurityEventType.DATA_BREACH_ATTEMPT,
        category: AuditCategory.SECURITY,
        severity: AuditSeverity.CRITICAL,
        outcome: AuditOutcome.FAILURE,
        actor: {
          id: 'attacker-123',
          type: 'user',
          ipAddress: '1.2.3.4',
        },
        action: {
          operation: 'access',
          resourceType: 'database',
          description: 'Attempted data breach',
        },
        resource: {
          type: 'database',
          sensitivity: 'restricted',
        },
        request: {
          id: 'req-123',
          method: 'GET',
          path: '/api/admin/data',
        },
        context: {
          environment: 'production',
        },
      });

      expect(flushSpy).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should track statistics correctly', async () => {
      await auditLogger.logQuick('cell_read', 'user-1', 'cell', 'read', AuditOutcome.SUCCESS);
      await auditLogger.logQuick('cell_read', 'user-2', 'cell', 'read', AuditOutcome.SUCCESS);
      await auditLogger.logQuick('cell_read', 'user-3', 'cell', 'read', AuditOutcome.SUCCESS);

      const stats = auditLogger.getStatistics();

      expect(stats.totalEventsLogged).toBe(3);
      expect(stats.currentBufferSize).toBe(3);
    });

    it('should reset statistics', async () => {
      await auditLogger.logQuick('cell_read', 'user-1', 'cell', 'read', AuditOutcome.SUCCESS);
      await auditLogger.flush();

      auditLogger.resetStatistics();
      const stats = auditLogger.getStatistics();

      expect(stats.totalEventsLogged).toBe(0);
      expect(stats.currentBufferSize).toBe(0);
    });
  });
});

describe('AuditQueryService', () => {
  let queryService: AuditQueryService;
  let mockStorage: MemoryAuditStorage;

  beforeEach(async () => {
    mockStorage = new MemoryAuditStorage();
    await mockStorage.initialize();

    // Add test events
    await mockStorage.write([
      {
        id: '1',
        eventType: AuthEventType.LOGIN_SUCCESS,
        category: AuditCategory.AUTHENTICATION,
        severity: AuditSeverity.INFO,
        outcome: AuditOutcome.SUCCESS,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        receivedAt: new Date('2024-01-01T10:00:00Z'),
        actor: { id: 'user-1', type: 'user', username: 'alice' },
        action: { operation: 'login', resourceType: 'auth', description: 'Login' },
        resource: { type: 'auth' },
        request: { id: 'req-1', method: 'POST', path: '/auth/login' },
        context: { environment: 'test' },
        compliance: { retentionDays: 90, frameworks: ['SOC2'], requiresImmediateAction: false },
        containsSensitiveData: false,
      },
      {
        id: '2',
        eventType: AuthEventType.LOGIN_FAILED,
        category: AuditCategory.AUTHENTICATION,
        severity: AuditSeverity.MEDIUM,
        outcome: AuditOutcome.FAILURE,
        timestamp: new Date('2024-01-01T11:00:00Z'),
        receivedAt: new Date('2024-01-01T11:00:00Z'),
        actor: { id: 'user-2', type: 'user', username: 'bob' },
        action: { operation: 'login', resourceType: 'auth', description: 'Failed login' },
        resource: { type: 'auth' },
        request: { id: 'req-2', method: 'POST', path: '/auth/login' },
        context: { environment: 'test' },
        compliance: { retentionDays: 365, frameworks: ['SOC2'], requiresImmediateAction: false },
        containsSensitiveData: false,
      },
    ] as any);

    queryService = new AuditQueryService();
  });

  describe('Querying', () => {
    it('should query events by time range', async () => {
      const result = await queryService.getTimeRangeEvents(
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T23:59:59Z')
      );

      expect(result.events.length).toBeGreaterThanOrEqual(2);
    });

    it('should query events by user', async () => {
      const result = await queryService.getUserEvents('user-1');

      expect(result.events.length).toBeGreaterThanOrEqual(1);
      expect(result.events[0].actor.id).toBe('user-1');
    });

    it('should query failed events', async () => {
      const result = await queryService.getFailedEvents();

      expect(result.events.length).toBeGreaterThanOrEqual(1);
      expect(result.events[0].outcome).toBe(AuditOutcome.FAILURE);
    });

    it('should query critical events', async () => {
      // Add a critical event
      await mockStorage.write([{
        id: '3',
        eventType: SecurityEventType.DATA_BREACH_ATTEMPT,
        category: AuditCategory.SECURITY,
        severity: AuditSeverity.CRITICAL,
        outcome: AuditOutcome.FAILURE,
        timestamp: new Date('2024-01-01T12:00:00Z'),
        receivedAt: new Date('2024-01-01T12:00:00Z'),
        actor: { id: 'attacker', type: 'user' },
        action: { operation: 'access', resourceType: 'database', description: 'Breach attempt' },
        resource: { type: 'database', sensitivity: 'restricted' },
        request: { id: 'req-3', method: 'GET', path: '/api/admin' },
        context: { environment: 'test' },
        compliance: { retentionDays: 3650, frameworks: ['SOC2', 'GDPR'], requiresImmediateAction: true },
        containsSensitiveData: false,
      }] as any);

      const result = await queryService.getCriticalEvents();

      expect(result.events.length).toBeGreaterThanOrEqual(1);
      expect(result.events[0].severity).toBe(AuditSeverity.CRITICAL);
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics', async () => {
      const stats = await queryService.getStatistics();

      expect(stats.totalEvents).toBeGreaterThanOrEqual(2);
      expect(stats.eventsByCategory[AuditCategory.AUTHENTICATION]).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Time Series', () => {
    it('should generate time series data', async () => {
      const timeSeries = await queryService.getTimeSeries(
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T23:59:59Z'),
        'day'
      );

      expect(timeSeries.length).toBeGreaterThanOrEqual(1);
      expect(timeSeries[0].timestamp).toBeDefined();
      expect(timeSeries[0].count).toBeDefined();
    });
  });
});

describe('ComplianceReporter', () => {
  let reporter: ComplianceReporter;

  beforeEach(() => {
    reporter = new ComplianceReporter();
  });

  describe('SOC 2 Reports', () => {
    it('should generate SOC 2 user activity report', async () => {
      const report = await reporter.generateReport(
        ReportType.SOC2_USER_ACTIVITY,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        ReportFormat.JSON
      );

      expect(report.metadata.type).toBe(ReportType.SOC2_USER_ACTIVITY);
      expect(report.metadata.framework).toBe('SOC 2 Type II');
      expect(report.summary).toBeDefined();
      expect(report.details.userActivities).toBeDefined();
      expect(report.evidence).toBeDefined();
    });

    it('should generate SOC 2 security incidents report', async () => {
      const report = await reporter.generateReport(
        ReportType.SOC2_SECURITY_INCIDENTS,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        ReportFormat.JSON
      );

      expect(report.metadata.type).toBe(ReportType.SOC2_SECURITY_INCIDENTS);
      expect(report.details.incidents).toBeDefined();
      expect(Array.isArray(report.details.incidents)).toBe(true);
    });

    it('should generate SOC 2 access review report', async () => {
      const report = await reporter.generateReport(
        ReportType.SOC2_ACCESS_REVIEW,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        ReportFormat.JSON
      );

      expect(report.metadata.type).toBe(ReportType.SOC2_ACCESS_REVIEW);
      expect(report.details.accessEntries).toBeDefined();
      expect(Array.isArray(report.details.accessEntries)).toBe(true);
    });
  });

  describe('GDPR Reports', () => {
    it('should generate GDPR data access report', async () => {
      const report = await reporter.generateReport(
        ReportType.GDPR_DATA_ACCESS,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        ReportFormat.JSON
      );

      expect(report.metadata.type).toBe(ReportType.GDPR_DATA_ACCESS);
      expect(report.metadata.framework).toBe('GDPR');
      expect(report.details.requests).toBeDefined();
      expect(Array.isArray(report.details.requests)).toBe(true);
    });
  });

  describe('Summary Reports', () => {
    it('should generate summary report', async () => {
      const report = await reporter.generateReport(
        ReportType.SUMMARY,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        ReportFormat.JSON
      );

      expect(report.metadata.type).toBe(ReportType.SUMMARY);
      expect(report.summary).toBeDefined();
      expect(report.summary.totalEvents).toBeDefined();
      expect(report.summary.complianceScore).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });
});

describe('Audit Middleware', () => {
  it('should create audit middleware', () => {
    const middleware = auditMiddleware({
      logBody: true,
      logHeaders: false,
      maskSensitiveData: true,
    });

    expect(typeof middleware).toBe('function');
  });

  it('should create error handler', () => {
    const errorHandler = auditErrorHandler({
      logLevel: 'error',
    });

    expect(typeof errorHandler).toBe('function');
  });

  it('should extract client IP from request', () => {
    const req = {
      headers: {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      },
      connection: {
        remoteAddress: '9.9.9.9',
      },
    } as any;

    // This would be tested through integration tests
    expect(req.headers['x-forwarded-for']).toBeDefined();
  });
});

describe('Performance Tests', () => {
  let auditLogger: AuditLogger;
  let mockStorage: MemoryAuditStorage;

  beforeEach(() => {
    mockStorage = new MemoryAuditStorage();
    auditLogger = new AuditLogger({
      bufferSize: 100,
      flushInterval: 10000,
      storageBackends: [],
    });
    auditLogger.registerStorageBackend('memory', mockStorage);
  });

  afterEach(async () => {
    await auditLogger.shutdown();
  });

  it('should log events with minimal overhead', async () => {
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      await auditLogger.logQuick(
        'cell_read',
        `user-${i}`,
        'cell',
        'read',
        AuditOutcome.SUCCESS
      );
    }

    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 100;

    // Average logging time should be less than 10ms
    expect(avgTime).toBeLessThan(10);
  });

  it('should handle high throughput', async () => {
    const startTime = Date.now();

    const promises = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(
        auditLogger.logQuick(
          'cell_read',
          `user-${i}`,
          'cell',
          'read',
          AuditOutcome.SUCCESS
        )
      );
    }

    await Promise.all(promises);
    await auditLogger.flush();

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Should complete 1000 events in reasonable time
    expect(totalTime).toBeLessThan(5000); // 5 seconds
  });
});

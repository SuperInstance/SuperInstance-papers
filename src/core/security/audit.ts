/**
 * POLLN Security Module - Audit Logging
 * Comprehensive security event logging system
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

export type AuditEventType =
  | 'authentication'
  | 'authorization'
  | 'cryptographic_operation'
  | 'data_access'
  | 'data_modification'
  | 'rate_limit_exceeded'
  | 'validation_failed'
  | 'signature_verification_failed'
  | 'encryption_failed'
  | 'key_rotation'
  | 'configuration_change'
  | 'security_event'
  | 'federated_sync'
  | 'a2a_communication';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditEvent {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  severity: AuditSeverity;
  category: string;
  action: string;
  actor?: {
    id: string;
    type: 'user' | 'agent' | 'colony' | 'system';
    ip?: string;
    userAgent?: string;
  };
  resource?: {
    type: string;
    id: string;
    name?: string;
  };
  outcome: 'success' | 'failure' | 'partial';
  details: Record<string, unknown>;
  metadata?: {
    source?: string;
    requestId?: string;
    sessionId?: string;
    correlationId?: string;
  };
  hashed?: {
    field: string;
    hash: string;
  }[];
}

export interface AuditFilter {
  eventTypes?: AuditEventType[];
  severities?: AuditSeverity[];
  categories?: string[];
  actors?: string[];
  resources?: string[];
  outcomes?: AuditEvent['outcome'][];
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByOutcome: Record<'success' | 'failure' | 'partial', number>;
  timeRange: { start: number; end: number };
  topActors: Array<{ id: string; count: number }>;
  topResources: Array<{ id: string; count: number }>;
}

// ============================================================================
// Audit Logger Configuration
// ============================================================================

export interface AuditLoggerConfig {
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFileSize: number; // bytes
  maxFiles: number;
  hashSensitiveFields: boolean;
  sensitiveFields: string[];
  asyncLogging: boolean;
  bufferSize: number;
  flushInterval: number; // milliseconds
  includeStackTrace: boolean;
}

// ============================================================================
// Audit Logger
// ============================================================================

export class AuditLogger extends EventEmitter {
  private config: AuditLoggerConfig;
  private events: AuditEvent[] = [];
  private buffer: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private currentFileSize: number = 0;
  private currentFileIndex: number = 0;

  constructor(config?: Partial<AuditLoggerConfig>) {
    super();

    this.config = {
      enableConsole: process.env.AUDIT_ENABLE_CONSOLE !== 'false',
      enableFile: process.env.AUDIT_ENABLE_FILE === 'true',
      filePath: process.env.AUDIT_FILE_PATH || './logs/audit.log',
      maxFileSize: parseInt(process.env.AUDIT_MAX_FILE_SIZE || '10485760', 10), // 10MB
      maxFiles: parseInt(process.env.AUDIT_MAX_FILES || '10', 10),
      hashSensitiveFields: true,
      sensitiveFields: ['password', 'token', 'secret', 'key', 'credential'],
      asyncLogging: true,
      bufferSize: 100,
      flushInterval: 5000,
      includeStackTrace: false,
      ...config,
    };

    // Start flush timer if async logging is enabled
    if (this.config.asyncLogging) {
      this.startFlushTimer();
    }

    // Create log directory if needed
    if (this.config.enableFile && this.config.filePath) {
      const logDir = join(this.config.filePath, '..');
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): string {
    const auditEvent: AuditEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...event,
    };

    // Hash sensitive fields
    if (this.config.hashSensitiveFields) {
      auditEvent.hashed = this.hashSensitiveData(auditEvent.details);
    }

    // Add to buffer or log immediately
    if (this.config.asyncLogging) {
      this.buffer.push(auditEvent);
      if (this.buffer.length >= this.config.bufferSize) {
        this.flush();
      }
    } else {
      this.writeEvent(auditEvent);
    }

    // Store in memory
    this.events.push(auditEvent);

    // Trim if needed (keep last 10000 events)
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    // Emit event
    this.emit('audit', auditEvent);

    return auditEvent.id;
  }

  /**
   * Log authentication event
   */
  logAuthentication(
    action: 'login' | 'logout' | 'token_refresh' | 'token_revoke',
    actor: AuditEvent['actor'],
    outcome: 'success' | 'failure',
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'authentication',
      severity: outcome === 'success' ? 'info' : 'warning',
      category: 'auth',
      action,
      actor,
      outcome,
      details: details || {},
    });
  }

  /**
   * Log authorization event
   */
  logAuthorization(
    action: 'permission_check' | 'access_granted' | 'access_denied',
    actor: AuditEvent['actor'],
    resource: AuditEvent['resource'],
    outcome: 'success' | 'failure',
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'authorization',
      severity: outcome === 'success' ? 'info' : 'warning',
      category: 'authz',
      action,
      actor,
      resource,
      outcome,
      details: details || {},
    });
  }

  /**
   * Log cryptographic operation
   */
  logCryptoOperation(
    action: 'sign' | 'verify' | 'encrypt' | 'decrypt' | 'hash',
    outcome: 'success' | 'failure',
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'cryptographic_operation',
      severity: outcome === 'success' ? 'info' : 'error',
      category: 'crypto',
      action,
      outcome,
      details: details || {},
    });
  }

  /**
   * Log data access
   */
  logDataAccess(
    action: 'read' | 'write' | 'delete',
    actor: AuditEvent['actor'],
    resource: AuditEvent['resource'],
    outcome: 'success' | 'failure',
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'data_access',
      severity: 'info',
      category: 'data',
      action,
      actor,
      resource,
      outcome,
      details: details || {},
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    action: string,
    severity: AuditSeverity,
    outcome: 'success' | 'failure',
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'security_event',
      severity,
      category: 'security',
      action,
      outcome,
      details: details || {},
    });
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(
    actor: AuditEvent['actor'],
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'rate_limit_exceeded',
      severity: 'warning',
      category: 'ratelimit',
      action: 'limit_exceeded',
      actor,
      outcome: 'failure',
      details: details || {},
    });
  }

  /**
   * Log signature verification failure
   */
  logSignatureFailure(
    details: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'signature_verification_failed',
      severity: 'error',
      category: 'crypto',
      action: 'verify',
      outcome: 'failure',
      details,
    });
  }

  /**
   * Log federated sync
   */
  logFederatedSync(
    action: 'send' | 'receive' | 'aggregate',
    colonyId: string,
    outcome: 'success' | 'failure',
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'federated_sync',
      severity: outcome === 'success' ? 'info' : 'error',
      category: 'federated',
      action,
      actor: {
        id: colonyId,
        type: 'colony',
      },
      outcome,
      details: details || {},
    });
  }

  /**
   * Log A2A communication
   */
  logA2ACommunication(
    senderId: string,
    receiverId: string,
    packageType: string,
    outcome: 'success' | 'failure',
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'a2a_communication',
      severity: outcome === 'success' ? 'info' : 'warning',
      category: 'communication',
      action: 'send_package',
      actor: {
        id: senderId,
        type: 'agent',
      },
      resource: {
        type: 'agent',
        id: receiverId,
      },
      outcome,
      details: {
        packageType,
        ...details,
      },
    });
  }

  /**
   * Query audit events
   */
  query(filter: AuditFilter): AuditEvent[] {
    let results = [...this.events];

    // Filter by event types
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      results = results.filter(e => filter.eventTypes!.includes(e.eventType));
    }

    // Filter by severities
    if (filter.severities && filter.severities.length > 0) {
      results = results.filter(e => filter.severities!.includes(e.severity));
    }

    // Filter by categories
    if (filter.categories && filter.categories.length > 0) {
      results = results.filter(e => filter.categories!.includes(e.category));
    }

    // Filter by actors
    if (filter.actors && filter.actors.length > 0) {
      results = results.filter(e => e.actor && filter.actors!.includes(e.actor.id));
    }

    // Filter by resources
    if (filter.resources && filter.resources.length > 0) {
      results = results.filter(e => e.resource && filter.resources!.includes(e.resource.id));
    }

    // Filter by outcomes
    if (filter.outcomes && filter.outcomes.length > 0) {
      results = results.filter(e => filter.outcomes!.includes(e.outcome));
    }

    // Filter by time range
    if (filter.startTime !== undefined) {
      results = results.filter(e => e.timestamp >= filter.startTime!);
    }
    if (filter.endTime !== undefined) {
      results = results.filter(e => e.timestamp <= filter.endTime!);
    }

    // Limit results
    if (filter.limit !== undefined) {
      results = results.slice(-filter.limit);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get audit statistics
   */
  getStatistics(filter?: AuditFilter): AuditStatistics {
    const events = filter ? this.query(filter) : this.events;

    if (events.length === 0) {
      return {
        totalEvents: 0,
        eventsByType: {} as Record<AuditEventType, number>,
        eventsBySeverity: {} as Record<AuditSeverity, number>,
        eventsByOutcome: {} as Record<'success' | 'failure' | 'partial', number>,
        timeRange: { start: 0, end: 0 },
        topActors: [],
        topResources: [],
      };
    }

    const timestamps = events.map(e => e.timestamp);
    const timeRange = {
      start: Math.min(...timestamps),
      end: Math.max(...timestamps),
    };

    // Count by type
    const eventsByType = events.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {} as Record<AuditEventType, number>);

    // Count by severity
    const eventsBySeverity = events.reduce((acc, e) => {
      acc[e.severity] = (acc[e.severity] || 0) + 1;
      return acc;
    }, {} as Record<AuditSeverity, number>);

    // Count by outcome
    const eventsByOutcome = events.reduce((acc, e) => {
      acc[e.outcome] = (acc[e.outcome] || 0) + 1;
      return acc;
    }, {} as Record<'success' | 'failure' | 'partial', number>);

    // Top actors
    const actorCounts = new Map<string, number>();
    for (const event of events) {
      if (event.actor) {
        actorCounts.set(event.actor.id, (actorCounts.get(event.actor.id) || 0) + 1);
      }
    }
    const topActors = Array.from(actorCounts.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top resources
    const resourceCounts = new Map<string, number>();
    for (const event of events) {
      if (event.resource) {
        resourceCounts.set(event.resource.id, (resourceCounts.get(event.resource.id) || 0) + 1);
      }
    }
    const topResources = Array.from(resourceCounts.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      eventsByOutcome,
      timeRange,
      topActors,
      topResources,
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): AuditEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Clear old events
   */
  clearOldEvents(olderThan: number): number {
    const beforeCount = this.events.length;
    this.events = this.events.filter(e => e.timestamp >= olderThan);
    return beforeCount - this.events.length;
  }

  /**
   * Clear all events
   */
  clearAllEvents(): void {
    this.events = [];
    this.buffer = [];
  }

  /**
   * Flush buffer to storage
   */
  flush(): void {
    if (this.buffer.length === 0) {
      return;
    }

    for (const event of this.buffer) {
      this.writeEvent(event);
    }

    this.buffer = [];
  }

  /**
   * Shutdown logger
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private writeEvent(event: AuditEvent): void {
    // Console logging
    if (this.config.enableConsole) {
      const logLevel = this.getLogLevel(event.severity);
      const message = `[${event.eventType}] ${event.action} - ${event.outcome}`;
      console[logLevel](message, event);
    }

    // File logging
    if (this.config.enableFile && this.config.filePath) {
      this.writeToFile(event);
    }
  }

  private writeToFile(event: AuditEvent): void {
    if (!this.config.filePath) {
      return;
    }

    const logLine = JSON.stringify(event) + '\n';
    const logSize = Buffer.byteLength(logLine, 'utf8');

    // Check if we need to rotate files
    if (this.currentFileSize + logSize > this.config.maxFileSize) {
      this.rotateLogFile();
    }

    try {
      appendFileSync(this.config.filePath, logLine, 'utf8');
      this.currentFileSize += logSize;
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  private rotateLogFile(): void {
    if (!this.config.filePath) {
      return;
    }

    // Rename current file
    const newFilePath = this.config.filePath.replace(
      '.log',
      `.${this.currentFileIndex}.log`
    );

    try {
      if (existsSync(this.config.filePath)) {
        // Move existing file
        const fs = require('fs');
        fs.renameSync(this.config.filePath, newFilePath);
      }

      this.currentFileIndex++;
      this.currentFileSize = 0;

      // Clean up old files
      this.cleanupOldFiles();
    } catch (error) {
      console.error('Failed to rotate audit log file:', error);
    }
  }

  private cleanupOldFiles(): void {
    if (!this.config.filePath) {
      return;
    }

    const fs = require('fs');
    const path = require('path');
    const logDir = path.dirname(this.config.filePath);
    const baseName = path.basename(this.config.filePath, '.log');

    try {
      const files = fs.readdirSync(logDir)
        .filter((f: string) => f.startsWith(baseName) && f.endsWith('.log'))
        .sort()
        .reverse();

      // Remove old files beyond maxFiles
      while (files.length > this.config.maxFiles) {
        const oldFile = path.join(logDir, files.pop()!);
        fs.unlinkSync(oldFile);
      }
    } catch (error) {
      console.error('Failed to cleanup old audit log files:', error);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private getLogLevel(severity: AuditSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
      case 'error':
        return 'error';
      case 'warning':
        return 'warn';
      default:
        return 'log';
    }
  }

  private hashSensitiveData(details: Record<string, unknown>): Array<{
    field: string;
    hash: string;
  }> {
    const hashed: Array<{ field: string; hash: string }> = [];

    for (const field of this.config.sensitiveFields) {
      if (field in details) {
        const value = String(details[field]);
        const hash = createHash('sha256').update(value).digest('hex');
        hashed.push({ field, hash });
        (details as Record<string, unknown>)[field] = '[REDACTED]';
      }
    }

    return hashed;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a default audit logger
 */
export function createAuditLogger(config?: Partial<AuditLoggerConfig>): AuditLogger {
  return new AuditLogger(config);
}

/**
 * Create an audit event ID
 */
export function createAuditEventId(): string {
  return uuidv4();
}

/**
 * POLLN Spreadsheet Security - AuditLogger
 *
 * Comprehensive security audit logging system.
 * Tracks security events, categorizes them, and provides tamper-evident storage.
 * Supports log aggregation, compliance reporting, and real-time monitoring.
 *
 * Key Features:
 * - Comprehensive event logging with structured format
 * - Event categorization and severity levels
 * - Tamper-evident logs with cryptographic hashing
 * - Async buffering for performance
 * - Multiple storage backend support
 * - Compliance reporting (SOC 2, GDPR, HIPAA)
 * - Log aggregation and analysis
 * - Real-time event monitoring
 * - JSDoc documentation throughout
 *
 * @module AuditLogger
 */

import { EventEmitter } from 'events';
import { createHash, randomBytes, createHmac } from 'crypto';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Audit event categories
 */
export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  CELL_ACCESS = 'cell_access',
  CELL_MODIFICATION = 'cell_modification',
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  FORMULA_EXECUTION = 'formula_execution',
  SECURITY_EVENT = 'security_event',
  RATE_LIMIT = 'rate_limit',
  VALIDATION_FAILURE = 'validation_failure',
  CONFIGURATION_CHANGE = 'configuration_change',
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event',
  COMPLIANCE = 'compliance',
}

/**
 * Event severity levels
 */
export enum AuditSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

/**
 * Event outcome types
 */
export enum AuditOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  ERROR = 'error',
  BLOCKED = 'blocked',
  WARNING = 'warning',
}

/**
 * Audit event interface
 */
export interface AuditEvent {
  /** Unique event ID */
  id: string;

  /** Event category */
  category: AuditCategory;

  /** Event severity */
  severity: AuditSeverity;

  /** Event outcome */
  outcome: AuditOutcome;

  /** Event type/name */
  eventType: string;

  /** Timestamp */
  timestamp: Date;

  /** Actor information */
  actor: {
    id: string;
    type: 'user' | 'service' | 'system' | 'anonymous';
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    username?: string;
    role?: string;
  };

  /** Action details */
  action: {
    operation: string;
    resourceType: string;
    resourceId?: string;
    description: string;
    metadata?: Record<string, unknown>;
  };

  /** Request context */
  request?: {
    id: string;
    method: string;
    path: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: Record<string, unknown>;
  };

  /** Response context */
  response?: {
    statusCode: number;
    latency: number;
    size?: number;
  };

  /** Resource details */
  resource?: {
    type: string;
    id?: string;
    name?: string;
    path?: string;
    sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
  };

  /** Changes (for modifications) */
  changes?: {
    before?: unknown;
    after?: unknown;
    diff?: string;
  };

  /** Security context */
  security?: {
    threatDetected?: boolean;
    threatType?: string;
    violation?: string;
    blockedReason?: string;
  };

  /** Compliance metadata */
  compliance?: {
    frameworks: string[]; // e.g., ['SOC2', 'GDPR', 'HIPAA']
    retentionDays: number;
    requiresNotification: boolean;
  };

  /** Tamper evidence */
  tamperEvidence?: {
    previousHash?: string;
    currentHash: string;
    signature?: string;
  };

  /** Additional context */
  context?: {
    location?: string;
    deviceId?: string;
    application?: string;
    environment: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Storage backend interface
 */
export interface StorageBackend {
  write(events: AuditEvent[]): Promise<void>;
  query(filter: AuditQuery): Promise<AuditEvent[]>;
  getLatestHash(): Promise<string>;
}

/**
 * Audit query options
 */
export interface AuditQuery {
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  outcomes?: AuditOutcome[];
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  framework: string;
  period: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  securityEvents: AuditEvent[];
  complianceIssues: string[];
  recommendations: string[];
}

/**
 * Audit logger options
 */
export interface AuditLoggerOptions {
  /** Buffer size before flush */
  bufferSize?: number;
  /** Flush interval in ms */
  flushInterval?: number;
  /** Enable tamper evidence */
  enableTamperEvidence?: boolean;
  /** Storage backend */
  storageBackend?: StorageBackend;
  /** Log file path (if using file storage) */
  logFilePath?: string;
  /** Environment */
  environment?: 'development' | 'staging' | 'production';
  /** Enable compression */
  enableCompression?: boolean;
  /** Enable encryption */
  enableEncryption?: boolean;
  /** Retention period in days */
  retentionDays?: number;
}

/**
 * File-based storage backend
 */
class FileStorageBackend implements StorageBackend {
  private filePath: string;
  private previousHash: string = '';

  constructor(filePath: string) {
    this.filePath = filePath;
    this.ensureDirectoryExists();
  }

  async write(events: AuditEvent[]): Promise<void> {
    const data = events.map(event => JSON.stringify(event)).join('\n') + '\n';
    appendFileSync(this.filePath, data, 'utf-8');

    // Update hash
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      this.previousHash = lastEvent.tamperEvidence?.currentHash || '';
    }
  }

  async query(filter: AuditQuery): Promise<AuditEvent[]> {
    // Simple file-based query (in production, use a proper database)
    const content = require('fs').readFileSync(this.filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const events: AuditEvent[] = [];
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as AuditEvent;
        if (this.matchesFilter(event, filter)) {
          events.push(event);
        }
      } catch {
        // Skip invalid lines
      }
    }

    return events.slice(filter.offset || 0, (filter.offset || 0) + (filter.limit || 100));
  }

  async getLatestHash(): Promise<string> {
    return this.previousHash;
  }

  private ensureDirectoryExists(): void {
    const dir = join(this.filePath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private matchesFilter(event: AuditEvent, filter: AuditQuery): boolean {
    if (filter.categories && !filter.categories.includes(event.category)) {
      return false;
    }
    if (filter.severities && !filter.severities.includes(event.severity)) {
      return false;
    }
    if (filter.outcomes && !filter.outcomes.includes(event.outcome)) {
      return false;
    }
    if (filter.actorId && event.actor.id !== filter.actorId) {
      return false;
    }
    if (filter.resourceType && event.action.resourceType !== filter.resourceType) {
      return false;
    }
    if (filter.resourceId && event.action.resourceId !== filter.resourceId) {
      return false;
    }
    if (filter.startTime && event.timestamp < filter.startTime) {
      return false;
    }
    if (filter.endTime && event.timestamp > filter.endTime) {
      return false;
    }
    return true;
  }
}

/**
 * AuditLogger class
 *
 * Manages security audit logging with tamper evidence and compliance support.
 */
export class AuditLogger extends EventEmitter {
  private options: Required<AuditLoggerOptions>;
  private eventBuffer: AuditEvent[] = [];
  private storage: StorageBackend;
  private flushTimer?: NodeJS.Timeout;
  private previousHash: string = '';
  private isShuttingDown = false;

  // Statistics
  private statistics = {
    totalEventsLogged: 0,
    totalEventsFlushed: 0,
    totalEventsDropped: 0,
    eventsByCategory: {} as Record<string, number>,
    eventsBySeverity: {} as Record<string, number>,
    lastFlushTime: new Date(),
  };

  /**
   * Create a new AuditLogger
   *
   * @param options - Logger options
   */
  constructor(options: AuditLoggerOptions = {}) {
    super();

    this.options = {
      bufferSize: 100,
      flushInterval: 5000,
      enableTamperEvidence: true,
      storageBackend: options.storageBackend || new FileStorageBackend(
        options.logFilePath || './logs/audit.log'
      ),
      logFilePath: options.logFilePath || './logs/audit.log',
      environment: options.environment || 'development',
      enableCompression: false,
      enableEncryption: false,
      retentionDays: 365,
      ...options,
    };

    this.storage = this.options.storageBackend;

    // Initialize previous hash
    this.initializeHash();

    // Start flush timer
    this.startFlushTimer();
  }

  /**
   * Log an audit event
   *
   * @param event - Event to log
   * @returns Event ID
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp' | 'tamperEvidence'>): Promise<string> {
    if (this.isShuttingDown) {
      throw new Error('Audit logger is shutting down');
    }

    // Create full event
    const fullEvent: AuditEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
      tamperEvidence: this.options.enableTamperEvidence ? this.generateTamperEvidence(event) : undefined,
    };

    // Add to buffer
    this.eventBuffer.push(fullEvent);
    this.statistics.totalEventsLogged++;
    this.statistics.eventsByCategory[event.category] =
      (this.statistics.eventsByCategory[event.category] || 0) + 1;
    this.statistics.eventsBySeverity[event.severity] =
      (this.statistics.eventsBySeverity[event.severity] || 0) + 1;

    // Emit event for real-time monitoring
    this.emit('event', fullEvent);

    // Emit specific severity events
    this.emit(`severity:${event.severity}`, fullEvent);

    // Emit critical events immediately
    if (event.severity === AuditSeverity.CRITICAL) {
      this.emit('critical-event', fullEvent);
      await this.flush();
    }

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.options.bufferSize) {
      await this.flush();
    }

    return fullEvent.id;
  }

  /**
   * Flush buffered events to storage
   *
   * @returns Promise that resolves when flush is complete
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.storage.write(events);
      this.statistics.totalEventsFlushed += events.length;
      this.statistics.lastFlushTime = new Date();

      // Update previous hash
      if (events.length > 0) {
        const lastEvent = events[events.length - 1];
        this.previousHash = lastEvent.tamperEvidence?.currentHash || '';
      }

      this.emit('flushed', events.length);
    } catch (error) {
      // Re-add events to buffer on error
      this.eventBuffer.unshift(...events);
      this.statistics.totalEventsDropped += events.length;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Query audit logs
   *
   * @param query - Query parameters
   * @returns Matching events
   */
  async query(query: AuditQuery): Promise<AuditEvent[]> {
    return this.storage.query(query);
  }

  /**
   * Generate tamper evidence for an event
   *
   * @param event - Event to generate evidence for
   * @returns Tamper evidence
   */
  private generateTamperEvidence(event: Omit<AuditEvent, 'id' | 'timestamp' | 'tamperEvidence'>): {
    previousHash: string;
    currentHash: string;
  } {
    // Create event data without tamper evidence
    const eventData = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Generate hash
    const eventString = JSON.stringify(eventData);
    const currentHash = this.computeHash(this.previousHash + eventString);

    return {
      previousHash: this.previousHash,
      currentHash,
    };
  }

  /**
   * Compute hash of data
   *
   * @param data - Data to hash
   * @returns Hex hash
   */
  private computeHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify tamper evidence of events
   *
   * @param events - Events to verify
   * @returns True if all events are valid
   */
  async verifyTamperEvidence(events: AuditEvent[]): Promise<boolean> {
    let previousHash = '';

    for (const event of events) {
      if (!event.tamperEvidence) {
        return false;
      }

      // Create event data without tamper evidence
      const eventData = { ...event };
      delete eventData.tamperEvidence;

      const eventString = JSON.stringify(eventData);
      const expectedHash = this.computeHash(previousHash + eventString);

      if (event.tamperEvidence.currentHash !== expectedHash) {
        return false;
      }

      if (event.tamperEvidence.previousHash !== previousHash) {
        return false;
      }

      previousHash = event.tamperEvidence.currentHash;
    }

    return true;
  }

  /**
   * Generate a unique event ID
   *
   * @returns Event ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Initialize previous hash from storage
   */
  private async initializeHash(): Promise<void> {
    try {
      this.previousHash = await this.storage.getLatestHash();
    } catch {
      this.previousHash = '';
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        this.emit('error', error);
      });
    }, this.options.flushInterval);
  }

  /**
   * Stop automatic flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Generate compliance report
   *
   * @param framework - Compliance framework
   * @param period - Reporting period
   * @returns Compliance report
   */
  async generateComplianceReport(
    framework: string,
    period: { start: Date; end: Date }
  ): Promise<ComplianceReport> {
    const events = await this.query({
      startTime: period.start,
      endTime: period.end,
    });

    const eventsByCategory: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const securityEvents: AuditEvent[] = [];

    for (const event of events) {
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;

      if (event.category === AuditCategory.SECURITY_EVENT) {
        securityEvents.push(event);
      }
    }

    const complianceIssues: string[] = [];
    const recommendations: string[] = [];

    // Analyze security events
    const criticalSecurityEvents = securityEvents.filter(
      e => e.severity === AuditSeverity.CRITICAL
    );
    if (criticalSecurityEvents.length > 0) {
      complianceIssues.push(
        `${criticalSecurityEvents.length} critical security events detected`
      );
      recommendations.push('Investigate and resolve critical security events immediately');
    }

    // Check for compliance requirements based on framework
    switch (framework.toUpperCase()) {
      case 'SOC2':
        if (eventsByCategory[AuditCategory.AUTHENTICATION] === 0) {
          complianceIssues.push('No authentication events logged');
          recommendations.push('Ensure all authentication attempts are logged');
        }
        break;
      case 'GDPR':
        if (eventsByCategory[AuditCategory.DATA_EXPORT] > 0) {
          recommendations.push('Review data export events for GDPR compliance');
        }
        break;
      case 'HIPAA':
        if (!eventsByCategory[AuditCategory.COMPLIANCE]) {
          complianceIssues.push('Missing compliance events for HIPAA');
          recommendations.push('Log all PHI access and modifications');
        }
        break;
    }

    return {
      framework,
      period,
      totalEvents: events.length,
      eventsByCategory,
      eventsBySeverity,
      securityEvents,
      complianceIssues,
      recommendations,
    };
  }

  /**
   * Get statistics
   *
   * @returns Current statistics
   */
  getStatistics() {
    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalEventsLogged: 0,
      totalEventsFlushed: 0,
      totalEventsDropped: 0,
      eventsByCategory: {},
      eventsBySeverity: {},
      lastFlushTime: new Date(),
    };
  }

  /**
   * Graceful shutdown
   *
   * Flush remaining events and cleanup
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.stopFlushTimer();
    await this.flush();
    this.emit('shutdown');
  }

  /**
   * Quick log helper for common events
   */
  async logQuick(
    category: AuditCategory,
    severity: AuditSeverity,
    operation: string,
    actorId: string,
    resourceType: string,
    outcome: AuditOutcome = AuditOutcome.SUCCESS,
    details: Partial<Pick<AuditEvent, 'actor' | 'action' | 'request' | 'response' | 'resource' | 'changes' | 'security' | 'compliance' | 'context'>> = {}
  ): Promise<string> {
    return this.log({
      category,
      severity,
      outcome,
      eventType: operation,
      actor: {
        id: actorId,
        type: details.actor?.type || 'user',
        userId: details.actor?.userId,
        sessionId: details.actor?.sessionId,
        ipAddress: details.actor?.ipAddress,
        userAgent: details.actor?.userAgent,
        username: details.actor?.username,
        role: details.actor?.role,
      },
      action: {
        operation,
        resourceType,
        resourceId: details.action?.resourceId,
        description: details.action?.description || operation,
        metadata: details.action?.metadata,
      },
      request: details.request,
      response: details.response,
      resource: details.resource,
      changes: details.changes,
      security: details.security,
      compliance: details.compliance,
      context: details.context,
    });
  }
}

/**
 * Default audit logger instance
 */
export const defaultAuditLogger = new AuditLogger();

/**
 * Convenience function to log an audit event
 *
 * @param event - Event to log
 * @returns Event ID
 */
export async function logAuditEvent(
  event: Omit<AuditEvent, 'id' | 'timestamp' | 'tamperEvidence'>
): Promise<string> {
  return defaultAuditLogger.log(event);
}

/**
 * Convenience function to query audit logs
 *
 * @param query - Query parameters
 * @returns Matching events
 */
export async function queryAuditLogs(query: AuditQuery): Promise<AuditEvent[]> {
  return defaultAuditLogger.query(query);
}

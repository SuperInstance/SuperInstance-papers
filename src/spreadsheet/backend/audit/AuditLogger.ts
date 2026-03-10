/**
 * POLLN Spreadsheet Backend - Audit Logger
 *
 * Comprehensive audit logging service for compliance tracking.
 * Supports SOC 2 Type II, GDPR, and other compliance frameworks.
 *
 * Features:
 * - Event logging with structured format
 * - Async buffering for performance
 * - Batch writes
 * - Event sampling
 * - Sensitive data masking
 * - Multiple storage backends
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  AuditCategory,
  AuditSeverity,
  AuditOutcome,
  getEventTypeMetadata,
  requiresImmediateAction,
  getRetentionDays,
} from './EventTypes.js';

/**
 * Core audit event interface
 */
export interface AuditEvent {
  // Unique event identifier
  id: string;

  // Event type and classification
  eventType: string;
  category: AuditCategory;
  severity: AuditSeverity;
  outcome: AuditOutcome;

  // Timestamps
  timestamp: Date;
  receivedAt: Date;

  // Actor information
  actor: {
    id: string;
    type: 'user' | 'service' | 'system';
    username?: string;
    email?: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };

  // Action details
  action: {
    operation: string;
    resourceType: string;
    resourceId?: string;
    description: string;
  };

  // Resource details
  resource: {
    type: string;
    id?: string;
    name?: string;
    path?: string;
    owner?: string;
    sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
  };

  // Request context
  request: {
    id: string;
    method: string;
    path: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  };

  // Response context
  response?: {
    statusCode: number;
    latency: number;
    size?: number;
  };

  // Additional context
  context: {
    location?: string;
    deviceId?: string;
    application?: string;
    environment: string;
    metadata?: Record<string, any>;
  };

  // Changes (for modifications)
  changes?: {
    before?: any;
    after?: any;
    diff?: string;
  };

  // Compliance metadata
  compliance: {
    retentionDays: number;
    frameworks: string[];
    requiresImmediateAction: boolean;
  };

  // Sensitive data flag
  containsSensitiveData: boolean;
}

/**
 * Audit logging options
 */
export interface AuditLoggerOptions {
  // Buffer settings
  bufferSize?: number;
  flushInterval?: number;
  batchTimeout?: number;

  // Sampling settings
  samplingEnabled?: boolean;
  samplingRate?: number; // 0.0 to 1.0
  sampleCriticalOnly?: boolean;

  // Performance settings
  maxQueueSize?: number;
  flushOnError?: boolean;

  // Sensitive data settings
  maskSensitiveData?: boolean;
  sensitivePatterns?: RegExp[];

  // Storage backends
  storageBackends?: string[];

  // Environment
  environment?: 'development' | 'staging' | 'production';
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: AuditLoggerOptions = {
  bufferSize: 100,
  flushInterval: 5000, // 5 seconds
  batchTimeout: 1000, // 1 second
  samplingEnabled: false,
  samplingRate: 1.0,
  sampleCriticalOnly: false,
  maxQueueSize: 10000,
  flushOnError: true,
  maskSensitiveData: true,
  storageBackends: ['database', 'elasticsearch'],
  environment: process.env.NODE_ENV as any || 'development',
};

/**
 * Audit statistics
 */
export interface AuditStatistics {
  totalEventsLogged: number;
  totalEventsFlushed: number;
  totalEventsDropped: number;
  totalEventsSampled: number;
  averageFlushTime: number;
  lastFlushTime: Date;
  currentBufferSize: number;
}

/**
 * Audit logger class
 */
export class AuditLogger extends EventEmitter {
  private options: Required<AuditLoggerOptions>;
  private eventBuffer: AuditEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private storageBackends: Map<string, any> = new Map();
  private statistics: AuditStatistics = {
    totalEventsLogged: 0,
    totalEventsFlushed: 0,
    totalEventsDropped: 0,
    totalEventsSampled: 0,
    averageFlushTime: 0,
    lastFlushTime: new Date(),
    currentBufferSize: 0,
  };
  private isShuttingDown = false;

  constructor(options: AuditLoggerOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options } as Required<AuditLoggerOptions>;
    this.initializeFlushTimer();
  }

  /**
   * Initialize periodic flush timer
   */
  private initializeFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        this.emit('error', error);
      });
    }, this.options.flushInterval);
  }

  /**
   * Log an audit event
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp' | 'receivedAt' | 'compliance'>): Promise<string> {
    // Check shutdown
    if (this.isShuttingDown) {
      throw new Error('Audit logger is shutting down');
    }

    // Apply sampling
    if (this.shouldSample(event)) {
      this.statistics.totalEventsSampled++;
      return '';
    }

    // Create full event
    const fullEvent: AuditEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date(),
      receivedAt: new Date(),
      compliance: {
        retentionDays: getRetentionDays(event.eventType),
        frameworks: this.getComplianceFrameworks(event.eventType),
        requiresImmediateAction: requiresImmediateAction(event.eventType),
      },
      containsSensitiveData: this.detectSensitiveData(event),
    };

    // Mask sensitive data if enabled
    if (this.options.maskSensitiveData && fullEvent.containsSensitiveData) {
      this.maskSensitiveFields(fullEvent);
    }

    // Add to buffer
    this.eventBuffer.push(fullEvent);
    this.statistics.totalEventsLogged++;
    this.statistics.currentBufferSize = this.eventBuffer.length;

    // Emit event for real-time monitoring
    this.emit('event', fullEvent);

    // Check if should flush
    if (this.eventBuffer.length >= this.options.bufferSize) {
      await this.flush();
    }

    // Immediate flush for critical events
    if (fullEvent.compliance.requiresImmediateAction) {
      await this.flush();
      this.emit('criticalEvent', fullEvent);
    }

    return fullEvent.id;
  }

  /**
   * Check if event should be sampled
   */
  private shouldSample(event: Omit<AuditEvent, 'id' | 'timestamp' | 'receivedAt' | 'compliance'>): boolean {
    if (!this.options.samplingEnabled) {
      return false;
    }

    // Don't sample critical events
    if (this.options.sampleCriticalOnly && event.severity === AuditSeverity.CRITICAL) {
      return false;
    }

    // Don't sample events requiring immediate action
    if (requiresImmediateAction(event.eventType)) {
      return false;
    }

    // Apply sampling rate
    return Math.random() > this.options.samplingRate;
  }

  /**
   * Detect if event contains sensitive data
   */
  private detectSensitiveData(event: any): boolean {
    const sensitivePatterns = this.options.sensitivePatterns || [
      /password/i,
      /token/i,
      /secret/i,
      /api[_-]?key/i,
      /credit[_-]?card/i,
      /ssn/i,
      /social[_-]?security/i,
    ];

    const eventString = JSON.stringify(event);
    return sensitivePatterns.some(pattern => pattern.test(eventString));
  }

  /**
   * Mask sensitive fields in event
   */
  private maskSensitiveFields(event: AuditEvent): void {
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'apiKey', 'secret'];

    const maskValue = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      const masked: any = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          masked[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object') {
          masked[key] = maskValue(obj[key]);
        } else {
          masked[key] = obj[key];
        }
      }
      return masked;
    };

    event.context.metadata = maskValue(event.context.metadata);
    event.changes = maskValue(event.changes);
  }

  /**
   * Get compliance frameworks for event type
   */
  private getComplianceFrameworks(eventType: string): string[] {
    const metadata = getEventTypeMetadata(eventType);
    return metadata?.compliantFrameworks || [];
  }

  /**
   * Flush buffered events to storage
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const startTime = Date.now();
    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Write to all configured storage backends
      await Promise.all(
        this.options.storageBackends.map(backend =>
          this.writeToStorage(backend, events)
        )
      );

      this.statistics.totalEventsFlushed += events.length;
      this.statistics.lastFlushTime = new Date();
      this.statistics.averageFlushTime =
        (this.statistics.averageFlushTime * (this.statistics.totalEventsFlushed - events.length) +
          (Date.now() - startTime)) /
        this.statistics.totalEventsFlushed;

      this.emit('flushed', events.length);
    } catch (error) {
      // Re-add events to buffer on error if configured
      if (this.options.flushOnError) {
        this.eventBuffer.unshift(...events);
      } else {
        this.statistics.totalEventsDropped += events.length;
      }
      this.emit('error', error);
      throw error;
    } finally {
      this.statistics.currentBufferSize = this.eventBuffer.length;
    }
  }

  /**
   * Write events to storage backend
   */
  private async writeToStorage(backend: string, events: AuditEvent[]): Promise<void> {
    const storage = this.storageBackends.get(backend);
    if (!storage) {
      throw new Error(`Storage backend '${backend}' not initialized`);
    }

    await storage.write(events);
  }

  /**
   * Register storage backend
   */
  registerStorageBackend(name: string, backend: any): void {
    this.storageBackends.set(name, backend);
  }

  /**
   * Get statistics
   */
  getStatistics(): AuditStatistics {
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
      totalEventsSampled: 0,
      averageFlushTime: 0,
      lastFlushTime: new Date(),
      currentBufferSize: this.eventBuffer.length,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Clear flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Flush remaining events
    await this.flush();

    this.emit('shutdown');
  }

  /**
   * Quick log helper - log with minimal details
   */
  async logQuick(
    eventType: string,
    actorId: string,
    resourceType: string,
    operation: string,
    outcome: AuditOutcome = AuditOutcome.SUCCESS,
    details: Partial<AuditEvent> = {}
  ): Promise<string> {
    return this.log({
      eventType,
      category: this.getCategoryFromEventType(eventType),
      severity: this.getSeverityFromEventType(eventType),
      outcome,
      actor: {
        id: actorId,
        type: 'user',
        ...details.actor,
      },
      action: {
        operation,
        resourceType,
        description: details.action?.description || `${operation} ${resourceType}`,
      },
      resource: {
        type: resourceType,
        ...details.resource,
      },
      request: {
        id: uuidv4(),
        method: details.request?.method || 'UNKNOWN',
        path: details.request?.path || '/',
        ...details.request,
      },
      response: details.response,
      context: {
        environment: this.options.environment,
        ...details.context,
      },
      changes: details.changes,
    });
  }

  private getCategoryFromEventType(eventType: string): AuditCategory {
    const metadata = getEventTypeMetadata(eventType);
    return metadata?.category || AuditCategory.SYSTEM;
  }

  private getSeverityFromEventType(eventType: string): AuditSeverity {
    const metadata = getEventTypeMetadata(eventType);
    return metadata?.severity || AuditSeverity.INFO;
  }
}

/**
 * Singleton instance
 */
let auditLoggerInstance: AuditLogger | null = null;

/**
 * Get or create audit logger instance
 */
export function getAuditLogger(options?: AuditLoggerOptions): AuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger(options);
  }
  return auditLoggerInstance;
}

/**
 * Destroy audit logger instance
 */
export function destroyAuditLogger(): void {
  if (auditLoggerInstance) {
    auditLoggerInstance.shutdown();
    auditLoggerInstance = null;
  }
}

export default AuditLogger;

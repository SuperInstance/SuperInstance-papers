/**
 * Security Audit Logger
 * Immutable audit logging with cryptographic integrity
 */

import { createHash, createSign, createVerify, generateKeyPairSync } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { SecurityConfig } from './config.js';

export type AuditEventType =
  | 'authentication'
  | 'authorization'
  | 'crypto_operation'
  | 'security_event'
  | 'rate_limit'
  | 'signature_failure'
  | 'federated_sync'
  | 'a2a_communication'
  | 'data_access'
  | 'configuration_change'
  | 'system_event';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AuditOutcome = 'success' | 'failure' | 'partial';

export interface AuditEvent {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  severity: AuditSeverity;
  outcome: AuditOutcome;
  actor?: {
    id: string;
    type: 'user' | 'agent' | 'colony' | 'system';
    ip?: string;
    userAgent?: string;
  };
  resource?: {
    type: string;
    id: string;
    colonyId?: string;
  };
  action: string;
  details: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ImmutableAuditEntry {
  event: AuditEvent;
  previousHash: string;
  hash: string;
  signature: string;
  sequenceNumber: number;
}

export interface AuditQuery {
  eventTypes?: AuditEventType[];
  severities?: AuditSeverity[];
  outcomes?: AuditOutcome[];
  actorId?: string;
  resourceId?: string;
  colonyId?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByOutcome: Record<AuditOutcome, number>;
  eventsByHour: Record<string, number>;
  recentActivity: {
    lastHour: number;
    lastDay: number;
    lastWeek: number;
  };
}

/**
 * Immutable Audit Logger with cryptographic integrity
 */
export class SecurityAuditLogger {
  private entries: ImmutableAuditEntry[] = [];
  private privateKey: string;
  private publicKey: string;
  private config: SecurityConfig;
  private sequenceNumber = 0;

  constructor(config: SecurityConfig) {
    this.config = config;

    // Generate keys for audit log signing if not provided
    if (this.config.audit.immutable) {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;
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

    // Check if we should log this event based on configuration
    if (!this.shouldLogEvent(auditEvent)) {
      return auditEvent.id;
    }

    let immutableEntry: ImmutableAuditEntry;

    if (this.config.audit.immutable) {
      // Create immutable entry with cryptographic integrity
      const previousHash = this.entries.length > 0
        ? this.entries[this.entries.length - 1].hash
        : '';

      const entryData = JSON.stringify(auditEvent) + previousHash + this.sequenceNumber;
      const hash = createHash('sha256').update(entryData).digest('hex');

      const sign = createSign('SHA256');
      sign.update(hash);
      sign.end();
      const signature = sign.sign(this.privateKey, 'hex');

      immutableEntry = {
        event: auditEvent,
        previousHash,
        hash,
        signature,
        sequenceNumber: this.sequenceNumber++,
      };
    } else {
      // Create simple entry without cryptographic integrity
      immutableEntry = {
        event: auditEvent,
        previousHash: '',
        hash: '',
        signature: '',
        sequenceNumber: this.sequenceNumber++,
      };
    }

    this.entries.push(immutableEntry);

    // Apply retention policy
    this.applyRetentionPolicy();

    // Log to console if in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(auditEvent);
    }

    return auditEvent.id;
  }

  /**
   * Log authentication event
   */
  logAuthentication(
    action: 'login' | 'logout' | 'token_refresh' | 'token_revocation',
    actor: AuditEvent['actor'],
    outcome: AuditOutcome,
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'authentication',
      severity: outcome === 'failure' ? 'error' : 'info',
      outcome,
      actor,
      action,
      details: details || {},
    });
  }

  /**
   * Log authorization event
   */
  logAuthorization(
    action: string,
    actor: AuditEvent['actor'],
    resource: AuditEvent['resource'],
    outcome: AuditOutcome,
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'authorization',
      severity: outcome === 'failure' ? 'warning' : 'info',
      outcome,
      actor,
      resource,
      action,
      details: details || {},
    });
  }

  /**
   * Log crypto operation
   */
  logCryptoOperation(
    operation: 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'key_rotation',
    outcome: AuditOutcome,
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'crypto_operation',
      severity: outcome === 'failure' ? 'error' : 'info',
      outcome,
      action: operation,
      details: details || {},
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    action: string,
    severity: AuditSeverity,
    outcome: AuditOutcome,
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'security_event',
      severity,
      outcome,
      action,
      details: details || {},
    });
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(
    actor: AuditEvent['actor'],
    resource: AuditEvent['resource'],
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'rate_limit',
      severity: 'warning',
      outcome: 'failure',
      actor,
      resource,
      action: 'rate_limit_exceeded',
      details: details || {},
    });
  }

  /**
   * Log signature failure
   */
  logSignatureFailure(
    packageId: string,
    reason: string,
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'signature_failure',
      severity: 'error',
      outcome: 'failure',
      action: 'signature_verification_failed',
      details: {
        packageId,
        reason,
        ...details,
      },
    });
  }

  /**
   * Log federated sync
   */
  logFederatedSync(
    direction: 'send' | 'receive',
    colonyId: string,
    outcome: AuditOutcome,
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'federated_sync',
      severity: outcome === 'failure' ? 'error' : 'info',
      outcome,
      action: `federated_sync_${direction}`,
      resource: {
        type: 'colony',
        id: colonyId,
      },
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
    outcome: AuditOutcome,
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'a2a_communication',
      severity: outcome === 'failure' ? 'error' : 'info',
      outcome,
      action: 'a2a_package_transmission',
      details: {
        senderId,
        receiverId,
        packageType,
        ...details,
      },
    });
  }

  /**
   * Log data access
   */
  logDataAccess(
    actor: AuditEvent['actor'],
    resource: AuditEvent['resource'],
    action: 'read' | 'write' | 'delete' | 'export',
    outcome: AuditOutcome,
    details?: Record<string, unknown>
  ): string {
    return this.log({
      eventType: 'data_access',
      severity: outcome === 'failure' ? 'warning' : 'info',
      outcome,
      actor,
      resource,
      action,
      details: details || {},
    });
  }

  /**
   * Query audit events
   */
  query(query: AuditQuery): AuditEvent[] {
    let filtered = this.entries.map(entry => entry.event);

    // Apply filters
    if (query.eventTypes && query.eventTypes.length > 0) {
      filtered = filtered.filter(event => query.eventTypes!.includes(event.eventType));
    }

    if (query.severities && query.severities.length > 0) {
      filtered = filtered.filter(event => query.severities!.includes(event.severity));
    }

    if (query.outcomes && query.outcomes.length > 0) {
      filtered = filtered.filter(event => query.outcomes!.includes(event.outcome));
    }

    if (query.actorId) {
      filtered = filtered.filter(event => event.actor?.id === query.actorId);
    }

    if (query.resourceId) {
      filtered = filtered.filter(event => event.resource?.id === query.resourceId);
    }

    if (query.colonyId) {
      filtered = filtered.filter(event => event.resource?.colonyId === query.colonyId);
    }

    if (query.startTime) {
      filtered = filtered.filter(event => event.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      filtered = filtered.filter(event => event.timestamp <= query.endTime!);
    }

    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Get audit statistics
   */
  getStatistics(): AuditStatistics {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;
    const oneWeekAgo = now - 604800000;

    const stats: AuditStatistics = {
      totalEvents: this.entries.length,
      eventsByType: {} as Record<AuditEventType, number>,
      eventsBySeverity: {} as Record<AuditSeverity, number>,
      eventsByOutcome: {} as Record<AuditOutcome, number>,
      eventsByHour: {},
      recentActivity: {
        lastHour: 0,
        lastDay: 0,
        lastWeek: 0,
      },
    };

    // Initialize counters
    const eventTypes: AuditEventType[] = [
      'authentication', 'authorization', 'crypto_operation', 'security_event',
      'rate_limit', 'signature_failure', 'federated_sync', 'a2a_communication',
      'data_access', 'configuration_change', 'system_event'
    ];

    const severities: AuditSeverity[] = ['info', 'warning', 'error', 'critical'];
    const outcomes: AuditOutcome[] = ['success', 'failure', 'partial'];

    eventTypes.forEach(type => stats.eventsByType[type] = 0);
    severities.forEach(severity => stats.eventsBySeverity[severity] = 0);
    outcomes.forEach(outcome => stats.eventsByOutcome[outcome] = 0);

    // Count events
    for (const entry of this.entries) {
      const event = entry.event;

      // Count by type
      stats.eventsByType[event.eventType]++;

      // Count by severity
      stats.eventsBySeverity[event.severity]++;

      // Count by outcome
      stats.eventsByOutcome[event.outcome]++;

      // Count by hour
      const hour = new Date(event.timestamp).toISOString().slice(0, 13) + ':00';
      stats.eventsByHour[hour] = (stats.eventsByHour[hour] || 0) + 1;

      // Count recent activity
      if (event.timestamp >= oneHourAgo) stats.recentActivity.lastHour++;
      if (event.timestamp >= oneDayAgo) stats.recentActivity.lastDay++;
      if (event.timestamp >= oneWeekAgo) stats.recentActivity.lastWeek++;
    }

    return stats;
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit = 100): AuditEvent[] {
    return this.entries
      .slice(-limit)
      .map(entry => entry.event)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Verify audit log integrity
   */
  verifyIntegrity(): boolean {
    if (!this.config.audit.immutable || this.entries.length === 0) {
      return true;
    }

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify hash chain
      const previousHash = i > 0 ? this.entries[i - 1].hash : '';
      const entryData = JSON.stringify(entry.event) + previousHash + entry.sequenceNumber;
      const expectedHash = createHash('sha256').update(entryData).digest('hex');

      if (entry.hash !== expectedHash) {
        console.error(`Hash mismatch at entry ${i}`);
        return false;
      }

      // Verify signature
      const verify = createVerify('SHA256');
      verify.update(entry.hash);
      verify.end();

      if (!verify.verify(this.publicKey, entry.signature, 'hex')) {
        console.error(`Signature verification failed at entry ${i}`);
        return false;
      }

      // Verify previous hash matches
      if (i > 0 && entry.previousHash !== this.entries[i - 1].hash) {
        console.error(`Previous hash mismatch at entry ${i}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Export audit log
   */
  export(startTime?: number, endTime?: number): ImmutableAuditEntry[] {
    let filtered = this.entries;

    if (startTime) {
      filtered = filtered.filter(entry => entry.event.timestamp >= startTime);
    }

    if (endTime) {
      filtered = filtered.filter(entry => entry.event.timestamp <= endTime);
    }

    return filtered;
  }

  /**
   * Clear old events based on retention policy
   */
  clearOldEvents(): number {
    if (this.config.audit.retentionDays <= 0) {
      return 0;
    }

    const cutoffTime = Date.now() - (this.config.audit.retentionDays * 86400000);
    const initialCount = this.entries.length;

    this.entries = this.entries.filter(entry => entry.event.timestamp >= cutoffTime);

    return initialCount - this.entries.length;
  }

  /**
   * Clear all events
   */
  clearAllEvents(): void {
    this.entries = [];
    this.sequenceNumber = 0;
  }

  /**
   * Check if event should be logged based on configuration
   */
  private shouldLogEvent(event: AuditEvent): boolean {
    // Check if audit logging is enabled
    if (!this.config.audit.enabled) {
      return false;
    }

    // Check if event type should be logged
    if (this.config.audit.eventsToLog.length > 0 &&
        !this.config.audit.eventsToLog.includes(event.eventType)) {
      return false;
    }

    // Check if severity should be logged
    if (this.config.audit.logLevels.length > 0 &&
        !this.config.audit.logLevels.includes(event.severity)) {
      return false;
    }

    return true;
  }

  /**
   * Apply retention policy
   */
  private applyRetentionPolicy(): void {
    if (this.config.audit.retentionDays > 0) {
      // Clear old events if we have more than 1000 entries
      if (this.entries.length > 1000) {
        this.clearOldEvents();
      }
    }
  }

  /**
   * Log to console (development only)
   */
  private logToConsole(event: AuditEvent): void {
    const timestamp = new Date(event.timestamp).toISOString();
    const message = `[${timestamp}] [${event.severity.toUpperCase()}] [${event.eventType}] ${event.action} - ${event.outcome}`;

    switch (event.severity) {
      case 'critical':
      case 'error':
        console.error(message);
        break;
      case 'warning':
        console.warn(message);
        break;
      default:
        console.log(message);
    }
  }
}
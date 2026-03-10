/**
 * POLLN Spreadsheet Security - SecurityManager
 *
 * Central security orchestration and threat management system.
 * Coordinates all security modules, detects threats, manages incidents,
 * and provides comprehensive security metrics and reporting.
 *
 * Key Features:
 * - Centralized security orchestration
 * - Real-time threat detection and response
 * - Incident management and tracking
 * - Security metrics and dashboards
 * - Policy enforcement
 * - Automated threat response
 * - Integration with all security modules
 * - Comprehensive security analytics
 * - JSDoc documentation throughout
 *
 * @module SecurityManager
 */

import { EventEmitter } from 'events';
import { SecurityValidator, ValidationResult, ThreatCategory, Severity } from './SecurityValidator.js';
import { ContentSecurityPolicyManager, CSPPolicy, CSPViolationReport } from './ContentSecurityPolicy.js';
import { RateLimiter, RateLimitIdentifier, RateLimitResult } from './RateLimiter.js';
import { SecretScanner, ScanResult, SecretType } from './SecretScanner.js';
import { AuditLogger, AuditEvent, AuditCategory, AuditSeverity, AuditOutcome } from './AuditLogger.js';

/**
 * Security incident levels
 */
export enum IncidentLevel {
  CRITICAL = 'critical',   // Immediate threat requiring urgent response
  HIGH = 'high',           // Significant threat requiring prompt response
  MEDIUM = 'medium',       // Moderate threat requiring response
  LOW = 'low',             // Minor threat requiring monitoring
}

/**
 * Incident status
 */
export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  CONTAINING = 'containing',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  FALSE_POSITIVE = 'false_positive',
}

/**
 * Security incident
 */
export interface SecurityIncident {
  /** Unique incident ID */
  id: string;
  /** Incident level */
  level: IncidentLevel;
  /** Incident status */
  status: IncidentStatus;
  /** Incident title */
  title: string;
  /** Detailed description */
  description: string;
  /** Threat categories involved */
  threatCategories: ThreatCategory[];
  /** Affected resources */
  affectedResources: string[];
  /** Detected timestamp */
  detectedAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Assigned to */
  assignedTo?: string;
  /** Incident timeline */
  timeline: Array<{
    timestamp: Date;
    action: string;
    actor?: string;
    details?: string;
  }>;
  /** Related event IDs */
  relatedEventIds: string[];
  /** Mitigation steps taken */
  mitigationSteps: string[];
  /** Root cause analysis */
  rootCause?: string;
  /** Lessons learned */
  lessonsLearned?: string;
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Security metrics
 */
export interface SecurityMetrics {
  /** Total incidents */
  totalIncidents: number;
  /** Incidents by level */
  incidentsByLevel: Record<IncidentLevel, number>;
  /** Incidents by status */
  incidentsByStatus: Record<IncidentStatus, number>;
  /** Open critical incidents */
  openCriticalIncidents: number;
  /** Average incident resolution time */
  avgResolutionTime: number;
  /** Total threats detected */
  totalThreatsDetected: number;
  /** Threats by category */
  threatsByCategory: Record<ThreatCategory, number>;
  /** Total validation failures */
  totalValidationFailures: number;
  /** Total rate limit blocks */
  totalRateLimitBlocks: number;
  /** Total secrets detected */
  totalSecretsDetected: number;
  /** Total CSP violations */
  totalCSPViolations: number;
  /** Security score (0-100) */
  securityScore: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Security policy
 */
export interface SecurityPolicy {
  /** Policy ID */
  id: string;
  /** Policy name */
  name: string;
  /** Policy description */
  description: string;
  /** Is policy enabled */
  enabled: boolean;
  /** Policy rules */
  rules: SecurityPolicyRule[];
  /** Enforcement level */
  enforcementLevel: 'audit' | 'warn' | 'block';
  /** Affected resources */
  affectedResources: string[];
}

/**
 * Security policy rule
 */
export interface SecurityPolicyRule {
  /** Rule ID */
  id: string;
  /** Rule type */
  type: 'validation' | 'rate_limit' | 'csp' | 'secret_scan' | 'custom';
  /** Rule configuration */
  config: Record<string, unknown>;
  /** Is rule enabled */
  enabled: boolean;
}

/**
 * Security manager options
 */
export interface SecurityManagerOptions {
  /** Enable automatic incident response */
  enableAutoResponse?: boolean;
  /** Enable metrics collection */
  enableMetrics?: boolean;
  /** Metrics update interval */
  metricsUpdateInterval?: number;
  /** Incident retention period (days) */
  incidentRetentionDays?: number;
  /** Custom response handlers */
  responseHandlers?: Map<string, (incident: SecurityIncident) => Promise<void>>;
}

/**
 * SecurityManager class
 *
 * Central orchestrator for all security operations.
 */
export class SecurityManager extends EventEmitter {
  private options: Required<Omit<SecurityManagerOptions, 'responseHandlers'>> & {
    responseHandlers: Map<string, (incident: SecurityIncident) => Promise<void>>;
  };

  // Security modules
  private validator: SecurityValidator;
  private cspManager: ContentSecurityPolicyManager;
  private rateLimiter: RateLimiter;
  private secretScanner: SecretScanner;
  private auditLogger: AuditLogger;

  // Incident management
  private incidents: Map<string, SecurityIncident> = new Map();
  private incidentCounter = 0;

  // Metrics
  private metrics: SecurityMetrics;
  private metricsTimer?: NodeJS.Timeout;

  /**
   * Create a new SecurityManager
   *
   * @param options - Manager options
   */
  constructor(options: SecurityManagerOptions = {}) {
    super();

    this.options = {
      enableAutoResponse: true,
      enableMetrics: true,
      metricsUpdateInterval: 60000, // 1 minute
      incidentRetentionDays: 90,
      responseHandlers: options.responseHandlers || new Map(),
      ...options,
    };

    // Initialize security modules
    this.validator = new SecurityValidator();
    this.cspManager = new ContentSecurityPolicyManager();
    this.rateLimiter = new RateLimiter();
    this.secretScanner = new SecretScanner();
    this.auditLogger = new AuditLogger();

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Setup event listeners
    this.setupEventListeners();

    // Start metrics collection
    if (this.options.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Validate input using SecurityValidator
   *
   * @param input - Input to validate
   * @param options - Validation options
   * @returns Validation result
   */
  async validate(input: string, options?: Parameters<SecurityValidator['validate']>[1]): Promise<ValidationResult> {
    const result = this.validator.validate(input, options);

    if (!result.valid) {
      this.metrics.totalValidationFailures++;

      // Create incident if critical threats detected
      if (result.threats.some(t => t.severity === Severity.CRITICAL)) {
        await this.createIncident({
          level: IncidentLevel.HIGH,
          title: 'Critical validation threats detected',
          description: `Validation detected ${result.threats.length} threat(s) in input`,
          threatCategories: result.threats.map(t => t.category),
          affectedResources: ['input'],
          relatedEventIds: [],
          mitigationSteps: [],
          metadata: { threats: result.threats, input: input.substring(0, 100) },
        });
      }

      // Log to audit
      await this.auditLogger.logQuick(
        AuditCategory.VALIDATION_FAILURE,
        result.threats.some(t => t.severity === Severity.CRITICAL)
          ? AuditSeverity.CRITICAL
          : AuditSeverity.HIGH,
        'validation_failure',
        'system',
        'input',
        AuditOutcome.FAILURE,
        {
          action: {
            description: `Input validation failed with ${result.threats.length} threat(s)`,
            metadata: { threats: result.threats },
          },
        }
      );
    }

    return result;
  }

  /**
   * Check rate limit using RateLimiter
   *
   * @param identifier - Rate limit identifier
   * @returns Rate limit result
   */
  async checkRateLimit(identifier: RateLimitIdentifier): Promise<RateLimitResult> {
    const result = await this.rateLimiter.checkLimit(identifier);

    if (!result.allowed) {
      this.metrics.totalRateLimitBlocks++;

      // Create incident
      await this.createIncident({
        level: IncidentLevel.MEDIUM,
        title: 'Rate limit exceeded',
        description: `Rate limit exceeded for ${JSON.stringify(identifier)}`,
        threatCategories: [],
        affectedResources: [identifier.endpoint || 'unknown'],
        relatedEventIds: [],
        mitigationSteps: [],
        metadata: { identifier, result },
      });

      // Log to audit
      await this.auditLogger.logQuick(
        AuditCategory.RATE_LIMIT,
        AuditSeverity.MEDIUM,
        'rate_limit_exceeded',
        identifier.userId || identifier.ip || 'anonymous',
        identifier.endpoint || 'api',
        AuditOutcome.BLOCKED,
        {
          action: {
            description: 'Rate limit exceeded',
            metadata: { identifier, result },
          },
        }
      );
    }

    return result;
  }

  /**
   * Scan for secrets using SecretScanner
   *
   * @param content - Content to scan
   * @returns Scan result
   */
  async scanSecrets(content: string): Promise<ScanResult> {
    const result = await this.secretScanner.scan(content);

    if (result.detected) {
      this.metrics.totalSecretsDetected += result.secrets.length;

      // Create incident if critical secrets found
      const criticalSecrets = result.secrets.filter(s => s.confidence > 0.9);
      if (criticalSecrets.length > 0) {
        await this.createIncident({
          level: IncidentLevel.HIGH,
          title: 'High-confidence secrets detected',
          description: `Scan detected ${criticalSecrets.length} high-confidence secret(s)`,
          threatCategories: [],
          affectedResources: ['content'],
          relatedEventIds: [],
          mitigationSteps: ['Revoke exposed credentials', 'Rotate affected keys', 'Scan codebase for similar exposures'],
          metadata: { secrets: criticalSecrets },
        });
      }

      // Log to audit
      await this.auditLogger.logQuick(
        AuditCategory.SECURITY_EVENT,
        result.secrets.some(s => s.confidence > 0.9)
          ? AuditSeverity.CRITICAL
          : AuditSeverity.HIGH,
        'secrets_detected',
        'system',
        'content',
        AuditOutcome.FAILURE,
        {
          action: {
            description: `Secret scan detected ${result.secrets.length} secret(s)`,
            metadata: { secrets: result.secrets },
          },
        }
      );
    }

    return result;
  }

  /**
   * Handle CSP violation report
   *
   * @param report - CSP violation report
   */
  async handleCSPViolation(report: CSPViolationReport): void {
    this.metrics.totalCSPViolations++;

    this.cspManager.handleViolationReport(report);

    // Create incident for violations
    this.createIncident({
      level: IncidentLevel.MEDIUM,
      title: 'CSP violation detected',
      description: `Content Security Policy violation: ${report['violated-directive']}`,
      threatCategories: [],
      affectedResources: [report['document-uri'] || 'unknown'],
      relatedEventIds: [],
      mitigationSteps: [],
      metadata: { report },
    });

    // Log to audit
    this.auditLogger.logQuick(
      AuditCategory.SECURITY_EVENT,
      AuditSeverity.MEDIUM,
      'csp_violation',
      'system',
      report['effective-directive'] || 'unknown',
      AuditOutcome.FAILURE,
      {
        action: {
          description: 'CSP violation detected',
          metadata: { report },
        },
      }
    );
  }

  /**
   * Create a new security incident
   *
   * @param incident - Incident details (without id, detectedAt, updatedAt, timeline)
   * @returns Created incident
   */
  async createIncident(incident: Omit<SecurityIncident, 'id' | 'detectedAt' | 'updatedAt' | 'timeline'>): Promise<SecurityIncident> {
    const newIncident: SecurityIncident = {
      ...incident,
      id: `inc_${Date.now()}_${++this.incidentCounter}`,
      detectedAt: new Date(),
      updatedAt: new Date(),
      timeline: [
        {
          timestamp: new Date(),
          action: 'Incident created',
        },
      ],
    };

    this.incidents.set(newIncident.id, newIncident);
    this.metrics.totalIncidents++;
    this.metrics.incidentsByLevel[newIncident.level]++;

    if (newIncident.level === IncidentLevel.CRITICAL) {
      this.metrics.openCriticalIncidents++;
    }

    // Emit incident event
    this.emit('incident-created', newIncident);

    // Log to audit
    await this.auditLogger.logQuick(
      AuditCategory.SECURITY_EVENT,
      newIncident.level === IncidentLevel.CRITICAL
        ? AuditSeverity.CRITICAL
        : newIncident.level === IncidentLevel.HIGH
        ? AuditSeverity.HIGH
        : AuditSeverity.MEDIUM,
      'incident_created',
      'system',
      'incident',
      AuditOutcome.WARNING,
      {
        action: {
          description: `Security incident created: ${newIncident.title}`,
          metadata: { incidentId: newIncident.id, level: newIncident.level },
        },
      }
    );

    // Trigger automatic response if enabled
    if (this.options.enableAutoResponse) {
      await this.autoRespond(newIncident);
    }

    return newIncident;
  }

  /**
   * Update incident status
   *
   * @param incidentId - Incident ID
   * @param status - New status
   * @param actor - Actor making the change
   * @param details - Additional details
   */
  async updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    actor?: string,
    details?: string
  ): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    const oldStatus = incident.status;
    incident.status = status;
    incident.updatedAt = new Date();
    incident.timeline.push({
      timestamp: new Date(),
      action: `Status changed from ${oldStatus} to ${status}`,
      actor,
      details,
    });

    this.metrics.incidentsByStatus[status]++;

    // Emit event
    this.emit('incident-updated', incident);

    // Log to audit
    await this.auditLogger.logQuick(
      AuditCategory.SECURITY_EVENT,
      AuditSeverity.INFO,
      'incident_status_updated',
      actor || 'system',
      'incident',
      AuditOutcome.SUCCESS,
      {
        action: {
          description: `Incident ${incidentId} status updated to ${status}`,
          metadata: { incidentId, oldStatus, newStatus: status },
        },
      }
    );
  }

  /**
   * Add mitigation step to incident
   *
   * @param incidentId - Incident ID
   * @param step - Mitigation step
   */
  async addMitigationStep(incidentId: string, step: string): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    incident.mitigationSteps.push(step);
    incident.updatedAt = new Date();
    incident.timeline.push({
      timestamp: new Date(),
      action: 'Mitigation step added',
      details: step,
    });

    this.emit('incident-updated', incident);
  }

  /**
   * Resolve an incident
   *
   * @param incidentId - Incident ID
   * @param resolution - Resolution details
   * @param actor - Actor resolving the incident
   */
  async resolveIncident(incidentId: string, resolution: string, actor?: string): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    await this.updateIncidentStatus(incidentId, IncidentStatus.RESOLVED, actor, resolution);

    if (incident.level === IncidentLevel.CRITICAL) {
      this.metrics.openCriticalIncidents--;
    }

    // Update metrics
    const resolutionTime = Date.now() - incident.detectedAt.getTime();
    this.metrics.avgResolutionTime =
      (this.metrics.avgResolutionTime * (this.metrics.totalIncidents - 1) + resolutionTime) /
      this.metrics.totalIncidents;

    incident.timeline.push({
      timestamp: new Date(),
      action: 'Incident resolved',
      actor,
      details: resolution,
    });
  }

  /**
   * Get security metrics
   *
   * @returns Current security metrics
   */
  getMetrics(): SecurityMetrics {
    // Update security score
    this.updateSecurityScore();

    return { ...this.metrics };
  }

  /**
   * Get incident by ID
   *
   * @param incidentId - Incident ID
   * @returns Incident or undefined
   */
  getIncident(incidentId: string): SecurityIncident | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * Get all incidents
   *
   * @param filter - Optional filter
   * @returns Array of incidents
   */
  getIncidents(filter?: {
    level?: IncidentLevel;
    status?: IncidentStatus;
    limit?: number;
  }): SecurityIncident[] {
    let incidents = Array.from(this.incidents.values());

    if (filter?.level) {
      incidents = incidents.filter(i => i.level === filter.level);
    }

    if (filter?.status) {
      incidents = incidents.filter(i => i.status === filter.status);
    }

    // Sort by detected time (descending)
    incidents.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

    if (filter?.limit) {
      incidents = incidents.slice(0, filter.limit);
    }

    return incidents;
  }

  /**
   * Auto-respond to incident
   *
   * @param incident - Incident to respond to
   */
  private async autoRespond(incident: SecurityIncident): Promise<void> {
    // Get response handler for incident level
    const handler = this.options.responseHandlers.get(incident.level);

    if (handler) {
      try {
        await handler(incident);
        incident.timeline.push({
          timestamp: new Date(),
          action: 'Automatic response executed',
          details: `Handler: ${incident.level}`,
        });
      } catch (error) {
        incident.timeline.push({
          timestamp: new Date(),
          action: 'Automatic response failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Default automatic responses
    switch (incident.level) {
      case IncidentLevel.CRITICAL:
        // Trigger immediate alerts
        this.emit('critical-incident', incident);
        break;

      case IncidentLevel.HIGH:
        // Trigger alerts
        this.emit('high-severity-incident', incident);
        break;
    }
  }

  /**
   * Initialize metrics
   *
   * @returns Initial metrics
   */
  private initializeMetrics(): SecurityMetrics {
    return {
      totalIncidents: 0,
      incidentsByLevel: {
        [IncidentLevel.CRITICAL]: 0,
        [IncidentLevel.HIGH]: 0,
        [IncidentLevel.MEDIUM]: 0,
        [IncidentLevel.LOW]: 0,
      },
      incidentsByStatus: {
        [IncidentStatus.OPEN]: 0,
        [IncidentStatus.INVESTIGATING]: 0,
        [IncidentStatus.CONTAINING]: 0,
        [IncidentStatus.RESOLVED]: 0,
        [IncidentStatus.CLOSED]: 0,
        [IncidentStatus.FALSE_POSITIVE]: 0,
      },
      openCriticalIncidents: 0,
      avgResolutionTime: 0,
      totalThreatsDetected: 0,
      threatsByCategory: {} as Record<ThreatCategory, number>,
      totalValidationFailures: 0,
      totalRateLimitBlocks: 0,
      totalSecretsDetected: 0,
      totalCSPViolations: 0,
      securityScore: 100,
      timestamp: new Date(),
    };
  }

  /**
   * Update security score
   */
  private updateSecurityScore(): void {
    let score = 100;

    // Deduct for open critical incidents
    score -= this.metrics.openCriticalIncidents * 10;

    // Deduct for validation failures
    score -= Math.min(20, this.metrics.totalValidationFailures * 0.1);

    // Deduct for secrets detected
    score -= Math.min(15, this.metrics.totalSecretsDetected * 2);

    // Deduct for CSP violations
    score -= Math.min(10, this.metrics.totalCSPViolations * 0.5);

    // Ensure score is between 0 and 100
    this.metrics.securityScore = Math.max(0, Math.min(100, score));
    this.metrics.timestamp = new Date();
  }

  /**
   * Setup event listeners for security modules
   */
  private setupEventListeners(): void {
    // Security validator events
    this.validator.on('threats-detected', (threats) => {
      this.metrics.totalThreatsDetected += threats.length;
      for (const threat of threats) {
        this.metrics.threatsByCategory[threat.category] =
          (this.metrics.threatsByCategory[threat.category] || 0) + 1;
      }
    });

    this.validator.on('critical-threat', (threats) => {
      this.emit('critical-threat', threats);
    });

    // Rate limiter events
    this.rateLimiter.on('blocked', (data) => {
      this.emit('rate-limit-blocked', data);
    });

    // CSP manager events
    this.cspManager.on('violation', (report) => {
      this.handleCSPViolation(report);
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.emit('metrics-updated', this.getMetrics());
    }, this.options.metricsUpdateInterval);
  }

  /**
   * Stop metrics collection
   */
  private stopMetricsCollection(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }
  }

  /**
   * Cleanup old incidents
   */
  private cleanupOldIncidents(): void {
    const cutoff = Date.now() - this.options.incidentRetentionDays * 24 * 60 * 60 * 1000;

    for (const [id, incident] of this.incidents.entries()) {
      if (incident.detectedAt.getTime() < cutoff) {
        // Only remove resolved/closed incidents
        if (
          incident.status === IncidentStatus.RESOLVED ||
          incident.status === IncidentStatus.CLOSED ||
          incident.status === IncidentStatus.FALSE_POSITIVE
        ) {
          this.incidents.delete(id);
        }
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.stopMetricsCollection();
    await this.auditLogger.shutdown();
    this.rateLimiter.shutdown();
    this.emit('shutdown');
  }

  /**
   * Get security modules (for advanced usage)
   */
  getModules() {
    return {
      validator: this.validator,
      cspManager: this.cspManager,
      rateLimiter: this.rateLimiter,
      secretScanner: this.secretScanner,
      auditLogger: this.auditLogger,
    };
  }
}

/**
 * Default security manager instance
 */
export const defaultSecurityManager = new SecurityManager();

/**
 * Convenience function to validate input
 *
 * @param input - Input to validate
 * @returns Validation result
 */
export async function secureValidate(input: string): Promise<ValidationResult> {
  return defaultSecurityManager.validate(input);
}

/**
 * Convenience function to check rate limit
 *
 * @param identifier - Rate limit identifier
 * @returns Rate limit result
 */
export async function secureRateLimit(identifier: RateLimitIdentifier): Promise<RateLimitResult> {
  return defaultSecurityManager.checkRateLimit(identifier);
}

/**
 * Convenience function to scan for secrets
 *
 * @param content - Content to scan
 * @returns Scan result
 */
export async function secureScanSecrets(content: string): Promise<ScanResult> {
  return defaultSecurityManager.scanSecrets(content);
}

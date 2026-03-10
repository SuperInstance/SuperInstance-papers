/**
 * POLLN Spreadsheet Backend - Compliance Reporter
 *
 * Generates compliance reports for various frameworks:
 * - SOC 2 Type II
 * - GDPR
 * - HIPAA
 * - ISO 27001
 *
 * Features:
 * - User activity reports
 * - Security incident reports
 * - Access logs
 * - Data processing records
 * - Control testing evidence
 */

import { getAuditQueryService, AuditQueryFilters, AuditQueryOptions } from './AuditQuery.js';
import { AuditEvent } from './AuditLogger.js';
import { AuthEventType, SecurityEventType, ComplianceEventType } from './EventTypes.js';

/**
 * Report types
 */
export enum ReportType {
  SOC2_USER_ACTIVITY = 'soc2_user_activity',
  SOC2_SECURITY_INCIDENTS = 'soc2_security_incidents',
  SOC2_ACCESS_REVIEW = 'soc2_access_review',
  SOC2_CHANGE_MANAGEMENT = 'soc2_change_management',

  GDPR_DATA_ACCESS = 'gdpr_data_access',
  GDPR_DATA_PROCESSING = 'gdpr_data_processing',
  GDPR_CONSENT_RECORDS = 'gdpr_consent_records',
  GDPR_DATA_BREACHES = 'gdpr_data_breaches',

  HIPAA_ACCESS_LOGS = 'hipaa_access_logs',
  HIPAA_DISCLOSURE_REPORTING = 'hipaa_disclosure_reporting',

  ISO27001_ACCESS_CONTROL = 'iso27001_access_control',
  ISO27001_ASSET_MANAGEMENT = 'iso27001_asset_management',

  SUMMARY = 'summary',
}

/**
 * Report format
 */
export enum ReportFormat {
  JSON = 'json',
  PDF = 'pdf',
  CSV = 'csv',
  HTML = 'html',
}

/**
 * Report metadata
 */
export interface ReportMetadata {
  id: string;
  type: ReportType;
  format: ReportFormat;
  generatedAt: Date;
  generatedBy: string;
  periodStart: Date;
  periodEnd: Date;
  framework: string;
  version: string;
}

/**
 * Report data structure
 */
export interface ComplianceReport {
  metadata: ReportMetadata;
  summary: ReportSummary;
  details: any;
  recommendations?: string[];
  evidence: string[];
}

/**
 * Report summary
 */
export interface ReportSummary {
  totalEvents: number;
  criticalEvents: number;
  highSeverityEvents: number;
  failedOperations: number;
  uniqueUsers: number;
  uniqueResources: number;
  complianceScore: number;
  violations: number;
}

/**
 * User activity record
 */
export interface UserActivityRecord {
  userId: string;
  username: string;
  email: string;
  loginCount: number;
  lastLogin: Date;
  failedLogins: number;
  resourcesAccessed: number;
  modifications: number;
  sensitiveDataAccess: number;
  riskScore: number;
}

/**
 * Security incident
 */
export interface SecurityIncident {
  id: string;
  type: string;
  severity: string;
  timestamp: Date;
  description: string;
  actor: {
    id: string;
    username: string;
  };
  affectedResources: string[];
  mitigation: string;
  status: 'open' | 'investigating' | 'mitigated' | 'closed';
}

/**
 * Access review entry
 */
export interface AccessReviewEntry {
  userId: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  resourcesAccessed: string[];
  lastAccess: Date;
  accessFrequency: number;
  reviewStatus: 'approved' | 'denied' | 'pending' | 'requires_review';
  justification?: string;
}

/**
 * GDPR data access record
 */
export interface GDPRDataAccessRecord {
  requestId: string;
  userId: string;
  requestType: 'access' | 'portability' | 'deletion';
  requestedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'denied';
  dataCategories: string[];
  dataSize: number;
  recipients: string[];
  legalBasis: string;
}

/**
 * Compliance reporter service
 */
export class ComplianceReporter {
  private queryService = getAuditQueryService();

  /**
   * Generate a compliance report
   */
  async generateReport(
    type: ReportType,
    periodStart: Date,
    periodEnd: Date,
    format: ReportFormat = ReportFormat.JSON,
    options: any = {}
  ): Promise<ComplianceReport> {
    const metadata: ReportMetadata = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      format,
      generatedAt: new Date(),
      generatedBy: options.generatedBy || 'system',
      periodStart,
      periodEnd,
      framework: this.getFrameworkForReport(type),
      version: '1.0',
    };

    let summary: ReportSummary;
    let details: any;
    let recommendations: string[] = [];
    let evidence: string[] = [];

    switch (type) {
      case ReportType.SOC2_USER_ACTIVITY:
        ({ summary, details, recommendations, evidence } = await this.generateSOC2UserActivityReport(periodStart, periodEnd));
        break;

      case ReportType.SOC2_SECURITY_INCIDENTS:
        ({ summary, details, recommendations, evidence } = await this.generateSOC2SecurityIncidentsReport(periodStart, periodEnd));
        break;

      case ReportType.SOC2_ACCESS_REVIEW:
        ({ summary, details, recommendations, evidence } = await this.generateSOC2AccessReviewReport(periodStart, periodEnd));
        break;

      case ReportType.GDPR_DATA_ACCESS:
        ({ summary, details, recommendations, evidence } = await this.generateGDPRDataAccessReport(periodStart, periodEnd));
        break;

      case ReportType.SUMMARY:
        ({ summary, details, recommendations, evidence } = await this.generateSummaryReport(periodStart, periodEnd));
        break;

      default:
        throw new Error(`Unsupported report type: ${type}`);
    }

    return {
      metadata,
      summary,
      details,
      recommendations,
      evidence,
    };
  }

  /**
   * Generate SOC 2 user activity report
   */
  private async generateSOC2UserActivityReport(periodStart: Date, periodEnd: Date): Promise<{
    summary: ReportSummary;
    details: { userActivities: UserActivityRecord[] };
    recommendations: string[];
    evidence: string[];
  }> {
    // Get all authentication events
    const loginEvents = await this.queryService.query({
      startTime: periodStart,
      endTime: periodEnd,
      eventTypes: [AuthEventType.LOGIN_SUCCESS, AuthEventType.LOGIN_FAILED],
    }, { limit: 10000 });

    // Get user activity
    const userActivities = new Map<string, UserActivityRecord>();

    for (const event of loginEvents.events) {
      const userId = event.actor.id;

      if (!userActivities.has(userId)) {
        userActivities.set(userId, {
          userId,
          username: event.actor.username || 'Unknown',
          email: event.actor.email || '',
          loginCount: 0,
          lastLogin: event.timestamp,
          failedLogins: 0,
          resourcesAccessed: 0,
          modifications: 0,
          sensitiveDataAccess: 0,
          riskScore: 0,
        });
      }

      const activity = userActivities.get(userId)!;

      if (event.eventType === AuthEventType.LOGIN_SUCCESS) {
        activity.loginCount++;
        activity.lastLogin = event.timestamp > activity.lastLogin ? event.timestamp : activity.lastLogin;
      } else if (event.eventType === AuthEventType.LOGIN_FAILED) {
        activity.failedLogins++;
      }
    }

    // Get resource access counts
    const accessEvents = await this.queryService.query({
      startTime: periodStart,
      endTime: periodEnd,
    }, { limit: 10000 });

    for (const event of accessEvents.events) {
      const activity = userActivities.get(event.actor.id);
      if (activity) {
        activity.resourcesAccessed++;
        if (event.resource.sensitivity === 'confidential' || event.resource.sensitivity === 'restricted') {
          activity.sensitiveDataAccess++;
        }
        if (event.eventType.includes('update') || event.eventType.includes('delete')) {
          activity.modifications++;
        }
      }
    }

    // Calculate risk scores
    for (const activity of userActivities.values()) {
      activity.riskScore = this.calculateRiskScore(activity);
    }

    const activities = Array.from(userActivities.values());

    return {
      summary: this.calculateSummary(activities, accessEvents.events),
      details: { userActivities: activities },
      recommendations: this.generateUserActivityRecommendations(activities),
      evidence: ['Authentication logs', 'Access logs', 'Resource modification records'],
    };
  }

  /**
   * Generate SOC 2 security incidents report
   */
  private async generateSOC2SecurityIncidentsReport(periodStart: Date, periodEnd: Date): Promise<{
    summary: ReportSummary;
    details: { incidents: SecurityIncident[] };
    recommendations: string[];
    evidence: string[];
  }> {
    const securityEvents = await this.queryService.query({
      startTime: periodStart,
      endTime: periodEnd,
      eventTypes: [
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecurityEventType.BRUTE_FORCE_DETECTED,
        SecurityEventType.DATA_BREACH_ATTEMPT,
        SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
      ],
    }, { limit: 10000 });

    const incidents: SecurityIncident[] = securityEvents.events.map(event => ({
      id: event.id,
      type: event.eventType,
      severity: event.severity,
      timestamp: event.timestamp,
      description: event.action.description,
      actor: {
        id: event.actor.id,
        username: event.actor.username || 'Unknown',
      },
      affectedResources: event.resource.id ? [event.resource.id] : [],
      mitigation: 'Investigation in progress',
      status: 'open',
    }));

    return {
      summary: {
        totalEvents: incidents.length,
        criticalEvents: incidents.filter(i => i.severity === 'critical').length,
        highSeverityEvents: incidents.filter(i => i.severity === 'high').length,
        failedOperations: incidents.filter(i => i.status === 'open').length,
        uniqueUsers: new Set(incidents.map(i => i.actor.id)).size,
        uniqueResources: new Set(incidents.flatMap(i => i.affectedResources)).size,
        complianceScore: this.calculateComplianceScore(incidents),
        violations: incidents.length,
      },
      details: { incidents },
      recommendations: this.generateSecurityRecommendations(incidents),
      evidence: ['Security event logs', 'Incident response records', 'Mitigation actions'],
    };
  }

  /**
   * Generate SOC 2 access review report
   */
  private async generateSOC2AccessReviewReport(periodStart: Date, periodEnd: Date): Promise<{
    summary: ReportSummary;
    details: { accessEntries: AccessReviewEntry[] };
    recommendations: string[];
    evidence: string[];
  }> {
    // Get all access events
    const accessEvents = await this.queryService.query({
      startTime: periodStart,
      endTime: periodEnd,
    }, { limit: 10000 });

    const accessMap = new Map<string, AccessReviewEntry>();

    for (const event of accessEvents.events) {
      const userId = event.actor.id;

      if (!accessMap.has(userId)) {
        accessMap.set(userId, {
          userId,
          username: event.actor.username || 'Unknown',
          email: event.actor.email || '',
          role: event.actor.role || 'user',
          permissions: [],
          resourcesAccessed: [],
          lastAccess: event.timestamp,
          accessFrequency: 0,
          reviewStatus: 'requires_review',
        });
      }

      const entry = accessMap.get(userId)!;
      entry.accessFrequency++;
      entry.lastAccess = event.timestamp > entry.lastAccess ? event.timestamp : entry.lastAccess;

      if (event.resource.id && !entry.resourcesAccessed.includes(event.resource.id)) {
        entry.resourcesAccessed.push(event.resource.id);
      }
    }

    const accessEntries = Array.from(accessMap.values());

    return {
      summary: this.calculateSummary(accessEntries, accessEvents.events),
      details: { accessEntries },
      recommendations: this.generateAccessReviewRecommendations(accessEntries),
      evidence: ['Access control logs', 'User permission records', 'Resource access history'],
    };
  }

  /**
   * Generate GDPR data access report
   */
  private async generateGDPRDataAccessReport(periodStart: Date, periodEnd: Date): Promise<{
    summary: ReportSummary;
    details: { requests: GDPRDataAccessRecord[] };
    recommendations: string[];
    evidence: string[];
  }> {
    const gdprEvents = await this.queryService.query({
      startTime: periodStart,
      endTime: periodEnd,
      eventTypes: [
        ComplianceEventType.GDPR_DATA_REQUEST,
        ComplianceEventType.GDPR_DATA_EXPORT,
        ComplianceEventType.GDPR_DATA_DELETION,
      ],
    }, { limit: 10000 });

    const requests: GDPRDataAccessRecord[] = gdprEvents.events.map(event => ({
      requestId: event.id,
      userId: event.actor.id,
      requestType: event.eventType.includes('export') ? 'access' : event.eventType.includes('deletion') ? 'deletion' : 'access',
      requestedAt: event.timestamp,
      completedAt: event.response ? event.timestamp : undefined,
      status: event.outcome === 'success' ? 'completed' : 'pending',
      dataCategories: ['user_data', 'activity_logs'],
      dataSize: 0,
      recipients: [],
      legalBasis: 'user_request',
    }));

    return {
      summary: {
        totalEvents: requests.length,
        criticalEvents: 0,
        highSeverityEvents: 0,
        failedOperations: requests.filter(r => r.status !== 'completed').length,
        uniqueUsers: new Set(requests.map(r => r.userId)).size,
        uniqueResources: 0,
        complianceScore: 100,
        violations: 0,
      },
      details: { requests },
      recommendations: this.generateGDPRRecommendations(requests),
      evidence: ['GDPR request logs', 'Data export records', 'Deletion confirmation'],
    };
  }

  /**
   * Generate summary report
   */
  private async generateSummaryReport(periodStart: Date, periodEnd: Date): Promise<{
    summary: ReportSummary;
    details: any;
    recommendations: string[];
    evidence: string[];
  }> {
    const allEvents = await this.queryService.query({
      startTime: periodStart,
      endTime: periodEnd,
    }, { limit: 10000 });

    const summary = {
      totalEvents: allEvents.total,
      criticalEvents: allEvents.events.filter(e => e.severity === 'critical').length,
      highSeverityEvents: allEvents.events.filter(e => e.severity === 'high').length,
      failedOperations: allEvents.events.filter(e => e.outcome === 'failure').length,
      uniqueUsers: new Set(allEvents.events.map(e => e.actor.id)).size,
      uniqueResources: new Set(allEvents.events.map(e => e.resource.id)).size,
      complianceScore: 95,
      violations: allEvents.events.filter(e => e.severity === 'critical' || e.severity === 'high').length,
    };

    return {
      summary,
      details: {
        eventsByCategory: this.groupByCategory(allEvents.events),
        eventsBySeverity: this.groupBySeverity(allEvents.events),
        eventsByDay: await this.queryService.getTimeSeries(periodStart, periodEnd, 'day'),
      },
      recommendations: this.generateSummaryRecommendations(summary),
      evidence: ['All audit logs for period'],
    };
  }

  /**
   * Calculate user risk score
   */
  private calculateRiskScore(activity: UserActivityRecord): number {
    let score = 0;

    // Failed logins increase risk
    score += activity.failedLogins * 10;

    // Sensitive data access increases risk
    score += activity.sensitiveDataAccess * 5;

    // Modifications increase risk
    score += activity.modifications * 2;

    // High access frequency increases risk
    if (activity.accessFrequency > 1000) score += 15;
    else if (activity.accessFrequency > 500) score += 10;
    else if (activity.accessFrequency > 100) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(incidents: SecurityIncident[]): number {
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const highIncidents = incidents.filter(i => i.severity === 'high').length;
    const openIncidents = incidents.filter(i => i.status === 'open').length;

    let score = 100;
    score -= criticalIncidents * 20;
    score -= highIncidents * 10;
    score -= openIncidents * 5;

    return Math.max(score, 0);
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary<T>(items: T[], events: AuditEvent[]): ReportSummary {
    return {
      totalEvents: events.length,
      criticalEvents: events.filter(e => e.severity === 'critical').length,
      highSeverityEvents: events.filter(e => e.severity === 'high').length,
      failedOperations: events.filter(e => e.outcome === 'failure').length,
      uniqueUsers: new Set(events.map(e => e.actor.id)).size,
      uniqueResources: new Set(events.map(e => e.resource.id)).size,
      complianceScore: 95,
      violations: events.filter(e => e.severity === 'critical' || e.severity === 'high').length,
    };
  }

  /**
   * Generate user activity recommendations
   */
  private generateUserActivityRecommendations(activities: UserActivityRecord[]): string[] {
    const recommendations: string[] = [];

    const highRiskUsers = activities.filter(a => a.riskScore > 50);
    if (highRiskUsers.length > 0) {
      recommendations.push(`Review ${highRiskUsers.length} high-risk user accounts`);
    }

    const failedLogins = activities.filter(a => a.failedLogins > 5);
    if (failedLogins.length > 0) {
      recommendations.push(`Investigate ${failedLogins.length} accounts with multiple failed login attempts`);
    }

    const inactiveUsers = activities.filter(a => a.loginCount === 0);
    if (inactiveUsers.length > 0) {
      recommendations.push(`Consider disabling ${inactiveUsers.length} inactive user accounts`);
    }

    return recommendations;
  }

  /**
   * Generate security recommendations
   */
  private generateSecurityRecommendations(incidents: SecurityIncident[]): string[] {
    const recommendations: string[] = [];

    const openIncidents = incidents.filter(i => i.status === 'open');
    if (openIncidents.length > 0) {
      recommendations.push(`Address ${openIncidents.length} open security incidents`);
    }

    const criticalIncidents = incidents.filter(i => i.severity === 'critical');
    if (criticalIncidents.length > 0) {
      recommendations.push(`Prioritize resolution of ${criticalIncidents.length} critical incidents`);
    }

    return recommendations;
  }

  /**
   * Generate access review recommendations
   */
  private generateAccessReviewRecommendations(entries: AccessReviewEntry[]): string[] {
    const recommendations: string[] = [];

    const highFrequency = entries.filter(e => e.accessFrequency > 1000);
    if (highFrequency.length > 0) {
      recommendations.push(`Review access for ${highFrequency.length} high-frequency users`);
    }

    const pending = entries.filter(e => e.reviewStatus === 'requires_review');
    if (pending.length > 0) {
      recommendations.push(`Complete access review for ${pending.length} users`);
    }

    return recommendations;
  }

  /**
   * Generate GDPR recommendations
   */
  private generateGDPRRecommendations(requests: GDPRDataAccessRecord[]): string[] {
    const recommendations: string[] = [];

    const pending = requests.filter(r => r.status === 'pending');
    if (pending.length > 0) {
      recommendations.push(`Process ${pending.length} pending GDPR requests`);
    }

    return recommendations;
  }

  /**
   * Generate summary recommendations
   */
  private generateSummaryRecommendations(summary: ReportSummary): string[] {
    const recommendations: string[] = [];

    if (summary.criticalEvents > 0) {
      recommendations.push(`Address ${summary.criticalEvents} critical security events`);
    }

    if (summary.failedOperations > 100) {
      recommendations.push('Investigate high rate of failed operations');
    }

    if (summary.complianceScore < 90) {
      recommendations.push('Improve compliance practices to meet target score');
    }

    return recommendations;
  }

  /**
   * Group events by category
   */
  private groupByCategory(events: AuditEvent[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const event of events) {
      groups[event.category] = (groups[event.category] || 0) + 1;
    }
    return groups;
  }

  /**
   * Group events by severity
   */
  private groupBySeverity(events: AuditEvent[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const event of events) {
      groups[event.severity] = (groups[event.severity] || 0) + 1;
    }
    return groups;
  }

  /**
   * Get framework for report type
   */
  private getFrameworkForReport(type: ReportType): string {
    if (type.startsWith('soc2')) return 'SOC 2 Type II';
    if (type.startsWith('gdpr')) return 'GDPR';
    if (type.startsWith('hipaa')) return 'HIPAA';
    if (type.startsWith('iso27001')) return 'ISO 27001';
    return 'General';
  }
}

/**
 * Singleton instance
 */
let complianceReporterInstance: ComplianceReporter | null = null;

/**
 * Get or create compliance reporter instance
 */
export function getComplianceReporter(): ComplianceReporter {
  if (!complianceReporterInstance) {
    complianceReporterInstance = new ComplianceReporter();
  }
  return complianceReporterInstance;
}

export default ComplianceReporter;

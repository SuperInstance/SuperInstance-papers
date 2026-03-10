/**
 * POLLN Incident Detector
 * Anomaly detection and threshold monitoring
 */

import { randomUUID } from 'crypto';
import type {
  Incident,
  IncidentType,
  IncidentSeverity,
  DetectionRule,
  DetectionCondition,
  IncidentStatus,
  IncidentUtils
} from './types.js';

/**
 * Detection result
 */
export interface DetectionResult {
  detected: boolean;
  incident?: Incident;
  rule: DetectionRule;
  confidence: number;
}

/**
 * Monitoring data
 */
export interface MonitoringData {
  metric: string;
  value: number | string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, unknown>;
}

/**
 * Incident Detector Configuration
 */
export interface DetectorConfig {
  enabled: boolean;
  interval: number; // milliseconds
  cooldownPeriod: number; // milliseconds
  maxIncidents: number;
}

/**
 * Incident Detector Class
 */
export class IncidentDetector {
  private rules: Map<string, DetectionRule> = new Map();
  private detectedIncidents: Map<string, Incident> = new Map();
  private lastDetectionTime: Map<string, number> = new Map();
  private config: DetectorConfig;

  constructor(config?: Partial<DetectorConfig>) {
    this.config = {
      enabled: true,
      interval: 30000,
      cooldownPeriod: 300000,
      maxIncidents: 1000,
      ...config
    };
  }

  /**
   * Add detection rule
   */
  addRule(rule: DetectionRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove detection rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): DetectionRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get active incidents
   */
  getActiveIncidents(): Incident[] {
    return Array.from(this.detectedIncidents.values())
      .filter(i => i.status !== IncidentStatus.CLOSED);
  }

  /**
   * Process monitoring data
   */
  async processData(data: MonitoringData[]): Promise<DetectionResult[]> {
    if (!this.config.enabled) {
      return [];
    }

    const results: DetectionResult[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      const result = await this.checkRule(rule, data);

      if (result.detected && result.incident) {
        this.detectedIncidents.set(result.incident.id, result.incident);
        this.lastDetectionTime.set(rule.id, Date.now());
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Check if rule conditions are met
   */
  private async checkRule(
    rule: DetectionRule,
    data: MonitoringData[]
  ): Promise<DetectionResult> {
    const matchingData = data.filter(d =>
      this.matchesConditions(d, rule.conditions)
    );

    if (matchingData.length === 0) {
      return {
        detected: false,
        rule,
        confidence: 0
      };
    }

    // Check thresholds
    for (const threshold of rule.thresholds) {
      const thresholdData = matchingData.filter(d =>
        d.metric === threshold.metric &&
        typeof d.value === 'number'
      );

      for (const d of thresholdData) {
        const value = d.value as number;

        if (value >= threshold.critical) {
          return this.createIncident(
            rule,
            IncidentSeverity.CRITICAL,
            matchingData,
            1.0
          );
        }

        if (value >= threshold.warning) {
          return this.createIncident(
            rule,
            IncidentSeverity.HIGH,
            matchingData,
            0.8
          );
        }
      }
    }

    return {
      detected: false,
      rule,
      confidence: 0
    };
  }

  /**
   * Check if data matches conditions
   */
  private matchesConditions(
    data: MonitoringData,
    conditions: DetectionCondition[]
  ): boolean {
    return conditions.every(condition => {
      const value = data.value;
      const target = condition.value;

      switch (condition.operator) {
        case 'gt':
          return typeof value === 'number' && value > target;
        case 'lt':
          return typeof value === 'number' && value < target;
        case 'eq':
          return value === target;
        case 'gte':
          return typeof value === 'number' && value >= target;
        case 'lte':
          return typeof value === 'number' && value <= target;
        case 'ne':
          return value !== target;
        default:
          return false;
      }
    });
  }

  /**
   * Create incident from detection
   */
  private createIncident(
    rule: DetectionRule,
    severity: IncidentSeverity,
    data: MonitoringData[],
    confidence: number
  ): DetectionResult {
    const incident: Incident = {
      id: randomUUID(),
      type: rule.type,
      severity,
      status: IncidentStatus.DETECTED,
      title: `${rule.name} triggered`,
      description: rule.description,
      detectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'detector',
      tags: ['auto-detected'],
      metadata: {
        ruleId: rule.id,
        confidence,
        source: 'incident-detector',
        data: data.map(d => ({
          metric: d.metric,
          value: d.value,
          timestamp: d.timestamp
        }))
      },
      impact: {
        score: this.calculateImpact(data),
        affectedSystems: [...new Set(data.map(d => d.source))],
        businessCritical: severity === IncidentSeverity.CRITICAL
      },
      evidence: data.map(d => ({
        id: randomUUID(),
        type: 'metric',
        data: d,
        collectedAt: d.timestamp,
        source: d.source,
        verified: true
      })),
      actions: []
    };

    return {
      detected: true,
      incident,
      rule,
      confidence
    };
  }

  /**
   * Calculate impact score
   */
  private calculateImpact(data: MonitoringData[]): number {
    const uniqueSystems = new Set(data.map(d => d.source)).size;
    const avgValue = data.reduce((sum, d) =>
      sum + (typeof d.value === 'number' ? d.value : 0), 0) / data.length;

    return Math.min(
      uniqueSystems * 20 + avgValue * 10,
      100
    );
  }

  /**
   * Get incident by ID
   */
  getIncident(id: string): Incident | undefined {
    return this.detectedIncidents.get(id);
  }

  /**
   * Update incident status
   */
  updateIncidentStatus(
    id: string,
    status: IncidentStatus,
    userId: string
  ): Incident | undefined {
    const incident = this.detectedIncidents.get(id);

    if (incident) {
      incident.status = status;
      incident.updatedAt = new Date();

      if (status === IncidentStatus.RESOLVED) {
        incident.resolvedAt = new Date();
      }

      incident.actions.push({
        id: randomUUID(),
        type: 'investigation',
        executor: userId,
        timestamp: new Date(),
        result: {
          success: true,
          message: `Status updated to ${status}`,
          duration: 0
        }
      });

      this.detectedIncidents.set(id, incident);
      return incident;
    }

    return undefined;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const incidents = Array.from(this.detectedIncidents.values());

    return {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      totalIncidents: incidents.length,
      activeIncidents: incidents.filter(i => i.status !== IncidentStatus.CLOSED).length,
      bySeverity: {
        critical: incidents.filter(i => i.severity === IncidentSeverity.CRITICAL).length,
        high: incidents.filter(i => i.severity === IncidentSeverity.HIGH).length,
        medium: incidents.filter(i => i.severity === IncidentSeverity.MEDIUM).length,
        low: incidents.filter(i => i.severity === IncidentSeverity.LOW).length
      },
      byType: {
        security: incidents.filter(i => i.type === IncidentType.SECURITY).length,
        performance: incidents.filter(i => i.type === IncidentType.PERFORMANCE).length,
        data: incidents.filter(i => i.type === IncidentType.DATA).length,
        availability: incidents.filter(i => i.type === IncidentType.AVAILABILITY).length,
        compliance: incidents.filter(i => i.type === IncidentType.COMPLIANCE).length
      }
    };
  }

  /**
   * Clear resolved incidents
   */
  clearResolved(): void {
    for (const [id, incident] of this.detectedIncidents.entries()) {
      if (incident.status === IncidentStatus.CLOSED) {
        this.detectedIncidents.delete(id);
      }
    }
  }
}

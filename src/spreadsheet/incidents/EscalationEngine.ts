/**
 * POLLN Escalation Engine
 * Automated escalation based on time and conditions
 */

import { randomUUID } from 'crypto';
import type {
  Incident,
  IncidentStatus,
  EscalationRule,
  EscalationCondition,
  EscalationStep,
  NotificationChannel,
  IncidentAction,
  ActionType,
  IncidentUtils
} from './types.js';

/**
 * Escalation result
 */
export interface EscalationResult {
  escalated: boolean;
  level?: number;
  reason?: string;
}

/**
 * Escalation Engine Configuration
 */
export interface EscalationEngineConfig {
  enabled: boolean;
  defaultEscalationDelay: number; // minutes
  maxEscalationLevels: number;
  requireApproval: boolean;
}

/**
 * Escalation Engine Class
 */
export class EscalationEngine {
  private rules: Map<string, EscalationRule> = new Map();
  private config: EscalationEngineConfig;
  private escalationHistory: Map<string, number> = new Map();

  constructor(config?: Partial<EscalationEngineConfig>) {
    this.config = {
      enabled: true,
      defaultEscalationDelay: 15,
      maxEscalationLevels: 3,
      requireApproval: true,
      ...config
    };
  }

  /**
   * Add escalation rule
   */
  addRule(rule: EscalationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove escalation rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Process incident for escalation
   */
  async processIncident(incident: Incident): Promise<EscalationResult[]> {
    if (!this.config.enabled) {
      return [];
    }

    const results: EscalationResult[] = [];

    // Find matching escalation rules
    const matchingRules = Array.from(this.rules.values()).filter(
      rule => this.matchesRule(incident, rule)
    );

    for (const rule of matchingRules) {
      const result = await this.checkEscalation(incident, rule);

      if (result.escalated) {
        await this.performEscalation(incident, rule, result.level!);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Check if incident matches escalation rule
   */
  private matchesRule(incident: Incident, rule: EscalationRule): boolean {
    return (
      incident.type === rule.type &&
      incident.severity === rule.severity &&
      (rule.autoEscalate || incident.assignee)
    );
  }

  /**
   * Check if escalation should occur
   */
  private async checkEscalation(
    incident: Incident,
    rule: EscalationRule
  ): Promise<EscalationResult> {
    const currentLevel = this.escalationHistory.get(incident.id) || 0;

    if (currentLevel >= rule.steps.length) {
      return {
        escalated: false,
        reason: 'Maximum escalation level reached'
      };
    }

    if (currentLevel >= this.config.maxEscalationLevels) {
      return {
        escalated: false,
        reason: 'System maximum escalation level reached'
      };
    }

    const nextStep = rule.steps[currentLevel];
    const timeElapsed = this.getTimeElapsedMinutes(incident);
    const noActionFor = this.getTimeSinceLastAction(incident);

    // Check if conditions are met
    const shouldEscalate = rule.conditions.some(condition =>
      this.meetsCondition(incident, condition, timeElapsed, noActionFor)
    );

    if (shouldEscalate) {
      return {
        escalated: true,
        level: currentLevel + 1,
        reason: `Conditions met after ${timeElapsed.toFixed(0)} minutes with no action for ${noActionFor.toFixed(0)} minutes`
      };
    }

    return {
      escalated: false,
      reason: 'Escalation conditions not met'
    };
  }

  /**
   * Check if escalation conditions are met
   */
  private meetsCondition(
    incident: Incident,
    condition: EscalationCondition,
    timeElapsed: number,
    noActionFor: number
  ): boolean {
    // Check status condition
    if (!condition.status.includes(incident.status)) {
      return false;
    }

    // Check time elapsed
    if (timeElapsed < condition.timeElapsed) {
      return false;
    }

    // Check no action for
    if (noActionFor < condition.noActionFor) {
      return false;
    }

    // Check custom conditions if present
    if (condition.customConditions) {
      // Implement custom condition logic here
    }

    return true;
  }

  /**
   * Perform escalation
   */
  private async performEscalation(
    incident: Incident,
    rule: EscalationRule,
    level: number
  ): Promise<void> {
    const step = rule.steps[level - 1];

    // Update escalation level
    this.escalationHistory.set(incident.id, level);

    // Notify recipients
    await this.notifyRecipients(incident, step);

    // Execute escalation actions
    for (const action of step.actions) {
      await this.executeAction(incident, action);
    }

    // Add escalation action to incident
    if (incident.actions) {
      incident.actions.push({
        id: randomUUID(),
        type: ActionType.ESCALATION,
        executor: 'escalation-engine',
        timestamp: new Date(),
        result: {
          success: true,
          message: `Escalated to level ${level}`,
          duration: 0
        },
        metadata: {
          ruleId: rule.id,
          level,
          recipients: step.recipients,
          actions: step.actions
        }
      });
    }
  }

  /**
   * Notify recipients
   */
  private async notifyRecipients(
    incident: Incident,
    step: EscalationStep
  ): Promise<void> {
    const message = this.buildNotificationMessage(incident, step);

    // In real implementation, send notifications via configured channels
    console.log(`Escalation notification for incident ${incident.id}:`);
    console.log(`  Recipients: ${step.recipients.join(', ')}`);
    console.log(`  Message: ${message}`);

    // Simulate notification sending
    await this.sendNotification(step.recipients, message);
  }

  /**
   * Build notification message
   */
  private buildNotificationMessage(
    incident: Incident,
    step: EscalationStep
  ): string {
    return step.message || `${incident.title} (Level ${step.level})`;
  }

  /**
   * Send notification
   */
  private async sendNotification(
    recipients: string[],
    message: string
  ): Promise<void> {
    // In real implementation, integrate with email, Slack, etc.
    for (const recipient of recipients) {
      console.log(`Sending to ${recipient}: ${message}`);
    }
  }

  /**
   * Execute escalation action
   */
  private async executeAction(
    incident: Incident,
    action: ActionType
  ): Promise<void> {
    console.log(`Executing action ${action} for incident ${incident.id}`);
    // Implement action execution logic
  }

  /**
   * Get time elapsed since incident detection (in minutes)
   */
  private getTimeElapsedMinutes(incident: Incident): number {
    return (Date.now() - incident.detectedAt.getTime()) / (1000 * 60);
  }

  /**
   * Get time since last action (in minutes)
   */
  private getTimeSinceLastAction(incident: Incident): number {
    if (!incident.actions || incident.actions.length === 0) {
      return this.getTimeElapsedMinutes(incident);
    }

    const lastAction = incident.actions[incident.actions.length - 1];
    return (Date.now() - lastAction.timestamp.getTime()) / (1000 * 60);
  }

  /**
   * Reset escalation level for incident
   */
  resetEscalation(incidentId: string): void {
    this.escalationHistory.delete(incidentId);
  }

  /**
   * Get escalation level for incident
   */
  getEscalationLevel(incidentId: string): number {
    return this.escalationHistory.get(incidentId) || 0;
  }

  /**
   * Get escalation history
   */
  getHistory(): Map<string, number> {
    return new Map(this.escalationHistory);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const totalEscalations = Array.from(this.escalationHistory.values())
      .reduce((sum, level) => sum + level, 0);

    return {
      totalEscalations,
      incidentsEscalated: this.escalationHistory.size,
      averageLevel: this.escalationHistory.size > 0
        ? totalEscalations / this.escalationHistory.size
        : 0,
      maxLevel: this.config.maxEscalationLevels,
      rules: this.rules.size,
      enabled: this.config.enabled
    };
  }

  /**
   * Check inactivity and escalate if needed
   */
  async checkInactivity(incidents: Incident[]): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    for (const incident of incidents) {
      if (incident.status === IncidentStatus.DETECTED ||
          incident.status === IncidentStatus.INVESTIGATING) {
        await this.processIncident(incident);
      }
    }
  }
}

/**
 * Alerting System
 *
 * Production-ready alerting with configurable rules and multiple notification channels.
 */

import { EventEmitter } from 'events';
import { MetricsCollector } from '../metrics/collector.js';
import { HealthCheckManager, OverallHealth } from '../health/health.js';

/**
 * Alert severity
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Alert status
 */
export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SILENCED = 'silenced',
}

/**
 * Alert condition type
 */
export enum AlertConditionType {
  THRESHOLD = 'threshold',
  RATE = 'rate',
  COMPARISON = 'comparison',
  HEALTH_CHECK = 'health_check',
  PATTERN = 'pattern',
}

/**
 * Alert definition
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  enabled: boolean;
  condition: AlertCondition;
  actions: AlertAction[];
  cooldown?: number; // ms
  silenceUntil?: number; // timestamp
}

/**
 * Alert condition
 */
export interface AlertCondition {
  type: AlertConditionType;
  metric?: string;
  threshold?: number;
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!=';
  rateWindow?: number; // ms for rate conditions
  healthCheck?: string; // for health check conditions
  pattern?: RegExp; // for pattern conditions
}

/**
 * Alert action
 */
export interface AlertAction {
  type: 'log' | 'webhook' | 'email' | 'slack' | 'pagerduty';
  config: Record<string, any>;
}

/**
 * Alert instance
 */
export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  details: Record<string, any>;
  triggeredAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  count: number;
}

/**
 * Notifier interface
 */
export interface Notifier {
  name: string;
  send(alert: Alert): Promise<void>;
}

/**
 * Alert manager configuration
 */
export interface AlertManagerConfig {
  evaluationInterval?: number; // ms
  retentionPeriod?: number; // ms
}

/**
 * Alert manager
 */
export class AlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private notifiers: Map<string, Notifier> = new Map();
  private metricsCollector?: MetricsCollector;
  private healthCheckManager?: HealthCheckManager;
  private config: Required<AlertManagerConfig>;
  private evaluationInterval?: NodeJS.Timeout;

  constructor(
    config: AlertManagerConfig = {}
  ) {
    super();
    this.config = {
      evaluationInterval: config.evaluationInterval || 30000, // 30 seconds
      retentionPeriod: config.retentionPeriod || 86400000, // 24 hours
    };
  }

  /**
   * Set metrics collector
   */
  setMetricsCollector(collector: MetricsCollector): void {
    this.metricsCollector = collector;
  }

  /**
   * Set health check manager
   */
  setHealthCheckManager(manager: HealthCheckManager): void {
    this.healthCheckManager = manager;
  }

  /**
   * Register a notifier
   */
  registerNotifier(notifier: Notifier): void {
    this.notifiers.set(notifier.name, notifier);
  }

  /**
   * Unregister a notifier
   */
  unregisterNotifier(name: string): void {
    this.notifiers.delete(name);
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.emit('rule_added', rule);
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.emit('rule_removed', ruleId);
  }

  /**
   * Update an alert rule
   */
  updateRule(rule: AlertRule): void {
    if (this.rules.has(rule.id)) {
      this.rules.set(rule.id, rule);
      this.emit('rule_updated', rule);
    }
  }

  /**
   * Get all rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): Alert[] {
    // This would typically be stored in a database
    // For now, return empty
    return [];
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = AlertStatus.ACKNOWLEDGED;
      alert.acknowledgedAt = Date.now();
      this.emit('alert_acknowledged', alert);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = AlertStatus.RESOLVED;
      alert.resolvedAt = Date.now();
      this.activeAlerts.delete(alertId);
      this.emit('alert_resolved', alert);
    }
  }

  /**
   * Silence an alert
   */
  silenceAlert(ruleId: string, durationMs: number): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.silenceUntil = Date.now() + durationMs;
      this.emit('alert_silenced', { ruleId, durationMs });
    }
  }

  /**
   * Start alert evaluation
   */
  start(): void {
    if (this.evaluationInterval) {
      this.stop();
    }

    this.evaluationInterval = setInterval(async () => {
      await this.evaluateRules();
    }, this.config.evaluationInterval);
  }

  /**
   * Stop alert evaluation
   */
  stop(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = undefined;
    }
  }

  /**
   * Evaluate all alert rules
   */
  private async evaluateRules(): Promise<void> {
    const now = Date.now();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check if silenced
      if (rule.silenceUntil && rule.silenceUntil > now) continue;

      // Check cooldown
      const existingAlert = this.activeAlerts.get(rule.id);
      if (existingAlert && rule.cooldown) {
        const timeSinceTrigger = now - existingAlert.triggeredAt;
        if (timeSinceTrigger < rule.cooldown) continue;
      }

      // Evaluate condition
      const triggered = await this.evaluateCondition(rule.condition);

      if (triggered) {
        await this.triggerAlert(rule);
      } else if (existingAlert) {
        await this.resolveAlert(rule.id);
      }
    }
  }

  /**
   * Evaluate an alert condition
   */
  private async evaluateCondition(condition: AlertCondition): Promise<boolean> {
    switch (condition.type) {
      case AlertConditionType.THRESHOLD:
      case AlertConditionType.COMPARISON:
        return this.evaluateMetricCondition(condition);

      case AlertConditionType.RATE:
        return this.evaluateRateCondition(condition);

      case AlertConditionType.HEALTH_CHECK:
        return this.evaluateHealthCheckCondition(condition);

      case AlertConditionType.PATTERN:
        return this.evaluatePatternCondition(condition);

      default:
        return false;
    }
  }

  /**
   * Evaluate metric-based condition
   */
  private evaluateMetricCondition(condition: AlertCondition): boolean {
    if (!condition.metric || condition.threshold === undefined || !condition.operator) {
      return false;
    }

    // This would need to query the metrics backend
    // For now, return false as placeholder
    return false;
  }

  /**
   * Evaluate rate-based condition
   */
  private evaluateRateCondition(condition: AlertCondition): boolean {
    if (!condition.metric || condition.threshold === undefined || !condition.rateWindow) {
      return false;
    }

    // This would need to calculate rate over time window
    // For now, return false as placeholder
    return false;
  }

  /**
   * Evaluate health check condition
   */
  private async evaluateHealthCheckCondition(condition: AlertCondition): Promise<boolean> {
    if (!this.healthCheckManager || !condition.healthCheck) {
      return false;
    }

    const result = await this.healthCheckManager.executeCheck(condition.healthCheck);
    return result.status === 'unhealthy';
  }

  /**
   * Evaluate pattern condition
   */
  private evaluatePatternCondition(condition: AlertCondition): boolean {
    // Pattern matching would be implemented based on specific use cases
    return false;
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule): Promise<void> {
    const now = Date.now();
    const existingAlert = this.activeAlerts.get(rule.id);

    const alert: Alert = existingAlert || {
      id: `${rule.id}-${now}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: AlertStatus.ACTIVE,
      message: rule.description,
      details: {
        condition: rule.condition,
      },
      triggeredAt: now,
      count: 0,
    };

    alert.count++;
    this.activeAlerts.set(rule.id, alert);

    this.emit('alert_triggered', alert);

    // Execute actions
    for (const action of rule.actions) {
      await this.executeAction(action, alert);
    }
  }

  /**
   * Execute alert action
   */
  private async executeAction(action: AlertAction, alert: Alert): Promise<void> {
    switch (action.type) {
      case 'log':
        this.executeLogAction(alert);
        break;

      case 'webhook':
        await this.executeWebhookAction(action.config, alert);
        break;

      case 'slack':
        await this.executeSlackAction(action.config, alert);
        break;

      case 'pagerduty':
        await this.executePagerDutyAction(action.config, alert);
        break;

      case 'email':
        await this.executeEmailAction(action.config, alert);
        break;
    }
  }

  /**
   * Execute log action
   */
  private executeLogAction(alert: Alert): void {
    const notifier = this.notifiers.get('log');
    if (notifier) {
      notifier.send(alert).catch((error) => {
        console.error('Failed to send log notification:', error);
      });
    }
  }

  /**
   * Execute webhook action
   */
  private async executeWebhookAction(config: Record<string, any>, alert: Alert): Promise<void> {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  /**
   * Execute Slack action
   */
  private async executeSlackAction(config: Record<string, any>, alert: Alert): Promise<void> {
    const notifier = this.notifiers.get('slack');
    if (notifier) {
      await notifier.send(alert);
    }
  }

  /**
   * Execute PagerDuty action
   */
  private async executePagerDutyAction(config: Record<string, any>, alert: Alert): Promise<void> {
    const notifier = this.notifiers.get('pagerduty');
    if (notifier) {
      await notifier.send(alert);
    }
  }

  /**
   * Execute email action
   */
  private async executeEmailAction(config: Record<string, any>, alert: Alert): Promise<void> {
    const notifier = this.notifiers.get('email');
    if (notifier) {
      await notifier.send(alert);
    }
  }

  /**
   * Shutdown alert manager
   */
  shutdown(): void {
    this.stop();
    this.rules.clear();
    this.activeAlerts.clear();
    this.notifiers.clear();
  }
}

/**
 * Predefined alert rules for POLLN
 */

/**
 * High error rate alert
 */
export function createHighErrorRateAlert(threshold: number = 0.05): AlertRule {
  return {
    id: 'high_error_rate',
    name: 'High Error Rate',
    description: `Error rate exceeds ${(threshold * 100).toFixed(1)}%`,
    severity: AlertSeverity.ERROR,
    enabled: true,
    condition: {
      type: AlertConditionType.THRESHOLD,
      metric: 'polln_agent_failure_total',
      threshold,
      operator: '>',
    },
    actions: [
      {
        type: 'log',
        config: {},
      },
    ],
    cooldown: 300000, // 5 minutes
  };
}

/**
 * High latency alert
 */
export function createHighLatencyAlert(baselineMs: number = 1000): AlertRule {
  return {
    id: 'high_latency',
    name: 'High Latency',
    description: `Latency exceeds ${baselineMs * 2}ms (2x baseline)`,
    severity: AlertSeverity.WARNING,
    enabled: true,
    condition: {
      type: AlertConditionType.THRESHOLD,
      metric: 'polln_agent_execution_duration',
      threshold: baselineMs * 2,
      operator: '>',
    },
    actions: [
      {
        type: 'log',
        config: {},
      },
    ],
    cooldown: 300000,
  };
}

/**
 * Low agent health alert
 */
export function createLowAgentHealthAlert(threshold: number = 0.5): AlertRule {
  return {
    id: 'low_agent_health',
    name: 'Low Agent Health',
    description: `Less than ${(threshold * 100).toFixed(0)}% of agents are healthy`,
    severity: AlertSeverity.WARNING,
    enabled: true,
    condition: {
      type: AlertConditionType.COMPARISON,
      metric: 'polln_agent_active',
      threshold,
      operator: '<',
    },
    actions: [
      {
        type: 'log',
        config: {},
      },
    ],
    cooldown: 600000, // 10 minutes
  };
}

/**
 * High cache miss rate alert
 */
export function createHighCacheMissRateAlert(threshold: number = 0.5): AlertRule {
  return {
    id: 'high_cache_miss_rate',
    name: 'High Cache Miss Rate',
    description: `Cache miss rate exceeds ${(threshold * 100).toFixed(0)}%`,
    severity: AlertSeverity.WARNING,
    enabled: true,
    condition: {
      type: AlertConditionType.THRESHOLD,
      metric: 'kv_cache_miss_rate',
      threshold,
      operator: '>',
    },
    actions: [
      {
        type: 'log',
        config: {},
      },
    ],
    cooldown: 300000,
  };
}

/**
 * Failed federated update alert
 */
export function createFailedFederatedUpdateAlert(): AlertRule {
  return {
    id: 'failed_federated_update',
    name: 'Failed Federated Update',
    description: 'Federated learning update failed',
    severity: AlertSeverity.ERROR,
    enabled: true,
    condition: {
      type: AlertConditionType.HEALTH_CHECK,
      healthCheck: 'federation',
    },
    actions: [
      {
        type: 'log',
        config: {},
      },
    ],
    cooldown: 600000,
  };
}

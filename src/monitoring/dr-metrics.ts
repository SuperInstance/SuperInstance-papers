/**
 * DR Monitoring and Metrics
 * Disaster recovery monitoring and alerting
 */

import { EventEmitter } from 'events';

export interface DRMetricsConfig {
  alertThresholds: {
    rto: {
      warning: number; // minutes
      critical: number; // minutes
    };
    rpo: {
      warning: number; // minutes
      critical: number; // minutes
    };
    backupFailureRate: {
      warning: number; // percentage
      critical: number; // percentage
    };
    backupAge: {
      warning: number; // minutes
      critical: number; // minutes
    };
    replicationLag: {
      warning: number; // seconds
      critical: number; // seconds
    };
  };
  notificationChannels: NotificationChannel[];
}

export interface NotificationChannel {
  type: 'SLACK' | 'EMAIL' | 'PAGERDUTY' | 'WEBHOOK';
  config: Record<string, unknown>;
  enabled: boolean;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

/**
 * DR Metrics Collector
 */
export class DRMetricsCollector extends EventEmitter {
  private config: DRMetricsConfig;
  private metrics: Map<string, any>;
  private alertHistory: any[];

  constructor(config: DRMetricsConfig) {
    super();
    this.config = config;
    this.metrics = new Map();
    this.alertHistory = [];
  }

  /**
   * Record backup created
   */
  recordBackupCreated(backupData: {
    id: string;
    type: string;
    sizeBytes: number;
    duration: number;
    success: boolean;
  }) {
    const timestamp = Date.now();
    const key = `backup_${backupData.type}`;

    this.metrics.set(`${key}_last_success`, timestamp);
    this.metrics.set(`${key}_last_size`, backupData.sizeBytes);
    this.metrics.set(`${key}_last_duration`, backupData.duration);
    this.metrics.set(`${key}_success_count`, (this.metrics.get(`${key}_success_count`) || 0) + 1);

    if (!backupData.success) {
      this.metrics.set(`${key}_failure_count`, (this.metrics.get(`${key}_failure_count`) || 0) + 1);
      this.checkBackupFailureRate(backupData.type);
    } else {
      this.emit('backup_created', backupData);
    }
  }

  /**
   * Record restore executed
   */
  recordRestoreExecuted(restoreData: {
    backupId: string;
    mode: string;
    duration: number;
    success: boolean;
    dataLoss?: boolean;
  }) {
    const timestamp = Date.now();
    const key = `restore_${restoreData.mode}`;

    this.metrics.set(`${key}_last_duration`, restoreData.duration);
    this.metrics.set(`${key}_last_success`, timestamp);

    // Check RTO compliance
    const rtoMinutes = restoreData.duration / (1000 * 60);
    if (rtoMinutes > this.config.alertThresholds.rto.critical) {
      this.sendAlert({
        type: 'RTO_VIOLATION',
        severity: 'CRITICAL',
        message: `RTO exceeded: ${rtoMinutes.toFixed(2)} minutes (target: ${this.config.alertThresholds.rto.critical} min)`,
        data: restoreData
      });
    } else if (rtoMinutes > this.config.alertThresholds.rto.warning) {
      this.sendAlert({
        type: 'RTO_WARNING',
        severity: 'WARNING',
        message: `RTO approaching limit: ${rtoMinutes.toFixed(2)} minutes`,
        data: restoreData
      });
    }

    // Check for data loss
    if (restoreData.dataLoss) {
      this.sendAlert({
        type: 'DATA_LOSS_DETECTED',
        severity: 'CRITICAL',
        message: 'Data loss detected during restore',
        data: restoreData
      });
    }
  }

  /**
   * Record failover executed
   */
  recordFailoverExecuted(failoverData: {
    eventId: string;
    duration: number;
    success: boolean;
    targetRegion: string;
    reason: string;
  }) {
    const timestamp = Date.now();
    this.metrics.set('failover_last', timestamp);
    this.metrics.set('failover_last_duration', failoverData.duration);
    this.metrics.set('failover_count', (this.metrics.get('failover_count') || 0) + 1);

    const rtoMinutes = failoverData.duration / (1000 * 60);
    if (rtoMinutes > this.config.alertThresholds.rto.critical) {
      this.sendAlert({
        type: 'FAILOVER_RTO_VIOLATION',
        severity: 'CRITICAL',
        message: `Failover RTO exceeded: ${rtoMinutes.toFixed(2)} minutes`,
        data: failoverData
      });
    }

    this.emit('failover_completed', failoverData);
  }

  /**
   * Update backup age metric
   */
  updateBackupAge(type: string, ageMinutes: number) {
    this.metrics.set(`backup_age_${type}`, ageMinutes);

    if (ageMinutes > this.config.alertThresholds.backupAge.critical) {
      this.sendAlert({
        type: 'BACKUP_TOO_OLD',
        severity: 'CRITICAL',
        message: `${type} backup is ${ageMinutes.toFixed(1)} minutes old (critical threshold: ${this.config.alertThresholds.backupAge.critical} min)`,
        data: { type, age: ageMinutes }
      });
    } else if (ageMinutes > this.config.alertThresholds.backupAge.warning) {
      this.sendAlert({
        type: 'BACKUP_AGE_WARNING',
        severity: 'WARNING',
        message: `${type} backup is ${ageMinutes.toFixed(1)} minutes old`,
        data: { type, age: ageMinutes }
      });
    }
  }

  /**
   * Update replication lag
   */
  updateReplicationLag(region: string, lagSeconds: number) {
    this.metrics.set(`replication_lag_${region}`, lagSeconds);

    if (lagSeconds > this.config.alertThresholds.replicationLag.critical) {
      this.sendAlert({
        type: 'REPLICATION_LAG_CRITICAL',
        severity: 'CRITICAL',
        message: `Replication lag to ${region}: ${lagSeconds} seconds`,
        data: { region, lag: lagSeconds }
      });
    } else if (lagSeconds > this.config.alertThresholds.replicationLag.warning) {
      this.sendAlert({
        type: 'REPLICATION_LAG_WARNING',
        severity: 'WARNING',
        message: `Replication lag to ${region}: ${lagSeconds} seconds`,
        data: { region, lag: lagSeconds }
      });
    }
  }

  /**
   * Check backup failure rate
   */
  private checkBackupFailureRate(type: string) {
    const key = `backup_${type}`;
    const successCount = this.metrics.get(`${key}_success_count`) || 0;
    const failureCount = this.metrics.get(`${key}_failure_count`) || 0;
    const total = successCount + failureCount;

    if (total === 0) return;

    const failureRate = (failureCount / total) * 100;

    if (failureRate > this.config.alertThresholds.backupFailureRate.critical) {
      this.sendAlert({
        type: 'BACKUP_FAILURE_RATE_CRITICAL',
        severity: 'CRITICAL',
        message: `${type} backup failure rate: ${failureRate.toFixed(1)}%`,
        data: { type, failureRate, total }
      });
    } else if (failureRate > this.config.alertThresholds.backupFailureRate.warning) {
      this.sendAlert({
        type: 'BACKUP_FAILURE_RATE_WARNING',
        severity: 'WARNING',
        message: `${type} backup failure rate: ${failureRate.toFixed(1)}%`,
        data: { type, failureRate, total }
      });
    }
  }

  /**
   * Send alert
   */
  private sendAlert(alert: {
    type: string;
    severity: 'ERROR' | 'WARNING' | 'INFO' | 'CRITICAL';
    message: string;
    data: any;
  }) {
    const timestamp = Date.now();
    const alertEntry = { ...alert, timestamp };

    this.alertHistory.push(alertEntry);

    // Keep last 1000 alerts
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }

    // Send to notification channels
    for (const channel of this.config.notificationChannels) {
      if (channel.enabled && this.shouldSendAlert(channel, alert.severity)) {
        this.sendToChannel(channel, alertEntry);
      }
    }

    this.emit('alert', alertEntry);
  }

  /**
   * Check if alert should be sent to channel
   */
  private shouldSendAlert(channel: NotificationChannel, alertSeverity: string): boolean {
    const severityLevels = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    const channelLevel = channel.severity || 'WARNING';
    return severityLevels.indexOf(alertSeverity) >= severityLevels.indexOf(channelLevel);
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(channel: NotificationChannel, alert: any): Promise<void> {
    try {
      switch (channel.type) {
        case 'SLACK':
          await this.sendToSlack(channel.config, alert);
          break;
        case 'EMAIL':
          await this.sendToEmail(channel.config, alert);
          break;
        case 'PAGERDUTY':
          await this.sendToPagerDuty(channel.config, alert);
          break;
        case 'WEBHOOK':
          await this.sendToWebhook(channel.config, alert);
          break;
      }
    } catch (error) {
      this.emit('notification_error', {
        channel: channel.type,
        error,
        alert
      });
    }
  }

  /**
   * Send to Slack
   */
  private async sendToSlack(config: any, alert: any): Promise<void> {
    // Implementation would use Slack webhook
  }

  /**
   * Send to email
   */
  private async sendToEmail(config: any, alert: any): Promise<void> {
    // Implementation would send email
  }

  /**
   * Send to PagerDuty
   */
  private async sendToPagerDuty(config: any, alert: any): Promise<void> {
    // Implementation would trigger PagerDuty incident
  }

  /**
   * Send to webhook
   */
  private async sendToWebhook(config: any, alert: any): Promise<void> {
    // Implementation would POST to webhook
  }

  /**
   * Get current metrics
   */
  getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): any[] {
    const history = [...this.alertHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get DR status summary
   */
  getDRStatus(): {
    healthy: boolean;
    rtoCompliant: boolean;
    rpoCompliant: boolean;
    backupsCurrent: boolean;
    replicationHealthy: boolean;
    alerts: number;
    lastBackup?: Date;
    lastFailover?: Date;
  } {
    const now = Date.now();
    const alerts = this.alertHistory.filter(a => now - a.timestamp < 24 * 60 * 60 * 1000).length;

    const lastBackupFull = this.metrics.get('backup_FULL_last_success');
    const lastBackupIncremental = this.metrics.get('backup_INCREMENTAL_last_success');
    const lastFailover = this.metrics.get('failover_last');

    const lastBackupAge = lastBackupIncremental
      ? (now - lastBackupIncremental) / (1000 * 60)
      : Infinity;

    return {
      healthy: alerts === 0,
      rtoCompliant: true, // Would check last failover RTO
      rpoCompliant: lastBackupAge < this.config.alertThresholds.rpo.warning,
      backupsCurrent: lastBackupAge < this.config.alertThresholds.backupAge.warning,
      replicationHealthy: true, // Would check replication lag
      alerts,
      lastBackup: lastBackupFull ? new Date(lastBackupFull) : undefined,
      lastFailover: lastFailover ? new Date(lastFailover) : undefined
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.alertHistory = [];
  }
}

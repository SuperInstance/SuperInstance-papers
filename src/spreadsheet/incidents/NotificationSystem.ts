/**
 * POLLN Incident Notification System
 * Multi-channel notifications for incidents
 */

import { randomUUID } from 'crypto';
import type {
  Incident,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus
} from './types.js';

/**
 * Notification message
 */
export interface Notification {
  id: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  subject: string;
  body: string;
  recipients: string[];
  status: NotificationStatus;
  sentAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

/**
 * Notification result
 */
export interface NotificationResult {
  success: boolean;
  notificationId: string;
  channel: NotificationChannel;
  sentAt: Date;
  error?: string;
}

/**
 * Notification system configuration
 */
export interface NotificationSystemConfig {
  enabled: boolean;
  defaultChannels: NotificationChannel[];
  rateLimits: {
    email: { maxPerMinute: number; maxPerHour: number; };
    slack: { maxPerMinute: number; maxPerHour: number; };
    sms: { maxPerMinute: number; maxPerHour: number; };
  };
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Email notification config
 */
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

/**
 * Slack notification config
 */
interface SlackConfig {
  webhookUrl: string;
  defaultChannel: string;
  username: string;
  iconEmoji?: string;
}

/**
 * SMS notification config
 */
interface SMSConfig {
  provider: 'twilio' | 'aws-sns' | 'custom';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

/**
 * Notification System Class
 */
export class NotificationSystem {
  private notifications: Map<string, Notification> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private config: NotificationSystemConfig;
  private emailConfig?: EmailConfig;
  private slackConfig?: SlackConfig;
  private smsConfig?: SMSConfig;
  private rateLimitTracking: Map<string, number[]> = new Map();

  constructor(config?: Partial<NotificationSystemConfig>) {
    this.config = {
      enabled: true,
      defaultChannels: ['email', 'slack'],
      rateLimits: {
        email: { maxPerMinute: 10, maxPerHour: 100 },
        slack: { maxPerMinute: 20, maxPerHour: 500 },
        sms: { maxPerMinute: 5, maxPerHour: 50 }
      },
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.registerDefaultTemplates();
  }

  /**
   * Configure email settings
   */
  configureEmail(config: EmailConfig): void {
    this.emailConfig = config;
  }

  /**
   * Configure Slack settings
   */
  configureSlack(config: SlackConfig): void {
    this.slackConfig = config;
  }

  /**
   * Configure SMS settings
   */
  configureSMS(config: SMSConfig): void {
    this.smsConfig = config;
  }

  /**
   * Register notification template
   */
  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Send notification for incident
   */
  async notify(
    incident: Incident,
    channels?: NotificationChannel[],
    customMessage?: string
  ): Promise<NotificationResult[]> {
    if (!this.config.enabled) {
      return [];
    }

    const selectedChannels = channels || this.config.defaultChannels;
    const results: NotificationResult[] = [];

    for (const channel of selectedChannels) {
      const result = await this.sendNotification(
        incident,
        channel,
        customMessage
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Send single notification
   */
  private async sendNotification(
    incident: Incident,
    channel: NotificationChannel,
    customMessage?: string
  ): Promise<NotificationResult> {
    const notification: Notification = {
      id: randomUUID(),
      channel,
      priority: this.getPriorityForSeverity(incident.severity),
      subject: customMessage ? `${incident.title}` : `[${incident.severity.toUpperCase()}] ${incident.title}`,
      body: customMessage || this.buildNotificationBody(incident),
      recipients: this.getRecipientsForChannel(channel, incident),
      status: 'pending',
      metadata: {
        incidentId: incident.id,
        incidentType: incident.type,
        incidentSeverity: incident.severity
      }
    };

    this.notifications.set(notification.id, notification);

    // Check rate limits
    if (!this.checkRateLimit(channel)) {
      notification.status = 'failed';
      notification.error = 'Rate limit exceeded';
      return {
        success: false,
        notificationId: notification.id,
        channel,
        sentAt: new Date(),
        error: 'Rate limit exceeded'
      };
    }

    // Send notification based on channel
    let attempt = 0;
    let lastError: string | undefined;

    while (attempt < this.config.retryAttempts) {
      try {
        await this.sendToChannel(notification);
        notification.status = 'sent';
        notification.sentAt = new Date();

        return {
          success: true,
          notificationId: notification.id,
          channel,
          sentAt: notification.sentAt
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        attempt++;

        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    notification.status = 'failed';
    notification.error = lastError;

    return {
      success: false,
      notificationId: notification.id,
      channel,
      sentAt: new Date(),
      error: lastError
    };
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(notification: Notification): Promise<void> {
    switch (notification.channel) {
      case 'email':
        await this.sendEmail(notification);
        break;

      case 'slack':
        await this.sendSlack(notification);
        break;

      case 'sms':
        await this.sendSMS(notification);
        break;

      case 'webhook':
        await this.sendWebhook(notification);
        break;

      case 'pagerduty':
        await this.sendPagerDuty(notification);
        break;

      default:
        throw new Error(`Unknown channel: ${notification.channel}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: Notification): Promise<void> {
    if (!this.emailConfig) {
      throw new Error('Email not configured');
    }

    // In real implementation, use nodemailer or similar
    console.log(`[EMAIL] To: ${notification.recipients.join(', ')}`);
    console.log(`[EMAIL] Subject: ${notification.subject}`);
    console.log(`[EMAIL] Body: ${notification.body}`);
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(notification: Notification): Promise<void> {
    if (!this.slackConfig) {
      throw new Error('Slack not configured');
    }

    const color = this.getSlackColor(notification.priority);

    const payload = {
      channel: this.slackConfig.defaultChannel,
      username: this.slackConfig.username,
      icon_emoji: this.slackConfig.iconEmoji,
      attachments: [
        {
          color,
          title: notification.subject,
          text: notification.body,
          footer: 'POLLN Incident Management',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    // Send to webhook
    const response = await fetch(this.slackConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(notification: Notification): Promise<void> {
    if (!this.smsConfig) {
      throw new Error('SMS not configured');
    }

    // In real implementation, integrate with Twilio, AWS SNS, etc.
    console.log(`[SMS] To: ${notification.recipients.join(', ')}`);
    console.log(`[SMS] Body: ${notification.body}`);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(notification: Notification): Promise<void> {
    const webhookUrl = process.env.INCIDENT_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: notification.id,
        channel: notification.channel,
        priority: notification.priority,
        subject: notification.subject,
        body: notification.body,
        metadata: notification.metadata
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
  }

  /**
   * Send PagerDuty notification
   */
  private async sendPagerDuty(notification: Notification): Promise<void> {
    const apiKey = process.env.PAGERDUTY_API_KEY;
    const integrationKey = process.env.PAGERDUTY_INTEGRATION_KEY;

    if (!apiKey || !integrationKey) {
      throw new Error('PagerDuty not configured');
    }

    // In real implementation, use PagerDuty API
    console.log(`[PAGERDUTY] Priority: ${notification.priority}`);
    console.log(`[PAGERDUTY] Subject: ${notification.subject}`);
  }

  /**
   * Get recipients for channel
   */
  private getRecipientsForChannel(channel: NotificationChannel, incident: Incident): string[] {
    // In real implementation, this would query a user directory
    switch (channel) {
      case 'email':
        return ['oncall@example.com', incident.assignee || 'team@example.com'];

      case 'slack':
        return ['#incidents', '#oncall'];

      case 'sms':
        return incident.assignee ? [`+1${incident.assignee}`] : [];

      default:
        return [];
    }
  }

  /**
   * Get priority for severity
   */
  private getPriorityForSeverity(severity: string): NotificationPriority {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Get Slack color for priority
   */
  private getSlackColor(priority: NotificationPriority): string {
    switch (priority) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return '#FFA500';
      default:
        return 'good';
    }
  }

  /**
   * Build notification body
   */
  private buildNotificationBody(incident: Incident): string {
    return `
Incident Details:

ID: ${incident.id}
Type: ${incident.type}
Severity: ${incident.severity}
Status: ${incident.status}

Description: ${incident.description}

Detected At: ${incident.detectedAt.toISOString()}
Impact Score: ${incident.impact.score}

${incident.assignee ? `Assigned to: ${incident.assignee}` : 'Unassigned'}

${incident.evidence.length > 0 ? `Evidence: ${incident.evidence.length} items attached` : ''}
    `.trim();
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(channel: NotificationChannel): boolean {
    const now = Date.now();
    const key = channel;
    const timestamps = this.rateLimitTracking.get(key) || [];

    // Filter to last minute
    const oneMinuteAgo = now - 60000;
    const recent = timestamps.filter(t => t > oneMinuteAgo);

    const limits = this.config.rateLimits[channel as keyof typeof this.config.rateLimits];
    if (!limits) return true;

    if (recent.length >= limits.maxPerMinute) {
      return false;
    }

    // Add current timestamp
    recent.push(now);
    this.rateLimitTracking.set(key, recent);

    return true;
  }

  /**
   * Get notification by ID
   */
  getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  /**
   * Get notifications for incident
   */
  getNotificationsForIncident(incidentId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.metadata?.incidentId === incidentId);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const notifications = Array.from(this.notifications.values());

    return {
      total: notifications.length,
      byStatus: {
        sent: notifications.filter(n => n.status === 'sent').length,
        pending: notifications.filter(n => n.status === 'pending').length,
        failed: notifications.filter(n => n.status === 'failed').length
      },
      byChannel: {
        email: notifications.filter(n => n.channel === 'email').length,
        slack: notifications.filter(n => n.channel === 'slack').length,
        sms: notifications.filter(n => n.channel === 'sms').length,
        webhook: notifications.filter(n => n.channel === 'webhook').length,
        pagerduty: notifications.filter(n => n.channel === 'pagerduty').length
      },
      templates: this.templates.size,
      enabled: this.config.enabled
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Register default notification templates
   */
  private registerDefaultTemplates(): void {
    this.registerTemplate({
      id: 'incident-created',
      name: 'Incident Created',
      subject: '[{{severity}}] {{title}}',
      body: `A new incident has been detected:

ID: {{incidentId}}
Type: {{type}}
Severity: {{severity}}

Description: {{description}}

Please investigate and respond.`,
      variables: ['severity', 'title', 'incidentId', 'type', 'description']
    });

    this.registerTemplate({
      id: 'incident-escalated',
      name: 'Incident Escalated',
      subject: '[ESCALATED] {{title}} - Level {{level}}',
      body: `Incident has been escalated to level {{level}}:

ID: {{incidentId}}
Previous Level: {{previousLevel}}
New Level: {{level}}

Reason: {{reason}}

Action required immediately.`,
      variables: ['title', 'level', 'incidentId', 'previousLevel', 'reason']
    });

    this.registerTemplate({
      id: 'incident-resolved',
      name: 'Incident Resolved',
      subject: '[RESOLVED] {{title}}',
      body: `Incident has been resolved:

ID: {{incidentId}}
Resolution: {{resolution}}
Duration: {{duration}}

Post-mortem scheduled for: {{postMortemDate}}`,
      variables: ['title', 'incidentId', 'resolution', 'duration', 'postMortemDate']
    });
  }
}

/**
 * POLLN Slack Integration Connector
 *
 * Integrates POLLN cells with Slack for messaging, notifications,
 * slash commands, and file operations.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  IntegrationConnector,
  IntegrationConfig,
  IntegrationType,
  ConnectionState,
  IntegrationResult,
  IntegrationError,
  HealthStatus,
  IntegrationMetrics,
  ErrorCode,
} from '../types.js';

// ============================================================================
// Slack-Specific Types
// ============================================================================

export interface SlackConfig extends IntegrationConfig {
  type: IntegrationType.SLACK;
  credentials: {
    apiToken: string;
    signingSecret?: string;
    webhookUrl?: string;
  };
  options?: {
    defaultChannel?: string;
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
  };
}

export interface SlackMessage {
  channel: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  threadTs?: string;
  replyBroadcast?: boolean;
  username?: string;
  iconEmoji?: string;
  iconUrl?: string;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
    emoji?: boolean;
  }>;
  accessory?: any;
  [key: string]: any;
}

export interface SlackAttachment {
  color?: string;
  fallback?: string;
  text?: string;
  title?: string;
  title_link?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  actions?: Array<{
    type: string;
    text: string;
    url?: string;
    value?: string;
    style?: string;
  }>;
}

export interface SlackSlashCommand {
  token: string;
  teamId: string;
  teamDomain: string;
  channelId: string;
  channelName: string;
  userId: string;
  userName: string;
  command: string;
  text: string;
  responseUrl: string;
  triggerId: string;
}

export interface SlackFile {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  size: number;
  urlPrivate: string;
  urlPrivateDownload: string;
  timestamp: number;
  user: string;
}

// ============================================================================
// Slack API Client
// ============================================================================

class SlackAPIClient {
  constructor(
    private apiToken: string,
    private baseUrl: string = 'https://slack.com/api'
  ) {}

  async call(method: string, data: any = {}): Promise<any> {
    const url = `${this.baseUrl}/${method}`;
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || 'Slack API error');
    }

    return result;
  }

  async uploadFile(
    file: Buffer | string,
    filename: string,
    channels: string[],
    initialComment?: string,
    title?: string
  ): Promise<SlackFile> {
    const FormData = (await import('form-data')).default;
    const form = new FormData();

    form.append('file', file);
    form.append('filename', filename);
    form.append('channels', channels.join(','));
    if (initialComment) form.append('initial_comment', initialComment);
    if (title) form.append('title', title);

    const response = await fetch(`${this.baseUrl}/files.upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        ...form.getHeaders(),
      },
      body: form as any,
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || 'File upload failed');
    }

    return result.file as SlackFile;
  }
}

// ============================================================================
// Slack Connector
// ============================================================================

export class SlackConnector extends EventEmitter implements IntegrationConnector {
  readonly id: string;
  readonly name: string;
  readonly type = IntegrationType.SLACK;
  state: ConnectionState = ConnectionState.DISCONNECTED;

  private config: SlackConfig;
  private apiClient: SlackAPIClient;
  private metrics: IntegrationMetrics;
  private connectionTime: number = 0;

  // Rate limiting
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly tier1Limit = 1; // requests per second
  private readonly tier2Limit = 200; // requests per minute

  constructor(config: SlackConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.config = config;
    this.apiClient = new SlackAPIClient(config.credentials.apiToken);
    this.metrics = this.createEmptyMetrics();
  }

  // ========================================================================
  // Connector Interface Implementation
  // ========================================================================

  async initialize(config: IntegrationConfig): Promise<void> {
    this.config = config as SlackConfig;
    this.apiClient = new SlackAPIClient(this.config.credentials.apiToken);
    this.state = ConnectionState.DISCONNECTED;
    this.emit('initialized', { timestamp: Date.now() });
  }

  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.state = ConnectionState.CONNECTING;

    try {
      // Test connection by calling auth.test
      await this.apiClient.call('auth.test');

      this.state = ConnectionState.CONNECTED;
      this.connectionTime = Date.now();

      this.emit('connected', {
        timestamp: Date.now(),
        connectionTime: this.connectionTime,
      });
    } catch (error) {
      this.state = ConnectionState.ERROR;
      throw this.createError(
        ErrorCode.UNAUTHORIZED,
        `Failed to connect to Slack: ${error.message}`,
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    this.state = ConnectionState.DISCONNECTED;
    this.connectionTime = 0;
    this.emit('disconnected', { timestamp: Date.now() });
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  async send(operation: string, data: any): Promise<IntegrationResult> {
    if (!this.isConnected()) {
      return this.errorResult(
        ErrorCode.CONNECTION_REFUSED,
        'Not connected to Slack'
      );
    }

    // Rate limiting
    await this.checkRateLimit();

    const startTime = Date.now();

    try {
      let result: any;

      switch (operation) {
        case 'message':
        case 'sendMessage':
          result = await this.sendMessage(data);
          break;

        case 'ephemeral':
        case 'sendEphemeral':
          result = await this.sendEphemeralMessage(data);
          break;

        case 'update':
        case 'updateMessage':
          result = await this.updateMessage(data);
          break;

        case 'delete':
        case 'deleteMessage':
          result = await this.deleteMessage(data);
          break;

        case 'upload':
        case 'uploadFile':
          result = await this.uploadFile(data);
          break;

        case 'command':
        case 'slashCommand':
          result = await this.handleSlashCommand(data);
          break;

        case 'dialog':
        case 'openDialog':
          result = await this.openDialog(data);
          break;

        case 'reaction':
        case 'addReaction':
          result = await this.addReaction(data);
          break;

        case 'channel':
        case 'getChannel':
          result = await this.getChannelInfo(data.channel);
          break;

        case 'user':
        case 'getUser':
          result = await this.getUserInfo(data.user);
          break;

        default:
          return this.errorResult(
            ErrorCode.OPERATION_NOT_SUPPORTED,
            `Unsupported operation: ${operation}`
          );
      }

      const duration = Date.now() - startTime;
      this.recordSuccess(duration, 0, 0);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: Date.now(),
          duration,
          retries: 0,
          requestId: this.generateRequestId(),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError(duration);

      return this.errorResult(
        this.mapErrorCode(error),
        error.message,
        error
      );
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const details: any = {
      connection: false,
      authentication: false,
      rateLimit: true,
      errors: [],
    };

    try {
      // Check connection
      details.connection = this.isConnected();

      // Check authentication
      const authResult = await this.apiClient.call('auth.test');
      details.authentication = authResult.ok;

      // Check rate limit status
      details.rateLimit = this.requestCount < this.tier1Limit;

      return {
        status: details.connection && details.authentication ? 'healthy' : 'unhealthy',
        details,
        lastCheck: Date.now(),
      };
    } catch (error) {
      details.errors.push(error.message);
      return {
        status: 'unhealthy',
        details,
        lastCheck: Date.now(),
      };
    }
  }

  getMetrics(): IntegrationMetrics {
    return { ...this.metrics };
  }

  async dispose(): Promise<void> {
    await this.disconnect();
    this.removeAllListeners();
  }

  // ========================================================================
  // Slack Operations
  // ========================================================================

  /**
   * Send a message to a channel
   */
  async sendMessage(message: SlackMessage): Promise<any> {
    const payload = {
      channel: message.channel,
      text: message.text || '',
      blocks: message.blocks,
      attachments: message.attachments,
      thread_ts: message.threadTs,
      reply_broadcast: message.replyBroadcast,
      username: message.username || this.config.options?.username,
      icon_emoji: message.iconEmoji || this.config.options?.iconEmoji,
      icon_url: message.iconUrl || this.config.options?.iconUrl,
    };

    return await this.apiClient.call('chat.postMessage', payload);
  }

  /**
   * Send an ephemeral message (visible only to specific user)
   */
  async sendEphemeralMessage(data: {
    channel: string;
    user: string;
    text: string;
    attachments?: SlackAttachment[];
    blocks?: SlackBlock[];
  }): Promise<any> {
    return await this.apiClient.call('chat.postEphemeral', {
      channel: data.channel,
      user: data.user,
      text: data.text,
      attachments: data.attachments,
      blocks: data.blocks,
    });
  }

  /**
   * Update an existing message
   */
  async updateMessage(data: {
    channel: string;
    ts: string;
    text?: string;
    blocks?: SlackBlock[];
    attachments?: SlackAttachment[];
  }): Promise<any> {
    return await this.apiClient.call('chat.update', {
      channel: data.channel,
      ts: data.ts,
      text: data.text || '',
      blocks: data.blocks,
      attachments: data.attachments,
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(data: {
    channel: string;
    ts: string;
  }): Promise<any> {
    return await this.apiClient.call('chat.delete', {
      channel: data.channel,
      ts: data.ts,
    });
  }

  /**
   * Upload a file to Slack
   */
  async uploadFile(data: {
    file: Buffer | string;
    filename: string;
    channels: string[];
    initialComment?: string;
    title?: string;
  }): Promise<SlackFile> {
    return await this.apiClient.uploadFile(
      data.file,
      data.filename,
      data.channels,
      data.initialComment,
      data.title
    );
  }

  /**
   * Handle slash command
   */
  async handleSlashCommand(command: SlackSlashCommand): Promise<any> {
    // Verify token
    if (
      this.config.credentials.signingSecret &&
      !this.verifySlashCommandToken(command.token)
    ) {
      throw new Error('Invalid slash command token');
    }

    // Emit event for cell system to handle
    this.emit('slashCommand', {
      command: command.command,
      text: command.text,
      userId: command.userId,
      userName: command.userName,
      channelId: command.channelId,
      channelName: command.channelName,
      responseUrl: command.responseUrl,
      timestamp: Date.now(),
    });

    return {
      ok: true,
      message: 'Command received',
    };
  }

  /**
   * Open a dialog
   */
  async openDialog(data: {
    triggerId: string;
    dialog: {
      title: string;
      callbackId: string;
      elements: any[];
    };
  }): Promise<any> {
    return await this.apiClient.call('dialog.open', {
      trigger_id: data.triggerId,
      dialog: data.dialog,
    });
  }

  /**
   * Add reaction to message
   */
  async addReaction(data: {
    channel: string;
    timestamp: string;
    name: string;
  }): Promise<any> {
    return await this.apiClient.call('reactions.add', {
      channel: data.channel,
      timestamp: data.timestamp,
      name: data.name,
    });
  }

  /**
   * Get channel information
   */
  async getChannelInfo(channelId: string): Promise<any> {
    return await this.apiClient.call('conversations.info', {
      channel: channelId,
    });
  }

  /**
   * Get user information
   */
  async getUserInfo(userId: string): Promise<any> {
    return await this.apiClient.call('users.info', {
      user: userId,
    });
  }

  // ========================================================================
  // Webhook Signature Verification
  // ========================================================================

  /**
   * Verify Slack webhook request signature
   */
  static verifyRequestSignature(
    signingSecret: string,
    body: string,
    signature: string,
    timestamp: string
  ): boolean {
    const time = Math.floor(new Date().getTime() / 1000);

    // Reject requests older than 5 minutes
    if (Math.abs(time - parseInt(timestamp)) > 300) {
      return false;
    }

    const baseString = `v0:${timestamp}:${body}`;
    const expectedSignature =
      'v0=' +
      crypto
        .createHmac('sha256', signingSecret)
        .update(baseString)
        .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset counters if new second
    if (now - this.lastResetTime >= 1000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    this.requestCount++;

    // Tier 1: 1 request per second
    if (this.requestCount > this.tier1Limit) {
      const delay = 1000 - (now - this.lastResetTime);
      if (delay > 0) {
        await this.sleep(delay);
      }
    }
  }

  private verifySlashCommandToken(token: string): boolean {
    // In production, verify against stored token
    return true;
  }

  private createEmptyMetrics(): IntegrationMetrics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      bytesSent: 0,
      bytesReceived: 0,
      rateLimitHits: 0,
      retryAttempts: 0,
      uptime: 100,
    };
  }

  private recordSuccess(duration: number, bytesSent: number, bytesReceived: number): void {
    this.metrics.totalOperations++;
    this.metrics.successfulOperations++;
    this.metrics.bytesSent += bytesSent;
    this.metrics.bytesReceived += bytesReceived;

    const totalDuration =
      this.metrics.averageDuration * (this.metrics.totalOperations - 1) + duration;
    this.metrics.averageDuration = totalDuration / this.metrics.totalOperations;
  }

  private recordError(duration: number): void {
    this.metrics.totalOperations++;
    this.metrics.failedOperations++;

    const totalDuration =
      this.metrics.averageDuration * (this.metrics.totalOperations - 1) + duration;
    this.metrics.averageDuration = totalDuration / this.metrics.totalOperations;
  }

  private errorResult(
    code: ErrorCode,
    message: string,
    cause?: Error
  ): IntegrationResult {
    return {
      success: false,
      error: this.createError(code, message, cause),
      metadata: {
        timestamp: Date.now(),
        duration: 0,
        retries: 0,
      },
    };
  }

  private createError(
    code: ErrorCode,
    message: string,
    cause?: Error
  ): IntegrationError {
    return {
      code,
      message,
      cause,
      retryable: this.isRetryable(code),
      retryDelay: this.calculateRetryDelay(code),
    };
  }

  private mapErrorCode(error: any): ErrorCode {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('token') || message.includes('auth')) {
      return ErrorCode.UNAUTHORIZED;
    }
    if (message.includes('rate') || message.includes('limit')) {
      return ErrorCode.RATE_LIMITED;
    }
    if (message.includes('not found')) {
      return ErrorCode.NOT_FOUND;
    }
    if (message.includes('timeout')) {
      return ErrorCode.TIMEOUT;
    }

    return ErrorCode.INTERNAL_ERROR;
  }

  private isRetryable(code: ErrorCode): boolean {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.RATE_LIMITED,
      ErrorCode.SERVICE_UNAVAILABLE,
    ].includes(code);
  }

  private calculateRetryDelay(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.RATE_LIMITED:
        return 60000; // 1 minute
      case ErrorCode.TIMEOUT:
      case ErrorCode.NETWORK_ERROR:
        return 5000; // 5 seconds
      default:
        return 1000; // 1 second
    }
  }

  private generateRequestId(): string {
    return `slack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

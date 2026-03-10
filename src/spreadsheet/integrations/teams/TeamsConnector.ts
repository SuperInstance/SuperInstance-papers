/**
 * POLLN Microsoft Teams Integration Connector
 *
 * Integrates POLLN cells with Microsoft Teams for messaging,
 * notifications, adaptive cards, and bot framework interactions.
 */

import { EventEmitter } from 'events';
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
// Teams-Specific Types
// ============================================================================

export interface TeamsConfig extends IntegrationConfig {
  type: IntegrationType.TEAMS;
  credentials: {
    appId: string;
    appPassword: string;
    tenantId?: string;
    webhookUrl?: string;
  };
  options?: {
    defaultChannel?: string;
    serviceUrl?: string;
  };
}

export interface TeamsMessage {
  type: 'message';
  id?: string;
  conversationId?: string;
  from?: { id: string; name: string };
  text?: string;
  attachments?: TeamsAttachment[];
  attachmentsLayout?: 'list' | 'grid' | 'carousel';
  summary?: string;
  channelData?: any;
}

export interface TeamsAttachment {
  contentType: string;
  contentUrl?: string;
  content?: any;
  name?: string;
  thumbnailUrl?: string;
}

export interface TeamsAdaptiveCard {
  type: 'AdaptiveCard';
  version: string;
  body: Array<{
    type: string;
    text?: string;
    items?: any[];
    columns?: any[];
    [key: string]: any;
  }>;
  actions?: Array<{
    type: string;
    title: string;
    url?: string;
    data?: any;
    [key: string]: any;
  }>;
  $schema?: string;
}

export interface TeamsChannel {
  id: string;
  name: string;
  tenantId?: string;
}

export interface TeamsActivity {
  type: string;
  id: string;
  timestamp: string;
  channelId: string;
  from: { id: string; name: string };
  conversation: { id: string };
  recipient?: { id: string; name: string };
  text?: string;
  attachments?: TeamsAttachment[];
  channelData?: any;
}

// ============================================================================
// Teams Bot Framework Client
// ============================================================================

class TeamsBotFrameworkClient {
  constructor(
    private appId: string,
    private appPassword: string,
    private serviceUrl: string = 'https://smba.trafficmanager.net/amer/'
  ) {}

  private getAccessToken(): string {
    // In production, implement proper OAuth flow
    return Buffer.from(`${this.appId}:${this.appPassword}`).toString('base64');
  }

  async sendActivity(conversationId: string, activity: Partial<TeamsActivity>): Promise<any> {
    const url = `${this.serviceUrl}v3/conversations/${conversationId}/activities`;
    const headers = {
      'Authorization': `Bearer ${this.getAccessToken()}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Teams API error: ${error}`);
    }

    return await response.json();
  }

  async replyToActivity(
    conversationId: string,
    activityId: string,
    activity: Partial<TeamsActivity>
  ): Promise<any> {
    const url = `${this.serviceUrl}v3/conversations/${conversationId}/activities/${activityId}`;
    const headers = {
      'Authorization': `Bearer ${this.getAccessToken()}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Teams API error: ${error}`);
    }

    return await response.json();
  }

  async getConversationMembers(conversationId: string): Promise<any[]> {
    const url = `${this.serviceUrl}v3/conversations/${conversationId}/members`;
    const headers = {
      'Authorization': `Bearer ${this.getAccessToken()}`,
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Teams API error: ${error}`);
    }

    return await response.json();
  }

  async getChannelInfo(
    tenantId: string,
    teamId: string,
    channelId: string
  ): Promise<TeamsChannel> {
    const url = `${this.serviceUrl}v3/teams/${teamId}/channels/${channelId}`;
    const headers = {
      'Authorization': `Bearer ${this.getAccessToken()}`,
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Teams API error: ${error}`);
    }

    return await response.json();
  }
}

// ============================================================================
// Teams Connector
// ============================================================================

export class TeamsConnector extends EventEmitter implements IntegrationConnector {
  readonly id: string;
  readonly name: string;
  readonly type = IntegrationType.TEAMS;
  state: ConnectionState = ConnectionState.DISCONNECTED;

  private config: TeamsConfig;
  private botClient: TeamsBotFrameworkClient;
  private metrics: IntegrationMetrics;
  private connectionTime: number = 0;

  // Rate limiting
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly rateLimitWindow = 60000; // 1 minute
  private readonly maxRequestsPerWindow = 200;

  constructor(config: TeamsConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.config = config;
    this.botClient = new TeamsBotFrameworkClient(
      config.credentials.appId,
      config.credentials.appPassword,
      config.options?.serviceUrl
    );
    this.metrics = this.createEmptyMetrics();
  }

  // ========================================================================
  // Connector Interface Implementation
  // ========================================================================

  async initialize(config: IntegrationConfig): Promise<void> {
    this.config = config as TeamsConfig;
    this.botClient = new TeamsBotFrameworkClient(
      this.config.credentials.appId,
      this.config.credentials.appPassword,
      this.config.options?.serviceUrl
    );
    this.state = ConnectionState.DISCONNECTED;
    this.emit('initialized', { timestamp: Date.now() });
  }

  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.state = ConnectionState.CONNECTING;

    try {
      // Test connection by attempting to get a conversation
      // In production, you'd make an actual API call
      await this.sleep(100);

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
        `Failed to connect to Teams: ${error.message}`,
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
        'Not connected to Teams'
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

        case 'reply':
        case 'replyToMessage':
          result = await this.replyToMessage(data);
          break;

        case 'card':
        case 'sendAdaptiveCard':
          result = await this.sendAdaptiveCard(data);
          break;

        case 'update':
        case 'updateMessage':
          result = await this.updateMessage(data);
          break;

        case 'delete':
        case 'deleteMessage':
          result = await this.deleteMessage(data);
          break;

        case 'channel':
        case 'getChannel':
          result = await this.getChannelInfo(data);
          break;

        case 'members':
        case 'getMembers':
          result = await this.getConversationMembers(data.conversationId);
          break;

        case 'typing':
        case 'sendTypingIndicator':
          result = await this.sendTypingIndicator(data.conversationId);
          break;

        case 'invoke':
        case 'handleInvoke':
          result = await this.handleInvoke(data);
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

      // Check authentication (simplified)
      details.authentication = !!this.config.credentials.appPassword;

      // Check rate limit status
      const now = Date.now();
      const inCurrentWindow =
        now - this.lastResetTime < this.rateLimitWindow;
      details.rateLimit =
        this.requestCount < this.maxRequestsPerWindow || !inCurrentWindow;

      return {
        status:
          details.connection && details.authentication ? 'healthy' : 'unhealthy',
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
  // Teams Operations
  // ========================================================================

  /**
   * Send a message to a conversation
   */
  async sendMessage(data: {
    conversationId: string;
    text?: string;
    attachments?: TeamsAttachment[];
    summary?: string;
  }): Promise<any> {
    const activity: Partial<TeamsActivity> = {
      type: 'message',
      text: data.text,
      attachments: data.attachments,
      summary: data.summary || data.text,
    };

    return await this.botClient.sendActivity(data.conversationId, activity);
  }

  /**
   * Reply to a specific message
   */
  async replyToMessage(data: {
    conversationId: string;
    activityId: string;
    text?: string;
    attachments?: TeamsAttachment[];
  }): Promise<any> {
    const activity: Partial<TeamsActivity> = {
      type: 'message',
      text: data.text,
      attachments: data.attachments,
    };

    return await this.botClient.replyToActivity(
      data.conversationId,
      data.activityId,
      activity
    );
  }

  /**
   * Send an adaptive card
   */
  async sendAdaptiveCard(data: {
    conversationId: string;
    card: TeamsAdaptiveCard;
    summary?: string;
  }): Promise<any> {
    const attachment: TeamsAttachment = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: data.card,
    };

    const activity: Partial<TeamsActivity> = {
      type: 'message',
      attachments: [attachment],
      summary: data.summary || 'Adaptive Card',
    };

    return await this.botClient.sendActivity(data.conversationId, activity);
  }

  /**
   * Update an existing message
   */
  async updateMessage(data: {
    conversationId: string;
    activityId: string;
    text?: string;
    attachments?: TeamsAttachment[];
  }): Promise<any> {
    const activity: Partial<TeamsActivity> = {
      type: 'message',
      id: data.activityId,
      text: data.text,
      attachments: data.attachments,
    };

    return await this.botClient.sendActivity(data.conversationId, activity);
  }

  /**
   * Delete a message
   */
  async deleteMessage(data: {
    conversationId: string;
    activityId: string;
  }): Promise<any> {
    // Implementation depends on Teams API
    return { ok: true, id: data.activityId };
  }

  /**
   * Get channel information
   */
  async getChannelInfo(data: {
    tenantId?: string;
    teamId?: string;
    channelId: string;
  }): Promise<TeamsChannel> {
    if (data.tenantId && data.teamId) {
      return await this.botClient.getChannelInfo(
        data.tenantId,
        data.teamId,
        data.channelId
      );
    }

    // Simplified implementation
    return {
      id: data.channelId,
      name: 'Channel',
    };
  }

  /**
   * Get conversation members
   */
  async getConversationMembers(conversationId: string): Promise<any[]> {
    return await this.botClient.getConversationMembers(conversationId);
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string): Promise<any> {
    const activity: Partial<TeamsActivity> = {
      type: 'typing',
    };

    return await this.botClient.sendActivity(conversationId, activity);
  }

  /**
   * Handle invoke activity (button clicks, etc.)
   */
  async handleInvoke(data: {
    conversationId: string;
    activityId: string;
    invokeData: any;
  }): Promise<any> {
    // Emit event for cell system to handle
    this.emit('invoke', {
      conversationId: data.conversationId,
      activityId: data.activityId,
      data: data.invokeData,
      timestamp: Date.now(),
    });

    return {
      status: 200,
      body: {
        response: 'Invoke received',
      },
    };
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset counters if new window
    if (now - this.lastResetTime >= this.rateLimitWindow) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    this.requestCount++;

    // Check if we've exceeded the limit
    if (this.requestCount > this.maxRequestsPerWindow) {
      const delay = this.rateLimitWindow - (now - this.lastResetTime);
      if (delay > 0) {
        this.metrics.rateLimitHits++;
        await this.sleep(delay);
      }
    }
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

    if (message.includes('token') || message.includes('auth') || message.includes('unauthorized')) {
      return ErrorCode.UNAUTHORIZED;
    }
    if (message.includes('rate') || message.includes('limit') || message.includes('throttle')) {
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
    return `teams_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

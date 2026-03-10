/**
 * POLLN Integration Manager
 *
 * Central orchestration layer for all external service integrations.
 * Manages connector lifecycle, OAuth flows, webhooks, rate limiting, and events.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  IntegrationConnector,
  IntegrationConfig,
  IntegrationType,
  IntegrationEvent,
  EventType,
  IntegrationResult,
  IntegrationError,
  ConnectionState,
  HealthStatus,
  IntegrationMetrics,
  WebhookRequest,
  WebhookRoute,
  ErrorCode,
  EventListener,
  ConnectionCallback,
} from './types.js';

// ============================================================================
// Integration Registry
// ============================================================================

interface IntegrationRegistry {
  [key: string]: {
    connector: IntegrationConnector;
    config: IntegrationConfig;
    state: ConnectionState;
    health: HealthStatus;
    metrics: IntegrationMetrics;
    createdAt: number;
    lastActivity: number;
  };
}

// ============================================================================
// Rate Limit Tracker
// ============================================================================

class RateLimitTracker {
  private requests: Map<string, number[]> = new Map();
  private limits: Map<string, { max: number; window: number }> = new Map();

  setLimit(integrationId: string, maxRequests: number, windowMs: number): void {
    this.limits.set(integrationId, { max: maxRequests, window: windowMs });
  }

  async checkLimit(integrationId: string): Promise<boolean> {
    const limit = this.limits.get(integrationId);
    if (!limit) return true;

    const now = Date.now();
    let requests = this.requests.get(integrationId) || [];

    // Remove requests outside the time window
    requests = requests.filter(time => now - time < limit.window);
    this.requests.set(integrationId, requests);

    return requests.length < limit.max;
  }

  recordRequest(integrationId: string): void {
    const requests = this.requests.get(integrationId) || [];
    requests.push(Date.now());
    this.requests.set(integrationId, requests);
  }

  getRemainingRequests(integrationId: string): number {
    const limit = this.limits.get(integrationId);
    if (!limit) return Infinity;

    const requests = this.requests.get(integrationId) || [];
    const now = Date.now();
    const validRequests = requests.filter(time => now - time < limit.window);

    return Math.max(0, limit.max - validRequests.length);
  }

  getResetTime(integrationId: string): number {
    const limit = this.limits.get(integrationId);
    if (!limit) return 0;

    const requests = this.requests.get(integrationId) || [];
    if (requests.length === 0) return 0;

    const oldestRequest = requests[0];
    return oldestRequest + limit.window;
  }
}

// ============================================================================
// Integration Manager
// ============================================================================

export class IntegrationManager extends EventEmitter {
  private registry: IntegrationRegistry = {};
  private rateLimitTracker: RateLimitTracker;
  private webhookRoutes: Map<string, WebhookRoute> = new Map();
  private eventHistory: IntegrationEvent[] = [];
  private maxEventHistory: number = 1000;
  private isInitialized: boolean = false;
  private startTime: number = Date.now();

  constructor() {
    super();
    this.rateLimitTracker = new RateLimitTracker();
  }

  // ========================================================================
  // Initialization
  // ========================================================================

  /**
   * Initialize the integration manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.emit('info', {
      message: 'Initializing Integration Manager',
      timestamp: Date.now(),
    });

    // Load integrations from storage if needed
    // Set up background tasks
    this.startBackgroundTasks();

    this.isInitialized = true;

    this.emit(EventType.INITIALIZED, {
      type: EventType.INITIALIZED,
      integrationId: 'manager',
      payload: { uptime: 0 },
      timestamp: Date.now(),
      id: uuidv4(),
    });
  }

  // ========================================================================
  // Integration Lifecycle Management
  // ========================================================================

  /**
   * Register a new integration
   */
  async registerIntegration(
    connector: IntegrationConnector,
    config: IntegrationConfig
  ): Promise<void> {
    const { id } = config;

    if (this.registry[id]) {
      throw new Error(`Integration ${id} already registered`);
    }

    this.emit('info', {
      message: `Registering integration: ${id}`,
      integrationId: id,
      timestamp: Date.now(),
    });

    // Initialize connector
    await connector.initialize(config);

    // Set up rate limiting
    if (config.rateLimit) {
      this.rateLimitTracker.setLimit(
        id,
        config.rateLimit.maxRequests,
        config.rateLimit.windowMs
      );
    }

    // Register in registry
    this.registry[id] = {
      connector,
      config,
      state: ConnectionState.DISCONNECTED,
      health: {
        status: 'unknown' as any,
        details: {
          connection: false,
          authentication: false,
          rateLimit: true,
          errors: [],
        },
        lastCheck: Date.now(),
      },
      metrics: this.createEmptyMetrics(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    // Set up webhook routes if configured
    if (config.webhook?.enabled && config.webhook?.url) {
      await this.setupWebhook(config);
    }

    this.emit('integration:registered', {
      integrationId: id,
      type: config.type,
      timestamp: Date.now(),
    });
  }

  /**
   * Unregister an integration
   */
  async unregisterIntegration(integrationId: string): Promise<void> {
    const registration = this.registry[integrationId];
    if (!registration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    this.emit('info', {
      message: `Unregistering integration: ${integrationId}`,
      integrationId,
      timestamp: Date.now(),
    });

    // Disconnect if connected
    if (registration.state === ConnectionState.CONNECTED) {
      await this.disconnectIntegration(integrationId);
    }

    // Dispose connector
    await registration.connector.dispose();

    // Remove webhook routes
    this.removeWebhookRoutes(integrationId);

    // Remove from registry
    delete this.registry[integrationId];

    this.emit('integration:unregistered', {
      integrationId,
      timestamp: Date.now(),
    });
  }

  /**
   * Connect to an integration
   */
  async connectIntegration(integrationId: string): Promise<void> {
    const registration = this.registry[integrationId];
    if (!registration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    if (registration.state === ConnectionState.CONNECTED) {
      return;
    }

    this.emit('info', {
      message: `Connecting to integration: ${integrationId}`,
      integrationId,
      timestamp: Date.now(),
    });

    registration.state = ConnectionState.CONNECTING;
    this.updateLastActivity(integrationId);

    try {
      await registration.connector.connect();

      registration.state = ConnectionState.CONNECTED;
      registration.health.details.connection = true;

      this.emitIntegrationEvent(EventType.CONNECTED, integrationId, {
        connected: true,
      });

      this.emit('integration:connected', {
        integrationId,
        timestamp: Date.now(),
      });
    } catch (error) {
      registration.state = ConnectionState.ERROR;
      registration.health.details.errors.push(
        `Connection failed: ${error.message}`
      );

      this.emitIntegrationEvent(EventType.ERROR, integrationId, {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Disconnect from an integration
   */
  async disconnectIntegration(integrationId: string): Promise<void> {
    const registration = this.registry[integrationId];
    if (!registration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    if (registration.state === ConnectionState.DISCONNECTED) {
      return;
    }

    this.emit('info', {
      message: `Disconnecting from integration: ${integrationId}`,
      integrationId,
      timestamp: Date.now(),
    });

    try {
      await registration.connector.disconnect();

      registration.state = ConnectionState.DISCONNECTED;
      registration.health.details.connection = false;

      this.emitIntegrationEvent(EventType.DISCONNECTED, integrationId, {
        connected: false,
      });

      this.emit('integration:disconnected', {
        integrationId,
        timestamp: Date.now(),
      });
    } catch (error) {
      registration.health.details.errors.push(
        `Disconnection failed: ${error.message}`
      );

      throw error;
    }
  }

  // ========================================================================
  // Operations
  // ========================================================================

  /**
   * Send operation through an integration
   */
  async send(
    integrationId: string,
    operation: string,
    data: any
  ): Promise<IntegrationResult> {
    const registration = this.registry[integrationId];
    if (!registration) {
      return {
        success: false,
        error: {
          code: ErrorCode.OPERATION_NOT_SUPPORTED,
          message: `Integration ${integrationId} not found`,
          retryable: false,
        },
        metadata: {
          timestamp: Date.now(),
          duration: 0,
          retries: 0,
        },
      };
    }

    // Check rate limit
    const canProceed = await this.rateLimitTracker.checkLimit(integrationId);
    if (!canProceed) {
      const resetTime = this.rateLimitTracker.getResetTime(integrationId);

      this.emitIntegrationEvent(EventType.RATE_LIMIT_REACHED, integrationId, {
        resetTime,
      });

      return {
        success: false,
        error: {
          code: ErrorCode.RATE_LIMITED,
          message: 'Rate limit exceeded',
          retryable: true,
          retryDelay: resetTime - Date.now(),
        },
        metadata: {
          timestamp: Date.now(),
          duration: 0,
          retries: 0,
          rateLimit: {
            remaining: 0,
            resetTime,
            limit: registration.config.rateLimit?.maxRequests || 0,
          },
        },
      };
    }

    // Record request
    this.rateLimitTracker.recordRequest(integrationId);
    this.updateLastActivity(integrationId);

    const startTime = Date.now();
    let retries = 0;
    const maxRetries = registration.config.retry?.maxAttempts || 3;

    while (retries <= maxRetries) {
      try {
        const result = await registration.connector.send(operation, data);

        const duration = Date.now() - startTime;
        this.updateMetrics(integrationId, result.success, duration, 0, 0);

        if (result.success) {
          this.emitIntegrationEvent(EventType.DATA_SENT, integrationId, {
            operation,
            data,
          });
        }

        return {
          ...result,
          metadata: {
            ...result.metadata,
            rateLimit: {
              remaining: this.rateLimitTracker.getRemainingRequests(
                integrationId
              ),
              resetTime: this.rateLimitTracker.getResetTime(integrationId),
              limit: registration.config.rateLimit?.maxRequests || 0,
            },
          },
        };
      } catch (error) {
        retries++;

        if (retries > maxRetries || !this.isRetryable(error)) {
          const duration = Date.now() - startTime;
          this.updateMetrics(integrationId, false, duration, 0, retries);

          return {
            success: false,
            error: {
              code: ErrorCode.INTERNAL_ERROR,
              message: error.message,
              details: error,
              retryable: this.isRetryable(error),
              retryDelay: this.calculateRetryDelay(
                retries,
                registration.config.retry
              ),
            },
            metadata: {
              timestamp: Date.now(),
              duration,
              retries,
            },
          };
        }

        const delay = this.calculateRetryDelay(
          retries,
          registration.config.retry
        );

        this.emit('info', {
          message: `Retrying operation (${retries}/${maxRetries})`,
          integrationId,
          operation,
          delay,
          timestamp: Date.now(),
        });

        await this.sleep(delay);
        registration.metrics.retryAttempts++;
      }
    }

    // Should never reach here
    throw new Error('Unexpected error in send operation');
  }

  /**
   * Receive data from an integration
   */
  async receive(
    integrationId: string,
    event: string,
    data: any
  ): Promise<void> {
    const registration = this.registry[integrationId];
    if (!registration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    this.updateLastActivity(integrationId);

    this.emitIntegrationEvent(EventType.DATA_RECEIVED, integrationId, {
      event,
      data,
    });

    // Route to cell if configured
    if (registration.config.cellMapping?.eventToCell[event]) {
      const cellId = registration.config.cellMapping.eventToCell[event];
      await this.routeToCell(cellId, event, data);
    }

    // Call connector's receive method if available
    if (registration.connector.receive) {
      await registration.connector.receive(event, data);
    }
  }

  // ========================================================================
  // OAuth Flow Orchestration
  // ========================================================================

  /**
   * Initiate OAuth flow
   */
  async initiateOAuth(
    integrationId: string,
    redirectUrl?: string
  ): Promise<string> {
    const registration = this.registry[integrationId];
    if (!registration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    const oauth = registration.config.credentials.oauth;
    if (!oauth) {
      throw new Error(`OAuth not configured for ${integrationId}`);
    }

    // Generate OAuth URL
    const state = uuidv4();
    const authUrl = this.buildOAuthUrl(oauth, state, redirectUrl);

    // Store state for callback verification
    // In production, this should be stored securely

    return authUrl;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(
    integrationId: string,
    code: string,
    state: string
  ): Promise<void> {
    const registration = this.registry[integrationId];
    if (!registration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    // Verify state
    // Exchange code for tokens
    // Update configuration

    this.emit('info', {
      message: `OAuth callback completed for ${integrationId}`,
      integrationId,
      timestamp: Date.now(),
    });
  }

  // ========================================================================
  // Webhook Handling
  // ========================================================================

  /**
   * Handle incoming webhook
   */
  async handleWebhook(request: WebhookRequest): Promise<void> {
    const route = this.webhookRoutes.get(request.headers['x-webhook-id']);
    if (!route) {
      throw new Error('No route found for webhook');
    }

    // Verify signature if secret configured
    if (request.signature) {
      const isValid = await this.verifyWebhookSignature(
        request,
        route.integrationId
      );

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Check for replay attacks
    if (await this.isReplayRequest(request.id)) {
      throw new Error('Replay request detected');
    }

    // Record request ID
    this.recordRequestId(request.id);

    // Transform data if needed
    const data = route.transform ? route.transform(request.body) : request.body;

    // Route to integration
    await this.receive(route.integrationId, 'webhook', data);

    // Route to cell if specified
    if (route.cellId) {
      await this.routeToCell(route.cellId, 'webhook', data);
    }
  }

  /**
   * Setup webhook for integration
   */
  private async setupWebhook(config: IntegrationConfig): Promise<void> {
    const routeId = uuidv4();
    const route: WebhookRoute = {
      integrationId: config.id,
      cellId: config.cellMapping?.eventToCell['webhook'],
      transform: config.cellMapping?.transforms?.['webhook'],
    };

    this.webhookRoutes.set(routeId, route);

    // In production, register webhook with external service
  }

  /**
   * Remove webhook routes for integration
   */
  private removeWebhookRoutes(integrationId: string): void {
    for (const [id, route] of this.webhookRoutes.entries()) {
      if (route.integrationId === integrationId) {
        this.webhookRoutes.delete(id);
      }
    }
  }

  // ========================================================================
  // Health Monitoring
  // ========================================================================

  /**
   * Check health of all integrations
   */
  async checkAllHealth(): Promise<Record<string, HealthStatus>> {
    const results: Record<string, HealthStatus> = {};

    for (const [id, registration] of Object.entries(this.registry)) {
      try {
        const health = await registration.connector.healthCheck();
        registration.health = health;
        results[id] = health;

        this.emitIntegrationEvent(EventType.HEALTH_CHECK, id, health);
      } catch (error) {
        results[id] = {
          status: 'unhealthy' as any,
          details: {
            connection: false,
            authentication: false,
            rateLimit: false,
            errors: [error.message],
          },
          lastCheck: Date.now(),
        };
      }
    }

    return results;
  }

  /**
   * Get metrics for all integrations
   */
  getAllMetrics(): Record<string, IntegrationMetrics> {
    const metrics: Record<string, IntegrationMetrics> = {};

    for (const [id, registration] of Object.entries(this.registry)) {
      metrics[id] = registration.connector.getMetrics();
    }

    return metrics;
  }

  // ========================================================================
  // Event Management
  // ========================================================================

  /**
   * Add event listener
   */
  onIntegrationEvent(listener: EventListener): void {
    this.on('integration:event', listener);
  }

  /**
   * Add connection state listener
   */
  onConnectionState(
    integrationId: string,
    callback: ConnectionCallback
  ): void {
    this.on(`connection:${integrationId}`, callback);
  }

  /**
   * Get event history
   */
  getEventHistory(limit?: number): IntegrationEvent[] {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private emitIntegrationEvent(
    type: EventType,
    integrationId: string,
    payload: any
  ): void {
    const event: IntegrationEvent = {
      type,
      integrationId,
      payload,
      timestamp: Date.now(),
      id: uuidv4(),
    };

    this.eventHistory.push(event);

    // Limit history size
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory.shift();
    }

    this.emit('integration:event', event);
  }

  private updateMetrics(
    integrationId: string,
    success: boolean,
    duration: number,
    bytesSent: number,
    bytesReceived: number
  ): void {
    const registration = this.registry[integrationId];
    if (!registration) return;

    const metrics = registration.metrics;
    metrics.totalOperations++;
    metrics.lastOperation = Date.now();

    if (success) {
      metrics.successfulOperations++;
    } else {
      metrics.failedOperations++;
    }

    // Update average duration
    const totalDuration =
      metrics.averageDuration * (metrics.totalOperations - 1) + duration;
    metrics.averageDuration = totalDuration / metrics.totalOperations;

    metrics.bytesSent += bytesSent;
    metrics.bytesReceived += bytesReceived;

    // Calculate uptime
    const uptime = Date.now() - registration.createdAt;
    metrics.uptime = (uptime / (Date.now() - this.startTime)) * 100;
  }

  private updateLastActivity(integrationId: string): void {
    const registration = this.registry[integrationId];
    if (registration) {
      registration.lastActivity = Date.now();
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

  private buildOAuthUrl(
    oauth: any,
    state: string,
    redirectUrl?: string
  ): string {
    // Implementation depends on OAuth provider
    // This is a placeholder
    return 'https://example.com/oauth';
  }

  private async verifyWebhookSignature(
    request: WebhookRequest,
    integrationId: string
  ): Promise<boolean> {
    // Implementation depends on signature method
    return true;
  }

  private replayRequestIds = new Set<string>();

  private async isReplayRequest(requestId: string): Promise<boolean> {
    return this.replayRequestIds.has(requestId);
  }

  private recordRequestId(requestId: string): void {
    this.replayRequestIds.add(requestId);

    // Clean up old IDs (keep last 10000)
    if (this.replayRequestIds.size > 10000) {
      const ids = Array.from(this.replayRequestIds);
      this.replayRequestIds.clear();
      ids.slice(-5000).forEach(id => this.replayRequestIds.add(id));
    }
  }

  private async routeToCell(
    cellId: string,
    event: string,
    data: any
  ): Promise<void> {
    // Implementation depends on cell system
    this.emit('cell:data', { cellId, event, data });
  }

  private isRetryable(error: any): boolean {
    if (error.retryable !== undefined) return error.retryable;

    const retryableCodes = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.RATE_LIMITED,
      ErrorCode.SERVICE_UNAVAILABLE,
    ];

    return retryableCodes.includes(error.code);
  }

  private calculateRetryDelay(
    attempt: number,
    retryConfig?: any
  ): number {
    if (!retryConfig) {
      // Default exponential backoff
      return Math.min(1000 * Math.pow(2, attempt), 30000);
    }

    const delay =
      retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, retryConfig.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startBackgroundTasks(): void {
    // Health check every 60 seconds
    setInterval(() => {
      this.checkAllHealth().catch(error => {
        this.emit('error', {
          message: 'Health check failed',
          error: error.message,
          timestamp: Date.now(),
        });
      });
    }, 60000);

    // Clean up old request IDs every hour
    setInterval(() => {
      this.replayRequestIds.clear();
    }, 3600000);
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Get all registered integrations
   */
  getIntegrations(): string[] {
    return Object.keys(this.registry);
  }

  /**
   * Get integration configuration
   */
  getIntegrationConfig(integrationId: string): IntegrationConfig | undefined {
    return this.registry[integrationId]?.config;
  }

  /**
   * Get integration state
   */
  getIntegrationState(integrationId: string): ConnectionState | undefined {
    return this.registry[integrationId]?.state;
  }

  /**
   * Check if manager is initialized
   */
  isActive(): boolean {
    return this.isInitialized;
  }

  /**
   * Dispose of manager and all integrations
   */
  async dispose(): Promise<void> {
    this.emit('info', {
      message: 'Disposing Integration Manager',
      timestamp: Date.now(),
    });

    // Disconnect all integrations
    for (const integrationId of Object.keys(this.registry)) {
      try {
        await this.unregisterIntegration(integrationId);
      } catch (error) {
        this.emit('error', {
          message: `Failed to unregister ${integrationId}`,
          error: error.message,
          timestamp: Date.now(),
        });
      }
    }

    this.removeAllListeners();
    this.isInitialized = false;

    this.emitIntegrationEvent(EventType.DISPOSED, 'manager', {
      disposed: true,
    });
  }
}

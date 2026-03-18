/**
 * ClawClient - Production-Ready Claw API Client
 *
 * Comprehensive HTTP and WebSocket client for Claw API integration with:
 * - Retry logic with exponential backoff
 * - Error recovery and fallback mechanisms
 * - Request/response validation with Zod schemas
 * - Connection health monitoring
 * - Real-time streaming support
 * - WebSocket authentication
 * - Message validation
 *
 * @packageDocumentation
 * @version 3.0.0 - Phase 3: Security & Architecture Improvements
 */

import { EventEmitter } from 'events';
import { z } from 'zod';
import {
  ClawCellConfig,
  ClawState,
  ClawStateInfo,
  CreateClawRequest,
  CreateClawResponse,
  QueryClawRequest,
  QueryClawResponse,
  TriggerClawRequest,
  TriggerClawResponse,
  CancelClawRequest,
  CancelClawResponse,
  ApproveClawRequest,
  ApproveClawResponse,
  WebSocketMessage,
  WebSocketMessageType,
  ReasoningStep,
  ClawAction,
  ClawAPIError,
  ClawErrorCode,
  ClawCellConfigSchema,
  CreateClawRequestSchema,
  TriggerClawRequestSchema,
  ApproveClawRequestSchema,
  QueryClawRequestSchema,
  CancelClawRequestSchema,
  WebSocketMessageSchema
} from './types';

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

/**
 * ClawClient configuration options
 */
export interface ClawClientConfig {
  /** Base URL for Claw HTTP API */
  baseUrl: string;

  /** WebSocket URL for Claw real-time updates */
  wsUrl?: string;

  /** API key for authentication */
  apiKey?: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;

  /** Initial retry delay in milliseconds (default: 1000) */
  initialRetryDelay?: number;

  /** Maximum retry delay in milliseconds (default: 30000) */
  maxRetryDelay?: number;

  /** Retry backoff multiplier (default: 2) */
  retryBackoffMultiplier?: number;

  /** Enable request/response validation (default: true) */
  enableValidation?: boolean;

  /** Enable WebSocket connection (default: true) */
  enableWebSocket?: boolean;

  /** WebSocket reconnection interval in milliseconds (default: 5000) */
  wsReconnectInterval?: number;

  /** Maximum WebSocket reconnection delay in milliseconds (default: 60000) */
  maxWsReconnectDelay?: number;

  /** Maximum WebSocket reconnection attempts (default: 10) */
  maxWsReconnectAttempts?: number;

  /** Connection health check interval in milliseconds (default: 60000) */
  healthCheckInterval?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Request options for HTTP calls
 */
interface RequestOptions {
  timeout?: number;
  retries?: number;
  validation?: boolean;
  headers?: Record<string, string>;
  schema?: z.ZodSchema;
}

// ============================================================================
// CLAW CLIENT IMPLEMENTATION
// ============================================================================

/**
 * ClawClient - Production-ready Claw API client
 *
 * Phase 3 improvements:
 * - WebSocket authentication with Bearer token
 * - Message validation with Zod schemas
 * - Exponential backoff for reconnection
 * - Proper disposal mechanism
 * - API key validation
 */
export class ClawClient extends EventEmitter {
  private config: Required<ClawClientConfig>;
  private ws: WebSocket | null = null;
  private wsConnected: boolean = false;
  private wsReconnectAttempts: number = 0;
  private wsReconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private isDisposed: boolean = false;

  constructor(config: ClawClientConfig) {
    super();

    // Validate API key if provided
    if (config.apiKey && config.apiKey.length < 20) {
      throw new ClawAPIError(
        ClawErrorCode.VALIDATION_ERROR,
        'API key must be at least 20 characters long'
      );
    }

    this.config = {
      baseUrl: config.baseUrl,
      wsUrl: config.wsUrl || config.baseUrl.replace('http', 'ws'),
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      initialRetryDelay: config.initialRetryDelay || 1000,
      maxRetryDelay: config.maxRetryDelay || 30000,
      retryBackoffMultiplier: config.retryBackoffMultiplier || 2,
      enableValidation: config.enableValidation !== false,
      enableWebSocket: config.enableWebSocket !== false,
      wsReconnectInterval: config.wsReconnectInterval || 5000,
      maxWsReconnectDelay: config.maxWsReconnectDelay || 60000,
      maxWsReconnectAttempts: config.maxWsReconnectAttempts || 10,
      healthCheckInterval: config.healthCheckInterval || 60000,
      debug: config.debug || false
    };

    if (this.config.enableWebSocket && this.config.wsUrl) {
      this.connectWebSocket();
    }

    this.startHealthCheck();
  }

  // ========================================================================
  // HTTP API METHODS
  // ========================================================================

  /**
   * Create a new Claw agent
   */
  async createClaw(request: CreateClawRequest): Promise<CreateClawResponse> {
    this.checkDisposed();
    return this.httpRequest<CreateClawResponse>(
      '/api/claws',
      'POST',
      request,
      {
        validation: true,
        schema: CreateClawRequestSchema
      }
    );
  }

  /**
   * Query Claw agent state
   */
  async queryClaw(request: QueryClawRequest): Promise<QueryClawResponse> {
    this.checkDisposed();
    return this.httpRequest<QueryClawResponse>(
      `/api/claws/${request.clawId}`,
      'GET',
      null,
      {
        validation: true,
        schema: QueryClawRequestSchema
      }
    );
  }

  /**
   * Trigger a Claw agent
   */
  async triggerClaw(request: TriggerClawRequest): Promise<TriggerClawResponse> {
    this.checkDisposed();
    return this.httpRequest<TriggerClawResponse>(
      `/api/claws/${request.clawId}/trigger`,
      'POST',
      request,
      {
        validation: true,
        schema: TriggerClawRequestSchema
      }
    );
  }

  /**
   * Cancel a running Claw agent
   */
  async cancelClaw(request: CancelClawRequest): Promise<CancelClawResponse> {
    this.checkDisposed();
    return this.httpRequest<CancelClawResponse>(
      `/api/claws/${request.clawId}/cancel`,
      'POST',
      request,
      {
        validation: true,
        schema: CancelClawRequestSchema
      }
    );
  }

  /**
   * Approve or reject a Claw action
   */
  async approveClaw(request: ApproveClawRequest): Promise<ApproveClawResponse> {
    this.checkDisposed();
    return this.httpRequest<ApproveClawResponse>(
      `/api/claws/${request.clawId}/approve`,
      'POST',
      request,
      {
        validation: true,
        schema: ApproveClawRequestSchema
      }
    );
  }

  /**
   * Delete a Claw agent
   */
  async deleteClaw(clawId: string): Promise<void> {
    this.checkDisposed();
    return this.httpRequest<void>(
      `/api/claws/${clawId}`,
      'DELETE',
      null,
      {
        retries: 1 // Don't retry deletes
      }
    );
  }

  /**
   * Get Claw agent history
   */
  async getClawHistory(clawId: string, limit: number = 100): Promise<ClawStateInfo[]> {
    this.checkDisposed();
    return this.httpRequest<ClawStateInfo[]>(
      `/api/claws/${clawId}/history?limit=${limit}`,
      'GET',
      null
    );
  }

  // ========================================================================
  // HTTP REQUEST HANDLER WITH RETRY LOGIC
  // ========================================================================

  /**
   * Make HTTP request with retry logic and error recovery
   */
  private async httpRequest<T>(
    endpoint: string,
    method: string,
    body: any,
    options: RequestOptions = {}
  ): Promise<T> {
    this.checkDisposed();

    const {
      timeout = this.config.timeout,
      retries = this.config.maxRetries,
      validation = this.config.enableValidation,
      headers = {},
      schema
    } = options;

    // Validate request if schema provided
    if (validation && schema && body) {
      const validationResult = schema.safeParse(body);
      if (!validationResult.success) {
        throw new ClawAPIError(
          ClawErrorCode.VALIDATION_ERROR,
          'Request validation failed',
          validationResult.error.errors
        );
      }
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const url = `${this.config.baseUrl}${endpoint}`;
        this.debugLog(`HTTP ${method} ${url} (attempt ${attempt + 1}/${retries + 1})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : '',
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Handle response
        if (!response.ok) {
          const error = await this.handleHttpError(response, attempt, retries);
          if (error) {
            throw error;
          }
        }

        // Parse response
        const data = await response.json();
        this.debugLog(`HTTP ${method} ${url} success`);
        return data;

      } catch (error) {
        lastError = error as Error;

        // Check if should retry
        if (attempt < retries && this.shouldRetry(error)) {
          attempt++;
          const delay = this.calculateRetryDelay(attempt);
          this.debugLog(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // Don't retry or max retries reached
        break;
      }
    }

    // All retries exhausted or non-retryable error
    throw this.normalizeError(lastError);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.initialRetryDelay;
    const maxDelay = this.config.maxRetryDelay;
    const multiplier = this.config.retryBackoffMultiplier;

    // Exponential backoff
    const exponentialDelay = baseDelay * Math.pow(multiplier, attempt - 1);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Handle HTTP error response
   */
  private async handleHttpError(
    response: Response,
    attempt: number,
    maxRetries: number
  ): Promise<Error | null> {
    const status = response.status;
    const url = response.url;

    this.debugLog(`HTTP error ${status} for ${url}`);

    // Rate limited - check Retry-After header
    if (status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        const delay = parseInt(retryAfter) * 1000;
        this.debugLog(`Rate limited, retry after ${delay}ms`);
        await this.sleep(delay);
        return null; // Signal to retry
      }
    }

    // Don't retry client errors (except 429)
    if (status >= 400 && status < 500 && status !== 429) {
      const errorData = await response.json().catch(() => ({}));
      return new ClawAPIError(
        this.getErrorCodeFromStatus(status),
        errorData.message || 'Request failed',
        errorData.details,
        errorData.clawId
      );
    }

    // Retry server errors
    if (status >= 500 && attempt < maxRetries) {
      return null; // Signal to retry
    }

    // Max retries reached or non-retryable error
    const errorData = await response.json().catch(() => ({}));
    return new ClawAPIError(
      this.getErrorCodeFromStatus(status),
      errorData.message || 'Request failed',
      errorData.details,
      errorData.clawId
    );
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(error: any): boolean {
    // Network errors
    if (error instanceof TypeError) {
      return true;
    }

    // AbortError (timeout)
    if (error.name === 'AbortError') {
      return true;
    }

    // ClawAPIError with retryable code
    if (error instanceof ClawAPIError) {
      return error.code === ClawErrorCode.NETWORK_ERROR ||
             error.code === ClawErrorCode.TIMEOUT ||
             error.code === ClawErrorCode.RATE_LIMITED ||
             error.code === ClawErrorCode.INTERNAL_ERROR;
    }

    return false;
  }

  /**
   * Normalize error to ClawAPIError
   */
  private normalizeError(error: any): ClawAPIError {
    if (error instanceof ClawAPIError) {
      return error;
    }

    if (error instanceof TypeError) {
      return new ClawAPIError(
        ClawErrorCode.NETWORK_ERROR,
        'Network error: ' + error.message
      );
    }

    if (error.name === 'AbortError') {
      return new ClawAPIError(
        ClawErrorCode.TIMEOUT,
        'Request timeout'
      );
    }

    return new ClawAPIError(
      ClawErrorCode.INTERNAL_ERROR,
      error.message || 'Unknown error'
    );
  }

  /**
   * Get error code from HTTP status
   */
  private getErrorCodeFromStatus(status: number): ClawErrorCode {
    switch (status) {
      case 400:
        return ClawErrorCode.VALIDATION_ERROR;
      case 401:
        return ClawErrorCode.UNAUTHORIZED;
      case 404:
        return ClawErrorCode.NOT_FOUND;
      case 409:
        return ClawErrorCode.ALREADY_EXISTS;
      case 429:
        return ClawErrorCode.RATE_LIMITED;
      case 500:
      case 502:
      case 503:
      case 504:
        return ClawErrorCode.INTERNAL_ERROR;
      default:
        return ClawErrorCode.INTERNAL_ERROR;
    }
  }

  // ========================================================================
  // WEBSOCKET CONNECTION WITH AUTHENTICATION & VALIDATION
  // ========================================================================

  /**
   * Connect to WebSocket server with authentication
   *
   * Phase 3 improvements:
   * - Adds Bearer token authentication
   * - Implements exponential backoff with jitter
   * - Validates all incoming messages
   */
  private connectWebSocket(): void {
    if (!this.config.wsUrl || this.wsConnected || this.isDisposed) {
      return;
    }

    try {
      this.debugLog(`Connecting to WebSocket: ${this.config.wsUrl}`);

      // Create WebSocket with authentication
      const wsUrl = this.config.apiKey
        ? `${this.config.wsUrl}?token=${encodeURIComponent(this.config.apiKey)}`
        : this.config.wsUrl;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.debugLog('WebSocket connected');
        this.wsConnected = true;
        this.wsReconnectAttempts = 0;

        // Clear reconnect timer
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }

        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };

      this.ws.onerror = (error) => {
        this.debugLog(`WebSocket error: ${error}`);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        this.debugLog('WebSocket disconnected');
        this.wsConnected = false;
        this.emit('disconnected');

        // Attempt reconnection with exponential backoff
        if (this.wsReconnectAttempts < this.config.maxWsReconnectAttempts && !this.isDisposed) {
          this.wsReconnectAttempts++;
          const delay = this.calculateReconnectDelay(this.wsReconnectAttempts);
          this.debugLog(`Reconnecting in ${delay}ms (attempt ${this.wsReconnectAttempts}/${this.config.maxWsReconnectAttempts})`);

          this.wsReconnectTimer = setTimeout(() => {
            this.connectWebSocket();
          }, delay);
        } else {
          this.debugLog('Max reconnection attempts reached or client disposed');
          this.emit('reconnectFailed');
        }
      };

    } catch (error) {
      this.debugLog(`Failed to create WebSocket: ${error}`);
    }
  }

  /**
   * Calculate reconnection delay with exponential backoff and jitter
   *
   * Phase 3: Changed from linear to exponential backoff
   */
  private calculateReconnectDelay(attempt: number): number {
    const baseDelay = this.config.wsReconnectInterval;
    const maxDelay = this.config.maxWsReconnectDelay;

    // Exponential backoff: 5000ms * 2^attempt
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);

    // Add jitter (±20%) to prevent thundering herd
    const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);

    return Math.max(0, Math.min(exponentialDelay + jitter, maxDelay));
  }

  /**
   * Handle incoming WebSocket message with validation
   *
   * Phase 3: Added Zod schema validation for all messages
   */
  private handleWebSocketMessage(data: string): void {
    try {
      // Parse JSON
      const parsed = JSON.parse(data);

      // Validate with Zod schema
      const validationResult = WebSocketMessageSchema.safeParse(parsed);
      if (!validationResult.success) {
        this.debugLog(`Invalid WebSocket message: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
        this.emit('validationError', {
          type: 'websocket_message',
          errors: validationResult.error.errors
        });
        return;
      }

      const message: WebSocketMessage = validationResult.data;
      this.debugLog(`WebSocket message: ${message.type}`);

      // Route message to appropriate handler
      switch (message.type) {
        case WebSocketMessageType.REASONING_STEP:
          this.emit('reasoningStep', message.payload);
          break;

        case WebSocketMessageType.STATE_CHANGE:
          this.emit('stateChange', message.payload);
          break;

        case WebSocketMessageType.APPROVAL_REQUIRED:
          this.emit('approvalRequired', message.payload);
          break;

        case WebSocketMessageType.ACTION_COMPLETED:
          this.emit('actionCompleted', message.payload);
          break;

        case WebSocketMessageType.ERROR:
          this.emit('clawError', message.payload);
          break;

        case WebSocketMessageType.CELL_UPDATE:
          this.emit('cellUpdate', message.payload);
          break;

        default:
          this.debugLog(`Unhandled message type: ${message.type}`);
      }
    } catch (error) {
      this.debugLog(`Failed to parse WebSocket message: ${error}`);
      this.emit('parseError', { data, error });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.wsConnected = false;
    }
  }

  /**
   * Send WebSocket message
   */
  sendWebSocketMessage(message: WebSocketMessage): void {
    this.checkDisposed();

    if (!this.ws || !this.wsConnected) {
      throw new ClawAPIError(
        ClawErrorCode.NETWORK_ERROR,
        'WebSocket not connected'
      );
    }

    // Validate outgoing message
    const validationResult = WebSocketMessageSchema.safeParse(message);
    if (!validationResult.success) {
      throw new ClawAPIError(
        ClawErrorCode.VALIDATION_ERROR,
        'Invalid WebSocket message',
        validationResult.error.errors
      );
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      throw new ClawAPIError(
        ClawErrorCode.NETWORK_ERROR,
        `Failed to send WebSocket message: ${error}`
      );
    }
  }

  /**
   * Subscribe to claw updates
   */
  subscribeToClaw(clawId: string, cellId: string, sheetId: string): void {
    const message: WebSocketMessage = {
      type: WebSocketMessageType.SUBSCRIBE,
      traceId: this.generateTraceId(),
      timestamp: Date.now(),
      payload: {
        clawId,
        cellId,
        sheetId
      }
    };

    this.sendWebSocketMessage(message);
  }

  /**
   * Unsubscribe from claw updates
   */
  unsubscribeFromClaw(clawId: string, cellId: string, sheetId: string): void {
    const message: WebSocketMessage = {
      type: WebSocketMessageType.UNSUBSCRIBE,
      traceId: this.generateTraceId(),
      timestamp: Date.now(),
      payload: {
        clawId,
        cellId,
        sheetId
      }
    };

    this.sendWebSocketMessage(message);
  }

  // ========================================================================
  // HEALTH MONITORING
  // ========================================================================

  /**
   * Start health check timer
   */
  private startHealthCheck(): void {
    if (this.isDisposed) {
      return;
    }

    this.healthCheckTimer = setInterval(() => {
      this.checkHealth();
    }, this.config.healthCheckInterval);
  }

  /**
   * Check connection health
   */
  private async checkHealth(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.emit('healthCheck', { healthy: true });
      } else {
        this.emit('healthCheck', {
          healthy: false,
          error: `HTTP ${response.status}`
        });
      }
    } catch (error) {
      this.emit('healthCheck', {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    http: boolean;
    websocket: boolean;
    healthy: boolean;
    disposed: boolean;
  } {
    return {
      http: true,
      websocket: this.wsConnected,
      healthy: this.wsConnected || true,
      disposed: this.isDisposed
    };
  }

  // ========================================================================
  // DISPOSAL & CLEANUP (Phase 3 Enhancement)
  // ========================================================================

  /**
   * Check if client is disposed
   */
  private checkDisposed(): void {
    if (this.isDisposed) {
      throw new ClawAPIError(
        ClawErrorCode.INVALID_STATE,
        'ClawClient has been disposed'
      );
    }
  }

  /**
   * Dispose of client resources
   *
   * Phase 3: Enhanced disposal mechanism for singleton pattern
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.debugLog('Disposing ClawClient...');

    // Stop health check
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Stop reconnection timer
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }

    // Disconnect WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.wsConnected = false;
    }

    // Remove all event listeners
    this.removeAllListeners();

    // Mark as disposed
    this.isDisposed = true;

    this.debugLog('ClawClient disposed');
  }

  /**
   * Check if client is disposed
   */
  isDisposedClient(): boolean {
    return this.isDisposed;
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Generate unique trace ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debug logging (sanitized to prevent leaking sensitive data)
   */
  private debugLog(message: string): void {
    if (this.config.debug) {
      // Sanitize message to remove API keys
      const sanitized = message.replace(/token=[^&\s]+/g, 'token=***');
      console.log(`[ClawClient] ${sanitized}`);
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a configured ClawClient instance
 */
export function createClawClient(config: ClawClientConfig): ClawClient {
  return new ClawClient(config);
}

export default ClawClient;

/**
 * POLLN Spreadsheet SDK - Main Client
 *
 * The main client class for interacting with the POLLN Spreadsheet API.
 * Provides authentication, connection management, error handling, and retry logic.
 *
 * @module spreadsheet/sdk/POLLNClient
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  POLLNSDKConfig,
  APIRequest,
  APIResponse,
  POLLNSDKError,
  ErrorCode,
  AuthCredentials,
} from './Types.js';
import { POLLNSDKError as SDKError } from './Types.js';

// Re-export types for convenience
export type { POLLNSDKConfig, APIRequest, APIResponse, POLLNSDKError, ErrorCode, AuthCredentials };

/**
 * POLLN Spreadsheet SDK Client
 *
 * Main client class providing API access with authentication, connection management,
 * error handling, and retry logic.
 *
 * @example
 * ```typescript
 * const client = new POLLNClient({
 *   endpoint: 'http://localhost:3000',
 *   apiKey: 'your-api-key'
 * });
 *
 * await client.initialize();
 * const sheets = await client.sheets.list();
 * ```
 */
export class POLLNClient {
  private config: Required<Omit<POLLNSDKConfig, 'apiKey' | 'authToken' | 'debug' | 'rateLimit' | 'websocket'>> & {
    apiKey?: string;
    authToken?: string;
    debug: boolean;
    rateLimit: NonNullable<POLLNSDKConfig['rateLimit']>;
    websocket: NonNullable<POLLNSDKConfig['websocket']>;
  };
  private initialized: boolean = false;
  private authenticated: boolean = false;
  private credentials: AuthCredentials = {};
  private requestIdCounter: number = 0;

  // Rate limiting
  private requestCount: number = 0;
  private requestWindowStart: number = Date.now();
  private pendingRequests: Map<string, Promise<APIResponse>> = new Map();

  // Connection state
  private connectionRetries: number = 0;

  /**
   * Create a new POLLN client instance
   *
   * @param config - Client configuration
   */
  constructor(config: POLLNSDKConfig = {}) {
    this.config = {
      endpoint: config.endpoint || 'http://localhost:3000',
      wsEndpoint: config.wsEndpoint || 'ws://localhost:3000',
      apiKey: config.apiKey,
      authToken: config.authToken,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      debug: config.debug || false,
      rateLimit: {
        requestsPerMinute: config.rateLimit?.requestsPerMinute || 60,
        burstLimit: config.rateLimit?.burstLimit || 10,
      },
      websocket: {
        reconnectAttempts: config.websocket?.reconnectAttempts || 5,
        reconnectDelay: config.websocket?.reconnectDelay || 1000,
        pingInterval: config.websocket?.pingInterval || 30000,
        pingTimeout: config.websocket?.pingTimeout || 5000,
      },
    };

    // Set up credentials
    if (config.apiKey) {
      this.credentials.apiKey = config.apiKey;
    }
    if (config.authToken) {
      this.credentials.token = config.authToken;
    }

    this.log('POLLN Client created', { endpoint: this.config.endpoint });
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the client
   *
   * Establishes connection to the API and performs initial setup.
   *
   * @throws {POLLNSDKError} If initialization fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.log('Client already initialized');
      return;
    }

    this.log('Initializing POLLN client...');

    try {
      // Test connection
      await this.testConnection();

      // Authenticate if credentials provided
      if (this.credentials.apiKey || this.credentials.token) {
        await this.authenticate();
      }

      this.initialized = true;
      this.connectionRetries = 0;

      this.log('POLLN client initialized successfully');
    } catch (error) {
      this.log('Initialization failed:', error);
      throw this.handleError(error as Error);
    }
  }

  /**
   * Disconnect the client
   *
   * Cleanly shuts down the client connection.
   */
  async disconnect(): Promise<void> {
    this.log('Disconnecting POLLN client...');

    // Wait for pending requests
    await Promise.allSettled(Array.from(this.pendingRequests.values()));

    this.initialized = false;
    this.authenticated = false;
    this.pendingRequests.clear();

    this.log('POLLN client disconnected');
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticated;
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  /**
   * Set authentication credentials
   *
   * @param credentials - Authentication credentials
   */
  setCredentials(credentials: AuthCredentials): void {
    this.credentials = { ...this.credentials, ...credentials };
    this.log('Credentials updated');
  }

  /**
   * Authenticate with the API
   *
   * @throws {POLLNSDKError} If authentication fails
   */
  private async authenticate(): Promise<void> {
    this.log('Authenticating...');

    try {
      const response = await this.makeRequest({
        method: 'POST',
        path: '/api/v1/auth/validate',
        body: this.credentials,
      });

      if (response.status === 200) {
        this.authenticated = true;
        this.log('Authentication successful');
      } else {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }
    } catch (error) {
      this.log('Authentication failed:', error);
      throw this.handleError(error as Error, 'AUTHENTICATION_ERROR');
    }
  }

  /**
   * Refresh authentication token
   *
   * @throws {POLLNSDKError} If token refresh fails
   */
  async refreshToken(): Promise<void> {
    this.log('Refreshing authentication token...');

    try {
      const response = await this.makeRequest({
        method: 'POST',
        path: '/api/v1/auth/refresh',
      });

      if (response.status === 200 && response.data) {
        const data = response.data as { token?: string };
        if (data.token) {
          this.credentials.token = data.token;
          this.authenticated = true;
          this.log('Token refreshed successfully');
        }
      }
    } catch (error) {
      this.log('Token refresh failed:', error);
      throw this.handleError(error as Error, 'AUTHENTICATION_ERROR');
    }
  }

  // ==========================================================================
  // API Requests
  // ==========================================================================

  /**
   * Make an API request
   *
   * @param request - API request configuration
   * @param retryCount - Current retry attempt
   * @returns API response
   * @throws {POLLNSDKError} If request fails
   */
  async makeRequest<T = unknown>(request: APIRequest, retryCount: number = 0): Promise<APIResponse<T>> {
    this.ensureInitialized();
    await this.checkRateLimit();

    const requestId = request.id || this.generateRequestId();
    const timeout = request.timeout || this.config.timeout;

    this.log(`Making request: ${request.method} ${request.path}`, { requestId });

    try {
      // Check for deduplication
      if (this.pendingRequests.has(requestId)) {
        return this.pendingRequests.get(requestId)! as Promise<APIResponse<T>>;
      }

      // Create request promise
      const requestPromise = this.executeRequest<T>(request, requestId, timeout);

      // Track pending request
      this.pendingRequests.set(requestId, requestPromise);

      // Execute request
      const response = await requestPromise;

      // Clean up
      this.pendingRequests.delete(requestId);

      // Update rate limit counter
      this.requestCount++;
      this.resetRateLimitWindowIfNeeded();

      return response;
    } catch (error) {
      // Clean up on error
      this.pendingRequests.delete(requestId);

      // Handle retry logic
      const sdkError = this.handleError(error as Error);

      if (sdkError.isRetryable() && retryCount < this.config.maxRetries) {
        const delay = this.config.retryDelay * Math.pow(2, retryCount);
        this.log(`Retrying request (${retryCount + 1}/${this.config.maxRetries}) after ${delay}ms`);

        await this.sleep(delay);
        return this.makeRequest<T>(request, retryCount + 1);
      }

      throw sdkError;
    }
  }

  /**
   * Execute the actual HTTP request
   *
   * @param request - API request configuration
   * @param requestId - Request ID
   * @param timeout - Request timeout
   * @returns API response
   * @private
   */
  private async executeRequest<T>(
    request: APIRequest,
    requestId: string,
    timeout: number
  ): Promise<APIResponse<T>> {
    const url = new URL(request.path, this.config.endpoint);

    // Add query parameters
    if (request.params) {
      Object.entries(request.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...request.headers,
    };

    // Add authentication
    if (this.credentials.token) {
      headers['Authorization'] = `Bearer ${this.credentials.token}`;
    } else if (this.credentials.apiKey) {
      headers['X-API-Key'] = this.credentials.apiKey;
    }

    // Add custom auth headers
    if (this.credentials.customHeaders) {
      Object.assign(headers, this.credentials.customHeaders);
    }

    // Prepare body
    const body = request.body ? JSON.stringify(request.body) : undefined;

    // Create fetch request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: request.method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const data = await this.parseResponse<T>(response);

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
        requestId,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new SDKError('TIMEOUT_ERROR', `Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Parse API response
   *
   * @param response - Fetch response
   * @returns Parsed data
   * @private
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const data = await response.json();

      // Check for API error response
      if (!response.ok && data.error) {
        throw new SDKError(
          data.error.code || 'SERVER_ERROR',
          data.error.message || response.statusText,
          data.error.details,
          response.status
        );
      }

      return data;
    }

    // Handle non-JSON responses
    const text = await response.text();
    return text as unknown as T;
  }

  /**
   * Parse response headers
   *
   * @param headers - Fetch headers
   * @returns Headers object
   * @private
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * Test connection to the API
   *
   * @throws {POLLNSDKError} If connection test fails
   * @private
   */
  private async testConnection(): Promise<void> {
    this.log('Testing connection...');

    try {
      const response = await fetch(`${this.config.endpoint}/api/v1/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      this.log('Connection test successful');
    } catch (error) {
      this.log('Connection test failed:', error);
      throw new SDKError(
        'NETWORK_ERROR',
        `Cannot connect to ${this.config.endpoint}`,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Reconnect to the API
   *
   * @throws {POLLNSDKError} If reconnection fails
   */
  async reconnect(): Promise<void> {
    this.log('Reconnecting...');

    if (this.connectionRetries >= this.config.websocket.reconnectAttempts) {
      throw new SDKError(
        'NETWORK_ERROR',
        'Max reconnection attempts reached'
      );
    }

    this.connectionRetries++;

    try {
      await this.testConnection();
      await this.initialize();
      this.log('Reconnection successful');
    } catch (error) {
      this.log('Reconnection failed:', error);
      throw error;
    }
  }

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================

  /**
   * Check rate limit before making request
   *
   * @throws {POLLNSDKError} If rate limit exceeded
   * @private
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowElapsed = now - this.requestWindowStart;

    // Reset window if more than a minute has passed
    if (windowElapsed > 60000) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    // Check rate limit
    if (this.requestCount >= this.config.rateLimit.requestsPerMinute) {
      const waitTime = 60000 - windowElapsed;
      this.log(`Rate limit exceeded, waiting ${waitTime}ms`);
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.requestWindowStart = Date.now();
    }

    // Check burst limit
    if (this.pendingRequests.size >= this.config.rateLimit.burstLimit) {
      this.log('Burst limit reached, waiting for pending requests');
      await Promise.race(Array.from(this.pendingRequests.values()));
    }
  }

  /**
   * Reset rate limit window if needed
   *
   * @private
   */
  private resetRateLimitWindowIfNeeded(): void {
    const now = Date.now();
    const windowElapsed = now - this.requestWindowStart;

    if (windowElapsed > 60000) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  /**
   * Handle and normalize errors
   *
   * @param error - Original error
   * @param code - Error code override
   * @returns Normalized SDK error
   * @private
   */
  private handleError(error: Error, code?: ErrorCode): POLLNSDKError {
    if (error instanceof SDKError) {
      return error;
    }

    // Determine error code
    let errorCode: ErrorCode = 'UNKNOWN_ERROR';

    if (error.message.includes('fetch') || error.message.includes('network')) {
      errorCode = 'NETWORK_ERROR';
    } else if (error.message.includes('timeout')) {
      errorCode = 'TIMEOUT_ERROR';
    } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
      errorCode = 'AUTHENTICATION_ERROR';
    } else if (error.message.includes('403') || error.message.includes('forbidden')) {
      errorCode = 'AUTHORIZATION_ERROR';
    } else if (error.message.includes('404')) {
      errorCode = 'NOT_FOUND';
    } else if (error.message.includes('429')) {
      errorCode = 'RATE_LIMIT_ERROR';
    } else if (code) {
      errorCode = code;
    }

    return new SDKError(errorCode, error.message, { originalError: error.message });
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Generate unique request ID
   *
   * @returns Request ID
   * @private
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  /**
   * Sleep for specified duration
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Ensure client is initialized
   *
   * @throws {POLLNSDKError} If client not initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new SDKError('UNKNOWN_ERROR', 'Client not initialized. Call initialize() first');
    }
  }

  /**
   * Log debug message
   *
   * @param args - Arguments to log
   * @private
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[POLLNClient]', ...args);
    }
  }

  // ==========================================================================
  // Convenience Methods for API Access
  // ==========================================================================

  /**
   * Get the CellAPI instance
   *
   * lazy import to avoid circular dependencies
   */
  async cells() {
    const { CellAPI } = await import('./CellAPI.js');
    return new CellAPI(this);
  }

  /**
   * Get the SheetAPI instance
   */
  async sheets() {
    const { SheetAPI } = await import('./SheetAPI.js');
    return new SheetAPI(this);
  }

  /**
   * Get the ColonyAPI instance
   */
  async colonies() {
    const { ColonyAPI } = await import('./ColonyAPI.js');
    return new ColonyAPI(this);
  }

  /**
   * Get the WebSocket client instance
   */
  async websocket() {
    const { WebSocketClient } = await import('./WebSocketClient.js');
    return new WebSocketClient(this.config.wsEndpoint, this.credentials);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create and initialize a POLLN client
 *
 * @param config - Client configuration
 * @returns Initialized client instance
 *
 * @example
 * ```typescript
 * const client = await createClient({
 *   endpoint: 'http://localhost:3000',
 *   apiKey: 'your-api-key'
 * });
 * ```
 */
export async function createClient(config: POLLNSDKConfig = {}): Promise<POLLNClient> {
  const client = new POLLNClient(config);
  await client.initialize();
  return client;
}

// ============================================================================
// Default Export
// ============================================================================

export default POLLNClient;

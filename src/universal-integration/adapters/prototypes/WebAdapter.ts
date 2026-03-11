/**
 * Web Platform Adapter Prototype
 *
 * Adapter for web-based communication (HTTP/WebSocket/SSE).
 * Enables SMPbot integration with web applications and browsers.
 */

import {
  UniversalPlatformAdapter,
  AdapterConfig,
  AdapterState,
  AdapterEvent
} from '../UniversalPlatformAdapter.js';
import {
  UIPMessage,
  PlatformType,
  MessageType,
  SendResult,
  SendErrorCode,
  PlatformCapabilities,
  RateLimitConfig,
  AuthMethod,
  CURRENT_PROTOCOL_VERSION
} from '../../protocol/types.js';

/**
 * Web adapter configuration
 */
export interface WebAdapterConfig extends AdapterConfig {
  options: {
    transport?: 'http' | 'websocket' | 'sse' | 'hybrid';
    endpoint?: string;
    headers?: Record<string, string>;
    reconnectAttempts?: number;
    messageQueueSize?: number;
    stateSyncInterval?: number;
    debug?: boolean;
  };
}

/**
 * Web adapter implementation
 */
export class WebAdapter extends UniversalPlatformAdapter {
  private transport: 'http' | 'websocket' | 'sse' | 'hybrid';
  private endpoint: string;
  private headers: Record<string, string>;
  private messageReceiver?: (message: UIPMessage) => Promise<void>;

  // WebSocket specific
  private websocket: WebSocket | null = null;
  private websocketReconnectAttempts = 0;

  // HTTP specific
  private httpSessionId: string | null = null;

  // SSE specific
  private eventSource: EventSource | null = null;

  /**
   * Constructor
   */
  constructor(config: WebAdapterConfig) {
    super(config);

    this.transport = config.options?.transport || 'hybrid';
    this.endpoint = config.options?.endpoint || 'http://localhost:3000/api/uip';
    this.headers = config.options?.headers || {};

    // Initialize with web-specific capabilities
    this.initializeWebCapabilities();
  }

  // ============================================================================
  // UniversalPlatformAdapter Implementation
  // ============================================================================

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    this.log('Initializing Web adapter...');

    try {
      // Validate configuration
      this.validateConfig();

      // Initialize based on transport type
      switch (this.transport) {
        case 'websocket':
          await this.initializeWebSocket();
          break;
        case 'sse':
          await this.initializeSSE();
          break;
        case 'http':
          await this.initializeHTTP();
          break;
        case 'hybrid':
          await this.initializeHybrid();
          break;
      }

      this.setAdapterState(AdapterState.CONNECTED);
      this.emitEvent(AdapterEvent.CONNECTED);

      this.log('Web adapter initialized successfully');

    } catch (error) {
      this.handlePlatformError(error, 'initialize');
      throw error;
    }
  }

  /**
   * Connect to the web platform
   */
  async connect(): Promise<void> {
    if (this.isConnected()) {
      this.log('Already connected');
      return;
    }

    this.setAdapterState(AdapterState.CONNECTING);
    this.log('Connecting to web platform...');

    try {
      switch (this.transport) {
        case 'websocket':
          await this.connectWebSocket();
          break;
        case 'sse':
          await this.connectSSE();
          break;
        case 'http':
          await this.connectHTTP();
          break;
        case 'hybrid':
          await this.connectHybrid();
          break;
      }

      this.setAdapterState(AdapterState.CONNECTED);
      this.emitEvent(AdapterEvent.CONNECTED);
      this.log('Connected to web platform');

    } catch (error) {
      this.handlePlatformError(error, 'connect');
      this.setAdapterState(AdapterState.ERROR);
      throw error;
    }
  }

  /**
   * Disconnect from the web platform
   */
  async disconnect(): Promise<void> {
    this.log('Disconnecting from web platform...');

    try {
      // Close WebSocket if open
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      // Close SSE if open
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      // Clear HTTP session
      this.httpSessionId = null;

      this.setAdapterState(AdapterState.DISCONNECTED);
      this.emitEvent(AdapterEvent.DISCONNECTED);
      this.log('Disconnected from web platform');

    } catch (error) {
      this.handlePlatformError(error, 'disconnect');
      throw error;
    }
  }

  /**
   * Send a message through the web adapter
   */
  async send(message: UIPMessage): Promise<SendResult> {
    const startTime = Date.now();

    try {
      // Validate message
      const validation = this.validateMessage(message);
      if (!validation.valid) {
        return this.createSendResult(false, {
          code: SendErrorCode.INVALID_MESSAGE,
          message: `Invalid message: ${validation.errors.join(', ')}`,
          retryable: false
        }, startTime);
      }

      // Transform message for web transport
      const transformed = await this.transformToPlatform(message);

      // Send based on transport
      let result: any;
      switch (this.transport) {
        case 'websocket':
          result = await this.sendViaWebSocket(transformed);
          break;
        case 'sse':
          result = await this.sendViaSSE(transformed);
          break;
        case 'http':
          result = await this.sendViaHTTP(transformed);
          break;
        case 'hybrid':
          result = await this.sendViaHybrid(transformed);
          break;
      }

      // Update statistics
      this.emitEvent(AdapterEvent.MESSAGE_SENT, { message, result });

      return this.createSendResult(true, undefined, startTime, {
        platformMessageId: result?.id,
        rateLimitInfo: result?.rateLimit
      });

    } catch (error) {
      this.handlePlatformError(error, 'send');
      return this.createSendResult(false, {
        code: SendErrorCode.PLATFORM_ERROR,
        message: error instanceof Error ? error.message : String(error),
        retryable: this.isRetryableError(error),
        retryDelay: 1000
      }, startTime);
    }
  }

  /**
   * Register message receiver callback
   */
  receive(callback: (message: UIPMessage) => Promise<void>): void {
    this.messageReceiver = callback;
    this.log('Message receiver registered');
  }

  // ============================================================================
  // Transport-Specific Implementations
  // ============================================================================

  /**
   * Initialize WebSocket transport
   */
  private async initializeWebSocket(): Promise<void> {
    this.log('Initializing WebSocket transport...');

    // WebSocket capabilities
    this.capabilities.supportsRealtime = true;
    this.capabilities.supportedMessageTypes.push(
      MessageType.HEARTBEAT,
      MessageType.STATE_SYNC
    );

    // Set up WebSocket URL
    const wsUrl = this.endpoint.replace(/^http/, 'ws') + '/ws';
    this.log(`WebSocket URL: ${wsUrl}`);
  }

  /**
   * Initialize SSE transport
   */
  private async initializeSSE(): Promise<void> {
    this.log('Initializing SSE transport...');

    // SSE capabilities
    this.capabilities.supportsRealtime = true;
    this.capabilities.supportedMessageTypes.push(
      MessageType.HEARTBEAT
    );

    // Set up SSE endpoint
    const sseUrl = this.endpoint + '/events';
    this.log(`SSE URL: ${sseUrl}`);
  }

  /**
   * Initialize HTTP transport
   */
  private async initializeHTTP(): Promise<void> {
    this.log('Initializing HTTP transport...');

    // HTTP capabilities
    this.capabilities.supportsRealtime = false;
    this.capabilities.maxMessageSize = 5 * 1024 * 1024; // 5MB for HTTP

    this.log(`HTTP endpoint: ${this.endpoint}`);
  }

  /**
   * Initialize hybrid transport
   */
  private async initializeHybrid(): Promise<void> {
    this.log('Initializing hybrid transport...');

    // Hybrid uses best of all transports
    this.capabilities.supportsRealtime = true;
    this.capabilities.supportedMessageTypes.push(
      MessageType.HEARTBEAT,
      MessageType.STATE_SYNC,
      MessageType.FILE
    );
    this.capabilities.supportsFiles = true;

    this.log(`Hybrid endpoint: ${this.endpoint}`);
  }

  /**
   * Connect WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    const wsUrl = this.endpoint.replace(/^http/, 'ws') + '/ws';

    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
          this.log('WebSocket connected');
          this.websocketReconnectAttempts = 0;
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.websocket.onerror = (error) => {
          this.log('WebSocket error:', error);
          reject(new Error('WebSocket connection error'));
        };

        this.websocket.onclose = (event) => {
          this.log(`WebSocket closed: ${event.code} ${event.reason}`);
          this.handleWebSocketClose(event);
        };

        // Set timeout for connection
        setTimeout(() => {
          if (this.websocket?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect SSE
   */
  private async connectSSE(): Promise<void> {
    const sseUrl = this.endpoint + '/events';

    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(sseUrl);

        this.eventSource.onopen = () => {
          this.log('SSE connected');
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          this.handleSSEMessage(event);
        };

        this.eventSource.onerror = (error) => {
          this.log('SSE error:', error);
          reject(new Error('SSE connection error'));
        };

        // Set timeout for connection
        setTimeout(() => {
          if (this.eventSource?.readyState !== EventSource.OPEN) {
            reject(new Error('SSE connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect HTTP
   */
  private async connectHTTP(): Promise<void> {
    // HTTP doesn't have persistent connection, just validate endpoint
    try {
      const response = await fetch(this.endpoint + '/health', {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP health check failed: ${response.status}`);
      }

      const data = await response.json();
      this.httpSessionId = data.sessionId;
      this.log(`HTTP connected, session ID: ${this.httpSessionId}`);

    } catch (error) {
      throw new Error(`HTTP connection failed: ${error}`);
    }
  }

  /**
   * Connect hybrid
   */
  private async connectHybrid(): Promise<void> {
    // Try WebSocket first, fall back to SSE, then HTTP
    try {
      await this.connectWebSocket();
      this.log('Hybrid: Using WebSocket transport');
    } catch (wsError) {
      this.log('WebSocket failed, trying SSE...');
      try {
        await this.connectSSE();
        this.log('Hybrid: Using SSE transport');
      } catch (sseError) {
        this.log('SSE failed, using HTTP...');
        await this.connectHTTP();
        this.log('Hybrid: Using HTTP transport');
      }
    }
  }

  /**
   * Send via WebSocket
   */
  private async sendViaWebSocket(data: unknown): Promise<any> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const messageId = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add message ID for tracking
      const message = {
        ...(typeof data === 'object' ? data : { data }),
        _messageId: messageId,
        _timestamp: Date.now()
      };

      // Set up response handler
      const responseHandler = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data);
          if (response._responseTo === messageId) {
            this.websocket?.removeEventListener('message', responseHandler);
            resolve(response);
          }
        } catch (error) {
          // Not a JSON response or not our message
        }
      };

      this.websocket.addEventListener('message', responseHandler);

      // Send message
      this.websocket.send(JSON.stringify(message));

      // Timeout after 30 seconds
      setTimeout(() => {
        this.websocket?.removeEventListener('message', responseHandler);
        reject(new Error('WebSocket response timeout'));
      }, 30000);
    });
  }

  /**
   * Send via SSE (SSE is receive-only, use HTTP for sending)
   */
  private async sendViaSSE(data: unknown): Promise<any> {
    // SSE is receive-only, use HTTP POST for sending
    return this.sendViaHTTP(data);
  }

  /**
   * Send via HTTP
   */
  private async sendViaHTTP(data: unknown): Promise<any> {
    const response = await fetch(this.endpoint + '/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
        ...(this.httpSessionId ? { 'X-Session-ID': this.httpSessionId } : {})
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP send failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Send via hybrid transport
   */
  private async sendViaHybrid(data: unknown): Promise<any> {
    // Use WebSocket if available, otherwise HTTP
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return this.sendViaWebSocket(data);
    } else if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      // SSE for receiving, HTTP for sending
      return this.sendViaHTTP(data);
    } else {
      return this.sendViaHTTP(data);
    }
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Handle WebSocket message
   */
  private async handleWebSocketMessage(event: MessageEvent): Promise<void> {
    try {
      const data = JSON.parse(event.data);

      // Skip internal messages
      if (data._messageId || data._responseTo) {
        return;
      }

      // Transform to UIP message
      const message = await this.transformFromPlatform(data);

      // Pass to receiver
      if (this.messageReceiver) {
        await this.messageReceiver(message);
        this.emitEvent(AdapterEvent.MESSAGE_RECEIVED, { message });
      }

    } catch (error) {
      this.log('Error handling WebSocket message:', error);
    }
  }

  /**
   * Handle SSE message
   */
  private async handleSSEMessage(event: MessageEvent): Promise<void> {
    try {
      const data = JSON.parse(event.data);

      // Transform to UIP message
      const message = await this.transformFromPlatform(data);

      // Pass to receiver
      if (this.messageReceiver) {
        await this.messageReceiver(message);
        this.emitEvent(AdapterEvent.MESSAGE_RECEIVED, { message });
      }

    } catch (error) {
      this.log('Error handling SSE message:', error);
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleWebSocketClose(event: CloseEvent): void {
    this.websocket = null;

    if (event.code !== 1000 && this.isConnected()) {
      this.log('WebSocket closed unexpectedly, attempting reconnect...');
      this.setAdapterState(AdapterState.RECONNECTING);
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnect(): Promise<void> {
    const maxAttempts = this.config.options?.reconnectAttempts || 5;

    if (this.websocketReconnectAttempts >= maxAttempts) {
      this.log(`Max reconnect attempts (${maxAttempts}) reached`);
      this.setAdapterState(AdapterState.ERROR);
      return;
    }

    this.websocketReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.websocketReconnectAttempts), 30000);

    this.log(`Reconnect attempt ${this.websocketReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.connect();
        this.websocketReconnectAttempts = 0;
      } catch (error) {
        this.log(`Reconnect attempt ${this.websocketReconnectAttempts} failed:`, error);
        await this.attemptReconnect();
      }
    }, delay);
  }

  // ============================================================================
  // Message Transformation
  // ============================================================================

  /**
   * Transform UIP message to web platform format
   */
  protected async transformToPlatform(message: UIPMessage): Promise<unknown> {
    // Basic transformation for web transport
    return {
      id: message.id,
      timestamp: message.timestamp,
      protocolVersion: message.protocolVersion,
      source: message.source,
      target: message.target,
      type: message.type,
      payload: message.payload,
      metadata: message.metadata,
      state: message.state
    };
  }

  /**
   * Transform web platform message to UIP format
   */
  protected async transformFromPlatform(data: unknown): Promise<UIPMessage> {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid message data');
    }

    const msg = data as Record<string, unknown>;

    return {
      id: String(msg.id || `web-${Date.now()}`),
      timestamp: Number(msg.timestamp || Date.now()),
      protocolVersion: String(msg.protocolVersion || CURRENT_PROTOCOL_VERSION),
      source: msg.source as UIPMessage['source'],
      target: msg.target as UIPMessage['target'],
      type: msg.type as UIPMessage['type'],
      payload: msg.payload,
      metadata: msg.metadata as UIPMessage['metadata'],
      state: msg.state as UIPMessage['state']
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Initialize web-specific capabilities
   */
  private initializeWebCapabilities(): void {
    const webCapabilities: Partial<PlatformCapabilities> = {
      platform: PlatformType.WEB,
      supportedMessageTypes: [
        MessageType.TEXT,
        MessageType.COMMAND,
        MessageType.QUERY,
        MessageType.RESPONSE,
        MessageType.ERROR,
        MessageType.FILE,
        MessageType.IMAGE,
        MessageType.FORM,
        MessageType.BUTTON
      ],
      maxMessageSize: 10 * 1024 * 1024, // 10MB
      supportsFiles: true,
      supportsRealtime: this.transport !== 'http',
      supportsStateSync: true,
      rateLimits: {
        maxRequests: 1000,
        windowMs: 60000
      },
      authenticationMethods: [
        { type: 'api_key', name: 'API Key', required: false },
        { type: 'jwt', name: 'JWT', required: false }
      ],
      features: [
        'realtime-messaging',
        'file-upload',
        'state-sync',
        'cross-origin'
      ]
    };

    this.capabilities = { ...this.capabilities, ...webCapabilities };
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.endpoint) {
      throw new Error('Endpoint is required');
    }

    if (!this.endpoint.startsWith('http://') && !this.endpoint.startsWith('https://')) {
      throw new Error('Endpoint must start with http:// or https://');
    }

    if (this.transport === 'websocket' || this.transport === 'hybrid') {
      if (typeof WebSocket === 'undefined') {
        throw new Error('WebSocket not supported in this environment');
      }
    }

    if (this.transport === 'sse' || this.transport === 'hybrid') {
      if (typeof EventSource === 'undefined') {
        throw new Error('EventSource not supported in this environment');
      }
    }
  }

  /**
   * Create send result
   */
  private createSendResult(
    success: boolean,
    error?: { code: SendErrorCode; message: string; retryable: boolean; retryDelay?: number },
    startTime?: number,
    metadata?: { platformMessageId?: string; rateLimitInfo?: any }
  ): SendResult {
    const duration = startTime ? Date.now() - startTime : 0;

    return {
      success,
      messageId: metadata?.platformMessageId,
      error,
      metadata: {
        timestamp: Date.now(),
        duration,
        platformMessageId: metadata?.platformMessageId,
        rateLimitInfo: metadata?.rateLimitInfo
      }
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('temporarily')
      );
    }
    return false;
  }

  /**
   * Log message if debug is enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.options?.debug) {
      console.log('[WebAdapter]', ...args);
    }
  }
}
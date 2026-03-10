/**
 * POLLN Spreadsheet SDK - WebSocket Client
 *
 * Provides real-time updates through WebSocket connections including
 * event subscriptions, cell change notifications, and connection health monitoring.
 *
 * @module spreadsheet/sdk/WebSocketClient
 */

import { v4 as uuidv4 } from 'uuid';
import type WS from 'ws';
import type {
  WSMessage,
  WSConfig,
  ConnectionState,
  EventType,
  EventHandler,
  Event,
  AuthCredentials,
} from './Types.js';

/**
 * WebSocket Client Class
 *
 * Manages WebSocket connections for real-time updates and event streaming.
 *
 * @example
 * ```typescript
 * const wsClient = new WebSocketClient('ws://localhost:3000', { token: 'your-token' });
 * await wsClient.connect();
 *
 * // Subscribe to events
 * await wsClient.subscribe('cell:valueChanged', (event) => {
 *   console.log('Cell changed:', event.data);
 * });
 *
 * // Later: wsClient.disconnect();
 * ```
 */
export class WebSocketClient {
  private config: WSConfig;
  private credentials: AuthCredentials = {};
  private ws: typeof WS.websocket | null = null;
  private state: ConnectionState = 'disconnected';
  private subscriptions: Map<string, { eventType: EventType; handler: EventHandler; filter?: { source?: string; idPattern?: string } }> = new Map();
  private messageQueue: WSMessage[] = [];
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private manualClose: boolean = false;

  // Event handlers
  private onStateChangeHandlers: Set<(state: ConnectionState) => void> = new Set();
  private onErrorHandlers: Set<(error: Error) => void> = new Set();

  /**
   * Create a new WebSocket client
   *
   * @param url - WebSocket server URL
   * @param credentials - Authentication credentials
   * @param config - WebSocket configuration
   */
  constructor(
    url: string,
    credentials: AuthCredentials = {},
    config: Partial<WSConfig> = {}
  ) {
    this.credentials = credentials;
    this.config = {
      url,
      timeout: config.timeout || 10000,
      reconnectAttempts: config.reconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 1000,
      pingInterval: config.pingInterval || 30000,
      pingTimeout: config.pingTimeout || 5000,
      token: credentials.token,
    };
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * Connect to the WebSocket server
   *
   * @throws {Error} If connection fails
   *
   * @example
   * ```typescript
   * await wsClient.connect();
   * console.log('Connected');
   * ```
   */
  async connect(): Promise<void> {
    if (this.state === 'connected') {
      return;
    }

    if (this.state === 'connecting') {
      // Wait for existing connection attempt
      await this.waitForState('connected', this.config.timeout!);
      return;
    }

    this.state = 'connecting';
    this.notifyStateChange('connecting');

    try {
      const WS = await import('ws');
      this.ws = new WS.websocket(this.config.url, {
        handshakeTimeout: this.config.timeout,
      });

      await new Promise<void>((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not initialized'));

        this.ws.once('open', () => {
          this.state = 'connected';
          this.reconnectAttempts = 0;
          this.manualClose = false;

          // Send authentication if token provided
          if (this.config.token) {
            this.authenticate();
          }

          // Process queued messages
          this.processMessageQueue();

          // Start ping/pong
          this.startPingPong();

          this.notifyStateChange('connected');
          resolve();
        });

        this.ws.once('error', (error) => {
          this.state = 'error';
          this.notifyError(error);
          this.notifyStateChange('error');
          reject(error);
        });

        this.ws.once('close', () => {
          this.handleClose();
        });
      });
    } catch (error) {
      this.state = 'error';
      this.notifyStateChange('error');
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server
   *
   * @example
   * ```typescript
   * await wsClient.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    this.manualClose = true;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state = 'disconnected';
    this.notifyStateChange('disconnected');
  }

  /**
   * Reconnect to the WebSocket server
   *
   * @throws {Error} If max reconnection attempts reached
   *
   * @example
   * ```typescript
   * await wsClient.reconnect();
   * ```
   */
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.config.reconnectAttempts!) {
      throw new Error('Max reconnection attempts reached');
    }

    this.reconnectAttempts++;

    if (this.ws) {
      this.ws.close();
    }

    await this.sleep(this.config.reconnectDelay!);
    await this.connect();
  }

  // ==========================================================================
  // Event Subscriptions
  // ==========================================================================

  /**
   * Subscribe to events
   *
   * @param eventType - Event type to subscribe to
   * @param handler - Event handler function
   * @param filter - Optional filter criteria
   * @returns Subscription ID
   *
   * @example
   * ```typescript
   * const subId = await wsClient.subscribe(
   *   'cell:valueChanged',
   *   (event) => console.log('Cell changed:', event.data),
   *   { source: 'sheet-123' }
   * );
   * ```
   */
  async subscribe(
    eventType: EventType,
    handler: EventHandler,
    filter?: { source?: string; idPattern?: string }
  ): Promise<string> {
    await this.ensureConnected();

    const subscriptionId = uuidv4();
    this.subscriptions.set(subscriptionId, { eventType, handler, filter });

    // Send subscription message to server
    this.send({
      type: 'subscribe',
      payload: {
        eventType,
        subscriptionId,
        filter,
      },
      id: uuidv4(),
      timestamp: Date.now(),
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   *
   * @param subscriptionId - Subscription ID
   *
   * @example
   * ```typescript
   * await wsClient.unsubscribe(subscriptionId);
   * ```
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    this.subscriptions.delete(subscriptionId);

    // Send unsubscribe message to server
    this.send({
      type: 'unsubscribe',
      payload: {
        eventType: subscription.eventType,
        subscriptionId,
      },
      id: uuidv4(),
      timestamp: Date.now(),
    });
  }

  /**
   * Unsubscribe from all events
   *
   * @example
   * ```typescript
   * await wsClient.unsubscribeAll();
   * ```
   */
  async unsubscribeAll(): Promise<void> {
    const subscriptionIds = Array.from(this.subscriptions.keys());
    await Promise.all(subscriptionIds.map(id => this.unsubscribe(id)));
  }

  // ==========================================================================
  // Message Handling
  // ==========================================================================

  /**
   * Send a message to the server
   *
   * @param message - Message to send
   *
   * @example
   * ```typescript
   * wsClient.send({
   *   type: 'ping',
   *   payload: {},
   *   id: uuidv4(),
   *   timestamp: Date.now()
   * });
   * ```
   */
  send(message: WSMessage): void {
    if (!this.isConnected()) {
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws!.send(JSON.stringify(message));
    } catch (error) {
      this.notifyError(error as Error);
    }
  }

  /**
   * Send a request and wait for response
   *
   * @param type - Request type
   * @param payload - Request payload
   * @param timeout - Request timeout
   * @returns Response payload
   *
   * @example
   * ```typescript
   * const response = await wsClient.request('getStats', { colonyId: 'col-123' });
   * ```
   */
  async request<T = unknown>(type: string, payload: unknown, timeout: number = 5000): Promise<T> {
    await this.ensureConnected();

    const requestId = uuidv4();
    const message: WSMessage = {
      type,
      payload,
      id: requestId,
      timestamp: Date.now(),
    };

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Request timeout: ${type}`));
      }, timeout);

      const cleanup = () => {
        clearTimeout(timeoutId);
        // Remove one-time listener
        this.ws?.removeListener('message', handler);
      };

      const handler = (data: string) => {
        try {
          const response: WSMessage = JSON.parse(data);
          if (response.id === requestId) {
            cleanup();
            resolve(response.payload as T);
          }
        } catch (error) {
          // Ignore parse errors for other messages
        }
      };

      this.ws!.on('message', handler);
      this.send(message);
    });
  }

  // ==========================================================================
  // Connection State
  // ==========================================================================

  /**
   * Get current connection state
   *
   * @returns Connection state
   *
   * @example
   * ```typescript
   * const state = wsClient.getState();
   * console.log('State:', state);
   * ```
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   *
   * @returns True if connected
   *
   * @example
   * ```typescript
   * if (wsClient.isConnected()) {
   *   // Send message
   * }
   * ```
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Wait for specific connection state
   *
   * @param targetState - Target state to wait for
   * @param timeout - Maximum wait time
   * @returns Promise that resolves when state is reached
   *
   * @example
   * ```typescript
   * await wsClient.waitForState('connected', 5000);
   * ```
   */
  async waitForState(targetState: ConnectionState, timeout: number = 10000): Promise<void> {
    if (this.state === targetState) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for state: ${targetState}`));
      }, timeout);

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.offStateChange(handler);
      };

      const handler = (state: ConnectionState) => {
        if (state === targetState) {
          cleanup();
          resolve();
        }
      };

      this.onStateChange(handler);
    });
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Register state change handler
   *
   * @param handler - State change handler
   * @returns Unregister function
   *
   * @example
   * ```typescript
   * const unregister = wsClient.onStateChange((state) => {
   *   console.log('State changed:', state);
   * });
   *
   * // Later: unregister();
   * ```
   */
  onStateChange(handler: (state: ConnectionState) => void): () => void {
    this.onStateChangeHandlers.add(handler);
    return () => this.offStateChange(handler);
  }

  /**
   * Unregister state change handler
   *
   * @param handler - Handler to unregister
   */
  offStateChange(handler: (state: ConnectionState) => void): void {
    this.onStateChangeHandlers.delete(handler);
  }

  /**
   * Register error handler
   *
   * @param handler - Error handler
   * @returns Unregister function
   *
   * @example
   * ```typescript
   * const unregister = wsClient.onError((error) => {
   *   console.error('WebSocket error:', error);
   * });
   *
   * // Later: unregister();
   * ```
   */
  onError(handler: (error: Error) => void): () => void {
    this.onErrorHandlers.add(handler);
    return () => this.offError(handler);
  }

  /**
   * Unregister error handler
   *
   * @param handler - Handler to unregister
   */
  offError(handler: (error: Error) => void): void {
    this.onErrorHandlers.delete(handler);
  }

  // ==========================================================================
  // Health Monitoring
  // ==========================================================================

  /**
   * Get connection health info
   *
   * @returns Health information
   *
   * @example
   * ```typescript
   * const health = wsClient.getHealth();
   * console.log('Connected:', health.connected);
   * console.log('Subscriptions:', health.subscriptionCount);
   * ```
   */
  getHealth(): {
    connected: boolean;
    state: ConnectionState;
    subscriptionCount: number;
    queuedMessages: number;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected(),
      state: this.state,
      subscriptionCount: this.subscriptions.size,
      queuedMessages: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Ensure client is connected
   *
   * @throws {Error} If not connected
   * @private
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  /**
   * Authenticate with the server
   *
   * @private
   */
  private authenticate(): void {
    this.send({
      type: 'auth',
      payload: {
        token: this.config.token,
      },
      id: uuidv4(),
      timestamp: Date.now(),
    });
  }

  /**
   * Process queued messages
   *
   * @private
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Start ping/pong mechanism
   *
   * @private
   */
  private startPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'ping',
          payload: {},
          id: uuidv4(),
          timestamp: Date.now(),
        });

        // Set pong timeout
        this.pongTimeout = setTimeout(() => {
          this.notifyError(new Error('Pong timeout'));
          this.ws?.close();
        }, this.config.pingTimeout);
      }
    }, this.config.pingInterval);

    // Set up message listener for pong
    if (this.ws) {
      this.ws.on('message', (data: string) => {
        try {
          const message: WSMessage = JSON.parse(data);
          this.handleMessage(message);
        } catch (error) {
          // Ignore parse errors
        }
      });
    }
  }

  /**
   * Handle incoming message
   *
   * @param message - Received message
   * @private
   */
  private handleMessage(message: WSMessage): void {
    // Handle pong
    if (message.type === 'pong') {
      if (this.pongTimeout) {
        clearTimeout(this.pongTimeout);
        this.pongTimeout = null;
      }
      return;
    }

    // Handle event messages
    if (message.type === 'event') {
      const event = message.payload as Event;
      this.dispatchEvent(event);
    }
  }

  /**
   * Dispatch event to subscribers
   *
   * @param event - Event to dispatch
   * @private
   */
  private dispatchEvent(event: Event): void {
    for (const [subscriptionId, subscription] of this.subscriptions) {
      // Check event type match
      if (subscription.eventType !== event.type) {
        continue;
      }

      // Check filter criteria
      if (subscription.filter?.source && event.source !== subscription.filter.source) {
        continue;
      }

      if (subscription.filter?.idPattern && !event.id.match(subscription.filter.idPattern)) {
        continue;
      }

      // Call handler
      try {
        subscription.handler(event);
      } catch (error) {
        this.notifyError(error as Error);
      }
    }
  }

  /**
   * Handle connection close
   *
   * @private
   */
  private handleClose(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }

    this.state = 'disconnected';
    this.ws = null;

    this.notifyStateChange('disconnected');

    // Auto-reconnect if not manual close
    if (!this.manualClose && this.reconnectAttempts < this.config.reconnectAttempts!) {
      setTimeout(() => {
        this.reconnect().catch(error => {
          this.notifyError(error);
        });
      }, this.config.reconnectDelay);
    }
  }

  /**
   * Notify state change handlers
   *
   * @param state - New state
   * @private
   */
  private notifyStateChange(state: ConnectionState): void {
    for (const handler of this.onStateChangeHandlers) {
      try {
        handler(state);
      } catch (error) {
        console.error('Error in state change handler:', error);
      }
    }
  }

  /**
   * Notify error handlers
   *
   * @param error - Error
   * @private
   */
  private notifyError(error: Error): void {
    for (const handler of this.onErrorHandlers) {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    }
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
}

// ============================================================================
// Default Export
// ============================================================================

export default WebSocketClient;

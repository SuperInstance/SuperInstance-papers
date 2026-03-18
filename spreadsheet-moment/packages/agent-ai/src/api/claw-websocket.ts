/**
 * Claw WebSocket Client
 *
 * WebSocket client with automatic reconnection, heartbeat,
 * message queuing, and comprehensive error handling.
 *
 * @module agent-ai/api/claw-websocket
 */

import {
  WSMessage,
  WSMessageType,
  StatusUpdateMessage,
  ReasoningStreamMessage,
  ErrorMessage,
  AgentCreatedMessage,
  AgentTerminatedMessage,
  EquipmentChangedMessage,
  HeartbeatMessage
} from './claw-types';

/**
 * WebSocket connection state
 */
enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  CLOSED = 'closed'
}

/**
 * WebSocket configuration
 */
export interface WebSocketConfig {
  url: string;
  apiKey: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  connectionTimeout?: number;
}

/**
 * Message handler type
 */
type MessageHandler = (message: WSMessage) => void;

/**
 * Claw WebSocket Client
 */
export class ClawWebSocketClient {
  private config: Required<WebSocketConfig>;
  private ws: WebSocket | null = null;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: Array<{ message: string; timestamp: number }> = [];
  private messageHandlers: Map<WSMessageType, Set<MessageHandler>>;
  private connectionHandlers: Set<(state: WebSocketState) => void>;
  private errorHandler: Set<(error: Error) => void>;

  /**
   * Create a new Claw WebSocket client
   */
  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      messageQueueSize: config.messageQueueSize || 100,
      connectionTimeout: config.connectionTimeout || 10000,
      ...config
    };

    this.messageHandlers = new Map();
    this.connectionHandlers = new Set();
    this.errorHandler = new Set();

    // Initialize message handler sets for all types
    Object.values(WSMessageType).forEach(type => {
      this.messageHandlers.set(type as WSMessageType, new Set());
    });
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.state = WebSocketState.CONNECTING;
        this.notifyConnectionHandlers(WebSocketState.CONNECTING);

        // Build WebSocket URL with auth
        const wsUrl = `${this.config.url}?token=${this.config.apiKey}`;
        this.ws = new WebSocket(wsUrl);

        // Set up connection timeout
        const timeoutTimer = setTimeout(() => {
          if (this.state === WebSocketState.CONNECTING) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, this.config.connectionTimeout);

        // Connection opened
        this.ws.onopen = () => {
          clearTimeout(timeoutTimer);
          this.state = WebSocketState.CONNECTED;
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers(WebSocketState.CONNECTED);
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        };

        // Message received
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // Connection closed
        this.ws.onclose = (event) => {
          clearTimeout(timeoutTimer);
          this.stopHeartbeat();

          if (this.state === WebSocketState.CLOSED) {
            // Intentionally closed, don't reconnect
            return;
          }

          this.state = WebSocketState.DISCONNECTED;
          this.notifyConnectionHandlers(WebSocketState.DISCONNECTED);

          // Attempt to reconnect
          if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else {
            this.notifyError(
              new Error(`Max reconnect attempts (${this.config.maxReconnectAttempts}) reached`)
            );
          }
        };

        // Error occurred
        this.ws.onerror = (error) => {
          clearTimeout(timeoutTimer);
          this.notifyError(new Error('WebSocket error occurred'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.state = WebSocketState.CLOSED;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Clear message queue
    this.messageQueue = [];
  }

  /**
   * Send message through WebSocket
   */
  send(message: string): boolean {
    if (this.state !== WebSocketState.CONNECTED || !this.ws) {
      // Queue message for later
      this.queueMessage(message);
      return false;
    }

    try {
      this.ws.send(message);
      return true;
    } catch (error) {
      this.queueMessage(message);
      return false;
    }
  }

  /**
   * Subscribe to message type
   */
  on(type: WSMessageType, handler: MessageHandler): () => void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.add(handler);
    }

    // Return unsubscribe function
    return () => {
      const h = this.messageHandlers.get(type);
      if (h) {
        h.delete(handler);
      }
    };
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionChange(handler: (state: WebSocketState) => void): () => void {
    this.connectionHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to errors
   */
  onError(handler: (error: Error) => void): () => void {
    this.errorHandler.add(handler);

    // Return unsubscribe function
    return () => {
      this.errorHandler.delete(handler);
    };
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === WebSocketState.CONNECTED && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message: WSMessage = JSON.parse(data);

      // Handle ACK messages
      if (message.type === WSMessageType.ACK) {
        return;
      }

      // Route to appropriate handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error('Error in message handler:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.state = WebSocketState.RECONNECTING;
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    this.notifyConnectionHandlers(WebSocketState.RECONNECTING);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        this.notifyError(error);
      });
    }, delay);
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        const heartbeat: HeartbeatMessage = {
          type: WSMessageType.HEARTBEAT,
          agentId: 'client',
          timestamp: new Date().toISOString()
        };

        try {
          this.ws?.send(JSON.stringify(heartbeat));
        } catch (error) {
          console.error('Error sending heartbeat:', error);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Queue message for later delivery
   */
  private queueMessage(message: string): void {
    this.messageQueue.push({
      message,
      timestamp: Date.now()
    });

    // Remove old messages if queue is too large
    while (this.messageQueue.length > this.config.messageQueueSize) {
      this.messageQueue.shift();
    }
  }

  /**
   * Flush message queue
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const item = this.messageQueue.shift();
      if (item) {
        try {
          this.ws?.send(item.message);
        } catch (error) {
          // Re-queue if send fails
          this.messageQueue.unshift(item);
          break;
        }
      }
    }
  }

  /**
   * Notify connection state handlers
   */
  private notifyConnectionHandlers(state: WebSocketState): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(state);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  /**
   * Notify error handlers
   */
  private notifyError(error: Error): void {
    this.errorHandler.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      state: this.state,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      isConnected: this.isConnected()
    };
  }
}

/**
 * Create a default Claw WebSocket client
 */
export function createClawWebSocketClient(
  apiKey: string,
  url?: string
): ClawWebSocketClient {
  return new ClawWebSocketClient({
    url: url || 'wss://api.claw.superinstance.ai/ws',
    apiKey
  });
}

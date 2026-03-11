/**
 * Universal Platform Adapter Base Class
 *
 * Abstract base class for all platform adapters in the Universal Integration Protocol.
 * Provides common functionality and enforces consistent interface across platforms.
 */

import {
  UIPMessage,
  PlatformType,
  PlatformCapabilities,
  SendResult,
  StateSyncOperation,
  StateScope,
  MessageType,
  CURRENT_PROTOCOL_VERSION
} from '../protocol/types.js';

/**
 * Adapter configuration
 */
export interface AdapterConfig {
  platform: PlatformType;
  adapterId: string;
  credentials: Record<string, string>;
  options?: {
    autoConnect?: boolean;
    reconnectAttempts?: number;
    messageQueueSize?: number;
    stateSyncInterval?: number;
    debug?: boolean;
  };
  capabilities?: Partial<PlatformCapabilities>;
}

/**
 * Adapter connection state
 */
export enum AdapterState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  DISABLED = 'disabled'
}

/**
 * Adapter event types
 */
export enum AdapterEvent {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_SENT = 'message_sent',
  ERROR = 'error',
  STATE_CHANGED = 'state_changed'
}

/**
 * Adapter event listener
 */
export type AdapterEventListener = (event: AdapterEvent, data?: unknown) => void;

/**
 * Abstract base class for all platform adapters
 */
export abstract class UniversalPlatformAdapter {
  // Configuration
  protected config: AdapterConfig;
  protected capabilities: PlatformCapabilities;

  // State
  protected state: AdapterState = AdapterState.DISCONNECTED;
  protected messageQueue: UIPMessage[] = [];
  protected eventListeners: Map<AdapterEvent, AdapterEventListener[]> = new Map();

  // Platform-specific state
  protected platformState: Map<string, unknown> = new Map();
  protected sessionState: Map<string, unknown> = new Map();
  protected userState: Map<string, unknown> = new Map();

  /**
   * Constructor
   */
  constructor(config: AdapterConfig) {
    this.config = config;
    this.capabilities = this.initializeCapabilities(config.capabilities);
  }

  // ============================================================================
  // Public Interface (Required by all adapters)
  // ============================================================================

  /**
   * Get platform type
   */
  get platform(): PlatformType {
    return this.config.platform;
  }

  /**
   * Get adapter ID
   */
  get adapterId(): string {
    return this.config.adapterId;
  }

  /**
   * Get adapter capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return this.capabilities;
  }

  /**
   * Get current connection state
   */
  getState(): AdapterState {
    return this.state;
  }

  /**
   * Initialize the adapter
   */
  abstract initialize(): Promise<void>;

  /**
   * Connect to the platform
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the platform
   */
  abstract disconnect(): Promise<void>;

  /**
   * Check if adapter is connected
   */
  isConnected(): boolean {
    return this.state === AdapterState.CONNECTED;
  }

  /**
   * Send a message through the adapter
   */
  abstract send(message: UIPMessage): Promise<SendResult>;

  /**
   * Register message receiver callback
   */
  abstract receive(callback: (message: UIPMessage) => Promise<void>): void;

  // ============================================================================
  // State Management (Optional but recommended)
  // ============================================================================

  /**
   * Get state value
   */
  async getStateValue(scope: StateScope, key?: string): Promise<unknown> {
    const stateMap = this.getStateMap(scope);

    if (key) {
      return stateMap.get(key);
    }

    // Return all state if no key specified
    return Object.fromEntries(stateMap.entries());
  }

  /**
   * Set state value
   */
  async setStateValue(scope: StateScope, key: string, value: unknown): Promise<void> {
    const stateMap = this.getStateMap(scope);
    stateMap.set(key, value);

    // Emit state changed event
    this.emitEvent(AdapterEvent.STATE_CHANGED, { scope, key, value });
  }

  /**
   * Synchronize state with operations
   */
  async syncState(operations: StateSyncOperation[]): Promise<void> {
    for (const op of operations) {
      await this.applyStateOperation(op);
    }
  }

  /**
   * Clear state
   */
  async clearState(scope: StateScope, key?: string): Promise<void> {
    const stateMap = this.getStateMap(scope);

    if (key) {
      stateMap.delete(key);
    } else {
      stateMap.clear();
    }

    this.emitEvent(AdapterEvent.STATE_CHANGED, { scope, key, cleared: true });
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Add event listener
   */
  addEventListener(event: AdapterEvent, listener: AdapterEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: AdapterEvent, listener: AdapterEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  protected emitEvent(event: AdapterEvent, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event, data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  // ============================================================================
  // Message Queue Management
  // ============================================================================

  /**
   * Queue message for sending
   */
  protected queueMessage(message: UIPMessage): void {
    const maxQueueSize = this.config.options?.messageQueueSize || 100;

    if (this.messageQueue.length >= maxQueueSize) {
      // Remove oldest message if queue is full
      this.messageQueue.shift();
    }

    this.messageQueue.push(message);
  }

  /**
   * Process queued messages
   */
  protected async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          await this.send(message);
        } catch (error) {
          console.error(`Failed to send queued message:`, error);
          // Re-queue failed message
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
  }

  // ============================================================================
  // Message Validation and Transformation
  // ============================================================================

  /**
   * Validate UIP message
   */
  protected validateMessage(message: UIPMessage): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!message.id) errors.push('Message ID is required');
    if (!message.timestamp) errors.push('Timestamp is required');
    if (!message.protocolVersion) errors.push('Protocol version is required');
    if (!message.source) errors.push('Source is required');
    if (!message.target) errors.push('Target is required');
    if (!message.type) errors.push('Message type is required');

    // Check source/target structure
    if (message.source && !message.source.platform) {
      errors.push('Source platform is required');
    }
    if (message.target && !message.target.platform) {
      errors.push('Target platform is required');
    }

    // Check message size
    const messageSize = JSON.stringify(message).length;
    if (messageSize > this.capabilities.maxMessageSize) {
      errors.push(`Message size ${messageSize} exceeds maximum ${this.capabilities.maxMessageSize}`);
    }

    // Check supported message type
    if (!this.capabilities.supportedMessageTypes.includes(message.type)) {
      errors.push(`Message type ${message.type} not supported by platform`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Transform message for platform-specific format
   */
  protected abstract transformToPlatform(message: UIPMessage): Promise<unknown>;

  /**
   * Transform platform-specific message to UIP format
   */
  protected abstract transformFromPlatform(data: unknown): Promise<UIPMessage>;

  // ============================================================================
  // Protected Helper Methods
  // ============================================================================

  /**
   * Initialize capabilities with defaults and overrides
   */
  protected initializeCapabilities(overrides?: Partial<PlatformCapabilities>): PlatformCapabilities {
    const defaults: PlatformCapabilities = {
      platform: this.config.platform,
      adapterId: this.config.adapterId,
      supportedMessageTypes: [MessageType.TEXT, MessageType.COMMAND, MessageType.RESPONSE, MessageType.ERROR],
      maxMessageSize: 10 * 1024 * 1024, // 10MB
      supportsFiles: false,
      supportsRealtime: false,
      supportsStateSync: false,
      rateLimits: {
        maxRequests: 100,
        windowMs: 60000 // 1 minute
      },
      authenticationMethods: [],
      features: []
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Get state map for scope
   */
  protected getStateMap(scope: StateScope): Map<string, unknown> {
    switch (scope) {
      case StateScope.SESSION:
        return this.sessionState;
      case StateScope.USER:
        return this.userState;
      case StateScope.PLATFORM:
        return this.platformState;
      default:
        throw new Error(`Unsupported state scope: ${scope}`);
    }
  }

  /**
   * Apply state synchronization operation
   */
  protected async applyStateOperation(operation: StateSyncOperation): Promise<void> {
    const stateMap = this.getStateMap(operation.scope);

    switch (operation.operation) {
      case 'SET':
        stateMap.set(operation.key, operation.value);
        break;
      case 'UPDATE':
        const current = stateMap.get(operation.key);
        if (current && operation.value && typeof current === 'object' && typeof operation.value === 'object') {
          stateMap.set(operation.key, { ...current, ...operation.value });
        } else {
          stateMap.set(operation.key, operation.value);
        }
        break;
      case 'DELETE':
        stateMap.delete(operation.key);
        break;
      case 'MERGE':
        // Merge is similar to UPDATE but for nested objects
        const currentValue = stateMap.get(operation.key);
        if (currentValue && operation.value &&
            typeof currentValue === 'object' && typeof operation.value === 'object') {
          // Deep merge implementation would go here
          stateMap.set(operation.key, { ...currentValue, ...operation.value });
        } else {
          stateMap.set(operation.key, operation.value);
        }
        break;
      case 'CLEAR':
        stateMap.clear();
        break;
      default:
        throw new Error(`Unsupported state operation: ${operation.operation}`);
    }
  }

  /**
   * Update adapter state
   */
  protected setAdapterState(newState: AdapterState): void {
    const oldState = this.state;
    this.state = newState;

    if (oldState !== newState) {
      this.emitEvent(AdapterEvent.STATE_CHANGED, { oldState, newState });

      // Emit specific connection events
      if (newState === AdapterState.CONNECTED) {
        this.emitEvent(AdapterEvent.CONNECTED);
      } else if (newState === AdapterState.DISCONNECTED) {
        this.emitEvent(AdapterEvent.DISCONNECTED);
      }
    }
  }

  /**
   * Handle platform error
   */
  protected handlePlatformError(error: unknown, context: string): void {
    console.error(`Platform error in ${context}:`, error);
    this.emitEvent(AdapterEvent.ERROR, { context, error });

    // Update state if needed
    if (this.state === AdapterState.CONNECTED || this.state === AdapterState.CONNECTING) {
      this.setAdapterState(AdapterState.ERROR);
    }
  }

  /**
   * Create default UIP message with current timestamp and protocol version
   */
  protected createUIPMessage(
    type: MessageType,
    source: UIPMessage['source'],
    target: UIPMessage['target'],
    payload: unknown
  ): UIPMessage {
    return {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      source,
      target,
      type,
      payload,
      metadata: {
        priority: 'normal',
        ttl: 5 * 60 * 1000 // 5 minutes
      }
    };
  }

  /**
   * Generate unique message ID
   */
  protected generateMessageId(): string {
    return `${this.adapterId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
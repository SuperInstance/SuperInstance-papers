/**
 * Colony Bridge
 * Communication bridge between colonies
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  ColonyBridgeConfig,
  RetryPolicy,
  InterColonyMessage,
} from '../colony-manager/types.js';
import {
  MessageFactory,
  MessageValidator,
  MessageType,
  type MessageResponse,
} from './protocol.js';

export interface BridgeStats {
  messagesSent: number;
  messagesReceived: number;
  messagesFailed: number;
  bytesTransferred: number;
  avgLatency: number;
  lastActivity: number;
}

export class ColonyBridge extends EventEmitter {
  public readonly id: string;
  public readonly sourceColonyId: string;
  public readonly targetColonyId: string;
  public readonly config: ColonyBridgeConfig;

  private messageQueue: Map<string, InterColonyMessage> = new Map();
  private pendingResponses: Map<string, {
    resolve: (response: MessageResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private stats: BridgeStats;
  private connected: boolean = false;

  constructor(config: ColonyBridgeConfig) {
    super();

    this.id = uuidv4();
    this.sourceColonyId = config.sourceColonyId;
    this.targetColonyId = config.targetColonyId;
    this.config = config;

    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesFailed: 0,
      bytesTransferred: 0,
      avgLatency: 0,
      lastActivity: Date.now(),
    };

    this.initialize();
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  private async initialize(): Promise<void> {
    // Initialize connection based on protocol
    switch (this.config.protocol) {
      case 'direct':
        await this.initializeDirectConnection();
        break;
      case 'message_queue':
        await this.initializeMessageQueueConnection();
        break;
      case 'pubsub':
        await this.initializePubSubConnection();
        break;
      case 'federation':
        await this.initializeFederationConnection();
        break;
    }

    this.connected = true;
    this.emit('connected', { bridgeId: this.id });
  }

  private async initializeDirectConnection(): Promise<void> {
    // Direct in-memory or network connection
    // Implementation depends on the colony architecture
  }

  private async initializeMessageQueueConnection(): Promise<void> {
    // Message queue-based connection (RabbitMQ, Redis, etc.)
    // Implementation would use a message queue client
  }

  private async initializePubSubConnection(): Promise<void> {
    // Pub/Sub-based connection (NATS, Kafka, etc.)
    // Implementation would use a pub/sub client
  }

  private async initializeFederationConnection(): Promise<void> {
    // Federation-based connection
    // Implementation would use the federation layer
  }

  /**
   * Disconnect the bridge
   */
  async disconnect(): Promise<void> {
    this.connected = false;

    // Reject all pending responses
    for (const [id, pending] of this.pendingResponses) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Bridge disconnected'));
    }
    this.pendingResponses.clear();

    this.emit('disconnected', { bridgeId: this.id });
  }

  // ============================================================================
  // Message Sending
  // ============================================================================

  /**
   * Send a message
   */
  async send(message: InterColonyMessage): Promise<MessageResponse> {
    if (!this.connected) {
      throw new Error('Bridge not connected');
    }

    // Validate message
    const validation = MessageValidator.validate(message);
    if (!validation.valid) {
      throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
    }

    // Check expiration
    if (MessageValidator.isExpired(message)) {
      throw new Error('Message has expired');
    }

    // Add to queue if requires ack
    if (message.headers.requiresAck) {
      this.messageQueue.set(message.headers.id, message);
    }

    try {
      // Send with retry logic
      const response = await this.sendWithRetry(message);

      // Update stats
      this.stats.messagesSent++;
      this.stats.bytesTransferred += JSON.stringify(message).length;
      this.stats.lastActivity = Date.now();

      // Update latency
      if (response.timestamp) {
        const latency = response.timestamp - message.headers.timestamp;
        this.stats.avgLatency =
          (this.stats.avgLatency * (this.stats.messagesSent - 1) + latency) /
          this.stats.messagesSent;
      }

      // Remove from queue if acknowledged
      if (message.headers.requiresAck) {
        this.messageQueue.delete(message.headers.id);
      }

      this.emit('message_sent', { message, response });

      return response;
    } catch (error) {
      this.stats.messagesFailed++;
      this.emit('message_failed', { message, error });
      throw error;
    }
  }

  /**
   * Send a message and wait for response
   */
  async sendAndWait(message: InterColonyMessage): Promise<MessageResponse> {
    return new Promise((resolve, reject) => {
      const timeout = message.headers.timeout || 30000;

      // Store pending response
      this.pendingResponses.set(message.headers.id, {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.pendingResponses.delete(message.headers.id);
          reject(new Error(`Message timeout after ${timeout}ms`));
        }, timeout),
      });

      // Send message
      this.send(message)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          const pending = this.pendingResponses.get(message.headers.id);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingResponses.delete(message.headers.id);
          }
        });
    });
  }

  /**
   * Send with retry logic
   */
  private async sendWithRetry(message: InterColonyMessage): Promise<MessageResponse> {
    const retryPolicy = this.config.retryPolicy;
    let lastError: Error | null = null;
    let delay = retryPolicy.backoffMs;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        return await this.doSend(message);
      } catch (error) {
        lastError = error as Error;

        if (attempt < retryPolicy.maxRetries) {
          // Wait before retry
          await this.delay(delay);

          // Calculate next delay
          if (retryPolicy.exponentialBackoff) {
            delay = Math.min(delay * 2, retryPolicy.maxBackoffMs);
          }
        }
      }
    }

    throw lastError || new Error('Send failed');
  }

  /**
   * Actual send implementation
   */
  private async doSend(message: InterColonyMessage): Promise<MessageResponse> {
    // Protocol-specific sending
    switch (this.config.protocol) {
      case 'direct':
        return this.sendDirect(message);
      case 'message_queue':
        return this.sendViaQueue(message);
      case 'pubsub':
        return this.sendViaPubSub(message);
      case 'federation':
        return this.sendViaFederation(message);
      default:
        throw new Error(`Unsupported protocol: ${this.config.protocol}`);
    }
  }

  private async sendDirect(message: InterColonyMessage): Promise<MessageResponse> {
    // Direct implementation
    this.emit('outbound', message);
    return {
      success: true,
      timestamp: Date.now(),
    };
  }

  private async sendViaQueue(message: InterColonyMessage): Promise<MessageResponse> {
    // Message queue implementation
    this.emit('outbound', message);
    return {
      success: true,
      timestamp: Date.now(),
    };
  }

  private async sendViaPubSub(message: InterColonyMessage): Promise<MessageResponse> {
    // Pub/Sub implementation
    this.emit('outbound', message);
    return {
      success: true,
      timestamp: Date.now(),
    };
  }

  private async sendViaFederation(message: InterColonyMessage): Promise<MessageResponse> {
    // Federation implementation
    this.emit('outbound', message);
    return {
      success: true,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Message Receiving
  // ============================================================================

  /**
   * Handle incoming message
   */
  async receive(message: InterColonyMessage): Promise<void> {
    // Validate message
    const validation = MessageValidator.validate(message);
    if (!validation.valid) {
      this.emit('error', new Error(`Invalid message: ${validation.errors.join(', ')}`));
      return;
    }

    // Check if this is a response to a pending message
    if (message.headers.replyTo) {
      const pending = this.pendingResponses.get(message.headers.replyTo);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingResponses.delete(message.headers.replyTo);

        const response: MessageResponse = {
          success: message.headers.messageType !== MessageType.ERROR,
          payload: message.payload,
          timestamp: message.headers.timestamp,
        };

        pending.resolve(response);
        return;
      }
    }

    // Update stats
    this.stats.messagesReceived++;
    this.stats.bytesTransferred += JSON.stringify(message).length;
    this.stats.lastActivity = Date.now();

    // Emit for handlers
    this.emit('message_received', message);
    this.emit('inbound', message);

    // Send automatic ACK if required
    if (message.headers.requiresAck) {
      const ack = MessageFactory.createResponse(message, {}, true);
      await this.send(ack);
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get bridge statistics
   */
  getStats(): BridgeStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesFailed: 0,
      bytesTransferred: 0,
      avgLatency: 0,
      lastActivity: Date.now(),
    };
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get pending message count
   */
  getPendingCount(): number {
    return this.messageQueue.size + this.pendingResponses.size;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

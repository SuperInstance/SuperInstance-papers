/**
 * POLLN SPORE Protocol Implementation
 * Simple pub/sub messaging for agent coordination
 *
 * Now supports distributed backends (Redis, NATS, or in-memory)
 */

import { EventEmitter } from 'events';
import { v4 } from 'uuid';

export type TopicHandler = (message: unknown) => void | unknown;

export type Subscription = {
  id: string;
  topic: string;
  handler: TopicHandler;
  active: boolean;
}

export interface SPOREConfig {
  distributed?: boolean;
  backend?: 'memory' | 'redis' | 'nats';
  connectionString?: string;
  nodeId?: string;
}

/**
 * SPOREProtocol - Simple pub/sub for agent communication
 *
 * Supports both local (in-memory) and distributed (Redis/NATS) messaging
 */
export class SPOREProtocol extends EventEmitter {
  private subscriptions: Map<string, Subscription> = new Map();
  private messageHistory: Map<string, unknown[]> = new Map();
  private config: SPOREConfig;
  private distributedBackend: any = null;
  private distributedSubscriptions: Map<string, string> = new Map();

  constructor(config: SPOREConfig = {}) {
    super();
    this.config = {
      distributed: false,
      backend: 'memory',
      ...config,
    };
    this.subscriptions = new Map();
    this.messageHistory = new Map();

    // Initialize distributed backend if requested
    if (this.config.distributed && this.config.backend !== 'memory') {
      this.initializeDistributedBackend();
    }
  }

  /**
   * Initialize distributed backend
   */
  private async initializeDistributedBackend(): Promise<void> {
    try {
      if (this.config.backend === 'redis') {
        // Import Redis backend dynamically
        const { RedisBackend } = await import('./distributed/backend.js');
        this.distributedBackend = new RedisBackend({
          backend: 'redis',
          connectionString: this.config.connectionString,
          nodeId: this.config.nodeId || v4(),
          heartbeatIntervalMs: 5000,
          discoveryIntervalMs: 5000,
        });
        await this.distributedBackend.connect();
      } else if (this.config.backend === 'nats') {
        // Import NATS backend dynamically
        const { NATSBackend } = await import('./distributed/backend.js');
        this.distributedBackend = new NATSBackend({
          backend: 'nats',
          connectionString: this.config.connectionString,
          nodeId: this.config.nodeId || v4(),
          heartbeatIntervalMs: 5000,
          discoveryIntervalMs: 5000,
        });
        await this.distributedBackend.connect();
      }
    } catch (error) {
      this.emit('error', { message: 'Failed to initialize distributed backend', error });
      // Fallback to in-memory
      this.config.distributed = false;
      this.distributedBackend = null;
    }
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(topic: string, handler: TopicHandler): Promise<string> {
    const id = v4();
    const sub: Subscription = {
      id,
      topic,
      handler,
      active: true,
    };
    this.subscriptions.set(id, sub);

    // Also subscribe to distributed backend if available
    if (this.distributedBackend) {
      try {
        const distSubId = await this.distributedBackend.subscribe(topic, async (msg: any) => {
          if (msg.sourceNodeId !== this.config.nodeId) {
            try {
              await handler(msg.payload);
            } catch (error) {
              this.emit('error', { topic, subscriptionId: id, error });
            }
          }
        });
        this.distributedSubscriptions.set(id, distSubId);
      } catch (error) {
        this.emit('error', { message: 'Failed to subscribe to distributed backend', error });
      }
    }

    return id;
  }

  /**
   * Unubscribe from a topic
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      sub.active = false;
      this.subscriptions.delete(subscriptionId);

      // Also unsubscribe from distributed backend
      if (this.distributedBackend && this.distributedSubscriptions.has(subscriptionId)) {
        const distSubId = this.distributedSubscriptions.get(subscriptionId)!;
        try {
          await this.distributedBackend.unsubscribe(distSubId);
        } catch (error) {
          this.emit('error', { message: 'Failed to unsubscribe from distributed backend', error });
        }
        this.distributedSubscriptions.delete(subscriptionId);
      }
    }
  }

  /**
   * Publish a message to a topic
   */
  async publish(topic: string, message: unknown): Promise<void> {
    // Store in history
    if (!this.messageHistory.has(topic)) {
      this.messageHistory.set(topic, []);
    }
    this.messageHistory.get(topic)!.push({
      message,
      timestamp: Date.now()
    });

    // Emit to local subscribers
    for (const sub of this.subscriptions.values()) {
      if (sub.topic === topic && sub.active) {
        try {
          await sub.handler(message);
        } catch (error) {
          this.emit('error', { topic, subscriptionId: sub.id, error });
        }
      }
    }

    // Also publish to distributed backend if available
    if (this.distributedBackend) {
      try {
        await this.distributedBackend.publish(topic, {
          id: v4(),
          sourceNodeId: this.config.nodeId,
          channel: topic,
          payload: message,
          timestamp: Date.now(),
          requiresAck: false,
        });
      } catch (error) {
        this.emit('error', { message: 'Failed to publish to distributed backend', error });
      }
    }

    this.emit('published', { topic, message });
  }

  /**
   * Get recent messages for a topic
   */
  getHistory(topic: string, limit: number = 10): unknown[] {
    const history = this.messageHistory.get(topic) || [];
    return history.slice(-limit).map((h) => (h as { message: unknown }).message);
  }

  /**
   * Shutdown the protocol and cleanup distributed connections
   */
  async shutdown(): Promise<void> {
    // Unsubscribe from all distributed subscriptions
    for (const [subId, distSubId] of this.distributedSubscriptions) {
      if (this.distributedBackend) {
        try {
          await this.distributedBackend.unsubscribe(distSubId);
        } catch (error) {
          this.emit('error', { message: 'Failed to cleanup distributed subscription', error });
        }
      }
    }
    this.distributedSubscriptions.clear();

    // Disconnect distributed backend
    if (this.distributedBackend) {
      try {
        await this.distributedBackend.disconnect();
      } catch (error) {
        this.emit('error', { message: 'Failed to disconnect distributed backend', error });
      }
    }

    // Clear local state
    this.subscriptions.clear();
    this.messageHistory.clear();
  }

  /**
   * Check if connected to distributed backend
   */
  isDistributed(): boolean {
    return (this.config.distributed === true) && this.distributedBackend !== null;
  }

  /**
   * Get the distributed backend instance
   */
  getDistributedBackend(): any {
    return this.distributedBackend;
  }
}

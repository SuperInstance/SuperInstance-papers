/**
 * POLLN SPORE Protocol Implementation
 * Simple pub/sub messaging for agent coordination
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

/**
 * SPOREProtocol - Simple pub/sub for agent communication
 */
export class SPOREProtocol extends EventEmitter {
  private subscriptions: Map<string, Subscription> = new Map();
  private messageHistory: Map<string, unknown[]> = new Map();

  constructor() {
    super();
    this.subscriptions = new Map();
    this.messageHistory = new Map();
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic: string, handler: TopicHandler): string {
    const id = v4();
    const sub: Subscription = {
      id,
      topic,
      handler,
      active: true,
    };
    this.subscriptions.set(id, sub);
    return id;
  }

  /**
   * Unubscribe from a topic
   */
  unsubscribe(subscriptionId: string): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      sub.active = false;
      this.subscriptions.delete(subscriptionId);
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

    // Emit to all subscribers
    for (const sub of this.subscriptions.values()) {
      if (sub.topic === topic && sub.active) {
        try {
          await sub.handler(message);
        } catch (error) {
          this.emit('error', { topic, subscriptionId: sub.id, error });
        }
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
}

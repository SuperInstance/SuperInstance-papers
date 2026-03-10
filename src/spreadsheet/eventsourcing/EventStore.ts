/**
 * POLLN Event Store
 * Redis-backed event store for event sourcing
 */

import { randomUUID } from 'crypto';
import type {
  Event,
  EventMetadata,
  IEventStore,
  EventEnvelope,
  StreamInfo,
  EventStoreStats
} from './types.js';

/**
 * Event Store Configuration
 */
export interface EventStoreConfig {
  type: 'memory' | 'redis';
  redis?: {
    host: string;
    port: number;
    db?: number;
    password?: string;
  };
  retention?: {
    events: number; // max events per stream
    days: number; // max age in days
  };
}

/**
 * In-Memory Event Store
 * Simple event store implementation using memory
 */
class MemoryEventStore implements IEventStore {
  private events: Map<string, Event[]> = new Map();
  private subscribers: Map<string, Set<(event: Event) => Promise<void>>> = new Map();
  private allSubscribers: Set<(event: Event) => Promise<void>> = new Set();

  async append(aggregateId: string, events: Event[]): Promise<void> {
    const stream = this.events.get(aggregateId) || [];

    for (const event of events) {
      // Validate version
      if (event.version !== stream.length + 1) {
        throw new Error(`Version conflict: expected ${stream.length + 1}, got ${event.version}`);
      }

      stream.push(event);
    }

    this.events.set(aggregateId, stream);

    // Notify subscribers
    for (const event of events) {
      await this.notifySubscribers(event);
    }
  }

  async getEvents(aggregateId: string, fromVersion?: number): Promise<Event[]> {
    const stream = this.events.get(aggregateId) || [];
    if (fromVersion) {
      return stream.filter(e => e.version >= fromVersion);
    }
    return [...stream];
  }

  async getAllEvents(stream?: string): Promise<Event[]> {
    if (stream) {
      return await this.getEvents(stream);
    }

    const allEvents: Event[] = [];
    for (const events of this.events.values()) {
      allEvents.push(...events);
    }
    return allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  subscribe(handler: (event: Event) => Promise<void>): () => void {
    this.allSubscribers.add(handler);
    return () => {
      this.allSubscribers.delete(handler);
    };
  }

  subscribeToStream(aggregateId: string, handler: (event: Event) => Promise<void>): () => void {
    if (!this.subscribers.has(aggregateId)) {
      this.subscribers.set(aggregateId, new Set());
    }
    this.subscribers.get(aggregateId)!.add(handler);
    return () => {
      this.subscribers.get(aggregateId)?.delete(handler);
    };
  }

  private async notifySubscribers(event: Event): Promise<void> {
    // Notify all subscribers
    for (const handler of this.allSubscribers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    }

    // Notify stream-specific subscribers
    const streamSubscribers = this.subscribers.get(event.aggregateId);
    if (streamSubscribers) {
      for (const handler of streamSubscribers) {
        try {
          await handler(event);
        } catch (error) {
          console.error('Stream subscriber error:', error);
        }
      }
    }
  }

  async getStats(): Promise<EventStoreStats> {
    const totalEvents = Array.from(this.events.values())
      .reduce((sum, events) => sum + events.length, 0);

    const eventsPerStream = new Map<string, number>();
    for (const [id, events] of this.events.entries()) {
      eventsPerStream.set(id, events.length);
    }

    const allEvents = await this.getAllEvents();
    const latestEvent = allEvents[allEvents.length - 1];

    return {
      totalEvents,
      totalStreams: this.events.size,
      eventsPerStream,
      latestEvent
    };
  }
}

/**
 * Event Store Factory
 */
export class EventStoreFactory {
  private static stores: Map<string, IEventStore> = new Map();

  static create(config: EventStoreConfig = { type: 'memory' }): IEventStore {
    const key = `${config.type}:${config.redis?.host || 'localhost'}`;

    if (this.stores.has(key)) {
      return this.stores.get(key)!;
    }

    let store: IEventStore;

    switch (config.type) {
      case 'memory':
        store = new MemoryEventStore();
        break;
      // Add Redis and other implementations here
      default:
        throw new Error(`Unsupported event store type: ${config.type}`);
    }

    this.stores.set(key, store);
    return store;
  }
}

/**
 * Helper functions for event creation
 */
export class EventBuilder {
  static create(
    type: string,
    aggregateId: string,
    aggregateType: string,
    data: Record<string, unknown>,
    version: number,
    metadata?: Partial<EventMetadata>
  ): Event {
    return {
      id: randomUUID(),
      type,
      aggregateId,
      aggregateType,
      version,
      data,
      metadata: {
        correlationId: metadata?.correlationId || randomUUID(),
        causationId: metadata?.causationId,
        userId: metadata?.userId,
        timestamp: metadata?.timestamp || new Date()
      },
      timestamp: new Date()
    };
  }
}

/**
 * Event validation
 */
export class EventValidator {
  static validate(event: Event): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!event.id) {
      errors.push('Event ID is required');
    }

    if (!event.type) {
      errors.push('Event type is required');
    }

    if (!event.aggregateId) {
      errors.push('Aggregate ID is required');
    }

    if (!event.aggregateType) {
      errors.push('Aggregate type is required');
    }

    if (event.version < 1) {
      errors.push('Version must be >= 1');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateBatch(events: Event[]): { valid: boolean; errors: Map<string, string[]> } {
    const errors = new Map<string, string[]>();

    for (const event of events) {
      const result = this.validate(event);
      if (!result.valid) {
        errors.set(event.id, result.errors);
      }
    }

    return {
      valid: errors.size === 0,
      errors
    };
  }
}

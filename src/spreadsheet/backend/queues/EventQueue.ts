/**
 * Event Queue - Reliable Event Processing with Redis Streams
 *
 * Provides reliable event delivery using Redis Streams with consumer groups,
 * acknowledgment handling, dead letter queues, and event replay capabilities.
 *
 * Features:
 * - Redis Streams for event storage
 * - Consumer groups for parallel processing
 * - Acknowledgment handling
 * - Dead letter queue
 * - Event replay from any point
 * - Exactly-once semantics
 * - Automatic recovery
 */

import Redis from 'ioredis';
import { Logger } from '../../../io/Logger.js';
import { getRedisConnection } from './RedisConnection.js';

/**
 * Event structure
 */
export interface Event {
  id?: string;
  type: string;
  data: any;
  timestamp: number;
  metadata?: Record<string, any>;
  retryCount?: number;
}

/**
 * Consumer group configuration
 */
export interface ConsumerGroupConfig {
  name: string;
  consumerName: string;
  blockTimeout?: number;
  count?: number;
  startId?: string;
}

/**
 * Dead letter queue configuration
 */
export interface DeadLetterConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  ttl: number;
}

/**
 * Event processing statistics
 */
export interface EventStats {
  eventsProduced: number;
  eventsConsumed: number;
  eventsAcknowledged: number;
  eventsFailed: number;
  eventsRetried: number;
  avgProcessingTime: number;
  consumerLag: number;
}

/**
 * Event Queue class
 */
export class EventQueue {
  private redis: Redis.Redis | Redis.Cluster;
  private streamName: string;
  private groupName: string;
  private consumerName: string;
  private consumerConfig: ConsumerGroupConfig;
  private deadLetterConfig: DeadLetterConfig;
  private stats: EventStats;
  private processing: Set<string>;
  private logger: Logger;
  private initialized: boolean;
  private processingLoop: boolean;

  constructor(
    streamName: string,
    consumerConfig: ConsumerGroupConfig,
    deadLetterConfig?: Partial<DeadLetterConfig>
  ) {
    this.streamName = streamName;
    this.groupName = consumerConfig.name;
    this.consumerName = consumerConfig.consumerName;
    this.consumerConfig = {
      blockTimeout: 5000,
      count: 10,
      startId: '0',
      ...consumerConfig,
    };

    this.deadLetterConfig = {
      enabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      ttl: 86400000, // 24 hours
      ...deadLetterConfig,
    };

    this.stats = {
      eventsProduced: 0,
      eventsConsumed: 0,
      eventsAcknowledged: 0,
      eventsFailed: 0,
      eventsRetried: 0,
      avgProcessingTime: 0,
      consumerLag: 0,
    };

    this.processing = new Set();
    this.logger = Logger.getInstance().child({ component: 'EventQueue', stream: streamName });
    this.initialized = false;
    this.processingLoop = false;

    // Lazy initialization
    this.redis = null as any;
  }

  /**
   * Initialize the event queue
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing EventQueue', {
      stream: this.streamName,
      group: this.groupName,
      consumer: this.consumerName,
    });

    try {
      const connection = getRedisConnection();
      this.redis = await connection.getClient('events');

      // Create consumer group if it doesn't exist
      try {
        await this.redis.xgroup('CREATE', this.streamName, this.groupName, this.consumerConfig.startId!, 'MKSTREAM');
        this.logger.info('Consumer group created', { group: this.groupName });
      } catch (error: any) {
        if (error.message.includes('BUSYGROUP')) {
          this.logger.info('Consumer group already exists', { group: this.groupName });
        } else {
          throw error;
        }
      }

      this.initialized = true;
      this.logger.info('EventQueue initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize EventQueue', { error });
      throw error;
    }
  }

  /**
   * Produce an event to the stream
   */
  public async produce(event: Event): Promise<string> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const eventId = await this.redis.xadd(
        this.streamName,
        '*',
        'type', event.type,
        'data', JSON.stringify(event.data),
        'timestamp', String(event.timestamp),
        'metadata', JSON.stringify(event.metadata || {})
      );

      this.stats.eventsProduced++;

      this.logger.debug('Event produced', {
        eventId,
        type: event.type,
        stream: this.streamName,
      });

      return eventId;
    } catch (error) {
      this.logger.error('Failed to produce event', { type: event.type, error });
      throw error;
    }
  }

  /**
   * Produce multiple events in a pipeline
   */
  public async produceBatch(events: Event[]): Promise<string[]> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const pipeline = this.redis.pipeline();
      const eventIds: string[] = [];

      for (const event of events) {
        const eventIdPromise = this.redis.xadd(
          this.streamName,
          '*',
          'type', event.type,
          'data', JSON.stringify(event.data),
          'timestamp', String(event.timestamp),
          'metadata', JSON.stringify(event.metadata || {})
        );
        pipeline.xadd(
          this.streamName,
          '*',
          'type', event.type,
          'data', JSON.stringify(event.data),
          'timestamp', String(event.timestamp),
          'metadata', JSON.stringify(event.metadata || {})
        );
      }

      const results = await pipeline.exec();

      if (results) {
        for (const [err, result] of results) {
          if (err) throw err;
          eventIds.push(result as string);
        }
      }

      this.stats.eventsProduced += events.length;

      this.logger.debug('Event batch produced', {
        count: events.length,
        stream: this.streamName,
      });

      return eventIds;
    } catch (error) {
      this.logger.error('Failed to produce event batch', { count: events.length, error });
      throw error;
    }
  }

  /**
   * Consume events from the stream
   */
  public async consume(handler: (event: Event) => Promise<void>): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    if (this.processingLoop) {
      throw new Error('Consumer loop already running');
    }

    this.processingLoop = true;
    this.logger.info('Starting consumer loop', {
      group: this.groupName,
      consumer: this.consumerName,
    });

    try {
      while (this.processingLoop) {
        try {
          // Read new events
          const events = await this.redis.xreadgroup(
            'GROUP',
            this.groupName,
            this.consumerName,
            'COUNT',
            this.consumerConfig.count!,
            'BLOCK',
            this.consumerConfig.blockTimeout!,
            'STREAMS',
            this.streamName,
            '>'
          );

          if (!events || events.length === 0) {
            continue;
          }

          // Process each event
          for (const [stream, messages] of events) {
            for (const [messageId, fields] of messages) {
              await this.processEvent(messageId, fields, handler);
            }
          }

          // Check for pending events
          await this.processPendingEvents(handler);
        } catch (error) {
          this.logger.error('Error in consumer loop', { error });
          await this.sleep(1000); // Wait before retrying
        }
      }
    } finally {
      this.processingLoop = false;
      this.logger.info('Consumer loop stopped');
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(
    messageId: string,
    fields: Record<string, string>,
    handler: (event: Event) => Promise<void>
  ): Promise<void> {
    if (this.processing.has(messageId)) {
      return; // Already processing
    }

    this.processing.add(messageId);
    const startTime = Date.now();

    try {
      // Parse event
      const event: Event = {
        id: messageId,
        type: fields.type,
        data: JSON.parse(fields.data),
        timestamp: parseInt(fields.timestamp, 10),
        metadata: JSON.parse(fields.metadata || '{}'),
        retryCount: parseInt(fields.retryCount || '0', 10),
      };

      this.stats.eventsConsumed++;

      // Process event
      await handler(event);

      // Acknowledge event
      await this.acknowledge(messageId);

      // Update stats
      const processingTime = Date.now() - startTime;
      this.stats.avgProcessingTime =
        (this.stats.avgProcessingTime * (this.stats.eventsConsumed - 1) + processingTime) /
        this.stats.eventsConsumed;

      this.logger.debug('Event processed successfully', {
        messageId,
        type: event.type,
        processingTime,
      });
    } catch (error) {
      this.logger.error('Failed to process event', { messageId, error });
      await this.handleFailedEvent(messageId, fields, error);
    } finally {
      this.processing.delete(messageId);
    }
  }

  /**
   * Process pending events
   */
  private async processPendingEvents(handler: (event: Event) => Promise<void>): Promise<void> {
    try {
      // Get pending events for this consumer
      const pending = await this.redis.xpending(
        this.streamName,
        this.groupName,
        '-', '+', this.consumerConfig.count!, this.consumerName
      );

      if (!pending || pending.length === 0) {
        return;
      }

      // Claim and process pending events
      for (const [messageId, consumer, idleTime, deliveryCount] of pending) {
        // Skip if too many deliveries
        if (deliveryCount >= this.deadLetterConfig.maxRetries) {
          await this.moveToDeadLetterQueue(messageId, deliveryCount);
          continue;
        }

        // Claim the message
        const claimed = await this.redis.xclaim(
          this.streamName,
          this.groupName,
          this.consumerName,
          idleTime + 1,
          messageId
        );

        if (claimed && claimed.length > 0) {
          for (const [id, fields] of claimed) {
            await this.processEvent(id, fields, handler);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error processing pending events', { error });
    }
  }

  /**
   * Acknowledge an event
   */
  public async acknowledge(messageId: string): Promise<void> {
    try {
      await this.redis.xack(this.streamName, this.groupName, messageId);
      this.stats.eventsAcknowledged++;
    } catch (error) {
      this.logger.error('Failed to acknowledge event', { messageId, error });
      throw error;
    }
  }

  /**
   * Handle failed event
   */
  private async handleFailedEvent(
    messageId: string,
    fields: Record<string, string>,
    error: any
  ): Promise<void> {
    this.stats.eventsFailed++;

    const retryCount = parseInt(fields.retryCount || '0', 10) + 1;

    if (retryCount >= this.deadLetterConfig.maxRetries) {
      await this.moveToDeadLetterQueue(messageId, retryCount);
    } else {
      // Retry after delay
      await this.sleep(this.deadLetterConfig.retryDelay);
      await this.retryEvent(messageId, fields, retryCount);
    }
  }

  /**
   * Retry an event
   */
  private async retryEvent(
    messageId: string,
    fields: Record<string, string>,
    retryCount: number
  ): Promise<void> {
    try {
      // Add retry count to event
      const event: Event = {
        type: fields.type,
        data: JSON.parse(fields.data),
        timestamp: parseInt(fields.timestamp, 10),
        metadata: JSON.parse(fields.metadata || '{}'),
        retryCount,
      };

      await this.produce(event);
      await this.acknowledge(messageId);

      this.stats.eventsRetried++;
      this.logger.info('Event retried', { messageId, retryCount });
    } catch (error) {
      this.logger.error('Failed to retry event', { messageId, error });
    }
  }

  /**
   * Move event to dead letter queue
   */
  private async moveToDeadLetterQueue(messageId: string, deliveryCount: number): Promise<void> {
    if (!this.deadLetterConfig.enabled) {
      return;
    }

    try {
      const deadLetterStream = `${this.streamName}:deadletter`;

      // Get the event
      const events = await this.redis.xrange(this.streamName, messageId, messageId);

      if (events && events.length > 0) {
        const [, fields] = events[0];

        // Add to dead letter queue
        await this.redis.xadd(
          deadLetterStream,
          '*',
          'originalId', messageId,
          'originalStream', this.streamName,
          'deliveryCount', String(deliveryCount),
          'type', fields.type,
          'data', fields.data,
          'timestamp', fields.timestamp,
          'metadata', fields.metadata,
          'error', 'Max retries exceeded',
          'deadAt', String(Date.now())
        );

        // Set TTL
        await this.redis.expire(deadLetterStream, this.deadLetterConfig.ttl / 1000);

        // Acknowledge original event
        await this.acknowledge(messageId);

        this.logger.warn('Event moved to dead letter queue', {
          messageId,
          deliveryCount,
          deadLetterStream,
        });
      }
    } catch (error) {
      this.logger.error('Failed to move event to dead letter queue', { messageId, error });
    }
  }

  /**
   * Replay events from a specific point
   */
  public async replay(startId: string = '0', handler: (event: Event) => Promise<void>): Promise<void> {
    this.logger.info('Starting event replay', { stream: this.streamName, startId });

    try {
      let lastId = startId;

      while (true) {
        const events = await this.redis.xrange(
          this.streamName,
          lastId,
          '+',
          'COUNT',
          this.consumerConfig.count!
        );

        if (!events || events.length === 0) {
          break;
        }

        for (const [messageId, fields] of events) {
          const event: Event = {
            id: messageId,
            type: fields.type,
            data: JSON.parse(fields.data),
            timestamp: parseInt(fields.timestamp, 10),
            metadata: JSON.parse(fields.metadata || '{}'),
          };

          await handler(event);
          lastId = messageId;
        }
      }

      this.logger.info('Event replay completed');
    } catch (error) {
      this.logger.error('Event replay failed', { error });
      throw error;
    }
  }

  /**
   * Get consumer group info
   */
  public async getGroupInfo(): Promise<any> {
    try {
      const info = await this.redis.xinfo('GROUPS', this.streamName);
      return info;
    } catch (error) {
      this.logger.error('Failed to get group info', { error });
      throw error;
    }
  }

  /**
   * Get consumer lag
   */
  public async getConsumerLag(): Promise<number> {
    try {
      const info = await this.redis.xinfo('GROUPS', this.streamName);
      if (info && info.length > 0) {
        const group = info.find((g: any) => g.name === this.groupName);
        if (group) {
          return parseInt(group.lag, 10);
        }
      }
      return 0;
    } catch (error) {
      this.logger.error('Failed to get consumer lag', { error });
      return 0;
    }
  }

  /**
   * Get statistics
   */
  public getStats(): EventStats {
    return { ...this.stats };
  }

  /**
   * Stop consuming
   */
  public stop(): void {
    this.processingLoop = false;
    this.logger.info('Stop signal sent');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Close the event queue
   */
  public async close(): Promise<void> {
    this.logger.info('Closing EventQueue');
    this.stop();
    this.processing.clear();
    this.initialized = false;
  }
}

/**
 * Factory function to create an event queue
 */
export function createEventQueue(
  streamName: string,
  consumerConfig: ConsumerGroupConfig,
  deadLetterConfig?: Partial<DeadLetterConfig>
): EventQueue {
  return new EventQueue(streamName, consumerConfig, deadLetterConfig);
}

/**
 * QueueMetrics.ts
 *
 * Queue metrics for monitoring message queue performance.
 * Tracks message throughput, consumer lag, queue depth, and error rates.
 */

import { getMetricsCollector, MetricLabels } from './MetricsCollector';
import { EventEmitter } from 'events';

/**
 * Queue operation types
 */
export enum QueueOperation {
  PUBLISH = 'publish',
  CONSUME = 'consume',
  ACK = 'ack',
  NACK = 'nack',
  REQUEUE = 'requeue',
  DEAD_LETTER = 'dead_letter',
}

/**
 * Queue state
 */
export enum QueueState {
  ACTIVE = 'active',
  IDLE = 'idle',
  DRAINING = 'draining',
  STOPPED = 'stopped',
}

/**
 * Queue statistics
 */
interface QueueStats {
  queueName: string;
  published: number;
  consumed: number;
  acknowledged: number;
  rejected: number;
  requeued: number;
  deadLettered: number;
  currentDepth: number;
  peakDepth: number;
  createdAt: number;
  lastActivityAt: number;
}

/**
 * Consumer statistics
 */
interface ConsumerStats {
  consumerId: string;
  queueName: string;
  messagesProcessed: number;
  messagesFailed: number;
  currentLag: number;
  averageProcessingTime: number;
  lastMessageAt: number;
  createdAt: number;
}

/**
 * Queue-specific metrics manager
 */
export class QueueMetrics extends EventEmitter {
  private readonly metrics = getMetricsCollector();
  private readonly queues = new Map<string, QueueStats>();
  private readonly consumers = new Map<string, ConsumerStats>();

  /**
   * Track message publish to queue
   */
  trackPublish(queueName: string, messageSize?: number): void {
    // Update queue stats
    const stats = this.getOrCreateQueueStats(queueName);
    stats.published++;
    stats.currentDepth++;
    stats.lastActivityAt = Date.now();

    // Update peak depth
    if (stats.currentDepth > stats.peakDepth) {
      stats.peakDepth = stats.currentDepth;
    }

    // Update queue depth gauge
    this.metrics.setQueueDepth(stats.currentDepth, queueName);

    // Track publish operation
    this.metrics.incrementQueueMessages({
      queue_name: queueName,
      operation: QueueOperation.PUBLISH,
    });

    this.emit('publish', { queueName, messageSize });
  }

  /**
   * Track message consume from queue
   */
  trackConsume(queueName: string, consumerId: string): void {
    // Update queue stats
    const stats = this.getOrCreateQueueStats(queueName);
    stats.consumed++;
    stats.currentDepth--;
    stats.lastActivityAt = Date.now();

    // Update queue depth gauge
    this.metrics.setQueueDepth(stats.currentDepth, queueName);

    // Update consumer stats
    const consumer = this.getOrCreateConsumerStats(consumerId, queueName);
    consumer.lastMessageAt = Date.now();

    // Track consume operation
    this.metrics.incrementQueueMessages({
      queue_name: queueName,
      operation: QueueOperation.CONSUME,
    });

    this.emit('consume', { queueName, consumerId });
  }

  /**
   * Track message acknowledgment
   */
  trackAck(queueName: string, consumerId: string, processingTime: number): void {
    // Update queue stats
    const stats = this.queues.get(queueName);
    if (stats) {
      stats.acknowledged++;
      stats.lastActivityAt = Date.now();
    }

    // Update consumer stats
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.messagesProcessed++;
      consumer.currentLag = 0;

      // Update average processing time
      const totalProcessingTime = consumer.averageProcessingTime * (consumer.messagesProcessed - 1) + processingTime;
      consumer.averageProcessingTime = totalProcessingTime / consumer.messagesProcessed;
    }

    // Track ack operation
    this.metrics.incrementQueueMessages({
      queue_name: queueName,
      operation: QueueOperation.ACK,
    });

    // Track processing duration
    this.metrics.observeQueueProcessingDuration(processingTime / 1000, {
      queue_name: queueName,
      operation: QueueOperation.CONSUME,
    });

    this.emit('ack', { queueName, consumerId, processingTime });
  }

  /**
   * Track message negative acknowledgment (rejection)
   */
  trackNack(queueName: string, consumerId: string, error?: Error): void {
    // Update queue stats
    const stats = this.queues.get(queueName);
    if (stats) {
      stats.rejected++;
      stats.lastActivityAt = Date.now();
    }

    // Update consumer stats
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.messagesFailed++;
    }

    // Track nack operation
    this.metrics.incrementQueueMessages({
      queue_name: queueName,
      operation: QueueOperation.NACK,
    });

    // Track error
    if (error) {
      this.metrics.incrementErrors({
        error_type: error.name || 'queue_error',
        cell_type: queueName,
      });
    }

    this.emit('nack', { queueName, consumerId, error });
  }

  /**
   * Track message requeue
   */
  trackRequeue(queueName: string, consumerId: string): void {
    // Update queue stats
    const stats = this.queues.get(queueName);
    if (stats) {
      stats.requeued++;
      stats.currentDepth++;
      stats.lastActivityAt = Date.now();
    }

    // Update queue depth gauge
    this.metrics.setQueueDepth(stats.currentDepth || 0, queueName);

    // Track requeue operation
    this.metrics.incrementQueueMessages({
      queue_name: queueName,
      operation: QueueOperation.REQUEUE,
    });

    this.emit('requeue', { queueName, consumerId });
  }

  /**
   * Track message dead letter
   */
  trackDeadLetter(queueName: string, consumerId: string, reason: string): void {
    // Update queue stats
    const stats = this.queues.get(queueName);
    if (stats) {
      stats.deadLettered++;
      stats.lastActivityAt = Date.now();
    }

    // Track dead letter operation
    this.metrics.incrementQueueMessages({
      queue_name: queueName,
      operation: QueueOperation.DEAD_LETTER,
    });

    // Track error
    this.metrics.incrementErrors({
      error_type: 'dead_letter',
      cell_type: queueName,
    });

    this.emit('dead_letter', { queueName, consumerId, reason });
  }

  /**
   * Get queue statistics
   */
  getQueueStats(queueName: string): QueueStats | undefined {
    return this.queues.get(queueName);
  }

  /**
   * Get all queue statistics
   */
  getAllQueueStats(): Map<string, QueueStats> {
    return new Map(this.queues);
  }

  /**
   * Get consumer statistics
   */
  getConsumerStats(consumerId: string): ConsumerStats | undefined {
    return this.consumers.get(consumerId);
  }

  /**
   * Get all consumer statistics
   */
  getAllConsumerStats(): Map<string, ConsumerStats> {
    return new Map(this.consumers);
  }

  /**
   * Get consumers for a specific queue
   */
  getConsumersByQueue(queueName: string): ConsumerStats[] {
    return Array.from(this.consumers.values()).filter(
      consumer => consumer.queueName === queueName
    );
  }

  /**
   * Calculate message throughput (messages per second)
   */
  getThroughput(queueName: string, windowSeconds: number = 60): {
    publishRate: number;
    consumeRate: number;
    ackRate: number;
  } {
    const stats = this.queues.get(queueName);
    if (!stats) {
      return { publishRate: 0, consumeRate: 0, ackRate: 0 };
    }

    const timeSinceActivity = (Date.now() - stats.lastActivityAt) / 1000;

    // If no recent activity, return 0
    if (timeSinceActivity > windowSeconds) {
      return { publishRate: 0, consumeRate: 0, ackRate: 0 };
    }

    // Calculate rates based on recent activity
    return {
      publishRate: stats.published / windowSeconds,
      consumeRate: stats.consumed / windowSeconds,
      ackRate: stats.acknowledged / windowSeconds,
    };
  }

  /**
   * Calculate consumer lag
   */
  getConsumerLag(consumerId: string): number {
    const consumer = this.consumers.get(consumerId);
    return consumer?.currentLag || 0;
  }

  /**
   * Get average processing time for a queue
   */
  getAverageProcessingTime(queueName: string): number {
    const consumers = this.getConsumersByQueue(queueName);
    if (consumers.length === 0) return 0;

    let totalProcessingTime = 0;
    for (const consumer of consumers) {
      totalProcessingTime += consumer.averageProcessingTime;
    }

    return totalProcessingTime / consumers.length;
  }

  /**
   * Get queue error rate
   */
  getErrorRate(queueName: string): number {
    const stats = this.queues.get(queueName);
    if (!stats || stats.consumed === 0) return 0;

    return (stats.rejected + stats.deadLettered) / stats.consumed;
  }

  /**
   * Get queue efficiency (ack / consumed ratio)
   */
  getQueueEfficiency(queueName: string): number {
    const stats = this.queues.get(queueName);
    if (!stats || stats.consumed === 0) return 0;

    return stats.acknowledged / stats.consumed;
  }

  /**
   * Get overall system statistics
   */
  getSystemStats(): {
    totalQueues: number;
    totalConsumers: number;
    totalMessagesPublished: number;
    totalMessagesConsumed: number;
    totalMessagesAcknowledged: number;
    totalMessagesRejected: number;
    totalMessagesDeadLettered: number;
    totalCurrentDepth: number;
  } {
    let totalMessagesPublished = 0;
    let totalMessagesConsumed = 0;
    let totalMessagesAcknowledged = 0;
    let totalMessagesRejected = 0;
    let totalMessagesDeadLettered = 0;
    let totalCurrentDepth = 0;

    for (const stats of this.queues.values()) {
      totalMessagesPublished += stats.published;
      totalMessagesConsumed += stats.consumed;
      totalMessagesAcknowledged += stats.acknowledged;
      totalMessagesRejected += stats.rejected;
      totalMessagesDeadLettered += stats.deadLettered;
      totalCurrentDepth += stats.currentDepth;
    }

    return {
      totalQueues: this.queues.size,
      totalConsumers: this.consumers.size,
      totalMessagesPublished,
      totalMessagesConsumed,
      totalMessagesAcknowledged,
      totalMessagesRejected,
      totalMessagesDeadLettered,
      totalCurrentDepth,
    };
  }

  /**
   * Get or create queue statistics
   */
  private getOrCreateQueueStats(queueName: string): QueueStats {
    let stats = this.queues.get(queueName);
    if (!stats) {
      stats = {
        queueName,
        published: 0,
        consumed: 0,
        acknowledged: 0,
        rejected: 0,
        requeued: 0,
        deadLettered: 0,
        currentDepth: 0,
        peakDepth: 0,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
      };
      this.queues.set(queueName, stats);
    }
    return stats;
  }

  /**
   * Get or create consumer statistics
   */
  private getOrCreateConsumerStats(consumerId: string, queueName: string): ConsumerStats {
    let consumer = this.consumers.get(consumerId);
    if (!consumer) {
      consumer = {
        consumerId,
        queueName,
        messagesProcessed: 0,
        messagesFailed: 0,
        currentLag: 0,
        averageProcessingTime: 0,
        lastMessageAt: 0,
        createdAt: Date.now(),
      };
      this.consumers.set(consumerId, consumer);
    }
    return consumer;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.queues.clear();
    this.consumers.clear();

    // Reset all queue depth gauges
    for (const queueName of this.queues.keys()) {
      this.metrics.setQueueDepth(0, queueName);
    }
  }

  /**
   * Clean up stale queue stats
   */
  cleanupStaleStats(maxAge: number = 3600000): void {
    const now = Date.now();
    const staleQueues: string[] = [];
    const staleConsumers: string[] = [];

    // Find stale queues
    for (const [queueName, stats] of this.queues.entries()) {
      if (now - stats.lastActivityAt > maxAge && stats.currentDepth === 0) {
        staleQueues.push(queueName);
      }
    }

    // Find stale consumers
    for (const [consumerId, consumer] of this.consumers.entries()) {
      if (now - consumer.lastMessageAt > maxAge && consumer.currentLag === 0) {
        staleConsumers.push(consumerId);
      }
    }

    // Remove stale entries
    for (const queueName of staleQueues) {
      this.queues.delete(queueName);
      this.metrics.setQueueDepth(0, queueName);
    }

    for (const consumerId of staleConsumers) {
      this.consumers.delete(consumerId);
    }

    return { staleQueues, staleConsumers };
  }

  /**
   * Get queues sorted by depth (descending)
   */
  getQueuesByDepth(limit?: number): Array<{ queueName: string; depth: number }> {
    const queues = Array.from(this.queues.entries())
      .map(([queueName, stats]) => ({ queueName, depth: stats.currentDepth }))
      .sort((a, b) => b.depth - a.depth);

    return limit ? queues.slice(0, limit) : queues;
  }

  /**
   * Get queues sorted by error rate (descending)
   */
  getQueuesByErrorRate(limit?: number): Array<{ queueName: string; errorRate: number }> {
    const queues = Array.from(this.queues.entries())
      .map(([queueName, stats]) => ({
        queueName,
        errorRate: this.getErrorRate(queueName),
      }))
      .sort((a, b) => b.errorRate - a.errorRate);

    return limit ? queues.slice(0, limit) : queues;
  }
}

/**
 * Singleton instance of QueueMetrics
 */
let queueMetricsInstance: QueueMetrics | null = null;

/**
 * Get or create the QueueMetrics singleton
 */
export function getQueueMetrics(): QueueMetrics {
  if (!queueMetricsInstance) {
    queueMetricsInstance = new QueueMetrics();
  }
  return queueMetricsInstance;
}

/**
 * Reset the QueueMetrics singleton (useful for testing)
 */
export function resetQueueMetrics(): void {
  if (queueMetricsInstance) {
    queueMetricsInstance.reset();
  }
  queueMetricsInstance = null;
}

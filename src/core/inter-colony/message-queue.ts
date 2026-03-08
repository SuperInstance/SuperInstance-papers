/**
 * Inter-Colony Message Queue
 * Reliable message delivery between colonies
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { InterColonyMessage } from '../colony-manager/types.js';
import { MessageValidator } from './protocol.js';

export interface QueuedMessage {
  id: string;
  message: InterColonyMessage;
  priority: number;
  attempts: number;
  maxAttempts: number;
  nextAttempt: number;
  createdAt: number;
  lastAttempt?: number;
  status: 'pending' | 'processing' | 'delivered' | 'failed';
}

export interface MessageQueueConfig {
  maxSize: number;
  maxAttempts: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  persistent: boolean;
  compressionEnabled: boolean;
}

export class MessageQueue extends EventEmitter {
  public readonly id: string;
  private config: MessageQueueConfig;
  private queue: Map<string, QueuedMessage> = new Map();
  private processing: Set<string> = new Set();
  private processed: Set<string> = new Set();
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<MessageQueueConfig> = {}) {
    super();

    this.id = uuidv4();
    this.config = {
      maxSize: config.maxSize || 10000,
      maxAttempts: config.maxAttempts || 3,
      retryDelayMs: config.retryDelayMs || 1000,
      maxRetryDelayMs: config.maxRetryDelayMs || 60000,
      persistent: config.persistent || false,
      compressionEnabled: config.compressionEnabled || false,
    };

    if (this.config.persistent) {
      this.loadFromStorage();
    }

    this.startProcessing();
  }

  // ============================================================================
  // Queue Operations
  // ============================================================================

  /**
   * Enqueue a message
   */
  async enqueue(message: InterColonyMessage, priority: number = 0.5): Promise<string> {
    // Check queue size
    if (this.queue.size >= this.config.maxSize) {
      throw new Error('Message queue is full');
    }

    // Validate message
    const validation = MessageValidator.validate(message);
    if (!validation.valid) {
      throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
    }

    const queuedMessage: QueuedMessage = {
      id: message.headers.id,
      message,
      priority,
      attempts: 0,
      maxAttempts: this.config.maxAttempts,
      nextAttempt: Date.now(),
      createdAt: Date.now(),
      status: 'pending',
    };

    this.queue.set(queuedMessage.id, queuedMessage);

    if (this.config.persistent) {
      this.saveToStorage();
    }

    this.emit('enqueued', queuedMessage);

    return queuedMessage.id;
  }

  /**
   * Dequeue a message for processing
   */
  async dequeue(): Promise<QueuedMessage | null> {
    const now = Date.now();

    // Find highest priority message ready for processing
    let selected: QueuedMessage | null = null;
    let highestPriority = -1;

    for (const msg of this.queue.values()) {
      if (
        msg.status === 'pending' &&
        msg.nextAttempt <= now &&
        msg.priority > highestPriority &&
        !this.processing.has(msg.id)
      ) {
        selected = msg;
        highestPriority = msg.priority;
      }
    }

    if (!selected) {
      return null;
    }

    // Mark as processing
    selected.status = 'processing';
    selected.lastAttempt = now;
    this.processing.add(selected.id);

    if (this.config.persistent) {
      this.saveToStorage();
    }

    this.emit('dequeued', selected);

    return selected;
  }

  /**
   * Mark a message as delivered
   */
  async markDelivered(messageId: string): Promise<void> {
    const queued = this.queue.get(messageId);
    if (!queued) {
      throw new Error(`Message not found: ${messageId}`);
    }

    queued.status = 'delivered';
    this.processing.delete(messageId);
    this.processed.add(messageId);

    // Remove from queue after a delay
    setTimeout(() => {
      this.queue.delete(messageId);
      if (this.config.persistent) {
        this.saveToStorage();
      }
    }, 60000); // Keep for 1 minute

    if (this.config.persistent) {
      this.saveToStorage();
    }

    this.emit('delivered', queued);
  }

  /**
   * Mark a message as failed
   */
  async markFailed(messageId: string, permanent: boolean = false): Promise<void> {
    const queued = this.queue.get(messageId);
    if (!queued) {
      throw new Error(`Message not found: ${messageId}`);
    }

    queued.attempts++;

    if (permanent || queued.attempts >= queued.maxAttempts) {
      // Permanently failed
      queued.status = 'failed';
      this.processing.delete(messageId);

      this.emit('failed', queued);
    } else {
      // Retry later
      queued.status = 'pending';
      this.processing.delete(messageId);

      // Calculate next attempt time with exponential backoff
      const delay = Math.min(
        this.config.retryDelayMs * Math.pow(2, queued.attempts),
        this.config.maxRetryDelayMs
      );
      queued.nextAttempt = Date.now() + delay;

      this.emit('retry_scheduled', queued);
    }

    if (this.config.persistent) {
      this.saveToStorage();
    }
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Enqueue multiple messages
   */
  async enqueueBatch(messages: Array<{ message: InterColonyMessage; priority?: number }>): Promise<string[]> {
    const ids: string[] = [];

    for (const { message, priority = 0.5 } of messages) {
      const id = await this.enqueue(message, priority);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Dequeue multiple messages
   */
  async dequeueBatch(limit: number = 10): Promise<QueuedMessage[]> {
    const messages: QueuedMessage[] = [];

    for (let i = 0; i < limit; i++) {
      const msg = await this.dequeue();
      if (!msg) break;
      messages.push(msg);
    }

    return messages;
  }

  // ============================================================================
  // Queue Processing
  // ============================================================================

  /**
   * Start automatic processing
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(async () => {
      while (true) {
        const msg = await this.dequeue();
        if (!msg) break;

        this.emit('process', msg);
      }
    }, 100); // Process every 100ms
  }

  /**
   * Stop automatic processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // ============================================================================
  // Queue Queries
  // ============================================================================

  /**
   * Get queue size
   */
  getSize(): number {
    return this.queue.size;
  }

  /**
   * Get processing count
   */
  getProcessingCount(): number {
    return this.processing.size;
  }

  /**
   * Get pending count
   */
  getPendingCount(): number {
    let count = 0;
    for (const msg of this.queue.values()) {
      if (msg.status === 'pending') count++;
    }
    return count;
  }

  /**
   * Get message status
   */
  getMessageStatus(messageId: string): QueuedMessage | null {
    return this.queue.get(messageId) || null;
  }

  /**
   * Get all messages
   */
  getAllMessages(): QueuedMessage[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get messages by status
   */
  getMessagesByStatus(status: QueuedMessage['status']): QueuedMessage[] {
    return Array.from(this.queue.values()).filter(msg => msg.status === status);
  }

  // ============================================================================
  // Queue Maintenance
  // ============================================================================

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue.clear();
    this.processing.clear();
    this.processed.clear();

    if (this.config.persistent) {
      this.saveToStorage();
    }

    this.emit('cleared');
  }

  /**
   * Remove old delivered messages
   */
  cleanup(maxAge: number = 3600000): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, msg] of this.queue) {
      if (msg.status === 'delivered' && now - msg.createdAt > maxAge) {
        this.queue.delete(id);
        removed++;
      }
    }

    if (removed > 0 && this.config.persistent) {
      this.saveToStorage();
    }

    return removed;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    delivered: number;
    failed: number;
  } {
    let pending = 0;
    let processing = 0;
    let delivered = 0;
    let failed = 0;

    for (const msg of this.queue.values()) {
      switch (msg.status) {
        case 'pending':
          pending++;
          break;
        case 'processing':
          processing++;
          break;
        case 'delivered':
          delivered++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }

    return {
      total: this.queue.size,
      pending,
      processing,
      delivered,
      failed,
    };
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private saveToStorage(): void {
    // Implementation would persist to disk or database
    // This is a placeholder for the actual implementation
  }

  private loadFromStorage(): void {
    // Implementation would load from disk or database
    // This is a placeholder for the actual implementation
  }

  /**
   * Shutdown the queue
   */
  shutdown(): void {
    this.stopProcessing();

    if (this.config.persistent) {
      this.saveToStorage();
    }

    this.removeAllListeners();
  }
}

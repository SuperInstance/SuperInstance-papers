/**
 * POLLN Distributed Backend
 * Abstract backend interface with Redis, NATS, and in-memory implementations
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  DistributedConfig,
  DistributedMessage,
  NodeInfo,
} from './types.js';
import {
  ConnectionError,
  NodeUnavailableError,
} from './types.js';

// ============================================================================
// ABSTRACT BACKEND INTERFACE
// ============================================================================

export abstract class DistributedBackend extends EventEmitter {
  protected config: DistributedConfig;
  protected connected: boolean = false;

  constructor(config: DistributedConfig) {
    super();
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract publish(channel: string, message: DistributedMessage): Promise<void>;
  abstract subscribe(channel: string, callback: (message: DistributedMessage) => void): Promise<string>;
  abstract unsubscribe(subscriptionId: string): Promise<void>;
  abstract set(key: string, value: unknown, ttl?: number): Promise<void>;
  abstract get(key: string): Promise<unknown>;
  abstract delete(key: string): Promise<boolean>;
  abstract exists(key: string): Promise<boolean>;
  abstract keys(pattern: string): Promise<string[]>;

  isConnected(): boolean {
    return this.connected;
  }

  protected createMessage(
    channel: string,
    payload: unknown,
    targetNodeId?: string
  ): DistributedMessage {
    return {
      id: uuidv4(),
      sourceNodeId: this.config.nodeId,
      targetNodeId,
      channel,
      payload,
      timestamp: Date.now(),
      requiresAck: false,
    };
  }
}

// ============================================================================
// IN-MEMORY BACKEND (Fallback for development)
// ============================================================================

export class MemoryBackend extends DistributedBackend {
  private subscriptions: Map<string, Map<string, (message: DistributedMessage) => void>> = new Map();
  private storage: Map<string, { value: unknown; expiresAt?: number }> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: DistributedConfig) {
    super(config);
    this.connected = false;
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.emit('connected');
    this.startCleanup();
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.subscriptions.clear();
    this.storage.clear();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.emit('disconnected');
  }

  async publish(channel: string, message: DistributedMessage): Promise<void> {
    if (!this.connected) {
      throw new ConnectionError('Backend not connected');
    }

    const channelSubs = this.subscriptions.get(channel);
    if (channelSubs) {
      for (const [subId, callback] of channelSubs) {
        try {
          await callback(message);
        } catch (error) {
          this.emit('error', { subscriptionId: subId, error });
        }
      }
    }
  }

  async subscribe(
    channel: string,
    callback: (message: DistributedMessage) => void
  ): Promise<string> {
    if (!this.connected) {
      throw new ConnectionError('Backend not connected');
    }

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Map());
    }

    const subId = uuidv4();
    this.subscriptions.get(channel)!.set(subId, callback);
    return subId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    for (const channel of this.subscriptions.keys()) {
      const channelSubs = this.subscriptions.get(channel);
      if (channelSubs?.has(subscriptionId)) {
        channelSubs.delete(subscriptionId);
        break;
      }
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const entry = { value, expiresAt: ttl ? Date.now() + ttl : undefined };
    this.storage.set(key, entry);
  }

  async get(key: string): Promise<unknown> {
    const entry = this.storage.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.storage.delete(key);
      return null;
    }

    return entry.value;
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.storage.get(key);
    if (!entry) {
      return false;
    }

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.storage.delete(key);
      return false;
    }

    return true;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const allKeys = Array.from(this.storage.keys());
    return allKeys.filter(key => regex.test(key));
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.storage.entries()) {
        if (entry.expiresAt && entry.expiresAt < now) {
          this.storage.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }
}

// ============================================================================
// REDIS BACKEND
// ============================================================================

export class RedisBackend extends DistributedBackend {
  private client: any;
  private subscriber: any;
  private subscriptions: Map<string, string> = new Map();

  constructor(config: DistributedConfig) {
    super(config);
    // Lazy import - only load redis if used
    try {
      const redis = require('redis');
      this.client = redis.createClient({ url: config.connectionString });
      this.subscriber = redis.createClient({ url: config.connectionString });
    } catch (error) {
      throw new ConnectionError('Redis not available. Install with: npm install redis');
    }
  }

  async connect(): Promise<void> {
    try {
      await Promise.all([this.client.connect(), this.subscriber.connect()]);
      this.subscriber.on('message', (channel: string, message: string) => {
        const subs = this.subscriptions.get(channel);
        if (subs) {
          try {
            const msg = JSON.parse(message) as DistributedMessage;
            this.emit('message', channel, msg);
          } catch (error) {
            this.emit('error', { channel, error });
          }
        }
      });
      this.connected = true;
      this.emit('connected');
    } catch (error) {
      throw new ConnectionError(`Failed to connect to Redis: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    await Promise.all([this.client.quit(), this.subscriber.quit()]);
    this.connected = false;
    this.subscriptions.clear();
    this.emit('disconnected');
  }

  async publish(channel: string, message: DistributedMessage): Promise<void> {
    if (!this.connected) {
      throw new ConnectionError('Redis not connected');
    }
    await this.client.publish(channel, JSON.stringify(message));
  }

  async subscribe(
    channel: string,
    callback: (message: DistributedMessage) => void
  ): Promise<string> {
    if (!this.connected) {
      throw new ConnectionError('Redis not connected');
    }

    const subId = uuidv4();
    await this.subscriber.subscribe(channel);
    this.subscriptions.set(subId, channel);

    this.once('message', (msgChannel, msg) => {
      if (msgChannel === channel) {
        callback(msg);
      }
    });

    return subId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const channel = this.subscriptions.get(subscriptionId);
    if (channel) {
      await this.subscriber.unsubscribe(channel);
      this.subscriptions.delete(subscriptionId);
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.client.setEx(key, ttl / 1000, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async get(key: string): Promise<unknown> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.client.del(key);
    return result > 0;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result > 0;
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }
}

// ============================================================================
// NATS BACKEND
// ============================================================================

export class NATSBackend extends DistributedBackend {
  private nc: any;
  private subscriptions: Map<string, { subscription: any; channel: string }> = new Map();

  constructor(config: DistributedConfig) {
    super(config);
    try {
      const { connect } = require('nats');
      this.nc = connect({ servers: config.connectionString });
    } catch (error) {
      throw new ConnectionError('NATS not available. Install with: npm install nats');
    }
  }

  async connect(): Promise<void> {
    try {
      await this.nc;
      this.connected = true;
      this.emit('connected');
    } catch (error) {
      throw new ConnectionError(`Failed to connect to NATS: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    for (const { subscription } of this.subscriptions.values()) {
      await subscription.unsubscribe();
    }
    this.subscriptions.clear();

    const nc = await this.nc;
    await nc.close();
    this.connected = false;
    this.emit('disconnected');
  }

  async publish(channel: string, message: DistributedMessage): Promise<void> {
    if (!this.connected) {
      throw new ConnectionError('NATS not connected');
    }
    const nc = await this.nc;
    nc.publish(channel, JSON.stringify(message));
  }

  async subscribe(
    channel: string,
    callback: (message: DistributedMessage) => void
  ): Promise<string> {
    if (!this.connected) {
      throw new ConnectionError('NATS not connected');
    }

    const subId = uuidv4();
    const nc = await this.nc;
    const subscription = nc.subscribe(channel, {
      callback: (err: Error, msg: any) => {
        if (err) {
          this.emit('error', { channel, error: err });
          return;
        }
        try {
          const data = JSON.parse(msg.data) as DistributedMessage;
          callback(data);
        } catch (error) {
          this.emit('error', { channel, error });
        }
      },
    });

    this.subscriptions.set(subId, { subscription, channel });
    return subId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      await sub.subscription.unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    // NATS JetStream KV store would be used here
    // For now, use in-memory fallback
    throw new Error('NATS KV store not implemented. Use memory or Redis backend.');
  }

  async get(key: string): Promise<unknown> {
    throw new Error('NATS KV store not implemented. Use memory or Redis backend.');
  }

  async delete(key: string): Promise<boolean> {
    throw new Error('NATS KV store not implemented. Use memory or Redis backend.');
  }

  async exists(key: string): Promise<boolean> {
    throw new Error('NATS KV store not implemented. Use memory or Redis backend.');
  }

  async keys(pattern: string): Promise<string[]> {
    throw new Error('NATS KV store not implemented. Use memory or Redis backend.');
  }
}

// ============================================================================
// BACKEND FACTORY
// ============================================================================

export function createBackend(config: DistributedConfig): DistributedBackend {
  switch (config.backend) {
    case 'redis':
      return new RedisBackend(config);
    case 'nats':
      return new NATSBackend(config);
    case 'memory':
    default:
      return new MemoryBackend(config);
  }
}

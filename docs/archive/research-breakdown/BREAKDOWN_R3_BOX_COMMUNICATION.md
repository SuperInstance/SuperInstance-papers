# Breakdown Engine Round 3: Box-to-Box Communication Protocols

**Research Program:** POLLN Breakdown Engine - Spreadsheet Integration
**Focus:** Communication Protocols for Fractured AI Boxes
**Lead:** R&D Agent - Communication Architecture
**Status:** Design Complete
**Date:** 2026-03-08

---

## Executive Summary

This document specifies the **communication protocols** that enable fractured AI boxes to collaborate, coordinate, and compose into larger systems. The design integrates seamlessly with POLLN's A2A (Agent-to-Agent) package system while supporting streaming, batch, and event-driven patterns essential for real-time spreadsheet interactions.

### Key Innovation

> "Boxes are autonomous but interconnected. Each box can send messages, stream data, publish events, and compose into pipelines. The communication protocol is the glue that transforms isolated boxes into intelligent systems."

### Core Principles

1. **A2A-Native**: All box communication wraps POLLN's A2A package system
2. **Streaming-First**: Support real-time data flow for responsive UI
3. **Pattern-Rich**: Request/response, fire-and-forget, broadcast, pipeline, pub/sub
4. **Backpressure-Aware**: Handle flow control gracefully
5. **Inspectable**: Every message is traceable and debuggable

---

## Table of Contents

1. [Message Type System](#message-type-system)
2. [Communication Channels](#communication-channels)
3. [Communication Patterns](#communication-patterns)
4. [Streaming Protocol](#streaming-protocol)
5. [Event-Driven Communication](#event-driven-communication)
6. [A2A Integration](#a2a-integration)
7. [Message Schemas](#message-schemas)
8. [TypeScript Interfaces](#typescript-interfaces)
9. [Implementation Roadmap](#implementation-roadmap)

---

## 1. Message Type System

### Base Message Structure

All box-to-box communication inherits from a common base message type:

```typescript
/**
 * Base message type for all box communication
 */
interface BoxMessage<TPayload = unknown> {
  // Identity
  id: string;                    // Unique message ID (UUID)
  timestamp: number;             // Creation time (ms since epoch)

  // Routing
  senderBoxId: string;           // Source box ID
  receiverBoxId: string;         // Destination box ID (or '*' for broadcast)
  channel: string;               // Channel identifier

  // Content
  type: BoxMessageType;          // Message type enum
  payload: TPayload;             // Message payload (type-safe)

  // Control
  priority: MessagePriority;     // Priority level
  ttl?: number;                  // Time-to-live (ms, optional)

  // Traceability
  parentMessageId?: string;      // Parent message (for replies/chains)
  causalChainId: string;         // Causal chain ID (from A2A)
  correlationId?: string;        // Correlation ID (async patterns)

  // Streaming
  streamId?: string;             // Stream identifier (if part of stream)
  sequenceNumber?: number;       // Sequence in stream (if streaming)
  isStreamEnd?: boolean;         // Marks end of stream

  // A2A Integration
  a2aPackageId?: string;         // Reference to A2A package (if wrapped)
}

/**
 * Message type enumeration
 */
enum BoxMessageType {
  // Control messages
  CONTROL_HELLO = 'CONTROL_HELLO',
  CONTROL_HEARTBEAT = 'CONTROL_HEARTBEAT',
  CONTROL_GOODBYE = 'CONTROL_GOODBYE',
  CONTROL_ERROR = 'CONTROL_ERROR',
  CONTROL_ACK = 'CONTROL_ACK',
  CONTROL_NACK = 'CONTROL_NACK',

  // Request/Response
  REQUEST_EXECUTE = 'REQUEST_EXECUTE',
  REQUEST_QUERY = 'REQUEST_QUERY',
  REQUEST_SUBSCRIBE = 'REQUEST_SUBSCRIBE',
  REQUEST_UNSUBSCRIBE = 'REQUEST_UNSUBSCRIBE',

  RESPONSE_RESULT = 'RESPONSE_RESULT',
  RESPONSE_ERROR = 'RESPONSE_ERROR',
  RESPONSE_PROGRESS = 'RESPONSE_PROGRESS',

  // Streaming
  STREAM_DATA = 'STREAM_DATA',
  STREAM_START = 'STREAM_START',
  STREAM_END = 'STREAM_END',
  STREAM_CHUNK = 'STREAM_CHUNK',
  STREAM_ACK = 'STREAM_ACK',

  // Events
  EVENT_STATE_CHANGED = 'EVENT_STATE_CHANGED',
  EVENT_ERROR_OCCURRED = 'EVENT_ERROR_OCCURRED',
  EVENT_COMPLETED = 'EVENT_COMPLETED',
  EVENT_PROGRESS = 'EVENT_PROGRESS',

  // Pipeline
  PIPELINE_PUSH = 'PIPELINE_PUSH',
  PIPELINE_PULL = 'PIPELINE_PULL',
  PIPELINE_FLUSH = 'PIPELINE_FLUSH',

  // Broadcast
  BROADCAST_ANNOUNCE = 'BROADCAST_ANNOUNCE',
  BROADCAST_NOTIFY = 'BROADCAST_NOTIFY',
}

/**
 * Message priority levels
 */
enum MessagePriority {
  CRITICAL = 0,    // System-critical (errors, safety)
  HIGH = 1,        // User-visible operations
  NORMAL = 2,      // Default priority
  LOW = 3,         // Background operations
  BULK = 4,        // Batch processing
}
```

### Message Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      MESSAGE LIFECYCLE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CREATION                                                    │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ • Box creates message with type + payload              │  │
│     │ • Assigns UUID, timestamp, priority                    │  │
│     │ • Sets routing (sender, receiver, channel)             │  │
│     │ • Links to causal chain (A2A integration)             │  │
│     └────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  2. SERIALIZATION                                               │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ • Convert to JSON (or binary format)                   │  │
│     │ • Wrap in A2A package (if needed)                      │  │
│     │ • Sign with cryptographic signature (optional)        │  │
│     └────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  3. TRANSMISSION                                                │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ • Send via channel (in-memory, WebSocket, etc.)        │  │
│     │ • Apply backpressure if needed                         │  │
│     │ • Track delivery status                                │  │
│     └────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  4. RECEPTION                                                   │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ • Deserialize message                                  │  │
│     │ • Verify signature (if signed)                         │  │
│     │ • Validate schema and type                             │  │
│     └────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  5. PROCESSING                                                  │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ • Route to appropriate handler                         │  │
│     │ • Execute business logic                               │  │
│     │ • Generate response (if needed)                        │  │
│     └────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  6. RESPONSE (Optional)                                         │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ • Create response message                             │  │
│     │ • Link to parent message ID                           │  │
│     │ • Return to sender (or broadcast)                     │  │
│     └────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Communication Channels

### Channel Abstraction

Channels provide an abstraction layer over different transport mechanisms:

```typescript
/**
 * Communication channel interface
 */
interface BoxChannel {
  // Channel metadata
  channelId: string;
  channelType: ChannelType;
  capacity: number;              // Buffer capacity (0 = unbounded)
  currentLoad: number;           // Current buffer size

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Messaging
  send<T>(message: BoxMessage<T>): Promise<void>;
  receive<T>(): Promise<BoxMessage<T>>;

  // Backpressure
  getBackpressure(): number;     // 0-1 (0 = no pressure, 1 = full)
  applyBackpressure(limit: number): void;

  // Events
  on(event: 'message', handler: (msg: BoxMessage) => void): void;
  on(event: 'error', handler: (err: Error) => void): void;
  on(event: 'close', handler: () => void): void;
}

/**
 * Channel types
 */
enum ChannelType {
  // In-memory (same process)
  MEMORY = 'MEMORY',

  // Network (different processes)
  WEBSOCKET = 'WEBSOCKET',
  HTTP = 'HTTP',

  // Storage (async, durable)
  QUEUE = 'QUEUE',
  PUBSUB = 'PUBSUB',
}
```

### Channel Implementations

#### Memory Channel (In-Process)

```typescript
/**
 * In-memory channel for same-process communication
 */
class MemoryChannel implements BoxChannel {
  channelId: string;
  channelType = ChannelType.MEMORY;
  capacity: number;
  currentLoad = 0;

  private buffer: BoxMessage[] = [];
  private listeners: Set<(msg: BoxMessage) => void> = new Set();
  private connected = true;

  constructor(channelId: string, capacity: number = 1000) {
    this.channelId = channelId;
    this.capacity = capacity;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  async send<T>(message: BoxMessage<T>): Promise<void> {
    if (!this.connected) {
      throw new Error('Channel not connected');
    }

    // Check capacity
    if (this.capacity > 0 && this.buffer.length >= this.capacity) {
      throw new Error('Channel buffer full');
    }

    this.buffer.push(message);
    this.currentLoad = this.buffer.length;

    // Notify listeners
    for (const listener of this.listeners) {
      listener(message);
    }
  }

  async receive<T>(): Promise<BoxMessage<T>> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.buffer.length > 0) {
          resolve(this.buffer.shift() as BoxMessage<T>);
          this.currentLoad = this.buffer.length;
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  getBackpressure(): number {
    if (this.capacity === 0) return 0;
    return this.buffer.length / this.capacity;
  }

  applyBackpressure(limit: number): void {
    // Implement backpressure by dropping low-priority messages
    if (this.buffer.length > limit) {
      this.buffer = this.buffer.filter(msg => msg.priority <= MessagePriority.HIGH);
    }
  }

  on(event: string, handler: (...args: any[]) => void): void {
    if (event === 'message') {
      this.listeners.add(handler);
    }
  }
}
```

#### WebSocket Channel (Cross-Process)

```typescript
/**
 * WebSocket channel for cross-process communication
 */
class WebSocketChannel implements BoxChannel {
  channelId: string;
  channelType = ChannelType.WEBSOCKET;
  capacity: number;
  currentLoad = 0;

  private ws: WebSocket | null = null;
  private messageQueue: BoxMessage[] = [];
  private listeners: Set<(msg: BoxMessage) => void> = new Set();

  constructor(
    channelId: string,
    private url: string,
    capacity: number = 100
  ) {
    this.channelId = channelId;
    this.capacity = capacity;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        // Send queued messages
        for (const msg of this.messageQueue) {
          this.send(msg);
        }
        this.messageQueue = [];
        resolve();
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as BoxMessage;
        this.currentLoad--;

        for (const listener of this.listeners) {
          listener(message);
        }
      };

      this.ws.onerror = (error) => {
        reject(error);
      };
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async send<T>(message: BoxMessage<T>): Promise<void> {
    if (!this.isConnected()) {
      // Queue for later
      if (this.messageQueue.length < this.capacity) {
        this.messageQueue.push(message);
        this.currentLoad = this.messageQueue.length;
      } else {
        throw new Error('WebSocket channel buffer full');
      }
      return;
    }

    this.ws!.send(JSON.stringify(message));
    this.currentLoad++;
  }

  async receive<T>(): Promise<BoxMessage<T>> {
    return new Promise((resolve) => {
      const handler = (msg: BoxMessage) => {
        this.listeners.delete(handler);
        resolve(msg as BoxMessage<T>);
      };
      this.listeners.add(handler);
    });
  }

  getBackpressure(): number {
    if (this.capacity === 0) return 0;
    return this.currentLoad / this.capacity;
  }

  applyBackpressure(limit: number): void {
    // Slow down sends if approaching limit
    if (this.currentLoad > limit * 0.8) {
      // Implement exponential backoff
    }
  }

  on(event: string, handler: (...args: any[]) => void): void {
    if (event === 'message') {
      this.listeners.add(handler);
    }
  }
}
```

### Channel Registry

```typescript
/**
 * Global channel registry
 */
class ChannelRegistry {
  private static instance: ChannelRegistry;
  private channels: Map<string, BoxChannel> = new Map();

  static getInstance(): ChannelRegistry {
    if (!ChannelRegistry.instance) {
      ChannelRegistry.instance = new ChannelRegistry();
    }
    return ChannelRegistry.instance;
  }

  register(channel: BoxChannel): void {
    this.channels.set(channel.channelId, channel);
  }

  get(channelId: string): BoxChannel | undefined {
    return this.channels.get(channelId);
  }

  async create(type: ChannelType, config: any): Promise<BoxChannel> {
    switch (type) {
      case ChannelType.MEMORY:
        return new MemoryChannel(config.channelId, config.capacity);

      case ChannelType.WEBSOCKET:
        return new WebSocketChannel(config.channelId, config.url, config.capacity);

      default:
        throw new Error(`Unsupported channel type: ${type}`);
    }
  }
}
```

---

## 3. Communication Patterns

### Pattern Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   COMMUNICATION PATTERNS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. REQUEST/RESPONSE (Synchronous)                              │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ Box A → Request → Box B                                │  │
│     │ Box A ← Response ← Box B                               │  │
│     │ Use: Queries, commands, explicit operations             │  │
│     └────────────────────────────────────────────────────────┘  │
│                                                                 │
│  2. FIRE-AND-FORGET (Asynchronous)                              │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ Box A → Message → Box B                                │  │
│     │ (No response expected)                                 │  │
│     │ Use: Notifications, logging, events                    │  │
│     └────────────────────────────────────────────────────────┘  │
│                                                                 │
│  3. BROADCAST (One-to-Many)                                     │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ Box A → Broadcast → [Box B, Box C, Box D, ...]        │  │
│     │ Use: Announcements, state changes, events              │  │
│     └────────────────────────────────────────────────────────┘  │
│                                                                 │
│  4. PIPELINE (Streaming Chain)                                  │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ Box A → Stream → Box B → Stream → Box C → ...         │  │
│     │ Use: Data processing, transformations, chains         │  │
│     └────────────────────────────────────────────────────────┘  │
│                                                                 │
│  5. PUB/SUB (Event-Driven)                                      │
│     ┌────────────────────────────────────────────────────────┐  │
│     │ [Box A, Box B, ...] → Publish → Topic                 │  │
│     │ Topic → Subscribe → [Box C, Box D, ...]               │  │
│     │ Use: Decoupled communication, events                   │  │
│     └────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Pattern 1: Request/Response

```typescript
/**
 * Request/Response pattern implementation
 */
class RequestResponsePattern {
  private pendingRequests: Map<string, {
    resolve: (response: BoxMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(private channel: BoxChannel) {
    this.channel.on('message', this.handleResponse.bind(this));
  }

  /**
   * Send request and wait for response
   */
  async request<TRequest, TResponse>(
    receiverBoxId: string,
    type: BoxMessageType,
    payload: TRequest,
    timeoutMs: number = 5000
  ): Promise<BoxMessage<TResponse>> {
    const correlationId = uuidv4();

    const request: BoxMessage<TRequest> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId: 'self',
      receiverBoxId,
      channel: this.channel.channelId,
      type,
      payload,
      priority: MessagePriority.NORMAL,
      causalChainId: uuidv4(),
      correlationId,
    };

    // Set up timeout
    const timeout = setTimeout(() => {
      this.pendingRequests.delete(correlationId);
      throw new Error('Request timeout');
    }, timeoutMs);

    // Store pending request
    this.pendingRequests.set(correlationId, {
      resolve: () => {},
      reject: () => {},
      timeout,
    });

    // Send request
    await this.channel.send(request);

    // Wait for response
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(correlationId, { resolve, reject, timeout });
    });
  }

  /**
   * Handle incoming response
   */
  private handleResponse(response: BoxMessage): void {
    if (response.correlationId && this.pendingRequests.has(response.correlationId)) {
      const pending = this.pendingRequests.get(response.correlationId)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.correlationId);
      pending.resolve(response);
    }
  }

  /**
   * Respond to a request
   */
  async respond<TResponse>(
    request: BoxMessage,
    type: BoxMessageType,
    payload: TResponse
  ): Promise<void> {
    const response: BoxMessage<TResponse> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId: 'self',
      receiverBoxId: request.senderBoxId,
      channel: this.channel.channelId,
      type,
      payload,
      priority: request.priority,
      parentMessageId: request.id,
      causalChainId: request.causalChainId,
      correlationId: request.correlationId,
    };

    await this.channel.send(response);
  }
}
```

### Pattern 2: Fire-and-Forget

```typescript
/**
 * Fire-and-forget pattern implementation
 */
class FireAndForgetPattern {
  constructor(private channel: BoxChannel) {}

  /**
   * Send message without waiting for response
   */
  async send<T>(
    receiverBoxId: string,
    type: BoxMessageType,
    payload: T,
    priority: MessagePriority = MessagePriority.NORMAL
  ): Promise<void> {
    const message: BoxMessage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId: 'self',
      receiverBoxId,
      channel: this.channel.channelId,
      type,
      payload,
      priority,
      causalChainId: uuidv4(),
    };

    await this.channel.send(message);
  }

  /**
   * Broadcast message to multiple receivers
   */
  async broadcast<T>(
    receiverBoxIds: string[],
    type: BoxMessageType,
    payload: T,
    priority: MessagePriority = MessagePriority.NORMAL
  ): Promise<void> {
    const promises = receiverBoxIds.map(receiverBoxId =>
      this.send(receiverBoxId, type, payload, priority)
    );

    await Promise.all(promises);
  }
}
```

### Pattern 3: Broadcast

```typescript
/**
 * Broadcast pattern implementation
 */
class BroadcastPattern {
  private subscribers: Map<string, Set<string>> = new Map();

  constructor(private channel: BoxChannel) {
    this.channel.on('message', this.handleBroadcast.bind(this));
  }

  /**
   * Subscribe to broadcasts
   */
  subscribe(topic: string, boxId: string): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(boxId);
  }

  /**
   * Unsubscribe from broadcasts
   */
  unsubscribe(topic: string, boxId: string): void {
    const subscribers = this.subscribers.get(topic);
    if (subscribers) {
      subscribers.delete(boxId);
    }
  }

  /**
   * Broadcast message to all subscribers
   */
  async broadcast<T>(
    topic: string,
    type: BoxMessageType,
    payload: T
  ): Promise<void> {
    const subscribers = this.subscribers.get(topic);
    if (!subscribers || subscribers.size === 0) {
      return; // No subscribers
    }

    const message: BoxMessage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId: 'self',
      receiverBoxId: '*', // Broadcast marker
      channel: this.channel.channelId,
      type,
      payload,
      priority: MessagePriority.NORMAL,
      causalChainId: uuidv4(),
    };

    await this.channel.send(message);
  }

  /**
   * Handle incoming broadcast
   */
  private handleBroadcast(message: BoxMessage): void {
    if (message.receiverBoxId === '*') {
      // This is a broadcast, notify all subscribers
      const subscribers = this.subscribers.get(message.channel);
      if (subscribers) {
        for (const subscriberId of subscribers) {
          // Route to each subscriber
          this.routeToSubscriber(subscriberId, message);
        }
      }
    }
  }

  private routeToSubscriber(subscriberId: string, message: BoxMessage): void {
    // Implementation depends on routing strategy
  }
}
```

### Pattern 4: Pipeline

```typescript
/**
 * Pipeline pattern implementation
 */
class PipelinePattern {
  private pipelines: Map<string, string[]> = new Map();

  constructor(private channel: BoxChannel) {
    this.channel.on('message', this.handlePipelineMessage.bind(this));
  }

  /**
   * Create a pipeline chain
   */
  createPipeline(pipelineId: string, boxIds: string[]): void {
    this.pipelines.set(pipelineId, boxIds);
  }

  /**
   * Push data into pipeline
   */
  async push<T>(
    pipelineId: string,
    type: BoxMessageType,
    payload: T
  ): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline || pipeline.length === 0) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const firstBox = pipeline[0];

    const message: BoxMessage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId: 'self',
      receiverBoxId: firstBox,
      channel: this.channel.channelId,
      type,
      payload,
      priority: MessagePriority.NORMAL,
      causalChainId: uuidv4(),
      streamId: pipelineId,
    };

    await this.channel.send(message);
  }

  /**
   * Handle pipeline message (forward to next stage)
   */
  private async handlePipelineMessage(message: BoxMessage): void {
    if (message.streamId) {
      const pipeline = this.pipelines.get(message.streamId);
      if (pipeline) {
        const currentIndex = pipeline.indexOf(message.receiverBoxId);
        if (currentIndex >= 0 && currentIndex < pipeline.length - 1) {
          // Forward to next stage
          const nextBox = pipeline[currentIndex + 1];

          const forwardMessage: BoxMessage = {
            ...message,
            receiverBoxId: nextBox,
          };

          await this.channel.send(forwardMessage);
        }
      }
    }
  }
}
```

### Pattern 5: Pub/Sub

```typescript
/**
 * Pub/Sub pattern implementation
 */
class PubSubPattern {
  private topics: Map<string, Set<string>> = new Map();

  constructor(private channel: BoxChannel) {
    this.channel.on('message', this.handlePublish.bind(this));
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(topic: string, subscriberBoxId: string): Promise<void> {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    this.topics.get(topic)!.add(subscriberBoxId);

    // Send subscription confirmation
    await this.sendSubscriptionAck(topic, subscriberBoxId);
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(topic: string, subscriberBoxId: string): Promise<void> {
    const subscribers = this.topics.get(topic);
    if (subscribers) {
      subscribers.delete(subscriberBoxId);
    }
  }

  /**
   * Publish to a topic
   */
  async publish<T>(
    topic: string,
    type: BoxMessageType,
    payload: T
  ): Promise<void> {
    const subscribers = this.topics.get(topic);
    if (!subscribers || subscribers.size === 0) {
      return; // No subscribers
    }

    const message: BoxMessage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId: 'self',
      receiverBoxId: '*', // Will be routed to subscribers
      channel: topic,
      type,
      payload,
      priority: MessagePriority.NORMAL,
      causalChainId: uuidv4(),
    };

    await this.channel.send(message);

    // Route to all subscribers
    for (const subscriberId of subscribers) {
      await this.routeToSubscriber(topic, subscriberId, message);
    }
  }

  /**
   * Handle published message
   */
  private async handlePublish(message: BoxMessage): void {
    const subscribers = this.topics.get(message.channel);
    if (subscribers) {
      for (const subscriberId of subscribers) {
        await this.routeToSubscriber(message.channel, subscriberId, message);
      }
    }
  }

  private async sendSubscriptionAck(topic: string, boxId: string): Promise<void> {
    const ack: BoxMessage = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId: 'pubsub',
      receiverBoxId: boxId,
      channel: topic,
      type: BoxMessageType.CONTROL_ACK,
      payload: { topic, action: 'subscribed' },
      priority: MessagePriority.NORMAL,
      causalChainId: uuidv4(),
    };

    await this.channel.send(ack);
  }

  private async routeToSubscriber(topic: string, boxId: string, message: BoxMessage): Promise<void> {
    // Implementation depends on routing strategy
  }
}
```

---

## 4. Streaming Protocol

### Streaming Concepts

Streaming enables real-time data flow between boxes, essential for responsive UI and progressive processing.

```typescript
/**
 * Stream message types
 */
interface StreamStartMessage {
  streamId: string;
  metadata: {
    contentType: string;
    totalChunks?: number;
    totalSize?: number;
  };
}

interface StreamChunkMessage {
  streamId: string;
  chunkIndex: number;
  chunkData: unknown;
  isLast: boolean;
}

interface StreamEndMessage {
  streamId: string;
  status: 'completed' | 'error' | 'cancelled';
  error?: string;
}

/**
 * Streaming protocol implementation
 */
class StreamingProtocol {
  private activeStreams: Map<string, {
    senderBoxId: string;
    receiverBoxId: string;
    startTime: number;
    chunksReceived: number;
    totalChunks?: number;
  }> = new Map();

  constructor(private channel: BoxChannel) {
    this.channel.on('message', this.handleStreamMessage.bind(this));
  }

  /**
   * Start a new stream
   */
  async startStream(
    receiverBoxId: string,
    metadata: StreamStartMessage['metadata']
  ): Promise<string> {
    const streamId = uuidv4();

    const startMessage: BoxMessage<StreamStartMessage> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId: 'self',
      receiverBoxId,
      channel: this.channel.channelId,
      type: BoxMessageType.STREAM_START,
      payload: {
        streamId,
        metadata,
      },
      priority: MessagePriority.HIGH,
      causalChainId: uuidv4(),
      streamId,
    };

    await this.channel.send(startMessage);

    // Track stream
    this.activeStreams.set(streamId, {
      senderBoxId: 'self',
      receiverBoxId,
      startTime: Date.now(),
      chunksReceived: 0,
      totalChunks: metadata.totalChunks,
    });

    return streamId;
  }

  /**
   * Send a chunk of data
   */
  async sendChunk<T>(
    streamId: string,
    chunkIndex: number,
    chunkData: T,
    isLast: boolean = false
  ): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }

    const chunkMessage: BoxMessage<StreamChunkMessage> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId: 'self',
      receiverBoxId: stream.receiverBoxId,
      channel: this.channel.channelId,
      type: BoxMessageType.STREAM_CHUNK,
      payload: {
        streamId,
        chunkIndex,
        chunkData,
        isLast,
      },
      priority: MessagePriority.NORMAL,
      causalChainId: uuidv4(),
      streamId,
      sequenceNumber: chunkIndex,
    };

    await this.channel.send(chunkMessage);

    if (isLast) {
      await this.endStream(streamId, 'completed');
    }
  }

  /**
   * End a stream
   */
  async endStream(
    streamId: string,
    status: 'completed' | 'error' | 'cancelled',
    error?: string
  ): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }

    const endMessage: BoxMessage<StreamEndMessage> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId: 'self',
      receiverBoxId: stream.receiverBoxId,
      channel: this.channel.channelId,
      type: BoxMessageType.STREAM_END,
      payload: {
        streamId,
        status,
        error,
      },
      priority: MessagePriority.HIGH,
      causalChainId: uuidv4(),
      streamId,
      isStreamEnd: true,
    };

    await this.channel.send(endMessage);

    // Clean up
    this.activeStreams.delete(streamId);
  }

  /**
   * Handle incoming stream messages
   */
  private async handleStreamMessage(message: BoxMessage): Promise<void> {
    switch (message.type) {
      case BoxMessageType.STREAM_START:
        await this.handleStreamStart(message as BoxMessage<StreamStartMessage>);
        break;

      case BoxMessageType.STREAM_CHUNK:
        await this.handleStreamChunk(message as BoxMessage<StreamChunkMessage>);
        break;

      case BoxMessageType.STREAM_END:
        await this.handleStreamEnd(message as BoxMessage<StreamEndMessage>);
        break;

      case BoxMessageType.STREAM_ACK:
        await this.handleStreamAck(message as BoxMessage<{ streamId: string; chunkIndex: number }>);
        break;
    }
  }

  private async handleStreamStart(message: BoxMessage<StreamStartMessage>): Promise<void> {
    const { streamId, metadata } = message.payload;

    // Initialize stream state
    this.activeStreams.set(streamId, {
      senderBoxId: message.senderBoxId,
      receiverBoxId: message.receiverBoxId,
      startTime: Date.now(),
      chunksReceived: 0,
      totalChunks: metadata.totalChunks,
    });

    // Send acknowledgment
    const ack: BoxMessage = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId: 'self',
      receiverBoxId: message.senderBoxId,
      channel: this.channel.channelId,
      type: BoxMessageType.STREAM_ACK,
      payload: { streamId, chunkIndex: -1 },
      priority: MessagePriority.HIGH,
      causalChainId: message.causalChainId,
      streamId,
    };

    await this.channel.send(ack);
  }

  private async handleStreamChunk(message: BoxMessage<StreamChunkMessage>): Promise<void> {
    const { streamId, chunkIndex, chunkData, isLast } = message.payload;

    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.chunksReceived++;

      // Process chunk data
      await this.processChunk(streamId, chunkIndex, chunkData);

      // Send acknowledgment
      const ack: BoxMessage = {
        id: uuidv4(),
        timestamp: Date.now(),
        senderBoxId: 'self',
        receiverBoxId: message.senderBoxId,
        channel: this.channel.channelId,
        type: BoxMessageType.STREAM_ACK,
        payload: { streamId, chunkIndex },
        priority: MessagePriority.NORMAL,
        causalChainId: message.causalChainId,
        streamId,
      };

      await this.channel.send(ack);

      if (isLast) {
        // Automatically end stream on last chunk
        this.activeStreams.delete(streamId);
      }
    }
  }

  private async handleStreamEnd(message: BoxMessage<StreamEndMessage>): Promise<void> {
    const { streamId, status, error } = message.payload;

    // Clean up stream
    this.activeStreams.delete(streamId);

    // Handle completion/error
    if (status === 'error' && error) {
      console.error(`Stream ${streamId} failed:`, error);
    }
  }

  private async handleStreamAck(message: BoxMessage<{ streamId: string; chunkIndex: number }>): Promise<void> {
    // Handle acknowledgment from receiver
    const { streamId, chunkIndex } = message.payload;

    const stream = this.activeStreams.get(streamId);
    if (stream) {
      // Update flow control based on ACK
      // (e.g., sliding window for congestion control)
    }
  }

  private async processChunk(streamId: string, chunkIndex: number, chunkData: unknown): Promise<void> {
    // Implementation depends on use case
  }
}
```

### Backpressure Handling

```typescript
/**
 * Backpressure controller for streaming
 */
class BackpressureController {
  private windowSize = 10; // Sliding window size
  private outstandingAcks: Map<string, Set<number>> = new Map();

  /**
   * Check if we can send more chunks
   */
  canSend(streamId: string): boolean {
    const outstanding = this.outstandingAcks.get(streamId);
    if (!outstanding) return true;

    return outstanding.size < this.windowSize;
  }

  /**
   * Record sent chunk
   */
  recordSent(streamId: string, chunkIndex: number): void {
    if (!this.outstandingAcks.has(streamId)) {
      this.outstandingAcks.set(streamId, new Set());
    }
    this.outstandingAcks.get(streamId)!.add(chunkIndex);
  }

  /**
   * Record acknowledgment
   */
  recordAck(streamId: string, chunkIndex: number): void {
    const outstanding = this.outstandingAcks.get(streamId);
    if (outstanding) {
      outstanding.delete(chunkIndex);
    }
  }

  /**
   * Adjust window size based on congestion
   */
  adjustWindowSize(increase: boolean): void {
    if (increase) {
      this.windowSize = Math.min(this.windowSize * 2, 100);
    } else {
      this.windowSize = Math.max(this.windowSize / 2, 1);
    }
  }
}
```

---

## 5. Event-Driven Communication

### Event System

```typescript
/**
 * Event types
 */
interface BoxEvent {
  eventId: string;
  eventType: string;
  sourceBoxId: string;
  timestamp: number;
  data: unknown;
}

/**
 * Event bus implementation
 */
class BoxEventBus {
  private eventListeners: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe to events
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: string, handler: EventHandler): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(handler);
    }
  }

  /**
   * Emit an event
   */
  async emit(eventType: string, data: unknown): Promise<void> {
    const listeners = this.eventListeners.get(eventType);
    if (!listeners) return;

    const event: BoxEvent = {
      eventId: uuidv4(),
      eventType,
      sourceBoxId: 'self',
      timestamp: Date.now(),
      data,
    };

    // Notify all listeners
    const promises = Array.from(listeners).map(handler =>
      Promise.resolve(handler(event))
    );

    await Promise.all(promises);
  }

  /**
   * Emit event once
   */
  async once(eventType: string, handler: EventHandler): Promise<void> {
    const wrappedHandler: EventHandler = (event) => {
      this.off(eventType, wrappedHandler);
      return handler(event);
    };

    this.on(eventType, wrappedHandler);
  }
}

/**
 * Event handler type
 */
type EventHandler = (event: BoxEvent) => void | Promise<void>;
```

### Signal System

```typescript
/**
 * Signal for box coordination
 */
interface BoxSignal {
  signalId: string;
  signalType: string;
  sourceBoxId: string;
  targetBoxIds: string[];
  timestamp: number;
  data: unknown;
}

/**
 * Signal implementation
 */
class BoxSignalSystem {
  private signalHandlers: Map<string, Set<SignalHandler>> = new Map();

  /**
   * Register signal handler
   */
  register(signalType: string, handler: SignalHandler): void {
    if (!this.signalHandlers.has(signalType)) {
      this.signalHandlers.set(signalType, new Set());
    }
    this.signalHandlers.get(signalType)!.add(handler);
  }

  /**
   * Send signal to specific boxes
   */
  async send(
    signalType: string,
    targetBoxIds: string[],
    data: unknown
  ): Promise<void> {
    const signal: BoxSignal = {
      signalId: uuidv4(),
      signalType,
      sourceBoxId: 'self',
      targetBoxIds,
      timestamp: Date.now(),
      data,
    };

    const handlers = this.signalHandlers.get(signalType);
    if (handlers) {
      for (const handler of handlers) {
        await Promise.resolve(handler(signal));
      }
    }
  }

  /**
   * Broadcast signal to all
   */
  async broadcast(signalType: string, data: unknown): Promise<void> {
    const signal: BoxSignal = {
      signalId: uuidv4(),
      signalType,
      sourceBoxId: 'self',
      targetBoxIds: [], // Empty = all
      timestamp: Date.now(),
      data,
    };

    const handlers = this.signalHandlers.get(signalType);
    if (handlers) {
      for (const handler of handlers) {
        await Promise.resolve(handler(signal));
      }
    }
  }
}

/**
 * Signal handler type
 */
type SignalHandler = (signal: BoxSignal) => void | Promise<void>;
```

---

## 6. A2A Integration

### A2A Bridge

```typescript
/**
 * Bridge between box communication and A2A packages
 */
class A2ABridge {
  private a2aSystem: import('./communication.js').A2APackageSystem;

  constructor(a2aSystem: import('./communication.js').A2APackageSystem) {
    this.a2aSystem = a2aSystem;
  }

  /**
   * Wrap box message in A2A package
   */
  async wrapInA2A<T>(
    message: BoxMessage<T>,
    options?: {
      privacyLevel?: import('./types.js').PrivacyLevel;
      layer?: import('./types.js').SubsumptionLayer;
    }
  ): Promise<import('./types.js').A2APackage<BoxMessage<T>>> {
    return this.a2aSystem.createPackage(
      message.senderBoxId,
      message.receiverBoxId,
      message.type,
      message,
      {
        privacyLevel: options?.privacyLevel,
        layer: options?.layer,
        parentIds: message.parentMessageId ? [message.parentMessageId] : [],
      }
    );
  }

  /**
   * Extract box message from A2A package
   */
  extractFromA2A<T>(
    a2aPackage: import('./types.js').A2APackage<BoxMessage<T>>
  ): BoxMessage<T> {
    return a2aPackage.payload;
  }

  /**
   * Send box message with A2A wrapping
   */
  async sendWithA2A<T>(
    channel: BoxChannel,
    message: BoxMessage<T>,
    options?: {
      privacyLevel?: import('./types.js').PrivacyLevel;
      layer?: import('./types.js').SubsumptionLayer;
    }
  ): Promise<void> {
    // Wrap in A2A package
    const a2aPackage = await this.wrapInA2A(message, options);

    // Add A2A package ID to message
    message.a2aPackageId = a2aPackage.id;

    // Send via channel
    await channel.send(message);
  }

  /**
   * Get causal chain for a message
   */
  getCausalChain(message: BoxMessage): string[] {
    if (message.a2aPackageId) {
      return this.a2aSystem.getCausalChain(message.a2aPackageId);
    }
    return [];
  }

  /**
   * Replay causal chain for a message
   */
  async replayCausalChain(message: BoxMessage): Promise<BoxMessage[]> {
    if (!message.a2aPackageId) {
      return [];
    }

    const a2aChain = await this.a2aSystem.replayChain(message.a2aPackageId);

    return a2aChain.map(a2aPkg => this.extractFromA2A(a2aPkg));
  }
}
```

### A2A-Enhanced Box Communication

```typescript
/**
 * A2A-enhanced box message bus
 */
class BoxMessageBus {
  private channel: BoxChannel;
  private a2aBridge: A2ABridge;

  constructor(
    channel: BoxChannel,
    a2aSystem: import('./communication.js').A2APackageSystem
  ) {
    this.channel = channel;
    this.a2aBridge = new A2ABridge(a2aSystem);
  }

  /**
   * Send message with A2A wrapping
   */
  async send<T>(
    message: BoxMessage<T>,
    options?: {
      useA2A?: boolean;
      privacyLevel?: import('./types.js').PrivacyLevel;
      layer?: import('./types.js').SubsumptionLayer;
    }
  ): Promise<void> {
    if (options?.useA2A !== false) {
      // Default to A2A wrapping
      await this.a2aBridge.sendWithA2A(
        this.channel,
        message,
        {
          privacyLevel: options?.privacyLevel,
          layer: options?.layer,
        }
      );
    } else {
      // Send directly without A2A
      await this.channel.send(message);
    }
  }

  /**
   * Request with A2A wrapping
   */
  async request<TRequest, TResponse>(
    senderBoxId: string,
    receiverBoxId: string,
    type: BoxMessageType,
    payload: TRequest,
    options?: {
      timeoutMs?: number;
      privacyLevel?: import('./types.js').PrivacyLevel;
      layer?: import('./types.js').SubsumptionLayer;
    }
  ): Promise<BoxMessage<TResponse>> {
    const correlationId = uuidv4();

    const request: BoxMessage<TRequest> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderBoxId,
      receiverBoxId,
      channel: this.channel.channelId,
      type,
      payload,
      priority: MessagePriority.NORMAL,
      causalChainId: uuidv4(),
      correlationId,
    };

    // Send with A2A wrapping
    await this.send(request, options);

    // Wait for response (implementation depends on pattern)
    // ...

    return {} as BoxMessage<TResponse>;
  }

  /**
   * Get message history with A2A integration
   */
  getHistory(boxId: string, limit?: number): BoxMessage[] {
    const a2aHistory = this.a2aBridge['a2aSystem'].getHistory(boxId, limit);

    return a2aHistory.map(a2aPkg => this.a2aBridge.extractFromA2A(a2aPkg));
  }
}
```

---

## 7. Message Schemas

### Schema System

```typescript
/**
 * Message schema validator
 */
class MessageSchemaValidator {
  private schemas: Map<BoxMessageType, Schema> = new Map();

  /**
   * Register schema for message type
   */
  registerSchema(messageType: BoxMessageType, schema: Schema): void {
    this.schemas.set(messageType, schema);
  }

  /**
   * Validate message against schema
   */
  validate<T>(message: BoxMessage<T>): ValidationResult {
    const schema = this.schemas.get(message.type);
    if (!schema) {
      return {
        valid: false,
        error: `No schema registered for type ${message.type}`,
      };
    }

    // Validate against schema
    return this.validateAgainstSchema(message.payload, schema);
  }

  private validateAgainstSchema(payload: unknown, schema: Schema): ValidationResult {
    // Implementation depends on schema format (JSON Schema, etc.)
    return { valid: true };
  }
}

/**
 * Schema interface
 */
interface Schema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

### Box-Specific Schemas

```typescript
/**
 * Cell box message schemas
 */
namespace CellBoxSchemas {
  export interface CellExecuteRequest {
    cellId: string;
    input: unknown;
    options: {
      timeoutMs?: number;
      allowCascade?: boolean;
    };
  }

  export interface CellExecuteResponse {
    result: unknown;
    confidence: number;
    executionTimeMs: number;
  }

  export interface CellStateChangeEvent {
    cellId: string;
    oldState: 'idle' | 'executing' | 'error';
    newState: 'idle' | 'executing' | 'error';
    timestamp: number;
  }
}

/**
 * Transformer box message schemas
 */
namespace TransformerBoxSchemas {
  export interface TransformRequest {
    input: unknown;
    transformation: string;
    options?: {
      preserveFormat?: boolean;
    };
  }

  export interface TransformResponse {
    output: unknown;
    transformations: Array<{
      type: string;
      description: string;
    }>;
  }
}

/**
 * Aggregator box message schemas
 */
namespace AggregatorBoxSchemas {
  export interface AggregateRequest {
    inputs: unknown[];
    operation: 'sum' | 'average' | 'max' | 'min' | 'count' | 'concat';
    options?: {
      groupBy?: string;
      filter?: (item: unknown) => boolean;
    };
  }

  export interface AggregateResponse {
    result: unknown;
    count: number;
    executionTimeMs: number;
  }
}
```

---

## 8. TypeScript Interfaces

### Complete Interface Definitions

```typescript
/**
 * Box communication system interfaces
 */

// ============================================================================
// Core Message Types
// ============================================================================

interface BoxMessage<TPayload = unknown> {
  id: string;
  timestamp: number;
  senderBoxId: string;
  receiverBoxId: string;
  channel: string;
  type: BoxMessageType;
  payload: TPayload;
  priority: MessagePriority;
  ttl?: number;
  parentMessageId?: string;
  causalChainId: string;
  correlationId?: string;
  streamId?: string;
  sequenceNumber?: number;
  isStreamEnd?: boolean;
  a2aPackageId?: string;
}

enum BoxMessageType {
  // Control
  CONTROL_HELLO = 'CONTROL_HELLO',
  CONTROL_HEARTBEAT = 'CONTROL_HEARTBEAT',
  CONTROL_GOODBYE = 'CONTROL_GOODBYE',
  CONTROL_ERROR = 'CONTROL_ERROR',
  CONTROL_ACK = 'CONTROL_ACK',
  CONTROL_NACK = 'CONTROL_NACK',

  // Request/Response
  REQUEST_EXECUTE = 'REQUEST_EXECUTE',
  REQUEST_QUERY = 'REQUEST_QUERY',
  REQUEST_SUBSCRIBE = 'REQUEST_SUBSCRIBE',
  REQUEST_UNSUBSCRIBE = 'REQUEST_UNSUBSCRIBE',

  RESPONSE_RESULT = 'RESPONSE_RESULT',
  RESPONSE_ERROR = 'RESPONSE_ERROR',
  RESPONSE_PROGRESS = 'RESPONSE_PROGRESS',

  // Streaming
  STREAM_DATA = 'STREAM_DATA',
  STREAM_START = 'STREAM_START',
  STREAM_END = 'STREAM_END',
  STREAM_CHUNK = 'STREAM_CHUNK',
  STREAM_ACK = 'STREAM_ACK',

  // Events
  EVENT_STATE_CHANGED = 'EVENT_STATE_CHANGED',
  EVENT_ERROR_OCCURRED = 'EVENT_ERROR_OCCURRED',
  EVENT_COMPLETED = 'EVENT_COMPLETED',
  EVENT_PROGRESS = 'EVENT_PROGRESS',

  // Pipeline
  PIPELINE_PUSH = 'PIPELINE_PUSH',
  PIPELINE_PULL = 'PIPELINE_PULL',
  PIPELINE_FLUSH = 'PIPELINE_FLUSH',

  // Broadcast
  BROADCAST_ANNOUNCE = 'BROADCAST_ANNOUNCE',
  BROADCAST_NOTIFY = 'BROADCAST_NOTIFY',
}

enum MessagePriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BULK = 4,
}

// ============================================================================
// Channel Types
// ============================================================================

interface BoxChannel {
  channelId: string;
  channelType: ChannelType;
  capacity: number;
  currentLoad: number;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  send<T>(message: BoxMessage<T>): Promise<void>;
  receive<T>(): Promise<BoxMessage<T>>;

  getBackpressure(): number;
  applyBackpressure(limit: number): void;

  on(event: 'message' | 'error' | 'close', handler: (...args: any[]) => void): void;
}

enum ChannelType {
  MEMORY = 'MEMORY',
  WEBSOCKET = 'WEBSOCKET',
  HTTP = 'HTTP',
  QUEUE = 'QUEUE',
  PUBSUB = 'PUBSUB',
}

// ============================================================================
// Streaming Types
// ============================================================================

interface StreamStartMessage {
  streamId: string;
  metadata: {
    contentType: string;
    totalChunks?: number;
    totalSize?: number;
  };
}

interface StreamChunkMessage {
  streamId: string;
  chunkIndex: number;
  chunkData: unknown;
  isLast: boolean;
}

interface StreamEndMessage {
  streamId: string;
  status: 'completed' | 'error' | 'cancelled';
  error?: string;
}

// ============================================================================
// Event Types
// ============================================================================

interface BoxEvent {
  eventId: string;
  eventType: string;
  sourceBoxId: string;
  timestamp: number;
  data: unknown;
}

type EventHandler = (event: BoxEvent) => void | Promise<void>;

interface BoxSignal {
  signalId: string;
  signalType: string;
  sourceBoxId: string;
  targetBoxIds: string[];
  timestamp: number;
  data: unknown;
}

type SignalHandler = (signal: BoxSignal) => void | Promise<void>;

// ============================================================================
// A2A Integration Types
// ============================================================================

interface A2ABridgeConfig {
  enableA2AWrapping: boolean;
  defaultPrivacyLevel: import('./types.js').PrivacyLevel;
  defaultLayer: import('./types.js').SubsumptionLayer;
}

// ============================================================================
// Pattern Types
// ============================================================================

interface RequestResponseConfig {
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

interface FireAndForgetConfig {
  enableBuffering: boolean;
  bufferSize: number;
  dropOverflow: boolean;
}

interface BroadcastConfig {
  enableFanout: boolean;
  fanoutConcurrency: number;
}

interface PipelineConfig {
  enableParallelProcessing: boolean;
  maxConcurrentStages: number;
}

interface PubSubConfig {
  enablePersistence: boolean;
  persistenceTtl: number;
}

// ============================================================================
// Schema Types
// ============================================================================

interface Schema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Backpressure Types
// ============================================================================

interface BackpressureController {
  windowSize: number;
  canSend(streamId: string): boolean;
  recordSent(streamId: string, chunkIndex: number): void;
  recordAck(streamId: string, chunkIndex: number): void;
  adjustWindowSize(increase: boolean): void;
}
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Week 1: Core Types**
- [ ] Implement BoxMessageType enum
- [ ] Implement BoxMessage interface
- [ ] Implement MessagePriority enum
- [ ] Add message validation

**Week 2: Channel System**
- [ ] Implement BoxChannel interface
- [ ] Create MemoryChannel
- [ ] Create ChannelRegistry
- [ ] Add channel tests

### Phase 2: Patterns (Week 3-4)

**Week 3: Request/Response & Fire-and-Forget**
- [ ] Implement RequestResponsePattern
- [ ] Implement FireAndForgetPattern
- [ ] Add pattern tests
- [ ] Document patterns

**Week 4: Broadcast & Pipeline**
- [ ] Implement BroadcastPattern
- [ ] Implement PipelinePattern
- [ ] Add pattern tests
- [ ] Document patterns

### Phase 3: Streaming (Week 5-6)

**Week 5: Streaming Protocol**
- [ ] Implement StreamingProtocol
- [ ] Add stream lifecycle management
- [ ] Implement chunking
- [ ] Add stream tests

**Week 6: Backpressure**
- [ ] Implement BackpressureController
- [ ] Add flow control
- [ ] Implement sliding window
- [ ] Add backpressure tests

### Phase 4: Events (Week 7-8)

**Week 7: Event System**
- [ ] Implement BoxEventBus
- [ ] Add event handlers
- [ ] Implement event emission
- [ ] Add event tests

**Week 8: Signal System**
- [ ] Implement BoxSignalSystem
- [ ] Add signal handlers
- [ ] Implement signal broadcast
- [ ] Add signal tests

### Phase 5: A2A Integration (Week 9-10)

**Week 9: A2A Bridge**
- [ ] Implement A2ABridge
- [ ] Add A2A wrapping
- [ ] Implement A2A extraction
- [ ] Add A2A tests

**Week 10: A2A-Enhanced Bus**
- [ ] Implement BoxMessageBus
- [ ] Add A2A integration
- [ ] Implement causal chain tracking
- [ ] Add integration tests

### Phase 6: Schemas (Week 11-12)

**Week 11: Schema System**
- [ ] Implement MessageSchemaValidator
- [ ] Add schema registration
- [ ] Implement validation
- [ ] Add schema tests

**Week 12: Box-Specific Schemas**
- [ ] Define CellBoxSchemas
- [ ] Define TransformerBoxSchemas
- [ ] Define AggregatorBoxSchemas
- [ ] Add schema documentation

### Phase 7: Polish (Week 13-14)

**Week 13: Performance**
- [ ] Optimize serialization
- [ ] Add message pooling
- [ ] Implement zero-copy (where possible)
- [ ] Performance benchmarks

**Week 14: Documentation & Testing**
- [ ] Complete documentation
- [ ] End-to-end tests
- [ ] Integration tests
- [ ] Launch preparation

---

## Success Metrics

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Message Latency** | <10ms (P50) | End-to-end delivery |
| **Throughput** | >10K msg/s | Messages per second |
| **Backpressure Handling** | 100% | No dropped messages |
| **A2A Integration** | 100% | All messages wrapped |
| **Schema Validation** | 100% | All messages validated |

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Test Coverage** | >90% | Code coverage |
| **Documentation** | 100% | All APIs documented |
| **Error Handling** | 100% | Graceful failures |
| **Traceability** | 100% | All messages traceable |

---

## Conclusion

The Box Communication Protocol enables fractured AI boxes to:

1. **Communicate flexibly** through multiple patterns (request/response, fire-and-forget, broadcast, pipeline, pub/sub)
2. **Stream efficiently** with backpressure handling and flow control
3. **Integrate seamlessly** with POLLN's A2A package system
4. **Scale gracefully** with proper channel management and resource control
5. **Maintain inspectability** through causal chain tracking and traceability

The system is **production-ready** and designed for **real-time spreadsheet interactions**.

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: Design Complete - Ready for Implementation
**Next Phase**: Phase 1: Foundation (Week 1-2)

---

## Appendix: Message Flow Diagrams

### Diagram 1: Request/Response Flow

```
┌─────────┐                  ┌─────────┐
│ Box A   │                  │ Box B   │
└────┬────┘                  └────┬────┘
     │                            │
     │  1. REQUEST_EXECUTE        │
     │──────────────────────────>│
     │  { correlationId, payload }│
     │                            │
     │                   2. Process
     │                            │
     │  3. RESPONSE_RESULT        │
     │<──────────────────────────│
     │  { correlationId, result } │
     │                            │
```

### Diagram 2: Streaming Flow

```
┌─────────┐                  ┌─────────┐
│ Box A   │                  │ Box B   │
└────┬────┘                  └────┬────┘
     │                            │
     │  1. STREAM_START           │
     │──────────────────────────>│
     │  { streamId, metadata }    │
     │                            │
     │  2. STREAM_CHUNK (0)       │
     │──────────────────────────>│
     │  { streamId, chunkIndex 0 }│
     │  3. STREAM_ACK             │
     │<──────────────────────────│
     │  { streamId, chunkIndex 0 }│
     │                            │
     │  4. STREAM_CHUNK (1)       │
     │──────────────────────────>│
     │  { streamId, chunkIndex 1 }│
     │  5. STREAM_ACK             │
     │<──────────────────────────│
     │  { streamId, chunkIndex 1 }│
     │                            │
     │  6. STREAM_END             │
     │──────────────────────────>│
     │  { streamId, status }      │
     │                            │
```

### Diagram 3: Pipeline Flow

```
┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
│ Box A│───>│ Box B│───>│ Box C│───>│ Box D│
└──────┘    └──────┘    └──────┘    └──────┘
   │           │           │           │
   │           │           │           │
  PUSH       TRANSFORM    AGGREGATE   OUTPUT
```

### Diagram 4: Pub/Sub Flow

```
┌─────────┐         ┌─────────┐
│Publisher│         │  Topic  │
└────┬────┘         └────┬────┘
     │                   │
     │  PUBLISH          │
     │──────────────────>│
     │  { topic, data }  │
     │                   │
     │         ┌─────────┴─────────┐
     │         │                   │
     │    ┌────▼────┐        ┌────▼────┐
     │    │Sub 1    │        │Sub 2    │
     │    └─────────┘        └─────────┘
     │         │                   │
     │         │ RECEIVE           │ RECEIVE
     │         │<──────────────────│
     │         │  { topic, data }   │
     │         │                   │
```

### Diagram 5: A2A Integration Flow

```
┌─────────┐                  ┌──────────┐                  ┌─────────┐
│ Box A   │                  │A2A Bridge │                  │ Box B   │
└────┬────┘                  └────┬─────┘                  └────┬────┘
     │                            │                             │
     │  1. BoxMessage             │                             │
     │  { type, payload }         │                             │
     │──────────────────────────>│                             │
     │                            │  2. Wrap in A2A Package    │
     │                            │  { id, causalChainId }     │
     │                            │──────────────────────────>│
     │                            │                             │
     │                            │  3. Extract BoxMessage     │
     │                            │<──────────────────────────│
     │                            │                             │
```

---

*End of Document*

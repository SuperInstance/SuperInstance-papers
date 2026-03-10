# Cell Communication

Cells communicate with each other using various messaging patterns. This enables coordination, collaboration, and emergent behavior.

## Overview

```
┌─────────┐         ┌─────────┐
│ Cell A  │────────>│ Cell B  │
└─────────┘         └─────────┘
     │                   │
     │ message           │
     │                   ▼
     │              ┌─────────┐
     └─────────────>│ Cell C  │
                    └─────────┘
```

## Communication Patterns

### 1. Direct Messaging

Send messages directly between cells.

```typescript
// Cell A sends to Cell B
await colony.sendMessage('A', 'B', {
  type: 'update',
  value: 100
})

// Cell B receives
cellB.on('message', (from, message) => {
  console.log(`From ${from}:`, message)
})
```

### 2. Broadcast

Send to all cells in the colony.

```typescript
await colony.broadcast({
  type: 'alert',
  message: 'System update'
})

// All cells receive
cell.on('broadcast', (message) => {
  console.log('Broadcast:', message)
})
```

### 3. Pub/Sub

Publish/subscribe pattern for topics.

```typescript
// Subscribe to topic
cellA.subscribe('price-changes')

// Publish to topic
colony.publish('price-changes', {
  symbol: 'AAPL',
  price: 150.25
})

// Subscriber receives
cellA.on('price-changes', (data) => {
  console.log('Price update:', data)
})
```

### 4. Request/Response

Request-response pattern.

```typescript
// Cell A requests
const response = await colony.request('B', {
  type: 'get-status'
})

// Cell B responds
cellB.on('request', async (request) => {
  if (request.type === 'get-status') {
    return { status: 'active', value: 100 }
  }
})
```

## Message Types

### Update

Send value updates:

```typescript
{
  type: 'update',
  cellId: 'A1',
  value: 100,
  timestamp: '2024-03-09T12:00:00Z'
}
```

### Alert

Send alerts:

```typescript
{
  type: 'alert',
  severity: 'high',
  message: 'Threshold exceeded',
  cellId: 'A1',
  value: 200
}
```

### Status

Request/send status:

```typescript
{
  type: 'status',
  cellId: 'A1',
  status: 'active',
  health: 'healthy'
}
```

### Control

Control messages:

```typescript
{
  type: 'control',
  action: 'start' | 'stop' | 'pause' | 'resume',
  target: 'cell-id'
}
```

## Communication Protocols

### WebSocket

Real-time bidirectional communication:

```typescript
const colony = new Colony('websocket-colony', {
  communication: {
    protocol: 'websocket',
    url: 'ws://localhost:3000',
    options: {
      reconnect: true,
      heartbeat: 30000
    }
  }
})
```

### HTTP

REST-based communication:

```typescript
const colony = new Colony('http-colony', {
  communication: {
    protocol: 'http',
    baseURL: 'http://localhost:3000/api'
  }
})
```

### Message Queue

Async message queue:

```typescript
const colony = new Colony('queue-colony', {
  communication: {
    protocol: 'amqp',
    url: 'amqp://localhost:5672',
    queue: 'polln-messages'
  }
})
```

## Message Flow

### Synchronous

Wait for response:

```typescript
const response = await colony.request('B', {
  type: 'process',
  data: value
})
console.log('Response:', response)
```

### Asynchronous

Fire and forget:

```typescript
colony.sendMessage('B', {
  type: 'process',
  data: value
})
// Don't wait for response
```

### Streaming

Stream of messages:

```typescript
// Create stream
const stream = colony.createStream('data-stream')

// Produce
stream.write({ value: 1 })
stream.write({ value: 2 })
stream.end()

// Consume
stream.on('data', (data) => {
  console.log('Received:', data)
})
```

## Error Handling

### Timeouts

```typescript
try {
  const response = await colony.request('B', data, {
    timeout: 5000  // 5 second timeout
  })
} catch (error) {
  if (error.code === 'TIMEOUT') {
    console.error('Request timed out')
  }
}
```

### Retries

```typescript
const response = await colony.request('B', data, {
  retries: 3,
  backoff: 'exponential'
})
```

### Dead Letter

Failed messages go to dead letter queue:

```typescript
colony.on('dead-letter', (message) => {
  logger.error('Failed message:', message)
  // Handle or retry
})
```

## Security

### Authentication

```typescript
colony.authenticate({
  type: 'jwt',
  token: process.env.JWT_TOKEN
})
```

### Encryption

```typescript
const colony = new Colony('secure', {
  communication: {
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      key: process.env.ENCRYPTION_KEY
    }
  }
})
```

### Authorization

```typescript
cellB.setPermissions({
  read: ['A', 'C'],
  write: ['A']
})

// Only A can write to B
await colony.sendMessage('A', 'B', { value: 100 })  // OK
await colony.sendMessage('C', 'B', { value: 100 })  // DENIED
```

## Performance

### Batching

Batch messages together:

```typescript
colony.sendMessage('B', {
  type: 'batch',
  messages: [
    { value: 1 },
    { value: 2 },
    { value: 3 }
  ]
})
```

### Compression

Compress messages:

```typescript
const colony = new Colony('compressed', {
  communication: {
    compression: 'gzip',
    level: 6
  }
})
```

### Priority

Message priority:

```typescript
colony.sendMessage('B', {
  type: 'alert',
  priority: 'high',
  data: 'Critical update'
})
```

## Best Practices

### 1. Use Appropriate Patterns

```typescript
// ✅ Good: Use pub/sub for many-to-many
colony.publish('updates', data)

// ❌ Bad: Use direct messaging for many-to-many
for (const cell of cells) {
  await colony.sendMessage('A', cell.id, data)
}
```

### 2. Handle Errors

```typescript
// ✅ Good: Handle errors
try {
  await colony.sendMessage('B', data)
} catch (error) {
  logger.error('Send failed:', error)
}

// ❌ Bad: Ignore errors
await colony.sendMessage('B', data)
```

### 3. Use Timeouts

```typescript
// ✅ Good: Set timeout
await colony.request('B', data, { timeout: 5000 })

// ❌ Bad: No timeout
await colony.request('B', data)
```

### 4. Validate Messages

```typescript
// ✅ Good: Validate
const schema = { type: 'object', properties: { value: { type: 'number' } } }
if (validate(message, schema)) {
  await process(message)
}

// ❌ Bad: No validation
await process(message)
```

## Debugging

### Logging

```typescript
colony.on('message', (from, to, message) => {
  logger.debug(`${from} → ${to}:`, message)
})
```

### Tracing

```typescript
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('polln')

const span = tracer.startSpan('sendMessage')
await colony.sendMessage('B', data)
span.end()
```

### Monitoring

```typescript
colony.on('message-sent', (metrics) => {
  console.log('Messages sent:', metrics.count)
  console.log('Average latency:', metrics.latency)
})
```

## Next Steps

- [Colony Architecture](./colony) - Colony management
- [Cell Types](./cell-types) - Cell implementations
- [Examples](../../examples/) - Real-world examples

---

**Ready to communicate?** See the [Quick Start Guide](../quick-start) or explore [Examples](../../examples/)!

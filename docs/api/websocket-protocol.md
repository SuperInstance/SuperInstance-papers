# WebSocket Message Protocol

## Overview

All WebSocket messages follow a common structure with required and optional fields.

## Client Message Format

Messages sent from client to server:

```typescript
interface ClientMessage {
  id: string;           // Unique message identifier (e.g., "msg_1234567890_abc123")
  timestamp: number;    // Unix timestamp in milliseconds
  type: ClientMessageType;
  payload: unknown;     // Message-specific payload
}
```

### Client Message Types

- `subscribe:colony` - Subscribe to colony events
- `unsubscribe:colony` - Unsubscribe from colony events
- `subscribe:agent` - Subscribe to agent events
- `unsubscribe:agent` - Unsubscribe from agent events
- `subscribe:dreams` - Subscribe to dream events
- `unsubscribe:dreams` - Unsubscribe from dream events
- `subscribe:stats` - Subscribe to stats updates
- `unsubscribe:stats` - Unsubscribe from stats updates
- `command:spawn` - Spawn a new agent
- `command:despawn` - Remove an agent
- `command:activate` - Activate an agent
- `command:deactivate` - Deactivate an agent
- `command:dream` - Trigger dream cycle
- `query:stats` - Query colony statistics
- `query:agents` - Query multiple agents
- `query:agent` - Query specific agent
- `query:config` - Query colony configuration
- `ping` - Ping server for latency measurement

## Server Message Format

Messages sent from server to client:

```typescript
interface ServerMessage {
  id: string;           // Unique message identifier
  timestamp: number;    // Unix timestamp in milliseconds
  type: ServerMessageType;
  payload: unknown;     // Message-specific payload
  success?: boolean;    // Operation success (for responses)
  error?: APIError;     // Error details (if failed)
}
```

### Server Message Types

- `event:colony` - Colony event notification
- `event:agent` - Agent event notification
- `event:dream` - Dream event notification
- `event:stats` - Statistics update notification
- `response:stats` - Statistics query response
- `response:agents` - Agents query response
- `response:agent` - Agent query response
- `response:config` - Configuration query response
- `response:command` - Command execution response
- `pong` - Pong response to ping
- `error` - Error response

## Message Flow

### 1. Connection

```typescript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/api/ws');

ws.onopen = () => {
  console.log('Connected to POLLN API');
};
```

### 2. Authentication (if enabled)

```typescript
ws.send(JSON.stringify({
  id: 'msg_1',
  timestamp: Date.now(),
  type: 'authenticate',
  payload: {
    token: 'your-api-token'
  }
}));
```

### 3. Subscribe to Events

```typescript
ws.send(JSON.stringify({
  id: 'msg_2',
  timestamp: Date.now(),
  type: 'subscribe:colony',
  payload: {
    colonyId: 'colony-1',
    events: ['agent_registered', 'stats_updated']
  }
}));
```

### 4. Send Commands

```typescript
ws.send(JSON.stringify({
  id: 'msg_3',
  timestamp: Date.now(),
  type: 'command:activate',
  payload: {
    agentId: 'agent-1'
  }
}));
```

### 5. Query State

```typescript
ws.send(JSON.stringify({
  id: 'msg_4',
  timestamp: Date.now(),
  type: 'query:stats',
  payload: {
    colonyId: 'colony-1'
  }
}));
```

### 6. Receive Events

```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'event:colony':
      console.log('Colony event:', message.payload);
      break;
    case 'event:agent':
      console.log('Agent event:', message.payload);
      break;
    case 'response:stats':
      console.log('Stats response:', message.payload);
      break;
    case 'error':
      console.error('Error:', message.error);
      break;
  }
};
```

## Message Idempotency

Each message has a unique `id` field. This allows for:

- **Request tracking**: Match responses to requests
- **Duplicate detection**: Ignore duplicate messages
- **Debugging**: Trace message flows through logs

Generate message IDs using:

```typescript
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

## Timestamp Format

All timestamps are Unix timestamps in milliseconds:

```typescript
const timestamp = Date.now(); // e.g., 1699123456789
```

## Payload Validation

All payloads are validated by the server. Invalid payloads result in:

```typescript
{
  type: 'error',
  error: {
    code: 'INVALID_PAYLOAD',
    message: 'Invalid request payload',
    details: {
      // Validation details
    }
  }
}
```

See [Errors](errors.md) for more information.

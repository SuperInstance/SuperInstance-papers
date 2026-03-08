# POLLN WebSocket API

Real-time monitoring and control API for POLLN colonies.

## Overview

The WebSocket API provides real-time access to:

- **Colony Events**: Agent registration, activation, deactivation
- **Agent Lifecycle**: State updates, execution results, value changes
- **Dream Cycles**: Dream episode notifications with metrics
- **Statistics**: Real-time colony and KV-cache statistics
- **Commands**: Agent spawning, activation, deactivation, dream triggering

## Installation

```bash
npm install ws @types/ws
```

## Quick Start

```typescript
import { createPOLLNServer } from 'polln/api';

// Create server
const server = createPOLLNServer({
  port: 3000,
  auth: {
    enableAuth: false, // Set to true for production
  },
  rateLimit: {
    requestsPerMinute: 100,
    burstLimit: 10,
  },
});

// Start server
await server.start();

// Register a colony
server.registerColony(myColony);

// Broadcast events
server.broadcastColonyEvent('colony-1', 'agent_registered', {
  agentId: 'agent-1',
});

// Stop server
await server.stop();
```

## Message Protocol

### Client Message Format

```typescript
{
  id: string;           // Unique message ID
  timestamp: number;    // Unix timestamp in ms
  type: MessageType;    // Message type
  payload: unknown;     // Message payload
}
```

### Server Message Format

```typescript
{
  id: string;           // Unique message ID
  timestamp: number;    // Unix timestamp in ms
  type: MessageType;    // Message type
  payload: unknown;     // Message payload
  success?: boolean;    // Operation success
  error?: APIError;     // Error details (if failed)
}
```

## Message Types

### Subscriptions

#### Subscribe to Colony Events

```typescript
{
  type: 'subscribe:colony',
  payload: {
    colonyId: 'colony-1',
    events: ['agent_registered', 'stats_updated']
  }
}
```

#### Subscribe to Agent Events

```typescript
{
  type: 'subscribe:agent',
  payload: {
    agentId: 'agent-1',
    events: ['state_updated', 'succeeded']
  }
}
```

#### Subscribe to Dream Events

```typescript
{
  type: 'subscribe:dreams',
  payload: {
    colonyId: 'colony-1'
  }
}
```

#### Subscribe to Stats Updates

```typescript
{
  type: 'subscribe:stats',
  payload: {
    colonyId: 'colony-1'
  }
}
```

### Commands

#### Spawn Agent

```typescript
{
  type: 'command:spawn',
  payload: {
    typeId: 'task-agent',
    config: { /* agent config */ }
  }
}
```

#### Activate Agent

```typescript
{
  type: 'command:activate',
  payload: {
    agentId: 'agent-1'
  }
}
```

#### Deactivate Agent

```typescript
{
  type: 'command:deactivate',
  payload: {
    agentId: 'agent-1'
  }
}
```

#### Trigger Dream Cycle

```typescript
{
  type: 'command:dream',
  payload: {
    colonyId: 'colony-1',
    episodeCount: 10
  }
}
```

### Queries

#### Query Stats

```typescript
{
  type: 'query:stats',
  payload: {
    colonyId: 'colony-1',
    includeKVCache: true,
    includeAgents: false
  }
}
```

#### Query Agents

```typescript
{
  type: 'query:agents',
  payload: {
    colonyId: 'colony-1',
    filter: {
      status: 'active',
      typeId: 'task-agent',
      limit: 50,
      offset: 0
    }
  }
}
```

#### Query Agent

```typescript
{
  type: 'query:agent',
  payload: {
    agentId: 'agent-1',
    includeHistory: false
  }
}
```

### Ping/Pong

```typescript
// Client sends ping
{
  type: 'ping',
  payload: null
}

// Server responds with pong
{
  type: 'pong',
  payload: {
    originalTimestamp: 1699123456789
  }
}
```

## Event Types

### Colony Events

- `agent_registered`: New agent registered
- `agent_unregistered`: Agent removed
- `agent_activated`: Agent activated
- `agent_deactivated`: Agent deactivated
- `stats_updated`: Colony statistics updated
- `dream_completed`: Dream cycle completed
- `error`: Colony error

### Agent Events

- `state_updated`: Agent state changed
- `executed`: Agent executed
- `succeeded`: Agent execution succeeded
- `failed`: Agent execution failed
- `value_changed`: Agent value function changed
- `error`: Agent error

## Authentication

When authentication is enabled, include a token in your first message:

```typescript
{
  type: 'authenticate',
  payload: {
    token: 'your-api-token'
  }
}
```

Generate tokens server-side:

```typescript
import { AuthenticationMiddleware } from 'polln/api';

const auth = new AuthenticationMiddleware();
const token = auth.generateToken('gardener-id', [
  { resource: 'colony', actions: ['read', 'write'] },
  { resource: 'agent', actions: ['read', 'write'] },
  { resource: 'dream', actions: ['read', 'write'] },
  { resource: 'stats', actions: ['read'] },
]);
```

## Rate Limiting

Rate limiting is enforced per connection:

- **requestsPerMinute**: Maximum requests per minute
- **burstLimit**: Maximum burst requests
- **windowMs**: Time window for rate limiting

When rate limited, you'll receive:

```typescript
{
  type: 'error',
  error: {
    code: 'RATE_LIMITED',
    message: 'Rate limit exceeded'
  }
}
```

## Error Codes

- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `INVALID_PAYLOAD`: Invalid request payload
- `RATE_LIMITED`: Rate limit exceeded
- `INTERNAL_ERROR`: Internal server error
- `AGENT_NOT_FOUND`: Agent not found
- `COLONY_NOT_FOUND`: Colony not found
- `COMMAND_FAILED`: Command execution failed

## Client Example

```typescript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/api/ws');

ws.on('open', () => {
  // Subscribe to colony events
  ws.send(JSON.stringify({
    id: `msg_${Date.now()}`,
    timestamp: Date.now(),
    type: 'subscribe:colony',
    payload: {
      colonyId: 'colony-1',
      events: ['agent_registered', 'stats_updated']
    }
  }));

  // Query stats
  ws.send(JSON.stringify({
    id: `msg_${Date.now()}`,
    timestamp: Date.now(),
    type: 'query:stats',
    payload: {
      colonyId: 'colony-1'
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());

  switch (message.type) {
    case 'event:colony':
      console.log('Colony event:', message.payload);
      break;
    case 'response:stats':
      console.log('Stats:', message.payload);
      break;
    case 'error':
      console.error('Error:', message.error);
      break;
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

## Server API

### POLLNServer

```typescript
class POLLNServer extends EventEmitter {
  // Start server
  async start(): Promise<void>

  // Stop server
  async stop(): Promise<void>

  // Register colony
  registerColony(colony: Colony): void

  // Unregister colony
  unregisterColony(colonyId: string): void

  // Set dream optimizer
  setDreamOptimizer(optimizer: DreamBasedPolicyOptimizer): void

  // Broadcast events
  broadcastColonyEvent(colonyId: string, eventType: string, data: unknown): void
  broadcastAgentEvent(agentId: string, colonyId: string, eventType: string, data: unknown): void
  broadcastDreamEvent(colonyId: string, dreamData: Partial<DreamEventPayload>): void
  broadcastStatsUpdate(colonyId: string): void

  // Get statistics
  getStats(): APIServerStats
  getConnectionCount(): number
  getActiveConnections(): ConnectionInfo[]
}
```

### Events

The server emits the following events:

- `started`: Server started
- `stopped`: Server stopped
- `connection:opened`: New connection
- `connection:closed`: Connection closed
- `connection:error`: Connection error
- `colony:registered`: Colony registered
- `colony:unregistered`: Colony unregistered

## Configuration

```typescript
interface POLLNServerConfig {
  port: number;
  host?: string;
  auth?: {
    enableAuth: boolean;
    defaultToken?: string;
    tokenExpiresIn?: number;
  };
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  cors?: {
    origin: string | string[];
    credentials: boolean;
  };
  heartbeat?: {
    interval: number;
    timeout: number;
  };
}
```

## OpenAPI Documentation

See [openapi.yaml](./openapi.yaml) for complete API specification.

## Testing

```bash
npm run test:api
```

## License

MIT

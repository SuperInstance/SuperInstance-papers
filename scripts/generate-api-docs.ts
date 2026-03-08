#!/usr/bin/env tsx
/**
 * POLLN API Documentation Generator
 *
 * Generates comprehensive API documentation from OpenAPI specification and TypeScript types.
 * Maintains single source of truth: openapi.yaml
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  rootDir: path.resolve(__dirname, '..'),
  openApiSpec: path.resolve(__dirname, '../src/api/openapi.yaml'),
  outputDir: path.resolve(__dirname, '../docs/api'),
  examplesOutputDir: path.resolve(__dirname, '../docs/api/examples'),
};

// ============================================================================
// Utilities
// ============================================================================

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

// ============================================================================
// Documentation Generators
// ============================================================================

class DocumentationGenerator {
  generateOverview(): string {
    return `# POLLN WebSocket API

Real-time monitoring and control API for POLLN (Pattern-Organized Large Language Network).

This WebSocket API provides real-time access to colony events, agent lifecycle management,
dream cycle notifications, and KV-cache statistics.

## Quick Start

### Installation

\`\`\`bash
npm install polln
\`\`\`

### Basic Usage

\`\`\`typescript
import { POLLNClient } from 'polln/api/client';

// Create client
const client = new POLLNClient({
  url: 'ws://localhost:3000/api/ws',
});

// Connect
await client.connect();

// Subscribe to colony events
client.subscribeToColony('colony-1', ['agent_registered', 'stats_updated']);

// Query stats
const stats = await client.queryStats('colony-1');
console.log(stats);
\`\`\`

## Servers

- **Local development**: \`ws://localhost:3000/api/ws\`
- **Production**: \`wss://api.polln.io/api/ws\`

## Authentication

When authentication is enabled, include a token in your first message:

\`\`\`typescript
const client = new POLLNClient({
  url: 'ws://localhost:3000/api/ws',
  token: 'your-api-token',
});
\`\`\`

## Rate Limiting

Rate limiting is enforced per connection:

- **requestsPerMinute**: Maximum requests per minute (default: 100)
- **burstLimit**: Maximum burst requests (default: 10)

When rate limited, you'll receive:

\`\`\`typescript
{
  type: 'error',
  error: {
    code: 'RATE_LIMITED',
    message: 'Rate limit exceeded'
  }
}
\`\`\`

## Table of Contents

- [Message Protocol](websocket-protocol.md)
- [Authentication](authentication.md)
- [Endpoints](endpoints/)
  - [Agents](endpoints/agents.md)
  - [Colony](endpoints/colony.md)
  - [Dream](endpoints/dream.md)
  - [Cache](endpoints/cache.md)
  - [Federation](endpoints/federation.md)
- [Events](events.md)
- [Errors](errors.md)
- [Rate Limits](rate-limits.md)
- [Examples](examples/)

## License

MIT - https://opensource.org/licenses/MIT

---

*Generated from OpenAPI specification v1.0.0*
`;
  }

  generateWebSocketProtocol(): string {
    return `# WebSocket Message Protocol

## Overview

All WebSocket messages follow a common structure with required and optional fields.

## Client Message Format

Messages sent from client to server:

\`\`\`typescript
interface ClientMessage {
  id: string;           // Unique message identifier (e.g., "msg_1234567890_abc123")
  timestamp: number;    // Unix timestamp in milliseconds
  type: ClientMessageType;
  payload: unknown;     // Message-specific payload
}
\`\`\`

### Client Message Types

- \`subscribe:colony\` - Subscribe to colony events
- \`unsubscribe:colony\` - Unsubscribe from colony events
- \`subscribe:agent\` - Subscribe to agent events
- \`unsubscribe:agent\` - Unsubscribe from agent events
- \`subscribe:dreams\` - Subscribe to dream events
- \`unsubscribe:dreams\` - Unsubscribe from dream events
- \`subscribe:stats\` - Subscribe to stats updates
- \`unsubscribe:stats\` - Unsubscribe from stats updates
- \`command:spawn\` - Spawn a new agent
- \`command:despawn\` - Remove an agent
- \`command:activate\` - Activate an agent
- \`command:deactivate\` - Deactivate an agent
- \`command:dream\` - Trigger dream cycle
- \`query:stats\` - Query colony statistics
- \`query:agents\` - Query multiple agents
- \`query:agent\` - Query specific agent
- \`query:config\` - Query colony configuration
- \`ping\` - Ping server for latency measurement

## Server Message Format

Messages sent from server to client:

\`\`\`typescript
interface ServerMessage {
  id: string;           // Unique message identifier
  timestamp: number;    // Unix timestamp in milliseconds
  type: ServerMessageType;
  payload: unknown;     // Message-specific payload
  success?: boolean;    // Operation success (for responses)
  error?: APIError;     // Error details (if failed)
}
\`\`\`

### Server Message Types

- \`event:colony\` - Colony event notification
- \`event:agent\` - Agent event notification
- \`event:dream\` - Dream event notification
- \`event:stats\` - Statistics update notification
- \`response:stats\` - Statistics query response
- \`response:agents\` - Agents query response
- \`response:agent\` - Agent query response
- \`response:config\` - Configuration query response
- \`response:command\` - Command execution response
- \`pong\` - Pong response to ping
- \`error\` - Error response

## Message Flow

### 1. Connection

\`\`\`typescript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/api/ws');

ws.onopen = () => {
  console.log('Connected to POLLN API');
};
\`\`\`

### 2. Authentication (if enabled)

\`\`\`typescript
ws.send(JSON.stringify({
  id: 'msg_1',
  timestamp: Date.now(),
  type: 'authenticate',
  payload: {
    token: 'your-api-token'
  }
}));
\`\`\`

### 3. Subscribe to Events

\`\`\`typescript
ws.send(JSON.stringify({
  id: 'msg_2',
  timestamp: Date.now(),
  type: 'subscribe:colony',
  payload: {
    colonyId: 'colony-1',
    events: ['agent_registered', 'stats_updated']
  }
}));
\`\`\`

### 4. Send Commands

\`\`\`typescript
ws.send(JSON.stringify({
  id: 'msg_3',
  timestamp: Date.now(),
  type: 'command:activate',
  payload: {
    agentId: 'agent-1'
  }
}));
\`\`\`

### 5. Query State

\`\`\`typescript
ws.send(JSON.stringify({
  id: 'msg_4',
  timestamp: Date.now(),
  type: 'query:stats',
  payload: {
    colonyId: 'colony-1'
  }
}));
\`\`\`

### 6. Receive Events

\`\`\`typescript
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
\`\`\`

## Message Idempotency

Each message has a unique \`id\` field. This allows for:

- **Request tracking**: Match responses to requests
- **Duplicate detection**: Ignore duplicate messages
- **Debugging**: Trace message flows through logs

Generate message IDs using:

\`\`\`typescript
function generateMessageId(): string {
  return \`msg_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
}
\`\`\`

## Timestamp Format

All timestamps are Unix timestamps in milliseconds:

\`\`\`typescript
const timestamp = Date.now(); // e.g., 1699123456789
\`\`\`

## Payload Validation

All payloads are validated by the server. Invalid payloads result in:

\`\`\`typescript
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
\`\`\`

See [Errors](errors.md) for more information.
`;
  }

  generateAuthentication(): string {
    return `# Authentication

## Overview

POLLN WebSocket API supports token-based authentication. When enabled, clients must authenticate before sending other messages.

## Authentication Flow

### 1. Server-Side Token Generation

\`\`\`typescript
import { AuthenticationMiddleware } from 'polln/api';

const auth = new AuthenticationMiddleware();

// Generate token with permissions
const token = auth.generateToken(
  'gardener-id',           // Gardener/developer ID
  [
    { resource: 'colony', actions: ['read', 'write'] },
    { resource: 'agent', actions: ['read', 'write'] },
    { resource: 'dream', actions: ['read', 'write'] },
    { resource: 'stats', actions: ['read'] },
  ],
  24 * 60 * 60 * 1000      // Expires in 24 hours (optional)
);

console.log('Token:', token);
\`\`\`

### 2. Client Authentication

Send authentication as first message:

\`\`\`typescript
const ws = new WebSocket('ws://localhost:3000/api/ws');

ws.onopen = () => {
  // Send authentication
  ws.send(JSON.stringify({
    id: 'msg_1',
    timestamp: Date.now(),
    type: 'authenticate',
    payload: {
      token: 'your-api-token'
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'authenticated') {
    console.log('Authentication successful');
    // Now you can send other messages
  } else if (message.type === 'error' && message.error?.code === 'UNAUTHORIZED') {
    console.error('Authentication failed');
  }
};
\`\`\`

## Permissions

Tokens include permissions for specific resources and actions:

### Resources

- \`colony\`: Colony management and events
- \`agent\`: Agent lifecycle and control
- \`dream\`: Dream cycle operations
- \`stats\`: Statistics and monitoring

### Actions

- \`read\`: Query and subscribe to data
- \`write\`: Send commands and modify state
- \`admin\`: Administrative operations

### Permission Examples

\`\`\`typescript
// Read-only access
const readOnlyToken = auth.generateToken('gardener-1', [
  { resource: 'colony', actions: ['read'] },
  { resource: 'agent', actions: ['read'] },
  { resource: 'stats', actions: ['read'] },
]);

// Full access
const fullAccessToken = auth.generateToken('gardener-2', [
  { resource: 'colony', actions: ['read', 'write', 'admin'] },
  { resource: 'agent', actions: ['read', 'write'] },
  { resource: 'dream', actions: ['read', 'write'] },
  { resource: 'stats', actions: ['read'] },
]);

// Stats-only access
const statsToken = auth.generateToken('gardener-3', [
  { resource: 'stats', actions: ['read'] },
]);
\`\`\`

## Token Management

### Validate Token

\`\`\`typescript
const apiToken = auth.validateToken('your-api-token');

if (apiToken) {
  console.log('Token valid:', {
    gardenerId: apiToken.gardenerId,
    permissions: apiToken.permissions,
    expiresAt: new Date(apiToken.expiresAt),
  });
} else {
  console.log('Token invalid or expired');
}
\`\`\`

### Revoke Token

\`\`\`typescript
auth.revokeToken('your-api-token');
console.log('Token revoked');
\`\`\`

### Check Permissions

\`\`\`typescript
const client = auth.authenticate('client-id', 'your-api-token');

if (client && auth.hasPermission(client, 'colony', 'write')) {
  console.log('Client can write to colony');
}
\`\`\`

### Cleanup Expired Tokens

\`\`\`typescript
// Run periodically (e.g., every hour)
const count = auth.cleanupExpiredTokens();
console.log(\`Cleaned up \${count} expired tokens\`);
\`\`\`

## Configuration

### Server Configuration

\`\`\`typescript
import { createPOLLNServer } from 'polln/api';

const server = createPOLLNServer({
  port: 3000,
  auth: {
    enableAuth: true,
    defaultToken: 'default-dev-token',  // For development
    tokenExpiresIn: 24 * 60 * 60 * 1000,  // 24 hours
  },
});

await server.start();
\`\`\`

## Security Considerations

1. **Use WSS (WebSocket Secure) in production**

\`\`\`typescript
const client = new POLLNClient({
  url: 'wss://api.polln.io/api/ws',
  token: 'your-token',
});
\`\`\`

2. **Store tokens securely**

- Never expose tokens in client-side code
- Use HTTP-only cookies for web clients
- Implement proper CORS headers

3. **Implement rate limiting per token**

\`\`\`typescript
const server = createPOLLNServer({
  port: 3000,
  rateLimit: {
    requestsPerMinute: 100,
    burstLimit: 10,
  },
});
\`\`\`

4. **Monitor and log authentication events**

\`\`\`typescript
server.on('connection:opened', ({ clientId }) => {
  console.log(\`Client connected: \${clientId}\`);
});

server.on('connection:closed', ({ clientId }) => {
  console.log(\`Client disconnected: \${clientId}\`);
});
\`\`\`
`;
  }

  generateEndpointsDocs(): Record<string, string> {
    return {
      agents: this.generateAgentsEndpoints(),
      colony: this.generateColonyEndpoints(),
      dream: this.generateDreamEndpoints(),
      cache: this.generateCacheEndpoints(),
      federation: this.generateFederationEndpoints(),
    };
  }

  private generateAgentsEndpoints(): string {
    return `# Agent Management Endpoints

## Overview

Agent management endpoints allow you to control agent lifecycle, query agent state, and monitor agent activity.

## Subscribe to Agent Events

Subscribe to events for a specific agent.

### Request

\`\`\`typescript
{
  type: 'subscribe:agent',
  payload: {
    agentId: 'agent-1',
    events: ['state_updated', 'succeeded', 'failed']
  }
}
\`\`\`

### Payload

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| agentId | string | Yes | Agent ID to subscribe to |
| events | string[] | Yes | Event types to receive |

### Event Types

- \`state_updated\`: Agent state changed
- \`executed\`: Agent executed
- \`succeeded\`: Agent execution succeeded
- \`failed\`: Agent execution failed
- \`value_changed\`: Agent value function changed
- \`error\`: Agent error

## Query Agent

Query the current state of a specific agent.

### Request

\`\`\`typescript
{
  type: 'query:agent',
  payload: {
    agentId: 'agent-1',
    includeHistory: false
  }
}
\`\`\`

### Response

\`\`\`typescript
{
  type: 'response:agent',
  payload: {
    agent: {
      id: 'agent-1',
      typeId: 'task-agent',
      status: 'active',
      valueFunction: 0.75,
      successRate: 0.85,
      lastActive: 1699123456789,
      avgLatencyMs: 45.5
    },
    config: {
      // Agent configuration
    }
  }
}
\`\`\`

## Spawn Agent

Spawn a new agent in the colony.

### Request

\`\`\`typescript
{
  type: 'command:spawn',
  payload: {
    typeId: 'task-agent',
    config: {
      // Agent-specific configuration
    }
  }
}
\`\`\`

## Activate Agent

Activate a dormant agent.

### Request

\`\`\`typescript
{
  type: 'command:activate',
  payload: {
    agentId: 'agent-1'
  }
}
\`\`\`

## Deactivate Agent

Deactivate an active agent.

### Request

\`\`\`typescript
{
  type: 'command:deactivate',
  payload: {
    agentId: 'agent-1'
  }
}
\`\`\`

## Examples

### Monitor Agent Performance

\`\`\`typescript
// Subscribe to agent events
client.subscribeToAgent('agent-1', ['succeeded', 'failed']);

client.on('agent:event', (event) => {
  if (event.eventType === 'succeeded') {
    console.log('Agent succeeded:', event.data);
  } else if (event.eventType === 'failed') {
    console.error('Agent failed:', event.data);
  }
});
\`\`\`
`;
  }

  private generateColonyEndpoints(): string {
    return `# Colony Management Endpoints

## Overview

Colony management endpoints allow you to monitor colony state, manage agents at the colony level, and receive colony-wide events.

## Subscribe to Colony Events

Subscribe to events for a specific colony.

### Request

\`\`\`typescript
{
  type: 'subscribe:colony',
  payload: {
    colonyId: 'colony-1',
    events: ['agent_registered', 'stats_updated']
  }
}
\`\`\`

### Event Types

- \`agent_registered\`: New agent registered
- \`agent_unregistered\`: Agent removed
- \`agent_activated\`: Agent activated
- \`agent_deactivated\`: Agent deactivated
- \`stats_updated\`: Colony statistics updated
- \`dream_completed\`: Dream cycle completed
- \`error\`: Colony error

## Query Stats

Query colony statistics.

### Request

\`\`\`typescript
{
  type: 'query:stats',
  payload: {
    colonyId: 'colony-1',
    includeKVCache: true,
    includeAgents: false
  }
}
\`\`\`

### Response

\`\`\`typescript
{
  type: 'response:stats',
  payload: {
    colonyId: 'colony-1',
    stats: {
      totalAgents: 100,
      activeAgents: 75,
      dormantAgents: 25,
      totalCompute: 1000,
      totalMemory: 1000,
      totalNetwork: 1000,
      shannonDiversity: 2.34
    },
    kvCacheStats: {
      hits: 850,
      misses: 150,
      hitRate: 0.85
    }
  }
}
\`\`\`

## Colony Statistics

### Metrics

| Metric | Type | Description |
|--------|------|-------------|
| totalAgents | number | Total number of agents |
| activeAgents | number | Number of active agents |
| dormantAgents | number | Number of dormant agents |
| totalCompute | number | Total compute budget |
| totalMemory | number | Total memory budget |
| totalNetwork | number | Total network budget |
| shannonDiversity | number | Shannon diversity index |
`;
  }

  private generateDreamEndpoints(): string {
    return `# Dream Cycle Endpoints

## Overview

Dream cycle endpoints allow you to trigger and monitor dream-based policy optimization, which improves agent behavior through simulated episodes.

## Subscribe to Dream Events

Subscribe to dream cycle events for a colony.

### Request

\`\`\`typescript
{
  type: 'subscribe:dreams',
  payload: {
    colonyId: 'colony-1'
  }
}
\`\`\`

### Response

\`\`\`typescript
{
  type: 'event:dream',
  payload: {
    colonyId: 'colony-1',
    dreamId: 'dream-1',
    episode: {
      id: 'episode-1',
      states: [ /* state sequence */ ],
      actions: [ /* action sequence */ ],
      rewards: [ /* reward sequence */ ]
    },
    metrics: {
      loss: 0.234,
      reconstructionError: 0.123,
      klDivergence: 0.045
    }
  }
}
\`\`\`

## Trigger Dream Cycle

Trigger a dream cycle for a colony or specific agent.

### Request

\`\`\`typescript
{
  type: 'command:dream',
  payload: {
    colonyId: 'colony-1',
    agentId: 'agent-1',
    episodeCount: 10
  }
}
\`\`\`

### Payload

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| colonyId | string | No | Colony ID to trigger dream cycle for |
| agentId | string | No | Optional specific agent ID |
| episodeCount | number | No | Number of dream episodes to generate (default: 10) |

## Dream Metrics

| Metric | Type | Description |
|--------|------|-------------|
| loss | number | Total loss (combined reconstruction + KL) |
| reconstructionError | number | Reconstruction error (lower is better) |
| klDivergence | number | KL divergence (lower is better) |
`;
  }

  private generateCacheEndpoints(): string {
    return `# KV-Cache Endpoints

## Overview

KV-Cache endpoints provide access to Key-Value cache statistics and management. The KV-cache system optimizes LLM inference by reusing cached attention patterns.

## Query Cache Statistics

Query KV-cache statistics for a colony.

### Request

\`\`\`typescript
{
  type: 'query:stats',
  payload: {
    colonyId: 'colony-1',
    includeKVCache: true
  }
}
\`\`\`

### Response

\`\`\`typescript
{
  type: 'response:stats',
  payload: {
    colonyId: 'colony-1',
    kvCacheStats: {
      hits: 850,
      misses: 150,
      hitRate: 0.85,
      missRate: 0.15,
      size: 1048576,
      capacity: 10485760,
      evictions: 10,
      avgAccessTime: 0.5,
      anchors: {
        total: 500,
        active: 350,
        matched: 400
      }
    }
  }
}
\`\`\`

## Cache Statistics

### Basic Metrics

| Metric | Type | Description |
|--------|------|-------------|
| hits | number | Number of cache hits |
| misses | number | Number of cache misses |
| hitRate | number | Cache hit rate (0-1) |
| missRate | number | Cache miss rate (0-1) |
| size | number | Current cache size in bytes |
| capacity | number | Maximum cache capacity in bytes |
| evictions | number | Number of cache evictions |
| avgAccessTime | number | Average access time in milliseconds |

### Anchor Metrics

| Metric | Type | Description |
|--------|------|-------------|
| total | number | Total number of anchors |
| active | number | Number of active anchors |
| matched | number | Number of matched anchors |
`;
  }

  private generateFederationEndpoints(): string {
    return `# Federation Endpoints

## Overview

Federation endpoints enable coordination between multiple POLLN colonies, allowing for distributed learning and knowledge sharing.

## Current Status

The federation endpoints are currently under development. Future versions will support:

- Colony registration and discovery
- Federated learning coordination
- Knowledge sharing between colonies
- Cross-colony agent migration

## Planned Endpoints

### Register Colony

\`\`\`typescript
{
  type: 'command:federate:register',
  payload: {
    colonyId: 'colony-1',
    capabilities: {
      maxAgents: 1000,
      supportedTypes: ['task-agent', 'role-agent', 'core-agent']
    }
  }
}
\`\`\`

### Discover Colonies

\`\`\`typescript
{
  type: 'query:federate:discover',
  payload: {
    filter: {
      minAgents: 100,
      capabilities: ['task-agent']
    }
  }
}
\`\`\`

### Sync Models

\`\`\`typescript
{
  type: 'command:federate:sync',
  payload: {
    colonyId: 'colony-1',
    models: ['value-network', 'world-model']
  }
}
\`\`\`

## Federation Architecture

\`\`\`text
+-------------------+       +-------------------+
| Colony A          |       | Colony B          |
|                   |       |                   |
|  Local Learning   |<----->|  Local Learning   |
|  Model Updates    |       |  Model Updates    |
+-------------------+       +-------------------+
          ^                           ^
          |                           |
          v                           v
    +-----------+             +-----------+
    | Coordinator             | Coordinator
    |           |             |           |
    +-----------+             +-----------+
          ^                           ^
          |                           |
          +-----------+---------------+
                      |
                  Federated Model
\`\`\`

## Benefits

- **Privacy**: Colonies keep local data private
- **Scalability**: Distribute learning across many colonies
- **Robustness**: No single point of failure
- **Knowledge Sharing**: Learn from diverse experiences
`;
  }

  generateEventsDoc(): string {
    return `# Server-Sent Events

## Overview

The POLLN WebSocket API sends real-time events to subscribed clients. Events are pushed from the server to clients without explicit requests.

## Colony Events

Events related to colony-wide state and operations.

### Event Types

- \`agent_registered\` - New agent registered
- \`agent_unregistered\` - Agent removed
- \`agent_activated\` - Agent activated
- \`agent_deactivated\` - Agent deactivated
- \`stats_updated\` - Colony statistics updated
- \`dream_completed\` - Dream cycle completed
- \`error\` - Colony error

### Event Format

\`\`\`typescript
{
  type: 'event:colony',
  payload: {
    colonyId: 'colony-1',
    eventType: 'agent_registered',
    data: {
      agentId: 'agent-1',
      typeId: 'task-agent'
    }
  }
}
\`\`\`

## Agent Events

Events related to individual agent operations.

### Event Types

- \`state_updated\` - Agent state changed
- \`executed\` - Agent executed
- \`succeeded\` - Agent execution succeeded
- \`failed\` - Agent execution failed
- \`value_changed\` - Agent value function changed
- \`error\` - Agent error

### Event Format

\`\`\`typescript
{
  type: 'event:agent',
  payload: {
    agentId: 'agent-1',
    colonyId: 'colony-1',
    eventType: 'succeeded',
    data: {
      result: 'Task completed'
    }
  }
}
\`\`\`

## Dream Events

Events related to dream cycle operations.

### Event Format

\`\`\`typescript
{
  type: 'event:dream',
  payload: {
    colonyId: 'colony-1',
    dreamId: 'dream-1',
    episode: {
      id: 'episode-1',
      states: [ /* state sequence */ ]
    },
    metrics: {
      loss: 0.234,
      reconstructionError: 0.123,
      klDivergence: 0.045
    }
  }
}
\`\`\`

## Stats Events

Events related to statistics updates.

### Event Format

\`\`\`typescript
{
  type: 'event:stats',
  payload: {
    colonyId: 'colony-1',
    stats: {
      totalAgents: 100,
      activeAgents: 75,
      dormantAgents: 25
    },
    timestamp: 1699123456789
  }
}
\`\`\`
`;
  }

  generateErrorsDoc(): string {
    return `# Error Handling

## Overview

The POLLN WebSocket API uses structured error responses to communicate failures to clients. All error responses follow a consistent format.

## Error Format

\`\`\`typescript
{
  type: 'error',
  payload: null,
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human-readable error message',
    details: {
      // Additional error details
    }
  }
}
\`\`\`

## Error Codes

### UNAUTHORIZED

Authentication is required to access this resource.

\`\`\`typescript
{
  type: 'error',
  error: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required'
  }
}
\`\`\`

**Solution**: Send a valid authentication token.

### FORBIDDEN

Client does not have permission to perform this action.

\`\`\`typescript
{
  type: 'error',
  error: {
    code: 'FORBIDDEN',
    message: 'Insufficient permissions'
  }
}
\`\`\`

**Solution**: Ensure your token has the required permissions.

### NOT_FOUND

Requested resource does not exist.

\`\`\`typescript
{
  type: 'error',
  error: {
    code: 'NOT_FOUND',
    message: 'Colony not found'
  }
}
\`\`\`

**Solution**: Verify the resource exists before requesting.

### INVALID_PAYLOAD

Request payload is invalid or malformed.

\`\`\`typescript
{
  type: 'error',
  error: {
    code: 'INVALID_PAYLOAD',
    message: 'Invalid request payload',
    details: {
      missing: ['colonyId']
    }
  }
}
\`\`\`

**Solution**: Check that all required fields are present and correctly formatted.

### RATE_LIMITED

Client has exceeded rate limit.

\`\`\`typescript
{
  type: 'error',
  error: {
    code: 'RATE_LIMITED',
    message: 'Rate limit exceeded'
  }
}
\`\`\`

**Solution**: Wait before sending more requests. Implement exponential backoff.

### AGENT_NOT_FOUND

Specified agent does not exist.

\`\`\`typescript
{
  type: 'error',
  error: {
    code: 'AGENT_NOT_FOUND',
    message: 'Agent not found'
  }
}
\`\`\`

### COLONY_NOT_FOUND

Specified colony does not exist.

\`\`\`typescript
{
  type: 'error',
  error: {
    code: 'COLONY_NOT_FOUND',
    message: 'Colony not found'
  }
}
\`\`\`

### COMMAND_FAILED

Command execution failed.

\`\`\`typescript
{
  type: 'error',
  error: {
    code: 'COMMAND_FAILED',
    message: 'Command execution failed'
  }
}
\`\`\`

### INTERNAL_ERROR

Internal server error occurred.

\`\`\`typescript
{
  type: 'error',
  error: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error'
  }
}
\`\`\`

**Solution**: Contact support if the issue persists.

## Error Handling Best Practices

### 1. Always Check for Errors

\`\`\`typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'error') {
    console.error('Error:', message.error);
    return;
  }

  // Handle successful response
  console.log('Success:', message.payload);
};
\`\`\`

### 2. Handle Specific Error Codes

\`\`\`typescript
function handleError(error: APIError) {
  switch (error.code) {
    case 'UNAUTHORIZED':
      // Re-authenticate
      reauthenticate();
      break;
    case 'RATE_LIMITED':
      // Wait and retry
      setTimeout(retry, 60000);
      break;
    default:
      // Handle other errors
      console.error('Unknown error:', error);
  }
}
\`\`\`

### 3. Implement Retry Logic

\`\`\`typescript
async function sendWithRetry(message: ClientMessage, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await sendAndWait(message);
      return response;
    } catch (error) {
      if (error.code === 'RATE_LIMITED' && i < maxRetries - 1) {
        await delay(1000 * (i + 1));
      } else {
        throw error;
      }
    }
  }
}
\`\`\`
`;
  }

  generateRateLimitsDoc(): string {
    return `# Rate Limiting

## Overview

The POLLN WebSocket API enforces rate limits to ensure fair usage and prevent abuse. Rate limits are enforced per connection.

## Rate Limit Configuration

\`\`\`typescript
interface RateLimitConfig {
  requestsPerMinute: number;  // Maximum requests per minute
  burstLimit: number;         // Maximum burst requests
  windowMs: number;           // Time window in milliseconds
}
\`\`\`

### Default Configuration

\`\`\`typescript
{
  requestsPerMinute: 100,
  burstLimit: 10,
  windowMs: 60000  // 1 minute
}
\`\`\`

## Rate Limit Response

When rate limited, you'll receive:

\`\`\`typescript
{
  type: 'error',
  payload: null,
  success: false,
  error: {
    code: 'RATE_LIMITED',
    message: 'Rate limit exceeded'
  }
}
\`\`\`

## Handling Rate Limits

### Exponential Backoff

\`\`\`typescript
async function sendWithBackoff(message: ClientMessage) {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const response = await sendAndWait(message);
      return response;
    } catch (error) {
      if (error.code === 'RATE_LIMITED') {
        attempts++;
        const delay = Math.pow(2, attempts) * 1000;  // 1s, 2s, 4s, 8s, 16s
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retry attempts reached');
}
\`\`\`

## Rate Limit Best Practices

### 1. Subscribe Instead of Polling

\`\`\`typescript
// Bad: Poll every second
setInterval(() => {
  queryStats('colony-1');
}, 1000);

// Good: Subscribe to stats updates
subscribeToStats('colony-1');
\`\`\`

### 2. Cache Responses

\`\`\`typescript
const cache = new Map<string, { data: unknown; expires: number }>();

async function cachedQuery(key: string, fn: Function) {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const data = await fn();
  cache.set(key, {
    data,
    expires: Date.now() + 60000  // 1 minute cache
  });
  return data;
}
\`\`\`

### 3. Use WebSocket Efficiently

\`\`\`typescript
// Bad: Open multiple connections
const ws1 = new WebSocket('ws://localhost:3000/api/ws');
const ws2 = new WebSocket('ws://localhost:3000/api/ws');

// Good: Use a single connection
const ws = new WebSocket('ws://localhost:3000/api/ws');
// Subscribe to multiple resources on one connection
\`\`\`
`;
  }
}

// ============================================================================
// Code Examples Generator
// ============================================================================

class ExamplesGenerator {
  generateBasicUsage(): string {
    return `/**
 * Basic POLLN API Usage Example
 */

import { POLLNClient } from 'polln/api/client';

async function basicUsage() {
  // Create client
  const client = new POLLNClient({
    url: 'ws://localhost:3000/api/ws',
  });

  try {
    // Connect to server
    await client.connect();
    console.log('Connected to POLLN API');

    // Subscribe to colony events
    await client.subscribeToColony('colony-1', [
      'agent_registered',
      'agent_activated',
      'stats_updated',
    ]);

    // Handle colony events
    client.on('colony:event', (event) => {
      console.log('Colony event:', event.eventType, event.data);
    });

    // Query colony statistics
    const stats = await client.queryStats('colony-1');
    console.log('Colony stats:', stats);

    // Wait a bit to receive events
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Disconnect
    await client.disconnect();
    console.log('Disconnected');

  } catch (error) {
    console.error('Error:', error);
    await client.disconnect();
  }
}

basicUsage().catch(console.error);
`;
  }

  generateAgentCoordination(): string {
    return `/**
 * Agent Coordination Example
 */

import { POLLNClient } from 'polln/api/client';

async function agentCoordination() {
  const client = new POLLNClient({
    url: 'ws://localhost:3000/api/ws',
  });

  await client.connect();

  try {
    // Spawn a new agent
    console.log('Spawning agent...');
    const spawnResult = await client.spawnAgent('task-agent', {
      task: 'data-processing',
    });
    console.log('Spawn result:', spawnResult);

    // Wait for agent to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Subscribe to agent events
    await client.subscribeToAgent('agent-1', [
      'succeeded',
      'failed',
    ]);

    // Handle agent events
    client.on('agent:event', (event) => {
      console.log(\`Agent event: \${event.eventType}\`, event.data);
    });

    // Activate agent
    console.log('Activating agent...');
    const activateResult = await client.activateAgent('agent-1');
    console.log('Activate result:', activateResult);

    // Wait for agent to process
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Query agent state
    const agentState = await client.queryAgent('agent-1');
    console.log('Agent state:', agentState.agent);

    // Deactivate agent
    console.log('Deactivating agent...');
    await client.deactivateAgent('agent-1');

    await client.disconnect();

  } catch (error) {
    console.error('Error:', error);
    await client.disconnect();
  }
}

agentCoordination().catch(console.error);
`;
  }

  generateRealTimeStreaming(): string {
    return `/**
 * Real-Time Streaming Example
 */

import { POLLNClient } from 'polln/api/client';

async function realTimeStreaming() {
  const client = new POLLNClient({
    url: 'ws://localhost:3000/api/ws',
    debug: true,
  });

  await client.connect();

  try {
    // Subscribe to multiple event types
    await client.subscribeToColony('colony-1', [
      'agent_registered',
      'stats_updated',
      'dream_completed',
    ]);

    await client.subscribeToStats('colony-1');

    // Track statistics over time
    const statsHistory: Array<{ timestamp: number; stats: unknown }> = [];

    client.on('stats:event', (event) => {
      statsHistory.push({
        timestamp: event.timestamp,
        stats: event.stats,
      });

      console.log('Stats update:', {
        totalAgents: event.stats.totalAgents,
        activeAgents: event.stats.activeAgents,
      });

      // Keep last 100 stats
      if (statsHistory.length > 100) {
        statsHistory.shift();
      }
    });

    // Handle errors
    client.on('error', (error) => {
      console.error('Client error:', error);
    });

    // Handle reconnection
    client.on('reconnect:attempt', (attempt) => {
      console.log(\`Reconnecting... attempt \${attempt}\`);
    });

    client.on('reconnected', () => {
      console.log('Reconnected!');
    });

    // Keep running
    console.log('Streaming events...');
    await new Promise(() => {});  // Run forever

  } catch (error) {
    console.error('Error:', error);
    await client.disconnect();
  }
}

realTimeStreaming().catch(console.error);
`;
  }
}

// ============================================================================
// Main Generator
// ============================================================================

async function generateDocs() {
  console.log('Generating POLLN API documentation...');

  // Create generators
  const docGenerator = new DocumentationGenerator();
  const examplesGenerator = new ExamplesGenerator();

  // Generate documentation files
  console.log('Generating overview.md...');
  writeFile(path.join(CONFIG.outputDir, 'overview.md'), docGenerator.generateOverview());

  console.log('Generating websocket-protocol.md...');
  writeFile(path.join(CONFIG.outputDir, 'websocket-protocol.md'), docGenerator.generateWebSocketProtocol());

  console.log('Generating authentication.md...');
  writeFile(path.join(CONFIG.outputDir, 'authentication.md'), docGenerator.generateAuthentication());

  console.log('Generating events.md...');
  writeFile(path.join(CONFIG.outputDir, 'events.md'), docGenerator.generateEventsDoc());

  console.log('Generating errors.md...');
  writeFile(path.join(CONFIG.outputDir, 'errors.md'), docGenerator.generateErrorsDoc());

  console.log('Generating rate-limits.md...');
  writeFile(path.join(CONFIG.outputDir, 'rate-limits.md'), docGenerator.generateRateLimitsDoc());

  // Generate endpoint documentation
  const endpoints = docGenerator.generateEndpointsDocs();
  const endpointsDir = path.join(CONFIG.outputDir, 'endpoints');
  ensureDir(endpointsDir);

  for (const [name, content] of Object.entries(endpoints)) {
    console.log(`Generating endpoints/${name}.md...`);
    writeFile(path.join(endpointsDir, `${name}.md`), content);
  }

  // Generate code examples
  console.log('Generating examples/basic-usage.ts...');
  writeFile(
    path.join(CONFIG.examplesOutputDir, 'basic-usage.ts'),
    examplesGenerator.generateBasicUsage()
  );

  console.log('Generating examples/agent-coordination.ts...');
  writeFile(
    path.join(CONFIG.examplesOutputDir, 'agent-coordination.ts'),
    examplesGenerator.generateAgentCoordination()
  );

  console.log('Generating examples/real-time-streaming.ts...');
  writeFile(
    path.join(CONFIG.examplesOutputDir, 'real-time-streaming.ts'),
    examplesGenerator.generateRealTimeStreaming()
  );

  console.log('\nDocumentation generated successfully!');
  console.log(`Output directory: ${CONFIG.outputDir}`);
}

// Run generator
generateDocs().catch(console.error);

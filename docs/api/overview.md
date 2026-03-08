# POLLN WebSocket API

Real-time monitoring and control API for POLLN (Pattern-Organized Large Language Network).

This WebSocket API provides real-time access to colony events, agent lifecycle management,
dream cycle notifications, and KV-cache statistics.

## Quick Start

### Installation

```bash
npm install polln
```

### Basic Usage

```typescript
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
```

## Servers

- **Local development**: `ws://localhost:3000/api/ws`
- **Production**: `wss://api.polln.io/api/ws`

## Authentication

When authentication is enabled, include a token in your first message:

```typescript
const client = new POLLNClient({
  url: 'ws://localhost:3000/api/ws',
  token: 'your-api-token',
});
```

## Rate Limiting

Rate limiting is enforced per connection:

- **requestsPerMinute**: Maximum requests per minute (default: 100)
- **burstLimit**: Maximum burst requests (default: 10)

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

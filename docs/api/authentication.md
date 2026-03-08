# Authentication

## Overview

POLLN WebSocket API supports token-based authentication. When enabled, clients must authenticate before sending other messages.

## Authentication Flow

### 1. Server-Side Token Generation

```typescript
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
```

### 2. Client Authentication

Send authentication as first message:

```typescript
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
```

## Permissions

Tokens include permissions for specific resources and actions:

### Resources

- `colony`: Colony management and events
- `agent`: Agent lifecycle and control
- `dream`: Dream cycle operations
- `stats`: Statistics and monitoring

### Actions

- `read`: Query and subscribe to data
- `write`: Send commands and modify state
- `admin`: Administrative operations

### Permission Examples

```typescript
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
```

## Token Management

### Validate Token

```typescript
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
```

### Revoke Token

```typescript
auth.revokeToken('your-api-token');
console.log('Token revoked');
```

### Check Permissions

```typescript
const client = auth.authenticate('client-id', 'your-api-token');

if (client && auth.hasPermission(client, 'colony', 'write')) {
  console.log('Client can write to colony');
}
```

### Cleanup Expired Tokens

```typescript
// Run periodically (e.g., every hour)
const count = auth.cleanupExpiredTokens();
console.log(`Cleaned up ${count} expired tokens`);
```

## Configuration

### Server Configuration

```typescript
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
```

## Security Considerations

1. **Use WSS (WebSocket Secure) in production**

```typescript
const client = new POLLNClient({
  url: 'wss://api.polln.io/api/ws',
  token: 'your-token',
});
```

2. **Store tokens securely**

- Never expose tokens in client-side code
- Use HTTP-only cookies for web clients
- Implement proper CORS headers

3. **Implement rate limiting per token**

```typescript
const server = createPOLLNServer({
  port: 3000,
  rateLimit: {
    requestsPerMinute: 100,
    burstLimit: 10,
  },
});
```

4. **Monitor and log authentication events**

```typescript
server.on('connection:opened', ({ clientId }) => {
  console.log(`Client connected: ${clientId}`);
});

server.on('connection:closed', ({ clientId }) => {
  console.log(`Client disconnected: ${clientId}`);
});
```

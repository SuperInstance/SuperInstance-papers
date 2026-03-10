# POLLN WebSocket Authentication System

Complete WebSocket authentication, authorization, and validation system for the POLLN Spreadsheet backend.

## Features

- **JWT Authentication**: Token-based authentication with automatic refresh
- **Session Management**: Track active connections with user presence
- **Message Validation**: Schema-based validation with rate limiting
- **Authorization**: Resource-based permissions with cell-level access control
- **Metrics Tracking**: Real-time connection and message statistics
- **Audit Logging**: Complete audit trail of all operations
- **Rate Limiting**: Per-IP and per-user rate limiting
- **Graceful Shutdown**: Clean connection handling on server stop

## Performance Targets

- Connection establishment: <50ms
- Message validation: <5ms
- Authorization check: <2ms

## Installation

The dependencies are already included in the POLLN project:

```json
{
  "ws": "^8.18.0",
  "jsonwebtoken": "^9.0.3"
}
```

## Quick Start

### Basic Server Setup

```typescript
import { AuthService } from './auth/AuthService.js';
import { createWebSocketServer } from './websocket/index.js';

// Create auth service
const authService = new AuthService({
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
});

// Create and start WebSocket server
const wsServer = createWebSocketServer({
  port: 8080,
  authService,
});

await wsServer.start();
```

### Client Connection

```javascript
// Connect with JWT token
const token = 'your-jwt-token';
const ws = new WebSocket(`ws://localhost:8080?token=${token}`);

// Send messages
ws.send(JSON.stringify({
  type: 'cell.read',
  payload: { cellId: 'A1' },
  messageId: 'msg-1',
}));

// Handle responses
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## Architecture

### Components

#### 1. WSAuthMiddleware
Handles connection authentication and message authorization.

```typescript
import { WSAuthMiddleware } from './websocket/auth/WSAuthMiddleware.js';

const authMiddleware = new WSAuthMiddleware(
  authService,
  sessionManager,
  authorizer,
  metrics,
  { jwtSecret: 'your-secret' }
);

// Authenticate connection
const result = await authMiddleware.authenticateConnection(token, ipAddress);
```

#### 2. WSMessageValidator
Validates incoming messages against schemas.

```typescript
import { WSMessageValidator } from './websocket/auth/WSMessageValidator.js';

const validator = new WSMessageValidator();

// Validate message
const result = await validator.validateMessage(userId, messageType, payload);
```

#### 3. WSSessionManager
Manages active connections and user presence.

```typescript
import { WSSessionManager } from './websocket/auth/WSSessionManager.js';

const sessionManager = new WSSessionManager(authService);

// Register connection
await sessionManager.registerConnection(context);

// Get user presence
const presence = sessionManager.getUserPresence(userId);
```

#### 4. WSAuthorizer
Handles resource-based authorization.

```typescript
import { WSAuthorizer } from './websocket/auth/WSAuthorizer.js';

const authorizer = new WSAuthorizer();

// Authorize message
const result = await authorizer.authorizeMessage(context, messageType, payload);
```

#### 5. WSMetrics
Tracks connection and message statistics.

```typescript
import { WSMetrics } from './websocket/auth/WSMetrics.js';

const metrics = new WSMetrics();

// Record metrics
metrics.recordConnectionEstablishment(role, duration);
metrics.recordMessage(messageType, role, authorized);

// Get statistics
const stats = metrics.getAllStats();
```

## Message Types

### Default Message Types

| Type | Required Fields | Optional Fields | Permissions |
|------|----------------|-----------------|-------------|
| `cell.read` | `cellId` | - | `cells:read` |
| `cell.update` | `cellId`, `value` | `formula` | `cells:write` |
| `cell.delete` | `cellId` | - | `cells:delete` |
| `spreadsheet.read` | - | - | `spreadsheet:read` |
| `spreadsheet.write` | `data` | - | `spreadsheet:write` |
| `spreadsheet.query` | `query` | `options` | `spreadsheet:read` |
| `system.ping` | - | - | None |
| `system.subscribe` | `events` | - | None |

### Custom Message Types

```typescript
wsServer.registerHandler('custom.action', async (context, type, payload, messageId) => {
  // Handle message
  return { success: true, data: 'response' };
});
```

## Configuration

### WebSocket Server Config

```typescript
interface WebSocketServerConfig {
  port: number;
  host?: string;
  authService: AuthService;
  jwtSecret?: string;
  enableAuth?: boolean;
  enableValidation?: boolean;
  enableRateLimiting?: boolean;
  enableMetrics?: boolean;
  enableAuditLog?: boolean;
  pingInterval?: number;        // Default: 30000ms
  pingTimeout?: number;          // Default: 5000ms
  maxPayload?: number;           // Default: 1MB
}
```

### Auth Middleware Config

```typescript
interface WSAuthMiddlewareConfig {
  jwtSecret: string;
  maxConnectionsPerMinute: number;  // Default: 60
  rateLimitWindow: number;          // Default: 60000ms
  sessionTimeout: number;           // Default: 3600000ms
  tokenRefreshThreshold: number;    // Default: 300000ms
  enableAdminOverride: boolean;     // Default: true
}
```

### Message Validator Config

```typescript
interface WSMessageValidatorConfig {
  maxMessageSize: number;           // Default: 1MB
  maxMessagesPerMinute: number;     // Default: 120
  rateLimitWindow: number;          // Default: 60000ms
  enableSanitization: boolean;      // Default: true
  enableCache: boolean;             // Default: true
  cacheTTL: number;                 // Default: 60000ms
  maxCacheSize: number;             // Default: 1000
}
```

## API Reference

### WebSocketServer

#### Methods

- `start()`: Start the WebSocket server
- `stop()`: Stop the server gracefully
- `send(ws, message)`: Send message to client
- `broadcast(message)`: Broadcast to all clients
- `broadcastToUser(userId, message)`: Broadcast to specific user
- `registerHandler(messageType, handler)`: Register message handler
- `getStats()`: Get server statistics

#### Events

- `connection`: New connection (context)
- `connectionAuthenticated`: Authenticated connection (context)
- `connectionDisconnected`: Disconnection (context, code, reason)
- `message`: Message received (context, message)
- `error`: Server error (error)

### WSConnectionContext

```typescript
interface WSConnectionContext {
  userId: string;
  username: string;
  email: string;
  role: string;
  permissions: Permission[];
  sessionId: string;
  connectedAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent?: string;
}
```

## Security

### JWT Token Validation

All connections must provide a valid JWT token via query parameter:

```
ws://localhost:8080?token=YOUR_JWT_TOKEN
```

### Rate Limiting

- **Connection rate limit**: 60 connections per minute per IP
- **Message rate limit**: 120 messages per minute per user
- Configurable per message type weights

### Input Sanitization

Dangerous input is automatically sanitized:

- Script tags removed
- JavaScript protocols removed
- Event handlers removed
- Control characters removed

### Permission System

Role-based permissions with resource-level access control:

```typescript
enum Permission {
  CELLS_READ = 'cells:read',
  CELLS_WRITE = 'cells:write',
  CELLS_DELETE = 'cells:delete',
  CELLS_ENTANGLE = 'cells:entangle',
  SPREADSHEET_READ = 'spreadsheet:read',
  SPREADSHEET_WRITE = 'spreadsheet:write',
  SPREADSHEET_ADMIN = 'spreadsheet:admin',
  USERS_MANAGE = 'users:manage',
  SYSTEM_ADMIN = 'system:admin',
}
```

## Monitoring

### Statistics

```typescript
const stats = wsServer.getStats();

console.log('Connections:', stats.connections);
console.log('Messages:', stats.metrics.messages.total);
console.log('Errors:', stats.metrics.errors.total);
console.log('Throughput:', stats.metrics.throughput);
```

### Audit Log

```typescript
const auditLog = wsServer.getAuditLog(100); // Last 100 entries

console.log('Audit Log:', auditLog);
```

## Testing

Run the comprehensive test suite:

```bash
npm test -- websocket-auth.test.ts
```

## Example

See `examples/websocket-auth-demo.ts` for a complete working example.

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines first.

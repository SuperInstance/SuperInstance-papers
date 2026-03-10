# Real-Time Collaboration Layer for POLLN Spreadsheets

A production-ready, WebSocket-based real-time collaboration system designed for spreadsheet applications with support for 100+ concurrent users and sub-100ms update propagation.

## Features

- **Real-time Updates**: Sub-100ms propagation of cell updates across all connected clients
- **Conflict Resolution**: Multiple strategies (LWW, semantic, manual) with operational transformation
- **User Presence**: Live cursor tracking, user status, and activity monitoring
- **Room Management**: Scalable room-based architecture supporting 1000+ rooms
- **Automatic Reconnection**: Exponential backoff reconnection handling
- **Memory Efficient**: Delta-based updates and intelligent caching
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   CollaborationServer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Room 1     │  │   Room 2     │  │   Room N     │      │
│  │  (100 users) │  │  (100 users) │  │  (100 users) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
│                   ┌───────▼───────┐                         │
│                   │ WebSocket Hub │                         │
│                   └───────┬───────┘                         │
└───────────────────────────┼─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
│  Client 1      │  │  Client 2      │  │  Client N      │
│  (Browser)     │  │  (Browser)     │  │  (Browser)     │
└────────────────┘  └────────────────┘  └────────────────┘
```

## Installation

```bash
npm install @polln/collaboration
```

## Quick Start

### Server Setup

```typescript
import { CollaborationServer } from '@polln/collaboration';

// Create server
const server = new CollaborationServer({
  port: 8080,
  maxRooms: 1000,
  maxUsersPerRoom: 100,
  heartbeatInterval: 30000,
  heartbeatTimeout: 60000,
});

// Create a room for a spreadsheet
const room = server.createRoom('sheet-123', 'sheet-123');

console.log('Collaboration server running on port 8080');
```

### Client Setup

```typescript
import { CollaborationClient } from '@polln/collaboration';

// Create client
const client = new CollaborationClient({
  roomId: 'sheet-123',
  userId: 'user-456',
  userName: 'John Doe',
  userColor: '#FF6B6B',
}, 'ws://localhost:8080');

// Connect to server
await client.connect();

// Subscribe to remote updates
client.onRemoteUpdate((update) => {
  console.log('Remote update:', update);
  // Apply update to local spreadsheet
});

// Subscribe to user presence
client.onUserPresence((users) => {
  console.log('Active users:', users);
  // Update UI with user cursors
});

// Send local update
client.sendUpdate({
  id: 'update-1',
  cellId: 'A1',
  type: 'set',
  value: '42',
  userId: 'user-456',
  timestamp: Date.now(),
  version: 1,
});

// Broadcast cursor position
client.broadcastCursor({
  row: 0,
  col: 0,
  selection: {
    startRow: 0,
    startCol: 0,
    endRow: 2,
    endCol: 2,
  },
});
```

## Core Components

### CollaborationServer

Manages WebSocket connections, rooms, and broadcast logic.

```typescript
const server = new CollaborationServer({
  port: 8080,
  maxRooms: 1000,
  maxUsersPerRoom: 100,
});

// Create room
const room = server.createRoom('room-id', 'sheet-id', {
  maxUsers: 100,
  heartbeatInterval: 30000,
  idleTimeout: 300000,
  enablePresence: true,
  enableCursors: true,
  conflictStrategy: 'last-write-wins',
});

// Get statistics
const stats = server.getStats();
console.log(stats);
// {
//   totalUsers: 150,
//   totalRooms: 5,
//   totalUpdates: 5000,
//   totalConflicts: 12,
//   averageLatency: 45,
//   uptime: 3600000
// }
```

### CollaborationClient

Client-side WebSocket connection with automatic reconnection.

```typescript
const client = new CollaborationClient({
  roomId: 'room-123',
  userId: 'user-456',
  userName: 'Jane Doe',
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
});

// Connect
await client.connect();

// Check connection state
if (client.isConnected()) {
  console.log('Connected!');
}

// Force reconnect
await client.reconnect();

// Disconnect
client.disconnect();
```

### OperationTransformer

Operational Transformation (OT) for conflict-free concurrent edits.

```typescript
const transformer = new OperationTransformer();

// Transform operations
const localOp: LocalOperation = {
  id: 'op1',
  cellId: 'A1',
  type: 'insert',
  value: 'hello',
  userId: 'user1',
  timestamp: Date.now(),
  version: 1,
};

const remoteOp: RemoteOperation = {
  id: 'op2',
  cellId: 'A1',
  type: 'insert',
  value: 'world',
  userId: 'user2',
  timestamp: Date.now() + 50,
  version: 1,
  transformed: false,
};

const result = transformer.transform(localOp, remoteOp);

console.log(result);
// {
//   operation: { ... },
//   conflict: true,
//   conflictResolution: { ... }
// }

// Compose operations
const composed = transformer.compose(op1, op2);

// Invert operation
const inverted = transformer.invert(op, baseValue);

// Calculate delta for memory efficiency
const delta = transformer.calculateDelta(oldValue, newValue);
```

### ConflictResolver

Multiple conflict resolution strategies with custom merge policies.

```typescript
const resolver = new ConflictResolver('last-write-wins');

// Resolve conflict
const update1: CellUpdate = {
  cellId: 'A1',
  operation: 'update',
  value: '42',
  version: 1,
  userId: 'user1',
  timestamp: Date.now(),
};

const update2: CellUpdate = {
  cellId: 'A1',
  operation: 'update',
  value: '43',
  version: 1,
  userId: 'user2',
  timestamp: Date.now() + 50,
};

const resolution = resolver.resolve(update2, update1);

console.log(resolution);
// {
//   strategy: 'last-write-wins',
//   winningOperation: { ... },
//   rejectedOperation: { ... },
//   reason: 'Concurrent update resolved by timestamp',
//   mergedValue: undefined
// }

// Add custom merge policy
resolver.addMergePolicy({
  name: 'numeric-addition',
  canMerge: (update1, update2) => {
    return typeof update1.value === 'number' &&
           typeof update2.value === 'number';
  },
  merge: (update1, update2) => {
    return (update1.value as number) + (update2.value as number);
  },
  priority: 1,
});

// Get conflict statistics
const stats = resolver.getConflictStats();
console.log(stats);
// {
//   total: 100,
//   byStrategy: {
//     'last-write-wins': 80,
//     'semantic': 15,
//     'manual': 5
//   },
//   byType: { ... }
// }
```

### PresenceManager

User presence tracking with cursor positions and activity monitoring.

```typescript
// PresenceManager is used internally by CollaborationManager
// But can be used directly for custom presence tracking

import { PresenceManager } from '@polln/collaboration';

const presenceManager = new PresenceManager(awareness, {
  idleTimeout: 60000,
  awayTimeout: 300000,
  updateInterval: 10000,
});

// Update cursor
presenceManager.updateCursor({
  row: 5,
  col: 3,
  selection: {
    startRow: 5,
    startCol: 3,
    endRow: 7,
    endCol: 5,
  },
});

// Get users in specific cell
const usersInCell = presenceManager.getUsersInCell(5, 3);

// Get presence summary
const summary = presenceManager.getPresenceSummary();
console.log(summary);
// {
//   total: 10,
//   online: 6,
//   idle: 2,
//   away: 1,
//   editing: 1
// }
```

## Conflict Resolution Strategies

### Last-Write-Wins (LWW)

Default strategy using timestamps to determine winner.

```typescript
const resolver = new ConflictResolver('last-write-wins');
```

### First-Write-Wins

Opposite of LWW - first operation wins.

```typescript
const resolver = new ConflictResolver('first-write-wins');
```

### Semantic

Intelligent merging based on data types and custom policies.

```typescript
const resolver = new ConflictResolver('semantic');

// Built-in semantic policies:
// - Numeric addition: 10 + 20 = 30
// - String concatenation: "hello" + "world" = "helloworld"
// - Array merge: [1,2] + [2,3] = [1,2,3]
// - Object merge: {a:1} + {b:2} = {a:1, b:2}
// - Boolean AND/OR
```

### Manual

Requires user intervention for conflict resolution.

```typescript
const resolver = new ConflictResolver('manual');

// Listen for conflicts
resolver.onConflict((conflict) => {
  // Show UI to user for manual resolution
  showConflictModal(conflict);
});
```

## Performance Optimization

### Memory Efficiency

```typescript
// Use delta representation for large values
const transformer = new OperationTransformer();

const oldValue = 'a'.repeat(10000);
const newValue = 'b'.repeat(10000);

const delta = transformer.calculateDelta(oldValue, newValue);
// Delta is much smaller than full values

// Apply delta
const applied = transformer.applyDelta(oldValue, delta.delta);
```

### Caching

```typescript
// Transformation results are cached
const transformer = new OperationTransformer();

// Get cache statistics
const stats = transformer.getCacheStats();
console.log(stats);
// {
//   size: 1000,
//   hits: 5000,
//   misses: 500,
//   hitRate: 0.91
// }

// Clear cache if needed
transformer.clearCache();
```

### Batch Updates

```typescript
// Updates are automatically batched on server
const room = server.createRoom('room-id', 'sheet-id');

// Process multiple updates
updates.forEach(update => room.processUpdate(update));

// Get buffered updates for broadcast
const buffered = room.getBufferedUpdates();
```

## Testing

```typescript
import { CollaborationServer, CollaborationClient } from '@polln/collaboration';

describe('Collaboration', () => {
  it('should handle concurrent edits', async () => {
    const server = new CollaborationServer({ port: 8080 });
    const client1 = new CollaborationClient({ roomId: 'test', userId: 'user1' });
    const client2 = new CollaborationClient({ roomId: 'test', userId: 'user2' });

    await client1.connect();
    await client2.connect();

    // Both users edit same cell
    client1.sendUpdate({
      id: 'op1',
      cellId: 'A1',
      type: 'set',
      value: '42',
      userId: 'user1',
      timestamp: Date.now(),
      version: 1,
    });

    client2.sendUpdate({
      id: 'op2',
      cellId: 'A1',
      type: 'set',
      value: '43',
      userId: 'user2',
      timestamp: Date.now() + 50,
      version: 1,
    });

    // Both should receive resolved update
    await new Promise(resolve => setTimeout(resolve, 100));

    server.close();
    client1.destroy();
    client2.destroy();
  });
});
```

## API Reference

### Types

```typescript
// Core types
export type CellValue = string | number | boolean | null | undefined;
export type CellOperationType = 'insert' | 'update' | 'delete' | 'format' | 'move';
export type UserStatus = 'online' | 'idle' | 'away' | 'editing';
export type ConflictStrategy = 'last-write-wins' | 'first-write-wins' | 'semantic' | 'manual';

// Cell update
export interface CellUpdate {
  cellId: string;
  operation: CellOperationType;
  value: CellValue;
  version: number;
  userId: string;
  timestamp: number;
  metadata?: {
    formula?: string;
    format?: CellFormat;
    dependencies?: string[];
  };
}

// Cursor position
export interface CursorPosition {
  row: number;
  col: number;
  selection?: CellSelection;
}

// User presence
export interface PresenceInfo {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  status: UserStatus;
  cursor?: CursorPosition;
  lastActivity: number;
  clientId: number;
  isLocal: boolean;
}
```

### CollaborationServer

```typescript
class CollaborationServer {
  constructor(config?: ServerConfig);

  // Room management
  createRoom(roomId: string, sheetId: string, config?: RoomConfig): CollaborationRoom;
  getRoom(roomId: string): CollaborationRoom | undefined;
  destroyRoom(roomId: string): void;

  // Statistics
  getStats(): CollaborationStats;
  getPerformanceMetrics(): PerformanceMetrics;

  // Lifecycle
  close(): void;
}
```

### CollaborationClient

```typescript
class CollaborationClient {
  constructor(config: ClientConfig, serverUrl?: string);

  // Connection
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionState(): ConnectionState;

  // Operations
  sendUpdate(operation: LocalOperation): void;
  broadcastCursor(position: CursorPosition): void;

  // Events
  onRemoteUpdate(callback: (update: RemoteOperation) => void): () => void;
  onUserPresence(callback: (users: PresenceInfo[]) => void): () => void;
  onUserJoin(callback: (user: PresenceInfo) => void): () => void;
  onUserLeave(callback: (userId: string) => void): () => void;
  onConnected(callback: () => void): () => void;
  onDisconnected(callback: () => void): () => void;
  onReconnecting(callback: (attempt: number) => void): () => void;
  onConflict(callback: (conflict: any) => void): () => void;
  onError(callback: (error: CollaborationErrorWithContext) => void): () => void;

  // State
  getSyncState(): SyncState;
  getRemoteUsers(): PresenceInfo[];

  // Lifecycle
  destroy(): void;
}
```

### OperationTransformer

```typescript
class OperationTransformer {
  constructor(maxHistorySize?: number);

  // Transformation
  transform(local: LocalOperation, remote: RemoteOperation): TransformedOperation;
  compose(op1: Operation, op2: Operation): Operation;
  invert(op: Operation, baseValue: CellValue): Operation;

  // Delta
  calculateDelta(oldValue: CellValue, newValue: CellValue): Delta;
  applyDelta(value: CellValue, delta: string): CellValue;

  // History
  getHistory(cellId: string): Operation[];
  clearHistory(): void;

  // Cache
  getCacheStats(): CacheStats;
  clearCache(): void;

  // Lifecycle
  destroy(): void;
}
```

### ConflictResolver

```typescript
class ConflictResolver {
  constructor(strategy?: ConflictStrategy);

  // Resolution
  resolve(update: CellUpdate, previousUpdate?: CellUpdate): ConflictResolution;

  // Strategies
  setStrategy(strategy: ConflictStrategy): void;
  getStrategy(): ConflictStrategy;

  // Merge policies
  addMergePolicy(policy: MergePolicy & { name: string }): void;
  removeMergePolicy(name: string): void;
  getMergePolicy(name: string): MergePolicy | undefined;
  getMergePolicies(): Map<string, MergePolicy>;

  // History
  getConflictHistory(): ConflictResolution[];
  getConflictStats(): ConflictStats;
  clearHistory(): void;

  // Import/Export
  exportHistory(): string;
  importHistory(json: string): void;

  // Lifecycle
  destroy(): void;
}
```

## Best Practices

### 1. Connection Management

```typescript
// Always handle reconnection
client.onDisconnected(() => {
  console.log('Disconnected, attempting to reconnect...');
});

client.onReconnecting((attempt) => {
  console.log(`Reconnection attempt ${attempt}/5`);
});

// Clean up on unmount
onUnmount(() => {
  client.destroy();
});
```

### 2. Conflict Resolution

```typescript
// Use semantic strategy for collaborative data
const resolver = new ConflictResolver('semantic');

// Add custom merge policies for your data types
resolver.addMergePolicy({
  name: 'currency-merge',
  canMerge: (update1, update2) => {
    // Check if both are currency values
    return update1.metadata?.format?.currency === true &&
           update2.metadata?.format?.currency === true;
  },
  merge: (update1, update2) => {
    // Use last-write-wins for currency
    return update2.timestamp > update1.timestamp ? update2.value : update1.value;
  },
  priority: 10,
});
```

### 3. Performance

```typescript
// Limit operation history size
const transformer = new OperationTransformer(100);

// Clear cache periodically
setInterval(() => {
  transformer.clearCache();
}, 60000); // Every minute

// Use delta updates for large cells
const oldValue = cell.getValue();
const newValue = getNewValue();
const delta = transformer.calculateDelta(oldValue, newValue);

// Send delta instead of full value
client.sendUpdate({
  id: 'update-1',
  cellId: 'A1',
  type: 'set',
  value: delta.delta, // Send delta
  userId: 'user1',
  timestamp: Date.now(),
  version: 1,
});
```

### 4. Error Handling

```typescript
client.onError((error) => {
  switch (error.type) {
    case 'connection_failed':
      console.error('Failed to connect:', error.message);
      break;
    case 'sync_failed':
      console.error('Sync failed:', error.message);
      // Request full sync
      client.reconnect();
      break;
    case 'room_full':
      console.error('Room is full');
      // Show error to user
      alert('The spreadsheet is full. Please try again later.');
      break;
    default:
      console.error('Unknown error:', error);
  }
});
```

## Limitations

- **Maximum users per room**: 100 (configurable)
- **Maximum rooms**: 1000 (configurable)
- **Update propagation**: Typically 50-100ms
- **Reconnection attempts**: 5 by default
- **Operation history**: 100 operations per cell (configurable)

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues and questions, please use the GitHub issue tracker.

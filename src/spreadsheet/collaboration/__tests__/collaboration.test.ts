/**
 * Comprehensive test suite for real-time collaboration layer
 *
 * Tests:
 * - Server room management
 * - Client connection and reconnection
 * - Operation transformation
 * - Conflict resolution
 * - Concurrent edits
 * - Performance under load
 * - Memory efficiency
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebSocket } from 'ws';
import { CollaborationServer } from '../CollaborationServer';
import { CollaborationClient } from '../CollaborationClient';
import { OperationTransformer } from '../OperationTransformer';
import { ConflictResolver } from '../ConflictResolver';
import {
  CellUpdate,
  LocalOperation,
  RemoteOperation,
  CursorPosition,
  ConflictStrategy,
} from '../types';

// Mock WebSocket for testing
jest.mock('ws');

describe('CollaborationServer', () => {
  let server: CollaborationServer;
  const TEST_PORT = 8765;

  beforeEach(() => {
    server = new CollaborationServer({
      port: TEST_PORT,
      maxRooms: 10,
      maxUsersPerRoom: 5,
      heartbeatInterval: 1000,
      heartbeatTimeout: 2000,
    });
  });

  afterEach(() => {
    server.close();
  });

  describe('Room Management', () => {
    it('should create a new room', () => {
      const room = server.createRoom('test-room', 'test-sheet');
      expect(room).toBeDefined();
      expect(room.getUserCount()).toBe(0);
    });

    it('should retrieve existing room', () => {
      server.createRoom('test-room', 'test-sheet');
      const room = server.getRoom('test-room');
      expect(room).toBeDefined();
    });

    it('should return undefined for non-existent room', () => {
      const room = server.getRoom('non-existent');
      expect(room).toBeUndefined();
    });

    it('should destroy empty room', () => {
      server.createRoom('test-room', 'test-sheet');
      server.destroyRoom('test-room');
      const room = server.getRoom('test-room');
      expect(room).toBeUndefined();
    });

    it('should enforce max room limit', () => {
      const maxRooms = 10;
      for (let i = 0; i < maxRooms; i++) {
        server.createRoom(`room-${i}`, `sheet-${i}`);
      }

      expect(() => {
        server.createRoom('room-11', 'sheet-11');
      }).toThrow('Maximum number of rooms reached');
    });
  });

  describe('User Management', () => {
    it('should add user to room', () => {
      const room = server.createRoom('test-room', 'test-sheet');
      const connection = {
        userId: 'user1',
        userName: 'Test User',
        userColor: '#FF0000',
        socketId: 'socket1',
        status: 'online' as const,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
      };

      const added = room.addUser(connection);
      expect(added).toBe(true);
      expect(room.getUserCount()).toBe(1);
    });

    it('should enforce max users per room', () => {
      const room = server.createRoom('test-room', 'test-sheet', {
        maxUsers: 2,
      });

      const user1 = {
        userId: 'user1',
        userName: 'User 1',
        userColor: '#FF0000',
        socketId: 'socket1',
        status: 'online' as const,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
      };

      const user2 = {
        userId: 'user2',
        userName: 'User 2',
        userColor: '#00FF00',
        socketId: 'socket2',
        status: 'online' as const,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
      };

      const user3 = {
        userId: 'user3',
        userName: 'User 3',
        userColor: '#0000FF',
        socketId: 'socket3',
        status: 'online' as const,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
      };

      expect(room.addUser(user1)).toBe(true);
      expect(room.addUser(user2)).toBe(true);
      expect(room.addUser(user3)).toBe(false); // Room full
      expect(room.getUserCount()).toBe(2);
    });

    it('should remove user from room', () => {
      const room = server.createRoom('test-room', 'test-sheet');
      const connection = {
        userId: 'user1',
        userName: 'Test User',
        userColor: '#FF0000',
        socketId: 'socket1',
        status: 'online' as const,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
      };

      room.addUser(connection);
      room.removeUser('user1');
      expect(room.getUserCount()).toBe(0);
    });

    it('should update user cursor', () => {
      const room = server.createRoom('test-room', 'test-sheet');
      const connection = {
        userId: 'user1',
        userName: 'Test User',
        userColor: '#FF0000',
        socketId: 'socket1',
        status: 'online' as const,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
      };

      room.addUser(connection);

      const cursor: CursorPosition = {
        row: 5,
        col: 3,
      };

      room.updateCursor('user1', cursor);

      const user = room.getUser('user1');
      expect(user?.cursor).toEqual(cursor);
      expect(user?.status).toBe('editing');
    });

    it('should remove idle users', () => {
      const room = server.createRoom('test-room', 'test-sheet', {
        idleTimeout: 100,
      });

      const connection = {
        userId: 'user1',
        userName: 'Test User',
        userColor: '#FF0000',
        socketId: 'socket1',
        status: 'online' as const,
        connectedAt: Date.now() - 200, // Old connection
        lastHeartbeat: Date.now() - 200, // Old heartbeat
      };

      room.addUser(connection);

      // Trigger idle check
      const removed = room.checkIdleUsers();

      expect(removed).toContain('user1');
      expect(room.getUserCount()).toBe(0);
    });
  });

  describe('Update Processing', () => {
    it('should process cell update', () => {
      const room = server.createRoom('test-room', 'test-sheet');
      const connection = {
        userId: 'user1',
        userName: 'Test User',
        userColor: '#FF0000',
        socketId: 'socket1',
        status: 'online' as const,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
      };

      room.addUser(connection);

      const update: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: '42',
        version: 1,
        userId: 'user1',
        timestamp: Date.now(),
      };

      const result = room.processUpdate(update);

      expect(result.update.value).toBe('42');
      expect(result.conflict).toBe(false);
    });

    it('should detect concurrent updates', () => {
      const room = server.createRoom('test-room', 'test-sheet');

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
        timestamp: Date.now() + 50, // Within 100ms
      };

      room.processUpdate(update1);
      const result2 = room.processUpdate(update2);

      expect(result2.conflict).toBe(true);
    });

    it('should buffer updates for batching', () => {
      const room = server.createRoom('test-room', 'test-sheet');

      const update1: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: '42',
        version: 1,
        userId: 'user1',
        timestamp: Date.now(),
      };

      const update2: CellUpdate = {
        cellId: 'A2',
        operation: 'update',
        value: '43',
        version: 1,
        userId: 'user1',
        timestamp: Date.now() + 10,
      };

      room.processUpdate(update1);
      room.processUpdate(update2);

      const buffered = room.getBufferedUpdates();

      expect(buffered).toHaveLength(2);
      expect(buffered[0].cellId).toBe('A1');
      expect(buffered[1].cellId).toBe('A2');
    });
  });

  describe('Statistics', () => {
    it('should track statistics', () => {
      const stats = server.getStats();

      expect(stats.totalRooms).toBe(0);
      expect(stats.totalUsers).toBe(0);
      expect(stats.totalUpdates).toBe(0);
      expect(stats.totalConflicts).toBe(0);
      expect(stats.uptime).toBeGreaterThan(0);
    });

    it('should get performance metrics', () => {
      const metrics = server.getPerformanceMetrics();

      expect(metrics).toHaveProperty('updatePropagationTime');
      expect(metrics).toHaveProperty('transformationTime');
      expect(metrics).toHaveProperty('syncTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('activeConnections');
    });
  });
});

describe('CollaborationClient', () => {
  let client: CollaborationClient;
  const config = {
    roomId: 'test-room',
    userId: 'user1',
    userName: 'Test User',
    userColor: '#FF0000',
  };

  beforeEach(() => {
    client = new CollaborationClient(config, 'ws://localhost:8765');
  });

  afterEach(() => {
    client.destroy();
  });

  describe('Connection', () => {
    it('should have initial disconnected state', () => {
      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should get sync state', () => {
      const syncState = client.getSyncState();

      expect(syncState.syncing).toBe(false);
      expect(syncState.currentVersion).toBe(0);
      expect(syncState.pendingUpdates).toBe(0);
    });
  });

  describe('Event Handlers', () => {
    it('should subscribe to remote updates', () => {
      const callback = jest.fn();
      const unsubscribe = client.onRemoteUpdate(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should subscribe to user presence', () => {
      const callback = jest.fn();
      const unsubscribe = client.onUserPresence(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should subscribe to connection events', () => {
      const connectedCallback = jest.fn();
      const disconnectedCallback = jest.fn();

      const unsubConnected = client.onConnected(connectedCallback);
      const unsubDisconnected = client.onDisconnected(disconnectedCallback);

      expect(typeof unsubConnected).toBe('function');
      expect(typeof unsubDisconnected).toBe('function');
    });

    it('should unsubscribe from events', () => {
      const callback = jest.fn();
      const unsubscribe = client.onRemoteUpdate(callback);

      unsubscribe();

      // Should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Local Operations', () => {
    it('should queue operations when disconnected', () => {
      const operation: LocalOperation = {
        id: 'op1',
        cellId: 'A1',
        type: 'set',
        value: '42',
        userId: 'user1',
        timestamp: Date.now(),
        version: 1,
      };

      client.sendUpdate(operation);

      const syncState = client.getSyncState();
      expect(syncState.pendingUpdates).toBe(1);
    });

    it('should broadcast cursor position', () => {
      const cursor: CursorPosition = {
        row: 5,
        col: 3,
        selection: {
          startRow: 5,
          startCol: 3,
          endRow: 7,
          endCol: 5,
        },
      };

      // Should not throw when disconnected
      expect(() => client.broadcastCursor(cursor)).not.toThrow();

      expect(client.getLocalCursor()).toEqual(cursor);
    });
  });
});

describe('OperationTransformer', () => {
  let transformer: OperationTransformer;

  beforeEach(() => {
    transformer = new OperationTransformer(100);
  });

  afterEach(() => {
    transformer.destroy();
  });

  describe('Transformation', () => {
    it('should transform non-conflicting operations', () => {
      const localOp: LocalOperation = {
        id: 'local1',
        cellId: 'A1',
        type: 'set',
        value: '42',
        userId: 'user1',
        timestamp: Date.now(),
        version: 1,
      };

      const remoteOp: RemoteOperation = {
        id: 'remote1',
        cellId: 'B1', // Different cell
        type: 'set',
        value: '43',
        userId: 'user2',
        timestamp: Date.now() + 50,
        version: 1,
        transformed: false,
      };

      const result = transformer.transform(localOp, remoteOp);

      expect(result.conflict).toBe(false);
      expect(result.operation.transformed).toBe(false);
    });

    it('should transform concurrent inserts', () => {
      const localOp: LocalOperation = {
        id: 'local1',
        cellId: 'A1',
        type: 'insert',
        value: 'hello',
        userId: 'user1',
        timestamp: Date.now(),
        version: 1,
      };

      const remoteOp: RemoteOperation = {
        id: 'remote1',
        cellId: 'A1',
        type: 'insert',
        value: 'world',
        userId: 'user2',
        timestamp: Date.now() + 50, // Concurrent
        version: 1,
        transformed: false,
      };

      const result = transformer.transform(localOp, remoteOp);

      expect(result.conflict).toBe(true);
      expect(result.operation.transformed).toBe(true);
      expect(result.operation.value).toContain('hello');
      expect(result.operation.value).toContain('world');
    });

    it('should transform delete + insert', () => {
      const localOp: LocalOperation = {
        id: 'local1',
        cellId: 'A1',
        type: 'delete',
        value: null,
        userId: 'user1',
        timestamp: Date.now(),
        version: 1,
      };

      const remoteOp: RemoteOperation = {
        id: 'remote1',
        cellId: 'A1',
        type: 'insert',
        value: 'new',
        userId: 'user2',
        timestamp: Date.now() + 50,
        version: 1,
        transformed: false,
      };

      const result = transformer.transform(localOp, remoteOp);

      expect(result.conflict).toBe(true);
      expect(result.operation.type).toBe('insert');
      expect(result.operation.value).toBe('new');
    });
  });

  describe('Composition', () => {
    it('should compose compatible operations', () => {
      const op1 = {
        id: 'op1',
        cellId: 'A1',
        type: 'set' as const,
        value: '42',
        userId: 'user1',
        timestamp: 1000,
        version: 1,
      };

      const op2 = {
        id: 'op2',
        cellId: 'A1',
        type: 'set' as const,
        value: '43',
        userId: 'user2',
        timestamp: 2000, // Later
        version: 2,
      };

      const composed = transformer.compose(op1, op2);

      expect(composed.value).toBe('43'); // Later wins
      expect(composed.version).toBe(2);
    });

    it('should compose delete + insert as replace', () => {
      const op1 = {
        id: 'op1',
        cellId: 'A1',
        type: 'delete' as const,
        value: null,
        userId: 'user1',
        timestamp: 1000,
        version: 1,
      };

      const op2 = {
        id: 'op2',
        cellId: 'A1',
        type: 'insert' as const,
        value: 'new',
        userId: 'user2',
        timestamp: 2000,
        version: 2,
      };

      const composed = transformer.compose(op1, op2);

      expect(composed.type).toBe('replace');
      expect(composed.value).toBe('new');
    });
  });

  describe('Inversion', () => {
    it('should invert insert operation', () => {
      const op = {
        id: 'op1',
        cellId: 'A1',
        type: 'insert' as const,
        value: 'hello',
        userId: 'user1',
        timestamp: 1000,
        version: 1,
      };

      const inverted = transformer.invert(op, 'old');

      expect(inverted.type).toBe('delete');
      expect(inverted.value).toBe(null);
    });

    it('should invert delete operation', () => {
      const op = {
        id: 'op1',
        cellId: 'A1',
        type: 'delete' as const,
        value: null,
        userId: 'user1',
        timestamp: 1000,
        version: 1,
      };

      const inverted = transformer.invert(op, 'old value');

      expect(inverted.type).toBe('insert');
      expect(inverted.value).toBe('old value');
    });

    it('should invert replace operation', () => {
      const op = {
        id: 'op1',
        cellId: 'A1',
        type: 'replace' as const,
        value: 'new',
        userId: 'user1',
        timestamp: 1000,
        version: 1,
      };

      const inverted = transformer.invert(op, 'old');

      expect(inverted.type).toBe('replace');
      expect(inverted.value).toBe('old');
    });
  });

  describe('Delta Calculation', () => {
    it('should calculate string delta', () => {
      const delta = transformer.calculateDelta('hello world', 'hello there');

      expect(delta.oldValue).toBe('hello world');
      expect(delta.newValue).toBe('hello there');
      expect(delta.delta).toContain('replace');
    });

    it('should detect insert delta', () => {
      const delta = transformer.calculateDelta(undefined, 'new value');

      expect(delta.oldValue).toBeUndefined();
      expect(delta.newValue).toBe('new value');
      expect(delta.delta).toBe('insert');
    });

    it('should detect delete delta', () => {
      const delta = transformer.calculateDelta('old value', undefined);

      expect(delta.oldValue).toBe('old value');
      expect(delta.newValue).toBe(null);
      expect(delta.delta).toBe('delete');
    });

    it('should apply delta to value', () => {
      const delta = transformer.calculateDelta('hello world', 'hello there');
      const applied = transformer.applyDelta(delta.oldValue!, delta.delta);

      expect(applied).toBe('hello there');
    });
  });

  describe('Caching', () => {
    it('should cache transformation results', () => {
      const localOp: LocalOperation = {
        id: 'local1',
        cellId: 'A1',
        type: 'set',
        value: '42',
        userId: 'user1',
        timestamp: Date.now(),
        version: 1,
      };

      const remoteOp: RemoteOperation = {
        id: 'remote1',
        cellId: 'A1',
        type: 'set',
        value: '43',
        userId: 'user2',
        timestamp: Date.now() + 50,
        version: 1,
        transformed: false,
      };

      transformer.transform(localOp, remoteOp);
      transformer.transform(localOp, remoteOp); // Second call should hit cache

      const stats = transformer.getCacheStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should clear cache', () => {
      transformer.clearCache();
      const stats = transformer.getCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('History', () => {
    it('should track operation history', () => {
      const op = {
        id: 'op1',
        cellId: 'A1',
        type: 'set' as const,
        value: '42',
        userId: 'user1',
        timestamp: Date.now(),
        version: 1,
      };

      transformer.transform(op as any, op as any);

      const history = transformer.getHistory('A1');

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(op);
    });

    it('should trim history to max size', () => {
      const largeTransformer = new OperationTransformer(5);

      for (let i = 0; i < 10; i++) {
        const op = {
          id: `op${i}`,
          cellId: 'A1',
          type: 'set' as const,
          value: `${i}`,
          userId: 'user1',
          timestamp: Date.now() + i,
          version: i,
        };

        largeTransformer.transform(op as any, op as any);
      }

      const history = largeTransformer.getHistory('A1');

      expect(history.length).toBe(5); // Trimmed to max size
    });
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver('last-write-wins');
  });

  afterEach(() => {
    resolver.destroy();
  });

  describe('Last-Write-Wins Strategy', () => {
    it('should resolve conflict using last-write-wins', () => {
      const update1: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: '42',
        version: 1,
        userId: 'user1',
        timestamp: 1000,
      };

      const update2: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: '43',
        version: 1,
        userId: 'user2',
        timestamp: 2000, // Later
      };

      const result = resolver.resolve(update2, update1);

      expect(result.strategy).toBe('last-write-wins');
      expect(result.winningOperation.value).toBe('43');
      expect(result.rejectedOperation.value).toBe('42');
    });
  });

  describe('Semantic Conflict Detection', () => {
    it('should detect semantic conflict', () => {
      const update1: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: '42',
        version: 1,
        userId: 'user1',
        timestamp: 1000,
        metadata: {
          formula: '=SUM(A2:A10)',
        },
      };

      const update2: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: '42',
        version: 1,
        userId: 'user2',
        timestamp: 1050,
        metadata: {
          formula: '=AVERAGE(A2:A10)',
        },
      };

      const result = resolver.resolve(update2, update1);

      expect(result.strategy).toBe('last-write-wins');
      expect(result.reason).toContain('conflict');
    });
  });

  describe('Merge Policies', () => {
    it('should merge numeric values', () => {
      resolver.setStrategy('semantic');

      const update1: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: 10,
        version: 1,
        userId: 'user1',
        timestamp: 1000,
      };

      const update2: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: 20,
        version: 1,
        userId: 'user2',
        timestamp: 1050,
      };

      const result = resolver.resolve(update2, update1);

      expect(result.mergedValue).toBe(30); // 10 + 20
    });

    it('should merge string values', () => {
      resolver.setStrategy('semantic');

      const update1: CellUpdate = {
        cellId: 'A1',
        operation: 'insert',
        value: 'hello',
        version: 1,
        userId: 'user1',
        timestamp: 1000,
      };

      const update2: CellUpdate = {
        cellId: 'A1',
        operation: 'insert',
        value: 'world',
        version: 1,
        userId: 'user2',
        timestamp: 1050,
      };

      const result = resolver.resolve(update2, update1);

      expect(result.mergedValue).toContain('hello');
      expect(result.mergedValue).toContain('world');
    });

    it('should merge array values', () => {
      resolver.setStrategy('semantic');

      const update1: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: [1, 2, 3],
        version: 1,
        userId: 'user1',
        timestamp: 1000,
      };

      const update2: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: [3, 4, 5],
        version: 1,
        userId: 'user2',
        timestamp: 1050,
      };

      const result = resolver.resolve(update2, update1);

      expect(result.mergedValue).toEqual([1, 2, 3, 4, 5]); // Unique values
    });
  });

  describe('Conflict History', () => {
    it('should track conflict history', () => {
      const update1: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: '42',
        version: 1,
        userId: 'user1',
        timestamp: 1000,
      };

      const update2: CellUpdate = {
        cellId: 'A1',
        operation: 'update',
        value: '43',
        version: 1,
        userId: 'user2',
        timestamp: 1050,
      };

      resolver.resolve(update2, update1);

      const history = resolver.getConflictHistory();

      expect(history).toHaveLength(1);
      expect(history[0].strategy).toBe('last-write-wins');
    });

    it('should provide conflict statistics', () => {
      const stats = resolver.getConflictStats();

      expect(stats.total).toBe(0);
      expect(stats.byStrategy).toBeDefined();
      expect(stats.byType).toBeDefined();
    });
  });

  describe('Custom Merge Policies', () => {
    it('should add custom merge policy', () => {
      const customPolicy = {
        name: 'custom-max',
        canMerge: (update1: CellUpdate, update2: CellUpdate) => {
          return typeof update1.value === 'number' && typeof update2.value === 'number';
        },
        merge: (update1: CellUpdate, update2: CellUpdate) => {
          return Math.max(
            update1.value as number,
            update2.value as number
          );
        },
        priority: 10,
      };

      resolver.addMergePolicy(customPolicy);

      const policy = resolver.getMergePolicy('custom-max');

      expect(policy).toBeDefined();
      expect(policy?.name).toBe('custom-max');
    });

    it('should remove merge policy', () => {
      resolver.addMergePolicy({
        name: 'test-policy',
        canMerge: () => false,
        merge: () => null,
      });

      resolver.removeMergePolicy('test-policy');

      const policy = resolver.getMergePolicy('test-policy');

      expect(policy).toBeUndefined();
    });
  });
});

describe('Concurrent Edits Integration', () => {
  it('should handle 100 concurrent users', async () => {
    const server = new CollaborationServer({
      port: 8766,
      maxUsersPerRoom: 100,
    });

    const room = server.createRoom('load-test', 'sheet1');

    // Add 100 users
    for (let i = 0; i < 100; i++) {
      const connection = {
        userId: `user${i}`,
        userName: `User ${i}`,
        userColor: '#FF0000',
        socketId: `socket${i}`,
        status: 'online' as const,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
      };

      room.addUser(connection);
    }

    expect(room.getUserCount()).toBe(100);

    // Process concurrent updates
    const updates: CellUpdate[] = [];
    for (let i = 0; i < 100; i++) {
      updates.push({
        cellId: `A${i + 1}`,
        operation: 'update',
        value: `${i}`,
        version: 1,
        userId: `user${i}`,
        timestamp: Date.now() + Math.random() * 100,
      });
    }

    const startTime = Date.now();

    for (const update of updates) {
      room.processUpdate(update);
    }

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000); // Should complete in < 1s

    server.close();
  });

  it('should maintain sub-100ms update propagation', () => {
    const server = new CollaborationServer({
      port: 8767,
    });

    const room = server.createRoom('perf-test', 'sheet1');

    const connection = {
      userId: 'user1',
      userName: 'Test User',
      userColor: '#FF0000',
      socketId: 'socket1',
      status: 'online' as const,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
    };

    room.addUser(connection);

    const update: CellUpdate = {
      cellId: 'A1',
      operation: 'update',
      value: '42',
      version: 1,
      userId: 'user1',
      timestamp: Date.now(),
    };

    const startTime = Date.now();
    room.processUpdate(update);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100); // Sub-100ms processing

    server.close();
  });
});

describe('Memory Efficiency', () => {
  it('should use memory-efficient delta representation', () => {
    const transformer = new OperationTransformer();

    const longString = 'a'.repeat(10000);
    const modifiedString = 'b'.repeat(10000);

    const delta = transformer.calculateDelta(longString, modifiedString);

    // Delta should be more compact than full strings
    expect(delta.delta.length).toBeLessThan(longString.length);

    transformer.destroy();
  });

  it('should limit operation history size', () => {
    const transformer = new OperationTransformer(10);

    for (let i = 0; i < 100; i++) {
      const op = {
        id: `op${i}`,
        cellId: 'A1',
        type: 'set' as const,
        value: `${i}`,
        userId: 'user1',
        timestamp: Date.now() + i,
        version: i,
      };

      transformer.transform(op as any, op as any);
    }

    const history = transformer.getHistory('A1');

    expect(history.length).toBe(10); // Limited to max size

    transformer.destroy();
  });
});

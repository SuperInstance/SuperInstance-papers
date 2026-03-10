/**
 * CollaborationServer - Real-time collaboration server
 *
 * Provides:
 * - Room management for spreadsheet collaboration
 * - WebSocket connection handling
 * - Update broadcasting with conflict resolution
 * - Cursor position synchronization
 * - User presence tracking
 * - Performance optimization for 100+ concurrent users
 */

import * as WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  CellUpdate,
  CursorPosition,
  RoomConfig,
  RoomConnection,
  RoomState,
  WebSocketMessage,
  CellUpdateMessage,
  CursorMoveMessage,
  UserJoinMessage,
  UserLeaveMessage,
  PresenceMessage,
  BatchUpdateMessage,
  ConflictMessage,
  SyncResponseMessage,
  CollaborationStats,
  PerformanceMetrics,
  UserInfo,
  UserStatus,
  ConflictStrategy,
} from './types';
import { ConflictResolver } from './ConflictResolver';

/**
 * Default room configuration
 */
const DEFAULT_ROOM_CONFIG: Required<RoomConfig> = {
  maxUsers: 100,
  heartbeatInterval: 30000, // 30 seconds
  idleTimeout: 300000, // 5 minutes
  enablePresence: true,
  enableCursors: true,
  conflictStrategy: 'last-write-wins',
};

/**
 * Server configuration
 */
const DEFAULT_SERVER_CONFIG = {
  heartbeatInterval: 30000,
  heartbeatTimeout: 60000,
  enableCompression: true,
  maxRooms: 1000,
  maxUsersPerRoom: 100,
  defaultConflictStrategy: 'last-write-wins' as ConflictStrategy,
};

/**
 * Collaboration room for managing users and updates
 */
export class CollaborationRoom {
  private state: RoomState;
  private updateBuffer: Map<string, CellUpdate[]> = new Map();
  private lastBroadcastTime: number = Date.now();
  private conflictResolver: ConflictResolver;
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    public roomId: string,
    sheetId: string,
    config: RoomConfig = {}
  ) {
    this.state = {
      roomId,
      sheetId,
      users: new Map(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      config: { ...DEFAULT_ROOM_CONFIG, ...config },
    };
    this.conflictResolver = new ConflictResolver(config.conflictStrategy || 'last-write-wins');
    this.startHeartbeat();
  }

  /**
   * Add user to room
   */
  addUser(connection: RoomConnection): boolean {
    if (this.state.users.size >= this.state.config.maxUsers!) {
      return false; // Room is full
    }

    this.state.users.set(connection.userId, connection);
    this.state.lastActivity = Date.now();
    this.startHeartbeatForUser(connection.userId);

    return true;
  }

  /**
   * Remove user from room
   */
  removeUser(userId: string): void {
    this.state.users.delete(userId);
    this.stopHeartbeatForUser(userId);
    this.state.lastActivity = Date.now();

    // Clean up update buffer for this user
    this.updateBuffer.delete(userId);
  }

  /**
   * Get user by ID
   */
  getUser(userId: string): RoomConnection | undefined {
    return this.state.users.get(userId);
  }

  /**
   * Get all users
   */
  getAllUsers(): RoomConnection[] {
    return Array.from(this.state.users.values());
  }

  /**
   * Update user cursor
   */
  updateCursor(userId: string, position: CursorPosition): void {
    const user = this.state.users.get(userId);
    if (user) {
      user.cursor = position;
      user.status = 'editing';
      user.lastHeartbeat = Date.now();
      this.state.lastActivity = Date.now();
    }
  }

  /**
   * Get user cursors
   */
  getCursors(): Map<string, CursorPosition> {
    const cursors = new Map<string, CursorPosition>();
    this.state.users.forEach((user, userId) => {
      if (user.cursor) {
        cursors.set(userId, user.cursor);
      }
    });
    return cursors;
  }

  /**
   * Update user status
   */
  updateUserStatus(userId: string, status: UserStatus): void {
    const user = this.state.users.get(userId);
    if (user) {
      user.status = status;
      user.lastHeartbeat = Date.now();
    }
  }

  /**
   * Record user heartbeat
   */
  recordHeartbeat(userId: string): void {
    const user = this.state.users.get(userId);
    if (user) {
      user.lastHeartbeat = Date.now();
    }
  }

  /**
   * Check and remove idle users
   */
  checkIdleUsers(): string[] {
    const now = Date.now();
    const removedUsers: string[] = [];

    this.state.users.forEach((user, userId) => {
      const idleTime = now - user.lastHeartbeat;
      if (idleTime > this.state.config.idleTimeout!) {
        removedUsers.push(userId);
        this.removeUser(userId);
      }
    });

    return removedUsers;
  }

  /**
   * Process cell update with conflict resolution
   */
  processUpdate(update: CellUpdate): { update: CellUpdate; conflict?: boolean } {
    const conflictResult = this.conflictResolver.resolve(
      update,
      this.getPreviousUpdate(update.cellId)
    );

    this.state.lastActivity = Date.now();

    // Buffer update for batching
    this.bufferUpdate(update);

    return {
      update: conflictResult.winningOperation as CellUpdate,
      conflict: conflictResult.conflict,
    };
  }

  /**
   * Get previous update for a cell
   */
  private getPreviousUpdate(cellId: string): CellUpdate | undefined {
    const buffer = this.updateBuffer.get(cellId);
    return buffer && buffer.length > 0 ? buffer[buffer.length - 1] : undefined;
  }

  /**
   * Buffer update for efficient batching
   */
  private bufferUpdate(update: CellUpdate): void {
    if (!this.updateBuffer.has(update.cellId)) {
      this.updateBuffer.set(update.cellId, []);
    }
    this.updateBuffer.get(update.cellId)!.push(update);

    // Keep only last 10 updates per cell to save memory
    const buffer = this.updateBuffer.get(update.cellId)!;
    if (buffer.length > 10) {
      buffer.shift();
    }
  }

  /**
   * Get buffered updates for broadcasting
   */
  getBufferedUpdates(): CellUpdate[] {
    const updates: CellUpdate[] = [];
    const now = Date.now();

    // Get updates since last broadcast
    this.updateBuffer.forEach((cellUpdates) => {
      cellUpdates.forEach((update) => {
        if (update.timestamp > this.lastBroadcastTime) {
          updates.push(update);
        }
      });
    });

    this.lastBroadcastTime = now;
    return updates;
  }

  /**
   * Get room state
   */
  getState(): RoomState {
    return { ...this.state };
  }

  /**
   * Get user count
   */
  getUserCount(): number {
    return this.state.users.size;
  }

  /**
   * Get room age
   */
  getAge(): number {
    return Date.now() - this.state.createdAt;
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    setInterval(() => {
      this.checkIdleUsers();
    }, this.state.config.heartbeatInterval!);
  }

  /**
   * Start heartbeat timer for specific user
   */
  private startHeartbeatForUser(userId: string): void {
    this.stopHeartbeatForUser(userId);

    const timer = setInterval(() => {
      const user = this.state.users.get(userId);
      if (!user) {
        this.stopHeartbeatForUser(userId);
        return;
      }

      const idleTime = Date.now() - user.lastHeartbeat;
      if (idleTime > this.state.config.idleTimeout!) {
        this.removeUser(userId);
      }
    }, this.state.config.heartbeatInterval!);

    this.heartbeatTimers.set(userId, timer);
  }

  /**
   * Stop heartbeat timer for user
   */
  private stopHeartbeatForUser(userId: string): void {
    const timer = this.heartbeatTimers.get(userId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(userId);
    }
  }

  /**
   * Destroy room
   */
  destroy(): void {
    // Clear all heartbeat timers
    this.heartbeatTimers.forEach((timer) => clearInterval(timer));
    this.heartbeatTimers.clear();
    this.updateBuffer.clear();
    this.state.users.clear();
  }
}

/**
 * Collaboration server for managing real-time spreadsheet collaboration
 */
export class CollaborationServer {
  private wss: WebSocket.Server;
  private rooms: Map<string, CollaborationRoom> = new Map();
  private socketToUser: Map<WebSocket.WebSocket, { userId: string; roomId: string }> = new Map();
  private config: typeof DEFAULT_SERVER_CONFIG;
  private startTime: number = Date.now();
  private totalUpdates: number = 0;
  private totalConflicts: number = 0;
  private performanceMetrics: PerformanceMetrics = {
    updatePropagationTime: 0,
    transformationTime: 0,
    syncTime: 0,
    memoryUsage: 0,
    activeConnections: 0,
  };

  constructor(config: Partial<typeof DEFAULT_SERVER_CONFIG> = {}) {
    this.config = { ...DEFAULT_SERVER_CONFIG, ...config };
    this.wss = new WebSocket.Server({
      port: this.config.port || 8080,
      path: this.config.path || '/collaboration',
    });

    this.setupWebSocketServer();
    this.startPerformanceMonitoring();
  }

  /**
   * Set up WebSocket server
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (socket: WebSocket.WebSocket, req) => {
      this.handleConnection(socket, req);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket.WebSocket, req: any): void {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');
    const userId = url.searchParams.get('userId');
    const userName = url.searchParams.get('userName') || 'Anonymous';

    if (!roomId || !userId) {
      socket.close(1008, 'Missing roomId or userId');
      return;
    }

    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = this.createRoom(roomId, url.searchParams.get('sheetId') || roomId);
    }

    // Create user connection
    const connection: RoomConnection = {
      userId,
      userName,
      userColor: this.generateUserColor(),
      socketId: uuidv4(),
      status: 'online',
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
    };

    // Add user to room
    if (!room.addUser(connection)) {
      socket.close(1008, 'Room is full');
      return;
    }

    // Track socket to user mapping
    this.socketToUser.set(socket, { userId, roomId });
    this.performanceMetrics.activeConnections++;

    // Set up socket handlers
    this.setupSocketHandlers(socket, room, connection);

    // Send welcome message
    this.sendMessage(socket, {
      type: 'user_join',
      roomId,
      userId,
      timestamp: Date.now(),
      data: {
        id: userId,
        name: userName,
        color: connection.userColor,
        status: 'online',
        lastActivity: Date.now(),
      },
    } as UserJoinMessage);

    // Broadcast to other users
    this.broadcastToRoom(roomId, {
      type: 'user_join',
      roomId,
      userId,
      timestamp: Date.now(),
      data: {
        id: userId,
        name: userName,
        color: connection.userColor,
        status: 'online',
        lastActivity: Date.now(),
      },
    } as UserJoinMessage, socket);

    // Send current presence
    this.sendPresence(socket, room);

    console.log(`User ${userId} joined room ${roomId}`);
  }

  /**
   * Set up socket message handlers
   */
  private setupSocketHandlers(
    socket: WebSocket.WebSocket,
    room: CollaborationRoom,
    connection: RoomConnection
  ): void {
    socket.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        this.handleMessage(socket, room, connection, message);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    socket.on('close', () => {
      this.handleDisconnection(socket, room, connection);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.handleDisconnection(socket, room, connection);
    });

    socket.on('pong', () => {
      room.recordHeartbeat(connection.userId);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(
    socket: WebSocket.WebSocket,
    room: CollaborationRoom,
    connection: RoomConnection,
    message: WebSocketMessage
  ): void {
    const startTime = Date.now();

    switch (message.type) {
      case 'cell_update':
        this.handleCellUpdate(socket, room, connection, message as CellUpdateMessage);
        break;

      case 'cursor_move':
        this.handleCursorMove(room, connection, message as CursorMoveMessage);
        break;

      case 'sync_request':
        this.handleSyncRequest(socket, room, message);
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }

    // Update performance metrics
    this.performanceMetrics.updatePropagationTime = Date.now() - startTime;
  }

  /**
   * Handle cell update
   */
  private handleCellUpdate(
    socket: WebSocket.WebSocket,
    room: CollaborationRoom,
    connection: RoomConnection,
    message: CellUpdateMessage
  ): void {
    const startTime = Date.now();
    this.totalUpdates++;

    // Process update with conflict resolution
    const result = room.processUpdate(message.data);

    if (result.conflict) {
      this.totalConflicts++;

      // Notify about conflict
      this.sendMessage(socket, {
        type: 'conflict',
        roomId: room.getState().roomId,
        userId: connection.userId,
        timestamp: Date.now(),
        data: {
          strategy: this.config.defaultConflictStrategy,
          winningOperation: result.update,
          rejectedOperation: message.data,
          reason: 'Concurrent update detected',
        },
      } as ConflictMessage);
    }

    // Broadcast update to other users
    this.broadcastToRoom(room.getState().roomId, {
      type: 'cell_update',
      roomId: room.getState().roomId,
      userId: connection.userId,
      timestamp: Date.now(),
      data: result.update,
    } as CellUpdateMessage, socket);

    // Update performance metrics
    this.performanceMetrics.transformationTime = Date.now() - startTime;
  }

  /**
   * Handle cursor move
   */
  private handleCursorMove(
    room: CollaborationRoom,
    connection: RoomConnection,
    message: CursorMoveMessage
  ): void {
    room.updateCursor(connection.userId, message.data);

    // Broadcast to other users
    this.broadcastToRoom(room.getState().roomId, message, undefined);
  }

  /**
   * Handle sync request
   */
  private handleSyncRequest(
    socket: WebSocket.WebSocket,
    room: CollaborationRoom,
    message: WebSocketMessage
  ): void {
    const startTime = Date.now();
    const updates = room.getBufferedUpdates();

    this.sendMessage(socket, {
      type: 'sync_response',
      roomId: room.getState().roomId,
      userId: message.userId,
      timestamp: Date.now(),
      data: {
        updates,
        currentVersion: updates.length,
      },
    } as SyncResponseMessage);

    // Update performance metrics
    this.performanceMetrics.syncTime = Date.now() - startTime;
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(
    socket: WebSocket.WebSocket,
    room: CollaborationRoom,
    connection: RoomConnection
  ): void {
    const mapping = this.socketToUser.get(socket);
    if (!mapping) return;

    const { userId, roomId } = mapping;

    // Remove user from room
    room.removeUser(userId);

    // Update metrics
    this.performanceMetrics.activeConnections--;

    // Broadcast user leave
    this.broadcastToRoom(roomId, {
      type: 'user_leave',
      roomId,
      userId,
      timestamp: Date.now(),
      data: { userId },
    } as UserLeaveMessage);

    // Clean up if room is empty
    if (room.getUserCount() === 0) {
      this.destroyRoom(roomId);
    }

    // Remove mapping
    this.socketToUser.delete(socket);

    console.log(`User ${userId} left room ${roomId}`);
  }

  /**
   * Create a new room
   */
  createRoom(roomId: string, sheetId: string, config?: RoomConfig): CollaborationRoom {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }

    if (this.rooms.size >= this.config.maxRooms) {
      throw new Error('Maximum number of rooms reached');
    }

    const room = new CollaborationRoom(roomId, sheetId, config);
    this.rooms.set(roomId, room);

    console.log(`Created room ${roomId} for sheet ${sheetId}`);
    return room;
  }

  /**
   * Get or create room
   */
  getRoom(roomId: string): CollaborationRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Destroy room
   */
  destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.destroy();
      this.rooms.delete(roomId);
      console.log(`Destroyed room ${roomId}`);
    }
  }

  /**
   * Broadcast message to all users in room
   */
  private broadcastToRoom(
    roomId: string,
    message: WebSocketMessage,
    excludeSocket?: WebSocket.WebSocket
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const users = room.getAllUsers();

    users.forEach((user) => {
      // Find socket for user
      for (const [socket, mapping] of this.socketToUser.entries()) {
        if (mapping.userId === user.userId && socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
          this.sendMessage(socket, message);
        }
      }
    });
  }

  /**
   * Send message to specific socket
   */
  private sendMessage(socket: WebSocket.WebSocket, message: WebSocketMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  /**
   * Send presence information
   */
  private sendPresence(socket: WebSocket.WebSocket, room: CollaborationRoom): void {
    const users = room.getAllUsers().map((user) => ({
      id: user.userId,
      name: user.userName,
      color: user.userColor,
      status: user.status,
      cursor: user.cursor,
      lastActivity: user.lastHeartbeat,
      clientId: user.socketId.length,
      isLocal: false,
    }));

    this.sendMessage(socket, {
      type: 'presence',
      roomId: room.getState().roomId,
      userId: 'server',
      timestamp: Date.now(),
      data: users,
    } as PresenceMessage);
  }

  /**
   * Generate random user color
   */
  private generateUserColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788', '#FF6F91', '#6C5B7B'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.performanceMetrics.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    }, 10000);
  }

  /**
   * Get collaboration statistics
   */
  getStats(): CollaborationStats {
    let totalUsers = 0;
    this.rooms.forEach((room) => {
      totalUsers += room.getUserCount();
    });

    return {
      totalUsers,
      totalRooms: this.rooms.size,
      totalUpdates: this.totalUpdates,
      totalConflicts: this.totalConflicts,
      averageLatency: this.performanceMetrics.updatePropagationTime,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Close server
   */
  close(): void {
    // Destroy all rooms
    this.rooms.forEach((room) => room.destroy());
    this.rooms.clear();

    // Close WebSocket server
    this.wss.close();

    console.log('Collaboration server closed');
  }
}

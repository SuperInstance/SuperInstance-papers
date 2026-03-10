/**
 * CollaborationClient - Real-time collaboration client
 *
 * Provides:
 * - WebSocket connection to collaboration server
 * - Real-time cell updates
 * - Cursor position broadcasting
 * - User presence tracking
 * - Automatic reconnection
 * - Conflict-free operation transformation
 * - Sub-100ms update propagation
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  LocalOperation,
  RemoteOperation,
  CursorPosition,
  PresenceInfo,
  ClientConfig,
  ConnectionState,
  SyncState,
  WebSocketMessage,
  CellUpdateMessage,
  CursorMoveMessage,
  UserJoinMessage,
  UserLeaveMessage,
  PresenceMessage,
  BatchUpdateMessage,
  ConflictMessage,
  SyncRequestMessage,
  SyncResponseMessage,
  ClientEvent,
  CellUpdate,
  CollaborationErrorWithContext,
  CollaborationError,
} from './types';
import { OperationTransformer } from './OperationTransformer';

/**
 * Default client configuration
 */
const DEFAULT_CLIENT_CONFIG: Required<Omit<
  ClientConfig,
  'roomId' | 'userId' | 'userName'
>> = {
  userColor: '#4ECDC4',
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
  enableCompression: true,
};

/**
 * Collaboration client for real-time spreadsheet collaboration
 */
export class CollaborationClient {
  private socket: WebSocket | null = null;
  private config: Required<ClientConfig>;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pendingOperations: Map<string, LocalOperation> = new Map();
  private operationTransformer: OperationTransformer;
  private eventListeners: Map<ClientEvent, Set<Function>> = new Map();
  private syncState: SyncState = {
    syncing: false,
    lastSyncTime: 0,
    currentVersion: 0,
    pendingUpdates: 0,
  };
  private remoteUsers: Map<string, PresenceInfo> = new Map();
  private localCursor: CursorPosition | null = null;
  private serverUrl: string;

  constructor(config: ClientConfig, serverUrl: string = 'ws://localhost:8080') {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config } as Required<ClientConfig>;
    this.serverUrl = serverUrl;
    this.operationTransformer = new OperationTransformer();
  }

  /**
   * Connect to collaboration server
   */
  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.connectionState = 'connecting';
    this.emit('connecting');

    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.serverUrl);
        url.pathname = '/collaboration';
        url.searchParams.set('roomId', this.config.roomId);
        url.searchParams.set('userId', this.config.userId);
        url.searchParams.set('userName', this.config.userName);

        this.socket = new WebSocket(url.toString());

        this.socket.onopen = () => {
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.requestSync();
          this.emit('connected');
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data.toString());
        };

        this.socket.onclose = () => {
          this.handleDisconnect();
        };

        this.socket.onerror = (error) => {
          this.handleError('connection_failed', 'WebSocket connection error', error);
          reject(error);
        };

      } catch (error) {
        this.connectionState = 'failed';
        this.handleError('connection_failed', 'Failed to create WebSocket connection', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.connectionState = 'disconnected';
    this.emit('disconnected');
  }

  /**
   * Send cell update to server
   */
  sendUpdate(operation: LocalOperation): void {
    if (!this.isConnected()) {
      this.pendingOperations.set(operation.id, operation);
      this.syncState.pendingUpdates++;
      return;
    }

    const message: CellUpdateMessage = {
      type: 'cell_update',
      roomId: this.config.roomId,
      userId: this.config.userId,
      timestamp: Date.now(),
      data: {
        cellId: operation.cellId,
        operation: operation.type as any,
        value: operation.value,
        version: operation.version,
        userId: operation.userId,
        timestamp: operation.timestamp,
      },
    };

    this.sendMessage(message);
    this.pendingOperations.delete(operation.id);
  }

  /**
   * Broadcast cursor position
   */
  broadcastCursor(position: CursorPosition): void {
    if (!this.isConnected()) {
      this.localCursor = position;
      return;
    }

    this.localCursor = position;

    const message: CursorMoveMessage = {
      type: 'cursor_move',
      roomId: this.config.roomId,
      userId: this.config.userId,
      timestamp: Date.now(),
      data: position,
    };

    this.sendMessage(message);
    this.emit('cursor_moved', position);
  }

  /**
   * Subscribe to remote updates
   */
  onRemoteUpdate(callback: (update: RemoteOperation) => void): () => void {
    return this.on('remote_update', callback);
  }

  /**
   * Subscribe to user presence changes
   */
  onUserPresence(callback: (users: PresenceInfo[]) => void): () => void {
    return this.on('presence_changed', callback);
  }

  /**
   * Subscribe to user join events
   */
  onUserJoin(callback: (user: PresenceInfo) => void): () => void {
    return this.on('user_joined', callback);
  }

  /**
   * Subscribe to user leave events
   */
  onUserLeave(callback: (userId: string) => void): () => void {
    return this.on('user_left', callback);
  }

  /**
   * Subscribe to connection events
   */
  onConnected(callback: () => void): () => void {
    return this.on('connected', callback);
  }

  /**
   * Subscribe to disconnection events
   */
  onDisconnected(callback: () => void): () => void {
    return this.on('disconnected', callback);
  }

  /**
   * Subscribe to reconnection events
   */
  onReconnecting(callback: (attempt: number) => void): () => void {
    return this.on('reconnecting', callback);
  }

  /**
   * Subscribe to conflict events
   */
  onConflict(callback: (conflict: any) => void): () => void {
    return this.on('conflict_detected', callback);
  }

  /**
   * Subscribe to sync complete events
   */
  onSyncComplete(callback: () => void): () => void {
    return this.on('sync_complete', callback);
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (error: CollaborationErrorWithContext) => void): () => void {
    return this.on('error', callback);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage;

      switch (message.type) {
        case 'cell_update':
          this.handleCellUpdate(message as CellUpdateMessage);
          break;

        case 'cursor_move':
          this.handleCursorMove(message as CursorMoveMessage);
          break;

        case 'user_join':
          this.handleUserJoin(message as UserJoinMessage);
          break;

        case 'user_leave':
          this.handleUserLeave(message as UserLeaveMessage);
          break;

        case 'presence':
          this.handlePresence(message as PresenceMessage);
          break;

        case 'batch_update':
          this.handleBatchUpdate(message as BatchUpdateMessage);
          break;

        case 'conflict':
          this.handleConflict(message as ConflictMessage);
          break;

        case 'sync_response':
          this.handleSyncResponse(message as SyncResponseMessage);
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Handle cell update from server
   */
  private handleCellUpdate(message: CellUpdateMessage): void {
    const remoteOp: RemoteOperation = {
      id: uuidv4(),
      cellId: message.data.cellId,
      type: message.data.operation as any,
      value: message.data.value,
      userId: message.data.userId,
      timestamp: message.data.timestamp,
      version: message.data.version,
      transformed: false,
    };

    // Transform against pending operations
    let transformedOp = remoteOp;
    this.pendingOperations.forEach((localOp) => {
      if (localOp.cellId === remoteOp.cellId) {
        const result = this.operationTransformer.transform(localOp, remoteOp);
        transformedOp = result.operation;
      }
    });

    this.emit('remote_update', transformedOp);
  }

  /**
   * Handle cursor move from server
   */
  private handleCursorMove(message: CursorMoveMessage): void {
    const user = this.remoteUsers.get(message.userId);
    if (user) {
      user.cursor = message.data;
      user.lastActivity = message.timestamp;
      this.emit('presence_changed', Array.from(this.remoteUsers.values()));
    }
  }

  /**
   * Handle user join
   */
  private handleUserJoin(message: UserJoinMessage): void {
    const userInfo: PresenceInfo = {
      ...message.data,
      clientId: message.timestamp,
      isLocal: message.data.id === this.config.userId,
    };

    this.remoteUsers.set(message.data.id, userInfo);
    this.emit('user_joined', userInfo);
    this.emit('presence_changed', Array.from(this.remoteUsers.values()));
  }

  /**
   * Handle user leave
   */
  private handleUserLeave(message: UserLeaveMessage): void {
    this.remoteUsers.delete(message.data.userId);
    this.emit('user_left', message.data.userId);
    this.emit('presence_changed', Array.from(this.remoteUsers.values()));
  }

  /**
   * Handle presence update
   */
  private handlePresence(message: PresenceMessage): void {
    message.data.forEach((user) => {
      this.remoteUsers.set(user.id, {
        ...user,
        isLocal: user.id === this.config.userId,
      });
    });

    this.emit('presence_changed', Array.from(this.remoteUsers.values()));
  }

  /**
   * Handle batch update
   */
  private handleBatchUpdate(message: BatchUpdateMessage): void {
    message.data.updates.forEach((update) => {
      const remoteOp: RemoteOperation = {
        id: uuidv4(),
        cellId: update.cellId,
        type: update.operation as any,
        value: update.value,
        userId: update.userId,
        timestamp: update.timestamp,
        version: update.version,
        transformed: false,
      };

      this.emit('remote_update', remoteOp);
    });
  }

  /**
   * Handle conflict notification
   */
  private handleConflict(message: ConflictMessage): void {
    this.emit('conflict_detected', message.data);
  }

  /**
   * Handle sync response
   */
  private handleSyncResponse(message: SyncResponseMessage): void {
    this.syncState.syncing = false;
    this.syncState.lastSyncTime = Date.now();
    this.syncState.currentVersion = message.data.currentVersion;

    // Apply updates
    message.data.updates.forEach((update) => {
      const remoteOp: RemoteOperation = {
        id: uuidv4(),
        cellId: update.cellId,
        type: update.operation as any,
        value: update.value,
        userId: update.userId,
        timestamp: update.timestamp,
        version: update.version,
        transformed: false,
      };

      this.emit('remote_update', remoteOp);
    });

    this.emit('sync_complete');
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    this.connectionState = 'disconnected';
    this.stopHeartbeat();

    if (this.config.autoReconnect) {
      this.scheduleReconnect();
    }

    this.emit('disconnected');
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.connectionState = 'failed';
      this.handleError('timeout', 'Maximum reconnection attempts reached', null);
      return;
    }

    this.stopReconnect();

    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Reconnect failed, will try again
      });
    }, delay);
  }

  /**
   * Stop reconnection timer
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Request sync from server
   */
  private requestSync(): void {
    if (!this.isConnected()) return;

    this.syncState.syncing = true;

    const message: SyncRequestMessage = {
      type: 'sync_request',
      roomId: this.config.roomId,
      userId: this.config.userId,
      timestamp: Date.now(),
      data: {
        version: this.syncState.currentVersion,
      },
    };

    this.sendMessage(message);
  }

  /**
   * Send message to server
   */
  private sendMessage(message: WebSocketMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.ping();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Handle error
   */
  private handleError(
    type: CollaborationError,
    message: string,
    details: any
  ): void {
    const error: CollaborationErrorWithContext = {
      type,
      message,
      details,
      timestamp: Date.now(),
    };

    this.emit('error', error);
  }

  /**
   * Subscribe to event
   */
  private on(event: ClientEvent, callback: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from event
   */
  private off(event: ClientEvent, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event
   */
  private emit(event: ClientEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' &&
           this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get sync state
   */
  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  /**
   * Get remote users
   */
  getRemoteUsers(): PresenceInfo[] {
    return Array.from(this.remoteUsers.values());
  }

  /**
   * Get user by ID
   */
  getUser(userId: string): PresenceInfo | undefined {
    return this.remoteUsers.get(userId);
  }

  /**
   * Get local cursor
   */
  getLocalCursor(): CursorPosition | null {
    return this.localCursor;
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    this.reconnectAttempts = 0;
    await this.connect();
  }

  /**
   * Destroy client
   */
  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.remoteUsers.clear();
    this.pendingOperations.clear();
  }
}

/**
 * Collaboration Types - Real-time collaboration type definitions
 *
 * Defines types for:
 * - Cell updates and operations
 * - User presence and cursors
 * - Room management
 * - Conflict resolution
 * - Operation transformation
 */

/**
 * Base cell value types
 */
export type CellValue = string | number | boolean | null | undefined;

/**
 * Cell operation types
 */
export type CellOperationType = 'insert' | 'update' | 'delete' | 'format' | 'move';

/**
 * Operation types for transformation
 */
export type OperationType = 'set' | 'delete' | 'insert' | 'replace';

/**
 * User status types
 */
export type UserStatus = 'online' | 'idle' | 'away' | 'editing';

/**
 * Conflict resolution strategies
 */
export type ConflictStrategy = 'last-write-wins' | 'first-write-wins' | 'semantic' | 'manual';

/**
 * Cell update with metadata
 */
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

/**
 * Cell formatting options
 */
export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
}

/**
 * Local operation from client
 */
export interface LocalOperation {
  id: string;
  cellId: string;
  type: OperationType;
  value: CellValue;
  userId: string;
  timestamp: number;
  version: number;
}

/**
 * Remote operation from server
 */
export interface RemoteOperation {
  id: string;
  cellId: string;
  type: OperationType;
  value: CellValue;
  userId: string;
  timestamp: number;
  version: number;
  transformed: boolean;
}

/**
 * Transformed operation result
 */
export interface TransformedOperation {
  operation: RemoteOperation;
  conflict: boolean;
  conflictResolution?: ConflictResolution;
}

/**
 * Cursor position in spreadsheet
 */
export interface CursorPosition {
  row: number;
  col: number;
  selection?: CellSelection;
}

/**
 * Cell selection range
 */
export interface CellSelection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/**
 * User information
 */
export interface UserInfo {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  status: UserStatus;
  cursor?: CursorPosition;
  lastActivity: number;
}

/**
 * Presence information for users
 */
export interface PresenceInfo extends UserInfo {
  clientId: number;
  isLocal: boolean;
}

/**
 * Collaboration room configuration
 */
export interface RoomConfig {
  maxUsers?: number;
  heartbeatInterval?: number;
  idleTimeout?: number;
  enablePresence?: boolean;
  enableCursors?: true;
  conflictStrategy?: ConflictStrategy;
}

/**
 * Room state
 */
export interface RoomState {
  roomId: string;
  sheetId: string;
  users: Map<string, RoomConnection>;
  createdAt: number;
  lastActivity: number;
  config: RoomConfig;
}

/**
 * Room connection for a user
 */
export interface RoomConnection {
  userId: string;
  userName: string;
  userColor: string;
  socketId: string;
  status: UserStatus;
  cursor?: CursorPosition;
  connectedAt: number;
  lastHeartbeat: number;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  strategy: ConflictStrategy;
  winningOperation: LocalOperation | RemoteOperation;
  rejectedOperation: LocalOperation | RemoteOperation;
  reason?: string;
  mergedValue?: CellValue;
}

/**
 * Operation for transformation
 */
export interface Operation {
  id: string;
  cellId: string;
  type: OperationType;
  value: CellValue;
  position?: number;
  length?: number;
  userId: string;
  timestamp: number;
}

/**
 * Delta representation for memory efficiency
 */
export interface CellDelta {
  cellId: string;
  oldValue?: CellValue;
  newValue: CellValue;
  version: number;
  userId: string;
  timestamp: number;
}

/**
 * Batch update for efficiency
 */
export interface BatchUpdate {
  updates: CellUpdate[];
  version: number;
  timestamp: number;
  compressed?: boolean;
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  | 'cell_update'
  | 'cursor_move'
  | 'user_join'
  | 'user_leave'
  | 'presence'
  | 'batch_update'
  | 'conflict'
  | 'sync_request'
  | 'sync_response';

/**
 * Base WebSocket message
 */
export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  roomId: string;
  userId: string;
  timestamp: number;
  data: T;
}

/**
 * Cell update message
 */
export interface CellUpdateMessage extends WebSocketMessage<CellUpdate> {
  type: 'cell_update';
}

/**
 * Cursor move message
 */
export interface CursorMoveMessage extends WebSocketMessage<CursorPosition> {
  type: 'cursor_move';
  data: CursorPosition;
}

/**
 * User join message
 */
export interface UserJoinMessage extends WebSocketMessage<UserInfo> {
  type: 'user_join';
  data: UserInfo;
}

/**
 * User leave message
 */
export interface UserLeaveMessage extends WebSocketMessage<{ userId: string }> {
  type: 'user_leave';
  data: { userId: string };
}

/**
 * Presence message
 */
export interface PresenceMessage extends WebSocketMessage<PresenceInfo[]> {
  type: 'presence';
  data: PresenceInfo[];
}

/**
 * Batch update message
 */
export interface BatchUpdateMessage extends WebSocketMessage<BatchUpdate> {
  type: 'batch_update';
  data: BatchUpdate;
}

/**
 * Conflict message
 */
export interface ConflictMessage extends WebSocketMessage<ConflictResolution> {
  type: 'conflict';
  data: ConflictResolution;
}

/**
 * Sync request message
 */
export interface SyncRequestMessage extends WebSocketMessage<{ version?: number }> {
  type: 'sync_request';
  data: { version?: number };
}

/**
 * Sync response message
 */
export interface SyncResponseMessage extends WebSocketMessage<{
  updates: CellUpdate[];
  currentVersion: number;
}> {
  type: 'sync_response';
  data: {
    updates: CellUpdate[];
    currentVersion: number;
  };
}

/**
 * Union of all WebSocket messages
 */
export type CollaborationMessage =
  | CellUpdateMessage
  | CursorMoveMessage
  | UserJoinMessage
  | UserLeaveMessage
  | PresenceMessage
  | BatchUpdateMessage
  | ConflictMessage
  | SyncRequestMessage
  | SyncResponseMessage;

/**
 * Collaboration client events
 */
export type ClientEvent =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'remote_update'
  | 'user_joined'
  | 'user_left'
  | 'presence_changed'
  | 'cursor_moved'
  | 'conflict_detected'
  | 'sync_complete'
  | 'error';

/**
 * Collaboration server events
 */
export type ServerEvent =
  | 'user_joined'
  | 'user_left'
  | 'update_received'
  | 'cursor_moved'
  | 'room_created'
  | 'room_destroyed'
  | 'sync_requested'
  | 'conflict_detected';

/**
 * Client configuration
 */
export interface ClientConfig {
  roomId: string;
  userId: string;
  userName: string;
  userColor?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableCompression?: boolean;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  port?: number;
  host?: string;
  path?: string;
  maxRooms?: number;
  maxUsersPerRoom?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  enableCompression?: boolean;
  defaultConflictStrategy?: ConflictStrategy;
}

/**
 * Connection state
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';

/**
 * Sync state
 */
export interface SyncState {
  syncing: boolean;
  lastSyncTime: number;
  currentVersion: number;
  pendingUpdates: number;
}

/**
 * Statistics for collaboration
 */
export interface CollaborationStats {
  totalUsers: number;
  totalRooms: number;
  totalUpdates: number;
  totalConflicts: number;
  averageLatency: number;
  uptime: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  updatePropagationTime: number;
  transformationTime: number;
  syncTime: number;
  memoryUsage: number;
  activeConnections: number;
}

/**
 * Error types
 */
export type CollaborationError =
  | 'connection_failed'
  | 'sync_failed'
  | 'room_full'
  | 'invalid_operation'
  | 'transformation_error'
  | 'conflict_error'
  | 'timeout';

/**
 * Error with context
 */
export interface CollaborationErrorWithContext {
  type: CollaborationError;
  message: string;
  details?: any;
  timestamp: number;
}

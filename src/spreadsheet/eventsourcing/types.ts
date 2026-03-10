/**
 * POLLN Event Sourcing Types
 * Type definitions for event sourcing and CQRS
 */

// Event base interface
export interface Event {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  data: Record<string, unknown>;
  metadata: EventMetadata;
  timestamp: Date;
}

// Event metadata
export interface EventMetadata {
  causationId?: string;
  correlationId?: string;
  userId?: string;
  timestamp: Date;
  $correlationId?: string;
  $causationId?: string;
}

// Command base interface
export interface Command {
  id: string;
  type: string;
  aggregateId: string;
  data: Record<string, unknown>;
  metadata: CommandMetadata;
  timestamp: Date;
}

// Command metadata
export interface CommandMetadata {
  causationId?: string;
  correlationId?: string;
  userId: string;
  timestamp: Date;
}

// Event store interface
export interface IEventStore {
  append(aggregateId: string, events: Event[]): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<Event[]>;
  getAllEvents(stream?: string): Promise<Event[]>;
  subscribe(handler: (event: Event) => Promise<void>): () => void;
}

// Command handler interface
export interface ICommandHandler {
  handle(command: Command): Promise<Event[]>;
  canHandle(command: Command): boolean;
}

// Aggregate root interface
export interface IAggregateRoot {
  id: string;
  version: number;
  type: string;
  apply(event: Event): void;
  getUncommittedEvents(): Event[];
  markEventsAsCommitted(): void;
  loadFromHistory(events: Event[]): void;
}

// Snapshot interface
export interface Snapshot {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: Record<string, unknown>;
  timestamp: Date;
}

// Snapshot manager interface
export interface ISnapshotManager {
  save(snapshot: Snapshot): Promise<void>;
  get(aggregateId: string, maxVersion?: number): Promise<Snapshot | null>;
  delete(aggregateId: string): Promise<void>;
}

// Read model interface
export interface IReadModel {
  id: string;
  type: string;
  handle(event: Event): Promise<void>;
  getState(): Record<string, unknown>;
}

// Projection interface
export interface IProjection {
  name: string;
  handle(event: Event): Promise<void>;
  getState(): Record<string, unknown>;
  rebuild(): Promise<void>;
}

// Event sourcing configuration
export interface EventSourcingConfig {
  eventStore: {
    type: 'memory' | 'redis' | 'mongodb';
    connection?: string;
  };
  snapshots: {
    enabled: boolean;
    interval: number; // events per snapshot
    compression: boolean;
  };
  projections: {
    enabled: boolean;
    rebuildOnStart: boolean;
  };
}

// Common event types
export enum EventType {
  // Cell events
  CELL_CREATED = 'CellCreated',
  CELL_UPDATED = 'CellUpdated',
  CELL_DELETED = 'CellDeleted',
  DEPENDENCY_ADDED = 'DependencyAdded',
  DEPENDENCY_REMOVED = 'DependencyRemoved',

  // Spreadsheet events
  SPREADSHEET_CREATED = 'SpreadsheetCreated',
  SPREADSHEET_UPDATED = 'SpreadsheetUpdated',
  SPREADSHEET_DELETED = 'SpreadsheetDeleted',
  COLLABORATOR_ADDED = 'CollaboratorAdded',
  COLLABORATOR_REMOVED = 'CollaboratorRemoved',

  // Collaboration events
  USER_JOINED = 'UserJoined',
  USER_LEFT = 'UserLeft',
  CURSOR_UPDATED = 'CursorUpdated',
  SESSION_STARTED = 'SessionStarted',
  SESSION_ENDED = 'SessionEnded',

  // System events
  BACKUP_CREATED = 'BackupCreated',
  EXPORT_COMPLETED = 'ExportCompleted',
  IMPORT_COMPLETED = 'ImportCompleted'
}

// Common command types
export enum CommandType {
  // Cell commands
  CREATE_CELL = 'CreateCell',
  UPDATE_CELL = 'UpdateCell',
  DELETE_CELL = 'DeleteCell',
  ADD_DEPENDENCY = 'AddDependency',
  REMOVE_DEPENDENCY = 'RemoveDependency',

  // Spreadsheet commands
  CREATE_SPREADSHEET = 'CreateSpreadsheet',
  UPDATE_SPREADSHEET = 'UpdateSpreadsheet',
  DELETE_SPREADSHEET = 'DeleteSpreadsheet',
  ADD_COLLABORATOR = 'AddCollaborator',
  REMOVE_COLLABORATOR = 'RemoveCollaborator',

  // Collaboration commands
  JOIN_SESSION = 'JoinSession',
  LEAVE_SESSION = 'LeaveSession',
  UPDATE_CURSOR = 'UpdateCursor'
}

// Cell state
export interface CellState {
  id: string;
  value: unknown;
  formula?: string;
  formatting?: Record<string, unknown>;
  dependencies: string[];
  lastModified: Date;
  lastModifiedBy: string;
}

// Spreadsheet state
export interface SpreadsheetState {
  id: string;
  name: string;
  owner: string;
  collaborators: string[];
  cells: Map<string, CellState>;
  createdAt: Date;
  updatedAt: Date;
}

// Collaboration state
export interface CollaborationState {
  sessionId: string;
  spreadsheetId: string;
  users: Map<string, CollaboratingUser>;
  cursors: Map<string, CursorPosition>;
  startedAt: Date;
}

// Collaborating user
export interface CollaboratingUser {
  userId: string;
  username: string;
  joinedAt: Date;
  lastActivity: Date;
}

// Cursor position
export interface CursorPosition {
  userId: string;
  row: number;
  column: number;
  timestamp: Date;
}

// Event envelope for transport
export interface EventEnvelope {
  event: Event;
  position: number;
  stream: string;
}

// Stream info
export interface StreamInfo {
  streamName: string;
  streamType: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Query result
export interface QueryResult<T = unknown> {
  data: T[];
  metadata: {
    count: number;
    timestamp: Date;
    version: number;
  };
}

// Snapshot info
export interface SnapshotInfo {
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: Date;
  size: number;
}

// Event store statistics
export interface EventStoreStats {
  totalEvents: number;
  totalStreams: number;
  eventsPerStream: Map<string, number>;
  latestEvent?: Event;
}

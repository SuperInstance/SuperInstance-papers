/**
 * Collaboration System - Exports
 *
 * Real-time collaboration using Yjs CRDTs for spreadsheet cells.
 * Supports 100+ concurrent users with <100ms sync latency.
 *
 * Components:
 * - CollaborationServer: WebSocket server for room management
 * - CollaborationClient: WebSocket client for real-time updates
 * - OperationTransformer: OT algorithm for conflict-free collaboration
 * - ConflictResolver: Multiple conflict resolution strategies
 * - PresenceManager: User presence and cursor tracking
 * - YjsDocument: CRDT document management
 * - CollaborationManager: High-level collaboration orchestration
 */

// Types
export * from './types';

// Core CRDT implementation
export { YjsDocument, YCell } from './YjsDocument';

// Real-time collaboration server
export {
  CollaborationServer,
  CollaborationRoom,
} from './CollaborationServer';

// Real-time collaboration client
export { CollaborationClient } from './CollaborationClient';

// Operational transformation
export { OperationTransformer } from './OperationTransformer';

// Conflict resolution
export {
  ConflictResolver,
  ConflictInfo,
  ResolutionStrategy,
  ConflictResolution,
  MergePolicy,
} from './ConflictResolver';

// Collaboration management (Yjs-based)
export {
  CollaborationManager,
  UserCursor,
  UserState,
  CollaborationConfig,
} from './CollaborationManager';

// User presence
export {
  PresenceManager,
  UserInfo,
  PresenceConfig,
} from './PresenceManager';

// Version control
export {
  VersionControl,
  Snapshot,
  Branch,
  ChangeLog,
  DiffResult,
} from './VersionControl';

// UI Components
export { CollaboratorsPanel } from '../ui/components/CollaboratorsPanel';
export { RemoteCursors } from '../ui/components/RemoteCursors';
export { ConflictModal } from '../ui/components/ConflictModal';
export { VersionTimeline } from '../ui/components/VersionTimeline';

// Server
export {
  YjsServer,
  startYjsServer,
  YjsServerConfig,
  ConnectionInfo,
} from '../../../server/yjs-server';

// Re-export Yjs types for convenience
export * from 'yjs';
export { Awareness } from 'y-protocols/awareness';

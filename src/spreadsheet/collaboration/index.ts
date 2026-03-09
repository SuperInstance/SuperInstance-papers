/**
 * Collaboration System - Exports
 *
 * Real-time collaboration using Yjs CRDTs for spreadsheet cells.
 * Supports 100+ concurrent users with <100ms sync latency.
 */

// Core CRDT implementation
export { YjsDocument, YCell } from './YjsDocument';

// Collaboration management
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

// Conflict resolution
export {
  ConflictResolver,
  ConflictInfo,
  ResolutionStrategy,
  ConflictResolution,
} from './ConflictResolver';

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

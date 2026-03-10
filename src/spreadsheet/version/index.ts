/**
 * Version Control System for POLLN Spreadsheets
 *
 * A Git-like version control system optimized for spreadsheet data
 * with efficient delta storage, branching, and merge capabilities.
 *
 * @example
 * ```typescript
 * import { VersionStore } from './version';
 *
 * // Initialize store
 * const store = new VersionStore('./.polln-version');
 * await store.initialize();
 *
 * // Create commit
 * const cells = new Map([['A1', { value: 'Hello', type: 'string' }]]);
 * const version = await store.commit(cells, metadata, 'Initial commit', 'user');
 *
 * // Create branch
 * store.branch('feature-branch');
 *
 * // Merge
 * await store.merge('feature-branch', MergeStrategy.AUTO);
 * ```
 *
 * @module spreadsheet/version
 */

// Core types
export * from './types';

// Main version store
export { VersionStore } from './VersionStore';
export type { RepositoryStatistics } from './VersionStore';

// Delta management
export { DeltaManager } from './DeltaManager';
export type { DeltaStats } from './DeltaManager';

// Snapshot management
export { SnapshotManager } from './SnapshotManager';
export type { CompressedSnapshot, SnapshotStatistics } from './SnapshotManager';

// Branch management
export { BranchManager } from './BranchManager';
export type { MergePreview } from './BranchManager';

// Merge resolution
export { MergeResolver } from './MergeResolver';
export type { MergePreview as MergeResolverPreview, ConflictUIItem } from './MergeResolver';

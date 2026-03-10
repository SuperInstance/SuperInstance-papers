/**
 * Version Control System Types for POLLN Spreadsheet
 *
 * This module defines the core types for a Git-like version control system
 * optimized for spreadsheet data with efficient delta storage.
 */

/**
 * A version represents a commit in the version history
 */
export interface Version {
  /** Unique identifier for this version */
  id: string;
  /** Parent version ID (null for initial commit) */
  parent: string | null;
  /** Commit message describing changes */
  message: string;
  /** Author who created this version */
  author: string;
  /** Unix timestamp when version was created */
  timestamp: number;
  /** Reference to root tree object */
  tree: string;
  /** Branch name (if this version is a branch head) */
  branch?: string;
  /** List of parent versions (for merge commits) */
  parents?: string[];
}

/**
 * A branch represents a line of development
 */
export interface Branch {
  /** Branch name */
  name: string;
  /** Version ID at branch tip */
  head: string;
  /** Whether this is the currently checked out branch */
  isActive: boolean;
  /** Whether this is the default branch */
  isDefault: boolean;
}

/**
 * Complete snapshot of spreadsheet state at a point in time
 */
export interface SheetSnapshot {
  /** Snapshot ID */
  id: string;
  /** Version ID this snapshot represents */
  versionId: string;
  /** All cell data indexed by coordinate (e.g., "A1", "B2") */
  cells: Map<string, CellValue>;
  /** Spreadsheet metadata */
  metadata: SheetMetadata;
  /** Timestamp when snapshot was created */
  timestamp: number;
}

/**
 * Value stored in a cell
 */
export interface CellValue {
  /** Cell coordinate */
  coordinate: string;
  /** Cell value */
  value: any;
  /** Cell type */
  type: CellType;
  /** Formula (if applicable) */
  formula?: string;
  /** Cell format */
  format?: CellFormat;
  /** Cell dependencies */
  dependencies?: string[];
  /** Custom properties */
  properties?: Record<string, any>;
}

/**
 * Supported cell types
 */
export enum CellType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  FORMULA = 'formula',
  ERROR = 'error',
  EMPTY = 'empty',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object'
}

/**
 * Cell formatting options
 */
export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  horizontalAlignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  numberFormat?: string;
}

/**
 * Spreadsheet metadata
 */
export interface SheetMetadata {
  /** Sheet name */
  name: string;
  /** Number of columns */
  columnCount: number;
  /** Number of rows */
  rowCount: number;
  /** Column widths */
  columnWidths?: Record<string, number>;
  /** Row heights */
  rowHeights?: Record<string, number>;
  /** Frozen panes */
  frozenColumns?: number;
  frozenRows?: number;
}

/**
 * Delta representing a single cell change
 */
export interface CellDelta {
  /** Cell coordinate */
  cellId: string;
  /** Type of operation */
  operation: DeltaOperation;
  /** Value before change (for modify/delete) */
  before?: CellValue;
  /** Value after change (for add/modify) */
  after?: CellValue;
  /** Timestamp of change */
  timestamp?: number;
  /** Author of change */
  author?: string;
}

/**
 * Delta operation types
 */
export enum DeltaOperation {
  ADD = 'add',
  MODIFY = 'modify',
  DELETE = 'delete'
}

/**
 * Compressed delta for efficient storage
 */
export interface CompressedDelta {
  /** Version ID this delta applies to */
  versionId: string;
  /** Compressed delta data */
  data: Uint8Array;
  /** Compression algorithm used */
  algorithm: CompressionAlgorithm;
  /** Original size before compression */
  originalSize: number;
  /** Compressed size */
  compressedSize: number;
}

/**
 * Compression algorithms
 */
export enum CompressionAlgorithm {
  NONE = 'none',
  GZIP = 'gzip',
  BROTLI = 'brotli',
  LZMA = 'lzma'
}

/**
 * Difference between two versions
 */
export interface CellDiff {
  /** Cell coordinate */
  coordinate: string;
  /** Operation performed */
  operation: DeltaOperation;
  /** Value in version1 */
  before?: CellValue;
  /** Value in version2 */
  after?: CellValue;
}

/**
 * Result of a merge operation
 */
export interface MergeResult {
  /** Whether merge was successful */
  success: boolean;
  /** Merged version ID (if successful) */
  versionId?: string;
  /** Conflicts that need resolution (if unsuccessful) */
  conflicts?: MergeConflict[];
  /** Statistics about the merge */
  stats: MergeStats;
}

/**
 * Merge conflict between two branches
 */
export interface MergeConflict {
  /** Cell coordinate */
  coordinate: string;
  /** Value in current branch */
  current: CellValue;
  /** Value in incoming branch */
  incoming: CellValue;
  /** Base value from common ancestor */
  base: CellValue;
  /** Conflict type */
  type: ConflictType;
}

/**
 * Types of merge conflicts
 */
export enum ConflictType {
  /** Same cell modified in both branches */
  BOTH_MODIFIED = 'both_modified',
  /** Cell deleted in one branch, modified in another */
  DELETE_MODIFY = 'delete_modify',
  /** Cell added with same coordinate in both branches */
  BOTH_ADDED = 'both_added',
  /** Cell dependency conflict */
  DEPENDENCY = 'dependency'
}

/**
 * Merge statistics
 */
export interface MergeStats {
  /** Number of cells successfully merged */
  merged: number;
  /** Number of conflicts */
  conflicts: number;
  /** Number of cells added */
  added: number;
  /** Number of cells deleted */
  deleted: number;
  /** Number of cells modified */
  modified: number;
}

/**
 * Strategies for handling merge conflicts
 */
export enum MergeStrategy {
  /** Keep current branch's version */
  OURS = 'ours',
  /** Accept incoming branch's version */
  THEIRS = 'theirs',
  /** Attempt automatic merge */
  AUTO = 'auto',
  /** Manual conflict resolution */
  MANUAL = 'manual',
  /** Union of both branches (for non-conflicting changes) */
  UNION = 'union'
}

/**
 * Version history entry
 */
export interface VersionEntry {
  /** Version ID */
  id: string;
  /** Parent version ID */
  parent: string | null;
  /** Commit message */
  message: string;
  /** Author */
  author: string;
  /** Timestamp */
  timestamp: number;
  /** Branch name */
  branch?: string;
  /** Number of changes in this version */
  changeCount: number;
}

/**
 * Tree object representing spreadsheet structure
 */
export interface Tree {
  /** Tree ID */
  id: string;
  /** Child trees (representing sheets/sections) */
  trees: Map<string, Tree>;
  /** Blob references (representing cell data) */
  blobs: Map<string, string>;
}

/**
 * Blob object containing data
 */
export interface Blob {
  /** Blob ID */
  id: string;
  /** Data content */
  content: Buffer | Uint8Array;
  /** Data hash for integrity */
  hash: string;
  /** Size in bytes */
  size: number;
}

/**
 * Version control configuration
 */
export interface VersionConfig {
  /** Maximum number of versions to keep */
  maxVersions?: number;
  /** Whether to enable compression */
  enableCompression?: boolean;
  /** Compression algorithm to use */
  compressionAlgorithm?: CompressionAlgorithm;
  /** Whether to enable garbage collection */
  enableGarbageCollection?: boolean;
  /** Minimum versions to keep per branch */
  minVersionsPerBranch?: number;
  /** Repository name */
  repositoryName?: string;
}

/**
 * Export format for versions
 */
export interface VersionExport {
  /** Export format version */
  version: string;
  /** Repository name */
  repository: string;
  /** Export timestamp */
  timestamp: number;
  /** All versions */
  versions: Version[];
  /** All branches */
  branches: Branch[];
  /** All snapshots */
  snapshots: SheetSnapshot[];
  /** Configuration */
  config: VersionConfig;
}

/**
 * Import result
 */
export interface ImportResult {
  /** Whether import was successful */
  success: boolean;
  /** Number of versions imported */
  versionCount: number;
  /** Number of branches imported */
  branchCount: number;
  /** Number of snapshots imported */
  snapshotCount: number;
  /** Errors encountered during import */
  errors: string[];
}

/**
 * Conflict resolution action
 */
export interface ConflictResolution {
  /** Cell coordinate */
  coordinate: string;
  /** Resolution action */
  action: MergeStrategy;
  /** Custom value (if manual resolution) */
  customValue?: any;
}

/**
 * Version history filter
 */
export interface HistoryFilter {
  /** Filter by author */
  author?: string;
  /** Filter by branch */
  branch?: string;
  /** Filter by date range */
  since?: number;
  /** Filter by date range */
  until?: number;
  /** Filter by message pattern */
  messagePattern?: string;
  /** Maximum number of results */
  limit?: number;
  /** Skip N results */
  skip?: number;
}

/**
 * Type definitions for the POLLN Spreadsheet Import/Export system
 *
 * This file defines all the interfaces and types used for exporting and
 * importing cell networks in various formats.
 */

import type {
  CellId,
  CellType,
  CellPosition,
  CellState,
  LogicLevel,
  CellReference,
  SensationType,
  ReasoningTrace,
  ExecutionRecord,
  CellSelfModel,
  Effect,
} from '../core/types.js';

/**
 * Export format options
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf',
  POLLN = 'polln',
}

/**
 * Import source types
 */
export enum ImportSource {
  FILE = 'file',
  CLIPBOARD = 'clipboard',
  URL = 'url',
  DRAG_DROP = 'drag_drop',
}

/**
 * Export configuration options
 */
export interface ExportConfig {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeHistory?: boolean;
  includeTrace?: boolean;
  compress?: boolean;
  password?: string;
  version?: string;
  pretty?: boolean;
}

/**
 * Import configuration options
 */
export interface ImportConfig {
  source: ImportSource;
  validateSchema?: boolean;
  mergeStrategy?: MergeStrategy;
  conflictResolution?: ConflictResolution;
  migrateVersions?: boolean;
  targetVersion?: string;
}

/**
 * Merge strategies for import
 */
export enum MergeStrategy {
  REPLACE = 'replace', // Replace entire network
  MERGE = 'merge', // Merge with existing
  APPEND = 'append', // Append to existing
  SKIP = 'skip', // Skip existing cells
}

/**
 * Conflict resolution strategies
 */
export enum ConflictResolution {
  KEEP_IMPORT = 'keep_import',
  KEEP_EXISTING = 'keep_existing',
  KEEP_NEWER = 'keep_newer',
  KEEP_HIGHER_VERSION = 'keep_higher_version',
  MANUAL = 'manual',
}

/**
 * Serializable cell data for export
 */
export interface SerializableCell {
  id: CellId;
  type: CellType;
  state: CellState;
  position: CellPosition;
  logicLevel: LogicLevel;
  createdAt: number;
  updatedAt: number;
  version: number;

  // Cell anatomy
  head: {
    inputs: Array<{
      id: string;
      source: CellReference | string;
      type: string;
      active: boolean;
    }>;
    sensations: Array<{
      source: CellReference;
      type: SensationType;
      threshold: number;
    }>;
  };

  body: {
    logic?: any;
    memory: {
      limit: number;
      records: ExecutionRecord[];
    };
    selfModel: CellSelfModel;
  };

  tail: {
    outputs: Array<{
      id: string;
      target: CellReference | string;
      type: string;
      active: boolean;
    }>;
    effects: Effect[];
  };

  origin: {
    position: CellPosition;
    selfAwareness: number;
    watchedCells: Array<{
      reference: CellReference;
      sensationTypes: SensationType[];
      threshold: number;
    }>;
  };

  // Optional extended data
  metadata?: Record<string, any>;
  history?: Array<{
    state: CellState;
    timestamp: number;
  }>;
  performance?: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
  };
}

/**
 * Network metadata
 */
export interface NetworkMetadata {
  name: string;
  description?: string;
  version: string;
  formatVersion: string;
  createdAt: number;
  updatedAt: number;
  author?: string;
  tags?: string[];
  dimensions?: {
    rows: number;
    cols: number;
  };
  statistics?: {
    totalCells: number;
    cellsByType: Record<CellType, number>;
    totalConnections: number;
    averageExecutionTime?: number;
  };
}

/**
 * Complete network export structure
 */
export interface NetworkExport {
  format: 'POLLN_NETWORK';
  version: string;
  metadata: NetworkMetadata;
  cells: SerializableCell[];
  connections: Array<{
    from: CellReference;
    to: CellReference;
    type: 'data' | 'control' | 'sensation';
  }>;
  dependencies?: Array<{
    from: CellId;
    to: CellId;
    type: string;
  }>;
}

/**
 * CSV export format (simplified)
 */
export interface CSVExportData {
  headers: string[];
  rows: Array<{
    position: string;
    id: string;
    type: string;
    value: string;
    formula?: string;
    state: string;
  }>;
}

/**
 * Excel export format
 */
export interface ExcelExportData {
  sheets: Array<{
    name: string;
    data: Array<Array<string | number | boolean>>;
    styling?: Array<{
      range: string;
      styles: Record<string, any>;
    }>;
  }>;
}

/**
 * PDF export configuration
 */
export interface PDFExportConfig extends ExportConfig {
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  includeVisualization?: boolean;
  includeSummary?: boolean;
  includeDetails?: boolean;
  fontSize?: number;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    totalCells: number;
    validCells: number;
    invalidCells: number;
    totalConnections: number;
    validConnections: number;
    invalidConnections: number;
  };
}

/**
 * Validation error
 */
export interface ValidationError {
  type: 'schema' | 'reference' | 'version' | 'data' | 'circular';
  severity: 'error' | 'critical';
  message: string;
  location?: {
    cellId?: CellId;
    position?: CellPosition;
    field?: string;
  };
  details?: any;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  type: 'deprecated' | 'compatibility' | 'performance' | 'best_practice';
  message: string;
  location?: {
    cellId?: CellId;
    position?: CellPosition;
  };
  suggestion?: string;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migratedCells: number;
  failedMigrations: number;
  transformations: Array<{
    type: string;
    description: string;
    affectedCells: CellId[];
  }>;
  warnings: string[];
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  imported: {
    cells: number;
    connections: number;
  };
  skipped: {
    cells: number;
    connections: number;
  };
  errors: Array<{
    message: string;
    location?: any;
  }>;
  warnings: string[];
  duration: number;
}

/**
 * Progress callback for long operations
 */
export type ProgressCallback = (progress: {
  current: number;
  total: number;
  stage: string;
  message?: string;
}) => void;

/**
 * POLLN binary format header
 */
export interface POLLNBinaryHeader {
  magic: number; // 0x504F4C4E = "POLL"
  version: number;
  flags: number;
  compression: boolean;
  encryption: boolean;
  metadataSize: number;
  cellCount: number;
  connectionCount: number;
}

/**
 * Conflict detected during import
 */
export interface ImportConflict {
  type: 'cell_exists' | 'version_mismatch' | 'connection_conflict' | 'circular_dependency';
  existing: any;
  incoming: any;
  location: {
    cellId?: CellId;
    position?: CellPosition;
  };
  suggestedResolution?: ConflictResolution;
}

/**
 * Export statistics
 */
export interface ExportStatistics {
  totalCells: number;
  totalConnections: number;
  totalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
  duration: number;
  format: ExportFormat;
}

/**
 * Clipboard data format
 */
export interface ClipboardData {
  type: 'polln_cells' | 'polln_values' | 'text';
  data: any;
  metadata?: {
    source: string;
    timestamp: number;
    version: string;
  };
}

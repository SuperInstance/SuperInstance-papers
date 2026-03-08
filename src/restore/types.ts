/**
 * Restore System Types
 * Backup restoration and validation
 */

import type { BackupMetadata, ColonyBackupData, IncrementalBackupData } from '../backup/types.js';

// ============================================================================
// Restore Types
// ============================================================================

export enum RestoreStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  VALIDATING = 'VALIDATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK'
}

export enum RestoreMode {
  FULL = 'FULL',              // Complete restore
  ROLLBACK = 'ROLLBACK',      // Rollback to specific point
  SELECTIVE = 'SELECTIVE',    // Restore specific components
  DRY_RUN = 'DRY_RUN'         // Validate without restoring
}

export interface RestoreOptions {
  mode: RestoreMode;
  backupId: string;
  validate?: boolean;
  components?: RestoreComponent[];
  targetColonyId?: string;
  skipValidation?: boolean;
  force?: boolean;
  preRestoreScript?: string;
  postRestoreScript?: string;
}

export interface RestoreComponent {
  type: 'AGENTS' | 'SYNAPSES' | 'VALUE_NETWORK' | 'KV_CACHE' | 'MEADOW' |
        'FEDERATED' | 'WORLD_MODEL' | 'DREAMING' | 'TILES' | 'META_TILES' |
        'STIGMERGY' | 'CONSTRAINTS' | 'AUDIT_LOGS';
  restore: boolean;
  options?: Record<string, unknown>;
}

export interface RestoreResult {
  status: RestoreStatus;
  backupId: string;
  startedAt: number;
  completedAt?: number;
  duration?: number;
  componentsRestored: RestoreComponentResult[];
  validationResults?: ValidationResults;
  errors: RestoreError[];
  warnings: string[];
  metrics: RestoreMetrics;
}

export interface RestoreComponentResult {
  component: string;
  success: boolean;
  itemsRestored: number;
  errors: string[];
  duration: number;
}

export interface RestoreError {
  component?: string;
  message: string;
  details?: string;
  timestamp: number;
  recoverable: boolean;
}

export interface RestoreMetrics {
  totalBytesRestored: number;
  agentsRestored: number;
  synapsesRestored: number;
  kvAnchorsRestored: number;
  patternsRestored: number;
  tilesRestored: number;
  validationDuration: number;
  restoreDuration: number;
  throughputMBps: number;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResults {
  passed: boolean;
  checks: ValidationCheck[];
  summary: ValidationSummary;
}

export interface ValidationCheck {
  name: string;
  category: 'CHECKSUM' | 'INTEGRITY' | 'COMPATIBILITY' | 'CONSISTENCY' | 'CONNECTIVITY';
  passed: boolean;
  message: string;
  details?: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

export interface ValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  criticalFailures: number;
}

export interface ValidationOptions {
  checkChecksum?: boolean;
  checkIntegrity?: boolean;
  checkCompatibility?: boolean;
  checkConsistency?: boolean;
  checkConnectivity?: boolean;
  skipWarnings?: boolean;
  allowPartialRestore?: boolean;
}

// ============================================================================
// Migration Types
// ============================================================================

export interface MigrationRule {
  fromVersion: string;
  toVersion: string;
  transformations: Transformation[];
  description: string;
  manualSteps?: string[];
}

export interface Transformation {
  path: string; // JSON path to transform
  type: 'RENAME' | 'DELETE' | 'TRANSFORM' | 'MOVE' | 'DEFAULT';
  from?: string;
  to?: string;
  transform?: (value: unknown) => unknown;
  defaultValue?: unknown;
}

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  transformations: string[];
  warnings: string[];
  data: ColonyBackupData | IncrementalBackupData;
}

// ============================================================================
// Consistency Check Types
// ============================================================================

export interface ConsistencyCheckOptions {
  checkAgentReferences?: boolean;
  checkSynapseIntegrity?: boolean;
  checkValueNetwork?: boolean;
  checkKVCacheIntegrity?: boolean;
  checkMeadowConsistency?: boolean;
  checkFederatedState?: boolean;
  checkTileDependencies?: boolean;
  repairIssues?: boolean;
}

export interface ConsistencyCheckResult {
  passed: boolean;
  issues: ConsistencyIssue[];
  repairs: ConsistencyRepair[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    repaired: number;
    unrepairable: number;
  };
}

export interface ConsistencyIssue {
  type: 'BROKEN_REFERENCE' | 'MISSING_DEPENDENCY' | 'INTEGRITY_ERROR' |
        'INCONSISTENT_STATE' | 'ORPHANED_DATA' | 'VERSION_MISMATCH';
  severity: 'CRITICAL' | 'ERROR' | 'WARNING';
  component: string;
  entityId?: string;
  message: string;
  details?: string;
  repairable: boolean;
}

export interface ConsistencyRepair {
  issueId: string;
  action: 'DELETE' | 'REPAIR' | 'RECREATE' | 'IGNORE';
  description: string;
  result: 'SUCCESS' | 'FAILED' | 'PARTIAL';
}

// ============================================================================
// Rollback Types
// ============================================================================

export interface RollbackOptions {
  reason: string;
  createBackup?: boolean;
  force?: boolean;
}

export interface RollbackResult {
  success: boolean;
  previousBackupId: string;
  newBackupId?: string;
  rollbackTo: number; // timestamp
  reason: string;
  duration: number;
}

// ============================================================================
// Restore Plan Types
// ============================================================================

export interface RestorePlan {
  backupId: string;
  mode: RestoreMode;
  estimatedDuration: number; // milliseconds
  estimatedSize: number; // bytes
  steps: RestoreStep[];
  prerequisites: string[];
  risks: Risk[];
  rollbackPlan?: RollbackPlan;
}

export interface RestoreStep {
  order: number;
  name: string;
  description: string;
  component: string;
  estimatedDuration: number;
  dependencies: string[];
}

export interface Risk {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  mitigation?: string;
}

export interface RollbackPlan {
  available: boolean;
  backupBeforeRestore: boolean;
  rollbackSteps: string[];
  maxRollbackTime: number; // milliseconds
}

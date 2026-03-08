/**
 * Failover System Types
 * Automatic failover and disaster recovery
 */

import type { BackupMetadata } from '../backup/types.js';

// ============================================================================
// Failover Types
// ============================================================================

export enum FailoverStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  FAILING = 'FAILING',
  FAILOVER_INITIATED = 'FAILOVER_INITIATED',
  FAILOVER_IN_PROGRESS = 'FAILOVER_IN_PROGRESS',
  FAILOVER_COMPLETED = 'FAILOVER_COMPLETED',
  FAILOVER_FAILED = 'FAILOVER_FAILED',
  RECOVERY_INITIATED = 'RECOVERY_INITIATED',
  RECOVERY_IN_PROGRESS = 'RECOVERY_IN_PROGRESS',
  RECOVERY_COMPLETED = 'RECOVERY_COMPLETED'
}

export enum FailoverMode {
  HOT_STANDBY = 'HOT_STANDBY',       // Immediate cutover
  COLD_STANDBY = 'COLD_STANDBY',       // Manual cutover with restore
  MULTI_ACTIVE = 'MULTI_ACTIVE',       // Active-active configuration
  MANUAL = 'MANUAL'                    // Manual intervention required
}

export enum FailureType {
  COLONY_UNRESPONSIVE = 'COLONY_UNRESPONSIVE',
  AGENT_FAILURE = 'AGENT_FAILURE',
  STORAGE_FAILURE = 'STORAGE_FAILURE',
  NETWORK_FAILURE = 'NETWORK_FAILURE',
  HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  CORRUPTION_DETECTED = 'CORRUPTION_DETECTED',
  BACKUP_UNAVAILABLE = 'BACKUP_UNAVAILABLE',
  MANUAL_TRIGGER = 'MANUAL_TRIGGER'
}

export interface FailoverConfig {
  enabled: boolean;
  mode: FailoverMode;
  primaryRegion: string;
  secondaryRegions: string[];
  healthCheckInterval: number; // milliseconds
  failureThreshold: number; // consecutive failures
  recoveryThreshold: number; // consecutive successful checks
  autoFailover: boolean;
  autoRecovery: boolean;
  preFailoverBackup: boolean;
  postFailoverValidation: boolean;
}

export interface FailoverEvent {
  id: string;
  timestamp: number;
  colonyId: string;
  failureType: FailureType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: FailoverStatus;
  primaryRegion: string;
  targetRegion: string;
  initiatedBy: 'AUTOMATIC' | 'MANUAL';
  reason: string;
  duration?: number; // milliseconds
  completedAt?: number;
  metadata: Record<string, unknown>;
}

export interface FailoverResult {
  success: boolean;
  event: FailoverEvent;
  backupCreated?: boolean;
  backupId?: string;
  validationPassed?: boolean;
  downtime: number; // milliseconds
  rtoAchieved: boolean; // Met RTO target?
  dataLoss?: boolean; // Any data loss detected?
  warnings: string[];
  errors: string[];
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthCheckConfig {
  colony: {
    enabled: boolean;
    timeout: number; // milliseconds
    interval: number; // milliseconds
  };
  storage: {
    enabled: boolean;
    timeout: number;
    interval: number;
  };
  network: {
    enabled: boolean;
    timeout: number;
    interval: number;
  };
  agents: {
    enabled: boolean;
    timeout: number;
    interval: number;
    failureThreshold: number; // percentage of agents
  };
  customChecks: HealthCheckDefinition[];
}

export interface HealthCheckDefinition {
  name: string;
  type: 'HTTP' | 'TCP' | 'SCRIPT' | 'METRIC';
  config: Record<string, unknown>;
  enabled: boolean;
  timeout: number;
  interval: number;
}

export interface HealthCheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  timestamp: number;
  duration: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface ColonyHealthStatus {
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  checks: HealthCheckResult[];
  lastCheckTime: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

// ============================================================================
// Detection Types
// ============================================================================

export interface FailureDetectionConfig {
  enabled: boolean;
  anomalyDetection: boolean;
  thresholding: boolean;
  patternMatching: boolean;
  mlDetection: boolean;
  customDetectors: FailureDetectorConfig[];
}

export interface FailureDetectorConfig {
  name: string;
  type: 'THRESHOLD' | 'ANOMALY' | 'PATTERN' | 'ML_MODEL';
  metric: string;
  condition: string; // e.g., "value > threshold"
  windowSize: number; // time window for evaluation
  minSamples: number;
  enabled: boolean;
}

export interface FailureDetectionResult {
  detected: boolean;
  confidence: number; // 0-1
  failureType: FailureType;
  detector: string;
  timestamp: number;
  details: {
    metric: string;
    value: number;
    threshold: number;
    message: string;
  };
}

// ============================================================================
// Failover Strategy Types
// ============================================================================

export interface FailoverStrategyConfig {
  mode: FailoverMode;
  preFailoverActions: FailoverAction[];
  postFailoverActions: FailoverAction[];
  rollbackActions: FailoverAction[];
}

export interface FailoverAction {
  order: number;
  name: string;
  type: 'BACKUP' | 'NOTIFY' | 'STOP' | 'START' | 'VALIDATE' | 'SCRIPT';
  config: Record<string, unknown>;
  timeout: number;
  critical: boolean; // Fail if this action fails
}

export interface HotStandbyConfig {
  syncInterval: number; // milliseconds
  syncMethod: 'STREAMING' | 'PERIODIC' | 'HYBRID';
  bandwidthLimit?: number; // MB/s
  compressionEnabled: boolean;
  keepBackupCount: number;
}

export interface ColdStandbyConfig {
  backupId: string;
  restoreTimeout: number; // milliseconds
  validationEnabled: boolean;
  preWarmCache: boolean;
}

export interface MultiActiveConfig {
  quorum: number;
  readRegions: string[];
  writeRegion: string;
  conflictResolution: 'LAST_WRITE_WINS' | 'VERSION_VECTOR' | 'CUSTOM';
  syncLatencyTarget: number; // milliseconds
}

// ============================================================================
// Recovery Types
// ============================================================================

export interface RecoveryPlan {
  failbackEnabled: boolean;
  automaticFailback: boolean;
  failbackDelay: number; // milliseconds
  resyncMethod: 'FULL' | 'INCREMENTAL' | 'HYBRID';
  validationSteps: string[];
}

export interface RecoveryResult {
  success: boolean;
  originalRegionRestored: boolean;
  resyncCompleted: boolean;
  validationPassed: boolean;
  duration: number;
  warnings: string[];
}

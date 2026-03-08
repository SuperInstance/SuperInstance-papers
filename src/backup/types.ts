/**
 * Disaster Recovery Types
 * Backup and restore system for POLLN colonies
 */

// ============================================================================
// Backup Types
// ============================================================================

export enum BackupType {
  FULL = 'FULL',           // Complete colony backup
  INCREMENTAL = 'INCREMENTAL', // Changes since last backup
  SNAPSHOT = 'SNAPSHOT',   // Point-in-time snapshot
  DIFFERENTIAL = 'DIFFERENTIAL' // Changes since last full backup
}

export enum BackupStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export enum StorageBackend {
  LOCAL = 'LOCAL',
  S3 = 'S3',
  GCS = 'GCS',
  AZURE = 'AZURE',
  DATABASE = 'DATABASE'
}

export enum CompressionAlgorithm {
  NONE = 'NONE',
  GZIP = 'GZIP',
  BROTLI = 'BROTLI',
  ZSTD = 'ZSTD'
}

export enum EncryptionMethod {
  NONE = 'NONE',
  AES256_GCM = 'AES256_GCM',
  AES256_CBC = 'AES256_CBC'
}

export interface BackupMetadata {
  id: string;
  colonyId: string;
  gardenerId: string;

  // Type and status
  type: BackupType;
  status: BackupStatus;

  // Timestamps
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  expiresAt?: number;

  // Size information
  sizeBytes: number;
  compressedSizeBytes?: number;
  compressed: boolean;
  compressionAlgorithm?: CompressionAlgorithm;

  // Encryption
  encrypted: boolean;
  encryptionMethod?: EncryptionMethod;
  encryptionKeyId?: string;

  // Relationships
  parentBackupId?: string; // For incremental/differential
  chainBackupIds: string[]; // Full backup chain

  // Storage
  storageBackend: StorageBackend;
  storageLocation: string;
  storageChecksums?: Record<string, string>; // Path -> checksum

  // Content
  contains: BackupContent;

  // Validation
  checksum: string;
  checksumAlgorithm: 'sha256' | 'sha384' | 'sha512';

  // Performance
  duration?: number; // milliseconds
  throughputMBps?: number;

  // Tags
  tags: string[];
  labels: Record<string, string>;

  // DR info
  rpoTarget?: number; // Recovery Point Objective in milliseconds
  rtoAchieved?: number; // Recovery Time Objective achieved

  version: string; // Backup schema version
}

export interface BackupContent {
  colonyConfig: boolean;
  agents: boolean;
  agentConfigs: boolean;
  synapses: boolean;
  valueNetwork: boolean;
  kvCache: boolean;
  meadowPatterns: boolean;
  federatedState: boolean;
  a2aHistory: boolean;
  auditLogs: boolean;
  worldModel: boolean;
  dreamingState: boolean;
  tiles: boolean;
  metaTiles: boolean;
  stigmergy: boolean;
  constraints: boolean;
}

export interface BackupResult {
  metadata: BackupMetadata;
  success: boolean;
  error?: string;
  warnings?: string[];
  metrics: BackupMetrics;
}

export interface BackupMetrics {
  duration: number; // milliseconds
  sizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  throughputMBps: number;
  agentsBackedUp: number;
  synapsesBackedUp: number;
  kvAnchorsBackedUp: number;
  patternsBackedUp: number;
  encryptionDuration: number;
  uploadDuration: number;
}

// ============================================================================
// Backup Config
// ============================================================================

export interface BackupConfig {
  enabled: boolean;

  // Schedule
  schedule: BackupSchedule;

  // Retention
  retention: RetentionPolicy;

  // Storage
  storage: StorageConfig;

  // Content
  content: BackupContent;

  // Performance
  compression: CompressionConfig;
  encryption: EncryptionConfig;

  // Validation
  validateAfterBackup: boolean;
  checksumAlgorithm: 'sha256' | 'sha384' | 'sha512';

  // Notifications
  notifications: NotificationConfig;

  // Parallelism
  parallelism: number;
  chunkSizeBytes: number;
}

export interface BackupSchedule {
  full: CronSchedule; // Full backup schedule
  incremental: CronSchedule; // Incremental backup schedule
  differential?: CronSchedule; // Differential backup schedule
  snapshot?: SnapshotSchedule; // Ad-hoc snapshots
}

export interface CronSchedule {
  enabled: boolean;
  cron: string; // Standard cron expression
  timezone?: string;
}

export interface SnapshotSchedule {
  enabled: boolean;
  triggers: SnapshotTrigger[];
}

export interface SnapshotTrigger {
  type: 'EVENT' | 'CONDITION' | 'MANUAL';
  event?: string; // e.g., 'agent_graph_evolution', 'federated_sync_complete'
  condition?: string; // e.g., 'value_network_update > 0.5'
  label?: string; // For manual snapshots
}

export interface RetentionPolicy {
  full: RetentionRule;
  incremental: RetentionRule;
  differential?: RetentionRule;
  snapshot: RetentionRule;
}

export interface RetentionRule {
  count: number; // Number of backups to keep
  age?: number; // Maximum age in milliseconds
  minAge?: number; // Minimum age before deletion
}

export interface StorageConfig {
  primary: StorageBackendConfig;
  secondary?: StorageBackendConfig; // For multi-region
  tertiary?: StorageBackendConfig; // For cold storage
}

export interface StorageBackendConfig {
  backend: StorageBackend;
  config: Record<string, unknown>;
  priority: number;
  enabled: boolean;
}

export interface CompressionConfig {
  enabled: boolean;
  algorithm: CompressionAlgorithm;
  level: number; // 1-9 for gzip, 0-11 for zstd
}

export interface EncryptionConfig {
  enabled: boolean;
  method: EncryptionMethod;
  keyId?: string;
  keyManagementService: 'LOCAL' | 'AWS_KMS' | 'GCP_KMS' | 'AZURE_KEYVAULT';
}

export interface NotificationConfig {
  onSuccess: boolean;
  onFailure: boolean;
  channels: NotificationChannel[];
}

export interface NotificationChannel {
  type: 'EMAIL' | 'WEBHOOK' | 'SLACK' | 'PAGERDUTY';
  config: Record<string, unknown>;
  enabled: boolean;
}

// ============================================================================
// Backup Data
// ============================================================================

export interface ColonyBackupData {
  metadata: BackupMetadata;
  colony: ColonySnapshot;
  agents: AgentSnapshot[];
  synapses: SynapseSnapshot[];
  valueNetwork: ValueNetworkSnapshot;
  kvCache: KVCacheSnapshot;
  meadow: MeadowSnapshot;
  federated: FederatedSnapshot;
  a2aHistory: A2AHistorySnapshot;
  auditLogs: AuditLogSnapshot;
  worldModel: WorldModelSnapshot;
  dreaming: DreamingSnapshot;
  tiles: TileSnapshot[];
  metaTiles: MetaTileSnapshot[];
  stigmergy: StigmergySnapshot;
  constraints: ConstraintSnapshot[];
  timestamp: number;
  version: string;
}

export interface ColonySnapshot {
  id: string;
  config: Record<string, unknown>;
  stats: Record<string, unknown>;
  distributedState?: Record<string, unknown>;
}

export interface AgentSnapshot {
  id: string;
  state: Record<string, unknown>;
  config: Record<string, unknown>;
  modelVersion: number;
  lastActive: number;
}

export interface SynapseSnapshot {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  weight: number;
  coactivationCount: number;
  lastCoactivated: number;
}

export interface ValueNetworkSnapshot {
  parameters: Record<string, unknown>;
  metrics: Record<string, unknown>;
  updateCount: number;
}

export interface KVCacheSnapshot {
  anchors: KVAnchorSnapshot[];
  annIndex?: Record<string, unknown>;
  statistics: Record<string, unknown>;
}

export interface KVAnchorSnapshot {
  id: string;
  content: string;
  tokens: number[];
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface MeadowSnapshot {
  patterns: PatternSnapshot[];
  contributions: Record<string, number>;
  reputation: Record<string, number>;
}

export interface PatternSnapshot {
  id: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  usage: Record<string, unknown>;
}

export interface FederatedSnapshot {
  state: Record<string, unknown>;
  patterns: PatternSnapshot[];
  participantIds: string[];
  roundNumber: number;
}

export interface A2AHistorySnapshot {
  packages: A2APackageSnapshot[];
  causalChains: Record<string, string[]>;
}

export interface A2APackageSnapshot {
  id: string;
  senderId: string;
  receiverId: string;
  type: string;
  payload: unknown;
  timestamp: number;
  parentIds: string[];
  causalChainId: string;
}

export interface AuditLogSnapshot {
  logs: AuditLogEntry[];
  checksum: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  level: string;
  category: string;
  message: string;
  metadata: Record<string, unknown>;
}

export interface WorldModelSnapshot {
  vaeState: Record<string, unknown>;
  replayBuffer: Record<string, unknown>[];
  statistics: Record<string, unknown>;
}

export interface DreamingSnapshot {
  policy: Record<string, unknown>;
  dreamBuffer: Record<string, unknown>[];
  optimizationHistory: Record<string, unknown>[];
}

export interface TileSnapshot {
  id: string;
  type: string;
  state: Record<string, unknown>;
  config: Record<string, unknown>;
  observations: Record<string, unknown>[];
}

export interface MetaTileSnapshot extends TileSnapshot {
  differentiationHistory: Record<string, unknown>[];
  signalHistory: number[][];
}

export interface StigmergySnapshot {
  pathways: Record<string, unknown>;
  pheromones: Record<string, number>;
}

export interface ConstraintSnapshot {
  id: string;
  name: string;
  category: string;
  rule: string;
  severity: string;
  isActive: boolean;
}

// ============================================================================
// Incremental Backup
// ============================================================================

export interface IncrementalBackupData {
  baseBackupId: string; // The full backup this is based on
  changes: ChangeSet[];
  timestamp: number;
}

export interface ChangeSet {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'AGENT' | 'SYNAPSE' | 'PATTERN' | 'VALUE_NETWORK' | 'KV_ANCHOR' | 'TILE';
  entityId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ============================================================================
// Backup List and Query
// ============================================================================

export interface BackupListOptions {
  colonyId?: string;
  gardenerId?: string;
  type?: BackupType;
  status?: BackupStatus;
  storageBackend?: StorageBackend;
  startDate?: number;
  endDate?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'sizeBytes' | 'duration';
  sortOrder?: 'ASC' | 'DESC';
}

export interface BackupListResult {
  backups: BackupMetadata[];
  totalCount: number;
  hasMore: boolean;
}

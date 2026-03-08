/**
 * Backup Manager
 * Orchestrates backup creation, scheduling, and lifecycle management
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import type {
  BackupConfig,
  BackupMetadata,
  BackupResult,
  BackupType,
  BackupStatus,
  ColonyBackupData,
  IncrementalBackupData,
  BackupListOptions,
  BackupListResult,
  RetentionPolicy
} from './types.js';
import { FullBackupStrategy } from './strategies/full-backup.js';
import { IncrementalBackupStrategy } from './strategies/incremental-backup.js';
import { SnapshotBackupStrategy } from './strategies/snapshot-backup.js';
import { BackupScheduler } from './schedulers.js';
import { RetentionManager } from './retention.js';
import { StorageBackend as StorageBackendInterface } from '../backup/storage/types.js';
import { Colony } from '../core/colony.js';

export interface BackupManagerConfig {
  colony: Colony;
  config: BackupConfig;
  storageBackends: Map<string, StorageBackendInterface>;
}

/**
 * BackupManager - Main backup orchestration
 */
export class BackupManager extends EventEmitter {
  public readonly id: string;
  public readonly colony: Colony;
  public readonly config: BackupConfig;

  private storageBackends: Map<string, StorageBackendInterface>;
  private scheduler: BackupScheduler;
  private retentionManager: RetentionManager;
  private activeBackups: Map<string, Promise<BackupResult>>;
  private backupHistory: BackupMetadata[];

  // Strategy registry
  private strategies: Map<BackupType, any>;

  constructor(config: BackupManagerConfig) {
    super();

    this.id = uuidv4();
    this.colony = config.colony;
    this.config = config.config;
    this.storageBackends = config.storageBackends;
    this.activeBackups = new Map();
    this.backupHistory = [];

    // Initialize strategies
    this.strategies = new Map([
      ['FULL', new FullBackupStrategy()],
      ['INCREMENTAL', new IncrementalBackupStrategy()],
      ['SNAPSHOT', new SnapshotBackupStrategy()]
    ]);

    // Initialize scheduler
    this.scheduler = new BackupScheduler({
      manager: this,
      schedule: this.config.schedule
    });

    // Initialize retention manager
    this.retentionManager = new RetentionManager({
      storageBackends: this.storageBackends,
      retention: this.config.retention
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    this.scheduler.on('scheduled_backup', async (options) => {
      await this.createBackup(options);
    });

    this.scheduler.on('schedule_error', (error) => {
      this.emit('error', {
        context: 'scheduler',
        error
      });
    });
  }

  /**
   * Start backup manager
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.emit('info', { message: 'Backup manager disabled' });
      return;
    }

    // Start scheduler
    await this.scheduler.start();

    // Load backup history from storage
    await this.loadBackupHistory();

    // Apply retention policy
    await this.retentionManager.applyRetention(this.colony.id);

    this.emit('started', {
      managerId: this.id,
      colonyId: this.colony.id
    });
  }

  /**
   * Stop backup manager
   */
  async stop(): Promise<void> {
    // Stop scheduler
    await this.scheduler.stop();

    // Wait for active backups to complete
    await Promise.allSettled(this.activeBackups.values());

    this.emit('stopped', {
      managerId: this.id,
      colonyId: this.colony.id
    });
  }

  /**
   * Create a backup
   */
  async createBackup(options: {
    type?: BackupType;
    tags?: string[];
    labels?: Record<string, string>;
    reason?: string;
  } = {}): Promise<BackupResult> {
    const type = options.type || 'FULL';
    const backupId = uuidv4();

    // Create metadata
    const metadata: BackupMetadata = {
      id: backupId,
      colonyId: this.colony.id,
      gardenerId: this.colony.config.gardenerId,
      type,
      status: 'PENDING',
      createdAt: Date.now(),
      sizeBytes: 0,
      compressed: this.config.compression.enabled,
      compressionAlgorithm: this.config.compression.enabled
        ? this.config.compression.algorithm
        : undefined,
      encrypted: this.config.encryption.enabled,
      encryptionMethod: this.config.encryption.enabled
        ? this.config.encryption.method
        : undefined,
      encryptionKeyId: this.config.encryption.keyId,
      chainBackupIds: [],
      storageBackend: this.config.storage.primary.backend,
      storageLocation: '',
      contains: this.config.content,
      checksum: '',
      checksumAlgorithm: this.config.checksumAlgorithm,
      tags: options.tags || [],
      labels: options.labels || {},
      version: '1.0.0'
    };

    try {
      // Update status
      metadata.status = 'IN_PROGRESS';
      metadata.startedAt = Date.now();

      // Get strategy
      const strategy = this.strategies.get(type);
      if (!strategy) {
        throw new Error(`Unsupported backup type: ${type}`);
      }

      // For incremental/differential, find parent
      if (type === 'INCREMENTAL' || type === 'DIFFERENTIAL') {
        const lastFull = await this.findLastFullBackup();
        if (!lastFull) {
          throw new Error('Cannot create incremental backup: no full backup found');
        }
        metadata.parentBackupId = lastFull.id;
        metadata.chainBackupIds = [...lastFull.chainBackupIds, lastFull.id];
      } else if (type === 'FULL') {
        metadata.chainBackupIds = [backupId];
      }

      this.emit('backup_started', { metadata, reason: options.reason });

      // Execute backup strategy
      const startTime = Date.now();
      const result = await strategy.execute({
        colony: this.colony,
        metadata,
        config: this.config,
        storage: this.storageBackends.get(this.config.storage.primary.backend)!
      });

      const duration = Date.now() - startTime;

      // Update metadata
      metadata.status = 'COMPLETED';
      metadata.completedAt = Date.now();
      metadata.sizeBytes = result.metrics.sizeBytes;
      metadata.compressedSizeBytes = result.metrics.compressedSizeBytes;
      metadata.duration = duration;
      metadata.throughputMBps = result.metrics.throughputMBps;
      metadata.checksum = result.metadata.checksum;
      metadata.storageLocation = result.metadata.storageLocation;
      metadata.storageChecksums = result.metadata.storageChecksums;

      result.metadata = metadata;

      // Add to history
      this.backupHistory.push(metadata);

      // Validate backup if enabled
      if (this.config.validateAfterBackup) {
        await this.validateBackup(backupId);
      }

      // Send notifications
      await this.sendNotifications('SUCCESS', metadata);

      this.emit('backup_completed', { metadata, result });

      return result;
    } catch (error) {
      metadata.status = 'FAILED';
      metadata.completedAt = Date.now();

      const result: BackupResult = {
        metadata,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          duration: 0,
          sizeBytes: 0,
          compressedSizeBytes: 0,
          compressionRatio: 1,
          throughputMBps: 0,
          agentsBackedUp: 0,
          synapsesBackedUp: 0,
          kvAnchorsBackedUp: 0,
          patternsBackedUp: 0,
          encryptionDuration: 0,
          uploadDuration: 0
        }
      };

      // Send notifications
      await this.sendNotifications('FAILURE', metadata, error);

      this.emit('backup_failed', { metadata, error });

      return result;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string, options: {
    validate?: boolean;
    dryRun?: boolean;
  } = {}): Promise<void> {
    // Find backup metadata
    const metadata = await this.findBackup(backupId);
    if (!metadata) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    this.emit('restore_started', { metadata, options });

    try {
      // Get backup data from storage
      const storage = this.storageBackends.get(metadata.storageBackend);
      if (!storage) {
        throw new Error(`Storage backend not found: ${metadata.storageBackend}`);
      }

      const backupData = await storage.retrieve(metadata.storageLocation);

      // Validate checksum if requested
      if (options.validate) {
        const isValid = await this.validateBackupData(backupData, metadata);
        if (!isValid) {
          throw new Error('Backup validation failed: checksum mismatch');
        }
      }

      // Dry run - just validate, don't restore
      if (options.dryRun) {
        this.emit('restore_dryrun_completed', { metadata });
        return;
      }

      // Perform restore
      await this.performRestore(backupData, metadata);

      this.emit('restore_completed', { metadata });
    } catch (error) {
      this.emit('restore_failed', { metadata, error });
      throw error;
    }
  }

  /**
   * List backups
   */
  async listBackups(options: BackupListOptions = {}): Promise<BackupListResult> {
    let backups = [...this.backupHistory];

    // Apply filters
    if (options.colonyId) {
      backups = backups.filter(b => b.colonyId === options.colonyId);
    }
    if (options.gardenerId) {
      backups = backups.filter(b => b.gardenerId === options.gardenerId);
    }
    if (options.type) {
      backups = backups.filter(b => b.type === options.type);
    }
    if (options.status) {
      backups = backups.filter(b => b.status === options.status);
    }
    if (options.storageBackend) {
      backups = backups.filter(b => b.storageBackend === options.storageBackend);
    }
    if (options.startDate) {
      backups = backups.filter(b => b.createdAt >= options.startDate!);
    }
    if (options.endDate) {
      backups = backups.filter(b => b.createdAt <= options.endDate!);
    }
    if (options.tags && options.tags.length > 0) {
      backups = backups.filter(b =>
        options.tags!.some(tag => b.tags.includes(tag))
      );
    }

    const totalCount = backups.length;

    // Sort
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'DESC';
    backups.sort((a, b) => {
      const aVal = a[sortBy as keyof BackupMetadata] as number;
      const bVal = b[sortBy as keyof BackupMetadata] as number;
      return sortOrder === 'ASC' ? aVal - bVal : bVal - aVal;
    });

    // Paginate
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    const paginatedBackups = backups.slice(offset, offset + limit);

    return {
      backups: paginatedBackups,
      totalCount,
      hasMore: offset + limit < totalCount
    };
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    const metadata = await this.findBackup(backupId);
    if (!metadata) {
      return false;
    }

    // Delete from storage
    const storage = this.storageBackends.get(metadata.storageBackend);
    if (!storage) {
      throw new Error(`Storage backend not found: ${metadata.storageBackend}`);
    }

    await storage.delete(metadata.storageLocation);

    // Remove from history
    this.backupHistory = this.backupHistory.filter(b => b.id !== backupId);

    this.emit('backup_deleted', { metadata });

    return true;
  }

  /**
   * Validate backup
   */
  async validateBackup(backupId: string): Promise<boolean> {
    const metadata = await this.findBackup(backupId);
    if (!metadata) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const storage = this.storageBackends.get(metadata.storageBackend);
    if (!storage) {
      throw new Error(`Storage backend not found: ${metadata.storageBackend}`);
    }

    // Check if backup exists in storage
    const exists = await storage.exists(metadata.storageLocation);
    if (!exists) {
      return false;
    }

    // Retrieve and validate checksum
    const backupData = await storage.retrieve(metadata.storageLocation);
    return this.validateBackupData(backupData, metadata);
  }

  /**
   * Get backup statistics
   */
  async getStats(): Promise<{
    totalBackups: number;
    totalSizeBytes: number;
    lastBackup?: BackupMetadata;
    lastBackupTime?: number;
    oldestBackup?: BackupMetadata;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const backups = this.backupHistory;

    return {
      totalBackups: backups.length,
      totalSizeBytes: backups.reduce((sum, b) => sum + b.sizeBytes, 0),
      lastBackup: backups[backups.length - 1],
      lastBackupTime: backups.length > 0 ? backups[backups.length - 1].createdAt : undefined,
      oldestBackup: backups[0],
      byType: backups.reduce((acc, b) => {
        acc[b.type] = (acc[b.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: backups.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Find backup by ID
   */
  private async findBackup(backupId: string): Promise<BackupMetadata | undefined> {
    return this.backupHistory.find(b => b.id === backupId);
  }

  /**
   * Find last full backup
   */
  private async findLastFullBackup(): Promise<BackupMetadata | undefined> {
    const fullBackups = this.backupHistory
      .filter(b => b.type === 'FULL' && b.status === 'COMPLETED')
      .sort((a, b) => b.createdAt - a.createdAt);

    return fullBackups[0];
  }

  /**
   * Load backup history from storage
   */
  private async loadBackupHistory(): Promise<void> {
    // Load from primary storage backend
    const storage = this.storageBackends.get(this.config.storage.primary.backend);
    if (!storage) {
      return;
    }

    try {
      const history = await storage.listBackups({ colonyId: this.colony.id });
      this.backupHistory = history;
    } catch (error) {
      this.emit('error', {
        context: 'load_backup_history',
        error
      });
    }
  }

  /**
   * Validate backup data checksum
   */
  private async validateBackupData(
    data: ColonyBackupData | IncrementalBackupData,
    metadata: BackupMetadata
  ): Promise<boolean> {
    const dataString = JSON.stringify(data);
    const hash = crypto
      .createHash(metadata.checksumAlgorithm)
      .update(dataString)
      .digest('hex');

    return hash === metadata.checksum;
  }

  /**
   * Perform restore from backup data
   */
  private async performRestore(
    data: ColonyBackupData | IncrementalBackupData,
    metadata: BackupMetadata
  ): Promise<void> {
    // Implementation depends on colony structure
    // This is a placeholder for the restore logic
    this.emit('restore_progress', { message: 'Restoring colony state' });

    // Restore agents
    if ('agents' in data) {
      for (const agent of data.agents) {
        // Restore agent state
        this.emit('agent_restored', { agentId: agent.id });
      }
    }

    // Restore other components...
  }

  /**
   * Send notifications
   */
  private async sendNotifications(
    type: 'SUCCESS' | 'FAILURE',
    metadata: BackupMetadata,
    error?: unknown
  ): Promise<void> {
    const channels = this.config.notifications.channels;

    for (const channel of channels) {
      if (!channel.enabled) continue;

      const shouldSend = type === 'SUCCESS'
        ? this.config.notifications.onSuccess
        : this.config.notifications.onFailure;

      if (!shouldSend) continue;

      try {
        await this.sendNotification(channel, type, metadata, error);
      } catch (err) {
        this.emit('notification_error', {
          channel: channel.type,
          error: err
        });
      }
    }
  }

  /**
   * Send notification to specific channel
   */
  private async sendNotification(
    channel: any,
    type: 'SUCCESS' | 'FAILURE',
    metadata: BackupMetadata,
    error?: unknown
  ): Promise<void> {
    const message = {
      type,
      backupId: metadata.id,
      colonyId: metadata.colonyId,
      backupType: metadata.type,
      status: metadata.status,
      sizeBytes: metadata.sizeBytes,
      duration: metadata.duration,
      error: error instanceof Error ? error.message : undefined,
      timestamp: Date.now()
    };

    // Implementation depends on channel type
    // This is a placeholder
    this.emit('notification_sent', { channel: channel.type, message });
  }
}

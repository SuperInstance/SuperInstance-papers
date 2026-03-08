/**
 * Incremental Backup Strategy
 * Backs up only changes since last backup
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';

import type {
  BackupMetadata,
  BackupResult,
  BackupMetrics,
  IncrementalBackupData,
  ChangeSet,
  BackupConfig
} from '../types.js';
import type { StorageBackend } from '../storage/types.js';
import type { Colony } from '../../core/colony.js';

const gzip = promisify(zlib.gzip);

export interface IncrementalBackupOptions {
  colony: Colony;
  metadata: BackupMetadata;
  config: BackupConfig;
  storage: StorageBackend;
}

/**
 * IncrementalBackupStrategy - Incremental backup implementation
 */
export class IncrementalBackupStrategy {
  private lastBackupData?: Map<string, any>;

  /**
   * Execute incremental backup
   */
  async execute(options: IncrementalBackupOptions): Promise<BackupResult> {
    const { colony, metadata, config, storage } = options;
    const startTime = Date.now();

    const metrics: BackupMetrics = {
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
    };

    try {
      // Detect changes since last backup
      const changes = await this.detectChanges(colony, metadata);

      if (changes.length === 0) {
        // No changes, return early
        metadata.status = 'COMPLETED';
        metadata.completedAt = Date.now();
        metadata.duration = Date.now() - startTime;

        return {
          metadata,
          success: true,
          warnings: ['No changes detected since last backup'],
          metrics: {
            ...metrics,
            duration: Date.now() - startTime
          }
        };
      }

      // Create incremental backup data
      const backupData: IncrementalBackupData = {
        baseBackupId: metadata.parentBackupId!,
        changes,
        timestamp: Date.now()
      };

      // Update metrics
      metrics.agentsBackedUp = changes.filter(c => c.entityType === 'AGENT').length;
      metrics.synapsesBackedUp = changes.filter(c => c.entityType === 'SYNAPSE').length;
      metrics.kvAnchorsBackedUp = changes.filter(c => c.entityType === 'KV_ANCHOR').length;
      metrics.patternsBackedUp = changes.filter(c => c.entityType === 'PATTERN').length;

      // Serialize data
      const jsonData = JSON.stringify(backupData);
      metrics.sizeBytes = Buffer.byteLength(jsonData, 'utf8');

      // Compress if enabled
      let dataToStore = Buffer.from(jsonData, 'utf8');
      const compressStart = Date.now();

      if (config.compression.enabled) {
        dataToStore = await this.compressData(
          dataToStore,
          config.compression.algorithm,
          config.compression.level
        );
        metrics.compressedSizeBytes = dataToStore.length;
        metrics.compressionRatio = metrics.sizeBytes / metrics.compressedSizeBytes;
      }

      // Calculate checksum
      const checksum = crypto
        .createHash(config.checksumAlgorithm)
        .update(dataToStore)
        .digest('hex');

      // Encrypt if enabled
      const encryptStart = Date.now();
      if (config.encryption.enabled) {
        dataToStore = await this.encryptData(dataToStore, config.encryption);
      }
      metrics.encryptionDuration = Date.now() - encryptStart;

      // Generate storage path
      const storagePath = this.generateStoragePath(metadata);

      // Upload to storage
      const uploadStart = Date.now();
      const storageChecksums = await storage.store(storagePath, dataToStore, {
        metadata: {
          colonyId: colony.id,
          backupId: metadata.id,
          backupType: 'INCREMENTAL',
          baseBackupId: metadata.parentBackupId,
          compressed: config.compression.enabled,
          encrypted: config.encryption.enabled,
          changeCount: changes.length,
          contentType: 'application/octet-stream'
        }
      });
      metrics.uploadDuration = Date.now() - uploadStart;

      // Calculate final metrics
      metrics.duration = Date.now() - startTime;
      metrics.throughputMBps = (metrics.sizeBytes / (1024 * 1024)) / (metrics.duration / 1000);

      // Update metadata
      metadata.checksum = checksum;
      metadata.storageLocation = storagePath;
      metadata.storageChecksums = storageChecksums;

      // Store current state for next incremental
      await this.storeCurrentState(colony);

      return {
        metadata,
        success: true,
        metrics
      };
    } catch (error) {
      metrics.duration = Date.now() - startTime;
      return {
        metadata,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metrics
      };
    }
  }

  /**
   * Detect changes since last backup
   */
  private async detectChanges(
    colony: Colony,
    metadata: BackupMetadata
  ): Promise<ChangeSet[]> {
    const changes: ChangeSet[] = [];
    const currentState = await this.captureCurrentState(colony);
    const previousState = this.lastBackupData;

    if (!previousState) {
      // First backup, treat all as changes
      for (const [entityId, data] of currentState.entries()) {
        changes.push({
          type: 'CREATE',
          entityType: this.inferEntityType(data),
          entityId,
          data,
          timestamp: Date.now()
        });
      }
      return changes;
    }

    // Detect new, updated, and deleted entities
    for (const [entityId, currentData] of currentState.entries()) {
      const previousData = previousState.get(entityId);

      if (!previousData) {
        // New entity
        changes.push({
          type: 'CREATE',
          entityType: this.inferEntityType(currentData),
          entityId,
          data: currentData,
          timestamp: Date.now()
        });
      } else if (!this.deepEqual(currentData, previousData)) {
        // Updated entity
        changes.push({
          type: 'UPDATE',
          entityType: this.inferEntityType(currentData),
          entityId,
          data: this.computeDiff(previousData, currentData),
          timestamp: Date.now()
        });
      }
    }

    // Detect deleted entities
    for (const [entityId] of previousState.entries()) {
      if (!currentState.has(entityId)) {
        changes.push({
          type: 'DELETE',
          entityType: 'AGENT', // Default, should be tracked properly
          entityId,
          data: {},
          timestamp: Date.now()
        });
      }
    }

    return changes;
  }

  /**
   * Capture current colony state
   */
  private async captureCurrentState(colony: Colony): Promise<Map<string, any>> {
    const state = new Map<string, any>();

    // Capture agents
    const agents = colony.getAllAgents();
    for (const agent of agents) {
      state.set(`agent:${agent.id}`, {
        type: 'AGENT',
        state: { ...agent },
        config: colony.getAgentConfig(agent.id)
      });
    }

    // Note: In a real implementation, you would capture other entities
    // like synapses, KV anchors, patterns, etc.

    return state;
  }

  /**
   * Store current state for next incremental
   */
  private async storeCurrentState(colony: Colony): Promise<void> {
    this.lastBackupData = await this.captureCurrentState(colony);
  }

  /**
   * Infer entity type from data
   */
  private inferEntityType(data: any): string {
    if (data.type) {
      const typeMap: Record<string, string> = {
        'AGENT': 'AGENT',
        'SYNAPSE': 'SYNAPSE',
        'KV_ANCHOR': 'KV_ANCHOR',
        'PATTERN': 'PATTERN',
        'VALUE_NETWORK': 'VALUE_NETWORK',
        'TILE': 'TILE'
      };
      return typeMap[data.type] || 'AGENT';
    }
    return 'AGENT';
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * Compute diff between two states
   */
  private computeDiff(previous: any, current: any): any {
    // Simple diff implementation
    // In production, use a proper diff library
    return {
      previous,
      current
    };
  }

  /**
   * Compress data
   */
  private async compressData(
    data: Buffer,
    algorithm: string,
    level: number
  ): Promise<Buffer> {
    if (algorithm === 'GZIP') {
      return Buffer.from(await gzip(data, { level }));
    }
    return data;
  }

  /**
   * Encrypt data
   */
  private async encryptData(data: Buffer, encryption: any): Promise<Buffer> {
    // Placeholder implementation
    return data;
  }

  /**
   * Generate storage path
   */
  private generateStoragePath(metadata: BackupMetadata): string {
    const date = new Date(metadata.createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `backups/${metadata.colonyId}/${year}/${month}/${day}/incremental/${metadata.id}.backup`;
  }
}

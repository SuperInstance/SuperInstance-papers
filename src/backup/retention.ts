/**
 * Retention Manager
 * Manages backup retention policies
 */

import { EventEmitter } from 'events';

import type {
  BackupMetadata,
  RetentionPolicy,
  BackupListOptions
} from './types.js';
import type { StorageBackend } from './storage/types.js';

export interface RetentionManagerConfig {
  storageBackends: Map<string, StorageBackend>;
  retention: RetentionPolicy;
}

/**
 * RetentionManager - Backup lifecycle and retention
 */
export class RetentionManager extends EventEmitter {
  private storageBackends: Map<string, StorageBackend>;
  private retention: RetentionPolicy;

  constructor(config: RetentionManagerConfig) {
    super();

    this.storageBackends = config.storageBackends;
    this.retention = config.retention;
  }

  /**
   * Apply retention policy to colony backups
   */
  async applyRetention(colonyId: string): Promise<{
    deleted: string[];
    kept: string[];
    expires: string[];
  }> {
    const result = {
      deleted: [] as string[],
      kept: [] as string[],
      expires: [] as string[]
    };

    // Get all backups for colony
    const allBackups = await this.getAllBackups(colonyId);

    // Apply retention policies
    const fullBackups = this.applyRetentionPolicy(
      allBackups.filter(b => b.type === 'FULL'),
      this.retention.full
    );
    const incrementalBackups = this.applyRetentionPolicy(
      allBackups.filter(b => b.type === 'INCREMENTAL'),
      this.retention.incremental
    );
    const differentialBackups = this.retention.differential
      ? this.applyRetentionPolicy(
          allBackups.filter(b => b.type === 'DIFFERENTIAL'),
          this.retention.differential
        )
      : [];
    const snapshots = this.applyRetentionPolicy(
      allBackups.filter(b => b.type === 'SNAPSHOT'),
      this.retention.snapshot
    );

    const allToKeep = [
      ...fullBackups.toKeep,
      ...incrementalBackups.toKeep,
      ...differentialBackups,
      ...snapshots.toKeep
    ];

    const allToDelete = [
      ...fullBackups.toDelete,
      ...incrementalBackups.toDelete,
      ...snapshots.toDelete
    ];

    // Delete expired backups
    for (const backup of allToDelete) {
      await this.deleteBackup(backup);
      result.deleted.push(backup.id);
    }

    // Track kept backups
    for (const backup of allToKeep) {
      result.kept.push(backup.id);

      // Check if backup will expire soon
      if (backup.expiresAt && backup.expiresAt < Date.now() + 7 * 24 * 60 * 60 * 1000) {
        result.expires.push(backup.id);
      }
    }

    this.emit('retention_applied', {
      colonyId,
      deletedCount: result.deleted.length,
      keptCount: result.kept.length,
      expiresCount: result.expires.length
    });

    return result;
  }

  /**
   * Apply retention policy to a set of backups
   */
  private applyRetentionPolicy(
    backups: BackupMetadata[],
    policy: { count: number; age?: number; minAge?: number }
  ): { toKeep: BackupMetadata[]; toDelete: BackupMetadata[] } {
    const now = Date.now();
    const sortedBackups = [...backups].sort((a, b) => b.createdAt - a.createdAt);

    const toKeep: BackupMetadata[] = [];
    const toDelete: BackupMetadata[] = [];

    for (const backup of sortedBackups) {
      const age = now - backup.createdAt;
      const isTooOld = policy.age ? age > policy.age : false;
      const isTooYoung = policy.minAge ? age < policy.minAge : false;
      const isBeyondCount = toKeep.length >= policy.count;

      if (isTooYoung) {
        // Too young to delete, keep it
        toKeep.push(backup);
      } else if (isTooOld || isBeyondCount) {
        // Delete if old enough
        if (!backup.expiresAt || backup.expiresAt < now) {
          toDelete.push(backup);
        } else {
          // Keep if not expired yet
          toKeep.push(backup);
        }
      } else {
        // Keep within retention limits
        toKeep.push(backup);
      }
    }

    return { toKeep, toDelete };
  }

  /**
   * Get all backups for a colony
   */
  private async getAllBackups(colonyId: string): Promise<BackupMetadata[]> {
    const allBackups: BackupMetadata[] = [];

    for (const [name, storage] of this.storageBackends) {
      try {
        const backups = await storage.listBackups({ colonyId });
        allBackups.push(...backups);
      } catch (error) {
        this.emit('error', {
          context: 'get_backups',
          storage: name,
          error
        });
      }
    }

    return allBackups;
  }

  /**
   * Delete a backup
   */
  private async deleteBackup(backup: BackupMetadata): Promise<void> {
    const storage = this.storageBackends.get(backup.storageBackend);
    if (!storage) {
      this.emit('error', {
        context: 'delete_backup',
        backupId: backup.id,
        error: `Storage backend not found: ${backup.storageBackend}`
      });
      return;
    }

    try {
      await storage.delete(backup.storageLocation);
      this.emit('backup_deleted', { backupId: backup.id });
    } catch (error) {
      this.emit('error', {
        context: 'delete_backup',
        backupId: backup.id,
        error
      });
    }
  }

  /**
   * Update backup expiration
   */
  async updateExpiration(backupId: string, expiresAt: number): Promise<boolean> {
    // This would update the backup metadata
    // Implementation depends on storage backend
    this.emit('expiration_updated', { backupId, expiresAt });
    return true;
  }

  /**
   * Get retention summary
   */
  async getRetentionSummary(colonyId: string): Promise<{
    byType: Record<string, { total: number; kept: number; expired: number; expiring: number }>;
    totalSizeBytes: number;
    reclaimableBytes: number;
  }> {
    const allBackups = await this.getAllBackups(colonyId);
    const now = Date.now();

    const byType: Record<string, { total: number; kept: number; expired: number; expiring: number }> = {};
    let totalSizeBytes = 0;
    let reclaimableBytes = 0;

    for (const backup of allBackups) {
      if (!byType[backup.type]) {
        byType[backup.type] = { total: 0, kept: 0, expired: 0, expiring: 0 };
      }

      byType[backup.type].total++;
      totalSizeBytes += backup.sizeBytes;

      if (backup.expiresAt && backup.expiresAt < now) {
        byType[backup.type].expired++;
        reclaimableBytes += backup.sizeBytes;
      } else if (backup.expiresAt && backup.expiresAt < now + 7 * 24 * 60 * 60 * 1000) {
        byType[backup.type].expiring++;
      } else {
        byType[backup.type].kept++;
      }
    }

    return {
      byType,
      totalSizeBytes,
      reclaimableBytes
    };
  }
}

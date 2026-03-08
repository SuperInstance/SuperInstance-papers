/**
 * Backup CLI Handler
 * Handles CLI backup operations
 */

import type { BackupManager } from '../../backup/backup-manager.js';
import type { RestoreManager } from '../../restore/restore-manager.js';

// Mock handlers - in production these would use actual managers
let backupManager: BackupManager | null = null;
let restoreManager: RestoreManager | null = null;

export async function backupCreate(options: {
  type: string;
  tags: string[];
  labels: string[];
  reason?: string;
  validate: boolean;
}) {
  if (!backupManager) {
    throw new Error('Backup manager not initialized');
  }

  return await backupManager.createBackup({
    type: options.type as any,
    tags: options.tags,
    labels: Object.fromEntries(options.labels.map(l => l.split(':'))),
    reason: options.reason
  });
}

export async function backupList(options: {
  type?: string;
  status?: string;
  storageBackend?: string;
  limit: number;
}) {
  if (!backupManager) {
    throw new Error('Backup manager not initialized');
  }

  const result = await backupManager.listBackups({
    type: options.type as any,
    status: options.status as any,
    storageBackend: options.storageBackend as any,
    limit: options.limit
  });

  return result;
}

export async function backupRestore(
  backupId: string,
  options: {
    mode: string;
    validate: boolean;
    force: boolean;
    dryRun: boolean;
    components?: string[];
    targetColonyId?: string;
  }
) {
  if (!restoreManager) {
    throw new Error('Restore manager not initialized');
  }

  const restoreOptions: any = {
    mode: options.mode as any,
    backupId,
    validate: options.validate,
    force: options.force,
    dryRun: options.dryRun
  };

  if (options.components) {
    restoreOptions.components = options.components.map(c => ({
      type: c,
      restore: true
    }));
  }

  if (options.targetColonyId) {
    restoreOptions.targetColonyId = options.targetColonyId;
  }

  return await restoreManager.executeRestore(restoreOptions);
}

export function setBackupManager(manager: BackupManager) {
  backupManager = manager;
}

export function setRestoreManager(manager: RestoreManager) {
  restoreManager = manager;
}

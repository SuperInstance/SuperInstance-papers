/**
 * Local Filesystem Storage Backend
 * Stores backups on local filesystem
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

import type {
  StorageBackend,
  StoreOptions,
  StorageInfo,
  LocalStorageConfig
} from './types.js';
import type { BackupMetadata, BackupListOptions } from '../types.js';

/**
 * LocalStorage - Filesystem backup storage
 */
export class LocalStorage implements StorageBackend {
  private config: LocalStorageConfig;
  private metadataCache: Map<string, BackupMetadata>;

  constructor(config: LocalStorageConfig) {
    this.config = {
      createMissingDirectories: true,
      fileMode: 0o644,
      directoryMode: 0o755,
      ...config
    };
    this.metadataCache = new Map();
  }

  /**
   * Store backup data
   */
  async store(location: string, data: Buffer, options: StoreOptions): Promise<Record<string, string>> {
    const fullPath = path.join(this.config.basePath, location);

    // Create directory if needed
    if (this.config.createMissingDirectories) {
      await fs.mkdir(path.dirname(fullPath), { recursive: true, mode: this.config.directoryMode });
    }

    // Write data
    await fs.writeFile(fullPath, data, { mode: this.config.fileMode });

    // Calculate checksums
    const checksums: Record<string, string> = {
      sha256: crypto.createHash('sha256').update(data).digest('hex'),
      md5: crypto.createHash('md5').update(data).digest('hex')
    };

    // Store metadata alongside backup
    const metadataPath = fullPath + '.meta';
    await fs.writeFile(metadataPath, JSON.stringify({
      ...options.metadata,
      checksums,
      storedAt: Date.now()
    }, null, 2));

    return checksums;
  }

  /**
   * Retrieve backup data
   */
  async retrieve(location: string): Promise<Buffer> {
    const fullPath = path.join(this.config.basePath, location);
    return await fs.readFile(fullPath);
  }

  /**
   * Delete backup data
   */
  async delete(location: string): Promise<void> {
    const fullPath = path.join(this.config.basePath, location);

    // Delete metadata file
    try {
      await fs.unlink(fullPath + '.meta');
    } catch {
      // Ignore if metadata doesn't exist
    }

    // Delete backup file
    await fs.unlink(fullPath);

    // Try to delete empty directories
    try {
      const dir = path.dirname(fullPath);
      await fs.rmdir(dir);
    } catch {
      // Ignore if directory not empty
    }
  }

  /**
   * Check if backup exists
   */
  async exists(location: string): Promise<boolean> {
    const fullPath = path.join(this.config.basePath, location);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List backups
   */
  async listBackups(options: BackupListOptions): Promise<BackupMetadata[]> {
    const backups: BackupMetadata[] = [];

    // Recursively scan backup directory
    const backupsPath = path.join(this.config.basePath, 'backups');
    await this.scanDirectory(backupsPath, backups, options);

    return backups;
  }

  /**
   * Recursively scan directory for backups
   */
  private async scanDirectory(
    dirPath: string,
    backups: BackupMetadata[],
    options: BackupListOptions
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, backups, options);
        } else if (entry.isFile() && entry.name.endsWith('.meta')) {
          try {
            const metadataContent = await fs.readFile(fullPath, 'utf-8');
            const metadata = JSON.parse(metadataContent) as BackupMetadata;

            // Apply filters
            if (options.colonyId && metadata.colonyId !== options.colonyId) {
              continue;
            }
            if (options.gardenerId && metadata.gardenerId !== options.gardenerId) {
              continue;
            }
            if (options.type && metadata.type !== options.type) {
              continue;
            }
            if (options.status && metadata.status !== options.status) {
              continue;
            }

            backups.push(metadata);
          } catch (error) {
            // Skip invalid metadata files
          }
        }
      }
    } catch {
      // Directory doesn't exist or isn't accessible
    }
  }

  /**
   * Get storage info
   */
  async getStorageInfo(): Promise<StorageInfo> {
    let usedBytes = 0;
    let fileCount = 0;

    try {
      const backupsPath = path.join(this.config.basePath, 'backups');
      await this.calculateDirectorySize(backupsPath, usedBytes, fileCount);
    } catch {
      // Path doesn't exist yet
    }

    return {
      backend: 'LOCAL',
      connected: true,
      location: this.config.basePath,
      usedBytes,
      availableBytes: undefined // Cannot determine on local filesystem
    };
  }

  /**
   * Calculate directory size
   */
  private async calculateDirectorySize(
    dirPath: string,
    size: number,
    count: number
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.calculateDirectorySize(fullPath, size, count);
        } else if (entry.isFile() && !entry.name.endsWith('.meta')) {
          const stats = await fs.stat(fullPath);
          size += stats.size;
          count++;
        }
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await fs.access(this.config.basePath, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}

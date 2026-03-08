/**
 * Google Cloud Storage Backend
 * Stores backups in GCS
 */

import * as crypto from 'crypto';

import type {
  StorageBackend,
  StoreOptions,
  StorageInfo,
  GCSStorageConfig
} from './types.js';
import type { BackupMetadata, BackupListOptions } from '../types.js';

/**
 * GCSStorage - Google Cloud Storage backup storage
 */
export class GCSStorage implements StorageBackend {
  private config: GCSStorageConfig;
  private bucket: any; // @google-cloud/storage Bucket

  constructor(config: GCSStorageConfig) {
    this.config = config;
    this.initializeClient();
  }

  /**
   * Initialize GCS client
   */
  private async initializeClient(): Promise<void> {
    // Lazy load GCS SDK
    // const { Storage } = await import('@google-cloud/storage');
    // const storage = new Storage(this.config);
    // this.bucket = storage.bucket(this.config.bucket);
    this.bucket = null; // Placeholder
  }

  /**
   * Store backup data
   */
  async store(location: string, data: Buffer, options: StoreOptions): Promise<Record<string, string>> {
    const key = this.getKey(location);

    // Calculate checksums
    const checksums: Record<string, string> = {
      sha256: crypto.createHash('sha256').update(data).digest('hex'),
      md5: crypto.createHash('md5').update(data).digest('hex')
    };

    // Upload to GCS
    const file = this.bucket.file(key);

    await file.save(data, {
      metadata: {
        ...options.metadata,
        checksums
      },
      contentType: options.metadata.contentType
    });

    return checksums;
  }

  /**
   * Retrieve backup data
   */
  async retrieve(location: string): Promise<Buffer> {
    const key = this.getKey(location);
    const file = this.bucket.file(key);

    const [data] = await file.download();
    return data;
  }

  /**
   * Delete backup data
   */
  async delete(location: string): Promise<void> {
    const key = this.getKey(location);
    const file = this.bucket.file(key);

    await file.delete();
  }

  /**
   * Check if backup exists
   */
  async exists(location: string): Promise<boolean> {
    const key = this.getKey(location);
    const file = this.bucket.file(key);

    const [exists] = await file.exists();
    return exists;
  }

  /**
   * List backups
   */
  async listBackups(options: BackupListOptions): Promise<BackupMetadata[]> {
    const backups: BackupMetadata[] = [];
    const prefix = options.colonyId ? `backups/${options.colonyId}/` : 'backups/';

    const [files] = await this.bucket.getFiles({
      prefix: this.getKey(prefix)
    });

    for (const file of files) {
      if (file.name.endsWith('.meta')) {
        try {
          const [data] = await file.download();
          const metadata = JSON.parse(data.toString()) as BackupMetadata;

          if (this.matchesFilters(metadata, options)) {
            backups.push(metadata);
          }
        } catch {
          // Skip invalid metadata
        }
      }
    }

    return backups;
  }

  /**
   * Get storage info
   */
  async getStorageInfo(): Promise<StorageInfo> {
    try {
      const [files] = await this.bucket.getFiles();

      let totalBytes = 0;
      for (const file of files) {
        totalBytes += file.metadata.size || 0;
      }

      return {
        backend: 'GCS',
        connected: true,
        location: `gs://${this.config.bucket}/${this.config.prefix || ''}`,
        usedBytes: totalBytes,
        availableBytes: undefined // GCS has unlimited storage
      };
    } catch {
      return {
        backend: 'GCS',
        connected: false
      };
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.bucket.exists();
      return true;
    } catch {
      return false;
    }
  }

  private matchesFilters(metadata: BackupMetadata, options: BackupListOptions): boolean {
    if (options.colonyId && metadata.colonyId !== options.colonyId) return false;
    if (options.gardenerId && metadata.gardenerId !== options.gardenerId) return false;
    if (options.type && metadata.type !== options.type) return false;
    if (options.status && metadata.status !== options.status) return false;
    if (options.startDate && metadata.createdAt < options.startDate) return false;
    if (options.endDate && metadata.createdAt > options.endDate) return false;
    return true;
  }

  private getKey(location: string): string {
    return this.config.prefix
      ? `${this.config.prefix}/${location}`
      : location;
  }
}

/**
 * Azure Blob Storage Backend
 * Stores backups in Azure Blob Storage
 */

import * as crypto from 'crypto';

import type {
  StorageBackend,
  StoreOptions,
  StorageInfo,
  AzureStorageConfig
} from './types.js';
import type { BackupMetadata, BackupListOptions } from '../types.js';

/**
 * AzureStorage - Azure Blob Storage backup storage
 */
export class AzureStorage implements StorageBackend {
  private config: AzureStorageConfig;
  private containerClient: any; // ContainerClient from @azure/storage-blob

  constructor(config: AzureStorageConfig) {
    this.config = config;
    this.initializeClient();
  }

  /**
   * Initialize Azure client
   */
  private async initializeClient(): Promise<void> {
    // Lazy load Azure SDK
    // const { BlobServiceClient } = await import('@azure/storage-blob');
    // const blobServiceClient = BlobServiceClient.fromConnectionString(this.config.connectionString);
    // this.containerClient = blobServiceClient.getContainerClient(this.config.container);
    this.containerClient = null; // Placeholder
  }

  /**
   * Store backup data
   */
  async store(location: string, data: Buffer, options: StoreOptions): Promise<Record<string, string>> {
    const blobName = this.getBlobName(location);

    // Calculate checksums
    const checksums: Record<string, string> = {
      sha256: crypto.createHash('sha256').update(data).digest('hex'),
      md5: crypto.createHash('md5').update(data).digest('hex')
    };

    // Upload to Azure
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(data, data.length, {
      metadata: {
        ...options.metadata,
        sha256: checksums.sha256,
        md5: checksums.md5
      },
      blobHTTPHeaders: {
        blobContentType: options.metadata.contentType
      }
    });

    return checksums;
  }

  /**
   * Retrieve backup data
   */
  async retrieve(location: string): Promise<Buffer> {
    const blobName = this.getBlobName(location);
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    const response = await blockBlobClient.download();
    const buffers: Buffer[] = [];

    for await (const chunk of response.readableStreamBody) {
      buffers.push(chunk);
    }

    return Buffer.concat(buffers);
  }

  /**
   * Delete backup data
   */
  async delete(location: string): Promise<void> {
    const blobName = this.getBlobName(location);
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
  }

  /**
   * Check if backup exists
   */
  async exists(location: string): Promise<boolean> {
    const blobName = this.getBlobName(location);
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    return await blockBlobClient.exists();
  }

  /**
   * List backups
   */
  async listBackups(options: BackupListOptions): Promise<BackupMetadata[]> {
    const backups: BackupMetadata[] = [];
    const prefix = options.colonyId ? `backups/${options.colonyId}/` : 'backups/';

    for await (const blob of this.containerClient.listBlobsFlat({
      prefix: this.getBlobName(prefix)
    })) {
      if (blob.name.endsWith('.meta')) {
        try {
          const blockBlobClient = this.containerClient.getBlockBlobClient(blob.name);
          const response = await blockBlobClient.download();

          const buffers: Buffer[] = [];
          for await (const chunk of response.readableStreamBody) {
            buffers.push(chunk);
          }

          const metadata = JSON.parse(Buffer.concat(buffers).toString()) as BackupMetadata;

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
      let totalBytes = 0;
      let blobCount = 0;

      for await (const blob of this.containerClient.listBlobsFlat()) {
        totalBytes += blob.properties.contentLength || 0;
        blobCount++;
      }

      return {
        backend: 'AZURE',
        connected: true,
        location: `https://${this.config.accountName}.blob.core.windows.net/${this.config.container}/${this.config.prefix || ''}`,
        usedBytes: totalBytes,
        availableBytes: undefined // Azure has unlimited storage
      };
    } catch {
      return {
        backend: 'AZURE',
        connected: false
      };
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.containerClient.exists();
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

  private getBlobName(location: string): string {
    return this.config.prefix
      ? `${this.config.prefix}/${location}`
      : location;
  }
}

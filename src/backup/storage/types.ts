/**
 * Storage Backend Types
 * Abstraction layer for backup storage
 */

import type { BackupMetadata, BackupListOptions } from '../types.js';

export interface StorageBackend {
  /**
   * Store backup data
   */
  store(location: string, data: Buffer, options: StoreOptions): Promise<Record<string, string>>;

  /**
   * Retrieve backup data
   */
  retrieve(location: string): Promise<Buffer>;

  /**
   * Delete backup data
   */
  delete(location: string): Promise<void>;

  /**
   * Check if backup exists
   */
  exists(location: string): Promise<boolean>;

  /**
   * List backups
   */
  listBackups(options: BackupListOptions): Promise<BackupMetadata[]>;

  /**
   * Get storage info
   */
  getStorageInfo(): Promise<StorageInfo>;

  /**
   * Test connection
   */
  testConnection(): Promise<boolean>;
}

export interface StoreOptions {
  metadata: {
    colonyId: string;
    backupId: string;
    backupType: string;
    compressed: boolean;
    encrypted: boolean;
    isSnapshot?: boolean;
    contentType: string;
    [key: string]: any;
  };
}

export interface StorageInfo {
  backend: string;
  connected: boolean;
  totalBytes?: number;
  usedBytes?: number;
  availableBytes?: number;
  location?: string;
}

// ============================================================================
// Local Storage Config
// ============================================================================

export interface LocalStorageConfig {
  basePath: string;
  createMissingDirectories?: boolean;
  fileMode?: number;
  directoryMode?: number;
}

// ============================================================================
// S3 Storage Config
// ============================================================================

export interface S3StorageConfig {
  region: string;
  bucket: string;
  prefix?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  endpoint?: string; // For S3-compatible services
  forcePathStyle?: boolean;
  maxConcurrentUploads?: number;
  multipartUploadThreshold?: number; // bytes
  multipartChunkSize?: number; // bytes
}

// ============================================================================
// GCS Storage Config
// ============================================================================

export interface GCSStorageConfig {
  bucket: string;
  prefix?: string;
  keyFilename?: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
  projectId?: string;
}

// ============================================================================
// Azure Storage Config
// ============================================================================

export interface AzureStorageConfig {
  connectionString?: string;
  accountName?: string;
  accountKey?: string;
  sasToken?: string;
  container: string;
  prefix?: string;
}

// ============================================================================
// Database Storage Config
// ============================================================================

export interface DatabaseStorageConfig {
  connectionString: string;
  table: string;
  schema?: string;
  poolSize?: number;
  connectionTimeout?: number;
}

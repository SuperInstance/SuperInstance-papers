/**
 * Storage Backend Factory
 * Creates storage backend instances
 */

import { LocalStorage } from './local.js';
import { S3Storage } from './s3.js';
import { GCSStorage } from './gcs.js';
import { AzureStorage } from './azure.js';
import type {
  StorageBackend,
  LocalStorageConfig,
  S3StorageConfig,
  GCSStorageConfig,
  AzureStorageConfig,
  DatabaseStorageConfig
} from './types.js';

export type {
  StorageBackend,
  StoreOptions,
  StorageInfo,
  LocalStorageConfig,
  S3StorageConfig,
  GCSStorageConfig,
  AzureStorageConfig,
  DatabaseStorageConfig
};

/**
 * Create storage backend from config
 */
export function createStorageBackend(config: {
  backend: 'LOCAL' | 'S3' | 'GCS' | 'AZURE' | 'DATABASE';
  config: LocalStorageConfig | S3StorageConfig | GCSStorageConfig | AzureStorageConfig | DatabaseStorageConfig;
}): StorageBackend {
  switch (config.backend) {
    case 'LOCAL':
      return new LocalStorage(config.config as LocalStorageConfig);
    case 'S3':
      return new S3Storage(config.config as S3StorageConfig);
    case 'GCS':
      return new GCSStorage(config.config as GCSStorageConfig);
    case 'AZURE':
      return new AzureStorage(config.config as AzureStorageConfig);
    // case 'DATABASE':
    //   return new DatabaseStorage(config.config as DatabaseStorageConfig);
    default:
      throw new Error(`Unsupported storage backend: ${config.backend}`);
  }
}

export { LocalStorage, S3Storage, GCSStorage, AzureStorage };

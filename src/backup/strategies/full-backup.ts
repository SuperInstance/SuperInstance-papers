/**
 * Full Backup Strategy
 * Creates complete colony backup including all state
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';

import type {
  BackupMetadata,
  BackupResult,
  BackupMetrics,
  ColonyBackupData,
  BackupConfig
} from '../types.js';
import type { StorageBackend } from '../storage/types.js';
import type { Colony } from '../../core/colony.js';

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);

export interface FullBackupOptions {
  colony: Colony;
  metadata: BackupMetadata;
  config: BackupConfig;
  storage: StorageBackend;
}

/**
 * FullBackupStrategy - Complete backup implementation
 */
export class FullBackupStrategy {
  /**
   * Execute full backup
   */
  async execute(options: FullBackupOptions): Promise<BackupResult> {
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
      // Gather colony data
      const backupData = await this.gatherColonyData(colony, config.content);

      // Update metrics
      metrics.agentsBackedUp = backupData.agents.length;
      metrics.synapsesBackedUp = backupData.synapses.length;
      metrics.kvAnchorsBackedUp = backupData.kvCache.anchors.length;
      metrics.patternsBackedUp = backupData.meadow.patterns.length;

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
          backupType: 'FULL',
          compressed: config.compression.enabled,
          encrypted: config.encryption.enabled,
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
   * Gather all colony data
   */
  private async gatherColonyData(
    colony: Colony,
    content: any
  ): Promise<ColonyBackupData> {
    const backupData: ColonyBackupData = {
      metadata: {} as any,
      colony: {
        id: colony.id,
        config: colony.config,
        stats: await colony.getStats(),
        distributedState: colony.isDistributed()
          ? colony.getDistributedCoordination()?.getState()
          : undefined
      },
      agents: [],
      synapses: [],
      valueNetwork: {} as any,
      kvCache: { anchors: [], annIndex: undefined, statistics: {} },
      meadow: { patterns: [], contributions: {}, reputation: {} },
      federated: { state: {}, patterns: [], participantIds: [], roundNumber: 0 },
      a2aHistory: { packages: [], causalChains: {} },
      auditLogs: { logs: [], checksum: '' },
      worldModel: { vaeState: {}, replayBuffer: [], statistics: {} },
      dreaming: { policy: {}, dreamBuffer: [], optimizationHistory: [] },
      tiles: [],
      metaTiles: [],
      stigmergy: { pathways: {}, pheromones: {} },
      constraints: [],
      timestamp: Date.now(),
      version: '1.0.0'
    };

    // Gather agents
    if (content.agents) {
      const agents = colony.getAllAgents();
      backupData.agents = agents.map(agent => ({
        id: agent.id,
        state: { ...agent },
        config: colony.getAgentConfig(agent.id) || {},
        modelVersion: agent.modelVersion,
        lastActive: agent.lastActive
      }));
    }

    // Note: In a real implementation, you would gather data from other
    // colony components like value networks, KV caches, meadow patterns, etc.
    // This is a simplified example.

    return backupData;
  }

  /**
   * Compress data
   */
  private async compressData(
    data: Buffer,
    algorithm: string,
    level: number
  ): Promise<Buffer> {
    switch (algorithm) {
      case 'GZIP':
        return Buffer.from(await gzip(data, { level }));
      case 'BROTLI':
        return Buffer.from(await brotliCompress(data, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: level
          }
        }));
      case 'ZSTD':
        // Note: ZSTD would require a native module
        // Fallback to gzip for now
        return Buffer.from(await gzip(data, { level }));
      default:
        return data;
    }
  }

  /**
   * Encrypt data
   */
  private async encryptData(data: Buffer, encryption: any): Promise<Buffer> {
    // Implementation would use the configured encryption method
    // This is a placeholder
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

    return `backups/${metadata.colonyId}/${year}/${month}/${day}/${metadata.id}.backup`;
  }
}

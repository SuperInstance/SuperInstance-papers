/**
 * Snapshot Backup Strategy
 * Creates point-in-time snapshots for quick rollback
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

export interface SnapshotBackupOptions {
  colony: Colony;
  metadata: BackupMetadata;
  config: BackupConfig;
  storage: StorageBackend;
}

/**
 * SnapshotBackupStrategy - Point-in-time snapshot implementation
 */
export class SnapshotBackupStrategy {
  /**
   * Execute snapshot backup
   */
  async execute(options: SnapshotBackupOptions): Promise<BackupResult> {
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
      // Gather colony data (same as full backup but optimized for speed)
      const backupData = await this.gatherColonySnapshot(colony, config.content);

      // Update metrics
      metrics.agentsBackedUp = backupData.agents.length;
      metrics.synapsesBackedUp = backupData.synapses.length;
      metrics.kvAnchorsBackedUp = backupData.kvCache.anchors.length;
      metrics.patternsBackedUp = backupData.meadow.patterns.length;

      // Serialize data
      const jsonData = JSON.stringify(backupData);
      metrics.sizeBytes = Buffer.byteLength(jsonData, 'utf8');

      // Compress if enabled (use faster compression for snapshots)
      let dataToStore = Buffer.from(jsonData, 'utf8');
      const compressStart = Date.now();

      if (config.compression.enabled) {
        // Use lower compression level for faster snapshots
        const snapshotLevel = Math.min(3, config.compression.level);
        dataToStore = await this.compressData(
          dataToStore,
          config.compression.algorithm,
          snapshotLevel
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

      // Generate storage path (snapups go in a separate location)
      const storagePath = this.generateStoragePath(metadata);

      // Upload to storage
      const uploadStart = Date.now();
      const storageChecksums = await storage.store(storagePath, dataToStore, {
        metadata: {
          colonyId: colony.id,
          backupId: metadata.id,
          backupType: 'SNAPSHOT',
          compressed: config.compression.enabled,
          encrypted: config.encryption.enabled,
          isSnapshot: true,
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
   * Gather colony snapshot (optimized for speed)
   */
  private async gatherColonySnapshot(
    colony: Colony,
    content: any
  ): Promise<ColonyBackupData> {
    // Snapshots prioritize speed over completeness
    // Skip heavy data like audit logs, A2A history

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
      a2aHistory: { packages: [], causalChains: {} }, // Empty for snapshots
      auditLogs: { logs: [], checksum: '' }, // Empty for snapshots
      worldModel: { vaeState: {}, replayBuffer: [], statistics: {} },
      dreaming: { policy: {}, dreamBuffer: [], optimizationHistory: [] },
      tiles: [],
      metaTiles: [],
      stigmergy: { pathways: {}, pheromones: {} },
      constraints: [],
      timestamp: Date.now(),
      version: '1.0.0'
    };

    // Gather agents (critical for quick restore)
    if (content.agents) {
      const agents = colony.getAllAgents();
      backupData.agents = agents.map(agent => ({
        id: agent.id,
        state: {
          id: agent.id,
          typeId: agent.typeId,
          status: agent.status,
          valueFunction: agent.valueFunction,
          modelVersion: agent.modelVersion
        },
        config: colony.getAgentConfig(agent.id) || {},
        modelVersion: agent.modelVersion,
        lastActive: agent.lastActive
      }));
    }

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
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `backups/${metadata.colonyId}/${year}/${month}/${day}/snapshots/${hours}${minutes}-${metadata.id}.backup`;
  }
}

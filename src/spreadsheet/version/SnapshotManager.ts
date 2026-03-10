/**
 * Snapshot Manager for Spreadsheet Version Control
 *
 * Creates, stores, and manages spreadsheet snapshots with compression
 * and garbage collection for large-scale spreadsheets.
 */

import {
  SheetSnapshot,
  CellValue,
  SheetMetadata,
  VersionConfig,
  CompressedDelta
} from './types';
import { DeltaManager, CellDelta } from './DeltaManager';

/**
 * Manages snapshot lifecycle and storage
 */
export class SnapshotManager {
  private snapshots: Map<string, SheetSnapshot>;
  private deltaManager: DeltaManager;
  private config: VersionConfig;

  constructor(config: VersionConfig = {}) {
    this.snapshots = new Map();
    this.deltaManager = new DeltaManager(
      config.enableCompression ?? true,
      config.compressionAlgorithm
    );
    this.config = config;
  }

  /**
   * Create a full snapshot of spreadsheet state
   */
  createSnapshot(
    cells: Map<string, CellValue>,
    metadata: SheetMetadata,
    versionId: string
  ): SheetSnapshot {
    const snapshot: SheetSnapshot = {
      id: this.generateId(),
      versionId,
      cells: new Map(cells),
      metadata: { ...metadata },
      timestamp: Date.now()
    };

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  /**
   * Create an incremental snapshot using delta from parent
   */
  async createIncrementalSnapshot(
    parentSnapshot: SheetSnapshot,
    currentCells: Map<string, CellValue>,
    metadata: SheetMetadata,
    versionId: string
  ): Promise<{ snapshot: SheetSnapshot; delta: CompressedDelta }> {
    // Create temporary snapshot for delta computation
    const tempSnapshot: SheetSnapshot = {
      id: 'temp',
      versionId,
      cells: currentCells,
      metadata,
      timestamp: Date.now()
    };

    // Compute delta
    const deltas = this.deltaManager.computeDelta(
      parentSnapshot,
      tempSnapshot
    );

    // Compress delta
    const compressedDelta = await this.deltaManager.compressDeltas(deltas);

    // Create new snapshot
    const snapshot: SheetSnapshot = {
      id: this.generateId(),
      versionId,
      cells: new Map(currentCells),
      metadata: { ...metadata },
      timestamp: Date.now()
    };

    this.snapshots.set(snapshot.id, snapshot);

    return { snapshot, delta: compressedDelta };
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(snapshotId: string): SheetSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Get snapshot by version ID
   */
  getSnapshotByVersion(versionId: string): SheetSnapshot | undefined {
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.versionId === versionId) {
        return snapshot;
      }
    }
    return undefined;
  }

  /**
   * Reconstruct snapshot from base snapshot and deltas
   */
  async reconstructSnapshot(
    baseSnapshot: SheetSnapshot,
    deltas: CompressedDelta[]
  ): Promise<SheetSnapshot> {
    let currentSnapshot = { ...baseSnapshot };

    for (const compressedDelta of deltas) {
      const decompressedDeltas = await this.deltaManager.decompressDelta(compressedDelta);
      currentSnapshot = this.deltaManager.applyDelta(
        currentSnapshot,
        decompressedDeltas
      );
    }

    return currentSnapshot;
  }

  /**
   * List all snapshots
   */
  listSnapshots(): SheetSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Delete snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    return this.snapshots.delete(snapshotId);
  }

  /**
   * Get snapshot size in bytes (estimate)
   */
  getSnapshotSize(snapshot: SheetSnapshot): number {
    let size = 0;

    // Estimate metadata size
    size += JSON.stringify(snapshot.metadata).length;

    // Estimate cells size
    for (const [coord, cell] of snapshot.cells) {
      size += coord.length;
      size += JSON.stringify(cell).length;
    }

    return size;
  }

  /**
   * Get total storage used by all snapshots
   */
  getTotalStorageSize(): number {
    let total = 0;
    for (const snapshot of this.snapshots.values()) {
      total += this.getSnapshotSize(snapshot);
    }
    return total;
  }

  /**
   * Compress snapshot (for long-term storage)
   */
  async compressSnapshot(snapshot: SheetSnapshot): Promise<CompressedSnapshot> {
    const jsonString = JSON.stringify({
      id: snapshot.id,
      versionId: snapshot.versionId,
      cells: Array.from(snapshot.cells.entries()),
      metadata: snapshot.metadata,
      timestamp: snapshot.timestamp
    });

    const originalSize = Buffer.byteLength(jsonString, 'utf8');
    let compressedData: Buffer;

    if (this.config.enableCompression) {
      switch (this.config.compressionAlgorithm) {
        case 'gzip':
          compressedData = await this.gzipCompress(jsonString);
          break;
        case 'brotli':
          compressedData = await this.brotliCompress(jsonString);
          break;
        default:
          compressedData = Buffer.from(jsonString);
      }
    } else {
      compressedData = Buffer.from(jsonString);
    }

    return {
      snapshotId: snapshot.id,
      data: compressedData,
      algorithm: this.config.compressionAlgorithm || 'none',
      originalSize,
      compressedSize: compressedData.length
    };
  }

  /**
   * Decompress snapshot
   */
  async decompressSnapshot(compressed: CompressedSnapshot): Promise<SheetSnapshot> {
    let jsonString: string;

    switch (compressed.algorithm) {
      case 'gzip':
        jsonString = await this.gzipDecompress(compressed.data);
        break;
      case 'brotli':
        jsonString = await this.brotliDecompress(compressed.data);
        break;
      case 'none':
        jsonString = compressed.data.toString('utf8');
        break;
      default:
        throw new Error(`Unsupported algorithm: ${compressed.algorithm}`);
    }

    const data = JSON.parse(jsonString);
    return {
      id: data.id,
      versionId: data.versionId,
      cells: new Map(data.cells),
      metadata: data.metadata,
      timestamp: data.timestamp
    };
  }

  /**
   * Garbage collect old snapshots based on configuration
   */
  garbageCollect(keepVersions: Set<string>): number {
    let collected = 0;
    const toDelete: string[] = [];

    for (const [id, snapshot] of this.snapshots) {
      if (!keepVersions.has(snapshot.versionId)) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      if (this.snapshots.delete(id)) {
        collected++;
      }
    }

    return collected;
  }

  /**
   * Create snapshot checksum for integrity verification
   */
  createChecksum(snapshot: SheetSnapshot): string {
    const crypto = require('crypto');
    const data = JSON.stringify({
      cells: Array.from(snapshot.cells.entries()).sort(),
      metadata: snapshot.metadata,
      timestamp: snapshot.timestamp
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify snapshot integrity
   */
  verifyChecksum(snapshot: SheetSnapshot, checksum: string): boolean {
    return this.createChecksum(snapshot) === checksum;
  }

  /**
   * Export snapshot to JSON
   */
  exportSnapshot(snapshot: SheetSnapshot): string {
    return JSON.stringify({
      id: snapshot.id,
      versionId: snapshot.versionId,
      cells: Array.from(snapshot.cells.entries()),
      metadata: snapshot.metadata,
      timestamp: snapshot.timestamp,
      checksum: this.createChecksum(snapshot)
    }, null, 2);
  }

  /**
   * Import snapshot from JSON
   */
  importSnapshot(jsonString: string): SheetSnapshot {
    const data = JSON.parse(jsonString);
    const snapshot: SheetSnapshot = {
      id: data.id,
      versionId: data.versionId,
      cells: new Map(data.cells),
      metadata: data.metadata,
      timestamp: data.timestamp
    };

    // Verify checksum if present
    if (data.checksum) {
      if (!this.verifyChecksum(snapshot, data.checksum)) {
        throw new Error('Snapshot checksum verification failed');
      }
    }

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  /**
   * Clone snapshot
   */
  cloneSnapshot(snapshot: SheetSnapshot, newVersionId: string): SheetSnapshot {
    const cloned: SheetSnapshot = {
      id: this.generateId(),
      versionId: newVersionId,
      cells: new Map(snapshot.cells),
      metadata: { ...snapshot.metadata },
      timestamp: Date.now()
    };

    this.snapshots.set(cloned.id, cloned);
    return cloned;
  }

  /**
   * Merge two snapshots (union of cells)
   */
  mergeSnapshots(
    snapshot1: SheetSnapshot,
    snapshot2: SheetSnapshot,
    newVersionId: string
  ): SheetSnapshot {
    const mergedCells = new Map<string, CellValue>();

    // Add all cells from snapshot1
    snapshot1.cells.forEach((cell, coord) => {
      mergedCells.set(coord, { ...cell });
    });

    // Overlay cells from snapshot2
    snapshot2.cells.forEach((cell, coord) => {
      mergedCells.set(coord, { ...cell });
    });

    const merged: SheetSnapshot = {
      id: this.generateId(),
      versionId: newVersionId,
      cells: mergedCells,
      metadata: { ...snapshot1.metadata },
      timestamp: Date.now()
    };

    this.snapshots.set(merged.id, merged);
    return merged;
  }

  /**
   * Get statistics about snapshots
   */
  getStatistics(): SnapshotStatistics {
    const snapshots = Array.from(this.snapshots.values());
    const totalCells = snapshots.reduce((sum, snap) => sum + snap.cells.size, 0);
    const totalSize = this.getTotalStorageSize();

    return {
      count: snapshots.length,
      totalCells,
      totalSize,
      averageCellsPerSnapshot: snapshots.length > 0 ? totalCells / snapshots.length : 0,
      oldestTimestamp: Math.min(...snapshots.map(s => s.timestamp)),
      newestTimestamp: Math.max(...snapshots.map(s => s.timestamp))
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * GZIP compression
   */
  private async gzipCompress(data: string): Promise<Buffer> {
    const zlib = await import('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  /**
   * GZIP decompression
   */
  private async gzipDecompress(data: Buffer | Uint8Array): Promise<string> {
    const zlib = await import('zlib');
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (err, decompressed) => {
        if (err) reject(err);
        else resolve(decompressed.toString('utf8'));
      });
    });
  }

  /**
   * Brotli compression
   */
  private async brotliCompress(data: string): Promise<Buffer> {
    const zlib = await import('zlib');
    return new Promise((resolve, reject) => {
      zlib.brotliCompress(Buffer.from(data), (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  /**
   * Brotli decompression
   */
  private async brotliDecompress(data: Buffer | Uint8Array): Promise<string> {
    const zlib = await import('zlib');
    return new Promise((resolve, reject) => {
      zlib.brotliDecompress(data, (err, decompressed) => {
        if (err) reject(err);
        else resolve(decomposed.toString('utf8'));
      });
    });
  }
}

/**
 * Compressed snapshot for storage
 */
export interface CompressedSnapshot {
  snapshotId: string;
  data: Buffer;
  algorithm: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Snapshot statistics
 */
export interface SnapshotStatistics {
  count: number;
  totalCells: number;
  totalSize: number;
  averageCellsPerSnapshot: number;
  oldestTimestamp: number;
  newestTimestamp: number;
}

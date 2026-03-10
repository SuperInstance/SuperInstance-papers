/**
 * Delta Manager for Spreadsheet Version Control
 *
 * Computes, applies, and compresses deltas between spreadsheet snapshots.
 * Optimized for large spreadsheets (1M+ cells).
 */

import {
  SheetSnapshot,
  CellDelta,
  CellValue,
  CompressedDelta,
  DeltaOperation,
  CompressionAlgorithm,
  CellDiff
} from './types';

/**
 * Manages delta computation and application for version control
 */
export class DeltaManager {
  private compressionEnabled: boolean;
  private compressionAlgorithm: CompressionAlgorithm;

  constructor(
    compressionEnabled: boolean = true,
    compressionAlgorithm: CompressionAlgorithm = CompressionAlgorithm.GZIP
  ) {
    this.compressionEnabled = compressionEnabled;
    this.compressionAlgorithm = compressionAlgorithm;
  }

  /**
   * Compute delta between two snapshots
   */
  computeDelta(
    before: SheetSnapshot,
    after: SheetSnapshot,
    author?: string
  ): CellDelta[] {
    const deltas: CellDelta[] = [];
    const timestamp = Date.now();

    // Get all cell coordinates from both snapshots
    const allCoordinates = new Set<string>();
    before.cells.forEach((_, coord) => allCoordinates.add(coord));
    after.cells.forEach((_, coord) => allCoordinates.add(coord));

    for (const coordinate of allCoordinates) {
      const beforeCell = before.cells.get(coordinate);
      const afterCell = after.cells.get(coordinate);

      if (!beforeCell && afterCell) {
        // Cell was added
        deltas.push({
          cellId: coordinate,
          operation: DeltaOperation.ADD,
          after: afterCell,
          timestamp,
          author
        });
      } else if (beforeCell && !afterCell) {
        // Cell was deleted
        deltas.push({
          cellId: coordinate,
          operation: DeltaOperation.DELETE,
          before: beforeCell,
          timestamp,
          author
        });
      } else if (beforeCell && afterCell && !this.areCellsEqual(beforeCell, afterCell)) {
        // Cell was modified
        deltas.push({
          cellId: coordinate,
          operation: DeltaOperation.MODIFY,
          before: beforeCell,
          after: afterCell,
          timestamp,
          author
        });
      }
    }

    return deltas;
  }

  /**
   * Apply a delta to a snapshot, creating a new snapshot
   */
  applyDelta(
    snapshot: SheetSnapshot,
    delta: CellDelta[],
    versionId?: string,
    author?: string
  ): SheetSnapshot {
    const newCells = new Map<string, CellValue>();

    // Copy all existing cells
    snapshot.cells.forEach((cell, coord) => {
      newCells.set(coord, { ...cell });
    });

    // Apply deltas
    for (const change of delta) {
      switch (change.operation) {
        case DeltaOperation.ADD:
          if (change.after) {
            newCells.set(change.cellId, { ...change.after });
          }
          break;

        case DeltaOperation.MODIFY:
          if (change.after) {
            newCells.set(change.cellId, { ...change.after });
          }
          break;

        case DeltaOperation.DELETE:
          newCells.delete(change.cellId);
          break;
      }
    }

    // Create new snapshot
    const newSnapshot: SheetSnapshot = {
      id: this.generateSnapshotId(),
      versionId: versionId || this.generateVersionId(),
      cells: newCells,
      metadata: { ...snapshot.metadata },
      timestamp: Date.now()
    };

    return newSnapshot;
  }

  /**
   * Compress deltas for efficient storage
   */
  async compressDeltas(deltas: CellDelta[]): Promise<CompressedDelta> {
    const jsonString = JSON.stringify(deltas);
    const originalSize = Buffer.byteLength(jsonString, 'utf8');

    if (!this.compressionEnabled) {
      return {
        versionId: Date.now().toString(),
        data: Buffer.from(jsonString),
        algorithm: CompressionAlgorithm.NONE,
        originalSize,
        compressedSize: originalSize
      };
    }

    let compressedData: Buffer;

    switch (this.compressionAlgorithm) {
      case CompressionAlgorithm.GZIP:
        compressedData = await this.gzipCompress(jsonString);
        break;

      case CompressionAlgorithm.BROTLI:
        compressedData = await this.brotliCompress(jsonString);
        break;

      default:
        compressedData = Buffer.from(jsonString);
    }

    return {
      versionId: Date.now().toString(),
      data: compressedData,
      algorithm: this.compressionAlgorithm,
      originalSize,
      compressedSize: compressedData.length
    };
  }

  /**
   * Decompress compressed deltas
   */
  async decompressDelta(compressed: CompressedDelta): Promise<CellDelta[]> {
    let jsonString: string;

    switch (compressed.algorithm) {
      case CompressionAlgorithm.GZIP:
        jsonString = await this.gzipDecompress(compressed.data);
        break;

      case CompressionAlgorithm.BROTLI:
        jsonString = await this.brotliDecompress(compressed.data);
        break;

      case CompressionAlgorithm.NONE:
        jsonString = compressed.data.toString('utf8');
        break;

      default:
        throw new Error(`Unsupported compression algorithm: ${compressed.algorithm}`);
    }

    return JSON.parse(jsonString) as CellDelta[];
  }

  /**
   * Compute detailed diff between two versions
   */
  computeDiff(
    before: SheetSnapshot,
    after: SheetSnapshot
  ): CellDiff[] {
    const diffs: CellDiff[] = [];

    const allCoordinates = new Set<string>();
    before.cells.forEach((_, coord) => allCoordinates.add(coord));
    after.cells.forEach((_, coord) => allCoordinates.add(coord));

    for (const coordinate of allCoordinates) {
      const beforeCell = before.cells.get(coordinate);
      const afterCell = after.cells.get(coordinate);

      if (!beforeCell && afterCell) {
        diffs.push({
          coordinate,
          operation: DeltaOperation.ADD,
          after: afterCell
        });
      } else if (beforeCell && !afterCell) {
        diffs.push({
          coordinate,
          operation: DeltaOperation.DELETE,
          before: beforeCell
        });
      } else if (beforeCell && afterCell && !this.areCellsEqual(beforeCell, afterCell)) {
        diffs.push({
          coordinate,
          operation: DeltaOperation.MODIFY,
          before: beforeCell,
          after: afterCell
        });
      }
    }

    return diffs;
  }

  /**
   * Get statistics about a delta
   */
  getDeltaStats(deltas: CellDelta[]): DeltaStats {
    const stats: DeltaStats = {
      add: 0,
      modify: 0,
      delete: 0,
      total: deltas.length
    };

    for (const delta of deltas) {
      switch (delta.operation) {
        case DeltaOperation.ADD:
          stats.add++;
          break;
        case DeltaOperation.MODIFY:
          stats.modify++;
          break;
        case DeltaOperation.DELETE:
          stats.delete++;
          break;
      }
    }

    return stats;
  }

  /**
   * Filter deltas by operation type
   */
  filterDeltas(deltas: CellDelta[], operation: DeltaOperation): CellDelta[] {
    return deltas.filter(delta => delta.operation === operation);
  }

  /**
   * Filter deltas by cell coordinate pattern
   */
  filterByCoordinate(deltas: CellDelta[], pattern: RegExp): CellDelta[] {
    return deltas.filter(delta => pattern.test(delta.cellId));
  }

  /**
   * Batch compute deltas for multiple snapshots
   */
  batchComputeDeltas(
    snapshots: SheetSnapshot[],
    author?: string
  ): CellDelta[][] {
    const allDeltas: CellDelta[][] = [];

    for (let i = 1; i < snapshots.length; i++) {
      const delta = this.computeDelta(snapshots[i - 1], snapshots[i], author);
      allDeltas.push(delta);
    }

    return allDeltas;
  }

  /**
   * Merge multiple deltas into one
   */
  mergeDeltas(deltas: CellDelta[]): CellDelta[] {
    const merged = new Map<string, CellDelta>();

    // Apply deltas in order, keeping only the latest state
    for (const delta of deltas) {
      merged.set(delta.cellId, delta);
    }

    return Array.from(merged.values());
  }

  /**
   * Check if two cell values are equal
   */
  private areCellsEqual(cell1: CellValue, cell2: CellValue): boolean {
    return (
      cell1.coordinate === cell2.coordinate &&
      cell1.type === cell2.type &&
      cell1.value === cell2.value &&
      cell1.formula === cell2.formula
    );
  }

  /**
   * Generate unique snapshot ID
   */
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique version ID
   */
  private generateVersionId(): string {
    return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        else resolve(decompressed.toString('utf8'));
      });
    });
  }
}

/**
 * Statistics about delta operations
 */
export interface DeltaStats {
  /** Number of added cells */
  add: number;
  /** Number of modified cells */
  modify: number;
  /** Number of deleted cells */
  delete: number;
  /** Total number of operations */
  total: number;
}

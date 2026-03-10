/**
 * Tests for SnapshotManager
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SnapshotManager } from '../SnapshotManager';
import { CellValue, CellType, SheetMetadata } from '../types';

describe('SnapshotManager', () => {
  let snapshotManager: SnapshotManager;

  beforeEach(() => {
    snapshotManager = new SnapshotManager({
      enableCompression: true,
      compressionAlgorithm: 'gzip' as any
    });
  });

  const createTestCell = (coordinate: string, value: any): CellValue => ({
    coordinate,
    value,
    type: typeof value === 'number' ? CellType.NUMBER : CellType.STRING
  });

  const createTestCells = (data: Record<string, any>): Map<string, CellValue> => {
    const cells = new Map<string, CellValue>();
    Object.entries(data).forEach(([coord, value]) => {
      cells.set(coord, createTestCell(coord, value));
    });
    return cells;
  };

  const createMetadata = (): SheetMetadata => ({
    name: 'Test Sheet',
    columnCount: 10,
    rowCount: 10
  });

  describe('createSnapshot', () => {
    it('should create snapshot with all cells', () => {
      const cells = createTestCells({ 'A1': 'Hello', 'B1': 123 });
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');

      expect(snapshot.id).toBeDefined();
      expect(snapshot.versionId).toBe('version-1');
      expect(snapshot.cells.size).toBe(2);
      expect(snapshot.cells.get('A1')?.value).toBe('Hello');
      expect(snapshot.cells.get('B1')?.value).toBe(123);
    });

    it('should create snapshot with metadata', () => {
      const cells = createTestCells({});
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');

      expect(snapshot.metadata.name).toBe('Test Sheet');
      expect(snapshot.metadata.columnCount).toBe(10);
    });
  });

  describe('getSnapshot', () => {
    it('should retrieve stored snapshot', () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      const created = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      const retrieved = snapshotManager.getSnapshot(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent snapshot', () => {
      const retrieved = snapshotManager.getSnapshot('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getSnapshotByVersion', () => {
    it('should find snapshot by version ID', () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      const created = snapshotManager.createSnapshot(cells, metadata, 'version-123');
      const retrieved = snapshotManager.getSnapshotByVersion('version-123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.versionId).toBe('version-123');
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete snapshot', () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      const deleted = snapshotManager.deleteSnapshot(snapshot.id);

      expect(deleted).toBe(true);

      const retrieved = snapshotManager.getSnapshot(snapshot.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return false for non-existent snapshot', () => {
      const deleted = snapshotManager.deleteSnapshot('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getSnapshotSize', () => {
    it('should estimate snapshot size', () => {
      const cells = createTestCells({
        'A1': 'A'.repeat(100),
        'B1': 'B'.repeat(200)
      });
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      const size = snapshotManager.getSnapshotSize(snapshot);

      expect(size).toBeGreaterThan(0);
    });
  });

  describe('getTotalStorageSize', () => {
    it('should calculate total storage', () => {
      const cells1 = createTestCells({ 'A1': 'x'.repeat(1000) });
      const cells2 = createTestCells({ 'A1': 'y'.repeat(2000) });
      const metadata = createMetadata();

      snapshotManager.createSnapshot(cells1, metadata, 'v1');
      snapshotManager.createSnapshot(cells2, metadata, 'v2');

      const totalSize = snapshotManager.getTotalStorageSize();

      expect(totalSize).toBeGreaterThan(0);
    });
  });

  describe('compressSnapshot', () => {
    it('should compress snapshot', async () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      const compressed = await snapshotManager.compressSnapshot(snapshot);

      expect(compressed.snapshotId).toBe(snapshot.id);
      expect(compressed.data).toBeDefined();
      expect(compressed.compressedSize).toBeGreaterThan(0);
      expect(compressed.originalSize).toBeGreaterThan(0);
    });

    it('should achieve compression', async () => {
      const cells = createTestCells({
        'A1': 'x'.repeat(1000),
        'A2': 'y'.repeat(1000),
        'A3': 'z'.repeat(1000)
      });
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      const compressed = await snapshotManager.compressSnapshot(snapshot);

      expect(compressed.compressedSize).toBeLessThan(compressed.originalSize);
    });
  });

  describe('decompressSnapshot', () => {
    it('should decompress to original', async () => {
      const cells = createTestCells({ 'A1': 'test-value' });
      const metadata = createMetadata();

      const original = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      const compressed = await snapshotManager.compressSnapshot(original);
      const decompressed = await snapshotManager.decompressSnapshot(compressed);

      expect(decompressed.id).toBe(original.id);
      expect(decompressed.cells.get('A1')?.value).toBe('test-value');
    });
  });

  describe('createChecksum', () => {
    it('should create consistent checksum', () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      const checksum1 = snapshotManager.createChecksum(snapshot);
      const checksum2 = snapshotManager.createChecksum(snapshot);

      expect(checksum1).toBe(checksum2);
    });

    it('should create different checksums for different snapshots', () => {
      const cells1 = createTestCells({ 'A1': 'value1' });
      const cells2 = createTestCells({ 'A1': 'value2' });
      const metadata = createMetadata();

      const snapshot1 = snapshotManager.createSnapshot(cells1, metadata, 'v1');
      const snapshot2 = snapshotManager.createSnapshot(cells2, metadata, 'v2');

      const checksum1 = snapshotManager.createChecksum(snapshot1);
      const checksum2 = snapshotManager.createChecksum(snapshot2);

      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('verifyChecksum', () => {
    it('should verify valid checksum', () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      const checksum = snapshotManager.createChecksum(snapshot);

      expect(snapshotManager.verifyChecksum(snapshot, checksum)).toBe(true);
    });

    it('should reject invalid checksum', () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');

      expect(snapshotManager.verifyChecksum(snapshot, 'invalid')).toBe(false);
    });
  });

  describe('exportSnapshot', () => {
    it('should export snapshot to JSON', () => {
      const cells = createTestCells({ 'A1': 'exported' });
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      const exported = snapshotManager.exportSnapshot(snapshot);

      expect(exported).toContain('exported');
      expect(exported).toContain(snapshot.id);
      expect(exported).toContain('checksum');
    });
  });

  describe('importSnapshot', () => {
    it('should import snapshot from JSON', () => {
      const cells = createTestCells({ 'A1': 'imported' });
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      const exported = snapshotManager.exportSnapshot(snapshot);

      const imported = snapshotManager.importSnapshot(exported);

      expect(imported.id).toBe(snapshot.id);
      expect(imported.cells.get('A1')?.value).toBe('imported');
    });

    it('should reject snapshot with invalid checksum', () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      const snapshot = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      let exported = snapshotManager.exportSnapshot(snapshot);

      // Corrupt the checksum - need to modify actual data to make checksum invalid
      // The checksum is computed from the data, so we need to change the data but keep old checksum
      const originalChecksum = JSON.parse(exported).checksum;
      const modifiedExport = exported.replace('"value"', '"modified"');
      const withOldChecksum = modifiedExport.replace(
        `"checksum":"${JSON.parse(modifiedExport).checksum}"`,
        `"checksum":"${originalChecksum}"`
      );

      expect(() => {
        snapshotManager.importSnapshot(withOldChecksum);
      }).toThrow();
    });
  });

  describe('cloneSnapshot', () => {
    it('should clone snapshot with new version', () => {
      const cells = createTestCells({ 'A1': 'cloned' });
      const metadata = createMetadata();

      const original = snapshotManager.createSnapshot(cells, metadata, 'version-1');
      const clone = snapshotManager.cloneSnapshot(original, 'version-2');

      expect(clone.id).not.toBe(original.id);
      expect(clone.versionId).toBe('version-2');
      expect(clone.cells.get('A1')?.value).toBe('cloned');
    });
  });

  describe('mergeSnapshots', () => {
    it('should merge two snapshots', () => {
      const cells1 = createTestCells({ 'A1': 'from1', 'B1': 'only1' });
      const cells2 = createTestCells({ 'A1': 'from2', 'C1': 'only2' });
      const metadata = createMetadata();

      const snapshot1 = snapshotManager.createSnapshot(cells1, metadata, 'v1');
      const snapshot2 = snapshotManager.createSnapshot(cells2, metadata, 'v2');

      const merged = snapshotManager.mergeSnapshots(snapshot1, snapshot2, 'merged');

      expect(merged.cells.get('A1')?.value).toBe('from2'); // snapshot2 overwrites
      expect(merged.cells.get('B1')?.value).toBe('only1');
      expect(merged.cells.get('C1')?.value).toBe('only2');
    });
  });

  describe('getStatistics', () => {
    it('should return snapshot statistics', () => {
      const cells1 = createTestCells({ 'A1': '1', 'B1': '2' });
      const cells2 = createTestCells({ 'A1': '3' });
      const metadata = createMetadata();

      snapshotManager.createSnapshot(cells1, metadata, 'v1');
      snapshotManager.createSnapshot(cells2, metadata, 'v2');

      const stats = snapshotManager.getStatistics();

      expect(stats.count).toBe(2);
      expect(stats.totalCells).toBe(3);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('garbageCollect', () => {
    it('should delete unversioned snapshots', () => {
      const cells = createTestCells({ 'A1': 'value' });
      const metadata = createMetadata();

      const s1 = snapshotManager.createSnapshot(cells, metadata, 'v1');
      const s2 = snapshotManager.createSnapshot(cells, metadata, 'v2');
      const s3 = snapshotManager.createSnapshot(cells, metadata, 'v3');

      // Keep only v1 and v3
      const keepVersions = new Set(['v1', 'v3']);
      const collected = snapshotManager.garbageCollect(keepVersions);

      expect(collected).toBe(1);
      expect(snapshotManager.getSnapshot(s2.id)).toBeUndefined();
      expect(snapshotManager.getSnapshot(s1.id)).toBeDefined();
      expect(snapshotManager.getSnapshot(s3.id)).toBeDefined();
    });
  });
});

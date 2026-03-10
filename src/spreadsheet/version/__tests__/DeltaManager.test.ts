/**
 * Tests for DeltaManager
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DeltaManager } from '../DeltaManager';
import {
  SheetSnapshot,
  CellValue,
  CellType,
  DeltaOperation
} from '../types';

describe('DeltaManager', () => {
  let deltaManager: DeltaManager;

  beforeEach(() => {
    deltaManager = new DeltaManager(true, 'gzip' as any);
  });

  const createTestCell = (coordinate: string, value: any, type: CellType = CellType.STRING): CellValue => ({
    coordinate,
    value,
    type,
    formula: undefined
  });

  const createTestSnapshot = (cells: [string, any][]): SheetSnapshot => {
    const cellMap = new Map<string, CellValue>();
    cells.forEach(([coord, value]) => {
      cellMap.set(coord, createTestCell(coord, value));
    });

    return {
      id: 'test-snapshot',
      versionId: 'version-1',
      cells: cellMap,
      metadata: {
        name: 'Test Sheet',
        columnCount: 10,
        rowCount: 10
      },
      timestamp: Date.now()
    };
  };

  describe('computeDelta', () => {
    it('should detect added cells', () => {
      const before = createTestSnapshot([['A1', 'old']]);
      const after = createTestSnapshot([['A1', 'old'], ['B1', 'new']]);

      const deltas = deltaManager.computeDelta(before, after);

      expect(deltas).toHaveLength(1);
      expect(deltas[0].operation).toBe(DeltaOperation.ADD);
      expect(deltas[0].cellId).toBe('B1');
      expect(deltas[0].after?.value).toBe('new');
    });

    it('should detect deleted cells', () => {
      const before = createTestSnapshot([['A1', 'value'], ['B1', 'other']]);
      const after = createTestSnapshot([['A1', 'value']]);

      const deltas = deltaManager.computeDelta(before, after);

      expect(deltas).toHaveLength(1);
      expect(deltas[0].operation).toBe(DeltaOperation.DELETE);
      expect(deltas[0].cellId).toBe('B1');
    });

    it('should detect modified cells', () => {
      const before = createTestSnapshot([['A1', 'old']]);
      const after = createTestSnapshot([['A1', 'new']]);

      const deltas = deltaManager.computeDelta(before, after);

      expect(deltas).toHaveLength(1);
      expect(deltas[0].operation).toBe(DeltaOperation.MODIFY);
      expect(deltas[0].before?.value).toBe('old');
      expect(deltas[0].after?.value).toBe('new');
    });

    it('should handle empty snapshots', () => {
      const before = createTestSnapshot([]);
      const after = createTestSnapshot([]);

      const deltas = deltaManager.computeDelta(before, after);

      expect(deltas).toHaveLength(0);
    });

    it('should include author and timestamp', () => {
      const before = createTestSnapshot([['A1', 'old']]);
      const after = createTestSnapshot([['A1', 'new']]);
      const author = 'test-user';

      const deltas = deltaManager.computeDelta(before, after, author);

      expect(deltas[0].author).toBe(author);
      expect(deltas[0].timestamp).toBeDefined();
    });
  });

  describe('applyDelta', () => {
    it('should apply ADD operations', () => {
      const snapshot = createTestSnapshot([['A1', 'existing']]);
      const delta = [{
        cellId: 'B1',
        operation: DeltaOperation.ADD,
        after: createTestCell('B1', 'new')
      }];

      const result = deltaManager.applyDelta(snapshot, delta);

      expect(result.cells.has('B1')).toBe(true);
      expect(result.cells.get('B1')?.value).toBe('new');
    });

    it('should apply MODIFY operations', () => {
      const snapshot = createTestSnapshot([['A1', 'old']]);
      const delta = [{
        cellId: 'A1',
        operation: DeltaOperation.MODIFY,
        after: createTestCell('A1', 'new')
      }];

      const result = deltaManager.applyDelta(snapshot, delta);

      expect(result.cells.get('A1')?.value).toBe('new');
    });

    it('should apply DELETE operations', () => {
      const snapshot = createTestSnapshot([['A1', 'value']]);
      const delta = [{
        cellId: 'A1',
        operation: DeltaOperation.DELETE
      }];

      const result = deltaManager.applyDelta(snapshot, delta);

      expect(result.cells.has('A1')).toBe(false);
    });

    it('should handle multiple deltas', () => {
      const snapshot = createTestSnapshot([['A1', '1'], ['B1', '2'], ['C1', '3']]);
      const delta = [
        { cellId: 'A1', operation: DeltaOperation.MODIFY, after: createTestCell('A1', '10') },
        { cellId: 'B1', operation: DeltaOperation.DELETE },
        { cellId: 'D1', operation: DeltaOperation.ADD, after: createTestCell('D1', '4') }
      ];

      const result = deltaManager.applyDelta(snapshot, delta);

      expect(result.cells.get('A1')?.value).toBe('10');
      expect(result.cells.has('B1')).toBe(false);
      expect(result.cells.get('C1')?.value).toBe('3');
      expect(result.cells.get('D1')?.value).toBe('4');
    });
  });

  describe('compressDeltas', () => {
    it('should compress deltas', async () => {
      const deltas = [
        { cellId: 'A1', operation: DeltaOperation.ADD, after: createTestCell('A1', 'value') }
      ];

      const compressed = await deltaManager.compressDeltas(deltas);

      expect(compressed.data).toBeDefined();
      expect(compressed.originalSize).toBeGreaterThan(0);
      expect(compressed.compressedSize).toBeGreaterThan(0);
    });

    it('should achieve compression ratio', async () => {
      const deltas = [];
      for (let i = 0; i < 100; i++) {
        deltas.push({
          cellId: `A${i}`,
          operation: DeltaOperation.ADD,
          after: createTestCell(`A${i}`, `value${i}`),
          before: undefined
        });
      }

      const compressed = await deltaManager.compressDeltas(deltas);

      expect(compressed.compressedSize).toBeLessThan(compressed.originalSize);
    });
  });

  describe('decompressDelta', () => {
    it('should decompress to original deltas', async () => {
      const originalDeltas = [
        { cellId: 'A1', operation: DeltaOperation.ADD, after: createTestCell('A1', 'value') },
        { cellId: 'B1', operation: DeltaOperation.MODIFY, before: createTestCell('B1', 'old'), after: createTestCell('B1', 'new') }
      ];

      const compressed = await deltaManager.compressDeltas(originalDeltas);
      const decompressed = await deltaManager.decompressDelta(compressed);

      expect(decompressed).toHaveLength(originalDeltas.length);
      expect(decompressed[0].cellId).toBe(originalDeltas[0].cellId);
      expect(decompressed[1].cellId).toBe(originalDeltas[1].cellId);
    });
  });

  describe('computeDiff', () => {
    it('should compute detailed diff', () => {
      const before = createTestSnapshot([['A1', '1'], ['B1', '2']]);
      const after = createTestSnapshot([['A1', '1'], ['B1', '3'], ['C1', '4']]);

      const diff = deltaManager.computeDiff(before, after);

      expect(diff).toHaveLength(2);
      expect(diff.find(d => d.coordinate === 'B1')?.operation).toBe(DeltaOperation.MODIFY);
      expect(diff.find(d => d.coordinate === 'C1')?.operation).toBe(DeltaOperation.ADD);
    });
  });

  describe('getDeltaStats', () => {
    it('should compute correct statistics', () => {
      const deltas = [
        { cellId: 'A1', operation: DeltaOperation.ADD, after: createTestCell('A1', '1') },
        { cellId: 'B1', operation: DeltaOperation.MODIFY, before: createTestCell('B1', '2'), after: createTestCell('B1', '3') },
        { cellId: 'C1', operation: DeltaOperation.DELETE, before: createTestCell('C1', '4') }
      ];

      const stats = deltaManager.getDeltaStats(deltas);

      expect(stats.add).toBe(1);
      expect(stats.modify).toBe(1);
      expect(stats.delete).toBe(1);
      expect(stats.total).toBe(3);
    });
  });

  describe('filterDeltas', () => {
    it('should filter by operation type', () => {
      const deltas = [
        { cellId: 'A1', operation: DeltaOperation.ADD, after: createTestCell('A1', '1') },
        { cellId: 'B1', operation: DeltaOperation.MODIFY, before: createTestCell('B1', '2'), after: createTestCell('B1', '3') },
        { cellId: 'C1', operation: DeltaOperation.DELETE, before: createTestCell('C1', '4') }
      ];

      const adds = deltaManager.filterDeltas(deltas, DeltaOperation.ADD);
      const deletes = deltaManager.filterDeltas(deltas, DeltaOperation.DELETE);

      expect(adds).toHaveLength(1);
      expect(deletes).toHaveLength(1);
    });
  });

  describe('filterByCoordinate', () => {
    it('should filter by coordinate pattern', () => {
      const deltas = [
        { cellId: 'A1', operation: DeltaOperation.ADD, after: createTestCell('A1', '1') },
        { cellId: 'A2', operation: DeltaOperation.ADD, after: createTestCell('A2', '2') },
        { cellId: 'B1', operation: DeltaOperation.ADD, after: createTestCell('B1', '3') }
      ];

      const aColumn = deltaManager.filterByCoordinate(deltas, /^A/);

      expect(aColumn).toHaveLength(2);
      expect(aColumn.every(d => d.cellId.startsWith('A'))).toBe(true);
    });
  });

  describe('mergeDeltas', () => {
    it('should merge multiple deltas', () => {
      const deltas = [
        { cellId: 'A1', operation: DeltaOperation.MODIFY, after: createTestCell('A1', '1') },
        { cellId: 'A1', operation: DeltaOperation.MODIFY, after: createTestCell('A1', '2') },
        { cellId: 'B1', operation: DeltaOperation.ADD, after: createTestCell('B1', '3') }
      ];

      const merged = deltaManager.mergeDeltas(deltas);

      expect(merged).toHaveLength(2);
      expect(merged.find(d => d.cellId === 'A1')?.after?.value).toBe('2');
    });
  });
});

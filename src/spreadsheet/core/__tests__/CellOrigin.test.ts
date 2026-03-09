/**
 * Unit Tests for CellOrigin
 *
 * Tests the self-reference point for LOG cells including:
 * - Identity and position management
 * - Self-awareness levels
 * - Watched cell tracking
 * - Coordinate transformations
 * - Serialization and cloning
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  CellOrigin,
  CellId,
  CellPosition,
  CellReference,
  SelfAwarenessLevel,
  SensationType,
  WatchedCell,
  Sensation,
} from '../CellOrigin';

describe('CellOrigin', () => {
  let origin: CellOrigin;
  let testId: CellId;
  let testPosition: CellPosition;

  beforeEach(() => {
    testId = 'test_sheet_5_3';
    testPosition = { row: 5, col: 3, sheet: 'test_sheet' };
    origin = new CellOrigin(testId, testPosition);
  });

  describe('Construction', () => {
    test('should create origin with basic properties', () => {
      expect(origin.id).toBe(testId);
      expect(origin.position).toEqual(testPosition);
      expect(origin.selfAwareness).toBe(SelfAwarenessLevel.BASIC);
      expect(origin.getWatchedCellCount()).toBe(0);
    });

    test('should create origin with custom self-awareness', () => {
      const advancedOrigin = new CellOrigin(
        testId,
        testPosition,
        SelfAwarenessLevel.ADVANCED
      );
      expect(advancedOrigin.selfAwareness).toBe(SelfAwarenessLevel.ADVANCED);
    });

    test('should set creation and update timestamps', () => {
      expect(origin.createdAt).toBeGreaterThan(0);
      expect(origin.updatedAt).toBe(origin.createdAt);
    });

    test('should initialize coordinate system', () => {
      expect(origin.coordinates).toBeDefined();
      expect(origin.coordinates.getAbsolutePosition()).toEqual(testPosition);
    });
  });

  describe('Identity', () => {
    test('should have unique identifier', () => {
      const origin1 = new CellOrigin('id1', { row: 0, col: 0 });
      const origin2 = new CellOrigin('id2', { row: 0, col: 0 });

      expect(origin1.id).not.toBe(origin2.id);
    });

    test('should maintain position', () => {
      expect(origin.position.row).toBe(5);
      expect(origin.position.col).toBe(3);
      expect(origin.position.sheet).toBe('test_sheet');
    });
  });

  describe('Self-Awareness', () => {
    test('should start at BASIC level', () => {
      expect(origin.selfAwareness).toBe(SelfAwarenessLevel.BASIC);
    });

    test('should upgrade to higher awareness level', () => {
      const result = origin.upgradeAwareness(SelfAwarenessLevel.INTERMEDIATE);
      expect(result).toBe(true);
      expect(origin.selfAwareness).toBe(SelfAwarenessLevel.INTERMEDIATE);
    });

    test('should upgrade multiple levels', () => {
      origin.upgradeAwareness(SelfAwarenessLevel.FULL);
      expect(origin.selfAwareness).toBe(SelfAwarenessLevel.FULL);
    });

    test('should not downgrade awareness level', () => {
      origin.upgradeAwareness(SelfAwarenessLevel.ADVANCED);
      const result = origin.upgradeAwareness(SelfAwarenessLevel.BASIC);
      expect(result).toBe(false);
      expect(origin.selfAwareness).toBe(SelfAwarenessLevel.ADVANCED);
    });

    test('should not upgrade to same level', () => {
      const result = origin.upgradeAwareness(SelfAwarenessLevel.BASIC);
      expect(result).toBe(false);
      expect(origin.selfAwareness).toBe(SelfAwarenessLevel.BASIC);
    });
  });

  describe('Watched Cells - Basic Operations', () => {
    let watchedRef: CellReference;

    beforeEach(() => {
      watchedRef = { row: 6, col: 3, sheet: 'test_sheet' };
    });

    test('should watch a cell', () => {
      const watched = origin.watch(
        watchedRef,
        [SensationType.ABSOLUTE_CHANGE, SensationType.RATE_OF_CHANGE],
        0.1
      );

      expect(watched.reference).toEqual(watchedRef);
      expect(watched.sensationTypes).toHaveLength(2);
      expect(watched.threshold).toBe(0.1);
    });

    test('should track watched cell count', () => {
      expect(origin.getWatchedCellCount()).toBe(0);

      origin.watch({ row: 6, col: 3 }, [SensationType.ABSOLUTE_CHANGE]);
      origin.watch({ row: 7, col: 3 }, [SensationType.RATE_OF_CHANGE]);

      expect(origin.getWatchedCellCount()).toBe(2);
    });

    test('should get all watched cells', () => {
      origin.watch({ row: 6, col: 3 }, [SensationType.ABSOLUTE_CHANGE]);
      origin.watch({ row: 7, col: 3 }, [SensationType.RATE_OF_CHANGE]);

      const watched = origin.getWatchedCells();
      expect(watched).toHaveLength(2);
    });

    test('should get specific watched cell', () => {
      origin.watch(watchedRef, [SensationType.ABSOLUTE_CHANGE]);
      const watched = origin.getWatchedCell(watchedRef);

      expect(watched).toBeDefined();
      expect(watched?.reference).toEqual(watchedRef);
    });

    test('should return undefined for non-watched cell', () => {
      const watched = origin.getWatchedCell({ row: 99, col: 99 });
      expect(watched).toBeUndefined();
    });

    test('should check if watching a cell', () => {
      origin.watch(watchedRef, [SensationType.ABSOLUTE_CHANGE]);

      expect(origin.isWatching(watchedRef)).toBe(true);
      expect(origin.isWatching({ row: 99, col: 99 })).toBe(false);
    });
  });

  describe('Watched Cells - Unwatch', () => {
    let watchedRef: CellReference;

    beforeEach(() => {
      watchedRef = { row: 6, col: 3, sheet: 'test_sheet' };
      origin.watch(watchedRef, [SensationType.ABSOLUTE_CHANGE]);
    });

    test('should unwatch a cell', () => {
      const result = origin.unwatch(watchedRef);
      expect(result).toBe(true);
      expect(origin.getWatchedCellCount()).toBe(0);
    });

    test('should return false when unwatching non-watched cell', () => {
      const result = origin.unwatch({ row: 99, col: 99 });
      expect(result).toBe(false);
    });

    test('should clear all watched cells', () => {
      origin.watch({ row: 6, col: 3 }, [SensationType.ABSOLUTE_CHANGE]);
      origin.watch({ row: 7, col: 3 }, [SensationType.RATE_OF_CHANGE]);

      origin.clearWatchedCells();

      expect(origin.getWatchedCellCount()).toBe(0);
    });
  });

  describe('Watched Cells - Sensations', () => {
    let watchedRef: CellReference;
    let sensation: Sensation;

    beforeEach(() => {
      watchedRef = { row: 6, col: 3, sheet: 'test_sheet' };
      origin.watch(watchedRef, [SensationType.RATE_OF_CHANGE]);

      sensation = {
        source: watchedRef,
        type: SensationType.RATE_OF_CHANGE,
        value: 0.15,
        previousValue: 100,
        currentValue: 115,
        timestamp: Date.now(),
        confidence: 0.95,
      };
    });

    test('should update sensation for watched cell', () => {
      origin.updateSensation(watchedRef, sensation);
      const watched = origin.getWatchedCell(watchedRef);

      expect(watched?.lastSensation).toEqual(sensation);
    });

    test('should not update sensation for non-watched cell', () => {
      const otherRef = { row: 99, col: 99 };
      origin.updateSensation(otherRef, sensation);

      const watched = origin.getWatchedCell(otherRef);
      expect(watched).toBeUndefined();
    });
  });

  describe('Coordinate Transformations', () => {
    test('should get relative position', () => {
      const other = { row: 6, col: 3, sheet: 'test_sheet' };
      const relative = origin.getRelativePosition(other);

      expect(relative.dRow).toBe(1);
      expect(relative.dCol).toBe(0);
    });

    test('should get absolute position from relative', () => {
      const relative = { dRow: 1, dCol: 0 };
      const absolute = origin.getAbsolutePosition(relative);

      expect(absolute.row).toBe(6);
      expect(absolute.col).toBe(3);
      expect(absolute.sheet).toBe('test_sheet');
    });

    test('should calculate Manhattan distance', () => {
      const other = { row: 7, col: 5 };
      const distance = origin.distanceTo(other);

      expect(distance).toBe(4); // |7-5| + |5-3| = 2 + 2 = 4
    });

    test('should check if cells are adjacent', () => {
      const adjacent = { row: 6, col: 3 };
      const far = { row: 10, col: 10 };

      expect(origin.isAdjacentTo(adjacent)).toBe(true);
      expect(origin.isAdjacentTo(far)).toBe(false);
    });

    test('should detect diagonal adjacency', () => {
      const diagonal = { row: 6, col: 4 };
      expect(origin.isAdjacentTo(diagonal)).toBe(true);
    });
  });

  describe('Cross-Sheet References', () => {
    test('should handle watched cells from different sheets', () => {
      const otherSheetRef = { row: 5, col: 3, sheet: 'other_sheet' };
      origin.watch(otherSheetRef, [SensationType.PRESENCE]);

      expect(origin.isWatching(otherSheetRef)).toBe(true);
    });

    test('should handle cells without sheet specification', () => {
      const noSheetRef = { row: 6, col: 3 };
      origin.watch(noSheetRef, [SensationType.ABSOLUTE_CHANGE]);

      expect(origin.isWatching(noSheetRef)).toBe(true);
    });
  });

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      origin.watch({ row: 6, col: 3 }, [SensationType.RATE_OF_CHANGE]);

      const json = origin.toJSON();

      expect(json).toHaveProperty('id', testId);
      expect(json).toHaveProperty('position');
      expect(json).toHaveProperty('selfAwareness');
      expect(json).toHaveProperty('watchedCells');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });

    test('should deserialize from JSON', () => {
      origin.watch({ row: 6, col: 3 }, [SensationType.RATE_OF_CHANGE]);

      const sensation: Sensation = {
        source: { row: 6, col: 3 },
        type: SensationType.RATE_OF_CHANGE,
        value: 0.15,
        timestamp: Date.now(),
        confidence: 0.95,
      };
      origin.updateSensation({ row: 6, col: 3 }, sensation);

      const json = origin.toJSON();
      const restored = CellOrigin.fromJSON(json);

      expect(restored.id).toBe(origin.id);
      expect(restored.position).toEqual(origin.position);
      expect(restored.selfAwareness).toBe(origin.selfAwareness);
      expect(restored.getWatchedCellCount()).toBe(1);
    });

    test('should preserve sensations after serialization', () => {
      origin.watch({ row: 6, col: 3 }, [SensationType.RATE_OF_CHANGE]);

      const sensation: Sensation = {
        source: { row: 6, col: 3 },
        type: SensationType.RATE_OF_CHANGE,
        value: 0.15,
        timestamp: Date.now(),
        confidence: 0.95,
      };
      origin.updateSensation({ row: 6, col: 3 }, sensation);

      const json = origin.toJSON();
      const restored = CellOrigin.fromJSON(json);
      const watched = restored.getWatchedCell({ row: 6, col: 3 });

      expect(watched?.lastSensation).toEqual(sensation);
    });
  });

  describe('Cloning', () => {
    test('should create independent clone', () => {
      origin.watch({ row: 6, col: 3 }, [SensationType.RATE_OF_CHANGE]);

      const cloned = origin.clone();

      expect(cloned.id).toBe(origin.id);
      expect(cloned.position).toEqual(origin.position);
      expect(cloned.selfAwareness).toBe(origin.selfAwareness);
      expect(cloned.getWatchedCellCount()).toBe(origin.getWatchedCellCount());
    });

    test('should clone watched cells', () => {
      origin.watch({ row: 6, col: 3 }, [SensationType.RATE_OF_CHANGE]);

      const cloned = origin.clone();
      const watched = cloned.getWatchedCell({ row: 6, col: 3 });

      expect(watched).toBeDefined();
      expect(watched?.sensationTypes).toEqual([SensationType.RATE_OF_CHANGE]);
    });

    test('should create independent watched cell map', () => {
      origin.watch({ row: 6, col: 3 }, [SensationType.RATE_OF_CHANGE]);

      const cloned = origin.clone();
      cloned.unwatch({ row: 6, col: 3 });

      expect(origin.getWatchedCellCount()).toBe(1);
      expect(cloned.getWatchedCellCount()).toBe(0);
    });
  });

  describe('String Representation', () => {
    test('should convert to string', () => {
      const str = origin.toString();
      expect(str).toContain('CellOrigin');
      expect(str).toContain(testId);
      expect(str).toContain('5');
      expect(str).toContain('3');
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero position', () => {
      const zeroOrigin = new CellOrigin('zero', { row: 0, col: 0 });
      expect(zeroOrigin.position.row).toBe(0);
      expect(zeroOrigin.position.col).toBe(0);
    });

    test('should handle large position values', () => {
      const largeOrigin = new CellOrigin('large', { row: 10000, col: 10000 });
      expect(largeOrigin.position.row).toBe(10000);
      expect(largeOrigin.position.col).toBe(10000);
    });

    test('should handle multiple watches of same cell', () => {
      const ref = { row: 6, col: 3 };
      origin.watch(ref, [SensationType.ABSOLUTE_CHANGE]);
      origin.watch(ref, [SensationType.RATE_OF_CHANGE]);

      // Should overwrite, not duplicate
      expect(origin.getWatchedCellCount()).toBe(1);
      const watched = origin.getWatchedCell(ref);
      expect(watched?.sensationTypes).toEqual([SensationType.RATE_OF_CHANGE]);
    });
  });

  describe('Update Timestamps', () => {
    test('should update timestamp on watch', () => {
      const initialTime = origin.updatedAt;
      origin.watch({ row: 6, col: 3 }, [SensationType.ABSOLUTE_CHANGE]);

      expect(origin.updatedAt).toBeGreaterThanOrEqual(initialTime);
    });

    test('should update timestamp on unwatch', () => {
      origin.watch({ row: 6, col: 3 }, [SensationType.ABSOLUTE_CHANGE]);
      const initialTime = origin.updatedAt;
      origin.unwatch({ row: 6, col: 3 });

      expect(origin.updatedAt).toBeGreaterThanOrEqual(initialTime);
    });

    test('should update timestamp on awareness upgrade', () => {
      const initialTime = origin.updatedAt;
      origin.upgradeAwareness(SelfAwarenessLevel.ADVANCED);

      expect(origin.updatedAt).toBeGreaterThanOrEqual(initialTime);
    });
  });
});

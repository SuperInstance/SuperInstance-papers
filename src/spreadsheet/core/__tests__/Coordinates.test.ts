/**
 * Unit Tests for Coordinates
 *
 * Tests the origin-centered coordinate system including:
 * - Absolute and relative coordinate transformations
 * - Distance calculations
 * - Adjacency detection
 * - Direction finding
 * - Range operations
 * - Utility functions
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  OriginCenteredCoordinates,
  CoordinateUtils,
  CellPosition,
  RelativePosition,
  CellReference,
  CellRange,
} from '../Coordinates';

describe('OriginCenteredCoordinates', () => {
  let coords: OriginCenteredCoordinates;
  let originPos: CellPosition;

  beforeEach(() => {
    originPos = { row: 5, col: 3, sheet: 'Sheet1' };
    coords = new OriginCenteredCoordinates(originPos);
  });

  describe('Construction', () => {
    test('should create with absolute position', () => {
      expect(coords.getAbsolutePosition()).toEqual(originPos);
    });

    test('should create without sheet', () => {
      const noSheetCoords = new OriginCenteredCoordinates({ row: 0, col: 0 });
      expect(noSheetCoords.getAbsolutePosition()).toEqual({ row: 0, col: 0 });
    });
  });

  describe('toRelative - Absolute to Relative', () => {
    test('should convert same position to (0, 0)', () => {
      const relative = coords.toRelative(originPos);
      expect(relative.dRow).toBe(0);
      expect(relative.dCol).toBe(0);
    });

    test('should convert position below origin', () => {
      const below = { row: 6, col: 3 };
      const relative = coords.toRelative(below);
      expect(relative.dRow).toBe(1);
      expect(relative.dCol).toBe(0);
    });

    test('should convert position above origin', () => {
      const above = { row: 4, col: 3 };
      const relative = coords.toRelative(above);
      expect(relative.dRow).toBe(-1);
      expect(relative.dCol).toBe(0);
    });

    test('should convert position to right of origin', () => {
      const right = { row: 5, col: 4 };
      const relative = coords.toRelative(right);
      expect(relative.dRow).toBe(0);
      expect(relative.dCol).toBe(1);
    });

    test('should convert position to left of origin', () => {
      const left = { row: 5, col: 2 };
      const relative = coords.toRelative(left);
      expect(relative.dRow).toBe(0);
      expect(relative.dCol).toBe(-1);
    });

    test('should convert diagonal position', () => {
      const diagonal = { row: 7, col: 5 };
      const relative = coords.toRelative(diagonal);
      expect(relative.dRow).toBe(2);
      expect(relative.dCol).toBe(2);
    });
  });

  describe('toAbsolute - Relative to Absolute', () => {
    test('should convert (0, 0) to origin', () => {
      const absolute = coords.toAbsolute({ dRow: 0, dCol: 0 });
      expect(absolute).toEqual(originPos);
    });

    test('should convert relative position below', () => {
      const absolute = coords.toAbsolute({ dRow: 1, dCol: 0 });
      expect(absolute).toEqual({ row: 6, col: 3, sheet: 'Sheet1' });
    });

    test('should convert relative position above', () => {
      const absolute = coords.toAbsolute({ dRow: -1, dCol: 0 });
      expect(absolute).toEqual({ row: 4, col: 3, sheet: 'Sheet1' });
    });

    test('should convert relative position to right', () => {
      const absolute = coords.toAbsolute({ dRow: 0, dCol: 1 });
      expect(absolute).toEqual({ row: 5, col: 4, sheet: 'Sheet1' });
    });

    test('should convert diagonal relative position', () => {
      const absolute = coords.toAbsolute({ dRow: 2, dCol: -1 });
      expect(absolute).toEqual({ row: 7, col: 2, sheet: 'Sheet1' });
    });
  });

  describe('Round-trip Conversion', () => {
    test('should preserve position through round trip', () => {
      const original = { row: 10, col: 7 };
      const relative = coords.toRelative(original);
      const back = coords.toAbsolute(relative);

      expect(back).toEqual({ ...original, sheet: 'Sheet1' });
    });

    test('should handle multiple round trips', () => {
      const positions = [
        { row: 0, col: 0 },
        { row: 100, col: 50 },
        { row: -5, col: -3 },
      ];

      positions.forEach((pos) => {
        const relative = coords.toRelative(pos);
        const back = coords.toAbsolute(relative);
        expect(back.row).toBe(pos.row);
        expect(back.col).toBe(pos.col);
      });
    });
  });

  describe('isOrigin', () => {
    test('should detect origin from absolute position', () => {
      expect(coords.isOrigin(originPos)).toBe(true);
      expect(coords.isOrigin({ row: 6, col: 3 })).toBe(false);
    });

    test('should detect origin from relative position', () => {
      expect(coords.isOrigin({ dRow: 0, dCol: 0 })).toBe(true);
      expect(coords.isOrigin({ dRow: 1, dCol: 0 })).toBe(false);
      expect(coords.isOrigin({ dRow: 0, dCol: 1 })).toBe(false);
    });
  });

  describe('Distance Calculations', () => {
    test('should calculate Manhattan distance between positions', () => {
      const pos1 = { row: 0, col: 0 };
      const pos2 = { row: 3, col: 4 };
      const distance = coords.manhattanDistance(pos1, pos2);

      expect(distance).toBe(7); // |3-0| + |4-0| = 3 + 4
    });

    test('should calculate Euclidean distance between positions', () => {
      const pos1 = { row: 0, col: 0 };
      const pos2 = { row: 3, col: 4 };
      const distance = coords.euclideanDistance(pos1, pos2);

      expect(distance).toBe(5); // sqrt(3^2 + 4^2) = 5
    });

    test('should calculate distance to another cell', () => {
      const other = { row: 7, col: 6 };
      const distance = coords.distanceTo(other);

      expect(distance).toBe(5); // |7-5| + |6-3| = 2 + 3
    });
  });

  describe('Adjacency Detection', () => {
    test('should detect adjacent cells (including diagonal)', () => {
      expect(coords.isAdjacent({ row: 5, col: 3 })).toBe(true); // Same
      expect(coords.isAdjacent({ row: 4, col: 3 })).toBe(true); // North
      expect(coords.isAdjacent({ row: 6, col: 3 })).toBe(true); // South
      expect(coords.isAdjacent({ row: 5, col: 2 })).toBe(true); // West
      expect(coords.isAdjacent({ row: 5, col: 4 })).toBe(true); // East
      expect(coords.isAdjacent({ row: 4, col: 2 })).toBe(true); // NW
      expect(coords.isAdjacent({ row: 4, col: 4 })).toBe(true); // NE
      expect(coords.isAdjacent({ row: 6, col: 2 })).toBe(true); // SW
      expect(coords.isAdjacent({ row: 6, col: 4 })).toBe(true); // SE
    });

    test('should reject non-adjacent cells', () => {
      expect(coords.isAdjacent({ row: 3, col: 3 })).toBe(false);
      expect(coords.isAdjacent({ row: 7, col: 5 })).toBe(false);
    });

    test('should detect directly connected cells (no diagonal)', () => {
      expect(coords.isDirectlyConnected({ row: 4, col: 3 })).toBe(true); // North
      expect(coords.isDirectlyConnected({ row: 6, col: 3 })).toBe(true); // South
      expect(coords.isDirectlyConnected({ row: 5, col: 2 })).toBe(true); // West
      expect(coords.isDirectlyConnected({ row: 5, col: 4 })).toBe(true); // East
      expect(coords.isDirectlyConnected({ row: 4, col: 2 })).toBe(false); // NW diagonal
      expect(coords.isDirectlyConnected({ row: 4, col: 4 })).toBe(false); // NE diagonal
    });
  });

  describe('Direction Finding', () => {
    test('should get direction for each cardinal direction', () => {
      expect(coords.getDirection({ row: 4, col: 3 })).toBe('N');
      expect(coords.getDirection({ row: 6, col: 3 })).toBe('S');
      expect(coords.getDirection({ row: 5, col: 2 })).toBe('W');
      expect(coords.getDirection({ row: 5, col: 4 })).toBe('E');
    });

    test('should get direction for diagonals', () => {
      expect(coords.getDirection({ row: 4, col: 2 })).toBe('NW');
      expect(coords.getDirection({ row: 4, col: 4 })).toBe('NE');
      expect(coords.getDirection({ row: 6, col: 2 })).toBe('SW');
      expect(coords.getDirection({ row: 6, col: 4 })).toBe('SE');
    });

    test('should identify origin direction', () => {
      expect(coords.getDirection(originPos)).toBe('HERE');
    });

    test('should get direction for distant cells', () => {
      expect(coords.getDirection({ row: 0, col: 3 })).toBe('N');
      expect(coords.getDirection({ row: 10, col: 3 })).toBe('S');
    });
  });

  describe('Neighbor Discovery', () => {
    test('should get all adjacent cells (8 neighbors)', () => {
      const adjacent = coords.getAdjacentCells();

      expect(adjacent).toHaveLength(8);
      expect(adjacent).toContainEqual({ row: 4, col: 2, sheet: 'Sheet1' }); // NW
      expect(adjacent).toContainEqual({ row: 4, col: 3, sheet: 'Sheet1' }); // N
      expect(adjacent).toContainEqual({ row: 4, col: 4, sheet: 'Sheet1' }); // NE
      expect(adjacent).toContainEqual({ row: 5, col: 2, sheet: 'Sheet1' }); // W
      expect(adjacent).toContainEqual({ row: 5, col: 4, sheet: 'Sheet1' }); // E
      expect(adjacent).toContainEqual({ row: 6, col: 2, sheet: 'Sheet1' }); // SW
      expect(adjacent).toContainEqual({ row: 6, col: 3, sheet: 'Sheet1' }); // S
      expect(adjacent).toContainEqual({ row: 6, col: 4, sheet: 'Sheet1' }); // SE
    });

    test('should not include origin in adjacent cells', () => {
      const adjacent = coords.getAdjacentCells();
      expect(adjacent).not.toContainEqual(originPos);
    });

    test('should get directly connected cells (4 neighbors)', () => {
      const connected = coords.getDirectlyConnectedCells();

      expect(connected).toHaveLength(4);
      expect(connected).toContainEqual({ row: 4, col: 3, sheet: 'Sheet1' }); // N
      expect(connected).toContainEqual({ row: 6, col: 3, sheet: 'Sheet1' }); // S
      expect(connected).toContainEqual({ row: 5, col: 2, sheet: 'Sheet1' }); // W
      expect(connected).toContainEqual({ row: 5, col: 4, sheet: 'Sheet1' }); // E
    });

    test('should get cells in range', () => {
      const cells = coords.getCellsInRange(2);

      // Should have (2*2+1)^2 - 1 = 24 cells (excluding origin)
      expect(cells.length).toBe(24);
    });
  });

  describe('Direction-based Cell Discovery', () => {
    test('should get cell in specific direction', () => {
      const north = coords.getCellInDirection('N', 1);
      expect(north).toEqual({ row: 4, col: 3, sheet: 'Sheet1' });

      const east = coords.getCellInDirection('E', 1);
      expect(east).toEqual({ row: 5, col: 4, sheet: 'Sheet1' });
    });

    test('should get cell at distance', () => {
      const farNorth = coords.getCellInDirection('N', 3);
      expect(farNorth).toEqual({ row: 2, col: 3, sheet: 'Sheet1' });
    });

    test('should handle all 8 directions', () => {
      expect(coords.getCellInDirection('NW', 1)).toEqual({ row: 4, col: 2, sheet: 'Sheet1' });
      expect(coords.getCellInDirection('NE', 1)).toEqual({ row: 4, col: 4, sheet: 'Sheet1' });
      expect(coords.getCellInDirection('SW', 1)).toEqual({ row: 6, col: 2, sheet: 'Sheet1' });
      expect(coords.getCellInDirection('SE', 1)).toEqual({ row: 6, col: 4, sheet: 'Sheet1' });
    });

    test('should return null for invalid direction', () => {
      const invalid = coords.getCellInDirection('INVALID', 1);
      expect(invalid).toBeNull();
    });
  });

  describe('Range Operations', () => {
    test('should create range to another cell', () => {
      const other = { row: 10, col: 10 };
      const range = coords.createRangeTo(other);

      expect(range.start).toEqual(originPos);
      expect(range.end).toEqual(other);
    });

    test('should check if position is in range', () => {
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 10, col: 10 },
      };

      expect(coords.isInRange({ row: 5, col: 5 }, range)).toBe(true);
      expect(coords.isInRange({ row: 0, col: 0 }, range)).toBe(true);
      expect(coords.isInRange({ row: 10, col: 10 }, range)).toBe(true);
      expect(coords.isInRange({ row: 11, col: 5 }, range)).toBe(false);
    });

    test('should handle reversed range', () => {
      const range: CellRange = {
        start: { row: 10, col: 10 },
        end: { row: 0, col: 0 },
      };

      expect(coords.isInRange({ row: 5, col: 5 }, range)).toBe(true);
    });
  });

  describe('Normalization', () => {
    test('should normalize relative position', () => {
      const relative = { dRow: -10, dCol: -5 };
      const normalized = coords.normalize(relative, 0, 0);

      expect(normalized.row).toBe(0);
      expect(normalized.col).toBe(0);
    });

    test('should keep valid positions unchanged', () => {
      const relative = { dRow: 1, dCol: 1 };
      const normalized = coords.normalize(relative, 0, 0);

      expect(normalized.row).toBe(6);
      expect(normalized.col).toBe(4);
    });
  });

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      const json = coords.toJSON();

      expect(json).toHaveProperty('absolutePosition');
      expect(json.absolutePosition).toEqual(originPos);
    });

    test('should deserialize from JSON', () => {
      const json = coords.toJSON();
      const restored = OriginCenteredCoordinates.fromJSON(json);

      expect(restored.getAbsolutePosition()).toEqual(originPos);
    });
  });

  describe('String Representation', () => {
    test('should convert to string', () => {
      const str = coords.toString();
      expect(str).toContain('OriginCenteredCoordinates');
      expect(str).toContain('5');
      expect(str).toContain('3');
    });
  });
});

describe('CoordinateUtils', () => {
  describe('Column Letter Conversion', () => {
    test('should convert single column letters', () => {
      expect(CoordinateUtils.columnToLetter(0)).toBe('A');
      expect(CoordinateUtils.columnToLetter(1)).toBe('B');
      expect(CoordinateUtils.columnToLetter(25)).toBe('Z');
    });

    test('should convert double column letters', () => {
      expect(CoordinateUtils.columnToLetter(26)).toBe('AA');
      expect(CoordinateUtils.columnToLetter(27)).toBe('AB');
      expect(CoordinateUtils.columnToLetter(51)).toBe('AZ');
      expect(CoordinateUtils.columnToLetter(52)).toBe('BA');
    });

    test('should convert triple column letters', () => {
      expect(CoordinateUtils.columnToLetter(702)).toBe('AAA');
      expect(CoordinateUtils.columnToLetter(703)).toBe('AAB');
    });

    test('should convert letters back to columns', () => {
      expect(CoordinateUtils.letterToColumn('A')).toBe(0);
      expect(CoordinateUtils.letterToColumn('Z')).toBe(25);
      expect(CoordinateUtils.letterToColumn('AA')).toBe(26);
      expect(CoordinateUtils.letterToColumn('AZ')).toBe(51);
      expect(CoordinateUtils.letterToColumn('BA')).toBe(52);
    });

    test('should handle lowercase letters', () => {
      expect(CoordinateUtils.letterToColumn('a')).toBe(0);
      expect(CoordinateUtils.letterToColumn('z')).toBe(25);
      expect(CoordinateUtils.letterToColumn('aa')).toBe(26);
    });
  });

  describe('A1 Notation', () => {
    test('should convert position to A1 notation', () => {
      expect(CoordinateUtils.toA1Notation({ row: 0, col: 0 })).toBe('A1');
      expect(CoordinateUtils.toA1Notation({ row: 0, col: 25 })).toBe('Z1');
      expect(CoordinateUtils.toA1Notation({ row: 9, col: 0 })).toBe('A10');
      expect(CoordinateUtils.toA1Notation({ row: 9, col: 26 })).toBe('AA10');
    });

    test('should parse A1 notation to position', () => {
      expect(CoordinateUtils.fromA1Notation('A1')).toEqual({ row: 0, col: 0 });
      expect(CoordinateUtils.fromA1Notation('Z1')).toEqual({ row: 0, col: 25 });
      expect(CoordinateUtils.fromA1Notation('A10')).toEqual({ row: 9, col: 0 });
      expect(CoordinateUtils.fromA1Notation('AA10')).toEqual({ row: 9, col: 26 });
    });

    test('should handle lowercase A1 notation', () => {
      expect(CoordinateUtils.fromA1Notation('a1')).toEqual({ row: 0, col: 0 });
      expect(CoordinateUtils.fromA1Notation('z10')).toEqual({ row: 9, col: 25 });
    });

    test('should reject invalid A1 notation', () => {
      expect(() => CoordinateUtils.fromA1Notation('invalid')).toThrow();
      expect(() => CoordinateUtils.fromA1Notation('1A')).toThrow();
    });

    test('should round-trip A1 notation', () => {
      const positions = [
        { row: 0, col: 0 },
        { row: 10, col: 5 },
        { row: 999, col: 702 },
      ];

      positions.forEach((pos) => {
        const a1 = CoordinateUtils.toA1Notation(pos);
        const back = CoordinateUtils.fromA1Notation(a1);
        expect(back).toEqual(pos);
      });
    });
  });

  describe('Geometry Utils', () => {
    test('should calculate midpoint', () => {
      const pos1 = { row: 0, col: 0 };
      const pos2 = { row: 10, col: 10 };
      const mid = CoordinateUtils.midpoint(pos1, pos2);

      expect(mid).toEqual({ row: 5, col: 5 });
    });

    test('should calculate midpoint with odd difference', () => {
      const pos1 = { row: 0, col: 0 };
      const pos2 = { row: 9, col: 11 };
      const mid = CoordinateUtils.midpoint(pos1, pos2);

      expect(mid.row).toBe(5); // Rounds 4.5 to 5
      expect(mid.col).toBe(6); // Rounds 5.5 to 6
    });

    test('should detect collinear positions', () => {
      const pos1 = { row: 0, col: 0 };
      const pos2 = { row: 5, col: 5 };
      const pos3 = { row: 10, col: 10 };

      expect(CoordinateUtils.areCollinear(pos1, pos2, pos3)).toBe(true);
    });

    test('should detect non-collinear positions', () => {
      const pos1 = { row: 0, col: 0 };
      const pos2 = { row: 5, col: 5 };
      const pos3 = { row: 10, col: 11 };

      expect(CoordinateUtils.areCollinear(pos1, pos2, pos3)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero values', () => {
      const coords = new OriginCenteredCoordinates({ row: 0, col: 0 });
      expect(coords.getAbsolutePosition()).toEqual({ row: 0, col: 0 });
    });

    test('should handle very large values', () => {
      const largePos = { row: 1000000, col: 1000000 };
      const coords = new OriginCenteredCoordinates(largePos);
      expect(coords.getAbsolutePosition()).toEqual(largePos);
    });

    test('should handle negative relative positions', () => {
      const coords = new OriginCenteredCoordinates({ row: 10, col: 10 });
      const relative = coords.toRelative({ row: 0, col: 0 });

      expect(relative.dRow).toBe(-10);
      expect(relative.dCol).toBe(-10);
    });
  });
});

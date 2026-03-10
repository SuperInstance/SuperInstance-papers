/**
 * Custom Assertion Examples - Demonstrates AssertionHelpers usage
 *
 * Run with: npm test assertions.test.ts
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  AssertionHelpers,
  CellTestHelper,
  matchers
} from '../../src/spreadsheet/testing';
import type { LogCell } from '../../src/spreadsheet/LogCell';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveCellState(state: any): R;
      toHaveCellValue(value: any, tolerance?: number): R;
      toHaveCellDependencies(deps: string[]): R;
      toHaveLearned(pattern: any): R;
      toBeWithinRange(min: number, max: number): R;
      toBeApproximate(value: number, tolerance?: number): R;
    }
  }
}

expect.extend(matchers);

describe('Custom Assertion Examples', () => {
  let cell: LogCell;

  beforeEach(() => {
    cell = CellTestHelper.createTestCell({
      type: 'transform',
      mocks: { memory: { history: [], patterns: [], learnings: [] } }
    });
  });

  describe('Cell Assertions', () => {
    it('should assert cell state using custom matcher', () => {
      expect(cell).toHaveCellState('ready' as any);
    });

    it('should assert cell value with tolerance', () => {
      // Assuming cell sets output to 42
      (cell as any).output = 42.05;

      expect(cell).toHaveCellValue(42, 0.1);
    });

    it('should assert cell dependencies', () => {
      const depCell = CellTestHelper.createTestCell();
      cell.addDependency(depCell);

      expect(cell).toHaveCellDependencies([depCell.id]);
    });

    it('should throw on assertion failure', () => {
      expect(() => {
        AssertionHelpers.assertCellState(cell, 'invalid' as any);
      }).toThrow(AssertionError);
    });
  });

  describe('Sensation Assertions', () => {
    it('should assert sensation type', () => {
      const sensation = CellTestHelper.createMockSensation(
        'absolute',
        'source-cell',
        42
      );

      AssertionHelpers.assertSensationType(sensation, 'absolute');
    });

    it('should assert sensation confidence', () => {
      const sensation = CellTestHelper.createMockSensation(
        'absolute',
        'source-cell',
        42
      );
      sensation.confidence = 0.95;

      AssertionHelpers.assertSensationConfidence(sensation, 0.9);
    });

    it('should assert sensation source', () => {
      const sensation = CellTestHelper.createMockSensation(
        'absolute',
        'test-source',
        42
      );

      AssertionHelpers.assertSensationSource(sensation, 'test-source');
    });

    it('should assert cell sensations', () => {
      const sensation = CellTestHelper.createMockSensation(
        'absolute',
        'source-cell',
        42
      );

      const cellWithSensation = CellTestHelper.createTestCell({
        mocks: { sensation: [sensation] }
      });

      AssertionHelpers.assertCellSensations(cellWithSensation, {
        types: ['absolute'],
        sources: ['source-cell'],
        minConfidence: 0.5
      });
    });
  });

  describe('Consciousness Assertions', () => {
    it('should assert cell learns', () => {
      const learningCell = CellTestHelper.createTestCell({
        mocks: {
          memory: {
            history: [],
            patterns: [],
            learnings: [{ pattern: 'test', confidence: 0.9 }]
          }
        }
      });

      AssertionHelpers.assertCellLearns(learningCell, 1);
    });

    it('should assert cell recognizes patterns', () => {
      const patternCell = CellTestHelper.createTestCell({
        mocks: {
          memory: {
            history: [],
            patterns: [{ type: 'trend', value: 'increasing' }],
            learnings: []
          }
        }
      });

      AssertionHelpers.assertCellRecognizesPatterns(patternCell, 1);
    });

    it('should assert cell has memory', () => {
      const memoryCell = CellTestHelper.createTestCell({
        mocks: {
          memory: {
            history: [
              { timestamp: Date.now(), state: 'ready', input: 1, output: 2 }
            ],
            patterns: [],
            learnings: []
          }
        }
      });

      AssertionHelpers.assertCellHasMemory(memoryCell, 1);
    });
  });

  describe('Performance Assertions', () => {
    it('should assert execution time', async () => {
      await AssertionHelpers.assertExecutionTime(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
        100 // max 100ms
      );
    });

    it('should fail on slow execution', async () => {
      await expect(
        AssertionHelpers.assertExecutionTime(
          async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
          },
          50 // max 50ms
        )
      ).rejects.toThrow(AssertionError);
    });

    it('should assert ops per second', async () => {
      await AssertionHelpers.assertOpsPerSecond(
        async () => {
          // Fast operation
          await Promise.resolve();
        },
        100, // minimum 100 ops/sec
        500 // test for 500ms
      );
    });

    it('should assert memory usage', async () => {
      await AssertionHelpers.assertMemoryUsage(
        async () => {
          const arr = new Array(1000).fill(0);
          return arr.length;
        },
        1024 * 1024 // max 1MB
      );
    });
  });

  describe('Utility Assertions', () => {
    it('should assert value in range', () => {
      AssertionHelpers.assertInRange(50, 0, 100);
    });

    it('should use range matcher', () => {
      expect(50).toBeWithinRange(0, 100);
    });

    it('should assert approximate equality', () => {
      AssertionHelpers.assertApproximate(3.14159, 3.14, 0.01);
    });

    it('should use approximate matcher', () => {
      expect(3.14159).toBeApproximate(3.14, 0.01);
    });

    it('should assert array contains element', () => {
      AssertionHelpers.assertContains([1, 2, 3], 2);
    });

    it('should assert array length', () => {
      AssertionHelpers.assertArrayLength([1, 2, 3], 3);
    });

    it('should assert object has property', () => {
      AssertionHelpers.assertHasProperty({ name: 'test' }, 'name');
    });
  });

  describe('Soft Assertions', () => {
    it('should collect soft assertion results', () => {
      const results = AssertionHelpers.softAssert([
        () => AssertionHelpers.assertInRange(50, 0, 100),
        () => AssertionHelpers.assertInRange(150, 0, 100),
        () => AssertionHelpers.assertArrayLength([1, 2], 2)
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(false);
      expect(results[2].passed).toBe(true);
    });

    it('should assert all pass', () => {
      const results = AssertionHelpers.softAssert([
        () => AssertionHelpers.assertInRange(50, 0, 100),
        () => AssertionHelpers.assertArrayLength([1, 2], 2)
      ]);

      expect(() => {
        AssertionHelpers.assertAllPass(results);
      }).not.toThrow();
    });

    it('should fail if any soft assertion fails', () => {
      const results = AssertionHelpers.softAssert([
        () => AssertionHelpers.assertInRange(50, 0, 100),
        () => AssertionHelpers.assertInRange(150, 0, 100)
      ]);

      expect(() => {
        AssertionHelpers.assertAllPass(results);
      }).toThrow();
    });
  });

  describe('Async Assertions', () => {
    it('should assert promise throws', async () => {
      await expect(
        AssertionHelpers.assertThrows(
          Promise.reject(new Error('test error')),
          'test error'
        )
      ).resolves.toThrow('test error');
    });

    it('should assert promise throws with specific type', async () => {
      await expect(
        AssertionHelpers.assertThrows(
          Promise.reject(new TypeError('type error')),
          TypeError
        )
      ).resolves.toBeDefined();
    });

    it('should assert promise throws with regex', async () => {
      await expect(
        AssertionHelpers.assertThrows(
          Promise.reject(new Error('Error: ABC123')),
          /ABC\d{3}/
        )
      ).resolves.toBeDefined();
    });
  });

  describe('Deep Equality', () => {
    it('should check deep equality', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 2 } };
      const obj3 = { a: 1, b: { c: 3 } };

      expect(AssertionHelpers.deepEqual(obj1, obj2)).toBe(true);
      expect(AssertionHelpers.deepEqual(obj1, obj3)).toBe(false);
    });

    it('should handle arrays', () => {
      const arr1 = [1, 2, [3, 4]];
      const arr2 = [1, 2, [3, 4]];

      expect(AssertionHelpers.deepEqual(arr1, arr2)).toBe(true);
    });

    it('should handle nested structures', () => {
      const obj1 = {
        items: [{ id: 1, value: 'a' }, { id: 2, value: 'b' }],
        metadata: { count: 2 }
      };

      const obj2 = {
        items: [{ id: 1, value: 'a' }, { id: 2, value: 'b' }],
        metadata: { count: 2 }
      };

      expect(AssertionHelpers.deepEqual(obj1, obj2)).toBe(true);
    });
  });
});

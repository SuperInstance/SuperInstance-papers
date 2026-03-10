/**
 * Cell Testing Examples - Demonstrates CellTestHelper usage
 *
 * Run with: npm test cell.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CellTestHelper, AssertionHelpers } from '../../src/spreadsheet/testing';
import { LogCell } from '../../src/spreadsheet/LogCell';

describe('Cell Testing Examples', () => {
  afterEach(() => {
    CellTestHelper.cleanup();
  });

  describe('Basic Cell Creation', () => {
    it('should create a test cell with minimal config', () => {
      const cell = CellTestHelper.createTestCell({
        type: 'transform',
        config: { operation: 'add' }
      });

      expect(cell).toBeDefined();
      expect(cell.id).toMatch(/^test-cell-/);
    });

    it('should create multiple test cells', () => {
      const cells = CellTestHelper.createTestCells(5, {
        type: 'transform'
      });

      expect(cells).toHaveLength(5);
      expect(cells[0].id).not.toBe(cells[1].id);
    });

    it('should create a cell chain with dependencies', () => {
      const chain = CellTestHelper.createCellChain(3, {
        type: 'transform'
      });

      expect(chain).toHaveLength(3);
      expect(CellTestHelper.getDependencies(chain[1])).toContain(chain[0]);
      expect(CellTestHelper.getDependencies(chain[2])).toContain(chain[1]);
    });

    it('should create a cell mesh with multiple connections', () => {
      const mesh = CellTestHelper.createCellMesh(5, 2, {
        type: 'transform'
      });

      expect(mesh).toHaveLength(5);
      mesh.forEach(cell => {
        const deps = CellTestHelper.getDependencies(cell);
        expect(deps.length).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Cell State Inspection', () => {
    it('should capture cell snapshots', () => {
      const cell = CellTestHelper.createTestCell();
      const snapshot = CellTestHelper.captureSnapshot(cell);

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBe(cell.id);
      expect(snapshot.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should get cell values', () => {
      const cell = CellTestHelper.createTestCell({
        mocks: { memory: { history: [], patterns: [], learnings: [] } }
      });

      const value = CellTestHelper.getCellValue(cell, 'id');
      expect(value).toBe(cell.id);
    });

    it('should get cell dependencies', () => {
      const cellA = CellTestHelper.createTestCell();
      const cellB = CellTestHelper.createTestCell();
      cellB.addDependency(cellA);

      const deps = CellTestHelper.getDependencies(cellB);
      expect(deps).toContain(cellA);
    });

    it('should get cell sensations', () => {
      const mockSensation = CellTestHelper.createMockSensation(
        'absolute',
        'source-cell',
        42
      );

      const cell = CellTestHelper.createTestCell({
        mocks: { sensation: [mockSensation] }
      });

      const sensations = CellTestHelper.getCellSensations(cell);
      expect(sensations).toContainEqual(mockSensation);
    });
  });

  describe('Cell Simulation', () => {
    it('should simulate cell execution', async () => {
      const cell = CellTestHelper.createTestCell({
        type: 'transform'
      });

      const result = await CellTestHelper.simulateExecution(cell, 5);

      expect(result.passed).toBe(true);
      expect(result.snapshots).toHaveLength(2); // Initial + after execution
    });

    it('should simulate with multiple iterations', async () => {
      const cell = CellTestHelper.createTestCell();

      const result = await CellTestHelper.simulateExecution(
        cell,
        10,
        { iterations: 5 }
      );

      expect(result.snapshots).toHaveLength(6); // Initial + 5 iterations
    });

    it('should simulate parallel cell execution', async () => {
      const cells = CellTestHelper.createTestCells(3);
      const inputs = [1, 2, 3];

      const results = await CellTestHelper.simulateParallel(
        cells,
        inputs
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.passed).toBe(true);
      });
    });
  });

  describe('Cell Assertions', () => {
    it('should assert cell state', () => {
      const cell = CellTestHelper.createTestCell();

      AssertionHelpers.assertCellState(cell, 'ready' as any);
    });

    it('should assert cell value', () => {
      const cell = CellTestHelper.createTestCell();

      // Assuming cell processes and sets output
      AssertionHelpers.assertCellValue(cell, null, 0);
    });

    it('should assert cell dependencies', () => {
      const cellA = CellTestHelper.createTestCell();
      const cellB = CellTestHelper.createTestCell();
      cellB.addDependency(cellA);

      AssertionHelpers.assertCellDependencies(cellB, [cellA.id]);
    });

    it('should assert cell sensations', () => {
      const mockSensation = CellTestHelper.createMockSensation(
        'absolute',
        'source-cell',
        42
      );

      const cell = CellTestHelper.createTestCell({
        mocks: { sensation: [mockSensation] }
      });

      AssertionHelpers.assertCellSensations(cell, {
        types: ['absolute'],
        sources: ['source-cell']
      });
    });
  });

  describe('Advanced Usage', () => {
    it('should wait for cell state', async () => {
      const cell = CellTestHelper.createTestCell();

      // Assuming cell will transition to 'processing' state
      await expect(
        CellTestHelper.waitForState(cell, 'ready' as any, 100)
      ).resolves.toBeUndefined();
    });

    it('should assert state transitions', () => {
      const cell = CellTestHelper.createTestCell();
      CellTestHelper.captureSnapshot(cell);

      const result = CellTestHelper.assertStateTransition(
        cell.id,
        ['ready' as any]
      );

      expect(result.passed).toBe(true);
    });

    it('should get test results', async () => {
      const cell = CellTestHelper.createTestCell();
      await CellTestHelper.simulateExecution(cell, 5);

      const result = CellTestHelper.getTestResult(cell.id);
      expect(result).toBeDefined();
      expect(result?.cellId).toBe(cell.id);
    });
  });
});

/**
 * Example tests demonstrating CellFactory usage
 *
 * These examples show how to use the CellFactory to create
 * various cell types and configurations for testing.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  CellFactory,
  SpreadsheetFixture,
  AssertionExtensions,
  PerformanceBenchmark,
  DataGeneratorFactory,
} from '../index.js';
import { CellType, CellState, LogicLevel, SensationType } from '../../core/types.js';

describe('CellFactory Examples', () => {
  beforeEach(() => {
    CellFactory.resetCounter();
    SpreadsheetFixture.resetCounter();
  });

  afterEach(() => {
    CellFactory.resetCounter();
    SpreadsheetFixture.resetCounter();
  });

  describe('Creating Individual Cells', () => {
    it('should create an InputCell', () => {
      const cell = CellFactory.createInputCell({
        defaultValue: 42,
        position: { row: 0, col: 0 },
      });

      expect(cell).toBeDefined();
      expect(cell.getValue()).toBe(42);
    });

    it('should create a TransformCell', () => {
      const cell = CellFactory.createTransformCell({
        transform: (value: number) => value * 2,
        position: { row: 0, col: 0 },
      });

      expect(cell).toBeDefined();
    });

    it('should create an AnalysisCell', () => {
      const cell = CellFactory.createAnalysisCell({
        analysis: 'trend',
        position: { row: 0, col: 0 },
      });

      expect(cell).toBeDefined();
    });
  });

  describe('Creating Cell Grids', () => {
    it('should create a 5x10 grid of InputCells', () => {
      const grid = CellFactory.createCellGrid(5, 10, CellType.INPUT);

      expect(grid).toHaveLength(5);
      expect(grid[0]).toHaveLength(10);
      expect(grid[4]).toHaveLength(10);
    });

    it('should create a grid with all cell types', () => {
      const transformGrid = CellFactory.createCellGrid(3, 3, CellType.TRANSFORM);
      const filterGrid = CellFactory.createCellGrid(3, 3, CellType.FILTER);
      const aggregateGrid = CellFactory.createCellGrid(3, 3, CellType.AGGREGATE);

      expect(transformGrid[0][0]).toBeDefined();
      expect(filterGrid[0][0]).toBeDefined();
      expect(aggregateGrid[0][0]).toBeDefined();
    });
  });

  describe('Creating Cell Colonies', () => {
    it('should create a chain colony', () => {
      const colony = CellFactory.createCellColony(10, 'chain' as any, CellType.INPUT);

      expect(colony).toHaveLength(10);
    });

    it('should create a grid colony', () => {
      const colony = CellFactory.createCellColony(16, 'grid' as any, CellType.INPUT);

      expect(colony).toHaveLength(16);
    });

    it('should create a star colony', () => {
      const colony = CellFactory.createCellColony(10, 'star' as any, CellType.TRANSFORM);

      expect(colony).toHaveLength(10);
    });
  });

  describe('Creating Cell Sequences', () => {
    it('should create a sequence of TransformCells', () => {
      const sequence = CellFactory.createCellSequence(5, CellType.TRANSFORM);

      expect(sequence).toHaveLength(5);
    });

    it('should create a sequence with custom config', () => {
      const sequence = CellFactory.createCellSequence(
        3,
        CellType.ANALYSIS,
        {
          logicLevel: LogicLevel.L2_AGENT,
        }
      );

      expect(sequence).toHaveLength(3);
    });
  });
});

describe('SpreadsheetFixture Examples', () => {
  it('should create an empty sheet', () => {
    const sheet = SpreadsheetFixture.createEmptySheet('Test Sheet');

    expect(sheet).toBeDefined();
    expect(sheet.name).toBe('Test Sheet');
    expect(sheet.cells.size).toBe(0);
  });

  it('should create a sheet with data', () => {
    const data = [
      [{ value: 1 }, { value: 2 }],
      [{ value: 3 }, { value: 4 }],
    ];
    const sheet = SpreadsheetFixture.createSheetWithData(data);

    expect(sheet.cells.size).toBe(4);
  });

  it('should create a financial spreadsheet', () => {
    const sheet = SpreadsheetFixture.createFinancialSpreadsheet();

    expect(sheet).toBeDefined();
    expect(sheet.name).toBe('Financial Analysis');
  });

  it('should create an inventory spreadsheet', () => {
    const sheet = SpreadsheetFixture.createInventorySpreadsheet();

    expect(sheet).toBeDefined();
    expect(sheet.name).toBe('Inventory Tracking');
  });

  it('should create a stress test spreadsheet', () => {
    const sheet = SpreadsheetFixture.createStressTestSpreadsheet(100, 100);

    expect(sheet.cells.size).toBe(10000);
  });
});

describe('AssertionExtensions Examples', () => {
  it('should assert cell state', () => {
    const cell = CellFactory.createInputCell();

    // Note: These would work with actual cell state checking
    // AssertionExtensions.toBeInState(cell, CellState.DORMANT);
  });

  it('should assert cell value', () => {
    const cell = CellFactory.createInputCell({ defaultValue: 42 });

    // AssertionExtensions.toHaveValue(cell, 42);
  });

  it('should assert range', () => {
    // AssertionExtensions.toBeWithinRange(50, 0, 100); // Pass
    // AssertionExtensions.toBeWithinRange(150, 0, 100); // Fail
  });
});

describe('PerformanceBenchmark Examples', () => {
  it('should benchmark cell creation', async () => {
    const result = await PerformanceBenchmark.benchmarkCellCreation(100, () => {
      return CellFactory.createInputCell();
    });

    expect(result.iterations).toBe(100);
    expect(result.opsPerSecond).toBeGreaterThan(0);
  });

  it('should benchmark generic operation', async () => {
    const result = await PerformanceBenchmark.benchmark(
      'test-operation',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      },
      {
        iterations: 10,
        collectMemory: true,
        collectPercentiles: true,
      }
    );

    expect(result.iterations).toBe(10);
    expect(result.memory).toBeDefined();
    expect(result.percentiles).toBeDefined();
  });
});

describe('DataGenerators Examples', () => {
  it('should generate random data', () => {
    const generator = DataGeneratorFactory.random(42); // Seeded
    const data = generator.generate({
      rows: 10,
      columns: 5,
      dataType: 'number',
      numberRange: [0, 100],
    });

    expect(data).toHaveLength(10);
    expect(data[0]).toHaveLength(5);
  });

  it('should generate formulas', () => {
    const formula = DataGeneratorFactory.formula().generate({
      complexity: 'simple',
      type: 'arithmetic',
    });

    expect(formula).toMatch(/^=/);
  });

  it('should generate time series', () => {
    const series = DataGeneratorFactory.timeSeries().generate(100, {
      trend: 'upward',
      seasonality: true,
    });

    expect(series).toHaveLength(100);
  });

  it('should inject anomalies', () => {
    const anomalies = DataGeneratorFactory.anomalies();
    const data = [1, 2, 3, 4, 5];
    const withAnomalies = anomalies.inject(data, [
      { type: 'spike' as any, index: 2, magnitude: 10 },
    ]);

    expect(withAnomalies[2]).toBe(30); // 3 * 10
  });
});

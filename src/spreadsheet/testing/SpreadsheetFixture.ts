/**
 * SpreadsheetFixture - Fixtures for creating spreadsheet test scenarios
 *
 * Provides convenient methods for creating complete spreadsheet configurations
 * for testing purposes.
 */

import { CellFactory } from './CellFactory.js';
import type {
  CellData,
  TestScenario,
  CellConfig,
  RelationshipConfig,
  ExpectedBehavior,
} from './types.js';
import {
  CellType,
  CellState,
  SensationType,
} from '../core/types.js';

/**
 * Sheet interface for testing
 */
export interface Sheet {
  id: string;
  name: string;
  cells: Map<string, unknown>;
  relationships: RelationshipConfig[];
  metadata: {
    created: number;
    lastModified: number;
  };
}

/**
 * Fixture for creating spreadsheet test scenarios
 */
export class SpreadsheetFixture {
  private static sheetCounter = 0;

  /**
   * Create an empty sheet
   *
   * @param name - Optional name for the sheet
   * @returns An empty Sheet instance
   *
   * @example
   * ```typescript
   * const sheet = SpreadsheetFixture.createEmptySheet('Test Sheet');
   * ```
   */
  static createEmptySheet(name: string = 'Test Sheet'): Sheet {
    const sheetId = `sheet-${this.sheetCounter++}`;

    return {
      id: sheetId,
      name,
      cells: new Map(),
      relationships: [],
      metadata: {
        created: Date.now(),
        lastModified: Date.now(),
      },
    };
  }

  /**
   * Create a sheet with initial data
   *
   * @param data - 2D array of cell data
   * @param name - Optional name for the sheet
   * @returns A Sheet instance populated with data
   *
   * @example
   * ```typescript
   * const data: CellData[][] = [
   *   [{ value: 1 }, { value: 2 }],
   *   [{ value: 3 }, { value: 4 }]
   * ];
   * const sheet = SpreadsheetFixture.createSheetWithData(data);
   * ```
   */
  static createSheetWithData(data: CellData[][], name: string = 'Data Sheet'): Sheet {
    const sheet = this.createEmptySheet(name);

    data.forEach((row, rowIndex) => {
      row.forEach((cellData, colIndex) => {
        const cellId = `cell-${rowIndex}-${colIndex}`;
        const cell = CellFactory.createInputCell({
          position: { row: rowIndex, col: colIndex },
          defaultValue: cellData.value,
        });

        sheet.cells.set(cellId, cell);
      });
    });

    sheet.metadata.lastModified = Date.now();

    return sheet;
  }

  /**
   * Create a complex test scenario
   *
   * @param scenario - Test scenario configuration
   * @returns A Sheet instance configured for the scenario
   *
   * @example
   * ```typescript
   * const scenario: TestScenario = {
   *   name: 'Financial Analysis',
   *   cells: [
   *     { id: 'revenue', type: CellType.INPUT, position: { row: 0, col: 0 }, value: 1000 },
   *     { id: 'expenses', type: CellType.INPUT, position: { row: 1, col: 0 }, value: 500 }
   *   ],
   *   relationships: [
   *     { from: 'revenue', to: 'profit', type: 'data' }
   *   ],
   *   expectedBehaviors: []
   * };
   * const sheet = SpreadsheetFixture.createComplexScenario(scenario);
   * ```
   */
  static createComplexScenario(scenario: TestScenario): Sheet {
    const sheet = this.createEmptySheet(scenario.name);

    // Create cells
    scenario.cells.forEach((cellConfig) => {
      const cell = this.createCellFromConfig(cellConfig);
      sheet.cells.set(cellConfig.id, cell);
    });

    // Set up relationships
    sheet.relationships = scenario.relationships;

    // Run setup if provided
    if (scenario.setup) {
      // Setup would be run by the test framework
    }

    sheet.metadata.lastModified = Date.now();

    return sheet;
  }

  /**
   * Create a financial analysis spreadsheet
   *
   * @returns A Sheet configured for financial analysis
   */
  static createFinancialSpreadsheet(): Sheet {
    const data: CellData[][] = [
      [
        { value: 'Revenue', type: CellType.INPUT },
        { value: 100000, type: CellType.INPUT },
        { value: 120000, type: CellType.INPUT },
        { value: 115000, type: CellType.INPUT },
      ],
      [
        { value: 'Expenses', type: CellType.INPUT },
        { value: 60000, type: CellType.INPUT },
        { value: 70000, type: CellType.INPUT },
        { value: 65000, type: CellType.INPUT },
      ],
      [
        { value: 'Profit', type: CellType.TRANSFORM },
        { value: null, type: CellType.TRANSFORM },
        { value: null, type: CellType.TRANSFORM },
        { value: null, type: CellType.TRANSFORM },
      ],
      [
        { value: 'Margin', type: CellType.ANALYSIS },
        { value: null, type: CellType.ANALYSIS },
        { value: null, type: CellType.ANALYSIS },
        { value: null, type: CellType.ANALYSIS },
      ],
    ];

    return this.createSheetWithData(data, 'Financial Analysis');
  }

  /**
   * Create an inventory tracking spreadsheet
   *
   * @returns A Sheet configured for inventory tracking
   */
  static createInventorySpreadsheet(): Sheet {
    const data: CellData[][] = [
      [
        { value: 'Product', type: CellType.INPUT },
        { value: 'Widget A', type: CellType.INPUT },
        { value: 'Widget B', type: CellType.INPUT },
        { value: 'Widget C', type: CellType.INPUT },
      ],
      [
        { value: 'Stock', type: CellType.INPUT },
        { value: 100, type: CellType.INPUT },
        { value: 150, type: CellType.INPUT },
        { value: 75, type: CellType.INPUT },
      ],
      [
        { value: 'Reorder Level', type: CellType.INPUT },
        { value: 50, type: CellType.INPUT },
        { value: 75, type: CellType.INPUT },
        { value: 40, type: CellType.INPUT },
      ],
      [
        { value: 'Status', type: CellType.DECISION },
        { value: null, type: CellType.DECISION },
        { value: null, type: CellType.DECISION },
        { value: null, type: CellType.DECISION },
      ],
    ];

    return this.createSheetWithData(data, 'Inventory Tracking');
  }

  /**
   * Create a project tracking spreadsheet
   *
   * @returns A Sheet configured for project tracking
   */
  static createProjectSpreadsheet(): Sheet {
    const data: CellData[][] = [
      [
        { value: 'Task', type: CellType.INPUT },
        { value: 'Design', type: CellType.INPUT },
        { value: 'Development', type: CellType.INPUT },
        { value: 'Testing', type: CellType.INPUT },
      ],
      [
        { value: 'Status', type: CellType.INPUT },
        { value: 'Complete', type: CellType.INPUT },
        { value: 'In Progress', type: CellType.INPUT },
        { value: 'Pending', type: CellType.INPUT },
      ],
      [
        { value: 'Progress', type: CellType.INPUT },
        { value: 100, type: CellType.INPUT },
        { value: 60, type: CellType.INPUT },
        { value: 0, type: CellType.INPUT },
      ],
      [
        { value: 'Overall Progress', type: CellType.AGGREGATE },
        { value: null, type: CellType.AGGREGATE },
        { value: null, type: CellType.AGGREGATE },
        { value: null, type: CellType.AGGREGATE },
      ],
    ];

    return this.createSheetWithData(data, 'Project Tracking');
  }

  /**
   * Create a data validation spreadsheet
   *
   * @returns A Sheet configured for testing data validation
   */
  static createValidationSpreadsheet(): Sheet {
    const data: CellData[][] = [
      [
        { value: 'Input', type: CellType.INPUT },
        { value: null, type: CellType.INPUT },
        { value: null, type: CellType.INPUT },
        { value: null, type: CellType.INPUT },
      ],
      [
        { value: 'Valid', type: CellType.VALIDATE },
        { value: null, type: CellType.VALIDATE },
        { value: null, type: CellType.VALIDATE },
        { value: null, type: CellType.VALIDATE },
      ],
      [
        { value: 'Error Message', type: CellType.OUTPUT },
        { value: null, type: CellType.OUTPUT },
        { value: null, type: CellType.OUTPUT },
        { value: null, type: CellType.OUTPUT },
      ],
    ];

    return this.createSheetWithData(data, 'Data Validation');
  }

  /**
   * Create a prediction and forecasting spreadsheet
   *
   * @returns A Sheet configured for prediction testing
   */
  static createPredictionSpreadsheet(): Sheet {
    const data: CellData[][] = [
      [
        { value: 'Month', type: CellType.INPUT },
        { value: 'Jan', type: CellType.INPUT },
        { value: 'Feb', type: CellType.INPUT },
        { value: 'Mar', type: CellType.INPUT },
        { value: 'Apr', type: CellType.INPUT },
      ],
      [
        { value: 'Sales', type: CellType.INPUT },
        { value: 1000, type: CellType.INPUT },
        { value: 1200, type: CellType.INPUT },
        { value: 1150, type: CellType.INPUT },
        { value: null, type: CellType.INPUT },
      ],
      [
        { value: 'Forecast', type: CellType.PREDICTION },
        { value: null, type: CellType.PREDICTION },
        { value: null, type: CellType.PREDICTION },
        { value: null, type: CellType.PREDICTION },
        { value: null, type: CellType.PREDICTION },
      ],
      [
        { value: 'Confidence', type: CellType.ANALYSIS },
        { value: null, type: CellType.ANALYSIS },
        { value: null, type: CellType.ANALYSIS },
        { value: null, type: CellType.ANALYSIS },
        { value: null, type: CellType.ANALYSIS },
      ],
    ];

    return this.createSheetWithData(data, 'Sales Forecast');
  }

  /**
   * Create a stress test spreadsheet with many cells
   *
   * @param rows - Number of rows
   * @param cols - Number of columns
   * @returns A Sheet with many cells for stress testing
   */
  static createStressTestSpreadsheet(rows: number = 100, cols: number = 100): Sheet {
    const sheet = this.createEmptySheet(`Stress Test ${rows}x${cols}`);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellId = `cell-${row}-${col}`;
        const cell = CellFactory.createInputCell({
          position: { row, col },
          defaultValue: Math.random() * 100,
        });
        sheet.cells.set(cellId, cell);
      }
    }

    return sheet;
  }

  /**
   * Create a spreadsheet with circular dependencies
   *
   * @returns A Sheet with circular dependencies for testing
   */
  static createCircularDependencySpreadsheet(): Sheet {
    const sheet = this.createEmptySheet('Circular Dependencies');

    // Cell A depends on B, B depends on C, C depends on A
    const cellA = CellFactory.createTransformCell({
      position: { row: 0, col: 0 },
    });
    const cellB = CellFactory.createTransformCell({
      position: { row: 1, col: 0 },
    });
    const cellC = CellFactory.createTransformCell({
      position: { row: 2, col: 0 },
    });

    sheet.cells.set('cell-a', cellA);
    sheet.cells.set('cell-b', cellB);
    sheet.cells.set('cell-c', cellC);

    sheet.relationships = [
      { from: 'cell-b', to: 'cell-a', type: 'data' },
      { from: 'cell-c', to: 'cell-b', type: 'data' },
      { from: 'cell-a', to: 'cell-c', type: 'data' },
    ];

    return sheet;
  }

  /**
   * Create a spreadsheet for testing sensation propagation
   *
   * @returns A Sheet configured for sensation testing
   */
  static createSensationTestSpreadsheet(): Sheet {
    const sheet = this.createEmptySheet('Sensation Test');

    // Create a grid where cells can sense their neighbors
    const grid = CellFactory.createCellGrid(5, 5, CellType.INPUT);

    grid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellId = `cell-${rowIndex}-${colIndex}`;
        sheet.cells.set(cellId, cell);

        // Add sensation relationships to neighbors
        if (rowIndex > 0) {
          sheet.relationships.push({
            from: `cell-${rowIndex - 1}-${colIndex}`,
            to: cellId,
            type: 'sensation',
            sensationTypes: [SensationType.ABSOLUTE_CHANGE],
          });
        }
        if (colIndex > 0) {
          sheet.relationships.push({
            from: `cell-${rowIndex}-${colIndex - 1}`,
            to: cellId,
            type: 'sensation',
            sensationTypes: [SensationType.ABSOLUTE_CHANGE],
          });
        }
      });
    });

    return sheet;
  }

  /**
   * Create a cell from a CellConfig
   *
   * @param config - Cell configuration
   * @returns A LogCell instance
   */
  private static createCellFromConfig(config: CellConfig): unknown {
    const baseConfig = {
      id: config.id,
      position: config.position,
      logicLevel: config.logicLevel,
      ...config.config,
    };

    switch (config.type) {
      case CellType.INPUT:
        return CellFactory.createInputCell({
          ...baseConfig,
          defaultValue: config.value,
        });
      case CellType.OUTPUT:
        return CellFactory.createOutputCell(baseConfig);
      case CellType.TRANSFORM:
        return CellFactory.createTransformCell(baseConfig);
      case CellType.FILTER:
        return CellFactory.createFilterCell(baseConfig);
      case CellType.AGGREGATE:
        return CellFactory.createAggregateCell(baseConfig);
      case CellType.VALIDATE:
        return CellFactory.createValidateCell(baseConfig);
      case CellType.ANALYSIS:
        return CellFactory.createAnalysisCell(baseConfig);
      case CellType.PREDICTION:
        return CellFactory.createPredictionCell(baseConfig);
      case CellType.DECISION:
        return CellFactory.createDecisionCell(baseConfig);
      case CellType.EXPLAIN:
        return CellFactory.createExplainCell(baseConfig);
      default:
        return CellFactory.createLogCell(baseConfig);
    }
  }

  /**
   * Reset the sheet counter
   */
  static resetCounter(): void {
    this.sheetCounter = 0;
  }
}

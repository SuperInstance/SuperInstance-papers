/**
 * CellFactory - Factory for creating test cells and cell configurations
 *
 * Provides convenient methods for creating various cell types and configurations
 * for testing purposes.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  LogCell,
  LogCellConfig,
} from '../core/LogCell.js';
import { InputCell, InputCellConfig, InputType } from '../cells/InputCell.js';
import { OutputCell } from '../cells/InputCell.js';
import { TransformCell } from '../cells/TransformCell.js';
import { FilterCell } from '../cells/FilterCell.js';
import { AggregateCell } from '../cells/AggregateCell.js';
import { ValidateCell } from '../cells/ValidateCell.js';
import { AnalysisCell } from '../cells/AnalysisCell.js';
import { PredictionCell } from '../cells/PredictionCell.js';
import { DecisionCell } from '../cells/DecisionCell.js';
import { ExplainCell } from '../cells/ExplainCell.js';
import {
  CellType,
  CellPosition,
  CellId,
  LogicLevel,
} from '../core/types.js';
import type {
  CellConfig,
  ColonyPattern,
} from './types.js';

/**
 * Factory for creating test cells
 */
export class CellFactory {
  private static cellCounter = 0;

  /**
   * Create a LogCell with optional configuration
   *
   * @param config - Partial configuration for the cell
   * @returns A new LogCell instance
   *
   * @example
   * ```typescript
   * const cell = CellFactory.createLogCell({
   *   position: { row: 0, col: 0 },
   *   logicLevel: LogicLevel.L1_PATTERN
   * });
   * ```
   */
  static createLogCell(config: Partial<LogCellConfig> = {}): LogCell {
    const cellId: CellId = config.id || `test-cell-${this.cellCounter++}-${uuidv4()}`;
    const position: CellPosition = config.position || { row: 0, col: 0 };

    const fullConfig: LogCellConfig = {
      id: cellId,
      position,
      logicLevel: config.logicLevel || LogicLevel.L0_LOGIC,
      memoryLimit: config.memoryLimit || 100,
      ...config,
    };

    return new LogCell(fullConfig);
  }

  /**
   * Create an InputCell
   *
   * @param config - Partial configuration for the input cell
   * @returns A new InputCell instance
   *
   * @example
   * ```typescript
   * const inputCell = CellFactory.createInputCell({
   *   inputType: InputType.USER_DATA,
   *   defaultValue: 42
   * });
   * ```
   */
  static createInputCell(config: Partial<InputCellConfig> = {}): InputCell {
    const cellId: CellId = config.id || `input-cell-${this.cellCounter++}-${uuidv4()}`;
    const position: CellPosition = config.position || { row: 0, col: 0 };

    const fullConfig: InputCellConfig = {
      id: cellId,
      position,
      inputType: config.inputType || InputType.USER_DATA,
      defaultValue: config.defaultValue,
      validation: config.validation,
      format: config.format,
      logicLevel: config.logicLevel || LogicLevel.L0_LOGIC,
      memoryLimit: config.memoryLimit || 100,
      ...config,
    };

    return new InputCell(fullConfig);
  }

  /**
   * Create an OutputCell
   *
   * @param config - Partial configuration for the output cell
   * @returns A new OutputCell instance
   */
  static createOutputCell(config: Partial<LogCellConfig> = {}): OutputCell {
    const cellId: CellId = config.id || `output-cell-${this.cellCounter++}-${uuidv4()}`;
    const position: CellPosition = config.position || { row: 0, col: 0 };

    const fullConfig: LogCellConfig = {
      id: cellId,
      position,
      logicLevel: config.logicLevel || LogicLevel.L0_LOGIC,
      memoryLimit: config.memoryLimit || 100,
      outputFormat: config.outputFormat || 'raw',
      ...config,
    };

    return new OutputCell(fullConfig);
  }

  /**
   * Create a TransformCell
   *
   * @param config - Partial configuration for the transform cell
   * @returns A new TransformCell instance
   */
  static createTransformCell(config: Partial<LogCellConfig> = {}): TransformCell {
    const cellId: CellId = config.id || `transform-cell-${this.cellCounter++}-${uuidv4()}`;
    const position: CellPosition = config.position || { row: 0, col: 0 };

    const fullConfig: LogCellConfig = {
      id: cellId,
      position,
      logicLevel: config.logicLevel || LogicLevel.L0_LOGIC,
      memoryLimit: config.memoryLimit || 100,
      transform: config.transform || ((value: unknown) => value),
      ...config,
    };

    return new TransformCell(fullConfig);
  }

  /**
   * Create a FilterCell
   *
   * @param config - Partial configuration for the filter cell
   * @returns A new FilterCell instance
   */
  static createFilterCell(config: Partial<LogCellConfig> = {}): FilterCell {
    const cellId: CellId = config.id || `filter-cell-${this.cellCounter++}-${uuidv4()}`;
    const position: CellPosition = config.position || { row: 0, col: 0 };

    const fullConfig: LogCellConfig = {
      id: cellId,
      position,
      logicLevel: config.logicLevel || LogicLevel.L0_LOGIC,
      memoryLimit: config.memoryLimit || 100,
      filter: config.filter || (() => true),
      ...config,
    };

    return new FilterCell(fullConfig);
  }

  /**
   * Create an AggregateCell
   *
   * @param config - Partial configuration for the aggregate cell
   * @returns A new AggregateCell instance
   */
  static createAggregateCell(config: Partial<LogCellConfig> = {}): AggregateCell {
    const cellId: CellId = config.id || `aggregate-cell-${this.cellCounter++}-${uuidv4()}`;
    const position: CellPosition = config.position || { row: 0, col: 0 };

    const fullConfig: LogCellConfig = {
      id: cellId,
      position,
      logicLevel: config.logicLevel || LogicLevel.L0_LOGIC,
      memoryLimit: config.memoryLimit || 100,
      aggregation: config.aggregation || 'sum',
      ...config,
    };

    return new AggregateCell(fullConfig);
  }

  /**
   * Create a ValidateCell
   *
   * @param config - Partial configuration for the validate cell
   * @returns A new ValidateCell instance
   */
  static createValidateCell(config: Partial<LogCellConfig> = {}): ValidateCell {
    const cellId: CellId = config.id || `validate-cell-${this.cellCounter++}-${uuidv4()}`;
    const position: CellPosition = config.position || { row: 0, col: 0 };

    const fullConfig: LogCellConfig = {
      id: cellId,
      position,
      logicLevel: config.logicLevel || LogicLevel.L0_LOGIC,
      memoryLimit: config.memoryLimit || 100,
      validation: config.validation || (() => true),
      ...config,
    };

    return new ValidateCell(fullConfig);
  }

  /**
   * Create an AnalysisCell
   *
   * @param config - Partial configuration for the analysis cell
   * @returns A new AnalysisCell instance
   */
  static createAnalysisCell(config: Partial<LogCellConfig> = {}): AnalysisCell {
    const cellId: CellId = config.id || `analysis-cell-${this.cellCounter++}-${uuidv4()}`;
    const position: CellPosition = config.position || { row: 0, col: 0 };

    const fullConfig: LogCellConfig = {
      id: cellId,
      position,
      logicLevel: config.logicLevel || LogicLevel.L2_AGENT,
      memoryLimit: config.memoryLimit || 100,
      analysis: config.analysis || 'trend',
      ...config,
    };

    return new AnalysisCell(fullConfig);
  }

  /**
   * Create a PredictionCell
   *
   * @param config - Partial configuration for the prediction cell
   * @returns A new PredictionCell instance
   */
  static createPredictionCell(config: Partial<LogCellConfig> = {}): PredictionCell {
    const cellId: CellId = config.id || `prediction-cell-${this.cellCounter++}-${uuidv4()}`;
    const position: CellPosition = config.position || { row: 0, col: 0 };

    const fullConfig: LogCellConfig = {
      id: cellId,
      position,
      logicLevel: config.logicLevel || LogicLevel.L3_LLM,
      memoryLimit: config.memoryLimit || 100,
      predictionMethod: config.predictionMethod || 'linear',
      ...config,
    };

    return new PredictionCell(fullConfig);
  }

  /**
   * Create a DecisionCell
   *
   * @param config - Partial configuration for the decision cell
   * @returns A new DecisionCell instance
   */
  static createDecisionCell(config: Partial<LogCellConfig> = {}): DecisionCell {
    const cellId: CellId = config.id || `decision-cell-${this.cellCounter++}-${uuidv4()}`;
    const position: CellPosition = config.position || { row: 0, col: 0 };

    const fullConfig: LogCellConfig = {
      id: cellId,
      position,
      logicLevel: config.logicLevel || LogicLevel.L2_AGENT,
      memoryLimit: config.memoryLimit || 100,
      decisionRules: config.decisionRules || [],
      ...config,
    };

    return new DecisionCell(fullConfig);
  }

  /**
   * Create an ExplainCell
   *
   * @param config - Partial configuration for the explain cell
   * @returns A new ExplainCell instance
   */
  static createExplainCell(config: Partial<LogCellConfig> = {}): ExplainCell {
    const cellId: CellId = config.id || `explain-cell-${this.cellCounter++}-${uuidv4()}`;
    const position: CellPosition = config.position || { row: 0, col: 0 };

    const fullConfig: LogCellConfig = {
      id: cellId,
      position,
      logicLevel: config.logicLevel || LogicLevel.L3_LLM,
      memoryLimit: config.memoryLimit || 100,
      ...config,
    };

    return new ExplainCell(fullConfig);
  }

  /**
   * Create a cell grid (2D array of cells)
   *
   * @param rows - Number of rows in the grid
   * @param cols - Number of columns in the grid
   * @param cellType - Type of cell to create
   * @param config - Optional configuration for cells
   * @returns 2D array of LogCell instances
   *
   * @example
   * ```typescript
   * const grid = CellFactory.createCellGrid(5, 10, CellType.INPUT);
   * // Creates a 5x10 grid of InputCells
   * ```
   */
  static createCellGrid(
    rows: number,
    cols: number,
    cellType: CellType = CellType.INPUT,
    config: Partial<LogCellConfig> = {}
  ): LogCell[][] {
    const grid: LogCell[][] = [];

    for (let row = 0; row < rows; row++) {
      const rowCells: LogCell[] = [];
      for (let col = 0; col < cols; col++) {
        const cellConfig = {
          ...config,
          position: { row, col },
        };

        let cell: LogCell;
        switch (cellType) {
          case CellType.INPUT:
            cell = this.createInputCell(cellConfig);
            break;
          case CellType.OUTPUT:
            cell = this.createOutputCell(cellConfig);
            break;
          case CellType.TRANSFORM:
            cell = this.createTransformCell(cellConfig);
            break;
          default:
            cell = this.createLogCell(cellConfig);
        }

        rowCells.push(cell);
      }
      grid.push(rowCells);
    }

    return grid;
  }

  /**
   * Create a cell colony with a specific pattern
   *
   * @param size - Number of cells in the colony
   * @param pattern - Pattern to arrange cells in
   * @param cellType - Type of cell to create
   * @returns Array of LogCell instances arranged in pattern
   *
   * @example
   * ```typescript
   * const colony = CellFactory.createCellColony(10, ColonyPattern.CHAIN);
   * // Creates a chain of 10 cells
   * ```
   */
  static createCellColony(
    size: number,
    pattern: ColonyPattern = ColonyPattern.GRID,
    cellType: CellType = CellType.INPUT
  ): LogCell[] {
    const cells: LogCell[] = [];

    switch (pattern) {
      case ColonyPattern.CHAIN:
        // Linear chain of cells
        for (let i = 0; i < size; i++) {
          cells.push(this.createCellWithType(cellType, { position: { row: i, col: 0 } }));
        }
        break;

      case ColonyPattern.GRID:
        // Square grid pattern
        const gridSize = Math.ceil(Math.sqrt(size));
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            if (cells.length < size) {
              cells.push(this.createCellWithType(cellType, { position: { row, col } }));
            }
          }
        }
        break;

      case ColonyPattern.STAR:
        // One center cell with surrounding cells
        cells.push(this.createCellWithType(cellType, { position: { row: 0, col: 0 } }));
        for (let i = 1; i < size; i++) {
          const angle = (2 * Math.PI * i) / (size - 1);
          const row = Math.round(Math.cos(angle) * 5);
          const col = Math.round(Math.sin(angle) * 5);
          cells.push(this.createCellWithType(cellType, { position: { row, col } }));
        }
        break;

      case ColonyPattern.TREE:
        // Root with branches
        cells.push(this.createCellWithType(cellType, { position: { row: 0, col: 0 } }));
        let currentCell = 1;
        let row = 1;
        while (currentCell < size) {
          const cellsInRow = Math.min(2 ** row, size - currentCell);
          for (let i = 0; i < cellsInRow; i++) {
            const col = i - cellsInRow / 2;
            cells.push(this.createCellWithType(cellType, { position: { row, col } }));
            currentCell++;
          }
          row++;
        }
        break;

      case ColonyPattern.MESH:
        // All-to-all potential connections
        for (let i = 0; i < size; i++) {
          cells.push(this.createCellWithType(cellType, { position: { row: i, col: i } }));
        }
        break;

      case ColonyPattern.RANDOM:
        // Random positions
        for (let i = 0; i < size; i++) {
          cells.push(
            this.createCellWithType(cellType, {
              position: {
                row: Math.floor(Math.random() * 100),
                col: Math.floor(Math.random() * 100),
              },
            })
          );
        }
        break;

      default:
        // Default to grid
        return this.createCellColony(size, ColonyPattern.GRID, cellType);
    }

    return cells;
  }

  /**
   * Create a sequence of cells of the same type
   *
   * @param count - Number of cells to create
   * @param cellType - Type of cell to create
   * @param config - Optional configuration for cells
   * @returns Array of LogCell instances
   *
   * @example
   * ```typescript
   * const sequence = CellFactory.createCellSequence(5, CellType.TRANSFORM);
   * // Creates a sequence of 5 TransformCells
   * ```
   */
  static createCellSequence(
    count: number,
    cellType: CellType = CellType.INPUT,
    config: Partial<LogCellConfig> = {}
  ): LogCell[] {
    const cells: LogCell[] = [];

    for (let i = 0; i < count; i++) {
      const cellConfig = {
        ...config,
        position: { row: 0, col: i },
      };
      cells.push(this.createCellWithType(cellType, cellConfig));
    }

    return cells;
  }

  /**
   * Helper method to create a cell by type
   *
   * @param cellType - Type of cell to create
   * @param config - Configuration for the cell
   * @returns A new LogCell instance of the specified type
   */
  private static createCellWithType(cellType: CellType, config: Partial<LogCellConfig> = {}): LogCell {
    switch (cellType) {
      case CellType.INPUT:
        return this.createInputCell(config);
      case CellType.OUTPUT:
        return this.createOutputCell(config);
      case CellType.TRANSFORM:
        return this.createTransformCell(config);
      case CellType.FILTER:
        return this.createFilterCell(config);
      case CellType.AGGREGATE:
        return this.createAggregateCell(config);
      case CellType.VALIDATE:
        return this.createValidateCell(config);
      case CellType.ANALYSIS:
        return this.createAnalysisCell(config);
      case CellType.PREDICTION:
        return this.createPredictionCell(config);
      case CellType.DECISION:
        return this.createDecisionCell(config);
      case CellType.EXPLAIN:
        return this.createExplainCell(config);
      default:
        return this.createLogCell({ ...config, type: cellType });
    }
  }

  /**
   * Reset the cell counter
   *
   * Useful for ensuring consistent test IDs between test runs
   */
  static resetCounter(): void {
    this.cellCounter = 0;
  }
}

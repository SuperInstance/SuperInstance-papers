/**
 * POLLN Spreadsheet Integration - TransformCell
 *
 * TransformCell applies various transformations to input data.
 * Supports: map, filter, reduce, flatMap, sort, reverse, slice, split, merge, transpose, zip
 *
 * Logic Level: L0-L1 (computation + simple patterns)
 */

import { LogCell, LogCellConfig } from '../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../core/types.js';

/**
 * Transformation types supported by TransformCell
 */
export enum TransformType {
  MAP = 'map',           // Apply function to each element
  FILTER = 'filter',       // Filter elements (subset of map)
  REDUCE = 'reduce',       // Reduce to single value
  FLAT_MAP = 'flat_map',   // Flatten then map
  SORT = 'sort',           // Sort elements
  REVERSE = 'reverse',     // Reverse order
  SLICE = 'slice',         // Extract portion
  SPLIT = 'split',         // Split into parts
  MERGE = 'merge',         // Merge multiple inputs
  TRANSPOSE = 'transpose', // Transpose dimensions
  ZIP = 'zip',             // Combine arrays element-wise
}

/**
 * Transformation function type
 */
export type TransformFunction = (input: unknown, index?: number, array?: unknown[]) => unknown;

/**
 * Configuration for TransformCell
 */
export interface TransformCellConfig extends LogCellConfig {
  transformType: TransformType;
  transformFn?: TransformFunction;
}

/**
 * TransformCell - Transforms data using various operations
 *
 * Responsibilities:
 * - Apply transformations to input data
 * - Support map, filter, reduce, etc.
 * - Chain multiple transformations
 * - Preserve transformation history
 *
 * Logic Level: L0-L1 (computation + simple patterns)
 */
export class TransformCell extends LogCell {
  private transformType: TransformType;
  private transformFn?: TransformFunction;
  private transformHistory: Array<{ input: unknown; output: unknown; timestamp: number }> = [];

  constructor(config: TransformCellConfig) {
    super({
      type: CellType.TRANSFORM,
      position: config.position,
      logicLevel: LogicLevel.L1_PATTERN,
      memoryLimit: config.memoryLimit,
    });

    this.transformType = config.transformType;
    this.transformFn = config.transformFn;
  }

  /**
   * Transform input data
   */
  async transform(input: unknown): Promise<CellOutput> {
    this.state = CellState.PROCESSING;
    const startTime = Date.now();

    try {
      let output: unknown;

      switch (this.transformType) {
        case TransformType.MAP:
          output = await this.applyMap(input);
          break;
        case TransformType.FILTER:
          output = await this.applyFilter(input);
          break;
        case TransformType.REDUCE:
          output = await this.applyReduce(input);
          break;
        case TransformType.FLAT_MAP:
          output = await this.applyFlatMap(input);
          break;
        case TransformType.SORT:
          output = await this.applySort(input);
          break;
        case TransformType.REVERSE:
          output = await this.applyReverse(input);
          break;
        case TransformType.SLICE:
          output = await this.applySlice(input);
          break;
        case TransformType.SPLIT:
          output = await this.applySplit(input);
          break;
        case TransformType.MERGE:
          output = await this.applyMerge(input);
          break;
        case TransformType.TRANSPOSE:
          output = this.applyTranspose(input);
          break;
        case TransformType.ZIP:
          output = this.applyZip(input);
          break;
        default:
          throw new Error(`Unknown transform type: ${this.transformType}`);
      }

      this.state = CellState.EMITTING;
      this.transformHistory.push({
        input,
        output,
        timestamp: Date.now(),
      });

      return {
        success: true,
        value: output,
        timestamp: Date.now(),
        duration: Date.now().getTime() - startTime,
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        error: error instanceof Error ? error.message : 'Transform failed',
        timestamp: Date.now(),
      };
    }
  }

  // ========================================================================
  // Transformation Implementations
  // ========================================================================

  /**
   * Apply map transformation
   */
  private async applyMap(input: unknown): Promise<unknown> {
    if (!Array.isArray(input)) {
      throw new Error('Map transform requires array input');
    }

    if (this.transformFn) {
      return input.map((item, index) => this.transformFn!(item, index, input));
    }

    return input; // Identity if no function
  }

  /**
   * Apply filter transformation
   */
  private async applyFilter(input: unknown): Promise<unknown> {
    if (!Array.isArray(input)) {
      throw new Error('Filter transform requires array input');
    }

    if (this.transformFn) {
      return input.filter((item, index) => this.transformFn!(item, index, input) as boolean);
    }

    return input; // No filter, return all
  }

  /**
   * Apply reduce transformation
   */
  private async applyReduce(input: unknown): Promise<unknown> {
    if (!Array.isArray(input)) {
      throw new Error('Reduce transform requires array input');
    }

    if (!this.transformFn) {
      throw new Error('Reduce transform requires transformFn');
    }

    return input.reduce((acc, item, index) => {
      const result = this.transformFn!(item, index, input);
      return this.mergeReduceResult(acc, result);
    });
  }

  /**
   * Merge reduce results
   */
  private mergeReduceResult(acc: unknown, result: unknown): unknown {
    if (typeof acc === 'number' && typeof result === 'number') {
      return acc + result;
    }
    if (Array.isArray(acc) && Array.isArray(result)) {
      return [...acc, ...result];
    }
    if (typeof acc === 'object' && typeof result === 'object') {
      return { ...acc, ...result };
    }
    return result;
  }

  /**
   * Apply flatMap transformation
   */
  private async applyFlatMap(input: unknown): Promise<unknown> {
    if (!Array.isArray(input)) {
      throw new Error('FlatMap transform requires array input');
    }

    if (!this.transformFn) {
      return input.flat(Infinity);
    }

    return input.flatMap((item, index) => {
      const result = this.transformFn!(item, index, input);
      return Array.isArray(result) ? result : [result];
    });
  }

  /**
   * Apply sort transformation
   */
  private async applySort(input: unknown): Promise<unknown> {
    if (!Array.isArray(input)) {
      throw new Error('Sort transform requires array input');
    }

    const sorted = [...input];

    if (this.transformFn) {
      // Custom sort using transformFn as comparator
      return sorted.sort((a, b) => {
        const aVal = this.transformFn!(a);
        const bVal = this.transformFn!(b);
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    }

    // Default: natural sort
    return sorted.sort();
  }

  /**
   * Apply reverse transformation
   */
  private async applyReverse(input: unknown): Promise<unknown> {
    if (!Array.isArray(input)) {
      throw new Error('Reverse transform requires array input');
    }

    return [...input].reverse();
  }

  /**
   * Apply slice transformation
   */
  private async applySlice(input: unknown): Promise<unknown> {
    if (!Array.isArray(input)) {
      throw new Error('Slice transform requires array input');
    }

    if (!this.transformFn) {
      throw new Error('Slice transform requires transformFn with [start, end]');
    }

    const [start, end] = this.transformFn!(input) as [number, number];
    return input.slice(start, end);
  }

  /**
   * Create the processing logic for this cell
   */
  protected createProcessingLogic(): any {
    return {
      type: 'transform',
      transformType: this.transformType,
      logic: this.logicLevel,
    };
  }

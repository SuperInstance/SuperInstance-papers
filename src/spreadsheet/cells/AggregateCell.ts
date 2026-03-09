/**
 * POLLN Spreadsheet Integration - AggregateCell
 *
 * AggregateCell performs aggregation/summarization operations.
 * Supports sum, average, count, min, max, etc.
 */

import { LogCell, LogCellConfig } from '../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../core/types.js';

/**
 * Aggregation types
 */
export enum AggregateType {
  SUM = 'sum',
  AVERAGE = 'average',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  FIRST = 'first',
  LAST = 'last',
  MEDIAN = 'median',
  MODE = 'mode',
  STDDEV = 'stddev',
  VARIANCE = 'variance',
  COUNT_UNIQUE = 'count_unique',
  COUNT_DISTINCT = 'count_distinct',
}

/**
 * Configuration for AggregateCell
 */
export interface AggregateCellConfig extends LogCellConfig {
  aggregateType: AggregateType;
  field?: string;
  groupBy?: string;
}

/**
 * AggregateCell - Aggregates/summarizes data
 *
 * Responsibilities:
 * - Perform common aggregations (sum, avg, count, min, max)
 * - Support field-based aggregation for objects
 * - Support grouping operations
 * - Track aggregation history
 *
 * Logic Level: L0-L1 (computation + simple patterns)
 */
export class AggregateCell extends LogCell {
  private aggregateType: AggregateType;
  private field?: string;
  private groupBy?: string;
  private aggregateHistory: Array<{ input: unknown; output: unknown; timestamp: number }> = [];

  constructor(config: AggregateCellConfig) {
    super({
      type: CellType.AGGREGATE,
      position: config.position,
      logicLevel: LogicLevel.L1_PATTERN,
      memoryLimit: config.memoryLimit,
    });

    this.aggregateType = config.aggregateType;
    this.field = config.field;
    this.groupBy = config.groupBy;
  }

  /**
   * Aggregate input data
   */
  async aggregate(input: unknown): Promise<CellOutput> {
    this.state = CellState.PROCESSING;

    try {
      if (!Array.isArray(input)) {
        throw new Error('Aggregate requires array input');
      }

      let result: unknown;

      if (this.groupBy) {
        result = this.aggregateByGroup(input);
      } else {
        result = this.performAggregation(input);
      }

      this.state = CellState.EMITTING;

      this.aggregateHistory.push({
        input,
        output: result,
        timestamp: Date.now(),
      });

      return {
        success: true,
        value: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        error: error instanceof Error ? error.message : 'Aggregate failed',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Perform aggregation on input array
   */
  private performAggregation(input: unknown[]): unknown {
    const values = this.extractValues(input);

    switch (this.aggregateType) {
    case AggregateType.SUM:
      return this.sum(values);

    case AggregateType.AVERAGE:
      return this.average(values);

    case AggregateType.COUNT:
      return input.length;

    case AggregateType.MIN:
      return this.min(values);

    case AggregateType.MAX:
      return this.max(values);

    case AggregateType.FIRST:
      return input[0];

    case AggregateType.LAST:
      return input[input.length - 1];

    case AggregateType.MEDIAN:
      return this.median(values);

    case AggregateType.MODE:
      return this.mode(values);

    case AggregateType.STDDEV:
      return this.stddev(values);

    case AggregateType.VARIANCE:
      return this.variance(values);

    case AggregateType.COUNT_UNIQUE:
    case AggregateType.COUNT_DISTINCT:
      return new Set(values).size;

    default:
      throw new Error(`Unknown aggregate type: ${this.aggregateType}`);
    }
  }

  /**
   * Aggregate by group
   */
  private aggregateByGroup(input: unknown[]): Record<string, unknown> {
    const groups: Record<string, unknown[]> = {};

    // Group items
    for (const item of input) {
      const groupKey = this.getGroupKey(item);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    }

    // Aggregate each group
    const result: Record<string, unknown> = {};
    for (const [key, items] of Object.entries(groups)) {
      result[key] = this.performAggregation(items);
    }

    return result;
  }

  /**
   * Extract values from input based on field
   */
  private extractValues(input: unknown[]): unknown[] {
    if (!this.field) {
      return input;
    }

    return input.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return (item as Record<string, unknown>)[this.field!];
      }
      return item;
    });
  }

  /**
   * Get group key from item
   */
  private getGroupKey(item: unknown): string {
    if (typeof item === 'object' && item !== null && this.groupBy) {
      const value = (item as Record<string, unknown>)[this.groupBy];
      return String(value);
    }
    return 'default';
  }

  /**
   * Calculate sum
   */
  private sum(values: unknown[]): number {
    return values
      .filter((v) => typeof v === 'number')
      .reduce((acc: number, v) => acc + (v as number), 0);
  }

  /**
   * Calculate average
   */
  private average(values: unknown[]): number {
    const numbers = values.filter((v) => typeof v === 'number') as number[];
    if (numbers.length === 0) return 0;
    return this.sum(values) / numbers.length;
  }

  /**
   * Find minimum
   */
  private min(values: unknown[]): unknown {
    const validValues = values.filter((v) => v !== null && v !== undefined);
    if (validValues.length === 0) return null;

    return validValues.reduce((min, v) => (v < min ? v : min), validValues[0]);
  }

  /**
   * Find maximum
   */
  private max(values: unknown[]): unknown {
    const validValues = values.filter((v) => v !== null && v !== undefined);
    if (validValues.length === 0) return null;

    return validValues.reduce((max, v) => (v > max ? v : max), validValues[0]);
  }

  /**
   * Calculate median
   */
  private median(values: unknown[]): number | null {
    const numbers = values
      .filter((v) => typeof v === 'number')
      .sort((a, b) => (a as number) - (b as number));

    if (numbers.length === 0) return null;

    const mid = Math.floor(numbers.length / 2);
    if (numbers.length % 2 === 0) {
      return ((numbers[mid - 1] as number) + (numbers[mid] as number)) / 2;
    }
    return numbers[mid] as number;
  }

  /**
   * Find mode (most frequent value)
   */
  private mode(values: unknown[]): unknown | null {
    const counts = new Map<unknown, number>();

    for (const v of values) {
      counts.set(v, (counts.get(v) || 0) + 1);
    }

    let maxCount = 0;
    let mode: unknown = null;

    for (const [value, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mode = value;
      }
    }

    return mode;
  }

  /**
   * Calculate standard deviation
   */
  private stddev(values: unknown[]): number {
    const avg = this.average(values);
    const numbers = values.filter((v) => typeof v === 'number') as number[];

    if (numbers.length === 0) return 0;

    const squaredDiffs = numbers.map((v) => Math.pow(v - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate variance
   */
  private variance(values: unknown[]): number {
    const avg = this.average(values);
    const numbers = values.filter((v) => typeof v === 'number') as number[];

    if (numbers.length === 0) return 0;

    const squaredDiffs = numbers.map((v) => Math.pow(v - avg, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Get aggregate history
   */
  getAggregateHistory(): Array<{ input: unknown; output: unknown; timestamp: number }> {
    return [...this.aggregateHistory];
  }

  /**
   * Create the processing logic for this cell
   */
  protected createProcessingLogic(): any {
    return {
      type: 'aggregate',
      aggregateType: this.aggregateType,
      logic: this.logicLevel,
    };
  }
}

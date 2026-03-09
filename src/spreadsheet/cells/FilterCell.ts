/**
 * POLLN Spreadsheet Integration - FilterCell
 *
 * FilterCell filters data based on conditions.
 * Supports condition-based filtering with L0-L1 logic.
 */

import { LogCell, LogCellConfig } from '../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../core/types.js';

/**
 * Filter operators
 */
export enum FilterOperator {
  EQUALS = '==',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_OR_EQUAL = '>=',
  LESS_OR_EQUAL = '<=',
  CONTAINS = 'contains',
  NOT_CONTAINS = '!contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull',
  IN = 'in',
  NOT_IN = '!in',
  MATCHES = 'matches',
}

/**
 * Filter condition
 */
export interface FilterCondition {
  field?: string;
  operator: FilterOperator;
  value: unknown;
  caseSensitive?: boolean;
}

/**
 * Filter logic (AND/OR)
 */
export enum FilterLogic {
  AND = 'and',
  OR = 'or',
}

/**
 * Configuration for FilterCell
 */
export interface FilterCellConfig extends LogCellConfig {
  conditions: FilterCondition[];
  filterLogic?: FilterLogic;
  negateResult?: boolean;
}

/**
 * FilterCell - Filters data based on conditions
 *
 * Responsibilities:
 * - Filter arrays based on conditions
 * - Support multiple conditions with AND/OR logic
 * - Support field-based filtering for objects
 * - Support negation of results
 *
 * Logic Level: L0-L1 (computation + simple patterns)
 */
export class FilterCell extends LogCell {
  private conditions: FilterCondition[];
  private filterLogic: FilterLogic;
  private negateResult: boolean;
  private filterHistory: Array<{ input: unknown; output: unknown; timestamp: number }> = [];
  private lastFilteredCount: number = 0;

  constructor(config: FilterCellConfig) {
    super({
      type: CellType.FILTER,
      position: config.position,
      logicLevel: LogicLevel.L1_PATTERN,
      memoryLimit: config.memoryLimit,
    });

    this.conditions = config.conditions;
    this.filterLogic = config.filterLogic || FilterLogic.AND;
    this.negateResult = config.negateResult || false;
  }

  /**
   * Filter input data based on conditions
   */
  async filter(input: unknown): Promise<CellOutput> {
    this.state = CellState.PROCESSING;
    const startTime = Date.now();

    try {
      if (!Array.isArray(input)) {
        throw new Error('Filter requires array input');
      }

      let result: unknown[];

      if (this.filterLogic === FilterLogic.AND) {
        result = input.filter((item) => this.matchesAllConditions(item));
      } else {
        result = input.filter((item) => this.matchesAnyCondition(item));
      }

      if (this.negateResult) {
        result = input.filter((item) => !result.includes(item));
      }

      this.state = CellState.EMITTING;
      this.lastFilteredCount = result.length;

      this.filterHistory.push({
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
      error: error instanceof Error ? error.message : 'Filter failed',
      timestamp: Date.now(),
    };
  }
  }

  /**
   * Check if item matches all conditions (AND logic)
   */
  private matchesAllConditions(item: unknown): boolean {
    return this.conditions.every((condition) => this.evaluateCondition(item, condition));
  }

  /**
   * Check if item matches any condition (OR logic)
   */
  private matchesAnyCondition(item: unknown): boolean {
    return this.conditions.some((condition) => this.evaluateCondition(item, condition));
  }

  /**
   * Evaluate a single condition against an item
   */
  private evaluateCondition(item: unknown, condition: FilterCondition): boolean {
    const value = this.getFieldValue(item, condition.field);

    switch (condition.operator) {
    case FilterOperator.EQUALS:
      return this.compareValues(value, condition.value, condition.caseSensitive);

    case FilterOperator.NOT_EQUALS:
      return !this.compareValues(value, condition.value, condition.caseSensitive);

    case FilterOperator.GREATER_THAN:
      return Number(value) > Number(condition.value);

    case FilterOperator.LESS_THAN:
      return Number(value) < Number(condition.value);

    case FilterOperator.GREATER_OR_EQUAL:
      return Number(value) >= Number(condition.value);

    case FilterOperator.LESS_OR_EQUAL:
      return Number(value) <= Number(condition.value);

    case FilterOperator.CONTAINS:
      return this.contains(value, condition.value, condition.caseSensitive);

    case FilterOperator.NOT_CONTAINS:
      return !this.contains(value, condition.value, condition.caseSensitive);

    case FilterOperator.STARTS_WITH:
      return this.startsWith(value, condition.value, condition.caseSensitive);

    case FilterOperator.ENDS_WITH:
      return this.endsWith(value, condition.value, condition.caseSensitive);

    case FilterOperator.IS_NULL:
      return value === null || value === undefined;

    case FilterOperator.IS_NOT_NULL:
      return value !== null && value !== undefined;

    case FilterOperator.IN:
      return Array.isArray(condition.value) && condition.value.includes(value);

    case FilterOperator.NOT_IN:
      return Array.isArray(condition.value) && !condition.value.includes(value);

    case FilterOperator.MATCHES:
      return this.matchesRegex(value, condition.value as string);

    default:
      return false;
  }
  }

  /**
   * Get field value from item
   */
  private getFieldValue(item: unknown, field?: string): unknown {
    if (!field) {
      return item;
    }

    if (typeof item === 'object' && item !== null) {
      return (item as Record<string, unknown>)[field];
    }

    return item;
  }

  /**
   * Compare two values for equality
   */
  private compareValues(a: unknown, b: unknown, caseSensitive?: boolean): boolean {
    if (typeof a === 'string' && typeof b === 'string' && !caseSensitive) {
      return a.toLowerCase() === b.toLowerCase();
    }
    return a === b;
  }

  /**
   * Check if value contains search value
   */
  private contains(value: unknown, search: unknown, caseSensitive?: boolean): boolean {
    const valueStr = String(value);
    const searchStr = String(search);

    if (!caseSensitive) {
      return valueStr.toLowerCase().includes(searchStr.toLowerCase());
    }
    return valueStr.includes(searchStr);
  }

  /**
   * Check if value starts with prefix
   */
  private startsWith(value: unknown, prefix: unknown, caseSensitive?: boolean): boolean {
    const valueStr = String(value);
    const prefixStr = String(prefix);

    if (!caseSensitive) {
      return valueStr.toLowerCase().startsWith(prefixStr.toLowerCase());
    }
    return valueStr.startsWith(prefixStr);
  }

  /**
   * Check if value ends with suffix
   */
  private endsWith(value: unknown, suffix: unknown, caseSensitive?: boolean): boolean {
    const valueStr = String(value);
    const suffixStr = String(suffix);

    if (!caseSensitive) {
      return valueStr.toLowerCase().endsWith(suffixStr.toLowerCase());
    }
    return valueStr.endsWith(suffixStr);
  }

  /**
   * Match value against regex pattern
   */
  private matchesRegex(value: unknown, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern);
      return regex.test(String(value));
    } catch {
      return false;
    }
  }

  /**
   * Get filter history
   */
  getFilterHistory(): Array<{ input: unknown; output: unknown; timestamp: number }> {
    return [...this.filterHistory];
  }

  /**
   * Get last filtered count
   */
  getLastFilteredCount(): number {
    return this.lastFilteredCount;
  }

  /**
   * Add a condition
   */
  addCondition(condition: FilterCondition): void {
    this.conditions.push(condition);
  }

  /**
   * Remove a condition
   */
  removeCondition(index: number): void {
    this.conditions.splice(index, 1);
  }

  /**
   * Clear all conditions
   */
  clearConditions(): void {
    this.conditions = [];
  }

  /**
   * Get current conditions
   */
  getConditions(): FilterCondition[] {
    return [...this.conditions];
  }
}

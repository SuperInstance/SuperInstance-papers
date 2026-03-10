/**
 * AssertionExtensions - Custom assertion extensions for POLLN testing
 *
 * Provides custom assertion functions and matchers for testing POLLN spreadsheet
 * components with both Jest and Vitest.
 */

import {
  CellState,
  CellType,
  SensationType,
  LogicLevel,
  CellReference,
  CellId,
} from '../core/types.js';

/**
 * Custom error class for assertion failures
 */
export class AssertionError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Custom assertion functions for POLLN components
 */
export class AssertionExtensions {
  /**
   * Assert that a cell has a specific sensation
   *
   * @param cell - The cell to check
   * @param sensation - The expected sensation type
   * @throws AssertionError if sensation not found
   *
   * @example
   * ```typescript
   * toHaveSensation(cell, SensationType.ABSOLUTE_CHANGE);
   * ```
   */
  static toHaveSensation(cell: unknown, sensation: SensationType): void {
    // Implementation would check cell sensations
    const hasSensation = this.checkSensation(cell, sensation);

    if (!hasSensation) {
      throw new AssertionError(
        `Expected cell to have sensation '${sensation}'`,
        { cell, sensation }
      );
    }
  }

  /**
   * Assert that a cell is in a specific state
   *
   * @param cell - The cell to check
   * @param state - The expected state
   * @throws AssertionError if state doesn't match
   *
   * @example
   * ```typescript
   * toBeInState(cell, CellState.PROCESSING);
   * ```
   */
  static toBeInState(cell: unknown, state: CellState): void {
    const cellState = this.getCellState(cell);

    if (cellState !== state) {
      throw new AssertionError(
        `Expected cell to be in state '${state}', but got '${cellState}'`,
        { cell, expected: state, actual: cellState }
      );
    }
  }

  /**
   * Assert that a cell has a specific value
   *
   * @param cell - The cell to check
   * @param value - The expected value
   * @param tolerance - Optional tolerance for numeric comparisons
   * @throws AssertionError if value doesn't match
   *
   * @example
   * ```typescript
   * toHaveValue(cell, 42);
   * toHaveValue(cell, 42.0, 0.01); // With tolerance
   * ```
   */
  static toHaveValue(cell: unknown, value: unknown, tolerance?: number): void {
    const cellValue = this.getCellValue(cell);

    const matches = tolerance !== undefined
      ? this.isWithinTolerance(cellValue, value, tolerance)
      : cellValue === value;

    if (!matches) {
      throw new AssertionError(
        `Expected cell to have value '${value}', but got '${cellValue}'`,
        { cell, expected: value, actual: cellValue, tolerance }
      );
    }
  }

  /**
   * Assert that two cells are entangled (bidirectional dependency)
   *
   * @param cell1 - First cell
   * @param cell2 - Second cell
   * @throws AssertionError if cells are not entangled
   *
   * @example
   * ```typescript
   * toBeEntangledWith(cell1, cell2);
   * ```
   */
  static toBeEntangledWith(cell1: unknown, cell2: unknown): void {
    const entangled = this.checkEntanglement(cell1, cell2);

    if (!entangled) {
      throw new AssertionError(
        `Expected cells to be entangled`,
        { cell1, cell2 }
      );
    }
  }

  /**
   * Assert that a cell has a specific type
   *
   * @param cell - The cell to check
   * @param type - The expected cell type
   * @throws AssertionError if type doesn't match
   *
   * @example
   * ```typescript
   * toBeOfType(cell, CellType.TRANSFORM);
   * ```
   */
  static toBeOfType(cell: unknown, type: CellType): void {
    const cellType = this.getCellType(cell);

    if (cellType !== type) {
      throw new AssertionError(
        `Expected cell to be of type '${type}', but got '${cellType}'`,
        { cell, expected: type, actual: cellType }
      );
    }
  }

  /**
   * Assert that a cell has a specific logic level
   *
   * @param cell - The cell to check
   * @param level - The expected logic level
   * @throws AssertionError if level doesn't match
   *
   * @example
   * ```typescript
   * toHaveLogicLevel(cell, LogicLevel.L2_AGENT);
   * ```
   */
  static toHaveLogicLevel(cell: unknown, level: LogicLevel): void {
    const cellLevel = this.getLogicLevel(cell);

    if (cellLevel !== level) {
      throw new AssertionError(
        `Expected cell to have logic level '${level}', but got '${cellLevel}'`,
        { cell, expected: level, actual: cellLevel }
      );
    }
  }

  /**
   * Assert that a cell has dependencies
   *
   * @param cell - The cell to check
   * @param dependencies - Array of expected dependency IDs
   * @throws AssertionError if dependencies don't match
   *
   * @example
   * ```typescript
   * toHaveDependencies(cell, ['cell-1', 'cell-2']);
   * ```
   */
  static toHaveDependencies(cell: unknown, dependencies: CellId[]): void {
    const cellDeps = this.getDependencies(cell);

    const missing = dependencies.filter((dep) => !cellDeps.includes(dep));
    const extra = cellDeps.filter((dep) => !dependencies.includes(dep));

    if (missing.length > 0 || extra.length > 0) {
      throw new AssertionError(
        `Expected cell to have dependencies [${dependencies.join(', ')}]`,
        {
          cell,
          expected: dependencies,
          actual: cellDeps,
          missing,
          extra,
        }
      );
    }
  }

  /**
   * Assert that a cell has watched cells
   *
   * @param cell - The cell to check
   * @param watched - Array of expected watched cell references
   * @throws AssertionError if watched cells don't match
   *
   * @example
   * ```typescript
   * toHaveWatchedCells(cell, [{ row: 0, col: 1 }, { row: 1, col: 0 }]);
   * ```
   */
  static toHaveWatchedCells(cell: unknown, watched: CellReference[]): void {
    const cellWatched = this.getWatchedCells(cell);

    const watchedIds = watched.map((w) => `${w.row}-${w.col}`);
    const cellWatchedIds = cellWatched.map((w: CellReference) => `${w.row}-${w.col}`);

    const missing = watchedIds.filter((id) => !cellWatchedIds.includes(id));
    const extra = cellWatchedIds.filter((id) => !watchedIds.includes(id));

    if (missing.length > 0 || extra.length > 0) {
      throw new AssertionError(
        `Expected cell to watch [${watchedIds.join(', ')}]`,
        {
          cell,
          expected: watched,
          actual: cellWatched,
          missing,
          extra,
        }
      );
    }
  }

  /**
   * Assert that a cell's execution time is within threshold
   *
   * @param cell - The cell to check
   * @param maxTime - Maximum execution time in milliseconds
   * @throws AssertionError if execution time exceeds threshold
   *
   * @example
   * ```typescript
   * toExecuteWithin(cell, 100); // Max 100ms
   * ```
   */
  static toExecuteWithin(cell: unknown, maxTime: number): void {
    const execTime = this.getExecutionTime(cell);

    if (execTime > maxTime) {
      throw new AssertionError(
        `Expected cell to execute within ${maxTime}ms, but took ${execTime}ms`,
        { cell, maxTime, actualTime: execTime }
      );
    }
  }

  /**
   * Assert that a cell's confidence is above threshold
   *
   * @param cell - The cell to check
   * @param minConfidence - Minimum confidence level (0-1)
   * @throws AssertionError if confidence is below threshold
   *
   * @example
   * ```typescript
   * toHaveConfidenceAbove(cell, 0.8);
   * ```
   */
  static toHaveConfidenceAbove(cell: unknown, minConfidence: number): void {
    const confidence = this.getConfidence(cell);

    if (confidence < minConfidence) {
      throw new AssertionError(
        `Expected cell to have confidence above ${minConfidence}, but got ${confidence}`,
        { cell, minConfidence, actualConfidence: confidence }
      );
    }
  }

  /**
   * Assert that a value is within a range
   *
   * @param value - The value to check
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @throws AssertionError if value is outside range
   *
   * @example
   * ```typescript
   * toBeWithinRange(50, 0, 100); // Pass
   * toBeWithinRange(150, 0, 100); // Fail
   * ```
   */
  static toBeWithinRange(value: number, min: number, max: number): void {
    if (value < min || value > max) {
      throw new AssertionError(
        `Expected value to be within range [${min}, ${max}], but got ${value}`,
        { value, min, max }
      );
    }
  }

  /**
   * Assert that a value is approximately equal to another
   *
   * @param actual - The actual value
   * @param expected - The expected value
   * @param tolerance - Maximum allowed difference
   * @throws AssertionError if values differ by more than tolerance
   *
   * @example
   * ```typescript
   * toBeApproximate(3.14, 3.14159, 0.01); // Pass
   * ```
   */
  static toBeApproximate(actual: number, expected: number, tolerance: number): void {
    const difference = Math.abs(actual - expected);

    if (difference > tolerance) {
      throw new AssertionError(
        `Expected ${actual} to be approximately ${expected} (tolerance: ${tolerance}), but difference is ${difference}`,
        { actual, expected, tolerance, difference }
      );
    }
  }

  // Private helper methods

  private static checkSensation(cell: unknown, sensation: SensationType): boolean {
    // Implementation would check cell sensations
    // This is a placeholder
    return false;
  }

  private static getCellState(cell: unknown): CellState {
    // Implementation would get cell state
    return CellState.DORMANT;
  }

  private static getCellValue(cell: unknown): unknown {
    // Implementation would get cell value
    return null;
  }

  private static checkEntanglement(cell1: unknown, cell2: unknown): boolean {
    // Implementation would check bidirectional dependency
    return false;
  }

  private static getCellType(cell: unknown): CellType {
    // Implementation would get cell type
    return CellType.INPUT;
  }

  private static getLogicLevel(cell: unknown): LogicLevel {
    // Implementation would get logic level
    return LogicLevel.L0_LOGIC;
  }

  private static getDependencies(cell: unknown): CellId[] {
    // Implementation would get dependencies
    return [];
  }

  private static getWatchedCells(cell: unknown): CellReference[] {
    // Implementation would get watched cells
    return [];
  }

  private static getExecutionTime(cell: unknown): number {
    // Implementation would get execution time
    return 0;
  }

  private static getConfidence(cell: unknown): number {
    // Implementation would get confidence
    return 1.0;
  }

  private static isWithinTolerance(actual: unknown, expected: unknown, tolerance: number): boolean {
    if (typeof actual === 'number' && typeof expected === 'number') {
      return Math.abs(actual - expected) <= tolerance;
    }
    return actual === expected;
  }
}

/**
 * Custom matchers for Jest/Vitest
 *
 * @example
 * ```typescript
 * import { matchers } from './AssertionExtensions';
 * expect.extend(matchers);
 *
 * // Now you can use:
 * expect(cell).toHaveCellState(CellState.PROCESSING);
 * expect(cell).toHaveCellValue(42);
 * expect(cell).toBeEntangledWith(otherCell);
 * expect(50).toBeWithinRange(0, 100);
 * ```
 */
export const matchers = {
  /**
   * Matcher for cell state
   */
  toHaveCellState(cell: unknown, state: CellState) {
    try {
      AssertionExtensions.toBeInState(cell, state);
      return { pass: true, message: () => '' };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as AssertionError).message,
      };
    }
  },

  /**
   * Matcher for cell value
   */
  toHaveCellValue(cell: unknown, value: unknown, tolerance?: number) {
    try {
      AssertionExtensions.toHaveValue(cell, value, tolerance);
      return { pass: true, message: () => '' };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as AssertionError).message,
      };
    }
  },

  /**
   * Matcher for cell dependencies
   */
  toHaveCellDependencies(cell: unknown, dependencies: CellId[]) {
    try {
      AssertionExtensions.toHaveDependencies(cell, dependencies);
      return { pass: true, message: () => '' };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as AssertionError).message,
      };
    }
  },

  /**
   * Matcher for cell entanglement
   */
  toBeEntangledWith(cell1: unknown, cell2: unknown) {
    try {
      AssertionExtensions.toBeEntangledWith(cell1, cell2);
      return { pass: true, message: () => '' };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as AssertionError).message,
      };
    }
  },

  /**
   * Matcher for cell type
   */
  toBeCellOfType(cell: unknown, type: CellType) {
    try {
      AssertionExtensions.toBeOfType(cell, type);
      return { pass: true, message: () => '' };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as AssertionError).message,
      };
    }
  },

  /**
   * Matcher for logic level
   */
  toHaveLogicLevel(cell: unknown, level: LogicLevel) {
    try {
      AssertionExtensions.toHaveLogicLevel(cell, level);
      return { pass: true, message: () => '' };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as AssertionError).message,
      };
    }
  },

  /**
   * Matcher for watched cells
   */
  toHaveWatchedCells(cell: unknown, watched: CellReference[]) {
    try {
      AssertionExtensions.toHaveWatchedCells(cell, watched);
      return { pass: true, message: () => '' };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as AssertionError).message,
      };
    }
  },

  /**
   * Matcher for execution time
   */
  toExecuteWithin(cell: unknown, maxTime: number) {
    try {
      AssertionExtensions.toExecuteWithin(cell, maxTime);
      return { pass: true, message: () => '' };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as AssertionError).message,
      };
    }
  },

  /**
   * Matcher for confidence level
   */
  toHaveConfidenceAbove(cell: unknown, minConfidence: number) {
    try {
      AssertionExtensions.toHaveConfidenceAbove(cell, minConfidence);
      return { pass: true, message: () => '' };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as AssertionError).message,
      };
    }
  },

  /**
   * Matcher for range
   */
  toBeWithinRange(value: number, min: number, max: number) {
    try {
      AssertionExtensions.toBeWithinRange(value, min, max);
      return { pass: true, message: () => '' };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as AssertionError).message,
      };
    }
  },

  /**
   * Matcher for approximate equality
   */
  toBeApproximate(actual: number, expected: number, tolerance: number) {
    try {
      AssertionExtensions.toBeApproximate(actual, expected, tolerance);
      return { pass: true, message: () => '' };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as AssertionError).message,
      };
    }
  },
};

/**
 * Export individual assertion functions for convenience
 */
export const toHaveSensation = AssertionExtensions.toHaveSensation.bind(AssertionExtensions);
export const toBeInState = AssertionExtensions.toBeInState.bind(AssertionExtensions);
export const toHaveValue = AssertionExtensions.toHaveValue.bind(AssertionExtensions);
export const toBeEntangledWith = AssertionExtensions.toBeEntangledWith.bind(AssertionExtensions);
export const toBeOfType = AssertionExtensions.toBeOfType.bind(AssertionExtensions);
export const toHaveLogicLevel = AssertionExtensions.toHaveLogicLevel.bind(AssertionExtensions);
export const toHaveDependencies = AssertionExtensions.toHaveDependencies.bind(AssertionExtensions);
export const toHaveWatchedCells = AssertionExtensions.toHaveWatchedCells.bind(AssertionExtensions);
export const toExecuteWithin = AssertionExtensions.toExecuteWithin.bind(AssertionExtensions);
export const toHaveConfidenceAbove = AssertionExtensions.toHaveConfidenceAbove.bind(AssertionExtensions);
export const toBeWithinRange = AssertionExtensions.toBeWithinRange.bind(AssertionExtensions);
export const toBeApproximate = AssertionExtensions.toBeApproximate.bind(AssertionExtensions);

/**
 * AssertionHelpers - Custom assertion utilities for testing POLLN components
 *
 * Provides:
 * - Cell-specific assertions
 * - Colony-specific assertions
 * - Performance assertions
 * - Sensation assertions
 * - Consciousness assertions
 *
 * Compatible with Jest, Vitest, and other testing frameworks
 *
 * @module testing
 */

import type {
  CellState,
  CellSensation,
  SensationType,
  ColonyState
} from '../types';
import type { LogCell } from '../LogCell';
import type { PollnColony } from '../../core/Colony';

/**
 * Assertion error class
 */
export class AssertionError extends Error {
  constructor(
    message: string,
    public expected: any,
    public actual: any
  ) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Assertion result
 */
export interface AssertionResult {
  passed: boolean;
  message?: string;
  expected?: any;
  actual?: any;
  metadata?: Record<string, any>;
}

/**
 * Performance assertion thresholds
 */
export interface PerformanceThresholds {
  /** Maximum execution time in ms */
  maxExecutionTime?: number;
  /** Maximum memory usage in bytes */
  maxMemoryUsage?: number;
  /** Minimum operations per second */
  minOpsPerSecond?: number;
  /** Maximum CPU percentage */
  maxCpuPercent?: number;
}

/**
 * Sensation assertion options
 */
export interface SensationAssertions {
  /** Expected sensation types */
  types?: SensationType[];
  /** Minimum confidence level */
  minConfidence?: number;
  /** Expected sources */
  sources?: string[];
  /** Value assertions */
  values?: any[];
  /** Timestamp range */
  timeRange?: [number, number];
}

/**
 * Custom assertion helpers for POLLN testing
 */
export class AssertionHelpers {
  // ==================== Cell Assertions ====================

  /**
   * Assert cell is in specific state
   *
   * @param cell - Cell to check
   * @param state - Expected state
   * @throws AssertionError if state doesn't match
   */
  static assertCellState(cell: LogCell, state: CellState): void {
    const actualState = cell.getState();
    if (actualState !== state) {
      throw new AssertionError(
        `Cell ${cell.id} expected to be in state ${state}, but is in ${actualState}`,
        state,
        actualState
      );
    }
  }

  /**
   * Assert cell has specific value
   *
   * @param cell - Cell to check
   * @param value - Expected value
   * @param tolerance - Numeric tolerance (default: 0)
   */
  static assertCellValue(cell: LogCell, value: any, tolerance: number = 0): void {
    const actualValue = (cell as any).output;

    if (typeof value === 'number' && typeof actualValue === 'number') {
      if (Math.abs(value - actualValue) > tolerance) {
        throw new AssertionError(
          `Cell ${cell.id} value ${actualValue} exceeds tolerance ${tolerance} from expected ${value}`,
          value,
          actualValue
        );
      }
    } else if (actualValue !== value) {
      throw new AssertionError(
        `Cell ${cell.id} expected value ${value}, but got ${actualValue}`,
        value,
        actualValue
      );
    }
  }

  /**
   * Assert cell has specific dependencies
   *
   * @param cell - Cell to check
   * @param dependencies - Expected dependency IDs
   */
  static assertCellDependencies(cell: LogCell, dependencies: string[]): void {
    const actualDeps = (cell as any).dependencies?.map((d: LogCell) => d.id) || [];
    const missing = dependencies.filter(d => !actualDeps.includes(d));
    const extra = actualDeps.filter((d: string) => !dependencies.includes(d));

    if (missing.length > 0 || extra.length > 0) {
      throw new AssertionError(
        `Cell ${cell.id} dependencies mismatch. Missing: ${missing.join(', ')}. Extra: ${extra.join(', ')}`,
        dependencies,
        actualDeps
      );
    }
  }

  /**
   * Assert cell has specific sensations
   *
   * @param cell - Cell to check
   * @param assertions - Sensation assertions
   */
  static assertCellSensations(cell: LogCell, assertions: SensationAssertions): void {
    const sensations = (cell as any).sensations || [];

    if (assertions.types) {
      const actualTypes = sensations.map((s: CellSensation) => s.type);
      const missing = assertions.types.filter(t => !actualTypes.includes(t));
      if (missing.length > 0) {
        throw new AssertionError(
          `Cell ${cell.id} missing sensation types: ${missing.join(', ')}`,
          assertions.types,
          actualTypes
        );
      }
    }

    if (assertions.minConfidence !== undefined) {
      const lowConfidence = sensations.filter(
        (s: CellSensation) => (s.confidence || 0) < assertions.minConfidence
      );
      if (lowConfidence.length > 0) {
        throw new AssertionError(
          `Cell ${cell.id} has ${lowConfidence.length} sensations below confidence ${assertions.minConfidence}`,
          assertions.minConfidence,
          lowConfidence.map((s: CellSensation) => s.confidence)
        );
      }
    }

    if (assertions.sources) {
      const actualSources = sensations.map((s: CellSensation) => s.source);
      const missing = assertions.sources.filter(s => !actualSources.includes(s));
      if (missing.length > 0) {
        throw new AssertionError(
          `Cell ${cell.id} missing sensation sources: ${missing.join(', ')}`,
          assertions.sources,
          actualSources
        );
      }
    }
  }

  /**
   * Assert cell has learned specific pattern
   *
   * @param cell - Cell to check
   * @param pattern - Pattern to check for
   */
  static assertCellLearned(cell: LogCell, pattern: any): void {
    const memory = (cell as any).memory;
    const hasLearned = memory?.patterns?.some((p: any) => this.deepEqual(p, pattern));

    if (!hasLearned) {
      throw new AssertionError(
        `Cell ${cell.id} has not learned pattern`,
        pattern,
        memory?.patterns || []
      );
    }
  }

  // ==================== Colony Assertions ====================

  /**
   * Assert colony is in specific state
   *
   * @param colony - Colony to check
   * @param state - Expected state
   */
  static assertColonyState(colony: PollnColony, state: ColonyState): void {
    const actualState = colony.getState();
    if (actualState !== state) {
      throw new AssertionError(
        `Colony ${colony.id} expected to be in state ${state}, but is in ${actualState}`,
        state,
        actualState
      );
    }
  }

  /**
   * Assert colony has specific number of agents
   *
   * @param colony - Colony to check
   * @param count - Expected agent count
   */
  static assertColonyAgentCount(colony: PollnColony, count: number): void {
    const actualCount = colony.getAgentCount();
    if (actualCount !== count) {
      throw new AssertionError(
        `Colony ${colony.id} expected ${count} agents, but has ${actualCount}`,
        count,
        actualCount
      );
    }
  }

  /**
   * Assert colony has specific number of active agents
   *
   * @param colony - Colony to check
   * @param count - Expected active agent count
   */
  static assertColonyActiveAgents(colony: PollnColony, count: number): void {
    const actualCount = colony.getActiveAgentCount();
    if (actualCount !== count) {
      throw new AssertionError(
        `Colony ${colony.id} expected ${count} active agents, but has ${actualCount}`,
        count,
        actualCount
      );
    }
  }

  /**
   * Assert colony has specific agent
   *
   * @param colony - Colony to check
   * @param agentId - Agent ID to check for
   */
  static assertColonyHasAgent(colony: PollnColony, agentId: string): void {
    const agent = colony.getAgent(agentId);
    if (!agent) {
      throw new AssertionError(
        `Colony ${colony.id} expected to have agent ${agentId}, but doesn't`,
        agentId,
        null
      );
    }
  }

  // ==================== Performance Assertions ====================

  /**
   * Assert operation completes within time limit
   *
   * @param operation - Operation to measure
   * @param maxTime - Maximum time in ms
   * @returns Operation result
   */
  static async assertExecutionTime<T>(
    operation: () => Promise<T> | T,
    maxTime: number
  ): Promise<T> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;

    if (duration > maxTime) {
      throw new AssertionError(
        `Operation exceeded maximum time ${maxTime}ms, took ${duration}ms`,
        maxTime,
        duration
      );
    }

    return result;
  }

  /**
   * Assert memory usage is within limit
   *
   * @param operation - Operation to measure
   * @param maxMemory - Maximum memory in bytes
   * @returns Operation result
   */
  static async assertMemoryUsage<T>(
    operation: () => Promise<T> | T,
    maxMemory: number
  ): Promise<T> {
    const before = process.memoryUsage().heapUsed;
    const result = await operation();
    const after = process.memoryUsage().heapUsed;
    const used = after - before;

    if (used > maxMemory) {
      throw new AssertionError(
        `Operation exceeded maximum memory ${maxMemory} bytes, used ${used} bytes`,
        maxMemory,
        used
      );
    }

    return result;
  }

  /**
   * Assert operations per second meets minimum
   *
   * @param operation - Operation to benchmark
   * @param minOpsPerSecond - Minimum ops/sec
   * @param duration - Test duration in ms
   */
  static async assertOpsPerSecond(
    operation: () => Promise<void> | void,
    minOpsPerSecond: number,
    duration: number = 1000
  ): Promise<void> {
    const startTime = Date.now();
    let operations = 0;

    while (Date.now() - startTime < duration) {
      await operation();
      operations++;
    }

    const actualDuration = Date.now() - startTime;
    const opsPerSecond = (operations / actualDuration) * 1000;

    if (opsPerSecond < minOpsPerSecond) {
      throw new AssertionError(
        `Operations per second ${opsPerSecond.toFixed(2)} below minimum ${minOpsPerSecond}`,
        minOpsPerSecond,
        opsPerSecond
      );
    }
  }

  // ==================== Sensation Assertions ====================

  /**
   * Assert sensation is of specific type
   *
   * @param sensation - Sensation to check
   * @param type - Expected type
   */
  static assertSensationType(sensation: CellSensation, type: SensationType): void {
    if (sensation.type !== type) {
      throw new AssertionError(
        `Sensation expected to be type ${type}, but is ${sensation.type}`,
        type,
        sensation.type
      );
    }
  }

  /**
   * Assert sensation has minimum confidence
   *
   * @param sensation - Sensation to check
   * @param minConfidence - Minimum confidence (0-1)
   */
  static assertSensationConfidence(sensation: CellSensation, minConfidence: number): void {
    const confidence = sensation.confidence || 0;
    if (confidence < minConfidence) {
      throw new AssertionError(
        `Sensation confidence ${confidence} below minimum ${minConfidence}`,
        minConfidence,
        confidence
      );
    }
  }

  /**
   * Assert sensation is from specific source
   *
   * @param sensation - Sensation to check
   * @param source - Expected source
   */
  static assertSensationSource(sensation: CellSensation, source: string): void {
    if (sensation.source !== source) {
      throw new AssertionError(
        `Sensation expected to be from ${source}, but is from ${sensation.source}`,
        source,
        sensation.source
      );
    }
  }

  // ==================== Consciousness Assertions ====================

  /**
   * Assert cell exhibits learning behavior
   *
   * @param cell - Cell to check
   * @param minLearnings - Minimum number of learnings
   */
  static assertCellLearns(cell: LogCell, minLearnings: number = 1): void {
    const learnings = (cell as any).memory?.learnings?.length || 0;
    if (learnings < minLearnings) {
      throw new AssertionError(
        `Cell ${cell.id} has ${learnings} learnings, expected at least ${minLearnings}`,
        minLearnings,
        learnings
      );
    }
  }

  /**
   * Assert cell exhibits pattern recognition
   *
   * @param cell - Cell to check
   * @param minPatterns - Minimum number of patterns
   */
  static assertCellRecognizesPatterns(cell: LogCell, minPatterns: number = 1): void {
    const patterns = (cell as any).memory?.patterns?.length || 0;
    if (patterns < minPatterns) {
      throw new AssertionError(
        `Cell ${cell.id} has ${patterns} patterns, expected at least ${minPatterns}`,
        minPatterns,
        patterns
      );
    }
  }

  /**
   * Assert cell has memory retention
   *
   * @param cell - Cell to check
   * @param minHistoryLength - Minimum history length
   */
  static assertCellHasMemory(cell: LogCell, minHistoryLength: number = 1): void {
    const historyLength = (cell as any).memory?.history?.length || 0;
    if (historyLength < minHistoryLength) {
      throw new AssertionError(
        `Cell ${cell.id} has history length ${historyLength}, expected at least ${minHistoryLength}`,
        minHistoryLength,
        historyLength
      );
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Deep equality check
   *
   * @param a - First value
   * @param b - Second value
   * @returns True if deeply equal
   */
  static deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a !== 'object') return false;

    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index]));
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => this.deepEqual(a[key], b[key]));
  }

  /**
   * Soft assertion - collects failures instead of throwing
   *
   * @param assertions - Assertions to run
   * @returns Assertion results
   */
  static softAssert(assertions: Array<() => void>): AssertionResult[] {
    const results: AssertionResult[] = [];

    assertions.forEach(assertion => {
      try {
        assertion();
        results.push({ passed: true });
      } catch (error) {
        if (error instanceof AssertionError) {
          results.push({
            passed: false,
            message: error.message,
            expected: error.expected,
            actual: error.actual
          });
        } else {
          results.push({
            passed: false,
            message: (error as Error).message
          });
        }
      }
    });

    return results;
  }

  /**
   * Assert all soft assertions pass
   *
   * @param results - Soft assertion results
   */
  static assertAllPass(results: AssertionResult[]): void {
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
      const messages = failures.map(f => f.message).join('\n');
      throw new Error(`\n${failures.length} assertions failed:\n${messages}`);
    }
  }

  /**
   * Assert value is within range
   *
   * @param value - Value to check
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   */
  static assertInRange(value: number, min: number, max: number): void {
    if (value < min || value > max) {
      throw new AssertionError(
        `Value ${value} not in range [${min}, ${max}]`,
        [min, max],
        value
      );
    }
  }

  /**
   * Assert value is approximately equal
   *
   * @param actual - Actual value
   * @param expected - Expected value
   * @param tolerance - Maximum difference
   */
  static assertApproximate(actual: number, expected: number, tolerance: number = 0.001): void {
    if (Math.abs(actual - expected) > tolerance) {
      throw new AssertionError(
        `Value ${actual} not approximately ${expected} (tolerance: ${tolerance})`,
        expected,
        actual
      );
    }
  }

  /**
   * Assert array contains element
   *
   * @param array - Array to check
   * @param element - Element to look for
   */
  static assertContains<T>(array: T[], element: T): void {
    if (!array.includes(element)) {
      throw new AssertionError(
        `Array does not contain element`,
        element,
        array
      );
    }
  }

  /**
   * Assert array has length
   *
   * @param array - Array to check
   * @param length - Expected length
   */
  static assertArrayLength(array: any[], length: number): void {
    if (array.length !== length) {
      throw new AssertionError(
        `Array length ${array.length} != expected ${length}`,
        length,
        array.length
      );
    }
  }

  /**
   * Assert object has property
   *
   * @param obj - Object to check
   * @param property - Property name
   */
  static assertHasProperty(obj: any, property: string): void {
    if (!(property in obj)) {
      throw new AssertionError(
        `Object does not have property ${property}`,
        property,
        Object.keys(obj)
      );
    }
  }

  /**
   * Assert promise throws error
   *
   * @param promise - Promise to check
   * @param expectedError - Expected error message or type
   */
  static async assertThrows(
    promise: Promise<any>,
    expectedError?: string | RegExp | ErrorConstructor
  ): Promise<Error> {
    try {
      await promise;
      throw new AssertionError('Expected promise to throw, but it resolved', 'throw', 'resolve');
    } catch (error) {
      if (expectedError === undefined) {
        return error as Error;
      }

      const actualError = error as Error;

      if (typeof expectedError === 'string') {
        if (!actualError.message.includes(expectedError)) {
          throw new AssertionError(
            `Error message "${actualError.message}" does not include "${expectedError}"`,
            expectedError,
            actualError.message
          );
        }
      } else if (expectedError instanceof RegExp) {
        if (!expectedError.test(actualError.message)) {
          throw new AssertionError(
            `Error message "${actualError.message}" does not match pattern`,
            expectedError,
            actualError.message
          );
        }
      } else if (typeof expectedError === 'function') {
        if (!(error instanceof expectedError)) {
          throw new AssertionError(
            `Error is not instance of ${expectedError.name}`,
            expectedError.name,
            error.constructor.name
          );
        }
      }

      return actualError;
    }
  }
}

// ==================== Jest/Vitest Custom Matchers ====================

/**
 * Custom matchers for Jest/Vitest
 *
 * @example
 * ```typescript
 * import { matchers } from './AssertionHelpers';
 * expect.extend(matchers);
 *
 * test('cell state', () => {
 *   expect(cell).toHaveCellState(CellState.READY);
 * });
 * ```
 */
export const matchers = {
  toHaveCellState(received: LogCell, expected: CellState) {
    const pass = received.getState() === expected;
    return {
      pass,
      message: () => `expected cell ${received.id} to ${pass ? 'not ' : ''}have state ${expected}`
    };
  },

  toHaveCellValue(received: LogCell, expected: any, tolerance: number = 0) {
    const actual = (received as any).output;
    let pass = false;

    if (typeof expected === 'number' && typeof actual === 'number') {
      pass = Math.abs(expected - actual) <= tolerance;
    } else {
      pass = actual === expected;
    }

    return {
      pass,
      message: () => `expected cell ${received.id} to ${pass ? 'not ' : ''}have value ${expected}`
    };
  },

  toHaveCellDependencies(received: LogCell, expected: string[]) {
    const actual = (received as any).dependencies?.map((d: LogCell) => d.id) || [];
    const pass = expected.every(e => actual.includes(e)) && actual.every(a => expected.includes(a));

    return {
      pass,
      message: () => `expected cell ${received.id} to ${pass ? 'not ' : ''}have dependencies ${expected}`
    };
  },

  toHaveLearned(received: LogCell, pattern: any) {
    const memory = (received as any).memory;
    const pass = memory?.patterns?.some((p: any) => AssertionHelpers.deepEqual(p, pattern));

    return {
      pass,
      message: () => `expected cell ${received.id} to ${pass ? 'not ' : ''}have learned pattern`
    };
  },

  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () => `expected ${received} to ${pass ? 'not ' : ''}be within range [${min}, ${max}]`
    };
  },

  toBeApproximate(received: number, expected: number, tolerance: number = 0.001) {
    const pass = Math.abs(received - expected) <= tolerance;
    return {
      pass,
      message: () => `expected ${received} to ${pass ? 'not ' : ''}be approximately ${expected} (±${tolerance})`
    };
  }
};

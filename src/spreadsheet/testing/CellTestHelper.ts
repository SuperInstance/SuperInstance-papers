/**
 * CellTestHelper - Comprehensive utilities for testing LogCell instances
 *
 * Provides helpers for:
 * - Cell creation and configuration
 * - State inspection and verification
 * - Simulation and execution
 * - Assertion and validation
 * - Mock dependencies
 *
 * @module testing
 */

import type {
  CellSensation,
  CellMemory,
  CellConfig,
  CellState,
  SensationType
} from '../types';
import { LogCell } from '../LogCell';
import { CellOrigin } from '../core/CellOrigin';
import { CellHead } from '../core/CellHead';
import { CellBody } from '../core/CellBody';
import { CellTail } from '../core/CellTail';

/**
 * Test cell configuration with defaults
 */
export interface TestCellConfig extends Partial<CellConfig> {
  /** Test identifier for tracking */
  testId?: string;
  /** Mock dependencies to inject */
  mocks?: {
    dependencies?: LogCell[];
    sensation?: CellSensation[];
    memory?: CellMemory;
  };
  /** Simulation options */
  simulation?: {
    delay?: number;
    iterations?: number;
    errorOnFailure?: boolean;
  };
}

/**
 * Cell state snapshot for testing
 */
export interface CellStateSnapshot {
  id: string;
  state: CellState;
  input: any;
  output: any;
  sensations: CellSensation[];
  memory: CellMemory;
  timestamp: number;
  metadata: Record<string, any>;
}

/**
 * Cell test result
 */
export interface CellTestResult {
  passed: boolean;
  cellId: string;
  duration: number;
  snapshots: CellStateSnapshot[];
  errors: Error[];
  warnings: string[];
}

/**
 * Helper class for testing LogCell instances
 */
export class CellTestHelper {
  private static testRegistry = new Map<string, LogCell>();
  private static snapshotHistory = new Map<string, CellStateSnapshot[]>();
  private static testResults = new Map<string, CellTestResult>();

  /**
   * Create a test cell with minimal configuration
   *
   * @param config - Cell configuration
   * @returns Configured LogCell instance
   *
   * @example
   * ```typescript
   * const cell = CellTestHelper.createTestCell({
   *   testId: 'test-1',
   *   type: 'transform',
   *   config: { operation: 'add' }
   * });
   * ```
   */
  static createTestCell(config: TestCellConfig = {}): LogCell {
    const {
      testId = `test-cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mocks = {},
      simulation = {},
      ...cellConfig
    } = config;

    const cell = new LogCell({
      id: testId,
      type: cellConfig.type || 'transform',
      config: cellConfig.config || {},
      ...cellConfig
    });

    // Inject mocks
    if (mocks.dependencies) {
      mocks.dependencies.forEach(dep => cell.addDependency(dep));
    }

    if (mocks.sensation) {
      mocks.sensation.forEach(sensation => {
        (cell as any).addSensation(sensation);
      });
    }

    if (mocks.memory) {
      (cell as any).setMemory(mocks.memory);
    }

    // Register for cleanup
    this.testRegistry.set(testId, cell);
    this.snapshotHistory.set(testId, []);

    return cell;
  }

  /**
   * Create multiple test cells with a single configuration
   *
   * @param count - Number of cells to create
   * @param config - Base configuration (will be cloned for each cell)
   * @returns Array of configured LogCell instances
   */
  static createTestCells(count: number, config: TestCellConfig = {}): LogCell[] {
    const cells: LogCell[] = [];
    for (let i = 0; i < count; i++) {
      const cellConfig = {
        ...config,
        testId: config.testId ? `${config.testId}-${i}` : undefined
      };
      cells.push(this.createTestCell(cellConfig));
    }
    return cells;
  }

  /**
   * Create a cell chain (A -> B -> C) for testing dependencies
   *
   * @param count - Number of cells in chain
   * @param config - Base configuration for all cells
   * @returns Array of connected LogCell instances
   */
  static createCellChain(count: number, config: TestCellConfig = {}): LogCell[] {
    const cells = this.createTestCells(count, config);

    for (let i = 1; i < cells.length; i++) {
      cells[i].addDependency(cells[i - 1]);
    }

    return cells;
  }

  /**
   * Create a cell mesh (each cell connected to N others)
   *
   * @param count - Number of cells
   * @param connections - Number of connections per cell
   * @param config - Base configuration
   * @returns Array of interconnected LogCell instances
   */
  static createCellMesh(
    count: number,
    connections: number,
    config: TestCellConfig = {}
  ): LogCell[] {
    const cells = this.createTestCells(count, config);

    cells.forEach((cell, index) => {
      for (let i = 1; i <= connections; i++) {
        const targetIndex = (index + i) % count;
        cell.addDependency(cells[targetIndex]);
      }
    });

    return cells;
  }

  /**
   * Capture a snapshot of cell state
   *
   * @param cell - Cell to snapshot
   * @returns State snapshot
   */
  static captureSnapshot(cell: LogCell): CellStateSnapshot {
    const snapshot: CellStateSnapshot = {
      id: cell.id,
      state: cell.getState(),
      input: this.getCellValue(cell, 'input'),
      output: this.getCellValue(cell, 'output'),
      sensations: this.getCellSensations(cell),
      memory: this.getCellMemory(cell),
      timestamp: Date.now(),
      metadata: {
        type: (cell as any).type,
        dependencies: this.getDependencies(cell).map(d => d.id),
        config: (cell as any).config
      }
    };

    // Store in history
    const history = this.snapshotHistory.get(cell.id) || [];
    history.push(snapshot);
    this.snapshotHistory.set(cell.id, history);

    return snapshot;
  }

  /**
   * Get current cell value by path
   *
   * @param cell - Target cell
   * @param path - Value path (e.g., 'input', 'output', 'config.value')
   * @returns Cell value
   */
  static getCellValue(cell: LogCell, path: string): any {
    const parts = path.split('.');
    let value: any = cell;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Get cell dependencies
   *
   * @param cell - Target cell
   * @returns Array of dependency cells
   */
  static getDependencies(cell: LogCell): LogCell[] {
    return (cell as any).dependencies || [];
  }

  /**
   * Get cell sensations
   *
   * @param cell - Target cell
   * @returns Array of sensations
   */
  static getCellSensations(cell: LogCell): CellSensation[] {
    return (cell as any).sensations || [];
  }

  /**
   * Get cell memory
   *
   * @param cell - Target cell
   * @returns Cell memory
   */
  static getCellMemory(cell: LogCell): CellMemory {
    return (cell as any).memory || { history: [], patterns: [], learnings: [] };
  }

  /**
   * Simulate cell execution
   *
   * @param cell - Cell to simulate
   * @param input - Input value
   * @param config - Simulation configuration
   * @returns Simulation result
   */
  static async simulateExecution(
    cell: LogCell,
    input: any,
    config: TestCellConfig['simulation'] = {}
  ): Promise<CellTestResult> {
    const startTime = Date.now();
    const result: CellTestResult = {
      passed: true,
      cellId: cell.id,
      duration: 0,
      snapshots: [],
      errors: [],
      warnings: []
    };

    try {
      // Capture initial state
      result.snapshots.push(this.captureSnapshot(cell));

      // Execute with delay if specified
      if (config.delay) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }

      // Execute for specified iterations
      const iterations = config.iterations || 1;
      for (let i = 0; i < iterations; i++) {
        await cell.process(input);
        result.snapshots.push(this.captureSnapshot(cell));
      }

      result.duration = Date.now() - startTime;
    } catch (error) {
      result.passed = false;
      result.errors.push(error as Error);
      result.duration = Date.now() - startTime;

      if (config.errorOnFailure) {
        throw error;
      }
    }

    this.testResults.set(cell.id, result);
    return result;
  }

  /**
   * Simulate multiple cells in parallel
   *
   * @param cells - Cells to simulate
   * @param inputs - Input values (matched by index)
   * @param config - Simulation configuration
   * @returns Array of test results
   */
  static async simulateParallel(
    cells: LogCell[],
    inputs: any[],
    config: TestCellConfig['simulation'] = {}
  ): Promise<CellTestResult[]> {
    const results = await Promise.all(
      cells.map((cell, index) =>
        this.simulateExecution(cell, inputs[index], config)
      )
    );

    return results;
  }

  /**
   * Assert cell state matches expected values
   *
   * @param cell - Cell to assert
   * @param assertions - Expected values
   * @returns Assertion result
   */
  static assertCellState(
    cell: LogCell,
    assertions: {
      state?: CellState;
      input?: any;
      output?: any;
      hasDependencies?: number;
      hasSensations?: number;
    }
  ): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    if (assertions.state !== undefined && cell.getState() !== assertions.state) {
      errors.push(
        `Expected state ${assertions.state}, got ${cell.getState()}`
      );
    }

    if (assertions.input !== undefined) {
      const input = this.getCellValue(cell, 'input');
      if (!this.deepEqual(input, assertions.input)) {
        errors.push(`Input mismatch: expected ${JSON.stringify(assertions.input)}, got ${JSON.stringify(input)}`);
      }
    }

    if (assertions.output !== undefined) {
      const output = this.getCellValue(cell, 'output');
      if (!this.deepEqual(output, assertions.output)) {
        errors.push(`Output mismatch: expected ${JSON.stringify(assertions.output)}, got ${JSON.stringify(output)}`);
      }
    }

    if (assertions.hasDependencies !== undefined) {
      const deps = this.getDependencies(cell);
      if (deps.length !== assertions.hasDependencies) {
        errors.push(
          `Expected ${assertions.hasDependencies} dependencies, got ${deps.length}`
        );
      }
    }

    if (assertions.hasSensations !== undefined) {
      const sensations = this.getCellSensations(cell);
      if (sensations.length !== assertions.hasSensations) {
        errors.push(
          `Expected ${assertions.hasSensations} sensations, got ${sensations.length}`
        );
      }
    }

    return {
      passed: errors.length === 0,
      errors
    };
  }

  /**
   * Assert cell transitioned through expected states
   *
   * @param cellId - Cell ID to check
   * @param expectedStates - Expected state sequence
   * @returns Assertion result
   */
  static assertStateTransition(
    cellId: string,
    expectedStates: CellState[]
  ): { passed: boolean; errors: string[] } {
    const snapshots = this.snapshotHistory.get(cellId) || [];
    const errors: string[] = [];

    if (snapshots.length < expectedStates.length) {
      errors.push(
        `Not enough snapshots: expected ${expectedStates.length}, got ${snapshots.length}`
      );
      return { passed: false, errors };
    }

    expectedStates.forEach((expectedState, index) => {
      const actualState = snapshots[index].state;
      if (actualState !== expectedState) {
        errors.push(
          `State ${index}: expected ${expectedState}, got ${actualState}`
        );
      }
    });

    return {
      passed: errors.length === 0,
      errors
    };
  }

  /**
   * Deep equality check for complex objects
   *
   * @param a - First value
   * @param b - Second value
   * @returns True if deeply equal
   */
  private static deepEqual(a: any, b: any): boolean {
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
   * Cleanup test cells
   *
   * @param cellIds - Specific cell IDs to cleanup (omitted = all)
   */
  static cleanup(cellIds?: string[]): void {
    const idsToCleanup = cellIds || Array.from(this.testRegistry.keys());

    idsToCleanup.forEach(id => {
      this.testRegistry.delete(id);
      this.snapshotHistory.delete(id);
      this.testResults.delete(id);
    });
  }

  /**
   * Get test result for a cell
   *
   * @param cellId - Cell ID
   * @returns Test result or undefined
   */
  static getTestResult(cellId: string): CellTestResult | undefined {
    return this.testResults.get(cellId);
  }

  /**
   * Get all test results
   *
   * @returns Map of cell ID to test result
   */
  static getAllTestResults(): Map<string, CellTestResult> {
    return new Map(this.testResults);
  }

  /**
   * Reset all test state
   */
  static reset(): void {
    this.testRegistry.clear();
    this.snapshotHistory.clear();
    this.testResults.clear();
  }

  /**
   * Create a mock sensation for testing
   *
   * @param type - Sensation type
   * @param source - Source cell ID
   * @param value - Sensation value
   * @returns Mock sensation
   */
  static createMockSensation(
    type: SensationType,
    source: string,
    value: any
  ): CellSensation {
    return {
      type,
      source,
      value,
      timestamp: Date.now(),
      confidence: 1.0
    };
  }

  /**
   * Wait for cell to reach a specific state
   *
   * @param cell - Cell to wait for
   * @param state - Target state
   * @param timeout - Maximum wait time in ms
   * @returns Promise resolving when state is reached
   */
  static async waitForState(
    cell: LogCell,
    state: CellState,
    timeout: number = 5000
  ): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkState = () => {
        if (cell.getState() === state) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(
            new Error(
              `Timeout waiting for state ${state}, current state: ${cell.getState()}`
            )
          );
        } else {
          setTimeout(checkState, 50);
        }
      };

      checkState();
    });
  }
}

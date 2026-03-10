/**
 * ColonyTestHelper - Comprehensive utilities for testing PollnColony instances
 *
 * Provides helpers for:
 * - Colony creation and configuration
 * - Agent deployment and management
 * - Colony simulation and execution
 * - State verification and inspection
 * - Performance measurement
 *
 * @module testing
 */

import type {
  ColonyConfig,
  AgentConfig,
  ColonyState,
  AgentState
} from '../../core/types';
import { PollnColony } from '../../core/Colony';
import type { LogCell } from '../LogCell';
import { CellTestHelper, type TestCellConfig } from './CellTestHelper';

/**
 * Test colony configuration
 */
export interface TestColonyConfig extends Partial<ColonyConfig> {
  /** Test identifier */
  testId?: string;
  /** Mock agents to pre-deploy */
  mockAgents?: AgentConfig[];
  /** Simulation options */
  simulation?: {
    duration?: number;
    tickRate?: number;
    autoStart?: boolean;
  };
}

/**
 * Colony state snapshot
 */
export interface ColonySnapshot {
  id: string;
  state: ColonyState;
  agentCount: number;
  activeAgents: number;
  timestamp: number;
  metadata: Record<string, any>;
}

/**
 * Colony test result
 */
export interface ColonyTestResult {
  passed: boolean;
  colonyId: string;
  duration: number;
  snapshots: ColonySnapshot[];
  agentResults: Map<string, any>;
  errors: Error[];
  warnings: string[];
  performance: {
    ticksProcessed: number;
    averageTickTime: number;
    peakMemoryUsage: number;
  };
}

/**
 * Helper class for testing PollnColony instances
 */
export class ColonyTestHelper {
  private static testColonies = new Map<string, PollnColony>();
  private static snapshotHistory = new Map<string, ColonySnapshot[]>();
  private static testResults = new Map<string, ColonyTestResult>();
  private static performanceMetrics = new Map<string, number[]>();

  /**
   * Create a test colony with minimal configuration
   *
   * @param config - Colony configuration
   * @returns Configured PollnColony instance
   *
   * @example
   * ```typescript
   * const colony = ColonyTestHelper.createTestColony({
   *   testId: 'test-colony-1',
   *   agentLimit: 10,
   *   config: { tickRate: 100 }
   * });
   * ```
   */
  static createTestColony(config: TestColonyConfig = {}): PollnColony {
    const {
      testId = `test-colony-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mockAgents = [],
      simulation = {},
      ...colonyConfig
    } = config;

    const colony = new PollnColony({
      id: testId,
      ...colonyConfig
    });

    // Deploy mock agents
    mockAgents.forEach(agentConfig => {
      colony.deployAgent(agentConfig);
    });

    // Auto-start if requested
    if (simulation.autoStart) {
      colony.start();
    }

    // Register for cleanup
    this.testColonies.set(testId, colony);
    this.snapshotHistory.set(testId, []);
    this.performanceMetrics.set(testId, []);

    return colony;
  }

  /**
   * Create a colony with cells as agents
   *
   * @param cells - Cells to deploy as agents
   * @param config - Colony configuration
   * @returns Colony with deployed cell agents
   */
  static createColonyWithCells(
    cells: LogCell[],
    config: TestColonyConfig = {}
  ): PollnColony {
    const colony = this.createTestColony(config);

    cells.forEach(cell => {
      const agentConfig: AgentConfig = {
        id: cell.id,
        type: 'cell-agent',
        config: { cell },
        capabilities: ['process', 'learn', 'evolve']
      };
      colony.deployAgent(agentConfig);
    });

    return colony;
  }

  /**
   * Capture a snapshot of colony state
   *
   * @param colony - Colony to snapshot
   * @returns State snapshot
   */
  static captureSnapshot(colony: PollnColony): ColonySnapshot {
    const snapshot: ColonySnapshot = {
      id: colony.id,
      state: colony.getState(),
      agentCount: colony.getAgentCount(),
      activeAgents: colony.getActiveAgentCount(),
      timestamp: Date.now(),
      metadata: {
        agentLimit: (colony as any).agentLimit,
        tickRate: (colony as any).tickRate,
        config: (colony as any).config
      }
    };

    // Store in history
    const history = this.snapshotHistory.get(colony.id) || [];
    history.push(snapshot);
    this.snapshotHistory.set(colony.id, history);

    return snapshot;
  }

  /**
   * Simulate colony execution
   *
   * @param colony - Colony to simulate
   * @param duration - Simulation duration in ms
   * @param config - Simulation configuration
   * @returns Simulation result
   */
  static async simulateExecution(
    colony: PollnColony,
    duration: number,
    config: TestColonyConfig['simulation'] = {}
  ): Promise<ColonyTestResult> {
    const startTime = Date.now();
    const result: ColonyTestResult = {
      passed: true,
      colonyId: colony.id,
      duration: 0,
      snapshots: [],
      agentResults: new Map(),
      errors: [],
      warnings: [],
      performance: {
        ticksProcessed: 0,
        averageTickTime: 0,
        peakMemoryUsage: 0
      }
    };

    const tickRate = config.tickRate || 100;
    const tickTimes: number[] = [];

    try {
      // Start colony if not running
      if (colony.getState() === ColonyState.IDLE) {
        colony.start();
      }

      // Capture initial state
      result.snapshots.push(this.captureSnapshot(colony));

      // Run for specified duration
      const endTime = startTime + duration;
      let tickCount = 0;

      while (Date.now() < endTime) {
        const tickStart = Date.now();

        // Execute tick
        await colony.tick();

        const tickTime = Date.now() - tickStart;
        tickTimes.push(tickTime);
        tickCount++;

        // Capture snapshot every 10 ticks
        if (tickCount % 10 === 0) {
          result.snapshots.push(this.captureSnapshot(colony));
        }

        // Wait for tick rate
        await new Promise(resolve => setTimeout(resolve, tickRate));
      }

      // Capture final state
      result.snapshots.push(this.captureSnapshot(colony));

      // Calculate performance metrics
      result.performance.ticksProcessed = tickCount;
      result.performance.averageTickTime =
        tickTimes.reduce((sum, time) => sum + time, 0) / tickTimes.length;
      result.performance.peakMemoryUsage = process.memoryUsage().heapUsed;

      result.duration = Date.now() - startTime;
    } catch (error) {
      result.passed = false;
      result.errors.push(error as Error);
      result.duration = Date.now() - startTime;
    }

    this.testResults.set(colony.id, result);
    return result;
  }

  /**
   * Deploy test agent to colony
   *
   * @param colony - Target colony
   * @param config - Agent configuration
   * @returns Deployed agent ID
   */
  static deployTestAgent(
    colony: PollnColony,
    config: Partial<AgentConfig> = {}
  ): string {
    const agentConfig: AgentConfig = {
      id: `test-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'test-agent',
      config: {},
      capabilities: ['test'],
      ...config
    };

    colony.deployAgent(agentConfig);
    return agentConfig.id;
  }

  /**
   * Deploy multiple test agents
   *
   * @param colony - Target colony
   * @param count - Number of agents
   * @param config - Base configuration
   * @returns Array of agent IDs
   */
  static deployTestAgents(
    colony: PollnColony,
    count: number,
    config: Partial<AgentConfig> = {}
  ): string[] {
    const agentIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const agentConfig: AgentConfig = {
        id: config.id ? `${config.id}-${i}` : `test-agent-${Date.now()}-${i}`,
        type: config.type || 'test-agent',
        config: config.config || {},
        capabilities: config.capabilities || ['test']
      };

      colony.deployAgent(agentConfig);
      agentIds.push(agentConfig.id);
    }

    return agentIds;
  }

  /**
   * Assert colony state matches expected values
   *
   * @param colony - Colony to assert
   * @param assertions - Expected values
   * @returns Assertion result
   */
  static assertColonyState(
    colony: PollnColony,
    assertions: {
      state?: ColonyState;
      agentCount?: number;
      activeAgents?: number;
      hasAgent?: string;
    }
  ): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    if (assertions.state !== undefined && colony.getState() !== assertions.state) {
      errors.push(
        `Expected state ${assertions.state}, got ${colony.getState()}`
      );
    }

    if (assertions.agentCount !== undefined) {
      const count = colony.getAgentCount();
      if (count !== assertions.agentCount) {
        errors.push(
          `Expected ${assertions.agentCount} agents, got ${count}`
        );
      }
    }

    if (assertions.activeAgents !== undefined) {
      const count = colony.getActiveAgentCount();
      if (count !== assertions.activeAgents) {
        errors.push(
          `Expected ${assertions.activeAgents} active agents, got ${count}`
        );
      }
    }

    if (assertions.hasAgent !== undefined) {
      const agent = colony.getAgent(assertions.hasAgent);
      if (!agent) {
        errors.push(`Expected to find agent ${assertions.hasAgent}`);
      }
    }

    return {
      passed: errors.length === 0,
      errors
    };
  }

  /**
   * Assert colony transitioned through expected states
   *
   * @param colonyId - Colony ID to check
   * @param expectedStates - Expected state sequence
   * @returns Assertion result
   */
  static assertStateTransition(
    colonyId: string,
    expectedStates: ColonyState[]
  ): { passed: boolean; errors: string[] } {
    const snapshots = this.snapshotHistory.get(colonyId) || [];
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
   * Measure colony performance
   *
   * @param colony - Colony to measure
   * @param operation - Operation to measure
   * @param iterations - Number of iterations
   * @returns Performance metrics
   */
  static async measurePerformance(
    colony: PollnColony,
    operation: 'tick' | 'deploy' | 'remove',
    iterations: number = 100
  ): Promise<{
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    operationsPerSecond: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();

      switch (operation) {
        case 'tick':
          await colony.tick();
          break;
        case 'deploy':
          this.deployTestAgent(colony);
          break;
        case 'remove':
          const agents = (colony as any).agents;
          if (agents.length > 0) {
            colony.removeAgent(agents[0].id);
          }
          break;
      }

      times.push(Date.now() - start);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const operationsPerSecond = 1000 / averageTime;

    return {
      totalTime,
      averageTime,
      minTime,
      maxTime,
      operationsPerSecond
    };
  }

  /**
   * Stress test colony with load
   *
   * @param colony - Colony to stress test
   * @param config - Stress test configuration
   * @returns Stress test results
   */
  static async stressTest(
    colony: PollnColony,
    config: {
      agentCount?: number;
      duration?: number;
      operationRate?: number;
    } = {}
  ): Promise<{
    success: boolean;
    maxAgentsReached: number;
    operationsCompleted: number;
    errors: Error[];
    averageResponseTime: number;
  }> {
    const {
      agentCount = 100,
      duration = 5000,
      operationRate = 10
    } = config;

    const result = {
      success: true,
      maxAgentsReached: 0,
      operationsCompleted: 0,
      errors: [] as Error[],
      averageResponseTime: 0
    };

    const responseTimes: number[] = [];
    const startTime = Date.now();

    try {
      // Deploy agents
      for (let i = 0; i < agentCount; i++) {
        const start = Date.now();
        this.deployTestAgent(colony);
        responseTimes.push(Date.now() - start);
        result.operationsCompleted++;
      }

      result.maxAgentsReached = colony.getAgentCount();

      // Run operations
      while (Date.now() - startTime < duration) {
        const start = Date.now();
        await colony.tick();
        responseTimes.push(Date.now() - start);
        result.operationsCompleted++;

        await new Promise(resolve => setTimeout(resolve, 1000 / operationRate));
      }

      result.averageResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    } catch (error) {
      result.success = false;
      result.errors.push(error as Error);
    }

    return result;
  }

  /**
   * Wait for colony to reach a specific state
   *
   * @param colony - Colony to wait for
   * @param state - Target state
   * @param timeout - Maximum wait time in ms
   * @returns Promise resolving when state is reached
   */
  static async waitForState(
    colony: PollnColony,
    state: ColonyState,
    timeout: number = 5000
  ): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkState = () => {
        if (colony.getState() === state) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(
            new Error(
              `Timeout waiting for state ${state}, current state: ${colony.getState()}`
            )
          );
        } else {
          setTimeout(checkState, 50);
        }
      };

      checkState();
    });
  }

  /**
   * Get test result for a colony
   *
   * @param colonyId - Colony ID
   * @returns Test result or undefined
   */
  static getTestResult(colonyId: string): ColonyTestResult | undefined {
    return this.testResults.get(colonyId);
  }

  /**
   * Get all test results
   *
   * @returns Map of colony ID to test result
   */
  static getAllTestResults(): Map<string, ColonyTestResult> {
    return new Map(this.testResults);
  }

  /**
   * Cleanup test colonies
   *
   * @param colonyIds - Specific colony IDs to cleanup (omitted = all)
   */
  static cleanup(colonyIds?: string[]): void {
    const idsToCleanup = colonyIds || Array.from(this.testColonies.keys());

    idsToCleanup.forEach(id => {
      const colony = this.testColonies.get(id);
      if (colony && colony.getState() === ColonyState.RUNNING) {
        colony.stop();
      }
      this.testColonies.delete(id);
      this.snapshotHistory.delete(id);
      this.testResults.delete(id);
      this.performanceMetrics.delete(id);
    });
  }

  /**
   * Reset all test state
   */
  static reset(): void {
    this.testColonies.forEach(colony => {
      if (colony.getState() === ColonyState.RUNNING) {
        colony.stop();
      }
    });

    this.testColonies.clear();
    this.snapshotHistory.clear();
    this.testResults.clear();
    this.performanceMetrics.clear();
  }
}

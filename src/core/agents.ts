/**
 * POLLN Concrete Agent Implementations
 * TaskAgent, RoleAgent, CoreAgent
 *
 * Based on FINAL_INTEGRATION.md: Tile Lifespans
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import type { AgentConfig, AgentState } from './types.js';
import { A2APackage, PrivacyLevel, SubsumptionLayer } from './types.js';

// ============================================================================
// TILE CATEGORIES (from FINAL_INTEGRATION.md)
// ============================================================================

/**
 * TileCategory defines agent lifespan and succession behavior
 *
 * - EPHEMERAL: Task-bound (minutes to hours), no succession
 * - ROLE: Performance-bound (days to weeks), knowledge handoff
 * - CORE: Age-bound (months to years), backup and recovery
 */
export enum TileCategory {
  EPHEMERAL = 'EPHEMERAL',  // Like blood cells - born, task, die
  ROLE = 'ROLE',          // Like skin cells - medium lifespan, succession
  CORE = 'CORE',          // Like bone cells - long-lived, rarely replaced
}

// ============================================================================
// TASK AGENT (Ephemeral)
// ============================================================================

/**
 * TaskAgent - Ephemeral agent for specific tasks
 *
 * Lifecycle: Born for task → Execute → Die
 * No knowledge succession (composted)
 * High mutation rate, low fidelity
 */
export class TaskAgent extends EventEmitter {
  public readonly id: string;
  public readonly category = TileCategory.EPHEMERAL;
  public readonly config: AgentConfig;
  protected state: Map<string, unknown> = new Map();
  protected valueFunction: number = 0.5;
  protected successCount: number = 0;
  protected failureCount: number = 0;

  private taskComplete: boolean = false;
  private maxLifetimeMs: number;

  constructor(config: AgentConfig, maxLifetimeMs: number = 3600000) { // Default 1 hour
    super();
    this.id = config.id;
    this.config = config;
    this.maxLifetimeMs = maxLifetimeMs;
  }

  /**
   * Initialize the task agent
   */
  initialize(): Promise<void> {
    this.setState('initializedAt', Date.now());
    this.setState('category', TileCategory.EPHEMERAL);
    return Promise.resolve();
  }

  /**
   * Process input for the task
   */
  process<T>(input: T): Promise<A2APackage<T>> {
    const startTime = Date.now();

    // Task-specific processing logic would be implemented by subclasses
    const result = this.executeTask(input);

    const executionTime = Date.now() - startTime;

    // Update value function based on success
    this.updateValueFunction(result.success ? 1 : -1);

    // Mark as complete if successful
    if (result.success) {
      this.taskComplete = true;
    }

    // Create A2A package
    const pkg: A2APackage<{ success: boolean; output: unknown }> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'task_result',
      payload: result,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: PrivacyLevel.COLONY,
      layer: SubsumptionLayer.HABITUAL,
    };

    return Promise.resolve(pkg as A2APackage<T>);
  }

  /**
   * Execute the specific task - override in subclasses
   */
  protected executeTask<T>(input: T): { success: boolean; output: unknown } {
    // Default implementation - override in subclasses
    return { success: true, output: input };
  }

  /**
   * Shutdown the task agent
   */
  shutdown(): Promise<void> {
    this.taskComplete = true;
    this.setState('shutdownAt', Date.now());
    return Promise.resolve();
  }

  /**
   * Check if agent should be terminated
   */
  shouldTerminate(): boolean {
    const initializedAt = this.getState<number>('initializedAt') || Date.now();
    const age = Date.now() - initializedAt;

    // Terminate if task complete or max lifetime exceeded
    return this.taskComplete || age > this.maxLifetimeMs;
  }

  /**
   * TaskAgents do not transfer knowledge - they compost
   */
  extractKnowledge(): null {
    return null; // No succession for ephemeral agents
  }

  // State management (from BaseAgent)
  getState<K>(key: string): K | undefined {
    return this.state.get(key) as K;
  }

  setState<K>(key: string, value: K): void {
    this.state.set(key, value);
  }

  updateValueFunction(reward: number): void {
    this.valueFunction = Math.max(0, Math.min(1,
      this.valueFunction + 0.1 * (reward - 0.5)
    ));
    this.successCount += reward > 0 ? 1 : 0;
    this.failureCount += reward < 0 ? 1 : 0;
  }
}

// ============================================================================
// ROLE AGENT (With Succession)
// ============================================================================

/**
 * RoleAgent - Medium lifespan with knowledge transfer
 *
 * Lifecycle: Learn role → Execute → Hand off to successor → Die
 * Knowledge transfer on death
 * Medium mutation rate, medium fidelity
 */
export class RoleAgent extends EventEmitter {
  public readonly id: string;
  public readonly category = TileCategory.ROLE;
  public readonly config: AgentConfig;
  protected state: Map<string, unknown> = new Map();
  protected valueFunction: number = 0.5;
  protected successCount: number = 0;
  protected failureCount: number = 0;

  private successor: RoleAgent | null = null;
  private knowledgeAccumulated: Map<string, unknown> = new Map();
  private performanceWindow: number[] = []; // Rolling success/failure

  constructor(config: AgentConfig) {
    super();
    this.id = config.id;
    this.config = config;
  }

  /**
   * Initialize the role agent
   */
  initialize(): Promise<void> {
    this.setState('initializedAt', Date.now());
    this.setState('category', TileCategory.ROLE);
    return Promise.resolve();
  }

  /**
   * Process input with knowledge accumulation
   */
  process<T>(input: T): Promise<A2APackage<T>> {
    const startTime = Date.now();

    // Role-specific processing
    const result = this.executeRole(input);

    // Track performance
    this.performanceWindow.push(result.success ? 1 : 0);
    if (this.performanceWindow.length > 100) {
      this.performanceWindow.shift();
    }

    // Accumulate knowledge from successful executions
    if (result.success) {
      this.accumulateKnowledge(input, result.output);
    }

    // Update value function
    this.updateValueFunction(result.success ? 1 : 0);

    const pkg: A2APackage<{ success: boolean; output: unknown }> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'role_result',
      payload: result,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: PrivacyLevel.COLONY,
      layer: SubsumptionLayer.HABITUAL,
    };

    return Promise.resolve(pkg as A2APackage<T>);
  }

  /**
   * Execute role-specific logic - override in subclasses
   */
  protected executeRole<T>(input: T): { success: boolean; output: unknown } {
    return { success: true, output: input };
  }

  /**
   * Accumulate knowledge from successful executions
   */
  private accumulateKnowledge(input: unknown, output: unknown): void {
    // Store patterns that led to success
    const patternKey = JSON.stringify({ input: this.simplify(input) });
    const existing = this.knowledgeAccumulated.get(patternKey);

    if (existing) {
      // Reinforce existing pattern
      (existing as { count: number; bestOutput: unknown }).count++;
    } else {
      // Store new pattern
      this.knowledgeAccumulated.set(patternKey, {
        count: 1,
        bestOutput: output,
        inputPattern: this.simplify(input),
      });
    }
  }

  /**
   * Simplify input for pattern matching
   */
  private simplify(input: unknown): unknown {
    if (typeof input === 'object' && input !== null) {
      // Keep only structure, not values
      return Object.keys(input as Record<string, unknown>);
    }
    return typeof input;
  }

  /**
   * Shutdown with knowledge transfer
   */
  shutdown(): Promise<void> {
    if (this.successor) {
      this.transferKnowledge(this.successor);
    }
    this.setState('shutdownAt', Date.now());
    return Promise.resolve();
  }

  /**
   * Set successor for knowledge transfer
   */
  setSuccessor(successor: RoleAgent): void {
    this.successor = successor;
  }

  /**
   * Transfer knowledge to successor
   */
  private transferKnowledge(successor: RoleAgent): void {
    // Transfer accumulated patterns
    for (const [key, value] of this.knowledgeAccumulated) {
      successor.receiveKnowledge(key, value);
    }

    // Transfer performance history
    successor.receivePerformanceHistory(this.performanceWindow);

    // Transfer value function (karmic record)
    successor.receiveValueFunction(this.valueFunction);
  }

  /**
   * Receive knowledge from predecessor
   */
  receiveKnowledge(key: string, value: unknown): void {
    this.knowledgeAccumulated.set(key, value);
  }

  /**
   * Receive performance history from predecessor
   */
  receivePerformanceHistory(history: number[]): void {
    this.performanceWindow = [...history];
  }

  /**
   * Receive value function from predecessor
   */
  receiveValueFunction(value: number): void {
    this.valueFunction = value;
  }

  /**
   * Extract knowledge for external use
   */
  extractKnowledge(): Map<string, unknown> {
    return new Map(this.knowledgeAccumulated);
  }

  /**
   * Check if agent should be terminated
   */
  shouldTerminate(): boolean {
    // Calculate success rate over window
    if (this.performanceWindow.length < 20) return false;

    const successRate = this.performanceWindow.reduce((a, b) => a + b, 0) / this.performanceWindow.length;

    // Terminate if performance degrades below threshold
    return successRate < 0.3;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    successRate: number;
    totalExecutions: number;
    knowledgePatterns: number;
  } {
    const successRate = this.performanceWindow.length > 0
      ? this.performanceWindow.reduce((a, b) => a + b, 0) / this.performanceWindow.length
      : 0;

    return {
      successRate,
      totalExecutions: this.performanceWindow.length,
      knowledgePatterns: this.knowledgeAccumulated.size,
    };
  }

  // State management
  getState<K>(key: string): K | undefined {
    return this.state.get(key) as K;
  }

  setState<K>(key: string, value: K): void {
    this.state.set(key, value);
  }

  updateValueFunction(reward: number): void {
    this.valueFunction = Math.max(0, Math.min(1,
      this.valueFunction + 0.1 * (reward - 0.5)
    ));
    this.successCount += reward > 0 ? 1 : 0;
    this.failureCount += reward < 0 ? 1 : 0;
  }
}

// ============================================================================
// CORE AGENT (Long-lived with Backup)
// ============================================================================

/**
 * CoreAgent - Long-lived agent with backup and recovery
 *
 * Lifecycle: Slow wisdom accumulation, rarely replaced
 * Backup and recovery mechanisms
 * Low mutation rate, high fidelity
 */
export class CoreAgent extends EventEmitter {
  public readonly id: string;
  public readonly category = TileCategory.CORE;
  public readonly config: AgentConfig;
  protected state: Map<string, unknown> = new Map();
  protected valueFunction: number = 0.5;
  protected successCount: number = 0;
  protected failureCount: number = 0;

  private backup: Map<string, unknown> = new Map();
  private lastBackupTime: number = 0;
  private backupIntervalMs: number = 3600000; // 1 hour default

  constructor(config: AgentConfig) {
    super();
    this.id = config.id;
    this.config = config;
  }

  /**
   * Initialize the core agent
   */
  initialize(): Promise<void> {
    this.setState('initializedAt', Date.now());
    this.setState('category', TileCategory.CORE);

    // Attempt recovery from backup
    this.attemptRecovery();
    return Promise.resolve();
  }

  /**
   * Process input with backup
   */
  process<T>(input: T): Promise<A2APackage<T>> {
    const startTime = Date.now();

    // Core-specific processing
    const result = this.executeCore(input);

    // Update value function
    this.updateValueFunction(result.success ? 1 : -1);

    // Create periodic backup
    if (Date.now() - this.lastBackupTime > this.backupIntervalMs) {
    this.createBackup();
  }

    const pkg: A2APackage<{ success: boolean; output: unknown }> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'core_result',
      payload: result,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: PrivacyLevel.PRIVATE,
      layer: SubsumptionLayer.DELIBERATE,
    };

    return Promise.resolve(pkg as A2APackage<T>);
  }

  /**
   * Execute core-specific logic - override in subclasses
   */
  protected executeCore<T>(input: T): { success: boolean; output: unknown } {
    return { success: true, output: input };
  }

  /**
   * Create backup of current state
   */
  createBackup(): void {
    this.backup = new Map(this.state);
    this.backup.set('valueFunction', this.valueFunction);
    this.backup.set('successCount', this.successCount);
    this.backup.set('failureCount', this.failureCount);
    this.lastBackupTime = Date.now();

    this.setState('lastBackupTime', this.lastBackupTime);
  }

  /**
   * Attempt recovery from backup
   */
  private attemptRecovery(): boolean {
    if (this.backup.size === 0) {
      return false;
    }

    // Restore state from backup
    for (const [key, value] of this.backup) {
      if (key === 'valueFunction') {
        this.valueFunction = value as number;
      } else if (key === 'successCount') {
        this.successCount = value as number;
      } else if (key === 'failureCount') {
        this.failureCount = value as number;
      } else {
        this.state.set(key, value);
      }
    }

    return true;
  }

  /**
   * Shutdown with backup preservation
   */
  shutdown(): Promise<void> {
    // Create final backup before shutdown
    this.createBackup();
    this.setState('shutdownAt', Date.now());
    return Promise.resolve();
  }

  /**
   * Core agents rarely terminate
   */
  shouldTerminate(): boolean {
    // Core agents only terminate on critical failure
    const failureRate = this.failureCount / (this.successCount + this.failureCount + 1);
    return failureRate > 0.8; // 80% failure rate
  }

  /**
   * Extract knowledge for backup/recovery
   */
  extractKnowledge(): { state: Map<string, unknown>; valueFunction: number } {
    return {
      state: new Map(this.state),
      valueFunction: this.valueFunction,
    };
  }

  /**
   * Get backup status
   */
  getBackupStatus(): {
    hasBackup: boolean;
    lastBackupTime: number;
    backupSize: number;
  } {
    return {
      hasBackup: this.backup.size > 0,
      lastBackupTime: this.lastBackupTime,
      backupSize: this.backup.size,
    };
  }

  // State management
  getState<K>(key: string): K | undefined {
    return this.state.get(key) as K;
  }

  setState<K>(key: string, value: K): void {
    this.state.set(key, value);
  }

  updateValueFunction(reward: number): void {
    this.valueFunction = Math.max(0, Math.min(1,
      this.valueFunction + 0.1 * (reward - 0.5)
    ));
    this.successCount += reward > 0 ? 1 : 0;
    this.failureCount += reward < 0 ? 1 : 0;
  }
}

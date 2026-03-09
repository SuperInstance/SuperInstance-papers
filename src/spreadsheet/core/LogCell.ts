/**
 * POLLN Spreadsheet Integration - LogCell Base Class
 * Ledger-Organizing Graph (LOG) System
 *
 * The foundational base class for all LOG cells.
 * Every cell in the LOG system inherits from LogCell.
 *
 * A LogCell has:
 * - HEAD (input/reception)
 * - BODY (processing/reasoning)
 * - TAIL (output/action)
 * - ORIGIN (self-reference point)
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  CellId,
  CellType,
  CellPosition,
  CellState,
  LogicLevel,
  CellHead,
  CellBody,
  CellTail,
  CellOrigin,
  CellOutput,
  Feedback,
  CellInspection,
  ReasoningTrace,
  ExecutionHistory,
  ProcessingContext,
  ProcessingResult,
} from './types.js';

/**
 * Configuration interface for creating a LogCell
 */
export interface LogCellConfig {
  id?: CellId;
  type: CellType;
  position: CellPosition;
  logicLevel?: LogicLevel;
  memoryLimit?: number;
}

/**
 * LogCell - The base class for all LOG cells
 *
 * This abstract class provides the foundational structure and lifecycle
 * management for all cell types in the LOG system.
 *
 * @abstract
 */
export abstract class LogCell {
  // ========================================================================
  // Public Properties (Identity)
  // ========================================================================

  public readonly id: CellId;
  public readonly type: CellType;
  public readonly position: CellPosition;
  public readonly createdAt: number;

  // ========================================================================
  // State Management
  // ========================================================================

  protected state: CellState;
  protected logicLevel: LogicLevel;
  protected lastError?: Error;
  protected stateHistory: Array<{ state: CellState; timestamp: number }> = [];

  // ========================================================================
  // Cell Anatomy (Head, Body, Tail, Origin)
  // ========================================================================

  protected head: CellHead;
  protected body: CellBody;
  protected tail: CellTail;
  protected origin: CellOrigin;

  // ========================================================================
  // Performance Metrics
  // ========================================================================

  protected performanceMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalDuration: 0,
    lastExecution: 0,
  };

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor(config: LogCellConfig) {
    // Identity
    this.id = config.id || uuidv4();
    this.type = config.type;
    this.position = config.position;
    this.createdAt = Date.now();

    // State
    this.state = 'dormant' as CellState;
    this.logicLevel = config.logicLevel ?? 0;

    // Initialize anatomy
    this.head = this.initializeHead();
    this.body = this.initializeBody(config.memoryLimit ?? 100);
    this.tail = this.initializeTail();
    this.origin = this.initializeOrigin();
  }

  // ========================================================================
  // Lifecycle Methods (Abstract - must be implemented by subclasses)
  // ========================================================================

  /**
   * Activate the cell - transition from DORMANT to SENSING
   */
  abstract activate(): Promise<void>;

  /**
   * Process input and produce output
   */
  abstract process(input: any): Promise<CellOutput>;

  /**
   * Learn from feedback
   */
  abstract learn(feedback: Feedback): Promise<void>;

  /**
   * Deactivate the cell - return to DORMANT
   */
  abstract deactivate(): Promise<void>;

  // ========================================================================
  // Anatomy Initialization (Protected - can be overridden by subclasses)
  // ========================================================================

  /**
   * Initialize the cell's head (input/reception)
   */
  protected initializeHead(): CellHead {
    return {
      inputs: [],
      sensations: [],
      recognizers: [],
      validators: [],
    };
  }

  /**
   * Initialize the cell's body (processing/reasoning)
   */
  protected initializeBody(memoryLimit: number): CellBody {
    return {
      logic: this.createProcessingLogic(),
      memory: this.createMemory(memoryLimit),
      trace: this.createTrace(),
      selfModel: this.createSelfModel(),
    };
  }

  /**
   * Initialize the cell's tail (output/action)
   */
  protected initializeTail(): CellTail {
    return {
      outputs: [],
      effects: [],
      actions: [],
      subscribers: [],
    };
  }

  /**
   * Initialize the cell's origin (self-reference)
   */
  protected initializeOrigin(): CellOrigin {
    return {
      id: this.id,
      position: this.position,
      selfAwareness: 0,
      watchedCells: [],
    };
  }

  // ========================================================================
  // Factory Methods (Abstract - must be implemented by subclasses)
  // ========================================================================

  /**
   * Create the processing logic for this cell
   */
  protected abstract createProcessingLogic(): any;

  /**
   * Create memory for storing execution history
   */
  protected createMemory(limit: number): any {
    return {
      limit,
      records: [],
      record(input: any, output: any, trace: any, confidence: number, duration: number = 0) {
        const record = {
          id: uuidv4(),
          input,
          output,
          trace,
          confidence,
          timestamp: Date.now(),
          duration,
        };
        this.records.push(record);
        if (this.records.length > this.limit) {
          this.records.shift();
        }
      },
      getRecent(count: number) {
        return this.records.slice(-count);
      },
      getByInput(input: any) {
        return this.records.filter(r => r.input === input);
      },
      clear() {
        this.records = [];
      },
    };
  }

  /**
   * Create a reasoning trace
   */
  protected createTrace(): ReasoningTrace {
    return {
      steps: [],
      dependencies: [],
      confidence: 0,
      totalTime: 0,
      startTime: 0,
      endTime: 0,
    };
  }

  /**
   * Create the cell's self-model
   */
  protected createSelfModel(): any {
    return {
      identity: this.type,
      capabilities: [],
      performance: {
        totalExecutions: 0,
        successfulExecutions: 0,
        averageConfidence: 0,
        averageDuration: 0,
      },
      patterns: [],
      lastUpdated: Date.now(),
    };
  }

  // ========================================================================
  // State Management
  // ========================================================================

  /**
   * Get the current state of the cell
   */
  public getState(): CellState {
    return this.state;
  }

  /**
   * Check if the cell is in a specific state
   */
  public isState(state: CellState): boolean {
    return this.state === state;
  }

  /**
   * Get the state history
   */
  public getStateHistory(): Array<{ state: CellState; timestamp: number }> {
    return [...this.stateHistory];
  }

  /**
   * Transition to a new state
   */
  protected transitionTo(newState: CellState): void {
    const oldState = this.state;
    this.state = newState;
    this.stateHistory.push({
      state: newState,
      timestamp: Date.now(),
    });
  }

  // ========================================================================
  // Processing Pipeline (Template Method)
  // ========================================================================

  /**
   * Template method for processing - orchestrates the full pipeline
   */
  protected async executeProcessingPipeline(input: any): Promise<CellOutput> {
    const startTime = Date.now();
    this.transitionTo('processing' as CellState);

    try {
      // 1. Prepare context
      const context = this.createProcessingContext(input);

      // 2. Execute processing logic
      const result = await this.executeProcessing(input, context);

      // 3. Update trace
      this.body.trace = result.trace;
      this.body.trace.totalTime = Date.now() - startTime;

      // 4. Store in memory
      const duration = Date.now() - startTime;
      this.body.memory.record(
        input,
        result.value,
        result.trace,
        result.confidence,
        duration
      );

      // 5. Update performance metrics
      this.updatePerformanceMetrics(true, Date.now() - startTime);

      // 6. Transition to emitting
      this.transitionTo('emitting' as CellState);

      // 7. Create output
      const output: CellOutput = {
        value: result.value,
        confidence: result.confidence,
        explanation: result.explanation,
        trace: result.trace,
        effects: this.tail.effects,
      };

      return output;
    } catch (error) {
      this.handleError(error as Error);
      this.updatePerformanceMetrics(false, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Create processing context
   */
  protected createProcessingContext(input: any): ProcessingContext {
    return {
      cellId: this.id,
      position: this.position,
      sensations: this.head.sensations,
      memory: this.body.memory.getRecent(10),
      timestamp: Date.now(),
      input,
    };
  }

  /**
   * Execute the actual processing logic
   */
  protected abstract executeProcessing(
    input: any,
    context: ProcessingContext
  ): Promise<ProcessingResult>;

  // ========================================================================
  // Inspection Methods
  // ========================================================================

  /**
   * Get comprehensive inspection of the cell
   */
  public inspect(): CellInspection {
    return {
      cellId: this.id,
      type: this.type,
      state: this.state,
      position: this.position,
      inputs: this.head.inputs.map((i: any) => i),
      sensations: [...this.head.sensations],
      reasoning: this.body.trace.steps,
      memory: this.body.memory.getRecent(10),
      outputs: this.tail.outputs.map((o: any) => o),
      effects: [...this.tail.effects],
      selfModel: this.body.selfModel,
    };
  }

  /**
   * Get the current reasoning trace
   */
  public getTrace(): ReasoningTrace {
    return { ...this.body.trace };
  }

  /**
   * Get execution history
   */
  public getHistory(): ExecutionHistory {
    const records = this.body.memory.getRecent(100);
    const successful = records.filter((r: any) => r.confidence > 0.5).length;

    return {
      totalExecutions: this.performanceMetrics.totalExecutions,
      recentExecutions: records,
      successRate: this.performanceMetrics.totalExecutions > 0
        ? successful / this.performanceMetrics.totalExecutions
        : 0,
      averageConfidence: records.length > 0
        ? records.reduce((sum: number, r: any) => sum + r.confidence, 0) / records.length
        : 0,
      averageDuration: this.performanceMetrics.totalExecutions > 0
        ? this.performanceMetrics.totalDuration / this.performanceMetrics.totalExecutions
        : 0,
    };
  }

  // ========================================================================
  // Error Handling
  // ========================================================================

  /**
   * Handle errors during processing
   */
  protected handleError(error: Error): void {
    this.lastError = error;
    this.transitionTo('error' as CellState);
    this.performanceMetrics.failedExecutions++;
  }

  /**
   * Get the last error
   */
  public getLastError(): Error | undefined {
    return this.lastError;
  }

  /**
   * Clear the last error and reset state
   */
  public clearError(): void {
    this.lastError = undefined;
    if (this.state === 'error' as CellState) {
      this.transitionTo('dormant' as CellState);
    }
  }

  // ========================================================================
  // Performance Metrics
  // ========================================================================

  /**
   * Update performance metrics after execution
   */
  protected updatePerformanceMetrics(success: boolean, duration: number): void {
    this.performanceMetrics.totalExecutions++;
    if (success) {
      this.performanceMetrics.successfulExecutions++;
    }
    this.performanceMetrics.totalDuration += duration;
    this.performanceMetrics.lastExecution = Date.now();
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get a string representation of the cell
   */
  public toString(): string {
    return `LogCell[id=${this.id}, type=${this.type}, state=${this.state}, position=(${this.position.row}, ${this.position.col})]`;
  }

  /**
   * Get a JSON representation of the cell
   */
  public toJSON(): any {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      position: this.position,
      logicLevel: this.logicLevel,
      createdAt: this.createdAt,
      performance: this.performanceMetrics,
    };
  }
}

/**
 * CellBody - Processing and reasoning core of a LOG cell
 *
 * The body is the cell's "brain" responsible for:
 * - Processing inputs using configurable logic
 * - Maintaining execution memory
 * - Generating inspectable reasoning traces
 * - Maintaining a self-model for introspection
 *
 * As specified in CELL_ONTOLOGY.md
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CellId,
  CellPosition,
  LogicLevel,
  ProcessingLogic,
  ProcessingContext,
  ProcessingResult,
  ExecutionRecord,
  ExecutionMemory,
  ReasoningTrace,
  ReasoningStep,
  ReasoningStepType,
  Dependency,
  CellSelfModel,
  LearnedPattern,
  Sensation,
  CellBody as CellBodyInterface,
} from './types.js';

/**
 * Default processing logic implementation
 * Provides a baseline L0 logic that can be extended
 */
class DefaultProcessingLogic implements ProcessingLogic {
  level = LogicLevel.L0_LOGIC;

  async process(input: any, context: ProcessingContext): Promise<ProcessingResult> {
    const startTime = Date.now();
    const stepId = uuidv4();

    // Simple identity transform for default logic
    const result = {
      value: input,
      confidence: 1.0,
      trace: {
        steps: [
          {
            id: stepId,
            type: ReasoningStepType.OBSERVATION,
            description: 'Direct observation of input',
            input,
            output: input,
            confidence: 1.0,
            duration: Date.now() - startTime,
            timestamp: startTime,
            dependencies: [],
          },
        ],
        dependencies: [],
        confidence: 1.0,
        totalTime: Date.now() - startTime,
        startTime,
        endTime: Date.now(),
      },
      explanation: 'Input passed through unchanged',
    };

    return result;
  }

  estimateCost(input: any): number {
    return 1; // Minimal cost for L0 logic
  }
}

/**
 * Execution memory implementation
 * Stores and retrieves past cell executions
 */
export class ExecutionMemoryImpl implements ExecutionMemory {
  private records: Map<string, ExecutionRecord> = new Map();
  private maxRecords: number;
  private maxAge: number; // milliseconds

  constructor(maxRecords: number = 1000, maxAge: number = 24 * 60 * 60 * 1000) {
    this.maxRecords = maxRecords;
    this.maxAge = maxAge;
  }

  /**
   * Store an execution record
   */
  store(record: ExecutionRecord): void {
    // Clean old records before storing
    this.cleanup();

    // Enforce max records limit (FIFO)
    if (this.records.size >= this.maxRecords) {
      const oldestKey = this.getOldestRecord();
      if (oldestKey) {
        this.records.delete(oldestKey);
      }
    }

    this.records.set(record.id, record);
  }

  /**
   * Retrieve a specific execution record
   */
  retrieve(id: string): ExecutionRecord | undefined {
    return this.records.get(id);
  }

  /**
   * Get recent execution records
   */
  getRecent(count: number = 10): ExecutionRecord[] {
    const records = Array.from(this.records.values());
    return records
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * Get all records
   */
  getAll(): ExecutionRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRecords: number;
    averageConfidence: number;
    averageDuration: number;
    successRate: number;
  } {
    const records = this.getAll();
    if (records.length === 0) {
      return {
        totalRecords: 0,
        averageConfidence: 0,
        averageDuration: 0,
        successRate: 0,
      };
    }

    const totalConfidence = records.reduce((sum, r) => sum + r.confidence, 0);
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const successful = records.filter((r) => r.confidence > 0.5).length;

    return {
      totalRecords: records.length,
      averageConfidence: totalConfidence / records.length,
      averageDuration: totalDuration / records.length,
      successRate: successful / records.length,
    };
  }

  /**
   * Clean up old records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, record] of this.records.entries()) {
      if (now - record.timestamp > this.maxAge) {
        this.records.delete(id);
      }
    }
  }

  /**
   * Get the oldest record key
   */
  private getOldestRecord(): string | undefined {
    let oldest: string | undefined;
    let oldestTime = Infinity;

    for (const [id, record] of this.records.entries()) {
      if (record.timestamp < oldestTime) {
        oldestTime = record.timestamp;
        oldest = id;
      }
    }

    return oldest;
  }
}

/**
 * Cell body implementation
 * The core processing unit of a LOG cell
 */
export class CellBody implements CellBodyInterface {
  public readonly id: CellId;
  public logic: ProcessingLogic;
  public memory: ExecutionMemoryImpl;
  public trace: ReasoningTrace;
  public selfModel: CellSelfModel;

  private currentTrace: ReasoningTrace | null = null;

  constructor(
    id: CellId,
    logic?: ProcessingLogic,
    memory?: ExecutionMemoryImpl,
    initialSelfModel?: Partial<CellSelfModel>
  ) {
    this.id = id;
    this.logic = logic || new DefaultProcessingLogic();
    this.memory = memory || new ExecutionMemoryImpl();
    this.trace = this.createEmptyTrace();

    // Initialize self-model
    this.selfModel = {
      identity: initialSelfModel?.identity || `cell-${id}`,
      capabilities: initialSelfModel?.capabilities || ['process', 'learn'],
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

  /**
   * Process input with full reasoning trace
   */
  async process(input: any, context: ProcessingContext): Promise<ProcessingResult> {
    const startTime = Date.now();

    // Create initial observation step
    const observationStep: ReasoningStep = {
      id: uuidv4(),
      type: ReasoningStepType.OBSERVATION,
      description: 'Receive and observe input',
      input,
      output: input,
      confidence: 1.0,
      duration: 0,
      timestamp: startTime,
      dependencies: [],
    };

    // Initialize current trace
    this.currentTrace = {
      steps: [observationStep],
      dependencies: [],
      confidence: 1.0,
      totalTime: 0,
      startTime,
      endTime: startTime,
    };

    try {
      // Execute processing logic
      const result = await this.logic.process(input, {
        ...context,
        memory: this.memory.getRecent(100),
      });

      // Add result steps to trace
      for (const step of result.trace.steps) {
        this.addReasoningStep(step);
      }

      // Calculate final confidence and timing
      this.currentTrace.endTime = Date.now();
      this.currentTrace.totalTime = this.currentTrace.endTime - startTime;
      this.currentTrace.confidence = result.confidence;

      // Store execution in memory
      const executionRecord: ExecutionRecord = {
        id: uuidv4(),
        input,
        output: result.value,
        trace: this.currentTrace,
        confidence: result.confidence,
        timestamp: startTime,
        duration: this.currentTrace.totalTime,
      };
      this.memory.store(executionRecord);

      // Update self-model
      this.updateSelfModel(executionRecord);

      // Update public trace
      this.trace = this.currentTrace;

      return result;
    } catch (error) {
      // Add error step to trace
      const errorStep: ReasoningStep = {
        id: uuidv4(),
        type: ReasoningStepType.VALIDATION,
        description: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        input,
        output: null,
        confidence: 0,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        dependencies: [observationStep.id],
      };
      this.addReasoningStep(errorStep);

      throw error;
    }
  }

  /**
   * Add a reasoning step to the current trace
   */
  addReasoningStep(step: ReasoningStep): void {
    if (!this.currentTrace) {
      throw new Error('Cannot add step: no active trace. Call process() first.');
    }
    this.currentTrace.steps.push(step);

    // Update dependencies
    for (const depId of step.dependencies) {
      this.currentTrace.dependencies.push({
        from: depId,
        to: step.id,
        type: 'control',
      });
    }
  }

  /**
   * Get the current reasoning trace
   */
  getTrace(): ReasoningTrace {
    return this.trace;
  }

  /**
   * Get execution history
   */
  getHistory(limit?: number): ExecutionRecord[] {
    return this.memory.getRecent(limit || 100);
  }

  /**
   * Update the cell's self-model based on execution
   */
  private updateSelfModel(execution: ExecutionRecord): void {
    const perf = this.selfModel.performance;

    perf.totalExecutions++;
    if (execution.confidence > 0.5) {
      perf.successfulExecutions++;
    }

    // Update averages
    const n = perf.totalExecutions;
    perf.averageConfidence =
      (perf.averageConfidence * (n - 1) + execution.confidence) / n;
    perf.averageDuration =
      (perf.averageDuration * (n - 1) + execution.duration) / n;

    // Extract and update patterns
    this.extractPatterns(execution);

    // Update timestamp
    this.selfModel.lastUpdated = Date.now();
  }

  /**
   * Extract patterns from execution
   */
  private extractPatterns(execution: ExecutionRecord): void {
    // Simple pattern extraction based on input/output similarity
    const patterns = this.selfModel.patterns;
    const inputSig = this.getSignature(execution.input);
    const outputSig = this.getSignature(execution.output);

    // Check if this pattern already exists
    const existingPattern = patterns.find((p) => p.pattern.input === inputSig);
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.confidence = Math.min(1, existingPattern.confidence + 0.1);
      existingPattern.lastSeen = execution.timestamp;
    } else {
      // Create new pattern
      patterns.push({
        id: uuidv4(),
        pattern: { input: inputSig, output: outputSig },
        frequency: 1,
        confidence: 0.1,
        lastSeen: execution.timestamp,
      });
    }

    // Keep only recent patterns
    const maxPatterns = 100;
    if (patterns.length > maxPatterns) {
      patterns.sort((a, b) => b.frequency - a.frequency);
      patterns.splice(maxPatterns);
    }
  }

  /**
   * Get a simple signature of a value for pattern matching
   */
  private getSignature(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    const type = typeof value;
    if (type === 'object') {
      return Array.isArray(value) ? 'array' : 'object';
    }
    return type;
  }

  /**
   * Create an empty reasoning trace
   */
  private createEmptyTrace(): ReasoningTrace {
    return {
      steps: [],
      dependencies: [],
      confidence: 0,
      totalTime: 0,
      startTime: Date.now(),
      endTime: Date.now(),
    };
  }

  /**
   * Set the processing logic
   */
  setLogic(logic: ProcessingLogic): void {
    this.logic = logic;
  }

  /**
   * Estimate processing cost
   */
  estimateCost(input: any): number {
    return this.logic.estimateCost(input);
  }

  /**
   * Get the cell's self-model
   */
  getSelfModel(): CellSelfModel {
    return { ...this.selfModel };
  }

  /**
   * Reset the cell's memory
   */
  resetMemory(): void {
    this.memory.clear();
    this.selfModel.performance = {
      totalExecutions: 0,
      successfulExecutions: 0,
      averageConfidence: 0,
      averageDuration: 0,
    };
    this.selfModel.patterns = [];
    this.selfModel.lastUpdated = Date.now();
  }
}

/**
 * Export the ExecutionMemory interface
 */
export interface ExecutionMemory {
  store(record: ExecutionRecord): void;
  retrieve(id: string): ExecutionRecord | undefined;
  getRecent(count: number): ExecutionRecord[];
  getAll(): ExecutionRecord[];
  clear(): void;
  getStats(): {
    totalRecords: number;
    averageConfidence: number;
    averageDuration: number;
    successRate: number;
  };
}

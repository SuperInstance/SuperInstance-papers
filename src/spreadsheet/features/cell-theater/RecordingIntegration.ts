/**
 * Cell Theater - Recording Integration
 *
 * Mixin and helper functions to integrate consciousness recording
 * into existing cell implementations.
 *
 * Usage:
 * ```ts
 * import { withRecording, recordCellActivity } from './RecordingIntegration';
 *
 * // Apply recording to a cell
 * const RecordedCell = withRecording(MyCell);
 *
 * // Or manually record activity
 * class MyCell extends LogCell {
 *   private recorder?: ConsciousnessRecorder;
 *   private sessionId?: string;
 *
 *   async process(input: unknown) {
 *     if (this.recorder) {
 *       this.sessionId = this.recorder.startRecording(this.id);
 *     }
 *
 *     // ... processing logic ...
 *
 *     recordCellActivity(this.recorder, this.sessionId, this);
 *
 *     if (this.recorder && this.sessionId) {
 *       this.recorder.stopRecording(this.sessionId);
 *     }
 *   }
 * }
 * ```
 */

import { ConsciousnessRecorder } from './ConsciousnessRecorder.js';
import { LogCell } from '../../core/LogCell.js';
import {
  CellState,
  SensationType,
  ReasoningStepType,
} from '../../core/types.js';

/**
 * Record a cell's complete activity cycle
 *
 * This function automatically records all aspects of a cell's processing:
 * - Sensations received
 * - State changes
 * - Reasoning steps
 * - Confidence updates
 * - Outputs produced
 *
 * @param recorder - The consciousness recorder instance
 * @param sessionId - The recording session ID
 * @param cell - The cell to record
 */
export function recordCellActivity(
  recorder: ConsciousnessRecorder | undefined,
  sessionId: string | undefined,
  cell: LogCell
): void {
  if (!recorder || !sessionId) return;

  // Record current state
  const currentState = cell.getState();
  const currentConfidence = cell.getConfidence();

  // Record sensations
  const sensations = cell.getSensations();
  sensations.forEach((sensation) => {
    recorder.recordSensation(
      sessionId,
      sensation.source,
      sensation.type,
      sensation.value,
      currentState,
      currentConfidence
    );
  });

  // Record reasoning steps if available
  const trace = cell.getReasoningTrace();
  if (trace) {
    trace.steps.forEach((step) => {
      recorder.recordReasoning(
        sessionId,
        step.type,
        step.description,
        step.input,
        step.output,
        step.confidence,
        step.dependencies
      );
    });
  }
}

/**
 * Higher-order function to add recording capability to a cell class
 *
 * @returns A mixin class with recording functionality
 */
export function withRecording<T extends typeof LogCell>(Base: T) {
  return class RecordedClass extends Base {
    private recorder?: ConsciousnessRecorder;
    private sessionId?: string;
    private previousConfidence?: number;

    /**
     * Set the consciousness recorder
     */
    setRecorder(recorder: ConsciousnessRecorder): void {
      this.recorder = recorder;
    }

    /**
     * Get the current recorder
     */
    getRecorder(): ConsciousnessRecorder | undefined {
      return this.recorder;
    }

    /**
     * Start recording this cell's activity
     */
    startRecording(): string | undefined {
      if (!this.recorder) return undefined;

      this.sessionId = this.recorder.startRecording(this.getId());
      this.previousConfidence = this.getConfidence();

      return this.sessionId;
    }

    /**
     * Stop recording and save the session
     */
    stopRecording(): void {
      if (!this.recorder || !this.sessionId) return;

      this.recorder.stopRecording(this.sessionId);
      this.sessionId = undefined;
    }

    /**
     * Record a state change
     */
    protected recordStateChange(newState: CellState, oldState: CellState): void {
      if (!this.recorder || !this.sessionId) return;

      this.recorder.recordStateChange(
        this.sessionId,
        newState,
        oldState,
        this.getConfidence()
      );
    }

    /**
     * Record a confidence update
     */
    protected recordConfidence(oldConfidence: number, newConfidence: number): void {
      if (!this.recorder || !this.sessionId) return;

      this.recorder.recordConfidence(
        this.sessionId,
        oldConfidence,
        newConfidence
      );

      this.previousConfidence = newConfidence;
    }

    /**
     * Record a reasoning step
     */
    protected recordReasoning(
      stepType: ReasoningStepType,
      description: string,
      input: unknown,
      output: unknown,
      confidence: number,
      dependencies?: string[]
    ): void {
      if (!this.recorder || !this.sessionId) return;

      this.recorder.recordReasoning(
        this.sessionId,
        stepType,
        description,
        input,
        output,
        confidence,
        dependencies
      );
    }

    /**
     * Record a decision
     */
    protected recordDecision(
      decision: string,
      confidence: number,
      reasoning: string[]
    ): void {
      if (!this.recorder || !this.sessionId) return;

      this.recorder.recordDecision(
        this.sessionId,
        decision,
        confidence,
        reasoning
      );
    }

    /**
     * Record a sensation
     */
    protected recordSensation(
      source: string,
      type: SensationType,
      value: number
    ): void {
      if (!this.recorder || !this.sessionId) return;

      this.recorder.recordSensation(
        this.sessionId,
        source,
        type,
        value,
        this.getState(),
        this.getConfidence()
      );
    }

    /**
     * Record an output
     */
    protected recordOutput(target: string, value: unknown): void {
      if (!this.recorder || !this.sessionId) return;

      this.recorder.recordOutput(
        this.sessionId,
        target,
        value,
        this.getConfidence()
      );
    }

    /**
     * Override processInput to add automatic recording
     */
    protected async processInput(input: unknown): Promise<any> {
      // Start recording
      this.startRecording();

      try {
        // Call the parent implementation
        const result = await super.processInput(input);

        // Record the result
        if (result && typeof result === 'object') {
          this.recordOutput('user', result.value);
        }

        return result;
      } finally {
        // Stop recording
        this.stopRecording();
      }
    }

    /**
     * Override setState to record state changes
     */
    protected setState(state: CellState): void {
      const oldState = this.getState();
      super.setState(state);
      this.recordStateChange(state, oldState);
    }

    /**
     * Get the current recording session ID
     */
    getSessionId(): string | undefined {
      return this.sessionId;
    }

    /**
     * Check if currently recording
     */
    isRecording(): boolean {
      return this.sessionId !== undefined;
    }
  };
}

/**
 * Recording lifecycle manager for multiple cells
 *
 * Manages recording across a colony of cells,
 * handling session coordination and data collection.
 */
export class ColonyRecordingManager {
  private recorder: ConsciousnessRecorder;
  private activeSessions: Map<string, string> = new Map(); // cellId -> sessionId

  constructor() {
    this.recorder = new ConsciousnessRecorder();
  }

  /**
   * Start recording a cell
   */
  startCellRecording(cellId: string): string | undefined {
    if (this.activeSessions.has(cellId)) {
      return this.activeSessions.get(cellId);
    }

    const sessionId = this.recorder.startRecording(cellId);
    this.activeSessions.set(cellId, sessionId);
    return sessionId;
  }

  /**
   * Stop recording a cell
   */
  stopCellRecording(cellId: string): void {
    const sessionId = this.activeSessions.get(cellId);
    if (sessionId) {
      this.recorder.stopRecording(sessionId);
      this.activeSessions.delete(cellId);
    }
  }

  /**
   * Stop recording all cells
   */
  stopAllRecordings(): void {
    this.activeSessions.forEach((sessionId, cellId) => {
      this.recorder.stopRecording(sessionId);
    });
    this.activeSessions.clear();
  }

  /**
   * Get recordings for a cell
   */
  getCellRecordings(cellId: string) {
    return this.recorder.getRecordingsForCell(cellId);
  }

  /**
   * Get all recordings
   */
  getAllRecordings() {
    return this.recorder.getAllRecordings();
  }

  /**
   * Get the underlying recorder
   */
  getRecorder(): ConsciousnessRecorder {
    return this.recorder;
  }

  /**
   * Export a recording
   */
  exportRecording(recordingId: string): string | null {
    return this.recorder.exportRecording(recordingId);
  }

  /**
   * Import a recording
   */
  importRecording(json: string) {
    return this.recorder.importRecording(json);
  }

  /**
   * Delete a recording
   */
  deleteRecording(recordingId: string): boolean {
    return this.recorder.deleteRecording(recordingId);
  }

  /**
   * Clear all recordings
   */
  clearAllRecordings(): void {
    this.recorder.clearAllRecordings();
  }

  /**
   * Get active session for a cell
   */
  getActiveSession(cellId: string): string | undefined {
    return this.activeSessions.get(cellId);
  }

  /**
   * Check if a cell is being recorded
   */
  isRecording(cellId: string): boolean {
    return this.activeSessions.has(cellId);
  }

  /**
   * Get number of active recording sessions
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }
}

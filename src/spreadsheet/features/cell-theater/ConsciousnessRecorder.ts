/**
 * Cell Theater - Consciousness Recorder
 *
 * Records the consciousness stream of a cell - every sensation,
 * reasoning step, and decision with precise timestamps for replay.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  RecordingState,
  TheaterEventType,
  ConsciousnessEvent,
  ConsciousnessRecording,
  RecordingSession,
  TheaterConfig,
} from './types.js';
import { CellState, SensationType, ReasoningStepType } from '../../core/types';

/**
 * Default theater configuration
 */
const DEFAULT_CONFIG: TheaterConfig = {
  animationSpeed: 1.0,
  slowMotionFactor: 0.25,
  showFlowLines: true,
  showConfidence: true,
  showTimeline: true,
  defaultPlaybackRate: 1.0,
  autoPlay: false,
  loopOnEnd: false,
  autoRecord: false,
  maxRecordingDuration: 60000, // 1 minute
  compressRecordings: true,
  exportFormat: 'video',
  exportQuality: 'medium',
};

/**
 * ConsciousnessRecorder - Records cell activity for theater replay
 */
export class ConsciousnessRecorder {
  private config: TheaterConfig;
  private sessions: Map<string, RecordingSession> = new Map();
  private recordings: Map<string, ConsciousnessRecording> = new Map();

  constructor(config: Partial<TheaterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start recording a cell's consciousness
   */
  startRecording(cellId: string): string {
    const sessionId = uuidv4();

    const session: RecordingSession = {
      state: RecordingState.RECORDING,
      startTime: Date.now(),
      events: [],
      cellId,
    };

    this.sessions.set(sessionId, session);

    // Record initial state
    this.recordEvent(sessionId, {
      type: TheaterEventType.STATE_CHANGED,
      timestamp: 0,
      data: {
        description: 'Recording started',
        state: CellState.DORMANT,
        confidence: 0,
        visualization: {
          color: '#666',
          icon: 'record',
          intensity: 1,
        },
      },
    });

    return sessionId;
  }

  /**
   * Stop recording and save the recording
   */
  stopRecording(sessionId: string): ConsciousnessRecording | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== RecordingState.RECORDING) {
      return null;
    }

    session.state = RecordingState.STOPPED;
    const endTime = Date.now();
    const duration = endTime - (session.startTime || endTime);

    // Create recording from session
    const recording = this.createRecording(session, duration);
    this.recordings.set(recording.id, recording);

    // Clean up session
    this.sessions.delete(sessionId);

    return recording;
  }

  /**
   * Pause a recording session
   */
  pauseRecording(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.state = RecordingState.PAUSED;
    return true;
  }

  /**
   * Resume a paused recording
   */
  resumeRecording(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.state = RecordingState.RECORDING;
    return true;
  }

  /**
   * Record a sensation event (cell watching another)
   */
  recordSensation(
    sessionId: string,
    source: string,
    type: SensationType,
    value: number,
    state: CellState,
    confidence: number
  ): void {
    const event: ConsciousnessEvent = {
      id: uuidv4(),
      type: TheaterEventType.SENSATION_RECEIVED,
      timestamp: this.getEventTimestamp(sessionId),
      data: {
        description: `Sensed ${type} from ${source}`,
        value,
        state,
        confidence,
        source,
        sensationType: type,
        sensationValue: value,
        visualization: this.getSensationVisualization(type),
      },
    };

    this.addEvent(sessionId, event);
  }

  /**
   * Record a reasoning step
   */
  recordReasoning(
    sessionId: string,
    stepType: ReasoningStepType,
    description: string,
    input: unknown,
    output: unknown,
    confidence: number,
    dependencies?: string[]
  ): void {
    const event: ConsciousnessEvent = {
      id: uuidv4(),
      type: TheaterEventType.REASONING_STEP,
      timestamp: this.getEventTimestamp(sessionId),
      data: {
        description,
        value: output,
        previousValue: input,
        confidence,
        reasoningType: stepType,
        reasoningStep: description,
        dependencies,
        visualization: this.getReasoningVisualization(stepType, confidence),
      },
    };

    this.addEvent(sessionId, event);
  }

  /**
   * Record a state change
   */
  recordStateChange(
    sessionId: string,
    newState: CellState,
    oldState: CellState,
    confidence: number
  ): void {
    const event: ConsciousnessEvent = {
      id: uuidv4(),
      type: TheaterEventType.STATE_CHANGED,
      timestamp: this.getEventTimestamp(sessionId),
      data: {
        description: `State: ${oldState} → ${newState}`,
        state: newState,
        confidence,
        visualization: this.getStateVisualization(newState),
      },
    };

    this.addEvent(sessionId, event);
  }

  /**
   * Record a decision being made
   */
  recordDecision(
    sessionId: string,
    decision: string,
    confidence: number,
    reasoning: string[]
  ): void {
    const event: ConsciousnessEvent = {
      id: uuidv4(),
      type: TheaterEventType.DECISION_MADE,
      timestamp: this.getEventTimestamp(sessionId),
      data: {
        description: decision,
        confidence,
        reasoningStep: reasoning.join(' → '),
        visualization: {
          color: this.getConfidenceColor(confidence),
          icon: 'decision',
          intensity: confidence,
          duration: 1000,
        },
      },
    };

    this.addEvent(sessionId, event);
  }

  /**
   * Record confidence update
   */
  recordConfidence(
    sessionId: string,
    oldConfidence: number,
    newConfidence: number
  ): void {
    const event: ConsciousnessEvent = {
      id: uuidv4(),
      type: TheaterEventType.CONFIDENCE_UPDATED,
      timestamp: this.getEventTimestamp(sessionId),
      data: {
        description: `Confidence: ${(oldConfidence * 100).toFixed(0)}% → ${(newConfidence * 100).toFixed(0)}%`,
        value: newConfidence,
        previousValue: oldConfidence,
        confidence: newConfidence,
        visualization: {
          color: this.getConfidenceColor(newConfidence),
          intensity: Math.abs(newConfidence - oldConfidence),
          duration: 500,
        },
      },
    };

    this.addEvent(sessionId, event);
  }

  /**
   * Record output being produced
   */
  recordOutput(
    sessionId: string,
    target: string,
    value: unknown,
    confidence: number
  ): void {
    const event: ConsciousnessEvent = {
      id: uuidv4(),
      type: TheaterEventType.OUTPUT_READY,
      timestamp: this.getEventTimestamp(sessionId),
      data: {
        description: `Output to ${target}`,
        value,
        target,
        confidence,
        visualization: {
          color: '#4CAF50',
          icon: 'output',
          intensity: confidence,
          duration: 800,
        },
      },
    };

    this.addEvent(sessionId, event);
  }

  /**
   * Get a recording by ID
   */
  getRecording(recordingId: string): ConsciousnessRecording | null {
    return this.recordings.get(recordingId) || null;
  }

  /**
   * Get all recordings for a cell
   */
  getRecordingsForCell(cellId: string): ConsciousnessRecording[] {
    return Array.from(this.recordings.values()).filter(
      (r) => r.cellId === cellId
    );
  }

  /**
   * Get all recordings
   */
  getAllRecordings(): ConsciousnessRecording[] {
    return Array.from(this.recordings.values());
  }

  /**
   * Delete a recording
   */
  deleteRecording(recordingId: string): boolean {
    return this.recordings.delete(recordingId);
  }

  /**
   * Export a recording as JSON
   */
  exportRecording(recordingId: string): string | null {
    const recording = this.getRecording(recordingId);
    if (!recording) return null;

    return JSON.stringify(recording, null, 2);
  }

  /**
   * Import a recording from JSON
   */
  importRecording(json: string): ConsciousnessRecording | null {
    try {
      const recording = JSON.parse(json) as ConsciousnessRecording;
      this.recordings.set(recording.id, recording);
      return recording;
    } catch {
      return null;
    }
  }

  /**
   * Clear all recordings
   */
  clearAllRecordings(): void {
    this.recordings.clear();
  }

  // Private helper methods

  private recordEvent(
    sessionId: string,
    event: ConsciousnessEvent
  ): void {
    this.addEvent(sessionId, event);
  }

  private addEvent(
    sessionId: string,
    event: ConsciousnessEvent
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== RecordingState.RECORDING) {
      return;
    }

    session.events.push(event);

    // Check max duration
    if (session.startTime && event.timestamp > this.config.maxRecordingDuration) {
      this.stopRecording(sessionId);
    }
  }

  private getEventTimestamp(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session || !session.startTime) return 0;

    return Date.now() - session.startTime;
  }

  private createRecording(
    session: RecordingSession,
    duration: number
  ): ConsciousnessRecording {
    const events = session.events;

    // Find key moments
    const keyMoments = {
      firstInput: events.find(e => e.type === TheaterEventType.SENSATION_RECEIVED)?.timestamp,
      processingStarted: events.find(e => e.type === TheaterEventType.PROCESSING_STARTED)?.timestamp,
      decisionMade: events.find(e => e.type === TheaterEventType.DECISION_MADE)?.timestamp,
      outputProduced: events.find(e => e.type === TheaterEventType.OUTPUT_READY)?.timestamp,
    };

    // Calculate stats
    const reasoningSteps = events.filter(e => e.type === TheaterEventType.REASONING_STEP).length;
    const stateChanges = events.filter(e => e.type === TheaterEventType.STATE_CHANGED).length;
    const confidenceValues = events.map(e => e.data.confidence);
    const confidenceStart = confidenceValues[0] || 0;
    const confidenceEnd = confidenceValues[confidenceValues.length - 1] || 0;
    const confidencePeak = Math.max(...confidenceValues);

    // Extract inputs and outputs
    const inputs = events
      .filter(e => e.type === TheaterEventType.SENSATION_RECEIVED)
      .map(e => ({
        source: e.data.source || 'unknown',
        value: e.data.value,
        timestamp: e.timestamp,
      }));

    const outputs = events
      .filter(e => e.type === TheaterEventType.OUTPUT_READY)
      .map(e => ({
        target: e.data.target || 'unknown',
        value: e.data.value,
        timestamp: e.timestamp,
      }));

    return {
      id: uuidv4(),
      cellId: session.cellId,
      cellType: 'unknown', // Would be set by the cell
      startTime: session.startTime || 0,
      endTime: session.startTime ? session.startTime + duration : 0,
      duration,
      events,
      keyMoments,
      stats: {
        totalEvents: events.length,
        reasoningSteps,
        stateChanges,
        confidenceStart,
        confidenceEnd,
        confidencePeak,
      },
      inputs,
      outputs,
    };
  }

  private getSensationVisualization(type: SensationType) {
    const colors: Record<SensationType, string> = {
      [SensationType.ABSOLUTE_CHANGE]: '#4CAF50',
      [SensationType.RATE_OF_CHANGE]: '#2196F3',
      [SensationType.ACCELERATION]: '#FF9800',
      [SensationType.PRESENCE]: '#9C27B0',
      [SensationType.PATTERN]: '#E91E63',
      [SensationType.ANOMALY]: '#F44336',
    };

    return {
      color: colors[type] || '#666',
      icon: 'sensation',
      intensity: 0.7,
      duration: 600,
    };
  }

  private getReasoningVisualization(type: ReasoningStepType, confidence: number) {
    const colors: Record<ReasoningStepType, string> = {
      [ReasoningStepType.OBSERVATION]: '#607D8B',
      [ReasoningStepType.ANALYSIS]: '#2196F3',
      [ReasoningStepType.INFERENCE]: '#9C27B0',
      [ReasoningStepType.PREDICTION]: '#FF9800',
      [ReasoningStepType.DECISION]: '#4CAF50',
      [ReasoningStepType.ACTION]: '#F44336',
      [ReasoningStepType.VALIDATION]: '#00BCD4',
      [ReasoningStepType.EXPLANATION]: '#795548',
    };

    return {
      color: colors[type] || '#666',
      icon: 'reasoning',
      intensity: confidence,
      duration: 800,
    };
  }

  private getStateVisualization(state: CellState) {
    const colors: Record<CellState, string> = {
      [CellState.DORMANT]: '#666',
      [CellState.SENSING]: '#4CAF50',
      [CellState.PROCESSING]: '#2196F3',
      [CellState.EMITTING]: '#FF9800',
      [CellState.ERROR]: '#F44336',
    };

    return {
      color: colors[state],
      icon: 'state',
      intensity: 0.5,
      duration: 400,
    };
  }

  private getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#8BC34A';
    if (confidence >= 0.4) return '#FF9800';
    return '#F44336';
  }
}

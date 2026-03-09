/**
 * Cell Theater - Consciousness Recording and Replay Types
 *
 * Types for recording cell decision-making processes and replaying them
 * as animated visualizations in the Cell Theater.
 */

import { SensationType, ReasoningStepType, CellState } from '../../core/types';

/**
 * Recording state types
 */
export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

/**
 * Playback state types
 */
export enum PlaybackState {
  IDLE = 'idle',
  PLAYING = 'playing',
  PAUSED = 'paused',
  SEEKING = 'seeking',
}

/**
 * Theater event types - discrete moments in cell consciousness
 */
export enum TheaterEventType {
  // Input events (Head)
  SENSATION_RECEIVED = 'sensation_received',
  INPUT_VALIDATED = 'input_validated',
  INPUT_TRANSFORMED = 'input_transformed',

  // Processing events (Body)
  PROCESSING_STARTED = 'processing_started',
  REASONING_STEP = 'reasoning_step',
  PATTERN_MATCHED = 'pattern_matched',
  INFERENCE_MADE = 'inference_made',
  DECISION_MADE = 'decision_made',
  CONFIDENCE_UPDATED = 'confidence_updated',

  // Output events (Tail)
  OUTPUT_READY = 'output_ready',
  EFFECT_TRIGGERED = 'effect_triggered',
  NOTIFICATION_SENT = 'notification_sent',

  // State transitions
  STATE_CHANGED = 'state_changed',
}

/**
 * Single consciousness event - timestamped moment in cell's life
 */
export interface ConsciousnessEvent {
  id: string;
  type: TheaterEventType;
  timestamp: number; // milliseconds from start
  data: {
    // Event-specific data
    description: string;
    value?: unknown;
    previousValue?: unknown;

    // Context
    state: CellState;
    confidence: number;

    // Source/target information
    source?: string;
    target?: string;

    // Reasoning-specific
    reasoningType?: ReasoningStepType;
    reasoningStep?: string;
    dependencies?: string[];

    // Sensation-specific
    sensationType?: SensationType;
    sensationValue?: number;

    // Visualization hints
    visualization?: {
      color?: string;
      icon?: string;
      intensity?: number; // 0-1 for animation intensity
      duration?: number; // animation duration in ms
    };
  };
}

/**
 * Consciousness recording - full trace of a cell's decision process
 */
export interface ConsciousnessRecording {
  id: string;
  cellId: string;
  cellType: string;
  startTime: number;
  endTime: number;
  duration: number;

  // All events in chronological order
  events: ConsciousnessEvent[];

  // Key moments for quick navigation
  keyMoments: {
    firstInput?: number; // timestamp
    processingStarted?: number;
    decisionMade?: number;
    outputProduced?: number;
  };

  // Summary statistics
  stats: {
    totalEvents: number;
    reasoningSteps: number;
    stateChanges: number;
    confidenceStart: number;
    confidenceEnd: number;
    confidencePeak: number;
  };

  // Input/output values
  inputs: Array<{
    source: string;
    value: unknown;
    timestamp: number;
  }>;

  outputs: Array<{
    target: string;
    value: unknown;
    timestamp: number;
  }>;
}

/**
 * Recording session - active recording state
 */
export interface RecordingSession {
  state: RecordingState;
  startTime: number | null;
  events: ConsciousnessEvent[];
  cellId: string;
}

/**
 * Playback session - active replay state
 */
export interface PlaybackSession {
  state: PlaybackState;
  currentTime: number;
  playbackRate: number; // 0.5, 1, 2, etc.
  loopEnabled: boolean;
  loopStart?: number;
  loopEnd?: number;
  currentEventIndex: number;
}

/**
 * Animation state for stage rendering
 */
export interface AnimationState {
  // Current playback position
  currentTime: number;
  progress: number; // 0-1

  // Active event being animated
  activeEvent: ConsciousnessEvent | null;

  // Confidence animation
  confidence: {
    current: number;
    target: number;
    animating: boolean;
  };

  // Sensation animations (inputs flowing in)
  sensations: Array<{
    id: string;
    source: string;
    type: SensationType;
    value: number;
    progress: number; // 0-1 animation progress
    color: string;
  }>;

  // Reasoning step animations
  reasoningSteps: Array<{
    id: string;
    type: ReasoningStepType;
    description: string;
    progress: number; // 0-1
    highlighted: boolean;
  }>;

  // Output animations (results flowing out)
  outputs: Array<{
    id: string;
    target: string;
    value: unknown;
    progress: number; // 0-1
    color: string;
  }>;

  // Visual effects
  effects: Array<{
    id: string;
    type: 'pulse' | 'flow' | 'spark' | 'wave';
    x: number;
    y: number;
    intensity: number;
    color: string;
  }>;
}

/**
 * Theater configuration
 */
export interface TheaterConfig {
  // Animation settings
  animationSpeed: number; // multiplier for animation speed
  slowMotionFactor: number; // factor for slow motion

  // Visual settings
  showFlowLines: boolean; // show data flow animations
  showConfidence: boolean; // show confidence meter
  showTimeline: boolean; // show timeline scrubber

  // Playback settings
  defaultPlaybackRate: number;
  autoPlay: boolean;
  loopOnEnd: boolean;

  // Recording settings
  autoRecord: boolean; // automatically record cell activity
  maxRecordingDuration: number; // max recording length in ms
  compressRecordings: boolean; // compress events for smoother playback

  // Export settings
  exportFormat: 'video' | 'gif' | 'json';
  exportQuality: 'low' | 'medium' | 'high';
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'video' | 'gif' | 'json';
  quality: 'low' | 'medium' | 'high';
  startTime?: number;
  endTime?: number;
  includeAnnotations?: boolean;
  filename?: string;
}

/**
 * Theater analytics
 */
export interface TheaterAnalytics {
  totalRecordings: number;
  totalPlaybackTime: number;
  mostViewedRecording: string;
  averagePlaybackRate: number;
  exportCount: number;
}

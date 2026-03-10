/**
 * Core type definitions for the POLLN spreadsheet integration
 *
 * This file contains all the fundamental interfaces and enums used across
 * the cell system, as specified in CELL_ONTOLOGY.md
 */

/**
 * Unique identifier for a cell
 */
export type CellId = string;

/**
 * Reference to a cell's position
 */
export interface CellPosition {
  row: number;
  col: number;
}

/**
 * Reference to a cell (can be absolute or relative)
 */
export interface CellReference {
  id?: CellId;
  row: number;
  col: number;
  sheet?: string;
}

/**
 * Cell state lifecycle enum
 */
export enum CellState {
  DORMANT = 'dormant',
  SENSING = 'sensing',
  PROCESSING = 'processing',
  EMITTING = 'emitting',
  LEARNING = 'learning',
  ERROR = 'error',
}

/**
 * Logic level enum - different levels of intelligence
 */
export enum LogicLevel {
  L0_LOGIC = 0,
  L1_PATTERN = 1,
  L2_AGENT = 2,
  L3_LLM = 3,
}

/**
 * Cell type enum
 */
export enum CellType {
  INPUT = 'input',
  OUTPUT = 'output',
  STORAGE = 'storage',
  TRANSFORM = 'transform',
  FILTER = 'filter',
  AGGREGATE = 'aggregate',
  VALIDATE = 'validate',
  ANALYSIS = 'analysis',
  PREDICTION = 'prediction',
  DECISION = 'decision',
  EXPLAIN = 'explain',
  NOTIFY = 'notify',
  TRIGGER = 'trigger',
  SCHEDULE = 'schedule',
  COORDINATE = 'coordinate',
  // Analytics Cells (Wave 4)
  WHAT_IF = 'what_if',
  OPTIMIZATION = 'optimization',
  REGRESSION = 'regression',
  TIME_SERIES = 'time_series',
  MONTE_CARLO = 'monte_carlo',
}

/**
 * Sensation types for cell awareness
 */
export enum SensationType {
  ABSOLUTE_CHANGE = 'absolute',
  RATE_OF_CHANGE = 'velocity',
  ACCELERATION = 'trend',
  PRESENCE = 'existence',
  PATTERN = 'recognition',
  ANOMALY = 'outlier',
}

/**
 * Sensation interface
 */
export interface Sensation {
  source: CellReference;
  type: SensationType;
  value: number;
  previousValue?: number;
  currentValue?: number;
  expectedValue?: number;
  timestamp: number;
  confidence: number;
}

/**
 * Reasoning step types
 */
export enum ReasoningStepType {
  OBSERVATION = 'observation',
  ANALYSIS = 'analysis',
  INFERENCE = 'inference',
  PREDICTION = 'prediction',
  DECISION = 'decision',
  ACTION = 'action',
  VALIDATION = 'validation',
  EXPLANATION = 'explanation',
}

/**
 * Single reasoning step
 */
export interface ReasoningStep {
  id: string;
  type: ReasoningStepType;
  description: string;
  input: any;
  output: any;
  confidence: number;
  duration: number;
  timestamp: number;
  dependencies: string[];
}

/**
 * Dependency tracking
 */
export interface Dependency {
  from: string;
  to: string;
  type: 'data' | 'control' | 'sensation';
}

/**
 * Complete reasoning trace
 */
export interface ReasoningTrace {
  steps: ReasoningStep[];
  dependencies: Dependency[];
  confidence: number;
  totalTime: number;
  startTime: number;
  endTime: number;
}

/**
 * Feedback for learning
 */
export interface Feedback {
  type: 'positive' | 'negative' | 'neutral';
  value: number;
  explanation?: string;
  timestamp: number;
  source?: CellReference;
}

/**
 * Cell output
 */
export interface CellOutput {
  value: any;
  confidence: number;
  explanation: string;
  trace: ReasoningTrace;
  effects: Effect[];
}

/**
 * Effect on other cells
 */
export interface Effect {
  target: CellReference;
  type: 'update' | 'trigger' | 'notify';
  value?: any;
  timestamp: number;
}

/**
 * Input channel
 */
export interface InputChannel {
  id: string;
  source: CellReference | 'user' | 'external';
  type: 'data' | 'formula' | 'sensation';
  active: boolean;
}

/**
 * Output channel
 */
export interface OutputChannel {
  id: string;
  target: CellReference | 'user' | 'external';
  type: 'value' | 'notification' | 'effect';
  active: boolean;
}

/**
 * Execution record for memory
 */
export interface ExecutionRecord {
  id: string;
  input: any;
  output: any;
  trace: ReasoningTrace;
  confidence: number;
  timestamp: number;
  duration: number;
}

/**
 * Cell self-model
 */
export interface CellSelfModel {
  identity: string;
  capabilities: string[];
  performance: {
    totalExecutions: number;
    successfulExecutions: number;
    averageConfidence: number;
    averageDuration: number;
  };
  patterns: LearnedPattern[];
  lastUpdated: number;
}

/**
 * Learned pattern
 */
export interface LearnedPattern {
  id: string;
  pattern: any;
  frequency: number;
  confidence: number;
  lastSeen: number;
}

/**
 * Self-awareness levels
 */
export enum SelfAwarenessLevel {
  NONE = 0,
  BASIC = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3,
}

/**
 * Watched cell for sensation
 */
export interface WatchedCell {
  reference: CellReference;
  sensationTypes: SensationType[];
  threshold: number;
  lastSensation?: Sensation;
}

/**
 * Processing logic interface
 */
export interface ProcessingLogic {
  level: LogicLevel;
  process(input: any, context: ProcessingContext): Promise<ProcessingResult>;
  estimateCost(input: any): number;
}

/**
 * Processing context
 */
export interface ProcessingContext {
  cellId: CellId;
  position: CellPosition;
  sensations: Sensation[];
  memory: ExecutionRecord[];
  timestamp: number;
  input?: any;
}

/**
 * Processing result
 */
export interface ProcessingResult {
  value: any;
  confidence: number;
  trace: ReasoningTrace;
  explanation: string;
}

/**
 * Cell inspection result
 */
export interface CellInspection {
  cellId: CellId;
  type: CellType;
  state: CellState;
  position: CellPosition;
  inputs: any[];
  sensations: Sensation[];
  reasoning: ReasoningStep[];
  memory: ExecutionRecord[];
  outputs: any[];
  effects: Effect[];
  selfModel: CellSelfModel;
}

/**
 * Execution history
 */
export interface ExecutionHistory {
  totalExecutions: number;
  recentExecutions: ExecutionRecord[];
  successRate: number;
  averageConfidence: number;
  averageDuration: number;
}

/**
 * Action interface
 */
export interface Action {
  id: string;
  type: string;
  target: CellReference | 'external';
  payload: any;
  timestamp: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

/**
 * Cell anatomy interfaces
 */

export interface CellHead {
  inputs: InputChannel[];
  sensations: Sensation[];
  recognizers: any[];
  validators: any[];
}

export interface CellBody {
  logic: any;
  memory: ExecutionMemory;
  trace: ReasoningTrace;
  selfModel: CellSelfModel;
}

export interface CellTail {
  outputs: OutputChannel[];
  effects: Effect[];
  actions: Action[];
  subscribers: CellReference[];
}

export interface CellOrigin {
  id: CellId;
  position: CellPosition;
  selfAwareness: number;
  watchedCells: WatchedCell[];
}

/**
 * Execution memory interface
 */
export interface ExecutionMemory {
  limit: number;
  records: ExecutionRecord[];
  record(input: any, output: any, trace: ReasoningTrace, confidence: number, duration?: number): void;
  getRecent(count: number): ExecutionRecord[];
  getByInput(input: any): ExecutionRecord[];
  clear(): void;
}

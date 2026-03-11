/**
 * SMPbot Core Type System
 *
 * SMPbot = Seed + Model + Prompt = Stable Output
 *
 * Formal definition of SMPbot as a specialized tile type with stability guarantees.
 * Based on Round 1 research findings and integration with existing tile system.
 */

import { ITile, Tile, Schema, ValidationResult, SerializedTile, TileConfig } from '../core/Tile';

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Seed: Domain knowledge/data that makes the bot specifically yours
 */
export interface Seed<T> {
  readonly id: string;
  readonly version: string;
  readonly type: 'cells' | 'columns' | 'range' | 'dataset' | 'knowledge';
  readonly data: T;
  readonly schema: Schema<T>;
  readonly hash: string; // For change detection

  serialize(): SerializedSeed;
  validate(): ValidationResult;
  update(newData: T): Seed<T>;
}

export interface SerializedSeed {
  id: string;
  version: string;
  type: string;
  data: unknown;
  schema: unknown;
  metadata: {
    size: number;
    createdAt: string;
    updatedAt: string;
    hash: string;
  };
}

/**
 * Model: AI engine with shared loading capabilities
 */
export interface Model<I, O> {
  readonly id: string;
  readonly type: 'script' | 'ml' | 'llm';
  readonly parameters: ModelParameters;
  readonly loaded: boolean; // Shared resource loaded once

  load(): Promise<void>;
  unload(): Promise<void>;
  predict(input: I): Promise<O>;
  confidence(input: I): Promise<number>;
}

export interface ModelParameters {
  [key: string]: unknown;
}

/**
 * Prompt: Task specification with constraints
 */
export interface Prompt<I, O> {
  readonly id: string;
  readonly version: string;
  readonly template: string;
  readonly constraints: Constraint[];
  readonly context: Context;
  readonly examples: Example<I, O>[];

  validate(input: I): ValidationResult;
  apply(input: I): TaskSpecification;
  explain(): string;
}

export interface Constraint {
  type: 'format' | 'content' | 'safety' | 'performance';
  condition: (input: unknown) => boolean;
  message: string;
}

export interface Context {
  shortTerm: Record<string, unknown>;
  mediumTerm: Record<string, unknown>;
  longTerm: Record<string, unknown>;
}

export interface Example<I, O> {
  input: I;
  output: O;
  explanation: string;
}

export interface TaskSpecification {
  modelId: string;
  parameters: ModelParameters;
  constraints: Constraint[];
  context: Context;
}

/**
 * Stable output with confidence guarantees
 */
export interface Stable<O> {
  readonly output: O;
  readonly confidence: number;
  readonly stability: number; // 0-1, consistency across runs
  readonly variance: number; // Output variation across model versions
  readonly timestamp: Date;

  isStable(threshold: number): boolean;
  compare(other: Stable<O>): StabilityComparison;
}

export interface StabilityComparison {
  outputSimilarity: number;
  confidenceDelta: number;
  stabilityDelta: number;
  overallMatch: boolean;
}

/**
 * Inference state for "peeking" at quantum inference
 */
export interface InferenceState {
  readonly step: number;
  readonly intermediateOutputs: unknown[];
  readonly confidenceTrajectory: number[];
  readonly attentionPatterns: unknown[];
  readonly timestamp: Date;
}

// ============================================================================
// SMPBOT INTERFACE
// ============================================================================

/**
 * Core SMPbot interface
 * SMPbot<I, O> = Seed<I> + Model<I, O> + Prompt<I, O> → Stable<O>
 */
export interface SMPbot<I, O> extends ITile<I, O> {
  // Core components
  readonly seed: Seed<I>;
  readonly model: Model<I, O>;
  readonly prompt: Prompt<I, O>;

  // Stability properties
  readonly stabilityScore: number; // 0-1, how stable output is across model variations
  readonly driftThreshold: number; // When to trigger retraining

  // Specialized methods
  peek(input: I): Promise<InferenceState>; // Partial measurement of quantum state
  stabilize(): Promise<void>; // Improve stability through training
  clone(): SMPbot<I, O>; // Create identical bot instance

  // GPU coordination
  readonly gpuCompatible: boolean;
  getGPUExecutionPlan(): GPUExecutionPlan | null;
}

// ============================================================================
// GPU EXECUTION TYPES
// ============================================================================

/**
 * GPU execution plan for SMPbot batch processing
 * Coordinated with GPU Scaling Specialist's architecture
 */
export interface GPUExecutionPlan {
  // Resource allocation
  gpuCount: number;
  memoryPerGPU: number;
  batchSize: number;

  // Execution strategy
  executionMode: 'parallel' | 'pipeline' | 'hybrid';
  synchronization: 'async' | 'sync' | 'semi-sync';

  // Optimization
  kernelOptimization: KernelConfig[];
  memoryOptimization: MemoryLayout;
  communicationOptimization: CommPattern;

  // Execution
  execute(bots: SMPbot<I, O>[], inputs: I[]): Promise<O[]>;
}

export interface KernelConfig {
  workgroupSize: [number, number, number];
  sharedMemory: number;
  registerPressure: number;
}

export interface MemoryLayout {
  botStateSize: number;
  modelParamSize: number;
  inputTensorSize: number;
  outputTensorSize: number;
  alignment: number;
}

export interface CommPattern {
  type: 'all-to-all' | 'reduce-scatter' | 'all-gather';
  bandwidth: number;
  latency: number;
}

// ============================================================================
// STABILITY VALIDATION TYPES
// ============================================================================

/**
 * Stability validation framework
 */
export interface StabilityValidator<O> {
  // Test stability across variations
  testModelVariation(bot: SMPbot<I, O>, variations: number): StabilityReport;
  testInputVariation(bot: SMPbot<I, O>, inputRange: InputRange): StabilityReport;
  testTemporalStability(bot: SMPbot<I, O>, duration: Duration): StabilityReport;

  // Metrics
  calculateStabilityScore(reports: StabilityReport[]): number;
  detectDrift(current: O, historical: O[]): DriftDetection;
  recommendStabilization(report: StabilityReport): StabilizationPlan;
}

export interface StabilityReport {
  botId: string;
  testType: 'model' | 'input' | 'temporal';
  stabilityScore: number;
  confidenceInterval: [number, number];
  variance: number;
  outliers: number;
  recommendations: string[];
}

export interface InputRange {
  min: unknown;
  max: unknown;
  distribution: 'uniform' | 'normal' | 'custom';
}

export interface Duration {
  start: Date;
  end: Date;
  samplingInterval: number;
}

export interface DriftDetection {
  detected: boolean;
  magnitude: number;
  type: 'concept' | 'data' | 'covariate';
  confidence: number;
  recommendations: string[];
}

export interface StabilizationPlan {
  actions: StabilizationAction[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: number;
  expectedImprovement: number;
}

export type StabilizationAction =
  | { type: 'retrain'; epochs: number; dataSize: number }
  | { type: 'fineTune'; learningRate: number; steps: number }
  | { type: 'promptOptimization'; iterations: number }
  | { type: 'seedAugmentation'; newData: unknown[] }
  | { type: 'modelSwitch'; newModelId: string };

// ============================================================================
// COMPOSITION TYPES
// ============================================================================

/**
 * Bot type hierarchy
 */
export type Bot<I, O> = {
  execute(input: I): Promise<O>;
  confidence(input: I): Promise<number>;
};

// Scriptbot: Deterministic, no ML
export interface Scriptbot<I, O> extends Bot<I, O> {
  readonly type: 'script';
  readonly rules: Rule[];
  readonly deterministic: true;
}

// SMPbot: ML-enhanced, probabilistic (already defined above)

// TeacherTile: Full LLM reasoning
export interface TeacherTile<I, O> extends Bot<I, O> {
  readonly type: 'teacher';
  readonly llm: LLMModel;
  readonly reasoningDepth: number;
  readonly canSpawn: boolean;
}

/**
 * Composition types
 */
// Sequential composition: A ; B
export type Sequential<A, B, C> = (bot1: Bot<A, B>, bot2: Bot<B, C>) => Bot<A, C>;

// Parallel composition: A || B
export type Parallel<A, B, C> = (bot1: Bot<A, B>, bot2: Bot<A, C>) => Bot<A, [B, C]>;

// Conditional composition: if P then A else B
export type Conditional<A, B> = (
  predicate: (input: A) => boolean,
  ifTrue: Bot<A, B>,
  ifFalse: Bot<A, B>
) => Bot<A, B>;

// Recursive composition: A* (zero or more)
export type Recursive<A, B> = (base: Bot<A, B>, condition: (output: B) => boolean) => Bot<A, B[]>;

// ============================================================================
// EXPORTS
// ============================================================================

export default SMPbot;
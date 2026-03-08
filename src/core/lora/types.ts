/**
 * LoRA (Low-Rank Adaptation) Types for Library of Experts
 *
 * Implementation of Library of Experts Architecture
 * Small base models + interchangeable LoRA adapters for specialized expertise
 */

import type { A2APackage, SubsumptionLayer, PrivacyLevel, AgentConfig } from '../types.js';

// ============================================================================
// LoRA Adapter Types
// ============================================================================

/**
 * LoRA adapter matrix structure
 * ΔW = B·A where B ∈ ℝ^(d×r), A ∈ ℝ^(r×d), r << d
 */
export interface LoRAMatrices {
  /** A matrix: (r × d) - trainable adaptation matrix 1 */
  A: Float32Array;
  /** B matrix: (d × r) - trainable adaptation matrix 2 */
  B: Float32Array;
  /** Rank r */
  rank: number;
  /** Model dimension d */
  dimension: number;
}

/**
 * LoRA Adapter - specialized expertise module
 */
export interface LoRAAdapter {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of expertise */
  description: string;

  // Model specification
  /** Base model this LoRA is compatible with */
  baseModel: string;
  /** Rank r (typically 8-64) */
  rank: number;
  /** Scaling factor α */
  alpha: number;

  // Matrices
  matrices: LoRAMatrices;

  // Metadata
  /** List of capabilities/tags */
  expertise: string[];
  /** Other LoRAs this can merge with */
  compatibleWith: string[];
  /** LoRAs that interfere with this one */
  conflictsWith: string[];
  /** File size in bytes */
  size: number;

  // Performance tracking
  /** Historical performance (0-1) */
  avgPerformance: number;
  /** Number of times used */
  usageCount: number;
  /** Last used timestamp */
  lastUsed: number;

  // Training metadata
  /** Number of training examples */
  trainingDataSize: number;
  /** Training domain */
  trainingDomain: string;
  /** Training date */
  trainingDate: number;
  /** LoRA version */
  version: string;
}

/**
 * LoRA composition state
 */
export interface LoRAComposition {
  /** Unique composition identifier */
  id: string;
  /** Agent using this composition */
  agentId: string;

  // Active LoRAs
  loras: LoRAInComposition[];

  // Merge strategy
  strategy: LoRAMergeStrategy;
  normalization: LoRANormalization;

  // Performance
  /** Predicted performance (0-1) */
  performance?: number;
  /** Last evaluation timestamp */
  lastEvaluated?: number;
}

/**
 * LoRA in a composition
 */
export interface LoRAInComposition {
  /** LoRA identifier */
  loraId: string;
  /** Merge weight (typically 0-1) */
  weight: number;
  /** Layer position (if applicable) */
  position?: number;
}

/**
 * Merge strategy for multiple LoRAs
 */
export type LoRAMergeStrategy =
  | 'linear'   // Simple weighted sum
  | 'svd'      // SVD-based merging (controls effective rank)
  | 'tied';    // Shared components

/**
 * Normalization strategy for LoRA weights
 */
export type LoRANormalization =
  | 'sum_to_1' // Weights sum to 1
  | 'none'     // No normalization
  | 'softmax'; // Softmax normalization

// ============================================================================
// A2A Package Types for LoRA Operations
// ============================================================================

/**
 * Request to swap/add/remove LoRAs
 */
export interface LoRASwapRequestPayload {
  /** Current composition */
  currentComposition: LoRAComposition;
  /** Requested changes */
  requestedChanges: LoRAChange[];
  /** Reason for swap */
  reason: string;
}

/**
 * LoRA change request
 */
export interface LoRAChange {
  /** LoRA identifier */
  loraId: string;
  /** Action to perform */
  action: 'add' | 'remove' | 'adjust';
  /** New weight (for adjust action) */
  weight?: number;
}

/**
 * Response to LoRA swap request
 */
export interface LoRASwapResponsePayload {
  /** Success status */
  success: boolean;
  /** New composition (if successful) */
  newComposition?: LoRAComposition;
  /** Predicted performance (0-1) */
  estimatedPerformance?: number;
  /** Swap time in milliseconds */
  swapTimeMs?: number;
  /** Error message (if failed) */
  reason?: string;
}

/**
 * LoRA swap request A2A package
 */
export interface LoRASwapRequest extends A2APackage<LoRASwapRequestPayload> {
  type: 'lora-swap-request';
  payload: LoRASwapRequestPayload;
}

/**
 * LoRA swap response A2A package
 */
export interface LoRASwapResponse extends A2APackage<LoRASwapResponsePayload> {
  type: 'lora-swap-response';
  payload: LoRASwapResponsePayload;
}

/**
 * Request to discover compatible LoRAs
 */
export interface LoRADiscoveryRequestPayload {
  /** Task description */
  task: string;
  /** Maximum number of LoRAs to return */
  maxCount: number;
  /** Current composition (to avoid conflicts) */
  currentComposition?: LoRAComposition;
}

/**
 * LoRA discovery response
 */
export interface LoRADiscoveryResponsePayload {
  /** Suggested LoRAs */
  suggestions: LoRAAdapter[];
  /** Performance estimates */
  performanceEstimates: Map<string, number>;
  /** Conflicts detected */
  conflicts: string[];
}

/**
 * LoRA discovery request A2A package
 */
export interface LoRADiscoveryRequest extends A2APackage<LoRADiscoveryRequestPayload> {
  type: 'lora-discovery-request';
  payload: LoRADiscoveryRequestPayload;
}

/**
 * LoRA discovery response A2A package
 */
export interface LoRADiscoveryResponse extends A2APackage<LoRADiscoveryResponsePayload> {
  type: 'lora-discovery-response';
  payload: LoRADiscoveryResponsePayload;
}

// ============================================================================
// LoRA Library Configuration
// ============================================================================

/**
 * Configuration for LoRA library
 */
export interface LoRALibraryConfig {
  /** Base model path */
  baseModelPath: string;
  /** Directory containing LoRA adapters */
  loraDirectory: string;
  /** Maximum cached LoRAs */
  cacheSize: number;
  /** Default merge strategy */
  defaultStrategy: LoRAMergeStrategy;
  /** Default normalization */
  defaultNormalization: LoRANormalization;
  /** Maximum LoRAs per agent */
  maxLoRAsPerAgent: number;
}

/**
 * LoRA storage format
 */
export interface LoRAStorage {
  /** LoRA metadata */
  metadata: LoRAAdapter;
  /** Matrix data (serialized) */
  matrices: {
    /** Flattened A matrix */
    A: number[];
    /** Flattened B matrix */
    B: number[];
  };
}

// ============================================================================
// Training Types
// ============================================================================

/**
 * Training configuration for a new LoRA
 */
export interface LoRATrainingConfig {
  /** LoRA name */
  name: string;
  /** Expertise tags */
  expertise: string[];
  /** Training data */
  trainingData: TrainingExample[];
  /** Rank r */
  rank?: number;
  /** Scaling factor α */
  alpha?: number;
  /** Number of training epochs */
  epochs?: number;
  /** Batch size */
  batchSize?: number;
  /** Learning rate */
  learningRate?: number;
}

/**
 * Single training example
 */
export interface TrainingExample {
  /** Input prompt/task */
  input: string;
  /** Target output */
  target: string;
  /** Optional intermediate states for distillation */
  teacherStates?: number[];
}

/**
 * Distillation configuration
 */
export interface LoRADistillationConfig {
  /** Teacher model (large model) */
  teacherModel: string;
  /** Expertise to distill */
  expertise: string;
  /** Number of examples to generate */
  exampleCount: number;
  /** Target LoRA rank */
  targetRank: number;
  /** Distillation temperature */
  temperature?: number;
}

/**
 * Training progress
 */
export interface LoRATrainingProgress {
  /** Current epoch */
  epoch: number;
  /** Total epochs */
  totalEpochs: number;
  /** Current loss */
  loss: number;
  /** Validation loss */
  valLoss: number;
  /** Estimated time remaining (ms) */
  etaMs: number;
  /** Current status */
  status: 'training' | 'validating' | 'complete' | 'failed';
}

/**
 * Training result
 */
export interface LoRATrainingResult {
  /** Trained LoRA adapter */
  lora: LoRAAdapter;
  /** Final training loss */
  finalLoss: number;
  /** Final validation loss */
  finalValLoss: number;
  /** Training time in milliseconds */
  trainingTimeMs: number;
  /** Validation metrics */
  validationMetrics: Map<string, number>;
}

// ============================================================================
// Performance Metrics
// ============================================================================

/**
 * LoRA performance metrics
 */
export interface LoRAPerformanceMetrics {
  /** LoRA identifier */
  loraId: string;
  /** Average performance (0-1) */
  avgPerformance: number;
  /** Standard deviation */
  stdDev: number;
  /** Number of evaluations */
  evaluationCount: number;
  /** Last evaluation timestamp */
  lastEvaluated: number;
  /** Performance on specific tasks */
  taskPerformance: Map<string, number>;
}

/**
 * Emergent ability from LoRA combination
 */
export interface EmergentAbility {
  /** Unique identifier */
  id: string;
  /** Name of the emergent ability */
  name: string;
  /** Source LoRA IDs that created this */
  sourceLoRAs: string[];
  /** Performance on various tasks */
  taskPerformance: Map<string, number>;
  /** How well it transfers to new tasks */
  transferability: number;
  /** How broad its utility is */
  generalization: number;
  /** How stable it is */
  robustness: number;
  /** Number of times used */
  useCount: number;
  /** Success rate */
  successRate: number;
  /** When this was discovered */
  discoveredAt: number;
}

// ============================================================================
// Memory Management
// ============================================================================

/**
 * LoRA memory state
 */
export interface LoRAMemoryState {
  /** LoRA identifier */
  loraId: string;
  /** Size in bytes */
  size: number;
  /** Last accessed timestamp */
  lastAccessed: number;
  /** Access count */
  accessCount: number;
  /** Currently loaded in GPU memory */
  isLoaded: boolean;
}

/**
 * Memory manager configuration
 */
export interface LoRAMemoryConfig {
  /** Maximum GPU memory to use (bytes) */
  maxGPUMemoryBytes: number;
  /** Maximum number of LoRAs to cache */
  maxCachedLoRAs: number;
  /** Eviction policy */
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  /** Preload frequently used LoRAs */
  preloadPopular: boolean;
}

// ============================================================================
// Expert Registry
// ============================================================================

/**
 * Expert registry entry
 */
export interface ExpertRegistryEntry {
  /** Expert identifier */
  id: string;
  /** Expert name */
  name: string;
  /** Category/domain */
  category: string;
  /** Associated LoRA IDs */
  loraIds: string[];
  /** Expertise tags */
  expertise: string[];
  /** Average performance */
  avgPerformance: number;
  /** Number of uses */
  useCount: number;
}

// ============================================================================
// Tool Belt
// ============================================================================

/**
 * Tool belt state - active LoRAs for an agent
 */
export interface ToolBeltState {
  /** Agent identifier */
  agentId: string;
  /** Current composition */
  composition: LoRAComposition;
  /** Last swap timestamp */
  lastSwap: number;
  /** Number of swaps performed */
  swapCount: number;
  /** Swap history */
  swapHistory: LoRASwapRequest[];
}

// ============================================================================
// Base Model
// ============================================================================

/**
 * Base model configuration
 */
export interface BaseModelConfig {
  /** Model identifier */
  id: string;
  /** Model name/path */
  name: string;
  /** Model dimension */
  dimension: number;
  /** Number of parameters */
  parameterCount: number;
  /** Model family */
  family: string;
  /** Supported LoRA ranks */
  supportedRanks: number[];
}

/**
 * Base model interface
 */
export interface BaseModel {
  /** Model configuration */
  config: BaseModelConfig;
  /** Apply LoRA adapter */
  applyLoRA(delta: Float32Array): Promise<void>;
  /** Remove LoRA adapter */
  removeLoRA(): Promise<void>;
  /** Generate with current LoRA */
  generate(input: string): Promise<string>;
}

// ============================================================================
// Agent Types
// ============================================================================

/**
 * LoRA-Enhanced Agent configuration
 */
export interface LoRAAgentConfig extends AgentConfig {
  /** Initial LoRA IDs to load */
  initialLoRAs?: string[];
  /** Minimum performance threshold for auto-swap */
  minPerformanceThreshold?: number;
  /** Enable automatic LoRA selection */
  enableAutoSelect?: boolean;
  /** Maximum LoRAs to load simultaneously */
  maxLoRAs?: number;
}

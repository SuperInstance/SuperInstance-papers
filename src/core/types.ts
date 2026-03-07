/**
 * POLLN Core Types
 * Pattern-Organized Large Language Network
 *
 * Based on Round 2 Research Synthesis
 */

// ============================================================================
// A2A Package Types (Coordination Protocols Research)
// ============================================================================

export enum PrivacyLevel {
  PUBLIC = 'PUBLIC',
  COLONY = 'COLONY',
  PRIVATE = 'PRIVATE'
}

export enum SubsumptionLayer {
  SAFETY = 'SAFETY',      // Immediate, hardwired (bypasses all)
  REFLEX = 'REFLEX',        // Fast, cached responses
  HABITUAL = 'HABITUAL',   // Learned routines
  DELIBERATE = 'DELIBERATE' // Planning, reasoning
}

export interface A2APackage<T = unknown> {
  id: string;
  timestamp: number;

  // Sender/Receiver
  senderId: string;
  receiverId: string;

  // Content
  type: string;
  payload: T;

  // Causal Chain (Traceability)
  parentIds: string[];
  causalChainId: string;

  // Privacy
  privacyLevel: PrivacyLevel;

  // Subsumption Architecture
  layer: SubsumptionLayer;

  // Differential Privacy Metadata
  dpMetadata?: {
    epsilon: number;
    delta: number;
    noiseScale: number;
  };
}

// ============================================================================
// Agent Types
// ============================================================================

export interface AgentConfig {
  id: string;
  typeId: string;
  categoryId: string;

  // Model specification
  modelFamily: string;
  defaultParams: Record<string, unknown>;

  // SPORE Protocol
  inputTopics: string[];
  outputTopic: string;

  // Performance targets
  targetLatencyMs?: number;
  maxMemoryMB?: number;

  // Training requirements
  minExamples: number;
  requiresWorldModel: boolean;
}

export interface AgentState {
  id: string;
  typeId: string;

  // Model state
  modelHash?: string;
  parameterCount?: number;
  modelVersion: number;

  // Runtime state
  status: 'dormant' | 'active' | 'hibernating' | 'error';
  lastActive: number;

  // Value function (karmic record)
  valueFunction: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;

  // Derived metrics
  executionCount: number;
  successRate: number;
  active: boolean;

  // Internal state
  stateSnapshot?: Record<string, unknown>;
}

// ============================================================================
// Synaptic Types (Hebbian Learning)
// ============================================================================

export interface SynapseConfig {
  sourceAgentId: string;
  targetAgentId: string;

  // Hebbian Learning Parameters
  learningRate: number;      // η: 0.01 default
  decayRate: number;         // Weight decay: 0.001 default
  minWeight: number;         // Minimum weight: 0.01
  maxWeight: number;         // Maximum weight: 1.0
  rewardStrength: number;    // How reward affects weight: 0.1
}

export interface SynapseState {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;

  // Synaptic Weight
  weight: number;

  // Hebbian Learning Metrics
  coactivationCount: number;
  lastCoactivated: number;
}

// ============================================================================
// Plinko Decision Types
// ============================================================================

export interface Proposal {
  agentId: string;
  confidence: number;
  bid: number;
  explanation?: string;
}

export interface DiscriminatorResult {
  type: string;
  passed: boolean;
  score: number;
  reason?: string;
}

export interface PlinkoDecision {
  id: string;
  gardenerId: string;

  // Context
  contextHash?: string;
  domain?: string;
  sequenceId?: string;

  // Proposals
  proposalCount: number;
  proposals: Proposal[];

  // Discriminator Results
  discriminatorResults: DiscriminatorResult[];

  // Selection
  temperature: number;
  entropy?: number;
  selectedAgentId?: string;
  selectedConfidence?: number;
  selectionMethod: 'softmax' | 'argmax' | 'random';

  // Execution
  executedAt?: number;
  executionTimeMs?: number;

  // Outcome
  outcome: 'success' | 'failure' | 'pending' | 'cancelled';
  reward?: number;
  gardenerFeedback?: number;
  explanation?: string;

  // Safety
  wasOverridden: boolean;
  overrideReason?: string;

  timestamp: number;
}

// ============================================================================
// Embedding Types (BES)
// ============================================================================

export type EmbeddingVector = number[];

export interface EmbeddingMetadata {
  dimension: number;
  sourceLogCount: number;
  sourceLogIds: string[];
  agentTypes: string[];
  graphSnapshot?: Record<string, unknown>;
  baseModelHashes?: string[];

  // Performance
  usageCount: number;
  successRate: number;
  lastUsed?: number;

  // Cryptographic
  signature?: string;
  signedAt?: number;

  // Privacy
  isPrivate: boolean;
  differentialPrivacyEpsilon?: number;
  differentialPrivacyDelta?: number;
}

export interface PollenGrain {
  id: string;
  gardenerId: string;
  embedding: EmbeddingVector;
  metadata: EmbeddingMetadata;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Consensus Types
// ============================================================================

export enum ConsensusType {
  WEIGHTED_VOTING = 'WEIGHTED_VOTING',
  FAST_PATH = 'FAST_PATH',
  EMERGENCY = 'EMERGENCY',
  FULL_CONSENSUS = 'FULL_CONSENSUS'
}

export interface ConsensusVote {
  agentId: string;
  vote: boolean;
  weight: number;
  timestamp: number;
}

export interface ConsensusResult {
  type: ConsensusType;
  passed: boolean;
  votesFor: number;
  votesAgainst: number;
  totalWeight: number;
  quorumReached: boolean;
  decisionTime: number;
}

// ============================================================================
// Stigmergy Types
// ============================================================================

export interface PathwayState {
  sourceAgentId: string;
  targetAgentId: string;

  // Pheromone analog
  strength: number;      // 0-1 scale
  lastReinforced: number;

  // Decay tracking
  reinforcementCount: number;
  evaporationRate: number;  // 1% per timestep default
}

// ============================================================================
// Safety Types
// ============================================================================

export enum SafetySeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface SafetyConstraint {
  id: string;
  name: string;
  category: string;
  rule: string;
  ruleCode?: string;
  severity: SafetySeverity;
  isActive: boolean;
  cannotOverride: boolean;
}

export interface SafetyCheckResult {
  passed: boolean;
  constraintId: string;
  severity: SafetySeverity;
  message: string;
  overridePossible: boolean;
}

// ============================================================================
// Resource Allocation Types
// ============================================================================

export interface ResourceBudget {
  agentId: string;

  // Base allocation (minimum "blood flow")
  baseCompute: number;
  baseMemory: number;
  baseNetwork: number;

  // Discretionary budget
  discretionaryCompute: number;
  discretionaryMemory: number;
  discretionaryNetwork: number;

  // Fairness constraints
  minAllocation: number;
  maxAllocation: number;
}

export interface EligibilityTrace {
  agentId: string;
  actionId: string;

  // Trace for delayed reward credit assignment
  trace: number;
  timestamp: number;
  decayRate: number;
}

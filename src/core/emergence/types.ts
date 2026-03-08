/**
 * POLLN Emergence Detection Types
 *
 * Based on EMERGENT_GRANULAR_INTELLIGENCE research
 *
 * Emergence condition:
 * ∃E : ¬∃aᵢ ∈ A, capability(aᵢ) ⊢ E
 *   ∧ ∃path = (a₁, a₂, ..., aₖ) : compose(path) ⊢ E
 */

// ============================================================================
// CORE EMERGENCE TYPES
// ============================================================================

/**
 * Represents an emergent behavior discovered in the system
 */
export interface EmergentBehavior {
  id: string;
  name: string;
  description: string;

  // Discovery info
  discoveredAt: number;
  causalChainId: string;
  participatingAgents: string[];

  // Capabilities
  capabilities: string[];
  outcome: unknown;

  // Emergence metrics
  emergenceScore: number;     // 0-1, higher = more emergent
  noveltyFactors: NoveltyFactors;
  validationStatus: ValidationStatus;

  // Persistence
  lastSeen: number;
  occurrenceCount: number;
}

/**
 * Novelty factors for emergence
 */
export interface NoveltyFactors {
  novelOutcome: boolean;       // Outcome never seen before
  novelComposition: boolean;    // Agent composition never seen before
  novelAssembly: boolean;       // Capabilities never co-located before
  surprise: boolean;            // Not explicitly designed
}

/**
 * Validation status of emergent behavior
 */
export type ValidationStatus = 'candidate' | 'validated' | 'rejected';

/**
 * Time window for emergence detection
 */
export interface TimeWindow {
  start: number;
  end: number;
}

/**
 * Causal chain trace
 */
export interface CausalChain {
  id: string;
  packages: string[];          // A2A package IDs in order
  agents: string[];            // Agents that processed them
  capabilities: string[];      // Capabilities used
  outcome: unknown;
  timestamp: number;
}

// ============================================================================
// EMERGENCE METRICS
// ============================================================================

/**
 * Complexity metrics for emergence detection
 */
export interface ComplexityMetrics {
  graphEntropy: number;        // Entropy of agent interaction graph
  pathwayDiversity: number;    // Diversity of pathways used
  functionalCoupling: number;  // How coupled functions are
  structuralComplexity: number; // Complexity of graph structure
}

/**
 * Novelty metrics
 */
export interface NoveltyMetrics {
  outcomeNovelty: number;      // How novel is the outcome
  pathwayNovelty: number;      // How novel is the pathway
  compositionNovelty: number;  // How novel is agent composition
  temporalNovelty: number;     // How novel is timing/sequence
}

/**
 * Synergy metrics
 */
export interface SynergyMetrics {
  redundancy: number;          // Redundancy in information
  mutualInformation: number;   // MI between agents
  integration: number;         // Integration of information
  emergence: number;           // Emergence (whole > parts)
}

/**
 * Comprehensive emergence metrics
 */
export interface EmergenceMetrics {
  complexity: ComplexityMetrics;
  novelty: NoveltyMetrics;
  synergy: SynergyMetrics;
  overallScore: number;        // Combined emergence score
  timestamp: number;
}

// ============================================================================
// EMERGENCE ANALYSIS
// ============================================================================

/**
 * Result of emergence analysis
 */
export interface EmergenceAnalysis {
  behaviors: EmergentBehavior[];
  metrics: EmergenceMetrics;
  patterns: EmergentPattern[];
  recommendations: string[];
}

/**
 * Repeating pattern in emergent behaviors
 */
export interface EmergentPattern {
  id: string;
  name: string;
  frequency: number;
  agents: string[];
  capabilities: string[];
  averageOutcome: unknown;
  strength: number;
}

/**
 * Agent cluster with emergent properties
 */
export interface EmergentCluster {
  id: string;
  agents: string[];
  capabilities: string[];
  emergentAbilities: string[];
  cohesion: number;
  modularity: number;
  interpretation: string;
}

// ============================================================================
// EMERGENCE CATALOG
// ============================================================================

/**
 * Catalog entry for an emergent ability
 */
export interface EmergentAbility {
  id: string;
  name: string;
  description: string;

  // Classification
  category: EmergenceCategory;
  subcategory: string;

  // Discovery
  discoveredAt: number;
  discoveredBy: string;        // Agent or system that discovered it

  // Characterization
  capabilities: string[];
  agentComposition: string[];
  typicalPathway: string[];

  // Validation
  validationScore: number;     // 0-1 confidence
  validationHistory: ValidationRecord[];

  // Impact
  impactScore: number;         // 0-1 impact on system
  usageFrequency: number;
  lastUsed: number;

  // Documentation
  examples: EmergentExample[];
  references: string[];
}

/**
 * Categories of emergent abilities
 */
export enum EmergenceCategory {
  COMPOSITION = 'COMPOSITION',           // Novel combination of capabilities
  ADAPTATION = 'ADAPTATION',             // Adaptive behavior
  OPTIMIZATION = 'OPTIMIZATION',         // Self-optimization
  COLLABORATION = 'COLLABORATION',       // New collaboration patterns
  LEARNING = 'LEARNING',                 // New learning strategies
  COMMUNICATION = 'COMMUNICATION',       // New communication protocols
  PROBLEM_SOLVING = 'PROBLEM_SOLVING',   // Novel problem-solving
  CREATIVITY = 'CREATIVITY',             // Creative outputs
  SELF_AWARENESS = 'SELF_AWARENESS',     // Meta-cognitive abilities
  SOCIAL = 'SOCIAL',                     // Social behaviors
}

/**
 * Validation record for an emergent ability
 */
export interface ValidationRecord {
  timestamp: number;
  validator: string;
  result: 'passed' | 'failed' | 'inconclusive';
  notes: string;
}

/**
 * Example of emergent ability in action
 */
export interface EmergentExample {
  id: string;
  timestamp: number;
  context: string;
  input: unknown;
  output: unknown;
  agents: string[];
  outcome: string;
}

// ============================================================================
// EMERGENCE DETECTION CONFIG
// ============================================================================

export interface EmergenceDetectorConfig {
  // Detection settings
  analysisInterval: number;
  timeWindow: number;          // Window to analyze
  minEmergenceScore: number;   // Minimum score to consider emergent

  // Pattern recognition
  patternSimilarityThreshold: number;
  minPatternFrequency: number;

  // Metrics
  computeComplexity: boolean;
  computeNovelty: boolean;
  computeSynergy: boolean;

  // Catalog
  autoCatalog: boolean;
  catalogValidationThreshold: number;
}

// ============================================================================
// EMERGENCE EVENTS
// ============================================================================

export enum EmergenceEventType {
  BEHAVIOR_DISCOVERED = 'BEHAVIOR_DISCOVERED',
  BEHAVIOR_VALIDATED = 'BEHAVIOR_VALIDATED',
  BEHAVIOR_REJECTED = 'BEHAVIOR_REJECTED',
  PATTERN_DETECTED = 'PATTERN_DETECTED',
  CLUSTER_FORMED = 'CLUSTER_FORMED',
  ABILITY_CATALOGED = 'ABILITY_CATALOGED',
  METRICS_UPDATE = 'METRICS_UPDATE',
}

export interface EmergenceEvent {
  type: EmergenceEventType;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  data: Record<string, unknown>;
}

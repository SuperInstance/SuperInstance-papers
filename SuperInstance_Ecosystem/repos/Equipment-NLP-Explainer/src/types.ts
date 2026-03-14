/**
 * Types for NLP Explainer Equipment
 */

// ============================================
// Base Types (from @superinstance/starter-agent)
// ============================================

/**
 * Equipment slot types
 */
export type EquipmentSlot = 
  | 'DISTILLATION'
  | 'EXPLANATION'
  | 'MONITORING'
  | 'SCALING'
  | 'TEACHING'
  | 'ORCHESTRATION';

/**
 * Cost metrics for equipment
 */
export interface CostMetrics {
  memoryBytes: number;
  cpuPercent: number;
  latencyMs: number;
  costPerUse: number;
}

/**
 * Benefit metrics for equipment
 */
export interface BenefitMetrics {
  accuracyBoost: number;
  speedMultiplier: number;
  confidenceBoost: number;
  capabilityGain: string[];
}

/**
 * Trigger threshold for equipment activation
 */
export interface TriggerThreshold {
  metric: string;
  operator: '<' | '>' | '<=' | '>=' | '==' | '!=';
  value: number | boolean | string;
}

/**
 * Trigger thresholds configuration
 */
export interface TriggerThresholds {
  equipWhen: TriggerThreshold[];
  unequipWhen: TriggerThreshold[];
  callTeacher: { low: number; high: number };
}

/**
 * Tile type definition
 */
export interface TileType {
  type: string;
  properties?: Record<string, unknown>;
}

/**
 * Tile interface
 */
export interface Tile {
  inputType: TileType;
  outputType: TileType;
  compute: (input: unknown) => unknown;
  confidence: (input: unknown) => number;
  trace: (input: unknown) => string;
}

/**
 * Provenance chain for tracking origins
 */
export interface ProvenanceChain {
  originId: string;
  timestamp: number;
  transformations: Array<{
    type: string;
    description: string;
    timestamp: number;
  }>;
}

/**
 * Equipment interface
 */
export interface Equipment {
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly version: string;
  readonly description: string;
  readonly cost: CostMetrics;
  readonly benefit: BenefitMetrics;
  readonly triggerThresholds: TriggerThresholds;
  equip(agent: OriginCore): Promise<void>;
  unequip(agent: OriginCore): Promise<void>;
  describe(): EquipmentDescription;
  asTile(): Tile;
}

/**
 * Origin core interface (simplified)
 */
export interface OriginCore {
  id: string;
  name: string;
}

/**
 * Equipment description
 */
export interface EquipmentDescription {
  name: string;
  slot: EquipmentSlot;
  purpose: string;
  whenToUse: string[];
  whenToRemove: string[];
  dependencies: string[];
  conflicts: string[];
}

// ============================================
// Language Support Types
// ============================================

/**
 * Supported languages for NLP explanations
 */
export type SupportedLanguage = 'en' | 'es' | 'zh';

/**
 * Language-specific translation strings
 */
export interface TranslationStrings {
  /** Confidence level descriptors */
  confidenceLevels: {
    veryHigh: string;
    high: string;
    moderate: string;
    low: string;
    veryLow: string;
  };
  
  /** Logic type descriptions */
  logicTypes: {
    conditional: string;
    selection: string;
    ranking: string;
    filtering: string;
    aggregation: string;
    generation: string;
    verification: string;
  };
  
  /** Transformation type descriptions */
  transformationTypes: {
    map: string;
    filter: string;
    reduce: string;
    transform: string;
    compose: string;
    split: string;
    merge: string;
    extract: string;
  };
  
  /** Operator descriptions */
  operators: {
    equals: string;
    notEquals: string;
    lessThan: string;
    greaterThan: string;
    lessThanOrEqual: string;
    greaterThanOrEqual: string;
    contains: string;
    startsWith: string;
    endsWith: string;
    matches: string;
    in: string;
    notIn: string;
    exists: string;
    notExists: string;
  };
  
  /** Common phrases */
  phrases: {
    because: string;
    therefore: string;
    however: string;
    additionally: string;
    consequently: string;
    as_a_result: string;
    this_means_that: string;
    the_reason_is: string;
    based_on: string;
    taking_into_account: string;
  };
  
  /** Audit trail phrases */
  audit: {
    step_prefix: string;
    decision_made: string;
    input_received: string;
    output_generated: string;
    confidence_assessed: string;
    condition_evaluated: string;
    transformation_applied: string;
  };
}

// ============================================
// Logic Pattern Types
// ============================================

/**
 * Represents a logic pattern to be translated
 */
export interface LogicPattern {
  /** Pattern identifier */
  id: string;
  
  /** Pattern name */
  name: string;
  
  /** Pattern type */
  type: LogicPatternType;
  
  /** Pattern structure */
  structure: LogicStructure;
  
  /** Input values involved */
  inputs: PatternInput[];
  
  /** Output values produced */
  outputs: PatternOutput[];
  
  /** Conditions that were evaluated */
  conditions: EvaluatedCondition[];
  
  /** Transformations applied */
  transformations: AppliedTransformation[];
  
  /** Confidence score for this pattern */
  confidence: number;
  
  /** Source text or code */
  source?: string;
}

/**
 * Types of logic patterns
 */
export type LogicPatternType = 
  | 'decision'
  | 'transformation'
  | 'validation'
  | 'aggregation'
  | 'branching'
  | 'iteration'
  | 'composition'
  | 'fallback';

/**
 * Structure of a logic pattern
 */
export interface LogicStructure {
  /** Complexity level (1-5) */
  complexity: number;
  
  /** Number of steps involved */
  stepCount: number;
  
  /** Whether this is a nested pattern */
  isNested: boolean;
  
  /** Parent pattern ID if nested */
  parentPatternId?: string;
  
  /** Child pattern IDs if composite */
  childPatternIds?: string[];
  
  /** Branching factor */
  branchingFactor: number;
}

/**
 * Input for a pattern
 */
export interface PatternInput {
  /** Input identifier */
  id: string;
  
  /** Input name */
  name: string;
  
  /** Input value */
  value: unknown;
  
  /** Input type */
  type: string;
  
  /** Source description */
  source: string;
  
  /** Whether this input was used */
  wasUsed: boolean;
}

/**
 * Output from a pattern
 */
export interface PatternOutput {
  /** Output identifier */
  id: string;
  
  /** Output name */
  name: string;
  
  /** Output value */
  value: unknown;
  
  /** Output type */
  type: string;
  
  /** Whether this is the final output */
  isFinal: boolean;
}

/**
 * An evaluated condition
 */
export interface EvaluatedCondition {
  /** Condition identifier */
  id: string;
  
  /** Condition expression */
  expression: string;
  
  /** Left operand */
  left: string;
  
  /** Operator */
  operator: string;
  
  /** Right operand */
  right: string;
  
  /** Result of evaluation */
  result: boolean;
  
  /** Why this condition was evaluated this way */
  reasoning: string;
  
  /** Confidence in the evaluation */
  confidence: number;
}

/**
 * An applied transformation
 */
export interface AppliedTransformation {
  /** Transformation identifier */
  id: string;
  
  /** Transformation type */
  type: string;
  
  /** Description of the transformation */
  description: string;
  
  /** Input before transformation */
  inputBefore: unknown;
  
  /** Output after transformation */
  outputAfter: unknown;
  
  /** Why this transformation was applied */
  reasoning: string;
}

// ============================================
// Explanation Types
// ============================================

/**
 * A complete NLP explanation
 */
export interface NLPExplanation {
  /** Explanation identifier */
  id: string;
  
  /** Language of the explanation */
  language: SupportedLanguage;
  
  /** Main explanation text */
  summary: string;
  
  /** Detailed explanation */
  details: ExplanationDetails;
  
  /** Step-by-step breakdown */
  steps: ExplanationStep[];
  
  /** Reasoning chain */
  reasoningChain: ReasoningStep[];
  
  /** Confidence explanation */
  confidenceExplanation: ConfidenceExplanation;
  
  /** Audit trail in prose form */
  auditTrail: AuditTrailEntry[];
  
  /** Key insights */
  insights: string[];
  
  /** Related explanations */
  relatedExplanations: string[];
  
  /** Timestamp */
  timestamp: number;
}

/**
 * Detailed explanation sections
 */
export interface ExplanationDetails {
  /** What was done */
  what: string;
  
  /** Why it was done */
  why: string;
  
  /** How it was done */
  how: string;
  
  /** What inputs were used */
  inputs: string;
  
  /** What outputs were produced */
  outputs: string;
  
  /** Alternative paths considered */
  alternatives?: string;
}

/**
 * A single step in the explanation
 */
export interface ExplanationStep {
  /** Step number */
  stepNumber: number;
  
  /** Step description */
  description: string;
  
  /** Step type */
  type: 'input' | 'processing' | 'decision' | 'output' | 'validation';
  
  /** Step result */
  result: string;
  
  /** Why this step was taken */
  reasoning: string;
  
  /** Confidence for this step */
  confidence: number;
}

/**
 * A step in the reasoning chain
 */
export interface ReasoningStep {
  /** Step identifier */
  id: string;
  
  /** Step description */
  description: string;
  
  /** Premise */
  premise: string;
  
  /** Conclusion */
  conclusion: string;
  
  /** Evidence supporting this step */
  evidence: string[];
  
  /** Confidence in this reasoning */
  confidence: number;
  
  /** Next step ID */
  nextStepId?: string;
}

/**
 * Explanation of confidence score
 */
export interface ConfidenceExplanation {
  /** Raw confidence score */
  rawScore: number;
  
  /** Human-readable level */
  level: string;
  
  /** Description of what this confidence means */
  description: string;
  
  /** Factors that influenced confidence */
  factors: ConfidenceFactor[];
  
  /** How to interpret this confidence */
  interpretation: string;
}

/**
 * A factor influencing confidence
 */
export interface ConfidenceFactor {
  /** Factor name */
  name: string;
  
  /** Factor description */
  description: string;
  
  /** Impact on confidence (positive or negative) */
  impact: 'positive' | 'negative' | 'neutral';
  
  /** Magnitude of impact (0-1) */
  magnitude: number;
}

/**
 * An entry in the audit trail
 */
export interface AuditTrailEntry {
  /** Entry identifier */
  id: string;
  
  /** Timestamp */
  timestamp: number;
  
  /** Action performed */
  action: string;
  
  /** Actor (who/what performed the action) */
  actor: string;
  
  /** Description in prose */
  description: string;
  
  /** Result of the action */
  result: string;
  
  /** Confidence at this point */
  confidence: number;
  
  /** Related provenance */
  provenance?: ProvenanceChain;
}

// ============================================
// Explainer Options Types
// ============================================

/**
 * Options for NLP explanation generation
 */
export interface NLPExplainerOptions {
  /** Target language */
  language?: SupportedLanguage;
  
  /** Detail level */
  detailLevel?: 'brief' | 'normal' | 'detailed' | 'comprehensive';
  
  /** Include reasoning chain */
  includeReasoningChain?: boolean;
  
  /** Include audit trail */
  includeAuditTrail?: boolean;
  
  /** Include confidence explanation */
  includeConfidenceExplanation?: boolean;
  
  /** Maximum explanation length */
  maxLength?: number;
  
  /** Custom terminology overrides */
  customTerminology?: Record<string, string>;
  
  /** Target audience */
  targetAudience?: 'technical' | 'business' | 'general' | 'expert';
}

/**
 * Result of explaining a tile
 */
export interface TileExplanation {
  /** Tile identifier */
  tileId: string;
  
  /** Tile name */
  tileName: string;
  
  /** Explanation */
  explanation: NLPExplanation;
  
  /** Logic pattern extracted */
  pattern: LogicPattern;
}

/**
 * Result of explaining a decision
 */
export interface DecisionExplanation {
  /** Decision identifier */
  decisionId: string;
  
  /** The decision that was made */
  decision: string;
  
  /** Why this decision was made */
  reasoning: string;
  
  /** Alternatives considered */
  alternatives: Array<{
    description: string;
    whyRejected: string;
  }>;
  
  /** Confidence explanation */
  confidence: ConfidenceExplanation;
  
  /** Full explanation */
  fullExplanation: NLPExplanation;
}

/**
 * Result of explaining a reasoning chain
 */
export interface ChainExplanation {
  /** Chain identifier */
  chainId: string;
  
  /** Summary of the chain */
  summary: string;
  
  /** Individual steps */
  steps: ReasoningStep[];
  
  /** How steps connect */
  connections: Array<{
    fromStepId: string;
    toStepId: string;
    relationship: string;
  }>;
  
  /** Overall conclusion */
  conclusion: string;
  
  /** Full explanation */
  fullExplanation: NLPExplanation;
}

// ============================================
// Export types
// ============================================

/**
 * Extended Tile interface with NLP capabilities
 */
export interface NLPTile extends Tile {
  /** NLP explanation attached to this tile */
  nlpExplanation?: NLPExplanation;
  
  /** Logic patterns identified in this tile */
  logicPatterns?: LogicPattern[];
}

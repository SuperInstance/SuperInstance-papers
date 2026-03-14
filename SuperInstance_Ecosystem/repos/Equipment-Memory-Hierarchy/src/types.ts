/**
 * @fileoverview Type definitions for the Equipment-Memory-Hierarchy system
 * Implements a 4-tier cognitive memory architecture
 */

// ============================================================================
// Core Memory Types
// ============================================================================

/**
 * Memory tier levels in the cognitive hierarchy
 */
export enum MemoryTier {
  WORKING = 'working',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural'
}

/**
 * Base interface for all memory items
 */
export interface BaseMemoryItem {
  id: string;
  content: unknown;
  importance: number; // 0.0 to 1.0
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  tier: MemoryTier;
  tags: string[];
  metadata: Record<string, unknown>;
}

/**
 * Emotional context for memory items
 */
export interface EmotionalContext {
  valence: number; // -1 (negative) to 1 (positive)
  arousal: number; // 0 (calm) to 1 (excited)
  dominance: number; // 0 (submissive) to 1 (dominant)
  primaryEmotion?: string;
}

/**
 * Forgetting curve parameters (Ebbinghaus model)
 */
export interface ForgettingCurveParams {
  strength: number; // Initial memory strength (0-1)
  decayRate: number; // How fast the memory decays
  lastReinforcement: Date;
  reinforcementCount: number;
}

/**
 * Memory consolidation trigger
 */
export interface ConsolidationTrigger {
  type: 'access_frequency' | 'importance' | 'emotional_weight' | 'manual' | 'temporal';
  threshold: number;
  sourceTier: MemoryTier;
  targetTier: MemoryTier;
}

// ============================================================================
// Working Memory Types
// ============================================================================

/**
 * Working memory item - immediate context, limited capacity
 */
export interface WorkingMemoryItem extends BaseMemoryItem {
  tier: MemoryTier.WORKING;
  content: unknown;
  slot: number; // Position in limited capacity slots
  attentionWeight: number; // Current attention allocation
  decayRate: number; // Fast decay for working memory
  relatedItems: string[]; // IDs of related working memory items
}

/**
 * Working memory configuration
 */
export interface WorkingMemoryConfig {
  capacity: number; // Default: 7 (Miller's law: 7±2)
  decayInterval: number; // Milliseconds until decay check
  attentionThreshold: number; // Minimum attention to maintain
  autoConsolidate: boolean; // Auto-promote high-importance items
}

/**
 * Working memory state
 */
export interface WorkingMemoryState {
  items: Map<string, WorkingMemoryItem>;
  totalAttentionBudget: number;
  currentFocus: string | null; // Currently focused item ID
  context: Record<string, unknown>; // Current task context
}

// ============================================================================
// Episodic Memory Types
// ============================================================================

/**
 * Source tracking for episodic memories
 */
export interface MemorySource {
  type: 'perception' | 'action' | 'reasoning' | 'external' | 'internal';
  agentId?: string;
  sessionId?: string;
  context?: string;
}

/**
 * Temporal context for episodes
 */
export interface TemporalContext {
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  sequence: number; // Order in the episodic stream
  relatedEpisodes: string[]; // IDs of temporally related episodes
}

/**
 * Episodic memory item - events with temporal and emotional context
 */
export interface EpisodicMemoryItem extends BaseMemoryItem {
  tier: MemoryTier.EPISODIC;
  content: {
    event: string;
    details: Record<string, unknown>;
    participants?: string[];
    location?: string;
  };
  temporalContext: TemporalContext;
  emotionalContext: EmotionalContext;
  source: MemorySource;
  forgettingCurve: ForgettingCurveParams;
}

/**
 * Episodic memory configuration
 */
export interface EpisodicMemoryConfig {
  maxCapacity: number;
  consolidationThreshold: number; // Importance threshold for semantic promotion
  emotionalWeighting: boolean; // Consider emotional valence in retention
  temporalResolution: number; // Minimum time between distinct episodes (ms)
}

/**
 * Episode query parameters
 */
export interface EpisodeQuery {
  startTime?: Date;
  endTime?: Date;
  participants?: string[];
  location?: string;
  emotionalContext?: Partial<EmotionalContext>;
  minImportance?: number;
  tags?: string[];
  limit?: number;
}

// ============================================================================
// Semantic Memory Types
// ============================================================================

/**
 * Semantic relationship types
 */
export enum SemanticRelationType {
  IS_A = 'is_a',
  HAS_A = 'has_a',
  PART_OF = 'part_of',
  RELATED_TO = 'related_to',
  OPPOSITE_OF = 'opposite_of',
  CAUSES = 'causes',
  ENABLES = 'enables',
  PREVENTS = 'prevents'
}

/**
 * Semantic relationship between concepts
 */
export interface SemanticRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: SemanticRelationType;
  strength: number; // 0 to 1
  bidirectional: boolean;
  metadata: Record<string, unknown>;
}

/**
 * Semantic memory item - facts and concepts
 */
export interface SemanticMemoryItem extends BaseMemoryItem {
  tier: MemoryTier.SEMANTIC;
  content: {
    concept: string;
    definition?: string;
    attributes: Record<string, unknown>;
    examples?: string[];
    category?: string;
  };
  relationships: SemanticRelationship[];
  confidence: number; // How certain is this knowledge
  sourceEpisodes: string[]; // Episodes that contributed to this knowledge
  forgettingCurve: ForgettingCurveParams;
}

/**
 * Semantic memory configuration
 */
export interface SemanticMemoryConfig {
  maxConcepts: number;
  relationshipThreshold: number; // Minimum strength for relationship
  confidenceThreshold: number; // Minimum confidence to retain
  autoCategorize: boolean; // Auto-assign categories
}

/**
 * Semantic query parameters
 */
export interface SemanticQuery {
  concept?: string;
  category?: string;
  attributes?: Record<string, unknown>;
  minConfidence?: number;
  relatedTo?: string; // Find concepts related to this ID
  relationType?: SemanticRelationType;
  limit?: number;
}

// ============================================================================
// Procedural Memory Types
// ============================================================================

/**
 * Procedural skill status
 */
export enum SkillStatus {
  LEARNING = 'learning',
  PRACTICING = 'practicing',
  COMPETENT = 'competent',
  EXPERT = 'expert',
  AUTOMATIC = 'automatic'
}

/**
 * Trigger condition for automatic execution
 */
export interface ProceduralTrigger {
  id: string;
  condition: string; // Condition expression or pattern
  priority: number;
  cooldown: number; // Minimum time between triggers (ms)
  lastTriggered?: Date;
  triggerCount: number;
}

/**
 * Procedural step in a skill
 */
export interface ProceduralStep {
  order: number;
  action: string;
  parameters: Record<string, unknown>;
  conditions?: string[]; // Preconditions for this step
  successCriteria?: string; // How to verify success
  alternatives?: string[]; // Alternative actions if this fails
}

/**
 * Procedural memory item - skills and procedures
 */
export interface ProceduralMemoryItem extends BaseMemoryItem {
  tier: MemoryTier.PROCEDURAL;
  content: {
    skill: string;
    description: string;
    steps: ProceduralStep[];
    parameters: Record<string, unknown>;
    outcomes: Record<string, unknown>;
  };
  status: SkillStatus;
  triggers: ProceduralTrigger[];
  executionCount: number;
  successRate: number; // 0 to 1
  averageExecutionTime: number; // milliseconds
  lastExecutedAt?: Date;
  sourceEpisodes: string[]; // Episodes from which skill was learned
  forgettingCurve: ForgettingCurveParams;
}

/**
 * Procedural memory configuration
 */
export interface ProceduralMemoryConfig {
  maxSkills: number;
  autoExecution: boolean; // Allow automatic trigger execution
  learningThreshold: number; // Episodes needed to learn skill
  expertiseThreshold: number; // Executions needed for expertise
  forgettingThreshold: number; // Decay threshold for skill retention
}

/**
 * Skill execution result
 */
export interface SkillExecutionResult {
  skillId: string;
  success: boolean;
  executionTime: number;
  output?: unknown;
  error?: string;
  confidence: number;
}

// ============================================================================
// Memory Consolidation Types
// ============================================================================

/**
 * Consolidation result
 */
export interface ConsolidationResult {
  success: boolean;
  sourceTier: MemoryTier;
  targetTier: MemoryTier;
  itemId: string;
  newItemId?: string;
  reason: string;
  timestamp: Date;
}

/**
 * Consolidation policy
 */
export interface ConsolidationPolicy {
  workingToEpisodic: {
    accessThreshold: number;
    importanceThreshold: number;
    emotionalWeighting: boolean;
  };
  episodicToSemantic: {
    occurrenceThreshold: number; // Number of similar episodes
    importanceThreshold: number;
    confidenceWeighting: boolean;
  };
  semanticToProcedural: {
    applicationThreshold: number; // Times concept applied
    successThreshold: number;
    patternRecognition: boolean;
  };
  decayConfig: {
    workingDecayRate: number;
    episodicDecayRate: number;
    semanticDecayRate: number;
    proceduralDecayRate: number;
    reinforcementFactor: number; // Boost on reconsolidation
  };
}

/**
 * Memory statistics
 */
export interface MemoryStatistics {
  working: {
    itemCount: number;
    capacity: number;
    utilization: number;
    averageAge: number;
    averageAccessCount: number;
  };
  episodic: {
    itemCount: number;
    averageAge: number;
    averageImportance: number;
    averageRetention: number;
  };
  semantic: {
    conceptCount: number;
    relationshipCount: number;
    averageConfidence: number;
    categoryDistribution: Record<string, number>;
  };
  procedural: {
    skillCount: number;
    averageSuccessRate: number;
    expertLevelCount: number;
    automaticExecutionCount: number;
  };
  consolidation: {
    totalConsolidations: number;
    recentConsolidations: number;
    consolidationRate: number;
  };
}

// ============================================================================
// Hierarchical Memory Types
// ============================================================================

/**
 * Hierarchical memory configuration
 */
export interface HierarchicalMemoryConfig {
  working: WorkingMemoryConfig;
  episodic: EpisodicMemoryConfig;
  semantic: SemanticMemoryConfig;
  procedural: ProceduralMemoryConfig;
  consolidation: ConsolidationPolicy;
  enableAutoConsolidation: boolean;
  consolidationInterval: number; // milliseconds
  enableForgetting: boolean;
  forgettingCheckInterval: number; // milliseconds
}

/**
 * Memory search options
 */
export interface MemorySearchOptions {
  tiers?: MemoryTier[];
  query: string;
  minImportance?: number;
  maxAge?: number; // milliseconds
  tags?: string[];
  includeRelated?: boolean;
  limit?: number;
}

/**
 * Memory search result
 */
export interface MemorySearchResult {
  item: BaseMemoryItem;
  relevance: number; // 0 to 1
  tier: MemoryTier;
  highlights?: string[];
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Memory event types
 */
export enum MemoryEventType {
  ITEM_ADDED = 'item_added',
  ITEM_ACCESSED = 'item_accessed',
  ITEM_UPDATED = 'item_updated',
  ITEM_REMOVED = 'item_removed',
  CONSOLIDATION_STARTED = 'consolidation_started',
  CONSOLIDATION_COMPLETED = 'consolidation_completed',
  FORGETTING_TRIGGERED = 'forgetting_triggered',
  SKILL_EXECUTED = 'skill_executed',
  TRIGGER_ACTIVATED = 'trigger_activated'
}

/**
 * Memory event
 */
export interface MemoryEvent {
  type: MemoryEventType;
  timestamp: Date;
  tier: MemoryTier;
  itemId: string;
  data?: Record<string, unknown>;
}

/**
 * Memory event handler
 */
export type MemoryEventHandler = (event: MemoryEvent) => void | Promise<void>;

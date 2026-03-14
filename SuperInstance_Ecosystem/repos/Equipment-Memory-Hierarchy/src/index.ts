/**
 * @fileoverview Equipment-Memory-Hierarchy - 4-tier cognitive memory system
 * 
 * A comprehensive cognitive memory architecture implementing:
 * - Working Memory: Short-term, high-speed, limited capacity (7±2 items)
 * - Episodic Memory: Events with temporal and emotional context
 * - Semantic Memory: Facts, concepts, and their relationships
 * - Procedural Memory: Skills and procedures with automatic execution
 * 
 * @packageDocumentation
 */

// Main exports
export { HierarchicalMemory } from './HierarchicalMemory.js';
export { WorkingMemory } from './WorkingMemory.js';
export { EpisodicMemory } from './EpisodicMemory.js';
export { SemanticMemory } from './SemanticMemory.js';
export { ProceduralMemory } from './ProceduralMemory.js';
export { MemoryConsolidation } from './MemoryConsolidation.js';

// Type exports
export {
  // Enums
  MemoryTier,
  SemanticRelationType,
  SkillStatus,
  MemoryEventType,
  
  // Core types
  BaseMemoryItem,
  EmotionalContext,
  ForgettingCurveParams,
  ConsolidationTrigger,
  
  // Working Memory types
  WorkingMemoryItem,
  WorkingMemoryConfig,
  WorkingMemoryState,
  
  // Episodic Memory types
  MemorySource,
  TemporalContext,
  EpisodicMemoryItem,
  EpisodicMemoryConfig,
  EpisodeQuery,
  
  // Semantic Memory types
  SemanticRelationship,
  SemanticMemoryItem,
  SemanticMemoryConfig,
  SemanticQuery,
  
  // Procedural Memory types
  ProceduralTrigger,
  ProceduralStep,
  ProceduralMemoryItem,
  ProceduralMemoryConfig,
  SkillExecutionResult,
  
  // Consolidation types
  ConsolidationResult,
  ConsolidationPolicy,
  MemoryStatistics,
  
  // Hierarchical Memory types
  HierarchicalMemoryConfig,
  MemorySearchOptions,
  MemorySearchResult,
  
  // Event types
  MemoryEvent,
  MemoryEventHandler
} from './types.js';

// Default export
export { HierarchicalMemory as default } from './HierarchicalMemory.js';

/**
 * Equipment-Consensus-Engine
 * Multi-agent deliberation with Pathos/Logos/Ethos weighting
 * 
 * @packageDocumentation
 */

export {
  ConsensusEngine,
  type ConsensusEngineConfig,
  type ConsensusResult,
  type DeliberationInput,
  type PerspectiveOpinion,
  type DeliberationRound,
} from './ConsensusEngine';

export {
  TripartiteDeliberation,
  type TripartitePerspective,
  type PerspectiveType,
  type DeliberationContext,
  type PerspectiveAnalysis,
  type CrossExamination,
} from './TripartiteDeliberation';

export {
  WeightCalculator,
  type DomainType,
  type WeightProfile,
  type WeightAdjustmentRule,
  type DomainCharacteristics,
} from './WeightCalculator';

export {
  ConflictResolution,
  type ConflictType,
  type ConflictSeverity,
  type ResolutionStrategy,
  type ConflictRecord,
  type ResolutionResult,
  type MediationOutcome,
} from './ConflictResolution';

// Re-export commonly used types
export type {
  AuditEntry,
  ConsensusMetadata,
} from './ConsensusEngine';

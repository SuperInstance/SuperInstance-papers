/**
 * @superinstance/equipment-self-improvement
 * 
 * Self-modifying equipment that distills what agents need to know for stable tiling.
 * 
 * This equipment enables continuous self-improvement through:
 * - Performance monitoring and anomaly detection
 * - Knowledge distillation into stable patterns
 * - Tile structure optimization for stability
 * - Self-modification capabilities
 * - "Mature into cells" transformation
 */

// Main class
export { SelfImprovement } from './SelfImprovement';
export type {
  SelfImprovementConfig,
  SelfImprovementStatus,
  ImprovementCycleResult,
  MaturityMetrics,
  MaturationOptions,
  MaturationResult
} from './SelfImprovement';

// Performance Monitor
export { PerformanceMonitor } from './PerformanceMonitor';
export type {
  PerformanceMetric,
  MetricType,
  MetricThreshold,
  PerformanceSnapshot,
  MetricSummary,
  MetricTrend,
  PerformanceAnomaly,
  ImprovementOpportunity
} from './PerformanceMonitor';

// Knowledge Distiller
export { KnowledgeDistiller } from './KnowledgeDistiller';
export type {
  KnowledgePattern,
  PatternCategory,
  PatternCondition,
  PatternAction,
  PatternOutcome,
  DistillationResult,
  DistillationConfig,
  AgentObservation
} from './KnowledgeDistiller';

// Tile Optimizer
export { TileOptimizer } from './TileOptimizer';
export type {
  Tile,
  TileType,
  TileKnowledge,
  TileRule,
  TileExample,
  TileConstraint,
  TileMetadata,
  TileOptimizationResult,
  TileStabilityAnalysis,
  StabilityFactor,
  StabilityIssue,
  DeconstructionResult,
  TileCluster
} from './TileOptimizer';

// Self Modifier
export { SelfModifier } from './SelfModifier';
export type {
  Modification,
  ModificationType,
  ModificationTrigger,
  ModificationStatus,
  ModificationImpact,
  ModificationPolicy,
  ModificationProposal,
  ModificationResult,
  ValidationResult,
  SelfModificationConfig
} from './SelfModifier';

// Default export
export { SelfImprovement as default } from './SelfImprovement';

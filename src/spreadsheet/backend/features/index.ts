/**
 * Feature Flags and Experiments Module
 *
 * Complete feature flag and A/B testing system for the POLLN spreadsheet.
 */

export {
  FeatureFlagManager,
  FlagState,
  FlagType,
  type FlagDefinition,
  type FlagRule,
  type RuleCondition,
  type VariantConfig,
  type EvaluationContext,
  type EvaluationResult,
  type RolloutPlan,
  type RolloutStep,
  type FeatureFlagManagerOptions
} from './FeatureFlagManager.js';

export {
  FlagStorage,
  type FlagStorageConfig,
  type FlagStatistics,
  type FlagChangeEvent
} from './FlagStorage.js';

export {
  UserSegmenter,
  type Segment,
  type SegmentRule,
  type RuleCondition,
  type UserAttributes,
  type UserBehavior,
  type SegmentAssignment,
  type UserSegmenterOptions
} from './UserSegmenter.js';

export {
  ExperimentTracker,
  ExperimentState,
  type Experiment,
  type ExperimentVariant,
  type VariantAssignment,
  type ConversionEvent,
  type ExperimentResults,
  type VariantResult,
  type ExperimentTrackerOptions
} from './ExperimentTracker.js';

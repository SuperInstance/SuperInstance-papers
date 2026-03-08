/**
 * Colony Lifecycle Module
 * Colony lifecycle management (provisioning, decommissioning, migration, scaling)
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Provisioning
  ProvisioningConfig,
  ProvisioningRequest,
  ProvisioningResult,

  // Decommissioning
  DecommissioningConfig,
  DecommissioningPlan,
  DecommissioningStep,

  // Migration
  MigrationConfig,
  MigrationPlan,
  MigrationStep,
  MigrationIssue,
  MigrationState,
  RollbackPlan,

  // Scaling
  ScalingConfig,
  ScalingEvent,
  ScalingTrigger,
  ScalingConstraints,
  ScalingPlan,
  ScalingAction,
  ScalingMetrics,

  // Lifecycle State
  ColonyLifecycleState,
} from './types.js';

// ============================================================================
// CLASS EXPORTS
// ============================================================================

export { ColonyProvisioner } from './provisioning.js';
export { ColonyDecommissioner } from './decommissioning.js';
export { ColonyMigrator } from './migration.js';
export { ColonyScaler } from './scaling.js';

/**
 * Colony Lifecycle Types
 * Type definitions for colony lifecycle management
 */

import type { Colony, ColonyConfig } from '../colony.js';

// ============================================================================
// Provisioning
// ============================================================================

export interface ProvisioningConfig {
  strategy: 'immediate' | 'delayed' | 'scheduled';
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  validation: {
    checkResources: boolean;
    checkDependencies: boolean;
    runHealthCheck: boolean;
  };
}

export interface ProvisioningRequest {
  id: string;
  config: ColonyConfig;
  strategy: ProvisioningConfig['strategy'];
  scheduledTime?: number;
  priority: number;
  metadata: Record<string, unknown>;
}

export interface ProvisioningResult {
  success: boolean;
  colonyId?: string;
  error?: string;
  duration: number;
  timestamp: number;
}

// ============================================================================
// Decommissioning
// ============================================================================

export interface DecommissioningConfig {
  strategy: 'immediate' | 'graceful' | 'force';
  gracePeriod: number;
  drainTimeout: number;
  migrationPolicy: {
    enabled: boolean;
    targetColonies: string[];
    agentSelection: 'all' | 'selective';
  };
  dataPolicy: {
    backup: boolean;
    backupLocation?: string;
    cleanup: boolean;
  };
}

export interface DecommissioningPlan {
  colonyId: string;
  config: DecommissioningConfig;
  steps: DecommissioningStep[];
  estimatedDuration: number;
  rollbackPlan?: string;
}

export interface DecommissioningStep {
  name: string;
  description: string;
  action: () => Promise<void>;
  rollback?: () => Promise<void>;
  timeout: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
}

// ============================================================================
// Migration
// ============================================================================

export interface MigrationConfig {
  sourceColonyId: string;
  targetColonyId: string;
  agents: string[];
  strategy: 'live' | 'snapshot' | 'recreate';
  validation: boolean;
  rollbackOnFailure: boolean;
  timeout: number;
}

export interface MigrationPlan {
  id: string;
  config: MigrationConfig;
  state: MigrationState;
  steps: MigrationStep[];
  progress: number;
  startTime: number;
  estimatedCompletion: number;
  issues: MigrationIssue[];
  rollbackPlan?: RollbackPlan;
}

export type MigrationState =
  | 'pending'
  | 'validating'
  | 'preparing'
  | 'migrating'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'rolling_back'
  | 'rolled_back';

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  agentId?: string;
  action: () => Promise<void>;
  rollback?: () => Promise<void>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface MigrationIssue {
  severity: 'warning' | 'error' | 'critical';
  stepId?: string;
  agentId?: string;
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface RollbackPlan {
  steps: Array<{
    description: string;
    action: () => Promise<void>;
  }>;
  estimatedDuration: number;
}

// ============================================================================
// Scaling
// ============================================================================

export interface ScalingConfig {
  mode: 'manual' | 'auto';
  policy: ScalingPolicy;
  triggers: ScalingTrigger[];
  constraints: ScalingConstraints;
  cooldown: number;
}

export type ScalingPolicy =
  | 'horizontal'
  | 'vertical'
  | 'both';

export interface ScalingTrigger {
  type: 'cpu' | 'memory' | 'network' | 'queue_depth' | 'custom';
  threshold: number;
  direction: 'up' | 'down';
  comparison: 'greater_than' | 'less_than' | 'equals';
  duration: number;
}

export interface ScalingConstraints {
  minColonies: number;
  maxColonies: number;
  minResourcesPerColony: {
    compute: number;
    memory: number;
    network: number;
  };
  maxResourcesPerColony: {
    compute: number;
    memory: number;
    network: number;
  };
  maxTotalResources?: {
    compute: number;
    memory: number;
    network: number;
  };
}

export interface ScalingEvent {
  id: string;
  timestamp: number;
  colonyId?: string;
  type: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in';
  reason: string;
  metrics: ScalingMetrics;
  plan: ScalingPlan;
}

export interface ScalingMetrics {
  currentLoad: number;
  currentColonies: number;
  currentResources: {
    compute: number;
    memory: number;
    network: number;
  };
  targetLoad: number;
  targetColonies: number;
  targetResources: {
    compute: number;
    memory: number;
    network: number;
  };
}

export interface ScalingPlan {
  actions: ScalingAction[];
  estimatedDuration: number;
  estimatedCost?: number;
}

export interface ScalingAction {
  type: 'provision' | 'decommission' | 'resize';
  targetColonyId?: string;
  config?: Partial<ColonyConfig>;
  reason: string;
  priority: number;
}

// ============================================================================
// Lifecycle State
// ============================================================================

export interface ColonyLifecycleState {
  colonyId: string;
  provisioning: {
    status: 'not_provisioned' | 'provisioning' | 'provisioned' | 'failed';
    request?: ProvisioningRequest;
    result?: ProvisioningResult;
  };
  decommissioning: {
    status: 'active' | 'decommissioning' | 'decommissioned' | 'failed';
    plan?: DecommissioningPlan;
  };
  migrations: Map<string, MigrationPlan>;
  scaling: {
    enabled: boolean;
    config?: ScalingConfig;
    history: ScalingEvent[];
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: number;
    issues: string[];
  };
}

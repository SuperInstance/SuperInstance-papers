/**
 * Colony Manager Module
 * Multi-colony orchestration and management
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Manager
  ColonyManagerConfig,
  LoadBalancingStrategy,
  ScalingPolicy,

  // Colony Instance
  ColonyInstance,
  ColonyInstanceState,
  ColonyHealth,
  HealthIssue,
  ColonyResources,
  ResourceUsage,
  ColonySpecialization,
  ColonyMetadata,

  // Events
  OrchestrationEvent,
  OrchestrationEventType,

  // Scheduling
  WorkloadRequest,
  WorkloadRequirements,
  WorkloadConstraints,
  ScheduleResult,

  // Load Balancing
  LoadBalancingMetrics,
  LoadBalancingDecision,

  // Scaling
  ScalingEvent,
  ScalingMetrics,
  ScalingPolicyConfig,

  // Migration
  MigrationPlan,
  MigrationState,
  MigrationIssue,

  // Inter-Colony Communication
  InterColonyMessage,
  ColonyBridgeConfig,
  RetryPolicy,
  BroadcastConfig,
  ColonyFilter,

  // Gateway
  GatewayConfig,
  AuthConfig,
  RateLimitConfig,
  RoutingConfig,
  RoutingRule,

  // Role Registry
  ColonyRole,
  WorkloadType,
  RoleAssignment,

  // Manager State
  ColonyManagerState,
  ManagerMetrics,

  // Dashboard
  DashboardData,
  DashboardSummary,
  DashboardColony,
  DashboardTopology,
  TopologyNode,
  TopologyEdge,
  DashboardAlert,
  DashboardTrends,
  TrendDataPoint,
} from './types.js';

// ============================================================================
// CLASS EXPORTS
// ============================================================================

export { ColonyOrchestrator } from './orchestrator.js';
export { ColonyScheduler } from './scheduler.js';
export { ColonyLoadBalancer } from './load-balancer.js';
export { ResourceTracker } from './resource-tracker.js';
export { HealthMonitor, type HealthCheckConfig } from './health-monitor.js';

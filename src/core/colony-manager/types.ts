/**
 * Multi-Colony Orchestration Types
 * Type definitions for managing multiple colonies
 */

import type { Colony, ColonyConfig, ColonyStats } from '../colony.js';

// ============================================================================
// Colony Manager Configuration
// ============================================================================

export interface ColonyManagerConfig {
  id: string;
  maxColonies: number;
  resourceBudget: {
    totalCompute: number;
    totalMemory: number;
    totalNetwork: number;
  };
  scalingPolicy: ScalingPolicy;
  loadBalancingStrategy: LoadBalancingStrategy;
  healthCheckInterval: number;
  autoScalingEnabled: boolean;
}

export type LoadBalancingStrategy =
  | 'round_robin'
  | 'least_loaded'
  | 'weighted'
  | 'consistent_hash'
  | 'adaptive';

export type ScalingPolicy = 'manual' | 'auto_horizontal' | 'auto_vertical' | 'auto_both';

// ============================================================================
// Colony Instance
// ============================================================================

export interface ColonyInstance {
  id: string;
  colony: Colony;
  config: ColonyConfig;
  state: ColonyInstanceState;
  health: ColonyHealth;
  resources: ColonyResources;
  specialization?: ColonySpecialization;
  metadata: ColonyMetadata;
  createdAt: number;
  lastHealthCheck: number;
}

export type ColonyInstanceState =
  | 'provisioning'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'decommissioning'
  | 'error';

export interface ColonyHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  score: number; // 0-1
  issues: HealthIssue[];
  lastCheck: number;
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  message: string;
  timestamp: number;
}

export interface ColonyResources {
  compute: ResourceUsage;
  memory: ResourceUsage;
  network: ResourceUsage;
  storage?: ResourceUsage;
}

export interface ResourceUsage {
  total: number;
  used: number;
  available: number;
  utilization: number; // 0-1
}

export interface ColonySpecialization {
  domains: string[];
  capabilities: string[];
  agentTypes: string[];
  priority: number; // 0-1, higher = more preferred for domain
  workloadType: 'cpu_intensive' | 'memory_intensive' | 'io_intensive' | 'balanced';
}

export interface ColonyMetadata {
  name: string;
  description?: string;
  tags: string[];
  version: string;
  gardenerId: string;
  region?: string;
  zone?: string;
}

// ============================================================================
// Orchestration Events
// ============================================================================

export interface OrchestrationEvent {
  type: OrchestrationEventType;
  timestamp: number;
  colonyId?: string;
  data: unknown;
}

export type OrchestrationEventType =
  | 'colony_provisioned'
  | 'colony_started'
  | 'colony_stopped'
  | 'colony_decommissioned'
  | 'colony_error'
  | 'colony_scaled'
  | 'colony_migrated'
  | 'load_balanced'
  | 'health_check_failed'
  | 'resource_exhausted'
  | 'specialization_changed';

// ============================================================================
// Scheduling
// ============================================================================

export interface WorkloadRequest {
  id: string;
  type: string;
  requirements: WorkloadRequirements;
  constraints?: WorkloadConstraints;
  priority: number; // 0-1
  estimatedDuration: number; // ms
  payload: unknown;
}

export interface WorkloadRequirements {
  compute?: number;
  memory?: number;
  network?: number;
  storage?: number;
  agentTypes?: string[];
  capabilities?: string[];
  domains?: string[];
}

export interface WorkloadConstraints {
  maxLatency?: number;
  preferredColonies?: string[];
  excludedColonies?: string[];
  requireSpecialization?: string[];
  allowColocation?: boolean;
}

export interface ScheduleResult {
  colonyId: string;
  confidence: number; // 0-1
  reason: string;
  alternatives?: Array<{
    colonyId: string;
    confidence: number;
    reason: string;
  }>;
}

// ============================================================================
// Load Balancing
// ============================================================================

export interface LoadBalancingMetrics {
  colonyId: string;
  load: number; // 0-1
  capacity: number;
  queueDepth: number;
  avgResponseTime: number;
  errorRate: number;
  timestamp: number;
}

export interface LoadBalancingDecision {
  targetColonyId: string;
  strategy: LoadBalancingStrategy;
  reason: string;
  redistributeFrom?: string[]; // colonies to move work from
}

// ============================================================================
// Scaling
// ============================================================================

export interface ScalingEvent {
  timestamp: number;
  type: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in';
  colonyId?: string;
  fromState: ColonyInstanceState;
  toState: ColonyInstanceState;
  reason: string;
  metrics: ScalingMetrics;
}

export interface ScalingMetrics {
  currentLoad: number;
  threshold: number;
  targetCapacity: number;
  estimatedCost: number;
}

export interface ScalingPolicyConfig {
  scaleUpThreshold: number; // 0-1
  scaleDownThreshold: number; // 0-1
  minColonies: number;
  maxColonies: number;
  cooldownPeriod: number; // ms
  targetUtilization: number; // 0-1
}

// ============================================================================
// Migration
// ============================================================================

export interface MigrationPlan {
  id: string;
  sourceColonyId: string;
  targetColonyId: string;
  agents: string[];
  state: MigrationState;
  progress: number; // 0-1
  startTime: number;
  estimatedCompletion: number;
  issues: MigrationIssue[];
}

export type MigrationState =
  | 'pending'
  | 'validating'
  | 'migrating'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'rolled_back';

export interface MigrationIssue {
  severity: 'warning' | 'error';
  agentId?: string;
  message: string;
  timestamp: number;
}

// ============================================================================
// Inter-Colony Communication
// ============================================================================

export interface InterColonyMessage {
  id: string;
  timestamp: number;
  sourceColonyId: string;
  targetColonyId: string;
  type: string;
  payload: unknown;
  priority: number; // 0-1
  requiresAck: boolean;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface ColonyBridgeConfig {
  sourceColonyId: string;
  targetColonyId: string;
  protocol: 'direct' | 'message_queue' | 'pubsub' | 'federation';
  bufferSize: number;
  retryPolicy: RetryPolicy;
  compression: boolean;
  encryption: boolean;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs: number;
  exponentialBackoff: boolean;
}

export interface BroadcastConfig {
  targetColonies: string[]; // empty = all
  filter?: ColonyFilter;
  priority: number;
  timeout?: number;
  requireAck: boolean;
}

export interface ColonyFilter {
  states?: ColonyInstanceState[];
  specializations?: string[];
  tags?: string[];
  minHealthScore?: number;
}

// ============================================================================
// Gateway
// ============================================================================

export interface GatewayConfig {
  id: string;
  colonies: string[];
  publicEndpoint?: string;
  authentication: AuthConfig;
  rateLimit: RateLimitConfig;
  routing: RoutingConfig;
}

export interface AuthConfig {
  enabled: boolean;
  type: 'jwt' | 'api_key' | 'oauth' | 'none';
  secret?: string;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  burstSize: number;
}

export interface RoutingConfig {
  strategy: 'path_based' | 'header_based' | 'weight_based' | 'specialization_based';
  rules: RoutingRule[];
}

export interface RoutingRule {
  pattern: string;
  targetColonyId?: string;
  targetSpecialization?: string;
  weight?: number;
  priority: number;
}

// ============================================================================
// Role Registry
// ============================================================================

export interface ColonyRole {
  id: string;
  name: string;
  description: string;
  specializations: ColonySpecialization[];
  requiredCapabilities: string[];
  workloadType: WorkloadType;
  scalingPolicy: ScalingPolicyConfig;
  priority: number;
}

export type WorkloadType =
  | 'general'
  | 'compute'
  | 'memory'
  | 'io'
  | 'ml_training'
  | 'ml_inference'
  | 'batch'
  | 'streaming'
  | 'interactive';

export interface RoleAssignment {
  colonyId: string;
  roleId: string;
  assignedAt: number;
  performanceMetrics: {
    successRate: number;
    avgLatency: number;
    throughput: number;
  };
}

// ============================================================================
// Manager State
// ============================================================================

export interface ColonyManagerState {
  colonies: Map<string, ColonyInstance>;
  roles: Map<string, ColonyRole>;
  assignments: Map<string, RoleAssignment>;
  metrics: ManagerMetrics;
  config: ColonyManagerConfig;
}

export interface ManagerMetrics {
  totalColonies: number;
  activeColonies: number;
  totalAgents: number;
  totalCompute: number;
  totalMemory: number;
  avgHealthScore: number;
  avgUtilization: number;
  requestsProcessed: number;
  errors: number;
  uptime: number;
}

// ============================================================================
// Dashboard Data
// ============================================================================

export interface DashboardData {
  summary: DashboardSummary;
  colonies: DashboardColony[];
  topology: DashboardTopology;
  alerts: DashboardAlert[];
  trends: DashboardTrends;
}

export interface DashboardSummary {
  totalColonies: number;
  healthyColonies: number;
  totalAgents: number;
  totalThroughput: number;
  avgLatency: number;
  errorRate: number;
  utilization: {
    compute: number;
    memory: number;
    network: number;
  };
}

export interface DashboardColony {
  id: string;
  name: string;
  state: ColonyInstanceState;
  health: ColonyHealth;
  resources: ColonyResources;
  specialization?: ColonySpecialization;
  agentCount: number;
  throughput: number;
  avgLatency: number;
  errorRate: number;
}

export interface DashboardTopology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface TopologyNode {
  id: string;
  type: 'colony' | 'gateway' | 'service';
  label: string;
  state: ColonyInstanceState;
  health: number;
}

export interface TopologyEdge {
  source: string;
  target: string;
  type: 'bridge' | 'federation' | 'routing';
  weight: number;
}

export interface DashboardAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  colonyId?: string;
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface DashboardTrends {
  utilization: TrendDataPoint[];
  throughput: TrendDataPoint[];
  latency: TrendDataPoint[];
  errors: TrendDataPoint[];
}

export interface TrendDataPoint {
  timestamp: number;
  value: number;
}

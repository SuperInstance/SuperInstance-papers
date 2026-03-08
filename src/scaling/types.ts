/**
 * POLLN Scaling Types
 *
 * Core types for auto-scaling framework
 */

/**
 * Scaling direction
 */
export enum ScalingDirection {
  UP = 'up',
  DOWN = 'down',
  NONE = 'none',
}

/**
 * Scaling action types
 */
export enum ScalingActionType {
  // Horizontal scaling
  SPAWN_AGENTS = 'spawn_agents',
  DESPAWN_AGENTS = 'despawn_agents',
  // Vertical scaling
  INCREASE_CAPACITY = 'increase_capacity',
  DECREASE_CAPACITY = 'decrease_capacity',
  // Cache scaling
  EXPAND_KV_CACHE = 'expand_kv_cache',
  SHRINK_KV_CACHE = 'shrink_kv_cache',
  // Resource scaling
  ALLOCATE_MEMORY = 'allocate_memory',
  RELEASE_MEMORY = 'release_memory',
  // Network scaling
  ADD_NODE = 'add_node',
  REMOVE_NODE = 'remove_node',
}

/**
 * Resource metrics
 */
export interface ResourceMetrics {
  // Compute resources
  cpu: {
    usage: number; // 0-100
    available: number;
    total: number;
  };
  // Memory resources
  memory: {
    usage: number; // 0-100
    used: number; // bytes
    total: number; // bytes
    heapUsed: number;
    heapTotal: number;
  };
  // Network resources
  network: {
    requestRate: number; // requests per minute
    bandwidth: number; // bytes per second
    connections: number;
  };
  // Agent metrics
  agents: {
    total: number;
    active: number;
    dormant: number;
    spawning: number;
    terminating: number;
  };
  // Task metrics
  tasks: {
    queueDepth: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    averageLatency: number; // milliseconds
  };
  // KV-cache metrics
  kvCache?: {
    anchorCount: number;
    totalSize: number; // bytes
    hitRate: number; // 0-1
    compressionRatio: number;
  };
  // Distributed metrics
  distributed?: {
    nodeCount: number;
    activeNodes: number;
    averageLoad: number;
    syncLatency: number;
  };
}

/**
 * Scaling trigger condition
 */
export interface ScalingTrigger {
  id: string;
  name: string;
  description: string;
  metric: keyof ResourceMetrics;
  condition: 'greater_than' | 'less_than' | 'equals' | 'between';
  threshold: number | [number, number];
  duration: number; // milliseconds - condition must hold for this long
  cooldown: number; // milliseconds - minimum time between triggers
  lastTriggered?: number; // timestamp
}

/**
 * Scaling action definition
 */
export interface ScalingAction {
  id: string;
  type: ScalingActionType;
  direction: ScalingDirection;
  magnitude: number; // e.g., number of agents to spawn
  params: Record<string, unknown>;
  priority: number; // 1-10, higher = more important
  estimatedDuration: number; // milliseconds
  estimatedCost?: number; // monetary cost
}

/**
 * Scaling policy
 */
export interface ScalingPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  strategy: ScalingStrategy;
  triggers: ScalingTrigger[];
  actions: ScalingAction[];
  constraints: ScalingConstraints;
  maxScaleUp: number; // max agents to add per cycle
  maxScaleDown: number; // max agents to remove per cycle
  cooldown: number; // milliseconds between scaling actions
  lastAction?: number;
  effectiveness?: number; // 0-1, measured over time
}

/**
 * Scaling strategy types
 */
export enum ScalingStrategy {
  REACTIVE = 'reactive', // Threshold-based
  PROACTIVE = 'proactive', // Scheduled
  PREDICTIVE = 'predictive', // ML-based
  COST_OPTIMIZED = 'cost_optimized', // Cost-aware
  HYBRID = 'hybrid', // Combination
}

/**
 * Scaling constraints
 */
export interface ScalingConstraints {
  minAgents: number;
  maxAgents: number;
  minMemory: number; // bytes
  maxMemory: number; // bytes
  minKVCache: number; // bytes
  maxKVCache: number; // bytes
  minNodes?: number;
  maxNodes?: number;
  maxCostPerHour?: number; // monetary
  targetUtilization: number; // 0-100
  scaleUpLimit?: number; // max agents per hour
  scaleDownLimit?: number; // max agents per hour
}

/**
 * Scaling decision
 */
export interface ScalingDecision {
  id: string;
  policyId: string;
  timestamp: number;
  metrics: ResourceMetrics;
  triggeredTriggers: string[];
  actions: ScalingAction[];
  reason: string;
  confidence: number; // 0-1
  estimatedImpact: {
    resourceChange: ResourceMetrics;
    cost: number;
    duration: number;
  };
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: {
    success: boolean;
    actualImpact: ResourceMetrics;
    error?: string;
  };
}

/**
 * Scaling event
 */
export interface ScalingEvent {
  id: string;
  type: 'scale_up' | 'scale_down' | 'scale_failed' | 'policy_changed';
  timestamp: number;
  policyId: string;
  decision: ScalingDecision;
  previousState: ResourceMetrics;
  newState: ResourceMetrics;
  metadata: Record<string, unknown>;
}

/**
 * Scaling prediction
 */
export interface ScalingPrediction {
  timestamp: number;
  predictionHorizon: number; // milliseconds
  predictedMetrics: ResourceMetrics;
  recommendedAction: ScalingAction | null;
  confidence: number; // 0-1
  model: string;
  features: Record<string, number>;
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

/**
 * Scaling statistics
 */
export interface ScalingStats {
  totalScalingEvents: number;
  scaleUpEvents: number;
  scaleDownEvents: number;
  failedEvents: number;
  averageResponseTime: number; // milliseconds
  averageScaleTime: number; // milliseconds
  policyEffectiveness: Map<string, number>;
  costEfficiency: number; // cost per unit of work
  uptime: number; // percentage
  slaBreachCount: number;
}

/**
 * Resource allocation
 */
export interface ResourceAllocation {
  agentId: string;
  cpu: number; // percentage
  memory: number; // bytes
  kvCache?: number; // bytes
  priority: number; // 1-10
  expiresAt?: number;
}

/**
 * Load balancing strategy
 */
export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_LOADED = 'least_loaded',
  RANDOM = 'random',
  CONSISTENT_HASH = 'consistent_hash',
  WEIGHTED = 'weighted',
}

/**
 * Throttling config
 */
export interface ThrottlingConfig {
  enabled: boolean;
  maxRequestsPerSecond: number;
  maxConcurrentRequests: number;
  queueSize: number;
  timeout: number; // milliseconds
  priorityLevels: number;
}

/**
 * Scaling manager config
 */
export interface ScalingManagerConfig {
  evaluationInterval: number; // milliseconds
  predictionHorizon: number; // milliseconds
  historyRetention: number; // milliseconds
  maxConcurrentActions: number;
  dryRun: boolean;
  enablePredictive: boolean;
  enableCostOptimization: boolean;
  alertThresholds: {
    warning: number;
    critical: number;
  };
}

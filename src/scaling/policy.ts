/**
 * POLLN Scaling Policy Definitions
 *
 * Predefined scaling policies for common scenarios
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ScalingPolicy,
  ScalingTrigger,
  ScalingAction,
  ScalingConstraints,
  ScalingStrategy,
} from './types.js';
import {
  ScalingActionType,
  ScalingDirection,
} from './types.js';

/**
 * Default scaling constraints
 */
export const DEFAULT_CONSTRAINTS: ScalingConstraints = {
  minAgents: 1,
  maxAgents: 1000,
  minMemory: 1024 * 1024 * 1024, // 1GB
  maxMemory: 1024 * 1024 * 1024 * 100, // 100GB
  minKVCache: 1024 * 1024 * 100, // 100MB
  maxKVCache: 1024 * 1024 * 1024 * 10, // 10GB
  minNodes: 1,
  maxNodes: 10,
  maxCostPerHour: 10,
  targetUtilization: 70,
  scaleUpLimit: 100,
  scaleDownLimit: 50,
};

/**
 * Create CPU-based scaling trigger
 */
export function createCPUTrigger(
  threshold: number,
  duration: number = 120000
): ScalingTrigger {
  return {
    id: uuidv4(),
    name: `CPU ${threshold}%`,
    description: `CPU usage ${threshold}% for ${duration}ms`,
    metric: 'cpu',
    condition: 'greater_than',
    threshold,
    duration,
    cooldown: 300000, // 5 minutes
  };
}

/**
 * Create memory-based scaling trigger
 */
export function createMemoryTrigger(
  threshold: number,
  duration: number = 120000
): ScalingTrigger {
  return {
    id: uuidv4(),
    name: `Memory ${threshold}%`,
    description: `Memory usage ${threshold}% for ${duration}ms`,
    metric: 'memory',
    condition: 'greater_than',
    threshold,
    duration,
    cooldown: 300000,
  };
}

/**
 * Create queue depth trigger
 */
export function createQueueDepthTrigger(
  threshold: number,
  duration: number = 60000
): ScalingTrigger {
  return {
    id: uuidv4(),
    name: `Queue Depth ${threshold}`,
    description: `Queue depth ${threshold} for ${duration}ms`,
    metric: 'tasks',
    condition: 'greater_than',
    threshold,
    duration,
    cooldown: 180000, // 3 minutes
  };
}

/**
 * Create request rate trigger
 */
export function createRequestRateTrigger(
  threshold: number,
  duration: number = 60000
): ScalingTrigger {
  return {
    id: uuidv4(),
    name: `Request Rate ${threshold}/min`,
    description: `Request rate ${threshold}/min for ${duration}ms`,
    metric: 'network',
    condition: 'greater_than',
    threshold,
    duration,
    cooldown: 180000,
  };
}

/**
 * Horizontal scale up policy (CPU-based)
 */
export function createHorizontalScaleUpPolicy(
  cpuThreshold: number = 70,
  agentsToSpawn: number = 10
): ScalingPolicy {
  return {
    id: uuidv4(),
    name: 'Horizontal Scale Up (CPU)',
    description: 'Spawn more agents when CPU is high',
    enabled: true,
    strategy: 'reactive' as ScalingStrategy,
    triggers: [createCPUTrigger(cpuThreshold)],
    actions: [
      {
        id: uuidv4(),
        type: ScalingActionType.SPAWN_AGENTS,
        direction: ScalingDirection.UP,
        magnitude: agentsToSpawn,
        params: { agentType: 'task' },
        priority: 7,
        estimatedDuration: 30000,
        estimatedCost: 0.05,
      },
    ],
    constraints: DEFAULT_CONSTRAINTS,
    maxScaleUp: 50,
    maxScaleDown: 0,
    cooldown: 300000,
  };
}

/**
 * Horizontal scale down policy (CPU-based)
 */
export function createHorizontalScaleDownPolicy(
  cpuThreshold: number = 30,
  agentsToRemove: number = 5
): ScalingPolicy {
  return {
    id: uuidv4(),
    name: 'Horizontal Scale Down (CPU)',
    description: 'Remove agents when CPU is low',
    enabled: true,
    strategy: 'reactive' as ScalingStrategy,
    triggers: [
      {
        id: uuidv4(),
        name: `CPU Below ${cpuThreshold}%`,
        description: `CPU usage below ${cpuThreshold}% for 10 minutes`,
        metric: 'cpu',
        condition: 'less_than',
        threshold: cpuThreshold,
        duration: 600000, // 10 minutes
        cooldown: 600000,
      },
    ],
    actions: [
      {
        id: uuidv4(),
        type: ScalingActionType.DESPAWN_AGENTS,
        direction: ScalingDirection.DOWN,
        magnitude: agentsToRemove,
        params: { agentType: 'task', priority: 'lowest' },
        priority: 3,
        estimatedDuration: 10000,
        estimatedCost: 0,
      },
    ],
    constraints: DEFAULT_CONSTRAINTS,
    maxScaleUp: 0,
    maxScaleDown: 20,
    cooldown: 600000,
  };
}

/**
 * Memory-based scaling policy
 */
export function createMemoryScalingPolicy(
  memoryThreshold: number = 80
): ScalingPolicy {
  return {
    id: uuidv4(),
    name: 'Memory-based Scaling',
    description: 'Scale based on memory usage',
    enabled: true,
    strategy: 'reactive' as ScalingStrategy,
    triggers: [createMemoryTrigger(memoryThreshold)],
    actions: [
      {
        id: uuidv4(),
        type: ScalingActionType.SPAWN_AGENTS,
        direction: ScalingDirection.UP,
        magnitude: 5,
        params: { agentType: 'task' },
        priority: 6,
        estimatedDuration: 30000,
        estimatedCost: 0.03,
      },
    ],
    constraints: DEFAULT_CONSTRAINTS,
    maxScaleUp: 20,
    maxScaleDown: 0,
    cooldown: 300000,
  };
}

/**
 * Queue-based scaling policy
 */
export function createQueueScalingPolicy(
  queueThreshold: number = 100,
  agentsToSpawn: number = 20
): ScalingPolicy {
  return {
    id: uuidv4(),
    name: 'Queue-based Scaling',
    description: 'Scale based on task queue depth',
    enabled: true,
    strategy: 'reactive' as ScalingStrategy,
    triggers: [createQueueDepthTrigger(queueThreshold)],
    actions: [
      {
        id: uuidv4(),
        type: ScalingActionType.SPAWN_AGENTS,
        direction: ScalingDirection.UP,
        magnitude: agentsToSpawn,
        params: { agentType: 'task' },
        priority: 8,
        estimatedDuration: 30000,
        estimatedCost: 0.1,
      },
    ],
    constraints: DEFAULT_CONSTRAINTS,
    maxScaleUp: 100,
    maxScaleDown: 0,
    cooldown: 120000, // 2 minutes
  };
}

/**
 * Request rate scaling policy
 */
export function createRequestRatePolicy(
  requestsPerMinute: number = 1000
): ScalingPolicy {
  return {
    id: uuidv4(),
    name: 'Request Rate Scaling',
    description: 'Scale based on request rate',
    enabled: true,
    strategy: 'reactive' as ScalingStrategy,
    triggers: [createRequestRateTrigger(requestsPerMinute)],
    actions: [
      {
        id: uuidv4(),
        type: ScalingActionType.SPAWN_AGENTS,
        direction: ScalingDirection.UP,
        magnitude: 15,
        params: { agentType: 'task' },
        priority: 9,
        estimatedDuration: 30000,
        estimatedCost: 0.08,
      },
    ],
    constraints: DEFAULT_CONSTRAINTS,
    maxScaleUp: 50,
    maxScaleDown: 0,
    cooldown: 180000,
  };
}

/**
 * KV-cache scaling policy
 */
export function createKVCacheScalingPolicy(): ScalingPolicy {
  return {
    id: uuidv4(),
    name: 'KV-Cache Scaling',
    description: 'Adjust KV-cache size based on hit rate',
    enabled: true,
    strategy: 'reactive' as ScalingStrategy,
    triggers: [
      {
        id: uuidv4(),
        name: 'KV Cache Hit Rate Low',
        description: 'KV-cache hit rate below 50%',
        metric: 'kvCache',
        condition: 'less_than',
        threshold: 0.5,
        duration: 120000,
        cooldown: 600000,
      },
    ],
    actions: [
      {
        id: uuidv4(),
        type: ScalingActionType.EXPAND_KV_CACHE,
        direction: ScalingDirection.UP,
        magnitude: 1024 * 1024 * 100, // 100MB
        params: {},
        priority: 5,
        estimatedDuration: 5000,
        estimatedCost: 0.01,
      },
    ],
    constraints: DEFAULT_CONSTRAINTS,
    maxScaleUp: 1024 * 1024 * 1024, // 1GB
    maxScaleDown: 1024 * 1024 * 500, // 500MB
    cooldown: 600000,
  };
}

/**
 * Proactive time-based policy
 */
export function createProactivePolicy(
  hours: number[],
  agentsToSpawn: number
): ScalingPolicy {
  return {
    id: uuidv4(),
    name: `Proactive Scaling (${hours.join(', ')}h)`,
    description: 'Pre-emptive scaling at specific hours',
    enabled: true,
    strategy: 'proactive' as ScalingStrategy,
    triggers: [],
    actions: [
      {
        id: uuidv4(),
        type: ScalingActionType.SPAWN_AGENTS,
        direction: ScalingDirection.UP,
        magnitude: agentsToSpawn,
        params: { agentType: 'task' },
        priority: 6,
        estimatedDuration: 30000,
        estimatedCost: 0.05,
      },
    ],
    constraints: DEFAULT_CONSTRAINTS,
    maxScaleUp: 100,
    maxScaleDown: 0,
    cooldown: 3600000, // 1 hour
  };
}

/**
 * Predictive scaling policy
 */
export function createPredictivePolicy(): ScalingPolicy {
  return {
    id: uuidv4(),
    name: 'Predictive Scaling',
    description: 'ML-based predictive scaling',
    enabled: true,
    strategy: 'predictive' as ScalingStrategy,
    triggers: [],
    actions: [],
    constraints: DEFAULT_CONSTRAINTS,
    maxScaleUp: 50,
    maxScaleDown: 20,
    cooldown: 240000, // 4 minutes
  };
}

/**
 * Cost-optimized policy
 */
export function createCostOptimizedPolicy(
  maxCostPerHour: number = 5
): ScalingPolicy {
  return {
    id: uuidv4(),
    name: 'Cost-Optimized Scaling',
    description: 'Scale while minimizing cost',
    enabled: true,
    strategy: 'cost_optimized' as ScalingStrategy,
    triggers: [createCPUTrigger(75), createQueueDepthTrigger(50)],
    actions: [
      {
        id: uuidv4(),
        type: ScalingActionType.SPAWN_AGENTS,
        direction: ScalingDirection.UP,
        magnitude: 5, // Conservative
        params: { agentType: 'task' },
        priority: 5,
        estimatedDuration: 30000,
        estimatedCost: 0.02,
      },
    ],
    constraints: {
      ...DEFAULT_CONSTRAINTS,
      maxCostPerHour,
    },
    maxScaleUp: 20,
    maxScaleDown: 10,
    cooldown: 600000, // 10 minutes - slower scaling
  };
}

/**
 * Aggressive scaling policy (for emergencies)
 */
export function createAggressivePolicy(): ScalingPolicy {
  return {
    id: uuidv4(),
    name: 'Aggressive Scaling',
    description: 'Fast scaling for emergency situations',
    enabled: false, // Disabled by default
    strategy: 'reactive' as ScalingStrategy,
    triggers: [
      createCPUTrigger(90),
      createMemoryTrigger(90),
      createQueueDepthTrigger(200),
    ],
    actions: [
      {
        id: uuidv4(),
        type: ScalingActionType.SPAWN_AGENTS,
        direction: ScalingDirection.UP,
        magnitude: 50,
        params: { agentType: 'task' },
        priority: 10,
        estimatedDuration: 20000,
        estimatedCost: 0.2,
      },
    ],
    constraints: DEFAULT_CONSTRAINTS,
    maxScaleUp: 100,
    maxScaleDown: 0,
    cooldown: 60000, // 1 minute - fast reaction
  };
}

/**
 * Get all default policies
 */
export function getDefaultPolicies(): ScalingPolicy[] {
  return [
    createHorizontalScaleUpPolicy(),
    createHorizontalScaleDownPolicy(),
    createMemoryScalingPolicy(),
    createQueueScalingPolicy(),
    createRequestRatePolicy(),
    createKVCacheScalingPolicy(),
    createProactivePolicy([9, 14, 20], 20), // 9am, 2pm, 8pm
    createCostOptimizedPolicy(),
    createAggressivePolicy(),
  ];
}

/**
 * Get policy by name
 */
export function getPolicyByName(name: string): ScalingPolicy | undefined {
  return getDefaultPolicies().find((p) => p.name === name);
}

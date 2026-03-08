/**
 * POLLN Scaling Framework
 *
 * Main entry point for scaling functionality
 */

// Types
export * from './types.js';

// Core components
export { ScalingManager } from './manager.js';
export { ScalingActionExecutor, createDefaultExecutorConfig } from './executor.js';
export { ResourceAllocator } from './allocator.js';
export { AgentScheduler } from './scheduler.js';
export { LoadBalancer } from './balancer.js';
export { RequestThrottler, createDefaultThrottlingConfig } from './throttler.js';

// Policies
export {
  DEFAULT_CONSTRAINTS,
  createCPUTrigger,
  createMemoryTrigger,
  createQueueDepthTrigger,
  createRequestRateTrigger,
  createHorizontalScaleUpPolicy,
  createHorizontalScaleDownPolicy,
  createMemoryScalingPolicy,
  createQueueScalingPolicy,
  createRequestRatePolicy,
  createKVCacheScalingPolicy,
  createProactivePolicy,
  createPredictivePolicy,
  createCostOptimizedPolicy,
  createAggressivePolicy,
  getDefaultPolicies,
  getPolicyByName,
} from './policy.js';

// Strategies
export { ReactiveScalingStrategy } from './strategies/reactive.js';
export { ProactiveScalingStrategy } from './strategies/proactive.js';
export { PredictiveScalingStrategy } from './strategies/predictive.js';
export { CostOptimizedScalingStrategy } from './strategies/cost-optimized.js';

// Re-exports for convenience
export type {
  ResourceMetrics,
  ScalingPolicy,
  ScalingTrigger,
  ScalingAction,
  ScalingDecision,
  ScalingEvent,
  ScalingPrediction,
  TimeSeriesPoint,
  ScalingStats,
  ResourceAllocation,
  ThrottlingConfig,
  ScalingManagerConfig,
} from './types.js';

import { ScalingManager } from './manager.js';
import { ScalingActionExecutor, createDefaultExecutorConfig } from './executor.js';
import { ResourceAllocator } from './allocator.js';
import { AgentScheduler } from './scheduler.js';
import { getDefaultPolicies } from './policy.js';
import type { ScalingManagerConfig, ResourceMetrics } from './types.js';

/**
 * Create a scaling system with default configuration
 */
export function createScalingSystem(
  config?: Partial<ScalingManagerConfig>
): {
  manager: ScalingManager;
  executor: ScalingActionExecutor;
  allocator: ResourceAllocator;
} {
  const managerConfig: ScalingManagerConfig = {
    evaluationInterval: 30000, // 30 seconds
    predictionHorizon: 15 * 60 * 1000, // 15 minutes
    historyRetention: 24 * 60 * 60 * 1000, // 24 hours
    maxConcurrentActions: 5,
    dryRun: false,
    enablePredictive: true,
    enableCostOptimization: true,
    alertThresholds: {
      warning: 70,
      critical: 90,
    },
    ...config,
  };

  const manager = new ScalingManager(managerConfig);

  // Add default policies
  const policies = getDefaultPolicies();
  for (const policy of policies) {
    manager.addPolicy(policy);
  }

  const executor = new ScalingActionExecutor(createDefaultExecutorConfig());
  const allocator = new ResourceAllocator({
    totalCPU: 100,
    totalMemory: 16 * 1024 * 1024 * 1024, // 16GB
    totalKVCache: 2 * 1024 * 1024 * 1024, // 2GB
    allocatedCPU: 0,
    allocatedMemory: 0,
    allocatedKVCache: 0,
  });

  return { manager, executor, allocator };
}

/**
 * Create a scaling system from colony config
 */
export function createScalingFromColony(colonyConfig: {
  maxAgents: number;
  resourceBudget: {
    totalCompute: number;
    totalMemory: number;
    totalNetwork: number;
  };
}): ReturnType<typeof createScalingSystem> {
  return createScalingSystem({
    maxConcurrentActions: Math.min(5, Math.floor(colonyConfig.maxAgents / 100)),
  });
}

/**
 * Cost-Optimized Scaling Strategy
 *
 * Scale while minimizing monetary cost
 */

import type {
  ScalingPolicy,
  ResourceMetrics,
  ScalingDecision,
  TimeSeriesPoint,
} from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import { ScalingDirection, ScalingActionType } from '../types.js';

/**
 * Cost model configuration
 */
interface CostModel {
  costPerAgentPerHour: number;
  costPerGBMemoryPerHour: number;
  costPerGBKVCachePerHour: number;
  costPerNodePerHour: number;
}

/**
 * Default cost model (USD)
 */
const DEFAULT_COST_MODEL: CostModel = {
  costPerAgentPerHour: 0.01,
  costPerGBMemoryPerHour: 0.005,
  costPerGBKVCachePerHour: 0.001,
  costPerNodePerHour: 0.5,
};

/**
 * Cost-Optimized Scaling Strategy
 */
export class CostOptimizedScalingStrategy {
  private costModel: CostModel;
  private costHistory: { timestamp: number; cost: number }[] = [];

  constructor(costModel?: Partial<CostModel>) {
    this.costModel = {
      ...DEFAULT_COST_MODEL,
      ...costModel,
    };
  }

  /**
   * Calculate current hourly cost
   */
  private calculateHourlyCost(metrics: ResourceMetrics): number {
    let cost = 0;

    // Agent cost
    cost += metrics.agents.active * this.costModel.costPerAgentPerHour;

    // Memory cost (convert to GB)
    const memoryGB = metrics.memory.total / (1024 * 1024 * 1024);
    cost += memoryGB * this.costModel.costPerGBMemoryPerHour;

    // KV-cache cost (convert to GB)
    if (metrics.kvCache) {
      const kvCacheGB = metrics.kvCache.totalSize / (1024 * 1024 * 1024);
      cost += kvCacheGB * this.costModel.costPerGBKVCachePerHour;
    }

    // Node cost
    if (metrics.distributed) {
      cost +=
        metrics.distributed.nodeCount * this.costModel.costPerNodePerHour;
    }

    return cost;
  }

  /**
   * Calculate cost of scaling action
   */
  private calculateActionCost(action: any, durationHours: number): number {
    switch (action.type) {
      case ScalingActionType.SPAWN_AGENTS:
        return (
          action.magnitude *
          this.costModel.costPerAgentPerHour *
          durationHours
        );
      case ScalingActionType.DESPAWN_AGENTS:
        return (
          -action.magnitude *
          this.costModel.costPerAgentPerHour *
          durationHours
        ); // Negative cost = savings
      case ScalingActionType.EXPAND_KV_CACHE:
        const cacheGB = action.magnitude / (1024 * 1024 * 1024);
        return cacheGB * this.costModel.costPerGBKVCachePerHour * durationHours;
      case ScalingActionType.SHRINK_KV_CACHE:
        const shrinkGB = action.magnitude / (1024 * 1024 * 1024);
        return (
          -shrinkGB *
          this.costModel.costPerGBKVCachePerHour *
          durationHours
        ); // Savings
      case ScalingActionType.ADD_NODE:
        return this.costModel.costPerNodePerHour * durationHours;
      case ScalingActionType.REMOVE_NODE:
        return -this.costModel.costPerNodePerHour * durationHours; // Savings
      default:
        return 0;
    }
  }

  /**
   * Check if action is within budget
   */
  private isWithinBudget(
    action: any,
    currentCost: number,
    maxCostPerHour: number,
    durationHours: number = 1
  ): boolean {
    const actionCost = this.calculateActionCost(action, durationHours);
    const newCost = currentCost + actionCost;
    return newCost <= maxCostPerHour;
  }

  /**
   * Calculate cost-effectiveness score
   */
  private calculateCostEffectiveness(
    action: any,
    metrics: ResourceMetrics,
    durationHours: number = 1
  ): { score: number; cost: number; benefit: number } {
    const cost = Math.abs(this.calculateActionCost(action, durationHours));

    // Estimate benefit (e.g., reduction in queue depth)
    let benefit = 0;

    switch (action.type) {
      case ScalingActionType.SPAWN_AGENTS:
        // Benefit: reduce queue depth and latency
        benefit =
          (action.magnitude / metrics.agents.total) *
          (metrics.tasks.queueDepth / 100);
        break;
      case ScalingActionType.EXPAND_KV_CACHE:
        // Benefit: improve hit rate
        if (metrics.kvCache) {
          benefit = (1 - metrics.kvCache.hitRate) * (action.magnitude / (1024 * 1024 * 1024));
        }
        break;
      default:
        benefit = 1;
    }

    const score = benefit / (cost || 0.001);

    return { score, cost, benefit };
  }

  /**
   * Find most cost-effective action
   */
  private findMostCostEffectiveAction(
    actions: any[],
    metrics: ResourceMetrics,
    currentCost: number,
    constraints: any
  ): any | null {
    let bestAction: any = null;
    let bestScore = -Infinity;

    for (const action of actions) {
      // Check budget constraint
      if (
        constraints.maxCostPerHour &&
        !this.isWithinBudget(action, currentCost, constraints.maxCostPerHour)
      ) {
        continue;
      }

      // Calculate cost-effectiveness
      const { score } = this.calculateCostEffectiveness(action, metrics);

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Evaluate policy and make scaling decision
   */
  async evaluate(
    policy: ScalingPolicy,
    metrics: ResourceMetrics,
    history: TimeSeriesPoint[][]
  ): Promise<ScalingDecision | null> {
    const currentCost = this.calculateHourlyCost(metrics);

    // Record cost history
    this.costHistory.push({
      timestamp: Date.now(),
      cost: currentCost,
    });

    // Keep only last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.costHistory = this.costHistory.filter((c) => c.timestamp > cutoff);

    // Check if we need to scale (conservative approach)
    const needsScaleUp = this.shouldScaleUp(metrics, policy);
    const needsScaleDown = this.shouldScaleDown(metrics, policy);

    if (!needsScaleUp && !needsScaleDown) {
      return null;
    }

    // Filter actions by direction
    const direction = needsScaleUp ? 'up' : 'down';
    const applicableActions = policy.actions.filter(
      (a) => a.direction === direction
    );

    if (applicableActions.length === 0) {
      return null;
    }

    // Find most cost-effective action
    const bestAction = this.findMostCostEffectiveAction(
      applicableActions,
      metrics,
      currentCost,
      policy.constraints
    );

    if (!bestAction) {
      return null;
    }

    // Calculate action cost
    const actionCost = this.calculateActionCost(bestAction, 1);

    // Create decision
    const decision: ScalingDecision = {
      id: uuidv4(),
      policyId: policy.id,
      timestamp: Date.now(),
      metrics,
      triggeredTriggers: ['cost_optimization'],
      actions: [bestAction],
      reason: `Cost-optimized scaling (current cost: $${currentCost.toFixed(2)}/hr)`,
      confidence: 0.7, // Moderate confidence for cost-based decisions
      estimatedImpact: {
        resourceChange: this.estimateResourceChange(metrics, [bestAction]),
        cost: actionCost,
        duration: bestAction.estimatedDuration,
      },
      status: 'pending',
    };

    return decision;
  }

  /**
   * Check if we should scale up
   */
  private shouldScaleUp(metrics: ResourceMetrics, policy: ScalingPolicy): boolean {
    // Scale up only if CPU is very high or queue is growing
    const cpuHigh = metrics.cpu.usage > 80;
    const queueHigh = metrics.tasks.queueDepth > 100;
    const latencyHigh = metrics.tasks.averageLatency > 5000;

    return cpuHigh || queueHigh || latencyHigh;
  }

  /**
   * Check if we should scale down
   */
  private shouldScaleDown(
    metrics: ResourceMetrics,
    policy: ScalingPolicy
  ): boolean {
    // Scale down if resources are underutilized
    const cpuLow = metrics.cpu.usage < 30;
    const queueLow = metrics.tasks.queueDepth < 10;
    const excessAgents = metrics.agents.active > metrics.tasks.running * 2;

    return cpuLow && queueLow && excessAgents;
  }

  /**
   * Estimate resource change from actions
   */
  private estimateResourceChange(
    metrics: ResourceMetrics,
    actions: any[]
  ): ResourceMetrics {
    const result = JSON.parse(JSON.stringify(metrics)) as ResourceMetrics;

    for (const action of actions) {
      switch (action.type) {
        case ScalingActionType.SPAWN_AGENTS:
          result.agents.total += action.magnitude;
          result.agents.active += action.magnitude;
          result.cpu.usage *= 0.85; // Assume spawning reduces load
          break;
        case ScalingActionType.DESPAWN_AGENTS:
          result.agents.total = Math.max(
            result.agents.total - action.magnitude,
            0
          );
          result.agents.active = Math.max(
            result.agents.active - action.magnitude,
            0
          );
          break;
        case ScalingActionType.EXPAND_KV_CACHE:
          if (result.kvCache) {
            result.kvCache.totalSize += action.magnitude;
          }
          break;
        case ScalingActionType.SHRINK_KV_CACHE:
          if (result.kvCache) {
            result.kvCache.totalSize = Math.max(
              result.kvCache.totalSize - action.magnitude,
              0
            );
          }
          break;
      }
    }

    return result;
  }

  /**
   * Get average cost over period
   */
  public getAverageCost(durationMs: number = 60 * 60 * 1000): number {
    const cutoff = Date.now() - durationMs;
    const relevant = this.costHistory.filter((c) => c.timestamp > cutoff);

    if (relevant.length === 0) return 0;

    return relevant.reduce((sum, c) => sum + c.cost, 0) / relevant.length;
  }

  /**
   * Get cost trend
   */
  public getCostTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.costHistory.length < 2) return 'stable';

    const recent = this.costHistory.slice(-10);
    const avgCost = recent.reduce((sum, c) => sum + c.cost, 0) / recent.length;
    const firstCost = recent[0].cost;
    const lastCost = recent[recent.length - 1].cost;

    const changePercent = ((lastCost - firstCost) / firstCost) * 100;

    if (changePercent > 10) return 'increasing';
    if (changePercent < -10) return 'decreasing';
    return 'stable';
  }
}

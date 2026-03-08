/**
 * Reactive Scaling Strategy
 *
 * Threshold-based reactive scaling
 */

import type {
  ScalingPolicy,
  ResourceMetrics,
  ScalingDecision,
  TimeSeriesPoint,
  ScalingTrigger,
} from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import { ScalingDirection } from '../types.js';

/**
 * Check if trigger condition is met
 */
function checkTrigger(
  trigger: ScalingTrigger,
  metrics: ResourceMetrics,
  history: TimeSeriesPoint[][]
): boolean {
  // Get metric value
  const metricPath = trigger.metric.split('.');
  let value: any = metrics;

  for (const key of metricPath) {
    value = value[key as keyof typeof value];
    if (value === undefined) {
      return false;
    }
  }

  // Get numeric value
  const numericValue = typeof value === 'number' ? value : (value as any).usage || 0;

  // Check condition
  let conditionMet = false;

  switch (trigger.condition) {
    case 'greater_than':
      conditionMet = numericValue > (trigger.threshold as number);
      break;
    case 'less_than':
      conditionMet = numericValue < (trigger.threshold as number);
      break;
    case 'equals':
      conditionMet = numericValue === trigger.threshold;
      break;
    case 'between':
      const [min, max] = trigger.threshold as [number, number];
      conditionMet = numericValue >= min && numericValue <= max;
      break;
  }

  if (!conditionMet) {
    return false;
  }

  // Check duration (must hold for specified time)
  if (trigger.duration > 0) {
    const metricIndex = getMetricIndex(trigger.metric, metrics);
    const metricHistory = history[metricIndex] || [];

    if (metricHistory.length < 2) {
      return false;
    }

    const cutoffTime = Date.now() - trigger.duration;
    const recentPoints = metricHistory.filter((p) => p.timestamp >= cutoffTime);

    if (recentPoints.length < 2) {
      return false;
    }

    // All recent points must satisfy condition
    const allValid = recentPoints.every((point) => {
      switch (trigger.condition) {
        case 'greater_than':
          return point.value > (trigger.threshold as number);
        case 'less_than':
          return point.value < (trigger.threshold as number);
        case 'equals':
          return point.value === trigger.threshold;
        case 'between':
          const [min, max] = trigger.threshold as [number, number];
          return point.value >= min && point.value <= max;
        default:
          return false;
      }
    });

    if (!allValid) {
      return false;
    }
  }

  // Check cooldown
  if (trigger.lastTriggered) {
    const timeSinceLastTrigger = Date.now() - trigger.lastTriggered;
    if (timeSinceLastTrigger < trigger.cooldown) {
      return false;
    }
  }

  return true;
}

/**
 * Get metric index
 */
function getMetricIndex(metricKey: string, metrics: ResourceMetrics): number {
  const keys = Object.keys(metrics);
  return keys.indexOf(metricKey);
}

/**
 * Calculate confidence based on how much thresholds are exceeded
 */
function calculateConfidence(
  triggers: ScalingTrigger[],
  metrics: ResourceMetrics
): number {
  if (triggers.length === 0) {
    return 0.5;
  }

  let totalExcess = 0;

  for (const trigger of triggers) {
    const metricPath = trigger.metric.split('.');
    let value: any = metrics;

    for (const key of metricPath) {
      value = value[key as keyof typeof value];
    }

    const numericValue =
      typeof value === 'number' ? value : (value as any).usage || 0;
    const threshold = trigger.threshold as number;

    if (trigger.condition === 'greater_than' && numericValue > threshold) {
      totalExcess += (numericValue - threshold) / threshold;
    } else if (trigger.condition === 'less_than' && numericValue < threshold) {
      totalExcess += (threshold - numericValue) / threshold;
    }
  }

  // Cap at 1.0
  return Math.min(0.5 + totalExcess / triggers.length, 1.0);
}

/**
 * Estimate resource change from actions
 */
function estimateResourceChange(
  metrics: ResourceMetrics,
  actions: any[]
): ResourceMetrics {
  const result = JSON.parse(JSON.stringify(metrics)) as ResourceMetrics;

  for (const action of actions) {
    switch (action.type) {
      case 'spawn_agents':
        result.agents.total += action.magnitude;
        result.agents.active += action.magnitude;
        result.cpu.usage *= 0.9; // Assume spawning reduces load
        break;
      case 'despawn_agents':
        result.agents.total = Math.max(
          result.agents.total - action.magnitude,
          0
        );
        result.agents.active = Math.max(
          result.agents.active - action.magnitude,
          0
        );
        result.cpu.usage *= 1.1; // Assume removing increases load
        break;
      case 'expand_kv_cache':
        if (result.kvCache) {
          result.kvCache.totalSize += action.magnitude;
        }
        break;
      case 'shrink_kv_cache':
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
 * Reactive Scaling Strategy
 */
export class ReactiveScalingStrategy {
  /**
   * Evaluate policy and make scaling decision
   */
  async evaluate(
    policy: ScalingPolicy,
    metrics: ResourceMetrics,
    history: TimeSeriesPoint[][]
  ): Promise<ScalingDecision | null> {
    // Check which triggers are met
    const triggeredTriggers: string[] = [];
    const metTriggers: ScalingTrigger[] = [];

    for (const trigger of policy.triggers) {
      if (checkTrigger(trigger, metrics, history)) {
        triggeredTriggers.push(trigger.id);
        metTriggers.push(trigger);
      }
    }

    if (metTriggers.length === 0) {
      return null;
    }

    // Determine action direction
    const direction = this.determineDirection(metTriggers, metrics);

    // Filter actions by direction
    const applicableActions = policy.actions.filter(
      (a) => a.direction === direction
    );

    if (applicableActions.length === 0) {
      return null;
    }

    // Calculate confidence
    const confidence = calculateConfidence(metTriggers, metrics);

    // Create decision
    const decision: ScalingDecision = {
      id: uuidv4(),
      policyId: policy.id,
      timestamp: Date.now(),
      metrics,
      triggeredTriggers,
      actions: applicableActions,
      reason: this.generateReason(metTriggers, direction),
      confidence,
      estimatedImpact: {
        resourceChange: estimateResourceChange(metrics, applicableActions),
        cost:
          applicableActions.reduce((sum, a) => sum + (a.estimatedCost || 0), 0) *
          (direction === 'up' ? 1 : -1),
        duration:
          Math.max(...applicableActions.map((a) => a.estimatedDuration)),
      },
      status: 'pending',
    };

    return decision;
  }

  /**
   * Determine scaling direction from triggers
   */
  private determineDirection(
    triggers: ScalingTrigger[],
    metrics: ResourceMetrics
  ): ScalingDirection {
    let upVotes = 0;
    let downVotes = 0;

    for (const trigger of triggers) {
      if (trigger.condition === 'greater_than') {
        upVotes++;
      } else if (trigger.condition === 'less_than') {
        downVotes++;
      }
    }

    return upVotes > downVotes ? ScalingDirection.UP : ScalingDirection.DOWN;
  }

  /**
   * Generate human-readable reason
   */
  private generateReason(
    triggers: ScalingTrigger[],
    direction: ScalingDirection
  ): string {
    const triggerNames = triggers.map((t) => t.name).join(', ');
    return `Scaling ${direction} due to: ${triggerNames}`;
  }
}

/**
 * Colony Scaling
 * Auto-scale colonies based on load
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { ColonyOrchestrator } from '../colony-manager/index.js';
import type {
  ScalingConfig,
  ScalingEvent,
  ScalingTrigger,
  ScalingConstraints,
  ScalingPlan,
  ScalingAction,
  ScalingMetrics,
} from './types.js';

export class ColonyScaler extends EventEmitter {
  private orchestrator: ColonyOrchestrator;
  private config: ScalingConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private scalingHistory: ScalingEvent[] = [];
  private lastScalingTime: number = 0;

  constructor(
    orchestrator: ColonyOrchestrator,
    config: ScalingConfig
  ) {
    super();

    this.orchestrator = orchestrator;
    this.config = config;
  }

  // ============================================================================
  // Scaling Control
  // ============================================================================

  /**
   * Start automatic scaling
   */
  start(): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.evaluateScaling();
    }, 30000); // Check every 30 seconds

    this.emit('scaling_started');
  }

  /**
   * Stop automatic scaling
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.emit('scaling_stopped');
  }

  /**
   * Evaluate if scaling is needed
   */
  private async evaluateScaling(): Promise<void> {
    // Check cooldown
    if (Date.now() - this.lastScalingTime < this.config.cooldown) {
      return;
    }

    const metrics = await this.collectMetrics();
    const trigger = this.evaluateTriggers(metrics);

    if (!trigger) {
      return;
    }

    const direction = trigger.direction;
    const plan = await this.createScalingPlan(metrics, direction);

    if (plan.actions.length === 0) {
      return;
    }

    const event: ScalingEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      type: direction === 'up' ? 'scale_up' : 'scale_down',
      reason: trigger.type,
      metrics,
      plan,
    };

    this.emit('scaling_triggered', event);

    try {
      await this.executeScalingPlan(event);

      this.lastScalingTime = Date.now();
      this.scalingHistory.push(event);

      this.emit('scaling_complete', event);
    } catch (error) {
      this.emit('scaling_failed', { event, error });
    }
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<ScalingMetrics> {
    const colonies = this.orchestrator.getRunningColonies();
    const stats = this.orchestrator.getMetrics();
    const utilization = this.orchestrator.getResourceUtilization();

    return {
      currentLoad: (utilization.compute + utilization.memory + utilization.network) / 3,
      currentColonies: colonies.length,
      currentResources: {
        compute: stats.totalCompute,
        memory: stats.totalMemory,
        network: 0,
      },
      targetLoad: 0.7, // Target 70% utilization
      targetColonies: colonies.length,
      targetResources: {
        compute: stats.totalCompute,
        memory: stats.totalMemory,
        network: 0,
      },
    };
  }

  /**
   * Evaluate scaling triggers
   */
  private evaluateTriggers(metrics: ScalingMetrics): ScalingTrigger | null {
    for (const trigger of this.config.triggers) {
      if (this.checkTrigger(trigger, metrics)) {
        return trigger;
      }
    }
    return null;
  }

  /**
   * Check if a trigger condition is met
   */
  private checkTrigger(trigger: ScalingTrigger, metrics: ScalingMetrics): boolean {
    const value = this.getTriggerValue(trigger, metrics);

    switch (trigger.comparison) {
      case 'greater_than':
        return value > trigger.threshold;
      case 'less_than':
        return value < trigger.threshold;
      case 'equals':
        return value === trigger.threshold;
      default:
        return false;
    }
  }

  /**
   * Get value for a trigger type
   */
  private getTriggerValue(trigger: ScalingTrigger, metrics: ScalingMetrics): number {
    switch (trigger.type) {
      case 'cpu':
      case 'memory':
      case 'network':
        return metrics.currentLoad;
      case 'queue_depth':
        return 0; // TODO: implement queue depth tracking
      case 'custom':
        return trigger.threshold; // Placeholder
      default:
        return 0;
    }
  }

  /**
   * Create a scaling plan
   */
  private async createScalingPlan(
    metrics: ScalingMetrics,
    direction: 'up' | 'down'
  ): Promise<ScalingPlan> {
    const actions: ScalingAction[] = [];
    const constraints = this.config.constraints;

    if (direction === 'up') {
      // Scale up
      if (metrics.currentColonies < constraints.maxColonies) {
        const targetColonies = Math.min(
          metrics.currentColonies + 1,
          constraints.maxColonies
        );

        actions.push({
          type: 'provision',
          config: {
            resourceBudget: {
              totalCompute: constraints.minResourcesPerColony.compute,
              totalMemory: constraints.minResourcesPerColony.memory,
              totalNetwork: constraints.minResourcesPerColony.network,
            },
          },
          reason: 'Scale up due to high load',
          priority: 0.8,
        });

        metrics.targetColonies = targetColonies;
      }
    } else {
      // Scale down
      if (metrics.currentColonies > constraints.minColonies) {
        const targetColonies = Math.max(
          metrics.currentColonies - 1,
          constraints.minColonies
        );

        // Find least loaded colony to decommission
        const colonies = this.orchestrator.getRunningColonies();
        const leastLoaded = colonies.reduce((min, colony) => {
          const load = colony.resources.compute.utilization;
          return load < min.resources.compute.utilization ? colony : min;
        }, colonies[0]);

        if (leastLoaded) {
          actions.push({
            type: 'decommission',
            targetColonyId: leastLoaded.id,
            reason: 'Scale down due to low load',
            priority: 0.3,
          });

          metrics.targetColonies = targetColonies;
        }
      }
    }

    return {
      actions,
      estimatedDuration: actions.length * 60000, // 1 minute per action
      estimatedCost: actions.length * 0.1, // Placeholder cost calculation
    };
  }

  /**
   * Execute a scaling plan
   */
  private async executeScalingPlan(event: ScalingEvent): Promise<void> {
    const { plan } = event;

    for (const action of plan.actions) {
      this.emit('action_started', { event, action });

      try {
        switch (action.type) {
          case 'provision':
            await this.executeProvision(action);
            break;
          case 'decommission':
            await this.executeDecommission(action);
            break;
          case 'resize':
            await this.executeResize(action);
            break;
        }

        this.emit('action_completed', { event, action });
      } catch (error) {
        this.emit('action_failed', { event, action, error });
        throw error;
      }
    }
  }

  /**
   * Execute provision action
   */
  private async executeProvision(action: ScalingAction): Promise<void> {
    if (!action.config) {
      throw new Error('Provision action requires config');
    }

    // Provision new colony
    await this.orchestrator.provisionColony({
      id: uuidv4(),
      gardenerId: 'system',
      name: `auto-scaled-${Date.now()}`,
      maxAgents: 100,
      resourceBudget: action.config.resourceBudget!,
    });

    this.emit('colony_provisioned', { action });
  }

  /**
   * Execute decommission action
   */
  private async executeDecommission(action: ScalingAction): Promise<void> {
    if (!action.targetColonyId) {
      throw new Error('Decommission action requires targetColonyId');
    }

    await this.orchestrator.decommissionColony(action.targetColonyId);

    this.emit('colony_decommissioned', { action });
  }

  /**
   * Execute resize action
   */
  private async executeResize(action: ScalingAction): Promise<void> {
    if (!action.targetColonyId || !action.config) {
      throw new Error('Resize action requires targetColonyId and config');
    }

    // Resize colony resources
    const colony = this.orchestrator.getColony(action.targetColonyId);
    if (!colony) {
      throw new Error(`Colony not found: ${action.targetColonyId}`);
    }

    // Update resource budget
    if (action.config.resourceBudget) {
      colony.config.resourceBudget = {
        ...colony.config.resourceBudget,
        ...action.config.resourceBudget,
      };
    }

    this.emit('colony_resized', { action });
  }

  // ============================================================================
  // Manual Scaling
  // ============================================================================

  /**
   * Manually trigger scale up
   */
  async scaleUp(count: number = 1): Promise<void> {
    for (let i = 0; i < count; i++) {
      const action: ScalingAction = {
        type: 'provision',
        config: {
          resourceBudget: this.config.constraints.minResourcesPerColony,
        },
        reason: 'Manual scale up',
        priority: 1.0,
      };

      await this.executeProvision(action);
    }

    this.emit('manual_scale_up', { count });
  }

  /**
   * Manually trigger scale down
   */
  async scaleDown(count: number = 1): Promise<void> {
    const colonies = this.orchestrator.getRunningColonies();

    for (let i = 0; i < Math.min(count, colonies.length); i++) {
      const action: ScalingAction = {
        type: 'decommission',
        targetColonyId: colonies[i].id,
        reason: 'Manual scale down',
        priority: 1.0,
      };

      await this.executeDecommission(action);
    }

    this.emit('manual_scale_down', { count });
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Update scaling configuration
   */
  updateConfig(config: Partial<ScalingConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart if running
    if (this.intervalId) {
      this.stop();
      this.start();
    }

    this.emit('config_updated', this.config);
  }

  /**
   * Get scaling configuration
   */
  getConfig(): ScalingConfig {
    return { ...this.config };
  }

  /**
   * Get scaling history
   */
  getHistory(limit?: number): ScalingEvent[] {
    if (limit) {
      return this.scalingHistory.slice(-limit);
    }
    return [...this.scalingHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.scalingHistory = [];
  }
}

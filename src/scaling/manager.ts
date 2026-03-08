/**
 * POLLN Scaling Manager
 *
 * Orchestrates auto-scaling decisions and actions
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  ResourceMetrics,
  ScalingPolicy,
  ScalingDecision,
  ScalingEvent,
  ScalingStats,
  ScalingManagerConfig,
  ScalingPrediction,
  TimeSeriesPoint,
} from './types.js';
import { ScalingStrategy } from './types.js';
import { ReactiveScalingStrategy } from './strategies/reactive.js';
import { PredictiveScalingStrategy } from './strategies/predictive.js';
import { CostOptimizedScalingStrategy } from './strategies/cost-optimized.js';
import { ProactiveScalingStrategy } from './strategies/proactive.js';

/**
 * Scaling Manager - Main orchestrator
 */
export class ScalingManager extends EventEmitter {
  private id: string;
  private config: ScalingManagerConfig;
  private policies: Map<string, ScalingPolicy> = new Map();
  private strategies: Map<ScalingStrategy, any> = new Map();

  // State
  private currentMetrics: ResourceMetrics | null = null;
  private metricsHistory: TimeSeriesPoint[][] = [];
  private scalingHistory: ScalingEvent[] = [];
  private activeDecisions: Map<string, ScalingDecision> = new Map();
  private predictions: ScalingPrediction[] = [];

  // Timers
  private evaluationTimer: NodeJS.Timeout | null = null;
  private predictionTimer: NodeJS.Timeout | null = null;

  // Stats
  private stats: ScalingStats = {
    totalScalingEvents: 0,
    scaleUpEvents: 0,
    scaleDownEvents: 0,
    failedEvents: 0,
    averageResponseTime: 0,
    averageScaleTime: 0,
    policyEffectiveness: new Map(),
    costEfficiency: 0,
    uptime: 100,
    slaBreachCount: 0,
  };

  constructor(config: ScalingManagerConfig) {
    super();
    this.id = uuidv4();
    this.config = config;

    this.initializeStrategies();
    this.start();
  }

  /**
   * Initialize scaling strategies
   */
  private initializeStrategies(): void {
    this.strategies.set(ScalingStrategy.REACTIVE, new ReactiveScalingStrategy());
    this.strategies.set(ScalingStrategy.PROACTIVE, new ProactiveScalingStrategy());
    this.strategies.set(
      ScalingStrategy.PREDICTIVE,
      new PredictiveScalingStrategy()
    );
    this.strategies.set(
      ScalingStrategy.COST_OPTIMIZED,
      new CostOptimizedScalingStrategy()
    );
  }

  /**
   * Start scaling manager
   */
  private start(): void {
    // Metrics evaluation loop
    this.evaluationTimer = setInterval(() => {
      this.evaluateAndScale();
    }, this.config.evaluationInterval);

    // Prediction loop
    if (this.config.enablePredictive) {
      this.predictionTimer = setInterval(() => {
        this.generatePredictions();
      }, this.config.evaluationInterval * 2);
    }

    this.emit('started', { id: this.id });
  }

  /**
   * Stop scaling manager
   */
  public stop(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }

    if (this.predictionTimer) {
      clearInterval(this.predictionTimer);
      this.predictionTimer = null;
    }

    this.emit('stopped', { id: this.id });
  }

  /**
   * Update current metrics
   */
  public updateMetrics(metrics: ResourceMetrics): void {
    this.currentMetrics = metrics;

    // Store in history
    this.addToHistory(metrics);

    // Alert if thresholds exceeded
    this.checkAlertThresholds(metrics);

    this.emit('metrics_updated', metrics);
  }

  /**
   * Add metrics to history
   */
  private addToHistory(metrics: ResourceMetrics): void {
    const now = Date.now();

    // Store each metric type separately
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'object' && 'usage' in value) {
        const index = this.getMetricIndex(key);
        if (!this.metricsHistory[index]) {
          this.metricsHistory[index] = [];
        }

        this.metricsHistory[index].push({
          timestamp: now,
          value: (value as { usage: number }).usage,
        });

        // Prune old data
        const cutoff = now - this.config.historyRetention;
        this.metricsHistory[index] = this.metricsHistory[index].filter(
          (p) => p.timestamp > cutoff
        );
      }
    });
  }

  /**
   * Get metric index
   */
  private getMetricIndex(metricKey: string): number {
    const keys = Object.keys(this.currentMetrics || {});
    return keys.indexOf(metricKey);
  }

  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(metrics: ResourceMetrics): void {
    const { alertThresholds } = this.config;

    // CPU alerts
    if (metrics.cpu.usage >= alertThresholds.critical) {
      this.emit('alert', {
        type: 'critical',
        metric: 'cpu',
        value: metrics.cpu.usage,
      });
    } else if (metrics.cpu.usage >= alertThresholds.warning) {
      this.emit('alert', {
        type: 'warning',
        metric: 'cpu',
        value: metrics.cpu.usage,
      });
    }

    // Memory alerts
    if (metrics.memory.usage >= alertThresholds.critical) {
      this.emit('alert', {
        type: 'critical',
        metric: 'memory',
        value: metrics.memory.usage,
      });
    } else if (metrics.memory.usage >= alertThresholds.warning) {
      this.emit('alert', {
        type: 'warning',
        metric: 'memory',
        value: metrics.memory.usage,
      });
    }

    // Task queue alerts
    if (metrics.tasks.queueDepth >= 100) {
      this.emit('alert', {
        type: 'warning',
        metric: 'queue_depth',
        value: metrics.tasks.queueDepth,
      });
    }
  }

  /**
   * Main evaluation and scaling loop
   */
  private async evaluateAndScale(): Promise<void> {
    if (!this.currentMetrics) {
      return;
    }

    const startTime = Date.now();

    try {
      // Evaluate all enabled policies
      const decisions = await this.evaluatePolicies();

      // Filter and prioritize decisions
      const validDecisions = this.filterDecisions(decisions);

      // Execute decisions
      for (const decision of validDecisions) {
        await this.executeDecision(decision);
      }

      // Update stats
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeStats(responseTime);

      this.emit('evaluation_complete', {
        decisions: validDecisions,
        responseTime,
      });
    } catch (error) {
      this.emit('evaluation_error', error);
    }
  }

  /**
   * Evaluate all policies
   */
  private async evaluatePolicies(): Promise<ScalingDecision[]> {
    const decisions: ScalingDecision[] = [];
    const now = Date.now();

    for (const [policyId, policy] of this.policies) {
      if (!policy.enabled) {
        continue;
      }

      // Check cooldown
      if (policy.lastAction && now - policy.lastAction < policy.cooldown) {
        continue;
      }

      // Get strategy
      const strategy = this.strategies.get(policy.strategy);
      if (!strategy) {
        continue;
      }

      // Evaluate policy
      try {
        const decision = await strategy.evaluate(
          policy,
          this.currentMetrics!,
          this.metricsHistory
        );

        if (decision) {
          decisions.push(decision);
        }
      } catch (error) {
        this.emit('policy_error', {
          policyId,
          error,
        });
      }
    }

    return decisions;
  }

  /**
   * Filter and prioritize decisions
   */
  private filterDecisions(decisions: ScalingDecision[]): ScalingDecision[] {
    // Sort by priority and confidence
    decisions.sort((a, b) => {
      const prioritySum = (d: ScalingDecision) =>
        d.actions.reduce((sum, action) => sum + action.priority, 0);
      return prioritySum(b) - prioritySum(a) || b.confidence - a.confidence;
    });

    // Apply constraints
    const filtered: ScalingDecision[] = [];
    let totalAgentsScaling = 0;

    for (const decision of decisions) {
      const agentsToScale = decision.actions.reduce((sum, action) => {
        if (
          action.type === 'spawn_agents' ||
          action.type === 'despawn_agents'
        ) {
          return sum + action.magnitude;
        }
        return sum;
      }, 0);

      // Check if scaling would exceed limits
      if (this.currentMetrics && this.currentMetrics.agents) {
        const newCount =
          this.currentMetrics.agents.total + totalAgentsScaling + agentsToScale;

        // Get min/max from any policy
        const constraints = this.getGlobalConstraints();
        if (newCount < constraints.minAgents || newCount > constraints.maxAgents) {
          continue;
        }
      }

      filtered.push(decision);
      totalAgentsScaling += agentsToScale;

      // Limit concurrent actions
      if (filtered.length >= this.config.maxConcurrentActions) {
        break;
      }
    }

    return filtered;
  }

  /**
   * Get global constraints from all policies
   */
  private getGlobalConstraints() {
    let minAgents = 0;
    let maxAgents = Infinity;

    for (const policy of this.policies.values()) {
      minAgents = Math.max(minAgents, policy.constraints.minAgents);
      maxAgents = Math.min(maxAgents, policy.constraints.maxAgents);
    }

    return { minAgents, maxAgents };
  }

  /**
   * Execute scaling decision
   */
  private async executeDecision(decision: ScalingDecision): Promise<void> {
    decision.status = 'executing';
    this.activeDecisions.set(decision.id, decision);

    this.emit('scaling_started', decision);

    // Dry run mode
    if (this.config.dryRun) {
      decision.status = 'completed';
      decision.result = {
        success: true,
        actualImpact: decision.estimatedImpact.resourceChange,
      };
      this.emit('scaling_completed', decision);
      return;
    }

    const startTime = Date.now();

    try {
      // Execute each action
      for (const action of decision.actions) {
        await this.executeAction(action);
      }

      const duration = Date.now() - startTime;

      // Record success
      decision.status = 'completed';
      decision.result = {
        success: true,
        actualImpact: decision.estimatedImpact.resourceChange,
      };

      // Update stats
      this.recordScalingEvent(decision, duration);

      // Update policy effectiveness
      this.updatePolicyEffectiveness(decision);

      this.emit('scaling_completed', decision);
    } catch (error) {
      decision.status = 'failed';
      decision.result = {
        success: false,
        actualImpact: this.currentMetrics || ({} as ResourceMetrics),
        error: error instanceof Error ? error.message : String(error),
      };

      this.stats.failedEvents++;
      this.emit('scaling_failed', decision);
    } finally {
      this.activeDecisions.delete(decision.id);
    }
  }

  /**
   * Execute individual scaling action
   */
  private async executeAction(action: any): Promise<void> {
    // Delegate to appropriate handler
    switch (action.type) {
      case 'spawn_agents':
        await this.handleSpawnAgents(action);
        break;
      case 'despawn_agents':
        await this.handleDespawnAgents(action);
        break;
      case 'increase_capacity':
        await this.handleIncreaseCapacity(action);
        break;
      case 'expand_kv_cache':
        await this.handleExpandKVCache(action);
        break;
      case 'shrink_kv_cache':
        await this.handleShrinkKVCache(action);
        break;
      default:
        this.emit('action_unknown', { type: action.type });
    }
  }

  /**
   * Handle spawn agents action
   */
  private async handleSpawnAgents(action: any): Promise<void> {
    this.emit('spawn_agents', {
      count: action.magnitude,
      params: action.params,
    });
  }

  /**
   * Handle despawn agents action
   */
  private async handleDespawnAgents(action: any): Promise<void> {
    this.emit('despawn_agents', {
      count: action.magnitude,
      params: action.params,
    });
  }

  /**
   * Handle increase capacity action
   */
  private async handleIncreaseCapacity(action: any): Promise<void> {
    this.emit('increase_capacity', {
      amount: action.magnitude,
      params: action.params,
    });
  }

  /**
   * Handle expand KV cache action
   */
  private async handleExpandKVCache(action: any): Promise<void> {
    this.emit('expand_kv_cache', {
      amount: action.magnitude,
      params: action.params,
    });
  }

  /**
   * Handle shrink KV cache action
   */
  private async handleShrinkKVCache(action: any): Promise<void> {
    this.emit('shrink_kv_cache', {
      amount: action.magnitude,
      params: action.params,
    });
  }

  /**
   * Generate predictions
   */
  private async generatePredictions(): Promise<void> {
    if (!this.config.enablePredictive || !this.currentMetrics) {
      return;
    }

    try {
      const strategy = this.strategies.get(ScalingStrategy.PREDICTIVE);
      if (!strategy) {
        return;
      }

      const prediction = await strategy.predict(
        this.currentMetrics,
        this.metricsHistory,
        this.config.predictionHorizon
      );

      if (prediction) {
        this.predictions.push(prediction);

        // Keep only recent predictions
        this.predictions = this.predictions.filter(
          (p) => p.timestamp > Date.now() - this.config.predictionHorizon * 2
        );

        this.emit('prediction_generated', prediction);

        // Auto-scale if confidence is high
        if (
          prediction.confidence > 0.8 &&
          prediction.recommendedAction &&
          !this.config.dryRun
        ) {
          const decision: ScalingDecision = {
            id: uuidv4(),
            policyId: 'predictive_auto',
            timestamp: Date.now(),
            metrics: this.currentMetrics,
            triggeredTriggers: ['predictive'],
            actions: [prediction.recommendedAction],
            reason: 'Predictive auto-scaling',
            confidence: prediction.confidence,
            estimatedImpact: {
              resourceChange: prediction.predictedMetrics,
              cost: prediction.recommendedAction.estimatedCost || 0,
              duration: prediction.recommendedAction.estimatedDuration,
            },
            status: 'pending',
          };

          await this.executeDecision(decision);
        }
      }
    } catch (error) {
      this.emit('prediction_error', error);
    }
  }

  /**
   * Record scaling event
   */
  private recordScalingEvent(decision: ScalingDecision, duration: number): void {
    const event: ScalingEvent = {
      id: uuidv4(),
      type: decision.actions[0].direction === 'up' ? 'scale_up' : 'scale_down',
      timestamp: Date.now(),
      policyId: decision.policyId,
      decision,
      previousState: this.currentMetrics || ({} as ResourceMetrics),
      newState: decision.estimatedImpact.resourceChange,
      metadata: {
        duration,
        confidence: decision.confidence,
      },
    };

    this.scalingHistory.push(event);
    this.stats.totalScalingEvents++;

    if (event.type === 'scale_up') {
      this.stats.scaleUpEvents++;
    } else {
      this.stats.scaleDownEvents++;
    }

    // Prune old history
    const cutoff = Date.now() - this.config.historyRetention;
    this.scalingHistory = this.scalingHistory.filter((e) => e.timestamp > cutoff);

    this.emit('scaling_event_recorded', event);
  }

  /**
   * Update policy effectiveness
   */
  private updatePolicyEffectiveness(decision: ScalingDecision): void {
    const currentEffectiveness =
      this.stats.policyEffectiveness.get(decision.policyId) || 0.5;

    // Simple exponential moving average
    const newEffectiveness = currentEffectiveness * 0.9 + decision.confidence * 0.1;

    this.stats.policyEffectiveness.set(decision.policyId, newEffectiveness);
  }

  /**
   * Update response time stats
   */
  private updateResponseTimeStats(responseTime: number): void {
    const current = this.stats.averageResponseTime || responseTime;
    this.stats.averageResponseTime = current * 0.9 + responseTime * 0.1;
  }

  /**
   * Add scaling policy
   */
  public addPolicy(policy: ScalingPolicy): void {
    this.policies.set(policy.id, policy);
    this.emit('policy_added', policy);
  }

  /**
   * Remove scaling policy
   */
  public removePolicy(policyId: string): void {
    const removed = this.policies.delete(policyId);
    if (removed) {
      this.emit('policy_removed', policyId);
    }
  }

  /**
   * Enable/disable policy
   */
  public setPolicyEnabled(policyId: string, enabled: boolean): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      policy.enabled = enabled;
      this.emit('policy_toggled', { policyId, enabled });
    }
  }

  /**
   * Get current stats
   */
  public getStats(): ScalingStats {
    return { ...this.stats };
  }

  /**
   * Get scaling history
   */
  public getHistory(limit?: number): ScalingEvent[] {
    const history = [...this.scalingHistory].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get predictions
   */
  public getPredictions(): ScalingPrediction[] {
    return [...this.predictions];
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): ResourceMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get all policies
   */
  public getPolicies(): ScalingPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy by ID
   */
  public getPolicy(policyId: string): ScalingPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(): TimeSeriesPoint[][] {
    return this.metricsHistory;
  }

  /**
   * Force evaluation
   */
  public async forceEvaluation(): Promise<ScalingDecision[]> {
    return this.evaluatePolicies();
  }

  /**
   * Manual scaling
   */
  public async manualScale(
    type: string,
    magnitude: number,
    params: Record<string, unknown> = {}
  ): Promise<ScalingDecision> {
    if (!this.currentMetrics) {
      throw new Error('No current metrics available');
    }

    const decision: ScalingDecision = {
      id: uuidv4(),
      policyId: 'manual',
      timestamp: Date.now(),
      metrics: this.currentMetrics,
      triggeredTriggers: ['manual'],
      actions: [
        {
          id: uuidv4(),
          type: type as any,
          direction: magnitude > 0 ? 'up' : 'down',
          magnitude: Math.abs(magnitude),
          params,
          priority: 10,
          estimatedDuration: 60000,
          estimatedCost: 0,
        },
      ],
      reason: 'Manual scaling',
      confidence: 1.0,
      estimatedImpact: {
        resourceChange: this.currentMetrics,
        cost: 0,
        duration: 60000,
      },
      status: 'pending',
    };

    await this.executeDecision(decision);
    return decision;
  }
}

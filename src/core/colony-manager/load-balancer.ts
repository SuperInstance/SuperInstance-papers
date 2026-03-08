/**
 * Colony Load Balancer
 * Distribute load optimally across colonies
 */

import type {
  ColonyOrchestrator,
  LoadBalancingStrategy,
  LoadBalancingMetrics,
  LoadBalancingDecision,
  ColonyInstance,
} from './types.js';

export class ColonyLoadBalancer {
  private orchestrator: ColonyOrchestrator;
  private strategy: LoadBalancingStrategy;
  private metricsHistory: Map<string, LoadBalancingMetrics[]> = new Map();

  constructor(
    orchestrator: ColonyOrchestrator,
    strategy: LoadBalancingStrategy = 'least_loaded'
  ) {
    this.orchestrator = orchestrator;
    this.strategy = strategy;
  }

  /**
   * Select a colony for a request
   */
  selectColony(): ColonyInstance | null {
    const colonies = this.orchestrator.getRunningColonies();
    if (colonies.length === 0) {
      return null;
    }

    switch (this.strategy) {
      case 'round_robin':
        return this.selectRoundRobin(colonies);
      case 'least_loaded':
        return this.selectLeastLoaded(colonies);
      case 'weighted':
        return this.selectWeighted(colonies);
      case 'consistent_hash':
        return this.selectConsistentHash(colonies, Date.now().toString());
      case 'adaptive':
        return this.selectAdaptive(colonies);
      default:
        return this.selectLeastLoaded(colonies);
    }
  }

  /**
   * Calculate if rebalancing is needed
   */
  async calculateRebalancing(): Promise<LoadBalancingDecision> {
    const colonies = this.orchestrator.getRunningColonies();
    if (colonies.length === 0) {
      return {
        targetColonyId: '',
        strategy: this.strategy,
        reason: 'No colonies available',
      };
    }

    // Calculate load variance
    const loads = colonies.map(c => this.calculateColonyLoad(c));
    const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / loads.length;

    // If variance is high, rebalance
    if (variance > 0.1) {
      const overloaded = colonies.filter(c => this.calculateColonyLoad(c) > avgLoad + 0.2);
      const underloaded = colonies.filter(c => this.calculateColonyLoad(c) < avgLoad - 0.2);

      if (underloaded.length > 0) {
        return {
          targetColonyId: underloaded[0].id,
          strategy: this.strategy,
          reason: `High load variance (${variance.toFixed(3)})`,
          redistributeFrom: overloaded.map(c => c.id),
        };
      }
    }

    return {
      targetColonyId: '',
      strategy: this.strategy,
      reason: 'Load is balanced',
    };
  }

  /**
   * Update load metrics for a colony
   */
  updateMetrics(colonyId: string, metrics: Partial<LoadBalancingMetrics>): void {
    const colony = this.orchestrator.getColony(colonyId);
    if (!colony) return;

    const fullMetrics: LoadBalancingMetrics = {
      colonyId,
      load: this.calculateColonyLoad(colony),
      capacity: colony.resources.compute.total,
      queueDepth: 0, // TODO: track queue depth
      avgResponseTime: 0, // TODO: track response time
      errorRate: 0, // TODO: track error rate
      timestamp: Date.now(),
      ...metrics,
    };

    if (!this.metricsHistory.has(colonyId)) {
      this.metricsHistory.set(colonyId, []);
    }

    const history = this.metricsHistory.get(colonyId)!;
    history.push(fullMetrics);

    // Keep last 100 metrics
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get metrics for a colony
   */
  getMetrics(colonyId: string): LoadBalancingMetrics | null {
    const history = this.metricsHistory.get(colonyId);
    if (!history || history.length === 0) {
      return null;
    }
    return history[history.length - 1];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): LoadBalancingMetrics[] {
    const allMetrics: LoadBalancingMetrics[] = [];
    for (const history of this.metricsHistory.values()) {
      if (history.length > 0) {
        allMetrics.push(history[history.length - 1]);
      }
    }
    return allMetrics;
  }

  // ============================================================================
  // Selection Strategies
  // ============================================================================

  private roundRobinIndex = 0;

  private selectRoundRobin(colonies: ColonyInstance[]): ColonyInstance {
    const index = this.roundRobinIndex % colonies.length;
    this.roundRobinIndex++;
    return colonies[index];
  }

  private selectLeastLoaded(colonies: ColonyInstance[]): ColonyInstance {
    let leastLoaded = colonies[0];
    let minLoad = this.calculateColonyLoad(leastLoaded);

    for (const colony of colonies) {
      const load = this.calculateColonyLoad(colony);
      if (load < minLoad) {
        minLoad = load;
        leastLoaded = colony;
      }
    }

    return leastLoaded;
  }

  private selectWeighted(colonies: ColonyInstance[]): ColonyInstance {
    // Weight by available resources
    let totalWeight = 0;
    const weights = colonies.map(c => {
      const weight = c.resources.compute.available + c.resources.memory.available;
      totalWeight += weight;
      return weight;
    });

    let random = Math.random() * totalWeight;
    for (let i = 0; i < colonies.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return colonies[i];
      }
    }

    return colonies[colonies.length - 1];
  }

  private selectConsistentHash(colonies: ColonyInstance[], key: string): ColonyInstance {
    // Simple hash-based selection
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }

    const index = Math.abs(hash) % colonies.length;
    return colonies[index];
  }

  private selectAdaptive(colonies: ColonyInstance[]): ColonyInstance {
    // Use historical performance to select best colony
    let bestColony = colonies[0];
    let bestScore = this.calculateColonyScore(bestColony);

    for (const colony of colonies) {
      const score = this.calculateColonyScore(colony);
      if (score > bestScore) {
        bestScore = score;
        bestColony = colony;
      }
    }

    return bestColony;
  }

  /**
   * Calculate current load for a colony (0-1)
   */
  private calculateColonyLoad(colony: ColonyInstance): number {
    const utilizations = [
      colony.resources.compute.utilization,
      colony.resources.memory.utilization,
      colony.resources.network.utilization,
    ];

    return utilizations.reduce((a, b) => a + b, 0) / utilizations.length;
  }

  /**
   * Calculate colony score for adaptive selection
   */
  private calculateColonyScore(colony: ColonyInstance): number {
    let score = 0;

    // Health score (0-1)
    score += colony.health.score * 0.3;

    // Available resources (0-1)
    const avgAvailable =
      (colony.resources.compute.available +
        colony.resources.memory.available +
        colony.resources.network.available) /
      3;
    score += avgAvailable * 0.4;

    // Performance from metrics (0-1)
    const metrics = this.getMetrics(colony.id);
    if (metrics) {
      const performance = 1 - metrics.errorRate;
      score += performance * 0.3;
    }

    return score;
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metricsHistory.clear();
  }
}

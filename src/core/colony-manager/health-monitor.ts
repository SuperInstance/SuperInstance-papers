/**
 * Health Monitor
 * Monitor colony health and detect issues
 */

import type {
  ColonyOrchestrator,
  ColonyInstance,
  ColonyHealth,
  HealthIssue,
  OrchestrationEvent,
} from './types.js';

export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  thresholds: {
    errorRate: number;
    latency: number;
    utilization: number;
    memoryLeak: number;
  };
}

export class HealthMonitor {
  private orchestrator: ColonyOrchestrator;
  private config: HealthCheckConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private healthHistory: Map<string, ColonyHealth[]> = new Map();
  private issueHistory: Map<string, HealthIssue[]> = new Map();

  constructor(orchestrator: ColonyOrchestrator, intervalMs: number = 30000) {
    this.orchestrator = orchestrator;
    this.config = {
      interval: intervalMs,
      timeout: 10000,
      thresholds: {
        errorRate: 0.1,
        latency: 5000,
        utilization: 0.9,
        memoryLeak: 0.8,
      },
    };
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.performHealthChecks();
    }, this.config.interval);

    // Initial check
    this.performHealthChecks();
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Perform health checks on all colonies
   */
  private async performHealthChecks(): Promise<void> {
    const colonies = this.orchestrator.getAllColonies();

    for (const colony of colonies) {
      try {
        const health = await this.checkColonyHealth(colony);
        this.updateHealth(colony.id, health);
      } catch (error) {
        this.updateHealth(colony.id, {
          status: 'unknown',
          score: 0,
          issues: [
            {
              severity: 'critical',
              category: 'health_check',
              message: `Health check failed: ${error}`,
              timestamp: Date.now(),
            },
          ],
          lastCheck: Date.now(),
        });
      }
    }
  }

  /**
   * Check health of a single colony
   */
  async checkColonyHealth(colony: ColonyInstance): Promise<ColonyHealth> {
    const issues: HealthIssue[] = [];
    let score = 1.0;

    // Check state
    if (colony.state !== 'running') {
      if (colony.state === 'error') {
        issues.push({
          severity: 'critical',
          category: 'state',
          message: `Colony in error state`,
          timestamp: Date.now(),
        });
        score -= 0.5;
      } else if (colony.state === 'stopped' || colony.state === 'stopping') {
        issues.push({
          severity: 'high',
          category: 'state',
          message: `Colony not running: ${colony.state}`,
          timestamp: Date.now(),
        });
        score -= 0.3;
      }
    }

    // Check resource utilization
    const avgUtilization =
      (colony.resources.compute.utilization +
        colony.resources.memory.utilization +
        colony.resources.network.utilization) /
      3;

    if (avgUtilization > this.config.thresholds.utilization) {
      issues.push({
        severity: 'high',
        category: 'resources',
        message: `High utilization: ${(avgUtilization * 100).toFixed(1)}%`,
        timestamp: Date.now(),
      });
      score -= 0.2;
    }

    // Check for memory leaks (high memory usage with low compute)
    if (
      colony.resources.memory.utilization > this.config.thresholds.memoryLeak &&
      colony.resources.compute.utilization < 0.5
    ) {
      issues.push({
        severity: 'medium',
        category: 'memory',
        message: 'Possible memory leak detected',
        timestamp: Date.now(),
      });
      score -= 0.15;
    }

    // Check agent stats
    const stats = await colony.colony.getStats();
    const totalAgents = stats.totalAgents;
    const activeAgents = stats.activeAgents;

    if (totalAgents > 0 && activeAgents === 0) {
      issues.push({
        severity: 'high',
        category: 'agents',
        message: 'No active agents',
        timestamp: Date.now(),
      });
      score -= 0.3;
    }

    // Check diversity
    if (stats.shannonDiversity < 0.5 && totalAgents > 10) {
      issues.push({
        severity: 'low',
        category: 'diversity',
        message: `Low diversity: ${stats.shannonDiversity.toFixed(2)}`,
        timestamp: Date.now(),
      });
      score -= 0.1;
    }

    // Determine status
    let status: ColonyHealth['status'] = 'healthy';
    if (score < 0.3) {
      status = 'unhealthy';
    } else if (score < 0.7) {
      status = 'degraded';
    }

    return {
      status,
      score: Math.max(0, score),
      issues,
      lastCheck: Date.now(),
    };
  }

  /**
   * Update health for a colony
   */
  private updateHealth(colonyId: string, health: ColonyHealth): void {
    const colony = this.orchestrator.getColony(colonyId);
    if (!colony) return;

    colony.health = health;
    colony.lastHealthCheck = health.lastCheck;

    // Record history
    if (!this.healthHistory.has(colonyId)) {
      this.healthHistory.set(colonyId, []);
    }

    const history = this.healthHistory.get(colonyId)!;
    history.push(health);

    // Keep last 100 checks
    if (history.length > 100) {
      history.shift();
    }

    // Record issues
    if (health.issues.length > 0) {
      if (!this.issueHistory.has(colonyId)) {
        this.issueHistory.set(colonyId, []);
      }

      const issueHistory = this.issueHistory.get(colonyId)!;
      issueHistory.push(...health.issues);

      // Keep last 1000 issues
      if (issueHistory.length > 1000) {
        issueHistory.splice(0, issueHistory.length - 1000);
      }
    }

    // Emit event if unhealthy
    if (health.status === 'unhealthy') {
      this.orchestrator.emit('health_check_failed', { colonyId, health });
    }
  }

  /**
   * Get health for a colony
   */
  getHealth(colonyId: string): ColonyHealth | null {
    const colony = this.orchestrator.getColony(colonyId);
    return colony ? colony.health : null;
  }

  /**
   * Get health history for a colony
   */
  getHealthHistory(colonyId: string, limit?: number): ColonyHealth[] {
    const history = this.healthHistory.get(colonyId);
    if (!history) return [];

    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * Get issue history for a colony
   */
  getIssueHistory(colonyId: string, limit?: number): HealthIssue[] {
    const history = this.issueHistory.get(colonyId);
    if (!history) return [];

    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * Get all issues across all colonies
   */
  getAllIssues(severity?: HealthIssue['severity']): HealthIssue[] {
    const allIssues: HealthIssue[] = [];

    for (const issues of this.issueHistory.values()) {
      allIssues.push(...issues);
    }

    if (severity) {
      return allIssues.filter(issue => issue.severity === severity);
    }

    return allIssues;
  }

  /**
   * Get recent issues
   */
  getRecentIssues(minutes: number = 60, severity?: HealthIssue['severity']): HealthIssue[] {
    const cutoff = Date.now() - minutes * 60 * 1000;

    let issues = this.getAllIssues(severity).filter(issue => issue.timestamp >= cutoff);

    // Sort by severity and timestamp
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    issues.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp - a.timestamp;
    });

    return issues;
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
    total: number;
  } {
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;
    let unknown = 0;

    for (const colony of this.orchestrator.getAllColonies()) {
      switch (colony.health.status) {
        case 'healthy':
          healthy++;
          break;
        case 'degraded':
          degraded++;
          break;
        case 'unhealthy':
          unhealthy++;
          break;
        case 'unknown':
          unknown++;
          break;
      }
    }

    return {
      healthy,
      degraded,
      unhealthy,
      unknown,
      total: healthy + degraded + unhealthy + unknown,
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.healthHistory.clear();
    this.issueHistory.clear();
  }

  /**
   * Get config
   */
  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart with new interval if changed
    if (updates.interval && this.intervalId) {
      this.stop();
      this.start();
    }
  }
}

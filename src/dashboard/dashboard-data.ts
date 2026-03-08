/**
 * Dashboard Data Provider
 * Generate data for multi-colony dashboard visualization
 */

import type {
  ColonyOrchestrator,
  DashboardData,
  DashboardSummary,
  DashboardColony,
  DashboardTopology,
  DashboardAlert,
  DashboardTrends,
  ColonyInstance,
} from '../core/colony-manager/index.js';

export class DashboardDataProvider {
  private orchestrator: ColonyOrchestrator;
  private trendHistory: Array<{
    timestamp: number;
    utilization: number;
    throughput: number;
    latency: number;
    errors: number;
  }> = [];
  private maxHistoryLength = 100;

  constructor(orchestrator: ColonyOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    return {
      summary: await this.getSummary(),
      colonies: await this.getColonies(),
      topology: await this.getTopology(),
      alerts: await this.getAlerts(),
      trends: await this.getTrends(),
    };
  }

  /**
   * Get dashboard summary
   */
  async getSummary(): Promise<DashboardSummary> {
    const colonies = this.orchestrator.getAllColonies();
    const runningColonies = this.orchestrator.getRunningColonies();
    const metrics = this.orchestrator.getMetrics();
    const utilization = this.orchestrator.getResourceUtilization();

    let healthyColonies = 0;
    let totalThroughput = 0;
    let totalLatency = 0;
    let errorCount = 0;

    for (const colony of runningColonies) {
      if (colony.health.status === 'healthy') {
        healthyColonies++;
      }
      totalThroughput += colony.colony.count; // Simplified throughput
      totalLatency += colony.colony.count > 0 ? 100 : 0; // Placeholder latency
      errorCount += colony.health.issues.length;
    }

    return {
      totalColonies: colonies.length,
      healthyColonies,
      totalAgents: metrics.totalAgents,
      totalThroughput,
      avgLatency: runningColonies.length > 0 ? totalLatency / runningColonies.length : 0,
      errorRate: metrics.totalAgents > 0 ? errorCount / metrics.totalAgents : 0,
      utilization: {
        compute: utilization.compute,
        memory: utilization.memory,
        network: utilization.network,
      },
    };
  }

  /**
   * Get all colonies for dashboard
   */
  async getColonies(): Promise<DashboardColony[]> {
    const colonies = this.orchestrator.getAllColonies();

    return colonies.map(colony => this.convertToDashboardColony(colony));
  }

  /**
   * Get topology visualization data
   */
  async getTopology(): Promise<DashboardTopology> {
    const colonies = this.orchestrator.getAllColonies();

    const nodes = colonies.map(colony => ({
      id: colony.id,
      type: 'colony' as const,
      label: colony.metadata.name || colony.id,
      state: colony.state,
      health: colony.health.score,
    }));

    // Add orchestrator as a gateway node
    nodes.push({
      id: 'orchestrator',
      type: 'gateway' as const,
      label: 'Orchestrator',
      state: 'running' as const,
      health: 1.0,
    });

    const edges = colonies.map(colony => ({
      source: 'orchestrator',
      target: colony.id,
      type: 'routing' as const,
      weight: colony.resources.compute.utilization,
    }));

    return { nodes, edges };
  }

  /**
   * Get active alerts
   */
  async getAlerts(): Promise<DashboardAlert[]> {
    const colonies = this.orchestrator.getAllColonies();
    const alerts: DashboardAlert[] = [];
    let alertId = 0;

    for (const colony of colonies) {
      // Check for critical issues
      for (const issue of colony.health.issues) {
        let severity: DashboardAlert['severity'] = 'info';

        switch (issue.severity) {
          case 'critical':
            severity = 'critical';
            break;
          case 'high':
            severity = 'error';
            break;
          case 'medium':
            severity = 'warning';
            break;
          case 'low':
            severity = 'info';
            break;
        }

        alerts.push({
          id: `alert-${alertId++}`,
          severity,
          colonyId: colony.id,
          message: issue.message,
          timestamp: issue.timestamp,
          resolved: false,
        });
      }

      // Check for high resource utilization
      if (colony.resources.compute.utilization > 0.9) {
        alerts.push({
          id: `alert-${alertId++}`,
          severity: 'warning',
          colonyId: colony.id,
          message: `High CPU utilization: ${(colony.resources.compute.utilization * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          resolved: false,
        });
      }

      if (colony.resources.memory.utilization > 0.9) {
        alerts.push({
          id: `alert-${alertId++}`,
          severity: 'warning',
          colonyId: colony.id,
          message: `High memory utilization: ${(colony.resources.memory.utilization * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          resolved: false,
        });
      }
    }

    // Sort by severity and timestamp
    const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp - a.timestamp;
    });

    return alerts.slice(0, 50); // Limit to 50 most recent alerts
  }

  /**
   * Get trends data
   */
  async getTrends(): Promise<DashboardTrends> {
    // Record current metrics
    const metrics = this.orchestrator.getMetrics();
    const utilization = this.orchestrator.getResourceUtilization();
    const avgUtilization = (utilization.compute + utilization.memory + utilization.network) / 3;

    this.trendHistory.push({
      timestamp: Date.now(),
      utilization: avgUtilization,
      throughput: metrics.totalAgents,
      latency: 0, // Would track actual latency
      errors: 0, // Would track actual errors
    });

    // Keep history within limit
    if (this.trendHistory.length > this.maxHistoryLength) {
      this.trendHistory.shift();
    }

    return {
      utilization: this.trendHistory.map(h => ({
        timestamp: h.timestamp,
        value: h.utilization,
      })),
      throughput: this.trendHistory.map(h => ({
        timestamp: h.timestamp,
        value: h.throughput,
      })),
      latency: this.trendHistory.map(h => ({
        timestamp: h.timestamp,
        value: h.latency,
      })),
      errors: this.trendHistory.map(h => ({
        timestamp: h.timestamp,
        value: h.errors,
      })),
    };
  }

  /**
   * Convert colony instance to dashboard colony
   */
  private convertToDashboardColony(colony: ColonyInstance): DashboardColony {
    const stats = colony.colony.getStats ? { totalAgents: colony.colony.count } : { totalAgents: 0 };

    return {
      id: colony.id,
      name: colony.metadata.name || colony.id,
      state: colony.state,
      health: colony.health,
      resources: colony.resources,
      specialization: colony.specialization,
      agentCount: stats.totalAgents,
      throughput: stats.totalAgents, // Simplified
      avgLatency: 0, // Would calculate from actual metrics
      errorRate: colony.health.issues.length / Math.max(1, stats.totalAgents),
    };
  }

  /**
   * Clear trend history
   */
  clearTrendHistory(): void {
    this.trendHistory = [];
  }

  /**
   * Get trend history
   */
  getTrendHistory(): Array<{
    timestamp: number;
    utilization: number;
    throughput: number;
    latency: number;
    errors: number;
  }> {
    return [...this.trendHistory];
  }
}

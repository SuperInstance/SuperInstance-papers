/**
 * Resource Tracker
 * Track and manage colony resources
 */

import type {
  ColonyOrchestrator,
  ColonyResources,
  ResourceUsage,
} from './types.js';

export interface ResourceBudget {
  totalCompute: number;
  totalMemory: number;
  totalNetwork: number;
}

export class ResourceTracker {
  private orchestrator: ColonyOrchestrator;
  private totalBudget: ResourceBudget;
  private allocatedResources: Map<string, ResourceBudget> = new Map();
  private resourceHistory: Array<{
    timestamp: number;
    compute: number;
    memory: number;
    network: number;
  }> = [];

  constructor(orchestrator: ColonyOrchestrator, totalBudget: ResourceBudget) {
    this.orchestrator = orchestrator;
    this.totalBudget = totalBudget;
  }

  /**
   * Allocate resources to a colony
   */
  allocateResources(colonyId: string, budget: ResourceBudget): void {
    // Check if allocation would exceed budget
    const currentAllocation = this.allocatedResources.get(colonyId);
    const currentCompute = currentAllocation?.totalCompute || 0;
    const currentMemory = currentAllocation?.totalMemory || 0;
    const currentNetwork = currentAllocation?.totalNetwork || 0;

    const totalCompute = this.getTotalAllocated().totalCompute - currentCompute + budget.totalCompute;
    const totalMemory = this.getTotalAllocated().totalMemory - currentMemory + budget.totalMemory;
    const totalNetwork = this.getTotalAllocated().totalNetwork - currentNetwork + budget.totalNetwork;

    if (totalCompute > this.totalBudget.totalCompute) {
      throw new Error(`Insufficient compute: ${totalCompute} > ${this.totalBudget.totalCompute}`);
    }
    if (totalMemory > this.totalBudget.totalMemory) {
      throw new Error(`Insufficient memory: ${totalMemory} > ${this.totalBudget.totalMemory}`);
    }
    if (totalNetwork > this.totalBudget.totalNetwork) {
      throw new Error(`Insufficient network: ${totalNetwork} > ${this.totalBudget.totalNetwork}`);
    }

    this.allocatedResources.set(colonyId, budget);
  }

  /**
   * Release resources from a colony
   */
  releaseResources(colonyId: string): void {
    this.allocatedResources.delete(colonyId);
  }

  /**
   * Update resource usage for a colony
   */
  updateUsage(colonyId: string, usage: Partial<ColonyResources>): void {
    const colony = this.orchestrator.getColony(colonyId);
    if (!colony) return;

    if (usage.compute) {
      colony.resources.compute = {
        ...colony.resources.compute,
        ...usage.compute,
        utilization: usage.compute.used / colony.resources.compute.total,
      };
    }

    if (usage.memory) {
      colony.resources.memory = {
        ...colony.resources.memory,
        ...usage.memory,
        utilization: usage.memory.used / colony.resources.memory.total,
      };
    }

    if (usage.network) {
      colony.resources.network = {
        ...colony.resources.network,
        ...usage.network,
        utilization: usage.network.used / colony.resources.network.total,
      };
    }
  }

  /**
   * Get total allocated resources
   */
  getTotalAllocated(): ResourceBudget {
    let compute = 0;
    let memory = 0;
    let network = 0;

    for (const budget of this.allocatedResources.values()) {
      compute += budget.totalCompute;
      memory += budget.totalMemory;
      network += budget.totalNetwork;
    }

    return { totalCompute: compute, totalMemory: memory, totalNetwork: network };
  }

  /**
   * Get total used resources
   */
  getTotalUsed(): ResourceBudget {
    let compute = 0;
    let memory = 0;
    let network = 0;

    for (const colony of this.orchestrator.getRunningColonies()) {
      compute += colony.resources.compute.used;
      memory += colony.resources.memory.used;
      network += colony.resources.network.used;
    }

    return { totalCompute: compute, totalMemory: memory, totalNetwork: network };
  }

  /**
   * Get available resources
   */
  getAvailableResources(): ResourceBudget {
    const used = this.getTotalUsed();

    return {
      totalCompute: this.totalBudget.totalCompute - used.totalCompute,
      totalMemory: this.totalBudget.totalMemory - used.totalMemory,
      totalNetwork: this.totalBudget.totalNetwork - used.totalNetwork,
    };
  }

  /**
   * Get overall utilization
   */
  getOverallUtilization(): {
    compute: number;
    memory: number;
    network: number;
  } {
    const used = this.getTotalUsed();

    return {
      compute: used.totalCompute / this.totalBudget.totalCompute,
      memory: used.totalMemory / this.totalBudget.totalMemory,
      network: used.totalNetwork / this.totalBudget.totalNetwork,
    };
  }

  /**
   * Get resource utilization for a colony
   */
  getColonyUtilization(colonyId: string): ColonyResources | null {
    const colony = this.orchestrator.getColony(colonyId);
    return colony ? colony.resources : null;
  }

  /**
   * Check if resources are available
   */
  hasResources(required: ResourceBudget): boolean {
    const available = this.getAvailableResources();

    return (
      required.totalCompute <= available.totalCompute &&
      required.totalMemory <= available.totalMemory &&
      required.totalNetwork <= available.totalNetwork
    );
  }

  /**
   * Record resource history snapshot
   */
  recordSnapshot(): void {
    const utilization = this.getOverallUtilization();

    this.resourceHistory.push({
      timestamp: Date.now(),
      compute: utilization.compute,
      memory: utilization.memory,
      network: utilization.network,
    });

    // Keep last 1000 snapshots
    if (this.resourceHistory.length > 1000) {
      this.resourceHistory.shift();
    }
  }

  /**
   * Get resource history
   */
  getHistory(limit?: number): Array<{
    timestamp: number;
    compute: number;
    memory: number;
    network: number;
  }> {
    if (limit) {
      return this.resourceHistory.slice(-limit);
    }
    return [...this.resourceHistory];
  }

  /**
   * Get resource trends
   */
  getTrends(windowMs: number = 3600000): {
    compute: 'increasing' | 'decreasing' | 'stable';
    memory: 'increasing' | 'decreasing' | 'stable';
    network: 'increasing' | 'decreasing' | 'stable';
  } {
    const cutoff = Date.now() - windowMs;
    const recentHistory = this.resourceHistory.filter(h => h.timestamp >= cutoff);

    if (recentHistory.length < 2) {
      return { compute: 'stable', memory: 'stable', network: 'stable' };
    }

    const trend = (values: number[]): 'increasing' | 'decreasing' | 'stable' => {
      const first = values.slice(0, Math.floor(values.length / 2));
      const second = values.slice(Math.floor(values.length / 2));

      const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
      const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;

      const change = (avgSecond - avgFirst) / avgFirst;

      if (change > 0.05) return 'increasing';
      if (change < -0.05) return 'decreasing';
      return 'stable';
    };

    return {
      compute: trend(recentHistory.map(h => h.compute)),
      memory: trend(recentHistory.map(h => h.memory)),
      network: trend(recentHistory.map(h => h.network)),
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.resourceHistory = [];
  }

  /**
   * Get total budget
   */
  getTotalBudget(): ResourceBudget {
    return { ...this.totalBudget };
  }

  /**
   * Get allocation for a colony
   */
  getAllocation(colonyId: string): ResourceBudget | null {
    const allocation = this.allocatedResources.get(colonyId);
    return allocation ? { ...allocation } : null;
  }

  /**
   * Get all allocations
   */
  getAllAllocations(): Map<string, ResourceBudget> {
    return new Map(
      Array.from(this.allocatedResources.entries()).map(([id, budget]) => [id, { ...budget }])
    );
  }
}

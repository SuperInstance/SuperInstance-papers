/**
 * Colony Scheduler
 * Schedule work across multiple colonies
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  WorkloadRequest,
  ScheduleResult,
  ColonyInstance,
  ColonyOrchestrator,
  WorkloadRequirements,
} from './types.js';

export class ColonyScheduler {
  private orchestrator: ColonyOrchestrator;
  private processedCount: number = 0;
  private schedulingHistory: Map<string, ScheduleResult[]> = new Map();

  constructor(orchestrator: ColonyOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Schedule work to the best colony
   */
  async schedule(requirements: WorkloadRequirements): Promise<ScheduleResult> {
    const request: WorkloadRequest = {
      id: uuidv4(),
      type: requirements.type || 'general',
      requirements,
      priority: requirements.agentTypes?.[0] ? 0.8 : 0.5,
      estimatedDuration: 1000,
      payload: null,
    };

    return this.scheduleWork(request);
  }

  /**
   * Schedule a workload request
   */
  async scheduleWork(request: WorkloadRequest): Promise<ScheduleResult> {
    const runningColonies = this.orchestrator.getRunningColonies();

    if (runningColonies.length === 0) {
      throw new Error('No running colonies available');
    }

    // Score each colony
    const scores = await this.scoreColonies(runningColonies, request);

    // Sort by score
    const sorted = scores.sort((a, b) => b.score - a.score);

    if (sorted.length === 0) {
      throw new Error('No suitable colonies found for workload');
    }

    const selected = sorted[0];

    // Record history
    if (!this.schedulingHistory.has(request.type)) {
      this.schedulingHistory.set(request.type, []);
    }
    this.schedulingHistory.get(request.type)!.push({
      colonyId: selected.colonyId,
      confidence: selected.score,
      reason: selected.reason,
    });

    this.processedCount++;

    return {
      colonyId: selected.colonyId,
      confidence: selected.score,
      reason: selected.reason,
      alternatives: sorted.slice(1, 4).map(s => ({
        colonyId: s.colonyId,
        confidence: s.score,
        reason: s.reason,
      })),
    };
  }

  /**
   * Score colonies for a workload
   */
  private async scoreColonies(
    colonies: ColonyInstance[],
    request: WorkloadRequest
  ): Promise<Array<{ colonyId: string; score: number; reason: string }>> {
    const scores = [];

    for (const colony of colonies) {
      const score = await this.scoreColony(colony, request);
      if (score.score > 0) {
        scores.push(score);
      }
    }

    return scores;
  }

  /**
   * Score a single colony for a workload
   */
  private async scoreColony(
    colony: ColonyInstance,
    request: WorkloadRequest
  ): Promise<{ colonyId: string; score: number; reason: string }> {
    let score = 0;
    const reasons: string[] = [];

    // Health score (0-1) - weight: 0.3
    if (colony.health.score < 0.5) {
      return { colonyId: colony.id, score: 0, reason: 'Colony unhealthy' };
    }
    score += colony.health.score * 0.3;
    reasons.push(`health: ${colony.health.score.toFixed(2)}`);

    // Resource availability (0-1) - weight: 0.4
    const resourceScore = this.calculateResourceScore(colony, request.requirements);
    if (resourceScore < 0.1) {
      return { colonyId: colony.id, score: 0, reason: 'Insufficient resources' };
    }
    score += resourceScore * 0.4;
    reasons.push(`resources: ${resourceScore.toFixed(2)}`);

    // Specialization match (0-1) - weight: 0.2
    if (colony.specialization && request.requirements.domains) {
      const domainMatch = this.calculateSpecializationMatch(
        colony.specialization,
        request.requirements.domains
      );
      score += domainMatch * 0.2;
      reasons.push(`specialization: ${domainMatch.toFixed(2)}`);
    } else {
      score += 0.1; // neutral score for non-specialized workloads
      reasons.push('specialization: neutral');
    }

    // Load balancing (0-1) - weight: 0.1
    const loadScore = 1 - this.calculateLoad(colony);
    score += loadScore * 0.1;
    reasons.push(`load: ${loadScore.toFixed(2)}`);

    return {
      colonyId: colony.id,
      score: Math.min(1, score),
      reason: reasons.join(', '),
    };
  }

  /**
   * Calculate resource availability score
   */
  private calculateResourceScore(
    colony: ColonyInstance,
    requirements: WorkloadRequirements
  ): number {
    let score = 1;
    let factors = 0;

    if (requirements.compute) {
      const available = colony.resources.compute.available;
      score *= Math.min(1, available / requirements.compute);
      factors++;
    }

    if (requirements.memory) {
      const available = colony.resources.memory.available;
      score *= Math.min(1, available / requirements.memory);
      factors++;
    }

    if (requirements.network) {
      const available = colony.resources.network.available;
      score *= Math.min(1, available / requirements.network);
      factors++;
    }

    return factors > 0 ? score : 0.5;
  }

  /**
   * Calculate specialization match
   */
  private calculateSpecializationMatch(
    specialization: ColonyInstance['specialization'],
    domains: string[]
  ): number {
    if (!specialization) return 0.5;

    const matches = specialization.domains.filter(d => domains.includes(d));
    return matches.length / domains.length;
  }

  /**
   * Calculate current load
   */
  private calculateLoad(colony: ColonyInstance): number {
    const utilizations = [
      colony.resources.compute.utilization,
      colony.resources.memory.utilization,
      colony.resources.network.utilization,
    ];

    return utilizations.reduce((a, b) => a + b, 0) / utilizations.length;
  }

  /**
   * Get processed count
   */
  getProcessedCount(): number {
    return this.processedCount;
  }

  /**
   * Get scheduling history for a type
   */
  getHistory(type: string): ScheduleResult[] {
    return this.schedulingHistory.get(type) || [];
  }

  /**
   * Clear scheduling history
   */
  clearHistory(): void {
    this.schedulingHistory.clear();
  }
}

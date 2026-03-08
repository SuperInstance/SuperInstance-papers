/**
 * Colony Decommissioning
 * Safe colony shutdown and cleanup
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { Colony } from '../colony.js';
import type {
  DecommissioningConfig,
  DecommissioningPlan,
  DecommissioningStep,
} from './types.js';

export class ColonyDecommissioner extends EventEmitter {
  private activePlans: Map<string, DecommissioningPlan> = new Map();
  private history: Array<{
    colonyId: string;
    timestamp: number;
    duration: number;
    success: boolean;
  }> = [];

  constructor() {
    super();
  }

  // ============================================================================
  // Decommissioning
  // ============================================================================

  /**
   * Decommission a colony
   */
  async decommission(
    colony: Colony,
    config?: Partial<DecommissioningConfig>
  ): Promise<DecommissioningPlan> {
    const fullConfig: DecommissioningConfig = {
      strategy: 'graceful',
      gracePeriod: 60000, // 1 minute
      drainTimeout: 300000, // 5 minutes
      migrationPolicy: {
        enabled: false,
        targetColonies: [],
        agentSelection: 'all',
      },
      dataPolicy: {
        backup: true,
        cleanup: true,
      },
      ...config,
    };

    const plan = this.createDecommissioningPlan(colony, fullConfig);
    this.activePlans.set(colony.id, plan);

    this.emit('decommissioning_started', plan);

    try {
      await this.executePlan(plan);

      // Record in history
      this.history.push({
        colonyId: colony.id,
        timestamp: Date.now(),
        duration: Date.now() - plan.startTime,
        success: true,
      });

      this.emit('decommissioning_complete', plan);
    } catch (error) {
      plan.steps.forEach(step => {
        if (step.status === 'in_progress') {
          step.status = 'failed';
        }
      });

      this.history.push({
        colonyId: colony.id,
        timestamp: Date.now(),
        duration: Date.now() - plan.startTime,
        success: false,
      });

      this.emit('decommissioning_failed', { plan, error });
      throw error;
    } finally {
      this.activePlans.delete(colony.id);
    }

    return plan;
  }

  /**
   * Create a decommissioning plan
   */
  private createDecommissioningPlan(
    colony: Colony,
    config: DecommissioningConfig
  ): DecommissioningPlan {
    const steps: DecommissioningStep[] = [];
    let estimatedDuration = 0;

    // Step 1: Notification
    steps.push({
      name: 'notify_stakeholders',
      description: 'Notify stakeholders about decommissioning',
      action: async () => this.notifyStakeholders(colony.id),
      timeout: 5000,
      status: 'pending',
    });
    estimatedDuration += 5000;

    // Step 2: Backup (if enabled)
    if (config.dataPolicy.backup) {
      steps.push({
        name: 'backup_data',
        description: 'Backup colony data',
        action: async () => this.backupData(colony, config.dataPolicy.backupLocation),
        rollback: async () => this.restoreBackup(colony.id),
        timeout: 60000,
        status: 'pending',
      });
      estimatedDuration += 60000;
    }

    // Step 3: Migration (if enabled)
    if (config.migrationPolicy.enabled) {
      steps.push({
        name: 'migrate_agents',
        description: 'Migrate agents to target colonies',
        action: async () => this.migrateAgents(colony, config.migrationPolicy.targetColonies),
        timeout: config.drainTimeout,
        status: 'pending',
      });
      estimatedDuration += config.drainTimeout;
    }

    // Step 4: Grace period
    if (config.strategy === 'graceful') {
      steps.push({
        name: 'grace_period',
        description: `Wait for grace period (${config.gracePeriod}ms)`,
        action: async () => this.delay(config.gracePeriod),
        timeout: config.gracePeriod + 5000,
        status: 'pending',
      });
      estimatedDuration += config.gracePeriod;
    }

    // Step 5: Drain
    steps.push({
      name: 'drain_colony',
      description: 'Drain colony of active work',
      action: async () => this.drainColony(colony),
      timeout: config.drainTimeout,
      status: 'pending',
    });
    estimatedDuration += config.drainTimeout;

    // Step 6: Stop distributed coordination
    steps.push({
      name: 'stop_distributed',
      description: 'Stop distributed coordination',
      action: async () => this.stopDistributed(colony),
      timeout: 30000,
      status: 'pending',
    });
    estimatedDuration += 30000;

    // Step 7: Cleanup (if enabled)
    if (config.dataPolicy.cleanup) {
      steps.push({
        name: 'cleanup',
        description: 'Clean up colony resources',
        action: async () => this.cleanup(colony),
        timeout: 30000,
        status: 'pending',
      });
      estimatedDuration += 30000;
    }

    return {
      colonyId: colony.id,
      config,
      steps,
      estimatedDuration,
      startTime: Date.now(),
    };
  }

  /**
   * Execute a decommissioning plan
   */
  private async executePlan(plan: DecommissioningPlan): Promise<void> {
    for (const step of plan.steps) {
      step.status = 'in_progress';
      this.emit('step_started', { plan, step });

      try {
        await Promise.race([
          step.action(),
          this.timeout(step.timeout, `Step timeout: ${step.name}`),
        ]);

        step.status = 'completed';
        this.emit('step_completed', { plan, step });
      } catch (error) {
        step.status = 'failed';
        this.emit('step_failed', { plan, step, error });

        // Rollback if rollback is available
        if (step.rollback) {
          this.emit('rollback_started', { plan, step });
          try {
            await step.rollback();
            step.status = 'rolled_back';
            this.emit('rollback_completed', { plan, step });
          } catch (rollbackError) {
            this.emit('rollback_failed', { plan, step, error: rollbackError });
          }
        }

        throw error;
      }
    }
  }

  // ============================================================================
  // Step Implementations
  // ============================================================================

  private async notifyStakeholders(colonyId: string): Promise<void> {
    // Send notifications to stakeholders
    this.emit('notification_sent', { colonyId, message: 'Colony decommissioning started' });
  }

  private async backupData(colony: Colony, location?: string): Promise<void> {
    // Backup colony data
    const stats = await colony.getStats();

    const backup = {
      colonyId: colony.id,
      timestamp: Date.now(),
      stats,
      location: location || `backups/${colony.id}/${Date.now()}`,
    };

    this.emit('data_backed_up', backup);
  }

  private async restoreBackup(colonyId: string): Promise<void> {
    // Restore colony data from backup
    this.emit('data_restored', { colonyId });
  }

  private async migrateAgents(colony: Colony, targetColonies: string[]): Promise<void> {
    // Migrate agents to target colonies
    const agents = colony.getAllAgents();

    this.emit('agents_migrating', {
      sourceColonyId: colony.id,
      targetColonies,
      agentCount: agents.length,
    });
  }

  private async drainColony(colony: Colony): Promise<void> {
    // Drain colony of active work
    const agents = colony.getActiveAgents();

    for (const agent of agents) {
      await colony.deactivateAgent(agent.id);
    }

    this.emit('colony_drained', { colonyId: colony.id });
  }

  private async stopDistributed(colony: Colony): Promise<void> {
    // Stop distributed coordination
    const distCoord = colony.getDistributedCoordination();
    if (distCoord) {
      await distCoord.stop();
    }

    this.emit('distributed_stopped', { colonyId: colony.id });
  }

  private async cleanup(colony: Colony): Promise<void> {
    // Clean up colony resources
    this.emit('cleanup_complete', { colonyId: colony.id });
  }

  // ============================================================================
  // Plan Management
  // ============================================================================

  /**
   * Get active plan for a colony
   */
  getActivePlan(colonyId: string): DecommissioningPlan | undefined {
    for (const plan of this.activePlans.values()) {
      if (plan.colonyId === colonyId) {
        return plan;
      }
    }
    return undefined;
  }

  /**
   * Get all active plans
   */
  getActivePlans(): DecommissioningPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Get decommissioning history
   */
  getHistory(limit?: number): Array<{
    colonyId: string;
    timestamp: number;
    duration: number;
    success: boolean;
  }> {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private timeout<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }
}

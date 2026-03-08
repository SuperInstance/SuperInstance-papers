/**
 * Colony Migration
 * Migrate agents between colonies
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { Colony } from '../colony.js';
import type {
  MigrationConfig,
  MigrationPlan,
  MigrationStep,
  MigrationIssue,
  MigrationState,
  RollbackPlan,
} from './types.js';

export class ColonyMigrator extends EventEmitter {
  private activeMigrations: Map<string, MigrationPlan> = new Map();
  private migrationHistory: Array<{
    id: string;
    timestamp: number;
    duration: number;
    success: boolean;
    sourceColonyId: string;
    targetColonyId: string;
    agentCount: number;
  }> = [];

  constructor() {
    super();
  }

  // ============================================================================
  // Migration
  // ============================================================================

  /**
   * Migrate agents between colonies
   */
  async migrate(
    sourceColony: Colony,
    targetColony: Colony,
    agentIds: string[],
    config?: Partial<MigrationConfig>
  ): Promise<MigrationPlan> {
    const fullConfig: MigrationConfig = {
      sourceColonyId: sourceColony.id,
      targetColonyId: targetColony.id,
      agents: agentIds,
      strategy: 'live',
      validation: true,
      rollbackOnFailure: true,
      timeout: 300000, // 5 minutes
      ...config,
    };

    const plan = this.createMigrationPlan(fullConfig);
    this.activeMigrations.set(plan.id, plan);

    this.emit('migration_started', plan);

    try {
      await this.executeMigration(plan, sourceColony, targetColony);

      // Record in history
      this.migrationHistory.push({
        id: plan.id,
        timestamp: Date.now(),
        duration: Date.now() - plan.startTime,
        success: true,
        sourceColonyId: sourceColony.id,
        targetColonyId: targetColony.id,
        agentCount: agentIds.length,
      });

      this.emit('migration_complete', plan);
    } catch (error) {
      // Record failed migration
      this.migrationHistory.push({
        id: plan.id,
        timestamp: Date.now(),
        duration: Date.now() - plan.startTime,
        success: false,
        sourceColonyId: sourceColony.id,
        targetColonyId: targetColony.id,
        agentCount: agentIds.length,
      });

      this.emit('migration_failed', { plan, error });
      throw error;
    }

    return plan;
  }

  /**
   * Create a migration plan
   */
  private createMigrationPlan(config: MigrationConfig): MigrationPlan {
    const steps: MigrationStep[] = [];
    let estimatedDuration = 0;
    let estimatedCompletion = Date.now();

    // Step 1: Validation
    if (config.validation) {
      steps.push({
        id: uuidv4(),
        name: 'validate',
        description: 'Validate migration preconditions',
        action: async () => this.validateMigration(config),
        timeout: 30000,
        status: 'pending',
      });
      estimatedDuration += 30000;
    }

    // Step 2: Prepare source
    steps.push({
      id: uuidv4(),
      name: 'prepare_source',
      description: 'Prepare source colony for migration',
      action: async () => this.prepareSource(config),
      rollback: async () => this.restoreSource(config),
      timeout: 60000,
      status: 'pending',
    });
    estimatedDuration += 60000;

    // Step 3: Prepare target
    steps.push({
      id: uuidv4(),
      name: 'prepare_target',
      description: 'Prepare target colony for migration',
      action: async () => this.prepareTarget(config),
      rollback: async () => this.cleanupTarget(config),
      timeout: 60000,
      status: 'pending',
    });
    estimatedDuration += 60000;

    // Step 4: Migrate agents
    const migrationTime = config.estimatedTimePerAgent
      ? config.estimatedTimePerAgent * config.agents.length
      : config.agents.length * 10000; // Default 10s per agent

    for (const agentId of config.agents) {
      steps.push({
        id: uuidv4(),
        name: `migrate_agent_${agentId}`,
        description: `Migrate agent ${agentId}`,
        agentId,
        action: async () => this.migrateAgent(config, agentId),
        rollback: async () => this.rollbackAgent(config, agentId),
        timeout: 30000,
        status: 'pending',
      });
      estimatedDuration += migrationTime / config.agents.length;
    }

    // Step 5: Verification
    steps.push({
      id: uuidv4(),
      name: 'verify',
      description: 'Verify migration success',
      action: async () => this.verifyMigration(config),
      timeout: 60000,
      status: 'pending',
    });
    estimatedDuration += 60000;

    estimatedCompletion += estimatedDuration;

    // Create rollback plan
    const rollbackPlan: RollbackPlan = {
      steps: [
        { description: 'Rollback agent migrations', action: async () => this.rollbackAgents(config) },
        { description: 'Cleanup target colony', action: async () => this.cleanupTarget(config) },
        { description: 'Restore source colony', action: async () => this.restoreSource(config) },
      ],
      estimatedDuration: estimatedDuration * 0.8, // Rollback is typically faster
    };

    return {
      id: uuidv4(),
      config,
      state: 'pending',
      steps,
      progress: 0,
      startTime: Date.now(),
      estimatedCompletion,
      issues: [],
      rollbackPlan: config.rollbackOnFailure ? rollbackPlan : undefined,
    };
  }

  /**
   * Execute a migration plan
   */
  private async executeMigration(
    plan: MigrationPlan,
    sourceColony: Colony,
    targetColony: Colony
  ): Promise<void> {
    plan.state = 'validating';

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      step.status = 'in_progress';
      step.startTime = Date.now();

      this.emit('step_started', { plan, step });

      try {
        await Promise.race([
          step.action(),
          this.timeout(plan.config.timeout, `Step timeout: ${step.name}`),
        ]);

        step.status = 'completed';
        step.endTime = Date.now();
        plan.progress = ((i + 1) / plan.steps.length) * 100;

        this.emit('step_completed', { plan, step });
      } catch (error) {
        step.status = 'failed';
        step.endTime = Date.now();
        step.error = error instanceof Error ? error.message : String(error);

        const issue: MigrationIssue = {
          severity: 'error',
          stepId: step.id,
          agentId: step.agentId,
          message: step.error,
          timestamp: Date.now(),
          resolved: false,
        };
        plan.issues.push(issue);

        this.emit('step_failed', { plan, step, error });

        // Rollback if enabled
        if (plan.rollbackPlan && plan.config.rollbackOnFailure) {
          plan.state = 'rolling_back';
          await this.executeRollback(plan);
          plan.state = 'rolled_back';
        } else {
          plan.state = 'failed';
        }

        throw error;
      }
    }

    plan.state = 'completed';
    plan.progress = 100;
  }

  /**
   * Execute rollback plan
   */
  private async executeRollback(plan: MigrationPlan): Promise<void> {
    this.emit('rollback_started', plan);

    if (!plan.rollbackPlan) {
      return;
    }

    for (const step of plan.rollbackPlan.steps) {
      try {
        await step.action();
        this.emit('rollback_step_completed', { plan, description: step.description });
      } catch (error) {
        this.emit('rollback_step_failed', {
          plan,
          description: step.description,
          error,
        });
      }
    }

    this.emit('rollback_complete', plan);
  }

  // ============================================================================
  // Step Implementations
  // ============================================================================

  private async validateMigration(config: MigrationConfig): Promise<void> {
    // Validate source colony exists and is accessible
    // Validate target colony exists and is accessible
    // Validate agents exist in source colony
    // Validate target colony has capacity
    // Validate network connectivity

    this.emit('migration_validated', { config });
  }

  private async prepareSource(config: MigrationConfig): Promise<void> {
    // Prepare source colony for migration
    // Mark agents as migrating
    // Pause agent activity if needed

    this.emit('source_prepared', { config });
  }

  private async prepareTarget(config: MigrationConfig): Promise<void> {
    // Prepare target colony for migration
    // Allocate resources
    // Register agent types

    this.emit('target_prepared', { config });
  }

  private async migrateAgent(config: MigrationConfig, agentId: string): Promise<void> {
    // Migrate a single agent
    // Extract agent state and configuration
    // Transfer to target colony
    // Activate agent in target colony
    // Deactivate agent in source colony

    this.emit('agent_migrated', { config, agentId });
  }

  private async rollbackAgent(config: MigrationConfig, agentId: string): Promise<void> {
    // Rollback a single agent migration
    this.emit('agent_rollback', { config, agentId });
  }

  private async verifyMigration(config: MigrationConfig): Promise<void> {
    // Verify all agents migrated successfully
    // Verify agents are active in target colony
    // Verify agents are deactivated in source colony
    // Verify data integrity

    this.emit('migration_verified', { config });
  }

  private async rollbackAgents(config: MigrationConfig): Promise<void> {
    // Rollback all agent migrations
    this.emit('agents_rolled_back', { config });
  }

  private async cleanupTarget(config: MigrationConfig): Promise<void> {
    // Cleanup target colony
    this.emit('target_cleaned', { config });
  }

  private async restoreSource(config: MigrationConfig): Promise<void> {
    // Restore source colony state
    this.emit('source_restored', { config });
  }

  // ============================================================================
  // Migration Management
  // ============================================================================

  /**
   * Get active migration
   */
  getMigration(migrationId: string): MigrationPlan | undefined {
    return this.activeMigrations.get(migrationId);
  }

  /**
   * Get all active migrations
   */
  getActiveMigrations(): MigrationPlan[] {
    return Array.from(this.activeMigrations.values());
  }

  /**
   * Get migrations for a colony
   */
  getMigrationsForColony(colonyId: string): MigrationPlan[] {
    return this.getActiveMigrations().filter(
      m => m.config.sourceColonyId === colonyId || m.config.targetColonyId === colonyId
    );
  }

  /**
   * Cancel a migration
   */
  async cancelMigration(migrationId: string): Promise<boolean> {
    const plan = this.activeMigrations.get(migrationId);
    if (!plan) {
      return false;
    }

    // Only allow cancellation if not already completed
    if (plan.state === 'completed' || plan.state === 'rolled_back') {
      return false;
    }

    // Execute rollback if available
    if (plan.rollbackPlan) {
      await this.executeRollback(plan);
    }

    plan.state = 'rolled_back';
    this.activeMigrations.delete(migrationId);

    this.emit('migration_cancelled', plan);

    return true;
  }

  /**
   * Get migration history
   */
  getHistory(limit?: number): Array<{
    id: string;
    timestamp: number;
    duration: number;
    success: boolean;
    sourceColonyId: string;
    targetColonyId: string;
    agentCount: number;
  }> {
    if (limit) {
      return this.migrationHistory.slice(-limit);
    }
    return [...this.migrationHistory];
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private timeout<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }
}

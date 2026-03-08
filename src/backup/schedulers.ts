/**
 * Backup Scheduler
 * Manages automated backup schedules
 */

import { EventEmitter } from 'events';
import cron from 'node-cron';

import type { BackupManager } from './backup-manager.js';
import type { BackupSchedule, BackupType } from './types.js';

export interface SchedulerConfig {
  manager: BackupManager;
  schedule: BackupSchedule;
  timezone?: string;
}

/**
 * BackupScheduler - Scheduled backup execution
 */
export class BackupScheduler extends EventEmitter {
  private manager: BackupManager;
  private schedule: BackupSchedule;
  private timezone: string;

  // Scheduled tasks
  private fullBackupTask?: cron.ScheduledTask;
  private incrementalBackupTask?: cron.ScheduledTask;
  private differentialBackupTask?: cron.ScheduledTask;

  // Snapshot triggers
  private snapshotTriggers: Map<string, any>;

  constructor(config: SchedulerConfig) {
    super();

    this.manager = config.manager;
    this.schedule = config.schedule;
    this.timezone = config.timezone || 'UTC';
    this.snapshotTriggers = new Map();
  }

  /**
   * Start scheduler
   */
  async start(): Promise<void> {
    try {
      // Schedule full backups
      if (this.schedule.full.enabled) {
        this.fullBackupTask = this.scheduleTask(
          this.schedule.full.cron,
          'FULL',
          'Scheduled full backup'
        );
      }

      // Schedule incremental backups
      if (this.schedule.incremental.enabled) {
        this.incrementalBackupTask = this.scheduleTask(
          this.schedule.incremental.cron,
          'INCREMENTAL',
          'Scheduled incremental backup'
        );
      }

      // Schedule differential backups
      if (this.schedule.differential?.enabled) {
        this.differentialBackupTask = this.scheduleTask(
          this.schedule.differential.cron,
          'DIFFERENTIAL',
          'Scheduled differential backup'
        );
      }

      // Set up snapshot triggers
      if (this.schedule.snapshot?.enabled) {
        this.setupSnapshotTriggers();
      }

      this.emit('scheduler_started', {
        full: this.schedule.full.cron,
        incremental: this.schedule.incremental.cron,
        differential: this.schedule.differential?.cron
      });
    } catch (error) {
      this.emit('schedule_error', error);
      throw error;
    }
  }

  /**
   * Stop scheduler
   */
  async stop(): Promise<void> {
    // Stop all scheduled tasks
    if (this.fullBackupTask) {
      this.fullBackupTask.stop();
    }
    if (this.incrementalBackupTask) {
      this.incrementalBackupTask.stop();
    }
    if (this.differentialBackupTask) {
      this.differentialBackupTask.stop();
    }

    // Clear snapshot triggers
    for (const [id, trigger] of this.snapshotTriggers) {
      if (trigger.cleanup) {
        await trigger.cleanup();
      }
    }
    this.snapshotTriggers.clear();

    this.emit('scheduler_stopped');
  }

  /**
   * Schedule a backup task
   */
  private scheduleTask(
    cronExpression: string,
    type: BackupType,
    reason: string
  ): cron.ScheduledTask {
    const task = cron.schedule(
      cronExpression,
      async () => {
        this.emit('scheduled_backup', { type, reason });
      },
      {
        scheduled: true,
        timezone: this.timezone
      }
    );

    return task;
  }

  /**
   * Set up snapshot triggers
   */
  private setupSnapshotTriggers(): void {
    if (!this.schedule.snapshot) return;

    for (const trigger of this.schedule.snapshot.triggers) {
      switch (trigger.type) {
        case 'EVENT':
          this.setupEventTrigger(trigger);
          break;
        case 'CONDITION':
          this.setupConditionTrigger(trigger);
          break;
        case 'MANUAL':
          // Manual triggers are invoked on demand
          this.snapshotTriggers.set(trigger.label || 'manual', trigger);
          break;
      }
    }
  }

  /**
   * Set up event-based trigger
   */
  private setupEventTrigger(trigger: any): void {
    const eventId = `event:${trigger.event}`;

    // Listen for colony events
    this.manager.colony.on(trigger.event, async () => {
      this.emit('scheduled_backup', {
        type: 'SNAPSHOT',
        reason: `Event trigger: ${trigger.event}`,
        tags: ['trigger', 'event', trigger.event]
      });
    });

    this.snapshotTriggers.set(eventId, { type: 'event', event: trigger.event });
  }

  /**
   * Set up condition-based trigger
   */
  private setupConditionTrigger(trigger: any): void {
    // Periodically check condition
    const checkInterval = setInterval(async () => {
      const shouldTrigger = await this.evaluateCondition(trigger.condition);
      if (shouldTrigger) {
        this.emit('scheduled_backup', {
          type: 'SNAPSHOT',
          reason: `Condition met: ${trigger.condition}`,
          tags: ['trigger', 'condition']
        });
      }
    }, 60000); // Check every minute

    this.snapshotTriggers.set(`condition:${trigger.condition}`, {
      type: 'condition',
      condition: trigger.condition,
      cleanup: () => clearInterval(checkInterval)
    });
  }

  /**
   * Evaluate condition
   */
  private async evaluateCondition(condition: string): Promise<boolean> {
    // Simple condition evaluation
    // In production, use a proper expression parser

    if (condition.includes('value_network_update >')) {
      const threshold = parseFloat(condition.split('>')[1]);
      const stats = await this.manager.colony.getStats();
      // This is a placeholder - actual implementation would check value network
      return false;
    }

    return false;
  }

  /**
   * Trigger manual snapshot
   */
  async triggerManualSnapshot(label?: string): Promise<void> {
    const trigger = Array.from(this.snapshotTriggers.values())
      .find(t => t.type === 'MANUAL' && (!label || t.label === label));

    if (!trigger) {
      throw new Error(`Manual snapshot trigger not found: ${label}`);
    }

    this.emit('scheduled_backup', {
      type: 'SNAPSHOT',
      reason: `Manual snapshot: ${label || 'on-demand'}`,
      tags: ['manual', label || 'on-demand']
    });
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    schedules: {
      full: boolean;
      incremental: boolean;
      differential: boolean;
      snapshotTriggers: number;
    };
    timezone: string;
  } {
    return {
      running: this.fullBackupTask !== undefined,
      schedules: {
        full: this.fullBackupTask !== undefined,
        incremental: this.incrementalBackupTask !== undefined,
        differential: this.differentialBackupTask !== undefined,
        snapshotTriggers: this.snapshotTriggers.size
      },
      timezone: this.timezone
    };
  }
}

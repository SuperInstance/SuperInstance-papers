/**
 * POLLN Disaster Recovery System
 *
 * Comprehensive backup, restore, and failover capabilities for POLLN colonies.
 *
 * @module disaster-recovery
 *
 * Features:
 * - Automated backup scheduling (full, incremental, snapshot)
 * - Multi-region storage backends (local, S3, GCS, Azure)
 * - Backup validation and integrity checking
 * - Restore with consistency validation
 * - Version migration support
 * - Automatic failover with health monitoring
 * - Hot/cold standby strategies
 * - Multi-active configurations
 * - RTO < 15min, RPO < 5min
 * - 99.99% durability target
 *
 * @example
 * ```typescript
 * import { DisasterRecoverySystem } from './disaster-recovery.js';
 *
 * const dr = new DisasterRecoverySystem({
 *   colony: myColony,
 *   backup: { ... },
 *   failover: { ... }
 * });
 *
 * await dr.start();
 *
 * // Create backup
 * const backup = await dr.backupManager.createBackup({ type: 'FULL' });
 *
 * // Trigger failover
 * await dr.failoverOrchestrator.manualFailover('us-west-2', 'Region failure');
 * ```
 */

// Backup System
export * from './backup/index.js';

// Restore System
export * from './restore/index.js';

// Failover System
export * from './failover/index.js';

// Monitoring
export * from './monitoring/dr-metrics.js';

// Combined DR System
import { BackupManager } from './backup/backup-manager.js';
import { RestoreManager } from './restore/restore-manager.js';
import { FailoverOrchestrator } from './failover/orchestrator.js';
import { DRMetricsCollector } from './monitoring/dr-metrics.js';
import type { Colony } from './core/colony.js';

export interface DisasterRecoveryConfig {
  colony: Colony;

  // Backup configuration
  backup: {
    enabled: boolean;
    schedule: any;
    retention: any;
    storage: any;
    content: any;
  };

  // Failover configuration
  failover: {
    enabled: boolean;
    mode: 'HOT_STANDBY' | 'COLD_STANDBY' | 'MULTI_ACTIVE';
    primaryRegion: string;
    secondaryRegions: string[];
    autoFailover: boolean;
    healthCheckInterval: number;
    failureThreshold: number;
  };

  // Monitoring configuration
  monitoring: {
    alertThresholds: any;
    notificationChannels: any[];
  };
}

/**
 * Complete Disaster Recovery System
 */
export class DisasterRecoverySystem {
  public readonly backupManager: BackupManager;
  public readonly restoreManager: RestoreManager;
  public readonly failoverOrchestrator: FailoverOrchestrator;
  public readonly metricsCollector: DRMetricsCollector;

  private config: DisasterRecoveryConfig;
  private running: boolean;

  constructor(config: DisasterRecoveryConfig) {
    this.config = config;

    // Initialize backup manager
    this.backupManager = new BackupManager({
      colony: config.colony,
      config: config.backup,
      storageBackends: new Map() // Would be populated with actual storage backends
    });

    // Initialize restore manager
    this.restoreManager = new RestoreManager({
      colony: config.colony,
      backupManager: this.backupManager
    });

    // Initialize failover orchestrator
    this.failoverOrchestrator = new FailoverOrchestrator({
      colony: config.colony,
      backupManager: this.backupManager,
      restoreManager: this.restoreManager,
      config: config.failover
    });

    // Initialize metrics collector
    this.metricsCollector = new DRMetricsCollector(config.monitoring);

    this.running = false;

    // Wire up event handlers for metrics
    this.setupMetricCollection();
  }

  /**
   * Start disaster recovery system
   */
  async start(): Promise<void> {
    if (this.running) return;

    // Start backup manager
    if (this.config.backup.enabled) {
      await this.backupManager.start();
    }

    // Start failover orchestrator
    if (this.config.failover.enabled) {
      await this.failoverOrchestrator.start();
    }

    this.running = true;

    // Emit DR system started event
    this.metricsCollector.emit('dr_system_started', {
      colonyId: this.config.colony.id,
      backupEnabled: this.config.backup.enabled,
      failoverEnabled: this.config.failover.enabled,
      failoverMode: this.config.failover.mode
    });
  }

  /**
   * Stop disaster recovery system
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    // Stop backup manager
    await this.backupManager.stop();

    // Stop failover orchestrator
    await this.failoverOrchestrator.stop();

    this.running = false;
  }

  /**
   * Get DR status
   */
  getDRStatus() {
    return {
      running: this.running,
      backup: this.backupManager.getStats(),
      failover: this.failoverOrchestrator.getStatus(),
      metrics: this.metricsCollector.getDRStatus()
    };
  }

  /**
   * Set up metric collection
   */
  private setupMetricCollection(): void {
    // Backup events
    this.backupManager.on('backup_completed', (data) => {
      this.metricsCollector.recordBackupCreated({
        id: data.metadata.id,
        type: data.metadata.type,
        sizeBytes: data.metrics.sizeBytes,
        duration: data.metrics.duration,
        success: data.success
      });
    });

    this.backupManager.on('backup_failed', (data) => {
      this.metricsCollector.recordBackupCreated({
        id: data.metadata.id,
        type: data.metadata.type,
        sizeBytes: data.metrics.sizeBytes,
        duration: data.metrics.duration || 0,
        success: false
      });
    });

    // Restore events
    this.restoreManager.on('restore_completed', (data) => {
      this.metricsCollector.recordRestoreExecuted({
        backupId: data.backupId,
        mode: 'FULL',
        duration: data.duration || 0,
        success: data.status === 'COMPLETED',
        dataLoss: false
      });
    });

    // Failover events
    this.failoverOrchestrator.on('failover_completed', (data) => {
      if (data.result) {
        this.metricsCollector.recordFailoverExecuted({
          eventId: data.event.id,
          duration: data.result.downtime,
          success: data.result.success,
          targetRegion: data.event.targetRegion,
          reason: data.event.reason
        });
      }
    });
  }
}

/**
 * Create a disaster recovery system
 */
export async function createDisasterRecovery(
  config: DisasterRecoveryConfig
): Promise<DisasterRecoverySystem> {
  const dr = new DisasterRecoverySystem(config);
  await dr.start();
  return dr;
}

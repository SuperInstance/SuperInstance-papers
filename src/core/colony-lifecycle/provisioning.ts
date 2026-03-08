/**
 * Colony Provisioning
 * Provision new colonies
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { Colony } from '../colony.js';
import type {
  ProvisioningConfig,
  ProvisioningRequest,
  ProvisioningResult,
} from './types.js';

export class ColonyProvisioner extends EventEmitter {
  private defaultConfig: ProvisioningConfig;
  private pendingRequests: Map<string, ProvisioningRequest> = new Map();
  private provisioningHistory: ProvisioningResult[] = [];

  constructor(config?: Partial<ProvisioningConfig>) {
    super();

    this.defaultConfig = {
      strategy: 'immediate',
      timeout: 300000, // 5 minutes
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000,
      },
      validation: {
        checkResources: true,
        checkDependencies: true,
        runHealthCheck: true,
      },
      ...config,
    };
  }

  // ============================================================================
  // Provisioning
  // ============================================================================

  /**
   * Provision a new colony
   */
  async provision(
    config: ProvisioningRequest['config'],
    options?: Partial<ProvisioningConfig>
  ): Promise<ProvisioningResult> {
    const startTime = Date.now();
    const provisioningConfig = { ...this.defaultConfig, ...options };

    const request: ProvisioningRequest = {
      id: uuidv4(),
      config,
      strategy: provisioningConfig.strategy,
      priority: 0.5,
      metadata: {},
    };

    this.pendingRequests.set(request.id, request);
    this.emit('provisioning_started', request);

    try {
      let colony: Colony | null = null;

      switch (request.strategy) {
        case 'immediate':
          colony = await this.provisionImmediate(config, provisioningConfig);
          break;
        case 'delayed':
          colony = await this.provisionDelayed(config, provisioningConfig);
          break;
        case 'scheduled':
          colony = await this.provisionScheduled(config, provisioningConfig, request.scheduledTime);
          break;
      }

      const result: ProvisioningResult = {
        success: true,
        colonyId: colony?.id,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };

      this.provisioningHistory.push(result);
      this.pendingRequests.delete(request.id);
      this.emit('provisioning_complete', result);

      return result;
    } catch (error) {
      const result: ProvisioningResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };

      this.provisioningHistory.push(result);
      this.pendingRequests.delete(request.id);
      this.emit('provisioning_failed', result);

      return result;
    }
  }

  /**
   * Provision colony immediately
   */
  private async provisionImmediate(
    config: ColonyConfig,
    provisioningConfig: ProvisioningConfig
  ): Promise<Colony> {
    // Validate
    if (provisioningConfig.validation.checkResources) {
      await this.validateResources(config);
    }

    if (provisioningConfig.validation.checkDependencies) {
      await this.validateDependencies(config);
    }

    // Create colony
    const { Colony } = await import('../colony.js');
    const colony = new Colony(config);

    // Health check
    if (provisioningConfig.validation.runHealthCheck) {
      await this.runHealthCheck(colony);
    }

    return colony;
  }

  /**
   * Provision colony with delay
   */
  private async provisionDelayed(
    config: ColonyConfig,
    provisioningConfig: ProvisioningConfig
  ): Promise<Colony> {
    // Wait for a short delay before provisioning
    await this.delay(1000);

    return this.provisionImmediate(config, provisioningConfig);
  }

  /**
   * Provision colony at scheduled time
   */
  private async provisionScheduled(
    config: ColonyConfig,
    provisioningConfig: ProvisioningConfig,
    scheduledTime?: number
  ): Promise<Colony> {
    if (scheduledTime && scheduledTime > Date.now()) {
      const delay = scheduledTime - Date.now();
      await this.delay(delay);
    }

    return this.provisionImmediate(config, provisioningConfig);
  }

  // ============================================================================
  // Validation
  // ============================================================================

  private async validateResources(config: ColonyConfig): Promise<void> {
    // Check if required resources are available
    // This would integrate with the resource tracker
    const { ColonyOrchestrator } = await import('../colony-manager/index.js');

    // Placeholder validation
    if (config.resourceBudget.totalCompute <= 0) {
      throw new Error('Invalid compute budget');
    }

    if (config.resourceBudget.totalMemory <= 0) {
      throw new Error('Invalid memory budget');
    }
  }

  private async validateDependencies(config: ColonyConfig): Promise<void> {
    // Check if all dependencies are available
    // This would check for required services, databases, etc.

    if (config.distributed) {
      // Validate distributed backend is available
      const backend = config.distributedConfig?.backend;
      if (backend && backend !== 'memory') {
        // Would check if backend is accessible
      }
    }
  }

  private async runHealthCheck(colony: Colony): Promise<void> {
    // Run basic health checks on the colony
    const stats = await colony.getStats();

    if (stats.totalAgents < 0) {
      throw new Error('Invalid agent count');
    }
  }

  // ============================================================================
  // Request Management
  // ============================================================================

  /**
   * Get a pending request
   */
  getRequest(requestId: string): ProvisioningRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  /**
   * Get all pending requests
   */
  getPendingRequests(): ProvisioningRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * Cancel a request
   */
  async cancelRequest(requestId: string): Promise<boolean> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return false;
    }

    this.pendingRequests.delete(requestId);
    this.emit('request_cancelled', request);

    return true;
  }

  // ============================================================================
  // History
  // ============================================================================

  /**
   * Get provisioning history
   */
  getHistory(limit?: number): ProvisioningResult[] {
    if (limit) {
      return this.provisioningHistory.slice(-limit);
    }
    return [...this.provisioningHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.provisioningHistory = [];
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

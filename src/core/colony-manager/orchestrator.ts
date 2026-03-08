/**
 * Colony Orchestrator
 * Central coordinator for multi-colony management
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  ColonyManagerConfig,
  ColonyInstance,
  ColonyInstanceState,
  OrchestrationEvent,
  OrchestrationEventType,
  ManagerMetrics,
  Colony,
  ColonyConfig,
} from './types.js';
import { ColonyScheduler } from './scheduler.js';
import { ColonyLoadBalancer } from './load-balancer.js';
import { ResourceTracker } from './resource-tracker.js';
import { HealthMonitor } from './health-monitor.js';

export class ColonyOrchestrator extends EventEmitter {
  public readonly id: string;
  public readonly config: ColonyManagerConfig;

  private colonies: Map<string, ColonyInstance> = new Map();
  private scheduler: ColonyScheduler;
  private loadBalancer: ColonyLoadBalancer;
  private resourceTracker: ResourceTracker;
  private healthMonitor: HealthMonitor;
  private startTime: number;

  constructor(config: ColonyManagerConfig) {
    super();
    this.id = config.id || uuidv4();
    this.config = config;
    this.startTime = Date.now();

    // Initialize subsystems
    this.scheduler = new ColonyScheduler(this);
    this.loadBalancer = new ColonyLoadBalancer(this, config.loadBalancingStrategy);
    this.resourceTracker = new ResourceTracker(this, config.resourceBudget);
    this.healthMonitor = new HealthMonitor(this, config.healthCheckInterval);

    // Start health monitoring
    this.healthMonitor.start();
  }

  // ============================================================================
  // Colony Lifecycle
  // ============================================================================

  /**
   * Provision a new colony
   */
  async provisionColony(config: ColonyConfig): Promise<ColonyInstance> {
    const colonyId = config.id || uuidv4();

    // Check max colonies limit
    if (this.colonies.size >= this.config.maxColonies) {
      throw new Error(`Maximum colonies limit reached: ${this.config.maxColonies}`);
    }

    // Check resource availability
    const available = this.resourceTracker.getAvailableResources();
    if (
      config.resourceBudget.totalCompute > available.compute ||
      config.resourceBudget.totalMemory > available.memory ||
      config.resourceBudget.totalNetwork > available.network
    ) {
      throw new Error('Insufficient resources to provision colony');
    }

    // Create colony instance
    const instance: ColonyInstance = {
      id: colonyId,
      colony: new Colony(config),
      config,
      state: 'provisioning',
      health: {
        status: 'unknown',
        score: 0,
        issues: [],
        lastCheck: Date.now(),
      },
      resources: {
        compute: {
          total: config.resourceBudget.totalCompute,
          used: 0,
          available: config.resourceBudget.totalCompute,
          utilization: 0,
        },
        memory: {
          total: config.resourceBudget.totalMemory,
          used: 0,
          available: config.resourceBudget.totalMemory,
          utilization: 0,
        },
        network: {
          total: config.resourceBudget.totalNetwork,
          used: 0,
          available: config.resourceBudget.totalNetwork,
          utilization: 0,
        },
      },
      metadata: {
        name: config.name,
        description: `Colony ${config.name}`,
        tags: [],
        version: '1.0.0',
        gardenerId: config.gardenerId,
      },
      createdAt: Date.now(),
      lastHealthCheck: Date.now(),
    };

    // Register colony
    this.colonies.set(colonyId, instance);

    // Update resource tracking
    this.resourceTracker.allocateResources(colonyId, config.resourceBudget);

    // Emit event
    this.emitEvent('colony_provisioned', { colonyId, config });

    // Start colony
    await this.startColony(colonyId);

    return instance;
  }

  /**
   * Start a colony
   */
  async startColony(colonyId: string): Promise<void> {
    const instance = this.colonies.get(colonyId);
    if (!instance) {
      throw new Error(`Colony not found: ${colonyId}`);
    }

    if (instance.state !== 'provisioning' && instance.state !== 'stopped') {
      throw new Error(`Cannot start colony in state: ${instance.state}`);
    }

    instance.state = 'starting';

    try {
      // Initialize distributed coordination if configured
      if (instance.config.distributed) {
        await instance.colony['initializeDistributed']();
      }

      instance.state = 'running';
      this.emitEvent('colony_started', { colonyId });
    } catch (error) {
      instance.state = 'error';
      this.emitEvent('colony_error', { colonyId, error });
      throw error;
    }
  }

  /**
   * Stop a colony
   */
  async stopColony(colonyId: string): Promise<void> {
    const instance = this.colonies.get(colonyId);
    if (!instance) {
      throw new Error(`Colony not found: ${colonyId}`);
    }

    if (instance.state !== 'running') {
      throw new Error(`Cannot stop colony in state: ${instance.state}`);
    }

    instance.state = 'stopping';

    // Stop distributed coordination
    const distCoord = instance.colony.getDistributedCoordination();
    if (distCoord) {
      await distCoord.stop();
    }

    instance.state = 'stopped';
    this.emitEvent('colony_stopped', { colonyId });
  }

  /**
   * Decommission a colony
   */
  async decommissionColony(colonyId: string): Promise<void> {
    const instance = this.colonies.get(colonyId);
    if (!instance) {
      throw new Error(`Colony not found: ${colonyId}`);
    }

    if (instance.state === 'running') {
      await this.stopColony(colonyId);
    }

    instance.state = 'decommissioning';

    // Release resources
    this.resourceTracker.releaseResources(colonyId);

    // Remove from tracking
    this.colonies.delete(colonyId);

    this.emitEvent('colony_decommissioned', { colonyId });
  }

  // ============================================================================
  // Workload Scheduling
  // ============================================================================

  /**
   * Schedule work to the best colony
   */
  async scheduleWork(requirements: {
    type: string;
    compute?: number;
    memory?: number;
    network?: number;
    agentTypes?: string[];
    capabilities?: string[];
    domains?: string[];
    priority?: number;
  }): Promise<string> {
    const result = await this.scheduler.schedule(requirements);
    return result.colonyId;
  }

  // ============================================================================
  // Load Balancing
  // ============================================================================

  /**
   * Rebalance load across colonies
   */
  async rebalanceLoad(): Promise<void> {
    const decision = await this.loadBalancer.calculateRebalancing();

    if (decision.redistributeFrom && decision.redistributeFrom.length > 0) {
      this.emitEvent('load_balanced', decision);
    }
  }

  // ============================================================================
  // Resource Management
  // ============================================================================

  /**
   * Get overall resource utilization
   */
  getResourceUtilization(): {
    compute: number;
    memory: number;
    network: number;
  } {
    return this.resourceTracker.getOverallUtilization();
  }

  /**
   * Get available resources
   */
  getAvailableResources(): {
    compute: number;
    memory: number;
    network: number;
  } {
    return this.resourceTracker.getAvailableResources();
  }

  // ============================================================================
  // Health Monitoring
  // ============================================================================

  /**
   * Get overall health status
   */
  getHealthStatus(): {
    healthy: number;
    degraded: number;
    unhealthy: number;
    avgScore: number;
  } {
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;
    let totalScore = 0;

    for (const instance of this.colonies.values()) {
      switch (instance.health.status) {
        case 'healthy':
          healthy++;
          break;
        case 'degraded':
          degraded++;
          break;
        case 'unhealthy':
          unhealthy++;
          break;
      }
      totalScore += instance.health.score;
    }

    const avgScore = this.colonies.size > 0 ? totalScore / this.colonies.size : 0;

    return { healthy, degraded, unhealthy, avgScore };
  }

  // ============================================================================
  // Colony Access
  // ============================================================================

  /**
   * Get a colony instance
   */
  getColony(colonyId: string): ColonyInstance | undefined {
    return this.colonies.get(colonyId);
  }

  /**
   * Get all colonies
   */
  getAllColonies(): ColonyInstance[] {
    return Array.from(this.colonies.values());
  }

  /**
   * Get colonies by state
   */
  getColoniesByState(state: ColonyInstanceState): ColonyInstance[] {
    return this.getAllColonies().filter(c => c.state === state);
  }

  /**
   * Get running colonies
   */
  getRunningColonies(): ColonyInstance[] {
    return this.getColoniesByState('running');
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  /**
   * Get manager metrics
   */
  getMetrics(): ManagerMetrics {
    const colonies = this.getAllColonies();
    const runningColonies = this.getRunningColonies();
    const healthStatus = this.getHealthStatus();

    let totalAgents = 0;
    let totalCompute = 0;
    let totalMemory = 0;

    for (const instance of runningColonies) {
      const stats = instance.colony.count;
      totalAgents += stats;
      totalCompute += instance.resources.compute.used;
      totalMemory += instance.resources.memory.used;
    }

    return {
      totalColonies: colonies.length,
      activeColonies: runningColonies.length,
      totalAgents,
      totalCompute,
      totalMemory,
      avgHealthScore: healthStatus.avgScore,
      avgUtilization: Object.values(this.getResourceUtilization()).reduce((a, b) => a + b, 0) / 3,
      requestsProcessed: this.scheduler.getProcessedCount(),
      errors: 0, // TODO: track errors
      uptime: Date.now() - this.startTime,
    };
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    // Stop health monitoring
    this.healthMonitor.stop();

    // Stop all colonies
    const runningColonies = this.getRunningColonies();
    await Promise.all(
      runningColonies.map(instance => this.stopColony(instance.id))
    );

    // Remove all listeners
    this.removeAllListeners();
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  private emitEvent(type: OrchestrationEventType, data: unknown): void {
    const event: OrchestrationEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    this.emit('event', event);
    this.emit(type, data);
  }
}

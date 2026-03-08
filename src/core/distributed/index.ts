/**
 * POLLN Distributed Coordination
 * Main entry point for distributed coordination system
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  DistributedConfig,
  NodeInfo,
  PheromoneField,
  DistributedMessage,
  ClusterState,
  ClusterMetrics,
  ColonyInfo,
  FederationState,
  FederationMessage,
  FederationMessageType,
  PheromoneGradient,
  PheromoneQuery,
  PheromoneUpdate,
  DiscoveryConfig,
  DiscoveryEvent,
  LoadBalancerConfig,
  LoadReport,
  MessageQueueConfig,
  QueuedMessage,
} from './types.js';

export {
  DistributedError,
  NodeUnavailableError,
  LeaderNotFoundError,
  ConnectionError,
} from './types.js';

// ============================================================================
// BACKEND EXPORTS
// ============================================================================

export {
  DistributedBackend,
  MemoryBackend,
  RedisBackend,
  NATSBackend,
  createBackend,
} from './backend.js';

// ============================================================================
// DISCOVERY EXPORTS
// ============================================================================

export {
  DiscoveryService,
  LoadBalancer,
} from './discovery.js';

// ============================================================================
// PHEROMONE EXPORTS
// ============================================================================

export {
  DistributedPheromones,
  GradientTaskAllocator,
} from './pheromones.js';

// ============================================================================
// FEDERATION EXPORTS
// ============================================================================

export {
  ColonyFederation,
  FederationManager,
} from './federation.js';

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

import { DistributedConfig } from './types.js';
import { createBackend } from './backend.js';
import { DiscoveryService, LoadBalancer } from './discovery.js';
import { DistributedPheromones, GradientTaskAllocator } from './pheromones.js';
import { ColonyFederation, FederationManager } from './federation.js';

export interface DistributedCoordinationConfig extends DistributedConfig {
  colonyInfo?: {
    id: string;
    name: string;
    gardenerId: string;
    agentCount?: number;
    capabilities: string[];
  };
  discoveryConfig?: {
    discoveryIntervalMs?: number;
    heartbeatTimeoutMs?: number;
  };
  loadBalancerConfig?: {
    strategy?: 'round_robin' | 'least_loaded' | 'consistent_hash' | 'adaptive';
    maxLoadPerNode?: number;
  };
}

export class DistributedCoordination {
  public readonly config: DistributedCoordinationConfig;
  public readonly discovery: DiscoveryService;
  public readonly loadBalancer: LoadBalancer;
  public readonly pheromones: DistributedPheromones;
  public readonly taskAllocator: GradientTaskAllocator;
  public readonly federation?: ColonyFederation;
  public readonly federationManager?: FederationManager;

  private started: boolean = false;

  constructor(config: DistributedCoordinationConfig) {
    this.config = config;

    // Initialize core components
    this.discovery = new DiscoveryService(config, config.discoveryConfig);
    this.loadBalancer = new LoadBalancer(
      this.discovery,
      config.loadBalancerConfig
    );
    this.pheromones = new DistributedPheromones(config);
    this.taskAllocator = new GradientTaskAllocator(this.pheromones);

    // Initialize federation if colony info provided
    if (config.colonyInfo) {
      this.federation = new ColonyFederation(config, {
        id: config.colonyInfo.id,
        name: config.colonyInfo.name,
        gardenerId: config.colonyInfo.gardenerId,
        agentCount: 0,
        capabilities: config.colonyInfo.capabilities,
      });
      this.federationManager = new FederationManager(this.federation);
    }
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    // Start core services
    await Promise.all([
      this.discovery.start(),
      this.pheromones.start(),
    ]);

    // Start load balancer
    this.loadBalancer.start();

    // Start federation if available
    if (this.federation) {
      await this.federation.start();
    }

    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    // Stop load balancer
    this.loadBalancer.stop();

    // Stop core services
    await Promise.all([
      this.discovery.stop(),
      this.pheromones.stop(),
    ]);

    // Stop federation if available
    if (this.federation) {
      await this.federation.stop();
    }

    this.started = false;
  }

  isStarted(): boolean {
    return this.started;
  }

  /**
   * Get cluster health metrics
   */
  getClusterMetrics() {
    return this.discovery.getClusterMetrics();
  }

  /**
   * Get pheromone statistics
   */
  async getPheromoneStats() {
    return await this.pheromones.getStats();
  }

  /**
   * Find a node for task allocation
   */
  selectNodeForTask() {
    return this.loadBalancer.selectNode(this.config.nodeId);
  }

  /**
   * Allocate a task based on pheromone gradients
   */
  async allocateTask(
    location: number[],
    taskType: string,
    searchRadius?: number
  ) {
    return await this.taskAllocator.allocateTask(
      location,
      taskType,
      searchRadius
    );
  }

  /**
   * Share a pattern with the federation
   */
  async sharePattern(pattern: {
    id: string;
    type: string;
    data: unknown;
    successRate: number;
  }) {
    if (this.federationManager) {
      await this.federationManager.shareHighValuePattern(pattern);
    }
  }

  /**
   * Request an agent from another colony
   */
  async requestAgent(agentType: string) {
    if (this.federationManager) {
      return await this.federationManager.requestAgentFromBestColony(agentType);
    }
    return null;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createDistributedCoordination(
  config: DistributedCoordinationConfig
): DistributedCoordination {
  return new DistributedCoordination(config);
}

// ============================================================================
// DEFAULT CONFIGS
// ============================================================================

export const DEFAULT_DISTRIBUTED_CONFIG: Partial<DistributedCoordinationConfig> = {
  backend: 'memory',
  heartbeatIntervalMs: 5000,
  discoveryIntervalMs: 5000,
  discoveryConfig: {
    discoveryIntervalMs: 5000,
    heartbeatTimeoutMs: 15000,
  },
  loadBalancerConfig: {
    strategy: 'least_loaded',
    maxLoadPerNode: 0.8,
  },
};

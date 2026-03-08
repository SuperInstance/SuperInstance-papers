/**
 * POLLN Colony Federation Protocol
 * Cross-colony communication and state synchronization
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  ColonyInfo,
  FederationState,
  FederationMessage,
  DistributedConfig,
} from './types.js';
import { FederationMessageType } from './types.js';
import { DistributedBackend, createBackend } from './backend.js';

// ============================================================================
// FEDERATION PROTOCOL
// ============================================================================

export class ColonyFederation extends EventEmitter {
  private backend: DistributedBackend;
  private config: DistributedConfig;
  private localColony: ColonyInfo;
  private federationState: FederationState;
  private subscriptionId: string | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private readonly SYNC_INTERVAL_MS = 60000; // 1 minute

  constructor(
    config: DistributedConfig,
    colonyInfo: Omit<ColonyInfo, 'nodeId' | 'lastSync'>
  ) {
    super();

    this.config = config;
    this.backend = createBackend(config);

    this.localColony = {
      ...colonyInfo,
      nodeId: config.nodeId,
      lastSync: Date.now(),
    };

    this.federationState = {
      colonies: new Map(),
      syncEpoch: 0,
      pendingSync: new Set(),
    };
  }

  async start(): Promise<void> {
    await this.backend.connect();

    // Subscribe to federation channel
    this.subscriptionId = await this.backend.subscribe(
      'polln.federation',
      async (msg) => {
        await this.handleFederationMessage(msg);
      }
    );

    // Announce our colony
    await this.announceColony();

    // Start periodic sync
    this.startSync();
  }

  async stop(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.subscriptionId) {
      await this.backend.unsubscribe(this.subscriptionId);
    }

    await this.backend.disconnect();
  }

  /**
   * Register a colony in the federation
   */
  async registerColony(colony: ColonyInfo): Promise<void> {
    const key = `colony:${colony.id}`;
    await this.backend.set(key, colony, 300000); // 5 minute TTL

    this.federationState.colonies.set(colony.id, colony);
    this.emit('colony_registered', colony);
  }

  /**
   * Unregister a colony from the federation
   */
  async unregisterColony(colonyId: string): Promise<void> {
    const key = `colony:${colonyId}`;
    await this.backend.delete(key);

    this.federationState.colonies.delete(colonyId);
    this.federationState.pendingSync.delete(colonyId);
    this.emit('colony_unregistered', colonyId);
  }

  /**
   * Get colony information
   */
  getColony(colonyId: string): ColonyInfo | undefined {
    return this.federationState.colonies.get(colonyId);
  }

  /**
   * Get all colonies in the federation
   */
  getAllColonies(): ColonyInfo[] {
    return Array.from(this.federationState.colonies.values());
  }

  /**
   * Share a pattern with another colony
   */
  async sharePattern(
    targetColonyId: string,
    pattern: {
      id: string;
      type: string;
      data: unknown;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const message: FederationMessage = {
      id: uuidv4(),
      sourceColonyId: this.localColony.id,
      targetColonyId,
      type: FederationMessageType.PATTERN_SHARE,
      payload: pattern,
      timestamp: Date.now(),
    };

    await this.sendMessage(message);
    this.emit('pattern_shared', { targetColonyId, pattern });
  }

  /**
   * Broadcast a pattern to all colonies
   */
  async broadcastPattern(pattern: {
    id: string;
    type: string;
    data: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const colonies = this.getAllColonies();
    for (const colony of colonies) {
      if (colony.id !== this.localColony.id) {
        await this.sharePattern(colony.id, pattern);
      }
    }
  }

  /**
   * Request an agent migration from another colony
   */
  async requestAgentMigration(
    targetColonyId: string,
    agentType: string,
    count: number = 1
  ): Promise<void> {
    const message: FederationMessage = {
      id: uuidv4(),
      sourceColonyId: this.localColony.id,
      targetColonyId,
      type: FederationMessageType.AGENT_MIGRATE,
      payload: {
        agentType,
        count,
        request: true,
      },
      timestamp: Date.now(),
    };

    await this.sendMessage(message);
    this.emit('migration_requested', { targetColonyId, agentType, count });
  }

  /**
   * Synchronize state with another colony
   */
  async syncState(targetColonyId: string, state: Record<string, unknown>): Promise<void> {
    const message: FederationMessage = {
      id: uuidv4(),
      sourceColonyId: this.localColony.id,
      targetColonyId,
      type: FederationMessageType.STATE_SYNC,
      payload: {
        epoch: this.federationState.syncEpoch,
        state,
      },
      timestamp: Date.now(),
    };

    await this.sendMessage(message);
    this.federationState.pendingSync.add(targetColonyId);
    this.emit('state_syncing', targetColonyId);
  }

  /**
   * Sync pheromone fields with federation
   */
  async syncPheromones(pheromoneData: {
    fields: Array<{
      id: string;
      coordinates: number[];
      intensity: number;
      type: string;
    }>;
  }): Promise<void> {
    const message: FederationMessage = {
      id: uuidv4(),
      sourceColonyId: this.localColony.id,
      type: FederationMessageType.PHEROMONE_SYNC,
      payload: pheromoneData,
      timestamp: Date.now(),
    };

    await this.broadcastMessage(message);
    this.emit('pheromones_synced', pheromoneData);
  }

  /**
   * Find colonies by capability
   */
  findColoniesByCapability(capability: string): ColonyInfo[] {
    return this.getAllColonies().filter(colony =>
      colony.capabilities.includes(capability)
    );
  }

  /**
   * Find least loaded colonies
   */
  async findLeastLoadedColonies(limit: number = 3): Promise<ColonyInfo[]> {
    const colonies = this.getAllColonies();

    // Load agent count from backend
    const coloniesWithLoad = await Promise.all(
      colonies.map(async (colony) => {
        const key = `colony_load:${colony.id}`;
        const load = await this.backend.get(key) as number | null;
        return {
          colony,
          load: load || 0,
        };
      })
    );

    return coloniesWithLoad
      .sort((a, b) => a.load - b.load)
      .slice(0, limit)
      .map(item => item.colony);
  }

  /**
   * Update local colony info
   */
  updateLocalColony(updates: Partial<ColonyInfo>): void {
    this.localColony = { ...this.localColony, ...updates };
  }

  /**
   * Report load for this colony
   */
  async reportLoad(agentCount: number, totalLoad: number): Promise<void> {
    const key = `colony_load:${this.localColony.id}`;
    await this.backend.set(key, totalLoad, 60000); // 1 minute TTL

    this.updateLocalColony({ agentCount });
    await this.announceColony();
  }

  private async announceColony(): Promise<void> {
    const message: FederationMessage = {
      id: uuidv4(),
      sourceColonyId: this.localColony.id,
      type: FederationMessageType.DISCOVERY,
      payload: {
        colony: this.localColony,
      },
      timestamp: Date.now(),
    };

    await this.broadcastMessage(message);
  }

  private async sendMessage(message: FederationMessage): Promise<void> {
    const channel = `polln.federation.${message.targetColonyId}`;
    await this.backend.publish(channel, {
      id: uuidv4(),
      sourceNodeId: this.config.nodeId,
      channel,
      payload: message,
      timestamp: Date.now(),
      requiresAck: true,
    });
  }

  private async broadcastMessage(message: FederationMessage): Promise<void> {
    await this.backend.publish('polln.federation', {
      id: uuidv4(),
      sourceNodeId: this.config.nodeId,
      channel: 'polln.federation',
      payload: message,
      timestamp: Date.now(),
      requiresAck: false,
    });
  }

  private async handleFederationMessage(msg: any): Promise<void> {
    const federationMsg = msg.payload as FederationMessage;

    // Ignore messages from ourselves
    if (federationMsg.sourceColonyId === this.localColony.id) {
      return;
    }

    // Check if message is for us
    if (
      federationMsg.targetColonyId &&
      federationMsg.targetColonyId !== this.localColony.id
    ) {
      return;
    }

    switch (federationMsg.type) {
      case 'DISCOVERY':
        await this.handleDiscovery(federationMsg);
        break;

      case 'STATE_SYNC':
        await this.handleStateSync(federationMsg);
        break;

      case 'PATTERN_SHARE':
        this.emit('pattern_received', {
          sourceColonyId: federationMsg.sourceColonyId,
          pattern: federationMsg.payload,
        });
        break;

      case 'AGENT_MIGRATE':
        this.emit('migration_request', {
          sourceColonyId: federationMsg.sourceColonyId,
          request: federationMsg.payload,
        });
        break;

      case 'PHEROMONE_SYNC':
        this.emit('pheromones_received', {
          sourceColonyId: federationMsg.sourceColonyId,
          data: federationMsg.payload,
        });
        break;

      case 'HEARTBEAT':
        // Update colony last sync time
        const colony = this.federationState.colonies.get(
          federationMsg.sourceColonyId
        );
        if (colony) {
          colony.lastSync = Date.now();
        }
        break;
    }
  }

  private async handleDiscovery(message: FederationMessage): Promise<void> {
    const payload = message.payload as { colony: ColonyInfo };
    await this.registerColony(payload.colony);

    // Respond with our info
    await this.announceColony();
  }

  private async handleStateSync(message: FederationMessage): Promise<void> {
    const payload = message.payload as {
      epoch: number;
      state: Record<string, unknown>;
    };

    this.emit('state_sync_received', {
      sourceColonyId: message.sourceColonyId,
      epoch: payload.epoch,
      state: payload.state,
    });

    this.federationState.pendingSync.delete(message.sourceColonyId);
  }

  private startSync(): void {
    this.syncTimer = setInterval(async () => {
      // Sync with all colonies
      const colonies = this.getAllColonies();
      for (const colony of colonies) {
        if (colony.id !== this.localColony.id) {
          await this.sendHeartbeat(colony.id);
        }
      }

      // Increment sync epoch
      this.federationState.syncEpoch++;

      // Clean up stale colonies
      await this.cleanupStaleColonies();
    }, this.SYNC_INTERVAL_MS);
  }

  private async sendHeartbeat(colonyId: string): Promise<void> {
    const message: FederationMessage = {
      id: uuidv4(),
      sourceColonyId: this.localColony.id,
      targetColonyId: colonyId,
      type: FederationMessageType.HEARTBEAT,
      payload: {
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    await this.sendMessage(message);
  }

  private async cleanupStaleColonies(): Promise<void> {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [colonyId, colony] of this.federationState.colonies) {
      if (now - colony.lastSync > staleThreshold) {
        await this.unregisterColony(colonyId);
        this.emit('colony_stale', colonyId);
      }
    }
  }
}

// ============================================================================
// FEDERATION MANAGER
// ============================================================================

export interface FederationManagerConfig {
  enablePatternSharing: boolean;
  enableAgentMigration: boolean;
  enableStateSync: boolean;
  maxPendingSync: number;
  syncRetryAttempts: number;
}

export class FederationManager {
  private federation: ColonyFederation;
  private config: FederationManagerConfig;
  private pendingPatterns: Map<string, unknown> = new Map();

  constructor(
    federation: ColonyFederation,
    config?: Partial<FederationManagerConfig>
  ) {
    this.federation = federation;
    this.config = {
      enablePatternSharing: true,
      enableAgentMigration: true,
      enableStateSync: true,
      maxPendingSync: 10,
      syncRetryAttempts: 3,
      ...config,
    };

    this.setupEventHandlers();
  }

  async shareHighValuePattern(
    pattern: {
      id: string;
      type: string;
      data: unknown;
      successRate: number;
    }
  ): Promise<void> {
    if (!this.config.enablePatternSharing) {
      return;
    }

    // Only share high-value patterns
    if (pattern.successRate < 0.7) {
      return;
    }

    // Find colonies that might benefit
    const targetColonies = this.federation.findColoniesByCapability(pattern.type);

    for (const colony of targetColonies) {
      await this.federation.sharePattern(colony.id, pattern);
    }
  }

  async requestAgentFromBestColony(agentType: string): Promise<string | null> {
    if (!this.config.enableAgentMigration) {
      return null;
    }

    const colonies = await this.federation.findLeastLoadedColonies(3);
    const capableColonies = colonies.filter(c =>
      c.capabilities.includes(agentType)
    );

    if (capableColonies.length === 0) {
      return null;
    }

    const targetColony = capableColonies[0];
    await this.federation.requestAgentMigration(targetColony.id, agentType);

    return targetColony.id;
  }

  async syncWithRandomColonies(count: number = 2): Promise<void> {
    if (!this.config.enableStateSync) {
      return;
    }

    const colonies = this.federation.getAllColonies();
    const shuffled = colonies.sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, count);

    for (const colony of targets) {
      await this.federation.syncState(colony.id, {
        timestamp: Date.now(),
        // Add state data here
      });
    }
  }

  private setupEventHandlers(): void {
    this.federation.on('pattern_received', (data) => {
      if (this.config.enablePatternSharing) {
        this.pendingPatterns.set(
          (data.pattern as { id: string }).id,
          data.pattern
        );
      }
    });

    this.federation.on('migration_request', (data) => {
      if (this.config.enableAgentMigration) {
        // Handle migration request
        this.federation.emit('agent_migration_requested', data);
      }
    });
  }
}

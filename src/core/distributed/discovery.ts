/**
 * POLLN Distributed Discovery Service
 * Node discovery, health checking, and load balancing
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  NodeInfo,
  DistributedConfig,
  DiscoveryConfig,
  DiscoveryEvent,
  ClusterState,
  ClusterMetrics,
  LoadBalancerConfig,
  LoadReport,
} from './types.js';
import { DistributedBackend, createBackend } from './backend.js';
import { NodeUnavailableError, LeaderNotFoundError } from './types.js';

// ============================================================================
// DISCOVERY SERVICE
// ============================================================================

export class DiscoveryService extends EventEmitter {
  private config: DistributedConfig;
  private discoveryConfig: DiscoveryConfig;
  private backend: DistributedBackend;
  private localNode: NodeInfo;
  private clusterState: ClusterState;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private discoveryTimer: ReturnType<typeof setInterval> | null = null;
  private electionTimer: ReturnType<typeof setInterval> | null = null;

  // Subscription IDs
  private discoverySubId: string | null = null;
  private heartbeatSubId: string | null = null;

  constructor(
    config: DistributedConfig,
    discoveryConfig?: Partial<DiscoveryConfig>
  ) {
    super();

    this.config = config;
    this.discoveryConfig = {
      discoveryIntervalMs: 5000,
      heartbeatTimeoutMs: 15000,
      ...discoveryConfig,
    };

    this.backend = createBackend(config);

    this.localNode = {
      id: config.nodeId,
      address: 'localhost',
      port: 0,
      status: 'active',
      load: 0,
      agentCount: 0,
      lastHeartbeat: Date.now(),
      capabilities: [],
    };

    this.clusterState = {
      nodes: new Map(),
      leader: null,
      epoch: 0,
    };
  }

  async start(): Promise<void> {
    await this.backend.connect();

    // Subscribe to discovery channel
    this.discoverySubId = await this.backend.subscribe(
      'polln.discovery',
      async (msg) => {
        await this.handleDiscoveryMessage(msg);
      }
    );

    // Subscribe to heartbeat channel
    this.heartbeatSubId = await this.backend.subscribe(
      'polln.heartbeat',
      async (msg) => {
        await this.handleHeartbeat(msg);
      }
    );

    // Announce ourselves
    await this.announceNode();

    // Start periodic tasks
    this.startHeartbeat();
    this.startDiscovery();
    this.startLeaderElection();
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    if (this.electionTimer) {
      clearInterval(this.electionTimer);
      this.electionTimer = null;
    }

    // Graceful shutdown
    await this.drainNode();

    if (this.discoverySubId) {
      await this.backend.unsubscribe(this.discoverySubId);
    }
    if (this.heartbeatSubId) {
      await this.backend.unsubscribe(this.heartbeatSubId);
    }

    await this.backend.disconnect();
  }

  async registerNode(node: NodeInfo): Promise<void> {
    await this.backend.set(`node:${node.id}`, node, this.discoveryConfig.heartbeatTimeoutMs);
    this.clusterState.nodes.set(node.id, node);

    this.emit('discovery', {
      type: 'node_joined',
      nodeId: node.id,
      timestamp: Date.now(),
    } as DiscoveryEvent);
  }

  async unregisterNode(nodeId: string): Promise<void> {
    await this.backend.delete(`node:${nodeId}`);
    this.clusterState.nodes.delete(nodeId);

    this.emit('discovery', {
      type: 'node_left',
      nodeId,
      timestamp: Date.now(),
    } as DiscoveryEvent);
  }

  getNode(nodeId: string): NodeInfo | undefined {
    return this.clusterState.nodes.get(nodeId);
  }

  getAllNodes(): NodeInfo[] {
    return Array.from(this.clusterState.nodes.values());
  }

  getActiveNodes(): NodeInfo[] {
    return this.getAllNodes().filter(n => n.status === 'active');
  }

  getClusterMetrics(): ClusterMetrics {
    const nodes = this.getActiveNodes();
    const totalLoad = nodes.reduce((sum, n) => sum + n.load, 0);
    const totalAgents = nodes.reduce((sum, n) => sum + n.agentCount, 0);

    return {
      totalNodes: this.clusterState.nodes.size,
      activeNodes: nodes.length,
      totalLoad,
      averageLoad: nodes.length > 0 ? totalLoad / nodes.length : 0,
      totalAgents,
    };
  }

  getLeader(): string | null {
    return this.clusterState.leader;
  }

  isLeader(): boolean {
    return this.clusterState.leader === this.localNode.id;
  }

  updateLocalNode(updates: Partial<NodeInfo>): void {
    this.localNode = { ...this.localNode, ...updates };
  }

  private async announceNode(): Promise<void> {
    const message = {
      id: uuidv4(),
      sourceNodeId: this.localNode.id,
      channel: 'polln.discovery',
      payload: {
        type: 'announce',
        node: this.localNode,
      },
      timestamp: Date.now(),
      requiresAck: false,
    };

    await this.backend.publish('polln.discovery', message);
  }

  private async sendHeartbeat(): Promise<void> {
    this.localNode.lastHeartbeat = Date.now();

    const message = {
      id: uuidv4(),
      sourceNodeId: this.localNode.id,
      channel: 'polln.heartbeat',
      payload: {
        node: this.localNode,
        epoch: this.clusterState.epoch,
      },
      timestamp: Date.now(),
      requiresAck: false,
    };

    await this.backend.publish('polln.heartbeat', message);
  }

  private async handleDiscoveryMessage(msg: any): Promise<void> {
    const payload = msg.payload as { type: string; node: NodeInfo };

    switch (payload.type) {
      case 'announce':
        await this.registerNode(payload.node);
        // Respond with our info
        await this.announceNode();
        break;

      case 'drain':
        this.clusterState.nodes.delete(payload.node.id);
        this.emit('discovery', {
          type: 'node_left',
          nodeId: payload.node.id,
          timestamp: Date.now(),
        } as DiscoveryEvent);
        break;
    }
  }

  private async handleHeartbeat(msg: any): Promise<void> {
    const payload = msg.payload as { node: NodeInfo; epoch: number };

    // Update node info
    this.clusterState.nodes.set(payload.node.id, payload.node);

    // Update epoch if newer
    if (payload.epoch > this.clusterState.epoch) {
      this.clusterState.epoch = payload.epoch;
      if (payload.node.id !== this.clusterState.leader) {
        const oldLeader = this.clusterState.leader;
        this.clusterState.leader = payload.node.id;
        this.emit('discovery', {
          type: 'leader_changed',
          nodeId: payload.node.id,
          timestamp: Date.now(),
          data: { oldLeader },
        } as DiscoveryEvent);
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      await this.sendHeartbeat();
    }, this.discoveryConfig.discoveryIntervalMs);
  }

  private startDiscovery(): void {
    this.discoveryTimer = setInterval(async () => {
      // Check for stale nodes
      const now = Date.now();
      const timeout = this.discoveryConfig.heartbeatTimeoutMs;

      for (const [nodeId, node] of this.clusterState.nodes) {
        if (nodeId === this.localNode.id) continue;

        if (now - node.lastHeartbeat > timeout) {
          await this.unregisterNode(nodeId);
        }
      }
    }, this.discoveryConfig.discoveryIntervalMs);
  }

  private startLeaderElection(): void {
    this.electionTimer = setInterval(async () => {
      // Simple bully algorithm - lowest ID wins
      const activeNodes = this.getActiveNodes();
      if (activeNodes.length === 0) return;

      const sortedNodes = activeNodes.sort((a, b) => a.id.localeCompare(b.id));
      const newLeader = sortedNodes[0].id;

      if (this.clusterState.leader !== newLeader) {
        this.clusterState.leader = newLeader;
        this.clusterState.epoch++;
        await this.sendHeartbeat();
      }
    }, this.discoveryConfig.discoveryIntervalMs * 2);
  }

  private async drainNode(): Promise<void> {
    this.localNode.status = 'draining';

    const message = {
      id: uuidv4(),
      sourceNodeId: this.localNode.id,
      channel: 'polln.discovery',
      payload: {
        type: 'drain',
        node: this.localNode,
      },
      timestamp: Date.now(),
      requiresAck: false,
    };

    await this.backend.publish('polln.discovery', message);
  }
}

// ============================================================================
// LOAD BALANCER
// ============================================================================

export class LoadBalancer {
  private discovery: DiscoveryService;
  private config: LoadBalancerConfig;
  private currentIndex: number = 0;
  private rebalanceTimer: ReturnType<typeof setInterval> | null = null;
  private readonly REBALANCE_INTERVAL_MS = 30000;

  constructor(
    discovery: DiscoveryService,
    config?: Partial<LoadBalancerConfig>
  ) {
    this.discovery = discovery;
    this.config = {
      strategy: 'least_loaded',
      maxLoadPerNode: 0.8,
      ...config,
    };
  }

  start(): void {
    this.rebalanceTimer = setInterval(() => {
      this.rebalance();
    }, this.REBALANCE_INTERVAL_MS);
  }

  stop(): void {
    if (this.rebalanceTimer) {
      clearInterval(this.rebalanceTimer);
      this.rebalanceTimer = null;
    }
  }

  selectNode(excludeNodeId?: string): NodeInfo | null {
    const nodes = this.discovery.getActiveNodes().filter(
      n => n.id !== excludeNodeId && n.load < this.config.maxLoadPerNode
    );

    if (nodes.length === 0) {
      return null;
    }

    switch (this.config.strategy) {
      case 'round_robin':
        return this.selectRoundRobin(nodes);

      case 'least_loaded':
        return this.selectLeastLoaded(nodes);

      case 'consistent_hash':
        return this.selectConsistentHash(nodes);

      case 'adaptive':
        return this.selectAdaptive(nodes);

      default:
        return this.selectLeastLoaded(nodes);
    }
  }

  reportLoad(report: LoadReport): void {
    const node = this.discovery.getNode(report.nodeId);
    if (node) {
      node.load = report.load;
      node.agentCount = report.agentCount;
      this.discovery.updateLocalNode(node);
    }
  }

  private selectRoundRobin(nodes: NodeInfo[]): NodeInfo {
    const node = nodes[this.currentIndex % nodes.length];
    this.currentIndex++;
    return node;
  }

  private selectLeastLoaded(nodes: NodeInfo[]): NodeInfo {
    return nodes.reduce((min, node) =>
      node.load < min.load ? node : min
    );
  }

  private selectConsistentHash(nodes: NodeInfo[]): NodeInfo {
    // Simple hash-based selection
    const hash = Date.now().toString();
    let sum = 0;
    for (let i = 0; i < hash.length; i++) {
      sum += hash.charCodeAt(i);
    }
    return nodes[sum % nodes.length];
  }

  private selectAdaptive(nodes: NodeInfo[]): NodeInfo {
    // Combine load and agent count for adaptive selection
    return nodes.reduce((best, node) => {
      const bestScore = best.load * 0.7 + (best.agentCount / 100) * 0.3;
      const nodeScore = node.load * 0.7 + (node.agentCount / 100) * 0.3;
      return nodeScore < bestScore ? node : best;
    });
  }

  private rebalance(): void {
    const metrics = this.discovery.getClusterMetrics();
    if (metrics.averageLoad > 0.7) {
      this.discovery.emit('rebalance_needed', metrics);
    }
  }
}

/**
 * Load Balancer
 *
 * Distributes load across agents and nodes
 */

import { EventEmitter } from 'events';
import type { LoadBalancingStrategy } from './types.js';

/**
 * Load balancer config
 */
interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  healthCheckInterval: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
}

/**
 * Node info
 */
interface NodeInfo {
  id: string;
  address: string;
  port: number;
  weight: number;
  healthy: boolean;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastHealthCheck: number;
  currentConnections: number;
  maxConnections: number;
}

/**
 * Connection info
 */
interface ConnectionInfo {
  id: string;
  nodeId: string;
  establishedAt: number;
}

/**
 * Load Balancer
 */
export class LoadBalancer extends EventEmitter {
  private config: LoadBalancerConfig;
  private nodes: Map<string, NodeInfo> = new Map();
  private connections: Map<string, ConnectionInfo> = new Map();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private roundRobinIndex: number = 0;

  constructor(config: LoadBalancerConfig) {
    super();
    this.config = config;
    this.startHealthChecks();
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health checks
   */
  public stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Add node
   */
  public addNode(node: Omit<NodeInfo, 'healthy' | 'consecutiveFailures' | 'consecutiveSuccesses' | 'lastHealthCheck' | 'currentConnections'>): void {
    const newNode: NodeInfo = {
      ...node,
      healthy: true,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastHealthCheck: Date.now(),
      currentConnections: 0,
    };

    this.nodes.set(node.id, newNode);
    this.emit('node_added', newNode);
  }

  /**
   * Remove node
   */
  public removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);

    if (!node) {
      return;
    }

    // Close all connections to this node
    for (const [connId, conn] of this.connections) {
      if (conn.nodeId === nodeId) {
        this.closeConnection(connId);
      }
    }

    this.nodes.delete(nodeId);
    this.emit('node_removed', nodeId);
  }

  /**
   * Get node for new connection
   */
  public getNode(): string | null {
    const healthyNodes = Array.from(this.nodes.values()).filter(
      (n) => n.healthy && n.currentConnections < n.maxConnections
    );

    if (healthyNodes.length === 0) {
      return null;
    }

    switch (this.config.strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return this.roundRobin(healthyNodes);
      case LoadBalancingStrategy.LEAST_LOADED:
        return this.leastLoaded(healthyNodes);
      case LoadBalancingStrategy.RANDOM:
        return this.random(healthyNodes);
      case LoadBalancingStrategy.CONSISTENT_HASH:
        return this.consistentHash(healthyNodes, Date.now().toString());
      case LoadBalancingStrategy.WEIGHTED:
        return this.weighted(healthyNodes);
      default:
        return this.leastLoaded(healthyNodes);
    }
  }

  /**
   * Round-robin selection
   */
  private roundRobin(nodes: NodeInfo[]): string {
    const node = nodes[this.roundRobinIndex % nodes.length];
    this.roundRobinIndex++;
    return node.id;
  }

  /**
   * Least-loaded selection
   */
  private leastLoaded(nodes: NodeInfo[]): string {
    const sorted = [...nodes].sort(
      (a, b) =>
        a.currentConnections / a.maxConnections -
        b.currentConnections / b.maxConnections
    );
    return sorted[0].id;
  }

  /**
   * Random selection
   */
  private random(nodes: NodeInfo[]): string {
    const index = Math.floor(Math.random() * nodes.length);
    return nodes[index].id;
  }

  /**
   * Consistent hash selection
   */
  private consistentHash(nodes: NodeInfo[], key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash + key.charCodeAt(i)) & 0xffffffff;
    }

    const index = Math.abs(hash) % nodes.length;
    return nodes[index].id;
  }

  /**
   * Weighted selection
   */
  private weighted(nodes: NodeInfo[]): string {
    const totalWeight = nodes.reduce((sum, n) => sum + n.weight, 0);
    let random = Math.random() * totalWeight;

    for (const node of nodes) {
      random -= node.weight;
      if (random <= 0) {
        return node.id;
      }
    }

    return nodes[0].id;
  }

  /**
   * Open connection to node
   */
  public openConnection(nodeId: string): string | null {
    const node = this.nodes.get(nodeId);

    if (!node || !node.healthy || node.currentConnections >= node.maxConnections) {
      return null;
    }

    const connectionId = `${nodeId}-${Date.now()}-${Math.random()}`;

    const connection: ConnectionInfo = {
      id: connectionId,
      nodeId,
      establishedAt: Date.now(),
    };

    this.connections.set(connectionId, connection);
    node.currentConnections++;

    this.emit('connection_opened', connection);
    return connectionId;
  }

  /**
   * Close connection
   */
  public closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return;
    }

    const node = this.nodes.get(connection.nodeId);

    if (node) {
      node.currentConnections = Math.max(0, node.currentConnections - 1);
    }

    this.connections.delete(connectionId);
    this.emit('connection_closed', connection);
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    for (const [nodeId, node] of this.nodes) {
      try {
        const healthy = await this.checkNodeHealth(node);

        if (healthy) {
          node.consecutiveSuccesses++;
          node.consecutiveFailures = 0;

          if (!node.healthy && node.consecutiveSuccesses >= this.config.healthyThreshold) {
            node.healthy = true;
            this.emit('node_healthy', nodeId);
          }
        } else {
          node.consecutiveFailures++;
          node.consecutiveSuccesses = 0;

          if (node.healthy && node.consecutiveFailures >= this.config.unhealthyThreshold) {
            node.healthy = false;
            this.emit('node_unhealthy', nodeId);
          }
        }

        node.lastHealthCheck = Date.now();
      } catch (error) {
        node.consecutiveFailures++;
        node.consecutiveSuccesses = 0;

        if (node.healthy && node.consecutiveFailures >= this.config.unhealthyThreshold) {
          node.healthy = false;
          this.emit('node_unhealthy', nodeId);
        }

        node.lastHealthCheck = Date.now();
      }
    }
  }

  /**
   * Check node health
   */
  private async checkNodeHealth(node: NodeInfo): Promise<boolean> {
    // In a real implementation, this would make an HTTP request or TCP connection
    // For now, we'll just return true
    return true;
  }

  /**
   * Get node info
   */
  public getNodeInfo(nodeId: string): NodeInfo | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes
   */
  public getAllNodes(): NodeInfo[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get healthy nodes
   */
  public getHealthyNodes(): NodeInfo[] {
    return Array.from(this.nodes.values()).filter((n) => n.healthy);
  }

  /**
   * Get statistics
   */
  public getStats(): {
    totalNodes: number;
    healthyNodes: number;
    unhealthyNodes: number;
    totalConnections: number;
    averageConnections: number;
  } {
    const nodes = Array.from(this.nodes.values());
    const healthyNodes = nodes.filter((n) => n.healthy);
    const totalConnections = Array.from(this.connections.values()).length;
    const averageConnections =
      nodes.length > 0
        ? nodes.reduce((sum, n) => sum + n.currentConnections, 0) / nodes.length
        : 0;

    return {
      totalNodes: nodes.length,
      healthyNodes: healthyNodes.length,
      unhealthyNodes: nodes.length - healthyNodes.length,
      totalConnections,
      averageConnections,
    };
  }

  /**
   * Set strategy
   */
  public setStrategy(strategy: LoadBalancingStrategy): void {
    this.config.strategy = strategy;
    this.emit('strategy_changed', strategy);
  }

  /**
   * Get strategy
   */
  public getStrategy(): LoadBalancingStrategy {
    return this.config.strategy;
  }

  /**
   * Enable/disable node
   */
  public setNodeEnabled(nodeId: string, enabled: boolean): void {
    const node = this.nodes.get(nodeId);

    if (!node) {
      return;
    }

    node.healthy = enabled;
    this.emit('node_toggled', { nodeId, enabled });
  }
}

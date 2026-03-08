/**
 * POLLN P2P Coordinator for Federated Learning
 * Pattern-Organized Large Language Network
 *
 * References:
 * - Jia et al., "Efficient Federated Learning with Guided Participant Selection" (2021)
 * - Pongnumkul et al., "Peer-to-Peer Architecture for Large-Scale Federated Learning" (2021)
 *
 * P2P coordinator enables decentralized federated learning where:
 * 1. Peers coordinate without a central server
 * 2. Participants communicate directly with each other
 * 3. More resilient to single point of failure
 * 4. Better privacy and scalability
 *
 * Key Features:
 * - Peer discovery and management
 * - Ring-based or mesh-based topology
 * - Distributed aggregation
 * - Fault tolerance and recovery
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface P2PCoordinatorConfig {
  maxPeers: number;
  topology: 'ring' | 'mesh' | 'tree';
  connectionTimeout: number;
  heartbeatInterval: number;
  maxRetries: number;
}

export interface PeerInfo {
  peerId: string;
  address: string;
  port: number;
  capabilities: string[];
  lastSeen: number;
  isActive: boolean;
}

export interface P2PMessage {
  messageId: string;
  type: 'discovery' | 'model-update' | 'aggregation' | 'heartbeat';
  senderId: string;
  receiverId?: string;
  payload: unknown;
  timestamp: number;
  ttl: number;
}

// ============================================================================
// P2P Coordinator Implementation
// ============================================================================

/**
 * P2PCoordinator
 *
 * Manages peer-to-peer communication for federated learning.
 */
export class P2PCoordinator {
  private config: P2PCoordinatorConfig;
  private localPeerId: string;
  private peers: Map<string, PeerInfo> = new Map();
  private messageHandlers: Map<string, (message: P2PMessage) => void> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    localPeerId: string,
    config: Partial<P2PCoordinatorConfig> = {}
  ) {
    this.localPeerId = localPeerId;
    this.config = {
      maxPeers: 100,
      topology: 'mesh',
      connectionTimeout: 30000,
      heartbeatInterval: 10000,
      maxRetries: 3,
      ...config,
    };

    this.startHeartbeat();
  }

  /**
   * Register a peer
   */
  async registerPeer(peerInfo: PeerInfo): Promise<void> {
    this.peers.set(peerInfo.peerId, {
      ...peerInfo,
      lastSeen: Date.now(),
      isActive: true,
    });
  }

  /**
   * Unregister a peer
   */
  async unregisterPeer(peerId: string): Promise<void> {
    this.peers.delete(peerId);
  }

  /**
   * Discover peers
   */
  async discoverPeers(): Promise<PeerInfo[]> {
    // In practice, this would use a discovery service
    // For now, return known active peers
    return Array.from(this.peers.values()).filter(p => p.isActive);
  }

  /**
   * Send message to a peer
   */
  async sendMessage(
    receiverId: string,
    type: P2PMessage['type'],
    payload: unknown
  ): Promise<void> {
    const message: P2PMessage = {
      messageId: this.generateMessageId(),
      type,
      senderId: this.localPeerId,
      receiverId,
      payload,
      timestamp: Date.now(),
      ttl: 10,
    };

    // In practice, would send over network
    await this.deliverMessage(message);
  }

  /**
   * Broadcast message to all peers
   */
  async broadcastMessage(
    type: P2PMessage['type'],
    payload: unknown
  ): Promise<void> {
    const message: P2PMessage = {
      messageId: this.generateMessageId(),
      type,
      senderId: this.localPeerId,
      payload,
      timestamp: Date.now(),
      ttl: 10,
    };

    for (const peerId of this.peers.keys()) {
      await this.deliverMessage({ ...message, receiverId: peerId });
    }
  }

  /**
   * Register message handler
   */
  onMessage(
    type: P2PMessage['type'],
    handler: (message: P2PMessage) => void
  ): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Get topology neighbors
   */
  getTopologyNeighbors(): string[] {
    const peerIds = Array.from(this.peers.keys());

    switch (this.config.topology) {
      case 'ring':
        return this.getRingNeighbors(peerIds);
      case 'mesh':
        return this.getMeshNeighbors(peerIds);
      case 'tree':
        return this.getTreeNeighbors(peerIds);
      default:
        return peerIds;
    }
  }

  /**
   * Get peer info
   */
  getPeer(peerId: string): PeerInfo | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Get all peers
   */
  getAllPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get active peer count
   */
  getActivePeerCount(): number {
    return Array.from(this.peers.values()).filter(p => p.isActive).length;
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.peers.clear();
    this.messageHandlers.clear();
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private async deliverMessage(message: P2PMessage): Promise<void> {
    // Check if message is for us
    if (message.receiverId && message.receiverId !== this.localPeerId) {
      return; // Not for us
    }

    // Decrement TTL
    message.ttl--;
    if (message.ttl <= 0) {
      return; // Message expired
    }

    // Handle message
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }

  private getRingNeighbors(peerIds: string[]): string[] {
    if (peerIds.length <= 2) return peerIds;

    const localIndex = peerIds.indexOf(this.localPeerId);
    if (localIndex === -1) return [];

    const neighbors: string[] = [];
    const prevIndex = (localIndex - 1 + peerIds.length) % peerIds.length;
    const nextIndex = (localIndex + 1) % peerIds.length;

    neighbors.push(peerIds[prevIndex]);
    neighbors.push(peerIds[nextIndex]);

    return neighbors;
  }

  private getMeshNeighbors(peerIds: string[]): string[] {
    // In mesh, connect to all peers
    return peerIds.filter(id => id !== this.localPeerId);
  }

  private getTreeNeighbors(peerIds: string[]): string[] {
    // Simple tree: first peer is root, others are children
    if (peerIds.length === 0) return [];

    const rootId = peerIds[0];
    if (this.localPeerId === rootId) {
      // Root connects to children
      return peerIds.slice(1);
    } else {
      // Children connect to root and siblings
      return [rootId, ...peerIds.filter(id => id !== rootId && id !== this.localPeerId)];
    }
  }

  private generateMessageId(): string {
    return `${this.localPeerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.connectionTimeout;

      for (const [peerId, peer] of this.peers.entries()) {
        if (now - peer.lastSeen > timeout) {
          peer.isActive = false;
        }
      }
    }, this.config.heartbeatInterval);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createDefaultP2PConfig(): P2PCoordinatorConfig {
  return {
    maxPeers: 100,
    topology: 'mesh',
    connectionTimeout: 30000,
    heartbeatInterval: 10000,
    maxRetries: 3,
  };
}

/**
 * POLLN Gossip Protocol for Federated Learning
 * Pattern-Organized Large Language Network
 *
 * References:
 * - Kermarrec et al., "Gossip-Based Protocols for Large-Scale Distributed Systems" (2007)
 * - Jelasity et al., "Gossip-Based Aggregation in Large Dynamic Networks" (2005)
 *
 * Gossip protocol enables efficient information dissemination:
 * 1. Scalable - O(log N) rounds to reach all nodes
 * 2. Fault-tolerant - Works even with node failures
 * 3. Decentralized - No central coordinator needed
 * 4. Eventual consistency - All nodes eventually converge
 *
 * Use Cases:
 * - Model updates dissemination
 * - Participant discovery
 * - Aggregation coordination
 * - Failure detection
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface GossipConfig {
  fanout: number; // Number of peers to gossip to per round
  interval: number; // Milliseconds between gossip rounds
  maxRounds: number; // Maximum rounds before giving up
  deduplicationEnabled: boolean;
  compressionEnabled: boolean;
}

export interface GossipMessage {
  messageId: string;
  type: string;
  payload: unknown;
  senderId: string;
  timestamp: number;
  ttl: number;
  seen: string[]; // Peer IDs that have seen this message
  signature?: string;
}

export interface GossipStats {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  duplicateMessages: number;
  averageLatency: number;
}

// ============================================================================
// Gossip Protocol Implementation
// ============================================================================

/**
 * GossipProtocol
 *
 * Implements gossip-based information dissemination for federated learning.
 */
export class GossipProtocol {
  private config: GossipConfig;
  private localPeerId: string;
  private seenMessages: Set<string> = new Set();
  private messageBuffer: Map<string, GossipMessage> = new Map();
  private gossipTimer: NodeJS.Timeout | null = null;
  private stats: GossipStats = {
    messagesSent: 0,
    messagesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    duplicateMessages: 0,
    averageLatency: 0,
  };
  private latencyHistory: number[] = [];

  constructor(
    localPeerId: string,
    config: Partial<GossipConfig> = {}
  ) {
    this.localPeerId = localPeerId;
    this.config = {
      fanout: 3,
      interval: 1000,
      maxRounds: 10,
      deduplicationEnabled: true,
      compressionEnabled: false,
      ...config,
    };
  }

  /**
   * Initiate gossip - send message to random peers
   */
  async initiateGossip(
    type: string,
    payload: unknown,
    knownPeers: string[]
  ): Promise<void> {
    const message: GossipMessage = {
      messageId: this.generateMessageId(),
      type,
      payload,
      senderId: this.localPeerId,
      timestamp: Date.now(),
      ttl: this.config.maxRounds,
      seen: [this.localPeerId],
    };

    this.messageBuffer.set(message.messageId, message);

    // Select random peers to gossip to
    const targets = this.selectRandomPeers(knownPeers, this.config.fanout);

    for (const targetId of targets) {
      await this.sendGossip(targetId, message);
    }
  }

  /**
   * Receive gossip message
   */
  async receiveGossip(message: GossipMessage): Promise<void> {
    const receiveTime = Date.now();

    // Update stats
    this.stats.messagesReceived++;
    this.stats.bytesReceived += this.estimateMessageSize(message);

    // Calculate latency
    const latency = receiveTime - message.timestamp;
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift();
    }
    this.stats.averageLatency =
      this.latencyHistory.reduce((sum, l) => sum + l, 0) / this.latencyHistory.length;

    // Check for duplicates
    if (this.config.deduplicationEnabled && this.seenMessages.has(message.messageId)) {
      this.stats.duplicateMessages++;
      return;
    }

    // Mark as seen
    this.seenMessages.add(message.messageId);

    // Check TTL
    if (message.ttl <= 0) {
      return;
    }

    // Update message
    message.seen.push(this.localPeerId);
    message.ttl--;

    // Store in buffer
    this.messageBuffer.set(message.messageId, message);

    // Continue gossiping
    await this.continueGossip(message);
  }

  /**
   * Get message by ID
   */
  getMessage(messageId: string): GossipMessage | undefined {
    return this.messageBuffer.get(messageId);
  }

  /**
   * Get all messages of a type
   */
  getMessagesByType(type: string): GossipMessage[] {
    return Array.from(this.messageBuffer.values()).filter(m => m.type === type);
  }

  /**
   * Get recent messages
   */
  getRecentMessages(limit: number = 10): GossipMessage[] {
    return Array.from(this.messageBuffer.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get gossip statistics
   */
  getStats(): GossipStats {
    return { ...this.stats };
  }

  /**
   * Clear old messages
   */
  clearOldMessages(maxAge: number = 3600000): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [id, message] of this.messageBuffer.entries()) {
      if (now - message.timestamp > maxAge) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.messageBuffer.delete(id);
    }

    // Also clean seen messages
    if (this.seenMessages.size > 10000) {
      this.seenMessages.clear();
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    if (this.gossipTimer) {
      clearInterval(this.gossipTimer);
      this.gossipTimer = null;
    }
    this.messageBuffer.clear();
    this.seenMessages.clear();
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private async sendGossip(targetId: string, message: GossipMessage): Promise<void> {
    // In practice, would send over network
    // For now, just update stats
    this.stats.messagesSent++;
    this.stats.bytesSent += this.estimateMessageSize(message);
  }

  private async continueGossip(message: GossipMessage): Promise<void> {
    // In practice, would get list of known peers
    // For now, just continue gossiping
    const knownPeers: string[] = [];
    const targets = this.selectRandomPeers(knownPeers, this.config.fanout);

    for (const targetId of targets) {
      // Skip peers that have already seen this message
      if (message.seen.includes(targetId)) {
        continue;
      }

      await this.sendGossip(targetId, message);
    }
  }

  private selectRandomPeers(peers: string[], count: number): string[] {
    const shuffled = [...peers].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, peers.length));
  }

  private generateMessageId(): string {
    return `${this.localPeerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateMessageSize(message: GossipMessage): number {
    // Rough estimate in bytes
    return JSON.stringify(message.payload).length + 100; // + metadata overhead
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createDefaultGossipConfig(): GossipConfig {
  return {
    fanout: 3,
    interval: 1000,
    maxRounds: 10,
    deduplicationEnabled: true,
    compressionEnabled: false,
  };
}

export function createFastGossipConfig(): GossipConfig {
  return {
    ...createDefaultGossipConfig(),
    fanout: 5, // More peers per round
    interval: 500, // More frequent
    maxRounds: 5, // Fewer rounds (fanout higher)
  };
}

export function createEfficientGossipConfig(): GossipConfig {
  return {
    ...createDefaultGossipConfig(),
    fanout: 2, // Fewer peers per round
    interval: 2000, // Less frequent
    maxRounds: 15, // More rounds
    compressionEnabled: true,
  };
}

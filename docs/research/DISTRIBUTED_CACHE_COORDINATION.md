# Distributed KV-Cache Coordination for POLLN

**Pattern-Organized Large Language Network**
**Research Document Phase 4**
**Created:** 2026-03-07

---

## Executive Summary

This document designs a distributed cache coordination system for POLLN's KV-anchor infrastructure, enabling efficient sharing of KV-anchors across multiple nodes/instances while maintaining consistency, handling network partitions gracefully, and preserving privacy guarantees.

### Key Design Goals

1. **Scalability**: Support hundreds of nodes with minimal coordination overhead
2. **Consistency**: Tunable consistency models (strong to eventual)
3. **Fault Tolerance**: Graceful degradation during network partitions
4. **Privacy**: Preserve differential privacy guarantees across nodes
5. **Performance**: Sub-millisecond cache lookups, efficient invalidation

---

## Table of Contents

1. [Background and Motivation](#background-and-motivation)
2. [Distributed Cache Patterns Research](#distributed-cache-patterns-research)
3. [Architecture Overview](#architecture-overview)
4. [Coordination Protocol Design](#coordination-protocol-design)
5. [Node Discovery and Health Checking](#node-discovery-and-health-checking)
6. [Cache Replication Strategies](#cache-replication-strategies)
7. [Cache Invalidation Strategies](#cache-invalidation-strategies)
8. [Consistency Models](#consistency-models)
9. [Conflict Resolution](#conflict-resolution)
10. [Network Partition Handling](#network-partition-handling)
11. [Failure Recovery](#failure-recovery)
12. [Privacy Preservation](#privacy-preservation)
13. [Performance Considerations](#performance-considerations)
14. [Implementation Roadmap](#implementation-roadmap)

---

## Background and Motivation

### Current State

POLLN currently implements:
- **KV-anchor system** (`kvfederated.ts`): Compressed KV-cache representations
- **Federated learning** (`federated.ts`): Cross-colony model aggregation
- **Privacy tiers** (LOCAL, COLONY, MEADOW, PUBLIC): Differential privacy controls

### The Challenge

As POLLN scales to multiple nodes/instances:
1. **Redundant computation**: Same prefixes processed independently
2. **Inconsistent state**: Different nodes may have divergent anchor pools
3. **Network overhead**: Coordinating updates across distributed nodes
4. **Partition tolerance**: System must remain available during network issues

### The Opportunity

Distributed KV-cache coordination enables:
- **Shared prefix computation**: Common prompts computed once, shared globally
- **Load balancing**: Distribute cache hotspots across nodes
- **Improved hit rates**: Larger effective cache size
- **Fault isolation**: Node failures don't lose entire cache

---

## Distributed Cache Patterns Research

### 1. Client-Side Coordination Patterns

#### Cache-Aside (Lazy Loading)
```
Application Flow:
1. Check local cache
2. On miss: check distributed cache
3. On distributed miss: compute and populate both
4. Background sync updates

Pros:
- Simple to implement
- Low coordination overhead
- Works with heterogeneous data

Cons:
- Stale data possible
- Thundering herd on cache miss
- No automatic propagation
```

#### Write-Through
```
Application Flow:
1. Write to cache synchronously
2. Write to backing store
3. Invalidate dependent entries

Pros:
- Strong consistency
- No data loss

Cons:
- High write latency
- Cache bottleneck
```

### 2. Coordination Technologies

| Technology | Latency | Consistency | Use Case |
|------------|---------|-------------|----------|
| **Redis Cluster** | <1ms | Eventual | General-purpose caching |
| **etcd** | 5-10ms | Strong | Configuration, leader election |
| **Consul** | 5-10ms | Eventual | Service discovery, health checking |
| **NATS** | <1ms | At-most-once | Message bus for invalidation |
| **CRDTs** | Variable | Eventual | Mergeable replicated data types |

### 3. Invalidation Strategies

| Strategy | Complexity | Consistency | Network overhead |
|----------|-----------|-------------|------------------|
| **TTL-based** | Low | Weak | None |
| **Version vectors** | Medium | Strong | Medium |
| **Pub/Sub invalidation** | Medium | Medium | Low-Medium |
| **Lease-based** | High | Strong | Low |
| **Anti-entropy** | High | Strong | High |

### 4. CAP Tradeoffs for POLLN

```
┌─────────────────────────────────────────────────────────────┐
│                    CAP THEOREM TRADEOFFS                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   POLLN Priorities:                                         │
│   - Availability: Keep nodes serving requests               │
│   - Partition Tolerance: Survive network splits             │
│   - Consistency: Accept eventual consistency                │
│                                                             │
│   CHOSEN: AP (Availability + Partition Tolerance)           │
│                                                             │
│   RATIONALE:                                                │
│   - Cache inconsistencies are temporary (TTL expires)       │
│   - Stale cache better than downtime                        │
│   - Can reconcile differences asynchronously                │
│                                                             │
│   EXCEPTION:                                                │
│   - Privacy budget accounting: Strong consistency           │
│   - Safety constraints: Strong consistency                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│              DISTRIBUTED CACHE COORDINATION LAYER           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐│
│   │   NODE A    │      │   NODE B    │      │   NODE C    ││
│   │             │      │             │      │             ││
│   │ ┌─────────┐ │      │ ┌─────────┐ │      │ ┌─────────┐ ││
│   │ │ Local   │ │      │ │ Local   │ │      │ │ Local   │ ││
│   │ │ Anchor  │ │      │ │ Anchor  │ │      │ │ Anchor  │ ││
│   │ │  Pool   │ │      │ │  Pool   │ │      │ │  Pool   │ ││
│   │ └────┬────┘ │      │ └────┬────┘ │      │ └────┬────┘ ││
│   │      │      │      │      │      │      │      │      ││
│   │ ┌────▼────┐ │      │ ┌────▼────┐ │      │ ┌────▼────┐ ││
│   │ │ Cache   │ │      │ │ Cache   │ │      │ │ Cache   │ ││
│   │ │Manager  │◄┼──────┼──┤ Manager │◄─────┼──┤ Manager │ ││
│   │ └────┬────┘ │      │ └────┬────┘ │      │ └────┬────┘ ││
│   └──────┼──────┘      └──────┼──────┘      └──────┼──────┘│
│          │                    │                    │        │
│          └────────────────────┼────────────────────┘        │
│                             │                               │
│                    ┌────────▼────────┐                      │
│                    │ COORDINATION    │                      │
│                    │ LAYER           │                      │
│                    │                 │                      │
│                    │ ┌─────────────┐ │                      │
│                    │ │ Discovery   │ │                      │
│                    │ │ Service     │ │                      │
│                    │ ├─────────────┤ │                      │
│                    │ │ Consensus   │ │                      │
│                    │ │ (Raft/Paxos)│ │                      │
│                    │ ├─────────────┤ │                      │
│                    │ │ Invalidation│ │                      │
│                    │ │ Bus (PubSub)│ │                      │
│                    │ ├─────────────┤ │                      │
│                    │ │ Metadata    │ │                      │
│                    │ │ Store       │ │                      │
│                    │ └─────────────┘ │                      │
│                    └─────────────────┘                      │
│                             │                               │
│                    ┌────────▼────────┐                      │
│                    │ PERSISTENCE     │                      │
│                    │ LAYER           │                      │
│                    │                 │                      │
│                    │ • Redis Cluster │                      │
│                    │ • PostgreSQL    │                      │
│                    │ • S3/GCS        │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CACHE REQUEST FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   REQUESTING NODE                                          │
│   ┌─────────────────────────────────────────────────┐      │
│   │ 1. Check local anchor pool                      │      │
│   │    - Hit: Return anchor                         │      │
│   │    - Miss: Proceed to step 2                    │      │
│   │                                                  │      │
│   │ 2. Query peer nodes (parallel)                  │      │
│   │    - Broadcast: anchor_query(embedding, layer)  │      │
│   │    - Wait for responses (timeout)               │      │
│   │                                                  │      │
│   │ 3. Evaluate responses                           │      │
│   │    - Select best matching anchor (similarity)   │      │
│   │    - If similarity > threshold: use it          │      │
│   │    - Else: generate new anchor                  │      │
│   │                                                  │      │
│   │ 4. Update local pool                            │      │
│   │    - Store retrieved/generated anchor           │      │
│   │    - Update metadata (usage count, timestamp)   │      │
│   │                                                  │      │
│   │ 5. Optional: Propagate to peers                 │      │
│   │    - Publish anchor_update event                │      │
│   │    - Asynchronous, no blocking                  │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   PEER NODE                                                 │
│   ┌─────────────────────────────────────────────────┐      │
│   │ 1. Receive anchor_query                          │      │
│   │ 2. Search local pool for matches                │      │
│   │ 3. Return best match (or null)                   │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Coordination Protocol Design

### Message Types

```typescript
/**
 * Base message for all coordination messages
 */
interface CoordinationMessage {
  messageId: string;
  timestamp: number;
  sourceNodeId: string;
  generation: number; // For causal ordering
}

/**
 * Query for an anchor across peers
 */
interface AnchorQueryMessage extends CoordinationMessage {
  type: 'anchor_query';
  embedding: number[];
  layerId: number;
  privacyTier: PrivacyTier;
  similarityThreshold: number;
  timeout: number;
}

/**
 * Response to anchor query
 */
interface AnchorQueryResponse extends CoordinationMessage {
  type: 'anchor_query_response';
  queryId: string;
  anchor?: DistributedKVAnchor;
  similarity: number;
  nodeId: string;
}

/**
 * Announce new or updated anchor
 */
interface AnchorUpdateMessage extends CoordinationMessage {
  type: 'anchor_update';
  anchor: DistributedKVAnchor;
  updateType: 'create' | 'update' | 'delete';
  version: number;
}

/**
 * Invalidation notification
 */
interface AnchorInvalidationMessage extends CoordinationMessage {
  type: 'anchor_invalidation';
  anchorId: string;
  reason: 'expired' | 'evicted' | 'conflict' | 'privacy';
  version?: number;
}

/**
 * Node health check
 */
interface HealthCheckMessage extends CoordinationMessage {
  type: 'health_check';
  nodeId: string;
  status: 'healthy' | 'degraded' | 'leaving';
  load: {
    cpuPercent: number;
    memoryPercent: number;
    anchorCount: number;
    requestRate: number;
  };
}

/**
 * Cluster membership change
 */
interface MembershipMessage extends CoordinationMessage {
  type: 'membership_change';
  changeType: 'join' | 'leave' | 'partition';
  nodeId: string;
  clusterView: ClusterView;
}

/**
 * Metadata sync between nodes
 */
interface MetadataSyncMessage extends CoordinationMessage {
  type: 'metadata_sync';
  metadata: NodeMetadata;
  version: number;
}
```

### Distributed Anchor Type

```typescript
/**
 * KV-anchor with distributed coordination metadata
 */
interface DistributedKVAnchor extends KVAnchor {
  // Distribution metadata
  ownerNodeId: string;
  replicaNodeIds: string[];
  version: number;
  vectorClock: Map<string, number>; // Node ID -> version

  // Coordination metadata
  isPrimary: boolean;
  lastSynced: number;
  syncStatus: 'synced' | 'pending' | 'conflict';

  // Cache metadata
  accessPattern: {
    lastAccess: number;
    accessCount: number;
    hotspots: number[]; // Frequently accessed positions
  };

  // Lease management
  lease?: {
    holderNodeId: string;
    expiresAt: number;
    purpose: 'read' | 'write' | 'transfer';
  };
}
```

### Protocol States

```
┌─────────────────────────────────────────────────────────────┐
│                    NODE STATE MACHINE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐     join      ┌─────────┐                    │
│   │  JOINING│───────────────►│  ACTIVE │                    │
│   └────┬────┘               └────┬────┘                    │
│        │                          │                          │
│        │ timeout/failed           │ partition/leaving        │
│        ▼                          ▼                          │
│   ┌─────────┐               ┌─────────┐                    │
│   │  FAILED │◄──────────────│DEPARTING│                    │
│   └─────────┘  network     └─────────┘                    │
│              recovery                                       │
│                                                             │
│   ┌─────────────────────────────────────────────────┐      │
│   │ ACTIVE STATE SUBSTATES                           │      │
│   ├─────────────────────────────────────────────────┤      │
│   │ • COORDINATING: Participating in cluster ops    │      │
│   │ • SERVING: Handling read requests               │      │
│   │ • SYNCING: Reconciling with peers               │      │
│   │ • COMPACTING: Cleaning up stale data            │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Node Discovery and Health Checking

### Discovery Strategy: Gossip Protocol

```
┌─────────────────────────────────────────────────────────────┐
│                    GOSSIP PROTOCOL                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   PROPERTIES:                                               │
│   - Decentralized: No single point of failure               │
│   - Scalable: O(log N) messages per node                    │
│   - Fault-tolerant: Automatically handles failures          │
│   - Eventual consistency: All nodes converge                │
│                                                             │
│   GOSSIP ROUND (every T seconds):                           │
│   ┌─────────────────────────────────────────────────┐      │
│   │ 1. Select f random peers (fanout)               │      │
│   │ 2. Send membership digest to selected peers     │      │
│   │    - Node ID                                    │      │
│   │    - Heartbeat counter (incremented each round) │      │
│   │    - State (ACTIVE, LEAVING, SUSPECTED)         │      │
│   │    - Load metrics                               │      │
│   │ 3. Receive digests from peers                   │      │
│   │ 4. Merge received information                   │      │
│   │    - Update local view                          │      │
│   │    - Detect failures (heartbeat not incr)       │      │
│   │    - Detect new nodes                           │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   FAILURE DETECTION:                                        │
│   ┌─────────────────────────────────────────────────┐      │
│   │ 1. Node suspected: heartbeat not increased      │      │
│   │ 2. Wait φ (phi) suspect intervals               │      │
│   │ 3. Mark as FAILED if still suspect              │      │
│   │ 4. Broadcast failure to cluster                 │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   CONFIGURATION:                                            │
│   - Gossip interval: 1 second                              │
│   - Fanout: 3 peers                                        │
│   - Phi suspect: 5 intervals (5 seconds)                   │
│   - Cleanup: Remove failed nodes after 30 seconds          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
/**
 * Gossip-based membership protocol
 */
class GossipMembership {
  private localNode: NodeInfo;
  private membershipView: Map<string, MemberState> = new Map();
  private gossipInterval: number = 1000; // 1 second
  private fanout: number = 3;
  private phiSuspect: number = 5;

  /**
   * Start gossip protocol
   */
  start(): void {
    setInterval(() => {
      this.gossipRound();
    }, this.gossipInterval);
  }

  /**
   * Single gossip round
   */
  private async gossipRound(): Promise<void> {
    // Increment heartbeat
    this.localNode.heartbeatCounter++;

    // Select random peers
    const peers = this.selectRandomPeers(this.fanout);

    // Create digest
    const digest = this.createDigest();

    // Send to peers (parallel)
    await Promise.allSettled(
      peers.map(peer => this.sendDigest(peer, digest))
    );
  }

  /**
   * Create membership digest
   */
  private createDigest(): MembershipDigest {
    return {
      sourceNodeId: this.localNode.id,
      heartbeatCounter: this.localNode.heartbeatCounter,
      members: Array.from(this.membershipView.values()).map(m => ({
        nodeId: m.nodeId,
        heartbeatCounter: m.heartbeatCounter,
        state: m.state,
        load: m.load,
      })),
    };
  }

  /**
   * Handle received digest
   */
  private handleDigest(digest: MembershipDigest): void {
    for (const member of digest.members) {
      const existing = this.membershipView.get(member.nodeId);

      if (!existing) {
        // New node discovered
        this.membershipView.set(member.nodeId, {
          nodeId: member.nodeId,
          heartbeatCounter: member.heartbeatCounter,
          state: 'ACTIVE',
          load: member.load,
          lastSeen: Date.now(),
        });
        this.emit('node_discovered', member);
      } else {
        // Existing node
        if (member.heartbeatCounter > existing.heartbeatCounter) {
          // Heartbeat increased, node is alive
          existing.heartbeatCounter = member.heartbeatCounter;
          existing.state = 'ACTIVE';
          existing.lastSeen = Date.now();
          existing.load = member.load;

          if (existing.state === 'SUSPECTED') {
            this.emit('node_recovered', existing);
          }
        } else {
          // Heartbeat not increased, suspect failure
          if (existing.state === 'ACTIVE') {
            existing.state = 'SUSPECTED';
            existing.suspectedAt = Date.now();
            this.emit('node_suspected', existing);
          } else if (existing.state === 'SUSPECTED') {
            const timeSinceSuspected = Date.now() - existing.suspectedAt!;
            if (timeSinceSuspected > this.phiSuspect * this.gossipInterval) {
              existing.state = 'FAILED';
              this.emit('node_failed', existing);
            }
          }
        }
      }
    }
  }

  /**
   * Get cluster members
   */
  getMembers(): MemberState[] {
    return Array.from(this.membershipView.values())
      .filter(m => m.state === 'ACTIVE');
  }

  /**
   * Select random peers for gossip
   */
  private selectRandomPeers(count: number): MemberState[] {
    const members = this.getMembers();
    const shuffled = members.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}
```

### Health Checking

```typescript
/**
 * Health check protocol
 */
class HealthCheckProtocol {
  private checkInterval: number = 5000; // 5 seconds
  private checkTimeout: number = 2000; // 2 seconds
  private unhealthyThreshold: number = 3; // consecutive failures

  private healthStatus: Map<string, NodeHealth> = new Map();

  /**
   * Start health checking
   */
  start(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.checkInterval);
  }

  /**
   * Perform health checks on all nodes
   */
  private async performHealthChecks(): Promise<void> {
    const nodes = this.getActiveNodes();

    await Promise.allSettled(
      nodes.map(node => this.checkNode(node))
    );
  }

  /**
   * Check individual node health
   */
  private async checkNode(node: NodeInfo): Promise<void> {
    try {
      const response = await fetch(
        `${node.address}/health`,
        { signal: AbortSignal.timeout(this.checkTimeout) }
      );

      const health = await response.json();

      if (health.status === 'healthy') {
        this.recordSuccess(node.id);
      } else {
        this.recordFailure(node.id, 'unhealthy_response');
      }
    } catch (error) {
      this.recordFailure(node.id, error instanceof Error ? error.message : 'unknown');
    }
  }

  /**
   * Record successful health check
   */
  private recordSuccess(nodeId: string): void {
    const health = this.healthStatus.get(nodeId) || {
      nodeId,
      consecutiveFailures: 0,
      lastCheck: Date.now(),
      status: 'healthy',
    };

    health.consecutiveFailures = 0;
    health.lastCheck = Date.now();
    health.status = 'healthy';

    this.healthStatus.set(nodeId, health);
  }

  /**
   * Record failed health check
   */
  private recordFailure(nodeId: string, reason: string): void {
    const health = this.healthStatus.get(nodeId) || {
      nodeId,
      consecutiveFailures: 0,
      lastCheck: Date.now(),
      status: 'healthy',
    };

    health.consecutiveFailures++;
    health.lastCheck = Date.now();
    health.lastFailure = reason;

    if (health.consecutiveFailures >= this.unhealthyThreshold) {
      health.status = 'unhealthy';
      this.emit('node_unhealthy', { nodeId, reason });
    }

    this.healthStatus.set(nodeId, health);
  }

  /**
   * Get healthy nodes only
   */
  getHealthyNodes(): NodeInfo[] {
    return Array.from(this.healthStatus.values())
      .filter(h => h.status === 'healthy')
      .map(h => this.getNodeById(h.nodeId))
      .filter((n): n is NodeInfo => n !== undefined);
  }
}
```

---

## Cache Replication Strategies

### Strategy Comparison

| Strategy | Write Latency | Read Latency | Fault Tolerance | Complexity |
|----------|--------------|--------------|-----------------|------------|
| **No Replication** | Low | Low | None | Low |
| **Leader-based** | Medium | Low | Medium | Medium |
| **Quorum-based** | High | Medium | High | High |
| **Gossip-based** | Low | Low | High | Medium |
| **Chain Replication** | Medium | Low | Medium | Medium |

### Recommended Strategy: Adaptive Replication

```
┌─────────────────────────────────────────────────────────────┐
│              ADAPTIVE REPLICATION STRATEGY                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ANCHOR CLASSIFICATION:                                    │
│   ┌─────────────────────────────────────────────────┐      │
│   │ HOT (frequently accessed)                       │      │
│   │ • Replicate to 3 nodes                          │      │
│   │ • Use quorum reads/writes                       │      │
│   │ • Proactive invalidation                        │      │
│   ├─────────────────────────────────────────────────┤      │
│   │ WARM (moderately accessed)                      │      │
│   │ • Replicate to 2 nodes                          │      │
│   │ • Use leader-based writes                       │      │
│   │ • Lazy invalidation                             │      │
│   ├─────────────────────────────────────────────────┤      │
│   │ COLD (rarely accessed)                          │      │
│   │ • Single replica                                │      │
│   │ • Local only                                    │      │
│   │ • On-demand replication                         │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   ADAPTIVE LOGIC:                                          │
│   ┌─────────────────────────────────────────────────┐      │
│   │ IF access_rate > threshold_high:                │      │
│   │   Upgrade to HOT                                │      │
│   │ ELIF access_rate > threshold_low:               │      │
│   │   Maintain current tier                         │      │
│   │ ELSE:                                            │      │
│   │   Downgrade to COLD                             │      │
│   │   Demote replicas after grace period            │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
/**
 * Adaptive replication manager
 */
class AdaptiveReplicationManager {
  private replicationFactors: Map<string, ReplicationConfig> = new Map();

  private thresholds = {
    hot: 100, // accesses per minute
    warm: 10, // accesses per minute
    cold: 0,  // below warm
  };

  /**
   * Determine replication strategy for anchor
   */
  determineReplication(anchorId: string, accessRate: number): ReplicationConfig {
    if (accessRate > this.thresholds.hot) {
      return {
        tier: 'HOT',
        replicationFactor: 3,
        consistency: 'quorum',
        invalidation: 'proactive',
      };
    } else if (accessRate > this.thresholds.warm) {
      return {
        tier: 'WARM',
        replicationFactor: 2,
        consistency: 'leader',
        invalidation: 'lazy',
      };
    } else {
      return {
        tier: 'COLD',
        replicationFactor: 1,
        consistency: 'eventual',
        invalidation: 'on_demand',
      };
    }
  }

  /**
   * Replicate anchor to target nodes
   */
  async replicateAnchor(
    anchor: DistributedKVAnchor,
    targetNodes: string[]
  ): Promise<void> {
    const replicationTasks = targetNodes.map(nodeId =>
      this.sendToNode(nodeId, {
        type: 'anchor_update',
        anchor,
        updateType: 'create',
      })
    );

    await Promise.allSettled(replicationTasks);
  }

  /**
   * Select replica nodes for anchor
   */
  selectReplicaNodes(
    anchorId: string,
    replicationFactor: number,
    excludeNodes: string[] = []
  ): string[] {
    const allNodes = this.getHealthyNodes();
    const available = allNodes.filter(n => !excludeNodes.includes(n.id));

    // Hash-based selection for consistency
    const hash = this.hashAnchorId(anchorId);
    const sorted = available.sort((a, b) =>
      this.hashCombine(hash, a.id) - this.hashCombine(hash, b.id)
    );

    return sorted.slice(0, replicationFactor).map(n => n.id);
  }

  /**
   * Hash anchor ID for consistent selection
   */
  private hashAnchorId(anchorId: string): number {
    let hash = 0;
    for (let i = 0; i < anchorId.length; i++) {
      hash = ((hash << 5) - hash) + anchorId.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Combine hashes
   */
  private hashCombine(a: number, b: string): number {
    return (a * 31 + this.hashAnchorId(b)) >>> 0;
  }
}
```

---

## Cache Invalidation Strategies

### Strategy: Multi-Tier Invalidation

```
┌─────────────────────────────────────────────────────────────┐
│              MULTI-TIER INVALIDATION                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   TIER 1: Immediate Invalidation (Critical)                │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Triggers:                                       │      │
│   │ • Privacy budget exhausted                      │      │
│   │ • Safety constraint violation                   │      │
│   │ • Explicit delete request                       │      │
│   │                                                  │      │
│   │ Method:                                         │      │
│   │ • Broadcast invalidation to all nodes           │      │
│   │ • Synchronous confirmation required             │      │
│   │ • Block until all nodes acknowledge             │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   TIER 2: Lazy Invalidation (Standard)                     │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Triggers:                                       │      │
│   │ • Anchor updated                                │      │
│   │ • TTL expired                                   │      │
│   │ • Replication factor changed                    │      │
│   │                                                  │      │
│   │ Method:                                         │      │
│   │ • Publish invalidation event                    │      │
│   │ • Asynchronous, no blocking                     │      │
│   │ • Nodes invalidate on next access               │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   TIER 3: TTL-Based Expiration (Background)                │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Triggers:                                       │      │
│   │ • Time-based expiration                         │      │
│   │ • LRU eviction                                  │      │
│   │                                                  │      │
│   │ Method:                                         │      │
│   │ • Background cleanup process                    │      │
│   │ • No coordination needed                        │      │
│   │ • Local decision only                           │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
/**
 * Multi-tier invalidation manager
 */
class InvalidationManager {
  private messageBus: MessageBus;
  private localCache: LocalCacheManager;

  /**
   * Invalidate anchor immediately (critical)
   */
  async invalidateImmediate(anchorId: string, reason: string): Promise<void> {
    const message: AnchorInvalidationMessage = {
      type: 'anchor_invalidation',
      messageId: uuidv4(),
      timestamp: Date.now(),
      sourceNodeId: this.localNodeId,
      generation: this.incrementGeneration(),
      anchorId,
      reason,
      tier: 'immediate',
    };

    // Broadcast to all nodes
    const allNodes = this.getClusterNodes();
    const confirmations = await Promise.allSettled(
      allNodes.map(node => this.sendAndAwaitAck(node, message))
    );

    // Check for failures
    const failures = confirmations.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      throw new Error(`Failed to invalidate on ${failures.length} nodes`);
    }

    // Invalidate locally
    this.localCache.invalidate(anchorId);
  }

  /**
   * Invalidate anchor lazily (standard)
   */
  async invalidateLazy(anchorId: string, reason: string): Promise<void> {
    const message: AnchorInvalidationMessage = {
      type: 'anchor_invalidation',
      messageId: uuidv4(),
      timestamp: Date.now(),
      sourceNodeId: this.localNodeId,
      generation: this.incrementGeneration(),
      anchorId,
      reason,
      tier: 'lazy',
    };

    // Publish to invalidation topic
    await this.messageBus.publish('anchor_invalidation', message);

    // Invalidate locally
    this.localCache.invalidate(anchorId);
  }

  /**
   * Handle received invalidation
   */
  async handleInvalidation(message: AnchorInvalidationMessage): Promise<void> {
    switch (message.tier) {
      case 'immediate':
        // Immediately invalidate and acknowledge
        this.localCache.invalidate(message.anchorId);
        await this.sendAck(message.sourceNodeId, message.messageId);
        break;

      case 'lazy':
        // Mark for lazy invalidation
        this.localCache.markStale(message.anchorId);
        break;
    }
  }

  /**
   * Background cleanup process
   */
  startBackgroundCleanup(): void {
    // Run every minute
    setInterval(() => {
      this.cleanupExpired();
      this.cleanupLRU();
    }, 60000);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const anchors = this.localCache.getAll();

    for (const anchor of anchors) {
      if (anchor.expiresAt && anchor.expiresAt < now) {
        this.localCache.invalidate(anchor.anchorId);
      }
    }
  }

  /**
   * Clean up least recently used entries
   */
  private cleanupLRU(): void {
    const maxCacheSize = this.getConfig('maxCacheSize');
    const currentSize = this.localCache.size();

    if (currentSize > maxCacheSize) {
      const excess = currentSize - maxCacheSize;
      const lruEntries = this.localCache.getLRUEntries(excess);

      for (const entry of lruEntries) {
        this.localCache.invalidate(entry.anchorId);
      }
    }
  }
}
```

### Version-Based Invalidation

```typescript
/**
 * Version-based cache coherence
 */
class VersionedCache {
  private versions: Map<string, CacheVersion> = new Map();

  /**
   * Check if cached version is current
   */
  isCurrent(anchorId: string, version: number): boolean {
    const current = this.versions.get(anchorId);
    return current ? current.version === version : false;
  }

  /**
   * Update version
   */
  updateVersion(anchorId: string, newVersion: number): void {
    const existing = this.versions.get(anchorId);

    this.versions.set(anchorId, {
      anchorId,
      version: newVersion,
      previousVersion: existing?.version,
      updatedAt: Date.now(),
    });
  }

  /**
   * Get current version
   */
  getVersion(anchorId: string): number | undefined {
    return this.versions.get(anchorId)?.version;
  }

  /**
   * Compare versions for conflict detection
   */
  detectConflict(
    anchorId: string,
    localVersion: number,
    remoteVersion: number
  ): boolean {
    const current = this.versions.get(anchorId);

    if (!current) return false;

    // Conflict if both versions are newer than current
    return localVersion > current.version &&
           remoteVersion > current.version &&
           localVersion !== remoteVersion;
  }
}
```

---

## Consistency Models

### Consistency Spectrum

```
┌─────────────────────────────────────────────────────────────┐
│                  CONSISTENCY SPECTRUM                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Strong              Weak                              │
│   │                                                 │      │
│   ▼                                                 ▼      │
│                                                             │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│   │Lineariz│ │ │Sequential│ │Causal   │ │Eventual │        │
│   │ ability │ │ │Consistency│ │Consistency│ │         │        │
│   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘        │
│        │            │            │            │             │
│        │            │            │            │             │
│   Latency:     Latency:     Latency:     Latency:          │
│   High         Medium       Medium       Low               │
│   Availability: Availability: Availability: Availability:   │
│   Low          Medium       High         High              │
│                                                             │
│   POLLN DEFAULT: Causal Consistency                         │
│   - Reasonable performance                                 │
│   - Intuitive ordering                                      │
│   - Good for distributed operations                        │
│                                                             │
│   EXCEPTIONS:                                               │
│   - Privacy budget: Strong consistency                      │
│   - Safety constraints: Strong consistency                  │
│   - KV-anchor metadata: Causal consistency                  │
│   - Cache data: Eventual consistency                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Causal Consistency Implementation

```typescript
/**
 * Causal consistency using vector clocks
 */
class CausalConsistencyManager {
  private vectorClocks: Map<string, VectorClock> = new Map();

  /**
   * Create vector clock for operation
   */
  createClock(anchorId: string): VectorClock {
    return {
      anchorId,
      versions: new Map([[this.localNodeId, 0]]),
      timestamp: Date.now(),
    };
  }

  /**
   * Increment local clock
   */
  incrementClock(anchorId: string): VectorClock {
    const clock = this.vectorClocks.get(anchorId) ||
                  this.createClock(anchorId);

    const localVersion = (clock.versions.get(this.localNodeId) || 0) + 1;
    clock.versions.set(this.localNodeId, localVersion);
    clock.timestamp = Date.now();

    this.vectorClocks.set(anchorId, clock);
    return clock;
  }

  /**
   * Merge vector clocks (sync operation)
   */
  mergeClocks(anchorId: string, remoteClock: VectorClock): VectorClock {
    const local = this.vectorClocks.get(anchorId) ||
                  this.createClock(anchorId);

    const merged: Map<string, number> = new Map();

    // Get all node IDs
    const allNodes = new Set([
      ...local.versions.keys(),
      ...remoteClock.versions.keys(),
    ]);

    // Take max version for each node
    for (const nodeId of allNodes) {
      const localVersion = local.versions.get(nodeId) || 0;
      const remoteVersion = remoteClock.versions.get(nodeId) || 0;
      merged.set(nodeId, Math.max(localVersion, remoteVersion));
    }

    const mergedClock: VectorClock = {
      anchorId,
      versions: merged,
      timestamp: Math.max(local.timestamp, remoteClock.timestamp),
    };

    this.vectorClocks.set(anchorId, mergedClock);
    return mergedClock;
  }

  /**
   * Compare clocks for ordering
   */
  compareClocks(clock1: VectorClock, clock2: VectorClock): OrderResult {
    let clock1Greater = false;
    let clock2Greater = false;

    const allNodes = new Set([
      ...clock1.versions.keys(),
      ...clock2.versions.keys(),
    ]);

    for (const nodeId of allNodes) {
      const v1 = clock1.versions.get(nodeId) || 0;
      const v2 = clock2.versions.get(nodeId) || 0;

      if (v1 > v2) clock1Greater = true;
      if (v2 > v1) clock2Greater = true;
    }

    if (clock1Greater && !clock2Greater) return 'after';
    if (clock2Greater && !clock1Greater) return 'before';
    if (!clock1Greater && !clock2Greater) return 'equal';
    return 'concurrent';
  }

  /**
   * Check if operation can be applied (causally)
   */
  canApply(operation: CausalOperation): boolean {
    const clock = this.vectorClocks.get(operation.anchorId);
    if (!clock) return true;

    const comparison = this.compareClocks(operation.dependsOn, clock);

    // Can apply if operation depends on current or past state
    return comparison === 'before' || comparison === 'equal';
  }
}
```

### Tunable Consistency

```typescript
/**
 * Tunable consistency configuration
 */
interface ConsistencyConfig {
  // Default consistency level
  default: 'strong' | 'causal' | 'eventual';

  // Per-operation overrides
  overrides: {
    privacyBudget: 'strong';
    safetyChecks: 'strong';
    anchorRead: 'causal';
    anchorWrite: 'causal';
    cacheInvalidation: 'eventual';
    gossip: 'eventual';
  };

  // Quorum settings
  quorum: {
    read: number; // e.g., 2 (read from 2 replicas)
    write: number; // e.g., 2 (write to 2 replicas)
  };
}

/**
 * Consistency manager
 */
class ConsistencyManager {
  private config: ConsistencyConfig;

  /**
   * Execute operation with specified consistency
   */
  async execute<T>(
    operation: () => Promise<T>,
    consistency: ConsistencyConfig['default']
  ): Promise<T> {
    switch (consistency) {
      case 'strong':
        return this.executeStrong(operation);

      case 'causal':
        return this.executeCausal(operation);

      case 'eventual':
        return this.executeEventual(operation);
    }
  }

  /**
   * Strong consistency: Linearizable
   */
  private async executeStrong<T>(operation: () => Promise<T>): Promise<T> {
    // Acquire distributed lock
    const lock = await this.acquireLock();

    try {
      // Execute with quorum
      const result = await this.executeWithQuorum(operation);

      // Wait for all replicas to confirm
      await this.waitForReplicas();

      return result;
    } finally {
      await this.releaseLock(lock);
    }
  }

  /**
   * Causal consistency
   */
  private async executeCausal<T>(operation: () => Promise<T>): Promise<T> {
    // Check causal dependencies
    await this.checkCausalDependencies();

    // Execute operation
    const result = await operation();

    // Update vector clock
    await this.updateVectorClock();

    // Async replication (don't wait)
    this.replicateToPeers().catch(err =>
      console.error('Replication failed:', err)
    );

    return result;
  }

  /**
   * Eventual consistency
   */
  private async executeEventual<T>(operation: () => Promise<T>): Promise<T> {
    // Execute locally
    const result = await operation();

    // Fire-and-forget replication
    this.replicateToPeers().catch(err =>
      console.error('Replication failed:', err)
    );

    return result;
  }
}
```

---

## Conflict Resolution

### Conflict Types

```
┌─────────────────────────────────────────────────────────────┐
│                    CONFLICT TYPES                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. WRITE-WRITE CONFLICTS                                  │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Scenario: Two nodes update same anchor          │      │
│   │                                                  │      │
│   │ Resolution Strategies:                          │      │
│   │ • Last-Writer-Wins (LWW) using timestamps       │      │
│   │ • Vector clock comparison (causal)              │      │
│   │ • Application-specific merge                    │      │
│   │ • Manual resolution (operator intervention)      │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   2. READ-WRITE CONFLICTS                                   │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Scenario: Read stale data during update         │      │
│   │                                                  │      │
│   │ Resolution Strategies:                          │      │
│   │ • Version checks before writes                  │      │
│   │ • Read repair (detect and fix stale reads)      │      │
│   │ • Quorum reads (read from majority)             │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   3. NETWORK PARTITION CONFLICTS                            │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Scenario: Split-brain, divergent updates        │      │
│   │                                                  │      │
│   │ Resolution Strategies:                          │      │
│   │ • Automatic merge on reconnection               │      │
│   │ • Last-Writer-Wins based on timestamps          │      │
│   │ • Conflict-free replicated data types (CRDTs)   │      │
│   │ • Tombstone-based resolution                    │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Resolution Strategies

```typescript
/**
 * Conflict resolver
 */
class ConflictResolver {
  /**
   * Resolve write-write conflict
   */
  resolveWriteWriteConflict(
    local: DistributedKVAnchor,
    remote: DistributedKVAnchor
  ): DistributedKVAnchor {
    // Compare vector clocks
    const comparison = this.compareVectorClocks(
      local.vectorClock,
      remote.vectorClock
    );

    switch (comparison) {
      case 'before':
        // Remote is newer
        return remote;

      case 'after':
        // Local is newer
        return local;

      case 'concurrent':
        // Concurrent updates, merge
        return this.mergeAnchors(local, remote);

      case 'equal':
        // Same version, return either
        return local;
    }
  }

  /**
   * Merge concurrent updates
   */
  private mergeAnchors(
    local: DistributedKVAnchor,
    remote: DistributedKVAnchor
  ): DistributedKVAnchor {
    // Strategy: Take max of quality scores, merge metadata
    const merged: DistributedKVAnchor = {
      ...local,
      qualityScore: Math.max(local.qualityScore, remote.qualityScore),
      version: Math.max(local.version, remote.version) + 1,
      vectorClock: this.mergeVectorClocks(local.vectorClock, remote.vectorClock),
      usageCount: local.usageCount + remote.usageCount,
      lastAccess: Math.max(local.lastAccess, remote.lastAccess),
      mergeHistory: [
        ...(local.mergeHistory || []),
        { source: 'merge', timestamp: Date.now() },
      ],
    };

    return merged;
  }

  /**
   * Resolve using CRDT (Last-Writer-Wins)
   */
  resolveWithLWW(
    local: DistributedKVAnchor,
    remote: DistributedKVAnchor
  ): DistributedKVAnchor {
    // Use timestamp-based LWW
    return local.lastAccess > remote.lastAccess ? local : remote;
  }

  /**
   * Resolve using operation-based merge
   */
  resolveWithOperationMerge(
    local: DistributedKVAnchor,
    remote: DistributedKVAnchor,
    operations: Operation[]
  ): DistributedKVAnchor {
    let result = local;

    // Apply operations in timestamp order
    const sorted = operations.sort((a, b) => a.timestamp - b.timestamp);

    for (const op of sorted) {
      result = this.applyOperation(result, op);
    }

    return result;
  }
}
```

### CRDT-Based Resolution

```typescript
/**
 * LWW-Element-Set for anchor metadata
 */
class LWWElementSet<T> {
  private adds: Map<string, { value: T; timestamp: number }> = new Map();
  private removes: Map<string, { timestamp: number }> = new Map();

  /**
   * Add element
   */
  add(elementId: string, value: T, timestamp: number): void {
    const existing = this.adds.get(elementId);

    if (!existing || timestamp > existing.timestamp) {
      this.adds.set(elementId, { value, timestamp });
    }
  }

  /**
   * Remove element
   */
  remove(elementId: string, timestamp: number): void {
    const existing = this.removes.get(elementId);

    if (!existing || timestamp > existing.timestamp) {
      this.removes.set(elementId, { timestamp });
    }
  }

  /**
   * Get current set
   */
  get(): T[] {
    const result: T[] = [];

    for (const [elementId, add] of this.adds.entries()) {
      const remove = this.removes.get(elementId);

      // Element exists if add is after remove
      if (!remove || add.timestamp > remove.timestamp) {
        result.push(add.value);
      }
    }

    return result;
  }

  /**
   * Merge with another LWW set
   */
  merge(other: LWWElementSet<T>): void {
    // Merge adds
    for (const [elementId, add] of other.adds.entries()) {
      const existing = this.adds.get(elementId);
      if (!existing || add.timestamp > existing.timestamp) {
        this.adds.set(elementId, add);
      }
    }

    // Merge removes
    for (const [elementId, remove] of other.removes.entries()) {
      const existing = this.removes.get(elementId);
      if (!existing || remove.timestamp > existing.timestamp) {
        this.removes.set(elementId, remove);
      }
    }
  }
}
```

---

## Network Partition Handling

### Partition Detection

```typescript
/**
 * Network partition detector
 */
class PartitionDetector {
  private suspectTimeout: number = 5000; // 5 seconds
  private partitionTimeout: number = 15000; // 15 seconds
  private suspects: Map<string, number> = new Map(); // nodeId -> suspectTime

  /**
   * Check for network partition
   */
  async detectPartition(): Promise<PartitionInfo> {
    const healthyNodes = await this.getHealthyNodes();
    const totalNodes = await this.getTotalNodes();

    const healthyRatio = healthyNodes.length / totalNodes.length;

    // Partition detected if less than quorum
    const hasPartition = healthyRatio < 0.5;

    // Get partition ID (based on reachable nodes)
    const partitionId = hasPartition
      ? this.computePartitionId(healthyNodes)
      : 'primary';

    return {
      hasPartition,
      partitionId,
      healthyNodes: healthyNodes.map(n => n.id),
      partitionedNodes: totalNodes
        .filter(n => !healthyNodes.includes(n))
        .map(n => n.id),
      healthyRatio,
      isMinority: healthyRatio < 0.5,
    };
  }

  /**
   * Compute partition ID
   */
  private computePartitionId(nodes: NodeInfo[]): string {
    // Sort node IDs and hash
    const sorted = nodes.map(n => n.id).sort();
    const hash = this.hashArray(sorted);
    return `partition-${hash}`;
  }

  /**
   * Handle partition detected
   */
  async handlePartition(info: PartitionInfo): Promise<void> {
    if (info.isMinority) {
      // Minority partition: degrade service
      this.enterDegradedMode();
    } else {
      // Majority partition: continue operations
      await this.continueOperations();
    }
  }
}
```

### Partition Tolerance Strategies

```
┌─────────────────────────────────────────────────────────────┐
│            PARTITION TOLERANCE STRATEGIES                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   STRATEGY 1: DEGRADE READS                                │
│   ┌─────────────────────────────────────────────────┐      │
│   │ • Serve stale data from local cache              │      │
│   │ • Skip remote reads                              │      │
│   │ • Return best-effort results                    │      │
│   │                                                  │      │
│   │ Use case: Non-critical operations                │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   STRATEGY 2: QUEUE WRITES                                 │
│   ┌─────────────────────────────────────────────────┐      │
│   │ • Buffer writes locally                          │      │
│   │ • Apply when partition heals                    │      │
│   │ • Conflicts resolved by LWW                     │      │
│   │                                                  │      │
│   │ Use case: Important but non-blocking writes      │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   STRATEGY 3: MAJORITY QUORUM                              │
│   ┌─────────────────────────────────────────────────┐      │
│   │ • Only proceed with majority partition          │      │
│   │ • Minority partition rejects writes             │      │
│   │ • Prevents split-brain                          │      │
│   │                                                  │      │
│   │ Use case: Critical operations                   │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   STRATEGY 4: TOMBSTONES                                   │
│   ┌─────────────────────────────────────────────────┐      │
│   │ • Mark deleted items (don't actually delete)    │      │
│   │ • Tombstones replicated after partition         │      │
│   │ • Prevents zombie reanimations                  │      │
│   │                                                  │      │
│   │ Use case: All operations                       │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
/**
 * Partition tolerance manager
 */
class PartitionToleranceManager {
  private mode: 'normal' | 'degraded' | 'offline' = 'normal';
  private writeBuffer: WriteBuffer = new WriteBuffer();

  /**
   * Handle partition start
   */
  async onPartitionStart(info: PartitionInfo): Promise<void> {
    if (info.isMinority) {
      this.mode = 'degraded';

      // Enable write buffering
      this.writeBuffer.enable();

      // Notify cluster
      await this.broadcastDegradedMode();
    } else {
      // Majority partition
      this.mode = 'normal';
      await this.continueOperations();
    }
  }

  /**
   * Handle partition end
   */
  async onPartitionEnd(info: PartitionInfo): Promise<void> {
    // Sync with healed nodes
    await this.syncWithHealedPartition(info);

    // Apply buffered writes
    await this.applyBufferedWrites();

    // Resume normal operations
    this.mode = 'normal';
    this.writeBuffer.disable();
  }

  /**
   * Execute read with partition tolerance
   */
  async executeRead<T>(
    operation: () => Promise<T>,
    options: PartitionToleranceOptions
  ): Promise<T | null> {
    if (this.mode === 'degraded' && options.allowStale) {
      // Return stale data from local cache
      return this.getLocalStaleData();
    }

    if (this.mode === 'offline') {
      return null;
    }

    // Normal read
    try {
      return await Promise.race([
        operation(),
        this.timeout(options.timeout),
      ]);
    } catch (error) {
      if (options.allowStale) {
        return this.getLocalStaleData();
      }
      throw error;
    }
  }

  /**
   * Execute write with partition tolerance
   */
  async executeWrite<T>(
    operation: () => Promise<T>,
    options: PartitionToleranceOptions
  ): Promise<T> {
    if (this.mode === 'degraded') {
      if (options.bufferWrite) {
        // Buffer write for later
        return this.writeBuffer.add(operation);
      }

      if (options.rejectWrite) {
        throw new Error('Cannot execute write in degraded mode');
      }
    }

    // Normal write
    return operation();
  }

  /**
   * Sync with healed partition
   */
  private async syncWithHealedPartition(info: PartitionInfo): Promise<void> {
    // 1. Exchange vector clocks
    const remoteClocks = await this.exchangeVectorClocks(info.healedNodes);

    // 2. Identify conflicts
    const conflicts = this.identifyConflicts(remoteClocks);

    // 3. Resolve conflicts
    for (const conflict of conflicts) {
      const resolved = this.resolveConflict(conflict);
      await this.applyResolved(resolved);
    }

    // 4. Replicate tombstones
    await this.replicateTombstones(info.healedNodes);
  }
}
```

---

## Failure Recovery

### Failure Scenarios

```
┌─────────────────────────────────────────────────────────────┐
│                   FAILURE SCENARIOS                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. NODE FAILURE                                           │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Detection: Health check timeout                 │      │
│   │ Action:                                         │      │
│   │ • Mark node as failed                           │      │
│   │ • Re-replicate data to other nodes              │      │
│   │ • Update routing tables                         │      │
│   │ Recovery:                                       │      │
│   │ • Node rejoins cluster                         │      │
│   │ • Sync missed updates                          │      │
│   │ • Resume normal operations                     │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   2. NETWORK PARTITION                                      │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Detection: Quorum lost                          │      │
│   │ Action:                                         │      │
│   │ • Enter degraded mode                          │      │
│   │ • Buffer writes locally                        │      │
│   │ • Serve stale reads if allowed                 │      │
│   │ Recovery:                                       │      │
│   │ • Detect partition healing                     │      │
│   │ • Sync vector clocks                           │      │
│   │ • Resolve conflicts                            │      │
│   │ • Apply buffered writes                        │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   3. CORRUPTED DATA                                          │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Detection: Checksum failure                     │      │
│   │ Action:                                         │      │
│   │ • Mark data as corrupted                       │      │
│   │ • Request from other replicas                  │      │
│   │ • If all corrupted: panic                      │      │
│   │ Recovery:                                       │      │
│   │ • Restore from backup                          │      │
│   │ • Rebuild from other sources                   │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Recovery Process

```typescript
/**
 * Failure recovery manager
 */
class FailureRecoveryManager {
  /**
   * Recover failed node
   */
  async recoverNode(nodeId: string): Promise<void> {
    // 1. Verify node is healthy
    const health = await this.checkNodeHealth(nodeId);
    if (!health.isHealthy) {
      throw new Error('Node is not healthy');
    }

    // 2. Bootstrap node metadata
    await this.bootstrapMetadata(nodeId);

    // 3. Determine missing data
    const missingData = await this.identifyMissingData(nodeId);

    // 4. Stream missing data
    await this.streamDataToNode(nodeId, missingData);

    // 5. Verify data integrity
    const verified = await this.verifyDataIntegrity(nodeId);
    if (!verified) {
      throw new Error('Data verification failed');
    }

    // 6. Mark node as recovered
    await this.markNodeRecovered(nodeId);

    // 7. Update cluster routing
    await this.updateRouting(nodeId);
  }

  /**
   * Identify missing data
   */
  private async identifyMissingData(nodeId: string): Promise<MissingDataInfo> {
    const localVectorClock = await this.getLocalVectorClock();
    const remoteVectorClock = await this.getRemoteVectorClock(nodeId);

    const missing: string[] = [];

    // Compare vector clocks
    for (const [anchorId, localVersion] of localVectorClock.entries()) {
      const remoteVersion = remoteVectorClock.get(anchorId) || 0;

      if (localVersion > remoteVersion) {
        missing.push(anchorId);
      }
    }

    return {
      nodeId,
      missingAnchorIds: missing,
      totalSize: missing.length,
    };
  }

  /**
   * Stream data to node
   */
  private async streamDataToNode(
    nodeId: string,
    missingData: MissingDataInfo
  ): Promise<void> {
    const batchSize = 100;

    for (let i = 0; i < missingData.missingAnchorIds.length; i += batchSize) {
      const batch = missingData.missingAnchorIds.slice(i, i + batchSize);

      const anchors = await Promise.all(
        batch.map(id => this.getLocalAnchor(id))
      );

      await this.sendToNode(nodeId, {
        type: 'bulk_sync',
        anchors,
      });
    }
  }

  /**
   * Verify data integrity
   */
  private async verifyDataIntegrity(nodeId: string): Promise<boolean> {
    const localChecksums = await this.getLocalChecksums();
    const remoteChecksums = await this.getRemoteChecksums(nodeId);

    for (const [anchorId, localChecksum] of localChecksums.entries()) {
      const remoteChecksum = remoteChecksums.get(anchorId);

      if (remoteChecksum !== localChecksum) {
        return false;
      }
    }

    return true;
  }
}
```

---

## Privacy Preservation

### Distributed Privacy Budget Tracking

```
┌─────────────────────────────────────────────────────────────┐
│          DISTRIBUTED PRIVACY BUDGET TRACKING                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   CHALLENGE: Privacy budget must be strongly consistent    │
│   - Cannot exceed budget across all nodes                  │
│   - Must handle concurrent updates                         │
│   - Must survive failures                                  │
│                                                             │
│   SOLUTION: Centralized Privacy Service                    │
│   ┌─────────────────────────────────────────────────┐      │
│   │ Privacy Budget Service (PBS)                    │      │
│   │ • Single source of truth                        │      │
│   │ • Uses consensus (Raft) for consistency         │      │
│   │ • All nodes query PBS before sharing            │      │
│   │ • Atomic budget decrements                      │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   PROTOCOL:                                                │
│   1. Node wants to share anchor                           │
│   2. Query PBS for budget check                           │
│   3. PBS atomically reserves budget                       │
│   4. Node shares anchor                                   │
│   5. Node confirms share to PBS                           │
│   6. PBS finalizes budget spend                           │
│   (If step 5 doesn't happen, reservation expires)          │
│                                                             │
│   FAILOVER:                                                │
│   - PBS uses Raft for fault tolerance                     │
│   - Budget data replicated to majority                    │
│   - Automatic leader election                            │
│   - No single point of failure                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
/**
 * Privacy Budget Service
 */
class PrivacyBudgetService {
  private consensus: RaftConsensus;
  private budgets: Map<string, PrivacyBudget> = new Map();

  /**
   * Reserve privacy budget
   */
  async reserveBudget(
    colonyId: string,
    amount: number
  ): Promise<BudgetReservation> {
    // Use consensus for atomic operation
    const operation = {
      type: 'reserve_budget',
      colonyId,
      amount,
      timestamp: Date.now(),
    };

    const result = await this.consensus.propose(operation);

    if (result.success) {
      return {
        reservationId: result.id,
        colonyId,
        amount,
        expiresAt: Date.now() + 30000, // 30 seconds
      };
    }

    throw new Error('Failed to reserve budget');
  }

  /**
   * Confirm budget spend
   */
  async confirmSpend(reservationId: string): Promise<void> {
    const operation = {
      type: 'confirm_spend',
      reservationId,
      timestamp: Date.now(),
    };

    await this.consensus.propose(operation);
  }

  /**
   * Get current budget
   */
  async getBudget(colonyId: string): Promise<PrivacyBudget> {
    const result = await this.consensus.query({
      type: 'get_budget',
      colonyId,
    });

    return result.budget;
  }

  /**
   * Check if budget allows operation
   */
  async checkBudget(
    colonyId: string,
    amount: number
  ): Promise<boolean> {
    const budget = await this.getBudget(colonyId);
    return budget.epsilonSpent + amount <= budget.epsilonLimit;
  }
}
```

---

## Performance Considerations

### Optimization Strategies

```
┌─────────────────────────────────────────────────────────────┐
│               PERFORMANCE OPTIMIZATIONS                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. BATCH OPERATIONS                                       │
│   ┌─────────────────────────────────────────────────┐      │
│   │ • Batch multiple queries into single request    │      │
│   │ • Aggregate responses                           │      │
│   │ • Reduce network roundtrips                     │      │
│   │                                                  │      │
│   │ Example: Query 100 anchors in 1 request         │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   2. PREFETCHING                                           │
│   ┌─────────────────────────────────────────────────┐      │
│   │ • Predict likely next requests                  │      │
│   │ • Prefetch from peers                           │      │
│   │ • Cache locally for fast access                 │      │
│   │                                                  │      │
│   │ Example: Prefetch next layer's anchors          │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   3. COMPRESSION                                           │
│   ┌─────────────────────────────────────────────────┐      │
│   │ • Compress anchor embeddings                   │      │
│   │ • Use delta encoding for similar anchors        │      │
│   │ • Compress network traffic                     │      │
│   │                                                  │      │
│   │ Example: LZ4 compression for embeddings         │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   4. CACHING METADATA                                       │
│   ┌─────────────────────────────────────────────────┐      │
│   │ • Cache node addresses                          │      │
│   │ • Cache cluster topology                        │      │
│   │ • Cache privacy budgets                         │      │
│   │                                                  │      │
│   │ Example: DNS-like caching for node discovery    │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   5. PARALLEL QUERIES                                       │
│   ┌─────────────────────────────────────────────────┐      │
│   │ • Query multiple nodes in parallel              │      │
│   │ • Wait for first response                      │      │
│   │ • Cancel other pending requests                │      │
│   │                                                  │      │
│   │ Example: Query 5 nodes, take first response     │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Local cache hit rate | >90% | Minimize remote queries |
| Remote query latency | <50ms | Acceptable for distributed cache |
| Batch query size | 100 anchors | Balance latency vs throughput |
| Invalidation propagation | <5s | Maximum staleness window |
| Partition detection | <10s | Fast failover |
| Recovery time | <60s | Quick service restoration |

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Tasks:**
- [ ] Implement `CoordinationMessage` types
- [ ] Create `GossipMembership` protocol
- [ ] Implement `HealthCheckProtocol`
- [ ] Set up message bus (NATS/Redis)
- [ ] Basic node discovery

**Deliverables:**
- Nodes can discover each other
- Health checking operational
- Basic gossip working

### Phase 2: Cache Coordination (Weeks 3-4)

**Tasks:**
- [ ] Implement `DistributedCacheManager`
- [ ] Create remote query protocol
- [ ] Implement adaptive replication
- [ ] Add version tracking
- [ ] Batch query support

**Deliverables:**
- Nodes can query each other's caches
- Remote cache hits working
- Basic replication operational

### Phase 3: Invalidation (Weeks 5-6)

**Tasks:**
- [ ] Implement multi-tier invalidation
- [ ] Create invalidation bus
- [ ] Add TTL-based expiration
- [ ] Implement version-based coherence
- [ ] LRU eviction

**Deliverables:**
- Cache invalidation working
- Stale data detection
- Automatic cleanup

### Phase 4: Consistency (Weeks 7-8)

**Tasks:**
- [ ] Implement vector clocks
- [ ] Create causal consistency manager
- [ ] Add tunable consistency
- [ ] Implement quorum reads/writes

**Deliverables:**
- Causal consistency operational
- Configurable consistency levels
- Conflict detection

### Phase 5: Partition Tolerance (Weeks 9-10)

**Tasks:**
- [ ] Implement partition detection
- [ ] Create degraded mode
- [ ] Add write buffering
- [ ] Implement partition healing
- [ ] Conflict resolution on recovery

**Deliverables:**
- System survives partitions
- Graceful degradation
- Automatic recovery

### Phase 6: Privacy Integration (Weeks 11-12)

**Tasks:**
- [ ] Create Privacy Budget Service
- [ ] Implement Raft consensus for PBS
- [ ] Integrate with federated learning
- [ ] Add privacy-aware caching

**Deliverables:**
- Strongly consistent privacy budgets
- Privacy-aware cache coordination
- Differential privacy preserved

### Phase 7: Optimization (Weeks 13-14)

**Tasks:**
- [ ] Implement batching
- [ ] Add prefetching
- [ ] Enable compression
- [ ] Optimize metadata caching
- [ ] Parallel queries

**Deliverables:**
- Performance targets met
- Load testing successful
- Production ready

---

## Conclusion

This distributed cache coordination design enables POLLN to:

1. **Scale horizontally** across multiple nodes
2. **Maintain availability** during network partitions
3. **Preserve privacy** with strongly consistent budget tracking
4. **Optimize performance** through adaptive replication and caching
5. **Recover gracefully** from failures

The key innovation is the **adaptive replication strategy** combined with **causal consistency**, providing a balance between performance and correctness that matches POLLN's philosophy of **durability through diversity**.

### Next Steps

1. Implement Phase 1 (Foundation)
2. Set up test cluster (3-5 nodes)
3. Benchmark performance
4. Iterate based on findings
5. Deploy to production incrementally

---

*Document Version: 1.0*
*Last Updated: 2026-03-07*
*Author: POLLN Research Team*

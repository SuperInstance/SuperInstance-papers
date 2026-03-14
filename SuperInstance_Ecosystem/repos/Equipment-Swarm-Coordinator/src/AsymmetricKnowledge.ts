/**
 * AsymmetricKnowledge - Manages asymmetrical knowledge distribution
 * where agents only know what they need for their tasks.
 */

import type { AgentRole, KnowledgeLevel } from './types';

/**
 * Configuration for knowledge management
 */
export interface KnowledgeConfig {
  /** Isolation level for knowledge partitions */
  isolationLevel: 'strict' | 'moderate' | 'relaxed';
  /** Enable knowledge caching */
  enableCaching: boolean;
  /** Maximum knowledge partition size */
  maxPartitionSize: number;
  /** Knowledge retention period in ms */
  retentionPeriod: number;
  /** Enable knowledge provenance tracking */
  enableProvenance: boolean;
}

/**
 * A partition of knowledge for a specific agent
 */
export interface KnowledgePartition {
  /** Partition identifier */
  partitionId: string;
  /** Agent this partition belongs to */
  agentId: string;
  /** Knowledge entries in this partition */
  entries: Map<string, KnowledgeEntry>;
  /** Access level for this partition */
  accessLevel: KnowledgeLevel;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Provenance chain */
  provenance: KnowledgeProvenance[];
}

/**
 * A single knowledge entry
 */
export interface KnowledgeEntry {
  /** Entry identifier */
  id: string;
  /** Entry key */
  key: string;
  /** Entry value */
  value: unknown;
  /** Knowledge level */
  level: KnowledgeLevel;
  /** Source of this knowledge */
  source: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Expiration timestamp (optional) */
  expiresAt?: Date;
  /** Tags for categorization */
  tags: string[];
}

/**
 * Policy for knowledge access
 */
export interface AccessPolicy {
  /** Policy identifier */
  policyId: string;
  /** Source agent ID */
  sourceAgentId: string;
  /** Target agent ID */
  targetAgentId: string;
  /** Allowed knowledge keys (wildcards supported) */
  allowedKeys: string[];
  /** Denied knowledge keys */
  deniedKeys: string[];
  /** Access level granted */
  grantedLevel: KnowledgeLevel;
  /** Policy expiration */
  expiresAt?: Date;
  /** Policy conditions */
  conditions: AccessCondition[];
}

/**
 * Condition for access policy
 */
export interface AccessCondition {
  /** Condition type */
  type: 'time' | 'task' | 'context' | 'performance';
  /** Condition operator */
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains';
  /** Condition value */
  value: unknown;
}

/**
 * Provenance information for knowledge
 */
export interface KnowledgeProvenance {
  /** Origin identifier */
  originId: string;
  /** Source agent */
  sourceAgent: string;
  /** Transformation applied */
  transformation?: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * AsymmetricKnowledge manages the distribution of knowledge across agents
 * ensuring each agent only has access to what they need.
 */
export class AsymmetricKnowledge {
  private config: KnowledgeConfig;
  private partitions: Map<string, KnowledgePartition> = new Map();
  private accessPolicies: Map<string, AccessPolicy[]> = new Map();
  private globalKnowledge: Map<string, KnowledgeEntry> = new Map();
  private knowledgeGraph: KnowledgeGraph = new KnowledgeGraph();

  /**
   * Creates a new AsymmetricKnowledge manager
   * @param config - Configuration options
   */
  constructor(config: Partial<KnowledgeConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
  }

  /**
   * Create a knowledge partition for an agent
   * @param agentId - Agent identifier
   * @param role - Agent role
   * @returns Created partition
   */
  createPartition(agentId: string, role: AgentRole): KnowledgePartition {
    if (this.partitions.has(agentId)) {
      throw new Error(`Partition already exists for agent ${agentId}`);
    }

    const accessLevel = this.determineAccessLevel(role);
    
    const partition: KnowledgePartition = {
      partitionId: `partition-${agentId}`,
      agentId,
      entries: new Map(),
      accessLevel,
      createdAt: new Date(),
      updatedAt: new Date(),
      provenance: [],
    };

    this.partitions.set(agentId, partition);
    return partition;
  }

  /**
   * Remove a knowledge partition
   * @param agentId - Agent identifier
   * @returns True if removed successfully
   */
  removePartition(agentId: string): boolean {
    if (!this.partitions.has(agentId)) {
      return false;
    }

    this.partitions.delete(agentId);
    this.accessPolicies.delete(agentId);
    return true;
  }

  /**
   * Get a knowledge partition
   * @param agentId - Agent identifier
   * @returns Partition or undefined
   */
  getPartition(agentId: string): KnowledgePartition | undefined {
    return this.partitions.get(agentId);
  }

  /**
   * Add knowledge to global store
   * @param entry - Knowledge entry
   */
  addGlobalKnowledge(entry: Omit<KnowledgeEntry, 'id' | 'createdAt'>): string {
    const id = this.generateId();
    
    const fullEntry: KnowledgeEntry = {
      ...entry,
      id,
      createdAt: new Date(),
    };

    this.globalKnowledge.set(entry.key, fullEntry);
    this.knowledgeGraph.addNode(entry.key, entry);

    return id;
  }

  /**
   * Distribute knowledge to an agent
   * @param agentId - Target agent ID
   * @param key - Knowledge key
   * @param value - Knowledge value
   * @param source - Source identifier
   */
  distributeKnowledge(
    agentId: string,
    key: string,
    value: unknown,
    source: string
  ): boolean {
    const partition = this.partitions.get(agentId);
    if (!partition) {
      return false;
    }

    // Check if agent has access to this knowledge
    if (!this.canAccess(agentId, key)) {
      return false;
    }

    const entryId = this.generateId();
    const entry: KnowledgeEntry = {
      id: entryId,
      key,
      value,
      level: partition.accessLevel,
      source,
      confidence: 1.0,
      createdAt: new Date(),
      tags: [],
    };

    partition.entries.set(key, entry);
    partition.updatedAt = new Date();

    // Add provenance
    if (this.config.enableProvenance) {
      partition.provenance.push({
        originId: this.generateOriginId(),
        sourceAgent: source,
        timestamp: new Date(),
      });
    }

    return true;
  }

  /**
   * Request knowledge from another agent
   * @param requestingAgentId - Agent requesting knowledge
   * @param targetAgentId - Agent to request from
   * @param key - Knowledge key to request
   * @returns Requested knowledge or null
   */
  requestKnowledge(
    requestingAgentId: string,
    targetAgentId: string,
    key: string
  ): KnowledgeEntry | null {
    // Check access policy
    const policies = this.accessPolicies.get(requestingAgentId) ?? [];
    const hasPolicy = policies.some(p => 
      p.sourceAgentId === targetAgentId && 
      this.matchesPattern(key, p.allowedKeys) &&
      !this.matchesPattern(key, p.deniedKeys)
    );

    if (!hasPolicy && this.config.isolationLevel === 'strict') {
      return null;
    }

    const targetPartition = this.partitions.get(targetAgentId);
    if (!targetPartition) {
      return null;
    }

    const entry = targetPartition.entries.get(key);
    if (!entry) {
      return null;
    }

    // Check if knowledge can be shared
    if (!this.canShare(entry, requestingAgentId)) {
      return null;
    }

    // Distribute to requesting agent
    this.distributeKnowledge(requestingAgentId, key, entry.value, targetAgentId);

    return entry;
  }

  /**
   * Check if an agent can access specific knowledge
   * @param agentId - Agent identifier
   * @param key - Knowledge key
   * @returns True if access allowed
   */
  canAccess(agentId: string, key: string): boolean {
    const partition = this.partitions.get(agentId);
    if (!partition) return false;

    // Check isolation level
    switch (this.config.isolationLevel) {
      case 'strict':
        return this.checkStrictAccess(agentId, key);
      case 'moderate':
        return this.checkModerateAccess(agentId, key);
      case 'relaxed':
        return true;
    }
  }

  /**
   * Set access policy between agents
   * @param policy - Access policy to set
   */
  setAccessPolicy(policy: Omit<AccessPolicy, 'policyId'>): string {
    const policyId = this.generateId();
    
    const fullPolicy: AccessPolicy = {
      ...policy,
      policyId,
    };

    const existingPolicies = this.accessPolicies.get(policy.targetAgentId) ?? [];
    existingPolicies.push(fullPolicy);
    this.accessPolicies.set(policy.targetAgentId, existingPolicies);

    return policyId;
  }

  /**
   * Revoke access policy
   * @param targetAgentId - Target agent ID
   * @param policyId - Policy ID to revoke
   */
  revokeAccessPolicy(targetAgentId: string, policyId: string): boolean {
    const policies = this.accessPolicies.get(targetAgentId);
    if (!policies) return false;

    const index = policies.findIndex(p => p.policyId === policyId);
    if (index === -1) return false;

    policies.splice(index, 1);
    return true;
  }

  /**
   * Get knowledge distribution score
   * @returns Distribution score (0-1)
   */
  getDistributionScore(): number {
    if (this.partitions.size === 0) return 1;
    
    const totalKnowledge = this.globalKnowledge.size;
    if (totalKnowledge === 0) return 1;

    let distributedCount = 0;
    
    for (const partition of this.partitions.values()) {
      distributedCount += partition.entries.size;
    }

    // Score based on how well knowledge is distributed
    const averagePerAgent = distributedCount / this.partitions.size;
    const idealDistribution = totalKnowledge / this.partitions.size;
    
    return Math.min(1, averagePerAgent / idealDistribution);
  }

  /**
   * Get knowledge summary for an agent
   * @param agentId - Agent identifier
   * @returns Knowledge summary
   */
  getKnowledgeSummary(agentId: string): KnowledgeSummary {
    const partition = this.partitions.get(agentId);
    if (!partition) {
      return {
        agentId,
        entryCount: 0,
        categories: {},
        lastUpdated: new Date(),
        provenanceDepth: 0,
      };
    }

    const categories: Record<string, number> = {};
    
    for (const entry of partition.entries.values()) {
      for (const tag of entry.tags) {
        categories[tag] = (categories[tag] ?? 0) + 1;
      }
    }

    return {
      agentId,
      entryCount: partition.entries.size,
      categories,
      lastUpdated: partition.updatedAt,
      provenanceDepth: partition.provenance.length,
    };
  }

  /**
   * Prune expired knowledge entries
   */
  pruneExpiredKnowledge(): number {
    let prunedCount = 0;
    const now = new Date();

    for (const partition of this.partitions.values()) {
      for (const [key, entry] of partition.entries) {
        if (entry.expiresAt && entry.expiresAt < now) {
          partition.entries.delete(key);
          prunedCount++;
        }
      }
    }

    return prunedCount;
  }

  /**
   * Transfer knowledge between agents
   * @param sourceAgentId - Source agent
   * @param targetAgentId - Target agent
   * @param keys - Keys to transfer (all if not specified)
   */
  transferKnowledge(
    sourceAgentId: string,
    targetAgentId: string,
    keys?: string[]
  ): number {
    const sourcePartition = this.partitions.get(sourceAgentId);
    const targetPartition = this.partitions.get(targetAgentId);
    
    if (!sourcePartition || !targetPartition) {
      return 0;
    }

    const keysToTransfer = keys ?? Array.from(sourcePartition.entries.keys());
    let transferredCount = 0;

    for (const key of keysToTransfer) {
      if (this.canAccess(targetAgentId, key)) {
        const entry = sourcePartition.entries.get(key);
        if (entry) {
          this.distributeKnowledge(targetAgentId, key, entry.value, sourceAgentId);
          transferredCount++;
        }
      }
    }

    return transferredCount;
  }

  // Private methods

  private mergeWithDefaults(config: Partial<KnowledgeConfig>): KnowledgeConfig {
    return {
      isolationLevel: config.isolationLevel ?? 'moderate',
      enableCaching: config.enableCaching ?? true,
      maxPartitionSize: config.maxPartitionSize ?? 10000,
      retentionPeriod: config.retentionPeriod ?? 86400000, // 24 hours
      enableProvenance: config.enableProvenance ?? true,
    };
  }

  private determineAccessLevel(role: AgentRole): KnowledgeLevel {
    switch (role) {
      case 'coordinator':
        return 'full';
      case 'executor':
        return 'partial';
      case 'validator':
        return 'partial';
      case 'specialist':
        return 'limited';
      case 'observer':
        return 'minimal';
      default:
        return 'minimal';
    }
  }

  private checkStrictAccess(agentId: string, key: string): boolean {
    // Check if there's an explicit policy allowing access
    const policies = this.accessPolicies.get(agentId) ?? [];
    
    for (const policy of policies) {
      if (this.matchesPattern(key, policy.allowedKeys) &&
          !this.matchesPattern(key, policy.deniedKeys)) {
        return this.evaluateConditions(policy.conditions);
      }
    }

    return false;
  }

  private checkModerateAccess(agentId: string, key: string): boolean {
    const partition = this.partitions.get(agentId);
    if (!partition) return false;

    // In moderate mode, agents can access knowledge at or below their level
    const globalEntry = this.globalKnowledge.get(key);
    if (!globalEntry) return true;

    const levelHierarchy: KnowledgeLevel[] = ['minimal', 'limited', 'partial', 'full'];
    const agentLevelIndex = levelHierarchy.indexOf(partition.accessLevel);
    const knowledgeLevelIndex = levelHierarchy.indexOf(globalEntry.level);

    return agentLevelIndex >= knowledgeLevelIndex;
  }

  private matchesPattern(key: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (pattern === '*') return true;
      if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) {
        return true;
      }
      if (key === pattern) return true;
    }
    return false;
  }

  private evaluateConditions(conditions: AccessCondition[]): boolean {
    for (const condition of conditions) {
      // Simplified condition evaluation
      // In a real implementation, this would evaluate each condition
      switch (condition.type) {
        case 'time':
          // Check time-based conditions
          break;
        case 'task':
          // Check task-based conditions
          break;
        case 'context':
          // Check context-based conditions
          break;
        case 'performance':
          // Check performance-based conditions
          break;
      }
    }
    return true;
  }

  private canShare(entry: KnowledgeEntry, targetAgentId: string): boolean {
    // Check knowledge level restrictions
    const targetPartition = this.partitions.get(targetAgentId);
    if (!targetPartition) return false;

    const levelHierarchy: KnowledgeLevel[] = ['minimal', 'limited', 'partial', 'full'];
    const targetLevelIndex = levelHierarchy.indexOf(targetPartition.accessLevel);
    const entryLevelIndex = levelHierarchy.indexOf(entry.level);

    return targetLevelIndex >= entryLevelIndex;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateOriginId(): string {
    return `origin-${this.generateId()}`;
  }
}

/**
 * Internal knowledge graph for tracking relationships
 */
class KnowledgeGraph {
  private nodes: Map<string, KnowledgeEntry> = new Map();
  private edges: Map<string, Set<string>> = new Map();

  addNode(key: string, entry: KnowledgeEntry): void {
    this.nodes.set(key, entry);
    if (!this.edges.has(key)) {
      this.edges.set(key, new Set());
    }
  }

  addEdge(from: string, to: string): void {
    const edges = this.edges.get(from);
    if (edges) {
      edges.add(to);
    }
  }

  getRelated(key: string): string[] {
    return Array.from(this.edges.get(key) ?? []);
  }
}

/**
 * Summary of knowledge for an agent
 */
interface KnowledgeSummary {
  agentId: string;
  entryCount: number;
  categories: Record<string, number>;
  lastUpdated: Date;
  provenanceDepth: number;
}

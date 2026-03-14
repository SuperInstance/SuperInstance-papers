/**
 * AgentOrchestrator - Orchestrates multiple agents with specialized roles
 * in a hierarchical structure.
 */

import type { AgentRole, ExecutionStatus } from './types';

/**
 * Configuration for the Agent Orchestrator
 */
export interface OrchestratorConfig {
  /** Maximum number of agents */
  maxAgents: number;
  /** Enable hierarchical structures */
  enableHierarchy: boolean;
  /** Maximum depth of hierarchy */
  maxHierarchyDepth: number;
  /** Default agent timeout */
  defaultTimeout: number;
  /** Enable load balancing */
  loadBalancing: boolean;
}

/**
 * Profile of an agent in the swarm
 */
export interface AgentProfile {
  /** Unique agent identifier */
  id: string;
  /** Agent name */
  name: string;
  /** Agent role in the swarm */
  role: AgentRole;
  /** Agent capabilities */
  capabilities: string[];
  /** Current status */
  status: ExecutionStatus;
  /** Position in hierarchy */
  hierarchyLevel: number;
  /** Parent agent in hierarchy (if any) */
  parentAgentId?: string;
  /** Child agents in hierarchy (if any) */
  childAgentIds: string[];
  /** Agent metadata */
  metadata: Record<string, unknown>;
  /** Current load (0-1) */
  currentLoad: number;
  /** Weight for task allocation */
  weight: number;
}

/**
 * Result of an orchestration operation
 */
export interface OrchestrationResult<T = unknown> {
  /** Operation success status */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Agents involved */
  agentsInvolved: string[];
  /** Execution time in ms */
  executionTime: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * AgentOrchestrator manages agent registration, hierarchy, and task distribution.
 */
export class AgentOrchestrator {
  private config: OrchestratorConfig;
  private agents: Map<string, AgentProfile> = new Map();
  private hierarchy: Map<string, Set<string>> = new Map(); // parent -> children
  private agentWeights: Map<string, number> = new Map();

  /**
   * Creates a new AgentOrchestrator
   * @param config - Configuration options
   */
  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
  }

  /**
   * Register a new agent
   * @param profile - Agent profile
   * @returns True if registration successful
   */
  registerAgent(profile: Omit<AgentProfile, 'currentLoad' | 'weight' | 'childAgentIds'>): boolean {
    if (this.agents.size >= this.config.maxAgents) {
      return false;
    }

    if (this.agents.has(profile.id)) {
      return false;
    }

    // Validate hierarchy depth
    if (profile.hierarchyLevel > this.config.maxHierarchyDepth) {
      return false;
    }

    const fullProfile: AgentProfile = {
      ...profile,
      currentLoad: 0,
      weight: 1.0,
      childAgentIds: [],
    };

    this.agents.set(profile.id, fullProfile);
    this.agentWeights.set(profile.id, 1.0);
    this.hierarchy.set(profile.id, new Set());

    // Update hierarchy relationships
    if (profile.parentAgentId && this.agents.has(profile.parentAgentId)) {
      const parent = this.agents.get(profile.parentAgentId)!;
      parent.childAgentIds.push(profile.id);
      this.hierarchy.get(profile.parentAgentId)!.add(profile.id);
    }

    return true;
  }

  /**
   * Unregister an agent
   * @param agentId - Agent identifier
   * @returns True if unregistration successful
   */
  unregisterAgent(agentId: string): boolean {
    if (!this.agents.has(agentId)) {
      return false;
    }

    const agent = this.agents.get(agentId)!;

    // Handle children - promote to parent or make them independent
    for (const childId of agent.childAgentIds) {
      const child = this.agents.get(childId);
      if (child) {
        child.parentAgentId = agent.parentAgentId;
        child.hierarchyLevel = Math.max(0, child.hierarchyLevel - 1);
      }
    }

    // Remove from parent's children
    if (agent.parentAgentId) {
      const parent = this.agents.get(agent.parentAgentId);
      if (parent) {
        parent.childAgentIds = parent.childAgentIds.filter(id => id !== agentId);
        this.hierarchy.get(agent.parentAgentId)?.delete(agentId);
      }
    }

    this.agents.delete(agentId);
    this.agentWeights.delete(agentId);
    this.hierarchy.delete(agentId);

    return true;
  }

  /**
   * Get agent profile
   * @param agentId - Agent identifier
   * @returns Agent profile or undefined
   */
  getAgent(agentId: string): AgentProfile | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   * @returns Array of all agent profiles
   */
  getAllAgents(): AgentProfile[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by role
   * @param role - Role to filter by
   * @returns Agents with specified role
   */
  getAgentsByRole(role: AgentRole): AgentProfile[] {
    return Array.from(this.agents.values()).filter(agent => agent.role === role);
  }

  /**
   * Get agents by capability
   * @param capability - Capability to filter by
   * @returns Agents with specified capability
   */
  getAgentsByCapability(capability: string): AgentProfile[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.capabilities.includes(capability)
    );
  }

  /**
   * Get available agents (idle status)
   * @returns Available agents
   */
  getAvailableAgents(): AgentProfile[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.status === 'idle' && agent.currentLoad < 1
    );
  }

  /**
   * Get agent hierarchy
   * @param agentId - Root agent ID
   * @returns Hierarchy tree
   */
  getHierarchy(agentId: string): AgentHierarchyNode | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const node: AgentHierarchyNode = {
      agent,
      children: [],
    };

    for (const childId of agent.childAgentIds) {
      const childHierarchy = this.getHierarchy(childId);
      if (childHierarchy) {
        node.children.push(childHierarchy);
      }
    }

    return node;
  }

  /**
   * Update agent status
   * @param agentId - Agent identifier
   * @param status - New status
   */
  updateAgentStatus(agentId: string, status: ExecutionStatus): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
    }
  }

  /**
   * Update agent load
   * @param agentId - Agent identifier
   * @param load - Current load (0-1)
   */
  updateAgentLoad(agentId: string, load: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.currentLoad = Math.min(1, Math.max(0, load));
    }
  }

  /**
   * Adjust agent weight for task allocation
   * @param agentId - Agent identifier
   * @param performanceScore - Performance score (0-1)
   */
  adjustAgentWeight(agentId: string, performanceScore: number): void {
    const currentWeight = this.agentWeights.get(agentId) ?? 1.0;
    
    // Exponential moving average for weight adjustment
    const newWeight = currentWeight * 0.7 + performanceScore * 0.3;
    
    this.agentWeights.set(agentId, newWeight);
    
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.weight = newWeight;
    }
  }

  /**
   * Get agent weight
   * @param agentId - Agent identifier
   * @returns Agent weight
   */
  getAgentWeight(agentId: string): number {
    return this.agentWeights.get(agentId) ?? 1.0;
  }

  /**
   * Select best agent for a task
   * @param requiredCapabilities - Required capabilities
   * @param preferredRole - Preferred agent role
   * @returns Best agent or undefined
   */
  selectBestAgent(
    requiredCapabilities: string[],
    preferredRole?: AgentRole
  ): AgentProfile | undefined {
    const candidates = this.getAvailableAgents().filter(agent =>
      requiredCapabilities.every(cap => agent.capabilities.includes(cap))
    );

    if (candidates.length === 0) return undefined;

    // Filter by preferred role if specified
    const roleMatched = preferredRole
      ? candidates.filter(a => a.role === preferredRole)
      : candidates;

    const pool = roleMatched.length > 0 ? roleMatched : candidates;

    // Sort by weight (descending) and load (ascending)
    pool.sort((a, b) => {
      const weightDiff = b.weight - a.weight;
      if (Math.abs(weightDiff) > 0.1) return weightDiff;
      return a.currentLoad - b.currentLoad;
    });

    return pool[0];
  }

  /**
   * Broadcast message to all agents
   * @param message - Message to broadcast
   * @param excludeAgentIds - Agents to exclude
   */
  broadcast(
    message: unknown,
    excludeAgentIds: string[] = []
  ): Map<string, OrchestrationResult> {
    const results = new Map<string, OrchestrationResult>();

    for (const [agentId, agent] of this.agents) {
      if (excludeAgentIds.includes(agentId)) continue;

      results.set(agentId, {
        success: true,
        data: message,
        agentsInvolved: [agentId],
        executionTime: 0,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * Send message to specific agents
   * @param agentIds - Target agent IDs
   * @param message - Message to send
   */
  multicast(
    agentIds: string[],
    message: unknown
  ): Map<string, OrchestrationResult> {
    const results = new Map<string, OrchestrationResult>();

    for (const agentId of agentIds) {
      if (this.agents.has(agentId)) {
        results.set(agentId, {
          success: true,
          data: message,
          agentsInvolved: [agentId],
          executionTime: 0,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Get orchestrator statistics
   * @returns Statistics object
   */
  getStatistics(): OrchestratorStatistics {
    const agents = Array.from(this.agents.values());

    return {
      totalAgents: agents.length,
      agentsByRole: this.groupByRole(agents),
      agentsByStatus: this.groupByStatus(agents),
      averageLoad: this.calculateAverageLoad(agents),
      hierarchyDepth: this.calculateMaxDepth(),
      topPerformers: this.getTopPerformers(5),
    };
  }

  // Private methods

  private mergeWithDefaults(config: Partial<OrchestratorConfig>): OrchestratorConfig {
    return {
      maxAgents: config.maxAgents ?? 100,
      enableHierarchy: config.enableHierarchy ?? true,
      maxHierarchyDepth: config.maxHierarchyDepth ?? 5,
      defaultTimeout: config.defaultTimeout ?? 30000,
      loadBalancing: config.loadBalancing ?? true,
    };
  }

  private groupByRole(agents: AgentProfile[]): Record<AgentRole, number> {
    const groups: Record<AgentRole, number> = {
      coordinator: 0,
      executor: 0,
      observer: 0,
      validator: 0,
      specialist: 0,
    };

    for (const agent of agents) {
      groups[agent.role]++;
    }

    return groups;
  }

  private groupByStatus(agents: AgentProfile[]): Record<ExecutionStatus, number> {
    const groups: Record<ExecutionStatus, number> = {
      idle: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
    };

    for (const agent of agents) {
      groups[agent.status]++;
    }

    return groups;
  }

  private calculateAverageLoad(agents: AgentProfile[]): number {
    if (agents.length === 0) return 0;
    return agents.reduce((sum, a) => sum + a.currentLoad, 0) / agents.length;
  }

  private calculateMaxDepth(): number {
    let maxDepth = 0;
    
    // Find root agents (no parent)
    const roots = Array.from(this.agents.values()).filter(a => !a.parentAgentId);
    
    for (const root of roots) {
      const depth = this.calculateDepth(root.id, 0);
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth;
  }

  private calculateDepth(agentId: string, currentDepth: number): number {
    const agent = this.agents.get(agentId);
    if (!agent) return currentDepth;

    let maxChildDepth = currentDepth + 1;
    
    for (const childId of agent.childAgentIds) {
      const childDepth = this.calculateDepth(childId, currentDepth + 1);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }
    
    return maxChildDepth;
  }

  private getTopPerformers(count: number): AgentProfile[] {
    return Array.from(this.agents.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, count);
  }
}

/**
 * Node in the agent hierarchy tree
 */
interface AgentHierarchyNode {
  agent: AgentProfile;
  children: AgentHierarchyNode[];
}

/**
 * Statistics about the orchestrator
 */
interface OrchestratorStatistics {
  totalAgents: number;
  agentsByRole: Record<AgentRole, number>;
  agentsByStatus: Record<ExecutionStatus, number>;
  averageLoad: number;
  hierarchyDepth: number;
  topPerformers: AgentProfile[];
}

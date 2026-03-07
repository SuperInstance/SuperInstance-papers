/**
 * POLLN Colony Implementation
 * Agent collection management
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import type { AgentConfig, AgentState } from './types.js';

export interface ColonyConfig {
  id: string;
  gardenerId: string;
  name: string;
  maxAgents: number;
  resourceBudget: {
    totalCompute: number;
    totalMemory: number;
    totalNetwork: number;
  };
}

export interface ColonyStats {
  totalAgents: number;
  activeAgents: number;
  dormantAgents: number;
  totalCompute: number;
  totalMemory: number;
  totalNetwork: number;
  shannonDiversity: number;
}

/**
 * Colony - Agent collection manager
 *
 * Manages a collection of agents for a single gardener
 */
export class Colony extends EventEmitter {
  public readonly id: string;
  public readonly config: ColonyConfig;

  private agents: Map<string, AgentState> = new Map();
  private agentConfigs: Map<string, AgentConfig> = new Map();

  constructor(config: ColonyConfig) {
    super();
    this.id = config.id || uuidv4();
    this.config = config;
  }

  /**
   * Register an agent with the colony
   */
  registerAgent(config: AgentConfig): AgentState {
    const state: AgentState = {
      id: config.id,
      typeId: config.typeId,
      modelVersion: 1,
      status: 'dormant',
      lastActive: Date.now(),
      valueFunction: 0.5,
      successCount: 0,
      failureCount: 0,
      avgLatencyMs: 0,
      executionCount: 0,
      successRate: 0,
      active: false,
    };

    this.agents.set(config.id, state);
    this.agentConfigs.set(config.id, config);
    this.emit('agent_registered', { agentId: config.id, state });

    return state;
  }

  /**
   * Unregister an agent from the colony
   */
  unregisterAgent(agentId: string): boolean {
    const deleted = this.agents.delete(agentId);
    this.agentConfigs.delete(agentId);

    if (deleted) {
      this.emit('agent_unregistered', { agentId });
    }

    return deleted;
  }

  /**
   * Get agent state
   */
  getAgent(agentId: string): AgentState | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get agent config
   */
  getAgentConfig(agentId: string): AgentConfig | undefined {
    return this.agentConfigs.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentState[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get active agents
   */
  getActiveAgents(): AgentState[] {
    return this.getAllAgents().filter(a => a.status === 'active');
  }

  /**
   * Get agents by type
   */
  getAgentsByType(typeId: string): AgentState[] {
    return this.getAllAgents().filter(a => a.typeId === typeId);
  }

  /**
   * Update agent state
   */
  updateAgentState(agentId: string, updates: Partial<AgentState>): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    Object.assign(agent, updates);
    this.agents.set(agentId, agent);
    this.emit('agent_updated', { agentId, updates });

    return true;
  }

  /**
   * Activate an agent
   */
  activateAgent(agentId: string): boolean {
    return this.updateAgentState(agentId, {
      status: 'active',
      lastActive: Date.now()
    });
  }

  /**
   * Deactivate an agent
   */
  deactivateAgent(agentId: string): boolean {
    return this.updateAgentState(agentId, { status: 'dormant' });
  }

  /**
   * Record agent execution result
   */
  recordResult(agentId: string, success: boolean, latencyMs: number): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const updates: Partial<AgentState> = {
      lastActive: Date.now(),
      avgLatencyMs: (agent.avgLatencyMs * agent.successCount + latencyMs) / (agent.successCount + 1),
    };

    if (success) {
      updates.successCount = agent.successCount + 1;
      updates.valueFunction = Math.min(1.0, agent.valueFunction + 0.01);
    } else {
      updates.failureCount = agent.failureCount + 1;
      updates.valueFunction = Math.max(0.0, agent.valueFunction - 0.01);
    }

    this.updateAgentState(agentId, updates);
  }

  /**
   * Calculate Shannon Diversity Index
   * H' = -Σ(p_i * ln(p_i)) where p_i is the proportion of each type
   * Higher values = more diverse population
   */
  calculateShannonDiversity(agents: AgentState[]): number {
    if (agents.length === 0) return 0;

    // Count agents by type
    const typeCounts = new Map<string, number>();
    for (const agent of agents) {
      const count = typeCounts.get(agent.typeId) || 0;
      typeCounts.set(agent.typeId, count + 1);
    }

    // Calculate Shannon entropy
    let diversity = 0;
    for (const count of typeCounts.values()) {
      const p = count / agents.length;
      diversity -= p * Math.log2(p);
    }

    return diversity;
  }

  /**
   * Get colony statistics
   */
  getStats(): ColonyStats {
    const agents = this.getAllAgents();
    const activeAgents = agents.filter(a => a.status === 'active');
    const diversity = this.calculateShannonDiversity(agents);

    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      dormantAgents: agents.length - activeAgents.length,
      totalCompute: this.config.resourceBudget.totalCompute,
      totalMemory: this.config.resourceBudget.totalMemory,
      totalNetwork: this.config.resourceBudget.totalNetwork,
      shannonDiversity: diversity,
    };
  }

  /**
   * Get agent count
   */
  get count(): number {
    return this.agents.size;
  }
}

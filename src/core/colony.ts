/**
 * POLLN Colony Implementation
 * Agent collection management
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import type { AgentConfig, AgentState } from './types';

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
   * Get colony statistics
   */
  getStats(): ColonyStats {
    const agents = this.getAllAgents();
    const activeAgents = agents.filter(a => a.status === 'active');

    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      dormantAgents: agents.length - activeAgents.length,
      totalCompute: this.config.resourceBudget.totalCompute,
      totalMemory: this.config.resourceBudget.totalMemory,
      totalNetwork: this.config.resourceBudget.totalNetwork,
    };
  }

  /**
   * Get agent count
   */
  get count(): number {
    return this.agents.size;
  }
}

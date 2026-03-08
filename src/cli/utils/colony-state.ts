/**
 * Colony state management for CLI
 */

import fs from 'fs';
import path from 'path';

// Simple UUID generator
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export type TileCategory = string;

export interface AgentRecord {
  id: string;
  type: 'task' | 'role' | 'core' | 'meta';
  category: TileCategory;
  createdAt: number;
  lastActivity: number;
  status: 'active' | 'inactive' | 'terminated';
  metadata?: Record<string, unknown>;
}

export interface ColonyState {
  colonyId: string;
  colonyName: string;
  createdAt: number;
  lastUpdate: number;
  agents: AgentRecord[];
  stats: {
    totalAgents: number;
    activeAgents: number;
    totalDreams: number;
    totalSyncs: number;
  };
  cache: {
    size: number;
    hits: number;
    misses: number;
    lastClear?: number;
  };
}

export class ColonyStateManager {
  private statePath: string;
  private state: ColonyState;

  constructor(dataDir: string, colonyId: string) {
    this.statePath = path.join(dataDir, 'colony-state.json');
    this.state = this.loadState(colonyId);
  }

  /**
   * Load colony state from file
   */
  private loadState(colonyId: string): ColonyState {
    if (fs.existsSync(this.statePath)) {
      try {
        const content = fs.readFileSync(this.statePath, 'utf-8');
        return JSON.parse(content) as ColonyState;
      } catch (error) {
        console.warn('Failed to load colony state, creating new');
      }
    }

    // Create new state
    return {
      colonyId,
      colonyName: 'Unnamed Colony',
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      agents: [],
      stats: {
        totalAgents: 0,
        activeAgents: 0,
        totalDreams: 0,
        totalSyncs: 0,
      },
      cache: {
        size: 0,
        hits: 0,
        misses: 0,
      },
    };
  }

  /**
   * Save colony state to file
   */
  saveState(): void {
    try {
      this.state.lastUpdate = Date.now();
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      throw new Error(`Failed to save colony state: ${error}`);
    }
  }

  /**
   * Get all state
   */
  getState(): ColonyState {
    return { ...this.state };
  }

  /**
   * Update colony name
   */
  setName(name: string): void {
    this.state.colonyName = name;
    this.saveState();
  }

  /**
   * Add an agent record
   */
  addAgent(type: AgentRecord['type'], category: TileCategory, metadata?: Record<string, unknown>): AgentRecord {
    const agent: AgentRecord = {
      id: uuidv4(),
      type,
      category,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      status: 'active',
      metadata,
    };

    this.state.agents.push(agent);
    this.state.stats.totalAgents++;
    this.state.stats.activeAgents++;
    this.saveState();

    return agent;
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): AgentRecord | undefined {
    return this.state.agents.find(a => a.id === id);
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentRecord[] {
    return [...this.state.agents];
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentRecord['type']): AgentRecord[] {
    return this.state.agents.filter(a => a.type === type);
  }

  /**
   * Update agent activity
   */
  updateAgentActivity(id: string): void {
    const agent = this.getAgent(id);
    if (agent) {
      agent.lastActivity = Date.now();
      this.saveState();
    }
  }

  /**
   * Terminate an agent
   */
  terminateAgent(id: string): boolean {
    const agent = this.getAgent(id);
    if (agent && agent.status === 'active') {
      agent.status = 'terminated';
      this.state.stats.activeAgents--;
      this.saveState();
      return true;
    }
    return false;
  }

  /**
   * Increment dream counter
   */
  incrementDreams(): void {
    this.state.stats.totalDreams++;
    this.saveState();
  }

  /**
   * Increment sync counter
   */
  incrementSyncs(): void {
    this.state.stats.totalSyncs++;
    this.saveState();
  }

  /**
   * Update cache statistics
   */
  updateCacheStats(size: number, hits: number, misses: number): void {
    this.state.cache = {
      size,
      hits,
      misses,
    };
    this.saveState();
  }

  /**
   * Clear cache statistics
   */
  clearCache(): void {
    this.state.cache = {
      size: 0,
      hits: 0,
      misses: 0,
      lastClear: Date.now(),
    };
    this.saveState();
  }

  /**
   * Get health status
   */
  getHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    agentRatio: number;
  } {
    const uptime = Date.now() - this.state.createdAt;
    const agentRatio = this.state.stats.activeAgents / Math.max(1, this.state.stats.totalAgents);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (agentRatio <= 0.5) {
      status = 'warning';
    }
    if (agentRatio <= 0.2) {
      status = 'critical';
    }

    return { status, uptime, agentRatio };
  }
}

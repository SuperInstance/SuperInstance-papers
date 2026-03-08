/**
 * Agent Scheduler
 *
 * Schedules work across agents efficiently
 */

import { EventEmitter } from 'events';
import type { LoadBalancingStrategy } from './types.js';

/**
 * Task definition
 */
interface Task {
  id: string;
  type: string;
  payload: any;
  priority: number;
  estimatedDuration: number;
  timeout: number;
  createdAt: number;
}

/**
 * Agent info
 */
interface AgentInfo {
  id: string;
  type: string;
  load: number; // 0-1
  activeTasks: number;
  capacity: number;
  lastHeartbeat: number;
}

/**
 * Schedule result
 */
interface ScheduleResult {
  taskId: string;
  agentId: string;
  scheduledAt: number;
}

/**
 * Agent Scheduler
 */
export class AgentScheduler extends EventEmitter {
  private agents: Map<string, AgentInfo> = new Map();
  private taskQueue: Task[] = [];
  private runningTasks: Map<string, ScheduleResult> = new Map();
  private strategy: LoadBalancingStrategy;

  constructor(strategy: LoadBalancingStrategy = LoadBalancingStrategy.LEAST_LOADED) {
    super();
    this.strategy = strategy;
  }

  /**
   * Register agent
   */
  public registerAgent(agent: AgentInfo): void {
    this.agents.set(agent.id, agent);
    this.emit('agent_registered', agent);
  }

  /**
   * Unregister agent
   */
  public unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.emit('agent_unregistered', agentId);
  }

  /**
   * Update agent info
   */
  public updateAgent(agentId: string, updates: Partial<AgentInfo>): void {
    const agent = this.agents.get(agentId);

    if (!agent) {
      return;
    }

    Object.assign(agent, updates);
    this.emit('agent_updated', { agentId, updates });
  }

  /**
   * Submit task for scheduling
   */
  public submitTask(task: Task): void {
    this.taskQueue.push(task);
    this.emit('task_queued', task);

    // Try to schedule immediately
    this.schedule();
  }

  /**
   * Schedule tasks to agents
   */
  private schedule(): void {
    // Sort queue by priority
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    const scheduled: string[] = [];

    for (const task of this.taskQueue) {
      const agentId = this.selectAgent(task);

      if (agentId) {
        const result: ScheduleResult = {
          taskId: task.id,
          agentId,
          scheduledAt: Date.now(),
        };

        this.runningTasks.set(task.id, result);
        scheduled.push(task.id);

        // Update agent load
        const agent = this.agents.get(agentId);
        if (agent) {
          agent.activeTasks++;
          agent.load = agent.activeTasks / agent.capacity;
        }

        this.emit('task_scheduled', result);
      }
    }

    // Remove scheduled tasks from queue
    this.taskQueue = this.taskQueue.filter((t) => !scheduled.includes(t.id));
  }

  /**
   * Select agent for task based on strategy
   */
  private selectAgent(task: Task): string | null {
    const availableAgents = Array.from(this.agents.values()).filter(
      (a) => a.load < 1 && a.activeTasks < a.capacity
    );

    if (availableAgents.length === 0) {
      return null;
    }

    switch (this.strategy) {
      case 'round_robin':
        return this.roundRobinSelect(availableAgents);
      case 'least_loaded':
        return this.leastLoadedSelect(availableAgents);
      case 'random':
        return this.randomSelect(availableAgents);
      case 'consistent_hash':
        return this.consistentHashSelect(availableAgents, task.id);
      case 'weighted':
        return this.weightedSelect(availableAgents);
      default:
        return this.leastLoadedSelect(availableAgents);
    }
  }

  /**
   * Round-robin selection
   */
  private roundRobinSelect(agents: AgentInfo[]): string | null {
    // Simple implementation: select first available
    return agents[0].id;
  }

  /**
   * Least-loaded selection
   */
  private leastLoadedSelect(agents: AgentInfo[]): string | null {
    const sorted = [...agents].sort((a, b) => a.load - b.load);
    return sorted[0].id;
  }

  /**
   * Random selection
   */
  private randomSelect(agents: AgentInfo[]): string | null {
    const index = Math.floor(Math.random() * agents.length);
    return agents[index].id;
  }

  /**
   * Consistent hash selection
   */
  private consistentHashSelect(agents: AgentInfo[], key: string): string | null {
    // Simple hash-based selection
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash + key.charCodeAt(i)) & 0xffffffff;
    }

    const index = Math.abs(hash) % agents.length;
    return agents[index].id;
  }

  /**
   * Weighted selection (by capacity)
   */
  private weightedSelect(agents: AgentInfo[]): string | null {
    const totalCapacity = agents.reduce((sum, a) => sum + a.capacity, 0);
    let random = Math.random() * totalCapacity;

    for (const agent of agents) {
      random -= agent.capacity;
      if (random <= 0) {
        return agent.id;
      }
    }

    return agents[0].id;
  }

  /**
   * Complete task
   */
  public completeTask(taskId: string): void {
    const result = this.runningTasks.get(taskId);

    if (!result) {
      return;
    }

    // Update agent load
    const agent = this.agents.get(result.agentId);
    if (agent) {
      agent.activeTasks = Math.max(0, agent.activeTasks - 1);
      agent.load = agent.activeTasks / agent.capacity;
    }

    this.runningTasks.delete(taskId);
    this.emit('task_completed', result);

    // Try to schedule more tasks
    this.schedule();
  }

  /**
   * Fail task
   */
  public failTask(taskId: string, error: Error): void {
    const result = this.runningTasks.get(taskId);

    if (!result) {
      return;
    }

    // Update agent load
    const agent = this.agents.get(result.agentId);
    if (agent) {
      agent.activeTasks = Math.max(0, agent.activeTasks - 1);
      agent.load = agent.activeTasks / agent.capacity;
    }

    this.runningTasks.delete(taskId);
    this.emit('task_failed', { taskId, agentId: result.agentId, error });

    // Try to schedule more tasks
    this.schedule();
  }

  /**
   * Get queue depth
   */
  public getQueueDepth(): number {
    return this.taskQueue.length;
  }

  /**
   * Get running task count
   */
  public getRunningTaskCount(): number {
    return this.runningTasks.size;
  }

  /**
   * Get agent count
   */
  public getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Get agent info
   */
  public getAgent(agentId: string): AgentInfo | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  public getAllAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  /**
   * Set load balancing strategy
   */
  public setStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    this.emit('strategy_changed', strategy);
  }

  /**
   * Get current strategy
   */
  public getStrategy(): LoadBalancingStrategy {
    return this.strategy;
  }

  /**
   * Get statistics
   */
  public getStats(): {
    queueDepth: number;
    runningTasks: number;
    agentCount: number;
    averageLoad: number;
    utilization: number;
  } {
    const agents = Array.from(this.agents.values());
    const averageLoad =
      agents.length > 0
        ? agents.reduce((sum, a) => sum + a.load, 0) / agents.length
        : 0;
    const totalCapacity = agents.reduce((sum, a) => sum + a.capacity, 0);
    const utilization =
      totalCapacity > 0
        ? agents.reduce((sum, a) => sum + a.activeTasks, 0) / totalCapacity
        : 0;

    return {
      queueDepth: this.taskQueue.length,
      runningTasks: this.runningTasks.size,
      agentCount: agents.length,
      averageLoad,
      utilization,
    };
  }

  /**
   * Clear stale tasks
   */
  public clearStaleTasks(timeout: number = 300000): void {
    const now = Date.now();
    const staleTasks: string[] = [];

    for (const [taskId, result] of this.runningTasks) {
      if (now - result.scheduledAt > timeout) {
        staleTasks.push(taskId);
      }
    }

    for (const taskId of staleTasks) {
      this.failTask(taskId, new Error('Task timeout'));
    }
  }
}

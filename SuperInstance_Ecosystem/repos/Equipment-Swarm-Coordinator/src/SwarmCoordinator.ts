/**
 * SwarmCoordinator - Main equipment class for orchestrating multiple agents
 * in origin-centric networks with asymmetrical knowledge distribution.
 */

import { AgentOrchestrator, type AgentProfile, type OrchestrationResult } from './AgentOrchestrator';
import { AsymmetricKnowledge, type KnowledgePartition } from './AsymmetricKnowledge';
import { TaskDecomposer, type TaskNode, type DependencyGraph } from './TaskDecomposer';
import { ResultAggregator, type AggregatedResult, type ConflictReport } from './ResultAggregator';
import type { AgentRole, ExecutionStatus, SwarmMetrics, AgentPerformance } from './types';

/**
 * Configuration for the Swarm Coordinator
 */
export interface SwarmConfig {
  /** Maximum number of agents in the swarm */
  maxAgents: number;
  /** Enable hierarchical agent structures */
  enableHierarchy: boolean;
  /** Maximum depth of agent hierarchy */
  maxHierarchyDepth: number;
  /** Knowledge isolation level */
  knowledgeIsolation: 'strict' | 'moderate' | 'relaxed';
  /** Task timeout in milliseconds */
  taskTimeout: number;
  /** Enable adaptive task allocation */
  adaptiveAllocation: boolean;
  /** Conflict resolution strategy */
  conflictResolution: 'voting' | 'weighted' | 'hierarchical' | 'consensus';
  /** Performance tracking window size */
  performanceWindowSize: number;
}

/**
 * Current state of the swarm
 */
export interface SwarmState {
  /** Unique identifier for the swarm */
  swarmId: string;
  /** Current status */
  status: ExecutionStatus;
  /** Number of active agents */
  activeAgentCount: number;
  /** Currently executing tasks */
  activeTasks: TaskNode[];
  /** Completed tasks count */
  completedTasksCount: number;
  /** Failed tasks count */
  failedTasksCount: number;
  /** Current metrics */
  metrics: SwarmMetrics;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Assignment of an agent to a task
 */
export interface AgentAssignment {
  /** Agent identifier */
  agentId: string;
  /** Assigned task */
  task: TaskNode;
  /** Knowledge partition assigned */
  knowledgePartition: KnowledgePartition;
  /** Assignment timestamp */
  assignedAt: Date;
  /** Assignment priority */
  priority: number;
}

/**
 * SwarmCoordinator - Main equipment class that coordinates multiple agents
 * in a swarm configuration with origin-centric provenance tracking.
 */
export class SwarmCoordinator {
  private config: SwarmConfig;
  private orchestrator: AgentOrchestrator;
  private knowledgeManager: AsymmetricKnowledge;
  private taskDecomposer: TaskDecomposer;
  private resultAggregator: ResultAggregator;
  
  private swarmId: string;
  private agents: Map<string, AgentProfile> = new Map();
  private assignments: Map<string, AgentAssignment> = new Map();
  private performanceHistory: Map<string, AgentPerformance[]> = new Map();
  private state: SwarmState;
  private originId: string;

  /**
   * Creates a new SwarmCoordinator instance
   * @param config - Configuration for the coordinator
   * @param originId - Origin identifier for provenance tracking
   */
  constructor(config: Partial<SwarmConfig> = {}, originId?: string) {
    this.config = this.mergeWithDefaults(config);
    this.originId = originId ?? this.generateOriginId();
    this.swarmId = this.generateSwarmId();
    
    this.orchestrator = new AgentOrchestrator({
      maxAgents: this.config.maxAgents,
      enableHierarchy: this.config.enableHierarchy,
      maxHierarchyDepth: this.config.maxHierarchyDepth,
    });
    
    this.knowledgeManager = new AsymmetricKnowledge({
      isolationLevel: this.config.knowledgeIsolation,
    });
    
    this.taskDecomposer = new TaskDecomposer({
      maxParallelism: this.config.maxAgents,
    });
    
    this.resultAggregator = new ResultAggregator({
      conflictResolution: this.config.conflictResolution,
    });
    
    this.state = this.initializeState();
  }

  /**
   * Register an agent with the swarm
   * @param agent - Agent profile to register
   * @returns True if registration successful
   */
  registerAgent(agent: AgentProfile): boolean {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error(`Maximum agent limit (${this.config.maxAgents}) reached`);
    }
    
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} is already registered`);
    }
    
    // Register with orchestrator
    const registered = this.orchestrator.registerAgent(agent);
    if (!registered) {
      return false;
    }
    
    this.agents.set(agent.id, agent);
    this.performanceHistory.set(agent.id, []);
    
    // Create knowledge partition for agent
    this.knowledgeManager.createPartition(agent.id, agent.role);
    
    this.updateState();
    return true;
  }

  /**
   * Unregister an agent from the swarm
   * @param agentId - Agent identifier to unregister
   * @returns True if unregistration successful
   */
  unregisterAgent(agentId: string): boolean {
    if (!this.agents.has(agentId)) {
      return false;
    }
    
    // Reassign any active tasks
    const assignment = this.assignments.get(agentId);
    if (assignment) {
      this.reassignTask(assignment.task);
    }
    
    this.agents.delete(agentId);
    this.performanceHistory.delete(agentId);
    this.assignments.delete(agentId);
    this.orchestrator.unregisterAgent(agentId);
    this.knowledgeManager.removePartition(agentId);
    
    this.updateState();
    return true;
  }

  /**
   * Execute a task using the swarm
   * @param task - Task description
   * @param context - Execution context
   * @returns Aggregated result from agents
   */
  async executeTask<T = unknown>(
    task: string,
    context: Record<string, unknown> = {}
  ): Promise<AggregatedResult<T>> {
    this.state.status = 'running';
    this.updateState();
    
    try {
      // Decompose task into subtasks
      const dependencyGraph = await this.taskDecomposer.decompose(task, context);
      
      // Execute tasks respecting dependencies
      const results = await this.executeDependencyGraph<T>(dependencyGraph);
      
      // Aggregate results
      const aggregatedResult = await this.resultAggregator.aggregate(results);
      
      // Handle conflicts if any
      if (aggregatedResult.conflicts.length > 0) {
        await this.resolveConflicts(aggregatedResult.conflicts);
      }
      
      this.state.status = 'completed';
      this.state.completedTasksCount += dependencyGraph.nodes.length;
      this.updateState();
      
      return aggregatedResult;
    } catch (error) {
      this.state.status = 'failed';
      this.state.failedTasksCount++;
      this.updateState();
      throw error;
    }
  }

  /**
   * Get current swarm state
   * @returns Current state
   */
  getState(): SwarmState {
    return { ...this.state };
  }

  /**
   * Get agent performance metrics
   * @param agentId - Optional agent ID for specific metrics
   * @returns Performance metrics
   */
  getPerformanceMetrics(agentId?: string): AgentPerformance[] | Map<string, AgentPerformance[]> {
    if (agentId) {
      return this.performanceHistory.get(agentId) ?? [];
    }
    return new Map(this.performanceHistory);
  }

  /**
   * Assign a task to the best available agent
   * @param task - Task to assign
   * @returns Agent assignment or null if no suitable agent
   */
  assignTask(task: TaskNode): AgentAssignment | null {
    // Get available agents with required capabilities
    const availableAgents = this.getAvailableAgents(task.requiredCapabilities);
    
    if (availableAgents.length === 0) {
      return null;
    }
    
    // Select best agent based on performance and current load
    const selectedAgent = this.selectBestAgent(availableAgents, task);
    
    // Get knowledge partition for agent
    const knowledgePartition = this.knowledgeManager.getPartition(selectedAgent.id);
    
    // Create assignment
    const assignment: AgentAssignment = {
      agentId: selectedAgent.id,
      task,
      knowledgePartition,
      assignedAt: new Date(),
      priority: task.priority,
    };
    
    this.assignments.set(selectedAgent.id, assignment);
    this.updateState();
    
    return assignment;
  }

  /**
   * Update agent performance after task completion
   * @param agentId - Agent identifier
   * @param performance - Performance metrics
   */
  updateAgentPerformance(agentId: string, performance: AgentPerformance): void {
    const history = this.performanceHistory.get(agentId) ?? [];
    history.push(performance);
    
    // Keep only the last N performances
    if (history.length > this.config.performanceWindowSize) {
      history.shift();
    }
    
    this.performanceHistory.set(agentId, history);
    
    // Update adaptive allocation if enabled
    if (this.config.adaptiveAllocation) {
      this.adjustAgentWeight(agentId, performance);
    }
  }

  // Private methods

  private mergeWithDefaults(config: Partial<SwarmConfig>): SwarmConfig {
    return {
      maxAgents: config.maxAgents ?? 10,
      enableHierarchy: config.enableHierarchy ?? true,
      maxHierarchyDepth: config.maxHierarchyDepth ?? 3,
      knowledgeIsolation: config.knowledgeIsolation ?? 'moderate',
      taskTimeout: config.taskTimeout ?? 30000,
      adaptiveAllocation: config.adaptiveAllocation ?? true,
      conflictResolution: config.conflictResolution ?? 'weighted',
      performanceWindowSize: config.performanceWindowSize ?? 100,
    };
  }

  private generateOriginId(): string {
    return `origin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateSwarmId(): string {
    return `swarm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private initializeState(): SwarmState {
    return {
      swarmId: this.swarmId,
      status: 'idle',
      activeAgentCount: 0,
      activeTasks: [],
      completedTasksCount: 0,
      failedTasksCount: 0,
      metrics: this.calculateMetrics(),
      lastUpdated: new Date(),
    };
  }

  private updateState(): void {
    this.state.activeAgentCount = this.agents.size;
    this.state.metrics = this.calculateMetrics();
    this.state.lastUpdated = new Date();
  }

  private calculateMetrics(): SwarmMetrics {
    const performances = Array.from(this.performanceHistory.values()).flat();
    
    return {
      totalAgents: this.agents.size,
      averageResponseTime: this.calculateAverage(performances.map(p => p.responseTime)),
      successRate: this.calculateSuccessRate(performances),
      throughput: this.state?.completedTasksCount ?? 0,
      resourceUtilization: this.calculateResourceUtilization(),
      knowledgeDistributionScore: this.knowledgeManager.getDistributionScore(),
    };
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateSuccessRate(performances: AgentPerformance[]): number {
    if (performances.length === 0) return 1;
    const successful = performances.filter(p => p.success).length;
    return successful / performances.length;
  }

  private calculateResourceUtilization(): number {
    const totalAgents = this.agents.size;
    if (totalAgents === 0) return 0;
    const busyAgents = this.assignments.size;
    return busyAgents / totalAgents;
  }

  private getAvailableAgents(requiredCapabilities: string[]): AgentProfile[] {
    return Array.from(this.agents.values()).filter(agent => {
      // Check if agent is not currently assigned
      if (this.assignments.has(agent.id)) {
        return false;
      }
      
      // Check if agent has required capabilities
      return requiredCapabilities.every(cap => 
        agent.capabilities.includes(cap)
      );
    });
  }

  private selectBestAgent(agents: AgentProfile[], task: TaskNode): AgentProfile {
    if (!this.config.adaptiveAllocation || agents.length === 1) {
      return agents[0]!;
    }
    
    // Score each agent based on performance and specialization
    const scoredAgents = agents.map(agent => {
      const history = this.performanceHistory.get(agent.id) ?? [];
      const avgPerformance = history.length > 0
        ? this.calculateAverage(history.map(p => p.score))
        : 0.5; // Default for new agents
      
      const specializationScore = this.calculateSpecializationScore(agent, task);
      
      return {
        agent,
        score: avgPerformance * 0.6 + specializationScore * 0.4,
      };
    });
    
    // Sort by score descending
    scoredAgents.sort((a, b) => b.score - a.score);
    
    return scoredAgents[0]!.agent;
  }

  private calculateSpecializationScore(agent: AgentProfile, task: TaskNode): number {
    const matchingCapabilities = task.requiredCapabilities.filter(
      cap => agent.capabilities.includes(cap)
    ).length;
    
    return matchingCapabilities / task.requiredCapabilities.length;
  }

  private async executeDependencyGraph<T>(
    graph: DependencyGraph
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const executing = new Set<string>();
    const completed = new Set<string>();
    
    while (completed.size < graph.nodes.size) {
      // Find tasks ready to execute (all dependencies completed)
      const readyTasks = this.findReadyTasks(graph, completed, executing);
      
      if (readyTasks.length === 0 && executing.size === 0) {
        throw new Error('Deadlock detected in dependency graph');
      }
      
      // Execute ready tasks in parallel
      const executionPromises = readyTasks.map(async (taskId) => {
        executing.add(taskId);
        const task = graph.nodes.get(taskId)!;
        
        try {
          const assignment = this.assignTask(task);
          if (!assignment) {
            throw new Error(`No available agent for task ${taskId}`);
          }
          
          // Simulate task execution
          const result = await this.executeAssignedTask<T>(assignment);
          results.set(taskId, result);
          completed.add(taskId);
          
          // Update performance
          this.updateAgentPerformance(assignment.agentId, {
            agentId: assignment.agentId,
            taskId,
            success: true,
            responseTime: Date.now() - assignment.assignedAt.getTime(),
            score: 1,
            timestamp: new Date(),
          });
        } catch (error) {
          completed.add(taskId); // Mark as completed even if failed
          throw error;
        } finally {
          executing.delete(taskId);
        }
      });
      
      await Promise.all(executionPromises);
    }
    
    return results;
  }

  private findReadyTasks(
    graph: DependencyGraph,
    completed: Set<string>,
    executing: Set<string>
  ): string[] {
    const ready: string[] = [];
    
    for (const [taskId, task] of graph.nodes) {
      if (completed.has(taskId) || executing.has(taskId)) {
        continue;
      }
      
      // Check if all dependencies are completed
      const dependencies = graph.dependencies.get(taskId) ?? [];
      const allDependenciesMet = dependencies.every(dep => completed.has(dep));
      
      if (allDependenciesMet) {
        ready.push(taskId);
      }
    }
    
    return ready;
  }

  private async executeAssignedTask<T>(assignment: AgentAssignment): Promise<T> {
    // This would integrate with actual agent execution
    // For now, return a placeholder result
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({} as T);
      }, 100);
    });
  }

  private async reassignTask(task: TaskNode): Promise<void> {
    // Find new agent for the task
    const newAssignment = this.assignTask(task);
    if (!newAssignment) {
      this.state.failedTasksCount++;
    }
  }

  private async resolveConflicts(conflicts: ConflictReport[]): Promise<void> {
    for (const conflict of conflicts) {
      switch (this.config.conflictResolution) {
        case 'voting':
          await this.resolveByVoting(conflict);
          break;
        case 'weighted':
          await this.resolveByWeight(conflict);
          break;
        case 'hierarchical':
          await this.resolveByHierarchy(conflict);
          break;
        case 'consensus':
          await this.resolveByConsensus(conflict);
          break;
      }
    }
  }

  private async resolveByVoting(conflict: ConflictReport): Promise<void> {
    // Simple majority voting
    const results = conflict.conflictingResults;
    // Implementation would count votes and select winner
  }

  private async resolveByWeight(conflict: ConflictReport): Promise<void> {
    // Weight by agent performance
    const results = conflict.conflictingResults;
    // Implementation would weight by agent scores
  }

  private async resolveByHierarchy(conflict: ConflictReport): Promise<void> {
    // Resolve by agent hierarchy level
    const results = conflict.conflictingResults;
    // Implementation would use hierarchy
  }

  private async resolveByConsensus(conflict: ConflictReport): Promise<void> {
    // Attempt to find consensus between agents
    const results = conflict.conflictingResults;
    // Implementation would negotiate consensus
  }

  private adjustAgentWeight(agentId: string, performance: AgentPerformance): void {
    // Adjust agent selection weight based on performance
    // This affects future task assignments
    this.orchestrator.adjustAgentWeight(agentId, performance.score);
  }
}

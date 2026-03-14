/**
 * TaskDecomposer - Breaks down tasks into subtasks for parallel execution
 * with dependency tracking.
 */

import type { TaskPriority, ExecutionStatus } from './types';

/**
 * Configuration for task decomposition
 */
export interface DecompositionConfig {
  /** Maximum parallelism level */
  maxParallelism: number;
  /** Minimum task size for decomposition */
  minTaskSize: number;
  /** Maximum decomposition depth */
  maxDepth: number;
  /** Enable automatic dependency detection */
  autoDependencyDetection: boolean;
  /** Task timeout in ms */
  defaultTimeout: number;
}

/**
 * A node in the task tree
 */
export interface TaskNode {
  /** Task identifier */
  taskId: string;
  /** Task description */
  description: string;
  /** Task type */
  type: TaskType;
  /** Priority level */
  priority: TaskPriority;
  /** Required capabilities */
  requiredCapabilities: string[];
  /** Input data */
  input: Record<string, unknown>;
  /** Output data (when completed) */
  output?: unknown;
  /** Execution status */
  status: ExecutionStatus;
  /** Child tasks */
  children: string[];
  /** Parent task ID (if any) */
  parentId?: string;
  /** Estimated complexity (0-1) */
  estimatedComplexity: number;
  /** Actual complexity after execution */
  actualComplexity?: number;
  /** Estimated duration in ms */
  estimatedDuration: number;
  /** Actual duration in ms */
  actualDuration?: number;
  /** Created timestamp */
  createdAt: Date;
  /** Started timestamp */
  startedAt?: Date;
  /** Completed timestamp */
  completedAt?: Date;
  /** Retry count */
  retryCount: number;
  /** Maximum retries */
  maxRetries: number;
}

/**
 * Type of task
 */
export type TaskType = 
  | 'computation'
  | 'io'
  | 'communication'
  | 'decision'
  | 'validation'
  | 'aggregation'
  | 'decomposition'
  | 'synchronization';

/**
 * Dependency graph structure
 */
export interface DependencyGraph {
  /** Graph identifier */
  graphId: string;
  /** All task nodes */
  nodes: Map<string, TaskNode>;
  /** Dependencies: task -> dependencies */
  dependencies: Map<string, string[]>;
  /** Dependents: task -> tasks that depend on it */
  dependents: Map<string, string[]>;
  /** Execution layers (for parallel execution) */
  layers: string[][];
  /** Root task ID */
  rootTaskId: string;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Decomposition strategy
 */
export type DecompositionStrategy = 
  | 'parallel'      // Split into independent parallel tasks
  | 'sequential'    // Split into sequential tasks
  | 'pipeline'      // Split into pipeline stages
  | 'map-reduce'    // Map-reduce pattern
  | 'divide-conquer'; // Divide and conquer

/**
 * TaskDecomposer analyzes and decomposes complex tasks into manageable subtasks.
 */
export class TaskDecomposer {
  private config: DecompositionConfig;
  private decompositionStrategies: Map<TaskType, DecompositionStrategy>;
  private taskTemplates: Map<string, TaskTemplate>;

  /**
   * Creates a new TaskDecomposer
   * @param config - Configuration options
   */
  constructor(config: Partial<DecompositionConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    this.decompositionStrategies = this.initializeStrategies();
    this.taskTemplates = new Map();
  }

  /**
   * Decompose a task into a dependency graph
   * @param task - Task description
   * @param context - Execution context
   * @returns Dependency graph
   */
  async decompose(
    task: string,
    context: Record<string, unknown> = {}
  ): Promise<DependencyGraph> {
    // Analyze the task
    const analysis = await this.analyzeTask(task, context);
    
    // Create root task node
    const rootTask = this.createTaskNode(task, analysis, null);
    
    // Initialize graph
    const graph: DependencyGraph = {
      graphId: this.generateId(),
      nodes: new Map([[rootTask.taskId, rootTask]]),
      dependencies: new Map([[rootTask.taskId, []]]),
      dependents: new Map([[rootTask.taskId, []]]),
      layers: [],
      rootTaskId: rootTask.taskId,
      createdAt: new Date(),
    };

    // Recursively decompose if task is complex enough
    if (analysis.canDecompose && analysis.complexity > this.config.minTaskSize) {
      await this.decomposeRecursive(rootTask, graph, context, 0);
    }

    // Calculate execution layers
    graph.layers = this.calculateLayers(graph);
    
    return graph;
  }

  /**
   * Analyze a task to determine decomposition potential
   * @param task - Task description
   * @param context - Execution context
   * @returns Task analysis
   */
  async analyzeTask(
    task: string,
    context: Record<string, unknown>
  ): Promise<TaskAnalysis> {
    // Parse task to identify type, dependencies, and complexity
    const type = this.identifyTaskType(task, context);
    const complexity = this.estimateComplexity(task, context);
    const capabilities = this.identifyRequiredCapabilities(task, type);
    const canDecompose = this.canDecompose(task, type, complexity);
    const strategy = this.selectStrategy(type, complexity);

    return {
      type,
      complexity,
      requiredCapabilities: capabilities,
      canDecompose,
      suggestedStrategy: strategy,
      estimatedDuration: this.estimateDuration(complexity, type),
      dependencies: this.detectDependencies(task, context),
    };
  }

  /**
   * Get a task by ID from a graph
   * @param graph - Dependency graph
   * @param taskId - Task identifier
   * @returns Task node or undefined
   */
  getTask(graph: DependencyGraph, taskId: string): TaskNode | undefined {
    return graph.nodes.get(taskId);
  }

  /**
   * Get tasks ready for execution
   * @param graph - Dependency graph
   * @param completed - Set of completed task IDs
   * @returns Tasks ready to execute
   */
  getReadyTasks(graph: DependencyGraph, completed: Set<string>): TaskNode[] {
    const ready: TaskNode[] = [];
    
    for (const [taskId, task] of graph.nodes) {
      if (completed.has(taskId) || task.status !== 'idle') {
        continue;
      }

      const deps = graph.dependencies.get(taskId) ?? [];
      const allDepsMet = deps.every(dep => completed.has(dep));
      
      if (allDepsMet) {
        ready.push(task);
      }
    }

    // Sort by priority
    return ready.sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));
  }

  /**
   * Add a dependency between tasks
   * @param graph - Dependency graph
   * @param taskId - Task ID
   * @param dependsOn - Task it depends on
   */
  addDependency(graph: DependencyGraph, taskId: string, dependsOn: string): void {
    if (!graph.nodes.has(taskId) || !graph.nodes.has(dependsOn)) {
      throw new Error('Both tasks must exist in the graph');
    }

    // Add to dependencies
    const deps = graph.dependencies.get(taskId) ?? [];
    if (!deps.includes(dependsOn)) {
      deps.push(dependsOn);
      graph.dependencies.set(taskId, deps);
    }

    // Add to dependents
    const dependents = graph.dependents.get(dependsOn) ?? [];
    if (!dependents.includes(taskId)) {
      dependents.push(taskId);
      graph.dependents.set(dependsOn, dependents);
    }

    // Recalculate layers
    graph.layers = this.calculateLayers(graph);
  }

  /**
   * Remove a dependency
   * @param graph - Dependency graph
   * @param taskId - Task ID
   * @param dependsOn - Task to remove dependency on
   */
  removeDependency(graph: DependencyGraph, taskId: string, dependsOn: string): void {
    // Remove from dependencies
    const deps = graph.dependencies.get(taskId) ?? [];
    const depIndex = deps.indexOf(dependsOn);
    if (depIndex !== -1) {
      deps.splice(depIndex, 1);
      graph.dependencies.set(taskId, deps);
    }

    // Remove from dependents
    const dependents = graph.dependents.get(dependsOn) ?? [];
    const dependentIndex = dependents.indexOf(taskId);
    if (dependentIndex !== -1) {
      dependents.splice(dependentIndex, 1);
      graph.dependents.set(dependsOn, dependents);
    }

    // Recalculate layers
    graph.layers = this.calculateLayers(graph);
  }

  /**
   * Update task status
   * @param graph - Dependency graph
   * @param taskId - Task identifier
   * @param status - New status
   */
  updateTaskStatus(graph: DependencyGraph, taskId: string, status: ExecutionStatus): void {
    const task = graph.nodes.get(taskId);
    if (task) {
      task.status = status;
      
      if (status === 'running' && !task.startedAt) {
        task.startedAt = new Date();
      } else if (status === 'completed' || status === 'failed') {
        task.completedAt = new Date();
        if (task.startedAt) {
          task.actualDuration = task.completedAt.getTime() - task.startedAt.getTime();
        }
      }
    }
  }

  /**
   * Get task statistics
   * @param graph - Dependency graph
   * @returns Statistics object
   */
  getStatistics(graph: DependencyGraph): GraphStatistics {
    const nodes = Array.from(graph.nodes.values());
    
    return {
      totalTasks: nodes.length,
      byStatus: this.groupByStatus(nodes),
      byType: this.groupByType(nodes),
      byPriority: this.groupByPriority(nodes),
      maxDepth: graph.layers.length,
      criticalPath: this.findCriticalPath(graph),
      parallelismFactor: this.calculateParallelismFactor(graph),
    };
  }

  /**
   * Register a task template
   * @param name - Template name
   * @param template - Task template
   */
  registerTemplate(name: string, template: TaskTemplate): void {
    this.taskTemplates.set(name, template);
  }

  /**
   * Create task from template
   * @param templateName - Template name
   * @param params - Template parameters
   * @returns Task node
   */
  fromTemplate(templateName: string, params: Record<string, unknown>): TaskNode | null {
    const template = this.taskTemplates.get(templateName);
    if (!template) return null;

    const description = this.interpolateTemplate(template.descriptionTemplate, params);
    const analysis: TaskAnalysis = {
      type: template.type,
      complexity: template.baseComplexity,
      requiredCapabilities: template.requiredCapabilities,
      canDecompose: template.canDecompose,
      suggestedStrategy: template.strategy,
      estimatedDuration: template.estimatedDuration,
      dependencies: [],
    };

    return this.createTaskNode(description, analysis, null);
  }

  // Private methods

  private mergeWithDefaults(config: Partial<DecompositionConfig>): DecompositionConfig {
    return {
      maxParallelism: config.maxParallelism ?? 10,
      minTaskSize: config.minTaskSize ?? 0.1,
      maxDepth: config.maxDepth ?? 5,
      autoDependencyDetection: config.autoDependencyDetection ?? true,
      defaultTimeout: config.defaultTimeout ?? 60000,
    };
  }

  private initializeStrategies(): Map<TaskType, DecompositionStrategy> {
    return new Map([
      ['computation', 'divide-conquer'],
      ['io', 'parallel'],
      ['communication', 'pipeline'],
      ['decision', 'sequential'],
      ['validation', 'parallel'],
      ['aggregation', 'map-reduce'],
      ['decomposition', 'divide-conquer'],
      ['synchronization', 'sequential'],
    ]);
  }

  private createTaskNode(
    description: string,
    analysis: TaskAnalysis,
    parentId: string | null
  ): TaskNode {
    return {
      taskId: this.generateId(),
      description,
      type: analysis.type,
      priority: 'normal',
      requiredCapabilities: analysis.requiredCapabilities,
      input: {},
      status: 'idle',
      children: [],
      parentId: parentId ?? undefined,
      estimatedComplexity: analysis.complexity,
      estimatedDuration: analysis.estimatedDuration,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };
  }

  private async decomposeRecursive(
    task: TaskNode,
    graph: DependencyGraph,
    context: Record<string, unknown>,
    depth: number
  ): Promise<void> {
    if (depth >= this.config.maxDepth) {
      return;
    }

    const analysis = await this.analyzeTask(task.description, context);
    
    if (!analysis.canDecompose) {
      return;
    }

    // Generate subtasks based on strategy
    const subtasks = await this.generateSubtasks(task, analysis, context);
    
    for (const subtask of subtasks) {
      subtask.parentId = task.taskId;
      task.children.push(subtask.taskId);
      
      graph.nodes.set(subtask.taskId, subtask);
      graph.dependencies.set(subtask.taskId, [task.taskId]);
      graph.dependents.set(subtask.taskId, []);
      
      // Add reverse dependency
      const taskDependents = graph.dependents.get(task.taskId) ?? [];
      taskDependents.push(subtask.taskId);
      graph.dependents.set(task.taskId, taskDependents);

      // Recursively decompose
      await this.decomposeRecursive(subtask, graph, context, depth + 1);
    }
  }

  private async generateSubtasks(
    task: TaskNode,
    analysis: TaskAnalysis,
    _context: Record<string, unknown>
  ): Promise<TaskNode[]> {
    const subtasks: TaskNode[] = [];
    const strategy = analysis.suggestedStrategy;

    switch (strategy) {
      case 'parallel':
        // Split into parallel independent tasks
        for (let i = 0; i < Math.min(3, this.config.maxParallelism); i++) {
          const subtask = this.createTaskNode(
            `${task.description} (part ${i + 1})`,
            { ...analysis, complexity: analysis.complexity / 3 },
            task.taskId
          );
          subtasks.push(subtask);
        }
        break;

      case 'sequential':
        // Split into sequential stages
        const stages = ['prepare', 'execute', 'finalize'];
        for (let i = 0; i < stages.length; i++) {
          const subtask = this.createTaskNode(
            `${task.description} - ${stages[i]}`,
            { ...analysis, complexity: analysis.complexity / 3 },
            task.taskId
          );
          subtask.priority = i === 0 ? 'high' : 'normal';
          subtasks.push(subtask);
          
          // Add sequential dependency
          if (i > 0) {
            subtask.input = { previousTaskId: subtasks[i - 1]!.taskId };
          }
        }
        break;

      case 'pipeline':
        // Create pipeline stages
        const pipelineStages = ['input', 'process', 'output'];
        for (const stage of pipelineStages) {
          const subtask = this.createTaskNode(
            `${task.description} - ${stage} stage`,
            { ...analysis, complexity: analysis.complexity / 3 },
            task.taskId
          );
          subtask.type = stage === 'input' ? 'io' : stage === 'output' ? 'io' : 'computation';
          subtasks.push(subtask);
        }
        break;

      case 'map-reduce':
        // Create map and reduce tasks
        const mapTask = this.createTaskNode(
          `${task.description} - map`,
          { ...analysis, complexity: analysis.complexity * 0.6 },
          task.taskId
        );
        mapTask.type = 'computation';
        
        const reduceTask = this.createTaskNode(
          `${task.description} - reduce`,
          { ...analysis, complexity: analysis.complexity * 0.4 },
          task.taskId
        );
        reduceTask.type = 'aggregation';
        
        subtasks.push(mapTask, reduceTask);
        break;

      case 'divide-conquer':
        // Create divide, solve, and combine tasks
        const divideTask = this.createTaskNode(
          `${task.description} - divide`,
          { ...analysis, complexity: analysis.complexity * 0.2 },
          task.taskId
        );
        divideTask.type = 'decomposition';
        
        const solveTask = this.createTaskNode(
          `${task.description} - solve`,
          { ...analysis, complexity: analysis.complexity * 0.6 },
          task.taskId
        );
        solveTask.type = 'computation';
        
        const combineTask = this.createTaskNode(
          `${task.description} - combine`,
          { ...analysis, complexity: analysis.complexity * 0.2 },
          task.taskId
        );
        combineTask.type = 'aggregation';
        
        subtasks.push(divideTask, solveTask, combineTask);
        break;
    }

    return subtasks;
  }

  private calculateLayers(graph: DependencyGraph): string[][] {
    const layers: string[][] = [];
    const assigned = new Set<string>();

    while (assigned.size < graph.nodes.size) {
      const layer: string[] = [];
      
      for (const [taskId] of graph.nodes) {
        if (assigned.has(taskId)) continue;
        
        const deps = graph.dependencies.get(taskId) ?? [];
        const allDepsAssigned = deps.every(dep => assigned.has(dep));
        
        if (allDepsAssigned) {
          layer.push(taskId);
        }
      }

      if (layer.length === 0) {
        // Cycle detected, break remaining tasks into single layer
        for (const [taskId] of graph.nodes) {
          if (!assigned.has(taskId)) {
            layer.push(taskId);
          }
        }
      }

      layers.push(layer);
      layer.forEach(id => assigned.add(id));
    }

    return layers;
  }

  private identifyTaskType(task: string, _context: Record<string, unknown>): TaskType {
    const lowerTask = task.toLowerCase();
    
    if (lowerTask.includes('compute') || lowerTask.includes('calculate') || lowerTask.includes('process')) {
      return 'computation';
    }
    if (lowerTask.includes('read') || lowerTask.includes('write') || lowerTask.includes('fetch')) {
      return 'io';
    }
    if (lowerTask.includes('send') || lowerTask.includes('receive') || lowerTask.includes('communicate')) {
      return 'communication';
    }
    if (lowerTask.includes('decide') || lowerTask.includes('choose') || lowerTask.includes('select')) {
      return 'decision';
    }
    if (lowerTask.includes('validate') || lowerTask.includes('check') || lowerTask.includes('verify')) {
      return 'validation';
    }
    if (lowerTask.includes('aggregate') || lowerTask.includes('merge') || lowerTask.includes('combine')) {
      return 'aggregation';
    }
    if (lowerTask.includes('sync') || lowerTask.includes('wait') || lowerTask.includes('barrier')) {
      return 'synchronization';
    }
    
    return 'computation';
  }

  private estimateComplexity(task: string, _context: Record<string, unknown>): number {
    // Simple heuristic based on task description length and keywords
    let complexity = Math.min(1, task.length / 200);
    
    const complexityIndicators = [
      'complex', 'multiple', 'parallel', 'hierarchical', 'recursive', 'nested'
    ];
    
    for (const indicator of complexityIndicators) {
      if (task.toLowerCase().includes(indicator)) {
        complexity = Math.min(1, complexity + 0.15);
      }
    }
    
    return complexity;
  }

  private identifyRequiredCapabilities(task: string, _type: TaskType): string[] {
    const capabilities: string[] = [];
    const lowerTask = task.toLowerCase();
    
    if (lowerTask.includes('data') || lowerTask.includes('database')) {
      capabilities.push('data-processing');
    }
    if (lowerTask.includes('api') || lowerTask.includes('http')) {
      capabilities.push('network');
    }
    if (lowerTask.includes('file') || lowerTask.includes('disk')) {
      capabilities.push('filesystem');
    }
    if (lowerTask.includes('compute') || lowerTask.includes('calculate')) {
      capabilities.push('computation');
    }
    if (lowerTask.includes('validate') || lowerTask.includes('verify')) {
      capabilities.push('validation');
    }
    
    return capabilities.length > 0 ? capabilities : ['general'];
  }

  private canDecompose(task: string, _type: TaskType, complexity: number): boolean {
    if (complexity < this.config.minTaskSize) {
      return false;
    }
    
    const atomicIndicators = ['simple', 'atomic', 'single', 'basic'];
    return !atomicIndicators.some(ind => task.toLowerCase().includes(ind));
  }

  private selectStrategy(type: TaskType, _complexity: number): DecompositionStrategy {
    return this.decompositionStrategies.get(type) ?? 'parallel';
  }

  private estimateDuration(complexity: number, _type: TaskType): number {
    // Base duration in ms, scaled by complexity
    return Math.round(1000 + complexity * 10000);
  }

  private detectDependencies(task: string, _context: Record<string, unknown>): string[] {
    // Simple dependency detection based on keywords
    const deps: string[] = [];
    
    if (task.includes('after') || task.includes('then')) {
      // Task has sequential dependency
      deps.push('previous');
    }
    
    return deps;
  }

  private getPriorityValue(priority: TaskPriority): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
    }
  }

  private groupByStatus(nodes: TaskNode[]): Record<ExecutionStatus, number> {
    const groups: Record<ExecutionStatus, number> = {
      idle: 0, running: 0, paused: 0, completed: 0, failed: 0,
    };
    nodes.forEach(n => groups[n.status]++);
    return groups;
  }

  private groupByType(nodes: TaskNode[]): Record<TaskType, number> {
    const groups: Partial<Record<TaskType, number>> = {};
    nodes.forEach(n => {
      groups[n.type] = (groups[n.type] ?? 0) + 1;
    });
    return groups as Record<TaskType, number>;
  }

  private groupByPriority(nodes: TaskNode[]): Record<TaskPriority, number> {
    const groups: Record<TaskPriority, number> = {
      critical: 0, high: 0, normal: 0, low: 0,
    };
    nodes.forEach(n => groups[n.priority]++);
    return groups;
  }

  private findCriticalPath(graph: DependencyGraph): string[] {
    // Find the longest path through the graph
    const path: string[] = [];
    const visited = new Set<string>();

    const dfs = (taskId: string, currentPath: string[]): string[] => {
      if (visited.has(taskId)) return currentPath;
      
      visited.add(taskId);
      currentPath.push(taskId);

      const dependents = graph.dependents.get(taskId) ?? [];
      let longestPath = currentPath;

      for (const dependent of dependents) {
        const result = dfs(dependent, [...currentPath]);
        if (result.length > longestPath.length) {
          longestPath = result;
        }
      }

      return longestPath;
    };

    // Start from root
    return dfs(graph.rootTaskId, path);
  }

  private calculateParallelismFactor(graph: DependencyGraph): number {
    if (graph.layers.length === 0) return 1;
    
    const avgLayerSize = graph.nodes.size / graph.layers.length;
    return Math.min(this.config.maxParallelism, avgLayerSize);
  }

  private interpolateTemplate(template: string, params: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(params[key] ?? `{{${key}}}`);
    });
  }

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Analysis result for a task
 */
interface TaskAnalysis {
  type: TaskType;
  complexity: number;
  requiredCapabilities: string[];
  canDecompose: boolean;
  suggestedStrategy: DecompositionStrategy;
  estimatedDuration: number;
  dependencies: string[];
}

/**
 * Task template for reusable task patterns
 */
interface TaskTemplate {
  name: string;
  descriptionTemplate: string;
  type: TaskType;
  baseComplexity: number;
  requiredCapabilities: string[];
  canDecompose: boolean;
  strategy: DecompositionStrategy;
  estimatedDuration: number;
}

/**
 * Statistics about a dependency graph
 */
interface GraphStatistics {
  totalTasks: number;
  byStatus: Record<ExecutionStatus, number>;
  byType: Record<TaskType, number>;
  byPriority: Record<TaskPriority, number>;
  maxDepth: number;
  criticalPath: string[];
  parallelismFactor: number;
}

/**
 * AdaptiveScheduler - Work scheduling based on resources
 * Makes intelligent decisions about where to process tasks
 */

import type { ResourceMetrics } from './ResourceMonitor';
import type { CloudProvider } from './CloudBridge';

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface EstimatedResources {
  cpu?: number;        // CPU cores needed (fractional)
  memory?: number;     // Memory in MB
  gpu?: number;        // GPU memory in MB
  tokens?: number;     // Estimated tokens for LLM tasks
  duration?: number;   // Estimated duration in ms
}

export interface Task {
  id: string;
  type: string;
  payload: unknown;
  priority?: TaskPriority;
  estimatedResources?: EstimatedResources;
  deadline?: number;   // Timestamp for deadline
  maxCost?: number;    // Maximum acceptable cost in USD
  preferredLocation?: 'local' | 'cloud';
}

export interface SchedulingDecision {
  taskId: string;
  location: 'local' | 'cloud';
  provider?: CloudProvider;
  reason: string;
  estimatedCost: number;
  estimatedTime: number;
  confidence: number;  // 0-1
}

export interface SchedulerConfig {
  cpuThreshold: number;
  memoryThreshold: number;
  gpuThreshold: number;
  costCeiling: number;
  preferLocal?: boolean;
  maxQueueSize?: number;
}

interface SchedulerContext {
  totalCostIncurred: number;
  costCeiling: number;
}

interface QueuedTask {
  task: Task;
  enqueueTime: number;
  attempts: number;
}

/**
 * AdaptiveScheduler - Intelligent task scheduling
 * 
 * @example
 * ```typescript
 * const scheduler = new AdaptiveScheduler({
 *   cpuThreshold: 80,
 *   memoryThreshold: 85,
 *   costCeiling: 100
 * });
 * 
 * const decision = scheduler.schedule(task, metrics, context);
 * ```
 */
export class AdaptiveScheduler {
  private config: Required<SchedulerConfig>;
  private lastDecision: SchedulingDecision | null = null;
  private taskQueue: Map<TaskPriority, QueuedTask[]> = new Map();
  private schedulingHistory: SchedulingDecision[] = [];
  private maxHistorySize: number = 1000;

  // Cost estimates per provider (USD per 1K tokens)
  private readonly providerCosts: Record<CloudProvider, number> = {
    openai: 0.002,
    anthropic: 0.003,
    local: 0
  };

  constructor(config: SchedulerConfig) {
    this.config = {
      cpuThreshold: config.cpuThreshold,
      memoryThreshold: config.memoryThreshold,
      gpuThreshold: config.gpuThreshold,
      costCeiling: config.costCeiling,
      preferLocal: config.preferLocal ?? true,
      maxQueueSize: config.maxQueueSize ?? 100
    };

    // Initialize priority queues
    (['critical', 'high', 'normal', 'low'] as TaskPriority[]).forEach(priority => {
      this.taskQueue.set(priority, []);
    });
  }

  /**
   * Make scheduling decision for a task
   */
  schedule(
    task: Task,
    metrics: ResourceMetrics,
    context: SchedulerContext
  ): SchedulingDecision {
    const decision = this.makeDecision(task, metrics, context);
    
    // Store decision
    this.lastDecision = decision;
    this.addToHistory(decision);

    return decision;
  }

  /**
   * Core decision-making logic
   */
  private makeDecision(
    task: Task,
    metrics: ResourceMetrics,
    context: SchedulerContext
  ): SchedulingDecision {
    const reasons: string[] = [];
    let localScore = 0;
    let cloudScore = 0;

    // Factor 1: Resource availability
    const resourceScore = this.evaluateResources(metrics);
    localScore += resourceScore.local;
    cloudScore += resourceScore.cloud;
    reasons.push(...resourceScore.reasons);

    // Factor 2: Cost considerations
    const costScore = this.evaluateCost(task, context);
    localScore += costScore.local;
    cloudScore += costScore.cloud;
    reasons.push(...costScore.reasons);

    // Factor 3: Task priority
    const priorityScore = this.evaluatePriority(task);
    localScore += priorityScore.local;
    cloudScore += priorityScore.cloud;
    reasons.push(...priorityScore.reasons);

    // Factor 4: Task preferences
    if (task.preferredLocation) {
      if (task.preferredLocation === 'local') {
        localScore += 20;
        reasons.push('Task prefers local execution');
      } else {
        cloudScore += 20;
        reasons.push('Task prefers cloud execution');
      }
    }

    // Factor 5: Deadline pressure
    if (task.deadline) {
      const timeUntilDeadline = task.deadline - Date.now();
      if (timeUntilDeadline < 5000) { // Less than 5 seconds
        cloudScore += 15;
        reasons.push('Urgent deadline - cloud preferred for speed');
      }
    }

    // Make final decision
    const location = localScore >= cloudScore ? 'local' : 'cloud';
    const provider = location === 'cloud' ? this.selectProvider(task) : undefined;
    const estimatedCost = location === 'cloud' 
      ? this.estimateCost(task, provider ?? 'openai')
      : 0;
    const estimatedTime = this.estimateTime(task, location);

    return {
      taskId: task.id,
      location,
      provider,
      reason: reasons.join('; '),
      estimatedCost,
      estimatedTime,
      confidence: Math.abs(localScore - cloudScore) / 100
    };
  }

  /**
   * Evaluate resource availability
   */
  private evaluateResources(metrics: ResourceMetrics): {
    local: number;
    cloud: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let local = 50; // Start with neutral score
    let cloud = 0;

    // CPU evaluation
    if (metrics.cpu.percentage > this.config.cpuThreshold) {
      cloud += 15;
      local -= 20;
      reasons.push(`CPU at ${metrics.cpu.percentage.toFixed(1)}% (threshold: ${this.config.cpuThreshold}%)`);
    } else {
      local += 10;
      reasons.push('CPU within limits');
    }

    // Memory evaluation
    if (metrics.memory.percentage > this.config.memoryThreshold) {
      cloud += 15;
      local -= 20;
      reasons.push(`Memory at ${metrics.memory.percentage.toFixed(1)}% (threshold: ${this.config.memoryThreshold}%)`);
    } else {
      local += 10;
      reasons.push('Memory within limits');
    }

    // GPU evaluation
    if (metrics.gpu.available) {
      if (metrics.gpu.percentage > this.config.gpuThreshold) {
        cloud += 10;
        local -= 10;
        reasons.push(`GPU at ${metrics.gpu.percentage.toFixed(1)}% (threshold: ${this.config.gpuThreshold}%)`);
      } else {
        local += 15;
        reasons.push('GPU available and within limits');
      }
    }

    return { local, cloud, reasons };
  }

  /**
   * Evaluate cost considerations
   */
  private evaluateCost(task: Task, context: SchedulerContext): {
    local: number;
    cloud: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let local = 0;
    let cloud = 0;

    // Check cost ceiling
    const remainingBudget = context.costCeiling - context.totalCostIncurred;
    const estimatedCloudCost = this.estimateCost(task, 'openai');

    if (remainingBudget < estimatedCloudCost * 10) {
      local += 20;
      cloud -= 10;
      reasons.push(`Budget low ($${remainingBudget.toFixed(4)} remaining)`);
    }

    // Check task max cost
    if (task.maxCost !== undefined && estimatedCloudCost > task.maxCost) {
      local += 25;
      cloud -= 15;
      reasons.push(`Cloud cost ($${estimatedCloudCost.toFixed(4)}) exceeds task limit ($${task.maxCost})`);
    }

    // Local is always free
    local += 15;
    reasons.push('Local processing is free');

    return { local, cloud, reasons };
  }

  /**
   * Evaluate based on priority
   */
  private evaluatePriority(task: Task): {
    local: number;
    cloud: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    const priority = task.priority ?? 'normal';
    let local = 0;
    let cloud = 0;

    switch (priority) {
      case 'critical':
        cloud += 15;
        reasons.push('Critical priority - cloud for guaranteed availability');
        break;
      case 'high':
        cloud += 5;
        local += 5;
        reasons.push('High priority task');
        break;
      case 'normal':
        local += 10;
        reasons.push('Normal priority - prefer local');
        break;
      case 'low':
        local += 15;
        reasons.push('Low priority - definitely prefer local');
        break;
    }

    return { local, cloud, reasons };
  }

  /**
   * Select best cloud provider
   */
  private selectProvider(task: Task): CloudProvider {
    // Priority order based on cost
    const providers: CloudProvider[] = ['openai', 'anthropic'];
    
    for (const provider of providers) {
      const cost = this.estimateCost(task, provider);
      if (task.maxCost === undefined || cost <= task.maxCost) {
        return provider;
      }
    }

    return 'openai'; // Default fallback
  }

  /**
   * Estimate cost for a task
   */
  private estimateCost(task: Task, provider: CloudProvider): number {
    const tokens = task.estimatedResources?.tokens ?? 1000;
    return (tokens / 1000) * this.providerCosts[provider];
  }

  /**
   * Estimate processing time
   */
  private estimateTime(task: Task, location: 'local' | 'cloud'): number {
    const baseDuration = task.estimatedResources?.duration ?? 100;
    
    if (location === 'local') {
      return baseDuration * 1.2; // Local might be slightly slower
    } else {
      return baseDuration * 0.8 + 100; // Cloud is faster but has network latency
    }
  }

  /**
   * Check if should be local based on current metrics
   */
  shouldBeLocal(metrics: ResourceMetrics): boolean {
    return (
      metrics.cpu.percentage < this.config.cpuThreshold &&
      metrics.memory.percentage < this.config.memoryThreshold &&
      (!metrics.gpu.available || metrics.gpu.percentage < this.config.gpuThreshold)
    );
  }

  /**
   * Get last decision
   */
  getLastDecision(): SchedulingDecision | null {
    return this.lastDecision;
  }

  /**
   * Add decision to history
   */
  private addToHistory(decision: SchedulingDecision): void {
    this.schedulingHistory.push(decision);
    if (this.schedulingHistory.length > this.maxHistorySize) {
      this.schedulingHistory.shift();
    }
  }

  /**
   * Get scheduling statistics
   */
  getStats(): {
    totalScheduled: number;
    localCount: number;
    cloudCount: number;
    localPercentage: number;
    averageConfidence: number;
  } {
    const total = this.schedulingHistory.length;
    const localCount = this.schedulingHistory.filter(d => d.location === 'local').length;
    const cloudCount = total - localCount;
    const avgConfidence = total > 0
      ? this.schedulingHistory.reduce((sum, d) => sum + d.confidence, 0) / total
      : 0;

    return {
      totalScheduled: total,
      localCount,
      cloudCount,
      localPercentage: total > 0 ? (localCount / total) * 100 : 0,
      averageConfidence: avgConfidence
    };
  }

  /**
   * Queue a task for later execution
   */
  enqueue(task: Task): boolean {
    const priority = task.priority ?? 'normal';
    const queue = this.taskQueue.get(priority)!;

    if (queue.length >= this.config.maxQueueSize) {
      return false;
    }

    queue.push({
      task,
      enqueueTime: Date.now(),
      attempts: 0
    });

    return true;
  }

  /**
   * Dequeue next task by priority
   */
  dequeue(): Task | null {
    const priorities: TaskPriority[] = ['critical', 'high', 'normal', 'low'];

    for (const priority of priorities) {
      const queue = this.taskQueue.get(priority)!;
      if (queue.length > 0) {
        const item = queue.shift()!;
        return item.task;
      }
    }

    return null;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    let total = 0;
    this.taskQueue.forEach(queue => {
      total += queue.length;
    });
    return total;
  }

  /**
   * Clear all queues
   */
  clearQueue(): void {
    this.taskQueue.forEach(queue => {
      queue.length = 0;
    });
  }

  /**
   * Get history
   */
  getHistory(limit?: number): SchedulingDecision[] {
    if (limit) {
      return this.schedulingHistory.slice(-limit);
    }
    return [...this.schedulingHistory];
  }

  /**
   * Update thresholds
   */
  updateThresholds(config: Partial<SchedulerConfig>): void {
    if (config.cpuThreshold !== undefined) {
      this.config.cpuThreshold = config.cpuThreshold;
    }
    if (config.memoryThreshold !== undefined) {
      this.config.memoryThreshold = config.memoryThreshold;
    }
    if (config.gpuThreshold !== undefined) {
      this.config.gpuThreshold = config.gpuThreshold;
    }
    if (config.costCeiling !== undefined) {
      this.config.costCeiling = config.costCeiling;
    }
  }
}

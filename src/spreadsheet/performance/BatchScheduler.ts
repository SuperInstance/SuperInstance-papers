/**
 * POLLN Spreadsheet - BatchScheduler
 *
 * Batch update scheduling using requestAnimationFrame.
 * Prevents layout thrashing and ensures smooth 60fps rendering.
 */

export interface BatchTask {
  id: string;
  fn: () => void | Promise<void>;
  priority: number;
  timestamp: number;
}

export interface BatchConfig {
  maxTasksPerFrame: number;
  maxFrameTime: number; // in ms
  enablePriority: boolean;
  enableTimeSlicing: boolean;
}

export type BatchType = 'read' | 'write' | 'mixed';

/**
 * BatchScheduler - Efficient task batching
 *
 * Features:
 * - RAF-based scheduling
 * - Priority queue
 * - Time slicing
 * - Read/write batching
 */
export class BatchScheduler {
  private config: BatchConfig;
  private taskQueue: BatchTask[];
  private scheduled = false;
  private rafId: number | null = null;
  private currentBatch: BatchTask[] = [];

  // Performance metrics
  private totalTasksProcessed = 0;
  private totalBatchesProcessed = 0;
  private avgTasksPerBatch = 0;
  private avgBatchTime = 0;
  private droppedTasks = 0;

  // Read/write batching
  private readTasks: BatchTask[] = [];
  private writeTasks: BatchTask[] = [];
  private currentPhase: 'read' | 'write' = 'read';

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = {
      maxTasksPerFrame: 100,
      maxFrameTime: 14, // Leave 2ms for browser overhead
      enablePriority: true,
      enableTimeSlicing: true,
      ...config,
    };

    this.taskQueue = [];
  }

  /**
   * Schedule a task for batched execution
   */
  schedule(
    id: string,
    fn: () => void | Promise<void>,
    priority = 0,
    batchType: BatchType = 'mixed'
  ): void {
    const task: BatchTask = {
      id,
      fn,
      priority,
      timestamp: Date.now(),
    };

    // Check if task already exists
    const existingIndex = this.taskQueue.findIndex((t) => t.id === id);
    if (existingIndex >= 0) {
      // Update existing task
      this.taskQueue[existingIndex] = task;
      return;
    }

    // Add to appropriate queue
    if (batchType === 'read') {
      this.readTasks.push(task);
    } else if (batchType === 'write') {
      this.writeTasks.push(task);
    } else {
      this.taskQueue.push(task);
    }

    // Sort by priority if enabled
    if (this.config.enablePriority) {
      this.taskQueue.sort((a, b) => b.priority - a.priority);
      this.readTasks.sort((a, b) => b.priority - a.priority);
      this.writeTasks.sort((a, b) => b.priority - a.priority);
    }

    // Schedule batch if not already scheduled
    if (!this.scheduled) {
      this.scheduleBatch();
    }
  }

  /**
   * Unschedule a task
   */
  unschedule(id: string): void {
    this.taskQueue = this.taskQueue.filter((t) => t.id !== id);
    this.readTasks = this.readTasks.filter((t) => t.id !== id);
    this.writeTasks = this.writeTasks.filter((t) => t.id !== id);
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch(): void {
    if (this.scheduled) return;

    this.scheduled = true;
    this.rafId = requestAnimationFrame(() => this.processBatch());
  }

  /**
   * Process batch of tasks
   */
  private async processBatch(): Promise<void> {
    const startTime = performance.now();
    this.currentBatch = [];
    let tasksProcessed = 0;

    // Process read tasks first (avoid layout thrashing)
    this.currentPhase = 'read';
    tasksProcessed += await this.processTasks(this.readTasks, startTime);

    // Process write tasks
    this.currentPhase = 'write';
    tasksProcessed += await this.processTasks(this.writeTasks, startTime);

    // Process mixed tasks
    tasksProcessed += await this.processTasks(this.taskQueue, startTime);

    const endTime = performance.now();
    const batchTime = endTime - startTime;

    // Update metrics
    this.totalTasksProcessed += tasksProcessed;
    this.totalBatchesProcessed++;
    this.avgTasksPerBatch =
      this.avgTasksPerBatch * 0.9 + (tasksProcessed / this.totalBatchesProcessed) * 0.1;
    this.avgBatchTime =
      this.avgBatchTime * 0.9 + batchTime * 0.1;

    // Schedule next batch if tasks remain
    const hasRemainingTasks =
      this.taskQueue.length > 0 ||
      this.readTasks.length > 0 ||
      this.writeTasks.length > 0;

    if (hasRemainingTasks) {
      this.scheduleBatch();
    } else {
      this.scheduled = false;
      this.rafId = null;
    }
  }

  /**
   * Process tasks from a queue
   */
  private async processTasks(
    queue: BatchTask[],
    startTime: number
  ): Promise<number> {
    let processed = 0;
    const remainingTasks = [];

    for (const task of queue) {
      // Check time budget
      const elapsed = performance.now() - startTime;
      if (
        this.config.enableTimeSlicing &&
        elapsed >= this.config.maxFrameTime
      ) {
        remainingTasks.push(task);
        continue;
      }

      // Check task limit
      if (processed >= this.config.maxTasksPerFrame) {
        remainingTasks.push(task);
        continue;
      }

      try {
        await task.fn();
        processed++;
        this.currentBatch.push(task);
      } catch (error) {
        console.error(`Error processing batch task ${task.id}:`, error);
      }
    }

    // Update queue
    queue.length = 0;
    queue.push(...remainingTasks);

    return processed;
  }

  /**
   * Force immediate execution of all pending tasks
   */
  async flush(): Promise<void> {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.scheduled = false;

    while (
      this.taskQueue.length > 0 ||
      this.readTasks.length > 0 ||
      this.writeTasks.length > 0
    ) {
      await this.processBatch();
    }
  }

  /**
   * Get pending task count
   */
  getPendingCount(): number {
    return (
      this.taskQueue.length + this.readTasks.length + this.writeTasks.length
    );
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      totalTasksProcessed: this.totalTasksProcessed,
      totalBatchesProcessed: this.totalBatchesProcessed,
      avgTasksPerBatch: this.avgTasksPerBatch,
      avgBatchTime: this.avgBatchTime,
      pendingTasks: this.getPendingCount(),
      droppedTasks: this.droppedTasks,
      currentBatchSize: this.currentBatch.length,
      currentPhase: this.currentPhase,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.totalTasksProcessed = 0;
    this.totalBatchesProcessed = 0;
    this.avgTasksPerBatch = 0;
    this.avgBatchTime = 0;
    this.droppedTasks = 0;
  }

  /**
   * Clear all pending tasks
   */
  clear(): void {
    this.taskQueue = [];
    this.readTasks = [];
    this.writeTasks = [];

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.scheduled = false;
  }

  /**
   * Destroy scheduler
   */
  destroy(): void {
    this.clear();
    this.currentBatch = [];
  }
}

/**
 * Debounced scheduler for user input
 */
export class DebouncedScheduler {
  private delays: Map<string, number> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private defaultDelay = 300;

  /**
   * Schedule debounced task
   */
  schedule(id: string, fn: () => void, delay?: number): void {
    const actualDelay = delay ?? this.defaultDelay;

    // Clear existing timeout
    const existingTimeout = this.timeouts.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new timeout
    const timeout = setTimeout(() => {
      fn();
      this.timeouts.delete(id);
    }, actualDelay);

    this.timeouts.set(id, timeout);
    this.delays.set(id, actualDelay);
  }

  /**
   * Cancel pending task
   */
  cancel(id: string): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
  }

  /**
   * Execute immediately (cancel pending)
   */
  executeNow(id: string, fn: () => void): void {
    this.cancel(id);
    fn();
  }

  /**
   * Clear all pending tasks
   */
  clear(): void {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
    this.delays.clear();
  }

  /**
   * Check if task is pending
   */
  isPending(id: string): boolean {
    return this.timeouts.has(id);
  }

  /**
   * Get delay for task
   */
  getDelay(id: string): number | undefined {
    return this.delays.get(id);
  }

  /**
   * Set default delay
   */
  setDefaultDelay(delay: number): void {
    this.defaultDelay = delay;
  }
}

/**
 * Throttled scheduler for high-frequency events
 */
export class ThrottledScheduler {
  private lastExecuted: Map<string, number> = new Map();
  private defaultThrottle = 100;

  /**
   * Schedule throttled task
   */
  schedule(id: string, fn: () => void, throttle?: number): void {
    const actualThrottle = throttle ?? this.defaultThrottle;
    const now = Date.now();
    const lastExecuted = this.lastExecuted.get(id) ?? 0;

    if (now - lastExecuted >= actualThrottle) {
      fn();
      this.lastExecuted.set(id, now);
    }
  }

  /**
   * Reset throttle for task
   */
  reset(id: string): void {
    this.lastExecuted.delete(id);
  }

  /**
   * Clear all throttled state
   */
  clear(): void {
    this.lastExecuted.clear();
  }

  /**
   * Set default throttle
   */
  setDefaultThrottle(throttle: number): void {
    this.defaultThrottle = throttle;
  }
}

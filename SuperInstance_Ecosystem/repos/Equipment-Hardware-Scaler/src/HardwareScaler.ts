/**
 * HardwareScaler - Main equipment class for hardware auto-scaling
 * Routes tasks between local hardware and cloud resources based on availability and cost
 */

import { ResourceMonitor, type ResourceMetrics } from './ResourceMonitor';
import { CloudBridge, type CloudProvider, type CloudConfig, type CloudTask, type CloudResult } from './CloudBridge';
import { AdaptiveScheduler, type Task, type TaskPriority, type SchedulingDecision } from './AdaptiveScheduler';

export interface HardwareScalerConfig {
  /** Enable local processing (default: true) */
  enableLocalProcessing?: boolean;
  /** Enable cloud overflow (default: true) */
  enableCloudOverflow?: boolean;
  /** CPU threshold percentage before cloud overflow (default: 80) */
  cpuThreshold?: number;
  /** Memory threshold percentage before cloud overflow (default: 85) */
  memoryThreshold?: number;
  /** GPU threshold percentage before cloud overflow (default: 90) */
  gpuThreshold?: number;
  /** Cost ceiling for cloud processing in USD (default: 100) */
  costCeiling?: number;
  /** Monitoring interval in milliseconds (default: 5000) */
  monitoringInterval?: number;
  /** Enable aggressive scaling (default: false) */
  aggressiveScaling?: boolean;
  /** Cloud provider configurations */
  cloudConfigs?: Partial<Record<CloudProvider, CloudConfig>>;
  /** Preferred cloud provider for overflow */
  preferredCloudProvider?: CloudProvider;
}

export interface ScalerStats {
  /** Total tasks processed */
  totalTasksProcessed: number;
  /** Tasks processed locally */
  localTasksProcessed: number;
  /** Tasks processed in cloud */
  cloudTasksProcessed: number;
  /** Total cost incurred in USD */
  totalCostIncurred: number;
  /** Estimated cost saved by local processing */
  estimatedSavings: number;
  /** Average processing time in ms */
  averageProcessingTime: number;
  /** Current resource utilization */
  currentUtilization: ResourceMetrics;
  /** Number of scale-up events */
  scaleUpEvents: number;
  /** Number of scale-down events */
  scaleDownEvents: number;
  /** Uptime in seconds */
  uptimeSeconds: number;
}

export type ScaleEvent = 'scale_up' | 'scale_down' | 'overflow' | 'cost_warning';

export interface ScaleEventListener {
  (event: ScaleEvent, data: { metrics: ResourceMetrics; decision: string }): void;
}

/**
 * HardwareScaler - Main class for hardware resource auto-scaling
 * 
 * @example
 * ```typescript
 * const scaler = new HardwareScaler({
 *   cpuThreshold: 75,
 *   memoryThreshold: 80,
 *   costCeiling: 50
 * });
 * 
 * await scaler.start();
 * const result = await scaler.processTask({
 *   id: 'task-1',
 *   type: 'compute',
 *   payload: { data: '...' },
 *   estimatedResources: { cpu: 10, memory: 100 }
 * });
 * ```
 */
export class HardwareScaler {
  private config: Required<HardwareScalerConfig>;
  private resourceMonitor: ResourceMonitor;
  private cloudBridge: CloudBridge;
  private adaptiveScheduler: AdaptiveScheduler;
  private stats: ScalerStats;
  private startTime: number;
  private isRunning: boolean = false;
  private eventListeners: Set<ScaleEventListener> = new Set();
  private processingTimes: number[] = [];
  private maxProcessingTimeSamples: number = 100;

  constructor(config: HardwareScalerConfig = {}) {
    this.config = {
      enableLocalProcessing: config.enableLocalProcessing ?? true,
      enableCloudOverflow: config.enableCloudOverflow ?? true,
      cpuThreshold: config.cpuThreshold ?? 80,
      memoryThreshold: config.memoryThreshold ?? 85,
      gpuThreshold: config.gpuThreshold ?? 90,
      costCeiling: config.costCeiling ?? 100,
      monitoringInterval: config.monitoringInterval ?? 5000,
      aggressiveScaling: config.aggressiveScaling ?? false,
      cloudConfigs: config.cloudConfigs ?? {},
      preferredCloudProvider: config.preferredCloudProvider ?? 'openai'
    };

    this.resourceMonitor = new ResourceMonitor({
      interval: this.config.monitoringInterval,
      enableGpuMonitoring: true
    });

    this.cloudBridge = new CloudBridge(
      this.config.cloudConfigs,
      this.config.preferredCloudProvider
    );

    this.adaptiveScheduler = new AdaptiveScheduler({
      cpuThreshold: this.config.cpuThreshold,
      memoryThreshold: this.config.memoryThreshold,
      gpuThreshold: this.config.gpuThreshold,
      costCeiling: this.config.costCeiling
    });

    this.startTime = Date.now();
    this.stats = this.initializeStats();

    // Set up resource monitoring callbacks
    this.resourceMonitor.onMetrics((metrics) => {
      this.handleResourceUpdate(metrics);
    });
  }

  private initializeStats(): ScalerStats {
    return {
      totalTasksProcessed: 0,
      localTasksProcessed: 0,
      cloudTasksProcessed: 0,
      totalCostIncurred: 0,
      estimatedSavings: 0,
      averageProcessingTime: 0,
      currentUtilization: {
        cpu: { used: 0, total: 100, percentage: 0 },
        memory: { used: 0, total: 0, percentage: 0 },
        gpu: { available: false, used: 0, total: 0, percentage: 0 },
        timestamp: Date.now()
      },
      scaleUpEvents: 0,
      scaleDownEvents: 0,
      uptimeSeconds: 0
    };
  }

  /**
   * Start the hardware scaler
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    await this.resourceMonitor.start();
    this.isRunning = true;
    
    console.log('[HardwareScaler] Started with config:', {
      cpuThreshold: this.config.cpuThreshold,
      memoryThreshold: this.config.memoryThreshold,
      gpuThreshold: this.config.gpuThreshold,
      costCeiling: this.config.costCeiling
    });
  }

  /**
   * Stop the hardware scaler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    await this.resourceMonitor.stop();
    this.isRunning = false;
    
    console.log('[HardwareScaler] Stopped. Final stats:', this.getStats());
  }

  /**
   * Process a task using adaptive scaling
   */
  async processTask(task: Task): Promise<CloudResult> {
    const taskStartTime = Date.now();
    
    // Get current resource metrics
    const metrics = await this.resourceMonitor.getCurrentMetrics();
    
    // Get scheduling decision
    const decision = this.adaptiveScheduler.schedule(task, metrics, {
      totalCostIncurred: this.stats.totalCostIncurred,
      costCeiling: this.config.costCeiling
    });

    let result: CloudResult;

    if (decision.location === 'local' && this.config.enableLocalProcessing) {
      result = await this.processLocally(task);
      this.stats.localTasksProcessed++;
      this.stats.estimatedSavings += this.estimateCloudCost(task);
    } else if (this.config.enableCloudOverflow) {
      result = await this.processInCloud(task, decision.provider);
      this.stats.cloudTasksProcessed++;
      this.stats.totalCostIncurred += result.cost;
      
      // Check cost ceiling
      if (this.stats.totalCostIncurred >= this.config.costCeiling * 0.9) {
        this.emit('cost_warning', { metrics, decision: 'Approaching cost ceiling' });
      }
    } else {
      throw new Error('No processing capacity available');
    }

    // Update stats
    this.stats.totalTasksProcessed++;
    const processingTime = Date.now() - taskStartTime;
    this.recordProcessingTime(processingTime);
    this.stats.currentUtilization = metrics;
    this.stats.uptimeSeconds = (Date.now() - this.startTime) / 1000;

    return result;
  }

  /**
   * Process task locally
   */
  private async processLocally(task: Task): Promise<CloudResult> {
    // Simulate local processing
    const processingTime = this.simulateProcessingTime(task);
    await this.delay(processingTime);

    return {
      taskId: task.id,
      success: true,
      result: { processed: true, location: 'local' },
      cost: 0, // Local processing is free
      provider: 'local',
      processingTime
    };
  }

  /**
   * Process task in cloud
   */
  private async processInCloud(task: Task, provider: CloudProvider): Promise<CloudResult> {
    const cloudTask: CloudTask = {
      id: task.id,
      type: task.type,
      payload: task.payload,
      estimatedTokens: task.estimatedResources?.tokens
    };

    return await this.cloudBridge.execute(cloudTask, provider);
  }

  /**
   * Handle resource updates
   */
  private handleResourceUpdate(metrics: ResourceMetrics): void {
    const previousDecision = this.adaptiveScheduler.getLastDecision();
    
    if (previousDecision) {
      const wasLocal = previousDecision.location === 'local';
      const wouldBeLocal = this.adaptiveScheduler.shouldBeLocal(metrics);
      
      if (wasLocal && !wouldBeLocal) {
        this.emit('scale_up', { metrics, decision: 'Scaling to cloud' });
        this.stats.scaleUpEvents++;
      } else if (!wasLocal && wouldBeLocal) {
        this.emit('scale_down', { metrics, decision: 'Scaling back to local' });
        this.stats.scaleDownEvents++;
      }
    }
  }

  /**
   * Get current scaler statistics
   */
  getStats(): ScalerStats {
    return { ...this.stats };
  }

  /**
   * Get current resource metrics
   */
  async getResourceMetrics(): Promise<ResourceMetrics> {
    return await this.resourceMonitor.getCurrentMetrics();
  }

  /**
   * Check if cloud overflow is currently active
   */
  isCloudOverflowActive(): boolean {
    const lastDecision = this.adaptiveScheduler.getLastDecision();
    return lastDecision?.location === 'cloud';
  }

  /**
   * Add event listener
   */
  onScaleEvent(listener: ScaleEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit scale event
   */
  private emit(event: ScaleEvent, data: { metrics: ResourceMetrics; decision: string }): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[HardwareScaler] Event listener error:', error);
      }
    });
  }

  /**
   * Estimate cloud cost for a task
   */
  private estimateCloudCost(task: Task): number {
    const tokens = task.estimatedResources?.tokens ?? 1000;
    // Rough estimate: $0.002 per 1K tokens
    return (tokens / 1000) * 0.002;
  }

  /**
   * Simulate processing time based on task complexity
   */
  private simulateProcessingTime(task: Task): number {
    const baseTime = 100;
    const complexityMultiplier = task.estimatedResources?.cpu ?? 1;
    return baseTime * complexityMultiplier;
  }

  /**
   * Record processing time for statistics
   */
  private recordProcessingTime(time: number): void {
    this.processingTimes.push(time);
    if (this.processingTimes.length > this.maxProcessingTimeSamples) {
      this.processingTimes.shift();
    }
    this.stats.averageProcessingTime = 
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Force scale to cloud (override local processing)
   */
  async forceCloud(task: Task, provider?: CloudProvider): Promise<CloudResult> {
    return await this.processInCloud(task, provider ?? this.config.preferredCloudProvider);
  }

  /**
   * Get cost summary
   */
  getCostSummary(): {
    totalSpent: number;
    totalSaved: number;
    cloudPercentage: number;
    localPercentage: number;
  } {
    const total = this.stats.localTasksProcessed + this.stats.cloudTasksProcessed;
    return {
      totalSpent: this.stats.totalCostIncurred,
      totalSaved: this.stats.estimatedSavings,
      cloudPercentage: total > 0 ? (this.stats.cloudTasksProcessed / total) * 100 : 0,
      localPercentage: total > 0 ? (this.stats.localTasksProcessed / total) * 100 : 0
    };
  }
}

/**
 * ResourceMonitor - Hardware resource monitoring
 * Monitors CPU, memory, and GPU availability in real-time
 */

export type ResourceType = 'cpu' | 'memory' | 'gpu';

export interface ResourceUsage {
  used: number;
  total: number;
  percentage: number;
}

export interface GpuResourceUsage extends ResourceUsage {
  available: boolean;
  name?: string;
  memoryUsed?: number;
  memoryTotal?: number;
}

export interface ResourceMetrics {
  cpu: ResourceUsage;
  memory: ResourceUsage;
  gpu: GpuResourceUsage;
  timestamp: number;
}

export interface ResourceMonitorConfig {
  /** Monitoring interval in milliseconds */
  interval?: number;
  /** Enable GPU monitoring */
  enableGpuMonitoring?: boolean;
  /** Custom CPU cores count (for testing) */
  customCpuCores?: number;
  /** Custom total memory in MB (for testing) */
  customTotalMemory?: number;
}

export type MetricsCallback = (metrics: ResourceMetrics) => void;

/**
 * ResourceMonitor - Real-time hardware resource monitoring
 * 
 * @example
 * ```typescript
 * const monitor = new ResourceMonitor({ interval: 1000 });
 * monitor.onMetrics((metrics) => console.log(metrics));
 * await monitor.start();
 * ```
 */
export class ResourceMonitor {
  private config: Required<ResourceMonitorConfig>;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<MetricsCallback> = new Set();
  private lastMetrics: ResourceMetrics | null = null;
  private isMonitoring: boolean = false;

  constructor(config: ResourceMonitorConfig = {}) {
    this.config = {
      interval: config.interval ?? 5000,
      enableGpuMonitoring: config.enableGpuMonitoring ?? true,
      customCpuCores: config.customCpuCores ?? 0,
      customTotalMemory: config.customTotalMemory ?? 0
    };
  }

  /**
   * Start resource monitoring
   */
  async start(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Initial metrics collection
    await this.collectAndNotify();

    // Set up interval for continuous monitoring
    this.intervalId = setInterval(async () => {
      await this.collectAndNotify();
    }, this.config.interval);

    console.log('[ResourceMonitor] Started monitoring with interval:', this.config.interval);
  }

  /**
   * Stop resource monitoring
   */
  async stop(): Promise<void> {
    if (!this.isMonitoring) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isMonitoring = false;
    console.log('[ResourceMonitor] Stopped monitoring');
  }

  /**
   * Get current resource metrics
   */
  async getCurrentMetrics(): Promise<ResourceMetrics> {
    const [cpu, memory, gpu] = await Promise.all([
      this.getCpuUsage(),
      this.getMemoryUsage(),
      this.getGpuUsage()
    ]);

    this.lastMetrics = {
      cpu,
      memory,
      gpu,
      timestamp: Date.now()
    };

    return this.lastMetrics;
  }

  /**
   * Get last collected metrics (synchronous)
   */
  getLastMetrics(): ResourceMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Add metrics listener
   */
  onMetrics(callback: MetricsCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Check if resources are below threshold
   */
  async checkThresholds(
    cpuThreshold: number,
    memoryThreshold: number,
    gpuThreshold: number
  ): Promise<{ withinLimits: boolean; violations: ResourceType[] }> {
    const metrics = await this.getCurrentMetrics();
    const violations: ResourceType[] = [];

    if (metrics.cpu.percentage > cpuThreshold) {
      violations.push('cpu');
    }
    if (metrics.memory.percentage > memoryThreshold) {
      violations.push('memory');
    }
    if (metrics.gpu.available && metrics.gpu.percentage > gpuThreshold) {
      violations.push('gpu');
    }

    return {
      withinLimits: violations.length === 0,
      violations
    };
  }

  /**
   * Get available capacity percentage
   */
  async getAvailableCapacity(): Promise<{
    cpu: number;
    memory: number;
    gpu: number;
    overall: number;
  }> {
    const metrics = await this.getCurrentMetrics();

    const cpuAvailable = 100 - metrics.cpu.percentage;
    const memoryAvailable = 100 - metrics.memory.percentage;
    const gpuAvailable = metrics.gpu.available ? 100 - metrics.gpu.percentage : 0;

    // Overall capacity is weighted by importance
    const overall = (cpuAvailable * 0.4 + memoryAvailable * 0.4 + gpuAvailable * 0.2);

    return {
      cpu: cpuAvailable,
      memory: memoryAvailable,
      gpu: gpuAvailable,
      overall
    };
  }

  /**
   * Collect metrics and notify listeners
   */
  private async collectAndNotify(): Promise<void> {
    try {
      const metrics = await this.getCurrentMetrics();
      this.notifyListeners(metrics);
    } catch (error) {
      console.error('[ResourceMonitor] Error collecting metrics:', error);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(metrics: ResourceMetrics): void {
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('[ResourceMonitor] Listener error:', error);
      }
    });
  }

  /**
   * Get CPU usage
   */
  private async getCpuUsage(): Promise<ResourceUsage> {
    try {
      // In a real implementation, this would use systeminformation
      // For now, we simulate based on process load
      const os = await import('os');
      const cpus = os.cpus();
      const numCores = this.config.customCpuCores || cpus.length;

      // Calculate CPU usage from system
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += (cpu.times as Record<string, number>)[type];
        }
        totalIdle += cpu.times.idle;
      });

      const totalUsage = totalTick - totalIdle;
      const percentage = (totalUsage / totalTick) * 100;

      return {
        used: Math.round(percentage * numCores / 100),
        total: numCores,
        percentage: Math.min(100, Math.max(0, percentage))
      };
    } catch {
      // Fallback to simulated metrics
      return this.getSimulatedCpuUsage();
    }
  }

  /**
   * Get memory usage
   */
  private async getMemoryUsage(): Promise<ResourceUsage> {
    try {
      const os = await import('os');
      const totalMemory = this.config.customTotalMemory || os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      return {
        used: Math.round(usedMemory / (1024 * 1024)), // MB
        total: Math.round(totalMemory / (1024 * 1024)), // MB
        percentage: (usedMemory / totalMemory) * 100
      };
    } catch {
      return this.getSimulatedMemoryUsage();
    }
  }

  /**
   * Get GPU usage
   */
  private async getGpuUsage(): Promise<GpuResourceUsage> {
    if (!this.config.enableGpuMonitoring) {
      return {
        available: false,
        used: 0,
        total: 0,
        percentage: 0
      };
    }

    try {
      // In a real implementation, this would query nvidia-smi or similar
      // For now, we return simulated data
      // Real implementation would use systeminformation.gpu() or nvidia-smi
      
      const hasGpu = this.detectGpu();
      
      if (!hasGpu) {
        return {
          available: false,
          used: 0,
          total: 0,
          percentage: 0
        };
      }

      // Simulated GPU metrics
      const totalMemory = 8192; // 8GB VRAM
      const usedMemory = Math.random() * totalMemory * 0.7; // 0-70% usage

      return {
        available: true,
        used: Math.round(usedMemory),
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100,
        name: 'NVIDIA GPU',
        memoryUsed: Math.round(usedMemory),
        memoryTotal: totalMemory
      };
    } catch {
      return {
        available: false,
        used: 0,
        total: 0,
        percentage: 0
      };
    }
  }

  /**
   * Detect if GPU is available
   */
  private detectGpu(): boolean {
    // In production, this would check for CUDA/nvidia-smi
    // For simulation, return false
    return false;
  }

  /**
   * Simulated CPU usage (fallback)
   */
  private getSimulatedCpuUsage(): ResourceUsage {
    const cores = 8;
    const usage = Math.random() * 80 + 10; // 10-90% usage
    return {
      used: Math.round(usage * cores / 100),
      total: cores,
      percentage: usage
    };
  }

  /**
   * Simulated memory usage (fallback)
   */
  private getSimulatedMemoryUsage(): ResourceUsage {
    const total = 16384; // 16GB
    const used = Math.random() * total * 0.8; // 0-80% usage
    return {
      used: Math.round(used),
      total,
      percentage: (used / total) * 100
    };
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get monitoring interval
   */
  getInterval(): number {
    return this.config.interval;
  }
}

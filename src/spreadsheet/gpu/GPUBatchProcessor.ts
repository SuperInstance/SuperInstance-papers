/**
 * GPUBatchProcessor.ts - GPU Batch Processing for Cell Updates
 *
 * Handles batch processing of spreadsheet cells on GPU using WebGPU.
 * Falls back to CPU processing if WebGPU is unavailable.
 */

import { getComputeShaders, ComputeShaders } from './ComputeShaders.js';
import { CPUBatchProcessor } from './CPUBatchProcessor.js';

export interface CellData {
  value: number;
  previousValue: number;
  velocity: number;
  acceleration: number;
  timestamp: number;
  flags: number;
}

export interface BatchProcessConfig {
  cellCount: number;
  currentTime: number;
  deltaTime: number;
  decayRate: number;
}

export interface BatchProcessResult {
  cells: CellData[];
  executionTime: number;
  usedGPU: boolean;
  gpuTime?: number;
  throughput?: number; // cells per second
}

export interface PerformanceMetrics {
  gpuAvailable: boolean;
  lastProcessTime: number;
  averageThroughput: number;
  preferredMode: 'GPU' | 'CPU';
}

/**
 * GPU Batch Processor for cell updates
 */
export class GPUBatchProcessor {
  private shaders: ComputeShaders | null = null;
  private cpuFallback: CPUBatchProcessor;
  private useGPU: boolean = true;
  private metrics: PerformanceMetrics;

  constructor() {
    this.cpuFallback = new CPUBatchProcessor();
    this.metrics = {
      gpuAvailable: false,
      lastProcessTime: 0,
      averageThroughput: 0,
      preferredMode: 'CPU',
    };
  }

  /**
   * Initialize GPU processor
   */
  async initialize(): Promise<boolean> {
    try {
      this.shaders = await getComputeShaders();
      this.metrics.gpuAvailable = this.shaders !== null;

      if (this.metrics.gpuAvailable) {
        // Load default shaders
        await this.loadDefaultShaders();
        this.metrics.preferredMode = 'GPU';
      }

      return this.metrics.gpuAvailable;
    } catch (error) {
      console.error('Failed to initialize GPU processor:', error);
      this.metrics.gpuAvailable = false;
      this.metrics.preferredMode = 'CPU';
      return false;
    }
  }

  /**
   * Load default compute shaders
   */
  private async loadDefaultShaders(): Promise<void> {
    if (!this.shaders) {
      return;
    }

    // Load basic cell update shader
    const basicShader = `
      struct CellState {
        value: f32,
        previousValue: f32,
        velocity: f32,
        acceleration: f32,
        timestamp: f32,
        flags: u32,
        _padding: f32,
      }

      struct GlobalConfig {
        cellCount: u32,
        currentTime: f32,
        deltaTime: f32,
        decayRate: f32,
        _padding: f32,
      }

      @group(0) @binding(0)
      var<storage, read> inputCells: array<CellState>;

      @group(0) @binding(1)
      var<storage, read_write> outputCells: array<CellState>;

      @group(0) @binding(2)
      var<uniform> config: GlobalConfig;

      const FLAG_ACTIVE: u32 = 1u;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let cellIndex = global_id.x;

        if (cellIndex >= config.cellCount) {
          return;
        }

        var currentState = inputCells[cellIndex];
        var newState = currentState;

        if ((currentState.flags & FLAG_ACTIVE) == 0u) {
          outputCells[cellIndex] = newState;
          return;
        }

        let deltaTime = config.currentTime - currentState.timestamp;
        if (deltaTime > 0.0) {
          newState.velocity = (currentState.value - currentState.previousValue) / deltaTime;
        }

        if (config.decayRate > 0.0) {
          newState.value = newState.value * (1.0 - config.decayRate * config.deltaTime);
        }

        newState.timestamp = config.currentTime;
        newState.previousValue = currentState.value;

        outputCells[cellIndex] = newState;
      }
    `;

    this.shaders.loadShader('basic_update', basicShader, {
      workgroupSize: [64, 1, 1],
      entryPoint: 'main',
    });
  }

  /**
   * Process batch of cells
   */
  async processBatch(
    cells: CellData[],
    config: BatchProcessConfig,
  ): Promise<BatchProcessResult> {
    const startTime = performance.now();

    // Try GPU first if available and enabled
    if (this.useGPU && this.metrics.gpuAvailable && this.shaders) {
      try {
        const gpuResult = await this.processOnGPU(cells, config);
        const executionTime = performance.now() - startTime;

        this.metrics.lastProcessTime = executionTime;
        this.metrics.averageThroughput = config.cellCount / (executionTime / 1000);

        return {
          ...gpuResult,
          executionTime,
          usedGPU: true,
          throughput: this.metrics.averageThroughput,
        };
      } catch (error) {
        console.error('GPU processing failed, falling back to CPU:', error);
        this.useGPU = false;
      }
    }

    // Fall back to CPU
    const cpuResult = await this.processOnCPU(cells, config);
    const executionTime = performance.now() - startTime;

    this.metrics.lastProcessTime = executionTime;
    this.metrics.averageThroughput = config.cellCount / (executionTime / 1000);

    return {
      ...cpuResult,
      executionTime,
      usedGPU: false,
      throughput: this.metrics.averageThroughput,
    };
  }

  /**
   * Process cells on GPU
   */
  private async processOnGPU(
    cells: CellData[],
    config: BatchProcessConfig,
  ): Promise<{ cells: CellData[]; gpuTime: number }> {
    if (!this.shaders) {
      throw new Error('GPU shaders not initialized');
    }

    // Prepare buffers
    const cellDataSize = 7 * 4; // 7 floats per cell
    const inputBuffer = this.prepareInputBuffer(cells);
    const outputBuffer = this.shaders.createStorageBuffer(cells.length * cellDataSize);
    const configBuffer = this.prepareConfigBuffer(config);

    // Execute shader
    const workgroups = [
      Math.ceil(cells.length / 64),
      1,
      1,
    ];

    const result = await this.shaders.execute(
      'basic_update',
      inputBuffer,
      outputBuffer,
      configBuffer,
      workgroups,
    );

    // Parse results
    const outputCells = this.parseOutputBuffer(result.data, cells.length);

    // Cleanup
    inputBuffer.destroy();
    outputBuffer.destroy();
    configBuffer.destroy();

    return {
      cells: outputCells,
      gpuTime: result.executionTime,
    };
  }

  /**
   * Process cells on CPU
   */
  private async processOnCPU(
    cells: CellData[],
    config: BatchProcessConfig,
  ): Promise<{ cells: CellData[] }> {
    return this.cpuFallback.processBatch(cells, config);
  }

  /**
   * Prepare input buffer from cell data
   */
  private prepareInputBuffer(cells: CellData[]): GPUBuffer {
    if (!this.shaders) {
      throw new Error('GPU shaders not initialized');
    }

    const cellDataSize = 7 * 4; // 7 floats per cell
    const buffer = new ArrayBuffer(cells.length * cellDataSize);
    const view = new Float32Array(buffer);

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const offset = i * 7;
      view[offset + 0] = cell.value;
      view[offset + 1] = cell.previousValue;
      view[offset + 2] = cell.velocity;
      view[offset + 3] = cell.acceleration;
      view[offset + 4] = cell.timestamp;
      view[offset + 5] = cell.flags;
      view[offset + 6] = 0; // padding
    }

    return this.shaders.createBuffer(
      buffer,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    );
  }

  /**
   * Prepare config buffer
   */
  private prepareConfigBuffer(config: BatchProcessConfig): GPUBuffer {
    if (!this.shaders) {
      throw new Error('GPU shaders not initialized');
    }

    const buffer = new ArrayBuffer(5 * 4); // 5 floats
    const view = new Float32Array(buffer);

    view[0] = config.cellCount;
    view[1] = config.currentTime;
    view[2] = config.deltaTime;
    view[3] = config.decayRate;
    view[4] = 0; // padding

    return this.shaders.createBuffer(
      buffer,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
  }

  /**
   * Parse output buffer to cell data
   */
  private parseOutputBuffer(data: ArrayBuffer, count: number): CellData[] {
    const view = new Float32Array(data);
    const cells: CellData[] = [];

    for (let i = 0; i < count; i++) {
      const offset = i * 7;
      cells.push({
        value: view[offset + 0],
        previousValue: view[offset + 1],
        velocity: view[offset + 2],
        acceleration: view[offset + 3],
        timestamp: view[offset + 4],
        flags: view[offset + 5],
      });
    }

    return cells;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Force GPU mode
   */
  forceGPU(enabled: boolean): void {
    this.useGPU = enabled && this.metrics.gpuAvailable;
  }

  /**
   * Check if GPU is available
   */
  isGPUAvailable(): boolean {
    return this.metrics.gpuAvailable;
  }

  /**
   * Get fallback reason
   */
  getFallbackReason(): string {
    if (this.shaders) {
      return this.shaders.getFallbackReason();
    }
    return 'GPU not initialized';
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.shaders) {
      this.shaders.cleanup();
    }
  }
}

/**
 * CPU Batch Processor (fallback)
 */
export class CPUBatchProcessor {
  /**
   * Process batch of cells on CPU
   */
  processBatch(
    cells: CellData[],
    config: BatchProcessConfig,
  ): { cells: CellData[] } {
    const result: CellData[] = [];

    for (const cell of cells) {
      const newCell = { ...cell };

      // Skip inactive cells
      if ((cell.flags & 1) === 0) {
        result.push(newCell);
        continue;
      }

      // Calculate velocity
      const deltaTime = config.currentTime - cell.timestamp;
      if (deltaTime > 0) {
        newCell.velocity = (cell.value - cell.previousValue) / deltaTime;
      }

      // Apply decay
      if (config.decayRate > 0) {
        newCell.value = cell.value * (1 - config.decayRate * config.deltaTime);
      }

      // Update timestamp
      newCell.timestamp = config.currentTime;
      newCell.previousValue = cell.value;

      result.push(newCell);
    }

    return { cells: result };
  }
}

/**
 * Singleton instance
 */
let processorInstance: GPUBatchProcessor | null = null;

export async function getGPUBatchProcessor(): Promise<GPUBatchProcessor> {
  if (!processorInstance) {
    processorInstance = new GPUBatchProcessor();
    await processorInstance.initialize();
  }
  return processorInstance;
}

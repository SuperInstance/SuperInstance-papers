/**
 * GPU Engine - WebGPU Abstraction Layer for POLLN
 *
 * Provides GPU acceleration for:
 * 1. Geometric Tensor Operations (Pythagorean tensors, Wigner-D harmonics)
 * 2. Confidence Cascade Computations (deadband triggers, cascade propagation)
 * 3. Tile Algebra Operations (composition, zone computations)
 * 4. General Tensor Operations (contractions, expansions, transformations)
 *
 * Features:
 * - WebGPU context and device management
 * - WGSL shader compilation and caching
 * - Memory management (buffers, textures)
 * - Pipeline creation and execution
 * - Performance monitoring and benchmarking
 * - Graceful fallback to CPU when GPU unavailable
 */

export interface GPUDeviceInfo {
  name: string;
  vendor: string;
  architecture: string;
  type: 'integrated' | 'discrete' | 'cpu' | 'unknown';
  maxComputeWorkgroupSizeX: number;
  maxComputeWorkgroupSizeY: number;
  maxComputeWorkgroupSizeZ: number;
  maxComputeWorkgroupsPerDimension: number;
  maxBufferSize: number;
  maxTextureDimension1D: number;
  maxTextureDimension2D: number;
  maxTextureDimension3D: number;
}

export interface GPUBufferInfo {
  id: string;
  size: number;
  usage: GPUBufferUsageFlags;
  mapped: boolean;
}

export interface GPUComputePipelineInfo {
  id: string;
  workgroupSize: [number, number, number];
  dispatchSize: [number, number, number];
  shaderModule: GPUShaderModule;
  bindGroupLayout: GPUBindGroupLayout;
  pipeline: GPUComputePipeline;
}

export interface GPUExecutionResult {
  success: boolean;
  executionTime: number;
  memoryUsed: number;
  error?: string;
}

export class GPUEngine {
  private static instance: GPUEngine;
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private context: GPUCanvasContext | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private buffers: Map<string, GPUBuffer> = new Map();
  private pipelines: Map<string, GPUComputePipelineInfo> = new Map();
  private shaderModules: Map<string, GPUShaderModule> = new Map();

  private deviceInfo: GPUDeviceInfo | null = null;
  private isInitialized: boolean = false;
  private hasWebGPU: boolean = false;

  // Performance tracking
  private executionTimes: Map<string, number[]> = new Map();
  private memoryUsage: Map<string, number> = new Map();

  private constructor() {
    this.checkWebGPUSupport();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): GPUEngine {
    if (!GPUEngine.instance) {
      GPUEngine.instance = new GPUEngine();
    }
    return GPUEngine.instance;
  }

  /**
   * Check if WebGPU is supported
   */
  private checkWebGPUSupport(): void {
    this.hasWebGPU = typeof navigator !== 'undefined' &&
                    'gpu' in navigator &&
                    typeof navigator.gpu === 'object' &&
                    navigator.gpu !== null;
  }

  /**
   * Initialize GPU engine
   */
  public async initialize(canvas?: HTMLCanvasElement): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (!this.hasWebGPU) {
      console.warn('WebGPU not supported, falling back to CPU');
      return false;
    }

    try {
      // Request adapter
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
        forceFallbackAdapter: false
      });

      if (!this.adapter) {
        throw new Error('No GPU adapter available');
      }

      // Request device
      this.device = await this.adapter.requestDevice({
        requiredFeatures: ['timestamp-query', 'indirect-first-instance'] as any,
        requiredLimits: {
          maxComputeWorkgroupStorageSize: 16384,
          maxComputeInvocationsPerWorkgroup: 256,
          maxComputeWorkgroupSizeX: 256,
          maxComputeWorkgroupSizeY: 256,
          maxComputeWorkgroupSizeZ: 64
        }
      });

      // Get device info
      this.deviceInfo = await this.getDeviceInfo();

      // Set up canvas context if provided
      if (canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('webgpu');
        if (this.context) {
          const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
          this.context.configure({
            device: this.device,
            format: presentationFormat,
            alphaMode: 'opaque'
          });
        }
      }

      // Set up device lost handler
      this.device.lost.then((info) => {
        console.error(`GPU device lost: ${info.message}`);
        this.isInitialized = false;
        this.device = null;
        this.adapter = null;
        this.buffers.clear();
        this.pipelines.clear();
        this.shaderModules.clear();
      });

      this.isInitialized = true;
      console.log('GPU Engine initialized successfully', this.deviceInfo);
      return true;

    } catch (error) {
      console.error('Failed to initialize GPU Engine:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<GPUDeviceInfo> {
    if (!this.adapter) {
      throw new Error('Adapter not available');
    }

    const info = await this.adapter.requestAdapterInfo();
    const limits = this.adapter.limits;

    return {
      name: info.device || 'Unknown',
      vendor: info.vendor || 'Unknown',
      architecture: info.architecture || 'Unknown',
      type: this.determineGPUType(info),
      maxComputeWorkgroupSizeX: limits.maxComputeWorkgroupSizeX,
      maxComputeWorkgroupSizeY: limits.maxComputeWorkgroupSizeY,
      maxComputeWorkgroupSizeZ: limits.maxComputeWorkgroupSizeZ,
      maxComputeWorkgroupsPerDimension: limits.maxComputeWorkgroupsPerDimension,
      maxBufferSize: limits.maxBufferSize,
      maxTextureDimension1D: limits.maxTextureDimension1D,
      maxTextureDimension2D: limits.maxTextureDimension2D,
      maxTextureDimension3D: limits.maxTextureDimension3D
    };
  }

  /**
   * Determine GPU type from adapter info
   */
  private determineGPUType(info: GPUAdapterInfo): GPUDeviceInfo['type'] {
    const deviceName = (info.device || '').toLowerCase();
    const vendor = (info.vendor || '').toLowerCase();

    if (deviceName.includes('integrated') || vendor.includes('intel')) {
      return 'integrated';
    } else if (vendor.includes('nvidia') || vendor.includes('amd') || vendor.includes('radeon')) {
      return 'discrete';
    } else if (deviceName.includes('cpu') || vendor.includes('llvmpipe')) {
      return 'cpu';
    }

    return 'unknown';
  }

  /**
   * Create a GPU buffer
   */
  public createBuffer(
    id: string,
    size: number,
    usage: GPUBufferUsageFlags,
    data?: ArrayBufferView
  ): GPUBufferInfo {
    if (!this.device) {
      throw new Error('GPU device not initialized');
    }

    const buffer = this.device.createBuffer({
      size,
      usage,
      mappedAtCreation: data !== undefined
    });

    if (data && buffer.mapState === 'mapped') {
      const arrayBuffer = buffer.getMappedRange();
      new (data.constructor as any)(arrayBuffer).set(data);
      buffer.unmap();
    }

    this.buffers.set(id, buffer);

    return {
      id,
      size,
      usage,
      mapped: false
    };
  }

  /**
   * Create a compute pipeline from WGSL source
   */
  public async createComputePipeline(
    id: string,
    wgslSource: string,
    workgroupSize: [number, number, number] = [64, 1, 1],
    entryPoint: string = 'main'
  ): Promise<GPUComputePipelineInfo> {
    if (!this.device) {
      throw new Error('GPU device not initialized');
    }

    // Compile shader module
    const shaderModule = this.device.createShaderModule({
      code: wgslSource
    });

    // Create bind group layout
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' }
        }
      ]
    });

    // Create pipeline layout
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });

    // Create compute pipeline
    const pipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint,
        constants: {
          workgroupSizeX: workgroupSize[0],
          workgroupSizeY: workgroupSize[1],
          workgroupSizeZ: workgroupSize[2]
        }
      }
    });

    const pipelineInfo: GPUComputePipelineInfo = {
      id,
      workgroupSize,
      dispatchSize: [1, 1, 1],
      shaderModule,
      bindGroupLayout,
      pipeline
    };

    this.pipelines.set(id, pipelineInfo);
    this.shaderModules.set(id, shaderModule);

    return pipelineInfo;
  }

  /**
   * Execute a compute pipeline
   */
  public async executePipeline(
    pipelineId: string,
    buffers: Map<number, GPUBuffer>,
    uniformData?: ArrayBufferView,
    dispatchSize?: [number, number, number]
  ): Promise<GPUExecutionResult> {
    if (!this.device) {
      throw new Error('GPU device not initialized');
    }

    const pipelineInfo = this.pipelines.get(pipelineId);
    if (!pipelineInfo) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const startTime = performance.now();

    try {
      // Create command encoder
      const commandEncoder = this.device.createCommandEncoder();

      // Create bind group
      const bindGroupEntries: GPUBindGroupEntry[] = [];

      // Add buffers to bind group
      for (const [binding, buffer] of buffers.entries()) {
        bindGroupEntries.push({
          binding,
          resource: { buffer }
        });
      }

      // Add uniform buffer if provided
      if (uniformData) {
        const uniformBuffer = this.device.createBuffer({
          size: uniformData.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          mappedAtCreation: true
        });

        new (uniformData.constructor as any)(uniformBuffer.getMappedRange()).set(uniformData);
        uniformBuffer.unmap();

        bindGroupEntries.push({
          binding: buffers.size,
          resource: { buffer: uniformBuffer }
        });
      }

      const bindGroup = this.device.createBindGroup({
        layout: pipelineInfo.bindGroupLayout,
        entries: bindGroupEntries
      });

      // Create compute pass
      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(pipelineInfo.pipeline);
      computePass.setBindGroup(0, bindGroup);

      // Dispatch compute work
      const dispatch = dispatchSize || pipelineInfo.dispatchSize;
      computePass.dispatchWorkgroups(dispatch[0], dispatch[1], dispatch[2]);
      computePass.end();

      // Submit commands
      this.device.queue.submit([commandEncoder.finish()]);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Track performance
      if (!this.executionTimes.has(pipelineId)) {
        this.executionTimes.set(pipelineId, []);
      }
      this.executionTimes.get(pipelineId)!.push(executionTime);

      return {
        success: true,
        executionTime,
        memoryUsed: this.calculateMemoryUsage(buffers)
      };

    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        executionTime: endTime - startTime,
        memoryUsed: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate memory usage of buffers
   */
  private calculateMemoryUsage(buffers: Map<number, GPUBuffer>): number {
    let total = 0;
    for (const buffer of buffers.values()) {
      total += buffer.size;
    }
    return total;
  }

  /**
   * Read data from GPU buffer
   */
  public async readBuffer<T extends ArrayBufferView>(
    bufferId: string,
    TypedArrayConstructor: new (buffer: ArrayBuffer) => T
  ): Promise<T> {
    if (!this.device) {
      throw new Error('GPU device not initialized');
    }

    const buffer = this.buffers.get(bufferId);
    if (!buffer) {
      throw new Error(`Buffer ${bufferId} not found`);
    }

    // Create staging buffer
    const stagingBuffer = this.device.createBuffer({
      size: buffer.size,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    // Copy buffer to staging buffer
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(buffer, 0, stagingBuffer, 0, buffer.size);
    this.device.queue.submit([commandEncoder.finish()]);

    // Map staging buffer for reading
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = stagingBuffer.getMappedRange();
    const result = new TypedArrayConstructor(arrayBuffer.slice(0));
    stagingBuffer.unmap();

    return result;
  }

  /**
   * Write data to GPU buffer
   */
  public writeBuffer(
    bufferId: string,
    data: ArrayBufferView,
    offset: number = 0
  ): void {
    if (!this.device) {
      throw new Error('GPU device not initialized');
    }

    const buffer = this.buffers.get(bufferId);
    if (!buffer) {
      throw new Error(`Buffer ${bufferId} not found`);
    }

    this.device.queue.writeBuffer(buffer, offset, data);
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(pipelineId?: string): {
    averageExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    totalExecutions: number;
    totalMemoryUsed: number;
  } {
    if (pipelineId) {
      const times = this.executionTimes.get(pipelineId) || [];
      if (times.length === 0) {
        return {
          averageExecutionTime: 0,
          minExecutionTime: 0,
          maxExecutionTime: 0,
          totalExecutions: 0,
          totalMemoryUsed: 0
        };
      }

      const sum = times.reduce((a, b) => a + b, 0);
      const avg = sum / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      return {
        averageExecutionTime: avg,
        minExecutionTime: min,
        maxExecutionTime: max,
        totalExecutions: times.length,
        totalMemoryUsed: this.memoryUsage.get(pipelineId) || 0
      };
    }

    // Aggregate all pipelines
    let totalExecutions = 0;
    let totalTime = 0;
    let totalMemory = 0;
    let minTime = Infinity;
    let maxTime = 0;

    for (const [id, times] of this.executionTimes.entries()) {
      totalExecutions += times.length;
      totalTime += times.reduce((a, b) => a + b, 0);
      totalMemory += this.memoryUsage.get(id) || 0;

      const pipelineMin = Math.min(...times);
      const pipelineMax = Math.max(...times);

      if (pipelineMin < minTime) minTime = pipelineMin;
      if (pipelineMax > maxTime) maxTime = pipelineMax;
    }

    const avgTime = totalExecutions > 0 ? totalTime / totalExecutions : 0;

    return {
      averageExecutionTime: avgTime,
      minExecutionTime: minTime === Infinity ? 0 : minTime,
      maxExecutionTime: maxTime,
      totalExecutions,
      totalMemoryUsed: totalMemory
    };
  }

  /**
   * Check if GPU is available
   */
  public isGPUAvailable(): boolean {
    return this.isInitialized && this.device !== null;
  }

  /**
   * Get device information
   */
  public getDeviceInfo(): GPUDeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.buffers.clear();
    this.pipelines.clear();
    this.shaderModules.clear();
    this.executionTimes.clear();
    this.memoryUsage.clear();

    this.device = null;
    this.adapter = null;
    this.context = null;
    this.canvas = null;
    this.isInitialized = false;
  }

  /**
   * Get WebGPU support status
   */
  public getWebGPUSupport(): boolean {
    return this.hasWebGPU;
  }
}
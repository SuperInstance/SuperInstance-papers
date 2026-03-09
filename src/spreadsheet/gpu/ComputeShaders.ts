/**
 * ComputeShaders.ts - WebGPU Compute Shader Wrapper
 *
 * Provides WebGPU compute shader functionality for batch cell updates.
 * Handles device initialization, shader loading, pipeline creation, and execution.
 */

export interface ComputeShaderConfig {
  workgroupSize: [number, number, number];
  entryPoint: string;
}

export interface BufferBinding {
  buffer: GPUBuffer;
  offset?: number;
  size?: number;
}

export interface ComputeResult {
  data: ArrayBuffer;
  executionTime: number;
  gpuTime?: number;
}

/**
 * WebGPU compute shader manager
 */
export class ComputeShaders {
  private device: GPUDevice | null = null;
  private queue: GPUQueue | null = null;
  private pipelines: Map<string, GPUComputePipeline> = new Map();
  private isSupported: boolean = false;
  private fallbackReason: string = '';

  /**
   * Initialize WebGPU device
   */
  async initialize(): Promise<boolean> {
    if (!navigator.gpu) {
      this.fallbackReason = 'WebGPU not supported by browser';
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        this.fallbackReason = 'No GPU adapter found';
        return false;
      }

      this.device = await adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxBufferSize: adapter.limits.maxBufferSize,
          maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
        },
      });

      if (!this.device) {
        this.fallbackReason = 'Failed to create GPU device';
        return false;
      }

      this.queue = this.device.queue;
      this.isSupported = true;
      return true;
    } catch (error) {
      this.fallbackReason = `WebGPU initialization failed: ${error}`;
      this.isSupported = false;
      return false;
    }
  }

  /**
   * Check if WebGPU is available
   */
  isAvailable(): boolean {
    return this.isSupported;
  }

  /**
   * Get fallback reason if not available
   */
  getFallbackReason(): string {
    return this.fallbackReason;
  }

  /**
   * Load and compile a compute shader
   */
  loadShader(name: string, wgslCode: string, config: ComputeShaderConfig): boolean {
    if (!this.device) {
      throw new Error('WebGPU not initialized');
    }

    try {
      const shaderModule = this.device.createShaderModule({
        code: wgslCode,
        label: `${name}_shader`,
      });

      const bindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'read-only-storage' },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'storage' },
          },
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'uniform' },
          },
        ],
      });

      const pipelineLayout = this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      });

      const pipeline = this.device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
          module: shaderModule,
          entryPoint: config.entryPoint,
        },
        label: `${name}_pipeline`,
      });

      this.pipelines.set(name, pipeline);
      return true;
    } catch (error) {
      console.error(`Failed to load shader ${name}:`, error);
      return false;
    }
  }

  /**
   * Create a GPU buffer
   */
  createBuffer(data: ArrayBuffer, usage: GPUBufferUsageFlags): GPUBuffer {
    if (!this.device) {
      throw new Error('WebGPU not initialized');
    }

    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: usage,
      mappedAtCreation: true,
    });

    new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data));
    buffer.unmap();

    return buffer;
  }

  /**
   * Create a storage buffer for output
   */
  createStorageBuffer(size: number): GPUBuffer {
    if (!this.device) {
      throw new Error('WebGPU not initialized');
    }

    return this.device.createBuffer({
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
  }

  /**
   * Execute a compute shader
   */
  async execute(
    pipelineName: string,
    inputBuffer: GPUBuffer,
    outputBuffer: GPUBuffer,
    configBuffer: GPUBuffer,
    workgroups: [number, number, number],
  ): Promise<ComputeResult> {
    if (!this.device || !this.queue) {
      throw new Error('WebGPU not initialized');
    }

    const pipeline = this.pipelines.get(pipelineName);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineName} not found`);
    }

    const startTime = performance.now();

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: configBuffer } },
      ],
    });

    // Create staging buffer for reading back results
    const stagingBuffer = this.device.createBuffer({
      size: outputBuffer.size,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Encode commands
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(...workgroups);
    passEncoder.end();

    // Copy output to staging buffer
    commandEncoder.copyBufferToBuffer(
      outputBuffer,
      0,
      stagingBuffer,
      0,
      stagingBuffer.size,
    );

    // Submit commands
    this.queue.submit([commandEncoder.finish()]);

    // Wait for completion
    await this.queue.onSubmittedWorkDone();

    // Map staging buffer and read results
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const resultData = stagingBuffer.getMappedRange().slice(0);
    stagingBuffer.unmap();

    const executionTime = performance.now() - startTime;

    // Cleanup staging buffer
    stagingBuffer.destroy();

    return {
      data: resultData,
      executionTime,
    };
  }

  /**
   * Execute shader and get GPU timing info
   */
  async executeWithTiming(
    pipelineName: string,
    inputBuffer: GPUBuffer,
    outputBuffer: GPUBuffer,
    configBuffer: GPUBuffer,
    workgroups: [number, number, number],
  ): Promise<ComputeResult> {
    // Basic timing implementation
    // For accurate GPU timing, you'd need timestamp queries
    return this.execute(pipelineName, inputBuffer, outputBuffer, configBuffer, workgroups);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.pipelines.forEach((pipeline) => {
      // Pipeline will be garbage collected
    });
    this.pipelines.clear();

    if (this.device) {
      this.device.destroy();
      this.device = null;
      this.queue = null;
    }

    this.isSupported = false;
  }

  /**
   * Get device info for debugging
   */
  getDeviceInfo(): string {
    if (!this.device) {
      return 'WebGPU not initialized';
    }

    const adapterInfo = this.device.adapter;
    return `WebGPU Device: ${adapterInfo.vendor} ${adapterInfo.architecture}`;
  }

  /**
   * Get performance hints
   */
  getPerformanceHints(): string[] {
    const hints: string[] = [];

    if (!this.device) {
      return hints;
    }

    const limits = this.device.limits;
    hints.push(`Max buffer size: ${(limits.maxBufferSize / 1024 / 1024).toFixed(2)} MB`);
    hints.push(`Max storage buffer binding: ${(limits.maxStorageBufferBindingSize / 1024 / 1024).toFixed(2)} MB`);
    hints.push(`Max compute workgroups per dimension: ${limits.maxComputeWorkgroupsPerDimension}`);
    hints.push(`Max compute invocations per workgroup: ${limits.maxComputeInvocationsPerWorkgroup}`);

    return hints;
  }
}

/**
 * Singleton instance
 */
let shaderInstance: ComputeShaders | null = null;

export async function getComputeShaders(): Promise<ComputeShaders | null> {
  if (!shaderInstance) {
    shaderInstance = new ComputeShaders();
    const initialized = await shaderInstance.initialize();
    if (!initialized) {
      shaderInstance = null;
    }
  }
  return shaderInstance;
}

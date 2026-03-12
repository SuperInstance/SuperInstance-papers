/**
 * WebGPU Manager - Handles GPU context creation and fallback chain
 * Provides WebGPU → WebGL → CPU fallback for maximum compatibility
 */

export interface GPUAdapter {
  type: 'webgpu' | 'webgl' | 'cpu';
  device?: GPUDevice;
  adapter?: GPUAdapter;
  gl?: WebGL2RenderingContext;
}

export interface GPUCapabilities {
  maxComputeWorkgroupSizeX: number;
  maxComputeWorkgroupSizeY: number;
  maxComputeWorkgroupSizeZ: number;
  maxStorageBufferBindingSize: number;
  maxComputeInvocationsPerWorkgroup: number;
}

export class WebGPUManager {
  private adapter: GPUAdapter | null = null;
  private capabilities: GPUCapabilities | null = null;
  private shaderModules: Map<string, GPUShaderModule> = new Map();
  private pipelines: Map<string, GPUComputePipeline> = new Map();

  /**
   * Initialize GPU with fallback chain
   */
  async initialize(): Promise<GPUAdapter> {
    // Try WebGPU first
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter({
          powerPreference: 'high-performance'
        });

        if (adapter) {
          const device = await adapter.requestDevice({
            requiredFeatures: ['shader-f16'],
            requiredLimits: {
              maxStorageBufferBindingSize: 128 * 1024 * 1024, // 128MB
              maxComputeWorkgroupSizeX: 256,
              maxComputeWorkgroupSizeY: 256,
              maxComputeWorkgroupSizeZ: 64,
              maxComputeInvocationsPerWorkgroup: 256
            }
          });

          this.adapter = {
            type: 'webgpu',
            device,
            adapter: adapter as unknown as GPUAdapter
          };

          this.capabilities = {
            maxComputeWorkgroupSizeX: device.limits.maxComputeWorkgroupSizeX,
            maxComputeWorkgroupSizeY: device.limits.maxComputeWorkgroupSizeY,
            maxComputeWorkgroupSizeZ: device.limits.maxComputeWorkgroupSizeZ,
            maxStorageBufferBindingSize: device.limits.maxStorageBufferBindingSize,
            maxComputeInvocationsPerWorkgroup: device.limits.maxComputeInvocationsPerWorkgroup
          };

          console.log('WebGPU initialized successfully');
          return this.adapter;
        }
      } catch (error) {
        console.warn('WebGPU initialization failed:', error);
      }
    }

    // Try WebGL2 as fallback
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2-compute');

        if (!gl) {
          console.warn('WebGL2 compute not supported');
        } else {
          this.adapter = {
            type: 'webgl',
            gl: gl as WebGL2RenderingContext
          };
          console.log('WebGL2 initialized as fallback');
          return this.adapter;
        }
      } catch (error) {
        console.warn('WebGL2 initialization failed:', error);
      }
    }

    // CPU fallback
    this.adapter = { type: 'cpu' };
    console.log('Falling back to CPU implementation');
    return this.adapter;
  }

  /**
   * Get current GPU adapter
   */
  getAdapter(): GPUAdapter | null {
    return this.adapter;
  }

  /**
   * Get GPU capabilities
   */
  getCapabilities(): GPUCapabilities | null {
    return this.capabilities;
  }

  /**
   * Create shader module from WGSL source
   */
  async createShaderModule(name: string, wgslSource: string): Promise<GPUShaderModule | null> {
    if (!this.adapter || this.adapter.type !== 'webgpu' || !this.adapter.device) {
      return null;
    }

    try {
      const module = this.adapter.device.createShaderModule({
        code: wgslSource,
        label: name
      });

      // Verify shader compilation
      const compilationInfo = await module.getCompilationInfo();
      if (compilationInfo.messages.length > 0) {
        compilationInfo.messages.forEach(msg => {
          console.error(`Shader compilation ${msg.type}:`, msg.message);
        });
      }

      this.shaderModules.set(name, module);
      return module;
    } catch (error) {
      console.error('Failed to create shader module:', error);
      return null;
    }
  }

  /**
   * Create compute pipeline
   */
  async createComputePipeline(
    name: string,
    shaderModule: GPUShaderModule,
    entryPoint = 'main',
    bindGroupLayouts?: GPUBindGroupLayout[]
  ): Promise<GPUComputePipeline | null> {
    if (!this.adapter || this.adapter.type !== 'webgpu' || !this.adapter.device) {
      return null;
    }

    try {
      const pipeline = this.adapter.device.createComputePipeline({
        layout: this.adapter.device.createPipelineLayout({
          bindGroupLayouts: bindGroupLayouts || []
        }),
        compute: {
          module: shaderModule,
          entryPoint
        },
        label: name
      });

      this.pipelines.set(name, pipeline);
      return pipeline;
    } catch (error) {
      console.error('Failed to create compute pipeline:', error);
      return null;
    }
  }

  /**
   * Create GPU buffer
   */
  createBuffer(
    usage: GPUBufferUsageFlags,
    size: number,
    data?: ArrayBuffer | ArrayBufferView,
    mappedAtCreation = false
  ): GPUBuffer | null {
    if (!this.adapter || this.adapter.type !== 'webgpu' || !this.adapter.device) {
      return null;
    }

    try {
      return this.adapter.device.createBuffer({
        size: Math.ceil(size / 4) * 4, // Align to 4 bytes
        usage,
        mappedAtCreation,
        label: `buffer_${Date.now()}`
      });
    } catch (error) {
      console.error('Failed to create buffer:', error);
      return null;
    }
  }

  /**
   * Write data to buffer
   */
  writeBuffer(buffer: GPUBuffer, data: ArrayBuffer | ArrayBufferView, offset = 0): void {
    if (!this.adapter || this.adapter.type !== 'webgpu' || !this.adapter.device) {
      return;
    }

    this.adapter.device.queue.writeBuffer(buffer, offset, data);
  }

  /**
   * Read data from buffer
   */
  async readBuffer(buffer: GPUBuffer, size: number): Promise<ArrayBuffer> {
    if (!this.adapter || this.adapter.type !== 'webgpu' || !this.adapter.device) {
      throw new Error('WebGPU not available');
    }

    const readBuffer = this.adapter.device.createBuffer({
      size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    const commandEncoder = this.adapter.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, size);
    this.adapter.device.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const data = readBuffer.getMappedRange().slice(0);
    readBuffer.unmap();
    readBuffer.destroy();

    return data;
  }

  /**
   * Create bind group
   */
  createBindGroup(
    layout: GPUBindGroupLayout,
    entries: GPUBindGroupEntry[]
  ): GPUBindGroup | null {
    if (!this.adapter || this.adapter.type !== 'webgpu' || !this.adapter.device) {
      return null;
    }

    try {
      return this.adapter.device.createBindGroup({
        layout,
        entries,
        label: `bindgroup_${Date.now()}`
      });
    } catch (error) {
      console.error('Failed to create bind group:', error);
      return null;
    }
  }

  /**
   * Submit compute pass
   */
  submitComputePass(
    pipeline: GPUComputePipeline,
    bindGroups: GPUBindGroup[],
    dispatchSize: [number, number, number],
    buffers?: GPUBuffer[]
  ): void {
    if (!this.adapter || this.adapter.type !== 'webgpu' || !this.adapter.device) {
      return;
    }

    const commandEncoder = this.adapter.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass({
      label: `compute_${Date.now()}`
    });

    passEncoder.setPipeline(pipeline);
    bindGroups.forEach((bg, index) => {
      passEncoder.setBindGroup(index, bg);
    });
    passEncoder.dispatchWorkgroups(...dispatchSize);
    passEncoder.end();

    this.adapter.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Cleanup GPU resources
   */
  destroy(): void {
    this.shaderModules.forEach(module => module.destroy());
    this.pipelines.forEach(pipeline => pipeline.destroy());
    this.shaderModules.clear();
    this.pipelines.clear();
  }
}
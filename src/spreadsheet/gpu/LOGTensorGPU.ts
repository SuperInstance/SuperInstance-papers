/**
 * LOG-Tensor GPU Implementation
 * GPU-accelerated operations for Pythagorean geometric tensors
 * Supports compression, decompression, and batch operations
 */

import { WebGPUManager } from './WebGPUManager';
import { LOGTensor, TensorCompressionType } from '../LOGTensor';

export interface GPUTensorOperation {
  name: string;
  shaderEntry: string;
  dispatchSize: [number, number, number];
}

export interface TensorGPUData {
  buffer: GPUBuffer;
  dimensions: [number, number, number];
  components: number;
  size: number;
}

export class LOGTensorGPU {
  private gpuManager: WebGPUManager;
  private tensorCache: Map<string, TensorGPUData> = new Map();
  private pipelineCache: Map<string, GPUComputePipeline> = new Map();

  constructor(gpuManager: WebGPUManager) {
    this.gpuManager = gpuManager;
  }

  /**
   * Initialize GPU tensor operations
   */
  async initialize(): Promise<boolean> {
    const adapter = this.gpuManager.getAdapter();
    if (!adapter || adapter.type !== 'webgpu') {
      console.warn('WebGPU not available for LOG-Tensor operations');
      return false;
    }

    // Load shader module
    const shaderSource = await this.loadShaderSource();
    const shaderModule = await this.gpuManager.createShaderModule('logtensor', shaderSource);

    if (!shaderModule) {
      throw new Error('Failed to create LOG-Tensor shader module');
    }

    // Create bind group layouts
    const bindGroupLayout = await this.createBindGroupLayout();

    // Create pipelines for each operation
    await this.createComputePipeline('compress', shaderModule, 'compress_main', bindGroupLayout);
    await this.createComputePipeline('decompress', shaderModule, 'decompress_main', bindGroupLayout);
    await this.createComputePipeline('batch', shaderModule, 'batch_process', bindGroupLayout);
    await this.createComputePipeline('add', shaderModule, 'tensor_add', bindGroupLayout);
    await this.createComputePipeline('multiply', shaderModule, 'tensor_multiply', bindGroupLayout);

    return true;
  }

  /**
   * Upload tensor data to GPU
   */
  async uploadTensor(tensor: LOGTensor, name: string): Promise<TensorGPUData | null> {
    const adapter = this.gpuManager.getAdapter();
    if (!adapter || adapter.type !== 'webgpu') {
      return null;
    }

    // Convert tensor data to Float32Array
    const data = tensor.toFloat32Array();
    const size = data.byteLength;

    // Create GPU buffer
    const buffer = this.gpuManager.createBuffer(
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      size,
      data
    );

    if (!buffer) {
      throw new Error('Failed to create GPU buffer');
    }

    const gpuData: TensorGPUData = {
      buffer,
      dimensions: tensor.shape,
      components: tensor.components || 4,
      size
    };

    this.tensorCache.set(name, gpuData);
    return gpuData;
  }

  /**
   * Download tensor data from GPU
   */
  async downloadTensor(name: string): Promise<Float32Array | null> {
    const gpuData = this.tensorCache.get(name);
    if (!gpuData) {
      return null;
    }

    const bufferData = await this.gpuManager.readBuffer(gpuData.buffer, gpuData.size);
    return new Float32Array(bufferData);
  }

  /**
   * Compress tensor on GPU
   */
  async compressTensor(
    inputName: string,
    outputName: string,
    compressionType: TensorCompressionType = 'geometric',
    quality: number = 0.8,
    threshold: number = 0.01
  ): Promise<boolean> {
    const inputData = this.tensorCache.get(inputName);
    if (!inputData) {
      throw new Error(`Input tensor '${inputName}' not found`);
    }

    // Create output buffer
    const outputBuffer = this.gpuManager.createBuffer(
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      inputData.size
    );

    if (!outputBuffer) {
      throw new Error('Failed to create output buffer');
    }

    // Set up uniforms
    const dimensions = new Uint32Array([
      inputData.dimensions[0],
      inputData.dimensions[1],
      inputData.dimensions[2],
      inputData.components
    ]);

    const params = new Float32Array([
      threshold,
      quality,
      compressionType === 'lossless' ? 0 : compressionType === 'lossy' ? 1 : 2,
      0 // padding
    ]);

    const dimensionsBuffer = this.gpuManager.createBuffer(
      GPUBufferUsage.UNIFORM,
      dimensions.byteLength,
      dimensions
    );

    const paramsBuffer = this.gpuManager.createBuffer(
      GPUBufferUsage.UNIFORM,
      params.byteLength,
      params
    );

    if (!dimensionsBuffer || !paramsBuffer) {
      throw new Error('Failed to create uniform buffers');
    }

    // Create bind group
    const pipeline = this.pipelineCache.get('compress');
    if (!pipeline) {
      throw new Error('Compress pipeline not found');
    }

    const bindGroupLayout = pipeline.getBindGroupLayout(0);
    const bindGroup = this.gpuManager.createBindGroup(bindGroupLayout, [
      { binding: 0, resource: { buffer: inputData.buffer } },
      { binding: 1, resource: { buffer: outputBuffer } },
      { binding: 2, resource: { buffer: dimensionsBuffer } },
      { binding: 3, resource: { buffer: paramsBuffer } }
    ]);

    if (!bindGroup) {
      throw new Error('Failed to create bind group');
    }

    // Dispatch compute
    const dispatchSize: [number, number, number] = [
      Math.ceil(inputData.dimensions[0] / 8),
      Math.ceil(inputData.dimensions[1] / 8),
      Math.ceil(inputData.dimensions[2] / 8)
    ];

    this.gpuManager.submitComputePass(
      pipeline,
      [bindGroup],
      dispatchSize,
      [inputData.buffer, outputBuffer, dimensionsBuffer, paramsBuffer]
    );

    // Store output
    const outputData: TensorGPUData = {
      buffer: outputBuffer,
      dimensions: inputData.dimensions,
      components: inputData.components,
      size: inputData.size
    };

    this.tensorCache.set(outputName, outputData);
    return true;
  }

  /**
   * Batch process multiple tensors
   */
  async batchProcess(
    inputNames: string[],
    outputNames: string[],
    operation: 'rotate' | 'scale' | 'translate' = 'rotate'
  ): Promise<boolean> {
    if (inputNames.length !== outputNames.length) {
      throw new Error('Input and output names must match');
    }

    // Process each tensor in the batch
    for (let i = 0; i < inputNames.length; i++) {
      const inputData = this.tensorCache.get(inputNames[i]);
      if (!inputData) {
        throw new Error(`Input tensor '${inputNames[i]}' not found`);
      }

      // Create output buffer (reuse input dimensions)
      const outputBuffer = this.gpuManager.createBuffer(
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        inputData.size
      );

      if (!outputBuffer) {
        throw new Error('Failed to create output buffer');
      }

      // Set up dimensions
      const dimensions = new Uint32Array([
        inputData.dimensions[0],
        inputData.dimensions[1],
        inputData.dimensions[2],
        inputData.components
      ]);

      const dimensionsBuffer = this.gpuManager.createBuffer(
        GPUBufferUsage.UNIFORM,
        dimensions.byteLength,
        dimensions
      );

      if (!dimensionsBuffer) {
        throw new Error('Failed to create uniform buffer');
      }

      // Get pipeline
      const pipeline = this.pipelineCache.get('batch');
      if (!pipeline) {
        throw new Error('Batch pipeline not found');
      }

      // Create bind group
      const bindGroupLayout = pipeline.getBindGroupLayout(0);
      const bindGroup = this.gpuManager.createBindGroup(bindGroupLayout, [
        { binding: 0, resource: { buffer: inputData.buffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: dimensionsBuffer } }
      ]);

      if (!bindGroup) {
        throw new Error('Failed to create bind group');
      }

      // Dispatch compute
      const totalElements = inputData.dimensions[0] * inputData.dimensions[1] * inputData.dimensions[2];
      const workgroupSize = 64;
      const dispatchX = Math.ceil(totalElements / workgroupSize);

      this.gpuManager.submitComputePass(
        pipeline,
        [bindGroup],
        [dispatchX, inputNames.length, 1],
        [inputData.buffer, outputBuffer, dimensionsBuffer]
      );

      // Store output
      const outputData: TensorGPUData = {
        buffer: outputBuffer,
        dimensions: inputData.dimensions,
        components: inputData.components,
        size: inputData.size
      };

      this.tensorCache.set(outputNames[i], outputData);
    }

    return true;
  }

  /**
   * Perform tensor arithmetic
   */
  async tensorOperation(
    tensor1Name: string,
    tensor2Name: string,
    outputName: string,
    operation: 'add' | 'multiply'
  ): Promise<boolean> {
    const tensor1 = this.tensorCache.get(tensor1Name);
    const tensor2 = this.tensorCache.get(tensor2Name);

    if (!tensor1 || !tensor2) {
      throw new Error('Input tensors not found');
    }

    if (tensor1.size !== tensor2.size) {
      throw new Error('Tensors must have same size for arithmetic');
    }

    // Create output buffer
    const outputBuffer = this.gpuManager.createBuffer(
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      tensor1.size
    );

    if (!outputBuffer) {
      throw new Error('Failed to create output buffer');
    }

    // Get pipeline
    const pipeline = this.pipelineCache.get(operation);
    if (!pipeline) {
      throw new Error(`${operation} pipeline not found`);
    }

    // Create bind group
    const bindGroupLayout = pipeline.getBindGroupLayout(0);
    const bindGroup = this.gpuManager.createBindGroup(bindGroupLayout, [
      { binding: 0, resource: { buffer: tensor1.buffer } },
      { binding: 1, resource: { buffer: tensor2.buffer } },
      { binding: 2, resource: { buffer: outputBuffer } }
    ]);

    if (!bindGroup) {
      throw new Error('Failed to create bind group');
    }

    // Dispatch compute
    const totalElements = tensor1.dimensions[0] * tensor1.dimensions[1] * tensor1.dimensions[2];
    const workgroupSize = 64;
    const dispatchX = Math.ceil(totalElements / workgroupSize);

    this.gpuManager.submitComputePass(
      pipeline,
      [bindGroup],
      [dispatchX, 1, 1],
      [tensor1.buffer, tensor2.buffer, outputBuffer]
    );

    // Store output
    const outputData: TensorGPUData = {
      buffer: outputBuffer,
      dimensions: tensor1.dimensions,
      components: tensor1.components,
      size: tensor1.size
    };

    this.tensorCache.set(outputName, outputData);
    return true;
  }

  /**
   * Benchmark GPU operations
   */
  async benchmark(iterations = 100): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    // Benchmark compression
    const compressStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.compressTensor('benchmark_input', 'benchmark_temp', 'geometric');
    }
    const compressTime = performance.now() - compressStart;
    results.set('compress_ms', compressTime / iterations);

    // Benchmark batch processing
    const batchStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.batchProcess(['benchmark_input'], ['benchmark_temp'], 'rotate');
    }
    const batchTime = performance.now() - batchStart;
    results.set('batch_ms', batchTime / iterations);

    // Benchmark tensor arithmetic
    const arithmeticStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.tensorOperation('benchmark_input1', 'benchmark_input2', 'benchmark_temp', 'add');
    }
    const arithmeticTime = performance.now() - arithmeticStart;
    results.set('arithmetic_ms', arithmeticTime / iterations);

    return results;
  }

  /**
   * Cleanup GPU resources
   */
  cleanup(): void {
    this.tensorCache.forEach(data => {
      data.buffer.destroy();
    });
    this.tensorCache.clear();
    this.pipelineCache.clear();
  }

  /**
   * Load WGSL shader source
   */
  private async loadShaderSource(): Promise<string> {
    // In production, this would load from file
    // For now, return hardcoded shader
    return require('./shaders/logtensor.wgsl');
  }

  /**
   * Create bind group layout for tensor operations
   */
  private async createBindGroupLayout(): Promise<GPUBindGroupLayout> {
    const adapter = this.gpuManager.getAdapter();
    if (!adapter || adapter.type !== 'webgpu' || !adapter.device) {
      throw new Error('WebGPU not available');
    }

    return adapter.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' }
        }
      ]
    });
  }

  /**
   * Create compute pipeline
   */
  private async createComputePipeline(
    name: string,
    shaderModule: GPUShaderModule,
    entryPoint: string,
    bindGroupLayout: GPUBindGroupLayout
  ): Promise<void> {
    const pipeline = await this.gpuManager.createComputePipeline(
      name,
      shaderModule,
      entryPoint,
      [bindGroupLayout]
    );

    if (!pipeline) {
      throw new Error(`Failed to create ${name} pipeline`);
    }

    this.pipelineCache.set(name, pipeline);
  }
}
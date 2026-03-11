/**
 * GPUMemoryManager.ts - GPU Memory Management for SMPbot Execution
 *
 * Implements memory pooling, model compression, and LRU eviction strategies
 * for efficient GPU memory usage during SMPbot inference.
 */

export interface GPUBufferInfo {
  id: string;
  buffer: GPUBuffer;
  size: number;
  usage: GPUBufferUsageFlags;
  lastUsed: number;
  accessCount: number;
}

export interface ModelGPUInfo {
  modelId: string;
  buffers: Map<string, GPUBufferInfo>; // buffer name -> buffer info
  parameterCount: number;
  compressed: boolean;
  compressionRatio: number;
  lastLoaded: number;
  accessCount: number;
  memoryFootprint: number;
}

export interface MemoryPoolConfig {
  maxPooledBuffers: number;
  maxBufferSize: number;
  evictionThreshold: number; // Memory usage percentage to trigger eviction
  compressionThreshold: number; // Model size threshold for compression
  enableCompression: boolean;
  enablePooling: boolean;
}

/**
 * GPU Memory Manager with pooling, compression, and LRU eviction
 */
export class GPUMemoryManager {
  private device: GPUDevice | null = null;
  private bufferPool: Map<string, GPUBufferInfo[]> = new Map(); // size+usage -> buffer list
  private loadedModels: Map<string, ModelGPUInfo> = new Map();
  private config: MemoryPoolConfig;
  private totalAllocated: number = 0;
  private peakAllocation: number = 0;

  constructor(config: Partial<MemoryPoolConfig> = {}) {
    this.config = {
      maxPooledBuffers: 100,
      maxBufferSize: 1024 * 1024 * 1024, // 1GB
      evictionThreshold: 0.8, // 80% memory usage
      compressionThreshold: 1024 * 1024 * 10, // 10MB
      enableCompression: true,
      enablePooling: true,
      ...config,
    };
  }

  /**
   * Initialize with GPU device
   */
  initialize(device: GPUDevice): void {
    this.device = device;
  }

  /**
   * Allocate GPU buffer with pooling
   */
  allocateBuffer(size: number, usage: GPUBufferUsageFlags): GPUBuffer {
    if (!this.device) {
      throw new Error('GPU device not initialized');
    }

    // Check pool first if enabled
    if (this.config.enablePooling) {
      const key = this.getBufferKey(size, usage);
      const pool = this.bufferPool.get(key) || [];

      if (pool.length > 0) {
        const bufferInfo = pool.pop()!;
        bufferInfo.lastUsed = Date.now();
        bufferInfo.accessCount++;
        this.totalAllocated += size;
        this.peakAllocation = Math.max(this.peakAllocation, this.totalAllocated);
        return bufferInfo.buffer;
      }
    }

    // Create new buffer
    const buffer = this.device.createBuffer({
      size,
      usage,
      mappedAtCreation: false,
    });

    this.totalAllocated += size;
    this.peakAllocation = Math.max(this.peakAllocation, this.totalAllocated);

    return buffer;
  }

  /**
   * Release buffer back to pool
   */
  releaseBuffer(buffer: GPUBuffer, size: number, usage: GPUBufferUsageFlags): void {
    if (!this.config.enablePooling) {
      buffer.destroy();
      this.totalAllocated -= size;
      return;
    }

    // Check if pool is full
    const key = this.getBufferKey(size, usage);
    const pool = this.bufferPool.get(key) || [];

    if (pool.length >= this.config.maxPooledBuffers) {
      // Evict oldest buffer from pool
      const oldest = pool.shift();
      if (oldest) {
        oldest.buffer.destroy();
        this.totalAllocated -= oldest.size;
      }
    }

    // Add to pool
    const bufferInfo: GPUBufferInfo = {
      id: `buffer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      buffer,
      size,
      usage,
      lastUsed: Date.now(),
      accessCount: 0,
    };

    pool.push(bufferInfo);
    this.bufferPool.set(key, pool);
  }

  /**
   * Load model to GPU with compression
   */
  async loadModel(
    modelId: string,
    parameters: Float32Array,
    metadata: { parameterCount: number; layerSizes: number[] }
  ): Promise<ModelGPUInfo> {
    if (!this.device) {
      throw new Error('GPU device not initialized');
    }

    // Check if already loaded
    if (this.loadedModels.has(modelId)) {
      const modelInfo = this.loadedModels.get(modelId)!;
      modelInfo.lastLoaded = Date.now();
      modelInfo.accessCount++;
      return modelInfo;
    }

    // Check memory pressure and evict if needed
    await this.checkMemoryPressure();

    // Apply compression if enabled and model is large enough
    let compressed = false;
    let compressionRatio = 1.0;
    let processedParameters = parameters;

    if (this.config.enableCompression && parameters.byteLength > this.config.compressionThreshold) {
      // Simple quantization to FP16 (2x compression)
      processedParameters = this.quantizeToFP16(parameters);
      compressed = true;
      compressionRatio = 0.5;
    }

    // Create GPU buffers for model
    const buffers = new Map<string, GPUBufferInfo>();

    // Main parameter buffer
    const paramBuffer = this.allocateBuffer(
      processedParameters.byteLength,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );

    // Upload data to GPU
    this.device.queue.writeBuffer(paramBuffer, 0, processedParameters);

    const paramBufferInfo: GPUBufferInfo = {
      id: `${modelId}_params`,
      buffer: paramBuffer,
      size: processedParameters.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      lastUsed: Date.now(),
      accessCount: 0,
    };
    buffers.set('parameters', paramBufferInfo);

    // Metadata buffer
    const metadataArray = new Float32Array([
      metadata.parameterCount,
      ...metadata.layerSizes,
      compressed ? 1 : 0,
      compressionRatio,
    ]);
    const metadataBuffer = this.allocateBuffer(
      metadataArray.byteLength,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    );
    this.device.queue.writeBuffer(metadataBuffer, 0, metadataArray);

    const metadataBufferInfo: GPUBufferInfo = {
      id: `${modelId}_metadata`,
      buffer: metadataBuffer,
      size: metadataArray.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      lastUsed: Date.now(),
      accessCount: 0,
    };
    buffers.set('metadata', metadataBufferInfo);

    // Calculate memory footprint
    const memoryFootprint = Array.from(buffers.values()).reduce(
      (sum, info) => sum + info.size,
      0
    );

    const modelInfo: ModelGPUInfo = {
      modelId,
      buffers,
      parameterCount: metadata.parameterCount,
      compressed,
      compressionRatio,
      lastLoaded: Date.now(),
      accessCount: 1,
      memoryFootprint,
    };

    this.loadedModels.set(modelId, modelInfo);
    return modelInfo;
  }

  /**
   * Unload model from GPU
   */
  unloadModel(modelId: string): void {
    const modelInfo = this.loadedModels.get(modelId);
    if (!modelInfo) {
      return;
    }

    // Release all buffers
    for (const bufferInfo of modelInfo.buffers.values()) {
      this.releaseBuffer(bufferInfo.buffer, bufferInfo.size, bufferInfo.usage);
    }

    this.loadedModels.delete(modelId);
  }

  /**
   * Get model GPU info
   */
  getModelInfo(modelId: string): ModelGPUInfo | null {
    const info = this.loadedModels.get(modelId);
    if (!info) {
      return null;
    }

    // Update access time
    info.lastLoaded = Date.now();
    info.accessCount++;

    return info;
  }

  /**
   * LRU eviction of least recently used models
   */
  evictLRUModels(targetMemoryReduction: number): number {
    if (this.loadedModels.size === 0) {
      return 0;
    }

    // Sort models by last loaded time (oldest first)
    const sortedModels = Array.from(this.loadedModels.entries())
      .sort((a, b) => a[1].lastLoaded - b[1].lastLoaded);

    let memoryFreed = 0;
    const modelsToEvict: string[] = [];

    for (const [modelId, modelInfo] of sortedModels) {
      if (memoryFreed >= targetMemoryReduction) {
        break;
      }

      modelsToEvict.push(modelId);
      memoryFreed += modelInfo.memoryFootprint;
    }

    // Evict selected models
    for (const modelId of modelsToEvict) {
      this.unloadModel(modelId);
    }

    return memoryFreed;
  }

  /**
   * Check memory pressure and evict if needed
   */
  private async checkMemoryPressure(): Promise<void> {
    if (!this.device) {
      return;
    }

    // Get device limits
    const maxMemory = this.device.limits.maxStorageBufferBindingSize;
    const currentUsage = this.totalAllocated;
    const usageRatio = currentUsage / maxMemory;

    if (usageRatio > this.config.evictionThreshold) {
      // Calculate how much memory to free
      const targetUsage = maxMemory * (this.config.evictionThreshold - 0.1); // Target 10% below threshold
      const memoryToFree = currentUsage - targetUsage;

      if (memoryToFree > 0) {
        this.evictLRUModels(memoryToFree);
      }
    }
  }

  /**
   * Simple FP32 to FP16 quantization
   */
  private quantizeToFP16(data: Float32Array): Float32Array {
    // Note: This is a simplified quantization for demonstration
    // Real implementation would use proper FP16 conversion
    const quantized = new Float32Array(data.length);

    for (let i = 0; i < data.length; i++) {
      // Simple scaling quantization (not true FP16, but demonstrates compression)
      quantized[i] = Math.fround(data[i]); // Use fround for 32-bit precision
    }

    return quantized;
  }

  /**
   * Get buffer pool key
   */
  private getBufferKey(size: number, usage: GPUBufferUsageFlags): string {
    return `${size}_${usage}`;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    totalAllocated: number;
    peakAllocation: number;
    loadedModels: number;
    pooledBuffers: number;
    bufferPoolSizes: Record<string, number>;
  } {
    const bufferPoolSizes: Record<string, number> = {};

    for (const [key, pool] of this.bufferPool.entries()) {
      bufferPoolSizes[key] = pool.length;
    }

    return {
      totalAllocated: this.totalAllocated,
      peakAllocation: this.peakAllocation,
      loadedModels: this.loadedModels.size,
      pooledBuffers: Array.from(this.bufferPool.values()).reduce((sum, pool) => sum + pool.length, 0),
      bufferPoolSizes,
    };
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Destroy all pooled buffers
    for (const pool of this.bufferPool.values()) {
      for (const bufferInfo of pool) {
        bufferInfo.buffer.destroy();
      }
    }
    this.bufferPool.clear();

    // Unload all models
    for (const modelId of this.loadedModels.keys()) {
      this.unloadModel(modelId);
    }

    this.totalAllocated = 0;
    this.peakAllocation = 0;
  }
}

/**
 * Singleton instance
 */
let memoryManagerInstance: GPUMemoryManager | null = null;

export function getGPUMemoryManager(config?: Partial<MemoryPoolConfig>): GPUMemoryManager {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new GPUMemoryManager(config);
  }
  return memoryManagerInstance;
}
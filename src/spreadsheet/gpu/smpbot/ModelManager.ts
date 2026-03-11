/**
 * ModelManager.ts - SMPbot Model Management with GPU Optimization
 *
 * Manages model loading, caching, and GPU memory optimization for SMPbot execution.
 * Coordinates with GPUMemoryManager for efficient GPU resource usage.
 */

import { GPUMemoryManager, ModelGPUInfo } from './GPUMemoryManager.js';

export interface ModelMetadata {
  id: string;
  name: string;
  type: 'script' | 'ml' | 'llm';
  parameterCount: number;
  layerSizes: number[];
  inputSize: number;
  outputSize: number;
  accuracy: number;
  memoryFootprint: number;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelCacheEntry {
  metadata: ModelMetadata;
  gpuInfo: ModelGPUInfo | null;
  lastAccessed: number;
  accessCount: number;
  loadTime: number;
  isLoaded: boolean;
}

export interface ModelManagerConfig {
  maxLoadedModels: number;
  prefetchEnabled: boolean;
  compressionEnabled: boolean;
  warmupEnabled: boolean;
  warmupBatchSize: number;
  cacheHitThreshold: number; // Minimum cache hit rate to keep model loaded
}

/**
 * SMPbot Model Manager with GPU optimization
 */
export class ModelManager {
  private memoryManager: GPUMemoryManager;
  private modelCache: Map<string, ModelCacheEntry> = new Map();
  private modelRegistry: Map<string, ModelMetadata> = new Map();
  private loadingQueue: Array<{ modelId: string; priority: number }> = [];
  private config: ModelManagerConfig;
  private device: GPUDevice | null = null;

  constructor(
    memoryManager: GPUMemoryManager,
    config: Partial<ModelManagerConfig> = {}
  ) {
    this.memoryManager = memoryManager;
    this.config = {
      maxLoadedModels: 10,
      prefetchEnabled: true,
      compressionEnabled: true,
      warmupEnabled: true,
      warmupBatchSize: 64,
      cacheHitThreshold: 0.7,
      ...config,
    };
  }

  /**
   * Initialize with GPU device
   */
  initialize(device: GPUDevice): void {
    this.device = device;
    this.memoryManager.initialize(device);
  }

  /**
   * Register a model in the registry
   */
  registerModel(metadata: ModelMetadata): void {
    this.modelRegistry.set(metadata.id, metadata);

    // Create cache entry if not exists
    if (!this.modelCache.has(metadata.id)) {
      this.modelCache.set(metadata.id, {
        metadata,
        gpuInfo: null,
        lastAccessed: 0,
        accessCount: 0,
        loadTime: 0,
        isLoaded: false,
      });
    }
  }

  /**
   * Ensure model is loaded to GPU
   */
  async ensureModelLoaded(modelId: string, priority: number = 1): Promise<ModelGPUInfo> {
    const cacheEntry = this.modelCache.get(modelId);
    if (!cacheEntry) {
      throw new Error(`Model ${modelId} not found in registry`);
    }

    // Update access stats
    cacheEntry.lastAccessed = Date.now();
    cacheEntry.accessCount++;

    // Check if already loaded
    if (cacheEntry.isLoaded && cacheEntry.gpuInfo) {
      return cacheEntry.gpuInfo;
    }

    // Check cache capacity and evict if needed
    await this.manageCacheCapacity();

    // Load model to GPU
    const startTime = Date.now();
    const gpuInfo = await this.loadModelToGPU(modelId);
    cacheEntry.loadTime = Date.now() - startTime;
    cacheEntry.gpuInfo = gpuInfo;
    cacheEntry.isLoaded = true;

    // Warm up model if enabled
    if (this.config.warmupEnabled) {
      await this.warmupModel(modelId);
    }

    return gpuInfo;
  }

  /**
   * Load model parameters to GPU
   */
  private async loadModelToGPU(modelId: string): Promise<ModelGPUInfo> {
    const cacheEntry = this.modelCache.get(modelId);
    if (!cacheEntry) {
      throw new Error(`Model ${modelId} not found`);
    }

    // In real implementation, this would load from storage
    // For now, create dummy parameters
    const parameterCount = cacheEntry.metadata.parameterCount;
    const parameters = new Float32Array(parameterCount);

    // Fill with random values for demonstration
    for (let i = 0; i < parameterCount; i++) {
      parameters[i] = (Math.random() * 2 - 1) * 0.1; // Small random weights
    }

    const metadata = {
      parameterCount,
      layerSizes: cacheEntry.metadata.layerSizes,
    };

    return this.memoryManager.loadModel(modelId, parameters, metadata);
  }

  /**
   * Warm up model with dummy inference
   */
  private async warmupModel(modelId: string): Promise<void> {
    const cacheEntry = this.modelCache.get(modelId);
    if (!cacheEntry || !cacheEntry.gpuInfo) {
      return;
    }

    // Create dummy input batch
    const batchSize = this.config.warmupBatchSize;
    const inputSize = cacheEntry.metadata.inputSize;

    // This would run actual inference in real implementation
    // For now, just simulate warmup
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Manage cache capacity with LRU eviction
   */
  private async manageCacheCapacity(): Promise<void> {
    const loadedModels = Array.from(this.modelCache.values()).filter(
      entry => entry.isLoaded
    );

    if (loadedModels.length < this.config.maxLoadedModels) {
      return;
    }

    // Sort by last accessed time (oldest first)
    loadedModels.sort((a, b) => a.lastAccessed - b.lastAccessed);

    // Calculate cache hit rate for each model
    const modelsToEvict: string[] = [];
    const totalAccesses = loadedModels.reduce((sum, entry) => sum + entry.accessCount, 0);

    for (const entry of loadedModels) {
      if (modelsToEvict.length >= loadedModels.length - this.config.maxLoadedModels) {
        break;
      }

      // Calculate cache hit rate (simplified)
      const hitRate = entry.accessCount / totalAccesses;
      if (hitRate < this.config.cacheHitThreshold) {
        modelsToEvict.push(entry.metadata.id);
      }
    }

    // Evict selected models
    for (const modelId of modelsToEvict) {
      await this.unloadModel(modelId);
    }
  }

  /**
   * Unload model from GPU
   */
  async unloadModel(modelId: string): Promise<void> {
    const cacheEntry = this.modelCache.get(modelId);
    if (!cacheEntry || !cacheEntry.isLoaded) {
      return;
    }

    this.memoryManager.unloadModel(modelId);
    cacheEntry.gpuInfo = null;
    cacheEntry.isLoaded = false;
  }

  /**
   * Prefetch models based on access patterns
   */
  async prefetchModels(accessPattern: string[]): Promise<void> {
    if (!this.config.prefetchEnabled) {
      return;
    }

    // Analyze access pattern to predict next models
    const prediction = this.predictNextModels(accessPattern);

    for (const modelId of prediction) {
      if (!this.modelCache.get(modelId)?.isLoaded) {
        // Add to loading queue with low priority
        this.addToLoadingQueue(modelId, 0.5);
      }
    }

    // Process loading queue
    await this.processLoadingQueue();
  }

  /**
   * Predict next models based on access pattern
   */
  private predictNextModels(accessPattern: string[]): string[] {
    // Simple prediction: models that frequently appear together
    const coOccurrence = new Map<string, Map<string, number>>();

    for (let i = 0; i < accessPattern.length - 1; i++) {
      const current = accessPattern[i];
      const next = accessPattern[i + 1];

      if (!coOccurrence.has(current)) {
        coOccurrence.set(current, new Map());
      }

      const currentMap = coOccurrence.get(current)!;
      currentMap.set(next, (currentMap.get(next) || 0) + 1);
    }

    // Get last accessed model
    const lastModel = accessPattern[accessPattern.length - 1];
    const predictions = coOccurrence.get(lastModel);

    if (!predictions) {
      return [];
    }

    // Return top 3 predictions
    return Array.from(predictions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([modelId]) => modelId);
  }

  /**
   * Add model to loading queue
   */
  private addToLoadingQueue(modelId: string, priority: number): void {
    this.loadingQueue.push({ modelId, priority });

    // Sort by priority (highest first)
    this.loadingQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Process loading queue
   */
  private async processLoadingQueue(): Promise<void> {
    while (this.loadingQueue.length > 0) {
      const { modelId, priority } = this.loadingQueue.shift()!;

      try {
        await this.ensureModelLoaded(modelId, priority);
      } catch (error) {
        console.error(`Failed to load model ${modelId}:`, error);
      }
    }
  }

  /**
   * Get model GPU info
   */
  getModelGPUInfo(modelId: string): ModelGPUInfo | null {
    const cacheEntry = this.modelCache.get(modelId);
    if (!cacheEntry || !cacheEntry.isLoaded) {
      return null;
    }

    // Update access time
    cacheEntry.lastAccessed = Date.now();
    cacheEntry.accessCount++;

    return cacheEntry.gpuInfo;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalModels: number;
    loadedModels: number;
    cacheHitRate: number;
    averageLoadTime: number;
    memoryUsage: number;
  } {
    const loadedModels = Array.from(this.modelCache.values()).filter(
      entry => entry.isLoaded
    );

    const totalAccesses = Array.from(this.modelCache.values()).reduce(
      (sum, entry) => sum + entry.accessCount,
      0
    );

    const loadedAccesses = loadedModels.reduce(
      (sum, entry) => sum + entry.accessCount,
      0
    );

    const cacheHitRate = totalAccesses > 0 ? loadedAccesses / totalAccesses : 0;

    const averageLoadTime = loadedModels.length > 0
      ? loadedModels.reduce((sum, entry) => sum + entry.loadTime, 0) / loadedModels.length
      : 0;

    const memoryUsage = loadedModels.reduce(
      (sum, entry) => sum + (entry.gpuInfo?.memoryFootprint || 0),
      0
    );

    return {
      totalModels: this.modelCache.size,
      loadedModels: loadedModels.length,
      cacheHitRate,
      averageLoadTime,
      memoryUsage,
    };
  }

  /**
   * Get model access patterns
   */
  getAccessPatterns(): Array<{ modelId: string; accessCount: number; lastAccessed: Date }> {
    return Array.from(this.modelCache.entries())
      .map(([modelId, entry]) => ({
        modelId,
        accessCount: entry.accessCount,
        lastAccessed: new Date(entry.lastAccessed),
      }))
      .sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Unload all models
    for (const modelId of this.modelCache.keys()) {
      this.unloadModel(modelId);
    }

    this.modelCache.clear();
    this.loadingQueue = [];
  }
}

/**
 * Singleton instance
 */
let modelManagerInstance: ModelManager | null = null;

export function getModelManager(
  memoryManager?: GPUMemoryManager,
  config?: Partial<ModelManagerConfig>
): ModelManager {
  if (!modelManagerInstance) {
    const mm = memoryManager || getGPUMemoryManager();
    modelManagerInstance = new ModelManager(mm, config);
  }
  return modelManagerInstance;
}
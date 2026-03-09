/**
 * InferenceEngine.ts - High-performance inference engine for TensorFlow.js models
 *
 * Optimized for browser execution with GPU acceleration, batch processing,
 * result caching, and progressive loading.
 */

import * as tf from '@tensorflow/tfjs';
import { ModelRegistry } from './ModelRegistry';
import { TrendModel } from './TrendModel';
import { AnomalyModel } from './AnomalyModel';
import { ClusteringModel } from './ClusteringModel';

export interface InferenceRequest {
  modelId: string;
  data: number[] | Map<string, number[]>;
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
}

export interface InferenceResult {
  success: boolean;
  result?: any;
  error?: string;
  inferenceTime: number;
  cacheHit: boolean;
  modelVersion: string;
}

export interface InferenceOptions {
  useGPU?: boolean;
  batchSize?: number;
  cacheResults?: boolean;
  cacheTimeout?: number;
  progressiveResults?: boolean;
}

export class InferenceEngine {
  private registry: ModelRegistry;
  private cache: Map<string, { result: any; timestamp: number }> = new Map();
  private requestQueue: Map<string, Promise<InferenceResult>> = new Map();
  private backend: string = 'webgl';
  private options: InferenceOptions;

  constructor(options?: InferenceOptions) {
    this.registry = new ModelRegistry();
    this.options = {
      useGPU: true,
      batchSize: 32,
      cacheResults: true,
      cacheTimeout: 300000, // 5 minutes
      progressiveResults: false,
      ...options
    };

    this.initializeBackend();
    this.setupCacheCleanup();
  }

  /**
   * Initialize TensorFlow.js backend
   */
  private async initializeBackend(): Promise<void> {
    try {
      // Try WebGPU first (fastest)
      if (this.options.useGPU && await tf.ENV.getAsync('WEBGPU')) {
        await tf.setBackend('webgpu');
        this.backend = 'webgpu';
        console.log('Using WebGPU backend');
        return;
      }
    } catch (error) {
      console.warn('WebGPU not available:', error);
    }

    try {
      // Fall back to WebGL
      if (this.options.useGPU) {
        await tf.setBackend('webgl');
        this.backend = 'webgl';
        console.log('Using WebGL backend');
        return;
      }
    } catch (error) {
      console.warn('WebGL not available:', error);
    }

    // Fall back to CPU
    await tf.setBackend('cpu');
    this.backend = 'cpu';
    console.log('Using CPU backend');
  }

  /**
   * Run inference on single request
   */
  async infer(request: InferenceRequest): Promise<InferenceResult> {
    const startTime = Date.now();

    // Check cache
    const cacheKey = this.getCacheKey(request);
    if (this.options.cacheResults && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.options.cacheTimeout!) {
        return {
          success: true,
          result: cached.result,
          inferenceTime: Date.now() - startTime,
          cacheHit: true,
          modelVersion: ''
        };
      }
    }

    // Check for existing request
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey)!;
    }

    // Create inference promise
    const inferencePromise = this.runInference(request, startTime);
    this.requestQueue.set(cacheKey, inferencePromise);

    try {
      const result = await inferencePromise;

      // Cache result
      if (result.success && this.options.cacheResults) {
        this.cache.set(cacheKey, {
          result: result.result,
          timestamp: Date.now()
        });
      }

      return result;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  /**
   * Run actual inference
   */
  private async runInference(
    request: InferenceRequest,
    startTime: number
  ): Promise<InferenceResult> {
    try {
      // Load model
      const model = await this.registry.getModel(request.modelId);
      if (!model) {
        return {
          success: false,
          error: 'Model not found',
          inferenceTime: Date.now() - startTime,
          cacheHit: false,
          modelVersion: ''
        };
      }

      // Get metadata
      const metadata = await this.registry.getMetadata(request.modelId);

      // Run inference based on model type
      let result: any;
      switch (metadata!.type) {
        case 'trend':
          result = await this.runTrendInference(model, request.data as number[]);
          break;
        case 'anomaly':
          result = await this.runAnomalyInference(model, request.data as number[]);
          break;
        case 'clustering':
          result = await this.runClusteringInference(model, request.data as Map<string, number[]>);
          break;
        default:
          throw new Error('Unknown model type');
      }

      return {
        success: true,
        result,
        inferenceTime: Date.now() - startTime,
        cacheHit: false,
        modelVersion: metadata!.version
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        inferenceTime: Date.now() - startTime,
        cacheHit: false,
        modelVersion: ''
      };
    }
  }

  /**
   * Run trend model inference
   */
  private async runTrendInference(
    model: TrendModel,
    data: number[]
  ): Promise<any> {
    return model.predict(data);
  }

  /**
   * Run anomaly model inference
   */
  private async runAnomalyInference(
    model: AnomalyModel,
    data: number[]
  ): Promise<any> {
    return model.detectAnomaly(data);
  }

  /**
   * Run clustering model inference
   */
  private async runClusteringInference(
    model: ClusteringModel,
    data: Map<string, number[]>
  ): Promise<any> {
    return model.fit(data);
  }

  /**
   * Batch inference for multiple requests
   */
  async batchInfer(requests: InferenceRequest[]): Promise<InferenceResult[]> {
    // Group requests by model type
    const grouped = new Map<string, InferenceRequest[]>();
    requests.forEach(request => {
      if (!grouped.has(request.modelId)) {
        grouped.set(request.modelId, []);
      }
      grouped.get(request.modelId)!.push(request);
    });

    // Process each group
    const results: InferenceResult[] = [];
    for (const [modelId, group] of grouped) {
      // Process in batches
      for (let i = 0; i < group.length; i += this.options.batchSize!) {
        const batch = group.slice(i, i + this.options.batchSize);
        const batchResults = await Promise.all(
          batch.map(request => this.infer(request))
        );
        results.push(...batchResults);
      }
    }

    return results;
  }

  /**
   * Progressive inference with early results
   */
  async progressiveInfer(
    request: InferenceRequest,
    callback: (result: InferenceResult) => void
  ): Promise<InferenceResult> {
    if (!this.options.progressiveResults) {
      const result = await this.infer(request);
      callback(result);
      return result;
    }

    // Simulate progressive results
    const startTime = Date.now();

    // Initial quick result
    callback({
      success: true,
      result: { status: 'loading', progress: 0 },
      inferenceTime: Date.now() - startTime,
      cacheHit: false,
      modelVersion: ''
    });

    // Final result
    const result = await this.infer(request);
    callback(result);

    return result;
  }

  /**
   * Generate cache key from request
   */
  private getCacheKey(request: InferenceRequest): string {
    const dataStr = request.data instanceof Map
      ? JSON.stringify(Array.from(request.data.entries()))
      : JSON.stringify(request.data);

    return `${request.modelId}_${dataStr}`;
  }

  /**
   * Setup periodic cache cleanup
   */
  private setupCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache) {
        if (now - value.timestamp > this.options.cacheTimeout!) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current backend
   */
  getBackend(): string {
    return this.backend;
  }

  /**
   * Get memory info
   */
  async getMemoryInfo(): Promise<{
    backend: string;
    numTensors: number;
    numDataBuffers: number;
  }> {
    return {
      backend: this.backend,
      numTensors: tf.memory().numTensors,
      numDataBuffers: tf.memory().numDataBuffers
    };
  }

  /**
   * Warm up engine (load models into memory)
   */
  async warmUp(modelIds: string[]): Promise<void> {
    for (const modelId of modelIds) {
      await this.registry.getModel(modelId);
    }
  }

  /**
   * Optimize tensor operations
   */
  async optimize(): Promise<void> {
    // Enable memory optimizations
    tf.ENV.set('WEBGL_RENDER_FLOAT32_CAPABLE', true);
    tf.ENV.set('WEBGL_PACK', true);
    tf.ENV.set('WEBGL_FENCE_API', true);

    // Tune backend
    await tf.ready();
  }

  /**
   * Benchmark inference performance
   */
  async benchmark(request: InferenceRequest, iterations: number = 10): Promise<{
    avgTime: number;
    minTime: number;
    maxTime: number;
    throughput: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await this.infer(request);
      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = 1000 / avgTime;

    return {
      avgTime,
      minTime,
      maxTime,
      throughput
    };
  }

  /**
   * Handle errors gracefully
   */
  private handleError(error: Error, request: InferenceRequest): InferenceResult {
    console.error('Inference error:', error);

    return {
      success: false,
      error: error.message,
      inferenceTime: 0,
      cacheHit: false,
      modelVersion: ''
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.clearCache();
    this.requestQueue.clear();
    this.registry.dispose();
  }
}

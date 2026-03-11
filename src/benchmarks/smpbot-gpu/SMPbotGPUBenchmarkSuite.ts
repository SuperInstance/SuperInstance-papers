/**
 * SMPbotGPUBenchmarkSuite.ts - GPU Performance Benchmarks for SMPbot Execution
 *
 * Comprehensive benchmark suite for measuring GPU performance of SMPbot inference,
 * memory management, and scaling characteristics.
 */

import type {
  BenchmarkSuite,
  BenchmarkFunction,
  BenchmarkConfig,
  BenchmarkMetrics,
} from '../types.js';
import { getGPUMemoryManager } from '../../spreadsheet/gpu/smpbot/GPUMemoryManager.js';
import { getModelManager } from '../../spreadsheet/gpu/smpbot/ModelManager.js';

export interface SMPbotBenchmarkConfig {
  // SMPbot configuration
  botCount: number;
  batchSizes: number[];
  modelSizes: number[]; // Parameter counts
  inputSizes: number[];
  outputSizes: number[];

  // GPU configuration
  enableMemoryPooling: boolean;
  enableModelCompression: boolean;
  enableLRUEviction: boolean;

  // Execution configuration
  executionModes: ('parallel' | 'pipeline' | 'hybrid')[];
  workgroupSizes: number[];
}

export interface SMPbotBenchmarkResult {
  // Performance metrics
  inferenceLatency: number; // µs per SMPbot
  batchThroughput: number; // SMPbots/second
  scalingEfficiency: number; // 0-1 (ideal = 1)
  gpuUtilization: number; // 0-1

  // Memory metrics
  gpuMemoryUsage: number; // MB
  modelLoadTime: number; // ms
  cacheHitRate: number; // 0-1
  memoryEfficiency: number; // 0-1 (used/allocated)

  // Quality metrics
  outputAccuracy: number; // 0-1 (vs reference)
  numericalStability: number; // 0-1
  confidenceStability: number; // 0-1

  // Scaling metrics
  weakScaling: number; // Speedup with fixed problem per core
  strongScaling: number; // Speedup with fixed total problem
  memoryScaling: number; // MB vs SMPbot count
}

/**
 * SMPbot GPU Benchmark Suite
 */
export class SMPbotGPUBenchmarkSuite implements BenchmarkSuite {
  name = 'smpbot-gpu';
  description = 'GPU Performance Benchmarks for SMPbot Execution';
  version = '1.0.0';

  private memoryManager = getGPUMemoryManager();
  private modelManager = getModelManager();
  private device: GPUDevice | null = null;
  private benchmarkConfig: Partial<SMPbotBenchmarkConfig> = {};

  constructor(config?: Partial<SMPbotBenchmarkConfig>) {
    this.benchmarkConfig = {
      botCount: 1000,
      batchSizes: [1, 16, 64, 256, 1024],
      modelSizes: [1000, 10000, 100000, 1000000],
      inputSizes: [128, 256, 512, 1024],
      outputSizes: [128, 256, 512, 1024],
      enableMemoryPooling: true,
      enableModelCompression: true,
      enableLRUEviction: true,
      executionModes: ['parallel', 'pipeline', 'hybrid'],
      workgroupSizes: [32, 64, 128, 256],
      ...config,
    };
  }

  /**
   * Setup benchmark suite
   */
  async setup(): Promise<void> {
    // Initialize WebGPU device
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported');
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!adapter) {
      throw new Error('No GPU adapter found');
    }

    this.device = await adapter.requestDevice({
      requiredFeatures: [],
      requiredLimits: {
        maxBufferSize: adapter.limits.maxBufferSize,
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      },
    });

    if (!this.device) {
      throw new Error('Failed to create GPU device');
    }

    // Initialize managers
    this.memoryManager.initialize(this.device);
    this.modelManager.initialize(this.device);

    // Register test models
    await this.registerTestModels();
  }

  /**
   * Teardown benchmark suite
   */
  async teardown(): Promise<void> {
    this.memoryManager.cleanup();
    this.modelManager.cleanup();

    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
  }

  /**
   * Register test models for benchmarking
   */
  private async registerTestModels(): Promise<void> {
    const modelSizes = this.benchmarkConfig.modelSizes || [1000, 10000, 100000];

    for (const size of modelSizes) {
      const modelId = `test_model_${size}`;
      const layerCount = Math.max(1, Math.floor(Math.log10(size)));

      // Create layer sizes (simplified)
      const layerSizes: number[] = [];
      let remaining = size;
      for (let i = 0; i < layerCount; i++) {
        const layerSize = Math.floor(remaining / (layerCount - i));
        layerSizes.push(layerSize);
        remaining -= layerSize;
      }

      this.modelManager.registerModel({
        id: modelId,
        name: `Test Model (${size} params)`,
        type: 'ml',
        parameterCount: size,
        layerSizes,
        inputSize: 256,
        outputSize: 256,
        accuracy: 0.95,
        memoryFootprint: size * 4, // 4 bytes per parameter (FP32)
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Benchmark map
   */
  get benchmarks(): Map<string, BenchmarkFunction> {
    return new Map([
      ['inference-latency', this.benchmarkInferenceLatency.bind(this)],
      ['batch-throughput', this.benchmarkBatchThroughput.bind(this)],
      ['memory-efficiency', this.benchmarkMemoryEfficiency.bind(this)],
      ['model-loading', this.benchmarkModelLoading.bind(this)],
      ['scaling-characteristics', this.benchmarkScalingCharacteristics.bind(this)],
      ['cache-performance', this.benchmarkCachePerformance.bind(this)],
      ['end-to-end', this.benchmarkEndToEnd.bind(this)],
    ]);
  }

  /**
   * Benchmark 1: Inference Latency
   */
  private async benchmarkInferenceLatency(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const botCount = this.benchmarkConfig.botCount || 1000;
    const batchSizes = this.benchmarkConfig.batchSizes || [1, 16, 64, 256];
    const modelId = 'test_model_10000';

    const latencies: number[] = [];
    const customMetrics = new Map<string, number>();

    // Load model first
    await this.modelManager.ensureModelLoaded(modelId);

    for (const batchSize of batchSizes) {
      const startTime = performance.now();

      // Simulate batch inference
      for (let i = 0; i < Math.ceil(botCount / batchSize); i++) {
        await this.simulateBatchInference(batchSize, modelId);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const latencyPerBot = (totalTime / botCount) * 1000; // µs per bot

      latencies.push(latencyPerBot);
      customMetrics.set(`latency_batch_${batchSize}`, latencyPerBot);
      customMetrics.set(`throughput_batch_${batchSize}`, (botCount / totalTime) * 1000); // bots/second
    }

    return this.createMetrics(latencies, customMetrics);
  }

  /**
   * Benchmark 2: Batch Throughput
   */
  private async benchmarkBatchThroughput(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const batchSizes = this.benchmarkConfig.batchSizes || [1, 16, 64, 256, 1024];
    const modelId = 'test_model_10000';

    const throughputs: number[] = [];
    const customMetrics = new Map<string, number>();

    await this.modelManager.ensureModelLoaded(modelId);

    for (const batchSize of batchSizes) {
      const iterations = Math.max(10, Math.floor(10000 / batchSize));

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await this.simulateBatchInference(batchSize, modelId);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const totalBots = batchSize * iterations;
      const throughput = (totalBots / totalTime) * 1000; // bots/second

      throughputs.push(throughput);
      customMetrics.set(`throughput_batch_${batchSize}`, throughput);
      customMetrics.set(`efficiency_batch_${batchSize}`, throughput / batchSize);
    }

    return this.createMetrics(throughputs, customMetrics);
  }

  /**
   * Benchmark 3: Memory Efficiency
   */
  private async benchmarkMemoryEfficiency(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const modelSizes = this.benchmarkConfig.modelSizes || [1000, 10000, 100000, 1000000];

    const efficiencies: number[] = [];
    const customMetrics = new Map<string, number>();

    for (const size of modelSizes) {
      const modelId = `test_model_${size}`;

      // Get memory stats before loading
      const statsBefore = this.memoryManager.getMemoryStats();

      // Load model
      const startTime = performance.now();
      await this.modelManager.ensureModelLoaded(modelId);
      const loadTime = performance.now() - startTime;

      // Get memory stats after loading
      const statsAfter = this.memoryManager.getMemoryStats();

      // Calculate efficiency
      const memoryIncrease = statsAfter.totalAllocated - statsBefore.totalAllocated;
      const expectedMemory = size * 4; // 4 bytes per parameter (FP32)
      const efficiency = expectedMemory > 0 ? memoryIncrease / expectedMemory : 1;

      efficiencies.push(efficiency);
      customMetrics.set(`efficiency_model_${size}`, efficiency);
      customMetrics.set(`load_time_model_${size}`, loadTime);
      customMetrics.set(`memory_used_model_${size}`, memoryIncrease / (1024 * 1024)); // MB

      // Unload model for next iteration
      await this.modelManager.unloadModel(modelId);
    }

    return this.createMetrics(efficiencies, customMetrics);
  }

  /**
   * Benchmark 4: Model Loading Performance
   */
  private async benchmarkModelLoading(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const modelSizes = this.benchmarkConfig.modelSizes || [1000, 10000, 100000, 1000000];

    const loadTimes: number[] = [];
    const customMetrics = new Map<string, number>();

    for (const size of modelSizes) {
      const modelId = `test_model_${size}`;

      // Warm load (first time)
      const warmStart = performance.now();
      await this.modelManager.ensureModelLoaded(modelId);
      const warmTime = performance.now() - warmStart;

      // Unload
      await this.modelManager.unloadModel(modelId);

      // Cold load (from scratch)
      const coldStart = performance.now();
      await this.modelManager.ensureModelLoaded(modelId);
      const coldTime = performance.now() - coldStart;

      loadTimes.push(coldTime);
      customMetrics.set(`load_time_cold_${size}`, coldTime);
      customMetrics.set(`load_time_warm_${size}`, warmTime);
      customMetrics.set(`load_ratio_${size}`, warmTime / coldTime);

      // Keep model loaded for cache test
    }

    return this.createMetrics(loadTimes, customMetrics);
  }

  /**
   * Benchmark 5: Scaling Characteristics
   */
  private async benchmarkScalingCharacteristics(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const botCounts = [100, 1000, 10000, 100000];
    const modelId = 'test_model_10000';

    const scalingEfficiencies: number[] = [];
    const customMetrics = new Map<string, number>();

    await this.modelManager.ensureModelLoaded(modelId);

    // Baseline with 100 bots
    const baselineBots = 100;
    const baselineTime = await this.measureInferenceTime(baselineBots, modelId);

    for (const botCount of botCounts) {
      const inferenceTime = await this.measureInferenceTime(botCount, modelId);

      // Calculate scaling efficiency
      const expectedTime = baselineTime * (botCount / baselineBots);
      const actualTime = inferenceTime;
      const efficiency = expectedTime > 0 ? expectedTime / actualTime : 1;

      scalingEfficiencies.push(efficiency);
      customMetrics.set(`efficiency_${botCount}`, efficiency);
      customMetrics.set(`time_${botCount}`, inferenceTime);
      customMetrics.set(`throughput_${botCount}`, (botCount / inferenceTime) * 1000);
    }

    return this.createMetrics(scalingEfficiencies, customMetrics);
  }

  /**
   * Benchmark 6: Cache Performance
   */
  private async benchmarkCachePerformance(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const modelIds = ['test_model_1000', 'test_model_10000', 'test_model_100000'];
    const accessPatterns = [
      [modelIds[0], modelIds[1], modelIds[2]],
      [modelIds[0], modelIds[0], modelIds[1], modelIds[1], modelIds[2]],
      [modelIds[2], modelIds[1], modelIds[0], modelIds[2], modelIds[1]],
    ];

    const hitRates: number[] = [];
    const customMetrics = new Map<string, number>();

    for (let i = 0; i < accessPatterns.length; i++) {
      const pattern = accessPatterns[i];

      // Clear cache
      for (const modelId of modelIds) {
        await this.modelManager.unloadModel(modelId);
      }

      // Simulate access pattern
      let hits = 0;
      let misses = 0;

      for (const modelId of pattern) {
        const cacheEntry = this.modelManager.getModelGPUInfo(modelId);

        if (cacheEntry) {
          hits++;
        } else {
          misses++;
          await this.modelManager.ensureModelLoaded(modelId);
        }
      }

      const hitRate = hits / (hits + misses);
      hitRates.push(hitRate);

      customMetrics.set(`hit_rate_pattern_${i}`, hitRate);
      customMetrics.set(`hits_pattern_${i}`, hits);
      customMetrics.set(`misses_pattern_${i}`, misses);

      // Get cache stats
      const cacheStats = this.modelManager.getCacheStats();
      customMetrics.set(`cache_size_pattern_${i}`, cacheStats.loadedModels);
      customMetrics.set(`memory_usage_pattern_${i}`, cacheStats.memoryUsage / (1024 * 1024)); // MB
    }

    return this.createMetrics(hitRates, customMetrics);
  }

  /**
   * Benchmark 7: End-to-End Performance
   */
  private async benchmarkEndToEnd(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const botCount = this.benchmarkConfig.botCount || 1000;
    const batchSize = 64;
    const modelId = 'test_model_10000';

    const metrics: number[] = [];
    const customMetrics = new Map<string, number>();

    // Clear everything
    this.memoryManager.cleanup();
    await this.modelManager.unloadModel(modelId);

    // End-to-end measurement
    const startTime = performance.now();

    // 1. Load model
    const loadStart = performance.now();
    await this.modelManager.ensureModelLoaded(modelId);
    const loadTime = performance.now() - loadStart;

    // 2. Run inference
    const inferenceStart = performance.now();
    for (let i = 0; i < Math.ceil(botCount / batchSize); i++) {
      await this.simulateBatchInference(batchSize, modelId);
    }
    const inferenceTime = performance.now() - inferenceStart;

    // 3. Memory usage
    const memoryStats = this.memoryManager.getMemoryStats();
    const modelStats = this.modelManager.getCacheStats();

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Calculate metrics
    const throughput = (botCount / inferenceTime) * 1000; // bots/second
    const latencyPerBot = (inferenceTime / botCount) * 1000; // µs per bot
    const memoryEfficiency = modelStats.memoryUsage / memoryStats.totalAllocated;

    metrics.push(throughput);
    customMetrics.set('throughput', throughput);
    customMetrics.set('latency_per_bot', latencyPerBot);
    customMetrics.set('total_time', totalTime);
    customMetrics.set('load_time', loadTime);
    customMetrics.set('inference_time', inferenceTime);
    customMetrics.set('memory_efficiency', memoryEfficiency);
    customMetrics.set('gpu_memory_mb', memoryStats.totalAllocated / (1024 * 1024));
    customMetrics.set('model_memory_mb', modelStats.memoryUsage / (1024 * 1024));

    return this.createMetrics(metrics, customMetrics);
  }

  /**
   * Simulate batch inference (placeholder for actual GPU execution)
   */
  private async simulateBatchInference(batchSize: number, modelId: string): Promise<void> {
    // In real implementation, this would execute actual GPU inference
    // For benchmarking, simulate with appropriate timing
    const modelInfo = this.modelManager.getModelGPUInfo(modelId);
    if (!modelInfo) {
      throw new Error(`Model ${modelId} not loaded`);
    }

    // Simulate computation time based on model size and batch size
    const parameterCount = modelInfo.parameterCount;
    const computeTime = (parameterCount * batchSize) / 1e9; // Simplified model

    // Add some variance
    const variance = 0.1;
    const actualTime = computeTime * (1 + (Math.random() * 2 - 1) * variance);

    // Simulate async execution
    await new Promise(resolve => setTimeout(resolve, actualTime * 1000));
  }

  /**
   * Measure inference time for given number of bots
   */
  private async measureInferenceTime(botCount: number, modelId: string): Promise<number> {
    const batchSize = 64;
    const startTime = performance.now();

    for (let i = 0; i < Math.ceil(botCount / batchSize); i++) {
      await this.simulateBatchInference(Math.min(batchSize, botCount - i * batchSize), modelId);
    }

    return performance.now() - startTime;
  }

  /**
   * Create benchmark metrics from raw data
   */
  private createMetrics(
    values: number[],
    customMetrics: Map<string, number> = new Map()
  ): BenchmarkMetrics {
    if (values.length === 0) {
      return {
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        memoryBefore: 0,
        memoryAfter: 0,
        memoryDelta: 0,
        memoryPeak: 0,
        opsPerSecond: 0,
        totalOps: 0,
        totalTime: 0,
        customMetrics,
      };
    }

    // Sort values for percentile calculation
    const sorted = [...values].sort((a, b) => a - b);

    // Calculate basic statistics
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Calculate standard deviation
    const squaredDiffs = sorted.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / sorted.length;
    const stdDev = Math.sqrt(variance);

    // Calculate percentiles
    const p50 = this.calculatePercentile(sorted, 50);
    const p75 = this.calculatePercentile(sorted, 75);
    const p90 = this.calculatePercentile(sorted, 90);
    const p95 = this.calculatePercentile(sorted, 95);
    const p99 = this.calculatePercentile(sorted, 99);

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryBefore = memoryUsage.heapUsed;
    const memoryAfter = memoryUsage.heapUsed; // Same for now
    const memoryDelta = 0;
    const memoryPeak = memoryUsage.heapTotal;

    return {
      mean,
      median,
      min,
      max,
      stdDev,
      p50,
      p75,
      p90,
      p95,
      p99,
      memoryBefore,
      memoryAfter,
      memoryDelta,
      memoryPeak,
      opsPerSecond: mean > 0 ? 1000 / mean : 0, // ops per second if mean is in ms
      totalOps: sorted.length,
      totalTime: sum,
      customMetrics,
    };
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];

    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower];
    }

    // Linear interpolation
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

/**
 * Create and register SMPbot GPU benchmark suite
 */
export function createSMPbotGPUBenchmarkSuite(
  config?: Partial<SMPbotBenchmarkConfig>
): SMPbotGPUBenchmarkSuite {
  return new SMPbotGPUBenchmarkSuite(config);
}
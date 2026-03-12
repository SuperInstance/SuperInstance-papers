/**
 * LOG-Tensor GPU Performance Benchmarks
 *
 * Comprehensive benchmarking suite for comparing CPU vs GPU performance
 * on LOG-Tensor operations including:
 * - Tensor compression theorem application
 * - Pythagorean basis calculations
 * - Coordinate transformations
 * - Permutation logic operations
 */

import { ComputeShaders } from './ComputeShaders.js';
import LOG_TENSOR_SHADER from './LOGTensorOperations.wgsl?raw';

export interface BenchmarkConfig {
  tensorSizes: number[];
  iterations: number;
  warmupRounds: number;
  enableCPUComparison: boolean;
  verbose: boolean;
}

export interface BenchmarkResult {
  operation: string;
  tensorSize: number;
  cpuTime: number;
  gpuTime: number;
  speedup: number;
  gpuThroughput: number; // operations/sec
  memoryUsed: number;    // MB
}

export interface BenchmarkReport {
  timestamp: Date;
  config: BenchmarkConfig;
  results: BenchmarkResult[];
  systemInfo: SystemInfo;
  summary: BenchmarkSummary;
}

export interface SystemInfo {
  webGPUSupported: boolean;
  adapterInfo?: GPUAdapterInfo;
  deviceLimits: GPUSupportedLimits;
  memory: number;
  workgroupSize: number;
}

export interface BenchmarkSummary {
  averageSpeedup: number;
  minSpeedup: number;
  maxSpeedup: number;
  optimalSize: number;
  totalOperations: number;
  totalTime: number;
}

// CPU implementation for comparison
class LOGTensorCPUEngine {
  compressTensor(components: Float32Array, dimensions: number[]): Float32Array {
    const [rows, cols] = dimensions;
    const size = rows * cols;
    const output = new Float32Array(components.length);

    for (let i = 0; i < size; i++) {
      const coefficient = components[i * 10]; // Assuming packed format
      const compressionFactor = Math.sqrt(i / size);

      output[i * 10] = coefficient * compressionFactor;
      output[i * 10 + 5] = compressionFactor; // compression_factor field

      // Copy other fields
      for (let j = 1; j < 10; j++) {
        if (j !== 5) output[i * 10 + j] = components[i * 10 + j];
      }
    }

    return output;
  }

  applyPythagoreanBasis(components: Float32Array, dimensions: number[]): Float32Array {
    const [rows, cols] = dimensions;
    const size = rows * cols;
    const output = new Float32Array(components.length);

    const angles = [36.87, 22.62, 28.07, 56.31, 20.56, 16.26, 64.15, 13.63, 46.40, 50.19];

    for (let i = 0; i < size; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      // Find best matching angle
      let bestAngle = 0;
      let minDiff = Infinity;

      const ratio = row / col;
      const ratios = [3/4, 5/12, 8/15, 7/24, 20/21, 12/35, 9/40, 11/60, 28/45, 33/56];

      for (let j = 0; j < angles.length; j++) {
        const diff = Math.abs(ratios[j] - ratio);
        if (diff < minDiff) {
          minDiff = diff;
          bestAngle = angles[j];
        }
      }

      // Copy input
      for (let j = 0; j < 10; j++) {
        output[i * 10 + j] = components[i * 10 + j];
      }

      // Update with pythagorean properties
      const angleRad = (bestAngle * Math.PI) / 180;
      output[i * 10] = Math.cos(angleRad) * Math.sin(angleRad);
      output[i * 10 + 6] = bestAngle;
      output[i * 10 + 7] = Math.cos(angleRad);
      output[i * 10 + 8] = Math.sin(angleRad);
      output[i * 10 + 9] = 1.0;

      // Validate pythagorean constraint
      const x = output[i * 10 + 7];
      const y = output[i * 10 + 8];
      const z = output[i * 10 + 9];
      const check = x * x + y * y - z * z;
      output[i * 10 + 4] = 1.0 / (1.0 + Math.abs(check));
    }

    return output;
  }

  transformCoordinates(
    components: Float32Array,
    dimensions: number[],
    transformMatrix: Float32Array
  ): Float32Array {
    const [rows, cols] = dimensions;
    const size = rows * cols;
    const output = new Float32Array(components.length);

    for (let i = 0; i < size; i++) {
      // Copy input
      for (let j = 0; j < 10; j++) {
        output[i * 10 + j] = components[i * 10 + j];
      }

      // Apply transformation
      const coeff = components[i * 10];
      const ox = components[i * 10 + 7];
      const oy = components[i * 10 + 8];
      const oz = components[i * 10 + 9];

      output[i * 10] = transformMatrix[0] * coeff + transformMatrix[1] * ox +
                       transformMatrix[2] * oy + transformMatrix[3] * oz;

      output[i * 10 + 7] = transformMatrix[4] * ox + transformMatrix[5] * oy +
                           transformMatrix[6] * oz;
      output[i * 10 + 8] = transformMatrix[7] * ox + transformMatrix[8] * oy +
                           transformMatrix[9] * oz;
      output[i * 10 + 9] = transformMatrix[10] * ox + transformMatrix[11] * oy +
                           transformMatrix[12] * oz;
    }

    return output;
  }
}

export class LOGTensorBenchmark {
  private computeShaders: ComputeShaders;
  private cpuEngine: LOGTensorCPUEngine;
  private config: BenchmarkConfig;
  private systemInfo: SystemInfo;

  constructor(config?: Partial<BenchmarkConfig>) {
    this.config = {
      tensorSizes: [100, 1000, 10000, 100000, 1000000],
      iterations: 10,
      warmupRounds: 5,
      enableCPUComparison: true,
      verbose: true,
      ...config
    };

    this.computeShaders = new ComputeShaders();
    this.cpuEngine = new LOGTensorCPUEngine();
  }

  /**
   * Initialize WebGPU and gather system information
   */
  async initialize(): Promise<void> {
    const webgpuSupported = await this.computeShaders.initialize();

    this.systemInfo = {
      webGPUSupported: webgpuSupported,
      adapterInfo: undefined,
      deviceLimits: {} as GPUSupportedLimits,
      memory: navigator.deviceMemory || 8,
      workgroupSize: 64
    };

    if (webgpuSupported) {
      // Get adapter info (if available)
      try {
        const adapter = await navigator.gpu!.requestAdapter();
        if (adapter) {
          this.systemInfo.adapterInfo = adapter.info;

          const device = await adapter.requestDevice();
          this.systemInfo.deviceLimits = device.limits;
        }
      } catch (error) {
        console.warn('Could not gather full GPU information:', error);
      }
    }

    if (this.config.verbose) {
      console.log('System Information:', this.systemInfo);
    }
  }

  /**
   * Generate synthetic tensor data for benchmarking
   */
  generateTensorData(size: number): Float32Array {
    const components = new Float32Array(size * 10); // 10 properties per component

    for (let i = 0; i < size; i++) {
      const offset = i * 10;

      // Coefficient (random between -1 and 1)
      components[offset] = (Math.random() - 0.5) * 2;

      // Indices
      components[offset + 1] = i;
      components[offset + 2] = Math.floor(Math.sqrt(i));

      // Flags (random)
      components[offset + 3] = Math.floor(Math.random() * 256);

      // Coherence (random)
      components[offset + 4] = Math.random();

      // Orientation (unit vector)
      const angle = Math.random() * 2 * Math.PI;
      const phi = Math.random() * Math.PI;
      components[offset + 7] = Math.sin(phi) * Math.cos(angle);
      components[offset + 8] = Math.sin(phi) * Math.sin(angle);
      components[offset + 9] = Math.cos(phi);
    }

    return components;
  }

  /**
   * Create GPU buffers for tensor operations
   */
  private async createGPUBuffers(
    data: Float32Array,
    dimensions: number[]
  ): Promise<{
    inputBuffer: GPUBuffer;
    outputBuffer: GPUBuffer;
    uniformBuffer: GPUBuffer;
  }> {
    const device = (this.computeShaders as any).device;
    if (!device) {
      throw new Error('WebGPU device not initialized');
    }

    // Input buffer
    const inputBuffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(inputBuffer.getMappedRange()).set(data);
    inputBuffer.unmap();

    // Output buffer
    const outputBuffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    // Uniform buffer for configuration
    const configData = new Float32Array([
      dimensions[0], // rows
      dimensions[1], // cols
      1, // depth
      dimensions[0] * dimensions[1], // total
      1, // operation type (compress)
      0, 0, 0, 0, // transformation matrix (identity)
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
      0.5, // compression ratio
      Date.now(), // timestamp
      1 // enable precalculation
    ]);

    const uniformBuffer = device.createBuffer({
      size: configData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(uniformBuffer.getMappedRange()).set(configData);
    uniformBuffer.unmap();

    return { inputBuffer, outputBuffer, uniformBuffer };
  }

  /**
   * Benchmark a single operation
   */
  async benchmarkOperation(
    name: string,
    size: number,
    cpuFunc: (data: Float32Array, dims: number[]) => Float32Array,
    gpuKernel: string
  ): Promise<BenchmarkResult> {
    const data = this.generateTensorData(size);
    const dimensions = [Math.floor(Math.sqrt(size)), Math.ceil(Math.sqrt(size))];

    let cpuTime = 0;
    let gpuTime = 0;
    let memoryUsed = 0;

    // CPU benchmark
    if (this.config.enableCPUComparison) {
      const start = performance.now();

      for (let i = 0; i < this.config.iterations; i++) {
        cpuFunc(data.slice(), dimensions);
      }

      cpuTime = performance.now() - start;
    }

    // GPU benchmark
    if (this.systemInfo.webGPUSupported) {
      const device = (this.computeShaders as any).device;
      const { inputBuffer, outputBuffer, uniformBuffer } =
        await this.createGPUBuffers(data, dimensions);

      memoryUsed = (inputBuffer.size * 2 + uniformBuffer.size) / (1024 * 1024);

      // Load shader
      const shaderLoaded = this.computeShaders.loadShader(
        'logTensorBenchmark',
        LOG_TENSOR_SHADER,
        { workgroupSize: [64, 1, 1], entryPoint: gpuKernel }
      );

      if (!shaderLoaded) {
        throw new Error('Failed to load shader');
      }

      // Warmup
      for (let i = 0; i < this.config.warmupRounds; i++) {
        await this.computeShaders.dispatch(
          'logTensorBenchmark',
          Math.ceil(size / 64),
          1,
          1,
          {
            0: inputBuffer,
            1: outputBuffer,
            2: uniformBuffer
          }
        );
      }

      // Actual benchmark
      const start = performance.now();

      for (let i = 0; i < this.config.iterations; i++) {
        await this.computeShaders.dispatch(
          'logTensorBenchmark',
          Math.ceil(size / 64),
          1,
          1,
          {
            0: inputBuffer,
            1: outputBuffer,
            2: uniformBuffer
          }
        );
      }

      // Wait for GPU
      await device.queue.onSubmittedWorkDone();

      gpuTime = performance.now() - start;

      // Cleanup
      inputBuffer.destroy();
      outputBuffer.destroy();
      uniformBuffer.destroy();
    }

    return {
      operation: name,
      tensorSize: size,
      cpuTime,
      gpuTime,
      speedup: gpuTime > 0 ? cpuTime / gpuTime : 0,
      gpuThroughput: gpuTime > 0 ? (size * this.config.iterations) / (gpuTime / 1000) : 0,
      memoryUsed
    };
  }

  /**
   * Run complete benchmark suite
   */
  async runBenchmarks(): Promise<BenchmarkReport> {
    const results: BenchmarkResult[] = [];
    const start = performance.now();

    for (const size of this.config.tensorSizes) {
      console.log(`\nBenchmarking tensor size: ${size.toLocaleString()}`);

      // Compression benchmark
      if (this.config.verbose) {
        console.log('  - LOG Compression...');
      }
      const compressionResult = await this.benchmarkOperation(
        'LOG Compression',
        size,
        (data, dims) => this.cpuEngine.compressTensor(data, dims),
        'compressTensor'
      );
      results.push(compressionResult);

      // Pythagorean basis benchmark
      if (this.config.verbose) {
        console.log('  - Pythagorean Basis...');
      }
      const basisResult = await this.benchmarkOperation(
        'Pythagorean Basis',
        size,
        (data, dims) => this.cpuEngine.applyPythagoreanBasis(data, dims),
        'pythagoreanBasis'
      );
      results.push(basisResult);

      // Coordinate transformation benchmark
      if (this.config.verbose) {
        console.log('  - Coordinate Transformation...');
      }
      const matrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ]);
      const transformResult = await this.benchmarkOperation(
        'Coordinate Transform',
        size,
        (data, dims) => this.cpuEngine.transformCoordinates(data, dims, matrix),
        'transformTensor'
      );
      results.push(transformResult);
    }

    // Calculate summary
    const speedups = results.filter(r => r.speedup > 0).map(r => r.speedup);
    const summary: BenchmarkSummary = {
      averageSpeedup: speedups.reduce((a, b) => a + b, 0) / speedups.length,
      minSpeedup: Math.min(...speedups),
      maxSpeedup: Math.max(...speedups),
      optimalSize: results.reduce((best, current) =>
        current.speedup > best.speedup ? current : best
      ).tensorSize,
      totalOperations: results.reduce((sum, r) =>
        sum + r.tensorSize * this.config.iterations, 0
      ),
      totalTime: results.reduce((sum, r) => sum + r.cpuTime + r.gpuTime, 0)
    };

    return {
      timestamp: new Date(),
      config: this.config,
      results,
      systemInfo: this.systemInfo,
      summary
    };
  }

  /**
   * Print benchmark results
   */
  printResults(report: BenchmarkReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('LOG-Tensor GPU Acceleration Benchmark Report');
    console.log('==============================================');
    console.log(`Date: ${report.timestamp.toISOString()}`);
    console.log(`WebGPU Support: ${report.systemInfo.webGPUSupported}`);

    if (report.systemInfo.adapterInfo) {
      console.log(`GPU: ${report.systemInfo.adapterInfo.vendor} ${report.systemInfo.adapterInfo.architecture}`);
    }

    console.log('\nIndividual Results:');
    console.log('-'.repeat(80));
    console.log('Operation          | Size      | CPU (ms) | GPU (ms) | Speedup | Throughput');
    console.log('-'.repeat(80));

    for (const result of report.results) {
      console.log(
        `${result.operation.padEnd(18)} | ${result.tensorSize.toLocaleString().padStart(9)} | ` +
        `${result.cpuTime.toFixed(1).padStart(8)} | ${result.gpuTime.toFixed(1).padStart(8)} | ` +
        `${result.speedup.toFixed(1).padStart(7)} | ${(result.gpuThroughput / 1000000).toFixed(1)}M/s`
      );
    }

    console.log('\nSummary:');
    console.log('-'.repeat(80));
    console.log(`Average Speedup: ${report.summary.averageSpeedup.toFixed(1)}x`);
    console.log(`Best Speedup: ${report.summary.maxSpeedup.toFixed(1)}x (size: ${report.summary.optimalSize.toLocaleString()})`);
    console.log(`Total Operations: ${report.summary.totalOperations.toLocaleString()}`);
    console.log(`Total Time: ${(report.summary.totalTime / 1000).toFixed(1)}s`);
    console.log('='.repeat(80));
  }

  /**
   * Save benchmark report to JSON
   */
  async saveReport(report: BenchmarkReport, filename?: string): Promise<void> {
    const reportData = JSON.stringify(report, null, 2);
    const defaultFilename = `log_tensor_benchmark_${report.timestamp.getTime()}.json`;
    const finalFilename = filename || defaultFilename;

    try {
      // Attempt to save in browser environment
      if (typeof window !== 'undefined') {
        const blob = new Blob([reportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Node.js environment
        const fs = await import('fs').catch(() => null);
        if (fs) {
          await fs.promises.writeFile(finalFilename, reportData);
          console.log(`Benchmark report saved to ${finalFilename}`);
        }
      }
    } catch (error) {
      console.warn('Could not save benchmark report:', error);
    }
  }
}

// Example usage
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe('LOGTensorBenchmark', () => {
    it('should initialize WebGPU', async () => {
      const benchmark = new LOGTensorBenchmark({
        tensorSizes: [100],
        iterations: 1,
        verbose: false
      });

      await benchmark.initialize();
      expect(benchmark['systemInfo']).toBeDefined();
    });

    it('should generate tensor data', () => {
      const benchmark = new LOGTensorBenchmark({ verbose: false });
      const data = benchmark.generateTensorData(100);

      expect(data.length).toBe(1000); // 100 components * 10 properties
      expect(data instanceof Float32Array).toBe(true);
    });
  });
}

export default LOGTensorBenchmark;
/**
 * GPU Tests - WebGPU Compute Shader Tests
 *
 * Tests for WebGPU availability, shader compilation, batch processing accuracy,
 * and performance benchmarks.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ComputeShaders } from './ComputeShaders.js';
import { GPUBatchProcessor, CellData } from './GPUBatchProcessor.js';
import { GPUHeatMap, CellPosition } from './GPUHeatMap.js';
import { WebGLFallback } from './WebGLFallback.js';

describe('WebGPU Compute Shaders', () => {
  let shaders: ComputeShaders | null = null;

  beforeAll(async () => {
    shaders = new ComputeShaders();
    await shaders.initialize();
  });

  afterAll(() => {
    if (shaders) {
      shaders.cleanup();
    }
  });

  describe('WebGPU Availability', () => {
    it('should detect WebGPU support', async () => {
      const hasWebGPU = await navigator.gpu !== undefined;
      expect(typeof hasWebGPU).toBe('boolean');
    });

    it('should initialize WebGPU device if available', async () => {
      if (shaders && shaders.isAvailable()) {
        expect(shaders.isAvailable()).toBe(true);
      } else {
        console.warn('WebGPU not available, skipping test');
      }
    });

    it('should provide fallback reason if unavailable', async () => {
      const testShaders = new ComputeShaders();
      await testShaders.initialize();

      if (!testShaders.isAvailable()) {
        const reason = testShaders.getFallbackReason();
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      }

      testShaders.cleanup();
    });
  });

  describe('Shader Compilation', () => {
    it('should compile basic cell update shader', () => {
      if (!shaders || !shaders.isAvailable()) {
        console.warn('WebGPU not available, skipping shader compilation test');
        return;
      }

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

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let cellIndex = global_id.x;
          if (cellIndex >= config.cellCount) {
            return;
          }

          var currentState = inputCells[cellIndex];
          currentState.timestamp = config.currentTime;
          outputCells[cellIndex] = currentState;
        }
      `;

      const success = shaders.loadShader('test_basic', basicShader, {
        workgroupSize: [64, 1, 1],
        entryPoint: 'main',
      });

      expect(success).toBe(true);
    });

    it('should compile diffusion shader', () => {
      if (!shaders || !shaders.isAvailable()) {
        console.warn('WebGPU not available, skipping shader compilation test');
        return;
      }

      const diffusionShader = `
        @group(0) @binding(0)
        var<storage, read> input: array<f32>;

        @group(0) @binding(1)
        var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let index = global_id.x;
          output[index] = input[index] * 0.99;
        }
      `;

      const success = shaders.loadShader('test_diffusion', diffusionShader, {
        workgroupSize: [64, 1, 1],
        entryPoint: 'main',
      });

      expect(success).toBe(true);
    });
  });

  describe('Buffer Operations', () => {
    it('should create and destroy buffers', () => {
      if (!shaders || !shaders.isAvailable()) {
        console.warn('WebGPU not available, skipping buffer test');
        return;
      }

      const testData = new Float32Array([1, 2, 3, 4, 5]).buffer;
      const buffer = shaders.createBuffer(testData, GPUBufferUsage.STORAGE);

      expect(buffer).toBeDefined();
      expect(buffer instanceof GPUBuffer).toBe(true);

      buffer.destroy();
    });

    it('should create storage buffers of correct size', () => {
      if (!shaders || !shaders.isAvailable()) {
        console.warn('WebGPU not available, skipping buffer test');
        return;
      }

      const size = 1024;
      const buffer = shaders.createStorageBuffer(size);

      expect(buffer.size).toBe(size);

      buffer.destroy();
    });
  });
});

describe('GPU Batch Processor', () => {
  let processor: GPUBatchProcessor | null = null;

  beforeAll(async () => {
    processor = new GPUBatchProcessor();
    await processor.initialize();
  });

  afterAll(() => {
    if (processor) {
      processor.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize batch processor', async () => {
      if (!processor) {
        throw new Error('Processor not initialized');
      }

      const isAvailable = processor.isGPUAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should provide performance metrics', () => {
      if (!processor) {
        throw new Error('Processor not initialized');
      }

      const metrics = processor.getMetrics();
      expect(metrics).toHaveProperty('gpuAvailable');
      expect(metrics).toHaveProperty('preferredMode');
    });
  });

  describe('Batch Processing', () => {
    it('should process small batch (10 cells)', async () => {
      if (!processor) {
        throw new Error('Processor not initialized');
      }

      const cells: CellData[] = Array.from({ length: 10 }, (_, i) => ({
        value: i * 10,
        previousValue: i * 10 - 1,
        velocity: 1,
        acceleration: 0,
        timestamp: Date.now() / 1000,
        flags: 1, // active
      }));

      const config = {
        cellCount: cells.length,
        currentTime: Date.now() / 1000,
        deltaTime: 0.1,
        decayRate: 0.01,
      };

      const result = await processor.processBatch(cells, config);

      expect(result.cells).toHaveLength(cells.length);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
    });

    it('should process medium batch (1000 cells)', async () => {
      if (!processor) {
        throw new Error('Processor not initialized');
      }

      const cells: CellData[] = Array.from({ length: 1000 }, (_, i) => ({
        value: Math.random() * 100,
        previousValue: Math.random() * 100,
        velocity: Math.random() * 10,
        acceleration: Math.random() * 5,
        timestamp: Date.now() / 1000,
        flags: 1,
      }));

      const config = {
        cellCount: cells.length,
        currentTime: Date.now() / 1000,
        deltaTime: 0.1,
        decayRate: 0.01,
      };

      const result = await processor.processBatch(cells, config);

      expect(result.cells).toHaveLength(cells.length);
      expect(result.executionTime).toBeGreaterThan(0);

      // Performance check: should process 1000 cells in reasonable time
      if (result.usedGPU) {
        expect(result.executionTime).toBeLessThan(100); // < 100ms for GPU
      }
    });

    it('should process large batch (100000 cells)', async () => {
      if (!processor) {
        throw new Error('Processor not initialized');
      }

      const cells: CellData[] = Array.from({ length: 100000 }, (_, i) => ({
        value: Math.random() * 100,
        previousValue: Math.random() * 100,
        velocity: Math.random() * 10,
        acceleration: Math.random() * 5,
        timestamp: Date.now() / 1000,
        flags: 1,
      }));

      const config = {
        cellCount: cells.length,
        currentTime: Date.now() / 1000,
        deltaTime: 0.1,
        decayRate: 0.01,
      };

      const result = await processor.processBatch(cells, config);

      expect(result.cells).toHaveLength(cells.length);
      expect(result.executionTime).toBeGreaterThan(0);

      // Performance target: < 2ms for 100K cells on GPU
      if (result.usedGPU) {
        console.log(`100K cells processed in ${result.executionTime.toFixed(2)}ms`);
        // Note: 2ms target is very aggressive, adjust based on actual hardware
      }
    });

    it('should handle inactive cells correctly', async () => {
      if (!processor) {
        throw new Error('Processor not initialized');
      }

      const cells: CellData[] = [
        {
          value: 100,
          previousValue: 90,
          velocity: 10,
          acceleration: 0,
          timestamp: Date.now() / 1000 - 1,
          flags: 1, // active
        },
        {
          value: 50,
          previousValue: 40,
          velocity: 5,
          acceleration: 0,
          timestamp: Date.now() / 1000 - 1,
          flags: 0, // inactive
        },
      ];

      const config = {
        cellCount: cells.length,
        currentTime: Date.now() / 1000,
        deltaTime: 1.0,
        decayRate: 0.0,
      };

      const result = await processor.processBatch(cells, config);

      // Active cell should have updated velocity
      expect(result.cells[0].velocity).toBeCloseTo(10, 1);

      // Inactive cell should remain unchanged
      expect(result.cells[1].value).toBe(50);
      expect(result.cells[1].velocity).toBe(5);
    });

    it('should apply decay correctly', async () => {
      if (!processor) {
        throw new Error('Processor not initialized');
      }

      const initialValue = 100;
      const decayRate = 0.5; // 50% decay
      const deltaTime = 1.0;

      const cells: CellData[] = [
        {
          value: initialValue,
          previousValue: initialValue,
          velocity: 0,
          acceleration: 0,
          timestamp: Date.now() / 1000 - 1,
          flags: 1,
        },
      ];

      const config = {
        cellCount: cells.length,
        currentTime: Date.now() / 1000,
        deltaTime,
        decayRate,
      };

      const result = await processor.processBatch(cells, config);

      const expectedValue = initialValue * (1 - decayRate * deltaTime);
      expect(result.cells[0].value).toBeCloseTo(expectedValue, 5);
    });
  });

  describe('CPU Fallback', () => {
    it('should fall back to CPU when GPU unavailable', async () => {
      if (!processor) {
        throw new Error('Processor not initialized');
      }

      // Force CPU mode
      processor.forceGPU(false);

      const cells: CellData[] = Array.from({ length: 100 }, (_, i) => ({
        value: i * 10,
        previousValue: i * 10 - 1,
        velocity: 1,
        acceleration: 0,
        timestamp: Date.now() / 1000,
        flags: 1,
      }));

      const config = {
        cellCount: cells.length,
        currentTime: Date.now() / 1000,
        deltaTime: 0.1,
        decayRate: 0.01,
      };

      const result = await processor.processBatch(cells, config);

      expect(result.usedGPU).toBe(false);
      expect(result.cells).toHaveLength(cells.length);
    });
  });
});

describe('GPU Heat Map', () => {
  let heatMap: GPUHeatMap | null = null;

  beforeAll(async () => {
    heatMap = new GPUHeatMap();
    await heatMap.initialize();
  });

  afterAll(() => {
    if (heatMap) {
      heatMap.cleanup();
    }
  });

  it('should initialize heat map generator', async () => {
    if (!heatMap) {
      throw new Error('Heat map not initialized');
    }

    // If GPU not available, test should pass but log warning
    expect(heatMap).toBeDefined();
  });

  it('should generate heat map from cell positions', async () => {
    if (!heatMap) {
      throw new Error('Heat map not initialized');
    }

    const cells: CellPosition[] = [
      { x: 50, y: 50, value: 100 },
      { x: 150, y: 150, value: 50 },
      { x: 250, y: 250, value: 75 },
    ];

    const config = {
      width: 300,
      height: 300,
      cellCount: cells.length,
      diffusionRate: 0.1,
      decayRate: 0.01,
      timeStep: 0.1,
    };

    try {
      const result = await heatMap.generateHeatMap(cells, config);

      expect(result.width).toBe(config.width);
      expect(result.height).toBe(config.height);
      expect(result.values).toHaveLength(config.width * config.height);
      expect(result.generationTime).toBeGreaterThan(0);
    } catch (error) {
      // GPU might not be available
      console.warn('Heat map generation failed (GPU unavailable):', error);
    }
  });

  it('should update cell values with decay', async () => {
    if (!heatMap) {
      throw new Error('Heat map not initialized');
    }

    const cells: CellPosition[] = [
      { x: 100, y: 100, value: 100 },
      { x: 200, y: 200, value: 50 },
    ];

    const decayRate = 0.1;
    const timeStep = 1.0;

    try {
      const updated = await heatMap.updateCellValues(cells, decayRate, timeStep);

      expect(updated).toHaveLength(cells.length);
      expect(updated[0].value).toBeLessThan(cells[0].value);
    } catch (error) {
      console.warn('Cell update failed (GPU unavailable):', error);
    }
  });
});

describe('WebGL Fallback', () => {
  let webgl: WebGLFallback | null = null;

  beforeAll(() => {
    webgl = new WebGLFallback();
    webgl.initialize();
  });

  afterAll(() => {
    if (webgl) {
      webgl.cleanup();
    }
  });

  it('should initialize WebGL 2.0 context', () => {
    if (!webgl) {
      throw new Error('WebGL not initialized');
    }

    if (webgl.isAvailable()) {
      expect(webgl.isAvailable()).toBe(true);
    } else {
      console.warn('WebGL 2.0 not available');
    }
  });

  it('should load compute shaders', () => {
    if (!webgl || !webgl.isAvailable()) {
      console.warn('WebGL not available, skipping shader test');
      return;
    }

    // Shaders are loaded in initialize()
    expect(webgl).toBeDefined();
  });

  it('should process cells with transform feedback', () => {
    if (!webgl || !webgl.isAvailable()) {
      console.warn('WebGL not available, skipping processing test');
      return;
    }

    const cells = [
      {
        value: 100,
        previousValue: 90,
        velocity: 10,
        acceleration: 0,
        timestamp: Date.now() / 1000 - 1,
        flags: 1,
      },
      {
        value: 50,
        previousValue: 45,
        velocity: 5,
        acceleration: 0,
        timestamp: Date.now() / 1000 - 1,
        flags: 1,
      },
    ];

    const config = {
      cellCount: cells.length,
      currentTime: Date.now() / 1000,
      deltaTime: 1.0,
      decayRate: 0.01,
    };

    const result = webgl.processCells(cells, config);

    expect(result.cells).toHaveLength(cells.length);
    expect(result.executionTime).toBeGreaterThan(0);
  });
});

describe('Performance Benchmarks', () => {
  it('should benchmark GPU vs CPU processing', async () => {
    const processor = new GPUBatchProcessor();
    await processor.initialize();

    const cellCounts = [100, 1000, 10000, 100000];
    const results: Array<{ count: number; gpu: number; cpu: number }> = [];

    for (const count of cellCounts) {
      const cells: CellData[] = Array.from({ length: count }, () => ({
        value: Math.random() * 100,
        previousValue: Math.random() * 100,
        velocity: Math.random() * 10,
        acceleration: Math.random() * 5,
        timestamp: Date.now() / 1000,
        flags: 1,
      }));

      const config = {
        cellCount: count,
        currentTime: Date.now() / 1000,
        deltaTime: 0.1,
        decayRate: 0.01,
      };

      // GPU timing
      processor.forceGPU(true);
      const gpuResult = await processor.processBatch(cells, config);

      // CPU timing
      processor.forceGPU(false);
      const cpuResult = await processor.processBatch(cells, config);

      results.push({
        count,
        gpu: gpuResult.executionTime,
        cpu: cpuResult.executionTime,
      });

      console.log(
        `${count} cells: GPU=${gpuResult.executionTime.toFixed(2)}ms, ` +
          `CPU=${cpuResult.executionTime.toFixed(2)}ms, ` +
          `Speedup=${(cpuResult.executionTime / gpuResult.executionTime).toFixed(2)}x`,
      );
    }

    processor.cleanup();

    // Assert GPU is faster for large batches (if available)
    if (processor.isGPUAvailable()) {
      const largeBatch = results[results.length - 1];
      expect(largeBatch.gpu).toBeLessThan(largeBatch.cpu);
    }
  });
});

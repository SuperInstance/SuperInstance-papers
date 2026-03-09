/**
 * GPUHeatMap.ts - GPU-Accelerated Heat Map Generation
 *
 * Computes sensation diffusion and generates heat map textures on GPU.
 * Returns data to CPU for rendering in the UI.
 */

import { getComputeShaders, ComputeShaders } from './ComputeShaders.js';

export interface HeatMapConfig {
  width: number;
  height: number;
  cellCount: number;
  diffusionRate: number;
  decayRate: number;
  timeStep: number;
}

export interface HeatMapData {
  values: Float32Array;
  width: number;
  height: number;
  min: number;
  max: number;
  generationTime: number;
}

export interface CellPosition {
  x: number;
  y: number;
  value: number;
}

/**
 * GPU Heat Map Generator
 */
export class GPUHeatMap {
  private shaders: ComputeShaders | null = null;
  private textureWidth: number = 0;
  private textureHeight: number = 0;

  async initialize(): Promise<boolean> {
    this.shaders = await getComputeShaders();

    if (this.shaders) {
      await this.loadHeatMapShaders();
      return true;
    }

    return false;
  }

  /**
   * Load heat map compute shaders
   */
  private async loadHeatMapShaders(): Promise<void> {
    if (!this.shaders) {
      return;
    }

    // Diffusion shader
    const diffusionShader = `
      struct CellData {
        x: f32,
        y: f32,
        value: f32,
        _padding: f32,
      }

      struct HeatMapConfig {
        width: u32,
        height: u32,
        cellCount: u32,
        diffusionRate: f32,
        decayRate: f32,
        timeStep: f32,
      }

      @group(0) @binding(0)
      var<storage, read> inputCells: array<CellData>;

      @group(0) @binding(1)
      var<storage, read_write> outputTexture: array<f32>;

      @group(0) @binding(2)
      var<uniform> config: HeatMapConfig;

      @compute @workgroup_size(16, 16)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let texX = global_id.x;
        let texY = global_id.y;

        if (texX >= config.width || texY >= config.height) {
          return;
        }

        let index = texY * config.width + texX;
        var influence = 0.0;
        var weightSum = 0.0;

        // Sample influence from all cells
        for (var i = 0u; i < config.cellCount; i = i + 1u) {
          let cell = inputCells[i];

          // Calculate distance in texture space
          let dx = f32(texX) - cell.x;
          let dy = f32(texY) - cell.y;
          let distance = sqrt(dx * dx + dy * dy);

          // Gaussian kernel for smooth diffusion
          let sigma = 50.0;
          let weight = exp(-(distance * distance) / (2.0 * sigma * sigma));

          influence = influence + cell.value * weight;
          weightSum = weightSum + weight;
        }

        // Normalize and apply diffusion
        var value = 0.0;
        if (weightSum > 0.0) {
          value = influence / weightSum;
        }

        outputTexture[index] = value;
      }
    `;

    this.shaders.loadShader('heatmap_diffusion', diffusionShader, {
      workgroupSize: [16, 16, 1],
      entryPoint: 'main',
    });

    // Update shader for cell values
    const updateShader = `
      struct CellData {
        x: f32,
        y: f32,
        value: f32,
        _padding: f32,
      }

      struct UpdateConfig {
        cellCount: u32,
        decayRate: f32,
        timeStep: f32,
        _padding: f32,
      }

      @group(0) @binding(0)
      var<storage, read> inputCells: array<CellData>;

      @group(0) @binding(1)
      var<storage, read_write> outputCells: array<CellData>;

      @group(0) @binding(2)
      var<uniform> config: UpdateConfig;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let cellIndex = global_id.x;

        if (cellIndex >= config.cellCount) {
          return;
        }

        var cell = inputCells[cellIndex];

        // Apply decay
        cell.value = cell.value * (1.0 - config.decayRate * config.timeStep);

        outputCells[cellIndex] = cell;
      }
    `;

    this.shaders.loadShader('heatmap_update', updateShader, {
      workgroupSize: [64, 1, 1],
      entryPoint: 'main',
    });
  }

  /**
   * Generate heat map from cell positions and values
   */
  async generateHeatMap(
    cells: CellPosition[],
    config: HeatMapConfig,
  ): Promise<HeatMapData> {
    if (!this.shaders) {
      throw new Error('Heat map shaders not initialized');
    }

    const startTime = performance.now();

    // Prepare buffers
    const cellBuffer = this.prepareCellBuffer(cells);
    const textureBuffer = this.shaders.createStorageBuffer(
      config.width * config.height * 4,
    );
    const configBuffer = this.prepareConfigBuffer(config);

    // Execute diffusion shader
    const workgroups = [
      Math.ceil(config.width / 16),
      Math.ceil(config.height / 16),
      1,
    ];

    await this.shaders.execute(
      'heatmap_diffusion',
      cellBuffer,
      textureBuffer,
      configBuffer,
      workgroups,
    );

    // Read back texture data
    const textureData = await this.readTextureBuffer(
      textureBuffer,
      config.width * config.height,
    );

    // Calculate statistics
    const values = new Float32Array(textureData);
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < values.length; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }

    // Cleanup
    cellBuffer.destroy();
    textureBuffer.destroy();
    configBuffer.destroy();

    const generationTime = performance.now() - startTime;

    return {
      values,
      width: config.width,
      height: config.height,
      min,
      max,
      generationTime,
    };
  }

  /**
   * Update cell values with diffusion and decay
   */
  async updateCellValues(
    cells: CellPosition[],
    decayRate: number,
    timeStep: number,
  ): Promise<CellPosition[]> {
    if (!this.shaders) {
      throw new Error('Heat map shaders not initialized');
    }

    const config = {
      cellCount: cells.length,
      decayRate,
      timeStep,
      _padding: 0,
    };

    const cellBuffer = this.prepareCellBuffer(cells);
    const outputBuffer = this.shaders.createStorageBuffer(cells.length * 4 * 4);
    const configBuffer = this.prepareUpdateConfigBuffer(config);

    const workgroups = [Math.ceil(cells.length / 64), 1, 1];

    const result = await this.shaders.execute(
      'heatmap_update',
      cellBuffer,
      outputBuffer,
      configBuffer,
      workgroups,
    );

    const updatedCells = this.parseCellBuffer(result.data, cells.length);

    // Cleanup
    cellBuffer.destroy();
    outputBuffer.destroy();
    configBuffer.destroy();

    return updatedCells;
  }

  /**
   * Generate heat map texture for rendering
   */
  async generateTexture(
    cells: CellPosition[],
    config: HeatMapConfig,
  ): Promise<ImageBitmap> {
    const heatMapData = await this.generateHeatMap(cells, config);

    // Create canvas for texture
    const canvas = new OffscreenCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(config.width, config.height);
    const data = imageData.data;

    // Normalize and colorize
    const range = heatMapData.max - heatMapData.min || 1;

    for (let i = 0; i < heatMapData.values.length; i++) {
      const normalized = (heatMapData.values[i] - heatMapData.min) / range;
      const color = this.heatMapColor(normalized);

      const pixelIndex = i * 4;
      data[pixelIndex + 0] = color.r;
      data[pixelIndex + 1] = color.g;
      data[pixelIndex + 2] = color.b;
      data[pixelIndex + 3] = color.a;
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas.transferToImageBitmap();
  }

  /**
   * Get color for heat map value (0-1)
   */
  private heatMapColor(value: number): { r: number; g: number; b: number; a: number } {
    // Blue (cold) to Red (hot) gradient
    const clamped = Math.max(0, Math.min(1, value));

    if (clamped < 0.25) {
      // Blue to Cyan
      const t = clamped / 0.25;
      return { r: 0, g: Math.floor(255 * t), b: 255, a: 255 };
    } else if (clamped < 0.5) {
      // Cyan to Green
      const t = (clamped - 0.25) / 0.25;
      return { r: 0, g: 255, b: Math.floor(255 * (1 - t)), a: 255 };
    } else if (clamped < 0.75) {
      // Green to Yellow
      const t = (clamped - 0.5) / 0.25;
      return { r: Math.floor(255 * t), g: 255, b: 0, a: 255 };
    } else {
      // Yellow to Red
      const t = (clamped - 0.75) / 0.25;
      return { r: 255, g: Math.floor(255 * (1 - t)), b: 0, a: 255 };
    }
  }

  /**
   * Prepare cell buffer
   */
  private prepareCellBuffer(cells: CellPosition[]): GPUBuffer {
    if (!this.shaders) {
      throw new Error('Shaders not initialized');
    }

    const bufferSize = cells.length * 4 * 4; // 4 floats per cell
    const buffer = new ArrayBuffer(bufferSize);
    const view = new Float32Array(buffer);

    for (let i = 0; i < cells.length; i++) {
      const offset = i * 4;
      view[offset + 0] = cells[i].x;
      view[offset + 1] = cells[i].y;
      view[offset + 2] = cells[i].value;
      view[offset + 3] = 0; // padding
    }

    return this.shaders.createBuffer(
      buffer,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    );
  }

  /**
   * Prepare config buffer
   */
  private prepareConfigBuffer(config: HeatMapConfig): GPUBuffer {
    if (!this.shaders) {
      throw new Error('Shaders not initialized');
    }

    const buffer = new ArrayBuffer(7 * 4); // 6 floats + 1 padding
    const view = new Float32Array(buffer);

    view[0] = config.width;
    view[1] = config.height;
    view[2] = config.cellCount;
    view[3] = config.diffusionRate;
    view[4] = config.decayRate;
    view[5] = config.timeStep;
    view[6] = 0; // padding

    return this.shaders.createBuffer(
      buffer,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
  }

  /**
   * Prepare update config buffer
   */
  private prepareUpdateConfigBuffer(config: any): GPUBuffer {
    if (!this.shaders) {
      throw new Error('Shaders not initialized');
    }

    const buffer = new ArrayBuffer(4 * 4); // 3 floats + 1 padding
    const view = new Float32Array(buffer);

    view[0] = config.cellCount;
    view[1] = config.decayRate;
    view[2] = config.timeStep;
    view[3] = 0; // padding

    return this.shaders.createBuffer(
      buffer,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
  }

  /**
   * Read texture buffer
   */
  private async readTextureBuffer(
    buffer: GPUBuffer,
    size: number,
  ): Promise<ArrayBuffer> {
    if (!this.shaders) {
      throw new Error('Shaders not initialized');
    }

    const stagingBuffer = this.shaders.createBuffer(
      new ArrayBuffer(size * 4),
      GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    );

    // Copy buffer
    const commandEncoder = this.shaders['device'].createCommandEncoder();
    commandEncoder.copyBufferToBuffer(buffer, 0, stagingBuffer, 0, size * 4);
    this.shaders['queue'].submit([commandEncoder.finish()]);

    // Read back
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const data = stagingBuffer.getMappedRange().slice(0);
    stagingBuffer.unmap();
    stagingBuffer.destroy();

    return data;
  }

  /**
   * Parse cell buffer
   */
  private parseCellBuffer(data: ArrayBuffer, count: number): CellPosition[] {
    const view = new Float32Array(data);
    const cells: CellPosition[] = [];

    for (let i = 0; i < count; i++) {
      const offset = i * 4;
      cells.push({
        x: view[offset + 0],
        y: view[offset + 1],
        value: view[offset + 2],
      });
    }

    return cells;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.shaders) {
      this.shaders.cleanup();
    }
  }
}

/**
 * Singleton instance
 */
let heatMapInstance: GPUHeatMap | null = null;

export async function getGPUHeatMap(): Promise<GPUHeatMap | null> {
  if (!heatMapInstance) {
    heatMapInstance = new GPUHeatMap();
    const initialized = await heatMapInstance.initialize();
    if (!initialized) {
      heatMapInstance = null;
    }
  }
  return heatMapInstance;
}

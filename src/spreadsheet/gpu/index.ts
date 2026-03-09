/**
 * GPU Module Index
 *
 * Exports all GPU-accelerated functionality for spreadsheet cell processing.
 */

// Core WebGPU compute shader wrapper
export { ComputeShaders, getComputeShaders } from './ComputeShaders.js';
export type {
  ComputeShaderConfig,
  BufferBinding,
  ComputeResult,
} from './ComputeShaders.js';

// GPU batch processor with CPU fallback
export {
  GPUBatchProcessor,
  CPUBatchProcessor,
  getGPUBatchProcessor,
} from './GPUBatchProcessor.js';
export type {
  CellData,
  BatchProcessConfig,
  BatchProcessResult,
  PerformanceMetrics,
} from './GPUBatchProcessor.js';

// GPU-accelerated heat map generation
export { GPUHeatMap, getGPUHeatMap } from './GPUHeatMap.js';
export type {
  HeatMapConfig,
  HeatMapData,
  CellPosition,
} from './GPUHeatMap.js';

// WebGL 2.0 fallback for compute operations
export { WebGLFallback, getWebGLFallback } from './WebGLFallback.js';
export type {
  WebGLCellData,
  WebGLConfig,
  WebGLResult,
} from './WebGLFallback.js';

// WGSL shader sources (for reference and custom usage)
export { default as cellUpdateShader } from './CellUpdateShader.wgsl';

/**
 * Initialize GPU processing with automatic fallback
 *
 * @returns GPU processor (WebGPU, WebGL, or CPU fallback)
 */
export async function initGPUProcessing() {
  // Try WebGPU first
  const webgpuProcessor = await getGPUBatchProcessor();
  if (webgpuProcessor?.isGPUAvailable()) {
    return {
      type: 'webgpu' as const,
      processor: webgpuProcessor,
      heatMap: await getGPUHeatMap(),
      shaders: await getComputeShaders(),
    };
  }

  // Fall back to WebGL 2.0
  const webglProcessor = getWebGLFallback();
  if (webglProcessor?.isAvailable()) {
    return {
      type: 'webgl' as const,
      processor: webglProcessor,
    };
  }

  // Final fallback to CPU
  return {
    type: 'cpu' as const,
    processor: new CPUBatchProcessor(),
  };
}

/**
 * Get GPU capabilities and info
 */
export async function getGPUCapabilities() {
  const shaders = await getComputeShaders();
  const webgl = getWebGLFallback();

  return {
    webgpu: shaders?.isAvailable() ?? false,
    webgl: webgl?.isAvailable() ?? false,
    webgpuInfo: shaders?.getDeviceInfo() ?? null,
    webglInfo: webgl?.getDeviceInfo() ?? null,
    webgpuHints: shaders?.getPerformanceHints() ?? [],
    webglHints: webgl?.getPerformanceHints() ?? [],
  };
}

/**
 * Check if GPU acceleration is available
 */
export async function isGPUAvailable(): Promise<boolean> {
  const shaders = await getComputeShaders();
  return shaders?.isAvailable() ?? false;
}

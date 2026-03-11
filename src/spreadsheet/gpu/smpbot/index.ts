/**
 * SMPbot GPU Module Index
 *
 * Main entry point for SMPbot GPU acceleration components.
 */

export { GPUMemoryManager, getGPUMemoryManager } from './GPUMemoryManager.js';
export type { GPUBufferInfo, ModelGPUInfo, MemoryPoolConfig } from './GPUMemoryManager.js';

export { ModelManager, getModelManager } from './ModelManager.js';
export type { ModelMetadata, ModelCacheEntry, ModelManagerConfig } from './ModelManager.js';

export { SMPbotGPUExecutor, getSMPbotGPUExecutor } from './SMPbotGPUExecutor.js';
export type { SMPbotGPUState, InferenceConfig, ConfidencePropagationConfig } from './SMPbotGPUExecutor.js';

// Shader exports (for reference)
export const SHADERS = {
  INFERENCE: 'smpbot_inference.wgsl',
  CONFIDENCE: 'confidence_propagation.wgsl',
  BATCH_PROCESSING: 'batch_processing.wgsl',
};

/**
 * Quick initialization function
 */
export async function initializeSMPbotGPU(): Promise<boolean> {
  console.log('🚀 Initializing SMPbot GPU Acceleration');

  try {
    // Initialize GPU executor
    const executor = getSMPbotGPUExecutor();
    const initialized = await executor.initialize();

    if (!initialized) {
      console.error('Failed to initialize SMPbot GPU executor');
      return false;
    }

    // Load shaders
    const shadersLoaded = await Promise.all([
      executor.loadInferenceShader(),
      executor.loadConfidenceShader(),
      executor.loadBatchShader(),
    ]);

    const allShadersLoaded = shadersLoaded.every(loaded => loaded);

    if (!allShadersLoaded) {
      console.error('Failed to load one or more shaders');
      return false;
    }

    console.log('✅ SMPbot GPU Acceleration initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing SMPbot GPU:', error);
    return false;
  }
}

/**
 * Default export for convenience
 */
export default {
  GPUMemoryManager,
  ModelManager,
  SMPbotGPUExecutor,
  initializeSMPbotGPU,
  SHADERS,
};
/**
 * SMPbot Module Index
 *
 * SMPbot = Seed + Model + Prompt = Stable Output
 *
 * Complete implementation of SMPbot type system with:
 * - Core type definitions and interfaces
 * - Concrete implementations with serialization
 * - Stability validation framework
 * - GPU coordination specifications
 * - Tile system integration
 *
 * Based on Round 1 research findings and Round 2 implementation.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export { default as SMPbot } from './SMPbot';
export type {
  Seed,
  SerializedSeed,
  Model,
  ModelParameters,
  Prompt,
  Constraint,
  Context,
  Example,
  Stable,
  StabilityComparison,
  InferenceState,
  GPUExecutionPlan,
  KernelConfig,
  MemoryLayout,
  CommPattern,
  StabilityValidator,
  StabilityReport,
  InputRange,
  Duration,
  DriftDetection,
  StabilizationPlan,
  StabilizationAction,
  Bot,
  Scriptbot,
  TeacherTile,
  Sequential,
  Parallel,
  Conditional,
  Recursive,
} from './SMPbot';

// ============================================================================
// CONCRETE IMPLEMENTATIONS
// ============================================================================

export { default as ConcreteSMPbot, ConcreteSeed, ConcretePrompt } from './ConcreteSMPbot';
export type { ConcreteSMPbot as SMPbotImplementation } from './ConcreteSMPbot';

// ============================================================================
// STABILITY VALIDATION
// ============================================================================

export { default as ConcreteStabilityValidator, StabilityMonitoringService } from './StabilityValidator';
export type {
  ConcreteStabilityValidator as StabilityValidatorImplementation,
  StabilityMonitoringService as StabilityMonitor,
} from './StabilityValidator';

// ============================================================================
// GPU COORDINATION
// ============================================================================

export { default as ConcreteGPUCoordination, GPUSMPbotAdapter } from './GPUCoordination';
export type {
  GPUCoordination,
  GPUCapabilities,
  GPUOptimizedModel,
  GPUMemoryLayout,
  GPUKernelConfig,
  GPUBatchPlan,
  GPUBatch,
  GPUMemoryRequirements,
  GPUComputeRequirements,
  GPUMemoryAllocation,
  GPUBufferAllocation,
  GPUExecutionMetrics,
  ConcreteGPUCoordination as GPUCoordinationImplementation,
  GPUSMPbotAdapter as GPUAdapter,
} from './GPUCoordination';

// ============================================================================
// TILE SYSTEM INTEGRATION
// ============================================================================

export {
  SMPbotAsTile,
  SMPbotTileRegistry,
  SMPbotTileComposition,
  SMPbotTileFactory,
  SMPbotTileMonitor,
} from './TileIntegration';
export type {
  SMPbotAsTile as SMPbotTileAdapter,
  SMPbotTileRegistry as TileRegistry,
  SMPbotTileComposition as TileComposition,
  SMPbotTileFactory as TileFactory,
  SMPbotTileMonitor as TileMonitor,
} from './TileIntegration';

// ============================================================================
// EXAMPLE CREATION
// ============================================================================

/**
 * Create an example SMPbot for demonstration
 */
export async function createExampleSMPbot() {
  const { createExampleSMPbot as createExample } = await import('./ConcreteSMPbot');
  return createExample();
}

/**
 * Create an example SMPbot tile
 */
export async function createExampleSMPbotTile() {
  const { SMPbotTileFactory } = await import('./TileIntegration');
  const exampleBot = await createExampleSMPbot();
  return SMPbotTileFactory.fromSMPbot(exampleBot, {
    id: 'example_smpbot_tile',
    version: '1.0.0',
  });
}

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

/**
 * Initialize SMPbot module with default configurations
 */
export function initializeSMPbotModule(options: {
  enableGPU?: boolean;
  enableMonitoring?: boolean;
  stabilityThreshold?: number;
} = {}) {
  const {
    enableGPU = true,
    enableMonitoring = true,
    stabilityThreshold = 0.7,
  } = options;

  console.log('Initializing SMPbot module with options:', {
    enableGPU,
    enableMonitoring,
    stabilityThreshold,
  });

  // Initialize GPU coordination if enabled
  let gpuCoordination = null;
  if (enableGPU) {
    try {
      const { ConcreteGPUCoordination } = require('./GPUCoordination');
      gpuCoordination = new ConcreteGPUCoordination();
      console.log('GPU coordination initialized');
    } catch (error) {
      console.warn('GPU coordination initialization failed:', error);
    }
  }

  // Initialize stability monitoring if enabled
  let stabilityMonitor = null;
  if (enableMonitoring) {
    try {
      const { StabilityMonitoringService } = require('./StabilityValidator');
      stabilityMonitor = new StabilityMonitoringService();
      console.log('Stability monitoring initialized');
    } catch (error) {
      console.warn('Stability monitoring initialization failed:', error);
    }
  }

  // Initialize tile registry
  const { SMPbotTileRegistry } = require('./TileIntegration');
  const tileRegistry = new SMPbotTileRegistry();

  return {
    gpuCoordination,
    stabilityMonitor,
    tileRegistry,
    options: {
      enableGPU,
      enableMonitoring,
      stabilityThreshold,
    },
  };
}

// ============================================================================
// QUICK START
// ============================================================================

/**
 * Quick start example for using SMPbots
 */
export async function quickStart() {
  console.log('=== SMPbot Quick Start ===');

  // 1. Create an example SMPbot
  const exampleBot = await createExampleSMPbot();
  console.log('1. Created example SMPbot:', exampleBot.id);

  // 2. Create tile from SMPbot
  const tile = await createExampleSMPbotTile();
  console.log('2. Created SMPbot tile:', tile.id);

  // 3. Test execution
  const testInput = 'I feel positive about this implementation';
  try {
    const output = await tile.discriminate(testInput);
    const confidence = await tile.confidence(testInput);
    console.log('3. Test execution:');
    console.log('   Input:', testInput);
    console.log('   Output:', output);
    console.log('   Confidence:', confidence.toFixed(2));
  } catch (error) {
    console.error('3. Test execution failed:', error);
  }

  // 4. Check stability
  const bot = tile.getSMPbot();
  console.log('4. SMPbot stability:', (bot.stabilityScore * 100).toFixed(1) + '%');

  // 5. Peek at inference state
  try {
    const inferenceState = await bot.peek(testInput);
    console.log('5. Inference state peek:', {
      step: inferenceState.step,
      confidenceTrajectory: inferenceState.confidenceTrajectory,
    });
  } catch (error) {
    console.warn('5. Peek not available:', error.message);
  }

  console.log('=== Quick Start Complete ===');
  return { bot, tile };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Core types
  SMPbot,
  ConcreteSMPbot,

  // Stability
  ConcreteStabilityValidator,
  StabilityMonitoringService,

  // GPU
  ConcreteGPUCoordination,
  GPUSMPbotAdapter,

  // Tile integration
  SMPbotAsTile,
  SMPbotTileRegistry,
  SMPbotTileComposition,
  SMPbotTileFactory,
  SMPbotTileMonitor,

  // Utilities
  createExampleSMPbot,
  createExampleSMPbotTile,
  initializeSMPbotModule,
  quickStart,
};
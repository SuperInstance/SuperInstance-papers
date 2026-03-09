/**
 * GPU Module Usage Examples
 *
 * Demonstrates how to use the GPU-accelerated cell processing system.
 */

import {
  getGPUBatchProcessor,
  getGPUHeatMap,
  getComputeShaders,
  CellData,
  CellPosition,
  initGPUProcessing,
  isGPUAvailable,
} from './index.js';

/**
 * Example 1: Basic Batch Processing
 */
export async function basicBatchProcessing() {
  console.log('=== Example 1: Basic Batch Processing ===\n');

  // Initialize GPU processor
  const processor = await getGPUBatchProcessor();
  if (!processor) {
    console.error('Failed to initialize GPU processor');
    return;
  }

  // Check if GPU is available
  console.log(`GPU Available: ${processor.isGPUAvailable()}`);
  console.log(`Fallback Reason: ${processor.getFallbackReason() || 'None'}\n`);

  // Create sample cell data
  const cellCount = 10000;
  const cells: CellData[] = Array.from({ length: cellCount }, (_, i) => ({
    value: Math.random() * 100,
    previousValue: Math.random() * 100,
    velocity: Math.random() * 10,
    acceleration: Math.random() * 5,
    timestamp: Date.now() / 1000,
    flags: 1, // Active
  }));

  // Configure batch processing
  const config = {
    cellCount,
    currentTime: Date.now() / 1000,
    deltaTime: 0.1,
    decayRate: 0.01,
  };

  console.log(`Processing ${cellCount} cells...`);

  // Process batch
  const result = await processor.processBatch(cells, config);

  console.log(`\nResults:`);
  console.log(`  Cells processed: ${result.cells.length}`);
  console.log(`  Execution time: ${result.executionTime.toFixed(2)}ms`);
  console.log(`  Used GPU: ${result.usedGPU}`);
  console.log(`  Throughput: ${result.throughput?.toFixed(0)} cells/sec`);
  console.log(`  First cell value: ${result.cells[0].value.toFixed(2)}`);
  console.log(`  First cell velocity: ${result.cells[0].velocity.toFixed(2)}`);
}

/**
 * Example 2: Heat Map Generation
 */
export async function heatMapGeneration() {
  console.log('\n=== Example 2: Heat Map Generation ===\n');

  // Initialize heat map generator
  const heatMap = await getGPUHeatMap();
  if (!heatMap) {
    console.error('Failed to initialize heat map generator');
    return;
  }

  // Create sample cell positions (simulating sensation sources)
  const cells: CellPosition[] = [
    { x: 100, y: 100, value: 100 },
    { x: 200, y: 150, value: 75 },
    { x: 300, y: 200, value: 50 },
    { x: 150, y: 250, value: 90 },
    { x: 250, y: 100, value: 80 },
  ];

  console.log(`Generating heat map for ${cells.length} cells...`);

  // Configure heat map
  const config = {
    width: 400,
    height: 400,
    cellCount: cells.length,
    diffusionRate: 0.1,
    decayRate: 0.01,
    timeStep: 0.1,
  };

  // Generate heat map
  const result = await heatMap.generateHeatMap(cells, config);

  console.log(`\nResults:`);
  console.log(`  Dimensions: ${result.width}x${result.height}`);
  console.log(`  Value range: ${result.min.toFixed(2)} to ${result.max.toFixed(2)}`);
  console.log(`  Generation time: ${result.generationTime.toFixed(2)}ms`);
  console.log(`  Total pixels: ${result.values.length}`);

  // Generate texture for rendering (if in browser context)
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const bitmap = await heatMap.generateTexture(cells, config);
      console.log(`  Texture generated: ${bitmap.width}x${bitmap.height}`);
    } catch (error) {
      console.log(`  Texture generation not available in this context`);
    }
  }
}

/**
 * Example 3: Performance Benchmark
 */
export async function performanceBenchmark() {
  console.log('\n=== Example 3: Performance Benchmark ===\n');

  const processor = await getGPUBatchProcessor();
  if (!processor) {
    console.error('Failed to initialize GPU processor');
    return;
  }

  const benchmarks = [100, 1000, 10000, 100000];

  console.log('Cell Count | GPU Time | CPU Time | Speedup');
  console.log('-----------|----------|----------|--------');

  for (const count of benchmarks) {
    // Create test data
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

    const speedup = cpuResult.executionTime / gpuResult.executionTime;

    console.log(
      `${count.toString().padStart(10)} | ` +
        `${gpuResult.executionTime.toFixed(2).padStart(8)}ms | ` +
        `${cpuResult.executionTime.toFixed(2).padStart(8)}ms | ` +
        `${speedup.toFixed(1)}x`,
    );
  }
}

/**
 * Example 4: Automatic GPU Selection
 */
export async function automaticGPUSelection() {
  console.log('\n=== Example 4: Automatic GPU Selection ===\n');

  // Check GPU availability
  const hasGPU = await isGPUAvailable();
  console.log(`GPU Available: ${hasGPU}\n`);

  // Initialize with automatic fallback
  const gpuSystem = await initGPUProcessing();

  console.log(`Initialized system type: ${gpuSystem.type}`);

  switch (gpuSystem.type) {
    case 'webgpu':
      console.log('  Using WebGPU for maximum performance');
      console.log(`  Device: ${gpuSystem.shaders?.getDeviceInfo()}`);
      break;
    case 'webgl':
      console.log('  Using WebGL 2.0 transform feedback');
      console.log(`  Device: ${gpuSystem.processor['getDeviceInfo']()}`);
      break;
    case 'cpu':
      console.log('  Using CPU fallback (no GPU acceleration available)');
      break;
  }
}

/**
 * Example 5: Cell Updates with Decay
 */
export async function cellDecayExample() {
  console.log('\n=== Example 5: Cell Updates with Decay ===\n');

  const processor = await getGPUBatchProcessor();
  if (!processor) {
    console.error('Failed to initialize GPU processor');
    return;
  }

  // Create cells with high initial values
  const cells: CellData[] = [
    {
      value: 100,
      previousValue: 100,
      velocity: 0,
      acceleration: 0,
      timestamp: Date.now() / 1000,
      flags: 1,
    },
    {
      value: 80,
      previousValue: 80,
      velocity: 0,
      acceleration: 0,
      timestamp: Date.now() / 1000,
      flags: 1,
    },
    {
      value: 60,
      previousValue: 60,
      velocity: 0,
      acceleration: 0,
      timestamp: Date.now() / 1000,
      flags: 1,
    },
  ];

  const config = {
    cellCount: cells.length,
    currentTime: Date.now() / 1000,
    deltaTime: 1.0, // 1 second
    decayRate: 0.1, // 10% decay per second
  };

  console.log('Initial values:');
  cells.forEach((cell, i) => {
    console.log(`  Cell ${i}: ${cell.value.toFixed(2)}`);
  });

  // Process batch with decay
  const result = await processor.processBatch(cells, config);

  console.log('\nAfter 1 second (with 10% decay):');
  result.cells.forEach((cell, i) => {
    const expected = cells[i].value * (1 - config.decayRate * config.deltaTime);
    console.log(`  Cell ${i}: ${cell.value.toFixed(2)} (expected: ${expected.toFixed(2)})`);
  });
}

/**
 * Example 6: Heat Map Animation
 */
export async function heatMapAnimation() {
  console.log('\n=== Example 6: Heat Map Animation ===\n');

  const heatMap = await getGPUHeatMap();
  if (!heatMap) {
    console.error('Failed to initialize heat map generator');
    return;
  }

  // Initial cell positions
  let cells: CellPosition[] = [
    { x: 200, y: 200, value: 100 },
  ];

  const config = {
    width: 400,
    height: 400,
    cellCount: cells.length,
    diffusionRate: 0.1,
    decayRate: 0.05,
    timeStep: 0.1,
  };

  console.log('Simulating heat map diffusion over 5 steps...');

  for (let step = 0; step < 5; step++) {
    // Update cell values with decay
    cells = await heatMap.updateCellValues(cells, config.decayRate, config.timeStep);

    // Generate heat map
    const result = await heatMap.generateHeatMap(cells, config);

    console.log(`\nStep ${step + 1}:`);
    console.log(`  Cell value: ${cells[0].value.toFixed(2)}`);
    console.log(`  Heat map range: ${result.min.toFixed(2)} to ${result.max.toFixed(2)}`);
    console.log(`  Generation time: ${result.generationTime.toFixed(2)}ms`);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    await basicBatchProcessing();
    await heatMapGeneration();
    await performanceBenchmark();
    await automaticGPUSelection();
    await cellDecayExample();
    await heatMapAnimation();

    console.log('\n=== All Examples Completed ===\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  runAllExamples().catch(console.error);
}

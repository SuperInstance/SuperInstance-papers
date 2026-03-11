/**
 * Test file for RateBasedChangeEngine
 * Demonstrates GPU acceleration for rate-based change mechanics
 */

import { RateBasedChangeEngine, RateCalculationMode, DeadbandAdaptationMode } from '../RateBasedChangeEngine';

/**
 * Simple test demonstrating rate-based change calculations
 */
async function testRateBasedChangeEngine() {
  console.log('=== RateBasedChangeEngine Test ===\n');

  // Create engine with configuration
  const engine = new RateBasedChangeEngine({
    numCells: 100,
    timeStep: 1.0,
    rateMode: RateCalculationMode.FORWARD_DIFFERENCE,
    deadbandMode: DeadbandAdaptationMode.ADAPTIVE_BOTH,
    maxHistoryLength: 10
  });

  // Initialize engine
  console.log('Initializing engine...');
  const initialized = await engine.initialize();

  if (!initialized) {
    console.error('Failed to initialize engine');
    return;
  }

  console.log(`Engine initialized. GPU acceleration: ${engine.isGPUAvailable() ? 'YES' : 'NO'}\n`);

  // Register some cells
  console.log('Registering cells...');
  for (let i = 0; i < 10; i++) {
    engine.registerCell(i, Math.random() * 100);
  }
  console.log('10 cells registered\n');

  // Simulate updates over time
  console.log('Simulating cell updates...');
  const updates = [];
  const startTime = Date.now();

  for (let i = 0; i < 10; i++) {
    // Create updates for all cells
    const cellUpdates = [];
    for (let cellId = 0; cellId < 10; cellId++) {
      // Simulate some value changes
      const valueChange = (Math.random() - 0.5) * 10;
      const currentValue = engine.getCellState(cellId)?.currentValue || 0;

      cellUpdates.push({
        cellId,
        value: currentValue + valueChange,
        timestamp: startTime + i * 100 // 100ms intervals
      });
    }

    updates.push(cellUpdates);
  }

  // Process updates
  console.log('Processing updates...\n');
  for (let i = 0; i < updates.length; i++) {
    const cellUpdates = updates[i];

    console.log(`Update batch ${i + 1}:`);
    console.log(`  Processing ${cellUpdates.length} cell updates...`);

    const startProcessTime = performance.now();
    const result = await engine.updateCells(cellUpdates);
    const endProcessTime = performance.now();

    console.log(`  Processed in ${(endProcessTime - startProcessTime).toFixed(2)}ms`);

    // Display some sample results
    if (i === updates.length - 1) {
      console.log('\n  Final state for cell 0:');
      const cellState = engine.getCellState(0);
      if (cellState) {
        console.log(`    Current value: ${cellState.currentValue.toFixed(2)}`);
        console.log(`    Current rate: ${cellState.currentRate.toFixed(4)}/ms`);
        console.log(`    Acceleration: ${cellState.currentAcceleration.toFixed(6)}/ms²`);
        console.log(`    Anomaly detected: ${cellState.anomalyDetected ? 'YES' : 'NO'}`);
        console.log(`    Reconstruction error: ${cellState.reconstructionError.toFixed(4)}`);
      }
    }
  }

  // Display performance statistics
  console.log('\n=== Performance Statistics ===');
  const stats = engine.getPerformanceStats();
  console.log(`Total cells processed: ${stats.totalCellsProcessed}`);
  console.log(`Total anomalies detected: ${stats.totalAnomaliesDetected}`);
  console.log(`Average reconstruction error: ${stats.averageReconstructionError.toFixed(4)}`);
  console.log(`CPU fallback count: ${stats.cpuFallbackCount}`);
  console.log(`GPU acceleration: ${engine.isGPUAvailable() ? 'Active' : 'Inactive'}`);

  // Display execution statistics
  console.log('\n=== Execution Statistics ===');
  const execStats = engine.getExecutionStats();

  for (const [operation, stat] of execStats.entries()) {
    console.log(`${operation}:`);
    console.log(`  Average: ${stat.average.toFixed(2)}ms`);
    console.log(`  Min: ${stat.min.toFixed(2)}ms`);
    console.log(`  Max: ${stat.max.toFixed(2)}ms`);
    console.log(`  Count: ${stat.count}`);
  }

  // Test deadband adaptation
  console.log('\n=== Deadband Adaptation Test ===');

  // Create a cell with a clear trend
  engine.registerCell(100, 0);

  // Simulate a trend that should trigger anomaly detection
  const trendUpdates = [];
  let currentValue = 0;

  for (let i = 0; i < 20; i++) {
    // Increasing trend
    currentValue += 5 + Math.random() * 2;
    trendUpdates.push({
      cellId: 100,
      value: currentValue,
      timestamp: Date.now() + i * 50 // 50ms intervals
    });
  }

  // Process trend updates
  console.log('Processing trend updates (should trigger anomalies)...');

  let anomalyCount = 0;
  for (const update of trendUpdates) {
    await engine.updateCells([update]);
    const cellState = engine.getCellState(100);

    if (cellState?.anomalyDetected) {
      anomalyCount++;
      console.log(`  Anomaly detected at rate: ${cellState.currentRate.toFixed(2)}/ms`);
    }
  }

  console.log(`Total anomalies in trend: ${anomalyCount}`);

  // Display final deadband configuration
  const finalState = engine.getCellState(100);
  if (finalState) {
    console.log('\nFinal deadband configuration:');
    console.log(`  Lower threshold: ${finalState.deadband.lowerThreshold.toFixed(2)}`);
    console.log(`  Upper threshold: ${finalState.deadband.upperThreshold.toFixed(2)}`);
    console.log(`  Anomaly score: ${finalState.deadband.anomalyScore.toFixed(2)}`);
    console.log(`  Adaptation rate: ${finalState.deadband.adaptationRate}`);
  }

  // Clean up
  engine.cleanup();
  console.log('\n=== Test Complete ===');
}

/**
 * Benchmark test for performance comparison
 */
async function benchmarkRateEngine() {
  console.log('\n=== RateBasedChangeEngine Benchmark ===\n');

  const cellCounts = [10, 100, 1000, 10000];
  const updateCount = 100;

  for (const cellCount of cellCounts) {
    console.log(`Benchmarking with ${cellCount} cells, ${updateCount} updates:`);

    const engine = new RateBasedChangeEngine({
      numCells: cellCount,
      timeStep: 1.0
    });

    await engine.initialize();
    engine.resetStats();

    // Register cells
    for (let i = 0; i < cellCount; i++) {
      engine.registerCell(i, Math.random() * 100);
    }

    // Generate updates
    const allUpdates = [];
    for (let updateIdx = 0; updateIdx < updateCount; updateIdx++) {
      const updates = [];
      for (let cellId = 0; cellId < cellCount; cellId++) {
        updates.push({
          cellId,
          value: Math.random() * 100,
          timestamp: Date.now() + updateIdx * 10
        });
      }
      allUpdates.push(updates);
    }

    // Process updates and measure time
    const startTime = performance.now();

    for (const updates of allUpdates) {
      await engine.updateCells(updates);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const timePerUpdate = totalTime / updateCount;
    const timePerCellPerUpdate = timePerUpdate / cellCount;

    console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Time per update: ${timePerUpdate.toFixed(2)}ms`);
    console.log(`  Time per cell per update: ${timePerCellPerUpdate.toFixed(4)}ms`);
    console.log(`  GPU acceleration: ${engine.isGPUAvailable() ? 'YES' : 'NO'}`);

    const stats = engine.getPerformanceStats();
    console.log(`  Total cells processed: ${stats.totalCellsProcessed}`);
    console.log(`  CPU fallback count: ${stats.cpuFallbackCount}`);

    engine.cleanup();
    console.log('');
  }
}

/**
 * Test higher-order derivatives
 */
async function testHigherOrderDerivatives() {
  console.log('\n=== Higher-Order Derivatives Test ===\n');

  const engine = new RateBasedChangeEngine({
    numCells: 5,
    maxHistoryLength: 20
  });

  await engine.initialize();

  // Register cells
  for (let i = 0; i < 5; i++) {
    engine.registerCell(i, 0);
  }

  // Simulate a sine wave to test derivatives
  console.log('Simulating sine wave for derivative analysis...');

  const frequency = 0.01; // Hz
  const amplitude = 10;
  const startTime = Date.now();

  for (let t = 0; t < 100; t++) {
    const timestamp = startTime + t * 10; // 10ms intervals

    const updates = [];
    for (let cellId = 0; cellId < 5; cellId++) {
      // Different phases for different cells
      const phase = cellId * Math.PI / 2;
      const value = amplitude * Math.sin(2 * Math.PI * frequency * t + phase);

      updates.push({
        cellId,
        value,
        timestamp
      });
    }

    await engine.updateCells(updates);

    // Display derivatives at specific points
    if (t === 25 || t === 50 || t === 75) {
      console.log(`\nAt t = ${t * 10}ms:`);
      const cellState = engine.getCellState(0);

      if (cellState) {
        console.log(`  Cell 0:`);
        console.log(`    Value: ${cellState.currentValue.toFixed(2)}`);
        console.log(`    Rate (dx/dt): ${cellState.currentRate.toFixed(4)}/ms`);
        console.log(`    Acceleration (d²x/dt²): ${cellState.currentAcceleration.toFixed(6)}/ms²`);

        // Note: In a full implementation, we would calculate jerk and snap
        // For now, we can estimate from rate history
        const history = cellState.history;
        if (history.count >= 3) {
          // Simple jerk estimation
          const rates = [];
          const times = [];

          for (let i = 0; i < Math.min(history.count, 3); i++) {
            const idx = (history.head - 1 - i + history.measurements.length) % history.measurements.length;
            const measurement = history.measurements[idx];
            if (measurement) {
              rates.push(measurement.value);
              times.push(measurement.timestamp);
            }
          }

          if (rates.length >= 3 && times.length >= 3) {
            // Jerk = d³x/dt³ ≈ Δa/Δt
            const dt1 = times[0] - times[1];
            const dt2 = times[1] - times[2];
            const avgDt = (dt1 + dt2) / 2;

            if (Math.abs(avgDt) > 0.001) {
              // Acceleration differences
              const a1 = (rates[0] - rates[1]) / dt1;
              const a2 = (rates[1] - rates[2]) / dt2;
              const jerk = (a1 - a2) / avgDt;

              console.log(`    Jerk (d³x/dt³): ${jerk.toFixed(8)}/ms³`);
            }
          }
        }
      }
    }
  }

  engine.cleanup();
}

/**
 * Main test runner
 */
async function runTests() {
  try {
    await testRateBasedChangeEngine();
    await benchmarkRateEngine();
    await testHigherOrderDerivatives();

    console.log('\n=== All Tests Completed Successfully ===');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export {
  testRateBasedChangeEngine,
  benchmarkRateEngine,
  testHigherOrderDerivatives,
  runTests
};
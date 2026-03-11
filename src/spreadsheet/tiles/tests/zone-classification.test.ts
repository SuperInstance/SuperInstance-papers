/**
 * Zone Classification Test Suite
 *
 * Comprehensive tests for the three-zone confidence classification system:
 * - GREEN (≥0.90): Auto-proceed
 * - YELLOW (0.75-0.89): Human review
 * - RED (<0.75): Stop and diagnose
 */

import { classifyZone, ZONE_THRESHOLDS } from '../core/Tile';
import {
  assertZone,
  testZoneBoundary,
  testZoneMonotonicity,
  generateConfidences,
} from './test-utils';

// ============================================================================
// TEST SETUP
// ============================================================================

class TestRunner {
  private tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => void | Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('Running Zone Classification Tests...\n');

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✓ ${name}`);
      } catch (error) {
        this.failed++;
        console.error(`✗ ${name}`);
        console.error(`  Error: ${error}`);
      }
    }

    console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

const runner = new TestRunner();

// ============================================================================
// ZONE THRESHOLD TESTS
// ============================================================================

runner.test('Zone thresholds are correctly defined', () => {
  if (ZONE_THRESHOLDS.green !== 0.90) {
    throw new Error(`GREEN threshold should be 0.90, got ${ZONE_THRESHOLDS.green}`);
  }

  if (ZONE_THRESHOLDS.yellow !== 0.75) {
    throw new Error(`YELLOW threshold should be 0.75, got ${ZONE_THRESHOLDS.yellow}`);
  }

  // Verify thresholds are in correct order
  if (ZONE_THRESHOLDS.green <= ZONE_THRESHOLDS.yellow) {
    throw new Error(`GREEN threshold (${ZONE_THRESHOLDS.green}) should be greater than YELLOW threshold (${ZONE_THRESHOLDS.yellow})`);
  }
});

runner.test('Exact threshold values classification', () => {
  // Test exact threshold values
  testZoneBoundary(0.90, 'GREEN');
  testZoneBoundary(0.75, 'YELLOW');
  testZoneBoundary(0.00, 'RED');
  testZoneBoundary(1.00, 'GREEN');
});

runner.test('Values just above thresholds', () => {
  // Just above GREEN threshold
  testZoneBoundary(0.9001, 'GREEN');
  testZoneBoundary(0.91, 'GREEN');
  testZoneBoundary(0.95, 'GREEN');
  testZoneBoundary(0.99, 'GREEN');

  // Just above YELLOW threshold (but below GREEN)
  testZoneBoundary(0.7501, 'YELLOW');
  testZoneBoundary(0.76, 'YELLOW');
  testZoneBoundary(0.80, 'YELLOW');
  testZoneBoundary(0.89, 'YELLOW');
  testZoneBoundary(0.8999, 'YELLOW');
});

runner.test('Values just below thresholds', () => {
  // Just below GREEN threshold
  testZoneBoundary(0.8999, 'YELLOW');
  testZoneBoundary(0.89, 'YELLOW');
  testZoneBoundary(0.85, 'YELLOW');

  // Just below YELLOW threshold
  testZoneBoundary(0.7499, 'RED');
  testZoneBoundary(0.74, 'RED');
  testZoneBoundary(0.70, 'RED');
  testZoneBoundary(0.50, 'RED');
  testZoneBoundary(0.25, 'RED');
  testZoneBoundary(0.01, 'RED');
});

// ============================================================================
// ZONE MONOTONICITY TESTS
// ============================================================================

runner.test('Zone monotonicity across full range', () => {
  const testPoints = [
    0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7,
    0.74, 0.749, 0.75, 0.751, 0.76, 0.8, 0.85,
    0.89, 0.899, 0.90, 0.901, 0.95, 1.0
  ];

  // Test all pairs
  for (let i = 0; i < testPoints.length; i++) {
    for (let j = 0; j < testPoints.length; j++) {
      testZoneMonotonicity(testPoints[i], testPoints[j]);
    }
  }
});

runner.test('Zone monotonicity with random values', () => {
  const confidences = Array.from(generateConfidences(50));

  // Test random pairs
  for (let i = 0; i < confidences.length; i++) {
    for (let j = 0; j < confidences.length; j++) {
      testZoneMonotonicity(confidences[i], confidences[j]);
    }
  }
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

runner.test('Edge case: negative confidence', () => {
  // Negative values should be RED
  assertZone(-0.1, 'RED', 'Negative confidence should be RED');
  assertZone(-1.0, 'RED', 'Large negative confidence should be RED');
  assertZone(-100.0, 'RED', 'Very negative confidence should be RED');
});

runner.test('Edge case: confidence greater than 1', () => {
  // Values > 1 should be GREEN (treated as 1.0)
  assertZone(1.1, 'GREEN', 'Confidence > 1 should be GREEN');
  assertZone(2.0, 'GREEN', 'Confidence = 2 should be GREEN');
  assertZone(100.0, 'GREEN', 'Very large confidence should be GREEN');
});

runner.test('Edge case: NaN and Infinity', () => {
  // These should be RED (invalid confidence)
  assertZone(NaN, 'RED', 'NaN confidence should be RED');
  assertZone(Infinity, 'RED', 'Infinity confidence should be RED');
  assertZone(-Infinity, 'RED', '-Infinity confidence should be RED');
});

runner.test('Edge case: very small positive values', () => {
  // Very small but positive values should be RED
  assertZone(0.0001, 'RED', 'Very small positive should be RED');
  assertZone(0.001, 'RED', 'Small positive should be RED');
  assertZone(0.01, 'RED', '1% confidence should be RED');
  assertZone(0.1, 'RED', '10% confidence should be RED');
});

// ============================================================================
// ZONE TRANSITION TESTS
// ============================================================================

runner.test('Zone transition: GREEN to YELLOW', () => {
  const greenValues = [0.90, 0.95, 1.0];
  const yellowValues = [0.75, 0.80, 0.89];

  for (const green of greenValues) {
    for (const yellow of yellowValues) {
      // GREEN > YELLOW in zone ordering
      const greenZone = classifyZone(green);
      const yellowZone = classifyZone(yellow);

      if (greenZone !== 'GREEN' || yellowZone !== 'YELLOW') {
        throw new Error(`Zone transition test setup failed: ${green}->${yellow}`);
      }

      // Verify ordering
      testZoneMonotonicity(green, yellow);
    }
  }
});

runner.test('Zone transition: YELLOW to RED', () => {
  const yellowValues = [0.75, 0.80, 0.89];
  const redValues = [0.0, 0.1, 0.5, 0.74];

  for (const yellow of yellowValues) {
    for (const red of redValues) {
      // YELLOW > RED in zone ordering
      const yellowZone = classifyZone(yellow);
      const redZone = classifyZone(red);

      if (yellowZone !== 'YELLOW' || redZone !== 'RED') {
        throw new Error(`Zone transition test setup failed: ${yellow}->${red}`);
      }

      // Verify ordering
      testZoneMonotonicity(yellow, red);
    }
  }
});

runner.test('Zone transition: GREEN to RED', () => {
  const greenValues = [0.90, 0.95, 1.0];
  const redValues = [0.0, 0.1, 0.5, 0.74];

  for (const green of greenValues) {
    for (const red of redValues) {
      // GREEN > RED in zone ordering
      const greenZone = classifyZone(green);
      const redZone = classifyZone(red);

      if (greenZone !== 'GREEN' || redZone !== 'RED') {
        throw new Error(`Zone transition test setup failed: ${green}->${red}`);
      }

      // Verify ordering
      testZoneMonotonicity(green, red);
    }
  }
});

// ============================================================================
// ZONE DISTANCE TESTS
// ============================================================================

runner.test('Distance to next zone boundary', () => {
  // Helper function to calculate distance to next boundary
  function distanceToNextZone(confidence: number): number {
    if (confidence >= ZONE_THRESHOLDS.green) {
      // In GREEN zone, distance to YELLOW boundary
      return confidence - ZONE_THRESHOLDS.green;
    } else if (confidence >= ZONE_THRESHOLDS.yellow) {
      // In YELLOW zone, distance to RED boundary
      return confidence - ZONE_THRESHOLDS.yellow;
    } else {
      // In RED zone, already at bottom
      return confidence; // Distance to 0
    }
  }

  // Test various confidence values
  const testCases = [
    { confidence: 1.0, expectedDistance: 0.10 }, // 1.0 - 0.90 = 0.10
    { confidence: 0.95, expectedDistance: 0.05 }, // 0.95 - 0.90 = 0.05
    { confidence: 0.90, expectedDistance: 0.00 }, // Exactly at boundary
    { confidence: 0.85, expectedDistance: 0.10 }, // 0.85 - 0.75 = 0.10
    { confidence: 0.80, expectedDistance: 0.05 }, // 0.80 - 0.75 = 0.05
    { confidence: 0.75, expectedDistance: 0.00 }, // Exactly at boundary
    { confidence: 0.50, expectedDistance: 0.50 }, // In RED zone
    { confidence: 0.25, expectedDistance: 0.25 }, // In RED zone
    { confidence: 0.00, expectedDistance: 0.00 }, // At bottom
  ];

  for (const { confidence, expectedDistance } of testCases) {
    const distance = distanceToNextZone(confidence);
    if (Math.abs(distance - expectedDistance) > 0.0001) {
      throw new Error(
        `Distance to next zone incorrect for ${confidence}: expected ${expectedDistance}, got ${distance}`
      );
    }
  }
});

// ============================================================================
// ZONE STABILITY TESTS
// ============================================================================

runner.test('Zone classification is stable for repeated calls', () => {
  const testValues = [0.0, 0.5, 0.74, 0.75, 0.76, 0.89, 0.90, 0.91, 1.0];

  for (const confidence of testValues) {
    const zone1 = classifyZone(confidence);
    const zone2 = classifyZone(confidence);
    const zone3 = classifyZone(confidence);

    if (zone1 !== zone2 || zone2 !== zone3) {
      throw new Error(
        `Zone classification not stable for ${confidence}: ${zone1}, ${zone2}, ${zone3}`
      );
    }
  }
});

runner.test('Zone classification with floating point precision', () => {
  // Test values that might have floating point representation issues
  const testCases = [
    { value: 0.1 + 0.2, expectedZone: 'RED' }, // 0.30000000000000004
    { value: 0.3 - 0.2, expectedZone: 'RED' }, // 0.09999999999999998
    { value: 0.75 + 0.000000000000001, expectedZone: 'YELLOW' },
    { value: 0.90 - 0.000000000000001, expectedZone: 'YELLOW' },
  ];

  for (const { value, expectedZone } of testCases) {
    const zone = classifyZone(value);
    if (zone !== expectedZone) {
      throw new Error(
        `Zone classification with floating point ${value}: expected ${expectedZone}, got ${zone}`
      );
    }
  }
});

// ============================================================================
// COMPREHENSIVE ZONE COVERAGE
// ============================================================================

runner.test('Comprehensive zone coverage across full range', () => {
  // Generate many test points across the full range
  const step = 0.01;
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;

  for (let c = 0; c <= 1.0; c += step) {
    const zone = classifyZone(c);

    // Count zones
    if (zone === 'GREEN') greenCount++;
    else if (zone === 'YELLOW') yellowCount++;
    else if (zone === 'RED') redCount++;
    else {
      throw new Error(`Unknown zone: ${zone} for confidence ${c}`);
    }

    // Verify zone matches thresholds
    if (c >= ZONE_THRESHOLDS.green && zone !== 'GREEN') {
      throw new Error(`Confidence ${c} >= ${ZONE_THRESHOLDS.green} but zone is ${zone}`);
    }

    if (c >= ZONE_THRESHOLDS.yellow && c < ZONE_THRESHOLDS.green && zone !== 'YELLOW') {
      throw new Error(`Confidence ${c} in [${ZONE_THRESHOLDS.yellow}, ${ZONE_THRESHOLDS.green}) but zone is ${zone}`);
    }

    if (c < ZONE_THRESHOLDS.yellow && zone !== 'RED') {
      throw new Error(`Confidence ${c} < ${ZONE_THRESHOLDS.yellow} but zone is ${zone}`);
    }
  }

  // Verify we have reasonable distribution
  if (greenCount === 0) throw new Error('No GREEN zones found');
  if (yellowCount === 0) throw new Error('No YELLOW zones found');
  if (redCount === 0) throw new Error('No RED zones found');

  console.log(`Zone distribution: GREEN=${greenCount}, YELLOW=${yellowCount}, RED=${redCount}`);
});

// ============================================================================
// ZONE CLASSIFICATION PERFORMANCE
// ============================================================================

runner.test('Zone classification performance with many calls', () => {
  const iterations = 10000;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const confidence = Math.random();
    classifyZone(confidence);
  }

  const endTime = performance.now();
  const duration = endTime - startTime;
  const avgTime = duration / iterations;

  console.log(`Zone classification performance: ${iterations} iterations in ${duration.toFixed(2)}ms (${avgTime.toFixed(4)}ms/call)`);

  // Performance check (should be very fast)
  if (avgTime > 0.1) { // 0.1ms per call is generous
    throw new Error(`Zone classification too slow: ${avgTime.toFixed(4)}ms per call`);
  }
});

// ============================================================================
// RUN TESTS
// ============================================================================

if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runner };
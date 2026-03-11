/**
 * Confidence Mathematical Property Tests
 *
 * Comprehensive property-based tests for confidence flow validation.
 * Validates the mathematical properties of sequential and parallel composition.
 */

import { Tile, ITile, Schemas } from '../core/Tile';
import { TileChain } from '../core/TileChain';
import {
  MockTile,
  IdentityTile,
  ZeroConfidenceTile,
  PerfectConfidenceTile,
  assertClose,
  assertValidConfidence,
  assertZone,
  testConfidenceRange,
  generateConfidences,
  generateConfidencePairs,
  testSequentialProperty,
  testParallelProperty,
  testAssociativity,
  testIdentity,
  testZeroConfidence,
  testZoneBoundary,
  testZoneMonotonicity,
} from './test-utils';

// ============================================================================
// TEST SETUP
// ============================================================================

/**
 * Simple test runner
 */
class TestRunner {
  private tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => void | Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('Running Confidence Property Tests...\n');

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
// BASIC CONFIDENCE PROPERTIES
// ============================================================================

runner.test('Confidence values are always in [0, 1] range', () => {
  for (const confidence of generateConfidences(50)) {
    assertValidConfidence(confidence);
  }
});

runner.test('Zone classification for extreme values', () => {
  // Test boundaries
  assertZone(0, 'RED', 'Zero confidence should be RED');
  assertZone(1, 'GREEN', 'Perfect confidence should be GREEN');

  // Test just above/below thresholds
  assertZone(0.749, 'RED', '0.749 should be RED');
  assertZone(0.75, 'YELLOW', '0.75 should be YELLOW');
  assertZone(0.899, 'YELLOW', '0.899 should be YELLOW');
  assertZone(0.90, 'GREEN', '0.90 should be GREEN');
});

runner.test('Zone monotonicity property', () => {
  const confidences = Array.from(generateConfidences(20));

  // Test all pairs
  for (let i = 0; i < confidences.length; i++) {
    for (let j = 0; j < confidences.length; j++) {
      testZoneMonotonicity(confidences[i], confidences[j]);
    }
  }
});

// ============================================================================
// SEQUENTIAL COMPOSITION PROPERTIES
// ============================================================================

runner.test('Sequential composition: multiplicative property', async () => {
  // Test with random confidence pairs
  for (const [c1, c2] of generateConfidencePairs(20)) {
    const tileA = new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-A',
      c1,
      `Tile A with confidence ${c1}`
    );

    const tileB = new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-B',
      c2,
      `Tile B with confidence ${c2}`
    );

    await testSequentialProperty(tileA, tileB, 'test-input');
  }
});

runner.test('Sequential composition: associativity', async () => {
  // Create three tiles with random confidences
  const confidences = Array.from(generateConfidences(3));

  const tileA = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-A',
    confidences[0],
    `Tile A`
  );

  const tileB = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-B',
    confidences[1],
    `Tile B`
  );

  const tileC = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-C',
    confidences[2],
    `Tile C`
  );

  await testAssociativity(tileA, tileB, tileC, 'test-input');
});

runner.test('Sequential composition: identity element', async () => {
  // Test with various confidence values
  for (const confidence of generateConfidences(10)) {
    const tile = new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-processed',
      confidence,
      `Tile with confidence ${confidence}`
    );

    await testIdentity(tile, 'test-input');
  }
});

runner.test('Sequential composition: zero confidence property', async () => {
  // Test with various confidence values
  for (const confidence of generateConfidences(10)) {
    const tile = new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-processed',
      confidence,
      `Tile with confidence ${confidence}`
    );

    await testZeroConfidence(tile, 'test-input');
  }
});

runner.test('Sequential composition: confidence degradation in long chains', async () => {
  // Create a chain of 5 tiles with decreasing confidence
  const confidences = [0.95, 0.90, 0.85, 0.80, 0.75];
  const tiles = confidences.map((c, i) =>
    new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + `-step${i}`,
      c,
      `Step ${i} with confidence ${c}`
    )
  );

  // Compose all tiles
  let chain = tiles[0];
  for (let i = 1; i < tiles.length; i++) {
    chain = chain.compose(tiles[i]);
  }

  const finalConfidence = await chain.confidence('start');
  const expectedConfidence = confidences.reduce((a, b) => a * b, 1);

  assertClose(finalConfidence, expectedConfidence, 0.0001,
    `Long chain confidence degradation incorrect: expected ${expectedConfidence}, got ${finalConfidence}`
  );
});

// ============================================================================
// PARALLEL COMPOSITION PROPERTIES
// ============================================================================

runner.test('Parallel composition: averaging property', async () => {
  // Test with random confidence pairs
  for (const [c1, c2] of generateConfidencePairs(20)) {
    const tileA = new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-A',
      c1,
      `Tile A with confidence ${c1}`
    );

    const tileB = new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-B',
      c2,
      `Tile B with confidence ${c2}`
    );

    await testParallelProperty(tileA, tileB, 'test-input');
  }
});

runner.test('Parallel composition: commutativity', async () => {
  for (const [c1, c2] of generateConfidencePairs(10)) {
    const tileA = new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-A',
      c1,
      `Tile A`
    );

    const tileB = new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-B',
      c2,
      `Tile B`
    );

    const parallelAB = tileA.parallel(tileB);
    const parallelBA = tileB.parallel(tileA);

    const confAB = await parallelAB.confidence('test');
    const confBA = await parallelBA.confidence('test');

    assertClose(confAB, confBA, 0.0001,
      `Parallel commutativity failed: ${confAB} vs ${confBA}`
    );
  }
});

runner.test('Parallel composition: idempotence (A || A = A)', async () => {
  for (const confidence of generateConfidences(10)) {
    const tile = new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-processed',
      confidence,
      `Tile with confidence ${confidence}`
    );

    const parallelAA = tile.parallel(tile);
    const confParallel = await parallelAA.confidence('test');
    const confOriginal = await tile.confidence('test');

    assertClose(confParallel, confOriginal, 0.0001,
      `Parallel idempotence failed: ${confOriginal} vs ${confParallel}`
    );
  }
});

runner.test('Parallel composition: preserves higher confidence better than sequential', async () => {
  // Compare parallel vs sequential for same confidence values
  const c1 = 0.9;
  const c2 = 0.7;

  const tileA = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-A',
    c1,
    `Tile A`
  );

  const tileB = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-B',
    c2,
    `Tile B`
  );

  const parallel = tileA.parallel(tileB);
  const sequential = tileA.compose(tileB);

  const confParallel = await parallel.confidence('test');
  const confSequential = await sequential.confidence('test');

  // Parallel should have higher confidence than sequential
  // (0.9 + 0.7)/2 = 0.8 vs 0.9 * 0.7 = 0.63
  if (confParallel <= confSequential) {
    throw new Error(
      `Parallel should preserve confidence better: parallel=${confParallel}, sequential=${confSequential}`
    );
  }
});

// ============================================================================
// MIXED COMPOSITION PROPERTIES
// ============================================================================

runner.test('Mixed composition: sequential of parallels', async () => {
  // (A || B) ; (C || D)
  const confidences = [0.9, 0.8, 0.7, 0.6];

  const tileA = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-A',
    confidences[0],
    `Tile A`
  );

  const tileB = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-B',
    confidences[1],
    `Tile B`
  );

  const tileC = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-C',
    confidences[2],
    `Tile C`
  );

  const tileD = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-D',
    confidences[3],
    `Tile D`
  );

  const parallel1 = tileA.parallel(tileB);
  const parallel2 = tileC.parallel(tileD);
  const composed = parallel1.compose(parallel2);

  const confComposed = await composed.confidence('test');

  // Expected: ((0.9 + 0.8)/2) * ((0.7 + 0.6)/2) = 0.85 * 0.65 = 0.5525
  const expected = ((confidences[0] + confidences[1]) / 2) *
                   ((confidences[2] + confidences[3]) / 2);

  assertClose(confComposed, expected, 0.0001,
    `Mixed composition failed: expected ${expected}, got ${confComposed}`
  );
});

runner.test('Mixed composition: parallel of sequentials', async () => {
  // (A ; B) || (C ; D)
  const confidences = [0.9, 0.8, 0.7, 0.6];

  const tileA = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-A',
    confidences[0],
    `Tile A`
  );

  const tileB = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-B',
    confidences[1],
    `Tile B`
  );

  const tileC = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-C',
    confidences[2],
    `Tile C`
  );

  const tileD = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-D',
    confidences[3],
    `Tile D`
  );

  const sequential1 = tileA.compose(tileB);
  const sequential2 = tileC.compose(tileD);
  const parallel = sequential1.parallel(sequential2);

  const confParallel = await parallel.confidence('test');

  // Expected: (0.9*0.8 + 0.7*0.6)/2 = (0.72 + 0.42)/2 = 0.57
  const expected = (confidences[0] * confidences[1] +
                    confidences[2] * confidences[3]) / 2;

  assertClose(confParallel, expected, 0.0001,
    `Parallel of sequentials failed: expected ${expected}, got ${confParallel}`
  );
});

// ============================================================================
// TILE CHAIN PROPERTIES
// ============================================================================

runner.test('TileChain: confidence multiplication matches manual composition', async () => {
  const confidences = [0.95, 0.90, 0.85];

  const tiles = confidences.map((c, i) =>
    new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + `-step${i}`,
      c,
      `Step ${i}`
    )
  );

  // Build chain using TileChain
  let chain = TileChain.start(tiles[0]);
  for (let i = 1; i < tiles.length; i++) {
    chain = chain.add(tiles[i]);
  }

  // Build chain manually
  let manual = tiles[0];
  for (let i = 1; i < tiles.length; i++) {
    manual = manual.compose(tiles[i]);
  }

  const chainConfidence = await chain.confidence('start');
  const manualConfidence = await manual.confidence('start');
  const expectedConfidence = confidences.reduce((a, b) => a * b, 1);

  assertClose(chainConfidence, manualConfidence, 0.0001,
    `TileChain vs manual composition mismatch: ${chainConfidence} vs ${manualConfidence}`
  );

  assertClose(chainConfidence, expectedConfidence, 0.0001,
    `TileChain confidence incorrect: expected ${expectedConfidence}, got ${chainConfidence}`
  );
});

runner.test('TileChain: execution stops on RED zone', async () => {
  const tiles = [
    new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-A',
      0.95,
      `Tile A`
    ),
    new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-B',
      0.50,  // This will put us in RED zone: 0.95 * 0.50 = 0.475
      `Tile B`
    ),
    new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-C',
      0.90,
      `Tile C`
    ),
  ];

  const chain = TileChain.start(tiles[0])
    .add(tiles[1])
    .add(tiles[2]);

  const result = await chain.execute('start');

  // Should stop at tile B (RED zone)
  if (result.zone !== 'RED') {
    throw new Error(`Expected RED zone, got ${result.zone}`);
  }

  if (result.steps.length !== 2) {
    throw new Error(`Expected 2 steps (stopped at RED), got ${result.steps.length}`);
  }

  // Confidence should be 0.95 * 0.50 = 0.475
  assertClose(result.confidence, 0.95 * 0.50, 0.0001,
    `Confidence incorrect after RED zone stop`
  );
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

runner.test('Edge case: perfect confidence chain', async () => {
  const perfectTile = new PerfectConfidenceTile<string>();
  const chain = perfectTile.compose(perfectTile).compose(perfectTile);

  const confidence = await chain.confidence('test');
  assertClose(confidence, 1.0, 0.0001,
    `Perfect confidence chain should remain 1.0, got ${confidence}`
  );
});

runner.test('Edge case: zero confidence in parallel', async () => {
  const perfectTile = new PerfectConfidenceTile<string>();
  const zeroTile = new ZeroConfidenceTile<string>();

  const parallel = perfectTile.parallel(zeroTile);
  const confidence = await parallel.confidence('test');

  // (1.0 + 0) / 2 = 0.5
  assertClose(confidence, 0.5, 0.0001,
    `Perfect || Zero should be 0.5, got ${confidence}`
  );
});

runner.test('Edge case: very long chain confidence degradation', async () => {
  // Chain of 10 tiles with 0.95 confidence each
  const confidence = 0.95;
  const tile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-processed',
    confidence,
    `Tile with confidence ${confidence}`
  );

  // Compose 10 times
  let chain = tile;
  for (let i = 1; i < 10; i++) {
    chain = chain.compose(tile);
  }

  const finalConfidence = await chain.confidence('test');
  const expectedConfidence = Math.pow(confidence, 10);

  assertClose(finalConfidence, expectedConfidence, 0.0001,
    `Long chain degradation incorrect: expected ${expectedConfidence}, got ${finalConfidence}`
  );

  // Verify it's in RED zone (0.95^10 ≈ 0.5987)
  const zone = classifyZone(finalConfidence);
  if (zone !== 'RED') {
    throw new Error(`Expected RED zone for confidence ${finalConfidence}, got ${zone}`);
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
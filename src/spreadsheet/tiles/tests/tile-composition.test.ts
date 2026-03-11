/**
 * Tile Composition Test Suite
 *
 * Tests for complex tile composition patterns:
 * - Simple and complex chains
 * - Mixed sequential/parallel composition
 * - Branching logic and conditional composition
 * - Type safety and schema compatibility
 */

import { Tile, ITile, Schemas, classifyZone } from '../core/Tile';
import { TileChain } from '../core/TileChain';
import { TileRegistry } from '../core/Registry';
import {
  MockTile,
  IdentityTile,
  ZeroConfidenceTile,
  PerfectConfidenceTile,
  assertClose,
  assertValidConfidence,
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
    console.log('Running Tile Composition Tests...\n');

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
// SIMPLE COMPOSITION TESTS
// ============================================================================

runner.test('Simple 2-tile sequential chain', async () => {
  const tileA = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-A',
    0.9,
    'Tile A'
  );

  const tileB = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-B',
    0.8,
    'Tile B'
  );

  const chain = tileA.compose(tileB);
  const result = await chain.execute('input');

  // Verify output
  if (result.output !== 'input-A-B') {
    throw new Error(`Output incorrect: expected 'input-A-B', got '${result.output}'`);
  }

  // Verify confidence: 0.9 * 0.8 = 0.72
  assertClose(result.confidence, 0.9 * 0.8, 0.0001);

  // Verify zone: 0.72 < 0.75 = RED
  if (result.zone !== 'RED') {
    throw new Error(`Zone incorrect: expected RED for confidence 0.72, got ${result.zone}`);
  }
});

runner.test('Simple 3-tile sequential chain', async () => {
  const tiles = [
    new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-1',
      0.95,
      'Tile 1'
    ),
    new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-2',
      0.90,
      'Tile 2'
    ),
    new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-3',
      0.85,
      'Tile 3'
    ),
  ];

  const chain = tiles[0].compose(tiles[1]).compose(tiles[2]);
  const result = await chain.execute('start');

  // Verify output
  if (result.output !== 'start-1-2-3') {
    throw new Error(`Output incorrect: expected 'start-1-2-3', got '${result.output}'`);
  }

  // Verify confidence: 0.95 * 0.90 * 0.85 = 0.72675
  const expected = 0.95 * 0.90 * 0.85;
  assertClose(result.confidence, expected, 0.0001);

  // Verify zone: 0.72675 < 0.75 = RED
  if (result.zone !== 'RED') {
    throw new Error(`Zone incorrect: expected RED for confidence ${expected}, got ${result.zone}`);
  }
});

runner.test('Simple 2-tile parallel composition', async () => {
  const tileA = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-A',
    0.9,
    'Tile A'
  );

  const tileB = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-B',
    0.7,
    'Tile B'
  );

  const parallel = tileA.parallel(tileB);
  const result = await parallel.execute('input');

  // Verify output is tuple
  if (!Array.isArray(result.output) || result.output.length !== 2) {
    throw new Error(`Output should be tuple of length 2, got ${JSON.stringify(result.output)}`);
  }

  if (result.output[0] !== 'input-A' || result.output[1] !== 'input-B') {
    throw new Error(`Output incorrect: expected ['input-A', 'input-B'], got ${JSON.stringify(result.output)}`);
  }

  // Verify confidence: (0.9 + 0.7) / 2 = 0.8
  assertClose(result.confidence, 0.8, 0.0001);

  // Verify zone: 0.8 in YELLOW
  if (result.zone !== 'YELLOW') {
    throw new Error(`Zone incorrect: expected YELLOW for confidence 0.8, got ${result.zone}`);
  }
});

// ============================================================================
// COMPLEX CHAIN TESTS
// ============================================================================

runner.test('5-tile chain with confidence degradation', async () => {
  const confidences = [0.95, 0.92, 0.88, 0.85, 0.82];
  const tiles = confidences.map((c, i) =>
    new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + `-${i}`,
      c,
      `Tile ${i}`
    )
  );

  // Build chain: ((((t0 ; t1) ; t2) ; t3) ; t4)
  let chain = tiles[0];
  for (let i = 1; i < tiles.length; i++) {
    chain = chain.compose(tiles[i]);
  }

  const result = await chain.execute('start');
  const expectedConfidence = confidences.reduce((a, b) => a * b, 1);

  // Verify confidence degradation
  assertClose(result.confidence, expectedConfidence, 0.0001);

  // Calculate expected zone
  const expectedZone = classifyZone(expectedConfidence);
  if (result.zone !== expectedZone) {
    throw new Error(`Zone incorrect: expected ${expectedZone} for confidence ${expectedConfidence}, got ${result.zone}`);
  }

  console.log(`5-tile chain: confidence degraded from ${confidences[0]} to ${result.confidence} (${result.zone} zone)`);
});

runner.test('Mixed sequential/parallel composition', async () => {
  // Create tiles with different confidences
  const tiles = {
    A: new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-A',
      0.95,
      'Tile A'
    ),
    B: new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-B',
      0.85,
      'Tile B'
    ),
    C: new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-C',
      0.90,
      'Tile C'
    ),
    D: new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-D',
      0.80,
      'Tile D'
    ),
  };

  // Complex composition: (A || B) ; (C || D)
  const parallel1 = tiles.A.parallel(tiles.B);
  const parallel2 = tiles.C.parallel(tiles.D);
  const complexChain = parallel1.compose(parallel2);

  const result = await complexChain.execute('input');

  // Verify output structure
  if (!Array.isArray(result.output) || result.output.length !== 2) {
    throw new Error(`Output should be tuple, got ${JSON.stringify(result.output)}`);
  }

  // Each element should be a string with all transformations
  const [output1, output2] = result.output;
  if (!output1.includes('-A') || !output1.includes('-C')) {
    throw new Error(`First output element incorrect: ${output1}`);
  }
  if (!output2.includes('-B') || !output2.includes('-D')) {
    throw new Error(`Second output element incorrect: ${output2}`);
  }

  // Calculate expected confidence:
  // parallel1: (0.95 + 0.85)/2 = 0.9
  // parallel2: (0.90 + 0.80)/2 = 0.85
  // sequential: 0.9 * 0.85 = 0.765
  const expected = ((0.95 + 0.85) / 2) * ((0.90 + 0.80) / 2);
  assertClose(result.confidence, expected, 0.0001);

  console.log(`Mixed composition: confidence = ${result.confidence} (${result.zone} zone)`);
});

// ============================================================================
// BRANCHING LOGIC TESTS
// ============================================================================

runner.test('Conditional composition with TileChain', async () => {
  // Create tiles for different paths
  const highConfTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-HIGH',
    0.95,
    'High confidence path'
  );

  const lowConfTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-LOW',
    0.70,
    'Low confidence path'
  );

  // Create a simple tile that outputs a number
  const numberTile = new MockTile<string, number>(
    Schemas.string,
    Schemas.number,
    async (input) => input.length,
    0.9,
    'String length tile'
  );

  // Build chain with branch
  const chain = TileChain.start(numberTile)
    .branch(
      (length) => length > 5, // Condition
      highConfTile,           // If true
      lowConfTile             // If false
    );

  // Test with long string (should take high path)
  const result1 = await chain.execute('long-string');
  if (!result1.output.includes('-HIGH')) {
    throw new Error(`Expected HIGH path for long string, got: ${result1.output}`);
  }
  assertClose(result1.confidence, 0.9 * 0.95, 0.0001);

  // Test with short string (should take low path)
  const result2 = await chain.execute('short');
  if (!result2.output.includes('-LOW')) {
    throw new Error(`Expected LOW path for short string, got: ${result2.output}`);
  }
  assertClose(result2.confidence, 0.9 * 0.70, 0.0001);
});

// ============================================================================
// TYPE SAFETY TESTS
// ============================================================================

runner.test('Type-safe composition with schemas', async () => {
  // Create tiles with specific schemas
  const stringToNumber = new MockTile<string, number>(
    Schemas.string,
    Schemas.number,
    async (input) => input.length,
    0.9,
    'String to number'
  );

  const numberToString = new MockTile<number, string>(
    Schemas.number,
    Schemas.string,
    async (input) => `Number: ${input}`,
    0.8,
    'Number to string'
  );

  const numberToBoolean = new MockTile<number, boolean>(
    Schemas.number,
    Schemas.boolean,
    async (input) => input > 10,
    0.85,
    'Number to boolean'
  );

  // Valid composition: string -> number -> string
  const validChain = stringToNumber.compose(numberToString);
  const validResult = await validChain.execute('test');
  if (typeof validResult.output !== 'string') {
    throw new Error(`Output should be string, got ${typeof validResult.output}`);
  }

  // Valid composition: string -> number -> boolean
  const validChain2 = stringToNumber.compose(numberToBoolean);
  const validResult2 = await validChain2.execute('test');
  if (typeof validResult2.output !== 'boolean') {
    throw new Error(`Output should be boolean, got ${typeof validResult2.output}`);
  }

  // Note: TypeScript would catch invalid compositions at compile time
  // stringToString.compose(numberToBoolean) would be a type error
});

runner.test('Schema validation in composition', async () => {
  const strictTile = new MockTile<number, string>(
    {
      type: 'number',
      validate: (v: unknown): v is number => typeof v === 'number' && v >= 0
    },
    Schemas.string,
    async (input) => `Positive: ${input}`,
    0.9,
    'Positive number tile'
  );

  // Valid input
  const validResult = await strictTile.execute(42);
  if (!validResult.output.includes('Positive: 42')) {
    throw new Error(`Valid input failed: ${validResult.output}`);
  }

  // Invalid input should throw
  try {
    await strictTile.execute(-1);
    throw new Error('Should have thrown for negative input');
  } catch (error) {
    // Expected
    if (!(error instanceof Error) || !error.message.includes('Invalid input')) {
      throw new Error(`Unexpected error: ${error}`);
    }
  }
});

// ============================================================================
// REGISTRY INTEGRATION TESTS
// ============================================================================

runner.test('Tile registry composition', async () => {
  const registry = new TileRegistry();

  // Register some tiles
  const tile1 = new MockTile<string, number>(
    Schemas.string,
    Schemas.number,
    async (input) => input.length,
    0.9,
    'Length tile'
  );

  const tile2 = new MockTile<number, string>(
    Schemas.number,
    Schemas.string,
    async (input) => `Length: ${input}`,
    0.85,
    'Format tile'
  );

  registry.register(tile1, { description: 'Get string length', tags: ['string', 'length'] });
  registry.register(tile2, { description: 'Format number as string', tags: ['format', 'string'] });

  // Retrieve and compose
  const retrieved1 = registry.get<string, number>(tile1.id);
  const retrieved2 = registry.get<number, string>(tile2.id);

  if (!retrieved1 || !retrieved2) {
    throw new Error('Failed to retrieve tiles from registry');
  }

  const chain = retrieved1.compose(retrieved2);
  const result = await chain.execute('hello');

  if (result.output !== 'Length: 5') {
    throw new Error(`Expected 'Length: 5', got '${result.output}'`);
  }

  // Verify confidence: 0.9 * 0.85 = 0.765
  assertClose(result.confidence, 0.9 * 0.85, 0.0001);
});

runner.test('Registry chain discovery', () => {
  const registry = new TileRegistry();

  // Register tiles with different input/output types
  const tiles = [
    new MockTile<string, number>(
      Schemas.string,
      Schemas.number,
      async (input) => input.length,
      0.9,
      'A: string->number'
    ),
    new MockTile<number, boolean>(
      Schemas.number,
      Schemas.boolean,
      async (input) => input > 10,
      0.85,
      'B: number->boolean'
    ),
    new MockTile<boolean, string>(
      Schemas.boolean,
      Schemas.string,
      async (input) => input ? 'true' : 'false',
      0.8,
      'C: boolean->string'
    ),
  ];

  tiles.forEach(tile => registry.register(tile));

  // Find chain from string to string
  const chain = registry.findChain('string', 'string');
  if (!chain) {
    throw new Error('Should find chain from string to string');
  }

  if (chain.length !== 3) {
    throw new Error(`Expected chain of length 3, got ${chain.length}`);
  }

  // Verify chain order: string->number->boolean->string
  const [tileA, tileB, tileC] = chain;
  if (tileA.type !== 'A: string->number' ||
      tileB.type !== 'B: number->boolean' ||
      tileC.type !== 'C: boolean->string') {
    throw new Error('Chain order incorrect');
  }
});

// ============================================================================
// PERFORMANCE AND SCALING TESTS
// ============================================================================

runner.test('Large chain composition performance', async () => {
  const chainSize = 10;
  const tiles = Array.from({ length: chainSize }, (_, i) =>
    new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + `-${i}`,
      0.95, // High confidence to avoid early RED zone
      `Tile ${i}`
    )
  );

  const startTime = performance.now();

  // Build chain
  let chain = tiles[0];
  for (let i = 1; i < tiles.length; i++) {
    chain = chain.compose(tiles[i]);
  }

  const buildTime = performance.now() - startTime;

  // Execute chain
  const execStart = performance.now();
  const result = await chain.execute('start');
  const execTime = performance.now() - execStart;

  console.log(`Large chain (${chainSize} tiles): build=${buildTime.toFixed(2)}ms, execute=${execTime.toFixed(2)}ms`);

  // Verify result
  const expectedConfidence = Math.pow(0.95, chainSize);
  assertClose(result.confidence, expectedConfidence, 0.0001);

  // Performance check (should be reasonable)
  if (execTime > 1000) { // 1 second is generous
    throw new Error(`Chain execution too slow: ${execTime.toFixed(2)}ms`);
  }
});

runner.test('Parallel composition scaling', async () => {
  const parallelSize = 5;
  const tiles = Array.from({ length: parallelSize }, (_, i) =>
    new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + `-parallel${i}`,
      0.8 + (i * 0.05), // Varying confidences
      `Parallel tile ${i}`
    )
  );

  const startTime = performance.now();

  // Build parallel composition incrementally
  let parallel = tiles[0];
  for (let i = 1; i < tiles.length; i++) {
    parallel = parallel.parallel(tiles[i]);
  }

  const buildTime = performance.now() - startTime;

  // Execute
  const execStart = performance.now();
  const result = await parallel.execute('input');
  const execTime = performance.now() - execStart;

  console.log(`Parallel composition (${parallelSize} tiles): build=${buildTime.toFixed(2)}ms, execute=${execTime.toFixed(2)}ms`);

  // Verify output is tuple of correct size
  if (!Array.isArray(result.output) || result.output.length !== parallelSize) {
    throw new Error(`Output should be tuple of size ${parallelSize}, got ${JSON.stringify(result.output)}`);
  }

  // Calculate expected average confidence
  const confidences = tiles.map((_, i) => 0.8 + (i * 0.05));
  const expected = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  assertClose(result.confidence, expected, 0.0001);
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

runner.test('Error handling in chain composition', async () => {
  const errorTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => {
      if (input === 'error') {
        throw new Error('Simulated tile error');
      }
      return input + '-processed';
    },
    0.9,
    'Tile that may error'
  );

  const normalTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-normal',
    0.8,
    'Normal tile'
  );

  const chain = errorTile.compose(normalTile);

  // Valid input should work
  const validResult = await chain.execute('valid');
  if (!validResult.output.includes('valid-processed-normal')) {
    throw new Error(`Valid chain execution failed: ${validResult.output}`);
  }

  // Error input should throw
  try {
    await chain.execute('error');
    throw new Error('Should have thrown for error input');
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Simulated tile error')) {
      throw new Error(`Unexpected error: ${error}`);
    }
  }
});

runner.test('Chain validation with invalid composition', () => {
  // Create tiles with incompatible types
  const stringTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-string',
    0.9,
    'String tile'
  );

  const numberTile = new MockTile<number, number>(
    Schemas.number,
    Schemas.number,
    async (input) => input * 2,
    0.8,
    'Number tile'
  );

  // This should fail at runtime when trying to compose
  // (TypeScript would catch this at compile time)
  try {
    // @ts-ignore - intentionally testing runtime error
    stringTile.compose(numberTile);
    throw new Error('Should have thrown for incompatible composition');
  } catch (error) {
    // Expected - composition should fail
    if (!(error instanceof Error)) {
      throw new Error(`Unexpected error type: ${error}`);
    }
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
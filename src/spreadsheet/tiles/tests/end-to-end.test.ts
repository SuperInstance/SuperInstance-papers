/**
 * End-to-End Tile System Integration Test
 *
 * Comprehensive integration tests that validate the complete tile system:
 * - Core tile interfaces and composition
 * - TileChain pipeline execution
 * - Registry discovery and management
 * - Confidence flow across complete system
 * - Zone monitoring and escalation
 */

import { Tile, ITile, Schemas, classifyZone, ZONE_THRESHOLDS } from '../core/Tile';
import { TileChain } from '../core/TileChain';
import { TileRegistry, globalRegistry } from '../core/Registry';
import {
  MockTile,
  IdentityTile,
  PerfectConfidenceTile,
  ZeroConfidenceTile,
  assertClose,
  assertValidConfidence,
  assertZone,
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
    console.log('Running End-to-End Tile System Tests...\n');

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
// COMPLETE SYSTEM INTEGRATION TESTS
// ============================================================================

runner.test('Complete tile system: registration, composition, execution', async () => {
  // Create a fresh registry for test isolation
  const registry = new TileRegistry();

  // Create and register various tiles
  const tiles = {
    textLength: new MockTile<string, number>(
      Schemas.string,
      Schemas.number,
      async (input) => input.length,
      0.95,
      'Text length tile'
    ),
    isEven: new MockTile<number, boolean>(
      Schemas.number,
      Schemas.boolean,
      async (input) => input % 2 === 0,
      0.90,
      'Even check tile'
    ),
    formatResult: new MockTile<boolean, string>(
      Schemas.boolean,
      Schemas.string,
      async (input) => input ? 'Even' : 'Odd',
      0.85,
      'Format result tile'
    ),
  };

  // Register all tiles
  Object.values(tiles).forEach(tile => {
    registry.register(tile, {
      description: `${tile.type} for integration test`,
      tags: ['integration', 'test']
    });
  });

  // Find chain automatically
  const chain = registry.findChain('string', 'string');
  if (!chain || chain.length !== 3) {
    throw new Error('Should find 3-tile chain from string to string');
  }

  // Compose the chain
  const composed = chain[0].compose(chain[1]).compose(chain[2]);

  // Execute with various inputs
  const testCases = [
    { input: 'hello', expectedLength: 5, expectedEven: false, expectedOutput: 'Odd' },
    { input: 'testing', expectedLength: 7, expectedEven: false, expectedOutput: 'Odd' },
    { input: 'four', expectedLength: 4, expectedEven: true, expectedOutput: 'Even' },
  ];

  for (const testCase of testCases) {
    const result = await composed.execute(testCase.input);

    // Verify output
    if (result.output !== testCase.expectedOutput) {
      throw new Error(`Output incorrect for '${testCase.input}': expected '${testCase.expectedOutput}', got '${result.output}'`);
    }

    // Verify confidence calculation
    const expectedConfidence = 0.95 * 0.90 * 0.85; // All tiles' confidences multiplied
    assertClose(result.confidence, expectedConfidence, 0.0001);

    // Verify zone
    const expectedZone = classifyZone(expectedConfidence);
    if (result.zone !== expectedZone) {
      throw new Error(`Zone incorrect: expected ${expectedZone}, got ${result.zone}`);
    }
  }

  console.log('Complete system integration test passed with 3 test cases');
});

runner.test('TileChain with registry integration', async () => {
  const registry = new TileRegistry();

  // Create processing pipeline tiles
  const pipelineTiles = [
    new MockTile<string, string[]>(
      Schemas.string,
      Schemas.array(Schemas.string),
      async (input) => input.split(' '),
      0.95,
      'Split words'
    ),
    new MockTile<string[], number[]>(
      Schemas.array(Schemas.string),
      Schemas.array(Schemas.number),
      async (input) => input.map(word => word.length),
      0.90,
      'Word lengths'
    ),
    new MockTile<number[], number>(
      Schemas.array(Schemas.number),
      Schemas.number,
      async (input) => input.reduce((a, b) => a + b, 0),
      0.85,
      'Sum lengths'
    ),
    new MockTile<number, string>(
      Schemas.number,
      Schemas.string,
      async (input) => `Total characters: ${input}`,
      0.80,
      'Format result'
    ),
  ];

  // Register tiles
  pipelineTiles.forEach((tile, i) => {
    registry.register(tile, {
      description: `Pipeline step ${i + 1}`,
      tags: ['pipeline', 'processing']
    });
  });

  // Build chain using TileChain API
  let chain = TileChain.start(pipelineTiles[0]);
  for (let i = 1; i < pipelineTiles.length; i++) {
    chain = chain.add(pipelineTiles[i]);
  }

  // Execute chain
  const result = await chain.execute('hello world integration test');

  // Verify final output
  if (result.output !== 'Total characters: 26') {
    throw new Error(`Output incorrect: expected 'Total characters: 26', got '${result.output}'`);
  }

  // Verify step-by-step results
  if (result.steps.length !== 4) {
    throw new Error(`Expected 4 steps, got ${result.steps.length}`);
  }

  // Verify confidence flow
  const expectedConfidence = 0.95 * 0.90 * 0.85 * 0.80;
  assertClose(result.confidence, expectedConfidence, 0.0001);

  // Verify zone (0.95*0.90*0.85*0.80 = 0.5814 = RED)
  if (result.zone !== 'RED') {
    throw new Error(`Expected RED zone for confidence ${result.confidence}, got ${result.zone}`);
  }

  console.log(`TileChain integration: ${result.steps.length} steps, confidence ${result.confidence.toFixed(4)} (${result.zone})`);
});

runner.test('Confidence cascade with three-zone model', async () => {
  // Create tiles with varying confidences
  const highConfTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input.toUpperCase(),
    0.95,
    'High confidence tile'
  );

  const mediumConfTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + ' processed',
    0.82,
    'Medium confidence tile'
  );

  const lowConfTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input.split('').reverse().join(''),
    0.70,
    'Low confidence tile'
  );

  // Create chains that will result in different zones
  const greenChain = highConfTile.compose(highConfTile); // 0.95 * 0.95 = 0.9025 (GREEN)
  const yellowChain = highConfTile.compose(mediumConfTile); // 0.95 * 0.82 = 0.779 (YELLOW)
  const redChain = highConfTile.compose(lowConfTile); // 0.95 * 0.70 = 0.665 (RED)

  // Execute and verify zones
  const greenResult = await greenChain.execute('test');
  if (greenResult.zone !== 'GREEN') {
    throw new Error(`Expected GREEN zone for confidence ${greenResult.confidence}, got ${greenResult.zone}`);
  }

  const yellowResult = await yellowChain.execute('test');
  if (yellowResult.zone !== 'YELLOW') {
    throw new Error(`Expected YELLOW zone for confidence ${yellowResult.confidence}, got ${yellowResult.zone}`);
  }

  const redResult = await redChain.execute('test');
  if (redResult.zone !== 'RED') {
    throw new Error(`Expected RED zone for confidence ${redResult.confidence}, got ${redResult.zone}`);
  }

  console.log(`Three-zone model validated: GREEN=${greenResult.confidence.toFixed(3)}, YELLOW=${yellowResult.confidence.toFixed(3)}, RED=${redResult.confidence.toFixed(3)}`);
});

runner.test('System resilience with error recovery', async () => {
  // Test system behavior with failing tiles
  const registry = new TileRegistry();

  // Create tiles with different failure modes
  const reliableTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-reliable',
    0.95,
    'Reliable tile'
  );

  const sometimesFailsTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => {
      if (input.includes('fail')) {
        throw new Error('Simulated failure');
      }
      return input + '-processed';
    },
    0.85,
    'Sometimes fails'
  );

  const fallbackTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => 'FALLBACK: ' + input,
    0.70,
    'Fallback tile'
  );

  registry.register(reliableTile, { tags: ['resilience', 'reliable'] });
  registry.register(sometimesFailsTile, { tags: ['resilience', 'unreliable'] });
  registry.register(fallbackTile, { tags: ['resilience', 'fallback'] });

  // Test normal flow (no failure)
  const normalChain = reliableTile.compose(sometimesFailsTile);
  const normalResult = await normalChain.execute('normal input');
  if (!normalResult.output.includes('normal input-reliable-processed')) {
    throw new Error(`Normal flow failed: ${normalResult.output}`);
  }

  // Test failure flow
  try {
    await normalChain.execute('fail input');
    throw new Error('Should have thrown for failing input');
  } catch (error) {
    // Expected - chain should fail
    if (!(error instanceof Error) || !error.message.includes('Simulated failure')) {
      throw new Error(`Unexpected error: ${error}`);
    }
  }

  // Test with fallback using TileChain branch
  const chainWithFallback = TileChain.start(reliableTile)
    .branch(
      (output) => !output.includes('fail'),
      sometimesFailsTile,
      fallbackTile
    );

  // Normal input should use sometimesFailsTile
  const branchResult1 = await chainWithFallback.execute('normal');
  if (!branchResult1.output.includes('processed')) {
    throw new Error(`Branch should use normal path: ${branchResult1.output}`);
  }

  // Fail input should use fallback
  const branchResult2 = await chainWithFallback.execute('fail test');
  if (!branchResult2.output.includes('FALLBACK')) {
    throw new Error(`Branch should use fallback path: ${branchResult2.output}`);
  }

  console.log('System resilience: normal flow, failure handling, and fallback all working');
});

runner.test('Performance and scaling integration', async () => {
  // Test system performance with realistic workload
  const registry = new TileRegistry();
  const startTime = performance.now();

  // Create and register many tiles
  const tileCount = 20;
  const tiles = Array.from({ length: tileCount }, (_, i) =>
    new MockTile<number, number>(
      Schemas.number,
      Schemas.number,
      async (input) => input + i,
      0.9 + (Math.random() * 0.09), // 0.9 to 0.99
      `Performance tile ${i}`
    )
  );

  tiles.forEach(tile => {
    registry.register(tile, { tags: ['performance', 'scaling'] });
  });

  const registrationTime = performance.now() - startTime;

  // Build and execute multiple chains
  const chainStart = performance.now();
  const chains = [];

  // Create various chain lengths
  for (let chainLength = 2; chainLength <= 5; chainLength++) {
    let chain = TileChain.start(tiles[0]);
    for (let i = 1; i < chainLength; i++) {
      chain = chain.add(tiles[i % tiles.length]);
    }
    chains.push(chain);
  }

  const chainBuildTime = performance.now() - chainStart;

  // Execute all chains
  const execStart = performance.now();
  const results = await Promise.all(
    chains.map((chain, i) => chain.execute(i * 10)) // Different inputs
  );
  const execTime = performance.now() - execStart;

  // Verify results
  let totalConfidence = 0;
  results.forEach((result, i) => {
    assertValidConfidence(result.confidence);
    totalConfidence += result.confidence;
  });

  const avgConfidence = totalConfidence / results.length;

  console.log(`Performance test:`);
  console.log(`  Registration: ${tileCount} tiles in ${registrationTime.toFixed(2)}ms`);
  console.log(`  Chain building: ${chains.length} chains in ${chainBuildTime.toFixed(2)}ms`);
  console.log(`  Execution: ${results.length} chains in ${execTime.toFixed(2)}ms`);
  console.log(`  Average confidence: ${avgConfidence.toFixed(3)}`);

  // Performance requirements (adjust as needed)
  if (execTime > 5000) { // 5 seconds max for this test
    throw new Error(`Execution too slow: ${execTime.toFixed(2)}ms`);
  }
});

runner.test('System-wide confidence consistency', async () => {
  // Validate that confidence calculations are consistent across the system
  const testConfidences = [0.5, 0.75, 0.9, 0.95, 1.0];

  for (const conf of testConfidences) {
    // Create tile with specific confidence
    const tile = new MockTile<string, string>(
      Schemas.string,
      Schemas.string,
      async (input) => input + '-processed',
      conf,
      `Tile with confidence ${conf}`
    );

    // Test standalone
    const standaloneResult = await tile.execute('test');
    assertClose(standaloneResult.confidence, conf, 0.0001);

    // Test in chain
    const chain = tile.compose(tile);
    const chainResult = await chain.confidence('test');
    assertClose(chainResult, conf * conf, 0.0001);

    // Test in parallel
    const parallel = tile.parallel(tile);
    const parallelResult = await parallel.confidence('test');
    assertClose(parallelResult, (conf + conf) / 2, 0.0001);

    // Verify zone classification matches
    const expectedZone = classifyZone(conf);
    if (standaloneResult.zone !== expectedZone) {
      throw new Error(`Zone mismatch for confidence ${conf}: ${standaloneResult.zone} vs ${expectedZone}`);
    }
  }

  console.log(`System confidence consistency validated for ${testConfidences.length} confidence values`);
});

runner.test('Global registry integration', async () => {
  // Test the global registry singleton
  // Clear any existing registrations (in test environment)
  // Note: In production, we'd use a fresh instance, but testing global registry

  // Create a test tile
  const testTile = new MockTile<string, string>(
    Schemas.string,
    Schemas.string,
    async (input) => input + '-global',
    0.95,
    'Global test tile'
  );

  // Register with global registry
  const result = globalRegistry.register(testTile, {
    description: 'Test tile for global registry',
    tags: ['global', 'test']
  });

  if (!result.valid) {
    throw new Error(`Failed to register with global registry: ${JSON.stringify(result.errors)}`);
  }

  // Retrieve from global registry
  const retrieved = globalRegistry.get<string, string>(testTile.id);
  if (!retrieved) {
    throw new Error('Failed to retrieve tile from global registry');
  }

  // Execute retrieved tile
  const executionResult = await retrieved.execute('test');
  if (executionResult.output !== 'test-global') {
    throw new Error(`Global registry execution failed: ${executionResult.output}`);
  }

  // Find by tag
  const foundByTag = globalRegistry.find({ tags: ['global'] });
  if (foundByTag.length === 0) {
    throw new Error('Should find tiles by tag in global registry');
  }

  console.log('Global registry integration: registration, retrieval, and discovery working');
});

// ============================================================================
// COMPREHENSIVE END-TO-END SCENARIO
// ============================================================================

runner.test('Comprehensive end-to-end scenario: text processing pipeline', async () => {
  console.log('\n=== Comprehensive End-to-End Scenario ===');

  // Step 1: Create registry and register all tiles
  const registry = new TileRegistry();
  console.log('Step 1: Creating tile registry...');

  // Define tile factory
  const createTile = <I, O>(
    name: string,
    confidence: number,
    processFn: (input: I) => Promise<O>
  ) => {
    return new MockTile<I, O>(
      Schemas.any,
      Schemas.any,
      processFn,
      confidence,
      name
    );
  };

  // Create text processing pipeline tiles
  const tiles = {
    // Input validation and cleaning
    validate: createTile<string, string>(
      'Input Validator',
      0.98,
      async (input) => {
        if (!input || input.trim().length === 0) {
          throw new Error('Empty input');
        }
        return input.trim();
      }
    ),

    // Text analysis
    tokenize: createTile<string, string[]>(
      'Tokenizer',
      0.95,
      async (input) => input.toLowerCase().split(/\s+/)
    ),

    removeStopWords: createTile<string[], string[]>(
      'Stop Word Remover',
      0.92,
      async (tokens) => {
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at']);
        return tokens.filter(token => !stopWords.has(token));
      }
    ),

    // Feature extraction
    extractFeatures: createTile<string[], Record<string, number>>(
      'Feature Extractor',
      0.88,
      async (tokens) => ({
        tokenCount: tokens.length,
        uniqueTokens: new Set(tokens).size,
        avgTokenLength: tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length || 0,
        hasNumbers: tokens.some(token => /\d/.test(token)),
      })
    ),

    // Classification
    classify: createTile<Record<string, number>, string>(
      'Text Classifier',
      0.85,
      async (features) => {
        if (features.tokenCount === 0) return 'Empty';
        if (features.avgTokenLength > 8) return 'Technical';
        if (features.uniqueTokens / features.tokenCount > 0.7) return 'Diverse';
        if (features.hasNumbers) return 'Numerical';
        return 'General';
      }
    ),

    // Output formatting
    format: createTile<string, string>(
      'Output Formatter',
      0.90,
      async (classification) => `Classification: ${classification}`
    ),
  };

  // Register all tiles
  Object.entries(tiles).forEach(([name, tile]) => {
    registry.register(tile, {
      description: `Tile for ${name}`,
      tags: ['text-processing', 'pipeline', name]
    });
  });

  console.log(`  Registered ${Object.keys(tiles).length} tiles`);

  // Step 2: Build pipeline using TileChain
  console.log('Step 2: Building processing pipeline...');
  const pipeline = TileChain.start(tiles.validate)
    .add(tiles.tokenize)
    .add(tiles.removeStopWords)
    .add(tiles.extractFeatures)
    .add(tiles.classify)
    .add(tiles.format);

  console.log(`  Pipeline has ${pipeline.length} steps`);

  // Step 3: Test with various inputs
  console.log('Step 3: Testing pipeline with various inputs...');
  const testInputs = [
    'The quick brown fox jumps over the lazy dog',
    'Artificial intelligence and machine learning models require extensive training data',
    'The project achieved 95% accuracy with 1000 training samples',
    'Hello world',
    'Quantum computing uses qubits instead of classical bits for computation',
  ];

  let totalConfidence = 0;
  let zoneDistribution = { GREEN: 0, YELLOW: 0, RED: 0 };

  for (const input of testInputs) {
    try {
      const result = await pipeline.execute(input);
      totalConfidence += result.confidence;
      zoneDistribution[result.zone]++;

      console.log(`  "${input.substring(0, 30)}..." → ${result.output}`);
      console.log(`    Confidence: ${result.confidence.toFixed(3)} (${result.zone})`);
    } catch (error) {
      console.log(`  "${input.substring(0, 30)}..." → ERROR: ${error.message}`);
    }
  }

  // Step 4: Analyze results
  console.log('\nStep 4: Analyzing results...');
  const avgConfidence = totalConfidence / testInputs.length;
  console.log(`  Average confidence: ${avgConfidence.toFixed(3)}`);
  console.log(`  Zone distribution: GREEN=${zoneDistribution.GREEN}, YELLOW=${zoneDistribution.YELLOW}, RED=${zoneDistribution.RED}`);

  // Step 5: Validate system properties
  console.log('Step 5: Validating system properties...');

  // Verify confidence degradation is consistent
  const validationResult = await pipeline.confidence('validation input');
  const expectedDegradation = 0.98 * 0.95 * 0.92 * 0.88 * 0.85 * 0.90;
  assertClose(validationResult, expectedDegradation, 0.0001);

  // Verify zone classification
  const expectedZone = classifyZone(expectedDegradation);
  console.log(`  Expected confidence degradation: ${expectedDegradation.toFixed(4)} (${expectedZone})`);

  // Step 6: Test registry functionality
  console.log('Step 6: Testing registry functionality...');
  const foundTiles = registry.find({ tags: ['text-processing'] });
  console.log(`  Found ${foundTiles.length} tiles with 'text-processing' tag`);

  const stats = registry.getStats();
  console.log(`  Registry stats: ${stats.totalTiles} total tiles, ${stats.uniqueTypes} unique types`);

  console.log('\n=== End-to-End Scenario Complete ===');
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
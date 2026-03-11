/**
 * Test Utilities for Tile System Testing
 *
 * Provides mock tiles, test helpers, and property generators
 * for comprehensive confidence flow validation.
 */

import { Tile, ITile, Schemas, classifyZone, ZONE_THRESHOLDS } from '../core/Tile';

// ============================================================================
// MOCK TILE IMPLEMENTATIONS
// ============================================================================

/**
 * Mock tile with fixed confidence
 */
export class MockTile<I, O> extends Tile<I, O> {
  private mockDiscriminate: (input: I) => Promise<O>;
  private mockConfidence: number;
  private mockTrace: string;

  constructor(
    inputSchema: any,
    outputSchema: any,
    discriminateFn: (input: I) => Promise<O>,
    confidence: number,
    trace: string = 'Mock tile execution',
    config?: any
  ) {
    super(inputSchema, outputSchema, config);
    this.mockDiscriminate = discriminateFn;
    this.mockConfidence = confidence;
    this.mockTrace = trace;
  }

  async discriminate(input: I): Promise<O> {
    return this.mockDiscriminate(input);
  }

  async confidence(input: I): Promise<number> {
    return this.mockConfidence;
  }

  async trace(input: I): Promise<string> {
    return this.mockTrace;
  }
}

/**
 * Identity tile with configurable confidence
 */
export class IdentityTile<T> extends Tile<T, T> {
  private fixedConfidence: number;

  constructor(confidence: number = 1.0) {
    super(Schemas.any, Schemas.any, { id: `identity_${confidence}` });
    this.fixedConfidence = confidence;
  }

  async discriminate(input: T): Promise<T> {
    return input;
  }

  async confidence(input: T): Promise<number> {
    return this.fixedConfidence;
  }

  async trace(input: T): Promise<string> {
    return `Identity tile with confidence ${this.fixedConfidence}`;
  }
}

/**
 * Zero confidence tile (always returns 0 confidence)
 */
export class ZeroConfidenceTile<T> extends Tile<T, T> {
  constructor() {
    super(Schemas.any, Schemas.any, { id: 'zero-confidence' });
  }

  async discriminate(input: T): Promise<T> {
    return input;
  }

  async confidence(input: T): Promise<number> {
    return 0;
  }

  async trace(input: T): Promise<string> {
    return 'Zero confidence tile';
  }
}

/**
 * Perfect confidence tile (always returns 1.0 confidence)
 */
export class PerfectConfidenceTile<T> extends Tile<T, T> {
  constructor() {
    super(Schemas.any, Schemas.any, { id: 'perfect-confidence' });
  }

  async discriminate(input: T): Promise<T> {
    return input;
  }

  async confidence(input: T): Promise<number> {
    return 1.0;
  }

  async trace(input: T): Promise<string> {
    return 'Perfect confidence tile';
  }
}

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Assert two numbers are equal within tolerance
 */
export function assertClose(
  actual: number,
  expected: number,
  tolerance: number = 0.0001,
  message?: string
): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      message || `Expected ${expected} ± ${tolerance}, got ${actual}`
    );
  }
}

/**
 * Assert confidence is in valid range [0, 1]
 */
export function assertValidConfidence(
  confidence: number,
  message?: string
): void {
  if (confidence < 0 || confidence > 1 || isNaN(confidence)) {
    throw new Error(
      message || `Confidence ${confidence} is not in valid range [0, 1]`
    );
  }
}

/**
 * Assert zone classification is correct
 */
export function assertZone(
  confidence: number,
  expectedZone: 'GREEN' | 'YELLOW' | 'RED',
  message?: string
): void {
  const actualZone = classifyZone(confidence);
  if (actualZone !== expectedZone) {
    throw new Error(
      message || `Expected zone ${expectedZone} for confidence ${confidence}, got ${actualZone}`
    );
  }
}

/**
 * Run test with multiple confidence values
 */
export function testConfidenceRange(
  testFn: (confidence: number) => void,
  start: number = 0,
  end: number = 1,
  step: number = 0.1
): void {
  for (let c = start; c <= end; c += step) {
    testFn(c);
  }
}

/**
 * Generate random confidence values for property testing
 */
export function* generateConfidences(
  count: number = 100,
  includeBoundaries: boolean = true
): Generator<number> {
  const boundaries = includeBoundaries
    ? [0, 0.25, 0.5, 0.75, 0.9, 1.0, ZONE_THRESHOLDS.yellow, ZONE_THRESHOLDS.green]
    : [];

  // Include boundary values
  for (const boundary of boundaries) {
    yield boundary;
    yield boundary - 0.001;
    yield boundary + 0.001;
  }

  // Generate random values
  for (let i = 0; i < count - boundaries.length * 3; i++) {
    yield Math.random();
  }
}

/**
 * Generate confidence pairs for composition testing
 */
export function* generateConfidencePairs(
  count: number = 50
): Generator<[number, number]> {
  const confidences = Array.from(generateConfidences(count * 2, false));
  for (let i = 0; i < count; i++) {
    yield [confidences[i * 2], confidences[i * 2 + 1]];
  }
}

// ============================================================================
// PROPERTY TEST GENERATORS
// ============================================================================

/**
 * Test sequential composition property: c(A ; B) = c(A) × c(B)
 */
export async function testSequentialProperty(
  tileA: ITile<any, any>,
  tileB: ITile<any, any>,
  input: any
): Promise<void> {
  const confA = await tileA.confidence(input);
  const intermediate = await tileA.discriminate(input);
  const confB = await tileB.confidence(intermediate);

  const composed = tileA.compose(tileB);
  const confComposed = await composed.confidence(input);

  const expected = confA * confB;
  assertClose(confComposed, expected, 0.0001,
    `Sequential composition failed: ${confA} × ${confB} = ${expected}, got ${confComposed}`
  );
}

/**
 * Test parallel composition property: c(A || B) = (c(A) + c(B)) / 2
 */
export async function testParallelProperty(
  tileA: ITile<any, any>,
  tileB: ITile<any, any>,
  input: any
): Promise<void> {
  const [confA, confB] = await Promise.all([
    tileA.confidence(input),
    tileB.confidence(input)
  ]);

  const parallel = tileA.parallel(tileB);
  const confParallel = await parallel.confidence(input);

  const expected = (confA + confB) / 2;
  assertClose(confParallel, expected, 0.0001,
    `Parallel composition failed: (${confA} + ${confB}) / 2 = ${expected}, got ${confParallel}`
  );
}

/**
 * Test associativity: (A ; B) ; C = A ; (B ; C)
 */
export async function testAssociativity(
  tileA: ITile<any, any>,
  tileB: ITile<any, any>,
  tileC: ITile<any, any>,
  input: any
): Promise<void> {
  const leftAssoc = tileA.compose(tileB).compose(tileC);
  const rightAssoc = tileA.compose(tileB.compose(tileC));

  const confLeft = await leftAssoc.confidence(input);
  const confRight = await rightAssoc.confidence(input);

  assertClose(confLeft, confRight, 0.0001,
    `Associativity failed: left=${confLeft}, right=${confRight}`
  );
}

/**
 * Test identity: A ; Identity = Identity ; A = A
 */
export async function testIdentity(
  tile: ITile<any, any>,
  input: any
): Promise<void> {
  const identity = new IdentityTile();
  const confOriginal = await tile.confidence(input);

  // Right identity: A ; Identity
  const rightIdentity = tile.compose(identity);
  const confRight = await rightIdentity.confidence(input);
  assertClose(confRight, confOriginal, 0.0001,
    `Right identity failed: ${confOriginal} vs ${confRight}`
  );

  // Left identity: Identity ; A
  const leftIdentity = identity.compose(tile);
  const confLeft = await leftIdentity.confidence(input);
  assertClose(confLeft, confOriginal, 0.0001,
    `Left identity failed: ${confOriginal} vs ${confLeft}`
  );
}

/**
 * Test zero confidence: A ; Zero = 0
 */
export async function testZeroConfidence(
  tile: ITile<any, any>,
  input: any
): Promise<void> {
  const zeroTile = new ZeroConfidenceTile();
  const composed = tile.compose(zeroTile);
  const conf = await composed.confidence(input);

  assertClose(conf, 0, 0.0001,
    `Zero confidence property failed: expected 0, got ${conf}`
  );
}

// ============================================================================
// ZONE TEST HELPERS
// ============================================================================

/**
 * Test zone boundary conditions
 */
export function testZoneBoundary(
  confidence: number,
  expectedZone: 'GREEN' | 'YELLOW' | 'RED'
): void {
  const zone = classifyZone(confidence);
  if (zone !== expectedZone) {
    throw new Error(
      `Zone boundary test failed: confidence ${confidence} should be ${expectedZone}, got ${zone}`
    );
  }
}

/**
 * Test zone monotonicity: if c1 ≥ c2 then zone(c1) ≥ zone(c2)
 */
export function testZoneMonotonicity(c1: number, c2: number): void {
  const zone1 = classifyZone(c1);
  const zone2 = classifyZone(c2);

  // Zone ordering: GREEN > YELLOW > RED
  const zoneOrder = { GREEN: 3, YELLOW: 2, RED: 1 };

  if (c1 >= c2 && zoneOrder[zone1] < zoneOrder[zone2]) {
    throw new Error(
      `Zone monotonicity violated: ${c1} (${zone1}) ≥ ${c2} (${zone2}) but zone decreased`
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
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
};
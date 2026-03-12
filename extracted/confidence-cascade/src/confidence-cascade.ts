/**
 * CONFIDENCE CASCADES - Proof of Concept
 *
 * Confidence flows through tiles like water through pipes.
 * Each tile adds its own confidence, and the result cascades downstream.
 *
 * Think of it like a fishing net - if any mesh tears, the whole thing's compromised.
 * But sometimes you need multiple nets (parallel), and you trust some more than others.
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Three-zone model for confidence classification
 */
export enum ConfidenceZone {
  GREEN = 'GREEN',     // 0.85 - 1.0: Full steam ahead
  YELLOW = 'YELLOW',   // 0.60 - 0.85: Proceed with caution
  RED = 'RED'          // 0.00 - 0.60: Stop the boat
}

/**
 * Core confidence value wrapper
 */
export interface Confidence {
  value: number;              // 0.0 to 1.0
  zone: ConfidenceZone;       // Auto-calculated zone
  source: string;             // What generated this confidence
  timestamp: number;          // When it was generated
}

/**
 * Configuration for cascade thresholds
 */
export interface CascadeConfig {
  greenThreshold: number;     // Default: 0.85
  yellowThreshold: number;    // Default: 0.60
  redThreshold: number;       // Default: 0.00 (implicit)
  escalateOnYellow: boolean;  // Trigger escalation in yellow zone
  escalateOnRed: boolean;     // Trigger escalation in red zone
}

/**
 * Result of a cascade operation
 */
export interface CascadeResult {
  confidence: Confidence;
  steps: CascadeStep[];
  escalationTriggered: boolean;
  escalationLevel: EscalationLevel;
}

/**
 * Single step in a cascade
 */
export interface CascadeStep {
  operation: 'sequential' | 'parallel' | 'conditional';
  inputs: Confidence[];
  output: Confidence;
  metadata?: Record<string, any>;
}

/**
 * Escalation levels for low confidence
 */
export enum EscalationLevel {
  NONE = 'NONE',              // GREEN zone - auto-proceed
  NOTICE = 'NOTICE',          // YELLOW zone - log and continue
  WARNING = 'WARNING',        // YELLOW deep - flag for review
  ALERT = 'ALERT',            // RED zone - stop and require human
  CRITICAL = 'CRITICAL'       // RED deep - immediate intervention
}

/**
 * Parallel composition with weights
 */
export interface ParallelBranch {
  confidence: Confidence;
  weight: number;             // Relative importance (sum normalized to 1.0)
}

/**
 * Conditional path with predicate result
 */
export interface ConditionalPath {
  confidence: Confidence;
  predicate: boolean;         // Whether this path was taken
  description: string;        // Why this path was/wasn't taken
}

// ============================================================================
// CONFIDENCE FACTORY
// ============================================================================

/**
 * Create a new confidence value
 * @param value - Confidence value (0.0 to 1.0)
 * @param source - What generated this confidence
 * @param config - Optional cascade config
 */
export function createConfidence(
  value: number,
  source: string,
  config?: Partial<CascadeConfig>
): Confidence {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (value < 0 || value > 1) {
    throw new Error(`Confidence must be between 0 and 1, got ${value}`);
  }

  return {
    value,
    zone: classifyZone(value, finalConfig),
    source,
    timestamp: Date.now()
  };
}

/**
 * Classify a confidence value into a zone
 */
function classifyZone(
  value: number,
  config: CascadeConfig
): ConfidenceZone {
  if (value >= config.greenThreshold) return ConfidenceZone.GREEN;
  if (value >= config.yellowThreshold) return ConfidenceZone.YELLOW;
  return ConfidenceZone.RED;
}

/**
 * Default cascade configuration
 */
const DEFAULT_CONFIG: CascadeConfig = {
  greenThreshold: 0.85,
  yellowThreshold: 0.60,
  redThreshold: 0.00,
  escalateOnYellow: false,
  escalateOnRed: true
};

// ============================================================================
// CASCADE COMPOSITIONS
// ============================================================================

/**
 * SEQUENTIAL COMPOSITION
 *
 * Confidence multiplies through the chain.
 * If you have 5 steps at 90% confidence each: 0.9^5 = 0.59
 * That's RED zone - the chain degrades fast.
 *
 * Example: Validating a transaction
 *   Step 1: Format check (0.95)
 *   Step 2: Amount range (0.90)
 *   Step 3: User history (0.85)
 *   Step 4: Risk score (0.80)
 *   Result: 0.95 * 0.90 * 0.85 * 0.80 = 0.58 (RED)
 *
 * This tells you: your chain is too long or individual steps are too weak.
 *
 * @param confidences - Array of confidences in sequence
 * @param config - Optional cascade config
 */
export function sequentialCascade(
  confidences: Confidence[],
  config?: Partial<CascadeConfig>
): CascadeResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const steps: CascadeStep[] = [];

  let accumulatedConfidence = 1.0;

  for (const conf of confidences) {
    const previous = accumulatedConfidence;
    accumulatedConfidence *= conf.value;

    steps.push({
      operation: 'sequential',
      inputs: [
        createConfidence(previous, 'accumulated', finalConfig),
        conf
      ],
      output: createConfidence(accumulatedConfidence, 'sequential', finalConfig),
      metadata: {
        previous,
        multiplier: conf.value,
        degradation: previous - accumulatedConfidence
      }
    });
  }

  const finalConfidence = createConfidence(
    accumulatedConfidence,
    'sequential_complete',
    finalConfig
  );

  return {
    confidence: finalConfidence,
    steps,
    escalationTriggered: shouldEscalate(finalConfidence, finalConfig),
    escalationLevel: getEscalationLevel(finalConfidence, finalConfig)
  };
}

/**
 * PARALLEL COMPOSITION
 *
 * Confidence averages with weights.
 * Different validators can have different importance.
 *
 * Example: Fraud detection with multiple signals
 *   Signal 1: ML model (weight 0.5, confidence 0.95)
 *   Signal 2: Rules engine (weight 0.3, confidence 0.70)
 *   Signal 3: User reputation (weight 0.2, confidence 0.85)
 *   Result: 0.5*0.95 + 0.3*0.70 + 0.2*0.85 = 0.87 (GREEN)
 *
 * Even though one signal is weak, the strong ML model carries it.
 *
 * @param branches - Array of weighted parallel branches
 * @param config - Optional cascade config
 */
export function parallelCascade(
  branches: ParallelBranch[],
  config?: Partial<CascadeConfig>
): CascadeResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Normalize weights
  const totalWeight = branches.reduce((sum, b) => sum + b.weight, 0);
  const normalizedBranches = branches.map(b => ({
    ...b,
    weight: b.weight / totalWeight
  }));

  // Calculate weighted average
  const weightedSum = normalizedBranches.reduce(
    (sum, b) => sum + b.confidence.value * b.weight,
    0
  );

  const finalConfidence = createConfidence(
    weightedSum,
    'parallel_complete',
    finalConfig
  );

  return {
    confidence: finalConfidence,
    steps: [{
      operation: 'parallel',
      inputs: branches.map(b => b.confidence),
      output: finalConfidence,
      metadata: {
        weights: normalizedBranches.map(b => ({
          source: b.confidence.source,
          weight: b.weight,
          contribution: b.confidence.value * b.weight
        }))
      }
    }],
    escalationTriggered: shouldEscalate(finalConfidence, finalConfig),
    escalationLevel: getEscalationLevel(finalConfidence, finalConfig)
  };
}

/**
 * CONDITIONAL COMPOSITION
 *
 * Confidence depends on which path was taken.
 * Different validation paths have different confidence requirements.
 *
 * Example: Transaction routing
 *   If amount < $1000: Basic validation (confidence 0.90)
 *   If amount >= $1000: Enhanced validation (confidence 0.95)
 *   If amount >= $10000: Manual review (confidence 0.99)
 *
 * The chosen path's confidence becomes the result.
 *
 * @param paths - Array of potential paths with predicates
 * @param config - Optional cascade config
 */
export function conditionalCascade(
  paths: ConditionalPath[],
  config?: Partial<CascadeConfig>
): CascadeResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Find the active path (should be exactly one)
  const activePaths = paths.filter(p => p.predicate);

  if (activePaths.length === 0) {
    throw new Error('No active path found in conditional cascade');
  }

  if (activePaths.length > 1) {
    throw new Error('Multiple active paths found - conditional must have exactly one');
  }

  const activePath = activePaths[0];
  const finalConfidence = createConfidence(
    activePath.confidence.value,
    `conditional:${activePath.description}`,
    finalConfig
  );

  return {
    confidence: finalConfidence,
    steps: [{
      operation: 'conditional',
      inputs: paths.map(p => p.confidence),
      output: finalConfidence,
      metadata: {
        chosenPath: activePath.description,
        allPaths: paths.map(p => ({
          description: p.description,
          active: p.predicate,
          confidence: p.confidence.value
        }))
      }
    }],
    escalationTriggered: shouldEscalate(finalConfidence, finalConfig),
    escalationLevel: getEscalationLevel(finalConfidence, finalConfig)
  };
}

// ============================================================================
// ESCALATION
// ============================================================================

/**
 * Determine if escalation should occur
 */
function shouldEscalate(
  confidence: Confidence,
  config: CascadeConfig
): boolean {
  if (confidence.zone === ConfidenceZone.RED && config.escalateOnRed) {
    return true;
  }
  if (confidence.zone === ConfidenceZone.YELLOW && config.escalateOnYellow) {
    return true;
  }
  return false;
}

/**
 * Get escalation level based on confidence
 */
function getEscalationLevel(
  confidence: Confidence,
  config: CascadeConfig
): EscalationLevel {
  if (confidence.zone === ConfidenceZone.RED) {
    if (confidence.value < config.yellowThreshold / 2) {
      return EscalationLevel.CRITICAL;
    }
    return EscalationLevel.ALERT;
  }

  if (confidence.zone === ConfidenceZone.YELLOW) {
    if (confidence.value < (config.greenThreshold + config.yellowThreshold) / 2) {
      return EscalationLevel.WARNING;
    }
    return EscalationLevel.NOTICE;
  }

  return EscalationLevel.NONE;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format confidence for display
 */
export function formatConfidence(confidence: Confidence): string {
  return `[${confidence.zone}] ${(confidence.value * 100).toFixed(1)}% - ${confidence.source}`;
}

/**
 * Check if confidence meets minimum threshold
 */
export function meetsThreshold(
  confidence: Confidence,
  threshold: number
): boolean {
  return confidence.value >= threshold;
}

/**
 * Get confidence degradation rate
 */
export function degradationRate(steps: CascadeStep[]): number {
  if (steps.length < 2) return 0;

  const firstValue = steps[0].inputs[0].value;
  const lastValue = steps[steps.length - 1].output.value;

  return (firstValue - lastValue) / firstValue;
}

// ============================================================================
// REAL-WORLD EXAMPLE: FRAUD DETECTION
// ============================================================================

/**
 * FRAUD DETECTION EXAMPLE
 *
 * Real-world scenario: Validating a credit card transaction
 * Multiple signals combine to make a decision
 * Different paths for different risk levels
 */

export interface FraudDetectionSignals {
  mlScore: number;           // ML model confidence (0-1)
  rulesScore: number;        // Rules engine confidence (0-1)
  userReputation: number;    // User's historical reputation (0-1)
  transactionAmount: number; // Amount in dollars
  userLocationMatch: boolean; // Does location match history?
}

/**
 * Complete fraud detection cascade
 */
export function fraudDetectionCascade(
  signals: FraudDetectionSignals,
  config?: Partial<CascadeConfig>
): CascadeResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Step 1: Parallel cascade for initial signals
  const parallelResult = parallelCascade([
    {
      confidence: createConfidence(
        signals.mlScore,
        'ml_model',
        finalConfig
      ),
      weight: 0.5  // ML model carries most weight
    },
    {
      confidence: createConfidence(
        signals.rulesScore,
        'rules_engine',
        finalConfig
      ),
      weight: 0.3  // Rules provide guardrails
    },
    {
      confidence: createConfidence(
        signals.userReputation,
        'user_reputation',
        finalConfig
      ),
      weight: 0.2  // Reputation matters but less
    }
  ], finalConfig);

  // Step 2: Conditional based on transaction amount
  let pathConfidence: number;

  if (signals.transactionAmount < 1000) {
    // Small transactions - lower bar
    pathConfidence = 0.85;
  } else if (signals.transactionAmount < 10000) {
    // Medium transactions - medium bar
    pathConfidence = 0.90;
  } else {
    // Large transactions - high bar
    pathConfidence = 0.95;
  }

  const conditionalResult = conditionalCascade([
    {
      confidence: createConfidence(pathConfidence, 'threshold_small', finalConfig),
      predicate: signals.transactionAmount < 1000,
      description: 'small_transaction'
    },
    {
      confidence: createConfidence(pathConfidence, 'threshold_medium', finalConfig),
      predicate: signals.transactionAmount >= 1000 && signals.transactionAmount < 10000,
      description: 'medium_transaction'
    },
    {
      confidence: createConfidence(pathConfidence, 'threshold_large', finalConfig),
      predicate: signals.transactionAmount >= 10000,
      description: 'large_transaction'
    }
  ], finalConfig);

  // Step 3: Location check
  const locationConfidence = createConfidence(
    signals.userLocationMatch ? 0.95 : 0.50,
    'location_check',
    finalConfig
  );

  // Step 4: Final sequential cascade
  const finalResult = sequentialCascade([
    parallelResult.confidence,
    conditionalResult.confidence,
    locationConfidence
  ], finalConfig);

  return finalResult;
}

/**
 * Example usage with test data
 */
export function runFraudDetectionExample(): void {
  console.log('=== FRAUD DETECTION CONFIDENCE CASCADE ===\n');

  // Scenario 1: Low-risk transaction
  const lowRisk: FraudDetectionSignals = {
    mlScore: 0.95,
    rulesScore: 0.90,
    userReputation: 0.98,
    transactionAmount: 50,
    userLocationMatch: true
  };

  const result1 = fraudDetectionCascade(lowRisk);
  console.log('Scenario 1: Low-risk transaction');
  console.log(formatConfidence(result1.confidence));
  console.log(`Escalation: ${result1.escalationLevel}\n`);

  // Scenario 2: Medium-risk transaction
  const mediumRisk: FraudDetectionSignals = {
    mlScore: 0.75,
    rulesScore: 0.70,
    userReputation: 0.80,
    transactionAmount: 5000,
    userLocationMatch: true
  };

  const result2 = fraudDetectionCascade(mediumRisk);
  console.log('Scenario 2: Medium-risk transaction');
  console.log(formatConfidence(result2.confidence));
  console.log(`Escalation: ${result2.escalationLevel}\n`);

  // Scenario 3: High-risk transaction
  const highRisk: FraudDetectionSignals = {
    mlScore: 0.45,
    rulesScore: 0.30,
    userReputation: 0.40,
    transactionAmount: 15000,
    userLocationMatch: false
  };

  const result3 = fraudDetectionCascade(highRisk);
  console.log('Scenario 3: High-risk transaction');
  console.log(formatConfidence(result3.confidence));
  console.log(`Escalation: ${result3.escalationLevel}\n`);
}

// ============================================================================
// UNIT TEST EXAMPLES (in comments)
// ============================================================================

/**
 * UNIT TEST 1: Sequential Cascade
 *
 * Test that confidence degrades correctly through a sequence.
 *
 * ```typescript
 * import { createConfidence, sequentialCascade } from './confidence-cascade';
 *
 * test('sequential cascade multiplies confidence', () => {
 *   const conf1 = createConfidence(0.9, 'step1');
 *   const conf2 = createConfidence(0.8, 'step2');
 *   const conf3 = createConfidence(0.7, 'step3');
 *
 *   const result = sequentialCascade([conf1, conf2, conf3]);
 *
 *   expect(result.confidence.value).toBeCloseTo(0.504); // 0.9 * 0.8 * 0.7
 *   expect(result.confidence.zone).toBe('RED');
 *   expect(result.steps.length).toBe(3);
 * });
 * ```
 */

/**
 * UNIT TEST 2: Parallel Cascade
 *
 * Test that parallel branches average with weights.
 *
 * ```typescript
 * import { createConfidence, parallelCascade } from './confidence-cascade';
 *
 * test('parallel cascade averages with weights', () => {
 *   const conf1 = createConfidence(0.9, 'branch1');
 *   const conf2 = createConfidence(0.6, 'branch2');
 *   const conf3 = createConfidence(0.3, 'branch3');
 *
 *   const result = parallelCascade([
 *     { confidence: conf1, weight: 0.5 },
 *     { confidence: conf2, weight: 0.3 },
 *     { confidence: conf3, weight: 0.2 }
 *   ]);
 *
 *   expect(result.confidence.value).toBeCloseTo(0.69); // weighted average
 *   expect(result.confidence.zone).toBe('YELLOW');
 * });
 * ```
 */

/**
 * UNIT TEST 3: Conditional Cascade
 *
 * Test that only the active path's confidence is used.
 *
 * ```typescript
 * import { createConfidence, conditionalCascade } from './confidence-cascade';
 *
 * test('conditional cascade uses active path', () => {
 *   const conf1 = createConfidence(0.9, 'path1');
 *   const conf2 = createConfidence(0.5, 'path2');
 *   const conf3 = createConfidence(0.3, 'path3');
 *
 *   const result = conditionalCascade([
 *     { confidence: conf1, predicate: false, description: 'low' },
 *     { confidence: conf2, predicate: true, description: 'medium' },
 *     { confidence: conf3, predicate: false, description: 'high' }
 *   ]);
 *
 *   expect(result.confidence.value).toBe(0.5);
 *   expect(result.confidence.source).toContain('medium');
 * });
 * ```
 */

/**
 * UNIT TEST 4: Zone Classification
 *
 * Test that confidence values classify correctly.
 *
 * ```typescript
 * import { createConfidence, ConfidenceZone } from './confidence-cascade';
 *
 * test('classifies confidence into correct zones', () => {
 *   const green = createConfidence(0.9, 'test');
 *   const yellow = createConfidence(0.7, 'test');
 *   const red = createConfidence(0.4, 'test');
 *
 *   expect(green.zone).toBe(ConfidenceZone.GREEN);
 *   expect(yellow.zone).toBe(ConfidenceZone.YELLOW);
 *   expect(red.zone).toBe(ConfidenceZone.RED);
 * });
 * ```
 */

/**
 * UNIT TEST 5: Escalation Triggers
 *
 * Test that escalation triggers correctly based on zone.
 *
 * ```typescript
 * import { createConfidence, EscalationLevel, ConfidenceZone } from './confidence-cascade';
 *
 * test('escalation triggers on red zone', () => {
 *   const redConfidence = createConfidence(0.4, 'test');
 *
 *   expect(redConfidence.zone).toBe(ConfidenceZone.RED);
 *   // Would trigger ALERT or CRITICAL escalation
 * });
 *
 * test('no escalation on green zone', () => {
 *   const greenConfidence = createConfidence(0.95, 'test');
 *
 *   expect(greenConfidence.zone).toBe(ConfidenceZone.GREEN);
 *   // Would trigger NONE escalation
 * });
 * ```
 */

/**
 * UNIT TEST 6: Degradation Rate
 *
 * Test that degradation rate is calculated correctly.
 *
 * ```typescript
 * import { createConfidence, sequentialCascade, degradationRate } from './confidence-cascade';
 *
 * test('calculates degradation rate', () => {
 *   const conf1 = createConfidence(1.0, 'start');
 *   const conf2 = createConfidence(0.8, 'middle');
 *   const conf3 = createConfidence(0.6, 'end');
 *
 *   const result = sequentialCascade([conf1, conf2, conf3]);
 *   const degradation = degradationRate(result.steps);
 *
 *   expect(degradation).toBeCloseTo(0.52); // 52% degradation
 * });
 * ```
 */

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Confidence Cascade Module
 *
 * Exports:
 * - Types: Confidence, CascadeConfig, CascadeResult, etc.
 * - Factories: createConfidence
 * - Compositions: sequentialCascade, parallelCascade, conditionalCascade
 * - Utilities: formatConfidence, meetsThreshold, degradationRate
 * - Examples: fraudDetectionCascade, runFraudDetectionExample
 *
 * Usage:
 * ```typescript
 * import {
 *   createConfidence,
 *   sequentialCascade,
 *   parallelCascade,
 *   fraudDetectionCascade
 * } from './confidence-cascade';
 *
 * // Create confidences
 * const conf1 = createConfidence(0.9, 'validation_1');
 * const conf2 = createConfidence(0.8, 'validation_2');
 *
 * // Cascade sequentially
 * const result = sequentialCascade([conf1, conf2]);
 *
 * // Check result
 * console.log(result.confidence.zone); // 'YELLOW'
 * console.log(result.escalationLevel); // 'NOTICE'
 * ```
 */

export default {
  createConfidence,
  sequentialCascade,
  parallelCascade,
  conditionalCascade,
  formatConfidence,
  meetsThreshold,
  degradationRate,
  fraudDetectionCascade,
  runFraudDetectionExample,
  ConfidenceZone,
  EscalationLevel
};

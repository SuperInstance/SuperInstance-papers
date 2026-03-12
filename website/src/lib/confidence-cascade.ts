/**
 * CONFIDENCE CASCADES - Client Library for SuperInstance.AI
 *
 * Confidence flows through tiles like water through pipes.
 * Each tile adds its own confidence, and the result cascades downstream.
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

/**
 * Simple multi-choice validator
 * Returns confidence based on answer selection
 */
export function validateMultipleChoice(
  selected: string,
  correct: string,
  options: string[]
): Confidence {
  if (selected === correct) {
    return createConfidence(1.0, 'correct_answer');
  }

  const wrongOptions = options.filter(o => o !== correct);
  const isPlausible = wrongOptions.some(o => o.includes(selected.split(' ')[0]));

  return createConfidence(
    isPlausible ? 0.3 : 0.1,
    'incorrect_answer'
  );
}

/**
 * Text similarity validator
 * Uses simple word overlap for demo
 */
export function validateTextSimilarity(
  input: string,
  expected: string
): Confidence {
  const inputWords = input.toLowerCase().split(/\s+/);
  const expectedWords = expected.toLowerCase().split(/\s+/);

  const overlap = inputWords.filter(w => expectedWords.includes(w)).length;
  const total = Math.max(inputWords.length, expectedWords.length);

  const confidence = overlap / total;

  return createConfidence(
    Math.max(0, Math.min(1, confidence)),
    'text_similarity'
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createConfidence,
  sequentialCascade,
  parallelCascade,
  conditionalCascade,
  formatConfidence,
  meetsThreshold,
  degradationRate,
  validateMultipleChoice,
  validateTextSimilarity,
  ConfidenceZone,
  EscalationLevel
};
import {
  createConfidence,
  sequentialCascade,
  parallelCascade,
  conditionalCascade,
  formatConfidence,
  meetsThreshold,
  degradationRate,
  ConfidenceZone,
  EscalationLevel,
  fraudDetectionCascade,
  runFraudDetectionExample
} from '../src/confidence-cascade';

// ============================================================================
// BASIC TESTS
// ============================================================================

describe('createConfidence', () => {
  test('creates valid confidence values', () => {
    const conf = createConfidence(0.8, 'test-source');
    expect(conf.value).toBe(0.8);
    expect(conf.source).toBe('test-source');
    expect(conf.zone).toBe(ConfidenceZone.YELLOW);
    expect(conf.timestamp).toBeLessThanOrEqual(Date.now());
  });

  test('throws on invalid value', () => {
    expect(() => createConfidence(-0.1, 'test')).toThrow();
    expect(() => createConfidence(1.1, 'test')).toThrow();
  });

  test('classifies zones correctly', () => {
    expect(createConfidence(0.9, 'test').zone).toBe(ConfidenceZone.GREEN);
    expect(createConfidence(0.7, 'test').zone).toBe(ConfidenceZone.YELLOW);
    expect(createConfidence(0.4, 'test').zone).toBe(ConfidenceZone.RED);
  });

  test('respects custom thresholds', () => {
    const conf = createConfidence(0.8, 'test', {
      greenThreshold: 0.9,
      yellowThreshold: 0.7
    });
    expect(conf.zone).toBe(ConfidenceZone.YELLOW);
  });
});

describe('sequentialCascade', () => {
  test('multiplies confidence values', () => {
    const result = sequentialCascade([
      createConfidence(0.9, 'step1'),
      createConfidence(0.8, 'step2'),
      createConfidence(0.7, 'step3')
    ]);

    expect(result.confidence.value).toBeCloseTo(0.504, 3); // 0.9 * 0.8 * 0.7
    expect(result.confidence.zone).toBe(ConfidenceZone.RED);
    expect(result.steps.length).toBe(3);
  });

  test('handles empty array', () => {
    const result = sequentialCascade([]);
    expect(result.confidence.value).toBe(1); // Neutral element
    expect(result.confidence.zone).toBe(ConfidenceZone.GREEN);
    expect(result.steps.length).toBe(0);
  });

  test('tracks degradation', () => {
    const result = sequentialCascade([
      createConfidence(1.0, 'start'),
      createConfidence(0.7, 'middle'),
      createConfidence(0.5, 'end')
    ]);

    const degradation = degradationRate(result.steps);
    expect(degradation).toBeCloseTo(0.35, 2); // 35% degradation
  });

  test('triggers escalation for low confidence', () => {
    const result = sequentialCascade([
      createConfidence(0.5, 'step1'),
      createConfidence(0.5, 'step2')
    ], { escalateOnRed: true });

    expect(result.escalationTriggered).toBe(true);
    expect(result.escalationLevel).toBe(EscalationLevel.ALERT);
  });
});

describe('parallelCascade', () => {
  test('calculates weighted average', () => {
    const result = parallelCascade([
      { confidence: createConfidence(0.9, 'branch1'), weight: 0.5 },
      { confidence: createConfidence(0.6, 'branch2'), weight: 0.3 },
      { confidence: createConfidence(0.3, 'branch3'), weight: 0.2 }
    ]);

    expect(result.confidence.value).toBeCloseTo(0.69, 2); // weighted average
    expect(result.confidence.zone).toBe(ConfidenceZone.YELLOW);
  });

  test('handles zero weights', () => {
    const result = parallelCascade([
      { confidence: createConfidence(0.5, 'A'), weight: 0 },
      { confidence: createConfidence(1.0, 'B'), weight: 10 }
    ]);

    expect(result.confidence.value).toBeCloseTo(1.0, 1); // B dominates
  });

  test('handles equal importance', () => {
    const result = parallelCascade([
      { confidence: createConfidence(0.8, 'A'), weight: 1 },
      { confidence: createConfidence(0.6, 'B'), weight: 1 },
      { confidence: createConfidence(0.4, 'C'), weight: 1 }
    ]);

    expect(result.confidence.value).toBeCloseTo(0.6, 1); // simple average
  });
});

describe('conditionalCascade', () => {
  test('uses active path confidence', () => {
    const result = conditionalCascade([
      {
        confidence: createConfidence(0.9, 'low'),
        predicate: false,
        description: 'low-risk'
      },
      {
        confidence: createConfidence(0.7, 'medium'),
        predicate: true,
        description: 'medium-risk'
      },
      {
        confidence: createConfidence(0.5, 'high'),
        predicate: false,
        description: 'high-risk'
      }
    ]);

    expect(result.confidence.value).toBe(0.7);
    expect(result.confidence.source).toContain('medium-risk');
  });

  test('throws if no active path', () => {
    expect(() => conditionalCascade([
      { confidence: createConfidence(0.5, 'A'), predicate: false, description: 'A' }
    ])).toThrow('No active path found');
  });

  test('throws if multiple active paths', () => {
    expect(() => conditionalCascade([
      { confidence: createConfidence(0.5, 'A'), predicate: true, description: 'A' },
      { confidence: createConfidence(0.6, 'B'), predicate: true, description: 'B' }
    ])).toThrow('Multiple active paths found');
  });
});

describe('utility functions', () => {
  test('formatConfidence formats correctly', () => {
    const conf = createConfidence(0.87, 'validator');
    const formatted = formatConfidence(conf);
    expect(formatted).toMatch(/\[YELLOW\].*87\.0\%/);
    expect(formatted).toContain('validator');
  });

  test('meetsThreshold validates correctly', () => {
    const conf = createConfidence(0.6, 'test');
    expect(meetsThreshold(conf, 0.5)).toBe(true);
    expect(meetsThreshold(conf, 0.7)).toBe(false);
  });

  test('degradationRate with insufficient data returns 0', () => {
    const steps = [{ operation: 'sequential' as any, inputs: [], output: createConfidence(0.5, 'test') }];
    expect(degradationRate(steps)).toBe(0);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('fraudDetectionCascade', () => {
  test('low-risk transaction (green zone)', () => {
    const result = fraudDetectionCascade({
      mlScore: 0.95,
      rulesScore: 0.90,
      userReputation: 0.98,
      transactionAmount: 50,
      userLocationMatch: true
    });

    expect(result.confidence.zone).toBe(ConfidenceZone.GREEN);
    expect(result.escalationLevel).toBe(EscalationLevel.NONE);
  });

  test('high-risk transaction (red zone)', () => {
    const result = fraudDetectionCascade({
      mlScore: 0.45,
      rulesScore: 0.30,
      userReputation: 0.40,
      transactionAmount: 15000,
      userLocationMatch: false
    });

    expect(result.confidence.zone).toBe(ConfidenceZone.RED);
    expect(result.escalationLevel).toBe(EscalationLevel.CRITICAL);
  });

  test('medium-risk transaction (yellow zone)', () => {
    const result = fraudDetectionCascade({
      mlScore: 0.75,
      rulesScore: 0.70,
      userReputation: 0.80,
      transactionAmount: 5000,
      userLocationMatch: true
    });

    expect(result.confidence.value).toBeGreaterThan(0.7);
    expect(result.confidence.value).toBeLessThan(0.85);
    expect([ConfidenceZone.GREEN, ConfidenceZone.YELLOW]).toContain(result.confidence.zone);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('edge cases', () => {
  test('handles exactly threshold values', () => {
    const conf1 = createConfidence(0.85, 'test');
    const conf2 = createConfidence(0.60, 'test');

    expect(conf1.zone).toBe(ConfidenceZone.GREEN);
    expect(conf2.zone).toBe(ConfidenceZone.YELLOW);
  });

  test('handles extreme values', () => {
    const max = createConfidence(1.0, 'max');
    const min = createConfidence(0.0, 'min');

    expect(max.zone).toBe(ConfidenceZone.GREEN);
    expect(min.zone).toBe(ConfidenceZone.RED);
  });

  test('degradation with identical values', () => {
    const steps = [
      {
        operation: 'sequential' as any,
        inputs: [createConfidence(0.8, 'start')],
        output: createConfidence(0.8, 'middle')
      },
      {
        operation: 'sequential' as any,
        inputs: [createConfidence(0.8, 'middle')],
        output: createConfidence(0.8, 'end')
      }
    ];

    expect(degradationRate(steps)).toBe(0); // No degradation
  });
});
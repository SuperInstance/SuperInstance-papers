# Confidence Scoring System Specification

**Author:** Confidence Scorer Agent
**Date:** 2026-03-08
**Status:** Phase 6 - Core Innovation Specification
**Version:** 1.0.0

---

## Executive Summary

POLLN induces logic from simulations rather than storing explicit code. This requires a robust confidence scoring system to answer the critical question: **"How much can I trust this cell?"**

The confidence scoring system provides:
1. **Multi-dimensional reliability assessment** - Not just a single number
2. **Dynamic updating** - Confidence evolves with usage
3. **Transparent uncertainty** - Users understand WHY confidence is low/high
4. **System decision logic** - Automatic fallback to LLM when needed
5. **Continuous learning** - Confidence improves with production data

**Key Principle:** Confidence is not binary - it's a nuanced, multi-dimensional assessment that guides system behavior.

---

## Table of Contents

1. [Confidence Dimensions](#1-confidence-dimensions)
2. [Scoring Algorithms](#2-scoring-algorithms)
3. [Confidence Thresholds](#3-confidence-thresholds)
4. [Dynamic Updating](#4-dynamic-updating)
5. [User Communication](#5-user-communication)
6. [System Decisions](#6-system-decisions)
7. [Confidence History](#7-confidence-history)
8. [Visualization Guidelines](#8-visualization-guidelines)
9. [Real Examples](#9-real-examples)
10. [Implementation](#10-implementation)

---

## 1. Confidence Dimensions

### 1.1 Core Interface

```typescript
interface ConfidenceScore {
  // Overall confidence (0-1)
  // Weighted combination of all dimensions
  overall: number;

  // Individual dimensions (each 0-1)
  dimensions: {
    // How stable is the extracted pattern?
    // Measures: variance in outputs for similar inputs
    patternStability: number;

    // Did we simulate enough cases?
    // Measures: percentage of input space covered
    simulationCoverage: number;

    // Did we cover diverse inputs?
    // Measures: entropy/diversity of training inputs
    inputDiversity: number;

    // Are outputs consistent for similar inputs?
    // Measures: correlation between input similarity and output similarity
    outputConsistency: number;

    // How well do we handle edge cases?
    // Measures: success rate on adversarial/outlier inputs
    edgeCaseHandling: number;

    // Track record in production?
    // Measures: success rate over time
    historicalSuccess: number;
  };

  // Uncertainty explanation
  uncertainty: {
    // Why might we be wrong?
    sources: string[];

    // What would improve confidence?
    mitigations: string[];
  };

  // Metadata
  computedAt: number;
  sampleSize: number;
  lastUpdated: number;
}
```

### 1.2 Dimension Weights

Different dimensions have different importance based on context:

```typescript
interface DimensionWeights {
  patternStability: number;      // Default: 0.25
  simulationCoverage: number;     // Default: 0.20
  inputDiversity: number;         // Default: 0.15
  outputConsistency: number;      // Default: 0.15
  edgeCaseHandling: number;       // Default: 0.15
  historicalSuccess: number;      // Default: 0.10
}

// Context-specific weight adjustments
const WEIGHT_PRESETS = {
  // New component (no production history)
  NEW_COMPONENT: {
    patternStability: 0.30,
    simulationCoverage: 0.25,
    inputDiversity: 0.20,
    outputConsistency: 0.15,
    edgeCaseHandling: 0.10,
    historicalSuccess: 0.00, // Not applicable
  },

  // Production component
  PRODUCTION: {
    patternStability: 0.20,
    simulationCoverage: 0.15,
    inputDiversity: 0.10,
    outputConsistency: 0.15,
    edgeCaseHandling: 0.15,
    historicalSuccess: 0.25, // More important
  },

  // Safety-critical component
  SAFETY_CRITICAL: {
    patternStability: 0.20,
    simulationCoverage: 0.20,
    inputDiversity: 0.15,
    outputConsistency: 0.15,
    edgeCaseHandling: 0.30, // Very important
    historicalSuccess: 0.00,
  },

  // Cost-optimized component
  COST_OPTIMIZED: {
    patternStability: 0.30,
    simulationCoverage: 0.20,
    inputDiversity: 0.15,
    outputConsistency: 0.15,
    edgeCaseHandling: 0.10,
    historicalSuccess: 0.10,
  },
};
```

---

## 2. Scoring Algorithms

### 2.1 Pattern Stability

**Question:** How stable is the extracted pattern?

**Algorithm:** Measure variance in outputs for similar inputs

```typescript
function calculatePatternStability(
  observations: Observation[]
): number {
  if (observations.length < 2) return 0.5; // Neutral for small samples

  // Group observations by input similarity
  const clusters = clusterByInputSimilarity(observations, threshold = 0.85);

  // Calculate variance within each cluster
  const variances = clusters.map(cluster => {
    const outputs = cluster.map(obs => obs.outputEmbedding);
    return calculateEmbeddingVariance(outputs);
  });

  // Lower variance = higher stability
  const avgVariance = average(variances);
  const stabilityScore = Math.max(0, 1 - avgVariance);

  // Adjust for sample size
  return adjustForSampleSize(stabilityScore, observations.length);
}

function adjustForSampleSize(
  score: number,
  sampleSize: number
): number {
  // Small samples get penalty
  const minSamples = 10;
  const confidentSamples = 50;

  if (sampleSize >= confidentSamples) return score;

  // Linear ramp from 0.5 to 1.0 based on sample size
  const sampleFactor = 0.5 + 0.5 * (sampleSize / confidentSamples);
  return score * sampleFactor;
}
```

**Interpretation:**
- **High stability (0.8-1.0):** Similar inputs consistently produce similar outputs
- **Medium stability (0.5-0.8):** Mostly consistent, some variation
- **Low stability (<0.5):** High variance, pattern not stable

### 2.2 Simulation Coverage

**Question:** What percentage of the input space did we simulate?

**Algorithm:** Estimate coverage using embedding space clustering

```typescript
function calculateSimulationCoverage(
  observations: Observation[],
  inputBounds: InputBounds
): number {
  if (observations.length === 0) return 0;

  // Estimate input space dimensionality
  const dimensionality = estimateDimensionality(observations);

  // Use k-nearest neighbors to estimate density
  const knnDistances = calculateKNNDistances(observations, k = 5);

  // Estimate coverage using Voronoi volume approximation
  // Each observation covers a region around it
  const avgDistance = average(knnDistances);
  const estimatedVolume = Math.PI * Math.pow(avgDistance, dimensionality);

  // Total volume of input space
  const totalVolume = calculateInputSpaceVolume(inputBounds);

  // Coverage ratio
  const rawCoverage = (estimatedVolume * observations.length) / totalVolume;

  // Cap at 1.0 (can't exceed 100%)
  return Math.min(1.0, rawCoverage);
}

interface InputBounds {
  minEmbedding: number[];
  maxEmbedding: number[];
  complexityRange: [number, number];
  lengthRange: [number, number];
}
```

**Interpretation:**
- **High coverage (0.8-1.0):** Simulated most of the input space
- **Medium coverage (0.4-0.8):** Good coverage of common cases
- **Low coverage (<0.4):** Large gaps in simulation

### 2.3 Input Diversity

**Question:** Did we cover diverse inputs or just similar ones?

**Algorithm:** Measure entropy/diversity of training inputs

```typescript
function calculateInputDiversity(
  observations: Observation[]
): number {
  if (observations.length < 2) return 0.5;

  // Calculate pairwise distances between all inputs
  const distances: number[] = [];
  for (let i = 0; i < observations.length; i++) {
    for (let j = i + 1; j < observations.length; j++) {
      const dist = cosineDistance(
        observations[i].inputEmbedding,
        observations[j].inputEmbedding
      );
      distances.push(dist);
    }
  }

  // High average distance = high diversity
  const avgDistance = average(distances);

  // Normalize (cosine distance ranges 0-2)
  const diversityScore = avgDistance / 2;

  // Penalize if all inputs are very similar
  if (diversityScore < 0.2) {
    return diversityScore * 2; // Double penalty
  }

  return diversityScore;
}
```

**Interpretation:**
- **High diversity (0.7-1.0):** Wide variety of inputs
- **Medium diversity (0.3-0.7):** Some variety, some clustering
- **Low diversity (<0.3):** Very similar inputs, narrow coverage

### 2.4 Output Consistency

**Question:** Are outputs consistent for similar inputs?

**Algorithm:** Measure correlation between input similarity and output similarity

```typescript
function calculateOutputConsistency(
  observations: Observation[]
): number {
  if (observations.length < 2) return 0.5;

  // Calculate input similarities and output similarities
  const correlations: number[] = [];
  const samples = generateRandomPairs(observations, 100);

  for (const [obs1, obs2] of samples) {
    const inputSim = cosineSimilarity(
      obs1.inputEmbedding,
      obs2.inputEmbedding
    );

    const outputSim = cosineSimilarity(
      obs1.outputEmbedding,
      obs2.outputEmbedding
    );

    correlations.push({ inputSim, outputSim });
  }

  // Calculate correlation coefficient
  const correlation = pearsonCorrelation(
    correlations.map(r => r.inputSim),
    correlations.map(r => r.outputSim)
  );

  // Transform from [-1, 1] to [0, 1]
  return (correlation + 1) / 2;
}
```

**Interpretation:**
- **High consistency (0.7-1.0):** Similar inputs produce similar outputs
- **Medium consistency (0.4-0.7):** Generally consistent, some noise
- **Low consistency (<0.4):** No clear relationship, random behavior

### 2.5 Edge Case Handling

**Question:** How well do we handle edge cases?

**Algorithm:** Success rate on adversarial/outlier inputs

```typescript
async function calculateEdgeCaseHandling(
  component: InducedComponent,
  testCases: TestCase[]
): Promise<number> {
  // Generate or use edge case test suite
  const edgeCases = testCases.filter(tc => tc.isEdgeCase);

  if (edgeCases.length === 0) {
    // If no edge cases, return neutral score
    return 0.7;
  }

  // Test component on edge cases
  const results = await Promise.all(
    edgeCases.map(async (testCase) => {
      try {
        const output = await component.execute(testCase.input);
        const passed = testCase.validator(output);
        return passed ? 1 : 0;
      } catch (error) {
        return 0; // Failure on error
      }
    })
  );

  // Success rate
  return average(results);
}

interface TestCase {
  input: unknown;
  expected?: unknown;
  validator: (output: unknown) => boolean;
  isEdgeCase: boolean;
  category: 'empty' | 'null' | 'malformed' | 'overflow' | 'adversarial';
}
```

**Interpretation:**
- **High handling (0.8-1.0):** Robust to edge cases
- **Medium handling (0.5-0.8):** Handles most, fails on some
- **Low handling (<0.5):** Fragile, breaks on edge cases

### 2.6 Historical Success

**Question:** What's the track record in production?

**Algorithm:** Weighted success rate over time

```typescript
function calculateHistoricalSuccess(
  history: ExecutionHistory[]
): number {
  if (history.length === 0) return 0.5; // Neutral if no history

  const now = Date.now();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

  // Calculate weighted success rate
  // Recent events matter more (exponential decay)
  let weightedSuccess = 0;
  let totalWeight = 0;

  for (const event of history) {
    const age = now - event.timestamp;
    const weight = Math.exp(-age / oneWeekMs); // Decay over weeks

    const successValue = event.success ? 1 : 0;
    weightedSuccess += successValue * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSuccess / totalWeight : 0.5;
}

interface ExecutionHistory {
  timestamp: number;
  success: boolean;
  executionTimeMs: number;
  errorType?: string;
  userFeedback?: 'positive' | 'negative' | 'neutral';
}
```

**Interpretation:**
- **High success (0.9-1.0):** Excellent track record
- **Medium success (0.7-0.9):** Generally successful, some failures
- **Low success (<0.7):** Poor track record, needs improvement

### 2.7 Overall Score Calculation

```typescript
function calculateOverallConfidence(
  dimensions: ConfidenceScore['dimensions'],
  weights: DimensionWeights
): number {
  return (
    dimensions.patternStability * weights.patternStability +
    dimensions.simulationCoverage * weights.simulationCoverage +
    dimensions.inputDiversity * weights.inputDiversity +
    dimensions.outputConsistency * weights.outputConsistency +
    dimensions.edgeCaseHandling * weights.edgeCaseHandling +
    dimensions.historicalSuccess * weights.historicalSuccess
  );
}
```

---

## 3. Confidence Thresholds

### 3.1 Threshold Definitions

| Overall Score | Category | Action | Color | Icon |
|---------------|----------|--------|-------|------|
| **0.95-1.00** | Excellent | Use induced logic, full speed ahead | 🟢 | ✓✓ |
| **0.85-0.95** | High | Use induced logic, monitor | 🟢 | ✓ |
| **0.70-0.85** | Good | Use induced logic, fallback ready | 🟡 | ⚠ |
| **0.50-0.70** | Moderate | Prefer LLM, cache result | 🟡 | ⚠⚠ |
| **0.30-0.50** | Low | Always use LLM, flag for review | 🟠 | ⚠⚠⚠ |
| **0.00-0.30** | Very Low | Always use LLM, disable induced | 🔴 | ✗ |

### 3.2 Threshold Decision Logic

```typescript
interface ThresholdAction {
  useInducedLogic: boolean;
  useLLM: boolean;
  cacheResult: boolean;
  monitorUsage: boolean;
  flagForReview: boolean;
  disableInduced: boolean;
  userMessage?: string;
}

function getThresholdAction(score: number): ThresholdAction {
  if (score >= 0.95) {
    return {
      useInducedLogic: true,
      useLLM: false,
      cacheResult: true,
      monitorUsage: false,
      flagForReview: false,
      disableInduced: false,
      userMessage: undefined,
    };
  }

  if (score >= 0.85) {
    return {
      useInducedLogic: true,
      useLLM: false,
      cacheResult: true,
      monitorUsage: true,
      flagForReview: false,
      disableInduced: false,
      userMessage: 'Result is highly reliable',
    };
  }

  if (score >= 0.70) {
    return {
      useInducedLogic: true,
      useLLM: true, // Fallback ready
      cacheResult: true,
      monitorUsage: true,
      flagForReview: false,
      disableInduced: false,
      userMessage: 'Result is moderately reliable',
    };
  }

  if (score >= 0.50) {
    return {
      useInducedLogic: false,
      useLLM: true,
      cacheResult: true,
      monitorUsage: true,
      flagForReview: true,
      disableInduced: false,
      userMessage: 'Using LLM for better reliability',
    };
  }

  if (score >= 0.30) {
    return {
      useInducedLogic: false,
      useLLM: true,
      cacheResult: false,
      monitorUsage: true,
      flagForReview: true,
      disableInduced: true,
      userMessage: 'Low confidence - LLM recommended',
    };
  }

  // Very low confidence
  return {
    useInducedLogic: false,
    useLLM: true,
    cacheResult: false,
    monitorUsage: true,
    flagForReview: true,
    disableInduced: true,
    userMessage: 'Induced logic disabled - too unreliable',
  };
}
```

### 3.3 Dimension-Specific Thresholds

Each dimension can trigger special behavior:

```typescript
interface DimensionThreshold {
  dimension: keyof ConfidenceScore['dimensions'];
  threshold: number;
  action: string;
  reason: string;
}

const DIMENSION_THRESHOLDS: DimensionThreshold[] = [
  {
    dimension: 'patternStability',
    threshold: 0.4,
    action: 'WARN',
    reason: 'Pattern is unstable - may produce inconsistent results',
  },
  {
    dimension: 'simulationCoverage',
    threshold: 0.3,
    action: 'WARN',
    reason: 'Limited simulation coverage - untested cases likely',
  },
  {
    dimension: 'edgeCaseHandling',
    threshold: 0.5,
    action: 'FALLBACK',
    reason: 'Poor edge case handling - use LLM for unusual inputs',
  },
  {
    dimension: 'historicalSuccess',
    threshold: 0.7,
    action: 'MONITOR',
    reason: 'Declining success rate - pattern may be degrading',
  },
];
```

---

## 4. Dynamic Updating

### 4.1 Update Triggers

Confidence updates on:

1. **Execution** - Every execution updates confidence
2. **Feedback** - User feedback (thumbs up/down) adjusts confidence
3. **Failure** - Errors decrease confidence significantly
4. **Success** - Successful executions increase confidence slowly
5. **Time Decay** - Confidence drifts down without reinforcement
6. **Pattern Break** - Sudden drops when behavior changes

### 4.2 Update Algorithm

```typescript
interface ConfidenceUpdate {
  trigger: 'execution' | 'feedback' | 'failure' | 'decay' | 'pattern_break';
  delta: number;
  dimensions: Partial<ConfidenceScore['dimensions']>;
  timestamp: number;
  reason: string;
}

function updateConfidence(
  current: ConfidenceScore,
  event: ExecutionEvent
): ConfidenceScore {
  const delta = calculateDelta(event);
  const dimensions = updateDimensions(current.dimensions, event);

  // Apply update with smoothing (exponential moving average)
  const learningRate = getLearningRate(event.trigger);
  const updated = {
    ...current,
    overall: current.overall * (1 - learningRate) + delta * learningRate,
    dimensions: {
      ...current.dimensions,
      ...dimensions,
    },
    lastUpdated: Date.now(),
  };

  // Ensure bounds [0, 1]
  return clampConfidence(updated);
}

function calculateDelta(event: ExecutionEvent): number {
  switch (event.trigger) {
    case 'execution':
      // Small positive for successful execution
      return event.success ? 0.01 : -0.05;

    case 'feedback':
      // User feedback has larger impact
      return event.feedback === 'positive' ? 0.05 : -0.1;

    case 'failure':
      // Large negative for errors
      return -0.15;

    case 'decay':
      // Small negative for time decay
      return -0.001;

    case 'pattern_break':
      // Very large negative for sudden changes
      return -0.3;

    default:
      return 0;
  }
}

function getLearningRate(trigger: string): number {
  // Different triggers have different learning rates
  switch (trigger) {
    case 'execution':
      return 0.1; // Slow learning from executions
    case 'feedback':
      return 0.3; // Faster from explicit feedback
    case 'failure':
      return 0.5; // Quick adaptation to failures
    case 'pattern_break':
      return 0.8; // Very fast adaptation to breaks
    case 'decay':
      return 0.05; // Very slow decay
    default:
      return 0.1;
  }
}
```

### 4.3 Pattern Break Detection

Detect when induced logic no longer matches reality:

```typescript
function detectPatternBreak(
  current: ConfidenceScore,
  recentExecutions: ExecutionHistory[]
): boolean {
  if (recentExecutions.length < 5) return false;

  // Calculate recent success rate
  const recentSuccess = recentExecutions.slice(-10).filter(
    e => e.success
  ).length / Math.min(10, recentExecutions.length);

  // Compare to historical baseline
  const baseline = current.dimensions.historicalSuccess;

  // Significant drop indicates pattern break
  return recentSuccess < baseline - 0.2;
}
```

### 4.4 Time Decay

Confidence slowly decays without reinforcement:

```typescript
function applyTimeDecay(
  current: ConfidenceScore,
  options: DecayOptions = {}
): ConfidenceScore {
  const {
    decayRate = 0.001, // Per day
    lastDecay = current.lastUpdated,
  } = options;

  const now = Date.now();
  const daysSinceDecay = (now - lastDecay) / (24 * 60 * 60 * 1000);

  if (daysSinceDecay < 1) return current; // Decay daily

  const decayAmount = 1 - Math.exp(-decayRate * daysSinceDecay);
  const decayed = {
    ...current,
    overall: Math.max(0.1, current.overall * (1 - decayAmount)),
    dimensions: {
      patternStability: Math.max(0.1, current.dimensions.patternStability * (1 - decayAmount)),
      simulationCoverage: Math.max(0.1, current.dimensions.simulationCoverage * (1 - decayAmount)),
      // Other dimensions decay more slowly
      inputDiversity: current.dimensions.inputDiversity,
      outputConsistency: Math.max(0.1, current.dimensions.outputConsistency * (1 - decayAmount * 0.5)),
      edgeCaseHandling: current.dimensions.edgeCaseHandling,
      historicalSuccess: Math.max(0.1, current.dimensions.historicalSuccess * (1 - decayAmount * 0.8)),
    },
    lastUpdated: now,
  };

  return decayed;
}
```

---

## 5. User Communication

### 5.1 Display Format

```typescript
interface ConfidenceDisplay {
  // Overall score (prominent)
  overall: {
    score: number;
    label: string;
    color: string;
    icon: string;
  };

  // Breakdown (expandable)
  breakdown: {
    dimension: string;
    score: number;
    label: string;
    icon: string;
    trend: 'up' | 'down' | 'stable';
  }[];

  // Uncertainty explanation
  uncertainty: {
    sources: string[];
    mitigations: string[];
  };

  // Action items
  actions: string[];
}
```

### 5.2 Visual Indicators

**Overall Score:**
- **0.95-1.00:** 🟢 98% - Excellent
- **0.85-0.95:** 🟢 87% - High
- **0.70-0.85:** 🟡 76% - Good
- **0.50-0.70:** 🟡 62% - Moderate
- **0.30-0.50:** 🟠 42% - Low
- **0.00-0.30:** 🔴 18% - Very Low

**Dimension Breakdown:**
```
Pattern Stability:     ████████████████████ 92% ✓ (up)
Simulation Coverage:   ██████████████░░░░░░ 68% ⚠ (stable)
Input Diversity:       ████████████████░░░░ 78% ✓ (up)
Output Consistency:   ███████████████████░ 85% ✓ (up)
Edge Case Handling:   ██████░░░░░░░░░░░░░░ 32% ⚠⚠ (down)
Historical Success:   ████████████████████ 95% ✓✓ (stable)
```

### 5.3 Uncertainty Explanation

Show users WHY confidence is low:

```typescript
interface UncertaintyDisplay {
  title: string;
  sources: {
    icon: string;
    text: string;
    severity: 'high' | 'medium' | 'low';
  }[];
  mitigations: {
    icon: string;
    text: string;
    actionable: boolean;
  }[];
}

// Example:
{
  title: 'Why is confidence moderate?',
  sources: [
    {
      icon: '⚠',
      text: 'Edge case handling is poor (32%)',
      severity: 'high',
    },
    {
      icon: '⚠',
      text: 'Limited simulation coverage (68%)',
      severity: 'medium',
    },
  ],
  mitigations: [
    {
      icon: '→',
      text: 'Add edge case tests to improve robustness',
      actionable: true,
    },
    {
      icon: '→',
      text: 'Run more simulations to cover input space',
      actionable: true,
    },
  ],
}
```

### 5.4 UI Mockup

```
┌─────────────────────────────────────────────┐
│ Result Confidence: 76% - GOOD               │
│ ████████████████████░░░░ 🟡                │
├─────────────────────────────────────────────┤
│                                             │
│ Pattern Stability:     92% ✓    up   5%    │
│ Simulation Coverage:   68% ⚠  stable       │
│ Input Diversity:       78% ✓    up   3%    │
│ Output Consistency:   85% ✓    up   2%    │
│ Edge Case Handling:   32% ⚠⚠  down 15%    │
│ Historical Success:   95% ✓✓  stable       │
│                                             │
├─────────────────────────────────────────────┤
│ ⚠ Why is confidence moderate?               │
│                                             │
│ • Edge case handling is poor (32%)         │
│ • Limited simulation coverage (68%)        │
│                                             │
│ → Improve by adding edge case tests        │
│ → Run more simulations                     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 6. System Decisions

### 6.1 Decision Matrix

Based on confidence, system decides:

```typescript
interface SystemDecision {
  // Execution path
  executionPath: 'induced' | 'llm' | 'hybrid';

  // Caching strategy
  cacheStrategy: 'aggressive' | 'conservative' | 'none';

  // Monitoring
  monitoring: 'minimal' | 'standard' | 'intensive';

  // User notification
  notifyUser: boolean;
  notificationLevel: 'info' | 'warning' | 'error';

  // Fallback preparation
  prepareFallback: boolean;

  // Learning actions
  recordForLearning: boolean;
  triggerRetraining: boolean;
}

function makeSystemDecision(
  confidence: ConfidenceScore
): SystemDecision {
  if (confidence.overall >= 0.85) {
    return {
      executionPath: 'induced',
      cacheStrategy: 'aggressive',
      monitoring: 'minimal',
      notifyUser: false,
      notificationLevel: 'info',
      prepareFallback: false,
      recordForLearning: true,
      triggerRetraining: false,
    };
  }

  if (confidence.overall >= 0.70) {
    return {
      executionPath: 'induced',
      cacheStrategy: 'conservative',
      monitoring: 'standard',
      notifyUser: true,
      notificationLevel: 'info',
      prepareFallback: true,
      recordForLearning: true,
      triggerRetraining: false,
    };
  }

  if (confidence.overall >= 0.50) {
    return {
      executionPath: 'hybrid',
      cacheStrategy: 'conservative',
      monitoring: 'standard',
      notifyUser: true,
      notificationLevel: 'warning',
      prepareFallback: true,
      recordForLearning: true,
      triggerRetraining: false,
    };
  }

  // Low confidence
  return {
    executionPath: 'llm',
    cacheStrategy: 'none',
    monitoring: 'intensive',
    notifyUser: true,
    notificationLevel: 'warning',
    prepareFallback: true,
    recordForLearning: true,
    triggerRetraining: confidence.overall < 0.30,
  };
}
```

### 6.2 Hybrid Execution

When confidence is moderate, use both:

```typescript
async function hybridExecution(
  input: unknown,
  induced: InducedComponent,
  llm: LLMClient,
  confidence: ConfidenceScore
): Promise<ExecutionResult> {
  // Run both in parallel
  const [inducedResult, llmResult] = await Promise.all([
    induced.execute(input),
    llm.execute(input),
  ]);

  // Compare results
  const similarity = compareResults(inducedResult, llmResult);

  if (similarity > 0.9) {
    // Results agree - use induced (faster)
    return {
      result: inducedResult,
      source: 'induced',
      confidence: confidence.overall,
      verified: true,
    };
  }

  // Results disagree - use LLM (more reliable)
  return {
    result: llmResult,
    source: 'llm',
    confidence: 0.95, // High confidence in LLM
    verified: true,
    discrepancy: {
      inducedResult,
      llmResult,
      similarity,
    },
  };
}
```

---

## 7. Confidence History

### 7.1 History Tracking

```typescript
interface ConfidenceHistory {
  componentId: string;

  timeline: ConfidenceEvent[];

  trend: 'improving' | 'stable' | 'declining' | 'volatile';

  statistics: {
    min: number;
    max: number;
    avg: number;
    stdDev: number;
    lastChange: number;
    changeDirection: 'up' | 'down';
  };
}

interface ConfidenceEvent {
  timestamp: number;
  score: ConfidenceScore;
  event: 'created' | 'success' | 'failure' | 'decay' | 'improved' | 'pattern_break';
  delta: number; // Change from previous
  trigger?: string;
  metadata?: Record<string, unknown>;
}
```

### 7.2 Trend Analysis

```typescript
function analyzeTrend(
  history: ConfidenceEvent[]
): 'improving' | 'stable' | 'declining' | 'volatile' {
  if (history.length < 3) return 'stable';

  const recent = history.slice(-10);
  const scores = recent.map(e => e.score.overall);

  // Calculate linear regression slope
  const slope = calculateSlope(scores);

  // Calculate volatility (standard deviation)
  const volatility = calculateStdDev(scores);

  // Classify trend
  if (volatility > 0.2) return 'volatile';
  if (slope > 0.05) return 'improving';
  if (slope < -0.05) return 'declining';
  return 'stable';
}
```

### 7.3 History Visualization

```
Confidence Over Time
├────────────────────────────────────────┤
1.0 │        ┌─┐                          │
    │       ╱   ╲                         │
0.9 │      ╱     ╲    ┌──┐               │
    │     ╱       ╲  ╱    ╲              │
0.8 │    ╱         ╲╱      ╲─┐           │
    │   ╱                    ╲           │
0.7 │  ╱                      ╲          │
    │ ╱                        ╲         │
0.6 │╱                          ╲        │
    └────────────────────────────────────┘
     Jan  Feb  Mar  Apr  May  Jun  Jul

Trend: Improving (+0.12 over 30 days)
Volatility: Low (σ = 0.04)
Events: 152 executions, 3 failures, 2 pattern breaks
```

---

## 8. Visualization Guidelines

### 8.1 Color Coding

| Score Range | Color | Hex | Use When |
|-------------|-------|-----|----------|
| 0.95-1.00 | Green (Excellent) | `#22c55e` | High trust, full speed |
| 0.85-0.95 | Green (High) | `#86efac` | Trusted, monitor lightly |
| 0.70-0.85 | Yellow (Good) | `#eab308` | Use with caution |
| 0.50-0.70 | Yellow (Moderate) | `#facc15` | Verify results |
| 0.30-0.50 | Orange (Low) | `#fb923c` | Prefer LLM |
| 0.00-0.30 | Red (Very Low) | `#ef4444` | Don't trust |

### 8.2 Icon System

| Icon | Meaning | Usage |
|------|---------|-------|
| ✓✓ | Excellent | Score > 0.95 |
| ✓ | Good | Score 0.85-0.95 |
| ⚠ | Caution | Score 0.70-0.85 |
| ⚠⚠ | Warning | Score 0.50-0.70 |
| ⚠⚠⚠ | Danger | Score 0.30-0.50 |
| ✗ | Fail | Score < 0.30 |
| ↑ | Improving | Trend up |
| → | Stable | Trend flat |
| ↓ | Declining | Trend down |
| ∼ | Volatile | High variance |

### 8.3 Size Coding

Use size to indicate confidence:

- **Large font/bold:** High confidence (>0.85)
- **Normal font:** Moderate confidence (0.50-0.85)
- **Small font/light:** Low confidence (<0.50)

### 8.4 Animation

- **Pulse green:** Recently improved
- **Pulse red:** Recently degraded
- **Shake:** Pattern break detected
- **Fade out:** Decaying confidence

---

## 9. Real Examples

### 9.1 Example 1: High Confidence Component

**Component:** Email classification (spam vs not)

```typescript
{
  overall: 0.96,

  dimensions: {
    patternStability: 0.98,    // Very stable
    simulationCoverage: 0.95,  // Excellent coverage
    inputDiversity: 0.92,      // Wide variety
    outputConsistency: 0.97,   // Highly consistent
    edgeCaseHandling: 0.94,   // Robust
    historicalSuccess: 0.96,  // Excellent track record
  },

  uncertainty: {
    sources: [],              // No major concerns
    mitigations: [],          // No actions needed
  },

  decision: {
    action: 'USE_INDUCED',
    reason: 'Excellent confidence across all dimensions',
    monitor: false,
  },
}
```

**Display:**
```
┌─────────────────────────────────────┐
│ ✓✓ 96% - Excellent                  │
│ ████████████████████░░ 🟢           │
│                                     │
│ All dimensions excellent.           │
│ No concerns detected.               │
│                                     │
└─────────────────────────────────────┘
```

### 9.2 Example 2: Moderate Confidence Component

**Component:** Text summarization

```typescript
{
  overall: 0.74,

  dimensions: {
    patternStability: 0.82,
    simulationCoverage: 0.68,     // Gap here
    inputDiversity: 0.75,
    outputConsistency: 0.79,
    edgeCaseHandling: 0.62,      // Weak here
    historicalSuccess: 0.78,
  },

  uncertainty: {
    sources: [
      'Limited simulation coverage (68%)',
      'Edge case handling is moderate (62%)',
    ],
    mitigations: [
      'Add simulations for edge cases',
      'Test with empty/very long inputs',
    ],
  },

  decision: {
    action: 'USE_INDUCED_WITH_FALLBACK',
    reason: 'Good overall, but gaps in coverage',
    monitor: true,
  },
}
```

**Display:**
```
┌─────────────────────────────────────┐
│ ⚠ 74% - Good                        │
│ ████████████████░░░░░░ 🟡           │
│                                     │
│ ⚠ Limited simulation (68%)         │
│ ⚠ Edge case handling (62%)         │
│                                     │
│ → Add edge case tests               │
│ → Test empty/long inputs            │
│                                     │
└─────────────────────────────────────┘
```

### 9.3 Example 3: Low Confidence Component

**Component:** Complex reasoning task

```typescript
{
  overall: 0.42,

  dimensions: {
    patternStability: 0.38,     // Unstable
    simulationCoverage: 0.45,   // Poor coverage
    inputDiversity: 0.52,
    outputConsistency: 0.35,    // Inconsistent
    edgeCaseHandling: 0.28,    // Very poor
    historicalSuccess: 0.48,
  },

  uncertainty: {
    sources: [
      'Pattern is unstable (38%)',
      'Outputs inconsistent (35%)',
      'Poor edge case handling (28%)',
      'Limited coverage (45%)',
    ],
    mitigations: [
      'Need more training data',
      'Task may be too complex for induction',
      'Consider using LLM instead',
    ],
  },

  decision: {
    action: 'USE_LLM',
    reason: 'Induced logic not reliable enough',
    monitor: true,
    flagForReview: true,
  },
}
```

**Display:**
```
┌─────────────────────────────────────┐
│ ⚠⚠ 42% - Moderate                   │
│ ████████░░░░░░░░░░░░░ 🟠            │
│                                     │
│ ⚠⚠ Pattern unstable (38%)          │
│ ⚠⚠ Outputs inconsistent (35%)      │
│ ⚠⚠ Poor edge case handling (28%)   │
│ ⚠ Limited coverage (45%)           │
│                                     │
│ → Task too complex for induction    │
│ → Using LLM instead                 │
│ → Flagged for review                │
│                                     │
└─────────────────────────────────────┘
```

---

## 10. Implementation

### 10.1 Confidence Scorer Class

```typescript
class ConfidenceScorer {
  private history: Map<string, ConfidenceHistory> = new Map();
  private weights: DimensionWeights;

  constructor(weights?: Partial<DimensionWeights>) {
    this.weights = { ...WEIGHT_PRESETS.NEW_COMPONENT, ...weights };
  }

  /**
   * Calculate initial confidence for a new component
   */
  async calculateInitialConfidence(
    observations: Observation[],
    testCases: TestCase[]
  ): Promise<ConfidenceScore> {
    const dimensions = await this.calculateDimensions(observations, testCases);
    const overall = this.calculateOverall(dimensions);
    const uncertainty = this.identifyUncertainties(dimensions);

    return {
      overall,
      dimensions,
      uncertainty,
      computedAt: Date.now(),
      sampleSize: observations.length,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Update confidence based on execution event
   */
  updateConfidence(
    componentId: string,
    current: ConfidenceScore,
    event: ExecutionEvent
  ): ConfidenceScore {
    const updated = this.applyUpdate(current, event);

    // Track history
    this.trackHistory(componentId, updated, event);

    return updated;
  }

  /**
   * Get confidence history with trend analysis
   */
  getHistory(componentId: string): ConfidenceHistory | undefined {
    const events = this.history.get(componentId);
    if (!events) return undefined;

    return {
      componentId,
      timeline: events.timeline,
      trend: this.analyzeTrend(events.timeline),
      statistics: this.calculateStatistics(events.timeline),
    };
  }

  /**
   * Get system decision based on confidence
   */
  getSystemDecision(confidence: ConfidenceScore): SystemDecision {
    return makeSystemDecision(confidence);
  }

  // Private methods...
  private async calculateDimensions(
    observations: Observation[],
    testCases: TestCase[]
  ): Promise<ConfidenceScore['dimensions']> {
    return {
      patternStability: calculatePatternStability(observations),
      simulationCoverage: calculateSimulationCoverage(observations, this.getInputBounds()),
      inputDiversity: calculateInputDiversity(observations),
      outputConsistency: calculateOutputConsistency(observations),
      edgeCaseHandling: await this.calculateEdgeCaseHandling(observations, testCases),
      historicalSuccess: 0.5, // Neutral for new components
    };
  }

  private calculateOverall(
    dimensions: ConfidenceScore['dimensions']
  ): number {
    return calculateOverallConfidence(dimensions, this.weights);
  }

  private identifyUncertainties(
    dimensions: ConfidenceScore['dimensions']
  ): ConfidenceScore['uncertainty'] {
    const sources: string[] = [];
    const mitigations: string[] = [];

    if (dimensions.patternStability < 0.5) {
      sources.push('Pattern is unstable');
      mitigations.push('Add more diverse training examples');
    }

    if (dimensions.simulationCoverage < 0.5) {
      sources.push('Limited simulation coverage');
      mitigations.push('Run more simulations');
    }

    if (dimensions.edgeCaseHandling < 0.5) {
      sources.push('Poor edge case handling');
      mitigations.push('Add edge case tests');
    }

    return { sources, mitigations };
  }

  private applyUpdate(
    current: ConfidenceScore,
    event: ExecutionEvent
  ): ConfidenceScore {
    return updateConfidence(current, event);
  }

  private trackHistory(
    componentId: string,
    updated: ConfidenceScore,
    event: ExecutionEvent
  ): void {
    // Implementation...
  }

  private analyzeTrend(
    timeline: ConfidenceEvent[]
  ): 'improving' | 'stable' | 'declining' | 'volatile' {
    return analyzeTrend(timeline);
  }

  private calculateStatistics(
    timeline: ConfidenceEvent[]
  ) {
    // Implementation...
  }
}
```

### 10.2 Integration with Cell System

```typescript
interface AgentCell {
  id: string;
  logicLevel: 0 | 1 | 2 | 3;
  confidence: ConfidenceScore;
  scorer: ConfidenceScorer;

  async execute(input: unknown): Promise<CellResult> {
    // Get system decision based on confidence
    const decision = this.scorer.getSystemDecision(this.confidence);

    // Execute based on decision
    let result: CellResult;
    switch (decision.executionPath) {
      case 'induced':
        result = await this.executeInduced(input);
        break;
      case 'llm':
        result = await this.executeLLM(input);
        break;
      case 'hybrid':
        result = await this.executeHybrid(input);
        break;
    }

    // Update confidence based on execution
    const event: ExecutionEvent = {
      trigger: 'execution',
      success: result.success,
      timestamp: Date.now(),
    };
    this.confidence = this.scorer.updateConfidence(this.id, this.confidence, event);

    return result;
  }
}
```

### 10.3 Testing Confidence Scorer

```typescript
describe('ConfidenceScorer', () => {
  it('should calculate high confidence for stable patterns', async () => {
    const scorer = new ConfidenceScorer();
    const observations = generateStableObservations(100);
    const testCases = generateEdgeCaseTests();

    const confidence = await scorer.calculateInitialConfidence(observations, testCases);

    expect(confidence.overall).toBeGreaterThan(0.85);
    expect(confidence.dimensions.patternStability).toBeGreaterThan(0.9);
  });

  it('should calculate low confidence for unstable patterns', async () => {
    const scorer = new ConfidenceScorer();
    const observations = generateUnstableObservations(100);
    const testCases = generateEdgeCaseTests();

    const confidence = await scorer.calculateInitialConfidence(observations, testCases);

    expect(confidence.overall).toBeLessThan(0.5);
    expect(confidence.dimensions.patternStability).toBeLessThan(0.5);
  });

  it('should update confidence on failure', () => {
    const scorer = new ConfidenceScorer();
    const current: ConfidenceScore = {
      overall: 0.8,
      dimensions: {
        patternStability: 0.8,
        simulationCoverage: 0.8,
        inputDiversity: 0.8,
        outputConsistency: 0.8,
        edgeCaseHandling: 0.8,
        historicalSuccess: 0.8,
      },
      uncertainty: { sources: [], mitigations: [] },
      computedAt: Date.now(),
      sampleSize: 100,
      lastUpdated: Date.now(),
    };

    const event: ExecutionEvent = {
      trigger: 'failure',
      success: false,
      timestamp: Date.now(),
    };

    const updated = scorer.updateConfidence('component-1', current, event);

    expect(updated.overall).toBeLessThan(current.overall);
  });
});
```

---

## Conclusion

The confidence scoring system provides:

1. **Multi-dimensional assessment** - Not just a single number
2. **Transparent uncertainty** - Users understand WHY
3. **Dynamic updating** - Confidence evolves with usage
4. **System decisions** - Automatic fallback logic
5. **User communication** - Clear visual indicators
6. **Historical tracking** - Trends over time

**Key Insight:** Confidence enables the system to be humble - knowing when to use induced logic and when to fall back to the LLM.

---

**Next Steps:**
1. Implement ConfidenceScorer class
2. Integrate with AgentCell execution
3. Build UI components for confidence display
4. Add confidence tracking to analytics
5. Create confidence alerts and notifications

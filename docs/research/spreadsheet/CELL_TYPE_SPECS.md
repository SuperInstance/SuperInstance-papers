# AgentCell Type System Specification

**POLLN Spreadsheet Integration - Cell Type Architecture**

**Author:** Cell Type Architect
**Created:** 2026-03-08
**Status:** Draft Specification
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Logic Level Abstraction (0-3)](#logic-level-abstraction-0-3)
4. [Core Type Definitions](#core-type-definitions)
5. [Pattern Structure](#pattern-structure)
6. [Weight System](#weight-system)
7. [Cell Lifecycle](#cell-lifecycle)
8. [Cell Types vs Instances](#cell-types-vs-instances)
9. [Decision Tree](#decision-tree)
10. [Examples](#examples)

---

## Overview

The AgentCell type system enables spreadsheet cells to contain autonomous agents that learn from their connections. Intelligence emerges from the web between cells, not from stored data.

**Key Principle:** Memory is structural, not representational. We store connections and weights, not facts.

### Core Metaphor

- **Spreadsheet** = Colony canvas where agents live
- **Cell** = Agent with specific function
- **Formula** = NLP description of desired behavior
- **Connection** = Weighted synaptic link between cells
- **Intelligence** = Emergent property of the network

---

## Design Philosophy

### 1. Memory is Structural

We DON'T store:
- ❌ Code snippets
- ❌ Facts in databases
- ❌ Explicit rules

We DO store:
- ✅ Connection weights (strength of relationships)
- ✅ Pattern embeddings (compressed behaviors)
- ✅ Success/failure history (value function)

### 2. Induced Logic, Not Explicit Code

A cell's "logic" is **induced** from:
- Input/output examples (observed patterns)
- Behavioral constraints (what NOT to do)
- Success conditions (what GOOD looks like)
- Connection weights (who to trust)

The system **learns** behavior, it doesn't **encode** it.

### 3. Four-Level Abstraction

Each cell operates at one of four logic levels:

| Level | Name | Model Type | Latency | Cost | When to Use |
|-------|------|------------|---------|------|-------------|
| 0 | Pure Logic | None (arithmetic/string ops) | <1ms | $0 | Deterministic calculations |
| 1 | Cached Patterns | KV-cache hits | ~10ms | $0.0001 | Previously seen patterns |
| 2 | Distilled Agents | Small specialized models | ~100ms | $0.001 | Repeated specialized tasks |
| 3 | Full LLM | API calls to GPT-4/Claude | ~1s | $0.01 | Novel complex tasks |

**Critical:** Level 3 triggers future distillation to Level 2.

---

## Logic Level Abstraction (0-3)

### Level 0: Pure Logic

**Definition:** Deterministic operations without ML models

**Characteristics:**
- Zero model inference
- Pure arithmetic, string operations, data transformations
- 100% reproducible
- Sub-millisecond latency

**Examples:**
```typescript
// Arithmetic
"Add A1 to B1" → A1 + B1

// String operations
"Extract domain from URL" → URL parsing logic

// Data transformation
"Convert Celsius to Fahrenheit" → (C * 9/5) + 32

// Conditional logic
"If A1 > 100, return 'high', else 'low'" → ternary operator
```

**Type Signature:**
```typescript
interface Level0Cell extends AgentCell {
  logicLevel: 0;

  // Pure function (no model)
  logic: PureLogicFunction;

  // Deterministic guarantee
  deterministic: true;
  reproducible: true;
}

type PureLogicFunction = (input: unknown) => unknown;
```

**When to Use:**
- Task is mathematically defined
- No ambiguity in transformation
- Performance is critical
- Reproducibility is required

**When NOT to Use:**
- Task requires understanding context
- Input is ambiguous or noisy
- Task involves natural language

---

### Level 1: Cached Patterns

**Definition:** Previously computed results stored as KV-cache anchors

**Characteristics:**
- KV-cache hits from prior LLM computations
- ~10-100x faster than full LLM call
- Limited to previously seen patterns
- Quality degrades with pattern drift

**Technical Details:**
```typescript
interface Level1Cell extends AgentCell {
  logicLevel: 1;

  // KV-cache reference
  cacheKey: string;           // Key in KVAnchorPool
  cacheHitThreshold: number;  // Min similarity for cache hit (default: 0.85)

  // Cache metadata
  sourceComputationId: string;  // Original LLM call that created cache
  cachedAt: number;
  cacheHits: number;
  cacheMisses: number;
}
```

**Cache Hit Logic:**
```typescript
// 1. Compute query embedding
const queryEmbedding = await embed(input);

// 2. Search KV-anchor pool using ANN index
const matches = await kvAnchorPool.match({
  embedding: queryEmbedding,
  threshold: cell.cacheHitThreshold,
  maxMatches: 1
});

// 3. If match found, return cached result
if (matches.length > 0 && matches[0].similarity >= cell.cacheHitThreshold) {
  return {
    output: matches[0].anchor.cachedOutput,
    confidence: matches[0].similarity,
    fromCache: true,
    cacheHitId: matches[0].anchor.anchorId
  };
}

// 4. Otherwise, escalate to Level 2 or 3
return escalateToHigherLevel(input);
```

**When to Use:**
- Pattern has been seen before (repeated queries)
- High similarity threshold can be met (>0.85)
- Latency critical but some accuracy loss acceptable
- Cost reduction important

**When NOT to Use:**
- Novel patterns (first-time tasks)
- Low similarity in cache (<0.85)
- Task requires exact precision

---

### Level 2: Distilled Agents

**Definition:** Small specialized models distilled from larger LLMs

**Characteristics:**
- 100M-1B parameter models (vs 175B+ for GPT-4)
- Task-specific specialization
- ~100x cheaper than full LLM
- ~10x faster than full LLM
- Requires distillation process

**Technical Details:**
```typescript
interface Level2Cell extends AgentCell {
  logicLevel: 2;

  // Distilled model reference
  modelRef: {
    modelId: string;           // e.g., "polln-distilled-summarizer-v1"
    modelSize: number;         // Parameter count (e.g., 500M)
    distillationDate: number;
    sourceLLM: string;         // e.g., "claude-opus-4-5"

    // Performance metrics
    avgLatencyMs: number;
    avgCostPer1kTokens: number;

    // Quality metrics
    qualityScore: number;      // 0-1, vs source LLM
    accuracyVsSource: number;  // % of source LLM quality
  };

  // Model-specific configuration
  modelConfig: {
    temperature: number;
    maxTokens: number;
    stopSequences: string[];
  };
}
```

**Distillation Process:**

Level 3 cells automatically trigger distillation when:
```typescript
// 1. Cell has been used N times with high success
const usageCount = cell.usage;
const successRate = cell.successCount / cell.usage;

if (usageCount > 100 && successRate > 0.9) {
  // 2. Cell is costly (Level 3) and could benefit from speedup
  if (cell.logicLevel === 3 && cell.avgCostPerCall > 0.005) {
    // 3. Trigger distillation
    await triggerDistillation(cell);
  }
}

async function triggerDistillation(cell: AgentCell): Promise<void> {
  // Collect training data from cell's history
  const trainingData = await cell.getObservations();

  // Create distilled model
  const distilledModel = await distillModel({
    sourceModel: cell.modelRef.modelId,
    trainingData: trainingData,
    targetSize: 500M,  // 500M parameters
    task: cell.function
  });

  // Update cell to Level 2
  cell.logicLevel = 2;
  cell.modelRef = distilledModel;

  // Archive original Level 3 as fallback
  cell.fallbackModel = cell.previousModelRef;
}
```

**When to Use:**
- Task is repeated frequently (>100x)
- Task is narrow and well-defined
- Cost reduction justifies distillation investment
- Latency improvement valuable

**When NOT to Use:**
- Task is novel or changing
- Task requires broad knowledge
- Distillation training data insufficient

---

### Level 3: Full LLM

**Definition:** Direct API calls to large language models

**Characteristics:**
- GPT-4, Claude Opus, etc. (175B+ parameters)
- Highest quality, highest cost
- Slowest latency
- Most flexible

**Technical Details:**
```typescript
interface Level3Cell extends AgentCell {
  logicLevel: 3;

  // LLM API reference
  modelRef: {
    provider: 'openai' | 'anthropic' | 'google' | 'polln';
    model: string;             // e.g., "claude-opus-4-5"
    apiEndpoint: string;

    // Cost tracking
    avgInputTokens: number;
    avgOutputTokens: number;
    avgCostPerCall: number;

    // Performance
    avgLatencyMs: number;

    // Distillation candidacy
    distillationPriority: 'high' | 'medium' | 'low';
    estimatedDistillationSavings: number;
  };

  // API configuration
  apiConfig: {
    temperature: number;
    maxTokens: number;
    topP: number;
    stopSequences: string[];
    timeoutMs: number;
  };

  // Fallback model (if any)
  fallbackModel?: {
    modelRef: Level2Cell['modelRef'];
    fallbackThreshold: number;  // Use fallback if confidence below this
  };
}
```

**Distillation Triggering:**

Level 3 cells automatically become candidates for distillation when:
```typescript
interface DistillationCriteria {
  // Usage criteria
  minUsageCount: number;           // Default: 100
  minSuccessRate: number;          // Default: 0.9

  // Cost criteria
  minTotalSpend: number;           // Default: $1.00
  minAvgCostPerCall: number;       // Default: $0.005

  // Stability criteria
  minPatternConsistency: number;   // Default: 0.85
  maxInputVariance: number;        // Default: 0.3 (CV)

  // Business criteria
  requiresDistillation: boolean;   // User override
}
```

**When to Use:**
- Novel, complex tasks
- First-time cell creation
- Tasks requiring broad world knowledge
- Low-volume, high-value tasks

**When NOT to Use:**
- High-volume repetitive tasks (use Level 2)
- Simple deterministic logic (use Level 0)
- Cached patterns available (use Level 1)

---

## Core Type Definitions

### Primary AgentCell Interface

```typescript
/**
 * AgentCell - A spreadsheet cell containing an autonomous agent
 *
 * Core principle: "Memory is structural, not representational"
 * We store connections and weights, not facts or code.
 */
interface AgentCell {
  // ========================================================================
  // IDENTITY
  // ========================================================================

  /**
   * Unique cell identifier
   * Format: "{sheetId}!{col}{row}" (e.g., "sheet1!A1")
   */
  id: string;

  /**
   * Spreadsheet position
   */
  position: {
    sheetId: string;
    row: number;
    col: number;
    colLetter: string;  // Excel-style (A, B, C, ..., Z, AA, AB, ...)
  };

  /**
   * Cell type template (if derived from a template)
   */
  typeId?: string;  // References CellType.id

  /**
   * Variant ID (if this cell has multiple approaches)
   */
  variantId?: string;  // References CellVariant.id

  // ========================================================================
  // FUNCTION
  // ========================================================================

  /**
   * Natural language description of what the cell does
   *
   * Examples:
   * - "Sum the values in the range A1:A10"
   * - "Extract the domain name from a URL"
   * - "Classify the sentiment of customer feedback"
   * - "Generate a summary of the product description"
   */
  function: string;

  /**
   * Logic level (0-3) determining computation method
   */
  logicLevel: 0 | 1 | 2 | 3;

  /**
   * Level-specific configuration
   */
  levelConfig: Level0Config | Level1Config | Level2Config | Level3Config;

  // ========================================================================
  // INDUCED LOGIC (NOT CODE!)
  // ========================================================================

  /**
   * Observed patterns that induce behavior
   *
   * The system learns from examples, it doesn't execute code.
   * Patterns are compressed embeddings of input/output pairs.
   */
  patterns: Pattern[];

  /**
   * Connection weights to other cells
   *
   * Keys are target cell IDs, values are weights in [-1, 1].
   * Positive weights = reinforcement
   * Negative weights = inhibition
   */
  weights: Map<string, number>;

  /**
   * Behavioral constraints (what NOT to do)
   */
  constraints: BehavioralConstraint[];

  /**
   * Success conditions (what GOOD looks like)
   */
  successConditions: SuccessCondition[];

  // ========================================================================
  // MODEL REFERENCES (for Levels 1-3)
  // ========================================================================

  /**
   * Model reference (Levels 1-3 only)
   */
  modelRef?: Level1ModelRef | Level2ModelRef | Level3ModelRef;

  /**
   * Cache key (Level 1 only)
   */
  cacheKey?: string;

  // ========================================================================
  // METADATA
  // ========================================================================

  /**
   * Confidence in this cell's outputs (0-1)
   *
   * Updated based on:
   * - Success/failure history
   * - Value function (TD learning)
   * - Human feedback
   */
  confidence: number;

  /**
   * Number of times this cell has been executed
   */
  usage: number;

  /**
   * Success count (for calculating success rate)
   */
  successCount: number;

  /**
   * Failure count
   */
  failureCount: number;

  /**
   * Value function (karmic record)
   *
   * TD(lambda) prediction of this cell's long-term value.
   * Updated via Hebbian learning: neurons that fire together wire together.
   */
  valueFunction: number;

  /**
   * Average execution time (ms)
   */
  avgExecutionTimeMs: number;

  /**
   * Average cost per execution ($)
   */
  avgCostPerExecution: number;

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Cell lifecycle state
   */
  lifecycleState: LifecycleState;

  /**
   * When this cell was created
   */
  createdAt: number;

  /**
   * When this cell was last updated
   */
  updatedAt: number;

  /**
   * When this cell was last executed
   */
  lastExecutedAt?: number;

  // ========================================================================
  // LEARNING
  // ========================================================================

  /**
   * Observation history (for learning)
   */
  observations: Observation[];

  /**
   * TD(lambda) eligibility traces (for delayed reward credit assignment)
   */
  eligibilityTraces: Map<string, number>;

  /**
   * Learning rate for weight updates
   */
  learningRate: number;  // Default: 0.01

  /**
   * Decay rate for weight decay
   */
  decayRate: number;  // Default: 0.001
}
```

### Level-Specific Configuration Types

```typescript
/**
 * Level 0: Pure Logic Configuration
 */
interface Level0Config {
  logicLevel: 0;

  /**
   * Pure function (deterministic, no model)
   */
  logic: PureLogicFunction;

  /**
   * Operation type
   */
  operationType: 'arithmetic' | 'string' | 'conditional' | 'lookup' | 'transform';

  /**
   * Determinism guarantees
   */
  deterministic: true;
  reproducible: true;
}

/**
 * Pure logic function (no ML model)
 */
type PureLogicFunction =
  | ArithmeticOperation
  | StringOperation
  | ConditionalOperation
  | LookupOperation
  | TransformOperation;

interface ArithmeticOperation {
  type: 'arithmetic';
  operator: '+' | '-' | '*' | '/' | '%' | '^';
  operands: Array<{reference: string} | {literal: number}>;
}

interface StringOperation {
  type: 'string';
  operation: 'concat' | 'split' | 'replace' | 'extract' | 'substring' | 'lower' | 'upper';
  args: Record<string, unknown>;
}

interface ConditionalOperation {
  type: 'conditional';
  condition: {
    left: {reference: string} | {literal: unknown};
    operator: '=' | '!=' | '>' | '<' '>=' | '<=';
    right: {reference: string} | {literal: unknown};
  };
  trueValue: {reference: string} | {literal: unknown};
  falseValue: {reference: string} | {literal: unknown};
}

interface LookupOperation {
  type: 'lookup';
  lookupType: 'vlookup' | 'hlookup' | 'index' | 'match';
  args: Record<string, unknown>;
}

interface TransformOperation {
  type: 'transform';
  transform: 'date_parse' | 'date_format' | 'currency_convert' | 'unit_convert';
  args: Record<string, unknown>;
}

/**
 * Level 1: Cached Pattern Configuration
 */
interface Level1Config {
  logicLevel: 1;

  /**
   * KV-cache reference
   */
  cacheKey: string;

  /**
   * Minimum similarity for cache hit
   */
  cacheHitThreshold: number;  // Default: 0.85

  /**
   * Maximum number of cache matches to consider
   */
  maxCacheMatches: number;  // Default: 1

  /**
   * Cache metadata
   */
  sourceComputationId: string;
  cachedAt: number;
  cacheHits: number;
  cacheMisses: number;

  /**
   * Fallback level if cache misses
   */
  fallbackLevel: 2 | 3;
}

/**
 * Level 2: Distilled Agent Configuration
 */
interface Level2Config {
  logicLevel: 2;

  /**
   * Distilled model reference
   */
  modelRef: Level2ModelRef;

  /**
   * Model-specific configuration
   */
  modelConfig: {
    temperature: number;
    maxTokens: number;
    stopSequences?: string[];
  };

  /**
   * Distillation metadata
   */
  distillationDate: number;
  distillationAccuracy: number;  // vs source LLM

  /**
   * Fallback to Level 3 if confidence below threshold
   */
  fallbackThreshold?: number;
}

/**
 * Level 3: Full LLM Configuration
 */
interface Level3Config {
  logicLevel: 3;

  /**
   * LLM API reference
   */
  modelRef: Level3ModelRef;

  /**
   * API configuration
   */
  apiConfig: {
    temperature: number;
    maxTokens: number;
    topP?: number;
    stopSequences?: string[];
    timeoutMs: number;
  };

  /**
   * Distillation triggers
   */
  distillationConfig: DistillationConfig;

  /**
   * Retry configuration
   */
  retryConfig: {
    maxRetries: number;
    backoffMs: number;
  };
}

/**
 * Distillation configuration
 */
interface DistillationConfig {
  /**
   * Minimum usage before distillation is considered
   */
  minUsageCount: number;  // Default: 100

  /**
   * Minimum success rate before distillation
   */
  minSuccessRate: number;  // Default: 0.9

  /**
   * Minimum total spend before distillation
   */
  minTotalSpend: number;  // Default: $1.00

  /**
   * Pattern consistency threshold
   */
  minPatternConsistency: number;  // Default: 0.85

  /**
   * Maximum input variance (coefficient of variation)
   */
  maxInputVariance: number;  // Default: 0.3

  /**
   * User override
   */
  requiresDistillation?: boolean;

  /**
   * Estimated savings if distilled
   */
  estimatedSavings?: number;
}

/**
 * Level 1 Model Reference (KV-cache)
 */
interface Level1ModelRef {
  type: 'kv_cache';

  /**
   * KV-anchor pool reference
   */
  anchorPoolId: string;

  /**
   * Anchor ID
   */
  anchorId: string;

  /**
   * Layer ID (for multi-layer KV-cache)
   */
  layerId?: number;
}

/**
 * Level 2 Model Reference (Distilled)
 */
interface Level2ModelRef {
  type: 'distilled';

  /**
   * Model identifier
   */
  modelId: string;

  /**
   * Parameter count
   */
  modelSize: number;

  /**
   * When this model was distilled
   */
  distillationDate: number;

  /**
   * Source LLM used for distillation
   */
  sourceLLM: string;

  /**
   * Performance metrics
   */
  performance: {
    avgLatencyMs: number;
    avgCostPer1kTokens: number;
    qualityScore: number;  // 0-1, vs source LLM
    accuracyVsSource: number;  // % of source LLM quality
  };
}

/**
 * Level 3 Model Reference (Full LLM)
 */
interface Level3ModelRef {
  type: 'llm';

  /**
   * API provider
   */
  provider: 'openai' | 'anthropic' | 'google' | 'polln';

  /**
   * Model name
   */
  model: string;

  /**
   * API endpoint
   */
  apiEndpoint: string;

  /**
   * Cost tracking
   */
  cost: {
    avgInputTokens: number;
    avgOutputTokens: number;
    avgCostPerCall: number;
  };

  /**
   * Performance
   */
  performance: {
    avgLatencyMs: number;
  };

  /**
   * Distillation candidacy
   */
  distillation: {
    priority: 'high' | 'medium' | 'low';
    estimatedSavings: number;
    readyForDistillation: boolean;
  };
}
```

---

## Pattern Structure

### Pattern Interface

```typescript
/**
 * Pattern - A compressed behavioral pattern
 *
 * Patterns are NOT code. They are compressed representations of
 * input/output pairs that the system has observed and learned from.
 */
interface Pattern {
  /**
   * Unique pattern identifier
   */
  id: string;

  /**
   * Pattern embedding (compressed representation)
   *
   * This is the "induced logic" - not code, but a mathematical
   * representation of the pattern's behavior.
   */
  embedding: number[];

  /**
   * Input examples (for reference, not execution)
   *
   * The system doesn't "run" these examples. It uses them to
   * build the embedding and understand the pattern.
   */
  inputExamples: PatternExample[];

  /**
   * Output examples (for reference, not execution)
   */
  outputExamples: PatternExample[];

  /**
   * Pattern metadata
   */
  metadata: PatternMetadata;

  /**
   * When this pattern was observed
   */
  observedAt: number;

  /**
   * How many times this pattern has been seen
   */
  frequency: number;

  /**
   * Success rate when this pattern is applied
   */
  successRate: number;
}

/**
 * Pattern example (input or output)
 */
interface PatternExample {
  /**
   * Example value
   */
  value: unknown;

  /**
   * Data type
   */
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

  /**
   * Example hash (for deduplication)
   */
  hash: string;

  /**
   * When this example was observed
   */
  observedAt: number;
}

/**
 * Pattern metadata
 */
interface PatternMetadata {
  /**
   * Pattern category
   */
  category: PatternCategory;

  /**
   * Pattern complexity (0-1)
   */
  complexity: number;

  /**
   * Pattern stability (0-1)
   * High stability = pattern doesn't change over time
   */
  stability: number;

  /**
   * Pattern generality (0-1)
   * High generality = pattern applies to many inputs
   */
  generality: number;

  /**
   * Confidence in this pattern (0-1)
   */
  confidence: number;

  /**
   * Related patterns (by ID)
   */
  relatedPatterns: string[];
}

/**
 * Pattern categories
 */
type PatternCategory =
  // Arithmetic patterns
  | 'arithmetic_addition'
  | 'arithmetic_subtraction'
  | 'arithmetic_multiplication'
  | 'arithmetic_division'

  // String patterns
  | 'string_concatenation'
  | 'string_extraction'
  | 'string_transformation'

  // Data structure patterns
  | 'array_mapping'
  | 'array_filtering'
  | 'array_reduction'
  | 'object_projection'

  // Logic patterns
  | 'conditional_branching'
  | 'lookup_matching'

  // ML patterns
  | 'classification'
  | 'summarization'
  | 'generation'
  | 'extraction'

  // Unknown (for patterns that don't fit categories)
  | 'unknown';
```

### Pattern Creation and Learning

```typescript
/**
 * Pattern learning process
 *
 * Patterns are created through observation, not explicit programming.
 */
class PatternLearner {
  /**
   * Observe an input/output pair and update patterns
   */
  async observe(
    input: unknown,
    output: unknown,
    context: PatternContext
  ): Promise<Pattern> {
    // 1. Compute input embedding
    const inputEmbedding = await this.embed(input);

    // 2. Compute output embedding
    const outputEmbedding = await this.embed(output);

    // 3. Combine to create pattern embedding
    const patternEmbedding = this.combineEmbeddings(
      inputEmbedding,
      outputEmbedding
    );

    // 4. Check if similar pattern exists
    const existingPattern = await this.findSimilarPattern(patternEmbedding);

    if (existingPattern) {
      // 5a. Update existing pattern
      return this.updatePattern(existingPattern, input, output, context);
    } else {
      // 5b. Create new pattern
      return this.createPattern(patternEmbedding, input, output, context);
    }
  }

  /**
   * Create a new pattern
   */
  private async createPattern(
    embedding: number[],
    input: unknown,
    output: unknown,
    context: PatternContext
  ): Promise<Pattern> {
    const pattern: Pattern = {
      id: uuid(),
      embedding,
      inputExamples: [{
        value: input,
        dataType: this.getDataType(input),
        hash: this.hashValue(input),
        observedAt: Date.now()
      }],
      outputExamples: [{
        value: output,
        dataType: this.getDataType(output),
        hash: this.hashValue(output),
        observedAt: Date.now()
      }],
      metadata: await this.extractMetadata(input, output, context),
      observedAt: Date.now(),
      frequency: 1,
      successRate: 1.0
    };

    return pattern;
  }

  /**
   * Extract pattern metadata
   */
  private async extractMetadata(
    input: unknown,
    output: unknown,
    context: PatternContext
  ): Promise<PatternMetadata> {
    // Analyze the pattern to determine its characteristics
    const category = await this.classifyCategory(input, output);
    const complexity = this.calculateComplexity(input, output);
    const stability = this.estimateStability(context);
    const generality = this.estimateGenerality(input, output);
    const confidence = this.calculateConfidence(context);

    return {
      category,
      complexity,
      stability,
      generality,
      confidence,
      relatedPatterns: []
    };
  }

  /**
   * Classify pattern category
   */
  private async classifyCategory(
    input: unknown,
    output: unknown
  ): Promise<PatternCategory> {
    const inputType = typeof input;
    const outputType = typeof output;

    // Use a small classifier model to categorize the pattern
    const classification = await this.patternClassifier.classify({
      inputType,
      outputType,
      input,
      output
    });

    return classification.category;
  }
}
```

---

## Weight System

### Weight Structure

```typescript
/**
 * Connection weights between cells
 *
 * Weights represent the strength of influence one cell has on another.
 * This is the "memory" of the system - structural, not representational.
 */
interface CellWeights {
  /**
   * Map of target cell ID -> weight
   *
   * Weights are in the range [-1, 1]:
   * - Positive weights: reinforcement (excitatory)
   * - Negative weights: inhibition (inhibitory)
   * - Zero: no connection
   */
  weights: Map<string, number>;

  /**
   * Weight metadata
   */
  metadata: Map<string, WeightMetadata>;
}

/**
 * Weight metadata
 */
interface WeightMetadata {
  /**
   * When this weight was last updated
   */
  lastUpdated: number;

  /**
   * How many times this weight has been updated
   */
  updateCount: number;

  /**
   * Coactivation count (for Hebbian learning)
   *
   * Number of times source and target cells fired together
   */
  coactivationCount: number;

  /**
   * Last coactivation time
   */
  lastCoactivated: number;
}
```

### Hebbian Learning

```typescript
/**
 * Hebbian Learning: "Neurons that fire together, wire together"
 *
 * Weights are updated based on whether connected cells coactivate.
 */
class HebbianLearning {
  /**
   * Update weights based on coactivation
   *
   * Formula: Δw = η * (reward - baseline) * coactivation
   *
   * Where:
   * - η (eta) = learning rate
   * - reward = outcome reward signal
   * - baseline = expected reward (value function)
   * - coactivation = product of source and target activations
   */
  updateWeights(
    sourceCellId: string,
    targetCellId: string,
    reward: number,
    baseline: number,
    learningRate: number
  ): number {
    const currentWeight = this.getWeight(sourceCellId, targetCellId);

    // Hebbian weight update
    const deltaWeight = learningRate * (reward - baseline);
    const newWeight = this.clampWeight(currentWeight + deltaWeight);

    // Update weight
    this.setWeight(sourceCellId, targetCellId, newWeight);

    // Update metadata
    this.updateMetadata(sourceCellId, targetCellId);

    return newWeight;
  }

  /**
   * Clamp weight to valid range
   */
  private clampWeight(weight: number): number {
    return Math.max(-1, Math.min(1, weight));
  }

  /**
   * Decay weights over time
   *
   * Weights decay slowly to prevent infinite growth and allow
   * the network to adapt to changing conditions.
   */
  decayWeights(
    sourceCellId: string,
    targetCellId: string,
    decayRate: number,
    timeDelta: number
  ): void {
    const currentWeight = this.getWeight(sourceCellId, targetCellId);
    const decayFactor = Math.exp(-decayRate * timeDelta);
    const decayedWeight = currentWeight * decayFactor;

    this.setWeight(sourceCellId, targetCellId, decayedWeight);
  }
}
```

### Initial vs Learned Weights

```typescript
/**
 * Initial weights are set based on:
 * 1. Spatial proximity (cells closer together start with higher weights)
 * 2. Type compatibility (cells with compatible types start with higher weights)
 * 3. User hints (user can specify initial weights)
 */
interface InitialWeightConfig {
  /**
   * Spatial decay factor
   *
   * Weights decay exponentially with distance.
   * Formula: weight = exp(-distance * spatialDecay)
   */
  spatialDecay: number;  // Default: 0.1

  /**
   * Type compatibility matrix
   *
   * Maps (sourceType, targetType) -> initial weight
   */
  typeCompatibility: Map<string, Map<string, number>>;

  /**
   * User-specified initial weights
   *
   * User can specify that certain cells should have strong connections
   */
  userSpecifiedWeights: Map<string, Map<string, number>>;
}

/**
 * Learned weights emerge from:
 * 1. Hebbian learning (coactivation)
 * 2. Reward modulation (success/failure)
 * 3. TD(lambda) credit assignment (delayed rewards)
 */
class WeightLearning {
  /**
   * Initialize weights for a new cell
   */
  initializeWeights(
    newCellId: string,
    existingCells: AgentCell[],
    config: InitialWeightConfig
  ): void {
    for (const existingCell of existingCells) {
      // Calculate initial weight based on spatial proximity
      const distance = this.calculateDistance(newCellId, existingCell.id);
      const spatialWeight = Math.exp(-distance * config.spatialDecay);

      // Calculate type compatibility
      const typeWeight = this.getTypeCompatibility(
        newCellId,
        existingCell.id,
        config.typeCompatibility
      );

      // Check for user-specified weight
      const userWeight = config.userSpecifiedWeights
        .get(newCellId)
        ?.get(existingCell.id);

      // Combine weights
      const initialWeight = userWeight ?? (spatialWeight * typeWeight);

      // Set initial weight
      this.setWeight(newCellId, existingCell.id, initialWeight);
    }
  }

  /**
   * Calculate distance between two cells
   */
  private calculateDistance(cellId1: string, cellId2: string): number {
    const pos1 = this.parseCellId(cellId1);
    const pos2 = this.parseCellId(cellId2);

    // Euclidean distance
    return Math.sqrt(
      Math.pow(pos1.row - pos2.row, 2) +
      Math.pow(pos1.col - pos2.col, 2)
    );
  }
}
```

---

## Cell Lifecycle

### Lifecycle States

```typescript
/**
 * Cell lifecycle states
 */
type LifecycleState =
  | 'creating'    // Cell is being initialized
  | 'active'      // Cell is processing data
  | 'idle'        // Cell is not in use (ready but inactive)
  | 'deprecated'  // Cell has a better replacement
  | 'deleted';    // Cell is removed

/**
 * Cell lifecycle state machine
 */
class CellLifecycle {
  /**
   * Transition cell to a new state
   */
  transition(cell: AgentCell, newState: LifecycleState): void {
    const currentState = cell.lifecycleState;

    // Validate transition
    if (!this.isValidTransition(currentState, newState)) {
      throw new Error(
        `Invalid lifecycle transition: ${currentState} -> ${newState}`
      );
    }

    // Update cell state
    cell.lifecycleState = newState;
    cell.updatedAt = Date.now();

    // Emit transition event
    this.emit('lifecycle_transition', {
      cellId: cell.id,
      from: currentState,
      to: newState
    });
  }

  /**
   * Validate state transition
   */
  private isValidTransition(
    from: LifecycleState,
    to: LifecycleState
  ): boolean {
    const validTransitions: Record<LifecycleState, LifecycleState[]> = {
      creating: ['active', 'deleted'],
      active: ['idle', 'deprecated', 'deleted'],
      idle: ['active', 'deprecated', 'deleted'],
      deprecated: ['idle', 'deleted'],
      deleted: []
    };

    return validTransitions[from].includes(to);
  }
}
```

### Lifecycle Triggers

```typescript
/**
 * Lifecycle transition triggers
 */
interface LifecycleTriggers {
  /**
   * Creation triggers
   */
  create: {
    /**
     * User types NLP command into cell
     */
    userInput: string;

    /**
     * Cell is copied from another cell
     */
    copiedFrom?: string;
  };

  /**
   * Activation triggers
   */
  activate: {
    /**
     * Cell receives input
     */
    inputReceived: boolean;

    /**
     * Cell is referenced by another active cell
     */
    referencedBy: string[];
  };

  /**
   * Deactivation triggers
   */
  deactivate: {
    /**
     * Cell hasn't been used for threshold time
     */
    idleThresholdMs: number;

    /**
     * Cell's input dependencies are all idle
     */
    inputsIdle: boolean;
  };

  /**
   * Deprecation triggers
   */
  deprecate: {
    /**
     * Better variant exists
     */
    betterVariantExists: boolean;

    /**
     * Cell's confidence has degraded
     */
    confidenceBelowThreshold: number;

    /**
     * Newer cell type replaces this one
     */
    replacedBy?: string;
  };

  /**
   * Deletion triggers
   */
  delete: {
    /**
     * User explicitly deletes cell
     */
    userDeleted: boolean;

    /**
     * Cell's confidence is too low
     */
    confidenceBelowThreshold: number;  // Default: 0.1

    /**
     * Cell hasn't been used for threshold time
     */
    unusedThresholdMs: number;  // Default: 30 days
  };
}
```

### Lifecycle State Machine

```typescript
/**
 * Cell lifecycle manager
 */
class CellLifecycleManager {
  /**
   * Check if cell should transition state
   */
  async checkLifecycle(cell: AgentCell): Promise<LifecycleState | null> {
    const currentState = cell.lifecycleState;
    const now = Date.now();

    switch (currentState) {
      case 'creating':
        // Cell should become active after initialization
        return 'active';

      case 'active':
        // Check if cell should become idle
        if (this.shouldBecomeIdle(cell)) {
          return 'idle';
        }
        break;

      case 'idle':
        // Check if cell should become active
        if (this.shouldBecomeActive(cell)) {
          return 'active';
        }

        // Check if cell should be deprecated
        if (this.shouldDeprecate(cell)) {
          return 'deprecated';
        }

        // Check if cell should be deleted
        if (this.shouldDelete(cell)) {
          return 'deleted';
        }
        break;

      case 'deprecated':
        // Check if cell should be deleted
        if (this.shouldDelete(cell)) {
          return 'deleted';
        }

        // Cell might come back if better variant fails
        if (this.shouldReActivate(cell)) {
          return 'idle';
        }
        break;

      case 'deleted':
        // Terminal state
        return null;
    }

    return null;
  }

  /**
   * Check if idle cell should become active
   */
  private shouldBecomeActive(cell: AgentCell): boolean {
    // Cell becomes active if it receives input
    const lastInput = this.getLastInputTime(cell.id);
    const timeSinceInput = Date.now() - lastInput;

    return timeSinceInput < 1000;  // 1 second threshold
  }

  /**
   * Check if active cell should become idle
   */
  private shouldBecomeIdle(cell: AgentCell): boolean {
    // Cell becomes idle if no recent activity
    const timeSinceLastExecution = Date.now() - (cell.lastExecutedAt ?? 0);

    return timeSinceLastExecution > 60000;  // 1 minute threshold
  }

  /**
   * Check if cell should be deprecated
   */
  private shouldDeprecate(cell: AgentCell): boolean {
    // Cell is deprecated if a better variant exists
    const variants = this.getCellVariants(cell.id);
    const bestVariant = this.getBestVariant(variants);

    if (bestVariant && bestVariant.id !== cell.variantId) {
      // Check if best variant is significantly better
      const performanceGap = bestVariant.valueFunction - cell.valueFunction;

      return performanceGap > 0.2;  // 20% improvement threshold
    }

    return false;
  }

  /**
   * Check if cell should be deleted
   */
  private shouldDelete(cell: AgentCell): boolean {
    // Cell is deleted if confidence is too low
    if (cell.confidence < 0.1) {
      return true;
    }

    // Cell is deleted if unused for too long
    const timeSinceLastExecution = Date.now() - (cell.lastExecutedAt ?? cell.createdAt);
    const unusedThreshold = 30 * 24 * 60 * 60 * 1000;  // 30 days

    return timeSinceLastExecution > unusedThreshold;
  }
}
```

---

## Cell Types vs Instances

### CellType (Template)

```typescript
/**
 * CellType - Reusable cell template
 *
 * A CellType is a template that can be instantiated multiple times.
 * Like a class in OOP, but for agents.
 */
interface CellType {
  /**
   * Unique type identifier
   */
  id: string;

  /**
   * Type name (human-readable)
   */
  name: string;

  /**
   * Type description
   */
  description: string;

  /**
   * Default function (NLP description)
   */
  defaultFunction: string;

  /**
   * Default logic level
   */
  defaultLogicLevel: 0 | 1 | 2 | 3;

  /**
   * Default level config
   */
  defaultLevelConfig: Level0Config | Level1Config | Level2Config | Level3Config;

  /**
   * Default patterns (starting patterns for new instances)
   */
  defaultPatterns: Pattern[];

  /**
   * Default weights (starting weights for new instances)
   */
  defaultWeights: Map<string, number>;

  /**
   * Type metadata
   */
  metadata: CellTypeMetadata;

  /**
   * When this type was created
   */
  createdAt: number;

  /**
   * When this type was last updated
   */
  updatedAt: number;
}

/**
 * Cell type metadata
 */
interface CellTypeMetadata {
  /**
   * Type category
   */
  category: CellTypeCategory;

  /**
   * Type tags
   */
  tags: string[];

  /**
   * How many instances of this type exist
   */
  instanceCount: number;

  /**
   * Average success rate across all instances
   */
  avgSuccessRate: number;

  /**
   * Average value function across all instances
   */
  avgValueFunction: number;
}

/**
 * Cell type categories
 */
type CellTypeCategory =
  | 'data_processing'     // Process and transform data
  | 'analysis'           // Analyze and extract insights
  | 'generation'         // Generate new content
  | 'classification'     // Classify data into categories
  | 'summarization'      // Summarize content
  | 'extraction'         // Extract information
  | 'validation'         // Validate data
  | 'arithmetic'         // Perform calculations
  | 'lookup'            // Look up values
  | 'custom';           // Custom user-defined type
```

### CellInstance

```typescript
/**
 * CellInstance - A specific cell in a spreadsheet
 *
 * A CellInstance is an instantiation of a CellType at a specific
 * position in a spreadsheet.
 */
interface CellInstance extends AgentCell {
  /**
   * Reference to cell type (if derived from a type)
   */
  typeId?: string;

  /**
   * Instance-specific overrides
   */
  overrides?: {
    function?: string;
    logicLevel?: 0 | 1 | 2 | 3;
    levelConfig?: Level0Config | Level1Config | Level2Config | Level3Config;
  };

  /**
   * Instance position
   */
  position: {
    sheetId: string;
    row: number;
    col: number;
    colLetter: string;
  };
}

/**
 * Instance creation from type
 */
class CellInstanceFactory {
  /**
   * Create a cell instance from a type
   */
  createFromType(
    type: CellType,
    position: CellInstance['position'],
    overrides?: CellInstance['overrides']
  ): CellInstance {
    const instance: CellInstance = {
      id: this.formatCellId(position),
      position,

      // Use overrides or defaults
      function: overrides?.function ?? type.defaultFunction,
      logicLevel: overrides?.logicLevel ?? type.defaultLogicLevel,
      levelConfig: overrides?.levelConfig ?? type.defaultLevelConfig,

      // Clone default patterns and weights
      patterns: type.defaultPatterns.map(p => ({...p})),
      weights: new Map(type.defaultWeights),

      // Initialize metadata
      typeId: type.id,
      confidence: 0.5,
      usage: 0,
      successCount: 0,
      failureCount: 0,
      valueFunction: 0.5,
      avgExecutionTimeMs: 0,
      avgCostPerExecution: 0,

      // Initialize lifecycle
      lifecycleState: 'creating',
      createdAt: Date.now(),
      updatedAt: Date.now(),

      // Initialize learning
      observations: [],
      eligibilityTraces: new Map(),
      learningRate: 0.01,
      decayRate: 0.001,

      // Initialize constraints and success conditions
      constraints: [],
      successConditions: [],

      // Apply overrides
      overrides
    };

    return instance;
  }

  /**
   * Format cell ID from position
   */
  private formatCellId(position: CellInstance['position']): string {
    return `${position.sheetId}!${position.colLetter}${position.row}`;
  }
}
```

### CellVariant

```typescript
/**
 * CellVariant - Multiple approaches to the same task
 *
 * Variants enable "durability through diversity" - if one variant
 * fails, another may succeed.
 */
interface CellVariant {
  /**
   * Unique variant identifier
   */
  id: string;

  /**
   * Parent cell ID
   */
  parentCellId: string;

  /**
   * Variant type
   */
  variantType: VariantType;

  /**
   * Variant description
   */
  description: string;

  /**
   * Variant-specific function override
   */
  functionOverride?: string;

  /**
   * Variant-specific logic level
   */
  logicLevelOverride?: 0 | 1 | 2 | 3;

  /**
   * Variant-specific level config
   */
  levelConfigOverride?: Level0Config | Level1Config | Level2Config | Level3Config;

  /**
   * Variant performance
   */
  performance: {
    executions: number;
    successes: number;
    avgReward: number;
    avgExecutionTimeMs: number;
    avgCostPerExecution: number;
  };

  /**
   * Selection weight (for Plinko selection)
   */
  selectionWeight: number;

  /**
   * When this variant was created
   */
  createdAt: number;

  /**
   * When this variant was last selected
   */
  lastSelected: number;
}

/**
 * Variant types
 */
type VariantType =
  | 'parameter_noise'      // Small random perturbations
  | 'crossover'           // Crossover of two parent cells
  | 'distillation'        // Distilled from higher level
  | 'dropout'            // Some features disabled
  | 'user_created'       // User-specified variant
  | 'evolved';           // Emerged from evolution

/**
 * Variant creation
 */
class VariantFactory {
  /**
   * Create a new variant from a parent cell
   */
  createVariant(
    parentCell: AgentCell,
    variantType: VariantType,
    description?: string
  ): CellVariant {
    const variant: CellVariant = {
      id: uuid(),
      parentCellId: parentCell.id,
      variantType,
      description: description ?? `Variant of ${parentCell.id}`,

      // Variant-specific overrides based on type
      ...this.createVariantOverrides(parentCell, variantType),

      // Initialize performance
      performance: {
        executions: 0,
        successes: 0,
        avgReward: 0.5,
        avgExecutionTimeMs: parentCell.avgExecutionTimeMs,
        avgCostPerExecution: parentCell.avgCostPerExecution
      },

      // Start with low selection weight
      selectionWeight: 0.1,

      createdAt: Date.now(),
      lastSelected: Date.now()
    };

    return variant;
  }

  /**
   * Create variant-specific overrides based on variant type
   */
  private createVariantOverrides(
    parentCell: AgentCell,
    variantType: VariantType
  ): Partial<CellVariant> {
    switch (variantType) {
      case 'parameter_noise':
        // Add small noise to parameters
        return {
          logicLevelOverride: parentCell.logicLevel,
          levelConfigOverride: this.addNoiseToConfig(parentCell.levelConfig)
        };

      case 'distillation':
        // Create lower-level variant
        return {
          logicLevelOverride: Math.max(0, parentCell.logicLevel - 1) as 0 | 1 | 2 | 3
        };

      case 'dropout':
        // Randomly disable some features
        return {
          levelConfigOverride: this.dropoutFeatures(parentCell.levelConfig)
        };

      default:
        return {};
    }
  }

  /**
   * Select a variant using Plinko-style stochastic selection
   */
  selectVariant(
    variants: CellVariant[],
    temperature: number = 1.0
  ): CellVariant {
    if (variants.length === 0) {
      throw new Error('No variants to select from');
    }

    if (variants.length === 1) {
      return variants[0];
    }

    // Calculate selection probabilities using softmax
    const weights = variants.map(v => v.selectionWeight);
    const maxWeight = Math.max(...weights);
    const expWeights = weights.map(w => Math.exp((w - maxWeight) / temperature));
    const sumExp = expWeights.reduce((a, b) => a + b, 0);
    const probabilities = expWeights.map(e => e / sumExp);

    // Sample from categorical distribution
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probabilities.length; i++) {
      cumulative += probabilities[i];
      if (random <= cumulative) {
        return variants[i];
      }
    }

    return variants[variants.length - 1];
  }
}
```

---

## Decision Tree

### Logic Level Decision Tree

```
Should this cell use Level 0 (Pure Logic)?
│
├─ Is the task mathematically defined?
│  ├─ Yes → Can it be expressed as arithmetic/string operations?
│  │  ├─ Yes → Use Level 0
│  │  └─ No  → Continue to Level 1 check
│  └─ No  → Continue to Level 1 check
│
├─ Can we use Level 1 (Cached Patterns)?
│  ├─ Has this pattern been seen before?
│  │  ├─ Yes → Is cache similarity > threshold (0.85)?
│  │  │  ├─ Yes → Use Level 1
│  │  │  └─ No  → Continue to Level 2 check
│  │  └─ No  → Continue to Level 2 check
│
├─ Can we use Level 2 (Distilled Agent)?
│  ├─ Has this task been repeated >100 times?
│  │  ├─ Yes → Is success rate >90%?
│  │  │  ├─ Yes → Is distilled model available?
│  │  │  │  ├─ Yes → Use Level 2
│  │  │  │  └─ No  → Continue to Level 3 check
│  │  │  └─ No  → Continue to Level 3 check
│  │  └─ No  → Continue to Level 3 check
│
└─ Use Level 3 (Full LLM)
```

### Decision Tree Implementation

```typescript
/**
 * Logic level decision tree
 */
class LogicLevelDecisionTree {
  /**
   * Determine the appropriate logic level for a cell
   */
  async determineLogicLevel(
    cell: AgentCell,
    context: DecisionContext
  ): Promise<0 | 1 | 2 | 3> {
    // Check Level 0: Pure Logic
    if (await this.shouldUseLevel0(cell, context)) {
      return 0;
    }

    // Check Level 1: Cached Patterns
    if (await this.shouldUseLevel1(cell, context)) {
      return 1;
    }

    // Check Level 2: Distilled Agent
    if (await this.shouldUseLevel2(cell, context)) {
      return 2;
    }

    // Default to Level 3: Full LLM
    return 3;
  }

  /**
   * Check if Level 0 (Pure Logic) is appropriate
   */
  private async shouldUseLevel0(
    cell: AgentCell,
    context: DecisionContext
  ): Promise<boolean> {
    // Is the task mathematically defined?
    const isMathematicallyDefined = await this.isMathematicallyDefined(
      cell.function,
      context
    );

    if (!isMathematicallyDefined) {
      return false;
    }

    // Can it be expressed as arithmetic/string operations?
    const canExpressAsOperations = await this.canExpressAsOperations(
      cell.function,
      context
    );

    return canExpressAsOperations;
  }

  /**
   * Check if Level 1 (Cached Patterns) is appropriate
   */
  private async shouldUseLevel1(
    cell: AgentCell,
    context: DecisionContext
  ): Promise<boolean> {
    // Has this pattern been seen before?
    const inputEmbedding = await this.embed(context.input);
    const cacheMatches = await this.queryKVCache(inputEmbedding);

    if (cacheMatches.length === 0) {
      return false;
    }

    // Is cache similarity above threshold?
    const bestMatch = cacheMatches[0];
    const threshold = cell.levelConfig?.cacheHitThreshold ?? 0.85;

    return bestMatch.similarity >= threshold;
  }

  /**
   * Check if Level 2 (Distilled Agent) is appropriate
   */
  private async shouldUseLevel2(
    cell: AgentCell,
    context: DecisionContext
  ): Promise<boolean> {
    // Has this task been repeated >100 times?
    const minUsageCount = 100;
    if (cell.usage < minUsageCount) {
      return false;
    }

    // Is success rate >90%?
    const successRate = cell.successCount / cell.usage;
    const minSuccessRate = 0.9;
    if (successRate < minSuccessRate) {
      return false;
    }

    // Is distilled model available?
    const distilledModel = await this.findDistilledModel(cell);
    return distilledModel !== null;
  }

  /**
   * Check if task is mathematically defined
   */
  private async isMathematicallyDefined(
    task: string,
    context: DecisionContext
  ): Promise<boolean> {
    // Use a small classifier to determine if task is mathematical
    const classification = await this.taskClassifier.classify({
      task,
      context
    });

    return classification.category === 'mathematical';
  }

  /**
   * Query KV-cache for similar patterns
   */
  private async queryKVCache(
    embedding: number[]
  ): Promise<Array<{anchorId: string; similarity: number}>> {
    // Use ANN index to find similar anchors
    return this.kvAnchorPool.match({
      embedding,
      threshold: 0.85,
      maxMatches: 1
    });
  }

  /**
   * Find distilled model for a cell
   */
  private async findDistilledModel(
    cell: AgentCell
  ): Promise<Level2ModelRef | null> {
    // Check if a distilled model exists for this cell type
    const distilledModel = await this.modelRegistry.findDistilledModel({
      function: cell.function,
      logicLevel: 2
    });

    return distilledModel ?? null;
  }
}

/**
 * Decision context
 */
interface DecisionContext {
  /**
   * Input data
   */
  input: unknown;

  /**
   * Available models
   */
  availableModels: {
    level1: boolean;  // KV-cache available
    level2: boolean;  // Distilled model available
    level3: boolean;  // Full LLM available
  };

  /**
   * Performance constraints
   */
  constraints: {
    maxLatencyMs?: number;
    maxCost?: number;
    minAccuracy?: number;
  };

  /**
   * Spreadsheet context
   */
  spreadsheet: {
    sheetId: string;
    range: string;
    dependentCells: string[];
  };
}
```

---

## Examples

### Example 1: Level 0 Cell (Arithmetic)

```typescript
/**
 * Example: Sum a range of cells
 *
 * Cell A10: "Sum the values in A1:A9"
 */
const level0Cell: AgentCell = {
  // Identity
  id: 'sheet1!A10',
  position: {
    sheetId: 'sheet1',
    row: 10,
    col: 1,
    colLetter: 'A'
  },

  // Function
  function: 'Sum the values in A1:A9',
  logicLevel: 0,
  levelConfig: {
    logicLevel: 0,
    logic: {
      type: 'arithmetic',
      operator: '+',
      operands: [
        {reference: 'sheet1!A1'},
        {reference: 'sheet1!A2'},
        {reference: 'sheet1!A3'},
        {reference: 'sheet1!A4'},
        {reference: 'sheet1!A5'},
        {reference: 'sheet1!A6'},
        {reference: 'sheet1!A7'},
        {reference: 'sheet1!A8'},
        {reference: 'sheet1!A9'}
      ]
    },
    operationType: 'arithmetic',
    deterministic: true,
    reproducible: true
  },

  // Induced logic
  patterns: [
    {
      id: 'pattern-sum-arithmetic',
      embedding: [0.1, 0.2, -0.3, ...],  // 64-dimensional embedding
      inputExamples: [
        {value: [1, 2, 3, 4, 5], dataType: 'array', hash: 'abc123', observedAt: Date.now()}
      ],
      outputExamples: [
        {value: 15, dataType: 'number', hash: 'def456', observedAt: Date.now()}
      ],
      metadata: {
        category: 'arithmetic_addition',
        complexity: 0.1,
        stability: 1.0,
        generality: 0.9,
        confidence: 1.0,
        relatedPatterns: []
      },
      observedAt: Date.now(),
      frequency: 100,
      successRate: 1.0
    }
  ],

  // Weights (connections to other cells)
  weights: new Map([
    ['sheet1!A1', 0.1],  // Weak positive connection
    ['sheet1!A2', 0.1],
    ['sheet1!A3', 0.1],
    // ... etc
  ]),

  // Constraints
  constraints: [],
  successConditions: [
    {
      type: 'range_check',
      condition: 'result should be >= minimum input value',
      priority: 'error'
    }
  ],

  // Metadata
  confidence: 1.0,
  usage: 100,
  successCount: 100,
  failureCount: 0,
  valueFunction: 1.0,
  avgExecutionTimeMs: 0.5,
  avgCostPerExecution: 0,

  // Lifecycle
  lifecycleState: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastExecutedAt: Date.now(),

  // Learning
  observations: [],
  eligibilityTraces: new Map(),
  learningRate: 0.01,
  decayRate: 0.001
};

// Execution
const result = await executeCell(level0Cell);
// Result: 15 (sum of A1:A9)
// Latency: <1ms
// Cost: $0
```

### Example 2: Level 1 Cell (Cached Pattern)

```typescript
/**
 * Example: Extract domain from URL (cached)
 *
 * Cell B1: "Extract the domain from the URL in A1"
 * URL: "https://www.example.com/path/to/page"
 * Expected output: "www.example.com"
 */
const level1Cell: AgentCell = {
  // Identity
  id: 'sheet1!B1',
  position: {
    sheetId: 'sheet1',
    row: 1,
    col: 2,
    colLetter: 'B'
  },

  // Function
  function: 'Extract the domain from the URL',
  logicLevel: 1,
  levelConfig: {
    logicLevel: 1,
    cacheKey: 'kv-anchor-url-domain-extraction',
    cacheHitThreshold: 0.85,
    maxCacheMatches: 1,
    sourceComputationId: 'original-llm-call-123',
    cachedAt: Date.now() - 86400000,  // 1 day ago
    cacheHits: 50,
    cacheMisses: 5,
    fallbackLevel: 3
  },

  // Model reference (KV-cache)
  modelRef: {
    type: 'kv_cache',
    anchorPoolId: 'pool-url-processing',
    anchorId: 'anchor-url-domain-123',
    layerId: 0
  },

  // Induced logic
  patterns: [
    {
      id: 'pattern-url-domain-extraction',
      embedding: [0.5, -0.3, 0.8, ...],  // 64-dimensional embedding
      inputExamples: [
        {value: 'https://www.example.com/path', dataType: 'string', hash: 'xyz789', observedAt: Date.now()},
        {value: 'https://github.com/user/repo', dataType: 'string', hash: 'ghi012', observedAt: Date.now()}
      ],
      outputExamples: [
        {value: 'www.example.com', dataType: 'string', hash: 'jkl345', observedAt: Date.now()},
        {value: 'github.com', dataType: 'string', hash: 'mno678', observedAt: Date.now()}
      ],
      metadata: {
        category: 'string_extraction',
        complexity: 0.5,
        stability: 0.9,
        generality: 0.8,
        confidence: 0.92,
        relatedPatterns: []
      },
      observedAt: Date.now(),
      frequency: 55,
      successRate: 0.95
    }
  ],

  // Weights
  weights: new Map([
    ['sheet1!A1', 0.9]  // Strong connection to input cell
  ]),

  // Constraints
  constraints: [
    {
      type: 'format_check',
      constraint: 'output should be a valid domain name',
      priority: 'error'
    }
  ],
  successConditions: [],

  // Metadata
  confidence: 0.92,
  usage: 55,
  successCount: 52,
  failureCount: 3,
  valueFunction: 0.9,
  avgExecutionTimeMs: 12,
  avgCostPerExecution: 0.0001,

  // Lifecycle
  lifecycleState: 'active',
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  lastExecutedAt: Date.now(),

  // Learning
  observations: [],
  eligibilityTraces: new Map(),
  learningRate: 0.01,
  decayRate: 0.001
};

// Execution (cache HIT)
const input = 'https://www.example.com/path/to/page';
const result = await executeCell(level1Cell, input);
// Result: "www.example.com"
// Cache similarity: 0.94
// Latency: ~12ms
// Cost: $0.0001
```

### Example 3: Level 2 Cell (Distilled Agent)

```typescript
/**
 * Example: Classify customer feedback sentiment (distilled)
 *
 * Cell C1: "Classify the sentiment of customer feedback"
 *
 * This cell has been used 500+ times with 95% success rate,
 * so it was distilled from GPT-4 to a 500M parameter model.
 */
const level2Cell: AgentCell = {
  // Identity
  id: 'sheet1!C1',
  position: {
    sheetId: 'sheet1',
    row: 1,
    col: 3,
    colLetter: 'C'
  },

  // Function
  function: 'Classify the sentiment of customer feedback',
  logicLevel: 2,
  levelConfig: {
    logicLevel: 2,
    modelRef: {
      type: 'distilled',
      modelId: 'polln-sentiment-classifier-v1',
      modelSize: 500_000_000,  // 500M parameters
      distillationDate: Date.now() - 604800000,  // 1 week ago
      sourceLLM: 'claude-opus-4-5',
      performance: {
        avgLatencyMs: 120,
        avgCostPer1kTokens: 0.0001,
        qualityScore: 0.94,  // 94% of source LLM quality
        accuracyVsSource: 0.94
      }
    },
    modelConfig: {
      temperature: 0.1,
      maxTokens: 10,
      stopSequences: ['\n']
    },
    distillationDate: Date.now() - 604800000,
    distillationAccuracy: 0.94,
    fallbackThreshold: 0.7
  },

  // Induced logic
  patterns: [
    {
      id: 'pattern-sentiment-classification',
      embedding: [0.2, 0.7, -0.1, ...],  // 64-dimensional embedding
      inputExamples: [
        {value: 'Great product, very happy!', dataType: 'string', hash: 'pqr101', observedAt: Date.now()},
        {value: 'Terrible experience, would not recommend', dataType: 'string', hash: 'stu202', observedAt: Date.now()}
      ],
      outputExamples: [
        {value: 'positive', dataType: 'string', hash: 'vwx303', observedAt: Date.now()},
        {value: 'negative', dataType: 'string', hash: 'yzx404', observedAt: Date.now()}
      ],
      metadata: {
        category: 'classification',
        complexity: 0.7,
        stability: 0.85,
        generality: 0.75,
        confidence: 0.94,
        relatedPatterns: []
      },
      observedAt: Date.now(),
      frequency: 500,
      successRate: 0.95
    }
  ],

  // Weights
  weights: new Map([
    ['sheet1!B1', 0.8]  // Connection to feedback text cell
  ]),

  // Constraints
  constraints: [
    {
      type: 'enum_check',
      constraint: 'output must be one of: positive, neutral, negative',
      priority: 'error'
    }
  ],
  successConditions: [],

  // Metadata
  confidence: 0.94,
  usage: 500,
  successCount: 475,
  failureCount: 25,
  valueFunction: 0.95,
  avgExecutionTimeMs: 120,
  avgCostPerExecution: 0.001,

  // Lifecycle
  lifecycleState: 'active',
  createdAt: Date.now() - 2592000000,  // 30 days ago
  updatedAt: Date.now() - 604800000,  // Updated when distilled
  lastExecutedAt: Date.now(),

  // Learning
  observations: [],
  eligibilityTraces: new Map(),
  learningRate: 0.01,
  decayRate: 0.001
};

// Execution
const input = 'The product is okay, nothing special';
const result = await executeCell(level2Cell, input);
// Result: "neutral"
// Confidence: 0.89
// Latency: ~120ms
// Cost: $0.001
// vs Level 3: ~1000ms, $0.01
```

### Example 4: Level 3 Cell (Full LLM)

```typescript
/**
 * Example: Generate product description (novel task)
 *
 * Cell D1: "Generate a compelling product description based on features"
 *
 * This is a novel task with high variability, so we use the full LLM.
 * After ~100 uses with high success, it will be distilled to Level 2.
 */
const level3Cell: AgentCell = {
  // Identity
  id: 'sheet1!D1',
  position: {
    sheetId: 'sheet1',
    row: 1,
    col: 4,
    colLetter: 'D'
  },

  // Function
  function: 'Generate a compelling product description',
  logicLevel: 3,
  levelConfig: {
    logicLevel: 3,
    modelRef: {
      type: 'llm',
      provider: 'anthropic',
      model: 'claude-opus-4-5',
      apiEndpoint: 'https://api.anthropic.com/v1/messages',
      cost: {
        avgInputTokens: 150,
        avgOutputTokens: 200,
        avgCostPerCall: 0.012
      },
      performance: {
        avgLatencyMs: 1200
      },
      distillation: {
        priority: 'medium',
        estimatedSavings: 0.90,  // 90% cost savings if distilled
        readyForDistillation: false  // Not enough usage yet
      }
    },
    apiConfig: {
      temperature: 0.7,
      maxTokens: 500,
      topP: 0.9,
      stopSequences: [],
      timeoutMs: 30000
    },
    distillationConfig: {
      minUsageCount: 100,
      minSuccessRate: 0.9,
      minTotalSpend: 1.0,
      minPatternConsistency: 0.85,
      maxInputVariance: 0.3
    },
    retryConfig: {
      maxRetries: 3,
      backoffMs: 1000
    }
  },

  // Induced logic
  patterns: [
    {
      id: 'pattern-product-description-generation',
      embedding: [0.9, 0.3, -0.5, ...],  // 64-dimensional embedding
      inputExamples: [
        {value: 'Wireless headphones, 20h battery, noise cancelling', dataType: 'string', hash: 'abc555', observedAt: Date.now()}
      ],
      outputExamples: [
        {value: 'Experience unparalleled audio freedom with our premium wireless headphones...', dataType: 'string', hash: 'def666', observedAt: Date.now()}
      ],
      metadata: {
        category: 'generation',
        complexity: 0.9,
        stability: 0.5,  // Low stability (high variability)
        generality: 0.6,  // Low generality (task-specific)
        confidence: 0.85,
        relatedPatterns: []
      },
      observedAt: Date.now(),
      frequency: 10,  // Not yet used enough
      successRate: 0.9
    }
  ],

  // Weights
  weights: new Map([
    ['sheet1!C1', 0.7]  // Connection to features cell
  ]),

  // Constraints
  constraints: [
    {
      type: 'length_check',
      constraint: 'output should be 100-500 characters',
      priority: 'warning'
    },
    {
      type: 'content_check',
      constraint: 'output should not include false claims',
      priority: 'error'
    }
  ],
  successConditions: [
    {
      type: 'quality_check',
      condition: 'output should be compelling and persuasive',
      priority: 'high'
    }
  ],

  // Metadata
  confidence: 0.85,
  usage: 10,  // Not yet used enough for distillation
  successCount: 9,
  failureCount: 1,
  valueFunction: 0.88,
  avgExecutionTimeMs: 1200,
  avgCostPerExecution: 0.012,

  // Lifecycle
  lifecycleState: 'active',
  createdAt: Date.now() - 86400000,  // 1 day ago
  updatedAt: Date.now(),
  lastExecutedAt: Date.now(),

  // Learning
  observations: [],
  eligibilityTraces: new Map(),
  learningRate: 0.01,
  decayRate: 0.001
};

// Execution
const input = 'Smart watch, health tracking, GPS, 7-day battery life';
const result = await executeCell(level3Cell, input);
// Result: "Stay connected and healthy with our cutting-edge smart watch..."
// Confidence: 0.88
// Latency: ~1200ms
// Cost: $0.012
//
// Note: After 90 more successful executions, this cell will be
// distilled to Level 2, reducing cost to ~$0.001 and latency to ~120ms.
```

---

## Appendix: Related POLLN Types

### Dependencies on Core Types

```typescript
// Re-exported from src/core/types.ts
import type {
  A2APackage,
  PrivacyLevel,
  SubsumptionLayer,
  AgentConfig,
  AgentState,
  SynapseConfig,
  SynapseState,
  Proposal,
  DiscriminatorResult,
  PlinkoDecision,
  EmbeddingVector,
  EmbeddingMetadata,
  PollenGrain,
  ConsensusType,
  ConsensusVote,
  ConsensusResult,
  PathwayState,
  SafetyConstraint,
  SafetyCheckResult,
  ResourceBudget,
  EligibilityTrace,
  ContextSegment,
  SharedContext,
  ContextReuseDecision,
  ContextOffset,
  ContextReusePolicy,
  ContextDiff
} from '../../src/core/types.js';

// Re-exported from src/core/tile.ts
import type {
  Tile,
  TileCategory,
  TileContext,
  TileResult,
  Observation,
  TileOutcome,
  TileVariant,
  TileConfig
} from '../../src/core/tile.js';
```

---

## Glossary

| Term | Definition |
|------|------------|
| **AgentCell** | A spreadsheet cell containing an autonomous agent |
| **Logic Level** | 0-4 scale determining computation method (0=pure logic, 3=full LLM) |
| **Pattern** | Compressed behavioral representation (embedding + examples) |
| **Weight** | Connection strength between cells [-1, 1] |
| **KV-cache** | Key-Value cache from LLM attention layers (Level 1) |
| **Distillation** | Process of training small model from large LLM (Level 3 → Level 2) |
| **Induced Logic** | Behavior learned from examples, not explicitly coded |
| **Hebbian Learning** | "Neurons that fire together, wire together" - weight update rule |
| **TD(lambda)** | Temporal Difference learning with eligibility traces |
| **Value Function** | Prediction of long-term value (karmic record) |
| **Plinko Selection** | Stochastic selection with temperature-controlled exploration |
| **CellType** | Reusable cell template |
| **CellInstance** | Specific cell at a spreadsheet position |
| **CellVariant** | Multiple approaches to the same task |

---

**End of Specification**

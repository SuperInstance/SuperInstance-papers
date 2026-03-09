# BREAKDOWN_R2: Transformer Layer to Cell Mapping

**"We are a kind of transformer reverse engineer. We can turn chatbot logic into boxes for breakdown and analysis. Fracture the 4th wall of AI."**

---

## Executive Summary

This document specifies how POLLN's Breakdown Engine maps transformer layer outputs to discrete cell operations. By decomposing transformer architectures layer-by-layer, we extract reusable reasoning components that power inspectable, understandable AI agents.

**Core Innovation**: Reverse-engineering transformer black boxes into glass-box cell networks.

**Phase Status**: ✅ Round 2 Design Complete
**Target Integration**: Breakdown Engine → AgentCell System
**Dependencies**: Round 1 (Reasoning Extraction, Discretization Engine, Simulation Design, Confidence Scoring)

---

## Table of Contents

1. [Vision & Philosophy](#vision--philosophy)
2. [Transformer Architecture Primer](#transformer-architecture-primer)
3. [Layer-Wise Decomposition](#layer-wise-decomposition)
4. [Attention Head to Cell Mapping](#attention-head-to-cell-mapping)
5. [FFN to Logic Mapping](#ffn-to-logic-mapping)
6. [Residual Stream Tracking](#residual-stream-tracking)
7. [Type System & Interfaces](#type-system--interfaces)
8. [Integration with AgentCell](#integration-with-agentcell)
9. [Real-World Architectures](#real-world-architectures)
10. [Implementation Examples](#implementation-examples)

---

## Vision & Philosophy

### The Problem

Transformers are black boxes:

```
Input → [Transformer Layers] → Output
         ↓
    "I don't know what happened in here"
```

### Our Solution

Decompose transformers into inspectable cells:

```
Input → [Layer 0 Cells] → [Layer 1 Cells] → ... → [Layer N Cells] → Output
         ↓                  ↓                    ↓
    "I can explain every operation"
```

### Key Insight

> **Every transformer layer is a composition of discrete operations.**
>
> - Attention heads route information
> - FFNs process and transform
> - Residual connections flow through
> - Each can be extracted as a cell

---

## Transformer Architecture Primer

### Core Components

```typescript
interface TransformerLayer {
  // Self-attention: routes information between positions
  attention: MultiHeadAttention;

  // Feed-forward: processes each position independently
  ffn: FeedForwardNetwork;

  // Residual: allows information to flow through
  residual: ResidualConnection;

  // Normalization: stabilizes training
  norm: LayerNormalization;
}
```

### Information Flow

```
Input Tokens
    ↓
[Embedding Layer]
    ↓
For each layer:
    1. Self-Attention (mix information across positions)
    2. Add & Norm (residual connection)
    3. Feed-Forward (process each position)
    4. Add & Norm (residual connection)
    ↓
[Output Head]
    ↓
Predictions
```

### Layer Specialization

Research shows transformer layers specialize:

| Layer Range | Primary Function | Cell Types |
|-------------|------------------|------------|
| **0-4** (Early) | Syntactic processing, local patterns | `PatternMatcher`, `SyntaxParser` |
| **5-8** (Middle) | Semantic composition, fact retrieval | `KnowledgeRetriever`, `SemanticComposer` |
| **9-12** (Late) | Task reasoning, output generation | `ReasoningCell`, `DecisionMaker` |
| **13+** (Deep) | Abstract reasoning, meta-cognition | `MetaReasoner`, `StrategyCell` |

---

## Layer-Wise Decomposition

### Decomposition Algorithm

```typescript
/**
 * Decompose a transformer layer into discrete cells
 */
class LayerDecomposer {
  /**
   * Main decomposition entry point
   */
  decomposeLayer(
    layerIndex: number,
    layer: TransformerLayer,
    inputState: LayerState
  ): LayerDecomposition {

    // 1. Analyze attention patterns
    const attentionCells = this.decomposeAttention(
      layer.attention,
      inputState
    );

    // 2. Analyze FFN operations
    const ffnCells = this.decomposeFFN(
      layer.ffn,
      inputState
    );

    // 3. Track residual flow
    const residualFlow = this.trackResiduals(
      layer,
      inputState
    );

    // 4. Identify emergent operations
    const emergentCells = this.identifyEmergentOperations(
      attentionCells,
      ffnCells,
      residualFlow
    );

    return {
      layerIndex,
      attentionCells,
      ffnCells,
      residualFlow,
      emergentCells,
      outputState: this.computeOutputState(layer, inputState)
    };
  }

  /**
   * Decompose multi-head attention into cells
   */
  private decomposeAttention(
    attention: MultiHeadAttention,
    state: LayerState
  ): AttentionCell[] {
    const cells: AttentionCell[] = [];

    for (let headIdx = 0; headIdx < attention.numHeads; headIdx++) {
      const head = attention.heads[headIdx];

      // Analyze attention pattern
      const pattern = this.analyzeAttentionPattern(head, state);

      // Classify head function
      const functionType = this.classifyAttentionHead(pattern);

      // Create cell based on function
      const cell = this.createAttentionCell(
        headIdx,
        pattern,
        functionType
      );

      cells.push(cell);
    }

    return cells;
  }

  /**
   * Decompose FFN into logic cells
   */
  private decomposeFFN(
    ffn: FeedForwardNetwork,
    state: LayerState
  ): FFNCell[] {
    const cells: FFNCell[] = [];

    // View FFN as key-value memory
    const neurons = ffn.neurons;

    for (let neuronIdx = 0; neuronIdx < neurons.length; neuronIdx++) {
      const neuron = neurons[neuronIdx];

      // Analyze neuron activation pattern
      const activation = this.analyzeNeuronActivation(neuron, state);

      // Identify stored knowledge/pattern
      const knowledge = this.identifyNeuronKnowledge(neuron, activation);

      // Create knowledge retrieval cell
      const cell = this.createFFNCell(
        neuronIdx,
        activation,
        knowledge
      );

      cells.push(cell);
    }

    return cells;
  }

  /**
   * Track information flow through residual stream
   */
  private trackResiduals(
    layer: TransformerLayer,
    state: LayerState
  ): ResidualFlow {
    const flow: ResidualFlow = {
      inputStream: state,
      attentionStream: null,
      ffnStream: null,
      outputStream: null,
      contributions: {}
    };

    // Track how much each component contributes
    const attentionOutput = layer.attention.forward(state);
    flow.attentionStream = attentionOutput;
    flow.contributions['attention'] = this.computeContribution(
      state,
      attentionOutput
    );

    const ffnOutput = layer.ffn.forward(attentionOutput + state);
    flow.ffnStream = ffnOutput;
    flow.contributions['ffn'] = this.computeContribution(
      attentionOutput + state,
      ffnOutput
    );

    flow.outputStream = ffnOutput + attentionOutput + state;

    return flow;
  }
}
```

### Layer State Representation

```typescript
interface LayerState {
  // Hidden states for each position
  hiddenStates: Float32Array[];  // [seqLen, hiddenDim]

  // Attention patterns (for visualization)
  attentionPatterns?: AttentionPattern[];

  // Metadata
  position: number;
  timestamp: number;
}

interface AttentionPattern {
  headIndex: number;
  fromPosition: number;
  toPosition: number;
  weight: number;
  type: 'local' | 'global' | 'specialized';
}

interface LayerDecomposition {
  layerIndex: number;
  attentionCells: AttentionCell[];
  ffnCells: FFNCell[];
  residualFlow: ResidualFlow;
  emergentCells: EmergentCell[];
  outputState: LayerState;
}
```

---

## Attention Head to Cell Mapping

### Attention Head Taxonomy

Research shows attention heads specialize:

| Head Type | Function | Cell Class | Pattern |
|-----------|----------|------------|---------|
| **Positional** | Track token positions | `PositionTrackerCell` | Attend to position encodings |
| **Syntactic** | Parse grammatical structure | `SyntaxParserCell` | Attend to syntactic dependencies |
| **Semantic** | Link related concepts | `SemanticLinkerCell` | Attend to semantically similar tokens |
| **Coreference** | Link entity mentions | `CoreferenceCell` | Attend to same entity mentions |
| **Question-Answering** | Match questions to evidence | `QAMatcherCell` | Attend to question-relevant context |
| **Induction** | Copy patterns | `PatternCopierCell` | Attend to previous similar patterns |
| **Subsequent** | Suppress next tokens | `PrefixMatchCell` | Attend to subsequent tokens |
| **Delimiter** | Handle structure | `DelimiterCell` | Attend to structural markers |

### Attention Cell Specification

```typescript
interface AttentionCell extends AgentCell {
  // Cell identification
  cellType: 'attention';
  headIndex: number;
  headType: AttentionHeadType;

  // Attention pattern
  pattern: AttentionPattern;
  patternStability: number;  // How consistent the pattern is

  // What this head attends to
  attentionTargets: {
    positions: number[];      // Which positions it focuses on
    tokens: string[];         // What token types
    semanticClass?: string;   // Semantic category if applicable
  };

  // What function it performs
  function: {
    type: 'routing' | 'gathering' | 'suppressing' | 'copying';
    description: string;
  };

  // Dependencies
  dependsOn: {
    positions: number[];      // Which input positions matter
    heads: number[];          // Which other heads it works with
  };
}

enum AttentionHeadType {
  POSITIONAL = 'positional',
  SYNTACTIC = 'syntactic',
  SEMANTIC = 'semantic',
  COREFERENCE = 'coreference',
  QA = 'qa',
  INDUCTION = 'induction',
  SUBSEQUENT = 'subsequent',
  DELIMITER = 'delimiter',
  UNKNOWN = 'unknown'
}
```

### Head Classification Algorithm

```typescript
/**
 * Classify an attention head's function
 */
class AttentionHeadClassifier {
  classify(
    head: AttentionHead,
    state: LayerState
  ): AttentionHeadType {

    // 1. Analyze attention pattern shape
    const patternShape = this.analyzePatternShape(head);

    // 2. Analyze attention distribution
    const distribution = this.analyzeDistribution(head);

    // 3. Analyze stability across inputs
    const stability = this.analyzeStability(head);

    // 4. Check for specific patterns

    // Local attention (syntactic/positional)
    if (patternShape.isLocal && distribution.isSparse) {
      return patternShape.isSubsequent
        ? AttentionHeadType.SUBSEQUENT
        : AttentionHeadType.SYNTACTIC;
    }

    // Global attention with specific tokens (semantic/coreference)
    if (patternShape.isGlobal && distribution.hasPeaks) {
      return distribution.isSameEntity
        ? AttentionHeadType.COREFERENCE
        : AttentionHeadType.SEMANTIC;
    }

    // Pattern copying (induction heads)
    if (patternShape.isPrevious && stability.isHigh) {
      return AttentionHeadType.INDUCTION;
    }

    // Question-answering
    if (patternShape.isQuestionContext) {
      return AttentionHeadType.QA;
    }

    // Delimiter/structure
    if (patternShape.isDelimiter) {
      return AttentionHeadType.DELIMITER;
    }

    return AttentionHeadType.UNKNOWN;
  }

  private analyzePatternShape(head: AttentionHead): PatternShape {
    // Analyze spatial distribution of attention
    const attentionMatrix = head.getAttentionMatrix();

    // Is attention mostly local?
    const localAttention = this.computeLocalAttention(attentionMatrix);
    const isLocal = localAttention > 0.7;

    // Is attention to previous tokens?
    const previousAttention = this.computePreviousAttention(attentionMatrix);
    const isPrevious = previousAttention > 0.5;

    // Is attention to subsequent tokens?
    const subsequentAttention = this.computeSubsequentAttention(attentionMatrix);
    const isSubsequent = subsequentAttention > 0.5;

    // Is attention global (spread across sequence)?
    const globalAttention = this.computeGlobalAttention(attentionMatrix);
    const isGlobal = globalAttention > 0.3;

    // Is attention focused on delimiters?
    const delimiterAttention = this.computeDelimiterAttention(attentionMatrix);
    const isDelimiter = delimiterAttention > 0.6;

    // Is attention question-context pattern?
    const isQuestionContext = this.isQuestionContextPattern(attentionMatrix);

    return {
      isLocal,
      isPrevious,
      isSubsequent,
      isGlobal,
      isDelimiter,
      isQuestionContext,
      localAttention,
      globalAttention,
      previousAttention,
      subsequentAttention
    };
  }

  private analyzeDistribution(head: AttentionHead): Distribution {
    const attentionMatrix = head.getAttentionMatrix();

    // Is attention sparse (focused on few tokens)?
    const sparsity = this.computeSparsity(attentionMatrix);
    const isSparse = sparsity < 0.3;

    // Are there distinct peaks?
    const peaks = this.findPeaks(attentionMatrix);
    const hasPeaks = peaks.length > 0 && peaks.length < 5;

    // Do peaks attend to same entity?
    const isSameEntity = this.checkSameEntity(peaks);

    return {
      sparsity,
      isSparse,
      peaks,
      hasPeaks,
      isSameEntity
    };
  }

  private analyzeStability(head: AttentionHead): Stability {
    // Analyze consistency across different inputs
    const patterns = head.getAttentionPatterns();

    // Compute pattern consistency
    const consistency = this.computePatternConsistency(patterns);
    const isHigh = consistency > 0.7;

    return {
      consistency,
      isHigh
    };
  }
}

interface PatternShape {
  isLocal: boolean;
  isPrevious: boolean;
  isSubsequent: boolean;
  isGlobal: boolean;
  isDelimiter: boolean;
  isQuestionContext: boolean;
  localAttention: number;
  globalAttention: number;
  previousAttention: number;
  subsequentAttention: number;
}

interface Distribution {
  sparsity: number;
  isSparse: boolean;
  peaks: number[];
  hasPeaks: boolean;
  isSameEntity: boolean;
}

interface Stability {
  consistency: number;
  isHigh: boolean;
}
```

---

## FFN to Logic Mapping

### FFN as Key-Value Memory

Research (Geva et al., 2020) shows FFNs act as key-value memories:

```typescript
/**
 * FFN neuron as key-value pair
 */
interface FFNKVPair {
  // Key: pattern in input space
  key: Float32Array;        // First layer weights

  // Value: output contribution
  value: Float32Array;      // Second layer weights

  // Activation threshold
  threshold: number;

  // What knowledge this stores
  knowledge: {
    type: 'fact' | 'pattern' | 'transformation';
    description: string;
    examples: string[];
  };
}

/**
 * FFN Cell Specification
 */
interface FFNCell extends AgentCell {
  // Cell identification
  cellType: 'ffn';
  neuronIndex: number;
  layerIndex: number;

  // KV pair
  kvPair: FFNKVPair;

  // Activation behavior
  activation: {
    threshold: number;
    strength: number;
    specificity: number;    // How specific the pattern is
  };

  // Knowledge stored
  knowledge: {
    type: 'fact' | 'pattern' | 'transformation';
    content: string;
    confidence: number;
    examples: InputOutputExample[];
  };

  // When this neuron fires
  firingConditions: {
    inputPatterns: Float32Array[];
    semanticClass?: string;
    syntacticClass?: string;
  };
}
```

### FFN Decomposition Algorithm

```typescript
/**
 * Decompose FFN into knowledge cells
 */
class FFNDecomposer {
  decompose(
    ffn: FeedForwardNetwork,
    layerIndex: number
  ): FFNCell[] {
    const cells: FFNCell[] = [];

    // Get FFN weights
    const [W1, b1, W2, b2] = ffn.getWeights();

    // Each neuron is a potential knowledge store
    for (let neuronIdx = 0; neuronIdx < W1.cols; neuronIdx++) {
      // Extract key (first layer weights for this neuron)
      const key = W1.getColumn(neuronIdx);

      // Extract value (second layer weights from this neuron)
      const value = W2.getRow(neuronIdx);

      // Analyze what this neuron does
      const knowledge = this.identifyKnowledge(key, value, neuronIdx);

      // Create cell
      const cell: FFNCell = {
        id: `ffn-l${layerIndex}-n${neuronIdx}`,
        cellType: 'ffn',
        neuronIndex: neuronIdx,
        layerIndex: layerIndex,

        kvPair: {
          key: key.clone(),
          value: value.clone(),
          threshold: b1.get(neuronIdx),
          knowledge
        },

        activation: this.analyzeActivation(key, value),

        knowledge,

        firingConditions: this.identifyFiringConditions(
          key,
          knowledge
        ),

        // AgentCell base properties
        function: `ffn_neuron_${neuronIdx}`,
        logicLevel: this.determineLogicLevel(knowledge),
        patterns: [],
        weights: new Map(),
        confidence: knowledge.confidence,
        usage: 0
      };

      cells.push(cell);
    }

    return cells;
  }

  /**
   * Identify what knowledge a neuron stores
   */
  private identifyKnowledge(
    key: Float32Array,
    value: Float32Array,
    neuronIdx: number
  ): FFNCell['knowledge'] {
    // 1. Analyze key pattern (what inputs trigger this)
    const keyPattern = this.analyzeKeyPattern(key);

    // 2. Analyze value contribution (what output this produces)
    const valueContribution = this.analyzeValueContribution(value);

    // 3. Check if this is a fact neuron
    if (this.isFactNeuron(keyPattern, valueContribution)) {
      return {
        type: 'fact',
        content: this.extractFact(keyPattern, valueContribution),
        confidence: this.computeFactConfidence(keyPattern, valueContribution),
        examples: this.generateFactExamples(key, value)
      };
    }

    // 4. Check if this is a pattern neuron
    if (this.isPatternNeuron(keyPattern, valueContribution)) {
      return {
        type: 'pattern',
        content: this.extractPattern(keyPattern, valueContribution),
        confidence: this.computePatternConfidence(keyPattern, valueContribution),
        examples: this.generatePatternExamples(key, value)
      };
    }

    // 5. Otherwise, it's a transformation
    return {
      type: 'transformation',
      content: this.extractTransformation(keyPattern, valueContribution),
      confidence: this.computeTransformationConfidence(keyPattern, valueContribution),
      examples: this.generateTransformationExamples(key, value)
    };
  }

  /**
   * Analyze activation pattern
   */
  private analyzeActivation(
    key: Float32Array,
    value: Float32Array
  ): FFNCell['activation'] {
    // Compute threshold (bias term)
    const threshold = this.computeThreshold(key);

    // Compute strength (norm of value)
    const strength = this.computeStrength(value);

    // Compute specificity (sparsity of key)
    const specificity = this.computeSpecificity(key);

    return {
      threshold,
      strength,
      specificity
    };
  }

  /**
   * Determine appropriate logic level
   */
  private determineLogicLevel(
    knowledge: FFNCell['knowledge']
  ): 0 | 1 | 2 | 3 {
    // Facts and patterns are low-level (0-1)
    if (knowledge.type === 'fact' || knowledge.type === 'pattern') {
      return knowledge.confidence > 0.9 ? 0 : 1;
    }

    // Transformations are mid-level (1-2)
    if (knowledge.type === 'transformation') {
      return knowledge.confidence > 0.8 ? 1 : 2;
    }

    // Default to level 2
    return 2;
  }
}
```

### Knowledge Type Examples

```typescript
/**
 * Example FFN neurons and what they store
 */
const FFNExamples = {
  // Fact neurons (store factual associations)
  fact: {
    example1: {
      key: "Eiffel Tower embedding",
      value: "Paris embedding",
      knowledge: {
        type: 'fact',
        content: "Eiffel Tower is located in Paris",
        confidence: 0.95
      }
    },
    example2: {
      key: "Obama embedding",
      value: "USA president embedding",
      knowledge: {
        type: 'fact',
        content: "Obama was a US president",
        confidence: 0.92
      }
    }
  },

  // Pattern neurons (store linguistic patterns)
  pattern: {
    example1: {
      key: "Past tense verb embedding",
      value: "Present tense verb embedding",
      knowledge: {
        type: 'pattern',
        content: "Past tense → Present tense transformation",
        confidence: 0.88
      }
    },
    example2: {
      key: "Plural noun embedding",
      value: "Singular noun embedding",
      knowledge: {
        type: 'pattern',
        content: "Plural → Singular transformation",
        confidence: 0.85
      }
    }
  },

  // Transformation neurons (process inputs)
  transformation: {
    example1: {
      key: "Question word embedding",
      value: "Answer pattern embedding",
      knowledge: {
        type: 'transformation',
        content: "Question → Answer structure",
        confidence: 0.80
      }
    }
  }
};
```

---

## Residual Stream Tracking

### Residual Stream as Information Highway

The residual stream is where information flows through the network:

```typescript
/**
 * Residual stream state at a specific layer
 */
interface ResidualStream {
  // Stream content
  state: LayerState;

  // Information composition
  composition: {
    // What information is present
    semantic: number[];      // Semantic information
    syntactic: number[];     // Syntactic information
    positional: number[];    // Positional information
    taskSpecific: number[];  // Task-specific information

    // How much of each (normalized)
    proportions: {
      semantic: number;
      syntactic: number;
      positional: number;
      taskSpecific: number;
    };
  };

  // Source tracking
  sources: {
    // Which layers contributed most
    layerContributions: Map<number, number>;

    // Which heads contributed most
    headContributions: Map<number, number>;

    // Which neurons contributed most
    neuronContributions: Map<number, number>;
  };

  // Flow dynamics
  flow: {
    // How information moves between layers
    flowMatrix: Float32Array;  // [layer, layer]

    // Critical paths
    criticalPaths: CriticalPath[];
  };
}

interface CriticalPath {
  type: 'semantic' | 'syntactic' | 'positional' | 'task';
  path: number[];  // Sequence of layers/heads/neurons
  strength: number;
}
```

### Residual Tracking Algorithm

```typescript
/**
 * Track information flow through residual stream
 */
class ResidualTracker {
  /**
   * Track how information flows through the network
   */
  trackFlow(
    layers: TransformerLayer[],
    input: LayerState
  ): ResidualStream[] {
    const streams: ResidualStream[] = [];

    let currentState = input;

    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx];

      // Track state before this layer
      const beforeState = currentState.clone();

      // Apply layer
      const layerOutput = layer.forward(currentState);

      // Track state after this layer
      const afterState = layerOutput.clone();

      // Compute composition
      const composition = this.analyzeComposition(afterState);

      // Compute contributions
      const sources = this.computeContributions(
        beforeState,
        afterState,
        layer
      );

      // Update flow tracking
      const flow = this.updateFlow(
        currentState,
        layerOutput,
        layerIdx
      );

      streams.push({
        state: afterState,
        composition,
        sources,
        flow
      });

      currentState = afterState;
    }

    return streams;
  }

  /**
   * Analyze what information is in the stream
   */
  private analyzeComposition(
    state: LayerState
  ): ResidualStream['composition'] {
    // Use probes to analyze different information types

    // Semantic probe (e.g., word meaning)
    const semantic = this.probeSemantic(state);

    // Syntactic probe (e.g., part of speech)
    const syntactic = this.probeSyntactic(state);

    // Positional probe (e.g., token position)
    const positional = this.probePositional(state);

    // Task-specific probe
    const taskSpecific = this.probeTaskSpecific(state);

    // Compute proportions
    const total = (
      semantic.reduce((a, b) => a + b * b, 0) +
      syntactic.reduce((a, b) => a + b * b, 0) +
      positional.reduce((a, b) => a + b * b, 0) +
      taskSpecific.reduce((a, b) => a + b * b, 0)
    );

    const proportions = {
      semantic: semantic.reduce((a, b) => a + b * b, 0) / total,
      syntactic: syntactic.reduce((a, b) => a + b * b, 0) / total,
      positional: positional.reduce((a, b) => a + b * b, 0) / total,
      taskSpecific: taskSpecific.reduce((a, b) => a + b * b, 0) / total
    };

    return {
      semantic,
      syntactic,
      positional,
      taskSpecific,
      proportions
    };
  }

  /**
   * Probe for semantic information
   */
  private probeSemantic(state: LayerState): number[] {
    // Train a linear probe to predict word meaning
    // Return probe predictions
    const probe = this.semanticProbe;
    return probe.predict(state);
  }

  /**
   * Probe for syntactic information
   */
  private probeSyntactic(state: LayerState): number[] {
    // Train a linear probe to predict part of speech
    const probe = this.syntacticProbe;
    return probe.predict(state);
  }

  /**
   * Probe for positional information
   */
  private probePositional(state: LayerState): number[] {
    // Train a linear probe to predict position
    const probe = this.positionalProbe;
    return probe.predict(state);
  }

  /**
   * Probe for task-specific information
   */
  private probeTaskSpecific(state: LayerState): number[] {
    // Task-specific probe
    const probe = this.taskProbe;
    return probe.predict(state);
  }

  /**
   * Compute which components contributed
   */
  private computeContributions(
    before: LayerState,
    after: LayerState,
    layer: TransformerLayer
  ): ResidualStream['sources'] {
    // Use attribution methods to compute contributions

    const layerContributions = new Map<number, number>();
    const headContributions = new Map<number, number>();
    const neuronContributions = new Map<number, number>();

    // Compute layer contributions
    for (let i = 0; i <= layer.index; i++) {
      const contribution = this.computeLayerContribution(
        i,
        before,
        after
      );
      layerContributions.set(i, contribution);
    }

    // Compute head contributions
    for (let h = 0; h < layer.attention.numHeads; h++) {
      const contribution = this.computeHeadContribution(
        h,
        before,
        after,
        layer.attention.heads[h]
      );
      headContributions.set(h, contribution);
    }

    // Compute neuron contributions
    for (let n = 0; n < layer.ffn.numNeurons; n++) {
      const contribution = this.computeNeuronContribution(
        n,
        before,
        after,
        layer.ffn.neurons[n]
      );
      neuronContributions.set(n, contribution);
    }

    return {
      layerContributions,
      headContributions,
      neuronContributions
    };
  }

  /**
   * Update flow tracking
   */
  private updateFlow(
    before: LayerState,
    after: LayerState,
    layerIdx: number
  ): ResidualStream['flow'] {
    // Update flow matrix
    const flowMatrix = this.flowMatrix;

    // Track how much information moved
    const informationFlow = this.computeInformationFlow(before, after);
    flowMatrix[layerIdx][layerIdx + 1] = informationFlow;

    // Find critical paths
    const criticalPaths = this.findCriticalPaths(flowMatrix);

    return {
      flowMatrix,
      criticalPaths
    };
  }

  /**
   * Find critical information paths
   */
  private findCriticalPaths(
    flowMatrix: Float32Array
  ): CriticalPath[] {
    const paths: CriticalPath[] = [];

    // Find paths with high information flow
    for (let i = 0; i < flowMatrix.rows; i++) {
      for (let j = 0; j < flowMatrix.cols; j++) {
        if (flowMatrix.get(i, j) > 0.8) {
          // This is a critical connection
          paths.push({
            type: this.classifyPath(i, j),
            path: [i, j],
            strength: flowMatrix.get(i, j)
          });
        }
      }
    }

    return paths;
  }
}
```

### Residual Visualization

```typescript
/**
 * Visualize residual stream flow
 */
class ResidualVisualizer {
  /**
   * Create flow diagram
   */
  visualizeFlow(
    streams: ResidualStream[]
  ): FlowVisualization {
    return {
      type: 'flow_diagram',

      // Nodes (layers, heads, neurons)
      nodes: this.createNodes(streams),

      // Edges (information flow)
      edges: this.createEdges(streams),

      // Layout
      layout: 'hierarchical',

      // Styling
      style: {
        nodeSize: 'information_content',
        edgeThickness: 'flow_strength',
        edgeColor: 'information_type',
        nodeColor: 'layer_depth'
      }
    };
  }

  /**
   * Create composition timeline
   */
  visualizeComposition(
    streams: ResidualStream[]
  ): CompositionVisualization {
    return {
      type: 'composition_timeline',

      // X-axis: layer index
      xAxis: {
        label: 'Layer',
        values: streams.map((s, i) => i)
      },

      // Y-axis: information proportion
      yAxis: {
        label: 'Proportion',
        range: [0, 1]
      },

      // Series: different information types
      series: [
        {
          name: 'Semantic',
          values: streams.map(s => s.composition.proportions.semantic),
          color: '#4CAF50'
        },
        {
          name: 'Syntactic',
          values: streams.map(s => s.composition.proportions.syntactic),
          color: '#2196F3'
        },
        {
          name: 'Positional',
          values: streams.map(s => s.composition.proportions.positional),
          color: '#FF9800'
        },
        {
          name: 'Task-Specific',
          values: streams.map(s => s.composition.proportions.taskSpecific),
          color: '#9C27B0'
        }
      ]
    };
  }

  /**
   * Create source attribution heatmap
   */
  visualizeSources(
    streams: ResidualStream[]
  ): SourceVisualization {
    return {
      type: 'attribution_heatmap',

      // Rows: output layers
      rows: streams.map((s, i) => `Layer ${i}`),

      // Columns: input layers
      cols: streams.map((s, i) => `Layer ${i}`),

      // Values: contribution strength
      values: streams.map(stream => {
        const values = [];
        for (let i = 0; i < streams.length; i++) {
          values.push(stream.sources.layerContributions.get(i) || 0);
        }
        return values;
      }),

      // Color scale
      colorScale: 'viridis'
    };
  }
}
```

---

## Type System & Interfaces

### Complete Type Definitions

```typescript
/**
 * Complete type system for transformer layer analysis
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * A transformer layer with all components
 */
interface TransformerLayer {
  index: number;
  attention: MultiHeadAttention;
  ffn: FeedForwardNetwork;
  norm1: LayerNorm;
  norm2: LayerNorm;
}

/**
 * Multi-head attention component
 */
interface MultiHeadAttention {
  numHeads: number;
  headDim: number;
  heads: AttentionHead[];
  outputProjection: LinearLayer;
}

/**
 * Individual attention head
 */
interface AttentionHead {
  index: number;
  queryProjection: LinearLayer;
  keyProjection: LinearLayer;
  valueProjection: LinearLayer;

  /**
   * Compute attention for given state
   */
  forward(state: LayerState): AttentionOutput;

  /**
   * Get attention weights (for analysis)
   */
  getAttentionMatrix(): Float32Array;  // [seqLen, seqLen]

  /**
   * Get attention patterns across inputs
   */
  getAttentionPatterns(): AttentionPattern[];
}

/**
 * Feed-forward network
 */
interface FeedForwardNetwork {
  inputDim: number;
  hiddenDim: number;
  outputDim: number;

  layer1: LinearLayer;
  activation: ActivationFunction;
  layer2: LinearLayer;

  neurons: FFNNeuron[];

  /**
   * Forward pass
   */
  forward(input: Float32Array): Float32Array;

  /**
   * Get weights [W1, b1, W2, b2]
   */
  getWeights(): [Float32Array, Float32Array, Float32Array, Float32Array];
}

/**
 * Individual FFN neuron
 */
interface FFNNeuron {
  index: number;
  key: Float32Array;    // Input weights (W1 column)
  value: Float32Array;  // Output weights (W2 row)
  bias: number;

  /**
   * Compute activation
   */
  activate(input: Float32Array): number;
}

/**
 * Layer normalization
 */
interface LayerNorm {
  normalizedShape: number[];
  eps: number;

  /**
   * Normalize input
   */
  forward(input: Float32Array): Float32Array;
}

/**
 * Linear layer
 */
interface LinearLayer {
  inputDim: number;
  outputDim: number;
  weight: Float32Array;  // [outputDim, inputDim]
  bias: Float32Array;    // [outputDim]

  /**
   * Forward pass
   */
  forward(input: Float32Array): Float32Array;
}

// ============================================================================
// State Types
// ============================================================================

/**
 * State at a specific layer
 */
interface LayerState {
  hiddenStates: Float32Array[];  // [seqLen][hiddenDim]
  attentionPatterns?: AttentionPattern[];
  position: number;
  timestamp: number;

  /**
   * Clone this state
   */
  clone(): LayerState;
}

/**
 * Attention pattern for analysis
 */
interface AttentionPattern {
  headIndex: number;
  fromPosition: number;
  toPosition: number;
  weight: number;
  type: 'local' | 'global' | 'specialized';
}

/**
 * Output from attention computation
 */
interface AttentionOutput {
  output: Float32Array[];
  weights: Float32Array;  // [seqLen, seqLen, numHeads]
}

// ============================================================================
// Analysis Types
// ============================================================================

/**
 * Complete layer decomposition
 */
interface LayerDecomposition {
  layerIndex: number;
  attentionCells: AttentionCell[];
  ffnCells: FFNCell[];
  residualFlow: ResidualFlow;
  emergentCells: EmergentCell[];
  outputState: LayerState;
}

/**
 * Residual flow information
 */
interface ResidualFlow {
  inputStream: LayerState;
  attentionStream: LayerState | null;
  ffnStream: LayerState | null;
  outputStream: LayerState | null;
  contributions: {
    [component: string]: number;
  };
}

/**
 * Residual stream at a point
 */
interface ResidualStream {
  state: LayerState;
  composition: StreamComposition;
  sources: StreamSources;
  flow: StreamFlow;
}

/**
 * Information composition in stream
 */
interface StreamComposition {
  semantic: number[];
  syntactic: number[];
  positional: number[];
  taskSpecific: number[];
  proportions: {
    semantic: number;
    syntactic: number;
    positional: number;
    taskSpecific: number;
  };
}

/**
 * Source attribution
 */
interface StreamSources {
  layerContributions: Map<number, number>;
  headContributions: Map<number, number>;
  neuronContributions: Map<number, number>;
}

/**
 * Flow dynamics
 */
interface StreamFlow {
  flowMatrix: Float32Array;
  criticalPaths: CriticalPath[];
}

/**
 * Critical information path
 */
interface CriticalPath {
  type: 'semantic' | 'syntactic' | 'positional' | 'task';
  path: number[];
  strength: number;
}

// ============================================================================
// Cell Types
// ============================================================================

/**
 * Base agent cell (from CELL_TYPE_SPECS.md)
 */
interface AgentCell {
  id: string;
  position: { row: number; col: number };
  function: string;
  logicLevel: 0 | 1 | 2 | 3;

  patterns: Pattern[];
  weights: Map<string, number>;
  modelRef?: string;
  cacheKey?: string;

  confidence: number;
  usage: number;
}

/**
 * Attention-derived cell
 */
interface AttentionCell extends AgentCell {
  cellType: 'attention';
  headIndex: number;
  headType: AttentionHeadType;

  pattern: AttentionPattern;
  patternStability: number;

  attentionTargets: {
    positions: number[];
    tokens: string[];
    semanticClass?: string;
  };

  function: {
    type: 'routing' | 'gathering' | 'suppressing' | 'copying';
    description: string;
  };

  dependsOn: {
    positions: number[];
    heads: number[];
  };
}

/**
 * FFN-derived cell
 */
interface FFNCell extends AgentCell {
  cellType: 'ffn';
  neuronIndex: number;
  layerIndex: number;

  kvPair: FFNKVPair;

  activation: {
    threshold: number;
    strength: number;
    specificity: number;
  };

  knowledge: {
    type: 'fact' | 'pattern' | 'transformation';
    content: string;
    confidence: number;
    examples: InputOutputExample[];
  };

  firingConditions: {
    inputPatterns: Float32Array[];
    semanticClass?: string;
    syntacticClass?: string;
  };
}

/**
 * Emergent cell (from combination of operations)
 */
interface EmergentCell extends AgentCell {
  cellType: 'emergent';

  sources: {
    attentionCells: string[];
    ffnCells: string[];
  };

  emergence: {
    type: string;
    description: string;
    strength: number;
  };
}

/**
 * FFN key-value pair
 */
interface FFNKVPair {
  key: Float32Array;
  value: Float32Array;
  threshold: number;

  knowledge: {
    type: 'fact' | 'pattern' | 'transformation';
    description: string;
    examples: string[];
  };
}

/**
 * Input-output example
 */
interface InputOutputExample {
  input: string | Float32Array;
  output: string | Float32Array;
  confidence: number;
}

/**
 * Pattern (from CELL_TYPE_SPECS.md)
 */
interface Pattern {
  inputEmbedding: Float32Array;
  outputEmbedding: Float32Array;
  transformationSignature: string;

  examples: InputOutputExample[];
  constraints: {
    mustInclude: string[];
    mustExclude: string[];
    format: string;
    semantic: string[];
  };

  stats: {
    frequency: number;
    successRate: number;
    avgLatency: number;
    stability: number;
  };
}

// ============================================================================
// Enums
// ============================================================================

/**
 * Attention head types
 */
enum AttentionHeadType {
  POSITIONAL = 'positional',
  SYNTACTIC = 'syntactic',
  SEMANTIC = 'semantic',
  COREFERENCE = 'coreference',
  QA = 'qa',
  INDUCTION = 'induction',
  SUBSEQUENT = 'subsequent',
  DELIMITER = 'delimiter',
  UNKNOWN = 'unknown'
}

/**
 * Activation functions
 */
enum ActivationFunction {
  RELU = 'relu',
  GELU = 'gelu',
  SWISH = 'swish',
  SILU = 'silu'
}

// ============================================================================
// Visualization Types
// ============================================================================

/**
 * Flow visualization
 */
interface FlowVisualization {
  type: 'flow_diagram';
  nodes: FlowNode[];
  edges: FlowEdge[];
  layout: 'hierarchical' | 'force' | 'circular';
  style: {
    nodeSize: 'information_content' | 'fixed';
    edgeThickness: 'flow_strength' | 'fixed';
    edgeColor: 'information_type' | 'fixed';
    nodeColor: 'layer_depth' | 'fixed';
  };
}

/**
 * Flow node
 */
interface FlowNode {
  id: string;
  type: 'layer' | 'head' | 'neuron';
  layerIndex: number;
  informationContent: number;
}

/**
 * Flow edge
 */
interface FlowEdge {
  from: string;
  to: string;
  strength: number;
  informationType: 'semantic' | 'syntactic' | 'positional' | 'task';
}

/**
 * Composition visualization
 */
interface CompositionVisualization {
  type: 'composition_timeline';
  xAxis: {
    label: string;
    values: number[];
  };
  yAxis: {
    label: string;
    range: [number, number];
  };
  series: {
    name: string;
    values: number[];
    color: string;
  }[];
}

/**
 * Source attribution visualization
 */
interface SourceVisualization {
  type: 'attribution_heatmap';
  rows: string[];
  cols: string[];
  values: number[][];
  colorScale: string;
}
```

---

## Integration with AgentCell

### Mapping Transformer Cells to AgentCells

```typescript
/**
 * Map transformer-derived cells to AgentCell system
 */
class TransformerToAgentCellMapper {
  /**
   * Convert attention cell to AgentCell
   */
  mapAttentionCell(
    attentionCell: AttentionCell,
    position: { row: number; col: number }
  ): AgentCell {
    return {
      id: attentionCell.id,
      position,
      function: this.generateAttentionFunction(attentionCell),
      logicLevel: this.determineLogicLevel(attentionCell),

      // Extract patterns from attention
      patterns: this.extractAttentionPatterns(attentionCell),

      // Initialize weights (can be learned)
      weights: this.initializeAttentionWeights(attentionCell),

      // No model reference initially (level 0-2)
      modelRef: undefined,
      cacheKey: undefined,

      // Confidence based on pattern stability
      confidence: attentionCell.patternStability,

      // Initialize usage
      usage: 0
    };
  }

  /**
   * Convert FFN cell to AgentCell
   */
  mapFFNCell(
    ffnCell: FFNCell,
    position: { row: number; col: number }
  ): AgentCell {
    return {
      id: ffnCell.id,
      position,
      function: this.generateFFNFunction(ffnCell),
      logicLevel: this.determineLogicLevel(ffnCell),

      // Extract patterns from KV pair
      patterns: this.extractFFNPatterns(ffnCell),

      // Initialize weights
      weights: this.initializeFFNWeights(ffnCell),

      // No model reference initially
      modelRef: undefined,
      cacheKey: undefined,

      // Confidence from knowledge confidence
      confidence: ffnCell.knowledge.confidence,

      usage: 0
    };
  }

  /**
   * Convert emergent cell to AgentCell
   */
  mapEmergentCell(
    emergentCell: EmergentCell,
    position: { row: number; col: number }
  ): AgentCell {
    return {
      id: emergentCell.id,
      position,
      function: this.generateEmergentFunction(emergentCell),
      logicLevel: this.determineLogicLevel(emergentCell),

      // Extract combined patterns
      patterns: this.extractEmergentPatterns(emergentCell),

      // Initialize weights
      weights: this.initializeEmergentWeights(emergentCell),

      // Emergent cells may need model reference
      modelRef: this.needsModelRef(emergentCell)
        ? `emergent_${emergentCell.id}`
        : undefined,

      cacheKey: undefined,

      // Confidence from emergence strength
      confidence: emergentCell.emergence.strength,

      usage: 0
    };
  }

  /**
   * Generate function description for attention cell
   */
  private generateAttentionFunction(cell: AttentionCell): string {
    const { headType, function: fn } = cell;

    switch (headType) {
      case AttentionHeadType.SYNTACTIC:
        return `parse_syntax_${fn.description}`;
      case AttentionHeadType.SEMANTIC:
        return `link_semantic_${fn.description}`;
      case AttentionHeadType.COREFERENCE:
        return `track_coreference_${fn.description}`;
      case AttentionHeadType.POSITIONAL:
        return `track_position_${fn.description}`;
      case AttentionHeadType.QA:
        return `match_qa_${fn.description}`;
      case AttentionHeadType.INDUCTION:
        return `copy_pattern_${fn.description}`;
      case AttentionHeadType.SUBSEQUENT:
        return `match_prefix_${fn.description}`;
      case AttentionHeadType.DELIMITER:
        return `parse_structure_${fn.description}`;
      default:
        return `attention_${fn.description}`;
    }
  }

  /**
   * Generate function description for FFN cell
   */
  private generateFFNFunction(cell: FFNCell): string {
    const { knowledge } = cell;

    switch (knowledge.type) {
      case 'fact':
        return `retrieve_fact_${this.slugify(knowledge.content)}`;
      case 'pattern':
        return `apply_pattern_${this.slugify(knowledge.content)}`;
      case 'transformation':
        return `transform_${this.slugify(knowledge.content)}`;
      default:
        return `process_${this.slugify(knowledge.content)}`;
    }
  }

  /**
   * Determine logic level for cell
   */
  private determineLogicLevel(
    cell: AttentionCell | FFNCell | EmergentCell
  ): 0 | 1 | 2 | 3 {
    // Level 0: Pure logic, deterministic
    if (this.isDeterministic(cell)) {
      return 0;
    }

    // Level 1: Cached patterns
    if (this.isHighConfidence(cell) && this.isStable(cell)) {
      return 1;
    }

    // Level 2: Distilled agents
    if (this.isReusable(cell)) {
      return 2;
    }

    // Level 3: Full LLM
    return 3;
  }

  /**
   * Extract patterns from attention cell
   */
  private extractAttentionPatterns(cell: AttentionCell): Pattern[] {
    // Create pattern from attention behavior
    return [{
      inputEmbedding: this.encodeAttentionInput(cell),
      outputEmbedding: this.encodeAttentionOutput(cell),
      transformationSignature: cell.function.description,

      examples: [{
        input: cell.attentionTargets.positions.join(','),
        output: cell.function.description,
        confidence: cell.patternStability
      }],

      constraints: {
        mustInclude: [],
        mustExclude: [],
        format: 'attention',
        semantic: cell.attentionTargets.semanticClass
          ? [cell.attentionTargets.semanticClass]
          : []
      },

      stats: {
        frequency: 1,
        successRate: cell.patternStability,
        avgLatency: 10,  // Estimate
        stability: cell.patternStability
      }
    }];
  }

  /**
   * Extract patterns from FFN cell
   */
  private extractFFNPatterns(cell: FFNCell): Pattern[] {
    // Create pattern from KV pair
    return [{
      inputEmbedding: cell.kvPair.key,
      outputEmbedding: cell.kvPair.value,
      transformationSignature: cell.kvPair.knowledge.description,

      examples: cell.knowledge.examples.map(ex => ({
        input: ex.input,
        output: ex.output,
        confidence: ex.confidence
      })),

      constraints: {
        mustInclude: [],
        mustExclude: [],
        format: 'kv_retrieval',
        semantic: [
          cell.knowledge.knowledge.type,
          cell.firingConditions.semanticClass || 'general'
        ]
      },

      stats: {
        frequency: cell.knowledge.examples.length,
        successRate: cell.knowledge.knowledge.confidence,
        avgLatency: 5,  // Estimate
        stability: cell.activation.specificity
      }
    }];
  }

  /**
   * Extract patterns from emergent cell
   */
  private extractEmergentPatterns(cell: EmergentCell): Pattern[] {
    // Combine patterns from sources
    const combinedPattern: Pattern = {
      inputEmbedding: new Float32Array(0),  // Will be computed
      outputEmbedding: new Float32Array(0),  // Will be computed
      transformationSignature: cell.emergence.description,

      examples: [{
        input: `combination of ${cell.sources.attentionCells.length} attention + ${cell.sources.ffnCells.length} FFN`,
        output: cell.emergence.description,
        confidence: cell.emergence.strength
      }],

      constraints: {
        mustInclude: [],
        mustExclude: [],
        format: 'emergent',
        semantic: [cell.emergence.type]
      },

      stats: {
        frequency: 1,
        successRate: cell.emergence.strength,
        avgLatency: 20,  // Estimate (combined operations)
        stability: cell.emergence.strength
      }
    };

    return [combinedPattern];
  }

  /**
   * Initialize weights for attention cell
   */
  private initializeAttentionWeights(cell: AttentionCell): Map<string, number> {
    const weights = new Map<string, number>();

    // Initialize connections to dependent heads
    for (const depHead of cell.dependsOn.heads) {
      weights.set(`head_${depHead}`, 0.5);  // Initial weight
    }

    return weights;
  }

  /**
   * Initialize weights for FFN cell
   */
  private initializeFFNWeights(cell: FFNCell): Map<string, number> {
    const weights = new Map<string, number>();

    // FFN cells have fewer dependencies
    // Initialize based on layer position
    const layerWeight = 1.0 / (cell.layerIndex + 1);
    weights.set(`layer_${cell.layerIndex}`, layerWeight);

    return weights;
  }

  /**
   * Initialize weights for emergent cell
   */
  private initializeEmergentWeights(cell: EmergentCell): Map<string, number> {
    const weights = new Map<string, number>();

    // Initialize connections to source cells
    for (const sourceId of cell.sources.attentionCells) {
      weights.set(sourceId, 0.6);
    }

    for (const sourceId of cell.sources.ffnCells) {
      weights.set(sourceId, 0.4);
    }

    return weights;
  }

  /**
   * Check if cell is deterministic
   */
  private isDeterministic(
    cell: AttentionCell | FFNCell | EmergentCell
  ): boolean {
    // Attention cells with stable patterns are deterministic
    if ('patternStability' in cell) {
      return cell.patternStability > 0.95;
    }

    // FFN cells with high confidence are deterministic
    if ('knowledge' in cell) {
      return cell.knowledge.confidence > 0.95 &&
             cell.activation.specificity > 0.9;
    }

    // Emergent cells are rarely deterministic
    return false;
  }

  /**
   * Check if cell has high confidence
   */
  private isHighConfidence(
    cell: AttentionCell | FFNCell | EmergentCell
  ): boolean {
    return cell.confidence > 0.8;
  }

  /**
   * Check if cell is stable
   */
  private isStable(
    cell: AttentionCell | FFNCell | EmergentCell
  ): boolean {
    if ('patternStability' in cell) {
      return cell.patternStability > 0.85;
    }
    if ('activation' in cell) {
      return cell.activation.specificity > 0.8;
    }
    return cell.confidence > 0.85;
  }

  /**
   * Check if cell is reusable
   */
  private isReusable(
    cell: AttentionCell | FFNCell | EmergentCell
  ): boolean {
    // Cell is reusable if it's not too specific
    return cell.confidence > 0.7 && cell.confidence < 0.95;
  }

  /**
   * Check if emergent cell needs model reference
   */
  private needsModelRef(cell: EmergentCell): boolean {
    // Emergent cells with complex behavior need model
    return cell.emergence.strength < 0.8;
  }

  /**
   * Slugify string for function names
   */
  private slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_+|_+$)/g, '')
      .substring(0, 50);
  }
}
```

---

## Real-World Architectures

### GPT-3 (175B parameters)

```typescript
/**
 * GPT-3 Layer Decomposition
 */
const GPT3Decomposition = {
  architecture: {
    numLayers: 96,
    numHeads: 96,
    hiddenDim: 12288,
    headDim: 128,
    ffnDim: 4 * 12288  // 49152
  },

  layerSpecialization: {
    // Layers 0-15: Syntax and local structure
    early: {
      range: [0, 15],
      primaryTypes: [
        AttentionHeadType.SYNTACTIC,
        AttentionHeadType.POSITIONAL,
        AttentionHeadType.SUBSEQUENT
      ],
      cellTypes: ['SyntaxParserCell', 'PositionTrackerCell', 'PrefixMatchCell']
    },

    // Layers 16-47: Semantic composition and facts
    middle: {
      range: [16, 47],
      primaryTypes: [
        AttentionHeadType.SEMANTIC,
        AttentionHeadType.COREFERENCE,
        AttentionHeadType.INDUCTION
      ],
      cellTypes: [
        'SemanticLinkerCell',
        'CoreferenceCell',
        'PatternCopierCell',
        'KnowledgeRetrieverCell'
      ]
    },

    // Layers 48-95: Reasoning and output
    late: {
      range: [48, 95],
      primaryTypes: [
        AttentionHeadType.QA,
        AttentionHeadType.DELIMITER,
        AttentionHeadType.INDUCTION
      ],
      cellTypes: [
        'QAMatcherCell',
        'DelimiterCell',
        'ReasoningCell',
        'DecisionMakerCell'
      ]
    }
  },

  expectedCellCount: {
    attention: 96 * 96,  // 9,216 attention cells
    ffn: 96 * 49152,     // 4,718,592 FFN cells
    emergent: 96 * 100,  // ~9,600 emergent cells
    total: ~4,737,408
  }
};
```

### BERT (Base)

```typescript
/**
 * BERT Layer Decomposition
 */
const BERTDecomposition = {
  architecture: {
    numLayers: 12,
    numHeads: 12,
    hiddenDim: 768,
    headDim: 64,
    ffnDim: 4 * 768  // 3072
  },

  layerSpecialization: {
    // Layers 0-3: Surface features
    early: {
      range: [0, 3],
      primaryTypes: [
        AttentionHeadType.POSITIONAL,
        AttentionHeadType.SYNTACTIC
      ],
      cellTypes: ['PositionTrackerCell', 'SyntaxParserCell']
    },

    // Layers 4-7: Context and semantics
    middle: {
      range: [4, 7],
      primaryTypes: [
        AttentionHeadType.SEMANTIC,
        AttentionHeadType.COREFERENCE
      ],
      cellTypes: ['SemanticLinkerCell', 'CoreferenceCell']
    },

    // Layers 8-11: Task-specific
    late: {
      range: [8, 11],
      primaryTypes: [
        AttentionHeadType.QA,
        AttentionHeadType.INDUCTION
      ],
      cellTypes: ['QAMatcherCell', 'PatternCopierCell']
    }
  },

  expectedCellCount: {
    attention: 12 * 12,  // 144 attention cells
    ffn: 12 * 3072,     // 36,864 FFN cells
    emergent: 12 * 50,  // ~600 emergent cells
    total: ~37,608
  }
};
```

### T5 (Large)

```typescript
/**
 * T5 Layer Decomposition
 */
const T5Decomposition = {
  architecture: {
    numLayers: 24,
    numHeads: 32,
    hiddenDim: 1024,
    headDim: 32,
    ffnDim: 4 * 1024  // 4096
  },

  layerSpecialization: {
    // Encoder layers 0-7: Input processing
    encoderEarly: {
      range: [0, 7],
      primaryTypes: [
        AttentionHeadType.SYNTACTIC,
        AttentionHeadType.SEMANTIC
      ],
      cellTypes: ['SyntaxParserCell', 'SemanticLinkerCell']
    },

    // Encoder layers 8-11: Encoder-decoder bridge
    encoderLate: {
      range: [8, 11],
      primaryTypes: [
        AttentionHeadType.COREFERENCE,
        AttentionHeadType.INDUCTION
      ],
      cellTypes: ['CoreferenceCell', 'PatternCopierCell']
    },

    // Decoder layers 12-23: Generation
    decoder: {
      range: [12, 23],
      primaryTypes: [
        AttentionHeadType.QA,
        AttentionHeadType.DELIMITER,
        AttentionHeadType.INDUCTION
      ],
      cellTypes: ['QAMatcherCell', 'DelimiterCell', 'PatternCopierCell']
    }
  },

  expectedCellCount: {
    attention: 24 * 32,  // 768 attention cells
    ffn: 24 * 4096,     // 98,304 FFN cells
    emergent: 24 * 80,  // ~1,920 emergent cells
    total: ~101,000
  }
};
```

### LLaMA 2 (70B)

```typescript
/**
 * LLaMA 2 Layer Decomposition
 */
const LLaMA2Decomposition = {
  architecture: {
    numLayers: 80,
    numHeads: 64,
    hiddenDim: 8192,
    headDim: 128,
    ffnDim: (8192 * 10) / 3  // ~27,000 (using SwiGLU)
  },

  layerSpecialization: {
    // Layers 0-20: Basic processing
    early: {
      range: [0, 20],
      primaryTypes: [
        AttentionHeadType.POSITIONAL,
        AttentionHeadType.SYNTACTIC,
        AttentionHeadType.SEMANTIC
      ],
      cellTypes: [
        'PositionTrackerCell',
        'SyntaxParserCell',
        'SemanticLinkerCell'
      ]
    },

    // Layers 21-50: Knowledge and reasoning
    middle: {
      range: [21, 50],
      primaryTypes: [
        AttentionHeadType.COREFERENCE,
        AttentionHeadType.INDUCTION,
        AttentionHeadType.QA
      ],
      cellTypes: [
        'CoreferenceCell',
        'PatternCopierCell',
        'QAMatcherCell',
        'KnowledgeRetrieverCell'
      ]
    },

    // Layers 51-79: Advanced reasoning
    late: {
      range: [51, 79],
      primaryTypes: [
        AttentionHeadType.QA,
        AttentionHeadType.INDUCTION,
        AttentionHeadType.DELIMITER
      ],
      cellTypes: [
        'QAMatcherCell',
        'PatternCopierCell',
        'ReasoningCell',
        'DecisionMakerCell'
      ]
    }
  },

  expectedCellCount: {
    attention: 80 * 64,   // 5,120 attention cells
    ffn: 80 * 27000,     // 2,160,000 FFN cells
    emergent: 80 * 150,  // ~12,000 emergent cells
    total: ~2,177,120
  }
};
```

---

## Implementation Examples

### Example 1: Extracting Syntax Parser Cell

```typescript
/**
 * Example: Extract a syntax parser cell from GPT-2 layer 2, head 3
 */
async function extractSyntaxParserCell(): Promise<void> {
  // 1. Load GPT-2 model
  const model = await loadGPT2();
  const layer = model.layers[2];
  const head = layer.attention.heads[3];

  // 2. Analyze attention patterns
  const patterns = await analyzeAttentionPatterns(head);

  // 3. Classify head
  const classifier = new AttentionHeadClassifier();
  const headType = classifier.classify(head, patterns);

  // Assert it's a syntactic head
  if (headType !== AttentionHeadType.SYNTACTIC) {
    throw new Error('Head is not syntactic');
  }

  // 4. Create attention cell
  const attentionCell: AttentionCell = {
    id: 'syntax_parser_l2_h3',
    cellType: 'attention',
    headIndex: 3,
    headType: AttentionHeadType.SYNTACTIC,

    pattern: patterns[0],
    patternStability: 0.92,

    attentionTargets: {
      positions: [0, 1, 2],  // Local attention
      tokens: ['DT', 'NN', 'VB'],  // Determiner, Noun, Verb
      semanticClass: 'syntactic_dependency'
    },

    function: {
      type: 'gathering',
      description: 'parse_syntactic_dependencies'
    },

    dependsOn: {
      positions: [0, 1, 2],
      heads: []
    }
  };

  // 5. Map to AgentCell
  const mapper = new TransformerToAgentCellMapper();
  const agentCell = mapper.mapAttentionCell(attentionCell, {
    row: 0,
    col: 0
  });

  // 6. Save cell
  await saveCell(agentCell);

  console.log('Extracted syntax parser cell:', agentCell);
}
```

### Example 2: Extracting Knowledge Retriever Cell

```typescript
/**
 * Example: Extract a knowledge retriever cell from GPT-3 layer 30
 */
async function extractKnowledgeRetrieverCell(): Promise<void> {
  // 1. Load GPT-3 model
  const model = await loadGPT3();
  const layer = model.layers[30];
  const ffn = layer.ffn;

  // 2. Find neurons that fire on factual queries
  const neurons = ffn.neurons;
  const factNeurons = neurons.filter(n =>
    isFactNeuron(n)
  );

  // 3. Pick highest confidence fact neuron
  const bestNeuron = factNeurons
    .sort((a, b) => b.confidence - a.confidence)[0];

  // 4. Identify what fact it stores
  const decomposer = new FFNDecomposer();
  const knowledge = decomposer.identifyKnowledge(
    bestNeuron.key,
    bestNeuron.value,
    bestNeuron.index
  );

  // Example: "Eiffel Tower is in Paris"
  console.log('Knowledge:', knowledge.content);

  // 5. Create FFN cell
  const ffnCell: FFNCell = {
    id: `fact_retriever_l30_n${bestNeuron.index}`,
    cellType: 'ffn',
    neuronIndex: bestNeuron.index,
    layerIndex: 30,

    kvPair: {
      key: bestNeuron.key,
      value: bestNeuron.value,
      threshold: bestNeuron.bias,
      knowledge
    },

    activation: {
      threshold: bestNeuron.bias,
      strength: norm(bestNeuron.value),
      specificity: computeSparsity(bestNeuron.key)
    },

    knowledge,

    firingConditions: {
      inputPatterns: [bestNeuron.key],
      semanticClass: 'factual'
    }
  };

  // 6. Map to AgentCell
  const mapper = new TransformerToAgentCellMapper();
  const agentCell = mapper.mapFFNCell(ffnCell, {
    row: 1,
    col: 0
  });

  // 7. Save cell
  await saveCell(agentCell);

  console.log('Extracted knowledge retriever cell:', agentCell);
}
```

### Example 3: Tracking Residual Stream Flow

```typescript
/**
 * Example: Track how semantic information flows through GPT-2
 */
async function trackSemanticFlow(): Promise<void> {
  // 1. Load model
  const model = await loadGPT2();

  // 2. Create input
  const input = "The Eiffel Tower is located in";
  const state = model.tokenize(input);

  // 3. Track through layers
  const tracker = new ResidualTracker();
  const streams = tracker.trackFlow(model.layers, state);

  // 4. Analyze composition at each layer
  const compositions = streams.map(stream =>
    stream.composition.proportions
  );

  // 5. Visualize
  const visualizer = new ResidualVisualizer();
  const viz = visualizer.visualizeComposition(streams);

  console.log('Semantic information flow:');
  compositions.forEach((comp, i) => {
    console.log(`Layer ${i}: ${comp.semantic.toFixed(2)} semantic`);
  });

  // Expected output:
  // Layer 0: 0.10 semantic
  // Layer 1: 0.15 semantic
  // Layer 2: 0.20 semantic
  // ...
  // Layer 11: 0.65 semantic

  // 6. Find critical paths
  const criticalPaths = streams
    .flatMap(s => s.flow.criticalPaths)
    .filter(p => p.type === 'semantic')
    .sort((a, b) => b.strength - a.strength);

  console.log('Critical semantic paths:', criticalPaths.slice(0, 5));
}
```

### Example 4: Complete Layer Decomposition

```typescript
/**
 * Example: Complete decomposition of GPT-2 layer 5
 */
async function decomposeLayer(): Promise<void> {
  // 1. Load model
  const model = await loadGPT2();
  const layer = model.layers[5];

  // 2. Create input
  const input = "What is the capital of France?";
  const state = model.tokenize(input);

  // 3. Decompose layer
  const decomposer = new LayerDecomposer();
  const decomposition = decomposer.decomposeLayer(5, layer, state);

  // 4. Analyze results
  console.log('Layer 5 decomposition:');
  console.log(`  Attention cells: ${decomposition.attentionCells.length}`);
  console.log(`  FFN cells: ${decomposition.ffnCells.length}`);
  console.log(`  Emergent cells: ${decomposition.emergentCells.length}`);

  // 5. Examine attention cells
  console.log('\nAttention cells:');
  decomposition.attentionCells.forEach(cell => {
    console.log(`  ${cell.id}: ${cell.headType} - ${cell.function.description}`);
  });

  // 6. Examine FFN cells
  console.log('\nFFN cells (top 5):');
  decomposition.ffnCells
    .sort((a, b) => b.knowledge.confidence - a.knowledge.confidence)
    .slice(0, 5)
    .forEach(cell => {
      console.log(`  ${cell.id}: ${cell.knowledge.content} (${cell.knowledge.confidence.toFixed(2)})`);
    });

  // 7. Examine residual flow
  console.log('\nResidual flow:');
  console.log(`  Input stream: ${decomposition.residualFlow.inputStream.hiddenStates.length} positions`);
  console.log(`  Attention contribution: ${decomposition.residualFlow.contributions['attention']?.toFixed(2)}`);
  console.log(`  FFN contribution: ${decomposition.residualFlow.contributions['ffn']?.toFixed(2)}`);

  // 8. Map all cells to AgentCells
  const mapper = new TransformerToAgentCellMapper();
  const agentCells: AgentCell[] = [];

  for (const attnCell of decomposition.attentionCells) {
    const agentCell = mapper.mapAttentionCell(attnCell, {
      row: agentCells.length,
      col: 0
    });
    agentCells.push(agentCell);
  }

  for (const ffnCell of decomposition.ffnCells) {
    const agentCell = mapper.mapFFNCell(ffnCell, {
      row: agentCells.length,
      col: 0
    });
    agentCells.push(agentCell);
  }

  for (const emergentCell of decomposition.emergentCells) {
    const agentCell = mapper.mapEmergentCell(emergentCell, {
      row: agentCells.length,
      col: 0
    });
    agentCells.push(agentCell);
  }

  // 9. Save all cells
  await saveCells(agentCells);

  console.log(`\nSaved ${agentCells.length} cells`);
}
```

---

## Summary & Next Steps

### Key Innovations

1. **Layer-Wise Decomposition**: Systematically break down transformer layers into discrete operations
2. **Attention Head Classification**: Automatically identify what each attention head does
3. **FFN as KV Memory**: View feed-forward networks as key-value stores for knowledge retrieval
4. **Residual Stream Tracking**: Follow information flow through the network
5. **Cell Mapping**: Convert transformer components into AgentCells

### Expected Cell Counts

| Model | Attention Cells | FFN Cells | Emergent Cells | Total |
|-------|----------------|-----------|----------------|-------|
| GPT-2 | 12 × 12 = 144 | 12 × 3072 = 36,864 | ~600 | ~37,600 |
| BERT-Base | 12 × 12 = 144 | 12 × 3072 = 36,864 | ~600 | ~37,600 |
| GPT-3 | 96 × 96 = 9,216 | 96 × 49152 = 4.7M | ~9,600 | ~4.7M |
| LLaMA 2 70B | 80 × 64 = 5,120 | 80 × 27K = 2.2M | ~12,000 | ~2.2M |

### Integration Points

1. **Breakdown Engine**: Use decomposition to extract cells
2. **Discretization Engine**: Score extracted cells for reusability
3. **Simulation Engine**: Test extracted cells in isolation
4. **AgentCell System**: Store and manage extracted cells

### Implementation Roadmap

#### Phase 1: Core Decomposition (Weeks 1-2)
- [ ] Implement `LayerDecomposer`
- [ ] Implement `AttentionHeadClassifier`
- [ ] Implement `FFNDecomposer`
- [ ] Test on GPT-2 (small model)

#### Phase 2: Residual Tracking (Weeks 3-4)
- [ ] Implement `ResidualTracker`
- [ ] Implement probe networks for information types
- [ ] Implement `ResidualVisualizer`
- [ ] Test on GPT-2 and BERT

#### Phase 3: Cell Mapping (Weeks 5-6)
- [ ] Implement `TransformerToAgentCellMapper`
- [ ] Implement pattern extraction
- [ ] Implement weight initialization
- [ ] Test on multiple models

#### Phase 4: Integration (Weeks 7-8)
- [ ] Integrate with Breakdown Engine
- [ ] Integrate with Discretization Engine
- [ ] Integrate with AgentCell persistence
- [ ] End-to-end testing

### Success Criteria

- [ ] Decompose GPT-2 with >90% accuracy (vs. manual analysis)
- [ ] Extract >1000 high-confidence cells from GPT-3
- [ ] Track residual flow with <5% error
- [ ] Map cells to AgentCell system
- [ ] Demonstrate extracted cells in spreadsheet

### Open Questions

1. **How do we handle cross-attention?** (e.g., in encoder-decoder models)
2. **What about layer norm?** Should we extract it as a cell?
3. **How do we handle positional embeddings?** As a separate cell type?
4. **What about tie embeddings?** (shared input/output embeddings)
5. **How do we optimize for large models?** (GPT-3 has 4.7M potential cells!)

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: ✅ Round 2 Design Complete
**Next Phase**: Implementation & Testing

---

*"We are fracturing the 4th wall of AI, one transformer layer at a time."*

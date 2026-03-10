# Breakdown Engine Round 4: Box Temporal Dynamics

**Research Program:** POLLN Breakdown Engine - Spreadsheet Integration
**Focus:** Time-Aware Boxes with Prediction and Causal Reasoning
**Lead:** R&D Agent - Temporal Dynamics
**Status:** Design Complete
**Date:** 2026-03-08

---

## Executive Summary

This document specifies **Box Temporal Dynamics** for POLLN's Breakdown Engine Round 4. The system enables Fractured AI Boxes to be temporally aware, tracking past executions, predicting future behavior, identifying causal relationships, and supporting time-travel debugging. This transforms boxes from static components into time-aware, self-reflective agents.

### Key Innovation

> "Boxes that remember their past, predict their future, and understand their impact on other boxes."

### Core Principles

1. **Temporal Awareness**: Every box tracks its execution timeline
2. **Causal Reasoning**: Boxes understand cause-effect relationships
3. **Predictive Modeling**: Boxes anticipate future behavior
4. **Time-Travel Debugging**: Rollback and replay for any execution
5. **Counterfactual Exploration**: "What if" scenario simulation

---

## Table of Contents

1. [Temporal State Tracking](#1-temporal-state-tracking)
2. [Causal Inference System](#2-causal-inference-system)
3. [Predictive Modeling](#3-predictive-modeling)
4. [Time-Travel Debugging](#4-time-travel-debugging)
5. [Counterfactual Reasoning](#5-counterfactual-reasoning)
6. [Temporal Logic](#6-temporal-logic)
7. [Timeline Visualization](#7-timeline-visualization)
8. [TypeScript Interfaces](#8-typescript-interfaces)
9. [Real-World Examples](#9-real-world-examples)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Temporal State Tracking

### 1.1 Temporal Box Architecture

Every box maintains a **temporal state** that evolves with each execution:

```typescript
interface TemporalBox {
  // Identity
  id: string;
  boxType: string;

  // Temporal state
  temporalState: TemporalState;

  // Execution history
  history: ExecutionHistory;

  // Temporal capabilities
  timeTravel: TimeTravelCapability;
  prediction: PredictiveCapability;
  causality: CausalCapability;
}

interface TemporalState {
  // Current state
  present: BoxState;

  // Past states (immutable)
  past: BoxState[];

  // Future projections (predicted)
  future: ProjectedState[];

  // Temporal metadata
  createdAt: number;
  lastModified: number;
  version: number;
}

interface BoxState {
  timestamp: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  confidence: number;
  executionTimeMs: number;
  cost: number;

  // State snapshot
  variables: Record<string, unknown>;
  dependencies: string[];
  sideEffects: SideEffect[];

  // Temporal annotations
  temporalAnnotations: TemporalAnnotation[];
}
```

### 1.2 Execution Timeline

Each execution is recorded as a **timeline event**:

```typescript
interface ExecutionHistory {
  boxId: string;
  events: TimelineEvent[];
  stateTransitions: StateTransition[];
  patterns: TemporalPattern[];

  // Statistics
  stats: {
    totalExecutions: number;
    avgExecutionTime: number;
    successRate: number;
    confidenceTrend: Trend;
  };
}

interface TimelineEvent {
  id: string;
  timestamp: number;
  eventType: 'execution' | 'state_change' | 'dependency_update' | 'error' | 'rollback';

  // Event data
  data: {
    input?: unknown;
    output?: unknown;
    error?: Error;
    previousState?: BoxState;
    newState?: BoxState;
  };

  // Causal links
  causes: string[]; // Event IDs that caused this event
  effects: string[]; // Event IDs caused by this event

  // Metadata
  metadata: {
    executionTimeMs?: number;
    cost?: number;
    confidence?: number;
    rollbackPoint?: boolean;
  };
}

interface StateTransition {
  fromState: BoxState;
  toState: BoxState;
  timestamp: number;
  trigger: string;
  confidence: number;
}

interface TemporalPattern {
  patternType: 'periodic' | 'trend' | 'anomaly' | 'seasonal';
  description: string;
  confidence: number;
  occurrences: number;
  firstOccurrence: number;
  lastOccurrence: number;
  prediction?: PatternPrediction;
}

interface Trend {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  magnitude: number; // -1 to 1
  confidence: number;
  projection?: number; // Projected future value
}
```

### 1.3 Temporal State Machine

Boxes transition through temporal states:

```typescript
enum TemporalStateType {
  // Creation states
  CREATED = 'created',
  INITIALIZING = 'initializing',

  // Active states
  READY = 'ready',
  EXECUTING = 'executing',
  WAITING = 'waiting', // Waiting for dependencies

  // Completion states
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',

  // Special states
  SUSPENDED = 'suspended', // Paused for inspection
  PREDICTING = 'predicting' // Generating predictions
}

class TemporalStateMachine {
  private currentState: TemporalStateType;
  private stateHistory: StateTransition[] = [];

  transition(
    toState: TemporalStateType,
    trigger: string,
    metadata?: Record<string, unknown>
  ): StateTransition {
    const transition: StateTransition = {
      fromState: {
        type: this.currentState,
        timestamp: Date.now(),
        ...metadata
      },
      toState: {
        type: toState,
        timestamp: Date.now(),
        ...metadata
      },
      timestamp: Date.now(),
      trigger,
      confidence: 1.0
    };

    this.stateHistory.push(transition);
    this.currentState = toState;

    return transition;
  }

  getCurrentState(): TemporalStateType {
    return this.currentState;
  }

  canTransition(toState: TemporalStateType): boolean {
    return VALID_TRANSITIONS[this.currentState].includes(toState);
  }
}

const VALID_TRANSITIONS: Record<TemporalStateType, TemporalStateType[]> = {
  [TemporalStateType.CREATED]: [TemporalStateType.INITIALIZING],
  [TemporalStateType.INITIALIZING]: [TemporalStateType.READY],
  [TemporalStateType.READY]: [TemporalStateType.EXECUTING, TemporalStateType.SUSPENDED],
  [TemporalStateType.EXECUTING]: [TemporalStateType.COMPLETED, TemporalStateType.FAILED, TemporalStateType.WAITING],
  [TemporalStateType.WAITING]: [TemporalStateType.EXECUTING, TemporalStateType.SUSPENDED],
  [TemporalStateType.COMPLETED]: [TemporalStateType.READY, TemporalStateType.SUSPENDED],
  [TemporalStateType.FAILED]: [TemporalStateType.READY, TemporalStateType.SUSPENDED],
  [TemporalStateType.ROLLED_BACK]: [TemporalStateType.READY],
  [TemporalStateType.SUSPENDED]: [TemporalStateType.READY, TemporalStateType.EXECUTING],
  [TemporalStateType.PREDICTING]: [TemporalStateType.READY]
};
```

---

## 2. Causal Inference System

### 2.1 Causal Graph

The system maintains a **causal graph** of box executions:

```typescript
interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  metadata: CausalGraphMetadata;
}

interface CausalNode {
  id: string;
  boxId: string;
  executionId: string;

  // Node properties
  properties: {
    timestamp: number;
    output: unknown;
    confidence: number;
    executionTime: number;
  };

  // Causal properties
  causalInfluence: number; // How much this influences others
  causalDependence: number; // How much this depends on others
}

interface CausalEdge {
  id: string;
  from: string; // Node ID
  to: string; // Node ID

  // Causal relationship
  strength: number; // 0 to 1
  confidence: number; // 0 to 1
  type: CausalEdgeType;

  // Temporal properties
  delay: number; // Time between cause and effect (ms)

  // Evidence
  evidence: CausalEvidence[];
}

enum CausalEdgeType {
  DIRECT = 'direct', // Direct causal link
  INDIRECT = 'indirect', // Through intermediate nodes
  SPURIOUS = 'spurious', // Correlation without causation
  CONFOUNDED = 'confounded', // Confounding variable
  BIDIRECTIONAL = 'bidirectional' // Mutual causation
}

interface CausalEvidence {
  type: 'intervention' | 'observation' | 'counterfactual';
  timestamp: number;
  description: string;
  confidence: number;
  data?: Record<string, unknown>;
}

interface CausalGraphMetadata {
  createdAt: number;
  lastUpdated: number;
  totalNodes: number;
  totalEdges: number;
  inferenceMethod: string;
  confidence: number; // Overall graph confidence
}
```

### 2.2 Causal Discovery

The system automatically discovers causal relationships:

```typescript
class CausalInferenceEngine {
  private graph: CausalGraph;
  private discoveryMethods: CausalDiscoveryMethod[];

  constructor() {
    this.graph = { nodes: [], edges: [], metadata: {} };
    this.discoveryMethods = [
      new PCAlgorithm(), // Peter-Clark algorithm
      new GTest(), // Conditional independence tests
      new GrangerCausality(), // Time-series causality
      new InterventionAnalysis() // Intervention-based discovery
    ];
  }

  /**
   * Discover causal relationships from execution history
   */
  async discoverCausalRelations(
    executions: TimelineEvent[]
  ): Promise<CausalGraph> {

    // Build initial graph
    this.graph = this.buildInitialGraph(executions);

    // Apply discovery methods
    for (const method of this.discoveryMethods) {
      const discoveredEdges = await method.discover(executions);

      // Merge discovered edges
      this.mergeEdges(discoveredEdges);
    }

    // Prune weak edges
    this.pruneWeakEdges(0.3); // Threshold

    // Detect cycles
    this.detectAndHandleCycles();

    return this.graph;
  }

  /**
   * Test if A causes B
   */
  async testCausality(
    cause: CausalNode,
    effect: CausalNode,
    data: TimelineEvent[]
  ): Promise<CausalRelation> {

    // 1. Temporal precedence: cause must precede effect
    if (cause.properties.timestamp >= effect.properties.timestamp) {
      return {
        causes: false,
        confidence: 0.0,
        reason: 'Temporal precedence violated'
      };
    }

    // 2. Concomitant variation: correlation
    const correlation = this.calculateCorrelation(cause, effect, data);
    if (Math.abs(correlation) < 0.3) {
      return {
        causes: false,
        confidence: 0.0,
        reason: 'No significant correlation'
      };
    }

    // 3. Ruling out alternatives: control for confounders
    const confounders = await this.findConfounders(cause, effect, data);

    // 4. Intervention evidence
    const interventions = await this.findInterventions(cause, effect, data);

    // 5. Calculate overall confidence
    const confidence = this.calculateCausalConfidence({
      correlation,
      confounders: confounders.length,
      interventions: interventions.length,
      temporalPrecedence: true
    });

    return {
      causes: confidence > 0.5,
      confidence,
      strength: correlation,
      type: this.determineCausalType(confounders, interventions),
      evidence: interventions,
      confounders
    };
  }

  private calculateCorrelation(
    cause: CausalNode,
    effect: CausalNode,
    data: TimelineEvent[]
  ): number {
    // Extract time series from events
    const causeSeries = this.extractTimeSeries(cause.boxId, data);
    const effectSeries = this.extractTimeSeries(effect.boxId, data);

    // Calculate Pearson correlation
    return this.pearsonCorrelation(causeSeries, effectSeries);
  }

  private async findConfounders(
    cause: CausalNode,
    effect: CausalNode,
    data: TimelineEvent[]
  ): Promise<CausalNode[]> {

    const confounders: CausalNode[] = [];

    // For each potential confounder
    for (const node of this.graph.nodes) {
      if (node.id === cause.id || node.id === effect.id) continue;

      // Test if node causes both cause and effect
      const causesCause = await this.testCausality(node, cause, data);
      const causesEffect = await this.testCausality(node, effect, data);

      if (causesCause.causes && causesEffect.causes) {
        confounders.push(node);
      }
    }

    return confounders;
  }
}

interface CausalRelation {
  causes: boolean;
  confidence: number;
  strength: number;
  type?: CausalEdgeType;
  reason?: string;
  evidence: CausalEvidence[];
  confounders: CausalNode[];
}
```

### 2.3 Causal Intervention Testing

The system can test causality through interventions:

```typescript
interface CausalIntervention {
  interventionId: string;
  targetBox: string;
  interventionType: 'do' | 'counterfactual' | 'ablation';

  // Intervention parameters
  inputValue: unknown;
  modifiedVariable?: string;

  // Results
  beforeExecution?: ExecutionResult;
  afterExecution?: ExecutionResult;
  affectedBoxes?: string[];

  // Causal analysis
  causalEffect?: CausalEffect;
}

interface CausalEffect {
  effectSize: number; // Magnitude of causal effect
  confidence: number;
  direction: 'positive' | 'negative' | 'none';
  statisticalSignificance: number;
  practicalSignificance: number;
}

class CausalInterventionTester {
  /**
   * Perform a do-intervention: force box to specific value
   */
  async doIntervention(
    boxId: string,
    inputValue: unknown,
    context: ExecutionContext
  ): Promise<CausalIntervention> {

    // Record before state
    const beforeExecution = await this.executeBox(boxId, context.originalInput, context);

    // Perform intervention
    const afterExecution = await this.executeBox(boxId, inputValue, {
      ...context,
      intervention: true
    });

    // Identify affected downstream boxes
    const affectedBoxes = await this.identifyAffectedBoxes(boxId, context);

    // Measure causal effect
    const causalEffect = this.calculateCausalEffect(
      beforeExecution,
      afterExecution,
      affectedBoxes
    );

    return {
      interventionId: generateId(),
      targetBox: boxId,
      interventionType: 'do',
      inputValue,
      beforeExecution,
      afterExecution,
      affectedBoxes,
      causalEffect
    };
  }

  /**
   * Perform counterfactual: what would have happened if...
   */
  async counterfactual(
    boxId: string,
    counterfactualInput: unknown,
    originalContext: ExecutionContext
  ): Promise<CausalIntervention> {

    // Get original execution
    const originalExecution = await this.getExecution(
      boxId,
      originalContext.executionId
    );

    // Simulate counterfactual
    const counterfactualExecution = await this.simulateExecution(
      boxId,
      counterfactualInput,
      originalContext,
      { counterfactual: true }
    );

    // Calculate difference
    const causalEffect = this.calculateCausalEffect(
      originalExecution,
      counterfactualExecution,
      await this.getDownstreamBoxes(boxId)
    );

    return {
      interventionId: generateId(),
      targetBox: boxId,
      interventionType: 'counterfactual',
      inputValue: counterfactualInput,
      beforeExecution: originalExecution,
      afterExecution: counterfactualExecution,
      causalEffect
    };
  }

  /**
   * Perform ablation: remove box and see what breaks
   */
  async ablation(
    boxId: string,
    context: ExecutionContext
  ): Promise<CausalIntervention> {

    // Execute with box
    const withBox = await this.executeFullPipeline(context);

    // Execute without box (ablate)
    const withoutBox = await this.executeFullPipeline({
      ...context,
      ablatedBoxes: [boxId]
    });

    // Measure impact
    const causalEffect = this.calculateAblationEffect(withBox, withoutBox);

    return {
      interventionId: generateId(),
      targetBox: boxId,
      interventionType: 'ablation',
      inputValue: null,
      beforeExecution: withBox,
      afterExecution: withoutBox,
      causalEffect
    };
  }
}
```

---

## 3. Predictive Modeling

### 3.1 Predictive Model Interface

Each box can have a predictive model:

```typescript
interface PredictiveModel {
  id: string;
  boxId: string;
  modelType: PredictiveModelType;

  // Model properties
  properties: {
    accuracy: number;
    confidence: number;
    trainingDataSize: number;
    lastTrained: number;
    predictionHorizon: number; // How far ahead to predict (ms)
  };

  // Features used for prediction
  features: PredictiveFeature[];

  // Model parameters
  parameters: Record<string, unknown>;

  // Prediction method
  predict(input: unknown, context: PredictionContext): Promise<Prediction>;
}

enum PredictiveModelType {
  LINEAR_REGRESSION = 'linear_regression',
  ARIMA = 'arima', // Auto-Regressive Integrated Moving Average
  LSTM = 'lstm', // Long Short-Term Memory network
  PROPHET = 'prophet', // Facebook Prophet
  ENSEMBLE = 'ensemble' // Multiple models combined
}

interface PredictiveFeature {
  name: string;
  type: 'temporal' | 'static' | 'derived';
  importance: number; // Feature importance score
  extractionMethod: string;
}

interface PredictionContext {
  timestamp: number;
  horizon: number; // Prediction horizon
  confidence: number;
  includeUncertainty: boolean;
  includeIntervals: boolean;
}

interface Prediction {
  predictedValue: unknown;
  confidence: number;

  // Uncertainty quantification
  uncertainty: {
    lower: number; // Lower bound (95% CI)
    upper: number; // Upper bound (95% CI)
    std: number; // Standard deviation
  };

  // Prediction metadata
  metadata: {
    modelId: string;
    timestamp: number;
    horizon: number;
    features: Record<string, number>;
  };
}
```

### 3.2 Time-Series Prediction

Predict future box behavior:

```typescript
class TimeSeriesPredictor {
  private models: Map<string, PredictiveModel> = new Map();

  /**
   * Train predictive model for a box
   */
  async trainModel(
    boxId: string,
    history: TimelineEvent[],
    modelType: PredictiveModelType
  ): Promise<PredictiveModel> {

    // Extract features from history
    const features = this.extractFeatures(history);

    // Prepare training data
    const trainingData = this.prepareTrainingData(history, features);

    // Train model
    const model = await this.train(trainingData, modelType);

    // Evaluate model
    const accuracy = await this.evaluate(model, trainingData);

    return {
      id: generateId(),
      boxId,
      modelType,
      properties: {
        accuracy,
        confidence: accuracy, // Simplified
        trainingDataSize: trainingData.length,
        lastTrained: Date.now(),
        predictionHorizon: 5000 // 5 seconds ahead
      },
      features,
      parameters: model.getParameters(),
      predict: (input, context) => this.predictWithModel(model, input, context)
    };
  }

  /**
   * Predict future box behavior
   */
  async predictFuture(
    boxId: string,
    horizonMs: number,
    context: PredictionContext
  ): Promise<Prediction[]> {

    const model = this.models.get(boxId);
    if (!model) {
      throw new Error(`No predictive model for box ${boxId}`);
    }

    const predictions: Prediction[] = [];

    // Predict at multiple time points
    const timePoints = this.generateTimePoints(horizonMs, 1000); // Every 1 second

    for (const timePoint of timePoints) {
      const prediction = await model.predict(null, {
        ...context,
        horizon: timePoint
      });

      predictions.push(prediction);
    }

    return predictions;
  }

  /**
   * Predict next N executions
   */
  async predictNextExecutions(
    boxId: string,
    count: number
  ): Promise<PredictedExecution[]> {

    const model = this.models.get(boxId);
    const history = await this.getExecutionHistory(boxId);

    const predictions: PredictedExecution[] = [];

    for (let i = 0; i < count; i++) {
      // Use previous predictions as input
      const context = {
        timestamp: Date.now() + (i * 1000),
        horizon: i * 1000,
        confidence: 0.95,
        includeUncertainty: true,
        includeIntervals: true
      };

      const prediction = await model.predict(null, context);

      predictions.push({
        executionNumber: i + 1,
        predictedTimestamp: context.timestamp,
        predictedOutput: prediction.predictedValue,
        confidence: prediction.confidence,
        uncertainty: prediction.uncertainty
      });
    }

    return predictions;
  }

  private extractFeatures(history: TimelineEvent[]): PredictiveFeature[] {
    return [
      {
        name: 'hour_of_day',
        type: 'temporal',
        importance: 0.3,
        extractionMethod: 'timestamp_to_hour'
      },
      {
        name: 'day_of_week',
        type: 'temporal',
        importance: 0.25,
        extractionMethod: 'timestamp_to_day'
      },
      {
        name: 'execution_count_24h',
        type: 'derived',
        importance: 0.5,
        extractionMethod: 'rolling_count'
      },
      {
        name: 'avg_confidence_10',
        type: 'derived',
        importance: 0.4,
        extractionMethod: 'rolling_average'
      },
      {
        name: 'input_size',
        type: 'static',
        importance: 0.2,
        extractionMethod: 'sizeof'
      }
    ];
  }
}

interface PredictedExecution {
  executionNumber: number;
  predictedTimestamp: number;
  predictedOutput: unknown;
  confidence: number;
  uncertainty: {
    lower: number;
    upper: number;
    std: number;
  };
}
```

### 3.3 Anomaly Prediction

Detect and predict anomalies:

```typescript
interface AnomalyPrediction {
  isAnomaly: boolean;
  confidence: number;
  anomalyType: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Explanation
  explanation: {
    reason: string;
    contributingFactors: string[];
    similarAnomalies: string[];
  };

  // Recommendations
  recommendations: string[];
}

enum AnomalyType {
  PERFORMANCE = 'performance', // Unusual latency
  QUALITY = 'quality', // Unusual confidence/error rate
  COST = 'cost', // Unusual cost
  VOLUME = 'volume', // Unusual execution frequency
  OUTPUT = 'output', // Unusual output distribution
  DEPENDENCY = 'dependency' // Dependency-related anomaly
}

class AnomalyPredictor {
  private baseline: Map<string, BaselineMetrics> = new Map();

  /**
   * Predict if execution will be anomalous
   */
  async predictAnomaly(
    boxId: string,
    input: unknown,
    context: ExecutionContext
  ): Promise<AnomalyPrediction> {

    const baselineMetrics = this.baseline.get(boxId);
    if (!baselineMetrics) {
      return {
        isAnomaly: false,
        confidence: 0.0,
        anomalyType: AnomalyType.OUTPUT,
        severity: 'low',
        explanation: {
          reason: 'No baseline established',
          contributingFactors: [],
          similarAnomalies: []
        },
        recommendations: ['Establish baseline with more executions']
      };
    }

    // Extract features
    const features = await this.extractFeatures(boxId, input, context);

    // Check for anomalies
    const anomalies: AnomalyPrediction[] = [];

    // Performance anomaly
    const perfAnomaly = this.checkPerformanceAnomaly(features, baselineMetrics);
    if (perfAnomaly) anomalies.push(perfAnomaly);

    // Quality anomaly
    const qualityAnomaly = this.checkQualityAnomaly(features, baselineMetrics);
    if (qualityAnomaly) anomalies.push(qualityAnomaly);

    // Cost anomaly
    const costAnomaly = this.checkCostAnomaly(features, baselineMetrics);
    if (costAnomaly) anomalies.push(costAnomaly);

    // Return most severe anomaly (if any)
    if (anomalies.length > 0) {
      anomalies.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      return anomalies[0];
    }

    return {
      isAnomaly: false,
      confidence: 0.95,
      anomalyType: AnomalyType.OUTPUT,
      severity: 'low',
      explanation: {
        reason: 'All metrics within normal range',
        contributingFactors: [],
        similarAnomalies: []
      },
      recommendations: []
    };
  }

  private checkPerformanceAnomaly(
    features: ExecutionFeatures,
    baseline: BaselineMetrics
  ): AnomalyPrediction | null {

    const expectedLatency = baseline.avgLatency;
    const actualLatency = features.predictedLatency;

    // Check if latency is >3 standard deviations from mean
    const stdLatency = baseline.stdLatency;
    const zScore = Math.abs((actualLatency - expectedLatency) / stdLatency);

    if (zScore > 3) {
      return {
        isAnomaly: true,
        confidence: Math.min(0.99, zScore / 3),
        anomalyType: AnomalyType.PERFORMANCE,
        severity: zScore > 5 ? 'critical' : zScore > 4 ? 'high' : 'medium',
        explanation: {
          reason: `Predicted latency (${actualLatency}ms) is ${zScore.toFixed(1)}σ from baseline (${expectedLatency}ms)`,
          contributingFactors: [
            'Input size may be larger than usual',
            'System resources may be constrained',
            'Downstream dependencies may be slow'
          ],
          similarAnomalies: this.findSimilarAnomalies(AnomalyType.PERFORMANCE, zScore)
        },
        recommendations: [
          'Consider scaling resources',
          'Check for memory leaks',
          'Optimize algorithm or use cache'
        ]
      };
    }

    return null;
  }
}

interface BaselineMetrics {
  avgLatency: number;
  stdLatency: number;
  avgConfidence: number;
  stdConfidence: number;
  avgCost: number;
  stdCost: number;
  executionCount: number;
  lastUpdated: number;
}

interface ExecutionFeatures {
  predictedLatency: number;
  predictedConfidence: number;
  predictedCost: number;
  inputSize: number;
  hourOfDay: number;
  dayOfWeek: number;
}
```

---

## 4. Time-Travel Debugging

### 4.1 Time Travel Capability

Every box supports rollback and replay:

```typescript
interface TimeTravelCapability {
  // Checkpoint management
  createCheckpoint(executionId: string): Promise<Checkpoint>;
  restoreCheckpoint(checkpointId: string): Promise<void>;

  // Time travel
  rollback(executionId: string): Promise<void>;
  replay(executionId: string, modifications?: ExecutionModification[]): Promise<void>;

  // Inspection
  inspectExecution(executionId: string): Promise<ExecutionSnapshot>;
  compareExecutions(executionId1: string, executionId2: string): Promise<ExecutionDiff>;
}

interface Checkpoint {
  id: string;
  boxId: string;
  executionId: string;
  timestamp: number;

  // State snapshot
  state: BoxState;

  // Execution context
  context: ExecutionContext;

  // Dependencies
  dependencies: {
    boxes: string[];
    state: Map<string, BoxState>;
  };

  // Metadata
  metadata: {
    created: number;
    size: number;
    compression: string;
  };
}

interface ExecutionSnapshot {
  executionId: string;
  timestamp: number;

  // Execution details
  input: unknown;
  output: unknown;
  confidence: number;
  executionTime: number;
  cost: number;

  // State at execution time
  state: BoxState;

  // Causal context
  causes: CausalContext;
  effects: CausalContext;

  // Temporal context
  temporalContext: {
    previousExecutions: TimelineEvent[];
    concurrentExecutions: TimelineEvent[];
    subsequentExecutions: TimelineEvent[];
  };
}

interface ExecutionModification {
  type: 'input' | 'parameter' | 'dependency';
  target: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

interface ExecutionDiff {
  executionId1: string;
  executionId2: string;

  // Differences
  inputDiff: Diff;
  outputDiff: Diff;
  stateDiff: Diff;
  performanceDiff: PerformanceDiff;

  // Summary
  summary: {
    similarity: number;
    significantDifferences: string[];
    possibleCauses: string[];
  };
}

interface Diff {
  added: string[];
  removed: string[];
  modified: Map<string, { oldValue: unknown; newValue: unknown }>;
  unchanged: string[];
}

interface PerformanceDiff {
  latencyDiff: number;
  costDiff: number;
  confidenceDiff: number;
  memoryDiff: number;
}
```

### 4.2 Temporal Debugger

```typescript
class TemporalDebugger {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private executionHistory: Map<string, ExecutionSnapshot> = new Map();

  /**
   * Create checkpoint at current execution
   */
  async createCheckpoint(executionId: string): Promise<Checkpoint> {

    const snapshot = await this.captureExecutionSnapshot(executionId);

    const checkpoint: Checkpoint = {
      id: generateId(),
      boxId: snapshot.state.boxId,
      executionId,
      timestamp: Date.now(),
      state: snapshot.state,
      context: snapshot.context,
      dependencies: {
        boxes: snapshot.causes.upstreamBoxes,
        state: await this.captureDependencyStates(snapshot.causes.upstreamBoxes)
      },
      metadata: {
        created: Date.now(),
        size: this.estimateSize(snapshot),
        compression: 'gzip'
      }
    };

    this.checkpoints.set(checkpoint.id, checkpoint);
    return checkpoint;
  }

  /**
   * Rollback to previous execution
   */
  async rollback(executionId: string): Promise<void> {

    const snapshot = this.executionHistory.get(executionId);
    if (!snapshot) {
      throw new Error(`Execution ${executionId} not found in history`);
    }

    // Find nearest checkpoint
    const checkpoint = this.findNearestCheckpoint(snapshot.timestamp);

    if (!checkpoint) {
      throw new Error('No checkpoint found for rollback');
    }

    // Restore state
    await this.restoreCheckpoint(checkpoint.id);

    // Revert dependent executions
    const dependentExecutions = await this.findDependentExecutions(executionId);
    for (const depId of dependentExecutions) {
      await this.rollback(depId);
    }
  }

  /**
   * Replay execution with optional modifications
   */
  async replay(
    executionId: string,
    modifications?: ExecutionModification[]
  ): Promise<void> {

    const snapshot = this.executionHistory.get(executionId);
    if (!snapshot) {
      throw new Error(`Execution ${executionId} not found in history`);
    }

    // Apply modifications if provided
    let modifiedInput = snapshot.input;
    let modifiedContext = snapshot.context;

    if (modifications) {
      for (const mod of modifications) {
        switch (mod.type) {
          case 'input':
            modifiedInput = this.applyModification(modifiedInput, mod);
            break;
          case 'parameter':
            modifiedContext = this.applyContextModification(modifiedContext, mod);
            break;
          case 'dependency':
            await this.applyDependencyModification(mod);
            break;
        }
      }
    }

    // Rollback to checkpoint
    await this.rollback(executionId);

    // Replay with modified input
    await this.executeWithState(snapshot.state, modifiedInput, modifiedContext);
  }

  /**
   * Inspect execution at specific point in time
   */
  async inspectExecution(executionId: string): Promise<ExecutionSnapshot> {

    const snapshot = this.executionHistory.get(executionId);
    if (!snapshot) {
      throw new Error(`Execution ${executionId} not found in history`);
    }

    // Enrich snapshot with temporal context
    snapshot.temporalContext = {
      previousExecutions: await this.getPreviousExecutions(executionId, 10),
      concurrentExecutions: await this.getConcurrentExecutions(executionId),
      subsequentExecutions: await this.getSubsequentExecutions(executionId, 10)
    };

    return snapshot;
  }

  /**
   * Compare two executions
   */
  async compareExecutions(
    executionId1: string,
    executionId2: string
  ): Promise<ExecutionDiff> {

    const snapshot1 = await this.inspectExecution(executionId1);
    const snapshot2 = await this.inspectExecution(executionId2);

    return {
      executionId1,
      executionId2,
      inputDiff: this.computeDiff(snapshot1.input, snapshot2.input),
      outputDiff: this.computeDiff(snapshot1.output, snapshot2.output),
      stateDiff: this.computeDiff(snapshot1.state, snapshot2.state),
      performanceDiff: {
        latencyDiff: snapshot2.executionTime - snapshot1.executionTime,
        costDiff: snapshot2.cost - snapshot1.cost,
        confidenceDiff: snapshot2.confidence - snapshot1.confidence,
        memoryDiff: snapshot2.state.memoryUsage - snapshot1.state.memoryUsage
      },
      summary: {
        similarity: this.calculateSimilarity(snapshot1, snapshot2),
        significantDifferences: this.findSignificantDifferences(snapshot1, snapshot2),
        possibleCauses: await this.inferCauses(snapshot1, snapshot2)
      }
    };
  }
}
```

### 4.3 Execution Replay with What-If

```typescript
class WhatIfAnalyzer {
  /**
   * Analyze what would happen if execution was different
   */
  async whatIf(
    executionId: string,
    scenario: WhatIfScenario
  ): Promise<WhatIfResult> {

    const originalExecution = await this.getExecution(executionId);

    // Create what-if branch
    const branchId = await this.createWhatIfBranch(executionId);

    // Modify execution according to scenario
    const modifiedExecution = await this.applyScenario(originalExecution, scenario);

    // Replay with modifications
    const result = await this.replayInBranch(branchId, modifiedExecution);

    // Compare with original
    const comparison = await this.compareExecutions(executionId, result.executionId);

    return {
      scenario,
      originalExecution,
      whatIfExecution: result,
      comparison,
      recommendation: this.generateRecommendation(comparison)
    };
  }

  /**
   * Batch what-if analysis
   */
  async batchWhatIf(
    executionId: string,
    scenarios: WhatIfScenario[]
  ): Promise<WhatIfResult[]> {

    const results: WhatIfResult[] = [];

    for (const scenario of scenarios) {
      const result = await this.whatIf(executionId, scenario);
      results.push(result);
    }

    // Rank by impact
    results.sort((a, b) => {
      const impactA = this.calculateImpact(a.comparison);
      const impactB = this.calculateImpact(b.comparison);
      return impactB - impactA;
    });

    return results;
  }
}

interface WhatIfScenario {
  type: 'input' | 'parameter' | 'dependency' | 'timing';
  description: string;

  // Scenario-specific parameters
  modifications: ExecutionModification[];

  // Expected outcome
  expectedOutcome?: {
    performanceImprovement?: number;
    costReduction?: number;
    qualityImprovement?: number;
  };
}

interface WhatIfResult {
  scenario: WhatIfScenario;
  originalExecution: ExecutionSnapshot;
  whatIfExecution: ExecutionResult;
  comparison: ExecutionDiff;
  recommendation: {
    shouldApply: boolean;
    reason: string;
    confidence: number;
  };
}
```

---

## 5. Counterfactual Reasoning

### 5.1 Counterfactual Analysis

Understand what would have happened under different conditions:

```typescript
class CounterfactualReasoner {
  /**
   * Generate counterfactual: what would have happened if...
   */
  async generateCounterfactual(
    actualExecution: ExecutionSnapshot,
    counterfactualCondition: CounterfactualCondition
  ): Promise<Counterfactual> {

    // Identify factual antecedents
    const antecedents = await this.identifyAntecedents(actualExecution);

    // Determine what needs to change
    const changes = this.calculateChanges(antecedents, counterfactualCondition);

    // Simulate counterfactual world
    const counterfactualExecution = await this.simulateCounterfactual(
      actualExecution,
      changes
    );

    // Calculate counterfactual effect
    const effect = this.calculateCounterfactualEffect(
      actualExecution,
      counterfactualExecution
    );

    return {
      factual: actualExecution,
      counterfactual: counterfactualExecution,
      condition: counterfactualCondition,
      changes,
      effect,
      validity: this.assessValidity(actualExecution, counterfactualExecution)
    };
  }

  /**
   * Find minimal changes for desired outcome
   */
  async findMinimalChanges(
    actualExecution: ExecutionSnapshot,
    desiredOutcome: unknown
  ): Promise<CounterfactualCondition[]> {

    const conditions: CounterfactualCondition[] = [];

    // Try different modifications
    const modifications = [
      { type: 'input', target: '*', change: 0.1 }, // 10% input change
      { type: 'parameter', target: 'temperature', change: -0.1 },
      { type: 'parameter', target: 'topP', change: 0.1 },
      { type: 'dependency', target: 'upstream', change: 'alternate' }
    ];

    for (const mod of modifications) {
      const condition: CounterfactualCondition = {
        type: mod.type,
        target: mod.target,
        change: mod.change,
        desiredOutcome
      };

      const counterfactual = await this.generateCounterfactual(
        actualExecution,
        condition
      );

      // Check if desired outcome achieved
      if (this.matchesDesiredOutcome(counterfactual.counterfactual.output, desiredOutcome)) {
        conditions.push(condition);
      }
    }

    // Sort by magnitude of change (minimal first)
    conditions.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));

    return conditions;
  }
}

interface CounterfactualCondition {
  type: 'input' | 'parameter' | 'dependency' | 'timing';
  target: string;
  change: unknown; // What to change
  desiredOutcome?: unknown;
}

interface Counterfactual {
  factual: ExecutionSnapshot;
  counterfactual: ExecutionSnapshot;
  condition: CounterfactualCondition;
  changes: ExecutionModification[];
  effect: CounterfactualEffect;
  validity: {
    isPlausible: boolean;
    confidence: number;
    violations: string[];
  };
}

interface CounterfactualEffect {
  outputDifference: number;
  performanceDifference: number;
  costDifference: number;
  qualityDifference: number;

  // Downstream effects
  downstreamEffects: Map<string, number>; // boxId -> effect size

  // Overall assessment
  overallImpact: 'significant' | 'moderate' | 'minimal';
}
```

---

## 6. Temporal Logic

### 6.1 Temporal Constraints

Specify and verify temporal properties:

```typescript
interface TemporalLogic {
  // Specify temporal constraints
  addConstraint(constraint: TemporalConstraint): void;
  removeConstraint(constraintId: string): void;

  // Verify constraints
  verifyConstraints(execution: ExecutionSnapshot): Promise<VerificationResult>;
  verifyAll(): Promise<VerificationResult>;

  // Query temporal properties
  query(query: TemporalQuery): Promise<TemporalQueryResult>;
}

interface TemporalConstraint {
  id: string;
  type: TemporalConstraintType;
  description: string;

  // Constraint expression
  expression: TemporalExpression;

  // Metadata
  metadata: {
    created: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'safety' | 'performance' | 'quality' | 'cost';
  };
}

enum TemporalConstraintType {
  // LTL (Linear Temporal Logic) operators
  ALWAYS = 'always', // □φ: φ must always be true
  EVENTUALLY = 'eventually', // ◇φ: φ must eventually be true
  UNTIL = 'until', // φ U ψ: φ must be true until ψ becomes true
  NEXT = 'next', // ○φ: φ must be true in the next state

  // Custom operators
  WITHIN = 'within', // φ must be true within time T
  AFTER = 'after', // φ must be true after time T
  BETWEEN = 'between', // φ must be true between T1 and T2
  HOLDS_FOR = 'holds_for' // φ must hold for duration T
}

interface TemporalExpression {
  operator: TemporalConstraintType;
  operands: TemporalExpression[];
  condition: Condition;
  timeBound?: number; // Time bound for operators
}

interface Condition {
  type: 'state' | 'performance' | 'quality' | 'causal';
  property: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value: unknown;
}
```

### 6.2 Temporal Logic Verifier

```typescript
class TemporalLogicVerifier {
  private constraints: Map<string, TemporalConstraint> = new Map();

  /**
   * Add temporal constraint
   */
  addConstraint(constraint: TemporalConstraint): void {
    this.constraints.set(constraint.id, constraint);
  }

  /**
   * Verify all constraints against execution
   */
  async verifyAll(): Promise<VerificationResult> {

    const violations: ConstraintViolation[] = [];

    for (const constraint of this.constraints.values()) {
      const result = await this.verifyConstraint(constraint);
      if (!result.satisfied) {
        violations.push({
          constraintId: constraint.id,
          description: constraint.description,
          severity: constraint.metadata.priority,
          violation: result.reason!,
          timestamp: Date.now()
        });
      }
    }

    return {
      satisfied: violations.length === 0,
      violations,
      summary: {
        totalConstraints: this.constraints.size,
        satisfiedCount: this.constraints.size - violations.length,
        violatedCount: violations.length,
        criticalViolations: violations.filter(v => v.severity === 'critical').length
      }
    };
  }

  /**
   * Verify single constraint
   */
  private async verifyConstraint(
    constraint: TemporalConstraint
  ): Promise<{ satisfied: boolean; reason?: string }> {

    const expression = constraint.expression;

    switch (expression.operator) {
      case TemporalConstraintType.ALWAYS:
        return await this.verifyAlways(expression);

      case TemporalConstraintType.EVENTUALLY:
        return await this.verifyEventually(expression);

      case TemporalConstraintType.WITHIN:
        return await this.verifyWithin(expression);

      case TemporalConstraintType.HOLDS_FOR:
        return await this.verifyHoldsFor(expression);

      default:
        return { satisfied: false, reason: 'Unknown operator' };
    }
  }

  /**
   * Verify □φ (always φ): φ must be true in all states
   */
  private async verifyAlways(
    expression: TemporalExpression
  ): Promise<{ satisfied: boolean; reason?: string }> {

    const history = await this.getExecutionHistory();

    for (const state of history) {
      if (!this.evaluateCondition(expression.condition, state)) {
        return {
          satisfied: false,
          reason: `Condition violated at timestamp ${state.timestamp}`
        };
      }
    }

    return { satisfied: true };
  }

  /**
   * Verify ◇φ (eventually φ): φ must be true in some future state
   */
  private async verifyEventually(
    expression: TemporalExpression
  ): Promise<{ satisfied: boolean; reason?: string }> {

    const history = await this.getExecutionHistory();

    for (const state of history) {
      if (this.evaluateCondition(expression.condition, state)) {
        return { satisfied: true };
      }
    }

    return {
      satisfied: false,
      reason: 'Condition never satisfied in execution history'
    };
  }

  /**
   * Verify φ within T: φ must be true within time T
   */
  private async verifyWithin(
    expression: TemporalExpression
  ): Promise<{ satisfied: boolean; reason?: string }> {

    const timeBound = expression.timeBound!;
    const history = await this.getExecutionHistory();
    const startTime = history[0].timestamp;

    for (const state of history) {
      if (state.timestamp - startTime > timeBound) {
        return {
          satisfied: false,
          reason: `Condition not satisfied within ${timeBound}ms`
        };
      }

      if (this.evaluateCondition(expression.condition, state)) {
        return { satisfied: true };
      }
    }

    return {
      satisfied: false,
      reason: `Condition not satisfied within ${timeBound}ms`
    };
  }

  private evaluateCondition(condition: Condition, state: BoxState): boolean {
    const actualValue = this.getPropertyValue(state, condition.property);

    switch (condition.operator) {
      case '>': return actualValue > condition.value;
      case '>=': return actualValue >= condition.value;
      case '<': return actualValue < condition.value;
      case '<=': return actualValue <= condition.value;
      case '==': return actualValue === condition.value;
      case '!=': return actualValue !== condition.value;
    }
  }

  private getPropertyValue(state: BoxState, property: string): unknown {
    switch (property) {
      case 'confidence': return state.confidence;
      case 'executionTime': return state.executionTimeMs;
      case 'cost': return state.cost;
      default: return state.variables[property];
    }
  }
}

interface VerificationResult {
  satisfied: boolean;
  violations: ConstraintViolation[];
  summary: {
    totalConstraints: number;
    satisfiedCount: number;
    violatedCount: number;
    criticalViolations: number;
  };
}

interface ConstraintViolation {
  constraintId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  violation: string;
  timestamp: number;
}
```

---

## 7. Timeline Visualization

### 7.1 Timeline Renderer

Visualize box execution over time:

```typescript
interface TimelineVisualization {
  // Render timeline
  render(options: RenderOptions): TimelineRender;

  // Interactive features
  addInteraction(interaction: TimelineInteraction): void;

  // Export
  export(format: 'svg' | 'png' | 'json'): string | object;
}

interface RenderOptions {
  timeRange: {
    start: number;
    end: number;
  };

  levelOfDetail: 'overview' | 'detailed' | 'comprehensive';

  features: {
    showCausalEdges: boolean;
    showPredictions: boolean;
    showConfidence: boolean;
    showAnomalies: boolean;
  };

  styling: {
    colorScheme: ColorScheme;
    animation: boolean;
    compact: boolean;
  };
}

interface TimelineRender {
  format: 'svg' | 'html' | 'canvas';
  content: string;
  metadata: {
    width: number;
    height: number;
    elements: number;
    interactive: boolean;
  };
}

class TimelineVisualizer {
  /**
   * Render timeline as SVG
   */
  async renderSVG(
    boxId: string,
    options: RenderOptions
  ): Promise<TimelineRender> {

    const history = await this.getExecutionHistory(boxId, options.timeRange);
    const predictions = await this.getPredictions(boxId, options.timeRange);
    const causalEdges = await this.getCausalEdges(boxId);

    const svg = this.buildSVG({
      events: history,
      predictions,
      causalEdges,
      options
    });

    return {
      format: 'svg',
      content: svg,
      metadata: {
        width: 1200,
        height: 400,
        elements: history.length + predictions.length + causalEdges.length,
        interactive: false
      }
    };
  }

  /**
   * Render interactive HTML timeline
   */
  async renderHTML(
    boxId: string,
    options: RenderOptions
  ): Promise<TimelineRender> {

    const history = await this.getExecutionHistory(boxId, options.timeRange);
    const predictions = await this.getPredictions(boxId, options.timeRange);
    const causalEdges = await this.getCausalEdges(boxId);

    const html = this.buildHTML({
      events: history,
      predictions,
      causalEdges,
      options,
      interactions: {
        hover: this.showDetails.bind(this),
        click: this.showInspector.bind(this),
        drag: this.adjustTimeRange.bind(this)
      }
    });

    return {
      format: 'html',
      content: html,
      metadata: {
        width: 1200,
        height: 400,
        elements: history.length + predictions.length + causalEdges.length,
        interactive: true
      }
    };
  }

  private buildSVG(data: TimelineData): string {
    const { events, predictions, causalEdges, options } = data;

    // Calculate dimensions
    const width = 1200;
    const height = 400;
    const padding = 50;

    // Time scale
    const startTime = Math.min(
      ...events.map(e => e.timestamp),
      ...predictions.map(p => p.timestamp)
    );
    const endTime = Math.max(
      ...events.map(e => e.timestamp),
      ...predictions.map(p => p.timestamp)
    );
    const timeScale = (width - 2 * padding) / (endTime - startTime);

    // Build SVG
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

    // Background
    svg += `<rect width="100%" height="100%" fill="#f8f9fa"/>`;

    // Time axis
    svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>`;

    // Events (actual executions)
    for (const event of events) {
      const x = padding + (event.timestamp - startTime) * timeScale;
      const y = height / 2;

      // Color by confidence
      const color = this.getConfidenceColor(event.confidence);

      svg += `
        <circle cx="${x}" cy="${y}" r="8" fill="${color}" stroke="#333" stroke-width="1">
          <title>${this.formatTooltip(event)}</title>
        </circle>
      `;

      // Execution time bar
      const barHeight = event.executionTimeMs / 10;
      svg += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - barHeight}" stroke="${color}" stroke-width="2"/>`;
    }

    // Predictions (future)
    for (const prediction of predictions) {
      const x = padding + (prediction.timestamp - startTime) * timeScale;
      const y = height / 2;

      // Dashed circle for predictions
      svg += `
        <circle cx="${x}" cy="${y}" r="6" fill="none" stroke="#666" stroke-width="2" stroke-dasharray="4">
          <title>${this.formatPredictionTooltip(prediction)}</title>
        </circle>
      `;

      // Confidence interval
      if (prediction.uncertainty) {
        const ciWidth = prediction.uncertainty.std * timeScale;
        svg += `<line x1="${x - ciWidth}" y1="${y + 15}" x2="${x + ciWidth}" y2="${y + 15}" stroke="#999" stroke-width="2"/>`;
      }
    }

    // Causal edges
    if (options.features.showCausalEdges) {
      for (const edge of causalEdges) {
        const fromX = padding + (edge.from.timestamp - startTime) * timeScale;
        const toX = padding + (edge.to.timestamp - startTime) * timeScale;
        const y = height / 2 + 50;

        // Arrow color by strength
        const color = this.getStrengthColor(edge.strength);

        svg += `
          <defs>
            <marker id="arrow-${edge.id}" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="${color}" />
            </marker>
          </defs>
          <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" stroke="${color}" stroke-width="${edge.strength * 3}" marker-end="url(#arrow-${edge.id})" opacity="0.6">
            <title>${this.formatEdgeTooltip(edge)}</title>
          </line>
        `;
      }
    }

    svg += '</svg>';

    return svg;
  }
}

interface TimelineData {
  events: TimelineEvent[];
  predictions: Prediction[];
  causalEdges: CausalEdge[];
  options: RenderOptions;
  interactions?: Record<string, Function>;
}
```

### 7.2 Causal Graph Visualization

```typescript
class CausalGraphVisualizer {
  /**
   * Render causal graph as force-directed graph
   */
  async renderCausalGraph(
    graph: CausalGraph,
    options: GraphRenderOptions
  ): Promise<string> {

    // Use D3.js or similar for force-directed layout
    const nodes = graph.nodes.map(node => ({
      id: node.id,
      label: node.boxId,
      size: 10 + node.causalInfluence * 20,
      color: this.getInfluenceColor(node.causalInfluence)
    }));

    const links = graph.edges.map(edge => ({
      source: edge.from,
      target: edge.to,
      width: edge.strength * 5,
      color: this.getStrengthColor(edge.strength),
      opacity: edge.confidence
    }));

    // Generate D3.js code
    const d3Code = this.generateD3Code(nodes, links, options);

    return d3Code;
  }

  private generateD3Code(nodes: any[], links: any[], options: GraphRenderOptions): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://d3js.org/d3.v7.min.js"></script>
        <style>
          .node { stroke: #fff; stroke-width: 1.5px; }
          .link { stroke-opacity: 0.6; }
          .tooltip { position: absolute; background: #fff; border: 1px solid #ccc; padding: 5px; }
        </style>
      </head>
      <body>
        <svg width="${options.width}" height="${options.height}"></svg>
        <script>
          const svg = d3.select("svg");
          const width = +svg.attr("width");
          const height = +svg.attr("height");

          const simulation = d3.forceSimulation(${JSON.stringify(nodes)})
            .force("link", d3.forceLink(${JSON.stringify(links)}).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

          const link = svg.append("g")
            .selectAll("line")
            .data(${JSON.stringify(links)})
            .join("line")
            .attr("class", "link")
            .attr("stroke-width", d => d.width)
            .attr("stroke", d => d.color)
            .attr("stroke-opacity", d => d.opacity);

          const node = svg.append("g")
            .selectAll("circle")
            .data(${JSON.stringify(nodes)})
            .join("circle")
            .attr("class", "node")
            .attr("r", d => d.size)
            .attr("fill", d => d.color)
            .call(d3.drag()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended));

          node.append("title")
            .text(d => d.label);

          simulation.on("tick", () => {
            link
              .attr("x1", d => d.source.x)
              .attr("y1", d => d.source.y)
              .attr("x2", d => d.target.x)
              .attr("y2", d => d.target.y);

            node
              .attr("cx", d => d.x)
              .attr("cy", d => d.y);
          });

          function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          }

          function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
          }

          function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }
        </script>
      </body>
      </html>
    `;
  }
}

interface GraphRenderOptions {
  width: number;
  height: number;
  showLabels: boolean;
  showEdgeWeights: boolean;
  animated: boolean;
}
```

---

## 8. TypeScript Interfaces

### 8.1 Core Interfaces

```typescript
/**
 * Temporal Box - Time-aware execution
 */
export interface TemporalBox {
  // Identity
  id: string;
  boxType: string;

  // Temporal state
  temporalState: TemporalState;

  // Execution history
  history: ExecutionHistory;

  // Temporal capabilities
  timeTravel: TimeTravelCapability;
  prediction: PredictiveCapability;
  causality: CausalCapability;

  // Methods
  execute(input: unknown, context: ExecutionContext): Promise<ExecutionResult>;
  rollback(executionId: string): Promise<void>;
  replay(executionId: string, modifications?: ExecutionModification[]): Promise<void>;
  predict(horizon: number): Promise<Prediction[]>;
  inspect(executionId: string): Promise<ExecutionSnapshot>;
}

/**
 * Temporal State
 */
export interface TemporalState {
  // Current state
  present: BoxState;

  // Past states (immutable)
  past: BoxState[];

  // Future projections (predicted)
  future: ProjectedState[];

  // Temporal metadata
  createdAt: number;
  lastModified: number;
  version: number;
}

/**
 * Box State
 */
export interface BoxState {
  timestamp: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  confidence: number;
  executionTimeMs: number;
  cost: number;

  // State snapshot
  variables: Record<string, unknown>;
  dependencies: string[];
  sideEffects: SideEffect[];

  // Temporal annotations
  temporalAnnotations: TemporalAnnotation[];
}

/**
 * Execution History
 */
export interface ExecutionHistory {
  boxId: string;
  events: TimelineEvent[];
  stateTransitions: StateTransition[];
  patterns: TemporalPattern[];

  // Statistics
  stats: {
    totalExecutions: number;
    avgExecutionTime: number;
    successRate: number;
    confidenceTrend: Trend;
  };
}

/**
 * Causal Graph
 */
export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  metadata: CausalGraphMetadata;
}

/**
 * Causal Node
 */
export interface CausalNode {
  id: string;
  boxId: string;
  executionId: string;

  // Node properties
  properties: {
    timestamp: number;
    output: unknown;
    confidence: number;
    executionTime: number;
  };

  // Causal properties
  causalInfluence: number;
  causalDependence: number;
}

/**
 * Causal Edge
 */
export interface CausalEdge {
  id: string;
  from: string;
  to: string;

  // Causal relationship
  strength: number;
  confidence: number;
  type: CausalEdgeType;

  // Temporal properties
  delay: number;

  // Evidence
  evidence: CausalEvidence[];
}

/**
 * Predictive Model
 */
export interface PredictiveModel {
  id: string;
  boxId: string;
  modelType: PredictiveModelType;

  // Model properties
  properties: {
    accuracy: number;
    confidence: number;
    trainingDataSize: number;
    lastTrained: number;
    predictionHorizon: number;
  };

  // Features
  features: PredictiveFeature[];

  // Parameters
  parameters: Record<string, unknown>;

  // Prediction method
  predict(input: unknown, context: PredictionContext): Promise<Prediction>;
}

/**
 * Temporal Debugger
 */
export interface TemporalDebugger {
  // Checkpoint management
  createCheckpoint(executionId: string): Promise<Checkpoint>;
  restoreCheckpoint(checkpointId: string): Promise<void>;

  // Time travel
  rollback(executionId: string): Promise<void>;
  replay(executionId: string, modifications?: ExecutionModification[]): Promise<void>;

  // Inspection
  inspectExecution(executionId: string): Promise<ExecutionSnapshot>;
  compareExecutions(executionId1: string, executionId2: string): Promise<ExecutionDiff>;
}

/**
 * Temporal Logic
 */
export interface TemporalLogic {
  // Constraints
  addConstraint(constraint: TemporalConstraint): void;
  removeConstraint(constraintId: string): void;

  // Verification
  verifyConstraints(execution: ExecutionSnapshot): Promise<VerificationResult>;
  verifyAll(): Promise<VerificationResult>;

  // Query
  query(query: TemporalQuery): Promise<TemporalQueryResult>;
}

/**
 * Supporting Interfaces
 */
export interface TimelineEvent {
  id: string;
  timestamp: number;
  eventType: 'execution' | 'state_change' | 'dependency_update' | 'error' | 'rollback';

  // Event data
  data: {
    input?: unknown;
    output?: unknown;
    error?: Error;
    previousState?: BoxState;
    newState?: BoxState;
  };

  // Causal links
  causes: string[];
  effects: string[];

  // Metadata
  metadata: {
    executionTimeMs?: number;
    cost?: number;
    confidence?: number;
    rollbackPoint?: boolean;
  };
}

export interface StateTransition {
  fromState: BoxState;
  toState: BoxState;
  timestamp: number;
  trigger: string;
  confidence: number;
}

export interface TemporalPattern {
  patternType: 'periodic' | 'trend' | 'anomaly' | 'seasonal';
  description: string;
  confidence: number;
  occurrences: number;
  firstOccurrence: number;
  lastOccurrence: number;
  prediction?: PatternPrediction;
}

export interface Trend {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  magnitude: number;
  confidence: number;
  projection?: number;
}

export interface Checkpoint {
  id: string;
  boxId: string;
  executionId: string;
  timestamp: number;
  state: BoxState;
  context: ExecutionContext;
  dependencies: {
    boxes: string[];
    state: Map<string, BoxState>;
  };
  metadata: {
    created: number;
    size: number;
    compression: string;
  };
}

export interface ExecutionSnapshot {
  executionId: string;
  timestamp: number;
  input: unknown;
  output: unknown;
  confidence: number;
  executionTime: number;
  cost: number;
  state: BoxState;
  causes: CausalContext;
  effects: CausalContext;
  temporalContext: {
    previousExecutions: TimelineEvent[];
    concurrentExecutions: TimelineEvent[];
    subsequentExecutions: TimelineEvent[];
  };
}

export interface ExecutionDiff {
  executionId1: string;
  executionId2: string;
  inputDiff: Diff;
  outputDiff: Diff;
  stateDiff: Diff;
  performanceDiff: PerformanceDiff;
  summary: {
    similarity: number;
    significantDifferences: string[];
    possibleCauses: string[];
  };
}

export interface Prediction {
  predictedValue: unknown;
  confidence: number;
  uncertainty: {
    lower: number;
    upper: number;
    std: number;
  };
  metadata: {
    modelId: string;
    timestamp: number;
    horizon: number;
    features: Record<string, number>;
  };
}

export interface Counterfactual {
  factual: ExecutionSnapshot;
  counterfactual: ExecutionSnapshot;
  condition: CounterfactualCondition;
  changes: ExecutionModification[];
  effect: CounterfactualEffect;
  validity: {
    isPlausible: boolean;
    confidence: number;
    violations: string[];
  };
}

export interface TemporalConstraint {
  id: string;
  type: TemporalConstraintType;
  description: string;
  expression: TemporalExpression;
  metadata: {
    created: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'safety' | 'performance' | 'quality' | 'cost';
  };
}

export interface VerificationResult {
  satisfied: boolean;
  violations: ConstraintViolation[];
  summary: {
    totalConstraints: number;
    satisfiedCount: number;
    violatedCount: number;
    criticalViolations: number;
  };
}

// Enums
export enum CausalEdgeType {
  DIRECT = 'direct',
  INDIRECT = 'indirect',
  SPURIOUS = 'spurious',
  CONFOUNDED = 'confounded',
  BIDIRECTIONAL = 'bidirectional'
}

export enum PredictiveModelType {
  LINEAR_REGRESSION = 'linear_regression',
  ARIMA = 'arima',
  LSTM = 'lstm',
  PROPHET = 'prophet',
  ENSEMBLE = 'ensemble'
}

export enum TemporalConstraintType {
  ALWAYS = 'always',
  EVENTUALLY = 'eventually',
  UNTIL = 'until',
  NEXT = 'next',
  WITHIN = 'within',
  AFTER = 'after',
  BETWEEN = 'between',
  HOLDS_FOR = 'holds_for'
}

export enum AnomalyType {
  PERFORMANCE = 'performance',
  QUALITY = 'quality',
  COST = 'cost',
  VOLUME = 'volume',
  OUTPUT = 'output',
  DEPENDENCY = 'dependency'
}
```

---

## 9. Real-World Examples

### Example 1: Financial Forecasting with Temporal Awareness

**Scenario**: A spreadsheet box forecasts quarterly revenue based on historical data.

**Temporal Dynamics**:

```typescript
// 1. Track execution history
const forecastBox: TemporalBox = {
  id: 'revenue-forecast',
  boxType: 'ForecastBox',
  temporalState: {
    present: currentState,
    past: [stateQ1, stateQ2, stateQ3, stateQ4],
    future: [predictedQ1, predictedQ2, predictedQ3, predictedQ4]
  },
  history: {
    events: [
      { timestamp: '2024-01-01', eventType: 'execution', output: 1000000 },
      { timestamp: '2024-04-01', eventType: 'execution', output: 1200000 },
      { timestamp: '2024-07-01', eventType: 'execution', output: 1100000 },
      { timestamp: '2024-10-01', eventType: 'execution', output: 1300000 }
    ],
    patterns: [
      {
        patternType: 'seasonal',
        description: 'Q4 always 30% higher than Q1',
        confidence: 0.92,
        occurrences: 4
      }
    ]
  }
};

// 2. Predict future behavior
const predictions = await forecastBox.predict(90 * 24 * 60 * 60 * 1000); // 90 days ahead
// Output: [
//   { timestamp: '2025-01-01', predictedValue: 1050000, confidence: 0.88 },
//   { timestamp: '2025-04-01', predictedValue: 1260000, confidence: 0.85 },
//   { timestamp: '2025-07-01', predictedValue: 1155000, confidence: 0.82 },
//   { timestamp: '2025-10-01', predictedValue: 1365000, confidence: 0.80 }
// ]

// 3. Detect anomaly
const anomaly = await anomalyPredictor.predictAnomaly('revenue-forecast', inputData, context);
// Output: {
//   isAnomaly: false,
//   confidence: 0.95,
//   anomalyType: OUTPUT,
//   severity: 'low'
// }

// 4. Causal analysis
const causalGraph = await causalInference.discoverCausalRelations(executionHistory);
// Output: Shows that 'marketing-spend' box causes 'revenue' box (strength: 0.75)

// 5. What-if scenario
const whatIf = await whatIfAnalyzer.whatIf(executionId, {
  type: 'dependency',
  description: 'What if marketing spend increases by 20%?',
  modifications: [
    { type: 'dependency', target: 'marketing-spend', oldValue: 50000, newValue: 60000 }
  ]
});
// Output: Revenue would increase by approximately 15% (causal effect)
```

### Example 2: Time-Travel Debugging of Error

**Scenario**: A box produced unexpected output. Debug using time-travel.

**Temporal Debugging**:

```typescript
// 1. Inspect execution
const snapshot = await temporalDebugger.inspectExecution('exec-123');
// Output: Shows full execution context, state, and causal relationships

// 2. Compare with successful execution
const diff = await temporalDebugger.compareExecutions('exec-123', 'exec-122');
// Output: {
//   inputDiff: { modified: [['data_source', 'old_source', 'new_source']] },
//   outputDiff: { modified: [['result', 100, 85]] },
//   performanceDiff: { latencyDiff: +500, costDiff: +0.01, confidenceDiff: -0.15 },
//   summary: {
//     similarity: 0.75,
//     significantDifferences: ['data_source changed', 'output 15% lower'],
//     possibleCauses: ['New data source has different format', 'Missing data transformation']
//   }
// }

// 3. Rollback to before error
await temporalDebugger.rollback('exec-123');

// 4. Replay with fix
await temporalDebugger.replay('exec-123', [
  { type: 'parameter', target: 'data_source', oldValue: 'new_source', newValue: 'old_source' }
]);

// 5. Verify temporal constraints
const verification = await temporalLogic.verifyAll();
// Output: {
//   satisfied: true,
//   violations: [],
//   summary: { totalConstraints: 12, satisfiedCount: 12, violatedCount: 0, criticalViolations: 0 }
// }
```

### Example 3: Causal Discovery in Multi-Box Pipeline

**Scenario**: Discover causal relationships in a data processing pipeline.

**Causal Discovery**:

```typescript
// Pipeline: data-ingestion → transformation → aggregation → reporting

// 1. Discover causal relationships
const causalGraph = await causalInference.discoverCausalRelations(executionHistory);

// Output causal graph:
// Nodes: [data-ingestion, transformation, aggregation, reporting]
// Edges: [
//   { from: data-ingestion, to: transformation, strength: 0.95, type: DIRECT },
//   { from: transformation, to: aggregation, strength: 0.88, type: DIRECT },
//   { from: aggregation, to: reporting, strength: 0.92, type: DIRECT },
//   { from: data-ingestion, to: reporting, strength: 0.15, type: INDIRECT } // Through transformation
// ]

// 2. Test specific causality
const relation = await causalInference.testCausality(
  transformationNode,
  aggregationNode,
  executionHistory
);
// Output: {
//   causes: true,
//   confidence: 0.88,
//   strength: 0.88,
//   type: DIRECT,
//   evidence: [intervention data showing correlation],
//   confounders: []
// }

// 3. Ablation test
const ablation = await interventionTester.ablation('transformation', context);
// Output: Removing transformation box causes 40% drop in reporting quality

// 4. Counterfactual analysis
const counterfactual = await counterfactualReasoner.generateCounterfactual(
  actualExecution,
  {
    type: 'dependency',
    target: 'data-ingestion',
    change: { format: 'json' }, // What if data was JSON instead of CSV?
    desiredOutcome: { processingTime: 500 } // Want processing under 500ms
  }
);
// Output: {
//   factual: { processingTime: 750, outputQuality: 0.95 },
//   counterfactual: { processingTime: 420, outputQuality: 0.93 },
//   effect: {
//     performanceDifference: -330, // 44% faster
//     qualityDifference: -0.02, // 2% quality reduction
//     overallImpact: 'significant'
//   }
// }
```

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Week 1: Core Temporal Tracking**
- [ ] Implement TemporalBox interface
- [ ] Add execution history tracking
- [ ] Implement timeline event recording
- [ ] Add state transitions
- [ ] Test temporal state machine

**Week 2: State Snapshots**
- [ ] Implement checkpoint creation
- [ ] Add state serialization/deserialization
- [ ] Implement compression for storage
- [ ] Add state comparison utilities
- [ ] Test snapshot/recovery

### Phase 2: Causal Inference (Week 3-5)

**Week 3: Causal Graph**
- [ ] Implement CausalGraph data structure
- [ ] Add causal node/edge interfaces
- [ ] Implement graph traversal
- [ ] Add visualization support
- [ ] Test with sample data

**Week 4: Causal Discovery**
- [ ] Implement PC algorithm
- [ ] Add Granger causality
- [ ] Implement intervention analysis
- [ ] Add confounder detection
- [ ] Test discovery accuracy

**Week 5: Causal Testing**
- [ ] Implement do-interventions
- [ ] Add counterfactual simulation
- [ ] Implement ablation testing
- [ ] Add causal effect measurement
- [ ] Test intervention framework

### Phase 3: Predictive Modeling (Week 6-8)

**Week 6: Prediction Framework**
- [ ] Implement PredictiveModel interface
- [ ] Add feature extraction
- [ ] Implement time-series preparation
- [ ] Add training pipeline
- [ ] Test with linear regression

**Week 7: Advanced Models**
- [ ] Implement ARIMA model
- [ ] Add LSTM support
- [ ] Implement Prophet integration
- [ ] Add ensemble methods
- [ ] Test model accuracy

**Week 8: Anomaly Detection**
- [ ] Implement anomaly prediction
- [ ] Add baseline establishment
- [ ] Implement z-score detection
- [ ] Add anomaly explanation
- [ ] Test detection accuracy

### Phase 4: Time-Travel Debugging (Week 9-11)

**Week 9: Rollback/Replay**
- [ ] Implement rollback mechanism
- [ ] Add replay with modifications
- [ ] Implement execution restoration
- [ ] Add dependency management
- [ ] Test rollback scenarios

**Week 10: Inspection Tools**
- [ ] Implement execution inspector
- [ ] Add execution comparison
- [ ] Implement diff visualization
- [ ] Add causal context display
- [ ] Test inspection UX

**Week 11: What-If Analysis**
- [ ] Implement what-if analyzer
- [ ] Add scenario specification
- [ ] Implement branch creation
- [ ] Add impact measurement
- [ ] Test what-if scenarios

### Phase 5: Temporal Logic (Week 12-13)

**Week 12: Logic Constraints**
- [ ] Implement temporal constraint types
- [ ] Add constraint specification DSL
- [ ] Implement constraint verification
- [ ] Add violation detection
- [ ] Test constraint enforcement

**Week 13: Advanced Logic**
- [ ] Implement LTL operators
- [ ] Add temporal queries
- [ ] Implement constraint optimization
- [ ] Add constraint recommendations
- [ ] Test complex constraints

### Phase 6: Visualization (Week 14-15)

**Week 14: Timeline Rendering**
- [ ] Implement SVG timeline renderer
- [ ] Add interactive HTML timeline
- [ ] Implement prediction visualization
- [ ] Add causal edge rendering
- [ ] Test timeline interactions

**Week 15: Graph Visualization**
- [ ] Implement causal graph renderer
- [ ] Add force-directed layout
- [ ] Implement node/edge styling
- [ ] Add interactive exploration
- [ ] Test graph rendering

### Phase 7: Integration & Testing (Week 16-18)

**Week 16: Spreadsheet Integration**
- [ ] Integrate with cell operations
- [ ] Add temporal UI components
- [ ] Implement timeline panel
- [ ] Add causal graph panel
- [ ] Test integration

**Week 17: Performance Optimization**
- [ ] Optimize checkpoint compression
- [ ] Add lazy loading for history
- [ ] Implement prediction caching
- [ ] Optimize causal discovery
- [ ] Benchmark performance

**Week 18: End-to-End Testing**
- [ ] Test complete temporal workflows
- [ ] Add integration tests
- [ ] Perform user acceptance testing
- [ ] Document temporal features
- [ ] Prepare for launch

---

## Success Metrics

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Checkpoint Size** | <100KB | Compressed checkpoint size |
| **Rollback Time** | <100ms | Time to restore checkpoint |
| **Prediction Accuracy** | >85% | MAPE on test set |
| **Causal Discovery F1** | >0.80 | Precision/recall of edges |
| **Anomaly Detection** | >90% recall | Catch actual anomalies |
| **Temporal Logic** | <10ms | Verification time |
| **Timeline Render** | <500ms | Full timeline rendering |

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Debugging Time** | -70% | Time to find bugs |
| **Prediction Usage** | >40% users | Users using predictions |
| **Causal Insights** | >5 per week | Actionable insights discovered |
| **What-If Scenarios** | >10 per day | Scenarios explored |
| **User Satisfaction** | >4.5/5 | Satisfaction with temporal features |

---

## Conclusion

Box Temporal Dynamics enables POLLN to:

1. **Remember the Past** - Complete execution history with state tracking
2. **Predict the Future** - Accurate predictions of box behavior
3. **Understand Causality** - Identify cause-effect relationships between boxes
4. **Travel Through Time** - Rollback and replay any execution
5. **Explore What-Ifs** - Counterfactual reasoning and scenario analysis
6. **Enforce Constraints** - Temporal logic verification for safety and correctness

**Key Benefits:**

- **Debugging**: 70% faster bug finding with time-travel
- **Planning**: Predictive capabilities enable proactive optimization
- **Understanding**: Causal graphs reveal system dependencies
- **Reliability**: Temporal constraints prevent errors
- **Innovation**: What-if analysis enables exploration

**Next Steps:**

1. Implement core temporal tracking
2. Add causal inference capabilities
3. Build predictive models
4. Develop time-travel debugging
5. Create visualization tools
6. Integrate with spreadsheet UI
7. Deploy with monitoring

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: Design Complete - Ready for Implementation
**Next Phase**: Phase 1: Foundation (Week 1-2)

---

## Appendix: Temporal Patterns and Anti-Patterns

### Patterns

#### 1. Checkpoint Pattern
```typescript
// Create checkpoint before critical operations
const checkpoint = await temporalDebugger.createCheckpoint(executionId);
try {
  await executeCriticalOperation();
} catch (error) {
  await temporalDebugger.restoreCheckpoint(checkpoint.id);
}
```

#### 2. Predictive Caching Pattern
```typescript
// Pre-execute boxes predicted to be needed
const predictions = await predictFutureNeeds(currentContext);
for (const prediction of predictions) {
  if (prediction.confidence > 0.9) {
    await executeBox(prediction.boxId); // Cache result
  }
}
```

#### 3. Causal Isolation Pattern
```typescript
// Test box in isolation to measure pure effect
const isolated = await interventionTester.ablation(boxId, context);
// Compare with full system to understand dependencies
```

#### 4. Temporal Constraint Pattern
```typescript
// Specify safety constraints
temporalLogic.addConstraint({
  id: 'safety-1',
  type: TemporalConstraintType.ALWAYS,
  description: 'Confidence must never drop below 0.7',
  expression: {
    operator: TemporalConstraintType.ALWAYS,
    condition: { type: 'quality', property: 'confidence', operator: '>=', value: 0.7 }
  },
  metadata: { created: Date.now(), priority: 'critical', category: 'safety' }
});
```

### Anti-Patterns

#### 1. Over-Checkpointing
```typescript
// BAD: Checkpointing every execution (expensive)
await temporalDebugger.createCheckpoint(executionId);

// GOOD: Checkpoint only at critical points
if (isCriticalOperation) {
  await temporalDebugger.createCheckpoint(executionId);
}
```

#### 2. Ignoring Causal Confounders
```typescript
// BAD: Assuming causation from correlation
if (correlation(A, B) > 0.8) {
  console.log('A causes B');
}

// GOOD: Test for confounders
const confounders = await causalInference.findConfounders(A, B, data);
if (confounders.length === 0 && correlation(A, B) > 0.8) {
  console.log('A likely causes B');
}
```

#### 3. Overfitting Predictions
```typescript
// BAD: Training on too little data
const model = await trainModel(history.slice(0, 10)); // Only 10 samples

// GOOD: Ensure sufficient training data
if (history.length < 100) {
  throw new Error('Insufficient training data');
}
const model = await trainModel(history);
```

#### 4. Ignoring Temporal Constraints
```typescript
// BAD: Not verifying constraints
await executeBox(boxId, input);

// GOOD: Verify constraints before and after
const before = await temporalLogic.verifyConstraints(state);
await executeBox(boxId, input);
const after = await temporalLogic.verifyConstraints(newState);
if (!after.satisfied) {
  await rollback();
}
```

---

*End of Document*

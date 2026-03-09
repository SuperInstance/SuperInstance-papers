# CELL_ONTOLOGY.md - The Living Cell Paradigm

**The Foundational Specification for the LOG System**

---

## Executive Summary

The LOG system is built on a revolutionary concept: **every cell is a living entity** with:
- A **HEAD** (input/reception)
- A **BODY** (processing/reasoning)
- A **TAIL** (output/action)
- An **ORIGIN** (self-reference point)
- **SENSATION** (awareness of other cells)

This document specifies the complete ontology of cells and provides the foundation for all implementation.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Cell Anatomy](#cell-anatomy)
3. [Sensation System](#sensation-system)
4. [Origin-Centered Design](#origin-centered-design)
5. [Cell Types](#cell-types)
6. [Cell Lifecycle](#cell-lifecycle)
7. [Communication Protocols](#communication-protocols)
8. [TypeScript Interfaces](#typescript-interfaces)
9. [Implementation Priority](#implementation-priority)

---

## Philosophy

### The Core Insight

Traditional spreadsheet cells are passive containers. LOG cells are **active entities**.

```
Traditional Cell:  [VALUE]  (passive, static)
LOG Cell:          [HEAD → BODY → TAIL]  (active, living)
```

### Why Living Cells?

1. **Inspectability**: Every cell can explain itself
2. **Adaptability**: Cells learn from feedback
3. **Coordination**: Cells sense and respond to neighbors
4. **Resilience**: Cells can self-heal and recover
5. **Intelligence**: Cells can reason about their own behavior

### The Geocentered Principle

Every cell sees itself as the **origin** of its own coordinate system:
- "My head receives X"
- "My body processes Y"
- "My tail outputs Z"
- "I sense changes in cell B"

This is **Logos-Organization-Geocentered**: each cell is a center of reasoning.

---

## Cell Anatomy

### The Three-Part Structure

```
┌────────────────────────────────────────────────────────────────┐
│                         CELL                                   │
│                                                                │
│  ┌──────────┐    ┌──────────────────┐    ┌──────────┐        │
│  │   HEAD   │───►│      BODY        │───►│   TAIL   │        │
│  │          │    │                  │    │          │        │
│  │ Reception│    │ Transformation   │    │ Emission │        │
│  │ Sensing  │    │ Reasoning        │    │ Action   │        │
│  │ Input    │    │ Memory           │    │ Output   │        │
│  └──────────┘    └──────────────────┘    └──────────┘        │
│       │                  │                     │               │
│       ▼                  ▼                     ▼               │
│   [sensations]      [trace/log]          [effects]            │
│                                                                │
│                     ┌──────────────┐                          │
│                     │    ORIGIN    │                          │
│                     │ Self-Reference│                          │
│                     │ Identity     │                          │
│                     └──────────────┘                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### HEAD (Reception)

The head is the cell's **sensory organ**:

```typescript
interface CellHead {
  // What the cell receives
  inputs: InputChannel[];

  // What the cell senses from other cells
  sensations: Sensation[];

  // Pattern matching on inputs
  recognizers: PatternRecognizer[];

  // Input validation
  validators: Validator[];
}
```

**Key Responsibilities**:
- Receive data from spreadsheet or other cells
- Sense changes in watched cells
- Recognize patterns in inputs
- Validate incoming data

### BODY (Processing)

The body is the cell's **brain**:

```typescript
interface CellBody {
  // Current processing logic
  logic: ProcessingLogic;

  // Memory of past executions
  memory: ExecutionMemory;

  // Reasoning trace (inspectable)
  trace: ReasoningTrace;

  // Self-model (how cell sees itself)
  selfModel: CellSelfModel;
}
```

**Key Responsibilities**:
- Transform inputs to outputs
- Maintain execution history
- Generate inspectable reasoning trace
- Learn from feedback

### TAIL (Emission)

The tail is the cell's **effector**:

```typescript
interface CellTail {
  // What the cell outputs
  outputs: OutputChannel[];

  // Effects on other cells
  effects: Effect[];

  // Actions to take
  actions: Action[];

  // Notification subscribers
  subscribers: CellReference[];
}
```

**Key Responsibilities**:
- Emit processed values
- Trigger effects on other cells
- Execute actions (API calls, etc.)
- Notify watching cells

### ORIGIN (Identity)

The origin is the cell's **self-reference point**:

```typescript
interface CellOrigin {
  // Unique cell identity
  id: CellId;

  // Position in spreadsheet
  position: CellPosition;

  // Self-awareness level
  selfAwareness: SelfAwarenessLevel;

  // Cells being watched
  watchedCells: WatchedCell[];
}
```

**Key Responsibilities**:
- Maintain cell identity
- Track position in graph
- Enable self-referential reasoning
- Coordinate sensation targets

---

## Sensation System

### Sensation Types

A cell can **sense** six types of changes in other cells:

```typescript
enum SensationType {
  // State difference: new_value - old_value
  ABSOLUTE_CHANGE = 'absolute',

  // First derivative: rate of change
  RATE_OF_CHANGE = 'velocity',

  // Second derivative: acceleration/trend
  ACCELERATION = 'trend',

  // Cell exists and is active
  PRESENCE = 'existence',

  // Pattern recognized in cell's output
  PATTERN = 'recognition',

  // Deviation from expected behavior
  ANOMALY = 'outlier',
}
```

### Sensation Mechanics

```
Cell A watches Cell B:

┌─────────────┐                    ┌─────────────┐
│   Cell A    │                    │   Cell B    │
│             │                    │             │
│  ORIGIN ────┼──── sensation ────►│  TAIL       │
│             │    stream          │  output     │
│  HEAD ◄─────┼────────────────────│             │
│  receives   │                    │             │
│  sensation  │                    │             │
└─────────────┘                    └─────────────┘

Sensation Stream:
{
  source: CellB,
  type: RATE_OF_CHANGE,
  value: +15%,           // B is increasing at 15%/period
  timestamp: T,
  confidence: 0.92
}
```

### Sensation Configuration

```typescript
interface SensationConfig {
  // Which cell to watch
  targetCell: CellReference;

  // What type of change to sense
  sensationType: SensationType;

  // Sensitivity threshold
  threshold: number;

  // How often to sample
  sampleRate: Duration;

  // Callback when sensation triggers
  onSensation: (sensation: Sensation) => void;
}
```

### Sensation Examples

**Example 1: Rate of Change Sensing**
```typescript
// Cell A senses that Cell B is changing rapidly
const sensation: Sensation = {
  source: { row: 2, col: 1 },  // Cell B at A2
  type: SensationType.RATE_OF_CHANGE,
  value: 0.15,  // 15% increase per period
  previousValue: 100,
  currentValue: 115,
  timestamp: Date.now(),
  confidence: 0.95,
};
```

**Example 2: Anomaly Sensing**
```typescript
// Cell A senses that Cell B is behaving anomalously
const sensation: Sensation = {
  source: { row: 3, col: 1 },  // Cell C at A3
  type: SensationType.ANOMALY,
  value: 3.5,  // 3.5 standard deviations from mean
  expectedValue: 50,
  actualValue: 150,
  timestamp: Date.now(),
  confidence: 0.99,
};
```

---

## Origin-Centered Design

### The Geocentered Principle

Each cell is the center of its own universe:

```
Cell A's Perspective:
- I am at origin (0, 0)
- Cell B is at relative position (+1, 0)
- Cell C is at relative position (0, +1)
- I sense changes in B and C

Cell B's Perspective:
- I am at origin (0, 0)
- Cell A is at relative position (-1, 0)
- Cell C is at relative position (-1, +1)
- I sense changes in A only
```

### Coordinate Transformation

```typescript
class OriginCenteredCoordinates {
  // Cell's absolute position in spreadsheet
  private absolutePosition: CellPosition;

  // Transform another cell's position to relative coordinates
  toRelative(other: CellPosition): RelativePosition {
    return {
      dRow: other.row - this.absolutePosition.row,
      dCol: other.col - this.absolutePosition.col,
    };
  }

  // Transform relative coordinates back to absolute
  toAbsolute(relative: RelativePosition): CellPosition {
    return {
      row: this.absolutePosition.row + relative.dRow,
      col: this.absolutePosition.col + relative.dCol,
    };
  }
}
```

### Self-Reference

Cells can reason about themselves:

```typescript
interface SelfReference {
  // "What am I?"
  identity: CellIdentity;

  // "What have I done?"
  history: ExecutionHistory;

  // "What do I know?"
  knowledge: LearnedPatterns;

  // "What should I do?"
  intentions: PlannedActions;
}
```

---

## Cell Types

### Logic Levels

Cells operate at different levels of intelligence:

```typescript
enum LogicLevel {
  // Pure computation, no learning
  L0_LOGIC = 0,

  // Pattern matching, cached responses
  L1_PATTERN = 1,

  // Distilled agent, learned behavior
  L2_AGENT = 2,

  // Full LLM reasoning
  L3_LLM = 3,
}
```

### Cell Type Taxonomy

```
LOG Cell Types
├── Data Cells
│   ├── InputCell      (receives user data)
│   ├── OutputCell     (produces final results)
│   └── StorageCell    (holds intermediate values)
│
├── Processing Cells
│   ├── TransformCell  (data transformation)
│   ├── FilterCell     (filtering/selection)
│   ├── AggregateCell  (aggregation/summarization)
│   └── ValidateCell   (validation/checking)
│
├── Reasoning Cells
│   ├── AnalysisCell   (analysis/inference)
│   ├── PredictionCell (forecasting/prediction)
│   ├── DecisionCell   (decision making)
│   └── ExplainCell    (explanation generation)
│
└── Action Cells
    ├── NotifyCell     (notifications/alerts)
    ├── TriggerCell    (triggers external actions)
    ├── ScheduleCell   (scheduling/timing)
    └── CoordinateCell (multi-cell coordination)
```

### Cell Type Specifications

**InputCell**
```typescript
interface InputCell extends LogCell {
  type: 'input';
  head: {
    sources: ['user', 'external', 'formula'];
    validation: ValidationRules;
  };
  body: {
    logic: LogicLevel.L0_LOGIC;
    transformation: IdentityTransform;
  };
  tail: {
    outputs: ['downstream'];
    broadcast: true;
  };
}
```

**AnalysisCell**
```typescript
interface AnalysisCell extends LogCell {
  type: 'analysis';
  head: {
    sources: ['upstream', 'watched'];
    sensations: [SensationType.RATE_OF_CHANGE, SensationType.ANOMALY];
  };
  body: {
    logic: LogicLevel.L2_AGENT | LogicLevel.L3_LLM;
    reasoning: AnalysisReasoning;
    memory: ExecutionMemory;
  };
  tail: {
    outputs: ['analysis_result', 'confidence', 'explanation'];
    effects: ['notify_on_anomaly'];
  };
}
```

---

## Cell Lifecycle

### States

```typescript
enum CellState {
  DORMANT = 'dormant',      // Created but not active
  SENSING = 'sensing',      // Receiving inputs, watching cells
  PROCESSING = 'processing', // Body is reasoning
  EMITTING = 'emitting',    // Tail is outputting
  LEARNING = 'learning',    // Updating from feedback
  ERROR = 'error',          // Error state
  DORMANT_AGAIN = 'dormant', // Returned to rest
}
```

### Lifecycle Diagram

```
         ┌─────────────────────────────────────────┐
         │                                         │
         ▼                                         │
    ┌─────────┐                               ┌────┴─────┐
    │ DORMANT │                               │ SENSING  │
    └────┬────┘                               └────┬─────┘
         │ activate                                 │ input received
         │                                          │
         └──────────────────────►┌──────────────────┘
                                 │
                            ┌────┴─────┐
                            │PROCESSING│
                            └────┬─────┘
                                 │ processing complete
                                 │
                            ┌────┴─────┐
                            │ EMITTING │
                            └────┬─────┘
                                 │ output complete
                                 │
                            ┌────┴─────┐
                            │ LEARNING │◄──── feedback received
                            └────┬─────┘
                                 │ learning complete
                                 │
                            ┌────┴─────┐
                            │ DORMANT  │
                            └──────────┘
                                 │ error
                                 ▼
                            ┌──────────┐
                            │  ERROR   │
                            └──────────┘
```

---

## Communication Protocols

### Cell-to-Cell Communication

```
Direct Connection (Flow):
┌────────┐     output      ┌────────┐
│ Cell A │────────────────►│ Cell B │
└────────┘                  └────────┘

Sensation (Monitoring):
┌────────┐   sensation    ┌────────┐
│ Cell A │◄───────────────│ Cell B │
└────────┘  (watches)     └────────┘

Broadcast (Notification):
┌────────┐    notify     ┌────────┐
│ Cell A │──────────────►│ Cell B │
└────────┘                └────────┘
     │
     │    notify     ┌────────┐
     └──────────────►│ Cell C │
                     └────────┘
```

### Message Types

```typescript
// Direct output
interface OutputMessage {
  type: 'output';
  source: CellReference;
  target: CellReference;
  value: any;
  timestamp: number;
}

// Sensation notification
interface SensationMessage {
  type: 'sensation';
  source: CellReference;  // Cell being watched
  target: CellReference;  // Cell that's watching
  sensation: Sensation;
}

// Feedback for learning
interface FeedbackMessage {
  type: 'feedback';
  source: CellReference;  // Who gave feedback (could be user)
  target: CellReference;  // Cell receiving feedback
  feedback: Feedback;
}

// Coordination request
interface CoordinationMessage {
  type: 'coordination';
  coordinator: CellReference;
  participants: CellReference[];
  request: CoordinationRequest;
}
```

---

## TypeScript Interfaces

### Core Cell Interface

```typescript
interface LogCell {
  // Identity
  id: CellId;
  type: CellType;
  position: CellPosition;
  state: CellState;
  logicLevel: LogicLevel;

  // Anatomy
  head: CellHead;
  body: CellBody;
  tail: CellTail;
  origin: CellOrigin;

  // Lifecycle methods
  activate(): Promise<void>;
  process(input: any): Promise<CellOutput>;
  learn(feedback: Feedback): Promise<void>;
  deactivate(): Promise<void>;

  // Inspection methods
  inspect(): CellInspection;
  getTrace(): ReasoningTrace;
  getHistory(): ExecutionHistory;
}

interface CellOutput {
  value: any;
  confidence: number;
  explanation: string;
  trace: ReasoningTrace;
  effects: Effect[];
}

interface CellInspection {
  // What the cell sees
  inputs: any[];
  sensations: Sensation[];

  // What the cell thinks
  reasoning: ReasoningStep[];
  memory: ExecutionMemory;

  // What the cell outputs
  outputs: any[];
  effects: Effect[];

  // Cell's self-model
  selfModel: CellSelfModel;
}
```

### Sensation Interfaces

```typescript
interface Sensation {
  source: CellReference;
  type: SensationType;
  value: number;
  previousValue?: number;
  currentValue?: number;
  expectedValue?: number;
  timestamp: number;
  confidence: number;
}

interface WatchedCell {
  reference: CellReference;
  sensationTypes: SensationType[];
  threshold: number;
  lastSensation?: Sensation;
}
```

### Reasoning Trace

```typescript
interface ReasoningTrace {
  steps: ReasoningStep[];
  dependencies: Dependency[];
  confidence: number;
  totalTime: number;
}

interface ReasoningStep {
  id: string;
  type: ReasoningStepType;
  description: string;
  input: any;
  output: any;
  confidence: number;
  duration: number;
  dependencies: string[];  // IDs of previous steps
}

enum ReasoningStepType {
  OBSERVATION = 'observation',
  ANALYSIS = 'analysis',
  INFERENCE = 'inference',
  PREDICTION = 'prediction',
  DECISION = 'decision',
  ACTION = 'action',
  VALIDATION = 'validation',
  EXPLANATION = 'explanation',
}
```

---

## Implementation Priority

### Phase 1: Core Cell Types (Weeks 1-4)

**Priority Order**:
1. `LogCell` base class with head/body/tail
2. `CellOrigin` and origin-centered coordinates
3. `Sensation` system for cell watching
4. `InputCell` and `OutputCell` (simplest types)
5. `TransformCell` (basic processing)

### Phase 2: Reasoning Cells (Weeks 5-8)

**Priority Order**:
1. `AnalysisCell` with L2/L3 logic
2. `ReasoningTrace` generation
3. `PredictionCell` with time series
4. `DecisionCell` with Plinko integration
5. `ExplainCell` for explanations

### Phase 3: Advanced Features (Weeks 9-12)

**Priority Order**:
1. Full sensation system (all 6 types)
2. Cell-to-cell coordination
3. Learning from feedback
4. Self-model and introspection
5. Error recovery and healing

---

## Why This Ontology?

### Design Rationale

**Why Head/Body/Tail?**
- Mirrors biological neurons (dendrite → soma → axon)
- Clear separation of concerns
- Natural data flow model
- Easy to inspect each stage

**Why Origin-Centered?**
- Each cell is self-contained
- No global coordinate system needed
- Scales to millions of cells
- Natural for distributed systems

**Why Sensation System?**
- Cells can react to neighbors without direct connection
- Enables emergent behavior
- Supports monitoring and alerting
- Fundamental to "living cell" concept

**Why Inspectability First?**
- User trust requires transparency
- Debugging requires visibility
- Learning requires feedback
- Compliance requires audit trails

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: ✅ Complete - Foundational Specification
**Dependencies**: None (this is the foundation)
**Dependents**: All other planning documents

---

*The cell is not a container. The cell is a being.*

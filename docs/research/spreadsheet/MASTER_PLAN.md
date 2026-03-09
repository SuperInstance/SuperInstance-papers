# MASTER_PLAN.md - Exhaustive Implementation Strategy

**The Complete Blueprint for Building the LOG System**

---

## Executive Summary

This document provides the complete implementation strategy for the LOG System (Spreadsheet LOG Tool). It is designed to be read by glm-4.7 implementation agents who will execute the actual coding.

**Key Principle**: Functional before smart. Get living cells working first, then add intelligence.
{ completion_time: 12 weeks (84 days)
{ total agents: 45 agents across 9 waves }

---

## Table of Contents

1. [Implementation Philosophy](#implementation-philosophy)
2. [Architecture Overview](#architecture-overview)
3. [Wave 1: Foundation](#wave-1-foundation)
4. [Wave 2: Cell Types](#wave-2-cell-types)
5. [Wave 3: Reasoning & Intelligence](#wave-3-reasoning-intelligence)
6. [Wave 4: Platform Integration](#wave-4-platform-integration)
7. [Wave 5: Polish & Launch](#wave-5-polish-launch)
8. [Agent Assignments](#agent-assignments)
9. [Dependencies Map](#dependencies-map)
10. [Success Criteria](#success-criteria)
11. [Risk Mitigation](#risk-mitigation)

---

## Implementation Philosophy

### Core Principles

**1. Functional Before Smart**
- Build the cell that can store data before building the cell that can reason
- A cell that displays "hello" is more valuable than a cell that fails to run

**2. Inspectability First**
- Every line of code should enable inspection
- If you can't see it, it you can't trust it
- Debug through inspection, not console logs

**3. Origin-Centered Design**
- Each cell is self-contained
- No global state except what's absolutely necessary
- Cells coordinate through messages, not shared state

**4. Incremental Complexity**
- Start with L0 (pure logic)
- Add L1 (patterns) only when L0 isn't enough
- Add L2 (agents) only when L1 isn't enough
- Add L3 (LLM) only when L2 isn't enough

**5. Test Everything**
- 90%+ coverage for all new code
- Integration tests for all cell types
- E2E tests in Wave 4

### What NOT To Do

1. **Don't over-engineer** - Solve today's problem today
2. **Don't skip tests** - Tests are part of implementation
3. **Don't use global state** - Cells are self-contained
4. **Don't optimize prematurely** - Get it working first
5. **Don't hide complexity** - Make reasoning visible

---

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SPREADSHEET LOG TOOL                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 5: UI Layer (Wave 5)                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                           │
│  │ Side Panel  │ │ Template   │ │ Settings  │                           │
│  └─────────────┘ └─────────────┘ └─────────────┘                           │
│                                                                      │
│  Layer 4: Platform Layer (Wave 4)                                  │
│  ┌─────────────┐ ┌─────────────┐                                       │
│  │ Excel Add-in │ │ Google Sheet │                                       │
│  └─────────────┘ └─────────────┘                                       │
│                                                                      │
│  Layer 3: Intelligence Layer (Wave 3)                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                           │
│  │ Reasoning   │ │ Learning   │ │ Coordination│                           │
│  └─────────────┘ └─────────────┘ └─────────────┘                           │
│                                                                      │
│  Layer 2: Cell Types Layer (Wave 2)                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                           │
│  │ InputCell   │ │ TransformCell│ │ OutputCell │                           │
│  └─────────────┘ └─────────────┘ └─────────────┘                           │
│                                                                      │
│  Layer 1: Foundation Layer (Wave 1)                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                           │
│  │ LogCell     │ │ Sensation   │ │ Origin     │                           │
│  └─────────────┘ └─────────────┘ └─────────────┘                           │
│                                                                      │
│  Layer 0: Core POLLN (Already Complete)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                           │
│  │ Agents     │ │ Colony    │ │ Decision  │                           │
│  └─────────────┘ └─────────────┘ └─────────────┘                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── spreadsheet/                    # NEW: Spreadsheet integration
│   ├── core/                       # Wave 1: Foundation
│   │   ├── LogCell.ts             # Base cell class
│   │   ├── CellHead.ts            # Input reception
│   │   ├── CellBody.ts            # Processing
│   │   ├── CellTail.ts            # Output
│   │   ├── CellOrigin.ts          # Self-reference
│   │   ├── Sensation.ts           # Cell watching
│   │   └── Coordinates.ts         # Origin-centered
│   │
│   ├── cells/                      # Wave 2: Cell Types
│   │   ├── InputCell.ts           # Data input
│   │   ├── OutputCell.ts          # Data output
│   │   ├── TransformCell.ts       # Data transformation
│   │   ├── FilterCell.ts          # Filtering
│   │   ├── AggregateCell.ts       # Aggregation
│   │   ├── ValidateCell.ts        # Validation
│   │   ├── AnalysisCell.ts        # Analysis (L2/L3)
│   │   ├── PredictionCell.ts      # Prediction
│   │   ├── DecisionCell.ts        # Decision making
│   │   └── ExplainCell.ts         # Explanation
│   │
│   ├── reasoning/                  # Wave 3: Intelligence
│   │   ├── ReasoningTrace.ts      # Step-by-step reasoning
│   │   ├── LogicLevels.ts          # L0-L3 dispatch
│   │   ├── LearningEngine.ts       # Feedback learning
│   │   ├── CoordinationEngine.ts   # Multi-cell coordination
│   │   └── DistillationEngine.ts   # L3→L2 conversion
│   │
│   ├── platform/                    # Wave 4: Integration
│   │   ├── excel/
│   │   │   ├── ExcelAdapter.ts    # Office.js wrapper
│   │   │   ├── CustomFunctions.ts  # =AGENT() etc.
│   │   │   └── TaskPane.ts         # Side panel
│   │   └── googlesheets/
│   │       ├── SheetsAdapter.ts   # Apps Script wrapper
│   │       └── Sidebar.ts          # UI
│   │
│   └── ui/                        # Wave 5: Polish
│       ├── components/           # React components
│       │   ├── Inspector.tsx     # Cell inspector
│       │   ├── TraceViewer.tsx   # Reasoning trace
│       │   ├── SensationMonitor.tsx # Watching display
│       │   └── TemplateGallery.tsx # Template picker
│       └── styles/                # CSS
│
├── core/                        # EXISTING: Core POLLN (no changes needed)
│   ├── agent.ts
│   ├── colony.ts
│   └── ... (other existing modules)
```

---

## Wave 1: Foundation (Days 1-14)

**Goal**: Build the fundamental cell structure

### Day 1-3: LogCell Base Class

**Agent**: foundation-agent-1

**File**: `src/spreadsheet/core/LogCell.ts`

```typescript
/**
 * LogCell - The base class for all LOG cells
 *
 * Every cell in the LOG system inherits from LogCell.
 * A LogCell has a HEAD (input), BODY (processing), TAIL (output),
 * and an ORIGIN (self-reference).
 */
export abstract class LogCell {
  // Identity
  readonly id: CellId;
  readonly type: CellType;
  readonly position: CellPosition;

  // Anatomy
  protected head: CellHead;
  protected body: CellBody;
  protected tail: CellTail;
  readonly origin: CellOrigin;

  // State
  protected state: CellState = CellState.DORMANT;
  protected logicLevel: LogicLevel;

  constructor(config: LogCellConfig) {
    this.id = config.id;
    this.type = config.type;
    this.position = config.position;
    this.logicLevel = config.logicLevel ?? LogicLevel.L0_LOGIC;

    // Initialize anatomy
    this.head = this.createHead(config.head);
    this.body = this.createBody(config.body);
    this.tail = this.createTail(config.tail);
    this.origin = new CellOrigin(this.position);
  }

  // Lifecycle
  abstract activate(): Promise<void>;
  abstract process(input: any): Promise<CellOutput>;
  abstract learn(feedback: Feedback): Promise<void>;
  abstract deactivate(): Promise<void>;

  // Inspection
  inspect(): CellInspection {
    return {
      inputs: this.head.getInputs(),
      sensations: this.head.getSensations(),
      reasoning: this.body.getReasoning(),
      outputs: this.tail.getOutputs(),
      selfModel: this.origin.getSelfModel(),
    };
  }

  // Factory methods (override in subclasses)
  protected createHead(config: any): CellHead {
    return new CellHead(config);
  }

  protected createBody(config: any): CellBody {
    return new CellBody(config);
  }

  protected createTail(config: any): CellTail {
    return new CellTail(config);
  }
}
```

**Tests Required**:
- Constructor initializes all anatomy
- activate() changes state
- process() returns CellOutput
- inspect() returns valid inspection

---

### Day 4-6: CellHead and Sensation

**Agent**: foundation-agent-2

**File**: `src/spreadsheet/core/CellHead.ts`

```typescript
/**
 * CellHead - The sensory organ of a LOG cell
 *
 * Handles input reception and sensation (watching other cells).
 */
export class CellHead {
  private inputs: Map<string, InputChannel> = new Map();
  private sensations: Sensation[] = [];
  private watchedCells: Map<CellId, WatchedCell> = new Map();

  constructor(config: CellHeadConfig) {
    // Initialize input channels
    if (config.inputs) {
      config.inputs.forEach(input => {
        this.inputs.set(input.name, new InputChannel(input));
      });
    }
  }

  // Input management
  addInput(channel: InputChannel): void {
    this.inputs.set(channel.name, channel);
  }

  getInput(name: string): any {
    return this.inputs.get(name)?.value;
  }

  getInputs(): any[] {
    return Array.from(this.inputs.values()).map(ch => ch.value);
  }

  // Sensation management
  watch(cellId: CellId, types: SensationType[], threshold = 0): void {
    this.watchedCells.set(cellId, {
      cellId,
      types,
      threshold,
      lastSensation: null,
    });
  }

  unwatch(cellId: CellId): void {
    this.watchedCells.delete(cellId);
  }

  receiveSensation(sensation: Sensation): void {
    // Check if we're watching this cell
    const watched = this.watchedCells.get(sensation.source);
    if (!watched) return;

    // Check if we care about this sensation type
    if (!watched.types.includes(sensation.type)) return;

    // Check threshold
    if (Math.abs(sensation.value) < watched.threshold) return;

    // Store sensation
    this.sensations.push(sensation);
    watched.lastSensation = sensation;
  }

  getSensations(): Sensation[] {
    return [...this.sensations];
  }

  clearSensations(): void {
    this.sensations = [];
  }
}
```

**Tests Required**:
- Input channels work correctly
- Watch/unwatch cells
- Sensation filtering by type and threshold

---

### Day 7-9: CellBody and Processing

**Agent**: foundation-agent-3

**File**: `src/spreadsheet/core/CellBody.ts`

```typescript
/**
 * CellBody - The brain of a LOG cell
 *
 * Handles processing, reasoning, and memory.
 */
export class CellBody {
  private logic: ProcessingLogic;
  private memory: ExecutionMemory;
  private trace: ReasoningTrace;

  constructor(config: CellBodyConfig) {
    this.logic = config.logic ?? new IdentityLogic();
    this.memory = new ExecutionMemory(config.memoryLimit ?? 100);
    this.trace = new ReasoningTrace();
  }

  // Processing
  async process(input: any, context: CellContext): Promise<any> {
    // Start trace
    const stepId = this.trace.startStep('process', input);

    try {
      // Execute logic
      const output = await this.logic.execute(input, context, this.memory);

      // Record in memory
      this.memory.record(input, output);

      // Complete trace
      this.trace.completeStep(stepId, output);

      return output;
    } catch (error) {
      this.trace.failStep(stepId, error);
      throw error;
    }
  }

  // Reasoning access
  getReasoning(): ReasoningStep[] {
    return this.trace.getSteps();
  }

  getTrace(): ReasoningTrace {
    return this.trace;
  }

  // Memory access
  getMemory(): ExecutionMemory {
    return this.memory;
  }

  // Learning
  learn(feedback: Feedback): void {
    // Update logic based on feedback
    this.logic.adapt(feedback);

    // Record learning event
    this.memory.recordFeedback(feedback);
  }
}
```

**Tests Required**:
- Processing with trace generation
- Memory recording and retrieval
- Learning from feedback

---

### Day 10-12: CellTail and Output

**Agent**: foundation-agent-4

**File**: `src/spreadsheet/core/CellTail.ts`

```typescript
/**
 * CellTail - The effector of a LOG cell
 *
 * Handles output, effects, and notifications.
 */
export class CellTail {
  private outputs: Map<string, OutputChannel> = new Map();
  private effects: Effect[] = [];
  private subscribers: Set<CellId> = new Set();

  constructor(config: CellTailConfig) {
    if (config.outputs) {
      config.outputs.forEach(output => {
        this.outputs.set(output.name, new OutputChannel(output));
      });
    }
  }

  // Output management
  setOutput(name: string, value: any): void {
    const channel = this.outputs.get(name);
    if (channel) {
      channel.value = value;
      channel.updated = Date.now();
      this.notifySubscribers(name, value);
    }
  }

  getOutput(name: string): any {
    return this.outputs.get(name)?.value;
  }

  getOutputs(): any[] {
    return Array.from(this.outputs.values()).map(ch => ch.value);
  }

  // Effect management
  addEffect(effect: Effect): void {
    this.effects.push(effect);
  }

  async executeEffects(): Promise<void> {
    for (const effect of this.effects) {
      await effect.execute();
    }
    this.effects = [];
  }

  // Subscriber management
  subscribe(cellId: CellId): void {
    this.subscribers.add(cellId);
  }

  unsubscribe(cellId: CellId): void {
    this.subscribers.delete(cellId);
  }

  private notifySubscribers(outputName: string, value: any): void {
    // Notify will be handled by the cell coordination system
    // This just tracks who needs notification
  }
}
```

**Tests Required**:
- Output setting and getting
- Effect execution
- Subscriber management

---

### Day 13-14: CellOrigin and Coordinates

**Agent**: foundation-agent-5

**File**: `src/spreadsheet/core/CellOrigin.ts`

```typescript
/**
 * CellOrigin - The self-reference point of a LOG cell
 *
 * Enables origin-centered coordinates and self-model.
 */
export class CellOrigin {
  private absolutePosition: CellPosition;
  private watchedCells: WatchedCell[] = [];
  private selfModel: CellSelfModel;

  constructor(position: CellPosition) {
    this.absolutePosition = position;
    this.selfModel = {
      id: generateId(),
      position: position,
      capabilities: [],
      awareness: 'self',
    };
  }

  // Coordinate transformation
  toRelative(other: CellPosition): RelativePosition {
    return {
      dRow: other.row - this.absolutePosition.row,
      dCol: other.col - this.absolutePosition.col,
    };
  }

  toAbsolute(relative: RelativePosition): CellPosition {
    return {
      row: this.absolutePosition.row + relative.dRow,
      col: this.absolutePosition.col + relative.dCol,
    };
  }

  // Distance calculations
  manhattanDistance(other: CellPosition): number {
    return Math.abs(other.row - this.absolutePosition.row) +
           Math.abs(other.col - this.absolutePosition.col);
  }

  euclideanDistance(other: CellPosition): number {
    const dRow = other.row - this.absolutePosition.row;
    const dCol = other.col - this.absolutePosition.col;
    return Math.sqrt(dRow * dRow + dCol * dCol);
  }

  // Self-model management
  updateSelfModel(update: Partial<CellSelfModel>): void {
    this.selfModel = { ...this.selfModel, ...update };
  }

  getSelfModel(): CellSelfModel {
    return { ...this.selfModel };
  }

  // Watched cells management
  addWatchedCell(cell: WatchedCell): void {
    this.watchedCells.push(cell);
  }

  removeWatchedCell(cellId: CellId): void {
    this.watchedCells = this.watchedCells.filter(c => c.cellId !== cellId);
  }

  getWatchedCells(): WatchedCell[] {
    return [...this.watchedCells];
  }
}
```

**Tests Required**:
- Coordinate transformations
- Distance calculations
- Self-model updates
- Watched cell management

---

## Wave 1 Summary

**Files Created**:
1. `src/spreadsheet/core/LogCell.ts` - Base cell class
2. `src/spreadsheet/core/CellHead.ts` - Input/sensation
3. `src/spreadsheet/core/CellBody.ts` - Processing
4. `src/spreadsheet/core/CellTail.ts` - Output
5. `src/spreadsheet/core/CellOrigin.ts` - Self-reference
6. `src/spreadsheet/core/Sensation.ts` - Sensation types
7. `src/spreadsheet/core/Coordinates.ts` - Coordinate system

**Tests Created**:
1. `src/spreadsheet/core/__tests__/LogCell.test.ts`
2. `src/spreadsheet/core/__tests__/CellHead.test.ts`
3. `src/spreadsheet/core/__tests__/CellBody.test.ts`
4. `src/spreadsheet/core/__tests__/CellTail.test.ts`
5. `src/spreadsheet/core/__tests__/CellOrigin.test.ts`

**Coverage Target**: 90%+

**Integration Points**:
- LogCell extends nothing (fresh start)
- Core POLLN agents can use LogCell instances

---

## Wave 2: Cell Types (Days 15-28)

**Goal**: Implement specific cell types

### Day 15-17: InputCell and OutputCell

**Agent**: celltypes-agent-1

**Files**:
- `src/spreadsheet/cells/InputCell.ts`
- `src/spreadsheet/cells/OutputCell.ts`

**InputCell**:
```typescript
export class InputCell extends LogCell {
  constructor(config: InputCellConfig) {
    super({
      ...config,
      type: CellType.INPUT,
      logicLevel: LogicLevel.L0_LOGIC,
    });
  }

  async activate(): Promise<void> {
    this.state = CellState.SENSING;
  }

  async process(input: any): Promise<CellOutput> {
    // Input cells just pass through
    return {
      value: input,
      confidence: 1.0,
      explanation: 'Input received',
      trace: this.body.getTrace(),
      effects: [],
    };
  }

  async learn(feedback: Feedback): Promise<void> {
    // Input cells don't learn
  }
}
```

**OutputCell**:
```typescript
export class OutputCell extends LogCell {
  constructor(config: OutputCellConfig) {
    super({
      ...config,
      type: CellType.OUTPUT,
      logicLevel: LogicLevel.L0_LOGIC,
    });
  }

  async activate(): Promise<void> {
    this.state = CellState.SENSING;
  }

  async process(input: any): Promise<CellOutput> {
    // Output cells format for display
    const formatted = this.formatForDisplay(input);
    return {
      value: formatted,
      confidence: 1.0,
      explanation: 'Output formatted',
      trace: this.body.getTrace(),
      effects: [],
    };
  }

  private formatForDisplay(value: any): string {
    // Format based on type
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  }
}
```

---

### Day 18-20: TransformCell and FilterCell

**Agent**: celltypes-agent-2

**Files**:
- `src/spreadsheet/cells/TransformCell.ts`
- `src/spreadsheet/cells/FilterCell.ts`

**TransformCell**:
```typescript
export class TransformCell extends LogCell {
  private transform: TransformFunction;

  constructor(config: TransformCellConfig) {
    super({
      ...config,
      type: CellType.TRANSFORM,
      logicLevel: LogicLevel.L0_LOGIC,
    });
    this.transform = config.transform;
  }

  async process(input: any): Promise<CellOutput> {
    const startTime = Date.now();

    try {
      const output = this.transform(input);

      return {
        value: output,
        confidence: 1.0,
        explanation: `Applied transformation`,
        trace: this.body.getTrace(),
        effects: [],
      };
    } catch (error) {
      return {
        value: null,
        confidence: 0,
        explanation: `Transform failed: ${error.message}`,
        trace: this.body.getTrace(),
        effects: [],
      };
    }
  }
}
```

---

### Day 21-23: AggregateCell and ValidateCell

**Agent**: celltypes-agent-3

---

### Day 24-26: AnalysisCell (L2/L3)

**Agent**: celltypes-agent-4

**AnalysisCell** uses L2 (distilled agent) or L3 (full LLM):

```typescript
export class AnalysisCell extends LogCell {
  private llmAdapter: LLMAdapter | null;

  constructor(config: AnalysisCellConfig) {
    super({
      ...config,
      type: CellType.ANALYSIS,
      logicLevel: config.llmAdapter ? LogicLevel.L3_LLM : LogicLevel.L2_AGENT,
    });
    this.llmAdapter = config.llmAdapter ?? null;
  }

  async process(input: any): Promise<CellOutput> {
    if (this.llmAdapter) {
      // Use full LLM
      return this.processWithLLM(input);
    } else {
      // Use distilled agent
      return this.processWithDistilledAgent(input);
    }
  }

  private async processWithLLM(input: any): Promise<CellOutput> {
    const prompt = this.buildAnalysisPrompt(input);
    const response = await this.llmAdapter.complete(prompt);

    return {
      value: response.analysis,
      confidence: response.confidence,
      explanation: response.explanation,
      trace: this.body.getTrace(),
      effects: [],
    };
  }

  private async processWithDistilledAgent(input: any): Promise<CellOutput> {
    // Use pre-trained distilled agent
    // ...
  }
}
```

---

### Day 27-28: PredictionCell and DecisionCell

**Agent**: celltypes-agent-5

---

## Wave 3: Reasoning & Intelligence (Days 29-42)

**Goal**: Add reasoning and learning capabilities

### Day 29-31: ReasoningTrace

**Agent**: reasoning-agent-1

### Day 32-34: LogicLevels (L0-L3 dispatch)

**Agent**: reasoning-agent-2

### Day 35-37: LearningEngine

**Agent**: reasoning-agent-3

### Day 38-40: CoordinationEngine

**Agent**: reasoning-agent-4

### Day 41-42: DistillationEngine (L3→L2)

**Agent**: reasoning-agent-5

---

## Wave 4: Platform Integration (Days 43-56)

**Goal**: Excel and Google Sheets integration

### Day 43-46: ExcelAdapter and CustomFunctions

**Agent**: platform-agent-1

### Day 47-49: TaskPane UI

**Agent**: platform-agent-2

### Day 50-52: Google Sheets Adapter

**Agent**: platform-agent-3

### Day 53-56: Integration Tests

**Agent**: platform-agent-4

---

## Wave 5: Polish & Launch (Days 57-70)

**Goal**: Final polish and launch preparation

### Day 57-60: Inspector and TraceViewer

**Agent**: polish-agent-1

### Day 61-63: SensationMonitor and TemplateGallery

**Agent**: polish-agent-2

### Day 64-67: Performance Optimization

**Agent**: polish-agent-3

### Day 68-70: Documentation and Examples

**Agent**: polish-agent-4

---

## Agent Assignments

| Wave | Day | Agent ID | Task | Files |
|-----|-----|----------|------|-------|
| 1 | 1-3 | foundation-agent-1 | LogCell base class | LogCell.ts |
| 1 | 4-6 | foundation-agent-2 | CellHead + Sensation | CellHead.ts, Sensation.ts |
| 1 | 7-9 | foundation-agent-3 | CellBody + Processing | CellBody.ts |
| 1 | 10-12 | foundation-agent-4 | CellTail + Output | CellTail.ts |
| 1 | 13-14 | foundation-agent-5 | CellOrigin + Coordinates | CellOrigin.ts, Coordinates.ts |
| 2 | 15-17 | celltypes-agent-1 | InputCell + OutputCell | InputCell.ts, OutputCell.ts |
| 2 | 18-20 | celltypes-agent-2 | TransformCell + FilterCell | TransformCell.ts, FilterCell.ts |
| 2 | 21-23 | celltypes-agent-3 | AggregateCell + ValidateCell | AggregateCell.ts, ValidateCell.ts |
| 2 | 24-26 | celltypes-agent-4 | AnalysisCell | AnalysisCell.ts |
| 2 | 27-28 | celltypes-agent-5 | PredictionCell + DecisionCell | PredictionCell.ts, DecisionCell.ts |
| 3 | 29-31 | reasoning-agent-1 | ReasoningTrace | ReasoningTrace.ts |
| 3 | 32-34 | reasoning-agent-2 | LogicLevels | LogicLevels.ts |
| 3 | 35-37 | reasoning-agent-3 | LearningEngine | LearningEngine.ts |
| 3 | 38-40 | reasoning-agent-4 | CoordinationEngine | CoordinationEngine.ts |
| 3 | 41-42 | reasoning-agent-5 | DistillationEngine | DistillationEngine.ts |
| 4 | 43-46 | platform-agent-1 | ExcelAdapter + CustomFunctions | ExcelAdapter.ts, CustomFunctions.ts |
| 4 | 47-49 | platform-agent-2 | TaskPane UI | TaskPane.tsx |
| 4 | 50-52 | platform-agent-3 | Google Sheets | SheetsAdapter.ts |
| 4 | 53-56 | platform-agent-4 | Integration Tests | *.integration.test.ts |
| 5 | 57-60 | polish-agent-1 | Inspector + TraceViewer | Inspector.tsx, TraceViewer.tsx |
| 5 | 61-63 | polish-agent-2 | SensationMonitor + Templates | SensationMonitor.tsx, TemplateGallery.tsx |
| 5 | 64-67 | polish-agent-3 | Performance | Performance optimization |
| 5 | 68-70 | polish-agent-4 | Documentation | README, examples |

---

## Dependencies Map

```
foundation-agent-1 (LogCell)
    ↓
foundation-agent-2 (CellHead) ────┐
    ↓                       │
foundation-agent-3 (CellBody) │
    ↓                       │
foundation-agent-4 (CellTail) │
    ↓                       │
foundation-agent-5 (CellOrigin)┘
    ↓
celltypes-agent-1 (InputCell, OutputCell)
    ↓
celltypes-agent-2 (TransformCell, FilterCell)
    ↓
celltypes-agent-3 (AggregateCell, ValidateCell)
    ↓
celltypes-agent-4 (AnalysisCell)
    ↓
celltypes-agent-5 (PredictionCell, DecisionCell)
    ↓
reasoning-agent-1 (ReasoningTrace)
    ↓
reasoning-agent-2 (LogicLevels)
    ↓
reasoning-agent-3 (LearningEngine)
    ↓
reasoning-agent-4 (CoordinationEngine)
    ↓
reasoning-agent-5 (DistillationEngine)
    ↓
platform-agent-1 (ExcelAdapter)
    ↓
platform-agent-2 (TaskPane)
    ↓
platform-agent-3 (SheetsAdapter)
    ↓
platform-agent-4 (Integration Tests)
    ↓
polish-agent-1 (Inspector)
    ↓
polish-agent-2 (SensationMonitor)
    ↓
polish-agent-3 (Performance)
    ↓
polish-agent-4 (Documentation)
```

---

## Success Criteria

### Wave 1 Success
- [ ] LogCell instantiates correctly
- [ ] All anatomy (head, body, tail, origin) works
- [ ] Sensation system detects changes
- [ ] 90%+ test coverage

### Wave 2 Success
- [ ] All cell types implemented
- [ ] Cells process data correctly
- [ ] L0-L3 logic dispatches properly
- [ ] 90%+ test coverage

### Wave 3 Success
- [ ] Reasoning trace generated
- [ ] Learning from feedback works
- [ ] Cell coordination works
- [ ] Distillation converts L3→L2

### Wave 4 Success
- [ ] Excel add-in installs
- [ ] =AGENT() function works
- [ ] Side panel displays cells
- [ ] Integration tests pass

### Wave 5 Success
- [ ] Inspector shows full trace
- [ ] Templates installable
- [ ] Performance acceptable (<200ms)
- [ ] Documentation complete

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Dependency chain breaks | Each agent validates previous work before starting |
| Test coverage drops | Agent doesn't proceed until tests pass |
| API changes | Abstract behind interfaces, use adapters |
| Performance issues | Profile early, optimize in Wave 5 |
| Excel compatibility | Test on multiple Excel versions |

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: ✅ Complete - Ready for Agent Execution
**Total Agents**: 25 agents across 5 waves
**Total Days**: 70 days (10 weeks)

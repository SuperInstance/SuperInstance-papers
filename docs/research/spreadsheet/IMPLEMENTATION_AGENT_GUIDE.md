# POLLN Implementation Agent Guide

**The Essential Handbook for Building the Spreadsheet LOG Tool**

---

## Welcome, Implementation Agent!

You are joining the POLLN project at a critical phase: **transforming 1,500+ pages of research into production code**. This guide provides everything you need to know to be effective.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Architecture Overview](#architecture-overview)
4. [Your Mission](#your-mission)
5. [Key Documents to Read](#key-documents-to-read)
6. [Implementation Phases](#implementation-phases)
7. [Code Standards](#code-standards)
8. [Testing Requirements](#testing-requirements)
9. [Common Patterns](#common-patterns)
10. [Pitfalls to Avoid](#pitfalls-to-avoid)
11. [Getting Help](#getting-help)

---

## Project Overview

### The Vision

**"Every spreadsheet cell contains an inspectable AI agent."**

Users can see, understand, and modify every decision their AI makes. We're not replacing users with AI—we're growing a colony of tiny assistants that learned their workflow by watching them work.

### The Product

- **Excel Add-in** and **Google Sheets Extension**
- **Side Panel** for inspecting agent reasoning
- **Template Library** for common workflows
- **Distillation Pipeline** for cost optimization

### The Technology

- **Fractured AI Boxes**: Discrete, inspectable reasoning units
- **Model Cascade**: 5-level hierarchy (Oracle→Expert→Specialist→Worker→Logic)
- **AgentCell**: 4-level abstraction (L0-L3)
- **Gap Detection**: Self-healing systems

---

## Quick Start

### 1. Environment Setup (5 minutes)

```bash
# Clone and install
git clone https://github.com/SuperInstance/polln.git
cd polln
npm install

# Verify setup
npm test          # Should see 821+ tests pass
npm run build     # Should build without errors
```

### 2. Read Essential Documents (30 minutes)

**Priority Order**:
1. `ROADMAP.md` - Understand the 52-week plan
2. `RESEARCH_QUESTIONS.md` - Know open questions
3. This document - Understand your role
4. Your assigned phase document (see below)

### 3. Find Your Assignment

Check the GitHub Issues for tasks tagged with your phase:
- `phase-1`: Reverse Engineering
- `phase-2`: Gap Detection
- `phase-3`: Agent Breakdown
- `phase-4`: Spreadsheet Integration
- `phase-5`: Production

### 4. Start Coding

Create a feature branch and begin implementation:
```bash
git checkout -b phase-X/your-feature-name
```

---

## Architecture Overview

### Core System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    POLLN ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              SPREADSHEET LAYER                        │   │
│  │  ┌─────────────┐    ┌─────────────┐                  │   │
│  │  │   Excel     │    │   Google    │                  │   │
│  │  │   Add-in    │    │   Sheets    │                  │   │
│  │  └─────────────┘    └─────────────┘                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              AGENT CELL LAYER                         │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │   │
│  │  │ L0  │ │ L1  │ │ L2  │ │ L3  │ │Cell │            │   │
│  │  │Logic│ │Cache│ │Agent│ │ LLM │ │Coord│            │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘            │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              REVERSE ENGINEERING LAYER                │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐       │   │
│  │  │  Model     │ │Transformer │ │  Fractured │       │   │
│  │  │  Cascade   │ │  Layers    │ │   Boxes    │       │   │
│  │  └────────────┘ └────────────┘ └────────────┘       │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              CORE POLLN SYSTEM                        │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │   │
│  │  │ Agents │ │ Colony │ │Decision│ │Learning│        │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │   │
│  │  │KV-Cache│ │Guardian│ │  API   │ │  CLI   │        │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Source Code Structure

```
src/
├── core/                    # Core POLLN system
│   ├── agent.ts            # Agent base class
│   ├── colony.ts           # Colony coordination
│   ├── decision/           # Decision engine (Plinko)
│   ├── learning/           # Learning systems
│   ├── kv/                 # KV-cache system
│   └── federation/         # Multi-colony coordination
│
├── api/                     # WebSocket API
│   ├── server.ts           # Server implementation
│   ├── handlers.ts         # Message handlers
│   └── client/             # Client library
│
├── cli/                     # Command-line interface
│   └── commands/           # CLI commands
│
├── monitoring/              # Observability
│   ├── metrics/            # Prometheus metrics
│   ├── tracing/            # OpenTelemetry
│   └── health/             # Health checks
│
├── scaling/                 # Auto-scaling
│   └── strategies/         # Scaling strategies
│
├── backup/                  # Backup/restore
│   ├── storage/            # Storage backends
│   └── strategies/         # Backup strategies
│
└── [spreadsheet/]          # NEW: Spreadsheet integration
    ├── reverse-engineering/ # Phase 1
    ├── gap-detection/       # Phase 2
    ├── agency/              # Phase 3
    ├── excel/               # Phase 4
    ├── googlesheets/        # Phase 4
    └── ui/                  # Phase 4
```

---

## Your Mission

### Phase 1: Reverse Engineering (Weeks 1-12)

**Goal**: Transform monolithic LLMs into thousands of inspectable boxes.

**Key Deliverables**:
- [ ] Model Cascade (5-level hierarchy)
- [ ] Transformer Layer Decomposition
- [ ] Orchestrator Protocol
- [ ] Reasoning Extraction Engine

**Key Documents**:
- `BREAKDOWN_R2_MODEL_CASCADE.md`
- `BREAKDOWN_R2_TRANSFORMER_LAYERS.md`
- `BREAKDOWN_R2_ORCHESTRATOR_PROTOCOL.md`

**Success Criteria**:
- Reverse engineer GPT-2 into ~37K cells
- Achieve 70-98% cost reduction
- <100ms orchestration overhead

### Phase 2: Gap Detection (Weeks 13-20)

**Goal**: Build self-healing systems that detect and fill gaps.

**Key Deliverables**:
- [ ] Static & Dynamic Analysis
- [ ] Gap Classification System
- [ ] Agent-Assisted Gap Filling
- [ ] Validation & Testing

**Key Documents**:
- `GAP_DETECTION_FILLING.md`
- `AGENCY_DETERMINATION.md`

**Success Criteria**:
- Detect 95%+ of gaps
- <5% false positive rate
- Fill 80%+ of gaps automatically

### Phase 3: Agent Breakdown (Weeks 21-28)

**Goal**: Convert complex agents into simpler, cheaper components.

**Key Deliverables**:
- [ ] Agency Determination Engine
- [ ] Complexity Profiler
- [ ] Target Converter (Agent→Bot→Script→Function)
- [ ] Cost Optimization Pipeline

**Key Documents**:
- `AGENT_BREAKDOWN.md`
- `AGENCY_DETERMINATION.md`

**Success Criteria**:
- Convert 70%+ of Level 4 agents
- Achieve 10-100x cost reduction
- Maintain >90% quality

### Phase 4: Spreadsheet Integration (Weeks 29-40)

**Goal**: Build the user-facing product.

**Key Deliverables**:
- [ ] Excel Add-in
- [ ] Google Sheets Extension
- [ ] Side Panel UI
- [ ] Template Library

**Key Documents**:
- `SIDE_PANEL_SPECS.md`
- `CELL_TYPE_SPECS.md`
- `SOFTWARE_VISUALIZATION.md`

**Success Criteria**:
- <2 minutes install to first agent
- <200ms typical operation
- Feature parity across platforms

### Phase 5: Production (Weeks 41-52)

**Goal**: Launch and scale.

**Key Deliverables**:
- [ ] Performance Optimization
- [ ] Security Hardening
- [ ] Documentation
- [ ] Launch & Community

**Success Criteria**:
- 99.9% uptime
- 10,000 GitHub stars
- 2+ Tier 1 press features

---

## Key Documents to Read

### Essential (Read First)

| Document | Purpose | Time |
|----------|---------|------|
| `ROADMAP.md` | 52-week plan | 20 min |
| `RESEARCH_QUESTIONS.md` | Open questions | 15 min |
| `IMPLEMENTATION_PLAN.md` | Technical specs | 30 min |
| This document | Agent guide | 15 min |

### Phase-Specific

**Phase 1** (Reverse Engineering):
- `BREAKDOWN_R2_MODEL_CASCADE.md` - Model cascade system
- `BREAKDOWN_R2_TRANSFORMER_LAYERS.md` - Transformer mapping
- `BREAKDOWN_R2_ORCHESTRATOR_PROTOCOL.md` - Box coordination

**Phase 2** (Gap Detection):
- `GAP_DETECTION_FILLING.md` - Gap system
- `AGENCY_DETERMINATION.md` - Agency levels

**Phase 3** (Agent Breakdown):
- `AGENT_BREAKDOWN.md` - Breakdown system
- `AGENCY_DETERMINATION.md` - Cost optimization

**Phase 4** (Spreadsheet Integration):
- `SIDE_PANEL_SPECS.md` - UI specifications
- `CELL_TYPE_SPECS.md` - Cell abstraction
- `SOFTWARE_VISUALIZATION.md` - Visualization

### Reference

| Document | Purpose |
|----------|---------|
| `00_INDEX.md` | Document index |
| `ARCHITECTURE.md` | System architecture |
| `TECHNICAL_SPECS.md` | Technical specifications |
| `MVP_PLAN.md` | Strategic vision |

---

## Implementation Phases

### How Phases Work

1. **Sequential Foundation**: Each phase builds on previous phases
2. **Parallel Tracks**: Within phases, work can proceed in parallel
3. **Weekly Milestones**: Each week has specific deliverables
4. **Integration Points**: Phases integrate at defined points

### Phase Gate Criteria

Before moving to the next phase:

- [ ] All deliverables complete
- [ ] All tests passing (>85% coverage)
- [ ] Documentation updated
- [ ] Code review approved
- [ ] Integration tests passing

---

## Code Standards

### TypeScript Conventions

```typescript
// Use interfaces for contracts
interface AgentCell {
  id: string;
  position: CellPosition;
  logicLevel: LogicLevel;
  execute(): Promise<CellResult>;
}

// Use type aliases for unions
type LogicLevel = 0 | 1 | 2 | 3;

// Use enums for fixed sets
enum BoxType {
  Observation = 'observation',
  Analysis = 'analysis',
  Inference = 'inference',
  Action = 'action',
}

// Prefer composition over inheritance
class FracturedBox implements Inspectable, Serializable {
  // ...
}
```

### Naming Conventions

```typescript
// Classes: PascalCase
class ModelCascade {}

// Functions: camelCase
function routeToLevel(task: Task): ModelLevel {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// Private members: underscore prefix
private _internalState: State;

// Files: kebab-case
// model-cascade.ts
// transformer-mapper.ts
```

### File Organization

```typescript
// 1. Imports (grouped)
import { Agent } from '../core/agent';           // Internal
import { Task } from '../types';                 // Types
import { OpenAI } from 'openai';                 // External

// 2. Types and Interfaces
interface CascadeConfig {
  // ...
}

// 3. Constants
const DEFAULT_THRESHOLD = 0.95;

// 4. Main class/function
export class ModelCascade {
  // ...
}

// 5. Helper functions (not exported)
function internalHelper(): void {
  // ...
}
```

---

## Testing Requirements

### Test Structure

```
src/
├── module/
│   ├── feature.ts
│   └── __tests__/
│       ├── feature.test.ts        # Unit tests
│       ├── feature.integration.ts # Integration tests
│       └── feature.benchmark.ts   # Performance tests
```

### Test Patterns

```typescript
describe('ModelCascade', () => {
  // Setup
  let cascade: ModelCascade;

  beforeEach(() => {
    cascade = new ModelCascade(config);
  });

  describe('routing', () => {
    it('should route simple tasks to Logic level', async () => {
      const task = createSimpleTask();
      const level = await cascade.route(task);
      expect(level).toBe(ModelLevel.Logic);
    });

    it('should route complex tasks to Oracle level', async () => {
      const task = createComplexTask();
      const level = await cascade.route(task);
      expect(level).toBe(ModelLevel.Oracle);
    });
  });

  describe('error handling', () => {
    it('should handle routing failures gracefully', async () => {
      const task = createInvalidTask();
      await expect(cascade.route(task)).rejects.toThrow(RoutingError);
    });
  });
});
```

### Coverage Requirements

| Type | Minimum | Target |
|------|---------|--------|
| Line Coverage | 80% | 90% |
| Branch Coverage | 75% | 85% |
| Function Coverage | 85% | 95% |

### Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- model-cascade.test.ts

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## Common Patterns

### Pattern 1: Box Creation

```typescript
// Create a fractured box from LLM output
const box = await BoxFactory.createFromLLM({
  input: userInput,
  output: llmOutput,
  type: BoxType.Analysis,
  confidence: 0.92,
});

// Execute box
const result = await box.execute();

// Inspect reasoning
const reasoning = box.getReasoningTrace();
```

### Pattern 2: Model Cascade Routing

```typescript
// Route task to appropriate level
const cascade = new ModelCascade();
const level = await cascade.route({
  task: userTask,
  context: currentContext,
  history: previousTasks,
});

// Execute at determined level
const result = await cascade.execute(level, userTask);
```

### Pattern 3: Gap Detection

```typescript
// Detect gaps in code
const analyzer = new StaticAnalyzer();
const gaps = await analyzer.analyze(sourceCode);

// Classify gaps
const classifier = new GapClassifier();
const classified = await classifier.classify(gaps);

// Fill gaps
const filler = new GapFiller();
const filled = await filler.fill(classified);
```

### Pattern 4: Agent Breakdown

```typescript
// Determine agency level needed
const determinator = new AgencyDeterminator();
const level = determinator.determine(task);

// Convert to simpler form if possible
if (level < AutomationLevel.Agent) {
  const converter = new TargetConverter();
  const simpler = await converter.convert(agent, level);
}
```

---

## Pitfalls to Avoid

### 1. Over-Engineering

❌ **Don't**:
```typescript
// Building abstraction layers for future needs
interface IAbstractFactoryBuilder<T> {
  createBuilderFactory(): IBuilderFactory<T>;
}
```

✅ **Do**:
```typescript
// Simple, direct implementation
class BoxFactory {
  static create(config: BoxConfig): Box {
    return new Box(config);
  }
}
```

### 2. Premature Optimization

❌ **Don't**:
```typescript
// Optimizing before measuring
const result = cache.get(key) ?? await expensiveOperation();
```

✅ **Do**:
```typescript
// Measure first, then optimize
const start = performance.now();
const result = await expensiveOperation();
console.log(`Operation took ${performance.now() - start}ms`);
// Then add caching if needed
```

### 3. Ignoring Tests

❌ **Don't**:
```typescript
// Skip tests for "simple" code
export function parseInput(input: string): Result {
  return JSON.parse(input); // What if input is invalid?
}
```

✅ **Do**:
```typescript
// Test edge cases
export function parseInput(input: string): Result {
  try {
    return JSON.parse(input);
  } catch (e) {
    throw new ParseError(`Invalid input: ${e.message}`);
  }
}

// Test file
describe('parseInput', () => {
  it('should throw on invalid JSON', () => {
    expect(() => parseInput('not json')).toThrow(ParseError);
  });
});
```

### 4. Magic Numbers

❌ **Don't**:
```typescript
if (confidence > 0.95) {
  // Why 0.95?
}
```

✅ **Do**:
```typescript
const VERIFICATION_THRESHOLD = 0.95; // 95% confidence required

if (confidence > VERIFICATION_THRESHOLD) {
  // Clear intent
}
```

### 5. Ignoring Error Context

❌ **Don't**:
```typescript
catch (e) {
  throw new Error('Operation failed');
}
```

✅ **Do**:
```typescript
catch (e) {
  throw new CascadeError(
    `Cascade routing failed for task ${task.id}`,
    { cause: e, context: { task, level } }
  );
}
```

---

## Getting Help

### Resources

1. **Documentation**: `docs/research/spreadsheet/`
2. **GitHub Issues**: Tag with `question` label
3. **Discord**: `#help` channel

### When Stuck

1. **Search docs first**: 100+ documents available
2. **Check existing issues**: May have been asked before
3. **Ask in Discord**: Community is helpful
4. **Create issue**: If you find a bug or gap

### Escalation Path

```
Self-serve docs → Discord #help → GitHub Issue → Tech Lead DM
```

---

## Checklist: Before Starting

- [ ] Environment setup complete (npm install, npm test pass)
- [ ] Read ROADMAP.md
- [ ] Read RESEARCH_QUESTIONS.md
- [ ] Read this document
- [ ] Read phase-specific documents
- [ ] Found your assigned issue(s)
- [ ] Created feature branch
- [ ] Ready to code!

---

## Your First PR

Aim to submit your first PR within 48 hours:

1. **Pick a small task**: Look for `good first issue` label
2. **Make a small improvement**: Fix a bug, add a test, improve docs
3. **Learn the process**: Understand the PR workflow
4. **Get feedback**: Code review is a learning opportunity

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: Ready for Implementation Agents

---

*Welcome to the team! Let's build the future of understandable AI together.* 🐝

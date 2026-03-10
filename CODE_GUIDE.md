# POLLN Code Guide

**The definitive navigation document for future coding agents**

---

## Welcome, Future Agent

This document is your compass to the POLLN codebase. Read this first to understand where everything is and how it connects.

---

## Project Overview

**POLLN** = Pattern-Organized Large Language Network

A system for decomposing LLMs into **tiles** - visible, inspectable, improvable AI components.

### The Big Idea

```
Traditional LLM:     Black Box → Output
SMP Approach:       [Tile] → [Tile] → [Tile] → Output
                     ↑         ↑         ↑
                  visible   inspectable improvable
```

---

## Directory Map

```
polln/
│
├── src/                          # ALL SOURCE CODE
│   ├── core/                     # FOUNDATION - Read src/core/README.md
│   │   ├── types.ts              # START HERE - All type definitions
│   │   ├── agent.ts              # BaseAgent abstract class
│   │   ├── colony.ts             # Colony manager
│   │   ├── dreaming.ts           # Dream optimization
│   │   ├── worldmodel.ts         # Predictive model
│   │   ├── kvanchor.ts           # KV-Cache system
│   │   └── ... (many more)       # See src/core/README.md
│   │
│   ├── agents/                  # SPECIALIZED AGENTS - Read src/agents/README.md
│   │   ├── research.ts           # ResearchAgent
│   │   ├── code.ts               # CodeAgent
│   │   └── analysis.ts           # AnalysisAgent
│   │
│   ├── coordination/             # STIGMERGY - Read src/coordination/README.md
│   │   └── stigmergy.ts          # Pheromone coordination
│   │
│   ├── spreadsheet/              # SPREADSHEET SYSTEM
│   │   ├── tiles/                # Tiles - Read src/spreadsheet/tiles/README.md
│   │   ├── cells/                # Cells - Read src/spreadsheet/cells/README.md
│   │   └── backend/              # Backend - Read src/spreadsheet/backend/README.md
│   │
│   ├── api/                      # WEBSOCKET API - Read src/api/README.md
│   ├── cli/                      # CLI TOOL - Read src/cli/README.md
│   ├── benchmarking/             # BENCHMARKS - Read src/benchmarking/README.md
│   └── backup/                   # BACKUP SYSTEM - Read src/backup/README.md
│
├── docs/                         # DOCUMENTATION
│   └── research/smp-paper/       # SMP RESEARCH - Read docs/research/smp-paper/README.md
│
├── simulations/                  # SIMULATIONS - Read simulations/README.md
│   ├── math/                     # Mathematical simulations
│   ├── physics/                  # Physics simulations
│   └── novel/                    # Novel research simulations
│
└── scripts/                      # UTILITY SCRIPTS
```

---

## Where To Start

### If You're New To The Project

1. **Read this file** (CODE_GUIDE.md) - You're doing it now
2. **Read CLAUDE.md** - Project context and mission
3. **Read src/core/types.ts** - All type definitions
4. **Read src/core/README.md** - Core system overview
5. **Pick a subsystem** - tiles, agents, coordination

### If You're Fixing A Bug

1. **Identify the file** - Use grep or search
2. **Read the directory README** - Each folder has one
3. **Check tests** - Look in `__tests__/` subdirectories
4. **Understand dependencies** - What else uses this code?

### If You're Adding A Feature

1. **Find similar features** - Pattern match existing code
2. **Read the subsystem README** - Understand the domain
3. **Check types.ts** - Add new types there
4. **Write tests first** - In corresponding `__tests__/`

---

## Core Concepts

### 1. Tiles

The fundamental unit of intelligence.

```typescript
// A Tile is a tuple:
Tile = (I, O, f, c, τ)
// I = Input schema
// O = Output schema
// f = discriminate function
// c = confidence function
// τ = trace function
```

**See**: `src/spreadsheet/tiles/README.md`

### 2. Agents

Autonomous reasoning units that use tiles.

```typescript
// Agent hierarchy:
BaseAgent (abstract)
    ├── TaskAgent (EPHEMERAL) - Born, execute, die
    ├── RoleAgent (ROLE) - Long-running, stateful
    └── CoreAgent (CORE) - Always-on, critical
```

**See**: `src/core/README.md` and `src/agents/README.md`

### 3. Colonies

Collections of agents managed together.

```typescript
Colony {
  agents: Map<string, AgentState>
  registerAgent(config)
  unregisterAgent(id)
  getStats()
}
```

**See**: `src/core/colony.ts`

### 4. KV-Cache

Caching system for LLM contexts.

```typescript
// Anchors cache reusable context
KVAnchor {
  prefix: string
  kvCache: cachedState
  embedding: number[]
}
```

**See**: `src/core/kvanchor.ts`

### 5. Stigmergy

Coordination through environmental signals.

```typescript
// Pheromone types
PATHWAY  - "Good path found"
RESOURCE - "Useful data here"
DANGER  - "Avoid this"
NEST    - "Central point"
RECRUIT  - "Help needed"
```

**See**: `src/coordination/README.md`

---

## Key Type Definitions

All important types are in `src/core/types.ts`:

```typescript
// Agent configuration
interface AgentConfig {
  id: string;
  typeId: string;
  categoryId: string;
  modelFamily: string;
  inputTopics: string[];
  outputTopic: string;
}

// Agent runtime state
interface AgentState {
  id: string;
  status: 'dormant' | 'active' | 'hibernating' | 'error';
  valueFunction: number;  // Success rate 0-1
  successCount: number;
  failureCount: number;
}

// Agent-to-agent communication
interface A2APackage<T> {
  id: string;
  senderId: string;
  receiverId: string;
  type: string;
  payload: T;
  parentIds: string[];  // Causal chain
  privacyLevel: PrivacyLevel;
  layer: SubsumptionLayer;
}

// Privacy levels
enum PrivacyLevel {
  PUBLIC   = 'PUBLIC',
  COLONY   = 'COLONY',
  PRIVATE  = 'PRIVATE'
}

// Subsumption layers (Rodney Brooks architecture)
enum SubsumptionLayer {
  SAFETY     = 'SAFETY',     // Immediate, hardwired
  REFLEX     = 'REFLEX',     // Fast, cached
  HABITUAL   = 'HABITUAL',   // Learned routines
  DELIBERATE = 'DELIBERATE'  // Planning, reasoning
}
```

---

## Common Patterns

### Create An Agent

```typescript
import { TaskAgent } from './core/agents';

const agent = new TaskAgent({
  id: 'task-001',
  typeId: 'sentiment',
  categoryId: 'nlp',
  modelFamily: 'smallml',
  inputTopics: ['text'],
  outputTopic: 'sentiment'
});

await agent.initialize();
const result = await agent.process(input);
await agent.shutdown();
```

### Create A Tile Chain

```typescript
import { TileChain } from './spreadsheet/tiles/core/TileChain';

const chain = new TileChain()
  .pipe(tokenizerTile)
  .pipe(sentimentTile)
  .pipe(confidenceTile);

const result = await chain.execute(input);
```

### Use KV-Cache

```typescript
import { KVAnchorPool } from './core/kvanchor';

const pool = new KVAnchorPool({ maxSize: 1000 });
const anchor = pool.createAnchor({
  prefix: 'system-prompt',
  kvCache: cachedState
});
```

### Coordinate With Stigmergy

```typescript
import { Stigmergy, PheromoneType } from './coordination';

const stigmergy = new Stigmergy();

// Leave a trail
stigmergy.deposit({
  type: PheromoneType.PATHWAY,
  sourceId: 'agent-001',
  position: { taskType: 'sentiment' }
});

// Follow trails
const trails = stigmergy.sense({ taskType: 'sentiment' });
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Tests

```bash
# Core tests
npm test -- --testPathPattern=core

# Tile tests
npm test -- --testPathPattern=tiles

# Agent tests
npm test -- --testPathPattern=agents
```

### Test Structure

Each module has tests in `__tests__/`:

```
src/
├── core/
│   └── __tests__/
│       ├── agents.test.ts
│       ├── colony.test.ts
│       └── ...
├── agents/
│   └── __tests__/
│       └── research.test.ts
└── spreadsheet/tiles/
    └── tests/
        └── integration.test.ts
```

---

## TypeScript Errors

Current status: **82 errors remaining**

Most errors are in:
- `src/spreadsheet/ui/` - React components
- Feature flag panel

To fix:
```bash
# Check errors
npx tsc --noEmit

# Fix specific file
# Edit the file based on error message
```

---

## Important Files Quick Reference

| File | Purpose | Lines |
|------|---------|-------|
| `src/core/types.ts` | ALL type definitions | ~200 |
| `src/core/agent.ts` | BaseAgent class | ~150 |
| `src/core/colony.ts` | Colony manager | ~200 |
| `src/spreadsheet/tiles/core/Tile.ts` | Tile interface | ~100 |
| `src/coordination/stigmergy.ts` | Pheromone system | ~300 |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              USER                                    │
│                               │                                       │
│                               ▼                                       │
│                        ┌─────────────┐                               │
│                        │    API      │  WebSocket / REST             │
│                        └─────────────┘                               │
│                               │                                       │
│                               ▼                                       │
│                        ┌─────────────┐                               │
│                        │   Colony    │  Agent Collection             │
│                        └─────────────┘                               │
│                               │                                       │
│            ┌──────────────────┼──────────────────┐                   │
│            │                  │                  │                    │
│            ▼                  ▼                  ▼                    │
│     ┌─────────────┐   ┌─────────────┐   ┌─────────────┐             │
│     │   Agents    │   │   Tiles     │   │ Coordination│             │
│     │ (reasoning) │   │  (compute)  │   │ (stigmergy) │             │
│     └─────────────┘   └─────────────┘   └─────────────┘             │
│            │                  │                  │                    │
│            └──────────────────┼──────────────────┘                   │
│                               ▼                                       │
│                        ┌─────────────┐                               │
│                        │  KV-Cache   │  Context reuse                │
│                        └─────────────┘                               │
│                               │                                       │
│                               ▼                                       │
│                        ┌─────────────┐                               │
│                        │ World Model │  Predictions                  │
│                        └─────────────┘                               │
│                               │                                       │
│                               ▼                                       │
│                        ┌─────────────┐                               │
│                        │  Dreaming   │  Offline optimization         │
│                        └─────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Explore**: Pick a subsystem and read its README
2. **Build**: Fix TypeScript errors or add features
3. **Test**: Run tests to verify your changes
4. **Document**: Update READMEs if you change behavior

---

*Part of POLLN - Pattern-Organized Large Language Network*
*SuperInstance.AI | MIT License*

*Last Updated: 2026-03-10*

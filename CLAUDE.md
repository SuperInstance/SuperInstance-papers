# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

POLLN (Pattern-Organized Large Language Network) is a distributed intelligence system where simple, specialized agents produce intelligent behavior through emergent coordination. Like a bee colony, individual agents are narrow but the colony becomes intelligent through learned connections.

**Core Philosophy**: Intelligence isn't in any agent—it's in the web between them. Through **granular reasoning**, forced checkpoints at each decision create traceable, debuggable intelligence that surpasses black-box models.

---

## Development Commands

```bash
npm install              # Install dependencies
npm test                 # Run all tests (1253/1253 passing - 100%)
npm run build            # TypeScript to dist/
npm run cli              # Run CLI tool
npx jest path/to/test    # Run single test
```

---

## Architecture Overview

### Subsumption Architecture
```
SAFETY (instant, critical) <- Always wins
  │
REFLEX (fast, automatic)
  │
HABITUAL (medium, learned)
  │
DELIBERATE (slow, conscious)
```

### Agent Hierarchy
```
BaseAgent (src/core/agent.ts)
    └── TileCategory
        ├── TaskAgent   - Single-purpose, ephemeral
        ├── RoleAgent   - Ongoing responsibilities
        └── CoreAgent   - Essential, always-active

MetaTile (src/core/meta.ts) - Pluripotent agents
```

---

## Key Concepts

| Term | Definition |
|------|------------|
| **Pollen Grain** | Compressed behavioral pattern (embedding) |
| **Keeper** | User cultivating their hive |
| **Meadow** | Community space for pattern cross-pollination |
| **Plinko** | Stochastic selection with temperature-controlled exploration |
| **A2A Package** | Agent-to-agent communication artifact (fully traceable) |
| **META Tile** | Pluripotent agent that differentiates based on signals |
| **KV Anchor** | Compressed KV-cache segment for efficient reuse |
| **Guardian Angel** | Safety agent with veto power over executions |
| **LoRA Tool Belt** | Interchangeable expertise modules for small models |
| **Hydraulic System** | Emergent intelligence via pressure/flow coordination |

---

## Critical Patterns

### 1. Plinko Selection (Stochastic)
Never select "best". Sample probabilistically:
```typescript
const selected = plinkoLayer.select(proposals, temperature);
// High temp = explore, Low temp = exploit
// Enables durability through diversity
```

### 2. Memory = Structure
```typescript
// Hebbian: "neurons that fire together, wire together"
hebbianLearning.update(sourceId, targetId, reward);
```

### 3. Traceability
Every A2A package has `parentIds` and `causalChainId`. Fully replayable.

---

## System Status (2026-03-07)

**Test Pass Rate**: 100% (1253/1253 tests passing)

### Completed Features
- ✅ Base Agent Runtime (18 tests)
- ✅ Tile Categories - Task/Role/Core (24 tests)
- ✅ META Tiles - Pluripotent agents (18 tests)
- ✅ Value Network - TD(λ) learning (20 tests)
- ✅ Stigmergic Coordination (12 tests)
- ✅ Plinko Decision Layer (12 tests)
- ✅ World Model & Dreaming (42 tests)
- ✅ Federated Learning (32 tests)
- ✅ Meadow Community (87 tests)
- ✅ KV-Cache System - KVCOMM-inspired (401 tests)
- ✅ Context Sharing (37 tests)
- ✅ Cache Utilities (91 tests)
- ✅ Guardian Angel Safety (31 tests)
- ✅ WebSocket API Server
- ✅ CLI Tool (colony management)
- ✅ 4 Complete Example Applications

---

## Research Foundation

### Granular Reasoning Philosophy
**The Double-Slit of AI**: Traditional LLMs collapse computation at the end (black box). POLLN forces collapse at every step (glass box).

- **Checkpointed Decisions**: Each A2A package is an inspectable artifact
- **Debuggability**: Find exact agent making bad decisions, fix just that part
- **Distillation Pattern**: Large models teach small model swarms
- **Surpasses Teacher**: Specialized agents can outperform generalist teacher (96% vs 87%)

### Model Size vs Granularity
```
Resolution (decisions/1000 tokens)
    │
100 │                                   ● 7B model (token-level)
 50 │                        ● 1B model (phrase-level)
 20 │              ● 100M model (sentence-level)
 10 │    ● 10M model (task-level)
  5 │ ● 1M model (step-level)
    └──────────────────────────────────────
       1K    10K    100K   1M     10M    100M
```

Smaller models = more decision points = finer control.

### Library of Experts (LoRA Architecture)
Research: `docs/research/LORA_LIBRARY_*.md`

- LoRA adapters as interchangeable tools
- Small base models (<1B) with expertise tool belts
- Custom machining for specialized tasks
- Emergent abilities from composition

### Emergent Granular Intelligence
Research: `docs/research/EMERGENT_*.md`

- Hydraulic system metaphor (pressure, flow, valves, pumps)
- Emergence detection and measurement
- Stigmergy and indirect coordination
- Swarms of 10M-100M parameter agents replacing 175B models

---

## Documentation Index

### Core Documentation
| Document | Purpose |
|----------|---------|
| `README.md` | Project overview and granular reasoning philosophy |
| `docs/ROADMAP.md` | Phased development plan |
| `docs/ARCHITECTURE.md` | System architecture diagrams |
| `docs/CLI_GUIDE.md` | CLI usage documentation |

### Research Documents
| Document | Purpose |
|----------|---------|
| `docs/research/MODEL_DISTILLATION_R&D.md` | 5 rounds: small models learning from large |
| `docs/research/LORA_LIBRARY_*.md` | LoRA as interchangeable tools (4 files) |
| `docs/research/EMERGENT_*.md` | Hydraulic system framework (4 files) |
| `docs/research/pluripotent-agents-research.md` | META tile math foundations |
| `docs/research/QUICK_REFERENCE.md` | Research synthesis |

### Security Documentation (Sprint 8 - Ready for Implementation)
| Document | Purpose |
|----------|---------|
| `docs/SECURITY_AUDIT.md` | Threat model, 30 security issues identified |
| `docs/SECURITY_IMPLEMENTATION.md` | Implementation specs with code examples |
| `docs/SECURITY_CHECKLIST.md` | Actionable security checklist |

### Implementation Guides
| Document | Purpose |
|----------|---------|
| `docs/phase4-sprint5-guardian-angel.md` | Guardian Angel system summary |
| `src/api/README.md` | WebSocket API client documentation |

---

## Module Inventory

### Core (`src/core/`)
**18 modules** including types, agents, colony, decision, learning, evolution, communication, embeddings, safety, world model, dreaming, META tiles, value network, succession, federated, meadow, protocol, tile system, dreaming, cache utilities

### KV-Cache System
**8 modules** - Anchor pool, ANN index (HNSW/LSH/Ball Tree), LMCache adapter, context sharing, tile bridge, dream integration, federated sync, meadow marketplace

### Guardian Angel Safety
**4 modules** - Types, 20+ constraints, guardian agent, adaptive learning

### API Layer (`src/api/`)
**6 modules** - Server, handlers, middleware, types, OpenAPI spec

### CLI Tool (`src/cli/`)
**9 modules** - Main entry point + 7 commands + config/state/output utils

### Examples (`examples/`)
**4 complete demos** - Basic colony, code reviewer, KV cache, research assistant, guardian angel

---

## Exports Structure

### `src/core/index.ts`
Types (A2APackage, PollenGrain, PlinkoDecision), Classes (BaseAgent, Colony, PlinkoLayer, SafetyLayer, WorldModel), META (MetaTile), Value (ValueNetwork), Dreaming (DreamBasedPolicyOptimizer), Meadow, Tile System, KV-Cache (KVAnchorPool, ANNIndex), LMCache (LMCacheAdapter), Guardian (GuardianAngelAgent)

### `src/api/index.ts`
Server (POLLNServer), Types, Middleware, Handlers

---

## Package Structure

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./core": "./dist/core/index.js",
    "./api": "./dist/api/index.js"
  },
  "bin": {
    "polln": "./dist/cli/index.js"
  }
}
```

---

*Repository: https://github.com/SuperInstance/polln*
*Last Updated: 2026-03-07*
*Test Status: 1253/1253 passing (100%)*

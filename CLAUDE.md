# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

POLLN (Pattern-Organized Large Language Network) is a distributed intelligence system where simple, specialized agents produce intelligent behavior through emergent coordination. Like a bee colony, individual agents are narrow but the colony becomes intelligent through learned connections.

**Key insight**: Intelligence isn't in any agent—it's in the web between them.

---

## Development Commands

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration

# Build (TypeScript to dist/)
npm run build

# Build in watch mode
npm run dev

# Run a single test file
npx jest src/core/__tests__/agents.test.ts
```

---

## Architecture Overview

### Core Principle: Subsumption Architecture

The system uses layered processing where lower layers override higher ones:

```
SAFETY (instant, critical) ← Always wins
  ↓
REFLEX (fast, automatic)
  ↓
HABITUAL (medium, learned)
  ↓
DELIBERATE (slow, conscious)
```

### Agent Hierarchy

```
BaseAgent (src/core/agent.ts)
    └── TileCategory
        ├── TaskAgent   - Single-purpose, ephemeral
        ├── RoleAgent   - Ongoing responsibilities
        └── CoreAgent   - Essential, always-active

MetaTile (src/core/meta.ts) - Pluripotent agents that differentiate based on signals
```

### Key Modules (`src/core/`)

| Module | Purpose |
|--------|---------|
| `types.ts` | Core type definitions (A2APackage, SynapseConfig, etc.) |
| `agent.ts` | BaseAgent class |
| `agents.ts` | TaskAgent, RoleAgent, CoreAgent implementations |
| `colony.ts` | Agent colony management |
| `decision.ts` | Plinko stochastic selection layer |
| `learning.ts` | Hebbian learning (synaptic weight updates) |
| `evolution.ts` | Graph evolution (pruning, grafting, clustering) |
| `communication.ts` | A2A package system |
| `embedding.ts` | BES embeddings (Pollen Grains) |
| `safety.ts` | Constitutional constraints, emergency controls |
| `worldmodel.ts` | VAE world model for dreaming |
| `dreaming.ts` | Dream-based policy optimization |
| `meta.ts` | Pluripotent META tiles |
| `valuenetwork.ts` | TD(λ) value prediction |
| `succession.ts` | Knowledge transfer protocol |
| `federated.ts` | Federated learning coordinator |
| `meadow.ts` | Community/knowledge sharing system |

### Coordination (`src/coordination/`)

| Module | Purpose |
|--------|---------|
| `stigmergy.ts` | Pheromone-based indirect coordination |

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
| **Value Network** | TD(λ) predictions of state values |
| **Stigmergy** | Indirect coordination via environmental signals |

---

## Critical Patterns

### 1. Plinko Selection (Stochastic, Not Deterministic)

Never select the "best" option. Always sample probabilistically:

```typescript
// Temperature controls exploration vs exploitation
// High temp = explore more, Low temp = exploit best
const selected = plinkoLayer.select(proposals, temperature);
```

This enables **durability through diversity**—backup variants exist when conditions change.

### 2. Memory = Structure

The system doesn't store facts in a database. It stores stronger connections between agents that work well together:

```typescript
// Hebbian learning: "neurons that fire together, wire together"
hebbianLearning.update(sourceId, targetId, reward);
```

### 3. Traceability

Every A2A package has `parentIds` and `causalChainId`. Every decision is replayable.

---

## Exports Structure

Main entry points in `src/core/index.ts`:

- Types: `A2APackage`, `PollenGrain`, `PlinkoDecision`, `SynapseConfig`
- Classes: `BaseAgent`, `Colony`, `PlinkoLayer`, `SafetyLayer`, `WorldModel`
- Federated: `FederatedLearningCoordinator`
- META: `MetaTile`, `MetaTileManager`
- Value: `ValueNetwork`, `ValueNetworkManager`
- Dreaming: `DreamBasedPolicyOptimizer`, `DreamManager`
- Meadow: `Meadow`, community types

---

## Test Structure

Tests live in `src/**/__tests__/*.test.ts`:

- `types.test.ts` - Core type validation
- `agents.test.ts` - Agent lifecycle
- `meta.test.ts` - META tile differentiation
- `valuenetwork.test.ts` - TD(λ) learning
- `worldmodel.test.ts` - VAE world model
- `dreaming.test.ts` - Policy optimization
- `federated.test.ts` - Federated learning
- `meadow.test.ts` - Community system
- `integration.test.ts` - Full system tests

---

## Reference Documentation

| Doc | Purpose |
|-----|---------|
| `docs/ROADMAP.md` | Phased development plan |
| `docs/ARCHITECTURE.md` | System architecture diagrams |
| `docs/research/QUICK_REFERENCE.md` | Research synthesis |
| `docs/research/pluripotent-agents-research.md` | META tile math foundations |

---

## Current Development Phase

Phase 2+ Enhancement: R&D waves exploring:
- World Model / VAE enhancement
- Agent Graph Evolution
- Federated Learning patterns
- Meadow/Community system

---

*Repository: https://github.com/SuperInstance/polln*

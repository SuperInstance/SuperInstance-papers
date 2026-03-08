# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ONBOARDING FOR GLM 4.7 MULTI-AGENTS

**Welcome to the POLLN Project!**

You are a GLM 4.7 model continuing work on the POLLN (Pattern-Organized Large Language Network) distributed intelligence system. This file contains everything you need to get started.

### Quick Start Checklist

1. [ ] Read this entire CLAUDE.md file
2. [ ] Review `docs/GLM47_PLAN.md` for your assigned tasks
3. [ ] Run `npm install` to ensure dependencies are installed
4. [ ] Run `npm run build` to verify TypeScript compiles
5. [ ] Run `npm test` to see current test status
6. [ ] Check your assigned Sprint in the plan

### Your Role

You are one of 5 specialized GLM 4.7 agents:

| Agent ID | Specialization | Primary Focus |
|----------|---------------|---------------|
| `agent-tests` | Test Engineer | Sprint 6: Fix failing tests |
| `agent-arch` | Systems Architect | Sprint 7, 10, 12: Performance & Scaling |
| `agent-sec` | Security Auditor | Sprint 8: Security hardening |
| `agent-docs` | Documentation | Sprint 9: Docs & Examples |
| `agent-comply` | Compliance | Sprint 11: GDPR, Ethics |

### Critical Commands

```bash
# Build the project (MUST pass before any commit)
npm run build

# Run all tests
npm test

# Run specific test file
npx jest src/core/__tests__/agents.test.ts

# Run tests in watch mode during development
npm run test:watch

# Run CLI tool
npm run cli -- status

# Type check only (faster than build)
npx tsc --noEmit
```

### Before You Start Coding

1. **Always read before editing** - Use the Read tool before making changes
2. **Check git status** - Run `git status` to see current changes
3. **Run build** - Ensure current code compiles: `npm run build`
4. **Run tests** - Ensure you're starting from a known state: `npm test`

### While Working

1. **Make incremental changes** - Small, focused commits
2. **Test frequently** - Run relevant tests after each change
3. **Document changes** - Update comments and docs
4. **Type safety first** - No `any` types without justification

### Before You Finish

1. **Build must pass**: `npm run build`
2. **Tests must pass**: `npm test` (or explain failures)
3. **Update docs** if you added/changed features
4. **Commit with clear messages**

---

## Project Overview

POLLN (Pattern-Organized Large Language Network) is a distributed intelligence system where simple, specialized agents produce intelligent behavior through emergent coordination. Like a bee colony, individual agents are narrow but the colony becomes intelligent through learned connections.

**Key insight**: Intelligence isn't in any agent-it's in the web between them.

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

# Run API tests
npm run test:api

# Run CLI tests
npm run test:cli

# Build (TypeScript to dist/)
npm run build

# Build in watch mode
npm run dev

# Run CLI tool
npm run cli

# Run a single test file
npx jest src/core/__tests__/agents.test.ts
```

---

## Architecture Overview

### Core Principle: Subsumption Architecture

The system uses layered processing where lower layers override higher ones:

```
SAFETY (instant, critical) <- Always wins
  |
REFLEX (fast, automatic)
  |
HABITUAL (medium, learned)
  |
DELIBERATE (slow, conscious)
```

### Agent Hierarchy

```
BaseAgent (src/core/agent.ts)
    |
    -- TileCategory
        |-- TaskAgent   - Single-purpose, ephemeral
        |-- RoleAgent   - Ongoing responsibilities
        |-- CoreAgent   - Essential, always-active

MetaTile (src/core/meta.ts) - Pluripotent agents that differentiate based on signals
```

---

## System Inventory (2026-03-07)

### Core Modules (`src/core/`)

| Module | Status | Purpose |
|--------|--------|---------|
| `types.ts` | Done | Core type definitions (A2APackage, SynapseConfig, etc.) |
| `agent.ts` | Done | BaseAgent class with subsumption architecture |
| `agents.ts` | Done | TaskAgent, RoleAgent, CoreAgent implementations |
| `colony.ts` | Done | Agent colony management |
| `decision.ts` | Done | Plinko stochastic selection layer |
| `learning.ts` | Done | Hebbian learning (synaptic weight updates) |
| `evolution.ts` | Done | Graph evolution (pruning, grafting, clustering) |
| `communication.ts` | Done | A2A package system |
| `embedding.ts` | Done | BES embeddings (Pollen Grains) |
| `safety.ts` | Done | Constitutional constraints, emergency controls |
| `worldmodel.ts` | Done | VAE world model for dreaming |
| `dreaming.ts` | Done | Dream-based policy optimization |
| `meta.ts` | Done | Pluripotent META tiles |
| `valuenetwork.ts` | Done | TD(lambda) value prediction |
| `succession.ts` | Done | Knowledge transfer protocol |
| `federated.ts` | Done | Federated learning coordinator |
| `meadow.ts` | Done | Community/knowledge sharing system |
| `protocol.ts` | Done | SPORE protocol implementation |
| `tile.ts` | Done | BaseTile with observation-based learning |
| `tiledreaming.ts` | Done | Tile dreaming for overnight optimization |
| `cacheutils.ts` | Done | Cache manipulation utilities |

### KV-Cache System (Phase 4/5 - NEW)

| Module | Status | Purpose |
|--------|--------|---------|
| `kvanchor.ts` | Done | KVCOMM-inspired anchor-based KV-cache communication |
| `ann-index.ts` | Done | Approximate Nearest Neighbor index (HNSW, LSH, Ball Tree) |
| `lmcache-adapter.ts` | Done | Bridge between POLLN KVAnchor and LMCache backend |
| `contextshare.ts` | Done | KVCOMM-inspired context sharing system |
| `kvtile.ts` | Done | Tile + KV Anchor bridge |
| `kvdream.ts` | Done | KV-cache + WorldModel dreaming integration |
| `kvfederated.ts` | Done | Privacy-aware federated anchor synchronization |
| `kvmeadow.ts` | Done | Community marketplace for KV anchors |

### Guardian Angel Safety System (Phase 4 Sprint 5)

| Module | Status | Purpose |
|--------|--------|---------|
| `guardian/types.ts` | Done | Guardian type definitions |
| `guardian/constraints.ts` | Done | 20+ built-in safety constraints |
| `guardian/guardian-agent.ts` | Done | GuardianAngelAgent class |
| `guardian/learning.ts` | Done | Adaptive learning system |
| `guardian/index.ts` | Done | Integration and exports |

### API Layer (`src/api/`)

| Module | Status | Purpose |
|--------|--------|---------|
| `index.ts` | Done | Main entry point with re-exports |
| `server.ts` | Done | WebSocket server implementation |
| `types.ts` | Done | API type definitions |
| `handlers.ts` | Done | Message processing logic |
| `middleware.ts` | Done | Authentication, rate limiting, validation |
| `openapi.yaml` | Done | OpenAPI 3.0.3 specification |

### CLI Tool (`src/cli/`)

| Module | Status | Purpose |
|--------|--------|---------|
| `index.ts` | Done | Main CLI entry point (Commander.js) |
| `commands/init.ts` | Done | Initialize colony command |
| `commands/status.ts` | Done | Colony status command |
| `commands/agents.ts` | Done | Agent management (list, spawn, kill) |
| `commands/dream.ts` | Done | Trigger dream cycle |
| `commands/sync.ts` | Done | Federation sync command |
| `commands/cache.ts` | Done | Cache management (stats, clear) |
| `utils/config.ts` | Done | Configuration management |
| `utils/colony-state.ts` | Done | Colony state management |
| `utils/output.ts` | Done | Terminal output formatting |

### Examples (`examples/`)

| Example | Status | Purpose |
|---------|--------|---------|
| `basic-colony/` | Done | Core concepts: colony, A2A, Plinko, Hebbian learning |
| `code-reviewer/` | Done | Value network, TD(lambda) learning for code quality |
| `kv-cache-demo/` | Done | KV-cache optimization with anchor-based compression |
| `research-assistant/` | Done | META tiles, dreaming, dynamic specialization |
| `guardian-angel-example.ts` | Done | Guardian safety system usage |

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
| **Value Network** | TD(lambda) predictions of state values |
| **Stigmergy** | Indirect coordination via environmental signals |
| **KV Anchor** | Compressed KV-cache segment for efficient reuse |
| **ANN Index** | Approximate Nearest Neighbor for fast similarity search |
| **Guardian Angel** | Safety agent with veto power over executions |

---

## Critical Patterns

### 1. Plinko Selection (Stochastic, Not Deterministic)

Never select the "best" option. Always sample probabilistically:

```typescript
// Temperature controls exploration vs exploitation
// High temp = explore more, Low temp = exploit best
const selected = plinkoLayer.select(proposals, temperature);
```

This enables **durability through diversity**--backup variants exist when conditions change.

### 2. Memory = Structure

The system doesn't store facts in a database. It stores stronger connections between agents that work well together:

```typescript
// Hebbian learning: "neurons that fire together, wire together"
hebbianLearning.update(sourceId, targetId, reward);
```

### 3. Traceability

Every A2A package has `parentIds` and `causalChainId`. Every decision is replayable.

### 4. Type Safety

- No `any` types without justification
- Use proper type assertions: `as unknown as TargetType`
- Handle `undefined` explicitly with `??` or null checks

---

## Exports Structure

Main entry points:

### `src/core/index.ts` (Core Library)
- Types: `A2APackage`, `PollenGrain`, `PlinkoDecision`, `SynapseConfig`
- Classes: `BaseAgent`, `Colony`, `PlinkoLayer`, `SafetyLayer`, `WorldModel`
- Federated: `FederatedLearningCoordinator`
- META: `MetaTile`, `MetaTileManager`
- Value: `ValueNetwork`, `ValueNetworkManager`
- Dreaming: `DreamBasedPolicyOptimizer`, `DreamManager`
- Meadow: `Meadow`, community types
- Tile System: `BaseTile`, `TilePipeline`, `TileLifecycleManager`
- KV-Cache: `KVAnchorPool`, `AnchorMatcher`, `OffsetPredictor`, `ANNIndex`
- LMCache: `LMCacheAdapter`, `KVCacheSerializer`, `PythonBridge`
- Guardian: `GuardianAngelAgent`, `GuardianLearningSystem`, all constraint types

### `src/api/index.ts` (WebSocket API)
- Server: `POLLNServer`, `createPOLLNServer`
- Types: All API message types
- Middleware: Authentication, rate limiting, validation
- Handlers: Message processing logic

---

## Test Structure

Tests live in `src/**/__tests__/*.test.ts`:

### Core Tests (`src/core/__tests__/`)
- `types.test.ts` - Core type validation
- `agents.test.ts` - Agent lifecycle
- `meta.test.ts` - META tile differentiation
- `valuenetwork.test.ts` - TD(lambda) learning
- `worldmodel.test.ts` - VAE world model
- `dreaming.test.ts` - Policy optimization
- `federated.test.ts` - Federated learning
- `meadow.test.ts` - Community system
- `tile.test.ts` - Tile system
- `tiledreaming.test.ts` - Overnight optimization
- `succession.test.ts` - Knowledge transfer
- `evolution.test.ts` - Graph evolution
- `cacheutils.test.ts` - Cache utilities
- `contextshare.test.ts` - Context sharing

### KV-Cache Tests
- `kvanchor.test.ts` - Anchor pool and matching
- `ann-index.test.ts` - ANN algorithms
- `lmcache-adapter.test.ts` - LMCache integration
- `kvtile.test.ts` - Tile-KV bridge
- `kvdream.test.ts` - Dream-KV integration
- `kvfederated.test.ts` - Federated KV sync
- `kvmeadow.test.ts` - Anchor marketplace

### Guardian Tests
- `guardian/__tests__/guardian.test.ts` - 31 tests, all passing

### Integration Tests (`src/core/__tests__/integration/`)
- `integration.test.ts` - Full system tests

### Mock LLM Tests (`src/core/__tests__/integration/llm/`)
- `agentLLM.integration.test.ts` - Agent with mock LLM
- `dreamCycle.integration.test.ts` - Dream cycle with mock
- `federatedLearning.integration.test.ts` - FL with mock
- `kvCache.integration.test.ts` - KV-cache with mock
- `workflows.integration.test.ts` - End-to-end workflows

### API Tests (`src/api/__tests__/`)
- `server.test.ts` - WebSocket server tests

### CLI Tests (`src/cli/__tests__/`)
- `cli.test.ts` - CLI unit tests
- `integration.test.ts` - CLI integration tests

---

## Reference Documentation

| Doc | Purpose |
|-----|---------|
| `docs/ROADMAP.md` | Phased development plan |
| `docs/ARCHITECTURE.md` | System architecture diagrams |
| `docs/GLM47_PLAN.md` | **YOUR TASK PLAN** |
| `docs/CLI_GUIDE.md` | CLI usage documentation |
| `docs/phase4-sprint5-guardian-angel.md` | Guardian implementation summary |
| `docs/research/QUICK_REFERENCE.md` | Research synthesis |
| `docs/research/pluripotent-agents-research.md` | META tile math foundations |
| `src/api/README.md` | WebSocket API client documentation |

---

## Current Development Phase

**Phase 4-5 Transition**: Production optimization and release preparation

### Recently Completed
- TypeScript build errors fixed (35 errors resolved)
- Guardian Angel Safety System (Phase 4 Sprint 5)
- KV-Cache communication (KVCOMM-inspired)
- ANN optimization for anchor matching
- LMCache adapter for distributed caching
- WebSocket API server
- CLI tool for colony management
- Example applications (4 complete demos)

### Known Issues
- 73 tests failing (mostly timeout-related in integration tests)
- Performance optimization needed
- Security hardening needed
- Documentation needs expansion

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

## Code Style Guidelines

### TypeScript
- Use strict type checking
- Prefer interfaces over type aliases for object shapes
- Use `readonly` for immutable properties
- Document public APIs with JSDoc comments

### Error Handling
- Use explicit error types
- Provide meaningful error messages
- Handle edge cases explicitly
- Never silently swallow errors

### Testing
- Write tests for all new functionality
- Use descriptive test names
- Group related tests with describe blocks
- Mock external dependencies

---

*Repository: https://github.com/SuperInstance/polln*
*Last Updated: 2026-03-07*
*Updated by: GLM 5 Planning Agent for GLM 4.7 Multi-Agents*

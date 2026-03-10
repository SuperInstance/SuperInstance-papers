# Core Runtime

**Status**: Foundation Layer | **Maturity**: Production-Ready | **Tests**: 821

## What Is This Directory?

The `src/core/` directory contains the **foundational building blocks** of POLLN. Everything else in the project builds on these primitives. This is the "standard library" for the Pattern-Organized Large Language Network.

## For Future Agents: Read This First

```
┌─────────────────────────────────────────────────────────────────────┐
│                    START HERE TO UNDERSTAND CORE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   1. types.ts        ◀── ALL type definitions (READ FIRST)          │
│   2. agent.ts        ◀── BaseAgent abstract class                   │
│   3. agents.ts       ◀── TaskAgent, RoleAgent, CoreAgent            │
│   4. colony.ts       ◀── Colony (agent collection manager)          │
│                                                                      │
│   Then explore subsystems:                                           │
│   5. dreaming.ts     ◀── Dream-based policy optimization            │
│   6. worldmodel.ts   ◀── Predictive world model                     │
│   7. kvanchor.ts     ◀── KV-Cache anchor system                     │
│   8. federated.ts    ◀── Federated learning                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         POLLN CORE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│   │   Agent     │    │   Colony    │    │   World     │             │
│   │   System    │───▶│   Manager   │◀───│   Model     │             │
│   └─────────────┘    └─────────────┘    └─────────────┘             │
│         │                  │                  │                      │
│         ▼                  ▼                  ▼                      │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│   │  KV-Cache   │    │ Distributed │    │  Guardian   │             │
│   │   System    │    │Coordination │    │   Angel     │             │
│   └─────────────┘    └─────────────┘    └─────────────┘             │
│         │                  │                  │                      │
│         └──────────────────┼──────────────────┘                      │
│                            ▼                                         │
│                    ┌─────────────┐                                   │
│                    │  Bytecode   │                                   │
│                    │   Bridge    │                                   │
│                    └─────────────┘                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Files Explained

### Agent System

| File | What It Does | Key Exports |
|------|--------------|-------------|
| `types.ts` | ALL type definitions for entire system | `AgentConfig`, `AgentState`, `A2APackage`, `PrivacyLevel`, `SubsumptionLayer` |
| `agent.ts` | Abstract base class for all agents | `BaseAgent` |
| `agents.ts` | Concrete agent implementations | `TaskAgent`, `RoleAgent`, `CoreAgent` |
| `colony.ts` | Manages collection of agents | `Colony`, `ColonyConfig`, `ColonyStats` |
| `tile.ts` | Tile categories | `TileCategory` enum |
| `meta.ts` | Pluripotent tiles | `MetaTile`, `MetaTileManager` |

### Communication

| File | What It Does | Key Exports |
|------|--------------|-------------|
| `communication.ts` | Agent-to-agent messaging | `A2APackageSystem` |
| `protocol.ts` | SPORE protocol | Agent lifecycle protocol |
| `embedding.ts` | Embedding utilities | `BES` (Behavioral Embedding System) |

### Decision & Learning

| File | What It Does | Key Exports |
|------|--------------|-------------|
| `decision.ts` | Plinko logic for probabilistic selection | `PlinkoLayer` |
| `learning.ts` | Learning utilities | Various learning helpers |
| `valuenetwork.ts` | Value function network | `ValueNetwork`, `ValueNetworkManager` |
| `evolution.ts` | Agent evolution over time | Evolution strategies |

### World Model & Dreaming

| File | What It Does | Key Exports |
|------|--------------|-------------|
| `worldmodel.ts` | Predictive world model | `WorldModel` |
| `dreaming.ts` | Sleep-phase optimization | `DreamBasedPolicyOptimizer`, `DreamManager` |
| `tiledreaming.ts` | Tile-level dreaming | Tile dream optimization |

### Safety & Lifecycle

| File | What It Does | Key Exports |
|------|--------------|-------------|
| `safety.ts` | Safety constraints | `SafetyLayer` |
| `succession.ts` | Knowledge transfer | `KnowledgeSuccessionManager`, `KnowledgeStage` |

### Federated & Meadow

| File | What It Does | Key Exports |
|------|--------------|-------------|
| `federated.ts` | Federated learning coordinator | `FederatedLearningCoordinator` |
| `meadow.ts` | Community knowledge sharing | `Meadow` |

### KV-Cache System (Phase 4)

| File | What It Does | Key Exports |
|------|--------------|-------------|
| `kvtypes.ts` | KV-Cache type definitions | `KVAnchor`, `KVSegment`, etc. |
| `kvanchor.ts` | Anchor-based caching | `KVAnchorPool`, `KVAnchor` |
| `kvmeadow.ts` | Meadow cache integration | Meadow KV support |
| `kvtile.ts` | Tile cache integration | Tile-KV composition |
| `kvdream.ts` | Dream KV management | World model cache |
| `kvfederated.ts` | Federated KV sync | Cross-colony cache |
| `cacheutils.ts` | Cache utilities | `CacheSlicer`, `CacheConcatenator` |
| `ann-index.ts` | Approximate nearest neighbor | ANN for cache lookup |
| `lmcache-adapter.ts` | LMCache integration | External cache adapter |

## Agent Hierarchy

```
BaseAgent (abstract) - src/core/agent.ts
    │
    ├── TaskAgent (EPHEMERAL)
    │   └── Born → Execute → Die (no succession)
    │   └── Use for: One-shot tasks
    │
    ├── RoleAgent (ROLE)
    │   └── Learn → Execute → Transfer → Die
    │   └── Use for: Ongoing responsibilities
    │
    └── CoreAgent (CORE)
        └── Slow wisdom → Backup → Rarely replaced
        └── Use for: System-critical functions
```

## KV-Cache Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         COLONY                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   KV-ANCHOR LAYER                        ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        ││
│  │  │ AnchorPool │  │OffsetPred │  │ContextShare│        ││
│  │  └────────────┘  └────────────┘  └────────────┘        ││
│  └─────────────────────────────────────────────────────────┘│
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Tiles     │    │ WorldModel  │    │ ValueNet    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### KV-Cache Patterns

1. **KV Proximity**: Similar embeddings share KV patterns
2. **Offset Proximity**: Predictable changes under prefix modifications
3. **Anchor-Based Communication**: Three-phase matching/reuse/prediction

## Subsystems (Subdirectories)

### `distributed/` - Multi-node Coordination

| File | Purpose |
|------|---------|
| `index.ts` | Module entry point |
| `types.ts` | Distributed types |
| `backend.ts` | Backend abstraction (Memory, Redis, NATS) |
| `discovery.ts` | Service discovery |
| `federation.ts` | Federation protocol |
| `pheromones.ts` | Stigmergic coordination |

### `guardian/` - Safety System

| File | Purpose |
|------|---------|
| `index.ts` | Module entry point |
| `types.ts` | Guardian types |
| `constraints.ts` | Safety constraints |
| `learning.ts` | Guardian learning |
| `guardian-agent.ts` | Guardian implementation |

### `bytecode/` - Tile Compilation

| File | Purpose |
|------|---------|
| `index.ts` | Module entry point |
| `types.ts` | Bytecode types |
| `compiler.ts` | Tile → Bytecode compiler |
| `executor.ts` | Bytecode runner |
| `stability-analyzer.ts` | Safety checks |

### `colony-manager/` - Colony Orchestration

| File | Purpose |
|------|---------|
| `types.ts` | Manager types |
| `orchestrator.ts` | Colony orchestration |
| `scheduler.ts` | Task scheduling |
| `load-balancer.ts` | Load distribution |
| `resource-tracker.ts` | Resource monitoring |

### `federation/` - Federated Learning

| File | Purpose |
|------|---------|
| `strategies/fed-avg.ts` | Federated averaging |
| `strategies/fed-prox.ts` | FedProx algorithm |
| `strategies/fed-async.ts` | Async federation |
| `fault/` | Fault tolerance |
| `network/` | Network layer |
| `privacy/` | Privacy preservation |

### `security/` - Security

| File | Purpose |
|------|---------|
| `audit.ts` | Security auditing |
| `crypto.ts` | Cryptographic utilities |

### `tiles/` - Tile Subsystem

| File | Purpose |
|------|---------|
| `index.ts` | Tile exports |
| `transformer.ts` | Data transformation |
| `accumulator.ts` | State accumulation |
| `validator.ts` | Input validation |
| `router.ts` | Message routing |

### `hydraulic/` - Load Balancing

| File | Purpose |
|------|---------|
| `types.ts` | Hydraulic types |
| `pressure-sensor.ts` | Load detection |
| `flow-monitor.ts` | Flow monitoring |

## Data Flow

```
User Request
     │
     ▼
┌─────────────┐
│   Colony    │ ◀── Manages agents
└─────────────┘
     │
     ▼
┌─────────────┐
│   Agent     │ ◀── Processes request
└─────────────┘
     │
     ├──▶ World Model (predict outcomes)
     ├──▶ Decision (choose action via Plinko)
     ├──▶ Guardian (check safety constraints)
     │
     ▼
┌─────────────┐
│  KV-Cache   │ ◀── Caches context for reuse
└─────────────┘
     │
     ▼
┌─────────────┐
│   Output    │ ──▶ Response to user
└─────────────┘
     │
     ▼
┌─────────────┐
│  Dreaming   │ ◀── Offline policy optimization
└─────────────┘
```

## Main Exports

```typescript
import {
  // Agents
  BaseAgent, TaskAgent, RoleAgent, CoreAgent, TileCategory,

  // Tiles
  MetaTile, MetaTileManager,

  // Communication
  A2APackage, A2APackageSystem,

  // Learning
  HebbianLearning, BES,

  // Decision
  PlinkoLayer,

  // World Model
  WorldModel, DreamBasedPolicyOptimizer, DreamManager,

  // Value Network
  ValueNetwork, ValueNetworkManager,

  // Safety
  SafetyLayer,

  // Lifecycle
  KnowledgeSuccessionManager, KnowledgeStage,

  // Colony
  Colony,

  // Federated
  FederatedLearningCoordinator,

  // Meadow
  Meadow,

  // KV-Cache
  KVAnchorPool, KVAnchor, KVSegment,
  CacheSlicer, CacheConcatenator, CacheReplacer,
  SharedContextManager, ContextReusePolicy,
} from './core';
```

## Testing

```bash
# Run all 821 core tests
npm test

# With coverage
npm test -- --coverage

# Specific subsystem
npm test -- --testPathPattern=kv  # KV-cache tests
npm test -- --testPathPattern=agent  # Agent tests
npm test -- --testPathPattern=dream  # Dream tests
```

## Performance Optimization

Optimized variants exist for hot paths:

| Original | Optimized | When To Use |
|----------|-----------|-------------|
| `embedding.ts` | `embedding-optimized.ts` | Production, high-volume |
| `decision.ts` | `decision-optimized.ts` | Production, high-volume |
| `worldmodel.ts` | `worldmodel-optimized.ts` | Production, high-volume |

## Configuration Tiers

Located in `config/tiers/`:

| Tier | Agents | Memory | Use Case |
|------|--------|--------|----------|
| Tiny | 10 | 512MB | Development |
| Small | 50 | 2GB | Testing |
| Medium | 200 | 8GB | Production |
| Large | 1000 | 32GB | Enterprise |

## Common Patterns

### Create and Use an Agent

```typescript
import { TaskAgent, Colony } from './core';

// Create colony
const colony = new Colony({
  id: 'my-colony',
  gardenerId: 'user-001',
  name: 'Production',
  maxAgents: 100
});

// Create agent
const agent = new TaskAgent({
  id: 'task-001',
  typeId: 'sentiment',
  categoryId: 'nlp',
  modelFamily: 'smallml',
  inputTopics: ['text'],
  outputTopic: 'sentiment'
});

// Initialize and process
await agent.initialize();
const result = await agent.process(input);
await agent.shutdown();
```

### Use KV-Cache

```typescript
import { KVAnchorPool, ANNIndex } from './core';

// Create pool
const pool = new KVAnchorPool({ maxSize: 1000 });

// Create anchor
const anchor = pool.createAnchor({
  prefix: 'system-prompt',
  kvCache: cachedState
});

// Lookup similar
const index = new ANNIndex({ dimension: 768 });
const similar = await index.query(embedding, 5);
```

### Enable Distributed Mode

```typescript
const colony = new Colony({
  id: 'distributed-colony',
  distributed: true,
  distributedConfig: {
    backend: 'redis',
    connectionString: 'redis://localhost:6379'
  }
});
```

## Dependencies

```
src/core/
    │
    ├── External ──▶ uuid (IDs), events (EventEmitter)
    │
    └── Internal ──▶ All other modules depend on core
                     src/agents/ depends on core/agent.ts
                     src/spreadsheet/ depends on core/types.ts
```

## See Also

- `src/agents/README.md` - Specialized agents
- `src/spreadsheet/tiles/README.md` - Tile system
- `docs/research/smp-paper/` - SMP paradigm
- `PROJECT_AUDIT.md` - Project status

---

*Part of POLLN - Pattern-Organized Large Language Network*
*SuperInstance.AI | MIT License*

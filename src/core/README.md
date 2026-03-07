# Core Runtime

The foundational layer of POLLN - implements the agent runtime, communication, learning, KV-cache, and safety systems.

**Total Tests: 821**

## Components

### Agent System
| File | Purpose |
|------|---------|
| `types.ts` | Core type definitions for the entire system |
| `agent.ts` | BaseAgent abstract class |
| `agents.ts` | Concrete agents: TaskAgent, RoleAgent, CoreAgent |
| `colony.ts` | Colony management and agent coordination |
| `tile.ts` | Tile categories (EPHEMERAL, ROLE, CORE) |
| `meta.ts` | MetaTile - pluripotent agents that differentiate based on signals |

### Communication
| File | Purpose |
|------|---------|
| `communication.ts` | A2A package system for agent-to-agent messaging |
| `protocol.ts` | SPORE protocol for agent lifecycle |
| `embedding.ts` | BES (Behavioral Embedding Space) with differential privacy |

### Decision & Learning
| File | Purpose |
|------|---------|
| `decision.ts` | Plinko layer - probabilistic selection with temperature |
| `learning.ts` | Hebbian learning with Oja's rule normalization |
| `evolution.ts` | Graph evolution - pruning, grafting, clustering |

### World Model & Dreaming
| File | Purpose |
|------|---------|
| `worldmodel.ts` | VAE world model for state prediction |
| `dreaming.ts` | Dream-based policy optimization |
| `valuenetwork.ts` | TD(λ) value predictions |

### Safety & Constraints
| File | Purpose |
|------|---------|
| `safety.ts` | Constitutional constraints and safety layer |

### Federated Learning
| File | Purpose |
|------|---------|
| `federated.ts` | Federated learning coordinator with privacy tiers |
| `meadow.ts` | Community system for knowledge sharing |
| `succession.ts` | Knowledge transfer protocol |

### KV-Cache System (Phase 4)
| File | Purpose |
|------|---------|
| `kvtypes.ts` | Core KV-cache type definitions |
| `kvanchor.ts` | KVAnchorPool with clustering, LRU eviction, compression |
| `kvfederated.ts` | Privacy-aware cross-colony KV sync |
| `kvdream.ts` | Dream KV management for world model |
| `kvmeadow.ts` | KV marketplace for Meadow system |
| `kvtile.ts` | Tile-KV bridge for cache-aware execution |
| `cacheutils.ts` | Cache manipulation utilities (slice, concat, replace) |
| `contextshare.ts` | Cross-agent context sharing |

## Key Types

```typescript
// Tile Categories (lifespans)
enum TileCategory {
  EPHEMERAL = 'EPHEMERAL',  // Task-bound (minutes-hours)
  ROLE = 'ROLE',            // Performance-bound (days-weeks)
  CORE = 'CORE',            // Long-lived (months-years)
}

// Knowledge Stages (maturity)
enum KnowledgeStage {
  EPHEMERAL = 'EPHEMERAL',  // < 100 executions
  WORKING = 'WORKING',      // 100-1000 executions
  EMBEDDED = 'EMBEDDED',    // > 1000 executions
  FOSSIL = 'FOSSIL',        // Archived
}

// Privacy Levels
enum PrivacyLevel {
  PUBLIC = 'PUBLIC',
  COLONY = 'COLONY',
  PRIVATE = 'PRIVATE'
}

// Subsumption Layers
enum SubsumptionLayer {
  SAFETY = 'SAFETY',       // Layer 0: Instant override
  REFLEX = 'REFLEX',       // Layer 1: Fast reactions
  HABITUAL = 'HABITUAL',   // Layer 2: Learned routines
  DELIBERATE = 'DELIBERATE' // Layer 3: Slow planning
}
```

## Agent Hierarchy

```
BaseAgent (abstract)
    │
    ├── TaskAgent (EPHEMERAL)
    │   └── Born → Execute → Die (no succession)
    │
    ├── RoleAgent (ROLE)
    │   └── Learn → Execute → Transfer → Die
    │
    └── CoreAgent (CORE)
        └── Slow wisdom → Backup → Rarely replaced
```

## KV-Cache Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         COLONY                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   KV-ANCHOR LAYER                        ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        ││
│  │  │AnchorPool  │  │OffsetPred  │  │ContextShare│        ││
│  │  └────────────┘  └────────────┘  └────────────┘        ││
│  └─────────────────────────────────────────────────────────┘│
│         │                  │                  │               │
│         ▼                  ▼                  ▼               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Tiles     │    │ WorldModel  │    │ ValueNet    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### KV-Cache Patterns
- **KV Proximity**: Similar embeddings share KV patterns
- **Offset Proximity**: Predictable changes under prefix modifications
- **Anchor-Based Communication**: Three-phase matching/reuse/prediction

## Tests

All core components have comprehensive tests in `__tests__/`:

```bash
npm test                    # Run all 821 tests
npm test -- --coverage      # With coverage
npm test -- --testPathPattern=kv  # Run KV-cache tests only
```

## Exports

Main exports are available via `index.ts`:

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

---
*Part of POLLN - Pattern-Organized Large Language Network*

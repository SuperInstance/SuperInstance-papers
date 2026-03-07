# Source Directory

TypeScript implementation of the POLLN distributed intelligence system.

## Structure

```
src/
├── core/              # Core runtime (821 tests)
│   ├── agent.ts       # Base agent class
│   ├── agents.ts      # TaskAgent, RoleAgent, CoreAgent
│   ├── colony.ts      # Colony management
│   ├── tile.ts        # Tile categories
│   ├── meta.ts        # META tiles (pluripotent agents)
│   ├── decision.ts    # Plinko stochastic selection
│   ├── learning.ts    # Hebbian learning
│   ├── evolution.ts   # Graph evolution
│   ├── worldmodel.ts  # VAE world model
│   ├── dreaming.ts    # Dream-based optimization
│   ├── valuenetwork.ts # TD(λ) predictions
│   ├── federated.ts   # Federated learning
│   ├── meadow.ts      # Community system
│   ├── kvanchor.ts    # KV-cache anchor pool
│   ├── kvfederated.ts # Federated KV sync
│   ├── kvdream.ts     # Dream KV management
│   ├── kvmeadow.ts    # KV marketplace
│   ├── kvtile.ts      # Tile-KV bridge
│   ├── cacheutils.ts  # Cache utilities
│   └── contextshare.ts # Context sharing
│
└── coordination/      # Coordination patterns
    └── stigmergy.ts   # Pheromone coordination
```

## Module Categories

### Agent System
| Module | Purpose | Tests |
|--------|---------|-------|
| `agent.ts` | BaseAgent with lifecycle | 18 |
| `agents.ts` | TaskAgent, RoleAgent, CoreAgent | 24 |
| `colony.ts` | Colony management | 16 |
| `tile.ts` | Tile categories | 24 |
| `meta.ts` | Pluripotent META tiles | 18 |

### Decision & Learning
| Module | Purpose | Tests |
|--------|---------|-------|
| `decision.ts` | Plinko stochastic selection | 12 |
| `learning.ts` | Hebbian weight updates | 14 |
| `evolution.ts` | Graph pruning/grafting | 16 |

### World Model & Dreaming
| Module | Purpose | Tests |
|--------|---------|-------|
| `worldmodel.ts` | VAE world model | 26 |
| `dreaming.ts` | Dream-based optimization | 53 |
| `valuenetwork.ts` | TD(λ) predictions | 20 |

### Federated & Community
| Module | Purpose | Tests |
|--------|---------|-------|
| `federated.ts` | Federated learning | 32 |
| `meadow.ts` | Community system | 87 |
| `succession.ts` | Knowledge transfer | 14 |

### KV-Cache System (Phase 4)
| Module | Purpose | Tests |
|--------|---------|-------|
| `kvanchor.ts` | Anchor pool with clustering | 58 |
| `kvfederated.ts` | Privacy-aware sync | 32 |
| `kvdream.ts` | Dream cache management | 53 |
| `kvmeadow.ts` | KV marketplace | 87 |
| `kvtile.ts` | Tile-KV bridge | 43 |
| `cacheutils.ts` | Cache utilities | 91 |
| `contextshare.ts` | Context sharing | 37 |

## Import Paths

```typescript
// Core components
import {
  Colony, TaskAgent, HebbianLearning,
  KVAnchorPool, CacheSlicer, SharedContextManager,
} from './core';

// Coordination patterns
import { Stigmergy } from './coordination';
```

## Running Tests

```bash
# Run all tests (821 tests)
npm test

# Run core tests only
npm test -- --testPathPattern=core

# Run with coverage
npm run test:coverage
```

## Building

```bash
npm run build    # Compile to dist/
npm run dev      # Watch mode
```

---

*Part of POLLN - Pattern-Organized Large Language Network*

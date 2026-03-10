# Tile System

The core tile system implements the **Smp (Seed-model-prompt)** paradigm for decomposing LLM agents into visible, inspectable, improvable tiles.

## Directory Structure

```
tiles/
├── core/                    # Core interfaces and composition
│   ├── Tile.ts              # Base tile interface
│   ├── TileChain.ts         # Pipeline composition
│   ├── Registry.ts           # Discovery & registration
│   └── index.ts              # Exports
│
├── backend/               # Distributed execution
│   ├── TileWorker.ts        # Multi-process tile execution
│   ├── TileCache.ts         # KV-cache for results
│   └── TileCompiler.ts      # Tile compilation
│
├── monitoring/             # Real-time metrics
│   ├── zone-monitor.ts
│   └── examples.ts
│
├── tracing/                # Execution tracing
│   ├── tile-tracer.ts
│   └── example.ts
│
├── examples/                # Example tiles
│   ├── SentimentTile.ts
│   └── FraudDetectionTile.ts
│
├── tests/                  # Integration tests
│   └── integration.test.ts
│
├── confidence-cascade.ts    # Three-zone model
├── stigmergy.ts              # Stigmergic coordination
├── tile-memory.ts          # L1-L4 memory hierarchy
├── composition-validator.ts  # Algebraic validation
├── counterfactual.ts          # Parallel simulation
├── cross-modal.ts           # Multi-modal tiles
└── federated-tile.ts       # Federated learning
```

## Core Concepts

- **Tile** = (I, O, f, c, τ) = Input, Output, discriminate, confidence, trace
- **Three-Zone Model**: GREEN (≥0.90), YELLOW (0.75-0.89), RED (<0.75)
- **Confidence Flow**: Sequential multiplies, parallel averages

## Usage
```typescript
import { Tile, Schemas, classifyZone } from './core/Tile';
import { TileChain } from './core/TileChain';

import { TileRegistry } from './core/Registry';

import { ConfidenceCascade } from './confidence-cascade';

import { StigmergicCoordinator } from './stigmergy';
```

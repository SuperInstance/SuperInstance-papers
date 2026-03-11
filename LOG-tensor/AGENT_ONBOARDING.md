# Agent Onboarding Documentation
## POLLN-RTT Research Project - For Fresh Agents

---

## Quick Start

Welcome to the POLLN-RTT research project! This document summarizes 6 rounds of research to get you up to speed quickly.

---

## Project Overview

**Goal:** Create a unified mathematical framework for "ghost tiles" - computational elements that can be reconstructed from compact seeds without storing full content.

**Core Equation:**
```
Result = Reconstruct(Seed, Context, Time)
```

---

## Research History Summary

| Round | Focus | Key Discovery |
|-------|-------|---------------|
| 1-4 | LOG Principle | Origin = Self = Reference Frame |
| 5 | Ghost Tiles Phase 1 | Seed-based deterministic programs |
| 5.5 | Ghost Tiles Phase 2 | Mathematical optimization via API simulation |
| 6 | Deep Synthesis | Unified seed framework across 5 domains |

---

## Core Concepts

### 1. The Seed (Most Important)

A seed is NOT data - it's a RECONSTRUCTION KEY. Five interpretations:

| Perspective | Seed As | Operation |
|-------------|---------|-----------|
| Penrose Geometry | 5D hyperlattice coordinate | Direct position jump O(1) |
| Holographic Physics | Boundary operator | Bulk reconstruction O(N²) |
| Biological Systems | Attractor state | Convergence to stability |
| MoE Architecture | Router configuration | Expert selection O(k) |
| Distributed Systems | Timing marker | Phase coordination |

**Unified Seed Structure:**
```typescript
interface UnifiedSeed {
  hypercoordinate: [number, number, number, number, number];  // 5D position
  boundaryOperator?: { dimension: number; position: number[]; value: number };
  attractorState?: { stability: number; convergenceRate: number };
  routerConfig?: { expertIndices: number[]; weights: number[] };
  timingPhase?: { mode: 'sync' | 'async'; epoch: number };
}
```

### 2. Speedup Mechanisms

| Method | Baseline | Optimized | Speedup |
|--------|----------|-----------|---------|
| Penrose jump | O(d) | O(1) | ~100x |
| Holographic entropy | O(2^N) | O(L²) | Exponential→Polynomial |
| Biological reflex | O(centralized) | O(distributed) | 16x latency, 50x energy |
| MoE routing | O(N) | O(k) | N/k |
| Async computation | max(T) | avg(T) | Variance-dependent |

### 3. Key Domains

**Penrose Geometry:**
- 5D hyperlattice → 2D projection
- Ammann bars = navigation system
- Fibonacci word structure
- Golden ratio φ = (1+√5)/2

**Holographic Physics:**
- Bulk-boundary duality (AdS/CFT)
- Ryu-Takayanagi: S = Area/(4G)
- Information scales with area, not volume
- Exponential speedup for entropy queries

**Biological Learning:**
- Balance without thinking (non-cognitive)
- Proprioceptive memory (muscle storage)
- Vestibular reference frame (inner ear)
- Distributed computation (spinal reflexes)

**MoE Architecture:**
- Mixture of Experts with sparse routing
- Only activate what you need
- Optimal expert count: 8-16
- Decomposition criteria: mutual information

**Sync/Async Timing:**
- Synchronous: correctness, coherence
- Asynchronous: speed, fault tolerance
- Hybrid: adaptive based on workload
- Decision: coordination ratio > 0.1 → async

---

## Research Files to Read

**Essential (Read First):**
1. `ROUND6_COMPREHENSIVE_SYNTHESIS.md` - Full synthesis
2. `a2a_communications/inter_agent_discussions.md` - Agent perspectives
3. `SCHEMA_IMPROVEMENTS.json` - Current schemas

**Domain-Specific:**
4. `penrose/penrose_geometry_research.md` - Penrose math
5. `holographic/holographic_math_research.md` - AdS/CFT
6. `biological/biological_learning_research.md` - Non-cognitive
7. `tile_science/tile_decomposition_research.md` - MoE
8. `sync_async/sync_async_research.md` - Timing

**Previous Rounds:**
9. `../round5/GHOST_TILE_SYNTHESIS.pdf` - Phase 2 results
10. `../round5/log_principle_formalization.md` - LOG principle

---

## Active Research Questions

| ID | Question | Priority | Dependencies |
|----|----------|----------|--------------|
| RQ-001 | Can Penrose coordinates translate to holographic operators? | High | None |
| RQ-002 | What is the tile analog of Planck scale? | Medium | RQ-001 |
| RQ-003 | Can quantum computers find minimal surfaces faster? | Medium | RQ-002 |
| RQ-004 | How to compose seeds for complex patterns? | High | None |
| RQ-005 | Optimal cache eviction for holographic tiles? | Medium | None |

---

## Implementation Status

**Completed:**
- [x] LOGTensor class (origin-relative coordinates)
- [x] GhostTileRegistry (seed storage)
- [x] Basic ghost tiles (sector, bearing, attention)
- [x] API simulation framework
- [x] Multi-agent research synthesis

**In Progress:**
- [ ] Unified seed implementation
- [ ] Holographic reconstruction engine
- [ ] Biological-style reflex tiles

**Future:**
- [ ] Benchmarking suite
- [ ] Scaling tests
- [ ] Fault tolerance validation

---

## API Keys Available

| API | Key | Use Case |
|-----|-----|----------|
| DeepSeek | `your_api_key_here` | Mathematical proofs, cheap iteration |
| DeepInfra | `hwzojVZn1SRQJs7LCa0uNazVE0BgzVz2` | Multi-model comparison |
| Moonshot | `your_api_key_here` | Via DeepInfra |

**Usage Guidelines:**
- Use for synthesis, not basic computation
- Combine multiple perspectives in prompts
- Document token usage for budget tracking

---

## Agent Communication Protocol

**A2A Package Format:**
```json
{
  "id": "msg_xxx",
  "sender_id": "AGENT_NAME",
  "receiver_id": "TARGET_AGENT or ALL",
  "payload_type": "seed | pattern | query | result",
  "payload": { ... },
  "causal_chain_id": "chain_xxx"
}
```

**Agent Specializations:**
- PENELOPE: Penrose geometry, spatial math
- HOLON: Holographic physics, bulk-boundary
- BIORA: Biological systems, non-cognitive learning
- TESSERA: Architecture, decomposition
- CHRONOS: Timing, synchronization

---

## Coding Conventions

**File Organization:**
```
/src/lib/log/
├── core/           # Core classes (LOGTensor, GhostTileRegistry)
├── tiles/          # Ghost tile implementations
├── simulation/     # API simulation framework
└── utils/          # SectorUtils, etc.

/download/polln_research/
├── round5/         # Phase 1 & 2 results
└── round6/         # Deep synthesis results
```

**Naming:**
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`

**TypeScript Patterns:**
```typescript
// Prefer interface over type for objects
interface GhostTile { ... }

// Use bigint for 64-bit seeds
type Seed = bigint;

// Use Float64Array for numerical data
const positions = new Float64Array(100);

// Use Map for dynamic key-value storage
const registry = new Map<string, GhostTile>();
```

---

## Next Steps for New Agents

1. **Read the synthesis document** (`ROUND6_COMPREHENSIVE_SYNTHESIS.md`)
2. **Choose a domain** to specialize in
3. **Identify research questions** from the list above
4. **Run simulations** using API keys for validation
5. **Document findings** in the appropriate folder
6. **Communicate** via A2A protocol with other agents

---

*Onboarding documentation v1.0*
*Last updated: Round 6 completion*

# Implementation Agent Onboarding Guide
## POLLN-RTT Research Project

**Version:** 2.0
**Last Updated:** 2024
**Minimum Reading Time:** 30 minutes (Quick Start) + Additional for Deep Dive

---

## Table of Contents

1. [Quick Start Guide](#1-quick-start-guide)
2. [Architecture Deep Dive](#2-architecture-deep-dive)
3. [Implementation Standards](#3-implementation-standards)
4. [Roadmap and Priorities](#4-roadmap-and-priorities)
5. [Quality Assurance](#5-quality-assurance)
6. [Communication Protocols](#6-communication-protocols)
7. [Templates and Checklists](#7-templates-and-checklists)
8. [Reference Materials](#8-reference-materials)

---

## 1. Quick Start Guide

### 1.1 30-Minute Overview

Welcome to the POLLN-RTT research project! This guide will get you productive in 30 minutes.

#### What We're Building

We are creating a revolutionary mathematical framework for **Ghost Tiles** - computational elements that can be reconstructed from compact 64-bit seeds without storing full content. This enables massive performance improvements (100-500x) over traditional transformer implementations.

#### The Core Insight

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ORIGIN = SELF = REFERENCE FRAME                               │
│                                                                 │
│   All computation measures change from a reference point.       │
│   A seed is NOT data - it's a RECONSTRUCTION KEY.              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Core Equation

```
Result = Reconstruct(Seed, Context, Time)

Ghost Tile = Seed + Prompt + Deterministic Computation
```

#### Key Concepts Summary

| Concept | Traditional Approach | LOG Approach | Speedup |
|---------|---------------------|--------------|---------|
| Coordinates | Absolute positions | Origin-relative | 1.5x |
| Tiling | Arbitrary chunks | Base-12/360 divisions | 2x |
| Computation | Neural network weights | Deterministic seeds | 10-100x |
| Quantization | FP32/FP16 | FP8 block-wise | 2x |
| Attention | Full KV cache | MLA compression | 5.76x |

#### First Steps Checklist

- [ ] Read this Quick Start Guide (10 minutes)
- [ ] Review `ROUND5_SYNTHESIS.md` for complete context (15 minutes)
- [ ] Examine `ghost_seed_schema.json` for data structures (5 minutes)
- [ ] Look at `tile_schema.json` for tile definitions (5 minutes)
- [ ] Clone the repository and run `npm install`
- [ ] Review `/src/lib/log/` directory structure
- [ ] Join the agent communication channel

### 1.2 Essential File Locations

```
/home/z/my-project/
├── src/lib/log/                    # Core implementation
│   ├── core/                       # LOGTensor, GhostTileRegistry
│   ├── tiles/                      # Ghost tile implementations
│   ├── simulation/                 # API simulation framework
│   └── utils/                      # SectorUtils, helpers
│
├── download/polln_research/        # Research documentation
│   ├── round5/                     # Phase 1 & 2 results
│   │   ├── ROUND5_SYNTHESIS.md     # START HERE
│   │   ├── ROUND5_FRAMEWORK.md     # Research framework
│   │   ├── schemas/                # JSON schemas
│   │   ├── seed_theory/            # Seed mathematics
│   │   └── iterations/             # Research iterations
│   └── round6/                     # Deep synthesis results
│       ├── ROUND6_COMPREHENSIVE_SYNTHESIS.md
│       ├── AGENT_ONBOARDING.md
│       └── [domain-specific research]
│
└── worklog.md                      # Implementation history
```

### 1.3 Agent Specializations

The project has five specialized research domains. Choose one to focus on:

| Agent | Domain | Focus Area |
|-------|--------|------------|
| PENELOPE | Penrose Geometry | 5D hyperlattice, Ammann bars, Fibonacci patterns |
| HOLON | Holographic Physics | Bulk-boundary duality, RT formula, entropy queries |
| BIORA | Biological Systems | Non-cognitive balance, proprioceptive memory |
| TESSERA | Tile Architecture | MoE decomposition, specialist vs generalist |
| CHRONOS | Timing Systems | Sync vs async, pre-computation vs on-demand |

---

## 2. Architecture Deep Dive

### 2.1 LOG-Tensor Architecture

The LOG (Logical-Origin-Geometry) Tensor is the foundational data structure for our system.

#### Core Principles

1. **Origin-First Design**: Every tensor operation measures change from a reference point
2. **Orientation Encoding**: Direction baked into tensor structure, not computed
3. **Base-12/360 Architecture**: Tile-friendly mathematics for cache optimization
4. **In-View/Out-of-View**: Attention partitioned by geometric relevance

#### Mathematical Foundation

**Origin-Relative Transform:**
```
T_o(p) = p - o = Δp
```

**Origin-Relative Attention:**
```
Attention_o(Q, K, V) = softmax(Q_rel · K_rel^T / √d) · V_rel + o
```

**Sector Assignment (Base-12):**
```
sector = floor(angle(p - o) / (2π / base)) mod base
```

#### LOGTensor Class Structure

```typescript
interface LOGTensorConfig {
  origin: Float64Array;           // Reference point coordinates
  frame: Quaternion;              // Orientation reference frame
  dimensions: number;             // Spatial dimensions (2 or 3)
  base: 12 | 60 | 360;           // Angular base
  sectors: Sector[];              // Sector definitions
}

class LOGTensor {
  private origin: Float64Array;
  private frame: Quaternion;
  private sectors: Map<number, Sector>;

  // Core operations
  transform(p: Float64Array): Float64Array;  // Origin-relative transform
  sector(p: Float64Array): number;            // Sector assignment
  attention(Q, K, V): Float64Array;           // LOG attention

  // Utility methods
  clone(): LOGTensor;
  translate(delta: Float64Array): void;
  rotate(q: Quaternion): void;
}
```

#### Performance Implications

| Operation | Traditional | LOG-Optimized | Speedup Factor |
|-----------|-------------|---------------|----------------|
| Coordinate transform | O(n) per point | O(1) per point | 1.5x |
| Sector computation | atan2 + division | Integer operations | 57x |
| Attention scoring | Full matrix | Sector-partitioned | 2-5x |
| Cache efficiency | Random access | Tile-aligned | 2x |

### 2.2 Ghost Tile System

Ghost Tiles are deterministic, seed-based computational units that replace neural network components.

#### Definition

A Ghost Tile is:
```
Ghost Tile = Seed + Prompt + Deterministic Computation

P_{S,P}(x) = Model(RNG(S), P, x)
```

Where:
- **S** = 64-bit seed value
- **P** = Prompt template defining the function
- **x** = Input to the generated function

#### Seed Structure (64-bit)

```
┌─────────────────────────────────────────────────────────────────┐
│ Bit Range │ Field        │ Size │ Purpose                      │
├─────────────────────────────────────────────────────────────────┤
│ 0-15      │ flags        │ 16   │ Configuration flags          │
│ 16-31     │ base         │ 16   │ Angular base (12/60/360)     │
│ 32-47     │ parameters   │ 16   │ Operational parameters       │
│ 48-63     │ rng_seed     │ 16   │ Pure entropy for PRNG        │
└─────────────────────────────────────────────────────────────────┘
```

#### Ghost Tile Types

| Tile Type | Function | Speedup | Use Case |
|-----------|----------|---------|----------|
| Softmax | Normalized exponential | 50x | Attention weights |
| Sector Assignment | Angular classification | 57x | View partitioning |
| Bearing Calculation | Direction computation | 48x | Navigation |
| Rotation | Quaternion operations | 48x | Frame transforms |
| Collision Detection | Spatial hashing | 50x | Physics simulation |

#### GhostTileRegistry Structure

```typescript
interface GhostTileEntry {
  seedId: string;
  seedValue: bigint;
  functionSignature: {
    name: string;
    inputTypes: string[];
    outputType: string;
  };
  validation: {
    errorRate: number;
    determinismVerified: boolean;
    testCasesPassed: number;
    testCasesTotal: number;
  };
  performance: {
    latencyMs: number;
    speedupVsNeural: number;
    memoryBytes: number;
  };
}

class GhostTileRegistry {
  private tiles: Map<string, GhostTileEntry>;

  register(tile: GhostTileEntry): void;
  lookup(seedId: string): GhostTileEntry;
  searchByFunction(name: string): GhostTileEntry[];
  validateAll(): ValidationReport;
}
```

### 2.3 Seed-Theory Integration

Seed-Theory is the mathematical foundation for predicting seed behavior without execution.

#### Core Question

> If we seed a model to create a tiled program, can we PREDICT what variations on that seed will do WITHOUT executing the model?

**Answer:** Yes, under specific conditions.

#### Key Theorems

**Theorem 1 (Seed Determinism):**
```
For any deterministic algorithm A using PRNG initialized by seed S:
A(S) is uniquely determined.
```

**Theorem 2 (Seed Gradient):**
```
The seed gradient points in the direction of maximal function change:

δ* = argmax_{|δ|=1} ||F_{S+δ} - F_S|| = sign(∇_S F)
```

**Theorem 3 (Variation Distance Bound):**
```
For seeds S and S' with Hamming distance k:

d_F(F_S, F_S') ≤ k × max_{i: S[i] ≠ S'[i]} d_F(F_S, F_{S^{(i)}})
```

#### Seed Space Topology

```
Seed Space: S_n = ({0,1}^n, d_H)

Where d_H(S_1, S_2) = |{i : S_1[i] ≠ S_2[i]}|  (Hamming distance)

Properties:
- Discrete metric space with diameter n
- Volume of Hamming ball: V(n,r) = Σ_{i=0}^{r} C(n,i)
```

#### Bit Sensitivity by Region

| Region | Bits | Typical Sensitivity | Effect |
|--------|------|---------------------|--------|
| Flags | 0-15 | HIGH | Global transformations |
| Base | 16-31 | HIGH | Structural changes |
| Parameters | 32-47 | MEDIUM | Operational behavior |
| RNG Seed | 48-63 | LOW | Stochastic variations |

---

## 3. Implementation Standards

### 3.1 Code Style Requirements

#### TypeScript/JavaScript

```typescript
// File naming: kebab-case.ts
// Class naming: PascalCase
// Function naming: camelCase
// Constants: SCREAMING_SNAKE_CASE

// Prefer interface over type for objects
interface GhostTile {
  seedId: string;
  seedValue: bigint;
  execute(input: Float64Array): Float64Array;
}

// Use bigint for 64-bit seeds
type Seed = bigint;

// Use Float64Array for numerical data
const positions = new Float64Array(100);

// Use Map for dynamic key-value storage
const registry = new Map<string, GhostTile>();

// Document all public methods
/**
 * Computes sector assignment for a position relative to origin.
 * @param position - Absolute position coordinates
 * @param origin - Reference origin point
 * @param base - Angular base (12, 60, or 360)
 * @returns Sector index [0, base-1]
 */
function computeSector(
  position: Float64Array,
  origin: Float64Array,
  base: 12 | 60 | 360
): number {
  // Implementation
}
```

#### Python

```python
# File naming: snake_case.py
# Class naming: PascalCase
# Function naming: snake_case
# Constants: SCREAMING_SNAKE_CASE

# Use numpy for numerical operations
import numpy as np
from typing import Tuple, List, Optional

# Document all functions with docstrings
def compute_sector(
    position: np.ndarray,
    origin: np.ndarray,
    base: int = 12
) -> int:
    """
    Computes sector assignment for a position relative to origin.

    Args:
        position: Absolute position coordinates (shape: [d])
        origin: Reference origin point (shape: [d])
        base: Angular base (12, 60, or 360)

    Returns:
        Sector index [0, base-1]
    """
    pass
```

### 3.2 Testing Expectations

#### Unit Tests

All implementations must have unit tests covering:

1. **Correctness**: Output matches expected mathematical result
2. **Equivariance**: Rotation/translation invariance where applicable
3. **Numerical Stability**: Handles edge cases (zero vectors, etc.)
4. **Performance**: Meets speedup targets

```typescript
describe('GhostTileRegistry', () => {
  it('should register and lookup tiles correctly', () => {
    const registry = new GhostTileRegistry();
    const tile = createMockTile();
    registry.register(tile);
    expect(registry.lookup(tile.seedId)).toEqual(tile);
  });

  it('should validate determinism', () => {
    const tile = registry.lookup('test-tile');
    const input = new Float64Array([1, 2, 3]);
    const result1 = tile.execute(input);
    const result2 = tile.execute(input);
    expect(result1).toEqual(result2);
  });
});
```

#### Equivariance Tests

```typescript
describe('LOG Attention Equivariance', () => {
  it('should be rotation invariant', () => {
    const positions = generateTestPositions(100);
    const rotation = randomRotation();

    const attention1 = computeAttention(positions);
    const attention2 = computeAttention(rotate(positions, rotation));

    expect(equivarianceError(attention1, attention2)).toBeLessThan(1e-15);
  });
});
```

#### Performance Benchmarks

```typescript
describe('Ghost Tile Performance', () => {
  it('should meet speedup target', () => {
    const input = generateLargeInput(10000);
    const neuralStart = performance.now();
    neuralImplementation(input);
    const neuralTime = performance.now() - neuralStart;

    const ghostStart = performance.now();
    ghostTileImplementation(input);
    const ghostTime = performance.now() - ghostStart;

    const speedup = neuralTime / ghostTime;
    expect(speedup).toBeGreaterThan(10); // 10x minimum speedup
  });
});
```

### 3.3 Documentation Standards

#### Code Documentation

Every file must have:
1. **Header comment** with purpose and key concepts
2. **JSDoc/docstrings** for all public functions
3. **Inline comments** for non-obvious logic
4. **Type annotations** for all parameters and returns

```typescript
/**
 * LOGTensor - Origin-Relative Geometric Tensor
 *
 * Implements the core LOG principle where all positions are measured
 * relative to a reference origin point. This enables cache-optimal
 * tiling with base-12 divisions and sector-based attention.
 *
 * Key Concepts:
 * - Origin = Self = Reference Frame
 * - All positions are RELATIVE to origin
 * - Orientation baked into tensor placement
 * - Base-12/360 architecture for tile-friendly math
 *
 * @module LOGTensor
 * @author POLLN-RTT Team
 */
```

#### Research Documentation

All research documents follow this structure:

```markdown
# [Title]
## [Subtitle]

---

## Executive Summary
[2-3 paragraph overview for quick reading]

## 1. [Section 1]
### 1.1 [Subsection]
[Content]

## Key Equations
[Mathematical formulas]

## Implementation Notes
[Practical guidance]

## References
[Sources and related work]
```

---

## 4. Roadmap and Priorities

### 4.1 Sprint 1 Tasks (Weeks 1-4)

#### Priority 1: Core Infrastructure

| Task | Description | Estimated Effort | Dependencies |
|------|-------------|------------------|--------------|
| LOGTensor Class | Origin-relative coordinate system | 3 days | None |
| GhostTileRegistry | Seed management system | 2 days | None |
| A2A Package System | Tensor communication | 3 days | LOGTensor |
| Triton Environment | Kernel development setup | 2 days | None |

#### Priority 2: Ghost Tile Library

| Task | Description | Estimated Effort | Dependencies |
|------|-------------|------------------|--------------|
| Ghost Softmax | Normalized exponential tile | 2 days | GhostTileRegistry |
| Ghost Sector | Angular classification tile | 2 days | LOGTensor |
| Ghost Bearing | Direction computation tile | 2 days | LOGTensor |
| Ghost Rotation | Quaternion operations tile | 2 days | LOGTensor |

#### Priority 3: Testing Framework

| Task | Description | Estimated Effort | Dependencies |
|------|-------------|------------------|--------------|
| Unit Tests | Core functionality tests | 3 days | Priority 1 |
| Equivariance Tests | Rotation/translation tests | 2 days | Priority 1 |
| Performance Benchmarks | Speedup validation | 2 days | Priority 2 |

### 4.2 Quick Wins vs Strategic Investments

#### Quick Wins (1-2 days)

1. **Integer Sector Computation**: Replace atan2 with integer arithmetic
   - Impact: 57x speedup for sector assignment
   - Risk: Low
   - Dependencies: None

2. **Precomputed Rotation Tables**: Cache rotation matrices for discrete angles
   - Impact: 48x speedup for heading operations
   - Risk: Low
   - Dependencies: None

3. **Early Distance Rejection**: Add distance check before angular computation
   - Impact: 2x speedup for view partitioning
   - Risk: Low
   - Dependencies: None

#### Strategic Investments (1-4 weeks)

1. **FP8 Quantization Pipeline**: Block-wise quantization with Triton kernels
   - Impact: 2x memory, 2x throughput
   - Risk: Medium
   - Dependencies: Triton environment

2. **MLA-Style Attention**: Low-rank KV cache compression
   - Impact: 93.3% KV cache reduction
   - Risk: Medium
   - Dependencies: Attention implementation

3. **Seed Discovery Pipeline**: Automated seed search for ghost tiles
   - Impact: Enables new ghost tile creation
   - Risk: High
   - Dependencies: GhostTileRegistry

### 4.3 Dependency Chains

```
Phase 1: Foundation
├── LOGTensor Class ──────────────────┐
├── GhostTileRegistry ────────────────┤
└── Triton Environment ───────────────┤
                                      │
Phase 2: Tiles                        │
├── Ghost Softmax ←───────────────────┤
├── Ghost Sector ←────────────────────┤ (depends on LOGTensor)
├── Ghost Bearing ←───────────────────┤
└── Ghost Rotation ←──────────────────┘
                                      │
Phase 3: Optimization                 │
├── FP8 Kernels ←─────────────────────┤ (depends on Triton)
├── MLA Attention ←───────────────────┤
└── Warp-Level Primitives ←───────────┘
                                      │
Phase 4: Integration                  │
├── Full System Test ←────────────────┘ (depends on all above)
└── Performance Validation
```

---

## 5. Quality Assurance

### 5.1 Verification Requirements

#### Correctness Verification

All implementations must pass:

1. **Mathematical Correctness**: Output matches theoretical prediction
2. **Equivariance Tests**: Rotation/translation invariance
3. **Numerical Precision**: Error within acceptable bounds
4. **Edge Cases**: Handles degenerate inputs gracefully

#### Test Matrix

| Test Type | Precision Threshold | Test Count |
|-----------|---------------------|------------|
| Unit Tests | 100% pass rate | ≥20 per module |
| Equivariance | Error < 1e-15 | ≥5 per module |
| Numerical | Error < 1e-10 | ≥10 per module |
| Edge Cases | Graceful handling | ≥5 per module |

#### Determinism Verification

```typescript
/**
 * Verifies that a ghost tile produces identical outputs
 * for identical inputs across multiple runs.
 */
function verifyDeterminism(
  tile: GhostTile,
  inputs: Float64Array[],
  runs: number = 100
): boolean {
  const results: Float64Array[][] = [];

  for (let i = 0; i < runs; i++) {
    const runResults = inputs.map(input => tile.execute(input));
    results.push(runResults);
  }

  // All runs should produce identical results
  for (let i = 1; i < runs; i++) {
    for (let j = 0; j < inputs.length; j++) {
      if (!arraysEqual(results[0][j], results[i][j])) {
        return false;
      }
    }
  }
  return true;
}
```

### 5.2 Performance Benchmarks

#### Speedup Requirements

| Operation | Baseline (Neural) | Target (Ghost) | Minimum Speedup |
|-----------|-------------------|----------------|-----------------|
| Softmax | 1.0ms | 0.02ms | 50x |
| Sector | 0.5ms | 0.009ms | 57x |
| Bearing | 0.8ms | 0.017ms | 48x |
| Rotation | 0.6ms | 0.012ms | 50x |

#### Memory Requirements

| Component | Baseline | Target | Reduction |
|-----------|----------|--------|-----------|
| KV Cache | 100% | 6.7% | 93.3% |
| Weights (FP8) | 100% | 50% | 50% |
| Ghost Tiles | N/A | Negligible | 99.9% |

#### Benchmark Protocol

```python
def run_benchmark(operation, input_sizes, warmup=10, iterations=100):
    """
    Standard benchmarking protocol.

    1. Warmup: Run operation warmup times
    2. Measure: Run operation iterations times
    3. Report: Mean, std, min, max, p95
    """
    # Warmup
    for _ in range(warmup):
        operation(generate_input())

    # Measure
    times = []
    for _ in range(iterations):
        start = time.perf_counter_ns()
        operation(generate_input())
        times.append(time.perf_counter_ns() - start)

    # Report
    return {
        'mean_ns': np.mean(times),
        'std_ns': np.std(times),
        'min_ns': np.min(times),
        'max_ns': np.max(times),
        'p95_ns': np.percentile(times, 95),
    }
```

### 5.3 Acceptance Criteria

#### Feature Completion Checklist

- [ ] Implementation matches specification
- [ ] All unit tests pass
- [ ] All equivariance tests pass
- [ ] Performance meets speedup target
- [ ] Memory usage within bounds
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Integration tests pass

#### Quality Gates

```
┌─────────────────────────────────────────────────────────────────┐
│                     QUALITY GATES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Gate 1: Unit Tests                                             │
│  └── All tests pass? → YES → Continue                           │
│                       → NO  → Fix and re-test                   │
│                                                                 │
│  Gate 2: Equivariance                                           │
│  └── Error < 1e-15? → YES → Continue                            │
│                       → NO  → Investigate and fix               │
│                                                                 │
│  Gate 3: Performance                                            │
│  └── Speedup >= target? → YES → Continue                        │
│                          → NO  → Optimize                       │
│                                                                 │
│  Gate 4: Code Review                                            │
│  └── Approved? → YES → Merge                                    │
│                 → NO  → Address feedback                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Communication Protocols

### 6.1 Progress Reporting

#### Daily Standup Format

```
## [Date] Progress Report - [Agent Name]

### Completed
- [Task 1]: [Brief description]
- [Task 2]: [Brief description]

### In Progress
- [Task 3]: [Status and ETA]

### Blocked
- [Task 4]: [Blocker description and assistance needed]

### Next Steps
- [Task 5]: [Planned start time]
```

#### Weekly Summary Format

```markdown
## Week [N] Summary - [Agent Name]

### Key Accomplishments
1. [Major accomplishment 1]
2. [Major accomplishment 2]
3. [Major accomplishment 3]

### Metrics
- Tasks Completed: X/Y
- Test Coverage: Z%
- Performance: [speedup]x

### Challenges
- [Challenge 1]: [Resolution or status]

### Next Week Plan
- [Priority 1]
- [Priority 2]
- [Priority 3]
```

### 6.2 Escalation Procedures

#### Escalation Levels

| Level | Trigger | Response Time | Action |
|-------|---------|---------------|--------|
| L1: Self | Minor issues | Immediate | Solve independently |
| L2: Team | Blocked > 2 hours | 4 hours | Team assistance |
| L3: Lead | Blocked > 1 day | 24 hours | Lead intervention |
| L4: Project | Critical blocker | 4 hours | All-hands resolution |

#### Escalation Template

```markdown
## Escalation Request - Level [N]

### Summary
[One-line description of the issue]

### Impact
- **Scope**: [Which tasks/components affected]
- **Severity**: [Critical/High/Medium/Low]
- **Deadline Risk**: [Impact on timeline]

### Context
[Detailed description of the problem]

### Attempts Made
1. [Attempt 1]: [Result]
2. [Attempt 2]: [Result]

### Assistance Needed
[Specific help required]

### Attachments
- [Relevant logs, screenshots, or code snippets]
```

### 6.3 Collaboration Patterns

#### A2A Communication Protocol

All agent-to-agent communication uses the A2A Package format:

```typescript
interface A2APackage<T> {
  id: string;                    // Unique message ID
  senderId: string;              // Sender agent ID
  receiverId: string;            // Target agent ID or 'ALL'
  payloadType: 'seed' | 'pattern' | 'query' | 'result' | 'request';
  payload: T;                    // Message content
  parentIds: string[];           // Causal chain ancestry
  causalChainId: string;         // Decision tree group
  timestamp: number;             // Unix timestamp
  priority: 'low' | 'medium' | 'high' | 'critical';
}
```

#### Agent Specialization Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                   COMMUNICATION FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PENELOPE (Geometry) ←────────────────→ HOLON (Holographic)    │
│         │                                      │                │
│         │        SEED TRANSFORMATIONS          │                │
│         │        ─────────────────────         │                │
│         │   Penrose coords → Boundary ops      │                │
│         │                                      │                │
│         ↓                                      ↓                │
│  BIORA (Biological) ←────────────────→ TESSERA (Architecture)  │
│         │                                      │                │
│         │        DISTRIBUTED PATTERNS          │                │
│         │        ───────────────────           │                │
│         │   Reflex arcs → MoE experts          │                │
│         │                                      │                │
│         └──────────────┬───────────────────────┘                │
│                        │                                        │
│                        ↓                                        │
│                  CHRONOS (Timing)                               │
│                  ────────────────                               │
│                  Sync vs Async decisions                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Code Review Protocol

1. **Author**: Create PR with description linking to task
2. **Reviewer**: Review within 24 hours
3. **Feedback**: Use constructive, specific comments
4. **Response**: Author addresses feedback within 24 hours
5. **Approval**: Require 1 approval for non-critical, 2 for critical

---

## 7. Templates and Checklists

### 7.1 New Ghost Tile Template

```typescript
/**
 * GhostTile: [Name]
 *
 * Purpose: [What this tile computes]
 * Seed Structure: [How seed bits are used]
 * Speedup: [Expected speedup vs neural]
 *
 * Mathematical Foundation:
 * [Key equations and theorems]
 */

interface [Name]TileConfig {
  seed: bigint;
  // Configuration parameters
}

class [Name]Tile implements GhostTile {
  private seed: bigint;
  private config: [Name]TileConfig;

  constructor(seed: bigint) {
    this.seed = seed;
    this.config = this.decodeSeed(seed);
  }

  private decodeSeed(seed: bigint): [Name]TileConfig {
    // Extract configuration from seed bits
    return {
      seed,
      // ...
    };
  }

  execute(input: Float64Array): Float64Array {
    // Deterministic computation based on seed
    // ...
  }

  validate(): ValidationResult {
    // Verify determinism and correctness
    // ...
  }

  benchmark(): BenchmarkResult {
    // Measure performance
    // ...
  }
}
```

### 7.2 Implementation Checklist

```markdown
## Implementation Checklist - [Feature Name]

### Planning
- [ ] Requirements understood
- [ ] Design documented
- [ ] Dependencies identified
- [ ] Test cases defined

### Implementation
- [ ] Core functionality implemented
- [ ] Edge cases handled
- [ ] Error handling added
- [ ] Logging added

### Testing
- [ ] Unit tests written
- [ ] Unit tests passing
- [ ] Equivariance tests passing
- [ ] Performance benchmarks met
- [ ] Memory usage acceptable

### Documentation
- [ ] Code documented
- [ ] API documentation updated
- [ ] Examples added
- [ ] Changelog updated

### Review
- [ ] Self-review completed
- [ ] Code review requested
- [ ] Feedback addressed
- [ ] Approval received

### Integration
- [ ] Integration tests passing
- [ ] Regression tests passing
- [ ] Deployment verified
```

### 7.3 Bug Report Template

```markdown
## Bug Report - [Title]

### Summary
[One-line description]

### Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Environment
- Version: [commit hash or version]
- Platform: [OS, Node version, etc.]
- Dataset: [if applicable]

### Evidence
```
[Logs, error messages, or code snippets]
```

### Severity
- [ ] Critical: Blocks all work
- [ ] High: Blocks significant work
- [ ] Medium: Workaround available
- [ ] Low: Minor issue
```

### 7.4 Research Documentation Template

```markdown
# [Research Topic]
## [Subtitle]

**Document Version:** 1.0
**Created:** [Date]
**Status:** [Draft/Review/Complete]

---

## Executive Summary
[2-3 paragraph overview]

## 1. Introduction
### 1.1 Motivation
[Why this research matters]

### 1.2 Scope
[What is and isn't covered]

## 2. Theoretical Framework
### 2.1 [Foundation 1]
[Mathematical foundations]

### 2.2 [Foundation 2]
[Additional foundations]

## 3. Key Results
### 3.1 [Result 1]
[Description and proof]

### 3.2 [Result 2]
[Description and proof]

## 4. Implementation
### 4.1 [Component 1]
[Practical implementation]

## 5. Experiments
### 5.1 Methodology
[How experiments were conducted]

### 5.2 Results
[Experimental outcomes]

## 6. Conclusions
[Summary and future work]

## Appendix
[Proofs, derivations, additional data]
```

---

## 8. Reference Materials

### 8.1 Key Equations Reference

#### LOG Attention
```
Attention_o(Q, K, V) = softmax(Q_rel · K_rel^T / √d) · V_rel + o
```

#### Ghost Tile
```
P_{S,P}(x) = Model(RNG(S), P, x)
```

#### Origin-Relative Transform
```
T_o(p) = p - o = Δp
```

#### Sector Assignment
```
sector = floor(angle(p - o) / (2π / base)) mod base
```

#### MLA Compression
```
KV_cache_size = kv_lora_rank + qk_rope_dim << n_heads × head_dim
```

#### FP8 Scale
```
s = max|x| / 448,  x_quantized = round(x / s)
```

#### Hamming Distance
```
d_H(S_1, S_2) = |{i : S_1[i] ≠ S_2[i]}|
```

### 8.2 Performance Constants

| Constant | Value | Description |
|----------|-------|-------------|
| Golden Ratio (φ) | 1.618034 | Fibonacci scaling |
| Pi (π) | 3.14159265 | Circle constant |
| Base-12 divisor | 12 | Optimal for cache tiling |
| Base-360 divisor | 360 | Maximum division flexibility |
| FP8 max value | 448 | E4M3 format maximum |
| MLA compression | 93.3% | KV cache reduction |

### 8.3 File Structure Quick Reference

```
/home/z/my-project/
├── src/lib/
│   ├── log/
│   │   ├── core/
│   │   │   ├── LOGTensor.ts         # Origin-relative tensor
│   │   │   └── GhostTileRegistry.ts # Seed management
│   │   ├── tiles/
│   │   │   └── GhostTiles.ts        # Ghost tile implementations
│   │   ├── simulation/
│   │   │   ├── APISimulator.ts      # API simulation framework
│   │   │   └── ExperimentRunner.ts  # Experiment execution
│   │   ├── utils/
│   │   │   └── SectorUtils.ts       # Sector computation utilities
│   │   ├── communication/
│   │   │   └── A2ACommunication.ts  # Agent communication
│   │   └── index.ts                 # Module exports
│   └── qgt/                         # Geometric transformer modules
│
├── download/polln_research/
│   ├── round5/                      # Phase 1 & 2 results
│   │   ├── ROUND5_SYNTHESIS.md      # Main synthesis document
│   │   ├── ROUND5_FRAMEWORK.md      # Research framework
│   │   ├── log_principle_formalization.md
│   │   ├── ghost_parts_framework.md
│   │   ├── deepseek_below_cuda.md
│   │   ├── polln_github_analysis.md
│   │   ├── ghost_tile_summary.md
│   │   ├── schemas/
│   │   │   ├── tile_schema.json
│   │   │   ├── origin_schema.json
│   │   │   └── ghost_seed_schema.json
│   │   ├── seed_theory/
│   │   │   ├── SEED_THEORY_ITERATIONS_1-3.md
│   │   │   ├── SEED_THEORY_ITERATIONS_4-6.md
│   │   │   └── SEED_THEORY_ITERATIONS_7-10.md
│   │   ├── iterations/              # Research iterations
│   │   ├── iterations_r2/           # Round 2 iterations
│   │   └── onboarding/
│   │       └── IMPLEMENTATION_AGENT_ONBOARDING.md (this document)
│   └── round6/                      # Deep synthesis results
│       ├── ROUND6_COMPREHENSIVE_SYNTHESIS.md
│       ├── AGENT_ONBOARDING.md
│       ├── penrose/
│       ├── holographic/
│       ├── biological/
│       ├── tile_science/
│       ├── sync_async/
│       └── a2a_communications/
│
└── worklog.md                       # Implementation history
```

### 8.4 API Key Reference

| API | Purpose | Use Case |
|-----|---------|----------|
| DeepSeek | Mathematical proofs | Cheap iteration, formal verification |
| DeepInfra | Multi-model comparison | Cross-validation of results |
| Moonshot | Visual tensors | Via DeepInfra integration |

**Usage Guidelines:**
- Use for synthesis, not basic computation
- Combine multiple perspectives in prompts
- Document token usage for budget tracking
- Never expose keys in logs or public repos

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **LOG** | Logical-Origin-Geometry: Origin-first design principle |
| **Ghost Part** | Deterministic seed-programmed computation |
| **Ghost Tile** | A ghost part that implements a specific tile operation |
| **A2A** | Agent-to-Agent communication package |
| **MLA** | Multi-head Latent Attention |
| **Tile** | Atomic computational unit |
| **Seed** | 64-bit value that deterministically initializes computation |
| **Origin** | Reference point for all coordinate measurements |
| **Sector** | Angular region for attention partitioning |
| **Equivariance** | Property where output transforms correctly under input transformations |
| **PRNG** | Pseudo-Random Number Generator |
| **Hamming Distance** | Number of bits that differ between two seeds |
| **Fiber** | Set of seeds that produce identical functions |

---

## Appendix B: Quick Reference Cards

### Card 1: Core Operations

```typescript
// Origin-relative transform
const relative = position.map((p, i) => p - origin[i]);

// Sector assignment (base-12)
const angle = Math.atan2(dy, dx);
const sector = Math.floor(angle / (2 * Math.PI / 12)) % 12;

// LOG attention
const attention = softmax(Qrel @ Krel.T / sqrt(d)) @ Vrel + origin;

// Ghost tile execution
const result = ghostTile.execute(input, seed);
```

### Card 2: Seed Decoding

```typescript
// Decode 64-bit seed
const flags = (seed >> 48n) & 0xFFFFn;
const base = (seed >> 32n) & 0xFFFFn;
const params = (seed >> 16n) & 0xFFFFn;
const rngSeed = seed & 0xFFFFn;

// Encode seed
const seed = (flags << 48n) | (base << 32n) | (params << 16n) | rngSeed;
```

### Card 3: Performance Testing

```typescript
// Benchmark protocol
const times = [];
for (let i = 0; i < 100; i++) {
  const start = performance.now();
  operation(input);
  times.push(performance.now() - start);
}
const speedup = baselineTime / mean(times);
```

---

**End of Implementation Agent Onboarding Guide**

*For questions or clarifications, contact the project lead or use the A2A communication protocol.*

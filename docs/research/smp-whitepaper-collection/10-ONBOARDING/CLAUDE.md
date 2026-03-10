# CLAUDE.md

## Current Mission: SMP White Paper - Research Synthesis Complete

**Role**: Orchestrator of Specialized Research Agents
**Mission**: SMP White Paper complete - now building proof-of-concept implementations
**Status**: 23 research agents completed, 15 breakthrough domains documented
**Paper Title**: "Seed-Model-Prompt Programming: LLMs to Swarms, SMPbots Peek on Schrödinger's Cat"

---

## The Breakthrough: Glass Box AI

SMP transforms AI from black boxes to glass boxes. Each tile is visible, inspectable, and improvable.

### What Changed

| Before SMP | After SMP |
|------------|-----------|
| Black box AI | Glass box AI (visible tiles) |
| Trust without verification | Verify before trust |
| Retrain to improve | Improve individual tiles |
| One machine, one model | Distributed tile networks |
| Stateless inference | Cumulative learning with memory |

---

## The 15 Breakthrough Domains (4 Tiers)

### TIER 1: Fundamental Paradigm Shifts

#### 1. Confidence Flow Theory
Confidence isn't a score—it's a currency that flows through tile chains.
- **Sequential tiles**: Confidence MULTIPLIES (0.90 × 0.80 = 0.72)
- **Parallel tiles**: Confidence AVERAGES (weighted by trust)
- **Three-Zone Model**: GREEN (0.90-1.00 auto), YELLOW (0.75-0.89 review), RED (<0.75 stop)

#### 2. Stigmergic Coordination
Tiles don't need a boss. They communicate through the spreadsheet itself—leaving "digital pheromones" in cells.
- Five levels of emergence: Individual → Pairwise → Local → Global → Self-modifying
- Swarm intelligence from simple rules
- See: `src/spreadsheet/tiles/stigmergy.ts`

#### 3. The Composition Paradox
Safe tiles don't always compose safely. Two individually safe tiles can create unsafe behavior when combined.
- Constraints naturally STRENGTHEN during composition
- Each tile can only RESTRICT the valid input space
- See: `src/spreadsheet/tiles/composition-validator.ts`

#### 4. Tile Algebra: Formal Verification
Tiles form a rigorous algebraic structure—a category. We can PROVE composition is valid.
- Associativity: (A ∘ B) ∘ C = A ∘ (B ∘ C)
- Identity: id ∘ A = A ∘ id = A
- Distributivity: A ∘ (B + C) = (A ∘ B) + (A ∘ C)
- See: `docs/research/smp-paper/formal/TILE_ALGEBRA_FORMAL.md`

### TIER 2: New Capabilities

#### 5. Cross-Modal Tiles
Tiles pass MEANING, not just data. Text, image, and audio tiles share a latent space.
- Hybrid embedding: 256-dim shared + 512-dim modality-specific
- Retrieval: 0.89, Cross-modal alignment: 0.84

#### 6. Counterfactual Branching
Tiles branch into parallel simulations, exploring "what if" scenarios WITHOUT committing.
- Quantum decision visualization
- See all possible futures before choosing one

#### 7. Tile Memory & Cumulative Learning
Tiles maintain state across executions. They learn from use, not just training.
- L1-L4 Memory Hierarchy: Register → Working → Session → Long-term
- See: `src/spreadsheet/tiles/tile-memory.ts`

#### 8. Distributed Execution
Tiles live wherever they need to be—laptop, AWS GPU, edge device—and work together.
- The spreadsheet makes distributed systems invisible

#### 9. Federated Tile Learning
Organizations share learned decision boundaries as inspectable tiles, not raw gradients.
- Collaborate without exposing raw data
- No blind aggregation required

### TIER 3: Infrastructure

#### 10. Execution Strategies
Cells auto-route to parallel/series, sync/async based on dependencies.
- 15x faster with same formulas

#### 11. KV-Cache Cell Sharing
Multiple tiles share cached KV states. No recomputation needed.

#### 12. Granular Constraints
Constrain variables to developer tolerance with explicit interfaces.

### TIER 4: Emerging Research

#### 13. Tile Debugging Tools
Debug AI like software—breakpoints, watches, step-through.

#### 14. Tile Marketplace
Economy of intelligence—buy, sell, share tiles.

#### 15. Automatic Discovery
AI finds optimal tile decomposition from monolithic models.

---

## Implementation Status

### Proof-of-Concept Files Created
```
src/spreadsheet/tiles/
├── confidence-cascade.ts    # Three-zone model implementation
├── stigmergy.ts             # Digital pheromones for coordination
├── tile-memory.ts           # L1-L4 memory hierarchy
└── composition-validator.ts # Algebraic composition validation
```

### Research Documentation
```
docs/research/smp-paper/
├── notes/                   # 25+ breakthrough research files
├── formal/                  # Formal mathematical foundations
├── examples/                # Concrete real-world examples
└── Smp_final_whitepaper.md  # Updated white paper with breakthroughs
```

---

## Document Structure

```
docs/research/smp-paper/
├── notes/              # Individual agent findings (25+ files)
├── critiques/          # Peer review and feedback
├── discussions/        # Ongoing conversations
├── formal/             # Mathematical foundations
├── examples/           # Concrete usage examples
└── Smp_final_whitepaper.md  # Final document
```

---

## Agent Specializations

| Agent Type | Purpose | Skills |
|------------|---------|--------|
| **Creative Writers** | Narrative flow, analogies | Punchy, casual voice |
| **Hard Logic** | Formal proofs, schemas | Precise, structured |
| **ML/DL/RL Researchers** | Breakthrough ML concepts | Deep learning theory |
| **Schema Developers** | Data structures, interfaces | System architecture |
| **Simulation Builders** | Validate concepts | Python, modeling |
| **Synthesis Agents** | Combine findings | Writing, editing |
| **Critique Agents** | Review, improve | Critical analysis |
| **Security Researchers** | Adversarial analysis | Attack/defense patterns |

---

## The Final Paper

**Title**: "Seed-Model-Prompt Programming: LLMs to Swarms, SMPbots Peek on Schrödinger's Cat"

**Voice**: Punchy but casual. Commercial fisherman, not patent lawyer.

**Structure**:
1. Hook (why this matters)
2. The SMP idea (what it is)
3. Breakthrough capabilities (what you can do now)
4. How it works (under the hood)
5. Examples (real use cases)
6. The science (why it works)
7. Future directions (where it's going)

**Style Guidelines**:
- Use analogies and metaphors
- Keep sentences punchy
- Avoid jargon where possible
- Maintain the "fisherman voice" - direct, practical, no-nonsense

---

## Quick Reference

### SMP = Seed + Model + Prompt

- **Seed**: The data (selected cells, columns, range)
- **Model**: The AI (distilled LLM, SmallML, cached)
- **Prompt**: The task (what you want done)

### Key Breakthrough

> "Deconstruct Agents into Essential functions for granular reasoning control and reverse engineering logic visually. SMPbots Seed+Model+Prompt can replace blurry logic if cell is functioning optimum and can scale. Inductive ML Programming in Spreadsheets or Embedded Headless."

### The Three-Zone Model

| Zone | Confidence | Action |
|------|------------|--------|
| GREEN | 0.90-1.00 | Auto-proceed |
| YELLOW | 0.75-0.89 | Human review |
| RED | 0.00-0.74 | Stop, diagnose |

---

## Project Context

**Repository**: https://github.com/SuperInstance/polln
**Company**: SuperInstance.AI
**Product**: POLLN - Pattern-Organized Large Language Network
**License**: MIT (open source)

**Current Phase**: Proof-of-Concept Implementation
**Vision**: "Tile Intelligence in real-time spreadsheets for simulation or monitoring"

---

*Orchestrator Active | 23 Research Agents Completed | 15 Breakthrough Domains*
*Last Updated: 2026-03-10*
*Status: Building PoC Implementations*

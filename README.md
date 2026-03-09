# POLLN

**Pattern-Organized Large Language Network - Distributed Intelligence through Inspectable Agents**

---

## What is POLLN?

POLLN is a **Ledger-Organizing Graph (LOG)** system for building distributed AI applications from tiny, specialized agents. Unlike large monolithic models, POLLN breaks intelligence into hundreds of simple, inspectable components that coordinate through learned connections.

**Core Principle**: Intelligence emerges from connections, not from size.

---

## The Problem: Black Box AI

Traditional language models are opaque:
- You can't see *why* they made a decision
- You can't trace the reasoning path
- You can't debug or fix specific behaviors
- You can't inspect what they learned

```
Traditional LLM:

    Input → [175B parameters] → Output

    Why? How? What if?
    You can't look inside.
```

---

## The POLLN Solution

POLLN replaces one giant model with **hundreds of tiny agents**, each doing one thing well. Every agent-to-agent communication is visible, traceable, and debuggable.

```
POLLN:

    Input → Agent1 → Agent2 → Agent3 → Output
             │         │         │
             └─trace───┴─────────┘

    Every step is visible.
    Every decision is explainable.
```

### Key Innovation: A2A Packages

Every communication between agents is an **A2A (Agent-to-Agent) Package**—a JSON artifact that contains:
- The decision or data being passed
- The reasoning trace
- Lineage (what inputs led here)
- Causal chain ID (for replay and debugging)

This makes every agent decision:
- **Inspectable** - See exactly what happened
- **Replayable** - Re-run any decision
- **Debuggable** - Find and fix flaws
- **Replaceable** - Swap one agent without affecting others

---

## Core Concepts

### LOG (Ledger-Organizing Graph)

A **LOG** is a graph structure where:
- **Ledger**: Every decision is recorded and traceable
- **Organizing**: Information structures itself through use
- **Graph**: Intelligence emerges from connections

Memory in POLLN is **structural**, not representational. The system doesn't store facts—it stores stronger connections between agents that work well together.

### Quick Analogy: POLLN and Bees

| POLLN Concept | Bee Colony Analogy | Technical Meaning |
|---------------|-------------------|-------------------|
| **Agents** | Bees | Specialized workers, each with one job |
| **Colony** | Hive | The coordinated system |
| **Pollen Grains** | Pollen | Compressed behavioral patterns (embeddings) |
| **A2A Packages** | Waggle dance | Communication about what works |
| **Connection Strength** | Pheromone trails | Reinforced paths (Hebbian learning) |
| **Plinko Selection** | Stochastic foraging | Probabilistic choice for diversity |
| **Variants** | Genetic diversity | Multiple approaches to same task |

The analogy helps intuition, but the technical implementation stands on its own.

---

## How POLLN Works

### 1. Specialists, Not Generalists

Every agent has one job:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  SUMMARIZER  │  │  FACT-CHECK  │  │   RESEARCH   │
│              │  │              │  │              │
│ Condenses    │  │ Verifies     │  │ Finds        │
│ information  │  │ claims       │  │ sources      │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 2. Memory as Connection Strength

Learning = strengthening connections between agents that work well together.

```
Agent A ──strong──▶ Agent B    ← "These two work well together"
Agent A ──weak────▶ Agent C    ← "Haven't needed this path"
```

This is **Hebbian learning**: neurons (agents) that fire together, wire together.

### 3. Diversity as Durability

POLLN maintains multiple variants of each capability:

```
Variant A: 94% success  ████████░░
Variant B: 91% success  ███████░░░
Variant C: 88% success  ██████░░░░
```

When conditions change, different variants succeed. The system adapts automatically.

### 4. Subsumption Architecture (Layered Processing)

```
┌─────────────────────────────────────────────┐
│  Layer 3: DELIBERATE    (slow, conscious)   │
├─────────────────────────────────────────────┤
│  Layer 2: HABITUAL      (medium, learned)   │
├─────────────────────────────────────────────┤
│  Layer 1: REFLEX        (fast, automatic)   │
├─────────────────────────────────────────────┤
│  Layer 0: SAFETY        (instant, critical) │
└─────────────────────────────────────────────┘

Safety always wins.
```

Lower layers override higher ones. This prevents catastrophic failures.

### 5. Plinko Selection (Probabilistic Choice)

POLLN doesn't pick the "best" option. It samples probabilistically:

```
         │
    ┌────┴────┐
    │ PLINKO  │
    │ LAYER   │
    └─────────┘
      ╱   ╲   ╱
    Option Option Option
      A      B      C

    P(A) = 0.6   ← Usually best
    P(B) = 0.3   ← Sometimes good
    P(C) = 0.1   ← Explores rarely
```

**Why?** Exploration keeps the system from getting stuck. Temperature controls exploration vs exploitation.

---

## Architecture Components

| Component | Purpose | Status |
|-----------|---------|--------|
| **BaseAgent** | Core agent with subsumption layers | ✅ Complete |
| **Colony** | Agent lifecycle and coordination | ✅ Complete |
| **PlinkoLayer** | Stochastic decision-making | ✅ Complete |
| **A2A Package** | Traceable agent communication | ✅ Complete |
| **HebbianLearning** | Connection strength updates | ✅ Complete |
| **SafetyLayer** | Constitutional constraints | ✅ Complete |
| **WorldModel** | VAE for dreaming/optimization | ✅ Complete |
| **ValueNetwork** | TD(λ) value predictions | ✅ Complete |
| **FederatedLearning** | Cross-colony knowledge sharing | ✅ Complete |
| **KV-Cache System** | Efficient context sharing | ✅ Complete |

---

## The Spreadsheet Tool: LOG Integration

POLLN's killer app is a **spreadsheet integration** where every cell can contain an agent.

**What users see**:
- Type `=AGENT("Analyze Q3 sales", A1:A100)` in a cell
- Agents emerge, learn, and optimize
- Double-click any cell to inspect the reasoning
- Simulate "what if" scenarios without affecting production

**What makes it different**:
- **Inspectable**: See exactly how each decision was made
- **Open Source**: Free forever, MIT license
- **Learns**: Gets smarter with use
- **Understandable**: No black boxes

---

## Implementation Status

| Component | Tests | Status |
|-----------|-------|--------|
| Core Agent Runtime | 18 | ✅ |
| Tile Categories | 24 | ✅ |
| META Tiles | 18 | ✅ |
| Value Network | 20 | ✅ |
| World Model & Dreaming | 42 | ✅ |
| Federated Learning | 32 | ✅ |
| KV-Cache System | 401 | ✅ |
| WebSocket API | - | ✅ |
| CLI Tool | - | ✅ |
| **Total** | **821+** | ✅ |

### R&D Progress (Spreadsheet Integration)

| Wave | Focus | Documents | Status |
|------|-------|-----------|--------|
| Wave 15 | Strategic Planning | 6 docs | ✅ |
| Wave 16 | Plug-and-Play UX | 11 docs | ✅ |
| Wave 17 | Cell Abstraction Layer | 4 docs | ✅ |
| Wave 18 | Breakdown Engine | 4 docs | ✅ Round 1 |
| Wave 18 | Breakdown Engine | TBD | 🔄 Round 2 |
| **Total** | **4 waves** | **25+ docs** | **Active** |

---

## Getting Started

```bash
# Install
npm install

# Run tests
npm test

# Build
npm run build

# Run CLI
npm run cli
```

---

## Key Terminology

| Term | Definition |
|------|------------|
| **Agent** | A specialized component that performs one task well |
| **Colony** | A collection of agents working together |
| **A2A Package** | Agent-to-Agent communication artifact (fully traceable) |
| **Plinko Layer** | Stochastic selection mechanism (probabilistic choice) |
| **Hebbian Learning** | "Neurons that fire together, wire together" |
| **Subsumption** | Layered processing where lower layers override higher ones |
| **LOG** | Ledger-Organizing Graph (or Logic Graph) |
| **KV-Cache** | Efficient context sharing between agents |
| **Distillation** | Large model teaching small agents |
| **World Model** | Internal representation for planning/dreaming |

---

## Use Cases

### Research
- Trace every decision
- Debug any failure
- Publish reproducible experiments

### Development
- Ship one agent improvement without risking the system
- Let users customize their colonies
- Run on edge devices without GPU clusters

### Spreadsheets (Killer App)
- Inspectable AI in every cell
- Learn your workflow patterns
- Simulate changes before committing
- Understand why decisions were made

---

## Research Foundation

POLLN synthesizes research from:
- **Multi-Agent Reinforcement Learning** (MARL)
- **Embodied Cognition** (distributed memory)
- **Swarm Intelligence** (stigmergy, coordination)
- **Neuroscience** (Hebbian learning, subsumption)
- **Distributed Systems** (federated learning, privacy)

See `docs/research/` for deep dives.

---

## Contributing

This project is in active development. See `docs/ROADMAP.md` for the development plan.

---

## License

[MIT License](LICENSE)

---

**Repository**: https://github.com/SuperInstance/polln
**Creator**: Casey DiGennaro
**Last Updated**: 2026-03-08

---

*POLLN: Intelligence you can inspect, trust, and control.*

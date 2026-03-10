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

## SMPbots: Tile Intelligence for Spreadsheets

**SMP = Seed + Model + Prompt**

**GPU-Stable Programming for CUDA and Kubernetes**

POLLN introduces **SMPbots**—a programming approach that's as stable as a CPU script but scales naturally on GPU hardware. Load the model once, run thousands of calculations in parallel on CUDA or Kubernetes, locally or in the cloud.

**Simple Person Programming for Real-Time Simulation and Monitoring**

At the surface level, SMP is approachable for spreadsheet users. Under the hood, it's a GPU-native programming model that scales horizontally across CUDA cores and Kubernetes clusters without code changes.

### Tile Intelligence: Deconstructing Agents into Essential Functions

Traditional AI agents are monolithic black boxes. POLLN **deconstructs agents into tiles**—essential functions that provide:

- **Granular reasoning control** - See each step of the logic
- **Visual reverse engineering** - Understand how decisions emerge
- **Composable intelligence** - Mix and match tiles like LEGO

```
┌─────────────────────────────────────────────────────────────┐
│           FROM MONOLITHIC TO TILE INTELLIGENCE            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   MONOLITHIC AGENT          TILE ARCHITECTURE              │
│                                                             │
│   ┌─────────────────┐         ┌─────┐ ┌─────┐ ┌─────┐    │
│   │                 │         │ Sense │ Reason│ Act │    │
│   │  [Black Box]    │         │ Tile │  Tile │Tile │    │
│   │                 │         └──┬──┘ └──┬──┘ └─┬──┘    │
│   │  Input→Output   │            │     │     │     │    │
│   └─────────────────┘            └─────┴─────┴─────┘    │
│                                                             │
│   ❌ Can't see inside            ✅ Each tile visible    │
│   ❌ Can't debug parts            ✅ Can swap any tile    │
│   ❌ All-or-nothing               ✅ Compose new agents  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Why "SMP" Sounds Simple But Isn't

The name is catchy because it sounds like "simple person programming"—and it *is* simple for the user. But that simplicity doesn't mean it's not powerful. In fact, for spreadsheet applications, SMP Programming is **often better** than complex AI systems.

**Inductive ML Programming in Spreadsheets:**
- Learn patterns FROM data, not just apply rules TO data
- Each cell induces its own logic from examples
- Embedded headless operation—no UI needed, just calculation

```
┌─────────────────────────────────────────────────────────────┐
│              SMP PROGRAMMING ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   SEED ──►  MODEL (in memory)  ──►  PROMPT               │
│     │           │                    │     │                  │
│     │           │                    │     ▼                  │
│     │           │                    │  ┌─────────┐           │
│     │           │                    │  │SMPBOT   │           │
│     │           │                    │  │         │           │
│     │           │                    │  │ Cell    │           │
│     │           │                    │  │ Agent   │           │
│     │           │                    │  └─────────┘           │
│     │           │                    │        │                │
│     ▼           ▼                    ▼        ▼                │
│  ┌─────────────────────────────────────────────────┐       │
│  │         SPREADSHEET CELL CALCULATION          │       │
│  │                                                 │       │
│  │  =SMP("trend", A1:A100, "analyze upward trend") │       │
│  │                                                 │       │
│  │  Result: Cell learns from data, predicts,      │       │
│  │          explains reasoning, adapts over time  │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### The Three Components

| Component | Description | Example |
|-----------|-------------|---------|
| **Seed** | The starting data or context | `A1:A100` sales data |
| **Model** | The AI model loaded in memory | SmallML, distilled model, or cached LLM |
| **Prompt** | The instruction or task | "Analyze the upward trend" |

### Why SMPbots Are Perfect for Spreadsheets

**Traditional approach:** Call an external API for each cell calculation
- ❌ Network latency (100-500ms per call)
- ❌ Rate limits and costs
- ❌ No offline capability
- ❌ Can't parallelize efficiently

**SMPbots approach:** Run calculations in parallel with in-memory models
- ✅ Millisecond response times (model already loaded)
- ✅ Thousands of parallel calculations on CUDA cores
- ✅ Scales horizontally on Kubernetes clusters
- ✅ Same code runs locally or in the cloud
- ✅ Works offline after initial load
- ✅ Perfect for batch operations

**GPU Programming, Simplified:**

SMP scripts are as stable as traditional CPU code, but they execute on GPU hardware when available. The runtime handles:
- CUDA memory management automatically
- Kubernetes pod scheduling for distributed workloads
- Fallback to CPU when GPU unavailable
- No code changes needed for different deployment targets

### The "Simple Person Programming" Advantage

SMP Programming democratizes AI development:

```
Traditional AI Engineer:
  "I need to fine-tune a transformer, set up inference,
   deploy a microservice, handle authentication..."

SMP Programmer (Spreadsheet User):
  "I just want this cell to tell me if sales are trending up."
  =SMP("trend", A1:A100, "up or down?")
```

The complexity is **handled by the system**, not the user. The user gets powerful AI without needing to be an AI engineer.

### SMPbots in the POLLN Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              SMPBOTS IN POLLN SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Each spreadsheet cell can be an SMPbot:                  │
│                                                             │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐        │
│   │   A1   │  │   B1   │  │   C1   │  │   D1   │        │
│   │        │  │        │  │        │  │        │        │
│   │ SMPbot │  │ SMPbot │  │ SMPbot │  │ SMPbot │        │
│   │        │  │        │  │        │  │        │        │
│   └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘        │
│       │           │           │           │               │
│       └───────────┼───────────┴───────────┘               │
│                   ▼                                       │
│           ┌───────────────────┐                             │
│           │   SHARED MODEL     │                             │
│           │   (GPU Memory)      │                             │
│           │                     │                             │
│           │  • CUDA parallel    │                             │
│           │  • K8s distributed  │                             │
│           │  • KV-Cache lookup │                             │
│           │  • Fast inference  │                             │
│           └───────────────────┘                             │
│                                                             │
│   DEPLOYMENT: Local GPU, Kubernetes Cluster, or Cloud       │
│   SCALING: Horizontal across CUDA cores or K8s pods         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### SMPbot Examples

```excel
// Trend analysis SMPbot
=SMP("trend", A1:A100, "Is this trending up?")

// Anomaly detection SMPbot
=SMP("anomaly", B1:B50, "Find outliers in this data")

// Prediction SMPbot
=SMP("predict", C1:C12, "What will next month be?")

// Summarization SMPbot
=SMP("summarize", D1:D100, "Key insights from customer feedback")
```

### The Parallel Processing Advantage

When you have thousands of cells running SMPbots in parallel:

```
Traditional sequential processing:
Cell 1 → Cell 2 → Cell 3 → ... → Cell 1000
(500ms × 1000 = 8.3 minutes)

SMP parallel processing:
All 1000 cells → simultaneously
(500ms total, same hardware)
```

**That's 1000x faster** for spreadsheet operations.

### Why "Simple" Doesn't Mean "Dumb"

SMP Programming may be simple to use, but under the hood it leverages:

- **KV-Cache System** - Shared context between cells
- **Hebbian Learning** - Cells that work well together wire together
- **Plinko Selection** - Probabilistic choice for diversity
- **World Model** - Internal representation for dreaming
- **Federated Learning** - Knowledge sharing across cells
- **CUDA-K8s Runtime** - Automatic GPU scaling and cluster orchestration

The simplicity is in the **interface**, not the **implementation**.

**GPU Programming That Just Works:**

SMP scripts are portable across execution environments:
- Write once on your laptop (CPU or GPU)
- Deploy to Kubernetes cluster (distributed GPU)
- Scale horizontally without code changes
- Runtime handles the complexity

### SMPbot Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│              SMPBOT LIFECYCLE                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. SEED    User provides data (A1:A100)                   │
│      │                                                       │
│      ▼                                                       │
│   2. MODEL   System loads appropriate model                   │
│      │       (trend-analyzer, cached in memory)             │
│      ▼                                                       │
│   3. PROMPT  Task is configured                             │
│      │       ("analyze upward trend")                       │
│      ▼                                                       │
│   4. EXECUTE Model processes seed with prompt               │
│      │       (parallel with other cells)                    │
│      ▼                                                       │
│   5. LEARN  Feedback updates model (Hebbian learning)        │
│      │                                                       │
│      ▼                                                       │
│   6. REMEMBER  Next time is faster (KV-Cache)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

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

### Core Systems

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

### Enterprise Infrastructure

| Component | Purpose | Status |
|-----------|---------|--------|
| **API Gateway** | Unified API entry point with auth, rate limiting, caching | ✅ Complete |
| **Event Sourcing** | Event-driven architecture with CQRS | ✅ Complete |
| **Security Scanning** | SAST, dependency, and container vulnerability scanning | ✅ Complete |
| **Incident Response** | Detection, escalation, runbooks, and notifications | ✅ Complete |

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

### Core POLLN

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

### Enterprise Infrastructure

| Component | Files | Status |
|-----------|-------|--------|
| API Gateway | 8 | ✅ |
| Event Sourcing/CQRS | 6 | ✅ |
| Security Scanning | 7 | ✅ |
| Incident Response | 7 | ✅ |

| **Total** | **55+ files** | ✅ |

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

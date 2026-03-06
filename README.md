# POLLN - Pattern-Organized Large Language Network

> Durable Intelligence Through Swarm Emergence

**Repository:** https://github.com/SuperInstance/POLLN
**Version:** 0.1.0 | March 2026

---

## What is POLLN?

POLLN is a distributed intelligence system inspired by bee colonies and pollination. Instead of one giant model (LLM), we build a **Large Language Network (LLN)** - a swarm of specialized, simple agents that become collectively intelligent through emergent behavior.

### Core Insight

> "Bees are not that smart individually. But as a swarm, they become durable intelligence."

Individual agents are narrow and simple. No single agent is intelligent. But connected properly - through learned synaptic weights, adaptive topology, and shared patterns - the swarm produces intelligent behavior that no agent possesses alone.

---

## Key Innovations

### 1. Durability Through Variant Diversity

Instead of ONE perfect solution, POLLN maintains MANY variants:

```
Variant 1: 90% accuracy  ──┐
Variant 2: 88% accuracy  ──┤
Variant 3: 85% accuracy  ──┼──► Stochastic Selection (temperature-based)
Variant 4: 82% accuracy  ──┤
Variant 5: 78% accuracy  ──┘
```

When environment changes:
- Different variants succeed
- Rankings update automatically
- Worst performers gradually drop
- System adapts WITHOUT reprogramming

### 2. Granularity: Tiny Models Beat Giant Ones

```
MONOLITH (LLM):              GRANULAR (POLLN):
┌─────────────────┐          ┌───┐┌───┐┌───┐┌───┐┌───┐
│  ONE GIANT      │          │M1 ││M2 ││M3 ││M4 ││M5 │
│  MODEL          │          └─┬─┘└─┬─┘└─┬─┘└─┬─┘└─┬─┘
│                 │            │    │    │    │    │
│ • Big steps     │            └────┴────┴─┬─┴────┴─┘
│ • Can't isolate │                         │
│ • Black box     │                    ┌────▼────┐
└─────────────────┘                    │ PLINKO  │ ← Stochastic
                                       └─────────┘
```

**Advantages:**
- Each decision ISOLATED to specific model
- Artifacts VISIBLE at each step
- Can improve ONE model without touching others
- Debuggable, interpretable, modular

### 3. Memory as Pathway Strengths (Not Files)

The body does NOT store information as files. It stores information as **probability of pathway activation**:

> "The body remembers running by BECOMING a runner."

- Muscles grow in running patterns
- Blood vessels grow to supply running
- Neural pathways strengthen for running
- Memory is STRUCTURAL, not REPRESENTATIONAL

### 4. The Pollen Metaphor

| Term | Meaning |
|------|---------|
| **Pollen Grain** | Compressed behavioral seed - portable, potent pattern |
| **Keeper** | User who cultivates their hive |
| **Meadow** | Where patterns grow and cross-pollinate |
| **Honeycomb Cell** | Reusable routine (hexagonal efficiency) |
| **Scent Trail** | Shared pattern others can follow |
| **Waggle Dance** | How information spreads between agents |

---

## Research Progress

### Round 1: Foundation Research (In Progress)

We're running 5 parallel research agents across 12+ languages:

| Agent | Topic | Status |
|-------|-------|--------|
| Multi-Agent Systems | MARL, swarm intelligence, coordination | Running |
| Embodied Cognition | Distributed memory, gut brain | **Complete** |
| Stochastic Decisions | Plinko, temperature, bandits | Running |
| Privacy Learning | FL attacks, differential privacy | Running |
| Cross-Cultural Philosophy | Attribution, emergence concepts | Running |

#### Completed Research

**Embodied Cognition** (Complete)
- Memory as pathway strengths (Hebbian learning)
- Subsumption architecture: Safety > Reflex > Habit > Deliberate
- Gut-level autonomous agents (500M neurons in enteric system)
- Predictive processing in all agents
- Overnight optimization (synaptic homeostasis)

See: `docs/research/embodied-cognition.md`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      POLLN ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   KEEPER    │────▶│   COLONY    │────▶│   MEADOW    │   │
│  │  (User)     │     │  (Agents)   │     │  (Shared)   │   │
│  └─────────────┘     └──────┬──────┘     └─────────────┘   │
│                             │                               │
│         ┌───────────────────┼───────────────────┐          │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   SAFETY    │     │   REFLEX    │     │  HABITUAL   │   │
│  │  (Layer 0)  │     │  (Layer 1)  │     │  (Layer 2)  │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
│         ┌───────────────────────────────────────┐          │
│         │           PLINKO LAYER                 │          │
│         │  Stochastic selection with temperature │          │
│         └───────────────────────────────────────┘          │
│                                                             │
│         ┌───────────────────────────────────────┐          │
│         │         POLLEN GRAINS (BES)            │          │
│         │  Compressed behavioral embeddings      │          │
│         └───────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **UI**: shadcn/ui (Radix primitives)
- **Database**: SQLite via Prisma ORM
- **State**: Zustand, TanStack Query
- **Visualization**: Recharts

---

## Project Structure

```
polln/
├── CLAUDE.md                    # Main orchestration document
├── README.md                    # This file
├── docs/
│   ├── ARCHITECTURE.md          # System architecture
│   ├── ROADMAP.md               # Development phases
│   ├── NAMING_WORKSHOP.md       # Metaphor transformation
│   ├── DISTRIBUTED_MEMORY.md    # Embodied cognition model
│   ├── research/                # Research outputs
│   │   ├── embodied-cognition.md
│   │   └── ...
│   └── round1-synthesis/        # Round 1 synthesis
├── .agents/                     # Specialist onboarding docs
│   ├── systems-architect.md
│   ├── ml-engineer.md
│   ├── safety-researcher.md
│   ├── agent-developer.md
│   ├── privacy-analyst.md
│   └── round1/                  # Round 1 researcher onboards
│       ├── multi-agent-systems-researcher.md
│       ├── embodied-cognition-researcher.md
│       ├── stochastic-decisions-researcher.md
│       ├── privacy-learning-researcher.md
│       └── cross-cultural-philosophy-researcher.md
├── project_docs/                # Original project documents
│   ├── prisma/schema.prisma     # Database schema (45 models)
│   └── upload/FINAL_SYNTHESIS.md
└── src/                         # Scaffold codebase
```

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/SuperInstance/POLLN.git
cd POLLN

# Install dependencies
bun install

# Start development server
bun run dev

# Database operations
bun run db:push      # Push schema to database
bun run db:generate  # Generate Prisma client
```

---

## Roadmap

### Phase 0: Prerequisites (Current)
- [x] Naming workshop complete
- [x] Round 1 research launched
- [ ] Complete Round 1 synthesis
- [ ] Safety infrastructure design
- [ ] Governance framework

### Phase 1: Core Runtime
- [ ] Agent runtime implementation
- [ ] SPORE protocol
- [ ] Plinko decision layer

### Phase 2: Learning & Memory
- [ ] World model training
- [ ] Behavioral embedding space (BES)
- [ ] Dreaming engine

### Phase 3: Social & Scale
- [ ] Colony/Meadow features
- [ ] Cross-keeper pollination
- [ ] Marketplace

---

## Contributing

This project is currently in active research phase. See `docs/ROADMAP.md` for development phases and specialist assignments.

---

## License

[To be determined]

---

## Origin

POLLN evolved from [Mycelium](https://github.com/SuperInstance/Mycelium), transforming the fungal network metaphor into a pollination/bee colony metaphor that better captures:
- Passive networking through normal use
- Durability across generations
- Evolution through reinforcement learning
- Randomness as a feature, not a bug

---

*Last Updated: 2026-03-06*
*Research Round: 1 (In Progress)*

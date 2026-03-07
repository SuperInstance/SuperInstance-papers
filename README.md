# POLLN

**The swarm that learns.**

---

## A Different Kind of Intelligence

Picture a single ant. It can't plan. It can't reason. It barely has a brain.

Now picture a colony. They build cities. They farm. They wage war.

Where did that intelligence come from?

Not from any ant. From the **connections between them.**

POLLN applies this principle to language models.

---

## The Problem We're Solving

You've used ChatGPT. You've asked it something complex. It gave you an answer.

But you couldn't see *why* it chose that answer.

You couldn't trace the reasoning. Couldn't debug the decision. Couldn't improve just the broken part without risking everything else.

The intelligence was there. The transparency wasn't.

```
Traditional LLM:

    Your Question
         │
         ▼
    ┌─────────────────┐
    │   175 billion   │
    │   parameters    │
    │                 │
    │   Why?          │ ← You can't look here
    │   How?          │ ← Or here
    │   What if?      │ ← Definitely not here
    │                 │
    └─────────────────┘
         │
         ▼
    An Answer

Trust me. That's how it works.
```

We built something different.

---

## Introducing POLLN

POLLN isn't one model. It's thousands of tiny specialists, each doing one thing well.

No single agent is intelligent. But together, through learned connections and shared patterns, they produce behavior no agent possesses alone.

```
POLLN:

    Your Question
         │
         ▼
    ┌─────┐   ┌─────┐   ┌─────┐
    │ A1  │──▶│ A2  │──▶│ A3  │
    └──┬──┘   └──┬──┘   └──┬──┘
       │   📦     │   📦     │
       ▼         ▼         ▼
    [artifact] [artifact] [artifact]
       │         │         │
       └─────────┴─────────┘
                 │
                 ▼
          Every step
          Traceable
          Debuggable
          Fixable
```

Each arrow is an **A2A package**—a visible, inspectable artifact. You can replay any decision. Debug any failure. Improve any agent without touching the others.

---

## The Core Insight

> *"Bees are not that smart individually. But as a swarm, they become durable intelligence."*

POLLN agents are narrow. Simple. Replaceable.

But the system they form:

- **Learns** from every interaction
- **Adapts** without reprogramming
- **Remembers** through connection strengths
- **Survives** because variants provide backup

---

## How It Works

### 1. Specialists, Not Generalists

Every agent has one job. One expertise. One responsibility.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  SUMMARIZER  │  │  FACT-CHECK  │  │   RESEARCH   │
│              │  │              │  │              │
│ Condenses    │  │ Verifies     │  │ Finds        │
│ information  │  │ claims       │  │ sources      │
└──────────────┘  └──────────────┘  └──────────────┘
```

Simple agents. Complex behavior.

### 2. Memory as Structure

Your body doesn't store running as a file. It stores running as **stronger legs, developed blood vessels, trained neural pathways.**

Memory is structural. Not representational.

POLLN works the same way. It doesn't have a database of facts. It has **stronger connections** between agents that work well together.

```
Agent A ──strong──▶ Agent B    ← "These two work well together"
Agent A ──weak────▶ Agent C    ← "Haven't needed this path much"
```

Learning is resource reallocation. Like blood flow to muscles.

### 3. Diversity as Durability

Evolution doesn't create one perfect organism. It maintains diversity.

POLLN keeps multiple variants of each capability:

```
┌─────────────────────────────────────────┐
│          VARIANTS IN COMPETITION         │
├─────────────────────────────────────────┤
│  Variant A: 94% success  ████████░░ #1  │
│  Variant B: 91% success  ███████░░░ #2  │
│  Variant C: 88% success  ██████░░░░ #3  │
│  Variant D: 72% success  █████░░░░░ #4  │
│  Variant E: 65% success  ████░░░░░░ #5  │
└─────────────────────────────────────────┘
```

When conditions change, different variants succeed. Rankings shift automatically. The system adapts without anyone touching the code.

**Durability through diversity.** Not through perfection.

### 4. Layered Safety

Biological systems process in layers. Reflexes override habits. Habits override plans. Plans override nothing—they're the slowest.

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

Safety always wins. No exceptions.
```

This prevents catastrophic failures while allowing sophisticated behavior.

### 5. The Plinko Layer

Most systems pick the best option. POLLN picks *probabilistically*.

Like a Plinko board, the ball doesn't always go to the best slot. Sometimes it bounces left. Sometimes right.

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
    P(C) = 0.1   ← Rarely, but explores
```

This isn't a bug. It's a feature.

Exploration keeps the system from getting stuck. Temperature controls how much. High temperature early (explore everything). Low temperature later (exploit what works).

---

## The Vocabulary

We didn't invent these concepts. We found them in nature.

| Term | What It Is | What It Does |
|------|-----------|--------------|
| **Colony** | Your personal swarm | Agents working together for you |
| **Keeper** | You | The human tending the system |
| **Meadow** | All external knowledge | GitHub, news, APIs, sensors, environment |
| **Pollen Grain** | Compressed pattern | Seeds that grow into behaviors |
| **Plinko** | Selection mechanism | Probabilistic choice with temperature |
| **A2A Package** | Communication artifact | Traceable, replayable agent messages |
| **Waggle Dance** | Discovery protocol | Broadcasting "I found something good" |
| **Scent Trail** | Pheromone path | "Others succeeded here, follow me" |

---

## What You Can Build

### For Researchers
Trace every decision. Debug any failure. Publish reproducible experiments.

### For Builders
Ship one agent improvement without risking the whole system. Let users customize their colonies.

### For Edge Computing
Train tiny models on laptops and edge devices. No GPU cluster required. The system evolves while you sleep.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         KEEPER                               │
│                        (You)                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                         COLONY                               │
│                    (Your Agent Swarm)                        │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │   META    │  │   META    │  │   META    │               │
│  │  Tiles    │  │  Tiles    │  │  Tiles    │               │
│  │ (undiff)  │  │ (task)    │  │ (role)    │               │
│  └───────────┘  └───────────┘  └───────────┘               │
│         │              │              │                      │
│         └──────────────┴──────────────┘                      │
│                        │                                     │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              STIGMERGIC COORDINATION                 │   │
│  │        (Agents leave signals others follow)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                        │                                     │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 VALUE NETWORK                        │   │
│  │         (TD(λ) predictions of outcomes)              │   │
│  └─────────────────────────────────────────────────────┘   │
│                        │                                     │
│         ┌──────────────┴──────────────┐                     │
│         ▼                             ▼                     │
│  ┌─────────────┐              ┌─────────────┐              │
│  │   PLINKO    │              │   SAFETY    │              │
│  │   LAYER     │              │   LAYERS    │              │
│  └─────────────┘              └─────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                         MEADOW                               │
│              (External Knowledge Sources)                    │
│   GitHub │ News APIs │ Sensors │ Environment │ Other Hives  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Status

| Component | Status | Tests |
|-----------|--------|-------|
| Base Agent Runtime | ✅ Complete | 18 |
| Tile Categories (Task/Role/Core) | ✅ Complete | 24 |
| Knowledge Succession Protocol | ✅ Complete | 14 |
| META Tiles (Pluripotent Agents) | ✅ Complete | 18 |
| Value Network (TD(λ) Learning) | ✅ Complete | 20 |
| Stigmergic Coordination | ✅ Complete | 12 |
| Plinko Decision Layer | ✅ Complete | 12 |
| World Model & Dreaming | ✅ Complete | 42 |
| Federated Learning | ✅ Complete | 32 |
| Meadow Community System | ✅ Complete | 87 |
| KV-Cache Communication | ✅ Complete | 401 |
| Context Sharing | ✅ Complete | 37 |
| Cache Utilities | ✅ Complete | 91 |
| **Total** | | **821** |

### Phase 4: KV-Cache System (Complete)

Inspired by [KVCOMM (NeurIPS'25)](https://github.com/FastMAS/KVCOMM), implementing:

- **KV Proximity**: Tokens closer in embedding space have closer KV vectors
- **Offset Proximity**: Predictable changes under prefix modifications
- **Anchor-Based Communication**: Three-phase matching/reuse/prediction
- **Privacy-Aware Sharing**: Differential privacy for cross-colony sync

---

## Getting Started

```bash
# Clone
git clone https://github.com/SuperInstance/polln.git
cd polln

# Install
npm install

# Test
npm test

# Build
npm run build
```

---

## The Deeper Vision

Most AI systems get smarter by getting bigger.

More parameters. More compute. More data.

POLLN gets smarter by getting more **connected**.

The intelligence isn't in any agent. It's in the web between them.

That's why it can:
- **Explain itself** (every step is traceable)
- **Improve itself** (learning is connection adjustment)
- **Survive change** (diversity provides backup)
- **Run anywhere** (tiny agents fit on tiny devices)

Not a bigger brain. A better nervous system.

---

## Research Foundation

POLLN synthesizes research from multiple fields:

- **Multi-Agent Reinforcement Learning** (MARL, CTDE patterns)
- **Embodied Cognition** (distributed memory, subsumption)
- **Swarm Intelligence** (stigmergy, pheromone trails)
- **Differential Privacy** (ε < 1.0 guarantees)
- **Neuroscience** (Hebbian learning, layered processing)

See `docs/research/` for deep dives into each area.

---

## Origin

POLLN evolved from [Mycelium](https://github.com/SuperInstance/Mycelium), transforming the fungal network metaphor into a pollination metaphor that better captures:

- **Passive networking** (bees don't try to network)
- **Generational durability** (colonies survive individuals)
- **Reinforcement learning** (successful patterns spread)
- **Stochastic exploration** (randomness as feature, not bug)

---

## Contributing

This project is in active development. See `docs/ROADMAP.md` for the development plan.

---

## License

[MIT License](LICENSE)

---

*Repository: https://github.com/SuperInstance/polln*
*Creator: Casey DiGennaro*
*Last Updated: 2026-03-06*

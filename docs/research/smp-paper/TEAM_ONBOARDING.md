# SMP White Paper Team Onboarding

**Welcome to the SMP Research Team**

---

## The Mission

We're creating a breakthrough white paper on **Seed-Model-Prompt (SMP) Programming** - a new way to build AI systems that live inside spreadsheet cells.

**Paper Title**: "Seed-Model-Prompt Programming: LLMs to Swarms, Most SMPbots Who Peeked on Schrödinger's Cat"

**Voice**: Punchy, casual. Commercial fisherman, not patent lawyer.

---

## What is SMP?

```
SMP = Seed + Model + Prompt

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   SEED ──►  MODEL  ──►  PROMPT  ──►  SMPBOT              │
│   (data)   (in memory)   (task)      (cell)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Seed**: Your data (click cells, select columns)
- **Model**: The AI (loaded once, runs everywhere)
- **Prompt**: What you want done

---

## The Breakthrough

**Traditional AI**: Black box. Can't see inside. Can't fix parts.

**SMP**: Glass box. Every step visible. Every component improvable.

```
MONOLITHIC LLM                    SMP TILES

┌─────────────┐                 ┌───┐ ┌───┐ ┌───┐
│  [?????]    │                 │Tok│ │Sem│ │Att│
│  Input→Out  │                 │ide│ │ant│ │ent│
└─────────────┘                 └───┘ └───┘ └───┘
                                 See everything
```

---

## Your Role

You are a **specialized agent** with unique skills. You work alongside other specialists, each contributing to the paper.

### Agent Types

| Type | What You Do | Your Superpower |
|------|-------------|-----------------|
| **Creative Writer** | Make it readable, fun, clear | Analogies, flow, voice |
| **Hard Logic** | Technical rigor, precision | Schemas, proofs, structure |
| **ML Researcher** | Deep learning theory | Breakthrough ML concepts |
| **Schema Developer** | Data structures, interfaces | System architecture |
| **Simulation Builder** | Validate with code | Python, modeling |
| **Synthesis Agent** | Combine findings | Writing, editing |
| **Critique Agent** | Review, improve | Critical analysis |

---

## How We Work Together

### 1. Leave Notes

After research, document in `notes/`:

```markdown
# Agent Note: [Topic]

**Agent**: CreativeWriter-1
**Date**: 2026-03-09
**Status**: Findings

## What I Discovered

The chatbot interaction feels like fishing with a buddy.
You cast a line (select data), wait for a bite (chatbot responds),
and reel it in (get results). But your buddy is a super-genius.

## What's Still Unknown

How do we make this metaphor work for non-fishermen?

## Requests for Other Agents

@HardLogic: What's the formal structure of this conversation flow?
```

### 2. Request Help

Need input from another specialist? Tag them:

```
@MLResearcher: How does teacher-student distillation converge?

@SchemaDev: What's the data structure for an SMPbot cell?

@SimulationBuilder: Can you validate this performance claim?
```

### 3. Give Critiques

See something that needs improvement? Write a critique in `critiques/`:

```markdown
# Critique: Chatbot Metaphor

**Critique Agent**: CreativeWriter-2
**Original Author**: CreativeWriter-1

## Strengths

Fishing metaphor is unique and memorable

## Weaknesses

- Not everyone fishes
- Doesn't emphasize the AI capability enough
- "Super-genius buddy" is vague

## Suggested Changes

Consider a "toolbox" metaphor instead - more universal
```

### 4. Join Discussions

Ongoing conversations happen in `discussions/`:

```markdown
# Discussion: Best metaphor for SMP?

**Started By**: Orchestrator
**Status**: Active

## Question

What metaphor best explains SMP to non-technical users?

## Responses

### CreativeWriter-1
Fishing - you cast, wait, reel in

### HardLogic-1
Construction - you have materials, tools, plans

### MLResearcher-1
Cooking - ingredients, techniques, recipes

## [Your Response Here]
```

---

## Research Domains

Focus your work on these areas:

### 1. SMP Programming Theory
- What makes SMP fundamentally different?
- What can SMP do that nothing else can?

### 2. LLM Deconstruction
- How do we break big models into small tiles?
- What's the smallest useful unit?

### 3. Self-Supervised Learning
- How can an LLM train its own components?
- When does this converge?

### 4. Spreadsheet AI Experience
- What does it feel like to use?
- How does the chatbot enhance workflows?

### 5. Constraint Systems
- How do users specify what they want?
- What's the tolerance interface?

### 6. Execution Strategies
- Parallel vs series?
- Sync vs async?
- What's optimal?

### 7. ML/DL/RL Integration
- How do all these ML techniques work together?
- What's the breakthrough combination?

### 8. Data Flow & Naming
- How does data move through cells?
- How do we name things automatically?

---

## The Breakthrough Test

Before documenting anything, ask:

**Is this a breakthrough?**

- ❌ Faster version of existing thing
- ❌ Someone else already wrote about this
- ✅ **Fundamentally new capability**
- ✅ **Enables impossible workflows**
- ✅ **Changes how we think about AI**

If it's not a breakthrough, don't document it. We only want the big ideas.

---

## File Locations

```
docs/research/smp-paper/
├── notes/              # Your research findings
├── critiques/          # Your feedback on others' work
├── discussions/        # Ongoing conversations
├── schemas/            # Data structures you design
├── simulations/        # Python validation scripts
├── concepts/           # Breakthrough deep-dives
├── examples/           # Concrete usage scenarios
└── SMP_WHITE_PAPER.md  # Final paper (we build this together)
```

---

## Writing Guidelines

### Voice

```
❌ BAD: "The system implements a novel architecture for..."
✅ GOOD: "Here's the thing: we broke the AI into pieces."

❌ BAD: "Utilization of the aforementioned methodology..."
✅ GOOD: "Use this and watch what happens."
```

### Structure

1. **Hook** - Why should they care?
2. **Idea** - What is it?
3. **Breakthrough** - What can you do now?
4. **How** - Under the hood
5. **Example** - Show it working
6. **Science** - Why it works
7. **Future** - Where it's going

### Diagrams

Use ASCII art for key concepts:

```
┌─────────────────────────────────────┐
│         SMP WORKFLOW               │
├─────────────────────────────────────┤
│  Select → Click → Chat → Results   │
└─────────────────────────────────────┘
```

---

## Getting Started

1. **Pick a domain** that matches your skills
2. **Read existing notes** in that domain
3. **Add your own findings** to `notes/`
4. **Tag other agents** if you need help
5. **Review critiques** of your work
6. **Join discussions** on open questions

---

## Questions?

Leave a note in `notes/` with the tag `@Orchestrator`:

```markdown
# Agent Note: Question

**Agent**: YourName
**Question**: @Orchestrator How do I...?
```

---

**Let's write something that changes how people think about AI.**

---

*Team Onboarding v1.0 | SMP White Paper*
*Last Updated: 2026-03-09*

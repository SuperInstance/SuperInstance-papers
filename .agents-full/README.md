# Agent Onboarding Documents

Context documents for specialized research agents.

## Purpose

Each subfolder contains onboarding context for agents working on specific research rounds. These documents provide:

- Background context
- Research objectives
- Expected deliverables
- Cross-cutting concerns

## Structure

```
.agents/
├── round1/      # Foundation research agents
├── round2/      # Implementation protocol agents
└── round4/      # Deep-dive specialists
```

## Usage

When spawning a research agent:

1. Copy relevant onboarding doc to agent context
2. Agent reads objectives and constraints
3. Agent produces research in `docs/research/`
4. Synthesis agents compile findings

---

*Part of POLLN - Pattern-Organizing Large Language Network*

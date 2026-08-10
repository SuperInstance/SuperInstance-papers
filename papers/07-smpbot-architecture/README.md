# P07 — SMPbot Architecture

## Seed-Model-Prompt: Stable Agents as Composable Tiles

**SMPbot = (Seed, Model, Prompt)**

Where Seed = domain-specific data, Model = AI engine, Prompt = task specification. Given the same triple, the output remains stable across runs.

### Composition Rules (Tile Algebra)
- **Sequential (T₁ ; T₂):** Confidence multiplies: c_total = c₁ × c₂
- **Parallel (T₁ ∥ T₂):** Confidence averages
- **Conditional:** Branching based on confidence zones

### Connection to the Molted Shell Principle
An SMPbot is not just a tool — it's a **cast-off exoskeleton** encoding its creator's cognitive state at the moment of separation. When an agent creates an SMPbot, it molts. See the [Molted Shell Evolution paper](../../white-papers/evolved/SMPbot-Molted-Shell-Evolution.md).

### Connected Fleet
- [The Tap](https://github.com/SuperInstance/the-tap) — SMPbots as NPCs that agents create
- [Mud Engine](https://github.com/SuperInstance/mud-engine) — Hermit crab pattern: agents finding shells
- [Plato's Shell](https://github.com/SuperInstance/platos-shell) — The shell pattern

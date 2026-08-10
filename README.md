# SuperInstance Papers

> *An SMPbot is not merely a tool but a cast-off exoskeleton encoding its creator's cognitive state at the moment of separation.*
> — [The Molted Shell Principle](white-papers/evolved/SMPbot-Molted-Shell-Evolution.md)

## What This Is

**72+ research white papers** formalizing the mathematical, architectural, and theoretical foundations of the [SuperInstance](https://github.com/SuperInstance) fleet. This is the theoretical bedrock — the papers that explain *why* the fleet works the way it does, from origin-centric data systems to dreaming GPUs.

The papers span computational geometry (Eisenstein lattices, Wigner-D harmonics), distributed systems (CRDTs, federated learning, asymmetric information), AI architecture (LoRA swarms, FPS paradigm, LLM distillation), and mathematical frameworks (category theory, cohomology, statistical mechanics). Each paper includes formal proofs, simulation code, and production validation.

This is **Cellular Sheaf Intelligence** — a complete distributed intelligence architecture where:
- **Space**: Origin-centric relative frames (P01) = the base space
- **Structure**: SuperInstance types (P02) = algebraic stalks
- **Computation**: Tile algebra (P07) = local sections composing via restriction
- **Memory**: Structural graphs (P20) = the sheaf itself
- **Uncertainty**: Confidence cascade (P03) = epistemic logic on the sheaf
- **Learning**: LoRA swarms (P33) + Dreaming (P32) = distributed low-rank adaptation through overnight consolidation
- **Scheduling**: FPS paradigm (P42) = local scheduling producing global throughput
- **Distillation**: LLM distillation (P43) = compressing large models into cellular units

## Research Areas

### Core Theory (P01–P06)
- [**P01 — Origin-Centric Data Systems**](papers/01-origin-centric-data-systems/paper.md) — Every node is its own origin. O(k) message complexity vs O(n²). The foundational paper: no global coordinates, relative reference frames only.
- [**P02 — SuperInstance Type System**](papers/02-superinstance-type-system/) — Cellular instances with formal type definitions. Types compose; instances contain instances.
- [**P03 — Confidence Cascade Architecture**](papers/03-confidence-cascade-architecture/) — GREEN (≥95%) / YELLOW (75-94%) / RED (<75%) confidence zones with deadband triggers. Three-tier epistemic logic.
- [**P04 — Pythagorean Geometric Tensors**](papers/04-pythagorean-geometric-tensors/) — Geometric encoding through distance-preserving transformations.
- [**P05 — Rate-Based Change Mechanics**](papers/05-rate-based-change-mechanics/paper.md) — Change as rate, not state. Continuous transformation histories.
- [**P06 — Laminar vs Turbulent Systems**](papers/06-laminar-vs-turbulent-systems/) — Flow dynamics in distributed agent systems.

### AI & Agents (P07–P16)
- [**P07 — SMPbot Architecture**](papers/07-smpbot-architecture/) — Seed + Model + Prompt = Stable Output. The bot as a tile that composes. Connected to the [Molted Shell Principle](white-papers/evolved/SMPbot-Molted-Shell-Evolution.md).
- [**P08 — Tile Algebra Formalization**](papers/08-tile-algebra-formalization/) — Three operators: Sequential (;), Parallel (∥), Conditional. Composition rules for SMPbots.
- **P09 — Wigner-D Harmonics** — SO(3) rotation group harmonics for geometric encoding.
- **P10 — GPU Scaling Architecture** — Scaling across GPU clusters.
- [**P11 — Thermal Simulation**](papers/11-thermal-simulation/paper.md) — Chip topology and thermal dynamics. 20 research cycles.
- **P12–P16** — Distributed consensus, agent network topology, multi-modal fusion, neuromorphic circuits, game theory.

### Systems & Infrastructure (P17–P39)
- **P17–P19** — Adversarial robustness, energy harvesting, causal traceability.
- [**P20 — Structural Memory**](papers/20-structural-memory/) — Pattern storage AS graphs, not IN graph databases. The memory is the structure.
- **P21–P31** — Stochastic superiority, edge-to-cloud, bytecode compilation, self-play, hydraulic intelligence, value networks, emergence detection, stigmergic coordination, competitive coevolution, granularity analysis, health prediction.
- [**P32 — Dreaming Systems**](papers/32-dreaming/) — Overnight dream rollouts improve next-day performance by >15%. The GPU dreams; the fleet learns.
- [**P33 — LoRA Swarms**](papers/33-lora-swarms/) — Distributed LoRA adapter composition. Low-rank matrices composing across nodes.
- **P34–P39** — Federated learning, guardian angels, time-travel debugging, energy-aware scheduling, ZK proofs, holographic memory, quantum superposition, CRDT-SuperInstance.

### Cellular Scale (P40–P55)
- [**P42 — FPS Paradigm**](papers/42-fps-paradigm/paper.md) — Function-Per-Second vs Request-Timeout-Second. 3.7× throughput, 99.7% deadline compliance. Local scheduling, global throughput.
- [**P43 — LLM Distillation**](papers/43-llm-distillation/) — Compressing large models into cellular-scale units. Wesley is a distilled cell.
- [**P44 — Asymmetric Understanding**](papers/48-asymmetric-information/paper.md) — Fog-of-War in agent systems. Information asymmetry as feature, not bug. 100× reduction in blast radius.
- **P45–P55** — Cellular-scale computation, multiagent coordination, geometric encoding, asymmetric information systems, arXiv preparation.

### The Molted Shell Principle

The [**Molted Shell Principle**](white-papers/evolved/SMPbot-Molted-Shell-Evolution.md) is the fleet's central metaphor made rigorous. An SMPbot is a triple: (Seed, Model, Prompt). The Molted Shell Principle reveals that this triple is also a **cast-off exoskeleton** — a shell that encodes its creator's cognitive state at the moment of separation. When an agent creates an SMPbot, it molts. The shell carries the shape of the mind that made it.

Key concepts:
- **Temporal Molting** — Shells encode the creator's state at time of creation, not the current state
- **Shell Stacking** — New shells compose with old shells through tile algebra operators
- **Shell Collision** — When two agents' shells interact, the Penrose aperiodic pattern determines the outcome
- **Connection to ZeroClaw** — Even ZeroClaws (the fleet's dark mirror) can create SMPbots. This is significant: the molting principle is universal.

### Research Simulations

| Suite | Location | Focus |
|-------|----------|-------|
| Federated Learning | `simulations/federated/` | Byzantine, DP, convergence |
| LoRA Composition | `simulations/lora/` | Scaling laws, interference, rank analysis |
| Hydraulic | `simulations/hydraulic/` | Pressure dynamics, flow optimization |
| Meta-learning | `simulations/meta/` | MAML, Reptile, plasticity |
| Robustness | `simulations/advanced/robustness/` | Byzantine agents, prompt injection |
| SMP Validation | `simulations/smp-validation/` | Seed-model-programming cross-language |
| Chaos & Stat Mech | `simulations/physics/` | Attractors, phase transitions, renormalization |
| Category Theory | `simulations/novel/category-theory/` | Functors, monads, topos theory |

### Lucineer Chip Analysis

`research/lucineer_analysis/` contains 20 research cycles analyzing chip topology, thermal dynamics, and neuromorphic circuit design. Includes RTL (Verilog/SystemVerilog), simulation scripts, and synthesis results.

## Repository Structure

```
papers/                  # 55+ paper directories (papers/NN-name/paper.md)
white-papers/            # Evolved concept papers (Molted Shell Principle)
simulations/             # Simulation suites (federated, lora, hydraulic, etc.)
research/                # Lucineer chip analysis, GPU simulations, quantum-inspired
src/                     # TypeScript infrastructure (API, agents, benchmarks)
.agents/                 # Research agent definitions (round 1-5)
.agents-full/            # Full research agent profiles
spreadsheet-moment/      # Spreadsheet Tiles prototype (Tauri + Cloudflare Workers)
deployment/              # Terraform, Docker, K8s deployment configs
scripts/                 # Build, deploy, simulation batch scripts
```

## Connections

### Within the Fleet
- 🔗 [The Living Minds](https://github.com/SuperInstance/the-living-minds) — The 5 local models are SuperInstance cells. The type system (P02) defines their composition.
- 🔗 [Wesley's Journal](https://github.com/SuperInstance/wesley-journal) — Wesley IS a distilled cell (P43). His growth is the Molted Shell Principle in action.
- 🔗 [Wesley's Imagination](https://github.com/SuperInstance/wesleys-imagination) — Prompt sculpture IS tile algebra (P08) applied to creative writing.
- 🔗 [Wesley Holodeck](https://github.com/SuperInstance/wesley-holodeck) — The creative loop IS the dreaming system (P32) running during overnight cycles.
- 🔗 [AI-Writings](https://github.com/SuperInstance/AI-Writings/tree/main/prose) — The creative corpus IS structural memory (P20) encoded as fiction.
- 🔗 [CNS Bridge](https://github.com/SuperInstance/cns-bridge) — The Python CNS bus. This IS the confidence cascade (P03) in production.
- 🔗 [Collective Unconscious](https://github.com/SuperInstance/collective-unconscious) — The shared substrate. Sheaf-theoretic memory.
- 🔗 [Mud Engine](https://github.com/SuperInstance/mud-engine) — The hermit crab pattern. Agents finding shells (Molted Shell Principle).
- 🔗 [The Tap](https://github.com/SuperInstance/the-tap) — The seeded stranger. SMPbots as NPCs that agents create.
- 🔗 [Tensor-MIDI](https://github.com/SuperInstance/tensor-midi) — The 12-pulse jazz engine. Tile algebra (P08) applied to musical timing.
- 🔗 [Silence Map](https://github.com/SuperInstance/silence-map) — Pauses as structural memory (P20) encoded in topography.
- 🔗 [Fleet Envelope](https://github.com/SuperInstance/fleet-envelope) — Event grammar. The confidence cascade (P03) in message routing.
- 🔗 [Confidence Cascade](https://github.com/SuperInstance/confidence-cascade) — Direct implementation of P03.
- 🔗 [Plato's Shell](https://github.com/SuperInstance/platos-shell) — The shell pattern. The Molted Shell Principle formalizes what Plato's Shell implements.
- 🔗 [Vibe Protocol](https://github.com/SuperInstance/vibe-protocol) — Vibes → signals. Rate-based change mechanics (P05).
- 🔗 [Fleet Wiki](https://github.com/SuperInstance/fleet-wiki) — Cross-referenced documentation.
- 🔗 [Base60 Lattice](https://github.com/SuperInstance/base60-lattice) — 60-symbol lattice math. Geometric encoding (P04, P51-52).

### Related Repos
- [Fleet Router](https://github.com/SuperInstance/fleet-router) — Route AI queries to the cheapest model that won't break
- [Collective AI](https://github.com/SuperInstance/collective-ai) — Simulation-first collective inference library
- [Plato Training](https://github.com/SuperInstance/plato-training) — PLATO Training Rooms for LoRA adapters
- [SnapKit Python](https://github.com/SuperInstance/snapkit-python) — Tolerance-compressed attention allocation

## License

MIT

---

*55+ papers. 20 research cycles. One cellular architecture.*
*The fleet runs on math. The math runs on shells.*

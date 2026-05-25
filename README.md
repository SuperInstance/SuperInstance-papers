# SuperInstance-papers

**72+ research white papers on cellularized instances, origin-centric data, and distributed intelligence.**

Papers span computational geometry (Eisenstein lattices, Wigner-D harmonics), distributed systems (CRDTs, federated learning, asymmetric information), AI architecture (LoRA swarms, FPS paradigm, LLM distillation), and mathematical frameworks (category theory, cohomology, statistical mechanics). Each paper includes formal proofs, simulation code, and production validation.

## Research Areas

### Core Theory (P01–P06)
- Origin-centric data systems, SuperInstance type system, confidence cascade architecture, Pythagorean geometric tensors, rate-based change mechanics, laminar vs turbulent systems

### AI & Agents (P07–P16)
- SMPbot architecture, tile algebra formalization, GPU scaling, thermal simulation, distributed consensus, agent network topology, multi-modal fusion, neuromorphic circuits

### Formal Methods (P09, P17–P20)
- Wigner-D harmonics (SO(3)), adversarial robustness, game theory, energy harvesting, causal traceability

### Systems (P21–P39)
- Dreaming systems, LoRA swarms, federated learning, guardian angels, time-travel debugging, ZK proofs, holographic memory, quantum superposition, CRDT-SuperInstance

### Cellular Scale (P40–P55)
- FPS paradigm, LLM distillation, asymmetric understanding, cellular-scale computation, multiagent coordination, geometric encoding, arXiv preparation

### Simulation & Validation
- Lucineer chip analysis (20 research cycles), quantum-inspired computing, GPU simulation framework (phases 6–8), production simulation framework

## Repository Structure

```
papers/                  # 54+ paper directories, each with paper.md
simulations/             # Simulation suites (federated, lora, hydraulic, etc.)
research/
  ├── lucineer_analysis/ # Chip topology & thermal simulation research
  ├── phase6-9_*/        # GPU simulations, validation, platform, collaboration
  └── quantum_inspired/  # Quantum-classical hybrid computing
spreadsheet-moment/      # Spreadsheet Tiles prototype (Tauri + Cloudflare Workers)
src/                     # TypeScript infrastructure (API, agents, benchmarks)
deployment/              # Terraform, Docker, K8s deployment configs
scripts/                 # Build, deploy, simulation batch scripts
```

## Papers

Each paper lives in `papers/NN-name/paper.md`. Papers include:

- Formal mathematical proofs
- Algorithm pseudocode
- Production validation results
- Venue targets (ICML, NeurIPS, AAMAS, ICDCS, etc.)

Browse the [papers directory](papers/) for the full index.

## Simulations

The repo includes extensive simulation suites:

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

## Lucineer Analysis

`research/lucineer_analysis/` contains 20 research cycles analyzing chip topology, thermal dynamics, and neuromorphic circuit design. Includes RTL (Verilog/SystemVerilog), simulation scripts, and synthesis results.

## Infrastructure

The repo includes production infrastructure:

- **TypeScript backend** — API server, agent framework, benchmarking suite
- **Cloudflare Workers** — Edge deployment for spreadsheet-moment
- **Tauri desktop app** — Native spreadsheet-moment client
- **Vector DB** — Paper vectorization setup for semantic search
- **CI/CD** — GitHub Actions workflows for testing and deployment

## Related Repos

- **[fleet-router](https://github.com/SuperInstance/fleet-router)** — Route AI queries to the cheapest model that won't break
- **[collective-ai](https://github.com/SuperInstance/collective-ai)** — Simulation-first collective inference library
- **[plato-training](https://github.com/SuperInstance/plato-training)** — PLATO Training Rooms for LoRA adapters
- **[snapkit-python](https://github.com/SuperInstance/snapkit-python)** — Tolerance-compressed attention allocation

## License

MIT

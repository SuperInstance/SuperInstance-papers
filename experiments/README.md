# Experiment Sets — Fleet Mathematical Foundations

**Status:** Designed, not yet run
**Date:** 2026-08-10
**Author:** Lucineer Experimental Designer

Five experiment sets that test and extend the mathematical foundations of the fleet. Each is implementable on current fleet infrastructure. Each references actual code from the six mathematical repos.

## Repository Cross-References

| Repo | Core Contribution | Experiments That Test It |
|------|-------------------|--------------------------|
| `base60-lattice` | Bisection/trisection interlace, navigational lattice | EXP-5 (timing structure) |
| `log-tensor` | Permutation tensors, certainty-encoded depth, HGT homing | EXP-1, EXP-3, EXP-4 |
| `batten-spline` | Nadaraya-Watson kernel regression for model routing | EXP-1, EXP-4 |
| `confidence-cascade` | Sequential/parallel/conditional confidence composition | EXP-4 |
| `thought-amplifier` | 6 thinking modes, distillation, Pareto profile steering | EXP-1, EXP-2, EXP-3 |
| `tensor-midi` | 12-pulse jazz engine, 3:4 polyrhythm, flow state detection | EXP-5 |

## Experiment Index

1. **[Conservation Law Tests](./01-conservation-law.md)** — Does increasing tile density decrease inferential flexibility?
2. **[Semantic Distance Optimization](./02-semantic-distance.md)** — What is the optimal Δ distribution for creative breakthrough?
3. **[Hermit Crab Molting Dynamics](./03-molting-dynamics.md)** — Does periodic tile reset improve long-term agent performance?
4. **[Multi-Model Confidence Cascade](./04-confidence-cascade.md)** — Where is the diminishing returns threshold for N-model verification?
5. **[Tensor-MIDI Timing Experiments](./05-tensor-midi-timing.md)** — Does jazz-enforced timing improve agent coordination?

## Methodology

Each experiment document contains:
- **Hypothesis**: What we predict
- **Method**: How we test it
- **Metrics**: What we measure
- **Predicted Results**: Quantitative forecasts with effect sizes
- **Falsification Condition**: What would disprove the hypothesis
- **Implementation Path**: Exact code to write, using actual repos
- **Fleet Infrastructure**: What we need (all available now)

## Pre-Registration

These experiments are designed to be pre-registered before execution. The falsification conditions are explicit. Negative results are as valuable as positive ones.

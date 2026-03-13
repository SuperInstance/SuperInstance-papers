# P24: Self-Play Mechanisms - Novel Insights

**Paper:** P24 - Self-Play Mechanisms for Distributed Systems
**Created:** 2026-03-13
**Source:** Extracted from cross_paper_notes.md

---

## Novel Insights for Research

### Insight 1: Temperature Scheduling
Optimal temperature follows inverse-U pattern:
- Too low: No exploration, local optima
- Too high: Random selection, no learning
- Optimal: Annealing from high to low

**Proposed Formula:**
```
τ(t) = τ_max * exp(-t/τ_decay) + τ_min
```

### Insight 2: ELO as Diversity Metric
ELO standard deviation correlates with strategy diversity:
- Low std: Converged population
- High std: Active exploration
- Target: Controlled oscillation

### Insight 3: Generation-Strategy Novelty
Novel strategies appear most often at generation boundaries:
- Post-selection: Survivors recombine
- Post-mutation: New variations emerge
- Crossover: Strategy fusion

---

*Last Updated: 2026-03-13*
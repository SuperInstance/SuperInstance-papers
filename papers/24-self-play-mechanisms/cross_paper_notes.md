# P24: Self-Play Mechanisms - Cross-Paper Notes

**Paper:** P24 - Self-Play Mechanisms for Distributed Systems
**Created:** 2026-03-13

---

## Evidence FOR Other Papers

### P21: Stochastic Superiority
**Connection:** Gumbel-Softmax selection directly applies stochastic superiority principle.

**Evidence Found:**
- Temperature-controlled selection preserves exploration options
- Higher temperature in early generations improves diversity
- Annealing temperature improves convergence

**Mathematical Overlap:**
```
P24: π_i = exp((log α_i + g_i)/τ) / Σ exp((log α_j + g_j)/τ)
P21: Same Gumbel-Softmax formulation for decision making
```

**Cross-Pollination File:** Create `research/cross-pollination/FOR_P21.md`

---

### P29: Competitive Coevolution
**Connection:** Self-play is foundation for coevolution architectures.

**Evidence Found:**
- ELO system can be extended to dual-population coevolution
- Arms race dynamics emerge from self-play
- Fitness coupling: F_solver = success_rate(generated_problems)

**Potential Synergy:**
- Self-play + Problem generation = Full coevolution
- Arms race detection: corr(ΔF_solver, ΔF_generator) < 0

**Cross-Pollination File:** Create `research/cross-pollination/FOR_P29.md`

---

### P13: Agent Network Topology
**Connection:** Competition topology affects emergence patterns.

**Evidence Found:**
- Tournament vs Round-robin affects ELO distribution
- Network structure influences strategy diversity
- Hub tiles (high connectivity) have more stable ELO

**Potential Synergy:**
- Scale-free competition networks
- Small-world opponent selection

---

## Evidence AGAINST Other Papers

### Potential Conflicts with P7: SMPbot
**Concern:** Stochastic selection may conflict with deterministic requirements.

**Analysis:**
- SMPbot requires deterministic fallback for critical operations
- Self-play introduces controlled randomness
- Resolution: Hybrid system with deterministic core + stochastic exploration

**Mitigation:** Temperature can approach 0 for deterministic behavior

---

## Mathematical Dependencies

### From P21 (Stochastic Superiority)
```python
# Gumbel-Softmax selection
def gumbel_softmax_selection(scores, temperature):
    gumbel_noise = -np.log(-np.log(np.random.uniform(0, 1, scores.shape)))
    perturbed = (scores + gumbel_noise) / temperature
    exp_scores = np.exp(perturbed - np.max(perturbed))
    probs = exp_scores / np.sum(exp_scores)
    return np.random.choice(len(scores), p=probs), probs
```

### From P29 (Coevolution - Planned)
```python
# Arms race detection
def detect_arms_race(solver_fitness_history, generator_fitness_history):
    correlation = np.corrcoef(
        np.diff(solver_fitness_history),
        np.diff(generator_fitness_history)
    )[0, 1]
    return correlation < -0.3  # Negative correlation = arms race
```

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

## Files to Create

1. `research/cross-pollination/FOR_P21.md` - Stochastic selection evidence
2. `research/cross-pollination/FOR_P29.md` - Coevolution foundation
3. `research/synergies/P21+P24.md` - Stochastic self-play
4. `research/synergies/P24+P26.md` - Value networks for match prediction

---

## Open Questions

1. **Optimal Population Size:** Does scaling to 100+ tiles improve results?
2. **Task Difficulty Distribution:** What distribution maximizes learning?
3. **Crossover vs Mutation:** Which contributes more to novelty?
4. **ELO Convergence:** How many matches until stable ratings?

---

*Last Updated: 2026-03-13*

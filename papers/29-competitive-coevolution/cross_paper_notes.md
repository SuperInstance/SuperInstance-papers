# P29: Competitive Coevolution - Cross-Paper Notes

**Paper:** P29 - Competitive Coevolution Architectures
**Created:** 2026-03-13

---

## Evidence FOR Other Papers

### P24: Self-Play Mechanisms
**Connection:** Self-play provides foundation for coevolution architectures.

**Evidence Found:**
- Self-play is single-population coevolution
- ELO rating system extends to dual-population coevolution
- Arms race dynamics emerge from competitive interactions

**Mathematical Overlap:**
```
P24: ELO update: ΔR = K * (S - E)
P29: Extended to dual-population: ΔR_solver = K * (S - E(generator))
```

**Potential Synergy:**
- Self-play as bootstrap for coevolution
- Hybrid systems: self-play within populations, coevolution between populations

### P21: Stochastic Superiority
**Connection:** Stochastic selection mechanisms enhance coevolution diversity.

**Evidence Found:**
- Gumbel-Softmax selection maintains exploration
- Temperature annealing balances exploration vs exploitation
- Stochastic selection prevents premature convergence

**Potential Synergy:**
- Stochastic selection in both solver and generator populations
- Temperature scheduling for coordinated exploration

---

## Evidence AGAINST Other Papers

*No conflicts identified at this time.*

---

## Mathematical Dependencies

### From P24 (Self-Play)
```python
def extended_elo_update(solver_rating, generator_rating, outcome, K=32):
    """Extended ELO for dual-population coevolution."""
    expected_solver = 1 / (1 + 10 ** ((generator_rating - solver_rating) / 400))
    rating_change = K * (outcome - expected_solver)
    return solver_rating + rating_change, generator_rating - rating_change
```

### From P21 (Stochastic Superiority)
```python
def coevolution_selection(fitness_scores, temperature):
    """Gumbel-Softmax selection for coevolution populations."""
    gumbel_noise = -np.log(-np.log(np.random.uniform(0, 1, fitness_scores.shape)))
    perturbed = (fitness_scores + gumbel_noise) / temperature
    exp_scores = np.exp(perturbed - np.max(perturbed))
    probs = exp_scores / np.sum(exp_scores)
    return np.random.choice(len(fitness_scores), p=probs), probs
```

---

## Novel Insights

*To be discovered through simulation.*

---

## Files to Create

1. `research/cross-pollination/FOR_P24.md` - Coevolution foundation evidence
2. `research/cross-pollination/FOR_P21.md` - Stochastic selection evidence
3. `research/synergies/P24+P29.md` - Self-play to coevolution transition
4. `research/synergies/P21+P29.md` - Stochastic coevolution

---

## Open Questions

1. **Arms Race Detection:** Optimal correlation threshold for healthy competition?
2. **Population Size Ratio:** Optimal solver:generator population ratio?
3. **Migration Frequency:** How often should individuals migrate between populations?
4. **Convergence Criteria:** When has coevolution exhausted novelty?

---

*Last Updated: 2026-03-13*
# Cross-Pollination: Evidence FOR P29 (Competitive Coevolution)

**Source Paper:** P24 - Self-Play Mechanisms for Distributed Systems
**Target Paper:** P29 - Competitive Coevolution
**Created:** 2026-03-13
**Connection Strength:** Strong

---

## Evidence Summary

Self-play provides foundation for coevolution architectures, with ELO system extensible to dual-population coevolution.

## Detailed Evidence

### ELO System Extension
- **Observation:** ELO rating system can be extended to dual-population coevolution
- **Relevance to P29:** Provides mathematical foundation for competitive coevolution rating
- **Data:** Arms race dynamics emerge naturally from self-play interactions

### Fitness Coupling
**P24 Insight:** Fitness coupling where solver fitness depends on generator performance:
```
F_solver = success_rate(generated_problems)
```

**P29 Connection:** Direct mapping to coevolution fitness evaluation.

### Potential Synergy
- **Self-play + Problem generation = Full coevolution:** P24 provides single-population foundation, P29 extends to dual-population
- **Arms race detection:** Negative correlation between solver and generator fitness changes indicates healthy competition

## Mathematical Dependencies

### Extended ELO Update
```python
def extended_elo_update(solver_rating, generator_rating, outcome, K=32):
    """Extended ELO for dual-population coevolution."""
    expected_solver = 1 / (1 + 10 ** ((generator_rating - solver_rating) / 400))
    rating_change = K * (outcome - expected_solver)
    return solver_rating + rating_change, generator_rating - rating_change
```

### Arms Race Detection
```python
def detect_arms_race(solver_fitness_history, generator_fitness_history):
    correlation = np.corrcoef(
        np.diff(solver_fitness_history),
        np.diff(generator_fitness_history)
    )[0, 1]
    return correlation < -0.3  # Negative correlation = arms race
```

## Implications for P29

1. **Foundation:** P24 provides proven single-population competitive framework
2. **Metrics:** ELO system offers rigorous rating methodology for coevolution
3. **Dynamics:** Arms race patterns observed in P24 inform P29 design

## Cross-Reference

- **Source:** `papers/24-self-play-mechanisms/cross_paper_notes.md`
- **Simulation:** `papers/24-self-play-mechanisms/simulation_schema.py`
- **Validation:** `papers/24-self-play-mechanisms/validation_criteria.md`

## Confidence Level

**High** - Direct architectural extension with shared mathematical framework.

---

*Last Updated: 2026-03-13*
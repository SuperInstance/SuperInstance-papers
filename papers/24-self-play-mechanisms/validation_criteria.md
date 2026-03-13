# P24: Self-Play Mechanisms - Validation Criteria

**Paper:** P24 - Self-Play Mechanisms for Distributed Systems
**Created:** 2026-03-13
**Status:** Research Phase - Claims to Validate

---

## Core Claims to Validate

### Claim 1: Self-Play Improves Success Rate >30%
**Statement:** Self-play improves task success rate by more than 30% over static configurations.

**Validation Criteria:**
- [ ] Run simulation with self-play evolution for N generations
- [ ] Run simulation with static (non-evolving) configuration
- [ ] Calculate improvement percentage: `(self_play_rate - static_rate) / static_rate * 100`
- [ ] Validate: improvement > 30%

**Falsification Criteria:**
- If improvement < 30% across multiple simulation runs with varying parameters
- If self-play performance degrades compared to static (negative improvement)

**Data Required:**
```python
{
    "self_play_success_rate": float,  # Average win rate with evolution
    "static_success_rate": float,     # Average win rate without evolution
    "improvement_percent": float,     # Percentage improvement
    "sample_size": int,               # Number of matches
    "confidence_interval": (float, float)
}
```

---

### Claim 2: ELO Correlation > 0.8
**Statement:** ELO ratings correlate with actual task performance (r > 0.8).

**Validation Criteria:**
- [ ] Track ELO ratings for all tiles across matches
- [ ] Track actual win rates for all tiles
- [ ] Calculate Pearson correlation coefficient
- [ ] Validate: correlation > 0.8

**Falsification Criteria:**
- If correlation < 0.8 consistently across runs
- If ELO ratings show no predictive power for performance

**Data Required:**
```python
{
    "correlation_coefficient": float,  # Pearson r
    "p_value": float,                  # Statistical significance
    "sample_size": int,                # Number of tiles
    "confidence_interval": (float, float)
}
```

---

### Claim 3: Novel Strategies from Evolution
**Statement:** Generational evolution produces novel strategies not in initial population.

**Validation Criteria:**
- [ ] Record all strategy signatures in initial population
- [ ] Track new strategy signatures appearing in each generation
- [ ] Count novel strategies not present in initial population
- [ ] Validate: novel_strategy_count > 0

**Falsification Criteria:**
- If no new strategies emerge across multiple generations
- If evolved strategies are only minor perturbations of initial strategies

**Data Required:**
```python
{
    "initial_strategy_count": int,
    "final_strategy_count": int,
    "novel_strategies_by_generation": List[int],
    "strategy_diversity_over_time": List[float],
    "mutation_rate_used": float,
    "crossover_rate_used": float
}
```

---

### Claim 4: Edge Case Discovery
**Statement:** Adversarial training finds edge cases humans miss.

**Validation Criteria:**
- [ ] Include edge case tasks in task pool
- [ ] Track which tiles successfully solve edge cases
- [ ] Track strategies used for edge case solutions
- [ ] Validate: edge_cases_solved > 0 with evolved strategies

**Falsification Criteria:**
- If evolved strategies perform worse on edge cases than initial
- If no edge cases are solved through evolution

**Data Required:**
```python
{
    "total_edge_cases": int,
    "edge_cases_solved_by_evolved": int,
    "edge_cases_solved_by_initial": int,
    "improvement_on_edge_cases": float
}
```

---

## Cross-Paper Connections

### FOR Other Papers
- **P21 (Stochastic Superiority):** Gumbel-Softmax selection provides stochastic exploration
- **P29 (Coevolution):** Self-play can be extended to dual-population coevolution
- **P13 (Agent Networks):** Competition topology affects emergence

### AGAINST Other Papers
- If self-play fails to improve, claims in P29 may need revision
- If ELO doesn't correlate, ranking systems in other papers need reassessment

### Synergies to Explore
- P21 + P24: Stochastic selection in competitive environments
- P24 + P29: Self-play as foundation for coevolution architectures
- P24 + P26: Value networks for predicting match outcomes

---

## Simulation Parameters

### Default Configuration
| Parameter | Value | Description |
|-----------|-------|-------------|
| num_tiles | 20 | Tiles in population |
| strategy_dim | 50 | Dimension of strategy vector |
| temperature | 0.8 | Gumbel-Softmax temperature |
| mutation_rate | 0.1 | Probability of mutation |
| crossover_rate | 0.3 | Probability of crossover |
| matches_per_tile | 10 | Matches per generation |
| num_generations | 10 | Evolution cycles |

### Sensitivity Analysis
- Temperature: [0.5, 0.8, 1.0, 1.5]
- Mutation rate: [0.05, 0.1, 0.2, 0.3]
- Population size: [10, 20, 50, 100]

---

## Experimental Controls

### Control Group
- Static configuration (no evolution)
- Random selection (no ELO-based matching)
- Deterministic selection (no Gumbel-Softmax)

### Experimental Group
- Full self-play with evolution
- ELO-based opponent selection
- Gumbel-Softmax stochastic selection

### Metrics to Track
1. Success rate over time
2. ELO distribution over generations
3. Strategy diversity (Shannon entropy)
4. Edge case discovery rate

---

## Validation Status

| Claim | Theoretical | Simulation | Status |
|-------|-------------|------------|--------|
| C1: >30% improvement | ✓ | 🔲 Needed | Pending |
| C2: ELO r > 0.8 | ✓ | 🔲 Needed | Pending |
| C3: Novel strategies | ✓ | 🔲 Needed | Pending |
| C4: Edge case discovery | ✓ | 🔲 Needed | Pending |

---

## Next Steps

1. Run simulation with default parameters
2. Record all metrics for validation
3. Perform sensitivity analysis
4. Document cross-paper findings
5. Update NEXT_PHASE_PAPERS.md with results

---

*Schema Version: 1.0*
*Last Updated: 2026-03-13*

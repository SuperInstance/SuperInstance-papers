# P29: Competitive Coevolution - Validation Criteria

**Paper:** P29 - Competitive Coevolution Architectures
**Created:** 2026-03-13
**Status:** Research Phase - Claims to Validate
**Hardware:** RTX 4050 GPU (CUDA 13.1.1, CuPy 14.0.1)

---

## Core Claims to Validate

### Claim 1: Coevolution Improvement
**Statement:** Coevolution produces >40% improvement over single-population evolution.

**Validation Criteria:**
- [ ] Run simulation with coevolution (solver + generator populations)
- [ ] Run simulation with single-population evolution
- [ ] Measure performance improvement after equal number of generations
- [ ] Calculate improvement percentage: `(coevolution_score - single_pop_score) / single_pop_score * 100`
- [ ] Validate: improvement > 40%

**Falsification Criteria:**
- If improvement < 20% across multiple simulation runs
- If coevolution performs worse than single-population evolution

**Data Required:**
```python
{
    "coevolution_score": float,        # Final performance metric
    "single_population_score": float,  # Baseline performance
    "improvement_percent": float,
    "generations": int,
    "population_sizes": Dict[str, int]
}
```

### Claim 2: Arms Race Correlation
**Statement:** Arms race correlation is negative (r < -0.3) indicating healthy competition.

**Validation Criteria:**
- [ ] Track solver and generator fitness across generations
- [ ] Calculate correlation between fitness changes: `corr(ΔF_solver, ΔF_generator)`
- [ ] Validate: correlation < -0.3

**Falsification Criteria:**
- If correlation > -0.1 (weak or positive correlation)
- If correlation becomes positive (cooperative rather than competitive)

**Data Required:**
```python
{
    "solver_fitness_history": List[float],
    "generator_fitness_history": List[float],
    "correlation_coefficient": float,
    "p_value": float,
    "generation_count": int
}
```

### Claim 3: Problem Generator Edge Cases
**Statement:** Problem generators discover edge cases humans miss.

**Validation Criteria:**
- [ ] Run human-designed test suite
- [ ] Run generator-designed test suite
- [ ] Measure coverage of failure modes
- [ ] Validate: generator suite covers >30% more failure modes

**Falsification Criteria:**
- If generator suite covers < 10% more failure modes
- If human suite outperforms generator suite

**Data Required:**
```python
{
    "human_suite_coverage": float,     # Fraction of known failure modes
    "generator_suite_coverage": float,
    "additional_coverage": float,      # generator - human
    "novel_failures_discovered": int   # Previously unknown failures
}
```

### Claim 4: Solver Population Diversity
**Statement:** Solver population diversity maintains >0.5 throughout evolution.

**Validation Criteria:**
- [ ] Track population diversity metric (e.g., genotype/phenotype distance)
- [ ] Calculate diversity score normalized to [0, 1]
- [ ] Validate: diversity > 0.5 for all generations after initialization

**Falsification Criteria:**
- If diversity drops below 0.3 for sustained periods
- If population converges prematurely (diversity < 0.2)

**Data Required:**
```python
{
    "diversity_history": List[float],
    "min_diversity": float,
    "mean_diversity": float,
    "convergence_generation": Optional[int],  # When diversity < threshold
    "diversity_metric": str  # e.g., "genotypic", "phenotypic"
}
```

---

## Simulation Parameters

**Population Sizes:** 50-200 individuals per population
**Generations:** 100-500
**Selection Mechanism:** Tournament selection, Gumbel-Softmax
**Crossover Rate:** 0.6-0.8
**Mutation Rate:** 0.1-0.3
**Migration Frequency:** Every 5-20 generations
**Migration Rate:** 5-20% of population

**Problem Domain:** Tile algebra tasks, optimization problems, classification
**Fitness Metrics:** Success rate, solution quality, speed, robustness

**Diversity Metrics:**
- Genotypic: Hamming distance between strategy vectors
- Phenotypic: Behavioral diversity (different solutions)
- Functional: Capability diversity (different approaches)

---

## Success Thresholds

| Metric | Minimum Success | Target Success |
|--------|----------------|----------------|
| Improvement Over Single-Pop | > 30% | > 40% |
| Arms Race Correlation | < -0.2 | < -0.3 |
| Edge Case Coverage Improvement | > 20% | > 30% |
| Minimum Diversity | > 0.4 | > 0.5 |
| Sustained Diversity | > 0.3 for all gens | > 0.4 for all gens |

---

## Experimental Controls

1. **Single-Population Evolution:** Baseline for comparison
2. **Random Search:** No evolution, random candidate selection
3. **Human-Designed Tests:** Expert-crafted edge cases
4. **Static Test Suite:** Fixed problem set (no generation)
5. **Cooperative Coevolution:** Positive fitness correlation control

**Randomization:** 20+ random seeds per configuration
**Statistical Significance:** p < 0.05 for all comparisons
**Effect Size:** Cohen's d > 0.5 for meaningful differences

---

## Arms Race Detection Algorithm

```python
def detect_arms_race(solver_fitness, generator_fitness):
    """Calculate arms race correlation."""
    delta_solver = np.diff(solver_fitness)
    delta_generator = np.diff(generator_fitness)
    correlation = np.corrcoef(delta_solver, delta_generator)[0, 1]
    return correlation
```

**Interpretation:**
- `correlation < -0.3`: Strong arms race
- `-0.3 < correlation < -0.1`: Moderate competition
- `correlation > -0.1`: Weak or cooperative dynamics

---

*Last Updated: 2026-03-13*
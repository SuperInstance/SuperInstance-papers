# P30: Granularity Analysis - Validation Criteria

**Paper:** P30 - Granularity Analysis for Agent Systems
**Created:** 2026-03-13
**Status:** Research Phase - Claims to Validate
**Hardware:** RTX 4050 GPU (CUDA 13.1.1, CuPy 14.0.1)

---

## Core Claims to Validate

### Claim 1: Optimal Granularity Curve
**Statement:** Optimal granularity follows inverse-U curve (too fine or too coarse reduces performance).

**Validation Criteria:**
- [ ] Run simulations across granularity spectrum (0.0 to 1.0)
- [ ] Measure system performance at each granularity level
- [ ] Fit quadratic curve: `performance = a*g² + b*g + c`
- [ ] Validate: `a < 0` (concave down, inverse-U) AND peak within (0.3, 0.7)

**Falsification Criteria:**
- If `a > 0` (convex curve)
- If peak at extremes (< 0.2 or > 0.8)
- If flat curve (no clear optimum)

**Data Required:**
```python
{
    "granularity_levels": List[float],
    "performance_scores": List[float],
    "quadratic_fit": {"a": float, "b": float, "c": float},
    "optimal_granularity": float,
    "peak_performance": float,
    "curve_concavity": float  # a parameter
}
```

### Claim 2: Communication vs Emergence Scaling
**Statement:** Communication overhead scales O(n²) while emergent capabilities scale O(n log n).

**Validation Criteria:**
- [ ] Run simulations with varying agent counts (10 to 1000)
- [ ] Measure communication cost per agent
- [ ] Measure emergent capabilities count/quality
- [ ] Fit scaling laws: `cost ~ n^α`, `emergence ~ n^β`
- [ ] Validate: `α ≈ 2.0 ± 0.3` AND `β ≈ 1.0 ± 0.3` (log n factor included)

**Falsification Criteria:**
- If `α < 1.5` (better than quadratic scaling)
- If `β > 1.5` (worse than log-linear scaling)
- If emergence scales sub-linearly (`β < 0.5`)

**Data Required:**
```python
{
    "agent_counts": List[int],
    "communication_costs": List[float],
    "emergence_scores": List[float],
    "scaling_exponent_comm": float,  # α
    "scaling_exponent_emergence": float,  # β
    "r_squared_comm": float,
    "r_squared_emergence": float
}
```

### Claim 3: Minimum Viable Agent
**Statement:** Minimum viable agent requires: receive, process, transmit capabilities, learning > 0, expertise > 0.

**Validation Criteria:**
- [ ] Create agent variants missing each capability
- [ ] Measure system performance with each variant
- [ ] Identify critical capabilities (performance drop > 50% when missing)
- [ ] Validate: all five capabilities are critical

**Falsification Criteria:**
- If any capability can be removed with < 30% performance drop
- If additional capabilities are required beyond these five

**Data Required:**
```python
{
    "capabilities_tested": List[str],
    "performance_with_capability": Dict[str, float],
    "performance_without_capability": Dict[str, float],
    "performance_drop": Dict[str, float],
    "critical_capabilities": List[str]  # Drop > 50%
}
```

### Claim 4: Granularity Optimization Benefit
**Statement:** Granularity optimization improves system efficiency by >25%.

**Validation Criteria:**
- [ ] Run simulation with fixed suboptimal granularity (e.g., 0.2 or 0.8)
- [ ] Run simulation with optimized granularity (peak of curve)
- [ ] Calculate efficiency improvement
- [ ] Validate: improvement > 25%

**Falsification Criteria:**
- If improvement < 15%
- If optimal granularity provides negligible benefit

**Data Required:**
```python
{
    "suboptimal_granularity": float,
    "suboptimal_performance": float,
    "optimal_granularity": float,
    "optimal_performance": float,
    "improvement_percent": float,
    "optimization_cost": float  # Cost to find optimum
}
```

---

## Simulation Parameters

**Granularity Spectrum:** 0.0 (fully atomic) to 1.0 (fully monolithic)
**Agent Counts:** 10, 25, 50, 100, 200, 500, 1000
**Capability Levels:**
- Receive: 0.0 to 1.0
- Process: 0.0 to 1.0
- Transmit: 0.0 to 1.0
- Learning: 0.0 to 1.0
- Expertise: 0.0 to 1.0

**Task Complexity:** Simple to complex multi-step tasks
**Environment:** Dynamic with changing requirements

**Performance Metrics:**
- Task completion rate
- Resource utilization efficiency
- Robustness to agent failures
- Adaptability to new tasks

---

## Success Thresholds

| Metric | Minimum Success | Target Success |
|--------|----------------|----------------|
| Inverse-U Concavity (a) | < -0.1 | < -0.3 |
| Optimal Granularity Range | (0.2, 0.8) | (0.3, 0.7) |
| Communication Scaling (α) | 1.7 to 2.3 | 1.9 to 2.1 |
| Emergence Scaling (β) | 0.7 to 1.3 | 0.9 to 1.1 |
| Critical Capabilities | 4/5 required | 5/5 required |
| Optimization Improvement | > 20% | > 25% |

---

## Experimental Controls

1. **Fixed Granularity Baselines:** 0.2, 0.5, 0.8 granularity
2. **Random Granularity:** Random assignment per agent
3. **Human-Optimized:** Expert-chosen granularity
4. **Capability Ablation:** Remove one capability at a time
5. **Idealized Communication:** Zero-cost communication baseline

**Randomization:** 15+ random seeds per configuration
**Statistical Significance:** p < 0.05 for all comparisons
**Effect Size:** Cohen's d > 0.5 for capability criticality

---

## Granularity Metrics

**Definition:** `granularity = 1 - (num_agents / max_agents)`
- 0.0: Each agent is atomic (max agents)
- 1.0: Single monolithic agent (min agents)

**Communication Cost:** `cost = Σ_i Σ_j comm(i, j)`
**Emergence Score:** `score = Σ novel_capabilities / time`

---

*Last Updated: 2026-03-13*
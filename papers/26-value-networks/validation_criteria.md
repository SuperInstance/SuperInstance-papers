# P26: Value Networks - Validation Criteria

**Paper:** P26 - Value Networks for Colony State Evaluation
**Created:** 2026-03-13
**Status:** Research Phase - Claims to Validate
**Hardware:** RTX 4050 GPU (CUDA 13.1.1, CuPy 14.0.1)

---

## Core Claims to Validate

### Claim 1: Value Prediction Correlation
**Statement:** Value prediction correlates with actual outcomes (r > 0.7)

**Validation Criteria:**
- [ ] Train value network on colony states
- [ ] Record predictions vs actual outcomes
- [ ] Calculate Pearson correlation
- [ ] Validate: r > 0.7

**Data Required:**
```python
{
    "prediction_outcome_pairs": List[Tuple[float, float]],
    "correlation_coefficient": float,
    "p_value": float,
    "sample_size": int
}
```

---

### Claim 2: Uncertainty Calibration
**Statement:** Uncertainty estimates are well-calibrated (Brier score < 0.2)

**Validation Criteria:**
- [ ] Ensemble prediction with uncertainty
- [ ] Calculate Brier score: (1/N) * sum((f_t - o_t)^2)
- [ ] Validate: Brier < 0.2

**Data Required:**
```python
{
    "brier_score": float,
    "calibration_curve": List[Tuple[float, float]],  # (predicted_prob, observed_freq)
    "ensemble_size": int
}
```

---

### Claim 3: Value-Guided Improvement
**Statement:** Value-guided decisions outperform random selection by >20%

**Validation Criteria:**
- [ ] Run value-guided decision trials
- [ ] Run random decision trials
- [ ] Compare average outcomes
- [ ] Validate: improvement > 20%

**Data Required:**
```python
{
    "guided_avg_outcome": float,
    "random_avg_outcome": float,
    "improvement_percent": float,
    "trials_per_condition": int
}
```

---

### Claim 4: Dreaming Improves Performance
**Statement:** Overnight optimization via dreaming improves next-day performance

**Validation Criteria:**
- [ ] Implement dream rollouts from replay buffer
- [ ] Measure performance before and after dreaming
- [ ] Validate: improvement > 0

**Data Required:**
```python
{
    "pre_dream_performance": float,
    "post_dream_performance": float,
    "dream_rollouts": int,
    "performance_improvement": float
}
```

---

## Mathematical Formulas

### TD(lambda) Learning
```
V(s) <- V(s) + alpha[delta + gamma*lambda*V(s') - V(s)]
where delta = r + gamma*V(s') - V(s)
```

### Ensemble Uncertainty
```
sigma = sqrt(sum(p_i - mu)^2 / n)
```

### Colony Configuration Vector
```
CCV = (A, E, W, Phi, Psi)
- A: Agent activations
- E: Environment state
- W: Workload state
- Phi: Pheromone state
- Psi: Stress state
```

---

## GPU Acceleration Notes

### CuPy Compatibility
All simulations designed for CuPy acceleration:
```python
import cupy as cp  # Drop-in replacement for numpy

# GPU-accelerated forward pass
features_gpu = cp.asarray(features)
h1_gpu = cp.maximum(0, features_gpu @ W1_gpu + b1_gpu)
```

### Memory Management for RTX 4050 (6GB)
- Batch size recommendations: 32-64
- State dimension: 64-128
- Ensemble size: 5-10

### Performance Targets
- Forward pass: <1ms per prediction
- Training step: <10ms
- Dream rollout: <100ms for 100 rollouts

---

## Cross-Paper Connections

### FOR Other Papers
- **P32 (Dreaming):** Overnight optimization cycles
- **P31 (Health Prediction):** Value as health metric
- **P24 (Self-Play):** Value-guided opponent selection

### FROM Other Papers
- **P21 (Stochastic):** Stochastic value sampling
- **P13 (Agent Networks):** Network state features

---

## Validation Status

| Claim | Theoretical | Simulation | GPU-Accelerated | Status |
|-------|-------------|------------|-----------------|--------|
| C1: Correlation > 0.7 | Done | Needed | Pending | Pending |
| C2: Brier < 0.2 | Done | Needed | Pending | Pending |
| C3: Improvement > 20% | Done | Needed | Pending | Pending |
| C4: Dreaming works | Done | Needed | Pending | Pending |

---

*Schema Version: 1.0*
*GPU Optimized: RTX 4050*
*Last Updated: 2026-03-13*

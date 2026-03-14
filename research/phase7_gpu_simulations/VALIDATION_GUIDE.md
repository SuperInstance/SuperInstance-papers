# GPU-Cloud Cross-Validation Guide

**Framework for ensuring consistency between local GPU and DeepInfra cloud simulations**

**Version:** 1.0.0
**Last Updated:** 2026-03-13
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Validation Categories](#validation-categories)
3. [Quick Start](#quick-start)
4. [Advanced Usage](#advanced-usage)
5. [Interpreting Results](#interpreting-results)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Overview

The GPU-Cloud Cross-Validation Framework ensures that simulations run consistently and accurately across different compute backends (local GPU vs. DeepInfra cloud).

### Why Cross-Validate?

- **Correctness:** Verify implementations produce equivalent results
- **Numerical Stability:** Detect floating-point precision issues
- **Algorithm Consistency:** Ensure optimizations don't change behavior
- **Production Confidence:** Build trust in hybrid processing
- **Cost Optimization:** Validate when cloud is worth the cost

### Validation Philosophy

> "Test everything. Trust nothing. Validate continuously."

The framework uses **statistical rigor** rather than bit-level equality, acknowledging that:
- Different GPU architectures may produce slightly different results
- Stochastic algorithms require statistical equivalence
- Performance optimizations should preserve mathematical correctness
- Small numerical differences are acceptable within tolerance

---

## Validation Categories

### 1. Numerical Accuracy

**What it checks:** Exact agreement between computed values

**Metrics:**
- **Max Absolute Difference:** Largest numeric difference
- **Max Relative Error:** Largest difference relative to magnitude
- **Correlation Coefficient:** Linear relationship strength
- **RMSE:** Root Mean Square Error

**Pass Criteria:**
- Relative error < 1%
- Correlation > 0.99
- RMSE < 1e-6

**When to use:**
- Deterministic algorithms
- Fixed-precision computations
- Reference implementation validation

### 2. Statistical Consistency

**What it checks:** Distributional equivalence across multiple runs

**Metrics:**
- **T-test:** Tests if means are statistically different
- **KS Test:** Tests if distributions are different
- **Cohen's d:** Measures effect size (magnitude of difference)
- **Confidence Intervals:** Uncertainty in difference estimate

**Pass Criteria:**
- p-value > 0.05 (cannot reject null hypothesis)
- |Cohen's d| < 0.2 (negligible effect size)

**When to use:**
- Stochastic algorithms
- Monte Carlo simulations
- Evolutionary systems
- Any algorithm with randomness

### 3. Performance Consistency

**What it checks:** Computational efficiency relationships

**Metrics:**
- **Speedup Factor:** GPU time / Cloud time
- **Cost Efficiency:** Speedup × cost ratio
- **Memory Usage:** RAM/VRAM consumption
- **Scaling Behavior:** Performance vs. problem size

**Pass Criteria:**
- Speedup within expected range (0.5x - 100x)
- Consistent scaling exponents
- Linear or better memory growth

**When to use:**
- Benchmarking
- Cost-benefit analysis
- Capacity planning

### 4. Robustness Validation

**What it checks:** Behavior under adverse conditions

**Metrics:**
- **Noise Tolerance:** Consistency under input noise
- **Outlier Consistency:** Agreement on rare events
- **Edge Case Agreement:** Boundary condition behavior
- **Error Propagation:** How numerical errors accumulate

**Pass Criteria:**
- Noise tolerance score > 0.9
- Outlier consistency > 0.8
- Edge case agreement > 0.85

**When to use:**
- Production deployment
- Critical systems
- Unknown input distributions

---

## Quick Start

### Installation

```bash
# Install dependencies
pip install numpy scipy cupy-cuda12x  # Use appropriate CUDA version

# Verify installation
python -c "import cupy; print(cupy.__version__)"
python -c "import scipy; print(scipy.__version__)"
```

### Basic Usage

```python
import asyncio
from cross_validation import GPUCloudCrossValidator

async def validate_my_simulation():
    # Create validator
    validator = GPUCloudCrossValidator()

    # Run validation
    result = await validator.validate_simulation(
        simulation_type='my_simulation',
        parameters={
            'num_agents': 1000,
            'time_steps': 1000
        },
        num_runs=30
    )

    # Check results
    if result.passed:
        print("✅ Validation passed!")
    else:
        print("❌ Validation failed!")
        print(f"   Relative error: {result.numerical_metrics.max_relative_error:.4f}")
        print(f"   Statistical equivalence: {result.statistical_metrics.is_equivalent}")

    # Save report
    validator.save_results()

asyncio.run(validate_my_simulation())
```

### Custom Tolerances

```python
validator = GPUCloudCrossValidator(
    tolerance_config={
        'max_relative_error': 0.005,  # Stricter: 0.5%
        'max_p_value': 0.01,          # Stricter: 99% confidence
        'min_correlation': 0.999      # Stricter: near-perfect correlation
    }
)
```

---

## Advanced Usage

### Selective Validation Categories

```python
from cross_validation import ValidationCategory

# Only validate numerical accuracy and performance
result = await validator.validate_simulation(
    simulation_type='my_simulation',
    parameters={...},
    categories=[
        ValidationCategory.NUMERICAL_ACCURACY,
        ValidationCategory.PERFORMANCE_CONSISTENCY
    ]
)
```

### Custom Simulation Implementations

```python
class MyGPUSimulator:
    def run(self, sim_type, params, run_id):
        # Your GPU implementation here
        import cupy as cp
        result = cp.random.randn(1000)
        return {
            'metric': float(cp.mean(result)),
            'execution_time': 0.1,
            'memory_used': 1.5
        }

class MyCloudClient:
    async def run(self, sim_type, params, run_id):
        # Your cloud implementation here
        import numpy as np
        result = np.random.randn(1000)
        return {
            'metric': float(np.mean(result)),
            'execution_time': 0.05,
            'memory_used': 0.8
        }

validator = GPUCloudCrossValidator(
    gpu_simulator=MyGPUSimulator(),
    cloud_client=MyCloudClient()
)
```

### Batch Validation

```python
# Validate multiple parameter configurations
test_configs = [
    {'num_agents': 100, 'time_steps': 100},
    {'num_agents': 1000, 'time_steps': 100},
    {'num_agents': 100, 'time_steps': 1000},
    {'num_agents': 1000, 'time_steps': 1000},
]

results = []
for config in test_configs:
    result = await validator.validate_simulation(
        simulation_type='my_simulation',
        parameters=config,
        num_runs=20
    )
    results.append(result)

# Analyze results
passed = sum(1 for r in results if r.passed)
print(f"Passed: {passed}/{len(results)}")
```

### Continuous Integration

```python
# pre-commit hook or CI/CD pipeline
import sys

async def ci_validation():
    validator = GPUCloudCrossValidator()

    # Quick validation for CI (fewer runs)
    result = await validator.validate_simulation(
        simulation_type='critical_simulation',
        parameters={...},
        num_runs=10  # Fewer runs for speed
    )

    if not result.passed:
        validator.save_results()
        sys.exit(1)  # Fail the build

asyncio.run(ci_validation())
```

---

## Interpreting Results

### ValidationResult Structure

```python
@dataclass
class ValidationResult:
    simulation_type: str              # What was validated
    parameters: Dict[str, Any]        # Input parameters
    num_runs: int                     # Statistical power
    numerical_metrics: NumericalMetrics
    statistical_metrics: StatisticalMetrics
    performance_metrics: PerformanceMetrics
    robustness_metrics: RobustnessMetrics
    discrepancies: List[DiscrepancyReport]
    passed: bool                      # Final verdict
```

### Reading Numerical Metrics

| Metric | Good | Bad | Interpretation |
|--------|------|-----|----------------|
| Max Relative Error | < 0.01 | > 0.1 | Worst-case numerical difference |
| Correlation | > 0.99 | < 0.95 | Linear relationship strength |
| RMSE | Low | High | Average magnitude of errors |

### Reading Statistical Metrics

| Metric | Good | Bad | Interpretation |
|--------|------|-----|----------------|
| T-test p-value | > 0.05 | < 0.01 | Means are different |
| KS Test p-value | > 0.05 | < 0.01 | Distributions are different |
| Cohen's d | < 0.2 | > 0.8 | Effect size (0.2 = small) |

### Reading Performance Metrics

| Metric | Interpretation |
|--------|----------------|
| Speedup > 1 | GPU is faster |
| Speedup < 1 | Cloud is faster |
| Speedup ≈ 1 | Similar performance |

### Handling Discrepancies

Discrepancies are categorized by severity:

- **Critical:** Must fix before deployment
- **High:** Should fix before production
- **Medium:** Document and monitor
- **Low:** Acceptable within tolerance

Each discrepancy includes:
- Likely cause
- Resolution suggestion
- Affected metrics

---

## Troubleshooting

### Problem: "Numerical accuracy exceeds tolerance"

**Diagnosis:**
```
Max Relative Error: 0.1523
Expected: < 0.01
```

**Possible Causes:**
1. Different floating-point precision (float32 vs float64)
2. Different algorithm implementation
3. Numerical instability in one backend
4. Missing operations or incorrect order

**Solutions:**
```python
# Check precision
import numpy as np
print(np.finfo(np.float32).eps)  # Machine epsilon
print(np.finfo(np.float64).eps)

# Ensure consistent precision
gpu_result = cp.array(..., dtype=cp.float64)
cloud_result = np.array(..., dtype=np.float64)

# Add tolerance if acceptable
validator = GPUCloudCrossValidator(
    tolerance_config={'max_relative_error': 0.2}  # Relax to 20%
)
```

### Problem: "Statistical distributions differ"

**Diagnosis:**
```
T-test p-value: 0.0001
KS Test p-value: 0.003
Effect Size: 1.23
```

**Possible Causes:**
1. Different random number generators
2. Insufficient number of runs
3. Different algorithmic variance
4. Seeding issues

**Solutions:**
```python
# Increase runs for better statistics
result = await validator.validate_simulation(
    ...,
    num_runs=100  # More runs
)

# Ensure consistent seeding
def run_with_seed(seed):
    np.random.seed(seed)
    cp.random.seed(seed)
    # ... run simulation

# Check RNG properties
print(f"NumPy RNG: {np.random.seed(42); np.random.rand(5)}")
print(f"CuPy RNG: {cp.random.seed(42); cp.random.rand(5)}")
```

### Problem: "Performance ratio outside expected range"

**Diagnosis:**
```
Speedup Factor: 0.23x
Expected: 0.5x - 100x
```

**Possible Causes:**
1. Network latency dominates cloud time
2. GPU is underutilized
3. Different algorithm implementations
4. Measurement error

**Solutions:**
```python
# Profile the actual computation
import time

start = time.time()
gpu_result = gpu.run(...)
gpu_time = time.time() - start

start = time.time()
cloud_result = await cloud.run(...)
cloud_time = time.time() - start

# Check if measurement includes overhead
print(f"GPU: {gpu_time:.3f}s")
print(f"Cloud: {cloud_time:.3f}s")
print(f"Ratio: {gpu_time / cloud_time:.2f}x")

# Adjust tolerance if expected
validator = GPUCloudCrossValidator(
    tolerance_config={'min_speedup': 0.1}  # Allow lower bound
)
```

---

## Best Practices

### 1. Validate Early and Often

```python
# Add to your development workflow
def pre_commit_hook():
    """Run quick validation before committing."""
    asyncio.run(validator.validate_simulation(
        'my_simulation',
        parameters={...},
        num_runs=5  # Quick check
    ))

def nightly_build():
    """Run comprehensive validation nightly."""
    for config in ALL_TEST_CONFIGS:
        asyncio.run(validator.validate_simulation(
            'my_simulation',
            parameters=config,
            num_runs=50  # Thorough check
        ))
```

### 2. Use Appropriate Tolerances

```python
# Stochastic algorithms: looser tolerances
stochastic_tolerances = {
    'max_relative_error': 0.1,  # 10%
    'max_p_value': 0.05
}

# Deterministic algorithms: stricter tolerances
deterministic_tolerances = {
    'max_relative_error': 1e-6,
    'min_correlation': 0.999999
}
```

### 3. Document Validation Results

```python
# Always save and review results
result = await validator.validate_simulation(...)
validator.save_results(output_dir=f"validation/{experiment_name}")

# Review discrepancies manually
for discrepancy in result.discrepancies:
    if discrepancy.severity in ['critical', 'high']:
        print(f"⚠️  {discrepancy.description}")
        print(f"   Cause: {discrepancy.likely_cause}")
        print(f"   Fix: {discrepancy.resolution_suggestion}")
```

### 4. Version Control Your Validations

```bash
# Track validation results in git
git add validation_results/
git commit -m "Validation results for simulation v1.2.3"

# Tag validated versions
git tag -a v1.2.3-validated -m "All validations passed"
```

### 5. Automate Validation in CI/CD

```yaml
# .github/workflows/validation.yml
name: GPU-Cloud Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run validation
        run: |
          python -m cross_validation --ci-mode
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: validation-results
          path: validation_results/
```

---

## Appendix A: Statistical Methods

### T-Test (Independent Two-Sample)

Tests whether the means of two groups are statistically different.

**Null Hypothesis:** μ₁ = μ₂ (means are equal)
**Alternative Hypothesis:** μ₁ ≠ μ₂ (means are different)

**Interpretation:**
- p-value < 0.05 → Reject null (means are different)
- p-value > 0.05 → Cannot reject null (means may be equal)

### Kolmogorov-Smirnov Test

Tests whether two samples come from the same distribution.

**Null Hypothesis:** Both samples come from the same distribution
**Alternative Hypothesis:** Samples come from different distributions

**Interpretation:**
- p-value < 0.05 → Reject null (distributions differ)
- p-value > 0.05 → Cannot reject null (distributions may be same)

### Cohen's d (Effect Size)

Measures the standardized difference between two means.

**Interpretation:**
- |d| < 0.2 → Negligible effect
- 0.2 ≤ |d| < 0.5 → Small effect
- 0.5 ≤ |d| < 0.8 → Medium effect
- |d| ≥ 0.8 → Large effect

---

## Appendix B: Quick Reference

```python
# Create validator
validator = GPUCloudCrossValidator()

# Run validation
result = await validator.validate_simulation(
    simulation_type='name',
    parameters={...},
    num_runs=30
)

# Check results
if result.passed:
    print("✅ Passed")
else:
    print("❌ Failed")
    print(result.discrepancies)

# Save results
validator.save_results()

# Generate report
report = validator.generate_validation_report()
print(report)
```

---

## Support

For issues, questions, or contributions:
- GitHub: https://github.com/SuperInstance/SuperInstance-papers
- Documentation: See `STATISTICAL_METHODS.md` for detailed statistical explanations
- Examples: See `examples/` directory for complete working examples

---

**Version:** 1.0.0
**Last Updated:** 2026-03-13
**Maintained By:** SuperInstance Research Team

# Quick Start Guide

**Get up and running with GPU-Cloud Cross-Validation in 5 minutes**

---

## Installation

```bash
# Navigate to phase7 directory
cd research/phase7_gpu_simulations/

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "from cross_validation import GPUCloudCrossValidator; print('✅ Installation successful!')"
```

---

## Your First Validation

### Step 1: Create a Simple Test

Create `my_first_validation.py`:

```python
import asyncio
import numpy as np
from cross_validation import GPUCloudCrossValidator

# Simple mock GPU simulator
class MyGPUSimulator:
    def run(self, sim_type, params, run_id):
        np.random.seed(run_id)
        return {
            'metric': np.random.randn() * 0.1 + 1.0,
            'execution_time': 0.2,
            'memory_used': 1.5
        }

# Simple mock cloud simulator
class MyCloudSimulator:
    async def run(self, sim_type, params, run_id):
        await asyncio.sleep(0.001)
        np.random.seed(run_id + 1000)
        return {
            'metric': np.random.randn() * 0.1 + 1.0,
            'execution_time': 0.1,
            'memory_used': 0.8
        }

async def main():
    # Create validator
    validator = GPUCloudCrossValidator(
        gpu_simulator=MyGPUSimulator(),
        cloud_client=MyCloudSimulator()
    )

    # Run validation
    print("Running validation...")
    result = await validator.validate_simulation(
        simulation_type='my_simulation',
        parameters={'test': True},
        num_runs=30
    )

    # Check results
    print(f"\nStatus: {'✅ PASSED' if result.passed else '❌ FAILED'}")
    print(f"Max Relative Error: {result.numerical_metrics.max_relative_error:.4f}")
    print(f"Correlation: {result.numerical_metrics.correlation_coefficient:.4f}")
    print(f"Statistical Equivalence: {result.statistical_metrics.is_equivalent}")
    print(f"Speedup Factor: {result.performance_metrics.speedup_factor:.2f}x")

    # Save report
    report_file, json_file = validator.save_results()
    print(f"\nReport saved to: {report_file}")

if __name__ == "__main__":
    asyncio.run(main())
```

### Step 2: Run It

```bash
python my_first_validation.py
```

### Expected Output

```
Running validation...

Status: ✅ PASSED
Max Relative Error: 0.0089
Correlation: 0.9923
Statistical Equivalence: True
Speedup Factor: 1.66x

Report saved to: validation_results/validation_report_20260313_120000.md
```

---

## Understanding Your Results

### Numerical Metrics

| Metric | Good | Bad | What It Means |
|--------|------|-----|---------------|
| **Max Relative Error** | < 0.01 | > 0.1 | Worst-case % difference |
| **Correlation** | > 0.99 | < 0.95 | Linear relationship strength |

### Statistical Metrics

| Metric | Good | Bad | What It Means |
|--------|------|-----|---------------|
| **T-test p-value** | > 0.05 | < 0.01 | Means are different |
| **Cohen's d** | < 0.2 | > 0.8 | Effect size (0.2 = small) |

### Performance Metrics

| Metric | Interpretation |
|--------|----------------|
| **Speedup > 1** | GPU is faster |
| **Speedup < 1** | Cloud is faster |
| **Speedup ≈ 1** | Similar performance |

---

## Common Configurations

### Strict Validation (Deterministic)

```python
validator = GPUCloudCrossValidator(
    tolerance_config={
        'max_relative_error': 1e-6,  # Very strict
        'min_correlation': 0.999999
    }
)
```

### Relaxed Validation (Stochastic)

```python
validator = GPUCloudCrossValidator(
    tolerance_config={
        'max_relative_error': 0.1,  # 10% tolerance
        'max_p_value': 0.05
    }
)
```

### Quick Validation (Development)

```python
result = await validator.validate_simulation(
    'my_sim',
    parameters={...},
    num_runs=5  # Quick check
)
```

### Thorough Validation (Production)

```python
result = await validator.validate_simulation(
    'my_sim',
    parameters={...},
    num_runs=100  # High statistical power
)
```

---

## Troubleshooting

### Issue: "Numerical accuracy exceeds tolerance"

**Cause:** Floating-point precision differences

**Solution:** Relax tolerance or use float64

```python
# Option 1: Relax tolerance
validator = GPUCloudCrossValidator(
    tolerance_config={'max_relative_error': 0.1}
)

# Option 2: Use float64
gpu_result = cp.array(data, dtype=cp.float64)
```

### Issue: "Statistical distributions differ"

**Cause:** Insufficient sample size

**Solution:** Increase number of runs

```python
result = await validator.validate_simulation(
    'my_sim',
    parameters={...},
    num_runs=100  # More runs = better statistics
)
```

### Issue: "Performance ratio outside expected range"

**Cause:** Measurement includes overhead

**Solution:** Profile actual computation

```python
import time

start = time.time()
# ... your computation ...
elapsed = time.time() - start
```

---

## Next Steps

1. **Read the Full Guide:** See `VALIDATION_GUIDE.md` for comprehensive documentation

2. **Understand Statistics:** See `STATISTICAL_METHODS.md` for mathematical foundations

3. **Run Examples:** Check `examples/example_validations.py` for working code

4. **Run Tests:** Execute `pytest tests/test_cross_validation.py -v`

5. **Integrate with CI/CD:** Add pre-commit hooks and automated testing

---

## Cheat Sheet

```python
# Import
from cross_validation import GPUCloudCrossValidator

# Create
validator = GPUCloudCrossValidator()

# Validate
result = await validator.validate_simulation(
    'sim_type', {'param': value}, 30
)

# Check
if result.passed:
    print("✅ Passed")

# Save
validator.save_results()
```

---

## Need Help?

- **Documentation:** `VALIDATION_GUIDE.md`
- **Statistics:** `STATISTICAL_METHODS.md`
- **Examples:** `examples/example_validations.py`
- **Tests:** `tests/test_cross_validation.py`
- **Issues:** https://github.com/SuperInstance/SuperInstance-papers

---

**Version:** 1.0.0
**Last Updated:** 2026-03-13

# Performance Regression Tests

**Date:** 2026-03-13
**Suite:** Production Benchmark Suite v1.0.0
**Purpose:** Automated performance regression detection for SuperInstance systems

---

## Overview

Performance regression tests automatically detect degradations in system performance across commits, builds, and deployments. This document defines test criteria, thresholds, and remediation procedures.

---

## Test Categories

### 1. Latency Regression Tests

#### Test Definition

```yaml
name: latency_regression
category: performance
severity: high

thresholds:
  warning: 5% increase
  critical: 10% increase
  blocker: 20% increase

baseline: geometric_mean_of_last_10_runs
min_runs: 30
confidence_level: 0.95
```

#### Monitored Metrics

| Benchmark | Baseline (ms) | Warning (ms) | Critical (ms) |
|-----------|---------------|--------------|---------------|
| CRDT Coordination | 0.11 | 0.12 | 0.13 |
| ResNet-50 Inference | 5.0 | 5.25 | 5.5 |
| BERT-Base Inference | 10.0 | 10.5 | 11.0 |
| Multi-Agent (10 agents) | 0.25 | 0.26 | 0.28 |
| Emergence Detection | 5.2 | 5.5 | 5.7 |

#### Test Implementation

```python
def test_latency_regression(benchmark_name: str, current_metrics: BenchmarkMetrics):
    """Test for latency regression."""
    baseline = get_baseline(benchmark_name)
    current = current_metrics.latency_ms

    # Compute percentage change
    change_pct = ((current - baseline) / baseline) * 100

    # Check thresholds
    if change_pct > 20:
        raise RegressionError(
            f"CRITICAL: {benchmark_name} latency increased by {change_pct:.1f}% "
            f"(baseline: {baseline:.2f}ms, current: {current:.2f}ms)"
        )
    elif change_pct > 10:
        warnings.warn(
            f"WARNING: {benchmark_name} latency increased by {change_pct:.1f}% "
            f"(baseline: {baseline:.2f}ms, current: {current:.2f}ms)"
        )
    elif change_pct > 5:
        logger.info(
            f"INFO: {benchmark_name} latency increased by {change_pct:.1f}% "
            f"(baseline: {baseline:.2f}ms, current: {current:.2f}ms)"
        )
```

---

### 2. Throughput Regression Tests

#### Test Definition

```yaml
name: throughput_regression
category: performance
severity: high

thresholds:
  warning: 3% decrease
  critical: 7% decrease
  blocker: 15% decrease

baseline: geometric_mean_of_last_10_runs
direction: lower_is_better  # Throughput decrease is regression
```

#### Monitored Metrics

| Benchmark | Baseline (ops/s) | Warning (ops/s) | Critical (ops/s) |
|-----------|------------------|-----------------|------------------|
| ResNet-50 Inference | 200 | 194 | 186 |
| BERT-Base Inference | 100 | 97 | 93 |
| Multi-Agent Coordination | 4,000 | 3,880 | 3,720 |
| Batch Inference (32) | 762 | 739 | 708 |

#### Test Implementation

```python
def test_throughput_regression(benchmark_name: str, current_metrics: BenchmarkMetrics):
    """Test for throughput regression."""
    baseline = get_baseline(benchmark_name)
    current = current_metrics.throughput_ops_per_sec

    # Compute percentage change (negative is bad)
    change_pct = ((current - baseline) / baseline) * 100

    # Check thresholds
    if change_pct < -15:
        raise RegressionError(
            f"CRITICAL: {benchmark_name} throughput decreased by {abs(change_pct):.1f}% "
            f"(baseline: {baseline:.1f} ops/s, current: {current:.1f} ops/s)"
        )
    elif change_pct < -7:
        warnings.warn(
            f"WARNING: {benchmark_name} throughput decreased by {abs(change_pct):.1f}% "
            f"(baseline: {baseline:.1f} ops/s, current: {current:.1f} ops/s)"
        )
    elif change_pct < -3:
        logger.info(
            f"INFO: {benchmark_name} throughput decreased by {abs(change_pct):.1f}% "
            f"(baseline: {baseline:.1f} ops/s, current: {current:.1f} ops/s)"
        )
```

---

### 3. Memory Regression Tests

#### Test Definition

```yaml
name: memory_regression
category: resource
severity: medium

thresholds:
  warning: 10% increase
  critical: 25% increase
  blocker: 50% increase

allow_exemptions:
  - reason: "new_model_added"
    requires_approval: true
```

#### Monitored Metrics

| Benchmark | Baseline (MB) | Warning (MB) | Critical (MB) |
|-----------|---------------|--------------|---------------|
| ResNet-50 | 102 | 112 | 128 |
| BERT-Base | 440 | 484 | 550 |
| GPT-2 Small | 496 | 546 | 620 |
| Training (batch=32) | 11,000 | 12,100 | 13,750 |

#### Test Implementation

```python
def test_memory_regression(benchmark_name: str, current_metrics: BenchmarkMetrics):
    """Test for memory regression."""
    baseline = get_baseline(benchmark_name)
    current = current_metrics.memory_mb

    # Compute percentage change
    change_pct = ((current - baseline) / baseline) * 100

    # Check thresholds
    if change_pct > 50:
        raise RegressionError(
            f"CRITICAL: {benchmark_name} memory increased by {change_pct:.1f}% "
            f"(baseline: {baseline:.0f}MB, current: {current:.0f}MB)"
        )
    elif change_pct > 25:
        warnings.warn(
            f"WARNING: {benchmark_name} memory increased by {change_pct:.1f}% "
            f"(baseline: {baseline:.0f}MB, current: {current:.0f}MB)"
        )
    elif change_pct > 10:
        logger.info(
            f"INFO: {benchmark_name} memory increased by {change_pct:.1f}% "
            f"(baseline: {baseline:.0f}MB, current: {current:.0f}MB)"
        )
```

---

### 4. Energy Efficiency Tests

#### Test Definition

```yaml
name: energy_efficiency_regression
category: resource
severity: low

thresholds:
  warning: 10% increase in energy/operation
  critical: 20% increase in energy/operation

baseline: last_stable_release
```

#### Monitored Metrics

| Benchmark | Baseline (mJ/op) | Warning (mJ/op) | Critical (mJ/op) |
|-----------|------------------|-----------------|------------------|
| ResNet-50 Inference | 0.16 | 0.18 | 0.19 |
| BERT-Base Inference | 0.45 | 0.50 | 0.54 |
| CRDT Coordination | 0.05 | 0.06 | 0.06 |

---

### 5. Emergence Detection Accuracy Tests

#### Test Definition

```yaml
name: emergence_accuracy_regression
category: quality
severity: medium

thresholds:
  warning: 2% decrease in accuracy
  critical: 5% decrease in accuracy

min_accuracy: 0.75  # Absolute minimum
```

#### Monitored Metrics

| Method | Baseline | Warning | Critical |
|--------|----------|---------|----------|
| Transfer Entropy | 0.89 | 0.87 | 0.84 |
| Mutual Information | 0.82 | 0.80 | 0.78 |
| Novelty Score | 0.75 | 0.74 | 0.71 |

---

## Test Execution Framework

### Automated Test Runner

```python
class RegressionTestRunner:
    """Automated regression test runner."""

    def __init__(self, config: Dict):
        self.config = config
        self.suite = ProductionBenchmarkSuite()
        self.results = []

    def run_all_tests(self, branch: str, commit: str) -> TestReport:
        """Run all regression tests."""
        report = TestReport(
            branch=branch,
            commit=commit,
            timestamp=datetime.now()
        )

        # Run benchmarks
        for benchmark_name in self.suite.list_benchmarks():
            try:
                metrics = self.suite.run_benchmark(benchmark_name)

                # Run regression tests
                test_result = self._run_regression_tests(
                    benchmark_name,
                    metrics
                )
                report.add_result(benchmark_name, test_result)

            except Exception as e:
                report.add_error(benchmark_name, str(e))

        return report

    def _run_regression_tests(self,
                             benchmark_name: str,
                             metrics: BenchmarkMetrics) -> Dict:
        """Run all regression tests for a benchmark."""
        results = {
            "tests": {}
        }

        # Latency test
        try:
            test_latency_regression(benchmark_name, metrics)
            results["tests"]["latency"] = {"status": "pass"}
        except RegressionError as e:
            results["tests"]["latency"] = {"status": "fail", "message": str(e)}
        except Warning as w:
            results["tests"]["latency"] = {"status": "warning", "message": str(w)}

        # Throughput test
        try:
            test_throughput_regression(benchmark_name, metrics)
            results["tests"]["throughput"] = {"status": "pass"}
        except RegressionError as e:
            results["tests"]["throughput"] = {"status": "fail", "message": str(e)}
        except Warning as w:
            results["tests"]["throughput"] = {"status": "warning", "message": str(w)}

        # Memory test
        try:
            test_memory_regression(benchmark_name, metrics)
            results["tests"]["memory"] = {"status": "pass"}
        except RegressionError as e:
            results["tests"]["memory"] = {"status": "fail", "message": str(e)}
        except Warning as w:
            results["tests"]["memory"] = {"status": "warning", "message": str(w)}

        return results
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Performance Regression Tests

on:
  pull_request:
    branches: [main, papers-main]
  push:
    branches: [main, papers-main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  regression_tests:
    runs-on: [self-hosted, gpu]

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        pip install torch torchvision
        pip install cupy-cuda12x
        pip install scipy pandas

    - name: Run regression tests
      run: |
        python -m research.phase6_advanced_simulations.regression_tests \
          --branch ${{ github.ref_name }} \
          --commit ${{ github.sha }} \
          --output test_results.json

    - name: Upload results
      uses: actions/upload-artifact@v3
      with:
        name: regression_test_results
        path: test_results.json

    - name: Check for regressions
      run: |
        python scripts/check_regressions.py test_results.json

    - name: Comment on PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const results = JSON.parse(fs.readFileSync('test_results.json', 'utf8'));
          const body = generateRegressionComment(results);
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: body
          });
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run quick smoke tests
python -c "
from production_benchmark_suite import ProductionBenchmarkSuite

suite = ProductionBenchmarkSuite()
metrics = suite.run_benchmark('model_inference', model='resnet50', batch_size=1)

# Quick regression check
if metrics.latency_ms > 6.0:  # 20% above baseline
    print(f'ERROR: Latency regression detected: {metrics.latency_ms:.2f}ms')
    exit(1)
"
```

---

## Baseline Management

### Baseline Storage

```yaml
baselines:
  crdt_coordination:
    version: "1.0.0"
    commit: "abc123"
    timestamp: "2026-03-13T00:00:00Z"
    metrics:
      latency_ms: 0.11
      throughput_ops_per_sec: 9090
      memory_mb: 100
      confidence_interval_95: [0.10, 0.12]
      sample_size: 30

  resnet50_inference:
    version: "1.0.0"
    commit: "abc123"
    timestamp: "2026-03-13T00:00:00Z"
    metrics:
      latency_ms: 5.0
      throughput_ops_per_sec: 200
      memory_mb: 102
      confidence_interval_95: [4.9, 5.1]
      sample_size: 30
```

### Baseline Update Procedure

```python
def update_baseline(benchmark_name: str,
                   new_metrics: BenchmarkMetrics,
                   reason: str,
                   requires_approval: bool = False):
    """Update baseline with validation."""

    # Get current baseline
    current_baseline = get_baseline(benchmark_name)

    # Check if change is justified
    if requires_approval:
        approval = request_baseline_update_approval(
            benchmark_name,
            current_baseline,
            new_metrics,
            reason
        )
        if not approval:
            raise ValueError("Baseline update not approved")

    # Validate new baseline
    stats = run_with_statistics(benchmark_name, num_runs=30)

    # Update baseline
    new_baseline = {
        "version": get_next_version(),
        "commit": get_current_commit(),
        "timestamp": datetime.now().isoformat(),
        "metrics": stats,
        "update_reason": reason
    }

    save_baseline(benchmark_name, new_baseline)
    log_baseline_update(benchmark_name, current_baseline, new_baseline)
```

---

## Remediation Procedures

### Regression Detected

#### 1. Immediate Actions

```yaml
if regression_detected:
  - step: Block merge
    severity: critical

  - step: Notify team
    channels:
      - slack: "#performance"
      - email: "team@example.com"

  - step: Create issue
    type: "performance_regression"
    priority: "high"
```

#### 2. Investigation Protocol

```python
def investigate_regression(benchmark_name: str,
                         baseline_metrics: Dict,
                         current_metrics: Dict):
    """Investigate regression root cause."""

    # Check for environment changes
    environment_diff = check_environment_changes()

    # Check for dependency updates
    dependency_diff = check_dependency_updates()

    # Profile current code
    profile = profile_benchmark(benchmark_name)

    # Compare profiles
    profile_diff = compare_profiles(
        get_baseline_profile(benchmark_name),
        profile
    )

    # Generate report
    report = {
        "benchmark": benchmark_name,
        "environment_diff": environment_diff,
        "dependency_diff": dependency_diff,
        "profile_diff": profile_diff,
        "suspected_causes": identify_causes(profile_diff)
    }

    return report
```

#### 3. Common Causes & Fixes

| Symptom | Common Cause | Fix |
|---------|--------------|-----|
| Latency increase all benchmarks | GPU clock throttling | Check thermal management |
| Memory regression | Memory leak | Run profiler, check allocations |
| Specific model regression | Model code change | Review commit diff |
| Throughput regression | Batch size change | Check configuration |
| Intermittent failures | Resource contention | Isolate test environment |

---

## Reporting

### Regression Report Template

```markdown
# Performance Regression Report

**Branch:** feature/new-optimization
**Commit:** abc123
**Timestamp:** 2026-03-13 10:30:00 UTC

## Summary

- **Total Benchmarks:** 12
- **Passed:** 10
- **Warnings:** 1
- **Failed:** 1

## Regressions

### CRITICAL: bert_base_inference latency

- **Baseline:** 10.0 ms
- **Current:** 11.2 ms
- **Change:** +12.0%
- **Status:** FAILED

### WARNING: resnet50_inference memory

- **Baseline:** 102 MB
- **Current:** 108 MB
- **Change:** +5.9%
- **Status:** WARNING

## Recommendations

1. Investigate BERT-Base latency regression
2. Monitor ResNet-50 memory usage
3. Re-run tests after fixes
```

### Dashboard Metrics

```yaml
dashboard:
  - title: "Latency Trend"
    type: "line_chart"
    metrics: ["latency_ms"]
    benchmarks: ["resnet50_inference", "bert_base_inference"]

  - title: "Throughput Trend"
    type: "line_chart"
    metrics: ["throughput_ops_per_sec"]

  - title: "Memory Usage"
    type: "bar_chart"
    metrics: ["memory_mb"]

  - title: "Test Pass Rate"
    type: "single_value"
    metrics: ["pass_rate"]
```

---

## Best Practices

### 1. Test Frequency

- **On PR:** Quick smoke tests (1-2 benchmarks)
- **On Merge:** Full regression suite (all benchmarks)
- **Nightly:** Extended validation (30+ runs each)
- **Weekly:** Trend analysis and baseline review

### 2. Test Isolation

- Run tests on dedicated hardware
- Use fixed GPU clock speeds
- Disable background processes
- Use fixed random seeds

### 3. Baseline Hygiene

- Update baselines only with justification
- Document baseline changes thoroughly
- Keep historical baselines for trend analysis
- Review baselines monthly

### 4. False Positive Reduction

- Use statistical significance testing
- Implement outlier detection
- Account for measurement noise
- Use appropriate sample sizes

---

## Configuration

### Threshold Configuration

```yaml
# regression_config.yaml
thresholds:
  latency:
    warning: 5
    critical: 10
    blocker: 20

  throughput:
    warning: 3
    critical: 7
    blocker: 15

  memory:
    warning: 10
    critical: 25
    blocker: 50

  accuracy:
    warning: 2
    critical: 5
    blocker: 10

testing:
  min_runs: 30
  confidence_level: 0.95
  outlier_method: "iqr"
  outlier_threshold: 1.5

baseline:
  update_requires_approval: true
  history_length: 10
  stable_runs_required: 3
```

---

## Troubleshooting

### Common Issues

#### Issue: Flaky Tests

**Symptoms:** Tests pass/fail intermittently

**Solutions:**
1. Increase sample size (min_runs: 30)
2. Use more stable hardware
3. Check for thermal throttling
4. Verify GPU clock consistency

#### Issue: False Positives

**Symptoms:** Regression detected but code is correct

**Solutions:**
1. Review statistical significance
2. Check for environment changes
3. Verify baseline stability
4. Increase confidence interval

#### Issue: Baseline Drift

**Symptoms:** Gradual performance degradation over time

**Solutions:**
1. Monitor trends over time
2. Identify underlying cause
3. Update baselines with justification
4. Address root cause (e.g., dependency bloat)

---

## Appendix

### Statistical Methods

#### T-Test for Significance

```python
from scipy import stats

def is_significantly_different(baseline_samples, current_samples,
                              alpha=0.05):
    """Test if difference is statistically significant."""
    t_stat, p_value = stats.ttest_ind(baseline_samples, current_samples)
    return p_value < alpha
```

#### Effect Size (Cohen's d)

```python
def cohens_d(baseline_samples, current_samples):
    """Compute Cohen's d effect size."""
    n1, n2 = len(baseline_samples), len(current_samples)
    var1, var2 = np.var(baseline_samples, ddof=1), np.var(current_samples, ddof=1)

    # Pooled standard deviation
    pooled_std = np.sqrt(((n1-1)*var1 + (n2-1)*var2) / (n1+n2-2))

    # Cohen's d
    d = (np.mean(current_samples) - np.mean(baseline_samples)) / pooled_std

    return d
```

**Interpretation:**
- |d| < 0.2: Small effect
- 0.2 <= |d| < 0.5: Medium effect
- 0.5 <= |d| < 0.8: Large effect
- |d| >= 0.8: Very large effect

---

**Document Version:** 1.0.0
**Last Updated:** 2026-03-13
**Maintainer:** SuperInstance Research Team

---

*"Catch regressions early, fix them fast"*

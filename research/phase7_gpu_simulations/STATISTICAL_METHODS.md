# Statistical Methods for GPU-Cloud Validation

**Mathematical foundations of cross-validation statistical tests**

**Version:** 1.0.0
**Last Updated:** 2026-03-13

---

## Table of Contents

1. [Overview](#overview)
2. [Numerical Accuracy Metrics](#numerical-accuracy-metrics)
3. [Hypothesis Testing](#hypothesis-testing)
4. [Effect Size](#effect-size)
5. [Distribution Comparison](#distribution-comparison)
6. [Performance Metrics](#performance-metrics)
7. [Robustness Metrics](#robustness-metrics)
8. [Practical Guidelines](#practical-guidelines)

---

## Overview

This document provides the mathematical and statistical foundations used in the GPU-Cloud Cross-Validation Framework. Understanding these methods is essential for:

- Interpreting validation results correctly
- Setting appropriate tolerance thresholds
- Diagnosing validation failures
- Designing effective validation experiments

---

## Numerical Accuracy Metrics

### Absolute Difference

**Definition:** The raw numeric difference between two values.

$$\text{Absolute Difference} = |x_{\text{GPU}} - x_{\text{Cloud}}|$$

**Use Case:** Comparing values of similar magnitude

**Limitations:** Scale-dependent - not suitable for comparing values across different scales

### Relative Error

**Definition:** The absolute difference normalized by the magnitude of the reference value.

$$\text{Relative Error} = \frac{|x_{\text{GPU}} - x_{\text{Cloud}}|}{|x_{\text{GPU}}| + \epsilon}$$

Where $\epsilon$ is a small constant (e.g., 10⁻¹⁰) to avoid division by zero.

**Use Case:** Comparing values across different scales

**Interpretation:**
- < 0.01 (1%): Excellent agreement
- 0.01 - 0.05 (1-5%): Good agreement
- 0.05 - 0.1 (5-10%): Acceptable for many applications
- > 0.1 (10%): Poor agreement - investigate

### Root Mean Square Error (RMSE)

**Definition:** The square root of the average squared differences.

$$\text{RMSE} = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(x_{\text{GPU},i} - x_{\text{Cloud},i})^2}$$

**Use Case:** Measuring overall magnitude of errors

**Properties:**
- Sensitive to outliers (squared term)
- Same units as the original data
- Penalizes large errors more heavily

### Correlation Coefficient (Pearson's r)

**Definition:** Measures linear relationship strength between two variables.

$$r = \frac{\sum_{i=1}^{n}(x_{\text{GPU},i} - \bar{x}_{\text{GPU}})(x_{\text{Cloud},i} - \bar{x}_{\text{Cloud}})}{\sqrt{\sum_{i=1}^{n}(x_{\text{GPU},i} - \bar{x}_{\text{GPU}})^2}\sqrt{\sum_{i=1}^{n}(x_{\text{Cloud},i} - \bar{x}_{\text{Cloud}})^2}$$

**Range:** -1 ≤ r ≤ 1

**Interpretation:**
- |r| > 0.99: Nearly perfect linear relationship
- 0.95 < |r| < 0.99: Very strong linear relationship
- 0.8 < |r| < 0.95: Strong linear relationship
- |r| < 0.8: Moderate or weak relationship

**Important:** Correlation does not imply agreement! Two sets can be perfectly correlated but systematically different.

---

## Hypothesis Testing

### Two-Sample T-Test

**Purpose:** Test whether the means of two independent groups are statistically different.

**Hypotheses:**
- H₀ (Null): μ₁ = μ₂ (means are equal)
- H₁ (Alternative): μ₁ ≠ μ₂ (means are different)

**Test Statistic:**

$$t = \frac{\bar{x}_1 - \bar{x}_2}{\sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}}$$

Where:
- $\bar{x}_1, \bar{x}_2$ are sample means
- $s_1^2, s_2^2$ are sample variances
- $n_1, n_2$ are sample sizes

**Degrees of Freedom (Welch's correction):**

$$df = \frac{\left(\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}\right)^2}{\frac{(s_1^2/n_1)^2}{n_1-1} + \frac{(s_2^2/n_2)^2}{n_2-1}}$$

**P-Value Interpretation:**
- p < 0.01: Very strong evidence against H₀
- 0.01 ≤ p < 0.05: Strong evidence against H₀
- 0.05 ≤ p < 0.1: Moderate evidence against H₀
- p ≥ 0.1: Insufficient evidence to reject H₀

**Important:** We WANT to fail to reject H₀ (p ≥ 0.05) in cross-validation!

### Assumptions of T-Test

1. **Independence:** Samples are independent
2. **Normality:** Data is approximately normally distributed
3. **Homogeneity of Variance:** (Optional) Equal variances (Welch's t-test relaxes this)

**Checking Normality:**

```python
from scipy import stats

# Shapiro-Wilk test for normality
stat, p = stats.shapiro(gpu_values)
if p < 0.05:
    print("Data is NOT normal - consider non-parametric tests")
```

**Alternative (Non-Parametric): Mann-Whitney U Test**

```python
from scipy import stats

stat, p = stats.mannwhitneyu(gpu_values, cloud_values)
```

---

## Effect Size

### Cohen's d

**Purpose:** Measures the magnitude of difference between two groups (standardized).

$$d = \frac{\bar{x}_1 - \bar{x}_2}{s_{\text{pooled}}}$$

Where pooled standard deviation is:

$$s_{\text{pooled}} = \sqrt{\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1 + n_2 - 2}}$$

**Interpretation:**

| |d| | Effect Size | Interpretation |
|---|---|---|
| < 0.2 | Negligible | Practically insignificant |
| 0.2 - 0.5 | Small | Minor difference |
| 0.5 - 0.8 | Medium | Moderate difference |
| > 0.8 | Large | Substantial difference |

**Why Both P-Value and Effect Size?**

P-values are influenced by sample size. With large n, tiny differences become "significant." Effect size provides practical significance:

```
Example:
- n = 1000, p = 0.001, d = 0.05 → Statistically significant, but negligible effect
- n = 20, p = 0.08, d = 0.9 → Not significant, but large effect
```

---

## Distribution Comparison

### Kolmogorov-Smirnov (KS) Test

**Purpose:** Test whether two samples come from the same distribution.

**Hypotheses:**
- H₀: Both samples come from the same distribution
- H₁: Samples come from different distributions

**Test Statistic:**

$$D = \sup_x |F_{\text{GPU}}(x) - F_{\text{Cloud}}(x)|$$

Where $F(x)$ is the empirical cumulative distribution function (ECDF).

**Interpretation:**
- p < 0.05: Distributions are different
- p ≥ 0.05: Cannot conclude distributions differ

**Advantages:**
- Non-parametric (no distribution assumptions)
- Sensitive to differences in shape, location, and spread
- Works on any continuous distribution

**Limitations:**
- Less sensitive to differences in tails
- Sensitive to sample size

### Anderson-Darling Test (Alternative)

More sensitive to tail differences than KS test:

```python
from scipy import stats

# Compare to reference distribution
result = stats.anderson_ksamp([gpu_values, cloud_values])
```

---

## Performance Metrics

### Speedup Factor

**Definition:** Ratio of execution times.

$$\text{Speedup} = \frac{T_{\text{GPU}}}{T_{\text{Cloud}}}$$

**Interpretation:**
- Speedup > 1: GPU is faster
- Speedup < 1: Cloud is faster
- Speedup ≈ 1: Similar performance

### Amdahl's Law (Theoretical Speedup)

**Maximum speedup possible when parallelizing a portion of code:**

$$S(n) = \frac{1}{(1-p) + \frac{p}{n}}$$

Where:
- p = parallelizable fraction
- n = number of processors

**Implication:** Speedup is bounded by non-parallelizable portion.

### Scalability Analysis

**Strong Scaling:** Fixed problem size, increasing processors

$$\text{Efficiency} = \frac{T_1}{n \cdot T_n}$$

Where:
- T₁ = time with 1 processor
- Tₙ = time with n processors

**Weak Scaling:** Problem size grows with processors

$$\text{Scaling Efficiency} = \frac{T_1}{T_n}$$

**Cost Efficiency:**

$$\text{Cost Efficiency} = \frac{\text{Speedup}}{\text{Cost Ratio}}$$

---

## Robustness Metrics

### Coefficient of Variation (CV)

**Definition:** Relative variability measure.

$$\text{CV} = \frac{\sigma}{|\mu| + \epsilon}$$

**Noise Tolerance Score:**

$$\text{Noise Tolerance} = 1 - |\text{CV}_{\text{GPU}} - \text{CV}_{\text{Cloud}}|$$

### Outlier Detection

**Z-Score Method:**

$$z = \frac{x - \mu}{\sigma}$$

Outlier if |z| > 2 (or 3 for stricter threshold)

**IQR Method:**

$$\text{Outlier if } x < Q_1 - 1.5 \times \text{IQR} \text{ or } x > Q_3 + 1.5 \times \text{IQR}$$

### Edge Case Agreement

**Compare tail behavior:**

$$\text{Edge Agreement} = 1 - \frac{|P_{\text{GPU}}(0.9) - P_{\text{Cloud}}(0.9)|}{|P_{\text{GPU}}(0.9)|}$$

Where $P(0.9)$ is the 90th percentile.

---

## Practical Guidelines

### Sample Size Determination

**For t-tests, use power analysis:**

```python
from scipy import stats

def sample_size(effect_size, alpha=0.05, power=0.8):
    """Estimate required sample size."""
    # Simplified - use statsmodels.power.TTestIndPower() for accurate
    n_approx = 16 / (effect_size ** 2)  # Rule of thumb
    return int(n_approx)
```

**Minimum recommendations:**
- n ≥ 30: Central Limit Theorem applies
- n ≥ 50: Good statistical power for medium effects
- n ≥ 100: High statistical power for small effects

### Multiple Testing Correction

**When running many validation tests:**

**Bonferroni Correction:**

$$\alpha_{\text{corrected}} = \frac{\alpha}{k}$$

Where k = number of tests.

**Benjamini-Hochberg (FDR):** Controls false discovery rate:

```python
from statsmodels.stats.multitest import multipletests

p_values = [0.01, 0.04, 0.03, 0.20, 0.01]
rejected, p_corrected, _, _ = multipletests(
    p_values,
    alpha=0.05,
    method='fdr_bh'
)
```

### Choosing the Right Test

| Scenario | Recommended Test |
|----------|-----------------|
| Comparing means, normal data | Two-sample t-test |
| Comparing means, non-normal | Mann-Whitney U |
| Comparing distributions | Kolmogorov-Smirnov |
| Comparing variances | Levene's test |
| Paired measurements | Paired t-test |
| More than 2 groups | ANOVA / Kruskal-Wallis |

### Interpreting Confidence Intervals

**95% Confidence Interval for Mean Difference:**

$$\text{CI} = (\bar{x}_1 - \bar{x}_2) \pm t_{0.975, df} \times SE$$

Where Standard Error:

$$SE = \sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}$$

**Interpretation:**
- If CI includes 0 → Cannot reject H₀ (no significant difference)
- If CI excludes 0 → Significant difference
- Width of CI indicates precision (narrow = precise)

---

## Common Pitfalls

### 1. P-Hacking

**Definition:** Repeatedly analyzing data until significant results found.

**Solution:** Pre-register validation criteria and sample sizes.

### 2. Equating Correlation with Agreement

**Example:**
```python
gpu = np.array([1.0, 2.0, 3.0, 4.0])
cloud = np.array([2.0, 4.0, 6.0, 8.0])

r = np.corrcoef(gpu, cloud)[0, 1]  # = 1.0 (perfect correlation)
# But values are 2x different!
```

**Solution:** Always check both correlation AND absolute/relative error.

### 3. Ignoring Effect Size

**Example:**
```
p = 0.001, d = 0.05
→ "Significant" but negligible practical difference
```

**Solution:** Report and interpret both p-values and effect sizes.

### 4. Small Sample Sizes

**Problem:** Low statistical power, high false negative rate.

**Solution:** Use power analysis to determine adequate sample size.

### 5. Violating Test Assumptions

**Problem:** Using parametric tests on non-normal data.

**Solution:** Check normality (Shapiro-Wilk) and use non-parametric alternatives if needed.

---

## Code Examples

### Complete Statistical Comparison

```python
import numpy as np
from scipy import stats

def compare_gpu_cloud(gpu_values, cloud_values):
    """Comprehensive statistical comparison."""

    results = {}

    # Numerical metrics
    results['max_abs_diff'] = np.max(np.abs(gpu_values - cloud_values))
    results['max_rel_error'] = np.max(
        np.abs(gpu_values - cloud_values) / (np.abs(gpu_values) + 1e-10)
    )
    results['correlation'] = np.corrcoef(gpu_values, cloud_values)[0, 1]

    # T-test
    t_stat, t_p = stats.ttest_ind(gpu_values, cloud_values)
    results['t_statistic'] = t_stat
    results['t_p_value'] = t_p

    # KS test
    ks_stat, ks_p = stats.ks_2samp(gpu_values, cloud_values)
    results['ks_statistic'] = ks_stat
    results['ks_p_value'] = ks_p

    # Effect size
    pooled_std = np.sqrt((np.std(gpu_values)**2 + np.std(cloud_values)**2) / 2)
    cohens_d = (np.mean(gpu_values) - np.mean(cloud_values)) / pooled_std
    results['cohens_d'] = cohens_d

    # Confidence interval
    diff = np.mean(gpu_values) - np.mean(cloud_values)
    se = np.sqrt(
        np.var(gpu_values) / len(gpu_values) +
        np.var(cloud_values) / len(cloud_values)
    )
    ci = (diff - 1.96 * se, diff + 1.96 * se)
    results['ci_95'] = ci

    return results

# Example usage
gpu_data = np.random.normal(1.0, 0.1, 100)
cloud_data = np.random.normal(1.01, 0.11, 100)

results = compare_gpu_cloud(gpu_data, cloud_data)
print(f"Correlation: {results['correlation']:.4f}")
print(f"T-test p-value: {results['t_p_value']:.4f}")
print(f"Effect size: {results['cohens_d']:.4f}")
```

### Power Analysis

```python
from scipy import stats

def required_sample_size(effect_size, alpha=0.05, power=0.8):
    """
    Estimate sample size for t-test.

    Args:
        effect_size: Cohen's d
        alpha: Significance level
        power: Desired power (1 - beta)

    Returns:
        Required sample size per group
    """
    # Approximation
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)

    n = 2 * ((z_alpha + z_beta) / effect_size) ** 2
    return int(np.ceil(n))

# Example
effect_size = 0.5  # Medium effect
n = required_sample_size(effect_size)
print(f"Required n per group: {n}")
```

---

## References

1. Cohen, J. (1988). *Statistical Power Analysis for the Behavioral Sciences* (2nd ed.). Routledge.

2. Student. (1908). "The probable error of a mean". *Biometrika*, 6(1), 1-25.

3. Kolmogorov, A. N. (1933). "Sulla determinazione empirica di una legge di distribuzione". *Giornale dell'Istituto Italiano degli Attuari*, 4, 83-91.

4. Anderson, T. W., & Darling, D. A. (1952). "Asymptotic theory of certain goodness-of-fit criteria based on stochastic processes". *Annals of Mathematical Statistics*, 23(2), 193-212.

5. Benjamini, Y., & Hochberg, Y. (1995). "Controlling the false discovery rate: a practical and powerful approach to multiple testing". *Journal of the Royal Statistical Society, Series B*, 57(1), 289-300.

---

**Version:** 1.0.0
**Author:** SuperInstance Research Team
**Last Updated:** 2026-03-13

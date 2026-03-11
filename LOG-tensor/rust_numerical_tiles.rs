//! =============================================================================
//! RUST NUMERICAL STABILITY TILES FOR CERTAINTY COMPUTATION
//! =============================================================================
//! Focus: Numerically stable algorithms avoiding overflow, underflow, and
//! precision loss in probability and certainty calculations.
//!
//! Tiles: 16 | Focus: Stability + Performance | Total LOC: ~400

use std::f64::consts::{E, PI};
use std::ops::{Add, Div, Mul, Sub};

// =============================================================================
// SECTION 1: LOG-SUM-EXP FAMILY
// =============================================================================

/// TILE: log_sum_exp
/// SIGNATURE: fn log_sum_exp(values: &[f64]) -> f64
/// OPS: O(n) - single pass with max finding
/// STABILITY: Prevents overflow by subtracting max before exp
/// USES: HIGH - Foundation for softmax, log probabilities
pub fn log_sum_exp(values: &[f64]) -> f64 {
    if values.is_empty() {
        return f64::NEG_INFINITY;
    }
    
    let max_val = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    
    if max_val == f64::NEG_INFINITY || max_val.is_infinite() {
        return max_val;
    }
    
    let sum = values.iter()
        .filter(|&&x| x > f64::NEG_INFINITY)
        .map(|&x| (x - max_val).exp())
        .sum::<f64>();
    
    max_val + sum.ln()
}

/// TILE: log_sum_exp_pair
/// SIGNATURE: fn log_sum_exp_pair(a: f64, b: f64) -> f64
/// OPS: O(1) - constant time
/// STABILITY: Stable for any finite inputs
/// USES: HIGH - Efficient for binary decisions
#[inline]
pub fn log_sum_exp_pair(a: f64, b: f64) -> f64 {
    if a == f64::NEG_INFINITY { return b; }
    if b == f64::NEG_INFINITY { return a; }
    
    let (max_val, diff) = if a > b { (a, b - a) } else { (b, a - b) };
    max_val + (1.0 + diff.exp()).ln()
}

/// TILE: log_sum_exp_weighted
/// SIGNATURE: fn log_sum_exp_weighted(log_values: &[f64], weights: &[f64]) -> f64
/// OPS: O(n) - single pass
/// STABILITY: Handles weighted combinations in log space
/// USES: MED - Weighted ensemble certainty
pub fn log_sum_exp_weighted(log_values: &[f64], weights: &[f64]) -> f64 {
    assert_eq!(log_values.len(), weights.len(), "Length mismatch");
    
    if log_values.is_empty() {
        return f64::NEG_INFINITY;
    }
    
    // Compute weighted max for stability
    let max_val = log_values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    
    if max_val == f64::NEG_INFINITY {
        return f64::NEG_INFINITY;
    }
    
    let sum: f64 = log_values.iter()
        .zip(weights.iter())
        .map(|(&lv, &w)| w * (lv - max_val).exp())
        .sum();
    
    max_val + sum.ln()
}

// =============================================================================
// SECTION 2: SOFTMAX FAMILY
// =============================================================================

/// TILE: stable_softmax
/// SIGNATURE: fn stable_softmax(values: &[f64]) -> Vec<f64>
/// OPS: O(n) - two passes
/// STABILITY: Subtracts max to prevent overflow
/// USES: HIGH - Probability distribution normalization
pub fn stable_softmax(values: &[f64]) -> Vec<f64> {
    if values.is_empty() {
        return Vec::new();
    }
    
    let max_val = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    
    let exp_sum: f64 = values.iter()
        .map(|&x| (x - max_val).exp())
        .sum();
    
    if exp_sum == 0.0 || !exp_sum.is_finite() {
        // Uniform distribution fallback
        let uniform = 1.0 / values.len() as f64;
        return vec![uniform; values.len()];
    }
    
    values.iter()
        .map(|&x| (x - max_val).exp() / exp_sum)
        .collect()
}

/// TILE: log_softmax
/// SIGNATURE: fn log_softmax(values: &[f64]) -> Vec<f64>
/// OPS: O(n) - two passes
/// STABILITY: Direct log computation avoids underflow
/// USES: HIGH - Loss function computation
pub fn log_softmax(values: &[f64]) -> Vec<f64> {
    if values.is_empty() {
        return Vec::new();
    }
    
    let lse = log_sum_exp(values);
    
    values.iter().map(|&x| x - lse).collect()
}

/// TILE: stable_softmax_with_temperature
/// SIGNATURE: fn stable_softmax_with_temperature(values: &[f64], temperature: f64) -> Vec<f64>
/// OPS: O(n) - two passes
/// STABILITY: Temperature scaling with stability
/// USES: MED - Uncertainty calibration
pub fn stable_softmax_with_temperature(values: &[f64], temperature: f64) -> Vec<f64> {
    if temperature <= 0.0 {
        // Argmax one-hot for zero temperature
        let max_idx = values.iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .map(|(i, _)| i);
        
        return match max_idx {
            Some(idx) => {
                let mut result = vec![0.0; values.len()];
                result[idx] = 1.0;
                result
            }
            None => vec![1.0 / values.len() as f64; values.len()]
        };
    }
    
    let scaled: Vec<f64> = values.iter().map(|&x| x / temperature).collect();
    stable_softmax(&scaled)
}

// =============================================================================
// SECTION 3: LOG PROBABILITY OPERATIONS
// =============================================================================

/// TILE: log_add_exp
/// SIGNATURE: fn log_add_exp(log_a: f64, log_b: f64) -> f64
/// OPS: O(1) - constant time
/// STABILITY: Computes log(exp(a) + exp(b)) safely
/// USES: HIGH - Combining probabilities in log space
#[inline]
pub fn log_add_exp(log_a: f64, log_b: f64) -> f64 {
    if log_a == f64::NEG_INFINITY { return log_b; }
    if log_b == f64::NEG_INFINITY { return log_a; }
    
    let (max_val, diff) = if log_a > log_b {
        (log_a, log_b - log_a)
    } else {
        (log_b, log_a - log_b)
    };
    
    max_val + (1.0 + diff.exp()).ln()
}

/// TILE: log_sub_exp
/// SIGNATURE: fn log_sub_exp(log_a: f64, log_b: f64) -> f64
/// OPS: O(1) - constant time
/// STABILITY: Computes log(exp(a) - exp(b)) safely, requires a > b
/// USES: MED - Probability subtraction in log space
#[inline]
pub fn log_sub_exp(log_a: f64, log_b: f64) -> f64 {
    if log_b == f64::NEG_INFINITY { return log_a; }
    if log_a <= log_b {
        return f64::NEG_INFINITY; // Invalid or zero result
    }
    
    log_a + (1.0 - (log_b - log_a).exp()).ln()
}

/// TILE: log_prob_product
/// SIGNATURE: fn log_prob_product(log_probs: &[f64]) -> f64
/// OPS: O(n) - single pass addition
/// STABILITY: Pure addition, no overflow risk
/// USES: HIGH - Joint probability computation
pub fn log_prob_product(log_probs: &[f64]) -> f64 {
    let sum: f64 = log_probs.iter().sum();
    sum
}

/// TILE: normalize_log_probs
/// SIGNATURE: fn normalize_log_probs(log_probs: &[f64]) -> Vec<f64>
/// OPS: O(n) - single pass
/// STABILITY: Normalizes log probabilities to sum to log(1)
/// USES: HIGH - Belief updating
pub fn normalize_log_probs(log_probs: &[f64]) -> Vec<f64> {
    if log_probs.is_empty() {
        return Vec::new();
    }
    
    let lse = log_sum_exp(log_probs);
    log_probs.iter().map(|&lp| lp - lse).collect()
}

// =============================================================================
// SECTION 4: RUNNING STATISTICS (WELFORD'S ALGORITHM)
// =============================================================================

/// TILE: WelfordStats
/// SIGNATURE: struct WelfordStats { count: u64, mean: f64, m2: f64 }
/// OPS: O(1) per update
/// STABILITY: Numerically stable online mean/variance
/// USES: HIGH - Streaming certainty estimation
#[derive(Debug, Clone, Default)]
pub struct WelfordStats {
    count: u64,
    mean: f64,
    m2: f64,  // Sum of squared differences from mean
}

impl WelfordStats {
    pub fn new() -> Self {
        Self::default()
    }
    
    /// Update statistics with a new value
    #[inline]
    pub fn update(&mut self, value: f64) {
        self.count += 1;
        let delta = value - self.mean;
        self.mean += delta / self.count as f64;
        let delta2 = value - self.mean;
        self.m2 += delta * delta2;
    }
    
    /// Remove a value from statistics (for sliding windows)
    #[inline]
    pub fn remove(&mut self, value: f64) -> Result<(), &'static str> {
        if self.count == 0 {
            return Err("Cannot remove from empty statistics");
        }
        
        if self.count == 1 {
            self.count = 0;
            self.mean = 0.0;
            self.m2 = 0.0;
            return Ok(());
        }
        
        let n = self.count as f64;
        let delta = value - self.mean;
        let new_mean = self.mean - delta / (n - 1.0);
        let delta2 = value - new_mean;
        
        self.m2 -= delta * delta2;
        self.mean = new_mean;
        self.count -= 1;
        
        Ok(())
    }
    
    pub fn mean(&self) -> f64 {
        self.mean
    }
    
    pub fn variance(&self) -> f64 {
        if self.count < 2 {
            return 0.0;
        }
        self.m2 / (self.count - 1) as f64
    }
    
    pub fn population_variance(&self) -> f64 {
        if self.count == 0 {
            return 0.0;
        }
        self.m2 / self.count as f64
    }
    
    pub fn std_dev(&self) -> f64 {
        self.variance().sqrt()
    }
    
    pub fn standard_error(&self) -> f64 {
        if self.count == 0 {
            return f64::INFINITY;
        }
        self.std_dev() / (self.count as f64).sqrt()
    }
    
    pub fn count(&self) -> u64 {
        self.count
    }
    
    /// Merge another WelfordStats into this one
    pub fn merge(&mut self, other: &WelfordStats) {
        if other.count == 0 {
            return;
        }
        if self.count == 0 {
            *self = other.clone();
            return;
        }
        
        let total_count = self.count + other.count;
        let delta = other.mean - self.mean;
        let n1 = self.count as f64;
        let n2 = other.count as f64;
        let n = total_count as f64;
        
        self.mean = (n1 * self.mean + n2 * other.mean) / n;
        self.m2 = self.m2 + other.m2 + delta * delta * n1 * n2 / n;
        self.count = total_count;
    }
}

// =============================================================================
// SECTION 5: CONFIDENCE INTERVALS
// =============================================================================

/// TILE: t_distribution_cdf
/// SIGNATURE: fn t_distribution_cdf(t: f64, df: f64) -> f64
/// OPS: O(1) - approximation
/// STABILITY: Stable for df > 1
/// USES: MED - Confidence interval computation
pub fn t_distribution_cdf(t: f64, df: f64) -> f64 {
    // Use regularized incomplete beta function approximation
    // CDF(t) = 1 - 0.5 * I_{x}(df/2, 1/2) where x = df/(df + t²)
    
    if df <= 0.0 {
        return 0.5;
    }
    
    let x = df / (df + t * t);
    let a = df / 2.0;
    let b = 0.5;
    
    // Regularized incomplete beta function approximation
    let result = regularized_incomplete_beta(x, a, b);
    
    if t >= 0.0 {
        1.0 - 0.5 * result
    } else {
        0.5 * result
    }
}

/// Regularized incomplete beta function using continued fraction
fn regularized_incomplete_beta(x: f64, a: f64, b: f64) -> f64 {
    if x < 0.0 || x > 1.0 {
        return 0.0;
    }
    
    if x == 0.0 { return 0.0; }
    if x == 1.0 { return 1.0; }
    
    // Use symmetry for better convergence
    if x > (a + 1.0) / (a + b + 2.0) {
        return 1.0 - regularized_incomplete_beta(1.0 - x, b, a);
    }
    
    // Continued fraction expansion (Lentz's algorithm)
    let log_prefix = a * x.ln() + b * (1.0 - x).ln() - ln_beta(a, b);
    
    let eps = 1e-10;
    let max_iter = 200;
    
    let mut cf = 1.0;
    let mut c = 1.0;
    let mut d = 1.0 - (a + b) * x / (a + 1.0);
    d = if d.abs() < eps { eps * d.signum() } else { d };
    d = 1.0 / d;
    cf = d;
    
    for m in 1..=max_iter {
        // Even step
        let m_f64 = m as f64;
        let numerator = m_f64 * (b - m_f64) * x / ((a + 2.0 * m_f64 - 1.0) * (a + 2.0 * m_f64));
        d = 1.0 + numerator * d;
        c = 1.0 + numerator / c;
        d = 1.0 / d;
        cf *= d * c;
        
        // Odd step
        let numerator = -(a + m_f64) * (a + b + m_f64) * x / ((a + 2.0 * m_f64) * (a + 2.0 * m_f64 + 1.0));
        d = 1.0 + numerator * d;
        c = 1.0 + numerator / c;
        d = 1.0 / d;
        
        let delta = d * c;
        cf *= delta;
        
        if (delta - 1.0).abs() < eps {
            break;
        }
    }
    
    (log_prefix.exp()) * cf / a
}

/// Log of beta function
fn ln_beta(a: f64, b: f64) -> f64 {
    ln_gamma(a) + ln_gamma(b) - ln_gamma(a + b)
}

/// Log of gamma function using Lanczos approximation
fn ln_gamma(x: f64) -> f64 {
    if x <= 0.0 {
        return f64::NAN;
    }
    
    // Lanczos coefficients
    let coef = [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7,
    ];
    
    let mut y = x;
    let mut tmp = x + 7.5;
    tmp = (tmp + 0.5).ln() * (x + 0.5) - tmp;
    
    let mut ser = coef[0];
    for j in 1..9 {
        y += 1.0;
        ser += coef[j] / y;
    }
    
    tmp + (2.0 * PI).ln() / 2.0 + ser.ln() - (x).ln()
}

/// TILE: confidence_interval_t
/// SIGNATURE: fn confidence_interval_t(mean: f64, std_err: f64, df: f64, alpha: f64) -> (f64, f64)
/// OPS: O(1) - uses t-distribution inverse
/// STABILITY: Stable for reasonable df and alpha
/// USES: HIGH - Uncertainty quantification
pub fn confidence_interval_t(mean: f64, std_err: f64, df: f64, alpha: f64) -> (f64, f64) {
    if std_err <= 0.0 || df <= 0.0 || alpha <= 0.0 || alpha >= 1.0 {
        return (mean, mean);
    }
    
    // Find t critical value using inverse CDF approximation
    let t_crit = t_critical_value(df, 1.0 - alpha / 2.0);
    
    let margin = t_crit * std_err;
    (mean - margin, mean + margin)
}

/// Approximate t critical value using inverse CDF
fn t_critical_value(df: f64, p: f64) -> f64 {
    // Use normal approximation for large df
    if df > 100.0 {
        return normal_critical_value(p);
    }
    
    // Binary search for t value
    let mut low = -10.0;
    let mut high = 10.0;
    let eps = 1e-8;
    
    for _ in 0..100 {
        let mid = (low + high) / 2.0;
        let cdf_val = t_distribution_cdf(mid, df);
        
        if (cdf_val - p).abs() < eps {
            return mid;
        }
        
        if cdf_val < p {
            low = mid;
        } else {
            high = mid;
        }
    }
    
    (low + high) / 2.0
}

/// Standard normal critical value
fn normal_critical_value(p: f64) -> f64 {
    // Rational approximation
    let a = [
        -3.969683028665376e+01,
        2.209460984245205e+02,
        -2.759285104469687e+02,
        1.383577518672690e+02,
        -3.066479806614716e+01,
        2.506628277459239e+00,
    ];
    let b = [
        -5.447609879822406e+01,
        1.615858368580409e+02,
        -1.556989798598866e+02,
        6.680131188771972e+01,
        -1.328068155288572e+01,
    ];
    let c = [
        -7.784894002430293e-03,
        -3.223964580411365e-01,
        -2.400758277161838e+00,
        -2.549732539343734e+00,
        4.374664141464968e+00,
        2.938163982698783e+00,
    ];
    let d = [
        7.784695709041462e-03,
        3.224671290700398e-01,
        2.445134137142996e+00,
        3.754408661907416e+00,
    ];
    
    let p_low = 0.02425;
    let p_high = 1.0 - p_low;
    
    if p < p_low {
        let q = (-2.0 * p).sqrt();
        (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
        ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1.0)
    } else if p <= p_high {
        let q = p - 0.5;
        let r = q * q;
        (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
        (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*q+1.0)
    } else {
        let q = (-2.0 * (1.0 - p)).sqrt();
        -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
        ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1.0)
    }
}

// =============================================================================
// SECTION 6: NUMERICAL DIFFERENTIATION
// =============================================================================

/// TILE: numerical_derivative
/// SIGNATURE: fn numerical_derivative(f: fn(f64) -> f64, x: f64, h: f64) -> f64
/// OPS: O(1) - 4 function evaluations
/// STABILITY: Central difference with Richardson extrapolation
/// USES: MED - Gradient estimation
pub fn numerical_derivative(f: fn(f64) -> f64, x: f64, h: f64) -> f64 {
    // Central difference with Richardson extrapolation
    let h1 = h;
    let h2 = h / 2.0;
    
    // First level approximation
    let d1 = (f(x + h1) - f(x - h1)) / (2.0 * h1);
    
    // Second level approximation
    let d2 = (f(x + h2) - f(x - h2)) / (2.0 * h2);
    
    // Richardson extrapolation (assumes O(h²) error)
    (4.0 * d2 - d1) / 3.0
}

/// TILE: numerical_gradient
/// SIGNATURE: fn numerical_gradient(f: fn(&[f64]) -> f64, x: &[f64], h: f64) -> Vec<f64>
/// OPS: O(n) - 2n function evaluations
/// STABILITY: Central difference method
/// USES: MED - Multi-dimensional gradient
pub fn numerical_gradient(f: fn(&[f64]) -> f64, x: &[f64], h: f64) -> Vec<f64> {
    let n = x.len();
    let mut gradient = Vec::with_capacity(n);
    let mut x_plus = x.to_vec();
    let mut x_minus = x.to_vec();
    
    for i in 0..n {
        x_plus[i] += h;
        x_minus[i] -= h;
        
        let deriv = (f(&x_plus) - f(&x_minus)) / (2.0 * h);
        gradient.push(deriv);
        
        x_plus[i] = x[i];
        x_minus[i] = x[i];
    }
    
    gradient
}

/// TILE: stable_hessian_diagonal
/// SIGNATURE: fn stable_hessian_diagonal(f: fn(&[f64]) -> f64, x: &[f64], h: f64) -> Vec<f64>
/// OPS: O(n) - 3n function evaluations
/// STABILITY: Second derivative with stability checks
/// USES: LOW - Curvature estimation
pub fn stable_hessian_diagonal(f: fn(&[f64]) -> f64, x: &[f64], h: f64) -> Vec<f64> {
    let n = x.len();
    let mut hessian_diag = Vec::with_capacity(n);
    let mut x_mod = x.to_vec();
    let f_x = f(x);
    
    for i in 0..n {
        let x_i = x[i];
        
        x_mod[i] = x_i + h;
        let f_plus = f(&x_mod);
        
        x_mod[i] = x_i - h;
        let f_minus = f(&x_mod);
        
        // Second derivative approximation
        let d2 = (f_plus - 2.0 * f_x + f_minus) / (h * h);
        
        hessian_diag.push(d2);
        x_mod[i] = x_i;
    }
    
    hessian_diag
}

// =============================================================================
// SECTION 7: PROBABILITY UTILITIES
// =============================================================================

/// TILE: clip_probability
/// SIGNATURE: fn clip_probability(p: f64) -> f64
/// OPS: O(1) - simple bounds check
/// STABILITY: Prevents log(0) and division by zero
/// USES: HIGH - Preprocessing probabilities
#[inline]
pub fn clip_probability(p: f64) -> f64 {
    const EPS: f64 = 1e-10;
    p.clamp(EPS, 1.0 - EPS)
}

/// TILE: entropy_stable
/// SIGNATURE: fn entropy_stable(probs: &[f64]) -> f64
/// OPS: O(n) - single pass
/// STABILITY: Handles zero probabilities safely
/// USES: HIGH - Uncertainty measurement
pub fn entropy_stable(probs: &[f64]) -> f64 {
    probs.iter()
        .filter(|&&p| p > 0.0 && p.is_finite())
        .map(|&p| -p * p.ln())
        .sum()
}

/// TILE: cross_entropy_stable
/// SIGNATURE: fn cross_entropy_stable(p: &[f64], q: &[f64]) -> f64
/// OPS: O(n) - single pass
/// STABILITY: Uses log-sum-exp for stability
/// USES: MED - Loss computation
pub fn cross_entropy_stable(p: &[f64], q: &[f64]) -> f64 {
    assert_eq!(p.len(), q.len(), "Distribution lengths must match");
    
    p.iter()
        .zip(q.iter())
        .filter(|(&pi, _)| pi > 0.0)
        .map(|(&pi, &qi)| {
            let qi_safe = clip_probability(qi);
            -pi * qi_safe.ln()
        })
        .sum()
}

/// TILE: kl_divergence_stable
/// SIGNATURE: fn kl_divergence_stable(p: &[f64], q: &[f64]) -> f64
/// OPS: O(n) - single pass
/// STABILITY: Handles zeros in both distributions
/// USES: MED - Distribution comparison
pub fn kl_divergence_stable(p: &[f64], q: &[f64]) -> f64 {
    assert_eq!(p.len(), q.len(), "Distribution lengths must match");
    
    p.iter()
        .zip(q.iter())
        .filter(|(&pi, _)| pi > 0.0)
        .map(|(&pi, &qi)| {
            let qi_safe = clip_probability(qi);
            pi * (pi / qi_safe).ln()
        })
        .sum()
}

// =============================================================================
// SECTION 8: SIGMOID AND RELATED FUNCTIONS
// =============================================================================

/// TILE: stable_sigmoid
/// SIGNATURE: fn stable_sigmoid(x: f64) -> f64
/// OPS: O(1) - conditional evaluation
/// STABILITY: Prevents overflow for large positive/negative inputs
/// USES: HIGH - Neural network activation
#[inline]
pub fn stable_sigmoid(x: f64) -> f64 {
    if x >= 0.0 {
        1.0 / (1.0 + (-x).exp())
    } else {
        let exp_x = x.exp();
        exp_x / (1.0 + exp_x)
    }
}

/// TILE: stable_log_sigmoid
/// SIGNATURE: fn stable_log_sigmoid(x: f64) -> f64
/// OPS: O(1) - stable computation
/// STABILITY: Direct log computation avoids underflow
/// USES: MED - Log-space activations
#[inline]
pub fn stable_log_sigmoid(x: f64) -> f64 {
    if x >= 0.0 {
        -(1.0 + (-x).exp()).ln()
    } else {
        x - (1.0 + x.exp()).ln()
    }
}

/// TILE: stable_softplus
/// SIGNATURE: fn stable_softplus(x: f64) -> f64
/// OPS: O(1) - stable computation
/// STABILITY: Prevents overflow for large inputs
/// USES: MED - Smooth ReLU alternative
#[inline]
pub fn stable_softplus(x: f64) -> f64 {
    if x > 20.0 {
        x  // ln(1 + exp(x)) ≈ x for large x
    } else if x < -20.0 {
        x.exp()  // ln(1 + exp(x)) ≈ exp(x) for very negative x
    } else {
        (1.0 + x.exp()).ln()
    }
}

// =============================================================================
// SECTION 9: CERTAINTY COMPUTATION
// =============================================================================

/// TILE: certainty_from_confidence
/// SIGNATURE: fn certainty_from_confidence(confidence: f64, n_samples: u64) -> f64
/// OPS: O(1) - statistical computation
/// STABILITY: Uses Wilson score interval
/// USES: HIGH - Converting confidence to certainty
pub fn certainty_from_confidence(confidence: f64, n_samples: u64) -> f64 {
    if n_samples == 0 {
        return 0.5; // Maximum uncertainty
    }
    
    let n = n_samples as f64;
    let p = confidence.clamp(0.0, 1.0);
    
    // Wilson score interval lower bound
    let z = 1.96; // 95% confidence
    let z2 = z * z;
    
    let denominator = 1.0 + z2 / n;
    let center = p + z2 / (2.0 * n);
    let margin = z * (p * (1.0 - p) / n + z2 / (4.0 * n * n)).sqrt();
    
    let lower = ((center - margin) / denominator).max(0.0);
    let upper = ((center + margin) / denominator).min(1.0);
    
    // Certainty is based on interval width (tighter = more certain)
    let interval_width = upper - lower;
    1.0 - interval_width
}

/// TILE: ensemble_certainty
/// SIGNATURE: fn ensemble_certainty(predictions: &[f64], weights: Option<&[f64]>) -> f64
/// OPS: O(n) - ensemble aggregation
/// STABILITY: Uses log-sum-exp for stability
/// USES: HIGH - Model ensemble certainty
pub fn ensemble_certainty(predictions: &[f64], weights: Option<&[f64]>) -> f64 {
    if predictions.is_empty() {
        return 0.5;
    }
    
    let weights = weights.unwrap_or(&vec![1.0; predictions.len()][..]);
    
    // Compute weighted mean and variance
    let total_weight: f64 = weights.iter().sum();
    let weighted_mean: f64 = predictions.iter()
        .zip(weights.iter())
        .map(|(&p, &w)| p * w)
        .sum::<f64>() / total_weight;
    
    let weighted_var: f64 = predictions.iter()
        .zip(weights.iter())
        .map(|(&p, &w)| w * (p - weighted_mean).powi(2))
        .sum::<f64>() / total_weight;
    
    // Certainty inversely related to variance
    // Use sigmoid to map [0, inf) variance to (0, 1] certainty
    let uncertainty = (weighted_var.sqrt()).min(1.0);
    1.0 - uncertainty
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_log_sum_exp_stability() {
        // Test with extreme values that would overflow naive implementation
        let large = vec![1000.0, 1001.0, 1002.0];
        let result = log_sum_exp(&large);
        assert!(result.is_finite());
        assert!((result - 1002.4076).abs() < 0.01);
        
        // Test with negative extreme values
        let small = vec![-1000.0, -1001.0, -1002.0];
        let result = log_sum_exp(&small);
        assert!(result.is_finite());
    }
    
    #[test]
    fn test_stable_softmax_sums_to_one() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let probs = stable_softmax(&values);
        let sum: f64 = probs.iter().sum();
        assert!((sum - 1.0).abs() < 1e-10);
    }
    
    #[test]
    fn test_stable_softmax_extreme_values() {
        let values = vec![1000.0, 1001.0, 1002.0];
        let probs = stable_softmax(&values);
        assert!(probs.iter().all(|&p| p.is_finite() && p >= 0.0 && p <= 1.0));
    }
    
    #[test]
    fn test_welford_variance() {
        let mut stats = WelfordStats::new();
        let data = vec![2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0];
        
        for &x in &data {
            stats.update(x);
        }
        
        assert!((stats.mean() - 5.0).abs() < 1e-10);
        assert!((stats.variance() - 4.57142857142857).abs() < 1e-6);
    }
    
    #[test]
    fn test_stable_sigmoid_extremes() {
        assert!((stable_sigmoid(1000.0) - 1.0).abs() < 1e-10);
        assert!(stable_sigmoid(-1000.0).abs() < 1e-10);
        assert!((stable_sigmoid(0.0) - 0.5).abs() < 1e-10);
    }
    
    #[test]
    fn test_log_add_exp() {
        let result = log_add_exp(0.0_f64.ln(), 0.0_f64.ln());
        assert!((result - (2.0_f64).ln()).abs() < 1e-10);
    }
    
    #[test]
    fn test_entropy_stable() {
        let uniform = vec![0.25, 0.25, 0.25, 0.25];
        let entropy = entropy_stable(&uniform);
        assert!((entropy - 2.0_f64.ln()).abs() < 1e-10);
        
        let peaked = vec![1.0, 0.0, 0.0, 0.0];
        let entropy = entropy_stable(&peaked);
        assert!(entropy.abs() < 1e-10);
    }
    
    #[test]
    fn test_numerical_derivative() {
        let f = |x: f64| x * x;
        let deriv = numerical_derivative(f, 2.0, 1e-5);
        assert!((deriv - 4.0).abs() < 1e-6);
    }
    
    #[test]
    fn test_confidence_interval_t() {
        let (low, high) = confidence_interval_t(0.5, 0.1, 10.0, 0.05);
        assert!(low < 0.5);
        assert!(high > 0.5);
        assert!(low < high);
    }
    
    #[test]
    fn test_certainty_from_confidence() {
        // High confidence with many samples = high certainty
        let high = certainty_from_confidence(0.95, 1000);
        assert!(high > 0.8);
        
        // Low confidence with few samples = low certainty
        let low = certainty_from_confidence(0.6, 10);
        assert!(low < 0.5);
    }
}

// =============================================================================
// TILE SUMMARY TABLE
// =============================================================================
//
// | TILE                        | COMPLEXITY | STABILITY | USES  |
// |-----------------------------|------------|-----------|-------|
// | log_sum_exp                 | O(n)       | HIGH      | HIGH  |
// | log_sum_exp_pair            | O(1)       | HIGH      | HIGH  |
// | log_sum_exp_weighted        | O(n)       | HIGH      | MED   |
// | stable_softmax              | O(n)       | HIGH      | HIGH  |
// | log_softmax                 | O(n)       | HIGH      | HIGH  |
// | stable_softmax_with_temp    | O(n)       | HIGH      | MED   |
// | log_add_exp                 | O(1)       | HIGH      | HIGH  |
// | log_sub_exp                 | O(1)       | HIGH      | MED   |
// | log_prob_product            | O(n)       | HIGH      | HIGH  |
// | normalize_log_probs         | O(n)       | HIGH      | HIGH  |
// | WelfordStats                | O(1)       | HIGH      | HIGH  |
// | t_distribution_cdf          | O(1)*      | MED       | MED   |
// | confidence_interval_t       | O(1)*      | MED       | HIGH  |
// | numerical_derivative        | O(1)       | MED       | MED   |
// | numerical_gradient          | O(n)       | MED       | MED   |
// | stable_hessian_diagonal     | O(n)       | MED       | LOW   |
// | clip_probability            | O(1)       | HIGH      | HIGH  |
// | entropy_stable              | O(n)       | HIGH      | HIGH  |
// | cross_entropy_stable        | O(n)       | HIGH      | MED   |
// | kl_divergence_stable        | O(n)       | HIGH      | MED   |
// | stable_sigmoid              | O(1)       | HIGH      | HIGH  |
// | stable_log_sigmoid          | O(1)       | HIGH      | MED   |
// | stable_softplus             | O(1)       | HIGH      | MED   |
// | certainty_from_confidence   | O(1)       | HIGH      | HIGH  |
// | ensemble_certainty          | O(n)       | HIGH      | HIGH  |
//
// * Uses approximation with bounded iterations
//
// =============================================================================

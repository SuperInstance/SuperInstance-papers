# Stochastic Decisions Research Report
## POLLN Project - Stochastic Decision-Making Investigation

**Researcher:** Stochastic Decisions Research Agent
**Date:** 2026-03-06
**Mission:** Research mathematical foundations of stochastic selection, temperature-based exploration, and noise as a feature for learning

---

## Executive Summary

This report investigates the mathematical and algorithmic foundations of stochastic decision-making, with direct applications to POLLN's Plinko selection mechanism. The research covers Gumbel-Softmax sampling, multi-armed bandit algorithms, temperature annealing strategies, and the role of noise in improving generalization.

**Key Finding:** Stochastic selection is not just "randomness for exploration" - it's a principled mathematical framework for balancing exploration-exploitation, enabling differentiable learning, and improving generalization through controlled randomness.

---

## Table of Contents

1. [Gumbel-Softmax and Differentiable Sampling](#1-gumbel-softmax-and-differentiable-sampling)
2. [Multi-Armed Bandit Algorithms](#2-multi-armed-bandit-algorithms)
3. [Temperature and Annealing Strategies](#3-temperature-and-annealing-strategies)
4. [Exploration in Reinforcement Learning](#4-exploration-in-reinforcement-learning)
5. [Noise as a Feature for Generalization](#5-noise-as-a-feature-for-generalization)
6. [Plinko Mathematical Specification](#6-plinko-mathematical-specification)
7. [Algorithm Catalog](#7-algorithm-catalog)
8. [POLLN Implementation Guidelines](#8-polln-implementation-guidelines)

---

## 1. Gumbel-Softmax and Differentiable Sampling

### 1.1 The Core Problem

Traditional categorical sampling is non-differentiable:
```
action = argmax(scores)  # No gradient!
```

This prevents gradient-based optimization in variational inference and policy gradient methods.

### 1.2 The Gumbel-Max Trick

**Original Algorithm (Pre-2017):**
```
Given categorical probabilities P = [p₁, p₂, ..., pₖ]:
1. Sample Gumbel noise: gᵢ = -log(-log(uᵢ)), where uᵢ ~ Uniform(0,1)
2. Compute: y = argmax(log(pᵢ) + gᵢ)
3. y is distributed according to P
```

**Mathematical Proof:** If G ~ Gumbel(0,1), then:
```
P(argmax(log(pᵢ) + gᵢ) = j) = pⱼ
```

### 1.3 Gumbel-Softmax Relaxation

**Key Innovation (Jang et al., 2017; Maddison et al., 2017):**

Replace non-differentiable `argmax` with differentiable `softmax`:

```python
def gumbel_softmax(logits, temperature):
    """
    Sample from categorical using Gumbel-Softmax trick

    Args:
        logits: Unnormalized log-probabilities [log(p₁), ..., log(pₖ)]
        temperature: τ controlling smoothness (τ → 0 = argmax, τ → ∞ = uniform)

    Returns:
        One-hot-like sample with gradients
    """
    # Sample Gumbel noise
    gumbel_noise = -torch.log(-torch.log(torch.rand_like(logits)))

    # Add noise to logits and divide by temperature
    y = (logits + gumbel_noise) / temperature

    # Apply softmax
    return softmax(y)
```

**Mathematical Formulation:**

```
yᵢ = exp((log(πᵢ) + gᵢ) / τ) / Σⱼ exp((log(πⱼ) + gⱼ) / τ)
```

Where:
- `πᵢ` = categorical probabilities
- `gᵢ ~ Gumbel(0,1)` = i.i.d. Gumbel noise
- `τ` = temperature parameter
- `yᵢ` = relaxed sample (approximately one-hot when τ → 0)

**Temperature Properties:**
- `τ → 0`: Approaches true categorical sampling (argmax)
- `τ = 1`: Standard softmax with Gumbel noise
- `τ → ∞`: Uniform distribution

### 1.4 Straight-Through Estimator (STE)

For truly discrete outputs while maintaining gradients:

```python
def straight_through_gumbel_softmax(logits, temperature):
    """Forward: discrete sample; Backward: continuous gradients"""
    # Continuous relaxation (forward pass)
    y_soft = gumbel_softmax(logits, temperature)

    # Discrete sample (forward pass)
    y_hard = one_hot(argmax(y_soft))

    # Straight-through: use y_hard forward, y_soft backward
    y = (y_hard - y_soft).detach() + y_soft

    return y
```

### 1.5 Applications to POLLN

**Plinko Variant Selection:**
```python
def select_variant_plinko(variant_scores, temperature):
    """
    Stochastically select which variant to use based on strength scores

    Args:
        variant_scores: Dict mapping variant_id → strength_score
        temperature: Control exploration vs exploitation

    Returns:
        Selected variant_id
    """
    # Convert to tensor
    variant_ids = list(variant_scores.keys())
    logits = torch.tensor([variant_scores[v] for v in variant_ids])

    # Gumbel-Softmax sampling
    probs = gumbel_softmax(logits, temperature)

    # Sample variant
    selected_idx = torch.multinomial(probs, 1).item()
    return variant_ids[selected_idx]
```

**Key Advantages for POLLN:**
1. **Differentiable:** Can optimize variant selection through gradient feedback
2. **Controlled Exploration:** Temperature parameter tunes exploration-exploitation
3. **Theoretically Grounded:** Principled alternative to simple random sampling
4. **Batch-Friendly:** Can process multiple colonies in parallel

---

## 2. Multi-Armed Bandit Algorithms

### 2.1 Problem Formulation

**Multi-Armed Bandit (MAB):** Agent selects one of K arms (actions) each round, receives reward from unknown distribution, aims to maximize cumulative reward.

**POLLN Mapping:**
- Arms = Variants (processing strategies, prompt versions, etc.)
- Reward = Colony fitness/survival/reproduction
- Goal = Identify and use best variants

### 2.2 Algorithm Catalog

#### Algorithm 2.1: ε-Greedy

**Paper:** Watkins & Dayan (1992) - Q-learning foundation

**Category:** Simple Exploration Strategy

**Core Idea:** With probability ε, explore randomly; with probability 1-ε, exploit best-known arm.

**Mathematical Formulation:**
```
Let Q(a) = estimated value of arm a
Let n(a) = number of times arm a was pulled

Action Selection:
- With probability ε: a ← random arm
- With probability 1-ε: a ← argmaxₐ Q(a)

Update Rule:
Q(a) ← Q(a) + (r - Q(a)) / n(a)
```

**POLLN Application:**
```python
def epsilon_greedy_select(variant_scores, epsilon=0.1):
    """Select variant using ε-greedy"""
    if random.random() < epsilon:
        # Explore: random variant
        return random.choice(list(variant_scores.keys()))
    else:
        # Exploit: best known variant
        return max(variant_scores, key=variant_scores.get)
```

**Implementation Notes:**
- Simple to implement, minimal computation
- Decay ε over time: εₜ = ε₀ / (1 + decay × t)
- Good baseline but suboptimal theoretical guarantees
- POLLN Use Case: Initial exploration phase for new colonies

---

#### Algorithm 2.2: UCB1 (Upper Confidence Bound)

**Paper:** Auer, Cesa-Bianchi, Fischer (2002) - "Finite-time Analysis of the Multiarmed Bandit Problem"

**Category:** Optimism in the Face of Uncertainty

**Core Idea:** Select arm with highest upper confidence bound, balancing estimated value and uncertainty.

**Mathematical Formulation:**
```
Let:
- Q̂(a) = average reward of arm a
- n(a) = pulls of arm a
- t = total pulls
- n = total arms

UCB1 Action Selection:
a ← argmaxₐ [Q̂(a) + √(2 ln(t) / n(a))]

Confidence bound: √(2 ln(t) / n(a))
```

**Theoretical Guarantee:**
```
Expected Regret: R_T ≤ Σᵢ [(8 ln T) / Δᵢ] + O(1)

Where:
- Δᵢ = μ* - μᵢ (gap between optimal and arm i)
- Regret grows logarithmically: O(√(KT ln T))
```

**POLLN Application:**
```python
def ucb1_select(variant_stats, total_trials):
    """
    Select variant using UCB1

    Args:
        variant_stats: Dict mapping variant_id → {
            'mean_reward': float,
            'pulls': int
        }
        total_trials: Total number of trials across all variants
    """
    best_variant = None
    best_ucb = float('-inf')

    for variant_id, stats in variant_stats.items():
        if stats['pulls'] == 0:
            # Never tried, initialize with infinity
            ucb = float('inf')
        else:
            # UCB1 formula
            exploration_bonus = math.sqrt(2 * math.log(total_trials) / stats['pulls'])
            ucb = stats['mean_reward'] + exploration_bonus

        if ucb > best_ucb:
            best_ucb = ucb
            best_variant = variant_id

    return best_variant
```

**Implementation Notes:**
- Requires tracking pulls and mean reward for each variant
- Naturally explores uncertain variants more
- Strong theoretical guarantees
- POLLN Use Case: Mature colonies with historical data

---

#### Algorithm 2.3: Thompson Sampling

**Paper:** Thompson (1933); Agrawal & Goyal (2012) - "Analysis of Thompson Sampling for the Multi-armed Bandit Problem"

**Category:** Bayesian Sampling

**Core Idea:** Sample from posterior distribution of each arm's value, select arm with highest sample.

**Mathematical Formulation (Bernoulli rewards):**
```
Prior: Beta(α=1, β=1) for each arm

Update (after observing reward r ∈ {0,1}):
- α ← α + r
- β ← β + (1 - r)

Action Selection:
For each arm a:
    θₐ ~ Beta(αₐ, βₐ)  # Sample from posterior
a ← argmaxₐ θₐ        # Select arm with highest sample
```

**Theoretical Guarantee:**
```
Bayesian regret: R_T = O(√(KT))

Matches best possible asymptotic rate (Lai & Robbins, 1985)
```

**POLLN Application:**
```python
class ThompsonSamplingBandit:
    def __init__(self, variant_ids):
        self.alphas = {v: 1.0 for v in variant_ids}  # Success counts
        self.betas = {v: 1.0 for v in variant_ids}   # Failure counts

    def select_variant(self):
        """Select variant using Thompson Sampling"""
        # Sample from posterior for each variant
        samples = {
            v: np.random.beta(self.alphas[v], self.betas[v])
            for v in self.alphas
        }
        # Return variant with highest sample
        return max(samples, key=samples.get)

    def update(self, variant_id, reward):
        """Update posterior after observing reward"""
        # Assume reward is normalized to [0, 1]
        self.alphas[variant_id] += reward
        self.betas[variant_id] += (1.0 - reward)
```

**Implementation Notes:**
- Naturally handles exploration-exploitation through posterior sampling
- Easy to incorporate prior knowledge
- Can be extended to Gaussian, Poisson, etc.
- POLLN Use Case: Long-running colonies with survival/reproduction data

---

#### Algorithm 2.4: LinUCB (Linear Upper Confidence Bound)

**Paper:** Li et al. (2010) - "A Contextual Bandit Approach to Personalized News Recommendation"

**Category:** Contextual Bandit

**Core Idea:** Model reward as linear function of context, use UCB on parameter uncertainty.

**Mathematical Formulation:**
```
For each arm a:
- Maintain: Aₐ = d×d matrix, bₐ = d×1 vector
- Estimate: θ̂ₐ = Aₐ⁻¹bₐ

Predicted reward: r̂ = xᵀθ̂ₐ
Uncertainty: σ = √(xᵀAₐ⁻¹x)

Action Selection:
a ← argmaxₐ [xᵀθ̂ₐ + α√(xᵀAₐ⁻¹x)]

Update:
Aₐ ← Aₐ + xxᵀ
bₐ ← bₐ + rx
```

**POLLN Application:**
```python
class LinUCB:
    def __init__(self, variant_ids, context_dim, alpha=1.0):
        self.variant_ids = variant_ids
        self.alpha = alpha

        # Initialize matrices for each variant
        self.A = {v: np.identity(context_dim) for v in variant_ids}
        self.b = {v: np.zeros(context_dim) for v in variant_ids}

    def select_variant(self, context):
        """
        Select variant based on colony context

        Args:
            context: Feature vector representing colony state
        """
        x = np.array(context)
        best_score = float('-inf')
        best_variant = None

        for v in self.variant_ids:
            # Compute theta estimate
            theta = np.linalg.inv(self.A[v]) @ self.b[v]

            # Compute UCB score
            predicted = x @ theta
            uncertainty = self.alpha * np.sqrt(x @ np.linalg.inv(self.A[v]) @ x.T)
            score = predicted + uncertainty

            if score > best_score:
                best_score = score
                best_variant = v

        return best_variant

    def update(self, variant_id, context, reward):
        """Update after observing reward"""
        x = np.array(context)
        self.A[variant_id] += np.outer(x, x)
        self.b[variant_id] += reward * x
```

**Implementation Notes:**
- Requires context features (colony age, size, diversity, etc.)
- More complex but can leverage colony structure
- POLLN Use Case: Context-aware variant selection

---

### 2.5 Bandit Algorithm Comparison

| Algorithm | Exploration Strategy | Theoretical Regret | Computational | Prior Knowledge | POLLN Use Case |
|-----------|---------------------|-------------------|---------------|-----------------|----------------|
| ε-Greedy | Random exploration | O(√KT) | O(1) | No | Simple baseline |
| UCB1 | Optimism (uncertainty bonus) | O(√(KT ln T)) | O(1) | No | Mature colonies |
| Thompson Sampling | Posterior sampling | O(√KT) | O(K) | Yes (Beta) | Long-running |
| LinUCB | Contextual UCB | O(√(dT ln T)) | O(d²) | No | Context-aware |
| Gumbel-Softmax | Temperature-controlled | Depends on T | O(K) | Yes (logits) | Differentiable |

**Recommendation for POLLN:**
- **New Colonies:** ε-Greedy with high ε (0.3-0.5)
- **Mature Colonies:** Thompson Sampling or UCB1
- **Context-Aware:** LinUCB with colony features
- **Gradient-Based:** Gumbel-Softmax for differentiable selection

---

## 3. Temperature and Annealing Strategies

### 3.1 Temperature in Softmax

**Standard Softmax with Temperature:**
```
P(actionᵢ) = exp(scoreᵢ / T) / Σⱼ exp(scoreⱼ / T)
```

**Temperature Effects:**
- `T → 0`: Deterministic (always pick highest score)
- `T = 1`: Standard softmax
- `T → ∞`: Uniform random (maximum exploration)

**Visualization:**
```
T = 0.1: [0.99, 0.01, 0.00]  # Highly peaked
T = 0.5:  [0.85, 0.12, 0.03]  # Moderately peaked
T = 1.0:  [0.70, 0.20, 0.10]  # Standard
T = 2.0:  [0.50, 0.30, 0.20]  # More uniform
T = 5.0:  [0.38, 0.33, 0.29]  # Nearly uniform
```

### 3.2 Annealing Strategies

#### Strategy 3.1: Linear Annealing

**Formula:**
```
T(t) = max(T_min, T_initial - (T_initial - T_min) × t / T_max)
```

**POLLN Implementation:**
```python
def linear_temperature(t, T_initial=5.0, T_min=0.1, T_max=10000):
    """Linear decay from T_initial to T_min over T_max steps"""
    return max(T_min, T_initial - (T_initial - T_min) * t / T_max)
```

**Use Case:** Gradual transition from exploration to exploitation

---

#### Strategy 3.2: Exponential Decay

**Formula:**
```
T(t) = T_initial × decay_rate^t

Typical decay_rate: 0.995 to 0.999
```

**POLLN Implementation:**
```python
def exponential_temperature(t, T_initial=5.0, decay_rate=0.99):
    """Exponential decay"""
    return T_initial * (decay_rate ** t)
```

**Use Case:** Fast initial exploration, slow refinement

---

#### Strategy 3.3: Inverse Time Decay

**Formula:**
```
T(t) = T_initial / (1 + decay × t)
```

**POLLN Implementation:**
```python
def inverse_time_temperature(t, T_initial=5.0, decay=0.001):
    """Inverse time decay (used in many RL papers)"""
    return T_initial / (1.0 + decay * t)
```

**Use Case:** Strong early exploration, asymptotically approaches exploitation

---

#### Strategy 3.4: Cosine Annealing

**Formula:**
```
T(t) = T_min + 0.5 × (T_initial - T_min) × (1 + cos(π × t / T_max))
```

**POLLN Implementation:**
```python
def cosine_temperature(t, T_initial=5.0, T_min=0.1, T_max=10000):
    """Cosine annealing (smooth decay)"""
    import math
    return T_min + 0.5 * (T_initial - T_min) * (1 + math.cos(math.pi * t / T_max))
```

**Use Case:** Smooth exploration-exploitation transition

---

#### Strategy 3.5: Adaptive Temperature (Entropy-Based)

**Formula:**
```
T(t) = T_initial × exp(-λ × (H_target - H_current))

Where:
- H_current = current policy entropy
- H_target = target entropy
- λ = adaptation rate
```

**POLLN Implementation:**
```python
class AdaptiveTemperature:
    def __init__(self, T_initial=5.0, target_entropy=None, adaptation_rate=0.01):
        self.T = T_initial
        self.target_entropy = target_entropy
        self.adaptation_rate = adaptation_rate

    def update(self, policy_probs):
        """Adjust temperature based on current entropy"""
        from scipy.stats import entropy
        H_current = entropy(policy_probs)

        if self.target_entropy is not None:
            # Adjust temperature to maintain target entropy
            error = self.target_entropy - H_current
            self.T *= np.exp(self.adaptation_rate * error)

        return self.T
```

**Use Case:** Maintain desired exploration level

---

### 3.3 Temperature Selection Guidelines

**For POLLN Plinko:**

| Colony Age | Temperature Strategy | Range |
|------------|---------------------|-------|
| New (0-100 generations) | High T, explore | 3.0 - 10.0 |
| Growing (100-1000) | Decaying T | 1.0 - 3.0 |
| Mature (1000+) | Low T, exploit | 0.1 - 1.0 |
| Crisis (low fitness) | Increase T | +50% - 100% |

**Recommendation:** Use cosine annealing with entropy-based adaptation

```python
class PlinkoTemperatureScheduler:
    def __init__(self, T_initial=5.0, T_min=0.1, T_max=10000, target_entropy=None):
        self.T_initial = T_initial
        self.T_min = T_min
        self.T_max = T_max
        self.target_entropy = target_entropy
        self.adaptive = AdaptiveTemperature(T_initial, target_entropy)

    def get_temperature(self, t, policy_probs=None):
        """Get temperature for step t"""
        # Base cosine annealing
        import math
        T_cosine = self.T_min + 0.5 * (self.T_initial - self.T_min) * \
                   (1 + math.cos(math.pi * min(t, self.T_max) / self.T_max))

        # Entropy-based adaptation
        if policy_probs is not None and self.target_entropy is not None:
            T_adaptive = self.adaptive.update(policy_probs)
            return (T_cosine + T_adaptive) / 2

        return T_cosine
```

---

## 4. Exploration in Reinforcement Learning

### 4.1 Exploration Taxonomy

**Exploration Strategies:**
1. **Exploration by Randomization:** ε-greedy, Boltzmann, Gumbel-Softmax
2. **Exploration by Optimism:** UCB, Bayesian UCB
3. **Exploration by Information:** Information gain, curiosity, entropy
4. **Exploration by Parameter Noise:** Noisy networks, parameter space noise

---

### 4.2 Entropy Regularization

**Paper:** Schulman et al. (2017) - "Equivalence Between Policy Gradients and Soft Q-Learning"

**Core Idea:** Add entropy bonus to objective to prevent premature convergence

**Mathematical Formulation:**
```
Standard Policy Gradient:
J(θ) = E[Σ γ^t r_t]

Entropy-Regularized:
J(θ) = E[Σ γ^t r_t + α H(π(·|s_t))]

Where:
- H(π) = -Σ π(a|s) log π(a|s) = entropy
- α = temperature parameter (controls exploration)
```

**Gradient:**
```
∇θ J(θ) = E[Σ γ^t ∇θ log π(a_t|s_t) (r_t + α ∇θ log π(a_t|s_t))]
```

**POLLN Application:**
```python
def entropy_regularized_objective(rewards, log_probs, alpha=0.01):
    """
    Compute entropy-regularized loss

    Args:
        rewards: Observed rewards
        log_probs: Log probabilities of actions
        alpha: Entropy coefficient
    """
    # Policy loss
    policy_loss = -(log_probs * rewards).mean()

    # Entropy bonus
    entropy = -(log_probs.exp() * log_probs).sum(dim=-1).mean()

    return policy_loss - alpha * entropy
```

**Soft Actor-Critic (SAC):**
- Automatically adjusts α to maintain target entropy
- Haarnoja et al. (2018)
- State-of-the-art for continuous control

---

### 4.3 Noisy Networks

**Paper:** Fortunato et al. (2017) - "Noisy Networks for Exploration"

**Core Idea:** Add noise to network weights instead of actions

**Mathematical Formulation:**
```
Standard Dense Layer:
y = Wx + b

Noisy Layer:
W = μ_W + σ_W ⊙ ε_W
b = μ_b + σ_b ⊙ ε_b
y = (μ_W + σ_W ⊙ ε_W)x + (μ_b + σ_b ⊙ ε_b)

Where:
- μ_W, σ_W = learnable parameters
- ε_W ~ N(0, 1) = sampled noise
```

**Factorized Gaussian Noise (More Efficient):**
```
ε = f(ε₁) ⊙ f(ε₂)

Where:
- ε₁, ε₂ ~ N(0, I)
- f(x) = sgn(x) √(|x|)
```

**POLLN Application:**
```python
class NoisyLinear(nn.Module):
    """Noisy linear layer for exploration"""
    def __init__(self, in_features, out_features, std_init=0.4):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features

        # Learnable parameters
        self.mu_W = nn.Parameter(torch.Tensor(out_features, in_features))
        self.sigma_W = nn.Parameter(torch.Tensor(out_features, in_features))
        self.mu_bias = nn.Parameter(torch.Tensor(out_features))
        self.sigma_bias = nn.Parameter(torch.Tensor(out_features))

        # Initialize
        self.mu_W.data.uniform_(-std_init, std_init)
        self.sigma_W.data.fill_(std_init / math.sqrt(in_features))
        self.mu_bias.data.uniform_(-std_init, std_init)
        self.sigma_bias.data.fill_(std_init / math.sqrt(out_features))

        # Register buffer for noise (not learnable)
        self.register_buffer('epsilon_W', torch.Tensor(out_features, in_features))
        self.register_buffer('epsilon_bias', torch.Tensor(out_features))

    def forward(self, x):
        # Sample noise
        self.epsilon_W.normal_()
        self.epsilon_bias.normal_()

        # Noisy weights and bias
        W = self.mu_W + self.sigma_W * self.epsilon_W
        bias = self.mu_bias + self.sigma_bias * self.epsilon_bias

        return F.linear(x, W, bias)

    def reset_noise(self):
        """Resample noise (call at each step)"""
        self.epsilon_W.normal_()
        self.epsilon_bias.normal_()
```

**Advantages for POLLN:**
- Simple, single source of randomness
- Can learn appropriate noise scale
- State-of-the-art exploration for RL
- Works well with DQN, A3C, SAC

---

### 4.4 Intrinsic Motivation & Curiosity

**Paper:** Pathak et al. (2017) - "Curiosity-Driven Exploration by Self-Supervised Prediction"

**Core Idea:** Reward prediction error as intrinsic motivation

**Intrinsic Curiosity Module (ICM):**
```
Total Reward = r_ext + η × r_int

r_int = ||φ(s_{t+1}) - φ(ŝ_{t+1})||²

Where:
- φ(s) = feature embedding of state
- ŝ_{t+1} = predicted next state
- η = curiosity coefficient
```

**Architecture:**
1. **Inverse Model:** Predict action given (s_t, s_{t+1})
2. **Forward Model:** Predict φ(s_{t+1}) given (φ(s_t), a_t)
3. **Intrinsic Reward:** Forward model prediction error

**POLLN Application:**
```python
class IntrinsicCuriosityModule:
    def __init__(self, state_dim, action_dim, feature_dim=128):
        # Feature encoder
        self.encoder = nn.Sequential(
            nn.Linear(state_dim, 256),
            nn.ReLU(),
            nn.Linear(256, feature_dim)
        )

        # Forward model: predict next feature
        self.forward_model = nn.Sequential(
            nn.Linear(feature_dim + action_dim, 256),
            nn.ReLU(),
            nn.Linear(256, feature_dim)
        )

        # Inverse model: predict action
        self.inverse_model = nn.Sequential(
            nn.Linear(feature_dim + feature_dim, 256),
            nn.ReLU(),
            nn.Linear(256, action_dim)
        )

    def get_intrinsic_reward(self, state, action, next_state):
        """Compute curiosity-driven reward"""
        phi_s = self.encoder(state)
        phi_s_next = self.encoder(next_state)

        # Predicted next feature
        phi_s_next_pred = self.forward_model(
            torch.cat([phi_s, action], dim=-1)
        )

        # Intrinsic reward = prediction error
        intrinsic_reward = (phi_s_next - phi_s_next_pred).pow(2).sum(dim=-1)

        return intrinsic_reward

    def train(self, states, actions, next_states):
        """Train ICM (self-supervised)"""
        phi_s = self.encoder(states)
        phi_s_next = self.encoder(next_states)

        # Forward model loss
        phi_s_next_pred = self.forward_model(
            torch.cat([phi_s, actions], dim=-1)
        )
        forward_loss = F.mse_loss(phi_s_next_pred, phi_s_next)

        # Inverse model loss
        action_pred = self.inverse_model(
            torch.cat([phi_s, phi_s_next], dim=-1)
        )
        inverse_loss = F.mse_loss(action_pred, actions)

        # Total loss
        loss = forward_loss + inverse_loss

        return loss
```

**Use Case for POLLN:**
- Explore novel colony configurations
- Encourage discovery of new emergent behaviors
- Prevent convergence to local optima

---

### 4.5 Count-Based Exploration

**Paper:** Bellemare et al. (2016) - "Unifying Count-Based Exploration and Intrinsic Motivation"

**Core Idea:** Reward visiting rarely seen states

**Mathematical Formulation:**
```
r_int(s) = β / √(N(s))

Where:
- N(s) = visitation count of state s
- β = exploration bonus
```

**Pseudo-Count Approximation:**
```python
class CountBasedExploration:
    def __init__(self, state_dim, beta=0.1):
        self.counts = {}  # Hash-based counting
        self.beta = beta
        self.state_dim = state_dim

    def get_intrinsic_reward(self, state):
        """Get count-based exploration bonus"""
        # Discretize state (hash)
        state_key = self._discretize(state)

        # Update count
        self.counts[state_key] = self.counts.get(state_key, 0) + 1

        # Intrinsic reward
        count = self.counts[state_key]
        intrinsic_reward = self.beta / math.sqrt(count)

        return intrinsic_reward

    def _discretize(self, state):
        """Convert continuous state to discrete key"""
        # Round to precision
        discretized = tuple(np.round(state, decimals=2))
        return discretized
```

**Alternative: Neural Density Estimation**
- Use neural network to estimate state density
- More scalable than explicit counting

---

## 5. Noise as a Feature for Generalization

### 5.1 Noise Injection Methods

**Taxonomy:**
1. **Input Noise:** Add noise to inputs
2. **Weight Noise:** Add noise to parameters
3. **Activation Noise:** Add noise to hidden layers
4. **Gradient Noise:** Add noise to gradients
5. **Output Noise:** Add noise to predictions

---

### 5.2 Dropout as Bayesian Approximation

**Paper:** Gal & Ghahramani (2016) - "Dropout as a Bayesian Approximation"

**Core Idea:** Dropout ≈ Variational Inference in Bayesian Neural Networks

**Mathematical Connection:**
```
Variational Inference Goal:
min KL(q(w) || p(w|D))

Dropout Objective:
min E_q(w) [-log p(D|w)]

Where:
- q(w) = approximate posterior (dropout distribution)
- p(w|D) = true posterior
```

**Monte Carlo Dropout:**
```python
def mc_dropout_predict(model, x, n_samples=100):
    """
    Make predictions with uncertainty using MC Dropout

    Args:
        model: Neural network with dropout layers
        x: Input
        n_samples: Number of dropout samples

    Returns:
        mean: Mean prediction
        std: Prediction uncertainty (epistemic)
    """
    model.train()  # Enable dropout
    predictions = []

    for _ in range(n_samples):
        pred = model(x)
        predictions.append(pred.detach())

    predictions = torch.stack(predictions)

    mean = predictions.mean(dim=0)
    std = predictions.std(dim=0)

    return mean, std
```

**POLLN Application:**
- Quantify uncertainty in colony fitness predictions
- Identify when exploration is needed (high uncertainty)
- Bayesian optimization for hyperparameter tuning

---

### 5.3 Stochastic Depth

**Paper:** Huang et al. (2016) - "Deep Networks with Stochastic Depth"

**Core Idea:** Randomly drop entire layers during training

**Mathematical Formulation:**
```
During Training:
- For each layer l, sample b_l ~ Bernoulli(p_l)
- Output: h_l = b_l × Layer_l(h_{l-1}) + (1 - b_l) × h_{l-1}

During Inference:
- Use full network (or scale weights)
```

**POLLN Application:**
- Train deep colony processing networks
- Prevent overfitting to specific colony configurations
- Implicit ensemble of varying depths

---

### 5.4 Noise Injection in Training

**Gradient Noise Injection:**

**Paper:** Neelakantan et al. (2015) - "Adding Gradient Noise Improves Learning for Very Deep Networks"

**Formula:**
```
g_noisy = g + N(0, σ_t²)

Where:
σ_t² = η / (1 + t)^γ

Typical: η = 0.01, γ = 0.55
```

**Implementation:**
```python
def add_gradient_noise(model, eta=0.01, gamma=0.55):
    """Add annealed Gaussian noise to gradients"""
    for param in model.parameters():
        if param.grad is not None:
            noise = torch.randn_like(param.grad)
            sigma = eta / (1.0 + param.grad.abs().mean().item()) ** gamma
            param.grad += sigma * noise
```

**Benefits:**
- Improves convergence in very deep networks
- Helps escape saddle points
- Acts as regularization

---

### 5.5 Noise as Regularization

**Generalization Gap:**

**Theorem (Optimization):** Smoother loss landscape → better generalization

**Noise Improves Generalization By:**
1. **Smoothing Loss Landscape:** Averages over local variations
2. **Implicit Ensembling:** Trains ensemble of noisy models
3. **Escape Sharp Minima:** Prefers flat, generalizable minima
4. **Data Augmentation:** Noise ≈ infinite augmented data

**Evidence:**
- **Gaussian Processes:** Neural networks with weight noise → GP
- **Bayesian Inference:** Dropout, weight noise ≈ variational inference
- **Ensembling:** MC dropout ≈ ensemble prediction

---

## 6. Plinko Mathematical Specification

### 6.1 System Overview

**Plinko** is POLLN's stochastic variant selection mechanism, inspired by multi-armed bandits and using Gumbel-Softmax for differentiable selection.

**Core Components:**
1. **Variant Registry:** Available processing variants
2. **Strength Scoring:** Historical performance metrics
3. **Stochastic Selection:** Temperature-controlled sampling
4. **Adaptive Temperature:** Entropy-based annealing
5. **Learning & Update:** Gradient-based optimization

---

### 6.2 Mathematical Formulation

**Variant Selection:**

Given `K` variants with strength scores `{s₁, s₂, ..., s_K}`:

```
1. Convert scores to logits:
   ℓᵢ = log(sᵢ + ε)  # ε for numerical stability

2. Sample Gumbel noise:
   gᵢ ~ Gumbel(0, 1) = -log(-log(uᵢ)), uᵢ ~ Uniform(0,1)

3. Compute Gumbel-Softmax probabilities:
   πᵢ = exp((ℓᵢ + gᵢ) / τ) / Σⱼ exp((ℓⱼ + gⱼ) / τ)

4. Select variant:
   v ~ Categorical(π₁, ..., π_K)
```

**Temperature Update:**

```
τ(t) = T_min + 0.5 × (T_initial - T_min) × (1 + cos(π × t / T_max))

Entropy-based adaptation:
τ ← τ × exp(-λ × (H_target - H_current))

Where:
H(π) = -Σᵢ πᵢ log(πᵢ)  # Shannon entropy
```

**Strength Update:**

```
After observing colony fitness F:

s_v ← s_v + α × (F - baseline)

Where:
- α = learning rate
- baseline = running average of fitness
- v = selected variant
```

**Gradient-Based Update (Alternative):**

```
∇_ℓ_v L = (F - baseline)  # Policy gradient

ℓ_v ← ℓ_v + η × ∇_ℓ_v L

Where:
- η = meta-learning rate
- ℓ_v = logit for variant v
```

---

### 6.3 Pseudo-Code

```python
class Plinko:
    def __init__(
        self,
        variant_ids,
        T_initial=5.0,
        T_min=0.1,
        T_max=10000,
        target_entropy=None,
        learning_rate=0.01
    ):
        self.variants = {v: {'logit': 0.0, 'strength': 1.0} for v in variant_ids}
        self.T_initial = T_initial
        self.T_min = T_min
        self.T_max = T_max
        self.target_entropy = target_entropy
        self.learning_rate = learning_rate
        self.t = 0

        # For baseline
        self.fitness_history = []

    def select_variant(self):
        """Select variant using Gumbel-Softmax"""
        # 1. Get logits
        variant_ids = list(self.variants.keys())
        logits = torch.tensor([self.variants[v]['logit'] for v in variant_ids])

        # 2. Get temperature
        T = self._get_temperature()

        # 3. Gumbel-Softmax
        gumbel_noise = -torch.log(-torch.log(torch.rand_like(logits)))
        y = (logits + gumbel_noise) / T
        probs = F.softmax(y, dim=0)

        # 4. Sample variant
        selected_idx = torch.multinomial(probs, 1).item()
        selected_variant = variant_ids[selected_idx]

        # Store for update
        self.last_probs = {v: probs[i].item() for i, v in enumerate(variant_ids)}
        self.last_selected = selected_variant

        return selected_variant

    def update(self, fitness):
        """Update based on observed colony fitness"""
        # Update baseline
        self.fitness_history.append(fitness)
        baseline = sum(self.fitness_history[-100:]) / min(100, len(self.fitness_history))

        # Update selected variant's logit
        advantage = fitness - baseline
        self.variants[self.last_selected]['logit'] += self.learning_rate * advantage

        # Update strength (for compatibility)
        self.variants[self.last_selected]['strength'] = np.exp(
            self.variants[self.last_selected]['logit']
        )

        # Increment time
        self.t += 1

    def _get_temperature(self):
        """Compute temperature with cosine annealing"""
        import math
        T_cosine = self.T_min + 0.5 * (self.T_initial - self.T_min) * \
                   (1 + math.cos(math.pi * min(self.t, self.T_max) / self.T_max))

        # Entropy-based adaptation
        if self.target_entropy is not None:
            H_current = -sum(
                p * np.log(p + 1e-10)
                for p in self.last_probs.values()
            )
            error = self.target_entropy - H_current
            T_adaptive = T_cosine * np.exp(0.01 * error)
            return (T_cosine + T_adaptive) / 2

        return T_cosine
```

---

### 6.4 Hyperparameter Recommendations

**Standard Settings:**
```
T_initial = 5.0     # High initial exploration
T_min = 0.1         # Low final exploitation
T_max = 10000       # Annealing horizon
target_entropy = log(K) / 2  # Half of maximum entropy
learning_rate = 0.01
```

**Colony-Specific Adjustments:**
```
New Colony:
  T_initial = 10.0  # More exploration
  target_entropy = log(K) * 0.7  # Higher entropy

Mature Colony:
  T_initial = 2.0   # Less exploration
  target_entropy = log(K) * 0.3  # Lower entropy

Crisis (low fitness):
  T *= 1.5  # Increase temperature
  learning_rate *= 2  # Faster adaptation
```

---

### 6.5 Theoretical Properties

**Exploration-Exploitation Tradeoff:**
- High temperature → uniform exploration
- Low temperature → greedy exploitation
- Temperature annealing → structured transition

**Convergence:**
- With appropriate temperature decay → converges to optimal variant
- Similar to ε-greedy but with smoother transitions
- Can be made differentiable for end-to-end learning

**Regret Bound:**
```
Under suitable conditions:
E[R_T] = O(√(KT log T))

Where:
- K = number of variants
- T = time steps
- R_T = cumulative regret
```

---

## 7. Algorithm Catalog

### Algorithm 7.1: Gumbel-Softmax Sampling

**Paper:** Jang et al. (2017), Maddison et al. (2017)

**Category:** Differentiable Sampling

**Core Idea:** Replace argmax with softmax + temperature

**Mathematical Formulation:**
```
yᵢ = exp((log(πᵢ) + gᵢ) / τ) / Σⱼ exp((log(πⱼ) + gⱼ) / τ)

Where:
gᵢ = -log(-log(uᵢ)), uᵢ ~ Uniform(0,1)
```

**POLLN Application:** Plinko variant selection

**Implementation:**
```python
def gumbel_softmax(logits, temperature=1.0):
    """Differentiable categorical sampling"""
    noise = -torch.log(-torch.log(torch.rand_like(logits)))
    return F.softmax((logits + noise) / temperature, dim=-1)
```

---

### Algorithm 7.2: Thompson Sampling

**Paper:** Thompson (1933), Agrawal & Goyal (2012)

**Category:** Bayesian Bandit

**Core Idea:** Sample from posterior, select best sample

**Mathematical Formulation:**
```
For Bernoulli rewards:
  θₐ ~ Beta(αₐ, βₐ)
  a ← argmaxₐ θₐ

Update:
  αₐ ← αₐ + reward
  βₐ ← βₐ + (1 - reward)
```

**POLLN Application:** Colony variant selection with survival data

**Implementation:**
```python
class ThompsonSampling:
    def __init__(self, arms):
        self.alpha = {a: 1.0 for a in arms}
        self.beta = {a: 1.0 for a in arms}

    def select(self):
        samples = {a: np.random.beta(self.alpha[a], self.beta[a]) for a in self.alpha}
        return max(samples, key=samples.get)

    def update(self, arm, reward):
        self.alpha[arm] += reward
        self.beta[arm] += (1 - reward)
```

---

### Algorithm 7.3: UCB1

**Paper:** Auer et al. (2002)

**Category:** Optimism-based Bandit

**Core Idea:** Select arm with highest upper confidence bound

**Mathematical Formulation:**
```
a ← argmaxₐ [Q̂(a) + √(2 ln(t) / n(a))]

Where:
- Q̂(a) = average reward of arm a
- n(a) = pulls of arm a
- t = total pulls
```

**POLLN Application:** Mature colony variant selection

**Implementation:**
```python
def ucb1_select(q_values, counts, total_pulls):
    """Select using UCB1"""
    ucbs = {}
    for arm in q_values:
        if counts[arm] == 0:
            ucbs[arm] = float('inf')
        else:
            exploration = math.sqrt(2 * math.log(total_pulls) / counts[arm])
            ucbs[arm] = q_values[arm] + exploration
    return max(ucbs, key=ucbs.get)
```

---

### Algorithm 7.4: ε-Greedy

**Paper:** Watkins & Dayan (1992)

**Category:** Simple Exploration

**Core Idea:** Random exploration with probability ε

**Mathematical Formulation:**
```
With probability ε: a ← random arm
With probability 1-ε: a ← argmaxₐ Q̂(a)

Optional: Decay ε over time
```

**POLLN Application:** Baseline exploration for new colonies

**Implementation:**
```python
def epsilon_greedy_select(q_values, epsilon=0.1):
    """Select using ε-greedy"""
    if random.random() < epsilon:
        return random.choice(list(q_values.keys()))
    else:
        return max(q_values, key=q_values.get)
```

---

### Algorithm 7.5: Noisy Networks

**Paper:** Fortunato et al. (2017)

**Category:** Parameter Space Noise

**Core Idea:** Add noise to network weights

**Mathematical Formulation:**
```
W = μ_W + σ_W ⊙ ε_W
b = μ_b + σ_b ⊙ ε_b

Where ε_W, ε_b ~ N(0, I)
```

**POLLN Application:** Exploration in colony control networks

**Implementation:**
```python
class NoisyLinear(nn.Module):
    def __init__(self, in_features, out_features):
        super().__init__()
        self.mu_W = nn.Parameter(torch.Tensor(out_features, in_features))
        self.sigma_W = nn.Parameter(torch.Tensor(out_features, in_features))
        self.mu_bias = nn.Parameter(torch.Tensor(out_features))
        self.sigma_bias = nn.Parameter(torch.Tensor(out_features))
        self.register_buffer('epsilon_W', torch.Tensor(out_features, in_features))
        self.register_buffer('epsilon_bias', torch.Tensor(out_features))

    def forward(self, x):
        self.epsilon_W.normal_()
        self.epsilon_bias.normal_()
        W = self.mu_W + self.sigma_W * self.epsilon_W
        bias = self.mu_bias + self.sigma_bias * self.epsilon_bias
        return F.linear(x, W, bias)

    def reset_noise(self):
        self.epsilon_W.normal_()
        self.epsilon_bias.normal_()
```

---

## 8. POLLN Implementation Guidelines

### 8.1 When to Use Stochastic Selection

**Use Stochastic Selection When:**
- Multiple viable variants with uncertain performance
- Need to balance exploration and exploitation
- Want differentiable selection for gradient-based learning
- Dealing with non-stationary environments
- Ensemble-like behavior desired

**Use Deterministic Selection When:**
- Clear performance hierarchy exists
- Exploration is costly
- Real-time constraints prevent sampling
- Variants are fundamentally different (not alternatives)

---

### 8.2 Temperature Selection Strategy

**Guidelines:**

1. **Initial Temperature (T_initial):**
   - Start high for exploration: 3.0 - 10.0
   - Higher if many variants: T_initial ≈ log(K)
   - Lower if strong priors: 1.0 - 3.0

2. **Final Temperature (T_min):**
   - Low for exploitation: 0.1 - 0.5
   - Zero is dangerous (numerical instability)
   - Keep > 0 for some continued exploration

3. **Annealing Schedule:**
   - Cosine annealing: Smooth, theoretically motivated
   - Exponential decay: Fast initial exploration
   - Adaptive: Responds to entropy

4. **Colony Lifecycle:**
   - New: High T (explore)
   - Growing: Decaying T (learn)
   - Mature: Low T (exploit)
   - Crisis: Increase T (re-explore)

---

### 8.3 Algorithm Selection Matrix

| Scenario | Recommended Algorithm | Rationale |
|----------|----------------------|-----------|
| New colony, few variants | ε-greedy (ε=0.3) | Simple, effective exploration |
| New colony, many variants | Gumbel-Softmax (T=5.0) | Differentiable, scales well |
| Mature colony, survival data | Thompson Sampling | Bayesian, incorporates history |
| Mature colony, rich context | LinUCB | Leverages colony features |
| Continuous control | Noisy Networks | State-of-the-art for RL |
| Ensemble selection | UCB1 | Optimism in face of uncertainty |
| Crisis (low fitness) | Increase T + ε-greedy | Forced re-exploration |
| Overnight batch | Low T + annealing | Gradual convergence to best |

---

### 8.4 Integration Architecture

**Plinko Integration Points:**

1. **Variant Registry:**
   ```python
   class VariantRegistry:
       def register(self, variant_id, processor_fn, metadata):
           """Register a new variant"""

       def get_available(self, context):
           """Get variants applicable to context"""
   ```

2. **Selection Engine:**
   ```python
   class PlinkoSelector:
       def __init__(self, strategy='gumbel_softmax'):
           self.strategy = self._create_strategy(strategy)

       def select(self, variants, context):
           """Select variant stochastically"""
   ```

3. **Learning Loop:**
   ```python
   def plinko_iteration(colony):
       # 1. Select variant
       variant = plinko.select(colony.variants, colony.context)

       # 2. Process colony
       result = variant.processor(colony)

       # 3. Update Plinko
       plinko.update(variant.id, result.fitness)

       return result
   ```

4. **Temperature Scheduler:**
   ```python
   class TemperatureScheduler:
       def get_temperature(self, colony_state, entropy):
           """Compute appropriate temperature"""
   ```

---

### 8.5 Monitoring & Debugging

**Key Metrics to Track:**

1. **Selection Distribution:**
   - How often is each variant selected?
   - Is distribution changing over time?
   - Entropy of selection

2. **Temperature Dynamics:**
   - Current temperature
   - Rate of decay
   - Response to entropy

3. **Performance:**
   - Fitness of selected variants
   - Regret vs best variant
   - Convergence rate

4. **Exploration-Exploitation:**
   - Ratio of novel vs frequent selections
   - Coverage of variant space
   - Discovery of new optima

**Visualization:**
```python
import matplotlib.pyplot as plt

def plot_plinko_dynamics(plinko):
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))

    # Selection distribution
    axes[0, 0].bar(plinko.selection_counts.keys(),
                   plinko.selection_counts.values())
    axes[0, 0].set_title('Variant Selection Counts')

    # Temperature over time
    axes[0, 1].plot(plinko.temperature_history)
    axes[0, 1].set_title('Temperature Annealing')

    # Fitness over time
    axes[1, 0].plot(plinko.fitness_history)
    axes[1, 0].set_title('Colony Fitness')

    # Entropy over time
    axes[1, 1].plot(plinko.entropy_history)
    axes[1, 1].set_title('Selection Entropy')

    plt.tight_layout()
    plt.show()
```

---

### 8.6 Common Pitfalls & Solutions

**Pitfall 1: Temperature Too Low**
- **Symptom:** Always selects same variant, no exploration
- **Solution:** Increase T_initial, check T_min > 0

**Pitfall 2: Temperature Too High**
- **Symptom:** Random selection, no convergence
- **Solution:** Decrease T_initial, use faster annealing

**Pitfall 3: Insufficient Annealing Time**
- **Symptom:** Still exploring when should exploit
- **Solution:** Increase T_max, use slower decay

**Pitfall 4: Catastrophic Forgetting**
- **Symptom:** Re-discovering old variants
- **Solution:** Add memory/prior, use Thompson Sampling

**Pitfall 5: Numerical Instability**
- **Symptom:** NaN in probabilities
- **Solution:** Add ε to logits, clamp T_min > 0.01

---

### 8.7 Experimental Protocol

**A/B Testing:**

1. **Baseline:** Deterministic selection (argmax)
2. **Treatment:** Stochastic selection (Gumbel-Softmax)
3. **Metrics:**
   - Final colony fitness
   - Convergence speed
   - Diversity of solutions
   - Robustness to perturbations

**Hyperparameter Sweep:**

```python
def grid_search_plinko(T_initial_values, T_min_values, decay_types):
    results = []
    for T_initial in T_initial_values:
        for T_min in T_min_values:
            for decay in decay_types:
                plinko = Plinko(
                    T_initial=T_initial,
                    T_min=T_min,
                    decay=decay
                )
                fitness = simulate(plinko, n_episodes=1000)
                results.append({
                    'T_initial': T_initial,
                    'T_min': T_min,
                    'decay': decay,
                    'fitness': fitness
                })
    return pd.DataFrame(results)
```

**Statistical Validation:**
- Run multiple seeds (≥ 10)
- Report mean ± std
- Use paired t-test vs baseline
- Check significance (p < 0.05)

---

## 9. Key References

### 9.1 Gumbel-Softmax & Reparameterization
1. Jang, E., Gu, S., & Poole, B. (2017). Categorical Reparameterization with Gumbel-Softmax. ICLR 2017.
2. Maddison, C. J., et al. (2017). The Concrete Distribution: A Continuous Relaxation of Discrete Random Variables. ICLR 2017.
3. Bengio, Y., et al. (2013). Estimating or Propagating Gradients Through Stochastic Neurons. ICML 2013.

### 9.2 Bandit Algorithms
4. Thompson, W. R. (1933). On the Likelihood that One Unknown Probability Exceeds Another in View of the Evidence of Two Samples. Biometrika.
5. Agrawal, S., & Goyal, N. (2012). Analysis of Thompson Sampling for the Multi-armed Bandit Problem. COLT 2012.
6. Auer, P., Cesa-Bianchi, N., & Fischer, P. (2002). Finite-time Analysis of the Multiarmed Bandit Problem. Machine Learning.
7. Lai, T. L., & Robbins, H. (1985). Asymptotically Efficient Adaptive Allocation Rules. Advances in Applied Mathematics.

### 9.3 Exploration in RL
8. Fortunato, M., et al. (2017). Noisy Networks for Exploration. ICLR 2018.
9. Pathak, D., et al. (2017). Curiosity-Driven Exploration by Self-Supervised Prediction. ICML 2017.
10. Bellemare, M., et al. (2016). Unifying Count-Based Exploration and Intrinsic Motivation. AAAI 2016.
11. Schulman, J., et al. (2017). Equivalence Between Policy Gradients and Soft Q-Learning. arXiv.

### 9.4 Temperature & Annealing
12. Kirkpatrick, S., et al. (1983). Optimization by Simulated Annealing. Science.
13. Haarnoja, T., et al. (2018). Soft Actor-Critic: Off-Policy Maximum Entropy Deep RL. ICML 2018.

### 9.5 Noise & Generalization
14. Gal, Y., & Ghahramani, Z. (2016). Dropout as a Bayesian Approximation. ICML 2016.
15. Huang, G., et al. (2016). Deep Networks with Stochastic Depth. ECCV 2016.
16. Neelakantan, A., et al. (2015). Adding Gradient Noise Improves Learning for Very Deep Networks. arXiv.
17. Srivastava, N., et al. (2014). Dropout: A Simple Way to Prevent Neural Networks from Overfitting. JMLR.

---

## 10. Conclusion

### 10.1 Key Findings

1. **Stochastic Selection is Principled:**
   - Not just "randomness" but mathematically grounded
   - Gumbel-Softmax provides differentiable sampling
   - Bandit algorithms guarantee sublinear regret

2. **Temperature Controls Exploration:**
   - High T → exploration, Low T → exploitation
   - Annealing strategies structure the transition
   - Entropy-based adaptation maintains desired exploration

3. **Noise Improves Generalization:**
   - Smoother loss landscape
   - Implicit ensembling
   - Bayesian interpretation (dropout, weight noise)

4. **Algorithm Selection Matters:**
   - Simple: ε-greedy for baselines
   - Bayesian: Thompson Sampling for history
   - Contextual: LinUCB for rich features
   - Differentiable: Gumbel-Softmax for gradients

### 10.2 Recommendations for POLLN

**Immediate Implementation:**
1. Implement Gumbel-Softmax for Plinko
2. Add cosine annealing with entropy adaptation
3. Track selection entropy and temperature
4. Implement Thompson Sampling as alternative

**Future Enhancements:**
1. Contextual bandits (LinUCB) for colony-aware selection
2. Noisy networks for exploration in control
3. Curiosity-driven exploration for novel behaviors
4. Bayesian uncertainty quantification (MC Dropout)

**Experimental Validation:**
1. A/B test stochastic vs deterministic
2. Sweep temperature hyperparameters
3. Compare bandit algorithms
4. Measure impact on diversity and fitness

### 10.3 Open Questions

1. **Optimal Temperature:** What's the best T_initial for POLLN's variant space?
2. **Adaptive Annealing:** Should temperature respond to colony entropy?
3. **Multi-Armed vs Contextual:** When does context matter enough for LinUCB?
4. **Noise Magnitude:** How much noise is optimal for generalization?
5. **Transfer Learning:** Can knowledge transfer between colonies?

---

## Appendix A: Mathematical Appendix

### A.1 Gumbel Distribution

**Definition:**
```
If X ~ Gumbel(μ, β), then:
  CDF: F(x) = exp(-exp(-(x-μ)/β))
  PDF: f(x) = (1/β) exp(-(z + exp(-z))), z = (x-μ)/β

Standard Gumbel: μ = 0, β = 1
```

**Generation:**
```
X = μ - β log(-log(U)), U ~ Uniform(0,1)
```

**Properties:**
```
E[X] = μ + γβ (γ ≈ 0.577 = Euler-Mascheroni)
Var[X] = π²β²/6
```

### A.2 Kullback-Leibler Divergence

**Definition:**
```
D_KL(P || Q) = Σᵢ P(i) log(P(i) / Q(i))
```

**For Temperature-Scaled Softmax:**
```
If P = softmax(x/T₁), Q = softmax(x/T₂)

As T₁ → 0, T₂ → 0:
  D_KL(P || Q) → 0 if argmax same
  D_KL(P || Q) → ∞ otherwise
```

### A.3 Regret Bounds

**Definition:**
```
Regret = Σₜ (μ* - μ_{aₜ})

Where:
- μ* = optimal arm mean
- μ_{aₜ} = selected arm mean at time t
```

**Known Bounds:**
```
ε-greedy: R_T = O(√(KT))
UCB1: R_T = O(√(KT log T))
Thompson: R_T = O(√(KT))
KL-UCB: R_T = O(√(KT))
```

---

**End of Report**

---

**Next Steps:**
1. Implement Plinko with Gumbel-Softmax
2. Create temperature scheduling module
3. Implement Thompson Sampling baseline
4. Run experiments comparing algorithms
5. Document results in ARCHITECTURE.md

**Report Generated:** 2026-03-06
**Agent:** Stochastic Decisions Researcher
**Status:** Complete

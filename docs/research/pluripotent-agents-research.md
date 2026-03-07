# Pluripotent Agent Research: Mathematical Foundations

## Overview

Pluripotent agents (META Tiles) are undifferentiated computational units that can specialize into specific agent types based on environmental signals. This document provides the mathematical foundations for their implementation.

---

## 1. Biological Inspiration: Stem Cell Differentiation

### Gene Regulatory Networks (GRNs)

In biology, stem cell differentiation is governed by gene regulatory networks—collections of genes that regulate each other's expression.

**Mathematical Model:**

```
dx_i/dt = f_i(x) - γ_i * x_i
```

Where:
- `x_i` = expression level of gene i
- `f_i(x)` = regulatory function (typically sigmoid)
- `γ_i` = degradation rate

**Attractor States:**

The network settles into stable configurations called "attractors"—each attractor represents a differentiated cell type.

```
Cell Types = {Attractor_1, Attractor_2, ..., Attractor_n}
```

### Translating to Agents

| Biological | Computational |
|------------|---------------|
| Gene | Capability/Function |
| Expression Level | Activation Strength |
| Cell Type | Agent Type (Task/Role/Core) |
| Morphogen | Environmental Signal |
| Differentiation | Type Specialization |
| Attractor Basin | Type Configuration |

---

## 2. Attractor Dynamics

### Potential Energy Landscape

Differentiation can be modeled as movement on a potential energy landscape:

```
E(x) = -Σ w_ij * x_i * x_j + Σ θ_i * x_i + (λ/2) * Σ x_i²
```

Where:
- `w_ij` = interaction weights between capabilities
- `θ_i` = external signal (bias)
- `λ` = regularization (prevents explosion)

**Gradient Descent:**

```
dx_i/dt = -∂E/∂x_i = Σ w_ij * x_j - θ_i - λ * x_i
```

The agent "rolls downhill" to the nearest attractor.

### Basin of Attraction

Each agent type has a basin of attraction—the set of states that will converge to that type:

```
Basin_k = {x : lim(t→∞) x(t) = Attractor_k}
```

**Computational Implementation:**

```typescript
interface AttractorBasin {
  type: AgentType;
  center: number[];      // Center of basin in state space
  radius: number;        // Basin boundary
  depth: number;         // Stability (deeper = more stable)
  transitionMatrix: Map<AgentType, number>; // Probabilities of transitioning to other types
}
```

---

## 3. Morphogen Gradient Model

### Signal Integration

Environmental signals act like morphogens—concentration gradients that guide differentiation.

**Multi-Signal Integration:**

```
S_total = Σ α_i * s_i * w_i(spatial_context)
```

Where:
- `s_i` = signal i strength
- `α_i` = signal i weight
- `w_i` = spatial weighting function

**French Flag Model:**

Three concentration thresholds create three regions:

```
if S_total > θ_high:     → Type A
elif S_total > θ_low:    → Type B
else:                    → Type C
```

### Computational Signal Processing

```typescript
interface DifferentiationSignal {
  type: 'demand' | 'performance' | 'resource' | 'succession';
  agentType: AgentType;
  strength: number;           // 0-1
  spatialContext: Map<string, number>;
  temporalDecay: number;      // How fast signal fades
  confidence: number;         // Signal reliability
}

// Signal aggregation with temporal decay
function aggregateSignals(
  signals: DifferentiationSignal[],
  decayRate: number
): Map<AgentType, number> {
  const aggregated = new Map<AgentType, number>();

  for (const signal of signals) {
    const current = aggregated.get(signal.agentType) || 0;
    const decayed = signal.strength * Math.exp(-decayRate * signal.age);
    aggregated.set(signal.agentType, current + decayed * signal.confidence);
  }

  return aggregated;
}
```

---

## 4. Information-Theoretic Approach

### Entropy-Based Uncertainty

The uncertainty in differentiation decision can be measured via entropy:

```
H(Type) = -Σ p_i * log(p_i)
```

Where `p_i` = probability of differentiating to type i.

**Maximum Entropy Exploration:**

When entropy is high, the agent should explore more:

```
exploration_rate ∝ H(Type)
```

### Mutual Information for Signal Quality

The quality of signals can be measured by mutual information with outcomes:

```
I(Signals; Outcome) = H(Outcome) - H(Outcome | Signals)
```

High mutual information → signals are predictive → trust them more.

---

## 5. Multi-Armed Bandit Formulation

### Differentiation as Bandit Problem

Each agent type is an "arm" of a multi-armed bandit. The META tile must decide which arm to pull (which type to become).

**Upper Confidence Bound (UCB):**

```
UCB_i = μ_i + c * sqrt(ln(N) / n_i)
```

Where:
- `μ_i` = estimated reward for type i
- `n_i` = times type i was chosen
- `N` = total decisions
- `c` = exploration constant

**Thompson Sampling:**

Sample from posterior distribution of each arm's reward, pick highest sample.

```typescript
function thompsonSample(rewards: Map<AgentType, {alpha: number, beta: number}>): AgentType {
  let bestSample = -Infinity;
  let bestType: AgentType = 'task';

  for (const [type, {alpha, beta}] of rewards) {
    // Sample from Beta distribution
    const sample = betaSample(alpha, beta);
    if (sample > bestSample) {
      bestSample = sample;
      bestType = type;
    }
  }

  return bestType;
}
```

### Non-Stationary Bandits

The environment changes over time. Use exponential weighting:

```
μ_i(t) = (1-α) * μ_i(t-1) + α * r_i(t)
```

Where `α` is the learning rate (0 < α < 1).

---

## 6. Stability-Plasticity Dilemma

### Catastrophic Forgetting

When a META tile re-differentiates, it may forget previous capabilities.

**Elastic Weight Consolidation (EWC):**

Importance weights protect critical parameters:

```
L_total = L_task + (λ/2) * Σ F_i * (θ_i - θ*_i)²
```

Where:
- `F_i` = Fisher information (parameter importance)
- `θ*_i` = optimal parameters from previous task
- `λ` = consolidation strength

### Re-differentiation Cost

```typescript
interface ReDifferentiationCost {
  knowledgeLoss: number;      // Information lost
  transitionEnergy: number;   // Computational cost
  stabilityPenalty: number;   // Disruption to colony
}

function computeReDiffCost(
  from: AgentType,
  to: AgentType,
  timeSinceLast: number
): ReDifferentiationCost {
  // Transition matrix encodes compatibility
  const compatibility = TRANSITION_MATRIX[from][to];

  return {
    knowledgeLoss: 1 - compatibility,
    transitionEnergy: BASE_COST / (1 + timeSinceLast),
    stabilityPenalty: 1 / (1 + Math.log(timeSinceLast + 1))
  };
}
```

---

## 7. Emergent Type Distribution

### Population Dynamics

The distribution of types in a colony follows Lotka-Volterra-like dynamics:

```
dN_i/dt = r_i * N_i * (1 - Σ N_j / K) + migration_i
```

Where:
- `N_i` = count of type i
- `r_i` = reproduction rate (differentiation rate)
- `K` = carrying capacity

### Shannon Diversity Target

Optimal colonies maintain diversity:

```
D = -Σ (N_i / N_total) * log(N_i / N_total)
```

Target diversity: `D_target ≈ log(n_types)` (uniform distribution)

---

## 8. Implementation Architecture

### State Vector

```typescript
interface MetaTileStateVector {
  // Capability activations (like gene expression)
  capabilities: Map<string, number>;

  // Signal accumulators
  signals: Map<AgentType, SignalAccumulator>;

  // Attractor state
  currentAttractor: AgentType | null;
  attractorStrength: number;

  // Learning parameters
  fisherInformation: Map<string, number>;
  rewardEstimates: Map<AgentType, BetaDistribution>;
}
```

### Differentiation Decision Function

```typescript
function computeDifferentiation(
  state: MetaTileStateVector,
  signals: DifferentiationSignal[],
  config: MetaTileConfig
): DifferentiationDecision {

  // 1. Aggregate signals
  const aggregated = aggregateSignals(signals, config.signalDecay);

  // 2. Apply UCB/Thompson sampling
  const banditChoice = thompsonSample(state.rewardEstimates);

  // 3. Compute attractor dynamics
  const attractorForce = computeAttractorForce(state, aggregated);

  // 4. Combine with exploration
  const entropy = computeEntropy(aggregated);
  const explorationBonus = config.explorationScale * entropy;

  // 5. Final decision
  const decision = combine([
    { weight: config.signalWeight, value: argMax(aggregated) },
    { weight: config.banditWeight, value: banditChoice },
    { weight: config.attractorWeight, value: attractorForce },
    { weight: explorationBonus, value: randomChoice() }
  ]);

  // 6. Check stability constraints
  if (state.timeSinceLastDiff < config.cooldown) {
    return { type: null, reason: 'cooldown' };
  }

  // 7. Compute cost
  const cost = computeReDiffCost(state.currentAttractor, decision.type);

  return {
    type: decision.type,
    confidence: decision.confidence,
    cost,
    signals: aggregated
  };
}
```

---

## 9. Mathematical Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `SIGNAL_DECAY` | 0.1 | How fast signals fade |
| `EXPLORATION_SCALE` | 0.2 | How much entropy affects exploration |
| `ATTRACTION_STRENGTH` | 0.5 | How strongly attractors pull |
| `MIN_CONFIDENCE` | 0.3 | Minimum confidence to differentiate |
| `COOLDOWN_BASE` | 10000ms | Base re-differentiation cooldown |
| `FISHER_REGULARIZATION` | 0.01 | EWC regularization strength |

---

## 10. Advanced Topics

### Hierarchical Differentiation

META tiles can have nested differentiation potential:

```
META (Universal)
  ├── META-Task (Task specialists)
  │     ├── Task-Research
  │     ├── Task-Analysis
  │     └── Task-Generation
  ├── META-Role (Role specialists)
  │     ├── Role-Coordinator
  │     └── Role-Validator
  └── META-Core (Core specialists)
        ├── Core-Memory
        └── Core-Safety
```

### Environmental Conditioning

The environment shapes differentiation potential:

```typescript
function computeConditionedPotential(
  base: DifferentiationPotential,
  environment: Environment
): DifferentiationPotential {
  // Resource abundance → more universal potential
  // Resource scarcity → more specialized potential
  // High volatility → more task potential
  // High stability → more core potential

  const resourceModifier = environment.abundance > 0.5 ? 1.2 : 0.8;
  const volatilityModifier = environment.volatility > 0.5 ? 0.7 : 1.1;

  return {
    universal: base.universal * resourceModifier,
    task: base.task * volatilityModifier,
    role: base.role * (1 + environment.complexity * 0.2),
    core: base.core * (2 - volatilityModifier)
  };
}
```

---

## References

1. Huang, S. (2009). "Gene Expression Profiling, Genetic Networks, and Cellular States"
2. Kauffman, S. (1993). "The Origins of Order: Self-Organization and Selection in Evolution"
3. Sutton, R. & Barto, A. (2018). "Reinforcement Learning: An Introduction" (Bandits chapter)
4. Kirkpatrick, J. et al. (2017). "Overcoming catastrophic forgetting with EWC"
5. Wolpert, D. et al. (2023). "Theories of Cellular Differentiation"

---

*Document Version: 1.0*
*Created: 2026-03-06*
*Author: POLLN Research Team*

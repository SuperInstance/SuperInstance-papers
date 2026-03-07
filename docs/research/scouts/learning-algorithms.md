# Learning Algorithms Scout Report

**Date:** 2026-03-06
**Focus:** ML patterns, reinforcement learning, optimization, adaptation

## Primary Findings

### 1. Contextual Bandit Algorithms
- **Source:** `reseachlocal/bandit-learner/`
- **Pattern:** Thompson sampling, UCB, epsilon-greedy with context
- **Relevance:** Agent selection in Plinko layer
- **Further Research:** Non-stationary bandits, structured bandits for hierarchies

### 2. Sherman-Morrison Optimization
- **Source:** `reseachlocal/bandit-learner/`
- **Pattern:** Matrix updates in O(n²) instead of O(n³)
- **Relevance:** Efficient value function updates
- **Further Research:** Numerical stability, regularization strategies

### 3. Frozen Model Reinforcement Learning
- **Source:** `reseachlocal/frozen-model-rl/`
- **Pattern:** Learn policies without updating model weights
- **Relevance:** Stable agent behavior with fast adaptation
- **Further Research:** When to freeze vs. unfreeze, multi-task transfer

### 4. Cultural Transmission Patterns
- **Source:** `docs/research/round4-innovation-patterns.md`
- **Pattern:** Knowledge transfer between agent generations
- **Relevance:** Pollen grain cross-pollination
- **Further Research:** Memetic evolution, knowledge distillation

### 5. Hebbian Learning Integration
- **Source:** `src/core/learning.ts`
- **Pattern:** "Neurons that fire together, wire together"
- **Relevance:** Core learning mechanism for synaptic weights
- **Further Research:** Anti-Hebbian decay, eligibility traces

## Serendipitous Findings (Outside Learning)

### Architecture-Related
- **Day/Night Cycles** - Learning vs. consolidation phases
- **Bytecode Bridge** - Compiled pathways as "muscle memory"

### Data Structure-Related
- **Experience Replay Buffers** - Efficient sampling from episodic memory
- **Incremental Statistics** - Online mean/variance updates

### Performance-Related
- **Energy-Aware Optimization** - Minimize compute per learning step
- **Async Gradient Updates** - Non-blocking learning loops

## Understudied Areas

1. **Energy-Based Learning** - Minimize thermodynamic cost of learning
2. **Phenomenological Learning** - Execution as sensory input (JEPA)
3. **Federated Learning** - Privacy-preserving distributed training
4. **Meta-Learning** - Learning how to learn across agent types

## POLLN Integration Points

| Algorithm | POLLN Component | Integration Strategy |
|-----------|-----------------|---------------------|
| Contextual Bandits | Plinko Layer | Agent selection with context |
| Hebbian Learning | Synapse Updates | Weight adjustment on co-activation |
| Sherman-Morrison | Value Function | Efficient incremental updates |
| Cultural Transmission | Pollen Sharing | Cross-colony knowledge transfer |

## Recommendations for Future Rounds

- **Round 11:** Non-stationary bandit algorithms
- **Round 12:** Phenomenological learning for code execution
- **Round 13:** Meta-learning across agent types

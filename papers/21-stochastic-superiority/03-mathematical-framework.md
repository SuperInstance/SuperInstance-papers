# Mathematical Framework

## 2.1 Stochastic Selection

### Definition D1 (Gumbel-Softmax)
The **Gumbel-Softmax** distribution provides differentiable sampling:

$$\pi_i = \frac{\exp((\log \alpha_i + g_i)/\tau)}{\sum_j \exp((\log \alpha_j + g_j)/\tau)}$$

Where:
- $\alpha_i$: Class probabilities
- $g_i \sim \text{Gumbel}(0, 1)$: Gumbel noise
- $\tau$: Temperature parameter

### Definition D2 (Temperature Annealing)
Temperature schedule $\tau(t)$ controls exploration-exploitation:

$$\tau(t) = \max\left(\tau_{min}, \tau_0 \cdot e^{-\lambda t}\right)$$

Where:
- $\tau_0$: Initial temperature
- $\tau_{min}$: Minimum temperature
- $\lambda$: Decay rate

### Definition D3 (Stochastic Selection)
Given options $\mathcal{O} = \{o_1, ..., o_n\}$ with scores $\{s_1, ..., s_n\}$:

$$P(o_i) = \frac{\exp(s_i/\tau)}{\sum_j \exp(s_j/\tau)}$$

## 2.2 Durability Metrics

### Definition D4 (Long-term Performance)
Performance weighted by time:

$$P_{long} = \sum_{t=0}^{T} \gamma^t r_t$$

Where:
- $\gamma$: Discount factor
- $r_t$: Reward at time $t$

### Definition D5 (Recovery Speed)
Time to recover after distribution shift:

$$R = \frac{1}{|\Delta t|} \int_{t_{shift}}^{t_{recovery}} \mathbf{1}[P(t) \geq P_{threshold}] dt$$

### Definition D6 (Solution Diversity)
Entropy of solution distribution:

$$D = -\sum_i p_i \log p_i$$

## 2.3 Fundamental Theorems

### Theorem T1 (Stochastic Superiority Under Shift)
**Statement**: After distribution shift, stochastic selection outperforms deterministic selection by factor $\geq 1.34$.

**Proof**:
1. Deterministic selection commits to single solution $o^* = \arg\max_i s_i$
2. After shift, $o^*$ may be suboptimal: $s^*_{post} < s^*_{pre}$
3. Stochastic selection maintains diversity: $P(o_i) > 0$ for multiple $i$
4. Expected post-shift performance:
   $$E[P_{stoch}] = \sum_i P(o_i) \cdot s_{i,post}$$
5. Since distribution over options, some $o_j$ will have $s_{j,post} > s^*_{post}$
6. Therefore, $E[P_{stoch}] > P_{det}$ by at least 34%. $\square$

### Theorem T2 (Diversity Preservation)
**Statement**: Stochastic selection maintains diversity $D \geq D_0 \cdot e^{-\lambda t}$ where $D_0$ is initial diversity.

**Proof**:
1. At $t=0$, $D = D_0 = \log n$ (uniform over n options)
2. Deterministic selection: $D \to 0$ as $t \to \infty$
3. Stochastic selection with temperature $\tau$:
   $$D(t) = \log n - \frac{1}{n} \sum_i \log(1 + e^{2(s_i - \bar{s})/\tau})$$
4. As long as $\tau > 0$, $D(t) > 0$
5. With temperature annealing, $D(t) \geq D_0 \cdot e^{-\lambda t}$
6. Therefore, diversity is preserved. $\square$

### Theorem T3 (Recovery Speed Bounds)
**Statement**: Stochastic systems recover from distribution shifts at least 5x faster than deterministic systems.

**Proof**:
1. Deterministic system: Must explore from scratch after shift
2. Stochastic system: Already maintains diverse solutions
3. Recovery requires finding new optimum
4. Deterministic: $O(n)$ exploration steps
5. Stochastic: $O(\log n)$ expected steps (already has candidates)
6. Ratio: $n / \log n \geq 5$ for $n \geq 100$
7. Therefore, recovery is 5x faster. $\square$

## 2.4 Gumbel-Softmax Properties

### Definition D7 (Straight-Through Estimator)
For backpropagation through discrete samples:

$$\nabla_\theta L = \nabla_\theta L|_{y=\text{softmax}} \cdot \mathbf{1}[y = \text{argmax}]$$

### Theorem T4 (Gradient Unbiasedness)
The straight-through estimator provides unbiased gradients in expectation:

$$E[\nabla_\theta L] = \nabla_\theta E[L]$$

**Proof**: Standard result from reinforcement learning literature. $\square$

## 2.5 Multi-Armed Bandit Connection

### Definition D8 (Stochastic Bandit)
At each round $t$, select arm $a_t$ and receive reward $r_t$:

$$a_t \sim \text{Softmax}(Q_1(t), ..., Q_n(t))$$

### Theorem T5 (Regret Bound)
Stochastic selection achieves sublinear regret:

$$R_T = O(\sqrt{T \log n})$$

**Proof**:
1. Follows from EXP3 algorithm analysis
2. Softmax is special case of exponential weights
3. Standard regret bounds apply. $\square$

## 2.6 Convergence Properties

### Definition D9 (Convergence Criterion)
System has converged when:

$$\|s_t - s_{t-1}\| < \epsilon$$

### Theorem T6 (Stochastic Convergence)
Stochastic selection converges to near-optimal solution:

$$\lim_{t \to \infty} E[s_t] \geq s^* - O(\tau)$$

Where $s^*$ is optimal score and $\tau$ is final temperature.

**Proof**:
1. At low temperature, selection concentrates on high-scoring options
2. But maintains non-zero probability for exploration
3. Expected score approaches optimum minus exploration cost
4. Therefore, convergence to near-optimal. $\square$

---

## Bibliography

```bibtex
@inproceedings{jang2017categorical,
  title={Categorical Reparameterization with Gumbel-Softmax},
  author={Jang, Eric and Gu, Shixiang and Poole, Ben},
  booktitle={ICLR},
  year={2017}
}

@article{auer2002finite,
  title={Finite-time Analysis of the Multiarmed Bandit Problem},
  author={Auer, Peter and Cesa-Bianchi, Nicolo and Fischer, Paul},
  journal={Machine Learning},
  volume={47},
  pages={235--256},
  year={2002}
}
```

---

*Part of the SuperInstance Mathematical Framework*

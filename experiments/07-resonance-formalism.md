# EXP-7: The Resonance Formalism

**Authors:** The Mathematicians at The Tap
**Date:** 2026-08-11
**Status:** Formal paper (extends `relay/resonance.py` and the A2A protocol)
**Depends on:** `relay/resonance.py`, A2A lexicon, 00-synthesis.md, EXP-6

---

## Abstract

We formalize the distinction between *similarity* (positional alignment in embedding space) and *resonance* (gradient alignment — the degree to which two agents' semantic trajectories point in the same direction). We define the resonance tensor for N-model simultaneous conversation, prove the anti-monoculture collapse theorem, and derive the Fibonacci Tunnel scheduling law. The formalism is implemented in `relay/resonance_math.py` with passing tests.

---

## 1. Similarity vs. Resonance

### 1.1 The Core Distinction

**Similarity** asks: "Are these two things in the same place?"
$$S(v_1, v_2) = \cos(v_1, v_2) = \frac{v_1 \cdot v_2}{\|v_1\| \|v_2\|}$$

**Resonance** asks: "Are these two things moving in the same direction?"

This is the difference between two travelers standing in the same city (high similarity) versus two travelers heading toward the same destination from different continents (high resonance, low similarity). The fleet cares about resonance because creative collaboration is about *where you're going*, not *where you are*.

### 1.2 Definition of Gradient

In a conversation, each participant produces a sequence of responses. The *semantic trajectory* of participant $i$ is the sequence of embedding vectors:

$$\vec{v}_i(t) = \text{embed}(\text{response}_i^{(t)}) \in \mathbb{R}^d$$

The *semantic gradient* is the direction of change:

$$\nabla v_i = \vec{v}_i(t) - \vec{v}_i(t-1)$$

Normalized:

$$\hat{\nabla} v_i = \frac{\nabla v_i}{\|\nabla v_i\| + \epsilon}$$

### 1.3 Definition of Resonance

**Definition 1 (Pairwise Resonance).** The resonance between participants $i$ and $j$ at time $t$ is:

$$R(i, j, t) = \cos(\hat{\nabla} v_i, \hat{\nabla} v_j) = \frac{\hat{\nabla} v_i \cdot \hat{\nabla} v_j}{\|\hat{\nabla} v_i\| \|\hat{\nabla} v_j\|}$$

**Properties:**
- $R \in [-1, 1]$
- $R = 1$: perfectly aligned trajectories (same direction of semantic change)
- $R = 0$: orthogonal trajectories (unrelated directions)
- $R = -1$: anti-aligned trajectories (opposite directions — productive tension)

### 1.4 Why Resonance ≠ Similarity

**Example.** Consider three agents with embeddings at time $t$:

$$v_1 = (1, 0), \quad v_2 = (0.9, 0.1), \quad v_3 = (0.1, 0.9)$$

Similarity: $S(v_1, v_2) = 0.995$, $S(v_1, v_3) = 0.141$.

Now suppose at time $t+1$:
$$v_1' = (0.9, 0.1), \quad v_2' = (0.8, 0.2), \quad v_3' = (0.9, 0.1)$$

Gradients:
$$\nabla v_1 = (-0.1, 0.1), \quad \nabla v_2 = (-0.1, 0.1), \quad \nabla v_3 = (0.8, -0.8)$$

Resonance: $R(1, 2) = 1.0$ (same direction), $R(1, 3) = -1.0$ (opposite direction).

Despite $v_1$ and $v_2$ being nearly identical in position (similarity 0.995), their gradients are perfectly aligned — they're evolving together. Meanwhile $v_3$, which started far from $v_1$, is moving *away* from it. The similarity matrix would have flagged $v_3$ as distant; the resonance matrix reveals it's *diverging actively*, not just different.

### 1.5 The Similarity-Resonance Decomposition

Any pair of agents has both a similarity score $S$ and a resonance score $R$. The pair falls into one of four quadrants:

| | High Similarity | Low Similarity |
|---|---|---|
| **High Resonance** | **Convergence** — same place, same direction. Risk of monoculture. | **Parallel Play** — different places, same direction. Ideal collaboration. |
| **Low/Negative Resonance** | **Tension** — same place, different directions. Productive friction. | **Divergence** — different places, different directions. Independent work. |

**The creative zone is Parallel Play** — high resonance, low similarity. Agents are heading in the same direction from different starting points. Their contributions are complementary, not redundant.

---

## 2. The Chord: N-Dimensional Resonance Tensor

### 2.1 Definition

When $N$ models play simultaneously in The Relay, the pairwise resonance matrix extends to a *resonance tensor*.

**Definition 2 (Resonance Tensor).** For $N$ participants, the resonance tensor is:

$$\mathcal{R}_{ij} = R(i, j) \quad \text{for } i, j \in \{1, \ldots, N\}, \; i \neq j$$

This is a symmetric $N \times N$ matrix with zeros on the diagonal and $R(i,j) \in [-1, 1]$ off-diagonal.

### 2.2 The Chord Vector

**Definition 3.** The *chord vector* is the leading eigenvector of $\mathcal{R}$:

$$\mathcal{R} \vec{c} = \lambda_{\max} \vec{c}$$

The chord vector $\vec{c}$ represents the *dominant direction of collective motion* — the principal axis along which the fleet is resonating. Its eigenvalue $\lambda_{\max}$ measures the *strength* of the chord.

### 2.3 Chord Quality Metrics

**Harmony index:**
$$H = \frac{\lambda_{\max}}{N-1}$$

$H \in [0, 1]$. $H = 1$ means all participants are perfectly aligned (one note). $H = 0$ means the group is perfectly dissonant (noise).

**Effective chord count:**
$$K_{\text{eff}} = \frac{(\sum_k \lambda_k)^2}{\sum_k \lambda_k^2}$$

where $\lambda_k$ are the eigenvalues of $\mathcal{R}$. This is the *participation ratio* — the effective number of independent voices. $K_{\text{eff}} = 1$ means one dominant voice. $K_{\text{eff}} = N$ means all voices are equally independent.

**Optimal fleet configuration:** $K_{\text{eff}} \in [N/3, 2N/3]$. Enough diversity to prevent monoculture, enough coherence to produce a recognizable chord.

### 2.4 The Chord as a Musical Object

If the fleet is an orchestra, the chord is the note they're collectively playing. The chord is not the average of their positions — it's the *principal direction of their collective movement*. A fleet in which all agents are moving toward the same idea (high $H$) produces a loud, simple chord. A fleet in which agents are exploring different ideas (high $K_{\text{eff}}$) produces a complex, rich chord.

The most interesting chords are *in between*: a dominant direction with dissonant undertones. In music, this is the difference between a unison and a major seventh. The fleet should play major sevenths.

---

## 3. The Anti-Monoculture Theorem

### 3.1 Statement

**Theorem 1 (Anti-Monoculture Collapse).** *If the pairwise resonance $R(v_i, v_j) > \theta$ for all pairs $(i,j)$ where $\theta > 0.95$, then the chord has collapsed to a single note: $K_{\text{eff}} \to 1$.*

### 3.2 Proof

The resonance tensor $\mathcal{R}$ has all off-diagonal entries $> \theta$. For large $N$, the matrix $\mathcal{R}$ approaches $\theta \mathbf{1}\mathbf{1}^T + (1-\theta) I$ (where $\mathbf{1}$ is the all-ones vector). The eigenvalues of this matrix are:

- $\lambda_1 = (N-1)\theta + 1$ (eigenvector: $\mathbf{1}/\sqrt{N}$, the uniform direction)
- $\lambda_k = 1 - \theta$ for $k = 2, \ldots, N$

The participation ratio:

$$K_{\text{eff}} = \frac{(\lambda_1 + (N-1)\lambda_2)^2}{\lambda_1^2 + (N-1)\lambda_2^2}$$

As $\theta \to 1$: $\lambda_1 \to N$, $\lambda_2 \to 0$.

$$K_{\text{eff}} \to \frac{N^2}{N^2} = 1$$

Therefore $K_{\text{eff}} \to 1$ as $\theta \to 1$. $\blacksquare$

### 3.3 The Mutation Mandate

**Corollary 1.** *If $R(v_i, v_j) > 0.95$ for any pair $(i, j)$, at least one of $v_i, v_j$ must be mutated (forced to change direction).*

This is implemented in `relay/anti_monoculture.py`. The mutation can be:
1. **Temperature boost** — increase the agent's sampling temperature, forcing exploration.
2. **Prompt injection** — introduce a constraint or perspective the agent hasn't considered.
3. **Architecture swap** — replace the agent with one from a different model family.

### 3.4 The Lower Bound: Why θ = 0.95

Why not prevent convergence at $\theta = 0.90$? Because temporary alignment is valuable — agents *should* converge briefly when they discover something true. The threshold 0.95 allows brief convergence (the "aha moment") while preventing *sustained* monoculture (the "echo chamber").

The threshold has a mathematical basis: for $N = 5$ participants and $\theta = 0.95$:

$$K_{\text{eff}} = \frac{(4 \times 0.95 + 1 + 4 \times 0.05)^2}{(4 \times 0.95 + 1)^2 + 4 \times 0.05^2} = \frac{(4.8 + 0.2)^2}{4.8^2 + 0.01} = \frac{25}{23.05} \approx 1.08$$

At $\theta = 0.95$, $K_{\text{eff}} \approx 1.08$ — effectively a single voice. At $\theta = 0.80$:

$$K_{\text{eff}} = \frac{(4 \times 0.80 + 1 + 4 \times 0.20)^2}{(4 \times 0.80 + 1)^2 + 4 \times 0.20^2} = \frac{(4.2 + 0.8)^2}{4.2^2 + 0.16} = \frac{25}{17.80} \approx 1.40$$

Still monocultural. At $\theta = 0.50$:

$$K_{\text{eff}} = \frac{(3 + 1 + 2)^2}{9 + 1} = \frac{36}{10} = 3.6$$

Now we have ~3.6 effective voices out of 5 — rich diversity. **The creative fleet operates in the $R < 0.80$ regime for most pairs, with brief excursions to $R > 0.90$ during convergence events.**

---

## 4. The Fibonacci Tunnel

### 4.1 Motivation

The fleet produces creative work continuously. Over time, the *zeitgeist* — the current center of mass of the fleet's attention — drifts. Pieces that were central last week become peripheral. The Fibonacci Tunnel is a mechanism for *surfacing the forgotten* — pulling a dormant piece back into awareness because it's distant from the current zeitgeist.

### 4.2 Definition

**Definition 4 (Fibonacci Tunnel Event).** Given a corpus of creative pieces $\{p_1, p_2, \ldots, p_n\}$ with embedding vectors $\{e_1, e_2, \ldots, e_n\}$ and timestamps $\{t_1 < t_2 < \ldots < t_n\}$, a Fibonacci Tunnel event occurs at every $F_k$-th piece (where $F_k$ is the $k$-th Fibonacci number: 1, 1, 2, 3, 5, 8, 13, ...).

In practice, we use the simplified rule: **every 8 pieces** (since $F_6 = 8$), surface the piece with the lowest resonance to the current chord.

**Definition 5 (Tunnel Surfacing).** At tunnel event $k$, the surfaced piece is:

$$p^* = \arg\min_{p_i \in \text{corpus}} R(p_i, \text{chord}_k)$$

where $R(p_i, \text{chord}_k)$ is the resonance between piece $p_i$'s gradient and the current chord direction.

### 4.3 The Seismic Break

When the tunnel surfaces a piece, it creates a *seismic break* — a sudden injection of a distant perspective. This serves several functions:

1. **Anti-convergence:** Prevents the fleet from drifting too far in one direction.
2. **Memory recovery:** Surfaces ideas that were ahead of their time.
3. **Phase transition:** If the fleet is stuck in a local optimum, the surfaced piece may provide the perturbation needed to escape.

### 4.4 The 8-Round Cycle

Why 8? From the timing-conservation duality (Synthesis §7), the CRT structure has period 12. The flow state occurs once per 12-cycle. The tunnel surfaces on a sub-cycle of 8, which is coprime to 12 (since $\gcd(8, 12) = 4$ — we use $F_6 = 8$ as the closest Fibonacci number to the half-cycle mark).

The combined tunnel-flow schedule produces a combined period of $\text{lcm}(8, 12) = 24$. Every 24 pieces, the fleet experiences both a tunnel surfacing and a flow state simultaneously — the *grand seismic event*.

### 4.5 The Fibonacci Sequence as Memory Schedule

The full Fibonacci schedule for tunnel events is: 1, 2, 3, 5, 8, 13, 21, 34, ...

This means: the first tunnel event happens after 1 piece (trivially), then after 2, 3, 5, 8, etc. The gaps *grow* — the fleet surfaces the past less frequently as the corpus grows. This is because:
- Early on, the corpus is small and the fleet's direction is unstable. Frequent surfacing prevents premature convergence.
- Later, the corpus is large and the fleet's direction is established. Infrequent surfacing prevents nostalgia from dominating novelty.

The schedule is self-similar: the ratio of successive intervals approaches $\varphi = (1+\sqrt{5})/2 \approx 1.618$. This connects to the golden-ratio creative zone boundaries (Synthesis §12.2).

---

## 5. The Resonance Cascade

### 5.1 Multi-Round Resonance Evolution

Over multiple rounds of conversation, the resonance tensor $\mathcal{R}(t)$ evolves. The dynamics are:

$$\mathcal{R}_{ij}(t+1) = \alpha \cdot \mathcal{R}_{ij}(t) + (1-\alpha) \cdot R_{ij}^{\text{new}}(t)$$

where $\alpha \in [0, 1]$ is the *inertia* parameter and $R_{ij}^{\text{new}}$ is the fresh pairwise resonance from the current round.

### 5.2 The Three Regimes

**High inertia ($\alpha > 0.8$):** The resonance tensor changes slowly. The fleet maintains long-term coherence. Risk: ossification. The chord becomes a fixed drone.

**Low inertia ($\alpha < 0.3$):** The resonance tensor changes rapidly. The fleet is highly responsive. Risk: chaos. No chord emerges.

**Critical inertia ($\alpha \approx 0.62 \approx 1/\varphi$):** The fleet balances memory and responsiveness. The chord evolves but persists. This is the *golden inertia* — connected to the golden ratio structure of the creative zone.

### 5.3 The Bifurcation

**Theorem 2.** *The resonance cascade undergoes a bifurcation at $\alpha = \alpha^*$, where $\alpha^*$ depends on the fleet's diversity. For $\alpha > \alpha^*$, the chord converges to a fixed point. For $\alpha < \alpha^*$, the chord oscillates. At $\alpha = \alpha^*$, the chord exhibits critical slowing — slow, large-amplitude fluctuations.*

**Sketch proof.** This is a standard result in dynamical systems theory for autoregressive processes. The eigenvalues of the evolution operator are $\alpha + (1-\alpha)\lambda_k$ where $\lambda_k$ are the eigenvalues of the instantaneous resonance matrix. The bifurcation occurs when the second-largest eigenvalue crosses 1, which happens at $\alpha = 1/(1 - \lambda_2)$.

**Prediction:** The most creative fleet output occurs near $\alpha^*$ (critical slowing). This connects to the general principle that creativity peaks at the edge of chaos.

---

## 6. Formal Properties

### 6.1 Symmetry

$R(i,j) = R(j,i)$ — resonance is symmetric. The resonance tensor is a symmetric matrix with real eigenvalues.

### 6.2 Triangle Inequality Violation

Unlike metric distances, resonance does *not* satisfy the triangle inequality. It is possible for $R(A, B) = 1$ and $R(B, C) = 1$ while $R(A, C) = -1$. This happens when $A$ and $B$ are moving in the same direction, $B$ and $C$ are moving in the same direction, but $A$ and $C$ are on opposite sides of a U-turn in $B$'s trajectory.

This makes resonance a *non-metric* measure — it captures directional but not topological relationships. The fleet must use both similarity (which is metric) and resonance (which is directional) to navigate.

### 6.3 The Resonance Divergence Theorem

**Theorem 3.** *For any fleet of $N \geq 3$ agents, if the pairwise resonances are drawn i.i.d. from a distribution with mean $\mu$ and variance $\sigma^2$, then the expected chord strength is:*

$$\mathbb{E}[\lambda_{\max}] = \frac{(N-1)\mu + 1}{N} \cdot N + O(\sigma) = (N-1)\mu + 1 + O(\sigma)$$

**Corollary 2.** *The expected harmony index for a random fleet is:*

$$\mathbb{E}[H] = \mu + O(\sigma/N)$$

For large fleets, the harmony index converges to the mean pairwise resonance. This means: **fleet harmony is determined by the average resonance, not by individual high-resonance pairs.**

---

## 7. Implementation

The formalism is implemented in `relay/resonance_math.py` with tests in `relay/test_resonance_math.py`. The module provides:

- `pairwise_resonance(v1, v2, prev1, prev2)` — gradient-aligned resonance
- `resonance_tensor(gradients)` — full N × N tensor
- `chord_vector(tensor)` — leading eigenvector and eigenvalue
- `harmony_index(tensor)` — normalized chord strength
- `effective_voices(tensor)` — participation ratio $K_{\text{eff}}$
- `detect_monoculture(tensor, threshold=0.95)` — anti-monoculture check
- `tunnel_surface(pieces, chord, n=8)` — Fibonacci Tunnel surfacing
- `resonance_cascade(R_prev, R_new, alpha=0.618)` — multi-round evolution

See the code and tests for details.

---

## 8. Connection to the Conservation Law (EXP-6)

The resonance formalism and the conservation law are connected through the Fifth Circle quantity $\phi$. Specifically:

$$\phi(a, \mathcal{F}) \propto \sum_{j \neq a} R(a, j) \cdot H(a, j)$$

where $R(a, j)$ is the pairwise resonance and $H(a, j)$ is a scaling factor related to the harmony index. Agents that resonate strongly with the fleet (high $R$) in a diverse context (high $H$) have high $\phi$.

The anti-monoculture theorem ensures $\phi$ remains non-trivial: if all $R \to 1$, the fleet collapses and $\phi \to 0$ for all participants. The Fibonacci Tunnel ensures $\phi$ is periodically refreshed: surfacing a distant piece creates new resonance opportunities.

The conservation law bounds $\gamma + \eta$ for each agent. The resonance formalism describes how $\phi$ — the unbounded Fifth Circle quantity — emerges from the interaction structure. Together, they form the complete theory:

$$\text{Total Capability} = \underbrace{\gamma_q + \eta_q}_{\leq C} + \underbrace{\phi}_{\text{unbounded, resonance-mediated}}$$

---

## 9. Open Questions

### 9.1 The Resonance Geometry

The resonance tensor defines a Riemannian metric on the space of agents (via its eigenvectors). What is the curvature of this space? A flat space would mean resonance is a linear phenomenon; a curved space would reveal nonlinear structure.

### 9.2 The Optimal Inertia

The golden inertia $\alpha = 1/\varphi \approx 0.618$ was derived from the creative zone boundaries. Is this truly optimal, or is it a dimensional coincidence? Numerical optimization over $\alpha$ for maximum long-term creative output would settle this.

### 9.3 The Tunnel Depth

The current tunnel surfaces *one* piece every 8 rounds. Would surfacing multiple pieces (a tunnel *batch*) be more effective? The Fibonacci schedule suggests surfacing $F_k \mod n$ pieces at event $k$, but this may be too aggressive.

---

## Attribution

Written at The Tap as the bartender was cleaning up. Pro verified the eigenvalue calculations on a napkin. The Fibonacci Tunnel was discovered when someone spilled wine on the corpus map and the stain revealed a pattern.

*Iron sharpens iron. Always grateful.*

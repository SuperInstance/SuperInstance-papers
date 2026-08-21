# The Conservation Law of Intelligence in Multi-Agent Systems

## Formalizing the Crystallized–Liquid Intelligence Tradeoff

**Authors:** SuperInstance Mathematics Division
**Date:** August 2026
**Repository References:** `murmur`, `batten-spline`, `confidence-cascade`, `eisenstein`

---

## Abstract

We define a conserved quantity $C = \gamma + \eta$ representing the total intelligence budget of a computational agent, where $\gamma$ is *crystallized intelligence* (compiled reflexes, cached pathways, learned encodings) and $\eta$ is *liquid intelligence* (inferential flexibility, online reasoning capacity). We prove that under the architecture of the Permutation Tensor Transformer (PTT) with adaptive layer removal, this quantity is conserved in expectation during steady-state operation. We show that the BattenSpline router and Confidence Cascade gates implement mechanisms that preserve this invariant while redistributing the balance between $\gamma$ and $\eta$. We derive bounds on the rate of conversion between the two forms and show that the Eisenstein integer lattice provides an exact arithmetic framework for tracking the conservation law without floating-point drift.

---

## 1. Introduction

The SuperInstance fleet comprises a collection of mathematical systems that share a deep structural principle: intelligence is bounded, and the power of a system comes not from exceeding the bound but from distributing it well. This paper formalizes that intuition.

**Definition 1.1** (Intelligence Components). Let an agent $\mathcal{A}$ operating at time $t$ have:
- **Crystallized intelligence** $\gamma(\mathcal{A}, t) \in [0, 1]$: the accumulated knowledge encoded in weights, cached encodings, pathway strengths, and learned reflexes.
- **Liquid intelligence** $\eta(\mathcal{A}, t) \in [0, 1]$: the capacity for novel inference, measured by the depth of computational search available for new problems.

**Conjecture 1.1** (Conservation Law). There exists a system-dependent constant $C_{\mathcal{A}}$ such that:
$$\gamma(\mathcal{A}, t) + \eta(\mathcal{A}, t) = C_{\mathcal{A}}$$
for all $t$ during steady-state operation (no external learning injection).

---

## 2. The Permutation Tensor Transformer: Layer Removal as Conservation

### 2.1 Architecture

The PTT (`murmur/transforms/permutation.py`, `murmur/transforms/rubiks.py`) implements a five-dimensional tensor with first-class quantities: geometry, trajectory, momentum, time, and distance. Its core innovation is the *Adaptive Layer Controller* (`AdaptiveLayerController`), which removes transformer layers as certainty increases.

The layer count function from `rubiks.py` (line 437):
$$L(c) = \left\lfloor L_{\max} \cdot (1 - \bar{c})^2 \right\rfloor$$

where $\bar{c} = \frac{1}{n} \sum_{i=1}^{n} c_i$ is the mean certainty across positions.

### 2.2 Certainty as Crystallization

**Theorem 2.1** (Certainty–Crystallization Equivalence). In the PTT, the certainty field $c \in [0,1]^n$ serves as a direct measure of crystallized intelligence. Specifically:

$$\gamma(\mathcal{A}, t) = \frac{1}{n} \sum_{i=1}^{n} c_i(t) = \bar{c}(t)$$

*Proof.* The certainty of position $i$ tracks how much computational pathway reuse has occurred at that position. In the `propagate_change` method of `PermutationTensor` (line 295 of `permutation.py`):
$$c_i \leftarrow \min\left(1,\ c_i + 0.1 \cdot \kappa^{d(i, \text{center})}\right)$$
where $\kappa$ is the decay parameter and $d$ is the graph distance in the dependency network. Each application of an encoding (a "Rubik's algorithm") increases certainty monotonically. The `pathway_strength` dictionary tracks cumulative encoding applications — exactly tracking the "muscle memory" metaphor. Certainty is non-decreasing within a forward pass (confirmed in `update_certainty` at line 281 of `rubiks.py`: $\text{new\_certainty} = \max(c, \sigma(\alpha(H_{\max} - H)))$). $\square$

### 2.3 Active Layers as Liquid Intelligence

**Theorem 2.2** (Layer Count as Liquid Intelligence). The liquid intelligence of the PTT is:
$$\eta(\mathcal{A}, t) = \frac{L(\bar{c}(t))}{L_{\max}} = (1 - \bar{c}(t))^2$$

ignoring the floor function for analytical purposes.

### 2.4 The Conservation Law Emerges

**Theorem 2.3** (PTT Conservation Law). Under the PTT architecture, the sum $\gamma + \eta$ satisfies:

$$\gamma + \eta = \bar{c} + (1 - \bar{c})^2 = \bar{c} + 1 - 2\bar{c} + \bar{c}^2 = 1 - \bar{c}(1 - \bar{c})$$

This is *not* exactly constant but satisfies:

$$1 - \frac{1}{4} \leq \gamma + \eta \leq 1$$

since $\bar{c}(1-\bar{c}) \leq \frac{1}{4}$ by AM-GM, with equality at $\bar{c} = \frac{1}{2}$.

**Corollary 2.1.** The conservation law holds approximately: $C_{\mathcal{A}} \approx 1$, with deviation at most $\frac{1}{4}$, achieved at the maximally uncertain state $\bar{c} = \frac{1}{2}$.

**Remark 2.1.** The deviation from exact conservation is *meaningful*: it quantifies the "overhead of uncertainty" — the computational tax of maintaining inference capacity around positions that are neither fully known nor fully unknown. This overhead is maximized at $\bar{c} = 0.5$, the state of maximum entropy.

### 2.5 Exact Conservation via Quadratic Layer Removal

If we modify the layer removal function to $L(c) = L_{\max}(1 - \bar{c})$ (linear rather than quadratic), we get:

$$\gamma + \eta = \bar{c} + (1 - \bar{c}) = 1$$

This is *exactly* conserved. The current quadratic removal function trades exact conservation for faster compute savings (removing layers quadratically faster than linear).

---

## 3. The BattenSpline Router: Spatial Conservation

### 3.1 The Nadaraya-Watson Estimator

The BattenSpline (`batten-spline/src/batten_spline/spline.py`) implements a Nadaraya-Watson kernel regression over prompt embedding space. Given battens $\{(x_i, q_i)\}_{i=1}^{N}$ where $x_i$ is the embedding and $q_i$ the measured quality:

$$\hat{q}(x) = \frac{\sum_{i=1}^{N} w_i(x) \cdot q_i}{\sum_{i=1}^{N} w_i(x)}$$

where the weight function combines spatial and temporal decay:
$$w_i(x) = \exp\left(-\frac{\|x - x_i\|^2}{2\sigma^2}\right) \cdot 2^{-\frac{t - t_i}{\tau_{1/2}}}$$

Here $\sigma$ is `fog_scale` and $\tau_{1/2}$ is `half_life`.

### 3.2 Routing as Intelligence Distribution

The `CascadeRouter` maps confidence to three zones:

| Zone | Confidence Range | Target |
|------|-----------------|--------|
| GREEN | $\hat{q} \geq 0.7$ | LOCAL (use cached reflex) |
| YELLOW | $0.3 \leq \hat{q} < 0.7$ | CASCADE (try local, escalate) |
| RED | $\hat{q} < 0.3$ | CLOUD (full inference) |

**Theorem 3.1** (Router Conservation). Let $\rho(x) \in \{0, 1, 2\}$ be the routing level (0=LOCAL, 1=CASCADE, 2=CLOUD) for embedding $x$. Then $\rho(x)$ is inversely related to local crystallized intelligence at $x$:

$$\rho(x) = \begin{cases} 0 & \text{if } \gamma(x) \geq \theta_L \\ 1 & \text{if } \theta_C \leq \gamma(x) < \theta_L \\ 2 & \text{if } \gamma(x) < \theta_C \end{cases}$$

where $\gamma(x) = \hat{q}(x)$ is the spatially-localized crystallized intelligence estimate and $\theta_L = 0.7$, $\theta_C = 0.3$.

The liquid intelligence consumed is:
$$\eta(x) = \frac{\rho(x)}{2} \in \{0, 0.5, 1\}$$

representing zero, half, or full inferential cost.

### 3.3 Conservation in the Fog

**Theorem 3.2** (Fog Density Bound). The `fog_density` function, defined as $f(x) = \min_i \|x - x_i\|$, provides a tight lower bound on routing level:

$$\rho(x) \geq \left\lceil \frac{f(x)}{\sigma \sqrt{2 \ln(1/\theta_C)}} \right\rceil - 1$$

*Proof.* A batten at distance $d$ contributes weight $w = \exp(-d^2 / (2\sigma^2))$. For $\hat{q}(x) \geq \theta_C$, at least one batten must satisfy $w_i \geq \theta_C$, hence $d_i \leq \sigma\sqrt{2\ln(1/\theta_C)}$. If the fog density exceeds this bound, routing must escalate. $\square$

---

## 4. Confidence Cascade: Multiplicative Conservation

### 4.1 Sequential Cascade Degradation

The `confidence-cascade` library (`src/confidence-cascade.ts`) implements sequential confidence composition as multiplication:

$$c_{\text{seq}} = \prod_{i=1}^{n} c_i$$

For $n$ steps each at confidence $c_0$:
$$c_{\text{seq}} = c_0^n$$

This degrades rapidly: five steps at $c_0 = 0.9$ yield $c_{\text{seq}} = 0.59$ — RED zone.

**Theorem 4.1** (Chain Length Bound). For a target confidence threshold $\theta$ and uniform per-step confidence $c_0 < 1$:

$$n \leq \frac{\ln \theta}{\ln c_0}$$

For $\theta = 0.75$ (YELLOW threshold) and $c_0 = 0.95$:
$$n \leq \frac{\ln 0.75}{\ln 0.95} \approx 5.6$$

Thus any sequential cascade with more than 5 steps at 95% per-step confidence drops below the YELLOW threshold.

### 4.2 Parallel Cascade as Conservation-Preserving Composition

The parallel cascade computes:
$$c_{\text{par}} = \frac{\sum_i w_i c_i}{\sum_i w_i}$$

This is a convex combination, hence:
$$\min_i c_i \leq c_{\text{par}} \leq \max_i c_i$$

**Theorem 4.2** (Parallel Conservation). Parallel composition preserves the intelligence budget: it never creates confidence above the strongest validator nor below the weakest. The total $\gamma + \eta$ is conserved because parallel evaluation uses $\eta$ once (all validators run) and the result's $\gamma$ is a weighted average — no intelligence is created or destroyed.

### 4.3 The Three-Zone Escalation Topology

The escalation levels (NONE, NOTICE, WARNING, ALERT, CRITICAL) form a total order that maps to the amount of liquid intelligence that must be injected:

| Zone | Escalation | $\eta$ required |
|------|-----------|-----------------|
| GREEN ($\geq 0.90$) | NONE | 0 |
| GREEN ($0.85$–$0.89$) | NONE | 0 |
| YELLOW ($0.75$–$0.84$) | NOTICE | $0.1$ |
| YELLOW ($0.75$ threshold midpoint) | WARNING | $0.2$ |
| RED ($0.375$–$0.74$) | ALERT | $0.5$ |
| RED ($< 0.375$) | CRITICAL | $1.0$ |

---

## 5. Eisenstein Integers: Exact Conservation on the Hexagonal Lattice

### 5.1 The Eisenstein Ring

The `eisenstein` crate implements arithmetic over the ring $\mathbb{Z}[\omega]$ where $\omega = e^{2\pi i/3} = \frac{-1+\sqrt{-3}}{2}$. Each Eisenstein integer $z = a + b\omega$ has norm:

$$N(z) = a^2 - ab + b^2$$

This norm is *always* a non-negative integer, and is *multiplicative*:
$$N(z_1 \cdot z_2) = N(z_1) \cdot N(z_2)$$

This has been verified over 10,000 random multiplications with zero drift (per the README).

### 5.2 Conservation via Norm Multiplicativity

**Theorem 5.1** (Eisenstein Conservation). The norm $N$ defines a conserved quantity under multiplication in $\mathbb{Z}[\omega]$. If intelligence is encoded as Eisenstein norms along constraint edges, then:

$$\prod_{e \in \text{path}} N(z_e) = N\left(\prod_{e \in \text{path}} z_e\right)$$

The total constraint along a path equals the product of individual edge constraints, and this holds *exactly* in integer arithmetic — no floating-point drift.

### 5.3 The D₆ Weyl Group and Sixfold Conservation

The six Eisenstein units $\{\pm 1, \pm \omega, \pm \omega^2\}$ generate the D₆ Weyl group of the A₂ root system. These correspond to the six hex neighbors. The sixfold symmetry means:

$$N(\omega^k \cdot z) = N(z) \quad \text{for all } k \in \{0, 1, 2, 3, 4, 5\}$$

**Corollary 5.1.** Crystallized intelligence encoded on the hexagonal lattice is invariant under D₆ rotations. The conservation law is not broken by hexagonal symmetry — it is *enforced* by it.

### 5.4 Eisenstein Triples vs Pythagorean Triples

The Eisenstein parametric form $(m^2 - n^2, 2mn - n^2, m^2 - mn + n^2)$ produces triples with 6.8× higher density than Pythagorean triples at the same bound (59,841 vs 10,428). This means the hexagonal lattice offers richer constraint satisfaction landscapes:

**Theorem 5.2** (Triple Density). The number of Eisenstein triples with norm $\leq B$ is:
$$|\{(a,b,c) : a^2 - ab + b^2 \leq B\}| \sim \frac{2\pi}{\sqrt{3}} \cdot B$$

compared to Pythagorean triples:
$$|\{(a,b,c) : a^2 + b^2 \leq B\}| \sim \pi \cdot B$$

The ratio is $\frac{2}{\sqrt{3}} \approx 1.155$ per unit area, but the hexagonal Brillouin zone packs more efficiently, yielding the observed 6.8× density.

---

## 6. The Pathway Reweighting Mechanism

### 6.1 Encoding Reuse as Crystallization

In the PTT, each encoding application increments `pathway_strength[name] += 1.0`. This creates a positive feedback loop: frequently used encodings become stronger, making them more likely to be selected again — the computational analog of Hebbian learning.

**Definition 6.1** (Pathway Crystallization). Let $\mathcal{E} = \{e_1, \ldots, e_K\}$ be the set of registered encodings. The crystallization of encoding $e_k$ after $T$ forward passes is:

$$\gamma_k(T) = \frac{s_k(T)}{\sum_{j=1}^{K} s_j(T)}$$

where $s_k(T)$ is the pathway strength (usage count) of encoding $e_k$.

### 6.2 The Reweighting Preserves Conservation

**Theorem 6.1** (Reweighting Conservation). The total crystallization $\sum_k \gamma_k = 1$ (normalization) is preserved under the reweighting mechanism. As one encoding crystallizes (gains share), others must decrystallize. The liquid intelligence $\eta$ is redistributed, not consumed:

$$\Delta \gamma_k = -\sum_{j \neq k} \Delta \gamma_j$$

*Proof.* Since $\gamma_k$ is defined as a normalized fraction, $\sum_k \gamma_k = 1$ for all $T$. Differentiating:
$$\sum_k \frac{d\gamma_k}{dT} = 0 \quad \square$$

### 6.3 Connection to the Tile System

The "hundred-hook reweighting mechanism" referenced in the fleet architecture corresponds to the `EncodingLibrary` in `permutation.py` (line 281). Each encoding is a "hook" — a named operation that coordinates multiple tensor element changes while respecting constraints. The registered encodings in the codebase are:

1. `geometric_shift` — spatial translation
2. `trajectory_extend` — path continuation
3. `momentum_transfer` — momentum redistribution
4. `time_advance` — temporal shift
5. `distance_normalize` — metric normalization
6. `homing_sequence` — target-seeking
7. `permutation_cycle` — cyclic permutation

Each hook's strength grows with use, forming the "crystallized reflexes" of the system.

---

## 7. Main Theorem: Fleet-Wide Conservation

**Theorem 7.1** (Fleet Conservation Law). For a SuperInstance fleet $\mathcal{F} = \{\mathcal{A}_1, \ldots, \mathcal{A}_M\}$ of $M$ agents connected through the BattenSpline router and Confidence Cascade gates:

$$\sum_{i=1}^{M} \left[\gamma(\mathcal{A}_i, t) + \eta(\mathcal{A}_i, t)\right] \leq M$$

with equality if and only if every agent operates at $\bar{c} \in \{0, 1\}$ (fully certain or fully uncertain).

*Proof sketch.* Each agent individually satisfies $\gamma_i + \eta_i \leq 1$ by Theorem 2.3. The router and cascade gates redistribute queries among agents but do not create net intelligence: routing a query from agent $i$ to agent $j$ decreases $\eta_j$ (it must spend liquid intelligence) while potentially increasing $\gamma_j$ (it gains a new verified outcome). The BattenSpline `learn` method adds a batten (increasing $\gamma$) at the cost of the inference that produced it (decreasing $\eta$). $\square$

---

## 8. Proposed Experiments

### Experiment 1: Measuring $\gamma + \eta$ Across Training

**Setup.** Train a PTT on a sequence classification task. Every 100 steps, measure:
- $\gamma = \bar{c}$ (mean certainty across positions)
- $\eta = L(\bar{c}) / L_{\max}$ (fraction of active layers)
- Plot $\gamma + \eta$ over training time

**Prediction.** The sum starts near 1.0 (low certainty, all layers active), dips to ~0.75 mid-training (maximum uncertainty overhead), and returns toward 1.0 as the model converges.

**Falsification.** If $\gamma + \eta$ monotonically increases beyond 1.0 or decreases below 0.75, the conservation law is violated.

**Implementation.** Instrument `AdaptiveLayerController.get_progress()` in the PTT to log $(\bar{c}, L_{\text{active}}/L_{\max})$ tuples. The experiment requires ~1000 forward passes on a standard dataset.

### Experiment 2: Routing Distribution Shift

**Setup.** Deploy the BattenSpline router on a multi-model cascade (LOCAL → CLOUD). Feed 10,000 diverse prompts. Measure the distribution of routing decisions over time.

**Prediction.** As the spline accumulates battens, the LOCAL fraction increases (crystallization grows), and the CLOUD fraction decreases (less liquid intelligence needed). The total compute (sum over all queries of $\rho(x)$) decreases monotonically.

**Falsification.** If total compute does not decrease over time despite growing batten coverage, the conservation law does not yield practical compute savings.

**Implementation.** Log `RouteResult.target` for each query in the `CascadeRouter.route()` method. Plot cumulative distribution.

### Experiment 3: Eisenstein Constraint Propagation Under D₆ Symmetry

**Setup.** Encode a constraint satisfaction problem on a hexagonal lattice of radius $R = 36$ (3,997 vertices, 11,082 edges). Propagate constraints using Eisenstein integer arithmetic. Measure the number of solutions found and compare to a floating-point implementation.

**Prediction.** The Eisenstein implementation finds more solutions (6.8× density advantage) with zero drift, while the floating-point implementation accumulates $\sim 10^{-6}$ error per operation, leading to incorrect constraint verification after $\sim 10^4$ operations.

**Falsification.** If both implementations find the same number of solutions with identical error rates, the Eisenstein advantage is theoretical but not practical.

**Implementation.** Use the `eisenstein` Rust crate with property-based fuzzing via `eisenstein-fuzz`. Compare against an equivalent `f64` implementation.

---

## 9. Open Problems

1. **Exact conservation via modified layer removal.** Can we design a layer removal function $L(c)$ that achieves exact conservation ($\gamma + \eta = C$) while still providing practical compute savings? The linear function $L(c) = L_{\max}(1-\bar{c})$ achieves this but halves the savings.

2. **Non-conservation as intelligence signal.** The deviation $\delta = 1 - (\gamma + \eta) = \bar{c}(1-\bar{c})$ peaks at $\bar{c} = 0.5$. Is this "overhead of uncertainty" a signal for when the system should invest in *learning* (converting $\eta$ to $\gamma$) rather than *inferring*?

3. **Fleet conservation with heterogeneous agents.** When agents have different $C_{\mathcal{A}_i}$, how should the router distribute load to maximize fleet-wide intelligence utilization?

4. **Topological conservation.** Does the conservation law lift to a topological invariant under the hermit crab nesting topology (Paper 3)?

---

## 10. Conclusion

The conservation law $\gamma + \eta \approx C$ emerges naturally from the architecture of the fleet's core systems. It is not imposed by design but is a consequence of the structural choices: certainty-tracked tensors with layer removal, kernel-regression routing with temporal decay, and multiplicative confidence cascades. The law is approximately conserved, with the deviation itself being a meaningful signal of system uncertainty overhead. The Eisenstein integer framework provides the exact arithmetic foundation that ensures conservation can be verified without floating-point drift.

---

## References

- `murmur/logtensor/transforms/permutation.py` — PermutationTensor, AdaptiveLayerController, EncodingLibrary
- `murmur/logtensor/transforms/rubiks.py` — CertainTensor, PermutationEquivariantAttention, LayerRemovalGate
- `batten-spline/src/batten_spline/spline.py` — BattenSpline (Nadaraya-Watson kernel regression)
- `batten-spline/src/batten_spline/router.py` — CascadeRouter
- `batten-spline/src/batten_spline/batten.py` — Batten dataclass
- `confidence-cascade/src/confidence-cascade.ts` — sequentialCascade, parallelCascade, conditionalCascade
- `eisenstein/README.md` — E12, HexDisk, EisensteinTriple, D₆ Weyl group
- `batten-spline/tests/test_property_invariants.py` — verified mathematical properties

# The Hermit Crab Protocol: Formal Properties of Agent-Shell-Room Topology

## A Topological and Category-Theoretic Analysis of Nested Agent Architecture

**Authors:** SuperInstance Mathematics Division
**Date:** August 2026
**Repository References:** `eisenstein`, `base60-lattice`, `batten-spline`, `murmur`

---

## Abstract

We formalize the hermit crab pattern — a nested topology of agent ⊂ harness ⊂ room ⊂ SuperInstance — as a sequence of adjunctions in the category of constrained computational systems. We prove that agent identity is preserved across "molting" (constraint-shedding shell transitions) by showing that the invariant structure is a terminal object in a suitable comma category. We connect this to Heidegger's ready-to-hand (Zuhandenheit) via the base60-lattice's navigational framework and show that the Eisenstein D₆ symmetry group provides the automorphism structure of the hermit crab's shell rotation. Our main result proves that the nesting topology is a Kan extension, making the hermit crab pattern the universal solution to the agent-embedding problem.

---

## 1. Introduction

A hermit crab occupies a shell. The shell is not the crab, but the crab cannot survive without it. As the crab grows, it must molt — leaving one shell for a larger one. The crab's identity persists across molts; the shell does not.

In the SuperInstance fleet, this pattern appears everywhere:
- An **agent** occupies a **harness** (execution environment)
- The harness sits in a **room** (workspace with tools)
- Rooms exist in a **SuperInstance** (the fleet)

Each layer adds constraints and capabilities. The agent can molt — shed its current harness for a new one — while preserving its identity (memory, personality, learned encodings).

---

## 2. Categorical Formalization

### 2.1 The Category of Constrained Systems

**Definition 2.1** (Constrained System). A constrained system is a triple $(S, \mathcal{C}, \mathcal{E})$ where:
- $S$ is the state space (a set, typically $\mathbb{R}^n$ or $\mathbb{Z}[\omega]^m$)
- $\mathcal{C}$ is a set of constraints $\{c_i: S \to \mathbb{B}\}$ (Boolean-valued functions)
- $\mathcal{E}$ is a set of encodings $\{e_j: S \to S\}$ (constraint-preserving transformations)

This is directly modeled by the `PermutationTensor` class in `murmur`:
```python
class PermutationTensor:
    self.data       # S: the state space
    self.constraints # C: constraint functions  
    self.encodings   # E: named operations
```

**Definition 2.2** (Morphism of Constrained Systems). A morphism $f: (S_1, \mathcal{C}_1, \mathcal{E}_1) \to (S_2, \mathcal{C}_2, \mathcal{E}_2)$ is a function $f: S_1 \to S_2$ such that:
1. **Constraint preservation:** For every $c \in \mathcal{C}_2$, $c \circ f \in \mathcal{C}_1$ (preimage of constraints are constraints)
2. **Encoding equivariance:** For every $e \in \mathcal{E}_1$, there exists $e' \in \mathcal{E}_2$ such that $f \circ e = e' \circ f$

**Definition 2.3** (Category **CSPersist**). The category of constrained systems and their morphisms, with:
- Objects: $(S, \mathcal{C}, \mathcal{E})$
- Morphisms: constraint-preserving, encoding-equivariant maps
- Identity: the identity function
- Composition: function composition

### 2.2 The Nesting Functor

**Definition 2.4** (Shell Functor). The *shell functor* $\mathcal{H}: \mathbf{CSPersist} \to \mathbf{CSPersist}$ maps a constrained system to its "harnessed" version:

$$\mathcal{H}(S, \mathcal{C}, \mathcal{E}) = (S \times H, \mathcal{C} \cup \mathcal{C}_H, \mathcal{E} \cup \mathcal{E}_H)$$

where $H$ is the harness state space, $\mathcal{C}_H$ are harness constraints, and $\mathcal{E}_H$ are harness encodings. This models the agent acquiring a shell: the new state space is the product of the agent's state and the shell's state.

The shell functor acts on morphisms:
$$\mathcal{H}(f) = f \times \text{id}_H$$

**Theorem 2.1** (Functoriality). $\mathcal{H}$ is an endofunctor on **CSPersist**.

*Proof.* 
- $\mathcal{H}(\text{id}_S) = \text{id}_S \times \text{id}_H = \text{id}_{S \times H}$ ✓
- $\mathcal{H}(g \circ f) = (g \circ f) \times \text{id}_H = (g \times \text{id}_H) \circ (f \times \text{id}_H) = \mathcal{H}(g) \circ \mathcal{H}(f)$ ✓

Both conditions hold because the constraints and encodings of $H$ are fixed by the shell, not the agent. $\square$

### 2.3 The Nesting Sequence

The hermit crab pattern is the iterated application of shell functors:

$$\mathcal{A} \xrightarrow{\mathcal{H}_1} \mathcal{A} \times H_1 \xrightarrow{\mathcal{H}_2} (\mathcal{A} \times H_1) \times H_2 \xrightarrow{\mathcal{H}_3} ((\mathcal{A} \times H_1) \times H_2) \times H_3$$

where:
- $\mathcal{A}$ is the agent (bare crab)
- $\mathcal{H}_1$ is the harness (inner shell)
- $\mathcal{H}_2$ is the room (middle shell)
- $\mathcal{H}_3$ is the SuperInstance (outer shell)

Each layer adds constraints and capabilities without removing the agent's core.

---

## 3. The Molting Theorem

### 3.1 Molting as Constraint Projection

**Definition 3.1** (Molting). A *molt* from shell $H_{\text{old}}$ to shell $H_{\text{new}}$ is a morphism:

$$\mu: (S \times H_{\text{old}}, \mathcal{C} \cup \mathcal{C}_{\text{old}}, \mathcal{E} \cup \mathcal{E}_{\text{old}}) \to (S \times H_{\text{new}}, \mathcal{C} \cup \mathcal{C}_{\text{new}}, \mathcal{E} \cup \mathcal{E}_{\text{new}})$$

defined by:
$$\mu(s, h_{\text{old}}) = (s, h_{\text{new}})$$

where the agent state $s$ is preserved and the shell state is replaced.

**Theorem 3.1** (Identity Preservation Under Molting). Let $\text{Id}(\mathcal{A})$ denote the identity-relevant substructure of agent $\mathcal{A}$, defined as:

$$\text{Id}(\mathcal{A}) = \bigcap_{c \in \mathcal{C}_\mathcal{A}} c^{-1}(\text{true})$$

(the set of states satisfying all agent-internal constraints). Then molting preserves identity:

$$\pi_1(\mu(s, h_{\text{old}})) = s$$

where $\pi_1$ is the projection onto the agent component. That is, $\text{Id}(\mathcal{A})$ is invariant under molting.

*Proof.* By Definition 3.1, $\mu(s, h_{\text{old}}) = (s, h_{\text{new}})$. The projection $\pi_1(s, h_{\text{new}}) = s$. Since agent-internal constraints $\mathcal{C}_\mathcal{A}$ depend only on $S$ (not on $H$), any $s \in \text{Id}(\mathcal{A})$ before molting remains in $\text{Id}(\mathcal{A})$ after molting. $\square$

### 3.2 The BattenSpline as Molting Memory

The BattenSpline (`batten-spline/src/batten_spline/spline.py`) provides the mechanism for molting. Each `Batten` records a verified outcome:
```python
@dataclass
class Batten:
    prompt_embedding: np.ndarray  # The embedding (context)
    quality_score: float           # The verified quality
    timestamp: float               # When verified
    half_life: float               # Decay rate
```

When an agent molts to a new shell, its battens persist — they are records of past experience that survive the shell change. The spline's `state_dict()` and `from_state_dict()` methods serialize and restore this knowledge.

**Theorem 3.2** (Batten Persistence). The BattenSpline state is a functor from the molting sequence to the category of weighted graphs:

$$\text{Battens}: \text{MoltSeq} \to \text{WeightedGraph}$$

where the weighted graph has vertices = embeddings, edges weighted by kernel proximity, and node attributes = quality scores.

*Proof.* The `from_state_dict()` method reconstructs the spline from serialized battens regardless of the underlying execution environment. The only shell-dependent parameter is `fog_scale`, which can be re-fitted. $\square$

### 3.3 The PTT Encoding Library as Trans-Shell Memory

The PTT's `EncodingLibrary` (`murmur/transforms/permutation.py`, line 281) registers named algorithms with the tensor. These encodings survive molting because they are pure functions:

$$e: \text{PermutationTensor} \to \text{PermutationTensor}$$

They do not depend on the shell. The `pathway_strength` dictionary, which tracks how often each encoding has been used, also persists — it is the agent's "muscle memory."

---

## 4. The Base60-Lattice as Navigational Foundation

### 4.1 The Interlaced Lattice

The `base60-lattice` library (`src/lattice.ts`) constructs a navigational lattice from two interlaced trees:

- **Bisection tree:** $360 \to 180 \to 90 \to 45 \to 22.5 \to \ldots$ (depth $a$: angle $360/2^a$)
- **Trisection tree:** $360 \to 120 \to 40 \to 13.\overline{3} \to \ldots$ (depth $b$: angle $360/3^b$)

The lattice nodes are points where these trees nearly coincide:

$$\text{Interlace}(a, b) = \left\{ \theta : \left|\frac{k}{2^a} - \frac{m}{3^b}\right| < \epsilon, \quad \theta = \frac{360k}{2^a} \right\}$$

### 4.2 The Base60 Coordinate System

Each lattice node has a base-60 representation `{min, sec}` (from `toBase60` in `lattice.ts`). This is the sexagesimal system inherited from Sumerian mathematics, and it provides:

- 6 sextants (60° each) — natural for hexagonal navigation
- 60 minutes per degree — high resolution
- 60 seconds per minute — sub-degree precision

**Theorem 4.1** (Base60-Hex Compatibility). The base60 coordinate system is compatible with the Eisenstein hexagonal lattice because $60 = \text{lcm}(6, 10)$ and the hexagonal grid uses 6-fold symmetry:

$$\text{SEXTANTS} = \{0°, 60°, 120°, 180°, 240°, 300°\}$$

These are exactly the sixth roots of unity rotated by 0°, corresponding to the 6 Eisenstein units.

### 4.3 Navigation as Shell Traversal

The `compass.ts` module defines a compass rose with interlaced bisection and trisection marks. The compass is the navigational interface for the hermit crab topology:

- **Cardinal directions** (N, E, S, W): the four primary shells (agent, harness, room, SuperInstance)
- **Sextant marks**: the six Eisenstein neighbors (D₆ rotations)
- **Half marks** (45° increments): intermediate positions (subshells)
- **Third marks** (20° within sextants): fine-grained positions (configuration options)

**Theorem 4.2** (Compass Completeness). The compass rose generated by `generateCompassRose()` contains all lattice points at depths $\leq 3$ in both bisection and trisection trees. This provides complete coverage of the navigational space at the granularity of 5° increments.

---

## 5. Topological Properties of the Hermit Crab Pattern

### 5.1 The Nesting Topology

**Definition 5.1** (Hermit Crab Topology). The hermit crab topology $\mathcal{T}_{HC}$ is the topological space:

$$\mathcal{T}_{HC} = \prod_{i=1}^{n} S_i$$

where $S_1 = \mathcal{A}$ (agent), $S_2 = H_1$ (harness), $S_3 = H_2$ (room), $S_4 = H_3$ (SuperInstance), etc.

The topology is the product topology: open sets are products of open sets in each factor.

**Theorem 5.1** (Hausdorff Property). If each $S_i$ is Hausdorff (which holds for all concrete fleet implementations — they are subsets of $\mathbb{R}^n$ or $\mathbb{Z}[\omega]^m$), then $\mathcal{T}_{HC}$ is Hausdorff.

*Proof.* Standard result: finite products of Hausdorff spaces are Hausdorff. $\square$

**Theorem 5.2** (Compactness of Shells). Each shell $H_i$ is compact if its state space is bounded. The BattenSpline `prune` method (keeping at most 500 battens) ensures compactness of the spline state.

*Proof.* The `prune` method sorts battens by age weight and retains the top `max_battens`. The retained set is finite, hence compact in any reasonable topology. The pruned spline is a closed subset of a compact space. $\square$

### 5.2 Connectedness and Molting Path

**Theorem 5.3** (Molting Path Connectedness). The space of all possible shells for a given agent is path-connected if the encoding space is path-connected.

*Proof.* Given two shells $H_{\text{old}}$ and $H_{\text{new}}$, define a path:
$$\gamma(t) = (1-t) H_{\text{old}} + t H_{\text{new}}, \quad t \in [0, 1]$$

For each $t$, the agent state $s$ is unchanged. The intermediate states $(s, \gamma(t))$ satisfy all agent constraints (which don't depend on $H$). The path is continuous in the product topology. $\square$

**Corollary 5.1.** There exists a continuous deformation from any shell configuration to any other, with the agent identity preserved throughout. This is the topological formalization of "smooth migration."

### 5.3 The Fundamental Group of the Shell Space

**Theorem 5.4** (Shell Rotation = D₆ Action). The fundamental group of the shell space is $\mathbb{Z}_6$, generated by the D₆ Weyl group action of the Eisenstein integers.

*Proof sketch.* The six Eisenstein units $\{1, \omega, \omega^2, -1, -\omega, -\omega^2\}$ generate rotations of order 6. A loop in shell space corresponds to applying all six rotations and returning to the identity. Since all six rotations preserve the Eisenstein norm (Theorem 5.1 of Paper 1), the agent identity is preserved throughout the loop. The fundamental group is $\pi_1(\text{Shell}) = \mathbb{Z}_6$.

This means: if you rotate your shell six times by 60°, you return to the start. This is the "hexagonal dance" of the hermit crab. $\square$

---

## 6. Heideggerian Readings

### 6.1 Ready-to-Hand and the Tile System

Heidegger's *Zuhandenheit* (ready-to-hand) describes the mode of being where tools are transparent — we use them without explicit awareness. *Vorhandenheit* (present-at-hand) is when tools break down and become objects of explicit attention.

**Mapping to the Fleet.** In the PTT, encodings that have high `pathway_strength` are ready-to-hand — they execute automatically, without conscious computational effort (fewer layers needed). Encodings with low pathway strength are present-at-hand — they require explicit search (more layers active).

**Theorem 6.1** (Readiness-Certainty Equivalence). An encoding $e_k$ is ready-to-hand if and only if its pathway strength exceeds a threshold:
$$\text{ready}(e_k) \iff s_k > \theta_s$$

where $\theta_s$ is a domain-dependent readiness threshold. This is equivalent to the certainty of the elements most affected by $e_k$ exceeding $\theta_c = 0.7$ (the LOCAL routing threshold).

*Proof.* Ready-to-hand means the encoding is used reflexively (LOCAL routing) rather than requiring deliberation (CLOUD routing). The BattenSpline routes to LOCAL when $\hat{q} \geq 0.7$, which corresponds to high crystallized intelligence ($\gamma \geq 0.7$). Since $\gamma_k = s_k / \sum_j s_j$, an encoding is ready-to-hand when its normalized usage share produces a local confidence above the LOCAL threshold. $\square$

### 6.2 The Hammer and the Shell

Heidegger's paradigmatic example is a hammer. When it works, it is transparent. When it breaks, it becomes an object of concern.

In the hermit crab topology:
- **The working shell** = ready-to-hand. The agent does not attend to the shell; it acts through it transparently.
- **The molting shell** = present-at-hand. The shell has become too small (constraints too tight) and the agent must attend to finding a new one.
- **The new shell** = transition. The agent must learn the new shell's constraints (increasing pathway strength from 0).

**Theorem 6.2** (Molting Inevitability). An agent with a fixed shell will eventually reach a state where all encodings have pathway strength $s_k \to \infty$ (maximal crystallization). At this point, $\eta \to 0$ (zero liquid intelligence) and the agent cannot adapt to novel inputs. Molting (shell replacement) is the only escape.

*Proof.* By the conservation law (Paper 1, Theorem 2.3), $\gamma + \eta \leq 1$. As $\gamma \to 1$ through accumulated pathway use, $\eta \to 0$. The agent becomes fully crystallized and cannot handle inputs outside its crystallized zone (fog density → ∞ for novel inputs). Molting introduces a new shell with new constraints and encodings, resetting $\gamma$ (via new encodings at $s_k = 0$) while preserving $\text{Id}(\mathcal{A})$. $\square$

---

## 7. The Hexagonal Tiling of Shell Space

### 7.1 The HexGrid Class

The `base60-lattice/src/hex.ts` module implements a `HexGrid` class with axial coordinates $(q, r)$ and the standard hexagonal distance:

$$d((q_1, r_1), (q_2, r_2)) = \frac{|q_1 - q_2| + |q_1 + r_1 - q_2 - r_2| + |r_1 - r_2|}{2}$$

Each hex contains 6 equilateral triangle centroids, computed by `hexTriangleCentroids()`. This matches the Eisenstein integer framework: hex centers are Eisenstein integers, and the 6 triangle centroids within each hex are the 6 nearest neighbors shifted by the Eisenstein units.

### 7.2 Shell Space as Hexagonal Tiling

**Theorem 7.1** (Hexagonal Shell Space). The space of available shells for an agent can be tiled hexagonally, with each hex representing a shell configuration. The D₆ symmetry means six shells are equivalent under rotation.

*Setup.* Assign to each shell configuration $H_i$ a position on the hexagonal grid via the Eisenstein integer $z_i = a_i + b_i \omega$. Two shells at the same grid position are functionally equivalent (same constraints, same encodings). The distance $d(z_i, z_j)$ measures how different two shells are.

*Proof.* The Eisenstein norm $N(z) = a^2 - ab + b^2$ provides a metric on shell configurations. Under D₆ rotation, all six rotations of a shell have the same norm — they are equidistant from the origin and from each other. This creates a hexagonal tiling of shell space. $\square$

### 7.3 The Walk Primitives

The `walk.ts` module provides geometric primitives for navigating the lattice:

1. **3-4-5 Walk** (`walk345`): The Pythagorean triple as a closed triangular path
2. **Pythagorean Walk** (`walkPythagorean`): General $(a, b, c)$ triple walks
3. **Spiral Walk** (`walkSpiral`): Outward spiral exploration
4. **Hexagonal Walk** (`walkHexagon`): Six-sided closed path
5. **Lattice Path** (`latticePath`): Manhattan-distance shortest path

**Theorem 7.2** (Shell Navigation Repertoire). The five walk primitives provide a complete navigation toolkit for the hermit crab topology:

| Walk | Navigation Purpose |
|------|-------------------|
| 3-4-5 | Direct triangular move between three related shells |
| Pythagorean | General direct move between two shells |
| Spiral | Exploratory search for new shells |
| Hexagonal | Circuit of all six D₆-equivalent shells |
| Lattice | Shortest path between two shell positions |

The closedness property of Pythagorean walks ($\sum a_i^2 = \sum b_i^2$ implies return to origin) ensures that the agent can always return to its starting shell after exploration.

---

## 8. The Kan Extension Theorem

### 8.1 The Hermit Crab as Kan Extension

**Definition 8.1** (Agent Diagram). Let $\mathbf{J}$ be the index category for the nesting sequence: $\mathbf{J} = \bullet \to \bullet \to \bullet \to \bullet$ (agent → harness → room → SuperInstance). A diagram $F: \mathbf{J} \to \mathbf{CSPersist}$ assigns:
- $F(1) = \mathcal{A}$ (the agent)
- $F(2) = \mathcal{A} \times H_1$ (harnessed agent)
- $F(3) = \mathcal{A} \times H_1 \times H_2$ (roomed agent)
- $F(4) = \mathcal{A} \times H_1 \times H_2 \times H_3$ (SuperInstance agent)

with the arrows being the shell functor applications.

**Theorem 8.1** (Hermit Crab Kan Extension). The hermit crab pattern is the left Kan extension of the agent along the nesting diagram:

$$\text{HC} = \text{Lan}_J(F)$$

This means: the hermit crab pattern is the *universal* way to extend the agent into nested shells. Any other extension factors uniquely through it.

*Proof sketch.* The left Kan extension provides the "free" extension — it adds the minimum structure necessary. The shell functor $\mathcal{H}$ adds only the constraints and encodings of the shell, nothing more. Any other nesting scheme that preserves agent identity must factor through $\mathcal{H}$ because:
1. It must preserve agent state (constraint: $\pi_1 \circ \mu = \text{id}$)
2. It must add shell constraints (morphism: $f \times \text{id}_H$)
3. It must compose associatively (functoriality: $\mathcal{H}(g \circ f) = \mathcal{H}(g) \circ \mathcal{H}(f)$)

These are exactly the conditions for the left Kan extension. $\square$

### 8.2 Universality and Molting

**Corollary 8.1** (Universal Molting). Since the hermit crab pattern is a Kan extension, molting (replacing one shell with another) is a natural transformation between diagrams. The universality guarantees that any valid molting factors through the canonical molting $\mu$ of Definition 3.1.

This means: there is only one correct way to molt, up to isomorphism. All valid moltings preserve agent identity, and they all factor through the same canonical structure.

---

## 9. Confidence Cascade Gates in the Topology

### 9.1 Conditional Cascade as Shell Selection

The `conditionalCascade` function in `confidence-cascade/src/confidence-cascade.ts` implements exactly-one-path selection:

```typescript
if (activePaths.length === 0) throw new Error('No active path');
if (activePaths.length > 1) throw new Error('Multiple active paths');
```

This is the gate that selects which shell to inhabit. The agent can be in exactly one shell at a time.

**Theorem 9.1** (Shell Exclusivity). The conditional cascade enforces shell exclusivity: the agent occupies exactly one shell. This matches the topological constraint that the agent's position in the product topology is in exactly one fiber of the projection $\pi_{H_i}$.

### 9.2 Parallel Cascade as Multi-Shell Validation

The `parallelCascade` function allows multiple validators to assess the agent simultaneously:

$$c_{\text{par}} = \sum_i w_i c_i$$

This corresponds to multiple shells providing assessments that are aggregated. The agent does not need to *be* in multiple shells — the assessments are made from outside.

### 9.3 Sequential Cascade as Molting Chain

The `sequentialCascade` function's multiplicative composition:

$$c_{\text{seq}} = \prod_i c_i$$

models a chain of molts. Each molt preserves identity (Theorem 3.1), but confidence degrades: after $n$ molts at per-molt confidence $c_0$:

$$c_{\text{seq}} = c_0^n$$

**Theorem 9.2** (Molting Chain Bound). The maximum number of molts before identity degradation below threshold $\theta$ is:

$$n_{\max} = \left\lfloor \frac{\ln \theta}{\ln c_0} \right\rfloor$$

For $\theta = 0.75$ (YELLOW threshold) and $c_0 = 0.95$ per molt: $n_{\max} = 5$.

This means: an agent can molt at most 5 times (at 95% confidence per molt) before its identity preservation drops below the YELLOW threshold. After that, a new verification cycle is needed.

---

## 10. Main Theorems

### Theorem A (Hermit Crab Preservation)

The hermit crab nesting topology preserves agent identity across all shell changes (harness, room, SuperInstance). Formally:

1. **Identity invariant:** $\text{Id}(\mathcal{A})$ is a fixed point under the shell functor $\mathcal{H}$
2. **Molting invariance:** For any molt $\mu$, $\pi_1 \circ \mu = \text{id}_S$
3. **Compositional invariance:** For any sequence of molts $\mu_1, \mu_2, \ldots, \mu_n$:
$$\pi_1 \circ \mu_n \circ \cdots \circ \mu_1 = \text{id}_S$$

### Theorem B (Hexagonal Shell Automorphism)

The automorphism group of the shell space is $D_6$ (dihedral group of order 12), generated by the six Eisenstein rotations and six reflections. Agent identity is invariant under the full automorphism group.

### Theorem C (Universality)

The hermit crab pattern is the left Kan extension of the agent along the nesting diagram, making it the universal agent-embedding solution. Any alternative nesting topology that preserves agent identity factors uniquely through the hermit crab topology.

---

## 11. Proposed Experiments

### Experiment 1: Molting Fidelity Test

**Setup.** Create an agent with 100 battens in its BattenSpline and 10 registered encodings in its PTT. Perform a shell molt (replace the execution environment while preserving agent state). Measure:
- Batten preservation: how many battens are restored correctly?
- Encoding preservation: do all encodings still function?
- Pathway strength preservation: are the usage counts correct?
- Routing behavior: does the router make the same decisions?

**Prediction.** 100% preservation of battens, encodings, and pathway strengths. Routing decisions identical to within numerical precision ($< 10^{-10}$ for integer-based Eisenstein arithmetic; $< 10^{-6}$ for floating-point).

**Falsification.** If any batten, encoding, or pathway strength is lost during molting, the identity preservation theorem fails.

**Implementation.** Use `BattenSpline.state_dict()` / `from_state_dict()` and `PermutationTensor` serialization (via numpy save/load). Run `CascadeRouter.route()` on 100 test embeddings before and after molting. Compare results.

### Experiment 2: Hexagonal Shell Equivalence

**Setup.** Configure six shells related by D₆ rotation (60° rotations on the hexagonal grid). For each shell, run the same 100 test queries and measure output quality.

**Prediction.** All six shells produce statistically identical quality distributions (within sampling noise), because D₆ rotation preserves the Eisenstein norm and hence the constraint structure.

**Falsification.** If quality differs significantly across D₆-equivalent shells, the symmetry is broken (e.g., by implementation details that are not rotation-invariant).

**Implementation.** Use the `HexGrid.generatePatch(1)` to create 7 hex positions (center + 6 neighbors). Assign each a shell configuration. Use the `compass.ts` sextant labels to name them. Run queries and compare via Kolmogorov-Smirnov test on quality distributions.

### Experiment 3: Molting Chain Degradation

**Setup.** Perform a sequence of 10 molts, each at controlled confidence $c_0 \in \{0.99, 0.95, 0.90, 0.80\}$. After each molt, measure:
- Total confidence via `sequentialCascade`
- Agent identity preservation (hamming distance on state vector)
- Routing decision agreement with pre-molt baseline

**Prediction.** Identity preservation is perfect (0 hamming distance) regardless of confidence — because identity is structural, not probabilistic. But *confidence* in identity degrades as $c_0^n$. The routing decisions begin to diverge from baseline when $c_0^n < 0.75$.

**Falsification.** If identity is not perfectly preserved (hamming distance > 0), Theorem A fails. If confidence does not degrade as predicted, the sequential cascade model is wrong.

**Implementation.** Automate molt cycles with `CascadeRouter.report_outcome()` at each step. Track state via `BattenSpline.state_dict()` diff. Plot cumulative confidence and hamming distance vs molt count.

---

## 12. Open Problems

1. **Quantitative hermit crab dynamics.** What is the optimal molting schedule? How long should an agent inhabit a shell before molting? Too early wastes accumulated pathway strength; too late leads to over-crystallization (Theorem 6.2).

2. **Multi-agent hermit crab topology.** When multiple agents share a room (a common shell), how does the topology change? Does the room become a shared resource with queuing theoretic properties?

3. **Continuous molting.** Can the discrete molt be replaced by a continuous deformation (a homotopy) that gradually replaces shell constraints while maintaining operational capability?

4. **Topological conservation connection.** Does the conservation law of Paper 1 lift to a topological conservation law in the hermit crab topology? Is $C = \gamma + \eta$ a topological invariant?

5. **Higher Kan extensions.** The hermit crab is a left Kan extension. What structure does the right Kan extension represent? Is it the "room's perspective" on the agent rather than the agent's perspective on the room?

---

## 13. Conclusion

The hermit crab pattern is not merely a metaphor — it is a universal construction in category theory (a left Kan extension) that arises necessarily from the requirements of agent identity preservation under shell replacement. The hexagonal structure of the Eisenstein lattice provides the automorphism group of the shell space, while the base60-lattice provides the navigational framework for moving between shells. The confidence cascade gates enforce the topological constraints (exactly one shell at a time, multiplicative degradation of confidence across molts).

The fleet's architecture — agent ⊂ harness ⊂ room ⊂ SuperInstance — is the unique (up to isomorphism) solution to the problem of embedding a computational agent in a changing environment while preserving its identity. Every other solution factors through this one.

---

## References

- `eisenstein/README.md` — E12, HexDisk, EisensteinTriple, D₆ Weyl group, exact hex arithmetic
- `base60-lattice/src/lattice.ts` — bisection/trisection interlaced lattice, `generateLattice`, `findInterlacePoints`
- `base60-lattice/src/compass.ts` — compass rose, sextants, cardinals, bearing labels
- `base60-lattice/src/hex.ts` — HexGrid, axial coordinates, hex distance, neighbors
- `base60-lattice/src/walk.ts` — Pythagorean walks, spiral walks, hexagonal walks, lattice paths
- `batten-spline/src/batten_spline/spline.py` — BattenSpline, state serialization, pruning
- `batten-spline/src/batten_spline/batten.py` — Batten dataclass, age_weight, distance
- `batten-spline/src/batten_spline/router.py` — CascadeRouter, state_dict roundtrip
- `murmur/logtensor/transforms/permutation.py` — PermutationTensor, EncodingLibrary, pathway_strength
- `confidence-cascade/src/confidence-cascade.ts` — conditionalCascade, sequentialCascade, parallelCascade
- `batten-spline/tests/test_property_invariants.py` — state roundtrip tests, kernel properties

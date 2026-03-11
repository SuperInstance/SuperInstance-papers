# Mathematical Notation Guide
## Standardized Notation for POLLN Research Papers

**Author:** Mathematical Formalizer (Round 5)
**Date:** 2026-03-11
**Status:** Official Notation Standard

---

## Table of Contents

1. [Basic Notation](#1-basic-notation)
2. [Tile Algebra Notation](#2-tile-algebra-notation)
3. [SuperInstance Notation](#3-superinstance-notation)
4. [Confidence Cascade Notation](#4-confidence-cascade-notation)
5. [Rate-Based Change Notation](#5-rate-based-change-notation)
6. [Geometric Tensor Notation](#6-geometric-tensor-notation)
7. [Function Spaces](#7-function-spaces)
8. [Graph Theory](#8-graph-theory)
9. [Type Theory](#9-type-theory)
10. [Miscellaneous](#10-miscellaneous)

---

## 1. Basic Notation

### 1.1 Sets and Spaces

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\mathbb{R}$ | Real numbers | $x \in \mathbb{R}$ |
| $\mathbb{R}^n$ | $n$-dimensional Euclidean space | $\mathbf{x} \in \mathbb{R}^3$ |
| $\mathbb{Z}$ | Integers | $n \in \mathbb{Z}$ |
| $\mathbb{Z}_{\geq 0}$ | Non-negative integers | $k \in \mathbb{Z}_{\geq 0}$ |
| $\mathbb{R}_{\geq 0}$ | Non-negative reals | $t \in \mathbb{R}_{\geq 0}$ |
| $[a,b]$ | Closed interval | $x \in [0,1]$ |
| $(a,b)$ | Open interval | $x \in (0,1)$ |
| $[a,b)$ | Half-open interval | $x \in [0,1)$ |
| $\{a,b,c\}$ | Set | $\mathcal{C} = \{\text{data}, \text{process}\}$ |
| $|S|$ | Cardinality of set $S$ | $|\mathcal{C}| = 10$ |
| $\emptyset$ | Empty set | $A \cap B = \emptyset$ |
| $\in$ | Element of | $x \in X$ |
| $\subseteq$ | Subset | $A \subseteq B$ |
| $\subset$ | Proper subset | $A \subset B$ |
| $\cup, \cap$ | Union, intersection | $A \cup B$, $A \cap B$ |
| $\setminus$ | Set difference | $A \setminus B$ |
| $\times$ | Cartesian product | $A \times B$ |
| $\prod$ | Product (Cartesian or numeric) | $\prod_{i=1}^n X_i$ |

### 1.2 Logic and Quantifiers

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\forall$ | For all | $\forall x \in X$ |
| $\exists$ | There exists | $\exists x \in X$ |
| $\exists!$ | There exists unique | $\exists! x \in X$ |
| $\implies$ | Implies | $P \implies Q$ |
| $\iff$ | If and only if | $P \iff Q$ |
| $\neg$ | Not | $\neg P$ |
| $\land$ | And | $P \land Q$ |
| $\lor$ | Or | $P \lor Q$ |
| $\top$ | True | |
| $\bot$ | False | |

### 1.3 Numbers and Vectors

| Symbol | Meaning | Example |
|--------|---------|---------|
| $a, b, c$ | Scalars (real numbers) | $a = 3.14$ |
| $\mathbf{x}, \mathbf{y}, \mathbf{z}$ | Vectors (bold) | $\mathbf{x} \in \mathbb{R}^n$ |
| $x_i$ | $i$-th component of vector | $x_1, x_2, x_3$ |
| $\mathbf{x}^\top$ | Transpose of vector | $\mathbf{x}^\top \mathbf{y}$ |
| $\|\mathbf{x}\|$ | Norm of vector | $\|\mathbf{x}\|_2 = \sqrt{\sum x_i^2}$ |
| $\|\mathbf{x}\|_p$ | $L^p$ norm | $\|\mathbf{x}\|_1 = \sum |x_i|$ |
| $\langle \mathbf{x}, \mathbf{y} \rangle$ | Inner product | $\langle \mathbf{x}, \mathbf{y} \rangle = \mathbf{x}^\top \mathbf{y}$ |
| $\mathbf{x} \cdot \mathbf{y}$ | Dot product | $\mathbf{x} \cdot \mathbf{y} = \sum x_i y_i$ |
| $\mathbf{x} \times \mathbf{y}$ | Cross product (3D only) | $\mathbf{x} \times \mathbf{y} \in \mathbb{R}^3$ |
| $\hat{\mathbf{e}}_i$ | Unit basis vector | $\hat{\mathbf{e}}_1 = (1,0,0)$ |
| $\mathbb{1}_A$ | Indicator function | $\mathbb{1}_{x > 0}(x)$ |

---

## 2. Tile Algebra Notation

### 2.1 Basic Tile Definition

| Symbol | Meaning | Example |
|--------|---------|---------|
| $T = (I, O, f, c, \tau)$ | Tile tuple | $T: A \to B$ |
| $I, O$ | Input/output types (schemas) | $I \subseteq \mathcal{X}$ |
| $f: I \to O$ | Discrimination function | $f(x) = \text{classify}(x)$ |
| $c: I \to [0,1]$ | Confidence function | $c(x) = 0.85$ |
| $\tau: I \to \text{String}$ | Trace function | $\tau(x) = \text{"reasoning"}$ |
| $\mathcal{T}$ | Space of all tiles | $T \in \mathcal{T}$ |

### 2.2 Composition Operators

| Symbol | Operation | Meaning |
|--------|-----------|---------|
| $T_1 ; T_2$ | Sequential composition | Output of $T_1$ to input of $T_2$ |
| $T_1 \| T_2$ | Parallel composition | Independent processing |
| $T_1 \otimes T_2$ | Tensor composition | Combined state spaces |
| $T_1 \oplus T_2$ | Direct sum | Independent subspaces |
| $T_1 \circ T_2$ | Alternative for sequential | Same as $T_1 ; T_2$ |
| $\text{id}_A$ | Identity tile for type $A$ | $\text{id}_A ; T = T$ |

### 2.3 Tile Properties

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\text{dom}(T)$ | Domain (input type) of $T$ | $\text{dom}(T) = I$ |
| $\text{cod}(T)$ | Codomain (output type) of $T$ | $\text{cod}(T) = O$ |
| $\text{zone}(T)$ | Confidence zone | $\text{zone}(T) \in \{\text{G,Y,R}\}$ |
| $\text{conf}(T,x)$ | Confidence of $T$ on input $x$ | $\text{conf}(T,x) = c(x)$ |
| $\text{trace}(T,x)$ | Trace of $T$ on input $x$ | $\text{trace}(T,x) = \tau(x)$ |

### 2.4 Tile Categories

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\mathbf{Tile}$ | Category of tiles | Objects: types, Morphisms: tiles |
| $\text{Hom}(A,B)$ | Set of tiles from $A$ to $B$ | $T \in \text{Hom}(A,B)$ |
| $\mathbf{ProbTile}$ | Category with confidence | Enriched over $[0,1]$ |

---

## 3. SuperInstance Notation

### 3.1 Core SuperInstance

| Symbol | Meaning | Example |
|--------|---------|---------|
| $S = (O, D, T, \Phi)$ | SuperInstance tuple | |
| $O$ | Origin domain (reference frame) | $O = (\mathbb{R}^3, \text{basis})$ |
| $D$ | Data manifold | $D$ smooth manifold |
| $T$ | Time domain | $T = \mathbb{R}_{\geq 0}$ |
| $\Phi: T \times D \times O \to D \times O$ | Evolution operator | $\Phi(t, d, o)$ |
| $\mathcal{S}$ | Space of SuperInstances | $S \in \mathcal{S}$ |

### 3.2 Cell Types and States

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\mathcal{C}$ | Cell type space | $\mathcal{C} = \{\text{data}, \text{process}, \ldots\}$ |
| $C \in \mathcal{C}$ | Cell type | $C = \text{agent}$ |
| $\mathcal{S}_C$ | State space for type $C$ | $\mathcal{S}_{\text{data}} = \mathbb{R}^n$ |
| $s \in \mathcal{S}_C$ | Cell state | $s = \text{running}$ |
| $\mathcal{I}_C, \mathcal{O}_C$ | Input/output spaces for type $C$ | |

### 3.3 Cell Operations

| Symbol | Meaning | Example |
|--------|---------|---------|
| $f_C: \mathcal{S}_C \times \mathcal{I}_C \to \mathcal{S}_C \times \mathcal{O}_C$ | Transition function | |
| $r_C: \mathcal{S}_C \to \mathbb{R}^n$ | Rate function | $r_C(s) = \text{rate vector}$ |
| $C_1 \to C_2$ | Cell type transition | $\text{data} \to \text{process}$ |
| $C_1 \parallel C_2$ | Parallel cells | Independent operation |

### 3.4 Origin Frames

| Symbol | Meaning | Example |
|--------|---------|---------|
| $F_P = (\mathbb{R}^3, \{\hat{e}_i^P\}, O_P)$ | Origin frame for cell $P$ | |
| $\mathbf{x}_Q^P$ | Position of $Q$ in frame $F_P$ | $\mathbf{x}_Q^P = \mathbf{x}_Q - \mathbf{x}_P$ |
| $\mathbf{v}_Q^P$ | Velocity of $Q$ in frame $F_P$ | $\mathbf{v}_Q^P = \dot{\mathbf{x}}_Q^P$ |
| $R_{PQ} \in SO(3)$ | Rotation from $F_P$ to $F_Q$ | |
| $\mathbf{t}_{PQ} \in \mathbb{R}^3$ | Translation from $F_P$ to $F_Q$ | |
| $SE(3)$ | Special Euclidean group | $SE(3) = SO(3) \ltimes \mathbb{R}^3$ |

---

## 4. Confidence Cascade Notation

### 4.1 Confidence Measures

| Symbol | Meaning | Example |
|--------|---------|---------|
| $c: X \to [0,1]$ | Confidence function | $c(x) = 0.85$ |
| $C: \mathcal{E} \to [0,1]$ | Confidence measure on events | $C(E)$ |
| $\mathbb{P}$ | Probability measure | $\mathbb{P}(A)$ |
| $\mathbb{E}$ | Expectation | $\mathbb{E}[X]$ |
| $\text{Var}$ | Variance | $\text{Var}(X)$ |

### 4.2 Composition Rules

| Symbol | Meaning | Example |
|--------|---------|---------|
| $c_{1;2}(x) = c_1(x) \cdot c_2(f_1(x))$ | Sequential confidence | |
| $c_{1\|2}(x_1,x_2) = w_1 c_1(x_1) + w_2 c_2(x_2)$ | Parallel confidence | |
| $c_{\text{cond}}(x) = c_R(x) \cdot c_P(f_R(x))$ | Conditional confidence | |
| $\prod_{i=1}^n c_i$ | Product confidence (chain) | |
| $\sum w_i c_i$ | Weighted average confidence | |

### 4.3 Confidence Zones

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\text{GREEN} = [0.90, 1.00]$ | Green zone | Automatic processing |
| $\text{YELLOW} = [0.75, 0.90)$ | Yellow zone | Review required |
| $\text{RED} = [0.00, 0.75)$ | Red zone | Human intervention |
| $\text{zone}: [0,1] \to \{\text{G,Y,R}\}$ | Zone function | $\text{zone}(0.85) = \text{Y}$ |
| $\preceq$ | Zone order | $\text{R} \preceq \text{Y} \preceq \text{G}$ |

### 4.4 Confidence Flow Networks

| Symbol | Meaning | Example |
|--------|---------|---------|
| $G = (V, E, C, W)$ | Confidence flow network | |
| $V$ | Vertices (tiles) | $v \in V$ |
| $E \subseteq V \times V$ | Edges (dependencies) | $(u,v) \in E$ |
| $C: V \to [0,1]$ | Vertex confidence function | $C(v)$ |
| $W: E \to [0,1]$ | Edge weight function | $W(e)$ |
| $\Pi(v)$ | Set of paths to $v$ | $\pi \in \Pi(v)$ |
| $C(\pi)$ | Confidence of path $\pi$ | $C(\pi) = \prod$ |

---

## 5. Rate-Based Change Notation

### 5.1 Rate Functions

| Symbol | Meaning | Example |
|--------|---------|---------|
| $x: T \to \mathbb{R}^n$ | State function | $x(t)$ |
| $r: T \to \mathbb{R}^n$ | Rate function | $r(t) = \dot{x}(t)$ |
| $\dot{x}$ | Time derivative | $\dot{x}(t) = \frac{dx}{dt}$ |
| $\ddot{x}$ | Second derivative | $\ddot{x}(t)$ |
| $x^{(k)}$ | $k$-th derivative | $x^{(3)}(t) = \dddot{x}(t)$ |
| $r^{(k)}$ | $k$-th order rate | $r^{(0)} = x$, $r^{(1)} = \dot{x}$ |

### 5.2 Rate-State Relations

| Symbol | Meaning | Example |
|--------|---------|---------|
| $x(t) = x_0 + \int_0^t r(\tau) d\tau$ | Rate integration | |
| $r(t) = \dot{x}(t)$ | Rate as derivative | |
| $\Psi: \mathcal{R} \to \mathcal{X}$ | Rate-state map | $\Psi(r)(t) = x_0 + \int_0^t r$ |
| $\mathcal{R} = L^1([0,T], \mathbb{R}^n)$ | Space of rate functions | |
| $\mathcal{X} = AC([0,T], \mathbb{R}^n)$ | Space of state functions | |

### 5.3 Prediction and Error

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\hat{x}(t+\Delta t)$ | Predicted state | $\hat{x}(t+\Delta t) = x(t) + r(t)\Delta t$ |
| $e(t)$ | Prediction error | $e(t) = \|\hat{x}(t) - x(t)\|$ |
| $M$ | Bound on acceleration | $\|\ddot{x}(t)\| \leq M$ |
| $\epsilon(\Delta t)$ | Error bound | $\epsilon(\Delta t) \leq \frac{M}{2}(\Delta t)^2$ |

---

## 6. Geometric Tensor Notation

### 6.1 LOG Tensors (Ledger-Orienting-Graph)

| Symbol | Meaning | Example |
|--------|---------|---------|
| $T = (A, G, \mathcal{M}, \nabla)$ | LOG tensor | $T$: data array $A$, graph $G$, metric $\mathcal{M}$, connection $\nabla$ |
| $G = (V, E, w)$ | Underlying graph | $V$: vertices, $E$: edges, $w$: weights |
| $\mathcal{M}: V \to \text{SO}(n)$ | Metric assignment | $\mathcal{M}_v$: metric at vertex $v$ |
| $\nabla: E \to \text{GL}(n)$ | Connection assignment | $\nabla_e$: parallel transport along edge $e$ |
| $\bullet_G$ | Geometric contraction | $T_1 \bullet_G T_2$: contraction respecting graph $G$ |
| $\text{geom-cons}(T)$ | Geometric consistency | Measure 0-1 of Definition 1.2 satisfaction |

### 6.2 Pythagorean Geometry

| Symbol | Meaning | Example |
|--------|---------|---------|
| $(a,b,c)$ | Pythagorean triple | $3^2 + 4^2 = 5^2$ |
| $(a_1,\ldots,a_n,c)$ | nD Pythagorean tuple | $\sum a_i^2 = c^2$ |
| $\theta_{a,b,c}$ | Pythagorean angle | $\theta_{3,4,5} \approx 36.87^\circ$ |
| $\Theta_P$ | Set of Pythagorean angles | $\{\theta_{3,4,5}, \theta_{5,12,13}, \ldots\}$ |
| $\mathcal{P}_n$ | Set of nD Pythagorean tuples | $(1,2,2,3) \in \mathcal{P}_3$ |
| $S^{n-1} \cap \mathbb{Q}^n$ | Rational points on n-sphere | Pythagorean tuples up to scaling |

### 6.3 Tensors and Transformations

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\mathbf{T}$ | Tensor | $\mathbf{T} \in \mathbb{R}^{n_1 \times \cdots \times n_k}$ |
| $\|\mathbf{T}\|$ | Tensor norm | Frobenius norm |
| $R \in SO(n)$ | Rotation matrix | $R^\top R = I$, $\det(R) = 1$ |
| $O(n)$ | Orthogonal group | $O(n) = \{R: R^\top R = I\}$ |
| $SO(n)$ | Special orthogonal group | $SO(n) = \{R \in O(n): \det(R) = 1\}$ |
| $SE(n)$ | Special Euclidean group | $SE(n) = SO(n) \ltimes \mathbb{R}^n$ |
| $\otimes$ | Tensor product | $\mathbf{u} \otimes \mathbf{v}$ |
| $\odot$ | Hadamard (element-wise) product | |
| $\oplus$ | Direct sum | $V \oplus W$ |

### 6.4 Wigner-D Harmonics and Representation Theory

| Symbol | Meaning | Example |
|--------|---------|---------|
| $D^j_{mm'}(R)$ | Wigner-D matrix element | $j \in \frac{1}{2}\mathbb{Z}_{\geq 0}$, $m,m' \in \{-j,\ldots,j\}$ |
| $D^j_{mm'}(\alpha,\beta,\gamma)$ | Wigner-D in Euler angles | $\alpha,\beta,\gamma$: Euler angles |
| $Y^m_l(\theta,\phi)$ | Spherical harmonic | Degree $l$, order $m$ |
| $\rho_j: SO(3) \to \text{GL}(2j+1)$ | Spin-$j$ representation | $\rho_j(R)$ acts on rank-$2j$ symmetric traceless tensors |
| $T^{(j)}_m$ | Spherical tensor operator | Rank $2j$, component $m$ |
| $[j]$ | Irreducible representation | Notation for spin-$j$ irrep of $SO(3)$ |
| $\mathfrak{so}(3)$ | Lie algebra of $SO(3)$ | Generators: $J_x, J_y, J_z$ |

### 6.5 Geometric Operations and Properties

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\text{closest-pythagorean}(\theta)$ | Find closest Pythagorean angle | Returns $\theta_p \in \Theta_P$ minimizing $|\theta - \theta_p|$ |
| $\text{pythagorean-approx}(R)$ | Pythagorean approximation of rotation | $R \approx R_p$ with Pythagorean Euler angles |
| $\text{geometric-decompose}(T)$ | Decompose tensor into irreps | $T = \bigoplus_j T^{(j)}$ |
| $\kappa(G)$ | Graph condition number | Measures numerical stability of graph operations |
| $\text{reality-bending-coords}(M)$ | Find coordinates simplifying geometry | On manifold $M$, find coordinates with Pythagorean metric |

### 6.6 SuperInstance Geometric Cells

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\tau_{\text{geom}}$ | Geometric tensor cell type | Cell with LOG tensor state |
| $\mathcal{S}_{\text{geom}}$ | State space for geometric cells | $\{\text{LOG tensors with geometric consistency}\}$ |
| $f_{\text{geom}}$ | Geometric cell transition | $f_{\text{geom}}(T, \text{op}) = \text{op} \bullet_G T$ |
| $r_{\text{geom}}$ | Geometric cell rate | $r_{\text{geom}}(T) = (\text{curvature}, \text{symmetry}, \text{dimension})$ |
| $c_{\text{geom}}$ | Geometric confidence | $c_{\text{geom}}(T) = \exp(-\|\text{inconsistency}(T)\|^2/2\sigma^2)$ |

---

## 7. Function Spaces

### 7.1 Standard Function Spaces

| Symbol | Meaning | Norm |
|--------|---------|------|
| $C([a,b], \mathbb{R}^n)$ | Continuous functions | $\|f\|_\infty = \sup |f(t)|$ |
| $L^p([a,b], \mathbb{R}^n)$ | Lebesgue $p$-integrable | $\|f\|_p = (\int |f|^p)^{1/p}$ |
| $L^\infty([a,b], \mathbb{R}^n)$ | Essentially bounded | $\|f\|_\infty = \text{ess sup} |f|$ |
| $AC([a,b], \mathbb{R}^n)$ | Absolutely continuous | $\|f\|_{AC} = \|f\|_\infty + \|\dot{f}\|_1$ |
| $W^{k,p}([a,b], \mathbb{R}^n)$ | Sobolev space | $\|f\|_{k,p} = \sum_{i=0}^k \|f^{(i)}\|_p$ |
| $C^k([a,b], \mathbb{R}^n)$ | $k$-times continuously differentiable | $\|f\|_{C^k} = \sum_{i=0}^k \|f^{(i)}\|_\infty$ |

### 7.2 Operator Norms

| Symbol | Meaning | Definition |
|--------|---------|------------|
| $\|T\|$ | Operator norm | $\|T\| = \sup_{\|x\|=1} \|T(x)\|$ |
| $\|T\|_{\text{Lip}}$ | Lipschitz constant | Smallest $L$ with $\|T(x)-T(y)\| \leq L\|x-y\|$ |
| $\|T\|_{\text{op}}$ | Alternative for operator norm | Same as $\|T\|$ |

### 7.3 Special Functions

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\text{id}_X$ | Identity function on $X$ | $\text{id}_X(x) = x$ |
| $\chi_A$ | Characteristic function of $A$ | $\chi_A(x) = 1$ if $x \in A$ |
| $\delta_{ij}$ | Kronecker delta | $\delta_{ij} = 1$ if $i=j$, else $0$ |
| $\text{sgn}$ | Sign function | $\text{sgn}(x) = x/|x|$ for $x \neq 0$ |

---

## 8. Graph Theory

### 8.1 Basic Graph Notation

| Symbol | Meaning | Example |
|--------|---------|---------|
| $G = (V,E)$ | Graph with vertices $V$, edges $E$ | |
| $|V|, |E|$ | Number of vertices/edges | $n = |V|$, $m = |E|$ |
| $v \in V$ | Vertex | |
| $e = (u,v) \in E$ | Directed edge from $u$ to $v$ | |
| $N^+(v)$ | Out-neighbors of $v$ | $N^+(v) = \{u: (v,u) \in E\}$ |
| $N^-(v)$ | In-neighbors of $v$ | $N^-(v) = \{u: (u,v) \in E\}$ |
| $\deg(v)$ | Degree of vertex $v$ | $\deg(v) = |N^+(v)| + |N^-(v)|$ |

### 8.2 Paths and Connectivity

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\pi = [v_1, v_2, \ldots, v_k]$ | Path (sequence of vertices) | |
| $|\pi|$ | Length of path (number of edges) | $|\pi| = k-1$ |
| $\Pi_{uv}$ | Set of all paths from $u$ to $v$ | $\pi \in \Pi_{uv}$ |
| $d(u,v)$ | Distance (shortest path length) | |
| $\text{diam}(G)$ | Diameter of graph | $\max_{u,v} d(u,v)$ |

### 8.3 Graph Properties

| Symbol | Meaning | Example |
|--------|---------|---------|
| $G^\top$ | Transpose graph (reverse edges) | |
| $G[S]$ | Induced subgraph on vertex set $S$ | |
| $G \cup H$ | Graph union | |
| $G \cap H$ | Graph intersection | |
| $\overline{G}$ | Complement graph | |

---

## 9. Type Theory

### 9.1 Basic Type Notation

| Symbol | Meaning | Example |
|--------|---------|---------|
| $A, B, C$ | Types | $\text{String}$, $\text{Number}$ |
| $x: A$ | $x$ has type $A$ | $x: \mathbb{R}$ |
| $A \to B$ | Function type from $A$ to $B$ | $f: A \to B$ |
| $A \times B$ | Product type | $(a,b): A \times B$ |
| $A + B$ | Sum type (coproduct) | |
| $\Pi_{x:A} B(x)$ | Dependent product type | |
| $\Sigma_{x:A} B(x)$ | Dependent sum type | |

### 9.2 Type Constructors

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\text{List}(A)$ | List of $A$ | $[a_1, a_2, \ldots]$ |
| $\text{Option}(A)$ | Optional $A$ (maybe type) | $\text{Some}(a)$ or $\text{None}$ |
| $\text{Either}(A,B)$ | Either $A$ or $B$ | $\text{Left}(a)$ or $\text{Right}(b)$ |
| $\text{Map}(K,V)$ | Map from $K$ to $V$ | $\{k_1: v_1, k_2: v_2\}$ |

### 9.3 Type Classes

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\text{Monoid}(A)$ | Type $A$ with monoid structure | |
| $\text{Group}(A)$ | Type $A$ with group structure | |
| $\text{Ring}(A)$ | Type $A$ with ring structure | |
| $\text{VectorSpace}(A)$ | Type $A$ with vector space structure | |

---

## 10. Miscellaneous

### 10.1 Asymptotic Notation

| Symbol | Meaning | Example |
|--------|---------|---------|
| $O(f(n))$ | Big O notation | $n^2 + n = O(n^2)$ |
| $\Omega(f(n))$ | Big Omega notation | $n^2 = \Omega(n)$ |
| $\Theta(f(n))$ | Big Theta notation | $3n^2 + 2n = \Theta(n^2)$ |
| $o(f(n))$ | Little o notation | $n = o(n^2)$ |
| $\omega(f(n))$ | Little omega notation | $n^2 = \omega(n)$ |

### 10.2 Calculus and Analysis

| Symbol | Meaning | Example |
|--------|---------|---------|
| $\frac{df}{dx}$ | Derivative | $\frac{d}{dx} x^2 = 2x$ |
| $\partial_x f$ | Partial derivative | $\partial_x f(x,y)$ |
| $\nabla f$ | Gradient | $\nabla f = (\partial_x f, \partial_y f)$ |
| $\nabla \cdot \mathbf{F}$ | Divergence | |
| $\nabla \times \mathbf{F}$ | Curl | |
| $\int_a^b f(x) dx$ | Definite integral | |
| $\oint_C \mathbf{F} \cdot d\mathbf{r}$ | Line integral | |
| $\iint_S \mathbf{F} \cdot d\mathbf{S}$ | Surface integral | |

### 10.3 Linear Algebra

| Symbol | Meaning | Example |
|--------|---------|---------|
| $A, B, C$ | Matrices | $A \in \mathbb{R}^{m \times n}$ |
| $A_{ij}$ | $(i,j)$-th entry of $A$ | |
| $A^\top$ | Transpose of $A$ | |
| $A^{-1}$ | Inverse of $A$ | |
| $\det(A)$ | Determinant of $A$ | |
| $\text{tr}(A)$ | Trace of $A$ | $\text{tr}(A) = \sum A_{ii}$ |
| $\text{rank}(A)$ | Rank of $A$ | |
| $\lambda$ | Eigenvalue | $A\mathbf{v} = \lambda \mathbf{v}$ |
| $\mathbf{v}$ | Eigenvector | |

### 10.4 Special Constants

| Symbol | Meaning | Value |
|--------|---------|-------|
| $\pi$ | Pi | 3.14159... |
| $e$ | Euler's number | 2.71828... |
| $i$ | Imaginary unit | $\sqrt{-1}$ |
| $\gamma$ | Euler-Mascheroni constant | 0.57721... |

---

## Usage Guidelines

1. **Consistency:** Use this notation consistently across all white papers
2. **Definitions:** Define non-standard notation when first used
3. **Clarity:** Prefer clarity over brevity in mathematical writing
4. **Proofs:** Use standard proof notation (∎ for QED, □ for end of proof)
5. **References:** Cite this guide in papers using this notation

## Updates

This notation guide is version 1.1. Updates will be versioned and changes documented.

**Version 1.1 (2026-03-11) Updates:**
- Added comprehensive LOG tensor notation (Section 6.1)
- Extended Pythagorean geometry to nD tuples (Section 6.2)
- Added Wigner-D harmonics and representation theory notation (Section 6.4)
- Added geometric operations and properties (Section 6.5)
- Added SuperInstance geometric cells notation (Section 6.6)

**Version 1.0 (2026-03-11):** Initial release

**Status:** Official standard for POLLN research papers
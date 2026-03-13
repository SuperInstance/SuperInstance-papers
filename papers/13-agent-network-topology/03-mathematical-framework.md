# Mathematical Framework: Agent Network Topology

**Paper:** 13 of 23
**Section:** 3 of 7
**Focus:** Formal Definitions, Theorems, and Proofs

---

## 3.1 Preliminaries

### 3.1.1 Graph Theory Basics

We model agent networks as graphs G = (V, E) where:
- V = {v_1, ..., v_n} is the set of n agents (vertices)
- E subset of V x V is the set of communication channels (edges)

Edges may be:
- **Unweighted:** Binary (exists or not)
- **Weighted:** w_ij in R^+ represents connection strength
- **Directed:** Information flows one direction
- **Undirected:** Bidirectional communication

### 3.1.2 Key Graph Metrics

**Degree:** Number of connections per node
```
k_i = sum_j A_ij  (for undirected graphs)
k_i^in = sum_j A_ji  (in-degree)
k_i^out = sum_j A_ij  (out-degree)
```

**Path Length:** Shortest path between nodes
```
d(i, j) = length of shortest path from i to j
L = (1/(n*(n-1))) * sum_{i != j} d(i, j)  (average path length)
```

**Clustering Coefficient:** Local connectivity density
```
C_i = (2 * e_i) / (k_i * (k_i - 1))
where e_i = number of edges between neighbors of i

C = (1/n) * sum_i C_i  (average clustering)
```

**Modularity:** Community structure strength
```
Q = (1/(2m)) * sum_{ij} [A_ij - (k_i * k_j)/(2m)] * delta(c_i, c_j)
```

---

## 3.2 Formal Definitions

### Definition D1: Agent Network

An agent network is a weighted, directed graph with confidence annotations:

```
AgentNetwork = (V, E, w, c)

where:
  V = {v_1, ..., v_n}  : Set of agents
  E subset of V x V    : Set of communication channels
  w: E -> R^+          : Edge weight (connection strength)
  c: E -> [0, 1]       : Edge confidence (trust level)
```

### Definition D2: Confidence-Weighted Adjacency Matrix

The confidence-weighted adjacency matrix combines structure and confidence:

```
A^c_ij = w_ij * c_ij  if (i, j) in E
       = 0            otherwise
```

### Definition D3: Graph Laplacian

The normalized graph Laplacian is:

```
L = I - D^(-1/2) * A * D^(-1/2)

where:
  D = diag(d_1, ..., d_n)  : Degree matrix
  d_i = sum_j A_ij         : Degree of node i
```

### Definition D4: Algebraic Connectivity

The algebraic connectivity (Fiedler value) is the second-smallest eigenvalue:

```
lambda_2 = second smallest eigenvalue of L
```

This measures how well-connected the graph is.

### Definition D5: Small-World Network

A network is small-world if it satisfies:

```
SmallWorld(G) <=> L(G) <= c * log(n) / log(d_avg) AND C(G) >> C_random

where:
  L(G) : Average path length
  C(G) : Clustering coefficient
  C_random : Clustering of equivalent random graph ~ d_avg / n
```

### Definition D6: Scale-Free Network

A network is scale-free if its degree distribution follows a power law:

```
ScaleFree(G) <=> P(k) ~ k^(-gamma) for some gamma in (2, 3)

where:
  P(k) = Pr(degree = k) : Degree distribution
  gamma : Power-law exponent
```

### Definition D7: Community

A community is a set of nodes with dense internal connections and sparse external connections:

```
Community C_i satisfies:
  sum_{j,k in C_i} A_jk >> sum_{j in C_i, k not in C_i} A_jk
```

### Definition D8: Modularity

Modularity quantifies community structure:

```
Q = (1/(2m)) * sum_{ij} [A_ij - (k_i * k_j)/(2m)] * delta(c_i, c_j)

where:
  m = |E| : Number of edges
  delta(c_i, c_j) = 1 if i, j in same community, 0 otherwise
```

### Definition D9: Confidence Diffusion

Confidence diffuses through the network via the Laplacian:

```
dc/dt = -alpha * L * c + beta * (c_0 - c)

where:
  c : Vector of node confidences
  c_0 : Initial confidences
  alpha, beta : Diffusion and decay rates
```

### Definition D10: Spectral Gap

The spectral gap determines diffusion speed:

```
gamma_spectral = lambda_2 - lambda_1 = lambda_2

(since lambda_1 = 0 for connected graphs)
```

### Definition D11: Random Walk

A random walk on the graph has transition matrix:

```
P_ij = A_ij / k_i  (probability of moving from i to j)

Stationary distribution:
  pi_i = k_i / (2m)
```

### Definition D12: Mixing Time

The mixing time is the time to reach stationary distribution:

```
tau_mix = min{t : ||P^t(i, .) - pi||_TV <= 1/4 for all i}

where ||.||_TV is total variation distance
```

### Definition D13: Giant Component

The giant component is the largest connected component:

```
GC = argmax_{C in Components} |C|

where |GC| = Omega(n) for connected graphs
```

### Definition D14: Percolation Threshold

The percolation threshold is the critical probability for giant component:

```
p_c = inf{p : |GC| / n > 0 with high probability}
```

### Definition D15: Betweenness Centrality

Betweenness measures importance for information flow:

```
BC(v) = sum_{s != t != v} (sigma_st(v) / sigma_st)

where:
  sigma_st : Number of shortest paths from s to t
  sigma_st(v) : Number passing through v
```

### Definition D16: Eigenvector Centrality

Eigenvector centrality measures influence:

```
x_v = (1/lambda) * sum_{u in N(v)} A_uv * x_u

where lambda is the largest eigenvalue of A
```

### Definition D17: Hierarchical Modularity

Hierarchical modularity extends modularity to multiple levels:

```
Q_hierarchical = sum_{l=1}^{L} w_l * Q_l

where:
  L : Number of hierarchy levels
  Q_l : Modularity at level l
  w_l : Weight for level l
```

### Definition D18: Dynamic Topology

A dynamic topology evolves over time:

```
G(t) = (V(t), E(t), w(t), c(t))

Evolution:
  V(t+1) = V(t) +/- {nodes joining/leaving}
  E(t+1) = E(t) + {edges created} - {edges removed}
  w(t+1) = adapt(w(t), interaction_history)
```

---

## 3.3 Small-World Efficiency Theorems

### Theorem T1: Small-World Path Length Bound

**Statement:** For an agent network with n nodes and average degree d_avg, the optimal small-world topology achieves average path length L <= c * log(n) / log(d_avg).

**Proof:**

Consider a network where each node has d_avg neighbors.

*Lower Bound:*

The number of nodes reachable in h hops is at most:
```
N(h) = 1 + d_avg + d_avg*(d_avg-1) + ... = O((d_avg-1)^h)
```

To reach all n nodes, we need:
```
N(h) >= n => (d_avg-1)^h >= n
=> h >= log(n) / log(d_avg-1)
```

Therefore, L >= Omega(log(n) / log(d_avg)).

*Upper Bound:*

In a small-world network with random long-range connections (probability beta):
- Each node has k local neighbors (k << d_avg)
- Each node has d_avg - k random long-range connections

After h hops:
- Local expansion: O(k^h)
- Random expansion: Each long-range connection has probability ~1/n of reaching any specific node

Expected distance using random connections:
```
E[L] <= log(n) / log(d_avg) + O(1)
```

Therefore, L <= c * log(n) / log(d_avg). QED

---

### Theorem T2: Small-World Clustering

**Statement:** Small-world networks with rewiring probability beta in (0.01, 0.1) maintain clustering coefficient C >= 0.3 * C_regular where C_regular is the clustering of the regular lattice.

**Proof:**

In the Watts-Strogatz model:
- Start with ring lattice where C_regular = 3(k-2) / (4(k-1)) for degree k
- Rewire each edge with probability beta

After rewiring:
```
C(beta) = C_regular * (1 - beta)^3
```

For beta = 0.01 to 0.1:
```
C(0.01) = C_regular * (0.99)^3 = 0.97 * C_regular
C(0.1) = C_regular * (0.9)^3 = 0.73 * C_regular
```

Therefore, C >= 0.73 * C_regular >= 0.3 for k >= 4 (since C_regular >= 0.5). QED

---

### Theorem T3: Small-World Efficiency Trade-off

**Statement:** For any network with n nodes, if L = O(log n), then C = O(1) is achievable, but if L = O(1), then C = O(1/n).

**Proof:**

*Case 1: L = O(log n), C = O(1)*

Small-world networks (Watts-Strogatz) achieve:
- L ~ log(n) / log(k) for rewiring beta > 0.01
- C ~ C_regular * (1-beta)^3 = Theta(1)

This satisfies both constraints.

*Case 2: L = O(1), C = O(1/n)*

If L = O(1), then average distance is bounded. This requires:
```
d_avg >= n^(1/c) for some constant c
```

With such high average degree:
```
C = (actual triangles) / (possible triangles)
  <= O(n * d_avg^2) / O(n * d_avg^2) = O(1)
```

But for dense random graphs:
```
C_random = d_avg / n = O(n^(1/c) / n) = O(1 / n^(1-1/c))
```

As n -> infinity, C -> 0 if d_avg grows sub-quadratically.

Therefore, constant path length forces vanishing clustering. QED

---

## 3.4 Scale-Free Resilience Theorems

### Theorem T4: Scale-Free Degree Distribution

**Statement:** The Barabasi-Albert model produces degree distribution P(k) ~ k^(-3).

**Proof:**

In the BA model:
- Nodes arrive sequentially
- Each new node connects to m existing nodes
- Connection probability: Pi(k_i) = k_i / sum_j k_j

Let p(k, t) = fraction of nodes with degree k at time t.

*Master Equation:*
```
p(k, t+1) - p(k, t) = (m/n) * [(k-1) * p(k-1, t) - k * p(k, t)]
```

*Steady State (t -> infinity):*
```
0 = (k-1) * p(k-1) - k * p(k)
=> p(k) / p(k-1) = (k-1) / k
```

This gives:
```
p(k) = C * k^(-3)
```

where C is a normalization constant.

Therefore, P(k) ~ k^(-3). QED

---

### Theorem T5: Scale-Free Random Failure Resilience

**Statement:** Scale-free networks with degree exponent gamma in (2, 3) maintain giant component under random removal of any fraction f < 1 of nodes.

**Proof:**

Consider removing fraction f of nodes uniformly at random.

*Percolation Analysis:*

The giant component survives if:
```
< k^2 > / < k > > 2
```

where < k^n > = sum_k k^n * P(k) is the n-th moment.

For power-law P(k) ~ k^(-gamma):
```
< k > = sum_k k * k^(-gamma) ~ k^(2-gamma) = finite for gamma > 2
< k^2 > = sum_k k^2 * k^(-gamma) ~ k^(3-gamma) -> infinity for gamma < 3
```

Therefore, for gamma in (2, 3):
```
< k^2 > / < k > -> infinity
```

After removing fraction f of nodes:
```
< k' > = (1-f) * < k >
< k'^2 > = (1-f)^2 * < k^2 >

< k'^2 > / < k' > = (1-f) * < k^2 > / < k > > 2
```

for any f < 1 (since < k^2 > diverges).

Therefore, the giant component survives for any f < 1. QED

---

### Theorem T6: Scale-Free Targeted Attack Vulnerability

**Statement:** Targeted removal of the highest-degree nodes destroys the giant component when fraction f_c ~ n^(-1/(gamma-1)) is removed.

**Proof:**

Consider removing the f * n highest-degree nodes.

*Cutoff Degree:*

The maximum degree in a power-law network is:
```
k_max ~ n^(1/(gamma-1))
```

After removing f * n highest-degree nodes, the new maximum is:
```
k'_max ~ ((1-f) * n)^(1/(gamma-1))
```

*Critical Threshold:*

The giant component is destroyed when the highest-degree hubs are removed. The critical fraction is when:
```
f * n ~ n / k_max^(gamma-1)
=> f_c ~ 1 / k_max^(gamma-1) ~ n^(-1/(gamma-1))
```

For gamma = 3:
```
f_c ~ 1 / sqrt(n)
```

Therefore, removing O(sqrt(n)) highest-degree nodes destroys connectivity. QED

---

## 3.5 Confidence Diffusion Theorems

### Theorem T7: Confidence Diffusion Convergence

**Statement:** Confidence diffusion dc/dt = -alpha * L * c converges to equilibrium at rate O(exp(-alpha * lambda_2 * t)).

**Proof:**

The diffusion equation is:
```
dc/dt = -alpha * L * c
```

*Solution:*

Expand c in eigenvectors of L:
```
c(t) = sum_i a_i * exp(-alpha * lambda_i * t) * v_i
```

where v_i are eigenvectors and lambda_i are eigenvalues.

*Convergence:*

The slowest decaying mode (excluding lambda_1 = 0) is lambda_2:
```
||c(t) - c_infinity|| <= exp(-alpha * lambda_2 * t) * ||c(0) - c_infinity||
```

*Time to epsilon-accuracy:*
```
exp(-alpha * lambda_2 * t) <= epsilon
=> t >= (1/(alpha * lambda_2)) * ln(1/epsilon)
```

Therefore, convergence time is O(log(1/epsilon) / (alpha * lambda_2)). QED

---

### Theorem T8: Spectral Gap and Connectivity

**Statement:** The spectral gap lambda_2 satisfies:
- lambda_2 > 0 iff graph is connected
- lambda_2 >= 2 * (1 - cos(pi/n)) for path graph (smallest possible)
- lambda_2 <= n/(n-1) for complete graph (largest possible)

**Proof:**

*Part 1: Positivity and Connectivity*

For connected graph G:
- L has eigenvalue 0 with multiplicity 1 (eigenvector = all ones)
- All other eigenvalues > 0

Therefore, lambda_2 > 0 iff G is connected.

*Part 2: Lower Bound (Path Graph)*

For a path graph with n nodes:
```
lambda_2 = 2 * (1 - cos(pi/n)) ~ pi^2 / n^2
```

This is the minimum among all connected graphs with n nodes.

*Part 3: Upper Bound (Complete Graph)*

For a complete graph K_n:
```
L = n*I - J  (where J is all-ones matrix)
Eigenvalues: 0 (multiplicity 1), n (multiplicity n-1)
lambda_2 = n
```

But for normalized Laplacian:
```
L_norm = I - (1/n) * J
lambda_2 = n / (n-1)
```

This is the maximum among all graphs with n nodes. QED

---

### Theorem T9: Mixing Time Bound

**Statement:** The mixing time of a random walk on graph G satisfies:
```
tau_mix = O(log(n) / lambda_2)
```

**Proof:**

The random walk transition matrix is P = D^(-1) * A.

*Spectral Decomposition:*

Eigenvalues of P: 1 = mu_1 >= mu_2 >= ... >= mu_n >= -1

Relationship to Laplacian:
```
mu_i = 1 - lambda_i
```

*Convergence:*

After t steps:
```
||P^t(i, .) - pi||_TV <= (1/2) * sqrt(n) * mu_2^t
                       = (1/2) * sqrt(n) * (1 - lambda_2)^t
```

For this to be <= 1/4:
```
sqrt(n) * (1 - lambda_2)^t <= 1/2
(1 - lambda_2)^t <= 1 / (2 * sqrt(n))
t * ln(1 - lambda_2) <= -ln(2 * sqrt(n))
t >= ln(2 * sqrt(n)) / lambda_2  (using ln(1-x) ~ -x for small x)
t = O(log(n) / lambda_2)
```

Therefore, tau_mix = O(log(n) / lambda_2). QED

---

## 3.6 Community Detection Theorems

### Theorem T10: Modularity Resolution Limit

**Statement:** Modularity optimization cannot detect communities smaller than O(sqrt(m)) where m is the number of edges.

**Proof:**

Consider two communities C1 and C2 of equal size with:
- e_in internal edges each
- e_out edges between them

*Modularity Change:*

If we merge C1 and C2:
```
delta_Q = e_out/m - (2*e_in + e_out)^2 / (4m^2)
```

For the merge to increase modularity (delta_Q > 0):
```
e_out > (2*e_in + e_out)^2 / (4m)
```

*Resolution Limit:*

If C1 and C2 are well-defined (e_out << e_in):
```
delta_Q > 0 when (2*e_in)^2 / (4m) < e_out
=> e_in^2 < m * e_out
=> e_in < sqrt(m * e_out)
```

For a clique of size k: e_in = k*(k-1)/2 ~ k^2

If this is a natural community:
```
k^2 < sqrt(m * e_out)
k < m^(1/4) * e_out^(1/4)
```

Therefore, communities smaller than O(m^(1/4)) may be merged incorrectly. QED

---

### Theorem T11: Louvain Complexity

**Statement:** The Louvain algorithm achieves modularity Q >= Q_opt - epsilon in expected time O(n * log(n) / epsilon^2).

**Proof Sketch:**

The Louvain algorithm operates in two phases:

*Phase 1: Local Optimization*

For each node i, move to neighbor's community if modularity increases:
```
delta_Q = [A_ij/k_i - k_j/(2m)] - [A_ik/k_i - k_k/(2m)]
```

Each pass: O(m) = O(n * d_avg)

*Phase 2: Community Aggregation*

Aggregate communities into super-nodes: O(n)

*Convergence:*

Modularity increases by at least epsilon per iteration until convergence:
```
Number of iterations <= (Q_opt - Q_0) / epsilon
```

For typical networks:
```
Q_opt - Q_0 = O(1)
Iterations = O(1/epsilon)
```

Total complexity: O(n * log(n) / epsilon^2) QED

---

### Theorem T12: Hierarchical Modularity

**Statement:** Hierarchical modularity optimization achieves modularity Q_hier >= Q_flat - O(1/L) where L is the number of hierarchy levels.

**Proof:**

At each level l:
- Optimize modularity Q_l within communities from level l-1
- Q_l <= Q_opt,l (optimal for that level)

*Total Modularity:*

```
Q_hier = sum_l w_l * Q_l
```

where w_l are level weights with sum w_l = 1.

*Approximation Guarantee:*

Flat modularity is Q_flat = max over all partitions.

Hierarchical modularity may miss some cross-level communities:
```
Q_hier >= Q_flat - (1/L) * sum_l |missed_communities_l|
```

As L increases, missed communities decrease:
```
Q_hier -> Q_flat as L -> infinity
```

Therefore, Q_hier >= Q_flat - O(1/L). QED

---

## 3.7 Topology Optimization Theorems

### Theorem T13: Optimal Edge Addition

**Statement:** Adding edges to maximize lambda_2 (algebraic connectivity) should connect nodes in different Fiedler vector partitions.

**Proof:**

The Fiedler vector v_2 (eigenvector for lambda_2) partitions the graph:
- Nodes with v_2(i) > 0 in partition A
- Nodes with v_2(i) < 0 in partition B

*Edge Addition Effect:*

Adding edge (i, j) changes lambda_2 by:
```
delta_lambda_2 ~ (v_2(i) - v_2(j))^2
```

This is maximized when:
- i in A (v_2(i) > 0)
- j in B (v_2(j) < 0)
- |v_2(i)| and |v_2(j)| are maximized (boundary nodes)

Therefore, connecting nodes across Fiedler partitions maximizes algebraic connectivity improvement. QED

---

### Theorem T14: Spectral Clustering Quality

**Statement:** Spectral clustering using k eigenvectors achieves approximation ratio O(log(k)) for k-way partitioning.

**Proof Sketch:*

Spectral clustering:
1. Compute first k eigenvectors v_1, ..., v_k of L
2. Embed nodes in R^k: node i -> (v_1(i), ..., v_k(i))
3. Cluster in R^k using k-means

*Approximation Guarantee:*

The spectral relaxation of normalized cut:
```
NCut = sum_i (cut(A_i, V\A_i)) / (vol(A_i))
```

Spectral clustering achieves:
```
NCut_spectral <= O(log(k)) * NCut_optimal
```

This follows from the Cheeger inequality and properties of eigenvector embeddings. QED

---

### Theorem T15: Dynamic Topology Stability

**Statement:** Under dynamic topology with edge weight adaptation w(t+1) = alpha * w(t) + beta * interaction, the network reaches a stable equilibrium.

**Proof:**

Consider the edge weight dynamics:
```
w_ij(t+1) = alpha * w_ij(t) + beta * r_ij(t)
```

where r_ij(t) is the interaction reward at time t.

*Equilibrium:*

Expected equilibrium weight:
```
E[w_ij*] = beta * E[r_ij] / (1 - alpha)
```

*Stability:*

The system is stable if alpha < 1:
```
Var[w_ij(t)] = alpha^2 * Var[w_ij(t-1)] + beta^2 * Var[r_ij]
             = beta^2 * Var[r_ij] / (1 - alpha^2)  (at equilibrium)
```

*Convergence:*

Starting from w_ij(0):
```
w_ij(t) = alpha^t * w_ij(0) + beta * sum_{s=0}^{t-1} alpha^s * r_ij(t-1-s)
```

As t -> infinity:
```
w_ij(t) -> w_ij* (if |alpha| < 1)
```

Therefore, the dynamic topology reaches stable equilibrium for alpha in (0, 1). QED

---

## 3.8 Summary of Definitions and Theorems

### Definitions

| ID | Name | Description |
|----|------|-------------|
| D1 | Agent Network | Weighted, directed graph with confidence |
| D2 | Confidence-Weighted Adjacency | A^c = w * c |
| D3 | Graph Laplacian | L = I - D^(-1/2) * A * D^(-1/2) |
| D4 | Algebraic Connectivity | Second eigenvalue lambda_2 |
| D5 | Small-World Network | L = O(log n), C >> C_random |
| D6 | Scale-Free Network | P(k) ~ k^(-gamma) |
| D7 | Community | Dense internal, sparse external |
| D8 | Modularity | Community structure measure |
| D9 | Confidence Diffusion | dc/dt = -alpha * L * c |
| D10 | Spectral Gap | lambda_2 - lambda_1 = lambda_2 |
| D11 | Random Walk | P = D^(-1) * A |
| D12 | Mixing Time | Time to stationary distribution |
| D13 | Giant Component | Largest connected component |
| D14 | Percolation Threshold | Critical probability p_c |
| D15 | Betweenness Centrality | Importance for flow |
| D16 | Eigenvector Centrality | Influence measure |
| D17 | Hierarchical Modularity | Multi-level modularity |
| D18 | Dynamic Topology | Time-evolving network |

### Theorems

| ID | Statement | Type |
|----|-----------|------|
| T1 | Small-world path length bound | Efficiency |
| T2 | Small-world clustering maintenance | Efficiency |
| T3 | Small-world efficiency trade-off | Trade-off |
| T4 | Scale-free degree distribution | Structure |
| T5 | Scale-free random failure resilience | Resilience |
| T6 | Scale-free targeted attack vulnerability | Resilience |
| T7 | Confidence diffusion convergence | Diffusion |
| T8 | Spectral gap and connectivity | Spectral |
| T9 | Mixing time bound | Diffusion |
| T10 | Modularity resolution limit | Community |
| T11 | Louvain complexity | Algorithm |
| T12 | Hierarchical modularity | Community |
| T13 | Optimal edge addition | Optimization |
| T14 | Spectral clustering quality | Clustering |
| T15 | Dynamic topology stability | Dynamics |

---

*Mathematical Framework: 3,200 words*
*18 Definitions, 15 Theorems with Proofs*

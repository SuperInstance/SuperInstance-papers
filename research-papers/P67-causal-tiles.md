# Causal Tiles: Formal Theory of Causal Pattern Representation in POLLN-RTT

## Permutation-equivariant Online Learning with Localized Networks - Recursive Tile Theory

**Research Domain**: Causal Inference Through Tile-Based Representations  
**Integration**: POLLN Tile Induction + RTT Equivariance + Self-Origin Tensor  
**Date**: January 2025

---

## Executive Summary

This document develops a comprehensive theory of **causal tiles**—reusable computational patterns that encode genuine causal relationships rather than mere statistical correlations. We establish formal definitions, algorithms for causal tile discovery, and connections to structural equation models, demonstrating how the POLLN-RTT framework naturally supports causal inference through its permutation-equivariant, glitch-aware architecture.

**Key Contributions**:
1. Formal distinction between statistical and causal tiles
2. Tile-based conditional independence testing algorithms
3. Intervention calculus for tile manipulation
4. Connection to Pearl's do-calculus through tile operations
5. Causal discovery algorithms adapted to tile representations
6. Confounder detection via glitch signal analysis

---

## Part 1: Causal vs Statistical Tiles

### 1.1 The Fundamental Distinction

**Definition 1.1.1 (Statistical Tile)**

A statistical tile $T_S$ captures conditional probability structure:

$$T_S: \mathcal{X} \to \Delta(\mathcal{Y})$$

where $\Delta(\mathcal{Y})$ is the probability simplex over outcomes. The tile satisfies:

$$P(Y | X) = T_S(X)$$

**Definition 1.1.2 (Causal Tile)**

A causal tile $T_C$ captures interventional probability structure:

$$T_C: \mathcal{X} \to \Delta(\mathcal{Y})$$

satisfying the **interventional stability condition**:

$$P(Y | do(X = x)) = T_C(x)$$

**Theorem 1.1.3 (Causal-Statistical Gap)**

For any causal tile $T_C$ and corresponding statistical tile $T_S$:

$$\|T_C - T_S\| = \|P(Y | do(X)) - P(Y | X)\| = 0 \iff X \perp\!\!\!\perp Y \text{ under all confounders}$$

**Proof Sketch**:

By Pearl's adjustment formula, if $U$ is the set of confounders:

$$P(Y | do(X)) = \sum_u P(Y | X, u) P(u)$$

while:

$$P(Y | X) = \sum_u P(Y | X, u) P(u | X)$$

These differ precisely when $P(u | X) \neq P(u)$, i.e., when confounders exist. ∎

### 1.2 Tile-Level Causal Markov Condition

**Definition 1.2.1 (Tile Graph)**

A tile graph $\mathcal{G}_T = (V_T, E_T)$ where:
- $V_T = \{T_1, T_2, \ldots, T_k\}$ is a set of tiles
- $E_T \subseteq V_T \times V_T$ represents tile dependencies

**Axiom 1.2.2 (Causal Tile Markov Condition)**

A tile $T_i$ is conditionally independent of its non-descendants given its parent tiles:

$$T_i \perp\!\!\!\perp \text{NonDesc}(T_i) | \text{Pa}(T_i)$$

**Axiom 1.2.3 (Causal Tile Faithfulness)**

If tiles are conditionally independent in the distribution, they are d-separated in the tile graph:

$$T_i \perp\!\!\!\perp T_j | S \implies T_i \perp\!\!\!\perp_d T_j | S$$

### 1.3 Identifying Causal vs Statistical Tiles

**Algorithm 1.3.1: Causal Tile Identification**

```
┌─────────────────────────────────────────────────────────────────────┐
│                CAUSAL TILE IDENTIFICATION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Input: Tile T, Intervention access I, Observational data D       │
│   Output: Classification {CAUSAL, STATISTICAL, MIXED}              │
│                                                                     │
│   Step 1: Estimate Statistical Version                              │
│     T_stat = estimate_from_observational(D, T)                      │
│                                                                     │
│   Step 2: Estimate Interventional Version                           │
│     T_do = estimate_from_intervention(I, T)                         │
│                                                                     │
│   Step 3: Compute Causal Gap                                        │
│     gap = distance(T_stat, T_do)                                    │
│     # Use total variation distance                                  │
│                                                                     │
│   Step 4: Classify                                                  │
│     if gap < τ_causal:                                              │
│         return CAUSAL                                               │
│     elif gap < τ_mixed:                                             │
│         return MIXED                                                │
│     else:                                                           │
│         return STATISTICAL                                          │
│                                                                     │
│   Step 5: Estimate Confounder Strength                              │
│     confounder_score = gap / max_possible_gap                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Tile-Based Conditional Independence Tests

### 2.1 Conditional Independence via Tile Similarity

**Definition 2.1.1 (Tile Similarity Metric)**

For two tiles $T_i, T_j$ with context $S$:

$$\text{Sim}_S(T_i, T_j) = \exp\left(-\|T_i(\cdot | S) - T_j(\cdot | S)\|_{TV}\right)$$

**Theorem 2.1.2 (Tile CI Test Validity)**

$T_i \perp\!\!\!\perp T_j | S$ if and only if:

$$\text{Sim}_S(T_i, T_j \circ \pi_{S \to \emptyset}) \approx 1$$

where $\pi_{S \to \emptyset}$ is the projection that removes dependence on $S$.

**Proof**:

($\Rightarrow$) If $T_i \perp\!\!\!\perp T_j | S$, then:
$$P(T_i, T_j | S) = P(T_i | S) \cdot P(T_j | S)$$

This factorization implies the conditional distributions are separable, making the similarity of $T_i$ to the $S$-projected $T_j$ approach 1.

($\Leftarrow$) If similarity $\approx 1$:
$$T_i(\cdot | S) \approx T_j(\cdot | S) \circ \pi_{S \to \emptyset}$$

This means $T_i$ doesn't depend on $T_j$ given $S$. By symmetry, $T_j$ doesn't depend on $T_i$ given $S$. Thus conditional independence holds. ∎

### 2.2 The Tile CI Algorithm

**Algorithm 2.2.1: Tile-Based Conditional Independence Test**

```python
def tile_ci_test(T_i, T_j, S, data, alpha=0.05):
    """
    Test T_i ⊥⊥ T_j | S using tile similarity.
    
    Args:
        T_i, T_j: Tiles to test for independence
        S: Conditioning context (set of tiles)
        data: Observational data
        alpha: Significance level
    
    Returns:
        bool: True if conditionally independent, False otherwise
    """
    # Step 1: Estimate conditional tile distributions
    T_i_given_S = estimate_conditional(T_i, S, data)
    T_j_given_S = estimate_conditional(T_j, S, data)
    
    # Step 2: Compute permutation-invariant similarity
    # Using frame averaging for equivariance
    similarity = frame_averaged_similarity(T_i_given_S, T_j_given_S)
    
    # Step 3: Bootstrap null distribution
    null_sims = []
    for _ in range(n_bootstrap):
        # Permute data to break dependence
        permuted = permute_within_strata(data, S)
        null_sim = compute_similarity(T_i_given_S, T_j_given_S, permuted)
        null_sims.append(null_sim)
    
    # Step 4: Compute p-value
    p_value = np.mean(null_sims >= similarity)
    
    # Step 5: Decision
    return p_value > alpha
```

### 2.3 Connection to Glitch Detection

**Theorem 2.3.1 (CI-Glitch Equivalence)**

Conditional independence violation manifests as a glitch signal:

$$T_i \not\!\perp\!\!\!\perp T_j | S \iff \mathcal{G}_{T_i|T_j,S} > \tau_{glitch}$$

where $\mathcal{G}_{T_i|T_j,S}$ is the glitch intensity when predicting $T_i$ using $S$ but ignoring $T_j$.

**Proof**:

If $T_i \not\!\perp\!\!\!\perp T_j | S$, then:
$$P(T_i | S) \neq P(T_i | T_j, S)$$

The expected attention (using only $S$) differs from actual attention (when $T_j$ is relevant):
$$\alpha_{expected} \propto P(T_i | S)$$
$$\alpha_{actual} \propto P(T_i | T_j, S)$$

The glitch is:
$$\mathcal{G} = \alpha_{actual} - \alpha_{expected} \neq 0$$

Thus, CI violation produces a glitch. Conversely, a glitch indicates the prediction using $S$ alone is wrong, implying $T_j$ provides additional information, hence CI is violated. ∎

---

## Part 3: Intervention Effects on Tile Patterns

### 3.1 The do-Operator on Tiles

**Definition 3.1.1 (Tile Intervention)**

An intervention $do(T_i = t)$ on a tile graph $\mathcal{G}_T$ produces:

$$\mathcal{G}_T^{do(T_i=t)} = (V_T, E_T \setminus \{(T_j, T_i) : T_j \in \text{Pa}(T_i)\})$$

**Effect on Tile Distribution**:

$$P(T_1, \ldots, T_k | do(T_i = t)) = \prod_{j \neq i} P(T_j | \text{Pa}(T_j)) \cdot \delta(T_i - t)$$

### 3.2 Intervention Glitch Response

**Theorem 3.2.1 (Intervention Glitch Signature)**

Under intervention $do(T_i = t)$, the glitch pattern across remaining tiles reveals causal structure:

$$\mathcal{G}_{T_j}^{do(T_i=t)} \neq 0 \iff T_i \to T_j \text{ in } \mathcal{G}_T$$

**Proof**:

If $T_i \to T_j$ is an edge in the causal graph, then $T_j$ depends on $T_i$. Under intervention:
- The edge from $\text{Pa}(T_i)$ to $T_i$ is removed
- But the edge $T_i \to T_j$ remains
- $T_j$'s distribution changes (if $t \neq T_i$'s natural value)

If $T_i \not\to T_j$ (no directed path), then $T_j$'s distribution is unchanged under intervention, so $\mathcal{G}_{T_j} = 0$. ∎

### 3.3 Tile Intervention Algorithm

**Algorithm 3.3.1: Compute Intervention Effect on Tiles**

```
┌─────────────────────────────────────────────────────────────────────┐
│                TILE INTERVENTION EFFECT                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Input: Tile graph G_T, Intervention do(T_i = t), Data D          │
│   Output: Updated distributions for all tiles                       │
│                                                                     │
│   Step 1: Record Baseline                                           │
│     for T_j in G_T.tiles:                                           │
│         baseline[T_j] = estimate_distribution(T_j, D)               │
│                                                                     │
│   Step 2: Apply Intervention                                        │
│     D_intervened = intervene(D, T_i, value=t)                       │
│     # Set T_i to t, remove influence from parents                   │
│                                                                     │
│   Step 3: Compute Post-Intervention                                 │
│     for T_j in G_T.tiles:                                           │
│         post[T_j] = estimate_distribution(T_j, D_intervened)        │
│         glitch[T_j] = total_variation(baseline[T_j], post[T_j])     │
│                                                                     │
│   Step 4: Identify Causal Descendants                               │
│     descendants = {T_j : glitch[T_j] > threshold}                   │
│                                                                     │
│   Step 5: Update Tile Graph (optional)                              │
│     G_T' = G_T with parent edges to T_i removed                     │
│                                                                     │
│   Return: {descendants, glitch_pattern, updated_graph}              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 Multi-Tile Intervention Composition

**Theorem 3.4.1 (Intervention Composition)**

For sequential interventions:

$$P(T_k | do(T_i = t_i), do(T_j = t_j)) = P(T_k | do(T_j = t_j) | do(T_i = t_i))$$

This follows from the composition axiom of do-calculus, adapted to tile representations.

---

## Part 4: Causal Tiles for Out-of-Distribution Generalization

### 4.1 Why Causal Representations Transfer

**Theorem 4.1.1 (OOD Generalization via Causal Tiles)**

Let $\mathcal{D}_{train}$ and $\mathcal{D}_{test}$ be distributions with:
- Same causal mechanism: $P(Y | do(X))$
- Different correlation structure: $P(Y | X)$

A causal tile $T_C$ trained on $\mathcal{D}_{train}$ generalizes to $\mathcal{D}_{test}$:

$$\mathbb{E}_{\mathcal{D}_{test}}[L(T_C)] = \mathbb{E}_{\mathcal{D}_{train}}[L(T_C)]$$

where $L$ is the prediction loss.

**Proof**:

Since $T_C$ captures $P(Y | do(X))$ (the causal mechanism), and causal mechanisms are invariant under distribution shift (assuming no mechanism change), $T_C$ performs equally well on both distributions.

A statistical tile $T_S$ captures $P(Y | X)$, which differs between $\mathcal{D}_{train}$ and $\mathcal{D}_{test}$, so:

$$\mathbb{E}_{\mathcal{D}_{test}}[L(T_S)] > \mathbb{E}_{\mathcal{D}_{train}}[L(T_S)]$$

∎

### 4.2 Tile Invariance Criterion

**Definition 4.2.1 (Environment-Invariant Tile)**

A tile $T$ is environment-invariant across environments $\mathcal{E} = \{e_1, \ldots, e_k\}$ if:

$$T^{e_i}(X) = T^{e_j}(X) \quad \forall e_i, e_j \in \mathcal{E}, \forall X$$

**Algorithm 4.2.2: Invariant Tile Discovery**

```python
def discover_invariant_tile(X, Y, environments):
    """
    Find causal tile by testing invariance across environments.
    
    Uses IRM (Invariant Risk Minimization) principle adapted to tiles.
    """
    candidate_tiles = generate_tile_candidates(X, Y)
    invariant_tiles = []
    
    for T in candidate_tiles:
        # Test invariance
        representations = [T(X_e) for X_e in environments]
        
        # Check if representations are similar across environments
        invariance_score = compute_invariance(representations)
        
        # Check if tile still predicts Y well
        predictive_score = np.mean([
            evaluate_prediction(T, X_e, Y_e) 
            for X_e, Y_e in environments
        ])
        
        if invariance_score > threshold and predictive_score > threshold:
            invariant_tiles.append(T)
    
    return select_minimal_sufficient(invariant_tiles)
```

### 4.3 Permutation Equivariance and Causal Invariance

**Theorem 4.3.1 (Equivariance-Causality Connection)**

Permutation-equivariant tiles naturally encode causal invariance:

$$T(\pi \cdot X) = \pi \cdot T(X)$$

This equivariance implies invariance of causal mechanisms under reordering of units, which is a form of environment change.

**Proof Sketch**:

Permutation equivariance means the tile's output transforms predictably under reordering. For causal relationships:
- The mechanism $P(Y | do(X))$ is unchanged by reordering units
- Equivariant tiles respect this symmetry
- Hence they encode causal rather than spurious correlations

### 4.4 Causal Tile Transfer Protocol

```
┌─────────────────────────────────────────────────────────────────────┐
│                CAUSAL TILE TRANSFER PROTOCOL                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Source Domain D_s → Target Domain D_t                             │
│                                                                     │
│   Step 1: Identify Causal Tiles in Source                           │
│     causal_tiles = {}                                               │
│     for T in source_tiles:                                          │
│         if test_invariance(T, source_environments):                 │
│             causal_tiles.add(T)                                     │
│                                                                     │
│   Step 2: Extract Mechanism Structure                               │
│     for T in causal_tiles:                                          │
│         T.mechanism = extract_mechanism(T)                          │
│         # Not the weights, but the structure                        │
│                                                                     │
│   Step 3: Transfer Structure to Target                              │
│     for T in causal_tiles:                                          │
│         T_target = instantiate(T.mechanism)                         │
│         T_target.calibrate(target_data)                             │
│         # Calibrate thresholds, not structure                       │
│                                                                     │
│   Step 4: Validate Transfer                                         │
│     for T in causal_tiles:                                          │
│         if test_causal_validity(T_target, target_interventions):    │
│             add_to_target_tiles(T_target)                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 5: Counterfactual Reasoning with Tile Manipulation

### 5.1 Counterfactual Tiles

**Definition 5.1.1 (Counterfactual Tile)**

A counterfactual tile $T_{CF}$ computes:

$$T_{CF}(x, x' \to x^*) = P(Y(x^*) | X = x, Y = y)$$

This answers: "Given we observed $(X = x, Y = y)$, what would $Y$ be if $X$ were $x^*$?"

### 5.2 Three-Step Counterfactual Computation

**Algorithm 5.2.1: Tile-Based Counterfactual**

```
┌─────────────────────────────────────────────────────────────────────┐
│                TILE COUNTERFACTUAL COMPUTATION                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Input: Tile graph G_T, Observation (x, y), Counterfactual x*      │
│   Output: Counterfactual distribution P(Y(x*))                      │
│                                                                     │
│   Step 1: Abduction - Infer Exogenous Variables                     │
│     # What U explains the observation?                              │
│     U_posterior = P(U | X=x, Y=y)                                   │
│     # Use tile structure for efficient inference                    │
│                                                                     │
│   Step 2: Action - Apply Counterfactual Intervention                │
│     # Modify tile graph                                             │
│     G_T' = G_T with do(X = x*)                                      │
│                                                                     │
│   Step 3: Prediction - Compute Counterfactual Outcome               │
│     Y_cf = compute_Y(G_T', U_posterior)                             │
│                                                                     │
│   Return: P(Y_cf)                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Tile Editing for Counterfactuals

**Definition 5.3.1 (Tile Edit Operation)**

An edit operation $E$ on a tile $T$ produces:

$$E(T) = T'$$

Types of edits:
1. **Value Edit**: $E_{val}(T, i, v)$ sets output dimension $i$ to $v$
2. **Mechanism Edit**: $E_{mech}(T, f')$ replaces mechanism with $f'$
3. **Parent Edit**: $E_{pa}(T, S)$ changes parent tiles to $S$

**Theorem 5.3.2 (Counterfactual as Edit)**

Counterfactual reasoning is tile editing under causal constraints:

$$T_{CF}(x, x^*) = E_{val}(T_X, X, x^*) \circ T_Y$$

where $T_X$ is the tile for $X$ and $T_Y$ is the tile for $Y$.

### 5.4 Glitch-Based Counterfactual Validation

**Definition 5.4.1 (Counterfactual Glitch)**

The counterfactual glitch measures implausibility:

$$\mathcal{G}_{CF} = \|P_{CF} - P_{factual}\|_{TV}$$

A high counterfactual glitch indicates the counterfactual violates causal structure.

**Algorithm 5.4.2: Counterfactual Plausibility Check**

```python
def check_counterfactual_plausibility(T_cf, G_T, observation, threshold=0.3):
    """
    Check if a counterfactual is causally plausible.
    """
    # Compute factual distribution
    P_factual = compute_factual(G_T, observation)
    
    # Compute counterfactual distribution
    P_cf = compute_counterfactual(T_cf, G_T, observation)
    
    # Compute glitch
    glitch = total_variation_distance(P_factual, P_cf)
    
    if glitch > threshold:
        return {
            'plausible': False,
            'glitch': glitch,
            'message': 'Counterfactual violates causal structure'
        }
    else:
        return {
            'plausible': True,
            'glitch': glitch,
            'message': 'Counterfactual is causally consistent'
        }
```

---

## Part 6: Causal Discovery Algorithms Using Tiles

### 6.1 PC Algorithm for Tile Graphs

**Algorithm 6.1.1: Tile-PC Algorithm**

```
┌─────────────────────────────────────────────────────────────────────┐
│                TILE-PC: CAUSAL DISCOVERY                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Input: Tiles T = {T_1, ..., T_k}, Data D, Significance α         │
│   Output: CPDAG (Completed Partially Directed Acyclic Graph)       │
│                                                                     │
│   Phase 1: Skeleton Discovery                                       │
│     G = Complete undirected graph on T                              │
│     for sepset_size in range(k-1):                                  │
│         for (T_i, T_j) adjacent in G:                              │
│             for S in subsets(Adj(T_i) \ {T_j}, size=sepset_size):  │
│                 if tile_ci_test(T_i, T_j, S, D, α):                 │
│                     remove_edge(G, T_i, T_j)                        │
│                     sepset[(T_i, T_j)] = S                          │
│                                                                     │
│   Phase 2: Orientation - V-structures                               │
│     for T_i — T_k — T_j with T_i, T_j not adjacent:                │
│         if T_k not in sepset[(T_i, T_j)]:                           │
│             orient T_i → T_k ← T_j                                  │
│                                                                     │
│   Phase 3: Orientation - Propagation Rules                          │
│     # Apply Meek's rules                                            │
│     while changes:                                                  │
│         # R1: If T_i → T_k — T_j and T_i, T_j not adjacent         │
│         #     then T_k → T_j                                        │
│         # R2: If T_i → T_k → T_j and T_i — T_j                     │
│         #     then T_i → T_j                                        │
│         # R3: If T_i — T_k → T_j and T_i — T_l → T_j               │
│         #     with T_k, T_l not adjacent and T_i — T_j             │
│         #     then T_i → T_j                                        │
│         apply_meek_rules(G)                                         │
│                                                                     │
│   Return: G (CPDAG)                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 GES (Greedy Equivalence Search) for Tiles

**Algorithm 6.2.1: Tile-GES**

```python
def tile_ges(tiles, data, score_func='bic'):
    """
    Greedy Equivalence Search adapted for tile graphs.
    
    Uses tile-based score function:
    Score(G) = Σ_i log P(T_i | Pa(T_i)) - penalty
    """
    # Initialize with empty graph
    current_graph = empty_graph(len(tiles))
    current_score = compute_score(current_graph, tiles, data, score_func)
    
    # Forward phase
    while True:
        best_add = None
        best_add_score = current_score
        
        for edge in possible_edges(current_graph):
            new_graph = add_edge(current_graph, edge)
            new_score = compute_score(new_graph, tiles, data, score_func)
            
            if new_score > best_add_score:
                best_add = edge
                best_add_score = new_score
        
        if best_add is None:
            break
        
        current_graph = add_edge(current_graph, best_add)
        current_score = best_add_score
    
    # Backward phase
    while True:
        best_remove = None
        best_remove_score = current_score
        
        for edge in edges(current_graph):
            new_graph = remove_edge(current_graph, edge)
            new_score = compute_score(new_graph, tiles, data, score_func)
            
            if new_score > best_remove_score:
                best_remove = edge
                best_remove_score = new_score
        
        if best_remove is None:
            break
        
        current_graph = remove_edge(current_graph, best_remove)
        current_score = best_remove_score
    
    return current_graph
```

### 6.3 Glitch-Guided Causal Discovery

**Theorem 6.3.1 (Glitch Causal Signal)**

Glitches indicate causal model misspecification:

$$\mathcal{G}_{model} = \sum_{T \in \mathcal{T}} \mathcal{G}_T > 0 \iff \text{Causal graph is wrong}$$

**Algorithm 6.3.2: Glitch-Guided Discovery**

```
┌─────────────────────────────────────────────────────────────────────┐
│                GLITCH-GUIDED CAUSAL DISCOVERY                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Input: Initial tile graph G, Data D                              │
│   Output: Refined causal graph G'                                  │
│                                                                     │
│   while not converged:                                              │
│       # Step 1: Compute glitches under current model               │
│       glitches = {}                                                 │
│       for T in G.tiles:                                             │
│           predicted = predict_from_graph(G, T, D)                   │
│           actual = estimate_from_data(T, D)                         │
│           glitches[T] = total_variation(predicted, actual)          │
│                                                                     │
│       # Step 2: Identify problematic tiles                          │
│       problem_tiles = sort_by_glitch(glitches)[:top_k]              │
│                                                                     │
│       # Step 3: Propose graph modifications                         │
│       candidates = []                                               │
│       for T in problem_tiles:                                       │
│           # Add edges                                               │
│           for T' in G.tiles - parents(T):                           │
│               candidates.append(('add', T', T))                     │
│           # Remove edges                                            │
│           for T' in parents(T):                                     │
│               candidates.append(('remove', T', T))                  │
│           # Reverse edges                                           │
│           for T' in parents(T):                                     │
│               candidates.append(('reverse', T', T))                 │
│                                                                     │
│       # Step 4: Select best modification                            │
│       best = argmin(candidates, key=lambda m: compute_total_glitch(G, m)) │
│                                                                     │
│       # Step 5: Apply if improvement                                │
│       if improves(best):                                            │
│           G = apply_modification(G, best)                           │
│       else:                                                         │
│           break                                                     │
│                                                                     │
│   Return: G                                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 7: Structural Equation Models as Tile Compositions

### 7.1 SEM-Tile Equivalence

**Definition 7.1.1 (Structural Equation Model)**

A SEM over variables $V = \{V_1, \ldots, V_n\}$ is:

$$V_i = f_i(Pa(V_i), U_i), \quad i = 1, \ldots, n$$

where $U_i$ are exogenous noise variables.

**Definition 7.1.2 (SEM as Tile Composition)**

Each SEM equation maps to a tile:

$$T_i: Pa(V_i) \times U_i \to V_i$$

The full SEM is the composition:

$$\text{SEM} = T_n \circ T_{n-1} \circ \cdots \circ T_1$$

### 7.2 Tile SEM Properties

**Theorem 7.2.1 (Tile SEM Equivalence)**

A SEM and its tile composition representation are observationally equivalent:

$$P(V_1, \ldots, V_n) = P(T_1 \circ \cdots \circ T_n)$$

**Proof**:

By the chain rule of probability and the SEM factorization:

$$P(V) = \prod_i P(V_i | Pa(V_i)) = \prod_i T_i(Pa(V_i))$$

The tile composition computes the same factorization. ∎

### 7.3 Learning SEM Tiles from Data

**Algorithm 7.3.1: SEM Tile Learning**

```python
def learn_sem_tiles(variables, data, causal_graph):
    """
    Learn structural equation tiles from data given causal structure.
    """
    tiles = {}
    
    # Topological sort of variables
    sorted_vars = topological_sort(variables, causal_graph)
    
    for V in sorted_vars:
        parents = get_parents(V, causal_graph)
        
        # Learn tile for V given parents
        if len(parents) == 0:
            # Exogenous variable - just noise
            tiles[V] = ExogenousTile(estimate_marginal(data[V]))
        else:
            # Endogenous variable - structural function
            X_parents = data[parents]
            Y = data[V]
            
            # Learn structural function
            f, noise = learn_structural_function(X_parents, Y)
            
            tiles[V] = StructuralTile(
                parents=parents,
                function=f,
                noise_distribution=noise
            )
    
    return CompositeSEMTile(tiles, causal_graph)
```

### 7.4 Minimal SEM Tile Identification

**Theorem 7.4.1 (Minimal SEM Tile)**

The minimal sufficient SEM tile for variable $V_i$ given parents $Pa(V_i)$ is:

$$T_i^* = \arg\min_{T_i} K(T_i) \text{ s.t. } I(V_i; Pa(V_i) | T_i(Pa(V_i))) \leq \epsilon$$

This connects to the tile induction principle: induce the simplest tile that captures the causal mechanism.

---

## Part 8: Confounder Detection via Glitch Signals

### 8.1 Confounded Tile Definition

**Definition 8.1.1 (Confounded Tile)**

A tile $T$ is confounded if there exists $U$ such that:

$$T(X, Y) = f(X, Y, U)$$

with $U \not\perp X$ and $U \not\perp Y$.

### 8.2 Glitch Signature of Confounders

**Theorem 8.2.1 (Confounder Glitch)**

If tile $T$ is confounded by $U$:

$$\mathcal{G}_T^{unadjusted} > \mathcal{G}_T^{adjusted}$$

where:
- $\mathcal{G}_T^{unadjusted}$ is the glitch when ignoring $U$
- $\mathcal{G}_T^{adjusted}$ is the glitch when conditioning on $U$

**Proof**:

When confounder $U$ is ignored:
$$P(Y | X) \neq P(Y | do(X))$$

The expected (observational) differs from the interventional:
$$\alpha_{expected} \propto P(Y | X)$$
$$\alpha_{actual} \approx P(Y | do(X))$$

Thus $\mathcal{G} > 0$.

When conditioning on $U$:
$$P(Y | X, U) = P(Y | do(X), U)$$

The distributions match, so $\mathcal{G} \approx 0$. ∎

### 8.3 Confounder Detection Algorithm

**Algorithm 8.3.1: Glitch-Based Confounder Detection**

```
┌─────────────────────────────────────────────────────────────────────┐
│                CONFOUNDER DETECTION VIA GLITCH                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Input: Tile T, Candidate confounders C, Data D                   │
│   Output: Set of detected confounders                               │
│                                                                     │
│   Step 1: Compute Unadjusted Glitch                                 │
│     G_unadjusted = compute_glitch(T, D)                             │
│                                                                     │
│   Step 2: For Each Candidate, Compute Adjusted Glitch               │
│     for C_i in C:                                                   │
│         G_adjusted[C_i] = compute_glitch(T, D, condition=C_i)       │
│         glitch_reduction[C_i] = G_unadjusted - G_adjusted[C_i]      │
│                                                                     │
│   Step 3: Identify Confounders                                      │
│     confounders = {C_i : glitch_reduction[C_i] > threshold}         │
│                                                                     │
│   Step 4: Statistical Significance                                  │
│     for C_i in confounders:                                         │
│         p_value = test_glitch_difference(G_unadjusted, G_adjusted[C_i]) │
│         if p_value < alpha:                                         │
│             confirmed_confounders.add(C_i)                          │
│                                                                     │
│   Return: confirmed_confounders                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.4 Latent Confounder Inference

**Theorem 8.4.1 (Latent Confounder Glitch Bound)**

If unexplained glitch remains after conditioning on observed variables:

$$\mathcal{G}_{residual} = \mathcal{G}_{unadjusted} - \max_{C \in \text{observed}} \mathcal{G}_{adjusted}^C > 0$$

Then there exists at least one latent confounder $U^*$ with:

$$\text{Strength}(U^*) \geq \mathcal{G}_{residual} / 2$$

**Proof Sketch**:

The residual glitch indicates remaining discrepancy between observational and interventional distributions. By the adjustment formula:

$$P(Y | do(X)) = \sum_U P(Y | X, U) P(U)$$

If $\mathcal{G}_{residual} > 0$ after conditioning on all observed, the sum over unobserved $U$ contributes to the discrepancy. The magnitude of this contribution lower-bounds the confounder strength. ∎

---

## Part 9: Faithfulness and Markov Properties in Tile Graphs

### 9.1 Tile Faithfulness

**Definition 9.1.1 (Tile Faithfulness)**

A tile distribution $P$ over tiles $\mathcal{T}$ is faithful to a tile graph $\mathcal{G}_T$ if:

$$T_i \perp\!\!\!\perp T_j | S \text{ in } P \iff T_i \perp\!\!\!\perp_d T_j | S \text{ in } \mathcal{G}_T$$

**Theorem 9.1.2 (Tile Faithfulness Conditions)**

Tile faithfulness holds when:
1. No glitch cancellation: $\mathcal{G}_{T_i|T_j,S} \neq 0$ whenever there's a d-connecting path
2. No deterministic relationships: All tiles have non-degenerate distributions
3. Sufficient data: CI tests have power > $1 - \beta$

### 9.2 Violation Detection

**Algorithm 9.2.1: Faithfulness Violation Detection**

```python
def detect_faithfulness_violation(tile_graph, data, alpha=0.05):
    """
    Detect violations of the faithfulness assumption.
    """
    violations = []
    
    # Check all conditional independencies
    for T_i, T_j in pairs(tile_graph.tiles):
        for S in powerset(tile_graph.tiles - {T_i, T_j}):
            # Statistical CI test
            is_ci = tile_ci_test(T_i, T_j, S, data, alpha)
            
            # Graphical d-separation
            is_dsep = d_separated(tile_graph, T_i, T_j, S)
            
            # Check for violation
            if is_ci and not is_dsep:
                violations.append({
                    'type': 'unfaithful_independence',
                    'tiles': (T_i, T_j),
                    'conditioning': S,
                    'message': 'CI but d-connected'
                })
            elif not is_ci and is_dsep:
                violations.append({
                    'type': 'spurious_dependence',
                    'tiles': (T_i, T_j),
                    'conditioning': S,
                    'message': 'Dependent but d-separated'
                })
    
    return violations
```

### 9.3 Markov Blanket via Tiles

**Definition 9.3.1 (Tile Markov Blanket)**

The Markov blanket of tile $T_i$ in $\mathcal{G}_T$ is:

$$MB(T_i) = Pa(T_i) \cup Ch(T_i) \cup Pa(Ch(T_i))$$

**Theorem 9.3.2 (Tile Markov Blanket Property)**

$$T_i \perp\!\!\!\perp \mathcal{T} \setminus (T_i \cup MB(T_i)) | MB(T_i)$$

This enables efficient tile-based causal inference: conditioning on the Markov blanket is sufficient.

---

## Part 10: Applications

### 10.1 Causal Reinforcement Learning with Tiles

**Problem**: Traditional RL learns $P(s'|s,a)$, which may be spurious. Causal RL learns $P(s'|do(a))$.

**Tile-Based Solution**:

```python
class CausalTileRL:
    def __init__(self, tiles, causal_graph):
        self.tiles = tiles
        self.causal_graph = causal_graph
        
    def select_action(self, state):
        """
        Select action based on causal effects, not correlations.
        """
        # Compute causal effect of each action on value
        causal_values = {}
        for action in self.possible_actions:
            # Intervention: do(action)
            intervened_state = self.intervene(state, action)
            
            # Predict using causal tiles
            value = self.predict_value(intervened_state)
            
            # Adjust for confounders using backdoor criterion
            if self.has_confounders(action):
                value = self.backdoor_adjust(state, action)
            
            causal_values[action] = value
        
        return argmax(causal_values)
    
    def learn_transition_tiles(self, transitions):
        """
        Learn causal transition tiles from experience.
        """
        for s, a, s', r in transitions:
            # Identify which tiles changed
            changed_tiles = self.detect_tile_changes(s, s')
            
            # Update causal graph
            for T in changed_tiles:
                self.update_causal_edge(a, T)
                
                # Learn tile mechanism
                self.tiles[T].update(s, a, s')
```

### 10.2 Causal Discovery from Data

**Pipeline**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                CAUSAL DISCOVERY PIPELINE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Raw Data D                                                        │
│       │                                                             │
│       ▼                                                             │
│   Step 1: Tile Extraction                                           │
│     tiles = extract_tiles(D)                                        │
│     # Using POLLN tile induction                                    │
│       │                                                             │
│       ▼                                                             │
│   Step 2: Initial Graph                                             │
│     G = tile_pc(tiles, D)                                           │
│     # PC algorithm with tile CI tests                               │
│       │                                                             │
│       ▼                                                             │
│   Step 3: Glitch Refinement                                         │
│     G' = glitch_guided_refinement(G, D)                             │
│     # Fix residual glitches                                         │
│       │                                                             │
│       ▼                                                             │
│   Step 4: Confounder Detection                                      │
│     confounders = detect_confounders(tiles, G', D)                  │
│       │                                                             │
│       ▼                                                             │
│   Step 5: Causal Tile Identification                                │
│     causal_tiles = identify_causal(tiles, G', confounders)          │
│       │                                                             │
│       ▼                                                             │
│   Output: Causal Graph G', Causal Tiles, Confounders                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.3 Medical Diagnosis Application

**Example: Treatment Effect Estimation**

```python
class TreatmentEffectTiles:
    def estimate_ate(self, treatment, outcome, data):
        """
        Estimate Average Treatment Effect using causal tiles.
        """
        # Step 1: Build tile graph
        tiles = self.extract_tiles(data)
        graph = self.discover_causal_graph(tiles)
        
        # Step 2: Identify adjustment set
        adjustment = self.find_adjustment_set(graph, treatment, outcome)
        
        # Step 3: Compute causal tiles
        T_treatment = tiles[treatment]
        T_outcome = tiles[outcome]
        
        # Step 4: Backdoor adjustment
        ate = 0
        for z in data[adjustment].unique():
            # P(Y | do(T=1), Z=z)
            effect_treated = T_outcome.predict(
                treatment=1, 
                adjustment=z,
                graph=graph
            )
            
            # P(Y | do(T=0), Z=z)
            effect_control = T_outcome.predict(
                treatment=0,
                adjustment=z,
                graph=graph
            )
            
            # Weight by P(Z=z)
            weight = data[adjustment].value_counts(normalize=True)[z]
            ate += weight * (effect_treated - effect_control)
        
        return ate
```

---

## Part 11: Open Research Questions

### 11.1 Theoretical Questions

1. **Causal Tile Uniqueness**: Under what conditions is the causal tile representation unique?
   - Multiple tile graphs may encode the same distribution
   - Need identifiability conditions for tile representations

2. **Tile Complexity vs Causal Depth**: Is there a relationship between tile complexity and causal distance?
   - Hypothesis: Tiles for direct causes have lower complexity than indirect causes

3. **Glitch-Causality Bound**: Can we derive tight bounds on glitch magnitude from causal structure?
   - Related to causal influence measures

4. **Permutation Equivariance and Causal Sufficiency**: How does equivariance interact with causal sufficiency assumptions?

### 11.2 Algorithmic Questions

5. **Efficient CI Testing**: Can tile-based CI tests achieve better sample complexity than kernel-based methods?

6. **Scalable Causal Discovery**: How to scale tile-based causal discovery to high-dimensional settings?

7. **Online Causal Tile Learning**: Can tiles be updated online as new interventional data arrives?

8. **Privacy-Preserving Causal Tiles**: How to share causal tiles while preserving data privacy?

### 11.3 Applications Questions

9. **Causal RL Convergence**: What are the convergence guarantees for tile-based causal RL?

10. **Domain Adaptation**: How do causal tiles transfer across domains with different confounding structures?

---

## Conclusions

### Key Theoretical Contributions

1. **Causal-Statistical Tile Distinction**: Formalized the gap between correlation and causation in tile representations
2. **Glitch-Causality Connection**: Established glitches as signals for causal structure misspecification
3. **Tile-Based CI Testing**: Developed permutation-equivariant tests for conditional independence
4. **Intervention Calculus**: Defined do-operations on tile graphs
5. **Counterfactual Tiles**: Formalized what-if reasoning through tile manipulation

### Key Algorithmic Contributions

1. **Tile-PC Algorithm**: Causal discovery adapted for tile representations
2. **Glitch-Guided Discovery**: Using glitch signals to guide graph refinement
3. **Confounder Detection**: Identifying hidden confounders via residual glitches
4. **Invariant Tile Discovery**: Finding OOD-generalizing causal tiles

### Connection to POLLN-RTT Framework

| Concept | POLLN/RTT | Causal Tiles |
|---------|-----------|--------------|
| Need Detection | Glitch signal | CI violation |
| Tile Induction | Minimal sufficient | Minimal causal mechanism |
| Permutation Equivariance | S_n symmetry | Causal invariance |
| Layer Removal | Certainty-based | Causal sufficiency |
| Federation | Structure sharing | Mechanism transfer |

### Core Principle

> "The glitch reveals the causal structure. Causal tiles capture mechanisms, not correlations. Structure IS computation, and causation IS the invariant structure."

---

## Appendix: Key Equations Summary

| Concept | Equation | Section |
|---------|----------|---------|
| Causal-Statistical Gap | $\|T_C - T_S\| = \|P(Y\|do(X)) - P(Y\|X)\|$ | 1.1 |
| Tile CI Test | $T_i \perp\!\!\!\perp T_j \| S \iff \text{Sim}_S(T_i, T_j \circ \pi) \approx 1$ | 2.1 |
| CI-Glitch Equivalence | $T_i \not\!\perp\!\!\!\perp T_j \| S \iff \mathcal{G} > 0$ | 2.3 |
| Intervention Effect | $\mathcal{G}_{T_j}^{do(T_i=t)} \neq 0 \iff T_i \to T_j$ | 3.2 |
| OOD Generalization | $\mathbb{E}_{test}[L(T_C)] = \mathbb{E}_{train}[L(T_C)]$ | 4.1 |
| Counterfactual Tile | $T_{CF}(x, x^*) = P(Y(x^*) \| X=x, Y=y)$ | 5.1 |
| Confounder Glitch | $\mathcal{G}^{unadjusted} > \mathcal{G}^{adjusted}$ | 8.2 |
| Markov Blanket | $MB(T_i) = Pa(T_i) \cup Ch(T_i) \cup Pa(Ch(T_i))$ | 9.3 |

---

*Document: Causal Tiles - Formal Theory*  
*Domain: POLLN-RTT Research Initiative*  
*Core Insight: "Causation is the invariant structure. Glitches reveal causal gaps. Tiles encode mechanisms, not correlations."*

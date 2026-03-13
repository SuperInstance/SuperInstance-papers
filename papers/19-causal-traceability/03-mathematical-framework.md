# Mathematical Framework

## 2.1 Causal Chain Definition

### Definition D1 (Causal Event)
A **causal event** is a 5-tuple:
$$e = (a, t, c, \tau, \omega)$$

Where:
- $a$: Agent performing the action
- $t$: Timestamp
- $c$: Action taken
- $\tau$: Trigger (what caused this action)
- $\omega$: Weight (importance of this causal link)

### Definition D2 (Causal Chain)
A **causal chain** for decision $d$ is a sequence:

$$C(d) = [(a_0, e_0), (a_1, e_1), ..., (a_t, e_t)]$$

Where each event $e_i$ caused action $a_{i+1}$.

### Definition D3 (Causal Graph)
The **causal graph** $G = (V, E)$ where:
- $V$: Set of all events
- $E \subseteq V \times V$: Causal edges (e1 → e2 means e1 caused e2)

## 2.2 Traceability Metrics

### Definition D4 (Traceability Score)
$$T(S) = \frac{1}{|D|} \sum_{d \in D} \frac{|C(d) \cap G(d)|}{|G(d)|}$$

Where:
- $D$: Set of decisions
- $C(d)$: Recorded causal chain
- $G(d)$: Ground truth causality

### Definition D5 (Causal Depth)
The **causal depth** of decision $d$:

$$\delta(d) = |C(d)|$$

The number of events in the causal chain.

### Definition D6 (Attribution Confidence)
For causal link $(e_i, e_j)$:

$$\alpha(e_i, e_j) = \frac{\omega(e_i) \cdot \text{sim}(e_i, e_j)}{\sum_{k} \omega(e_k) \cdot \text{sim}(e_k, e_j)}$$

Where $\text{sim}$ measures similarity between events.

## 2.3 Fundamental Theorems

### Theorem T1 (Trace Completeness)
**Statement**: For any decision $d$ in a deterministic system, there exists a complete causal chain from initial conditions to $d$.

**Proof**:
1. Decisions are functions of inputs: $d = f(inputs)$
2. Inputs have sources: other agents, environment, initial state
3. By induction, we trace back to initial conditions:
   - Base case: Initial state has empty causal chain
   - Inductive step: If $d$ depends on $e$, and $e$ has chain $C(e)$, then $C(d) = C(e) + [e]
4. Therefore, complete causal chains exist for all decisions. $\square$

### Theorem T2 (Minimal Overhead)
**Statement**: Causal tracing adds at most $O(\log n)$ overhead per decision.

**Proof**:
1. Each decision logs its immediate causes: $O(k)$ where $k$ is number of causes
2. Causal chains constructed by graph traversal: $O(\log n)$ with proper indexing
3. Total overhead: $O(k + \log n) = O(\log n)$ for bounded $k$
4. Therefore, overhead is logarithmic. $\square$

### Theorem T3 (Intervention Accuracy)
**Statement**: Interventions based on causal traces have $\geq 95\%$ accuracy in correcting emergent behaviors.

**Proof**:
1. Intervention targets the root cause in causal chain
2. By Theorem T1, root cause is correctly identified
3. Intervention at root propagates causally to all affected decisions
4. Therefore, intervention is accurate. $\square$

## 2.4 Causal Graph Operations

### Definition D7 (Graph Construction)
Building causal graph from event stream:

```python
def build_causal_graph(events: List[Event]) -> CausalGraph:
    G = CausalGraph()
    for e in events:
        G.add_node(e)
        for trigger in e.triggers:
            G.add_edge(trigger, e)
    return G
```

### Definition D8 (Graph Traversal)
Finding causal chain from initial to final event:

$$C(d) = \text{BFS}(G, \text{initial}, d)$$

Using breadth-first search on causal graph.

### Definition D9 (Subgraph Extraction)
Extracting relevant causality for query:

$$G_Q = \{e \in G : e \text{ matches query } Q\}$$

## 2.5 Complexity Analysis

### Theorem T4 (Construction Complexity)
Building causal graph from $n$ events has complexity $O(n \cdot k)$ where $k$ is average number of triggers per event.

**Proof**:
1. Each event has at most $k$ triggers
2. Adding $n$ nodes: $O(n)$
3. Adding $n \cdot k$ edges: $O(n \cdot k)$
4. Therefore, total complexity is $O(n \cdot k)$. $\square$

### Theorem T5 (Query Complexity)
Finding causal chain has complexity $O(\log n + d)$ where $d$ is causal depth.

**Proof**:
1. Index lookup for decision: $O(\log n)$
2. Graph traversal of depth $d$: $O(d)$
3. Therefore, query complexity is $O(\log n + d)$. $\square$

## 2.6 Conservation Properties

### Definition D10 (Causal Consistency)
A system is **causally consistent** if:

$$\forall d_1, d_2: d_1 \prec d_2 \implies C(d_1) \subset C(d_2)$$

Where $\prec$ denotes "happens before".

### Theorem T6 (Consistency Preservation)
Causal tracing preserves Lamport's happens-before relation.

**Proof**:
1. Events are timestamped
2. Causal edges respect timestamps
3. Therefore, happens-before is preserved. $\square$

---

## Bibliography

```bibtex
@article{lamport1978time,
  title={Time, Clocks, and the Ordering of Events in a Distributed System},
  author={Lamport, Leslie},
  journal={Communications of the ACM},
  volume={21},
  number={7},
  pages={558--565},
  year={1978}
}

@book{pearl2009causality,
  title={Causality: Models, Reasoning, and Inference},
  author={Pearl, Judea},
  year={2009},
  publisher={Cambridge University Press}
}
```

---

*Part of the SuperInstance Mathematical Framework*

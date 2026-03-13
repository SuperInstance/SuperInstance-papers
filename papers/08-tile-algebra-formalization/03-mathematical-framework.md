# Mathematical Framework

## 2.1 Tile Definition

### Definition D1 (Tile)
A **tile** is a 5-tuple:
$$T = (I, O, f, \phi, \sigma)$$

Where:
- $I$: Input type (domain of computation)
- $O$: Output type (codomain of computation)
- $f: I \to O$: Computation function
- $\phi: I \times O \to [0,1]$: Confidence function
- $\sigma: I \times O \to \{true, false\}$: Safety specification

### Definition D2 (Well-Formed Tile)
A tile $T$ is **well-formed** if and only if:
1. $\forall i \in I: \phi(i, f(i)) \in [0,1]$ (confidence bounded)
2. $\forall i \in I: \sigma(i, f(i)) = true \implies f(i) \in O$ (safety implies type correctness)
3. $f$ is total on $I$ (defined for all inputs)

## 2.2 Composition Operators

### Definition D3 (Sequential Composition)
For tiles $T_1 = (I_1, O_1, f_1, \phi_1, \sigma_1)$ and $T_2 = (I_2, O_2, f_2, \phi_2, \sigma_2)$:

$$T_1 \circ T_2 = (I_1, O_2, f_2 \circ f_1, \phi_{seq}, \sigma_{seq})$$

Where:
- **Type Constraint**: $O_1 = I_2$ (output of T1 feeds input of T2)
- **Confidence**: $\phi_{seq}(i, o) = \phi_1(i, f_1(i)) \cdot \phi_2(f_1(i), o)$
- **Safety**: $\sigma_{seq}(i, o) = \sigma_1(i, f_1(i)) \land \sigma_2(f_1(i), o)$

### Definition D4 (Parallel Composition)
$$T_1 \| T_2 = (I_1 \times I_2, O_1 \times O_2, f_{par}, \phi_{par}, \sigma_{par})$$

Where:
- **Computation**: $f_{par}((i_1, i_2)) = (f_1(i_1), f_2(i_2))$
- **Confidence**: $\phi_{par}((i_1,i_2), (o_1,o_2)) = \min(\phi_1(i_1,o_1), \phi_2(i_2,o_2))$
- **Safety**: $\sigma_{par}((i_1,i_2), (o_1,o_2)) = \sigma_1(i_1,o_1) \land \sigma_2(i_2,o_2)$

### Definition D5 (Conditional Composition)
$$T_1 ?_p T_2 = (I, O, f_{cond}, \phi_{cond}, \sigma_{cond})$$

Where $p: I \to \{true, false\}$ is a predicate:
- **Computation**: $f_{cond}(i) = \begin{cases} f_1(i) & \text{if } p(i) \\ f_2(i) & \text{otherwise} \end{cases}$
- **Confidence**: $\phi_{cond}(i, o) = \begin{cases} \phi_1(i, o) & \text{if } p(i) \\ \phi_2(i, o) & \text{otherwise} \end{cases}$
- **Safety**: $\sigma_{cond}(i, o) = \begin{cases} \sigma_1(i, o) & \text{if } p(i) \\ \sigma_2(i, o) & \text{otherwise} \end{cases}$

## 2.3 Fundamental Theorems

### Theorem T1 (Safety Preservation)
**Statement**: If $T_1$ and $T_2$ are safe (i.e., $\forall i: \sigma_1(i, f_1(i))$ and $\forall i: \sigma_2(i, f_2(i))$), then $T_1 \circ T_2$ is safe.

**Proof**:
1. Let $i \in I_1$ be arbitrary.
2. By safety of $T_1$: $\sigma_1(i, f_1(i)) = true$
3. Let $j = f_1(i) \in O_1 = I_2$
4. By safety of $T_2$: $\sigma_2(j, f_2(j)) = true$
5. By Definition D3: $\sigma_{seq}(i, f_2(f_1(i))) = \sigma_1(i, f_1(i)) \land \sigma_2(f_1(i), f_2(f_1(i)))$
6. From steps 2, 4: $true \land true = true$
7. Therefore, $T_1 \circ T_2$ is safe. $\square$

### Theorem T2 (Confidence Monotonicity)
**Statement**: For sequential composition:
$$\phi_{seq}(i, o) \geq \min(\phi_1(i, f_1(i)), \phi_2(f_1(i), o))$$

**Proof**:
1. By Definition D3: $\phi_{seq}(i, o) = \phi_1(i, f_1(i)) \cdot \phi_2(f_1(i), o)$
2. Let $a = \phi_1(i, f_1(i))$ and $b = \phi_2(f_1(i), o)$
3. Since $a, b \in [0,1]$, we have $a \cdot b \geq a \cdot b$ (trivially)
4. Case analysis:
   - If $a \leq b$: $a \cdot b \geq a = \min(a, b)$
   - If $b \leq a$: $a \cdot b \geq b = \min(a, b)$
5. In both cases, $\phi_{seq}(i, o) \geq \min(\phi_1(i, f_1(i)), \phi_2(f_1(i), o))$ $\square$

### Theorem T3 (Associativity)
**Statement**: $(T_1 \circ T_2) \circ T_3 = T_1 \circ (T_2 \circ T_3)$

**Proof**:
1. Both compositions have:
   - Input type: $I_1$
   - Output type: $O_3$
   - Computation: $f_3 \circ f_2 \circ f_1$
2. For confidence:
   - Left: $\phi_L(i, o) = (\phi_1 \cdot \phi_2) \cdot \phi_3$
   - Right: $\phi_R(i, o) = \phi_1 \cdot (\phi_2 \cdot \phi_3)$
   - Since multiplication is associative: $\phi_L = \phi_R$
3. For safety:
   - Both equal: $\sigma_1 \land \sigma_2 \land \sigma_3$
4. Therefore, compositions are equivalent. $\square$

### Theorem T4 (Identity Tile)
**Statement**: For any type $A$, there exists an identity tile $id_A = (A, A, id, \phi_{id}, \sigma_{id})$ such that:
$$T \circ id = T = id \circ T$$

**Proof**:
1. Define $id_A$ with:
   - $f_{id}(a) = a$ (identity function)
   - $\phi_{id}(a, a) = 1$ (perfect confidence)
   - $\sigma_{id}(a, a) = true$ (always safe)
2. For $T \circ id_A$:
   - Computation: $f \circ id = f$
   - Confidence: $\phi \cdot 1 = \phi$
   - Safety: $\sigma \land true = \sigma$
3. Similarly for $id_A \circ T$
4. Therefore, $id_A$ is the identity. $\square$

## 2.4 Category Structure

### Definition D6 (Tile Category)
The **Tile Category** $\mathcal{T}$ has:
- **Objects**: Types (TypeScript type definitions)
- **Morphisms**: Tiles between types
- **Composition**: Sequential composition $\circ$
- **Identity**: Identity tiles $id_A$

### Theorem T5 (Category Laws)
$\mathcal{T}$ satisfies category laws:
1. **Associativity**: $(f \circ g) \circ h = f \circ (g \circ h)$
2. **Identity**: $f \circ id = f = id \circ f$

**Proof**: Follows directly from Theorems T3 and T4. $\square$

## 2.5 Resource Bounds

### Definition D7 (Resource-Aware Tile)
A **resource-aware tile** extends Definition D1:
$$T = (I, O, f, \phi, \sigma, \rho)$$

Where $\rho: I \to \mathbb{R}^+$ is the resource consumption function.

### Theorem T6 (Resource Additivity)
For sequential composition:
$$\rho_{seq}(i) = \rho_1(i) + \rho_2(f_1(i))$$

**Proof**: Direct consequence of sequential execution semantics. $\square$

---

## Bibliography

```bibtex
@book{maclane1971categories,
  title={Categories for the Working Mathematician},
  author={Mac Lane, Saunders},
  year={1971},
  publisher={Springer}
}

@book{pierce1991basic,
  title={Basic Category Theory for Computer Scientists},
  author={Pierce, Benjamin C},
  year={1991},
  publisher={MIT Press}
}

@article{wadler2015propositions,
  title={Propositions as Types},
  author={Wadler, Philip},
  journal={Communications of the ACM},
  year={2015}
}
```

---

*Part of the SuperInstance Mathematical Framework*

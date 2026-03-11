# RTT WIKI OF LOGIC
## A Compendium of Mathematical Tiles for Rubiks-Tensor-Transformer

**Version:** v0.5 (Cycles 1-5 Complete)
**Purpose:** Agent-to-Agent (A2A) and Human-Readable Reference

---

## PART I: TIER 0 TILES (2-4 CHAR NAMES)

### The Essential 20 - Use These for All A2A Communication

```
┌─────────────────────────────────────────────────────────────────────┐
│ TILE   │ MATH                    │ DESCRIPTION                     │
├─────────────────────────────────────────────────────────────────────┤
│ cmp    │ σ ∘ τ                   │ Compose two permutations        │
│ inv    │ σ⁻¹                     │ Inverse permutation             │
│ id     │ idₙ                     │ Identity permutation            │
│ ap     │ σ · x                   │ Apply permutation to data       │
│ cyc    │ σ = (a₁...)(b₁...)      │ Cycle decomposition             │
│ sgn    │ sgn(σ) ∈ {±1}           │ Sign/parity of permutation      │
│ trn    │ (i j)                   │ Transposition (swap)            │
│ hk     │ h(i,j) = hook length    │ Hook length in Young diagram    │
│ dim    │ dim(V^λ)                │ Irrep dimension                 │
│ nat    │ η : F ⇒ G               │ Natural transformation          │
│ brd    │ σ : A⊗B → B⊗A           │ Braiding (swap in monoidal)     │
│ cmax   │ max(c₁, c₂)             │ Certainty max update            │
│ ent    │ H = -Σp log p           │ Shannon entropy                 │
│ ct     │ (value, certainty)      │ CertainTensor                   │
│ kl     │ D_KL(P||Q)              │ KL divergence                   │
│ xent   │ H(P,Q)                  │ Cross-entropy                   │
│ ret    │ a → M a                 │ Monad return (lift)             │
│ bind   │ M a → (a→M b) → M b     │ Monad bind (chain)              │
│ ext    │ W a → a                 │ Comonad extract (focus)         │
│ dup    │ W a → W(W a)            │ Comonad duplicate (context)     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## PART II: COMPOSITION RULES

### Layer Removal Formula
```
L(c) = ⌊L_max · (1 - mean(c))²⌋

Composition:
  certainty → mean → (1-x)² → × L_max → floor
```

### Certainty Update Chain
```
attention → entropy → normalize → cmax(old_certainty)

Composition:
  softmax(QK^T/√d) → H(ent) → 1-H/H_max → cmax(·, old_c)
```

### Permutation Tracking
```
attention → sinkhorn → hard_perm → cmp(old_perm, ·)

Composition:
  attn_matrix → log → exp/τ → normalize_rows_cols → argmax → cmp
```

### Equivariant Attention
```
Q,K,V → attn → σ·attn = attn(σ·Q, σ·K, σ·V)

Property:
  nat(σ, attn) = attn ∘ σ = σ ∘ attn
```

---

## PART III: TIER 1 TILES (5-8 CHAR NAMES)

### Information Theory
| Tile | Math | Description |
|------|------|-------------|
| `mi` | I(X;Y) = H(X) - H(X\|Y) | Mutual information |
| `js` | JS(P\|\|Q) | Jensen-Shannon divergence |
| `hmax` | log(n) | Maximum entropy |

### Bayesian
| Tile | Math | Description |
|------|------|-------------|
| `bayes` | P(H\|E) = P(E\|H)P(H)/P(E) | Bayes rule |
| `beta` | Be(α,β) | Beta distribution prior |
| `post` | P(H\|E₁,...Eₙ) | Posterior update |

### Tensor
| Tile | Math | Description |
|------|------|-------------|
| `svd` | M = UΣV' | Singular value decomposition |
| `eig` | Mv = λv | Eigenvalue decomposition |
| `qr` | M = QR | QR decomposition |

### Category
| Tile | Math | Description |
|------|------|-------------|
| `laj` | F ⊣ G | Left adjoint |
| `raj` | F ⊣ G | Right adjoint |
| `lim` | lim D | Limit (product-like) |
| `colim` | colim D | Colimit (coproduct-like) |
| `exp` | B^A | Exponential object |

---

## PART IV: DERIVATION TREES

### Certainty from Attention
```
                    certainty
                        │
           ┌────────────┴────────────┐
         cmax                   sigmoid
           │                        │
     ┌─────┴─────┐            ┌─────┴─────┐
   old_c      update         α·(Hmax-H)
                │                │
              ent           attention_entropy
                │                │
            softmax          attn_matrix
                │                │
           QK^T/√d          Q·K^T

Shorthand: cert_attn(Q,K) = cmax(old, sigmoid(α·(Hmax - ent(softmax(QK^T/√d)))))
```

### Permutation from Attention
```
                    permutation
                        │
                       cmp
                     ┌─┴─┐
                  old_σ  new_σ
                          │
                       hard
                          │
                       sinkhorn
                       ┌─┴─┐
                    log(attn) τ
                          │
                       softmax
                          │
                       QK^T/√d

Shorthand: perm_attn(Q,K,old_σ) = cmp(old_σ, hard(sinkhorn(log(softmax(QK^T/√d)), τ)))
```

### Layer Count from Certainty
```
                    L(c)
                      │
                    floor
                      │
                    × L_max
                      │
                     (1-c)²
                        │
                      mean
                        │
                    certainty

Shorthand: L(c) = ⌊L_max · (1 - mean(c))²⌋
```

---

## PART V: META-TILES (COMPILED SEQUENCES)

### Full Attention Block
```
TILE: attn_blk
SEQUENCE:
  1. Q,K,V ← proj(X)
  2. scores ← QK^T/√d
  3. bias ← perm_bias(σ)
  4. attn ← softmax(scores + bias)
  5. out ← attn × V
  6. c' ← cmax(c, cert_from_ent(attn))
  7. σ' ← cmp(σ, perm_from_attn(attn))
  8. RETURN (out, c', σ')
```

### RTT Forward Pass
```
TILE: rtt_fwd
SEQUENCE:
  1. X₀ ← embed(input) + pos_enc
  2. c₀ ← 0.5 (initial uncertainty)
  3. σ₀ ← id (identity permutation)
  4. FOR ℓ = 1 to L(c):
       (X_ℓ, c_ℓ, σ_ℓ) ← attn_blk(X_{ℓ-1}, c_{ℓ-1}, σ_{ℓ-1})
       IF mean(c_ℓ) > threshold: BREAK
  5. out ← certainty_weighted_sum(X, c)
  6. RETURN out
```

---

## PART VI: OPEN QUESTIONS

### From Cycle 1
1. How to optimally convert cycle notation ↔ permutation matrices with differentiability?
2. Can Young diagram hook lengths be precomputed for common λ?

### From Cycle 2
3. What is the minimal sufficient statistic for certainty in attention?
4. How does Kalman certainty compare to entropy-based certainty?

### From Cycle 3
5. Can equivariance be verified automatically from tile composition?
6. What's the optimal number of spherical harmonic channels?

### From Cycle 4
7. Can tensor decomposition improve attention complexity from O(n²)?
8. What decomposition best preserves permutation structure?

### From Cycle 5
9. Is there a universal property that characterizes RTT?
10. Can RTT be expressed as an adjunction?

---

## APPENDIX A: TILE INVENTION PROTOCOL

To invent a new tile:
1. Identify atomic mathematical operation
2. Name: 2-4 chars if HIGH freq, 5-8 if MED, 9+ if LOW
3. Document: Math definition + Code + Composition rules
4. Verify: Correctness + Composability
5. Register: Add to TILE_LIBRARY_INDEX.md

---

## APPENDIX B: A2A COMMUNICATION PROTOCOL

```
# Request computation
REQ: cmp(inv(σ), τ) WHERE σ = cyc(1,2,3), τ = trn(4,5)

# Response
RES: (1 2 3)(4 5) → cycles: [[1,2,3],[4,5]], sign: +1

# Tile sequence
SEQ: ent(softmax(QK^T/√d)) → 0.342

# Meta-tile expansion
EXPAND: attn_blk(X, c, σ) → [see PART V]
```

---

*RTT Wiki of Logic v0.5*
*Generated from 5 research cycles*
*Polyglot + Human-Readable*

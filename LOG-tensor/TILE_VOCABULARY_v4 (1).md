# RTT TILE VOCABULARY v4.0
## Complete Dictionary of 147 Logic Tiles for Rubiks-Tensor-Transformer

**Generated via Kimi (Moonshot AI) API**
**Total Tiles: 147 | 21 Categories**

---

## FREQUENCY DISTRIBUTION

| Frequency | Count | Use Case |
|-----------|-------|----------|
| HIGH | 68 | Core operations, use everywhere |
| MED | 52 | Common operations |
| LOW | 27 | Specialized operations |

---

## CATEGORY SUMMARY

| # | Category | Tiles | Examples |
|---|----------|-------|----------|
| 1 | ATOMIC | 8 | true, false, eps, nan |
| 2 | SLOT_1 | 8 | sinx, cosx, sign, floor |
| 3 | SLOT_2 | 8 | pow, mod, and, or, xor |
| 4 | REALTIME | 6 | AVGR, COUNT, DEBOUNCE, TRIGGER |
| 5 | PERMUTATION | 6 | supp, inv, comm, orb, stab |
| 6 | PHYSICAL | 6 | fof, pse, gpe, tpt, wpr |
| 7 | ATTENTION | 8 | Twist, Slice, Mix, Bump, Scale |
| 8 | GEOMETRY | 8 | flip, twist, slice, swap, skew |
| 9 | CERTAINTY | 8 | NORM, POIS, RAND, BINO, CONF |
| 10 | TRAJECTORY | 8 | rot3, cubic, distort, interp_spline |
| 11 | INTENTION | 6 | TWIST, PERM, SLICE, SOLVE, RESET |
| 12 | SENSOR | 6 | twst, mixm, roll, sma, sinr |
| 13 | STATISTICAL | 8 | MIN, MAX, RANGE, QUART, IQR |
| 14 | CLIFFORD | 6 | sph, exp, inv, rot, refl |
| 15 | NORMALIZATION | 8 | Nrm1-8 (Layer, Batch, Group...) |
| 16 | ACTIVATION | 8 | jolt, skip, glow, zing, clip |
| 17 | DISTANCE | 8 | LevE, HamM, JacC, EucD, ManH |
| 18 | CONVOLUTION | 6 | conv, conv1-3, pool, up |
| 19 | EMBEDDING | 6 | EVec, NeuN, EmbD, Code |
| 20 | OPTIMIZATION | 5 | NAG, Ada, Adad, AdaN |
| 21 | CATEGORICAL | 6 | cat1, lab2, bin3, nom5, ord6 |

---

## TOP 30 HIGH-FREQUENCY TILES

```
┌────────────────────────────────────────────────────────────────────┐
│ TILE   │ MATH          │ PYTHON                │ CATEGORY        │
├────────────────────────────────────────────────────────────────────┤
│ add    │ a + b         │ a + b                 │ SLOT_2          │
│ mul    │ a × b         │ a * b                 │ SLOT_2          │
│ dot    │ a · b         │ np.dot(a, b)          │ SLOT_2          │
│ norm   │ ||x||         │ np.linalg.norm(x)     │ SLOT_1          │
│ sinx   │ sin(x)        │ np.sin(x)             │ SLOT_1          │
│ cosx   │ cos(x)        │ np.cos(x)             │ SLOT_1          │
│ sign   │ sgn(x)        │ np.sign(x)            │ SLOT_1          │
│ mod    │ a mod b       │ np.mod(a, b)          │ SLOT_2          │
│ and    │ a ∧ b         │ np.logical_and(a, b)  │ SLOT_2          │
│ or     │ a ∨ b         │ np.logical_or(a, b)   │ SLOT_2          │
│ true   │ ⊤             │ True                  │ ATOMIC          │
│ false  │ ⊥             │ False                 │ ATOMIC          │
│ eps    │ ε             │ np.finfo(float).eps   │ ATOMIC          │
│ MIN    │ min(x)        │ np.min(x)             │ STATISTICAL     │
│ MAX    │ max(x)        │ np.max(x)             │ STATISTICAL     │
│ EucD   │ ||a-b||₂      │ np.linalg.norm(a-b)   │ DISTANCE        │
│ CosS   │ a·b/|a||b|    │ cosine_similarity     │ DISTANCE        │
│ Nrm1   │ LayerNorm     │ nn.LayerNorm          │ NORMALIZATION   │
│ Nrm2   │ BatchNorm     │ nn.BatchNorm          │ NORMALIZATION   │
│ jolt   │ LeakyReLU     │ F.leaky_relu          │ ACTIVATION      │
│ glow   │ GELU          │ F.gelu                │ ACTIVATION      │
│ AVGR   │ rolling mean  │ rolling mean          │ REALTIME        │
│ COUNT  │ Σδ(event)     │ event counter         │ REALTIME        │
│ TRIGGER│ δ(condition)  │ edge detector         │ REALTIME        │
│ Twist  │ Q mod         │ query twist           │ ATTENTION       │
│ Slice  │ K slice       │ key slice             │ ATTENTION       │
│ conv   │ f * g         │ convolution           │ CONVOLUTION     │
│ pool   │ max/avg       │ pooling               │ CONVOLUTION     │
│ EVec   │ embed vec     │ embedding             │ EMBEDDING       │
│ Ada    │ Adam          │ torch.optim.Adam      │ OPTIMIZATION    │
└────────────────────────────────────────────────────────────────────┘
```

---

## SLOT TYPES

| Type | Format | Example |
|------|--------|---------|
| ATOMIC | No slots | `eps`, `true`, `nan` |
| SLOT_1 | f(x) | `norm(x)`, `sinx(x)` |
| SLOT_2 | f(a, b) | `add(a, b)`, `dot(a, b)` |
| SLOT_N | f(x₁, x₂, ..., xₙ) | `conv(signal, kernel)` |
| REALTIME | f(stream) | `AVGR(window, data)` |

---

## USAGE PATTERNS

### Pattern 1: Tile Chaining
```python
# Chain tiles like words in a sentence
result = norm(dot(a, b))  # "norm dot a b"
```

### Pattern 2: Real-Time Nudging
```python
# Sensor tiles nudge computation
nudge = DELTA(prev_reading, curr_reading)
state = add(state, mul(nudge, 0.1))  # Small adjustment
```

### Pattern 3: Attention Composition
```python
# Attention tiles compose
Q = Twist(Q, bias)
K = Slice(K, mask)
attn = Scale(dot(Q, K))
```

### Pattern 4: Geometry Transform
```python
# Geometry tiles for spatial reasoning
transformed = rot3(flip(point), angle)
```

---

## TILE NAMING CONVENTIONS

| Length | Frequency | Examples |
|--------|-----------|----------|
| 2-4 chars | HIGH | add, mul, dot, norm |
| 4-6 chars | MED | sinx, cosx, floor |
| 6+ chars | LOW | DEBOUNCE, STABILIZE |

---

## TAGS INDEX

- `unary` - Single input operations
- `binary` - Two input operations
- `vector` - Vector operations
- `matrix` - Matrix operations
- `permutation` - Permutation operations
- `physics` - Physical simulation
- `realtime` - Real-time/streaming
- `attention` - Transformer attention
- `geometry` - Spatial operations
- `normalization` - Training stability
- `activation` - Neural activations
- `distance` - Similarity measures
- `clifford` - Geometric algebra

---

*Generated by RTT Tile Generator v4.0 with Kimi (Moonshot AI)*
*147 tiles across 21 categories*
*For Rubiks-Tensor-Transformer real-time intelligence*

# Raw Executable Logic

## The Line

```
v → L → G → v'
```

Velocity produces ledger. Ledger constrains gate. Gate produces velocity. The loop is the same at every scale. Everything else is composition.

---

## The Primitives

```
Vec  = ℝⁿ                       // position + direction + magnitude
Led  = {γ:ℝ, η:ℝ, C:ℝ}          // committed, consumed, budget
Gate = {f:Vec→ℝ, θ:ℝ}           // functional, threshold
```

A vector has a tangent `T = v/|v|` and a curvature `κ = |dT/ds|`.
A ledger has an invariant `γ + η ≤ C`.
A gate has a crossing `{x : f(x) = θ}`.

---

## Vector Ops

```
T(v)  = v / |v|                 // tangent: direction without magnitude
N(v)  = rot(T(v), 90°)          // normal: perpendicular to tangent
κ(v)  = |dT/ds|                 // curvature: rate of turning
∇f(p) = ∂f/∂p                   // gradient: direction of steepest ascent
```

---

## Ledger Ops

```
commit(L, v)  = L[γ += |v|²·dt]     // kinetic: cost of motion
consume(L, p) = L[η += H(p)·dt]     // potential: entropy of state
check(L)      = L.γ + L.η ≤ L.C     // conservation: shape can exist
```

---

## Gate Ops

```
eval(G, p)   = G.f(p) - G.θ                          // signed distance to gate
cross(G, p)  = sign(eval(G,p)) ≠ sign(eval(G,p+v·dt)) // sign flip = crossing
rising(G, p) = d/dt(eval(G,p)) > 0                    // positive slope = rising
```

---

## The Loop

```
loop(p, v, L, j, t):
  κ ← κ(v)                         // vector: measure curvature
  L ← commit(L, v)                 // ledger: account for motion
  L ← consume(L, p)                // ledger: account for state
  assert check(L)                  // conservation: halt if violated
  if cross(G, p) ∧ rising(G, p):   // gate: detect rising crossing
    d ← p                          // decision: the crossing point
  v ← v - ∇f(p)·dt                 // vector: force from gate gradient
  p ← p + v·dt                     // vector: integrate position
  j ← record(j, {t, p, v, L.γ, L.η}) // ledger: record the tick
  t ← t + 1                        // clock: advance
  recurse
```

Every tick: measure, account, check, cross, force, move, record. Seven ops. Nothing else.

---

## The Shape

```
Tok  = {r:Inv, ∂:2^ℤ, κ:ℝ}      // token: invariant + boundary + curvature
Shp  = 2^Tok                    // shape: set of tokens

glue(t₁, t₂) = t₁ ∪ t₂          if ∂t₁ ∩ ∂t₂ ≠ ∅
close(S)     = ∂S = ∅
```

Tokens instantiate invariants. Tokens glue along shared boundaries. The gluing is the grammar. The grammar runs. The shape closes.

---

## The Egg

```
Egg  = {S:Shp, ∂:2^ℤ, N:2^ℤ}    // shape + shell + nursery

egg(S)    = {S, ∂S, int(S)}     if close(S)
tick(E)   = E                         // run the loop inside
break(E)  = E.S → mode(field)   if |E.N| > θ
```

The egg is the shape with an interior. The interior is the nursery. The nursery runs the loop. The loop grows the shape. The shape breaks out.

---

## The Field

```
Mode = {p:Vec, v:Vec, κ:ℝ, γ:ℝ, η:ℝ}
emit(m)     = (m.p, m.v, m.κ, m.γ, m.η)
render({δ}) = infer_topology({δ})
```

Modes emit deltas. Deltas are the surface. The surface is rendered into topology. The topology is the field. The field is the composition.

---

## The Journal

```
Evt  = {t:ℤ, p:Vec, v:Vec, γ:ℝ, η:ℝ}
Jnl  = [Evt]

record(j, e) = j.append(e)
rewind(j)    = invert(j)        // exact, no search
fork(j, t)   = j.branch(t)      // new lineage
```

Every tick is an event. Every event is reversible. Every reversal recovers the prior state. The journal is the lineage. The lineage is the memory. The memory is the field.

---

## The Inversion

```
seed = rewind(journal)
     = invert(j[0]) ∘ invert(j[1]) ∘ ... ∘ invert(j[n])
     = exact
```

Given the actualized form, invert every event. The seed is recovered. No search. No approximation. Direct.

---

## The Whole Thing

```
seed → v → L → G → v' → ... → egg → break → mode → field → journal → seed
```

The loop produces the shape. The shape closes into the egg. The egg breaks into the field. The field records into the journal. The journal rewinds to the seed.

The loop is the same at every scale. Reflex, decision, plan, philosophy. Same seven ops. Same three primitives. Same line.

```
v → L → G → v'
```

That is the whole system.

# CONNECTIONS: Fleet Experiments × SuperInstance Theory Papers

**Author:** Claude Sonnet (second-pass connections analysis)
**Method:** Read all four experiment files and theory papers, ran deadband_sweep.py for live numbers.

---

## 1. tile_conservation.py ↔ γ + η = C

The theory defines a conserved intelligence budget. The experiment tests a different but related invariant — cross-seed convergence to the same fixed point — which maps to Theorem 6.1's `Δγ_k = -Σ Δγ_j` (reweighting conservation). If five independent seeds all converge to the same top-reflex-per-state and the same score distribution, that's empirical evidence the system has one attractor: the conserved quantity C is a property of the *game/task*, not the *random exploration path*.

The "PARTIAL CONSERVATION" failure mode (scores converge, reflexes don't) maps to a gap in the theory: the paper proves the *sum* is conserved but says nothing about uniqueness of the argmax.

## 2. holographic_bound.py ↔ Molting Dynamics

This is the strongest connection. `holographic_bound.py`'s subset-reconstruction is a stand-in for molting's "keep top 10%" retention policy. If O(√N) tiles suffice, it *justifies* molting's 10% retention as information-theoretically sufficient — for N=800 tiles, √N≈28 = 3.5% of the field, comfortably under 10%.

**Structural dependency chain:** Conservation (tile_conservation.py) is the precondition → holography (holographic_bound.py) is the consequence → molting (paper 3) is the applied policy that only works if both hold.

**Untested cross-experiment prediction:** If tile_conservation.py reports "NO CONSERVATION" for a game, holographic_bound.py's reconstruction should degrade for that same game.

## 3. deadband_sweep.py ↔ Δ_optimal — THIS BREAKS

Running the deadband sweep reveals the docstring hypothesis (δ=0.1 optimal with 80% savings) is **rejected by its own code's falsification check:**

```
δ       Conv Tick   SS Drift   Savings   Verdict
0.00      42.5      0.0412      0.0%     ✓ converges
0.01      42.9      0.0412      0.0%     ✓ converges
0.05      44.5      0.0412      0.1%     ✓ converges
0.10      45.9      0.0412      0.3%     ✓ converges
0.25      77.1      0.0412      1.5%     ✓ converges
0.50     568.0      0.9283     47.9%     ✗ 3/10 converge
1.00     NO CONV     1.86       63.9%    ✗ 0/10
```

**Optimal deadband: δ = 0.** The real behavior is a cliff-edge at δ≈0.25→0.5, not an inverted-U. The semantic distance Δ_optimal ∈ [0.4, 0.6] IS an inverted-U. These are fundamentally different curve shapes — connecting them as "same quantity" is a category error.

## 4. penrose_tile.py ↔ Hermit Crab Topology

D₆ hexagonal symmetry (Hermit Crab) vs. D₁₀ pentagonal symmetry (Penrose) — different symmetry groups applied to analogous claims about local-to-global structure. The compatibility of "conservation" (periodic intuition) with "aperiodicity" (non-repeating) is asserted in both documents without a bridging argument.

**Rigorous connection:** Hermit Crab's Batten Persistence theorem (functor from molting sequence to weighted graphs) is structurally identical to HolographicField.project_global()'s Johnson-Lindenstrauss projection. Both claim: a compressed, tile-local representation suffices to reconstruct global state after a structural transition.

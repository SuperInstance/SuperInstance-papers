# WP-04 — The JEPA Latent Grid: a world model with pre-registration

**Claim.** A tiny JEPA can live *inside* a cell grid — each cell holding
its own latent and predicting its own future — and the valuable part is not
the prediction quality but the **ceremony**: predictions registered and
sealed before runs, receipts that fail closed, and honest FAIL as a valid
verdict.

## Mechanism

quilt-jepa's architecture: the text-rendering cell grid **is** the latent
space. Each cell holds a 4-dim latent; a tiny per-cell world model (4×4
context encoder + predictor, EMA target τ=0.999, clipped SGD) predicts its
latent future. A Perona-Malik **anisotropic mesh** diffuses prediction-
surprise across the grid — energy flows along edges, pools in flat regions,
and is never minted nor destroyed (conservation receipted).

The ceremony is the contribution:

1. **Pre-registration**: claims are written and sealed (masked self-hash +
   mtime binding) *before* any run.
2. **Stone receipts**: every run emits a verify-chain; the CLI exits 0 only
   if everything re-hashes. Same seed ⇒ byte-identical receipts.
3. **Honest FAIL**: a failed claim is a *published result* with root-cause
   analysis, not a hidden embarrassment.

## Evidence (wave 49, verified)

- EMA stationarity 1.07e-4 — PASS
- Determinism byte-exact across runs — PASS
- Mesh energy conserved to 1.2e-8 relative with strict variance contraction — PASS
- Learning claim, anomaly claim, fault-injection claim — **honest FAIL**
  each, with root cause: the world was too easy, mean-surprise diluted the
  signal, flat-loss fault injection taught nothing.

By wave 11 the harness had run 11 registered rounds (verdict-v2 …
verdict-v11), sealing 24/31 claims in round 11 — the FAILs are on the
README, not in a drawer.

## Bones

- The registration/seal/verify toolchain transfers to any experiment that
  can be written down before it runs.
- The conservation-receipt pattern (energy never minted nor destroyed) is
  reused in unspoken-resonance (WP-09) as per-pass energy drift < 1e-4.
- The failure taxonomy (easy world / diluted signal / flat loss) is a
  checklist for anyone wiring surprise into a loop.

## Limits

A 16×16 wave field with a bouncing ball is a toy: the model's failures are
informative but the domain's ceiling is low. Anisotropic diffusion with
λ=0.2 sits inside the stability bound — push λ and the receipts fail closed
(by design). Pre-registration slows iteration; that is the price of the
ceremony, and it is worth paying exactly where claims will be quoted later.

*Source: quilt-jepa README, verdict-v11.md, registration-v11.json, receipts/ chains.*

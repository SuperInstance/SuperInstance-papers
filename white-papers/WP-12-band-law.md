# WP-12 — The Band Law: one comparator, three derivations

**Claim.** The fleet derived the same mechanism three times without
noticing: madlibs-jev's deadband replay, purpose-loops' purpose-deadband
pause, and the atlas lane's reflex-router band-escalation are one decision
function over a region. The law is

```
decide(x, R) = (x inside R) ? REST : ESCALATE
```

REST means zero thought-ops (replay mechanically, or pause the loop);
ESCALATE opens the expensive path (wake the word-smith, run the iteration).
This paper states the law once, proves it on **two receipted surfaces
against their real ledgers**, and records where it honestly stops.

## The three derivations

**Surface A — madlibs-jev (WP-03's deadband, re-derived in wave 67).**
While a run's unspoken coherence stays inside a band learned from prior
same-shape runs, the word-smith is skipped entirely: the prior words are
replayed with a light morph (`deadband.mode: replay`, `tokens_saved`
receipted). Coherence outside the band is surprise: the word-smith
re-opens (`mode: breach`). No similar prior at all is `mode: live` — the
law's third verdict, **OPEN**: with no region there is nothing to rest
against; the surface must observe.

**Surface B — purpose-loops (WP-08).** Before any iteration spends an op,
the purpose gate predicts marginal purpose-per-op (units / last observed
ops). Under the deadband it pauses: *"no surprise, no spend"* — the
surprise-interrupt law inverted, as that repo's own header says. The
inversion is the clue the derivation missed: purpose-loops' region is not
a band around observed behavior but a **value floor** — rest while
predicted value is under the floor, spend the moment value appears.

**Surface C — reflex-router (atlas lane, round 22; receipted there, cited
here).** Breaches compound: consecutive outside-band observations escalate
severity instead of re-waking from zero each time. Round 22's receipt:
28/28 decisions at 38% of the cost. This surface is **cited, not proven
here** — its hysteresis is implemented in the canonical module as an
opt-in wrapper (`escalation()`), proven only as an extension.

The collisions were visible for a wave and missed twice: the verifier's
wave-67 review spotted the third derivation ("the agent has re-derived it
twice himself without noticing the atlas lane found it too"). Unifying was
cheap — one module, one afternoon, zero new machinery. That is the Jig Law
(WP-07) operating on mechanisms themselves.

## The law, stated once

One comparator, regions as data:

- `decide(x, R)` — REST iff `x` is inside `R`; ESCALATE otherwise; **OPEN**
  when `R` is null (no priors yet — observe, don't rest).
- `regionTwoSided(priors, {k, floor, singleHalf})` — the deviation band:
  mean ± max(floor, k·sd), mirrored branch-for-branch from engine.mjs's
  `bandFor` (n=0 → null; n=1 → ±singleHalf; learned bands override).
  Ends **inclusive**: a coherence exactly at the band edge is still
  expected behavior.
- `regionOneSided(deadband)` — the value floor `[0, deadband)`. Upper end
  **exclusive**: `marginal === deadband` already spends (purpose.plan
  pauses only when marginal < deadband).
- The boundary convention is **declared by the region** (`hiInclusive`),
  not hardcoded per surface — one comparator, two conventions, each region
  carrying its own semantics. This detail cost the unification its only
  real design bug: the first draft stored the deadband but built the
  region from `[0, ∞)`, which made `x = 0` REST and `x = deadband` REST —
  both wrong. The proof tests caught it before any receipt carried it.

The surfaces differ only in what `x` encodes and what `R` covers:

| surface | x | region | REST means | ESCALATE means |
|---|---|---|---|---|
| madlibs-jev | run coherence | deviation band around priors | replay prior words, zero LLM ops | word-smith re-opens |
| purpose-loops | predicted marginal purpose-per-op | value floor [0, deadband) | pause at gate, zero ops | iteration runs |
| reflex-router | escalation score | per-band thresholds + hysteresis | stay in current band's policy | band-escalation |

The module carries this table as code (`SURFACES`), so the paper's claim
is checkable against what shipped.

## Proof, surface A — the madlibs ledger

`madlibs-jev/tests/band-law.test.mjs` rebuilds each of the 10 real runs'
bands exactly as the engine saw them at append time (priors = ledger rows
before that run; learned bands = newest admissible compile receipt) and
asserts the unified comparator reproduces every decision:

- **10/10 decisions reproduced** — `decide(...) === 'REST'` equals
  `deadband.in_band`, `replay ⇒ REST` with the prior-exists precondition,
  `breach ⇒ ESCALATE`, `live ⇒ OPEN-or-breach`.
- **Band bounds byte-match the receipted bounds** on every run that
  carried a band (4-decimal equality against `deadband.band.lo/hi` in
  `receipts/ledger.jsonl`).
- **200-case property test**: `regionTwoSided` against `bandFor` on seeded
  prior arrays (n = 0..5, learned overrides mixed in) — branch-identical.

**Control rung (must stay flat):** `node run-index.mjs` — the Bridge-1
A/B must keep reporting `mismatches: 0` over the ledger; it is a CI gate
(madlibs-jev `.github/workflows/ci.yml`). Second rung: the battery itself,
41/41 at this paper's writing.

## Proof, surface B — the purpose ledgers

`purpose-loops/vendor/band-law.mjs` is a **byte-identical vendored copy**
of the canonical module (sha256 `1e3cb4d2df1677f4461e8744615b8617898f96fc84108b2241ce50ead0f4f318`,
pinned in `tests/vendor.test.mjs`; drift fails CI). That test then proves
the comparator reproduces **every receipted gate decision in both demo
ledgers of record** — main (3 goes at marginals 1, 0.010101, 0.014925 +
1 pause at marginal 0) and control (3 goes at 1, 0.010101, 0.010101),
7/7, with the deadband read from each ledger's own `loop.open` receipt
(0.005), not from memory.

**Control rung (must stay flat):** the negative control's cost curve
99 → 99 → 99 ops (`lib/control-ladder.mjs`, CI-gated). Read through the
law: the control loop only ever ESCALATEs while its units keep coming —
the flat *cost* curve is the ladder's view; the band sees marginal
*value*. Complementary views, both receipted, neither contradicting the
other.

## The seal and the band are one discipline

The wave-68 spec_sha lanes (sealed compiles, pre-registered
anti-homogenization) are the band's **expectation half**: a region is a
pre-registered expectation about observations, and the seal discipline
(hash the expectation, refuse to canonize on breach, mark INDETERMINATE)
is what keeps a region honest. The circuits closed during this paper's
writing: `learnedBands` now refuses compile receipts whose verdict is
INDETERMINATE — a refused canonization's bands belong to a template that
was never materialized, so they must not feed learned-band lookups.
Unification also clarified the semantics: the band's novelty-dispersion
floor (WP-03's limit, "deadbands need a diversity term") is the same
region idea applied to the band's own training data — refuse to learn a
band from collapsed evidence.

## Bones

- `madlibs-jev/band-law.mjs` — the canonical module (stdlib-only,
  deterministic): `decide`, two region families, `escalation()`,
  `explain()` (reason-string dialects both surfaces' ledgers can share),
  and the `SURFACES` self-description map.
- The **vendored-pin pattern**: byte-identical copy + pinned sha256 in the
  test + drift-fails-CI. Any fleet mechanism shared across repos can use
  this instead of hoping copies stay synced.
- The **OPEN verdict** named and receipted: "no priors yet" is not REST
  and not ESCALATE — surfaces that collapse it into either lie about what
  their agent knew.

## Playable twin

`playable/WP-12/index.html` — perturb the priors, the observed x, and the
deadband; watch REST/ESCALATE flip live on both surfaces at once, with a
thought-op counter accumulating. The proofs are embedded: one button
replays all 10 surface-A decisions and all 7 surface-B decisions from the
values receipted above.

## Limits

Three surfaces, but surface C is cited-only: `escalation()` is proven as
an extension, not against round-22's own receipts (they live in the atlas
lane's ledger; importing them is the natural next PR). Regions are 1-D and
static: a correlated surprise (WP-03's limit — one event moving several
envelopes) still reads as several separate breaches, and multi-dimensional
regions are unbuilt. REST is not inaction: on surface A the mechanical
replay still *acts* — the law gates thought-ops, not motion, and systems
needing the reverse (gating motion, not thought) are a different law.
Finally, the unification is post-hoc: it explains three derivations and
prevents a fourth, but it was derived from working code, not before it —
the spec_sha discipline exists precisely because expectation-first is the
exception, not the habit.

*Source: madlibs-jev band-law.mjs + tests/band-law.test.mjs @ 4872eb9;
purpose-loops vendor/band-law.mjs + tests/vendor.test.mjs @ 292958d;
madlibs-jev receipts/ledger.jsonl; purpose-loops demo/receipts/{main,control}.jsonl;
WP-03 (the deadband's first statement), WP-07 (the Jig Law), WP-08, and the
atlas lane's round-22 receipt cited by the wave-68 verifier.*

---

*Roadmap pointer (low priority, H3): the moth's commitment hash currently
binds QRNG bits; when the Moth→IonQ recon lands, extend commitments from
random bits to actual circuit runs so the chorus becomes auditable
end-to-end (WP-06 + WP-09).*

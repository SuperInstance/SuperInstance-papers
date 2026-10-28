# WP-08 — Purpose-Loops: RSI for a purpose, not runs

**Claim.** Runs are spent; loops cultivate. A **purpose-loop** wraps every
attempt in a cycle — ATTEMPT → MEASURE → COMPILE → RESHAPE — whose success
metric is not the attempt's quality but the **delta cost of the same task
shape** over time. This is recursive self-improvement pointed at something:
the loop improves the cultivator, not just the crop.

## Mechanism

- **Purpose ledger.** The purpose is a standing sentence plus a measurable
  stop-condition. Every iteration cites how it served the purpose. The loop
  PAUSES itself when marginal purpose-per-token falls below a deadband —
  the inverse of the surprise-interrupt (WP-03): *no surprise, no spend.*
- **Receipts.** Append-only JSONL, sha-chained tips; every iteration's
  attempt, measurement, compile, and reshape is a row.
- **Bones.** What compile mints (WP-07): jigs, LUTs, presets, validators,
  lexicons — each with provenance and measured costSaved, each injected
  into the next attempt's environment.
- **The cost curve is the verdict.** A falling curve with a flat negative
  control is the whole proof. No curve, no claim.

## Evidence

Offline (deterministic, zero network): flashcard-capsule × 3 topics —
main loop 99→67→38 ops; control 99→99→99; purpose ledger closed the loop
with a pause when marginal purpose fell below deadband 0.005.

Live (3 real LLM calls): prompt chars 679→653→646 with a frozen style bone;
all three capsules 5-valid. One preserved honest failure teaches the
deepest lesson of the paper: **unbounded re-compilation is anti-RSI** —
the loop that rethinks everything every iteration got *worse* (679→655→693)
until the deadband law was applied to its own compiler.

## Bones

- The loop-receipt schema (purpose-citation per iteration) — any agent
  system can adopt it to answer "why did you just do that?"
- The self-pausing deadband on marginal purpose — a portable guard against
  spend-without-surprise.
- The cost-curve-as-verdict convention: claims about improvement must
  carry the curve and the control.

## Limits

One shape (flashcard-capsule) is demonstrated; a portfolio of purposes
with bone-sharing between shapes is future work. Operation-count cost is a
proxy currency. And the loop's honesty depends on the measure step — a
self-scored payoff is a confession, not a measurement, unless the receipts
make it auditable.

*Source: purpose-loops core/loop.mjs, core/purpose.mjs, demo/summary.json, demo/llm-receipts/llm-summary.json.*

# WP-09 — The Spoken & The Unspoken: a resonance harness

**Claim.** Wherever a "last-mile" language layer sits on top of a
deterministic frame, the layer below can be tuned by **soft, silent
instruments** — validators, predictors, certified randomness — whose nudges
accumulate, resonate, and feed back, so that language arrives last, as
clothing. One spoken call; many unspoken nudges.

## Mechanism (unspoken-resonance, wave 67)

1. **The frame.** A procedural 4×3 scene grid (light / motion / presence
   per cell, [0,1]) — the drum-frame, generated from seed before any words.
2. **The chorus.** Three instruments, each a nudge in [-1,1] per channel:
   - **JEV** judges frame-vs-field agreement and is *deformed by judging*
     (its memory norm is receipted per pass — the rhizome law, WP-02);
   - **JEPA** predicts each channel's next mean (EMA target τ=0.999) and
     contributes its **surprise** — attention flows where the predictor is
     wrong;
   - **MOTH** perturbs softly (amplitude ≤ 0.35) with comet-qrng bits
     carrying a submit-time commitment hash (WP-06).
3. **The field.** Nudges accumulate with damping: F = 0.85·F + 0.15·nudge.
   The frame drifts toward the field (damped, energy-conserving; drift
   receipted < 1e-4 per pass — the conservation discipline of WP-04).
4. **The play condition.** Resonance (cosine self-agreement of consecutive
   fields) ≥ 0.82 **and** field weight (RMS) > 0.05. The second guard is
   the muffled-drum refusal: a field collapsed to zero is maximally
   self-agreeing and perfectly dead.
5. **The skin.** One word-smith call receives the tuned field as soft
   guidance — never a blank, always a shaped drum. Offline, a deterministic
   lexicon skin, honestly labeled `llm:false`.

## Evidence

Five offline campaigns (deterministic; drum plays at passes 4–9, resonance
≈ 0.998) and three live campaigns (quantum moth + LLM skin; all played,
passes 5–6, resonance ≥ 0.9993, commit c47b6725… bound in receipts). The
skins are visibly field-shaped: the dark-still seed tuned to "a lamp… as if
remembering it had once been brighter"; the pale seed to "light hung thin,
barely enough to blush the dust motes." 10/10 tests, including the
muffled-drum refusal and skin register-flipping.

## Bones

- The chorus shape (validator + predictor + certified chance) ports to any
  last-mile domain: prose, music arrangement, level design, UI themes.
- The muffled-drum guard: any convergence condition needs a weight term or
  it will certify silence.
- Receipted nudge attribution — the spoken/unspoken budget is auditable
  per pass.

## Limits

Resonance rewards stability; a diversity term (shared with WP-03/WP-05's
coherence lesson) is future work. The drift rule is a damped pull — the
Perona-Malik diffusion from WP-04 would let surprise *pool* instead of
smooth. Live moth bits are emu-mode (uncertified baseline), and the demo's
client port is pinned to the engine by tests but is a visual simplification
(no energy renormalization in-browser).

*Source: unspoken-resonance core.mjs, run.mjs, receipts/ledger*.jsonl, tests/core.test.mjs.*

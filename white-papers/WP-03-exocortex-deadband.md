# WP-03 — The Exocortex & The Deadband Law

**Claim.** Thought-tokens are the scarcest resource of any playing agent.
The exocortex does not eliminate them — it **migrates** them: from routine
self-maintenance, to surprise handling, and finally outward, to reading the
other players. The enabling mechanism is the deadband.

## Mechanism

Three laws (erised-exocortex, quoted from the founder's directive):

1. **COMPILE.** A strategy that worked *repeatedly* — same trigger shape,
   positive payoff, low variance, across nights — becomes an **ExoJ**: a
   mechanical autoplay script carrying a trigger, a lookup-table policy
   (soft joints, table-not-thought), and a **deadband** calibrated from the
   observed variance of the nights it learned from.
2. **DEADBAND.** While scene state stays inside the envelope, the iterator
   spends **zero thought-tokens** on that beat. The Risk law: *the dice are
   mechanical; continue your motion until surprise interrupts or the turn
   concludes.*
3. **INTERRUPT.** On breach (dice twist, another's move, the world), the
   ExoJ **seizes**: the iterator wakes at full thought and either
   re-imagines the ExoJ (version bump, deadband recalibrated from the
   breach) or retires it. Breaches are **sticky** — the scar survives
   rewind.

The economics receipt: thought-tokens per night fall on routine beats;
interrupt-tokens appear only at breaches; **table-reading tokens rise**.
Predictability is the price of automation — your compiled double is a
pattern others can learn, and *getting read is the surprise that matters*.

## Evidence

The erised-exocortex campaign (wave 66): three live acts, 593 receipted
sequences, five model-cast voices, every ExoJ carry/re-imagine/retire/hand-
off decision gated and pinned (13 pins). The handoff law executed live —
a pattern handed from one voice to another at the table with the gate roll
receipted. In wave 67 the same law re-derived itself in two new places:

- **madlibs-jev**: 10 runs → 6 live word-smith calls, 4 deadband replays
  (~1.8k chars of avoided generation). Replay receipts carry
  `deadband.mode: replay` + `tokens_saved`.
- **purpose-loops (live)**: recompiling a style bone every iteration made
  the prompt curve *rise* (679→655→693 chars) — bone accretion. Applying
  compile-once-freeze-until-surprise turned it monotonic down
  (679→653→646) with all outputs valid.

## Bones

- The deadband genotype is now ported across four expressions (exocortex,
  jeviter ratchet, jev-quilt, jev-garden) on one variation axis: what each
  believes surprise *is* (teaching/noise/signal/season).
- The twice-refused retirement rite: the fleet's own myth of when NOT to
  retire a compiled habit.
- A reusable recipe: replay-receipts with `tokens_saved` as a first-class
  field.

## Limits

Deadbands encode the world that trained them; a correlated surprise (one
that moves several envelopes at once) is read as several separate breaches.
Coherence-chasing can flatten exploration — discovery-skin v2 regressed
(0.60→0.54 coherence) because the compile step rewarded agreement over
novelty. Deadbands need a diversity term, not just a variance band.

*Source: erised-exocortex DESIGN.md + pins; madlibs-jev ledger; purpose-loops llm-receipts.*

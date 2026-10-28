# WP-06 — Platonic Randomness: chance as a fair participant

**Claim.** Randomness in a multi-agent creative system should be neither
noise to be minimized nor a hidden seed to be mined — it should be a
**fair participant with an auditable provenance**. When the dice are
certifiably fair and everyone can see the receipt, chance stops being an
adversary and becomes a collaborator.

## Mechanism

Three layers, one principle:

1. **Dice at the table.** In the erised campaign, conflicts are decided by
   dice, deliberately: *"sometimes a roll of the dice moves the story along
   instead of the logic hashed out to death."* The dice are mechanical —
   the Risk law — and the deadband is calibrated to their variance
   (WP-03). A retirement rite refused twice by the dice became canon: the
   story kept what the gate refused to kill.
2. **Certified bits.** The mothquantum comet-qrng engine prepares qubits in
   |+⟩, measures (Aer baseline or IBM QPU), estimates min-entropy with NIST
   SP 800-90B estimators on the *real output*, runs a seeded Toeplitz
   extractor, and returns bytes **with the full audit chain**: a commitment
   formed at submit (circuit hash, backend, salt) before any outcome
   existed, plus a Bell-witness fidelity estimate and an honest caveat that
   fixed measurement settings are not device-independent certification.
3. **The moth as instrument.** In unspoken-resonance (WP-09), the quantum
   nudge is soft (amplitude ≤ 0.35) and receipted with its commitment hash;
   fallback is seeded xorshift, honestly labeled `fallback:xorshift` vs
   `mothquantum:comet` in every row.

The fleet seal convention: seeds minted by the moth-seal service, labeled
fallback when the certified path fails — the *label* is never allowed to
lie, even when the randomness is ordinary.

## Evidence

- Wave-63 probe: comet channel-health job completed, Bell witness S = 2.819
  (max 4.0 for CHSH) with the caveat receipted inline.
- Wave-67 live campaign: three seeds tuned by quantum nudges, commitment
  `c47b6725…` bound into the campaign receipts, backend `aer`.
- Erised acts: dice-gated retirements and handoffs among 593 receipted
  sequences; the twice-refused retirement is the deadband's founding myth.

## Bones

- The provenance schema (commit-before-outcome, backend, circuit hash) is
  reusable wherever randomness must be *argued about later* — disputes,
  canon repair, replays.
- The fallback-honesty convention: any stochastic system can adopt
  `certified` vs `fallback` labeling in receipts, costlessly.

## Limits

emu-mode bits are a simulator baseline — honestly uncertified. Quantum
sessions cost quota and latency (~2.5s polls); high-rate uses should batch.
And a fair die is still a boring character if the game only asks it yes/no
questions — the dice earn their seat by being allowed to *interrupt*, not
just to fill.

*Source: probe63 receipts; unspoken-resonance run.mjs + ledger-live.jsonl; erised-exocortex acts.*

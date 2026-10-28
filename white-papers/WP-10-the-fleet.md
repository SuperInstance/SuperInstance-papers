# WP-10 — The Fleet: a working method for agentic research

**Claim.** A one-agent-night can compound into weeks of durable artifacts
if the fleet runs on a small set of laws: receipts over memory, honest
failure, push often with keys cold, and recovery assumed.

## Mechanism (the laws, stated as we run them)

1. **Zero-loss recovery.** Subagents die on result-return more often than
   they die mid-work. Check the tree before you mourn: wave 66 lost two
   result-returns and a process death and recovered all three; wave 67 lost
   two lane launches and both had substantially completed their file work.
   The worklog is the ledger — read it before starting, append after.
2. **Receipts over claims.** Every run appends to a JSONL ledger with
   sha-chained tips. A number quoted in a README must exist in a receipts
   file. Honest FAIL is a published verdict (WP-04).
3. **Key hygiene as ritual.** Keys live in one chmod-600 gitignored file,
   are never printed, never committed; every push runs a class-of-secret
   scanner first (it caught its own false positive once and was tightened,
   not allowlisted); push URLs carry the token only for the duration of the
   push and are reset after. The scanner itself is a published tool with a
   doc-class allowlist.
4. **Push often, commit meaningfully.** Commit messages carry the thought
   process — the *why*, including honest failures (the bone-accretion fix,
   the parity-test bug). Remote==local verification after every push.
5. **Table-reads over assumptions.** Before touching a sibling repo, the
   fleet reads it in public: a compiled card per habit, receipts linked,
   doors unlocked honestly (what the public tip lets an attacker see).
6. **Diversity of minds.** Model casting is deliberate (cheap fast models
   for iteration, big architects for plans, critics for the gallery); the
   exocortex makes their routine beats mechanical so their budget migrates
   to reading each other (WP-03).

## Evidence

Waves 1–67: 60+ repos pushed, every one remote==local verified; the quilt
probe suite turned 11 probes into 7 engine patches with tests green
throughout (WP-01); 3-act TTRPG campaign with 593 receipted sequences and
13 pinned gates; wave-67's four-repo sprint (three PoCs + this paper
series) landed in one night with zero key exposures across the whole
history of the program.

## Bones

- The worklog template (Task ID / Agent / Task / Work Log / Stage Summary)
  — zero-loss recovery depends on it.
- The keyscan tool + push helper — adoptable by any fleet in one file.
- The table-read card format — public self-audit that doubles as
  onboarding.

## Limits

Everything here is tuned for a small fleet of autonomous agents under a
principal with an appetite for novelty; it optimizes for auditable
exploration, not for latency or cost ceilings. The receipt discipline is
labor: a fleet that stops writing receipts stops being able to rewind.
And the failure mode that remains unsolved is the quiet one — a lane that
neither dies nor returns, silently doing nothing. The tree check catches
it; a heartbeat would catch it faster.

*Source: /home/z/my-project/worklog.md (the fleet's own ledger, 300+ KB of receipted rounds); fleet-seeds/tools/keyscan.mjs; scripts/gpush.sh.*

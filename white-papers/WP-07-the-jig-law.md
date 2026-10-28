# WP-07 — The Jig Law: shaping the environment that cultivates decisions

**Claim.** The unit of value in a research fleet is not the answer — it is
the **bone**: the reusable skeleton a result leaves behind. "We are not
saving the decision tree; we are shaping the environment that cultivated
the right decision or tool or app or library." A jig is not better, faster,
or cheaper at its own task; it makes every *future task of that shape*
cheaper to fixture.

## Mechanism

The law operationalized (purpose-loops, wave 67):

1. **Bones are first-class artifacts.** Every bone carries: kind (jig |
   lut | preset | validator | lexicon), body, **provenance** (the receipts
   that minted it), reuse count, and an honestly-measured `costSaved`
   (ops-without vs ops-with).
2. **Bones reshape the environment, not the decision.** The next attempt
   does not replay the old answer — it *starts in a world already containing
   the bone* (env injection). The decision is made fresh, but cheaper,
   because the world is shaped.
3. **Compile on surprise only.** The deadband law (WP-03) applies to bones
   themselves: a bone that re-fattens every iteration makes the cost curve
   *rise* — observed live (679→655→693 prompt chars). Compile once, freeze
   until a breach, then re-mint (679→653→646).
4. **The negative control is the proof.** Same code, bones withheld, flat
   cost curve: 99→99→99 ops vs 99→67→38 with bones. The difference is the
   environment, not luck.

## Evidence

purpose-loops receipts: flashcard-capsule shape × 3 topics, deterministic
strategy, zero network. Main loop 99→67→38 operations; control flat at 99;
per-bone costSaved receipted (lexicon bone: 28 ops without, 8 with, reused
twice). Live LLM variant: 3 real calls, prompt chars 679→653→646, all
outputs 5-valid cards, style carried by a frozen LUT + one example.

The same law appears fleet-wide, retroactively readable as jig-building:
the quilt probe suite (WP-01) is a jig for engine-debugging; the
registration/seal toolchain (WP-04) is a jig for making claims; the push
discipline (WP-10) is a jig for safe shipping; the exocortex (WP-03) is
a jig for attention itself.

## Bones (the Jig Law paper is itself a jig)

- The bone-registry schema with measured costSaved — adopt it anywhere
  "we did this before" needs to become "this costs less now."
- The negative-control pattern for proving that bones (not varnish) did
  the work.
- The freeze-until-surprise re-mint rule, now validated in two repos.

## Limits

Bone extractors are shape-specific: the flashcard shape ships, other shapes
pay their own one-time jig cost — that cost *is* the thesis, but it must be
counted honestly. costSaved measured in operations is a proxy; wall-clock
and dollars need their own ledgers. And bones accrete stale assumptions:
a bone registry without a retirement rite becomes a junk drawer.

*Source: purpose-loops README, core/bones.mjs, demo/summary.json, demo/llm-receipts/.*

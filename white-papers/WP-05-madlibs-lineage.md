# WP-05 — The Madlibs Lineage: from word blanks to cell blanks

**Claim.** The blank is the unit of composition. Each generation of the
madlibs family moves the blank up one level of abstraction — words →
discovery moves → **paradigms** → **typed cells** — and each move pushes
the LLM further down the stack, from author to filler to **last-mile
word-smith**.

## Mechanism (four generations)

**Gen 1 — discovery-mad-libs.** A template is a JSON: `fields`, a
`system_prompt`, a `discovery_prompt`, an `evaluation_prompt`. Sessions are
timestamped; **branch points** record where a run diverged, and
`--rewind-to 003 --redirect "you assumed X"` re-branches from there keeping
the old branch. The blank = a slot in a prompt.

**Gen 2 — madlibs-gan.** The blanks become **paradigms** (structured
formats with explicit slots) and the players become models: producer A
makes the template, filler B fills it, critic C tries to break it,
edge-finder D finds where the paradigm itself fails, and **JEV + JEPA vote**
on the winner; a winning combination is canonized as a new substrate cell.
The blank = a paradigm slot; the game = outwitting the other's format.

**Gen 3 — madlibs-gan-turbovec.** All past paradigms (template + fills)
are indexed (TurboQuant, hashed embeddings) so a new game can find similar
past games for inspiration. The blank = a query into memory.

**Gen 4 — madlibs-jev (wave 67).** The template itself becomes a **JEV
sheet**: `situation` cells (spoken blanks), `structure` cells (pure
formulas — the unspoken skeleton), `nudge` cells (a weighted, resonating
field with a coherence score), and `wordsmith` cells — the **only** cells
allowed to call a model. Deadband replay skips the model when the shape is
familiar and coherent (the exocortex law, WP-03); compile steps re-tune
nudge weights from run receipts, append-only, parent-sha-chained. The
blank = a cell; the LLM = the last-mile.

## Evidence

Gen 4 receipts: 10 runs across 2 templates × 2 versions; 6 live LLM calls,
4 mechanical replays; scene-skin coherence 0.46→0.56 after compile;
discovery-skin 0.60→**0.54** (honest regression: the compile chased
agreement and flattened the `novelty` axis, weight 1→0.2 — kept visible in
the README). Demo parity is test-pinned: the browser port of the core is
asserted equal to the engine on a fixed battery (18/18 tests).

## Bones

- Template-evolution receipts (parent sha → child sha) — reusable for any
  artifact that refines itself from run history.
- The deadband-replay ledger schema (`tokens_saved` per run).
- Demo-parity pinning: if the browser re-implements the engine, a test
  proves it.

## Limits

The shape-memory in gen 4 is honest-but-shallow (choice equality + token
Jaccard) — a stub for gen 3's turbovec index. Coherence as a compile target
needs a diversity term (see WP-03 limits). And four generations now exist
across four repos with four LLM dispatchers — consolidation is owed.

*Source: discovery-mad-libs engine + templates; madlibs-gan madlibs.py; madlibs-gan-turbovec; madlibs-jev engine.mjs + receipts/ledger.jsonl.*

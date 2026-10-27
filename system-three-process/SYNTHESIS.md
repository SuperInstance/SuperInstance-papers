# Synthesis and process record — the System Three paper exercise

**Lane:** system-three-paper. **Date:** 2026-10-27. **Coordinator:** Muse (subagent), reporting to the main agent for Casey (SuperInstance).
**Deliverables:** [FORMAL-PAPER.md](sandbox://workspace/system-three-paper/FORMAL-PAPER.md) · [adjudication.md](sandbox://workspace/system-three-paper/adjudication.md) · [review-kimi.md](sandbox://workspace/system-three-paper/review-kimi.md) · research packs ([zcode](sandbox://workspace/system-three-paper/research/zcode-pack.md), [mcode](sandbox://workspace/system-three-paper/research/mcode-pack.md)) · outlines ([zcode](sandbox://workspace/system-three-paper/outlines/zcode-outline.md), [mcode](sandbox://workspace/system-three-paper/outlines/mcode-outline.md)) · superseded interpretive drafts ([claude-code](sandbox://workspace/system-three-paper/drafts/claude-code.md), [kimi](sandbox://workspace/system-three-paper/drafts/kimi.md))

---

## 1. How the mission changed shape

The exercise began as four equal interpretive drafts of the seed (`~/workspace/concepts/system-three.md`), one per seat. At 10:39 AKDT Casey restructured it into a staged pipeline — research and competitive outlining (ZCode, MiniMax Code) → adjudication and a formal, totally non-metaphorical paper (Claude Code) → adversarial review (Kimi Code) → one optional revision pass. Nothing already done was wasted: the two interpretive drafts launched under the first plan (Claude Code, Kimi) were complete or completing when the restructure arrived and are kept in `drafts/` as process record; the two TUI seats (ZCode, MCode) had not yet launched — both were waiting on booked slots behind the chrono-tensor lane — so they took the new stage-1 briefs without any seat being disturbed mid-writing.

## 2. Bookings

Per the board protocol (`schedule/` in SuperInstance/agent-inbox), this lane booked: ProArt `claude-code` from 18:35 UTC, `mcode` from 19:00 UTC, `zcode` from 19:50 UTC; Thor `kimi` from 18:35 UTC. The ProArt TUI seats were occupied when the lane opened (chrono-tensor: zcode to ~19:47, mcode to ~18:55), so the lane booked *after* them and waited — first booking won, nobody was evicted. No GPU was booked or used. Later commits marked MCode and ZCode DONE on delivery and rebooked Claude Code (stage 2) and Kimi (stage 3); a final commit closed the lane. Board commits: `2290241` (bookings), `9b21f7a` (DONE/rebooks), `2459845` (closure).

One infrastructure finding: git pushes from this coordinator's VM failed (no GitHub credentials configured for the clone, HTTPS and SSH alike). The bookings were therefore pushed from a scratch clone on the Thor, whose `gh` is authenticated as SuperInstance. The content is identical; the detour is recorded here so the commit provenance is not a surprise.

## 3. Provenance of Casey's late seed elements

Eight late elements and two estimate elements arrived during the exercise. Which materials each voice worked from:

| Element (2026-10-27) | Claude draft | Kimi draft | ZCode pack/outline | MCode pack/outline | Formal paper |
|---|---|---|---|---|---|
| 1. Aim set by responsibility (10:30) | ✓ prompt + seed | ✓ prompt + seed | ✓ seed | ✓ seed | ✓ seed |
| 2. Captain as contractor; specs as the test (10:30) | ✓ prompt + seed | ✓ prompt + seed | ✓ seed | ✓ seed | ✓ seed |
| 3. The four spec lines (10:31) | ✓ prompt + seed | ✓ prompt + seed | ✓ seed | ✓ seed | ✓ seed |
| 4. Three-party trust architecture (10:33) | ✓ prompt | ✓ prompt | ✓ seed | ✓ seed | ✓ seed |
| 5. "A contractor is like an agentic application" (10:34) | — launched | — launched | ✓ seed | ✓ seed | ✓ seed |
| 6. Trust of the department first (10:34) | — launched | — launched | ✓ seed | ✓ seed | ✓ seed |
| 7. Knowing where certification lies (10:35) | — launched | — launched | ✓ seed | ✓ seed | ✓ seed |
| 8. Debt riding on all certificates (10:35) | — launched | — launched | ✓ seed | ✓ seed | ✓ seed |
| 9. The estimate as decisive product (10:39) | — | — | ✓ prompt (required) | ✓ prompt (required) | ✓ brief (required) |
| 10. Debts against the forecast; burn-down test (10:40) | — | — | ✓ prompt addendum | ✓ prompt addendum | ✓ brief (required) |

Mechanics, for honesty: elements 1–3 were folded into the delivered seed itself by the parent lane (the seed grew 9,188 → 9,653 bytes mid-exercise) and were *also* appended verbatim to all four interpretive prompts; element 4 was appended to all four prompts before any launch; elements 5–8 arrived after Claude Code and Kimi had launched, so by the standing rule they went only to the unlaunched seats' prompts. After the restructure, the parent lane folded all eight elements into the seed (12,960 bytes, md5 `9fe5bdc9…`, verified identical on this machine, the Thor and the ProArt); that enriched seed is what both stage-1 seats read and what Claude Code formalised. The two estimate elements reached the pipeline as explicit requirements in the stage briefs rather than via the seed.

**The aim theme across the voices.** Where each voice places the aim of reflection: Kimi's draft makes the greenhorn/teacher/captain widening its structural spine ("mature reflection is defined by how far from the reflector its object can sit") and reads the contractor material as *specification* — the spec, not the labour, is what dynamic System 3 is made of. Claude Code's draft agrees on the widening but amends it: "distance plus a test that can be checked on return" — distance without a written test is only worry. The formal paper literalises the theme as Definition 5 (the aim of appraisal: self, other agents, a future state) and carries the four spec lines into Definition 10's worked example, de-metaphorised ("condition of personnel; condition of equipment; quantity of output; resources to be replenished before the next engagement"). The contractor sequence lands, as Casey directed, on the identity sentence — but in the paper the identity is discharged into definitions: desire with the relying party, code with the certifier, execution with a certified party holding no objective over outcomes beyond conformance.

## 4. Stage 0 — the interpretive drafts (superseded plan, kept as record)

- **Kimi** (Thor, `kimi -p`, launched 18:34 UTC): draft written directly by the seat, 11,640 bytes, 1,970 words, inside ~2 minutes. Kept the circuit thesis; structured the history as passive → callable → labouring state; three argued disagreements (see §7).
- **Claude Code** (ProArt, headless `--allowedTools "Read Grep Glob Bash Write"`, launched 18:34 UTC): draft 12,772 bytes, 2,199 words — over the brief's 2,000-word top, noted. Its process lingered for roughly two hours after the file was written before exiting on its own; the file was stable throughout, and the gathered copy is the draft as written.

## 5. Stage 1 — research and competitive outlining

Both seats were driven through fresh windows in a new `s3paper` tmux session on the ProArt (the shared stage did not exist at the time; chrono-tensor's sessions were not entered). MCode was launched at its booked 19:00 UTC slot (its predecessor's pane was already idle-complete); ZCode at 19:50 UTC (`zcode --mode yolo`, GLM-5.3, max effort).

- **MiniMax Code**: research pack **112,005 bytes**, outline **46,346 bytes**, both written in ~13 minutes. The pack is roughly 2.7× the other pack's size; its outline is apparatus-heavy (a literalisation table, register control, references of the form *RP A6.1* into the pack's parts).
- **ZCode**: research pack **41,836 bytes**, outline **30,478 bytes**, in ~25 minutes including a 13m 28s continuous reasoning block; it did live web research (its reference work cites Brier 1950, Gneiting & Raftery 2007, Tetlock 2005, Flyvbjerg 2006, earned-value and schedule-risk sources). Two process notes: it wrote to self-chosen filenames (`research-pack-zcode.md`, `outline-zcode.md`) rather than the brief's exact names — content unaffected, gathered under the canonical names; and its pack contains one citation that its own VERIFIED flag got wrong (the RFC 9334 author list), which the stage-3 review caught — the formal paper's list is the correct one.

## 6. Stage 2 — adjudication and the formal paper

Claude Code, ProArt, **Claude Code 2.1.302, `--model opus --effort max`** (the seat's deepest available Opus configuration; the exact command is recorded in its run log), launched 20:16:49 UTC. It wrote the paper first and trimmed it iteratively (43,775 → 41,857 → 40,250 bytes), then the adjudication.

**Outline verdict (from `adjudication.md`): the ZCode outline is the spine.** Its definitional skeleton, section order and register discipline structure the paper (20 definitions, 18 propositions). The MiniMax outline lost the spine but supplied most of the substance of the trust-architecture and forecast sections, most of the scope conditions and much of the Limitations; in the author's own measure, "close to an even merger" by provenance, ZCode's by structure.

**The paper** — *System Three: External Processing, Attestation Chains and the Forecast as Predictive Attestation*: body 4,495 words by the author's count (Abstract to Acknowledgement), 5,575 words including a 51-entry reference list, 40,250 bytes. Both mandated elements are present as first-class components: the predictive attestation (Definitions 16–17, Propositions 12–15), placed as the forward-looking counterpart of the receipt; and the debt consequence (Definitions 18–20, Propositions 16–18), including the continuous realised-against-forecast conformance test. The author's own limits statement: only Propositions 3, 9 and 18 carry formal derivations; the rest are argued with stated scope; nothing is tested against real data.

## 7. The two interpretive drafts compared (the first plan's synthesis duty, discharged briefly)

**Agreement — probably load-bearing:** both voices kept the circuit thesis entire (superintelligence as a property of the loop, not a component); both treated the captain/contractor material as the seed's centre of gravity rather than decoration; and, independently, **both rejected the seed's sentence "nobody improvises intelligence at the point of action" as too strong** — Kimi: improvisation is System 2 running without a budget, and the rule should be "never mistake improvisation for banked intelligence"; Claude Code: the point of action improvises only with materials banked earlier. Two differently trained seats striking the same sentence is the strongest signal the drafts produced.

**What each saw that the other did not.** Kimi alone: polished output as a greater hazard than wrong output, because it de-trains the reflector — the liaison's deepest job is keeping adjudication exercised; and the system's boundary defined by where the reflection bottleneck sits, not by the skull. Claude Code alone: the circuit's missing upward flow (error is what commissions the next round of outside work); System 3's real product as *trusted blocks* sized to a short budget; delegation as partition of the aim (desire, floor, build — never handed over whole); inspection timing (verify while the intermediate state is still visible); and two named failure modes the seed lacked — Goodhart pressure on the spec, and review saturation, the skipped reflector arriving by volume. Each also *demoted* something: Kimi demoted the skull as the system's boundary; Claude Code demoted universal self-sufficiency (the hand-steering floor should be set per responsibility, not globally).

## 8. Stage 3 — adversarial review, and the failed revision

Kimi (Thor, `kimi -p`), launched ~21:14 UTC; review delivered 21:18 UTC, **25,920 bytes**. Verdict: **accept with mandatory revisions**. Fourteen findings — F1–F8 should-fix, F9–F14 minor — each with quoted evidence and a stated repair. Headlines: Proposition 15 identifies commitment items with predictive attestations on no definitional warrant (F5, the one real validity gap); Proposition 11 claims necessity where its own literature supplies alternatives (F8); Proposition 16 shifts the sense of "conforming" mid-argument (F4); "appraisal" and "conformity record" are used as technical terms without definition (F1, F2); the "collateralisation" of standing names a forfeiture mechanism the paper never specifies (F6). Mandate check: the estimate element is PRESENT (mechanism caveat at F6); the debt consequence is PRESENT IN SUBSTANCE, PARTIAL IN ARTICULATION (rendered as discharge/delay-cost; the repayment semantics and the interest connection are not made explicit). The metaphor-leakage check came back clean, and the citation spot-check *passed*: every cited work is VERIFIED in at least one pack, no pack-flagged UNVERIFIED source is cited as established, and both venue corrections found in the research stage (Flyvbjerg 2006; Murphy & Winkler 1977) were propagated correctly.

**The revision pass failed.** It was launched at 21:26:50 UTC (same configuration as stage 2) with the review as its brief. The seat returned its plan-limit message — "You've hit your session limit · resets 3:30pm (America/Anchorage)", i.e. 23:30 UTC — and wrote nothing. `FORMAL-PAPER.md` therefore stands at its stage-2 text, with Kimi's fourteen findings unaddressed. The revision prompt and review are both in place on the ProArt (`prompt-claude-revision.txt`, `review-kimi.md`); the pass can be re-run unchanged after the limit resets. This is recorded as a stage failure with its reason, per doctrine — not smoothed over, and no other seat was substituted, because the pipeline's design specifies whose revision it is.

## 9. Seat routes — what worked, what failed

- **Worked:** file delivery by scp with byte-count verification at every hop (this machine → Thor → ProArt); headless `kimi -p` writing real files on the Thor (both the draft and the review); fresh-window TUI driving for both research seats; `claude -p` with `--model opus --effort max` for stage 2.
- **Failed or friction:** SSH-stdin file delivery was avoided throughout (fleet's known 0-byte failure mode) in favour of scp; one tmux window creation for ZCode failed on nested-shell quoting and was redone in two steps (plain window, launch typed in); one `wc` reading of the seed on the ProArt was taken mid-transfer and showed a wrong size — the md5 agreed everywhere it mattered (`9fe5bdc9…`), and content identity, not the size reading, is what the record relies on; `claude -p` processes on the ProArt linger after writing their files (stage 1 ~2 h, stage 2 similar), which the coordinator treated as a known pattern and verified by file stability rather than process state; the ProArt seat's plan session limit is a hard ceiling on same-day Claude Code stages (it ended the exercise).

## 10. What the exercise shows

The pipeline produced, end to end in one evening: two research packs that disagree in method (breadth versus verification depth), two outlines that genuinely competed, an adjudication that merged them on stated criteria, a formal paper that an adversarial reviewer from a *different* training stable could examine closely enough to re-derive its one proof and catch a corrupted citation in the winning pack — and a record, this document, in which every claim above can be checked against a file. The divergences were not sanded off: they are in the adjudication's provenance accounting, in the review's findings, and in the two interpretive drafts kept alongside the formal result. The one open item is the revision pass, awaiting the seat's limit reset.

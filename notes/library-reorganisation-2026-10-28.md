# Library reorganisation, 2026-10-28 — the process record

How the digest layer (`LEDGER.md`, `TOPICS.md`, `papers-index.json`,
`notes/forgotten-knowledge.md`, `START-HERE.md`) was built on top of the library, by the
digest seat working at Casey's direction. Nothing in the library was moved, renamed or
deleted; every decision below was additive.

## Method

1. **Provenance first.** `LIBRARY-INDEX.md` and `LIBRARY-INVENTORY.md` were read in full
   before anything else. The inventory's 229 staged copies, duplicate findings, exclusions
   and judgement calls were treated as the provenance backbone and were not re-litigated.
2. **Corpus survey.** Every file under `papers/`, `white-papers/`, `ai-writings-papers/`,
   `concept-papers/`, `research-papers/` was enumerated (558 document files), plus the
   root-level paper-like documents and two plainly-paper strays found in the tree sweep.
   Git first-add dates were extracted for all 667 candidate paths in one pass: 436 paths
   have real pre-consolidation history (mostly the March-2026 POLLN monorepo era); 231
   arrived in the single 2026-10-28 consolidation commit.
3. **Digest.** The corpus was split into 16 batches (by collection and, for the large
   folders, by alphabetical range), each digested by a separate reader working to a fixed
   record schema and a shared topic vocabulary. Formal-series papers were read closely;
   the rest were read selectively (title, opening, section structure, conclusion). Each
   batch returned a JSON record set and a forgotten-knowledge note file.
4. **Merge and audit.** The 367 raw records were normalised (absolute→relative paths;
   bare aux filenames joined to their folders), deduplicated (11 duplicates resolved:
   overlapping white-paper batch ranges, a double-covered CRDT package, one fm-papers
   file), and machine-audited so that **every document file in the corpus areas appears
   exactly once** — as a record's path or in its `aux_files`. Final count: **355 papers**.
5. **Generation.** `papers-index.json`, `LEDGER.md` and `TOPICS.md` were generated from
   the merged records by script, then hand-checked.

## Date-evidence policy

Best evidence wins, in this order: **stated in the document** (`stated`, 223 records) →
**real git first-commit** for paths with pre-consolidation history (`git`, 39) → **date in
filename or folder timestamp** (`inferred`, 1) → **undated** (93, listed honestly at the
end of the ledger). Dates were never invented. Two policy calls to know about:

- The 2026-10-28 consolidation commit is a **copy-in date, not a writing date**; it is
  recorded once at the head of the ledger, not per paper. Most of the 93 undated papers
  are consolidation copies whose documents carry no date.
- A few stated dates look internally inconsistent — `17-The-Quilt-Stack.md` and
  `paper_32_seven_substrates.md` say "October 2023" against 2025–26 siblings (paper_32 is
  also truncated mid-table), and P67/P68 say "January 2025" while the same research run's
  summary was generated 2026-03-09. These are recorded as stated, flagged as suspect in
  `notes/forgotten-knowledge.md` §6, and left to Casey to rule on.

## Topic map — the reasoning

The map was drafted from the corpus's own vocabulary before the digest began (the brief's
examples — quilt and cells, ledgers and agreement, decision models, agents and fleet,
voice, games, maritime, memory, attestation and economics — were all confirmed as live
terms), then validated by the readers: 21 planned topics were used; only 4 ad-hoc
`other:` topics were requested across 355 papers (holodeck, retrocomputing, room-acoustics,
room-mapping — single papers each), which the vocabulary otherwise covered. Topics
cross-list freely (a paper averages ~2.8 topics). Two deliberate choices:

- **`fleet-records`** exists because the fm-papers corpus is as much an archive as a
  papers collection (status reports, audits, verification runs). Filing those under the
  research topics alone would have buried the corpus's nature as a run record of the
  May-2026 fleet.
- **`intelligence-theory`** is reserved for the formal-theory line (conservation of
  intelligence, semantic distance, objective intelligence, system three, thermodynamics of
  intelligence), keeping it distinct from the applied `decision-models` and
  `constraint-theory` lines.

## Judgement calls (all in the digest, flagged)

- **Root documents included as papers:** seed1–4, TERNARY-DESIGN-PATTERN,
  TILE_SYSTEM_ANALYSIS, NOVELTY_REPORT, RESEARCH_SYNTHESIS, MASTER_SYNTHESIS_ROUND19,
  TECHNOLOGY_EVOLUTION_OVERVIEW, PHASE_2_SIMULATION_RESULTS_20260313 (doubtful but
  included per the "when in doubt, include" rule: KILLER_APP_VISION — a product-vision
  essay; spreadsheet_moment_research — naming/branding research; the two
  summary_translation reports — agent work-reports about translating Paper 01).
- **Nested strays included:** `docs/academic/podc2026-ocds-latex.tex` (a PODC 2026
  submission draft) and `project_docs/upload/Mycelium_Living_Intelligence_AcademicPaper_2026-03-06.pdf`
  (binary PDF; text extracted at digest time and digested from the extraction — the file
  itself is unchanged).
- **Excluded as derivatives/process, not papers:** `audiences/` (audience adaptations of
  papers 01–10), `languages/` (ru/ko translations of papers), `dialogues/`,
  `agent-messages/` (internal process mail), `system-three-process/` (Paper 5's process
  record — cross-referenced in the notes), and the four loose programme-management files
  at `papers/` root (NEXT_PHASE_PAPERS, PAPER_ROADMAP_REMAINING, REDESIGN_ROUND2_SUMMARY,
  REFINEMENT_ROUND_1_SUMMARY).
- **Unit rule:** each `papers/NN` topic folder is one paper (spine = `paper.md`, else
  `README.md`, else the main document); `white-papers/` appendices/round-revisions fold
  into their main paper's record as aux files; `CRDT_Research_Package/` is one entry;
  `papers/42-fps-paradigm/` is two entries (it holds two unrelated papers sharing the FPS
  acronym — Function-Per-Second vs First-Person System).
- **Overlapping batch ranges** in white-papers were resolved by keeping the
  better-contextualised record (the WP-series batch for the Cocapn trilogy and the
  production white papers) and unioning topics.

## Coverage, honestly stated

- **355 papers digested; 0 document files missed** in the corpus areas (machine-audited
  against the file tree). 262 carry a date (223 stated, 39 git, 1 inferred); 93 are
  undated.
- **Read closely:** the formal series (01–05), the concept papers (all short), the
  Mycelium PDF extraction, and the load-bearing synthesis papers (paper_37, WP-10/11/12,
  the fleet audits, the active-log lineage report).
- **Read by structure (skimmed):** most of `papers/` 16–55 (the March-2026 generated-style
  series), the fm-papers status/report files, and the research notes — title, opening,
  headings, conclusion. The one-folder-one-paper records for `papers/24–40` rest on
  validation-criteria and notes files, which is what those folders contain; their claims
  are recorded as claims, not verified.
- **Not re-verified:** the papers' factual claims (benchmarks, fleet counts) were not
  independently checked; where the corpus itself contradicts a claim, the contradiction is
  recorded in the forgotten-knowledge notebook rather than adjudicated.

## Dead ends and problems found

- Launching all 16 digest readers at once tripped account rate limits; five batches were
  relaunched staggered (a process note, not a library problem).
- An early coverage-audit script had a bug (iterating a literal `'path'` string instead of
  each record's path) that under-reported coverage; found and fixed before it could
  mislead — the final audit reports zero missing.
- The corpus itself carries the problems documented in the salvage notebook: four
  numbering universes, five FLUX opcode counts, contradictory fleet-scale numbers,
  suspect early dates, and cited-but-absent artefacts (`research/lucineer_analysis/`,
  `experiments/STUDY-{42..50}`, the 36-paper canon list vs the volumes present, the
  CRDT PDF, the AI-essay corpus).

## Proposed file moves (proposals only — nothing has been moved)

1. **Reunite the FPS papers.** `papers/42-fps-paradigm/` holds two unrelated papers; the
   first-person-paradigm line continues in folders 46 and 49 while the
   scheduling-benchmark line stops at 42. Proposal: split the folder into
   `42a`/`42b` (or renumber when the reader-facing links can be redirected).
2. **Consolidate the asymmetric-information and geometric-encoding rewrites.** Folders
   48/50/53 read as successive reframes of one work, and 51/52 of another; the round-7
   "formal" editions supersede. Proposal: keep the formal editions, fold the earlier
   editions into them as aux files (as the white-papers round structure already does).
3. **Fold the stray READMEs.** `papers/06/README.md` is an SMPbot overview and
   `papers/08/README.md` an OCDS readme — leftovers of the old white-paper numbering.
   Proposal: move them next to their subjects (or into a `provenance/` subfolder per
   series) so the folder spines stop contradicting their contents.
4. **Bring the sibling drafts in from the cold.** `docs/academic/podc2026-ocds-latex.tex`
   (+ its `podc2026-ocds-draft.md`) and the Mycelium PDF are plainly papers living in
   code trees. Proposal: copy them into `research-papers/` with provenance notes in the
   inventory style.
5. **A canonical-numbering note at each series head.** The four numbering universes
   (POLLN-10, folder-01–60, "of 23", P61+) cannot be reconciled without renumbering, which
   the no-move rule forbids; a short README per collection mapping old numbers to folders
   would prevent the misreadings the digest kept hitting.

## Provenance of this reorganisation

Working clone `~/papers-ledger/repo` (independent of the older `~/papers-library-push`).
The raw per-batch digests, merge scripts and audit outputs were working material and are
not part of the library; this record and the worklog summarise them. Progress was logged
as it happened in the digest seat's worklog; pushed commits are listed there.

# START HERE — the SuperInstance papers library

This repository holds all of SuperInstance's papers in one place: the formal series, the
topic-folder series, the white papers, the AI-Writings papers, the concept papers, and the
research corpus (including the fm-papers fleet archive). On 2026-10-28 the scattered
papers were gathered into this library — 229 of them copied in from fourteen sources, with
originals left untouched in their home repos (`LIBRARY-INVENTORY.md` records every copy's
provenance).

## Two ways in

- **By time — [`LEDGER.md`](LEDGER.md).** Every paper in running order, grouped by year
  and month: when each paper arrived, what projects were connected to it at the time, and
  a one-line summary of what it argues. This is the library's spine.
- **By theme — [`TOPICS.md`](TOPICS.md).** The same papers grouped by aspect of the work
  (quilt and cells, ledgers and agreement, decision models, agents and the fleet, voice,
  games, maritime, memory, attestation, constraint theory, and the rest), cross-listed so
  a paper sits under every theme it belongs to.

Both views are generated from the same machine-readable digest,
**[`papers-index.json`](papers-index.json)** (355 records: title, path, date, date
confidence, topics, projects, summary, status — every digested paper exactly once).

## The formal series

Five numbered papers at the repo root are the library's flagship; read them in order:

1. [`01-conservation-law-of-intelligence.md`](01-conservation-law-of-intelligence.md)
2. [`02-semantic-distance-creative-breakthrough.md`](02-semantic-distance-creative-breakthrough.md)
3. [`03-hermit-crab-protocol.md`](03-hermit-crab-protocol.md)
4. [`04-objective-intelligence.md`](04-objective-intelligence.md)
5. [`05-system-three.md`](05-system-three.md)

The other collections keep their own series: `papers/` (numbered topic folders 01–60),
`white-papers/` (including the WP-01–WP-12 receipts series), `ai-writings-papers/` (the
220–228 working papers and the paper_30–40 Quilt run), `concept-papers/`, and
`research-papers/` (P61–P69, the fm-papers fleet corpus, the FLUX/conservation
programmes, F170–F175, and the research notes).

## The process record and the salvage notebook

- [`notes/library-reorganisation-2026-10-28.md`](notes/library-reorganisation-2026-10-28.md)
  — how the digest was done: method, coverage, date-evidence policy, topic map reasoning,
  judgement calls, and proposed (not applied) file moves.
- [`notes/forgotten-knowledge.md`](notes/forgotten-knowledge.md) — the salvage notebook:
  old names, dead projects, superseded designs, numbers and facts that survive only in
  these papers.

Nothing in the library was moved, renamed or deleted to build these views; the ledger,
topics, index and notes layers sit on top of the existing files, whose paths stay exactly
as they are.

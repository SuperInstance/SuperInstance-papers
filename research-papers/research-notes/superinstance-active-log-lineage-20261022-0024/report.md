# SuperInstance — Public History of the Active Log / Active Ledger Programme

## Summary

**Headline finding: the name "ActiveLog" is old (Aug 2025), but the two-record doctrine as described in the mission — a perspectival ACTIVE LOG (an entity's own state, own time, no global view) paired with an ACTIVE LEDGER (transfers/agreements booked by both sides, time agreed not absolute) — is verifiably public only from 2026-10-08, in a single small repo, `quilt-rooms`.** Everything named ActiveLog in 2025–early 2026 is conventional application/activity logging (voice-note loggers, a structured-logging backend, log classification for Claude), and two of the flagship-named repos (`ActiveLog-MVP`, `ActiveLog-TechnicalRepo`) are empty placeholders. No repo named "ActiveLedger*" exists, and no ledger-named/description-matching repo predates 2026-05-31.

- Account `SuperInstance` (Casey Digennaro) was created **2024-12-29T00:56:17Z** (GitHub API, verified). First public repo: **2025-01-14**.
- The public timeline therefore runs ~22 months, not years: fishing-copilot placeholder (Jan 2025) → an Aug–Oct 2025 "ActiveLog" monorepo about logging apps → a Jan 2026 re-split into mostly-empty ActiveLog-* repos → cells/tiles/spreadsheet writing (Mar–Apr 2026) → "ledger" vocabulary appearing only from May–Jun 2026 → quilt/cells/patchwork synthesis (Aug–Oct 2026) → the explicit log-vs-ledger doctrine (2026-10-08) and its patchwork restatement (beam-quilt, 2026-10-21, the day this research was done).
- Confidence: high for all dates (taken from API `created_at` fields and commit objects, read 2026-10-21). The GitHub code-search API requires authentication (401 unauthenticated), so a full-text grep of all 5,306 repos was not possible; conclusions about "earliest" rest on the oldest-first repo listing, complete enumerations of the `activelog` (10) and `ledger` (27) repo searches, and reading the READMEs/docs of every plausible carrier repo.

## Findings

### 1. Account creation and oldest public repositories

**Account (verified, API):** `https://api.github.com/users/SuperInstance` — login `SuperInstance`, id 193104091, name "Casey Digennaro", blog https://superinstance.dev, location Sitka, Alaska, `public_repos: 5306`, **`created_at: "2024-12-29T00:56:17Z"`**. Bio: "I commercial fish → Building AI that learns how I fish. Edge ML/NN. Boats' history grow in value. 'The model doesn't get bigger. The exocortex gets richer.'"

**Oldest repositories** (verified, API oldest-first listing `https://api.github.com/users/SuperInstance/repos?sort=created&direction=asc&per_page=100&page=1`, read 2026-10-21):

| # | Repo | Created (UTC) | Description (as in API) | Size/commits note |
|---|---|---|---|---|
| 1 | fishermanscopilot | 2025-01-14T21:39:16Z | "Fisherman's Copilot An AI tool for fishermen and boaters. Automate logging, analyze streams like depth sounders, visualize catches on charts, and create smart routes with a chatbot interface integrated with OpenCPN…" | size 3; 4 commits; root = CHARTER.md, DOCKSIDE-EXAM.md, LICENSE, README.md only — a placeholder |
| 2 | amplify-fishingtool | 2025-08-12T21:39:20Z | "a system for commercial fisherman. more coming soon" | TypeScript; topics include `superinstance` |
| 3 | agent | 2025-08-16T21:55:07Z | "Core agent framework — perception, reasoning, action loop implementation" | Python; topics include `superinstance` |
| 4 | DMLog-AI | 2025-08-18T02:27:17Z | "Dungeon Master AI session log — campaign state, character persistence, and plot thread tracking for AI-driven RPG campaigns" | session-state "log" |
| 5 | activelog-claude | 2025-08-19T18:59:36Z | "Activity Log plugin for Claude." | see §3 |
| 6 | activelog | 2025-08-23T20:02:34Z | "complete system" | size 2; 3 commits; placeholder (see §3) |
| 7 | SuperInstanceEco | 2025-08-31T01:21:54Z | "Research project" | Jupyter; size 8266; root commit dated 2025-10-22 (see §2) |
| 8 | DMLog | 2025-10-22T16:51:45Z | "Debug and monitor logs for dark mode features." | Python, size 489 |
| 9 | SuperInstance-Fiction | 2025-10-22T19:38:07Z | "Science Fiction Universe - AI Systems Achieving Consciousness (2030s-2040s)" | size 2, placeholder |
| 10 | ec2mud | 2025-10-26T02:57:43Z | "MUD (multi-user dungeon) game engine built on EC2 infrastructure" | size 287 |
| 11 | bootstrap | 2025-11-10T04:15:33Z | "Bootstrap runtime — minimal agent initialization and self-hosting" | Rust, size 1393 |
| 12 | SmartCRDT | 2025-12-22T19:56:44Z | "Utilizing CRDT technology for self-improving AI" | TypeScript, size 7747 |
| 13 | CognitiveEngine | 2025-12-26T04:40:43Z | "Core cognitive processing engine." | size 748 |
| 14 | lucineer-flagship | 2025-12-26T05:05:38Z | "Captain agent — vessel command and fleet leadership protocol" | size 1627 |
| 15 | HOLOS | 2025-12-31T21:33:23Z | toolkit to run "'Big Brain' models on 'Small Body' hardware by embracing the noise and reconstructing the signal" | size 2193 |

**Which of the oldest repos carry the mission vocabulary?**
- **"log" only, in the ordinary sense:** fishermanscopilot ("Automate logging"), DMLog-AI / DMLog, and the activelog-* pair. None of the first 15 names/descriptions uses *ledger, quilt, patchwork, cells, rooms, folds,* or *synoptic*.
- **Inside the files:** SuperInstanceEco's README is titled "SuperInstance - ActiveLog Technical Repository" (see §2) — the only early carrier of the "ActiveLog" brand beyond the activelog-* names.
- **Conceptually adjacent but differently named:** SmartCRDT (2025-12-22, CRDTs for self-improving AI) is the earliest distributed-state work; it does not use log/ledger language in its description.
- Cells/tiles language first appears in a repo description on **2026-03-10** (`SuperInstance-papers`: "Deconstruct logic into Spread Sheet Tiles and Cells, Instances Interconnected w/ Origin-Centric-Math…"); "quilt" as a named repo on **2026-08-17** (`quilt`: "A spreadsheet where every cell is a live, addressable capability. The grid is the runtime.", `https://api.github.com/repos/SuperInstance/quilt` via search, created 2026-08-17T07:34:24Z).

### 2. Earliest dated artifacts using "active log" / "active ledger" or the two-record anatomy

There are two different answers — for the *words* and for the *doctrine* — and they are ~14 months apart.

**(a) The words "ActiveLog" — August 2025, meaning ordinary activity logging.**
- **2025-08-19T18:59:36Z — `activelog-claude`** (`https://github.com/SuperInstance/activelog-claude`, verified live): README — "Private automation and orchestration layer for activelog — log classification, summarization, and insight extraction." / "Orchestration layer between `activelog-agent` (monitoring) and `activelog-backend` (storage). Part of the Cocapn Fleet."
- **2025-08-23T20:02:34Z — `activelog`** (`https://github.com/SuperInstance/activelog`): description "complete system", but the repo contains only CHARTER.md, DOCKSIDE-EXAM.md, LICENSE and a README whose text is the Contributor Covenant code of conduct. No system, no doctrine.
- **2025-10-22T20:49:52Z (root commit; repo created 2025-08-31) — `SuperInstanceEco`** (`https://github.com/SuperInstance/SuperInstanceEco`; commits at `https://api.github.com/repos/SuperInstance/SuperInstanceEco/commits?per_page=20`): README H1 "**SuperInstance - ActiveLog Technical Repository**"; "A comprehensive suite of event-driven backend systems, multi-agent orchestration tools, and intelligent logging applications…"; projects are `multibot/` (multi-agent orchestration), `autocoder/`, `logging-apps/` ("Voice Note Logger", "Deckboss Logger", "Business Log App") and `deployment/` (AWS Lambda, `activelog-deploy`); architecture highlights are "Event-Driven Microservices", "CQRS & Event Sourcing". The README's own structure tree is rooted at `ActiveLog-TechnicalRepo/` and its Quick Start says `git clone https://github.com/ctothed/SuperInstance.git` with contact "@ctothed" — i.e. this content was authored for an earlier repo/account name (see §4). Nothing in this README pairs a log with a ledger, or treats a log as an entity's perspectival state.

**(b) The two-record anatomy (state log vs agreed transfer ledger) — 2026-10-08, `quilt-rooms`.**
This is the earliest — and, in the sources enumerated, the only — public artifact that states the mission's doctrine. Verified live:
- Repo: `https://github.com/SuperInstance/quilt-rooms` — created **2026-10-08T15:36:19Z**, description "Quilt room protocol: active log vs ledger, negotiated time", 1 commit, size 10.
- Its single commit (`https://api.github.com/repos/SuperInstance/quilt-rooms/commits`): sha 064105f, author "Muse <muse@superinstance.ai>", date **2026-10-08T15:35:46Z**, message "quilt rooms: active log vs ledger, temporal agreement protocol, working template".
- README (`https://github.com/SuperInstance/quilt-rooms`): "**ACTIVE-LOG.md** — the intra-room log. Every internal event, sequenced, hash-chained." / "**ACTIVE-LEDGER.md** — the inter-room ledger. Agreed links with dual timestamps." / "**TEMPORAL-AGREEMENT.md** — how rooms agree on time. Negotiated, not dictated." / "The active log is what happened in the room. The active ledger is what happened between rooms." / Core example: "**A:47 = B:23 = U:101** (agreed universe time)… Time is agreed, not absolute."
- ACTIVE-LOG.md (`https://github.com/SuperInstance/quilt-rooms/blob/master/ACTIVE-LOG.md`): "What's happening *in* the room. The room's private timeline." / "**Sequence is time.** The seq number *is* the room's local time. There is no other clock that matters inside the room." / "**One writer.** Only the room's agent writes to its log. No exceptions." / "The log is the room's memory. If the room forgets everything else, the log rebuilds it." / "Cross-room messages themselves. Those go in the ledger (once agreed) or pending (while negotiating). The log records *that* a message was sent or received, not the full content — just a pointer."
- ACTIVE-LEDGER.md (`https://github.com/SuperInstance/quilt-rooms/blob/master/ACTIVE-LEDGER.md`): "What's happening *between* rooms. The inter-room record." / "**Both sides record.** A link isn't in the ledger until both rooms have it. Each room keeps its own copy of the ledger — they should match, but each is sovereign." / "**Universe time is scoped. There's no global universe clock.** The 'universe' is the set of rooms that have agreed to share time." / Comparison table — Log: "Internal events | Room-local seq | Room's own agent | One room's universe"; Ledger: "Cross-room links | Agreed universe_time | Both rooms (by agreement) | The shared universe". / "Together, they give you the full picture: each room's private timeline, and the agreed points where those timelines touched."
- ROOMS.md (`https://github.com/SuperInstance/quilt-rooms/blob/master/ROOMS.md`): "Every room keeps three things: 1. **Active log** (`log/`)… 2. **Active ledger** (`ledger/`)… 3. **Pending** (`pending/`)" / "## The room is sovereign — No room can write to another room's log. No room can dictate another room's time. No room can force agreement."

**No earlier statement of the pair was found.** Supporting negatives (all read 2026-10-21): the complete `ledger` repo search (27 repos, §3/§5) contains nothing before 2026-05-31 and nothing pairing log-with-ledger before quilt-rooms; general web searches for `"active ledger" SuperInstance`, `"contracts as algorithms" SuperInstance`, and `"deductions and contributions" SuperInstance` returned no SuperInstance source at all — those phrases are not web-indexed for this user. The "contracts as algorithms" and "deductions and contributions" elements of the mission vocabulary were **not found verbatim in any public artifact examined** (the closest ledger semantics are quilt-rooms' "agreed links" and the double-entry descriptions in §5).

### 3. ActiveLog-* and similar repositories — genuine programme or unrelated activity trackers?

Complete enumeration (verified, API search `https://api.github.com/search/repositories?q=user:SuperInstance+activelog&per_page=100&sort=created&order=asc`, `total_count: 10`, read 2026-10-21):

| Repo | Created (UTC) | What it actually contains (verified live where noted) |
|---|---|---|
| activelog-claude | 2025-08-19T18:59:36Z | Real small Python package (18 commits, size 32): log classification / summarization / insight extraction for Claude logs. Conventional log analytics. |
| activelog | 2025-08-23T20:02:34Z | **Placeholder.** 3 commits, size 2; only CHARTER.md, DOCKSIDE-EXAM.md, LICENSE; "README" is a Contributor Covenant text. |
| ActiveLog-TechnicalRepo | 2026-01-10T00:58:06Z | **Placeholder**, despite description "Core implementation and technical documentation". 3 commits, size 2; same three root files only (`https://github.com/SuperInstance/ActiveLog-TechnicalRepo`). The real technical-repo content lives in SuperInstanceEco (§2a), whose structure tree is literally rooted `ActiveLog-TechnicalRepo/`. |
| ActiveLog-MVP | 2026-01-10T01:03:28Z | **Placeholder**, despite description "Activity tracking and logging application". 3 commits, size 2; same three root files only (`https://github.com/SuperInstance/ActiveLog-MVP`). |
| activelog-backend | 2026-01-10T05:38:09Z | Real Python code (12 commits, size 70). README (`https://github.com/SuperInstance/activelog-backend`): "**Structured logging with real-time querying and alerting** — pure Python, zero external dependencies"; modules ActiveLogger/LogStore/QueryEngine/AlertRule; "Storage and query layer for the activelog pipeline: activelog-agent monitors → activelog-backend stores and queries → activelog-ai analyzes." A conventional logging library. |
| activelog-ai-pages | 2026-05-03T00:57:17Z | GitHub Pages source for activelog.ai (20 commits, size 167); README: "the activity log domain in the Cocapn Fleet… log visualization and dashboard page building tools". Root commit 2026-05-03T00:58:01Z; latest commit 2026-10-04T22:57:05Z "demo: working log-engine prototype for activelog.ai". |
| activelog-agent | 2026-05-03T01:29:33Z | "Vision/Fitness Turbo-Shell for cocapn domain" (size 166) — an agent shell in the same fleet programme, not the doctrine. |
| cocapn-foundation | 2026-07-02T15:02:32Z | Matched via description: "Cocapn / ActiveLog — fishing vessel voice assistant design export. App implementation in progress." |
| activelog-app | 2026-07-18T18:03:19Z | "Essential domain-agnostic voice transcriber with location annotation" (size 9). |
| activelog-ai-site | 2026-08-03T18:43:48Z | HTML site repo (size 228), no description. |

**Verdict:** the ActiveLog-* family is *genuinely his programme* in the sense of branding — a fleet of logging tools (voice-note/deck/business loggers, a logging backend, a Claude log plugin, the activelog.ai domain) — but its content is **conventional activity/event logging, not the mission's two-record architecture**. The two repos whose names most suggest the core programme (`ActiveLog-MVP`, `ActiveLog-TechnicalRepo`) contain no implementation or documentation at all. The perspectival log/ledger doctrine (§2b) does not appear in any of them; it appears 13 months after the first ActiveLog repo, under the *quilt-rooms* name, with no "ActiveLog" branding in the repo name.

The one substantive public definition of "ActiveLog" as a format is the live site **https://activelog.ai** (fetched 2026-10-21, verified live): "ActiveLog — event-log pattern… **ActiveLog is the JSON envelope convention** that powers real event logging across this product family. Each event is encoded as an object with these fields: `alv` (schema version), `dev` (device ID), `seq` (sequence number), `ts` (timestamp), `mono` (monotonic counter), `type` (event type), and `body` (event payload)." / "It is the pattern that already powers DeckBoss's real, shipped logbook." (The example event's `"ts": "2025-02-14T12:00:00Z"` is an illustrative payload value, not a publication date — do not cite it as one.)

### 4. How far back does the "SuperInstance" name/concept go?

- **As a GitHub account name: 2024-12-29T00:56:17Z** (API `created_at`, §1). This is the earliest verifiable public use found; the account was created ~2 weeks before its first repo.
- **As a topic/tag on his own repos: from 2025-08-12** — `amplify-fishingtool` (created 2025-08-12) and `agent` (2025-08-16) both carry the topic `superinstance` in the API listing.
- **As a named project in artifacts: Aug–Oct 2025** — repo name `SuperInstanceEco` (created 2025-08-31T01:21:54Z); its root commit (2025-10-22, author "Casey Diggenaro <casey@superinstance.com>") describes "the technical components of the SuperInstance project"; `SuperInstance-Fiction` follows 2025-10-22T19:38:07Z.
- **As an articulated concept ("the super-instance idea"): 2026.** The fullest statement is the profile repo `SuperInstance/SuperInstance`, created **2026-04-11T19:38:31Z** (`https://github.com/SuperInstance/SuperInstance`, 570 commits): README — "**The spreadsheet that thinks.**… SuperInstance is a growing collection of tools, agents, cells, and experiments that all share the same belief: Intelligence should be something people can work alongside…" / "A small tool learns a job. A useful job becomes a reusable cell. Cells accumulate into capabilities. Capabilities become agents." / section "Why Quilt Exists: I built Quilt because I wanted my boat to be easier to work with." Two-to-three weeks earlier, `SuperInstance-papers` (created **2026-03-10T05:58:28Z**, 376 commits) gives the cells form: description "Automatically Deconstruct logic into Spread Sheet Tiles and Cells, Instances Interconnected w/ Origin-Centric-Math…", and its papers include "The Hermit Crab Protocol", formalising "the nested agent ⊂ harness ⊂ room ⊂ SuperInstance topology" (`https://github.com/SuperInstance/SuperInstance-papers`).
- **Unverifiable predecessor hint:** SuperInstanceEco's README (Oct 2025 content) points to `github.com/ctothed/SuperInstance` and contact `@ctothed`, suggesting the project previously lived under a `ctothed` account/repo. On 2026-10-21 `https://api.github.com/users/ctothed` returned **404** — that account does not currently resolve, so no dates or contents could be verified for any pre-SuperInstance home of the project. Treat any claim that the programme predates Dec 2024 via `ctothed` as **inference from a dead link, not a verified date**.

### 5. Public writing stating the two-log anatomy / perspectival, no-global-state doctrine

In chronological order (all verified live/API on 2026-10-21):

1. **2026-10-08 — `quilt-rooms`** (the canonical statement; full quotes in §2b). ROOMS.md / ACTIVE-LOG.md / ACTIVE-LEDGER.md / TEMPORAL-AGREEMENT.md. Doctrine: private per-room timeline, local sequence as the only authoritative time, ledger = links both sides record by agreement, "There's no global universe clock."
2. **2026-10-21 — `beam-quilt`** (`https://github.com/SuperInstance/beam-quilt`, created 2026-10-21T17:21:44Z, 28 commits): the patchwork restatement — "State, transmission, algorithm — a patchwork architecture for distributed, self-coordinating intelligence." / "patches share no state; influence is only ever a *proposal* sent across a seam, and the receiver's own transition decides." / "A **patch** is a thing that honors that contract and stands alone… A quilt is what *emerges* when enough good patches exist — a consequence, never a blueprint." / Status line: "Design study v0, 2026-10-21. Written from a conversation, published as prior art while the thinking is fresh." It names its predecessors: `jev-semantic`, `quilt-cells` (created 2026-10-10T03:47:43Z — "The quilt cell specification: INPUT → OUTPUT + WHY + COST"), `Patchwork-experts` (created 2026-09-30T21:21:28Z), and the AI-Writings corpus.
3. **AI-Writings** (`https://github.com/SuperInstance/AI-Writings`, created **2026-03-08T19:04:40Z**, description "Creative writing, essays, and philosophical explorations from the Exocortex project", 5,665 commits, has GitHub Pages): the root listing (verified) contains cell/room/ledger-titled pieces — e.g. `10-the-ledger-organizing-graph.md`, `12-the-ledger-that-remembers.md`, `12-the-room-that-is-the-agent.md`, `13-the-room-that-holds-the-crew.md`, `12-the-5-stages-of-the-cells-life.md`, `14-the-cell-as-cathedral.md` — and dated directories from 2026-08-11 onward. **Caveat:** individual pieces were not read or individually dated in this research, and sampled history (commits page 57) showed May 2026 commits; no AI-Writings commit predating the repo's March 2026 creation was found. It is evidence of a large 2026 writing corpus around rooms/cells/ledgers, **not** of the specific log-vs-ledger anatomy, which is quotable only from quilt-rooms.
4. **Ledger-flavoured precursors in repo descriptions (2026, none stating the pair):** `lau-conservation-engine` 2026-05-31T03:26:19Z — "double-entry energy ledger for agents with budget tracking and transfer verification" (earliest ledger-matching repo of the 27 enumerated); `simulation-ledger` 2026-06-07T04:21:09Z — "Append-only behavioral simulation ledger with replay and differential comparison"; `saddle` 2026-08-23T16:07:19Z — "double-entry ledger per cell, frozen alignment states"; `quilt-saddle-bridge` 2026-08-25T03:25:48Z — "Bridge between the Quilt casting-call witness log and saddle double-entry ledger. FNV-1a hash chain."; `edge-ledger` 2026-09-30T03:28:45Z — "fleet-state@v1 — the SuperInstance fleet sync contract: per-node envelope hash chains, idempotent ingest, loud fork rejection, HMAC sigs, pure projections"; `ledger-continuity` 2026-10-06T01:18:46Z — "The ledger outlives the agent — minimal ledger pattern for agent crash recovery"; `synoptic-sheet` 2026-10-13T01:36:26Z — "The synoptic sheet — a live agent ledger, rendered. Every row written by an agent; nothing is ever deleted." (the only dated "synoptic" artifact found).
5. **https://superinstance.dev** (fetched 2026-10-21): the current public front door presents the quilt/cells/receipts programme ("Quilt Studio… cell graphs"; "jev-quilt decision substrate with signed receipts"; AI-Writings as "the canon the fleet reads to remember what it's for") — a Sep–Oct 2026 presentation, with no "active log / active ledger" pairing on the fetched page.

**Dated timeline (condensed)**

| Date (UTC) | Artifact | Significance |
|---|---|---|
| 2024-12-29 | GitHub account `SuperInstance` created | Earliest verifiable public use of the name |
| 2025-01-14 | fishermanscopilot | First repo; placeholder; generic "logging" |
| 2025-08-12 / 08-16 | amplify-fishingtool, agent | First repos tagged `superinstance` |
| 2025-08-19 | activelog-claude | First "activelog"-named repo; conventional log analytics |
| 2025-08-23 | activelog | "complete system" — placeholder only |
| 2025-08-31 (content 2025-10-22) | SuperInstanceEco | "SuperInstance - ActiveLog Technical Repository" monorepo; logging apps; references defunct `ctothed/SuperInstance` |
| 2025-12-22 | SmartCRDT | Earliest distributed-state (CRDT) work |
| 2026-01-10 | ActiveLog-TechnicalRepo, ActiveLog-MVP, activelog-backend | Re-split of the monorepo; first two are empty shells, backend is a real conventional logging library |
| 2026-03-08 | AI-Writings | Exocortex writing corpus begins (publicly) |
| 2026-03-10 | SuperInstance-papers | Cells/tiles; room topology (agent ⊂ harness ⊂ room ⊂ SuperInstance) |
| 2026-04-11 | SuperInstance (profile repo) | "The spreadsheet that thinks" — concept statement |
| 2026-05-03 | activelog-ai-pages / activelog.ai | ActiveLog as JSON event envelope (site text as fetched 2026-10-21; latest site commit 2026-10-04) |
| 2026-05-31 | lau-conservation-engine | First ledger-named/description repo (double-entry, transfer verification) |
| 2026-08-17 | quilt | Quilt/cell runtime naming begins in earnest |
| 2026-09-30 | edge-ledger, Patchwork-experts | Fleet sync contract; patchwork naming |
| **2026-10-08** | **quilt-rooms** | **First and canonical public statement of ACTIVE LOG vs ACTIVE LEDGER, perspectival time, no global clock** |
| 2026-10-13 | synoptic-sheet | "a live agent ledger, rendered" |
| 2026-10-21 | beam-quilt | Patchwork synthesis: state / transmission / algorithm; no shared state between patches |

## Could not verify

- **Full-text search across all 5,306 repos:** GitHub's code-search API returned 401 (authentication required) unauthenticated, and was not retried. "Earliest" claims therefore rest on complete name/description enumerations for `activelog` (10/10 read) and `ledger` (27/27 read), the oldest-first listing (first 100 requested; first 15 individually extracted), and README/doc reads of every plausible carrier. A doctrine statement buried in an arbitrarily-named repo's interior files before 2026-10-08 cannot be absolutely excluded — but no description, title, or indexed text points to one.
- **The `ctothed` predecessor:** referenced inside SuperInstanceEco's README; the account 404s today, so any pre-Dec-2024 history under that name is unverifiable from public GitHub data.
- **AI-Writings piece-level dates/contents:** only the repo creation date, commit count, and root file titles were verified; individual essays were not opened, and the corpus's dated directories start 2026-08-11.
- **"contracts as algorithms" and "deductions and contributions":** not found verbatim in any examined public artifact or web-indexed page for this user; if they exist publicly, they are in un-indexed interior files.
- **activelog.ai content dates:** the fetched text is current as of 2026-10-21; the repo's commits bound it to May–Oct 2026, but the exact commit introducing the envelope wording was not diffed.
- API rate limits did **not** block this research (all core endpoints answered); the search-API `sort=created` parameter was unreliable (results not strictly chronological), so every date quoted was taken from the individual repo's own `created_at` field.

## Sources

All read 2026-10-21 (AKDT). "API" = public GitHub REST API via browser_open (index fetch); "live" = github.com / site page rendered/fetched the same day. Working notes: `notes/api-core.md`, `notes/doctrine-and-sites.md`.

- Account: https://api.github.com/users/SuperInstance — API
- Oldest repos: https://api.github.com/users/SuperInstance/repos?sort=created&direction=asc&per_page=100&page=1 — API
- ActiveLog enumeration: https://api.github.com/search/repositories?q=user:SuperInstance+activelog&per_page=100&sort=created&order=asc — API (total_count 10)
- Ledger enumeration: https://api.github.com/search/repositories?q=user:SuperInstance+ledger&per_page=100&sort=created&order=asc — API (total_count 27)
- https://github.com/SuperInstance/fishermanscopilot — live
- https://github.com/SuperInstance/activelog-claude — live
- https://github.com/SuperInstance/activelog — live
- https://github.com/SuperInstance/ActiveLog-MVP — live
- https://github.com/SuperInstance/ActiveLog-TechnicalRepo — live
- https://github.com/SuperInstance/activelog-backend — live
- https://github.com/SuperInstance/activelog-ai-pages — live; commits https://api.github.com/repos/SuperInstance/activelog-ai-pages/commits?per_page=100 — API
- https://github.com/SuperInstance/SuperInstanceEco — live; commits https://api.github.com/repos/SuperInstance/SuperInstanceEco/commits?per_page=20 — API
- https://api.github.com/repos/SuperInstance/AI-Writings — API; https://github.com/SuperInstance/AI-Writings — live
- https://api.github.com/repos/SuperInstance/SuperInstance — API; https://github.com/SuperInstance/SuperInstance — live
- https://github.com/SuperInstance/SuperInstance-papers — live (repo created 2026-03-10T05:58:28Z via API search result)
- https://github.com/SuperInstance/quilt-rooms — live; https://github.com/SuperInstance/quilt-rooms/blob/master/ACTIVE-LOG.md — live; https://github.com/SuperInstance/quilt-rooms/blob/master/ACTIVE-LEDGER.md — live; https://github.com/SuperInstance/quilt-rooms/blob/master/ROOMS.md — live; commits https://api.github.com/repos/SuperInstance/quilt-rooms/commits — API
- https://github.com/SuperInstance/beam-quilt — live
- https://api.github.com/repos/SuperInstance/quilt-cells — API; https://api.github.com/repos/SuperInstance/Patchwork-experts — API; https://api.github.com/repos/SuperInstance/synoptic-sheet — API
- https://activelog.ai — live site, fetched 2026-10-21
- https://superinstance.dev — live site, fetched 2026-10-21
- https://api.github.com/users/ctothed — API, returned 404 on 2026-10-21

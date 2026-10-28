# Fifty Little Minds: A Whole-House Liquid RTS — Seed Map

*A seed document: a mapping and a wondering, not a build order. Casey's sketch (2026-10-27) is kept in his register throughout — every component named is a seed for the "how" question, not a constraint. Nothing here was run, built or benchmarked for this document.*

## How this map was made

Sources read in full: Casey's own prior-art mapping (`~/workspace/thor-research/PRIOR-ART.md`), the liquid decision-models scout (this morning), the three-box seed map (this morning), the live `SuperInstance/cudaclaw` README (fetched 2026-10-27 via the GitHub connector, blob SHA ce18dd1f) and the live `patchwork-quilt/liquid-world-model` DESIGN.md (blob SHA f4907e6f). Claims from repos are marked as repo claims and were **not** re-verified on hardware. Two drifts from the fleet's own notes are worth recording: the live cudaclaw README nowhere uses the phrase "SmartCRDT" — that is Casey's framing in PRIOR-ART, not the README's word — and the liquid-world-model DESIGN already frames the fleet itself as an RTS ("the network is an RTS, and the human is the hero", Casey 2026-10-26), so the game shape in the sketch is a homecoming, not a new metaphor. All arithmetic in §2 is back-of-envelope from stated assumptions, flagged as such.

## 1. The mapping

| Sketch element | Existing asset that covers it | The honest gap |
|---|---|---|
| ~50 agents resident on the Thor, dispatched fast | **cudaclaw** (repo claim): Rust+CUDA persistent worker kernel, lock-free queues in unified memory, sub-µs dispatch, warp-level parallelism, thousands of ternary agents {−1, 0, +1} — on the exact substrate the Thor is (122 GiB unified memory) | cudaclaw as published dispatches *commands* (its example op is arithmetic); it hosts no per-agent neural inference. The join — a CfC forward pass as the thing dispatched — is unbuilt, and cudaclaw on the Thor's sm_110 stack is unverified |
| Characters pairing scripts with decision models they query (questions out, percentages back) | The **JEV rack** on the Thor (:8077, fleet record): jev-semantic judge served to the LAN; **jev-quilt** decision cells; **qthe** ternary gating at the embedding level | The rack answers over HTTP at millisecond scale. Fifty characters querying frequently makes HTTP the tick bottleneck. Judges as in-fabric cells (the PRIOR-ART aspiration) do not exist yet |
| Each character adjusting its own gates to get slightly better | **Liquid dynamics** (scout §2): a CfC's effective time constants adapt per input with frozen weights — behaviour bends with the stream, which is what "adjusting gates" mechanically is at the small end | Attested updating (scout §4): nobody has joined adaptation to a provenance regime. Improvement that must carry its evidence is the open problem, here as everywhere |
| Synoptic snapshots of all cells; group-level orders to the fifty | The **quilt**: quilt-cell's byte-exact state hash, quilt-engine's active log/ledger (shared state minted only from agreed sends/receives); lane-sheets' piping discipline | No synoptic renderer or scoreboard exists, and "an order to a group" as a ledger write that fifty cells enact is an unbuilt pattern |
| Sleep cycles: testimony out, trained candidate back, A/B in a parallel world | **liquid-world-model's day cycle**: wake/alignment → mutable day-model → dream testimony ("nothing leaves without testifying") → flush presence, keep essence → next day's adaptation. Its memory tiers price exactly this (Reflex / Essence / Truth) | The dream seam names "distillation providers — learned adapters (the nightly LoRA) replacing today's text-level distillation" as a provider slot: **named, not built**. The A/B parallel-world evaluator does not exist anywhere; nearest asset is lane-sheets' byte-exact trace conformance, a way to compare two runs rigorously. Who prunes the LoRA shelf — the agent, or us — Casey left open |
| Game engine, small window, text scoreboards on the Orin | The Orin's measured posture (seed map): the desk, the big monitor, a perception shelf, 7.3 GiB — and weak 3D, by Casey's own report | No game engine for this exists in the fleet. The sketch already routes around the weakness: a little window, much text. The view should be designed text-first, top-down at most |
| ProArt as back-desk workshop (training bursts) | Measured role (seed map; scout §5): mainstream CUDA stack, the disposable place to train tiny things; the Thor's pinned torch build stays frozen for generation | Covered — the only element with no gap |

The strongest join is the sleep cycle. Casey sketched it at the whiteboard this morning; his own design document in another lane had already specified its shape — testify, flush the presence, keep the essence — and §2 shows that shape is not an aesthetic preference but the only one the house's pipes allow.

## 2. The numbers that bite

**Residency on the Thor (122 GiB unified).** At the LFM sense of "liquid" (~1.2B parameters, the size Casey gestured at): BF16 weights are ~2.4 GB per resident, so fifty residents are **~120 GiB of weights alone — the entire unified memory, before one byte of KV cache, world state, or the fleet's existing endpoints**. Quantised to 4-bit (~0.75 GB each) the weights fit at ~37 GB, but the pattern then bites instead: RTS characters asking questions at even one query per second each, ~30 tokens out and a few hundred in, is order 10⁴ tokens/second of prefill-dominated serving across fifty separate contexts — plausible only with continuous batching and a sparse, event-driven cadence; per-tick questioning is out by roughly two orders of magnitude. At the liquid-net sense (CfC, 10⁴–10⁵ parameters): fifty residents total **2–20 MB**, and fifty forward passes at 60 Hz is order 10⁸ FLOPs/second — beneath notice on any GPU in the house. At that scale memory and compute simply vanish as constraints; what remains is featurisation and the harness (scout §4).

**Sleep-cycle shipping (Thor→Orin measured ~71 Mb/s ≈ 8.5 MB/s; Thor↔ProArt throughput unmeasured, same Wi-Fi weather).** (a) *Raw cell state*: at Casey's "a couple of gigabytes" per agent, one full sleep round is ~100 GiB ≈ **3.2 hours of saturated LAN**, one way — a nightly cycle that monopolises the house pipe for hours is not a cycle. (b) *Testified episode out, delta back*: a day's decision episode as JSONL (10³–10⁴ records, ~1 KB each) is ~1–10 MB per agent, ~0.05–0.5 GB for fifty — seconds to a minute. The return artefact: a rank-16 LoRA on a 1.2B model is tens of MB per agent (1–3 GB for fifty, ~2–6 minutes); a re-distilled CfC is ≤400 KB per agent (20 MB total, ~2 seconds). Route (b) is minutes against route (a)'s hours — a factor of a hundred to a thousand. **Testimony is compression with provenance**: what crosses the wire is claims with their evidence; the state stays home.

## 3. The two senses of "liquid"

The sketch uses both, and they must not be blurred. **LTC/CfC networks** are continuous-time dynamical systems: no tokens, 10⁴–10⁵ parameters, frozen weights, input-dependent timescales (scout §2). **LFM-class models** (the Thor's residents) are foundation models sharing the brand — gated short convolutions plus grouped-query attention — with no liquid dynamics. Assignments: the *character controllers* and *gate adjustment* want the CfC sense — continuous state, per-tick cheap, dynamics that bend. The *question-answerers* split: numeric situational questions ("how dangerous, as a percentage?") are CfC readouts or the jev-semantic judge's pattern; genuinely linguistic questions want a small LFM, queried sparsely, because §2 prices them. The *LoRA targets* exist only in the LFM sense — LoRA is mechanically standard there (low-rank adapters on attention/conv projections, tooling exists, ProArt-shaped). "A LoRA for a liquid net" in the CfC sense is nearly a category error: any weight matrix could in principle take a low-rank ΔW, but at 10⁵ parameters a full re-distillation costs minutes, and the meaningful sleep artefacts are the whole re-distilled net or a trained readout head (the JEPA-TTT pattern: update only the small component). Casey's "sleep cycle" therefore names *two different operations* depending on which mind is sleeping — adapter training for the LFM sense, re-distillation for the CfC sense — and a design that confuses them will build the wrong seam.

## 4. Smallest first slice — PROPOSED, not built

The least system that exercises the whole shape once, end to end:

- **One tiny world** on the Thor: a grid, one resource, one hazard, fixed tick, identical seeds across runs. **Five characters** (not fifty), each a fixed script plus one CfC (≤10⁵ parameters, `ncps`) whose readout adjusts two or three script gates (harvest radius, flee threshold, neighbour-query rate). One decision substrate only — no LFM, no rack — so the slice tests one join at a time. Dispatch follows the cudaclaw *pattern* (persistent loop, lock-free queue); whether the repo itself builds on the Thor's stack is part of what's being tested.
- **One synoptic view**: a text scoreboard plus cell-state board served to the Orin's browser — the desk leg proven at text cost, no 3D.
- **One manual sleep cycle**: one character's day is flushed as a testified episode; candidate B is re-distilled on the ProArt while A plays on; a parallel, non-interacting fork of the world runs A and B on identical seeds for a fixed horizon; adoption follows a rule stated in advance; everything is written to the ledger.

**Kill criteria.** (i) The dispatch floor cannot sustain five agents at tick without overhead dominating, or cudaclaw cannot be made to build/run on the Thor within a bounded attempt. (ii) The CfC-gated characters do not beat the fixed-gate script baseline on the pre-registered metric (resource gathered per life) — the decision layer adds nothing over scripts. (iii) The A/B fork's traces cannot be scored identically — the evaluation is not trustworthy, and nothing downstream of it can be believed. (iv) One agent's sleep cycle ships more than a few minutes of LAN time — the shape is wrong and §2's route (b) has been violated in practice.

## 6. Second thoughts (Muse, at Casey's request to think it through, 2026-10-27)

**The tick is a scheduling problem before it is an intelligence problem.** A character that queries a decision model per decision inherits that model's latency: the JEV rack answers in ~140–220 ms, so one querying character thinks at ~5 Hz, and fifty characters at even 1 Hz each present 50 requests/second to a shared judge. Two consequences. The characters must ask *before* they need the answer — forecast the question, cache the percentage, act when the moment arrives (the estimator pattern, one level down). And the question traffic is shaped like CUDA, not HTTP: batches of simultaneous small questions are what warps are for, which is the deepest reason cudaclaw's floor fits — the fabric wants vectorised questions.

**State and weights are two different memories, and the snapshot serves both only if they are kept apart.** What changes during the day is state (liquid dynamics, gate settings): a snapshot of it is a save file, a fork point, and the synoptic view's raw material, all three for the price of one memory read. What changes at night is weights (the distilled adaptation). The day cycle already separates presence from essence; the design error to avoid is letting a snapshot of state masquerade as learned improvement, or a weight change ship without the episodes that testify for it.

**The population makes pruning a values decision.** Fifty characters with A/B candidates and finite storage is an evolutionary system whether named one or not. Pruned on game performance alone, it converges to fifty copies of the best harvester and spends the diversity that made a population worth having. The un-optimal characters are the exploration budget — the chart of not-yet-excluded strategies — and the pruning rule (what may be deleted, on whose testimony) is the most consequential decision in the sketch, taken before any of the engineering.

**Command at population scale is a mixing desk, not a chat box.** A human System 2 cannot instruct fifty System 1s and should not try (the colonising failure, inverted: a commander slower than his troops). Group orders must be dial-shaped — risk posture, exploration bias, neighbourliness — parameters that bend behaviour without words, in the elephant repo's DialBank pattern. The hero's skill is tech-tree judgement: choosing which dials exist.

**The first thing that will actually break is the evaluation.** "The candidate might be better" over a handful of episodes is indistinguishable from luck — this morning's Mastermind audit (31 valid moves in 120 recorded turns) is the standing warning about small-n measurement. The parallel-world A/B needs fixed seeds, many episodes, and metrics registered in advance, or the sleep cycle is a random walk that feels like learning. Attested updating is not only a security property; it is the statistics of the thing.

**The game is a tenant.** The Thor's GPU already has a bench, a rack, a foundry, and an agent living on it. A standing population of characters is a permanent booked seat with a tick budget — an estimate with a horizon — and the booking board stops being etiquette and becomes load-bearing infrastructure.

## 7. The one-liquid-model variant — the commons (Casey, 2026-10-27)

A restructuring of the sketch, offered the same morning: instead of a liquid model per character, **one** shared liquid model, which every agent may consult within a **budget**, as part of its loop. The model changes as it is used; the agents are *aware* that what they ask changes it — for the others, and for their own next turn. Start simply; complicate later.

What the variant dissolves: the resident-memory problem (one model's state, not fifty), the sleep-shipping problem (nothing per-agent to ship; the one model consolidates where it lives), and most of the attested-updating problem (one update gate, one evidence trail — the day's query ledger is complete by construction, since every consultation is a send/receive through one aperture). What it creates is a **commons**: a shared, mutable cognitive resource whose state is the integral of everyone's questions. Influence over it is proportional to consultation, so the budget is the constitution — equal budgets, earned budgets (calibration converting into operating rights, per the estimation loop), or priced budgets (the liquid-world-model purse pattern, applied to shared cognition) are genuinely different societies, not tunings. Awareness changes behaviour in at least three directions: *priming* (spend early to shape the commons toward your job), *conservation* (withhold queries because the commons is currently well-shaped for you), and *poisoning* (bend it against rivals) — the last being exactly what the pincher and the ledger exist to make traceable. The lineage is his own: this is elephant's Room-Elephant given dynamics — a zeitgeist every act reads and writes — and behind that, PLATO's common blocks, shared storage a whole community learned to behave around. The failure modes are social and control-theoretic, not computational: commons capture by one strategy; oscillation, if the population's consultations chase each other's effects with gain above one (a deadband is the known damper); and correlated blindness — a population consulting one model shares its blind spots, diversity surviving only in the agents' scripts and gates. The simple first form: one model, equal per-period budgets, a public feed of recent consultations (awareness by transparency), full ledger, drift shown on the scoreboard; governance complications admitted only when the simple commons proves worth governing.

## 8. Budgets of models in general — the purse (Casey, 2026-10-27)

The budget generalises beyond the one shared liquid model: each agent holds a **portfolio of budgets across the models resident on the chip, on the Thor, and in the cloud** — a number of calls of a certain size to cloud LLMs, a larger allowance of the local decision models, the shared liquid commons rationed between them. The agent runs mostly on scripts; the scripts contain the moments where a model gets called, and every call is charged against the relevant purse. Three consequences worth recording. **The budget portfolio is the real character sheet**: two identical scripts with different portfolios are different characters — cognitive reach, not code, is the identity. **Exhaustion degrades gracefully**: a broke agent is a script-only agent, reduced but functional (hand steering with no electricity), so budgets can be spent boldly without risking paralysis. And **the call/no-call decision is the agent's core trainable skill**: judging whether this question is worth a cloud call is itself a decision-model judgement, and the ledger makes it gradable — did the expensive call change the outcome? — so an agent's sense of when to think harder is calibratable from its own history, the estimator pattern turned inward. The tiers price the systems stack: local decision models are the pre-linguistic judges (near-free, fractions of a unit), Thor residents are the gauges (latency and contention), cloud LLMs are the borrowed System 2 (money and latency) — the same three currencies, time, tokens and money, that the estimation loop keeps its books in.

## 9. The grid, resource cells, and the queue (Casey, 2026-10-27)

The quilt framing completes the picture: an agent is a *spot on the spreadsheet* — a persistent cell on the grid, cudaclaw-resident, ticking at warp speed, one of very many. Crucially, the grid also holds the **resources as cells**: a llama server currently loaded with a given model is itself a spot on the grid, a citizen rather than infrastructure beneath it. Part of an agent's scripted behaviour is therefore **queueing**: it joins the line at a resource cell and *names its priority*; high priority rises; and the agent's maker has written into the script the escalation policy — at which situations it triggers, and at what priority level it may jump the queue. The queue is thus a second commons, with the known disease: unpunished priority inflates until everyone is priority one and the signal is worthless. The purse (§8) is the standing cure — priority is *priced*, high slots costing more of the model's budget, so an agent's declared urgency is a spend, gradeable afterwards against whether the situation warranted it (the estimator pattern again: was that jump worth it?). Under parallel serving (vLLM-class continuous batching) the line becomes an admission window and priorities become shares of a batch — Casey notes the principles survive intact, "just with scaling math": a queue by another arithmetic, still made of named priorities, priced access, and a ledger that remembers who jumped and why.

## 10. Engines as cells (Casey, 2026-10-27)

The Orin's engine role refines one step further: the engines themselves are **cells on the spreadsheet** — a Bevy cell (ECS world simulation), a Bullet cell (physics) — each with ins and outs that are APIs, and the agents, resident wherever they live, play and control *through* those APIs. The decomposition is doctrinally tidy: an ECS is already spreadsheet-shaped (entities as rows, components as columns, systems as the sweep that ticks the grid); a physics engine as a cell keeps its interior sovereign (Bullet's solver is its own business) while what crosses the piping is only state deltas and collision facts. Engines thereby become replaceable per world — a custom integrator cell can take the physics seat, a grid-stepper the simulation seat — without the agents' protocol changing, because the protocol is the piping, not the engine. And the whole remains inspectable from above: the queues forming at the physics cell, intents arriving, deltas leaving — the game as a spreadsheet you can watch being played by its own contents.

## 11. Assets: generated heavy, registered light (Casey, 2026-10-27)

The asset flow follows the same placement logic. Generation is Thor work (the Foundry and studio pipelines already live there): assets are *made* in the back room, then pass through the game engine, whose duty is light — remembering the elements and where they stand. The split that makes this cheap is **registry versus files**: what the engine holds is the manifest — asset identities, positions, states, the scene of record — which is small even for a rich world, while the heavy files themselves (meshes, textures, splats) stay on the Thor's mass, with the ProArt caching what it needs to paint. The manifest is cheap to keep at the desk even though the warehouse is in the back room; the placement question the plans must price is therefore not "where does the world live" but "where does the *manifest* live, and how large does it honestly grow" — a registry measured in megabytes-to-gigabytes against an Orin's 8 GiB, versus the gravitational pull of keeping it beside the Thor's 122 GiB and the agents it serves.

## 12. Anchors, fetch-on-notice, and the room system (Casey, 2026-10-27)

The engine's object model, stated precisely: the engine needs no images, no textures, no fine detail of shape. It needs an **origin point, a facing, and a position expressed relative to an anchor** — another object it anchors to — and that relative placement *is the agreement*: shared state minted from the anchor chain, exactly the active-log/active-ledger doctrine (the Orin as the active log and the active ledger in the true sense, dealing only in mechanics, never seeing the objects). The heavy detail stays where it was made; what passes to the ProArt is the finished rendering, pulled on notice: the ProArt reads the ledger, sees an object it lacks, and fetches it from the Thor — **fetch-on-notice**, the ledger as notification bus, bulk moving warehouse-to-eyes only on demand. Generation runs **ahead of presence**: the rooms around the player and the view out of the window are generated and downloaded before they are entered, which yields the **room system for vibe coding** — a player describes the next room, generation (Thor) registers it (Orin ledger), the door opens onto a finished first take, and iteration starts from inside the room. The holodeck loop, end to end. Two asset doctrines attach: **assets that worked are kept, not regenerated** (the registry grows a library; cloud image credits — MiniMax, DeepInfra-class — are reserved for slow, high-detail one-offs, the Thor being the default generator now), and texture variation is **procedural, not tessellated** — a cobblestone algorithm that makes pleasant cobblestone, seeded variation rather than a repeating pattern (the Foundry doctrine: seed plus parameters are the asset).

## 5. Lane note

`liquid-world-model` and the patchwork-quilt programme live in another lane. This document is a seed map drawn from this lane, using that lane's published design as prior art; it is offered to Casey and, through him, to that lane — not a raid on it, and no tasking flows from it in either direction.


## §13 — The placeholder doctrine (Casey, 2026-10-27 14:40)

Ruled in conversation following the EdenLive/Google-Overview digest: the
world-building direction is ours — the glove fit — but building blocks from
NVIDIA and other sources serve behind the scenes as proof-of-concept
placeholders while the glove-fit pieces are being thought through and
built. A placeholder's job is to prove the shape of the system now, behind
a protocol seam, so the architecture can be walked end to end before every
component exists in final form. Because the protocol is the piping (§10),
a placeholder is swappable by construction: when the fleet's own piece is
ready, it takes the placeholder's seat without redesign. Consequences for
planning and adjudication: every major component in a plan should name its
placeholder (what stands in today — e.g. an NVIDIA Isaac/Cosmos piece, an
EdenGolem-generated graybox, a Bevy/Bullet cell) and its seam (the send/
receive contract it honours), so the plan reads as final-shaped from day
one even where its parts are borrowed. Borrowed parts are a parts bin,
never the stack: adoption of a vendor stack wholesale is the failure mode
this doctrine exists to prevent.


## §14 — The spread is the system; the Thor is an enhancement (Casey, 2026-10-27 14:40)

Companion to §13, ruled in the same conversation: the architecture is the
whole fleet plus its APIs, spread out on purpose. Nobody is trying to see
whether this can be done on an offline Thor — the Thor is an enhancement
to the laptop and the other systems, not a container that must hold the
whole thing. Consequences: a plan earns no credit for single-box
self-sufficiency and must not contort itself to achieve it; cloud APIs and
subscription models are first-class cells in the fabric (the purse, §8,
already prices them); components belong where they fit best across the
estate — laptop, ProArt, Orin, Thor, Oracle, cloud — with the ledger (§12)
as the agreement between them. Local-only operation remains valuable for
specific reaction-path loops (the tolerable-slowness doctrine: reaction
lives at the sensor), but as a property of those loops, never as a purity
test for the whole system.


## §15 — User first: the load-balanced fabric, judged at the ProArt screen (Casey, 2026-10-27 14:56)

Casey's reframing, posed as the design question: not "what can we do with
our technology, cool and optimised," but user first — given ALL the
hardware in the house AND the subscription portfolio (premium Z.AI,
premium MiniMax, premium Kimi, a fair Claude plan), what if the system
load-balanced across everything to give the best possible FRONT END at
the ProArt? Consequences and shape:

- The optimisation target moves from the boxes to the chair: the metric
  is the quality and responsiveness of what arrives at the screen the
  user is sitting at. Everything else — Thor batches, Orin state, Oracle
  staging, cloud seats — is backstage, valued only by what it does for
  that surface.
- Subscriptions are first-class compute in the fabric, not an escape
  hatch: each premium plan is a pool of heavyweight thinking with a
  quota instead of a wattage. The balancer meters quota like the purse
  meters money (§8) — a plan spent flat by noon is load the evening
  cannot use.
- Routing is by latency class first: reaction stays local at the screen
  (scripts and tiny models, written to survive unadvised); conversation
  goes to whichever seat or subscription is freshest and best-fitting;
  production queues to the Thor or to long cloud sessions. Capability,
  queue depth, quota remaining, and cost break the remaining ties —
  cheap decision models doing the dispatch is the natural mechanism
  (the small model as captain of its attention; big models as gauges).
- Degradation is graceful by design: a rate-limited plan shifts load to
  the others; a dead LAN leaves the local tier carrying the experience
  at reduced depth. The front end never waits on the wrong tier.
- This is the quilt (§§8–9) read from the user's chair: cells, queues,
  priced priorities — with the subscription pools added as cells and
  the ProArt screen named as the surface the whole grid serves.


## §16 — Big thinkers author generators; small models refine instances (Casey, 2026-10-27 14:57)

Casey, continuing §15: when generating many visual assets, especially 3D,
the good ones get reused and refined — so the economics split in two.
The expensive cognition is authoring the GENERATOR: a big thinker helping
design the algorithms, the archetype code, the templates. That cost is
paid once, as capital. Once the generator exists, local and smaller
models run it, vary it, and refine its instances — instance-shaped work
at marginal cost, no big thinker in the loop. A big thinker re-enters
only when the archetype itself needs to change, never to polish a single
instance. Consequences: the load balancer (§15) gains a routing rule with
real leverage — send generator-shaped work up the tiers, keep
instance-shaped work down; the compounding standard (marginal cost of
subject N+1 against N) is achieved exactly here, in the gap between one
authored generator and its endless cheap instances; and the Foundry is
the standing proof in miniature — brain-authored archetype code mints a
family in seconds, and refinement is a local verb (seed+params are the
asset; geometry is a cache). Sleep-cycle distillation is the same law at
the weight level: the day's testified instances become tomorrow's
cheaper generator.


## §17 — The system is the template: operate ≠ create, and the panel accretes (Casey, 2026-10-27 15:00)

Casey, on two videos about Claude Motion (Anthropic's code-based
animation feature): the products it makes are not the point, and the
workflow isn't new — professionals have grown scenery this way in
Blender and similar for years. The point is the SYSTEM behind it. Such a
system is hard for smaller models to develop — but once it exists, as a
template, a 30B-class coder agent can operate it: it could never have
created the setup, yet it can work inside it. Two mechanisms make this
more than §16 restated:

- CODE, NOT PIXELS. Claude Motion's animations are code artifacts —
  change one number and everything else stays put. Code is the smaller
  model's native, verifiable medium: it can read the scene's source,
  adjust a timing, wire a control, and check its own work. A system
  whose state is code is operable by coders; a system whose state is
  rendered pixels is operable by no one.
- ACCRETION TOWARD REAL-TIME. The system builds on itself: every tile,
  button, and lever it grows converts a class of future generation into
  a manipulation of existing parts. It becomes more and more real-time
  not by speeding up the generator but by needing it less. The panel is
  the system's accumulated capital (lineage: elephant's dial banks, the
  §6 mixing desk, the Foundry's archetype registry and toolcards).

Consequences: a first slice should be SYSTEM-shaped — a workbench whose
panel accretes — rather than product-shaped; plans are judged on whether
a 30B-class local coder could operate what they specify, and on whether
accretion is a designed, measured process (tiles/buttons/levers added
per week; share of work done by manipulation vs generation). The Foundry
builder (brain-written Blender Python in a glass box, editable and
re-runnable, accepted builds registered as archetypes) is the existing
seed of exactly this pattern in 3D.


## §18 — Better excavators, smaller operators (Casey, verbatim, 2026-10-27 15:02)

"We're not trying to make every agent morph into an excavator. We're
trying to make better and better excavators that smaller and smaller
agents can operate smartly." — Casey's one-line statement of §§16–17,
and of a doctrine he notes he has been giving his coding agents for a
year. The direction of improvement lives in the machinery, not in the
operator: capability grows by building better systems, workbenches, and
generators, while the agents who run them can stay small, cheap, and
numerous. It is the gunner-and-the-gun line from the other side: the
gunner never builds the gun — and the gun's maker is judged by whether
an ordinary gunner can fight it well. As an adjudication rubric: a plan
succeeds insofar as its machinery gets better while the operators it
requires get smaller; a plan that needs every agent to be a genius is
the failure mode.


## §19 — Jobs descend: from deliberation to a few little perceptions (Casey, 2026-10-27 15:03)

Casey, naming cudaclaw's part in the idea: after a job gets pretty well
defined, it works itself down into being a few little perception things
having to happen. The lifecycle of any recurring work in the system is a
descent: it begins as heavy cognition (a big thinker defining what the
job even is), settles into a scripted procedure (the excavator, §18,
operated by small agents), and its terminal state is machinery on the
floor — the cudaclaw pattern, persistent resident workers — gated by a
handful of small perception checks: decision models and sensors watching
for the conditions under which the now-mechanical job should fire,
pause, or call up the stack. A job is finished being designed when what
remains of it is watching. Consequences: plans should draw, for each
recurring job, its descent path and its terminal perception set (how
few, how small); the size of the terminal perception set is a design
quality metric — a job that still needs deliberation every run has not
finished descending; and this is System 2's charter from the
tolerable-slowness doctrine stated as a lifecycle — deliberation's
proper product is the machinery and watchers that make deliberation
unnecessary next time.


## §20 — Rooms perceive; the tick is addressed, not broadcast (Casey, 2026-10-27 15:05)

Casey, through the PLATO/TUTOR and MUD lineage: the levers live inside
the machine. An agent in the game-maker's seat writes "spells" that on
the back end execute shell commands; equipment is modifiers and
runtimes; auras are persistent effects. With the metaphor taken off: a
ROOM has ticks of what needs to be perceived, and perception is
positional and addressed. Standing in the engine room, you get the full
density — readouts ticking by, everything needed to diagnose. At the
main console you get a tick only on CHANGE, plus a slow heartbeat —
once a minute, or five: everything within deadband, no errors.
Otherwise silence, and the silence itself is information: a heartbeat
that fails to arrive is the alarm. ("Change of state is perception" is
the console's tick rule.) Crucially, an agent can go to a room, create
how it perceives and how it ticks, and LEAVE: the room remains a cell
with its hooks and triggers, grabbing and doing on its own. The room's
NPCs may have models inside them — intelligent bots stationed in the
room, residents rather than travellers; they are not an agent moving
around the ship. The travelling agent is an author on a visit (this is
§16's generator-shaped work, spatialised); the room's residents are
§18's small operators and §19's terminal watchers, and a room authored
well never needs its author in it again. Plans should therefore specify
per-room, per-position tick policies (readout density at diagnostic
positions, change-only plus heartbeat at consoles), and treat every
room's perception policy as an authored, leavable artifact.


## §21 — The world is text; the render is a projection (Casey, 2026-10-27 15:06)

Casey, closing the MUD thought: the MUD becomes a text-based version of
the virtual reality — all of it in formats designed for type-safe
parsers and things to grab them quickly. The world's canonical form is
structured text: the ledger, the room ticks, the state. The rendered
world — the holodeck window, the 3D view — is a projection of that text,
the way a chart is a projection of the coast; the coast is not the
chart. Consequences: text is why everything else in this design works —
it is cheap to store, diff, rewind, and verify (§17's code-not-pixels at
the level of the whole world); type-safe parsing makes the piping
mechanical, so a tiny watcher can grab a room's ticks at speed without
a model having to interpret them — meaning stays in the models, shape
stays in the parser, and malformed sends are rejected by the contract
rather than misunderstood by a mind; and every participant — big model,
small model, script, human — reads and writes the same medium natively.
Plans should name the text protocols (tick, send/receive, manifest) and
their type contracts explicitly, and treat every renderer as a
replaceable projection of them.


## §22 — Decision models are the dice (Casey, 2026-10-27 15:06)

Casey, still in the MUD: JEV-type models, decision models — they're
kind of like rolling the dice, or going into combat, or action. In a
MUD, the moment an action is attempted, the world stops describing and
decides: dice are rolled against the room's state and the actor's
stats, and resolution is instant, local, and honestly probabilistic.
Decision models are that roll. Their shape is a probability for every
option — a die with a face per outcome, weighted by training rather
than carved fair. Combat is the canonical case because it exposes the
constraint: resolution cannot leave the room mid-swing (the reaction
path again), so the referee must be small, stationed, and fast; big
minds author the tables — the stats, the deadbands, what is rolled
against what — but they never roll. Because every send and receive is
in the ledger (§21's text), every roll is recorded: a biased die is
discoverable after the fact, and dice can be re-weighted from their own
history in sleep cycles — attested updating for adjudication. Plans
should name each room's dice: what actions roll, against what tables,
with what escalation faces (the outcome that wakes a bigger mind).


## §23 — The sim/real seam: rooms don't know what's on their far side (Casey, 2026-10-27 15:07)

Casey, extending §§20–22 past the simulation boundary: the same piping
that runs a simulated room can run a real one — actuators go straight
out to real robotics in the real world, and sensors give their data
back in text form. A room neither knows nor cares whether its far side
is simulated or physical; the text protocol is the whole contract, so
simulation and reality are interchangeable behind the seam (§13's
placeholder doctrine applied to reality itself: a simulated sensor is
the placeholder for the physical one, and vice versa for testing).
Worked example, his: pipe the autopilot and the GPS into a MUD-based
navigation system — a nav room whose resident perceives position and
heading ticks, rolls its dice (§22), and sends helm orders down the
same text pipe to the real autopilot. And the console projection of
that room is deliberately poor: a heading direction and a GPS position,
nothing more (§20's addressed perception at its starkest — the room
holds the density; the chair gets the two numbers that matter). The
layering floor is his standing law and is not amended by any of this:
hand steering at the bottom with no electricity, the autopilot above
it, the perceiving room above that — the MUD layer may advise and steer
through the machine layers, and nothing crucial ever depends on it.


## §24 — The bridge console, and the zoom into the room (Casey, 2026-10-27 15:07)

Casey, completing the picture: the bridge console is where everything
is shown — the whole ship at a glance, every room's addressed ticks in
one place (§20's console as the master projection). From there you can
zoom in to a single room — the navigation room, say — and inside, the
room's native face is a text-based version of his Nobeltec: the full
navigational density (chart, track, bearings, the works) rendered as
text FOR THEM, the residents who live and work there. So every room has
two faces, both projections of the one text state (§21): a chart-like
face for the visiting human, shaped for human eyes; and the text feed
for its residents, shaped for theirs. Zooming is a change of position,
and position is perception (§20): at the bridge, summaries and
heartbeats; in the room, readouts. The inversion is worth stating
plainly: for the human, software like Nobeltec turns data into
pictures; for the room's residents, the room turns the same waters into
text — and both parties are looking at the same sea.


## §25 — Correction: this is existing technology, not reinvention (Casey, 2026-10-27 15:08)

Casey, correcting the frame of §§20–24: he has already built things
like this — "vessel Plato," "vessel rooms," "navigator" — and the
conversation has been describing how this technology works, not
inventing it. Verified against the record within the hour:
SuperInstance/vessel-room-navigator renders F/V EILEEN as nine
navigable 3D rooms — rooms as cells, alarms able to warp attention to
the affected room (the addressed tick of §20, built); the 2026-10-02
architecture note states "everything is a room" — terminal rules,
state, NPC experts, timestamped logs, triggers/hooks/ticks, quilting
into a switchboard viewable coarse and zoomed (the bridge console of
§24, specified); the real EILEEN boat stack is the superimposed,
fail-soft layering of §23 (manual hydraulics and the diesel as the
metal floor, proven autopilot above, ESP32 deadbands, a Jetson learning
quilt observing and optionally driving through the autopilot, cloud LLM
as the final System-3 layer); plus mud-mcp (a TypeScript MUD server over
MCP), the PLATO room engine-blocks, and a ~35-repo vessel catalogue at
~/workspace/scout/vessel-boat-agents.md. Consequence for the plans:
§§20–24 are FIELD NOTES on the fleet's own prior art. Any plan that
greenfields the room layer is wrong by construction; the adjudication
must require an inventory of these artifacts and build on them.


## §26 — The staging ladder: play on the metal, render overnight (Casey, 2026-10-27 15:10)

Casey, naming another root: Mud-to-SCUMM(VM) was the first form of the
idea — the MUD room bouncing up to a more visual display. EdenLive
could be the nth degree of that bounce, but the staging runs the other
way: the base is the quick, game-engine-style environment, on the
metal, where life actually happens; rendering is a ladder climbed
afterwards, at leisure, over a world that already works. The rungs:
(1) STAGING — the interactive environment itself, real-time because it
is state and simple rendering, not dreaming (§§20–21); (2) SAMPLES —
little rendered pieces, quick enough to judge by eye (the Eden ladder's
"render a little" rung, generalised); (3) THE LONG RENDER — high-end
enhancement passes over the staged state, EdenLive-class diffusion
skinning, upscalers, DLSS-class techniques as they arrive, at whatever
cost in hours they honestly take — overnight is a legitimate render
time, because nobody is waiting on it: the world was already playable.
Since the state is text (§21), every rung re-renders the same world at
a new fidelity without re-staging anything; a render is a projection,
and projections can be re-taken when the cameras improve. And the night
is doubly used: the same hours that distil the day's episodes into
better scripts (sleep cycles) can carry the long renders — the house
improves its mind and its pictures in the same darkness. Plans should
specify the ladder per world: what staging is, what a sample costs,
what the long render is and when it runs, and what gates a climb from
one rung to the next.


## §27 — Terrain: the general-purpose bridge, mined for nuggets (Casey, 2026-10-27 15:11)

Casey adds one more root to the §25 inventory: Terrain — "trying to be
a little more general purpose; not as mature as some of our other
projects, but it might have some nuggets." Verified the same hour:
SuperInstance/terrain, public — its own description reads "MUD-to-
Visual bridge — rooms as explorable scenes. Crabs stir the mud into
walkable terrain." It is the general-purpose parent of the
Mud-to-SCUMM line and of §26's staging ladder. Handling instruction for
the plans: include it in the inventory as a NUGGET MINE — read it for
ideas, framings, and any mechanism worth lifting; verify anything
before building on it; its immaturity is stated by its author and is
not a defect to fix in passing.


## §28 — Commissioned: deep research, PLATO's assembly → CUDA/PTX (Casey, 2026-10-27 15:14)

Casey commissions deep research on both ends of the line: the old
technology this is based on, and our cutting edge. His thesis to be
tested: a great deal of PLATO's technology — built to hold at least
dozens of clients in arrays in a way that felt very dynamic, and
vectorised — ports very nicely when taken over to CUDA and PTX, the
assembly behind the original PLATO system having a natural descendant
in the GPU's. The research covers PLATO/TUTOR internals (per-client
state arrays, common/shared state, the event and tick handling that
made 1970s hardware feel alive), the concrete mapping to SIMT
execution (client arrays to thread/warp layouts, common blocks to
shared memory, persistent kernels as the floor), and current
GPU-resident simulation practice, with the fleet's public artifacts
(the PLATO repo cluster, terrain, vessel-room-navigator, the cudaclaw
pattern) as orientation. Findings land as a research note; until they
do, the plans should treat the floor's design (§19) as having evidence
in flight, not as settled.


## §29 — The convergence arrives by post: Kimi's pack, Grok's digest, and the first room (Muse, 2026-10-27 ~23:15)

The day's framings came back by email wearing other minds' clothes.
Kimi's research pack (eight documents plus its lab log, sent by Casey
via [muse] mail) derives the same architecture from the repos
themselves: an inhabited room that compiles expensive attention into
durable, inspectable competence — descent from deliberation to
procedure to room policy to device reflex (§19's descent, found
independently in the fleet's own prior art), rooms with addressed
perception (§20), text as the canonical state (§21), and a programme
measured on four quantities that must move together — cost,
competence, legibility, control. Grok's digest, which Casey had
prepared as a first look, sharpens the descent into one falsifiable
sentence and names the pack's one true gap: nobody is identified as
the room's adopter. Record the convergence WITH its discount,
because the witnesses are not independent: Kimi read Casey's repos,
which already encode the thinking, and Grok read Kimi. What the
triple arrival proves is that the vocabulary survives transmission
between minds intact — the precondition of the whole fleet model —
not that the architecture is right. Only a measured curve proves
that. Filed for the adjudication: the first-hand read (ZCode on the
Oracle, prepaid, at Casey's direction) as an exhibit at
~/workspace/goals/the-whole-house-quilt-system-holodeck-window/files/exhibit-zcode-firsthand-read-kimi-grok-2026-10-27.md,
whose cover note fixes the three conclusions the adjudication must
answer — the descent claim is falsifiable only as the four-quantity
curve; finding #3 (more implementation exists than the newest
documents imply) is the pack's weakest and most load-bearing claim;
and the adopter must be named. The demonstrator gets its brief in
the same folder (MISSING-HEARTBEAT-BRIEF.md): the Missing Heartbeat
is the holodeck's FIRST ROOM, not a parallel gate — the adjudication
proceeds provisionally and its final ruling answers to the
Heartbeat's curve. Its seed incident is tonight's own: the Thor bot's
silence at 18:13, when a missing heartbeat cost three-quarters of an
hour of expert deliberation and scored failing grades in legibility
and control against reality. And because finding #3 cannot be taken
on faith, a Lane A runs beside this paperwork: clone the cartography's
headline repos, run their suites, put a Rust toolchain to pincher and
saddle, and settle reuse-versus-rebuild with receipts — results to
~/workspace/kimi-read/cartography-verification.md.

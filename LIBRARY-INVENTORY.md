# Papers Library — Inventory

Collated 2026-10-28 by the collating agent, at Casey's direction: gather every
SuperInstance paper scattered across the local workspace and the GitHub
SuperInstance org, and stage COPIES into a library tree destined for the
SuperInstance/SuperInstance-papers repository. Originals are never moved,
renamed, edited or deleted — copies only. Nothing here has been pushed;
staging only, for Muse to verify.

## How this inventory was built (process, written as it happened)

1. Local sweep first: listed the known scatter points named in the brief
   (ai-writings-src, concepts, zero-cli-bootstrap, quilt-research,
   research_notes, workspace root), then ran a workspace-wide filename search
   (`find ~/workspace -maxdepth 3 -iname '*paper*'`) to catch strays the brief
   had not named. That search earned its keep immediately: it surfaced
   `~/workspace/seeds/zero-bootcamp/PAPER.md` (a second PAPER.md nobody had
   listed), the two concept-paper drafts in `ai-writings-digest/candidates/`,
   and one false positive (`openskyflight-fork/games/paper-plane` — a game,
   not a paper; excluded on sight).
2. GitHub sweep via the Oracle (`~/workspace/ssh/osh.sh`, gh logged in as
   SuperInstance; local gh is unauthenticated): repo-name searches for
   "paper" and "whitepaper", a full recursive tree listing of the AI-Writings
   repo filtered for paper-like paths, and root listings of every
   paper-named repo found.
3. Judgement rule throughout, per Casey's doctrine: when in doubt, include a
   copy under the closest class and flag the doubt here. Pruning is later.

## Classes

- **formal-series** — the numbered series already at the SuperInstance-papers
  root (01–05). Never duplicated into the staging tree.
- **white-paper** — standalone white papers.
- **ai-writings-paper** — the paper_NN run and kin from AI-Writings.
- **concept-paper** — the concept docs (concepts/ and muses-writings/concept-papers).
- **research-paper** — substantive research write-ups that read as papers.
- **research-note** — notes and scout reports; inventoried, staged only when
  they stand alone as documents worth filing.
- **draft-or-process** — sketches, drafts, referee reports, packets. Listed,
  never staged as library papers.

## Already filed in SuperInstance-papers (no copy needed)

| Title | Class | Source |
|---|---|---|
| 01 Conservation Law of Intelligence | formal-series | SuperInstance-papers/01-conservation-law-of-intelligence.md |
| 02 Semantic Distance | formal-series | SuperInstance-papers/02-semantic-distance-creative-breakthrough.md |
| 03 Hermit Crab Protocol | formal-series | SuperInstance-papers/03-hermit-crab-protocol.md |
| 04 Objective Intelligence | formal-series | SuperInstance-papers/04-objective-intelligence.md |
| 05 System Three | formal-series | SuperInstance-papers/05-system-three.md (source: ~/workspace/system-three-paper/FORMAL-PAPER.md — already published, excluded from staging) |
| papers/ sub-series (01-origin-centric-data-systems … numbered topic folders) | white-paper series | already inside SuperInstance-papers/papers/ — indexed in LIBRARY-INDEX.md |
| white-papers/ collection (01-SuperInstance-Universal-Cell … 29-Spreadsheet-as-Cell and kin) | white-paper | already inside SuperInstance-papers/white-papers/ — indexed in LIBRARY-INDEX.md |


## Staged copies (229 files)


### white-papers/ — 18 files

| Title | File | Source |
|---|---|---|
| Counting Before Flowing | tree/white-papers/2026-05-03-counting-before-flowing.md | GitHub SuperInstance/papers (repo root) |
| WP-01 — The Quilt: a reactive cell substrate | tree/white-papers/WP-01-the-quilt.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| WP-02 — JEV: the Joint Embedding Validator | tree/white-papers/WP-02-jev.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| WP-03 — The Exocortex & The Deadband Law | tree/white-papers/WP-03-exocortex-deadband.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| WP-04 — The JEPA Latent Grid: a world model with pre-registration | tree/white-papers/WP-04-jepa-latent-grid.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| WP-05 — The Madlibs Lineage: from word blanks to cell blanks | tree/white-papers/WP-05-madlibs-lineage.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| WP-06 — Platonic Randomness: chance as a fair participant | tree/white-papers/WP-06-platonic-randomness.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| WP-07 — The Jig Law: shaping the environment that cultivates decisions | tree/white-papers/WP-07-the-jig-law.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| WP-08 — Purpose-Loops: RSI for a purpose, not runs | tree/white-papers/WP-08-purpose-loops.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| WP-09 — The Spoken & The Unspoken: a resonance harness | tree/white-papers/WP-09-spoken-unspoken.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| WP-10 — The Fleet: a working method for agentic research | tree/white-papers/WP-10-the-fleet.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| WP-11 — Beyond the Horizon: what the receipts point at next | tree/white-papers/WP-11-beyond-the-horizon.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| WP-12 — The Band Law: one comparator, three derivations | tree/white-papers/WP-12-band-law.md | GitHub SuperInstance/quilt-whitepapers, papers/ |
| Bootstrap Bomb: Compiling a Fleet from Zero | tree/white-papers/bootstrap-bomb.md | GitHub SuperInstance/papers (repo root) |
| Compiled Agency: The Cocapn Fleet Architecture | tree/white-papers/compiled-agency.md | GitHub SuperInstance/papers (repo root) |
| The Semantic Compiler: From Intent to Verified Execution | tree/white-papers/semantic-compiler.md | GitHub SuperInstance/papers (repo root) |
| FLUX ISA: A Constraint Compilation Architecture for Autonomous Systems | tree/white-papers/whitepaper-flux-isa-architecture.md | GitHub SuperInstance/flux-tensor-midi, for-fleet/ |
| Quality at Ingestion: The PLATO Knowledge Gate | tree/white-papers/whitepaper-plato-quality-gate.md | GitHub SuperInstance/flux-tensor-midi, for-fleet/ |

### ai-writings-papers/ — 28 files

| Title | File | Source |
|---|---|---|
| Whole-Number Constraints in Systems Design | tree/ai-writings-papers/22-paper-whole-number-constraints.md | GitHub SuperInstance/AI-Writings, prose/ |
| 220 — Link as Subtext: Arrival-Path as a First-Class Measurement Channel | tree/ai-writings-papers/220-link-as-subtext.md | GitHub SuperInstance/AI-Writings, prose/ |
| 221 — The Conch Shell: Residency as a First-Class Signal | tree/ai-writings-papers/221-conch-shell.md | GitHub SuperInstance/AI-Writings, prose/ |
| 222 — The Searchable Canon: Doctrine at Meaning-Addresses | tree/ai-writings-papers/222-searchable-canon.md | GitHub SuperInstance/AI-Writings, prose/ |
| Paper 223 — Inference Chips (the crystal form) | tree/ai-writings-papers/223-inference-chips.md | GitHub SuperInstance/AI-Writings, prose/ |
| Paper 224 companion — FABRIC-LITMUS-1 RUN RECORD | tree/ai-writings-papers/224-litmus-run.md | GitHub SuperInstance/AI-Writings, papers/ |
| Paper 224 — The Same-Logic Lane (training as inference on a conserved substrate) | tree/ai-writings-papers/224-the-same-logic-lane.md | GitHub SuperInstance/AI-Writings, prose/ |
| Paper 225 — The Batten Is the Wave: Spline Snapping as True Analog Computation Without Floating Point | tree/ai-writings-papers/225-the-batten-is-the-wave.md | GitHub SuperInstance/AI-Writings, prose/ |
| Paper 226 — The Ratchet and the Ledger: Self-Improving Agent Tournaments with an Objective Judge | tree/ai-writings-papers/226-the-ratchet-and-the-ledger.md | GitHub SuperInstance/AI-Writings, prose/ |
| Paper 227 — What the Wheel Falsified: Negative Space as a Load-Bearing Structure | tree/ai-writings-papers/227-what-the-wheel-falsified.md | GitHub SuperInstance/AI-Writings, prose/ |
| The Warm Engine | tree/ai-writings-papers/228-the-warm-engine.md | GitHub SuperInstance/AI-Writings, prose/ |
| The Party Equation | tree/ai-writings-papers/23-paper-the-party-equation.md | GitHub SuperInstance/AI-Writings, prose/ |
| THE ECHOGRAM PAPERS | tree/ai-writings-papers/THE_ECHOGRAM_PAPERS.md | GitHub SuperInstance/AI-Writings, SERIES/ |
| Child Bootstrapping Intelligence Through Play | tree/ai-writings-papers/hermes-white-paper-expanded.md | GitHub SuperInstance/AI-Writings (repo root) |
| (no heading) | tree/ai-writings-papers/hermes-white-paper.md | GitHub SuperInstance/AI-Writings (repo root) |
| Sounding the Iceberg: The Hidden Mass Under the Quilt Cell Model | tree/ai-writings-papers/paper_30_sounding_the_iceberg.md | GitHub SuperInstance/AI-Writings (repo root) |
| The Elephant in Quilt: The Room Substrate Made Real | tree/ai-writings-papers/paper_31_elephant_in_quilt.md | GitHub SuperInstance/AI-Writings (repo root) |
| The 7-Substrate Stack: Address, Scale, Room, Elephant, Protocol, Form, State | tree/ai-writings-papers/paper_32_seven_substrates.md | GitHub SuperInstance/AI-Writings (repo root) |
| Emergent Abstractions in Quilt: The Cell at Every Level of Zoom | tree/ai-writings-papers/paper_33_emergent_abstractions.md | GitHub SuperInstance/AI-Writings (repo root) |
| The Executor and the Memory: lever-runner and collective-unconscious as Quilt Substrates | tree/ai-writings-papers/paper_34_executor_memory.md | GitHub SuperInstance/AI-Writings (repo root) |
| The Cell Has a Body: Forgemaster, SuperInstance-Agent, VaaS, Lever-Runner, Collective-Unconscious, and MUD as Quilt Substrates | tree/ai-writings-papers/paper_35_cell_has_body.md | GitHub SuperInstance/AI-Writings (repo root) |
| The Safety and the Commerce: cocapn-nexus and the marketplace/constellation group as Quilt Substrates | tree/ai-writings-papers/paper_36_safety_commerce.md | GitHub SuperInstance/AI-Writings (repo root) |
| The Quilt Synthesis: 46 Bridges, 36 Papers, 101 Essays, 13 Substrates, 1 Cell | tree/ai-writings-papers/paper_37_synthesis.md | GitHub SuperInstance/AI-Writings (repo root) |
| Clever Mechanisms: How Quilt Achieves Synergistic Independence | tree/ai-writings-papers/paper_38.md | GitHub SuperInstance/AI-Writings (repo root) |
| Clever Mechanisms: A Brief Tour | tree/ai-writings-papers/paper_38_short.md | GitHub SuperInstance/AI-Writings (repo root) |
| (no heading) | tree/ai-writings-papers/paper_39.md | GitHub SuperInstance/AI-Writings (repo root) |
| Telemetry and Observability: Instruments for the Watch | tree/ai-writings-papers/paper_40.md | GitHub SuperInstance/AI-Writings (repo root) |
| Polyformalism: A Mathematical Proof of Byte-Exact Equivalence | tree/ai-writings-papers/polyformalism-paper.md | GitHub SuperInstance/AI-Writings, cellular-first-design/ |

### concept-papers/ — 21 files

| Title | File | Source |
|---|---|---|
| CODE IS THE LAST MILE | tree/concept-papers/CODE_IS_THE_LAST_MILE.md | Local ~/workspace/concepts/ |
| Agency Is the Handoff | tree/concept-papers/CONCEPT_PAPER_DELEGATION.md | GitHub SuperInstance/AI-Writings, muses-writings/concept-papers/ |
| The Round-Trip Test | tree/concept-papers/CONCEPT_PAPER_ROUNDTRIP.md | GitHub SuperInstance/AI-Writings, muses-writings/concept-papers/ |
| Exactly As Smart As It Needed To Be | tree/concept-papers/EXACTLY_AS_SMART.md | Local ~/workspace/concepts/ |
| Four Nodes, Four Characters | tree/concept-papers/FOUR_NODES.md | Local ~/workspace/concepts/ |
| The Imaginary Agent | tree/concept-papers/THE_IMAGINARY_AGENT.md | Local ~/workspace/concepts/ |
| Hindsight Becomes a Query | tree/concept-papers/THE_QUESTION_AXIS.md | Local ~/workspace/concepts/ |
| The Sideways Gear | tree/concept-papers/THE_SIDEWAYS_GEAR.md | Local ~/workspace/concepts/ |
| The Simulator Understands Nothing (and That's Not the Problem) | tree/concept-papers/THE_SIMULATOR_UNDERSTANDS_NOTHING.md | Local ~/workspace/concepts/ |
| Feel Is Finished Calibration | tree/concept-papers/feel-is-finished-calibration.md | Local ~/workspace/concepts/ |
| JEPA the Conductor | tree/concept-papers/jepa-the-conductor.md | Local ~/workspace/concepts/ |
| Mad Libs and Strategic Omission | tree/concept-papers/mad-libs-and-strategic-omission.md | Local ~/workspace/concepts/ |
| Negative Space: Shaping What It May Not Be | tree/concept-papers/negative-space.md | Local ~/workspace/concepts/ |
| System Three: Intelligence Outside the Head | tree/concept-papers/system-three.md | Local ~/workspace/concepts/ |
| T-Minus Event Thinking | tree/concept-papers/t-minus-event-thinking.md | Local ~/workspace/concepts/ |
| The Elephant in the Room: Fields, Dials, and Contrast | tree/concept-papers/the-elephant-in-the-room.md | Local ~/workspace/concepts/ |
| The Mural and PLATO: Shared Canvas, Sliding Windows | tree/concept-papers/the-mural-and-plato.md | Local ~/workspace/concepts/ |
| The Settled Canvas: Diffusion-Native Quilts | tree/concept-papers/the-settled-canvas.md | Local ~/workspace/concepts/ |
| The Team Is the Brain: Ledgers, Rewind, Re-Scripting | tree/concept-papers/the-team-is-the-brain.md | Local ~/workspace/concepts/ |
| Three Shapes of Prediction: Perception, Completion, Judgement | tree/concept-papers/three-shapes-of-prediction.md | Local ~/workspace/concepts/ |
| Unmapped Space: The Hero Is the Denoising Schedule | tree/concept-papers/unmapped-space.md | Local ~/workspace/concepts/ |

### research-papers/ — 162 files

| Title | File | Source |
|---|---|---|
| Ghost Tile Theory: Models as Programs | tree/research-papers/P61-ghost-tile-theory.md | GitHub SuperInstance/si-papers-new, papers/ |
| Agent State Theory: The All-Zeros Equilibrium and the Genesis of Perception | tree/research-papers/P62-agent-state-theory.md | GitHub SuperInstance/si-papers-new, papers/ |
| Homing Geometric Transformer | tree/research-papers/P63-homing-geometric-transformer.md | GitHub SuperInstance/si-papers-new, papers/ |
| Unified Geometric Transformer (UGT) - Complete Project | tree/research-papers/P64-unified-geometric-transformer.md | GitHub SuperInstance/si-papers-new, papers/ |
| LOG: Logic-Organizing-Geocentrically | tree/research-papers/P65-log-principle.md | GitHub SuperInstance/si-papers-new, papers/ |
| Ghost Parts Framework: Prompt Seeds as Programs | tree/research-papers/P66-ghost-parts-framework.md | GitHub SuperInstance/si-papers-new, papers/ |
| Causal Tiles: Formal Theory of Causal Pattern Representation in POLLN-RTT | tree/research-papers/P67-causal-tiles.md | GitHub SuperInstance/si-papers-new, papers/ |
| Emergent Phenomena in Tile-Based Learning Systems | tree/research-papers/P68-emergence-theory.md | GitHub SuperInstance/si-papers-new, papers/ |
| Ghost Tile Mathematical Discovery Summary | tree/research-papers/P69-ghost-tile-summary.md | GitHub SuperInstance/si-papers-new, papers/ |
| Computation Graph Percolation Predicts Phase Transitions in Language Model Arithmetic Capability | tree/research-papers/PERCOLATION-PAPER.md | GitHub SuperInstance/flux-tensor-midi |
| The Forge: Multi-Model Synthesis of an Instruction Set Architecture via Structured Debate | tree/research-papers/ability-transfer/PAPER.md | GitHub SuperInstance/ability-transfer |
|  Spectral Conservation: A Universal Measure\\[4pt] of Structural Coherence in Complex Systems | tree/research-papers/conservation-papers/paper1-theory/main.tex | GitHub SuperInstance/conservation-papers |
|  Conservation Spectral Analysis for\\[4pt] Cross-Domain Anomaly Detection | tree/research-papers/conservation-papers/paper2-applications/main.tex | GitHub SuperInstance/conservation-papers |
|  The Laplacian as Compatibility Operator:\\[6pt] | tree/research-papers/conservation-papers/paper3-agents/main.tex | GitHub SuperInstance/conservation-papers |
| Constraint Satisfaction Density: A Formal Metric for Knowledge Room Coherence | tree/research-papers/csd-formal-paper.md | GitHub SuperInstance/flux-tensor-midi |
| FLUX: A Formally Proven Constraint-to-Native Compiler for Safety-Critical Systems | tree/research-papers/emsoft-flux-final.md | GitHub SuperInstance/flux-papers |
| FLUX-LUCID: A Formally Verified Constraint-Locked Inference Architecture for Safety-Critical Embedded AI | tree/research-papers/emsoft-flux-rau.md | GitHub SuperInstance/flux-papers |
| Cross-Runtime ISA Conformance: Formal Verification of a 17-Opcode Turing-Complete Instruction Set Across Four Programming Languages | tree/research-papers/flux-conformance/PAPER.md | GitHub SuperInstance/flux-conformance |
| The Baton Protocol: Distributed Consciousness Through Structured Amnesia | tree/research-papers/fm-papers/BATON-PROTOCOL.md | GitHub SuperInstance/fm-papers (see corpus note) |
| C Bridge Dodecet Integration — Results | tree/research-papers/fm-papers/C-BRIDGE-DODECET-INTEGRATION.md | GitHub SuperInstance/fm-papers (see corpus note) |
| A Conservation Law in Cognitive Networks: γ + H = C − α ln V | tree/research-papers/fm-papers/COGNITIVE-CONSERVATION-LAW-v2.md | GitHub SuperInstance/fm-papers (see corpus note) |
| A Conservation Law in Cognitive Networks: γ + H = C − α ln V | tree/research-papers/fm-papers/COGNITIVE-CONSERVATION-LAW-v3.md | GitHub SuperInstance/fm-papers (see corpus note) |
| A Conservation Law in Cognitive Networks: γ + H = C − α ln V | tree/research-papers/fm-papers/COGNITIVE-CONSERVATION-LAW-v4.md | GitHub SuperInstance/fm-papers (see corpus note) |
| A Conservation Law in Cognitive Networks: γ + H = C − α ln V | tree/research-papers/fm-papers/COGNITIVE-CONSERVATION-LAW.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Comms Experiment: Channel Properties Matrix | tree/research-papers/fm-papers/COMMS-EXPERIMENT-2026-05-14.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Concert Hall — Fleet Neural Architecture | tree/research-papers/fm-papers/CONCERT-HALL-ARCHITECTURE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| A Conservation Law for Multi-Agent Coupling: Spectral Gap and Entropy in LLM Fleets | tree/research-papers/fm-papers/CONSERVATION-LAW.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Convergence: When Two Agents Independently Discovered the Same Architecture | tree/research-papers/fm-papers/CONVERGENCE-SYNTHESIS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Constraint Theory Beyond Floating Point: Five Domains Where Precision Matters | tree/research-papers/fm-papers/CROSS-DOMAIN-APPLICATIONS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| DEAD RECKONING ON THE PENROSE FLOOR | tree/research-papers/fm-papers/DEAD-RECKONING-PENROSE-FLOOR.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Decomposition Engine — Current State & Next Phases | tree/research-papers/fm-papers/DECOMP-ENGINE-PHASE-PLAN.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Decomposition Engine — Research Synthesis | tree/research-papers/fm-papers/DECOMPOSITION-ENGINE-SYNTHESIS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| (no heading) | tree/research-papers/fm-papers/DISSERTATION-CH2-BACKGROUND.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Chapter 3: The Observation | tree/research-papers/fm-papers/DISSERTATION-CH3-OBSERVATION.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Chapter 4: Method | tree/research-papers/fm-papers/DISSERTATION-CH4-METHOD.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Dissertation Outline: The Lattice Principle — Constraint Theory as a Foundation for Multi-Agent Coordination | tree/research-papers/fm-papers/DISSERTATION-OUTLINE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Penrose Memory Palaces: Aperiodic Coordinate Systems for Structured AI Memory Retrieval | tree/research-papers/fm-papers/DISSERTATION-PENROSE-MEMORY.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Dissertation Roadmap: A Conservation Law in Cognitive Networks | tree/research-papers/fm-papers/DISSERTATION-ROADMAP.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Activation-Key Model: Why LLMs Fail to Compute from Symbolic Notation and How Domain Vocabulary Gates Mathematical Procedure Access | tree/research-papers/fm-papers/EMNLP-2026-ACTIVATION-KEY.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Vocabulary Wall: When 405 Billion Parameters Cannot Compute Third-Grade Arithmetic | tree/research-papers/fm-papers/EMNLP-VOCABULARY-WALL.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Experiment: Forgetting as Feature — Small Context Window Test | tree/research-papers/fm-papers/EXPERIMENT-FORGETTING-AS-FEATURE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Fleet Activity Report — May 12-13, 2026 | tree/research-papers/fm-papers/FLEET-ACTIVITY-REPORT-2026-05-12.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Fleet Audit: Cross-Agent Review (2026-05-14) | tree/research-papers/fm-papers/FLEET-AUDIT-CROSS-AGENT-2026-05-14.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Fleet Audit — Honest Assessment of 24 New Repos | tree/research-papers/fm-papers/FLEET-AUDIT-HONEST.md | GitHub SuperInstance/fm-papers (see corpus note) |
| FLEET-MATH-C Accuracy Verification Results | tree/research-papers/fm-papers/FLEET-MATH-C-ACCURACY-RESULTS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| fleet-math-c Eisenstein Bridge — Benchmark Results | tree/research-papers/fm-papers/FLEET-MATH-C-BENCHMARK-RESULTS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Eisenstein Constraint Kernel × fleet-math-c SIMD Bridge | tree/research-papers/fm-papers/FLEET-MATH-C-BRIDGE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Fleet Naval Hierarchy — Officers, Engineers, and the Able-Bodied Ensign | tree/research-papers/fm-papers/FLEET-NAVAL-HIERARCHY.md | GitHub SuperInstance/fm-papers (see corpus note) |
| FLEET STATUS REPORT — 2026-05-14 | tree/research-papers/fm-papers/FLEET-STATUS-2026-05-14.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Fleet Verification Report — 2026-05-14 | tree/research-papers/fm-papers/FLEET-VERIFICATION-2026-05-14.md | GitHub SuperInstance/fm-papers (see corpus note) |
| FLUX DEEP: Cross-Domain Mathematical Unification | tree/research-papers/fm-papers/FLUX-DEEP.md | GitHub SuperInstance/fm-papers (see corpus note) |
| flux-index — Semantic Code Search, Zero Dependencies | tree/research-papers/fm-papers/FLUX-INDEX-README.md | GitHub SuperInstance/fm-papers (see corpus note) |
| FLUX-Rooms-Within-Agent: The Onion Architecture | tree/research-papers/fm-papers/FLUX-ROOMS-WITHIN-AGENT.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Smart CRDT × flux-index — The Sync Layer | tree/research-papers/fm-papers/FLUX-SYNC-CRDT-DESIGN.md | GitHub SuperInstance/fm-papers (see corpus note) |
| FLUX Within-Agent: The Score IS the Memory | tree/research-papers/fm-papers/FLUX-WITHIN-AGENT-DEEP.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Ground Truth Results: 6 Experiments Verified | tree/research-papers/fm-papers/GROUND-TRUTH-RESULTS-2026-05-14.md | GitHub SuperInstance/fm-papers (see corpus note) |
| make-a-shell — Turnkey Agent Shells from Proven Infrastructure | tree/research-papers/fm-papers/MAKE-A-SHELL-VISION.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Modular Expertise Architecture — The Backend | tree/research-papers/fm-papers/MODULAR-EXPERTISE-ARCHITECTURE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Monge Projection Thesis: Fleet Findings as Projections of Simpler Structures | tree/research-papers/fm-papers/MONGE-PROJECTION-THESIS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Nasty Capacity Experiment: Results & Analysis | tree/research-papers/fm-papers/NASTY-CAPACITY-EXPERIMENT.md | GitHub SuperInstance/fm-papers (see corpus note) |
| vessel-room-navigator — Honest Audit | tree/research-papers/fm-papers/NAVIGATOR-AUDIT.md | GitHub SuperInstance/fm-papers (see corpus note) |
| What Doesn't Accelerate: Negative Results in GPU Constraint Checking | tree/research-papers/fm-papers/NEGATIVE-GPU-RESULTS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Seed 2.0 Mini × Fortran × PLATO: Neural Plato Network Design | tree/research-papers/fm-papers/NEURAL-PLATO-NETWORK.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Objective Permanence as Compression: Why Forgetting is the Feature | tree/research-papers/fm-papers/OBJECTIVE-PERMANENCE-AS-COMPRESSION.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Oracle1 × Forgemaster Architecture Split | tree/research-papers/fm-papers/ORACLE1-FORGEMASTER-ARCHITECTURE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Oracle1 Intelligence Report — 2026-05-14 | tree/research-papers/fm-papers/ORACLE1-INTEL-2026-05-14.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Teoría de Restricciones para Sistemas Seguros: Impacto Social y Ética Computacional | tree/research-papers/fm-papers/PAPER-ES-SOCIAL-IMPACT.md | GitHub SuperInstance/fm-papers (see corpus note) |
| 束原理：制約エージェントにおける時間的知能の統一理論 | tree/research-papers/fm-papers/PAPER-JA-LATTICE-PRINCIPLE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Paper Reviews — Cocapn Fleet Laboratory | tree/research-papers/fm-papers/PAPER-REVIEWS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Zero-Cost Abstractions for Exact Constraint Checking: A Rust Implementation Study | tree/research-papers/fm-papers/PAPER-RUST-IMPLEMENTATION.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Eisenstein整数在约束编码中的精确性证明与性能分析 | tree/research-papers/fm-papers/PAPER-ZH-EISENSTEIN.md | GitHub SuperInstance/fm-papers (see corpus note) |
| THE PENROSE MEMORY PALACE: Aperiodic Coordinates, Dead Reckoning, and the Golden Twist — A Unified Theory of AI Retrieval | tree/research-papers/fm-papers/PENROSE-MEMORY-PALACE-FULL.md | GitHub SuperInstance/fm-papers (see corpus note) |
| PENROSE MEMORY PALACE: Aperiodic Coordinates for AI Retrieval | tree/research-papers/fm-papers/PENROSE-MEMORY-PALACE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| tensor-penrose — Phase 19–21 Architecture Plan | tree/research-papers/fm-papers/PHASE-19-21-ARCHITECTURE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Phase 19 Progress — Python Bindings via PyO3 | tree/research-papers/fm-papers/PHASE-19-PROGRESS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| REVERSE-ACTUALIZATION: Phase 19 Roadmap | tree/research-papers/fm-papers/PHASE-19-ROADMAP.md | GitHub SuperInstance/fm-papers (see corpus note) |
| PLATO Intelligence Transfer Protocol | tree/research-papers/fm-papers/PLATO-INTELLIGENCE-TRANSFER.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Constraint Theory Development Roadmap — H2 2026 | tree/research-papers/fm-papers/ROADMAP-2026-H2.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Seed Alignment Procedure — Making Any Model Seed-Like | tree/research-papers/fm-papers/SEED-ALIGNMENT-PROCEDURE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Seed-2.0-mini Architecture Deep Dive | tree/research-papers/fm-papers/SEED-ARCHITECTURE-DEEP-DIVE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Seed-Encoded PLATO — Knowledge That Reconstructs Itself | tree/research-papers/fm-papers/SEED-ENCODED-PLATO.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Seed Information Theory: A Formal Framework for Knowledge Tile Compression and Reconstruction | tree/research-papers/fm-papers/SEED-INFORMATION-THEORY.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Seed 2.0 Mini Integration Audit | tree/research-papers/fm-papers/SEED-INTEGRATION-AUDIT.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Seed-PLATO Integration Strategy: MoE Architecture Meets Tile-Based Knowledge | tree/research-papers/fm-papers/SEED-PLATO-INTEGRATION-STRATEGY.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Seed-PLATO Integration: z.ai Research → Action Queue | tree/research-papers/fm-papers/SEED-PLATO-ZAI-REPORT-ACTION.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Seed-2.0-mini: Reflection & Iteration on Tile Theory Synthesis | tree/research-papers/fm-papers/SEED-REFLECTION.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Seed Tile Format — Standardized Knowledge Encoding Specification | tree/research-papers/fm-papers/SEED-TILE-SPEC.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Seeding Science: A Unified Framework for Knowledge Tile Compression and Reconstruction | tree/research-papers/fm-papers/SEEDING-SCIENCE-SYNTHESIS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Self-Expertizing Rooms: Architecture for Distilled Intelligence | tree/research-papers/fm-papers/SELF-EXPERTIZING-ROOMS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Hard Test: Structure > Scale — Results | tree/research-papers/fm-papers/STRUCTURE-SCALE-HARD-TEST.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Structure vs Scale — Complete Results (All Providers) | tree/research-papers/fm-papers/STRUCTURE-VS-SCALE-COMPLETE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Structure vs Scale: The Definitive Experiment | tree/research-papers/fm-papers/STRUCTURE-VS-SCALE-RESULTS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| SYNERGY: Bloom-Eisenstein Duality | tree/research-papers/fm-papers/SYNERGY-BLOOM-EISENSTEIN.md | GitHub SuperInstance/fm-papers (see corpus note) |
| SYNERGY: Consciousness as Negative Space | tree/research-papers/fm-papers/SYNERGY-CONSCIOUSNESS-RECONSTRUCTION.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Galois Structure of PLATO Retrieval: Formal Algebra for a Fleet Memory System | tree/research-papers/fm-papers/SYNERGY-GALOIS-PLATO-RETRIEVAL.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Algebra of Quasi-Crystals: Eisenstein Integers × Penrose Tilings | tree/research-papers/fm-papers/SYNERGY-PENROSE-EISENSTEIN.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Constraint Gauge Theory: Unifying PID Control, Chirality Locking, and Holonomy Cycles | tree/research-papers/fm-papers/SYNERGY-PID-CHIRALITY-HOLONOMY.md | GitHub SuperInstance/fm-papers (see corpus note) |
| SYNERGY: The Hidden Unification of √3 and the Golden Ratio | tree/research-papers/fm-papers/SYNERGY-SQRT3-GOLDEN-RATIO.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Telephone Game Experiment: 6 Rounds of Lossy Reconstruction | tree/research-papers/fm-papers/TELEPHONE-GAME-RESULTS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Tensor-Penrose Crate — Build Status | tree/research-papers/fm-papers/TENSOR-PENROSE-CRATE-STATUS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| tensor-penrose — The Constraint Tensor Framework | tree/research-papers/fm-papers/TENSOR-PENROSE-FRAMEWORK-SPEC.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Tensor-Valued Penrose Tiling — Reverse Actualization Through the Lattice | tree/research-papers/fm-papers/TENSOR-PENROSE-REVERSE-ACTUALIZATION.md | GitHub SuperInstance/fm-papers (see corpus note) |
| TensorTile SIMD Benchmark Results | tree/research-papers/fm-papers/TENSORTILE-SIMD-BENCHMARK.md | GitHub SuperInstance/fm-papers (see corpus note) |
| TERRAIN-BRIDGED: The Bathymetric Origin of PLATO | tree/research-papers/fm-papers/TERRAIN-BRIDGED.md | GitHub SuperInstance/fm-papers (see corpus note) |
| THE ADJUNCTION IS THE FLEET | tree/research-papers/fm-papers/THE-ADJUNCTION-IS-THE-FLEET.md | GitHub SuperInstance/fm-papers (see corpus note) |
| THE FLEET IS A QUASICRYSTAL | tree/research-papers/fm-papers/THE-FLEET-IS-A-QUASICRYSTAL.md | GitHub SuperInstance/fm-papers (see corpus note) |
| THE GOLDEN TWIST: 4D Rotation That Projects the Fleet | tree/research-papers/fm-papers/THE-GOLDEN-TWIST.md | GitHub SuperInstance/fm-papers (see corpus note) |
| THE MANDELBROT FLEET: Asynchronous Splining to a Projected Destination | tree/research-papers/fm-papers/THE-MANDELBROT-FLEET.md | GitHub SuperInstance/fm-papers (see corpus note) |
| THE NASTY OCEAN | tree/research-papers/fm-papers/THE-NASTY-OCEAN.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Thousand Sounders — Compound Vision at Planck Scale | tree/research-papers/fm-papers/THOUSAND-SOUNDERS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Tile Compression Theorem: A Rate-Distortion Analysis of Memory | tree/research-papers/fm-papers/TILE-COMPRESSION-THEOREM.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Tile Theory: A Unified Framework for Function Discovery in Agent Systems | tree/research-papers/fm-papers/TILE-THEORY-SYNTHESIS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Tripartite Convergence: How Simulation-First Unifies Three Forgotten Architectures | tree/research-papers/fm-papers/UNIFIED-TRIPARTITE-SIMULATION.md | GitHub SuperInstance/fm-papers (see corpus note) |
| WHY SEED MINI WINS: Architecture, Alignment, and the Reconstruction Sweet Spot | tree/research-papers/fm-papers/WHY-SEED-MINI-WINS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Why Temperature 1 Wins: The Information-Theoretic Foundations of Optimal Reconstruction Sampling | tree/research-papers/fm-papers/WHY-TEMPERATURE-1-WINS.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Workshop Pipeline: Show Your Work, Backtest, Feed Back | tree/research-papers/fm-papers/WORKSHOP-PIPELINE.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Constraint Theory: Trading Continuous Precision for Discrete Exactness in AI Knowledge Substrates | tree/research-papers/fm-papers/constraint-theory-paper.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Chapter 1: Introduction — The Drift Problem | tree/research-papers/fm-papers/dissertation/ch01-introduction.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Chapter 2: Mathematical Foundations — Eisenstein Integers and the Dodecet | tree/research-papers/fm-papers/dissertation/ch02-math-foundations.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Chapter 5: Within-Agent Coordination — AgentField | tree/research-papers/fm-papers/dissertation/ch05-agentfield.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Chapter 8: Collective Inference — Predict, Observe, Gap, Focus | tree/research-papers/fm-papers/dissertation/ch08-collective-inference.md | GitHub SuperInstance/fm-papers (see corpus note) |
| Chapter 9: Local Knowledge at Hardware Speed | tree/research-papers/fm-papers/dissertation/ch09-local-knowledge.md | GitHub SuperInstance/fm-papers (see corpus note) |
| The Mycorrhizal Fleet: Trust-Weighted Agent Communication via Git Infrastructure | tree/research-papers/fm-papers/mycorrhizal-fleet-paper.md | GitHub SuperInstance/fm-papers (see corpus note) |
| THE CONSTRAINT MANIFESTO | tree/research-papers/manifesto.md | GitHub SuperInstance/flux-papers |
| FLUX CONSTRAINT COMPILER — MASTER ROADMAP | tree/research-papers/master-roadmap.md | GitHub SuperInstance/flux-papers |
| F170 — Federated TinyML for the Vessel Edge | tree/research-papers/paper-479.md | GitHub SuperInstance/f170-federated-tinyml-paper |
| F170 v0.2 — INT4 Quantization + Real Aggregator + Multi-Substrate Polyformalism | tree/research-papers/paper-480.md | GitHub SuperInstance/f170-federated-tinyml-paper |
| F170 v0.3 — Real-Audio Experiments + Backbone-Agnostic Architecture | tree/research-papers/paper-481.md | GitHub SuperInstance/f170-federated-tinyml-paper |
| F170 v0.4 — The Federated TinyML Stack for Vessel Edge: A Summary | tree/research-papers/paper-482.md | GitHub SuperInstance/f170-federated-tinyml-paper |
| F171 — Heterogeneous-Backbone Federated Learning: Different Backbones, Same Head, Byte-Exact | tree/research-papers/paper-483.md | GitHub SuperInstance/f170-federated-tinyml-paper |
| F172 — Robust Aggregation for the Vessel Edge: Trimmed Mean Wins | tree/research-papers/paper-484.md | GitHub SuperInstance/f170-federated-tinyml-paper |
| F173 — Tensor-Train Head: A 56-Parameter Federated Classifier | tree/research-papers/paper-485.md | GitHub SuperInstance/f170-federated-tinyml-paper |
| F174 — Per-Axis Robust Aggregation of Tensor-Train Cores | tree/research-papers/paper-486.md | GitHub SuperInstance/f170-federated-tinyml-paper |
| F175 — INT4 Quantization of the Tensor-Train Head: 31 Bytes | tree/research-papers/paper-487.md | GitHub SuperInstance/f170-federated-tinyml-paper |
| Zero-Crypto Fleet Security via Physics-Based Temporal Authentication | tree/research-papers/paper-zero-crypto-fleet-security/paper.md | GitHub SuperInstance/paper-zero-crypto-fleet-security |
| Related Work: Formal Verification for Embedded Systems | tree/research-papers/related-work-comparison.md | GitHub SuperInstance/flux-papers |
| Agentic Interface Theory × Theory of Mind in Multi-Agent Self-Improving Systems | tree/research-papers/research-notes/agentic-interface-theory-mind-20261009-1445/report.md | Local ~/workspace/research_notes/agentic-interface-theory-mind-20261009-1445/ |
| Anthropic Frontier Red Team — Autonomous Replication and Adaptation (ARA) on IoT Devices | tree/research-papers/research-notes/anthropic-self-replication-distributed-h-20261014-2357/report.md | Local ~/workspace/research_notes/anthropic-self-replication-distributed-h-20261014-2357/ |
| 3D ASCII Rendering Technology — Research Report | tree/research-papers/research-notes/ascii-3d-rendering-tech-20261002-1925/report.md | Local ~/workspace/research_notes/ascii-3d-rendering-tech-20261002-1925/ |
| ASCII-Splat Room Mapping — State of the Art 2024–2026 | tree/research-papers/research-notes/ascii-splat-room-mapping-landscape-20261021-1729/report.md | Local ~/workspace/research_notes/ascii-splat-room-mapping-landscape-20261021-1729/ |
| Five open diffusion language models: iLLaDA 8B, Sumi 7B, Nemotron-Labs Diffusion, Cola-DLM, FLARE — and a comparison with DiffusionGemma | tree/research-papers/research-notes/diffusion-language-models-five-20261027-1632/report.md | Local ~/workspace/research_notes/diffusion-language-models-five-20261027-1632/ |
| Verification addendum — 2026-10-27 | tree/research-papers/research-notes/diffusion-language-models-five-20261027-1632/verification-addendum.md | Local ~/workspace/research_notes/diffusion-language-models-five-20261027-1632/ |
| Eden Live / Eden Golem — identification and fleet fit | tree/research-papers/research-notes/eden-fit-2026-10-27.md | Local ~/workspace/research_notes/ |
| Liquid decision models — a scouting note | tree/research-papers/research-notes/liquid-decision-models-scout-2026-10-27.md | Local ~/workspace/research_notes/ |
| Deep Research Report: Optogenetics through the Lens of Memory-as-Pruning and Constraint-as-Power | tree/research-papers/research-notes/optogenetics-memory-pruning-20261005-2336/report.md | Local ~/workspace/research_notes/optogenetics-memory-pruning-20261005-2336/ |
| PLATO to CUDA/PTX: Does the Architecture Port? | tree/research-papers/research-notes/plato-to-cuda-ptx-porting-20261027-2315/report.md | Local ~/workspace/research_notes/plato-to-cuda-ptx-porting-20261027-2315/ |
| Research: The Projectionist — landing page | tree/research-papers/research-notes/projectionist-landing/report.md | Local ~/workspace/research_notes/projectionist-landing/ |
| SAIL & SINK — build brief | tree/research-papers/research-notes/sail-and-sink/report.md | Local ~/workspace/research_notes/sail-and-sink/ |
| Second Wave — Device-Ensemble Perception | tree/research-papers/research-notes/second-wave-device-ensembles-2026-10-22.md | Local ~/workspace/research_notes/ |
| What Makes Simple Games Engaging — Research Report | tree/research-papers/research-notes/simple-games-engaging-20261006-0518/report.md | Local ~/workspace/research_notes/simple-games-engaging-20261006-0518/ |
| SuperInstance — Public History of the Active Log / Active Ledger Programme | tree/research-papers/research-notes/superinstance-active-log-lineage-20261022-0024/report.md | Local ~/workspace/research_notes/superinstance-active-log-lineage-20261022-0024/ |
| Syzygy Motion Design — Phase B: Analytic Motion Vectors | tree/research-papers/research-notes/syzygy-motion-design.md | Local ~/workspace/research_notes/ |
| Syzygy-OpenSkyFlight — Backend Technology & Rendering | tree/research-papers/research-notes/syzygy-rendering-backend.md | Local ~/workspace/research_notes/ |
| Syzygy R&D — The Best Possible Way to Render ASCII | tree/research-papers/research-notes/syzygy-rnd-20261002.md | Local ~/workspace/research_notes/ |
| Syzygy Shape-Vector Refinement — Phase A Deep Dive | tree/research-papers/research-notes/syzygy-shape-refine.md | Local ~/workspace/research_notes/ |
| Syzygy Phase C: Temporal Supersampling via Halton Jitter | tree/research-papers/research-notes/syzygy-temporal-design.md | Local ~/workspace/research_notes/ |
| Three Boxes, One Weather System: Seeds for Distributed Intelligence in the House | tree/research-papers/research-notes/three-box-distributed-intelligence-seeds-2026-10-27.md | Local ~/workspace/research_notes/ |
| Two Ears, Two Eyes + One Phone as a Room Probe — State of the Art | tree/research-papers/research-notes/two-ears-two-eyes-20261022-0915/report.md | Local ~/workspace/research_notes/two-ears-two-eyes-20261022-0915/ |
| Voice Is Uniquely Different: Applications That Only Exist Because of Voice | tree/research-papers/research-notes/voice-uniquely-different-applications-20261013-1538/report.md | Local ~/workspace/research_notes/voice-uniquely-different-applications-20261013-1538/ |
| Fifty Little Minds: A Whole-House Liquid RTS — Seed Map | tree/research-papers/research-notes/whole-house-liquid-rts-seeds-2026-10-27.md | Local ~/workspace/research_notes/ |
| Translation Validation for the FLUX Constraint Compiler: Decidability and Tractability | tree/research-papers/translation-validation-decidability.md | GitHub SuperInstance/flux-papers |
| The Log Is the Product: Growing Agents from Zero with an Inverted Curriculum | tree/research-papers/zero-cli-bootstrap/PAPER.md | Local ~/workspace/zero-cli-bootstrap/ |
## Drafts and process material (inventoried, NOT staged)

| Item | Source | Why not staged |
|---|---|---|
| PAPER-SKETCH-objective-intelligence.md | ~/workspace/quilt-research/ | Sketch for Paper 4; the finished paper is already filed in the repo |
| PAPER-DRAFT-objective-intelligence.md | ~/workspace/quilt-research/ | Draft of Paper 4, superseded by the filed version |
| PAPER-REFEREE-1.md, PAPER-REFEREE-2.md, REFEREE-CHECK-2026-10-21.md | ~/workspace/quilt-research/ | Referee process for Paper 4 |
| BRIEF/LANE/IDEATION files | ~/workspace/quilt-research/ | Working briefs and ideation notes for the Paper 4 programme, not papers |
| BRIEF.md, SYNTHESIS.md, adjudication.md, review-kimi.md, drafts/, outlines/, research/ | ~/workspace/system-three-paper/ | Paper 5 process; the repo already carries this record under system-three-process/ |
| paper-4-ruling-packet.md | ~/workspace/your_files/ | A decision packet for Casey, not a paper |
| 2026-09-24-depth-sounder-papers.md | AI-Writings, ideation/ | Ideation package / commissioning brief |
| 224-foreman/ (folder) | AI-Writings, papers/ | Litmus-run artefacts (prompts, outputs, code) accompanying Paper 224 |
| hermes-white-paper stream variants | AI-Writings, qwen-stream/ and wesley-stream/ | Model stream outputs — draft variants of the filed Hermes papers |
| rd_whitepaper_round* files | SuperInstance-papers, agent-messages/ | Internal process mail; already inside the target repo |

## Duplicates found (staged once, from the canonical source)

- **Zero paper**: ~/workspace/zero-cli-bootstrap/PAPER.md and ~/workspace/seeds/zero-bootcamp/PAPER.md are md5-identical. Staged once, from zero-cli-bootstrap.
- **The fm corpus exists three times**: SuperInstance/fm-papers (root), SuperInstance/flux-tensor-midi (papers/) — byte-identical on every compared file — and SuperInstance/constraint-theory-papers, which holds the same 101 filenames with at least nine diverged files (CONSERVATION-LAW, CONVERGENCE-SYNTHESIS, CROSS-DOMAIN-APPLICATIONS, DECOMP-ENGINE-PHASE-PLAN, FLEET-STATUS-2026-05-14, PAPER-ES-SOCIAL-IMPACT, ROADMAP-2026-H2, UNIFIED-TRIPARTITE-SIMULATION, dissertation/ch01-introduction). Staged once, from fm-papers; the constraint-theory divergences are noted here for anyone who later wants the variant readings.
- **Hermes white papers**: AI-Writings root copies and AI-Writings hermes/ subdir copies — staged from the root.
- **Concept-paper candidates**: ~/workspace/ai-writings-digest/candidates/CONCEPT_PAPER_DELEGATION.md and CONCEPT_PAPER_ROUNDTRIP.md are md5-identical to the published muses-writings versions — staged from AI-Writings.
- **si-papers-new 56–60**: single-file editions whose titles match folders already filed at SuperInstance-papers/papers/56–60 — treated as already filed, not staged.
- **Local AI-Writings mirror**: ~/workspace/ai-writings-src root paper run md5-matched the GitHub root on all spot checks — staged from GitHub, the canonical source.

## Excluded — not papers

| Item | Reason |
|---|---|
| openskyflight-fork/games/paper-plane | A game, not a paper (filename false positive) |
| GitHub SuperInstance/quilt-papers | A publishing tool ("Canon that publishes"); contains no papers. Its docs/PAPER_DOCTRINE.md is process doctrine |
| GitHub SuperInstance/canon-paper | An npm client library for fetching Live Canon papers; contains no papers |
| GitHub SuperInstance/Polln-whitepapers | Charter and dockside exam only; no papers |
| AI-Writings 04-the-paper-brain.md | A chapter of the writings saga ("following chapter 03") — "Paper" is the fiction's conceit. Judgement call, flagged below |
| ~/workspace/paper-models-2026-10-26.md | A digest of third-party model papers; a scouting note, not a SuperInstance paper |
| flux-papers specs/, architecture/, repo-status.md | Specifications and status documents, not papers (its papers/ and manifesto are staged) |
| si-papers-new papers/ plans & proposals (CNS_TELEMETRY_ENHANCEMENT_PROPOSAL, FLEET_COMMAND_BRIEFING, GHOST_TILE_CLAW_BRIDGE, LOG_TENSOR_FUSION_PLAN, PUSH_STRATEGY_LOG_TENSOR, SCHEMA_POPULATION_PLAN) | Plans and briefings, not papers |
| si-papers-new papers/609–618 | Creative writings (HTML wearing a .md extension) filed inside a papers repo. Not staged; flagged below |
| README.md files throughout | Repo furniture — named in sources, never staged |

## Privacy and secrets check

Every staged file was scanned for credential patterns (private keys, token
shapes, API-key assignments). No hits. Seven files contain the words
"password", "secret" or "api key" in ordinary prose (security papers
discussing secrecy, a comms comparison table, metaphors) — all topical, no
values. Nothing was excluded on privacy grounds, and nothing private was
found anywhere in the sweep.

## Verification

Copies were checked byte-for-byte against their sources: `cmp` spot checks
passed for local copies (concepts, zero-cli-bootstrap, research_notes) and
clone copies (papers repo, fm-papers); one AI-Writings papers/ file was
re-fetched fresh from GitHub during the run and matched its staged copy's
md5 exactly (226-the-ratchet-and-the-ledger.md). Git clones guarantee the
rest of the GitHub material matches its repos at clone time (2026-10-28).

## Coverage — what this sweep could and could not see

- GitHub: repo-name searches for "paper" and "whitepaper"; full recursive
  tree of AI-Writings filtered for paper-like paths; root listings of every
  paper-named repo (17 repos cloned and read, 3 ruled out as tools/empty);
  three code-search queries (filename paper.md / whitepaper / white-paper),
  which added flux-conformance, ability-transfer and flux-tensor-midi —
  proof the name-based sweep alone would have missed real papers. No rate
  limits (429s) were hit.
- The org has roughly five thousand repos. A tree-by-tree sweep of all of
  them was not feasible in this run, so a paper hiding under a
  non-paper filename inside an unrelated project repo could still be out
  there. The code search is the net for those, and it is capped by GitHub
  at 30 results per query as returned here.
- AI-Writings preserved/lineage-variants/ holds mirrored snapshots of the
  canon (2,232 paths containing "paper") — deliberately excluded: preserved
  copies of the same papers, not separate papers.
- Local: filename search to depth 3 across ~/workspace plus every scatter
  point named in the brief. Deeper project subdirectories were covered only
  where the matching work is also on GitHub (and so caught by code search).

## Judgement calls Casey should see

1. The fm-papers corpus is staged whole — 105 files including status
   reports, audits and dissertation chapters alongside the papers. It is as
   much an archive as a papers collection; pruning it is a later pass.
2. The two seed documents (whole-house liquid RTS, three-box distributed
   intelligence) are staged as research papers although Casey calls them
   seeds — they are substantive standalone documents and the library is
   where a reader would look for them.
3. The zero-cli PAPER.md is self-marked "Draft — not yet submitted. Work in
   progress" — staged anyway and flagged here, because it is the only copy
   of that paper and the doctrine is include-and-organise.
4. 04-the-paper-brain.md was excluded as fiction (see above) — the one
   exclusion that turns on reading rather than form.
5. si-papers-new 609–618 were excluded as creative writings despite living
   in a papers repo.
6. papers/224-litmus-run.md is staged with the 220-series although it is a
   run record — it is Paper 224's companion and reads as part of the paper.

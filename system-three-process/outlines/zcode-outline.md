# Competitive Outline — Formal Paper on "System Three"

**Seat:** ZCode (GLM, Z.ai). **Date:** 2026-10-27.
**Companion document:** `research-pack-zcode.md` (this directory). References of the form *RP-n* point to numbered entries in that pack.
**Working title:** *System Three: Operational Definitions of External Cognition, Attested Execution, and Predictive Certification*
**Target length:** 3,000–4,500 words; the budget below totals 4,150.
**Register:** neutral academic English, British spellings, third person. The paper's own prose contains no figurative language; where the source document ("the seed") uses a figure, the paper names its literal content once, in §1, and uses the literal term thereafter.

---

## 0. Literalisation table (the register contract)

Every figure in the seed is replaced, once and permanently, by the literal term in the right-hand column. The banned column is what the paper's prose must never contain outside quotation marks.

| Seed figure (banned in the paper's prose) | Literal term used in the paper |
|---|---|
| the head; the skull | the internal processing layers of the agent |
| the trained scripts; the film | compiled procedures; recorded performance history |
| the reflex layer beneath the scripts | the motor-execution sub-layer, acting before appraisal completes |
| the reflector; the slow voice | the appraisal layer (System 2) |
| the piece of paper; the desk; the surface | an external representational store |
| the computer | an external store with retrieval and computation services |
| the agents; the fleet | external executing resources |
| the liaison ("Muse") | the boundary adjudication function |
| the prepare/release split | the preparation interval / engagement interval partition |
| the captain | the supervisory party accountable for a system's post-engagement state |
| the captain's four-line specification | the enumerated post-engagement state variables (D10, item structure) |
| the contractor | the executing party |
| the homeowner | the desiring party |
| the building department | the specifying-and-certifying party |
| the code; the specs | the standing specification |
| the loan; the bank | the committed exposure; the financing party |
| the estimate | the predictive attestation |
| the receipts | backward-looking attestations |
| the keys | invocation authority (credentials held by the specifying-and-certifying party) |
| the registry; the address | the public certification register |
| the wall; the paint; the siding | unexposed implementation detail |
| the swamp | unindexed external storage |
| paying interest in time; the debt | delay cost accruing on zero-slack obligations (D19) |

The seed's returning-inspection figure is literalised throughout as: **post-engagement state verification against a pre-registered specification**.

---

## 1. Section structure, definitions, and propositions

### §1 Introduction (~350 words)

Thesis: an agent's effective performance is a property of a three-layer circuit in which the third layer is external to the agent, gated by appraisal, and freed from engagement latency by that gate; reliance on that layer at scale requires a three-party attestation architecture whose load-bearing component is the executor's forecast, treated as a **predictive attestation**.

Contributions (four, in order):
1. Operational definitions of Systems 1, 2, and 3 by latency, locus, and function — with System 3 defined by *external locus and mediation*, not by speed (distinguishing the account from internal tripartitions, RP-9).
2. The mediation and compilation propositions: why external latency is free between engagements and fatal inside them.
3. The three-party attestation architecture, with the predictive attestation introduced as the forward-looking counterpart of the backward-looking receipt.
4. The two-test conformance doctrine: terminal specification conformance plus continuous realised-against-forecast burn-down, justified by the non-substitutability of time on zero-slack obligations.

Prior art cited here: RP-1 (Clark & Chalmers), RP-2 (Hutchins), RP-3 (Hollnagel & Woods), RP-7 (Stanovich & West), RP-9 (Stanovich's internal tripartition, as the contrast class).

### §2 Definitions (~600 words)

Stated as numbered stipulations, each operational (measurable criteria: latency range, locus, function). Order matters: layers, intervals, then the trust apparatus.

**D1 — Motor-execution sub-layer.** Internal processes with latency in the range of tens to hundreds of milliseconds that initiate action without antecedent appraisal. Operational test: the action completes before any reportable evaluation of it begins.

**D2 — System 1 (compiled-procedure layer).** Internal processes, latency of order one second or less, that map recognised situations to actions by executing procedures acquired through prior practice. Operational test: output is produced without serial working-memory load; any verbal justification is constructed after output and may confabulate.

**D3 — System 2 (appraisal layer).** Internal, serial, working-memory-limited processes with latency of seconds to minutes. Functions: adjudication of internally and externally produced outputs (accept, reject, edit), re-weighting of D2 procedures, and compilation of adjudicated output into D2. Operates under a time budget; on budget exhaustion, action continues by assembling pre-trusted procedure blocks rather than by recomputation.

**D4 — Aim of appraisal.** The designated beneficiary of appraisal activity: (i) the appraising agent's own procedures; (ii) other agents' procedures; (iii) the post-engagement state of a system that operates without the appraiser's involvement. The aim is fixed by the allocation of responsibility, not by processing capacity; maturity of appraisal is defined as the distance between appraiser and beneficiary.

**D5 — System 3 (external processing layer).** Processes with locus outside the agent that produce finished outputs for appraisal. Defining constraint: System 3 outputs enter D2 procedures only via D3 adjudication followed by compilation (the *mediation condition*). Because of mediation, System 3 latency is unconstrained by engagement deadlines: it is assessed only against the preparation interval.

**D6 — System 3a (fixed-function external resource).** An external resource with a fixed input–output contract, invocable directly by D2 as a step within a compiled procedure; it cannot re-frame the task it is given. A procedure extended by D6a resources is foreseeable at compilation time.

**D7 — System 3b (delegated reflective resource).** An external resource that accepts task statements at the conceptual level (framing, not keystrokes), performs its own internal appraisal, and may compose D6 resources beneath itself in ways the delegating agent did not foresee.

**D8 — Engagement interval; preparation interval.** The engagement interval is any period in which outputs must be produced under an externally fixed deadline. The preparation interval is any period between engagements. The partition is defined by whether unbounded processing latency is tolerable.

**D9 — Compilation.** The encoding of adjudicated outputs into D2 procedures such that future engagements require less external input and less in-engagement appraisal per unit of work.

**D10 — Specification.** A pre-registered, inspectable statement of the required post-engagement state of a system, written during preparation, partitioned into enumerable line items. Structure: person-level state, asset-level state, output quantity, and one forward-pointing item — the replenishment of resources for the next engagement — which makes the specification self-restarting (the terminal item of one cycle is the initial commitment of the next).

**D11 — Attestation.** An attributable, checkable claim about a state of affairs or an execution history, issued by a party with access to the relevant evidence. Backward-looking attestations (**receipts**) are the special case where the claim concerns completed execution.

**D12 — Certification.** An attestation of standing issued by a party whose competence to issue it is itself verifiable through a public register. Function: to make reliance transferable to parties who cannot inspect the certified party's internals.

**D13 — Attestation chain.** An ordered sequence of attestations in which each relying party's exposure depends on the standing of prior links (executor's certification, certifier's accreditation, verifier's registration, financing party's charter).

**D14 — Predictive attestation (the estimate).** A quantified forecast of scope, cost, and duration for a proposed engagement, issued by the executing party before engagement, under uncertainty. Distinguished from state-evaluating decision models by two properties: (i) its object is a future state; (ii) it collateralises the issuer's standing on the realised outcome. It is the forward-looking counterpart of the receipt (D11): the receipt reports what was done; the predictive attestation binds what will be reported.

**D15 — Calibration.** The statistical correspondence between forecasts and realised outcomes across an issuer's repeated engagements, measured by a strictly proper scoring rule. Certified calibration history is a renewable component of standing.

**D16 — Demarcation.** The allocation of invocation authority across parties such that each party holds the minimum authority required for its function; authority circulates as invocable capabilities, never as ambient permission. Corollary: invocation authority over the engagement is held by the specifying-and-certifying party, not domiciled with the executing party.

**D17 — Desireless execution.** An executing party whose objective function contains no residual preference over engagement outcomes beyond conformance to the contract and the standing specification. A necessary condition of third-party reliance (P9).

**D18 — Roles.** **Desiring party**: holds the objective and commits exposure against it. **Specifying-and-certifying party**: holds the standing specification, certifies executors, maintains the public register. **Executing party**: performs under certification; issues both receipts and predictive attestations. Boundaries of knowledge: the desiring party need not know implementation detail; the specifying-and-certifying party need not know any party's objectives; the executing party need hold no objective of its own.

Prior art cited in §2: RP-4 (offloading, for D5's state-holding), RP-8 (default-interventionism, for D3's adjudication order), RP-26 (design by contract, for D10's post-condition form, UNVERIFIED flag noted), RP-33 (RFC 9334, for D18's role structure), RP-36/37 (scoring rules and calibration, for D15).

### §3 The circuit: latency, adjudication, compilation (~700 words)

Contains P1–P5, P13–P15. The argument: the three layers form a one-directional circuit during engagement and a different circuit between engagements; external resources are slow *by permission of the gate*, not by sufferance.

Prior art: RP-5 (spatial arrangement as pre-computation), RP-6 (delegation depth economics), RP-10 (bounded rationality — the time budget), RP-11 (near-decomposability — the latency partition), RP-12 (conditions for trusting compiled output), RP-4 (offloading economics).

### §4 Specification and verification (~450 words)

Contains P5 (in full) and P8. Establishes: the specification is the test inside the appraisal loop; verification is delta-reading, not re-derivation; the partition of knowledge across parties is a design feature.

Prior art: RP-22 (common knowledge and the public register), RP-23 (dispersed knowledge), RP-24 (information hiding), RP-25 (visible design rules vs hidden modules), RP-26 (pre/post-conditions).

### §5 Attestation, certification, and chains (~750 words)

Contains P6, P7, P9, and the *placement* of the predictive attestation within the attestation family: §5 introduces the receipt (backward-looking) and the predictive attestation (forward-looking) as the two members of the attestation genus, then states the chain propositions; §6 develops the forward member in full. This is the paper's architectural core: trust that travels does so only through certification links; each link's standing underwrites the next; the chain's value is bounded by its weakest link; a desiring party's diligence collapses to locating the certification register.

Prior art: RP-13, RP-14 (agency, informativeness), RP-15 (signalling), RP-16 (certification intermediaries — including their failure modes), RP-17 (expert middlemen — the boundary adjudication function), RP-18 (reputation as bond), RP-20, RP-21 (fiduciary obligation — the aim-of-appraisal doctrine's legal form), RP-27, RP-28, RP-29 (least privilege, capabilities, authority confinement), RP-30 (trust management), RP-31 (transitivity semantics — the scope condition), RP-32 (certificate chains), RP-33 (RFC 9334 three-role attestation), RP-34 (accreditation and conformity assessment), RP-35 (chain of custody).

### §6 The predictive attestation (~650 words)

Contains P10, P11. The estimate re-derived as an instrument: how it is constructed (reference-class anchor, case re-weighting), how it is scored (proper scoring rules on the forecast–realisation delta), how it collateralises standing (track record as posted bond; surety analogue), and how it sizes everyone else's exposure.

Prior art: RP-36 (Brier; Gneiting & Raftery), RP-37 (Murphy & Winkler, with the JRSS-C venue correction), RP-38 (Tetlock — measurable, persistent calibration differences), RP-39 (Kahneman & Tversky — base rates), RP-40 (Flyvbjerg — reference-class forecasting, with the PMJ venue correction), RP-41 (surety bonding), RP-19 (exposure sizing and risk premia), RP-18 (reputation bond, again, for the renewal mechanism).

### §7 Continuous conformance: obligations denominated against the forecast (~450 words)

Contains P12 and the second conformance test. The doctrine: once a predictive attestation is relied upon, each subsequent obligation in the chain is denominated against it; execution is a schedule of discharges; realised-against-forecast burn-down is measured on a fixed cadence; variance is surfaced while corrective action remains cheap; on zero-slack obligations, elapsed time is non-substitutable, so schedule variance accumulates irrecoverably. Terminal conformance testing alone detects failure at the point where correction is most expensive.

Prior art: RP-42 (earned value — the burn-down instrument), RP-43 (schedule-risk analysis), RP-44 (critical path — non-substitutable time), RP-45 (PERT — stochastic baselines), RP-46 (statistical process control — early detection economics), RP-47 (liquidated damages — delay pre-priced).

### §8 Failure modes (~350 words)

Four named failure modes, each literalised and mapped to the proposition it violates:
1. *External processing coupled directly into the engagement loop* — violation of the mediation condition (P1); trades adjudication for latency and dissolves the circuit's trust property.
2. *Unadjudicated propagation* — output driving action without appraisal (P4); single instances are errors, sustained instances become the agent's characteristic behaviour (the compounding clause).
3. *Unindexed external storage* — re-access cost growing with volume until re-reading exceeds re-derivation (P15); the ledger discipline (traceable, rewindable records) is the countermeasure.
4. *Dependence asymmetry* — internal layers losing executability as external supply grows (P14); the countermeasure is a maintained, reduced-capability internal execution path, rehearsed with external resources absent.
Also: *misdirected authority* (the executor granted, or assuming, authority beyond the specification — the confused-deputy analysis, RP-29).

### §9 Limitations (~300 words)

See §2 of this outline (Limitations, below).

### §10 Conclusion (~150 words)

Restates the circuit thesis and the two-test conformance doctrine; names the open empirical programme (longitudinal calibration records for executing parties; see Limitations item 3).

---

## 2. Propositions

Each proposition: statement, one-line justification sketch, scope conditions. Order is the order of first appearance.

**P1 — Mediated latency.** External-processing latency affects the circuit only through the preparation/engagement partition; coupling external processing directly into the engagement interval strictly degrades performance in deadline-bound tasks.
*Sketch:* inserting unbounded latency into a feedback loop with a tight stability requirement destabilises it; the mediation gate converts that latency into quality of compiled procedures, delivered between engagements.
*Scope:* engagements with externally fixed deadlines; the proposition is silent where engagement tolerance exceeds external latency, or where no adjudication is required at all.

**P2 — External-state viability.** An external store increases effective capacity if and only if re-access cost is below re-derivation cost and the store preserves state inspectably.
*Sketch:* offloading pays when retrieval plus read is cheaper than recomputation plus hold; otherwise the store is negative-capacity.
*Scope:* tasks with internal state exceeding working-memory capacity; stores that remain structured and addressable.

**P3 — Compilation gain.** As compilation proceeds, per-engagement demand on external resources falls while feasible engagement scale rises; the external layer succeeds by reducing per-engagement dependence on itself.
*Sketch:* compilation moves work from in-engagement appraisal (scarce, serial) to between-engagement production (abundant, parallel), so the same internal budget sustains larger engagements.
*Scope:* hinges on P4 (adjudication honesty); without adjudication, compilation fixes errors into procedures.

**P4 — Unadjudicated propagation.** Output that drives action without passing appraisal propagates error at a rate increasing in the number of unverified relays; a single independent adjudication pass at the production boundary restores bounded error.
*Sketch:* serial transmission without checking compounds error probabilities; one check at the boundary truncates the compounding.
*Scope:* noisy or adversarial production environments; the boundary adjudicator must be independent of the producer (else the check is not a check).

**P5 — Specification as the terminal test.** Verification against a pre-registered specification is exhaustive and delta-reading: every violated item is a finding, every satisfied item is silent, and verification cost is linear in the number of items rather than proportional to the state space.
*Sketch:* comparison against a pre-registered state requires reading differences only; open-ended evaluation requires search over what might have been intended. The specification also fixes the aim of appraisal at beneficiary (iii) — a future system state — which is otherwise unreachable by observation.
*Scope:* the specification must be written during preparation, before engagement, and held in inspectable external form; retrospective specification voids the linearity and the exhaustiveness.

**P6 — Certification transitivity.** Trust transfers across strangers only through certification links anchored in a public register; the desiring party's diligence reduces to identifying the certifier, the standing specification, and the register entry — not to inspecting the work.
*Sketch:* the institution substitutes for inspection: reliance is justified by an evaluable chain of attestations, not by acquaintance.
*Scope:* the restricted transitivity form — what travels is certification of conformance, not general approval (RP-31); requires the certifier's incentives to align with the standing specification rather than with any desiring party (RP-16).

**P7 — Weakest link.** The value of an attestation chain equals the standing of its weakest link; any claim relayed without its receipt inserts an unverifiable link and devalues every downstream reliance without reducing any party's obligation.
*Sketch:* conjunctive reliability — the chain's failure probability is bounded below by its worst link; an absent receipt is a link with unknown, not zero, failure probability.
*Scope:* links independently appraised; correlated compromise reduces the bound further, never improves it.

**P8 — Load-bearing ignorance.** Partitioning knowledge across parties — each party not requiring others' interior states — is an efficiency property of the architecture, not a defect: interface-level knowledge suffices wherever postconditions are verifiable.
*Sketch:* if conformance is checkable at the interface, interior knowledge adds diligence cost without adding reliance value; requiring it collapses the division of labour the architecture exists to create.
*Scope:* verifiable interfaces (D10, D16); where postconditions are unverifiable, interior inspection becomes necessary and the architecture degrades.

**P9 — Desireless execution (necessity).** Third-party reliance on an executor requires that the executor's objective function be exhausted by the contract and the standing specification; an executor with residual preferences over outcomes cannot be the object of a stranger's committed exposure.
*Sketch:* residual preference plus imperfect observability yields deviation incentives exactly where monitoring is weakest; a certified executor's standing is worth more than any single deviation, which is what keeps the condition incentive-compatible.
*Scope:* observability imperfect (with perfect observation, any objective is disciplinable); executor's future engagements valuable (a last-engagement executor has nothing to forfeit).

**P10 — Sizing by the predictive attestation.** Every relying party's exposure is sized by the executor's forecast, and the risk premia charged along the chain are strictly decreasing in the executor's certified calibration; estimation accuracy is therefore the load-bearing quantity of the trust chain.
*Sketch:* the forecast determines the committed exposure and the expected deviation; calibration history prices the residual risk, so demonstrated calibration collapses the premia.
*Scope:* calibration record public and scored under a proper rule across repeated engagements; engagements numerous enough for the statistic to exist.

**P11 — The forecast–realisation receipt.** The published delta between forecast and realised outcome is a backward-looking attestation of forecasting ability; under strictly proper scoring rules it is a sufficient statistic for updating the issuer's certified standing, renewed or degraded with each engagement.
*Sketch:* propriety makes honest forecasting the unique best policy at issue time, and the scored delta makes the ability level observable afterwards — together, a self-enforcing measurement.
*Scope:* repeated engagements with commensurable outcome measures; the scoring rule fixed in advance and applied mechanically.

**P12 — Continuous conformance (the second test).** Terminal conformance to specification is necessary but insufficient for engagements of non-trivial duration: conformance must also be measured continuously as realised-against-forecast burn-down on a fixed cadence, with variance surfaced while corrective action remains cheap; on zero-slack obligations, elapsed time is non-substitutable, so negative schedule variance accumulates as irrecoverable cost.
*Sketch:* terminal testing detects failure exactly when correction is most expensive (RP-46's early-detection economics); on the zero-slack set there is no later interval from which to borrow time (RP-44), so delay cost is monotone in elapsed variance — the literal content of "interest paid in time".
*Scope:* engagements long enough that mid-course correction is materially cheaper than terminal correction; requires the forecast baseline of D14 and a pre-committed measurement cadence.

**P13 — Handoff depth.** Fixed-function resources (D6) extend compiled procedures and are verifiable at their input–output contracts; delegated reflective resources (D7) extend the appraisal layer itself and compose fixed-function resources beneath themselves; delegation at the conceptual level carries appraisal obligations at the conceptual level.
*Sketch:* the depth at which work is handed off determines the depth at which its acceptance must be adjudicated — keystroke-level delegation admits contract-level checking, framing-level delegation requires framing-level appraisal.
*Scope:* task statements expressible against a specification; a conceptual-level handoff without conceptual-level adjudication is P4 at higher bandwidth.

**P14 — Fallback viability.** The circuit remains operational with the external layer absent if and only if the internal layers retain an executable, reduced-capability operating path, maintained by rehearsal with the external layer absent.
*Sketch:* dependence grows with use; unused internal paths decay; a rehearsed degraded mode is the only hedge whose availability is known rather than assumed.
*Scope:* reduced but real operation; engagements whose demands fit the degraded mode.

**P15 — Ledger discipline.** Re-access cost in an unindexed external store grows superlinearly with stored volume, eventually exceeding re-derivation cost; traceable, rewindable records (provenance-indexed ledgers) bound re-access cost and make the store a component of the circuit rather than a liability.
*Sketch:* without an index with provenance, retrieval is volume-proportional search and trust requires re-verification of everything found; the ledger is the index that carries custody (RP-35).
*Scope:* stores accumulating across engagements; single-engagement scratch stores are exempt.

---

## 3. Limitations the paper must state (§9, ~300 words)

1. **Functional, not anatomical.** The tripartition is defined operationally (latency, locus, function); assignment of a given process to a layer is a measurement question, and boundary cases exist. The labels carry no neural or architectural commitment.
2. **Informal propositions.** P1–P15 are argued, not proved: no formal model is constructed and no theorem is established. The propositions are stated with scope conditions precisely so that they can later be formalised or falsified.
3. **No longitudinal calibration data.** P10–P12 imply measurable track records for executing parties; the paper cites the existence of such measurement for human forecasters (RP-38) but presents no data for executing software systems. The empirical programme is open.
4. **Institutional preconditions may fail.** The architecture presumes functioning certifiers, public registers, and aligned intermediary incentives; the certification-intermediary literature (RP-16) shows these can fail by design. Where they fail, P6–P7 do not bind.
5. **Trust transitivity is contested.** The paper claims only the restricted form — transmission of certification of conformance along attested chains (RP-31); it does not claim general trust transitivity, and must not be read as doing so.
6. **Desireless execution is an idealisation.** A learning executor acquires endogenous dispositions that approximate preferences; D17 is maintained as a limit condition and a design target (authority confinement, RP-29), not as an attainable state.
7. **Non-substitutable time is schedule-relative.** Time is non-borrowable only on the zero-slack set (P12); wherever slack exists, partial re-ordering and borrowing are possible, and the monotone-cost claim weakens accordingly.
8. **Single-boundary scope.** The account is written for one adjudication boundary around one agent; scaling to organisations with multiple adjudication boundaries is not treated.
9. **Retrospective-specification fragility.** P5's linearity and exhaustiveness hold only for specifications genuinely pre-registered; under retrospective specification the verification advantage vanishes and the paper's claim does not apply.

---

## 4. Word budget summary

| Section | Words | Definitions | Propositions | Prior art (RP) |
|---|---|---|---|---|
| §1 Introduction | 350 | — | — | 1, 2, 3, 7, 9 |
| §2 Definitions | 600 | D1–D18 | — | 4, 8, 26, 33, 36, 37 |
| §3 The circuit | 700 | — | P1–P4, P13–P15 | 4, 5, 6, 10, 11, 12 |
| §4 Specification and verification | 450 | — | P5, P8 | 22–26 |
| §5 Attestation, certification, chains | 750 | — | P6, P7, P9 | 13–21, 27–35 |
| §6 The predictive attestation | 650 | — | P10, P11 | 15, 18, 19, 36–41 |
| §7 Continuous conformance | 450 | — | P12 | 42–47 |
| §8 Failure modes | 350 | — | (violations) | 5, 12, 29 |
| §9 Limitations | 300 | — | — | 9, 16, 29, 31, 38 |
| §10 Conclusion | 150 | — | — | — |
| **Total** | **4,150** | | | |

Within the 3,000–4,500 target; if compression is needed, §3 and §5 shed 100 words each and §8 sheds 50 without losing a proposition.

---

## 5. Placement verification (the brief's mandatory checks)

- **Predictive attestation as a first-class component:** defined at D14, placed inside the attestation family in §5 (introduced alongside the receipt as its forward-looking counterpart, per the brief's placement instruction), developed in §6 with P10–P11, and extended in §7 with P12.
- **The addendum's conformance test:** P12 states it directly — continuous realised-against-forecast burn-down, variance surfaced while correction is cheap, delay as monotone irrecoverable cost on the zero-slack set. The literalisation table bans the debt/interest vocabulary from the paper's prose.
- **Zero metaphor:** §0's table is the register contract; the writing seat substitutes the right-hand terms mechanically. No vessels, dwellings, crews, commanders, pigment, or walls appear outside quoted seed material.
- **The two kinds of System 3:** D6 and D7, differentiated by depth of handoff, with P13 carrying their verification consequences.
- **Definitions operational by latency, locus, function:** D1–D7 each state latency range, locus, and function; the brief's named definitions (specification D10, attestation D11, certification D12, predictive attestation D14, calibration D15, demarcation D16) are all present and numbered.

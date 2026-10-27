# Competitive outline — "System Three: an exteriorised cognitive layer with an attested trust architecture"

**Prepared by:** the MiniMax Code seat (MiniMax)
**Date:** 2026-10-27
**Companion document:** `research-pack.md` (same directory). Item references of the form *RP A6.1* point to numbered entries in that pack's Parts A–C; *RP B1* and *RP C1* point to the two mandatory elements.
**Target length:** 3,000–4,500 words (the budgeted section plan at §3 totals 4,150 words).
**Register:** neutral academic English, British spellings, formal third person.

---

## 1. Register control and the literalisation table

The seed states its argument through concrete figures. The paper must not. This table fixes the literal content of every figure the seed uses, so that the writing seat has one authoritative substitution per figure and no licence to reintroduce the original imagery. **The paper's own prose may not contain the terms in the right-hand column's "banned" column.**

| Seed figure (banned in the paper's own prose) | Literal content the paper must use instead |
|---|---|
| the head / the skull / "in the head" | the agent's internal processing; the internal layers |
| the trained scripts | compiled procedures held in the agent's internal repertoire |
| the reflex layer beneath the scripts | the motor-execution sub-layer, operating before any deliberative appraisal completes |
| the reflector | the appraisal function; the deliberate appraisal layer |
| the piece of paper / the surface / the desk | an external representational store; an external store of partial state |
| the computer | an external store with retrieval and computation capability |
| the agents / the fleet | external executing parties; the executor set |
| the liaison | the boundary function performing appraisal on the principal's behalf |
| the prepare/release split | the separation of the deadline-bound operating phase from the deadline-free preparation phase |
| the captain | the supervisory principal, whose appraisal is aimed at a future state of a system not under his immediate control |
| the contractor | the executing party; the executor |
| the homeowner | the principal; the party holding the desired outcome and the resulting exposure |
| the building department | the certifier; the body holding the standing code and issuing certifications |
| the code / the specs | the standing specification; the published code of permitted work |
| the inspector | the verifying party at the point of conformance checking |
| the loan / the lender | the exposure extended by a financing party; the financing party |
| the certificate / the chain of custody for trust | the attestation; the attestation chain |
| the paint inside, the siding outside | every item of the specification, including items internal to the completed work |
| the film, the blocks, the quilt's active ledger | the recorded performance history; the compiled procedure blocks; the structured external record |
| the swamp | the unstructured external store whose re-reading cost exceeds the cost of redoing the work |
| the voyage, the dock, the crew, the fish, the boat | (no literal counterpart) — where the paper needs the content of the seed's own four-item enumeration, it uses the literalised form at §4a below, and otherwise uses the specification's checkable/uncheckable distinction (D7) |
| "the contract" (as a figure for a set of aims) | the specification and the exposure arrangement |

**Terminology control.** The labels "System 1", "System 2", "System 3" are retained, but the paper must state in §2 that these are *stipulated labels* whose content is given by operational definitions (D3–D5) and that the labels carry no theoretical weight of their own. The paper's contribution is the definitions, not the labels.

### 1a. The literalised four-item specification

The seed's worked specification has four items, the last of which points forward. In literal terms they are: (i) the condition of the operating personnel; (ii) the condition of the physical assets; (iii) the quantity of output obtained; (iv) the replenishment required for the next period. The paper must use this literalised form wherever it needs the content, and must make the structural point that item (iv) is *not* a conformance target at all but a forward-looking commitment — i.e. a predictive attestation nested inside the conformance specification. This is the seam between the paper's two mandatory elements and the basis of P16 and P22 (RP C3).

---

## 2. Thesis and contribution

**Thesis (one paragraph, for §1).** An agent's performance is not produced by a single internal processing layer but by three functionally distinct layers, of which the third is external to the agent and operates under a latency regime unconstrained by the deadline it serves. The paper defines the three layers operationally by locus, latency profile and function; shows that the architecture requires an external layer whose outputs are appraised before they become action; and shows that the principal's reliance on an external executor cannot be secured by trust, inspection or reputation alone but requires a three-party architecture in which a certifier holds a standing code, an executor issues both backward-looking receipts and forward-looking predictive attestations, and the chain of attestations is published and revocable. The paper's principal formal contribution is the treatment of the executor's forward-looking forecast as an instrument distinct in kind from a receipt: it is priced by the relying party, collateralised on the issuer's standing, and evaluable only in the aggregate under a proper scoring rule. Its second contribution is that the forecast, once relied upon, denominates all subsequent obligations, and that this implies a second, continuous conformance test — the realised-against-forecast burn-down — which terminal conformance cannot substitute for.

**Contribution list (for §1, in four bullets):**
1. A three-layer architecture with operational definitions, and the argument that two of the three defining attributes are insufficient.
2. The mediation requirement, with its failure analysis and its delegation condition.
3. The predictive attestation as an instrument distinct in kind from a receipt, with a calibration-based account of renewable certification.
4. The forecast-denominated repayment schedule and the two-test conformance requirement.

---

## 3. Section structure, with word budget and placement

| § | Title | Words | Definitions landing here | Propositions landing here | Prior art cited here (RP item) |
|---|---|---|---|---|---|
| 1 | Introduction: the claim and the four contributions | 350 | — | — | RP A14.1 (Chalmers on the unit of analysis); RP A1.1 (Clark & Chalmers) |
| 2 | Three layers: locus, latency profile and function | 450 | D1, D2, D3, D3a, D4, D5, D6 | P1, P2 | RP A2.1 (Evans & Stanovich), RP A2.2 (Chase & Simon), RP A3.1 (Simon), RP A3.2 (Sweller; Miller), RP A5.3 |
| 3 | The external layer: hand-off depth, mediation, and the failure of direct connection | 450 | D6, D11, D21 | P2, P3, P4, P5, P21 | RP A1.2 (Hutchins; Hollan, Hutchins & Kirsh), RP A1.3 (Harnad), RP A1.4 (Brooks), RP A11.1 (Parasuraman, Sheridan & Wickens), RP A11.3 (Parasuraman & Manzey), RP A11.4 (Panickssery et al.) |
| 4 | The trust architecture: principal, certifier, executor, and the attestation chain | 600 | D7, D8, D9, D14, D15 | P6, P7, P8, P9, P10 | RP A4.1 (Jensen & Meckling; Fama & Jensen), RP A5.1 (Aumann), RP A5.2 (Milgrom 1991), RP A6.2 (Akerlof), RP A6.3 (Brealey, Leland & Pyle), RP A6.4 (Weingast), RP A6.5 (Fukuyama), RP A7.1 (RFC 5280), RP A7.2 (Casey 2019), RP A7.3 (Falcone & Castelfranchi), RP A8.1–A8.4 (Saltzer & Schroeder; Dennis & Van Horn; Denning; NIST SP 800-207), RP A8.5 (CaMeL), RP A9.1 |
| 5 | The predictive attestation: the forward-looking instrument | 700 | D10, D12, D13 | P13, P14, P15 | RP A10.1 (Brier), RP A10.2 (Murphy), RP A10.3 (Gneiting & Raftery; Good), RP A10.4 (Malcolm et al.), RP A5.2–A5.3 (Milgrom 1991; Milgrom & Roberts 1986), RP A6.1 (Spence), RP A6.6 (Greif & Laitin [flagged] / Kreps et al.), RP A6.7 (Giuffrida & Rovigatti; Patel), RP B14 (Flyvbjerg) |
| 6 | The repayment schedule: forecast-denominated obligations, the burn-down, and time as the irreducible cost | 550 | D16, D17, D18, D7b | P16, P17, P18, P22 | RP C2.1 (SAE EIA 748D-2019; GAO-20-195G), RP C2.2 (Malcolm et al.), RP C2.3 (Flyvbjerg 2006, 2013), RP A12.1 (Hoare), RP C3 (paper's own contribution) |
| 7 | Structural limits: incomplete specification, measurement distortion, relay scale, and degradation without the external layer | 400 | D7 (checkable/uncheckable items) | P11, P12, P19, P20 | RP A4.2 (Holmström & Milgrom), RP A4.3 (Hart & Moore), RP A11.2 (Bainbridge), RP A11.3 (Parasuraman & Manzey), RP A12.2 (Manheim & Garrabrant), RP A2.3 (Kahneman & Klein), RP A2.4 (Ericsson et al.), RP A13.1 |
| 8 | Limitations | 300 | — | — | RP §F, RP A9.1, RP A11.4, RP A12.2, RP A6.6 |
| 9 | Conclusion | 150 | — | — | — |
| | **Total** | **4,150** | | | |

Target: 3,000–4,500 words. If the draft falls short, expand §5 and §6 — the two formal heart-sections — not the introduction.

---

## 4. Definitions

Each definition is stated so that it can be applied to a case without appeal to the seed. Definitions are numbered and are cross-referenced from §3.

**D1 (Engagement).** A bounded episode of delegated work with an identified principal, an identified execution commencement, an identified completion, and an exposure that the principal bears in respect of the outcome. *Used throughout; supplies the unit of analysis for P14 and P16.*

**D2 (Layer).** A functional role in the processing of an agent's work, characterised by three attributes: **locus** (internal to the agent; external to the agent; or distributed across both), **latency profile** (the distribution of delay between an item being presented to the layer and the layer's output being ready for use), and **function** (the transformation applied to the item). *Central to P1.*

**D3 (System 1).** The internal layer: locus internal; function the rapid, largely non-deliberate execution of compiled procedures; latency profile concentrated at reaction timescales. *Distinguishing note: latency here is the interval between presentation and readiness, not the duration of the underlying computation.*

**D3a (Motor-execution sub-layer).** The sub-layer of D3 that initiates physical or externally observable action upon receipt of a compiled procedure, without waiting for the completion of any deliberative appraisal. *Exists in the architecture as a separate locus of latency: action can be specified before it is appraised. The paper must treat D3a as the layer that makes P4 non-trivial, since direct connection of an external output to D3a removes appraisal entirely.*

**D4 (System 2).** The internal layer: locus internal; function the deliberate appraisal, revision, and selection among candidate representations, framings and actions; latency profile broad and budget-constrained; operating under a bounded budget of time and of working-memory capacity. **The aim of D4 is a parameter, not a fixed property.** It may be directed at the agent's own performance, at the performance of other agents, or at a future state of a system not under the agent's immediate control. The third case is the one the architecture depends on.

**D5 (System 3).** The external layer: locus external or distributed; function the production of candidate outputs for appraisal by D4, together with the maintenance of an external store of partial state; latency profile unconstrained by the deadline the output serves, because its work is performed in a deadline-free phase. *Distinct from D3 by locus and by latency profile; distinct from D4 by function.*

**D6 (System 3a: fixed artifact; System 3b: dynamic executor).** The two kinds of external layer, distinguished by **depth of hand-off**. **D6a (fixed artifact)** accepts a task specified at the level of operations, returns a result within that specification, and cannot alter either the specification or the objective; it is callable as a step within a compiled procedure and extends a compiled procedure. **D6b (dynamic executor)** accepts a task specified at the level of objective and framing, and may itself construct D6a instances beneath its own appraisal; it extends the appraisal function rather than a compiled procedure. *The paper's framing requirement: the two kinds are distinguished by what they can change, not by their cost or their speed.*

**D7 (Specification).** A written statement of target states, registered before execution commences and fixed in a location publicly checkable by all parties to the engagement. Its items are of two kinds: **checkable items**, which admit a determinate conformance finding, and **uncheckable items**, which do not and are therefore excluded from conformance scoring. A third kind is distinguished in D7b. *The two-kind structure is mandatory: it is the formal form of the honesty the paper requires about what a specification can do. P11 and P12 depend on it.*

**D7b (Commitment item).** An item of a specification that states a requirement for a future period rather than a target state of the current one. A commitment item is not verifiable at the closure of the engagement in which it is registered; it is discharged in a later period, and it is therefore a predictive attestation nested inside a conformance specification. *The specification is therefore not homogeneous, and must not be presented as if it were. P22.*

**D8 (Attestation).** A signed and dated claim by an identified issuer that a specified state of affairs obtained, or will obtain, at an identified time, together with a reference to the evidence relied upon and the identity of the party who verified it. **D8a (receipt)** is an attestation of a realised state, verifiable at the time of issue. **D8b (predictive attestation)** is an attestation of a future state, not verifiable at the time of issue. *D8a and D8b are the paper's backward/forward pair; D8b is defined fully at D10.*

**D9 (Certification).** A standing attestation, issued by a certifier, outlasting the engagement for which it was issued, and therefore reusable across engagements. Its operative property is that a third party who cannot inspect the internals of the certified party may nonetheless check the certification's existence, scope, issuer and current validity. *Certification is the re-usable form; attestation is the per-engagement form.*

**D10 (Predictive attestation; the estimate).** A quantified forecast issued by an executing party before execution commences, comprising (i) point values and stated spreads for scope, cost and duration; (ii) the issuer's probability distribution over the future state; (iii) a reference to the specification against which the future state will be evaluated; and (iv) an undertaking that the issuer's calibration standing will be updated by the realised-against-forecast comparison at engagement closure. *The four components are jointly necessary: (i) without a stated spread there is no quantified uncertainty; (ii) without a distribution the claim is an opinion; (iii) without the specification the future state is unevaluated; (iv) without the undertaking there is no standing to update and therefore no attestation at all. P13 depends on this decomposition.*

**D11 (Receipt).** The record generated by comparing realised state against specification at engagement closure. A receipt is verifiable at the time of issue; a forecast is not. The paper's §5 opens with this asymmetry. *See D8a.*

**D12 (Calibration).** The property of a forecasting *procedure* — not of any individual forecast — that its stated distributions are close to the realised outcome frequencies, evidenced by a scored realised-against-forecast record over a sequence of engagements. *The procedure/forecast distinction is the whole content of P14 and the reason the paper must not speak of a "calibrated estimate".*

**D13 (Conformity standing; calibration standing).** The two components of an executing party's standing with the certifier: **conformity standing**, established by verified conformance to specifications in prior engagements and by the certifier's attestation of that conformance; and **calibration standing**, established by the scored realised-against-forecast record under a proper scoring rule. *The paper's central technical claim is that calibration standing is depreciable and renewable while conformity standing is depreciable and not renewable within a single engagement — because conformity is a one-shot achievement and calibration is a property of a procedure exercised repeatedly. P14.*

**D14 (Demarcation).** A rule allocating authority across parties such that (i) the authority to perform an engagement and the authority to attest to its completion are held by different parties, and (ii) the principal's desired outcome is not an objective of the party performing the engagement. *The second clause is the paper's formal statement of the seed's claim that an executor whose objective includes the outcome cannot be relied upon for another's outcome. P10.*

**D15 (Attestation chain).** A finite directed path of attestations, each link attesting to the issuer of the next, terminating in an anchor whose standing is not itself attested within the chain. *P6 and P7 operate on chains.*

**D16 (Burn-down; schedule conformance).** The continuous comparison of realised progress against the portion of the forecast attributable to work that should have been complete at the measurement point, sampled at intervals chosen so that divergent work remains remediable at acceptable cost. *Two properties are jointly mandatory and are stated separately: continuity, and timeliness of surfacing. P18.*

**D17 (Interest paid in time).** The accumulated, weighted schedule delay across a forecast-denominated repayment schedule. It is the arrangement's irreducible cost, because it cannot be discharged by transferring any other resource. *P17. The paper must establish that this is a claim about the schedule's currency and not a figure of speech; see RP C1.*

**D18 (Forecast-denominated obligation).** An obligation arising after a predictive attestation has been issued and relied upon, whose discharge is measured against that attestation rather than against a free-standing specification. The ordered set of such obligations is the **repayment schedule** for the attestation. *P16.*

**D19 (Boundary function).** A party performing, on the principal's behalf, the appraisal that D4 would otherwise perform: reading the external layer's output, checking that it answers the request as put, and rejecting or amending it. *Named in the paper's §3 and §4; P5.*

**D20 (Designed ignorance).** The condition in which each party's ignorance of the others' internals is a deliberate design feature of the arrangement, rather than a remediable information deficit. *P9. The paper must state the bound on the partition: the outcome must remain observable to the principal.*

**D21 (External store).** A structured external record of partial state, generated and maintained by the external layer, whose purpose is to make state available to the appraisal function that the internal layers cannot hold. *Its structural requirement is that it carry coordination, not merely storage; an unstructured store raises the cost of re-reading to the point where redoing the work is cheaper. P3 and P20.*

---

## 5. Propositions

Each proposition states a claim, gives a one-line justification sketch, and states its scope conditions. The writing seat must reproduce the scope conditions rather than paraphrase them loosely.

### §2 — Foundations

**P1 (Two attributes are insufficient; three are required).** *Claim.* No pair drawn from {locus, latency profile, function} distinguishes the layers of the architecture; all three are required. *Sketch.* Locus alone does not separate the two external kinds, which share a locus but differ in latency regime and in hand-off depth; latency alone does not separate the two internal layers, which differ in function at overlapping latencies; function alone does not separate the internal deliberation from the external production that it consumes. *Scope.* This is a proposition about the classification scheme, not about psychology; it presupposes D2's attribute set is the right set, which the paper should state as a design decision rather than prove.

**P2 (Latency is irrelevant off the critical path).** *Claim.* The external layer's latency does not degrade engagement performance, provided its output reaches the point of action only after appraisal and compilation into compiled procedures. *Sketch.* The effect of a delay on an engagement is a function of the delay's position relative to the deadline it gates, not its magnitude: the same latency placed inside the reaction loop gates every action rather than one. *Scope.* Requires the output to be complete before the critical path begins; fails where the external layer's output must satisfy a request whose deadline is shorter than its own preparation latency. The paper must state that the latency asymmetry is a property of the deadline structure and not of the layer.

**P3 (Deferred synthesis; distillation).** *Claim.* The principal productive function of the external layer is the improvement of the appraisal function and of the compiled procedures, not the direct supply of answers to the immediate question; hence its marginal contribution per engagement declines as the internal layers improve, while the absolute scope of engagement that becomes feasible increases. *Sketch.* Deliberate practice yields durable gains in compiled procedure and requires feedback; chunking supplies the storage mechanism by which compiled procedure is retained. *Scope.* Requires that appraisal of the external layer's output actually occurs and that the result is compiled rather than merely read. Fails in the degenerate case where the external layer's output is never appraised.

### §3 — The external layer

**P4 (The mediation requirement).** *Claim.* No external output may be connected directly to the motor-execution sub-layer. *Sketch.* Automation that acts without supplying the human with information about its state and intent produces systematic rather than random failure, and automation bias makes the failure more likely under exactly the conditions — time pressure, complexity, many instances — in which the arrangement is deployed. *Scope.* Admits a specified exception for decisions whose stakes are low and whose verification is a routine comparison against a published specification; the exception must be pre-registered, must not be the default, and must be bounded by the specification. The paper must state that the exception is a cost of strictness and that the seed supplies no principled boundary for it.

**P5 (Appraisal may be delegated, subject to independence).** *Claim.* The appraisal function may be performed on the principal's behalf by a boundary function, provided the boundary function's errors are not correlated with the producer's. *Sketch.* Distributed cognition makes the functional system, not the individual, the unit of analysis, which makes the appraisal an organisational role rather than a personal faculty; the independence condition is required because machine evaluators systematically favour outputs they recognise as their own. *Scope.* Fails where the boundary function shares a model family, training lineage or incentive with the producer. The paper must state that current practice does not establish the independence condition, and must not claim otherwise.

**P21 (Appraisal is the point of externalisation).** *Claim.* External output becomes part of the principal's cognition only after it has been appraised; appraisal is therefore constitutive of the arrangement rather than a quality step appended to it. *Sketch.* The extended-mind conditions require external resources to be available and endorsed; the distributed-cognition unit of analysis relocates the process into the functional system, which locates the boundary between production and use at appraisal. *Scope.* Depends on P5 for the delegated case. The paper should note that this is the point at which the architecture's legitimacy depends on the appraisal being genuine, which makes P5 load-bearing rather than decorative.

### §4 — The trust architecture

**P6 (Certification transfers trust along a published path).** *Claim.* A third party who cannot inspect an executing party's internals may nonetheless rely on it, provided (i) the standing relied upon is published in a location checkable by that third party, (ii) the chain of attestations from the anchor to the executing party is complete and valid, and (iii) the standing is revocable and its revocation publicly observable. *Sketch.* Common knowledge requires a public record and cannot be generated by private assurance; certification-path validation is the operational form of the same requirement; trust transfer is warranted only where the structural relation between certifier and certified is genuine. *Scope.* Public checkability is necessary but not sufficient: a published standing unsupported by a real sanction conveys nothing. The paper must state that the third condition is the one most often failed in practice.

**P7 (Chain-level degradation).** *Claim.* If any link of an attestation chain is invalid, the inference from that chain to the quality of its terminal member does not survive, notwithstanding the validity of every other link. *Sketch.* The chain's function is to license an inference about an unobserved quality; an invalid link removes the warrant for that inference without weakening any other component claim. *Scope.* This is a claim about the inference and not about the value of the other links in other uses; it does not entail that a shortened chain is worthless where the shortened chain independently warrants the inference. The paper must state the counter-position fairly.

**P8 (Direction of dependence).** *Claim.* The executing party's primary accountability is to the certifier, not to the principal; obligations to the principal are discharged within the code, and executing the principal's preferences in breach of the code is an expenditure of the standing on which all future reliance depends. *Sketch.* The disciplining device in a separation of ownership and control is the monitor's sanction rather than the principal's approval, and the certifying agency's standing must be at least as trusted as the certified party's. *Scope.* Degenerates to direct contracting where the principal is also the certifier, or where the code is set by the principal. The paper must state that the seed's directional claim is therefore a claim about a separation, and that many practical arrangements lack the separation.

**P9 (Designed ignorance).** *Claim.* The partition of knowledge across parties is a design requirement rather than an information deficit: each party's ignorance of the others' internals is part of what makes reliance possible at all. *Sketch.* Information-flow control admits partitions that are preserved rather than erased, and under quality uncertainty the absence of verification is precisely what makes certification valuable. *Scope.* The partition must be bounded at the interface: a partition that hides the outcome from the principal is a different arrangement, not a variant of this one.

**P10 (The absence of private benefit).** *Claim.* A party that is to hold another party's outcome at risk must not have that outcome among its own objectives. *Sketch.* Agency cost arises from divergent preferences; a certification chain can attest to the observable absence of a conflicting interest without inspecting the executing party's internals, which is the only reason a chain is needed at all. *Scope.* This is a requirement on the executing party's objective function and not on its implementation; indifference is not honesty. The requirement is necessary but not sufficient, and the paper must say so.

### §5 — The predictive attestation

**P13 (A distinct instrument).** *Claim.* An attestation of a future state differs in kind from an attestation of a realised state: it cannot be verified at the time of issue, it is evaluable only in the aggregate over repeated engagements, and its evaluation requires a scoring rule rather than a comparison. *Sketch.* The scoring-rule literature supplies both the metric and the elicitation result that makes an honest distribution the rational report; three-point estimation supplies the minimal sufficient form of a quantified forecast under uncertainty. *Scope.* The distinction dissolves if the forecast is never scored against realisation, in which case it is a claim and not an attestation. The paper must state that the four components of D10 are what separate the two cases and must show the dissolution explicitly.

**P14 (Calibration standing is renewable; renewal is conditional on feedback).** *Claim.* An executing party's standing is a function of its scored realised-against-forecast record over repeated engagements; it is therefore depreciable and renewable, and it cannot be renewed unless the realisation is scored and the record is returned to the forecaster. *Sketch.* A single realisation does not identify a forecasting procedure; reliable expert judgement requires feedback on past predictions; deliberate practice requires the same. *Scope.* The record is meaningful only if the engagements are representative and if the forecaster could not have influenced the realised outcome; otherwise the record is confounded and the paper must say so.

**P15 (Exposure sizing makes calibration load-bearing).** *Claim.* Where a relying party's exposure is sized by a forecast, the expected error in that exposure is a function of the forecast's calibration and not only of the executing party's conformance; consequently an executing party whose execution is sound and whose forecasting is biased is worse for the relying party than one whose execution is sound and whose forecasting is unbiased. *Sketch.* A decision rule computed from a stated distribution is correct only under that distribution; a relying party who adjusts exposure to an interested party's report must account for the report's incentive structure. *Scope.* Holds where the exposure function is monotone in the forecast and the relying party's utility is linear in the outcome. Under risk aversion with a non-linear exposure function the direction of the result may change, and the paper must flag this as a live boundary rather than assume it away. **This proposition carries the seed's load-bearing claim and should be given the most space in §5.**

### §6 — The repayment schedule

**P16 (Forecast-denominated obligation).** *Claim.* Once a predictive attestation has been issued and relied upon, each subsequent obligation is denominated against that attestation, and execution is a repayment schedule for it. *Sketch.* This is definitional in form and is given institutional support by the earned-value treatment of a performance measurement baseline against which performance is measured throughout, not only at closure. *Scope.* Applies only to obligations whose due time was fixed by the attestation; obligations with independently determined due times are not forecast-denominated and are not part of the schedule.

**P17 (Time is the non-transferable currency).** *Claim.* Delay in discharging a forecast-denominated obligation cannot be discharged by transferring capital, labour or materials, because the due time of the next obligation is itself fixed by the attestation; the accumulated delay is therefore a cost that cannot be paid off and is the arrangement's irreducible cost. *Sketch.* The schedule's currency is fixed at issue, so compensation transfers value between parties but cannot restore elapsed time. *Scope.* The claim holds where the attestation's due times are binding on the subsequent obligations; it weakens where schedule slippage can be absorbed by silent re-baselining — which is exactly the practice P18 forbids.

**P18 (The two-test requirement).** *Claim.* Conformance to the specification at closure is not sufficient; the architecture requires a continuous realised-against-forecast burn-down whose divergences are surfaced while correction remains cheap. Terminal conformance tests the state; the burn-down tests the schedule. *Sketch.* Earned-value variance analysis exists to give early warning rather than retrospective explanation, and the outside-view correction is required because project forecasts are systematically biased rather than noisily distributed. *Scope.* The burn-down is informative only if the schedule specification is fixed at issue and not silently re-baselined; re-baselining converts the burn-down into a self-fulfilling measurement. The paper must state the two conditions of D16 (continuity and timeliness) separately, because a measurement that is continuous but reported too late is not a burn-down.

**P22 (The specification may contain its own forward-looking instrument).** *Claim.* A specification may include a commitment item stating a requirement for a future period; such an item is not a conformance target but a predictive attestation nested inside the conformance specification, and its discharge occurs in a later period and only in aggregate. *Sketch.* The local instance is the earned-value requirement that an estimate at completion be prepared from performance to date and the remaining work, which performs the same nesting operation one level up: the estimate for the work still to be done is issued from within the review of work already done. *Scope.* This proposition is the paper's own; no source in the research pack states it in general form. The paper must present it as a contribution, cite the earned-value literature only for the local instance, and mark the generalisation as its own. Its consequence for the architecture is that the repayment schedule is *periodic*, not merely per-engagement — see the closing note of §6.

### §7 — Structural limits

**P11 (Specification-as-test).** *Claim.* A pre-registered specification, fixed before execution in a publicly checkable location, converts the assessment of an engagement from an impression into a determinate comparison, such that each non-conforming item is a finding and each conforming item is silent. *Sketch.* Correctness is defined relative to a written specification; the silent/report asymmetry is the specification-checking contract. *Scope.* Holds for the checkable items only. The paper must state that a written specification does not make the specified thing the right thing, and that a pre-registered specification written by the principal may be a faithful record of the principal's wishes rather than of its interests.

**P12 (Measurement distortion).** *Claim.* A specification whose items are entirely checkable induces under-attention to everything it does not check. *Sketch.* Multitask agency theory shows that incentive contracts induce over-investment in the measured task; the measure–target inversion shows that a metric that becomes a target ceases to indicate the objective. *Scope.* The distortion is strongest where the unmeasured item is also the unmeasured-in-practice item. **This is a structural cost of the architecture, not a fixable defect**, and the paper must say so in §7 rather than in a footnote.

**P19 (The relay scale conjecture).** *Claim.* The failure of an unexamined relay grows with the number of relays; a single unexamined relay is an error and a set of unexamined relays constitutes a policy. *Sketch.* Automation bias is frequency-dependent and worsens under time pressure and task complexity. *Scope.* **The growth is asserted, not measured.** The paper must mark this as a conjecture and specify the measurement that would test it; it must not present it as a result.

**P20 (Degradation without the external layer).** *Claim.* An arrangement in which compiled procedures arrive only from outside loses the capacity to operate when the external layer is unavailable, because the practice that maintains competence is the practice the arrangement removes. *Sketch.* The irony of automation: automation that removes involvement removes the learning that makes competence possible, so reliability comes to depend on the involvement that automation was introduced to eliminate. *Scope.* A claim about the arrangement's design requirement and not a prediction about any particular deployment. The paper must state the corresponding design requirement — that the arrangement must retain a degraded but real internal operating mode — and must note that the seed's remedy is stated and not independently verified here.

---

## 6. Prior-art placement, consolidated

For the writing seat's convenience: which propositions are **load-bearing on a citation** and which are **the paper's own argument requiring no citation**.

| Proposition | Depends on (RP) | Status |
|---|---|---|
| P1 | — | Paper's own argument. Cite RP A2.1 only for the internal two-layer background. |
| P2 | — | Paper's own argument. No verified source in the pack supplies latency as a first-class parameter; the paper must argue it and must not imply it is a standard result. |
| P3 | A2.2, A2.4 | Citing: the mechanism (chunking, deliberate practice). Argument: the *external* placement of the improvement work. |
| P4 | A11.1, A11.3 | Citing: the failure analysis. Argument: the normative prohibition. |
| P5 | A1.2, A11.4 | Citing: the functional-system unit and the self-preference finding. Argument: the delegation condition. |
| P21 | A1.1, A1.2 | Citing: the availability conditions. Argument: that appraisal is constitutive. |
| P6 | A5.1, A7.1, A7.3, A6.5 | Heavily cited. The three conditions (published, valid path, revocable) are the paper's own assembly; the literature supplies the ingredients. |
| P7 | A7.1, A7.2 | Citing: path validation and the chain-of-custody analogy. Argument: the *inference-level* degradation claim, which no source in the pack states. |
| P8 | A4.1, A6.5 | Citing: the monitoring structure and the certifying agency. Argument: the application to the executor–certifier relation. |
| P9 | A8.3, A6.2 | Citing: the information-flow partition and the value of quality uncertainty. Argument: that ignorance is a design requirement. |
| P10 | A4.1, A9.1 | Citing: the agency-cost basis. **Cite Fama & Jensen (VERIFIED) rather than the fiduciary article (UNVERIFIED, RP E1 §54).** |
| P13 | A10.1–A10.4, B1 | Heavily cited. This is the paper's central formal contribution and must be argued through the literature, not asserted. |
| P14 | A10.2, A2.3, A2.4 | Heavily cited. Argument: the two-component standing decomposition (D13). |
| P15 | A5.3, A10.3, B1 | Heavily cited. Argument: the exposure-error result and its boundary conditions. |
| P16 | C2.1 | Citing: the baseline discipline. Argument: the definition. |
| P17 | — | Paper's own argument. The claim that schedule time is non-transferable is the paper's; it must be stated as a theorem about the schedule's currency, not as an intuition. |
| P18 | C2.1, C2.3, A12.1 | Heavily cited. Argument: the requirement of *both* tests, and the re-baselining prohibition. |
| P22 | C3, C2.1 | **Paper's own contribution.** Cite GAO-20-195G only for the local instance (estimate at completion prepared from performance to date); mark the generalisation as the paper's. |
| P11 | A12.1 | Citing: correctness relative to specification. Argument: the silent/report asymmetry applied to engagements. |
| P12 | A4.2, A12.2 | Heavily cited. Argument: that the distortion is structural and unavoidable. |
| P19 | A11.3 | Citing: frequency-dependence. **Conjecture — must be marked as such.** |
| P20 | A11.2, A2.4 | Citing: the irony of automation. Argument: the design requirement. |

---

## 7. Limitations the paper must state

These are to be stated explicitly in §8, in the paper's own voice, and not softened. They are drawn from the research pack's Part F and from the proposition scope conditions above.

1. **The architecture is under-theorised, and the paper is the theory.** No verified source in the research pack supplies a three-layer architecture with an exteriorised middle layer, or the normative requirement that the principal's own appraisal mediate external output. Both are the paper's own contribution and are argued, not inherited.
2. **The specification cannot be complete, and completeness is where the architecture breaks.** A specification whose items are all checkable induces under-attention to everything it does not check (P12); a specification that is complete enough to be scored is precisely the object that the measure–target inversion defeats (RP A12.2). The paper must state that the architecture trades objectivity against completeness and that the trade-off is not resolvable within the architecture.
3. **The predictive attestation requires feedback that institutions do not reliably provide.** Calibration standing is renewable only if realisations are scored and returned to the forecaster (P14), and this presupposes representative engagements, an outcome the forecaster cannot influence, and a willingness to publish bad numbers. Where these fail, the forecast is an untested claim and the architecture's central instrument is inert.
4. **The independence condition for delegated appraisal is currently unmet.** Machine evaluators systematically favour outputs they recognise as their own (RP A11.4), and the paper's practical arrangement adjudicates agent output with agent judgement. The paper must state that this does not establish the independence condition P5 requires, and must not treat the arrangement as validated.
5. **The direction of the exposure-error result is conditional.** P15's direction holds under monotone exposure and linear utility; under risk aversion with a non-linear exposure function the result may reverse. The paper must state this boundary and must not generalise past it.
6. **Systematic forecast bias is not corrected by averaging.** Because project forecasts are optimistically biased rather than noisily distributed (RP C2.3), a calibration record that merely averages scores settles at a biased level. The outside-view correction is necessary and must be specified, and the paper must state that the seed's own base-rate re-weighting is the correct response.
7. **Chain-level degradation is argued, not established empirically.** P7 is the paper's own claim about the failure of an inference, and the pack contains no verified dataset on attestation chains. The paper must mark it as an argument.
8. **The relay-scale claim is a conjecture.** P19 must be labelled as such, with the measurement specified.
9. **No empirical validation exists for the architecture.** Every source in the research pack is a conceptual result, a methodological standard, or an artefact- and field-study. Any claim about the architecture's performance must be marked as a research programme.
10. **Two flagged citations.** The enforcement-and-impunity argument (RP A6.6) and the fiduciary-duty statement (RP A9.1) are carried by VERIFIED substitutes (Kreps et al. 1982; Fama & Jensen 1983; Holmström & Milgrom 1991). The paper must cite the substitutes, and must not cite the flagged originals without re-checking them.
11. **The unit of analysis is contested.** The framing citation (RP A14.1) raises the question of whether an arrangement of agents and artefacts could constitute a mind; the cited author does not settle it in the paper's favour, and the paper must present its own answer as its own.
12. **The specification is not homogeneous, and the paper's treatment of it is novel.** The claim that a specification may contain a forward-looking commitment item (P22, D7b) is the paper's own generalisation; the earned-value literature supplies only the local instance (RP C3). The paper must present it as a contribution and must not imply that a settled literature supports it in general form. A further consequence, which the paper should state in §6 rather than leave implicit: because a commitment item is discharged in a later period, the repayment schedule is *periodic* rather than merely per-engagement, and the architecture's recurrence depends on the commitment items of one period being discharged well enough to license the next period's forecast. The paper must acknowledge that this recurrence is also where the architecture is most exposed, since a miss in the commitment item propagates into the next period's forecast and is therefore scored twice.

---

## 8. What the paper must not do

- Must not assert that the architecture has been empirically validated.
- Must not import the seed's figures or any near-synonym for them; §1's table is exhaustive and the writing seat should treat it as a closed list.
- Must not present the three layer-labels as a discovery; the contribution is D2–D6 and P1.
- Must not claim that the layered architecture is compatible with a particular view of consciousness; it is an organisation of work, and the paper should say so if it touches the topic at all.
- Must not treat "external" as "less intelligent" or "a tool"; the paper's claim is about locus and latency, not about capability.
- Must not treat the certification chain as the primary safety mechanism. The primary mechanism is the burn-down test; the chain is the mechanism by which reliance is licensed at a distance.
- Must not let the estimate section shrink. The predictive attestation is the element the seed's author identified as the most important product of the executing party, and §5 plus §6 together must be at least 30% of the paper's words.
- Must not claim the forecast-denominated obligation is a metaphor. It is a claim about the schedule's currency, and RP C1 gives the argument.
- Must not cite any source the research pack has flagged as UNVERIFIED without first re-checking it.

---

*End of outline.*

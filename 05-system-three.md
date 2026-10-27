# System Three: External Processing, Attestation Chains and the Forecast as Predictive Attestation

*SuperInstance working paper, 27 October 2026. Drafted by the Claude Code seat (Anthropic) from the System Three working note and the research packs and outlines of the ZCode (Z.ai) and MiniMax Code (MiniMax) seats; editorial decisions are recorded in `adjudication.md`.*

Status: working paper. Adversarial review filed alongside the paper (`system-three-process/review-kimi.md`); revision pass pending. Process record: `system-three-process/SYNTHESIS.md`.

## Abstract

Three layers of an agent's processing are defined by locus, latency and function: internal compiled procedures (System 1), internal deliberation under a time budget (System 2) and an external layer (System 3) whose outputs reach action only through adjudication and compilation. Reliance on executing parties that cannot be inspected requires a certifier, desireless executing parties and attestation chains, under which relying parties' obligations are invariant to attestation failure. The central instrument is the predictive attestation, the executing party's scored forecast of scope, cost and duration, on which every exposure is sized. Once relied upon, it fixes a schedule whose elapsed lateness cannot be recovered, so conformance must be measured continuously against the forecast as well as terminally against the specification.

## 1. Introduction

Written notation increased what individuals could compute without changing their internal capacity; computers added retrieval and computation, and delegated software agents add production, completed while the delegating agent attends to other matters. Formalising an unpublished working note (SuperInstance 2026), this paper treats performance as a property of the resulting arrangement and asks when external output can be admitted to action without degrading deadline-bound performance or reliability, and on what basis parties can rely on executing parties they cannot inspect.

The contributions are: (i) operational definitions of three layers, the external one defined by a mediation condition (Definitions 1–8, Propositions 1–6); (ii) a three-party attestation architecture (Definitions 9–15, Propositions 7–11); (iii) the predictive attestation, the forward-looking counterpart of the receipt (Definitions 16–17, Propositions 12–15); and (iv) a two-test conformance requirement that follows from obligations denominated against the forecast (Definitions 18–20, Propositions 16–18). 'System 1' and 'System 2' are labels taken from dual-process research (Stanovich and West 2000), their content fixed by the definitions; each proposition states its justification and scope.

## 2. Related work

*Cognition beyond the individual.* The extended mind (Clark and Chalmers 1998), distributed cognition (Hutchins 1995) and cognitive offloading (Risko and Gilbert 2016) establish that external resources can be constituents of cognition, chiefly as stores and coordinators. The present account adds external production and makes adjudicated entry into action definitional.

*Internal architectures.* Dual-process theories separate fast autonomous processes from slower, working-memory-dependent ones that intervene on their defaults (Stanovich and West 2000; Evans and Stanovich 2013), and Stanovich (2011) divides the internal architecture into three levels; System 3 is distinguished instead by locus and mediation. Bounded rationality (Simon 1955), near-decomposability (Simon 1962), deliberate practice (Ericsson et al. 1993) and the conditions for valid intuition (Kahneman and Klein 2009) underlie Definitions 2–7 and Proposition 4.

*Delegation and certification.* Agency theory (Jensen and Meckling 1976; Holmström 1979; Holmström and Milgrom 1991), quality uncertainty and signalling (Akerlof 1970; Spence 1973), certification intermediaries (Lizzeri 1999), reputational premia (Klein and Leffler 1981), credit terms (Stiglitz and Weiss 1981) and performance bonding (Giuffrida and Rovigatti 2022) explain why delegation to parties that cannot be inspected needs certification and how an executing party's risk is priced.

*Attestation and authority.* Certificate-path validation with revocation (Cooper et al. 2008) and remote attestation's separation of attester, verifier and relying party (Birkholz et al. 2023) are the nearest structural precedents for §4, though neither has a forward-looking attestation. Accreditation of certifiers (ISO/IEC 17020:2012; ISO/IEC 17021-1:2015), custody records (Kent et al. 2006), constrained transitivity (Jøsang and Pope 2005), least privilege and complete mediation (Saltzer and Schroeder 1975), capabilities (Dennis and Van Horn 1966; Miller 2006; Debenedetti et al. 2025), common knowledge (Aumann 1976), information hiding (Parnas 1972) and specification-relative correctness (Hoare 1969) supply the remaining apparatus.

*Forecasts, schedules and automation.* Scoring and calibration (Brier 1950; Murphy 1973; Murphy and Winkler 1977; Gneiting and Raftery 2007; Tetlock 2005), base rates and reference classes (Kahneman and Tversky 1973; Flyvbjerg 2006), schedule measurement (Malcolm et al. 1959; Kelley and Walker 1959; Shewhart 1931; Fleming and Koppelman 2010; GAO 2020) and liquidated damages (Goetz and Scott 1977) supply the instruments of §§4.3–5; automation research supplies the failure analyses of §3 (Bainbridge 1983; Parasuraman et al. 2000; Parasuraman and Manzey 2010; Panickssery et al. 2024) and of measures used as targets (Manheim and Garrabrant 2018).

No work reviewed combines an external layer defined by mediation, a forward-looking attestation secured on certified standing and a continuous forecast-relative conformance test; 'predictive attestation' is introduced here.

## 3. The three-layer arrangement

**Definition 1 (Layer).** Relative to an agent's boundary, a layer is a class of processes characterised jointly by *locus* (internal or external), *latency* (the interval from presentation of an input to availability of the output for use) and *function* (the transformation applied).

**Definition 2 (Operating and preparation intervals).** An *operating interval* is a period in which the agent must act by externally fixed deadlines, which bound the latency of every process on the path to a due action; a *preparation interval* lies between operating intervals, and no action is due within it.

**Definition 3 (System 1).** System 1 is the internal layer that maps recognised situations to actions, or to pre-verbal weightings of options, by executing compiled procedures, with latency below operating deadlines (for humans, indicatively under one second); its output needs no serial working-memory load, and any verbal justification follows it. Its *motor-execution sub-layer* initiates action before appraisal can complete (indicatively, tens to hundreds of milliseconds).

**Definition 4 (System 2).** System 2 is the internal, serial layer limited by working memory, with latency comparable to operating deadlines (indicatively, seconds to minutes) and hence a time budget. It *adjudicates* (accepts, rejects or edits) outputs of Systems 1 and 3, re-weights System 1's weightings by information System 1 does not use, re-frames tasks and compiles; on budget exhaustion it assembles previously adjudicated procedures. A *boundary adjudicator* adjudicates on an agent's behalf.

**Definition 5 (Aim of appraisal).** The aim of a System 2 process is its beneficiary: (i) the agent's own procedures; (ii) other agents' procedures; or (iii) a system's state at a future time when the agent is not operating it. Responsibility, not capacity, fixes the aim.

**Definition 6 (System 3; mediation condition).** System 3 is the external layer producing finished outputs (retained state, computed results, completed work) for adjudication, with latency unconstrained by operating deadlines unless placed on the path to a due action (Proposition 1). Its outputs satisfy the *mediation condition*: they affect action only through adjudication and compilation, adjudicated per output or, for fixed-function resources, once per contract.

**Definition 7 (Compilation).** Compilation encodes adjudicated outputs into System 1 procedures, or into System 2's criteria of adjudication, so that later operating intervals need less System 2 time and fewer System 3 calls per unit of similar work.

**Definition 8 (Systems 3a and 3b).** A *fixed-function resource* (System 3a), such as a calculator, has a fixed input–output contract, can be a step of a compiled procedure and cannot alter its task. A *delegated reflective resource* (System 3b), such as a language-model agent, accepts tasks stated as objectives and framings, appraises its own work and may compose fixed-function resources in combinations the delegating agent did not specify.

**Proposition 1 (Latency placement).** An action with slack $s$ after internal processing misses its deadline if a System 3 process of latency $\ell > s$ lies on its path, and otherwise loses slack $\ell$; the same process, completed and compiled in a preparation interval, adds nothing to response time, its latency limiting only how much can be prepared.

*Justification.* Serial response time is the sum of stage latencies, and a stage completed in advance contributes nothing; the separation instantiates near-decomposability (Simon 1962).

*Scope.* Recurring situations; otherwise the agent acts without System 3 or accepts the delay.

**Proposition 2 (Mediation).** Output of a delegated reflective resource should not drive the motor-execution sub-layer unadjudicated, except under a pre-registered exception bounded by a mechanically checkable specification.

*Justification.* Unadjudicated actions have passed no appraisal by the party responsible for their aim. Appropriate automation of action selection depends on reliability and the cost of error (Parasuraman et al. 2000), and automation bias affects experts and resists training (Parasuraman and Manzey 2010).

*Scope.* No general boundary for the exception is supplied.

**Proposition 3 (Relay error and independent adjudication).** If a claim passes through $n$ unadjudicated relays, each independently introducing an error with probability $p$, it arrives correct with probability $(1-p)^n$. One adjudication at the delivery boundary, detecting errors with probability $q$ independently of their origin, multiplies the probability of an undetected error by $1-q$.

*Justification.* Elementary probability under the stated independence.

*Scope.* Independence fails where adjudicator and producers share a model family, since language-model evaluators favour their own outputs (Panickssery et al. 2024). That unadjudicated relay becomes habitual as volume per adjudicator grows is a conjecture, testable by measuring adjudication and undetected-error rates against volume.

**Proposition 4 (Compilation gain).** Under the mediation condition, compilation lowers the System 2 time and System 3 calls needed per unit of recurring work and raises the work feasible within a fixed budget: System 3 reduces the agent's per-unit dependence on it while enlarging what the agent can undertake.

*Justification.* Compiled procedures need no serial working-memory load; acquiring them requires informative feedback (Ericsson et al. 1993).

*Scope.* Accurate adjudication, since compiling an error fixes it, and regular environments (Kahneman and Klein 2009); non-recurring work is excluded.

**Proposition 5 (Delegation depth).** Adjudication must match what a producer can change. A fixed-function resource cannot alter its task and is verified once against its contract; each output of a delegated reflective resource must be adjudicated for framing (whether the task solved is the task intended) as well as for correctness.

*Justification.* An output can deviate only where its producer has control.

*Scope.* Stable contracts; a changed fixed-function resource is re-verified before reuse.

**Proposition 6 (Maintenance conditions).** The arrangement persists only if (a) external stores are indexed with provenance, keeping re-access and re-verification cheaper than re-derivation, and (b) Systems 1 and 2 retain a reduced operating path, exercised periodically without System 3.

*Justification.* (a) Offloading pays only while cheaper than internal processing (Risko and Gilbert 2016); unindexed retrieval grows with volume, and items lacking a custody record need re-verification (Kent et al. 2006). (b) Automation erodes the practice on which competent intervention depends (Bainbridge 1983).

*Scope.* (b) is a design requirement, not a prediction.

## 4. Specification and attestation

### 4.1 Engagements, parties and specifications

**Definition 9 (Engagement; parties).** An *engagement* is a bounded unit of delegated work with a specification. The *desiring party* holds its objective and commits exposure against it; the *certifier* maintains a *standing specification* (rules binding every engagement of a class, independent of any objective), certifies executing parties and keeps a public register; the *executing party* performs under certification. *Relying parties* (the desiring party, any financing party) commit exposure on the executing party's attestations. In agentic software, the user, the platform operator and the agentic application are respectively the desiring party, the certifier and the executing party.

**Definition 10 (Specification).** A specification is a finite list of items, registered before the engagement in a store accessible to all parties, each stating a required closing state. Items are *checkable* (admitting a determinate finding of conformance), *uncheckable*, or *commitment items* (stating what must be provided for a later engagement). An instance: condition of personnel; condition of equipment; quantity of output; resources to be replenished before the next engagement, the last being a commitment item.

**Definition 11 (Desireless execution).** An executing party is *desireless* if its objective depends on the outcome only through conformance to the engagement and standing specifications, including the terms of its own attestations; any other dependence is a *residual preference*. The condition excludes preference over what the specified outcome is, not interest in conformance.

**Definition 12 (Demarcation).** Authority is *demarcated* if each party holds only the authority its function requires (Saltzer and Schroeder 1975), conferred as specific, revocable capabilities (Dennis and Van Horn 1966); credentials over the desiring party's resources are held by the certifier and exercised on the executing party's behalf, never by it; and performance and attestation of completion lie with different parties.

**Proposition 7 (Specification as terminal test).** Verifying checkable items against a pre-registered specification is exhaustive and reports only differences: each non-conformance is a finding, each conformance produces no report, and cost is linear in the number of items. It makes appraisal with aim (iii) of Definition 5 possible, since that aim's object does not exist when the aim is set.

*Justification.* Correctness is definable relative to a written specification (Hoare 1969); comparison with a fixed list needs no search over intentions.

*Scope.* Checkable items, bounded per-item cost and prior registration. Conformance does not show that the specification states the desiring party's interest, and scoring checkable items diverts effort from uncheckable ones (Holmström and Milgrom 1991).

### 4.2 Backward-looking attestation

**Definition 13 (Attestation; receipt).** An *attestation* is a signed, dated claim by an identified issuer about a state of affairs, citing its evidence; a *receipt* is a backward-looking attestation about completed execution, verifiable at issue. The forward-looking counterpart is Definition 16.

**Definition 14 (Certification; certified standing).** A *certification* attests, across engagements, an executing party's competence for a class of engagements under a standing specification; it is issued by a certifier whose own competence is attested (ISO/IEC 17020:2012; ISO/IEC 17021-1:2015), entered in a public register and revocable there. *Certified standing* is the register entry (certification, conformity record and calibration record), an asset because relying parties set their terms by it.

**Definition 15 (Attestation chain).** An *attestation chain* is a finite sequence $a_1, \dots, a_n$ in which $a_1$ is issued by a root issuer accepted without attestation, each $a_{k+1}$ is issued by the subject of $a_k$, and $a_n$ attests the claim relied upon. Reliance usually rests on several chains (certification, the certifier's accreditation, attestations about inputs, a financing party's authorisation), which together form a directed acyclic graph.

**Proposition 8 (Reliance without inspection; restricted transitivity).** A party unable to inspect an executing party may rationally rely on its conformance claims if (i) the items are checkable at the interface, (ii) the certification is publicly registered, (iii) every chain is complete and valid and (iv) revocations are public. Diligence then reduces to validating chains, and knowledge of the executing party's internals adds cost but no warrant: the partition of knowledge is a design property, not a deficit.

*Justification.* A public register makes standing common knowledge (Aumann 1976), which private assurance cannot; path validation with revocation checking is deployed practice (Cooper et al. 2008); and hiding interior decisions behind interfaces is the basis of modular design (Parnas 1972).

*Scope.* Only the certifier's attestation of competence transfers, not general trust (Jøsang and Pope 2005); the proposition fails where the certifier's incentives diverge from the standing specification (Lizzeri 1999), and presumes the outcome observable by the desiring party.

**Proposition 9 (Chain conjunction).** Whatever the dependence among failures, the probability that every attestation holds is at most $\min_k (1-p_k)$, where $p_k$ is the failure probability of attestation $k$, and equals $\prod_k (1-p_k)$ under independence. A claim relayed without its receipt adds an attestation of unknown $p_k$, and no bound remains.

*Justification.* A conjunction is no more probable than any conjunct.

*Scope.* The proposition concerns inference through a failed attestation; a shorter chain that independently supports the claim keeps its value.

**Proposition 10 (Obligation invariance under attestation failure).** A relying party's obligation, fixed at commitment, is invariant under any later lapse, revocation or counterfeit of an attestation on which it was committed, unless made contingent by contract. Failure lowers the value of what the obligation secured, not the obligation, so the loss falls on the relying party.

*Justification.* The obligation's terms do not refer to the attestations' validity, but the value obtained depends on the conformance they warranted. Checking receipts and revocations is thus the relying party's only contract-free protection; warranties, bonds and liquidated damages make obligations contingent (Goetz and Scott 1977; Giuffrida and Rovigatti 2022).

*Scope.* Non-contingent obligations; contingent terms reduce the asymmetry to their extent.

**Proposition 11 (Necessity of desireless execution).** Unless conformance is fully observable, reliance by parties who cannot inspect an executing party requires desireless execution.

*Justification.* Residual preference under imperfect observation invites deviation on the least observable, hence least priceable, items (Jensen and Meckling 1976; Holmström 1979); certified standing sustains the condition, because deviation forfeits more future value than it gains (Klein and Leffler 1981). The executing party's primary accountability is therefore to the certifier: serving a desiring party's preference in breach of the standing specification reduces the standing on which every future relying party depends.

*Scope.* Necessary, not sufficient: indifference is neither competence nor honesty. It fails in a final engagement, where no future standing depends on conduct, and where the desiring party sets the standing specification; for learning systems it is a design target maintained by demarcation (Miller 2006; Debenedetti et al. 2025).

### 4.3 Forward-looking attestation

Before execution, the executing party also attests what the receipt will show.

**Definition 16 (Predictive attestation).** A *predictive attestation* is issued by the executing party before an engagement, under uncertainty, and comprises: (i) point values and intervals at stated probabilities for scope, cost and duration, for example in three-point form (Malcolm et al. 1959); (ii) the predictive distribution that (i) summarises; (iii) a reference to the specification against which the realisation will be assessed; and (iv) an undertaking, entered with the certifier, that the calibration record will be updated by the score of (ii) against the realisation. By (iv) the issuer pledges its certified standing as security for the forecast: it collateralises its standing on the outcome.

**Definition 17 (Calibration record).** The *calibration record* is the sequence $(F_j, x_j, S(F_j, x_j))$ of forecast distributions, realisations and scores over engagements $j$, with $S$ a strictly proper scoring rule fixed in advance, under which reporting one's actual distribution uniquely optimises expected score (Brier 1950; Gneiting and Raftery 2007). The issuing procedure is *calibrated* if realisations are consistent with stated distributions (80 per cent intervals contain about 80 per cent of realisations); calibration belongs to the procedure, not to a single forecast. Each scored comparison is entered as a receipt, so every engagement yields two receipts: on conformance and on calibration.

**Proposition 12 (A different kind of decision model).** A predictive attestation differs from a state-evaluating judgement, whose object exists and is in principle verifiable at issue, in four respects: (a) its object does not yet exist, so it can be scored at realisation but not verified at issue; (b) one score cannot separate the quality of the procedure from chance, so evaluation requires a record (Murphy 1973); (c) issuing it changes the situation it forecasts, because exposures are committed on it; and (d) its issuer partly controls the realisation.

*Justification.* (a) and (b) follow from Definitions 16 and 17, (c) from Proposition 13 and (d) from the issuer's performing the work.

*Scope.* By (d), propriety guarantees honest reporting only for forecasters who cannot influence the outcome; an executing party is also rewarded for bringing the realisation to its forecast, for instance by withholding early completion, so its record measures forecasting and execution jointly. Without Definition 16(iv), a forecast is a claim, not an attestation.

**Proposition 13 (Estimation accuracy as the common dependency).** Let each relying party $k$ commit exposure $x_k = \phi_k(\hat{Q})$, non-decreasing in the forecast $\hat{Q}$, and let $Q$ be the realisation. Then (a) shortfalls depend on the forecast error $Q - \hat{Q}$, not on conformance alone: a conforming delivery at twice the forecast cost leaves every forecast-sized exposure short; (b) one forecast error misstates all exposures at once and in the same direction, so it cannot be offset among the parties; and (c) relying parties can offer better terms when the calibration record shows calibrated, narrow intervals. Estimation accuracy is therefore the quantity on which every exposure in the chain jointly depends.

*Justification.* (a) and (b) follow from the construction of $\phi_k$; (c) holds where credit terms follow inferable risk (Stiglitz and Weiss 1981), as in performance-bond pricing (Giuffrida and Rovigatti 2022), a record producible only by accurate forecasting being a separating signal (Spence 1973).

*Scope.* (c) is argued for risk-neutral relying parties with monotone exposures and may reverse under risk aversion with non-linear exposure; all parts presume a public record scored under a rule fixed in advance.

**Proposition 14 (Calibration standing is renewable).** Each scored engagement moves calibration standing up or down, so degraded standing can be restored by later calibrated forecasts; unlike the conformity record, calibration is identifiable only over a sequence. Renewal requires scoring with feedback to the issuer, representative engagements and no revision of forecasts after issue.

*Justification.* Compiled judgement is reliable only with feedback (Kahneman and Klein 2009); long-run scoring separates forecasters persistently (Tetlock 2005).

*Scope.* Engagement forecasts err systematically towards optimism (Flyvbjerg 2006): a record exposes the bias without removing it, and removal requires forecasting from the realised outcomes of a reference class of comparable engagements, adjusted for the case (Kahneman and Tversky 1973; Flyvbjerg 2006).

**Proposition 15 (Nested predictive attestations).** A commitment item's object belongs to a later engagement, where it is scored rather than compared, so the item is a predictive attestation nested in the specification. Hence (a) specifications with commitment items need two verification regimes, and (b) the obligations of §5 extend across engagements: each terminal verification issues the forecast on which the next engagement's obligations rest, and a defective commitment item enters both its own evaluation and the error of the forecast relying on it.

*Justification.* Proposition 12(a) applies to its object; an estimate at completion prepared from performance to date (GAO 2020) is a local instance.

*Scope.* The general claim is this paper's own.

## 5. Forecast-denominated obligations and continuous conformance

**Definition 18 (Forecast-denominated obligation; discharge schedule).** A predictive attestation is *relied upon* from the time a relying party first commits exposure sized on it. Thereafter an obligation of the executing party is *forecast-denominated* if the attestation fixed its quantity or due time, including intermediate deliverables on whose due times relying parties scheduled their own obligations; these obligations $o_i$, with due times $\tau_i$, form the *discharge schedule*.

**Definition 19 (Lateness; delay cost; zero-slack set).** For an obligation discharged at $t_i$, *lateness* is $L_i = \max(0, t_i - \tau_i)$. The *delay cost* of the schedule is $C = \sum_i w_i L_i$, where $w_i \ge 0$ is the cost per unit of lateness borne by dependent parties; it accrues while an obligation is overdue. The *zero-slack set* contains the obligations on the longest path of the dependency network, whose lateness extends completion one-for-one (Kelley and Walker 1959).

**Definition 20 (Burn-down).** A *burn-down* compares, at measurement times fixed at issue, realised progress with the progress the forecast implies, reporting each variance and a revised estimate at completion (Fleming and Koppelman 2010; GAO 2020). It must be *continuous* (cadence unaltered by observed variance), *timely* (intervals short enough for detected variance to remain recoverable) and *baseline-fixed* (revisions reported as revisions, never substituted for the forecast).

**Proposition 16 (Denomination).** Once a predictive attestation is relied upon, a forecast-denominated obligation discharged to specification but after its due time is a non-conforming discharge: execution is the discharge of a schedule fixed by the executing party's own forecast.

*Justification.* Relying parties fixed their own commitments against those due times, and earned-value practice measures performance against such a baseline throughout execution (Fleming and Koppelman 2010).

*Scope.* Obligations whose terms the forecast fixed.

**Proposition 17 (Elapsed lateness is non-transferable).** On the zero-slack set, lateness once incurred (a) propagates to every dependent due time; (b) can be compensated, including by liquidated damages (Goetz and Scott 1977), but compensation transfers value and restores elapsed time to no party; and (c) can be reduced only by compressing remaining work, which bounds how much can be absorbed. Elapsed time is the one schedule input that no party can supply and no activity can release; delay cost is borne by dependent parties in elapsed time.

*Justification.* The longest path has no slack to re-allocate (Kelley and Walker 1959); money, labour and materials can be obtained from other parties, elapsed time cannot.

*Scope.* Schedule-relative: lateness within available slack does not propagate.

**Proposition 18 (Two-test conformance).** Let a variance $v$, detected when work of duration $r$ remains, be recoverable only by compressing remaining work at intensity $v/r \le \kappa$, at cost $r\,g(v/r)$ with $g$ convex and $g(0) = 0$. Then (a) recovery cost is non-increasing in $r$, so earlier detection is never more expensive; and (b) recovery is infeasible once $r < v/\kappa$, so at completion ($r = 0$) only compensation remains. Conformance therefore requires two tests, neither substituting for the other: terminal verification against the specification (Proposition 7) and a continuous, timely, baseline-fixed burn-down against the forecast (Definition 20), reporting variance while correction remains cheap.

*Justification.* Convexity with $g(0) = 0$ makes $g(x)/x$ non-decreasing, and $r\,g(v/r) = v \cdot g(v/r)/(v/r)$; (b) is immediate. Undetected shortfalls in rate also grow, and early detection of drift is the rationale of statistical process control (Shewhart 1931).

*Scope.* Linear cost gives (a) with equality. Unreported re-baselining makes measured variance zero by construction.

The burn-down detects variance within an engagement while it is recoverable; the calibration record shows, across engagements, whether persistent variance reflects forecasting bias or execution shortfall.

## 6. Limitations

1. *Functional layers.* Latency magnitudes are indicative for human agents, and assigning processes to layers is a measurement question with boundary cases.
2. *Argued, not established.* Propositions 3, 9 and 18 have elementary derivations; the rest are scoped arguments, none tested. Calibration differences are established only for human forecasters (Tetlock 2005), and no records for software executing parties are presented.
3. *Institutional preconditions.* Propositions 8–11 presuppose aligned certifiers, public registers and published revocation, yet certifiers may rationally disclose little (Lizzeri 1999); the architecture relocates reliance to the certifier, and only restricted transitivity is claimed (Jøsang and Pope 2005).
4. *Incomplete specifications.* Measured items draw effort from unmeasured ones (Holmström and Milgrom 1991), and measures used as targets degrade (Manheim and Garrabrant 2018), burn-downs included. The architecture trades completeness for objectivity without resolving the trade-off.
5. *Self-influenced forecasts.* Because issuers influence realisations (Proposition 12(d)), records conflate forecasting with execution, and propriety does not ensure honest reporting. Renewal needs feedback institutions that may be absent, and Proposition 13(c) assumes risk neutrality.
6. *Idealisations.* Desireless execution is a design target for learning systems, independent adjudication fails where agents verify same-family agents (Panickssery et al. 2024), Proposition 17 is confined to the zero-slack set and Proposition 18(a) assumes convex compression cost.
7. *Coverage.* One adjudication boundary is treated; queueing theory and work on self-influencing forecasts are not reviewed.

## 7. Conclusion

On this account, capability belongs to an arrangement of external production, adjudication and compilation, with external latency confined to preparation. Reliance on executing parties that cannot be inspected requires public certification chains and desireless execution, and leaves obligations fixed while their value depends on every attestation. The forecast is the quantity on which every exposure depends; once relied upon, it fixes a schedule whose elapsed lateness cannot be recovered, so conformance is tested continuously against the forecast and terminally against the specification. Scored forecast records for software executing parties are the open empirical programme.

*Acknowledgement.* Sections 4.3 and 5 follow formulations by Casey of SuperInstance.

## References

*Only works whose bibliographic records were verified in the research stage are cited.*

Akerlof, G.A. (1970) 'The market for "lemons": quality uncertainty and the market mechanism', *The Quarterly Journal of Economics*, 84(3), pp. 488–500.

Aumann, R.J. (1976) 'Agreeing to disagree', *The Annals of Statistics*, 4(6), pp. 1236–1239.

Bainbridge, L. (1983) 'Ironies of automation', *Automatica*, 19(6), pp. 775–779.

Birkholz, H., Thaler, D., Richardson, M., Smith, N. and Pan, W. (2023) *Remote ATtestation procedureS (RATS) Architecture*. RFC 9334. Internet Engineering Task Force.

Brier, G.W. (1950) 'Verification of forecasts expressed in terms of probability', *Monthly Weather Review*, 78(1), pp. 1–3.

Clark, A. and Chalmers, D. (1998) 'The extended mind', *Analysis*, 58(1), pp. 7–19.

Cooper, D., Santesson, S., Farrell, S., Boeyen, S., Housley, R. and Polk, W. (2008) *Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile*. RFC 5280. Internet Engineering Task Force.

Debenedetti, E., Shumailov, I., Fan, T., Hayes, J., Carlini, N. et al. (2025) 'Defeating prompt injections by design', arXiv:2503.18813.

Dennis, J.B. and Van Horn, E.C. (1966) 'Programming semantics for multiprogrammed computations', *Communications of the ACM*, 9(3), pp. 143–155.

Ericsson, K.A., Krampe, R.T. and Tesch-Römer, C. (1993) 'The role of deliberate practice in the acquisition of expert performance', *Psychological Review*, 100(3), pp. 363–406.

Evans, J.St.B.T. and Stanovich, K.E. (2013) 'Dual-process theories of higher cognition: advancing the debate', *Perspectives on Psychological Science*, 8(3), pp. 223–241.

Fleming, Q.W. and Koppelman, J.M. (2010) *Earned Value Project Management*. 4th edn. Newtown Square, PA: Project Management Institute.

Flyvbjerg, B. (2006) 'From Nobel Prize to project management: getting risks right', *Project Management Journal*, 37(3), pp. 5–15.

GAO (2020) *Cost Estimating and Assessment Guide: Best Practices for Developing and Managing Program Costs*. GAO-20-195G. Washington, DC: US Government Accountability Office.

Giuffrida, L.M. and Rovigatti, G. (2022) 'Supplier selection and contract enforcement: evidence from performance bonding', *Journal of Economics & Management Strategy*, 31(4), pp. 980–1019.

Gneiting, T. and Raftery, A.E. (2007) 'Strictly proper scoring rules, prediction, and estimation', *Journal of the American Statistical Association*, 102(477), pp. 359–378.

Goetz, C.J. and Scott, R.E. (1977) 'Liquidated damages, penalties and the just compensation principle: some notes on an enforcement model and a theory of efficient breach', *Columbia Law Review*, 77(4), pp. 554ff.

Hoare, C.A.R. (1969) 'An axiomatic basis for computer programming', *Communications of the ACM*, 12(10), pp. 576–580.

Holmström, B. (1979) 'Moral hazard and observability', *The Bell Journal of Economics*, 10(1), pp. 74–91.

Holmström, B. and Milgrom, P. (1991) 'Multitask principal–agent analyses: incentive contracts, asset ownership, and job design', *Journal of Law, Economics, and Organization*, 7, pp. 24–52.

Hutchins, E. (1995) *Cognition in the Wild*. Cambridge, MA: MIT Press.

ISO/IEC 17020:2012 *Conformity assessment – Requirements for the operation of various types of bodies performing inspection*. Geneva: International Organization for Standardization.

ISO/IEC 17021-1:2015 *Conformity assessment – Requirements for bodies providing audit and certification of management systems – Part 1: Requirements*. Geneva: International Organization for Standardization.

Jensen, M.C. and Meckling, W.H. (1976) 'Theory of the firm: managerial behavior, agency costs and ownership structure', *Journal of Financial Economics*, 3(4), pp. 305–360.

Jøsang, A. and Pope, S. (2005) 'Semantic constraints for trust transitivity', in *Proceedings of the Second Asia-Pacific Conference on Conceptual Modelling (APCCM 2005)*. Sydney: Australian Computer Society, pp. 59–68.

Kahneman, D. and Klein, G. (2009) 'Conditions for intuitive expertise: a failure to disagree', *American Psychologist*, 64(6), pp. 515–526.

Kahneman, D. and Tversky, A. (1973) 'On the psychology of prediction', *Psychological Review*, 80(4), pp. 237–251.

Kelley, J.E. and Walker, M.R. (1959) 'Critical-path planning and scheduling', in *Proceedings of the Eastern Joint Computer Conference*, pp. 160–173.

Kent, K., Chevalier, S., Grance, T. and Dang, H. (2006) *Guide to Integrating Forensic Techniques into Incident Response*. NIST Special Publication 800-86. Gaithersburg, MD: National Institute of Standards and Technology.

Klein, B. and Leffler, K.B. (1981) 'The role of market forces in assuring contractual performance', *Journal of Political Economy*, 89(4), pp. 615–641.

Lizzeri, A. (1999) 'Information revelation and certification intermediaries', *The RAND Journal of Economics*, 30(2), pp. 214–231.

Malcolm, D.G., Roseboom, J.H., Clark, C.E. and Fazar, W. (1959) 'Application of a technique for research and development program evaluation', *Operations Research*, 7(5), pp. 646–669.

Manheim, D. and Garrabrant, S. (2018) 'Categorizing variants of Goodhart's law', arXiv:1803.04585.

Miller, M.S. (2006) *Robust Composition: Towards a Unified Approach to Access Control and Concurrency Control*. PhD thesis. Johns Hopkins University.

Murphy, A.H. (1973) 'A new vector partition of the probability score', *Journal of Applied Meteorology*, 12(4), pp. 595–600.

Murphy, A.H. and Winkler, R.L. (1977) 'Reliability of subjective probability forecasts of precipitation and temperature', *Journal of the Royal Statistical Society, Series C (Applied Statistics)*, 26(1), pp. 41–47.

Panickssery, A., Bowman, S.R. and Feng, S. (2024) 'LLM evaluators recognize and favor their own generations', arXiv:2404.13076.

Parasuraman, R. and Manzey, D.H. (2010) 'Complacency and bias in human use of automation: an attentional integration', *Human Factors*, 52(3), pp. 381–410.

Parasuraman, R., Sheridan, T.B. and Wickens, C.D. (2000) 'A model for types and levels of human interaction with automation', *IEEE Transactions on Systems, Man, and Cybernetics – Part A: Systems and Humans*, 30(3), pp. 286–297.

Parnas, D.L. (1972) 'On the criteria to be used in decomposing systems into modules', *Communications of the ACM*, 15(12), pp. 1053–1058.

Risko, E.F. and Gilbert, S.J. (2016) 'Cognitive offloading', *Trends in Cognitive Sciences*, 20(9), pp. 676–688.

Saltzer, J.H. and Schroeder, M.D. (1975) 'The protection of information in computer systems', *Proceedings of the IEEE*, 63(9), pp. 1278–1308.

Shewhart, W.A. (1931) *Economic Control of Quality of Manufactured Product*. New York: D. Van Nostrand.

Simon, H.A. (1955) 'A behavioral model of rational choice', *The Quarterly Journal of Economics*, 69(1), pp. 99–118.

Simon, H.A. (1962) 'The architecture of complexity', *Proceedings of the American Philosophical Society*, 106(6), pp. 467–482.

Spence, M. (1973) 'Job market signaling', *The Quarterly Journal of Economics*, 87(3), pp. 355–374.

Stanovich, K.E. (2011) *Rationality and the Reflective Mind*. New York: Oxford University Press.

Stanovich, K.E. and West, R.F. (2000) 'Individual differences in reasoning: implications for the rationality debate?', *Behavioral and Brain Sciences*, 23(5), pp. 645–665.

Stiglitz, J.E. and Weiss, A. (1981) 'Credit rationing in markets with imperfect information', *The American Economic Review*, 71(3), pp. 393–410.

SuperInstance (2026) 'System Three'. Unpublished working note.

Tetlock, P.E. (2005) *Expert Political Judgment: How Good Is It? How Can We Know?* Princeton, NJ: Princeton University Press.

# Adversarial review of *System Three: External Processing, Attestation Chains and the Forecast as Predictive Attestation*

**Reviewer:** Kimi Code seat (Moonshot AI), acting as hostile but fair examiner.
**Date:** 27 October 2026.
**Materials reviewed:** `FORMAL-PAPER.md` (full), `system-three.md` (full, as the seed under formalisation), `zcode-pack.md` and `mcode-pack.md` (full, for citation spot-checks).

---

## Overall verdict

This is a competent, honest and largely sound piece of formalisation, and it survives the two checks most papers of this kind fail: it is genuinely free of the seed's figurative machinery, and its bibliography contains no unverified source presented as established. The prose discipline is exceptional — every proposition carries an explicit justification and scope, and the Limitations section concedes nearly every objection I came to raise. Against that, the paper has one real validity gap (Proposition 15, which identifies commitment items with predictive attestations on no definitional warrant), one over-strong necessity claim (Proposition 11), a stipulation presented as a derived result (Proposition 16, where "conforming" silently changes sense), and a cluster of terminological defects: "appraisal" and "conformity record" are used as technical terms without ever being defined, the "collateralisation" of Def. 16(iv) names a forfeiture mechanism the paper never specifies, and Proposition 2's exception stands in an unstated relation to the fixed-function carve-out of Definition 6. None of these is fatal; all are repairable in one revision. I recommend **accept with mandatory revisions** (revise and resubmit). The required elements — the predictive attestation and the debt consequence — are both present as first-class formal components, one fully and one with a partial articulation.

---

## Findings

### F1 — "Appraisal" is an undefined technical term, used interchangeably with the defined "adjudication". *Severity: should-fix.*

Definition 4 defines System 2's evaluation function as *adjudication* ("accepts, rejects or edits"). Yet the paper repeatedly uses a different word for the same activity, never defining it:

- Def. 3 (line 35): "its *motor-execution sub-layer* initiates action before **appraisal** can complete";
- Def. 5 (line 39): "**Aim of appraisal.** The aim of a System 2 process is its beneficiary…";
- Prop. 7 (line 95): "It makes **appraisal** with aim (iii) of Definition 5 possible".

A third near-synonym, *verification*, is used for specification-conformance checking (Prop. 5 "is verified once against its contract"; Prop. 7 "Verifying checkable items"; Prop. 8 "Diligence then reduces to validating chains") and for chain validation. Whether appraisal, adjudication and verification are one function, two, or three is never stated; an examiner cannot tell whether Prop. 7's "appraisal with aim (iii)" is System 2 adjudication or a distinct terminal-verification step, and the answer matters for whether Prop. 7's "exhaustive" claim is a psychological claim about System 2 or a mechanical claim about list comparison.

*Repair:* either define *appraisal* as a term (if it is broader than adjudication, say how), or replace all occurrences with *adjudication*; and state once, in Def. 10 or Prop. 7, that verification of checkable items is the fixed-function limit of adjudication.

### F2 — "Conformity record" is never defined; "calibration record" is used before its definition. *Severity: should-fix.*

Def. 14 (line 105) defines certified standing as "the register entry (certification, **conformity record** and **calibration record**)". At this point neither component record exists in the paper: *calibration record* is defined only at Def. 17 (line 139), and *conformity record* is **never defined anywhere** — it reappears without comment in Prop. 14 (line 153, "unlike the conformity record, calibration is identifiable only over a sequence"). Def. 14 also calls certified standing "an asset", a status the term never acquires beyond assertion (see F6). Use-before-definition in a definitional chain is a first-order defect in a paper whose contribution is the definitions.

*Repair:* define both records at Def. 14 (a conformity record is the sequence of terminal-verification findings across engagements; a calibration record is forward-referenced to Def. 17), and note explicitly that Def. 14's mention is a forward reference.

### F3 — Definition 10 is internally inconsistent about what an item states. *Severity: should-fix.*

Def. 10 (line 89): "a specification is a finite list of items … **each stating a required closing state**. Items are *checkable* …, *uncheckable*, or *commitment items* (**stating what must be provided for a later engagement**)." A commitment item does not state a closing state; it states a provision obligation pointing at a future engagement. The definiens is false of one of the three item types the same sentence introduces. This matters beyond tidiness because Prop. 15's entire argument turns on commitment items having the logical form they cannot have under the stated definiens (see F5).

*Repair:* "each stating a required closing state, except commitment items, which state a provision required for a later engagement" — or demote "closing state" from the definition to a clause covering checkable and uncheckable items only.

### F4 — Proposition 16 shifts the sense of "conforming" and presents a stipulation as a result. *Severity: should-fix.*

Prop. 16 (line 173): "a forecast-denominated obligation **discharged to specification but after its due time is a non-conforming discharge**: execution is the discharge of a schedule fixed by the executing party's own forecast." But Def. 10 and Prop. 7 fix conformance as a relation between realised state and pre-registered specification items; a discharge that meets every item is conforming by definition, however late. The paper's own two-test doctrine (Prop. 18) then insists terminal conformance and forecast conformance are *different tests, neither substituting for the other* — which is exactly right, and exactly what Prop. 16 contradicts by calling a spec-conforming late discharge "non-conforming". The proposition also does no derivational work: its scope, "Obligations whose terms the forecast fixed" (line 177), restates Def. 18, so the "proposition" is a definition plus a terminological ruling.

*Repair:* introduce a second, explicit predicate — e.g. *specification-conforming* versus *schedule-conforming* — and restate Prop. 16 as "a forecast-denominated obligation that is specification-conforming but late is not schedule-conforming", which is true by construction and consistent with Prop. 18.

### F5 — Proposition 15 asserts an identity the definitions do not support. *Severity: should-fix.*

Prop. 15 (line 159): "A commitment item's object belongs to a later engagement, where it is scored rather than compared, so the item **is a predictive attestation nested in the specification**." The inference fails. A predictive attestation (Def. 16) must comprise (i) point values and intervals at stated probabilities, (ii) the predictive distribution, (iii) a specification reference, and (iv) an undertaking with the certifier. A commitment item (Def. 10) is merely a statement of "what must be provided for a later engagement" — it need have none of (i)–(iv). From "the object is future and will be scored" it does not follow that the item is a Def.-16 attestation; at most it follows that such items are *assessed in a future engagement*. The corollary (b) is worse: "each terminal verification **issues the forecast** on which the next engagement's obligations rest" is asserted, not derived — nothing in Defs. 10, 16 or 18 says that terminal verification issues anything, and Prop. 14's renewal mechanism presumes the issuer, not the verifier, issues forecasts. This proposition is load-bearing for §5's extension of obligations across engagements, so the gap propagates.

*Repair:* either strengthen Def. 10 so that commitment items are required to contain the Def.-16 components (probabilities, distribution, undertaking), in which case Prop. 15 follows; or weaken Prop. 15 to a conditional: "a commitment item that takes the form of Def. 16 is a predictive attestation nested in the specification". The mcode pack (Part C3) reaches the same disjunction.

### F6 — "Collateralises" names a forfeiture mechanism the paper never defines. *Severity: should-fix.*

Def. 16, closing sentence (line 137): "By (iv) the issuer **pledges its certified standing as security** for the forecast: it **collateralises** its standing on the outcome." The only mechanism defined anywhere is that the calibration record is updated with the score (Def. 16(iv); Def. 17; Prop. 14: standing "moves up or down"). No forfeiture event, no counterparty to whom standing is posted, no margin, no trigger beyond a score entry is specified. What the paper actually defines is a reputation mechanism in the Klein–Leffler (1981) sense, which the paper itself cites — reputation is not collateral, and calling it collateralised asserts a stronger institution (Russell 2000 and Giuffrida–Rovigatti 2022, both verified in the packs, describe what real collateralisation of standing looks like). Since "collateralised on the outcome" is one of the mandated elements, the concept must be made precise rather than borrowed.

*Repair:* define the consequence concretely — e.g. "the issuer's certified standing is reduced by a function of the score, at rates fixed in the standing specification, and the reduction is public and effective at the next engagement" — or replace "collateralises/pledges/security" with "stakes", which is exact for a record-based reputation mechanism.

### F7 — Proposition 2's exception is unscoped and its relation to Definition 6's carve-out is unstated. *Severity: should-fix.*

Prop. 2 (line 53): output of a delegated reflective resource "should not drive the motor-execution sub-layer unadjudicated, **except under a pre-registered exception bounded by a mechanically checkable specification**." The scope note then concedes "No general boundary for the exception is supplied" (line 57). Meanwhile Def. 6 (line 41) already allows fixed-function resources to be "adjudicated per output or, **for fixed-function resources, once per contract**", and Prop. 5 says a fixed-function resource "is verified once against its contract". It is never stated whether the fixed-function once-per-contract regime is an instance of Prop. 2's "pre-registered exception" or a separate category — and the two are not the same shape (one turns on the resource's *type*, the other on a *pre-registered, mechanically checkable bound*). As written, the mediation condition has two exceptions with no stated relation, and the delegated-resource exception that Prop. 2 actually governs is left entirely open.

*Repair:* state explicitly that the fixed-function carve-out is (or is not) the sole instance of the Prop.-2 exception, and give the exception a minimal scope condition (registration before reliance; bound mechanically checkable by the boundary adjudicator; lapse on any change of contract).

### F8 — Proposition 11 overclaims: necessity is argued, not established, and alternatives are not excluded. *Severity: should-fix.*

Prop. 11 (line 127): "Unless conformance is fully observable, reliance by parties who cannot inspect an executing party **requires** desireless execution." The justification — residual preference "invites deviation on the least observable, hence least priceable, items (Jensen and Meckling 1976; Holmström 1979)" — establishes that unaligned preference is costly under imperfect observation, not that desirelessness is *necessary*. The cited literature itself supplies the alternatives the proposition must exclude: monitoring (Holmström's informativeness principle), bonding expenditures, contingent contracts (Prop. 10's own subject) and repeated-game discipline. The proposition's own scope already concedes a failure case (final engagements), which is a fortiori evidence that reliance is possible without desireless execution wherever the engagement is one-shot — precisely the case the architecture is meant for. As scoped, the proposition is false as stated ("requires") and true only in the weakened form "desireless execution is one sufficient arrangement".

*Repair:* downgrade to sufficiency, or add the argument excluding monitoring/contingent-contract alternatives (e.g. their cost exceeds the standing mechanism's where conformance is only interface-observable).

### F9 — Proposition 9: "no bound remains" is technically wrong. *Severity: minor.*

Prop. 9 (line 115): "A claim relayed without its receipt adds an attestation of unknown $p_k$, and **no bound remains**." The conjunction bound of the proposition's first clause is monotonic in the known conjuncts: $P(\cap_k A_k) \le \min_{k \in K}(1-p_k)$ over the *known* links still holds, since the conjunction is contained in every known conjunct. What fails is a positive *reliability* bound and any bound tighter than the weakest known link; the statement as written overclaims.

*Repair:* "the bound reduces to that of the weakest known link and can no longer be tightened; if the unknown link may fail with probability one, no positive reliability bound remains."

### F10 — Proposition 10 is near-tautological as scoped. *Severity: minor.*

Prop. 10 (line 121): a relying party's obligation "is invariant under any later lapse, revocation or counterfeit of an attestation … **unless made contingent by contract**", with scope "Non-contingent obligations" (line 125). The scope restates the antecedent of the claim: for obligations whose terms do not refer to attestation validity, invariance under attestation validity follows from the meaning of "terms". The proposition does work only if non-contingency is shown to be the default in actual reliance practice, which is not argued. The economic content (loss falls on the relying party; checks are the only contract-free protection) is real but lives in the justification, not the proposition.

*Repair:* either argue that reliance commitments are by default non-contingent, or restate as a classification: obligations split into non-contingent (invariant, relying party bears the loss) and contingent (asymmetric loss reduced to the extent of contingency).

### F11 — Proposition 13's formal content is thinner than its conclusion, and "shortfall" is undefined. *Severity: minor.*

Prop. 13 (line 147): "shortfalls depend on the forecast error $Q-\hat Q$" — but *shortfall* is never defined (the model defines only exposures $x_k=\phi_k(\hat Q)$; a shortfall would be something like $\phi_k(Q)-\phi_k(\hat Q)$, which never appears). Clause (b), "one forecast error misstates all exposures at once and in the same direction, so it **cannot be offset among the parties**", is true only by construction: the model contains no party holding an offsetting position, so the impossibility of offset is assumed, not shown. The conclusion — "Estimation accuracy is therefore the quantity on which every exposure in the chain jointly depends" — is plausible and honestly scoped, but the mcode pack (Part B) supplies a strictly stronger and still elementary result (the exposure-error construction $\phi(F)-E(x)$ with its sign tied to miscalibration) that would close both gaps at a stroke. Not using it looks like a missed opportunity in a paper whose stated contribution includes this proposition.

*Repair:* define exposure error formally (the pack's $\phi(F)-E(x)$ or equivalent), and soften (b) to "in this construction no party holds an offsetting position, so the error is borne jointly".

### F12 — Dangling and informal terms. *Severity: minor.*

Four smaller terminological items: (i) *calibration standing* appears as a term of art in the title of Prop. 14 (line 153) but is never defined as a component of certified standing (Def. 14 defines only the whole register entry); (ii) *financing party* is named in Def. 9 ("any financing party") and again in Def. 15 ("a financing party's authorisation") but is never given a definition, a function, or another use; (iii) *dependency network* (Def. 19, line 169) and *slack* (Prop. 1, line 47) are used without definition, though both are recoverable from context; (iv) Def. 6's parenthetical "(Proposition 1)" makes a definition depend on a proposition — definitions should be self-contained, with the proposition as support, not as constituent. Each is individually forgivable; jointly they erode the "defined before use" discipline the paper claims for itself (line 13).

*Repair:* define calibration standing at Def. 14 or 17; either give the financing party one sentence of role or delete it; gloss dependency network and slack at first use; move the Prop.-1 dependence out of Def. 6 into its justification.

### F13 — Proposition 1's justification cites near-decomposability for a claim it does not entail. *Severity: minor.*

Prop. 1's justification (line 49): "Serial response time is the sum of stage latencies, and a stage completed in advance contributes nothing; the separation instantiates near-decomposability (Simon 1962)." Near-decomposability (Simon 1962) is a claim about the *frequency and density of interactions* within and between subsystems, not about the serial additivity of stage latencies; Simon (1962) does not entail the additive stage model the proposition uses. The proposition is true under its stated seriality assumption — which belongs in the antecedent or scope, not in a citation to the wrong theorem.

*Repair:* state "under serial composition of stage latencies" as an explicit assumption in the proposition or its scope, and cite Simon 1962 only for the prepare/release separation, where it does apply.

### F14 — Two citation notes (one favourable, one cautionary). *Severity: minor.*

(i) Goetz and Scott (1977) is cited as "*Columbia Law Review*, 77(4), pp. 554ff." (line 245). The zcode pack verified title, authors, venue, year and first page but flagged the full page range as "from memory — confirm" (RP-47); "554ff" is an honest handling, though the confirmation remains outstanding. (ii) The paper nowhere cites Chalmers (2010), which both packs recommended for the unit-of-analysis framing of the seed's superintelligence claim; the Conclusion (line 205, "capability belongs to an arrangement") gestures at that claim without citation or engagement. Dropping the seed's headline framing is a defensible editorial choice, but the choice should be signalled — one sentence in the Limitations — rather than silently executed.

---

## Required elements (mandate check)

**(a) The estimate as predictive attestation — PRESENT (one caveat).**
- Quantified forecast issued pre-engagement: **present** — Def. 16(i)–(ii), "issued by the executing party before an engagement, under uncertainty".
- Issuer's standing collateralised on the outcome: **present in form, defective in mechanism** — Def. 16(iv); see F6 for the unspecified forfeiture mechanism.
- Calibration history as a renewable component of certification: **present** — Def. 17 and Prop. 14 ("degraded standing can be restored by later calibrated forecasts"), with the proper scope caveat (Flyvbjerg bias) attached.
- Relying parties' exposure sized by the forecast: **present** — Prop. 13, $x_k=\phi_k(\hat Q)$, non-decreasing in the forecast.

**(b) The debt consequence — PRESENT IN SUBSTANCE, PARTIAL IN ARTICULATION.**
- Obligations denominated against the forecast: **present** — Def. 18 (forecast-denominated obligation, discharge schedule).
- Execution as repayment: **partial** — Prop. 16 has "execution is the discharge of a schedule fixed by the executing party's own forecast"; the paper deliberately renders the seed's debt figure as *discharge* (a term of art in obligation law) and never develops the repayment structure the mandate names. The schedule is there; the repayment semantics (what is being paid down, to whom, in what units) is not.
- Late discharge as interest in time: **partial** — the substance survives as Def. 19 ("The delay cost … accrues while an obligation is overdue", $C=\sum_i w_iL_i$) and Prop. 17 ("delay cost is borne by dependent parties in elapsed time"); the linear accrual in elapsed time is exactly simple-interest semantics, but the paper never says so or connects it to the denomination of obligations, and the word *interest* appears nowhere.
- Continuous realised-against-forecast conformance test: **present and strong** — Def. 20 (continuous, timely, baseline-fixed burn-down) and Prop. 18, which is the paper's one genuinely proved result; I re-derived the convexity argument ($r\,g(v/r) = v\cdot g(v/r)/(v/r)$, with $g(x)/x$ non-decreasing for convex $g$ vanishing at 0, hence recovery cost non-increasing in remaining duration $r$; infeasibility at $r<v/\kappa$) and it is correct as stated.

## Citation spot-check against the research packs

The References claim (line 211, "Only works whose bibliographic records were verified in the research stage are cited") **survives the spot-check**. Every work cited is VERIFIED in at least one pack, and the packs' UNVERIFIED items — Kahneman (2011), Meyer (1997), Greif and Laitin (2004), Clark (1993), Leland and Pyle (1977), ANSI/NECA 914-2012 — are correctly absent from the paper. The two venue corrections locked in during verification were propagated correctly: Flyvbjerg (2006) appears in *Project Management Journal* 37(3), 5–15, not the commonly miscited *International Journal of Project Management*; Murphy and Winkler (1977) appears in *JRSS-C (Applied Statistics)* 26(1), 41–47, not JASA. The Saltzer and Schroeder (1975) page range (1278–1308) follows the mcode pack's verification; note the zcode pack had a different, from-memory range (209–229) that should be disregarded. **One discrepancy to record for the record:** the zcode pack (RP-33) lists the authors of RFC 9334 as "Birkel, R., Wheeler, D. W., Panwei, L., & Eckel, M."; the paper cites "Birkholz, H., Thaler, D., Richardson, M., Smith, N. and Pan, W." I verified against the RFC Editor's own record that the paper's author list is correct and the zcode pack's entry is corrupted despite its VERIFIED flag. This is not a defect in the paper.

## Metaphor-leakage check

I searched the paper systematically for the seed's entire figurative inventory (boat, house, captain, contractor, paint, walls, fish, crew, voyage, dock, building, homeowner, loan, debt, bank, repayment, keys, stud, swamp figures) and for stray similes. **The paper is clean.** The worked example of Def. 10 is the correct literalisation of the seed's four-line specification ("condition of personnel; condition of equipment; quantity of output; resources to be replenished before the next engagement"); the debt figure is rendered as discharge schedule, denomination and delay cost, which are the technical terms of obligation and scheduling rather than smuggled figures. Two borderline items deserve mention, neither of which I class as leakage: "pledges/collateralises/security" for standing (defective as terminology, F6, but intended literally, not figuratively) and "burn-down" (a defined term of art from project practice, Def. 20). No finding.

---

## What survives my review unchanged

1. **The de-metaphorisation in full** — including the refusal to import the seed's captain/contractor/homeowner figures even where the seed's own text invited them (Def. 10's example; Prop. 16's "discharge").
2. **Definitions 1–9, 11–13, 16–20** (subject to F2, F3, F6, F12 repairs being applied to their wording — their content stands): the three-layer arrangement by locus, latency and function; the mediation condition; desireless execution; demarcation; attestation, receipt, certification, chain.
3. **Proposition 3** (relay error and independent adjudication) — the probability content is correct and the scope honestly flags the independence failure (Panickssery et al. 2024) and the volume conjecture.
4. **Proposition 7**, with its scope — the exhaustiveness claim is true of checkable items under bounded per-item cost, and the scope concedes both limits (conformance does not show the specification states the interest; measurable items divert effort).
5. **Proposition 9's mathematics** (conjunction bounded by the least probable conjunct; product form under independence), subject only to the F9 wording repair.
6. **Proposition 12**, including its scope — the four respects are correctly derived, and the propriety caveat (self-influencing forecasts conflate forecasting with execution) is exactly the right admission, placed exactly where it belongs.
7. **Proposition 14's renewal claim and its scope** (optimism bias exposed but not removed by scoring; correction requires reference-class forecasting).
8. **Propositions 17 and 18** — the zero-slack argument and the convex-compression derivation are correct within their stated scopes, and Prop. 18 is the paper's strongest result; the two-test conclusion genuinely follows.
9. **The scope discipline in general** — every numbered proposition states a justification and a scope, several scopes concede exactly the cases that would falsify the claim (Prop. 8's certifier-incentive failure; Prop. 11's final-engagement failure; Prop. 12's propriety failure; Prop. 13's risk-aversion reversal), and the Limitations section (§6) is a model of the genre, conceding argued-not-established status, absent empirical grounding and the Goodhart exposure of burn-downs.
10. **The citation apparatus** — the verified-only claim is accurate, both venue corrections are propagated, and no pack-flagged UNVERIFIED source is cited as established.

*End of review.*

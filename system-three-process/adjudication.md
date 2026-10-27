# Adjudication: System Three formal paper, stage 2

**Seat:** Claude Code (Anthropic). **Date:** 27 October 2026.
**Inputs, read in full:** `stage2/system-three.md` (seed), `stage2/zcode-pack.md`, `stage2/mcode-pack.md`, `stage2/zcode-outline.md`, `stage2/mcode-outline.md`. None was modified.
**Output:** `FORMAL-PAPER.md` (this directory).

**Notation.** `ZC-D4`, `ZC-P12` = numbered items in the ZCode outline (D1–D18, P1–P15). `MM-D7b`, `MM-P22` = numbered items in the MiniMax Code outline (D1–D21, P1–P22). `Def n` and `Prop n` = the paper's final numbering (Definitions 1–20, Propositions 1–18).

---

## 1. Verdict

**The ZCode outline is the spine.** The MiniMax outline loses the spine but supplies most of the substance of the paper's §4.3 and §5, most of its scope conditions and much of its Limitations section. Measured by provenance, the paper is close to an even merger. Measured by structure (section order, definitional skeleton, register discipline), it is ZCode's.

Reasons, against the three criteria set:

1. **Formal rigour.** The brief requires Systems 1–3 to be defined operationally by latency, locus and function. ZC-D1, D2, D3 and D5 each give a latency range, a locus and an operational test (for example ZC-D2: "output is produced without serial working-memory load; any verbal justification is constructed after output"). MM-D3, D4 and D5 give only qualitative latency profiles ("concentrated at reaction timescales", "broad and budget-constrained"). ZCode also builds the mediation condition into the definition of System 3 (ZC-D5); MiniMax leaves it to a normative proposition (MM-P4). ZCode's propositions contain several overclaims (listed in §3 below), but each can be fixed by rewording. MiniMax's defects are structural: its numbering and ordering are out of sequence, so they cannot be fixed without rebuilding the outline.
2. **Completeness.** ZCode defines every mechanism in the first half of the seed: the preparation/operating partition (ZC-D8), compilation (ZC-D9), the aim of appraisal (ZC-D4), the two kinds of System 3 and their verification consequences (ZC-D6, D7, P13), the fallback path (ZC-P14) and ledger discipline (ZC-P15). MiniMax goes deeper on the second half (the estimate and the obligations that follow from it) but has no definition of compilation or of the preparation interval. A spine has to carry the whole argument, and the missing depth can be imported (§2 below).
3. **Zero metaphor.** ZCode's §0 table covers every figure in the seed, including the debt/interest vocabulary, which it bans and replaces with "delay cost accruing on zero-slack obligations". MiniMax keeps figurative financial vocabulary as defined terms of the paper ("repayment schedule", MM-D18; "interest paid in time", MM-D17). Its table leaves five seed figures (voyage, dock, crew, fish, boat) marked "(no literal counterpart)", and it uses a gendered pronoun for the supervisory party.

**Ordering.** MiniMax places specification-as-test (MM-P11) in §7, after the burn-down requirement (MM-P18) that presupposes it. ZCode orders by dependency: layers, then specification, then the attestation genus, then the predictive attestation, then continuous conformance. The paper keeps ZCode's order.

---

## 2. What the paper takes from the MiniMax outline

| MiniMax item | Use in the paper |
|---|---|
| MM-D1 (engagement as a bounded unit of delegated work) | Def 9. Used to separate the contractual sense of "engagement" from the deadline sense (Def 2); see §4, decision 3. |
| MM-D2 (layer as the triple locus / latency profile / function) | Def 1. |
| MM-D3a (motor-execution sub-layer as its own locus of latency) | Def 3, second sentence; target of Prop 2. |
| MM-D4 (aim of System 2 as a parameter) | Def 5, merged with ZC-D4. |
| MM-D7 (checkable vs uncheckable items) + MM-D7b (commitment item) | Def 10. |
| MM-D8 / D8a / D8b (attestation genus with receipt and predictive species) | Def 13 (genus and receipt) and Def 16 (forward species). This is the placement Casey asked for. |
| MM-D9 (certification as reusable and third-party checkable) + MM-P6(iii) (revocability) | Def 14 and condition (iv) of Prop 8. |
| MM-D10 (four-component predictive attestation) | Def 16(i)–(iv), structure kept whole. Component (iv) is what makes "collateralises" literal. |
| MM-D12 (calibration belongs to the procedure, not to one forecast) | Def 17. |
| MM-D13 (standing has two components: conformity and calibration) | Def 14 ("certified standing" = certification + conformity record + calibration record) and Prop 14. MM-D13's claim that conformity standing is "not renewable within a single engagement" is **not** adopted; the paper separates the two components by identifiability instead (determinate findings vs a sequence-level statistic). |
| MM-D14(i) (performing and attesting held by different parties) | Def 12(d). |
| MM-D15 (finite path ending at an unattested root) | Def 15 ("root issuer"). |
| MM-D16 (burn-down: continuity + timeliness) + MM-P18's ban on re-baselining | Def 20 (continuous, timely, baseline-fixed) and the scope of Prop 18. |
| MM-D17, MM-D18 (interest paid in time; forecast-denominated obligation; repayment schedule) | Def 18 and Def 19, restated literally (discharge schedule; lateness; delay cost); see §4, decision 9. |
| MM-D19 (boundary function) | Def 4, last sentence ("boundary adjudicator"). |
| MM-P2 (latency is irrelevant off the critical path; the asymmetry belongs to the deadline structure) | Merged with a corrected ZC-P1 into Prop 1. |
| MM-P3 (distillation, with a cited mechanism) | Justification and scope of Prop 4. |
| MM-P4 (mediation requirement, pre-registered exception, no principled boundary) | Prop 2, including its scope ("no general boundary for the exception is supplied"). |
| MM-P5 (delegated appraisal requires independence; self-preference evidence) + MM-P19 (relay scale as a conjecture, with its measurement) | Scope of Prop 3; Limitation 6. |
| MM-P7 (inference-level reading of chain failure; the counter-position) | Scope of Prop 9. |
| MM-P8 (accountability runs to the certifier; degenerate when the desiring party sets the code) | Justification and scope of Prop 11. |
| MM-P10 (necessary, not sufficient; "indifference is not honesty") | Scope of Prop 11. |
| MM-P11 + MM-P12 (spec-as-test only for checkable items; the specification may be the wrong one; measurement distortion is a structural cost) | Prop 7 and its scope; Limitation 4. |
| MM-P13 (a distinct instrument; the distinction dissolves if the forecast is never scored) | Prop 12(a)–(b) and its last scope sentence. |
| MM-P14 (renewal conditional on feedback, representativeness and issuer influence) | Prop 14. Issuer influence is promoted to Prop 12(d); see §4, decision 6. |
| MM-P15 (exposure-sizing result; sound execution with biased forecasting harms the relying party; boundary under risk aversion) | Prop 13(a) and (c), with its scope. |
| MM-P16, MM-P17, MM-P18 | Props 16, 17, 18. |
| MM-P20 (degradation without the external layer) | Prop 6(b). |
| MM-P22 (commitment item as a nested predictive attestation; obligations recur across periods; a miss is scored twice) | Prop 15, marked as the paper's own generalisation, with GAO-20-195G as the local instance. This is the link between Casey's two required elements and is the best original idea in either outline. |
| MiniMax pack C2.3 (burn-down detects, calibration record diagnoses) | Closing paragraph of §5. |
| MiniMax Limitations 2–6, 9, 10 | Limitations 2, 4, 5, 6. |
| MiniMax outline §6 (which claims rest on a citation and which are the paper's own) | Used as the discipline for when to cite and when to argue. |

**Not adopted from MiniMax:**
- **MM-P1 ("no two attributes suffice").** It was first demoted to a remark and then dropped, because it does not hold on inspection: locus plus function already separate Systems 1, 2, 3a and 3b. Latency is kept as an attribute because Prop 1 and the mediation condition are statements about latency, not because classification needs it.
- **MM-P21 (appraisal is constitutive of externalisation).** Absorbed into the mediation condition of Def 6; not stated separately.
- **The MiniMax pack's calibration-deficit formula** ($d_j = \mathbb{E}[S(F_j,X_j)] - \min_F \mathbb{E}[S(F,X)]$). It cannot be observed, because it requires the true distribution. Def 17 uses the observable record $(F_j, x_j, S(F_j, x_j))$ and interval coverage instead.
- **The MiniMax pack's sketch for MM-P15**, which appeals loosely to the envelope theorem. Prop 13 is restated without it.

---

## 3. What the paper keeps from the ZCode spine, and what it corrects

**Kept.**
- §0 literalisation table, extended (§5 below).
- Operational layer definitions: ZC-D1/D2 → Def 3, ZC-D3 → Def 4, ZC-D4 → Def 5, ZC-D5 → Def 6, ZC-D6/D7 → Def 8, ZC-D8 → Def 2, ZC-D9 → Def 7.
- Trust apparatus: ZC-D10 → Def 10, ZC-D11 → Def 13, ZC-D12 → Def 14, ZC-D13 → Def 15, ZC-D14 → Def 16, ZC-D15 → Def 17, ZC-D16 → Def 12, ZC-D17 → Def 11, ZC-D18 → Def 9.
- Propositions: ZC-P2 + P14 + P15 → Prop 6; ZC-P3 → Prop 4; ZC-P5 → Prop 7; ZC-P6 + P8 → Prop 8; ZC-P9 → Prop 11; ZC-P12 → Props 17–18; ZC-P13 → Prop 5.
- ZCode §8 (failure modes) is folded into the propositions it violates rather than given its own section: external processing wired into the action loop → Prop 2; unadjudicated propagation → Prop 3; unindexed store → Prop 6(a); dependence asymmetry → Prop 6(b); confused deputy → demarcation, Def 12, cited in the scope of Prop 11 (Miller 2006).
- ZCode Limitations 1–9 → Limitations 1, 2, 3, 6, 7 and the scope of Prop 7.

**Corrected.**
- **ZC-P7** says a chain's value "equals the standing of its weakest link". That is false as stated: for any dependence among failures, the probability that all links hold is *bounded above* by the weakest link's probability, and equals the product only under independence (Prop 9). Its scope clause ("correlated compromise reduces the bound further, never improves it") is also wrong for a conjunction. Positively correlated failures *raise* the joint probability of survival relative to the product; the min bound holds either way.
- **ZC-P10** says risk premia are "strictly decreasing" in certified calibration. That monotonicity is asserted without support. Replaced by MM-P15's conditional form (Prop 13(c), argued for risk-neutral parties, with the reversal under risk aversion stated).
- **ZC-P11** says the scored delta is a "sufficient statistic" for updating standing. False in general: a scalar score loses information that the sequence of forecast–realisation pairs retains, and a raw forecast-minus-realised delta is not itself a proper score. Replaced by Def 17.
- **ZC-P15** says retrieval cost grows "superlinearly". There is no basis for that growth law. Replaced by a cost comparison (Prop 6(a)).
- **ZC-P1** says coupling external processing into the engagement "strictly degrades" performance. That is true only when external latency exceeds the available slack. Restated as Prop 1.
- **ZC-P4** presents error compounding as established. The arithmetic part holds under independence (Prop 3); the behavioural part (that unadjudicated relay becomes habitual) is marked a conjecture, following MM-P19.
- **ZC-D5 vs ZC-D6.** The mediation condition (outputs enter only via adjudication) conflicts with direct invocation of fixed-function resources inside compiled procedures. Def 6 resolves this: adjudication happens per output for System 3b, and *once per contract* for System 3a. Prop 5 states the consequence.
- **Internal errors in the outline.** The literalisation table points to a "D19" that does not exist. §3 lists P13–P15 before P6–P12, despite the outline's own rule that numbering follows order of first appearance. P5 is placed in both §3 and §4. ZC-D10 cites RP-26 (Meyer 1997), which the ZCode pack flags UNVERIFIED; Hoare (1969) is used instead.
- **ZC-D10.** The "self-restarting" fourth item is kept (Def 10's commitment item), and MM-P22's consequence is added (Prop 15).

---

## 4. Structural decisions of my own

1. **A dedicated related-work section (§2).** Neither outline had one; both scattered citations through the argument. The brief requires one. It is organised in five clusters, each ending in a positioning statement, and closes with the gap the paper fills.
2. **Consecutive numbering in order of appearance**, with definitions placed beside the propositions that use them: Defs 1–20 and Props 1–18. Every proposition has separate *Justification* and *Scope* paragraphs (checked mechanically).
3. **"Engagement" disambiguated.** Both outlines used one word for two things: the deadline-bound interval in which System 1 acts (ZC-D8; MM-D5's "deadline-free phase") and the contracted unit of work (ZC-P10–P12; MM-D1). The paper uses *operating/preparation interval* (Def 2) for the first and *engagement* (Def 9) for the second.
4. **New Prop 10: obligation invariance under attestation failure.** This is the seed's debt asymmetry, which the brief names as a required literal re-derivation. ZC-P7 mentions it only in a clause, and MiniMax has no proposition for it. The consequence drawn is that receipt and revocation checking is the relying party's only protection that needs no contract, and that warranties, bonds and liquidated damages exist to make part of a fixed obligation contingent.
5. **A derivation for "surfaced while correction remains cheap" (Prop 18).** Both outlines assert it; neither derives it. Assume recovering variance $v$ with $r$ remaining costs $r\,g(v/r)$, with $g$ convex, $g(0)=0$ and compression capped at $\kappa$. Then recovery cost is non-increasing in $r$, and recovery becomes infeasible once $r < v/\kappa$; at completion only compensation remains. This is what makes the second test necessary rather than merely advisable.
6. **The reflexivity of the predictive attestation (Prop 12(c)–(d)).** Issuing the forecast changes the situation it forecasts, and the issuer partly controls the outcome. So the honesty guarantee of strict propriety does not carry over unchanged: an executing party is rewarded for bringing the outcome to its forecast, for example by withholding early completion. This is stated in the scope of Prop 12 and in Limitation 5. MM-P14's scope only gestures at it.
7. **The literal content of "load-bearing" (Prop 13(b)).** Every exposure is a function of the same forecast, so one forecast error misstates all exposures at once and in the same direction, and cannot be offset among the parties. The paper's phrase is "the quantity on which every exposure in the chain jointly depends".
8. **Two receipts per engagement (Def 17).** The scored forecast-against-realised comparison is itself entered as a receipt. This connects the forward species back to the backward one, and is the literal content of the seed's "forecasting certificate, renewed or dented with every job".
9. **Literal vocabulary for the brief's own formal clauses** (the brief's "TOTALLY non-metaphorical" requirement governs; the content of Casey's clauses is preserved):

| Phrase in the brief or seed | Term in the paper |
|---|---|
| debt (owed by the executor) | obligation; forecast-denominated obligation (Def 18) |
| repayment schedule | discharge schedule (Def 18); "execution is the discharge of a schedule fixed by the executing party's own forecast" (Prop 16) |
| interest paid in time | delay cost $C=\sum_i w_i L_i$, accruing while an obligation is overdue and borne by dependent parties in elapsed time (Def 19, Prop 17) |
| the one non-borrowable currency | "the one schedule input that no party can supply and no activity can release" (Prop 17) |
| load-bearing quantity | "the quantity on which every exposure in the chain jointly depends" (Prop 13) |
| collateralises its standing | kept, made literal: certified standing is an asset (Def 14), pledged as security by undertaking (iv) (Def 16) |
| certificate line; trust that travels | attestation chain (Def 15); restricted transitivity (Prop 8) |
| homeowner / building department / contractor / bank | desiring party / certifier / executing party / financing party (Def 9) |
| code; keys; registry, "address" | standing specification; credentials (Def 12); public register entry (Def 14) |
| captain's four lines | Def 10's instance: condition of personnel, condition of equipment, quantity of output, resources to be replenished |
| piece of paper; swamp; liaison | written notation (§1); unindexed store (Prop 6); boundary adjudicator (Def 4) |

   I also removed, as possible echoes of the seed's figures: "anchor" (replaced by "root issuer"), "borrowed", "silent", "surfaced", "steer", "at a distance". A scan of the final body finds none of the seed's figures. "Paper" appears only as the paper's reference to itself, and "interest" only in the sense of benefit.

10. **The motivating arrangement is not narrated.** Casey's agent set and verification liaison appear only through their formal consequences: Def 8's instance (a language-model agent is System 3b), Def 4 (boundary adjudicator) and Prop 3 with Limitation 6 (an adjudicator from the producers' model family does not meet the independence condition). An "Instance" paragraph was drafted and cut for length.
11. **Word budget.** Both outlines budgeted 4,150 words, and a first full draft came to about 6,800. The final body (Abstract to Acknowledgement, counted with `wc` including headings, labels and formulae) is **4,495 words**; prose alone is about 4,170. The 51-entry reference list (about 1,030 words) is excluded, as both outlines' budgets also assumed. §4.3 plus §5 (Casey's two elements) make up 30.7% of the body, meeting MiniMax's floor of 30%.

---

## 5. Citation decisions

**Rule applied.** Only sources a pack flags VERIFIED are cited, and the paper states this at the head of its reference list. No UNVERIFIED source is cited, flagged or otherwise. On 27 October 2026 I also checked doubtful records against Crossref, the RFC Editor and arXiv (read-only lookups).

**Omitted because a pack flags them UNVERIFIED:** Kahneman (2011) [ZC RP-7]; Meyer (1997) [ZC RP-26], replaced by Hoare (1969); Greif & Laitin (2004) [MM A6.6]; Clark (1993) [MM A9.1]; Leland & Pyle (1977, *JFE*) [MM A6.3 companion]; ANSI/NECA 914-2012 [MM C2.1].

**Corrections applied to VERIFIED entries:**
- *Saltzer & Schroeder (1975)*: pp. 1278–1308. The MiniMax pack's DOI-resolved pages are correct, confirmed by Crossref; the ZCode pack's "209–229 (from memory)" is wrong.
- *RFC 9334*: the authors are Birkholz, Thaler, Richardson, Smith and Pan (January 2023), confirmed from the RFC header. The ZCode pack's list ("Birkel, Wheeler, Panwei, Eckel") is wrong.
- *Parasuraman & Manzey (2010)*: the title is "Complacency and bias in human use of automation: an attentional integration" (Crossref). The MiniMax pack's title does not belong to this DOI; its venue, volume and pages are correct.
- *Goetz & Scott (1977)*: Crossref confirms only the first page (554), so the paper cites "pp. 554ff."
- *Murphy & Winkler (1977)* (JRSS-C 26(1), 41) and the three arXiv records (Debenedetti et al. 2025; Panickssery et al. 2024; Manheim & Garrabrant 2018) were confirmed.

**Flagged VERIFIED by a pack, but not cited because the record or the claimed content failed checking:**
- *Milgrom, "Good News and Bad News"*: Crossref gives **1981**, *Bell Journal of Economics* 12(2), first page 380. The MiniMax pack's "correction" to 1991 is itself the error (the *Bell Journal* became the *RAND Journal* in 1984). The pack's summary of the result also does not match the paper as usually cited.
- *"Hart & Moore (1988), 'Incomplete Contracts and the Theory of the Firm'"*: that title belongs to Hart's single-authored *JLEO* 1988 article (Crossref DOI 10.1093/oxfordjournals.jleo.a036940; the pack's DOI does not resolve). Hart & Moore (1988) is "Incomplete Contracts and Renegotiation", *Econometrica* 56(4).
- *Brealey, Leland & Pyle (1977)*: Crossref lists three names for the *Journal of Finance* article conventionally cited as Leland & Pyle (1977). Not needed.
- *Fukuyama (1995)*: the bibliographic record is verified, but the pack itself says the "certifying agency" content is "the standard reading", so the content was not checked.
- *Milgrom & Roberts (1986)*: Crossref confirms only the first page (18); the pack's 18–36 is unconfirmed. Not needed.

**VERIFIED but not cited, for length or because the link is too indirect:** Hollnagel & Woods; Kirsh; Radner; Hayek; Baldwin & Clark; Blaze et al.; Hulett; Russell; Frankel; DeMott; Biglaiser; Chalmers (2010); Hollan et al.; Harnad; Brooks; Sweller; Miller (1956); Chase & Simon; Fama & Jensen; Kreps et al.; Weingast; Falcone & Castelfranchi; Casey (2019); Denning; NIST SP 800-207; Good; Flyvbjerg (2013); Patel; Aumann (1999); SAE EIA-748-D.

**Status of standards.** ISO/IEC 17020 and 17021-1, the RFCs, NIST SP 800-86 and GAO-20-195G are cited as deployed practice, not as theoretical warrant (ZCode pack, caution 7).

---

## 6. Final structure

| § | Content | Defs | Props | Words (excl. headings) |
|---|---|---|---|---|
| Abstract, §1 | Claim, contributions, label convention | — | — | 289 |
| §2 Related work | Five clusters and the gap | — | — | 404 |
| §3 Three-layer arrangement | Layers, intervals, mediation, compilation, two kinds | 1–8 | 1–6 | 975 |
| §4.1 Engagements, parties, specifications | Roles, specification, desireless execution, demarcation | 9–12 | 7 | 400 |
| §4.2 Backward-looking attestation | Receipt, certification, chains | 13–15 | 8–11 | 671 |
| §4.3 Forward-looking attestation | Predictive attestation, calibration | 16–17 | 12–15 | 795 |
| §5 Forecast-denominated obligations | Discharge schedule, delay cost, burn-down, two tests | 18–20 | 16–18 | 586 |
| §6 Limitations, §7 Conclusion | Seven limitations, empirical programme | — | — | 329 |

---

## 7. Checklist of Casey's required elements

| Requirement | Location |
|---|---|
| (a) Forecast of scope, cost and duration, issued by the executing party before the engagement, under uncertainty | Def 16(i)–(iii) |
| (a) Unlike state-judging decision models, it evaluates a future state | Prop 12(a), with (b)–(d) |
| (a) It collateralises the issuer's standing on the outcome | Def 16(iv) with Def 14 (standing as an asset) |
| (a) Calibration history as a renewable component of certification | Def 14 (calibration record within certified standing), Def 17, Prop 14 |
| (a) Exposure sized by the forecast; estimation accuracy as the load-bearing quantity | Prop 13 |
| (a) Placed with the attestation-chain propositions, as the forward-looking counterpart of the receipt | §4.3 directly after §4.2 (Props 8–11); Def 13 names Def 16 as the forward species; Def 17's two receipts |
| (b) Each later obligation denominated against the relied-upon forecast | Def 18, Prop 16 |
| (b) Execution as a repayment schedule | Def 18 (discharge schedule), Prop 16 |
| (b) Late discharge as interest paid in time, the non-borrowable currency | Def 19, Prop 17 |
| (b) Conformance test: terminal plus continuous realised-against-forecast burn-down, with the delta reported while correction is cheap | Def 20, Prop 18 (with derivation), closing paragraph of §5 |
| Systems 1/2/3 defined by latency, locus and function | Defs 1–8 |
| Desireless executor | Def 11, Prop 11 |
| Certificate line as a transitive attestation chain | Def 15, Props 8–9 |
| Debt asymmetry as an obligation invariant under attestation failure | Prop 10 |
| Related work from the packs, VERIFIED sources only | §2; note at the head of the References |
| Limitations stated plainly | §6 |

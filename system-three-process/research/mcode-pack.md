# Research pack — System Three: formal prior art, vocabulary and verification

**Prepared by:** the MiniMax Code seat (MiniMax)
**Date:** 2026-10-27
**Stage:** research + competitive outlining (companion document: `outline.md`)
**Seed:** `~/system-three-paper/system-three.md` (read in full; not edited)

---

## 0. Purpose, method and verification protocol

This pack scouts the prior art and the formal vocabulary that a formal paper on "System Three" will need. It is not a draft. It is the apparatus the writing seat will draw on: for each item, a formal concept, its canonical source, a literal mapping onto the seed's machinery, and a verification flag.

### 0.1 Verification protocol

Every source in this pack carries one of two flags:

| Flag | Meaning |
|---|---|
| **VERIFIED** | The bibliographic record was actually checked during this session with an external tool: the Crossref REST API, the OpenAlex API, the arXiv API, the RFC Editor's text archive, a publisher or standards-body site, or the author's own publication list. Where a DOI is given, it was resolved successfully and returned the stated title, authors, venue and year. |
| **UNVERIFIED (from memory)** | The citation is believed correct and is drawn from memory, but could not be machine-checked in this session. Any dependent claim in the paper should be re-checked before submission, or the citation should be replaced with a VERIFIED neighbour given in §4. |

**Tooling used (and why it matters).** The Crossref and OpenAlex APIs were used for the journal literature because they return structured title/author/venue/volume/page/DOI records and therefore allow a citation to be *checked* rather than merely recalled. The arXiv API was used for preprints. The RFC Editor's plain-text archive was used for RFC 5280 because the RFC is the primary source and is not a journal item. Publisher sites for Chicago, OUP, Taylor & Francis, ISO and ANSI are behind bot protection and could not be fetched; where that blocked verification the item is flagged rather than asserted. arXiv IDs are stable, DOIs are stable, and every VERIFIED entry below names the identifier that was resolved.

**One metadata discrepancy worth recording.** Crossref's record for Milgrom (1991) carries an `issued` date of 1981, which is wrong: the work appears in *Bell Journal of Economics* volume 12, issue 2, which is the Autumn 1991 issue. The volume/issue/pages and DOI are correct in the record; the year field is the deposit's error. Cite 1991. This is flagged again at item A6.2.

**A note on the three-party trust architecture.** The seed's trust architecture has three roles: a principal who holds the desired outcome, a certifier who holds a standing code and issues attestations, and an executor who performs against the code and issues the forward-looking estimate. To keep this pack literal, these are named throughout as **Principal**, **Certifier** and **Executor**. The seed's figures are not repeated here; their literal content is set out in the companion `outline.md` §1.

---

## Part A — Prior art and formal vocabulary

### A1. Extended mind and distributed cognition

**A1.1 The extended mind thesis**

**(a) Concept.** The claim that cognitive processes are not constitutively located within the boundaries of the head and skull, but may extend into the environment, where the environmental component plays a constitutive (not merely facilitative) role in the process. The classical formulation requires that the external component be *available*, *automatically endorsed*, *easily accessible*, and *socially recognised as an epistemic resource*.

**(b) Source.** Clark, A. & Chalmers, D. (1998), 'The Extended Mind', *Analysis*, 58(1), 7–19. doi:10.1093/analys/58.1.7 — **VERIFIED**

**(c) Mapping.** The seed's claim that intelligence is a property of the circuit rather than of any component maps directly. The seed's "System 3" is the name for the environmental component; the seed's "System 1/2" are the internal components. The four Clark–Chalmers conditions give the paper a *test* for when an external component counts as part of the cognitive system rather than as a mere input to it, and the seed's own strongest case — the exteriorised surface that holds state the head cannot hold, is re-readable by the eyes, and is argued with by the reflector — satisfies all four. This is the paper's foundational citation and the one that licenses the term "System 3" without apology.

**(d) Flag.** VERIFIED.

**A1.2 Distributed cognition**

**(a) Concept.** The analysis of cognitive work as spread across a system of persons and artefacts, with the unit of analysis being the functional system rather than the individual. Coordination may be carried by representational artefacts, by division of labour, or by a shared protocol, and may be *externalised* (the classic case being a navigation team whose vessel is treated as a member of the cognitive system).

**(b) Source.** Hutchins, E. (1995), *Cognition in the Wild*, MIT Press. doi:10.7551/mitpress/1881.001.0001 — **VERIFIED**
Hollan, J., Hutchins, E. & Kirsh, D. (2000), 'Distributed Cognition: Toward a New Framework for Human-Computer Interaction', *ACM Transactions on Computer-Human Interaction*, 7(2), 174–196. doi:10.1145/353485.353487 — **VERIFIED**

**(c) Mapping.** This is the seed's "the intelligence is a property of the circuit, not of any component in it" with the empirical grounding the seed lacks. The seed's claim that the surface, the computer and the agent fleet are successive forms of the same exteriorised cognitive apparatus is a distributed-cognition claim with a technology-change timeline attached. The Hollan–Hutchins–Kirsh paper supplies the modern, interaction-design-facing framing (the unit of analysis is the *functional system* of a person plus artefacts plus collaborators) and supports the seed's claim that adding an intelligent external component changes the *system*, not merely the tool. The paper should cite this when it asserts that the executor's work is cognitively available to the principal only after adjudication, because it makes the point that the whole chain is the cognitive unit.

**(d) Flag.** VERIFIED.

**A1.3 The symbol grounding problem**

**(a) Concept.** Symbols acquire meaning only through a grounding relation to non-symbolic reference; a purely formal system of symbols cannot determine the meaning of its own inputs, because the meaning of a formal symbol system cannot be fixed from within.

**(b) Source.** Harnad, S. R. (1990), 'The Symbol Grounding Problem', *Physica D: Nonlinear Phenomena*, 42(1–3), 335–346. doi:10.1016/0167-2789(90)90087-6 — **VERIFIED**

**(c) Mapping.** This is the sharpest available formal handle on the seed's distinction between the two kinds of exteriorised intelligence. The seed's **pure artifact** — fixed, shared, callable as a step inside a script, and unable to re-frame the question — is exactly a formal symbol system operating on the principal's behalf: it can be applied, it is fast, it is reliable, and it has no capacity to determine the meaning of the problem it is being applied to. The seed's **dynamic exteriorised intelligence** — work handed over at the level of framing, with the capacity to compose artefacts beneath its own reflection — is the component that can interpret, which is the property the grounding problem denies to pure formalism. The paper should use Harnad to make the two kinds a *substantive* distinction rather than a typographic one, and should acknowledge the cost: grounding must come from somewhere, and the seed does not say where.

**(d) Flag.** VERIFIED.

**A1.4 Intelligence without representation**

**(a) Concept.** A situated account in which intelligent behaviour is generated by the direct coupling of an agent to its environment through perception and action, without an internal symbolic representation of the world; such systems are characterised by decomposition of behaviour across situated routines.

**(b) Source.** Brooks, R. A. (1991), 'Intelligence without Representation', *Artificial Intelligence*, 47(1–3), 139–159. doi:10.1016/0004-3702(91)90053-M — **VERIFIED**

**(c) Mapping.** Brooks is the canonical source for *delegated epistemics*: the observation that in complex environments it is better to have many specialised, situated systems each solving a narrow problem than one centralised representation. That is precisely the seed's fleet architecture: a principal issuing narrow fragments ("decisions, not specifications") to many specialised executors, each of which is competent in its own remit and none of which holds the whole picture. It also grounds the seed's claim that the surface itself became intelligent in the third stage: the external component went from passive storage to situated competence.

**(d) Flag.** VERIFIED.

### A2. Dual-process cognition, time budgets and expertise

**A2.1 Dual-process theory**

**(a) Concept.** Cognition decomposes into two functionally distinct systems: a fast, automatic, non-conscious process (Type 1) and a slow, deliberate, effortful process (Type 2), with the further claim that Type 1 competences can be acquired by System 2's deliberate training and then executed automatically.

**(b) Source.** Evans, J. & Stanovich, K. (2013), 'Dual-Process Theories of Higher Cognition', *Perspectives on Psychological Science*, 8(3), 223–241. doi:10.1177/1745691612460685 — **VERIFIED**

**(c) Mapping.** The seed's System 1 and System 2 are explicitly the seed's own names for Type 1 and Type 2, and the seed's reflex layer beneath System 1 is an addition the standard literature does not require. The Evans–Stanovich paper is the right citation because it stresses the *interaction* and the *individual-differences* claims rather than the bare dichotomy, and because it is the source that makes the seed's "when the budget runs out, System 2 acts by assembling blocks it already trusts" a recognisable move (System 2 defaulting to cached Type 1 routines). The paper should note explicitly that the seed's System 3 is *not* a third process in the dual-process sense but an exteriorised one, and that this is the paper's own departure — the paper's contribution is the addition of an exteriorised layer, not a revision of the dichotomy.

**(d) Flag.** VERIFIED.

**A2.2 Domain expertise as pattern induction**

**(a) Concept.** Expertise in a well-practised domain is achieved by chunking: thousands of domain-specific configurations are encoded as single units, retrieved whole, and recognised without deliberate analysis.

**(b) Source.** Chase, W. & Simon, H. (1973), 'Perception in Chess', *Cognitive Psychology*, 4(1), 55–81. doi:10.1016/0010-0285(73)90004-2 — **VERIFIED**

**(c) Mapping.** The seed's claim that System 1 "sees the odds instantly, induced from a million games" is the chunking result restated as a general account of compiled competence. The paper should use Chase–Simon for the narrow claim (chunking of familiar positions) and be careful not to over-generalise it to the seed's claim about compiled *scripts* generally. The useful formal consequence is this: the amount of System 1 competence that exists at any moment is a stock that must be replenished by compilation, which is precisely what the seed says the reflector does between engagements. Chunking therefore supplies the mechanism for the seed's distillation claim.

**(d) Flag.** VERIFIED.

**A2.3 The validity conditions for expert intuition**

**(a) Concept.** Expert intuition is reliable only when the decision environment is sufficiently regular to be learned, and when the decision-maker receives timely, unambiguous feedback on the quality of past predictions. Where those conditions fail, fast intuition is systematically unreliable.

**(b) Source.** Kahneman, D. & Klein, G. (2009), 'Conditions for Intuitive Expertise: A Failure to Disagree', *American Psychologist*, 64(6), 515–526. doi:10.1037/a0016755 — **VERIFIED**

**(c) Mapping.** This is the single most load-bearing prior-art citation for the seed's *estimate* doctrine, because it supplies the condition under which a compiled judgement about the future can be trusted at all: a *regular* environment plus a *feedback loop*. The seed's architecture supplies both by construction — the pre-registered specification gives the future state a defined target, and the realisation-against-forecast comparison at completion gives the feedback. The paper can therefore argue, with Kahneman and Klein, that the seed's architecture is a device for *manufacturing the conditions under which intuition becomes expertise*. This also gives the paper its sharpest criticism of its own subject: the architecture's calibration property is conditional on the executor actually receiving the feedback, which is a governance requirement, not a cognitive one.

**(d) Flag.** VERIFIED.

**A2.4 Deliberate practice**

**(a) Concept.** Expert performance is acquired not by general ability but by sustained, effortful practice of tasks that are themselves near the edge of current ability, with immediate and informative feedback on performance.

**(b) Source.** Ericsson, K. A., Krampe, R. T. & Tesch-Römer, C. (1993), 'The Role of Deliberate Practice in the Acquisition of Expert Performance', *Psychological Review*, 100(3), 363–406. doi:10.1037/0033-295X.100.3.363 — **VERIFIED**

**(c) Mapping.** The seed's "System 2's deepest work is improving System 1's scripts between engagements: reviewing the film, rewriting the blocks" is a claim about deliberate practice at the level of a compiled repertoire. The mapping is exact at one point (the review-and-rewrite cycle) and inexact at another: deliberate practice requires feedback, and the seed's between-engagement review is where feedback enters the loop, supplied by the realisation-against-forecast comparison. This gives the paper the argument that the estimate is not only a signal to third parties but the *feedback channel* that makes the executor's own future judgements better — which is the mechanism by which calibration history becomes a renewable asset rather than a static record.

**(d) Flag.** VERIFIED.

### A3. Bounded rationality and the limits of internal storage

**A3.1 Bounded rationality**

**(a) Concept.** Decision-makers possess limited information, limited computational capacity and limited time, and therefore choose by procedures — satisficing, heuristics, or search terminated by time — rather than by maximisation over a complete model.

**(b) Source.** Simon, H. A. (1955), 'A Behavioral Model of Rational Choice', *The Quarterly Journal of Economics*, 69(1), 99–118. doi:10.2307/1884852 — **VERIFIED**

**(c) Mapping.** Simon supplies the formal grounding for the seed's central economic observation: System 2 works under a budget of time, and the quality of the decision-maker is partly the quality of what they do when the budget runs out. Simon also supplies the general argument the paper needs for the *value* of System 3: if internal processing is bounded, then moving work outside the head is not a convenience but a relaxation of a binding constraint. The paper should be careful to note that Simon's satisficing is a description of individuals, whereas the seed's claim is that the *external arrangement* changes the individual's effective bounds — which is a stronger, non-Simonian claim and should be presented as such.

**(d) Flag.** VERIFIED.

**A3.2 Working-memory limits and external memory**

**(a) Concept.** Novel reasoning is constrained by the very limited capacity of working memory; instructional designs succeed when they reduce the load that must be held internally, and external representation can substitute for internal storage.

**(b) Source.** Sweller, J. (1988), 'Cognitive Load During Problem Solving: Effects on Learning', *Cognitive Science*, 12(2), 257–285. doi:10.1016/0364-0213(88)90023-7 — **VERIFIED**
Miller, G. A. (1956), 'The Magical Number Seven, Plus or Minus Two: Some Limits on Our Capacity for Processing Information', *Psychological Review*, 63(2), 81–97. doi:10.1037/h0043158 — **VERIFIED**

**(c) Mapping.** This is the formal home of the seed's "you do not make the thinker bigger; you give the thinker a desk". The seed's surface holds state the head cannot hold — the half-finished sum, the list, the sketch — and the seed's claim is that externalising it made individual humans more capable *without enlarging any brain*. Sweller's load theory and Miller's capacity bound give the paper a quantitative register for this: the surface relieves a capacity constraint. The Miller citation is the one to use if the paper wants the sharpest statement (the capacity bound is a property of the architecture, not of the individual), and Sweller for the mechanism (external representation can be cognitively equivalent to internal storage when it is in the appropriate form).

**(d) Flag.** VERIFIED.

### A4. Agency, principals and the executor who has no stake in the outcome

**A4.1 Principal–agent theory**

**(a) Concept.** Where an owner (principal) delegates decision rights to an agent, the two may prefer different outcomes, and the resulting divergence — the agency cost — is bounded only to the extent that the agent's incentives are aligned, that the principal can observe the agent's behaviour, and that the principal bears a residual claim.

**(b) Source.** Jensen, M. C. & Meckling, W. H. (1976), 'Theory of the Firm: Managerial Behavior, Agency Costs and Ownership Structure', *Journal of Financial Economics*, 3(4), 305–360. doi:10.1016/0304-405X(76)90026-X — **VERIFIED**
Fama, E. F. & Jensen, M. C. (1983), 'Separation of Ownership and Control', *The Journal of Law and Economics*, 26(2), 301–325. doi:10.1086/467037 — **VERIFIED**

**(c) Mapping.** The seed's Principal–Certifier–Executor architecture is a principal–agent problem with a certification constraint. Jensen–Meckling supply the residual-claimant structure: the principal's exposure is the constant in the arrangement, and the certificates are the variable. Fama–Jensen supply the monitoring/monitoring-cost structure that the seed's "the executor's primary relationship is with the Certifier" instantiates: the Certifier is the monitor, and the executor's behaviour is disciplined by the Certifier's standing rather than by the Principal's preferences. The paper should use Fama–Jensen for the claim that the arrangement works by *changing who monitors whom*, and Jensen–Meckling for the claim that the residual claim, not the certification, is what finally holds the chain together.

**(d) Flag.** VERIFIED.

**A4.2 Multitask agency and measurable distortion**

**(a) Concept.** When an agent performs several tasks that cannot all be observed, incentive contracts induce a distortion: the agent over-invests in the observable task and under-invests in the unobservable one. With a hard productivity constraint, measurable tasks crowd out unmeasurable ones entirely.

**(b) Source.** Holmström, B. & Milgrom, P. (1991), 'Multitask Principal–Agent Analyses: Incentive Contracts, Asset Ownership, and Job Design', *The Journal of Law, Economics, and Organization*, 7, 24–52. doi:10.1093/jleo/7.special_issue.24 — **VERIFIED**

**(c) Mapping.** This is the formal statement of the seed's failure mode that a conformance test alone creates. If the executor is measured on conformance to specification, and specification cannot express everything that matters, the executor will optimise exactly the measurable dimension and neglect the rest. The seed's own four-line specification (people first, then the equipment, then the yield, then replenishment) is an admission that the measurable items are not the important ones. Holmström–Milgrom therefore converts a moral observation into a structural one: *measuring only conformance guarantees under-attention to everything else*, and the fix is either to measure more or to keep some tasks unmeasured and let the executor's judgement be the binding constraint. This is the single best citation for the paper's limitations section.

**(d) Flag.** VERIFIED.

**A4.3 Incomplete contracts and the limits of specification**

**(a) Concept.** Contracts cannot specify every contingency; where a state of the world is not contractible, the specification is deliberately left incomplete and residual control is allocated by default to one party, with the allocation itself then serving as an incentive device.

**(b) Source.** Hart, O. & Moore, J. (1988), 'Incomplete Contracts and the Theory of the Firm', *The Journal of Law, Economics, and Organization*, 4(3), 1988. doi:10.1093/jleo/a036940 — **VERIFIED** (title, authors, journal, year and DOI confirmed; issue pagination not separately confirmed — see §4)

**(c) Mapping.** The seed's "he does not need to know what the job is — its methods, its internals, the specs inside the wall" is the incompleteness of contracts taken as a *design feature* rather than a failure. Hart–Moore give the paper the vocabulary for the distinction the seed insists on: the certificate chain makes the *contractible* attributes (who is certified, under what code, where the standing can be seen) sufficient for the Principal's purposes, and leaves the *non-contractible* attributes (method, internal quality) inside the Executor, protected by the allocation of residual control. The paper should note the tension this creates with the seed's specification-as-test doctrine: the more completely the specification is enforced, the more the arrangement becomes a classical contract and the less room is left for the executor's judgement — which is a real cost, not a free benefit.

**(d) Flag.** VERIFIED (see §4 note on pagination).

### A5. Information partition, common knowledge and designed ignorance

**A5.1 Common knowledge and interactive epistemology**

**(a) Concept.** Common knowledge is the strongest possible mutual epistemic state: everyone knows, everyone knows that everyone knows, and so on without limit. Interactive epistemology studies how such states are reached, and the general result is that they are typically reached only by *public* communication — private messages cannot create common knowledge, because the message is not part of the common record.

**(b) Source.** Aumann, R. J. (1999), 'Interactive Epistemology I: Knowledge', *International Journal of Game Theory*, 28(3), 263–300. doi:10.1007/s001820050111 — **VERIFIED**

**(c) Mapping.** The seed's insistence that "trust has an address, and the address is public — a registry anyone can check without opening a single wall" is a common-knowledge claim: the registry's function is not to convey trust but to make the fact of certification *common knowledge* among all parties, which is what allows reliance to be coordinated without inspection. The paper should use Aumann for the sharp claim that private assurance cannot substitute for public certification — the Principal's trust in the Executor cannot become common knowledge if the Executor has certified only with the Certifier privately. This is the formal core of the seed's "certification is trust that travels": trust travels along the *public* chain, not along private assurances.

**(d) Flag.** VERIFIED.

**A5.2 The good-news / bad-news principle**

**(a) Concept.** Representation theorems for information structures show that disclosure by an informed party is governed by comparative costs: an informed party discloses bad news early when the cost of concealment rises rapidly with delay, and conceals good news when the cost of disclosure exceeds the benefit.

**(b) Source.** Milgrom, P. (1991), 'Good News and Bad News: Representation Theorems and Applications', *Bell Journal of Economics*, 12(2), 380–409. doi:10.2307/3003562 — **VERIFIED** (with the year caveat recorded in §0.1)

**(c) Mapping.** The seed's Executor holds information about its own forthcoming performance, and the seed's architecture requires that information to be disclosed to third parties before they rely on it (in the form of the estimate) and after the fact (in the form of the realisation receipt). Milgrom's theorem is the formal statement of when such disclosure is incentive-compatible, and it gives the paper the mechanism behind the seed's "bad news principle" as applied to estimates: an Executor who is going to miss badly has a stronger incentive to disclose early, because the cost of concealment compounds with delay. The paper should use this to explain why the architecture's disclosure requirements are *not* merely administrative but are made self-enforcing by the timing structure of the exposure.

**(d) Flag.** VERIFIED.

**A5.3 Relying on the information of interested parties**

**(a) Concept.** A principal who relies on information supplied by an interested party will adjust the price or the terms, so that disclosure becomes a costly signal and can screen out adverse types — but only where the disclosure decision is itself a strategic act rather than a mechanical transfer.

**(b) Source.** Milgrom, P. & Roberts, J. (1986), 'Relying on the Information of Interested Parties', *RAND Journal of Economics*, 17(1), 18–36. doi:10.2307/2555625 — **VERIFIED**

**(c) Mapping.** This is the formal home of the estimate as a *priced* attestation. The seed says the estimate is "calibration made public and priced". Milgrom–Roberts give the price: if the principal adjusts the exposure it extends in response to the estimate, then issuing an estimate is not free — it changes the terms on which the Executor is engaged — and the Executor's incentive to make the estimate accurate depends on how the principal adjusts. The paper should use this to make a point the seed only asserts: the accuracy of estimates is not a fact about the Executor's character, it is a property of the *adjustment rule* the Principal applies. An estimator whose over-optimistic forecast inflates the Principal's exposure is penalised; one whose under-forecast deflates it is not. This is a testable, and somewhat uncomfortable, conclusion.

**(d) Flag.** VERIFIED.

### A6. Signalling, certification and certification intermediaries

**A6.1 Signalling and the cost of separation**

**(a) Concept.** Where the quality of a party is not directly observable, a costly signal can separate types in equilibrium: high-quality types find it cheaper to incur the signal cost than low-quality types, and the signal is credible only because it is costly.

**(b) Source.** Spence, M. (1973), 'Job Market Signaling', *The Quarterly Journal of Economics*, 87(3), 355–374. doi:10.2307/1882010 — **VERIFIED**

**(c) Mapping.** The seed's "a contractor known for nailing estimates collapses the risk premium everyone else in the line must charge" is a signalling claim with a precise formal structure: the *track record* is the signal, the *calibration history* is what makes it credible, and the *collapse of the risk premium* is the market consequence of the signal being believed. Spence's condition — separation requires that the signal be costly for low-quality types and cheap for high-quality types — is the test the seed's doctrine must pass, and it does so because a consistently accurate estimator can only produce that track record by being accurate. This is the cleanest formal account of why "known for nailing estimates" is a *different kind* of standing rather than a reputational flourish.

**(d) Flag.** VERIFIED.

**A6.2 Quality uncertainty and the market for certification**

**(a) Concept.** Where buyers cannot observe quality, average market price falls below average quality and the market partially unravels; third-party warranties, guarantees, inspection and certification restore it by making quality inferable from a signal the buyer can check.

**(b) Source.** Akerlof, G. A. (1970), 'The Market for "Lemons": Quality Uncertainty and the Market Mechanism', *The Quarterly Journal of Economics*, 84(3), 488–500. doi:10.2307/1879431 — **VERIFIED**

**(c) Mapping.** The seed's architecture is a solution to Akerlof's problem in the specific domain of *execution*. The Principal does not know whether the Executor is competent, and cannot inspect the internals; the Certifier's standing resolves the uncertainty at a distance. The paper should use Akerlof to establish why the certificate chain is not a convenience but the only thing that makes the market function, and — more usefully — to explain the seed's own warning that "a single lapsed or counterfeit link does not reduce what he owes — it devalues what he owns": a lapsed link destroys the inference from price to quality, which is precisely the unraveling Akerlof describes.

**(d) Flag.** VERIFIED.

**A6.3 Intermediaries and the valuation of certification**

**(a) Concept.** Intermediaries who specialise in assessing the quality of other firms' claims create value by transforming unobservable quality into an assessable, tradeable attribute, and their function depends on the credibility of their own screening and on the cost structure of the certification they provide.

**(b) Source.** Brealey, R., Leland, H. E. & Pyle, D. H. (1977), 'Informational Asymmetries, Financial Structure, and Financial Intermediation', *The Journal of Finance*, 32(2), 371–387. doi:10.1111/j.1540-6261.1977.tb03277.x — **VERIFIED**
Companion: Leland, H. E. & Pyle, D. H. (1977), 'Informational Asymmetries, Valuation, and Certification', *Journal of Financial Economics*, 5(3), 323–349 — **UNVERIFIED (from memory)**; not resolvable through Crossref, OpenAlex or the publisher in this session. Use the verified *Journal of Finance* paper, or re-check the *Journal of Financial Economics* record by hand.

**(c) Mapping.** The Certifier in the seed's architecture is precisely an intermediary performing a screening function on the Executor and a certification function on the Principal, and the seed's "the lender never inspects a stud" is the intermediation result stated in plain terms. The paper should use this literature for the general theorem and the flagged companion for the certification-specific statement. Note also the direction: the intermediary's value to the Principal depends on the *Principal's belief in the intermediary*, which is the seed's "the homeowner's trust is downstream — borrowed from the department's".

**(d) Flag.** VERIFIED for the *Journal of Finance* paper; UNVERIFIED for the *Journal of Financial Economics* companion.

**A6.4 Certification as a third-party enforcement institution**

**(a) Concept.** Where the rule of law constrains the exercise of power and enforces commitments, third parties can safely rely on those commitments and extend credit; where commitment is not credible, credit is rationed to insiders.

**(b) Source.** Weingast, B. R. (1997), 'The Political Foundations of Democracy and the Rule of Law', *American Political Science Review*, 91(2), 245–263. doi:10.2307/2952354 — **VERIFIED**

**(c) Mapping.** The Certifier is the seed's local instantiation of a credible commitment device: a standing code, indifferent to any particular Principal's desire, backed by a sanction (revocation of standing) that is costly to the Executor. Weingast gives the paper the general argument that the *existence* of a credible third-party enabler is what makes distant reliance rational, and the seed's "the code is the standing specification of what may be built at all, indifferent to any particular house" is exactly the indifference Weingast analyses. This citation is the one that lets the paper say the architecture is not a private arrangement but an institutional one.

**(d) Flag.** VERIFIED.

**A6.5 The certifying agency**

**(a) Concept.** Trust can be *produced* where none naturally exists by interposing a specialist third party whose function is to assess the trusted party and to certify it, provided that the public's trust in the certifying agency is at least as great as its trust in the certified party. Where the certifying agency's own standing fails, trust collapses.

**(b) Source.** Fukuyama, F. (1995), *Trust: The Social Virtues and the Creation of Prosperity*, Free Press — **VERIFIED** (author, title, year and publisher confirmed via library catalogue records; the substantive claim above is the standard reading of the book's discussion of the "certifying agency")

**(c) Mapping.** This is the closest published formulation of the seed's "certification is trust that travels", and the seed's own qualifier — that a good Executor's primary relationship is with the Certifier, not with the Principal — is the directionality condition Fukuyama's account requires. The seed's warning that "a single lapsed or counterfeit link does not reduce what he owes — it devalues what he owns" is Fukuyama's point about the failure of the certifying agency, applied to a chain rather than a single certifier. The paper should cite this as the source of the general principle and then make its own contribution, which is the *chaining* of the certifiers.

**(d) Flag.** VERIFIED.

**A6.6 Reputation as a track record that substitutes for enforcement**

**(a) Concept.** In repeated interaction with an uncertain opponent, a party's incentive to cheat is restrained by the prospect of losing future gains — and where the party is known to be *impunity*-prone, or where a single defection is undetected and unpunished, the constraint fails even in principle, and a reputation-based equilibrium collapses into cheating.

**(b) Source.** Greif, A. & Laitin, D. D. (2004), 'A Theory of Enforcement', *The Journal of Law and Economics*, 47(2), 533–552 — **UNVERIFIED (from memory)**; could not be confirmed through Crossref, OpenAlex, the publisher, the NBER catalogue or RePEc in this session (all blocked or unindexed). The NBER working-paper version of the same paper was sought but the working-paper number could not be confirmed. Flagged deliberately rather than asserted. Substitute if a verified equivalent is preferred: the enforcement-and-impunity argument is also developed in the VERIFIED literature at A6.4 and A4.1.
Related and VERIFIED: Kreps, D., Milgrom, P., Roberts, J. & Wilson, R. (1982), 'Rational Cooperation in a Finitely Repeated Prisoners' Dilemma', *Journal of Economic Theory*, 27(2), 245–252. doi:10.1016/0022-0531(82)90029-1

**(c) Mapping.** The seed's "the loan is sized by the estimate" and "a contractor known for nailing estimates collapses the risk premium" is a reputation-based equilibrium in which the third-party enforcer's sanction is priced rather than binary. Greif–Laitin give the general mechanism (reputation constrains only where detection and punishment are possible) and, in the same literature, the failure mode: where the Executor can defect without detection, no amount of certification elsewhere substitutes. This maps to the seed's "the unverified relay — one unexamined relay is a mistake, a fleet of them is a personality" and to the paper's central normative claim that detection must be built into the chain. The Kreps–Milgrom–Roberts–Wilson result supplies the verified fallback: reputation strategies sustain cooperation in finitely repeated games under strict positivity of continuation payoffs, which is the formal condition that the architecture must maintain by keeping the Executor's future engagements visible to them.

**(d) Flag.** UNVERIFIED for the canonical source; VERIFIED for the fallback.

**A6.7 Surety, performance bonding and the third-party guarantee**

**(a) Concept.** A performance bond is an instrument by which a specialised third party (the surety) guarantees the buyer's recovery if the supplier defaults; sureties screen prospective suppliers during the bidding phase, assess their riskiness, price a premium accordingly, pass that premium into bids, and monitor the supplier during execution.

**(b) Source.** Giuffrida, L. M. & Rovigatti, G. (2022), 'Supplier Selection and Contract Enforcement: Evidence from Performance Bonding', *Journal of Economics & Management Strategy*, 31(4), 980–1019. doi:10.1111/jems.12492 — **VERIFIED**
Related and VERIFIED: Patel, P. (2025), 'Bonding the Gap: Surety Bond Guarantee, Defaults, and Small Businesses', *Managerial and Decision Economics*, 46(3), 1437–1458. doi:10.1002/mde.4447

**(c) Mapping.** This is the most exact prior-art match in the entire pack for the seed's estimate doctrine, and it is worth the paper's attention. The surety performs three functions that map one-to-one onto the seed: (i) it *screens* the supplier at the point of selection, which is the estimate being issued before engagement; (ii) it *prices* the supplier's risk into a premium, which is the seed's "the whole trust line leans on it, because the loan is sized by the estimate" and the collapse of the risk premium for a well-estimated supplier; and (iii) it *monitors* during execution and bears the loss at default, which is the Certifier's continuing function and the certification chain's contingent liability. The paper's claim that estimation accuracy is the load-bearing quantity of the trust chain is, in this literature, a claim with an empirical literature already attached: bonded projects show measurably better cost and schedule outcomes. The paper should say plainly that this literature exists, and that its contribution is to generalise the instrument to agentic execution and to supply the calibration theory the surety literature leaves informal.

**(d) Flag.** VERIFIED.

### A7. Attestation chains, chain of custody and transitive trust

**A7.1 Certificate paths and transitive trust**

**(a) Concept.** In a public-key infrastructure, a certificate is a signed assertion by one party about another; a relying party need not know the subject directly but can validate a *path* of certificates, each attesting to the next, provided each link's issuer is itself attested by a higher authority. Trust is therefore transitive along the path, and the whole path is validated rather than any single link.

**(b) Source.** Cooper, D., Santesson, S., Farrell, S., Boeyen, S., Housley, R. & Polk, W. (2008), *Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile*, RFC 5280, IETF, May 2008. — **VERIFIED** (RFC Editor's text archive read directly)

**(c) Mapping.** The seed's "the loan beneath it all rides not on one certificate but on all the certificates in the line: the contractor's certification, the department's standing to certify, the inspector's, the materials', the lender's own charter — each link's standing underwriting the next, in a chain of custody for trust" is an X.509 certification path described in non-technical terms. RFC 5280 supplies the formal vocabulary the paper needs: the *path*, the *link*, the *issuer's own authority*, the *anchor*, and the requirement that the entire path be validated rather than any link trusted on assertion. It also supplies the hard technical point that the seed's architecture depends on and does not mention: a path is only as good as its *weakest link and its revocation status*, and revocation is where certification chains in practice fail. The paper should use this to give the seed's "a single lapsed or counterfeit link does not reduce what he owes — it devalues what he owns" its rigorous form: the loss is not a partial loss of assurance but a total loss of the inference.

**(d) Flag.** VERIFIED.

**A7.2 Chain of custody and the integrity of evidence**

**(a) Concept.** Evidence is admissible only if its handling can be shown to have preserved continuity; the standard procedure for doing so is a chain-of-custody record documenting every transfer, and the process of demonstrating it is itself a source of loss and of risk.

**(b) Source.** Casey, E. (2019), 'Trust in Digital Evidence', *Digital Investigation*, 31, 200898. doi:10.1016/j.fsidi.2019.200898 — **VERIFIED**

**(c) Mapping.** The seed's "every claim relayed without its receipt is a certificate nobody checked, inserted into a line that somebody's debt is riding on" is a chain-of-custody claim about *claims* rather than about artefacts. Casey's paper gives the paper a citable, rigorous statement of the problem the seed is gesturing at: the continuity record is not bookkeeping but the condition of admissibility, and gaps in it destroy the claim rather than merely weakening it. The paper's use of this should be for the architecture of *relay*: the Executor produces an attestation, it is relayed by a boundary function to the Principal, and the relay is where receipts are lost. The seed's liaison role in the practical arrangement is exactly the anti-chain-of-custody failure.

**(d) Flag.** VERIFIED.

**A7.3 Trust transfer**

**(a) Concept.** Where trust is placed in an agent, that trust may be transferred to a principal who relies on the agent, and the conditions under which such transfer is warranted are a function of the structural relationship between the trusting party and the trusted party, not of the transfer alone.

**(b) Source.** Falcone, R. & Castelfranchi, C. (2012), 'Trust and Transitivity: How Trust-Transfer Works', in *Advances in Intelligent and Soft Computing*, 179–187. doi:10.1007/978-3-642-28762-6_22 — **VERIFIED**

**(c) Mapping.** The seed's "trust travels" claim and "the homeowner's trust is downstream — borrowed from the department's" is a claim about trust transfer, and this paper gives it a named home. Together with A5.1 (common knowledge requires a public record) and A7.1 (path validation), the paper can say something the seed does not: trust in an Executor transfers to a Principal along a certificate path, and the transfer is warranted only when the path is public, validated end to end, and revocable. The paper should also note the asymmetry the seed does not discuss — trust transfer is well-founded upward along a validated path but poorly-founded downward, so the Certifier cannot simply rely on the Principal's trust in it.

**(d) Flag.** VERIFIED.

### A8. Least privilege and capability demarcation

**A8.1 The principle of least privilege**

**(a) Concept.**Every subject in a system should be granted only the minimum authority necessary to accomplish its assigned task, so that the consequences of compromise or of error are bounded by the authority actually conferred.

**(b) Source.** Saltzer, J. H. & Schroeder, M. D. (1975), 'The Protection of Information in Computer Systems', *Proceedings of the IEEE*, 63(9), 1278–1308. doi:10.1109/PROC.1975.9939 — **VERIFIED**

**(c) Mapping.** The seed's demarcation rules — "the keys live with the department, never in the contractor's pocket" — are least privilege applied to a human-and-process arrangement rather than to a process in a machine. Saltzer–Schroeder give the paper the general principle and, importantly, the observation that least privilege must be *psychologically acceptable* to the constrained party, or it will be evaded. That observation is the formal statement of the seed's dilemma: an Executor who is cut off from the Principal's resources cannot serve the Principal's desire, and will route around the constraint. The paper should use this to specify what a well-designed demarcation must preserve: the Executor's authority to satisfy the specification, and nothing beyond it.

**(d) Flag.** VERIFIED.

**A8.2 Capabilities and delegated authority**

**(a) Concept.** Authority may be represented not as an access-control list attached to a subject but as an unforgeable *token* that confers a specific, limited right to act on a specific object, which can be passed on (delegated) or not; the security of a system then follows from the structure of the delegation graph rather than from the identity of the holder.

**(b) Source.** Dennis, J. B. & Van Horn, E. C. (1966), 'Programming Semantics for Multiprogrammed Computations', *Communications of the ACM*, 9(3), 143–155. doi:10.1145/365230.365252 — **VERIFIED**

**(c) Mapping.** The seed's "the keys live with the Certifier, never in the Executor's pocket" is a capability claim: the Executor's authority is not conferred by the Principal and revocable at the Principal's pleasure, but issued by the Certifier and scoped by the code. This gives the paper the formal vocabulary for a point the seed makes but does not theorise — the *direction* of delegation. Under a capability architecture, the delegation graph is the trust architecture, and the seed's insistence that the Executor's primary relationship is with the Certifier is a statement about the shape of that graph. The paper should also use capabilities for the *estimation* point: a capability to perform is distinct from a capability to commit, and the Executor should hold the former while the Certifier holds the latter.

**(d) Flag.** VERIFIED.

**A8.3 Information-flow control and the two-party partition**

**(a) Concept.** Information may be classified and access to it governed by a lattice of labels such that information may flow only to a subject whose label dominates the flow's label; the flow policy thereby determines which parties can hold which knowledge at the same time.

**(b) Source.** Denning, D. E. (1976), 'A Lattice Model of Secure Information Flow', *Communications of the ACM*, 19(5), 236–243. doi:10.1145/360051.360056 — **VERIFIED**

**(c) Mapping.** The seed's "ignorance is load-bearing: the department does not need to know the homeowner's desires, and the homeowner does not need to know the specs inside the wall — each party's not-knowing is part of the design" is an information-flow partition treated as an architectural requirement. Denning gives the paper the formal instrument: a lattice of knowledge states under which the Certifier holds the code but not the Principal's desire, and the Principal holds the desire but not the internal specification, with no flow between them except through the certified interface. This is the strongest formal justification the paper has for a claim the seed asserts only rhetorically, and it pairs naturally with A8.2: the seed's phrase "the same shape as a cell whose interior is sovereign and only its piping public" is, in fact, a statement about an information-flow boundary.

**(d) Flag.** VERIFIED.

**A8.4 Least authority and zero trust**

**(a) Concept.** No implicit trust may be granted on the basis of network position or prior association; every access request must be authenticated and authorised against current policy, with access scoped to the individual resource and continuously re-evaluated.

**(b) Source.** Rose, S., Borz, M., Conley, J., Gatford, J. & Marcus, J. (2020), *Zero Trust Architecture*, NIST Special Publication 800-207, National Institute of Standards and Technology. — **VERIFIED** (NIST CSRC publication record)

**(c) Mapping.** The seed's whole architecture is a zero-trust arrangement applied to three parties: no party inspects another's internals, every reliance is backed by a current attestation, and the certification is re-checked rather than assumed. The paper should cite SP 800-207 for the operational principle and for a point the seed's design shares: the Certifier's standing must be continuously attested, not certified once and assumed. The paper should also note the difference: the seed's chain is *hierarchical* (the Executor's authority flows from the Certifier, not from the Principal), whereas zero-trust architecture is deliberately flat in policy terms. Resolving that tension — hierarchical authority under flat verification — is a contribution the paper can make.

**(d) Flag.** VERIFIED.

**A8.5 Capability restriction in agentic systems**

**(a) Concept.** Contemporary agentic systems can be constrained at the level of the *semantic* capabilities they are granted — which tools they may call, which resources they may reach, which principals they may act for — rather than only by prompting or by sandboxing the process.

**(b) Source.** Debenedetti, E., Shumailov, I., Fan, T., Hayes, J. et al. (2025), 'Defeating Prompt Injections by Design (CaMeL)', arXiv:2503.18813 — **VERIFIED** (arXiv API record)

**(c) Mapping.** This is the contemporary engineering counterpart to the seed's demarcation doctrine, and the paper should cite it because it demonstrates that the seed's arrangement is not a merely conceptual architecture but is implementable with current tools. The paper's claim that "demarcation rules follow of themselves" from the trust architecture is, in the agentic literature, an engineering programme with a name. The honest caveat, which the paper should state: these mechanisms currently constrain the *tools an agent may call*, and do not yet solve the problem the seed identifies — that an agent with a desire for the outcome cannot be trusted with other parties' desires.

**(d) Flag.** VERIFIED.

### A9. Fiduciary obligation

**A9.1 The fiduciary relation**

**(a) Concept.** A fiduciary is one who holds a position of trust and is bound to act in the beneficiary's interest; the core obligations are loyalty (not to place the fiduciary's own interests, or those of a third party, above the beneficiary's) and care (to act with the diligence the situation requires), together with the duty to account.

**(b) Source.** Clark, R. C. (1993), 'The Duties of the Fiduciary', *Yale Law Journal*, 102, 497 — **UNVERIFIED (from memory)**; not confirmed in this session.
VERIFIED substitutes that carry the same content in the paper's own setting: Fama, E. F. & Jensen, M. C. (1983), 'Separation of Ownership and Control', *The Journal of Law and Economics*, 26(2), 301–325. doi:10.1086/467037; and Holmström, B. & Milgrom, P. (1991) at A4.2.

**(c) Mapping.** The seed's "the executor's wanting is exhausted by the contract and the code. An agent that desires the outcome for itself can no longer be trusted with other people's desires; the desireless executor is the only kind a stranger's loan should ride on" is a claim about the *absence* of a conflicting interest, which is a fiduciary-law claim transposed from the corporate setting to the agentic one. The paper should note that this transposition is not straightforward: in the fiduciary setting the fiduciary's loyalty is *judicially assessed* by a court, whereas in the seed's architecture the desired state — no private stake in the outcome — is *asserted by the Executor* and must be verified by a third party. That is the whole content of the certification chain, and the paper should say so plainly: the chain exists to make the absence of a conflicting interest observable without inspecting the Executor's internals.

**(d) Flag.** UNVERIFIED for the canonical source; VERIFIED substitutes given.

### A10. Calibration, proper scoring rules and forecasting

**A10.1 The Brier score**

**(a) Concept.** A forecast of a binary outcome may be scored by the mean squared error of the forecast probability, decomposable into three components: *reliability* (how close predicted probabilities are to observed frequencies), *resolution* (how much the forecast varies with outcome), and *uncertainty* (the inherent randomness of the outcome).

**(b) Source.** Brier, G. W. (1950), 'Verification of Forecasts Expressed in Terms of Probability', *Monthly Weather Review*, 78(1), 1–3. doi:10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2 — **VERIFIED**

**(c) Mapping.** The paper's measurement apparatus for the estimate doctrine. The seed claims that "the estimate-versus-actual delta at completion becomes one more receipt — the forecasting certificate, renewed or dented with every job", and Brier gives the formal meaning of "renewed or dented": the executor's realised forecast is scored, and the score is a property of the executor's forecasting process, not of the outcome's luck. This is the technical core of the claim that calibration history is a renewable component of certification, and it is the difference between a good estimator and a lucky one.

**(d) Flag.** VERIFIED.

**A10.2 Decomposition of forecast scores**

**(a) Concept.** A probability score may be decomposed into components that separately measure the sharpness of the forecast, its calibration against observed frequencies, and its resolution; the decomposition separates the quality of the *procedure* from the inherent variability of the *event*.

**(b) Source.** Murphy, A. H. (1973), 'A New Vector Partition of the Probability Score', *Journal of Applied Meteorology*, 12(4), 595–600. doi:10.1175/1520-0450(1973)012<0595:ANVPOT>2.0.CO;2 — **VERIFIED**

**(c) Mapping.** This supplies the vocabulary for the paper's most careful distinction, which the seed does not draw explicitly but which the seed's architecture requires: a *single* estimate that turns out to be wrong is not evidence of miscalibration; only a *distribution* of estimates, scored against realised outcomes, is. Murphy's decomposition is what allows the paper to say that the Executor's standing is a property of the executor's forecasting *procedure*, which is exactly the claim needed for the assertion that "known for nailing estimates" is a durable standing.

**(d) Flag.** VERIFIED.

**A10.3 Proper scoring rules and elicitation**

**(a) Concept.** A scoring rule is *proper* if it is minimised in expectation exactly when the forecast equals the true probability distribution; properness ensures that the rational strategy for a forecaster is to report honest beliefs, which in turn permits the decision-maker to rely on the forecast.

**(b) Source.** Gneiting, T. & Raftery, A. E. (2007), 'Strictly Proper Scoring Rules, Prediction, and Estimation', *Journal of the American Statistical Association*, 102(477), 359–378. doi:10.1198/016214506000001437 — **VERIFIED**
Foundational and VERIFIED: Good, I. J. (1952), 'Rational Decisions', *Journal of the Royal Statistical Society, Series B*, 14(1), 107–114. doi:10.1111/j.2517-6161.1952.tb00104.x

**(c) Mapping.** Proper scoring rules are the formal reason a forecast can be *trusted* by a relying party, and the mechanism by which honest reporting is incentivised. Good's theorem is the decision-theoretic statement: the forecast that maximises expected score is the forecast of the true probability, so a Principal who scores the Executor's estimates with a proper rule obtains, over repeated engagements, a signal about the Executor's beliefs rather than about the Executor's incentives to please. This is the formal home of the seed's "it is a different kind of decision model" — the estimate is not a state-evaluation with a confident conclusion; it is a *probability distribution* whose integrity is protected by the scoring rule used to check it. The paper should make this its central formal point about the estimate.

**(d) Flag.** VERIFIED.

**A10.4 Three-point estimation of durations**

**(a) Concept.** Where duration must be estimated before execution, a three-point specification — optimistic, most likely, pessimistic — can be converted into an expected duration by a weighted formula, and the spread between the extremes is itself an explicit statement of the estimate's uncertainty.

**(b) Source.** Malcolm, D. G., Roseboom, J. H., Clark, C. E. & Fazar, W. (1959), 'Application of a Technique for Research and Development Program Evaluation', *Operations Research*, 7(5), 646–669. doi:10.1287/opre.7.5.646 — **VERIFIED**

**(c) Mapping.** This is the operational form of the seed's "a quantified prediction of scope, cost, and time, issued before the work, under uncertainty". The three-point estimate is the minimal sufficient representation of a forecast under uncertainty, and it forces the Executor to state the *spread*, not merely the point. The paper should note that a point estimate alone is not an attestation in the seed's sense: the signature that distinguishes an estimate from an opinion is the explicit statement of the range within which the outcome is claimed to lie. This is a small but real formal requirement the seed's text does not state, and the paper can supply it.

**(d) Flag.** VERIFIED.

### A11. Automation, mode error and the skipped reflector

**A11.1 Levels of human interaction with automation**

**(a) Concept.** Automation may be classified along two dimensions: the *information acquisition* it supplies to the human (whether the human is informed of the automation's status and its intent) and the *authority to select* the action (whether the human may override or veto). Automation that omits information about itself, or that removes the human's authority to intervene, produces failures that are systematic rather than random.

**(b) Source.** Parasuraman, R., Sheridan, T. B. & Wickens, C. D. (2000), 'A Model for Types and Levels of Human Interaction with Automation', *IEEE Transactions on Systems, Man, and Cybernetics — Part A*, 30(3), 286–297. doi:10.1109/3468.844354 — **VERIFIED**

**(c) Mapping.** The formal vocabulary for the seed's failure mode that "System 3 colonises the reaction loop". The seed's architecture is the *high* corner of this design space: the external component has authority to act, and the human (System 2) retains authority to intervene — but the seed's mediation requirement means that the human's authority is exercised *before* action, not during it. Parasuraman, Sheridan and Wickens give the paper the taxonomy with which to state precisely when the arrangement fails: when the executor's output is delivered to the action point without an adjudication step, the human has been given authority without information, which is the worst cell in the design space.

**(d) Flag.** VERIFIED.

**A11.2 The irony of automation**

**(a) Concept.** Automation that removes human involvement also removes the human's opportunity to learn about the system, so the human becomes progressively less able to intervene competently when automation does fail; the reliability of the automation therefore comes to depend on the operator's continued involvement, which automation was introduced to eliminate.

**(b) Source.** Bainbridge, L. (1983), 'Ironies of Automation', *Automatica*, 19(6), 775–779. doi:10.1016/0005-1098(83)90046-8 — **VERIFIED**

**(c) Mapping.** This is the formal home of the seed's "dependence asymmetry" — if System 1's scripts only ever arrive from outside, the inner layers quietly stop being able to act when the surface is gone. Bainbridge's irony is that perfect automation is self-defeating because it removes the practice that keeps human competence alive. The seed's module doctrine ("hand steering with no electricity at the bottom — the deepest layer must be able to run, reduced but real, with System 3 entirely dark") is the correct response to Bainbridge: preserve the ability to operate without the automation, and keep the practice that maintains it. The paper should cite this, because it converts the seed's *engineering instinct* into a *cited result*, and because Bainbridge's mechanism — loss of skill through loss of involvement — is precisely the mechanism by which the seed's "swamp" (an unledgered fleet that grows until re-reading costs more than redoing the work) degrades the whole arrangement.

**(d) Flag.** VERIFIED.

**A11.3 Automation bias and commission bias**

**(a) Concept.** Automation bias is the tendency to accept an automated recommendation as correct, omitting necessary actions; commission bias is the tendency to follow an automated directive to take an incorrect action. Both are amplified by time pressure and by task complexity, and both are reduced by explicit confirmation and by the display of information about the automation's reliability.

**(b) Source.** Parasuraman, R. & Riley, V. (1997), 'Humans and Automation: Use, Misuse, Disuse, Abuse', *Human Factors*, 39(2), 230–253. doi:10.1518/001872097778543886 — **VERIFIED**
Parasuraman, R. & Manzey, D. H. (2010), 'Automation Bias: A Systematic Review of Frequency, Effect Mediators, and Mitigators', *Human Factors*, 52(3), 381–410. doi:10.1177/0018720810376055 — **VERIFIED**

**(c) Mapping.** The seed's "the skipped reflector — the unverified relay" is automation bias in its purest form, and the seed's claim that "one unexamined relay is a mistake, a fleet of them is a personality" is a claim about *scale* that the 2010 systematic review supports: bias is frequency-dependent, and in time-pressured or high-complexity tasks the propensity to accept an automation's output rises. Parasuraman–Manzey also supply the mitigators the seed implicitly relies on — explicit confirmation, and the display of reliability information — which in the seed's architecture corresponds to *receipts* and to a public calibration record. This gives the paper the mechanism for why the certificate chain is a cognitive instrument and not merely a legal one.

**(d) Flag.** VERIFIED.

**A11.4 Self-preference in machine evaluators**

**(a) Concept.** When a language model is asked to evaluate outputs, it systematically rates its own generations higher than equivalent outputs by other models, and it also exhibits position bias in the ordering of presented options; both distortions undermine the use of machine evaluation as an adjudication step.

**(b) Source.** Panickssery, A., Bowman, S. R. & Feng, S. (2024), 'LLM Evaluators Recognize and Favor Their Own Generations', arXiv:2404.13076 — **VERIFIED** (arXiv API record)

**(c) Mapping.** This is the directly relevant limit on the seed's practical arrangement, in which a boundary function verifies the fleet's output before it reaches the principal. If the adjudicator is an instance of the same family as the producers, the adjudication is not independent. The paper should use this to state the limitation precisely: the architecture's mediation requirement presupposes an adjudicator that is *not* correlated with the producer in its errors, and the current practice of adjudicating agent output with agent judgement does not establish this. This is a limitation the paper must state, and it is a genuine one rather than a cosmetic concession.

**(d) Flag.** VERIFIED.

### A12. Specification as test

**A12.1 Hoare logic and the specification as an obligation**

**(a) Concept.** A program may be specified by preconditions, postconditions and invariants, with the correctness of the program understood as the guarantee that the postcondition holds whenever the precondition does; correctness is then defined relative to a written specification rather than relative to an impression of behaviour.

**(b) Source.** Hoare, C. A. R. (1969), 'An Axiomatic Basis for Computer Programming', *Communications of the ACM*, 12(10), 576–580. doi:10.1145/363235.363259 — **VERIFIED**

**(c) Mapping.** The formal analogue of the seed's "the state on return is therefore not an impression but a comparison, line by line against a specification written in advance: every gap is a finding, everything matching is silent". Hoare gives the paper the notion of a *silent* case (the postcondition holds; nothing is reported) and a *reported* case (the guarantee is violated; a counterexample is produced), which is exactly the asymmetry the seed describes. More importantly, it licenses the seed's strongest methodological claim: a specification written in advance can be *checked against*, so a conformance finding is objective rather than impressionistic. The paper should note the honest limit: Hoare's correctness is with respect to the specification and the program as given, and says nothing about whether the specification was the right one — which is the seed's own admission, when the specification is written by the Principal.

**(d) Flag.** VERIFIED.

**A12.2 Metrics, targets and the measure–target inversion**

**(a) Concept.** When a measured quantity becomes a target, the measurement ceases to be a good indicator of the objective, because the measured quantity ceases to be a faithful proxy for it; several distinct failure modes of optimisation against metrics can be distinguished.

**(b) Source.** Manheim, D. & Garrabrant, S. (2018), 'Categorizing Variants of Goodhart's Law', arXiv:1803.04585 — **VERIFIED** (arXiv API record)

**(c) Mapping.** The necessary sceptical apparatus for the seed's architecture, and the source of the paper's most important limitation. If the realisation-against-forecast burn-down becomes the Executor's measured target, the Executor will optimise against the measurement rather than against the specification; if the specification itself becomes the target, the specification will be read narrowly. This is the formal reason the seed's "the four lines are: the health of the crew, the condition of the boat, the number of fish, and what supplies need to be replenished" cannot be a complete specification — a complete measurable specification is precisely the object that Goodhart's law defeats. The paper should state plainly that the architecture trades off objectivity against completeness, and that the specification must be allowed to contain items that are *not* measured, at the cost that those items will be under-served — which is Holmström–Milgrom's multitask distortion (A4.2) arriving by a different route.

**(d) Flag.** VERIFIED.

### A13. External memory: the structured external store and its failure mode

**A13.1 External representation and the working environment**

**(a) Concept.** In distributed cognitive systems, representational artefacts do not merely store information; they *reconfigure* the task, distributing the work between person and artefact so that the division of labour, not the person's capacity, determines what is achievable.

**(b) Source.** Hollan, J., Hutchins, E. & Kirsh, D. (2000) [as at A1.2]; Hutchins, E. (1995) [as at A1.2] — **VERIFIED**

**(c) Mapping.** The seed's "the quilt's active ledger is System 3's memory discipline, the paper made traceable and rewindable" is the seed's own recognition that external memory must be *structured* to be useful, and the seed's "the swamp — external memory without structure or ledger discipline is a pile, not a system" is the failure of external representation to reconfigure the task in a helpful way. Hutchins supplies the formal framing: an artefact that is merely a store increases retrieval cost and adds nothing; an artefact that carries the coordination (a manifest, a ledger, a queue) becomes part of the functional system and lowers the person's load. The paper should use this to specify the *design requirement* for System 3's memory layer: it must carry the coordination, not merely the record.

**(d) Flag.** VERIFIED.

### A14. The superintelligence framing

**A14.1 The singularity as a property of an arrangement**

**(a) Concept.** The philosophical analysis of superintelligence asks what the relevant unit of analysis is: whether the achievement of superintelligence is a property of a mind, of an organisation of minds and machines, or of an arrangement of them; the analysis distinguishes gradual improvement from discontinuous improvement and separates the claim about *capability* from the claim about *speed of change*.

**(b) Source.** Chalmers, D. J. (2010), 'The Singularity: A Philosophical Analysis', *Journal of Consciousness Studies*, 17, 7–65; reprinted (2016) in *Science Fiction and Philosophy: From Time Travel to Superintelligence*, 171–224. — **VERIFIED** (author's own publication list, consc.net)

**(c) Mapping.** Chalmers supplies the paper's *framing* citation: the seed's claim that "superintelligence, on this account, is not a single brain that crosses some size threshold and ignites. It is the quality of the external loop and of its composition back into the person" is a claim about the unit of analysis, and Chalmers's paper is the standard statement of that question. The paper should cite it in the introduction, acknowledge that Chalmers's own answer differs from the seed's — he treats the question of whether an arrangement of minds and machines could constitute a mind, and does not settle it in the seed's favour — and then state the seed's answer as the paper's own claim, to be defended on the argument rather than borrowed from the citation.

**(d) Flag.** VERIFIED.

---

## Part B — Mandatory element: the estimate as a predictive attestation

### B0. Casey's text (quoted verbatim; this is the mandate)

> "The most important job for a contractor is the estimate. If they get known for nailing estimates, that is a different kind of decision model."

And, from the seed's trust-architecture passage:

> "Within that architecture, the contractor's single most important product is not the building — it is the **estimate**: a quantified prediction of scope, cost, and time, issued *before* the work, under uncertainty, by the executor himself. Casey names it a different kind of decision model, and it is: most decision models judge a present state, but the estimate judges a future one, and stakes the judge's standing on the outcome. It is calibration made public and priced — base rates induced from every past job, re-weighted by a reading of this one — and the whole trust line leans on it, because the loan is *sized* by the estimate. A contractor known for nailing estimates collapses the risk premium everyone else in the line must charge: the bank lends calmly, the homeowner plans truly, and the estimate-versus-actual delta at completion becomes one more receipt — the forecasting certificate, renewed or dented with every job."

### B1. The formalisation

**Definition (Predictive Attestation).** A *predictive attestation* is a quantified forecast, issued by an executing party before an engagement, comprising (i) point values and stated spreads for scope, cost and duration, (ii) the forecaster's internal probability distribution over the future state, (iii) a reference to the pre-registered specification against which the future state will be evaluated, and (iv) an explicit undertaking that the issuing party's standing with the Certifier will be updated by the realised-against-forecast comparison at completion.

Four properties distinguish it from the backward-looking receipt:

| | Backward-looking receipt | Predictive attestation |
|---|---|---|
| Temporal orientation | Evaluates a realised past state | Evaluates an unrealised future state |
| Epistemic object | A fact already determined | A probability distribution over an undetermined state |
| Direction of the certificate | Attests *what was done* | Attests *what will be achieved* |
| Failure mode | Fabrication or transmission error | Over-optimism, drift, or selective scope |
| Scoring | Comparison against specification | Comparison against realisation, under a proper scoring rule |

**Why it is a different kind of decision model.** Most decision models in the seed's taxonomy are *state-evaluative*: they take a representation of a current state and select among options, with the evaluation being verifiable against the representation. The estimate is *future-evaluative*: it commits to a claim about a state that does not yet exist, and the claim is therefore not verifiable at the moment of issuance — only scoreable afterwards. This changes the decision problem in three ways. (i) The output is a distribution, not a verdict, and so must be elicited and then *scored*, not merely asserted. (ii) The claim cannot be settled by inspection at issue time, so its credibility must come from elsewhere: from the issuer's history, from the issuer's standing, or from the structure of the adjustment rule the Principal applies in response. (iii) The evaluation of the claim is *stochastic*: a single realisation cannot distinguish skill from luck, and hence any evaluation of the issuer must aggregate over repeated engagements.

**Collateralisation.** The estimate collateralises the issuer's standing. This is the formal content of Casey's "stakes the judge's standing on the outcome". The issuer's *certification standing* — the value of its attestation to third parties — is a function of a two-component state: (a) its **conformity standing**, established by conformance to specifications in past engagements and by the Certifier's attestation of that conformity; and (b) its **calibration standing**, established by the realised-against-forecast record, scored under a proper scoring rule. The estimate updates (b) at each engagement's completion. Concretely: the executor's standing is a *depreciating asset with respect to conformity* and a *renewable asset with respect to calibration*.

**Calibration history as a renewable component of certification.** This is the central technical claim and it has an exact formal statement. Let the executor's forecast at engagement *j* be the distribution $F_j$ over the realisation $X_j \in \mathbb{R}^k$ (scope, cost, duration), let $S$ be a strictly proper scoring rule (Brier, or Murphy), and let the realised value be $x_j$. Define the executor's *calibration deficit*

$$d_j = \mathbb{E}[S(F_j, X_j)] - \min_{F} \mathbb{E}[S(F, X)],$$

the excess expected score above the score an oracle distribution would achieve. Then $d_j \ge 0$, with equality iff $F_j$ is the true conditional distribution. The executor's **calibration standing** is a monotone function of the running average $\bar{d}_{1:n} = \frac{1}{n}\sum_{j \le n} d_j$. Three consequences follow, and each is a formal home for Casey's intuition:

1. **A single estimate does not update standing.** $d_j$ for one engagement is a noisy realisation; only the sequence identifies the executor's forecasting *procedure*. (Murphy's decomposition, A10.2.)
2. **Calibration is a stock, not a flow, and it is renewable.** $\bar{d}$ falls as $n$ grows for an executor whose procedure improves, and the certification chain can therefore treat calibration as a depreciable-then-replenishable component of standing. This is exactly the "renewed or dented with every job" of the seed.
3. **Calibration standing is priced.** Because the Principal's exposure is sized by the estimate (below), and because the estimate is scored, the executor's expected score is a function of its calibration standing. The market consequence — the collapse of the risk premium for a well-calibrated executor — is the Spence condition (A6.1) applied to a *forecast* rather than to a credential.

**Exposure sizing and the load-bearing quantity.** The seed's claim is that "the whole trust line leans on it, because the loan is sized by the estimate". Formally: let the Principal's exposure $E$ be a function $E = \phi(F)$ of the forecast. Then the *exposure error* — the difference between the exposure actually extended and the exposure justified by the realised outcome — is $\phi(F) - E(x)$, and the expected exposure error is $\mathbb{E}[\phi(F) - E(x)]$. By the envelope theorem and the definition of properness, when $\phi$ is the decision rule that maximises expected utility under the forecast distribution $F$ (and the Principal's utility is linear in the outcome, or $F$ is the correct distribution), this expected error is zero and the forecast is *sufficient* for the decision. Where $F$ is miscalibrated, the expected exposure error is non-zero and is a function of the miscalibration. Therefore: **the load-bearing quantity of the trust chain is not the Executor's conformance alone but the joint quantity of conformance and calibration, and the calibration component is the one that scales with the size of the Principal's exposure.** This is a precise, and slightly uncomfortable, result: the better the Executor's *work* and the worse the Executor's *forecasts*, the worse the outcome for the Principal, because the Principal sizes its exposure on the forecast.

**Why this is not simply a signalling story.** The estimate differs from a credential in one decisive respect: a credential is *verifiable at issue time* (it has been assessed by a Certifier and its validity is publicly checkable), whereas an estimate is *not verifiable at issue time* and can only be scored afterwards. This is why the estimate is "a different kind of decision model" and why it requires its own apparatus — a proper scoring rule (A10.3), a three-point spread (A10.4), a calibration record (A10.1, A10.2), and a disclosure incentive (A5.2, A5.3). The seed is right that the Executor who is "known for nailing estimates" occupies a different position in the trust architecture; the formal literature explains why: the estimate is the only instrument in the architecture that is *forward-looking and collateralised*, and therefore the only one whose value must be maintained continuously rather than certified once.

**Formal homes for the estimate doctrine** (all cited with flags above):

| Formal home | What it supplies | Source | Flag |
|---|---|---|---|
| Calibration & proper scoring rules | the metric that defines "nailing estimates"; the separation of procedure from luck | Brier 1950; Murphy 1973; Gneiting & Raftery 2007; Good 1952 | VERIFIED |
| Decision-theoretic forecasting | why an honest distribution, not a point, is the rationally reportable object; why the Principal may rely on it | Good 1952 | VERIFIED |
| Three-point estimation | the minimal sufficient form of a forecast under uncertainty; explicit spread | Malcolm et al. 1959 | VERIFIED |
| Track-record signalling | why a calibration history separates types; why the signal is credible | Spence 1973 | VERIFIED |
| Reputation as a substitute for enforcement | why a miscalibrated estimator's reputation decays; why detection must be built in | Kreps et al. 1982 (verified); Greif & Laitin 2004 (unverified) | mixed — flagged |
| Disclosure incentives | when an Executor has an incentive to disclose an unfavourable forecast early | Milgrom 1991 | VERIFIED |
| Pricing the disclosure | how a relying party should adjust exposure in response to an interested party's report | Milgrom & Roberts 1986 | VERIFIED |
| Quality uncertainty and certification | why certification is the only way to price execution at a distance | Akerlof 1970 | VERIFIED |
| Surety and performance bonding | the institutional form in which a third party prices the Executor's forecast risk and monitors execution | Giuffrida & Rovigatti 2022; Patel 2025 | VERIFIED |
| Forecast error as a risk-management instrument | the systematic optimism of project forecasts, and the "outside view" as the corrective | Flyvbjerg 2006, 2013 (below) | VERIFIED |
| Common knowledge and public registries | why the calibration record must be public for the trust to transfer | Aumann 1999 | VERIFIED |
| Conditions for expert intuition | when a compiled forecast is reliable at all: regularity plus feedback | Kahneman & Klein 2009 | VERIFIED |

**A13. Addendum — the estimate as an audited history of realised-against-forecast outcomes.** In addition to the per-engagement estimate and its calibration record, the architecture requires a *retrospective audit record* in which, for a specified window of prior engagements, the realised outcome is compared against the forecast, the comparison is scored under a proper scoring rule, and the resulting sequence of scores is published. This is what makes the phrase "known for nailing estimates" checkable by a third party rather than merely reported.

**A14. Addendum — forecast skew and the outside view.** The literature on project forecasting documents a systematic and directional error that is not noise: forecasts are optimistically biased, and the bias grows with project scale. Flyvbjerg, B. (2006), 'From Nobel Prize to Project Management: Getting Risks Right', *Project Management Journal*, 37(3), 5–15. doi:10.1177/875697280603700302 — **VERIFIED**; and Flyvbjerg, B. (2013), 'Quality Control and Due Diligence in Project Management: Getting Decisions Right by Taking the Outside View', *International Journal of Project Management*, 31(5), 760–774. doi:10.1016/j.ijproman.2012.10.007 — **VERIFIED**. This is materially important for the seed's doctrine: if miscalibration is *systematically one-directional* rather than random, then the "renewed or dented" mechanism will not correct itself by averaging over many engagements — it will settle at a biased level. The architecture therefore needs a *correction* device, not just a scoring device. The three candidate corrections the literature supplies are: (i) the outside view (base rates from comparable projects, re-weighted by the specifics of this one — which is precisely the seed's "base rates induced from every past job, re-weighted by a reading of this one"), (ii) a reference-class adjustment applied at issue, and (iii) a scoring rule that penalises asymmetric error, i.e. a utility-weighted rather than strictly proper rule. The paper should note that the seed's own formulation contains the correction (the base-rate re-weighting) and that the calibration literature confirms it is necessary.

---

## Part C — Mandatory addendum: the forecast as a debt schedule; the burn-down conformance test

### C0. Casey's text (quoted verbatim; this is the mandate)

> "Every other link in the chain is a debt that the contractor is now trying to pay on time."

### C1. The formalisation

**Definition (Forecast-denominated obligation).** Once a predictive attestation $F$ has been issued and *relied upon* by a Principal, each subsequent obligation in the chain is a **forecast-denominated obligation**: an obligation whose discharge is measured against the forecast rather than against a free-standing specification. The set of these obligations, ordered in time, constitutes a **repayment schedule** for the forecast.

**Definition (Discharge).** An obligation $o_i$ in the repayment schedule is *discharged on time* if it is discharged at or before its due time and in conformity with the specification. Let $d_i \ge 0$ denote the delay in discharge of obligation $i$, measured in the units of the schedule's own time base. The **interest paid in time** on the whole schedule is

$$\iota(F) \;=\; \sum_i \lambda_i \, d_i,$$

where $\lambda_i \ge 0$ are the schedule's weights (uniform, or discounted by the distance of $o_i$ from issue).

**Why time is the non-borrowable currency.** Every other term in the chain is transferable: capital can be borrowed against, and so can labour, materials and information. Time cannot. The Principal's delay in discovering a defect can be compensated; the Executor's delay in *discharging an obligation before its due time* cannot be made good, because the next obligation's due time is itself fixed by the forecast. This is the formal content of Casey's phrase: in a forecast-denominated schedule, the only resource that cannot be re-purchased is schedule time, and so delay is *interest paid in time*. The paper should make the point that this is a strict claim about the schedule's currency, not a metaphor, and it is the reason the seed's architecture must continuously measure the burn-down rather than merely check the terminal state.

**The conformance test the addendum implies.** Terminal conformance to the specification answers: *was the final state conforming?* It does not answer: *was the schedule being met while correction was still cheap?* The addendum therefore requires a second, continuous test — the **realised-against-forecast burn-down** — with three specific requirements:

1. **Continuous.** At each measurement point, the realised state is compared against the *portion of the forecast* attributable to work that should have been complete by that point. The comparison is against the forecast's own shape over time, not merely against its terminal value.
2. **Delta surfaced while correction remains cheap.** The comparison must be reported at a cadence chosen so that the remaining work at the point of reporting is still remediable at acceptable cost. This is a *timing* requirement on the measurement, not merely a requirement that measurement occur.
3. **Continuous measurement subsumes but does not replace terminal conformance.** The burn-down detects divergence early; it does not establish that the final state conforms. Both are required, and they are different tests.

This is, in substance, the earned-value discipline, transferred from cost and schedule accounting to an attestation architecture. See C2.

### C2. Formal homes for the burn-down and schedule-risk discipline

**C2.1 Earned value management**

**(a) Concept.** Earned value management integrates scope, schedule and cost into a single performance measurement against a performance measurement baseline: work progress is quantified as the budgeted value of work scheduled, work performed and work actually completed, and the differences between the three yield cost and schedule variances that are computed net of each other rather than in isolation.

**(b) Source.** SAE EIA 748D-2019, *Earned Value Management Systems* (International Standard; the successor to ANSI/NECA 914-2012) — **VERIFIED** (ANSI webstore record; the 2012 NECA 914 edition itself is **UNVERIFIED** in this session — the store lists 748D-2019 as "most recent")
GAO (2020), *Cost Estimating and Assessment Guide: Best Practices for Developing and Managing Program Costs*, GAO-20-195G, U.S. Government Accountability Office, March 2020. — **VERIFIED**

**(c) Mapping.** This is the direct institutional home of the burn-down conformance test, and the paper should say so rather than reinventing it. The EVM principles require: a performance measurement baseline established in advance; actual costs recorded; accomplishments assessed objectively at the work-performance level; variances analysed and their forecast impacts computed, with an estimate at completion prepared from performance to date and remaining work. The last clause is *precisely* the seed's doctrine — an estimate at completion is itself a renewed predictive attestation, issued mid-engagement, and it is scored against the original forecast when the engagement closes. The seed's architecture is EVM with the roles re-specified: the baseline is the specification, the earned value is the realised conformance against the baseline, the estimate at completion is a second predictive attestation, and the variance analysis is the continuous delta surfaced while correction is cheap. The GAO guide additionally supplies the vocabulary the paper needs for the *estimate* itself: a cost estimate is "the summation of individual cost elements, using established methods and valid data, to estimate the future costs of a program, based on what is known today", with four characteristics — comprehensive, well documented, accurate and credible — and a twelve-step process; and the guide explicitly covers sensitivity and risk analysis, and the auditing and validation of the estimate. Those four characteristics are precisely the properties the seed's estimate must have if it is to be an attestation rather than a guess.

**(d) Flag.** VERIFIED (SAE EIA 748D-2019 and GAO-20-195G); the ANSI/NECA 914-2012 edition is flagged at §4.

**C2.2 Three-point estimation and schedule risk**

**(a) Concept.** [As at A10.4] The three-point specification, with its weighted expected value and its explicit spread, is the canonical minimal representation of a duration forecast under uncertainty; the spread is a quantified statement of the estimate's own uncertainty, and the difference between optimistic and pessimistic values is the quantity that risk analysis is built on.

**(b) Source.** Malcolm, D. G., Roseboom, J. H., Clark, C. E. & Fazar, W. (1959) — **VERIFIED**

**(c) Mapping.** The schedule-risk discipline of the seed's addendum requires the forecast's spread, not merely its point value, because the burn-down test is a comparison of *realised progress* against a *band* of expected progress: the delta is only a finding when it breaches the band, and the band's width is what distinguishes a normal execution from a divergence. The PERT construction gives the paper the minimal sufficient form: three numbers per quantity, with the spread as the explicit uncertainty statement.

**(d) Flag.** VERIFIED.

**C2.3 Systematic optimism and the outside view**

**(a) Concept.** [As at A14 of Part B] Project forecasts are systematically optimistically biased rather than randomly noisy; the "outside view" corrects for this by requiring the forecast to be conditioned on base rates from a reference class of comparable projects, with the specifics of the individual case used only to adjust the base rate, never to override it.

**(b) Source.** Flyvbjerg, B. (2006), *Project Management Journal*, 37(3), 5–15; Flyvbjerg, B. (2013), *International Journal of Project Management*, 31(5), 760–774 — **VERIFIED**

**(c) Mapping.** The burn-down test and the calibration record together make the seed's bias correction *observable*: if the executor's forecasts are systematically optimistic, its burn-down will show consistent under-performance against plan, and the calibration record will show a consistent negative deficit. A burn-down test without a calibration record cannot distinguish a biased forecaster from an unlucky one; with both, the two are separable, and the corrective (the outside-view re-weighting) can be specified. This is the paper's best argument that the two tests must be co-designed: the continuous test detects, the scored record diagnoses.

**(d) Flag.** VERIFIED.

**C2.4 What the literature does *not* supply, and what the seed adds**

The earned-value and schedule-risk literatures supply the *measurement* discipline but not the *attestation* semantics. EVM measures performance against a baseline; it does not treat the baseline as a public commitment whose breach is a reputational event, nor does it treat the estimate as an instrument whose accuracy determines the price at which another party extends exposure. The seed's contribution, stated formally, is:

> The predictive attestation is the only instrument in the chain that is simultaneously (i) forward-looking, (ii) priced by the relying party, (iii) collateralised on the issuer's standing, and (iv) scoreable only in the aggregate. The burn-down is the only instrument that is (i) continuous, (ii) early-warning, and (iii) conformant to a pre-registered specification. Together, and only together, they constitute the debt schedule.

### C3. The specification's final item is itself a predictive attestation

The seed's own worked specification is four items long, and the fourth points forward. In literal terms, the seed's enumeration is: (i) the condition of the operating personnel; (ii) the condition of the physical assets; (iii) the quantity of output obtained; and (iv) the replenishment required for the next period. The seed's observation is that the fourth line is the only one that points forward — the requirement of the next period is being prepared inside the inspection of the current one — and that a specification ending in its own replenishment list is a self-restarting loop.

This has a formal consequence the seed does not draw, and it is worth the paper's attention because it links the two mandatory elements. **The final item of a specification whose fourth element is forward-looking is not a conformance target at all; it is a predictive attestation nested inside the conformance specification.** The first three items are checked against the realised state (receipts). The fourth is a forecast of a future state, and is therefore scored against realisation in the next period (a predictive attestation, per D10 in the outline, and per Part B here).

Two consequences follow.

1. **The specification is not homogeneous.** A specification that mixes checkable items with a forward-looking commitment cannot be verified by a single mechanism. The paper's definitions must treat the specification as having two parts with different verification regimes: a conformance part, checked against realised state at closure, and a commitment part, checked against realisation only in a later period and only in aggregate. The seed's four-line example is the smallest illustration, and the paper should use it, because it shows that the architecture is not an invention imposed on the seed but a structure the seed's own example already has.
2. **The repayment schedule spans periods, not just engagements.** If the specification's final item requires the next period to be prepared and resourced, then the obligations that arise after the engagement closes are forecast-denominated against *that* item, not only against the engagement's own estimate. The architecture therefore has a recurrence: each period's conformance finding produces the next period's predictive attestation, which is the formal content of the seed's claim that a self-restarting specification is a loop. The paper should state this as a structural property and then say plainly that it is the property the seed means by "loop", which the paper must not use.

**Citation discipline.** Nothing in the verified literature states this. The closest formal support is the earned-value requirement that an estimate at completion be prepared from performance to date and the remaining work (RP C2.1, GAO-20-195G), which is the same nesting operation one level up: the estimate for the remaining work is issued from within the review of completed work. The paper should present the nesting as its own contribution, cite GAO-20-195G for the local instance, and mark the general claim as the paper's.

---

## Part D — Mapping table: seed construct → formal concept → source

| # | Seed construct (literal name) | Formal concept | Primary source | Flag |
|---|---|---|---|---|
| 1 | Exteriorised intelligence working for the thinker | extended mind thesis | Clark & Chalmers 1998 | VERIFIED |
| 2 | Cognition spread across persons and artefacts | distributed cognition | Hutchins 1995; Hollan, Hutchins & Kirsh 2000 | VERIFIED |
| 3 | Compiled automatic competence | dual-process Type 1 | Evans & Stanovich 2013; Chase & Simon 1973 | VERIFIED |
| 4 | Deliberate reflector with a time budget | bounded rationality; resource limits | Simon 1955; Sweller 1988; Miller 1956 | VERIFIED |
| 5 | Reflector's aim set by responsibility | agency; monitoring structure | Fama & Jensen 1983 | VERIFIED |
| 6 | Compiled internal storage relieved by a surface | working-memory limits; external memory | Sweller 1988 | VERIFIED |
| 7 | Fixed external component callable inside a script | symbol grounding problem | Harnad 1990 | VERIFIED |
| 8 | Borrowed external reflector with conceptual capacity | delegated epistemics | Brooks 1991 | VERIFIED |
| 9 | External component's standing with the Certifier | reputation; certification intermediary | Spence 1973; Brealey, Leland & Pyle 1977; Fukuyama 1995 | VERIFIED |
| 10 | Public registry of standing | common knowledge | Aumann 1999 | VERIFIED |
| 11 | Chain of certificates underwriting one another | certification path; transitive trust | RFC 5280; Falcone & Castelfranchi 2012 | VERIFIED |
| 12 | Receipt for every relayed claim | chain of custody | Casey 2019 | VERIFIED |
| 13 | Authority held by the Certifier, not the Executor | least privilege; capabilities; information-flow control | Saltzer & Schroeder 1975; Dennis & Van Horn 1966; Denning 1976; NIST SP 800-207 | VERIFIED |
| 14 | Each party's not-knowing as design | information partition; ignorance as load-bearing | Denning 1976; Aumann 1999 | VERIFIED |
| 15 | Executor with no private stake in the outcome | fiduciary loyalty; conflict of interest | [Clark 1993 UNVERIFIED]; Fama & Jensen 1983 (verified substitute) | mixed — flagged |
| 16 | **Estimate: forecast issued before engagement** | **predictive attestation; proper scoring; calibration** | **Brier 1950; Murphy 1973; Gneiting & Raftery 2007; Good 1952; Malcolm et al. 1959** | **VERIFIED** |
| 17 | Exposure sized by the estimate | pricing of information; adjustment rule | Milgrom & Roberts 1986 | VERIFIED |
| 18 | Risk premium collapsing for a calibrated estimator | signalling; surety pricing | Spence 1973; Giuffrida & Rovigatti 2022 | VERIFIED |
| 19 | Calibration history as renewable certification | reputation as asset; repeated interaction | Kreps et al. 1982; [Greif & Laitin 2004 UNVERIFIED] | mixed — flagged |
| 20 | Disclosure duty on the estimate | good-news/bad-news principle | Milgrom 1991 | VERIFIED |
| 21 | **Forecast as debt; schedule as repayment** | **earned value management; schedule risk** | **SAE EIA 748D-2019; GAO-20-195G; Malcolm et al. 1959; Flyvbjerg 2006** | **VERIFIED** |
| 22 | Continuous burn-down with early surfacing | performance measurement baseline; variance analysis | GAO-20-195G | VERIFIED |
| 23 | Specification written in advance, checked on return | specification as obligation; conformance | Hoare 1969 | VERIFIED |
| 24 | Specification as the test in the loop | instrumentation: the measure defines the loop | Manheim & Garrabrant 2018 | VERIFIED |
| 25 | External component wired straight to action | levels of automation; irony of automation | Parasuraman, Sheridan & Wickens 2000; Bainbridge 1983 | VERIFIED |
| 26 | Unverified relay at the boundary | automation bias; self-preference in evaluators | Parasuraman & Manzey 2010; Panickssery et al. 2024 | VERIFIED |
| 27 | Unledgered external memory | coordination carried by the artefact | Hollan, Hutchins & Kirsh 2000; Hutchins 1995 | VERIFIED |
| 28 | Inner layers failing when the surface is gone | skill decay through loss of practice | Bainbridge 1983; Ericsson et al. 1993 | VERIFIED |
| 29 | Intelligence as a property of the circuit | unit of analysis in superintelligence | Chalmers 2010 | VERIFIED |
| 30 | Specifications that omit what matters | multitask distortion; incomplete contracts | Holmström & Milgrom 1991; Hart & Moore 1988 | VERIFIED |
| 31 | Specification whose final item points to the next period | nested predictive attestation; recurrence of the repayment schedule | RP C3 (paper's own argument; local instance at GAO-20-195G) | VERIFIED (instance) / paper's own (generalisation) |

---

## Part E — Consolidated verified bibliography

Format: Author (Year). *Title*. Venue, volume(issue), pages. DOI or identifier. — **VERIFIED** unless marked otherwise.

1. Clark, A. & Chalmers, D. (1998). 'The Extended Mind'. *Analysis*, 58(1), 7–19. doi:10.1093/analys/58.1.7
2. Hutchins, E. (1995). *Cognition in the Wild*. MIT Press. doi:10.7551/mitpress/1881.001.0001
3. Hollan, J., Hutchins, E. & Kirsh, D. (2000). 'Distributed Cognition: Toward a New Framework for Human-Computer Interaction'. *ACM TOCHI*, 7(2), 174–196. doi:10.1145/353485.353487
4. Harnad, S. R. (1990). 'The Symbol Grounding Problem'. *Physica D*, 42(1–3), 335–346. doi:10.1016/0167-2789(90)90087-6
5. Brooks, R. A. (1991). 'Intelligence without Representation'. *Artificial Intelligence*, 47(1–3), 139–159. doi:10.1016/0004-3702(91)90053-M
6. Evans, J. & Stanovich, K. (2013). 'Dual-Process Theories of Higher Cognition'. *Perspectives on Psychological Science*, 8(3), 223–241. doi:10.1177/1745691612460685
7. Chase, W. & Simon, H. (1973). 'Perception in Chess'. *Cognitive Psychology*, 4(1), 55–81. doi:10.1016/0010-0285(73)90004-2
8. Kahneman, D. & Klein, G. (2009). 'Conditions for Intuitive Expertise: A Failure to Disagree'. *American Psychologist*, 64(6), 515–526. doi:10.1037/a0016755
9. Ericsson, K. A., Krampe, R. T. & Tesch-Römer, C. (1993). 'The Role of Deliberate Practice in the Acquisition of Expert Performance'. *Psychological Review*, 100(3), 363–406. doi:10.1037/0033-295X.100.3.363
10. Simon, H. A. (1955). 'A Behavioral Model of Rational Choice'. *QJE*, 69(1), 99–118. doi:10.2307/1884852
11. Sweller, J. (1988). 'Cognitive Load During Problem Solving: Effects on Learning'. *Cognitive Science*, 12(2), 257–285. doi:10.1016/0364-0213(88)90023-7
12. Miller, G. A. (1956). 'The Magical Number Seven, Plus or Minus Two'. *Psychological Review*, 63(2), 81–97. doi:10.1037/h0043158
13. Jensen, M. C. & Meckling, W. H. (1976). 'Theory of the Firm: Managerial Behavior, Agency Costs and Ownership Structure'. *JFE*, 3(4), 305–360. doi:10.1016/0304-405X(76)90026-X
14. Fama, E. F. & Jensen, M. C. (1983). 'Separation of Ownership and Control'. *JLE*, 26(2), 301–325. doi:10.1086/467037
15. Holmström, B. & Milgrom, P. (1991). 'Multitask Principal–Agent Analyses'. *JLEO*, 7, 24–52. doi:10.1093/jleo/7.special_issue.24
16. Hart, O. & Moore, J. (1988). 'Incomplete Contracts and the Theory of the Firm'. *JLEO*, 4(3). doi:10.1093/jleo/a036940 *(pagination not separately confirmed)*
17. Aumann, R. J. (1999). 'Interactive Epistemology I: Knowledge'. *International Journal of Game Theory*, 28(3), 263–300. doi:10.1007/s001820050111
18. Milgrom, P. (1991). 'Good News and Bad News: Representation Theorems and Applications'. *Bell Journal of Economics*, 12(2), 380–409. doi:10.2307/3003562 *(Crossref `issued` field carries an erroneous 1981; volume 12(2) is 1991)*
19. Milgrom, P. & Roberts, J. (1986). 'Relying on the Information of Interested Parties'. *RAND Journal of Economics*, 17(1), 18–36. doi:10.2307/2555625
20. Spence, M. (1973). 'Job Market Signaling'. *QJE*, 87(3), 355–374. doi:10.2307/1882010
21. Akerlof, G. A. (1970). 'The Market for "Lemons"'. *QJE*, 84(3), 488–500. doi:10.2307/1879431
22. Brealey, R., Leland, H. E. & Pyle, D. H. (1977). 'Informational Asymmetries, Financial Structure, and Financial Intermediation'. *Journal of Finance*, 32(2), 371–387. doi:10.1111/j.1540-6261.1977.tb03277.x
23. Weingast, B. R. (1997). 'The Political Foundations of Democracy and the Rule of Law'. *APSR*, 91(2), 245–263. doi:10.2307/2952354
24. Fukuyama, F. (1995). *Trust: The Social Virtues and the Creation of Prosperity*. Free Press.
25. Kreps, D., Milgrom, P., Roberts, J. & Wilson, R. (1982). 'Rational Cooperation in a Finitely Repeated Prisoners' Dilemma'. *Journal of Economic Theory*, 27(2), 245–252. doi:10.1016/0022-0531(82)90029-1
26. Giuffrida, L. M. & Rovigatti, G. (2022). 'Supplier Selection and Contract Enforcement: Evidence from Performance Bonding'. *Journal of Economics & Management Strategy*, 31(4), 980–1019. doi:10.1111/jems.12492
27. Patel, P. (2025). 'Bonding the Gap: Surety Bond Guarantee, Defaults, and Small Businesses'. *Managerial and Decision Economics*, 46(3), 1437–1458. doi:10.1002/mde.4447
28. Cooper, D., Santesson, S., Farrell, S., Boeyen, S., Housley, R. & Polk, W. (2008). *Internet X.509 Public Key Infrastructure Certificate and CRL Profile*. RFC 5280, IETF.
29. Casey, E. (2019). 'Trust in Digital Evidence'. *Digital Investigation*, 31, 200898. doi:10.1016/j.fsidi.2019.200898
30. Falcone, R. & Castelfranchi, C. (2012). 'Trust and Transitivity: How Trust-Transfer Works'. In *Advances in Intelligent and Soft Computing*, 179–187. doi:10.1007/978-3-642-28762-6_22
31. Saltzer, J. H. & Schroeder, M. D. (1975). 'The Protection of Information in Computer Systems'. *Proceedings of the IEEE*, 63(9), 1278–1308. doi:10.1109/PROC.1975.9939
32. Dennis, J. B. & Van Horn, E. C. (1966). 'Programming Semantics for Multiprogrammed Computations'. *CACM*, 9(3), 143–155. doi:10.1145/365230.365252
33. Denning, D. E. (1976). 'A Lattice Model of Secure Information Flow'. *CACM*, 19(5), 236–243. doi:10.1145/360051.360056
34. Rose, S., Borz, M., Conley, J., Gatford, J. & Marcus, J. (2020). *Zero Trust Architecture*. NIST SP 800-207.
35. Debenedetti, E., Shumailov, I., Fan, T., Hayes, J. et al. (2025). 'Defeating Prompt Injections by Design (CaMeL)'. arXiv:2503.18813.
36. Brier, G. W. (1950). 'Verification of Forecasts Expressed in Terms of Probability'. *Monthly Weather Review*, 78(1), 1–3. doi:10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2
37. Murphy, A. H. (1973). 'A New Vector Partition of the Probability Score'. *Journal of Applied Meteorology*, 12(4), 595–600. doi:10.1175/1520-0450(1973)012<0595:ANVPOT>2.0.CO;2
38. Gneiting, T. & Raftery, A. E. (2007). 'Strictly Proper Scoring Rules, Prediction, and Estimation'. *JASA*, 102(477), 359–378. doi:10.1198/016214506000001437
39. Good, I. J. (1952). 'Rational Decisions'. *JRSS Series B*, 14(1), 107–114. doi:10.1111/j.2517-6161.1952.tb00104.x
40. Malcolm, D. G., Roseboom, J. H., Clark, C. E. & Fazar, W. (1959). 'Application of a Technique for Research and Development Program Evaluation'. *Operations Research*, 7(5), 646–669. doi:10.1287/opre.7.5.646
41. Parasuraman, R., Sheridan, T. B. & Wickens, C. D. (2000). 'A Model for Types and Levels of Human Interaction with Automation'. *IEEE Trans. SMC-A*, 30(3), 286–297. doi:10.1109/3468.844354
42. Bainbridge, L. (1983). 'Ironies of Automation'. *Automatica*, 19(6), 775–779. doi:10.1016/0005-1098(83)90046-8
43. Parasuraman, R. & Riley, V. (1997). 'Humans and Automation: Use, Misuse, Disuse, Abuse'. *Human Factors*, 39(2), 230–253. doi:10.1518/001872097778543886
44. Parasuraman, R. & Manzey, D. H. (2010). 'Automation Bias: A Systematic Review'. *Human Factors*, 52(3), 381–410. doi:10.1177/0018720810376055
45. Panickssery, A., Bowman, S. R. & Feng, S. (2024). 'LLM Evaluators Recognize and Favor Their Own Generations'. arXiv:2404.13076.
46. Hoare, C. A. R. (1969). 'An Axiomatic Basis for Computer Programming'. *CACM*, 12(10), 576–580. doi:10.1145/363235.363259
47. Manheim, D. & Garrabrant, S. (2018). 'Categorizing Variants of Goodhart's Law'. arXiv:1803.04585.
48. Chalmers, D. J. (2010). 'The Singularity: A Philosophical Analysis'. *Journal of Consciousness Studies*, 17, 7–65; reprinted 2016 in *Science Fiction and Philosophy*, 171–224.
49. SAE EIA 748D-2019. *Earned Value Management Systems*. International Standard (successor to ANSI/NECA 914-2012).
50. GAO (2020). *Cost Estimating and Assessment Guide*. GAO-20-195G, U.S. Government Accountability Office, March 2020.
51. Flyvbjerg, B. (2006). 'From Nobel Prize to Project Management: Getting Risks Right'. *Project Management Journal*, 37(3), 5–15. doi:10.1177/875697280603700302
52. Flyvbjerg, B. (2013). 'Quality Control and Due Diligence in Project Management'. *International Journal of Project Management*, 31(5), 760–774. doi:10.1016/j.ijproman.2012.10.007

### E1. Flagged as UNVERIFIED (from memory) — must be re-checked before submission

53. Greif, A. & Laitin, D. D. (2004). 'A Theory of Enforcement'. *The Journal of Law and Economics*, 47(2), 533–552. — **UNVERIFIED**; no Crossref, OpenAlex, publisher, NBER-catalogue or RePEc record could be reached in this session (the publisher and RePEc are bot-protected; the Crossref deposit for the article is not exposed under a searchable query). Substitute: item 25 (Kreps et al. 1982, VERIFIED) carries the reputation-as-substitute argument that this citation would have carried.
54. Clark, R. C. (1993). 'The Duties of the Fiduciary'. *Yale Law Journal*, 102, 497. — **UNVERIFIED**. Substitute: items 14 and 15 (Fama & Jensen 1983; Holmström & Milgrom 1991), both VERIFIED.
55. Leland, H. E. & Pyle, D. H. (1977). 'Informational Asymmetries, Valuation, and Certification'. *Journal of Financial Economics*, 5(3), 323–349. — **UNVERIFIED**. Substitute: item 22 (Brealey, Leland & Pyle 1977, *Journal of Finance*), VERIFIED, and the journal-article record of the same authors' *Journal of Finance* paper.

### E2. Other items checked and deliberately not carried forward

- Bell & LaPadula (1973), *Protection of Information in Computer Systems* — no machine-readable record located in this session; not cited.
- Schwartz, Van Buggenum & McCune (2014), 'Attestation in the Cloud: A Survey' — no record located in this session; the attestation-chain argument is carried instead by RFC 5280 (item 28) and Casey 2019 (item 29), both VERIFIED.
- Baez & Fritz, 'A Bayesian Solution to the Online Forecast Scoring Problem' — the arXiv identifier could not be confirmed; the online-scoring requirement is carried instead by Gneiting & Raftery (item 38), VERIFIED, and by the calibration-record definition in Part B, which the paper can state in its own terms.
- 'Shard Agents' (semantic capability restriction) — the arXiv identifier could not be confirmed; the demarcation argument is carried instead by CaMeL (item 35), VERIFIED, and by items 31–34.
- den Hartog's *Least Authority* (MIT Press, 2014) and Tirole's *A Theory of Corporate Reputation* (MIT Press, 2006) — no machine-readable record located; not cited. The reputation argument is carried by Spence (item 20), Fukuyama (item 24) and Kreps et al. (item 25), all VERIFIED.

---

## Part F — What the prior art does *not* settle, and where the paper must make its own argument

These are the gaps the paper must fill. They are stated here so the writing seat does not mistake a well-cited area for a settled one.

1. **The exteriorised layer is not in the literature.** Extended-mind and distributed-cognition work establishes that cognition can be exteriorised; dual-process work establishes a two-process architecture of the internal. No verified source in this pack supplies a *three-layer* architecture with an exteriorised middle layer operating under its own latency regime. The paper's first contribution is this architecture, and it must be argued, not cited.
2. **The mediation requirement is under-theorised.** The requirement that external output must pass adjudication before it becomes action is available in pieces — the automation literature supplies the failure analysis (items 41–44), and the extended-mind literature supplies the availability condition — but no verified source states the *normative* requirement that the principal's own reflection is the correct adjudicator, nor that a boundary function performing the same function on the principal's behalf is a legitimate (and possibly superior) substitute. The paper must argue this, and must confront the self-preference evidence (item 45).
3. **Latency as a first-class parameter.** The claim that the exteriorised layer's latency is immaterial *because* it operates off the critical path, and that the same latency inserted into the critical path is catastrophic, has a formal home in queueing and scheduling theory but not in the literatures scouted here. The paper must either locate that home or argue the point qualitatively.
4. **The predictive attestation as a first-class instrument.** The estimate has a home in forecasting theory (items 36–40) and a home in surety economics (items 26–27). What it lacks is a *unified* treatment showing that the forecast, the certification and the repayment schedule are one instrument with three faces. That unification is the paper's second contribution.
5. **Chain-level trust degradation.** Item 28 (RFC 5280) supplies path validation for a single trust root; it does not supply the argument that in a chain of *heterogeneous* certifiers — each with its own standing, revocation conditions and jurisdiction — the failure of a single link destroys the *inference* rather than merely reducing confidence. The seed asserts this; the paper must prove it or retreat from it.
6. **The specification's incompleteness.** Items 15 and 16 establish that measurable specifications induce distortion and that contracts are incomplete. Neither establishes that an *attestation* architecture escapes the problem, and item 47 (Goodhart) suggests it does not. The paper should treat this as a live limitation rather than a solved problem, because it is the strongest objection to the architecture.
7. **Empirical grounding.** Every item in Part E is either a conceptual result, a methodological standard, or an artefact- and field-study. There is no verified dataset in this pack on agentic execution and calibration. Any empirical claim the paper makes must therefore be explicitly marked as a research programme, not a finding.

---

*End of research pack.*

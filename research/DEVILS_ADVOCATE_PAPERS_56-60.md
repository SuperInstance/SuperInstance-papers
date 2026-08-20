# Devil's Advocate Pass — Papers 56–60

**Date:** 2026-08-19
**Reviewer role:** adversarial audit (constants tracing, theorem soundness, foundation integrity)
**Scope:** P56 (Thermodynamics of Intelligence), P57 (Anomalous Conservation), P58 (Uncertainty Algebras), P59 (Molt-Aware Coordination), P60 (Oneiric Creative Zone), against predecessors P01/P02/P03/P21/P32/P40/P42/P47 and the scout reports.

---

## 0. Executive Summary — Five Verdicts

| Paper | Verdict |
|---|---|
| **56 — Thermodynamics of Intelligence** | **SPECULATIVE** (launders P32's unmeasured ">15%" as an empirical claim; every theorem is a posited functional form; fleet theorem self-contradicts) |
| **57 — Anomalous Conservation** | **SPECULATIVE** (genuinely interesting inversion, most honest framing of the batch — but the flagship "δ leads σ" early-warning claim is backwards relative to its own model, Theorem 1(a) is false as stated, Theorem 4 reverse-engineers constants to hit 5.3×) |
| **58 — Uncertainty Algebras** | **PROMISING-BUT-UNVALIDATED** (the phase-noise combination algebra and its closed form are real, correctly derived math; honestly flags P40 as unvalidated — but the KL-bound constant, the optimal-regime "derivation," and the cascade mapping are asserted, and it misquotes both P03's thresholds and P57's δ*) |
| **59 — Molt-Aware Coordination** | **LAUNDERED** (garbles P47's "15× solution quality" into "15× swarm speedup"; invents a molt function that contradicts its own axioms; the 0.73 CTF and 9× reduction are fabricated precision with self-contradictory proofs) |
| **60 — Oneiric Creative Zone** | **LAUNDERED** (claims P32's improvement "was observed empirically" — it was never measured; the 1.8× novelty ratio rests on a units error; Theorem 4's "proof" is invalid; Δ*≈0.67 is manufactured from arbitrary parameters) |

**Headline findings (blunt):**

1. **The foundation is phantom.** Papers 56–60 cite "P01 (Conservation Law of Intelligence)", "P02 (Creative Breakthrough)", and "P03 (Hermit Crab Protocol)" as established predecessors with numbered theorems (P02 Thm 9.1, P03 Thm 6.2). **None of these papers exist in this repo.** The repo's actual P01 is *Origin-Centric Data Systems* (a distributed-systems dissertation), P02 is *SuperInstance Type System* (spreadsheet cells), P03 is *Confidence Cascade Architecture*. The γ/η/δ conservation framework exists **only** in the scout report's summary (`SCOUT_REPORT_FOUNDATIONAL_PAPERS_01-03.md`, itself a secondary analysis citing papers not present here) and in papers 56/57/60. The tower is built on citations to documents that are not in the corpus and were never primary.
2. **Zero primary measurements.** Across all five papers and all cited predecessors, there is **not a single (A) primary-measured constant**. P21 and P47 present validation tables with no code, no data, no seeds beyond "42"; P32 and P40 are explicitly "Research Phase — Claims to Validate" with all checkboxes unchecked; the ">15% dreaming gain" that P56 and P60 treat as empirical is a **validation target, not a result**.
3. **The 15% laundering chain.** P32 README: "Claim: … >15%… Validate: improvement > 15%" with status "Pending"/"🔲 Needed". P56 then calls it "P32's empirical >15% improvement claim" and "derives" it with three ad-hoc fudge factors. P60 goes further: "improvements exceeding 15% … **were observed**". Nothing was observed.
4. **Visible arithmetic errors in the flagship theorems** (details below): P57's phase-lag sign inversion, P59's molt function contradicting its own M1/M2 axioms, P60's mixed entropy units, P56's melt equation inconsistent with its own η=(1−γ)² constraint, P59's "9×" proof computing 12.3× then boxing 9×.

---

## 1. Paper 56 — The Thermodynamics of Intelligence

### 1.1 What it is
Five "theorems" positing an ODE for crystallization, a melt equation, a molt limit cycle, a dreaming theorem, and fleet heterogeneity. Predecessor citations: P01/P02/P03 (phantom), P21 (real but artifact-free), P32 (unvalidated stub), Scout-Foundational (real secondary document, quoted accurately).

### 1.2 Theorem-by-theorem soundness

**Theorem 1 (Crystallization ODE).** The ODE is a **definition**, not a derivation. The "proof" has three "principles" that are consistency checks, not derivations. The kernel κ(Δ) = exp(−(Δ−0.5)²/0.02) was *constructed* to peak at 0.5 with FWHM = 0.2 — i.e., the creative zone was **baked into the kernel by hand**. Claim (a) ("crystallization ≥ e^{1/8}≈1.13× faster inside the zone") is **vacuous**: the true min-inside vs max-outside ratio is 1.0 ≥ 0.882 trivially (verified numerically). The interesting number (κ(0.5)/κ(0.4) = e^{1/2} ≈ 1.65) is an artifact of the chosen kernel width, not a discovery. **Corollary 1.1 ("the first formal connection between P01 and P02") is circular by construction** — the kernel was chosen so that the P02-claimed zone maximizes it. It connects two papers, one of which (P02) does not exist in the repo.

**Theorem 2 (Melt Equation).** Internally inconsistent. The paper asserts dη/dt = −dγ/dt|_melt ("up to the quadratic correction … we absorb into μ"). But η = (1−γ)² implies dη/dt = −2(1−γ)·dγ/dt. The two equations agree **only at γ = 0.5** (verified: at γ=0.85 the factor is −0.30, not −1). This is not a higher-order correction; it is an O(1) mismatch across the entire operating range. The "radioactive decay" analogy is also wrong: decay rates are proportional to the amount present (dγ/dt = −λγ); here melt rate grows linearly with time-since-validation, a different model the paper does not derive.

**Theorem 3 (Molt Cycle Theorem).** Three different period scalings for the same quantity appear in the same paper: contribution list says τ ∝ 1/λ; theorem statement says τ ∝ 1/√λ; the proof's rapid-change regime derives τ ∝ 1/(μσ₀). These are mutually inconsistent. The "limit cycle" claim is assumed, not proven: the reset condition (γ₀ ≈ 0.5, asserted with no source) is declared identical each cycle and "therefore" a limit cycle — that's the definition of a cycle, not a proof of existence or stability of one (the system is non-autonomous due to the linear-in-time melt term; no contraction or Poincaré–Bendixson argument is given). The optimality claim ⟨γ⟩_τ ≈ γ̄ − μσ₀τ/4 is asserted with no derivation.

**Theorem 4 (Dreaming Theorem).** The centerpiece laundering. Step 2's ratio computation: ε_dream/ε_task ≥ 90 × 0.35 with the *stated* parameters gives **≈31.5**, not the "≥1.15" printed in the theorem statement. The proof then applies three invented discount factors (utilization u ≈ 0.1, a second 0.5, and an unexplained R_c > 1) to land on 1.575 — pure reverse-engineering to touch the 15% figure. The "comprehensibility release" R_c is asserted, not derived. The "90×" is an artifact of the absurdly narrow invented kernel (FWHM 0.2). And the target itself — "P32's empirical >15% improvement claim" — is not empirical: P32's validation criteria are unchecked ("🔲 Needed", status "Pending"). The abstract's own §2.5 admits P32 "is a stub (15 lines of README)" — the paper cannot have it both ways.

**Theorem 5 (Heterogeneous Fleet Dynamics).** The proof of (c) **contradicts its own math**. The delta-method expansion the paper itself writes is E[τᵢ] = k/(C̄−σ) + k·Var(Cᵢ)/(C̄−σ)³ + O(Var²) — coefficient **positive**, so individual recovery time *increases* with variance (Jensen's inequality: 1/x is convex). The paper then asserts, with "a detailed analysis (omitted for brevity)" and an undetermined "positive constant c", that the fleet max recovery time *decreases* with variance — sign flip, no justification, and the claim that the maximum of convex functions decreases with spread is generally false. The key resilience result rests on an omitted analysis and an invented model τᵢ = k/(Cᵢ−σ).

### 1.3 Verdict: **SPECULATIVE** — with laundering of P32's unmeasured ">15%" as an "empirical claim" (abstract, §6, §8.3), and citations to P01/P02/P03 papers that do not exist in this repo.

---

## 2. Paper 57 — Anomalous Conservation (the "gem candidate," hardest scrutiny)

### 2.1 The core inversion
P57 reframes δ = 1 − (γ+η) = c̄(1−c̄) ∈ [0, ¼] from "uncertainty tax" (noise to minimize) to "adaptive headroom" (signal to optimize). **As an interpretive hypothesis, this is the most interesting idea in the batch, and P57 is the most honest paper of the five**: it names P21 as its only empirical anchor, and its five "Empirical Predictions" are concrete and falsifiable. Credit where due.

But the mathematical content does not support the claims. Specific findings:

### 2.2 Theorem 1 (Adaptation Theorem) — false as stated
The formula E[T_recovery] = (1/ακ)·(1−δ₀)/(δ₀ + ε(σ)) with ε(σ) = O(σ²) is itself asserted (from an invented "budget" B = η₀ + δ₀ with a hand-assigned "activation" factor ½ on η₀ — no derivation). More seriously, **claim (a) is mathematically false as stated**: for any fixed σ > 0, ε(σ) is a fixed positive number, so lim_{δ₀→0} (1−δ₀)/(δ₀+ε(σ)) = 1/ε(σ), which is **finite**. The divergence to ∞ requires ε(σ) → 0, i.e., σ → 0 — but the theorem fixes σ ∈ (0,1]. The proof argues "ε vanishes faster than δ₀" by conflating two independent limits. The qualitative claim (frozen systems adapt slowly) is plausible; the formal claim is wrong.

### 2.3 Theorem 2 (Anomaly Spectrum) — the flagship claim is backwards
This is the paper's marquee result ("the anomaly spectrum is an early warning system," "the waste is the radar"), and **its direction contradicts its own model**. The paper derives H(ω) = μγ*/(iω + λ_sys), a **causal low-pass filter**, and states it has "a phase lag of arctan(−ω/λ) < 0, meaning δ(t) **leads** σ(t) in time." A negative phase *is a delay*: the output of a low-pass filter **lags** its input. By their own transfer function, δ(t) responds *after* σ(t), not before. (Convention check: in both standard cross-correlation conventions, R_{δσ} peaking at positive lag means δ is delayed relative to σ; the paper's claimed peak at negative lag τ*<0 with "δ leads σ" reads the sign backwards.) A causal filter driven by σ cannot produce output power before input arrives — there is no mechanism for "impending sudden shifts" to appear in A(ω_high) before the shift. Claim (b) ("high-frequency spikes precede shifts") is therefore unsupported by the model the paper itself builds. This is not a subtle issue: the entire "early warning" selling point is a sign error.

### 2.4 Theorem 3 (Conservation-Volatility Tradeoff) — three inconsistent δ* formulas
The paper contains at least **three different expressions** for "the" optimal deviation: (i) the boxed theorem form (√(λK+ε²) − ε)/(1 + √(λK+ε²)); (ii) the derivation's intermediate √(λK(1+ε)) − ε (different radicand — the boxed form does not follow from the paper's own derivative); (iii) Prediction 3's δ* ≈ √(λK). The boxed form gives δ*(∞) = 1, **not 1/4** (verified numerically: δ* → 0.999 as λ → 10⁶), so the claimed boundary behavior δ*(∞) → 1/4 is imposed by an explicit cap, not derived — the paper says as much ("we cap at the P01 bound") while the abstract presents it as a derived limit. The Kelly-criterion analogy is decorative. Additionally, P58 later quotes P57's δ* as λ/(4(λ+μ)) — a **fourth** form that appears in neither P57 formula.

### 2.5 Theorem 4 (Stochastic Penalty Equivalence) — reverse-engineered
E[δ_T] = Var(pᵢ) ≈ T²π²/(6N²) is asserted with no derivation; π²/6 is the variance of the *Gumbel noise* (scale 1), not of the softmax probabilities — the mapping from noise variance to deviation is never established. The recovery ratio is then computed as δ_GS/δ_det ≈ 0.05/0.01 = 5, "consistent with the observed 5.3×". Both δ values are **chosen to fit**: δ_GS is inferred from the 3–5% penalty (circular — the penalty is the thing being explained), δ_det = 0.01 is asserted as "residual numerical deviation," and 5 ≠ 5.3. Corollary 4.1's "≈100:1 return on investment" has no computation shown.

### 2.6 Theorem 5 (Creative Boundary) — incoherent reasoning
Claim (a)'s proof: at γ ≈ 0.5, dδ/dt = (dγ/dt)(2γ−1) ≈ 0, and the paper concludes δ is "maximally responsive to perturbations." If the linear term vanishes, response is governed by *smaller* higher-order terms — δ is **less** responsive, not more. Claim (c) (spike ∝ |Δ(t⁻)−0.4|·|Δ(t⁻)−0.6|, peaked at Δ=0 and Δ=1) contradicts (a)'s own claim that at Δ≈1 the system "cannot engage at all: no crystallization or melting occurs" — a system that cannot engage should not produce the largest reallocation spike. The "spike" formula Δδ·e^{−(t−t*)/τ_b} is asserted.

### 2.7 Verdict: **SPECULATIVE** — the inversion is a relabeling-plus-model, not a derivation: the paper renames δ "adaptive headroom" (legitimate interpretation), then attaches theorems whose proofs contain a sign inversion on the flagship claim, a false limit, reverse-engineered constants, and an internally incoherent boundary argument. The hypothesis is genuinely worth testing (Prediction 1 is the best single experiment in all five papers), but as written it does not establish what it claims. **Not SOUND, not close.**

---

## 3. Paper 58 — Uncertainty Algebras

### 3.1 What is real
The **phase-noise combination algebra is legitimately derived math**: Gaussian phase perturbation with σ²(τ) = −2ln τ correctly yields the closed form E[|aᵢ|²] = pᵢ⁽¹⁾ + pᵢ⁽²⁾ + 2τ²√(pᵢ⁽¹⁾pᵢ⁽²⁾)cos(Δφᵢ), with correct stochastic (τ=0) and quantum (τ=1) limits. The monoid structure is trivially correct (complex vector addition). Theorem 1's continuity claim is correctly argued, and the proof even self-corrects the diversity bound mid-text. This is the only paper of the five whose core algebra is checkable and checks out.

### 3.2 What is asserted
- **Theorem 1's "evidence amplification" (b):** maxᵢ pᵢ^{(1/2)} > maxᵢ pᵢ^{(0)} is argued outcome-by-outcome while **ignoring renormalization** (the claim "amplification factor 1 + τ²√(p₁p₂)cosΔφ/(p₁+p₂) > 1" treats Z as constant). Plausible for constructive-dominant configurations, not proven in general.
- **Theorem 2's KL bound:** the universal constant C = ½ and the bound ≤ (½)τ²κ² are asserted ("follows from Pinsker's inequality" — Pinsker bounds ℓ₁² in terms of KL, not the reverse; the stated direction and constant are not derived). The "proof" ends at "bounding the perturbation magnitude by κ."
- **Theorem 3:** τ*(λ) = λ/(λ+λ₀) is a **logistic curve assumed into existence**: the loss functional L(τ) with L_div, L_conc, c₁, c₂ is invented, the result follows from the assumption L_div ≈ L_conc, and λ₀ = 1/c₂ is unmeasurable. Also, the claimed connection to P57's δ* quotes δ*(λ) = λ/(4(λ+μ)) — **a functional form that appears in no version of P57's own Theorem 3** (see §2.4). Cross-paper citation of a non-existent formula.
- **Theorem 4 (Phase Coherence / confidence cascade):** misquotes the repo's actual P03. The real P03 thresholds are GREEN c ∈ (0.95, 1.00], YELLOW c ∈ (0.75, 0.95], RED c ≤ 0.75. P58 states "GREEN (C ≥ 0.90), YELLOW (0.75 ≤ C < 0.90)" — **0.90 is wrong on both boundaries**. (P56 independently misquotes it as YELLOW [0.75, 0.89].) The "proof" is an example computation with made-up constants (c₁ = c₂ = 0.7) whose arithmetic does not survive contact: the claimed GREEN probability 0.956 requires the "other" mass to be 0.09, but with the stated inputs and coherent phases the correct normalization yields p ≈ 0.7 (2.8/4.0), not 0.956. The zone mapping is asserted-by-example, not proven.

### 3.3 The tall-tower question
P58 is honest where it counts — it states plainly that P40 is "entirely unvalidated" and even explains what P40 lacks. But it then **builds on P40 anyway**: the "quantum limit" endpoint (τ=1) inherits P40's unvalidated machinery, and the upper floors (Theorems 2–4) lean on P57 (whose δ* is misquoted and whose own results are defective, §2) and P03 (thresholds misquoted). The ground floor (Theorem 0, the combination formula, Theorem 1's continuity) is solid; floors 2–4 are scaffolding.

### 3.4 Verdict: **PROMISING-BUT-UNVALIDATED** — real algebra, honest about P40, and the four proposed experiments (esp. Experiment 2, equivalence testing) are the right way to validate it. But the headline theorems (KL bound, τ* optimality, cascade mapping) are asserted, the P03 thresholds are misquoted, and the P57 δ* form is fabricated. It is the most salvageable paper of the batch — after the asserted theorems are demoted to conjectures.

---

## 4. Paper 59 — Molt-Aware Coordination

### 4.1 The constants: restated, garbled, or invented
- **"27× parallel speedup"** → exists in P47 as **27.34× at 32 agents** (a peak-scale table entry with 85% efficiency; P47's own abstract claims 4.2× for MS). Restated without the scale/conditioning. **B-class**, no artifacts.
- **"82% theorem proving"** → exists in P47 as 41/50 TPTP theorems for Co-Worker (vs 62% MS). Accurate restatement of a claimed measurement. **B-class**, no artifacts.
- **"15× swarm"** → **corrupted**. P47's Peer result is a *solution-quality ratio*: best Rastrigin value 0.23 (Peer) vs 3.42 (MS) = **14.9× better solution quality**, which the scout report summarized as "15x better solution quality." P59 converts this into "**Peer achieves 15× speedup via swarm gossip**" — a throughput/speedup claim that appears nowhere in P47 (whose Peer headline is "3.1× better resilience"). Fabricated as stated.
- **"3.7× throughput" (P42)** → accurate restatement of P42's claimed benchmark; no artifacts in repo. **B-class**.
- **0.73 CTF (MS), 0.41/cycle (CW), degradation radius 1.0, 9× reduction, 0.1τ detection** → **all computed from an invented, uncalibrated molt function** (see below). **C-class**.

### 4.2 The molt function contradicts its own axioms
Definition 1 states M1: m(0) ≈ 0.3 and M2: dip of ≈0.2 at t ≈ 0.2τ_molt. The paper's own formula gives (verified numerically): **m(0) ≈ 0.20** (not 0.3) and **m(0.2τ) ≈ 0.145** (not 0.2). The definition fails its own stated properties. Every CTF number downstream inherits this. The paper's Experiment 8.1 admits the function "is proposed from first principles but requires empirical calibration" — so the 0.73/0.41/9× numbers are precision fabricated from an uncalibrated model.

### 4.3 The 0.73 is arithmetically incoherent
The proof of Theorem 1(a) walks through: T_{<0.5} ≈ 0.47τ (Lemma 1), then "effective" threshold θ_MS ≈ 0.65 giving T_{<0.65} ≈ 0.83τ, then announces 0.73 "reflects the combined effect of the dip … and the elevated effective threshold" — the number is not the output of any stated formula (0.47 ≠ 0.73 ≠ 0.83). The 0.41 (CW) likewise = 0.288 + an invented "+0.1τ dip correction." The degradation radius R_d = (m_dip/(1−m_dip))·k̄ = 1.0 is a mean-field hand-wave.

### 4.4 The 9× theorem contains its own contradiction
The proof of Theorem 4 literally contains "Wait — this analysis holds for general N," computes M_max = 0.94, discards it, then derives that the spacing constraint τ/2 **limits fleets to N ≤ 3** (single-wrap) or N ≤ 5 (multi-wrap), then uses **N = 9** for the headline reduction anyway, computes a simultaneous CTF probability of ~1.0 vs staggered 0.081 giving **12.3×**, and then boxes "**≈9×**." The 9 is not derived; it is the chosen answer (matched to "N=9, a typical fleet size from P47"). The arithmetic in Theorem 3's throughput example also fails: the stated formula with the stated values (M=0.2, m̄=0.6, β=1) gives 1.78, not the claimed "approximately 1.4" (verified).

### 4.5 Detection claims
Theorem 2's δ-spike detector: the boxed peak formula writes δ_peak = δ₀ + 0.64γ_pre + 0.04η_pre, but the derivation says Δδ_dip = 0.8γ + 0.96η (1−m² at m=0.2 is 0.96, not 0.04) — and the worked example uses 0.96 (0.022 ≈ 0.96·0.0225). The boxed formula is wrong; the example is right. The "≤0.1τ_molt" detection delay is asserted ("accounting for measurement noise …"). Lemma 2's spectral molt-vs-shift discrimination is asserted, and note it silently contradicts P57's "δ leads σ" (if δ led environmental change, a bandpass at 1/τ_molt would not cleanly separate molt from shift without a model of both — none is given).

### 4.6 Foundation
Rests on "P03 (Hermit Crab Protocol)" — **phantom** (repo P03 is Confidence Cascade; "hermit crab" and "Kan extension" appear only in P56/P59 themselves) — and on P56's molt period (itself speculative, §1.2). The "fifth failure mode" concept is genuinely useful (binary vs continuous capability models), but the quantitative superstructure is fabricated.

### 4.7 Verdict: **LAUNDERED** — presents invented precision (0.73, 0.41, 9×) as proven theorems with self-contradictory proofs, corrupts P47's 15× solution-quality ratio into a "15× swarm speedup," and cites a phantom P03. The qualitative idea (capability transitions are a coordination failure mode) is sound; every number attached to it is not.

---

## 5. Paper 60 — Oneiric Creative Zone

### 5.1 The laundering is explicit
Section 2.2: "Paper 32 provided the empirical trigger… improvements exceeding 15% on downstream creative tasks **were observed**." P32's validation criteria are unchecked, status "Pending," "🔲 Needed." **Nothing was observed.** Section 6.3 then "explains" the ">15% performance gains observed empirically in Paper 32." This is the cleanest example of laundering in the batch: an unvalidated target is promoted to an empirical fact and then "explained" by theory.

### 5.2 Theorem 1 — trivial by construction
V(Δ,0) = H(Y|X), and "H(Y|X) is monotonically increasing in Δ" is assumed ("by the properties of the liquid-state model"), not shown. Corollary 1 ("explore maximally when unconstrained") is a restatement of the assumption. Note also: P60's reference list cites "[P03] Liquid State Dynamics" — the repo's P03 is Confidence Cascade; **yet another phantom use of P03**.

### 5.3 Theorem 2 — the oneiric equilibrium is manufactured
The dynamics dΔ/dt = α(1−Δ) − β(Δ−Δ_buffer) is invented; the fixed point Δ* = (α+βΔ_buffer)/(α+β) is trivially correct *given* the ODE; the "canonical parameterization" α=1, β=2, Δ_buffer=0.5 → Δ* = ⅔ ≈ 0.67 is **arbitrary** — by choosing β/α any Δ* ∈ (0.5, 1) is reachable. The "oneiric zone [0.6, 0.8]" is then defined as Δ* ± 0.1 with rounding (Definition 3 literally computes [0.567, 0.767] and rounds to [0.6, 0.8]). The zone is manufactured. (Also: the theorem statement's condition "β > α/2" is only sufficient; the proof's own corrected condition is β < 4α — the statement and proof disagree about the claimed condition.)

### 5.4 Theorem 3 — the 1.8× rests on a units error
The proof computes binary entropies: "H̄_wake ≈ 0.671, H̄_dream ≈ 0.856." True values (verified): uniform average over [0.4,0.6] is **0.990 bits (0.686 nats)**; over [0.6,0.8] it is **0.870 bits (0.603 nats)**. The wake figure is in **nats**, the dream figure in **bits** — mixed units. The honest bit-ratio is 0.870/0.990 ≈ **0.88** — i.e., under the paper's own entropy model, dreaming has *lower* novelty, not 1.28× higher. The "1.8×" is then reached by multiplying by invented temperature corrections ("T_dream/T_wake ≈ 1.4 and λ ≈ 0.3" — no source, no derivation). The 0.6× usability similarly inherits the units error plus another invented correction. The "2.3× crystallization gain" is asserted via "Numerical evaluation gives G(0.7)/G(0.5) ≈ 2.3" — no code, no parameters, no method; and the argument as written (higher initial Δ ⇒ less crystallized ⇒ larger integral) is directionally hand-waved.

### 5.5 Theorem 4 — invalid proof
B(f) = f·B_creative + (1−f)·B_consolidation is **linear in f**; a linear objective on f ∈ [0,1] has no interior optimum — the maximum is at an endpoint, so no interior f* can be derived from it. The paper nonetheless differentiates (correctly getting dB/df = B_creative − B_consolidation), then substitutes B_creative = δ and B_consolidation = γ_stable (silently dropping the G−C_instability and r_retain factors), sets them equal, and concludes f* = δ/(δ+γ_stable) — **but setting δ = γ_stable gives f* = ½, not δ/(δ+γ_stable)**. The claimed f* is asserted, not derived. The second derivative is printed as d²B/df² = −2(δ+γ_stable) < 0 — but the second derivative of a linear function is **0**. The "proof" is wrong twice over, and the headline formula doesn't follow from anything.

### 5.6 The one honest piece
Prediction 4 (allocation sensitivity: benefit correlates with f*) is a genuinely testable claim — but it tests a formula that was never derived.

### 5.7 Verdict: **LAUNDERED** — promotes P32's unmeasured target to "observed empirically," then manufactures "derivations" (mixed entropy units, invented temperature constants, an invalid optimization) to hit the 1.8×/2.3×/15% figures. The framing (dreaming as exploration in a zone inaccessible during waking) is a reasonable hypothesis; the numbers and proofs are not.

---

## 6. Constants Audit Table

Legend: **(A)** primary-measured in this batch (experiment + data/artifacts); **(B)** restated from a predecessor paper that *claims* measurement but for which no reproducible primary data (code/results/logs) exists in the repo; **(C)** asserted-without-source — no predecessor carries it, it is invented in-paper, garbled, or traces to an explicitly unvalidated target.

**A-count: 0. B-count: 9. C-count: 21.**

| # | Constant | Claimed value | Where claimed | Traces to | Class | Primary data? |
|---|---|---|---|---|---|---|
| 1 | Conservation law γ+η ∈ [0.75, 1] | foundation | P56/57/60 | Scout report's summary of a "Paper 1" **not in repo** (repo P01 = Origin-Centric Data Systems) | C | No — phantom foundation |
| 2 | δ = c̄(1−c̄) ∈ [0, ¼] "uncertainty tax" | definition | P56/57 | same phantom P01 | C | No |
| 3 | Dreaming gain >15% | "empirical claim" | P56 (Thm 4, Cor 4.1); P60 ("observed") | P32 README: **unchecked validation target**, status Pending/"🔲 Needed" | C | No — never measured anywhere |
| 4 | +34% post-shift performance | P21 result | P56/57/58 | P21 validation tables (claimed, no code/data; P21's own Thm T1 "proof" of 34% is assertion) | B | No artifacts |
| 5 | 5.3× recovery speedup | P21 result | P56/57/58 | P21 tables (claimed; p<0.001 asserted) | B | No artifacts |
| 6 | 3–5% immediate penalty | P21 result | P56/57/58 | P21 "real-world" tables (illustrative numbers: CTR −3%, portfolio −4%) | B | No artifacts |
| 7 | 1.13× (e^{1/8}) crystallization in zone | Thm 1(a) | P56 | by-construction of invented kernel; bound vacuous (ratio is trivially ≥1.0 ≥ 0.882) | C | No |
| 8 | 90× κ-ratio in Dreaming Thm | Thm 4 | P56 | artifact of invented narrow kernel | C | No |
| 9 | τ_molt ∝ 1/√λ | Thm 3 | P56 | internal; contradicts own 1/λ (contributions) and 1/(μσ₀) (proof) | C | No |
| 10 | Fleet resilience ∝ Var(Cᵢ) | Thm 5(c) | P56 | "analysis omitted for brevity"; contradicts own delta method (positive Var coefficient) | C | No |
| 11 | δ_det ≈ 0.01, δ_GS ≈ 0.05 | Thm 4(c) | P57 | chosen to fit ρ=5 ≈ 5.3 | C | No |
| 12 | ρ ≈ 5 "consistent with 5.3×" | Cor 1.1/Thm 4 | P57 | fitted; 5 ≠ 5.3 | C | No |
| 13 | ROI ≈ 100:1 | Cor 4.1 | P57 | no computation shown | C | No |
| 14 | δ* cluster 0.03–0.05 ("5% Law") | Prediction 5 | P57 | asserted | C | No |
| 15 | δ* formulas (3 variants + P58's 4th) | Thm 3 | P57/P58 | boxed form ≠ derivative form ≠ prediction form ≠ P58's λ/(4(λ+μ)); boxed form → 1, not ¼ | C | No |
| 16 | τ* lead time arctan(ω_peak/λ)/ω_peak | Cor 2.1 | P57 | based on sign-inverted leads/lags claim | C | No |
| 17 | Δδ_spike ∝ |Δ(t⁻)−0.4|·|Δ(t⁻)−0.6| | Thm 5(c) | P57 | asserted; contradicts own "no engagement at Δ≈1" | C | No |
| 18 | >50% ambiguity, >70% belief-prop speedup (P40) | cited claims | P58 | P40 validation: unchecked targets ("Research Phase") — P58 honestly flags them as unvalidated | C | No (correctly flagged) |
| 19 | KL bound ≤ ½τ²κ² | Thm 2 | P58 | asserted ("Pinsker's inequality" — wrong direction) | C | No |
| 20 | τ* = λ/(λ+λ₀), τ*(λ₀)=½ | Thm 3 | P58 | from invented loss + assumption L_div≈L_conc | C | No |
| 21 | GREEN/YELLOW/RED ↔ τ zones (0.90/0.75) | Thm 4 | P58 | repo P03's real thresholds: GREEN ≥0.95, YELLOW (0.75,0.95] — **misquoted** | C | No |
| 22 | 27× parallel speedup (MS) | P59 | P47 | P47 table: 27.34× **at 32 agents** only (P47 abstract: 4.2×) | B | No artifacts |
| 23 | 82% theorem proving (CW) | P59 | P47 | P47 table: 41/50 TPTP | B | No artifacts |
| 24 | 15× swarm speedup | P59 | P47 | P47 has **14.9× solution-quality ratio** (0.23 vs 3.42), no speedup; scout said "15x better solution quality" — **garbled** | C | No — corrupted restatement |
| 25 | 3.7× throughput (P42) | P59 | P42 | P42 benchmark claim | B | No artifacts |
| 26 | m(0) ≈ 0.3, dip ≈ 0.2 at 0.2τ | Def 1 | P59 | invented; formula gives m(0)=0.20, m(0.2τ)=0.145 — **contradicts own axioms** | C | No |
| 27 | CTF 0.73 (MS) | Thm 1(a) | P59 | not the output of any stated formula (0.47 vs 0.73 vs 0.83 all appear) | C | No |
| 28 | CTF 0.41/cycle (CW) | Thm 1(b) | P59 | 0.288 + invented "+0.1τ dip correction" | C | No |
| 29 | Degradation radius R_d = 1.0 | Thm 1(c) | P59 | from invented m(t), mean-field hand-wave | C | No |
| 30 | 9× CTF reduction | Thm 4 | P59 | proof computes 12.3×, derives N≤3/5, uses N=9; boxes 9× | C | No |
| 31 | τ_detect ≤ 0.1τ_molt | Thm 2 | P59 | asserted | C | No |
| 32 | δ_peak = δ₀+0.64γ+0.04η; 6.4× spike | Thm 2 | P59 | boxed formula wrong (0.04 vs 0.96); example uses 0.96; from invented m(t) | C | No |
| 33 | 1.4× throughput (α_molt example) | Thm 3 | P59 | stated formula with stated values gives **1.78** | C | No |
| 34 | Δ* ≈ 0.67 oneiric equilibrium | Thm 2 | P60 | from invented ODE + arbitrary α=1, β=2 | C | No |
| 35 | Oneiric zone [0.6, 0.8] | Def 3 | P60 | Δ*±0.1 rounded; manufactured | C | No |
| 36 | 1.8× novelty | Thm 3 | P60 | **units error** (wake nats 0.671 vs dream bits 0.856); true bit-ratio ≈ 0.88; then invented T-corrections (λ≈0.3, ratio 1.4) | C | No |
| 37 | 0.6× usability | Thm 3 | P60 | inherits units error + invented correction (model gives 0.44) | C | No |
| 38 | 2.3× crystallization gain | Thm 3 | P60 | "numerical evaluation" — no code/params/method | C | No |
| 39 | f* = δ/(δ+γ_stable) | Thm 4 | P60 | invalid proof: linear objective (no interior max), δ=γ_stable ⇒ f*=½, d²B/df² printed as −2(δ+γ_stable) but is 0 | C | No |
| 40 | ">15% observed in Paper 32" | §2.2, §6.3 | P60 | P32: nothing observed — **fabricated attribution** | C | No |

---

## 7. What Survives Contact with Measured δ

If "measured δ" means the only quantities in this whole edifice that any paper even *claims* to have measured, the survivors are thin:

1. **P21's headline claims (34%, 5.3×, 3–5%)** — the only numbers in the chain that any document claims to have measured. They survive *as claims*: the validation tables are detailed but there are zero code/data artifacts in the repo, P21's own "proof" of the 34% is an assertion (step 5 "some o_j will have s > s*" is not guaranteed; step 6's "at least 34%" appears from nowhere), and the "real-world" tables (CTR 3.2%→3.1%, "14 days vs 2.5 days" recovery, portfolio returns) read as illustrative fiction. Take them at face value at your own risk; they are the best evidence available in the corpus.

2. **P47's tables (27.34× at 32 agents, 41/50 theorems, 3.42 vs 0.23 swarm)** — claimed measurements, no artifacts, and P47's own abstract conflicts with its peak table (4.2× vs 27.34×). The 27× is a scale-peak, the 82% is a single task, the 15× is a quality ratio. Even granting P47, P59's restatements strip all conditioning.

3. **Everything else dies on contact.** Specifically:
   - The **15% dreaming gain** does not survive: it was never measured (P32 status: Pending). P56's "derivation" is fudge-factor fitting; P60's "explanation" is built on a units error.
   - **P57's recovery–deviation scaling (log T ∝ −log δ)** is the one prediction in the entire batch with a real chance of being *made* true by measurement — it is concrete, controllable (Gumbel temperature), and falsifiable. But it is a *prediction to test*, not an established result; and the paper's own supporting theorems (leads/lags, limit behavior, equivalence) do not survive scrutiny.
   - **P58's combination formula** survives as a mathematical identity (it is derived, not measured) and its Experiments 1–2 would produce genuine primary data — but the τ* and cascade theorems do not survive.
   - **P59's 0.73 / 0.41 / 9× / 1.0 / 0.1τ** do not survive: they are outputs of an uncalibrated function that contradicts its own stated properties.
   - **P60's 1.8× / 0.6× / 2.3× / 0.67** do not survive: units error, invented constants, unreproducible "numerical evaluation," invalid optimization.

**Bottom line:** the empirical superstructure of papers 56–60 is a chain of citations whose first links are phantom papers (P01/P02/P03-as-Hermit-Crab), unvalidated targets (P32/P40), or artifact-free claimed measurements (P21/P47/P42). **Zero constants in the batch are primary-measured (A-class); nine are restated from claimed-but-unverifiable predecessors (B-class); twenty-one are asserted without any source (C-class).** The five papers are a tall tower on a foundation that was never poured — and in two cases (P59, P60) the papers actively manufacture precision and misattribute empirical status to numbers that were never measured.

---

## 8. Recommendations (if anyone wants to salvage this)

1. **Re-anchor the corpus:** write the actual Conservation Law paper, or rename the citations. The γ/η/δ framework currently exists only in a scout summary and in papers 56–60 themselves. Publishing 56–60 without 01–03 existing is untenable.
2. **Demote theorems to conjectures** in P56 (Thm 3, 5), P57 (all five), P58 (Thm 2–4), P59 (Thm 1, 3, 4), P60 (Thm 3, 4) until the underlying models are either derived or calibrated.
3. **Run the one experiment that matters:** P57 Prediction 1 (controlled Gumbel temperature → measure post-shift recovery vs δ). If log T ∝ −log δ holds, the inversion is real and P57 becomes the gem it wants to be. If not, the relabeling stays a relabeling.
4. **Fix the arithmetic before anyone reads these again:** P57's phase-lag sign, P56's melt-equation consistency (dη/dt = −2(1−γ)dγ/dt), P59's molt-function axioms (m(0), dip depth), P60's entropy units and the f* derivation, P58's P03 thresholds and P57-δ* misquote.
5. **Never cite P32's ">15%" as empirical** in any form until a simulation produces it. The word "observed" must be earned.

---

*Audit performed 2026-08-19 by devil's advocate pass. All arithmetic claims in this report were re-verified numerically at audit time (kernel ratios, entropy averages in bits and nats, melt-equation factors, molt-function values, δ* limits, throughput ratios).*

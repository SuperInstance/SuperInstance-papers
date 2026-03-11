(*
 * CYCLE 1-E: F# Certainty Encoding Tiles
 * Type-Level Certainty Quantification with Railway-Oriented Patterns
 * 
 * This module provides tiles for encoding certainty/confidence at the type level
 * using F#'s phantom types, computation expressions, and railway-oriented patterns.
 *)

namespace CertaintyTiles

open System

// =============================================================================
// PHANTOM TYPE DEFINITIONS FOR CERTAINTY
// =============================================================================

/// Certainty level phantom type markers
type Certain = | Certain
type Uncertain = | Uncertain
type Probabilistic = | Probabilistic

/// Certainty range phantom types (0.0 to 1.0)
type CertaintyRange = | ZeroToOne of float

/// Evidence type for certainty accumulation
type Evidence = { value: float; weight: float; timestamp: DateTime }

/// Error type for railway pattern
type CertaintyError =
    | InsufficientEvidence of string
    | ConfidenceBelowThreshold of float * float // (actual, required)
    | InvalidProbability of float
    | PropagationFailure of string

// =============================================================================
// TILE DEFINITIONS
// =============================================================================

(*
TILE: [cmax]
TYPE: float -> float -> float
MATH: c' = max(c₁, c₂)
FSHARP: let cmax c1 c2 = max c1 c2
USES: HIGH
*)
/// Maximum certainty update - takes the most confident estimate
let cmax (c1: float) (c2: float) : float =
    max c1 c2

(*
TILE: [cmin]
TYPE: float -> float -> float
MATH: c' = min(c₁, c₂)
FSHARP: let cmin c1 c2 = min c1 c2
USES: MED
*)
/// Minimum certainty - conservative estimate for critical systems
let cmin (c1: float) (c2: float) : float =
    min c1 c2

(*
TILE: [certain_tensor]
TYPE: 'T -> float -> CertainTensor<'T>
MATH: T = (value, certainty) where c ∈ [0,1]
FSHARP: type CertainTensor<'T> = { value: 'T; certainty: float }
USES: HIGH
*)
/// Phantom-typed tensor with certainty annotation
type CertainTensor<'T, 'C> = {
    value: 'T
    certainty: float
    metadata: Map<string, obj> option
} with
    member this.IsValid = this.certainty >= 0.0 && this.certainty <= 1.0
    
    static member Create(v: 'T, c: float) : CertainTensor<'T, 'C> =
        if c < 0.0 || c > 1.0 then 
            raise (ArgumentOutOfRangeException("Certainty must be in [0,1]"))
        { value = v; certainty = c; metadata = None }
    
    member this.WithMetadata(key: string, value: obj) =
        let meta = match this.metadata with
                   | Some m -> m.Add(key, value)
                   | None -> Map.empty.Add(key, value)
        { this with metadata = Some meta }

(*
TILE: [certainty_update]
TYPE: float -> (Evidence -> float) -> Evidence -> float
MATH: c' = max(c, f(e)) where f(e) = e.value * e.weight
FSHARP: let certaintyUpdate c evidenceFn e = max c (evidenceFn e)
USES: HIGH
*)
/// Update certainty based on new evidence
let certaintyUpdate (currentCertainty: float) 
                    (evidenceFunction: Evidence -> float) 
                    (evidence: Evidence) : float =
    let evidenceCertainty = evidenceFunction evidence
    max currentCertainty evidenceCertainty

/// Default evidence function: weighted value
let weightedEvidence (e: Evidence) : float = e.value * e.weight

(*
TILE: [entropy_certainty]
TYPE: float[] -> float
MATH: H = -Σᵢ pᵢ log₂(pᵢ), where c = 1 - H/ln(n)
FSHARP: let entropyCertainty probabilities = ...
USES: HIGH
*)
/// Compute certainty from entropy of probability distribution
let entropyCertainty (probabilities: float[]) : float =
    let validProbs = probabilities |> Array.filter (fun p -> p > 0.0)
    let n = float probabilities.Length
    let entropy = validProbs 
                  |> Array.sumBy (fun p -> -p * log2 p)
    // Normalize: certainty = 1 - H/ln(n)
    // Max entropy for uniform distribution = ln(n)
    let maxEntropy = log n
    if maxEntropy > 0.0 then 1.0 - (entropy / maxEntropy)
    else 1.0 // Single element = maximum certainty

(*
TILE: [kalman_certainty_update]
TYPE: float -> float -> float -> float -> float
MATH: c' = c + K(y - ŷ) where K = P/(P + R)
FSHARP: let kalmanCertaintyUpdate c priorVar obsVar innovation = ...
USES: MED
*)
/// Kalman-inspired certainty update based on observation innovation
let kalmanCertaintyUpdate (currentCertainty: float) 
                          (priorVariance: float) 
                          (observationVariance: float)
                          (innovation: float) : float =
    // Kalman gain
    let kalmanGain = priorVariance / (priorVariance + observationVariance)
    // Update certainty based on innovation magnitude
    let innovationScale = 1.0 - min 1.0 (abs innovation)
    let updatedCertainty = currentCertainty + kalmanGain * innovationScale * (1.0 - currentCertainty)
    // Clamp to valid range
    max 0.0 (min 1.0 updatedCertainty)

/// Full Kalman state for certainty tracking
type KalmanCertaintyState = {
    certainty: float
    variance: float
    innovation: float
    kalmanGain: float
}

/// Kalman certainty update returning full state
let kalmanCertaintyFull (state: KalmanCertaintyState) 
                        (observation: float) 
                        (prediction: float) : KalmanCertaintyState =
    let innovation = observation - prediction
    let k = state.variance / (state.variance + 0.1) // R = observation noise
    let newCertainty = state.certainty + k * (1.0 - state.certainty) * (1.0 - min 1.0 (abs innovation))
    { certainty = min 1.0 (max 0.0 newCertainty)
      variance = (1.0 - k) * state.variance
      innovation = innovation
      kalmanGain = k }

(*
TILE: [railway_result]
TYPE: Result<'T, CertaintyError> -> ('T -> Result<'U, CertaintyError>) -> Result<'U, CertaintyError>
MATH: f(g(x)) where f,g are partial functions with error handling
FSHARP: let railwayBind f g = match f with Ok x -> g x | Error e -> Error e
USES: HIGH
*)
/// Railway-oriented programming bind operation
let railwayBind (result: Result<'T, CertaintyError>) 
                (next: 'T -> Result<'U, CertaintyError>) : Result<'U, CertaintyError> =
    match result with
    | Ok value -> next value
    | Error error -> Error error

/// Railway map operation
let railwayMap (result: Result<'T, CertaintyError>) 
               (f: 'T -> 'U) : Result<'U, CertaintyError> =
    match result with
    | Ok value -> Ok (f value)
    | Error error -> Error error

/// Computation expression builder for railway pattern
type CertaintyBuilder() =
    member _.Bind(result, f) = railwayBind result f
    member _.Return(value) = Ok value
    member _.ReturnFrom(result) = result
    member _.Zero() = Ok ()
    member _.Delay(f) = f
    member _.Run(f) = f()

let certainty = CertaintyBuilder()

(*
TILE: [certainty_propagate]
TYPE: CertainTensor<'T,'C1> -> ('T -> 'U) -> float -> CertainTensor<'U,'C2>
MATH: c_out = c_in × f_reliable where f_reliable ∈ [0,1]
FSHARP: let certaintyPropagate tensor f reliability = ...
USES: HIGH
*)
/// Propagate certainty through a transformation layer
let certaintyPropagate (tensor: CertainTensor<'T, 'C>) 
                       (transform: 'T -> 'U) 
                       (reliability: float) : CertainTensor<'U, 'C> =
    { value = transform tensor.value
      certainty = tensor.certainty * reliability
      metadata = tensor.metadata }

/// Propagate with uncertainty accumulation through multiple layers
let propagateThroughLayers (initial: CertainTensor<'T, 'C>)
                           (layers: (('T -> 'U) * float) list) : CertainTensor<'T, 'C> =
    layers |> List.fold (fun current (transform, reliability) ->
        { value = transform current.value
          certainty = current.certainty * reliability
          metadata = current.metadata }) initial

(*
TILE: [bayesian_certainty_merge]
TYPE: float -> float -> float -> float -> float
MATH: P(H|E) = P(E|H)P(H) / P(E), c' = weighted average
FSHARP: let bayesianCertaintyMerge priorC priorVar obsC obsVar = ...
USES: MED
*)
/// Bayesian certainty fusion from two sources
let bayesianCertaintyMerge (priorCertainty: float) 
                           (priorVariance: float)
                           (observedCertainty: float) 
                           (observedVariance: float) : float =
    // Precision-weighted combination
    let priorPrecision = 1.0 / priorVariance
    let obsPrecision = 1.0 / observedVariance
    let combinedPrecision = priorPrecision + obsPrecision
    let combinedCertainty = 
        (priorPrecision * priorCertainty + obsPrecision * observedCertainty) / combinedPrecision
    min 1.0 (max 0.0 combinedCertainty)

(*
TILE: [dempster_shafer_combine]
TYPE: (float * float) -> (float * float) -> (float * float)
MATH: m₁₂(A) = Σ m₁(B)m₂(C) / (1-K) where B∩C=A, K=conflict
FSHARP: let dempsterShaferCombine (m1Bel, m1Pl) (m2Bel, m2Pl) = ...
USES: MED
*)
/// Dempster-Shafer belief combination
let dempsterShaferCombine (belief1: float, plausibility1: float) 
                          (belief2: float, plausibility2: float) : float * float =
    // Simplified combination rule
    let conflict = (1.0 - belief1) * belief2 + belief1 * (1.0 - belief2)
    let normalization = 1.0 - conflict
    if normalization > 0.0 then
        let combinedBelief = (belief1 * belief2) / normalization
        let combinedPlausibility = 
            1.0 - ((1.0 - plausibility1) * (1.0 - plausibility2)) / normalization
        (combinedBelief, combinedPlausibility)
    else
        (0.5, 0.5) // Maximum uncertainty on total conflict

(*
TILE: [certainty_threshold_gate]
TYPE: float -> CertainTensor<'T,'C> -> Result<CertainTensor<'T,'C>, CertaintyError>
MATH: gate(t)(x) = x if c(x) ≥ t, Error otherwise
FSHARP: let certaintyThresholdGate threshold tensor = ...
USES: HIGH
*)
/// Gate that requires minimum certainty threshold
let certaintyThresholdGate (threshold: float) 
                           (tensor: CertainTensor<'T, 'C>) : Result<CertainTensor<'T, 'C>, CertaintyError> =
    if tensor.certainty >= threshold then
        Ok tensor
    else
        Error (ConfidenceBelowThreshold(tensor.certainty, threshold))

/// Adaptive threshold based on risk
let adaptiveThresholdGate (baseThreshold: float) 
                          (riskFactor: float)
                          (tensor: CertainTensor<'T, 'C>) : Result<CertainTensor<'T, 'C>, CertaintyError> =
    let adjustedThreshold = baseThreshold * riskFactor
    certaintyThresholdGate adjustedThreshold tensor

(*
TILE: [softmax_certainty]
TYPE: float[] -> float[] * float
MATH: σ(z)ᵢ = eᶻⁱ/Σⱼeᶻʲ, c = max(σ(z)) - entropy(σ(z))
FSHARP: let softmaxCertainty logits = ...
USES: HIGH
*)
/// Softmax with certainty estimation
let softmaxCertainty (logits: float[]) : float[] * float =
    let maxLogit = Array.max logits
    let expScores = logits |> Array.map (fun z -> exp (z - maxLogit))
    let sumExp = Array.sum expScores
    let probabilities = expScores |> Array.map (fun e -> e / sumExp)
    
    // Certainty based on peakiness of distribution
    let maxProb = Array.max probabilities
    let entropy = probabilities 
                  |> Array.filter (fun p -> p > 0.0)
                  |> Array.sumBy (fun p -> -p * log2 p)
    let maxEntropy = log2 (float probabilities.Length)
    let entropyCertaintyVal = 1.0 - entropy / maxEntropy
    
    // Combined certainty
    let certainty = 0.5 * maxProb + 0.5 * entropyCertaintyVal
    (probabilities, certainty)

(*
TILE: [certainty_ensemble_vote]
TYPE: CertainTensor<'T,'C>[] -> float -> CertainTensor<'T,'C>
MATH: c_ensemble = Σᵢ wᵢcᵢ / Σᵢ wᵢ, value = mode or weighted average
FSHARP: let certaintyEnsembleVote tensors votingStrategy = ...
USES: MED
*)
/// Ensemble voting with certainty weighting
type VotingStrategy =
    | WeightedAverage
    | MajorityVote
    | WeightedVote
    | HighestCertainty

let certaintyEnsembleVote (tensors: CertainTensor<'T, 'C>[]) 
                          (strategy: VotingStrategy) 
                          (valueCombiner: 'T[] -> 'T) : CertainTensor<'T, 'C> =
    match strategy with
    | WeightedAverage ->
        let totalWeight = tensors |> Array.sumBy (fun t -> t.certainty)
        let combinedCertainty = 
            tensors |> Array.sumBy (fun t -> t.certainty * t.certainty) / totalWeight
        { value = valueCombiner (tensors |> Array.map (fun t -> t.value))
          certainty = combinedCertainty
          metadata = None }
    | WeightedVote ->
        let totalWeight = tensors |> Array.sumBy (fun t -> t.certainty)
        let combinedCertainty = 
            tensors |> Array.sumBy (fun t -> t.certainty * t.certainty) / totalWeight
        { value = valueCombiner (tensors |> Array.map (fun t -> t.value))
          certainty = combinedCertainty
          metadata = None }
    | HighestCertainty ->
        let best = tensors |> Array.maxBy (fun t -> t.certainty)
        best
    | MajorityVote ->
        // Simple majority - each gets equal vote
        let avgCertainty = tensors |> Array.averageBy (fun t -> t.certainty)
        { value = valueCombiner (tensors |> Array.map (fun t -> t.value))
          certainty = avgCertainty
          metadata = None }

(*
TILE: [certainty_decay]
TYPE: float -> float -> float -> float
MATH: c(t) = c₀ × e^(-λt) where λ = decay rate
FSHARP: let certaintyDecay initialCertainty decayRate time = ...
USES: MED
*)
/// Temporal certainty decay
let certaintyDecay (initialCertainty: float) 
                   (decayRate: float) 
                   (time: float) : float =
    let decayed = initialCertainty * exp (-decayRate * time)
    max 0.0 (min 1.0 decayed)

/// Certainty decay with minimum floor
let certaintyDecayWithFloor (initialCertainty: float) 
                            (decayRate: float) 
                            (time: float)
                            (minFloor: float) : float =
    max minFloor (certaintyDecay initialCertainty decayRate time)

(*
TILE: [certainty_from_interval]
TYPE: float -> float -> float
MATH: c = 1 - (u - l) / range, where interval = [l, u]
FSHARP: let certaintyFromInterval lower upper range = ...
USES: MED
*)
/// Certainty from confidence interval width
let certaintyFromInterval (lower: float) (upper: float) (fullRange: float) : float =
    if fullRange > 0.0 then
        let intervalWidth = upper - lower
        max 0.0 (1.0 - intervalWidth / fullRange)
    else 1.0

/// Certainty from normalized interval variance
let certaintyFromVariance (variance: float) (maxVariance: float) : float =
    if maxVariance > 0.0 then
        max 0.0 (1.0 - sqrt variance / sqrt maxVariance)
    else 1.0

(*
TILE: [certainty_compose_monoid]
TYPE: CertainTensor<'T,'C> -> CertainTensor<'T,'C> -> (float -> float -> float) -> CertainTensor<'T,'C>
MATH: c₁ ⊕ c₂ = f(c₁, c₂) where ⊕ is monoid operation
FSHARP: let certaintyCompose t1 t2 combineFn = ...
USES: MED
*)
/// Monoid composition of certainty values
let certaintyCompose (t1: CertainTensor<'T, 'C>) 
                     (t2: CertainTensor<'T, 'C>) 
                     (combine: float -> float -> float)
                     (valueCombiner: 'T -> 'T -> 'T) : CertainTensor<'T, 'C> =
    { value = valueCombiner t1.value t2.value
      certainty = combine t1.certainty t2.certainty
      metadata = None }

/// Monoid instance for independent evidence combination
let independentCombine = certaintyCompose

// =============================================================================
// COMPREHENSIVE TYPE INSTANCES
// =============================================================================

/// Certain float tensor
type CertainFloat = CertainTensor<float, Certain>

/// Uncertain float tensor
type UncertainFloat = CertainTensor<float, Uncertain>

/// Probabilistic float tensor
type ProbabilisticFloat = CertainTensor<float, Probabilistic>

// =============================================================================
// COMPUTATION EXPRESSION EXAMPLES
// =============================================================================

module Examples =
    /// Example: Railway-oriented certainty pipeline
    let certaintyPipeline (input: float) : Result<float, CertaintyError> =
        certainty {
            let! tensor = 
                if input >= 0.0 && input <= 1.0 then 
                    Ok { value = input; certainty = 0.8; metadata = None }
                else 
                    Error (InvalidProbability input)
            
            let! gated = certaintyThresholdGate 0.5 tensor
            
            let propagated = certaintyPropagate gated (fun x -> x * 2.0) 0.9
            
            return propagated.value
        }
    
    /// Example: Kalman filter certainty tracking
    let kalmanTrackingExample (observations: float[]) (predictions: float[]) : float[] =
        let initialState = { certainty = 0.5; variance = 1.0; innovation = 0.0; kalmanGain = 0.0 }
        observations
        |> Array.scan (fun state (obs, pred) -> 
            kalmanCertaintyFull state obs pred) initialState
        |> Array.map (fun s -> s.certainty)
        |> Array.skip 1

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/// Clamp certainty to valid range [0, 1]
let clampCertainty (c: float) : float = max 0.0 (min 1.0 c)

/// Check if certainty is valid
let isValidCertainty (c: float) : bool = c >= 0.0 && c <= 1.0

/// Convert uncertainty (inverse certainty) to certainty
let uncertaintyToCertainty (uncertainty: float) : float = 1.0 - uncertainty

/// Linear interpolation between certainty values
let lerpCertainty (c1: float) (c2: float) (t: float) : float = 
    c1 + t * (c2 - c1) |> clampCertainty

/// Certainty to confidence level string
let certaintyToConfidenceLevel (c: float) : string =
    if c >= 0.95 then "Very High"
    elif c >= 0.8 then "High"
    elif c >= 0.6 then "Medium"
    elif c >= 0.4 then "Low"
    elif c >= 0.2 then "Very Low"
    else "Uncertain"

// =============================================================================
// TILE SUMMARY
// =============================================================================
// 
// TILE SUMMARY TABLE:
// ┌──────────────────────────────┬─────────────────────────────────────────┬────────┐
// │ TILE                         │ DESCRIPTION                             │ USES   │
// ├──────────────────────────────┼─────────────────────────────────────────┼────────┤
// │ cmax                         │ Maximum certainty update                │ HIGH   │
// │ cmin                         │ Minimum certainty (conservative)        │ MED    │
// │ certain_tensor               │ Phantom-typed tensor with certainty     │ HIGH   │
// │ certainty_update             │ Evidence-based certainty update         │ HIGH   │
// │ entropy_certainty            │ Entropy-derived certainty               │ HIGH   │
// │ kalman_certainty_update      │ Kalman filter certainty tracking        │ MED    │
// │ railway_result               │ Railway-oriented error handling         │ HIGH   │
// │ certainty_propagate          │ Layer-wise certainty propagation        │ HIGH   │
// │ bayesian_certainty_merge     │ Bayesian fusion of certainty sources    │ MED    │
// │ dempster_shafer_combine      │ Dempster-Shafer belief combination      │ MED    │
// │ certainty_threshold_gate     │ Certainty threshold gating              │ HIGH   │
// │ softmax_certainty            │ Softmax with certainty estimation       │ HIGH   │
// │ certainty_ensemble_vote      │ Ensemble voting with certainty          │ MED    │
// │ certainty_decay              │ Temporal certainty decay                │ MED    │
// │ certainty_from_interval      │ Interval-based certainty                │ MED    │
// │ certainty_compose_monoid     │ Monoid composition of certainty         │ MED    │
// └──────────────────────────────┴─────────────────────────────────────────┴────────┘
//
// TOTAL TILES: 16
// HIGH USES: 8 | MED USES: 8

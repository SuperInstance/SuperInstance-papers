(*
 * CYCLE 2-E: F# Kalman Filter State Estimation Tiles
 * Extracted tiles for certainty tracking and state estimation
 * Minimum 10 tiles with mathematical foundations
 *)

namespace KalmanTiles

open System
open Microsoft.FSharp.Collections

// ============================================================================
// MATRIX OPERATIONS MODULE (Foundation for Kalman calculations)
// ============================================================================

module MatrixOps =
    /// Matrix type alias for clarity
    type Matrix = float[,]
    type Vector = float[]
    
    /// Create identity matrix of size n
    let identity (n: int) : Matrix =
        Array2D.init n n (fun i j -> if i = j then 1.0 else 0.0)
    
    /// Matrix multiplication: A * B
    let multiply (A: Matrix) (B: Matrix) : Matrix =
        let rowsA = Array2D.length1 A
        let colsA = Array2D.length2 A
        let colsB = Array2D.length2 B
        Array2D.init rowsA colsB (fun i j ->
            seq { 0 .. colsA - 1 }
            |> Seq.sumBy (fun k -> A.[i, k] * B.[k, j])
        )
    
    /// Matrix transpose
    let transpose (A: Matrix) : Matrix =
        let rows = Array2D.length1 A
        let cols = Array2D.length2 A
        Array2D.init cols rows (fun i j -> A.[j, i])
    
    /// Matrix addition: A + B
    let add (A: Matrix) (B: Matrix) : Matrix =
        let rows = Array2D.length1 A
        let cols = Array2D.length2 A
        Array2D.init rows cols (fun i j -> A.[i, j] + B.[i, j])
    
    /// Matrix subtraction: A - B
    let subtract (A: Matrix) (B: Matrix) : Matrix =
        let rows = Array2D.length1 A
        let cols = Array2D.length2 A
        Array2D.init rows cols (fun i j -> A.[i, j] - B.[i, j])
    
    /// Matrix-vector multiplication: A * v
    let multiplyVector (A: Matrix) (v: Vector) : Vector =
        let rows = Array2D.length1 A
        let cols = Array2D.length2 A
        Array.init rows (fun i ->
            seq { 0 .. cols - 1 }
            |> Seq.sumBy (fun j -> A.[i, j] * v.[j])
        )
    
    /// Matrix inverse using Cholesky decomposition (for symmetric positive definite)
    let inverse (A: Matrix) : Matrix =
        let n = Array2D.length1 A
        // Cholesky decomposition: A = L * L'
        let L = Array2D.zeroCreate n n
        for i in 0 .. n - 1 do
            for j in 0 .. i do
                let sum = 
                    if i = j then
                        let s = seq { 0 .. j - 1 } |> Seq.sumBy (fun k -> L.[j, k] ** 2.0)
                        sqrt (A.[j, j] - s)
                    else
                        let s = seq { 0 .. j - 1 } |> Seq.sumBy (fun k -> L.[i, k] * L.[j, k])
                        (A.[i, j] - s) / L.[j, j]
                L.[i, j] <- sum
        
        // Inverse of L
        let Linv = Array2D.zeroCreate n n
        for i in 0 .. n - 1 do
            Linv.[i, i] <- 1.0 / L.[i, i]
            for j in i + 1 .. n - 1 do
                Linv.[j, i] <- 
                    - (seq { i .. j - 1 } |> Seq.sumBy (fun k -> L.[j, k] * Linv.[k, i])) / L.[j, j]
        
        // A^(-1) = L'^(-1) * L^(-1)
        let LinvT = transpose Linv
        multiply LinvT Linv
    
    /// Trace of matrix (sum of diagonal)
    let trace (A: Matrix) : float =
        let n = min (Array2D.length1 A) (Array2D.length2 A)
        seq { 0 .. n - 1 } |> Seq.sumBy (fun i -> A.[i, i])
    
    /// Determinant (for 2x2 and 3x3 matrices)
    let determinant (A: Matrix) : float =
        let n = Array2D.length1 A
        match n with
        | 2 -> A.[0,0] * A.[1,1] - A.[0,1] * A.[1,0]
        | 3 ->
            A.[0,0] * (A.[1,1] * A.[2,2] - A.[1,2] * A.[2,1])
            - A.[0,1] * (A.[1,0] * A.[2,2] - A.[1,2] * A.[2,0])
            + A.[0,2] * (A.[1,0] * A.[2,1] - A.[1,1] * A.[2,0])
        | _ -> failwith "Determinant only implemented for 2x2 and 3x3"

// ============================================================================
// TILE 1: STATE PREDICTION
// ============================================================================

(*
TILE: statePrediction
TYPE: Matrix -> Vector -> Vector -> Vector
MATH: x̂⁻ = Fx + Bu (predicted state estimate)
FSHARP: [implementation below]
USES: HIGH - Core prediction step in every Kalman filter cycle
*)

module StatePrediction =
    open MatrixOps
    
    /// State prediction: x̂⁻ = Fx + Bu
    /// F: State transition matrix
    /// x: Current state estimate
    /// B: Control input matrix (optional, can be zero)
    /// u: Control input vector (optional, can be zero)
    let predict (F: Matrix) (x: Vector) (B: Matrix option) (u: Vector option) : Vector =
        // F * x (state transition)
        let Fx = multiplyVector F x
        
        // Add control input if provided: B * u
        match B, u with
        | Some b, Some ctrl ->
            let Bu = multiplyVector b ctrl
            Array.init (Array.length Fx) (fun i -> Fx.[i] + Bu.[i])
        | _ -> Fx
    
    /// State prediction with time-varying transition
    let predictTimeVarying (F: float -> Matrix) (t: float) (x: Vector) (dt: float) : Vector =
        let Ft = F t
        multiplyVector Ft x

// ============================================================================
// TILE 2: COVARIANCE PREDICTION
// ============================================================================

(*
TILE: covariancePrediction
TYPE: Matrix -> Matrix -> Matrix -> Matrix
MATH: P⁻ = FPF' + Q (predicted covariance estimate)
FSHARP: [implementation below]
USES: HIGH - Essential for uncertainty propagation
*)

module CovariancePrediction =
    open MatrixOps
    
    /// Covariance prediction: P⁻ = FPF' + Q
    /// F: State transition matrix
    /// P: Current covariance matrix
    /// Q: Process noise covariance
    let predict (F: Matrix) (P: Matrix) (Q: Matrix) : Matrix =
        // F * P
        let FP = multiply F P
        // (F * P) * F'
        let Ft = transpose F
        let FPFt = multiply FP Ft
        // Add process noise: FPF' + Q
        add FPFt Q
    
    /// Covariance prediction with fading factor (for adaptive filtering)
    let predictWithFading (F: Matrix) (P: Matrix) (Q: Matrix) (alpha: float) : Matrix =
        // Apply fading: P = alpha^2 * P (exponential weighting)
        let n = Array2D.length1 P
        let Pfaded = Array2D.init n n (fun i j -> alpha * alpha * P.[i, j])
        let FP = multiply F Pfaded
        let FPFt = multiply FP (transpose F)
        add FPFt Q

// ============================================================================
// TILE 3: KALMAN GAIN CALCULATION
// ============================================================================

(*
TILE: kalmanGain
TYPE: Matrix -> Matrix -> Matrix -> Matrix -> Matrix
MATH: K = PH'(HPH' + R)⁻¹ (optimal Kalman gain)
FSHARP: [implementation below]
USES: HIGH - Optimal weighting between prediction and measurement
*)

module KalmanGain =
    open MatrixOps
    
    /// Kalman gain: K = PH'(HPH' + R)⁻¹
    /// P: Predicted covariance
    /// H: Observation matrix
    /// R: Measurement noise covariance
    let compute (P: Matrix) (H: Matrix) (R: Matrix) : Matrix =
        // P * H'
        let Ht = transpose H
        let PHt = multiply P Ht
        // H * P
        let HP = multiply H P
        // H * P * H' + R (innovation covariance)
        let HPHt = multiply HP Ht
        let S = add HPHt R
        // (HPH' + R)⁻¹
        let Sinv = inverse S
        // K = PH' * S⁻¹
        multiply PHt Sinv
    
    /// Simplified Kalman gain for scalar measurements
    let computeScalar (P: Matrix) (H: Vector) (r: float) : Vector =
        let n = Array2D.length1 P
        // P * H'
        let PHt = Array.init n (fun i ->
            seq { 0 .. n - 1 } |> Seq.sumBy (fun j -> P.[i, j] * H.[j])
        )
        // H * P * H' + R
        let HPHt = 
            seq { 0 .. n - 1 }
            |> Seq.sumBy (fun i -> 
                seq { 0 .. n - 1 } 
                |> Seq.sumBy (fun j -> H.[i] * P.[i, j] * H.[j])
            )
        let S = HPHt + r
        // K = PH' / S
        Array.init n (fun i -> PHt.[i] / S)

// ============================================================================
// TILE 4: STATE UPDATE
// ============================================================================

(*
TILE: stateUpdate
TYPE: Vector -> Matrix -> Vector -> Vector -> Vector
MATH: x̂⁺ = x̂⁻ + K(y - Hx̂⁻) (updated state estimate)
FSHARP: [implementation below]
USES: HIGH - Corrects prediction with measurement
*)

module StateUpdate =
    open MatrixOps
    
    /// State update: x̂⁺ = x̂⁻ + K(y - Hx̂⁻)
    /// xPred: Predicted state estimate (x̂⁻)
    /// K: Kalman gain
    /// y: Measurement vector
    /// H: Observation matrix
    let update (xPred: Vector) (K: Matrix) (y: Vector) (H: Matrix) : Vector =
        // H * x̂⁻ (predicted measurement)
        let Hx = multiplyVector H xPred
        // y - Hx̂⁻ (innovation/residual)
        let innovation = Array.init (Array.length y) (fun i -> y.[i] - Hx.[i])
        // K * innovation
        let Kinnovation = multiplyVector K innovation
        // x̂⁺ = x̂⁻ + K * innovation
        Array.init (Array.length xPred) (fun i -> xPred.[i] + Kinnovation.[i])
    
    /// State update with innovation directly provided
    let updateWithInnovation (xPred: Vector) (K: Matrix) (innovation: Vector) : Vector =
        let Kinnovation = multiplyVector K innovation
        Array.init (Array.length xPred) (fun i -> xPred.[i] + Kinnovation.[i])

// ============================================================================
// TILE 5: COVARIANCE UPDATE
// ============================================================================

(*
TILE: covarianceUpdate
TYPE: Matrix -> Matrix -> Matrix -> Matrix
MATH: P⁺ = (I - KH)P⁻ (updated covariance estimate)
FSHARP: [implementation below]
USES: HIGH - Updates uncertainty after measurement
*)

module CovarianceUpdate =
    open MatrixOps
    
    /// Covariance update (Joseph form): P⁺ = (I - KH)P⁻(I - KH)' + KRK'
    /// More numerically stable than simple form
    let updateJoseph (P: Matrix) (K: Matrix) (H: Matrix) (R: Matrix) : Matrix =
        let n = Array2D.length1 P
        // I - KH
        let I = identity n
        let KH = multiply K H
        let IKH = subtract I KH
        // (I - KH) * P
        let IKHP = multiply IKH P
        // (I - KH) * P * (I - KH)'
        let IKHPt = multiply IKHP (transpose IKH)
        // K * R * K'
        let KR = multiply K R
        let KRKt = multiply KR (transpose K)
        // Final: (I - KH)P(I - KH)' + KRK'
        add IKHPt KRKt
    
    /// Simple covariance update: P⁺ = (I - KH)P⁻
    /// Less stable but computationally efficient
    let updateSimple (P: Matrix) (K: Matrix) (H: Matrix) : Matrix =
        let n = Array2D.length1 P
        let I = identity n
        let KH = multiply K H
        let IKH = subtract I KH
        multiply IKH P

// ============================================================================
// TILE 6: INNOVATION CALCULATION
// ============================================================================

(*
TILE: innovationCalculation
TYPE: Vector -> Matrix -> Vector -> Vector
MATH: ν = y - Hx̂⁻ (innovation/measurement residual)
FSHARP: [implementation below]
USES: HIGH - Key diagnostic for filter health
*)

module InnovationCalculation =
    open MatrixOps
    
    /// Innovation: ν = y - Hx̂⁻
    /// y: Actual measurement
    /// H: Observation matrix
    /// xPred: Predicted state
    let compute (y: Vector) (H: Matrix) (xPred: Vector) : Vector =
        let Hx = multiplyVector H xPred
        Array.init (Array.length y) (fun i -> y.[i] - Hx.[i])
    
    /// Normalized innovation squared (for chi-squared test)
    /// ν' * S⁻¹ * ν (should be chi-squared distributed)
    let normalizedSquared (innovation: Vector) (S: Matrix) : float =
        let Sinv = inverse S
        let n = Array.length innovation
        let innArr = Array2D.init n 1 (fun i _ -> innovation.[i])
        let innT = transpose innArr
        let SinvInn = multiply Sinv innArr
        let result = multiply innT SinvInn
        result.[0, 0]
    
    /// Innovation covariance: S = HPH' + R
    let covariance (P: Matrix) (H: Matrix) (R: Matrix) : Matrix =
        let HP = multiply H P
        let HPHt = multiply HP (transpose H)
        add HPHt R

// ============================================================================
// TILE 7: CERTAINTY EXTRACTION
// ============================================================================

(*
TILE: certaintyExtraction
TYPE: Matrix -> CertaintyMetrics
MATH: σᵢ = √P[i,i], cert = 1 - σ/|x|, ent = -∑pᵢlog(pᵢ)
FSHARP: [implementation below]
USES: HIGH - Converts covariance to interpretable certainty measures
*)

module CertaintyExtraction =
    open MatrixOps
    
    /// Certainty metrics extracted from covariance
    type CertaintyMetrics = {
        StandardDeviations: float[]      // σᵢ from diagonal
        ConfidenceEllipse: float         // Volume of confidence ellipsoid
        Entropy: float                   // Information entropy
        Determinant: float               // Generalized variance
        Trace: float                     // Total variance
        ConditionNumber: float           // Numerical health
        CertaintyPerState: float[]       // Certainty fraction per state
        OverallCertainty: float          // Aggregate certainty [0,1]
    }
    
    /// Extract certainty metrics from covariance matrix
    let extract (P: Matrix) (x: Vector) : CertaintyMetrics =
        let n = Array2D.length1 P
        
        // Standard deviations from diagonal
        let stdDevs = Array.init n (fun i -> sqrt (max 0.0 P.[i, i]))
        
        // Confidence ellipsoid volume (proportional to det(P)^(n/2))
        let detP = determinant P
        let ellipseVolume = 
            if detP > 0.0 then 
                let piPower = pown System.Math.PI (n / 2)
                let gammaFactor = 
                    if n = 2 then System.Math.PI
                    elif n = 3 then 4.0 * System.Math.PI / 3.0
                    else 1.0 // Approximation for higher dimensions
                gammaFactor * sqrt detP
            else 0.0
        
        // Information entropy: -0.5 * ln(|P|) + const
        let entropy = 
            if detP > 0.0 then -0.5 * log detP + float n * 0.5 * log (2.0 * System.Math.PI * System.Math.E)
            else Double.PositiveInfinity
        
        // Trace (total variance)
        let tr = trace P
        
        // Condition number (max/min eigenvalue approx via diagonal)
        let maxVar = stdDevs |> Array.max
        let minVar = stdDevs |> Array.filter (fun v -> v > 1e-10) |> Array.min
        let condNum = if minVar > 0.0 then maxVar / minVar else Double.PositiveInfinity
        
        // Certainty per state (fraction, considering state magnitude)
        let certaintyPerState = Array.init n (fun i ->
            let sigma = stdDevs.[i]
            let xMag = abs x.[i]
            if xMag > 1e-10 then
                let ratio = sigma / xMag
                max 0.0 (1.0 - min 1.0 ratio)
            else
                1.0 - min 1.0 sigma  // For zero state, use absolute certainty
        )
        
        // Overall certainty (geometric mean of per-state certainties)
        let overallCertainty = 
            certaintyPerState
            |> Array.filter (fun c -> c > 0.0)
            |> Array.map log
            |> Array.average
            |> exp
        
        { StandardDeviations = stdDevs
          ConfidenceEllipse = ellipseVolume
          Entropy = entropy
          Determinant = detP
          Trace = tr
          ConditionNumber = condNum
          CertaintyPerState = certaintyPerState
          OverallCertainty = overallCertainty }
    
    /// Compute confidence interval for each state
    let confidenceInterval (P: Matrix) (confidenceLevel: float) : (float * float)[] =
        let n = Array2D.length1 P
        // z-score for confidence level (approximate)
        let zScore = 
            match confidenceLevel with
            | 0.90 -> 1.645
            | 0.95 -> 1.96
            | 0.99 -> 2.576
            | _ -> 1.96 // default 95%
        
        Array.init n (fun i ->
            let sigma = sqrt (max 0.0 P.[i, i])
            (-zScore * sigma, zScore * sigma)
        )

// ============================================================================
// TILE 8: EXTENDED KALMAN FILTER (EKF)
// ============================================================================

(*
TILE: extendedKalmanFilter
TYPE: (Vector -> Matrix) -> (Vector -> Vector) -> Vector -> EKFStep
MATH: F = ∂f/∂x|_x̂, x̂⁻ = f(x̂, u)
FSHARP: [implementation below]
USES: HIGH - Nonlinear state estimation
*)

module ExtendedKalmanFilter =
    open MatrixOps
    
    /// Nonlinear state transition function type
    type StateTransition = Vector -> Vector
    
    /// Nonlinear observation function type
    type ObservationFunction = Vector -> Vector
    
    /// Jacobian function type
    type Jacobian = Vector -> Matrix
    
    /// EKF prediction step for nonlinear systems
    let predictNonlinear 
        (f: StateTransition)      // Nonlinear state transition
        (Fjacobian: Jacobian)     // Jacobian of f
        (x: Vector)               // Current state
        (P: Matrix)               // Current covariance
        (Q: Matrix)               // Process noise
        : Vector * Matrix =       // Returns (xPred, PPred)
        
        // Nonlinear state prediction
        let xPred = f x
        
        // Linearized transition matrix
        let F = Fjacobian x
        
        // Covariance prediction using linearized F
        let FP = multiply F P
        let FPFt = multiply FP (transpose F)
        let PPred = add FPFt Q
        
        (xPred, PPred)
    
    /// EKF update step for nonlinear observations
    let updateNonlinear
        (h: ObservationFunction)  // Nonlinear observation
        (Hjacobian: Jacobian)     // Jacobian of h
        (xPred: Vector)           // Predicted state
        (PPred: Matrix)           // Predicted covariance
        (y: Vector)               // Measurement
        (R: Matrix)               // Measurement noise
        : Vector * Matrix =       // Returns (xUpdated, PUpdated)
        
        let n = Array2D.length1 PPred
        
        // Predicted measurement
        let yPred = h xPred
        
        // Innovation
        let innovation = Array.init (Array.length y) (fun i -> y.[i] - yPred.[i])
        
        // Linearized observation matrix
        let H = Hjacobian xPred
        
        // Innovation covariance: S = HPH' + R
        let HP = multiply H PPred
        let HPHt = multiply HP (transpose H)
        let S = add HPHt R
        
        // Kalman gain: K = PH'S⁻¹
        let PHt = multiply PPred (transpose H)
        let Sinv = inverse S
        let K = multiply PHt Sinv
        
        // State update
        let Kinnovation = multiplyVector K innovation
        let xUpdated = Array.init n (fun i -> xPred.[i] + Kinnovation.[i])
        
        // Covariance update (Joseph form)
        let I = identity n
        let KH = multiply K H
        let IKH = subtract I KH
        let IKHP = multiply IKH PPred
        let PUpdated = multiply IKHP (transpose IKH)
        
        (xUpdated, PUpdated)

// ============================================================================
// TILE 9: UNSCENTED KALMAN FILTER (UKF) - SIGMA POINTS
// ============================================================================

(*
TILE: unscentedTransform
TYPE: Vector -> Matrix -> float -> float -> SigmaPoint[]
MATH: χ₀ = x̄, χᵢ = x̄ ± (√((n+λ)P))ᵢ
FSHARP: [implementation below]
USES: HIGH - Sigma point generation for UKF
*)

module UnscentedTransform =
    open MatrixOps
    
    /// Sigma point with weight
    type SigmaPoint = {
        Point: Vector
        WeightMean: float
        WeightCov: float
    }
    
    /// UKF parameters
    type UKFParams = {
        Alpha: float    // Spread of sigma points (typically 1e-3)
        Beta: float     // Distribution knowledge (2 for Gaussian)
        Kappa: float    // Secondary scaling (typically 0 or 3-n)
    }
    
    /// Default UKF parameters
    let defaultParams = { Alpha = 1e-3; Beta = 2.0; Kappa = 0.0 }
    
    /// Generate sigma points from mean and covariance
    let generateSigmaPoints (x: Vector) (P: Matrix) (params': UKFParams) : SigmaPoint[] =
        let n = Array.length x
        
        // Scaling parameter λ = α²(n+κ) - n
        let lambda = params'.Alpha ** 2.0 * (float n + params'.Kappa) - float n
        
        // Calculate sqrt((n+λ)P) using Cholesky decomposition
        let scaledP = Array2D.init n n (fun i j -> (float n + lambda) * P.[i, j])
        
        // Cholesky decomposition
        let L = Array2D.zeroCreate n n
        for i in 0 .. n - 1 do
            for j in 0 .. i do
                let sum = 
                    if i = j then
                        let s = seq { 0 .. j - 1 } |> Seq.sumBy (fun k -> L.[j, k] ** 2.0)
                        sqrt (max 0.0 (scaledP.[j, j] - s))
                    else
                        let s = seq { 0 .. j - 1 } |> Seq.sumBy (fun k -> L.[i, k] * L.[j, k])
                        (scaledP.[i, j] - s) / (if L.[j, j] > 0.0 then L.[j, j] else 1.0)
                L.[i, j] <- sum
        
        let sqrtP = L
        
        // Generate sigma points
        let points = ResizeArray<SigmaPoint>()
        
        // Weights
        let w0Mean = lambda / (float n + lambda)
        let w0Cov = w0Mean + (1.0 - params'.Alpha ** 2.0 + params'.Beta)
        let wi = 1.0 / (2.0 * (float n + lambda))
        
        // Central point
        points.Add { Point = x; WeightMean = w0Mean; WeightCov = w0Cov }
        
        // Points from columns of sqrt
        for i in 0 .. n - 1 do
            // Positive direction
            let posPoint = Array.init n (fun j -> x.[j] + sqrtP.[j, i])
            points.Add { Point = posPoint; WeightMean = wi; WeightCov = wi }
            
            // Negative direction
            let negPoint = Array.init n (fun j -> x.[j] - sqrtP.[j, i])
            points.Add { Point = negPoint; WeightMean = wi; WeightCov = wi }
        
        points.ToArray()
    
    /// Reconstruct mean from transformed sigma points
    let reconstructMean (sigmaPoints: SigmaPoint[]) : Vector =
        let n = Array.length sigmaPoints.[0].Point
        Array.init n (fun i ->
            sigmaPoints |> Array.sumBy (fun sp -> sp.WeightMean * sp.Point.[i])
        )
    
    /// Reconstruct covariance from transformed sigma points
    let reconstructCovariance 
        (sigmaPoints: SigmaPoint[]) 
        (mean: Vector) 
        (addNoise: Matrix) 
        : Matrix =
        let n = Array.length mean
        let cov = Array2D.zeroCreate n n
        
        for i in 0 .. n - 1 do
            for j in 0 .. n - 1 do
                cov.[i, j] <- 
                    sigmaPoints 
                    |> Array.sumBy (fun sp -> 
                        sp.WeightCov * (sp.Point.[i] - mean.[i]) * (sp.Point.[j] - mean.[j])
                    )
        
        add cov addNoise

// ============================================================================
// TILE 10: PROCESS NOISE ADAPTATION
// ============================================================================

(*
TILE: adaptiveProcessNoise
TYPE: Matrix -> Vector -> Matrix -> float -> Matrix
MATH: Qₖ = (1-α)Qₖ₋₁ + α(Kνν'K')
FSHARP: [implementation below]
USES: MED - Adaptive filtering for changing dynamics
*)

module AdaptiveProcessNoise =
    open MatrixOps
    
    /// Adaptive Q estimation using innovation-based approach
    let adaptQ 
        (Qprev: Matrix)           // Previous Q estimate
        (innovation: Vector)      // Innovation vector
        (K: Matrix)               // Kalman gain
        (alpha: float)            // Adaptation rate [0,1]
        : Matrix =
        
        // Convert innovation to column vector
        let n = Array.length innovation
        let innCol = Array2D.init n 1 (fun i _ -> innovation.[i])
        let innRow = transpose innCol
        
        // Innovation outer product: νν'
        let innOuter = multiply innCol innRow
        
        // Q estimate from innovation: Kνν'K'
        let KInn = multiply K innOuter
        let Qest = multiply KInn (transpose K)
        
        // Weighted average: (1-α)Qprev + αQest
        let nQ = Array2D.length1 Qprev
        Array2D.init nQ nQ (fun i j ->
            (1.0 - alpha) * Qprev.[i, j] + alpha * Qest.[i, j]
        )
    
    /// Residual-based Q adaptation
    let adaptQResidual
        (Qprev: Matrix)
        (xPrev: Vector)
        (xCurrent: Vector)
        (F: Matrix)
        (alpha: float)
        : Matrix =
        
        // Predicted state (what we expected)
        let xPred = multiplyVector F xPrev
        
        // Residual (what we got vs what we expected)
        let residual = Array.init (Array.length xPred) (fun i -> xCurrent.[i] - xPred.[i])
        
        // Convert to matrices
        let n = Array.length residual
        let resCol = Array2D.init n 1 (fun i _ -> residual.[i])
        let resRow = transpose resCol
        let resOuter = multiply resCol resRow
        
        // Blend with previous Q
        Array2D.init n n (fun i j ->
            (1.0 - alpha) * Qprev.[i, j] + alpha * resOuter.[i, j]
        )

// ============================================================================
// TILE 11: INFORMATION FILTER FORM
// ============================================================================

(*
TILE: informationFilter
TYPE: Matrix -> Vector -> Matrix -> Vector -> (Matrix * Vector)
MATH: Y = P⁻¹, y = Yx (information form)
FSHARP: [implementation below]
USES: MED - Decentralized/decentralized filtering
*)

module InformationFilter =
    open MatrixOps
    
    /// Convert covariance to information matrix: Y = P⁻¹
    let covarianceToInformation (P: Matrix) : Matrix =
        inverse P
    
    /// Convert information matrix to covariance: P = Y⁻¹
    let informationToCovariance (Y: Matrix) : Matrix =
        inverse Y
    
    /// Information state: y = Yx
    let stateToInformation (Y: Matrix) (x: Vector) : Vector =
        multiplyVector Y x
    
    /// Information update (prediction)
    let predictInformation 
        (Y: Matrix)           // Information matrix
        (y: Vector)           // Information state
        (F: Matrix)           // State transition
        (Q: Matrix)           // Process noise
        : Matrix * Vector =
        
        // Convert to standard form for prediction
        let P = inverse Y
        let x = multiplyVector P y
        
        // Predict covariance
        let FP = multiply F P
        let FPFt = multiply FP (transpose F)
        let PPred = add FPFt Q
        
        // Convert back to information form
        let YPred = inverse PPred
        let xPred = multiplyVector F x
        let yPred = multiplyVector YPred xPred
        
        (YPred, yPred)
    
    /// Information update (measurement) - additive form
    let updateInformation
        (Y: Matrix)           // Predicted information matrix
        (y: Vector)           // Predicted information state
        (H: Matrix)           // Observation matrix
        (R: Matrix)           // Measurement noise
        (z: Vector)           // Measurement
        : Matrix * Vector =
        
        // Information update: Y⁺ = Y⁻ + H'R⁻¹H
        let Rinv = inverse R
        let Ht = transpose H
        let HtRinv = multiply Ht Rinv
        let HtRinvH = multiply HtRinv H
        let YUpdated = add Y HtRinvH
        
        // Information state update: y⁺ = y⁻ + H'R⁻¹z
        let HtRinvz = multiplyVector HtRinv z
        let yUpdated = Array.init (Array.length y) (fun i -> y.[i] + HtRinvz.[i])
        
        (YUpdated, yUpdated)

// ============================================================================
// TILE 12: SMOOTHING (RTS SMOOTHER)
// ============================================================================

(*
TILE: rtsSmoother
TYPE: Vector[] -> Matrix[] -> Matrix[] -> (Vector[] * Matrix[])
MATH: x̃ₖ = xₖ + Cₖ(x̃ₖ₊₁ - xₖ₊₁⁻)
FSHARP: [implementation below]
USES: MED - Post-processing for optimal estimates
*)

module RTSSmoother =
    open MatrixOps
    
    /// Rauch-Tung-Striebel smoother
    /// Takes forward filter results and produces smoothed estimates
    let smooth
        (xFilt: Vector[])       // Forward filtered states
        (PFilt: Matrix[])       // Forward filtered covariances
        (PPred: Matrix[])       // Forward predicted covariances
        (F: Matrix)             // State transition matrix
        : Vector[] * Matrix[] = // Returns (xSmooth, PSmooth)
        
        let N = Array.length xFilt - 1
        let n = Array2D.length1 PFilt.[0]
        
        // Initialize smoothed estimates with final forward estimates
        let xSmooth = Array.zeroCreate<Vector> (N + 1)
        let PSmooth = Array.zeroCreate<Matrix> (N + 1)
        
        xSmooth.[N] <- xFilt.[N]
        PSmooth.[N] <- PFilt.[N]
        
        // Backward pass
        for k = N - 1 downto 0 do
            // Smoother gain: Cₖ = PₖF'(Pₖ₊₁⁻)⁻¹
            let Pk = PFilt.[k]
            let Pk1pred = PPred.[k + 1]
            let Ft = transpose F
            let PkFt = multiply Pk Ft
            let Pk1predInv = inverse Pk1pred
            let C = multiply PkFt Pk1predInv
            
            // Smoothed state: x̃ₖ = xₖ + Cₖ(x̃ₖ₊₁ - xₖ₊₁⁻)
            let xk1pred = multiplyVector F xFilt.[k]
            let diff = Array.init n (fun i -> xSmooth.[k + 1].[i] - xk1pred.[i])
            let Cdiff = multiplyVector C diff
            xSmooth.[k] <- Array.init n (fun i -> xFilt.[k].[i] + Cdiff.[i])
            
            // Smoothed covariance: P̃ₖ = Pₖ + Cₖ(P̃ₖ₊₁ - Pₖ₊₁⁻)Cₖ'
            let Pk1Smooth = PSmooth.[k + 1]
            let Pdiff = subtract Pk1Smooth Pk1pred
            let CPdiff = multiply C Pdiff
            let CPdiffCt = multiply CPdiff (transpose C)
            PSmooth.[k] <- add Pk CPdiffCt
        
        (xSmooth, PSmooth)

// ============================================================================
// TILE 13: MULTIVARIATE CERTAINTY METRICS
// ============================================================================

(*
TILE: multivariateCertainty
TYPE: Matrix -> Vector -> MultivariateCertainty
MATH: ρ = √(det(Σ)/(|Σ_diag|)), det(P), tr(P)
FSHARP: [implementation below]
USES: HIGH - Comprehensive certainty analysis
*)

module MultivariateCertainty =
    open MatrixOps
    
    type MultivariateCertainty = {
        // Uncorrelated certainty (diagonal only)
        DiagonalCertainty: float[]
        // Correlation-adjusted certainty
        CorrelationAdjusted: float[]
        // Overall certainty considering correlations
        OverallCertainty: float
        // Generalized variance
        GeneralizedVariance: float
        // Effective number of independent states
        EffectiveDimension: float
        // Correlation matrix
        CorrelationMatrix: Matrix
    }
    
    /// Extract correlation matrix from covariance
    let correlationMatrix (P: Matrix) : Matrix =
        let n = Array2D.length1 P
        let stdDevs = Array.init n (fun i -> sqrt (max 0.0 P.[i, i]))
        Array2D.init n n (fun i j ->
            if stdDevs.[i] > 0.0 && stdDevs.[j] > 0.0 then
                P.[i, j] / (stdDevs.[i] * stdDevs.[j])
            else 0.0
        )
    
    /// Compute multivariate certainty metrics
    let compute (P: Matrix) (x: Vector) : MultivariateCertainty =
        let n = Array2D.length1 P
        
        // Diagonal certainty
        let diagCert = Array.init n (fun i ->
            let sigma = sqrt (max 0.0 P.[i, i])
            let xMag = abs x.[i]
            if xMag > 1e-10 then max 0.0 (1.0 - sigma / xMag)
            else 1.0 - min 1.0 sigma
        )
        
        // Correlation matrix
        let corr = correlationMatrix P
        
        // Generalized variance
        let genVar = determinant P
        
        // Effective dimension (from correlation)
        let eigVals = 
            // Approximate eigenvalues from correlation matrix diagonal
            Array.init n (fun i -> 1.0 + Array.sumBy (fun j -> if i <> j then abs corr.[i, j] else 0.0) [|0..n-1|])
        let effDim = Array.sum eigVals / (eigVals |> Array.max)
        
        // Correlation-adjusted certainty
        let corrAdjCert = Array.init n (fun i ->
            // Certainty reduced by correlation with uncertain states
            let correlationPenalty = 
                seq { 0 .. n - 1 }
                |> Seq.filter (fun j -> i <> j)
                |> Seq.sumBy (fun j -> abs corr.[i, j] * (1.0 - diagCert.[j]) / float (n - 1))
            max 0.0 (diagCert.[i] - correlationPenalty)
        )
        
        // Overall certainty
        let overall = 
            let product = corrAdjCert |> Array.filter (fun c -> c > 0.0) |> Array.reduce (*)
            let geometric = product ** (1.0 / float n)
            geometric
        
        { DiagonalCertainty = diagCert
          CorrelationAdjusted = corrAdjCert
          OverallCertainty = overall
          GeneralizedVariance = genVar
          EffectiveDimension = effDim
          CorrelationMatrix = corr }

// ============================================================================
// COMPLETE KALMAN FILTER IMPLEMENTATION
// ============================================================================

module KalmanFilter =
    open MatrixOps
    open StatePrediction
    open CovariancePrediction
    open KalmanGain
    open StateUpdate
    open CovarianceUpdate
    open InnovationCalculation
    open CertaintyExtraction
    
    /// Complete Kalman filter state
    type KalmanState = {
        x: Vector              // State estimate
        P: Matrix              // Covariance
        Certainty: CertaintyMetrics
    }
    
    /// Complete Kalman filter configuration
    type KalmanConfig = {
        F: Matrix              // State transition
        H: Matrix              // Observation
        B: Matrix option       // Control input (optional)
        Q: Matrix              // Process noise
        R: Matrix              // Measurement noise
    }
    
    /// Single Kalman filter step
    let step (config: KalmanConfig) (state: KalmanState) (y: Vector) (u: Vector option) : KalmanState =
        // Predict
        let xPred = predict config.F state.x config.B u
        let PPred = predict' config.F state.P config.Q
        
        // Innovation
        let innovation = compute y config.H xPred
        let S = covariance PPred config.H config.R
        
        // Kalman gain
        let K = KalmanGain.compute PPred config.H config.R
        
        // Update
        let xUpdated = update xPred K y config.H
        let PUpdated = updateSimple PPred K config.H
        
        // Extract certainty
        let certainty = extract PUpdated xUpdated
        
        { x = xUpdated; P = PUpdated; Certainty = certainty }
    
    /// Initialize Kalman filter
    let initialize (x0: Vector) (P0: Matrix) : KalmanState =
        let certainty = extract P0 x0
        { x = x0; P = P0; Certainty = certainty }
    
    /// Run filter over sequence of measurements
    let filter (config: KalmanConfig) (x0: Vector) (P0: Matrix) (measurements: Vector seq) : KalmanState seq =
        let initialState = initialize x0 P0
        measurements
        |> Seq.scan (fun state y -> step config state y None) initialState

// ============================================================================
// TILE INDEX
// ============================================================================

(*
TILE INDEX - F# Kalman Filter Tiles for Certainty Tracking

| # | Tile Name                | Type                                   | Uses |
|---|--------------------------|----------------------------------------|------|
| 1 | statePrediction          | Matrix -> Vector -> Matrix opt -> ...  | HIGH |
| 2 | covariancePrediction     | Matrix -> Matrix -> Matrix -> Matrix   | HIGH |
| 3 | kalmanGain               | Matrix -> Matrix -> Matrix -> Matrix   | HIGH |
| 4 | stateUpdate              | Vector -> Matrix -> Vector -> ...      | HIGH |
| 5 | covarianceUpdate         | Matrix -> Matrix -> Matrix -> Matrix   | HIGH |
| 6 | innovationCalculation    | Vector -> Matrix -> Vector -> Vector   | HIGH |
| 7 | certaintyExtraction      | Matrix -> Vector -> CertaintyMetrics   | HIGH |
| 8 | extendedKalmanFilter     | (V->V) -> (V->M) -> ...                | HIGH |
| 9 | unscentedTransform       | Vector -> Matrix -> UKFParams -> ...   | HIGH |
|10 | adaptiveProcessNoise     | Matrix -> Vector -> Matrix -> ...      | MED  |
|11 | informationFilter        | Matrix -> Vector -> Matrix -> ...      | MED  |
|12 | rtsSmoother              | Vector[] -> Matrix[] -> Matrix[] -> ...| MED  |
|13 | multivariateCertainty    | Matrix -> Vector -> MultiCertainty     | HIGH |

MATHEMATICAL FOUNDATIONS:
- State Prediction:    x̂⁻ = Fx + Bu
- Covariance Pred:     P⁻ = FPF' + Q
- Kalman Gain:         K = PH'(HPH' + R)⁻¹
- State Update:        x̂⁺ = x̂⁻ + K(y - Hx̂⁻)
- Covariance Update:   P⁺ = (I - KH)P⁻
- Certainty:           σᵢ = √P[i,i], cert = 1 - σ/|x|
- Entropy:             H = -0.5 ln(|P|) + const
- Generalized Var:     |P| (determinant)
*)

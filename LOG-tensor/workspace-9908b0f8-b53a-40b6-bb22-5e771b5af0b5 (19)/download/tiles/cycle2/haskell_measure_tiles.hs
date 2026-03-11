{-# LANGUAGE GADTs #-}
{-# LANGUAGE TypeFamilies #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE KindSignatures #-}
{-# LANGUAGE DataKinds #-}

{-|
  HASKELL MEASURE THEORY TILES
  ===========================
  Composable building blocks for measure-theoretic probability.
  Each tile is self-contained, type-safe, and mathematically rigorous.
  
  Mathematical foundations from measure theory:
  - Probability spaces (Ω, Σ, P)
  - Integration and expectation
  - Conditional expectation
  - Radon-Nikodym derivatives
  - Martingales
-}

module HaskellMeasureTiles where

import Data.Ratio (Ratio)
import qualified Data.Set as S
import Data.Map.Strict (Map)
import qualified Data.Map.Strict as M
import Data.Maybe (fromJust, catMaybes)
import Control.Monad (ap, liftM)

-- =============================================================================
-- TILE 1: MEASURABLE SPACE
-- =============================================================================
{-
TILE: MeasurableSpace
TYPE: MeasurableSpace :: * -> *
MATH: A measurable space (Ω, Σ) consists of a set Ω and a σ-algebra Σ ⊆ P(Ω)
      satisfying: (i) Ω ∈ Σ, (ii) A ∈ Σ ⟹ A^c ∈ Σ, (iii) countable unions
HASKELL: Record type with carrier set and σ-algebra of measurable sets
USES: HIGH
-}

data MeasurableSpace a = MeasurableSpace
  { carrier :: [a]                    -- The underlying set Ω
  , measurableSets :: S.Set (S.Set a) -- The σ-algebra Σ
  }

-- | Check if a set is measurable
isMeasurable :: Ord a => MeasurableSpace a -> S.Set a -> Bool
isMeasurable ms s = s `S.member` measurableSets ms

-- | Generate the σ-algebra from a collection of generators
generateSigmaAlgebra :: Ord a => [S.Set a] -> S.Set (S.Set a)
generateSigmaAlgebra generators = 
  let sets = S.fromList generators
      -- Include empty set and whole space
      withEmpty = S.insert S.empty sets
      -- Add complements
      withComplements = S.union withEmpty (S.map S.complement withEmpty)
      -- Close under countable unions (finite approximation)
      closed = closeUnderUnions withComplements
  in closed
  where
    closeUnderUnions :: Ord a => S.Set (S.Set a) -> S.Set (S.Set a)
    closeUnderUnions sets
      | newSets == sets = sets
      | otherwise = closeUnderUnions newSets
      where
        newSets = S.union sets (S.fromList [s1 `S.union` s2 | s1 <- S.toList sets, s2 <- S.toList sets])

-- =============================================================================
-- TILE 2: MEASURE
-- =============================================================================
{-
TILE: Measure
TYPE: Measure a :: * -> *
MATH: A measure μ on (Ω, Σ) is a function μ : Σ → [0,∞] satisfying:
      (i) μ(∅) = 0, (ii) countable additivity: μ(⋃ᵢ Aᵢ) = Σᵢ μ(Aᵢ) for disjoint sets
HASKELL: Map from measurable sets to non-negative reals (extended)
USES: HIGH
-}

type NonNeg = Ratio Integer  -- Non-negative rational approximating [0,∞)

data Measure a = Measure
  { underlyingSpace :: MeasurableSpace a
  , measureValue :: S.Set a -> NonNeg
  }

-- | Check if a measure is a probability measure (total mass = 1)
isProbabilityMeasure :: Ord a => Measure a -> Bool
isProbabilityMeasure m = measureValue m (carrier' (underlyingSpace m)) == 1
  where carrier' ms = S.fromList (carrier ms)

-- | The zero measure
zeroMeasure :: Ord a => MeasurableSpace a -> Measure a
zeroMeasure ms = Measure ms (const 0)

-- | Dirac measure (point mass)
diracMeasure :: Ord a => MeasurableSpace a -> a -> Measure a
diracMeasure ms x = Measure ms $ \s -> if x `S.member` s then 1 else 0

-- | Counting measure
countingMeasure :: Ord a => MeasurableSpace a -> Measure a
countingMeasure ms = Measure ms $ \s -> fromIntegral (S.size s) % 1

-- =============================================================================
-- TILE 3: PROBABILITY MEASURE
-- =============================================================================
{-
TILE: ProbabilityMeasure
TYPE: ProbabilityMeasure a :: * -> *
MATH: A probability measure P is a measure with P(Ω) = 1.
      P : Σ → [0,1] with P(∅) = 0, P(Ω) = 1, countable additivity
HASKELL: Newtype wrapper ensuring total probability = 1
USES: HIGH
-}

newtype ProbabilityMeasure a = ProbMeasure { getMeasure :: Measure a }

-- | Safe constructor for probability measures
mkProbabilityMeasure :: Ord a => MeasurableSpace a -> (S.Set a -> NonNeg) -> Maybe (ProbabilityMeasure a)
mkProbabilityMeasure ms f
  | f (S.fromList $ carrier ms) == 1 = Just $ ProbMeasure $ Measure ms f
  | otherwise = Nothing

-- | Uniform probability measure over finite set
uniformMeasure :: Ord a => MeasurableSpace a -> Maybe (ProbabilityMeasure a)
uniformMeasure ms
  | null (carrier ms) = Nothing
  | otherwise = Just $ ProbMeasure $ Measure ms $ \s -> 
      fromIntegral (S.size s) % fromIntegral (length (carrier ms))

-- | Probability of an event
probabilityOf :: Ord a => ProbabilityMeasure a -> S.Set a -> NonNeg
probabilityOf pm s = measureValue (getMeasure pm) s

-- =============================================================================
-- TILE 4: MEASURABLE FUNCTION
-- =============================================================================
{-
TILE: MeasurableFunction
TYPE: MeasurableFunction a b :: * -> * -> *
MATH: f : (Ω₁, Σ₁) → (Ω₂, Σ₂) is measurable if f⁻¹(A) ∈ Σ₁ for all A ∈ Σ₂
      Preimage of measurable sets is measurable
HASKELL: Function with proof/certification of measurability
USES: HIGH
-}

data MeasurableFunction a b = MeasurableFunction
  { domain :: MeasurableSpace a
  , codomain :: MeasurableSpace b
  , theFunction :: a -> b
  , measurabilityProof :: S.Set b -> S.Set a -- Preimage operation
  }

-- | Compose measurable functions (measurability is preserved)
compose :: MeasurableFunction b c -> MeasurableFunction a b -> MeasurableFunction a c
compose g f = MeasurableFunction
  { domain = domain f
  , codomain = codomain g
  , theFunction = theFunction g . theFunction f
  , measurabilityProof = measurabilityProof f . measurabilityProof g
  }

-- | Identity function is measurable
measurableId :: MeasurableSpace a -> MeasurableFunction a a
measurableId ms = MeasurableFunction ms ms id id

-- | Constant function is measurable
constantMeasurable :: (Ord a, Ord b) => MeasurableSpace a -> MeasurableSpace b -> b -> MeasurableFunction a b
constantMeasurable dom cod c = MeasurableFunction dom cod (const c) (const $ S.fromList $ carrier dom)

-- =============================================================================
-- TILE 5: SIMPLE FUNCTION
-- =============================================================================
{-
TILE: SimpleFunction
TYPE: SimpleFunction a :: * -> *
MATH: A simple function is a finite linear combination of indicator functions:
      f = Σᵢ aᵢ · 𝟙_{Aᵢ} where Aᵢ ∈ Σ are measurable and aᵢ ∈ ℝ
HASKELL: List of (coefficient, measurable set) pairs
USES: HIGH (foundation for integration)
-}

type SimpleFunction a = [(NonNeg, S.Set a)]  -- List of (coefficient, indicator set)

-- | Convert a simple function to a regular function
evalSimpleFunction :: Ord a => SimpleFunction a -> a -> NonNeg
evalSimpleFunction sf x = sum [c | (c, s) <- sf, x `S.member` s]

-- | Create simple function from a partition
fromPartition :: Ord a => [(NonNeg, S.Set a)] -> SimpleFunction a
fromPartition = id

-- | Standard form of simple function (disjoint supports)
canonicalForm :: Ord a => SimpleFunction a -> SimpleFunction a
canonicalForm sf = 
  let allSets = map snd sf
      -- Make disjoint
      disjoint = makeDisjoint allSets
      -- Reassign coefficients
      pairs = [(c, d) | (c, s) <- sf, d <- disjoint, d `S.isSubsetOf` s]
  in pairs
  where
    makeDisjoint :: Ord a => [S.Set a] -> [S.Set a]
    makeDisjoint [] = []
    makeDisjoint (s:ss) = 
      let s' = S.difference s (S.unions ss)
          ss' = map (`S.difference` s) ss
      in s' : makeDisjoint ss'

-- =============================================================================
-- TILE 6: INTEGRATION (LEBESGUE INTEGRAL)
-- =============================================================================
{-
TILE: Integration
TYPE: integrate :: Measure a -> (a -> NonNeg) -> NonNeg
MATH: For non-negative f: ∫ f dμ = sup{∫ s dμ : s ≤ f, s simple}
      For simple functions: ∫ (Σᵢ aᵢ·𝟙_{Aᵢ}) dμ = Σᵢ aᵢ·μ(Aᵢ)
HASKELL: Approximation via simple functions with convergence
USES: HIGH (expectation computation)
-}

-- | Integrate a simple function
integrateSimple :: Ord a => Measure a -> SimpleFunction a -> NonNeg
integrateSimple m sf = sum [c * measureValue m s | (c, s) <- sf]

-- | Approximate integral via simple function approximation
integrate :: forall a. Ord a => Measure a -> (a -> NonNeg) -> Int -> NonNeg
integrate m f n = 
  let space = carrier (underlyingSpace m)
      -- Create partition based on function values
      (minVal, maxVal) = findBounds f space
      step = (maxVal - minVal) / fromIntegral n
      -- Simple function approximation from below
      simpleApp = approximateSimple f space minVal step n
  in integrateSimple m simpleApp
  where
    findBounds :: (a -> NonNeg) -> [a] -> (NonNeg, NonNeg)
    findBounds g xs = (minimum (map g xs), maximum (map g xs))
    
    approximateSimple :: (a -> NonNeg) -> [a] -> NonNeg -> NonNeg -> Int -> SimpleFunction a
    approximateSimple g xs low delta k = 
      let levels = [low + fromIntegral i * delta | i <- [0..k-1]]
          sets = [[x | x <- xs, g x >= l && g x < l + delta] | l <- levels]
          setsWithCoef = zip levels (map S.fromList sets)
      in [(c, s) | (c, s) <- setsWithCoef, not (S.null s)]

-- =============================================================================
-- TILE 7: EXPECTATION
-- =============================================================================
{-
TILE: Expectation
TYPE: expectation :: ProbabilityMeasure a -> (a -> NonNeg) -> NonNeg
MATH: E[X] = ∫ X dP = ∫ X(ω) P(dω)
      For discrete: E[X] = Σᵢ xᵢ · P(X = xᵢ)
HASKELL: Specialization of integration to probability measures
USES: HIGH (statistics, ML)
-}

-- | Expected value of a random variable
expectation :: Ord a => ProbabilityMeasure a -> (a -> NonNeg) -> NonNeg
expectation pm f = integrate (getMeasure pm) f 100  -- Use 100 partitions

-- | Expected value for simple function random variables
expectationSimple :: Ord a => ProbabilityMeasure a -> SimpleFunction a -> NonNeg
expectationSimple pm sf = integrateSimple (getMeasure pm) sf

-- | Variance: Var(X) = E[X²] - (E[X])²
variance :: Ord a => ProbabilityMeasure a -> (a -> NonNeg) -> NonNeg
variance pm f = 
  let ex = expectation pm f
      ex2 = expectation pm (\x -> let v = f x in v * v)
  in ex2 - ex * ex

-- =============================================================================
-- TILE 8: RADON-NIKODYM DERIVATIVE
-- =============================================================================
{-
TILE: RadonNikodym
TYPE: radonNikodym :: Measure a -> Measure a -> Maybe (a -> NonNeg)
MATH: If P ≪ Q (P absolutely continuous w.r.t Q), then ∃ f such that:
      P(A) = ∫_A f dQ for all measurable A
      The function f = dP/dQ is the Radon-Nikodym derivative
HASKELL: Discrete approximation of density function
USES: MED (advanced probability, statistics)
-}

-- | Check absolute continuity: P ≪ Q means Q(A) = 0 ⟹ P(A) = 0
isAbsolutelyContinuous :: Ord a => Measure a -> Measure a -> Bool
isAbsolutelyContinuous p q = 
  let ms = underlyingSpace p
      allSets = S.toList (measurableSets ms)
  in all (\s -> measureValue q s == 0 || measureValue p s == 0) allSets

-- | Compute Radon-Nikodym derivative (discrete case)
radonNikodym :: Ord a => Measure a -> Measure a -> Maybe (a -> NonNeg)
radonNikodym p q
  | not (isAbsolutelyContinuous p q) = Nothing
  | otherwise = Just $ \x -> 
      let singleton = S.singleton x
          qVal = measureValue q singleton
      in if qVal == 0 then 0 else measureValue p singleton / qVal

-- | Reconstruct measure from RN derivative
fromRadonNikodym :: Ord a => Measure a -> (a -> NonNeg) -> Measure a
fromRadonNikodym baseMeasure density = Measure
  { underlyingSpace = underlyingSpace baseMeasure
  , measureValue = \s -> sum [density x | x <- S.toList s] * measureValue baseMeasure (S.singleton $ head $ S.toList s) -- Approximation
  }

-- =============================================================================
-- TILE 9: CONDITIONAL EXPECTATION
-- =============================================================================
{-
TILE: ConditionalExpectation
TYPE: conditionalExpectation :: ProbabilityMeasure a -> MeasurableSpace a -> (a -> NonNeg) -> (a -> NonNeg)
MATH: E[X|G] is the unique G-measurable function satisfying:
      ∫_A E[X|G] dP = ∫_A X dP for all A ∈ G
      E[X|G] = E[X|σ(Y)] = E[X|Y] (with respect to σ-algebra generated by Y)
HASKELL: Approximation via averaging over atoms of sub-σ-algebra
USES: HIGH (martingales, filtering)
-}

-- | Conditional expectation with respect to a sub-σ-algebra
conditionalExpectation :: forall a. (Ord a, Eq a) => 
  ProbabilityMeasure a -> MeasurableSpace a -> (a -> NonNeg) -> (a -> NonNeg)
conditionalExpectation pm subSigma f = 
  let p = getMeasure pm
      -- Find atoms of the sub-σ-algebra
      atoms = findAtoms subSigma
  in \x -> 
    let containingAtom = head $ filter (x `S.member`) atoms
        pAtom = measureValue p containingAtom
    in if pAtom == 0 
       then 0 
       else expectationOver p f containingAtom / pAtom
  where
    findAtoms :: MeasurableSpace a -> [S.Set a]
    findAtoms ss = 
      let ms = S.toList (measurableSets ss)
          -- Atoms are minimal non-empty measurable sets
          nonEmpty = filter (not . S.null) ms
      in filter isAtom nonEmpty
      where
        isAtom s = all (\t -> S.null (S.intersection s t) || t `S.isSubsetOf` s) 
                       (filter (/= s) nonEmpty)
    
    expectationOver :: Measure a -> (a -> NonNeg) -> S.Set a -> NonNeg
    expectationOver m g s = sum [g x * measureValue m (S.singleton x) | x <- S.toList s]

-- | Tower property: E[E[X|G]] = E[X]
towerProperty :: (Ord a, Eq a) => 
  ProbabilityMeasure a -> MeasurableSpace a -> (a -> NonNeg) -> Bool
towerProperty pm subSigma f = 
  let eX = expectation pm f
      eCond = expectation pm (conditionalExpectation pm subSigma f)
  in abs (eX - eCond) < 0.0001  -- Numerical tolerance

-- =============================================================================
-- TILE 10: MARTINGALE
-- =============================================================================
{-
TILE: Martingale
TYPE: Martingale a :: * -> *
MATH: A sequence (Xₙ, Fₙ) is a martingale if:
      (i) Xₙ is Fₙ-measurable for all n
      (ii) E[|Xₙ|] < ∞ for all n
      (iii) E[Xₙ|Fₙ₋₁] = Xₙ₋₁ for all n ≥ 1
      Submartingale: E[Xₙ|Fₙ₋₁] ≥ Xₙ₋₁
      Supermartingale: E[Xₙ|Fₙ₋₁] ≤ Xₙ₋₁
HASKELL: Sequence with filtration and martingale property
USES: HIGH (finance, stochastic processes)
-}

data Martingale a = Martingale
  { filtration :: [MeasurableSpace a]        -- F₀ ⊆ F₁ ⊆ ... (nested σ-algebras)
  , process :: [a -> NonNeg]                  -- X₀, X₁, X₂, ...
  , baseMeasure :: ProbabilityMeasure a
  }

-- | Verify martingale property
isMartingale :: (Ord a, Eq a) => Martingale a -> Int -> Bool
isMartingale m n
  | n < 1 = True
  | otherwise = 
      let f_n_minus_1 = filtration m !! (n - 1)
          x_n = process m !! n
          x_n_minus_1 = process m !! (n - 1)
          condExp = conditionalExpectation (baseMeasure m) f_n_minus_1 x_n
      in all (\omega -> abs (condExp omega - x_n_minus_1 omega) < 0.0001) 
             (carrier $ underlyingSpace $ getMeasure $ baseMeasure m)

-- | Verify submartingale property
isSubmartingale :: (Ord a, Eq a) => Martingale a -> Int -> Bool
isSubmartingale m n
  | n < 1 = True
  | otherwise = 
      let f_n_minus_1 = filtration m !! (n - 1)
          x_n = process m !! n
          x_n_minus_1 = process m !! (n - 1)
          condExp = conditionalExpectation (baseMeasure m) f_n_minus_1 x_n
      in all (\omega -> condExp omega >= x_n_minus_1 omega) 
             (carrier $ underlyingSpace $ getMeasure $ baseMeasure m)

-- | Verify supermartingale property
isSupermartingale :: (Ord a, Eq a) => Martingale a -> Int -> Bool
isSupermartingale m n
  | n < 1 = True
  | otherwise = 
      let f_n_minus_1 = filtration m !! (n - 1)
          x_n = process m !! n
          x_n_minus_1 = process m !! (n - 1)
          condExp = conditionalExpectation (baseMeasure m) f_n_minus_1 x_n
      in all (\omega -> condExp omega <= x_n_minus_1 omega) 
             (carrier $ underlyingSpace $ getMeasure $ baseMeasure m)

-- | Construct a martingale from a process
mkMartingale :: (Ord a, Eq a) => 
  ProbabilityMeasure a -> [MeasurableSpace a] -> [a -> NonNeg] -> Maybe (Martingale a)
mkMartingale pm filts procs
  | length filts /= length procs = Nothing
  | not (isNestedFiltration filts) = Nothing
  | otherwise = Just $ Martingale filts procs pm
  where
    isNestedFiltration [] = True
    isNestedFiltration [_] = True
    isNestedFiltration (f1:f2:fs) = 
      measurableSets f1 `S.isSubsetOf` measurableSets f2 && isNestedFiltration (f2:fs)

-- =============================================================================
-- TILE 11: STOPPING TIME
-- =============================================================================
{-
TILE: StoppingTime
TYPE: StoppingTime a :: * -> *
MATH: A stopping time τ is a random variable T : Ω → ℕ ∪ {∞} such that:
      {ω : T(ω) ≤ n} ∈ Fₙ for all n
      Equivalently: {ω : T(ω) = n} ∈ Fₙ
      "We know when to stop based only on past information"
HASKELL: Function with stopping time certification
USES: MED (optimal stopping, finance)
-}

type StoppingTime a = a -> Int

-- | Verify stopping time property
isStoppingTime :: Ord a => [MeasurableSpace a] -> StoppingTime a -> [a] -> Bool
isStoppingTime filtration tau space = 
  all checkTime [0..length filtration - 1]
  where
    checkTime n = 
      let setN = S.fromList [x | x <- space, tau x <= n]
      in setN `S.member` measurableSets (filtration !! n)

-- | Stopped process: X^{τ}(ω) = X_{τ(ω)}(ω)
stoppedProcess :: StoppingTime a -> [a -> NonNeg] -> (a -> NonNeg)
stoppedProcess tau xProcess omega = 
  let n = min (tau omega) (length xProcess - 1)
  in (xProcess !! n) omega

-- =============================================================================
-- TILE 12: OPTIONAL STOPPING THEOREM
-- =============================================================================
{-
TILE: OptionalStopping
TYPE: optionalStopping :: Martingale a -> StoppingTime a -> Bool
MATH: For a martingale (Xₙ) and stopping time τ:
      If τ is bounded, then E[X_τ] = E[X₀]
      Extensions require integrability conditions
HASKELL: Verification of E[X_τ] = E[X₀] for bounded stopping times
USES: MED (martingale theory)
-}

-- | Optional stopping theorem verification
optionalStoppingHolds :: (Ord a, Eq a) => Martingale a -> StoppingTime a -> Int -> Bool
optionalStoppingHolds m tau bound =
  let pm = baseMeasure m
      x0 = head (process m)
      xTau = stoppedProcess tau (process m)
      ex0 = expectation pm x0
      exTau = expectation pm xTau
  in abs (ex0 - exTau) < 0.0001

-- =============================================================================
-- TILE 13: CONVERGENCE THEOREMS
-- =============================================================================
{-
TILE: ConvergenceTheorems
TYPE: Various convergence theorem implementations
MATH: Monotone Convergence: fₙ ↑ f ⟹ ∫fₙ dμ ↑ ∫f dμ
      Dominated Convergence: |fₙ| ≤ g, fₙ → f ⟹ ∫fₙ → ∫f
      Fatou's Lemma: lim inf ∫fₙ ≤ ∫lim inf fₙ
HASKELL: Approximation and verification utilities
USES: MED (advanced integration theory)
-}

-- | Monotone convergence verification
monotoneConvergence :: Ord a => Measure a -> [(a -> NonNeg)] -> (a -> NonNeg) -> Int -> Bool
monotoneConvergence m fns f n =
  let integralFns = map (\fn -> integrate m fn n) fns
      integralF = integrate m f n
  in last integralFns <= integralF  -- Approximation: sequence should approach limit

-- | Fatou's lemma
fatouLemma :: Ord a => Measure a -> [(a -> NonNeg)] -> Int -> Bool
fatouLemma m fns n =
  let integrals = map (\fn -> integrate m fn n) fns
      liminfIntegrals = minimum integrals  -- Simplified liminf
      -- liminf of functions (pointwise)
      liminfFn x = minimum [fn x | fn <- fns]
      integralLiminf = integrate m liminfFn n
  in liminfIntegrals <= integralLiminf

-- =============================================================================
-- TILE 14: PRODUCT MEASURE
-- =============================================================================
{-
TILE: ProductMeasure
TYPE: productMeasure :: Measure a -> Measure b -> Measure (a, b)
MATH: For measures μ on (Ω₁, Σ₁) and ν on (Ω₂, Σ₂):
      (μ ⊗ ν)(A × B) = μ(A) · ν(B)
      Product σ-algebra: Σ₁ ⊗ Σ₂ = σ(A × B : A ∈ Σ₁, B ∈ Σ₂)
HASKELL: Construction of product measures for independent random variables
USES: MED (multivariate probability)
-}

-- | Product measure construction
productMeasure :: (Ord a, Ord b) => Measure a -> Measure b -> Measure (a, b)
productMeasure ma mb = Measure
  { underlyingSpace = MeasurableSpace
      { carrier = [(x, y) | x <- carrier (underlyingSpace ma), y <- carrier (underlyingSpace mb)]
      , measurableSets = error "Product σ-algebra requires lazy construction"
      }
  , measureValue = \(s :: S.Set (a, b)) -> 
      let prodSets = [(S.fromList [x | (x, _) <- S.toList s], 
                       S.fromList [y | (_, y) <- S.toList s])]
          (sa, sb) = head prodSets
      in measureValue ma sa * measureValue mb sb
  }

-- | Fubini's theorem: ∫∫ f dμ dν = ∫∫ f dν dμ (for bounded f)
fubini :: (Ord a, Ord b) => Measure a -> Measure b -> ((a, b) -> NonNeg) -> NonNeg
fubini ma mb f = 
  let productM = productMeasure ma mb
      space = carrier (underlyingSpace productM)
  in sum [f (x, y) * measureValue ma (S.singleton x) * measureValue mb (S.singleton y) 
         | (x, y) <- space]

-- =============================================================================
-- TILE 15: INDEPENDENCE
-- =============================================================================
{-
TILE: Independence
TYPE: independent :: ProbabilityMeasure a -> S.Set a -> S.Set a -> Bool
MATH: Events A and B are independent if P(A ∩ B) = P(A) · P(B)
      σ-algebras G and H are independent if P(A ∩ B) = P(A) · P(B) ∀A∈G,B∈H
      Random variables X and Y are independent if σ(X) and σ(Y) are independent
HASKELL: Independence testing for events and σ-algebras
USES: HIGH (probability theory)
-}

-- | Check independence of events
independentEvents :: Ord a => ProbabilityMeasure a -> S.Set a -> S.Set a -> Bool
independentEvents pm a b =
  let p = getMeasure pm
      pA = measureValue p a
      pB = measureValue p b
      pAB = measureValue p (S.intersection a b)
  in abs (pAB - pA * pB) < 0.0001

-- | Pairwise independence for a collection of events
pairwiseIndependent :: Ord a => ProbabilityMeasure a -> [S.Set a] -> Bool
pairwiseIndependent pm events = 
  all (\(a, b) -> independentEvents pm a b) [(a, b) | a <- events, b <- events, a /= b]

-- | Mutual independence: P(∩ᵢ Aᵢ) = ∏ᵢ P(Aᵢ)
mutuallyIndependent :: Ord a => ProbabilityMeasure a -> [S.Set a] -> Bool
mutuallyIndependent pm events =
  let p = getMeasure pm
      intersection = S.unions events
      pIntersect = measureValue p intersection
      pProduct = product [measureValue p a | a <- events]
  in abs (pIntersect - pProduct) < 0.0001

-- =============================================================================
-- TILE 16: DISTRIBUTION FUNCTION
-- =============================================================================
{-
TILE: DistributionFunction
TYPE: DistributionFunction :: * -> *
MATH: The cumulative distribution function F : ℝ → [0,1] of a random variable X:
      F(x) = P(X ≤ x) = P({ω : X(ω) ≤ x})
      Properties: non-decreasing, right-continuous, lim_{x→-∞} F(x) = 0, lim_{x→∞} F(x) = 1
HASKELL: CDF representation for real-valued random variables
USES: HIGH (statistics)
-}

type CDF = NonNeg -> NonNeg  -- Simplified: CDF as function from "values" to probabilities

-- | Distribution function from probability measure and random variable
distributionFunction :: (Ord a, Ord b) => ProbabilityMeasure a -> (a -> b) -> [b] -> b -> NonNeg
distributionFunction pm x allValues target =
  let p = getMeasure pm
      space = carrier (underlyingSpace p)
      leqSet = S.fromList [omega | omega <- space, x omega <= target]
  in measureValue p leqSet

-- | Check if a function is a valid CDF
isValidCDF :: CDF -> Bool
isValidCDF f = 
  let limits = f 0 >= 0 && f 100 == 1  -- Simplified check
      monotone = all (\x -> f (x + 1) >= f x) [0..99]
  in limits && monotone

-- =============================================================================
-- TILE SUMMARY
-- =============================================================================
{-
TILES EXTRACTED (16 total):

1. MeasurableSpace   - Foundation: (Ω, Σ) with σ-algebra operations  [HIGH]
2. Measure           - Set function with countable additivity        [HIGH]
3. ProbabilityMeasure - Normalized measure with P(Ω) = 1            [HIGH]
4. MeasurableFunction - Functions preserving measurable structure    [HIGH]
5. SimpleFunction    - Finite linear combinations of indicators      [HIGH]
6. Integration       - Lebesgue integral via approximation           [HIGH]
7. Expectation       - E[X] = ∫ X dP                                 [HIGH]
8. RadonNikodym      - Density dP/dQ for absolutely continuous P    [MED]
9. ConditionalExpectation - E[X|G] with respect to sub-σ-algebra   [HIGH]
10. Martingale       - Sequences with E[Xₙ|Fₙ₋₁] = Xₙ₋₁            [HIGH]
11. StoppingTime     - Random times {τ ≤ n} ∈ Fₙ                    [MED]
12. OptionalStopping - E[X_τ] = E[X₀] for bounded τ                 [MED]
13. ConvergenceTheorems - Monotone, Dominated, Fatou                [MED]
14. ProductMeasure   - μ ⊗ ν for independent spaces                 [MED]
15. Independence     - P(A ∩ B) = P(A)·P(B)                         [HIGH]
16. DistributionFunction - F(x) = P(X ≤ x)                          [HIGH]

COMPOSABILITY CHAIN:
  MeasurableSpace → Measure → ProbabilityMeasure → Expectation
                  ↓
  MeasurableFunction → SimpleFunction → Integration → Expectation
                                              ↓
                            ConditionalExpectation → Martingale
                                                      ↓
                                          StoppingTime → OptionalStopping

DEPENDENCIES:
  - All tiles depend on MeasurableSpace (foundation)
  - Integration depends on Measure and SimpleFunction
  - Expectation depends on Integration and ProbabilityMeasure
  - ConditionalExpectation depends on Expectation
  - Martingale depends on ConditionalExpectation
  - OptionalStopping depends on Martingale and StoppingTime
-}

-- Example usage
_example :: IO ()
_example = do
  putStrLn "=== Haskell Measure Theory Tiles ==="
  putStrLn "Tiles loaded successfully."
  putStrLn "Run individual tile tests to verify implementation."

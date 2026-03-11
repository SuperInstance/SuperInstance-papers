{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE GADTs #-}
{-# LANGUAGE InstanceSigs #-}

-- ============================================================================
-- RTT TILE INSTANCES - Concrete Implementations
-- ============================================================================
--
-- This module provides concrete implementations of category theory tiles
-- specifically designed for RTT (Recursive Tile Theory) architecture.
--
-- ============================================================================

module RTTTileInstances where

import Control.Comonad
import Control.Monad
import Data.Functor

-- ============================================================================
-- TILE: ret (return) - HIGH PRIORITY - IMPLEMENTATION
-- ============================================================================

-- | RTT Observation Tile
-- Represents a single observation in RTT
data Observation a = Observation {
  obsValue :: a,
  obsCertainty :: Double,  -- Certainty level [0,1]
  obsSource :: String      -- Source identifier
} deriving (Show, Eq)

-- | RTT Observation Monad
instance Monad Observation where
  ret a = Observation a 1.0 "return"
  bind obs f = 
    let newObs = f (obsValue obs)
    in newObs { 
         obsCertainty = obsCertainty obs * obsCertainty newObs,
         obsSource = obsSource obs ++ "->" ++ obsSource newObs
       }

instance Functor Observation where
  fmap = liftM

instance Applicative Observation where
  pure = ret
  (<*>) = ap

-- ============================================================================
-- TILE: bind (bind/flatMap) - HIGH PRIORITY - IMPLEMENTATION
-- ============================================================================

-- | RTT Observation Chain
-- Chains multiple observations together
data ObservationChain a where
  Single   :: Observation a -> ObservationChain a
  Chain    :: ObservationChain (a -> b) -> ObservationChain a -> ObservationChain b
  Validate :: (a -> Bool) -> ObservationChain a -> ObservationChain a

instance Monad ObservationChain where
  ret = Single . ret
  bind (Single obs) f = 
    case f (obsValue obs) of
      Single obs' -> Single $ bind obs (\v -> obs')
      chain -> chain
  bind (Chain cf ca) f = Chain (bind cf ret) (bind ca f)
  bind (Validate p c) f = Validate p (bind c f)

instance Functor ObservationChain where
  fmap = liftM

instance Applicative ObservationChain where
  pure = ret
  (<*>) = ap

-- ============================================================================
-- TILE: ext (extract) - HIGH PRIORITY - IMPLEMENTATION
-- ============================================================================

-- | RTT Context - Represents observation with surrounding context
data Context a = Context {
  ctxValue :: a,
  ctxLeft  :: [a],   -- Past observations
  ctxRight :: [a],   -- Future observations
  ctxIndex :: Int    -- Current position
} deriving (Show, Eq)

-- | Extract the current focus
-- Tile: ext - HIGH
extContext :: Context a -> a
extContext = ctxValue

-- | RTT Context as Comonad
instance Functor Context where
  fmap f (Context v l r i) = Context (f v) (map f l) (map f r) i

instance Comonad Context where
  extract = ctxValue
  duplicate ctx@(Context v l r i) = 
    Context ctx 
      (zipWith (\j lv -> Context lv (take j l) (lv : drop (j+1) l) j) [0..] l)
      (zipWith (\j rv -> Context rv (rv : take j r) (drop (j+1) r) j) [i+1..] r)
      i
  extend f ctx = f <$> duplicate ctx

-- ============================================================================
-- TILE: dup (duplicate) - HIGH PRIORITY - IMPLEMENTATION
-- ============================================================================

-- | Duplicate creates nested context structure
-- Tile: dup - HIGH
dupContext :: Context a -> Context (Context a)
dupContext = duplicate

-- ============================================================================
-- TILE: laj/raj (adjoints) - MED PRIORITY - IMPLEMENTATION
-- ============================================================================

-- | Free RTT structure (Left adjoint)
-- Constructs observations from primitives
data FreeRTT a = FreeRTT {
  freeObs :: a,
  freeLevel :: Int
} deriving (Show, Eq)

-- | Forgetful RTT structure (Right adjoint)
-- Extracts primitives from observations
data ForgetRTT a = ForgetRTT {
  forgetObs :: a,
  forgetValid :: Bool
} deriving (Show, Eq)

instance Functor FreeRTT where
  fmap f (FreeRTT a l) = FreeRTT (f a) l

instance Functor ForgetRTT where
  fmap f (ForgetRTT a v) = ForgetRTT (f a) v

-- | Left adjoint: Free construction
-- Tile: laj - MED
lajRTT :: (a -> ForgetRTT b) -> FreeRTT a -> b
lajRTT f (FreeRTT a _) = forgetObs (f a)

-- | Right adjoint: Forgetful construction
-- Tile: raj - MED
rajRTT :: (FreeRTT a -> b) -> a -> ForgetRTT b
rajRTT f a = ForgetRTT (f (FreeRTT a 0)) True

-- ============================================================================
-- TILE: lim (limit) - MED PRIORITY - IMPLEMENTATION
-- ============================================================================

-- | RTT Observation Product (Limit)
-- Represents aggregated observations
data ProductObs a b = ProductObs {
  prodLeft :: Observation a,
  prodRight :: Observation b,
  prodJointCertainty :: Double
} deriving (Show)

-- | Construct product (limit)
-- Tile: lim - MED
limitProduct :: Observation a -> Observation b -> ProductObs a b
limitProduct obsA obsB = ProductObs obsA obsB (min (obsCertainty obsA) (obsCertainty obsB))

-- | Projections from product
projLeft :: ProductObs a b -> Observation a
projLeft = prodLeft

projRight :: ProductObs a b -> Observation b
projRight = prodRight

-- ============================================================================
-- TILE: colim (colimit) - MED PRIORITY - IMPLEMENTATION
-- ============================================================================

-- | RTT Observation Coproduct (Colimit)
-- Represents alternative observations
data CoproductObs a b = 
    CoprodLeft (Observation a)
  | CoprodRight (Observation b)
  | CoprodBoth (Observation a) (Observation b)
  deriving (Show)

-- | Construct coproduct (colimit)
-- Tile: colim - MED
colimitCoproduct :: Observation a -> Observation b -> CoproductObs a b
colimitCoproduct obsA obsB = 
  if obsCertainty obsA >= obsCertainty obsB
    then CoprodLeft obsA
    else CoprodRight obsB

-- | Injections into coproduct
injLeft :: Observation a -> CoproductObs a b
injLeft = CoprodLeft

injRight :: Observation b -> CoproductObs a b
injRight = CoprodRight

-- ============================================================================
-- TILE: exp (exponential) - MED PRIORITY - IMPLEMENTATION
-- ============================================================================

-- | RTT Observation Transformer (Exponential)
-- Represents functions between observation types
newtype ObsTransformer a b = ObsTransformer {
  runTransformer :: Observation a -> Observation b
}

-- | Curry for observation transformers
-- Tile: exp - MED
curryObs :: (Observation (a, b) -> Observation c) -> Observation a -> ObsTransformer b c
curryObs f obsA = ObsTransformer $ \obsB -> 
  let combined = Observation (obsValue obsA, obsValue obsB) 
                             (min (obsCertainty obsA) (obsCertainty obsB))
                             (obsSource obsA ++ "," ++ obsSource obsB)
  in f combined

-- | Uncurry for observation transformers
uncurryObs :: ObsTransformer a b -> Observation (a, b) -> Observation b
uncurryObs (ObsTransformer f) obsPair = f (fmap fst obsPair)

-- ============================================================================
-- RTT SPECIFIC OPERATIONS
-- ============================================================================

-- | RTT Certainty Propagation
propagateCertainty :: Double -> Observation a -> Observation a
propagateCertainty factor obs = obs { obsCertainty = factor * obsCertainty obs }

-- | RTT Observation Fusion
fuseObservations :: Observation a -> Observation a -> Observation a
fuseObservations obs1 obs2 =
  let c1 = obsCertainty obs1
      c2 = obsCertainty obs2
      total = c1 + c2
  in Observation {
    obsValue = if c1 >= c2 then obsValue obs1 else obsValue obs2,
    obsCertainty = max c1 c2,
    obsSource = obsSource obs1 ++ "|" ++ obsSource obs2
  }

-- | RTT Context Navigation
moveLeft :: Context a -> Maybe (Context a)
moveLeft ctx@(Context _ [] _ _) = Nothing
moveLeft (Context v (l:ls) rs i) = Just $ Context l ls (v:rs) (i-1)

moveRight :: Context a -> Maybe (Context a)
moveRight ctx@(Context _ _ [] _) = Nothing
moveRight (Context v ls (r:rs) i) = Just $ Context r (v:ls) rs (i+1)

-- ============================================================================
-- TILE EXTRACTION USAGE EXAMPLES
-- ============================================================================

-- | Example: Using ret tile
exampleRet :: Observation Int
exampleRet = ret 42  -- Creates Observation 42 with certainty 1.0

-- | Example: Using bind tile
exampleBind :: Observation Int
exampleBind = bind (ret 10) (\x -> ret (x * 2))  -- Observation 20

-- | Example: Using ext tile
exampleExt :: Int
exampleExt = extract (Context 5 [1,2,3] [7,8,9] 3)  -- Returns 5

-- | Example: Using dup tile
exampleDup :: Context (Context Int)
exampleDup = duplicate (Context 5 [1,2] [8,9] 2)

-- | Example: Using lim tile
exampleLim :: ProductObs Int String
exampleLim = limitProduct (ret 42) (ret "answer")

-- | Example: Using colim tile
exampleColim :: CoproductObs Int String
exampleColim = colimitCoproduct (ret 42) (ret "answer")

-- | Example: Using exp tile
exampleExp :: ObsTransformer Int Int
exampleExp = curryObs (\obsPair -> fmap (\(a,_) -> a*2) obsPair) (ret 5)

-- ============================================================================

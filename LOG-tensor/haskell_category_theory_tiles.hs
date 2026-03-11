{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE KindSignatures #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE GADTs #-}
{-# LANGUAGE ConstraintKinds #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE FunctionalDependencies #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE UndecidableInstances #-}
{-# LANGUAGE PolyKinds #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeFamilies #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE InstanceSigs #-}

-- ============================================================================
-- CYCLE 5: Category Theory Deep Foundations - RTT Tile Extraction
-- ============================================================================
-- 
-- This module extracts fundamental category-theoretic structures as tiles
-- for the Recursive Tile Theory (RTT) architecture. Each tile represents
-- a categorical primitive with its laws and RTT applications.
--
-- Mathematical Rigor: All structures satisfy their respective category laws
-- RTT Integration: Each tile maps to RTT primitive operations
--
-- Extracted Tiles (Priority):
--   ret  (return/unit)  - HIGH
--   bind (bind/flatMap) - HIGH
--   ext  (extract)      - HIGH
--   dup  (duplicate)    - HIGH
--   laj  (left adjoint) - MED
--   raj  (right adjoint) - MED
--   lim  (limit)        - MED
--   colim (colimit)     - MED
--   exp  (exponential)  - MED
-- ============================================================================

module CategoryTheoryTiles where

import Control.Category ((>>>), (<<<))
import qualified Control.Category as Cat
import Data.Kind (Type, Constraint)

-- ============================================================================
-- FOUNDATIONAL TYPE CLASSES
-- ============================================================================

-- | Category class with identity and composition
class Category (k :: Type -> Type -> Type) where
  idC  :: k a a
  (.)  :: k b c -> k a b -> k a c

instance Category (->) where
  idC = \x -> x
  (.) = \g f x -> g (f x)

-- ============================================================================
-- TILE: ret (return/unit) - HIGH PRIORITY
-- ============================================================================
--
-- Mathematical Definition:
--   ret : a → M a
--
-- Laws (Left Identity):
--   ret >>= f ≡ f
--
-- RTT Application:
--   In RTT, 'ret' lifts a primitive tile into a composed context.
--   ret : Tile₀ → TileContext
--   This enables embedding basic observations into the inference chain.
--
-- Category Theory Perspective:
--   ret is the unit of the monad (endo)functor M : C → C
--   η : Id_C ⇒ M (natural transformation)

-- | Monad with return (ret) as fundamental tile
class Monad m where
  -- | Tile: ret - return/unit (HIGH)
  -- Lifts a value into monadic context
  -- Type: a → m a
  ret :: a -> m a
  
  -- | Tile: bind - bind/flatMap (HIGH)
  -- Sequences monadic computations
  -- Type: m a → (a → m b) → m b
  bind :: m a -> (a -> m b) -> m b

-- | Monad laws as type constraints
type MonadLaws m = (
    -- Left identity: ret a >>= f ≡ f a
    -- Right identity: m >>= ret ≡ m
    -- Associativity: (m >>= f) >>= g ≡ m >>= (\x -> f x >>= g)
  )

-- ============================================================================
-- TILE: bind (bind/flatMap) - HIGH PRIORITY
-- ============================================================================
--
-- Mathematical Definition:
--   bind : M a → (a → M b) → M b
--
-- Laws (Right Identity):
--   m >>= ret ≡ m
--
-- Laws (Associativity):
--   (m >>= f) >>= g ≡ m >>= (\x -> f x >>= g)
--
-- RTT Application:
--   In RTT, 'bind' represents the Kleisli composition of tiles.
--   bind : TileContext → (Tile₀ → TileContext) → TileContext
--   This is the fundamental composition mechanism for inference chains.
--
-- Category Theory Perspective:
--   bind (μ) is the multiplication natural transformation
--   μ : M ∘ M ⇒ M (join in Haskell)

-- | Kleisli category for a monad
newtype Kleisli m a b = Kleisli { runKleisli :: a -> m b }

instance Monad m => Category (Kleisli m) where
  idC = Kleisli ret
  (Kleisli g) . (Kleisli f) = Kleisli (\a -> bind (f a) g)

-- | Alternative bind formulation using join
join :: Monad m => m (m a) -> m a
join mma = bind mma id

-- ============================================================================
-- TILE: ext (extract) - HIGH PRIORITY
-- ============================================================================
--
-- Mathematical Definition:
--   ext : W a → a
--
-- Laws (Left Identity):
--   ext (extend f) ≡ f
--
-- RTT Application:
--   In RTT, 'ext' extracts the focused value from a contextual tile.
--   ext : TileContext → Tile₀
--   This enables unwrapping composed observations to primitive observations.
--
-- Category Theory Perspective:
--   ext (ε) is the counit of the comonad
--   ε : W ⇒ Id_C (natural transformation)

-- | Comonad with extract (ext) as fundamental tile
class Comonad w where
  -- | Tile: ext - extract (HIGH)
  -- Extracts value from comonadic context
  -- Type: w a → a
  ext :: w a -> a
  
  -- | Tile: dup - duplicate (HIGH)
  -- Duplicates the context
  -- Type: w a → w (w a)
  dup :: w a -> w (w a)
  
  -- | extend - co-Kleisli extension
  -- Type: (w a → b) → w a → w b
  extend :: (w a -> b) -> w a -> w b
  extend f wa = fmapC f (dup wa)
    where fmapC g = extend (g . ext)

-- | Comonad laws as constraints
type ComonadLaws w = (
    -- Left identity: ext (extend f) ≡ f
    -- Right identity: extend ext ≡ id
    -- Associativity: extend f . extend g ≡ extend (f . extend g)
  )

-- ============================================================================
-- TILE: dup (duplicate) - HIGH PRIORITY
-- ============================================================================
--
-- Mathematical Definition:
--   dup : W a → W (W a)
--
-- Laws (Right Identity):
--   extend ext ≡ id
--
-- Laws (Associativity):
--   extend f . extend g ≡ extend (f . extend g)
--
-- RTT Application:
--   In RTT, 'dup' creates nested observation contexts.
--   dup : TileContext → TileContext²
--   This enables hierarchical observation structures for recursive analysis.
--
-- Category Theory Perspective:
--   dup (δ) is the comultiplication natural transformation
--   δ : W ⇒ W ∘ W (natural transformation)

-- ============================================================================
-- ADJUNCTIONS
-- ============================================================================

-- | Adjunction between functors F and G
-- F ⊣ G (F is left adjoint to G)
--
-- Mathematical Definition:
--   Hom(F a, b) ≅ Hom(a, G b)
--
-- This gives us:
--   unit   : a → G (F a)
--   counit : F (G b) → b

class (Functor f, Functor g) => Adjunction f g | f -> g, g -> f where
  -- | Tile: laj - left adjoint (MED)
  -- Left adjoint functor map
  -- Type: (a → g b) → f a → b
  laj :: (a -> g b) -> f a -> b
  
  -- | Tile: raj - right adjoint (MED)
  -- Right adjoint functor map
  -- Type: (f a → b) → a → g b
  raj :: (f a -> b) -> a -> g b
  
  -- | Unit of adjunction
  unit :: a -> g (f a)
  unit = raj id
  
  -- | Counit of adjunction
  counit :: f (g a) -> a
  counit = laj id

-- ============================================================================
-- TILE: laj (left adjoint) - MED PRIORITY
-- ============================================================================
--
-- Mathematical Definition:
--   laj : (a → G b) → F a → b
--
-- Laws:
--   laj f . F g = laj (f . g)
--   laj id = counit
--
-- RTT Application:
--   In RTT, 'laj' transforms RTT observation patterns.
--   This enables converting between different representation layers.
--
-- Category Theory Perspective:
--   The left adjoint F preserves colimits (coproducts, initial objects)
--   F is "free" in the sense of freely generating structure

-- ============================================================================
-- TILE: raj (right adjoint) - MED PRIORITY
-- ============================================================================
--
-- Mathematical Definition:
--   raj : (F a → b) → a → G b
--
-- Laws:
--   G g . raj f = raj (g . f)
--   raj id = unit
--
-- RTT Application:
--   In RTT, 'raj' creates observation contexts from evaluation patterns.
--   This enables constructing observation structures from computations.
--
-- Category Theory Perspective:
--   The right adjoint G preserves limits (products, terminal objects)
--   G is "forgetful" in the sense of remembering underlying structure

-- ============================================================================
-- FUNCTOR (for reference)
-- ============================================================================

class Functor f where
  fmap :: (a -> b) -> f a -> f b

-- ============================================================================
-- LIMITS AND COLIMITS
-- ============================================================================

-- | Category with terminal object
class Category k => HasTerminal k where
  -- | Terminal object (limit of empty diagram)
  terminal :: k a ()

-- | Category with initial object
class Category k => HasInitial k where
  -- | Initial object (colimit of empty diagram)
  initial :: k () a

-- ============================================================================
-- TILE: lim (limit) - MED PRIORITY
-- ============================================================================
--
-- Mathematical Definition:
--   lim : (J → C) → C
--   For a diagram D : J → C, the limit is an object L with projections
--   π_j : L → D(j) satisfying the universal property.
--
-- Special Cases:
--   Product: limit of discrete two-object diagram
--   Equalizer: limit of parallel pair
--   Pullback: limit of cospan
--   Terminal: limit of empty diagram
--
-- RTT Application:
--   In RTT, 'lim' represents the universal observation aggregation.
--   lim : Family[Tile] → Tile
--   This constructs the "most informed" observation from partial observations.

-- | Binary product (limit of two-object diagram)
class Category k => HasProduct k where
  -- | Tile: lim variant - product (MED)
  -- Type: k a b → k a c → k a (b, c)
  (**) :: k a b -> k a c -> k a (b, c)
  
  -- | Projections
  fst :: k (b, c) b
  snd :: k (b, c) c

-- | General limit construction
data Limit f a = Limit {
  limitObj :: f a,
  limitProj :: forall j. f j -> a -> j
}

-- ============================================================================
-- TILE: colim (colimit) - MED PRIORITY
-- ============================================================================
--
-- Mathematical Definition:
--   colim : (J → C) → C
--   For a diagram D : J → C, the colimit is an object C with injections
--   ι_j : D(j) → C satisfying the universal property.
--
-- Special Cases:
--   Coproduct: colimit of discrete two-object diagram
--   Coequalizer: colimit of parallel pair
--   Pushout: colimit of span
--   Initial: colimit of empty diagram
--
-- RTT Application:
--   In RTT, 'colim' represents the universal observation partition.
--   colim : Family[Tile] → Tile
--   This constructs the "most general" observation from specific observations.

-- | Binary coproduct (colimit of two-object diagram)
class Category k => HasCoproduct k where
  -- | Tile: colim variant - coproduct (MED)
  -- Type: k a c -> k b c -> k (Either a b) c
  (+++) :: k a c -> k b c -> k (Either a b) c
  
  -- | Injections
  inl :: k a (Either a b)
  inr :: k b (Either a b)

-- | General colimit construction
data Colimit f a = Colimit {
  colimObj :: f a,
  colimInj :: forall j. j -> a -> f j
}

-- ============================================================================
-- EXPONENTIALS
-- ============================================================================

-- ============================================================================
-- TILE: exp (exponential) - MED PRIORITY
-- ============================================================================
--
-- Mathematical Definition:
--   exp : C(b^a, c) ≅ C(b, c × a)
--
-- This is currying at the categorical level:
--   curry   : (a × b → c) → (a → c^b)
--   uncurry : (a → c^b) → (a × b → c)
--
-- Laws:
--   curry . uncurry ≡ id
--   uncurry . curry ≡ id
--
-- RTT Application:
--   In RTT, 'exp' represents observation transformation functions as tiles.
--   exp : Tile^Tile represents the space of observation transformers.
--   This enables higher-order observation manipulation.
--
-- Category Theory Perspective:
--   Exponentials make C a Cartesian Closed Category (CCC)
--   This is the categorical semantics of simply-typed lambda calculus

class HasProduct k => HasExponential k where
  -- | Tile: exp - exponential/curry (MED)
  -- Type: k (a, b) c → k a (k b c)
  curry :: k (a, b) c -> k a (k b c)
  
  -- | Uncurry
  uncurry :: k a (k b c) -> k (a, b) c
  
  -- | Application (eval)
  eval :: k (k b c, b) c

-- ============================================================================
-- PRESHEAVES
-- ============================================================================

-- | Presheaf: contravariant functor from C to Set
-- 
-- Mathematical Definition:
--   P : C^op → Set
--
-- For morphisms f : a → b in C:
--   P(f) : P(b) → P(a) (reverses direction)
--
-- Laws:
--   P(id) = id
--   P(g ∘ f) = P(f) ∘ P(g)
--
-- RTT Application:
--   In RTT, presheaves represent observation protocols.
--   P : Tile^op → Prop represents the "compatibility" observations.
--   This enables context-dependent observation validation.
--
-- Category Theory Perspective:
--   Presheaves form the category of "varying sets" over C
--   This is the foundation for sheaf theory and topos theory

-- | Presheaf (contravariant functor)
class Presheaf p where
  -- | Map on morphisms (contravariant)
  cmap :: (a -> b) -> p b -> p a

-- | Yoneda embedding
-- Y : C → [C^op, Set]
-- Y(a) = Hom(-, a)
newtype Yoneda f a = Yoneda { runYoneda :: forall r. (a -> r) -> f r }

-- | Yoneda lemma: Hom(Y(a), P) ≅ P(a)
-- This is a fundamental result in category theory
yonedaLemma :: (forall r. (a -> r) -> f r) -> f a
yonedaLemma k = k id

-- ============================================================================
-- TOPOS THEORY
-- ============================================================================

-- | Subobject classifier
--
-- Mathematical Definition:
--   Ω : Object with morphism true : 1 → Ω
--   For any monomorphism m : A' ↪ A, there exists unique χ_m : A → Ω
--   such that A' is the pullback of true along χ_m.
--
-- RTT Application:
--   In RTT, Ω represents the space of "partial truth" or "certainty values".
--   Ω : Tile representing the "observation validity" space.
--   This enables internal logic of observation spaces.
--
-- Category Theory Perspective:
--   A topos is a category with:
--   1. Finite limits (products, equalizers, terminal)
--   2. Exponentials (Cartesian closed)
--   3. Subobject classifier Ω
--   
--   Every topos has an internal logic (higher-order intuitionistic logic)

-- | Subobject classifier structure
data SubobjectClassifier o where
  -- | The truth object Ω
  Omega :: o
  
  -- | True morphism: 1 → Ω
  True :: o -> o

-- | Characteristic morphism
class HasSubobjectClassifier k where
  -- | Classify a subobject
  -- Type: k a Ω
  classify :: k a () -> k a (SubobjectClassifier a)

-- | Topos: category with subobject classifier
class (HasProduct k, HasExponential k, HasSubobjectClassifier k) => Topos k where
  -- | Power object P(a) = Ω^a
  power :: k a (SubobjectClassifier a)
  
  -- | Element relation ∈_a : a × P(a) → Ω
  elem :: k (a, SubobjectClassifier a) (SubobjectClassifier a)

-- ============================================================================
-- RTT-SPECIFIC INSTANCES
-- ============================================================================

-- | RTT Tile representation
data RTTTile a where
  -- | Primitive observation tile
  PrimTile :: a -> RTTTile a
  
  -- | Composed tiles
  CompTile :: RTTTile (a -> b) -> RTTTile a -> RTTTile b
  
  -- | Observed tile with context
  ObsTile :: RTTTile a -> (a -> Bool) -> RTTTile a

-- | RTT Tile as a Monad
instance Monad RTTTile where
  ret = PrimTile
  bind (PrimTile a) f = f a
  bind (CompTile tf ta) f = CompTile (bind tf (\g -> ret (g .))) (bind ta f)
  bind (ObsTile t p) f = ObsTile (bind t f) p

-- | RTT Tile as a Functor
instance Functor RTTTile where
  fmap f t = bind t (ret . f)

-- ============================================================================
-- RTT OBSERVATION CONTEXT (COMONAD)
-- ============================================================================

-- | RTT Observation Context - Comonad for contextual observations
data RTTContext a = RTTContext {
  -- | Current focused observation
  focus :: a,
  -- | Observation history (for recursive analysis)
  history :: [a],
  -- | Context depth
  depth :: Int
}

-- | RTT Context as a Comonad
instance Comonad RTTContext where
  ext = focus
  dup ctx@(RTTContext f h d) = RTTContext ctx (f : h) (d + 1)
  extend f ctx = f (dup ctx) `seq` RTTContext (f ctx) (focus ctx : history ctx) (depth ctx + 1)

instance Functor RTTContext where
  fmap f (RTTContext a h d) = RTTContext (f a) (map f h) d

-- ============================================================================
-- RTT ADJUNCTION: Primitive ↔ Composed
-- ============================================================================

-- | Free RTT construction (Left adjoint)
data FreeRTT a = FreeRTT { unFree :: RTTTile a }

-- | Forgetful RTT construction (Right adjoint)  
data ForgetRTT a = ForgetRTT { unForget :: RTTTile a }

-- | Adjunction instance for RTT
instance Functor FreeRTT where
  fmap f (FreeRTT t) = FreeRTT (fmap f t)

instance Functor ForgetRTT where
  fmap f (ForgetRTT t) = ForgetRTT (fmap f t)

-- ============================================================================
-- TILE EXTRACTION SUMMARY
-- ============================================================================

-- | Tile registry with all extracted tiles
data TileRegistry = TileRegistry {
  -- HIGH PRIORITY TILES
  tile_ret  :: forall m a. Monad m => a -> m a,           -- return/unit
  tile_bind :: forall m a b. Monad m => m a -> (a -> m b) -> m b,  -- bind
  tile_ext  :: forall w a. Comonad w => w a -> a,         -- extract
  tile_dup  :: forall w a. Comonad w => w a -> w (w a),   -- duplicate
  
  -- MED PRIORITY TILES
  tile_laj  :: forall f g a b. Adjunction f g => (a -> g b) -> f a -> b,  -- left adjoint
  tile_raj  :: forall f g a b. Adjunction f g => (f a -> b) -> a -> g b,  -- right adjoint
  tile_lim  :: forall k a b c. HasProduct k => k a b -> k a c -> k a (b, c),  -- limit (product)
  tile_colim :: forall k a b c. HasCoproduct k => k a c -> k b c -> k (Either a b) c,  -- colimit (coproduct)
  tile_exp  :: forall k a b c. HasExponential k => k (a, b) c -> k a (k b c)  -- exponential
}

-- ============================================================================
-- RTT ARCHITECTURE MAPPING
-- ============================================================================

-- | Mapping from category theory tiles to RTT operations
--
-- Category Theory     →  RTT Architecture
-- ─────────────────────────────────────────
-- ret (return)        →  Lift primitive observation to context
-- bind (bind)         →  Chain observations (Kleisli composition)
-- ext (extract)       →  Get current observation from context
-- dup (duplicate)     →  Create nested observation structure
-- laj (left adjoint)  →  Construct free RTT structure
-- raj (right adjoint) →  Forget RTT structure to primitive
-- lim (limit)         →  Aggregate observations (product)
-- colim (colimit)     →  Partition observations (coproduct)
-- exp (exponential)   →  Observation transformers (higher-order)
--
-- ============================================================================
-- MATHEMATICAL RIGOR NOTES
-- ============================================================================
--
-- All structures satisfy their respective laws:
--
-- MONAD LAWS:
--   1. Left Identity:   ret a >>= f  ≡ f a
--   2. Right Identity:  m >>= ret    ≡ m
--   3. Associativity:   (m >>= f) >>= g ≡ m >>= (\x -> f x >>= g)
--
-- COMONAD LAWS:
--   1. Left Identity:   ext (extend f) ≡ f
--   2. Right Identity:  extend ext ≡ id
--   3. Associativity:   extend f . extend g ≡ extend (f . extend g)
--
-- ADJUNCTION LAWS:
--   1. Unit-Counit:     G ε . η G = id
--   2. Unit-Counit:     ε F . F η = id
--   3. Hom-set iso:     Hom(F a, b) ≅ Hom(a, G b)
--
-- LIMIT LAWS (Universal Property):
--   For any cone (C, p_j), there exists unique h : C → L
--   such that π_j . h = p_j for all j
--
-- COLIMIT LAWS (Universal Property):
--   For any cocone (C, i_j), there exists unique h : C → C
--   such that h . ι_j = i_j for all j
--
-- EXPONENTIAL LAWS:
--   1. curry . uncurry ≡ id
--   2. uncurry . curry ≡ id
--   3. eval . (curry f × id) ≡ f
--
-- ============================================================================

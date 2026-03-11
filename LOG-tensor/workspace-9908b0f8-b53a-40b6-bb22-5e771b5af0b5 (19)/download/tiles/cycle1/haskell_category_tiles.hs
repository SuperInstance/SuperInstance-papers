{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE GADTs #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE KindSignatures #-}
{-# LANGUAGE TypeFamilies #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE ConstraintKinds #-}
{-# LANGUAGE PolyKinds #-}

{-|
Category Theory Tiles for Permutations and Equivariance
=======================================================

This module extracts foundational category-theoretic constructs as reusable
tiles (code patterns) for working with permutations, equivariance, and
compositional structures.

Each tile follows the format:
  TILE: [short_name]
  TYPE: [Haskell type signature]
  MATH: [Category theory definition]
  HASKELL: [Implementation]
  USES: [HIGH/MED/LOW]
-}

module HaskellCategoryTiles where

import Data.Kind (Type, Constraint)
import GHC.TypeLits (Nat, Symbol)

--------------------------------------------------------------------------------
-- TILE 1: Natural Transformation
--------------------------------------------------------------------------------
{-|
TILE: nat
TYPE: forall a. f a -> g a
MATH: η : F ⇒ G where for all f: A → B, η_B ∘ F(f) = G(f) ∘ η_A (naturality square)
HASKELL: type Nat f g = forall a. f a -> g a
USES: HIGH

A natural transformation is a family of morphisms indexed by objects of the
category, satisfying the naturality condition. In Haskell, this is represented
as a polymorphic function between type constructors.
-}

type Nat f g = forall a. f a -> g a

-- | Witness that a transformation is natural (can't be directly encoded,
-- but we can provide laws as comments)
-- Naturality: nat . fmap f = fmap f . nat

-- | Example: The head function is a natural transformation from NonEmpty to Maybe
-- headNat :: Nat NonEmpty Maybe
-- headNat (x :| _) = Just x

-- | Compose natural transformations vertically
natCompose :: (Functor f, Functor g) => Nat f g -> Nat g h -> Nat f h
natCompose nt1 nt2 = nt2 . nt1

--------------------------------------------------------------------------------
-- TILE 2: Functor Composition
--------------------------------------------------------------------------------
{-|
TILE: fcomp
TYPE: (Functor f, Functor g) => f (g a) -> h a (conceptually)
MATH: (F ∘ G)(X) = F(G(X)), with action on morphisms: (F ∘ G)(f) = F(G(f))
HASKELL: newtype (f :.: g) a = Comp { unComp :: f (g a) }
USES: HIGH

Functor composition is fundamental for building complex structures from simpler
ones. In category theory, it forms the basis of the functor category.
-}

-- | Functor composition type operator
newtype (f :.: g) a = Comp { unComp :: f (g a) }
  deriving (Show, Eq)

infixr 9 :.:

-- | Composition of functors is a functor
instance (Functor f, Functor g) => Functor (f :.: g) where
  fmap h (Comp x) = Comp (fmap (fmap h) x)

-- | Compose functors at the type level
type family FComp (f :: Type -> Type) (g :: Type -> Type) :: Type -> Type where
  FComp f g = f :.: g

-- | Lift a value through functor composition
compPure :: (Applicative f, Applicative g) => a -> (f :.: g) a
compPure = Comp . pure . pure

--------------------------------------------------------------------------------
-- TILE 3: Yoneda Embedding
--------------------------------------------------------------------------------
{-|
TILE: yoneda
TYPE: (a -> b) -> f a -> f b (Coyoneda) or ((a -> b) -> b) -> f b (Yoneda)
MATH: y : C → Set^{C^op}, defined by y(X) = Hom_C(-, X)
      Yoneda Lemma: Hom(y(X), F) ≅ F(X) naturally in X and F
HASKELL: newtype Yoneda f a = Yoneda (forall b. (a -> b) -> f b)
USES: HIGH

The Yoneda embedding is a fully faithful functor into the presheaf category.
The Yoneda lemma states that natural transformations from a representable
functor to F are in bijection with elements of F(X).
-}

-- | Yoneda lemma as a type: covariant version
newtype Yoneda f a = Yoneda (forall b. (a -> b) -> f b)

-- | Coyoneda: the dual construction, useful for fusion
data Coyoneda f a where
  Coyoneda :: (b -> a) -> f b -> Coyoneda f a

-- | Yoneda is a functor
instance Functor (Yoneda f) where
  fmap f (Yoneda g) = Yoneda (\h -> g (h . f))

-- | Coyoneda is a functor
instance Functor (Coyoneda f) where
  fmap f (Coyoneda k m) = Coyoneda (f . k) m

-- | Yoneda reduction (the isomorphism F(X) ≅ Hom(y(X), F))
liftYoneda :: Functor f => f a -> Yoneda f a
liftYoneda x = Yoneda (\f -> fmap f x)

lowerYoneda :: Yoneda f a -> f a
lowerYoneda (Yoneda f) = f id

-- | Coyoneda is the left Kan extension along the identity
liftCoyoneda :: f a -> Coyoneda f a
liftCoyoneda = Coyoneda id

lowerCoyoneda :: Functor f => Coyoneda f a -> f a
lowerCoyoneda (Coyoneda k m) = fmap k m

--------------------------------------------------------------------------------
-- TILE 4: Adjunction
--------------------------------------------------------------------------------
{-|
TILE: adjunction
TYPE: (Functor f, Functor g) => (f a -> b) -> (a -> g b)
MATH: F ⊣ G means Hom(F(A), B) ≅ Hom(A, G(B)) naturally in A and B
      Unit: η : Id → G ∘ F
      Counit: ε : F ∘ G → Id
HASKELL: class (Functor f, Functor g) => Adjunction f g where
           leftAdjunct  :: (f a -> b) -> a -> g b
           rightAdjunct :: (a -> g b) -> f a -> b
USES: HIGH

Adjunctions capture the relationship between two functors going in opposite
directions, fundamental in universal algebra and categorical constructions.
-}

class (Functor f, Functor g) => Adjunction f g where
  -- | Left adjunct of the adjunction
  leftAdjunct  :: (f a -> b) -> a -> g b
  -- | Right adjunct of the adjunction
  rightAdjunct :: (a -> g b) -> f a -> b
  
  -- | Unit: η : Id → G ∘ F
  unit   :: a -> g (f a)
  unit = leftAdjunct id
  
  -- | Counit: ε : F ∘ G → Id
  counit :: f (g a) -> a
  counit = rightAdjunct id

-- | Example: Product-Exponential Adjunction (Curry-Uncurry)
-- Adjunction ((,) a) ((->) a) means: (a, b) -> c ≅ b -> (a -> c)

instance Adjunction ((,) a) ((->) a) where
  leftAdjunct f x = \a -> f (a, x)
  rightAdjunct f (a, x) = f x a
  unit x = \a -> (a, x)
  counit (a, f) = f a

--------------------------------------------------------------------------------
-- TILE 5: Monoidal Category
--------------------------------------------------------------------------------
{-|
TILE: monoidal
TYPE: class Monoidal f where unit :: f (); tensor :: f a -> f b -> f (a, b)
MATH: (C, ⊗, I) where ⊗ : C × C → C is a bifunctor, I is the unit object
      Associator: α_{A,B,C} : (A ⊗ B) ⊗ C → A ⊗ (B ⊗ C)
      Left unitor: λ_A : I ⊗ A → A
      Right unitor: ρ_A : A ⊗ I → A
      Coherence: Mac Lane's pentagon and triangle identities
HASKELL: class (Applicative f) => Monoidal f where unit :: f ()
USES: HIGH

A monoidal category has a tensor product and unit object satisfying coherence
conditions. Applicative functors are precisely monoidal functors.
-}

class Functor f => Monoidal f where
  -- | Unit object (terminal object in Set)
  munit :: f ()
  
  -- | Tensor product (parallel composition)
  mtensor :: f a -> f b -> f (a, b)

-- | Applicative functors are monoidal
instance Monoidal Maybe where
  munit = Just ()
  mtensor Nothing _ = Nothing
  mtensor _ Nothing = Nothing
  mtensor (Just a) (Just b) = Just (a, b)

instance Monoidal [] where
  munit = [()]
  mtensor xs ys = [(x, y) | x <- xs, y <- ys]

-- | Convert Monoidal to Applicative
monoidalPure :: Monoidal f => a -> f a
monoidalPure a = fmap (const a) munit

monoidalAp :: Monoidal f => f (a -> b) -> f a -> f b
monoidalAp ff fa = fmap (\(f, a) -> f a) (mtensor ff fa)

--------------------------------------------------------------------------------
-- TILE 6: Symmetric Monoidal (Braiding)
--------------------------------------------------------------------------------
{-|
TILE: braid
TYPE: f a -> f b -> f (b, a) (swap type)
MATH: Braiding σ_{A,B} : A ⊗ B → B ⊗ A satisfying:
      - Natural in A and B
      - σ_{B,A} ∘ σ_{A,B} = id (symmetry)
      - Hexagon coherence conditions
HASKELL: class Monoidal f => SymmetricMonoidal f where mswap :: f (a, b) -> f (b, a)
USES: HIGH

Symmetric monoidal categories have a braiding that swaps tensor factors.
This is essential for permutation-equivariant structures.
-}

class Monoidal f => SymmetricMonoidal f where
  -- | Braiding: swap the order of factors
  mswap :: f (a, b) -> f (b, a)

instance SymmetricMonoidal Maybe where
  mswap Nothing = Nothing
  mswap (Just (a, b)) = Just (b, a)

instance SymmetricMonoidal [] where
  mswap = map swap
    where swap (a, b) = (b, a)

-- | The braiding as a natural transformation
braidNat :: SymmetricMonoidal f => Nat ((,) a) ((,) b) 
-- This requires type-level manipulation; shown as concept:
-- braidNat = ...

--------------------------------------------------------------------------------
-- TILE 7: Permutation Action (Group Action)
--------------------------------------------------------------------------------
{-|
TILE: perm_action
TYPE: Permutation -> a -> a
MATH: A G-set is a set X with an action · : G × X → X satisfying:
      - e · x = x (identity)
      - (g₁ · g₂) · x = g₁ · (g₂ · x) (compatibility)
      where G = S_n (symmetric group)
HASKELL: class Group g => GAction g a where act :: g -> a -> a
USES: HIGH

Permutation actions formalize how symmetric groups act on structures,
fundamental for equivariant programming.
-}

-- | A permutation represented as a list of indices
type Permutation = [Int]

-- | Apply a permutation to indices
applyPerm :: Permutation -> [a] -> [a]
applyPerm perm xs = map (xs !!) perm

-- | Class for types with permutation actions
class GAction a where
  -- | Act by a permutation (represented as a list)
  act :: Permutation -> a -> a
  
  -- | The stabilizer subgroup (elements that don't change a)
  stabilizer :: a -> [Permutation]
  stabilizer _ = []

-- | Permutations act on lists by permuting positions
instance GAction [a] where
  act = applyPerm

-- | Permutations act on tuples by permuting components
instance GAction (a, a) where
  act [0,1] (x, y) = (x, y)
  act [1,0] (x, y) = (y, x)
  act _ t = t

--------------------------------------------------------------------------------
-- TILE 8: Equivariant Map
--------------------------------------------------------------------------------
{-|
TILE: equivariant
TYPE: (a -> b) -> Bool (checking equivariance property)
MATH: f : X → Y is G-equivariant if f(g · x) = g · f(x) for all g ∈ G, x ∈ X
HASKELL: isEquivariant :: (GAction a, GAction b, Eq b) => [Permutation] -> (a -> b) -> a -> Bool
USES: HIGH

Equivariant maps preserve group actions. In the context of permutations,
they represent "name-independent" functions.
-}

-- | Check if a function is equivariant under given permutations
isEquivariant :: (GAction a, GAction b, Eq b) => 
                 [Permutation] -> (a -> b) -> a -> Bool
isEquivariant perms f x = all check perms
  where
    check perm = act perm (f x) == f (act perm x)

-- | Type of equivariant functions
newtype Equivariant a b = Equivariant { runEquivariant :: a -> b }

-- | Identity is always equivariant
equivId :: Equivariant a a
equivId = Equivariant id

-- | Composition of equivariant functions is equivariant
equivCompose :: Equivariant a b -> Equivariant b c -> Equivariant a c
equivCompose (Equivariant f) (Equivariant g) = Equivariant (g . f)

--------------------------------------------------------------------------------
-- TILE 9: Tensor Product (Bifunctor)
--------------------------------------------------------------------------------
{-|
TILE: tensor
TYPE: class Bifunctor p where bimap :: (a -> c) -> (b -> d) -> p a b -> p c d
MATH: ⊗ : C × C → C is a bifunctor, meaning:
      - On objects: A ⊗ B
      - On morphisms: f ⊗ g : A ⊗ B → C ⊗ D (for f: A → C, g: B → D)
      - Preserves identities and composition
HASKELL: class Bifunctor p where bimap :: (a -> c) -> (b -> d) -> p a b -> p c d
USES: HIGH

The tensor product is the fundamental binary operation in monoidal categories.
-}

class Bifunctor p where
  bimap :: (a -> c) -> (b -> d) -> p a b -> p c d
  first :: (a -> c) -> p a b -> p c b
  first f = bimap f id
  second :: (b -> d) -> p a b -> p a d
  second g = bimap id g

-- | Product (,) is a bifunctor
instance Bifunctor (,) where
  bimap f g (a, b) = (f a, g b)

-- | Either is a bifunctor
instance Bifunctor Either where
  bimap f _ (Left a) = Left (f a)
  bimap _ g (Right b) = Right (g b)

-- | Tensor product of functors
data Tensor f g a = Tensor (f a) (g a)

instance (Functor f, Functor g) => Functor (Tensor f g) where
  fmap h (Tensor fa ga) = Tensor (fmap h fa) (fmap h ga)

--------------------------------------------------------------------------------
-- TILE 10: Coherence Conditions (Naturality)
--------------------------------------------------------------------------------
{-|
TILE: coherence
TYPE: (f a -> f b) -> (g a -> g b) -> (a -> b) -> f a -> Bool
MATH: A naturality square commutes when:
      For η : F ⇒ G and morphism f: A → B
      η_B ∘ F(f) = G(f) ∘ η_A
HASKELL: checkNaturality :: (Functor f, Functor g, Eq (g b)) => 
                             Nat f g -> (a -> b) -> f a -> Bool
USES: MED

Coherence conditions ensure that categorical structures are well-defined.
Naturality is the fundamental coherence condition for natural transformations.
-}

-- | Check naturality of a transformation
checkNaturality :: (Functor f, Functor g, Eq (g b)) => 
                   Nat f g -> (a -> b) -> f a -> Bool
checkNaturality eta f x = eta (fmap f x) == fmap f (eta x)

-- | Check functor laws
checkFunctorIdentity :: (Functor f, Eq (f a)) => f a -> Bool
checkFunctorIdentity x = fmap id x == x

checkFunctorComposition :: (Functor f, Eq (f c)) => 
                           f a -> (a -> b) -> (b -> c) -> Bool
checkFunctorComposition x f g = fmap (g . f) x == fmap g (fmap f x)

--------------------------------------------------------------------------------
-- TILE 11: Kan Extensions
--------------------------------------------------------------------------------
{-|
TILE: kan
TYPE: (d -> c) -> (d -> Type) -> Type (Left Kan Extension)
MATH: Left Kan extension Lan_F(G) is the left adjoint to restriction:
      Hom(Lan_F(G), H) ≅ Hom(G, H ∘ F)
      Formula: (Lan_F G)(c) = colim_{(d, f: F(d) → c)} G(d)
HASKELL: data Lan f g a where Lan :: (b -> a) -> g b -> Lan f g a
USES: MED

Kan extensions are universal constructions that subsume many categorical
concepts including limits, colimits, and adjunctions.
-}

-- | Left Kan extension
data Lan f g a where
  Lan :: (b -> a) -> g b -> Lan f g a

instance Functor (Lan f g) where
  fmap h (Lan k m) = Lan (h . k) m

-- | Right Kan extension
newtype Ran f g a = Ran { runRan :: forall b. (a -> f b) -> g b }

instance Functor (Ran f g) where
  fmap h (Ran f) = Ran (\k -> f (k . h))

-- | Yoneda as a Kan extension: Yoneda f = Lan Identity f
-- | Coyoneda as a Kan extension: Coyoneda f = Lan Identity f (different form)

--------------------------------------------------------------------------------
-- TILE 12: Representable Functors
--------------------------------------------------------------------------------
{-|
TILE: representable
TYPE: class Representable f where type Rep f; index :: f a -> Rep f -> a; tabulate :: (Rep f -> a) -> f a
MATH: F is representable if F ≅ Hom(A, -) for some object A
      i.e., F(X) ≅ Hom(Rep F, X) naturally in X
HASKELL: class (Functor f) => Representable f where 
           type Rep f :: *; index :: f a -> Rep f -> a; tabulate :: (Rep f -> a) -> f a
USES: HIGH

Representable functors are those isomorphic to a hom-functor. They capture
the notion of "container indexed by a fixed type."
-}

class Functor f => Representable f where
  -- | The representing object
  type Rep f
  
  -- | Project out an element at an index
  index :: f a -> Rep f -> a
  
  -- | Build a structure from an indexing function
  tabulate :: (Rep f -> a) -> f a

-- | Streams are representable by natural numbers (infinite)
-- Would need Nat type; simplified version:

-- | Pairs are representable by Bool
instance Representable ((,) a) where
  type Rep ((,) a) = Bool
  index (x, _) False = x
  index (_, y) True = y
  tabulate f = (f False, f True)

-- | The Yoneda lemma for representable functors:
-- Hom(Rep f, X) ≅ f X

--------------------------------------------------------------------------------
-- TILE 13: End and Coend
--------------------------------------------------------------------------------
{-|
TILE: end
TYPE: (forall a. f a a) -> b (conceptual)
MATH: End: ∫_a F(a, a) is the universal wedge
      Coend: ∫^a F(a, a) is the universal cowedge
      In Haskell: ends correspond to universal quantification, 
      coends to existential quantification
HASKELL: type End f = forall a. f a a; data Coend f where Coend :: f a a -> Coend f
USES: MED

Ends and coends are categorical generalizations of (co)limits, crucial for
weighted (co)limits and enriched category theory.
-}

-- | End as universal quantification
type End (f :: Type -> Type -> Type) = forall a. f a a

-- | Coend as existential quantification
data Coend f where
  Coend :: f a a -> Coend f

-- | Example: The co-Yoneda lemma states:
-- ∫^a Hom(a, x) × f a ≅ f x
-- This is the Coyoneda construction!

--------------------------------------------------------------------------------
-- TILE 14: Indexed Functor (Families)
--------------------------------------------------------------------------------
{-|
TILE: indexed
TYPE: (i -> Type) -> (i -> Type)
MATH: An indexed functor F : (I → Set) → (I → Set) has components
      F_i : (I → Set) → Set for each index i
HASKELL: type IxFunctor f i a = f i a; class IxFunctor f where imap :: (a -> b) -> f i a -> f i b
USES: MED

Indexed functors model type-indexed families, essential for dependently-typed
structures and permutation-aware types.
-}

-- | Indexed container
type family Ix (i :: k) (f :: k -> Type -> Type) :: Type -> Type

-- | Indexed functor
class IxFunctor (f :: i -> Type -> Type) where
  imap :: (a -> b) -> f i a -> f i b

-- | Example: Vector indexed by length
data Vec :: Nat -> Type -> Type where
  VNil  :: Vec 0 a
  VCons :: a -> Vec n a -> Vec (n + 1) a

instance IxFunctor (Vec :: Nat -> Type -> Type) where
  imap _ VNil = VNil
  imap f (VCons x xs) = VCons (f x) (imap f xs)

--------------------------------------------------------------------------------
-- TILE 15: Day Convolution
--------------------------------------------------------------------------------
{-|
TILE: day
TYPE: f a -> g b -> (a -> b -> c) -> Day f g c
MATH: Day convolution: (F ⊗_Day G)(X) = ∫^{A,B} F(A) × G(B) × Hom(A × B, X)
      This makes the functor category monoidal.
HASKELL: data Day f g a = forall b c. Day (f b) (g c) (b -> c -> a)
USES: MED

Day convolution provides a monoidal structure on the functor category,
making Applicative functors monoid objects.
-}

data Day f g a where
  Day :: f b -> g c -> (b -> c -> a) -> Day f g a

instance Functor (Day f g) where
  fmap h (Day fb gc k) = Day fb gc (\b c -> h (k b c))

-- | Associativity of Day convolution
dayAssoc :: Day f (Day g h) a -> Day (Day f g) h a
dayAssoc (Day fb (Day gc hd k2) k1) = 
  Day (Day fb gc (,)) hd (\(b, c) d -> k1 b (k2 c d))

-- | Unit for Day convolution
newtype Identity a = Identity a

instance Functor Identity where
  fmap f (Identity a) = Identity (f a)

dayUnitL :: Day Identity f a -> f a
dayUnitL (Day (Identity b) fa k) = fmap (k b) fa

dayUnitR :: Day f Identity a -> f a
dayUnitR (Day fa (Identity c) k) = fmap (`k` c) fa

--------------------------------------------------------------------------------
-- Summary of Tiles
--------------------------------------------------------------------------------
{-
Tile Summary for Permutations and Equivariance:

| # | Tile Name           | Type Signature                      | Category Theory Concept        |
|---|---------------------|-------------------------------------|--------------------------------|
| 1 | nat                 | forall a. f a -> g a                | Natural Transformation         |
| 2 | fcomp               | f (g a) -> (f :.: g) a              | Functor Composition            |
| 3 | yoneda              | f a -> Yoneda f a                   | Yoneda Embedding/Lemma         |
| 4 | adjunction          | (f a -> b) -> (a -> g b)            | Adjunction F ⊣ G               |
| 5 | monoidal            | f a -> f b -> f (a, b)              | Monoidal Category (⊗, I)       |
| 6 | braid               | f (a, b) -> f (b, a)                | Braiding (Symmetric Monoidal)  |
| 7 | perm_action         | Permutation -> a -> a               | Group Action (G-set)           |
| 8 | equivariant         | (a -> b) -> Bool                    | Equivariant Map                |
| 9 | tensor              | (a -> c) -> (b -> d) -> p a b -> p c d | Tensor Product (Bifunctor)  |
|10 | coherence           | Nat f g -> (a -> b) -> f a -> Bool  | Naturality (Coherence)         |
|11 | kan                 | (b -> a) -> g b -> Lan f g a        | Kan Extensions                 |
|12 | representable       | (Rep f -> a) -> f a                 | Representable Functor          |
|13 | end                 | forall a. f a a                     | End / Coend                    |
|14 | indexed             | (a -> b) -> f i a -> f i b          | Indexed Functor                |
|15 | day                 | f b -> g c -> Day f g a             | Day Convolution                |

Key Relationships:
- Permutations arise from the symmetric structure (braid)
- Equivariant maps are natural transformations in G-Set
- Yoneda lemma connects representable functors to permutation-equivariance
- Day convolution provides the monoidal structure for Applicative
-}

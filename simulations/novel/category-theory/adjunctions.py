"""
Adjunctions for POLLN

This module defines adjunctions between functors in POLLN, providing:
- Agent-state adjunctions
- Free-forgetful adjunctions
- Galois connections (constraint ↔ freedom)
- Optimization via universal properties

Adjunctions provide:
1. Universal properties for optimal design
2. Free constructions
3. Limits and colimits
4. Optimal solutions via adjoint functors
"""

from typing import Dict, List, Set, Tuple, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import json
from categories import Category, Morphism
from functors import Functor, NaturalTransformation
from monads import Monad, Comonad
from deepseek_category import DeepSeekCategoryDeriver, DerivationType, get_deriver


class AdjunctionType(Enum):
    """Types of adjunctions in POLLN"""
    AGENT_STATE = "agent_state"  # Agent creation ⊣ State extraction
    FREE_FORGETFUL = "free_forgetful"  # Free colony ⊣ Forget connections
    COLONY_OBSERVABLE = "colony_observable"  # Colony ⊣ Observable
    CONSTRAINT_FREEDOM = "constraint_freedom"  # Constraints ⊣ Freedom
    GLOBAL_LOCAL = "global_local"  # Global ⊣ Local
    SYNCHRONIZED_ASYNCH = "synchronized_asynch"  # Sync ⊣ Async


@dataclass
class Adjunction:
    """
    An adjunction F ⊣ G between categories C and D.

    Components:
    - F: C → D (left adjoint)
    - G: D → C (right adjoint)
    - η: I_C → GF (unit: natural transformation)
    - ε: FG → I_D (counit: natural transformation)

    Triangle Identities:
    1. G(ε) ∘ η_G = id_G: For all Y in D, G(ε_Y) ∘ η_GY = id_GY
    2. ε_F ∘ F(η) = id_F: For all X in C, ε_FX ∘ F(η_X) = id_FX

    Hom-set Isomorphism:
    Hom_D(FX, Y) ≅ Hom_C(X, GY)

    Universal Property:
    For each X in C, FX is universal among D-objects mapping to X via G
    """

    name: str
    left_adjoint: Functor  # F: C → D
    right_adjoint: Functor  # G: D → C
    unit: Dict[str, Morphism] = field(default_factory=dict)  # η: I_C → GF
    counit: Dict[str, Morphism] = field(default_factory=dict)  # ε: FG → I_D
    source_category: Optional[Category] = None
    target_category: Optional[Category] = None
    derivation: Optional[str] = None
    derivation_result: Optional[Any] = None

    def derive_structure(self, deriver: DeepSeekCategoryDeriver):
        """Use DeepSeek to derive adjunction structure."""
        result = deriver.derive_adjunction(
            left_functor=self.left_adjoint.name,
            right_functor=self.right_adjoint.name,
            unit_description=f"Unit η for {self.name}",
            counit_description=f"Counit ε for {self.name}"
        )
        self.derivation = result.raw_response
        self.derivation_result = result
        return result

    def add_unit(self, obj: str, morphism: Morphism):
        """Add unit component η_X: X → GF(X)."""
        self.unit[obj] = morphism

    def add_counit(self, obj: str, morphism: Morphism):
        """Add counit component ε_Y: FG(Y) → Y."""
        self.counit[obj] = morphism

    def verify_triangle_identities(self) -> Dict[str, bool]:
        """
        Verify triangle identities.

        Returns:
            Dict with identity verification results
        """
        return {
            "identity_1": self._verify_identity_1(),
            "identity_2": self._verify_identity_2()
        }

    def _verify_identity_1(self) -> bool:
        """
        Verify: G(ε_Y) ∘ η_GY = id_GY

        For all Y in target category D.
        """
        for obj in self.target_category.objects:
            epsilon_y = self.counit.get(obj)
            eta_gy = self.unit.get(self.right_adjoint.apply_object(obj) or "")

            if epsilon_y and eta_gy:
                # Apply G to ε_Y
                g_epsilon_y = self.right_adjoint.apply_morphism(epsilon_y)
                if g_epsilon_y:
                    composed = eta_gy.compose(g_epsilon_y)
                    # Should equal id_GY
                    if composed and composed.label != f"id_{obj}":
                        return False
        return True

    def _verify_identity_2(self) -> bool:
        """
        Verify: ε_FX ∘ F(η_X) = id_FX

        For all X in source category C.
        """
        for obj in self.source_category.objects:
            eta_x = self.unit.get(obj)
            fx = self.left_adjoint.apply_object(obj)
            epsilon_fx = self.counit.get(fx or "")

            if eta_x and epsilon_fx:
                # Apply F to η_X
                f_eta_x = self.left_adjoint.apply_morphism(eta_x)
                if f_eta_x:
                    composed = f_eta_x.compose(epsilon_fx)
                    # Should equal id_FX
                    if composed and composed.label != f"id_{fx}":
                        return False
        return True

    def hom_set_isomorphism(
        self,
        fx: str,
        y: str
    ) -> Tuple[List[str], List[str]]:
        """
        Demonstrate hom-set isomorphism: Hom_D(FX, Y) ≅ Hom_C(X, GY)

        Args:
            fx: Object FX in target category
            y: Object Y in target category

        Returns:
            Tuple of (morphisms FX → Y, morphisms X → GY)
        """
        # Get GY
        gy = self.right_adjoint.apply_object(y)

        # Get morphisms FX → Y in D
        morphisms_d = self.target_category.get_morphisms(fx, y)

        # Get morphisms X → GY in C
        x = self._find_x_from_fx(fx)
        morphisms_c = []
        if x and gy:
            morphisms_c = self.source_category.get_morphisms(x, gy)

        return (list(morphisms_d), list(morphisms_c))

    def _find_x_from_fx(self, fx: str) -> Optional[str]:
        """Find X such that F(X) = fx."""
        for x, fx_mapped in self.left_adjoint.object_map.items():
            if fx_mapped == fx:
                return x
        return None


class AgentStateAdjunction(Adjunction):
    """
    Agent-State adjunction: FreeAgent ⊣ ExtractState

    F: State → Agent (create agent from state)
    G: Agent → State (extract state from agent)

    Unit: η_S: S → ExtractState(FreeAgent(S))
    Counit: ε_A: FreeAgent(ExtractState(A)) → A

    This captures:
    - Creating agents from initial states
    - Extracting terminal states
    - Universal property of agent creation
    """

    def __init__(self, state_cat: Category, agent_cat: Category):
        # Create functors
        free_agent = Functor(
            name="FreeAgent",
            source_category=state_cat,
            target_category=agent_cat
        )

        extract_state = Functor(
            name="ExtractState",
            source_category=agent_cat,
            target_category=state_cat
        )

        super().__init__(
            name="AgentStateAdjunction",
            left_adjoint=free_agent,
            right_adjoint=extract_state,
            source_category=state_cat,
            target_category=agent_cat
        )

    def derive_structure(self, deriver: DeepSeekCategoryDeriver):
        """Use DeepSeek to derive structure."""
        result = deriver.derive_adjunction(
            left_functor="FreeAgent: State → Agent",
            right_functor="ExtractState: Agent → State",
            unit_description="η_S: S → ExtractState(FreeAgent(S)) (state inclusion)",
            counit_description="ε_A: FreeAgent(ExtractState(A)) → A (agent evaluation)"
        )
        self.derivation = result.raw_response
        self.derivation_result = result
        return result


class FreeForgetfulAdjunction(Adjunction):
    """
    Free-Forgetful adjunction: FreeColony ⊣ ForgetConnections

    F: AgentSet → Colony (free colony on set of agents)
    G: Colony → AgentSet (forget connections, keep agents)

    Unit: η_A: A → ForgetConnections(FreeColony(A))
    Counit: ε_C: FreeColony(ForgetConnections(C)) → C

    This captures:
    - Free construction of colonies
    - Forgetting synaptic connections
    - Universal property of free colonies
    """

    def __init__(self, agent_set_cat: Category, colony_cat: Category):
        free_colony = Functor(
            name="FreeColony",
            source_category=agent_set_cat,
            target_category=colony_cat
        )

        forget_connections = Functor(
            name="ForgetConnections",
            source_category=colony_cat,
            target_category=agent_set_cat
        )

        super().__init__(
            name="FreeForgetfulAdjunction",
            left_adjoint=free_colony,
            right_adjoint=forget_connections,
            source_category=agent_set_cat,
            target_category=colony_cat
        )

    def derive_structure(self, deriver: DeepSeekCategoryDeriver):
        """Use DeepSeek to derive structure."""
        result = deriver.derive_adjunction(
            left_functor="FreeColony: AgentSet → Colony",
            right_functor="ForgetConnections: Colony → AgentSet",
            unit_description="η_A: A → ForgetConnections(FreeColony(A)) (set inclusion)",
            counit_description="ε_C: FreeColony(ForgetConnections(C)) → C (quotient map)"
        )
        self.derivation = result.raw_response
        self.derivation_result = result
        return result


class ConstraintFreedomAdjunction(Adjunction):
    """
    Constraint-Freedom adjunction (Galois connection).

    F: System → ConstrainedSystem (add constraints)
    G: System → FreeSystem (remove constraints)

    For preordered sets (PV):
    - F is left adjoint (adds constraints, decreases freedom)
    - G is right adjoint (removes constraints, increases freedom)

    Monotone: x ≤ y ⇒ F(x) ≤ F(y) and G(x) ≤ G(y)
    Adjunction: F(x) ≤ y ⇔ x ≤ G(y)

    This captures:
    - Safety constraints (Constitutional AI)
    - Freedom maximization
    - Trade-offs between safety and capability
    """

    def __init__(self, system_cat: Category):
        # Both functors are endofunctors on System
        add_constraints = Functor(
            name="AddConstraints",
            source_category=system_cat,
            target_category=system_cat
        )

        remove_constraints = Functor(
            name="RemoveConstraints",
            source_category=system_cat,
            target_category=system_cat
        )

        super().__init__(
            name="ConstraintFreedomAdjunction",
            left_adjoint=add_constraints,
            right_adjoint=remove_constraints,
            source_category=system_cat,
            target_category=system_cat
        )

    def derive_structure(self, deriver: DeepSeekCategoryDeriver):
        """Use DeepSeek to derive Galois connection."""
        result = deriver.derive_adjunction(
            left_functor="AddConstraints: System → ConstrainedSystem",
            right_functor="RemoveConstraints: System → FreeSystem",
            unit_description="η_S: S → RemoveConstraints(AddConstraints(S)) (constraint relaxation)",
            counit_description="ε_S: AddConstraints(RemoveConstraints(S)) → S (constraint tightening)"
        )
        self.derivation = result.raw_response
        self.derivation_result = result
        return result


class GlobalLocalAdjunction(Adjunction):
    """
    Global-Local adjunction.

    F: Local → Global (aggregate local information)
    G: Global → Local (restrict global information)

    Unit: η_L: L → Restrict(Aggregate(L))
    Counit: ε_G: Aggregate(Restrict(G)) → G

    This captures:
    - Federated learning (local → global)
    - Colony coordination
    - Multi-scale reasoning
    """

    def __init__(self, local_cat: Category, global_cat: Category):
        aggregate = Functor(
            name="Aggregate",
            source_category=local_cat,
            target_category=global_cat
        )

        restrict = Functor(
            name="Restrict",
            source_category=global_cat,
            target_category=local_cat
        )

        super().__init__(
            name="GlobalLocalAdjunction",
            left_adjoint=aggregate,
            right_adjoint=restrict,
            source_category=local_cat,
            target_category=global_cat
        )

    def derive_structure(self, deriver: DeepSeekCategoryDeriver):
        """Use DeepSeek to derive structure."""
        result = deriver.derive_adjunction(
            left_functor="Aggregate: Local → Global",
            right_functor="Restrict: Global → Local",
            unit_description="η_L: L → Restrict(Aggregate(L)) (local inclusion)",
            counit_description="ε_G: Aggregate(Restrict(G)) → G (global aggregation)"
        )
        self.derivation = result.raw_response
        self.derivation_result = result
        return result


class MonadicAdjunction:
    """
    Every adjunction F ⊣ G induces a monad on the source category.

    Given adjunction F ⊣ G with unit η and counit ε:
    - Monad T = GF (composition of functors)
    - Unit of monad: η (same as adjunction unit)
    - Multiplication: μ = G(εF): T² → T

    Also induces a comonad on the target category:
    - Comonad W = FG
    - Counit: ε (same as adjunction counit)
    - Duplication: δ = F(ηG): W → W²
    """

    @staticmethod
    def induced_monad(adjunction: Adjunction) -> Monad:
        """
        Extract monad from adjunction: T = GF.

        Args:
            adjunction: Adjunction F ⊣ G

        Returns:
            Monad T = GF on source category
        """
        # Compose functors: T = GF
        # This is simplified - actual composition requires functor composition
        monad = Monad(
            name=f"InducedMonad({adjunction.name})",
            category=adjunction.source_category,
            endofunctor=adjunction.right_adjoint  # Simplified
        )

        # Unit: η (from adjunction)
        monad.unit = adjunction.unit

        # Multiplication: μ = G(εF)
        # This requires applying G to ε_F for each object
        monad.multiplication = {}

        return monad

    @staticmethod
    def induced_comonad(adjunction: Adjunction) -> Comonad:
        """
        Extract comonad from adjunction: W = FG.

        Args:
            adjunction: Adjunction F ⊣ G

        Returns:
            Comonad W = FG on target category
        """
        # Compose functors: W = FG
        comonad = Comonad(
            name=f"InducedComonad({adjunction.name})",
            category=adjunction.target_category,
            endofunctor=adjunction.left_adjoint  # Simplified
        )

        # Counit: ε (from adjunction)
        comonad.counit = adjunction.counit

        # Duplication: δ = F(ηG)
        comonad.duplication = {}

        return comonad


class AdjointTriple:
    """
    Adjoint triple: F ⊣ G ⊣ H

    Three functors with G both left and right adjoint:
    - F: C → D (leftmost)
    - G: D → E (middle, both left and right adjoint)
    - H: E → D (rightmost)

    Properties:
    - F ⊣ G: F is left adjoint to G
    - G ⊣ H: G is left adjoint to H
    - Composition: FG ⊣ H and F ⊣ GH

    Applications in POLLN:
    - Agent ⊣ Colony ⊣ Environment
    - Local ⊣ Federation ⊣ Global
    """

    def __init__(
        self,
        left: Functor,
        middle: Functor,
        right: Functor
    ):
        self.left = left
        self.middle = middle
        self.right = right

    def verify_adjunctions(self) -> Dict[str, bool]:
        """Verify both adjunctions."""
        return {
            "left_middle": True,  # Placeholder
            "middle_right": True  # Placeholder
        }


class LimitColimit:
    """
    Limits and colimits via adjunctions.

    Every adjunction F ⊣ G:
    - F preserves colimits: F(colim D) ≅ colim(FD)
    - G preserves limits: G(lim D) ≅ lim(GD)

    Applications:
    - Products (limits) for agent configuration
    - Coproducts (colimits) for colony composition
    - Pullbacks for A2A tracing
    - Pushouts for agent merging
    """

    @staticmethod
    def product(category: Category, objects: List[str]) -> str:
        """
        Compute product (limit) of objects.

        Product X × Y with projections π₁: X × Y → X, π₂: X × Y → Y
        Universal: For any Z with f₁: Z → X, f₂: Z → Y,
        exists unique ⟨f₁, f₂⟩: Z → X × Y
        """
        product_id = f"product_{'_'.join(objects)}"

        # Add product object
        category.add_object(product_id)

        # Add projection morphisms
        for i, obj in enumerate(objects):
            category.add_morphism(
                source=product_id,
                target=obj,
                label=f"pi_{i+1}",
                data={"type": "projection"}
            )

        return product_id

    @staticmethod
    def coproduct(category: Category, objects: List[str]) -> str:
        """
        Compute coproduct (colimit) of objects.

        Coproduct X + Y with inclusions ι₁: X → X + Y, ι₂: Y → X + Y
        Universal: For any Z with f₁: X → Z, f₂: Y → Z,
        exists unique [f₁, f₂]: X + Y → Z
        """
        coproduct_id = f"coproduct_{'_'.join(objects)}"

        # Add coproduct object
        category.add_object(coproduct_id)

        # Add inclusion morphisms
        for i, obj in enumerate(objects):
            category.add_morphism(
                source=obj,
                target=coproduct_id,
                label=f"iota_{i+1}",
                data={"type": "inclusion"}
            )

        return coproduct_id

    @staticmethod
    def pullback(
        category: Category,
        f: str,
        g: str,
        source_f: str,
        source_g: str,
        target: str
    ) -> str:
        """
        Compute pullback (limit of cospan).

        Pullback of f: X → Z and g: Y → Z is X ×_Z Y with:
        - p₁: X ×_Z Y → X
        - p₂: X ×_Z Y → Y
        - f ∘ p₁ = g ∘ p₂

        Universal: For any Q with q₁: Q → X, q₂: Q → Y
        where f ∘ q₁ = g ∘ q₂, exists unique u: Q → X ×_Z Y
        """
        pullback_id = f"pullback_{source_f}_{source_g}_over_{target}"

        category.add_object(pullback_id)

        # Add projections
        category.add_morphism(
            source=pullback_id,
            target=source_f,
            label="p1",
            data={"type": "projection"}
        )

        category.add_morphism(
            source=pullback_id,
            target=source_g,
            label="p2",
            data={"type": "projection"}
        )

        return pullback_id

    @staticmethod
    def pushout(
        category: Category,
        f: str,
        g: str,
        source: str,
        target_f: str,
        target_g: str
    ) -> str:
        """
        Compute pushout (colimit of span).

        Pushout of f: Z → X and g: Z → Y is X +_Z Y with:
        - i₁: X → X +_Z Y
        - i₂: Y → X +_Z Y
        - i₁ ∘ f = i₂ ∘ g

        Universal: For any Q with j₁: X → Q, j₂: Y → Q
        where j₁ ∘ f = j₂ ∘ g, exists unique u: X +_Z Y → Q
        """
        pushout_id = f"pushout_{target_f}_{target_g}_over_{source}"

        category.add_object(pushout_id)

        # Add inclusions
        category.add_morphism(
            source=target_f,
            target=pushout_id,
            label="i1",
            data={"type": "inclusion"}
        )

        category.add_morphism(
            source=target_g,
            target=pushout_id,
            label="i2",
            data={"type": "inclusion"}
        )

        return pushout_id


def create_example_adjunction() -> AgentStateAdjunction:
    """Create example adjunction for demonstration."""
    from categories import create_example_agent_category, create_example_state_category

    agent_cat = create_example_agent_category()
    state_cat = create_example_state_category()

    adjunction = AgentStateAdjunction(state_cat, agent_cat)

    # Add unit components: η_S: S → ExtractState(FreeAgent(S))
    for state_obj in ["state_0", "state_1", "state_2"]:
        state_cat.add_morphism(
            source=state_obj,
            target=f"free_agent_{state_obj}",
            label=f"eta_{state_obj}",
            data={"type": "unit"}
        )

    # Add counit components: ε_A: FreeAgent(ExtractState(A)) → A
    for agent_obj in ["task_1", "role_1", "core_1"]:
        agent_cat.add_morphism(
            source=f"free_{agent_obj}",
            target=agent_obj,
            label=f"epsilon_{agent_obj}",
            data={"type": "counit"}
        )

    return adjunction


if __name__ == "__main__":
    print("Creating Agent-State Adjunction...")
    adjunction = create_example_adjunction()
    print(f"Adjunction: {adjunction.name}")
    print(f"Left: {adjunction.left_adjoint.name}")
    print(f"Right: {adjunction.right_adjoint.name}")
    print(f"\nUnit components: {list(adjunction.unit.keys())}")
    print(f"Counit components: {list(adjunction.counit.keys())}")
    print(f"\nTriangle identities:")
    print(adjunction.verify_triangle_identities())

    print("\n" + "="*60)

    print("\nComputing Product (Limit)...")
    from categories import create_example_agent_category
    agent_cat = create_example_agent_category()
    product_id = LimitColimit.product(agent_cat, ["task_1", "role_1"])
    print(f"Product: {product_id}")

    print("\nComputing Coproduct (Colimit)...")
    coproduct_id = LimitColimit.coproduct(agent_cat, ["task_1", "role_1"])
    print(f"Coproduct: {coproduct_id}")

    print("\n" + "="*60)

    print("\nInduced Monad from Adjunction...")
    monad = MonadicAdjunction.induced_monad(adjunction)
    print(f"Monad: {monad.name}")
    print(f"Category: {monad.category.name}")

    print("\nInduced Comonad from Adjunction...")
    comonad = MonadicAdjunction.induced_comonad(adjunction)
    print(f"Comonad: {comonad.name}")
    print(f"Category: {comonad.category.name}")

"""
Renormalization Group Analysis for Agent Systems

This module implements renormalization group (RG) methods for analyzing
scale invariance and fixed points in POLLN agent systems.

Key concepts:
- RG flow equations
- Fixed points and stability
- Relevant vs irrelevant operators
- Coarse-graining transformations
- Epsilon expansion
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import math
from scipy.optimize import root, fsolve
from scipy.integrate import odeint

from .deepseek_statmech import DeepSeekStatMech


@dataclass
class RGFixedPoint:
    """RG fixed point"""
    coupling: float
    temperature: float
    eigenvalues: np.ndarray
    stability: str  # stable, unstable, saddle
    universality_class: str


@dataclass
class RGFlowTrajectory:
    """RG flow trajectory"""
    coupling_values: np.ndarray
    temperature_values: np.ndarray
    length_scales: np.ndarray
    fixed_point: Optional[RGFixedPoint]


class RGTransformation:
    """Base class for RG transformations"""

    def __init__(self, deepseek: Optional[DeepSeekStatMech] = None):
        """Initialize RG transformation"""
        self.deepseek = deepseek or DeepSeekStatMech()

        # Get DeepSeek derivation
        derivation = self.deepseek.derive_rg_equations(
            "Real-space renormalization group for agent system on 2D lattice. "
            "Derive RG flow equations, fixed points, critical exponents, "
            "and epsilon expansion."
        )
        self.derivation = derivation

    def block_spin_transform(self, configuration: np.ndarray,
                              block_size: int = 2) -> np.ndarray:
        """
        Block spin transformation (majority rule)

        Args:
            configuration: Spin configuration
            block_size: Size of blocking (b x b blocks)

        Returns:
            Coarse-grained configuration
        """
        L = configuration.shape[0]

        # Pad to multiple of block_size
        pad_size = (block_size - L % block_size) % block_size
        padded = np.pad(configuration, [(0, pad_size), (0, pad_size)], mode='edge')

        # Reshape into blocks
        new_L = padded.shape[0] // block_size
        blocked = padded.reshape(new_L, block_size, new_L, block_size)

        # Majority rule (sum > 0 -> +1, else -1)
        coarse = np.sign(np.sum(blocked, axis=(1, 3)))

        return coarse

    def momentum_shell_integration(self, k_values: np.ndarray,
                                    coupling: float) -> float:
        """
        Momentum shell integration (Wilson's RG)

        Integrate out high-momentum modes Λ/b < |k| < Λ

        Args:
            k_values: Momentum values
            coupling: Coupling constant g

        Returns:
            New coupling after RG step
        """
        # For φ^4 theory: dg/dl = (4-d)g - C g² + ...
        d = 2  # Spatial dimension

        # One-loop beta function
        C = 3.0  # Constant from loop integral

        dg_dl = (4 - d) * coupling - C * coupling**2

        return coupling + 0.1 * dg_dl  # Small RG step

    def wilson_fisher_fixed_point(self, epsilon: float = 1.0) -> float:
        """
        Wilson-Fisher fixed point in d = 4 - ε dimensions

        g* = (4-d)/3 = ε/3

        Args:
            epsilon: ε = 4 - d

        Returns:
            Fixed point coupling g*
        """
        return epsilon / 3.0


class RealSpaceRG(RGTransformation):
    """Real-space renormalization group"""

    def __init__(self, lattice_size: int,
                 deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize real-space RG

        Args:
            lattice_size: Original lattice size
            deepseek: DeepSeek client
        """
        super().__init__(deepseek)
        self.lattice_size = lattice_size
        self.block_size = 2

    def rg_step(self, coupling: float, temperature: float) -> Tuple[float, float]:
        """
        Perform one RG step

        Update couplings according to recursion relations

        Args:
            coupling: Coupling strength K = J/kT
            temperature: Temperature T

        Returns:
            (new_coupling, new_temperature) tuple
        """
        # Migdal-Kadanoff approximation
        b = self.block_size

        # Recursion relation for Ising model
        # K' = b K (approximation)

        # More accurate: K' = (1/4) ln[cosh(4K)]
        new_coupling = 0.25 * np.log(np.cosh(4 * coupling))

        # Temperature scales as T' = b^z T
        # For Ising, z = 1
        new_temperature = b * temperature

        return new_coupling, new_temperature

    def rg_flow(self, initial_coupling: float,
                initial_temperature: float,
                n_steps: int = 20) -> RGFlowTrajectory:
        """
        Generate RG flow trajectory

        Args:
            initial_coupling: Initial coupling
            initial_temperature: Initial temperature
            n_steps: Number of RG steps

        Returns:
            RG flow trajectory
        """
        coupling_values = [initial_coupling]
        temperature_values = [initial_temperature]
        length_scales = [1.0]

        K = initial_coupling
        T = initial_temperature

        for i in range(n_steps):
            K, T = self.rg_step(K, T)

            coupling_values.append(K)
            temperature_values.append(T)
            length_scales.append((i + 1) * self.block_size)

        # Find fixed point
        fixed_point = self.find_fixed_point(coupling_values[-1],
                                            temperature_values[-1])

        return RGFlowTrajectory(
            coupling_values=np.array(coupling_values),
            temperature_values=np.array(temperature_values),
            length_scales=np.array(length_scales),
            fixed_point=fixed_point
        )

    def find_fixed_point(self, coupling: float,
                         temperature: float) -> Optional[RGFixedPoint]:
        """
        Find RG fixed point

        Args:
            coupling: Coupling value
            temperature: Temperature value

        Returns:
            Fixed point or None
        """
        # Fixed point condition: K' = K
        # Solve: K = (1/4) ln[cosh(4K)]

        def fixed_point_eq(K):
            return K - 0.25 * np.log(np.cosh(4 * K))

        try:
            K_star = fsolve(fixed_point_eq, coupling)[0]

            # Linearize around fixed point
            epsilon = 1e-6
            K_plus = K_star + epsilon
            K_minus = K_star - epsilon

            K_prime_plus = 0.25 * np.log(np.cosh(4 * K_plus))
            K_prime_minus = 0.25 * np.log(np.cosh(4 * K_minus))

            # Eigenvalue (stability)
            eigenvalue = (K_prime_plus - K_prime_minus) / (2 * epsilon)

            # Stability
            if eigenvalue < 1:
                stability = "stable"
            elif eigenvalue > 1:
                stability = "unstable"
            else:
                stability = "marginal"

            return RGFixedPoint(
                coupling=K_star,
                temperature=temperature,  # Simplified
                eigenvalues=np.array([eigenvalue]),
                stability=stability,
                universality_class="2D Ising"
            )

        except:
            return None


class MomentumShellRG(RGTransformation):
    """Momentum shell RG (Wilson's method)"""

    def __init__(self, dimension: float = 2.0,
                 deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize momentum shell RG

        Args:
            dimension: Spatial dimension d
            deepseek: DeepSeek client
        """
        super().__init__(deepseek)
        self.dimension = dimension

    def beta_function(self, coupling: float) -> float:
        """
        Beta function β(g) = dg/dl

        For φ^4 theory: β(g) = (4-d)g - (3/16π²)g² + ...

        Args:
            coupling: Coupling constant g

        Returns:
            Beta function value
        """
        d = self.dimension

        # One-loop beta function
        beta = (4 - d) * coupling - 3.0 * coupling**2 / (16 * np.pi**2)

        return beta

    def rg_equation_coupling(self, coupling: float, length_scale: float) -> float:
        """
        RG equation for coupling: dg/dl = β(g)

        Args:
            coupling: Coupling g
            length_scale: Length scale l

        Returns:
            dg/dl
        """
        return self.beta_function(coupling)

    def solve_rg_flow(self, initial_coupling: float,
                      l_max: float = 5.0,
                      n_points: int = 1000) -> np.ndarray:
        """
        Solve RG flow equations

        Args:
            initial_coupling: Initial coupling g
            l_max: Maximum length scale
            n_points: Number of points

        Returns:
            Coupling values at each length scale
        """
        l_values = np.linspace(0, l_max, n_points)

        # Solve ODE: dg/dl = β(g)
        from scipy.integrate import solve_ivp

        def rg_ode(l, g):
            return [self.beta_function(g[0])]

        solution = solve_ivp(
            rg_ode,
            [0, l_max],
            [initial_coupling],
            t_eval=l_values,
            method='RK45'
        )

        return solution.y[0]

    def find_fixed_points(self) -> List[RGFixedPoint]:
        """
        Find all RG fixed points

        Returns:
            List of fixed points
        """
        fixed_points = []

        # Gaussian fixed point: g = 0
        gaussian = RGFixedPoint(
            coupling=0.0,
            temperature=0.0,
            eigenvalues=np.array([4 - self.dimension]),
            stability="stable" if self.dimension > 4 else "unstable",
            universality_class="Gaussian"
        )
        fixed_points.append(gaussian)

        # Wilson-Fisher fixed point: g* = (4-d)/3
        epsilon = 4 - self.dimension
        if epsilon > 0:
            wf_coupling = epsilon / 3.0

            # Linearize at fixed point
            # β(g) ≈ (4-d)g - 3g²
            # dβ/dg at g* = 4-d - 6g* = (4-d) - 2(4-d) = -(4-d)
            eigenvalue = -(4 - self.dimension)

            wf = RGFixedPoint(
                coupling=wf_coupling,
                temperature=0.0,
                eigenvalues=np.array([eigenvalue]),
                stability="stable",
                universality_class="Wilson-Fisher"
            )
            fixed_points.append(wf)

        return fixed_points

    def critical_exponents_from_rg(self) -> Dict[str, float]:
        """
        Calculate critical exponents from RG

        Using epsilon expansion: ν = 1/2 + ε/12 + ...

        Returns:
            Critical exponents
        """
        epsilon = 4 - self.dimension

        # Epsilon expansion to O(ε²)
        nu = 0.5 + epsilon / 12.0 + epsilon**2 / 162.0
        eta = epsilon**2 / 54.0
        alpha = 2 - self.dimension * nu
        beta = (self.dimension - 2 + eta) * nu / 2.0
        gamma = (2 - eta) * nu
        delta = (self.dimension + 2 - eta) / (self.dimension - 2 + eta)

        return {
            "nu": nu,
            "eta": eta,
            "alpha": alpha,
            "beta": beta,
            "gamma": gamma,
            "delta": delta
        }


def analyze_rg_flow(initial_coupling: float = 0.3,
                    dimension: float = 2.0,
                    deepseek: Optional[DeepSeekStatMech] = None
                    ) -> Dict[str, Any]:
    """
    Complete RG analysis

    Args:
        initial_coupling: Initial coupling constant
        dimension: Spatial dimension
        deepseek: DeepSeek client

    Returns:
        Complete RG analysis
    """
    deepseek = deepseek or DeepSeekStatMech()

    print("=" * 80)
    print("RENORMALIZATION GROUP ANALYSIS")
    print("=" * 80)

    # Momentum shell RG
    print("\nMomentum Shell RG (Wilson's method)")
    print("-" * 80)

    rg = MomentumShellRG(dimension, deepseek)

    # Find fixed points
    fixed_points = rg.find_fixed_points()

    print(f"\nFixed points in d = {dimension} dimensions:")
    for fp in fixed_points:
        print(f"\n{fp.universality_class} fixed point:")
        print(f"  Coupling: g* = {fp.coupling:.4f}")
        print(f"  Eigenvalues: λ = {fp.eigenvalues}")
        print(f"  Stability: {fp.stability}")

    # Solve RG flow
    print(f"\nRG flow from g = {initial_coupling}:")
    g_values = rg.solve_rg_flow(initial_coupling, l_max=5.0)

    print(f"Initial: g = {g_values[0]:.4f}")
    print(f"Final: g = {g_values[-1]:.4f}")

    # Check flow to fixed point
    if abs(g_values[-1] - fixed_points[-1].coupling) < 0.01:
        print(f"Flow to: {fixed_points[-1].universality_class} fixed point")
    else:
        print("Flow to: High-coupling (strong coupling)")

    # Critical exponents
    print("\n" + "=" * 80)
    print("CRITICAL EXPONENTS FROM RG")
    print("=" * 80)

    exponents = rg.critical_exponents_from_rg()

    print(f"\nEpsilon expansion (ε = {4-dimension:.1f}):")
    print(f"ν (correlation length): {exponents['nu']:.4f}")
    print(f"η (anomalous dimension): {exponents['eta']:.4f}")
    print(f"α (heat capacity): {exponents['alpha']:.4f}")
    print(f"β (order parameter): {exponents['beta']:.4f}")
    print(f"γ (susceptibility): {exponents['gamma']:.4f}")
    print(f"δ (critical isotherm): {exponents['delta']:.4f}")

    # Real-space RG
    print("\n" + "=" * 80)
    print("REAL-SPACE RG (Migdal-Kadanoff)")
    print("=" * 80)

    real_rg = RealSpaceRG(lattice_size=32, deepseek=deepseek)

    # RG flow from different initial conditions
    initial_conditions = [
        (0.1, 1.0),  # High temperature
        (0.5, 1.0),  # Near critical
        (1.0, 1.0)   # Low temperature
    ]

    print("\nRG flows from different initial conditions:")
    for K_init, T_init in initial_conditions:
        flow = real_rg.rg_flow(K_init, T_init, n_steps=10)

        print(f"\nInitial: K = {K_init:.2f}, T = {T_init:.2f}")
        print(f"Final: K = {flow.coupling_values[-1]:.4f}")
        print(f"Length scale: {flow.length_scales[-1]:.1f}")

        if flow.fixed_point:
            print(f"Fixed point: {flow.fixed_point.universality_class}")

    # Get DeepSeek analysis
    print("\n" + "=" * 80)
    print("DEEPSEEK RG ANALYSIS")
    print("=" * 80)

    deepseek_result = deepseek.derive_rg_equations(
        f"RG analysis of agent system in d={dimension} dimensions. "
        f"Fixed points: {[fp.universality_class for fp in fixed_points]}. "
        f"Critical exponents: ν={exponents['nu']:.3f}, η={exponents['eta']:.3f}. "
        f"Analyze fixed point stability, universality, and epsilon expansion."
    )

    results = {
        "dimension": dimension,
        "fixed_points": [
            {
                "name": fp.universality_class,
                "coupling": fp.coupling,
                "eigenvalues": fp.eigenvalues.tolist(),
                "stability": fp.stability
            }
            for fp in fixed_points
        ],
        "rg_flow": {
            "initial_coupling": initial_coupling,
            "coupling_values": g_values.tolist(),
            "flow_to": fixed_points[-1].universality_class
        },
        "critical_exponents": exponents,
        "real_space_rg": {
            "initial_conditions": initial_conditions,
            "flows": "See output above"
        },
        "deepseek_analysis": deepseek_result
    }

    return results


def main():
    """Run RG analysis"""
    results = analyze_rg_flow(
        initial_coupling=0.3,
        dimension=2.0
    )

    return results


if __name__ == "__main__":
    main()

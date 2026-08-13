"""
Mean Field Theory for Agent Systems

This module implements mean field approximations for analyzing POLLN
agent colonies, including Curie-Weiss theory and fluctuation corrections.

Key concepts:
- Mean field approximation
- Curie-Weiss model
- Self-consistent equations
- Ginzburg criterion
- Fluctuation corrections
- Bethe approximation
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import math
from scipy.optimize import fsolve, root

from .deepseek_statmech import DeepSeekStatMech


@dataclass
class MeanFieldSolution:
    """Solution of mean field equations"""
    magnetization: float
    temperature: float
    field: float
    stable: bool
    free_energy: float


@dataclass
class FluctuationCorrection:
    """Fluctuation correction to mean field"""
    order: str  # 1/N, 1/z, etc.
    correction: float
    corrected_value: float


class CurieWeissModel:
    """
    Curie-Weiss mean field model

    Infinite-range model where all spins interact equally.
    Exactly solvable and shows mean field critical exponents.
    """

    def __init__(self, n_spins: int, deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize Curie-Weiss model

        Args:
            n_spins: Number of spins
            deepseek: DeepSeek client
        """
        self.n_spins = n_spins
        self.deepseek = deepseek or DeepSeekStatMech()

        # Get DeepSeek derivation
        derivation = self.deepseek.derive_mean_field(
            f"Curie-Weiss mean field theory for {n_spins} agent system. "
            "Derive self-consistent equation, critical temperature, "
            "critical exponents, and Ginzburg criterion."
        )
        self.derivation = derivation

    def self_consistent_equation(self, m: float, coupling: float,
                                  temperature: float, field: float = 0.0) -> float:
        """
        Self-consistent equation: m = tanh(β(Jzm + h))

        Args:
            m: Magnetization
            coupling: Coupling J
            temperature: Temperature T
            field: External field h

        Returns:
            Residual: m - tanh(β(Jzm + h))
        """
        beta = 1.0 / temperature
        z = self.n_spins - 1  # Coordination number (all-to-all)

        effective_field = coupling * z * m + field

        return m - np.tanh(beta * effective_field)

    def solve_magnetization(self, coupling: float, temperature: float,
                             field: float = 0.0,
                             initial_guess: float = 0.1) -> MeanFieldSolution:
        """
        Solve for equilibrium magnetization

        Args:
            coupling: Coupling J
            temperature: Temperature T
            field: External field h
            initial_guess: Initial guess for m

        Returns:
            Mean field solution
        """
        try:
            # Solve self-consistent equation
            m_solution = fsolve(
                lambda m: self.self_consistent_equation(m, coupling, temperature, field),
                initial_guess
            )[0]

            # Check stability (second derivative > 0)
            beta = 1.0 / temperature
            z = self.n_spins - 1
            effective_field = coupling * z * m_solution + field

            # Free energy
            F = -coupling * z * m_solution**2 / 2 - field * m_solution - \
                temperature * 0.5 * (1 + m_solution) * np.log(0.5 * (1 + m_solution)) - \
                temperature * 0.5 * (1 - m_solution) * np.log(0.5 * (1 - m_solution))

            # Stability: ∂²F/∂m² > 0
            stability = 1.0 / (temperature * (1 - np.tanh(beta * effective_field)**2)) - \
                        coupling * z
            stable = stability > 0

            return MeanFieldSolution(
                magnetization=m_solution,
                temperature=temperature,
                field=field,
                stable=stable,
                free_energy=F
            )

        except:
            return MeanFieldSolution(
                magnetization=0.0,
                temperature=temperature,
                field=field,
                stable=False,
                free_energy=0.0
            )

    def critical_temperature(self, coupling: float) -> float:
        """
        Mean field critical temperature

        kT_c = Jz

        Args:
            coupling: Coupling J

        Returns:
            Critical temperature T_c
        """
        z = self.n_spins - 1
        return coupling * z

    def critical_exponents(self) -> Dict[str, float]:
        """
        Mean field critical exponents

        Returns:
            Dictionary of exponents
        """
        return {
            "alpha": 0,      # Heat capacity: jump discontinuity
            "beta": 0.5,     # Order parameter: M ~ (T_c - T)^{1/2}
            "gamma": 1.0,    # Susceptibility: χ ~ |T - T_c|^{-1}
            "delta": 3.0,    # Critical isotherm: M ~ h^{1/3}
            "nu": 0.5,       # Correlation length: ξ ~ |T - T_c|^{-1/2}
            "eta": 0         # Correlation function: G(r) ~ 1/r^{d-2}
        }

    def susceptibility(self, coupling: float, temperature: float,
                        field: float = 0.0) -> float:
        """
        Magnetic susceptibility χ = ∂⟨M⟩/∂h

        For mean field: χ = 1 / (kT - Jz)

        Args:
            coupling: Coupling J
            temperature: Temperature T
            field: External field h

        Returns:
            Susceptibility
        """
        z = self.n_spins - 1

        if temperature > self.critical_temperature(coupling):
            return 1.0 / (temperature - coupling * z)
        else:
            # Below T_c, susceptibility is more complex
            m = self.solve_magnetization(coupling, temperature, field).magnetization
            beta = 1.0 / temperature
            return beta * (1 - m**2)


class BetheApproximation:
    """
    Bethe approximation (quasi-chemical approximation)

    Improves on mean field by including local correlations.
    Exact for Cayley trees.
    """

    def __init__(self, coordination: int = 4,
                 deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize Bethe approximation

        Args:
            coordination: Coordination number z
            deepseek: DeepSeek client
        """
        self.coordination = coordination
        self.deepseek = deepseek or DeepSeekStatMech()

    def self_consistent_equations(self, variables: np.ndarray,
                                    coupling: float,
                                    temperature: float) -> np.ndarray:
        """
        Bethe approximation self-consistent equations

        For Ising model, we solve for cavity fields x_i

        Args:
            variables: Cavity fields
            coupling: Coupling J
            temperature: Temperature T

        Returns:
            Residuals
        """
        beta = 1.0 / temperature
        x = variables[0]
        z = self.coordination

        # Self-consistent equation for cavity field
        # x = f(x) where f involves hyperbolic functions

        # Simplified for homogeneous solution
        residual = x - np.log(
            np.sinh(beta * coupling * (z - 1) * x + beta * coupling * z) /
            np.sinh(beta * coupling * (z - 1) * x - beta * coupling * z)
        )

        return np.array([residual])

    def solve_magnetization(self, coupling: float,
                             temperature: float) -> float:
        """
        Solve for magnetization

        Args:
            coupling: Coupling J
            temperature: Temperature T

        Returns:
            Magnetization
        """
        try:
            # Solve for cavity field
            x_solution = fsolve(
                lambda x: self.self_consistent_equations(x, coupling, temperature),
                [0.1]
            )[0]

            # Magnetization from cavity field
            beta = 1.0 / temperature
            z = self.coordination

            numerator = np.sinh(beta * coupling * z + (z - 1) * x_solution)
            denominator = np.cosh(beta * coupling * z + (z - 1) * x_solution)

            return numerator / denominator

        except:
            return 0.0

    def critical_temperature(self, coupling: float) -> float:
        """
        Bethe approximation critical temperature

        kT_c = 2J / ln(z/(z-2))

        Args:
            coupling: Coupling J

        Returns:
            Critical temperature
        """
        z = self.coordination

        if z <= 2:
            return 0.0  # No phase transition

        return 2 * coupling / np.log(z / (z - 2))


class GinzburgCriterion:
    """
    Ginzburg criterion for validity of mean field theory

    Mean field is valid when fluctuations are small compared to mean field.
    """

    def __init__(self, dimension: float = 3.0):
        """
        Initialize Ginzburg criterion

        Args:
            dimension: Spatial dimension d
        """
        self.dimension = dimension

    def ginzburg_parameter(self, temperature: float,
                            T_c: float,
                            correlation_length: float,
                            coupling: float) -> float:
        """
        Ginzburg parameter G

        G = (ξ(T) / a)^{d} * (k_B T / J)

        Mean field valid when G << 1

        Args:
            temperature: Temperature T
            T_c: Critical temperature
            correlation_length: Correlation length ξ
            coupling: Coupling J

        Returns:
            Ginzburg parameter
        """
        a = 1.0  # Lattice constant
        d = self.dimension

        t = abs(temperature - T_c) / T_c  # Reduced temperature

        if t > 0:
            xi = correlation_length * t**(-0.5)  # Mean field ν = 1/2
        else:
            xi = correlation_length

        G = (xi / a)**d * (temperature / coupling)

        return G

    def upper_critical_dimension(self) -> float:
        """
        Upper critical dimension d_u

        For Ising model: d_u = 4

        Returns:
            Upper critical dimension
        """
        return 4.0

    def lower_critical_dimension(self) -> float:
        """
        Lower critical dimension d_l

        For Ising model: d_l = 1

        Returns:
            Lower critical dimension
        """
        return 1.0

    def mean_field_valid(self, Ginzburg: float) -> bool:
        """
        Check if mean field is valid

        Args:
            Ginzburg: Ginzburg parameter

        Returns:
            True if mean field valid
        """
        return Ginzburg < 0.1


class VariationalMethod:
    """
    Variational methods for improved mean field

    Minimize free energy functional with trial density.
    """

    def __init__(self, n_spins: int):
        """
        Initialize variational method

        Args:
            n_spins: Number of spins
        """
        self.n_spins = n_spins

    def variational_free_energy(self, m: float, coupling: float,
                                 temperature: float,
                                 field: float = 0.0) -> float:
        """
        Variational free energy (Bogoliubov inequality)

        F_var = F_0 + ⟨H - H_0⟩_0

        Args:
            m: Trial magnetization
            coupling: Coupling J
            temperature: Temperature T
            field: External field h

        Returns:
            Variational free energy
        """
        z = self.n_spins - 1
        beta = 1.0 / temperature

        # Non-interacting part
        F_0 = -temperature * np.log(2 * np.cosh(beta * field))

        # Interaction term
        interaction = -coupling * z * m**2 / 2

        # Entropy term
        entropy = -temperature * 0.5 * (1 + m) * np.log(0.5 * (1 + m)) - \
                  -temperature * 0.5 * (1 - m) * np.log(0.5 * (1 - m))

        return F_0 + interaction + entropy

    def optimize_magnetization(self, coupling: float,
                                temperature: float,
                                field: float = 0.0) -> float:
        """
        Find optimal magnetization by minimizing F_var

        Args:
            coupling: Coupling J
            temperature: Temperature T
            field: External field h

        Returns:
            Optimal magnetization
        """
        # Grid search for minimum
        m_values = np.linspace(-1, 1, 1001)
        F_values = [self.variational_free_energy(m, coupling, temperature, field)
                    for m in m_values]

        min_idx = np.argmin(F_values)

        return m_values[min_idx]


def analyze_mean_field(n_agents: int = 100,
                        coupling: float = 0.01,
                        temperature_range: Optional[np.ndarray] = None,
                        deepseek: Optional[DeepSeekStatMech] = None
                        ) -> Dict[str, Any]:
    """
    Complete mean field analysis

    Args:
        n_agents: Number of agents
        coupling: Coupling strength
        temperature_range: Temperature values to scan
        deepseek: DeepSeek client

    Returns:
        Complete mean field analysis
    """
    if temperature_range is None:
        T_c = coupling * (n_agents - 1)
        temperature_range = np.linspace(0.5 * T_c, 1.5 * T_c, 50)

    deepseek = deepseek or DeepSeekStatMech()

    print("=" * 80)
    print("MEAN FIELD ANALYSIS")
    print("=" * 80)

    # Curie-Weiss model
    print("\nCurie-Weiss Mean Field")
    print("-" * 80)

    cw = CurieWeissModel(n_agents, deepseek)

    T_c = cw.critical_temperature(coupling)
    print(f"\nCritical temperature: T_c = {T_c:.3f}")

    exponents = cw.critical_exponents()
    print(f"\nMean field critical exponents:")
    for name, value in exponents.items():
        print(f"  {name}: {value}")

    # Temperature scan
    magnetizations = []
    susceptibilities = []

    print(f"\nTemperature scan (T/T_c from {temperature_range[0]/T_c:.2f} to {temperature_range[-1]/T_c:.2f}):")

    for T in temperature_range:
        solution = cw.solve_magnetization(coupling, T)
        chi = cw.susceptibility(coupling, T)

        magnetizations.append(abs(solution.magnetization))
        susceptibilities.append(chi)

        if T / T_c in [0.8, 0.9, 1.0, 1.1, 1.2]:
            print(f"  T/T_c = {T/T_c:.2f}: M = {abs(solution.magnetization):.3f}, χ = {chi:.3f}")

    # Bethe approximation
    print("\n" + "=" * 80)
    print("Bethe Approximation")
    print("-" * 80)

    bethe = BetheApproximation(coordination=4, deepseek=deepseek)

    T_c_bethe = bethe.critical_temperature(coupling)
    print(f"\nBethe critical temperature: T_c = {T_c_bethe:.3f}")
    print(f"Ratio T_c(Bethe)/T_c(MeanField) = {T_c_bethe/T_c:.3f}")

    # Bethe magnetization
    magnetizations_bethe = []
    for T in temperature_range:
        m = bethe.solve_magnetization(coupling, T)
        magnetizations_bethe.append(abs(m))

    # Ginzburg criterion
    print("\n" + "=" * 80)
    print("Ginzburg Criterion")
    print("-" * 80)

    ginzburg = GinzburgCriterion(dimension=2)

    T_close = T_c * 1.01
    xi = 10.0  # Typical correlation length
    G = ginzburg.ginzburg_parameter(T_close, T_c, xi, coupling)

    print(f"\nGinzburg parameter at T = {T_close:.3f}: G = {G:.3f}")
    print(f"Mean field valid: {ginzburg.mean_field_valid(G)}")
    print(f"Upper critical dimension: d_u = {ginzburg.upper_critical_dimension()}")
    print(f"Lower critical dimension: d_l = {ginzburg.lower_critical_dimension()}")

    # Variational method
    print("\n" + "=" * 80)
    print("Variational Method")
    print("-" * 80)

    variational = VariationalMethod(n_agents)

    # Find optimal magnetization at T_c
    m_var = variational.optimize_magnetization(coupling, T_c)
    print(f"\nVariational magnetization at T_c: m = {m_var:.3f}")

    # Get DeepSeek analysis
    print("\n" + "=" * 80)
    print("DEEPSEEK MEAN FIELD ANALYSIS")
    print("=" * 80)

    deepseek_result = deepseek.derive_mean_field(
        f"Mean field analysis of {n_agents} agent system with coupling {coupling:.3f}. "
        f"T_c(MF) = {T_c:.3f}, T_c(Bethe) = {T_c_bethe:.3f}. "
        f"Ginzburg parameter G = {G:.3f}. "
        f"Analyze mean field validity, fluctuation corrections, and improvement strategies."
    )

    results = {
        "n_agents": n_agents,
        "coupling": coupling,
        "critical_temperature": {
            "mean_field": T_c,
            "bethe": T_c_bethe
        },
        "critical_exponents": exponents,
        "temperature_scan": {
            "temperatures": temperature_range.tolist(),
            "magnetizations_mean_field": magnetizations,
            "magnetizations_bethe": magnetizations_bethe,
            "susceptibilities": susceptibilities
        },
        "ginzburg_criterion": {
            "parameter": G,
            "valid": ginzburg.mean_field_valid(G),
            "upper_critical_dimension": ginzburg.upper_critical_dimension(),
            "lower_critical_dimension": ginzburg.lower_critical_dimension()
        },
        "variational": {
            "magnetization_at_Tc": m_var
        },
        "deepseek_analysis": deepseek_result
    }

    return results


def main():
    """Run mean field analysis"""
    results = analyze_mean_field(
        n_agents=50,
        coupling=0.02
    )

    return results


if __name__ == "__main__":
    main()

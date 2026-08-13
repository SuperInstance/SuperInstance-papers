"""
Phase Transition Analysis for Agent Systems

This module analyzes phase transitions in POLLN agent colonies
using statistical mechanics and order parameter theory.

Key concepts:
- Order parameters
- First-order vs second-order transitions
- Critical temperature
- Hysteresis and metastability
- Landau theory
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import math

from .deepseek_statmech import DeepSeekStatMech
from .ensembles import CanonicalEnsemble


class TransitionType(Enum):
    """Types of phase transitions"""
    FIRST_ORDER = "first_order"      # Discontinuous (latent heat)
    SECOND_ORDER = "second_order"    # Continuous (critical phenomena)
    INFINITE_ORDER = "infinite_order"  # Kosterlitz-Thouless type
    CROSSOVER = "crossover"          # No true singularity


@dataclass
class OrderParameter:
    """Order parameter for phase transition"""
    name: str
    value: float
    susceptibility: float
    correlation_length: float
    symmetry_breaking: str


@dataclass
class TransitionPoint:
    """Critical point of phase transition"""
    temperature: float
    transition_type: TransitionType
    order_parameter: OrderParameter
    latent_heat: float  # Zero for second-order
    critical_exponents: Dict[str, float]


class LandauTheory:
    """
    Landau theory of phase transitions

    Free energy expansion in order parameter:
    F = a(T-T_c)M² + bM⁴ + cM⁶ + ... - hM
    """

    def __init__(self, deepseek: Optional[DeepSeekStatMech] = None):
        """Initialize Landau theory"""
        self.deepseek = deepseek or DeepSeekStatMech()

        # Get DeepSeek derivation
        derivation = self.deepseek.derive_order_parameter(
            "Landau theory for agent system phase transition with order parameter M"
        )
        self.derivation = derivation

    def free_energy(self, M: float, T: float, T_c: float,
                    a: float = 1.0, b: float = 1.0,
                    c: float = 0.0, h: float = 0.0) -> float:
        """
        Landau free energy density

        F(M) = a(T-T_c)M² + bM⁴ + cM⁶ - hM

        Args:
            M: Order parameter
            T: Temperature
            T_c: Critical temperature
            a, b, c: Landau coefficients
            h: External field

        Returns:
            Free energy F(M)
        """
        return a * (T - T_c) * M**2 + b * M**4 + c * M**6 - h * M

    def equilibrium_order_parameter(self, T: float, T_c: float,
                                     a: float = 1.0, b: float = 1.0,
                                     h: float = 0.0) -> List[float]:
        """
        Find equilibrium order parameter from ∂F/∂M = 0

        a(T-T_c)M + bM³ - h = 0

        Args:
            T: Temperature
            T_c: Critical temperature
            a, b: Landau coefficients
            h: External field

        Returns:
            List of solutions (minima)
        """
        # Solve cubic: bM³ + a(T-T_c)M - h = 0
        coeffs = [b, 0, a * (T - T_c), -h]
        roots = np.roots(coeffs)

        # Filter real roots
        real_roots = [np.real(r) for r in roots if abs(np.imag(r)) < 1e-6]

        # Check which are minima (∂²F/∂M² > 0)
        minima = []
        for root in real_roots:
            second_derivative = 3 * b * root**2 + a * (T - T_c)
            if second_derivative > 0:
                F = self.free_energy(root, T, T_c, a, b, 0, h)
                minima.append((root, F))

        # Sort by free energy
        minima.sort(key=lambda x: x[1])

        return [m[0] for m in minima]

    def critical_temperature_mean_field(self, coupling: float,
                                         coordination: int = 4) -> float:
        """
        Mean-field critical temperature

        kT_c = Jz for Ising model

        Args:
            coupling: Coupling strength J
            coordination: Coordination number z

        Returns:
            Critical temperature T_c
        """
        return coupling * coordination

    def latent_heat(self, T_c: float, a: float = 1.0,
                    b: float = 1.0) -> float:
        """
        Latent heat L = TΔS for first-order transition

        For Landau theory with tricritical point (c < 0):
        L occurs when a(T-T_c) = 3c²/4b

        Args:
            T_c: Critical temperature
            a, b: Landau coefficients

        Returns:
            Latent heat L
        """
        # For second-order (c=0): no latent heat
        return 0.0


class PhaseTransitionAnalyzer:
    """Analyze phase transitions in agent systems"""

    def __init__(self, n_agents: int, deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize analyzer

        Args:
            n_agents: Number of agents
            deepseek: DeepSeek client
        """
        self.n_agents = n_agents
        self.deepseek = deepseek or DeepSeekStatMech()
        self.landau = LandauTheory(deepseek)

        # Get DeepSeek derivation
        derivation = self.deepseek.derive_order_parameter(
            f"Phase transition analysis for {n_agents} agent colony. "
            "Identify order parameter, critical temperature, transition type."
        )
        self.derivation = derivation

    def compute_order_parameter(self, states: np.ndarray) -> float:
        """
        Compute order parameter (magnetization)

        M = |(1/N) Σ_i s_i|

        Args:
            states: Agent states

        Returns:
            Order parameter M
        """
        return abs(np.mean(states))

    def susceptibility(self, magnetizations: np.ndarray,
                       temperatures: np.ndarray) -> np.ndarray:
        """
        Compute susceptibility χ = dM/dT

        Args:
            magnetizations: Order parameters at each T
            temperatures: Temperatures

        Returns:
            Susceptibility array
        """
        chi = np.zeros_like(magnetizations)

        # Central difference
        for i in range(1, len(magnetizations) - 1):
            dM = magnetizations[i+1] - magnetizations[i-1]
            dT = temperatures[i+1] - temperatures[i-1]
            chi[i] = dM / dT if dT != 0 else 0.0

        # Forward/backward difference at boundaries
        if len(magnetizations) > 1:
            chi[0] = (magnetizations[1] - magnetizations[0]) / \
                     (temperatures[1] - temperatures[0])
            chi[-1] = (magnetizations[-1] - magnetizations[-2]) / \
                      (temperatures[-1] - temperatures[-2])

        return chi

    def binder_cumulant(self, magnetizations: List[np.ndarray],
                        temperatures: np.ndarray) -> np.ndarray:
        """
        Binder cumulant U4 = 1 - ⟨M⁴⟩ / (3⟨M²⟩²)

        Useful for locating critical point from crossing.

        Args:
            magnetizations: List of magnetization time series
            temperatures: Temperatures

        Returns:
            Binder cumulant array
        """
        U4 = np.zeros(len(temperatures))

        for i, mag_series in enumerate(magnetizations):
            M2 = np.mean(mag_series**2)
            M4 = np.mean(mag_series**4)

            if M2 > 1e-10:
                U4[i] = 1 - M4 / (3 * M2**2)
            else:
                U4[i] = 0.0

        return U4

    def locate_critical_temperature(self, temperatures: np.ndarray,
                                     susceptibilities: np.ndarray) -> float:
        """
        Locate critical temperature from peak in susceptibility

        Args:
            temperatures: Temperature array
            susceptibilities: Susceptibility array

        Returns:
            Critical temperature T_c
        """
        max_idx = np.argmax(susceptibilities)
        return temperatures[max_idx]

    def classify_transition(self, magnetizations: np.ndarray,
                             temperatures: np.ndarray,
                             T_c: float) -> TransitionType:
        """
        Classify phase transition type

        First-order: Discontinuous jump in M
        Second-order: Continuous but singular at T_c

        Args:
            magnetizations: Order parameters
            temperatures: Temperatures
            T_c: Critical temperature

        Returns:
            Transition type
        """
        # Find indices around T_c
        idx = np.argmin(np.abs(temperatures - T_c))

        if idx == 0 or idx == len(temperatures) - 1:
            return TransitionType.CROSSOVER

        # Check for discontinuity
        M_below = magnetizations[idx - 1]
        M_above = magnetizations[idx + 1]
        jump = abs(M_above - M_below)

        # Check for hysteresis (sign of first-order)
        # For simplicity: large jump = first-order
        if jump > 0.5:
            return TransitionType.FIRST_ORDER
        elif jump > 0.1:
            return TransitionType.SECOND_ORDER
        else:
            return TransitionType.CROSSOVER

    def hysteresis_analysis(self, temperatures_forward: np.ndarray,
                            M_forward: np.ndarray,
                            temperatures_backward: np.ndarray,
                            M_backward: np.ndarray) -> Dict[str, Any]:
        """
        Analyze hysteresis in phase transition

        First-order transitions show hysteresis loop.

        Args:
            temperatures_forward: T on cooling
            M_forward: M on cooling
            temperatures_backward: T on heating
            M_backward: M on heating

        Returns:
            Hysteresis analysis
        """
        # Interpolate to common temperature grid
        T_min = max(temperatures_forward.min(), temperatures_backward.min())
        T_max = min(temperatures_forward.max(), temperatures_backward.max())
        T_common = np.linspace(T_min, T_max, 100)

        M_forward_interp = np.interp(T_common, temperatures_forward, M_forward)
        M_backward_interp = np.interp(T_common, temperatures_backward, M_backward)

        # Hysteresis loop area
        area = np.trapz(M_backward_interp - M_forward_interp, T_common)

        # Check for significant hysteresis
        has_hysteresis = abs(area) > 0.1

        return {
            "has_hysteresis": has_hysteresis,
            "loop_area": area,
            "temperatures": T_common,
            "M_forward": M_forward_interp,
            "M_backward": M_backward_interp
        }

    def correlation_length(self, correlations: np.ndarray) -> float:
        """
        Extract correlation length from correlation function

        G(r) ~ exp(-r/ξ) for r large

        Args:
            correlations: G(r) values

        Returns:
            Correlation length ξ
        """
        # Fit exponential tail
        r = np.arange(len(correlations))

        # Use log fit: ln G(r) ~ -r/ξ
        log_G = np.log(np.abs(correlations) + 1e-10)

        # Linear fit to tail
        tail_start = len(correlations) // 2
        coeffs = np.polyfit(r[tail_start:], log_G[tail_start:], 1)

        # ξ = -1/slope
        xi = -1.0 / coeffs[0] if coeffs[0] < 0 else float('inf')

        return xi

    def finite_size_scaling(self, T_c_values: List[float],
                             system_sizes: List[int]) -> Dict[str, float]:
        """
        Finite-size scaling analysis

        T_c(L) - T_c(∞) ~ L^{-1/ν}

        Args:
            T_c_values: Critical temperatures for each L
            system_sizes: System sizes L

        Returns:
            Fitting parameters
        """
        # Fit power law: T_c(L) = T_c(∞) + A L^{-1/ν}
        from scipy.optimize import curve_fit

        def power_law(L, Tc_inf, A, nu):
            return Tc_inf + A * L**(-1.0/nu)

        L_array = np.array(system_sizes, dtype=float)
        Tc_array = np.array(T_c_values)

        try:
            popt, _ = curve_fit(power_law, L_array, Tc_array,
                                p0=[Tc_array.mean(), 1.0, 1.0])

            return {
                "Tc_infinity": popt[0],
                "amplitude": popt[1],
                "nu": popt[2]
            }
        except:
            return {
                "Tc_infinity": Tc_array.mean(),
                "amplitude": 0.0,
                "nu": 1.0
            }


def analyze_phase_transition(n_agents: int = 100,
                              T_min: float = 0.5,
                              T_max: float = 3.0,
                              n_points: int = 50,
                              deepseek: Optional[DeepSeekStatMech] = None
                              ) -> Dict[str, Any]:
    """
    Complete phase transition analysis

    Args:
        n_agents: Number of agents
        T_min: Minimum temperature
        T_max: Maximum temperature
        n_points: Number of temperature points
        deepseek: DeepSeek client

    Returns:
        Complete analysis
    """
    deepseek = deepseek or DeepSeekStatMech()
    analyzer = PhaseTransitionAnalyzer(n_agents, deepseek)

    print("=" * 80)
    print("PHASE TRANSITION ANALYSIS")
    print("=" * 80)

    # Temperature scan
    temperatures = np.linspace(T_min, T_max, n_points)

    # Create coupling matrix
    np.random.seed(42)
    couplings = np.random.randn(n_agents, n_agents)
    couplings = (couplings + couplings.T) / 2
    np.fill_diagonal(couplings, 0)
    couplings = np.sign(couplings) * 0.5

    # Compute order parameter at each T
    magnetizations = []
    magnetizations_series = []

    for T in temperatures:
        ensemble = CanonicalEnsemble(n_agents, T)
        m = ensemble.equilibrium_magnetization(couplings)
        magnetizations.append(abs(m))

        # Generate time series for Binder cumulant
        series = []
        for _ in range(100):
            states = np.random.choice([-1, 1], size=n_agents)
            series.append(abs(np.mean(states)))
        magnetizations_series.append(np.array(series))

        print(f"T = {T:.3f}: M = {abs(m):.3f}")

    magnetizations = np.array(magnetizations)

    # Compute susceptibility
    susceptibilities = analyzer.susceptibility(magnetizations, temperatures)

    # Locate critical temperature
    T_c = analyzer.locate_critical_temperature(temperatures, susceptibilities)

    # Classify transition
    transition_type = analyzer.classify_transition(
        magnetizations, temperatures, T_c
    )

    # Compute Binder cumulant
    U4 = analyzer.binder_cumulant(magnetizations_series, temperatures)

    # Landau theory prediction
    J_eff = np.mean(couplings[couplings != 0])
    T_c_landau = analyzer.landau.critical_temperature_mean_field(J_eff)

    # Get DeepSeek analysis
    print("\n" + "=" * 80)
    print("DEEPSEEK PHASE TRANSITION ANALYSIS")
    print("=" * 80)

    deepseek_result = deepseek.derive_order_parameter(
        f"Agent colony with {n_agents} agents, coupling {J_eff:.3f}. "
        f"Observed T_c = {T_c:.3f}, predicted T_c (Landau) = {T_c_landau:.3f}. "
        f"Transition type: {transition_type.value}."
    )

    results = {
        "n_agents": n_agents,
        "couplings": couplings,
        "temperatures": temperatures,
        "magnetizations": magnetizations,
        "susceptibilities": susceptibilities,
        "binder_cumulant": U4,
        "critical_temperature": T_c,
        "transition_type": transition_type,
        "Tc_landau": T_c_landau,
        "deepseek_analysis": deepseek_result
    }

    print("\n" + "=" * 80)
    print("RESULTS:")
    print("=" * 80)
    print(f"Critical Temperature: T_c = {T_c:.3f}")
    print(f"Landau Prediction: T_c = {T_c_landau:.3f}")
    print(f"Transition Type: {transition_type.value}")
    print(f"Max Susceptibility: χ_max = {np.max(susceptibilities):.3f}")

    return results


def main():
    """Run phase transition analysis"""
    results = analyze_phase_transition(
        n_agents=64,
        T_min=0.5,
        T_max=3.0,
        n_points=40
    )

    return results


if __name__ == "__main__":
    main()

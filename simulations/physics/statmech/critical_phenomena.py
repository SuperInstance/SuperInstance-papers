"""
Critical Phenomena Analysis for Agent Systems

This module analyzes critical phenomena in POLLN agent colonies
near phase transitions using scaling theory and critical exponents.

Key concepts:
- Critical exponents: α, β, γ, δ, ν, η
- Scaling relations and universality
- Finite-size scaling
- Data collapse
- Universality classes
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import math
from scipy.optimize import curve_fit
from scipy.stats import linregress

from .deepseek_statmech import DeepSeekStatMech


@dataclass
class CriticalExponents:
    """Critical exponents for phase transition"""
    alpha: float  # Heat capacity: C ~ |t|^{-α}
    beta: float   # Order parameter: M ~ (-t)^{β} for t<0
    gamma: float  # Susceptibility: χ ~ |t|^{-γ}
    delta: float  # Critical isotherm: M ~ h^{1/δ}
    nu: float     # Correlation length: ξ ~ |t|^{-ν}
    eta: float    # Correlation function: G(r) ~ r^{-(d-2+η)}


@dataclass
class ScalingRelations:
    """Scaling relations between exponents"""
    rushbrooke: float    # α + 2β + γ = 2
    widom: float         # γ = β(δ - 1)
    fisher: float        # γ = ν(2 - η)
    josephson: float     # α = 2 - νd
    correlation: float   # ν = γ/(2-η)


class UniversalityClass:
    """Universality classes for phase transitions"""

    # Mean field exponents
    MEAN_FIELD = CriticalExponents(0, 0.5, 1.0, 3.0, 0.5, 0)

    # 2D Ising exponents (exact)
    ISING_2D = CriticalExponents(0, 0.125, 1.75, 15.0, 1.0, 0.25)

    # 3D Ising exponents (numerical)
    ISING_3D = CriticalExponents(0.110, 0.326, 1.237, 4.789, 0.630, 0.036)

    # XY model exponents
    XY_2D = CriticalExponents(-0.007, 0.349, 1.317, 4.780, 0.669, 0.038)

    # Heisenberg exponents
    HEISENBERG_3D = CriticalExponents(-0.115, 0.365, 1.389, 4.803, 0.711, 0.037)


class CriticalPhenomenaAnalyzer:
    """Analyze critical phenomena in agent systems"""

    def __init__(self, deepseek: Optional[DeepSeekStatMech] = None):
        """Initialize analyzer"""
        self.deepseek = deepseek or DeepSeekStatMech()

        # Get DeepSeek derivation
        derivation = self.deepseek.derive_critical_exponents(
            "Critical exponents for agent system phase transition. "
            "Include scaling relations, universality classification, "
            "and renormalization group predictions."
        )
        self.derivation = derivation

    def reduced_temperature(self, temperatures: np.ndarray,
                             T_c: float) -> np.ndarray:
        """
        Reduced temperature t = (T - T_c) / T_c

        Args:
            temperatures: Temperature array
            T_c: Critical temperature

        Returns:
            Reduced temperature array
        """
        return (temperatures - T_c) / T_c

    def fit_critical_exponent(self, y: np.ndarray, t: np.ndarray,
                               exponent_guess: float = 0.5,
                               fit_range: float = 0.1) -> Tuple[float, float]:
        """
        Fit power law y ~ |t|^{-exponent}

        Args:
            y: Observable to fit
            t: Reduced temperature
            exponent_guess: Initial guess for exponent
            fit_range: Fit range |t| < fit_range

        Returns:
            (exponent, error) tuple
        """
        # Filter data in fitting range
        mask = np.abs(t) < fit_range
        t_fit = t[mask]
        y_fit = y[mask]

        # Remove t=0 and negative t for log fit
        mask2 = (t_fit > 0) & (y_fit > 0)
        t_fit = t_fit[mask2]
        y_fit = y_fit[mask2]

        if len(t_fit) < 3:
            return exponent_guess, 1.0

        # Linear fit in log-log: ln y = -exponent * ln t + constant
        log_t = np.log(t_fit)
        log_y = np.log(y_fit)

        slope, intercept, r_value, p_value, std_err = linregress(log_t, log_y)

        exponent = -slope
        error = std_err

        return exponent, error

    def extract_alpha(self, temperatures: np.ndarray,
                       heat_capacities: np.ndarray,
                       T_c: float) -> Tuple[float, float]:
        """
        Extract heat capacity exponent α

        C ~ |t|^{-α}

        Args:
            temperatures: Temperature array
            heat_capacities: Heat capacity array
            T_c: Critical temperature

        Returns:
            (α, error) tuple
        """
        t = self.reduced_temperature(temperatures, T_c)
        return self.fit_critical_exponent(heat_capacities, t, 0.1)

    def extract_beta(self, temperatures: np.ndarray,
                      magnetizations: np.ndarray,
                      T_c: float) -> Tuple[float, float]:
        """
        Extract order parameter exponent β

        M ~ (-t)^{β} for t < 0

        Args:
            temperatures: Temperature array
            magnetizations: Order parameter array
            T_c: Critical temperature

        Returns:
            (β, error) tuple
        """
        t = self.reduced_temperature(temperatures, T_c)

        # Only fit T < T_c (t < 0)
        mask = t < 0
        t_below = -t[mask]  # Make positive
        M_below = magnetizations[mask]

        return self.fit_critical_exponent(M_below, t_below, 0.3)

    def extract_gamma(self, temperatures: np.ndarray,
                       susceptibilities: np.ndarray,
                       T_c: float) -> Tuple[float, float]:
        """
        Extract susceptibility exponent γ

        χ ~ |t|^{-γ}

        Args:
            temperatures: Temperature array
            susceptibilities: Susceptibility array
            T_c: Critical temperature

        Returns:
            (γ, error) tuple
        """
        t = self.reduced_temperature(temperatures, T_c)
        return self.fit_critical_exponent(susceptibilities, t, 1.0)

    def extract_delta(self, magnetizations: np.ndarray,
                       fields: np.ndarray) -> Tuple[float, float]:
        """
        Extract critical isotherm exponent δ

        M ~ h^{1/δ} at T = T_c

        Args:
            magnetizations: Order parameter at T_c
            fields: External fields

        Returns:
            (δ, error) tuple
        """
        # Filter positive values
        mask = (magnetizations > 0) & (fields > 0)
        M_fit = magnetizations[mask]
        h_fit = fields[mask]

        if len(M_fit) < 3:
            return 3.0, 1.0

        # Linear fit: ln M = (1/δ) ln h
        log_M = np.log(M_fit)
        log_h = np.log(h_fit)

        slope, _, _, _, std_err = linregress(log_h, log_M)

        delta = 1.0 / slope if slope != 0 else 3.0
        error = std_err / slope**2 if slope != 0 else 1.0

        return delta, error

    def extract_nu(self, temperatures: np.ndarray,
                    correlation_lengths: np.ndarray,
                    T_c: float) -> Tuple[float, float]:
        """
        Extract correlation length exponent ν

        ξ ~ |t|^{-ν}

        Args:
            temperatures: Temperature array
            correlation_lengths: Correlation length array
            T_c: Critical temperature

        Returns:
            (ν, error) tuple
        """
        t = self.reduced_temperature(temperatures, T_c)
        return self.fit_critical_exponent(correlation_lengths, t, 0.6)

    def extract_eta(self, distances: np.ndarray,
                     correlations: np.ndarray) -> Tuple[float, float]:
        """
        Extract anomalous dimension η

        G(r) ~ r^{-(d-2+η)} at T = T_c

        Args:
            distances: Distance array
            correlations: Correlation function at T_c

        Returns:
            (η, error) tuple
        """
        # Assume 2D system
        d = 2

        # Filter tail behavior
        mask = distances > distances.max() / 2
        r_fit = distances[mask]
        G_fit = correlations[mask]

        if len(r_fit) < 3:
            return 0.0, 1.0

        # Linear fit: ln G = -(d-2+η) ln r
        log_r = np.log(r_fit)
        log_G = np.log(np.abs(G_fit) + 1e-10)

        slope, _, _, _, std_err = linregress(log_r, log_G)

        eta = -(slope + d - 2)
        error = std_err

        return eta, error

    def verify_scaling_relations(self,
                                  exponents: CriticalExponents) -> ScalingRelations:
        """
        Verify scaling relations between exponents

        Args:
            exponents: Critical exponents

        Returns:
            Scaling relations
        """
        # Rushbrooke: α + 2β + γ = 2
        rushbrooke = exponents.alpha + 2*exponents.beta + exponents.gamma

        # Widom: γ = β(δ - 1)
        widom = exponents.gamma - exponents.beta * (exponents.delta - 1)

        # Fisher: γ = ν(2 - η)
        fisher = exponents.gamma - exponents.nu * (2 - exponents.eta)

        # Josephson: α = 2 - νd (assume d=2)
        d = 2
        josephson = exponents.alpha - (2 - exponents.nu * d)

        # Correlation: ν = γ/(2-η)
        correlation = exponents.nu - exponents.gamma / (2 - exponents.eta)

        return ScalingRelations(
            rushbrooke=rushbrooke,
            widom=widom,
            fisher=fisher,
            josephson=josephson,
            correlation=correlation
        )

    def classify_universality(self,
                               exponents: CriticalExponents) -> str:
        """
        Classify universality class from exponents

        Args:
            exponents: Measured exponents

        Returns:
            Universality class name
        """
        # Compare with known classes
        classes = {
            "Mean Field": UniversalityClass.MEAN_FIELD,
            "2D Ising": UniversalityClass.ISING_2D,
            "3D Ising": UniversalityClass.ISING_3D,
            "2D XY": UniversalityClass.XY_2D,
            "3D Heisenberg": UniversalityClass.HEISENBERG_3D
        }

        best_match = None
        best_error = float('inf')

        for name, class_exponents in classes.items():
            error = (
                abs(exponents.alpha - class_exponents.alpha) +
                abs(exponents.beta - class_exponents.beta) +
                abs(exponents.gamma - class_exponents.gamma) +
                abs(exponents.delta - class_exponents.delta) +
                abs(exponents.nu - class_exponents.nu) +
                abs(exponents.eta - class_exponents.eta)
            )

            if error < best_error:
                best_error = error
                best_match = name

        if best_error < 0.5:
            return best_match
        else:
            return "Unknown"

    def finite_size_scaling_collapse(self,
                                      data_dict: Dict[int, np.ndarray],
                                      T_c: float,
                                      nu: float,
                                      exponent: float) -> Tuple[np.ndarray, np.ndarray]:
        """
        Perform finite-size scaling data collapse

        y(L, t) = L^{-exponent/nu} F(t L^{1/nu})

        Args:
            data_dict: Dictionary {L: y_array}
            T_c: Critical temperature
            nu: Correlation length exponent
            exponent: Observable exponent (β, γ, etc.)

        Returns:
            (scaled_x, scaled_y) arrays for collapse
        """
        scaled_x_all = []
        scaled_y_all = []

        for L, y_array in data_dict.items():
            # Temperature array
            T_array = np.linspace(T_c * 0.8, T_c * 1.2, len(y_array))
            t = (T_array - T_c) / T_c

            # Scale x: t L^{1/ν}
            x_scaled = t * L**(1.0/nu)

            # Scale y: y L^{exponent/ν}
            y_scaled = y_array * L**(exponent/nu)

            scaled_x_all.extend(x_scaled)
            scaled_y_all.extend(y_scaled)

        return np.array(scaled_x_all), np.array(scaled_y_all)


def analyze_critical_phenomena(temperatures: np.ndarray,
                                magnetizations: np.ndarray,
                                susceptibilities: np.ndarray,
                                heat_capacities: np.ndarray,
                                T_c: float,
                                deepseek: Optional[DeepSeekStatMech] = None
                                ) -> Dict[str, Any]:
    """
    Complete critical phenomena analysis

    Args:
        temperatures: Temperature array
        magnetizations: Order parameter array
        susceptibilities: Susceptibility array
        heat_capacities: Heat capacity array
        T_c: Critical temperature
        deepseek: DeepSeek client

    Returns:
        Complete analysis
    """
    analyzer = CriticalPhenomenaAnalyzer(deepseek)

    print("=" * 80)
    print("CRITICAL PHENOMENA ANALYSIS")
    print("=" * 80)

    # Extract critical exponents
    print("\nExtracting critical exponents...")

    alpha, alpha_err = analyzer.extract_alpha(
        temperatures, heat_capacities, T_c
    )
    print(f"α (heat capacity): {alpha:.3f} ± {alpha_err:.3f}")

    beta, beta_err = analyzer.extract_beta(
        temperatures, magnetizations, T_c
    )
    print(f"β (order parameter): {beta:.3f} ± {beta_err:.3f}")

    gamma, gamma_err = analyzer.extract_gamma(
        temperatures, susceptibilities, T_c
    )
    print(f"γ (susceptibility): {gamma:.3f} ± {gamma_err:.3f}")

    # For δ, we need critical isotherm data (skip for now)
    delta = 3.0  # Default guess
    delta_err = 1.0
    print(f"δ (critical isotherm): {delta:.3f} ± {delta_err:.3f} [assumed]")

    # For ν and η, we need correlation data (skip for now)
    nu = 0.6  # Default guess
    nu_err = 0.1
    print(f"ν (correlation length): {nu:.3f} ± {nu_err:.3f} [assumed]")

    eta = 0.0  # Default guess
    eta_err = 0.1
    print(f"η (anomalous dimension): {eta:.3f} ± {eta_err:.3f} [assumed]")

    exponents = CriticalExponents(
        alpha=alpha, beta=beta, gamma=gamma,
        delta=delta, nu=nu, eta=eta
    )

    # Verify scaling relations
    print("\n" + "=" * 80)
    print("SCALING RELATIONS")
    print("=" * 80)

    scaling = analyzer.verify_scaling_relations(exponents)

    print(f"\nRushbrooke (α + 2β + γ = 2): {scaling.rushbrooke:.3f}")
    print(f"Widom (γ = β(δ-1)): {scaling.widom:.3f}")
    print(f"Fisher (γ = ν(2-η)): {scaling.fisher:.3f}")
    print(f"Josephson (α = 2-νd): {scaling.josephson:.3f}")
    print(f"Correlation (ν = γ/(2-η)): {scaling.correlation:.3f}")

    # Check if relations are satisfied
    tolerance = 0.5
    satisfied = [
        abs(scaling.rushbrooke - 2) < tolerance,
        abs(scaling.widom) < tolerance,
        abs(scaling.fisher) < tolerance,
        abs(scaling.josephson) < tolerance,
        abs(scaling.correlation) < tolerance
    ]

    print(f"\nScaling relations satisfied: {sum(satisfied)}/{len(satisfied)}")

    # Classify universality
    print("\n" + "=" * 80)
    print("UNIVERSALITY CLASSIFICATION")
    print("=" * 80)

    universality_class = analyzer.classify_universality(exponents)
    print(f"\nUniversality class: {universality_class}")

    # Get DeepSeek analysis
    print("\n" + "=" * 80)
    print("DEEPSEEK CRITICAL PHENOMENA ANALYSIS")
    print("=" * 80)

    deepseek_result = analyzer.deepseek.derive_fss(
        f"Agent system with exponents: α={alpha:.3f}, β={beta:.3f}, γ={gamma:.3f}. "
        f"Universality class: {universality_class}. "
        f"Analyze finite-size scaling, data collapse, and critical behavior."
    )

    results = {
        "critical_temperature": T_c,
        "critical_exponents": {
            "alpha": (alpha, alpha_err),
            "beta": (beta, beta_err),
            "gamma": (gamma, gamma_err),
            "delta": (delta, delta_err),
            "nu": (nu, nu_err),
            "eta": (eta, eta_err)
        },
        "scaling_relations": {
            "rushbrooke": scaling.rushbrooke,
            "widom": scaling.widom,
            "fisher": scaling.fisher,
            "josephson": scaling.josephson,
            "correlation": scaling.correlation
        },
        "universality_class": universality_class,
        "deepseek_analysis": deepseek_result
    }

    return results


def main():
    """Run critical phenomena analysis"""
    # Generate synthetic data near critical point
    T_c = 2.0
    temperatures = np.linspace(1.0, 3.0, 100)

    # Synthetic magnetization (2D Ising-like)
    t = (temperatures - T_c) / T_c
    magnetizations = np.zeros_like(temperatures)

    for i, temp in enumerate(temperatures):
        if temp < T_c:
            magnetizations[i] = 0.8 * ((T_c - temp) / T_c)**0.125  # β = 1/8
        else:
            magnetizations[i] = 0.01  # Small paramagnetic value

    # Synthetic susceptibility
    susceptibilities = 0.5 / np.abs(t)**1.75  # γ = 7/4

    # Synthetic heat capacity
    heat_capacities = 1.0 - 0.3 * np.log(np.abs(t))  # Log divergence

    # Analyze
    results = analyze_critical_phenomena(
        temperatures, magnetizations, susceptibilities,
        heat_capacities, T_c
    )

    return results


if __name__ == "__main__":
    main()

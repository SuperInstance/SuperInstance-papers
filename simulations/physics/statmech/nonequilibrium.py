"""
Nonequilibrium Statistical Mechanics for Agent Systems

This module analyzes nonequilibrium phenomena in POLLN agent colonies
using master equations, Fokker-Planck dynamics, and linear response theory.

Key concepts:
- Master equation
- Fokker-Planck equation
- Detailed balance
- Nonequilibrium steady states
- Linear response theory
- Fluctuation-dissipation theorem
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import math
from scipy.integrate import odeint, solve_ivp
from scipy.linalg import eig

from .deepseek_statmech import DeepSeekStatMech


@dataclass
class SteadyState:
    """Nonequilibrium steady state"""
    probability: np.ndarray
    entropy_production: float
    probability_current: float


@dataclass
class LinearResponse:
    """Linear response coefficients"""
    response_function: np.ndarray
    relaxation_time: float
    diffusion_constant: float
    mobility: float


class MasterEquation:
    """
    Master equation for probability evolution

    dP(C)/dt = Σ' [W(C'→C)P(C') - W(C→C')P(C)]
    """

    def __init__(self, n_states: int,
                 deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize master equation

        Args:
            n_states: Number of configurations
            deepseek: DeepSeek client
        """
        self.n_states = n_states
        self.deepseek = deepseek or DeepSeekStatMech()

        # Get DeepSeek derivation
        derivation = self.deepseek.derive_master_equation(
            f"Master equation for {n_states} state agent system. "
            "Derive transition rates, steady state, detailed balance, "
            "and entropy production."
        )
        self.derivation = derivation

    def transition_matrix_metropolis(self, energy: np.ndarray,
                                      temperature: float) -> np.ndarray:
        """
        Metropolis transition rates

        W(i→j) = min(1, exp(-β(E_j - E_i)))

        Args:
            energy: Energy of each state
            temperature: Temperature

        Returns:
            Transition matrix W_{ij}
        """
        beta = 1.0 / temperature
        W = np.zeros((self.n_states, self.n_states))

        for i in range(self.n_states):
            for j in range(self.n_states):
                if i != j:
                    dE = energy[j] - energy[i]
                    W[i, j] = min(1.0, np.exp(-beta * dE))

        # Normalize rows (including diagonal)
        for i in range(self.n_states):
            W[i, i] = -np.sum(W[i, :]) + W[i, i]

        return W

    def transition_matrix_glauber(self, energy: np.ndarray,
                                   temperature: float) -> np.ndarray:
        """
        Glauber transition rates

        W(i→j) = 1 / (1 + exp(β(E_j - E_i)))

        Args:
            energy: Energy of each state
            temperature: Temperature

        Returns:
            Transition matrix W_{ij}
        """
        beta = 1.0 / temperature
        W = np.zeros((self.n_states, self.n_states))

        for i in range(self.n_states):
            for j in range(self.n_states):
                if i != j:
                    dE = energy[j] - energy[i]
                    W[i, j] = 1.0 / (1.0 + np.exp(beta * dE))

        # Normalize rows
        for i in range(self.n_states):
            W[i, i] = -np.sum(W[i, :]) + W[i, i]

        return W

    def solve_master_equation(self, W: np.ndarray,
                               initial_prob: np.ndarray,
                               time_points: np.ndarray) -> np.ndarray:
        """
        Solve master equation: dP/dt = W P

        Args:
            W: Transition matrix
            initial_prob: Initial probability distribution
            time_points: Time points

        Returns:
            Probability at each time point
        """
        def master_ode(t, P):
            return W @ P

        solution = solve_ivp(
            master_ode,
            [time_points[0], time_points[-1]],
            initial_prob,
            t_eval=time_points,
            method='RK45'
        )

        return solution.y

    def steady_state(self, W: np.ndarray) -> SteadyState:
        """
        Find steady state: W P_ss = 0

        Args:
            W: Transition matrix

        Returns:
            Steady state
        """
        # Find eigenvector with eigenvalue 0
        eigenvalues, eigenvectors = eig(W.T)

        # Find eigenvalue closest to 0
        idx = np.argmin(np.abs(eigenvalues))

        if abs(eigenvalues[idx]) > 1e-6:
            # No true steady state
            prob = np.ones(self.n_states) / self.n_states
        else:
            # Extract eigenvector
            prob = np.real(eigenvectors[:, idx])
            prob = np.abs(prob) / np.sum(np.abs(prob))

        # Compute entropy production
        # σ = (1/2) Σ_{i,j} (W_{ij}P_i - W_{ji}P_j) ln(W_{ij}P_i / W_{ji}P_j)
        sigma = 0.0
        for i in range(self.n_states):
            for j in range(self.n_states):
                if i != j and prob[i] > 1e-10 and prob[j] > 1e-10:
                    forward = W[i, j] * prob[i]
                    backward = W[j, i] * prob[j]
                    if forward > 1e-10 and backward > 1e-10:
                        ratio = forward / backward
                        sigma += 0.5 * (forward - backward) * np.log(ratio)

        # Probability current (net flux)
        current = 0.0
        for i in range(self.n_states):
            for j in range(i + 1, self.n_states):
                current += abs(W[i, j] * prob[i] - W[j, i] * prob[j])

        return SteadyState(
            probability=prob,
            entropy_production=sigma,
            probability_current=current
        )

    def detailed_balance(self, W: np.ndarray,
                         steady_prob: np.ndarray) -> bool:
        """
        Check detailed balance condition

        W_{ij} P_i^{ss} = W_{ji} P_j^{ss}

        Args:
            W: Transition matrix
            steady_prob: Steady state probability

        Returns:
            True if detailed balance holds
        """
        tolerance = 1e-6

        for i in range(self.n_states):
            for j in range(i + 1, self.n_states):
                forward = W[i, j] * steady_prob[i]
                backward = W[j, i] * steady_prob[j]

                if abs(forward - backward) > tolerance:
                    return False

        return True

    def relaxation_time(self, W: np.ndarray) -> float:
        """
        Compute relaxation time from eigenvalue gap

        τ = -1/λ_1 where λ_1 is largest non-zero eigenvalue

        Args:
            W: Transition matrix

        Returns:
            Relaxation time
        """
        eigenvalues = eig(W)[0]

        # Sort by real part
        eigenvalues = np.sort(np.real(eigenvalues))[::-1]

        # λ_0 = 0 (steady state)
        # λ_1 is next largest
        if len(eigenvalues) > 1:
            lambda_1 = eigenvalues[1]
            if lambda_1 < 0:
                return -1.0 / lambda_1

        return float('inf')


class FokkerPlanckEquation:
    """
    Fokker-Planck equation for continuous systems

    ∂P/∂t = -∂/∂x [μ(x)P] + (1/2)∂²/∂x² [D(x)P]
    """

    def __init__(self, x_min: float, x_max: float, n_points: int = 100,
                 deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize Fokker-Planck solver

        Args:
            x_min: Minimum x value
            x_max: Maximum x value
            n_points: Number of grid points
            deepseek: DeepSeek client
        """
        self.x_min = x_min
        self.x_max = x_max
        self.n_points = n_points
        self.x = np.linspace(x_min, x_max, n_points)
        self.dx = self.x[1] - self.x[0]
        self.deepseek = deepseek or DeepSeekStatMech()

    def drift_coefficient(self, x: float, force: Callable[[float], float]) -> float:
        """
        Drift coefficient μ(x) = F(x)/γ

        Args:
            x: Position
            force: Force function F(x)

        Returns:
            Drift coefficient
        """
        gamma = 1.0  # Friction coefficient
        return force(x) / gamma

    def diffusion_coefficient(self, x: float, temperature: float) -> float:
        """
        Diffusion coefficient D(x) = kT/γ

        Args:
            x: Position
            temperature: Temperature

        Returns:
            Diffusion coefficient
        """
        gamma = 1.0
        return temperature / gamma

    def solve_fp_equation(self, force: Callable[[float], float],
                           temperature: float,
                           initial_P: np.ndarray,
                           time_points: np.ndarray) -> np.ndarray:
        """
        Solve Fokker-Planck equation

        Args:
            force: Force function F(x)
            temperature: Temperature
            initial_P: Initial probability distribution
            time_points: Time points

        Returns:
            Probability distribution at each time
        """
        # Discretize Fokker-Planck equation using finite differences
        # ∂P/∂t = -∂/∂x[μP] + (D/2)∂²P/∂x²

        def fp_ode(t, P):
            dPdt = np.zeros_like(P)

            # Precompute drift and diffusion
            mu = np.array([self.drift_coefficient(xi, force) for xi in self.x])
            D = np.array([self.diffusion_coefficient(xi, temperature) for xi in self.x])

            # Upwind scheme for drift
            for i in range(1, self.n_points - 1):
                # Drift term: -∂(μP)/∂x
                if mu[i] > 0:
                    drift_flux = mu[i] * P[i] - mu[i-1] * P[i-1]
                else:
                    drift_flux = mu[i+1] * P[i+1] - mu[i] * P[i]

                # Diffusion term: (D/2)∂²P/∂x²
                diffusion = D[i] * (P[i+1] - 2*P[i] + P[i-1]) / self.dx**2

                dPdt[i] = -drift_flux / self.dx + diffusion

            # Boundary conditions (reflecting)
            dPdt[0] = 0
            dPdt[-1] = 0

            return dPdt

        solution = solve_ivp(
            fp_ode,
            [time_points[0], time_points[-1]],
            initial_P,
            t_eval=time_points,
            method='RK45'
        )

        return solution.y

    def steady_state_boltzmann(self, force: Callable[[float], float],
                                temperature: float) -> np.ndarray:
        """
        Boltzmann steady state: P_ss(x) ∝ exp(-U(x)/kT)

        Args:
            force: Force function F(x) = -dU/dx
            temperature: Temperature

        Returns:
            Steady state probability
        """
        # Integrate force to get potential
        U = np.zeros_like(self.x)
        for i in range(1, len(self.x)):
            U[i] = U[i-1] - force(self.x[i]) * self.dx

        # Boltzmann distribution
        P = np.exp(-U / temperature)
        P = P / np.sum(P) / self.dx  # Normalize

        return P


class LinearResponseTheory:
    """
    Linear response theory for small perturbations

    Relates fluctuations to response functions.
    """

    def __init__(self, deepseek: Optional[DeepSeekStatMech] = None):
        """Initialize linear response theory"""
        self.deepseek = deepseek or DeepSeekStatMech()

    def response_function(self, correlation: np.ndarray,
                           perturbation: float = 0.01) -> np.ndarray:
        """
        Response function from fluctuation-dissipation theorem

        χ(t) = β dC(t)/dt for t > 0

        where C(t) = ⟨A(0)A(t)⟩

        Args:
            correlation: Correlation function C(t)
            perturbation: Perturbation strength

        Returns:
            Response function
        """
        chi = np.zeros_like(correlation)

        for i in range(1, len(correlation)):
            dC = correlation[i] - correlation[i-1]
            chi[i] = dC / perturbation

        return chi

    def fluctuation_dissipation(self, variance: float,
                                 temperature: float,
                                 response: float) -> float:
        """
        Fluctuation-dissipation theorem

        χ = β⟨δA²⟩

        Args:
            variance: Fluctuation ⟨δA²⟩
            temperature: Temperature
            response: Linear response χ

        Returns:
            Check if FDT holds
        """
        expected_response = variance / temperature
        return abs(response - expected_response) / expected_response

    def kramers_kronig(self, chi_prime: np.ndarray,
                       frequencies: np.ndarray) -> np.ndarray:
        """
        Kramers-Kronig relation for response functions

        χ''(ω) = (2ω/π) P ∫_0^∞ χ'(ω')/(ω'² - ω²) dω'

        Args:
            chi_prime: Real part of response
            frequencies: Frequency array

        Returns:
            Imaginary part of response
        """
        chi_double_prime = np.zeros_like(chi_prime)

        for i, omega in enumerate(frequencies):
            integral = 0.0
            for j, omega_prime in enumerate(frequencies):
                if i != j:
                    integrand = chi_prime[j] / (omega_prime**2 - omega**2)
                    integral += integrand * (frequencies[1] - frequencies[0])

            chi_double_prime[i] = (2 * omega / np.pi) * integral

        return chi_double_prime


def analyze_nonequilibrium_dynamics(n_agents: int = 20,
                                     temperature: float = 2.0,
                                     deepseek: Optional[DeepSeekStatMech] = None
                                     ) -> Dict[str, Any]:
    """
    Complete nonequilibrium analysis

    Args:
        n_agents: Number of agents
        temperature: Temperature
        deepseek: DeepSeek client

    Returns:
        Complete analysis
    """
    deepseek = deepseek or DeepSeekStatMech()

    print("=" * 80)
    print("NONEQUILIBRIUM STATISTICAL MECHANICS")
    print("=" * 80)

    # Master equation
    print("\nMaster Equation Analysis")
    print("-" * 80)

    # Simplified: 4-state system (2 spins)
    n_states = 4
    master = MasterEquation(n_states, deepseek)

    # Energy of each state
    energy = np.array([0.0, 1.0, 1.0, 2.0])

    # Transition matrix
    W = master.transition_matrix_metropolis(energy, temperature)

    # Initial probability (all states equally likely)
    P0 = np.ones(n_states) / n_states

    # Time evolution
    time_points = np.linspace(0, 10, 100)
    P_t = master.solve_master_equation(W, P0, time_points)

    print(f"\nInitial probability: {P0}")
    print(f"Final probability: {P_t[:, -1]}")

    # Steady state
    steady = master.steady_state(W)
    print(f"\nSteady state: {steady.probability}")
    print(f"Entropy production: σ = {steady.entropy_production:.6f}")
    print(f"Probability current: J = {steady.probability_current:.6f}")

    # Check detailed balance
    db = master.detailed_balance(W, steady.probability)
    print(f"Detailed balance: {db}")

    # Relaxation time
    tau = master.relaxation_time(W)
    print(f"Relaxation time: τ = {tau:.3f}")

    # Fokker-Planck
    print("\n" + "=" * 80)
    print("Fokker-Planck Analysis")
    print("-" * 80)

    # Harmonic potential
    def harmonic_force(x):
        return -x  # F = -dU/dx, U = x²/2

    fp = FokkerPlanckEquation(x_min=-3, x_max=3, n_points=100)

    # Initial distribution (Gaussian)
    P0_fp = np.exp(-fp.x**2)
    P0_fp = P0_fp / np.sum(P0_fp) / fp.dx

    # Time evolution
    time_fp = np.linspace(0, 5, 50)
    P_fp = fp.solve_fp_equation(harmonic_force, temperature, P0_fp, time_fp)

    print(f"\nInitial distribution width: {np.sqrt(np.sum(P0_fp * fp.x**2) * fp.dx):.3f}")
    print(f"Final distribution width: {np.sqrt(np.sum(P_fp[:, -1] * fp.x**2) * fp.dx):.3f}")

    # Boltzmann steady state
    P_boltzmann = fp.steady_state_boltzmann(harmonic_force, temperature)
    print(f"Boltzmann width: {np.sqrt(np.sum(P_boltzmann * fp.x**2) * fp.dx):.3f}")

    # Linear response
    print("\n" + "=" * 80)
    print("Linear Response Theory")
    print("-" * 80)

    lr = LinearResponseTheory(deepseek)

    # Simulate correlation function
    t_corr = np.linspace(0, 10, 100)
    correlation = np.exp(-t_corr / tau) * steady.probability[0]**2

    # Response function
    response = lr.response_function(correlation)

    print(f"\nMaximum response: χ_max = {np.max(response):.6f}")
    print(f"Response at t=0: χ(0) = {response[0]:.6f}")

    # Fluctuation-dissipation check
    variance = steady.probability[0] * (1 - steady.probability[0])
    fd_check = lr.fluctuation_dissipation(variance, temperature, response[1])

    print(f"\nFluctuation-dissipation check: {fd_check:.6f} (should be < 0.1)")

    # Get DeepSeek analysis
    print("\n" + "=" * 80)
    print("DEEPSEEK NONEQUILIBRIUM ANALYSIS")
    print("=" * 80)

    deepseek_result = deepseek.derive_master_equation(
        f"Nonequilibrium analysis of {n_agents} agent system at T={temperature:.2f}. "
        f"Relaxation time τ={tau:.3f}, entropy production σ={steady.entropy_production:.6f}. "
        f"Detailed balance: {db}. "
        f"Analyze nonequilibrium steady states, entropy production, and linear response."
    )

    results = {
        "n_agents": n_agents,
        "temperature": temperature,
        "master_equation": {
            "transition_matrix": W.tolist(),
            "steady_state": steady.probability.tolist(),
            "entropy_production": steady.entropy_production,
            "probability_current": steady.probability_current,
            "detailed_balance": db,
            "relaxation_time": tau
        },
        "fokker_planck": {
            "initial_width": np.sqrt(np.sum(P0_fp * fp.x**2) * fp.dx),
            "final_width": np.sqrt(np.sum(P_fp[:, -1] * fp.x**2) * fp.dx),
            "boltzmann_width": np.sqrt(np.sum(P_boltzmann * fp.x**2) * fp.dx)
        },
        "linear_response": {
            "max_response": float(np.max(response)),
            "fd_check": fd_check
        },
        "deepseek_analysis": deepseek_result
    }

    return results


def main():
    """Run nonequilibrium analysis"""
    results = analyze_nonequilibrium_dynamics(
        n_agents=20,
        temperature=2.0
    )

    return results


if __name__ == "__main__":
    main()

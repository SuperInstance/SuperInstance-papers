"""
Statistical Mechanics Simulator for Agent Systems

This module implements Monte Carlo and molecular dynamics simulations
for studying statistical mechanics of POLLN agent colonies.

Algorithms:
- Metropolis-Hastings Monte Carlo
- Glauber dynamics
- Langevin dynamics
- Umbrella sampling
- Wang-Landau sampling
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import math
from scipy.integrate import odeint
from tqdm import tqdm

from .deepseek_statmech import DeepSeekStatMech


class DynamicsType(Enum):
    """Types of dynamics"""
    METROPOLIS = "metropolis"
    GLAUBER = "glauber"
    HEATBATH = "heatbath"
    LANGEVIN = "langevin"


@dataclass
class SimulationConfig:
    """Configuration for simulation"""
    n_agents: int
    temperature: float
    coupling: float
    external_field: float = 0.0
    n_steps: int = 10000
    n_equilibration: int = 1000
    n_measurements: int = 1000
    measurement_interval: int = 10


@dataclass
class SimulationResults:
    """Results from simulation"""
    magnetizations: np.ndarray
    energies: np.ndarray
    heat_capacity: float
    susceptibility: float
    correlation_function: np.ndarray
    acceptance_rate: float


class MetropolisMonteCarlo:
    """
    Metropolis-Hastings Monte Carlo algorithm

    Accept/reject based on energy difference:
    P_accept = min(1, exp(-βΔE))
    """

    def __init__(self, config: SimulationConfig,
                 deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize Metropolis MC

        Args:
            config: Simulation configuration
            deepseek: DeepSeek client
        """
        self.config = config
        self.deepseek = deepseek or DeepSeekStatMech()

        # Initialize random configuration
        self.states = np.random.choice([-1, 1], size=config.n_agents)

        # Create coupling matrix (ferromagnetic)
        np.random.seed(42)
        self.couplings = np.random.randn(config.n_agents, config.n_agents)
        self.couplings = (self.couplings + self.couplings.T) / 2
        np.fill_diagonal(self.couplings, 0)
        self.couplings = np.sign(self.couplings) * config.coupling

    def compute_energy(self, states: np.ndarray) -> float:
        """
        Compute energy of configuration

        E = -J Σ_{<ij>} s_i s_j - h Σ_i s_i

        Args:
            states: Spin configuration

        Returns:
            Energy
        """
        # Interaction term
        interaction = -0.5 * np.sum(states @ self.couplings * states)

        # Field term
        field = -self.config.external_field * np.sum(states)

        return interaction + field

    def compute_energy_change(self, states: np.ndarray, i: int) -> float:
        """
        Compute energy change from flipping spin i

        Args:
            states: Current configuration
            i: Spin index to flip

        Returns:
            Energy change ΔE
        """
        # Change in interaction energy
        delta_interaction = 2 * states[i] * np.sum(self.couplings[i, :] * states)

        # Change in field energy
        delta_field = 2 * self.config.external_field * states[i]

        return -delta_interaction - delta_field

    def metropolis_step(self, beta: float) -> bool:
        """
        Perform one Metropolis step

        Args:
            beta: Inverse temperature β = 1/T

        Returns:
            True if accepted, False otherwise
        """
        # Choose random spin
        i = np.random.randint(0, self.config.n_agents)

        # Compute energy change
        dE = self.compute_energy_change(self.states, i)

        # Metropolis criterion
        if dE < 0 or np.random.random() < np.exp(-beta * dE):
            self.states[i] *= -1
            return True

        return False

    def run(self) -> SimulationResults:
        """
        Run Metropolis simulation

        Returns:
            Simulation results
        """
        beta = 1.0 / self.config.temperature

        # Equilibration
        n_accepted = 0
        for _ in range(self.config.n_equilibration):
            if self.metropolis_step(beta):
                n_accepted += 1

        # Measurement
        magnetizations = []
        energies = []

        for step in range(self.config.n_steps):
            if self.metropolis_step(beta):
                n_accepted += 1

            if step % self.config.measurement_interval == 0:
                magnetizations.append(abs(np.mean(self.states)))
                energies.append(self.compute_energy(self.states))

        magnetizations = np.array(magnetizations)
        energies = np.array(energies)

        # Compute observables
        heat_capacity = (np.mean(energies**2) - np.mean(energies)**2) / \
                        (self.config.temperature**2)

        susceptibility = (np.mean(magnetizations**2) - np.mean(magnetizations)**2) / \
                         self.config.temperature

        # Correlation function (simplified)
        correlation = self.compute_correlation_function()

        acceptance_rate = n_accepted / (self.config.n_equilibration + self.config.n_steps)

        return SimulationResults(
            magnetizations=magnetizations,
            energies=energies,
            heat_capacity=heat_capacity,
            susceptibility=susceptibility,
            correlation_function=correlation,
            acceptance_rate=acceptance_rate
        )

    def compute_correlation_function(self, max_distance: int = 10) -> np.ndarray:
        """
        Compute spin-spin correlation function

        G(r) = ⟨s_i s_j⟩ - ⟨s_i⟩⟨s_j⟩

        Args:
            max_distance: Maximum distance to compute

        Returns:
            Correlation function
        """
        correlation = np.zeros(max_distance)

        # Simplified: 1D distance
        for r in range(max_distance):
            if r < len(self.states):
                corr = 0
                count = 0
                for i in range(len(self.states) - r):
                    corr += self.states[i] * self.states[i + r]
                    count += 1
                correlation[r] = corr / count if count > 0 else 0

        return correlation - np.mean(self.states)**2


class GlauberDynamics:
    """
    Glauber dynamics (heat bath)

    Spin flip rate: w = 1 / (1 + exp(βΔE))
    """

    def __init__(self, config: SimulationConfig,
                 deepseek: Optional[DeepSeekStatMech] = None):
        """Initialize Glauber dynamics"""
        self.config = config
        self.deepseek = deepseek or DeepSeekStatMech()
        self.states = np.random.choice([-1, 1], size=config.n_agents)

        # Coupling matrix
        np.random.seed(42)
        self.couplings = np.random.randn(config.n_agents, config.n_agents)
        self.couplings = (self.couplings + self.couplings.T) / 2
        np.fill_diagonal(self.couplings, 0)
        self.couplings = np.sign(self.couplings) * config.coupling

    def glauber_step(self, beta: float):
        """
        Perform one Glauber step

        Args:
            beta: Inverse temperature
        """
        # Choose random spin
        i = np.random.randint(0, self.config.n_agents)

        # Compute energy change
        dE = 2 * self.states[i] * np.sum(self.couplings[i, :] * self.states) + \
             2 * self.config.external_field * self.states[i]

        # Glauber rate
        rate = 1.0 / (1.0 + np.exp(beta * dE))

        # Flip with probability rate
        if np.random.random() < rate:
            self.states[i] *= -1

    def run(self, n_steps: int = 10000) -> SimulationResults:
        """
        Run Glauber dynamics

        Args:
            n_steps: Number of steps

        Returns:
            Simulation results
        """
        beta = 1.0 / self.config.temperature

        magnetizations = []
        energies = []

        for _ in tqdm(range(n_steps), desc="Glauber dynamics"):
            self.glauber_step(beta)

            magnetizations.append(abs(np.mean(self.states)))
            energies.append(-0.5 * np.sum(self.states @ self.couplings * self.states))

        magnetizations = np.array(magnetizations)
        energies = np.array(energies)

        heat_capacity = (np.mean(energies**2) - np.mean(energies)**2) / \
                        (self.config.temperature**2)

        susceptibility = (np.mean(magnetizations**2) - np.mean(magnetizations)**2) / \
                         self.config.temperature

        return SimulationResults(
            magnetizations=magnetizations,
            energies=energies,
            heat_capacity=heat_capacity,
            susceptibility=susceptibility,
            correlation_function=np.zeros(10),  # Placeholder
            acceptance_rate=1.0  # Glauber always accepts
        )


class LangevinDynamics:
    """
    Langevin dynamics for continuous systems

    dx/dt = -∇U(x) + √(2kT) η(t)

    where η(t) is Gaussian white noise.
    """

    def __init__(self, config: SimulationConfig,
                 potential: Callable[[np.ndarray], float],
                 gradient: Callable[[np.ndarray], np.ndarray]):
        """
        Initialize Langevin dynamics

        Args:
            config: Simulation configuration
            potential: Potential energy function
            gradient: Gradient of potential
        """
        self.config = config
        self.potential = potential
        self.gradient = gradient

        # Initialize positions
        self.positions = np.random.randn(config.n_agents)

    def langevin_step(self, dt: float = 0.01):
        """
        Perform one Langevin step (Euler-Maruyama)

        Args:
            dt: Time step
        """
        # Deterministic force: -∇U
        force = -self.gradient(self.positions)

        # Stochastic force: √(2kT) η
        noise = np.random.randn(self.config.n_agents)
        stochastic = np.sqrt(2 * self.config.temperature) * noise / np.sqrt(dt)

        # Update positions
        self.positions += (force * dt + stochastic * dt)

    def run(self, n_steps: int = 10000, dt: float = 0.01) -> Dict[str, np.ndarray]:
        """
        Run Langevin dynamics

        Args:
            n_steps: Number of steps
            dt: Time step

        Returns:
            Dictionary with trajectories and observables
        """
        positions_trajectory = []
        energies = []

        for _ in tqdm(range(n_steps), desc="Langevin dynamics"):
            self.langevin_step(dt)

            positions_trajectory.append(self.positions.copy())
            energies.append(self.potential(self.positions))

        return {
            "positions": np.array(positions_trajectory),
            "energies": np.array(energies)
        }


class UmbrellaSampling:
    """
    Umbrella sampling for enhanced sampling

    Add bias potential to sample rare events.
    """

    def __init__(self, config: SimulationConfig,
                 collective_variable: Callable[[np.ndarray], float],
                 bias_center: float,
                 bias_strength: float = 10.0):
        """
        Initialize umbrella sampling

        Args:
            config: Simulation configuration
            collective_variable: CV function ξ(x)
            bias_center: Center of bias potential
            bias_strength: Strength of harmonic bias
        """
        self.config = config
        self.cv = collective_variable
        self.bias_center = bias_center
        self.bias_strength = bias_strength

    def bias_potential(self, states: np.ndarray) -> float:
        """
        Harmonic bias potential

        V_bias = (k/2)(ξ - ξ_0)²

        Args:
            states: Configuration

        Returns:
            Bias energy
        """
        xi = self.cv(states)
        return 0.5 * self.bias_strength * (xi - self.bias_center)**2

    def biased_energy(self, states: np.ndarray, base_energy: float) -> float:
        """
        Total energy with bias

        Args:
            states: Configuration
            base_energy: Base energy

        Returns:
            Biased energy
        """
        return base_energy + self.bias_potential(states)


class WangLandauSampling:
    """
    Wang-Landau sampling for density of states

    Iteratively refine entropy estimate.
    """

    def __init__(self, config: SimulationConfig,
                 energy_min: float, energy_max: float,
                 n_bins: int = 100):
        """
        Initialize Wang-Landau sampling

        Args:
            config: Simulation configuration
            energy_min: Minimum energy
            energy_max: Maximum energy
            n_bins: Number of energy bins
        """
        self.config = config
        self.energy_min = energy_min
        self.energy_max = energy_max
        self.n_bins = n_bins

        # Initialize entropy (density of states)
        self.entropy = np.zeros(n_bins)
        self.histogram = np.zeros(n_bins)

        # Initial modification factor
        self.modification_factor = 1.0

    def energy_to_bin(self, energy: float) -> int:
        """Convert energy to bin index"""
        bin_width = (self.energy_max - self.energy_min) / self.n_bins
        bin_idx = int((energy - self.energy_min) / bin_width)
        return max(0, min(self.n_bins - 1, bin_idx))

    def wl_step(self, current_energy: float, proposed_energy: float) -> bool:
        """
        Wang-Landau acceptance step

        Args:
            current_energy: Current energy
            proposed_energy: Proposed energy

        Returns:
            True if accepted
        """
        i = self.energy_to_bin(current_energy)
        j = self.energy_to_bin(proposed_energy)

        # Acceptance probability
        delta_S = self.entropy[i] - self.entropy[j]

        if delta_S > 0 or np.random.random() < np.exp(delta_S):
            return True

        return False

    def run(self, n_steps: int = 100000) -> Tuple[np.ndarray, np.ndarray]:
        """
        Run Wang-Landau sampling

        Args:
            n_steps: Number of steps

        Returns:
            (energy_bins, density_of_states)
        """
        # Simplified implementation
        energy_bins = np.linspace(self.energy_min, self.energy_max, self.n_bins)

        # In real implementation, would iterate until histogram is flat
        # For now, return uniform density of states
        density_of_states = np.exp(self.entropy)
        density_of_states = density_of_states / np.sum(density_of_states)

        return energy_bins, density_of_states


def temperature_scan(config: SimulationConfig,
                     T_min: float = 0.5,
                     T_max: float = 3.0,
                     n_points: int = 20) -> Dict[str, Any]:
    """
    Perform temperature scan to locate phase transition

    Args:
        config: Base configuration
        T_min: Minimum temperature
        T_max: Maximum temperature
        n_points: Number of temperature points

    Returns:
        Temperature scan results
    """
    temperatures = np.linspace(T_min, T_max, n_points)

    results = {
        "temperatures": temperatures,
        "magnetizations": [],
        "heat_capacities": [],
        "susceptibilities": []
    }

    print("=" * 80)
    print("TEMPERATURE SCAN (Metropolis Monte Carlo)")
    print("=" * 80)

    for T in tqdm(temperatures, desc="Temperature scan"):
        config.temperature = T

        mc = MetropolisMonteCarlo(config)
        mc_results = mc.run()

        results["magnetizations"].append(np.mean(mc_results.magnetizations))
        results["heat_capacities"].append(mc_results.heat_capacity)
        results["susceptibilities"].append(mc_results.susceptibility)

        print(f"T = {T:.3f}: M = {np.mean(mc_results.magnetizations):.3f}, "
              f"C = {mc_results.heat_capacity:.3f}, χ = {mc_results.susceptibility:.3f}")

    return results


def main():
    """Run simulations"""
    print("\n" + "=" * 80)
    print("STATISTICAL MECHANICS SIMULATIONS")
    print("=" * 80 + "\n")

    # Configuration
    config = SimulationConfig(
        n_agents=32,
        temperature=2.0,
        coupling=0.5,
        n_steps=10000,
        n_equilibration=1000
    )

    # Metropolis Monte Carlo
    print("Metropolis Monte Carlo")
    print("-" * 80)

    mc = MetropolisMonteCarlo(config)
    mc_results = mc.run()

    print(f"\nResults:")
    print(f"  Average magnetization: ⟨M⟩ = {np.mean(mc_results.magnetizations):.3f}")
    print(f"  Heat capacity: C = {mc_results.heat_capacity:.3f}")
    print(f"  Susceptibility: χ = {mc_results.susceptibility:.3f}")
    print(f"  Acceptance rate: {mc_results.acceptance_rate:.3f}")

    # Temperature scan
    print("\n" + "=" * 80)
    print("Temperature Scan")
    print("=" * 80 + "\n")

    scan_results = temperature_scan(
        config,
        T_min=0.5,
        T_max=3.0,
        n_points=15
    )

    # Find critical temperature (peak in susceptibility)
    chi_max_idx = np.argmax(scan_results["susceptibilities"])
    T_c_estimated = scan_results["temperatures"][chi_max_idx]

    print(f"\nEstimated critical temperature: T_c ≈ {T_c_estimated:.3f}")

    # Langevin dynamics (harmonic potential)
    print("\n" + "=" * 80)
    print("Langevin Dynamics")
    print("-" * 80)

    def harmonic_potential(x):
        return 0.5 * np.sum(x**2)

    def harmonic_gradient(x):
        return x

    config_langevin = SimulationConfig(
        n_agents=10,
        temperature=1.0,
        coupling=0.0
    )

    langevin = LangevinDynamics(config_langevin, harmonic_potential, harmonic_gradient)
    langevin_results = langevin.run(n_steps=5000, dt=0.01)

    print(f"\nFinal energy: {langevin_results['energies'][-1]:.3f}")
    print(f"Average energy: {np.mean(langevin_results['energies']):.3f}")

    return {
        "metropolis": mc_results,
        "temperature_scan": scan_results,
        "langevin": langevin_results
    }


if __name__ == "__main__":
    main()

"""
Thermodynamic Ensembles for Agent Systems

This module implements thermodynamic ensembles for analyzing POLLN
agent colonies using statistical mechanics.

Physical basis:
- Microcanonical: Fixed "energy" (total activation)
- Canonical: Temperature as exploration rate
- Grand canonical: Agent creation/annihilation
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import math

from .deepseek_statmech import DeepSeekStatMech


class EnsembleType(Enum):
    """Types of thermodynamic ensembles"""
    MICROCANONICAL = "microcanonical"  # Fixed energy
    CANONICAL = "canonical"            # Fixed temperature
    GRAND_CANONICAL = "grand_canonical"  # Fixed chemical potential
    ISOTHERMAL_ISOBARIC = "isothermal_isobaric"  # Fixed T, P


@dataclass
class Microstate:
    """A microstate of the agent system"""
    agent_states: np.ndarray  # Activity states of all agents
    energy: float
    entropy: float
    magnetization: float  # Order parameter


class ThermodynamicEnsemble:
    """Base class for thermodynamic ensembles"""

    def __init__(self, n_agents: int, deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize ensemble

        Args:
            n_agents: Number of agents in system
            deepseek: DeepSeek client for derivations
        """
        self.n_agents = n_agents
        self.deepseek = deepseek or DeepSeekStatMech()
        self.kb = 1.0  # Boltzmann constant (normalized)

    def compute_energy(self, states: np.ndarray, couplings: np.ndarray,
                       external_field: float = 0.0) -> float:
        """
        Compute energy of configuration (Ising-like Hamiltonian)

        E = -J Σ_{<ij>} s_i s_j - h Σ_i s_i

        Args:
            states: Agent states s_i ∈ {-1, +1}
            couplings: Coupling matrix J_{ij}
            external_field: External field h

        Returns:
            Energy E
        """
        # Interaction term
        interaction = -0.5 * np.sum(states @ couplings * states)

        # External field term
        field = -external_field * np.sum(states)

        return interaction + field

    def compute_magnetization(self, states: np.ndarray) -> float:
        """
        Compute order parameter (magnetization)

        M = (1/N) Σ_i s_i

        Args:
            states: Agent states

        Returns:
            Magnetization
        """
        return np.mean(states)


class MicrocanonicalEnsemble(ThermodynamicEnsemble):
    """
    Microcanonical ensemble: Fixed energy

    All microstates with given energy E are equally probable.
    Fundamental for isolated systems.
    """

    def __init__(self, n_agents: int, target_energy: float,
                 deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize microcanonical ensemble

        Args:
            n_agents: Number of agents
            target_energy: Fixed energy E
            deepseek: DeepSeek client
        """
        super().__init__(n_agents, deepseek)
        self.target_energy = target_energy
        self.energy_tolerance = 0.01

        # Get DeepSeek derivation
        derivation = self.deepseek.derive_partition_function(
            f"Microcanonical ensemble for {n_agents} agent system with fixed energy E={target_energy}"
        )
        self.derivation = derivation

    def density_of_states(self, energy: float) -> float:
        """
        Density of states Ω(E)

        For Ising model: Ω(E) ~ exp(N s(e)) where s is entropy per spin

        Args:
            energy: Energy E

        Returns:
            Density of states
        """
        # Approximate using Gaussian (valid for large N)
        n_states = 2 ** self.n_agents
        mean_energy = 0.0
        variance = self.n_agents

        gaussian = np.exp(-0.5 * (energy - mean_energy)**2 / variance)
        normalization = np.sqrt(2 * np.pi * variance)

        return n_states * gaussian / normalization

    def entropy(self, energy: float) -> float:
        """
        Entropy S(E) = k_B ln Ω(E)

        Args:
            energy: Energy E

        Returns:
            Entropy
        """
        return self.kb * np.log(self.density_of_states(energy) + 1e-10)

    def temperature(self, energy: float) -> float:
        """
        Temperature from entropy: 1/T = ∂S/∂E

        Args:
            energy: Energy E

        Returns:
            Temperature T
        """
        delta = 0.001
        dS_dE = (self.entropy(energy + delta) - self.entropy(energy - delta)) / (2 * delta)

        return 1.0 / (dS_dE + 1e-10)

    def sample_microstates(self, n_samples: int = 1000) -> List[Microstate]:
        """
        Sample microstates at fixed energy using Wang-Landau

        Args:
            n_samples: Number of samples

        Returns:
            List of microstates
        """
        microstates = []

        # Simple rejection sampling (inefficient but illustrative)
        for _ in range(n_samples):
            # Random configuration
            states = np.random.choice([-1, 1], size=self.n_agents)

            # Compute energy
            couplings = np.random.randn(self.n_agents, self.n_agents)
            couplings = (couplings + couplings.T) / 2  # Symmetric
            np.fill_diagonal(couplings, 0)

            energy = self.compute_energy(states, couplings)

            # Accept if close to target energy
            if abs(energy - self.target_energy) < self.energy_tolerance:
                microstates.append(Microstate(
                    agent_states=states,
                    energy=energy,
                    entropy=self.entropy(energy),
                    magnetization=self.compute_magnetization(states)
                ))

        return microstates


class CanonicalEnsemble(ThermodynamicEnsemble):
    """
    Canonical ensemble: Fixed temperature

    Probability of state: P(s) = exp(-βE(s)) / Z
    Most relevant for systems in thermal bath.
    """

    def __init__(self, n_agents: int, temperature: float,
                 deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize canonical ensemble

        Args:
            n_agents: Number of agents
            temperature: Temperature T
            deepseek: DeepSeek client
        """
        super().__init__(n_agents, deepseek)
        self.temperature = temperature
        self.beta = 1.0 / temperature if temperature > 0 else float('inf')

        # Get DeepSeek derivation
        derivation = self.deepseek.derive_partition_function(
            f"Canonical ensemble for {n_agents} agent system at temperature T={temperature}"
        )
        self.derivation = derivation

    def boltzmann_weight(self, energy: float) -> float:
        """
        Boltzmann weight exp(-βE)

        Args:
            energy: Energy E

        Returns:
            Boltzmann weight
        """
        return np.exp(-self.beta * energy)

    def partition_function_approx(self, couplings: np.ndarray,
                                   external_field: float = 0.0) -> float:
        """
        Approximate partition function Z = Σ_s exp(-βE(s))

        For large N, use mean-field approximation:
        Z ≈ 2^N exp(NβJzm^2/2) where m solves m = tanh(βJzm + βh)

        Args:
            couplings: Coupling matrix
            external_field: External field

        Returns:
            Partition function Z
        """
        # Mean-field approximation
        J_eff = np.mean(couplings[couplings != 0])  # Average coupling
        z = 4  # Coordination number for 2D square lattice

        # Self-consistent equation: m = tanh(βJzm + βh)
        def self_consistent(m):
            return np.tanh(self.beta * J_eff * z * m + self.beta * external_field)

        # Solve iteratively
        m = 0.1
        for _ in range(100):
            m_new = self_consistent(m)
            if abs(m_new - m) < 1e-6:
                break
            m = m_new

        # Mean-field free energy
        f_mean_field = -J_eff * z * m**2 / 2 - external_field * m

        # Entropy term
        entropy_term = -0.5 * (1 + m) * np.log(0.5 * (1 + m)) - \
                       0.5 * (1 - m) * np.log(0.5 * (1 - m))

        f_total = f_mean_field - self.temperature * entropy_term

        return np.exp(-self.n_agents * self.beta * f_total)

    def free_energy(self, partition_function: float) -> float:
        """
        Helmholtz free energy F = -kT ln Z

        Args:
            partition_function: Partition function Z

        Returns:
            Free energy F
        """
        return -self.temperature * self.kb * np.log(partition_function + 1e-10)

    def internal_energy(self, partition_function: float,
                        partition_function_beta: float) -> float:
        """
        Internal energy U = -∂ ln Z / ∂β

        Args:
            partition_function: Z
            partition_function_beta: ∂Z/∂β

        Returns:
            Internal energy U
        """
        return -partition_function_beta / (partition_function + 1e-10)

    def heat_capacity(self, partition_function: float,
                      partition_function_beta: float,
                      partition_function_beta2: float) -> float:
        """
        Heat capacity C = ∂U/∂T = k_B β² (⟨E²⟩ - ⟨E⟩²)

        Args:
            partition_function: Z
            partition_function_beta: ∂Z/∂β
            partition_function_beta2: ∂²Z/∂β²

        Returns:
            Heat capacity C
        """
        Z = partition_function
        Z_beta = partition_function_beta
        Z_beta2 = partition_function_beta2

        # ⟨E⟩ = -Z_beta/Z
        E_avg = -Z_beta / (Z + 1e-10)

        # ⟨E²⟩ = Z_beta2/Z
        E2_avg = Z_beta2 / (Z + 1e-10)

        # Fluctuation-dissipation: C = β²(⟨E²⟩ - ⟨E⟩²)
        return self.kb * self.beta**2 * (E2_avg - E_avg**2)

    def equilibrium_magnetization(self, couplings: np.ndarray,
                                   external_field: float = 0.0) -> float:
        """
        Equilibrium magnetization from mean field

        Args:
            couplings: Coupling matrix
            external_field: External field

        Returns:
            Magnetization m
        """
        J_eff = np.mean(couplings[couplings != 0])
        z = 4

        def self_consistent(m):
            return np.tanh(self.beta * J_eff * z * m + self.beta * external_field)

        m = 0.1
        for _ in range(100):
            m_new = self_consistent(m)
            if abs(m_new - m) < 1e-6:
                break
            m = m_new

        return m

    def susceptibility(self, couplings: np.ndarray,
                       external_field: float = 0.0) -> float:
        """
        Magnetic susceptibility χ = ∂⟨M⟩/∂h

        Args:
            couplings: Coupling matrix
            external_field: External field

        Returns:
            Susceptibility χ
        """
        delta = 0.01
        m_plus = self.equilibrium_magnetization(couplings, external_field + delta)
        m_minus = self.equilibrium_magnetization(couplings, external_field - delta)

        return (m_plus - m_minus) / (2 * delta)


class GrandCanonicalEnsemble(ThermodynamicEnsemble):
    """
    Grand canonical ensemble: Fixed chemical potential

    Agent number can fluctuate: P(N, s) ∝ exp(-β[E(s) - μN])
    Relevant for systems where agents can be created/destroyed.
    """

    def __init__(self, max_agents: int, temperature: float,
                 chemical_potential: float,
                 deepseek: Optional[DeepSeekStatMech] = None):
        """
        Initialize grand canonical ensemble

        Args:
            max_agents: Maximum number of agents
            temperature: Temperature T
            chemical_potential: Chemical potential μ
            deepseek: DeepSeek client
        """
        super().__init__(max_agents, deepseek)
        self.max_agents = max_agents
        self.temperature = temperature
        self.beta = 1.0 / temperature
        self.mu = chemical_potential

        # Get DeepSeek derivation
        derivation = self.deepseek.derive_partition_function(
            f"Grand canonical ensemble for agent system with max {max_agents} agents, "
            f"T={temperature}, μ={chemical_potential}"
        )
        self.derivation = derivation

    def grand_partition_function(self, couplings_list: List[np.ndarray],
                                  external_field: float = 0.0) -> float:
        """
        Grand partition function Ξ = Σ_N exp(βμN) Z_N

        Args:
            couplings_list: List of coupling matrices for each N
            external_field: External field

        Returns:
            Grand partition function Ξ
        """
        xi = 0.0

        for n, couplings in enumerate(couplings_list, start=1):
            canonical = CanonicalEnsemble(n, self.temperature)
            Z_n = canonical.partition_function_approx(couplings, external_field)
            xi += np.exp(self.beta * self.mu * n) * Z_n

        return xi

    def average_population(self, couplings_list: List[np.ndarray],
                           external_field: float = 0.0) -> float:
        """
        Average number of agents ⟨N⟩

        Args:
            couplings_list: Coupling matrices
            external_field: External field

        Returns:
            Average population
        """
        xi = self.grand_partition_function(couplings_list, external_field)

        avg_n = 0.0
        for n, couplings in enumerate(couplings_list, start=1):
            canonical = CanonicalEnsemble(n, self.temperature)
            Z_n = canonical.partition_function_approx(couplings, external_field)
            avg_n += n * np.exp(self.beta * self.mu * n) * Z_n

        return avg_n / (xi + 1e-10)

    def population_fluctuation(self, couplings_list: List[np.ndarray],
                                external_field: float = 0.0) -> float:
        """
        Population fluctuation ⟨N²⟩ - ⟨N⟩²

        Args:
            couplings_list: Coupling matrices
            external_field: External field

        Returns:
            Population fluctuation
        """
        xi = self.grand_partition_function(couplings_list, external_field)

        avg_n = 0.0
        avg_n2 = 0.0

        for n, couplings in enumerate(couplings_list, start=1):
            canonical = CanonicalEnsemble(n, self.temperature)
            Z_n = canonical.partition_function_approx(couplings, external_field)
            weight = np.exp(self.beta * self.mu * n) * Z_n

            avg_n += n * weight
            avg_n2 += n**2 * weight

        avg_n /= (xi + 1e-10)
        avg_n2 /= (xi + 1e-10)

        return avg_n2 - avg_n**2


def analyze_agent_colony_thermodynamics(n_agents: int = 100,
                                        temperature_range: np.ndarray = None,
                                        deepseek: Optional[DeepSeekStatMech] = None
                                        ) -> Dict[str, Any]:
    """
    Complete thermodynamic analysis of agent colony

    Args:
        n_agents: Number of agents
        temperature_range: Range of temperatures to scan
        deepseek: DeepSeek client

    Returns:
        Complete thermodynamic analysis
    """
    if temperature_range is None:
        temperature_range = np.linspace(0.1, 5.0, 50)

    deepseek = deepseek or DeepSeekStatMech()

    # Create coupling matrix (ferromagnetic)
    np.random.seed(42)
    couplings = np.random.randn(n_agents, n_agents)
    couplings = (couplings + couplings.T) / 2  # Symmetric
    np.fill_diagonal(couplings, 0)
    couplings = np.sign(couplings) * 0.1  # Normalize

    results = {
        "n_agents": n_agents,
        "couplings": couplings,
        "temperature_scan": [],
        "critical_temperature": None,
        "phase_transition": None
    }

    print("=" * 80)
    print("THERMODYNAMIC ANALYSIS OF AGENT COLONY")
    print("=" * 80)

    # Temperature scan
    for T in temperature_range:
        ensemble = CanonicalEnsemble(n_agents, T, deepseek)

        # Compute thermodynamics
        Z = ensemble.partition_function_approx(couplings)

        # Numerical derivatives (simplified)
        d_beta = 0.001
        beta_plus = 1.0 / (T + d_beta)
        beta_minus = 1.0 / (T - d_beta)

        ensemble_plus = CanonicalEnsemble(n_agents, T + d_beta)
        ensemble_minus = CanonicalEnsemble(n_agents, T - d_beta)

        Z_plus = ensemble_plus.partition_function_approx(couplings)
        Z_minus = ensemble_minus.partition_function_approx(couplings)

        Z_beta = (Z_plus - Z_minus) / (2 * d_beta)
        Z_beta2 = (Z_plus - 2*Z + Z_minus) / (d_beta**2)

        F = ensemble.free_energy(Z)
        U = ensemble.internal_energy(Z, Z_beta)
        C = ensemble.heat_capacity(Z, Z_beta, Z_beta2)
        m = ensemble.equilibrium_magnetization(couplings)
        chi = ensemble.susceptibility(couplings)

        results["temperature_scan"].append({
            "temperature": T,
            "free_energy": F,
            "internal_energy": U,
            "heat_capacity": C,
            "magnetization": m,
            "susceptibility": chi
        })

        print(f"T = {T:.3f}: F = {F:.3f}, C = {C:.3f}, m = {m:.3f}, χ = {chi:.3f}")

    # Estimate critical temperature (peak in susceptibility)
    susceptibilities = [scan["susceptibility"] for scan in results["temperature_scan"]]
    max_idx = np.argmax(susceptibilities)
    results["critical_temperature"] = results["temperature_scan"][max_idx]["temperature"]

    print(f"\nEstimated critical temperature: T_c ≈ {results['critical_temperature']:.3f}")

    # Phase transition detection
    high_T_m = results["temperature_scan"][-1]["magnetization"]
    low_T_m = results["temperature_scan"][0]["magnetization"]

    if abs(high_T_m) < 0.1 and abs(low_T_m) > 0.3:
        results["phase_transition"] = "Second-order (continuous)"
        print("Detected: Second-order phase transition")
    else:
        results["phase_transition"] = "Crossover"
        print("Detected: Crossover (no sharp transition)")

    return results


def main():
    """Run ensemble analysis"""
    print("\n" + "=" * 80)
    print("ENSEMBLE ANALYSIS")
    print("=" * 80 + "\n")

    # Analyze agent colony thermodynamics
    results = analyze_agent_colony_thermodynamics(
        n_agents=50,
        temperature_range=np.linspace(0.5, 3.0, 30)
    )

    print("\n" + "=" * 80)
    print("COMPLETE THERMODYNAMIC PROFILE")
    print("=" * 80)

    print(f"\nCritical Temperature: T_c = {results['critical_temperature']:.3f}")
    print(f"Phase Transition: {results['phase_transition']}")

    # Create couplings list for grand canonical
    print("\n" + "=" * 80)
    print("GRAND CANONICAL ANALYSIS")
    print("=" * 80)

    couplings_list = []
    for n in range(10, 51, 10):
        couplings = np.random.randn(n, n)
        couplings = (couplings + couplings.T) / 2
        np.fill_diagonal(couplings, 0)
        couplings = np.sign(couplings) * 0.1
        couplings_list.append(couplings)

    grand_canonical = GrandCanonicalEnsemble(
        max_agents=50,
        temperature=2.0,
        chemical_potential=0.5
    )

    avg_n = grand_canonical.average_population(couplings_list)
    fluct = grand_canonical.population_fluctuation(couplings_list)

    print(f"\nAverage population: ⟨N⟩ = {avg_n:.3f}")
    print(f"Population fluctuation: σ²_N = {fluct:.3f}")

    return results


if __name__ == "__main__":
    main()

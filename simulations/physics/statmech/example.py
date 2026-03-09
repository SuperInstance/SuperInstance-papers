"""
Example: Quick Statistical Mechanics Analysis

This script demonstrates basic usage of the stat mech modules.
"""

import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

# Import stat mech modules
import sys
sys.path.insert(0, str(Path(__file__).parent))

from deepseek_statmech import DeepSeekStatMech
from ensembles import CanonicalEnsemble
from phase_transitions import PhaseTransitionAnalyzer
from critical_phenomena import CriticalPhenomenaAnalyzer


def quick_analysis():
    """Run quick stat mech analysis"""

    print("\n" + "=" * 80)
    print("QUICK STATISTICAL MECHANICS ANALYSIS")
    print("=" * 80 + "\n")

    # Parameters
    n_agents = 32
    coupling = 0.5
    temperatures = np.linspace(0.5, 3.0, 25)

    print(f"System: N = {n_agents} agents, J = {coupling}")
    print(f"Temperature range: {temperatures[0]:.2f} to {temperatures[-1]:.2f}\n")

    # Create coupling matrix
    np.random.seed(42)
    couplings = np.random.randn(n_agents, n_agents)
    couplings = (couplings + couplings.T) / 2
    np.fill_diagonal(couplings, 0)
    couplings = np.sign(couplings) * coupling

    # Scan temperatures
    magnetizations = []
    susceptibilities = []

    print("Scanning temperatures...")
    for T in temperatures:
        ensemble = CanonicalEnsemble(n_agents, T)
        m = ensemble.equilibrium_magnetization(couplings)
        chi = ensemble.susceptibility(couplings)

        magnetizations.append(abs(m))
        susceptibilities.append(chi)

        if T in [1.0, 1.5, 2.0, 2.5]:
            print(f"  T = {T:.2f}: M = {abs(m):.3f}, χ = {chi:.3f}")

    magnetizations = np.array(magnetizations)
    susceptibilities = np.array(susceptibilities)

    # Find critical temperature
    T_c_estimate = temperatures[np.argmax(susceptibilities)]

    print(f"\nEstimated critical temperature: T_c = {T_c_estimate:.3f}")

    # Phase transition classification
    analyzer = PhaseTransitionAnalyzer(n_agents)
    transition_type = analyzer.classify_transition(
        magnetizations, temperatures, T_c_estimate
    )

    print(f"Transition type: {transition_type.value}\n")

    # Plot results
    fig, axes = plt.subplots(2, 1, figsize=(10, 8))

    # Magnetization
    axes[0].plot(temperatures, magnetizations, 'o-', label='Magnetization')
    axes[0].axvline(T_c_estimate, color='r', linestyle='--', label=f'T_c = {T_c_estimate:.2f}')
    axes[0].set_xlabel('Temperature (T)')
    axes[0].set_ylabel('Order Parameter M')
    axes[0].set_title('Phase Transition in POLLN Agent Colony')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    # Susceptibility
    axes[1].plot(temperatures, susceptibilities, 's-', color='orange', label='Susceptibility')
    axes[1].axvline(T_c_estimate, color='r', linestyle='--', label=f'T_c = {T_c_estimate:.2f}')
    axes[1].set_xlabel('Temperature (T)')
    axes[1].set_ylabel('Susceptibility χ')
    axes[1].set_title('Critical Behavior')
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    plt.tight_layout()

    # Save figure
    output_file = Path(__file__).parent / "results" / "quick_analysis.png"
    plt.savefig(output_file, dpi=150)
    print(f"Figure saved to: {output_file}")

    # Print summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"\nSystem: {n_agents} agents")
    print(f"Coupling: J = {coupling}")
    print(f"Critical temperature: T_c = {T_c_estimate:.3f}")
    print(f"Transition type: {transition_type.value}")
    print(f"\nMax magnetization: {np.max(magnetizations):.3f}")
    print(f"Max susceptibility: {np.max(susceptibilities):.3f}")
    print(f"\nInterpretation:")
    print(f"  T < {T_c_estimate:.2f}: Ordered phase (consensus)")
    print(f"  T > {T_c_estimate:.2f}: Disordered phase (no consensus)")

    return {
        "temperatures": temperatures,
        "magnetizations": magnetizations,
        "susceptibilities": susceptibilities,
        "T_c": T_c_estimate,
        "transition_type": transition_type.value
    }


def critical_exponents_example():
    """Example: Extract critical exponents"""

    print("\n" + "=" * 80)
    print("CRITICAL EXPONENTS ANALYSIS")
    print("=" * 80 + "\n")

    # Generate synthetic data near critical point
    T_c = 2.0
    temperatures = np.linspace(1.0, 3.0, 100)
    t = (temperatures - T_c) / T_c

    # 2D Ising-like behavior
    magnetizations = np.zeros_like(temperatures)
    for i, T in enumerate(temperatures):
        if T < T_c:
            magnetizations[i] = 0.8 * ((T_c - T) / T_c)**0.125  # β = 1/8
        else:
            magnetizations[i] = 0.01

    susceptibilities = 0.5 / np.abs(t)**1.75  # γ = 7/4
    heat_capacities = -0.3 * np.log(np.abs(t))  # Log divergence

    # Analyze
    analyzer = CriticalPhenomenaAnalyzer()

    print("Extracting critical exponents...")

    beta, beta_err = analyzer.extract_beta(temperatures, magnetizations, T_c)
    print(f"β = {beta:.3f} ± {beta_err:.3f} (theory: 0.125)")

    gamma, gamma_err = analyzer.extract_gamma(temperatures, susceptibilities, T_c)
    print(f"γ = {gamma:.3f} ± {gamma_err:.3f} (theory: 1.75)")

    # Classify universality
    exponents = analyzer.extract_alpha(temperatures, heat_capacities, T_c)[0]
    universality = analyzer.classify_universality(
        type('obj', (object,), {'alpha': exponents, 'beta': beta, 'gamma': gamma,
                                 'delta': 15.0, 'nu': 1.0, 'eta': 0.25})()
    )

    print(f"\nUniversality class: {universality}")


def deepseek_example():
    """Example: Use DeepSeek for derivations"""

    print("\n" + "=" * 80)
    print("DEEPSEEK STATISTICAL MECHANICS DERIVATIONS")
    print("=" * 80 + "\n")

    # Note: This requires actual API key
    print("Note: Set DEEPSEEK_API_KEY environment variable to run this example.\n")

    import os

    api_key = os.getenv("DEEPSEEK_API_KEY", "YOUR_API_KEY")

    if api_key == "YOUR_API_KEY":
        print("Using default test API key.")
        print("Replace with your actual key for production use.\n")

    ds = DeepSeekStatMech(api_key=api_key)

    # Get partition function derivation
    print("Deriving partition function...")
    result = ds.derive_partition_function(
        "32-agent POLLN colony with ferromagnetic coupling"
    )

    print(f"\nStatus: {'Success' if result else 'Failed'}")
    if result:
        print(f"Derivation length: {len(result['derivation'])} characters")
        print(f"\nFirst 500 characters:")
        print(result['derivation'][:500])
        print("...\n[Full derivation available in results]")


if __name__ == "__main__":
    # Run examples
    print("\n" + "=" * 80)
    print("STATISTICAL MECHANICS EXAMPLES")
    print("=" * 80)

    # Example 1: Quick analysis
    results = quick_analysis()

    # Example 2: Critical exponents
    # critical_exponents_example()

    # Example 3: DeepSeek (uncomment to use)
    # deepseek_example()

    print("\n" + "=" * 80)
    print("EXAMPLES COMPLETE")
    print("=" * 80)
    print("\nNext steps:")
    print("1. Run 'python run_all.py' for complete analysis")
    print("2. Run 'python test_statmech.py' for tests")
    print("3. See README.md for full documentation")

"""
POLLN Emergent Behavior Simulation - Main Runner

Executes comprehensive simulation suite to discover emergent behaviors,
phase transitions, and scaling laws in POLLN agent colonies.

Usage:
    python run_all.py                    # Run all experiments (comprehensive)
    python run_all.py --experiment scaling    # Run only scaling experiments
    python run_all.py --experiment phases     # Run only phase transition experiments
    python run_all.py --experiment stress     # Run only stress tests
    python run_all.py --quick             # Quick run with reduced parameters

Author: POLLN Research Team
Date: 2026-03-08
"""

import argparse
import sys
from pathlib import Path

# Import experiment modules
from scaling_experiments import ScalingExperiment, run_all_scaling_experiments
from phase_transitions import PhaseTransitionExperiment, run_all_phase_experiments
from stress_tests import StressTestExperiment, run_all_stress_tests


def run_comprehensive_suite():
    """
    Run complete simulation suite

    This includes:
    1. Scaling experiments (performance, communication, diversity)
    2. Phase transition analysis
    3. Stress testing (adversarial, Byzantine, cascading, resources)
    """
    print("\n" + "=" * 70)
    print(" "*15 + "POLLN EMERGENT BEHAVIOR SIMULATION")
    print("=" * 70)
    print("\nRunning comprehensive simulation suite...")
    print("This will take 30-60 minutes depending on your hardware.\n")

    # Create output directory
    output_dir = Path("results")
    output_dir.mkdir(exist_ok=True)

    # Track all results
    all_results = {}

    # ============================================================================
    # PART 1: SCALING EXPERIMENTS
    # ============================================================================
    print("\n" + "=" * 70)
    print("PART 1: SCALING LAW EXPERIMENTS")
    print("=" * 70)

    scaling_experiment = ScalingExperiment(output_dir="results/scaling")

    try:
        print("\n[1/3] Performance Scaling Experiment...")
        scaling_results = scaling_experiment.run_performance_scaling(
            colony_sizes=[10, 20, 30, 50, 75, 100, 150, 200],
            trials_per_size=5,
            num_steps=500
        )
        all_results['performance_scaling'] = scaling_results

        print("\n[2/3] Communication Overhead Experiment...")
        overhead_results = scaling_experiment.run_communication_overhead(
            colony_sizes=[10, 20, 30, 50, 75, 100, 150, 200],
            trials_per_size=3,
            num_steps=200
        )
        all_results['communication_overhead'] = overhead_results

        print("\n[3/3] Diversity Impact Experiment...")
        diversity_results = scaling_experiment.run_diversity_impact(
            colony_size=100,
            trials_per_level=5,
            num_steps=500
        )
        all_results['diversity_impact'] = diversity_results

        print("\n✓ Scaling experiments completed")

    except Exception as e:
        print(f"\n✗ Scaling experiments failed: {e}")
        import traceback
        traceback.print_exc()

    # ============================================================================
    # PART 2: PHASE TRANSITION EXPERIMENTS
    # ============================================================================
    print("\n" + "=" * 70)
    print("PART 2: PHASE TRANSITION ANALYSIS")
    print("=" * 70)

    phase_experiment = PhaseTransitionExperiment(output_dir="results/phases")

    try:
        print("\n[1/2] Phase Detection Experiment...")
        phase_results = phase_experiment.detect_phases(
            size_range=list(range(10, 151, 10)),
            trials_per_size=5,
            num_steps=500
        )
        all_results['phase_transitions'] = phase_results

        print("\n[2/2] Critical Slowing Down Experiment...")
        slowing_results = phase_experiment.analyze_critical_slowing_down(
            colony_size=50,
            perturbation_magnitudes=[0.1, 0.2, 0.3, 0.5, 0.7],
            num_steps=300
        )
        all_results['critical_slowing_down'] = slowing_results

        print("\n✓ Phase transition experiments completed")

    except Exception as e:
        print(f"\n✗ Phase transition experiments failed: {e}")
        import traceback
        traceback.print_exc()

    # ============================================================================
    # PART 3: STRESS TESTING
    # ============================================================================
    print("\n" + "=" * 70)
    print("PART 3: STRESS TESTING AND ROBUSTNESS")
    print("=" * 70)

    stress_experiment = StressTestExperiment(output_dir="results/stress")

    try:
        print("\n[1/4] Adversarial Input Test...")
        adversarial_results = stress_experiment.adversarial_input_test(
            colony_size=100,
            noise_levels=[0.0, 0.1, 0.2, 0.3, 0.5, 0.7],
            trials_per_level=5,
            num_steps=300
        )
        all_results['adversarial_input'] = adversarial_results

        print("\n[2/4] Byzantine Agent Test...")
        byzantine_results = stress_experiment.byzantine_agent_test(
            colony_size=100,
            byzantine_fractions=[0.0, 0.05, 0.1, 0.2, 0.3],
            trials_per_fraction=5,
            num_steps=300
        )
        all_results['byzantine_agents'] = byzantine_results

        print("\n[3/4] Cascading Failure Test...")
        cascade_results = stress_experiment.cascading_failure_test(
            colony_size=100,
            removal_strategies=['random', 'hubs', 'high_value'],
            trials_per_strategy=5,
            num_steps=300
        )
        all_results['cascading_failures'] = cascade_results

        print("\n[4/4] Resource Constraint Test...")
        resource_results = stress_experiment.resource_constraint_test(
            colony_size=100,
            budget_levels=[1.0, 0.5, 0.25, 0.1],
            trials_per_level=5,
            num_steps=300
        )
        all_results['resource_constraints'] = resource_results

        print("\n✓ Stress testing completed")

    except Exception as e:
        print(f"\n✗ Stress testing failed: {e}")
        import traceback
        traceback.print_exc()

    # ============================================================================
    # SUMMARY
    # ============================================================================
    print("\n" + "=" * 70)
    print("SIMULATION SUMMARY")
    print("=" * 70)

    print(f"\nResults saved to: {output_dir.absolute()}")
    print("\nKey findings:")

    # Scaling law
    if 'performance_scaling' in all_results:
        scaling = all_results['performance_scaling']['scaling_fit']
        print(f"\n• Performance Scaling Law:")
        print(f"  {scaling['formula']}")
        print(f"  R² = {scaling['r_squared']:.4f}")

    # Phase transitions
    if 'phase_transitions' in all_results:
        boundaries = all_results['phase_transitions']['transitions']['estimated_phase_boundaries']
        print(f"\n• Phase Transition Boundaries:")
        print(f"  Solitary → Swarm: N ≈ {boundaries[0]}")
        print(f"  Swarm → Superorganism: N ≈ {boundaries[1]}")

    # Robustness
    if 'adversarial_input' in all_results:
        robustness = all_results['adversarial_input']['robustness_metric']
        print(f"\n• Adversarial Robustness: {robustness:.3f}")

    if 'byzantine_agents' in all_results:
        tolerance = all_results['byzantine_agents']['critical_fraction']['tolerance']
        print(f"• Byzantine Tolerance: {tolerance:.1%}")

    print("\n" + "=" * 70)
    print("SIMULATION SUITE COMPLETED SUCCESSFULLY")
    print("=" * 70)

    return all_results


def run_scaling_only():
    """Run only scaling experiments"""
    print("\nRunning scaling experiments only...")
    run_all_scaling_experiments()


def run_phases_only():
    """Run only phase transition experiments"""
    print("\nRunning phase transition experiments only...")
    run_all_phase_experiments()


def run_stress_only():
    """Run only stress test experiments"""
    print("\nRunning stress tests only...")
    run_all_stress_tests()


def run_quick_tests():
    """Run quick version of all experiments (for testing)"""
    print("\n" + "=" * 70)
    print("POLLN SIMULATION - QUICK RUN")
    print("=" * 70)
    print("\nRunning quick tests with reduced parameters...\n")

    # Quick scaling test
    scaling_experiment = ScalingExperiment(output_dir="results/scaling")

    scaling_experiment.run_performance_scaling(
        colony_sizes=[10, 30, 50, 100],
        trials_per_size=2,
        num_steps=100
    )

    # Quick phase test
    phase_experiment = PhaseTransitionExperiment(output_dir="results/phases")

    phase_experiment.detect_phases(
        size_range=[10, 30, 50, 70, 100],
        trials_per_size=2,
        num_steps=100
    )

    # Quick stress test
    stress_experiment = StressTestExperiment(output_dir="results/stress")

    stress_experiment.adversarial_input_test(
        colony_size=50,
        noise_levels=[0.0, 0.3, 0.7],
        trials_per_level=2,
        num_steps=100
    )

    print("\n" + "=" * 70)
    print("QUICK TESTS COMPLETED")
    print("=" * 70)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='POLLN Emergent Behavior Simulation Suite',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_all.py                    # Run all experiments (comprehensive)
  python run_all.py --experiment scaling    # Run only scaling experiments
  python run_all.py --experiment phases     # Run only phase transition experiments
  python run_all.py --experiment stress     # Run only stress tests
  python run_all.py --quick             # Quick run with reduced parameters

Output:
  Results are saved to the 'results/' directory
  Plots are generated as PNG files
  Data is saved as JSON files
        """
    )

    parser.add_argument(
        '--experiment',
        choices=['scaling', 'phases', 'stress'],
        help='Run specific experiment only'
    )

    parser.add_argument(
        '--quick',
        action='store_true',
        help='Run quick tests with reduced parameters'
    )

    args = parser.parse_args()

    if args.quick:
        run_quick_tests()

    elif args.experiment == 'scaling':
        run_scaling_only()

    elif args.experiment == 'phases':
        run_phases_only()

    elif args.experiment == 'stress':
        run_stress_only()

    else:
        run_comprehensive_suite()


if __name__ == "__main__":
    main()

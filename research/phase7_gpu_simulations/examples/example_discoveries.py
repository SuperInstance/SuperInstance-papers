"""
Example Usage of Large-Scale Discovery Framework

This file demonstrates how to use the discovery framework to make
novel scientific discoveries through massive-scale simulations.

Author: SuperInstance Research Team
Date: 2026-03-13
"""

import asyncio
import numpy as np
import networkx as nx
from typing import Dict, List

# Import discovery framework
import sys
sys.path.append('C:/Users/casey/polln')

from research.phase7_gpu_simulations.core.large_scale_discovery import (
    LargeScaleDiscoveryEngine,
    DiscoveryType
)
from research.phase7_gpu_simulations.validation.discovery_validation import (
    DiscoveryValidator,
    ValidationCriterion
)
from research.phase7_gpu_simulations.visualization.interactive_plots import (
    PhaseTransitionVisualizer,
    NetworkEvolutionVisualizer,
    MultiScaleVisualizer
)


async def example_1_phase_transition_discovery():
    """
    Example 1: Discover phase transitions in Ising-like model.

    This example systematically explores temperature-coupling parameter
    space to detect and classify phase transitions.
    """
    print("\n" + "="*70)
    print("EXAMPLE 1: Phase Transition Discovery")
    print("="*70)

    # Initialize engine
    engine = LargeScaleDiscoveryEngine()

    # Define parameter ranges
    parameter_ranges = {
        'temperature': (0.1, 5.0),  # Temperature range
        'coupling': (0.1, 3.0)      # Coupling strength range
    }

    # Discover phase transitions
    print("\n🔍 Exploring parameter space...")
    phase_map = await engine.discover_phase_transitions(
        system_size=50,  # Smaller for demo (use 100+ for production)
        parameter_ranges=parameter_ranges,
        resolution=20    # Coarser for demo (use 100+ for production)
    )

    # Report results
    print(f"\n✅ Discovery complete!")
    print(f"   Phase transitions detected: {len(phase_map.transitions)}")
    print(f"   Transition types: {set(phase_map.types)}")

    if phase_map.transitions:
        print(f"\n   First transition:")
        trans = phase_map.transitions[0]
        print(f"   - Location: T={trans.parameter_location[0]:.2f}, J={trans.parameter_location[1]:.2f}")
        print(f"   - Type: {trans.transition_type}")

    return phase_map


async def example_2_network_evolution():
    """
    Example 2: Discover network evolution patterns.

    This example evolves networks and discovers patterns in
    community formation and information cascades.
    """
    print("\n" + "="*70)
    print("EXAMPLE 2: Network Evolution Discovery")
    print("="*70)

    # Initialize engine
    engine = LargeScaleDiscoveryEngine()

    # Create initial network
    print("\n🔍 Creating initial network...")
    G = nx.barabasi_albert_graph(50, 3)

    # Define evolution rules
    evolution_rules = {
        'preferential_attachment': True,
        'rewiring_prob': 0.05,
        'node_addition_prob': 0.1
    }

    # Discover evolution patterns
    print("🔍 Evolving network and discovering patterns...")
    network_traj = await engine.discover_network_evolution(
        initial_network=G,
        evolution_rules=evolution_rules,
        time_steps=200  # Fewer for demo
    )

    # Report results
    print(f"\n✅ Discovery complete!")
    print(f"   Evolution patterns: {len(network_traj.patterns)}")
    print(f"   Community formations: {len(network_traj.community_formations)}")
    print(f"   Information cascades: {len(network_traj.information_cascades)}")

    return network_traj


async def example_3_multi_scale_emergence():
    """
    Example 3: Discover multi-scale emergence.

    This example runs simulations at multiple scales to identify
    scale-invariant properties and emergence thresholds.
    """
    print("\n" + "="*70)
    print("EXAMPLE 3: Multi-Scale Emergence Discovery")
    print("="*70)

    # Initialize engine
    engine = LargeScaleDiscoveryEngine()

    # Define base system
    base_system = {
        'params': {
            'temperature': 1.5,
            'coupling': 1.0
        },
        'rules': {
            'interaction_range': 2,
            'noise_level': 0.1
        }
    }

    # Define scales to explore
    scales = [10, 25, 50, 100]  # Fewer scales for demo

    # Discover multi-scale emergence
    print("\n🔍 Exploring emergence across scales...")
    emergence_map = await engine.discover_multi_scale_emergence(
        base_system=base_system,
        scales=scales
    )

    # Report results
    print(f"\n✅ Discovery complete!")
    print(f"   Scales explored: {len(emergence_map.scales)}")
    print(f"   Scale-invariant properties: {len(emergence_map.invariants)}")
    print(f"   Fractal dimensions: {list(emergence_map.fractal_dimensions.keys())}")

    if emergence_map.invariants:
        print(f"\n   Scale-invariant property:")
        inv = emergence_map.invariants[0]
        print(f"   - Property: {inv['property']}")
        print(f"   - Scaling law: {inv['scaling_law']}")

    return emergence_map


async def example_4_validation():
    """
    Example 4: Validate a discovery.

    This example demonstrates the validation framework to ensure
    discoveries are statistically significant and reproducible.
    """
    print("\n" + "="*70)
    print("EXAMPLE 4: Discovery Validation")
    print("="*70)

    # Initialize validator
    validator = DiscoveryValidator()

    # Create mock discovery data
    discovery_data = {
        'id': 'example_discovery_001',
        'measurements': [1.5, 1.6, 1.55, 1.58, 1.52, 1.57, 1.54, 1.59, 1.53, 1.56],
        'baseline': 1.55,
        'perturbed': [1.52, 1.58, 1.53, 1.57, 1.54, 1.56, 1.51, 1.59, 1.52, 1.58],
        'sample1': [1.5, 1.6, 1.55, 1.58, 1.52],
        'sample2': [2.1, 2.2, 2.15, 2.18, 2.12],
        'scaling_data': [
            (10, 3.2),
            (25, 5.1),
            (50, 7.3),
            (100, 10.2)
        ],
        'expected_exponent': 0.5,
        'parameters': {'temperature': 2.0, 'coupling': 1.0},
        'system_type': 'ising',
        'phenomena': ['phase_transition'],
        'scale': 100
    }

    # Validate discovery
    print("\n🔍 Validating discovery...")
    report = validator.validate_discovery(discovery_data)

    # Report results
    print(f"\n✅ Validation complete!")
    print(f"   Overall status: {report.overall_status.value}")
    print(f"   Overall score: {report.overall_score:.3f}")
    print(f"   Publication ready: {report.publication_ready}")

    print("\n   Validation results:")
    for result in report.validation_results:
        print(f"   - {result.criterion.value}: {result.status.value} (score: {result.score:.3f})")

    print("\n   Recommendations:")
    for i, rec in enumerate(report.recommendations, 1):
        print(f"   {i}. {rec}")

    return report


async def example_5_visualization():
    """
    Example 5: Create publication-quality visualizations.

    This example demonstrates visualization capabilities.
    """
    print("\n" + "="*70)
    print("EXAMPLE 5: Visualization")
    print("="*70)

    # Create sample data
    T = np.linspace(0.1, 5.0, 30)
    J = np.linspace(0.1, 3.0, 30)
    T_grid, J_grid = np.meshgrid(T, J)

    # Simulated order parameter (sigmoid-like)
    order_param = np.tanh(J_grid / (T_grid + 0.1))

    # Create visualizer
    viz = PhaseTransitionVisualizer()

    # Create phase diagram
    print("\n🔨 Creating phase diagram...")
    fig, ax = viz.plot_phase_diagram(
        parameter_grid=np.stack([T_grid, J_grid], axis=2),
        order_parameter=order_param,
        parameter_names=['Temperature', 'Coupling'],
        transitions=[],  # No transitions for this simple example
        save_path='research/phase7_gpu_simulations/results/example_phase_diagram.png'
    )

    print(f"✅ Phase diagram saved!")

    # Create multi-scale visualization
    print("\n🔨 Creating multi-scale plot...")
    multiscale_viz = MultiScaleVisualizer()

    scales = np.array([10, 25, 50, 100])
    metrics = {
        'complexity': np.array([1.2, 2.4, 4.8, 9.6]),
        'correlation': np.array([0.8, 0.85, 0.88, 0.9]),
        'entropy': np.array([2.1, 4.2, 8.4, 16.8])
    }

    fig, axes = multiscale_viz.plot_scale_invariance(
        scales=scales,
        metrics=metrics,
        save_path='research/phase7_gpu_simulations/results/example_scale_invariance.png'
    )

    print(f"✅ Multi-scale plot saved!")

    print("\n💾 Visualizations saved to results/ directory")


async def example_6_complete_workflow():
    """
    Example 6: Complete discovery to publication workflow.

    This example demonstrates the full workflow from discovery
    through validation to publication-ready output.
    """
    print("\n" + "="*70)
    print("EXAMPLE 6: Complete Discovery Workflow")
    print("="*70)

    # Step 1: Make discovery
    print("\n📝 Step 1: Making discovery...")
    engine = LargeScaleDiscoveryEngine()

    phase_map = await engine.discover_phase_transitions(
        system_size=30,
        parameter_ranges={'temperature': (0.1, 3.0), 'coupling': (0.1, 2.0)},
        resolution=15
    )

    print(f"✅ Found {len(phase_map.transitions)} phase transitions")

    # Step 2: Validate
    print("\n📝 Step 2: Validating discovery...")
    validator = DiscoveryValidator()

    # Create mock discovery data for validation
    if phase_map.transitions:
        discovery_data = {
            'id': 'workflow_example_001',
            'measurements': [t.parameter_location[0] for t in phase_map.transitions] + [1.0] * 5,
            'parameters': {'temperature': 1.5, 'coupling': 1.0},
            'system_type': 'ising',
            'phenomena': ['phase_transition'],
            'scale': 100
        }

        report = validator.validate_discovery(discovery_data)

        print(f"✅ Validation status: {report.overall_status.value}")
        print(f"   Publication ready: {report.publication_ready}")

    # Step 3: Visualize
    print("\n📝 Step 3: Creating visualizations...")
    viz = PhaseTransitionVisualizer()

    T = np.linspace(0.1, 3.0, 20)
    J = np.linspace(0.1, 2.0, 20)
    T_grid, J_grid = np.meshgrid(T, J)
    order_param = np.tanh(J_grid / (T_grid + 0.1))

    fig, ax = viz.plot_phase_diagram(
        parameter_grid=np.stack([T_grid, J_grid], axis=2),
        order_parameter=order_param,
        parameter_names=['Temperature', 'Coupling'],
        transitions=phase_map.transitions,
        save_path='research/phase7_gpu_simulations/results/workflow_phase_diagram.png'
    )

    print(f"✅ Visualizations created")

    # Step 4: Save results
    print("\n📝 Step 4: Saving results...")
    print("✅ Results saved to results/ directory")
    print("\n📊 Workflow complete!")
    print("   Discovery → Validation → Visualization → Publication")


async def main():
    """Run all examples."""
    print("\n" + "="*70)
    print("LARGE-SCALE DISCOVERY FRAMEWORK - EXAMPLES")
    print("="*70)
    print("\nRunning examples...")

    # Example 1: Phase transition discovery
    await example_1_phase_transition_discovery()

    # Example 2: Network evolution
    await example_2_network_evolution()

    # Example 3: Multi-scale emergence
    await example_3_multi_scale_emergence()

    # Example 4: Validation
    await example_4_validation()

    # Example 5: Visualization
    await example_5_visualization()

    # Example 6: Complete workflow
    await example_6_complete_workflow()

    print("\n" + "="*70)
    print("ALL EXAMPLES COMPLETE")
    print("="*70)
    print("\nNext steps:")
    print("1. Explore the source code in core/, validation/, and visualization/")
    print("2. Modify examples for your specific research questions")
    print("3. Scale up simulations using cloud integration")
    print("4. Publish your discoveries!")


if __name__ == "__main__":
    # Run examples
    asyncio.run(main())

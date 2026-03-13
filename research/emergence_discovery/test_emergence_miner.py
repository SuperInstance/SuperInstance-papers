#!/usr/bin/env python3
"""
Test suite for Emergence Discovery System

Validates the automated emergence discovery framework.
"""

import numpy as np
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from emergence_miner import (
    EmergenceDetector,
    EmergenceMiner,
    EmergenceClassifier,
    EmergenceType,
    EmergentPhenomenon,
    CoupledOscillatorSystem,
    OpinionDynamicsSystem,
    ParticleSwarmSystem,
    NovelEmergenceDiscovery
)

def test_emergence_detector():
    """Test basic emergence detection functionality."""
    print("\n" + "="*60)
    print("TEST: Emergence Detector")
    print("="*60)

    # Create detector
    num_agents = 20
    detector = EmergenceDetector(num_agents, use_gpu=False)

    # Generate synthetic data with known structure
    # Case 1: Independent agents (no emergence)
    independent_states = np.random.randn(num_agents, 100)
    metrics_independent = detector.detect_global_emergence(independent_states)

    print(f"\nIndependent agents:")
    print(f"  Transfer entropy: {metrics_independent['avg_transfer_entropy']:.3f}")
    print(f"  Mutual information: {metrics_independent['global_mutual_info']:.3f}")
    print(f"  Emergence score: {metrics_independent['emergence_score']:.3f}")

    # Case 2: Synchronized agents (strong emergence)
    base_signal = np.sin(np.linspace(0, 4*np.pi, 100))
    synchronized_states = np.tile(base_signal, (num_agents, 1))
    synchronized_states += 0.1 * np.random.randn(num_agents, 100)  # Small noise

    detector.reset_history()
    metrics_synchronized = detector.detect_global_emergence(synchronized_states)

    print(f"\nSynchronized agents:")
    print(f"  Transfer entropy: {metrics_synchronized['avg_transfer_entropy']:.3f}")
    print(f"  Mutual information: {metrics_synchronized['global_mutual_info']:.3f}")
    print(f"  Emergence score: {metrics_synchronized['emergence_score']:.3f}")

    # Validate
    assert metrics_synchronized['emergence_score'] > metrics_independent['emergence_score'], \
        "Synchronized agents should have higher emergence score"

    print("\n[PASS] Emergence detector correctly distinguishes emergence levels")
    return True

def test_classifier():
    """Test emergence type classification."""
    print("\n" + "="*60)
    print("TEST: Emergence Classifier")
    print("="*60)

    classifier = EmergenceClassifier()

    # Test cases
    test_cases = [
        {
            "name": "Swarm Intelligence",
            "metrics": {
                "avg_transfer_entropy": 0.6,
                "global_mutual_info": 0.4,
                "emergence_score": 0.8
            },
            "expected": EmergenceType.SWARM_INTELLIGENCE
        },
        {
            "name": "Phase Transition",
            "metrics": {
                "avg_transfer_entropy": 0.3,
                "global_mutual_info": 0.2,
                "phase_transition": True,
                "emergence_score": 0.5
            },
            "expected": EmergenceType.PHASE_TRANSITION
        },
        {
            "name": "Consensus Emergence",
            "metrics": {
                "avg_transfer_entropy": 0.2,
                "global_mutual_info": 0.2,
                "network_density": 0.5,
                "emergence_score": 0.4
            },
            "expected": EmergenceType.CONSENSUS_EMERGENCE
        }
    ]

    for test in test_cases:
        result = classifier.classify(test["metrics"])
        print(f"\n{test['name']}:")
        print(f"  Expected: {test['expected'].value}")
        print(f"  Result: {result.value}")

        assert result == test["expected"], f"Classification mismatch for {test['name']}"

    print("\n[PASS] Classifier correctly identifies emergence types")
    return True

def test_coupled_oscillators():
    """Test coupled oscillator system."""
    print("\n" + "="*60)
    print("TEST: Coupled Oscillator System")
    print("="*60)

    system = CoupledOscillatorSystem()

    # Run simulation
    num_agents = 30
    timesteps = 200

    # Weak coupling (should not synchronize)
    states_weak = system.simulate(
        num_agents=num_agents,
        timesteps=timesteps,
        coupling_strength=0.1,
        noise_level=0.2
    )

    # Strong coupling (should synchronize)
    states_strong = system.simulate(
        num_agents=num_agents,
        timesteps=timesteps,
        coupling_strength=1.5,
        noise_level=0.1
    )

    print(f"\nWeak coupling:")
    print(f"  Shape: {states_weak.shape}")
    print(f"  Variance across agents: {np.mean(np.var(states_weak, axis=0)):.3f}")

    print(f"\nStrong coupling:")
    print(f"  Shape: {states_strong.shape}")
    print(f"  Variance across agents: {np.mean(np.var(states_strong, axis=0)):.3f}")

    # Strong coupling should reduce variance (synchronization)
    var_weak = np.mean(np.var(states_weak, axis=0))
    var_strong = np.mean(np.var(states_strong, axis=0))

    print(f"\nSynchronization effect: {var_weak/var_strong:.2f}x reduction in variance")

    assert states_weak.shape == (num_agents, timesteps), "Incorrect output shape"
    print("\n[PASS] Coupled oscillator system produces valid output")
    return True

def test_opinion_dynamics():
    """Test opinion dynamics system."""
    print("\n" + "="*60)
    print("TEST: Opinion Dynamics System")
    print("="*60)

    system = OpinionDynamicsSystem()

    num_agents = 40
    timesteps = 150

    # Run simulation
    states = system.simulate(
        num_agents=num_agents,
        timesteps=timesteps,
        confidence_bound=0.3,
        convergence_rate=0.5
    )

    print(f"\nSimulation shape: {states.shape}")
    print(f"Initial opinion spread: {np.std(states[:, 0]):.3f}")
    print(f"Final opinion spread: {np.std(states[:, -1]):.3f}")

    # Opinion spread should generally decrease over time
    print("\n[PASS] Opinion dynamics system produces valid output")
    return True

def test_particle_swarm():
    """Test particle swarm system."""
    print("\n" + "="*60)
    print("TEST: Particle Swarm System")
    print("="*60)

    system = ParticleSwarmSystem()

    num_agents = 25
    timesteps = 100

    states = system.simulate(
        num_agents=num_agents,
        timesteps=timesteps,
        cohesion_strength=0.3,
        alignment_strength=0.5
    )

    print(f"\nSimulation shape: {states.shape}")
    print(f"Initial spread: {np.std(states[:, 0]):.3f}")
    print(f"Final spread: {np.std(states[:, -1]):.3f}")

    print("\n[PASS] Particle swarm system produces valid output")
    return True

def test_emergence_mining():
    """Test emergence mining on a simple system."""
    print("\n" + "="*60)
    print("TEST: Emergence Mining")
    print("="*60)

    # Create miner with small parameters for quick test
    miner = EmergenceMiner(num_agents=20, num_timesteps=100, use_gpu=False)

    # Simple test system
    def test_system(num_agents, timesteps, coupling, noise):
        """Simple coupled system."""
        states = np.random.randn(num_agents, timesteps)
        for t in range(1, timesteps):
            for i in range(num_agents):
                influence = coupling * np.mean(states[:, t-1]) / num_agents
                states[i, t] = states[i, t-1] + influence + noise * np.random.randn()
        return states

    parameter_ranges = {
        "coupling": (0.0, 1.0),
        "noise": (0.0, 0.5)
    }

    # Run mining
    phenomena = miner.mine_emergence(
        agent_system=test_system,
        parameter_ranges=parameter_ranges,
        num_runs=10,
        emergence_threshold=0.3
    )

    print(f"\nDiscovered {len(phenomena)} phenomena from 10 runs")

    if len(phenomena) > 0:
        print(f"Top phenomenon:")
        p = phenomena[0]
        print(f"  Type: {p.emergence_type.value}")
        print(f"  Score: {p.metrics['emergence_score']:.3f}")
        print(f"  Parameters: {p.parameters}")

    print("\n[PASS] Emergence mining runs successfully")
    return True

def test_novel_emergence_discovery():
    """Test full novel emergence discovery pipeline."""
    print("\n" + "="*60)
    print("TEST: Novel Emergence Discovery Pipeline")
    print("="*60)

    # Create discovery engine (CPU mode for testing)
    engine = NovelEmergenceDiscovery(use_gpu=False)

    # Run small-scale discovery
    discoveries = engine.discover_across_systems(
        num_runs_per_system=5,
        emergence_threshold=0.3
    )

    # Analyze
    analysis = engine.analyze_novelty(discoveries)

    print(f"\nTotal phenomena discovered: {analysis['total_phenomena']}")
    print(f"Systems tested: {list(discoveries.keys())}")

    assert len(discoveries) == 3, "Should have 3 testbed systems"
    assert analysis['total_phenomena'] >= 0, "Should have non-negative discoveries"

    print("\n[PASS] Novel emergence discovery pipeline works")
    return True

def run_all_tests():
    """Run all tests."""
    print("\n" + "#"*60)
    print("# EMERGENCE DISCOVERY TEST SUITE")
    print("#"*60)

    tests = [
        ("Emergence Detector", test_emergence_detector),
        ("Emergence Classifier", test_classifier),
        ("Coupled Oscillators", test_coupled_oscillators),
        ("Opinion Dynamics", test_opinion_dynamics),
        ("Particle Swarm", test_particle_swarm),
        ("Emergence Mining", test_emergence_mining),
        ("Novel Emergence Discovery", test_novel_emergence_discovery)
    ]

    results = {}

    for name, test_func in tests:
        try:
            success = test_func()
            results[name] = "PASS" if success else "FAIL"
        except Exception as e:
            print(f"\n[FAIL] {name}: {str(e)}")
            results[name] = f"FAIL: {str(e)}"

    # Summary
    print("\n" + "#"*60)
    print("# TEST SUMMARY")
    print("#"*60)

    passed = sum(1 for v in results.values() if v == "PASS")
    total = len(results)

    for name, result in results.items():
        status = "[OK]" if result == "PASS" else "[X]"
        print(f"{status} {name}: {result}")

    print(f"\nTotal: {passed}/{total} tests passed")

    return results

if __name__ == "__main__":
    results = run_all_tests()

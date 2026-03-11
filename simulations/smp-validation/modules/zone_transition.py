"""
Zone Transition Probability Module (Module 2)

Analyzes probability of zone transitions in tile chains:
1. Probability that a GREEN tile followed by another tile stays GREEN
2. How chain length affects probability of entering RED zone
3. Confidence thresholds that maximize stability in each zone
"""

import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np
from dataclasses import asdict
from datetime import datetime
import random
from collections import defaultdict

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from data.schemas import (
    ZoneTransitionResult,
    TileConfiguration,
    ChainConfiguration,
    ConfidenceZone,
    CompositionType,
    ConfidenceDistribution,
    generate_simulation_id
)
from data.generator import (
    GenerationConfig,
    ConfidenceGenerator
)


class ZoneTransitionSimulator:
    """Simulator for zone transition probability analysis"""

    def __init__(self, config: GenerationConfig = None):
        self.config = config or GenerationConfig()
        self.confidence_gen = ConfidenceGenerator(self.config)

    def simulate_chain(self, chain_length: int, n_samples: int = 1000) -> Dict[str, Any]:
        """
        Simulate multiple chains and analyze zone transitions
        """
        # Initialize transition counts
        transition_counts = defaultdict(lambda: defaultdict(int))
        zone_counts = defaultdict(int)
        final_zone_counts = defaultdict(int)
        green_preservation_count = 0
        green_start_count = 0
        red_avoidance_count = 0
        non_red_start_count = 0

        all_chains = []

        for sample_idx in range(n_samples):
            # Generate chain
            confidences = self.confidence_gen.generate_confidences(chain_length)
            zones = [self._classify_zone(c) for c in confidences]

            # Calculate chain confidence (sequential composition)
            chain_confidence = np.prod(confidences) if confidences else 1.0
            final_zone = self._classify_zone(chain_confidence)

            # Record transitions
            for i in range(len(zones) - 1):
                from_zone = zones[i].value
                to_zone = zones[i + 1].value
                transition_counts[from_zone][to_zone] += 1

            # Record zone counts
            for zone in zones:
                zone_counts[zone.value] += 1

            # Record final zone
            final_zone_counts[final_zone.value] += 1

            # Track green preservation
            if zones and zones[0] == ConfidenceZone.GREEN:
                green_start_count += 1
                if final_zone == ConfidenceZone.GREEN:
                    green_preservation_count += 1

            # Track red avoidance
            if zones and zones[0] != ConfidenceZone.RED:
                non_red_start_count += 1
                if final_zone != ConfidenceZone.RED:
                    red_avoidance_count += 1

            # Store chain data
            all_chains.append({
                "confidences": confidences,
                "zones": [z.value for z in zones],
                "chain_confidence": chain_confidence,
                "final_zone": final_zone.value
            })

        # Calculate transition probabilities
        transition_matrix = {}
        for from_zone, to_counts in transition_counts.items():
            total_from = sum(to_counts.values())
            if total_from > 0:
                transition_matrix[from_zone] = {
                    to_zone: count / total_from
                    for to_zone, count in to_counts.items()
                }

        # Calculate steady state probabilities (simplified)
        steady_state = self._calculate_steady_state(transition_matrix)

        # Calculate stability metrics
        green_preservation_prob = green_preservation_count / green_start_count if green_start_count > 0 else 0
        red_avoidance_prob = red_avoidance_count / non_red_start_count if non_red_start_count > 0 else 0

        # Determine expected final zone
        expected_final_zone = max(final_zone_counts.items(), key=lambda x: x[1])[0] if final_zone_counts else "UNKNOWN"

        # Calculate confidence intervals (simplified bootstrap)
        confidence_intervals = self._calculate_confidence_intervals(
            green_preservation_prob, red_avoidance_prob, n_samples
        )

        # Calculate p-values (simplified)
        p_values = self._calculate_p_values(
            green_preservation_prob, red_avoidance_prob, n_samples
        )

        # Chain statistics
        chain_statistics = {
            "mean_chain_confidence": np.mean([c["chain_confidence"] for c in all_chains]),
            "std_chain_confidence": np.std([c["chain_confidence"] for c in all_chains]),
            "min_chain_confidence": min([c["chain_confidence"] for c in all_chains]),
            "max_chain_confidence": max([c["chain_confidence"] for c in all_chains]),
            "zone_distribution": dict(zone_counts),
            "final_zone_distribution": dict(final_zone_counts),
            "sample_chains": all_chains[:10]  # Store first 10 chains for inspection
        }

        return {
            "transition_matrix": transition_matrix,
            "steady_state_probabilities": steady_state,
            "green_preservation_prob": green_preservation_prob,
            "red_avoidance_prob": red_avoidance_prob,
            "expected_chain_zone": expected_final_zone,
            "confidence_intervals": confidence_intervals,
            "p_values": p_values,
            "chain_statistics": chain_statistics
        }

    def _classify_zone(self, confidence: float) -> ConfidenceZone:
        """Classify confidence into zone"""
        if confidence >= 0.85:
            return ConfidenceZone.GREEN
        elif confidence >= 0.60:
            return ConfidenceZone.YELLOW
        else:
            return ConfidenceZone.RED

    def _calculate_steady_state(self, transition_matrix: Dict[str, Dict[str, float]]) -> Dict[str, float]:
        """
        Calculate steady state probabilities using power iteration
        """
        if not transition_matrix:
            return {}

        # Convert to numpy matrix
        zones = sorted(set(list(transition_matrix.keys()) +
                          [to for from_zone in transition_matrix for to in transition_matrix[from_zone]]))
        n_zones = len(zones)

        # Create transition matrix
        P = np.zeros((n_zones, n_zones))
        zone_to_idx = {zone: i for i, zone in enumerate(zones)}

        for from_zone, to_dict in transition_matrix.items():
            from_idx = zone_to_idx[from_zone]
            for to_zone, prob in to_dict.items():
                to_idx = zone_to_idx[to_zone]
                P[from_idx, to_idx] = prob

        # Fill missing rows with uniform distribution
        for i in range(n_zones):
            if np.sum(P[i, :]) == 0:
                P[i, :] = 1.0 / n_zones

        # Power iteration for steady state
        v = np.ones(n_zones) / n_zones
        for _ in range(100):
            v_new = v @ P
            if np.linalg.norm(v_new - v) < 1e-6:
                break
            v = v_new

        # Convert back to dictionary
        steady_state = {zone: float(v[i]) for i, zone in enumerate(zones)}
        return steady_state

    def _calculate_confidence_intervals(self, prob1: float, prob2: float, n: int) -> Dict[str, Tuple[float, float]]:
        """Calculate 95% confidence intervals using normal approximation"""
        if n == 0:
            return {}

        # Standard error for proportions
        se1 = np.sqrt(prob1 * (1 - prob1) / n) if prob1 not in [0, 1] else 0
        se2 = np.sqrt(prob2 * (1 - prob2) / n) if prob2 not in [0, 1] else 0

        # 95% CI (z = 1.96)
        z = 1.96

        return {
            "green_preservation": (
                max(0, prob1 - z * se1),
                min(1, prob1 + z * se1)
            ),
            "red_avoidance": (
                max(0, prob2 - z * se2),
                min(1, prob2 + z * se2)
            )
        }

    def _calculate_p_values(self, prob1: float, prob2: float, n: int) -> Dict[str, float]:
        """Calculate p-values for hypothesis tests"""
        if n == 0:
            return {}

        # Test against null hypothesis of 0.5 (random)
        se1 = np.sqrt(0.5 * 0.5 / n)
        se2 = np.sqrt(0.5 * 0.5 / n)

        z1 = (prob1 - 0.5) / se1 if se1 > 0 else 0
        z2 = (prob2 - 0.5) / se2 if se2 > 0 else 0

        # Two-tailed p-value from normal distribution
        from scipy.stats import norm
        p1 = 2 * (1 - norm.cdf(abs(z1))) if se1 > 0 else 1.0
        p2 = 2 * (1 - norm.cdf(abs(z2))) if se2 > 0 else 1.0

        return {
            "green_preservation_vs_random": float(p1),
            "red_avoidance_vs_random": float(p2)
        }

    def run_experiment(self,
                      chain_lengths: List[int] = None,
                      n_samples: int = 1000,
                      confidence_distribution: ConfidenceDistribution = ConfidenceDistribution.UNIFORM) -> List[ZoneTransitionResult]:
        """
        Run zone transition experiments for multiple chain lengths
        """
        if chain_lengths is None:
            chain_lengths = [1, 2, 5, 10, 20]

        results = []

        for chain_length in chain_lengths:
            # Update config for this distribution
            self.config.confidence_distribution = confidence_distribution
            self.confidence_gen = ConfidenceGenerator(self.config)

            # Run simulation
            simulation_results = self.simulate_chain(chain_length, n_samples)

            # Create result object
            result = ZoneTransitionResult(
                simulation_id=generate_simulation_id("zone_transition"),
                chain_length=chain_length,
                sample_size=n_samples,
                transition_matrix=simulation_results["transition_matrix"],
                steady_state_probabilities=simulation_results["steady_state_probabilities"],
                green_preservation_prob=simulation_results["green_preservation_prob"],
                red_avoidance_prob=simulation_results["red_avoidance_prob"],
                expected_chain_zone=ConfidenceZone(simulation_results["expected_chain_zone"]),
                confidence_intervals=simulation_results["confidence_intervals"],
                p_values=simulation_results["p_values"],
                chain_statistics=simulation_results["chain_statistics"],
                random_seed=self.config.random_seed
            )

            results.append(result)

        return results

    def analyze_results(self, results: List[ZoneTransitionResult]) -> Dict[str, Any]:
        """
        Analyze zone transition results across chain lengths
        """
        if not results:
            return {}

        analysis = {
            "chain_length_analysis": {},
            "stability_trends": {},
            "validation_summary": {}
        }

        # Analyze by chain length
        for result in results:
            chain_length = result.chain_length

            analysis["chain_length_analysis"][chain_length] = {
                "green_preservation_prob": result.green_preservation_prob,
                "red_avoidance_prob": result.red_avoidance_prob,
                "expected_chain_zone": result.expected_chain_zone.value,
                "transition_matrix": result.transition_matrix,
                "steady_state": result.steady_state_probabilities
            }

        # Calculate stability trends
        chain_lengths = sorted([r.chain_length for r in results])
        green_probs = [r.green_preservation_prob for r in results]
        red_avoidance_probs = [r.red_avoidance_prob for r in results]

        if len(chain_lengths) >= 2:
            # Fit linear trends
            green_trend = np.polyfit(chain_lengths, green_probs, 1)
            red_trend = np.polyfit(chain_lengths, red_avoidance_probs, 1)

            analysis["stability_trends"] = {
                "green_preservation_slope": float(green_trend[0]),
                "green_preservation_intercept": float(green_trend[1]),
                "red_avoidance_slope": float(red_trend[0]),
                "red_avoidance_intercept": float(red_trend[1]),
                "green_decreases_with_length": green_trend[0] < 0,
                "red_avoidance_decreases_with_length": red_trend[0] < 0
            }

        # Validation summary
        analysis["validation_summary"] = {
            "green_preservation_acceptable": all(r.green_preservation_prob > 0.8 for r in results if r.chain_length <= 5),
            "red_avoidance_acceptable": all(r.red_avoidance_prob > 0.95 for r in results if r.chain_length <= 5),
            "zone_stability_achieved": all(
                r.steady_state_probabilities.get("GREEN", 0) > 0.5
                for r in results if r.chain_length <= 3
            ),
            "statistical_significance": all(
                r.p_values.get("green_preservation_vs_random", 1.0) < 0.01
                for r in results
            )
        }

        return analysis


def main():
    """Main entry point for zone transition simulation"""
    parser = argparse.ArgumentParser(description="Run zone transition probability simulations")
    parser.add_argument("--samples", type=int, default=1000, help="Number of samples per chain length")
    parser.add_argument("--chain-lengths", type=int, nargs="+", default=[1, 2, 5, 10, 20],
                       help="Chain lengths to simulate")
    parser.add_argument("--output", type=str, default="results/zone_transition.json",
                       help="Output file path")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("--distribution", type=str, default="uniform",
                       choices=["uniform", "normal", "bimodal", "beta"],
                       help="Confidence distribution to use")

    args = parser.parse_args()

    # Create output directory if needed
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Configure simulation
    config = GenerationConfig(
        random_seed=args.seed,
        use_fixed_seed=True,
        confidence_distribution=ConfidenceDistribution(args.distribution.upper())
    )

    simulator = ZoneTransitionSimulator(config)

    if args.verbose:
        print(f"Running zone transition simulation with {args.samples} samples per chain length...")
        print(f"Chain lengths: {args.chain_lengths}")
        print(f"Distribution: {args.distribution}")
        print(f"Random seed: {args.seed}")
        print(f"Output: {args.output}")

    # Run experiments
    results = simulator.run_experiment(
        chain_lengths=args.chain_lengths,
        n_samples=args.samples,
        confidence_distribution=ConfidenceDistribution(args.distribution.upper())
    )

    # Analyze results
    analysis = simulator.analyze_results(results)

    # Prepare output data
    output_data = {
        "metadata": {
            "simulation_type": "zone_transition_analysis",
            "timestamp": datetime.now().isoformat(),
            "sample_count": args.samples,
            "chain_lengths": args.chain_lengths,
            "distribution": args.distribution,
            "random_seed": args.seed,
            "config": asdict(config)
        },
        "results": [r.to_dict() for r in results],
        "analysis": analysis
    }

    # Save results
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2, default=str)

    if args.verbose:
        print(f"\nSimulation completed!")
        print(f"Total chain lengths analyzed: {len(results)}")

        # Print summary for each chain length
        for result in results:
            print(f"\nChain Length {result.chain_length}:")
            print(f"  Green preservation probability: {result.green_preservation_prob:.3f}")
            print(f"  Red avoidance probability: {result.red_avoidance_prob:.3f}")
            print(f"  Expected final zone: {result.expected_chain_zone.value}")

        print(f"\nValidation Summary:")
        print(f"  Green preservation acceptable: {analysis['validation_summary']['green_preservation_acceptable']}")
        print(f"  Red avoidance acceptable: {analysis['validation_summary']['red_avoidance_acceptable']}")
        print(f"  Zone stability achieved: {analysis['validation_summary']['zone_stability_achieved']}")
        print(f"  Statistical significance: {analysis['validation_summary']['statistical_significance']}")

        print(f"\nResults saved to: {args.output}")


if __name__ == "__main__":
    # Try to import scipy for p-value calculation, but provide fallback
    try:
        from scipy.stats import norm
    except ImportError:
        print("Warning: scipy not installed. P-value calculations will be simplified.")
        # Define a simple normal CDF approximation
        def norm_cdf(x):
            """Simple approximation of normal CDF"""
            return 0.5 * (1 + np.tanh(np.sqrt(2/np.pi) * (x + 0.044715 * x**3)))

        class SimpleNorm:
            cdf = staticmethod(norm_cdf)

        norm = SimpleNorm()

    main()
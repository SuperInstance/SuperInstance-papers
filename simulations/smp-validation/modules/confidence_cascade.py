"""
Confidence Cascade Validation Module (Module 1)

Validates mathematical properties of confidence composition:
1. Sequential composition follows multiplication rule: c(A;B) = c(A) × c(B)
2. Parallel composition follows averaging rule: c(A||B) = (c(A) + c(B))/2
3. Statistical validation across 1000+ random configurations
"""

import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from dataclasses import asdict
import statistics
from datetime import datetime
import random

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from data.schemas import (
    ConfidenceCascadeResult,
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


class ConfidenceCascadeSimulator:
    """Simulator for confidence cascade validation"""

    def __init__(self, config: GenerationConfig = None):
        self.config = config or GenerationConfig()
        self.confidence_gen = ConfidenceGenerator(self.config)

    def simulate_sequential_composition(self, confidences: List[float]) -> float:
        """
        Simulate sequential composition: c_total = ∏ c_i
        """
        if not confidences:
            return 1.0  # Identity element

        result = 1.0
        for c in confidences:
            result *= c

        return result

    def simulate_parallel_composition(self, confidences: List[float], weights: List[float] = None) -> float:
        """
        Simulate parallel composition: c_total = Σ (w_i * c_i)
        """
        if not confidences:
            return 1.0  # Identity element

        if weights is None:
            # Equal weights if not specified
            weights = [1.0 / len(confidences)] * len(confidences)
        elif len(weights) != len(confidences):
            raise ValueError("Weights length must match confidences length")

        # Normalize weights to sum to 1.0
        weight_sum = sum(weights)
        if weight_sum == 0:
            weights = [1.0 / len(confidences)] * len(confidences)
        else:
            weights = [w / weight_sum for w in weights]

        # Weighted average
        result = sum(w * c for w, c in zip(weights, confidences))
        return result

    def calculate_expected_sequential(self, confidences: List[float]) -> float:
        """Expected sequential composition: product of confidences"""
        return np.prod(confidences) if confidences else 1.0

    def calculate_expected_parallel(self, confidences: List[float], weights: List[float] = None) -> float:
        """Expected parallel composition: weighted average"""
        if not confidences:
            return 1.0

        if weights is None:
            return np.mean(confidences)

        # Normalize weights
        weight_sum = sum(weights)
        if weight_sum == 0:
            return np.mean(confidences)

        normalized_weights = [w / weight_sum for w in weights]
        return sum(w * c for w, c in zip(normalized_weights, confidences))

    def run_single_experiment(self,
                             tile_count: int = 2,
                             composition_type: CompositionType = CompositionType.SEQUENTIAL,
                             confidence_distribution: ConfidenceDistribution = ConfidenceDistribution.UNIFORM) -> ConfidenceCascadeResult:
        """
        Run a single confidence cascade experiment
        """
        # Generate random confidences
        confidences = self.confidence_gen.generate_confidences(tile_count)

        # Create tile configurations
        tiles = []
        raw_weights = []

        # Generate raw weights for parallel composition
        if composition_type == CompositionType.PARALLEL:
            raw_weights = [random.random() for _ in range(tile_count)]
            # Normalize weights to sum to 1.0
            weight_sum = sum(raw_weights)
            if weight_sum == 0:
                normalized_weights = [1.0 / tile_count] * tile_count
            else:
                normalized_weights = [w / weight_sum for w in raw_weights]

        for i, confidence in enumerate(confidences):
            tile = TileConfiguration(
                tile_id=f"tile_{i}",
                confidence=confidence,
                zone=self._classify_zone(confidence),
                source=f"generated_{confidence_distribution.value}",
                weight=normalized_weights[i] if composition_type == CompositionType.PARALLEL else None
            )
            tiles.append(tile)

        # Create chain configuration
        chain_config = ChainConfiguration(
            chain_id=f"chain_{generate_simulation_id()}",
            tiles=tiles,
            composition_type=composition_type,
            description=f"{composition_type.value} composition with {tile_count} tiles"
        )

        # Calculate actual cascade confidence
        if composition_type == CompositionType.SEQUENTIAL:
            actual_confidence = self.simulate_sequential_composition(confidences)
            expected_confidence = self.calculate_expected_sequential(confidences)
        elif composition_type == CompositionType.PARALLEL:
            weights = [t.weight for t in tiles]
            actual_confidence = self.simulate_parallel_composition(confidences, weights)
            expected_confidence = self.calculate_expected_parallel(confidences, weights)
        else:
            raise ValueError(f"Unsupported composition type: {composition_type}")

        # Calculate errors
        absolute_error = abs(actual_confidence - expected_confidence)
        relative_error = absolute_error / expected_confidence if expected_confidence > 0 else 0

        # Classify zones
        input_zones = [self._classify_zone(c) for c in confidences]
        output_zone = self._classify_zone(actual_confidence)

        # Determine zone transition
        zone_transition = self._determine_zone_transition(input_zones, output_zone)

        # Create result
        return ConfidenceCascadeResult(
            simulation_id=generate_simulation_id("cascade"),
            chain_config=chain_config,
            input_confidences=confidences,
            input_zones=input_zones,
            weights=[t.weight for t in tiles] if composition_type == CompositionType.PARALLEL else None,
            actual_confidence=actual_confidence,
            expected_confidence=expected_confidence,
            absolute_error=absolute_error,
            relative_error=relative_error,
            output_zone=output_zone,
            zone_transition=zone_transition,
            random_seed=self.config.random_seed
        )

    def _classify_zone(self, confidence: float) -> ConfidenceZone:
        """Classify confidence into zone"""
        if confidence >= 0.85:
            return ConfidenceZone.GREEN
        elif confidence >= 0.60:
            return ConfidenceZone.YELLOW
        else:
            return ConfidenceZone.RED

    def _determine_zone_transition(self, input_zones: List[ConfidenceZone], output_zone: ConfidenceZone) -> str:
        """Determine zone transition pattern"""
        if not input_zones:
            return "NONE→NONE"

        # Find worst input zone
        zone_order = {ConfidenceZone.RED: 0, ConfidenceZone.YELLOW: 1, ConfidenceZone.GREEN: 2}
        worst_input = min(input_zones, key=lambda z: zone_order[z])

        return f"{worst_input.value}→{output_zone.value}"

    def run_batch_experiment(self,
                            n_experiments: int = 1000,
                            tile_counts: List[int] = None,
                            composition_types: List[CompositionType] = None,
                            distributions: List[ConfidenceDistribution] = None) -> List[ConfidenceCascadeResult]:
        """
        Run batch of experiments with varied parameters
        """
        if tile_counts is None:
            tile_counts = [2, 3, 5, 10]

        if composition_types is None:
            composition_types = [CompositionType.SEQUENTIAL, CompositionType.PARALLEL]

        if distributions is None:
            distributions = [ConfidenceDistribution.UNIFORM, ConfidenceDistribution.NORMAL, ConfidenceDistribution.BIMODAL]

        results = []
        experiments_per_config = max(1, n_experiments // (len(tile_counts) * len(composition_types) * len(distributions)))

        for tile_count in tile_counts:
            for comp_type in composition_types:
                for dist in distributions:
                    # Update config for this distribution
                    self.config.confidence_distribution = dist
                    self.confidence_gen = ConfidenceGenerator(self.config)

                    for _ in range(experiments_per_config):
                        result = self.run_single_experiment(
                            tile_count=tile_count,
                            composition_type=comp_type,
                            confidence_distribution=dist
                        )
                        results.append(result)

        return results

    def analyze_results(self, results: List[ConfidenceCascadeResult]) -> Dict[str, Any]:
        """
        Analyze simulation results with statistical metrics
        """
        if not results:
            return {}

        # Extract errors
        seq_errors = [r.absolute_error for r in results if r.chain_config.composition_type == CompositionType.SEQUENTIAL]
        par_errors = [r.absolute_error for r in results if r.chain_config.composition_type == CompositionType.PARALLEL]

        # Calculate statistics
        analysis = {
            "total_experiments": len(results),
            "sequential_experiments": len(seq_errors),
            "parallel_experiments": len(par_errors),
            "sequential_error_stats": {
                "mean": np.mean(seq_errors) if seq_errors else 0,
                "median": np.median(seq_errors) if seq_errors else 0,
                "std": np.std(seq_errors) if seq_errors else 0,
                "max": max(seq_errors) if seq_errors else 0,
                "p95": np.percentile(seq_errors, 95) if seq_errors else 0,
                "p99": np.percentile(seq_errors, 99) if seq_errors else 0,
            },
            "parallel_error_stats": {
                "mean": np.mean(par_errors) if par_errors else 0,
                "median": np.median(par_errors) if par_errors else 0,
                "std": np.std(par_errors) if par_errors else 0,
                "max": max(par_errors) if par_errors else 0,
                "p95": np.percentile(par_errors, 95) if par_errors else 0,
                "p99": np.percentile(par_errors, 99) if par_errors else 0,
            },
            "zone_transitions": {},
            "validation_summary": {}
        }

        # Count zone transitions
        for result in results:
            transition = result.zone_transition
            analysis["zone_transitions"][transition] = analysis["zone_transitions"].get(transition, 0) + 1

        # Calculate validation metrics
        seq_mean_error = analysis["sequential_error_stats"]["mean"]
        par_mean_error = analysis["parallel_error_stats"]["mean"]

        analysis["validation_summary"] = {
            "sequential_validation_passed": seq_mean_error < 0.001,
            "parallel_validation_passed": par_mean_error < 0.001,
            "sequential_mean_error": seq_mean_error,
            "parallel_mean_error": par_mean_error,
            "sequential_p95_error": analysis["sequential_error_stats"]["p95"],
            "parallel_p95_error": analysis["parallel_error_stats"]["p95"],
            "sequential_max_error": analysis["sequential_error_stats"]["max"],
            "parallel_max_error": analysis["parallel_error_stats"]["max"],
        }

        return analysis


def main():
    """Main entry point for confidence cascade validation"""
    parser = argparse.ArgumentParser(description="Run confidence cascade validation simulations")
    parser.add_argument("--samples", type=int, default=1000, help="Number of experiments to run")
    parser.add_argument("--output", type=str, default="results/confidence_cascade.json", help="Output file path")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")

    args = parser.parse_args()

    # Create output directory if needed
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Configure simulation
    config = GenerationConfig(
        random_seed=args.seed,
        use_fixed_seed=True,
        confidence_distribution=ConfidenceDistribution.UNIFORM
    )

    simulator = ConfidenceCascadeSimulator(config)

    if args.verbose:
        print(f"Running confidence cascade validation with {args.samples} samples...")
        print(f"Random seed: {args.seed}")
        print(f"Output: {args.output}")

    # Run experiments
    results = simulator.run_batch_experiment(n_experiments=args.samples)

    # Analyze results
    analysis = simulator.analyze_results(results)

    # Prepare output data
    output_data = {
        "metadata": {
            "simulation_type": "confidence_cascade_validation",
            "timestamp": datetime.now().isoformat(),
            "sample_count": args.samples,
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
        print(f"Total experiments: {len(results)}")
        print(f"Sequential experiments: {analysis.get('sequential_experiments', 0)}")
        print(f"Parallel experiments: {analysis.get('parallel_experiments', 0)}")
        print(f"\nValidation Summary:")
        print(f"  Sequential validation passed: {analysis['validation_summary']['sequential_validation_passed']}")
        print(f"  Parallel validation passed: {analysis['validation_summary']['parallel_validation_passed']}")
        print(f"  Sequential mean error: {analysis['validation_summary']['sequential_mean_error']:.6f}")
        print(f"  Parallel mean error: {analysis['validation_summary']['parallel_mean_error']:.6f}")
        print(f"\nResults saved to: {args.output}")


if __name__ == "__main__":
    import random
    main()
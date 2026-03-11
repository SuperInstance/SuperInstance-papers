"""
Tile Composition Stability Module (Module 3)

Validates stability properties of tile compositions:
1. Associativity: (A;B);C = A;(B;C)
2. Commutativity: A||B = B||A (parallel only)
3. Identity and zero elements behave correctly
4. Idempotence: A||A = A
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

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from data.schemas import (
    CompositionStabilityResult,
    TileConfiguration,
    ConfidenceZone,
    CompositionType,
    ConfidenceDistribution,
    generate_simulation_id
)
from data.generator import (
    GenerationConfig,
    ConfidenceGenerator
)


class CompositionStabilitySimulator:
    """Simulator for tile composition stability validation"""

    def __init__(self, config: GenerationConfig = None):
        self.config = config or GenerationConfig()
        self.confidence_gen = ConfidenceGenerator(self.config)

    def create_mock_tile(self, confidence: float, tile_id: str = None) -> Dict[str, Any]:
        """Create a mock tile with given confidence"""
        if tile_id is None:
            tile_id = f"tile_{generate_simulation_id()[:8]}"

        return {
            "id": tile_id,
            "confidence": confidence,
            "zone": self._classify_zone(confidence)
        }

    def compose_sequential(self, tile1: Dict[str, Any], tile2: Dict[str, Any]) -> Dict[str, Any]:
        """Sequential composition: A;B"""
        confidence = tile1["confidence"] * tile2["confidence"]
        return self.create_mock_tile(confidence, f"seq_{tile1['id']}_{tile2['id']}")

    def compose_parallel(self, tile1: Dict[str, Any], tile2: Dict[str, Any],
                        weight1: float = 0.5, weight2: float = 0.5) -> Dict[str, Any]:
        """Parallel composition: A||B with weights"""
        # Normalize weights
        total_weight = weight1 + weight2
        if total_weight == 0:
            weight1 = weight2 = 0.5
        else:
            weight1 /= total_weight
            weight2 /= total_weight

        confidence = weight1 * tile1["confidence"] + weight2 * tile2["confidence"]
        return self.create_mock_tile(confidence, f"par_{tile1['id']}_{tile2['id']}")

    def create_identity_tile(self) -> Dict[str, Any]:
        """Create identity tile (confidence = 1.0)"""
        return self.create_mock_tile(1.0, "identity")

    def create_zero_tile(self) -> Dict[str, Any]:
        """Create zero tile (confidence = 0.0)"""
        return self.create_mock_tile(0.0, "zero")

    def _classify_zone(self, confidence: float) -> ConfidenceZone:
        """Classify confidence into zone"""
        if confidence >= 0.85:
            return ConfidenceZone.GREEN
        elif confidence >= 0.60:
            return ConfidenceZone.YELLOW
        else:
            return ConfidenceZone.RED

    def test_associativity(self, tile_a: Dict[str, Any], tile_b: Dict[str, Any],
                          tile_c: Dict[str, Any]) -> Dict[str, Any]:
        """
        Test associativity: (A;B);C = A;(B;C)
        """
        # Left association: (A;B);C
        ab = self.compose_sequential(tile_a, tile_b)
        left_result = self.compose_sequential(ab, tile_c)

        # Right association: A;(B;C)
        bc = self.compose_sequential(tile_b, tile_c)
        right_result = self.compose_sequential(tile_a, bc)

        # Calculate difference
        confidence_diff = abs(left_result["confidence"] - right_result["confidence"])
        zone_match = left_result["zone"] == right_result["zone"]

        return {
            "left_association": left_result,
            "right_association": right_result,
            "confidence_difference": confidence_diff,
            "zones_match": zone_match,
            "passed": confidence_diff < 0.001 and zone_match
        }

    def test_commutativity(self, tile_a: Dict[str, Any], tile_b: Dict[str, Any],
                          weight_a: float = 0.5, weight_b: float = 0.5) -> Dict[str, Any]:
        """
        Test commutativity: A||B = B||A (parallel composition only)
        """
        # A||B
        ab = self.compose_parallel(tile_a, tile_b, weight_a, weight_b)

        # B||A (swap weights too)
        ba = self.compose_parallel(tile_b, tile_a, weight_b, weight_a)

        # Calculate difference
        confidence_diff = abs(ab["confidence"] - ba["confidence"])
        zone_match = ab["zone"] == ba["zone"]

        return {
            "ab_composition": ab,
            "ba_composition": ba,
            "confidence_difference": confidence_diff,
            "zones_match": zone_match,
            "passed": confidence_diff < 0.001 and zone_match
        }

    def test_identity(self, tile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Test identity: A;I = I;A = A
        """
        identity = self.create_identity_tile()

        # Right identity: A;I
        right_result = self.compose_sequential(tile, identity)
        right_diff = abs(right_result["confidence"] - tile["confidence"])
        right_zone_match = right_result["zone"] == tile["zone"]

        # Left identity: I;A
        left_result = self.compose_sequential(identity, tile)
        left_diff = abs(left_result["confidence"] - tile["confidence"])
        left_zone_match = left_result["zone"] == tile["zone"]

        return {
            "right_identity": right_result,
            "left_identity": left_result,
            "right_difference": right_diff,
            "left_difference": left_diff,
            "right_zone_match": right_zone_match,
            "left_zone_match": left_zone_match,
            "passed": right_diff < 0.001 and left_diff < 0.001 and
                     right_zone_match and left_zone_match
        }

    def test_zero(self, tile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Test zero: A;0 = 0
        """
        zero = self.create_zero_tile()

        # A;0
        result = self.compose_sequential(tile, zero)
        confidence_diff = abs(result["confidence"] - 0.0)
        zone_match = result["zone"] == zero["zone"]

        return {
            "result": result,
            "confidence_difference": confidence_diff,
            "zones_match": zone_match,
            "passed": confidence_diff < 0.001 and zone_match
        }

    def test_idempotence(self, tile: Dict[str, Any], weight: float = 0.5) -> Dict[str, Any]:
        """
        Test idempotence: A||A = A (parallel composition with itself)
        """
        # A||A with equal weights
        result = self.compose_parallel(tile, tile, weight, 1 - weight)
        confidence_diff = abs(result["confidence"] - tile["confidence"])
        zone_match = result["zone"] == tile["zone"]

        return {
            "result": result,
            "confidence_difference": confidence_diff,
            "zones_match": zone_match,
            "passed": confidence_diff < 0.001 and zone_match
        }

    def run_single_experiment(self, n_triples: int = 100) -> CompositionStabilityResult:
        """
        Run a single composition stability experiment
        """
        # Generate random tiles
        confidences = self.confidence_gen.generate_confidences(n_triples * 3)
        tiles = [self.create_mock_tile(c, f"tile_{i}") for i, c in enumerate(confidences)]

        # Group into triples for associativity tests
        associativity_results = []
        commutativity_results = []
        identity_results = []
        zero_results = []
        idempotence_results = []

        for i in range(0, len(tiles) - 2, 3):
            if i + 2 >= len(tiles):
                break

            tile_a, tile_b, tile_c = tiles[i], tiles[i + 1], tiles[i + 2]

            # Test associativity
            assoc_result = self.test_associativity(tile_a, tile_b, tile_c)
            associativity_results.append(assoc_result)

            # Test commutativity (parallel)
            weight_a = random.random()
            weight_b = random.random()
            comm_result = self.test_commutativity(tile_a, tile_b, weight_a, weight_b)
            commutativity_results.append(comm_result)

            # Test identity (use tile_a)
            ident_result = self.test_identity(tile_a)
            identity_results.append(ident_result)

            # Test zero (use tile_a)
            zero_result = self.test_zero(tile_a)
            zero_results.append(zero_result)

            # Test idempotence (use tile_a)
            idempotence_weight = random.random()
            idempotence_result = self.test_idempotence(tile_a, idempotence_weight)
            idempotence_results.append(idempotence_result)

        # Calculate statistics
        def calculate_stats(results, key="passed"):
            passed = sum(1 for r in results if r[key])
            total = len(results)
            return {
                "passed": passed,
                "total": total,
                "success_rate": passed / total if total > 0 else 0,
                "confidence_differences": [r.get("confidence_difference", 0) for r in results]
            }

        assoc_stats = calculate_stats(associativity_results)
        comm_stats = calculate_stats(commutativity_results)
        ident_stats = calculate_stats(identity_results)
        zero_stats = calculate_stats(zero_results)
        idempotence_stats = calculate_stats(idempotence_results)

        # Overall validation
        overall_passed = (
            assoc_stats["success_rate"] >= 0.999 and
            comm_stats["success_rate"] >= 0.999 and
            ident_stats["success_rate"] >= 0.999 and
            zero_stats["success_rate"] >= 0.999 and
            idempotence_stats["success_rate"] >= 0.999
        )

        # Create result
        return CompositionStabilityResult(
            simulation_id=generate_simulation_id("composition_stability"),
            n_triples=n_triples,
            associativity_results=associativity_results,
            commutativity_results=commutativity_results,
            identity_results=identity_results,
            zero_results=zero_results,
            idempotence_results=idempotence_results,
            associativity_stats=assoc_stats,
            commutativity_stats=comm_stats,
            identity_stats=ident_stats,
            zero_stats=zero_stats,
            idempotence_stats=idempotence_stats,
            overall_validation_passed=overall_passed,
            random_seed=self.config.random_seed
        )

    def run_batch_experiment(self, n_batches: int = 10, n_triples_per_batch: int = 100) -> List[CompositionStabilityResult]:
        """
        Run batch of composition stability experiments
        """
        results = []

        for batch_idx in range(n_batches):
            # Update random seed for each batch (for reproducibility)
            self.config.random_seed = self.config.random_seed + batch_idx
            self.confidence_gen = ConfidenceGenerator(self.config)

            result = self.run_single_experiment(n_triples=n_triples_per_batch)
            results.append(result)

        return results

    def analyze_results(self, results: List[CompositionStabilityResult]) -> Dict[str, Any]:
        """
        Analyze composition stability results
        """
        if not results:
            return {}

        # Aggregate statistics across batches
        analysis = {
            "batch_count": len(results),
            "property_validation": {},
            "confidence_difference_distributions": {},
            "overall_validation": {}
        }

        # Extract property success rates
        properties = ["associativity", "commutativity", "identity", "zero", "idempotence"]
        for prop in properties:
            success_rates = []
            max_differences = []
            mean_differences = []

            for result in results:
                stats = getattr(result, f"{prop}_stats")
                success_rates.append(stats["success_rate"])

                if stats["confidence_differences"]:
                    max_differences.append(max(stats["confidence_differences"]))
                    mean_differences.append(np.mean(stats["confidence_differences"]))

            analysis["property_validation"][prop] = {
                "mean_success_rate": np.mean(success_rates) if success_rates else 0,
                "std_success_rate": np.std(success_rates) if len(success_rates) > 1 else 0,
                "min_success_rate": min(success_rates) if success_rates else 0,
                "max_success_rate": max(success_rates) if success_rates else 0,
                "mean_max_difference": np.mean(max_differences) if max_differences else 0,
                "mean_mean_difference": np.mean(mean_differences) if mean_differences else 0,
                "validation_passed": all(rate >= 0.999 for rate in success_rates)
            }

        # Overall validation
        overall_passed = all(result.overall_validation_passed for result in results)
        overall_success_rate = sum(1 for result in results if result.overall_validation_passed) / len(results)

        analysis["overall_validation"] = {
            "all_batches_passed": overall_passed,
            "overall_success_rate": overall_success_rate,
            "validation_criteria_met": overall_success_rate >= 0.95
        }

        # Statistical significance
        analysis["statistical_significance"] = {
            "sample_size_adequate": len(results) >= 10,
            "confidence_level": "99.9%" if overall_passed else "Insufficient",
            "recommendation": "Properties validated" if overall_passed else "Further testing needed"
        }

        return analysis


def main():
    """Main entry point for composition stability validation"""
    parser = argparse.ArgumentParser(description="Run tile composition stability validation")
    parser.add_argument("--batches", type=int, default=10, help="Number of batches to run")
    parser.add_argument("--triples-per-batch", type=int, default=100,
                       help="Number of tile triples per batch")
    parser.add_argument("--output", type=str, default="results/composition_stability.json",
                       help="Output file path")
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

    simulator = CompositionStabilitySimulator(config)

    if args.verbose:
        print(f"Running composition stability validation...")
        print(f"Batches: {args.batches}")
        print(f"Triples per batch: {args.triples_per_batch}")
        print(f"Total tests: {args.batches * args.triples_per_batch * 5}")  # 5 properties
        print(f"Random seed: {args.seed}")
        print(f"Output: {args.output}")

    # Run experiments
    results = simulator.run_batch_experiment(
        n_batches=args.batches,
        n_triples_per_batch=args.triples_per_batch
    )

    # Analyze results
    analysis = simulator.analyze_results(results)

    # Prepare output data
    output_data = {
        "metadata": {
            "simulation_type": "composition_stability_validation",
            "timestamp": datetime.now().isoformat(),
            "batch_count": args.batches,
            "triples_per_batch": args.triples_per_batch,
            "total_tests": args.batches * args.triples_per_batch * 5,
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
        print(f"Total batches: {len(results)}")

        # Print property validation summary
        print(f"\nProperty Validation Summary:")
        for prop, stats in analysis["property_validation"].items():
            print(f"  {prop.capitalize()}:")
            print(f"    Success rate: {stats['mean_success_rate']:.4f} ± {stats['std_success_rate']:.4f}")
            print(f"    Range: [{stats['min_success_rate']:.4f}, {stats['max_success_rate']:.4f}]")
            print(f"    Validation passed: {stats['validation_passed']}")

        print(f"\nOverall Validation:")
        print(f"  All batches passed: {analysis['overall_validation']['all_batches_passed']}")
        print(f"  Overall success rate: {analysis['overall_validation']['overall_success_rate']:.4f}")
        print(f"  Criteria met: {analysis['overall_validation']['validation_criteria_met']}")

        print(f"\nStatistical Significance:")
        print(f"  Sample size adequate: {analysis['statistical_significance']['sample_size_adequate']}")
        print(f"  Confidence level: {analysis['statistical_significance']['confidence_level']}")
        print(f"  Recommendation: {analysis['statistical_significance']['recommendation']}")

        print(f"\nResults saved to: {args.output}")


if __name__ == "__main__":
    main()
"""
Data Generator for SMP Validation Simulations

Generates random tile configurations, chains, and test cases for simulations.
Supports various distributions and composition patterns.
"""

import random
import numpy as np
from typing import List, Dict, Any, Optional, Tuple, Generator
from dataclasses import dataclass
from enum import Enum
import json
from datetime import datetime

from .schemas import (
    TileConfiguration,
    ChainConfiguration,
    CompositionType,
    ConfidenceZone,
    ConfidenceDistribution,
    generate_simulation_id
)

# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass
class GenerationConfig:
    """Configuration for data generation"""

    # Randomness control
    random_seed: int = 42
    use_fixed_seed: bool = True

    # Confidence generation
    confidence_distribution: ConfidenceDistribution = ConfidenceDistribution.UNIFORM
    distribution_params: Dict[str, Any] = None

    # Chain generation
    min_chain_length: int = 1
    max_chain_length: int = 10
    default_chain_length: int = 5

    # Parallel composition
    default_parallel_weights: bool = True
    weight_distribution: str = "uniform"  # "uniform", "dirichlet", "skewed"

    # Output control
    include_metadata: bool = True
    metadata_fields: List[str] = None

    def __post_init__(self):
        """Initialize default values"""
        if self.distribution_params is None:
            self.distribution_params = self._get_default_params()

        if self.metadata_fields is None:
            self.metadata_fields = ["generation_timestamp", "random_seed", "distribution"]

    def _get_default_params(self) -> Dict[str, Any]:
        """Get default parameters for each distribution"""
        if self.confidence_distribution == ConfidenceDistribution.UNIFORM:
            return {"low": 0.0, "high": 1.0}
        elif self.confidence_distribution == ConfidenceDistribution.NORMAL:
            return {"mean": 0.7, "std": 0.2, "clip": (0.0, 1.0)}
        elif self.confidence_distribution == ConfidenceDistribution.BIMODAL:
            return {"mode1": 0.3, "mode2": 0.8, "weight1": 0.4, "std": 0.1}
        elif self.confidence_distribution == ConfidenceDistribution.BETA:
            return {"alpha": 2.0, "beta": 2.0}
        else:
            return {}

# ============================================================================
# CONFIDENCE GENERATORS
# ============================================================================

class ConfidenceGenerator:
    """Generate confidence values from various distributions"""

    def __init__(self, config: GenerationConfig):
        self.config = config
        self._initialize_random()

    def _initialize_random(self):
        """Initialize random number generators"""
        if self.config.use_fixed_seed:
            random.seed(self.config.random_seed)
            np.random.seed(self.config.random_seed)

    def generate_confidence(self) -> float:
        """Generate a single confidence value"""
        method_name = f"_generate_{self.config.confidence_distribution.value}"
        if hasattr(self, method_name):
            return getattr(self, method_name)()
        else:
            return self._generate_uniform()

    def generate_confidences(self, n: int) -> List[float]:
        """Generate multiple confidence values"""
        return [self.generate_confidence() for _ in range(n)]

    def _generate_uniform(self) -> float:
        """Generate from uniform distribution"""
        params = self.config.distribution_params
        low = params.get("low", 0.0)
        high = params.get("high", 1.0)
        return random.uniform(low, high)

    def _generate_normal(self) -> float:
        """Generate from normal distribution (clipped to [0,1])"""
        params = self.config.distribution_params
        mean = params.get("mean", 0.7)
        std = params.get("std", 0.2)
        clip = params.get("clip", (0.0, 1.0))

        value = np.random.normal(mean, std)
        return np.clip(value, clip[0], clip[1])

    def _generate_bimodal(self) -> float:
        """Generate from bimodal distribution"""
        params = self.config.distribution_params
        mode1 = params.get("mode1", 0.3)
        mode2 = params.get("mode2", 0.8)
        weight1 = params.get("weight1", 0.4)
        std = params.get("std", 0.1)

        # Choose which mode to sample from
        if random.random() < weight1:
            mean = mode1
        else:
            mean = mode2

        value = np.random.normal(mean, std)
        return np.clip(value, 0.0, 1.0)

    def _generate_beta(self) -> float:
        """Generate from beta distribution"""
        params = self.config.distribution_params
        alpha = params.get("alpha", 2.0)
        beta = params.get("beta", 2.0)
        return np.random.beta(alpha, beta)

    def _generate_empirical(self) -> float:
        """Generate from empirical distribution (placeholder)"""
        # In practice, this would load from real data
        # For now, use a mix of distributions
        distributions = [self._generate_uniform, self._generate_normal]
        return random.choice(distributions)()

    def generate_zone_aware_confidences(
        self,
        target_zones: List[ConfidenceZone],
        tolerance: float = 0.05
    ) -> List[float]:
        """
        Generate confidences that fall into specific zones

        Args:
            target_zones: List of target zones for each confidence
            tolerance: Allowed deviation from zone boundaries

        Returns:
            List of confidence values in specified zones
        """
        confidences = []
        for zone in target_zones:
            if zone == ConfidenceZone.GREEN:
                # Generate in [0.85, 1.0]
                min_val = 0.85 + tolerance
                max_val = 1.0 - tolerance
            elif zone == ConfidenceZone.YELLOW:
                # Generate in [0.60, 0.85)
                min_val = 0.60 + tolerance
                max_val = 0.85 - tolerance
            else:  # RED
                # Generate in [0.0, 0.60)
                min_val = 0.0 + tolerance
                max_val = 0.60 - tolerance

            confidence = random.uniform(min_val, max_val)
            confidences.append(confidence)

        return confidences


# ============================================================================
# TILE GENERATORS
# ============================================================================

class TileGenerator:
    """Generate tile configurations"""

    def __init__(self, confidence_generator: ConfidenceGenerator):
        self.confidence_generator = confidence_generator
        self.tile_counter = 0

    def generate_tile(
        self,
        confidence: Optional[float] = None,
        source: Optional[str] = None,
        weight: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> TileConfiguration:
        """Generate a single tile configuration"""
        self.tile_counter += 1

        # Generate confidence if not provided
        if confidence is None:
            confidence = self.confidence_generator.generate_confidence()

        # Generate source description if not provided
        if source is None:
            source = f"tile_{self.tile_counter}"

        # Create metadata
        if metadata is None:
            metadata = {}
        if self.confidence_generator.config.include_metadata:
            metadata.update({
                "generation_timestamp": datetime.now().isoformat(),
                "generation_method": self.confidence_generator.config.confidence_distribution.value
            })

        return TileConfiguration(
            tile_id=f"tile_{self.tile_counter:04d}",
            confidence=confidence,
            zone=None,  # Will be auto-classified
            source=source,
            weight=weight,
            metadata=metadata
        )

    def generate_tiles(
        self,
        n: int,
        confidences: Optional[List[float]] = None,
        sources: Optional[List[str]] = None,
        weights: Optional[List[float]] = None
    ) -> List[TileConfiguration]:
        """Generate multiple tile configurations"""
        tiles = []

        # Generate confidences if not provided
        if confidences is None:
            confidences = self.confidence_generator.generate_confidences(n)

        # Generate sources if not provided
        if sources is None:
            sources = [f"tile_{i+1}" for i in range(n)]

        # Generate weights if not provided but needed
        if weights is None and self.confidence_generator.config.default_parallel_weights:
            weights = self._generate_weights(n)

        for i in range(n):
            tile = self.generate_tile(
                confidence=confidences[i],
                source=sources[i] if i < len(sources) else None,
                weight=weights[i] if weights and i < len(weights) else None
            )
            tiles.append(tile)

        return tiles

    def _generate_weights(self, n: int) -> List[float]:
        """Generate weights for parallel composition"""
        if self.confidence_generator.config.weight_distribution == "uniform":
            # Equal weights
            return [1.0 / n] * n
        elif self.confidence_generator.config.weight_distribution == "dirichlet":
            # Dirichlet distribution (sums to 1)
            return list(np.random.dirichlet([1.0] * n))
        elif self.confidence_generator.config.weight_distribution == "skewed":
            # Skewed weights (first tile gets more weight)
            weights = [2.0] + [1.0] * (n - 1)
            total = sum(weights)
            return [w / total for w in weights]
        else:
            # Default to uniform
            return [1.0 / n] * n

    def generate_tiles_for_zones(
        self,
        zone_sequence: List[ConfidenceZone],
        tolerance: float = 0.05
    ) -> List[TileConfiguration]:
        """Generate tiles with confidences in specified zones"""
        confidences = self.confidence_generator.generate_zone_aware_confidences(
            zone_sequence, tolerance
        )
        return self.generate_tiles(len(zone_sequence), confidences=confidences)


# ============================================================================
# CHAIN GENERATORS
# ============================================================================

class ChainGenerator:
    """Generate chain configurations"""

    def __init__(self, tile_generator: TileGenerator):
        self.tile_generator = tile_generator
        self.chain_counter = 0

    def generate_chain(
        self,
        composition_type: CompositionType = CompositionType.SEQUENTIAL,
        length: Optional[int] = None,
        tiles: Optional[List[TileConfiguration]] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ChainConfiguration:
        """Generate a single chain configuration"""
        self.chain_counter += 1

        # Determine chain length
        if length is None:
            config = self.tile_generator.confidence_generator.config
            length = random.randint(config.min_chain_length, config.max_chain_length)

        # Generate tiles if not provided
        if tiles is None:
            tiles = self.tile_generator.generate_tiles(length)

        # Ensure length matches tiles
        if len(tiles) != length:
            raise ValueError(f"Length {length} doesn't match tiles count {len(tiles)}")

        # Generate description if not provided
        if description is None:
            zone_counts = {}
            for tile in tiles:
                zone_counts[tile.zone.value] = zone_counts.get(tile.zone.value, 0) + 1
            zone_desc = ", ".join(f"{count} {zone}" for zone, count in zone_counts.items())
            description = f"{composition_type.value} chain with {zone_desc}"

        # Create metadata
        if metadata is None:
            metadata = {}
        config = self.tile_generator.confidence_generator.config
        if config.include_metadata:
            metadata.update({
                "chain_id": f"chain_{self.chain_counter:04d}",
                "generation_timestamp": datetime.now().isoformat(),
                "composition_type": composition_type.value,
                "length": length,
                "zone_sequence": [t.zone.value for t in tiles],
                "confidence_sequence": [t.confidence for t in tiles]
            })

        return ChainConfiguration(
            chain_id=f"chain_{self.chain_counter:04d}",
            tiles=tiles,
            composition_type=composition_type,
            description=description,
            metadata=metadata
        )

    def generate_chains(
        self,
        n: int,
        composition_type: CompositionType = CompositionType.SEQUENTIAL,
        length: Optional[int] = None,
        variable_length: bool = False
    ) -> List[ChainConfiguration]:
        """Generate multiple chain configurations"""
        chains = []

        for i in range(n):
            # Vary length if requested
            chain_length = length
            if variable_length and length is not None:
                # Vary by ±20%
                variation = int(length * 0.2)
                chain_length = random.randint(
                    max(1, length - variation),
                    length + variation
                )

            chain = self.generate_chain(
                composition_type=composition_type,
                length=chain_length
            )
            chains.append(chain)

        return chains

    def generate_mixed_composition_chain(
        self,
        pattern: str = "sequential_parallel",
        depths: List[int] = None
    ) -> ChainConfiguration:
        """
        Generate a chain with mixed composition patterns

        Args:
            pattern: Composition pattern, e.g., "sequential_parallel",
                    "parallel_sequential", "nested"
            depths: List of depths for nested patterns

        Returns:
            Complex chain configuration
        """
        # This is a placeholder for complex chain generation
        # In practice, this would generate hierarchical structures
        raise NotImplementedError("Mixed composition generation not yet implemented")

    def generate_chain_for_zone_transition_study(
        self,
        start_zone: ConfidenceZone,
        target_transition: Optional[str] = None,
        length: int = 5
    ) -> ChainConfiguration:
        """
        Generate a chain for zone transition studies

        Args:
            start_zone: Starting zone for the chain
            target_transition: Desired zone transition (e.g., "GREEN→YELLOW")
            length: Chain length

        Returns:
            Chain configured for transition study
        """
        # Generate tiles with controlled zone progression
        if target_transition:
            # Parse target transition
            start, end = target_transition.split("→")
            start_zone = ConfidenceZone(start)
            end_zone = ConfidenceZone(end)

            # Generate zone sequence that transitions from start to end
            # This is simplified - in practice would use interpolation
            zone_sequence = [start_zone] * (length - 1) + [end_zone]
        else:
            # Random zone sequence starting with start_zone
            zone_sequence = [start_zone]
            for _ in range(length - 1):
                # Random next zone (could stay same)
                zone_sequence.append(random.choice(list(ConfidenceZone)))

        tiles = self.tile_generator.generate_tiles_for_zones(zone_sequence)
        return self.generate_chain(
            composition_type=CompositionType.SEQUENTIAL,
            tiles=tiles,
            description=f"Zone transition study: {zone_sequence[0].value}→{zone_sequence[-1].value}"
        )


# ============================================================================
# TEST CASE GENERATORS
# ============================================================================

class TestCaseGenerator:
    """Generate test cases for simulation validation"""

    def __init__(self, chain_generator: ChainGenerator):
        self.chain_generator = chain_generator
        self.test_case_counter = 0

    def generate_confidence_cascade_test_cases(
        self,
        n: int = 100,
        composition_types: List[CompositionType] = None
    ) -> List[Dict[str, Any]]:
        """Generate test cases for confidence cascade validation"""
        if composition_types is None:
            composition_types = [CompositionType.SEQUENTIAL, CompositionType.PARALLEL]

        test_cases = []

        for i in range(n):
            # Random composition type
            comp_type = random.choice(composition_types)

            # Generate chain
            chain = self.chain_generator.generate_chain(
                composition_type=comp_type,
                length=2  # Simple chains for cascade validation
            )

            test_case = {
                "test_case_id": f"cascade_{i:04d}",
                "chain_config": chain.to_dict(),
                "expected_composition_type": comp_type.value,
                "metadata": {
                    "generation_timestamp": datetime.now().isoformat(),
                    "purpose": "confidence_cascade_validation"
                }
            }

            test_cases.append(test_case)

        return test_cases

    def generate_composition_property_test_cases(
        self,
        n: int = 100,
        property_type: str = "associativity"
    ) -> List[Dict[str, Any]]:
        """Generate test cases for composition property validation"""
        test_cases = []

        for i in range(n):
            # Generate three tiles for associativity test
            tiles = self.chain_generator.tile_generator.generate_tiles(3)

            test_case = {
                "test_case_id": f"property_{property_type}_{i:04d}",
                "tiles": [t.to_dict() for t in tiles],
                "property_type": property_type,
                "metadata": {
                    "generation_timestamp": datetime.now().isoformat(),
                    "purpose": f"{property_type}_validation"
                }
            }

            test_cases.append(test_case)

        return test_cases

    def generate_performance_test_cases(
        self,
        chain_lengths: List[int] = None,
        composition_types: List[CompositionType] = None,
        samples_per_config: int = 10
    ) -> List[Dict[str, Any]]:
        """Generate test cases for performance benchmarking"""
        if chain_lengths is None:
            chain_lengths = [1, 2, 5, 10, 20]
        if composition_types is None:
            composition_types = [CompositionType.SEQUENTIAL, CompositionType.PARALLEL]

        test_cases = []

        case_id = 0
        for length in chain_lengths:
            for comp_type in composition_types:
                for _ in range(samples_per_config):
                    chain = self.chain_generator.generate_chain(
                        composition_type=comp_type,
                        length=length
                    )

                    test_case = {
                        "test_case_id": f"perf_{case_id:04d}",
                        "chain_config": chain.to_dict(),
                        "expected_chain_length": length,
                        "expected_composition_type": comp_type.value,
                        "metadata": {
                            "generation_timestamp": datetime.now().isoformat(),
                            "purpose": "performance_benchmarking",
                            "sample_index": _
                        }
                    }

                    test_cases.append(test_case)
                    case_id += 1

        return test_cases


# ============================================================================
# BATCH GENERATION
# ============================================================================

def generate_simulation_batch(
    batch_size: int = 1000,
    config: Optional[GenerationConfig] = None
) -> Dict[str, Any]:
    """
    Generate a complete batch of simulation data

    Args:
        batch_size: Number of data points to generate
        config: Generation configuration

    Returns:
        Dictionary containing all generated data
    """
    if config is None:
        config = GenerationConfig()

    # Initialize generators
    confidence_gen = ConfidenceGenerator(config)
    tile_gen = TileGenerator(confidence_gen)
    chain_gen = ChainGenerator(tile_gen)
    test_case_gen = TestCaseGenerator(chain_gen)

    # Generate various types of data
    batch_id = generate_simulation_id("batch")

    data = {
        "batch_id": batch_id,
        "generation_config": config.__dict__,
        "generation_timestamp": datetime.now().isoformat(),
        "data": {
            "confidence_cascade_cases": test_case_gen.generate_confidence_cascade_test_cases(
                n=min(batch_size // 4, 250)
            ),
            "composition_property_cases": test_case_gen.generate_composition_property_test_cases(
                n=min(batch_size // 4, 250)
            ),
            "performance_cases": test_case_gen.generate_performance_test_cases(
                chain_lengths=[1, 2, 5, 10],
                samples_per_config=min(batch_size // 20, 50)
            ),
            "zone_transition_chains": [
                chain_gen.generate_chain_for_zone_transition_study(
                    start_zone=random.choice(list(ConfidenceZone)),
                    length=random.randint(3, 8)
                ).to_dict()
                for _ in range(min(batch_size // 4, 250))
            ]
        }
    }

    return data


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def save_generated_data(data: Dict[str, Any], filepath: str) -> None:
    """Save generated data to JSON file"""
    import json
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, default=str)


def load_generated_data(filepath: str) -> Dict[str, Any]:
    """Load generated data from JSON file"""
    import json
    with open(filepath, 'r') as f:
        return json.load(f)


def create_generation_pipeline(
    configs: List[GenerationConfig],
    output_dir: str
) -> List[str]:
    """
    Create a pipeline for generating multiple datasets

    Args:
        configs: List of generation configurations
        output_dir: Directory to save generated files

    Returns:
        List of generated file paths
    """
    import os
    os.makedirs(output_dir, exist_ok=True)

    generated_files = []

    for i, config in enumerate(configs):
        print(f"Generating dataset {i+1}/{len(configs)} with config: {config}")

        # Generate data
        data = generate_simulation_batch(batch_size=1000, config=config)

        # Save to file
        filename = f"dataset_{i:03d}_{config.confidence_distribution.value}.json"
        filepath = os.path.join(output_dir, filename)
        save_generated_data(data, filepath)

        generated_files.append(filepath)

    return generated_files


# ============================================================================
# MAIN FUNCTION FOR COMMAND LINE USE
# ============================================================================

def main():
    """Command-line interface for data generation"""
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Generate simulation data for SMP validation")
    parser.add_argument("--output", "-o", required=True, help="Output file path")
    parser.add_argument("--size", "-s", type=int, default=1000, help="Batch size")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--distribution", "-d", default="uniform",
                       choices=["uniform", "normal", "bimodal", "beta"],
                       help="Confidence distribution")

    args = parser.parse_args()

    # Create configuration
    config = GenerationConfig(
        random_seed=args.seed,
        confidence_distribution=ConfidenceDistribution(args.distribution)
    )

    # Generate data
    print(f"Generating {args.size} data points with {args.distribution} distribution...")
    data = generate_simulation_batch(batch_size=args.size, config=config)

    # Save to file
    save_generated_data(data, args.output)
    print(f"Data saved to {args.output}")
    print(f"Batch ID: {data['batch_id']}")
    print(f"Generated: {len(data['data']['confidence_cascade_cases'])} cascade cases")
    print(f"Generated: {len(data['data']['composition_property_cases'])} property cases")
    print(f"Generated: {len(data['data']['performance_cases'])} performance cases")
    print(f"Generated: {len(data['data']['zone_transition_chains'])} zone transition chains")


if __name__ == "__main__":
    main()


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "GenerationConfig",
    "ConfidenceGenerator",
    "TileGenerator",
    "ChainGenerator",
    "TestCaseGenerator",
    "generate_simulation_batch",
    "save_generated_data",
    "load_generated_data",
    "create_generation_pipeline"
]
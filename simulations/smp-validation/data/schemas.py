"""
Data Schemas for SMP Validation Simulations

Defines the data structures for simulation inputs, outputs, and results.
All schemas are dataclasses for easy serialization and type checking.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum
from datetime import datetime
import json

# ============================================================================
# ENUM DEFINITIONS
# ============================================================================

class ConfidenceZone(str, Enum):
    """Confidence zone classification"""
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"

class CompositionType(str, Enum):
    """Type of tile composition"""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    MIXED = "mixed"
    CONDITIONAL = "conditional"

class ConfidenceDistribution(str, Enum):
    """Distribution of confidence values"""
    UNIFORM = "uniform"
    NORMAL = "normal"
    BIMODAL = "bimodal"
    BETA = "beta"
    EMPIRICAL = "empirical"

class TileImplementation(str, Enum):
    """Implementation type for performance testing"""
    MOCK = "mock"
    REAL = "real"
    OPTIMIZED = "optimized"

# ============================================================================
# CORE DATA SCHEMAS
# ============================================================================

@dataclass
class TileConfiguration:
    """Configuration for a single tile in simulation"""

    tile_id: str
    confidence: float  # ∈ [0, 1]
    zone: ConfidenceZone
    source: str  # Description of what generates confidence
    weight: Optional[float] = None  # For parallel composition
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Validate confidence range"""
        if not 0 <= self.confidence <= 1:
            raise ValueError(f"Confidence must be in [0, 1], got {self.confidence}")

        # Auto-classify zone if not provided
        if self.zone is None:
            self.zone = self._classify_zone()

    def _classify_zone(self) -> ConfidenceZone:
        """Classify confidence into zone"""
        if self.confidence >= 0.85:
            return ConfidenceZone.GREEN
        elif self.confidence >= 0.60:
            return ConfidenceZone.YELLOW
        else:
            return ConfidenceZone.RED

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "tile_id": self.tile_id,
            "confidence": self.confidence,
            "zone": self.zone.value,
            "source": self.source,
            "weight": self.weight,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TileConfiguration":
        """Create from dictionary"""
        return cls(
            tile_id=data["tile_id"],
            confidence=data["confidence"],
            zone=ConfidenceZone(data["zone"]),
            source=data["source"],
            weight=data.get("weight"),
            metadata=data.get("metadata", {})
        )


@dataclass
class ChainConfiguration:
    """Configuration for a chain of tiles"""

    chain_id: str
    tiles: List[TileConfiguration]
    composition_type: CompositionType
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Validate chain configuration"""
        if not self.tiles:
            raise ValueError("Chain must have at least one tile")

        # Validate weights for parallel composition
        if self.composition_type == CompositionType.PARALLEL:
            weights = [t.weight for t in self.tiles if t.weight is not None]
            if weights and len(weights) != len(self.tiles):
                raise ValueError("All tiles must have weights for parallel composition")
            if weights and abs(sum(weights) - 1.0) > 0.001:
                raise ValueError(f"Weights must sum to 1.0, got {sum(weights)}")

    @property
    def length(self) -> int:
        """Number of tiles in chain"""
        return len(self.tiles)

    @property
    def confidence_sequence(self) -> List[float]:
        """Sequence of tile confidences"""
        return [t.confidence for t in self.tiles]

    @property
    def zone_sequence(self) -> List[ConfidenceZone]:
        """Sequence of tile zones"""
        return [t.zone for t in self.tiles]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "chain_id": self.chain_id,
            "tiles": [t.to_dict() for t in self.tiles],
            "composition_type": self.composition_type.value,
            "description": self.description,
            "metadata": self.metadata,
            "length": self.length,
            "confidence_sequence": self.confidence_sequence,
            "zone_sequence": [z.value for z in self.zone_sequence]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ChainConfiguration":
        """Create from dictionary"""
        tiles = [TileConfiguration.from_dict(t) for t in data["tiles"]]
        return cls(
            chain_id=data["chain_id"],
            tiles=tiles,
            composition_type=CompositionType(data["composition_type"]),
            description=data.get("description", ""),
            metadata=data.get("metadata", {})
        )


# ============================================================================
# SIMULATION RESULT SCHEMAS
# ============================================================================

@dataclass
class ConfidenceCascadeResult:
    """Result of confidence cascade simulation"""

    # Configuration
    simulation_id: str
    chain_config: ChainConfiguration

    # Input values
    input_confidences: List[float]
    input_zones: List[ConfidenceZone]

    # Computed values
    actual_confidence: float
    expected_confidence: float
    absolute_error: float
    relative_error: float

    # Zone classification
    output_zone: ConfidenceZone
    zone_transition: str  # e.g., "GREEN→YELLOW"

    # Optional fields with defaults
    weights: Optional[List[float]] = None
    confidence_interval_95: Optional[Tuple[float, float]] = None
    p_value: Optional[float] = None
    random_seed: Optional[int] = None
    computation_time_ms: Optional[float] = None

    # Metadata with defaults
    timestamp: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        """Compute derived values"""
        if self.absolute_error is None and self.actual_confidence is not None and self.expected_confidence is not None:
            self.absolute_error = abs(self.actual_confidence - self.expected_confidence)

        if self.relative_error is None and self.expected_confidence != 0:
            self.relative_error = self.absolute_error / self.expected_confidence

        if self.zone_transition is None and self.input_zones and self.output_zone:
            start_zone = self.input_zones[0].value if len(self.input_zones) == 1 else "MIXED"
            self.zone_transition = f"{start_zone}→{self.output_zone.value}"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "simulation_id": self.simulation_id,
            "chain_config": self.chain_config.to_dict(),
            "input_confidences": self.input_confidences,
            "input_zones": [z.value for z in self.input_zones],
            "weights": self.weights,
            "actual_confidence": self.actual_confidence,
            "expected_confidence": self.expected_confidence,
            "absolute_error": self.absolute_error,
            "relative_error": self.relative_error,
            "output_zone": self.output_zone.value,
            "zone_transition": self.zone_transition,
            "confidence_interval_95": self.confidence_interval_95,
            "p_value": self.p_value,
            "timestamp": self.timestamp.isoformat(),
            "random_seed": self.random_seed,
            "computation_time_ms": self.computation_time_ms
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConfidenceCascadeResult":
        """Create from dictionary"""
        # Parse timestamp
        timestamp = datetime.fromisoformat(data["timestamp"]) if "timestamp" in data else datetime.now()

        # Parse zones
        input_zones = [ConfidenceZone(z) for z in data["input_zones"]]
        output_zone = ConfidenceZone(data["output_zone"])

        # Parse chain config
        chain_config = ChainConfiguration.from_dict(data["chain_config"])

        return cls(
            simulation_id=data["simulation_id"],
            chain_config=chain_config,
            input_confidences=data["input_confidences"],
            input_zones=input_zones,
            weights=data.get("weights"),
            actual_confidence=data["actual_confidence"],
            expected_confidence=data["expected_confidence"],
            absolute_error=data["absolute_error"],
            relative_error=data["relative_error"],
            output_zone=output_zone,
            zone_transition=data["zone_transition"],
            confidence_interval_95=data.get("confidence_interval_95"),
            p_value=data.get("p_value"),
            timestamp=timestamp,
            random_seed=data.get("random_seed"),
            computation_time_ms=data.get("computation_time_ms")
        )


@dataclass
class ZoneTransitionResult:
    """Result of zone transition simulation"""

    # Configuration
    simulation_id: str
    chain_length: int
    sample_size: int

    # Transition analysis
    transition_matrix: Dict[str, Dict[str, float]]  # P(zone_i → zone_j)
    steady_state_probabilities: Dict[str, float]  # Limiting distribution

    # Stability metrics
    green_preservation_prob: float  # P(stay GREEN | start GREEN)
    red_avoidance_prob: float  # P(avoid RED | start not RED)
    expected_chain_zone: ConfidenceZone  # Most likely final zone

    # Statistical significance
    confidence_intervals: Dict[str, Tuple[float, float]]  # For key probabilities
    p_values: Dict[str, float]  # For hypothesis tests

    # Chain statistics
    chain_statistics: Dict[str, Any] = field(default_factory=dict)

    # Metadata
    timestamp: datetime = field(default_factory=datetime.now)
    random_seed: Optional[int] = None
    computation_time_ms: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "simulation_id": self.simulation_id,
            "chain_length": self.chain_length,
            "sample_size": self.sample_size,
            "transition_matrix": self.transition_matrix,
            "steady_state_probabilities": self.steady_state_probabilities,
            "green_preservation_prob": self.green_preservation_prob,
            "red_avoidance_prob": self.red_avoidance_prob,
            "expected_chain_zone": self.expected_chain_zone.value,
            "confidence_intervals": self.confidence_intervals,
            "p_values": self.p_values,
            "chain_statistics": self.chain_statistics,
            "timestamp": self.timestamp.isoformat(),
            "random_seed": self.random_seed,
            "computation_time_ms": self.computation_time_ms
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ZoneTransitionResult":
        """Create from dictionary"""
        # Parse timestamp
        timestamp = datetime.fromisoformat(data["timestamp"]) if "timestamp" in data else datetime.now()

        # Parse expected chain zone
        expected_chain_zone = ConfidenceZone(data["expected_chain_zone"])

        return cls(
            simulation_id=data["simulation_id"],
            chain_length=data["chain_length"],
            sample_size=data["sample_size"],
            transition_matrix=data["transition_matrix"],
            steady_state_probabilities=data["steady_state_probabilities"],
            green_preservation_prob=data["green_preservation_prob"],
            red_avoidance_prob=data["red_avoidance_prob"],
            expected_chain_zone=expected_chain_zone,
            confidence_intervals=data["confidence_intervals"],
            p_values=data["p_values"],
            chain_statistics=data.get("chain_statistics", {}),
            timestamp=timestamp,
            random_seed=data.get("random_seed"),
            computation_time_ms=data.get("computation_time_ms")
        )


@dataclass
class CompositionStabilityResult:
    """Result of composition stability simulation"""

    # Configuration
    simulation_id: str
    sample_size: int

    # Property validation results
    associativity_results: Dict[str, Any]  # Δ values and statistics
    commutativity_results: Dict[str, Any]  # Δ values and statistics
    identity_results: Dict[str, Any]      # Δ values and statistics
    zero_results: Dict[str, Any]          # Δ values and statistics
    idempotence_results: Dict[str, Any]   # Δ values and statistics

    # Statistical summary
    property_success_rates: Dict[str, float]  # Success rate for each property
    mean_errors: Dict[str, float]            # Mean Δ for each property
    max_errors: Dict[str, float]             # Max Δ for each property

    # Validation criteria
    meets_criteria: Dict[str, bool]  # Whether each property meets validation criteria

    # Metadata
    timestamp: datetime = field(default_factory=datetime.now)
    random_seed: Optional[int] = None
    computation_time_ms: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "simulation_id": self.simulation_id,
            "sample_size": self.sample_size,
            "associativity_results": self.associativity_results,
            "commutativity_results": self.commutativity_results,
            "identity_results": self.identity_results,
            "zero_results": self.zero_results,
            "idempotence_results": self.idempotence_results,
            "property_success_rates": self.property_success_rates,
            "mean_errors": self.mean_errors,
            "max_errors": self.max_errors,
            "meets_criteria": self.meets_criteria,
            "timestamp": self.timestamp.isoformat(),
            "random_seed": self.random_seed,
            "computation_time_ms": self.computation_time_ms
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CompositionStabilityResult":
        """Create from dictionary"""
        # Parse timestamp
        timestamp = datetime.fromisoformat(data["timestamp"]) if "timestamp" in data else datetime.now()

        return cls(
            simulation_id=data["simulation_id"],
            sample_size=data["sample_size"],
            associativity_results=data["associativity_results"],
            commutativity_results=data["commutativity_results"],
            identity_results=data["identity_results"],
            zero_results=data["zero_results"],
            idempotence_results=data["idempotence_results"],
            property_success_rates=data["property_success_rates"],
            mean_errors=data["mean_errors"],
            max_errors=data["max_errors"],
            meets_criteria=data["meets_criteria"],
            timestamp=timestamp,
            random_seed=data.get("random_seed"),
            computation_time_ms=data.get("computation_time_ms")
        )


@dataclass
class PerformanceMetrics:
    """Result of performance simulation"""

    # Configuration
    simulation_id: str
    chain_length: int
    composition_type: CompositionType
    tile_implementation: TileImplementation
    sample_size: int

    # Time metrics (seconds)
    mean_execution_time: float
    median_execution_time: float
    p95_execution_time: float
    p99_execution_time: float
    time_std_dev: float

    # Memory metrics (bytes)
    memory_per_tile: float
    total_memory: float
    memory_overhead: float  # vs theoretical minimum

    # Scaling characteristics
    time_complexity: str  # "O(1)", "O(n)", "O(n²)"
    memory_complexity: str

    # Statistical validation
    confidence_intervals: Dict[str, Tuple[float, float]]
    outlier_count: int  # Number of outliers (> 3σ)

    # Optional fields with defaults
    parallel_efficiency: Optional[float] = None  # Speedup / core_count
    hardware_spec: Dict[str, Any] = field(default_factory=dict)
    random_seed: Optional[int] = None

    # Metadata with defaults
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "simulation_id": self.simulation_id,
            "chain_length": self.chain_length,
            "composition_type": self.composition_type.value,
            "tile_implementation": self.tile_implementation.value,
            "sample_size": self.sample_size,
            "mean_execution_time": self.mean_execution_time,
            "median_execution_time": self.median_execution_time,
            "p95_execution_time": self.p95_execution_time,
            "p99_execution_time": self.p99_execution_time,
            "time_std_dev": self.time_std_dev,
            "memory_per_tile": self.memory_per_tile,
            "total_memory": self.total_memory,
            "memory_overhead": self.memory_overhead,
            "time_complexity": self.time_complexity,
            "memory_complexity": self.memory_complexity,
            "parallel_efficiency": self.parallel_efficiency,
            "confidence_intervals": self.confidence_intervals,
            "outlier_count": self.outlier_count,
            "hardware_spec": self.hardware_spec,
            "timestamp": self.timestamp.isoformat(),
            "random_seed": self.random_seed
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PerformanceMetrics":
        """Create from dictionary"""
        # Parse timestamp
        timestamp = datetime.fromisoformat(data["timestamp"]) if "timestamp" in data else datetime.now()

        # Parse enums
        composition_type = CompositionType(data["composition_type"])
        tile_implementation = TileImplementation(data["tile_implementation"])

        return cls(
            simulation_id=data["simulation_id"],
            chain_length=data["chain_length"],
            composition_type=composition_type,
            tile_implementation=tile_implementation,
            sample_size=data["sample_size"],
            mean_execution_time=data["mean_execution_time"],
            median_execution_time=data["median_execution_time"],
            p95_execution_time=data["p95_execution_time"],
            p99_execution_time=data["p99_execution_time"],
            time_std_dev=data["time_std_dev"],
            memory_per_tile=data["memory_per_tile"],
            total_memory=data["total_memory"],
            memory_overhead=data["memory_overhead"],
            time_complexity=data["time_complexity"],
            memory_complexity=data["memory_complexity"],
            parallel_efficiency=data.get("parallel_efficiency"),
            confidence_intervals=data["confidence_intervals"],
            outlier_count=data["outlier_count"],
            hardware_spec=data.get("hardware_spec", {}),
            timestamp=timestamp,
            random_seed=data.get("random_seed")
        )


@dataclass
class RealWorldScenarioResult:
    """Result of real-world scenario simulation"""

    # Configuration
    simulation_id: str
    scenario_name: str  # "fraud_detection", "medical_diagnosis", etc.
    sample_size: int

    # Performance metrics
    accuracy: float
    precision: float
    recall: float
    f1_score: float

    # Confidence-based metrics
    accuracy_by_confidence: Dict[str, float]  # Accuracy for each confidence bucket
    false_positive_rate: float
    false_negative_rate: float

    # Cost analysis
    cost_savings_percent: float  # vs human-only baseline
    automated_rate: float  # Percentage of cases automated
    human_review_rate: float  # Percentage requiring human review

    # User trust metrics (simulated)
    trust_score_increase: float  # Percentage increase in trust score

    # Statistical validation
    confidence_intervals: Dict[str, Tuple[float, float]]
    p_values: Dict[str, float]

    # Scenario-specific details
    scenario_details: Dict[str, Any] = field(default_factory=dict)

    # Metadata
    timestamp: datetime = field(default_factory=datetime.now)
    random_seed: Optional[int] = None
    computation_time_ms: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "simulation_id": self.simulation_id,
            "scenario_name": self.scenario_name,
            "sample_size": self.sample_size,
            "accuracy": self.accuracy,
            "precision": self.precision,
            "recall": self.recall,
            "f1_score": self.f1_score,
            "accuracy_by_confidence": self.accuracy_by_confidence,
            "false_positive_rate": self.false_positive_rate,
            "false_negative_rate": self.false_negative_rate,
            "cost_savings_percent": self.cost_savings_percent,
            "automated_rate": self.automated_rate,
            "human_review_rate": self.human_review_rate,
            "trust_score_increase": self.trust_score_increase,
            "confidence_intervals": self.confidence_intervals,
            "p_values": self.p_values,
            "scenario_details": self.scenario_details,
            "timestamp": self.timestamp.isoformat(),
            "random_seed": self.random_seed,
            "computation_time_ms": self.computation_time_ms
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RealWorldScenarioResult":
        """Create from dictionary"""
        # Parse timestamp
        timestamp = datetime.fromisoformat(data["timestamp"]) if "timestamp" in data else datetime.now()

        return cls(
            simulation_id=data["simulation_id"],
            scenario_name=data["scenario_name"],
            sample_size=data["sample_size"],
            accuracy=data["accuracy"],
            precision=data["precision"],
            recall=data["recall"],
            f1_score=data["f1_score"],
            accuracy_by_confidence=data["accuracy_by_confidence"],
            false_positive_rate=data["false_positive_rate"],
            false_negative_rate=data["false_negative_rate"],
            cost_savings_percent=data["cost_savings_percent"],
            automated_rate=data["automated_rate"],
            human_review_rate=data["human_review_rate"],
            trust_score_increase=data["trust_score_increase"],
            confidence_intervals=data["confidence_intervals"],
            p_values=data["p_values"],
            scenario_details=data.get("scenario_details", {}),
            timestamp=timestamp,
            random_seed=data.get("random_seed"),
            computation_time_ms=data.get("computation_time_ms")
        )


# ============================================================================
# BATCH RESULT SCHEMAS
# ============================================================================

@dataclass
class SimulationBatchResult:
    """Batch result containing multiple simulation results"""

    batch_id: str
    simulation_type: str  # "confidence_cascade", "zone_transition", etc.
    results: List[Any]  # List of specific result objects
    summary_statistics: Dict[str, Any]
    validation_status: Dict[str, bool]  # Whether validation criteria met

    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        # Convert results to dict based on type
        result_dicts = []
        for result in self.results:
            if hasattr(result, 'to_dict'):
                result_dicts.append(result.to_dict())
            else:
                result_dicts.append(result)

        return {
            "batch_id": self.batch_id,
            "simulation_type": self.simulation_type,
            "results": result_dicts,
            "summary_statistics": self.summary_statistics,
            "validation_status": self.validation_status,
            "timestamp": self.timestamp.isoformat()
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any], result_class: Any = None) -> "SimulationBatchResult":
        """Create from dictionary with optional result class"""
        # Parse timestamp
        timestamp = datetime.fromisoformat(data["timestamp"]) if "timestamp" in data else datetime.now()

        # Parse results if result_class provided
        results = data["results"]
        if result_class and hasattr(result_class, 'from_dict'):
            results = [result_class.from_dict(r) for r in data["results"]]

        return cls(
            batch_id=data["batch_id"],
            simulation_type=data["simulation_type"],
            results=results,
            summary_statistics=data["summary_statistics"],
            validation_status=data["validation_status"],
            timestamp=timestamp
        )


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def save_result(result: Any, filepath: str) -> None:
    """Save a result object to JSON file"""
    if hasattr(result, 'to_dict'):
        data = result.to_dict()
    else:
        data = result

    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, default=str)


def load_result(filepath: str, result_class: Any = None) -> Any:
    """Load a result object from JSON file"""
    with open(filepath, 'r') as f:
        data = json.load(f)

    if result_class and hasattr(result_class, 'from_dict'):
        return result_class.from_dict(data)
    return data


def generate_simulation_id(prefix: str = "sim") -> str:
    """Generate a unique simulation ID"""
    import uuid
    from datetime import datetime

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    return f"{prefix}_{timestamp}_{unique_id}"


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Enums
    "ConfidenceZone",
    "CompositionType",
    "ConfidenceDistribution",
    "TileImplementation",

    # Core schemas
    "TileConfiguration",
    "ChainConfiguration",

    # Result schemas
    "ConfidenceCascadeResult",
    "ZoneTransitionResult",
    "CompositionStabilityResult",
    "PerformanceMetrics",
    "RealWorldScenarioResult",
    "SimulationBatchResult",

    # Utility functions
    "save_result",
    "load_result",
    "generate_simulation_id"
]
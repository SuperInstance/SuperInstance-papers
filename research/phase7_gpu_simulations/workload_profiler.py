"""
Workload Profiler for Hybrid GPU + Cloud Orchestration

Analyzes simulation characteristics to enable intelligent routing decisions
between local GPU and cloud infrastructure.

Author: SuperInstance Research Team
Date: 2026-03-13
"""

import re
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class ComputeIntensity(Enum):
    """Compute intensity categories."""
    TRIVIAL = "trivial"      # < 1ms
    LIGHT = "light"          # 1-100ms
    MODERATE = "moderate"    # 100ms-1s
    HEAVY = "heavy"          # 1-10s
    INTENSE = "intense"      # > 10s


class MemoryProfile(Enum):
    """Memory requirement categories."""
    TINY = "tiny"            # < 100MB
    SMALL = "small"          # 100MB-1GB
    MEDIUM = "medium"        # 1-4GB
    LARGE = "large"          # 4-8GB
    MASSIVE = "massive"      # > 8GB


@dataclass
class WorkloadProfile:
    """Complete workload characteristics profile."""
    name: str
    description: str

    # Resource requirements
    vram_gb: float
    compute_ms: float
    memory_profile: MemoryProfile
    compute_intensity: ComputeIntensity

    # Cost considerations
    cloud_cost_usd: float
    batchable: bool

    # Performance characteristics
    latency_sensitive: bool
    parallelizable: bool
    stateless: bool

    # Optimization hints
    gpu_acceleratable: bool
    cpu_fallback: bool

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'name': self.name,
            'description': self.description,
            'vram_gb': self.vram_gb,
            'compute_ms': self.compute_ms,
            'memory_profile': self.memory_profile.value,
            'compute_intensity': self.compute_intensity.value,
            'cloud_cost_usd': self.cloud_cost_usd,
            'batchable': self.batchable,
            'latency_sensitive': self.latency_sensitive,
            'parallelizable': self.parallelizable,
            'stateless': self.stateless,
            'gpu_acceleratable': self.gpu_acceleratable,
            'cpu_fallback': self.cpu_fallback
        }


class WorkloadProfiler:
    """
    Analyzes simulation workloads to determine optimal execution backend.

    Uses static analysis of parameters and historical performance data
    to create comprehensive workload profiles.
    """

    # Pre-defined workload profiles for common simulations
    PROFILES: Dict[str, WorkloadProfile] = {
        # CRDT Operations
        'crdt_merge_small': WorkloadProfile(
            name='crdt_merge_small',
            description='Small CRDT merge operation (< 1K elements)',
            vram_gb=0.1,
            compute_ms=5.0,
            memory_profile=MemoryProfile.TINY,
            compute_intensity=ComputeIntensity.TRIVIAL,
            cloud_cost_usd=0.0001,
            batchable=True,
            latency_sensitive=True,
            parallelizable=True,
            stateless=True,
            gpu_acceleratable=False,
            cpu_fallback=True
        ),

        'crdt_merge_medium': WorkloadProfile(
            name='crdt_merge_medium',
            description='Medium CRDT merge operation (1K-100K elements)',
            vram_gb=0.5,
            compute_ms=50.0,
            memory_profile=MemoryProfile.SMALL,
            compute_intensity=ComputeIntensity.LIGHT,
            cloud_cost_usd=0.001,
            batchable=True,
            latency_sensitive=True,
            parallelizable=True,
            stateless=True,
            gpu_acceleratable=False,
            cpu_fallback=True
        ),

        'crdt_merge_large': WorkloadProfile(
            name='crdt_merge_large',
            description='Large CRDT merge operation (> 100K elements)',
            vram_gb=4.0,
            compute_ms=500.0,
            memory_profile=MemoryProfile.MEDIUM,
            compute_intensity=ComputeIntensity.MODERATE,
            cloud_cost_usd=0.005,
            batchable=True,
            latency_sensitive=False,
            parallelizable=True,
            stateless=True,
            gpu_acceleratable=True,
            cpu_fallback=True
        ),

        # Emergence Detection
        'emergence_detection': WorkloadProfile(
            name='emergence_detection',
            description='Transfer entropy and novelty detection',
            vram_gb=2.0,
            compute_ms=1000.0,
            memory_profile=MemoryProfile.MEDIUM,
            compute_intensity=ComputeIntensity.MODERATE,
            cloud_cost_usd=0.008,
            batchable=False,
            latency_sensitive=False,
            parallelizable=True,
            stateless=False,
            gpu_acceleratable=True,
            cpu_fallback=True
        ),

        # Neural Evolution
        'neural_evolution': WorkloadProfile(
            name='neural_evolution',
            description='Evolutionary neural network optimization',
            vram_gb=5.5,
            compute_ms=50000.0,
            memory_profile=MemoryProfile.LARGE,
            compute_intensity=ComputeIntensity.INTENSE,
            cloud_cost_usd=0.15,
            batchable=True,
            latency_sensitive=False,
            parallelizable=True,
            stateless=False,
            gpu_acceleratable=True,
            cpu_fallback=False
        ),

        # Value Network Training
        'value_network_train': WorkloadProfile(
            name='value_network_train',
            description='TD(λ) value network training',
            vram_gb=3.5,
            compute_ms=10000.0,
            memory_profile=MemoryProfile.MEDIUM,
            compute_intensity=ComputeIntensity.HEAVY,
            cloud_cost_usd=0.05,
            batchable=True,
            latency_sensitive=False,
            parallelizable=True,
            stateless=False,
            gpu_acceleratable=True,
            cpu_fallback=False
        ),

        # Self-Play Simulation
        'self_play': WorkloadProfile(
            name='self_play',
            description='Self-play tournament with ELO tracking',
            vram_gb=2.5,
            compute_ms=5000.0,
            memory_profile=MemoryProfile.MEDIUM,
            compute_intensity=ComputeIntensity.HEAVY,
            cloud_cost_usd=0.03,
            batchable=True,
            latency_sensitive=False,
            parallelizable=True,
            stateless=False,
            gpu_acceleratable=True,
            cpu_fallback=True
        ),

        # Hydraulic Simulation
        'hydraulic_sim': WorkloadProfile(
            name='hydraulic_sim',
            description='Pressure-flow agent network simulation',
            vram_gb=4.5,
            compute_ms=8000.0,
            memory_profile=MemoryProfile.MEDIUM,
            compute_intensity=ComputeIntensity.HEAVY,
            cloud_cost_usd=0.06,
            batchable=False,
            latency_sensitive=False,
            parallelizable=True,
            stateless=False,
            gpu_acceleratable=True,
            cpu_fallback=False
        ),

        # Batch Processing
        'batch_crdt_merges': WorkloadProfile(
            name='batch_crdt_merges',
            description='Batch processing of multiple CRDT merges',
            vram_gb=6.0,
            compute_ms=2000.0,
            memory_profile=MemoryProfile.LARGE,
            compute_intensity=ComputeIntensity.MODERATE,
            cloud_cost_usd=0.02,
            batchable=True,
            latency_sensitive=False,
            parallelizable=True,
            stateless=True,
            gpu_acceleratable=True,
            cpu_fallback=True
        ),

        # Inference Workload
        'inference_light': WorkloadProfile(
            name='inference_light',
            description='Lightweight model inference',
            vram_gb=1.5,
            compute_ms=100.0,
            memory_profile=MemoryProfile.SMALL,
            compute_intensity=ComputeIntensity.LIGHT,
            cloud_cost_usd=0.002,
            batchable=True,
            latency_sensitive=True,
            parallelizable=True,
            stateless=True,
            gpu_acceleratable=True,
            cpu_fallback=True
        ),

        # Data Processing
        'data_processing': WorkloadProfile(
            name='data_processing',
            description='Large-scale data processing and transformation',
            vram_gb=3.0,
            compute_ms=3000.0,
            memory_profile=MemoryProfile.MEDIUM,
            compute_intensity=ComputeIntensity.MODERATE,
            cloud_cost_usd=0.015,
            batchable=True,
            latency_sensitive=False,
            parallelizable=True,
            stateless=True,
            gpu_acceleratable=True,
            cpu_fallback=True
        ),

        # Validation Testing
        'validation_test': WorkloadProfile(
            name='validation_test',
            description='Quick validation and testing',
            vram_gb=0.5,
            compute_ms=20.0,
            memory_profile=MemoryProfile.SMALL,
            compute_intensity=ComputeIntensity.TRIVIAL,
            cloud_cost_usd=0.0005,
            batchable=True,
            latency_sensitive=True,
            parallelizable=True,
            stateless=True,
            gpu_acceleratable=False,
            cpu_fallback=True
        )
    }

    def __init__(self):
        """Initialize workload profiler."""
        self.custom_profiles: Dict[str, WorkloadProfile] = {}
        self.performance_history: Dict[str, list] = {}

    def get_profile(self, simulation_type: str) -> Optional[WorkloadProfile]:
        """
        Get workload profile for simulation type.

        Args:
            simulation_type: Type of simulation

        Returns:
            WorkloadProfile if found, None otherwise
        """
        return self.PROFILES.get(simulation_type) or self.custom_profiles.get(simulation_type)

    def analyze_workload(
        self,
        simulation_type: str,
        parameters: Dict[str, Any]
    ) -> WorkloadProfile:
        """
        Analyze workload characteristics from parameters.

        Args:
            simulation_type: Type of simulation
            parameters: Simulation parameters

        Returns:
            WorkloadProfile with estimated characteristics
        """
        # Start with base profile
        base_profile = self.get_profile(simulation_type)

        if base_profile is None:
            # Create profile from parameter analysis
            return self._profile_from_parameters(simulation_type, parameters)

        # Adjust profile based on parameters
        return self._adjust_profile(base_profile, parameters)

    def _profile_from_parameters(
        self,
        simulation_type: str,
        parameters: Dict[str, Any]
    ) -> WorkloadProfile:
        """
        Create workload profile from parameter analysis.

        Args:
            simulation_type: Type of simulation
            parameters: Simulation parameters

        Returns:
            Estimated workload profile
        """
        # Extract size indicators
        data_size = self._extract_data_size(parameters)
        iterations = parameters.get('iterations', 1)
        batch_size = parameters.get('batch_size', 1)

        # Estimate VRAM
        vram_gb = self._estimate_vram(simulation_type, data_size, batch_size)

        # Estimate compute time
        compute_ms = self._estimate_compute(simulation_type, data_size, iterations)

        # Determine categories
        memory_profile = self._categorize_memory(vram_gb)
        compute_intensity = self._categorize_compute(compute_ms)

        # Estimate cost
        cloud_cost = self._estimate_cost(compute_ms, iterations)

        # Determine characteristics from parameters
        latency_sensitive = parameters.get('latency_critical', False)
        parallelizable = parameters.get('parallel', True)
        stateless = parameters.get('stateless', True)

        return WorkloadProfile(
            name=simulation_type,
            description=f"Auto-profiled {simulation_type}",
            vram_gb=vram_gb,
            compute_ms=compute_ms,
            memory_profile=memory_profile,
            compute_intensity=compute_intensity,
            cloud_cost_usd=cloud_cost,
            batchable=parallelizable,
            latency_sensitive=latency_sensitive,
            parallelizable=parallelizable,
            stateless=stateless,
            gpu_acceleratable=vram_gb > 0.5,
            cpu_fallback=vram_gb < 4.0
        )

    def _adjust_profile(
        self,
        base_profile: WorkloadProfile,
        parameters: Dict[str, Any]
    ) -> WorkloadProfile:
        """
        Adjust base profile based on specific parameters.

        Args:
            base_profile: Base workload profile
            parameters: Simulation parameters

        Returns:
            Adjusted workload profile
        """
        # Scale factors
        scale_factor = self._compute_scale_factor(parameters)

        # Adjust VRAM
        adjusted_vram = base_profile.vram_gb * scale_factor

        # Adjust compute time
        adjusted_compute = base_profile.compute_ms * scale_factor

        # Adjust cost
        adjusted_cost = base_profile.cloud_cost_usd * scale_factor

        return WorkloadProfile(
            name=base_profile.name,
            description=base_profile.description,
            vram_gb=adjusted_vram,
            compute_ms=adjusted_compute,
            memory_profile=self._categorize_memory(adjusted_vram),
            compute_intensity=self._categorize_compute(adjusted_compute),
            cloud_cost_usd=adjusted_cost,
            batchable=base_profile.batchable,
            latency_sensitive=parameters.get('latency_critical', base_profile.latency_sensitive),
            parallelizable=base_profile.parallelizable,
            stateless=base_profile.stateless,
            gpu_acceleratable=base_profile.gpu_acceleratable,
            cpu_fallback=base_profile.cpu_fallback
        )

    def _extract_data_size(self, parameters: Dict[str, Any]) -> int:
        """Extract data size from parameters."""
        size_keys = ['data_size', 'num_elements', 'size', 'n', 'count', 'length']
        for key in size_keys:
            if key in parameters:
                return int(parameters[key])
        return 1000  # Default size

    def _estimate_vram(
        self,
        simulation_type: str,
        data_size: int,
        batch_size: int
    ) -> float:
        """
        Estimate VRAM requirements.

        Args:
            simulation_type: Type of simulation
            data_size: Number of data elements
            batch_size: Batch size for processing

        Returns:
            Estimated VRAM in GB
        """
        # Base memory per element
        base_memory_per_element = 0.0001  # 100KB per 1000 elements

        # Simulation-specific multipliers
        multipliers = {
            'neural': 10.0,
            'evolution': 8.0,
            'emergence': 5.0,
            'hydraulic': 4.0,
            'self_play': 3.0,
            'crdt': 1.0,
            'inference': 2.0,
            'training': 5.0
        }

        multiplier = multipliers.get(simulation_type.lower().split('_')[0], 2.0)

        # Calculate
        vram_gb = (data_size * base_memory_per_element * multiplier * batch_size) / 1000

        return min(vram_gb, 16.0)  # Cap at 16GB

    def _estimate_compute(
        self,
        simulation_type: str,
        data_size: int,
        iterations: int
    ) -> float:
        """
        Estimate compute time in milliseconds.

        Args:
            simulation_type: Type of simulation
            data_size: Number of data elements
            iterations: Number of iterations

        Returns:
            Estimated compute time in ms
        """
        # Base compute time per element
        base_time_per_element = 0.001  # 1ms per element

        # Simulation-specific complexity
        complexity = {
            'neural': 100,
            'evolution': 80,
            'emergence': 20,
            'hydraulic': 15,
            'self_play': 10,
            'crdt': 1,
            'inference': 5,
            'training': 50
        }

        sim_complexity = complexity.get(simulation_type.lower().split('_')[0], 10)

        # Calculate
        compute_ms = data_size * base_time_per_element * sim_complexity * iterations

        return compute_ms

    def _estimate_cost(self, compute_ms: float, iterations: int) -> float:
        """
        Estimate cloud cost in USD.

        Args:
            compute_ms: Compute time in milliseconds
            iterations: Number of iterations

        Returns:
            Estimated cost in USD
        """
        # DeepInfra pricing: ~$0.0001 per GPU-second
        compute_seconds = compute_ms / 1000 * iterations
        cost = compute_seconds * 0.0001

        return round(cost, 6)

    def _categorize_memory(self, vram_gb: float) -> MemoryProfile:
        """Categorize memory requirement."""
        if vram_gb < 0.1:
            return MemoryProfile.TINY
        elif vram_gb < 1.0:
            return MemoryProfile.SMALL
        elif vram_gb < 4.0:
            return MemoryProfile.MEDIUM
        elif vram_gb < 8.0:
            return MemoryProfile.LARGE
        else:
            return MemoryProfile.MASSIVE

    def _categorize_compute(self, compute_ms: float) -> ComputeIntensity:
        """Categorize compute intensity."""
        if compute_ms < 1:
            return ComputeIntensity.TRIVIAL
        elif compute_ms < 100:
            return ComputeIntensity.LIGHT
        elif compute_ms < 1000:
            return ComputeIntensity.MODERATE
        elif compute_ms < 10000:
            return ComputeIntensity.HEAVY
        else:
            return ComputeIntensity.INTENSE

    def _compute_scale_factor(self, parameters: Dict[str, Any]) -> float:
        """Compute scale factor from parameters."""
        scale = 1.0

        # Check for scaling parameters
        if 'scale' in parameters:
            scale *= parameters['scale']
        if 'multiplier' in parameters:
            scale *= parameters['multiplier']
        if 'size' in parameters:
            size = parameters['size']
            if isinstance(size, (int, float)):
                scale *= max(size / 1000, 1.0)

        return max(scale, 0.1)  # Minimum scale factor

    def record_performance(
        self,
        simulation_type: str,
        profile: WorkloadProfile,
        actual_vram_gb: float,
        actual_compute_ms: float
    ):
        """
        Record actual performance for learning.

        Args:
            simulation_type: Type of simulation
            profile: Predicted profile
            actual_vram_gb: Actual VRAM used
            actual_compute_ms: Actual compute time
        """
        if simulation_type not in self.performance_history:
            self.performance_history[simulation_type] = []

        self.performance_history[simulation_type].append({
            'predicted_vram': profile.vram_gb,
            'actual_vram': actual_vram_gb,
            'vram_error': abs(profile.vram_gb - actual_vram_gb),
            'predicted_compute': profile.compute_ms,
            'actual_compute': actual_compute_ms,
            'compute_error': abs(profile.compute_ms - actual_compute_ms) / actual_compute_ms
        })

    def get_profile_accuracy(self, simulation_type: str) -> Dict[str, float]:
        """
        Get profiling accuracy metrics.

        Args:
            simulation_type: Type of simulation

        Returns:
            Dictionary with accuracy metrics
        """
        history = self.performance_history.get(simulation_type, [])

        if not history:
            return {}

        vram_errors = [h['vram_error'] for h in history]
        compute_errors = [h['compute_error'] for h in history]

        return {
            'avg_vram_error_gb': sum(vram_errors) / len(vram_errors),
            'max_vram_error_gb': max(vram_errors),
            'avg_compute_error_pct': sum(compute_errors) / len(compute_errors) * 100,
            'max_compute_error_pct': max(compute_errors) * 100,
            'sample_count': len(history)
        }

    def add_custom_profile(self, profile: WorkloadProfile):
        """
        Add custom workload profile.

        Args:
            profile: Custom workload profile
        """
        self.custom_profiles[profile.name] = profile

    def list_profiles(self) -> list:
        """List all available profiles."""
        all_profiles = list(self.PROFILES.keys()) + list(self.custom_profiles.keys())
        return sorted(all_profiles)

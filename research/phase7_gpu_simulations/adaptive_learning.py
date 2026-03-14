"""
Adaptive Learning System for Orchestration Policy Optimization

Learns optimal routing decisions from experience and continuously improves
orchestration policies based on actual performance and cost data.

Author: SuperInstance Research Team
Date: 2026-03-13
"""

import time
import json
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import statistics
import logging

from workload_profiler import WorkloadProfile, ComputeIntensity, MemoryProfile


logger = logging.getLogger(__name__)


class PolicyMetric(Enum):
    """Metrics for policy optimization."""
    COST_EFFICIENCY = "cost_efficiency"
    PERFORMANCE = "performance"
    RELIABILITY = "reliability"
    RESOURCE_UTILIZATION = "resource_utilization"


@dataclass
class PolicyThreshold:
    """Optimized policy threshold."""
    name: str
    value: float
    metric: PolicyMetric
    confidence: float
    sample_count: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'name': self.name,
            'value': self.value,
            'metric': self.metric.value,
            'confidence': self.confidence,
            'sample_count': self.sample_count
        }


@dataclass
class RoutingPattern:
    """Discovered routing pattern."""
    condition: str
    recommended_backend: str
    success_rate: float
    avg_cost_saving: float
    avg_performance_gain: float
    sample_count: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'condition': self.condition,
            'recommended_backend': self.recommended_backend,
            'success_rate': self.success_rate,
            'avg_cost_saving': self.avg_cost_saving,
            'avg_performance_gain': self.avg_performance_gain,
            'sample_count': self.sample_count
        }


class PerformanceHistory:
    """Track performance history for learning."""

    def __init__(self, max_samples: int = 10000):
        """
        Initialize performance history.

        Args:
            max_samples: Maximum samples to keep
        """
        self.max_samples = max_samples
        self.local_gpu_history: List[Dict[str, Any]] = []
        self.cloud_history: List[Dict[str, Any]] = []
        self.pattern_history: List[Dict[str, Any]] = []

    def add_local_execution(
        self,
        vram_gb: float,
        compute_ms: float,
        success: bool,
        simulation_type: str
    ):
        """Add local GPU execution record."""
        record = {
            'timestamp': time.time(),
            'vram_gb': vram_gb,
            'compute_ms': compute_ms,
            'success': success,
            'simulation_type': simulation_type
        }

        self.local_gpu_history.append(record)

        if len(self.local_gpu_history) > self.max_samples:
            self.local_gpu_history = self.local_gpu_history[-self.max_samples:]

    def add_cloud_execution(
        self,
        cost_usd: float,
        compute_ms: float,
        success: bool,
        simulation_type: str
    ):
        """Add cloud execution record."""
        record = {
            'timestamp': time.time(),
            'cost_usd': cost_usd,
            'compute_ms': compute_ms,
            'success': success,
            'simulation_type': simulation_type
        }

        self.cloud_history.append(record)

        if len(self.cloud_history) > self.max_samples:
            self.cloud_history = self.cloud_history[-self.max_samples:]

    def get_local_stats(self) -> Dict[str, Any]:
        """Get local GPU statistics."""
        if not self.local_gpu_history:
            return {}

        successful = [h for h in self.local_gpu_history if h['success']]

        return {
            'total_executions': len(self.local_gpu_history),
            'successful_executions': len(successful),
            'success_rate': len(successful) / len(self.local_gpu_history),
            'avg_vram_gb': statistics.mean(h['vram_gb'] for h in successful),
            'avg_compute_ms': statistics.mean(h['compute_ms'] for h in successful),
            'max_vram_gb': max(h['vram_gb'] for h in self.local_gpu_history),
            'max_compute_ms': max(h['compute_ms'] for h in self.local_gpu_history)
        }

    def get_cloud_stats(self) -> Dict[str, Any]:
        """Get cloud statistics."""
        if not self.cloud_history:
            return {}

        successful = [h for h in self.cloud_history if h['success']]

        return {
            'total_executions': len(self.cloud_history),
            'successful_executions': len(successful),
            'success_rate': len(successful) / len(self.cloud_history),
            'avg_cost_usd': statistics.mean(h['cost_usd'] for h in successful),
            'avg_compute_ms': statistics.mean(h['compute_ms'] for h in successful),
            'total_cost_usd': sum(h['cost_usd'] for h in self.cloud_history)
        }


class AdaptivePolicyOptimizer:
    """
    Optimize orchestration policies based on historical performance.

    Uses machine learning techniques to identify optimal decision boundaries
    and routing patterns.
    """

    def __init__(self):
        """Initialize policy optimizer."""
        self.performance_history = PerformanceHistory()
        self.optimized_thresholds: Dict[str, PolicyThreshold] = {}
        self.discovered_patterns: List[RoutingPattern] = []
        self.optimization_count = 0

    def record_execution(
        self,
        backend: str,
        profile: WorkloadProfile,
        execution_time_ms: float,
        cost_usd: float,
        success: bool
    ):
        """
        Record execution for learning.

        Args:
            backend: Backend used (local_gpu or cloud)
            profile: Workload profile
            execution_time_ms: Actual execution time
            cost_usd: Actual cost
            success: Whether execution succeeded
        """
        if backend == 'local_gpu':
            self.performance_history.add_local_execution(
                profile.vram_gb,
                execution_time_ms,
                success,
                profile.name
            )
        elif backend == 'cloud':
            self.performance_history.add_cloud_execution(
                cost_usd,
                execution_time_ms,
                success,
                profile.name
            )

    def optimize_policies(self) -> Dict[str, PolicyThreshold]:
        """
        Optimize policy thresholds based on history.

        Returns:
            Dictionary of optimized thresholds
        """
        if len(self.performance_history.local_gpu_history) < 50:
            logger.warning("Insufficient data for policy optimization")
            return self.optimized_thresholds

        logger.info("Optimizing orchestration policies...")

        # Optimize VRAM threshold
        vram_threshold = self._optimize_vram_threshold()

        # Optimize cost threshold
        cost_threshold = self._optimize_cost_threshold()

        # Optimize latency threshold
        latency_threshold = self._optimize_latency_threshold()

        # Update thresholds
        if vram_threshold:
            self.optimized_thresholds['vram_threshold_gb'] = vram_threshold

        if cost_threshold:
            self.optimized_thresholds['cost_threshold_usd'] = cost_threshold

        if latency_threshold:
            self.optimized_thresholds['latency_threshold_ms'] = latency_threshold

        # Discover patterns
        self._discover_routing_patterns()

        self.optimization_count += 1

        logger.info(
            f"Policy optimization complete (iteration {self.optimization_count})"
        )

        return self.optimized_thresholds

    def _optimize_vram_threshold(self) -> Optional[PolicyThreshold]:
        """
        Optimize VRAM threshold for local vs cloud decision.

        Returns:
            Optimized VRAM threshold or None
        """
        local_stats = self.performance_history.get_local_stats()
        cloud_stats = self.performance_history.get_cloud_stats()

        if not local_stats or not cloud_stats:
            return None

        # Find VRAM level where local becomes unreliable
        successful_local = [
            h for h in self.performance_history.local_gpu_history
            if h['success']
        ]

        if not successful_local:
            return None

        # Calculate threshold at 95th percentile of successful local executions
        vram_values = [h['vram_gb'] for h in successful_local]
        threshold = statistics.quantiles(vram_values, n=20)[18]  # 95th percentile

        # Calculate confidence based on sample count
        confidence = min(len(successful_local) / 1000, 1.0)

        return PolicyThreshold(
            name='vram_threshold_gb',
            value=round(threshold, 2),
            metric=PolicyMetric.RESOURCE_UTILIZATION,
            confidence=round(confidence, 3),
            sample_count=len(successful_local)
        )

    def _optimize_cost_threshold(self) -> Optional[PolicyThreshold]:
        """
        Optimize cost threshold for local vs cloud decision.

        Returns:
            Optimized cost threshold or None
        """
        cloud_stats = self.performance_history.get_cloud_stats()

        if not cloud_stats or cloud_stats['total_executions'] < 50:
            return None

        # Find cost level where cloud becomes cost-effective
        # (i.e., when cloud is significantly faster than local would be)

        successful_cloud = [
            h for h in self.performance_history.cloud_history
            if h['success']
        ]

        if not successful_cloud:
            return None

        # Calculate threshold based on cost distribution
        cost_values = [h['cost_usd'] for h in successful_cloud]
        threshold = statistics.median(cost_values) * 2  # 2x median

        confidence = min(len(successful_cloud) / 500, 1.0)

        return PolicyThreshold(
            name='cost_threshold_usd',
            value=round(threshold, 6),
            metric=PolicyMetric.COST_EFFICIENCY,
            confidence=round(confidence, 3),
            sample_count=len(successful_cloud)
        )

    def _optimize_latency_threshold(self) -> Optional[PolicyThreshold]:
        """
        Optimize latency threshold for local vs cloud decision.

        Returns:
            Optimized latency threshold or None
        """
        local_stats = self.performance_history.get_local_stats()
        cloud_stats = self.performance_history.get_cloud_stats()

        if not local_stats or not cloud_stats:
            return None

        # Calculate break-even point where cloud network overhead equals compute savings
        local_compute = local_stats.get('avg_compute_ms', 0)
        cloud_compute = cloud_stats.get('avg_compute_ms', 0)

        if local_compute == 0 or cloud_compute == 0:
            return None

        # Cloud has ~50ms network overhead
        network_overhead = 50
        compute_savings = local_compute - cloud_compute

        if compute_savings <= 0:
            # Cloud is never faster for compute
            threshold = 10000  # Very high threshold
        else:
            # Threshold where savings offset overhead
            threshold = network_overhead + compute_savings

        confidence = min(
            (local_stats['total_executions'] + cloud_stats['total_executions']) / 1000,
            1.0
        )

        return PolicyThreshold(
            name='latency_threshold_ms',
            value=round(threshold, 2),
            metric=PolicyMetric.PERFORMANCE,
            confidence=round(confidence, 3),
            sample_count=local_stats['total_executions'] + cloud_stats['total_executions']
        )

    def _discover_routing_patterns(self) -> List[RoutingPattern]:
        """
        Discover optimal routing patterns from history.

        Returns:
            List of discovered patterns
        """
        patterns = []

        # Analyze by compute intensity
        intensity_patterns = self._analyze_by_compute_intensity()
        patterns.extend(intensity_patterns)

        # Analyze by memory profile
        memory_patterns = self._analyze_by_memory_profile()
        patterns.extend(memory_patterns)

        # Analyze by simulation type
        sim_patterns = self._analyze_by_simulation_type()
        patterns.extend(sim_patterns)

        self.discovered_patterns = patterns

        return patterns

    def _analyze_by_compute_intensity(self) -> List[RoutingPattern]:
        """Analyze routing patterns by compute intensity."""
        patterns = []

        # Group local executions by compute intensity
        local_by_intensity = {}
        for record in self.performance_history.local_gpu_history:
            intensity = self._categorize_compute(record['compute_ms'])
            if intensity not in local_by_intensity:
                local_by_intensity[intensity] = []
            local_by_intensity[intensity].append(record)

        # Group cloud executions by compute intensity
        cloud_by_intensity = {}
        for record in self.performance_history.cloud_history:
            intensity = self._categorize_compute(record['compute_ms'])
            if intensity not in cloud_by_intensity:
                cloud_by_intensity[intensity] = []
            cloud_by_intensity[intensity].append(record)

        # Find patterns for each intensity
        for intensity in ComputeIntensity:
            local_records = local_by_intensity.get(intensity, [])
            cloud_records = cloud_by_intensity.get(intensity, [])

            if not local_records or not cloud_records:
                continue

            # Calculate success rates
            local_success = sum(1 for r in local_records if r['success']) / len(local_records)
            cloud_success = sum(1 for r in rcloud_records if r['success']) / len(cloud_records)

            # Calculate performance difference
            local_time = statistics.mean(r['compute_ms'] for r in local_records if r['success'])
            cloud_time = statistics.mean(r['compute_ms'] for r in cloud_records if r['success'])

            performance_gain = (local_time - cloud_time) / local_time if local_time > 0 else 0

            # Calculate cost savings
            avg_cloud_cost = statistics.mean(
                r['cost_usd'] for r in cloud_records if r['success']
            )

            # Determine best backend
            if local_success > cloud_success * 1.1:  # Local is significantly more reliable
                best_backend = 'local_gpu'
                cost_saving = avg_cloud_cost
            elif cloud_success > local_success * 1.1:
                best_backend = 'cloud'
                cost_saving = -avg_cloud_cost
            elif performance_gain > 0.2:  # Cloud is 20%+ faster
                best_backend = 'cloud'
                cost_saving = -avg_cloud_cost
            else:
                best_backend = 'local_gpu'
                cost_saving = avg_cloud_cost

            patterns.append(RoutingPattern(
                condition=f"compute_intensity={intensity.value}",
                recommended_backend=best_backend,
                success_rate=max(local_success, cloud_success),
                avg_cost_saving=cost_saving,
                avg_performance_gain=performance_gain if best_backend == 'cloud' else 0,
                sample_count=len(local_records) + len(cloud_records)
            ))

        return patterns

    def _analyze_by_memory_profile(self) -> List[RoutingPattern]:
        """Analyze routing patterns by memory profile."""
        patterns = []

        # Similar logic to compute intensity analysis
        # Group by memory profile and find patterns

        return patterns

    def _analyze_by_simulation_type(self) -> List[RoutingPattern]:
        """Analyze routing patterns by simulation type."""
        patterns = []

        # Group by simulation type and find optimal backend
        local_by_type = {}
        for record in self.performance_history.local_gpu_history:
            sim_type = record['simulation_type']
            if sim_type not in local_by_type:
                local_by_type[sim_type] = []
            local_by_type[sim_type].append(record)

        cloud_by_type = {}
        for record in self.performance_history.cloud_history:
            sim_type = record['simulation_type']
            if sim_type not in cloud_by_type:
                cloud_by_type[sim_type] = []
            cloud_by_type[sim_type].append(record)

        # Find patterns for each simulation type
        for sim_type in set(list(local_by_type.keys()) + list(cloud_by_type.keys())):
            local_records = local_by_type.get(sim_type, [])
            cloud_records = cloud_by_type.get(sim_type, [])

            if len(local_records) < 10 or len(cloud_records) < 10:
                continue  # Need minimum sample size

            # Calculate metrics
            local_success = sum(1 for r in local_records if r['success']) / len(local_records)
            cloud_success = sum(1 for r in cloud_records if r['success']) / len(cloud_records)

            avg_cloud_cost = statistics.mean(
                r['cost_usd'] for r in cloud_records if r['success']
            )

            # Determine best backend
            if local_success > cloud_success:
                best_backend = 'local_gpu'
                cost_saving = avg_cloud_cost
            else:
                best_backend = 'cloud'
                cost_saving = -avg_cloud_cost

            patterns.append(RoutingPattern(
                condition=f"simulation_type={sim_type}",
                recommended_backend=best_backend,
                success_rate=max(local_success, cloud_success),
                avg_cost_saving=cost_saving,
                avg_performance_gain=0,
                sample_count=len(local_records) + len(cloud_records)
            ))

        return patterns

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

    def get_optimized_policies(self) -> Dict[str, Any]:
        """
        Get all optimized policies and patterns.

        Returns:
            Dictionary with policies and patterns
        """
        return {
            'thresholds': {
                name: threshold.to_dict()
                for name, threshold in self.optimized_thresholds.items()
            },
            'patterns': [p.to_dict() for p in self.discovered_patterns],
            'optimization_count': self.optimization_count,
            'performance_stats': {
                'local': self.performance_history.get_local_stats(),
                'cloud': self.performance_history.get_cloud_stats()
            }
        }

    def export_policies(self, filepath: str):
        """
        Export optimized policies to JSON file.

        Args:
            filepath: Path to export file
        """
        policies = self.get_optimized_policies()

        with open(filepath, 'w') as f:
            json.dump(policies, f, indent=2)

        logger.info(f"Exported policies to {filepath}")

    def load_policies(self, filepath: str):
        """
        Load optimized policies from JSON file.

        Args:
            filepath: Path to policy file
        """
        with open(filepath, 'r') as f:
            policies = json.load(f)

        # Load thresholds
        for name, threshold_dict in policies.get('thresholds', {}).items():
            self.optimized_thresholds[name] = PolicyThreshold(
                name=threshold_dict['name'],
                value=threshold_dict['value'],
                metric=PolicyMetric(threshold_dict['metric']),
                confidence=threshold_dict['confidence'],
                sample_count=threshold_dict['sample_count']
            )

        # Load patterns
        for pattern_dict in policies.get('patterns', []):
            self.discovered_patterns.append(RoutingPattern(**pattern_dict))

        self.optimization_count = policies.get('optimization_count', 0)

        logger.info(f"Loaded policies from {filepath}")


class ReinforcementLearningOptimizer:
    """
    Reinforcement learning approach to policy optimization.

    Uses multi-armed bandit and contextual bandit algorithms to
    explore optimal routing strategies.
    """

    def __init__(self, exploration_rate: float = 0.1):
        """
        Initialize RL optimizer.

        Args:
            exploration_rate: Rate of exploration vs exploitation
        """
        self.exploration_rate = exploration_rate
        self.action_values: Dict[str, Dict[str, float]] = {}  # state -> action -> value
        self.action_counts: Dict[str, Dict[str, int]] = {}  # state -> action -> count

    def get_action_values(
        self,
        state: str,
        available_actions: List[str]
    ) -> Dict[str, float]:
        """
        Get action values for state.

        Args:
            state: Current state (workload characteristics)
            available_actions: Available actions (backends)

        Returns:
            Dictionary mapping actions to values
        """
        if state not in self.action_values:
            self.action_values[state] = {}
            self.action_counts[state] = {}

        # Initialize missing actions
        for action in available_actions:
            if action not in self.action_values[state]:
                self.action_values[state][action] = 0.0
                self.action_counts[state][action] = 0

        return self.action_values[state]

    def select_action(
        self,
        state: str,
        available_actions: List[str]
    ) -> str:
        """
        Select action using epsilon-greedy policy.

        Args:
            state: Current state
            available_actions: Available actions

        Returns:
            Selected action
        """
        action_values = self.get_action_values(state, available_actions)

        # Epsilon-greedy: explore with probability epsilon
        if time.random() < self.exploration_rate:
            return random.choice(available_actions)
        else:
            # Exploit: select action with highest value
            return max(action_values.items(), key=lambda x: x[1])[0]

    def update_action_value(
        self,
        state: str,
        action: str,
        reward: float
    ):
        """
        Update action value using incremental average.

        Args:
            state: State
            action: Action taken
            reward: Reward received
        """
        if state not in self.action_values:
            self.action_values[state] = {}
            self.action_counts[state] = {}

        if action not in self.action_values[state]:
            self.action_values[state][action] = 0.0
            self.action_counts[state][action] = 0

        # Incremental average update
        n = self.action_counts[state][action]
        old_value = self.action_values[state][action]

        # Update
        self.action_counts[state][action] = n + 1
        self.action_values[state][action] = old_value + (reward - old_value) / (n + 1)

    def calculate_reward(
        self,
        execution_time_ms: float,
        cost_usd: float,
        success: bool
    ) -> float:
        """
        Calculate reward for execution.

        Args:
            execution_time_ms: Execution time
            cost_usd: Cost in USD
            success: Whether execution succeeded

        Returns:
            Reward value (higher is better)
        """
        if not success:
            return -1.0  # Penalty for failure

        # Reward combines performance and cost
        time_reward = 1.0 / (1.0 + execution_time_ms / 1000)  # Normalize to seconds
        cost_penalty = cost_usd * 100  # Scale cost impact

        return time_reward - cost_penalty

#!/usr/bin/env python3
"""
Automated Emergence Discovery in Multi-Agent Systems

Uses P27 emergence detection to find novel emergent phenomena
Discovers patterns that no human researcher has noticed

Hardware: RTX 4050 GPU - CuPy compatible
Author: SuperInstance Research Team
Date: 2026-03-13
"""

import numpy as np
from typing import Dict, List, Tuple, Callable, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import json
from pathlib import Path
from datetime import datetime
import warnings

# Suppress sklearn warnings
warnings.filterwarnings('ignore')

# Try importing CuPy for GPU acceleration
try:
    import cupy as cp
    GPU_AVAILABLE = True
    print("CuPy available - GPU acceleration enabled")
except ImportError:
    GPU_AVAILABLE = False
    print("CuPy not available - using NumPy (CPU)")

# =============================================================================
# 1. Emergence Detection Framework (P27)
# =============================================================================

class EmergenceDetector:
    """
    Detect emergent phenomena using transfer entropy, mutual information,
    and phase transition detection.

    Based on P27 Emergence Detection framework.
    """

    def __init__(self, num_agents: int, use_gpu: bool = True):
        self.num_agents = num_agents
        self.use_gpu = use_gpu and GPU_AVAILABLE
        self.xp = cp if self.use_gpu else np
        self.history: List[Dict[str, float]] = []
        self.baseline_te = 0.1  # Baseline transfer entropy

    def compute_transfer_entropy(self,
                                source: np.ndarray,
                                target: np.ndarray,
                                k: int = 1,
                                lag: int = 1) -> float:
        """
        Compute transfer entropy from source to target.

        TE measures information flow: how much source predicts target
        beyond what target's past predicts itself.

        TE(X->Y) = sum p(y_{t+1}, y_t, x_t) * log(p(y_{t+1}|y_t,x_t) / p(y_{t+1}|y_t))

        Args:
            source: Source time series
            target: Target time series
            k: History length
            lag: Time lag for causality

        Returns:
            Transfer entropy in bits
        """
        # Convert to numpy if using GPU
        if self.use_gpu:
            source = cp.asnumpy(source) if isinstance(source, cp.ndarray) else source
            target = cp.asnumpy(target) if isinstance(target, cp.ndarray) else target

        # Discretize into bins for probability estimation
        bins = min(20, len(source) // 10)
        bins = max(bins, 5)

        # Create joint histogram
        try:
            source_binned = np.digitize(source, np.histogram(source, bins=bins)[1][:-1])
            target_binned = np.digitize(target, np.histogram(target, bins=bins)[1][:-1])

            # Shift for lag
            if lag < len(target_binned) - 1:
                target_future = target_binned[lag:]
                target_past = target_binned[:-lag]
                source_past = source_binned[:-lag]

                # Compute mutual information I(source_past; target_future | target_past)
                from sklearn.metrics import mutual_info_score

                # Joint MI as approximation of TE
                te = mutual_info_score(source_past, target_future) * 0.5

                return te
        except Exception:
            pass

        return 0.0

    def compute_mutual_information(self,
                                  x: np.ndarray,
                                  y: np.ndarray) -> float:
        """
        Compute mutual information between two variables.

        I(X;Y) = sum p(x,y) * log(p(x,y) / (p(x)*p(y)))
        """
        if self.use_gpu:
            x = cp.asnumpy(x) if isinstance(x, cp.ndarray) else x
            y = cp.asnumpy(y) if isinstance(y, cp.ndarray) else y

        bins = min(20, len(x) // 10)
        bins = max(bins, 5)

        try:
            from sklearn.metrics import mutual_info_score
            x_binned = np.digitize(x, np.histogram(x, bins=bins)[1][:-1])
            y_binned = np.digitize(y, np.histogram(y, bins=bins)[1][:-1])

            mi = mutual_info_score(x_binned, y_binned)
            return mi
        except Exception:
            return 0.0

    def detect_global_emergence(self,
                               agent_states: np.ndarray,
                               timestep_window: Optional[int] = None) -> Dict[str, float]:
        """
        Detect emergence at global system level.

        Emergence indicators:
        - High transfer entropy between agents
        - Novel patterns not present in individuals
        - Phase transitions in collective behavior
        - Global mutual information elevation

        Args:
            agent_states: Shape (num_agents, timesteps)
            timestep_window: Only analyze last N timesteps (None = all)

        Returns:
            Dictionary of emergence metrics
        """
        metrics = {}

        # Apply timestep window
        if timestep_window is not None:
            agent_states = agent_states[:, -timestep_window:]

        num_agents, timesteps = agent_states.shape

        # Convert to GPU if available
        if self.use_gpu and isinstance(agent_states, np.ndarray):
            agent_states_gpu = cp.array(agent_states)
        else:
            agent_states_gpu = agent_states

        # 1. Pairwise transfer entropy
        te_matrix = np.zeros((num_agents, num_agents))

        # Sample agents for computational efficiency
        sample_size = min(num_agents, 20)
        sampled_indices = np.random.choice(num_agents, sample_size, replace=False)

        for i in sampled_indices:
            for j in sampled_indices:
                if i != j:
                    te_matrix[i, j] = self.compute_transfer_entropy(
                        agent_states[j],  # source
                        agent_states[i]   # target
                    )

        # TE statistics
        nonzero_te = te_matrix[te_matrix > 0]
        metrics["avg_transfer_entropy"] = float(np.mean(nonzero_te)) if len(nonzero_te) > 0 else 0.0
        metrics["max_transfer_entropy"] = float(np.max(te_matrix))
        metrics["std_transfer_entropy"] = float(np.std(nonzero_te)) if len(nonzero_te) > 0 else 0.0

        # 2. Global mutual information (average pairwise MI)
        mi_values = []
        for idx, i in enumerate(sampled_indices[:10]):  # Limit to 10 agents
            for j in sampled_indices[idx+1:idx+5]:
                mi = self.compute_mutual_information(agent_states[i], agent_states[j])
                mi_values.append(mi)

        metrics["global_mutual_info"] = float(np.mean(mi_values)) if mi_values else 0.0

        # 3. Phase transition detection
        if len(self.history) >= 10:
            metrics["phase_transition"] = self.detect_phase_transition()
        else:
            metrics["phase_transition"] = False

        # 4. Emergence score (composite metric)
        emergence_score = (
            metrics["avg_transfer_entropy"] / (self.baseline_te + 1e-6) * 0.4 +
            metrics["global_mutual_info"] * 0.3 +
            (1.0 if metrics.get("phase_transition", False) else 0.0) * 0.3
        )
        metrics["emergence_score"] = float(emergence_score)

        # 5. Network density (fraction of significant connections)
        significant_connections = np.sum(te_matrix > 2 * self.baseline_te)
        total_possible = num_agents * (num_agents - 1)
        metrics["network_density"] = float(significant_connections / total_possible)

        # Store history
        self.history.append(metrics.copy())

        return metrics

    def detect_phase_transition(self) -> bool:
        """
        Detect if system is undergoing phase transition.

        Looks for sudden changes in emergence metrics.
        """
        if len(self.history) < 10:
            return False

        recent_metrics = self.history[-10:]

        # Look for sudden changes in transfer entropy
        te_values = [m["avg_transfer_entropy"] for m in recent_metrics]

        # Statistical test for sudden change
        mean_first_half = np.mean(te_values[:5])
        mean_second_half = np.mean(te_values[5:])

        std_all = np.std(te_values)

        # Significant change = phase transition
        if std_all > 0:
            change_magnitude = abs(mean_second_half - mean_first_half) / (std_all + 1e-6)
            if change_magnitude > 2.0:
                return True

        return False

    def reset_history(self):
        """Reset detection history."""
        self.history = []

# =============================================================================
# 2. Emergence Types Classification
# =============================================================================

class EmergenceType(Enum):
    """Categories of emergent phenomena."""
    SWARM_INTELLIGENCE = "Swarm Intelligence"
    CONSENSUS_EMERGENCE = "Consensus Emergence"
    PATTERN_FORMATION = "Pattern Formation"
    PHASE_TRANSITION = "Phase Transition"
    COMPUTATIONAL_EMERGENCE = "Computational Emergence"
    NETWORK_SYNCHRONIZATION = "Network Synchronization"
    COLLECTIVE_MEMORY = "Collective Memory"
    DIVISION_OF_LABOR = "Division of Labor"
    NOVEL_PHENOMENON = "Novel Phenomenon"

class EmergenceClassifier:
    """Classify discovered phenomena into types."""

    def classify(self, metrics: Dict[str, float]) -> EmergenceType:
        """
        Classify phenomenon based on metrics.

        Uses rule-based classification on emergence indicators.
        """
        # High transfer entropy + high MI = Swarm intelligence
        if (metrics["avg_transfer_entropy"] > 0.5 and
            metrics["global_mutual_info"] > 0.3):
            return EmergenceType.SWARM_INTELLIGENCE

        # Phase transition detected
        if metrics.get("phase_transition", False):
            return EmergenceType.PHASE_TRANSITION

        # High network density = Consensus emergence
        if metrics.get("network_density", 0) > 0.3:
            return EmergenceType.CONSENSUS_EMERGENCE

        # High MI but moderate TE = Collective memory
        if (metrics["global_mutual_info"] > 0.4 and
            metrics["avg_transfer_entropy"] < 0.5):
            return EmergenceType.COLLECTIVE_MEMORY

        # High max TE = Network synchronization
        if metrics["max_transfer_entropy"] > 0.8:
            return EmergenceType.NETWORK_SYNCHRONIZATION

        # High emergence score = Computational emergence
        if metrics.get("emergence_score", 0) > 0.7:
            return EmergenceType.COMPUTATIONAL_EMERGENCE

        # Default
        return EmergenceType.NOVEL_PHENOMENON

# =============================================================================
# 3. Emergent Phenomenon Data Structure
# =============================================================================

@dataclass
class EmergentPhenomenon:
    """A discovered emergent phenomenon."""
    phenomenon_id: int
    parameters: Dict[str, float]
    metrics: Dict[str, float]
    emergence_type: EmergenceType
    description: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    agent_states: Optional[np.ndarray] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.phenomenon_id,
            "parameters": self.parameters,
            "metrics": {k: float(v) if isinstance(v, (np.floating, float)) else v
                       for k, v in self.metrics.items()},
            "emergence_type": self.emergence_type.value,
            "description": self.description,
            "timestamp": self.timestamp
        }

# =============================================================================
# 4. Emergence Miner: Discover Novel Phenomena
# =============================================================================

class EmergenceMiner:
    """
    Automatically discover emergent phenomena in multi-agent systems.

    Searches parameter space for conditions that produce emergence.
    """

    def __init__(self,
                 num_agents: int = 50,
                 num_timesteps: int = 1000,
                 use_gpu: bool = True):
        self.num_agents = num_agents
        self.num_timesteps = num_timesteps
        self.use_gpu = use_gpu and GPU_AVAILABLE
        self.detector = EmergenceDetector(num_agents, use_gpu)
        self.classifier = EmergenceClassifier()
        self.discovered_phenomena: List[EmergentPhenomenon] = []

    def mine_emergence(self,
                      agent_system: Callable,
                      parameter_ranges: Dict[str, Tuple[float, float]],
                      num_runs: int = 100,
                      emergence_threshold: float = 0.5,
                      save_trajectories: bool = False) -> List[EmergentPhenomenon]:
        """
        Search parameter space for emergent phenomena.

        Args:
            agent_system: Function that simulates multi-agent system
                Signature: (num_agents, timesteps, **params) -> np.ndarray
            parameter_ranges: Dict of parameter_name -> (min, max)
            num_runs: Number of random parameter combinations to try
            emergence_threshold: Minimum emergence_score to consider
            save_trajectories: Save agent states for visualization

        Returns:
            List of discovered emergent phenomena
        """
        discovered = []

        print(f"\n{'='*60}")
        print(f"Emergence Mining Started")
        print(f"{'='*60}")
        print(f"Agents: {self.num_agents}")
        print(f"Timesteps: {self.num_timesteps}")
        print(f"Parameter combinations: {num_runs}")
        print(f"Emergence threshold: {emergence_threshold}")
        print(f"GPU acceleration: {'Enabled' if self.use_gpu else 'Disabled'}")
        print(f"{'='*60}\n")

        for run in range(num_runs):
            # Sample random parameters
            params = self._sample_parameters(parameter_ranges)

            # Run simulation
            try:
                agent_states = agent_system(
                    num_agents=self.num_agents,
                    timesteps=self.num_timesteps,
                    **params
                )

                # Detect emergence
                self.detector.reset_history()
                emergence_metrics = self.detector.detect_global_emergence(agent_states)

                # Check if emergence detected
                if self._is_emergent(emergence_metrics, emergence_threshold):
                    # Classify phenomenon
                    emergence_type = self.classifier.classify(emergence_metrics)

                    # Generate description
                    description = self._describe_phenomenon(emergence_metrics, emergence_type)

                    # Create phenomenon record
                    phenomenon = EmergentPhenomenon(
                        phenomenon_id=len(discovered),
                        parameters=params,
                        metrics=emergence_metrics,
                        emergence_type=emergence_type,
                        description=description,
                        agent_states=agent_states if save_trajectories else None
                    )

                    discovered.append(phenomenon)

                    # Report discovery
                    print(f"[Run {run+1}/{num_runs}] DISCOVERED: {emergence_type.value}")
                    print(f"  Emergence score: {emergence_metrics['emergence_score']:.3f}")
                    print(f"  Parameters: {params}")

            except Exception as e:
                print(f"[Run {run+1}/{num_runs}] Error: {str(e)[:50]}")
                continue

        # Sort by emergence score
        discovered.sort(key=lambda p: p.metrics["emergence_score"], reverse=True)

        self.discovered_phenomena = discovered

        print(f"\n{'='*60}")
        print(f"Mining Complete: {len(discovered)} phenomena discovered")
        print(f"{'='*60}\n")

        return discovered

    def _sample_parameters(self,
                          ranges: Dict[str, Tuple[float, float]]) -> Dict[str, float]:
        """Sample random parameters from ranges."""
        params = {}
        for name, (min_val, max_val) in ranges.items():
            # Use log-uniform sampling for parameters spanning orders of magnitude
            if max_val / (min_val + 1e-10) > 100:
                params[name] = np.exp(np.random.uniform(np.log(min_val + 1e-10),
                                                        np.log(max_val)))
            else:
                params[name] = np.random.uniform(min_val, max_val)
        return params

    def _is_emergent(self, metrics: Dict[str, float], threshold: float) -> bool:
        """
        Determine if metrics indicate emergence.

        Emergence criteria:
        - Emergence score above threshold
        - OR high transfer entropy (> 2x baseline)
        - OR phase transition detected
        """
        # Check emergence score
        if metrics.get("emergence_score", 0) > threshold:
            return True

        # Check for elevated transfer entropy
        if metrics["avg_transfer_entropy"] > 2 * self.detector.baseline_te:
            return True

        # Check for phase transition
        if metrics.get("phase_transition", False):
            return True

        return False

    def _describe_phenomenon(self,
                            metrics: Dict[str, float],
                            emergence_type: EmergenceType) -> str:
        """Generate human-readable description of phenomenon."""
        descriptions = []

        # Type-based description
        descriptions.append(f"Type: {emergence_type.value}")

        # Metric-based descriptions
        if metrics["avg_transfer_entropy"] > 0.5:
            descriptions.append("Strong information flow between agents")

        if metrics["global_mutual_info"] > 0.3:
            descriptions.append("High global coordination")

        if metrics.get("phase_transition", False):
            descriptions.append("Phase transition detected")

        if metrics.get("network_density", 0) > 0.3:
            descriptions.append(f"Dense connectivity ({metrics['network_density']:.1%})")

        # Emergence score
        descriptions.append(f"Emergence score: {metrics['emergence_score']:.3f}")

        return " | ".join(descriptions)

# =============================================================================
# 5. Multi-Agent System Testbeds
# =============================================================================

class CoupledOscillatorSystem:
    """
    Coupled oscillator system that can exhibit emergence.

    Agents are coupled oscillators that can synchronize.
    """

    def __init__(self):
        pass

    def simulate(self,
                num_agents: int,
                timesteps: int,
                coupling_strength: float = 0.5,
                noise_level: float = 0.1,
                interaction_range: float = 1.0,
                natural_frequency_spread: float = 0.5) -> np.ndarray:
        """
        Simulate coupled oscillator dynamics (Kuramoto-like).

        Args:
            num_agents: Number of oscillators
            timesteps: Simulation duration
            coupling_strength: K parameter
            noise_level: Noise amplitude
            interaction_range: Spatial interaction range
            natural_frequency_spread: Spread of natural frequencies

        Returns:
            State array (num_agents, timesteps)
        """
        # Initialize phases and natural frequencies
        phases = np.random.uniform(0, 2*np.pi, num_agents)
        natural_freqs = np.random.normal(0, natural_frequency_spread, num_agents)

        # Random spatial positions
        positions = np.random.uniform(0, 1, (num_agents, 2))

        # State storage
        states = np.zeros((num_agents, timesteps))

        dt = 0.1

        for t in range(timesteps):
            # Compute coupling
            for i in range(num_agents):
                # Find neighbors within interaction range
                distances = np.sqrt(np.sum((positions - positions[i])**2, axis=1))
                neighbors = distances < interaction_range

                # Kuramoto coupling
                coupling = coupling_strength * np.mean(np.sin(phases[neighbors] - phases[i]))

                # Update phase
                d_phase = natural_freqs[i] + coupling + noise_level * np.random.randn()
                phases[i] += d_phase * dt

                # Store state (use sin of phase for better MI calculation)
                states[i, t] = np.sin(phases[i])

        return states

class OpinionDynamicsSystem:
    """
    Opinion dynamics with bounded confidence.

    Agents update opinions based on neighbors within confidence bounds.
    """

    def __init__(self):
        pass

    def simulate(self,
                num_agents: int,
                timesteps: int,
                confidence_bound: float = 0.3,
                convergence_rate: float = 0.5,
                noise_level: float = 0.05,
                num_opinions: int = 3) -> np.ndarray:
        """
        Simulate opinion dynamics.

        Args:
            num_agents: Number of agents
            timesteps: Simulation duration
            confidence_bound: Only interact with agents within this distance
            convergence_rate: How fast opinions converge
            noise_level: Random opinion changes
            num_opinions: Dimensionality of opinion space

        Returns:
            Opinion array (num_agents, timesteps)
        """
        # Initialize opinions
        opinions = np.random.uniform(-1, 1, (num_agents, int(num_opinions)))

        # State storage
        states = np.zeros((num_agents, timesteps))

        for t in range(timesteps):
            # Store first opinion dimension
            states[:, t] = opinions[:, 0]

            # Update opinions
            new_opinions = opinions.copy()

            for i in range(num_agents):
                # Find agents within confidence bound
                distances = np.sqrt(np.sum((opinions - opinions[i])**2, axis=1))
                confident_neighbors = distances < confidence_bound

                if np.sum(confident_neighbors) > 1:
                    # Move towards average of confident neighbors
                    avg_opinion = np.mean(opinions[confident_neighbors], axis=0)
                    new_opinions[i] = opinions[i] + convergence_rate * (avg_opinion - opinions[i])

                # Add noise
                new_opinions[i] += noise_level * np.random.randn(num_opinions)

            opinions = new_opinions

        return states

class ParticleSwarmSystem:
    """
    Particle swarm with collective behavior.
    """

    def __init__(self):
        pass

    def simulate(self,
                num_agents: int,
                timesteps: int,
                cohesion_strength: float = 0.3,
                alignment_strength: float = 0.5,
                separation_strength: float = 0.2,
                noise_level: float = 0.1) -> np.ndarray:
        """
        Simulate particle swarm (boids-like).

        Args:
            num_agents: Number of particles
            timesteps: Simulation duration
            cohesion_strength: Tendency to move towards center
            alignment_strength: Tendency to align velocities
            separation_strength: Tendency to avoid crowding
            noise_level: Random perturbations

        Returns:
            Position array (num_agents, timesteps)
        """
        # Initialize positions and velocities
        positions = np.random.uniform(-1, 1, (num_agents, 2))
        velocities = np.random.uniform(-0.1, 0.1, (num_agents, 2))

        # State storage (x-coordinate)
        states = np.zeros((num_agents, timesteps))

        for t in range(timesteps):
            # Store x-position
            states[:, t] = positions[:, 0]

            # Compute forces
            new_velocities = velocities.copy()

            for i in range(num_agents):
                # Cohesion: move towards center of mass
                center = np.mean(positions, axis=0)
                cohesion = cohesion_strength * (center - positions[i])

                # Alignment: match average velocity
                avg_velocity = np.mean(velocities, axis=0)
                alignment = alignment_strength * (avg_velocity - velocities[i])

                # Separation: avoid crowding
                distances = np.sqrt(np.sum((positions - positions[i])**2, axis=1))
                close = distances < 0.2
                if np.sum(close) > 1:
                    separation_direction = positions[i] - positions[close]
                    separation_direction /= (distances[close, np.newaxis] + 1e-6)
                    separation = separation_strength * np.mean(separation_direction, axis=0)
                else:
                    separation = np.zeros(2)

                # Update velocity
                new_velocities[i] = velocities[i] + cohesion + alignment + separation
                new_velocities[i] += noise_level * np.random.randn(2)

                # Limit speed
                speed = np.linalg.norm(new_velocities[i])
                if speed > 0.5:
                    new_velocities[i] *= 0.5 / speed

            velocities = new_velocities
            positions += velocities * 0.1

        return states

# =============================================================================
# 6. Novel Emergence Discovery Engine
# =============================================================================

class NovelEmergenceDiscovery:
    """
    Advanced discovery engine that finds truly novel emergent phenomena.

    Combines multiple testbed systems and identifies unique patterns.
    """

    def __init__(self, use_gpu: bool = True):
        self.use_gpu = use_gpu and GPU_AVAILABLE
        self.miner = EmergenceMiner(use_gpu=use_gpu)

        # Available testbeds
        self.testbeds = {
            "coupled_oscillators": CoupledOscillatorSystem(),
            "opinion_dynamics": OpinionDynamicsSystem(),
            "particle_swarm": ParticleSwarmSystem()
        }

        # Parameter ranges for each testbed
        self.parameter_ranges = {
            "coupled_oscillators": {
                "coupling_strength": (0.0, 2.0),
                "noise_level": (0.0, 0.5),
                "interaction_range": (0.1, 2.0),
                "natural_frequency_spread": (0.1, 1.0)
            },
            "opinion_dynamics": {
                "confidence_bound": (0.1, 1.0),
                "convergence_rate": (0.1, 1.0),
                "noise_level": (0.0, 0.2),
                "num_opinions": (1, 5)
            },
            "particle_swarm": {
                "cohesion_strength": (0.0, 1.0),
                "alignment_strength": (0.0, 1.0),
                "separation_strength": (0.0, 1.0),
                "noise_level": (0.0, 0.3)
            }
        }

    def discover_across_systems(self,
                               num_runs_per_system: int = 50,
                               emergence_threshold: float = 0.5) -> Dict[str, List[EmergentPhenomenon]]:
        """
        Discover emergence across all available systems.

        Returns:
            Dict mapping system_name -> list of phenomena
        """
        all_discoveries = {}

        for system_name, testbed in self.testbeds.items():
            print(f"\n{'#'*60}")
            print(f"# Mining: {system_name}")
            print(f"{'#'*60}")

            # Get parameter ranges
            ranges = self.parameter_ranges[system_name]

            # Convert integer parameters to float ranges
            float_ranges = {}
            for key, (min_val, max_val) in ranges.items():
                float_ranges[key] = (float(min_val), float(max_val))

            # Mine emergence
            phenomena = self.miner.mine_emergence(
                agent_system=testbed.simulate,
                parameter_ranges=float_ranges,
                num_runs=num_runs_per_system,
                emergence_threshold=emergence_threshold
            )

            all_discoveries[system_name] = phenomena

        return all_discoveries

    def analyze_novelty(self,
                       discoveries: Dict[str, List[EmergentPhenomenon]]) -> Dict[str, Any]:
        """
        Analyze discoveries for novelty and patterns.

        Returns:
            Analysis summary
        """
        analysis = {
            "total_phenomena": 0,
            "by_system": {},
            "by_type": {},
            "most_emergent": None,
            "novelty_insights": []
        }

        all_phenomena = []

        for system_name, phenomena in discoveries.items():
            analysis["by_system"][system_name] = len(phenomena)
            analysis["total_phenomena"] += len(phenomena)
            all_phenomena.extend(phenomena)

            # Count by type
            for p in phenomena:
                type_name = p.emergence_type.value
                if type_name not in analysis["by_type"]:
                    analysis["by_type"][type_name] = 0
                analysis["by_type"][type_name] += 1

        # Find most emergent phenomenon
        if all_phenomena:
            analysis["most_emergent"] = max(all_phenomena,
                                           key=lambda p: p.metrics["emergence_score"])

        # Generate novelty insights
        if len(all_phenomena) > 5:
            # Look for patterns
            type_counts = analysis["by_type"]

            # Check for rare types
            for type_name, count in type_counts.items():
                if count == 1:
                    analysis["novelty_insights"].append(
                        f"Rare phenomenon discovered: {type_name}"
                    )

            # Check for parameter patterns
            high_emergence = [p for p in all_phenomena
                            if p.metrics["emergence_score"] > 0.7]

            if len(high_emergence) > 3:
                analysis["novelty_insights"].append(
                    f"High-emergence cluster found: {len(high_emergence)} phenomena with score > 0.7"
                )

        return analysis

# =============================================================================
# 7. Main Discovery Loop
# =============================================================================

def run_emergence_discovery():
    """Run automated emergence discovery across multiple systems."""

    print("="*60)
    print("AUTOMATED EMERGENCE DISCOVERY")
    print("P27 Emergence Detection Framework")
    print("="*60)
    print(f"Started: {datetime.now().isoformat()}")
    print("="*60)

    # Initialize discovery engine
    engine = NovelEmergenceDiscovery(use_gpu=True)

    # Run discovery across systems
    discoveries = engine.discover_across_systems(
        num_runs_per_system=30,
        emergence_threshold=0.4
    )

    # Analyze results
    analysis = engine.analyze_novelty(discoveries)

    # Print summary
    print("\n" + "="*60)
    print("DISCOVERY SUMMARY")
    print("="*60)
    print(f"Total phenomena discovered: {analysis['total_phenomena']}")
    print("\nBy System:")
    for system, count in analysis["by_system"].items():
        print(f"  {system}: {count}")
    print("\nBy Type:")
    for type_name, count in analysis["by_type"].items():
        print(f"  {type_name}: {count}")

    if analysis["novelty_insights"]:
        print("\nNovelty Insights:")
        for insight in analysis["novelty_insights"]:
            print(f"  - {insight}")

    if analysis["most_emergent"]:
        p = analysis["most_emergent"]
        print("\nMost Emergent Phenomenon:")
        print(f"  Type: {p.emergence_type.value}")
        print(f"  Score: {p.metrics['emergence_score']:.3f}")
        print(f"  Parameters: {p.parameters}")

    # Save results
    output_dir = Path("C:/Users/casey/polln/research/emergence_discovery")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save discoveries
    results = {
        "timestamp": datetime.now().isoformat(),
        "analysis": {
            "total_phenomena": analysis["total_phenomena"],
            "by_system": analysis["by_system"],
            "by_type": analysis["by_type"],
            "novelty_insights": analysis["novelty_insights"]
        },
        "phenomena": {
            system: [p.to_dict() for p in phenomena]
            for system, phenomena in discoveries.items()
        }
    }

    results_file = output_dir / "discovered_phenomena.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to: {results_file}")

    # Save detailed report
    report_file = output_dir / "discovery_report.md"
    with open(report_file, 'w') as f:
        f.write("# Emergence Discovery Report\n\n")
        f.write(f"**Generated:** {datetime.now().isoformat()}\n\n")
        f.write(f"**Total Phenomena:** {analysis['total_phenomena']}\n\n")

        f.write("## Discoveries by System\n\n")
        for system, count in analysis["by_system"].items():
            f.write(f"- **{system}**: {count} phenomena\n")

        f.write("\n## Discoveries by Type\n\n")
        for type_name, count in analysis["by_type"].items():
            f.write(f"- **{type_name}**: {count}\n")

        if analysis["novelty_insights"]:
            f.write("\n## Novelty Insights\n\n")
            for insight in analysis["novelty_insights"]:
                f.write(f"- {insight}\n")

        if analysis["most_emergent"]:
            p = analysis["most_emergent"]
            f.write("\n## Most Emergent Phenomenon\n\n")
            f.write(f"- **Type:** {p.emergence_type.value}\n")
            f.write(f"- **Emergence Score:** {p.metrics['emergence_score']:.3f}\n")
            f.write(f"- **Parameters:**\n")
            for param, value in p.parameters.items():
                f.write(f"  - {param}: {value:.4f}\n")

    print(f"Report saved to: {report_file}")
    print("\n" + "="*60)
    print("DISCOVERY COMPLETE")
    print("="*60)

    return discoveries, analysis

# =============================================================================
# 8. CLI Entry Point
# =============================================================================

if __name__ == "__main__":
    discoveries, analysis = run_emergence_discovery()

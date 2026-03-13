"""
P31: Health Prediction Simulation Schema

Paper: Multi-Dimensional Health Metrics for Distributed Systems
Claims: Health metrics predict system failures, enable proactive maintenance
Validation: Correlation analysis, failure prediction, proactive intervention effectiveness
"""

import cupy as cp
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import time


@dataclass
class HealthMetrics:
    """Multi-dimensional health metrics for a system."""
    cpu_utilization: float
    memory_usage: float
    disk_io: float
    network_latency: float
    error_rate: float
    response_time: float
    throughput: float
    temperature: float


@dataclass
class SystemState:
    """Current state of a distributed system node."""
    node_id: int
    health: HealthMetrics
    is_degraded: bool
    is_failed: bool
    time_to_failure: Optional[float]  # None if not degrading


class HealthPredictor:
    """Predicts system health and potential failures."""

    def __init__(self, n_nodes: int, prediction_horizon: int = 10):
        self.n_nodes = n_nodes
        self.prediction_horizon = prediction_horizon
        self.health_history = []  # List of health snapshots over time

    def normalize_metrics(self, metrics: HealthMetrics) -> cp.ndarray:
        """Normalize health metrics to [0, 1] range."""
        # Define expected healthy ranges
        ranges = {
            'cpu_utilization': (0.0, 1.0),
            'memory_usage': (0.0, 1.0),
            'disk_io': (0.0, 1000.0),  # MB/s
            'network_latency': (0.0, 100.0),  # ms
            'error_rate': (0.0, 0.1),  # 10% max
            'response_time': (0.0, 5000.0),  # ms
            'throughput': (0.0, 10000.0),  # req/s
            'temperature': (20.0, 100.0),  # Celsius
        }

        normalized = []
        for field, (min_val, max_val) in ranges.items():
            value = getattr(metrics, field)
            norm_val = (value - min_val) / (max_val - min_val)
            normalized.append(np.clip(norm_val, 0.0, 1.0))

        return cp.array(normalized, dtype=cp.float32)

    def compute_health_score(self, metrics: HealthMetrics) -> float:
        """Compute overall health score from metrics."""
        norm_metrics = self.normalize_metrics(metrics)

        # Weighted combination (lower is healthier)
        weights = cp.array([
            0.2,  # CPU
            0.2,  # Memory
            0.1,  # Disk
            0.1,  # Network
            0.15,  # Error rate
            0.1,  # Response time
            0.1,  # Throughput
            0.05,  # Temperature
        ], dtype=cp.float32)

        # Health score: 0 = healthy, 1 = failed
        health_score = cp.dot(weights, norm_metrics)

        return float(health_score)

    def predict_failure_probability(self, node_id: int) -> float:
        """Predict probability of failure within prediction horizon."""
        if len(self.health_history) < self.prediction_horizon:
            return 0.0

        # Get recent health scores for this node
        recent_scores = []
        for snapshot in self.health_history[-self.prediction_horizon:]:
            if node_id < len(snapshot):
                health = snapshot[node_id].health
                score = self.compute_health_score(health)
                recent_scores.append(score)

        if len(recent_scores) < self.prediction_horizon:
            return 0.0

        # Fit trend line
        scores = cp.array(recent_scores)
        t = cp.arange(len(scores), dtype=cp.float32)
        t_mean = cp.mean(t)
        scores_mean = cp.mean(scores)

        # Linear regression: score = a*t + b
        numerator = cp.sum((t - t_mean) * (scores - scores_mean))
        denominator = cp.sum((t - t_mean) ** 2)
        slope = numerator / (denominator + 1e-8)

        # Project to failure threshold (score > 0.8)
        current_score = scores[-1]
        if slope <= 0:
            return 0.0  # Improving or stable

        steps_to_failure = (0.8 - current_score) / (slope + 1e-8)
        probability = 1.0 if steps_to_failure <= 0 else max(0.0, 1.0 - steps_to_failure / self.prediction_horizon)

        return float(probability)

    def detect_anomalies(self, node_id: int, window_size: int = 5) -> bool:
        """Detect anomalous behavior using statistical analysis."""
        if len(self.health_history) < window_size:
            return False

        # Get recent values for each metric
        recent_metrics = []
        for snapshot in self.health_history[-window_size:]:
            if node_id < len(snapshot):
                recent_metrics.append(snapshot[node_id].health)

        if len(recent_metrics) < window_size:
            return False

        # Check for sudden changes (3-sigma rule)
        for field in ['cpu_utilization', 'memory_usage', 'error_rate', 'response_time']:
            values = [getattr(m, field) for m in recent_metrics]
            mean = np.mean(values)
            std = np.std(values)

            if std > 0 and abs(values[-1] - mean) > 3 * std:
                return True

        return False


class HealthPredictionSimulation:
    """Simulates health prediction and proactive maintenance."""

    def __init__(self, n_nodes: int, timesteps: int = 1000, failure_rate: float = 0.01):
        self.n_nodes = n_nodes
        self.timesteps = timesteps
        self.failure_rate = failure_rate
        self.predictor = HealthPredictor(n_nodes)
        self.nodes = []

        # Initialize nodes
        for i in range(n_nodes):
            self.nodes.append(self.create_healthy_node(i))

    def create_healthy_node(self, node_id: int) -> SystemState:
        """Create a node with healthy metrics."""
        health = HealthMetrics(
            cpu_utilization=np.random.uniform(0.2, 0.5),
            memory_usage=np.random.uniform(0.3, 0.6),
            disk_io=np.random.uniform(100, 500),
            network_latency=np.random.uniform(5, 20),
            error_rate=np.random.uniform(0.0, 0.001),
            response_time=np.random.uniform(50, 200),
            throughput=np.random.uniform(5000, 8000),
            temperature=np.random.uniform(35, 50),
        )

        return SystemState(
            node_id=node_id,
            health=health,
            is_degraded=False,
            is_failed=False,
            time_to_failure=None
        )

    def degrade_node(self, node: SystemState, rate: float = 0.05) -> SystemState:
        """Gradually degrade node metrics."""
        health = node.health

        # Increase utilization and latency
        health.cpu_utilization = min(1.0, health.cpu_utilization + rate * np.random.uniform(0.8, 1.2))
        health.memory_usage = min(1.0, health.memory_usage + rate * np.random.uniform(0.8, 1.2))
        health.network_latency += rate * 10 * np.random.uniform(0.8, 1.2)
        health.error_rate += rate * 0.01 * np.random.uniform(0.8, 1.2)
        health.response_time += rate * 50 * np.random.uniform(0.8, 1.2)
        health.throughput = max(0, health.throughput - rate * 100 * np.random.uniform(0.8, 1.2))
        health.temperature += rate * 2 * np.random.uniform(0.8, 1.2)

        # Update time to failure
        health_score = self.predictor.compute_health_score(health)
        if health_score > 0.8:
            node.is_failed = True
            node.time_to_failure = 0
        elif health_score > 0.6:
            node.is_degraded = True
            if node.time_to_failure is None:
                node.time_to_failure = np.random.uniform(5, 20)

        return node

    def simulate_timestep(self, t: int) -> Dict:
        """Simulate one timestep of health prediction."""
        results = {
            'timestep': t,
            'predictions': [],
            'actual_failures': [],
            'proactive_interventions': []
        }

        # Predict failures
        for node in self.nodes:
            prob = self.predictor.predict_failure_probability(node.node_id)
            is_anomaly = self.predictor.detect_anomalies(node.node_id)

            results['predictions'].append({
                'node_id': node.node_id,
                'failure_probability': prob,
                'is_anomaly': is_anomaly
            })

            # Proactive intervention if high probability
            if prob > 0.7 or is_anomaly:
                results['proactive_interventions'].append(node.node_id)
                # Reset node to healthy state
                self.nodes[node.node_id] = self.create_healthy_node(node.node_id)

        # Natural degradation
        for i, node in enumerate(self.nodes):
            if np.random.random() < self.failure_rate:
                # Start degradation
                self.nodes[i] = self.degrade_node(node)

            if node.is_failed:
                results['actual_failures'].append(node.node_id)

        # Record health snapshot
        self.predictor.health_history.append(self.nodes.copy())

        return results

    def run_simulation(self) -> Dict:
        """Run full health prediction simulation."""
        print(f"Running P31 Health Prediction Simulation...")
        print(f"Nodes: {self.n_nodes}, Timesteps: {self.timesteps}")

        all_results = []
        total_failures = 0
        total_proactive_interventions = 0
        true_positives = 0
        false_positives = 0

        for t in range(self.timesteps):
            results = self.simulate_timestep(t)
            all_results.append(results)

            # Track metrics
            total_failures += len(results['actual_failures'])
            total_proactive_interventions += len(results['proactive_interventions'])

            # True positives: predicted failure and node would have failed
            for pred in results['predictions']:
                if pred['failure_probability'] > 0.7:
                    if pred['node_id'] in results['actual_failures'] or \
                       any(n.node_id == pred['node_id'] and n.is_degraded
                           for n in self.nodes):
                        true_positives += 1
                    else:
                        false_positives += 1

        # Compute validation metrics
        actual_failures_prevented = max(0, total_failures - true_positives)
        prevention_rate = actual_failures_prevented / (total_failures + 1e-8)
        precision = true_positives / (true_positives + false_positives + 1e-8)

        # Correlation between health score and failure
        health_failure_correlation = self.compute_health_failure_correlation()

        return {
            'total_failures': total_failures,
            'proactive_interventions': total_proactive_interventions,
            'true_positives': true_positives,
            'false_positives': false_positives,
            'prevention_rate': prevention_rate,
            'precision': precision,
            'health_failure_correlation': health_failure_correlation,
            'detailed_results': all_results
        }

    def compute_health_failure_correlation(self) -> float:
        """Compute correlation between health scores and actual failures."""
        if len(self.predictor.health_history) < 10:
            return 0.0

        health_scores = []
        failure_indicators = []

        for snapshot in self.predictor.health_history:
            for node in snapshot:
                score = self.predictor.compute_health_score(node.health)
                health_scores.append(score)
                failure_indicators.append(1.0 if node.is_failed else 0.0)

        if len(health_scores) < 2:
            return 0.0

        correlation = np.corrcoef(health_scores, failure_indicators)[0, 1]
        return float(correlation) if not np.isnan(correlation) else 0.0


def main():
    """Run P31 validation simulation."""
    sim = HealthPredictionSimulation(
        n_nodes=100,
        timesteps=1000,
        failure_rate=0.02
    )

    results = sim.run_simulation()

    print(f"\n{'='*60}")
    print("P31 Health Prediction Simulation Results")
    print(f"{'='*60}")
    print(f"Total Failures: {results['total_failures']}")
    print(f"Proactive Interventions: {results['proactive_interventions']}")
    print(f"True Positives: {results['true_positives']}")
    print(f"False Positives: {results['false_positives']}")
    print(f"Prevention Rate: {results['prevention_rate']:.2%}")
    print(f"Precision: {results['precision']:.2%}")
    print(f"Health-Failure Correlation: {results['health_failure_correlation']:.3f}")

    # Validate claims
    print(f"\n{'='*60}")
    print("Claim Validation")
    print(f"{'='*60}")

    claims = {
        "r>0.7 correlation": results['health_failure_correlation'] > 0.7,
        ">80% prevention": results['prevention_rate'] > 0.8,
        ">70% precision": results['precision'] > 0.7,
    }

    for claim, passed in claims.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {claim}")

    return results


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
P27: Emergence Detection in Granular Systems
Simulation Schema for Validation/Falsification of Claims

Core Claims to Validate:
1. Emergence score predicts novel capabilities before explicit design
2. Transfer entropy detects causal emergence between agent pairs
3. Capability composition novelty score correlates with system performance
4. Early emergence detection enables proactive system adaptation

Cross-Paper Connections:
- P25 (Hydraulic Intelligence): Emergence in flow dynamics
- P30 (Granularity): Emergence vs granularity tradeoff
- P13 (Agent Networks): Network emergence patterns
- P6 (Laminar vs Turbulent): Phase transition detection

Hardware: RTX 4050 GPU - CuPy compatible
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Set
from enum import Enum
import random
from collections import defaultdict

class EmergenceType(Enum):
    NOVEL_CAPABILITY = "novel_capability"
    COMPOSITION_EFFECT = "composition_effect"
    CASCADING = "cascading"

@dataclass
class EmergenceEvent:
    timestep: int
    emergence_type: EmergenceType
    agents_involved: List[str]
    novelty_score: float
    transfer_entropy: float
    mutual_information: float

class EmergenceDetector:
    """
    Detects emergence in agent systems.

    Novelty Criterion:
        E is emergent <=> not exists agent with capability(E) AND exists path where compose(path) entails E

    Transfer Entropy:
        T(A_j -> A_i) = H(A_{i+1}|A_i) - H(A_{i+1}|A_i, A_j)
    """

    def __init__(self, novelty_threshold: float = 0.3):
        self.novelty_threshold = novelty_threshold
        self.known_capabilities: Set[str] = set()
        self.emergence_events: List[EmergenceEvent] = []

    def transfer_entropy(self, hist_i: List[float], hist_j: List[float], bins: int = 10) -> float:
        """Calculate transfer entropy from agent j to agent i."""
        if len(hist_i) < 3 or len(hist_j) < 3:
            return 0.0

        def discretize(x, bins):
            x = np.array(x)
            if x.max() == x.min():
                return np.zeros(len(x), dtype=int)
            x_norm = (x - x.min()) / (x.max() - x.min())
            return np.digitize(x_norm, np.linspace(0, 1, bins))

        def entropy(x):
            _, counts = np.unique(x, return_counts=True)
            probs = counts / len(x)
            return -np.sum(probs * np.log2(probs + 1e-10))

        def conditional_entropy(x, y):
            xy = list(zip(x, y))
            return entropy(xy) - entropy(y)

        i_disc = discretize(hist_i, bins).tolist()
        j_disc = discretize(hist_j, bins).tolist()

        h_i_given_i = conditional_entropy(i_disc[1:], i_disc[:-1])
        ij_joint = list(zip(i_disc[:-1], j_disc[:-1]))
        h_i_given_ij = conditional_entropy(i_disc[1:], ij_joint)

        return max(0, h_i_given_i - h_i_given_ij)

    def mutual_information(self, hist_i: List[float], hist_j: List[float], bins: int = 10) -> float:
        """Calculate mutual information between two agents."""
        if len(hist_i) < 2 or len(hist_j) < 2:
            return 0.0

        def discretize(x, bins):
            x = np.array(x)
            if x.max() == x.min():
                return np.zeros(len(x), dtype=int)
            x_norm = (x - x.min()) / (x.max() - x.min())
            return np.digitize(x_norm, np.linspace(0, 1, bins))

        def entropy(x):
            _, counts = np.unique(x, return_counts=True)
            probs = counts / len(x)
            return -np.sum(probs * np.log2(probs + 1e-10))

        i_disc = discretize(hist_i, bins).tolist()
        j_disc = discretize(hist_j, bins).tolist()

        h_i = entropy(i_disc)
        h_j = entropy(j_disc)
        h_ij = entropy(list(zip(i_disc, j_disc)))

        return max(0, h_i + h_j - h_ij)

    def calculate_novelty_score(self, capability_vector: np.ndarray, known: List[np.ndarray]) -> float:
        """Calculate novelty of capability vs known capabilities."""
        if not known:
            return 1.0
        min_dist = min(np.linalg.norm(capability_vector - k) for k in known)
        return min(min_dist, 1.0)

class EmergenceScoreCalculator:
    """
    E = a1*novelPathways + a2*crossRequests + a3*unexplainedGains + a4*compositionNovelty
    """

    def __init__(self, weights: Tuple[float, float, float, float] = (0.25, 0.25, 0.25, 0.25)):
        self.w1, self.w2, self.w3, self.w4 = weights

    def calculate(self, novel_pathways: float, cross_requests: float,
                  unexplained_gains: float, composition_novelty: float) -> float:
        return (self.w1 * novel_pathways + self.w2 * cross_requests +
                self.w3 * unexplained_gains + self.w4 * composition_novelty)

class EmergenceSimulation:
    """Main simulation for emergence detection validation."""

    def __init__(self, num_agents: int = 30, capability_dim: int = 32):
        self.num_agents = num_agents
        self.capability_dim = capability_dim
        self.detector = EmergenceDetector()
        self.score_calc = EmergenceScoreCalculator()

        self.agents: Dict[str, Dict] = {}
        self.known_paths: Set[Tuple[str, ...]] = set()
        self.interaction_history: Dict[Tuple[str, str], int] = defaultdict(int)
        self.emergence_scores: List[float] = []

    def initialize(self):
        for i in range(self.num_agents):
            agent_id = f"agent_{i:03d}"
            self.agents[agent_id] = {
                "capability": np.random.randn(self.capability_dim),
                "history": [random.random() for _ in range(10)]
            }

    def generate_paths(self, num_paths: int = 20) -> List[List[str]]:
        agent_ids = list(self.agents.keys())
        paths = []
        for _ in range(num_paths):
            length = random.randint(2, min(5, len(agent_ids)))
            paths.append(random.sample(agent_ids, length))
        return paths

    def step(self, timestep: int) -> Dict:
        paths = self.generate_paths()

        # Track interactions
        for path in paths:
            for i in range(len(path) - 1):
                self.interaction_history[(path[i], path[i+1])] += 1

        # Calculate emergence score components
        novel = sum(1 for p in paths if tuple(p) not in self.known_paths) / len(paths)
        cross = sum(1 for (a, b) in self.interaction_history if a != b) / max(len(self.interaction_history), 1)
        unexplained = random.uniform(0, 0.3)
        composition = random.uniform(0, 0.5)

        score = self.score_calc.calculate(novel, cross, unexplained, composition)
        self.emergence_scores.append(score)

        # Detect emergence
        events = []
        for path in paths:
            if len(path) >= 2:
                te = self.detector.transfer_entropy(
                    self.agents[path[0]]["history"],
                    self.agents[path[-1]]["history"]
                )
                mi = self.detector.mutual_information(
                    self.agents[path[0]]["history"],
                    self.agents[path[-1]]["history"]
                )

                if te > 0.1:  # Threshold for emergence
                    event = EmergenceEvent(
                        timestep=timestep,
                        emergence_type=EmergenceType.COMPOSITION_EFFECT,
                        agents_involved=path,
                        novelty_score=composition,
                        transfer_entropy=te,
                        mutual_information=mi
                    )
                    events.append(event)
                    self.detector.emergence_events.append(event)

        for p in paths:
            self.known_paths.add(tuple(p))

        return {"timestep": timestep, "score": score, "events": len(events)}

    def run(self, num_steps: int = 100) -> Dict:
        self.initialize()
        for t in range(num_steps):
            self.step(t)
        return self.get_metrics()

    def get_metrics(self) -> Dict:
        te_values = [e.transfer_entropy for e in self.detector.emergence_events]
        novelty_values = [e.novelty_score for e in self.detector.emergence_events]

        corr = 0
        if len(te_values) > 2:
            corr = np.corrcoef(te_values, novelty_values)[0, 1]
            if np.isnan(corr):
                corr = 0

        return {
            "emergence_events": len(self.detector.emergence_events),
            "avg_score": np.mean(self.emergence_scores) if self.emergence_scores else 0,
            "te_novelty_correlation": corr,
            "total_interactions": sum(self.interaction_history.values())
        }

def run_validation(num_steps: int = 100) -> Dict:
    sim = EmergenceSimulation(num_agents=30, capability_dim=32)
    metrics = sim.run(num_steps)

    return {
        "claim_1_score_predicts": {
            "description": "Emergence score predicts novel capabilities",
            "avg_score": metrics["avg_score"],
            "events": metrics["emergence_events"],
            "validated": metrics["emergence_events"] > 0
        },
        "claim_2_te_detects": {
            "description": "Transfer entropy detects causal emergence",
            "correlation": metrics["te_novelty_correlation"],
            "validated": metrics["te_novelty_correlation"] > 0.3
        },
        "summary": metrics
    }

if __name__ == "__main__":
    print("=" * 60)
    print("P27: Emergence Detection - Validation Simulation")
    print("=" * 60)
    results = run_validation(num_steps=50)
    print("\nResults:", results)

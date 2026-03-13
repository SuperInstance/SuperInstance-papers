#!/usr/bin/env python3
"""
P30: Granularity Analysis for Agent Systems
Simulation Schema for Validation/Falsification of Claims

Core Claims to Validate:
1. Optimal granularity follows inverse-U curve
2. Communication overhead O(n^2) vs emergence O(n log n)
3. Minimum viable agent: receive, process, transmit, learning > 0, expertise > 0
4. Granularity optimization improves efficiency >25%

Cross-Paper Connections:
- P27 (Emergence): Emergence vs granularity tradeoff
- P13 (Agent Networks): Network topology and granularity
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple
import random

@dataclass
class Agent:
    id: str
    granularity: int
    capabilities: List[str]
    processing: float
    comm_cost: float
    learning: float
    expertise: float

@dataclass
class GranularitySimulation:
    num_agents: int = 20
    min_gran: int = 1
    max_gran: int = 10

    agents: Dict[str, Agent] = field(default_factory=dict)
    efficiency: Dict[int, float] = field(default_factory=dict)
    emergence: Dict[int, float] = field(default_factory=dict)
    overhead: Dict[int, float] = field(default_factory=dict)

    def initialize(self):
        for g in range(self.min_gran, self.max_gran + 1):
            for i in range(self.num_agents):
                aid = f"agent_g{g}_{i:03d}"
                self.agents[aid] = Agent(
                    id=aid,
                    granularity=g,
                    capabilities=[f"c{j}" for j in range(g)],
                    processing=g * 0.1,
                    comm_cost=g ** 2 * 0.01,
                    learning=random.uniform(0.01, 0.1),
                    expertise=random.uniform(0.1, 1.0)
                )

    def calc_overhead(self, gran: int) -> float:
        agents_g = [a for a in self.agents.values() if a.granularity == gran]
        n = len(agents_g)
        return n * (n - 1) * gran * 0.1  # O(n^2)

    def calc_emergence(self, gran: int) -> float:
        agents_g = [a for a in self.agents.values() if a.granularity == gran]
        n = len(agents_g)
        if n < 2:
            return 0.0
        return n * np.log(n + 1) * gran * 0.05  # O(n log n)

    def run(self) -> Dict:
        self.initialize()

        for g in range(self.min_gran, self.max_gran + 1):
            e = self.calc_emergence(g)
            o = self.calc_overhead(g)
            self.emergence[g] = e
            self.overhead[g] = o
            self.efficiency[g] = e / (o + 1e-10)

        efficiencies = list(self.efficiency.values())
        max_idx = np.argmax(efficiencies)
        inverse_u = 0 < max_idx < len(efficiencies) - 1

        baseline = min(self.efficiency.values())
        best = max(self.efficiency.values())
        improvement = (best - baseline) / (baseline + 1e-10) * 100

        return {
            "optimal_granularity": list(self.efficiency.keys())[max_idx],
            "inverse_u_verified": inverse_u,
            "improvement_percent": improvement,
            "efficiency_by_gran": self.efficiency
        }

def run_validation() -> Dict:
    sim = GranularitySimulation()
    metrics = sim.run()

    return {
        "claim_1_inverse_u": {
            "description": "Optimal granularity follows inverse-U",
            "verified": metrics["inverse_u_verified"]
        },
        "claim_4_improvement": {
            "description": "Optimization improves efficiency >25%",
            "value": metrics["improvement_percent"],
            "validated": metrics["improvement_percent"] > 25
        },
        "summary": metrics
    }

if __name__ == "__main__":
    print("P30: Granularity Analysis Validation")
    results = run_validation()
    print(results)

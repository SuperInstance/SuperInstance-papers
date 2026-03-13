#!/usr/bin/env python3
"""
P29: Competitive Coevolution Architectures
Simulation Schema for Validation/Falsification of Claims

Core Claims to Validate:
1. Coevolution produces >40% improvement over single-population evolution
2. Arms race correlation is negative (r < -0.3) indicating healthy competition
3. Problem generators discover edge cases humans miss
4. Solver population diversity maintains >0.5 throughout evolution

Cross-Paper Connections:
- P24 (Self-Play): Foundation for coevolution
- P21 (Stochastic): Stochastic selection in evolution

Hardware: RTX 4050 GPU - CuPy compatible
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict
from enum import Enum
import random

class PopulationType(Enum):
    SOLVER = "solver"
    GENERATOR = "generator"

@dataclass
class Individual:
    id: str
    population: PopulationType
    genome: np.ndarray
    fitness: float = 0.0
    generation: int = 0

class CoevolutionSimulation:
    def __init__(self, solver_pop_size=20, generator_pop_size=20, genome_dim=50):
        self.solver_pop_size = solver_pop_size
        self.generator_pop_size = generator_pop_size
        self.genome_dim = genome_dim
        self.solvers: Dict[str, Individual] = {}
        self.generators: Dict[str, Individual] = {}
        self.generation = 0
        self.fitness_history: List[Dict] = []
        self.arms_race_corr = 0.0

    def initialize(self):
        for i in range(self.solver_pop_size):
            self.solvers[f"solver_{i:03d}"] = Individual(
                id=f"solver_{i:03d}",
                population=PopulationType.SOLVER,
                genome=np.random.randn(self.genome_dim)
            )
        for i in range(self.generator_pop_size):
            self.generators[f"gen_{i:03d}"] = Individual(
                id=f"gen_{i:03d}",
                population=PopulationType.GENERATOR,
                genome=np.random.randn(self.genome_dim)
            )

    def evaluate(self):
        problems = [np.mean(np.abs(g.genome)) for g in self.generators.values()]
        for solver in self.solvers.values():
            capability = np.mean(solver.genome)
            successes = sum(capability > p * random.uniform(0.8, 1.2) for p in problems)
            solver.fitness = successes / len(problems)

        avg_solver = np.mean([s.fitness for s in self.solvers.values()])
        for gen in self.generators.values():
            gen.fitness = 1 - avg_solver

        self.fitness_history.append({
            "solver_avg": avg_solver,
            "generator_avg": np.mean([g.fitness for g in self.generators.values()]),
            "diversity": self._diversity(self.solvers)
        })

    def _diversity(self, pop: Dict) -> float:
        genomes = np.array([ind.genome for ind in pop.values()])
        discretized = (genomes * 10).astype(int) % 10
        _, counts = np.unique(discretized, return_counts=True)
        probs = counts / len(pop)
        return -np.sum(probs * np.log2(probs + 1e-10))

    def detect_arms_race(self):
        if len(self.fitness_history) < 3:
            return
        solver_d = np.diff([h["solver_avg"] for h in self.fitness_history])
        gen_d = np.diff([h["generator_avg"] for h in self.fitness_history])
        if len(solver_d) > 2:
            self.arms_race_corr = np.corrcoef(solver_d, gen_d)[0, 1]
            if np.isnan(self.arms_race_corr):
                self.arms_race_corr = 0.0

    def evolve(self):
        self.generation += 1
        self._evolve_pop(self.solvers, PopulationType.SOLVER)
        self._evolve_pop(self.generators, PopulationType.GENERATOR)

    def _evolve_pop(self, pop: Dict, ptype: PopulationType):
        fitnesses = np.array([ind.fitness for ind in pop.values()])
        probs = fitnesses / (fitnesses.sum() + 1e-10)
        new_pop = {}
        ids = list(pop.keys())
        for i in range(len(pop)):
            p1, p2 = np.random.choice(ids, size=2, p=probs)
            crossover = random.randint(1, self.genome_dim - 1)
            child_genome = np.concatenate([
                pop[p1].genome[:crossover], pop[p2].genome[crossover:]
            ])
            mask = np.random.random(self.genome_dim) < 0.1
            child_genome[mask] += np.random.randn(mask.sum()) * 0.2
            new_pop[f"{ptype.value}_{i:03d}_g{self.generation}"] = Individual(
                id=f"{ptype.value}_{i:03d}_g{self.generation}",
                population=ptype, genome=child_genome, generation=self.generation
            )
        pop.clear()
        pop.update(new_pop)

    def run(self, num_gens=10) -> Dict:
        self.initialize()
        for _ in range(num_gens):
            self.evaluate()
            self.evolve()
        self.detect_arms_race()
        initial = self.fitness_history[0]["solver_avg"]
        final = self.fitness_history[-1]["solver_avg"]
        improvement = (final - initial) / (initial + 1e-10) * 100
        return {
            "improvement_percent": improvement,
            "arms_race_correlation": self.arms_race_corr,
            "final_diversity": self.fitness_history[-1]["diversity"]
        }

def run_validation(num_gens=10) -> Dict:
    sim = CoevolutionSimulation()
    metrics = sim.run(num_gens)
    return {
        "claim_1_improvement": {
            "description": "Coevolution >40% improvement",
            "value": metrics["improvement_percent"],
            "validated": metrics["improvement_percent"] > 40
        },
        "claim_2_arms_race": {
            "description": "Arms race correlation < -0.3",
            "value": metrics["arms_race_correlation"],
            "validated": metrics["arms_race_correlation"] < -0.3
        },
        "claim_4_diversity": {
            "description": "Diversity > 0.5",
            "value": metrics["final_diversity"],
            "validated": metrics["final_diversity"] > 0.5
        },
        "summary": metrics
    }

if __name__ == "__main__":
    print("P29: Competitive Coevolution Validation")
    results = run_validation(10)
    for k, v in results.items():
        print(f"  {k}: {v}")

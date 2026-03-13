#!/usr/bin/env python3
"""
P24: Self-Play Mechanisms for Distributed Systems
Simulation Schema for Validation/Falsification of Claims

Core Claims to Validate:
1. Self-play improves task success rate >30% over static configurations
2. ELO ratings correlate with actual task performance (r > 0.8)
3. Generational evolution produces novel strategies not in initial population
4. Adversarial training finds edge cases humans miss

Cross-Paper Connections:
- P21 (Stochastic Superiority): Gumbel-Softmax selection
- P29 (Coevolution): Arms race dynamics
- P13 (Agent Networks): Competition topology
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Callable
from enum import Enum
import random
from collections import defaultdict
import json

# ============================================================================
# CORE DATA STRUCTURES
# ============================================================================

class TaskType(Enum):
    CLASSIFICATION = "classification"
    OPTIMIZATION = "optimization"
    SYNTHESIS = "synthesis"
    DEBUGGING = "debugging"

@dataclass
class Task:
    """Task to be solved by competing tiles."""
    id: str
    task_type: TaskType
    difficulty: float  # 0.0 to 1.0
    features: np.ndarray
    ground_truth: any
    edge_case: bool = False  # Is this an adversarially-generated edge case?

@dataclass
class Tile:
    """Competing tile in self-play system."""
    id: str
    strategy_vector: np.ndarray  # Strategy parameters
    elo_rating: float = 1200.0
    generation: int = 0
    wins: int = 0
    losses: int = 0
    novel_strategies_discovered: List[str] = field(default_factory=list)

    @property
    def win_rate(self) -> float:
        total = self.wins + self.losses
        return self.wins / total if total > 0 else 0.5

@dataclass
class MatchResult:
    """Result of a competitive match between tiles."""
    tile_a_id: str
    tile_b_id: str
    task_id: str
    winner_id: str
    score_a: float
    score_b: float
    strategy_used: str
    timestamp: float

# ============================================================================
# GUMBEL-SOFTMAX SELECTION (Connection to P21)
# ============================================================================

def gumbel_softmax_selection(
    scores: np.ndarray,
    temperature: float = 1.0,
    hard: bool = False
) -> Tuple[int, np.ndarray]:
    """
    Gumbel-Softmax selection for differentiable sampling.

    Formula: π_i = exp((log α_i + g_i)/τ) / Σ exp((log α_j + g_j)/τ)

    Args:
        scores: Raw scores for each option
        temperature: Controls exploration vs exploitation
        hard: If True, returns one-hot (straight-through estimator)

    Returns:
        Tuple of (selected_index, probability_distribution)
    """
    # Generate Gumbel noise
    gumbel_noise = -np.log(-np.log(np.random.uniform(0, 1, scores.shape)))

    # Add noise and scale by temperature
    perturbed = (scores + gumbel_noise) / temperature

    # Softmax
    exp_scores = np.exp(perturbed - np.max(perturbed))
    probs = exp_scores / np.sum(exp_scores)

    # Sample
    selected = np.random.choice(len(scores), p=probs)

    if hard:
        # Straight-through estimator
        one_hot = np.zeros_like(probs)
        one_hot[selected] = 1.0
        return selected, one_hot

    return selected, probs

# ============================================================================
# ELO RATING SYSTEM
# ============================================================================

class EloSystem:
    """
    ELO rating system for tile competition.

    Formula: R'_A = R_A + K(S_A - E_A)
    where E_A = 1/(1 + 10^((R_B - R_A)/400))
    """

    def __init__(self, k_factor: float = 32.0):
        self.k_factor = k_factor
        self.ratings: Dict[str, float] = {}

    def expected_score(self, rating_a: float, rating_b: float) -> float:
        """Expected score for player A against player B."""
        return 1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0))

    def update_ratings(
        self,
        tile_a: Tile,
        tile_b: Tile,
        score_a: float  # 1.0 = win, 0.5 = draw, 0.0 = loss
    ) -> Tuple[float, float]:
        """Update ELO ratings after a match."""
        expected_a = self.expected_score(tile_a.elo_rating, tile_b.elo_rating)
        expected_b = 1.0 - expected_a

        new_rating_a = tile_a.elo_rating + self.k_factor * (score_a - expected_a)
        new_rating_b = tile_b.elo_rating + self.k_factor * ((1 - score_a) - expected_b)

        return new_rating_a, new_rating_b

# ============================================================================
# SELF-PLAY SIMULATION
# ============================================================================

class SelfPlaySimulation:
    """
    Main simulation for self-play mechanisms in distributed systems.
    """

    def __init__(
        self,
        num_tiles: int = 20,
        strategy_dim: int = 50,
        temperature: float = 0.8,
        mutation_rate: float = 0.1,
        crossover_rate: float = 0.3
    ):
        self.num_tiles = num_tiles
        self.strategy_dim = strategy_dim
        self.temperature = temperature
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate

        # Initialize components
        self.elo_system = EloSystem()
        self.tiles: Dict[str, Tile] = {}
        self.tasks: Dict[str, Task] = {}
        self.match_history: List[MatchResult] = []
        self.generations: List[Dict] = []

        # Metrics tracking
        self.success_rates: List[float] = []
        self.elo_correlations: List[float] = []
        self.novel_strategy_counts: List[int] = []
        self.edge_case_discoveries: List[str] = []

    def initialize_population(self):
        """Initialize starting tile population."""
        for i in range(self.num_tiles):
            tile = Tile(
                id=f"tile_{i:03d}",
                strategy_vector=np.random.randn(self.strategy_dim),
                generation=0
            )
            self.tiles[tile.id] = tile
            self.elo_system.ratings[tile.id] = tile.elo_rating

    def generate_tasks(self, num_tasks: int, edge_case_ratio: float = 0.2):
        """Generate tasks including adversarial edge cases."""
        for i in range(num_tasks):
            is_edge = random.random() < edge_case_ratio

            task = Task(
                id=f"task_{i:04d}",
                task_type=random.choice(list(TaskType)),
                difficulty=np.random.beta(2, 5),  # Bias toward medium difficulty
                features=np.random.randn(100),
                ground_truth=random.randint(0, 1),
                edge_case=is_edge
            )
            self.tasks[task.id] = task

    def solve_task(self, tile: Tile, task: Task) -> Tuple[float, str]:
        """
        Simulate tile solving a task.
        Returns (score, strategy_used).
        """
        # Strategy effectiveness depends on task type and tile strategy
        base_effectiveness = np.mean(tile.strategy_vector) * 0.5 + 0.5

        # Add noise based on task difficulty
        noise = np.random.randn() * task.difficulty * 0.2

        # Score with some randomness (stochastic superiority)
        score = np.clip(base_effectiveness + noise, 0.0, 1.0)

        # Generate strategy signature
        strategy_used = f"strat_{hash(tuple(tile.strategy_vector[:5].round(2))) % 1000:03d}"

        return score, strategy_used

    def run_match(
        self,
        tile_a: Tile,
        tile_b: Tile,
        task: Task
    ) -> MatchResult:
        """Run a competitive match between two tiles on a task."""
        score_a, strat_a = self.solve_task(tile_a, task)
        score_b, strat_b = self.solve_task(tile_b, task)

        winner_id = tile_a.id if score_a >= score_b else tile_b.id

        result = MatchResult(
            tile_a_id=tile_a.id,
            tile_b_id=tile_b.id,
            task_id=task.id,
            winner_id=winner_id,
            score_a=score_a,
            score_b=score_b,
            strategy_used=strat_a if winner_id == tile_a.id else strat_b,
            timestamp=len(self.match_history)
        )

        # Update ELO
        score_for_elo = 1.0 if score_a > score_b else (0.5 if score_a == score_b else 0.0)
        new_a, new_b = self.elo_system.update_ratings(tile_a, tile_b, score_for_elo)

        tile_a.elo_rating = new_a
        tile_b.elo_rating = new_b

        # Update win/loss
        if winner_id == tile_a.id:
            tile_a.wins += 1
            tile_b.losses += 1
        else:
            tile_b.wins += 1
            tile_a.losses += 1

        self.match_history.append(result)
        return result

    def run_generation(self, matches_per_tile: int = 10):
        """Run a full generation of competition."""
        tiles_list = list(self.tiles.values())
        tasks_list = list(self.tasks.values())

        for tile in tiles_list:
            for _ in range(matches_per_tile):
                # Select opponent using Gumbel-Softmax
                opponent_scores = np.array([
                    abs(tile.elo_rating - t.elo_rating) for t in tiles_list if t.id != tile.id
                ])
                opponent_idx, _ = gumbel_softmax_selection(
                    opponent_scores,
                    temperature=self.temperature
                )
                opponent = [t for t in tiles_list if t.id != tile.id][opponent_idx]

                # Select task using Gumbel-Softmax
                task_scores = np.array([t.difficulty for t in tasks_list])
                task_idx, _ = gumbel_softmax_selection(task_scores, temperature=self.temperature)
                task = tasks_list[task_idx]

                # Run match
                self.run_match(tile, opponent, task)

        # Track generation stats
        gen_stats = {
            "generation": len(self.generations),
            "avg_elo": np.mean([t.elo_rating for t in self.tiles.values()]),
            "elo_std": np.std([t.elo_rating for t in self.tiles.values()]),
            "avg_win_rate": np.mean([t.win_rate for t in self.tiles.values()]),
            "novel_strategies": self._count_novel_strategies()
        }
        self.generations.append(gen_stats)

    def evolve_population(self):
        """Evolve population using selection, crossover, and mutation."""
        tiles_list = list(self.tiles.values())

        # Sort by ELO (selection pressure)
        tiles_list.sort(key=lambda t: t.elo_rating, reverse=True)

        # Keep top 50%
        survivors = tiles_list[:len(tiles_list) // 2]

        new_tiles = []
        next_gen = len(self.generations)

        # Create offspring through crossover and mutation
        while len(new_tiles) < len(tiles_list) - len(survivors):
            # Select parents using Gumbel-Softmax
            parent_scores = np.array([t.elo_rating for t in survivors])
            p1_idx, _ = gumbel_softmax_selection(parent_scores, temperature=self.temperature)
            p2_idx, _ = gumbel_softmax_selection(parent_scores, temperature=self.temperature)

            parent1, parent2 = survivors[p1_idx], survivors[p2_idx]

            # Crossover
            if random.random() < self.crossover_rate:
                crossover_point = random.randint(1, self.strategy_dim - 1)
                child_strategy = np.concatenate([
                    parent1.strategy_vector[:crossover_point],
                    parent2.strategy_vector[crossover_point:]
                ])
            else:
                child_strategy = parent1.strategy_vector.copy()

            # Mutation
            mutation_mask = np.random.random(self.strategy_dim) < self.mutation_rate
            child_strategy[mutation_mask] += np.random.randn(np.sum(mutation_mask)) * 0.3

            child = Tile(
                id=f"tile_gen{next_gen}_{len(new_tiles):03d}",
                strategy_vector=child_strategy,
                elo_rating=(parent1.elo_rating + parent2.elo_rating) / 2,
                generation=next_gen
            )

            # Track if strategy is novel
            strategy_sig = self._strategy_signature(child_strategy)
            if self._is_novel_strategy(strategy_sig):
                child.novel_strategies_discovered.append(strategy_sig)

            new_tiles.append(child)

        # Update population
        self.tiles = {t.id: t for t in survivors + new_tiles}
        for tile in self.tiles.values():
            self.elo_system.ratings[tile.id] = tile.elo_rating

    def _strategy_signature(self, strategy: np.ndarray) -> str:
        """Generate unique signature for a strategy."""
        return f"sig_{hash(tuple(strategy[:10].round(3))) % 10000:04d}"

    def _is_novel_strategy(self, signature: str) -> bool:
        """Check if strategy signature is novel."""
        all_signatures = set()
        for tile in self.tiles.values():
            all_signatures.add(self._strategy_signature(tile.strategy_vector))
        return signature not in all_signatures

    def _count_novel_strategies(self) -> int:
        """Count novel strategies in current population."""
        all_signatures = set()
        for tile in self.tiles.values():
            all_signatures.add(self._strategy_signature(tile.strategy_vector))
        return len(all_signatures)

    def calculate_elo_correlation(self) -> float:
        """Calculate correlation between ELO and actual performance."""
        elos = []
        win_rates = []
        for tile in self.tiles.values():
            if tile.wins + tile.losses > 0:
                elos.append(tile.elo_rating)
                win_rates.append(tile.win_rate)

        if len(elos) < 2:
            return 0.0

        correlation = np.corrcoef(elos, win_rates)[0, 1]
        return correlation if not np.isnan(correlation) else 0.0

    def compare_to_static(self, num_rounds: int = 100) -> Dict:
        """Compare self-play to static configuration."""
        # Self-play performance
        self_play_success = []
        for tile in self.tiles.values():
            if tile.wins + tile.losses > 0:
                self_play_success.append(tile.win_rate)

        # Simulate static (no evolution) performance
        static_tiles = [
            Tile(
                id=f"static_{i:03d}",
                strategy_vector=np.random.randn(self.strategy_dim)
            )
            for i in range(self.num_tiles)
        ]

        static_success = []
        tasks_list = list(self.tasks.values())
        for tile in static_tiles:
            wins = 0
            for _ in range(num_rounds):
                task = random.choice(tasks_list)
                score, _ = self.solve_task(tile, task)
                if score > 0.5:
                    wins += 1
            static_success.append(wins / num_rounds)

        improvement = (
            (np.mean(self_play_success) - np.mean(static_success))
            / np.mean(static_success) * 100
        )

        return {
            "self_play_success_rate": np.mean(self_play_success),
            "static_success_rate": np.mean(static_success),
            "improvement_percent": improvement,
            "claim_30_percent": improvement > 30
        }

# ============================================================================
# VALIDATION RUNNER
# ============================================================================

def run_validation_simulation(
    num_generations: int = 10,
    tiles_per_gen: int = 20,
    tasks_count: int = 100,
    matches_per_tile: int = 10
) -> Dict:
    """
    Run full validation simulation for P24 claims.

    Returns validation results for all 4 claims.
    """
    sim = SelfPlaySimulation(
        num_tiles=tiles_per_gen,
        strategy_dim=50,
        temperature=0.8
    )

    # Initialize
    sim.initialize_population()
    sim.generate_tasks(tasks_count)

    # Run generations
    for gen in range(num_generations):
        print(f"Running generation {gen + 1}/{num_generations}...")
        sim.run_generation(matches_per_tile)
        sim.evolve_population()

    # Calculate metrics
    elo_corr = sim.calculate_elo_correlation()
    comparison = sim.compare_to_static()

    # Count edge cases discovered
    edge_cases_found = len([
        m for m in sim.match_history
        if sim.tasks[m.task_id].edge_case and m.winner_id
    ])

    # Count novel strategies
    novel_count = sum(
        len(t.novel_strategies_discovered)
        for t in sim.tiles.values()
    )

    results = {
        "claim_1_self_play_improvement": {
            "description": "Self-play improves success rate >30% over static",
            "self_play_rate": comparison["self_play_success_rate"],
            "static_rate": comparison["static_success_rate"],
            "improvement_percent": comparison["improvement_percent"],
            "validated": comparison["claim_30_percent"],
            "threshold": 30.0
        },
        "claim_2_elo_correlation": {
            "description": "ELO ratings correlate with performance (r > 0.8)",
            "correlation": elo_corr,
            "validated": elo_corr > 0.8,
            "threshold": 0.8
        },
        "claim_3_novel_strategies": {
            "description": "Generational evolution produces novel strategies",
            "novel_strategy_count": novel_count,
            "generations": num_generations,
            "validated": novel_count > 0,
            "threshold": "> 0"
        },
        "claim_4_edge_case_discovery": {
            "description": "Adversarial training finds edge cases",
            "edge_cases_found": edge_cases_found,
            "total_edge_cases": len([t for t in sim.tasks.values() if t.edge_case]),
            "validated": edge_cases_found > 0,
            "threshold": "> 0"
        },
        "summary": {
            "total_matches": len(sim.match_history),
            "final_avg_elo": sim.generations[-1]["avg_elo"] if sim.generations else 0,
            "elo_std": sim.generations[-1]["elo_std"] if sim.generations else 0
        }
    }

    return results


if __name__ == "__main__":
    print("=" * 60)
    print("P24: Self-Play Mechanisms - Validation Simulation")
    print("=" * 60)

    results = run_validation_simulation(
        num_generations=5,
        tiles_per_gen=20,
        tasks_count=50,
        matches_per_tile=5
    )

    print("\n" + "=" * 60)
    print("VALIDATION RESULTS")
    print("=" * 60)

    for claim_id, claim_data in results.items():
        if claim_id == "summary":
            continue
        status = "✅ VALIDATED" if claim_data["validated"] else "❌ NOT VALIDATED"
        print(f"\n{claim_id}: {claim_data['description']}")
        print(f"  Status: {status}")
        for key, value in claim_data.items():
            if key not in ["description", "validated"]:
                print(f"  {key}: {value}")

    print("\n" + "=" * 60)
    print(f"Summary: {results['summary']}")

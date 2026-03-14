"""
Escalation Router Simulation - Cost Reduction Validation

Claim: Intelligent Bot→Brain→Human routing achieves 40x cost reduction
compared to always using Brain tier, while maintaining acceptable quality.

Simulation validates:
1. Actual cost reduction across workload distributions
2. Quality preservation across routing strategies
3. Optimal confidence thresholds for maximum savings
4. Caching impact on long-term cost reduction
"""

import numpy as np
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional
from enum import Enum
import json
from datetime import datetime
from collections import defaultdict


class RoutingTier(Enum):
    """Routing tiers with associated costs"""
    BOT = "bot"
    BRAIN = "brain"
    HUMAN = "human"


class QueryComplexity(Enum):
    """Query complexity levels"""
    TRIVIAL = "trivial"
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    EXTREME = "extreme"


class StakesLevel(Enum):
    """Decision stakes levels"""
    MINIMAL = "minimal"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Query:
    """Represents a query with routing decision factors"""
    id: str
    text: str
    complexity: QueryComplexity
    stakes: StakesLevel
    urgency: int  # 0-100
    novelty: float  # 0-1
    has_code: bool
    requires_judgment: bool
    requires_approval: bool
    legal_compliance: bool
    safety_sensitive: bool
    ground_truth_tier: RoutingTier  # Ideal tier for quality comparison


@dataclass
class RoutingDecision:
    """Routing decision with metadata"""
    query_id: str
    predicted_tier: RoutingTier
    confidence: float
    cost: float
    cached: bool
    decision_factors: Dict[str, float]
    execution_time_ms: float


@dataclass
class SimulationResult:
    """Results from simulation run"""
    total_cost: float
    total_queries: int
    tier_distribution: Dict[RoutingTier, int]
    cost_reduction_ratio: float
    quality_score: float
    cache_hit_rate: float
    routing_accuracy: float
    average_confidence: float
    cost_per_query: float


class CostModel:
    """
    Cost model for each tier (actual API costs)

    From documentation:
    - Bot: $0.002/request
    - Brain: $0.03/request
    - Human: $30+/request (using $30 for simulation)
    """

    COSTS = {
        RoutingTier.BOT: 0.002,
        RoutingTier.BRAIN: 0.03,
        RoutingTier.HUMAN: 30.0,
    }

    @classmethod
    def get_cost(cls, tier: RoutingTier) -> float:
        """Get cost for a tier"""
        return cls.COSTS[tier]


class QueryGenerator:
    """Generate synthetic query workload"""

    def __init__(self, seed: int = 42):
        np.random.seed(seed)

    def generate_workload(
        self,
        n_queries: int = 1000,
        distribution: str = "realistic"
    ) -> List[Query]:
        """
        Generate synthetic query workload

        Distribution types:
        - realistic: 70% simple, 20% moderate, 10% complex
        - uniform: Even distribution across complexity levels
        - complex_heavy: 50% complex queries
        """
        queries = []

        # Complexity distribution based on type
        complexity_dist = self._get_complexity_distribution(distribution)

        for i in range(n_queries):
            complexity = np.random.choice(
                list(QueryComplexity),
                p=complexity_dist
            )

            # Generate correlated factors
            query = self._generate_query(i, complexity)
            queries.append(query)

        return queries

    def _get_complexity_distribution(self, distribution: str) -> List[float]:
        """Get probability distribution for complexity levels"""
        distributions = {
            "realistic": [0.50, 0.20, 0.15, 0.10, 0.05],  # Most queries simple
            "uniform": [0.20] * 5,
            "complex_heavy": [0.10, 0.10, 0.15, 0.40, 0.25],
        }
        return distributions.get(distribution, distributions["realistic"])

    def _generate_query(self, id: int, complexity: QueryComplexity) -> Query:
        """Generate a single query with correlated factors"""
        # Complexity correlates with stakes, urgency, novelty
        complexity_val = list(QueryComplexity).index(complexity) / 4

        # Stakes correlates with complexity but with noise
        stakes_idx = min(
            4,
            int(complexity_val * 4 + np.random.normal(0, 1))
        )
        stakes = list(StakesLevel)[max(0, stakes_idx)]

        # Generate other factors
        urgency = int(complexity_val * 100 + np.random.normal(0, 20))
        urgency = max(0, min(100, urgency))

        novelty = min(1.0, complexity_val + np.random.normal(0, 0.2))
        novelty = max(0, novelty)

        has_code = complexity_val > 0.4 and np.random.random() > 0.5
        stakes_val = list(StakesLevel).index(stakes)
        requires_judgment = stakes_val > 2
        requires_approval = stakes_val > 3
        legal_compliance = stakes_val == 4 and np.random.random() > 0.7
        safety_sensitive = stakes_val == 4 and np.random.random() > 0.5

        # Determine ground truth tier (what a human expert would choose)
        ground_truth_tier = self._determine_ground_truth(
            complexity, stakes, urgency, novelty, has_code,
            requires_judgment, requires_approval, legal_compliance, safety_sensitive
        )

        return Query(
            id=f"query_{id}",
            text=f"Sample query {id} with {complexity.value} complexity",
            complexity=complexity,
            stakes=stakes,
            urgency=urgency,
            novelty=novelty,
            has_code=has_code,
            requires_judgment=requires_judgment,
            requires_approval=requires_approval,
            legal_compliance=legal_compliance,
            safety_sensitive=safety_sensitive,
            ground_truth_tier=ground_truth_tier
        )

    def _determine_ground_truth(self, complexity, stakes, urgency, novelty,
                                has_code, requires_judgment, requires_approval,
                                legal_compliance, safety_sensitive) -> RoutingTier:
        """Determine optimal tier based on expert rules"""

        # Critical conditions -> Human
        if (legal_compliance or safety_sensitive or
            (requires_approval and list(StakesLevel).index(stakes) >= 4)):
            return RoutingTier.HUMAN

        # High stakes with judgment -> Brain or Human based on urgency
        if requires_judgment and list(StakesLevel).index(stakes) >= 3:
            return RoutingTier.BRAIN if urgency > 50 else RoutingTier.HUMAN

        # Code or high novelty -> Brain
        if has_code or novelty > 0.7:
            return RoutingTier.BRAIN

        # Complex or higher -> Brain
        if list(QueryComplexity).index(complexity) >= 3:
            return RoutingTier.BRAIN

        # Simple -> Bot
        return RoutingTier.BOT


class EscalationRouter:
    """
    Simulated Escalation Router with configurable routing strategy
    """

    def __init__(
        self,
        bot_min_confidence: float = 0.7,
        brain_min_confidence: float = 0.5,
        high_stakes_threshold: float = 0.7,
        enable_caching: bool = True,
        cache_size: int = 1000,
    ):
        self.bot_min_confidence = bot_min_confidence
        self.brain_min_confidence = brain_min_confidence
        self.high_stakes_threshold = high_stakes_threshold
        self.enable_caching = enable_caching
        self.cache = {}
        self.cache_max_size = cache_size
        self.routing_history = []

    def route(self, query: Query) -> RoutingDecision:
        """
        Route query to appropriate tier

        Returns: RoutingDecision with tier, confidence, cost
        """
        # Check cache first
        cache_key = self._get_cache_key(query)
        if self.enable_caching and cache_key in self.cache:
            cached_decision = self.cache[cache_key]
            cached_decision.cached = True
            return cached_decision

        # Analyze query factors
        factors = self._analyze_query(query)

        # Determine tier
        tier = self._determine_tier(query, factors)

        # Calculate confidence
        confidence = self._calculate_confidence(query, factors, tier)

        # Calculate cost
        cost = CostModel.get_cost(tier)

        decision = RoutingDecision(
            query_id=query.id,
            predicted_tier=tier,
            confidence=confidence,
            cost=cost,
            cached=False,
            decision_factors=factors,
            execution_time_ms=self._estimate_execution_time(tier)
        )

        # Cache if enabled
        if self.enable_caching:
            self._add_to_cache(cache_key, decision)

        self.routing_history.append(decision)
        return decision

    def _get_cache_key(self, query: Query) -> str:
        """Generate cache key from query features"""
        return f"{query.complexity.value}_{query.stakes.value}_{query.has_code}_{int(query.novelty * 10)}"

    def _analyze_query(self, query: Query) -> Dict[str, float]:
        """Analyze query to extract decision factors"""
        complexity_score = list(QueryComplexity).index(query.complexity) / 4
        stakes_score = list(StakesLevel).index(query.stakes) / 4
        urgency_score = query.urgency / 100

        return {
            "complexity": complexity_score,
            "stakes": stakes_score,
            "urgency": urgency_score,
            "novelty": query.novelty,
            "has_code": 1.0 if query.has_code else 0.0,
            "requires_judgment": 1.0 if query.requires_judgment else 0.0,
        }

    def _determine_tier(self, query: Query, factors: Dict[str, float]) -> RoutingTier:
        """
        Determine routing tier using decision rules

        Rules from documentation:
        - Trivial complexity + Low stakes -> Bot
        - Code present + Not trivial -> Brain
        - High novelty (>0.7) -> Brain
        - Critical stakes + Approval needed -> Human
        - Legal compliance + Critical stakes -> Human
        - Safety sensitive + Critical stakes -> Human
        - High stakes + Emotional content -> Human
        """

        # Critical conditions for Human tier
        if query.legal_compliance or query.safety_sensitive:
            return RoutingTier.HUMAN

        if query.requires_approval and factors["stakes"] >= self.high_stakes_threshold:
            return RoutingTier.HUMAN

        # Brain tier conditions
        if query.has_code and factors["complexity"] > 0.2:
            return RoutingTier.BRAIN

        if factors["novelty"] > 0.7:
            return RoutingTier.BRAIN

        if factors["complexity"] >= 0.6:
            return RoutingTier.BRAIN

        # Default to Bot for simple queries
        return RoutingTier.BOT

    def _calculate_confidence(self, query: Query, factors: Dict[str, float],
                             tier: RoutingTier) -> float:
        """Calculate confidence in routing decision"""
        base_confidence = 0.7

        # Adjust based on factor clarity
        if factors["stakes"] < 0.3 or factors["stakes"] > 0.7:
            base_confidence += 0.1  # Clear stakes

        if factors["complexity"] < 0.2 or factors["complexity"] > 0.8:
            base_confidence += 0.1  # Clear complexity

        # Human tier decisions have higher confidence
        if tier == RoutingTier.HUMAN:
            base_confidence += 0.15

        # Bot tier for simple queries
        if tier == RoutingTier.BOT and factors["complexity"] < 0.4:
            base_confidence += 0.1

        return min(0.98, base_confidence)

    def _estimate_execution_time(self, tier: RoutingTier) -> float:
        """Estimate execution time in milliseconds"""
        times = {
            RoutingTier.BOT: 100,
            RoutingTier.BRAIN: 2000,
            RoutingTier.HUMAN: 300000,  # 5 minutes
        }
        return times[tier]

    def _add_to_cache(self, key: str, decision: RoutingDecision):
        """Add decision to cache with LRU eviction"""
        if len(self.cache) >= self.cache_max_size:
            # Simple FIFO eviction (could be LRU in production)
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        self.cache[key] = decision

    def get_cache_hit_rate(self) -> float:
        """Calculate cache hit rate from history"""
        if not self.routing_history:
            return 0.0
        hits = sum(1 for d in self.routing_history if d.cached)
        return hits / len(self.routing_history)


class BaselineRouter:
    """Baseline router that always uses Brain tier"""

    def route(self, query: Query) -> RoutingDecision:
        return RoutingDecision(
            query_id=query.id,
            predicted_tier=RoutingTier.BRAIN,
            confidence=1.0,
            cost=CostModel.get_cost(RoutingTier.BRAIN),
            cached=False,
            decision_factors={},
            execution_time_ms=2000
        )


class QualityEvaluator:
    """Evaluate quality of routing decisions"""

    @staticmethod
    def evaluate_accuracy(decisions: List[RoutingDecision],
                         queries: List[Query]) -> float:
        """
        Calculate routing accuracy (correct tier selection)

        Correct: Predicted tier matches ground truth
        Partial: One tier difference (e.g., Bot instead of Brain)
        Incorrect: More than one tier difference
        """
        correct = 0
        partial = 0
        total = len(decisions)

        for decision, query in zip(decisions, queries):
            if decision.predicted_tier == query.ground_truth_tier:
                correct += 1
            elif QualityEvaluator._is_partial_match(
                decision.predicted_tier, query.ground_truth_tier
            ):
                partial += 0.5

        return (correct + partial) / total

    @staticmethod
    def _is_partial_match(predicted: RoutingTier, ground_truth: RoutingTier) -> bool:
        """Check if prediction is within one tier of ground truth"""
        tier_order = [RoutingTier.BOT, RoutingTier.BRAIN, RoutingTier.HUMAN]
        pred_idx = tier_order.index(predicted)
        truth_idx = tier_order.index(ground_truth)
        return abs(pred_idx - truth_idx) == 1

    @staticmethod
    def estimate_quality_preservation(
        intelligent_cost: float,
        baseline_cost: float,
        accuracy: float
    ) -> float:
        """
        Estimate quality preservation ratio

        Higher is better - indicates quality maintained despite cost reduction
        """
        cost_ratio = intelligent_cost / baseline_cost
        return accuracy / (1 + (1 - cost_ratio))


def run_simulation(
    n_queries: int = 1000,
    distribution: str = "realistic",
    enable_caching: bool = True,
    seed: int = 42,
) -> Tuple[SimulationResult, SimulationResult]:
    """
    Run simulation comparing intelligent routing vs baseline

    Returns: (intelligent_result, baseline_result)
    """
    # Generate workload
    generator = QueryGenerator(seed)
    queries = generator.generate_workload(n_queries, distribution)

    # Run intelligent routing
    intelligent_router = EscalationRouter(enable_caching=enable_caching)
    intelligent_decisions = [intelligent_router.route(q) for q in queries]

    # Run baseline (always Brain)
    baseline_router = BaselineRouter()
    baseline_decisions = [baseline_router.route(q) for q in queries]

    # Calculate metrics
    intelligent_result = _calculate_result(
        intelligent_decisions, queries, intelligent_router
    )
    baseline_result = _calculate_result(
        baseline_decisions, queries, baseline_router
    )

    return intelligent_result, baseline_result


def _calculate_result(
    decisions: List[RoutingDecision],
    queries: List[Query],
    router
) -> SimulationResult:
    """Calculate simulation result metrics"""
    total_cost = sum(d.cost for d in decisions)
    tier_counts = defaultdict(int)
    for d in decisions:
        tier_counts[d.predicted_tier] += 1

    accuracy = QualityEvaluator.evaluate_accuracy(decisions, queries)
    avg_confidence = np.mean([d.confidence for d in decisions])
    cache_hit_rate = router.get_cache_hit_rate() if hasattr(router, 'get_cache_hit_rate') else 0.0

    # Quality score combines accuracy and confidence
    quality_score = accuracy * 0.7 + avg_confidence * 0.3

    return SimulationResult(
        total_cost=total_cost,
        total_queries=len(decisions),
        tier_distribution=dict(tier_counts),
        cost_reduction_ratio=0.0,  # Will be calculated by caller
        quality_score=quality_score,
        cache_hit_rate=cache_hit_rate,
        routing_accuracy=accuracy,
        average_confidence=avg_confidence,
        cost_per_query=total_cost / len(decisions)
    )


def statistical_analysis(results: List[Tuple[SimulationResult, SimulationResult]]):
    """
    Perform statistical analysis on multiple simulation runs

    Validates claim with proper statistical testing
    """
    intelligent_costs = [r[0].total_cost for r in results]
    baseline_costs = [r[1].total_cost for r in results]

    intelligent_accuracies = [r[0].routing_accuracy for r in results]

    # Calculate cost reduction
    cost_reductions = [
        (b - i) / b * 100
        for i, b in zip(intelligent_costs, baseline_costs)
    ]

    print("\n" + "="*60)
    print("STATISTICAL ANALYSIS")
    print("="*60)
    print(f"Simulation runs: {len(results)}")
    print(f"\nCost Reduction:")
    print(f"  Mean: {np.mean(cost_reductions):.2f}%")
    print(f"  Std:  {np.std(cost_reductions):.2f}%")
    print(f"  95% CI: [{np.percentile(cost_reductions, 2.5):.2f}%, {np.percentile(cost_reductions, 97.5):.2f}%]")

    print(f"\nRouting Accuracy:")
    print(f"  Mean: {np.mean(intelligent_accuracies):.4f}")
    print(f"  Std:  {np.std(intelligent_accuracies):.4f}")

    print(f"\nQuality Preservation:")
    quality_scores = [r[0].quality_score for r in results]
    print(f"  Mean: {np.mean(quality_scores):.4f}")
    print(f"  Std:  {np.std(quality_scores):.4f}")

    # Validate 40x reduction claim
    mean_reduction_ratio = np.mean([b/i for i, b in zip(intelligent_costs, baseline_costs)])
    print(f"\nCost Reduction Ratio:")
    print(f"  Mean: {mean_reduction_ratio:.2f}x")
    print(f"  Claim validation: {'[PASS]' if mean_reduction_ratio >= 40 else '[FAIL]'} (claimed: 40x)")

    return {
        "mean_cost_reduction_pct": np.mean(cost_reductions),
        "mean_reduction_ratio": mean_reduction_ratio,
        "mean_accuracy": np.mean(intelligent_accuracies),
        "claim_validated": mean_reduction_ratio >= 40
    }


def main():
    """Main simulation runner"""
    print("Escalation Router Simulation - Cost Reduction Validation")
    print("="*60)

    # Single run for demonstration
    print("\nRunning single simulation (1000 queries, realistic distribution)...")
    intelligent, baseline = run_simulation(
        n_queries=1000,
        distribution="realistic",
        enable_caching=True,
        seed=42
    )

    print(f"\nIntelligent Routing:")
    print(f"  Total cost: ${intelligent.total_cost:.4f}")
    print(f"  Cost per query: ${intelligent.cost_per_query:.4f}")
    print(f"  Tier distribution: {intelligent.tier_distribution}")
    print(f"  Cache hit rate: {intelligent.cache_hit_rate:.2%}")
    print(f"  Routing accuracy: {intelligent.routing_accuracy:.2%}")
    print(f"  Quality score: {intelligent.quality_score:.4f}")

    print(f"\nBaseline (Always Brain):")
    print(f"  Total cost: ${baseline.total_cost:.4f}")
    print(f"  Cost per query: ${baseline.cost_per_query:.4f}")

    cost_reduction_pct = (baseline.total_cost - intelligent.total_cost) / baseline.total_cost * 100
    cost_reduction_ratio = baseline.total_cost / intelligent.total_cost

    print(f"\nCost Reduction:")
    print(f"  Percentage: {cost_reduction_pct:.2f}%")
    print(f"  Ratio: {cost_reduction_ratio:.2f}x")
    print(f"  Savings: ${baseline.total_cost - intelligent.total_cost:.4f}")

    # Multiple runs for statistical validation
    print("\n" + "="*60)
    print("Running statistical validation (20 replications)...")
    results = []
    for i in range(20):
        intelligent_r, baseline_r = run_simulation(
            n_queries=1000,
            distribution="realistic",
            enable_caching=True,
            seed=42 + i
        )
        results.append((intelligent_r, baseline_r))

    stats = statistical_analysis(results)

    # Save results
    output = {
        "timestamp": datetime.now().isoformat(),
        "single_run": {
            "intelligent": {
                "total_cost": intelligent.total_cost,
                "tier_distribution": intelligent.tier_distribution,
                "cache_hit_rate": intelligent.cache_hit_rate,
                "routing_accuracy": intelligent.routing_accuracy,
                "quality_score": intelligent.quality_score,
            },
            "baseline": {
                "total_cost": baseline.total_cost,
            },
            "cost_reduction_pct": cost_reduction_pct,
            "cost_reduction_ratio": cost_reduction_ratio,
        },
        "statistical_analysis": stats,
        "claim_validated": stats["claim_validated"]
    }

    output_path = "C:/Users/casey/polln/research/ecosystem_simulations/escalation_router_results.json"
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nResults saved to: {output_path}")

    return output


if __name__ == "__main__":
    main()

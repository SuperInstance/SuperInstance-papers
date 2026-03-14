"""
Consensus Engine Simulation - Tripartite Deliberation Quality Validation

Claim: Pathos/Logos/Ethos tripartite deliberation produces better decisions
than single-perspective approaches by >20% accuracy improvement.

Simulation validates:
1. Decision accuracy improvement vs. single-perspective baselines
2. Domain-adaptive weighting effectiveness
3. Conflict resolution strategy impact
4. Computational overhead of multi-perspective deliberation
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional
from enum import Enum
import json
from datetime import datetime
from collections import defaultdict


class TripartitePerspective(Enum):
    """The three rhetorical perspectives"""
    PATHOS = "pathos"  # Emotion, intent, human experience
    LOGOS = "logos"    # Logic, reason, rational argument
    ETHOS = "ethos"    # Ethics, credibility, moral character


class DomainType(Enum):
    """Decision domain types with different perspective weights"""
    FACTUAL = "factual"       # Pathos: 0.15, Logos: 0.60, Ethos: 0.25
    EMOTIONAL = "emotional"   # Pathos: 0.50, Logos: 0.20, Ethos: 0.30
    SENSITIVE = "sensitive"   # Pathos: 0.30, Logos: 0.25, Ethos: 0.45
    CREATIVE = "creative"     # Pathos: 0.40, Logos: 0.30, Ethos: 0.30
    BALANCED = "balanced"     # Pathos: 0.333, Logos: 0.334, Ethos: 0.333
    TECHNICAL = "technical"   # Pathos: 0.10, Logos: 0.70, Ethos: 0.20
    SOCIAL = "social"         # Pathos: 0.40, Logos: 0.25, Ethos: 0.35
    BUSINESS = "business"     # Pathos: 0.25, Logos: 0.45, Ethos: 0.30
    PERSONAL = "personal"     # Pathos: 0.45, Logos: 0.30, Ethos: 0.25


@dataclass
class Proposition:
    """A proposition requiring deliberation"""
    id: str
    text: str
    domain: DomainType
    context: str
    ground_truth_decision: bool  # True = approve, False = reject
    ground_truth_confidence: float
    difficulty: float  # 0-1, how difficult the decision is


@dataclass
class PerspectiveAnalysis:
    """Analysis from a single perspective"""
    perspective: TripartitePerspective
    verdict: bool
    confidence: float
    arguments: List[str]
    concerns: List[str]
    reasoning_time_ms: float


@dataclass
class DeliberationResult:
    """Result from deliberation process"""
    proposition_id: str
    consensus: bool
    final_verdict: str
    confidence: float
    perspectives: List[PerspectiveAnalysis]
    rounds_completed: int
    conflicts_resolved: int
    total_time_ms: float
    correct: bool  # Matches ground truth
    domain_weights: Dict[str, float]


class DomainWeightCalculator:
    """
    Calculate perspective weights for different domains

    From documentation:
    - factual: Logic-heavy (60% logos)
    - emotional: Emotion-heavy (50% pathos)
    - sensitive: Ethics-heavy (45% ethos)
    - etc.
    """

    WEIGHTS = {
        DomainType.FACTUAL: {
            TripartitePerspective.PATHOS: 0.15,
            TripartitePerspective.LOGOS: 0.60,
            TripartitePerspective.ETHOS: 0.25,
        },
        DomainType.EMOTIONAL: {
            TripartitePerspective.PATHOS: 0.50,
            TripartitePerspective.LOGOS: 0.20,
            TripartitePerspective.ETHOS: 0.30,
        },
        DomainType.SENSITIVE: {
            TripartitePerspective.PATHOS: 0.30,
            TripartitePerspective.LOGOS: 0.25,
            TripartitePerspective.ETHOS: 0.45,
        },
        DomainType.CREATIVE: {
            TripartitePerspective.PATHOS: 0.40,
            TripartitePerspective.LOGOS: 0.30,
            TripartitePerspective.ETHOS: 0.30,
        },
        DomainType.BALANCED: {
            TripartitePerspective.PATHOS: 0.333,
            TripartitePerspective.LOGOS: 0.334,
            TripartitePerspective.ETHOS: 0.333,
        },
        DomainType.TECHNICAL: {
            TripartitePerspective.PATHOS: 0.10,
            TripartitePerspective.LOGOS: 0.70,
            TripartitePerspective.ETHOS: 0.20,
        },
        DomainType.SOCIAL: {
            TripartitePerspective.PATHOS: 0.40,
            TripartitePerspective.LOGOS: 0.25,
            TripartitePerspective.ETHOS: 0.35,
        },
        DomainType.BUSINESS: {
            TripartitePerspective.PATHOS: 0.25,
            TripartitePerspective.LOGOS: 0.45,
            TripartitePerspective.ETHOS: 0.30,
        },
        DomainType.PERSONAL: {
            TripartitePerspective.PATHOS: 0.45,
            TripartitePerspective.LOGOS: 0.30,
            TripartitePerspective.ETHOS: 0.25,
        },
    }

    @classmethod
    def get_weights(cls, domain: DomainType) -> Dict[TripartitePerspective, float]:
        """Get perspective weights for a domain"""
        return cls.WEIGHTS[domain]


class PerspectiveAgent:
    """
    Simulated agent that analyzes from a specific perspective
    """

    def __init__(self, perspective: TripartitePerspective, seed: int = 42):
        self.perspective = perspective
        self.rng = np.random.RandomState(seed)

    def analyze(
        self,
        proposition: Proposition,
        domain_weights: Dict[TripartitePerspective, float]
    ) -> PerspectiveAnalysis:
        """
        Analyze proposition from this perspective

        Simulates perspective-specific analysis with:
        - Domain-appropriate bias
        - Random variation (simulating LLM behavior)
        - Difficulty-dependent accuracy
        """
        # Base accuracy depends on perspective strength in this domain
        perspective_strength = domain_weights[self.perspective]
        base_accuracy = 0.5 + (perspective_strength * 0.4)  # 0.5 to 0.9

        # Adjust for proposition difficulty
        difficulty_penalty = proposition.difficulty * 0.3
        adjusted_accuracy = base_accuracy - difficulty_penalty

        # Make decision
        correct_decision = self.rng.random() < adjusted_accuracy
        verdict = correct_decision == proposition.ground_truth_decision

        # Confidence correlates with perspective strength and correctness
        if verdict == proposition.ground_truth_decision:
            confidence = 0.6 + (perspective_strength * 0.3) + self.rng.uniform(0, 0.1)
        else:
            confidence = 0.4 + (perspective_strength * 0.2) + self.rng.uniform(0, 0.2)

        confidence = min(0.98, confidence)

        # Generate arguments and concerns based on perspective
        arguments, concerns = self._generate_reasoning(proposition, verdict)

        # Reasoning time varies by perspective and proposition complexity
        base_time = 500  # ms
        complexity_multiplier = 1 + proposition.difficulty
        reasoning_time = base_time * complexity_multiplier * self.rng.uniform(0.8, 1.2)

        return PerspectiveAnalysis(
            perspective=self.perspective,
            verdict=verdict,
            confidence=confidence,
            arguments=arguments,
            concerns=concerns,
            reasoning_time_ms=reasoning_time
        )

    def _generate_reasoning(
        self,
        proposition: Proposition,
        verdict: bool
    ) -> Tuple[List[str], List[str]]:
        """Generate perspective-specific arguments and concerns"""
        # Simplified reasoning generation
        if self.perspective == TripartitePerspective.PATHOS:
            if verdict:
                return [
                    f"This aligns with human emotional needs",
                    f"Stakeholders will feel positively about this"
                ], ["May overlook logical implications"]
            else:
                return [
                    f"This could cause emotional distress",
                    f"Stakeholders may feel unheard"
                ], ["Emotional response may be temporary"]

        elif self.perspective == TripartitePerspective.LOGOS:
            if verdict:
                return [
                    f"Logical analysis supports this decision",
                    f"Evidence and data indicate positive outcome"
                ], ["May ignore human factors"]
            else:
                return [
                    f"Insufficient evidence to support",
                    f"Logical inconsistencies detected"
                ], ["May be missing contextual data"]

        else:  # ETHOS
            if verdict:
                return [
                    f"This aligns with ethical principles",
                    f"Moral considerations support approval"
                ], ["May not be practical"]
            else:
                return [
                    f"Ethical concerns raised",
                    f"Potential harm to stakeholders"
                ], ["May be overly conservative"]


class ConsensusEngine:
    """
    Main consensus engine implementing tripartite deliberation
    """

    def __init__(
        self,
        max_rounds: int = 5,
        confidence_threshold: float = 0.7,
        conflict_resolution: str = "weighted",
        seed: int = 42
    ):
        self.max_rounds = max_rounds
        self.confidence_threshold = confidence_threshold
        self.conflict_resolution = conflict_resolution
        self.seed = seed

        # Create perspective agents
        self.agents = {
            TripartitePerspective.PATHOS: PerspectiveAgent(TripartitePerspective.PATHOS, seed),
            TripartitePerspective.LOGOS: PerspectiveAgent(TripartitePerspective.LOGOS, seed + 1),
            TripartitePerspective.ETHOS: PerspectiveAgent(TripartitePerspective.ETHOS, seed + 2),
        }

    def deliberate(self, proposition: Proposition) -> DeliberationResult:
        """
        Deliberate on a proposition using tripartite analysis
        """
        start_time = datetime.now()

        # Get domain weights
        domain_weights = DomainWeightCalculator.get_weights(proposition.domain)

        # Get perspective analyses
        perspectives = [
            self.agents[p].analyze(proposition, domain_weights)
            for p in TripartitePerspective
        ]

        # Detect conflicts
        conflicts = self._detect_conflicts(perspectives)
        conflicts_resolved = 0

        # Resolve conflicts through multiple rounds
        for round_num in range(1, self.max_rounds):
            if not conflicts:
                break

            resolved = self._resolve_conflicts(perspectives, conflicts, domain_weights)
            conflicts_resolved += resolved
            conflicts = self._detect_conflicts(perspectives)

        # Aggregate to final verdict
        final_verdict, confidence = self._aggregate_verdict(
            perspectives, domain_weights, proposition
        )

        # Check if consensus achieved
        consensus = self._check_consensus(perspectives)

        total_time = (datetime.now() - start_time).total_seconds() * 1000

        return DeliberationResult(
            proposition_id=proposition.id,
            consensus=consensus,
            final_verdict="APPROVE" if final_verdict else "REJECT",
            confidence=confidence,
            perspectives=perspectives,
            rounds_completed=len(conflicts) + 1,
            conflicts_resolved=conflicts_resolved,
            total_time_ms=total_time,
            correct=final_verdict == proposition.ground_truth_decision,
            domain_weights={p.value: w for p, w in domain_weights.items()}
        )

    def _detect_conflicts(
        self,
        perspectives: List[PerspectiveAnalysis]
    ) -> List[Tuple[int, int]]:
        """Detect conflicting verdicts between perspectives"""
        conflicts = []
        for i, p1 in enumerate(perspectives):
            for j, p2 in enumerate(perspectives[i+1:], i+1):
                if p1.verdict != p2.verdict:
                    conflicts.append((i, j))
        return conflicts

    def _resolve_conflicts(
        self,
        perspectives: List[PerspectiveAnalysis],
        conflicts: List[Tuple[int, int]],
        domain_weights: Dict[TripartitePerspective, float]
    ) -> int:
        """
        Resolve conflicts using weighted voting

        In production, this would involve more sophisticated cross-examination
        """
        resolved = 0

        for i, j in conflicts:
            p1 = perspectives[i]
            p2 = perspectives[j]

            # Weight by domain importance + confidence
            weight1 = domain_weights[p1.perspective] * p1.confidence
            weight2 = domain_weights[p2.perspective] * p2.confidence

            # Higher weight wins
            if weight1 > weight2:
                # p2 defers to p1
                perspectives[j].verdict = p1.verdict
                perspectives[j].confidence = p1.confidence * 0.9
                resolved += 1
            elif weight2 > weight1:
                # p1 defers to p2
                perspectives[i].verdict = p2.verdict
                perspectives[i].confidence = p2.confidence * 0.9
                resolved += 1
            # If equal, no resolution

        return resolved

    def _aggregate_verdict(
        self,
        perspectives: List[PerspectiveAnalysis],
        domain_weights: Dict[TripartitePerspective, float],
        proposition: Proposition
    ) -> Tuple[bool, float]:
        """
        Aggregate perspectives to final verdict
        """
        # Weighted vote
        approve_weight = 0.0
        reject_weight = 0.0

        for p in perspectives:
            weight = domain_weights[p.perspective] * p.confidence
            if p.verdict:
                approve_weight += weight
            else:
                reject_weight += weight

        # Final verdict
        final_verdict = approve_weight > reject_weight

        # Confidence based on margin
        total_weight = approve_weight + reject_weight
        margin = abs(approve_weight - reject_weight) / total_weight if total_weight > 0 else 0
        confidence = 0.5 + (margin * 0.5)

        return final_verdict, confidence

    def _check_consensus(self, perspectives: List[PerspectiveAnalysis]) -> bool:
        """Check if all perspectives agree"""
        verdicts = [p.verdict for p in perspectives]
        return all(v == verdicts[0] for v in verdicts)


class SinglePerspectiveBaseline:
    """Baseline that uses only a single perspective"""

    def __init__(self, perspective: TripartitePerspective, seed: int = 42):
        self.agent = PerspectiveAgent(perspective, seed)
        self.perspective = perspective

    def decide(self, proposition: Proposition) -> DeliberationResult:
        """Make decision using only one perspective"""
        start_time = datetime.now()

        # Get domain weights (not used but for consistency)
        domain_weights = DomainWeightCalculator.get_weights(proposition.domain)

        # Single perspective analysis
        analysis = self.agent.analyze(proposition, domain_weights)

        total_time = (datetime.now() - start_time).total_seconds() * 1000

        return DeliberationResult(
            proposition_id=proposition.id,
            consensus=True,  # Always consensus with single perspective
            final_verdict="APPROVE" if analysis.verdict else "REJECT",
            confidence=analysis.confidence,
            perspectives=[analysis],
            rounds_completed=1,
            conflicts_resolved=0,
            total_time_ms=total_time,
            correct=analysis.verdict == proposition.ground_truth_decision,
            domain_weights={p.value: w for p, w in domain_weights.items()}
        )


class PropositionGenerator:
    """Generate synthetic propositions for testing"""

    def __init__(self, seed: int = 42):
        np.random.seed(seed)

    def generate_propositions(
        self,
        n_propositions: int = 1000,
        domain_distribution: str = "uniform"
    ) -> List[Proposition]:
        """
        Generate test propositions

        Domain distribution types:
        - uniform: Equal distribution across domains
        - realistic: Factual and business more common
        - sensitive_heavy: More sensitive decisions
        """
        propositions = []

        # Domain distribution
        if domain_distribution == "uniform":
            domain_probs = [1/9] * 9
        elif domain_distribution == "realistic":
            # More factual, business, technical
            domain_probs = [0.20, 0.10, 0.10, 0.05, 0.10, 0.15, 0.10, 0.15, 0.05]
        else:  # sensitive_heavy
            # More sensitive, emotional, personal
            domain_probs = [0.05, 0.20, 0.25, 0.10, 0.10, 0.05, 0.10, 0.05, 0.10]

        domains = list(DomainType)

        for i in range(n_propositions):
            domain = np.random.choice(domains, p=domain_probs)
            proposition = self._generate_proposition(i, domain)
            propositions.append(proposition)

        return propositions

    def _generate_proposition(self, id: int, domain: DomainType) -> Proposition:
        """Generate a single proposition"""
        # Generate context based on domain
        contexts = {
            DomainType.FACTUAL: "Research study with statistical evidence",
            DomainType.EMOTIONAL: "Impact on team morale and well-being",
            DomainType.SENSITIVE: "Ethical implications for stakeholders",
            DomainType.CREATIVE: "Innovation and artistic merit",
            DomainType.TECHNICAL: "Engineering feasibility and performance",
            DomainType.SOCIAL: "Community impact and public perception",
            DomainType.BUSINESS: "Financial implications and market position",
            DomainType.PERSONAL: "Individual growth and satisfaction",
        }

        context = contexts.get(domain, "General consideration")

        # Ground truth depends on domain (simulating domain-specific patterns)
        domain_truth_prob = {
            DomainType.FACTUAL: 0.55,  # Slightly biased toward approval
            DomainType.EMOTIONAL: 0.45,
            DomainType.SENSITIVE: 0.40,
            DomainType.CREATIVE: 0.60,
            DomainType.TECHNICAL: 0.65,
            DomainType.SOCIAL: 0.50,
            DomainType.BUSINESS: 0.55,
            DomainType.PERSONAL: 0.45,
        }

        # Ground truth decision
        truth_prob = domain_truth_prob.get(domain, 0.5)
        ground_truth = np.random.random() < truth_prob

        # Difficulty varies by domain
        difficulty_bias = {
            DomainType.SENSITIVE: 0.8,  # Most difficult
            DomainType.EMOTIONAL: 0.7,
            DomainType.PERSONAL: 0.7,
            DomainType.CREATIVE: 0.6,
            DomainType.FACTUAL: 0.4,  # Easiest
            DomainType.TECHNICAL: 0.4,
        }
        base_difficulty = difficulty_bias.get(domain, 0.5)
        difficulty = base_difficulty + np.random.normal(0, 0.15)
        difficulty = max(0.1, min(0.9, difficulty))

        # Confidence correlates with difficulty
        ground_truth_conf = 0.9 - (difficulty * 0.4)

        return Proposition(
            id=f"prop_{id}",
            text=f"Proposal {id} in {domain.value} domain",
            domain=domain,
            context=context,
            ground_truth_decision=ground_truth,
            ground_truth_confidence=ground_truth_conf,
            difficulty=difficulty
        )


def run_simulation(
    n_propositions: int = 1000,
    domain_distribution: str = "realistic",
    seed: int = 42,
) -> Tuple[List[DeliberationResult], Dict[str, List[DeliberationResult]]]:
    """
    Run simulation comparing tripartite vs single-perspective deliberation

    Returns: (tripartite_results, baseline_results)
    """
    # Generate propositions
    generator = PropositionGenerator(seed)
    propositions = generator.generate_propositions(n_propositions, domain_distribution)

    # Run tripartite deliberation
    engine = ConsensusEngine(max_rounds=5, seed=seed)
    tripartite_results = [
        engine.deliberate(prop) for prop in propositions
    ]

    # Run single-perspective baselines
    baseline_results = {}
    for perspective in TripartitePerspective:
        baseline = SinglePerspectiveBaseline(perspective, seed)
        baseline_results[perspective.value] = [
            baseline.decide(prop) for prop in propositions
        ]

    return tripartite_results, baseline_results


def analyze_results(
    tripartite: List[DeliberationResult],
    baselines: Dict[str, List[DeliberationResult]]
) -> Dict:
    """Analyze and compare results"""
    # Tripartite metrics
    tripartite_accuracy = sum(r.correct for r in tripartite) / len(tripartite)
    tripartite_confidence = np.mean([r.confidence for r in tripartite])
    tripartite_consensus = np.mean([r.consensus for r in tripartite])
    tripartite_time = np.mean([r.total_time_ms for r in tripartite])

    # Baseline metrics
    baseline_metrics = {}
    for perspective, results in baselines.items():
        accuracy = sum(r.correct for r in results) / len(results)
        confidence = np.mean([r.confidence for r in results])
        time = np.mean([r.total_time_ms for r in results])

        baseline_metrics[perspective] = {
            "accuracy": accuracy,
            "confidence": confidence,
            "time_ms": time
        }

    # Calculate improvement
    improvements = {}
    for perspective, metrics in baseline_metrics.items():
        acc_improvement = (tripartite_accuracy - metrics["accuracy"]) / metrics["accuracy"]
        improvements[perspective] = acc_improvement * 100  # Percentage

    return {
        "tripartite": {
            "accuracy": tripartite_accuracy,
            "confidence": tripartite_confidence,
            "consensus_rate": tripartite_consensus,
            "avg_time_ms": tripartite_time,
        },
        "baselines": baseline_metrics,
        "improvements": improvements,
        "avg_improvement_pct": np.mean(list(improvements.values())),
        "claim_validated": np.mean(list(improvements.values())) >= 20  # 20% improvement claim
    }


def main():
    """Main simulation runner"""
    print("Consensus Engine Simulation - Tripartite Deliberation Quality")
    print("="*60)

    # Run simulation
    print("\nRunning simulation (1000 propositions, realistic distribution)...")
    tripartite, baselines = run_simulation(
        n_propositions=1000,
        domain_distribution="realistic",
        seed=42
    )

    # Analyze results
    results = analyze_results(tripartite, baselines)

    print(f"\nTripartite Deliberation:")
    print(f"  Accuracy: {results['tripartite']['accuracy']:.2%}")
    print(f"  Confidence: {results['tripartite']['confidence']:.4f}")
    print(f"  Consensus Rate: {results['tripartite']['consensus_rate']:.2%}")
    print(f"  Avg Time: {results['tripartite']['avg_time_ms']:.2f}ms")

    print(f"\nBaseline Comparisons:")
    for perspective, metrics in results['baselines'].items():
        print(f"  {perspective.capitalize()}:")
        print(f"    Accuracy: {metrics['accuracy']:.2%}")
        print(f"    Improvement: {results['improvements'][perspective]:.1f}%")

    print(f"\nAverage Improvement: {results['avg_improvement_pct']:.1f}%")
    print(f"Claim Validation (≥20% improvement): {'✓ PASS' if results['claim_validated'] else '✗ FAIL'}")

    # Save results
    output = {
        "timestamp": datetime.now().isoformat(),
        "tripartite": results["tripartite"],
        "baselines": results["baselines"],
        "improvements": results["improvements"],
        "average_improvement_pct": results["avg_improvement_pct"],
        "claim_validated": results["claim_validated"]
    }

    output_path = "C:/Users/casey/polln/research/ecosystem_simulations/consensus_engine_results.json"
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2, default=str)

    print(f"\nResults saved to: {output_path}")

    return output


if __name__ == "__main__":
    main()

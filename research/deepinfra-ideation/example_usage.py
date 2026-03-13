"""
Example Usage of SuperInstance DeepInfra Ideation System

Demonstrates how to use the multi-agent AI system for SuperInstance concept development.
"""

import sys
from pathlib import Path

# Add to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from research.deepinfra_ideation.superinstance_workflows import (
    SuperInstanceWorkshop,
    IterativeRefinementLoop,
    run_predefined_workshop
)
from research.deepinfra_ideation.multi_agent_debate import DebateOrchestrator


def example_1_simple_debate():
    """Example 1: Simple multi-agent debate on a topic."""
    print("\n" + "="*80)
    print("EXAMPLE 1: Simple Multi-Agent Debate")
    print("="*80)

    orchestrator = DebateOrchestrator(
        api_key="MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"
    )

    results = orchestrator.run_full_debate(
        topic="How can emergence detection (P27) be applied to cryptocurrency market analysis?",
        context="""
We want to detect emerging patterns in cryptocurrency markets before they become obvious.
Key concepts from P27:
- Transfer entropy for causal emergence
- Mutual information for agent coupling
- Novelty scoring for pattern detection
- Early warning systems for regime shifts

Consider real-time trading applications.
        """,
        n_rounds=2
    )

    print("\nFinal Synthesis:")
    print(results["final_synthesis"].content[:500])
    print("...")


def example_2_iterative_refinement():
    """Example 2: Iteratively refine a concept."""
    print("\n" + "="*80)
    print("EXAMPLE 2: Iterative Refinement Loop")
    print("="*80)

    loop = IterativeRefinementLoop(
        api_key="MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"
    )

    initial_concept = """
    Use self-play mechanisms (P24) to train automated trading agents.
    Agents compete against each other in simulated market environments,
    with ELO ratings tracking performance. The best strategies emerge
    through adversarial competition.
    """

    results = loop.refine_concept(
        initial_concept=initial_concept,
        context="""
Paper: P24 Self-Play Mechanisms
Key insights: ELO-based competition, Gumbel-Softmax selection, arms race dynamics

Real-world: Cryptocurrency trading
Challenges: Non-stationary markets, transaction costs, risk management
        """,
        n_iterations=2  # Reduced for example
    )

    print("\nInitial Concept:")
    print(results["initial_concept"][:200])
    print("\n...\n")

    print("Refined Concept:")
    print(results["final_concept"][:200])
    print("\n...\n")

    print("Final Assessment:")
    print(results["final_assessment"][:500])
    print("...")


def example_3_full_workshop():
    """Example 3: Full paper workshop."""
    print("\n" + "="*80)
    print("EXAMPLE 3: Full Paper Workshop")
    print("="*80)

    workshop = SuperInstanceWorkshop(
        api_key="MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"
    )

    results = workshop.workshop_paper_application(
        paper_id="P24",
        paper_title="Self-Play Mechanisms for Distributed Systems",
        real_world_scenario="""
Apply self-play mechanisms to high-frequency cryptocurrency trading.

Requirements:
- Handle 1000+ trading pairs simultaneously
- Sub-millisecond decision making
- Adaptive to market regime changes
- Risk-aware position sizing
- Real-time learning from market feedback

Success would demonstrate that self-play can discover novel trading strategies
that outperform traditional approaches.
        """
    )

    print("\nWorkshop Results Summary:")
    print(f"Session ID: {results['session_id']}")
    print(f"Stages Completed: {len(results['stages'])}")
    print("\nStage Syntheses:")

    for stage, data in results["stages"].items():
        if "synthesis" in data:
            print(f"\n{stage}:")
            print(data["synthesis"][:200])
            print("...")


def example_4_devils_advocate():
    """Example 4: Devil's advocate claim examination."""
    print("\n" + "="*80)
    print("EXAMPLE 4: Devil's Advocate Examination")
    print("="*80)

    from research.deepinfra_ideation.multi_agent_debate import DevilsAdvocateSession

    session = DevilsAdvocateSession(
        api_key="MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"
    )

    examination = session.examine_claim(
        claim="Self-play mechanisms will achieve >40% improvement over static baselines in trading applications",
        paper_context="""
Paper: P24 Self-Play Mechanisms
Context: High-frequency trading application
Key metrics: ELO correlation >0.8, novel strategies discovered
        """
    )

    print("\nExamination Stages:")
    for stage_data in examination["stages"]:
        stage_name = stage_data["stage"].replace("_", " ").title()
        print(f"\n{stage_name}:")
        print(stage_data["response"]["content"][:300])
        print("...")

    print("\nFinal Synthesis:")
    print(examination["final_synthesis"]["content"][:500])
    print("...")


def example_5_custom_debate():
    """Example 5: Custom debate on any topic."""
    print("\n" + "="*80)
    print("EXAMPLE 5: Custom Debate on SuperInstance Enhancement")
    print("="*80)

    orchestrator = DebateOrchestrator(
        api_key="MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"
    )

    results = orchestrator.run_full_debate(
        topic="How can we enhance P27 (Emergence Detection) with P41 (Causal AI)?",
        context="""
Current SuperInstance Framework:
- P27: Emergence Detection using transfer entropy and novelty scoring
- P41 (Proposed): Causal AI using causal discovery and do-calculus

Potential Synergies:
- Causal graphs could enhance emergence detection
- Do-calculus enables intervention testing
- Counterfactual reasoning for prediction

Task: Design enhanced emergence detection that incorporates causal AI.
        """,
        n_rounds=3
    )

    print("\nEnhancement Proposal:")
    print(results["final_synthesis"].content[:800])
    print("...")


def main():
    """Run all examples."""
    print("\n" + "="*80)
    print("SUPERINSTANCE DEEPINFRA IDEATION - EXAMPLES")
    print("="*80)
    print("\nThis will run 5 examples demonstrating different capabilities.")
    print("Note: Each example makes multiple API calls and may take several minutes.\n")

    examples = [
        ("Simple Multi-Agent Debate", example_1_simple_debate),
        ("Iterative Refinement", example_2_iterative_refinement),
        ("Full Paper Workshop", example_3_full_workshop),
        ("Devil's Advocate", example_4_devils_advocate),
        ("Custom Debate", example_5_custom_debate)
    ]

    for i, (name, func) in enumerate(examples, 1):
        print(f"\n{'='*80}")
        print(f"Running Example {i}/{len(examples)}: {name}")
        print(f"{'='*80}")

        try:
            func()
            print(f"\n✓ Example {i} complete")
        except Exception as e:
            print(f"\n✗ Example {i} failed: {e}")

    print("\n" + "="*80)
    print("ALL EXAMPLES COMPLETE")
    print("="*80)
    print("\nCheck research/deepinfra-ideation/sessions/ for saved results.")


if __name__ == "__main__":
    # Run single example for quick test
    # example_1_simple_debate()

    # Or run all examples
    main()

"""
Main Runner for SuperInstance DeepInfra Simulations

Execute multi-agent AI debates, devil's advocate examinations,
and iterative refinement loops for SuperInstance concept development.
"""

import sys
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from research.deepinfra_ideation.superinstance_workflows import (
    SuperInstanceWorkshop,
    IterativeRefinementLoop,
    PREDEFINED_WORKSHOPS,
    run_predefined_workshop
)
from research.deepinfra_ideation.multi_agent_debate import DebateOrchestrator


def run_custom_debate(topic: str, context: str, rounds: int = 3):
    """Run a custom multi-agent debate on any topic."""
    print(f"\n{'='*80}")
    print("CUSTOM MULTI-AGENT DEBATE")
    print(f"{'='*80}")
    print(f"Topic: {topic}")
    print(f"Rounds: {rounds}")
    print(f"{'='*80}\n")

    orchestrator = DebateOrchestrator(
        api_key="MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"
    )

    results = orchestrator.run_full_debate(
        topic=topic,
        context=context,
        n_rounds=rounds
    )

    # Save results
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"research/deepinfra-ideation/sessions/debate_{timestamp}.json"
    orchestrator.save_debate(results, filename)

    return results


def run_iterative_refinement(concept: str, context: str, iterations: int = 3):
    """Run iterative refinement loop on a concept."""
    print(f"\n{'='*80}")
    print("ITERATIVE REFINEMENT LOOP")
    print(f"{'='*80}")
    print(f"Concept: {concept[:100]}...")
    print(f"Iterations: {iterations}")
    print(f"{'='*80}\n")

    loop = IterativeRefinementLoop(
        api_key="MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"
    )

    results = loop.refine_concept(
        initial_concept=concept,
        context=context,
        n_iterations=iterations
    )

    # Save results
    from datetime import datetime
    import json

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"research/deepinfra-ideation/sessions/refinement_{timestamp}.json"

    # Convert to serializable format
    serializable = {
        "initial_concept": results["initial_concept"],
        "final_concept": results["final_concept"],
        "n_iterations": results["n_iterations"],
        "final_assessment": results["final_assessment"],
        "timestamp": timestamp
    }

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(serializable, f, indent=2, ensure_ascii=False)

    print(f"\nResults saved to: {filename}")

    return results


def run_paper_workshop(paper_id: str, scenario: str = ""):
    """Run full workshop for a SuperInstance paper."""
    if scenario:
        # Custom scenario
        workshop = SuperInstanceWorkshop(
            api_key="MmyxnYgsBqxhJSKauEV6bOyvOPzOo38m"
        )

        results = workshop.workshop_paper_application(
            paper_id=paper_id,
            paper_title=f"Paper {paper_id}",
            real_world_scenario=scenario
        )
    else:
        # Predefined scenario
        results = run_predefined_workshop(paper_id)

    return results


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="SuperInstance DeepInfra AI Simulations"
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Debate command
    debate_parser = subparsers.add_parser("debate", help="Run multi-agent debate")
    debate_parser.add_argument("--topic", required=True, help="Debate topic")
    debate_parser.add_argument("--context", default="", help="Additional context")
    debate_parser.add_argument("--rounds", type=int, default=3, help="Number of rounds")

    # Refine command
    refine_parser = subparsers.add_parser("refine", help="Run iterative refinement")
    refine_parser.add_argument("--concept", required=True, help="Initial concept")
    refine_parser.add_argument("--context", default="", help="Additional context")
    refine_parser.add_argument("--iterations", type=int, default=3, help="Number of iterations")

    # Workshop command
    workshop_parser = subparsers.add_parser("workshop", help="Run paper workshop")
    workshop_parser.add_argument("--paper", required=True, help="Paper ID (e.g., P19)")
    workshop_parser.add_argument("--scenario", default="", help="Custom scenario")

    args = parser.parse_args()

    # Create output directory
    Path("research/deepinfra-ideation/sessions").mkdir(parents=True, exist_ok=True)

    # Execute command
    if args.command == "debate":
        run_custom_debate(args.topic, args.context, args.rounds)

    elif args.command == "refine":
        run_iterative_refinement(args.concept, args.context, args.iterations)

    elif args.command == "workshop":
        run_paper_workshop(args.paper, args.scenario)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()

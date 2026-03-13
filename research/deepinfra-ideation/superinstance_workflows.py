"""
SuperInstance Ideation Workflows

Uses DeepInfra multi-agent system for:
1. Real-world application exploration
2. Rigorous validation planning
3. Devil's advocate stress testing
4. Iterative refinement loops
"""

import json
import asyncio
from pathlib import Path
from typing import Dict, List
from datetime import datetime

from multi_agent_debate import DebateOrchestrator, DevilsAdvocateSession
from deepinfra_config import DEEPINFRA_API_KEY


class SuperInstanceWorkshop:
    """Interactive workshop for SuperInstance concept development."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.orchestrator = DebateOrchestrator(api_key)
        self.devils_advocate = DevilsAdvocateSession(api_key)
        self.output_dir = Path("research/deepinfra-ideation/sessions")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def workshop_paper_application(
        self,
        paper_id: str,
        paper_title: str,
        real_world_scenario: str
    ) -> Dict:
        """Full workshop on applying a paper to real-world scenario."""

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        session_id = f"{paper_id}_{timestamp}"

        print(f"\n{'='*80}")
        print(f"WORKSHOP: {paper_id} - {paper_title}")
        print(f"Scenario: {real_world_scenario[:100]}...")
        print(f"Session ID: {session_id}")
        print(f"{'='*80}")

        workshop_results = {
            "paper_id": paper_id,
            "paper_title": paper_title,
            "scenario": real_world_scenario,
            "session_id": session_id,
            "stages": {}
        }

        # Stage 1: Understanding Phase
        print(f"\n{'─'*80}")
        print("STAGE 1: Conceptual Understanding")
        print(f"{'─'*80}")

        understanding_prompt = f"""
We are applying {paper_title} to this real-world scenario:
{real_world_scenario}

First, establish deep understanding:

1. What are the core mathematical/conceptual foundations of this paper?
2. How do these foundations map to the real-world scenario?
3. What are the key assumptions and their validity in this context?
4. What modifications might be needed for practical application?
5. What are the biggest unknowns/risks?
"""

        understanding = self.orchestrator.run_full_debate(
            topic=f"Understanding {paper_id} for Real-World Application",
            context=understanding_prompt,
            n_rounds=2
        )

        workshop_results["stages"]["understanding"] = {
            "synthesis": understanding["final_synthesis"].content
        }

        self.save_stage(session_id, "understanding", understanding)

        # Stage 2: Application Design
        print(f"\n{'─'*80}")
        print("STAGE 2: Application Architecture Design")
        print(f"{'─'*80}")

        design_prompt = f"""
Based on our understanding of {paper_id}, design the application:

SCENARIO: {real_world_scenario}

KEY INSIGHTS: {understanding['final_synthesis'].content[:500]}

Design:
1. System architecture (components, data flows, interfaces)
2. Algorithm design (core algorithms, data structures)
3. Integration points (how it connects to existing systems)
4. Deployment strategy (edge, cloud, hybrid)
5. Success metrics (how we measure it works)

Be specific and concrete. Include pseudocode or architecture diagrams in text.
"""

        design = self.orchestrator.run_full_debate(
            topic=f"Application Design for {paper_id}",
            context=design_prompt,
            n_rounds=3
        )

        workshop_results["stages"]["design"] = {
            "synthesis": design["final_synthesis"].content
        }

        self.save_stage(session_id, "design", design)

        # Stage 3: Claim Validation
        print(f"\n{'─'*80}")
        print("STAGE 3: Rigorous Claim Validation")
        print(f"{'─'*80}")

        # Extract key claims from design
        claims_prompt = f"""
Based on the application design for {paper_id}:

{design['final_synthesis'].content[:1000]}

Extract the 3-5 most critical claims that must be validated for this to work.
For each claim:
1. State the claim precisely
2. Identify how to test it
3. Design validation experiment
4. Specify success criteria
"""

        claims_debate = self.orchestrator.run_full_debate(
            topic="Critical Claims Extraction",
            context=claims_prompt,
            n_rounds=2
        )

        workshop_results["stages"]["claims_extraction"] = {
            "synthesis": claims_debate["final_synthesis"].content
        }

        # Now examine each claim
        validated_claims = []

        claims_text = claims_debate["final_synthesis"].content
        claim_candidates = self.extract_claims(claims_text)

        for i, claim in enumerate(claim_candidates[:3], 1):  # Top 3 claims
            print(f"\n{'─'*80}")
            print(f"CLAIM {i}/{len(claim_candidates)}: {claim[:100]}...")
            print(f"{'─'*80}")

            examination = self.devils_advocate.examine_claim(
                claim=claim,
                paper_context=f"""
Paper: {paper_id} - {paper_title}
Scenario: {real_world_scenario}
Design: {design['final_synthesis'].content[:500]}...
"""
            )

            validated_claims.append({
                "claim_number": i,
                "claim": claim,
                "examination": examination
            })

            workshop_results["stages"][f"claim_{i}_validation"] = examination

        # Stage 4: Implementation Roadmap
        print(f"\n{'─'*80}")
        print("STAGE 4: Implementation Roadmap")
        print(f"{'─'*80}")

        roadmap_prompt = f"""
We have validated the key claims for applying {paper_id}.

VALIDATED CLAIMS: {len(validated_claims)} claims examined

Create an implementation roadmap:

1. Phase 1: Proof of Concept (what to build first, how to validate quickly)
2. Phase 2: Pilot Deployment (small-scale real-world test)
3. Phase 3: Production Scaling (full deployment)
4. Risk mitigation strategies (what could go wrong, how to address)
5. Resource requirements (team, timeline, infrastructure)
6. Success metrics and go/no-go criteria

Be actionable and specific.
"""

        roadmap = self.orchestrator.run_full_debate(
            topic=f"Implementation Roadmap for {paper_id}",
            context=roadmap_prompt,
            n_rounds=2
        )

        workshop_results["stages"]["roadmap"] = {
            "synthesis": roadmap["final_synthesis"].content
        }

        self.save_stage(session_id, "roadmap", roadmap)

        # Save complete workshop
        self.save_workshop(session_id, workshop_results)

        return workshop_results

    def extract_claims(self, text: str) -> List[str]:
        """Extract claim statements from text."""
        # Simple heuristic - look for claim indicators
        claim_indicators = [
            "Claim:",
            "CLAIM:",
            "- ",
            "• ",
            "1.",
            "2.",
            "3."
        ]

        claims = []
        lines = text.split('\n')

        current_claim = []
        for line in lines:
            line = line.strip()
            if not line:
                if current_claim:
                    claims.append(' '.join(current_claim))
                    current_claim = []
                continue

            if any(indicator in line for indicator in claim_indicators):
                if current_claim:
                    claims.append(' '.join(current_claim))
                current_claim = [line]
            elif current_claim:
                current_claim.append(line)

        if current_claim:
            claims.append(' '.join(current_claim))

        # Filter and clean
        cleaned_claims = []
        for claim in claims:
            # Remove indicators
            for indicator in claim_indicators:
                claim = claim.replace(indicator, "")
            claim = claim.strip()

            if len(claim) > 50 and len(claim) < 500:
                cleaned_claims.append(claim)

        return cleaned_claims[:5]  # Top 5

    def save_stage(self, session_id: str, stage_name: str, debate_result: Dict):
        """Save a workshop stage."""
        filename = self.output_dir / f"{session_id}_{stage_name}.json"
        self.orchestrator.save_debate(debate_result, str(filename))

    def save_workshop(self, session_id: str, results: Dict):
        """Save complete workshop results."""
        filename = self.output_dir / f"{session_id}_workshop_complete.json"

        # Convert to serializable format
        serializable = {
            "paper_id": results["paper_id"],
            "paper_title": results["paper_title"],
            "scenario": results["scenario"],
            "session_id": results["session_id"],
            "timestamp": datetime.now().isoformat(),
            "stages_summary": {
                stage: data.get("synthesis", "")[:500]
                for stage, data in results["stages"].items()
            }
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(serializable, f, indent=2, ensure_ascii=False)

        print(f"\n{'='*80}")
        print(f"WORKSHOP COMPLETE: {session_id}")
        print(f"Results saved to: {filename}")
        print(f"{'='*80}")


class IterativeRefinementLoop:
    """Iterative refinement through multiple critique-improve cycles."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.orchestrator = DebateOrchestrator(api_key)
        self.minimax = DeepInfraAgent("minimax", api_key)
        self.nemotron = DeepInfraAgent("nemotron", api_key)

    def refine_concept(
        self,
        initial_concept: str,
        context: str,
        n_iterations: int = 3
    ) -> Dict:
        """Iteratively refine a concept through critique and improvement."""

        print(f"\n{'='*80}")
        print(f"ITERATIVE REFINEMENT LOOP")
        print(f"Initial Concept: {initial_concept[:100]}...")
        print(f"Iterations: {n_iterations}")
        print(f"{'='*80}")

        current_concept = initial_concept
        refinement_history = []

        for iteration in range(1, n_iterations + 1):
            print(f"\n{'─'*80}")
            print(f"ITERATION {iteration}/{n_iterations}")
            print(f"Current Concept: {current_concept[:200]}...")
            print(f"{'─'*80}")

            # Stage 1: Critique (Devil's Advocate)
            print("\n[1/3] Critiquing current concept...")

            critique_prompt = f"""
You are a merciless critic. Tear apart this concept:

CONCEPT: {current_concept}

CONTEXT: {context}

Provide:
1. Every flaw you can find
2. Assumptions that don't hold
3. Missing components
4. Over-complications
5. Under-specified areas

Be brutal. If this can't work, explain why.
"""

            critique = self.nemotron.think(critique_prompt, context)

            print(f"✓ Critique complete ({len(critique.content)} chars)\n")

            # Stage 2: Creative Improvement
            print("[2/3] Generating improvements...")

            improvement_prompt = f"""
The concept was critiqued:

CONCEPT: {current_concept}

CRITIQUE: {critique.content}

Now improve it:
1. Address each critique point
2. Find novel solutions to identified problems
3. Make it more robust and practical
4. Simplify where possible
5. Fill in missing details

Be creative and ambitious. Make this work beautifully.
"""

            improvement = self.minimax.think(improvement_prompt, critique.content)

            print(f"✓ Improvement complete ({len(improvement.content)} chars)\n")

            # Stage 3: Synthesis
            print("[3/3] Synthesizing refined concept...")

            synthesis_prompt = f"""
We are refining a concept through iterative critique.

CURRENT CONCEPT: {current_concept}

CRITIQUE: {critique.content[:500]}

PROPOSED IMPROVEMENT: {improvement.content[:500]}

Synthesize the refined concept:
1. Keep what works from current concept
2. Incorporate valid improvements
3. Address valid critiques
4. Produce cohesive refined concept
5. Note what changed and why

Output the complete refined concept ready for next iteration.
"""

            synthesis = self.nemotron.think(synthesis_prompt,
                                              f"{critique.content}\n\n{improvement.content}")

            current_concept = synthesis.content
            refinement_history.append({
                "iteration": iteration,
                "concept": current_concept,
                "critique": critique.content,
                "improvement": improvement.content,
                "synthesis": synthesis.content
            })

            print(f"✓ Synthesis complete\n")
            print(f"Refined concept: {current_concept[:200]}...")

        # Final assessment
        print(f"\n{'='*80}")
        print("FINAL ASSESSMENT")
        print(f"{'='*80}\n")

        final_prompt = f"""
We have refined a concept through {n_iterations} iterations.

INITIAL: {initial_concept}

FINAL: {current_concept}

Assess:
1. How much did it improve? (qualitative assessment)
2. Is it now viable? (yes/no/uncertain with reasoning)
3. Remaining weaknesses (if any)
4. Recommended next steps
5. Overall quality score (0-100 with justification)
"""

        final_assessment = self.nemotron.think(final_prompt,
                                                 f"Iterations: {n_iterations}\n" +
                                                 f"Refinements: {[r['iteration'] for r in refinement_history]}")

        print(f"✓ Assessment complete\n")
        print(final_assessment.content)

        return {
            "initial_concept": initial_concept,
            "final_concept": current_concept,
            "n_iterations": n_iterations,
            "refinement_history": refinement_history,
            "final_assessment": final_assessment.content
        }


# =============================================================================
# PREDEFINED WORKFLOWS FOR SPECIFIC PAPERS
# =============================================================================

PREDEFINED_WORKSHOPS = {
    "P19": {
        "title": "Causal Traceability",
        "scenarios": [
            "Financial fraud detection system - trace causal chains of transactions",
            "Medical diagnosis system - identify root causes of symptoms",
            "Software debugging system - trace bug introduction through commits"
        ]
    },
    "P24": {
        "title": "Self-Play Mechanisms",
        "scenarios": [
            "Automated trading system - self-play for strategy optimization",
            "Game AI development - self-play for agent training",
            "Recommendation system - self-play for personalization"
        ]
    },
    "P27": {
        "title": "Emergence Detection",
        "scenarios": [
            "Social media trend detection - identify emerging phenomena",
            "Market analysis - detect emergent market behaviors",
            "Network security - identify emergent attack patterns"
        ]
    }
}


def run_predefined_workshop(paper_id: str, scenario_index: int = 0):
    """Run a predefined workshop for a paper."""
    if paper_id not in PREDEFINED_WORKSHOPS:
        print(f"Paper {paper_id} not in predefined workshops.")
        print(f"Available: {list(PREDEFINED_WORKSHOPS.keys())}")
        return

    workshop_data = PREDEFINED_WORKSHOPS[paper_id]
    scenarios = workshop_data["scenarios"]

    if scenario_index >= len(scenarios):
        print(f"Scenario index {scenario_index} out of range.")
        return

    scenario = scenarios[scenario_index]

    workshop = SuperInstanceWorkshop(DEEPINFRA_API_KEY)

    results = workshop.workshop_paper_application(
        paper_id=paper_id,
        paper_title=workshop_data["title"],
        real_world_scenario=scenario
    )

    return results


if __name__ == "__main__":
    # Example: Run workshop for P19 Causal Traceability
    print("Starting SuperInstance Ideation Workshop...")
    print("This will use DeepInfra API with multiple AI models.\n")

    # Run predefined workshop
    results = run_predefined_workshop("P19", scenario_index=0)

    print("\n" + "="*80)
    print("WORKSHOP COMPLETE")
    print("="*80)
    print(f"\nResults contain:")
    print("- Conceptual understanding")
    print("- Application architecture design")
    print("- Validated claims")
    print("- Implementation roadmap")
    print(f"\nCheck: {Path('research/deepinfra-ideation/sessions')}")

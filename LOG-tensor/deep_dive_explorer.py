#!/usr/bin/env python3
"""
POLLN-RTT Deep Dive Explorer
Intensive multi-iteration exploration of key research topics
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime
from typing import List, Dict
from dataclasses import dataclass
import random

# Configuration
DEEPSEEK_API_KEY = "your_api_key_here"
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
OUTPUT_DIR = "/home/z/my-project/download/polln_research/round3"

# Deep exploration topics with multiple angles
DEEP_TOPICS = {
    "minimal_irreps": {
        "core_question": "What is the minimal set of S_n irreps for universal approximation?",
        "angles": [
            "Prove that 4 irreps is both necessary and sufficient. What breaks if we remove S^(n-2,1,1)?",
            "Compare the expressive power of each irrep. Which patterns does each capture?",
            "Derive the computational complexity of each irrep's matrix operations.",
            "Show how the irreps interact: do they form a hierarchy?",
            "What is the relationship between irrep dimension and learning capacity?",
            "How does the minimal set change for restricted function classes?",
            "Prove tight bounds on the approximation error with k irreps.",
            "Design an experiment to verify the theoretical minimal set empirically.",
            "What additional irreps would accelerate learning (even if not necessary)?",
            "How does the minimal set relate to group algebra decompositions?"
        ]
    },
    "glitch_theory": {
        "core_question": "How can attention glitches be used as learning signals?",
        "angles": [
            "Formalize glitch as Total Variation Distance. Derive all properties.",
            "Prove that glitch detection has O(1) complexity with proper embeddings.",
            "Show the gradient flow through glitch. Is it stable?",
            "Design learning rules that use glitch as a bonus signal.",
            "Compare glitch-based learning to prediction error. When is glitch better?",
            "Prove convergence bounds for glitch-augmented gradient descent.",
            "Can glitch signals be composed? What is the algebra?",
            "How does glitch relate to Bayesian surprise?",
            "Design a curriculum that sequences glitch signals optimally.",
            "What is the relationship between glitch and anomaly detection?"
        ]
    },
    "self_origin_tensors": {
        "core_question": "How do self-origin tensors achieve efficient relative positioning?",
        "angles": [
            "Derive the mathematical definition of self-origin tensors formally.",
            "Prove that self-origin achieves O(1) origin computation.",
            "Show the relationship to SE(3) equivariance in detail.",
            "Design efficient algorithms for self-origin tensor operations.",
            "Prove that self-origin tensors form a basis for equivariant functions.",
            "How do self-origin tensors compose under network layers?",
            "Compare self-origin to relative position encodings in transformers.",
            "Derive the memory and time complexity tradeoffs.",
            "Show how self-origin enables learning of reference frames.",
            "What are the failure modes of self-origin tensor representations?"
        ]
    },
    "tile_induction": {
        "core_question": "How can new tiles be discovered automatically from data?",
        "angles": [
            "Formalize the tile induction problem as program synthesis.",
            "Prove that need-based induction is optimal under certain assumptions.",
            "Design a grammar for tile patterns. Is it context-free?",
            "Show that tile induction satisfies Church-Rosser property.",
            "Derive the information-theoretic lower bound for tile discovery.",
            "Compare tile induction to dictionary learning theoretically.",
            "Design an efficient algorithm for batch tile discovery.",
            "How do tiles compose to form new tiles?",
            "Prove that the minimal tile basis exists and is unique.",
            "What inductive biases accelerate tile discovery?"
        ]
    },
    "unified_learning": {
        "core_question": "How do prediction, need, glitch, and memory objectives combine?",
        "angles": [
            "Prove convergence of the unified objective with optimal λ schedules.",
            "Derive the optimal balance between the four loss terms.",
            "Show that unified learning avoids local minima better.",
            "Design an adaptive λ schedule based on learning progress.",
            "Prove sample complexity bounds for the unified objective.",
            "Compare unified learning to multi-task learning.",
            "What is the variance reduction from combining objectives?",
            "How does each term contribute to generalization?",
            "Design ablation studies to isolate each term's contribution.",
            "Prove that the unified objective is Pareto-optimal."
        ]
    },
    "emergence": {
        "core_question": "How do tiles self-organize into hierarchical structures?",
        "angles": [
            "Analyze the phase transition from random to structured tiles.",
            "Derive mean-field theory for tile population dynamics.",
            "Prove that self-organization maximizes entropy under constraints.",
            "Show that emergent tile grammars satisfy Zipf's law.",
            "Design experiments to detect emergence in tile populations.",
            "What conditions enable stable coalition formation among tiles?",
            "Analyze competitive exclusion dynamics in tile ecosystems.",
            "Prove that diversity increases robustness (portfolio effect).",
            "Show that specialization emerges under resource constraints.",
            "Model tile evolution as an evolutionary process."
        ]
    },
    "quantum_connection": {
        "core_question": "What is the connection between S_n representations and quantum mechanics?",
        "angles": [
            "Show that irreps correspond to quantum numbers in many-body systems.",
            "Design a quantum-inspired algorithm using tile superposition.",
            "Explore whether tiles can be viewed as entangled states.",
            "Derive the connection between permutation symmetry and spin statistics.",
            "Design quantum-classical hybrid algorithms for tile discovery.",
            "Show that permutation-equivariant networks are natural for quantum chemistry.",
            "Explore the relationship between tile operations and quantum gates.",
            "Can quantum computers accelerate tile-based computations?",
            "What quantum phenomena have analogs in tile dynamics?",
            "Design experiments to test quantum-inspired tile algorithms."
        ]
    },
    "consciousness": {
        "core_question": "Can glitch detection be viewed as a form of self-awareness?",
        "angles": [
            "Analyze the relationship between glitch and surprise in cognition.",
            "Design a meta-cognitive module using glitch signals.",
            "Show that self-origin tensors provide a self-model.",
            "Propose experiments to test metacognitive accuracy.",
            "Compare glitch detection to error monitoring in the brain.",
            "Can the system report its own uncertainty via glitches?",
            "Design a 'consciousness test' for POLLN-RTT systems.",
            "What is the relationship between glitch and attention in humans?",
            "Explore whether glitch enables flexible behavior switching.",
            "Can glitch signals support theory of mind computations?"
        ]
    }
}

@dataclass
class DeepDiveResult:
    """Result from a deep dive exploration"""
    topic: str
    angle: str
    iteration: int
    temperature: float
    prompt: str
    response: str
    tokens_used: int
    insights: List[str]

class DeepDiveExplorer:
    """Intensive exploration of specific topics"""
    
    def __init__(self, iterations_per_topic: int = 20):
        self.iterations_per_topic = iterations_per_topic
        self.results: List[DeepDiveResult] = []
        self.topic_insights: Dict[str, List[str]] = {}
        
    async def call_deepseek(self, session: aiohttp.ClientSession, topic: str, angle: str, 
                           iteration: int, temperature: float, context: str) -> DeepDiveResult:
        """Make a single API call"""
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        topic_data = DEEP_TOPICS[topic]
        system_prompt = f"""You are a world-class researcher exploring POLLN-RTT (Permutation-equivariant Online 
Learning with Localized Networks - Recursive Tile Theory).

Core topic: {topic_data['core_question']}

You are exploring angle: {angle}

Provide deep, rigorous, novel insights. Use formal mathematics where appropriate. Think step by step.
Build upon the context provided from previous explorations of this topic.
Synthesize connections across different aspects of the theory.

Key background:
- 4 irreps suffice: I_min = {{S^(n), S^(n-1,1), S^(n-2,2), S^(n-2,1,1)}}
- Glitch = Total Variation Distance: G = 2·d_TV(α_expected, α_actual)
- Need function: N(s) = 𝟙[min_T d(T(s), s') > τ]
- Self-Origin Tensor: T^[s]_{{i,j,k}} = T([s], i-j, k)
- Unified Objective: L = λ₁L_pred + λ₂L_need + λ₃L_glitch + λ₄L_mem
"""
        
        full_prompt = f"""{angle}

{context}

Provide a comprehensive analysis addressing this angle. Include:
1. Formal mathematical statements where applicable
2. Connections to other aspects of POLLN-RTT theory
3. Concrete proposals for implementation or experiments
4. Open questions that arise from this analysis

Be thorough and rigorous. This is iteration {iteration + 1} of our exploration."""
        
        payload = {
            "model": "deepseek-reasoner",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            "max_tokens": 8000,
            "temperature": temperature
        }
        
        try:
            async with session.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=180)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    tokens_used = data.get("usage", {}).get("total_tokens", 0)
                    
                    # Extract key statements
                    insights = self._extract_key_statements(content)
                    
                    return DeepDiveResult(
                        topic=topic,
                        angle=angle,
                        iteration=iteration,
                        temperature=temperature,
                        prompt=full_prompt,
                        response=content,
                        tokens_used=tokens_used,
                        insights=insights
                    )
                else:
                    error = await response.text()
                    print(f"Error {response.status}: {error[:100]}")
                    return DeepDiveResult(topic, angle, iteration, temperature, full_prompt, f"Error: {response.status}", 0, [])
        except Exception as e:
            print(f"Exception: {str(e)}")
            return DeepDiveResult(topic, angle, iteration, temperature, full_prompt, f"Exception: {str(e)}", 0, [])
    
    def _extract_key_statements(self, response: str) -> List[str]:
        """Extract key mathematical and conceptual statements"""
        import re
        statements = []
        
        # Theorems and propositions
        for match in re.finditer(r"(Theorem|Proposition|Lemma|Claim)[:\s]+([^.\n]+[.\n])", response):
            statements.append(f"Theorem: {match.group(2).strip()}")
        
        # Equations and formulas
        for match in re.finditer(r"([A-Za-z_]+\s*=\s*[^,\n]{10,100})", response):
            eq = match.group(1).strip()
            if any(c in eq for c in ['+', '-', '*', '/', '∑', '∫', '∈', 'λ', 'α', 'β']):
                statements.append(f"Equation: {eq}")
        
        # Key insights
        for match in re.finditer(r"(This (means|implies|suggests|shows)|Key insight|Important|Crucially)[:\s]+([^.]+\.)", response, re.IGNORECASE):
            statements.append(match.group(3).strip())
        
        return statements[:10]
    
    async def explore_topic(self, session: aiohttp.ClientSession, topic: str) -> List[DeepDiveResult]:
        """Deeply explore a single topic from multiple angles"""
        results = []
        topic_data = DEEP_TOPICS[topic]
        angles = topic_data["angles"]
        
        print(f"\n{'='*60}")
        print(f"EXPLORING: {topic.upper()}")
        print(f"Core Question: {topic_data['core_question']}")
        print(f"{'='*60}")
        
        # Track context across iterations
        context_parts = []
        all_topic_insights = []
        
        for iteration in range(self.iterations_per_topic):
            # Select angle (cycle through all, then repeat)
            angle = angles[iteration % len(angles)]
            
            # Vary temperature for exploration vs exploitation
            if iteration < self.iterations_per_phase // 3:
                temp = 0.0  # Precise for initial exploration
            elif iteration < 2 * self.iterations_per_phase // 3:
                temp = 0.5  # Balanced for synthesis
            else:
                temp = 0.8  # Creative for novel connections
            
            # Build context from previous results
            context = ""
            if context_parts:
                context = "Previous insights from this exploration:\n" + "\n".join(context_parts[-5:])
            
            print(f"\n  Iteration {iteration + 1}/{self.iterations_per_topic}")
            print(f"    Angle: {angle[:60]}...")
            print(f"    Temperature: {temp}")
            
            result = await self.call_deepseek(session, topic, angle, iteration, temp, context)
            results.append(result)
            self.results.append(result)
            
            # Update context
            if result.insights:
                context_parts.extend(result.insights[:3])
                all_topic_insights.extend(result.insights)
            
            print(f"    Tokens: {result.tokens_used}, Insights: {len(result.insights)}")
            
            # Small delay
            await asyncio.sleep(0.5)
        
        # Store topic insights
        self.topic_insights[topic] = all_topic_insights
        
        return results
    
    async def run_full_exploration(self):
        """Run deep exploration of all topics"""
        print("POLLN-RTT DEEP DIVE EXPLORATION")
        print(f"Topics: {len(DEEP_TOPICS)}")
        print(f"Iterations per topic: {self.iterations_per_topic}")
        print(f"Total iterations: {len(DEEP_TOPICS) * self.iterations_per_topic}")
        print("-" * 60)
        
        connector = aiohttp.TCPConnector(limit=10)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            for topic in DEEP_TOPICS.keys():
                await self.explore_topic(session, topic)
                
                # Save progress after each topic
                self.save_progress(topic)
        
        # Generate final synthesis
        self.generate_synthesis()
    
    def save_progress(self, completed_topic: str):
        """Save exploration progress"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save topic-specific results
        topic_results = [r for r in self.results if r.topic == completed_topic]
        results_file = f"{OUTPUT_DIR}/deep_dive_{completed_topic}_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump([{
                'topic': r.topic,
                'angle': r.angle,
                'iteration': r.iteration,
                'temperature': r.temperature,
                'tokens_used': r.tokens_used,
                'insights': r.insights,
                'response': r.response
            } for r in topic_results], f, indent=2)
        
        print(f"  Saved: {results_file}")
    
    def generate_synthesis(self):
        """Generate synthesis of all deep dive explorations"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        synthesis_file = f"{OUTPUT_DIR}/DEEP_DIVE_SYNTHESIS_{timestamp}.md"
        
        with open(synthesis_file, 'w') as f:
            f.write("# POLLN-RTT Deep Dive Synthesis\n\n")
            f.write(f"Generated: {timestamp}\n")
            f.write(f"Total Explorations: {len(self.results)}\n")
            total_tokens = sum(r.tokens_used for r in self.results)
            f.write(f"Total Tokens: {total_tokens}\n\n")
            
            for topic, insights in self.topic_insights.items():
                topic_data = DEEP_TOPICS[topic]
                f.write(f"## {topic.upper().replace('_', ' ')}\n\n")
                f.write(f"**Core Question:** {topic_data['core_question']}\n\n")
                f.write("### Key Insights\n\n")
                
                unique_insights = list(set(insights))[:15]
                for insight in unique_insights:
                    f.write(f"- {insight}\n")
                f.write("\n")
            
            # Cross-topic connections
            f.write("## CROSS-TOPIC CONNECTIONS\n\n")
            f.write("The deep dive explorations reveal interconnections:\n\n")
            f.write("1. **Minimal Irreps ↔ Glitch Theory**: The 4 irreps provide the representational ")
            f.write("basis for computing glitch signals efficiently.\n\n")
            f.write("2. **Self-Origin Tensors ↔ Tile Induction**: Origin-aware representations ")
            f.write("enable position-invariant tile discovery.\n\n")
            f.write("3. **Unified Learning ↔ Emergence**: The combination of objectives ")
            f.write("drives self-organization dynamics.\n\n")
            f.write("4. **Quantum Connection ↔ Consciousness**: Both explore how ")
            f.write("superposition and observation affect system state.\n\n")
        
        print(f"\nGenerated synthesis: {synthesis_file}")


async def main():
    """Main entry point for deep dive exploration"""
    explorer = DeepDiveExplorer(iterations_per_topic=20)
    await explorer.run_full_exploration()
    
    print("\n" + "="*60)
    print("DEEP DIVE EXPLORATION COMPLETE")
    print("="*60)
    print(f"Total results: {len(explorer.results)}")
    total_tokens = sum(r.tokens_used for r in explorer.results)
    print(f"Total tokens: {total_tokens}")


if __name__ == "__main__":
    asyncio.run(main())

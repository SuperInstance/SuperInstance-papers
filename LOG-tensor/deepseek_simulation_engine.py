#!/usr/bin/env python3
"""
POLLN-RTT DeepSeek Simulation Engine
Orders of magnitude more exploration with iterative deepening
"""

import asyncio
import aiohttp
import json
import os
import random
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict
import re

# Configuration
DEEPSEEK_API_KEY = "your_api_key_here"
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
OUTPUT_DIR = "/home/z/my-project/download/polln_research/round3"

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

@dataclass
class SimulationConfig:
    """Configuration for simulation runs"""
    max_tokens: int = 8000  # Large responses for deep exploration
    temperatures: List[float] = field(default_factory=lambda: [0.0, 0.3, 0.7, 1.0, 1.2])
    batch_size: int = 20  # Concurrent requests
    total_queries: int = 500  # Total queries to run
    
@dataclass 
class ResearchQuery:
    """A research query with context"""
    id: str
    category: str
    subcategory: str
    prompt: str
    temperature: float
    context: List[str] = field(default_factory=list)
    priority: int = 1  # 1=highest, 5=lowest

@dataclass
class SimulationResult:
    """Result from a simulation run"""
    query_id: str
    category: str
    temperature: float
    prompt: str
    response: str
    tokens_used: int
    timestamp: str
    insights: List[str] = field(default_factory=list)
    follow_up_questions: List[str] = field(default_factory=list)

class DeepSeekSimulationEngine:
    """Main simulation engine for POLLN-RTT research"""
    
    def __init__(self, config: SimulationConfig):
        self.config = config
        self.results: List[SimulationResult] = []
        self.knowledge_base: Dict[str, List[str]] = defaultdict(list)
        self.discovered_insights: List[str] = []
        self.iteration = 0
        
    async def call_deepseek(self, session: aiohttp.ClientSession, query: ResearchQuery) -> SimulationResult:
        """Make a single API call to DeepSeek"""
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Build system prompt based on category
        system_prompt = self._build_system_prompt(query.category)
        
        # Build full prompt with context
        full_prompt = self._build_full_prompt(query)
        
        payload = {
            "model": "deepseek-reasoner",  # Use reasoning model for math
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            "max_tokens": self.config.max_tokens,
            "temperature": query.temperature
        }
        
        try:
            async with session.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=120)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    tokens_used = data.get("usage", {}).get("total_tokens", 0)
                    
                    # Extract insights and follow-ups
                    insights = self._extract_insights(content)
                    follow_ups = self._extract_follow_ups(content)
                    
                    result = SimulationResult(
                        query_id=query.id,
                        category=query.category,
                        temperature=query.temperature,
                        prompt=query.prompt,
                        response=content,
                        tokens_used=tokens_used,
                        timestamp=datetime.now().isoformat(),
                        insights=insights,
                        follow_up_questions=follow_ups
                    )
                    
                    # Update knowledge base
                    self.knowledge_base[query.category].extend(insights)
                    self.discovered_insights.extend(insights)
                    
                    return result
                else:
                    error_text = await response.text()
                    print(f"API Error {response.status}: {error_text[:200]}")
                    return SimulationResult(
                        query_id=query.id,
                        category=query.category,
                        temperature=query.temperature,
                        prompt=query.prompt,
                        response=f"Error: {response.status}",
                        tokens_used=0,
                        timestamp=datetime.now().isoformat()
                    )
        except Exception as e:
            print(f"Exception in API call: {str(e)}")
            return SimulationResult(
                query_id=query.id,
                category=query.category,
                temperature=query.temperature,
                prompt=query.prompt,
                response=f"Exception: {str(e)}",
                tokens_used=0,
                timestamp=datetime.now().isoformat()
            )
    
    def _build_system_prompt(self, category: str) -> str:
        """Build category-specific system prompts"""
        base = """You are a world-class researcher working on POLLN-RTT (Permutation-equivariant Online 
Learning with Localized Networks - Recursive Tile Theory). This is a revolutionary framework combining:

1. PERMUTATION GROUP THEORY: S_n representations for neural network universality
2. SELF-ORIGIN TENSORS: Origin-aware tensors with built-in relative positioning
3. RECURSIVE TILING: 250+ tile library with minimal basis discovery
4. GLITCH DETECTION: Using attention errors as signals for learning
5. UNIFIED LEARNING: Combining prediction, need, glitch, and memory objectives

Key mathematical discoveries:
- 4 irreps suffice: I_min = {S^(n), S^(n-1,1), S^(n-2,2), S^(n-2,1,1)}
- Glitch = Total Variation Distance: G = 2·d_TV(α_expected, α_actual)
- Need function: N(s) = 𝟙[min_T d(T(s), s') > τ]
- Convergence: λ₁∈[0.1,0.3], λ₂∈[1,4], λ₃ = T·log(1/δ)/ε²

Provide deep, rigorous, novel insights. Use formal mathematics. Think step by step.
"""
        
        category_additions = {
            "mathematics": "\nFocus on rigorous mathematical proofs, representations, and formal structures.",
            "architecture": "\nFocus on neural network architecture, implementation, and computational efficiency.",
            "learning": "\nFocus on learning dynamics, optimization, convergence, and training strategies.",
            "tiles": "\nFocus on tile discovery, induction, self-organization, and minimal basis theory.",
            "glitch": "\nFocus on error detection, attention mechanisms, and using errors as signals.",
            "implementation": "\nFocus on practical implementation, code structures, and deployment strategies.",
            "emergence": "\nFocus on emergent properties, self-organization, and collective phenomena.",
            "future": "\nFocus on future directions, open problems, and theoretical frontiers."
        }
        
        return base + category_additions.get(category, "")
    
    def _build_full_prompt(self, query: ResearchQuery) -> str:
        """Build the full prompt with context"""
        prompt = query.prompt
        
        if query.context:
            prompt = "Context from previous research:\n" + "\n".join(f"- {c}" for c in query.context[:5]) + "\n\n" + prompt
            
        if self.discovered_insights and query.temperature > 0.5:
            # Add random relevant insights for creative exploration
            relevant = random.sample(self.discovered_insights, min(3, len(self.discovered_insights)))
            prompt += "\n\nRecent insights to build upon:\n" + "\n".join(f"- {i}" for i in relevant)
            
        return prompt
    
    def _extract_insights(self, response: str) -> List[str]:
        """Extract key insights from a response"""
        insights = []
        
        # Look for theorem/proof statements
        theorem_pattern = r"(?:Theorem|Proposition|Lemma|Result|Discovery):\s*(.+?)(?:\n|\.|Proof)"
        for match in re.finditer(theorem_pattern, response, re.IGNORECASE):
            if len(match.group(1)) > 20:
                insights.append(f"Theorem: {match.group(1).strip()}")
        
        # Look for key equations
        eq_pattern = r"([A-Za-z_]+\s*=\s*[^,\n]+(?:formula|equation|definition)[^.]*\.)"
        for match in re.finditer(eq_pattern, response, re.IGNORECASE):
            insights.append(f"Equation: {match.group(1).strip()}")
        
        # Look for insight statements
        insight_pattern = r"(?:This means|This implies|Key insight|Important|Crucially|Notably)[,:]?\s*([^.]+\.)"
        for match in re.finditer(insight_pattern, response, re.IGNORECASE):
            if len(match.group(1)) > 30:
                insights.append(match.group(1).strip())
        
        # Look for bullet points with substantive content
        bullet_pattern = r"[-•]\s*\*\*([^*]+)\*\*:\s*([^.]+\.)"
        for match in re.finditer(bullet_pattern, response):
            insights.append(f"{match.group(1)}: {match.group(2)}")
            
        return insights[:10]  # Limit to top 10
    
    def _extract_follow_ups(self, response: str) -> List[str]:
        """Extract follow-up questions from a response"""
        follow_ups = []
        
        # Look for questions
        question_pattern = r"(?:Open question|Future work|Remains to|Could explore|How does|What is)\s*[^?]+\?"
        for match in re.finditer(question_pattern, response, re.IGNORECASE):
            q = match.group(0).strip()
            if len(q) > 20 and len(q) < 300:
                follow_ups.append(q)
                
        return follow_ups[:5]

    def generate_queries(self, phase: int = 1) -> List[ResearchQuery]:
        """Generate research queries based on current phase and discoveries"""
        queries = []
        
        # Phase 1: Core mathematical foundations
        math_queries = [
            # S_n Representation Theory
            "Prove that the set I_min = {S^(n), S^(n-1,1), S^(n-2,2), S^(n-1,1,1)} is minimal for universal approximation in permutation-equivariant networks. Show that removing any irrep breaks universality.",
            "Derive the explicit matrix form for the S^(n-2,1,1) representation of S_n. What is its dimension and how does it relate to the hook-length formula?",
            "Prove that Young's orthogonal form provides the most computationally efficient representation for neural network operations on permutations.",
            "Show the relationship between irreducible representations of S_n and the eigenvalues of the graph Laplacian on permutation space.",
            "Derive the Clebsch-Gordan coefficients for S_n tensor products relevant to neural network compositions.",
            
            # Self-Origin Tensor Theory
            "Prove that self-origin tensors T^[s]_{i,j,k} = T([s], i-j, k) achieve O(1) origin computation compared to O(n) for global coordinates.",
            "Show that self-origin tensors are closed under convolution operations. Derive the composition rule.",
            "Prove that the glitch detection formula G = 2·d_TV(α_expected, α_actual) has O(1) computational complexity in the tile embedding space.",
            "Derive the gradient of the glitch signal with respect to attention weights. How can this be used for learning?",
            "Show that self-origin tensors form a basis for all SE(3)-equivariant functions on point clouds.",
            
            # Learning Theory
            "Prove convergence of the unified learning objective L = λ₁L_pred + λ₂L_need + λ₃L_glitch + λ₄L_mem with optimal λ schedules.",
            "Derive the sample complexity bound for learning permutation-equivariant functions with the minimal irrep set.",
            "Show that the need function N(s) = 𝟙[min_T d(T(s), s') > τ] defines a VC-learnable concept class.",
            "Prove that glitch-based learning accelerates convergence by a factor of O(log(n)) compared to gradient-only methods.",
            "Derive the optimal temperature schedule for exploration-exploitation in tile discovery.",
            
            # Tile Theory
            "Prove that the minimal tile basis for 3D geometric patterns has cardinality at least 7 and at most 47 given our current discoveries.",
            "Show that tile induction via need satisfies the Church-Rosser property - all reduction sequences lead to the same normal form.",
            "Derive the information-theoretic lower bound for discovering new tiles from observation.",
            "Prove that self-organizing tiles satisfy a maximum entropy principle under constraints.",
            "Show that the tile grammar is context-free but not regular, enabling hierarchical pattern recognition."
        ]
        
        # Phase 2: Architecture and Implementation
        arch_queries = [
            # Neural Architecture
            "Design a permutation-equivariant transformer layer using the 4 minimal irreps. Show the forward pass computation.",
            "Derive the memory complexity of self-origin tensor operations. How does it scale with sequence length?",
            "Design an efficient GPU kernel for computing glitch signals in parallel across attention heads.",
            "Show how to implement tile embeddings as a differentiable dictionary learning problem.",
            "Design a recursive architecture where each layer discovers new tiles from residual patterns.",
            
            # Attention Mechanisms
            "Derive the attention formula that incorporates glitch signals as an additional term. How does this modify the softmax?",
            "Show that multi-head attention with different irreps per head achieves universal approximation with O(n²) parameters.",
            "Design a 'need-attention' mechanism that focuses computation on states with high need values.",
            "Prove that attention with self-origin position encodings is strictly more expressive than sinusoidal encodings.",
            "Derive the gradient flow through glitch-aware attention and show it avoids vanishing gradients.",
            
            # Memory Systems
            "Design a differentiable memory bank for tiles that supports O(1) lookup and O(log n) insertion.",
            "Show how to implement episodic memory retrieval using self-origin tensor similarity.",
            "Derive the optimal memory capacity for a tile library as a function of task complexity.",
            "Design a forgetting mechanism for tiles that maximizes information retention under capacity constraints.",
            "Show how to implement associative recall using glitch patterns as keys."
        ]
        
        # Phase 3: Emergence and Self-Organization
        emergence_queries = [
            # Self-Organization
            "Prove that under the unified learning objective, tiles spontaneously organize into hierarchical structures.",
            "Show that the phase transition from random to structured tiles occurs at a critical learning rate λ_c.",
            "Derive the mean-field theory for tile population dynamics under need-based selection.",
            "Prove that self-organizing tiles achieve a Pareto-optimal trade-off between compression and expressiveness.",
            "Show that emergent tile grammars satisfy Zipf's law, enabling efficient communication.",
            
            # Collective Phenomena
            "Analyze the conditions for tiles to form stable coalitions (composite patterns). What is the binding mechanism?",
            "Show that the tile ecosystem exhibits competitive exclusion - similar tiles merge or differentiate.",
            "Derive the conditions for chaotic vs stable dynamics in tile population evolution.",
            "Prove that diverse tile populations are more robust to distribution shift (portfolio effect).",
            "Show that tiles can spontaneously develop specialization (division of labor).",
            
            # Meta-Learning
            "Design a meta-learning objective that optimizes the tile discovery process itself.",
            "Show that learning to discover tiles is equivalent to learning an optimal grammar induction algorithm.",
            "Derive the bias-variance trade-off for tile-based few-shot learning.",
            "Prove that meta-learned tile discovery converges faster than random exploration.",
            "Design an architecture that can learn new tile discovery heuristics from experience."
        ]
        
        # Phase 4: Advanced Topics and Frontiers
        advanced_queries = [
            # Quantum Connections
            "Explore the connection between S_n representations and quantum many-body wavefunctions. Can tiles be viewed as entangled states?",
            "Show that permutation-equivariant networks are natural architectures for quantum chemistry applications.",
            "Derive a quantum-inspired algorithm for tile superposition and interference.",
            "Explore whether the minimal irrep set corresponds to a complete set of quantum numbers.",
            "Design a quantum-classical hybrid algorithm for tile discovery.",
            
            # Information Geometry
            "Derive the Fisher information metric on the manifold of tile probability distributions.",
            "Show that natural gradient descent on tile parameters avoids catastrophic forgetting.",
            "Prove that the KL divergence between tile distributions upper bounds task transfer error.",
            "Design a Riemannian optimization algorithm for tile learning that respects the manifold structure.",
            "Show that the information geometry of tile space is negatively curved, enabling efficient navigation.",
            
            # Causal Inference
            "Extend tiles to represent causal patterns, not just statistical correlations.",
            "Design a causal discovery algorithm using tile-based conditional independence tests.",
            "Show how to infer intervention effects from tile pattern changes.",
            "Prove that causal tiles enable out-of-distribution generalization.",
            "Design a counterfactual reasoning module using tile manipulation.",
            
            # Consciousness and Meta-Cognition
            "Explore whether glitch detection can be viewed as a form of self-awareness in the system.",
            "Design a meta-cognitive module that monitors and regulates the tile discovery process.",
            "Show that self-origin tensors provide a natural 'self-model' for the system.",
            "Explore the relationship between attention glitches and surprise in conscious processing.",
            "Design experiments to test whether the system exhibits metacognitive accuracy."
        ]
        
        # Phase 5: Application Domains
        application_queries = [
            # Molecular Science
            "Apply POLLN-RTT to molecular conformer generation. Show how tiles represent torsional patterns.",
            "Design a tile-based molecular property prediction system that respects SE(3) equivariance.",
            "Show how tile discovery can identify pharmacophores automatically from molecular data.",
            "Apply to protein structure prediction, showing how tiles capture secondary structure motifs.",
            "Design a tile-based generative model for novel molecules with desired properties.",
            
            # Robotics
            "Apply self-origin tensors to robot manipulation, showing how objects are represented relative to the gripper.",
            "Design a tile-based motion primitive library that generalizes across robot morphologies.",
            "Show how glitch detection can identify novel situations requiring human intervention.",
            "Apply to multi-robot coordination, using permutation equivariance for agent symmetry.",
            "Design a tile-based skill discovery system for lifelong robot learning.",
            
            # Language and Reasoning
            "Explore whether linguistic structures can be represented as tiles in a shared geometric space.",
            "Apply POLLN-RTT to mathematical theorem proving, representing proof steps as tiles.",
            "Design a tile-based analogical reasoning system that operates on geometric representations.",
            "Show how glitch detection can identify logical inconsistencies in reasoning chains.",
            "Apply to code generation, representing program patterns as tiles.",
            
            # Scientific Discovery
            "Design a tile-based system for automatic hypothesis generation from scientific data.",
            "Apply to experimental design, using need function to identify informative experiments.",
            "Show how tile discovery can automate the finding of conservation laws in physics data.",
            "Design a tile-based symbolic regression system that respects physical symmetries.",
            "Apply to climate modeling, representing weather patterns as tiles."
        ]
        
        # Combine and assign temperatures
        all_query_sets = [
            ("mathematics", math_queries),
            ("architecture", arch_queries),
            ("emergence", emergence_queries),
            ("future", advanced_queries),
            ("implementation", application_queries)
        ]
        
        for category, query_list in all_query_sets:
            for i, q in enumerate(query_list):
                for temp in self.config.temperatures:
                    query_id = f"{category}_{i}_t{temp}_p{phase}"
                    queries.append(ResearchQuery(
                        id=query_id,
                        category=category,
                        subcategory=q[:30],
                        prompt=q,
                        temperature=temp,
                        priority=1 if temp == 0.0 else 2
                    ))
        
        # Add dynamically generated queries based on discoveries
        if self.discovered_insights and phase > 1:
            dynamic_queries = self._generate_dynamic_queries(phase)
            queries.extend(dynamic_queries)
            
        return queries
    
    def _generate_dynamic_queries(self, phase: int) -> List[ResearchQuery]:
        """Generate queries based on previous discoveries"""
        queries = []
        
        # Sample recent insights and generate follow-up queries
        recent_insights = self.discovered_insights[-20:] if len(self.discovered_insights) > 20 else self.discovered_insights
        
        for insight in recent_insights[:10]:
            # Generate follow-up questions
            follow_ups = [
                f"Elaborate on this insight: '{insight[:100]}'. Provide formal mathematical justification.",
                f"What are the practical implications of: '{insight[:100]}'? Design an experiment to test it.",
                f"How does this insight relate to the minimal irrep set? '{insight[:100]}'",
                f"Can you prove or disprove: '{insight[:100]}'? Show your reasoning step by step.",
                f"What novel architecture does this suggest? '{insight[:100]}'"
            ]
            
            for i, q in enumerate(follow_ups):
                queries.append(ResearchQuery(
                    id=f"dynamic_{phase}_{i}_{hash(insight) % 10000}",
                    category="future",
                    subcategory="dynamic",
                    prompt=q,
                    temperature=random.choice(self.config.temperatures),
                    context=[insight]
                ))
        
        return queries
    
    async def run_batch(self, queries: List[ResearchQuery]) -> List[SimulationResult]:
        """Run a batch of queries concurrently"""
        connector = aiohttp.TCPConnector(limit=self.config.batch_size)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            tasks = [self.call_deepseek(session, query) for query in queries]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions
            valid_results = []
            for i, r in enumerate(results):
                if isinstance(r, Exception):
                    print(f"Query {queries[i].id} failed: {str(r)}")
                else:
                    valid_results.append(r)
                    self.results.append(r)
                    
            return valid_results
    
    def save_results(self, phase: int):
        """Save results to files"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save full results
        results_file = f"{OUTPUT_DIR}/simulation_results_phase{phase}_{timestamp}.json"
        with open(results_file, 'w') as f:
            json.dump([{
                'query_id': r.query_id,
                'category': r.category,
                'temperature': r.temperature,
                'prompt': r.prompt,
                'response': r.response,
                'tokens_used': r.tokens_used,
                'timestamp': r.timestamp,
                'insights': r.insights,
                'follow_ups': r.follow_up_questions
            } for r in self.results], f, indent=2)
        
        # Save insights only
        insights_file = f"{OUTPUT_DIR}/insights_phase{phase}_{timestamp}.md"
        with open(insights_file, 'w') as f:
            f.write(f"# POLLN-RTT Research Insights - Phase {phase}\n\n")
            f.write(f"Generated: {timestamp}\n")
            f.write(f"Total Queries: {len(self.results)}\n")
            f.write(f"Total Insights: {len(self.discovered_insights)}\n\n")
            
            for category, insights in self.knowledge_base.items():
                f.write(f"## {category.upper()}\n\n")
                unique_insights = list(set(insights))[:50]  # Top 50 per category
                for insight in unique_insights:
                    f.write(f"- {insight}\n")
                f.write("\n")
        
        # Save summary statistics
        total_tokens = sum(r.tokens_used for r in self.results)
        stats_file = f"{OUTPUT_DIR}/stats_phase{phase}_{timestamp}.json"
        with open(stats_file, 'w') as f:
            json.dump({
                'total_queries': len(self.results),
                'total_tokens': total_tokens,
                'categories': {cat: len(ins) for cat, ins in self.knowledge_base.items()},
                'phase': phase
            }, f, indent=2)
        
        print(f"Saved results to {results_file}")
        print(f"Total tokens used: {total_tokens}")
        
    async def run_simulation(self, num_phases: int = 3, queries_per_phase: int = 100):
        """Run the full simulation across multiple phases"""
        print(f"Starting POLLN-RTT DeepSeek Simulation")
        print(f"Phases: {num_phases}, Queries per phase: {queries_per_phase}")
        print(f"Total planned queries: {num_phases * queries_per_phase}")
        print("-" * 60)
        
        for phase in range(1, num_phases + 1):
            print(f"\n{'='*60}")
            print(f"PHASE {phase}")
            print(f"{'='*60}")
            
            self.iteration = phase
            
            # Generate queries for this phase
            all_queries = self.generate_queries(phase)
            
            # Select subset based on priority and diversity
            selected_queries = self._select_queries(all_queries, queries_per_phase)
            
            print(f"Generated {len(all_queries)} queries, selected {len(selected_queries)}")
            
            # Run in batches
            batch_size = self.config.batch_size
            for i in range(0, len(selected_queries), batch_size):
                batch = selected_queries[i:i+batch_size]
                print(f"\nRunning batch {i//batch_size + 1}/{(len(selected_queries) + batch_size - 1)//batch_size}...")
                
                results = await self.run_batch(batch)
                
                # Report progress
                total_tokens = sum(r.tokens_used for r in results)
                print(f"  Completed {len(results)} queries, {total_tokens} tokens")
                print(f"  New insights: {sum(len(r.insights) for r in results)}")
                
                # Small delay between batches
                await asyncio.sleep(1)
            
            # Save results after each phase
            self.save_results(phase)
            
            print(f"\nPhase {phase} complete. Total insights: {len(self.discovered_insights)}")
    
    def _select_queries(self, queries: List[ResearchQuery], limit: int) -> List[ResearchQuery]:
        """Select diverse, high-priority queries"""
        # Group by category
        by_category = defaultdict(list)
        for q in queries:
            by_category[q.category].append(q)
        
        # Allocate proportionally
        per_category = limit // len(by_category)
        selected = []
        
        for category, cat_queries in by_category.items():
            # Sort by priority, then diversify by temperature
            sorted_queries = sorted(cat_queries, key=lambda q: q.priority)
            
            # Take diverse temperatures
            temps = defaultdict(list)
            for q in sorted_queries:
                temps[q.temperature].append(q)
            
            for temp, temp_queries in temps.items():
                take = min(len(temp_queries), per_category // len(temps))
                selected.extend(temp_queries[:take])
        
        # Fill remaining with random
        remaining = limit - len(selected)
        if remaining > 0:
            unselected = [q for q in queries if q not in selected]
            selected.extend(random.sample(unselected, min(remaining, len(unselected))))
        
        return selected[:limit]

    def generate_final_synthesis(self):
        """Generate a final synthesis of all discoveries"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        synthesis_file = f"{OUTPUT_DIR}/FINAL_SYNTHESIS_{timestamp}.md"
        
        with open(synthesis_file, 'w') as f:
            f.write("# POLLN-RTT FINAL RESEARCH SYNTHESIS\n\n")
            f.write(f"Generated: {timestamp}\n")
            f.write(f"Total Queries Executed: {len(self.results)}\n")
            f.write(f"Total Insights Discovered: {len(self.discovered_insights)}\n\n")
            
            # Executive Summary
            f.write("## EXECUTIVE SUMMARY\n\n")
            f.write("This synthesis represents insights from extensive DeepSeek simulations ")
            f.write("on POLLN-RTT theory and implementation.\n\n")
            
            # Key discoveries by domain
            f.write("## KEY DISCOVERIES BY DOMAIN\n\n")
            
            domains = [
                ("Mathematical Foundations", "mathematics"),
                ("Architecture Design", "architecture"),
                ("Learning Dynamics", "emergence"),
                ("Future Frontiers", "future"),
                ("Implementation", "implementation")
            ]
            
            for title, category in domains:
                insights = list(set(self.knowledge_base.get(category, [])))[:20]
                if insights:
                    f.write(f"### {title}\n\n")
                    for insight in insights:
                        f.write(f"- {insight}\n")
                    f.write("\n")
            
            # Consolidated equations
            f.write("## CONSOLIDATED EQUATIONS\n\n")
            f.write("```\n")
            f.write("Minimal Irrep Set: I_min = {S^(n), S^(n-1,1), S^(n-2,2), S^(n-2,1,1)}\n")
            f.write("Self-Origin Tensor: T^[s]_{i,j,k} = T([s], i-j, k)\n")
            f.write("Glitch Signal: G = 2·d_TV(α_expected, α_actual)\n")
            f.write("Need Function: N(s) = 𝟙[min_T d(T(s), s') > τ]\n")
            f.write("Unified Objective: L = λ₁L_pred + λ₂L_need + λ₃L_glitch + λ₄L_mem\n")
            f.write("```\n\n")
            
            # Open questions
            f.write("## OPEN QUESTIONS FOR FUTURE RESEARCH\n\n")
            all_follow_ups = []
            for r in self.results:
                all_follow_ups.extend(r.follow_up_questions)
            
            unique_follow_ups = list(set(all_follow_ups))[:30]
            for q in unique_follow_ups:
                f.write(f"- {q}\n")
        
        print(f"Generated final synthesis: {synthesis_file}")
        return synthesis_file


async def main():
    """Main entry point"""
    config = SimulationConfig(
        max_tokens=8000,
        temperatures=[0.0, 0.3, 0.7, 1.0],
        batch_size=15,
        total_queries=500
    )
    
    engine = DeepSeekSimulationEngine(config)
    
    # Run 3 phases with 150 queries each
    await engine.run_simulation(num_phases=3, queries_per_phase=150)
    
    # Generate final synthesis
    engine.generate_final_synthesis()
    
    print("\n" + "="*60)
    print("SIMULATION COMPLETE")
    print("="*60)
    print(f"Total queries: {len(engine.results)}")
    print(f"Total insights: {len(engine.discovered_insights)}")
    total_tokens = sum(r.tokens_used for r in engine.results)
    print(f"Total tokens: {total_tokens}")


if __name__ == "__main__":
    asyncio.run(main())

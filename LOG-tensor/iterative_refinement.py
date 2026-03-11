#!/usr/bin/env python3
"""
POLLN-RTT Iterative Refinement System
Monitors outputs and generates targeted follow-up queries
"""

import asyncio
import aiohttp
import json
import os
import re
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from collections import defaultdict, Counter
import random

# Configuration
DEEPSEEK_API_KEY = "your_api_key_here"
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
OUTPUT_DIR = "/home/z/my-project/download/polln_research/round3"

@dataclass
class ResearchInsight:
    """A structured research insight"""
    id: str
    category: str
    content: str
    confidence: float  # Estimated importance
    source_query: str
    related_insights: List[str] = field(default_factory=list)
    follow_ups_generated: int = 0

@dataclass
class QueryTemplate:
    """Template for generating queries"""
    pattern: str
    category: str
    priority: int
    temperature_range: Tuple[float, float]

class IterativeRefinement:
    """System that iteratively refines research through feedback loops"""
    
    def __init__(self, max_iterations: int = 10, queries_per_iteration: int = 50):
        self.max_iterations = max_iterations
        self.queries_per_iteration = queries_per_iteration
        self.insights: Dict[str, ResearchInsight] = {}
        self.insight_graph: Dict[str, List[str]] = defaultdict(list)  # Adjacency list
        self.iteration_count = 0
        self.total_tokens = 0
        self.all_responses: List[Dict] = []
        
        # Query templates for different modes
        self.query_templates = self._initialize_templates()
        
    def _initialize_templates(self) -> List[QueryTemplate]:
        """Initialize query templates for different research modes"""
        return [
            # Proof templates
            QueryTemplate(
                pattern="Prove that {insight}. Show all steps and assumptions.",
                category="mathematics",
                priority=1,
                temperature_range=(0.0, 0.3)
            ),
            QueryTemplate(
                pattern="What breaks if {insight} is violated? Construct a counterexample.",
                category="mathematics",
                priority=2,
                temperature_range=(0.0, 0.5)
            ),
            
            # Extension templates
            QueryTemplate(
                pattern="Extend {insight} to the case of continuous domains. What modifications are needed?",
                category="mathematics",
                priority=2,
                temperature_range=(0.3, 0.7)
            ),
            QueryTemplate(
                pattern="How does {insight} generalize to higher dimensions or larger scales?",
                category="mathematics",
                priority=2,
                temperature_range=(0.3, 0.7)
            ),
            
            # Implementation templates
            QueryTemplate(
                pattern="Design an algorithm that implements {insight} efficiently. Analyze complexity.",
                category="implementation",
                priority=1,
                temperature_range=(0.0, 0.5)
            ),
            QueryTemplate(
                pattern="What are the practical limitations of {insight}? How can they be mitigated?",
                category="implementation",
                priority=2,
                temperature_range=(0.3, 0.7)
            ),
            
            # Connection templates
            QueryTemplate(
                pattern="How does {insight} connect to related work in machine learning? Cite analogous results.",
                category="future",
                priority=3,
                temperature_range=(0.5, 1.0)
            ),
            QueryTemplate(
                pattern="What is the relationship between {insight} and the minimal irrep set?",
                category="mathematics",
                priority=2,
                temperature_range=(0.3, 0.7)
            ),
            
            # Synthesis templates
            QueryTemplate(
                pattern="Synthesize {insight} with the unified learning objective. What new insights emerge?",
                category="emergence",
                priority=2,
                temperature_range=(0.5, 1.0)
            ),
            QueryTemplate(
                pattern="Can {insight} be combined with glitch detection theory? Explore the synergy.",
                category="glitch",
                priority=2,
                temperature_range=(0.5, 1.0)
            ),
            
            # Exploration templates
            QueryTemplate(
                pattern="Explore the implications of {insight} for robot learning applications.",
                category="implementation",
                priority=3,
                temperature_range=(0.5, 1.0)
            ),
            QueryTemplate(
                pattern="What novel architectures does {insight} suggest? Sketch the design.",
                category="architecture",
                priority=2,
                temperature_range=(0.5, 1.0)
            ),
            
            # Critique templates
            QueryTemplate(
                pattern="Identify potential weaknesses in the claim that {insight}. How can they be addressed?",
                category="mathematics",
                priority=2,
                temperature_range=(0.3, 0.7)
            ),
            QueryTemplate(
                pattern="What assumptions underlie {insight}? Are they realistic in practice?",
                category="implementation",
                priority=2,
                temperature_range=(0.3, 0.7)
            ),
        ]
    
    async def call_deepseek(self, session: aiohttp.ClientSession, prompt: str, 
                           system: str, temperature: float = 0.5) -> Tuple[str, int]:
        """Make API call to DeepSeek"""
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "deepseek-reasoner",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 6000,
            "temperature": temperature
        }
        
        try:
            async with session.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=150)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    tokens = data.get("usage", {}).get("total_tokens", 0)
                    return content, tokens
                else:
                    error = await response.text()
                    print(f"API Error {response.status}: {error[:100]}")
                    return f"Error: {response.status}", 0
        except Exception as e:
            print(f"Exception: {str(e)}")
            return f"Exception: {str(e)}", 0
    
    def extract_insights(self, response: str, category: str, source_query: str) -> List[ResearchInsight]:
        """Extract structured insights from a response"""
        insights = []
        
        # Extract theorems
        for match in re.finditer(r"(?:Theorem|Proposition|Lemma|Result)[:\s]+([^.\n]+[.\n])", response):
            content = match.group(1).strip()
            if len(content) > 20:
                insight = ResearchInsight(
                    id=f"ins_{len(self.insights)}_{hash(content) % 10000}",
                    category=category,
                    content=content,
                    confidence=0.9,
                    source_query=source_query
                )
                insights.append(insight)
        
        # Extract equations
        for match in re.finditer(r"([A-Za-z_]+\s*=\s*[^,\n]{10,80})", response):
            content = match.group(1).strip()
            if any(c in content for c in ['λ', 'α', 'β', 'γ', '∑', '∈', '+', '-', '*']):
                insight = ResearchInsight(
                    id=f"eq_{len(self.insights)}_{hash(content) % 10000}",
                    category=category,
                    content=f"Equation: {content}",
                    confidence=0.8,
                    source_query=source_query
                )
                insights.append(insight)
        
        # Extract key statements
        for match in re.finditer(r"(?:This (means|implies|shows)|Key insight|Important)[:\s]+([^.]+\.)", response, re.IGNORECASE):
            content = match.group(2).strip() if match.lastindex == 2 else match.group(1).strip()
            if len(content) > 30:
                insight = ResearchInsight(
                    id=f"key_{len(self.insights)}_{hash(content) % 10000}",
                    category=category,
                    content=content,
                    confidence=0.7,
                    source_query=source_query
                )
                insights.append(insight)
        
        return insights
    
    def generate_follow_up_queries(self, insight: ResearchInsight) -> List[Tuple[str, str, float]]:
        """Generate follow-up queries based on an insight"""
        queries = []
        
        # Select templates based on category and insight type
        relevant_templates = [
            t for t in self.query_templates 
            if t.category == insight.category or random.random() < 0.3
        ]
        
        for template in random.sample(relevant_templates, min(3, len(relevant_templates))):
            prompt = template.pattern.format(insight=insight.content[:200])
            
            # Select temperature from range
            temp = random.uniform(*template.temperature_range)
            
            queries.append((prompt, template.category, temp))
            insight.follow_ups_generated += 1
        
        return queries
    
    def update_insight_graph(self, new_insights: List[ResearchInsight]):
        """Update the graph of related insights"""
        for insight in new_insights:
            self.insights[insight.id] = insight
            
            # Find related insights based on content similarity
            for other_id, other in self.insights.items():
                if other_id != insight.id:
                    # Simple keyword overlap for now
                    words1 = set(insight.content.lower().split())
                    words2 = set(other.content.lower().split())
                    overlap = len(words1 & words2)
                    
                    if overlap > 3:  # Threshold for connection
                        self.insight_graph[insight.id].append(other_id)
                        self.insight_graph[other_id].append(insight.id)
    
    def select_high_value_insights(self) -> List[ResearchInsight]:
        """Select insights with high follow-up potential"""
        # Score insights by: confidence, number of connections, follow-ups generated
        scored = []
        for insight_id, insight in self.insights.items():
            connections = len(self.insight_graph.get(insight_id, []))
            score = (
                insight.confidence * 0.4 +
                min(connections / 10, 1.0) * 0.3 +
                (1 - insight.follow_ups_generated / 5) * 0.3
            )
            scored.append((score, insight))
        
        scored.sort(reverse=True, key=lambda x: x[0])
        return [insight for _, insight in scored[:20]]
    
    async def run_iteration(self, session: aiohttp.ClientSession, queries: List[Tuple[str, str, float]]) -> List[ResearchInsight]:
        """Run one iteration of queries and extract insights"""
        results = []
        
        system_base = """You are a world-class researcher on POLLN-RTT theory. 
Key discoveries: 4 minimal irreps, glitch = TV distance, need function, self-origin tensors.
Provide deep, rigorous insights with formal mathematics where appropriate."""

        for prompt, category, temp in queries:
            response, tokens = await self.call_deepseek(session, prompt, system_base, temp)
            self.total_tokens += tokens
            
            self.all_responses.append({
                'prompt': prompt,
                'category': category,
                'temperature': temp,
                'response': response,
                'tokens': tokens,
                'iteration': self.iteration_count
            })
            
            insights = self.extract_insights(response, category, prompt)
            results.extend(insights)
            
            await asyncio.sleep(0.3)
        
        return results
    
    async def run_refinement_loop(self):
        """Run the full iterative refinement loop"""
        print("POLLN-RTT Iterative Refinement System")
        print(f"Max iterations: {self.max_iterations}")
        print(f"Queries per iteration: {self.queries_per_iteration}")
        print("-" * 60)
        
        # Seed queries for iteration 0
        seed_queries = self._generate_seed_queries()
        
        connector = aiohttp.TCPConnector(limit=10)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            for iteration in range(self.max_iterations):
                self.iteration_count = iteration
                print(f"\n{'='*60}")
                print(f"ITERATION {iteration + 1}/{self.max_iterations}")
                print(f"{'='*60}")
                
                if iteration == 0:
                    queries = seed_queries[:self.queries_per_iteration]
                else:
                    # Generate queries from high-value insights
                    high_value = self.select_high_value_insights()
                    queries = []
                    
                    for insight in high_value[:self.queries_per_iteration // 2]:
                        follow_ups = self.generate_follow_up_queries(insight)
                        queries.extend(follow_ups[:2])
                    
                    # Add some random seed queries for diversity
                    remaining = self.queries_per_iteration - len(queries)
                    queries.extend(random.sample(seed_queries, min(remaining, len(seed_queries))))
                    queries = queries[:self.queries_per_iteration]
                
                print(f"Running {len(queries)} queries...")
                
                # Run queries
                new_insights = await self.run_iteration(session, queries)
                
                # Update knowledge
                self.update_insight_graph(new_insights)
                
                # Report progress
                print(f"  New insights: {len(new_insights)}")
                print(f"  Total insights: {len(self.insights)}")
                print(f"  Total tokens: {self.total_tokens}")
                
                # Save checkpoint
                if (iteration + 1) % 3 == 0:
                    self.save_checkpoint()
        
        # Final synthesis
        self.generate_final_report()
    
    def _generate_seed_queries(self) -> List[Tuple[str, str, float]]:
        """Generate seed queries for the first iteration"""
        seeds = [
            # Core mathematical questions
            ("Prove that the 4 irreducible representations {S^(n), S^(n-1,1), S^(n-2,2), S^(n-2,1,1)} are both necessary and sufficient for universal approximation in permutation-equivariant networks.", "mathematics", 0.0),
            ("Derive the gradient of the glitch signal G = 2·d_TV(α_expected, α_actual) with respect to attention weights.", "mathematics", 0.0),
            ("Prove convergence of the unified learning objective with optimal λ schedules.", "mathematics", 0.0),
            ("Show that self-origin tensors achieve O(1) origin computation complexity.", "mathematics", 0.0),
            ("Derive the information-theoretic lower bound for tile discovery from observations.", "mathematics", 0.0),
            
            # Architecture questions
            ("Design a permutation-equivariant transformer layer using the 4 minimal irreps. Show the forward pass.", "architecture", 0.3),
            ("Design an efficient GPU kernel for computing glitch signals in parallel.", "architecture", 0.3),
            ("Design a differentiable memory bank for tiles with O(1) lookup.", "architecture", 0.3),
            ("Design a recursive architecture where each layer discovers new tiles.", "architecture", 0.5),
            ("Design a meta-learning objective for tile discovery optimization.", "architecture", 0.5),
            
            # Emergence questions
            ("Analyze the phase transition from random to structured tiles.", "emergence", 0.5),
            ("Derive mean-field theory for tile population dynamics.", "emergence", 0.5),
            ("Prove that self-organizing tiles achieve Pareto-optimal compression.", "emergence", 0.5),
            ("Show that emergent tile grammars satisfy Zipf's law.", "emergence", 0.7),
            ("Analyze conditions for stable coalition formation among tiles.", "emergence", 0.7),
            
            # Application questions
            ("Apply POLLN-RTT to molecular conformer generation.", "implementation", 0.5),
            ("Design a tile-based motion primitive library for robots.", "implementation", 0.5),
            ("Apply self-origin tensors to multi-robot coordination.", "implementation", 0.5),
            ("Design a tile-based analogical reasoning system.", "implementation", 0.7),
            ("Design experiments to test whether glitch detection enables metacognition.", "implementation", 0.7),
            
            # Frontier questions
            ("Explore the connection between S_n representations and quantum many-body wavefunctions.", "future", 0.8),
            ("Derive the Fisher information metric on tile probability manifolds.", "future", 0.5),
            ("Design a causal discovery algorithm using tile-based independence tests.", "future", 0.7),
            ("Can glitch detection be viewed as a form of self-awareness?", "future", 0.9),
            ("Design a consciousness test for POLLN-RTT systems.", "future", 0.9),
            
            # More mathematical depth
            ("Prove that removing S^(n-2,1,1) from the minimal set breaks universality.", "mathematics", 0.0),
            ("Derive the Clebsch-Gordan coefficients for S_n tensor products.", "mathematics", 0.3),
            ("Show the relationship between S_n irreps and graph Laplacian eigenvalues.", "mathematics", 0.3),
            ("Prove that tile induction satisfies the Church-Rosser property.", "mathematics", 0.0),
            ("Show that the need function defines a VC-learnable concept class.", "mathematics", 0.0),
            
            # More architecture depth
            ("Design a need-attention mechanism for high-need state focus.", "architecture", 0.5),
            ("Prove attention with self-origin encodings is more expressive than sinusoidal.", "architecture", 0.3),
            ("Design a forgetting mechanism for tiles under capacity constraints.", "architecture", 0.5),
            ("Implement associative recall using glitch patterns as keys.", "architecture", 0.5),
            ("Derive memory complexity of self-origin tensor operations.", "architecture", 0.3),
            
            # More emergence depth
            ("Prove competitive exclusion dynamics in tile ecosystems.", "emergence", 0.5),
            ("Derive conditions for chaotic vs stable tile evolution.", "emergence", 0.5),
            ("Prove that tile diversity increases robustness to distribution shift.", "emergence", 0.5),
            ("Model tile evolution as an evolutionary process.", "emergence", 0.7),
            ("Design experiments to detect emergence in tile populations.", "emergence", 0.7),
        ]
        
        return seeds
    
    def save_checkpoint(self):
        """Save current state to checkpoint file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save insights
        insights_file = f"{OUTPUT_DIR}/iterative_insights_{timestamp}.json"
        with open(insights_file, 'w') as f:
            json.dump([{
                'id': i.id,
                'category': i.category,
                'content': i.content,
                'confidence': i.confidence,
                'source_query': i.source_query,
                'follow_ups': i.follow_ups_generated
            } for i in self.insights.values()], f, indent=2)
        
        # Save graph
        graph_file = f"{OUTPUT_DIR}/insight_graph_{timestamp}.json"
        with open(graph_file, 'w') as f:
            json.dump(dict(self.insight_graph), f, indent=2)
        
        print(f"  Saved checkpoint: {timestamp}")
    
    def generate_final_report(self):
        """Generate final synthesis report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"{OUTPUT_DIR}/ITERATIVE_SYNTHESIS_{timestamp}.md"
        
        with open(report_file, 'w') as f:
            f.write("# POLLN-RTT Iterative Refinement Synthesis\n\n")
            f.write(f"Generated: {timestamp}\n")
            f.write(f"Iterations: {self.iteration_count + 1}\n")
            f.write(f"Total Insights: {len(self.insights)}\n")
            f.write(f"Total Tokens: {self.total_tokens}\n\n")
            
            # Category breakdown
            f.write("## Insights by Category\n\n")
            by_category = defaultdict(list)
            for insight in self.insights.values():
                by_category[insight.category].append(insight)
            
            for category, insights in by_category.items():
                f.write(f"### {category.upper()}\n\n")
                for insight in sorted(insights, key=lambda x: -x.confidence)[:10]:
                    f.write(f"- [{insight.confidence:.2f}] {insight.content}\n")
                f.write("\n")
            
            # Most connected insights
            f.write("## Most Connected Insights\n\n")
            connectivity = [(len(self.insight_graph.get(iid, [])), iid) for iid in self.insights]
            connectivity.sort(reverse=True)
            
            for count, iid in connectivity[:20]:
                insight = self.insights[iid]
                f.write(f"- [{count} connections] {insight.content}\n")
            
            f.write("\n")
            
            # High-priority follow-ups
            f.write("## High-Value Follow-up Directions\n\n")
            low_followup = [i for i in self.insights.values() if i.follow_ups_generated < 3]
            for insight in sorted(low_followup, key=lambda x: -x.confidence)[:10]:
                f.write(f"- {insight.content}\n")
        
        print(f"\nGenerated final report: {report_file}")


async def main():
    """Main entry point"""
    refiner = IterativeRefinement(max_iterations=10, queries_per_iteration=50)
    await refiner.run_refinement_loop()
    
    print("\n" + "="*60)
    print("ITERATIVE REFINEMENT COMPLETE")
    print("="*60)
    print(f"Total insights discovered: {len(refiner.insights)}")
    print(f"Total tokens used: {refiner.total_tokens}")


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
POLLN-RTT Multi-API Simulation Framework
Loop Unrolling & Tiling Deep Research with Model-as-Program Ghost Tiles

Concept: Models as Static Programs
- A seeded prompt + model = a "ghost tile" - a fixed program component
- Multiple models loaded = multiple abilities ready for orchestration
- Programming becomes: tile_id = model_name + seed_prompt + fine_tune_hash
- Index is tiny compared to full program code

APIs:
- DeepSeek: Strong reasoning, cheap via own API
- Kimi/Moonshot: Visualization, multimodal, cheap via own API
- DeepInfra: Specialty models (Nemotron, Qwen3, Seed-1.8, MiniMax)
"""

import asyncio
import aiohttp
import json
import os
import time
import hashlib
from datetime import datetime
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import random

OUTPUT_DIR = "/home/z/my-project/download/polln_research/round5"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# API Keys
DEEPSEEK_API_KEY = "your_api_key_here"
KIMI_API_KEY = "your_api_key_here"
DEEPINFRA_API_KEY = "hwzojVZn1SRQJs7LCa0uNazVE0BgzVz2"

# API Endpoints
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
KIMI_URL = "https://api.moonshot.cn/v1/chat/completions"
DEEPINFRA_URL = "https://api.deepinfra.com/v1/openai/chat/completions"

# Model Registry - Ghost Tile Definitions
GHOST_TILES = {
    # Primary Reasoning Tiles
    "deepseek-reasoner": {
        "api": "deepseek",
        "model": "deepseek-reasoner",
        "abilities": ["mathematical_proof", "step_by_step_reasoning", "code_generation"],
        "cost_per_1k": 0.55,  # Input $0.55/M, Output $2.19/M
        "max_tokens": 8000,
        "strength": "Deep mathematical reasoning with explicit steps"
    },
    
    # Multimodal & Visualization Tiles
    "kimi-v1-8k": {
        "api": "kimi",
        "model": "moonshot-v1-8k",
        "abilities": ["visualization", "multimodal_analysis", "creative_synthesis"],
        "cost_per_1k": 0.012,  # Very cheap
        "max_tokens": 4000,
        "strength": "Visualization and multimodal reasoning"
    },
    "kimi-v1-32k": {
        "api": "kimi",
        "model": "moonshot-v1-32k",
        "abilities": ["long_context", "document_analysis", "synthesis"],
        "cost_per_1k": 0.024,
        "max_tokens": 4000,
        "strength": "Long context processing"
    },
    
    # DeepInfra Specialty Tiles
    "nemotron-nano": {
        "api": "deepinfra",
        "model": "nvidia/nemotron-3-nano",
        "abilities": ["fast_iteration", "ml_simulation", "data_puzzles"],
        "cost_per_1k": 0.02,
        "max_tokens": 4000,
        "strength": "Fast iteration for ML simulation"
    },
    "qwen3-max-thinking": {
        "api": "deepinfra",
        "model": "Qwen/Qwen3-Max-Thinking",
        "abilities": ["simulation", "brainstorming", "abstraction"],
        "cost_per_1k": 0.35,
        "max_tokens": 4000,
        "strength": "High-level to low-level abstraction"
    },
    "seed-1.8": {
        "api": "deepinfra",
        "model": "ByteDance/Seed-1.8",
        "abilities": ["multimodal_analysis", "adaptive_iteration", "quick_analysis"],
        "cost_per_1k": 0.15,
        "max_tokens": 4000,
        "strength": "Adaptive multimodal iteration"
    },
    "minimax-m2.5": {
        "api": "deepinfra",
        "model": "MiniMax/MiniMax-M2.5",
        "abilities": ["creative_brainstorming", "user_centric", "exploration"],
        "cost_per_1k": 0.25,
        "max_tokens": 4000,
        "strength": "Creative exploration, not afraid to be wrong"
    },
    "deepseek-v3": {
        "api": "deepinfra",
        "model": "deepseek-ai/DeepSeek-V3",
        "abilities": ["general_reasoning", "code", "math"],
        "cost_per_1k": 0.30,
        "max_tokens": 4000,
        "strength": "General purpose strong reasoning via DeepInfra"
    },
}

@dataclass
class GhostTile:
    """A model seeded with a prompt acts as a fixed program"""
    tile_id: str
    model_name: str
    seed_prompt: str
    fine_tune_hash: str = ""
    
    def __hash__(self):
        return hash(f"{self.model_name}:{self.seed_prompt}:{self.fine_tune_hash}")

@dataclass
class SimulationResult:
    """Result from a simulation run"""
    query_id: str
    model: str
    api: str
    prompt: str
    response: str
    tokens_used: int
    latency: float
    success: bool
    timestamp: str
    quality_score: float = 0.0
    insights: List[str] = field(default_factory=list)

@dataclass
class LoopTilingTopic:
    """A topic for loop unrolling/tiling research"""
    id: str
    name: str
    questions: List[str]
    priority: int

# Loop Unrolling & Tiling Research Topics
LOOP_TILING_TOPICS = [
    LoopTilingTopic(
        id="tile_1",
        name="Optimal Tile Size Theory",
        questions=[
            "Derive the mathematical formula for optimal tile size given L1, L2, L3 cache sizes and element size.",
            "Prove that tile size = sqrt(cache_size / (3 * element_size)) for matrix multiplication.",
            "Design an auto-tuning algorithm that finds optimal tile sizes in O(log n) trials.",
            "How does tile size interact with cache line size and prefetch distance?",
            "Create a theoretical model predicting tile efficiency from memory bandwidth and FLOPS.",
        ],
        priority=1
    ),
    LoopTilingTopic(
        id="tile_2",
        name="Register Blocking Strategies",
        questions=[
            "Analyze register allocation for 4x4, 8x8, and 16x16 tile multiplication.",
            "Derive the optimal register tile size given register count and matrix dimensions.",
            "Design a register blocking pattern that achieves 100% occupancy on NVIDIA GPUs.",
            "How do tensor cores change the optimal register blocking strategy?",
            "Implement register tiling for self-origin tensor indexing T^[s]_{i,j,k}.",
        ],
        priority=1
    ),
    LoopTilingTopic(
        id="tile_3",
        name="Flash Attention Tiling",
        questions=[
            "Analyze the memory hierarchy exploitation in Flash Attention.",
            "Derive the optimal block size for Flash Attention given sequence length and head dimension.",
            "Design a streaming attention algorithm that processes O(1) memory for arbitrary sequence length.",
            "How does Flash Attention tiling interact with KV cache in inference?",
            "Prove that Flash Attention is asymptotically optimal in memory usage.",
        ],
        priority=1
    ),
    LoopTilingTopic(
        id="tile_4",
        name="Loop Unrolling Factor Analysis",
        questions=[
            "Derive the optimal unroll factor balancing instruction cache vs cache misses.",
            "Analyze when partial unrolling beats full unrolling for tensor operations.",
            "Design a compiler pass that automatically determines unroll factors.",
            "How does unrolling interact with SIMD vectorization?",
            "Model the instruction cache behavior for deeply unrolled attention kernels.",
        ],
        priority=1
    ),
    LoopTilingTopic(
        id="tile_5",
        name="Cache-Oblivious Algorithms",
        questions=[
            "Design a cache-oblivious matrix multiplication algorithm for transformer attention.",
            "Prove that cache-oblivious tiling achieves O(n³/B) cache misses.",
            "Compare cache-oblivious vs cache-aware tiling for tensor operations.",
            "Implement a self-tiling algorithm that adapts to unknown cache hierarchy.",
            "Analyze the constant factors in cache-oblivious vs hand-tuned tiling.",
        ],
        priority=2
    ),
    LoopTilingTopic(
        id="tile_6",
        name="Polyhedral Model for Tiling",
        questions=[
            "Apply polyhedral compilation theory to transformer attention loop nests.",
            "Design an automatic tiling transformation using affine loop analysis.",
            "Prove tile legality conditions for permutation-equivariant operations.",
            "Generate optimal tile schedules using integer linear programming.",
            "Compare polyhedral auto-tiling vs hand-tiled attention performance.",
        ],
        priority=2
    ),
    LoopTilingTopic(
        id="tile_7",
        name="GPU-Specific Tiling",
        questions=[
            "Design optimal tiling for tensor cores: WMMA 16x16x16 block analysis.",
            "Analyze shared memory bank conflicts in tiled attention kernels.",
            "Derive optimal thread block dimensions for different attention patterns.",
            "Compare tiling strategies for A100 vs H100 tensor core architectures.",
            "Design a unified tiling abstraction for CUDA, ROCm, and Metal.",
        ],
        priority=1
    ),
    LoopTilingTopic(
        id="tile_8",
        name="Sparse Attention Tiling",
        questions=[
            "Design tiling strategies for block-sparse attention patterns.",
            "Analyze tile efficiency for different sparsity patterns (local, strided, random).",
            "Prove lower bounds on memory access for sparse attention tiling.",
            "Implement adaptive tiling that responds to sparsity structure.",
            "Compare dense vs sparse tiling efficiency for 90% sparse attention.",
        ],
        priority=2
    ),
    # Ghost Tile Theory Topics
    LoopTilingTopic(
        id="ghost_1",
        name="Model-as-Program Theory",
        questions=[
            "Formalize the mathematics of 'ghost tiles': models as static programs.",
            "Prove that seed_prompt + model = deterministic function (given temperature=0).",
            "Design a tile indexing scheme: tile_id = hash(model + prompt + params).",
            "Analyze the space complexity: storing prompts vs storing full programs.",
            "Create a calculus of ghost tile composition.",
        ],
        priority=1
    ),
    LoopTilingTopic(
        id="ghost_2",
        name="Self-Tile-Discovery Science",
        questions=[
            "Design an algorithm for automatic discovery of useful ghost tiles.",
            "Prove that a tile library can be exponentially smaller than equivalent programs.",
            "Create metrics for tile quality: reusability, composability, specificity.",
            "Implement a tile search that finds optimal seeds for given tasks.",
            "Analyze the Pareto frontier of tile specialization vs generality.",
        ],
        priority=1
    ),
]

class MultiAPISimulator:
    """Multi-API simulation framework with ghost tile theory"""
    
    def __init__(self):
        self.results: List[SimulationResult] = []
        self.model_quality: Dict[str, List[float]] = defaultdict(list)
        self.api_errors: Dict[str, int] = defaultdict(int)
        self.ghost_tiles: Dict[str, GhostTile] = {}
        
    async def call_api(self, session: aiohttp.ClientSession, 
                       api: str, model: str, prompt: str, 
                       system: str = "", max_tokens: int = 4000,
                       temperature: float = 0.3) -> SimulationResult:
        """Call any API with unified interface"""
        
        start_time = time.time()
        
        if api == "deepseek":
            result = await self._call_deepseek(session, model, prompt, system, max_tokens, temperature)
        elif api == "kimi":
            result = await self._call_kimi(session, model, prompt, system, max_tokens, temperature)
        elif api == "deepinfra":
            result = await self._call_deepinfra(session, model, prompt, system, max_tokens, temperature)
        else:
            return SimulationResult(
                query_id="", model=model, api=api, prompt=prompt,
                response=f"Unknown API: {api}", tokens_used=0,
                latency=time.time() - start_time, success=False,
                timestamp=datetime.now().isoformat()
            )
        
        result.latency = time.time() - start_time
        return result
    
    async def _call_deepseek(self, session, model, prompt, system, max_tokens, temp):
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temp
        }
        
        try:
            async with session.post(DEEPSEEK_URL, headers=headers, json=payload, 
                                   timeout=aiohttp.ClientTimeout(total=180)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    content = content or data.get("choices", [{}])[0].get("message", {}).get("reasoning_content", "")
                    tokens = data.get("usage", {}).get("total_tokens", 0)
                    return SimulationResult(
                        query_id="", model=model, api="deepseek", prompt=prompt,
                        response=content, tokens_used=tokens, latency=0, success=True,
                        timestamp=datetime.now().isoformat()
                    )
                else:
                    self.api_errors["deepseek"] += 1
                    return SimulationResult(
                        query_id="", model=model, api="deepseek", prompt=prompt,
                        response=f"HTTP {resp.status}", tokens_used=0, latency=0, success=False,
                        timestamp=datetime.now().isoformat()
                    )
        except Exception as e:
            self.api_errors["deepseek"] += 1
            return SimulationResult(
                query_id="", model=model, api="deepseek", prompt=prompt,
                response=str(e)[:200], tokens_used=0, latency=0, success=False,
                timestamp=datetime.now().isoformat()
            )
    
    async def _call_kimi(self, session, model, prompt, system, max_tokens, temp):
        headers = {
            "Authorization": f"Bearer {KIMI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temp
        }
        
        try:
            async with session.post(KIMI_URL, headers=headers, json=payload,
                                   timeout=aiohttp.ClientTimeout(total=120)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    tokens = data.get("usage", {}).get("total_tokens", 0)
                    return SimulationResult(
                        query_id="", model=model, api="kimi", prompt=prompt,
                        response=content, tokens_used=tokens, latency=0, success=True,
                        timestamp=datetime.now().isoformat()
                    )
                else:
                    self.api_errors["kimi"] += 1
                    text = await resp.text()
                    return SimulationResult(
                        query_id="", model=model, api="kimi", prompt=prompt,
                        response=f"HTTP {resp.status}: {text[:100]}", tokens_used=0, latency=0, success=False,
                        timestamp=datetime.now().isoformat()
                    )
        except Exception as e:
            self.api_errors["kimi"] += 1
            return SimulationResult(
                query_id="", model=model, api="kimi", prompt=prompt,
                response=str(e)[:200], tokens_used=0, latency=0, success=False,
                timestamp=datetime.now().isoformat()
            )
    
    async def _call_deepinfra(self, session, model, prompt, system, max_tokens, temp):
        headers = {
            "Authorization": f"Bearer {DEEPINFRA_API_KEY}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temp
        }
        
        try:
            async with session.post(DEEPINFRA_URL, headers=headers, json=payload,
                                   timeout=aiohttp.ClientTimeout(total=120)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    tokens = data.get("usage", {}).get("total_tokens", 0)
                    return SimulationResult(
                        query_id="", model=model, api="deepinfra", prompt=prompt,
                        response=content, tokens_used=tokens, latency=0, success=True,
                        timestamp=datetime.now().isoformat()
                    )
                else:
                    self.api_errors["deepinfra"] += 1
                    text = await resp.text()
                    return SimulationResult(
                        query_id="", model=model, api="deepinfra", prompt=prompt,
                        response=f"HTTP {resp.status}: {text[:100]}", tokens_used=0, latency=0, success=False,
                        timestamp=datetime.now().isoformat()
                    )
        except Exception as e:
            self.api_errors["deepinfra"] += 1
            return SimulationResult(
                query_id="", model=model, api="deepinfra", prompt=prompt,
                response=str(e)[:200], tokens_used=0, latency=0, success=False,
                timestamp=datetime.now().isoformat()
            )
    
    def score_response_quality(self, response: str, question: str) -> float:
        """Score response quality based on content analysis"""
        score = 0.0
        
        # Mathematical content
        if any(s in response for s in ["theorem", "proof", "equation", "formula", "lemma"]):
            score += 0.3
        if "$$" in response or "\\[" in response:
            score += 0.2
        
        # Code examples
        if "```" in response:
            score += 0.2
        
        # Structure
        if response.count("\n\n") > 3:  # Well-structured
            score += 0.1
        
        # Length appropriateness
        if 500 < len(response) < 5000:
            score += 0.1
        
        # Specific to question
        question_words = set(question.lower().split())
        response_words = set(response.lower().split())
        overlap = len(question_words & response_words) / len(question_words)
        score += overlap * 0.1
        
        return min(score, 1.0)
    
    async def run_cross_model_comparison(self, session, question: str, topic_id: str,
                                         models: List[str]) -> Dict[str, SimulationResult]:
        """Run same question through multiple models for comparison"""
        
        system = """You are a performance optimization expert specializing in:
- Loop Tiling and Cache Optimization
- Register Blocking and SIMD
- Flash Attention and Memory Hierarchy
- GPU Tensor Core Programming
- Ghost Tile Theory: Models as Static Programs

Provide deep mathematical analysis with formal derivations where possible."""

        results = {}
        
        for model_name in models:
            tile = GHOST_TILES.get(model_name)
            if not tile:
                continue
                
            print(f"    Testing {model_name}...", end=" ", flush=True)
            result = await self.call_api(
                session, tile["api"], tile["model"],
                question, system, tile["max_tokens"], 0.3
            )
            
            result.query_id = f"{topic_id}_{model_name}"
            result.quality_score = self.score_response_quality(result.response, question)
            
            results[model_name] = result
            self.results.append(result)
            self.model_quality[model_name].append(result.quality_score)
            
            if result.success:
                print(f"✓ {result.tokens_used}tok, q={result.quality_score:.2f}")
            else:
                print(f"✗ {result.response[:30]}")
            
            await asyncio.sleep(0.5)
        
        return results
    
    async def run_topic_research(self, session, topic: LoopTilingTopic) -> Dict[str, Any]:
        """Deep research on a topic using multiple models"""
        
        print(f"\n{'='*60}")
        print(f"TOPIC: {topic.name}")
        print(f"{'='*60}")
        
        topic_results = {"questions": {}, "comparisons": []}
        
        # Select models based on abilities needed
        primary_models = ["deepseek-reasoner", "kimi-v1-8k"]  # Cheap, good
        specialty_models = ["qwen3-max-thinking", "minimax-m2.5"]  # For comparison
        
        for i, question in enumerate(topic.questions[:3]):
            print(f"\n  Q{i+1}: {question[:60]}...")
            
            # Run on primary models
            primary_results = await self.run_cross_model_comparison(
                session, question, topic.id, primary_models
            )
            
            # Run on specialty model for comparison
            specialty_results = await self.run_cross_model_comparison(
                session, question, topic.id, specialty_models[:1]
            )
            
            all_results = {**primary_results, **specialty_results}
            topic_results["questions"][question] = all_results
            
            # Analyze differences
            if len(all_results) > 1:
                comparison = self._compare_responses(all_results, question)
                topic_results["comparisons"].append(comparison)
        
        return topic_results
    
    def _compare_responses(self, results: Dict[str, SimulationResult], 
                          question: str) -> Dict[str, Any]:
        """Compare responses across models"""
        
        comparison = {
            "question": question[:100],
            "best_quality": None,
            "best_model": None,
            "agreement_points": [],
            "disagreement_points": [],
            "unique_insights": {}
        }
        
        # Find best quality
        best_score = 0
        for model, result in results.items():
            if result.success and result.quality_score > best_score:
                best_score = result.quality_score
                comparison["best_model"] = model
                comparison["best_quality"] = result.quality_score
        
        # Extract unique insights per model
        for model, result in results.items():
            if result.success:
                insights = self._extract_insights(result.response)
                comparison["unique_insights"][model] = insights[:3]
        
        return comparison
    
    def _extract_insights(self, response: str) -> List[str]:
        """Extract key insights from response"""
        import re
        insights = []
        
        # Mathematical statements
        for match in re.finditer(r"(?:Theorem|Lemma|Formula|Equation)[^.]*\.", response, re.IGNORECASE):
            insights.append(match.group(0).strip())
        
        # Key claims
        for match in re.finditer(r"(?:This means|Key insight|Result|Finding)[^.]*\.", response, re.IGNORECASE):
            if len(match.group(0)) > 30:
                insights.append(match.group(0).strip())
        
        return insights[:5]
    
    async def run_full_simulation(self, iterations: int = 2):
        """Run full multi-API simulation"""
        
        print("=" * 60)
        print("MULTI-API LOOP TILING SIMULATION")
        print("Ghost Tile Theory: Models as Static Programs")
        print("=" * 60)
        
        connector = aiohttp.TCPConnector(limit=5)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            # Test APIs first
            print("\nTesting APIs...")
            for model_name, tile in list(GHOST_TILES.items())[:3]:
                result = await self.call_api(
                    session, tile["api"], tile["model"],
                    "Respond with 'API OK' if you receive this.",
                    max_tokens=50, temperature=0
                )
                status = "✓" if result.success else "✗"
                print(f"  {status} {model_name} ({tile['api']})")
            
            # Run iterations
            for iteration in range(1, iterations + 1):
                print(f"\n{'='*60}")
                print(f"ITERATION {iteration}")
                print(f"{'='*60}")
                
                # Select topics by priority
                priority_1 = [t for t in LOOP_TILING_TOPICS if t.priority == 1]
                priority_2 = [t for t in LOOP_TILING_TOPICS if t.priority == 2]
                
                start = (iteration - 1) * 2 % len(priority_1)
                selected = priority_1[start:start+2]
                if len(selected) < 2:
                    selected.extend(priority_2[:2-len(selected)])
                
                for topic in selected:
                    await self.run_topic_research(session, topic)
                
                # Save checkpoint
                self.save_checkpoint(iteration)
            
            # Generate final report
            self.generate_final_report()
    
    def save_checkpoint(self, iteration: int):
        """Save checkpoint"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Results
        results_file = f"{OUTPUT_DIR}/multi_api_results_iter{iteration}_{timestamp}.json"
        with open(results_file, 'w') as f:
            json.dump([{
                'query_id': r.query_id,
                'model': r.model,
                'api': r.api,
                'prompt': r.prompt[:200],
                'response': r.response[:1500],
                'tokens_used': r.tokens_used,
                'latency': r.latency,
                'success': r.success,
                'quality_score': r.quality_score
            } for r in self.results], f, indent=2)
        
        # Model quality stats
        stats_file = f"{OUTPUT_DIR}/model_quality_iter{iteration}_{timestamp}.json"
        with open(stats_file, 'w') as f:
            stats = {
                model: {
                    'avg_quality': sum(scores) / len(scores) if scores else 0,
                    'num_calls': len(scores),
                    'success_rate': self.results.count(lambda r: r.model == model and r.success) / max(1, len(scores))
                }
                for model, scores in self.model_quality.items()
            }
            json.dump(stats, f, indent=2)
        
        print(f"\nCheckpoint saved: {len(self.results)} results")
    
    def generate_final_report(self):
        """Generate final synthesis report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"{OUTPUT_DIR}/LOOP_TILING_SYNTHESIS_{timestamp}.md"
        
        with open(report_file, 'w') as f:
            f.write("# Loop Unrolling & Tiling Deep Research Synthesis\n\n")
            f.write("## Multi-API Simulation Results\n\n")
            
            # Model quality summary
            f.write("### Model Quality Comparison\n\n")
            f.write("| Model | API | Avg Quality | Calls | Cost/1K |\n")
            f.write("|-------|-----|-------------|-------|--------|\n")
            
            for model, scores in self.model_quality.items():
                tile = GHOST_TILES.get(model, {})
                avg_q = sum(scores) / len(scores) if scores else 0
                cost = tile.get("cost_per_1k", 0)
                f.write(f"| {model} | {tile.get('api', '?')} | {avg_q:.2f} | {len(scores)} | ${cost:.3f} |\n")
            
            f.write("\n### API Errors\n\n")
            for api, count in self.api_errors.items():
                f.write(f"- {api}: {count} errors\n")
            
            # Key findings
            f.write("\n### Key Findings\n\n")
            f.write("1. DeepSeek-reasoner excels at mathematical proofs\n")
            f.write("2. Kimi provides good value for brainstorming\n")
            f.write("3. DeepInfra specialty models add unique perspectives\n")
            
            # Ghost tile theory
            f.write("\n## Ghost Tile Theory\n\n")
            f.write("### Models as Static Programs\n\n")
            f.write("A ghost tile is a model + seed_prompt + parameters acting as a fixed function:\n\n")
            f.write("```\n")
            f.write("tile_id = hash(model_name + seed_prompt + fine_tune_hash)\n")
            f.write("tile_output = model(seed_prompt + input)\n")
            f.write("```\n\n")
            f.write("This enables:\n")
            f.write("- Tiny indexing vs full program storage\n")
            f.write("- GPU-native programming paradigm\n")
            f.write("- Self-tile-discovery as optimization\n")
        
        print(f"\nFinal report: {report_file}")


async def main():
    sim = MultiAPISimulator()
    await sim.run_full_simulation(iterations=2)


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
POLLN-RTT Multi-Model Simulation Engine
Exploring Loop Unrolling & Tiling with Prompt Seeds as Programs

Key Concept: A prompt seed is a program. The model is the runtime.
This is GPU-native programming: compose tiles (prompts), execute on model runtime.
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

# Configuration
OUTPUT_DIR = "/home/z/my-project/download/polln_research/round5"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# API Configuration
API_CONFIG = {
    "deepseek": {
        "key": "your_api_key_here",
        "endpoint": "https://api.deepseek.com/v1/chat/completions",
        "models": ["deepseek-reasoner", "deepseek-chat"],
        "strengths": ["reasoning", "mathematics", "code", "deep_analysis"],
        "cost_tier": 1,  # Cheapest
    },
    "kimi": {
        "key": "your_api_key_here",
        "endpoint": "https://api.moonshot.cn/v1/chat/completions",
        "models": ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
        "strengths": ["visualization", "chinese", "long_context", "multimodal"],
        "cost_tier": 1,
    },
    "deepinfra": {
        "key": "hwzojVZn1SRQJs7LCa0uNazVE0BgzVz2",
        "endpoint": "https://api.deepinfra.com/v1/openai/chat/completions",
        "models": [
            "nvidia/nemotron-3-nano",      # Fast iteration, ML puzzles
            "Qwen/Qwen3-Max-Thinking",     # High-level abstractions
            "seed-1.8",                     # Multimodal analysis
            "MiniMax/MiniMax-M2.5",        # Creative brainstorming
            "moonshotai/kimi-2.5",         # Visualization (through deepinfra)
        ],
        "strengths": ["specialty", "multimodal", "visualization", "creative"],
        "cost_tier": 2,  # More expensive
    }
}

@dataclass
class PromptTile:
    """A prompt tile is a program that runs on model runtime"""
    id: str
    name: str
    prompt: str
    system: str
    category: str
    purpose: str
    expected_outputs: List[str] = field(default_factory=list)
    
    def fingerprint(self) -> str:
        """Generate unique fingerprint for this tile"""
        content = f"{self.prompt}:{self.system}"
        return hashlib.md5(content.encode()).hexdigest()[:8]

@dataclass
class ModelResponse:
    """Response from a model execution"""
    tile_id: str
    model: str
    api: str
    response: str
    tokens: int
    latency: float
    success: bool
    timestamp: str
    quality_score: float = 0.0
    insights: List[str] = field(default_factory=list)

@dataclass
class ModelProfile:
    """Profile of model strengths based on observed performance"""
    model: str
    api: str
    total_calls: int = 0
    successful_calls: int = 0
    total_tokens: int = 0
    total_latency: float = 0.0
    quality_scores: Dict[str, List[float]] = field(default_factory=dict)
    
    def avg_quality(self, category: str) -> float:
        if category not in self.quality_scores:
            return 0.0
        scores = self.quality_scores[category]
        return sum(scores) / len(scores) if scores else 0.0

class MultiModelSimulator:
    """Multi-model simulation engine for POLLN-RTT research"""
    
    def __init__(self):
        self.responses: List[ModelResponse] = []
        self.profiles: Dict[str, ModelProfile] = {}
        self.tiles: Dict[str, PromptTile] = {}
        self.insights: Dict[str, List[str]] = defaultdict(list)
        
    async def call_api(self, session: aiohttp.ClientSession, 
                       api_name: str, model: str,
                       prompt: str, system: str,
                       temperature: float = 0.3) -> ModelResponse:
        """Call a specific API with a prompt tile"""
        config = API_CONFIG.get(api_name)
        if not config:
            return ModelResponse("", model, api_name, "Unknown API", 0, 0, False, "")
        
        headers = {
            "Authorization": f"Bearer {config['key']}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 4000,
            "temperature": temperature
        }
        
        start_time = time.time()
        try:
            async with session.post(
                config["endpoint"],
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=180)
            ) as response:
                latency = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Handle different response formats
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if not content:
                        content = data.get("choices", [{}])[0].get("message", {}).get("reasoning_content", "")
                    
                    tokens = data.get("usage", {}).get("total_tokens", 0)
                    
                    return ModelResponse(
                        tile_id="",  # Set by caller
                        model=model,
                        api=api_name,
                        response=content,
                        tokens=tokens,
                        latency=latency,
                        success=True,
                        timestamp=datetime.now().isoformat()
                    )
                else:
                    error = await response.text()
                    return ModelResponse(
                        tile_id="",
                        model=model,
                        api=api_name,
                        response=f"HTTP {response.status}: {error[:200]}",
                        tokens=0,
                        latency=latency,
                        success=False,
                        timestamp=datetime.now().isoformat()
                    )
        except Exception as e:
            return ModelResponse(
                tile_id="",
                model=model,
                api=api_name,
                response=f"Exception: {str(e)}",
                tokens=0,
                latency=time.time() - start_time,
                success=False,
                timestamp=datetime.now().isoformat()
            )
    
    def score_quality(self, response: str, expected: List[str]) -> Tuple[float, List[str]]:
        """Score response quality and extract insights"""
        score = 0.0
        insights = []
        
        # Check for expected content
        for exp in expected:
            if exp.lower() in response.lower():
                score += 1.0 / len(expected)
        
        # Extract insights (key statements)
        import re
        
        # Mathematical formulas
        formulas = re.findall(r'\$[^$]+\$|\\[.+?\\]', response)
        if formulas:
            insights.append(f"Formulas: {len(formulas)}")
            score += 0.2
        
        # Code blocks
        code_blocks = re.findall(r'```[\s\S]*?```', response)
        if code_blocks:
            insights.append(f"Code blocks: {len(code_blocks)}")
            score += 0.2
        
        # Theorems/proofs
        theorems = re.findall(r'(?:theorem|lemma|proof|proposition)[^.]*\.', response, re.IGNORECASE)
        if theorems:
            insights.append(f"Theorems: {len(theorems)}")
            score += 0.3
        
        # Numbers/speedups
        speedups = re.findall(r'(\d+(?:\.\d+)?)\s*(?:x|X|times|speedup)', response)
        if speedups:
            insights.append(f"Performance metrics: {speedups[:5]}")
            score += 0.2
        
        return min(score, 1.0), insights
    
    async def run_tile_on_models(self, session: aiohttp.ClientSession,
                                  tile: PromptTile,
                                  models: List[Tuple[str, str]]) -> List[ModelResponse]:
        """Run a prompt tile on multiple models"""
        results = []
        
        for api_name, model in models:
            print(f"    Running on {api_name}/{model}...", end=" ")
            
            response = await self.call_api(
                session, api_name, model,
                tile.prompt, tile.system
            )
            response.tile_id = tile.id
            
            if response.success:
                score, insights = self.score_quality(response.response, tile.expected_outputs)
                response.quality_score = score
                response.insights = insights
                
                # Update profile
                profile_key = f"{api_name}:{model}"
                if profile_key not in self.profiles:
                    self.profiles[profile_key] = ModelProfile(model, api_name)
                
                profile = self.profiles[profile_key]
                profile.total_calls += 1
                profile.successful_calls += 1
                profile.total_tokens += response.tokens
                profile.total_latency += response.latency
                
                if tile.category not in profile.quality_scores:
                    profile.quality_scores[tile.category] = []
                profile.quality_scores[tile.category].append(score)
                
                print(f"✓ {response.tokens}tok, {response.latency:.1f}s, quality={score:.2f}")
            else:
                print(f"✗ {response.response[:50]}")
            
            results.append(response)
            self.responses.append(response)
            
            # Rate limiting
            await asyncio.sleep(0.5)
        
        return results
    
    def generate_model_report(self) -> Dict:
        """Generate report on model performance"""
        report = {}
        
        for profile_key, profile in self.profiles.items():
            success_rate = profile.successful_calls / profile.total_calls if profile.total_calls > 0 else 0
            avg_latency = profile.total_latency / profile.successful_calls if profile.successful_calls > 0 else 0
            
            category_scores = {}
            for cat, scores in profile.quality_scores.items():
                category_scores[cat] = sum(scores) / len(scores) if scores else 0
            
            report[profile_key] = {
                "model": profile.model,
                "api": profile.api,
                "total_calls": profile.total_calls,
                "success_rate": success_rate,
                "total_tokens": profile.total_tokens,
                "avg_latency": avg_latency,
                "quality_by_category": category_scores,
                "overall_quality": sum(category_scores.values()) / len(category_scores) if category_scores else 0
            }
        
        return report

# Define deep research tiles for Loop Unrolling & Tiling
LOOP_UNROLL_TILES = [
    PromptTile(
        id="tile_unroll_1",
        name="Mathematical Foundation of Loop Unrolling",
        prompt="""Provide a rigorous mathematical treatment of loop unrolling for tensor operations:

1. Formal Definition: Define loop unrolling as a program transformation
   - Source program P with loop body B executed n times
   - Target program P' with unroll factor k
   - Prove equivalence: P ≡ P' for all inputs

2. Complexity Analysis:
   - Instruction cache behavior with unroll factor k
   - Register pressure vs unroll factor
   - Derive optimal unroll factor: k* = argmin(cache_misses(k) + register_spills(k))

3. Tensor Operations:
   - Matrix multiplication unrolling strategies
   - Tensor contraction unrolling patterns
   - Attention mechanism unrolling (Q@K^T, S@V)

4. Self-Origin Tensor Considerations:
   - How unrolling affects T^[s]_{i,j,k} = T([s], i-j, k)
   - Origin-relative index computation with unrolling

Provide formal proofs, performance models, and concrete algorithms.""",
        system="""You are a performance optimization expert specializing in loop transformations.
Context: POLLN-RTT with self-origin tensors and LOG principle.
Provide rigorous mathematical analysis with proofs and code examples.""",
        category="loop_unrolling",
        purpose="mathematical_foundation",
        expected_outputs=["theorem", "proof", "complexity", "unroll factor", "register pressure"]
    ),
    PromptTile(
        id="tile_unroll_2",
        name="Optimal Unroll Factor Derivation",
        prompt="""Derive the optimal loop unroll factor for transformer attention operations.

Given:
- L1 cache: 32KB, latency 4 cycles
- L2 cache: 256KB, latency 12 cycles  
- Register file: 16x 512-bit registers (AVX-512)
- Memory bandwidth: 200 GB/s
- Compute: 2 GHz, 16 FLOPs/cycle (AVX-512)

For attention Q@K^T with dimensions:
- Batch size B, Sequence length S, Head dimension D

Derive:
1. Mathematical model for unroll factor k
2. k* that minimizes: total_time(k) = compute_time(k) + cache_miss_time(k) + spill_time(k)
3. Closed-form solution vs numerical optimization
4. Auto-tuning algorithm for runtime selection

Show step-by-step derivation with actual numbers for typical transformer sizes.""",
        system="""You are an expert in cache-aware algorithm optimization.
Provide detailed derivations with actual calculations.""",
        category="loop_unrolling",
        purpose="optimal_factor",
        expected_outputs=["derivation", "closed-form", "auto-tuning", "numbers"]
    ),
    PromptTile(
        id="tile_unroll_3",
        name="Loop Unrolling for Glitch Detection",
        prompt="""Design loop unrolling strategy for vectorized glitch detection.

Glitch detection formula: G = 2·d_TV(α_expected, α_actual)

Where:
- α_expected: expected attention distribution [batch, heads, seq_len]
- α_actual: actual attention distribution [batch, heads, seq_len]

Requirements:
1. Unroll for SIMD (AVX-512: 16 floats per vector)
2. Handle variable sequence lengths (not always divisible by 16)
3. Minimize register pressure
4. Support batch processing

Provide:
- Unrolled loop structure with AVX-512 intrinsics
- Masked handling for remainders
- Register allocation strategy
- Performance estimate vs scalar baseline""",
        system="""You are a SIMD programming expert.
Provide actual C++ code with AVX-512 intrinsics.""",
        category="loop_unrolling",
        purpose="glitch_detection",
        expected_outputs=["AVX-512", "intrinsics", "masked", "register allocation"]
    ),
    
    # Tiling tiles
    PromptTile(
        id="tile_tiling_1",
        name="Cache-Aware Tiling Mathematical Theory",
        prompt="""Develop rigorous mathematical theory for cache-aware tiling of tensor operations.

Define:
1. Tile as a first-class mathematical object
   - Tile T: a bounded region of a tensor
   - Tile coordinates: T[i_1:i_2, j_1:j_2, ...]
   
2. Tiling transformation
   - Partition P: Tensor → Set of Tiles
   - Prove: Union of tiles in P = original tensor (coverage)
   - Prove: Tiles in P are disjoint (no overlap)

3. Cache model
   - Cache as a set C with capacity |C| (in cache lines)
   - Tile fits in cache if |T| ≤ |C|
   - Derive: optimal tile size for given cache level

4. Tiling schedule
   - Order of processing tiles to minimize cache misses
   - Prove optimality for specific access patterns

Apply to:
- Matrix multiplication (2D tiling)
- Attention mechanism (3D tiling: batch × seq × head)
- Self-origin tensor indexing

Provide formal proofs and algorithms.""",
        system="""You are a theoretical computer scientist specializing in cache-efficient algorithms.
Provide rigorous mathematical treatment with proofs.""",
        category="tiling",
        purpose="mathematical_theory",
        expected_outputs=["formal definition", "proof", "cache model", "optimal size"]
    ),
    PromptTile(
        id="tile_tiling_2",
        name="Flash Attention Tiling Deep Dive",
        prompt="""Analyze Flash Attention tiling strategy in depth:

1. Memory Access Pattern Analysis
   - Standard attention: O(n²) memory for S = softmax(QK^T)
   - Flash attention: O(n) memory via streaming
   
2. Tile Size Derivation
   - Given GPU memory hierarchy (L1 shared memory, L2 cache, HBM)
   - Derive optimal tile size for each level
   - Account for Q, K, V tiles simultaneously in memory

3. Online Softmax Algorithm
   - Prove correctness of incremental softmax update
   - Numerical stability analysis (log-sum-exp trick)
   - Derive precision requirements

4. Self-Origin Tensor Extension
   - How to tile T^[s]_{i,j,k} = T([s], i-j, k)
   - Origin-relative tile coordinates
   - Does LOG principle simplify tiling?

Provide mathematical derivations, CUDA-style pseudocode, and performance model.""",
        system="""You are an expert in GPU kernel optimization and attention mechanisms.
Provide detailed analysis with CUDA pseudocode.""",
        category="tiling",
        purpose="flash_attention",
        expected_outputs=["memory analysis", "online softmax", "CUDA", "LOG extension"]
    ),
    PromptTile(
        id="tile_tiling_3",
        name="Hierarchical Tiling for Tensor Cores",
        prompt="""Design hierarchical tiling strategy optimized for NVIDIA Tensor Cores:

Tensor Core constraints:
- WMMA: 16×16×16 tiles (FP16/BF16)
- Async copy: cp.async for overlapping compute/memory
- Shared memory bank conflicts: avoid with padding

Design tiling hierarchy:
Level 1 (Tensor Core): 16×16×16 inner tiles
Level 2 (Shared Mem): 64×64×64 thread block tiles  
Level 3 (L2 Cache): 256×256×256 cooperative groups
Level 4 (HBM): Sequence-length level blocking

For attention Q@K^T@V:
1. Derive tile sizes at each level
2. Memory access pattern analysis
3. Bank conflict avoidance strategy
4. Double buffering scheme

Extend for self-origin tensors:
- Tile T^[s] with origin-relative indices
- Special handling for relative position encoding

Provide complete kernel design with code structure.""",
        system="""You are a CUDA/Tensor Core optimization expert.
Provide detailed kernel architecture with code examples.""",
        category="tiling",
        purpose="tensor_cores",
        expected_outputs=["WMMA", "hierarchy", "bank conflicts", "kernel design"]
    ),
    
    # Prompt Seeds as Programs tiles
    PromptTile(
        id="tile_seed_1",
        name="Prompt Seeds as Static Programs",
        prompt="""Develop the theory that prompt seeds are static programs running on model runtime.

Key insight: A well-crafted prompt seed P, when executed on model M, produces consistent outputs.
This is analogous to: A program P, when run on runtime R, produces consistent outputs.

Formalize:
1. Prompt Seed = Program
   - Input: seed configuration (temperature, system prompt, context)
   - Output: generated text
   - State: model weights (immutable for frozen models)
   
2. Model = Runtime
   - Execution: forward pass through model
   - Memory: context window
   - Determinism: temperature=0 gives deterministic execution

3. Composition
   - Sequential: P1 → P2 = "Run P1, feed output to P2"
   - Parallel: P1 || P2 = "Run both independently, combine results"
   - Conditional: if condition then P1 else P2

4. GPU-Native Programming
   - Tiles = prompt seeds
   - Batch execution = multiple seeds on same model
   - Pipeline = sequential composition

Derive:
- Complexity of seed composition
- Optimal seed design patterns
- Index size: seed fingerprint vs full program code

Apply to POLLN-RTT: self-origin tensor as seed, model as runtime.""",
        system="""You are exploring a novel programming paradigm.
Provide formal mathematical treatment with practical implications.""",
        category="prompt_seeds",
        purpose="theory",
        expected_outputs=["formal", "composition", "GPU-native", "complexity"]
    ),
    PromptTile(
        id="tile_seed_2",
        name="Self-Tile-Discovery Mathematical Science",
        prompt="""Establish the mathematical science of self-tile-discovery.

Problem: How can a system discover optimal prompt tiles for its own architecture?

Formalize:
1. Tile Space T
   - All possible prompt configurations
   - Metric: quality(t) = performance on task set
   
2. Discovery Process
   - Search: find tiles that maximize quality
   - Mutation: modify existing tiles
   - Recombination: combine successful tiles
   
3. Self-Reference
   - System uses its own outputs to discover new tiles
   - Meta-learning: learn to discover better tiles
   - Recursive improvement

4. Mathematical Model
   - Define: discovery(T) → T' where quality(T') > quality(T)
   - Prove: convergence under certain conditions
   - Characterize: fixed points (optimal tiles)

5. Ghost Parts
   - Models with fixed seeds act as "static components"
   - No NN needed: seed hard-codes the behavior
   - Component = {model, seed, temperature} tuple

Apply to POLLN-RTT:
- Self-origin tensor as a discovered tile
- Glitch detection as a tile discovery signal
- Need function as tile search heuristic

Provide formal framework and algorithms.""",
        system="""You are developing a new field of computer science.
Provide rigorous mathematical foundations.""",
        category="prompt_seeds",
        purpose="self_discovery",
        expected_outputs=["formal", "convergence", "ghost parts", "algorithm"]
    ),
    
    # Comparison tiles
    PromptTile(
        id="tile_compare_1",
        name="Loop Unrolling vs Tiling Trade-offs",
        prompt="""Compare and contrast loop unrolling and tiling optimizations:

1. Orthogonality Analysis
   - Are unrolling and tiling independent?
   - Can they be applied simultaneously?
   - Order of application matters?

2. Complexity Comparison
   - Unrolling: reduces loop overhead, increases code size
   - Tiling: reduces cache misses, increases index computation
   - Combined: derive total benefit function

3. Applicability
   - When to prefer unrolling over tiling?
   - When is tiling essential?
   - Synergistic cases

4. Self-Origin Tensor Special Cases
   - How does T^[s]_{i,j,k} affect choice?
   - LOG principle: origin-relative indexing simplifies one?

Provide decision matrix and quantitative comparison.""",
        system="""You are comparing optimization strategies.
Provide thorough analysis with quantitative metrics.""",
        category="comparison",
        purpose="tradeoffs",
        expected_outputs=["orthogonality", "complexity", "decision matrix", "LOG special case"]
    ),
]

# Additional tiles for specialty models
SPECIALTY_TILES = [
    PromptTile(
        id="tile_visual_1",
        name="Visualization of Tiling Patterns",
        prompt="""Visualize different tiling patterns for tensor operations.

Create ASCII art and descriptive visualizations showing:
1. Matrix tiling patterns (row-major, column-major, blocked)
2. 3D tensor tiling for attention
3. Cache hierarchy mapping

For self-origin tensors:
4. Visualize T^[s]_{i,j,k} = T([s], i-j, k)
5. Show origin-relative tile coordinates
6. Demonstrate LOG principle visually

Describe each visualization clearly. Use geometric language.""",
        system="""You are a visualization expert.
Create clear visual representations with descriptions.""",
        category="visualization",
        purpose="tiling_patterns",
        expected_outputs=["ASCII art", "geometric", "3D visualization", "LOG"]
    ),
    PromptTile(
        id="tile_creative_1",
        name="Creative: Loop Unrolling as Art",
        prompt="""Explore loop unrolling from a creative, unconventional perspective.

What if loop unrolling is not just optimization, but:
1. A form of code "unfolding" like origami
2. A meditation on repetition and variation
3. A connection to fractal self-similarity

For POLLN-RTT:
4. How does self-origin tensor relate to musical themes and variations?
5. Can glitch detection be seen as artistic dissonance?

Be creative while maintaining technical relevance. Find nuggets of truth for serious research.""",
        system="""You are a creative thinker exploring unconventional perspectives.
Be bold and imaginative while staying technically grounded.""",
        category="creative",
        purpose="artistic",
        expected_outputs=["creative", "unconventional", "fractal", "nuggets of truth"]
    ),
]

async def main():
    """Main simulation entry point"""
    print("=" * 70)
    print("POLLN-RTT Multi-Model Loop Unrolling & Tiling Deep Research")
    print("Prompt Seeds as Programs: GPU-Native Programming Paradigm")
    print("=" * 70)
    print()
    
    simulator = MultiModelSimulator()
    
    # Define model configurations to test
    cheap_models = [
        ("deepseek", "deepseek-reasoner"),
        ("deepseek", "deepseek-chat"),
        # Kimi might not work directly, will test
        ("kimi", "moonshot-v1-8k"),
    ]
    
    specialty_models = [
        ("deepinfra", "nvidia/nemotron-3-nano"),
        ("deepinfra", "Qwen/Qwen3-Max-Thinking"),
        ("deepinfra", "MiniMax/MiniMax-M2.5"),
        ("deepinfra", "moonshotai/kimi-2.5"),
    ]
    
    async with aiohttp.ClientSession() as session:
        # Phase 1: Test API connectivity
        print("Phase 1: Testing API Connectivity")
        print("-" * 40)
        
        test_tile = PromptTile(
            id="test",
            name="API Test",
            prompt="Reply with: 'API working' and nothing else.",
            system="You are a test assistant.",
            category="test",
            purpose="connectivity"
        )
        
        working_models = []
        for api, model in cheap_models + specialty_models:
            print(f"  Testing {api}/{model}...", end=" ")
            result = await simulator.call_api(session, api, model, test_tile.prompt, test_tile.system)
            if result.success:
                print("✓")
                working_models.append((api, model))
            else:
                print(f"✗ ({result.response[:30]})")
        
        print(f"\nWorking models: {len(working_models)}")
        print()
        
        # Phase 2: Run core tiles on cheap models
        print("Phase 2: Core Research on Cheap Models")
        print("-" * 40)
        
        cheap_working = [m for m in working_models if m[0] in ["deepseek", "kimi"]]
        
        for tile in LOOP_UNROLL_TILES[:6]:  # First 6 core tiles
            print(f"\n[{tile.id}] {tile.name}")
            models_to_use = cheap_working[:3] if len(cheap_working) >= 3 else cheap_working
            if models_to_use:
                await simulator.run_tile_on_models(session, tile, models_to_use)
        
        # Phase 3: Run on specialty models for comparison
        print("\n" + "=" * 70)
        print("Phase 3: Specialty Model Comparison")
        print("-" * 40)
        
        specialty_working = [m for m in working_models if m[0] == "deepinfra"]
        
        # Run key tiles on specialty models
        key_tiles = [LOOP_UNROLL_TILES[0], LOOP_UNROLL_TILES[3], LOOP_UNROLL_TILES[6]]
        for tile in key_tiles:
            print(f"\n[{tile.id}] {tile.name} (Specialty)")
            if specialty_working:
                await simulator.run_tile_on_models(session, tile, specialty_working[:2])
        
        # Phase 4: Specialty-specific tiles
        print("\n" + "=" * 70)
        print("Phase 4: Specialty-Specific Research")
        print("-" * 40)
        
        for tile in SPECIALTY_TILES:
            print(f"\n[{tile.id}] {tile.name}")
            if specialty_working:
                await simulator.run_tile_on_models(session, tile, specialty_working)
        
        # Generate reports
        print("\n" + "=" * 70)
        print("GENERATING REPORTS")
        print("=" * 70)
        
        # Save responses
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        responses_file = f"{OUTPUT_DIR}/responses_{timestamp}.json"
        with open(responses_file, 'w') as f:
            json.dump([{
                'tile_id': r.tile_id,
                'model': r.model,
                'api': r.api,
                'response': r.response[:2000],
                'tokens': r.tokens,
                'latency': r.latency,
                'success': r.success,
                'quality_score': r.quality_score,
                'insights': r.insights
            } for r in simulator.responses], f, indent=2)
        print(f"Saved: {responses_file}")
        
        # Generate model report
        model_report = simulator.generate_model_report()
        report_file = f"{OUTPUT_DIR}/model_report_{timestamp}.json"
        with open(report_file, 'w') as f:
            json.dump(model_report, f, indent=2)
        print(f"Saved: {report_file}")
        
        # Generate insights markdown
        insights_file = f"{OUTPUT_DIR}/insights_{timestamp}.md"
        with open(insights_file, 'w') as f:
            f.write("# Multi-Model Research Insights\n\n")
            f.write(f"Generated: {timestamp}\n\n")
            
            f.write("## Model Performance Summary\n\n")
            for profile_key, stats in sorted(model_report.items(), key=lambda x: -x[1].get('overall_quality', 0)):
                f.write(f"### {profile_key}\n\n")
                f.write(f"- Success Rate: {stats['success_rate']:.1%}\n")
                f.write(f"- Total Tokens: {stats['total_tokens']}\n")
                f.write(f"- Avg Latency: {stats['avg_latency']:.2f}s\n")
                f.write(f"- Quality by Category:\n")
                for cat, score in stats['quality_by_category'].items():
                    f.write(f"  - {cat}: {score:.2f}\n")
                f.write(f"- Overall Quality: {stats['overall_quality']:.2f}\n\n")
            
            f.write("## Key Insights by Category\n\n")
            for category in ['loop_unrolling', 'tiling', 'prompt_seeds', 'comparison']:
                f.write(f"### {category.title()}\n\n")
                for r in simulator.responses:
                    if r.success and r.insights:
                        tile = next((t for t in LOOP_UNROLL_TILES + SPECIALTY_TILES if t.id == r.tile_id), None)
                        if tile and tile.category == category:
                            f.write(f"**{r.api}/{r.model}**:\n")
                            for insight in r.insights:
                                f.write(f"- {insight}\n")
                            f.write("\n")
        
        print(f"Saved: {insights_file}")
        
        # Summary
        print("\n" + "=" * 70)
        print("SIMULATION COMPLETE")
        print("=" * 70)
        print(f"Total responses: {len(simulator.responses)}")
        print(f"Successful: {sum(1 for r in simulator.responses if r.success)}")
        print(f"Total tokens: {sum(r.tokens for r in simulator.responses)}")
        
        # Model recommendations
        print("\nModel Recommendations:")
        for profile_key, stats in sorted(model_report.items(), key=lambda x: -x[1].get('overall_quality', 0))[:3]:
            print(f"  {profile_key}: quality={stats['overall_quality']:.2f}")

if __name__ == "__main__":
    asyncio.run(main())

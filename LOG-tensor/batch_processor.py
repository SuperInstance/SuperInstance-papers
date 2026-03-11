#!/usr/bin/env python3
"""
POLLN-RTT Batch Processor - Efficient batch execution with progress saving
"""

import asyncio
import aiohttp
import json
import os
import time
from datetime import datetime
from typing import List, Dict, Tuple
from dataclasses import dataclass
import random

# Configuration
DEEPSEEK_API_KEY = "your_api_key_here"
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
OUTPUT_DIR = "/home/z/my-project/download/polln_research/round3"

BATCH_SIZE = 8  # Concurrent requests
REQUEST_TIMEOUT = 120  # Seconds per request

@dataclass
class QueryResult:
    query: str
    category: str
    temperature: float
    response: str
    tokens: int
    success: bool

# All research queries organized by domain
ALL_QUERIES = {
    "mathematics": [
        "Prove that the set I_min = {S^(n), S^(n-1,1), S^(n-2,2), S^(n-2,1,1)} is minimal for universal approximation in permutation-equivariant networks. Show that removing any irrep breaks universality.",
        "Derive the explicit matrix form for the S^(n-2,1,1) representation of S_n. What is its dimension and how does it relate to the hook-length formula?",
        "Prove that Young's orthogonal form provides the most computationally efficient representation for neural network operations on permutations.",
        "Show the relationship between irreducible representations of S_n and the eigenvalues of the graph Laplacian on permutation space.",
        "Derive the Clebsch-Gordan coefficients for S_n tensor products relevant to neural network compositions.",
        "Prove that self-origin tensors T^[s]_{i,j,k} = T([s], i-j, k) achieve O(1) origin computation compared to O(n) for global coordinates.",
        "Show that self-origin tensors are closed under convolution operations. Derive the composition rule.",
        "Prove that the glitch detection formula G = 2·d_TV(α_expected, α_actual) has O(1) computational complexity in the tile embedding space.",
        "Derive the gradient of the glitch signal with respect to attention weights. How can this be used for learning?",
        "Show that self-origin tensors form a basis for all SE(3)-equivariant functions on point clouds.",
        "Prove convergence of the unified learning objective L = λ₁L_pred + λ₂L_need + λ₃L_glitch + λ₄L_mem with optimal λ schedules.",
        "Derive the sample complexity bound for learning permutation-equivariant functions with the minimal irrep set.",
        "Show that the need function N(s) = 𝟙[min_T d(T(s), s') > τ] defines a VC-learnable concept class.",
        "Prove that glitch-based learning accelerates convergence by a factor of O(log(n)) compared to gradient-only methods.",
        "Derive the optimal temperature schedule for exploration-exploitation in tile discovery.",
        "Prove that the minimal tile basis for 3D geometric patterns has cardinality at least 7 and at most 47 given our current discoveries.",
        "Show that tile induction via need satisfies the Church-Rosser property - all reduction sequences lead to the same normal form.",
        "Derive the information-theoretic lower bound for discovering new tiles from observation.",
        "Prove that self-organizing tiles satisfy a maximum entropy principle under constraints.",
        "Show that the tile grammar is context-free but not regular, enabling hierarchical pattern recognition.",
    ],
    "architecture": [
        "Design a permutation-equivariant transformer layer using the 4 minimal irreps. Show the forward pass computation.",
        "Derive the memory complexity of self-origin tensor operations. How does it scale with sequence length?",
        "Design an efficient GPU kernel for computing glitch signals in parallel across attention heads.",
        "Show how to implement tile embeddings as a differentiable dictionary learning problem.",
        "Design a recursive architecture where each layer discovers new tiles from residual patterns.",
        "Derive the attention formula that incorporates glitch signals as an additional term. How does this modify the softmax?",
        "Show that multi-head attention with different irreps per head achieves universal approximation with O(n²) parameters.",
        "Design a 'need-attention' mechanism that focuses computation on states with high need values.",
        "Prove that attention with self-origin position encodings is strictly more expressive than sinusoidal encodings.",
        "Derive the gradient flow through glitch-aware attention and show it avoids vanishing gradients.",
        "Design a differentiable memory bank for tiles that supports O(1) lookup and O(log n) insertion.",
        "Show how to implement episodic memory retrieval using self-origin tensor similarity.",
        "Derive the optimal memory capacity for a tile library as a function of task complexity.",
        "Design a forgetting mechanism for tiles that maximizes information retention under capacity constraints.",
        "Show how to implement associative recall using glitch patterns as keys.",
    ],
    "emergence": [
        "Prove that under the unified learning objective, tiles spontaneously organize into hierarchical structures.",
        "Show that the phase transition from random to structured tiles occurs at a critical learning rate λ_c.",
        "Derive the mean-field theory for tile population dynamics under need-based selection.",
        "Prove that self-organizing tiles achieve a Pareto-optimal trade-off between compression and expressiveness.",
        "Show that emergent tile grammars satisfy Zipf's law, enabling efficient communication.",
        "Analyze the conditions for tiles to form stable coalitions (composite patterns). What is the binding mechanism?",
        "Show that the tile ecosystem exhibits competitive exclusion - similar tiles merge or differentiate.",
        "Derive the conditions for chaotic vs stable dynamics in tile population evolution.",
        "Prove that diverse tile populations are more robust to distribution shift (portfolio effect).",
        "Show that tiles can spontaneously develop specialization (division of labor).",
        "Design a meta-learning objective that optimizes the tile discovery process itself.",
        "Show that learning to discover tiles is equivalent to learning an optimal grammar induction algorithm.",
        "Derive the bias-variance trade-off for tile-based few-shot learning.",
        "Prove that meta-learned tile discovery converges faster than random exploration.",
        "Design an architecture that can learn new tile discovery heuristics from experience.",
    ],
    "advanced": [
        "Explore the connection between S_n representations and quantum many-body wavefunctions. Can tiles be viewed as entangled states?",
        "Show that permutation-equivariant networks are natural architectures for quantum chemistry applications.",
        "Derive a quantum-inspired algorithm for tile superposition and interference.",
        "Explore whether the minimal irrep set corresponds to a complete set of quantum numbers.",
        "Design a quantum-classical hybrid algorithm for tile discovery.",
        "Derive the Fisher information metric on the manifold of tile probability distributions.",
        "Show that natural gradient descent on tile parameters avoids catastrophic forgetting.",
        "Prove that the KL divergence between tile distributions upper bounds task transfer error.",
        "Design a Riemannian optimization algorithm for tile learning that respects the manifold structure.",
        "Show that the information geometry of tile space is negatively curved, enabling efficient navigation.",
        "Extend tiles to represent causal patterns, not just statistical correlations.",
        "Design a causal discovery algorithm using tile-based conditional independence tests.",
        "Show how to infer intervention effects from tile pattern changes.",
        "Prove that causal tiles enable out-of-distribution generalization.",
        "Design a counterfactual reasoning module using tile manipulation.",
        "Explore whether glitch detection can be viewed as a form of self-awareness in the system.",
        "Design a meta-cognitive module that monitors and regulates the tile discovery process.",
        "Show that self-origin tensors provide a natural 'self-model' for the system.",
        "Explore the relationship between attention glitches and surprise in conscious processing.",
        "Design experiments to test whether the system exhibits metacognitive accuracy.",
    ],
    "applications": [
        "Apply POLLN-RTT to molecular conformer generation. Show how tiles represent torsional patterns.",
        "Design a tile-based molecular property prediction system that respects SE(3) equivariance.",
        "Show how tile discovery can identify pharmacophores automatically from molecular data.",
        "Apply to protein structure prediction, showing how tiles capture secondary structure motifs.",
        "Design a tile-based generative model for novel molecules with desired properties.",
        "Apply self-origin tensors to robot manipulation, showing how objects are represented relative to the gripper.",
        "Design a tile-based motion primitive library that generalizes across robot morphologies.",
        "Show how glitch detection can identify novel situations requiring human intervention.",
        "Apply to multi-robot coordination, using permutation equivariance for agent symmetry.",
        "Design a tile-based skill discovery system for lifelong robot learning.",
        "Explore whether linguistic structures can be represented as tiles in a shared geometric space.",
        "Apply POLLN-RTT to mathematical theorem proving, representing proof steps as tiles.",
        "Design a tile-based analogical reasoning system that operates on geometric representations.",
        "Show how glitch detection can identify logical inconsistencies in reasoning chains.",
        "Apply to code generation, representing program patterns as tiles.",
        "Design a tile-based system for automatic hypothesis generation from scientific data.",
        "Apply to experimental design, using need function to identify informative experiments.",
        "Show how tile discovery can automate the finding of conservation laws in physics data.",
        "Design a tile-based symbolic regression system that respects physical symmetries.",
        "Apply to climate modeling, representing weather patterns as tiles.",
    ]
}

async def call_deepseek(session: aiohttp.ClientSession, query: str, category: str, temp: float) -> QueryResult:
    """Make a single API call"""
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    system = f"""You are a world-class researcher on POLLN-RTT (Permutation-equivariant Online Learning with Localized Networks - Recursive Tile Theory).

Category: {category}

Key discoveries:
- 4 irreps suffice: I_min = {{S^(n), S^(n-1,1), S^(n-2,2), S^(n-2,1,1)}}
- Glitch = Total Variation Distance: G = 2·d_TV(α_expected, α_actual)
- Need function: N(s) = 𝟙[min_T d(T(s), s') > τ]
- Self-Origin Tensor: T^[s]_{{i,j,k}} = T([s], i-j, k)
- Unified Objective: L = λ₁L_pred + λ₂L_need + λ₃L_glitch + λ₄L_mem

Provide deep, rigorous, novel insights. Use formal mathematics where appropriate. Think step by step."""

    payload = {
        "model": "deepseek-reasoner",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": query}
        ],
        "max_tokens": 6000,
        "temperature": temp
    }
    
    try:
        async with session.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
        ) as response:
            if response.status == 200:
                data = await response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                tokens = data.get("usage", {}).get("total_tokens", 0)
                return QueryResult(query, category, temp, content, tokens, True)
            else:
                error = await response.text()
                return QueryResult(query, category, temp, f"Error {response.status}: {error[:200]}", 0, False)
    except Exception as e:
        return QueryResult(query, category, temp, f"Exception: {str(e)}", 0, False)

async def run_batch(session: aiohttp.ClientSession, queries: List[Tuple[str, str, float]]) -> List[QueryResult]:
    """Run a batch of queries concurrently"""
    tasks = [call_deepseek(session, q, c, t) for q, c, t in queries]
    results = await asyncio.gather(*tasks)
    return list(results)

def save_results(results: List[QueryResult], batch_num: int, total_tokens: int):
    """Save results to file"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{OUTPUT_DIR}/batch_{batch_num:03d}_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump([{
            'query': r.query,
            'category': r.category,
            'temperature': r.temperature,
            'response': r.response,
            'tokens': r.tokens,
            'success': r.success
        } for r in results], f, indent=2)
    
    print(f"Saved: {filename} (Tokens: {total_tokens})")

def generate_all_query_tasks() -> List[Tuple[str, str, float]]:
    """Generate all query tasks with varying temperatures"""
    tasks = []
    temperatures = [0.0, 0.3, 0.7, 1.0]
    
    for category, queries in ALL_QUERIES.items():
        for query in queries:
            for temp in temperatures:
                tasks.append((query, category, temp))
    
    return tasks

async def main():
    """Main entry point"""
    print("=" * 60)
    print("POLLN-RTT DeepSeek Batch Processor")
    print("=" * 60)
    
    # Generate all tasks
    all_tasks = generate_all_query_tasks()
    total_queries = len(all_tasks)
    
    print(f"Total queries: {total_queries}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"Estimated batches: {total_queries // BATCH_SIZE}")
    print("-" * 60)
    
    random.shuffle(all_tasks)  # Randomize order for diversity
    
    total_tokens = 0
    successful = 0
    failed = 0
    
    connector = aiohttp.TCPConnector(limit=BATCH_SIZE * 2)
    
    async with aiohttp.ClientSession(connector=connector) as session:
        batch_num = 0
        for i in range(0, total_queries, BATCH_SIZE):
            batch = all_tasks[i:i + BATCH_SIZE]
            batch_num += 1
            
            print(f"\nBatch {batch_num}/{(total_queries + BATCH_SIZE - 1) // BATCH_SIZE}")
            print(f"  Running {len(batch)} queries...")
            
            start_time = time.time()
            results = await run_batch(session, batch)
            elapsed = time.time() - start_time
            
            batch_tokens = sum(r.tokens for r in results)
            total_tokens += batch_tokens
            successful += sum(1 for r in results if r.success)
            failed += sum(1 for r in results if not r.success)
            
            print(f"  Completed in {elapsed:.1f}s")
            print(f"  Tokens: {batch_tokens}, Success: {sum(1 for r in results if r.success)}/{len(results)}")
            print(f"  Running total: {total_tokens} tokens, {successful} successful, {failed} failed")
            
            # Save every batch
            save_results(results, batch_num, total_tokens)
            
            # Small delay between batches
            await asyncio.sleep(1)
    
    # Final summary
    print("\n" + "=" * 60)
    print("BATCH PROCESSING COMPLETE")
    print("=" * 60)
    print(f"Total queries: {total_queries}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Total tokens: {total_tokens}")
    
    # Save final summary
    summary = {
        'total_queries': total_queries,
        'successful': successful,
        'failed': failed,
        'total_tokens': total_tokens,
        'timestamp': datetime.now().isoformat()
    }
    
    with open(f"{OUTPUT_DIR}/batch_summary.json", 'w') as f:
        json.dump(summary, f, indent=2)

if __name__ == "__main__":
    asyncio.run(main())

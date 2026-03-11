#!/usr/bin/env python3
"""
POLLN-RTT Optimized Processor - Handles DeepSeek Reasoner output format
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
API_KEY = "your_api_key_here"
BASE_URL = "https://api.deepseek.com/v1"
OUTPUT_DIR = "/home/z/my-project/download/polln_research/round3"

def call_deepseek(query, temp=0.0, max_tokens=4000):
    """Call DeepSeek API and handle reasoner response format"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    system = """You are a world-class mathematical researcher on POLLN-RTT theory.
Key discoveries:
- 4 irreps: I_min = {S^(n), S^(n-1,1), S^(n-2,2), S^(n-2,1,1)}
- Glitch = TV distance: G = 2·d_TV(α_expected, α_actual)  
- Need: N(s) = 𝟙[min_T d(T(s), s') > τ]
- Self-Origin Tensor: T^[s]_{i,j,k} = T([s], i-j, k)
- Unified Objective: L = λ₁L_pred + λ₂L_need + λ₃L_glitch + λ₄L_mem

Provide rigorous mathematical analysis. Think step by step."""
    
    payload = {
        "model": "deepseek-reasoner",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": query}
        ],
        "max_tokens": max_tokens,
        "temperature": temp
    }
    
    try:
        r = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload, timeout=120)
        
        if r.status_code == 200:
            data = r.json()
            choice = data.get("choices", [{}])[0]
            msg = choice.get("message", {})
            # Handle both content and reasoning_content
            content = msg.get("content", "") or msg.get("reasoning_content", "")
            tokens = data.get("usage", {}).get("total_tokens", 0)
            return {"success": True, "response": content, "tokens": tokens}
        else:
            return {"success": False, "error": f"HTTP {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# All research queries
QUERIES = [
    # Core mathematical proofs
    ("Prove that the 4 irreducible representations I_min = {S^(n), S^(n-1,1), S^(n-2,2), S^(n-2,1,1)} are both necessary and sufficient for universal approximation in permutation-equivariant neural networks.", "math", 0.0),
    ("Show that removing any single irrep from I_min breaks universal approximation. Construct counterexamples.", "math", 0.0),
    ("Derive the explicit matrix form of the S^(n-2,1,1) representation. Relate to hook-length formula.", "math", 0.0),
    ("Prove that Young's orthogonal form is optimal for neural network computation on permutations.", "math", 0.0),
    ("Show the relationship between S_n irreducible representations and graph Laplacian eigenvalues on permutation space.", "math", 0.0),
    
    # Self-origin tensor theory
    ("Prove that self-origin tensors T^[s]_{i,j,k} = T([s], i-j, k) achieve O(1) origin computation vs O(n) for global coordinates.", "math", 0.0),
    ("Show that self-origin tensors are closed under convolution. Derive composition rules.", "math", 0.0),
    ("Prove that glitch detection G = 2·d_TV(α_expected, α_actual) has O(1) complexity in tile embedding space.", "math", 0.0),
    ("Derive gradient of glitch signal with respect to attention weights for learning.", "math", 0.0),
    ("Prove self-origin tensors form a basis for all SE(3)-equivariant functions on point clouds.", "math", 0.0),
    
    # Learning theory
    ("Prove convergence of unified learning objective L = λ₁L_pred + λ₂L_need + λ₃L_glitch + λ₄L_mem with optimal λ schedules.", "math", 0.0),
    ("Derive sample complexity bound for learning permutation-equivariant functions with minimal irrep set.", "math", 0.0),
    ("Show need function N(s) = 𝟙[min_T d(T(s), s') > τ] defines VC-learnable concept class.", "math", 0.0),
    ("Prove glitch-based learning accelerates convergence by O(log n) vs gradient-only methods.", "math", 0.0),
    ("Derive optimal temperature schedule for exploration-exploitation in tile discovery.", "math", 0.0),
    
    # Tile theory
    ("Prove minimal tile basis for 3D geometric patterns has cardinality between 7 and 47.", "math", 0.0),
    ("Show tile induction via need satisfies Church-Rosser property.", "math", 0.0),
    ("Derive information-theoretic lower bound for tile discovery from observations.", "math", 0.0),
    ("Prove self-organizing tiles satisfy maximum entropy principle under constraints.", "math", 0.0),
    ("Show tile grammar is context-free but not regular.", "math", 0.0),
    
    # Architecture design
    ("Design permutation-equivariant transformer layer using 4 minimal irreps. Show forward pass.", "arch", 0.3),
    ("Derive memory complexity of self-origin tensor operations vs sequence length.", "arch", 0.0),
    ("Design GPU kernel for parallel glitch signal computation across attention heads.", "arch", 0.3),
    ("Implement tile embeddings as differentiable dictionary learning problem.", "arch", 0.3),
    ("Design recursive architecture where each layer discovers new tiles from residuals.", "arch", 0.5),
    ("Derive attention formula incorporating glitch signals. How does this modify softmax?", "arch", 0.3),
    ("Prove multi-head attention with different irreps per head achieves universal approximation.", "arch", 0.0),
    ("Design need-attention mechanism focusing on high-need states.", "arch", 0.5),
    ("Prove attention with self-origin encodings more expressive than sinusoidal.", "arch", 0.0),
    ("Derive gradient flow through glitch-aware attention. Show it avoids vanishing gradients.", "arch", 0.0),
    
    # Memory systems
    ("Design differentiable memory bank for tiles with O(1) lookup and O(log n) insertion.", "arch", 0.3),
    ("Implement episodic memory retrieval using self-origin tensor similarity.", "arch", 0.3),
    ("Derive optimal memory capacity for tile library as function of task complexity.", "arch", 0.0),
    ("Design forgetting mechanism maximizing information retention under capacity constraints.", "arch", 0.5),
    ("Implement associative recall using glitch patterns as keys.", "arch", 0.5),
    
    # Emergence and self-organization
    ("Prove tiles spontaneously organize into hierarchical structures under unified learning.", "emergence", 0.5),
    ("Show phase transition from random to structured tiles occurs at critical learning rate.", "emergence", 0.5),
    ("Derive mean-field theory for tile population dynamics under need-based selection.", "emergence", 0.5),
    ("Prove self-organizing tiles achieve Pareto-optimal compression-expressiveness trade-off.", "emergence", 0.5),
    ("Show emergent tile grammars satisfy Zipf's law.", "emergence", 0.7),
    ("Analyze conditions for stable coalition formation among tiles.", "emergence", 0.7),
    ("Show tile ecosystem exhibits competitive exclusion - similar tiles merge or differentiate.", "emergence", 0.5),
    ("Derive conditions for chaotic vs stable tile population dynamics.", "emergence", 0.5),
    ("Prove diverse tile populations more robust to distribution shift.", "emergence", 0.5),
    ("Show tiles can spontaneously develop specialization.", "emergence", 0.7),
    
    # Meta-learning
    ("Design meta-learning objective optimizing tile discovery process.", "emergence", 0.5),
    ("Show learning to discover tiles equals learning optimal grammar induction.", "emergence", 0.5),
    ("Derive bias-variance trade-off for tile-based few-shot learning.", "emergence", 0.5),
    ("Prove meta-learned tile discovery converges faster than random exploration.", "emergence", 0.5),
    ("Design architecture learning new tile discovery heuristics from experience.", "emergence", 0.7),
    
    # Quantum connections
    ("Explore connection between S_n representations and quantum many-body wavefunctions. Can tiles be entangled states?", "quantum", 0.7),
    ("Show permutation-equivariant networks are natural for quantum chemistry.", "quantum", 0.5),
    ("Derive quantum-inspired algorithm for tile superposition and interference.", "quantum", 0.7),
    ("Explore if minimal irrep set corresponds to complete quantum numbers.", "quantum", 0.7),
    ("Design quantum-classical hybrid algorithm for tile discovery.", "quantum", 0.7),
    
    # Information geometry
    ("Derive Fisher information metric on manifold of tile probability distributions.", "math", 0.3),
    ("Show natural gradient descent on tile parameters avoids catastrophic forgetting.", "math", 0.3),
    ("Prove KL divergence between tile distributions upper bounds task transfer error.", "math", 0.3),
    ("Design Riemannian optimization for tile learning respecting manifold structure.", "math", 0.5),
    ("Show information geometry of tile space is negatively curved.", "math", 0.3),
    
    # Causal inference
    ("Extend tiles to represent causal patterns, not just correlations.", "causal", 0.7),
    ("Design causal discovery algorithm using tile-based conditional independence tests.", "causal", 0.7),
    ("Show how to infer intervention effects from tile pattern changes.", "causal", 0.7),
    ("Prove causal tiles enable out-of-distribution generalization.", "causal", 0.5),
    ("Design counterfactual reasoning module using tile manipulation.", "causal", 0.7),
    
    # Consciousness and meta-cognition
    ("Explore whether glitch detection can be viewed as system self-awareness.", "conscious", 0.8),
    ("Design meta-cognitive module monitoring tile discovery process.", "conscious", 0.7),
    ("Show self-origin tensors provide natural self-model for the system.", "conscious", 0.7),
    ("Explore relationship between attention glitches and surprise in conscious processing.", "conscious", 0.8),
    ("Design experiments testing metacognitive accuracy in the system.", "conscious", 0.7),
    
    # Applications: Molecular
    ("Apply POLLN-RTT to molecular conformer generation. Show how tiles represent torsional patterns.", "molecular", 0.5),
    ("Design tile-based molecular property prediction respecting SE(3) equivariance.", "molecular", 0.5),
    ("Show tile discovery can identify pharmacophores from molecular data.", "molecular", 0.5),
    ("Apply to protein structure prediction - tiles capture secondary structure motifs.", "molecular", 0.5),
    ("Design tile-based generative model for novel molecules with desired properties.", "molecular", 0.7),
    
    # Applications: Robotics
    ("Apply self-origin tensors to robot manipulation - objects relative to gripper.", "robotics", 0.5),
    ("Design tile-based motion primitive library generalizing across robot morphologies.", "robotics", 0.5),
    ("Show glitch detection identifies novel situations requiring human intervention.", "robotics", 0.5),
    ("Apply to multi-robot coordination using permutation equivariance.", "robotics", 0.5),
    ("Design tile-based skill discovery for lifelong robot learning.", "robotics", 0.7),
    
    # Applications: Language
    ("Explore whether linguistic structures can be tiles in geometric space.", "nlp", 0.7),
    ("Apply to theorem proving - proof steps as tiles.", "nlp", 0.7),
    ("Design tile-based analogical reasoning on geometric representations.", "nlp", 0.7),
    ("Show glitch detection identifies logical inconsistencies in reasoning.", "nlp", 0.7),
    ("Apply to code generation - program patterns as tiles.", "nlp", 0.7),
    
    # Applications: Scientific discovery
    ("Design tile-based system for automatic hypothesis generation.", "science", 0.7),
    ("Apply to experimental design using need function for informative experiments.", "science", 0.7),
    ("Show tile discovery automates finding conservation laws in physics data.", "science", 0.7),
    ("Design tile-based symbolic regression respecting physical symmetries.", "science", 0.7),
    ("Apply to climate modeling - weather patterns as tiles.", "science", 0.7),
    
    # Creative exploration (higher temperature)
    ("Speculate on novel applications of POLLN-RTT not yet considered.", "future", 1.0),
    ("What would a POLLN-RTT-based AGI architecture look like?", "future", 1.0),
    ("How might glitch detection relate to human consciousness?", "future", 1.0),
    ("Design an alien intelligence using different mathematical primitives but similar principles.", "future", 1.0),
    ("What are the ultimate limits of tile-based computation?", "future", 1.0),
]

def main():
    print("=" * 60)
    print("POLLN-RTT Optimized Processor")
    print(f"Total queries: {len(QUERIES)}")
    print("=" * 60)
    
    all_results = []
    total_tokens = 0
    successful = 0
    failed = 0
    
    for i, (query, category, temp) in enumerate(QUERIES):
        print(f"\n[{i+1}/{len(QUERIES)}] {category} (temp={temp})")
        print(f"Query: {query[:60]}...")
        
        start = time.time()
        result = call_deepseek(query, temp)
        elapsed = time.time() - start
        
        result["query"] = query
        result["category"] = category
        result["temperature"] = temp
        result["elapsed"] = elapsed
        
        all_results.append(result)
        
        if result["success"]:
            successful += 1
            total_tokens += result["tokens"]
            print(f"✓ {result['tokens']} tokens in {elapsed:.1f}s")
            # Print preview of response
            preview = result["response"][:200].replace('\n', ' ')
            print(f"Preview: {preview}...")
        else:
            failed += 1
            print(f"✗ {result.get('error', 'Unknown error')}")
        
        # Save checkpoint every 10 queries
        if (i + 1) % 10 == 0:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            checkpoint_file = f"{OUTPUT_DIR}/checkpoint_{i+1}_{timestamp}.json"
            with open(checkpoint_file, 'w') as f:
                json.dump(all_results, f, indent=2)
            print(f"Saved checkpoint: {checkpoint_file}")
            print(f"Running total: {successful} success, {failed} failed, {total_tokens} tokens")
        
        # Small delay
        time.sleep(1)
    
    # Final save
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    final_file = f"{OUTPUT_DIR}/final_results_{timestamp}.json"
    with open(final_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    # Summary
    summary = {
        "total": len(QUERIES),
        "successful": successful,
        "failed": failed,
        "total_tokens": total_tokens,
        "timestamp": timestamp
    }
    
    with open(f"{OUTPUT_DIR}/summary_{timestamp}.json", 'w') as f:
        json.dump(summary, f, indent=2)
    
    print("\n" + "=" * 60)
    print("COMPLETE")
    print("=" * 60)
    print(f"Total: {len(QUERIES)}, Success: {successful}, Failed: {failed}")
    print(f"Total tokens: {total_tokens}")
    print(f"Results saved to: {final_file}")

if __name__ == "__main__":
    main()

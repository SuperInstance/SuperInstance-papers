#!/usr/bin/env python3
"""
DeepInfra Model Comparison - Sequential Version
"""

import requests
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any

OUTPUT_DIR = "/home/z/my-project/download/polln_research/round5"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# DeepInfra API Configuration
DEEPINFRA_API_KEY = "hwzojVZn1SRQJs7LCa0uNazVE0BgzVz2"
DEEPINFRA_URL = "https://api.deepinfra.com/v1/openai/chat/completions"

# Models to test
MODELS = [
    "meta-llama/Llama-2-70b-chat-hf",
    "mistralai/Mistral-7B-Instruct-v0.1",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "Qwen/Qwen2-7B-Instruct",
    "Qwen/Qwen2-72B-Instruct",
    "Phind/Phind-CodeLlama-34B-v2",
    "cognitivecomputations/dolphin-2.6-mixtral-8x7b"
]

# Research Questions
QUESTIONS = [
    ("q1", "What is the optimal tile size formula for L1 cache matrix multiplication? Derive mathematically. Include the relationship between cache size, element size, and cache line size in your derivation. Provide the final formula and explain each term."),
    ("q2", "How should Flash Attention be tiled for 8K context length? Derive optimal block sizes for the Q, K, V blocks considering memory hierarchy (SRAM, HBM). Include the memory access analysis and explain the tradeoffs between different block sizes."),
    ("q3", "What is the optimal register blocking strategy for Tensor Cores? Derive tile dimensions considering register file size, shared memory, and Tensor Core WMMA instructions. Include the analysis of occupancy and bank conflicts.")
]

SYSTEM_PROMPT = """You are an expert in high-performance computing, GPU optimization, and numerical algorithms. Provide thorough mathematical derivations with formal proofs where applicable. Include clear step-by-step mathematical reasoning, concrete formulas with explained terms, code examples in CUDA or pseudocode where relevant, and quantitative analysis with specific numbers. Be rigorous and precise in your derivations."""

def query_model(model: str, question: str) -> Dict:
    """Query a single model"""
    headers = {
        "Authorization": f"Bearer {DEEPINFRA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question}
        ],
        "max_tokens": 4000,
        "temperature": 0.1
    }
    
    try:
        start = time.time()
        resp = requests.post(DEEPINFRA_URL, headers=headers, json=payload, timeout=120)
        latency = time.time() - start
        
        if resp.status_code == 200:
            data = resp.json()
            return {
                "success": True,
                "response": data["choices"][0]["message"]["content"],
                "tokens": data.get("usage", {}).get("total_tokens", 0),
                "latency": latency
            }
        else:
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:100]}", "latency": latency}
    except Exception as e:
        return {"success": False, "error": str(e)[:100], "latency": 0}

def main():
    print("=" * 70)
    print("DEEPINFRA MODEL COMPARISON RESEARCH")
    print("=" * 70)
    
    results = {}
    
    for qid, question in QUESTIONS:
        print(f"\n{'='*70}")
        print(f"QUESTION {qid}")
        print(f"{'='*70}")
        
        results[qid] = {"question": question, "responses": {}}
        
        for model in MODELS:
            short_name = model.split("/")[-1]
            print(f"\n  Querying {short_name}...", end=" ", flush=True)
            
            result = query_model(model, question)
            results[qid]["responses"][short_name] = result
            
            if result["success"]:
                print(f"✓ {result['tokens']}tok, {result['latency']:.1f}s")
            else:
                print(f"✗ {result.get('error', 'Unknown error')[:40]}")
            
            time.sleep(0.5)  # Rate limiting
        
        # Save progress after each question
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        with open(f"{OUTPUT_DIR}/model_comparison_raw_{timestamp}.json", 'w') as f:
            json.dump(results, f, indent=2)
    
    print(f"\n{'='*70}")
    print("ALL QUERIES COMPLETE")
    print(f"{'='*70}")
    
    # Save final results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"{OUTPUT_DIR}/model_comparison_results_{timestamp}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to: {output_file}")
    
    return results

if __name__ == "__main__":
    results = main()

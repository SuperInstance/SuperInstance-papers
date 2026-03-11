#!/usr/bin/env python3
"""
POLLN-RTT Direct API Tester - Simple test with better error handling
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

def test_api():
    """Test the DeepSeek API directly"""
    print("Testing DeepSeek API connection...")
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Simple test query
    test_query = "What is 2 + 2? Answer briefly."
    
    payload = {
        "model": "deepseek-reasoner",
        "messages": [
            {"role": "user", "content": test_query}
        ],
        "max_tokens": 100,
        "temperature": 0.0
    }
    
    try:
        print("Sending request...")
        response = requests.post(
            f"{BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("Success!")
            print(f"Response: {json.dumps(data, indent=2)[:500]}")
            return True
        else:
            print(f"Error response: {response.text}")
            return False
            
    except Exception as e:
        print(f"Exception: {type(e).__name__}: {str(e)}")
        return False

def run_single_query(query, category, temp=0.0):
    """Run a single query and return the result"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    system = """You are a world-class researcher on POLLN-RTT theory.
Key discoveries:
- 4 irreps: I_min = {S^(n), S^(n-1,1), S^(n-2,2), S^(n-2,1,1)}
- Glitch = TV distance: G = 2·d_TV(α_expected, α_actual)  
- Need: N(s) = 𝟙[min_T d(T(s), s') > τ]
- Self-Origin Tensor: T^[s]_{i,j,k} = T([s], i-j, k)

Provide rigorous mathematical insights."""
    
    payload = {
        "model": "deepseek-reasoner",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": query}
        ],
        "max_tokens": 5000,
        "temperature": temp
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=120
        )
        
        if response.status_code == 200:
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            tokens = data.get("usage", {}).get("total_tokens", 0)
            return {"success": True, "response": content, "tokens": tokens}
        else:
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text[:200]}"}
            
    except Exception as e:
        return {"success": False, "error": f"{type(e).__name__}: {str(e)}"}

def run_batch_sequentially(queries, batch_num):
    """Run queries sequentially to avoid rate limits"""
    results = []
    total_tokens = 0
    
    print(f"\nBatch {batch_num}: {len(queries)} queries")
    print("-" * 40)
    
    for i, (query, category, temp) in enumerate(queries):
        print(f"  [{i+1}/{len(queries)}] {category} (temp={temp})...")
        
        result = run_single_query(query, category, temp)
        
        results.append({
            "query": query,
            "category": category,
            "temperature": temp,
            **result
        })
        
        if result["success"]:
            total_tokens += result["tokens"]
            print(f"    ✓ {result['tokens']} tokens")
        else:
            print(f"    ✗ {result.get('error', 'Unknown error')}")
        
        # Small delay to avoid rate limits
        time.sleep(2)
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{OUTPUT_DIR}/sequential_batch_{batch_num:03d}_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nSaved: {filename}")
    print(f"Total tokens: {total_tokens}")
    
    return results, total_tokens

def main():
    """Main entry point"""
    print("=" * 60)
    print("POLLN-RTT Sequential Batch Processor")
    print("=" * 60)
    
    # Test API first
    if not test_api():
        print("\nAPI test failed. Check API key and connectivity.")
        return
    
    print("\n" + "=" * 60)
    print("API connection successful. Starting batch processing...")
    print("=" * 60)
    
    # Define queries
    all_queries = [
        # Mathematics
        ("Prove that the set I_min = {S^(n), S^(n-1,1), S^(n-2,2), S^(n-2,1,1)} is minimal for universal approximation in permutation-equivariant networks.", "mathematics", 0.0),
        ("Derive the explicit matrix form for the S^(n-2,1,1) representation of S_n.", "mathematics", 0.0),
        ("Prove that self-origin tensors achieve O(1) origin computation.", "mathematics", 0.0),
        ("Derive the gradient of glitch signal with respect to attention weights.", "mathematics", 0.0),
        ("Prove convergence of unified learning objective with optimal lambda schedules.", "mathematics", 0.0),
        
        # Architecture  
        ("Design a permutation-equivariant transformer using 4 minimal irreps.", "architecture", 0.3),
        ("Design efficient GPU kernel for computing glitch signals.", "architecture", 0.3),
        ("Design differentiable memory bank for tiles with O(1) lookup.", "architecture", 0.3),
        ("Design need-attention mechanism for high-need states.", "architecture", 0.5),
        ("Derive memory complexity of self-origin tensor operations.", "architecture", 0.3),
        
        # Emergence
        ("Prove tiles spontaneously organize into hierarchical structures.", "emergence", 0.5),
        ("Derive mean-field theory for tile population dynamics.", "emergence", 0.5),
        ("Prove self-organizing tiles achieve Pareto-optimal compression.", "emergence", 0.5),
        ("Analyze conditions for stable tile coalition formation.", "emergence", 0.7),
        ("Prove tile diversity increases robustness to distribution shift.", "emergence", 0.5),
        
        # Advanced
        ("Explore connection between S_n irreps and quantum wavefunctions.", "advanced", 0.7),
        ("Derive Fisher information metric on tile probability manifolds.", "advanced", 0.5),
        ("Design causal discovery algorithm using tile-based tests.", "advanced", 0.7),
        ("Can glitch detection be viewed as system self-awareness?", "advanced", 0.8),
        ("Design experiments to test metacognitive accuracy in the system.", "advanced", 0.7),
        
        # Applications
        ("Apply POLLN-RTT to molecular conformer generation.", "applications", 0.5),
        ("Design tile-based motion primitive library for robots.", "applications", 0.5),
        ("Apply self-origin tensors to multi-robot coordination.", "applications", 0.5),
        ("Design tile-based analogical reasoning system.", "applications", 0.7),
        ("Apply to climate modeling with weather pattern tiles.", "applications", 0.5),
        
        # More mathematics
        ("Show relationship between S_n irreps and graph Laplacian eigenvalues.", "mathematics", 0.3),
        ("Derive Clebsch-Gordan coefficients for S_n tensor products.", "mathematics", 0.3),
        ("Prove tile induction satisfies Church-Rosser property.", "mathematics", 0.0),
        ("Show tile grammar is context-free but not regular.", "mathematics", 0.3),
        ("Derive sample complexity for permutation-equivariant learning.", "mathematics", 0.0),
        
        # More architecture
        ("Prove attention with self-origin encodings beats sinusoidal.", "architecture", 0.3),
        ("Design forgetting mechanism for tiles under capacity limits.", "architecture", 0.5),
        ("Implement associative recall using glitch patterns.", "architecture", 0.5),
        ("Design recursive architecture for tile discovery.", "architecture", 0.5),
        ("Prove glitch-aware attention avoids vanishing gradients.", "architecture", 0.3),
    ]
    
    # Run in batches of 5
    batch_size = 5
    all_results = []
    total_tokens = 0
    
    for i in range(0, len(all_queries), batch_size):
        batch = all_queries[i:i+batch_size]
        batch_num = i // batch_size + 1
        
        results, tokens = run_batch_sequentially(batch, batch_num)
        all_results.extend(results)
        total_tokens += tokens
        
        print(f"\nCumulative: {len(all_results)} queries, {total_tokens} tokens")
        
        # Longer delay between batches
        if i + batch_size < len(all_queries):
            print("Waiting 5 seconds before next batch...")
            time.sleep(5)
    
    # Final summary
    print("\n" + "=" * 60)
    print("PROCESSING COMPLETE")
    print("=" * 60)
    successful = sum(1 for r in all_results if r.get("success", False))
    print(f"Total: {len(all_results)}, Success: {successful}, Failed: {len(all_results) - successful}")
    print(f"Total tokens: {total_tokens}")
    
    # Save final summary
    summary = {
        "total_queries": len(all_results),
        "successful": successful,
        "failed": len(all_results) - successful,
        "total_tokens": total_tokens,
        "timestamp": datetime.now().isoformat()
    }
    
    with open(f"{OUTPUT_DIR}/sequential_summary.json", 'w') as f:
        json.dump(summary, f, indent=2)
    
    # Extract and save insights
    insights = []
    for r in all_results:
        if r.get("success") and "response" in r:
            insights.append({
                "category": r["category"],
                "query": r["query"],
                "response": r["response"][:1000]  # Truncate for readability
            })
    
    with open(f"{OUTPUT_DIR}/sequential_insights.json", 'w') as f:
        json.dump(insights, f, indent=2)

if __name__ == "__main__":
    main()

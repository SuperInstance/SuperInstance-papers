#!/usr/bin/env python3
"""
Model Comparison: DeepSeek vs DeepInfra (Qwen)
Incremental comparison with saved results
"""

import requests
import json
import time
import os
from datetime import datetime

# API Keys
DEEPSEEK_API_KEY = "your_api_key_here"
DEEPINFRA_API_KEY = "hwzojVZn1SRQJs7LCa0uNazVE0BgzVz2"

# API Endpoints
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPINFRA_URL = "https://api.deepinfra.com/v1/openai/chat/completions"

RESULTS_FILE = "/home/z/my-project/download/polln_research/round5/model_comparison/raw_results.json"

def load_results():
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, 'r') as f:
            return json.load(f)
    return {"metadata": {"timestamp": datetime.now().isoformat()}, "comparisons": {}}

def save_results(results):
    with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

def call_deepseek(prompt, temperature=0.7, max_tokens=2000):
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek-reasoner",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    try:
        start = time.time()
        response = requests.post(DEEPSEEK_URL, headers=headers, json=payload, timeout=120)
        elapsed = time.time() - start
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "content": data["choices"][0]["message"]["content"],
                "reasoning_content": data["choices"][0]["message"].get("reasoning_content", "")[:500],
                "tokens_used": data.get("usage", {}),
                "response_time": round(elapsed, 2)
            }
        return {"success": False, "error": response.text[:200]}
    except Exception as e:
        return {"success": False, "error": str(e)[:200]}

def call_deepinfra(prompt, temperature=0.7, max_tokens=2000):
    headers = {
        "Authorization": f"Bearer {DEEPINFRA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "Qwen/Qwen2.5-72B-Instruct",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    try:
        start = time.time()
        response = requests.post(DEEPINFRA_URL, headers=headers, json=payload, timeout=120)
        elapsed = time.time() - start
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "model": "Qwen/Qwen2.5-72B-Instruct",
                "content": data["choices"][0]["message"]["content"],
                "tokens_used": data.get("usage", {}),
                "response_time": round(elapsed, 2)
            }
        return {"success": False, "error": response.text[:200]}
    except Exception as e:
        return {"success": False, "error": str(e)[:200]}

def run_single_comparison(name, prompt, temp=0.7):
    """Run a single comparison and save"""
    results = load_results()
    
    if name in results["comparisons"]:
        print(f"  {name} already exists, skipping...")
        return results["comparisons"][name]
    
    print(f"  Running {name}...")
    
    deepseek_result = call_deepseek(prompt, temp)
    print(f"    DeepSeek: {'success' if deepseek_result['success'] else 'failed'} ({deepseek_result.get('response_time', 0)}s)")
    
    deepinfra_result = call_deepinfra(prompt, temp)
    print(f"    DeepInfra: {'success' if deepinfra_result['success'] else 'failed'} ({deepinfra_result.get('response_time', 0)}s)")
    
    comparison = {
        "prompt": prompt,
        "temperature": temp,
        "deepseek": deepseek_result,
        "deepinfra": deepinfra_result
    }
    
    results["comparisons"][name] = comparison
    save_results(results)
    
    return comparison

# ============================================================================
# COMPREHENSIVE TEST PROMPTS
# ============================================================================

PROMPTS = {
    # 1. MATHEMATICAL REASONING
    "math_induction": """Prove that for any positive integer n, the sum of the first n odd numbers equals n².
Provide a complete proof using mathematical induction, and also give an intuitive geometric explanation.""",

    "math_golden_ratio": """Derive the relationship between the golden ratio φ = (1+√5)/2 and the Fibonacci sequence.
Show how lim(n→∞) F(n+1)/F(n) = φ. Provide rigorous reasoning.""",

    "math_error_detection": """Consider this 'proof' that 1 = 2:
Let a = b
Multiply both sides by a: a² = ab
Subtract b² from both sides: a² - b² = ab - b²
Factor: (a+b)(a-b) = b(a-b)
Divide both sides by (a-b): a + b = b
Since a = b: 2b = b
Divide by b: 2 = 1
Identify ALL errors in this proof and explain why each is invalid.""",

    # 2. CREATIVE SYNTHESIS
    "creative_quantum_jazz": """Create an analogy between quantum mechanics and jazz improvisation.
Explore at least 5 parallel concepts. For each:
- Explain the quantum mechanics concept
- Explain the jazz concept
- Describe how they mirror each other""",

    "creative_philosophy": """Invent a new philosophical framework that synthesizes:
- Buddhist impermanence (anicca)
- Heraclitus's idea that everything flows
- Modern chaos theory
- Digital information theory
Name this framework and describe its core axioms.""",

    "creative_consciousness_city": """Develop an extended metaphor comparing consciousness to a city.
Explore at least 5 aspects (infrastructure, neighborhoods, traffic, governance, architecture).
For each, describe the city element and its consciousness parallel.""",

    # 3. CODE GENERATION
    "code_algorithm": """Design an algorithm to find all pairs of documents with Jaccard similarity > 0.8
in a corpus of millions of documents. Provide:
1. High-level algorithmic approach
2. Python implementation
3. Time and space complexity analysis""",

    "code_bugs": """Find all bugs and issues in this Python code:
def calculate_statistics(data):
    mean = sum(data) / len(data)
    variance = sum((x - mean) ** 2 for x in data) / len(data)
    std_dev = variance ** 0.5
    sorted_data = sorted(data)
    n = len(sorted_data)
    median = sorted_data[n // 2]
    mode = max(set(data), key=data.count)
    return {'mean': mean, 'variance': variance, 'std_dev': std_dev, 'median': median, 'mode': mode}
List at least 5 issues and provide corrected code.""",

    "code_optimization": """Optimize this recursive Fibonacci function and show progression from naive to optimal:
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)
Implement memoization and discuss time complexity improvements.""",

    # 4. MULTI-LANGUAGE
    "language_translation": """Translate this passage into Chinese and Japanese:
"The old lighthouse keeper had seen storms that would make sailors weep, yet he found comfort in the rhythmic pulse of the beacon."
For each translation, explain key challenges and adaptations.""",

    "language_wabi_sabi": """Explain the concept of wabi-sabi (侘寂) in Japanese aesthetics.
Compare it with similar concepts in Chinese and Korean aesthetics.
What is uniquely Japanese about wabi-sabi?""",

    "language_idioms": """Translate these English idioms into Chinese and Japanese:
1. Break a leg
2. Let the cat out of the bag
3. Bite the bullet
For each, provide the translation and cultural context.""",

    # 5. TEMPERATURE VARIATION
    "temp_poem": """Write a short poem about artificial intelligence and consciousness. Be creative and philosophical."""
}

def main():
    print("=" * 60)
    print("MODEL COMPARISON: DeepSeek vs DeepInfra (Qwen)")
    print("=" * 60)
    
    # Run all comparisons
    for name, prompt in PROMPTS.items():
        if name.startswith("temp_"):
            continue
        print(f"\n[{name}]")
        run_single_comparison(name, prompt, temp=0.7)
        time.sleep(0.5)
    
    # Temperature variation tests
    print("\n[temperature_tests]")
    for temp in [0.3, 0.7, 1.0]:
        print(f"\n  Temperature {temp}:")
        run_single_comparison(f"temp_poem_{temp}", PROMPTS["temp_poem"], temp)
        time.sleep(0.5)
    
    print("\n" + "=" * 60)
    print("All comparisons completed!")
    print(f"Results saved to: {RESULTS_FILE}")

if __name__ == "__main__":
    main()

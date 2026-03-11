#!/usr/bin/env python3
"""
Model Comparison: DeepSeek vs GLM vs Moonshot
Comprehensive comparison across multiple reasoning dimensions
"""

import requests
import json
import time
import os
from datetime import datetime

# API Keys
DEEPSEEK_API_KEY = "your_api_key_here"
DEEPINFRA_API_KEY = "hwzojVZn1SRQJs7LCa0uNazVE0BgzVz2"
MOONSHOT_API_KEY = "your_api_key_here"

# API Endpoints
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPINFRA_URL = "https://api.deepinfra.com/v1/openai/chat/completions"
MOONSHOT_URL = "https://api.moonshot.cn/v1/chat/completions"

# Results storage
results = {
    "metadata": {
        "timestamp": datetime.now().isoformat(),
        "models_tested": ["deepseek-reasoner", "deepinfra-glm", "moonshot-v1"],
        "temperature_variations": [0.3, 0.7, 1.0]
    },
    "comparisons": {}
}

def call_deepseek(prompt, temperature=0.7, max_tokens=4000):
    """Call DeepSeek API with reasoning model"""
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
                "reasoning_content": data["choices"][0]["message"].get("reasoning_content", ""),
                "tokens_used": data.get("usage", {}),
                "response_time": elapsed,
                "status_code": response.status_code
            }
        else:
            return {"success": False, "error": response.text, "status_code": response.status_code}
    except Exception as e:
        return {"success": False, "error": str(e)}

def call_deepinfra(prompt, temperature=0.7, max_tokens=4000):
    """Call DeepInfra API (GLM models)"""
    headers = {
        "Authorization": f"Bearer {DEEPINFRA_API_KEY}",
        "Content-Type": "application/json"
    }
    # Try different GLM models available on DeepInfra
    models_to_try = ["google/gemma-2-27b-it", "meta-llama/Llama-3.1-70B-Instruct", "Qwen/Qwen2.5-72B-Instruct"]
    
    for model in models_to_try:
        payload = {
            "model": model,
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
                    "model_used": model,
                    "content": data["choices"][0]["message"]["content"],
                    "tokens_used": data.get("usage", {}),
                    "response_time": elapsed,
                    "status_code": response.status_code
                }
        except Exception as e:
            continue
    
    return {"success": False, "error": "All DeepInfra models failed"}

def call_moonshot(prompt, temperature=0.7, max_tokens=4000):
    """Call Moonshot API"""
    headers = {
        "Authorization": f"Bearer {MOONSHOT_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "moonshot-v1-128k",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    try:
        start = time.time()
        response = requests.post(MOONSHOT_URL, headers=headers, json=payload, timeout=120)
        elapsed = time.time() - start
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "content": data["choices"][0]["message"]["content"],
                "tokens_used": data.get("usage", {}),
                "response_time": elapsed,
                "status_code": response.status_code
            }
        else:
            return {"success": False, "error": response.text, "status_code": response.status_code}
    except Exception as e:
        return {"success": False, "error": str(e)}

def run_comparison(name, prompt, temperatures=[0.7]):
    """Run comparison across all models"""
    comparison = {
        "prompt": prompt,
        "temperatures": {}
    }
    
    for temp in temperatures:
        comparison["temperatures"][str(temp)] = {
            "deepseek": call_deepseek(prompt, temp),
            "deepinfra": call_deepinfra(prompt, temp),
            "moonshot": call_moonshot(prompt, temp)
        }
        print(f"  Completed temperature {temp} for {name}")
        time.sleep(1)  # Rate limiting
    
    results["comparisons"][name] = comparison
    return comparison

# ============================================================================
# TEST PROMPTS
# ============================================================================

# 1. MATHEMATICAL REASONING
MATH_PROMPTS = {
    "complex_proof": """Prove that for any positive integer n, the sum of the first n odd numbers equals n². 
Provide a complete proof using mathematical induction, and also give an intuitive geometric explanation.
Then extend this to find a formula for the sum of the first n even numbers.""",

    "novel_equation": """Derive the relationship between the golden ratio φ = (1+√5)/2 and the Fibonacci sequence.
Show how lim(n→∞) F(n+1)/F(n) = φ, and prove this rigorously.
Then explore: what happens if we start the Fibonacci sequence with different initial values?""",

    "error_detection": """Consider this 'proof' that 1 = 2:

Let a = b
Multiply both sides by a: a² = ab
Subtract b² from both sides: a² - b² = ab - b²
Factor: (a+b)(a-b) = b(a-b)
Divide both sides by (a-b): a + b = b
Since a = b: 2b = b
Divide by b: 2 = 1

Identify ALL errors in this proof, explain why each is invalid, and discuss the deeper mathematical principles involved."""
}

# 2. CREATIVE SYNTHESIS
CREATIVE_PROMPTS = {
    "cross_domain": """Create an unexpected analogy between quantum mechanics and jazz improvisation.
Explore at least 5 parallel concepts, and for each:
- Explain the quantum mechanics concept
- Explain the jazz concept
- Describe how they mirror each other
- Suggest what this analogy might teach us about both fields""",

    "novel_idea": """Invent a new philosophical framework that synthesizes:
- Buddhist impermanence (anicca)
- Heraclitus's "everything flows"
- Modern chaos theory
- Digital information theory

Name this framework, describe its core axioms, and explain how it would approach the question: What is the self?""",

    "metaphor_development": """Develop an extended metaphor comparing consciousness to a city.
Explore at least 7 aspects: infrastructure, neighborhoods, traffic, governance, architecture, 
history/preservation, and growth/development. For each, describe:
- The city element
- Its consciousness parallel
- What this reveals about conscious experience
- A testable prediction this metaphor suggests"""
}

# 3. CODE GENERATION
CODE_PROMPTS = {
    "algorithm_design": """Design an algorithm to solve this problem efficiently:

Given a large text corpus (millions of documents), find all pairs of documents that have 
Jaccard similarity > 0.8. The solution should scale horizontally and handle incremental updates.

Provide:
1. A high-level algorithmic approach
2. Python implementation with comments
3. Time and space complexity analysis
4. Optimization strategies for different data distributions""",

    "bug_finding": """Find all bugs, potential issues, and improvements in this code:

```python
def calculate_statistics(data):
    mean = sum(data) / len(data)
    variance = sum((x - mean) ** 2 for x in data) / len(data)
    std_dev = variance ** 0.5
    
    sorted_data = sorted(data)
    n = len(sorted_data)
    median = sorted_data[n // 2]
    
    mode = max(set(data), key=data.count)
    
    return {
        'mean': mean,
        'variance': variance,
        'std_dev': std_dev,
        'median': median,
        'mode': mode
    }

def process_dataset(filename):
    with open(filename, 'r') as f:
        data = [float(line.strip()) for line in f]
    
    stats = calculate_statistics(data)
    outliers = [x for x in data if abs(x - stats['mean']) > 3 * stats['std_dev']]
    
    return stats, outliers
```

Identify at least 5 issues and provide corrected code.""",

    "optimization": """Optimize this recursive Fibonacci function. Show the progression from naive 
to optimal, explaining each optimization technique and its impact:

```python
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)
```

Implement and compare:
1. Memoization
2. Bottom-up dynamic programming
3. Matrix exponentiation
4. Closed-form (Binet's formula)
5. Fast doubling

Include performance benchmarks and discuss when each approach is appropriate."""
}

# 4. MULTI-LANGUAGE TASKS
LANGUAGE_PROMPTS = {
    "translation_quality": """Translate this passage into Chinese, Japanese, and Korean, then back to English:

"The old lighthouse keeper had seen storms that would make sailors weep, yet he found 
comfort in the rhythmic pulse of the beacon. It was his heartbeat now, this sweep of light 
across dark waters, each revolution a promise kept to ships he would never know."

For each language, explain:
1. Key translation challenges
2. Cultural adaptations made
3. Loss of meaning (inevitable)
4. Unique expression possibilities""",

    "cultural_nuance": """Explain the concept of "wabi-sabi" (侘寂) in Japanese aesthetics.
Compare it with similar concepts in:
- Chinese aesthetics (can any concept be compared?)
- Korean aesthetics
- Western Romanticism
- Modern minimalism

What is uniquely Japanese about wabi-sabi? What can other cultures learn from it?""",

    "idiomatic": """Translate these idioms and explain their cultural origins:

English idioms:
1. "Break a leg"
2. "Let the cat out of the bag"
3. "Bite the bullet"
4. "Spill the beans"
5. "Cost an arm and a leg"

For each, provide:
- Literal meaning
- Actual meaning
- Origin story
- Equivalent idioms in Chinese, Japanese, Korean, and Spanish
- What these equivalents reveal about each culture"""
}

def main():
    print("=" * 60)
    print("MODEL COMPARISON: DeepSeek vs DeepInfra vs Moonshot")
    print("=" * 60)
    
    # 1. Mathematical Reasoning
    print("\n[1/4] Mathematical Reasoning Tests...")
    for name, prompt in MATH_PROMPTS.items():
        print(f"  Running: {name}")
        run_comparison(f"math_{name}", prompt)
    
    # 2. Creative Synthesis
    print("\n[2/4] Creative Synthesis Tests...")
    for name, prompt in CREATIVE_PROMPTS.items():
        print(f"  Running: {name}")
        run_comparison(f"creative_{name}", prompt)
    
    # 3. Code Generation
    print("\n[3/4] Code Generation Tests...")
    for name, prompt in CODE_PROMPTS.items():
        print(f"  Running: {name}")
        run_comparison(f"code_{name}", prompt)
    
    # 4. Multi-Language Tasks
    print("\n[4/4] Multi-Language Tests...")
    for name, prompt in LANGUAGE_PROMPTS.items():
        print(f"  Running: {name}")
        run_comparison(f"language_{name}", prompt)
    
    # 5. Temperature Variation Tests (using selected prompts)
    print("\n[5/5] Temperature Variation Tests...")
    temp_prompt = "Write a short poem about artificial intelligence and consciousness. Be creative and philosophical."
    run_comparison("temperature_test", temp_prompt, temperatures=[0.3, 0.7, 1.0])
    
    # Save results
    output_path = "/home/z/my-project/download/polln_research/round5/model_comparison/raw_results.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\nResults saved to: {output_path}")
    return results

if __name__ == "__main__":
    main()

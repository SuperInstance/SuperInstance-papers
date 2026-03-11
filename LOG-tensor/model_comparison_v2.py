#!/usr/bin/env python3
"""
Model Comparison: DeepSeek vs GLM vs Moonshot
Comprehensive comparison across multiple reasoning dimensions - PARTIAL TEST
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
        "models_tested": ["deepseek-reasoner", "deepinfra", "moonshot-v1"],
        "temperature_variations": [0.3, 0.7, 1.0]
    },
    "comparisons": {}
}

def call_deepseek(prompt, temperature=0.7, max_tokens=2000):
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
        response = requests.post(DEEPSEEK_URL, headers=headers, json=payload, timeout=90)
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

def call_deepinfra(prompt, temperature=0.7, max_tokens=2000):
    """Call DeepInfra API"""
    headers = {
        "Authorization": f"Bearer {DEEPINFRA_API_KEY}",
        "Content-Type": "application/json"
    }
    models_to_try = ["Qwen/Qwen2.5-72B-Instruct"]
    
    for model in models_to_try:
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        try:
            start = time.time()
            response = requests.post(DEEPINFRA_URL, headers=headers, json=payload, timeout=90)
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

def call_moonshot(prompt, temperature=0.7, max_tokens=2000):
    """Call Moonshot API"""
    headers = {
        "Authorization": f"Bearer {MOONSHOT_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "moonshot-v1-8k",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    try:
        start = time.time()
        response = requests.post(MOONSHOT_URL, headers=headers, json=payload, timeout=90)
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
        temp_results = {}
        
        print(f"    Calling DeepSeek at temp {temp}...")
        temp_results["deepseek"] = call_deepseek(prompt, temp)
        
        print(f"    Calling DeepInfra at temp {temp}...")
        temp_results["deepinfra"] = call_deepinfra(prompt, temp)
        
        print(f"    Calling Moonshot at temp {temp}...")
        temp_results["moonshot"] = call_moonshot(prompt, temp)
        
        comparison["temperatures"][str(temp)] = temp_results
        print(f"  Completed temperature {temp} for {name}")
        time.sleep(0.5)
    
    results["comparisons"][name] = comparison
    return comparison

# TEST PROMPTS - Shorter versions
TEST_PROMPTS = {
    "math_proof": """Prove that for any positive integer n, the sum of the first n odd numbers equals n². 
Provide a proof using mathematical induction.""",

    "creative_analogy": """Create an analogy between quantum mechanics and jazz improvisation.
Explore 3 parallel concepts between them.""",

    "code_bugs": """Find bugs in this Python code:
def calculate_statistics(data):
    mean = sum(data) / len(data)
    sorted_data = sorted(data)
    n = len(sorted_data)
    median = sorted_data[n // 2]
    mode = max(set(data), key=data.count)
    return {'mean': mean, 'median': median, 'mode': mode}
List at least 3 bugs or issues.""",

    "translation": """Translate this into Chinese and explain key challenges:
The old lighthouse keeper found comfort in the rhythmic pulse of the beacon.""",

    "temp_creative": """Write a short poem about artificial intelligence and consciousness."""
}

def main():
    print("=" * 60)
    print("MODEL COMPARISON: DeepSeek vs DeepInfra vs Moonshot")
    print("=" * 60)
    
    # Run key comparisons
    tests = [
        ("math_proof", TEST_PROMPTS["math_proof"], [0.7]),
        ("creative_analogy", TEST_PROMPTS["creative_analogy"], [0.7]),
        ("code_bugs", TEST_PROMPTS["code_bugs"], [0.7]),
        ("translation", TEST_PROMPTS["translation"], [0.7]),
        ("temp_creative", TEST_PROMPTS["temp_creative"], [0.3, 0.7, 1.0]),
    ]
    
    for name, prompt, temps in tests:
        print(f"\nRunning: {name}")
        run_comparison(name, prompt, temps)
    
    # Save results
    output_path = "/home/z/my-project/download/polln_research/round5/model_comparison/raw_results.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\nResults saved to: {output_path}")
    return results

if __name__ == "__main__":
    main()

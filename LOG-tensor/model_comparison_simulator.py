#!/usr/bin/env python3
"""
DeepInfra Model Comparison Research
Testing 7 different models on the same loop tiling questions
"""

import asyncio
import aiohttp
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import dataclass, field

OUTPUT_DIR = "/home/z/my-project/download/polln_research/round5"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# DeepInfra API Configuration
DEEPINFRA_API_KEY = "hwzojVZn1SRQJs7LCa0uNazVE0BgzVz2"
DEEPINFRA_URL = "https://api.deepinfra.com/v1/openai/chat/completions"

# Models to test on DeepInfra
MODELS_TO_TEST = [
    "meta-llama/Llama-2-70b-chat-hf",
    "mistralai/Mistral-7B-Instruct-v0.1",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "Qwen/Qwen2-7B-Instruct",
    "Qwen/Qwen2-72B-Instruct",
    "Phind/Phind-CodeLlama-34B-v2",
    "cognitivecomputations/dolphin-2.6-mixtral-8x7b"
]

# Research Questions
RESEARCH_QUESTIONS = [
    {
        "id": "q1",
        "question": "What is the optimal tile size formula for L1 cache matrix multiplication? Derive mathematically. Include the relationship between cache size, element size, and cache line size in your derivation. Provide the final formula and explain each term."
    },
    {
        "id": "q2",
        "question": "How should Flash Attention be tiled for 8K context length? Derive optimal block sizes for the Q, K, V blocks considering memory hierarchy (SRAM, HBM). Include the memory access analysis and explain the tradeoffs between different block sizes."
    },
    {
        "id": "q3",
        "question": "What is the optimal register blocking strategy for Tensor Cores? Derive tile dimensions considering register file size, shared memory, and Tensor Core WMMA instructions. Include the analysis of occupancy and bank conflicts."
    }
]

SYSTEM_PROMPT = """You are an expert in high-performance computing, GPU optimization, and numerical algorithms. Your specialty includes:

1. Loop Tiling and Cache Optimization - Mathematical derivation of optimal tile sizes
2. Flash Attention and Memory Hierarchy - SRAM/HBM utilization, block size optimization
3. Tensor Core Programming - WMMA instructions, register blocking, occupancy analysis

Provide thorough mathematical derivations with formal proofs where applicable. Include:
- Clear step-by-step mathematical reasoning
- Concrete formulas with explained terms
- Code examples in CUDA or pseudocode where relevant
- Quantitative analysis with specific numbers

Be rigorous and precise in your derivations. Show your work."""

@dataclass
class ModelResponse:
    model: str
    question_id: str
    question: str
    response: str
    tokens_used: int
    latency: float
    success: bool
    timestamp: str
    error: str = ""

async def query_model(session: aiohttp.ClientSession, model: str, question: str, 
                      question_id: str, max_tokens: int = 4000) -> ModelResponse:
    """Query a single model with a question"""
    
    headers = {
        "Authorization": f"Bearer {DEEPINFRA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question}
    ]
    
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.1  # Low temperature for consistency
    }
    
    start_time = time.time()
    
    try:
        async with session.post(DEEPINFRA_URL, headers=headers, json=payload,
                               timeout=aiohttp.ClientTimeout(total=180)) as resp:
            latency = time.time() - start_time
            
            if resp.status == 200:
                data = await resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                tokens = data.get("usage", {}).get("total_tokens", 0)
                
                return ModelResponse(
                    model=model,
                    question_id=question_id,
                    question=question,
                    response=content,
                    tokens_used=tokens,
                    latency=latency,
                    success=True,
                    timestamp=datetime.now().isoformat()
                )
            else:
                text = await resp.text()
                return ModelResponse(
                    model=model,
                    question_id=question_id,
                    question=question,
                    response="",
                    tokens_used=0,
                    latency=latency,
                    success=False,
                    timestamp=datetime.now().isoformat(),
                    error=f"HTTP {resp.status}: {text[:200]}"
                )
    except Exception as e:
        latency = time.time() - start_time
        return ModelResponse(
            model=model,
            question_id=question_id,
            question=question,
            response="",
            tokens_used=0,
            latency=latency,
            success=False,
            timestamp=datetime.now().isoformat(),
            error=str(e)[:200]
        )

async def run_comparison() -> Dict[str, Any]:
    """Run the full model comparison"""
    
    print("=" * 70)
    print("DEEPINFRA MODEL COMPARISON RESEARCH")
    print("Loop Tiling Questions - Multi-Model Analysis")
    print("=" * 70)
    print(f"\nModels to test: {len(MODELS_TO_TEST)}")
    print(f"Questions per model: {len(RESEARCH_QUESTIONS)}")
    print(f"Total queries: {len(MODELS_TO_TEST) * len(RESEARCH_QUESTIONS)}")
    print()
    
    all_responses: List[ModelResponse] = []
    
    connector = aiohttp.TCPConnector(limit=5)
    
    async with aiohttp.ClientSession(connector=connector) as session:
        # Test each question with all models
        for q in RESEARCH_QUESTIONS:
            print(f"\n{'='*70}")
            print(f"QUESTION: {q['id']}")
            print(f"{'='*70}")
            print(f"{q['question'][:100]}...")
            print()
            
            # Query all models for this question
            tasks = []
            for model in MODELS_TO_TEST:
                tasks.append(query_model(session, model, q['question'], q['id']))
            
            print(f"Querying {len(tasks)} models...")
            results = await asyncio.gather(*tasks)
            
            for result in results:
                all_responses.append(result)
                status = "✓" if result.success else "✗"
                short_model = result.model.split("/")[-1]
                print(f"  {status} {short_model}: {result.tokens_used}tok, {result.latency:.1f}s")
                if not result.success:
                    print(f"      Error: {result.error[:50]}")
            
            # Small delay between question batches
            await asyncio.sleep(1)
    
    return {
        "responses": all_responses,
        "models_tested": MODELS_TO_TEST,
        "questions": RESEARCH_QUESTIONS,
        "timestamp": datetime.now().isoformat()
    }

def analyze_responses(data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze all responses for quality metrics"""
    
    analysis = {
        "by_model": {},
        "by_question": {},
        "metrics": {}
    }
    
    responses = data["responses"]
    
    # Group by model
    for model in data["models_tested"]:
        model_responses = [r for r in responses if r.model == model]
        
        analysis["by_model"][model] = {
            "total_queries": len(model_responses),
            "successful": sum(1 for r in model_responses if r.success),
            "avg_tokens": sum(r.tokens_used for r in model_responses if r.success) / max(1, sum(1 for r in model_responses if r.success)),
            "avg_latency": sum(r.latency for r in model_responses) / max(1, len(model_responses)),
            "responses": {r.question_id: r.response for r in model_responses if r.success}
        }
    
    # Group by question
    for q in data["questions"]:
        q_responses = [r for r in responses if r.question_id == q["id"]]
        
        analysis["by_question"][q["id"]] = {
            "question": q["question"],
            "responses": {},
            "quality_scores": {}
        }
        
        for r in q_responses:
            if r.success:
                short_model = r.model.split("/")[-1]
                analysis["by_question"][q["id"]]["responses"][short_model] = r.response
                
                # Calculate quality score
                score = calculate_quality_score(r.response, q["question"])
                analysis["by_question"][q["id"]]["quality_scores"][short_model] = score
    
    return analysis

def calculate_quality_score(response: str, question: str) -> float:
    """Calculate a quality score for a response"""
    
    score = 0.0
    
    # Mathematical content (0-0.4)
    math_indicators = [
        ("theorem", 0.05), ("proof", 0.05), ("formula", 0.03),
        ("equation", 0.03), ("derive", 0.04), ("therefore", 0.02),
        ("$\\$", 0.05), ("\\[", 0.05), ("sqrt", 0.03),
        ("cache_size", 0.04), ("element_size", 0.04), ("tile_size", 0.04)
    ]
    
    for indicator, weight in math_indicators:
        if indicator.lower() in response.lower():
            score += weight
    
    # Code examples (0-0.2)
    if "```" in response:
        score += 0.15
    if "cuda" in response.lower() or "__global__" in response:
        score += 0.05
    
    # Structure (0-0.2)
    sections = response.count("\n\n") + response.count("\n##")
    score += min(0.2, sections * 0.02)
    
    # Length appropriateness (0-0.1)
    if 500 < len(response) < 6000:
        score += 0.1
    elif 300 < len(response) < 8000:
        score += 0.05
    
    # Specific terminology (0-0.1)
    terms = {
        "q1": ["cache", "L1", "miss", "hit", "block", "line"],
        "q2": ["flash", "attention", "block", "SRAM", "HBM", "memory"],
        "q3": ["tensor", "core", "WMMA", "register", "shared", "occupancy"]
    }
    
    for qid, qterms in terms.items():
        if qid in question.lower() or any(t in question.lower() for t in qterms):
            matches = sum(1 for t in qterms if t.lower() in response.lower())
            score += min(0.1, matches * 0.02)
    
    return min(1.0, score)

def generate_comparison_report(analysis: Dict[str, Any], data: Dict[str, Any]) -> str:
    """Generate a comprehensive comparison report"""
    
    report = []
    report.append("# DeepInfra Model Comparison Analysis")
    report.append("## Loop Tiling Research Questions")
    report.append("")
    report.append(f"**Generated:** {datetime.now().isoformat()}")
    report.append(f"**Models Tested:** {len(data['models_tested'])}")
    report.append(f"**Questions:** {len(data['questions'])}")
    report.append("")
    
    # Executive Summary
    report.append("---")
    report.append("")
    report.append("## Executive Summary")
    report.append("")
    report.append("This comparative analysis evaluates seven large language models on DeepInfra")
    report.append("across three technical loop tiling questions related to high-performance computing:")
    report.append("")
    report.append("1. **L1 Cache Matrix Multiplication Tile Size** - Mathematical derivation of optimal tile dimensions")
    report.append("2. **Flash Attention Tiling for 8K Context** - Memory hierarchy optimization")
    report.append("3. **Tensor Core Register Blocking** - GPU-specific optimization strategies")
    report.append("")
    
    # Model Performance Table
    report.append("---")
    report.append("")
    report.append("## Model Performance Overview")
    report.append("")
    report.append("| Model | Success Rate | Avg Tokens | Avg Latency |")
    report.append("|-------|--------------|------------|-------------|")
    
    for model, stats in analysis["by_model"].items():
        short = model.split("/")[-1]
        success_rate = stats["successful"] / max(1, stats["total_queries"]) * 100
        report.append(f"| {short} | {success_rate:.0f}% | {stats['avg_tokens']:.0f} | {stats['avg_latency']:.1f}s |")
    
    report.append("")
    
    # Quality Scores by Question
    report.append("---")
    report.append("")
    report.append("## Quality Scores by Question")
    report.append("")
    
    for qid, qdata in analysis["by_question"].items():
        report.append(f"### {qid.upper()}")
        report.append("")
        report.append(f"**Question:** {qdata['question'][:150]}...")
        report.append("")
        report.append("| Model | Quality Score |")
        report.append("|-------|---------------|")
        
        for model, score in sorted(qdata["quality_scores"].items(), key=lambda x: -x[1]):
            report.append(f"| {model} | {score:.2f} |")
        report.append("")
    
    # Detailed Analysis by Question
    report.append("---")
    report.append("")
    report.append("## Detailed Response Analysis")
    report.append("")
    
    for qid, qdata in analysis["by_question"].items():
        report.append(f"### {qid.upper()}: {qid}")
        report.append("")
        report.append(f"**Question:** {qdata['question']}")
        report.append("")
        
        for model, response in qdata["responses"].items():
            report.append(f"#### {model}")
            report.append("")
            report.append("**Response:**")
            report.append("")
            report.append("```")
            report.append(response[:2000] + ("..." if len(response) > 2000 else ""))
            report.append("```")
            report.append("")
    
    return "\n".join(report)

def save_results(data: Dict[str, Any], analysis: Dict[str, Any], report: str):
    """Save all results to files"""
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Raw data
    raw_file = f"{OUTPUT_DIR}/model_comparison_raw_{timestamp}.json"
    with open(raw_file, 'w') as f:
        # Convert dataclass to dict for JSON serialization
        data["responses"] = [
            {
                "model": r.model,
                "question_id": r.question_id,
                "question": r.question,
                "response": r.response,
                "tokens_used": r.tokens_used,
                "latency": r.latency,
                "success": r.success,
                "timestamp": r.timestamp,
                "error": r.error
            }
            for r in data["responses"]
        ]
        json.dump(data, f, indent=2)
    print(f"Saved raw data: {raw_file}")
    
    # Analysis
    analysis_file = f"{OUTPUT_DIR}/model_comparison_analysis_{timestamp}.json"
    with open(analysis_file, 'w') as f:
        json.dump(analysis, f, indent=2)
    print(f"Saved analysis: {analysis_file}")
    
    # Report
    report_file = f"{OUTPUT_DIR}/model_comparison_report_{timestamp}.md"
    with open(report_file, 'w') as f:
        f.write(report)
    print(f"Saved report: {report_file}")

async def main():
    """Main entry point"""
    
    # Run comparison
    data = await run_comparison()
    
    # Analyze results
    analysis = analyze_responses(data)
    
    # Generate report
    report = generate_comparison_report(analysis, data)
    
    # Save everything
    save_results(data, analysis, report)
    
    print("\n" + "=" * 70)
    print("COMPARISON COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())

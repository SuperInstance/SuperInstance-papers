# EXP-4: Multi-Model Confidence Cascade Diminishing Returns

**Hypothesis:** The accuracy improvement from N-model verification follows a power law with diminishing returns, with a threshold at N=3.
**Tests:** The `confidence-cascade` sequential/parallel composition and the `log-tensor` multi-model research framework.

---

## Background

The `confidence-cascade` library (`confidence-cascade.ts`) implements three composition patterns:

1. **Sequential cascade:** Confidence multiplies through a chain (`0.9^5 = 0.59` — chains degrade fast)
2. **Parallel cascade:** Confidence averages with weights (different validators contribute differently)
3. **Conditional cascade:** Confidence depends on which path was taken

The `log-tensor` research module includes a multi-API simulator (`research/multi_api_simulator.py`) that orchestrates DeepSeek, Kimi, and DeepInfra as "ghost tiles" — each model contributing a different perspective.

The `batten-spline` router (`router.py`) uses a three-tier decision: LOCAL (confident) → CASCADE (try local, escalate) → CLOUD (go straight to cloud). The CASCADE tier is where multi-model verification happens — but the router doesn't specify *how many* models to cascade through.

**The question:** Running the same task through N models with cascade verification — where does adding another model stop helping? What is the compute/accuracy frontier?

---

## Hypothesis

### H1 (Power Law with Threshold)
Accuracy improvement from N-model verification follows:

```
Accuracy(N) = A_∞ - (A_∞ - A_1) × N^(-α)
```

Where:
- `A_∞` ≈ 0.97 (asymptotic ceiling)
- `A_1` ≈ 0.82 (single-model accuracy)
- `α` ≈ 0.65 (diminishing returns exponent)

Predicted accuracy by N:

| N | Accuracy | Marginal Gain | Compute Cost |
|---|----------|--------------|-------------|
| 1 | 0.82 | — | 1× |
| 2 | 0.89 | +0.07 | 2× |
| 3 | 0.93 | +0.04 | 3× |
| 4 | 0.945 | +0.015 | 4× |
| 5 | 0.955 | +0.010 | 5× |

**The threshold: N=3** is the point where marginal accuracy gain drops below the compute cost ratio (gain < 1/N).

### H2 (Sequential Degradation Dominates)
The `confidence-cascade` sequential composition predicts rapid degradation: 5 sequential steps at 90% each yields 0.9^5 = 0.59 — RED zone. But this assumes *independent* failure modes. Real models have correlated failures (they all struggle with the same types of tasks). The actual degradation will be:

```
Confidence_seq(N) = ∏(c_i) × (1 + ρ × correction_factor)
```

Where `ρ` is the inter-model correlation coefficient. For the fleet's actual models:
- GLM-5.2 ↔ DeepSeek V4: ρ ≈ 0.6 (both large Chinese models, similar training)
- GLM-5.2 ↔ Granite 3.1 2B: ρ ≈ 0.3 (different scale, different training)
- GLM-5.2 ↔ KimiCode K3: ρ ≈ 0.45 (different specialization)

### H3 (Parallel Cascade with Diversity Weighting)
Parallel cascade accuracy depends on model diversity:

```
Accuracy_parallel = Σ(w_i × a_i × (1 - ρ_ij))
```

The most diverse trio (GLM, Granite, KimiCode) will outperform the least diverse trio (GLM, DeepSeek, Z.ai-subagent) by 8–12%.

### H0 (Null)
Adding models provides linear improvement up to N=5+. No diminishing returns threshold exists in the tested range.

---

## Method

### Task Suite
500 tasks across 5 categories:

| Category | N | Example | Difficulty |
|----------|---|---------|-----------|
| Code generation | 100 | "Write a Luau module for fishing mechanics" | Medium |
| Reasoning | 100 | "Explain why the tide changes" | Medium-Hard |
| Creative writing | 100 | "Describe a maritime island setting" | Easy-Medium |
| Analysis | 100 | "Review this Roblox module for performance issues" | Hard |
| Translation | 100 | "Convert this Python function to Luau" | Medium |

### Models Tested

| Model | Provider | Role | Cost |
|-------|----------|------|------|
| GLM-5.2 | Z.ai Max | Primary | Free (unlimited) |
| DeepSeek V4-Flash | DeepSeek API | Secondary | ~$0.001/call |
| DeepSeek V4-Pro | DeepSeek API | Heavy reasoning | ~$0.01/call |
| Granite 3.1 2B | Ollama (local) | Fast, weak | Free |
| KimiCode K3 | Kimi API | Code specialist | ~$0.005/call |

### Experimental Conditions

For each of the 500 tasks, run N-model verification at N = 1, 2, 3, 4, 5:

```python
from typing import List, Tuple
import numpy as np

# Using confidence-cascade
import sys
sys.path.insert(0, '/home/eileen/projects/confidence-cascade')

class NCascadeExperiment:
    """Run N-model cascade verification on a task suite."""
    
    MODELS = [
        ('glm-5.2', 'zai', 0.0),        # Free
        ('deepseek-flash', 'deepseek', 0.001),
        ('kimi-k3', 'kimi', 0.005),
        ('deepseek-pro', 'deepseek', 0.01),
        ('granite-3.1-2b', 'ollama', 0.0),
    ]
    
    def run_task_with_n_models(
        self, 
        task: dict, 
        n: int,
        composition: str = 'parallel'  # 'parallel', 'sequential', 'conditional'
    ) -> dict:
        """Run a single task with N models and cascade verification."""
        
        # Select N models (ordered by cost: cheapest first)
        selected = self.MODELS[:n]
        
        # Get raw outputs from each model
        outputs = []
        for model_name, provider, cost in selected:
            output = self._call_model(model_name, provider, task)
            confidence = self._estimate_confidence(output, task)
            outputs.append({
                'model': model_name,
                'output': output,
                'confidence': confidence,
                'cost': cost,
            })
        
        # Apply cascade composition
        if composition == 'parallel':
            result = self._parallel_cascade(outputs)
        elif composition == 'sequential':
            result = self._sequential_cascade(outputs)
        elif composition == 'conditional':
            result = self._conditional_cascade(outputs)
        
        # Evaluate accuracy
        accuracy = self._evaluate_accuracy(result['output'], task['expected'])
        
        return {
            'n': n,
            'composition': composition,
            'accuracy': accuracy,
            'confidence': result['confidence'],
            'total_cost': sum(o['cost'] for o in outputs),
            'outputs': outputs,
            'final_output': result['output'],
        }
    
    def _parallel_cascade(self, outputs: list) -> dict:
        """
        Parallel cascade: weighted average of confidences.
        Models with higher confidence get higher weight.
        """
        weights = [o['confidence'] for o in outputs]
        total_w = sum(weights)
        
        if total_w == 0:
            # All models uncertain — pick the longest output
            best = max(outputs, key=lambda o: len(o['output']))
            return {'output': best['output'], 'confidence': 0.3}
        
        # Select output from highest-weight model
        best_idx = np.argmax(weights)
        # Combined confidence: weighted average with diversity bonus
        base_confidence = sum(o['confidence'] * w for o, w in zip(outputs, weights)) / total_w
        
        return {
            'output': outputs[best_idx]['output'],
            'confidence': base_confidence,
        }
    
    def _sequential_cascade(self, outputs: list) -> dict:
        """
        Sequential cascade: each model verifies the previous.
        If verifier agrees, confidence multiplies up (correction).
        If verifier disagrees, confidence drops and we take verifier's output.
        """
        current_output = outputs[0]['output']
        current_confidence = outputs[0]['confidence']
        
        for i in range(1, len(outputs)):
            verifier = outputs[i]
            agreement = self._compute_agreement(current_output, verifier['output'])
            
            if agreement > 0.7:
                # Agreement: confidence boost
                current_confidence = current_confidence * (0.5 + agreement * 0.5)
                current_confidence = min(0.99, current_confidence)
            else:
                # Disagreement: take the more confident model
                if verifier['confidence'] > current_confidence:
                    current_output = verifier['output']
                    current_confidence = verifier['confidence'] * 0.8  # penalty for disagreement
                else:
                    current_confidence *= 0.7  # sequential degradation
        
        return {
            'output': current_output,
            'confidence': current_confidence,
        }
```

### Accuracy Evaluation

```python
def evaluate_accuracy(output: str, expected: str, task_type: str) -> dict:
    """Multi-dimensional accuracy evaluation."""
    return {
        'semantic_similarity': cosine_sim(embed(output), embed(expected)),
        'keyword_overlap': jaccard_keywords(output, expected),
        'task_specific': task_specific_score(output, expected, task_type),
        'quality_4axis': quality_scorer(output),  # novelty, specificity, engagement, spatial
    }
```

### Diversity Experiment

```python
# Test different model combinations to measure diversity effect
COMBINATIONS = {
    'homogeneous': ['glm-5.2', 'zai-subagent-glm', 'glm-5.2-creative'],
    'diverse_scale': ['glm-5.2', 'granite-3.1-2b', 'deepseek-flash'],
    'diverse_specialty': ['glm-5.2', 'kimi-k3', 'deepseek-pro'],
    'maximal_diversity': ['glm-5.2', 'granite-3.1-2b', 'kimi-k3'],
}
```

---

## Metrics

| Metric | Calculation | Source |
|--------|------------|--------|
| **Accuracy** | Semantic similarity + keyword overlap + task-specific score | Computed |
| **Confidence** | Cascade output confidence value | `confidence-cascade` |
| **Compute Cost** | Sum of per-model API costs | Fleet billing |
| **Latency** | Wall-clock time for N-model round | Stopwatch |
| **Marginal Gain** | `Accuracy(N) - Accuracy(N-1)` | Derived |
| **Cost-Effectiveness** | `Marginal_Gain / Compute_Cost(N)` | Derived |
| **Cascade Zone** | GREEN/YELLOW/RED classification | `confidence-cascade` zones |
| **Degradation Rate** | `degradationRate(steps)` from cascade | `confidence-cascade.ts` |

---

## Predicted Results

### 1. Power Law Accuracy Curve

```
         1.00 ┤───────────────────────────────────────────────
Accuracy 0.95 ┤                          ●────●────●────●
         0.90 ┤               ●─────●───
         0.85 ┤     ●───●───
         0.80 ┤───●
         0.75 ┤
              └──┬───┬───┬───┬───┬───→ N (models)
                 1   2   3   4   5

Diminishing returns threshold: N=3
```

### 2. Cost-Effectiveness Frontier

| N | Accuracy | Cost ($) | Gain/Cost Ratio | Verdict |
|---|----------|---------|-----------------|---------|
| 1 | 0.82 | 0.000 | — | Baseline |
| 2 | 0.89 | 0.001 | 70.0 | **Best value** |
| 3 | 0.93 | 0.006 | 0.83 | **Accuracy target** |
| 4 | 0.945 | 0.016 | 0.094 | Marginal |
| 5 | 0.955 | 0.026 | 0.038 | **Not worth it** |

### 3. Composition Comparison

```
         Parallel    Sequential   Conditional
N=1:     0.82        0.82         0.82
N=2:     0.89        0.87         0.88
N=3:     0.93        0.89         0.92
N=4:     0.945       0.84*        0.93
N=5:     0.955       0.76*        0.94

* Sequential cascade degrades past N=3 due to multiplicative
  confidence loss (0.9^5 = 0.59)
```

### 4. Diversity Effect at N=3

| Combination | Mean Accuracy | Mean Confidence | Notes |
|-------------|--------------|-----------------|-------|
| Homogeneous (all GLM) | 0.88 ± 0.03 | 0.91 | High agreement, correlated errors |
| Diverse scale | 0.92 ± 0.03 | 0.86 | Good — uncorrelated errors catch more |
| Diverse specialty | 0.93 ± 0.02 | 0.88 | **Best** — different blind spots |
| Maximal diversity | 0.93 ± 0.02 | 0.85 | Same accuracy, lower confidence (healthy disagreement) |

### 5. Task-Type Effect

```
Task Type           Optimal N   Why
─────────────────────────────────────────────────────
Code generation     N=3         Syntax errors caught by specialists
Reasoning           N=4         Logic errors need diverse perspectives
Creative writing    N=2         Creativity doesn't verify well (low ρ)
Analysis            N=3         Multiple angles catch blind spots
Translation         N=2         Binary: either right or wrong
```

### 6. Sequential Cascade Degradation

The `confidence-cascade` sequential composition will show:

```
N=1: 0.90 → GREEN
N=2: 0.81 → YELLOW
N=3: 0.73 → YELLOW (near RED)
N=4: 0.66 → RED
N=5: 0.59 → RED (below yellow threshold)
```

This confirms the library's own prediction: **"your chain is too long or individual steps are too weak"** (from `confidence-cascade.ts` comments). The sequential cascade is not suitable for N > 3.

---

## Falsification Conditions

### Definitive Falsification
Accuracy continues to improve linearly (or super-linearly) up to N=5. No diminishing returns threshold exists.

### Strong Falsification
The parallel cascade accuracy at N=5 is more than 5 percentage points higher than at N=3 (i.e., N=4 and N=5 provide substantial value).

### Weak Falsification
The threshold exists but is at N=2 or N=5, not N=3. The optimal N is highly task-dependent with no consistent pattern.

---

## Implementation Path

### Code to Write

```bash
# 1. Task suite preparation
python3 experiments/cascade/prepare_tasks.py --output tasks.jsonl

# 2. Run cascade at each N level
for N in 1 2 3 4 5; do
  python3 experiments/cascade/run_cascade.py \
    --tasks tasks.jsonl \
    --n-models $N \
    --composition parallel,sequential,conditional \
    --output results_N${N}.jsonl
done

# 3. Run diversity experiment
python3 experiments/cascade/run_diversity.py \
  --combinations homogeneous,diverse_scale,diverse_specialty,maximal_diversity \
  --tasks tasks.jsonl \
  --output diversity_results.jsonl

# 4. Analyze
python3 experiments/cascade/analyze.py --input "results_N*.jsonl" --output analysis/
```

### Runtime
- 500 tasks × 5 N-levels × 3 compositions = 7,500 model calls
- Plus 500 tasks × 4 diversity combinations × 3 models = 6,000 calls
- Total: ~13,500 model calls
- At fleet capacity: ~8 hours with parallel subagents
- Estimated cost: ~$15 (DeepSeek + Kimi calls; GLM and Granite are free)

---

## Connection to Fleet Theory

### Confidence Cascade Calibration
The GREEN/YELLOW/RED thresholds (0.90/0.75/0.00) in `confidence-cascade.ts` need calibration. If the accuracy at N=3 is 0.93, but the cascade confidence reports 0.85 (due to sequential degradation), there's a systematic under-confidence bias. The cascade should be calibrated so that reported confidence matches actual accuracy.

### Batten-Spline Routing
The three-tier routing (LOCAL/CASCADE/CLOUD) implicitly assumes N=2 (local + cloud). If N=3 is optimal, the router should support CASCADE3 (three-model verification before escalating to full cloud).

### Log-Tensor Multi-Model Simulator
The `research/multi_api_simulator.py` provides infrastructure for this experiment. It already handles multi-API orchestration, batching, and progress saving. The experiment code can build on this directly.

### RTT Layer Removal Analogy
The Rubik's Tensor Transformer removes layers as certainty increases: `L(c) = ⌊L_max · (1 - mean(c))²⌋`. The N-model cascade is the multi-model analog: fewer models needed when individual confidence is high. This experiment tests whether the *quadratic* removal formula is correct for the multi-model case, or whether a different exponent applies.

### Cost-Performance Pareto
The `thought-amplifier` Pareto model (`REVISED_FORMAL_MODEL.md`) applies here too: accuracy and compute cost trade off along a Pareto frontier. N=3 is predicted to be the knee of the curve — the point where marginal accuracy gains equal marginal compute costs. This is the fleet's optimal operating point for multi-model verification.

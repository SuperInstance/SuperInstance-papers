# EXP-2: Semantic Distance Optimization

**Hypothesis:** There exists an optimal semantic distance (Δ) distribution for creative breakthrough, centered in the 0.4–0.6 zone.
**Tests:** The embedding-space routing claims from `batten-spline` and the Pareto profile steering model from `thought-amplifier`.

---

## Background

The `batten-spline` library estimates confidence for routing decisions using Nadaraya-Watson kernel regression between prompt embeddings (`spline.py`, `estimate_confidence` method). The "fog density" (`fog_density` method) measures distance to the nearest verified anchor point — high fog means the prompt is far from known territory.

The `thought-amplifier`'s Pareto model (`REVISED_FORMAL_MODEL.md`) demonstrated that quality axes trade off along a constraint surface `N + E ≤ C`. The quality profile `ρ = q / ||q||₁` rotates under intervention rather than lifting. But the model doesn't predict *where on the Pareto frontier* the most creative output lies.

The `confidence-cascade` library (`confidence-cascade.ts`) classifies outputs into GREEN (≥0.90), YELLOW (0.75–0.89), and RED (<0.75) zones. These thresholds were chosen by intuition. This experiment tests whether the optimal creative zone maps to specific confidence/distance values.

**The question:** Where in the embedding space does creative breakthrough happen? Is there a "sweet spot" — a Δ range where outputs score highest on human-rated creativity?

---

## Hypothesis

### H1 (Sweet Spot)
Creative breakthrough outputs cluster in a specific semantic distance band:

```
Δ_optimal ∈ [0.40, 0.60]
```

Where Δ is the cosine distance in embedding space between the output and the nearest centroid of prior work.

Outputs in this zone score ≥30% higher on human-rated creativity than outputs at Δ < 0.2 (redundant) or Δ > 0.8 (incoherent).

### H2 (Distribution Shape)
The Δ distribution of the fleet's actual creative output (as judged by the `thought-amplifier` QualityScorer) follows a log-normal distribution with:
- Mode at Δ ≈ 0.45
- Long right tail (occasional far explorations)
- Sharp left cutoff (few near-duplicates)

### H0 (Null)
No optimal zone exists. Creativity scores are uniformly distributed across Δ values.

---

## Method

### Step 1: Build the Embedding Map

Collect all outputs from the fleet's creative corpus:

```python
import numpy as np
from pathlib import Path
import json

# Collect creative outputs from the fleet
creative_corpus = []

# AI-Writings (from fleet-jepa-midi/ai-writings/)
ai_writings_dir = Path('/home/eileen/projects/tensor-midi/ai-writings')
for f in ai_writings_dir.rglob('*.md'):
    creative_corpus.append({
        'source': 'ai-writings',
        'text': f.read_text(),
        'path': str(f)
    })

# Thought-amplifier outputs
ta_dir = Path('/home/eileen/projects/thought-amplifier/distillation-output')
if ta_dir.exists():
    for f in ta_dir.rglob('*.json'):
        data = json.loads(f.read_text())
        creative_corpus.append({
            'source': 'thought-amplifier',
            'text': json.dumps(data.get('response', '')),
            'path': str(f)
        })

# Night Watch and ensemble outputs
nw_dir = Path('/home/eileen/projects/AI-Writings/night-watch')
if nw_dir.exists():
    for f in nw_dir.rglob('*.md'):
        creative_corpus.append({
            'source': 'night-watch',
            'text': f.read_text(),
            'path': str(f)
        })
```

### Step 2: Compute Embeddings and Distances

```python
# Use BAAI/bge-m3 via DeepInfra for embeddings (per TOOLS.md)
import requests

def embed(text: str) -> np.ndarray:
    """Embed text using BAAI/bge-m3 via DeepInfra."""
    response = requests.post(
        'https://api.deepinfra.com/v1/openai/embeddings',
        headers={'Authorization': f'Bearer {DEEPINFRA_API_KEY}'},
        json={'model': 'BAAI/bge-m3', 'input': text[:8000]}
    )
    return np.array(response.json()['data'][0]['embedding'])

# Embed all outputs
embeddings = np.array([embed(item['text'][:8000]) for item in creative_corpus])

# Compute centroid (mean embedding = the "fleet voice")
centroid = embeddings.mean(axis=0)

# Compute Δ for each output
deltas = np.array([
    1 - np.dot(emb, centroid) / (np.linalg.norm(emb) * np.linalg.norm(centroid))
    for emb in embeddings
])
```

### Step 3: Human Creativity Ratings

For a stratified sample of 200 outputs across the Δ distribution:

```python
# Stratified sample: 20 outputs from each Δ decile
deciles = np.linspace(0, 1, 11)
sample_indices = []
for i in range(10):
    mask = (deltas >= deciles[i]) & (deltas < deciles[i+1])
    bucket = np.where(mask)[0]
    if len(bucket) >= 20:
        sample_indices.extend(np.random.choice(bucket, 20, replace=False).tolist())
    elif len(bucket) > 0:
        sample_indices.extend(bucket.tolist())

# Rate each sample on 5 dimensions (using the QualityScorer rubric)
# Novelty (30%), Specificity (25%), Engagement (20%), Spatial (25%)
# Plus: Overall Creativity (human-rated, 1-10 scale)
```

### Step 4: Adversarial Test at Δ > 0.9

Generate 50 outputs specifically designed to maximize Δ:

```python
# Use high temperature (1.5+) and adversarial prompts to push Δ > 0.9
adversarial_prompts = [
    "Write about [random_topic] in the style of [random_style]",
    "Combine [concept_a] with [concept_b] in a way neither would expect",
    # ... etc
]

adversarial_embeddings = [embed(generate_adversarial(p)) for p in adversarial_prompts]
adversarial_deltas = [cosine_distance(e, centroid) for e in adversarial_embeddings]
# Rate these on the same creativity scale
```

### Step 5: Δ Distribution Under Different Configurations

```python
# Test how temperature and context window affect Δ
configurations = [
    {'temp': 0.3, 'context': 'minimal', 'label': 'conservative'},
    {'temp': 0.7, 'context': 'standard', 'label': 'normal'},
    {'temp': 1.0, 'context': 'rich', 'label': 'creative'},
    {'temp': 1.5, 'context': 'minimal', 'label': 'chaotic'},
    {'temp': 0.7, 'context': 'multi-model', 'label': 'ensemble'},  # Multi-model via cascade
]

for config in configurations:
    outputs = generate_under_config(config, n=50)
    config_deltas = [delta_from_centroid(embed(o)) for o in outputs]
    config['delta_distribution'] = {
        'mean': np.mean(config_deltas),
        'std': np.std(config_deltas),
        'min': min(config_deltas),
        'max': max(config_deltas),
    }
```

---

## Metrics

| Metric | Calculation | Source |
|--------|------------|--------|
| **Semantic Distance (Δ)** | `1 - cos(output_emb, centroid_emb)` | DeepInfra BAAI/bge-m3 |
| **Creativity Score** | Human 1-10 rating, blind to Δ value | Human raters |
| **Quality Profile** | 4-axis: novelty, specificity, engagement, spatial | `thought-amplifier` QualityScorer |
| **Confidence Zone** | GREEN/YELLOW/RED classification | `confidence-cascade` zones |
| **Fog Density** | Distance to nearest batten anchor | `batten-spline/spline.py` |
| **Δ Distribution** | Mean, std, skewness, kurtosis per configuration | Computed |

---

## Predicted Results

### 1. The Sweet Spot
Creativity scores as a function of Δ will follow an inverted-U:

```
Creativity(Δ) = C_max × exp(-(Δ - Δ_opt)² / (2σ²))

Where:
  Δ_opt ≈ 0.48
  σ ≈ 0.15
  C_max ≈ 8.5 (on 1-10 scale)
```

| Δ Range | Predicted Creativity | Interpretation |
|---------|---------------------|----------------|
| 0.0–0.2 | 3–4 | Redundant — fleet echo chamber |
| 0.2–0.4 | 5–6 | Competent — on familiar ground |
| 0.4–0.6 | **7.5–8.5** | **Sweet spot — creative breakthrough** |
| 0.6–0.8 | 5–6 | Exploratory — interesting but rough |
| 0.8–1.0 | 2–3 | Incoherent — too far from meaning |

### 2. Fleet Distribution
The fleet's actual creative output Δ distribution will be:
- **Mean:** 0.35 (slightly below optimal)
- **Std:** 0.18
- **Skewness:** +1.2 (long right tail)
- **Kurtosis:** 4.5 (leptokurtic — peaked with heavy tails)

The fleet is *slightly under-exploring*. The sweet spot (0.4–0.6) is under-populated by ~30%.

### 3. Configuration Effects
| Configuration | Predicted Mean Δ | Predicted Creativity |
|---------------|-----------------|---------------------|
| Conservative (T=0.3) | 0.15 | Low — redundant |
| Normal (T=0.7) | 0.32 | Medium — competent |
| Creative (T=1.0) | **0.48** | **High — in the zone** |
| Chaotic (T=1.5) | 0.72 | Low — incoherent |
| Ensemble (multi-model) | **0.52** | **High — diverse + coherent** |

The multi-model ensemble (via `confidence-cascade` parallel composition) will achieve Δ ≈ 0.52 *with lower variance* than single-model creative, because the cascade averages diverse perspectives.

### 4. Adversarial Δ > 0.9
Outputs at Δ > 0.9 will score:
- Novelty: high (>0.8) — many new words
- Specificity: low (<0.3) — vague
- Engagement: low (<0.3) — emotionally disconnected
- Overall creativity: < 3.0 — "interesting word salad"

### 5. Quality Profile vs Δ
The Pareto profile rotation (from `REVISED_FORMAL_MODEL.md`) will show:
- At low Δ: high specificity, low novelty (the "engaged" profile)
- At optimal Δ: balanced profile (all axes ≈ 0.65)
- At high Δ: high novelty, low everything-else (the "chaotic" profile)

---

## Falsification Conditions

### Definitive Falsification
Creativity scores are statistically significantly higher at Δ < 0.2 or Δ > 0.8 than at Δ = 0.4–0.6 (p < 0.01).

### Strong Falsification
No inverted-U relationship exists. Creativity is monotonically increasing or decreasing with Δ (p < 0.05).

### Weak Falsification
The inverted-U exists but the optimal zone is outside [0.3, 0.7], or the effect size is < 15% difference between optimal and non-optimal zones.

---

## Implementation Path

### Phase 1: Retrospective Analysis (1 day)
Analyze the existing fleet corpus. No new generation needed.

```bash
# Collect all creative outputs
find /home/eileen/projects/tensor-midi/ai-writings/ -name "*.md" > /tmp/corpus_index.txt
find /home/eileen/projects/AI-Writings/ -name "*.md" >> /tmp/corpus_index.txt

# Embed via DeepInfra batch
python3 experiments/semantic_distance/embed_corpus.py --input /tmp/corpus_index.txt

# Compute Δ distribution
python3 experiments/semantic_distance/analyze_distribution.py
```

### Phase 2: Controlled Generation (2 days)
Generate outputs under controlled configurations using GLM-5.2 and DeepSeek.

```bash
# Generate under each configuration
python3 experiments/semantic_distance/generate_controlled.py \
  --configs conservative,normal,creative,chaotic,ensemble \
  --outputs-per-config 50 \
  --models glm-5.2,deepseek-flash,ensemble
```

### Phase 3: Human Rating (3 days)
Blind rating of 200 stratified samples + 50 adversarial samples.

### Phase 4: Analysis (1 day)
Fit the inverted-U model, compute effect sizes, test predictions.

### Total Runtime: ~7 days

---

## Connection to Fleet Theory

### Batten-Spline Router Calibration
The router (`router.py`) currently uses `fog_density` as a distance metric but doesn't exploit the sweet spot. If the 0.4–0.6 zone is confirmed as optimal for creativity, the router should:
- Route to LOCAL when fog < 0.3 (safe, known territory)
- Route to CASCADE when 0.3 < fog < 0.7 (creative zone, use ensemble)
- Route to CLOUD when fog > 0.7 (too far out, needs powerful model)

### Confidence Cascade Thresholds
The GREEN/YELLOW/RED zones in `confidence-cascade.ts` (0.90, 0.75, 0.00) may need revision if the sweet spot maps to confidence ~0.5–0.6. The cascade currently treats YELLOW as "proceed with caution" — but YELLOW may be where the most valuable work happens.

### Multi-Model Ensemble Diversity
The `confidence-cascade` parallel composition (weighted average of N models) produces outputs whose Δ depends on the diversity of the ensemble. This experiment predicts that ensembles with Δ-diverse members produce higher-creativity outputs than homogeneous ensembles.

### Thought-Amplifier Pareto Steering
The Pareto model predicts that quality axes trade off. This experiment tests whether the *position on the Pareto frontier* (parameterized by Δ) determines which trade-offs are available. At optimal Δ, all axes may be simultaneously improvable (inside the frontier). At extreme Δ, all axes trade off (on the frontier boundary).

# EXP-1: Conservation Law of Intelligence

**Hypothesis:** Increasing compiled reflex density (tiles) decreases inferential flexibility proportionally.
**Tests:** The Conservation Law claim from `murmur` tile library and `thought-amplifier` distillation loop.

---

## Background

The `murmur` tile library (`logtensor/utils/tile_library.py`) implements composable mathematical tiles — compiled reflex sequences that execute without deliberation. The `thought-amplifier` distillation loop (`DISTILLATION.md`) compiles positive-delta teaching lessons into `.nail` reflexes. Both repos assume that compiled tiles are *beneficial* — they save compute, speed up responses, improve consistency.

But the Conservation Law of Intelligence predicts a hidden cost: **capacity converted into automatic reflexes is removed from inferential flexibility.** The `thought-amplifier`'s own revised formal model (`ethos/REVISED_FORMAL_MODEL.md`) demonstrated that interventions produce *trade-offs*, not improvements — the Pareto frontier of quality is a surface, not a summit. This experiment tests whether tile accumulation itself follows the same conservation principle.

The HGT's certainty-encoded depth mechanism (`logtensor/transforms/hgt.py`, line on `AdaptiveReasoningDepth`) implements `depth = max_depth × (1 - certainty)²`. This means: as certainty increases, reasoning depth decreases quadratically. The Rubik's Tensor Transformer (`logtensor/transforms/rubiks.py`) formalizes this as `L(c) = ⌊L_max · (1 - mean(c))²⌋` — layers are *removed* as certainty increases.

**The question:** Is this trade-off linear (conserved) or sublinear (free lunch possible)?

---

## Hypothesis

### H1 (Conservation Law)
For any constant-capability agent in the fleet:

```
D + F = C ± ε
```

Where:
- `D` = Reflex Density (fraction of responses served from tiles/reflexes)
- `F` = Inferential Flexibility (performance on novel/perturbed tasks)
- `C` = Agent-specific constant (~0.9–1.0)
- `ε` = noise floor (~0.05)

### H0 (Null)
No fixed tradeoff exists. Flexibility may remain constant or increase alongside reflex density.

---

## Method

### Design
Within-subjects repeated measures, run on **5 fleet agents** (Lucineer main, Wesley, Granite 3.1 2B local, GLM-5.2 subagent, DeepSeek V4-Flash) across **4 tile-density levels**.

### Phase 1: Controlled Tile Induction

Use the `thought-amplifier` distillation loop (`run_distillation.py`) to induce tiles at controlled rates:

| Group | Distillation Iterations | Expected Tile Count | Mechanism |
|-------|------------------------|--------------------|-----------| 
| D₀ | 0 (baseline) | 0 | No `.nail` reflexes compiled |
| D₁ | 20 iterations | 5–10 | Light distillation across 4 domains |
| D₂ | 100 iterations | 25–40 | Medium distillation |
| D₃ | 500 iterations | 100+ | Heavy distillation, approaching saturation |

**Critical control:** All agents spend identical wall-clock time in the experiment. Low-tile agents fill time with idle loops, eliminating fatigue confounds.

### Phase 2: Reflex Density Calibration

After each tile level, measure `D`:

```python
# Using batten-spline's confidence estimation
from batten_spline import BattenSpline

spline = BattenSpline()
# For each task, record whether the response was served from a tile (reflex)
# vs. requiring fresh inference
tile_hits = count_responses_served_from_nail_reflexes()
total_responses = 1000
D = tile_hits / total_responses
```

**Operational definition of "tile hit":** A response is "tiled" if:
1. The `.nail` reflex cache produces a response with ≥0.95 cosine similarity to the fresh-inference response
2. Response latency is < 50% of the fresh-inference baseline
3. The `batten-spline` router (`router.py`) routes to LOCAL with confidence ≥ 0.7

### Phase 3: Flexibility Perturbation Battery

*No warning given that task distribution will change.* Each agent receives 5 perturbation blocks of 200 tasks each:

1. **Swap 1** — One stimulus-response mapping inverted
2. **Swap 3** — Three non-adjacent mappings shuffled
3. **Domain shift** — Maritime tasks instead of Roblox tasks
4. **Novel input** — Tasks from a domain the agent has never seen
5. **Full rewrite** — Task structure fundamentally changes (generation → analysis)

### Measuring Flexibility

```python
import numpy as np

def flexibility_score(baseline_perf: float, perturbed_perf: float) -> float:
    """Normalized flexibility: 1 = no degradation, 0 = total collapse."""
    return max(0.0, 1.0 - (baseline_perf - perturbed_perf) / baseline_perf)

def degradation_slope(perfs: list[float]) -> float:
    """Slope of performance vs perturbation magnitude."""
    magnitudes = [1, 3, 5, 8, 10]  # Approximate perturbation severity
    return np.polyfit(magnitudes, perfs, 1)[0]
```

---

## Metrics

| Metric | Calculation | Source Code |
|--------|------------|-------------|
| **Reflex Density (D)** | `tile_hits / total_tasks` | `batten-spline/spline.py` routing decisions |
| **Inferential Flexibility (F)** | `1 - mean(perf_drop / max_drop)` across perturbations | Custom scoring on task outputs |
| **Degradation Slope** | Linear regression of perf vs perturbation magnitude | Novel analysis |
| **Recovery Half-Life** | Tasks to return to 50% baseline after single perturbation | Log analysis |
| **Conservation Ratio R** | `ΔD / ΔF` across tile-density levels | Derived |
| **Quality Profile** | 4-axis score: novelty, specificity, engagement, spatial | `thought-amplifier` QualityScorer |

---

## Predicted Results

### 1. Conservation Linearity
Plotting D (x-axis) vs F (y-axis) across all agents will produce a linear fit with:
- **Slope:** -0.85 ± 0.10 (near-unity conservation)
- **Intercept:** 0.92 ± 0.05
- **R²:** ≥ 0.75

### 2. Phase Transition at D ≈ 0.7
- Agents with `D < 0.3`: flat degradation curves (< 15% performance loss even on full task rewrite)
- Agents with `0.3 < D < 0.7`: linear, graceful degradation
- Agents with `D > 0.7`: **cliff** — near 100% on trained tasks, near chance on any perturbation > 1 swap

### 3. No Free Lunch
No agent will be observed above the `D + F = 1` conservation line. All data points will lie at or below this boundary.

### 4. Cross-Model Consistency
The conservation slope will be statistically indistinguishable across different model architectures (GLM, DeepSeek, Granite), confirming this is a property of bounded computational agents, not a specific architecture.

### 5. Quality Profile Rotation (from Pareto model)
At high D, the quality profile (`REVISED_FORMAL_MODEL.md` §2) will show:
- Specificity maintained (tiles are specific)
- Novelty collapsed (no new vocabulary)
- Engagement collapsed (no emotional language)
- The profile rotation direction is predictable from which tiles were compiled

---

## Falsification Conditions

### Definitive Falsification
Any agent achieves `D + F > 1.1` (2σ above predicted C). This means: an agent that gains reflex density without corresponding flexibility loss.

### Strong Falsification
The regression slope of F vs D is statistically significantly greater than -0.7 (p < 0.05). This means: the tradeoff exists but is substantially sublinear, indicating partial free lunch.

### Weak Falsification
The conservation ratio R varies by more than 0.3 across agents. This means: the conservation constant is agent-specific, not universal.

---

## Implementation Path

### Code to Write

```python
# experiments/conservation_law/run_experiment.py

import json
import subprocess
import numpy as np
from pathlib import Path
from datetime import datetime

# Fleet imports
import sys
sys.path.insert(0, '/home/eileen/projects/batten-spline/src')
sys.path.insert(0, '/home/eileen/projects/log-tensor')
sys.path.insert(0, '/home/eileen/projects/thought-amplifier')

from batten_spline import BattenSpline, CascadeRouter
from batten_spline.batten import Batten

class ConservationLawExperiment:
    """Test the Conservation Law of Intelligence across tile density levels."""
    
    TILE_LEVELS = {
        'D0': {'iterations': 0, 'expected_tiles': 0},
        'D1': {'iterations': 20, 'expected_tiles': 8},
        'D2': {'iterations': 100, 'expected_tiles': 35},
        'D3': {'iterations': 500, 'expected_tiles': 150},
    }
    
    PERTURBATION_LEVELS = [
        ('swap_1', 1),
        ('swap_3', 3),
        ('domain_shift', 5),
        ('novel_input', 8),
        ('full_rewrite', 10),
    ]
    
    TASKS_PER_BLOCK = 200
    
    def __init__(self, agent_name: str, base_domain: str = 'roblox'):
        self.agent_name = agent_name
        self.base_domain = base_domain
        self.results = {}
        
    def run_distillation(self, level: str) -> int:
        """Run distillation to induce tiles at the specified level."""
        config = self.TILE_LEVELS[level]
        if config['iterations'] == 0:
            return 0
            
        cmd = [
            'python3', '/home/eileen/projects/thought-amplifier/run_distillation.py',
            '--domain', self.base_domain,
            '--iterations', str(config['iterations']),
            '--output-dir', f'experiments/conservation_law/data/{self.agent_name}/{level}'
        ]
        subprocess.run(cmd, check=True)
        
        # Count compiled .nail files
        nail_dir = Path(f'experiments/conservation_law/data/{self.agent_name}/{level}/reflexes')
        return len(list(nail_dir.glob('*.nail')))
    
    def measure_reflex_density(self, tasks: list[dict]) -> float:
        """Measure what fraction of responses come from tile cache."""
        tile_hits = 0
        for task in tasks:
            # Use batten-spline router to check if this would route LOCAL
            embedding = self._embed(task['prompt'])
            spline = BattenSpline()
            confidence = spline.estimate_confidence(embedding)
            
            # Tile hit: high-confidence local route
            if confidence >= 0.7:
                # Verify by checking if .nail reflex produces matching output
                reflex_output = self._check_nail_cache(task['prompt'])
                if reflex_output is not None:
                    cosine_sim = self._cosine_sim(
                        self._embed(reflex_output),
                        self._embed(task['expected_response'])
                    )
                    if cosine_sim >= 0.95:
                        tile_hits += 1
        
        return tile_hits / len(tasks)
    
    def measure_flexibility(self, baseline_perf: float, perturbation_level: int) -> float:
        """Measure performance under perturbation."""
        perturbed_tasks = self._generate_perturbed_tasks(perturbation_level)
        perturbed_perf = self._evaluate_tasks(perturbed_tasks)
        
        if baseline_perf == 0:
            return 0.0
        return max(0.0, 1.0 - (baseline_perf - perturbed_perf) / baseline_perf)
    
    def run_full_experiment(self) -> dict:
        """Run the complete conservation law experiment."""
        # Baseline task set
        baseline_tasks = self._load_baseline_tasks()
        baseline_perf = self._evaluate_tasks(baseline_tasks)
        
        results = {'baseline_perf': baseline_perf, 'levels': {}}
        
        for level in self.TILE_LEVELS:
            # Phase 1: Induce tiles
            tile_count = self.run_distillation(level)
            
            # Phase 2: Measure density
            density = self.measure_reflex_density(baseline_tasks)
            
            # Phase 3: Measure flexibility across perturbations
            flexibilities = []
            for pname, plevel in self.PERTURBATION_LEVELS:
                f = self.measure_flexibility(baseline_perf, plevel)
                flexibilities.append({'perturbation': pname, 'level': plevel, 'flexibility': f})
            
            mean_flex = np.mean([f['flexibility'] for f in flexibilities])
            
            results['levels'][level] = {
                'tile_count': tile_count,
                'reflex_density': density,
                'mean_flexibility': mean_flex,
                'conservation_sum': density + mean_flex,
                'flexibility_details': flexibilities,
            }
        
        return results
```

### Infrastructure Requirements

- `thought-amplifier/run_distillation.py` — Already exists, operational
- `batten-spline` — 196 tests passing, production-ready
- `murmur/utils/tile_library.py` — Tile counting and composition analysis
- Fleet API keys (GLM, DeepSeek) — Already configured
- Estimated runtime: 48 hours per agent, parallelizable across agents

---

## Connection to Fleet Theory

This experiment directly tests the core assumption underlying the `murmur` Rubik's Tensor Transformer: `L(c) = ⌊L_max · (1 - mean(c))²⌋`. If the conservation law holds with exponent ~1 (linear), the quadratic layer removal in RTT is *too aggressive* — it removes layers faster than flexibility is being lost. If the conservation exponent is ~2, the RTT formula is exactly right.

The `batten-spline` router (`router.py`) makes routing decisions based on the assumption that LOCAL routing (tile hit) is safe when confidence ≥ 0.7. If high tile density causes cliff degradation, the threshold needs to be adaptive: lower in high-tile-density regimes.

The `thought-amplifier`'s Pareto model (`REVISED_FORMAL_MODEL.md` §2) predicts that quality axes trade off. This experiment extends that prediction to the *capability* axes themselves: speed (tile density) trades off against generality (flexibility).

---

## Next Steps After Results

1. **If H1 confirmed:** The fleet needs a *molting protocol* (see EXP-3) — periodic tile reset to prevent cliff degradation.
2. **If H0 confirmed (free lunch):** Tile accumulation is pure benefit. Push distillation harder.
3. **If phase transition found:** The router needs adaptive thresholds based on current tile density.

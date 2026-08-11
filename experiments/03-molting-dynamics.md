# EXP-3: Hermit Crab Molting Dynamics

**Hypothesis:** Periodic tile reset ("molting") produces long-term performance gains that outweigh the short-term costs.
**Tests:** The Hermit Crab Molting hypothesis derived from `log-tensor` tile accumulation dynamics and `batten-spline` learning/forgetting balance.

---

## Background

Hermit crabs molt: they outgrow their shells, shed their exoskeleton, and harden anew. The process is dangerous (soft body, vulnerable) but necessary (growth requires it). The `log-tensor` tile library (`tile_library.py`) accumulates compiled reflexes (tiles) that make the agent faster on known tasks. The `thought-amplifier` distillation loop (`DISTILLATION.md`) compiles `.nail` reflexes when teaching produces positive deltas. The `batten-spline` learns from outcomes (`learn` method, adding battens).

But none of these systems *forget*. Tiles accumulate monotonically. Battens are pruned by age (`prune` method, max 500), but only by recency — not strategically. The Rubik's Tensor Transformer's certainty encoding (`rubiks.py`, `cmax` function) explicitly enforces "certainty never decreases." The Conservation Law (EXP-1) predicts this accumulation eventually causes cliff degradation.

**Biological analogy:** An agent that never molts is a hermit crab in a shell that's too small. It's protected but constrained. Molting — discarding accumulated tiles and rebuilding from scratch — is risky but potentially necessary for growth.

**The question:** Does periodic tile reset improve long-term performance compared to never resetting? What is the optimal molting frequency? How deep is the performance dip during molting?

---

## Hypothesis

### H1 (Molting Benefit)
Agents that molt (periodically discard all compiled tiles) will show:
- **Short-term cost:** 15–30% performance dip for 50–100 tasks post-molt
- **Long-term gain:** 10–20% higher performance than never-molting agents after 2000+ tasks
- **Recovery time:** ~100 tasks to return to pre-molt performance

### H2 (Optimal Molting Frequency)
The optimal molting interval follows:

```
T_optimal = k × √(total_task_diversity)
```

Where:
- `k` ≈ 50–100 (tasks per unit of diversity)
- `total_task_diversity` = number of distinct task types encountered

For the fleet's current workload (4 domains, ~15 task types each), this predicts:
- T_optimal ≈ 200–400 tasks between molts

### H3 (Post-Molt Improvement)
After each molt cycle, the rebuilt tile library will be:
- More compact (fewer tiles, higher hit rate)
- More accurate (reflecting recent task distribution, not stale patterns)
- More flexible (lower tile density, per Conservation Law)

### H0 (Null)
Molting provides no long-term benefit. The performance dip is pure cost with no compensating gain. Never-molting agents perform equally well or better.

---

## Method

### Design
Longitudinal study, 4 experimental groups, 5000 tasks per agent.

| Group | Molting Schedule | Molt Description |
|-------|-----------------|------------------|
| **Never** | Never molt | Tiles accumulate indefinitely |
| **Frequent** | Every 100 tasks | Discard all `.nail` files, reset batten-spline |
| **Moderate** | Every 300 tasks | Discard all `.nail` files, reset batten-spline |
| **Adaptive** | When tile hit rate drops below 0.5 | Data-driven molting |

### Molting Procedure

```python
class MoltingProcedure:
    """The hermit crab molt: shed the shell, grow anew."""
    
    @staticmethod
    def full_molt(agent_id: str) -> dict:
        """Discard all compiled tiles and reset the spline."""
        import shutil
        from pathlib import Path
        import json
        from datetime import datetime
        
        # 1. Archive current tiles (for analysis)
        nail_dir = Path(f'agents/{agent_id}/reflexes')
        archive_dir = Path(f'experiments/molting/archive/{agent_id}/{datetime.now().isoformat()}')
        if nail_dir.exists():
            shutil.copytree(str(nail_dir), str(archive_dir / 'reflexes'))
        
        # 2. Clear tile cache
        if nail_dir.exists():
            for f in nail_dir.glob('*.nail'):
                f.unlink()
        
        # 3. Reset batten-spline (but keep the learned thresholds)
        # The spline accumulates battens (verified outcomes). 
        # On molt, we keep 10% of battens (the most recent, highest-quality)
        # to bootstrap the new learning cycle.
        spline_state = load_spline_state(agent_id)
        if spline_state and 'battens' in spline_state:
            all_battens = spline_state['battens']
            # Sort by quality × recency
            all_battens.sort(
                key=lambda b: b['quality_score'] * age_weight(b['timestamp']),
                reverse=True
            )
            # Keep top 10%
            keep_count = max(1, len(all_battens) // 10)
            spline_state['battens'] = all_battens[:keep_count]
            save_spline_state(agent_id, spline_state)
        
        # 4. Reset certainty accumulators (per RTT: certainty never decreases 
        # unless we force it)
        # This is the key innovation: molting OVERRIDES the certainty monotonicity
        certainty_file = Path(f'agents/{agent_id}/certainty_state.json')
        if certainty_file.exists():
            state = json.loads(certainty_file.read_text())
            state['certainty'] = 0.5  # Reset to maximum uncertainty
            state['molting'] = True
            state['molt_count'] = state.get('molt_count', 0) + 1
            certainty_file.write_text(json.dumps(state, indent=2))
        
        return {
            'molt_time': datetime.now().isoformat(),
            'tiles_archived': len(list(archive_dir.glob('reflexes/*.nail'))) if archive_dir.exists() else 0,
            'battens_retained': keep_count if spline_state else 0,
        }
```

### Task Stream

```python
# Task stream: mix of all 4 domains, with controlled novelty injection
task_stream = generate_task_stream(
    total_tasks=5000,
    domains=['roblox', 'digital-twin', 'maritime', 'cognition'],
    tasks_per_domain=1250,
    novelty_injection_rate=0.05,  # 5% of tasks are novel types
    drift_rate=0.02,  # Task distribution slowly drifts over time
)
```

### Measurement Windows

```
Task 0     Task 100   Task 300    Task 600    Task 1000   Task 2000   Task 5000
  |           |          |           |           |           |           |
  PRE        M1         M2          M3          M4          M5          POST
  
  Baseline ── Molt ────── Molt ───── Molt ───── Molt ───── Molt ───── Final
  (no tiles)  (F)         (F)        (F)        (F)        (F)
             ── Molt ─────────────── Molt ─────────────── Molt ──────
              (M)                    (M)                    (M)
             ── Adaptive molt triggers ──────────────────────────────
              (A)                    (A)(A)      (A)        (A)
```

For each agent, log per-task:
- Task type and domain
- Response quality (4-axis QualityScorer)
- Tile hit / miss
- Latency
- Confidence at time of response
- Cumulative tile count

---

## Metrics

| Metric | Calculation | Window |
|--------|------------|--------|
| **Performance Dip Depth** | `1 - (post_molt_perf / pre_molt_perf)` | 50 tasks post-molt |
| **Recovery Half-Life** | Tasks to reach 50% of pre-molt performance | Post-molt window |
| **Full Recovery Time** | Tasks to reach 95% of pre-molt performance | Post-molt window |
| **Post-Molt Improvement** | `(post_recovery_perf - pre_molt_perf) / pre_molt_perf` | 200 tasks post-recovery |
| **Long-Term Performance** | Mean quality over tasks 2000–5000 | End of experiment |
| **Tile Efficiency** | `tile_hit_rate / tile_count` (hits per tile) | Rolling window |
| **Flexibility Reserve** | Performance on injected novel tasks | Per novelty event |

---

## Predicted Results

### 1. Molting Cost (Short-Term)

```
Performance Post-Molt (first 50 tasks):
  Never-molt:    100% (baseline, no molt)
  Frequent:      72% ± 8%  (28% dip)
  Moderate:      75% ± 7%  (25% dip)  
  Adaptive:      80% ± 6%  (20% dip — adaptive timing avoids worst molts)
```

### 2. Recovery Time

| Group | Tasks to 50% recovery | Tasks to 95% recovery |
|-------|----------------------|----------------------|
| Frequent | 15 ± 5 | 60 ± 15 |
| Moderate | 25 ± 8 | 90 ± 20 |
| Adaptive | 20 ± 7 | 70 ± 18 |

### 3. Long-Term Performance (Tasks 2000–5000)

```
Never-molt:     0.72 ± 0.04  ← degraded by Conservation Law cliff
Frequent:       0.81 ± 0.03  ← too frequent, excessive molting cost
Moderate:       0.88 ± 0.02  ← OPTIMAL
Adaptive:       0.86 ± 0.03  ← near-optimal, with less manual tuning
```

### 4. Tile Efficiency Over Time

**Never-molting agents** will show monotonically declining tile efficiency:
```
Tile efficiency = hits_per_tile
Tasks 0-500:   0.82 hits/tile (efficient)
Tasks 500-1000: 0.65 hits/tile (declining)
Tasks 1000-2000: 0.45 hits/tile (many stale tiles)
Tasks 2000-5000: 0.30 hits/tile (tile bloat)
```

**Moderate-molting agents** will reset tile efficiency each cycle:
```
Pre-molt:       0.75 → declining
Post-molt:      0.90 → rebuilt, compact
Pre-molt:       0.75 → declining again
Post-molt:      0.90 → rebuilt again
(Sawtooth pattern)
```

### 5. Flexibility Reserve

On novel task injection:
```
Never-molt:     0.35 ± 0.08  (cliff — tiles interfere with novel reasoning)
Frequent:       0.72 ± 0.06  (high flexibility, but low baseline competence)
Moderate:       0.68 ± 0.07  (good balance)
Adaptive:       0.70 ± 0.06  (good balance, triggered by actual need)
```

### 6. Sawtooth vs. Steady State

Plotting performance over time:

```
Quality
  1.0 ┤                                    ╱╲    ╱╲    ╱╲
  0.9 ┤                          ╱╲       ╱  ╲  ╱  ╲  ╱  ╲      ← Moderate
  0.8 ┤               ╱╲        ╱  ╲     ╱    ╲╱    ╲╱    ╲
  0.7 ┤    ╱╲        ╱  ╲      ╱    ╲   ╱
  0.6 ┤   ╱  ╲      ╱    ╲    ╱      ╲ ╱
  0.5 ┤──╱────╲────╱──────╲──╱────────╲/─────────────────────← Never
  0.4 ┤
      └──┬────┬────┬────┬────┬────┬────┬────┬────┬────→ Tasks
         0   500  1000 1500 2000 2500 3000 3500 4000
```

The **Never-molt** curve shows steady decline from 0.9 to 0.7 as tiles bloat.
The **Moderate** curve shows sawtooth: dip to 0.6, recover to 0.9, repeat.
**Cumulatively, Moderate wins** because the sawtooth average (0.75) exceeds the declining curve (0.72 → 0.65).

---

## Falsification Conditions

### Definitive Falsification
Never-molting agents achieve higher mean performance than all molting groups over tasks 2000–5000 (p < 0.05). Molting is pure cost.

### Strong Falsification
No sawtooth pattern appears. Performance recovers linearly after molt with no overshoot — the rebuilt tiles are no better than the old ones.

### Weak Falsification
The sawtooth pattern appears but the long-term average is not statistically significantly different from the never-molt curve (p > 0.10).

---

## Implementation Path

### Code to Write

```python
# experiments/molting/molting_runner.py

import json
import time
import shutil
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
import numpy as np

# Fleet imports
import sys
sys.path.insert(0, '/home/eileen/projects/batten-spline/src')
sys.path.insert(0, '/home/eileen/projects/thought-amplifier')

from batten_spline import BattenSpline, CascadeRouter
from batten_spline.batten import Batten

@dataclass
class MoltConfig:
    """Configuration for a molting experiment agent."""
    agent_id: str
    schedule: str  # 'never', 'frequent', 'moderate', 'adaptive'
    molt_interval: int  # Tasks between molts (0 = never)
    adaptive_threshold: float = 0.5  # For adaptive: molt when tile_hit_rate < this
    domains: list = field(default_factory=lambda: ['roblox', 'digital-twin', 'maritime', 'cognition'])
    
    def should_molt(self, task_count: int, current_tile_hit_rate: float) -> bool:
        if self.schedule == 'never':
            return False
        elif self.schedule == 'adaptive':
            return current_tile_hit_rate < self.adaptive_threshold
        else:
            return task_count > 0 and task_count % self.molt_interval == 0


class MoltingExperiment:
    """Run the hermit crab molting experiment."""
    
    TOTAL_TASKS = 5000
    DOMAINS = ['roblox', 'digital-twin', 'maritime', 'cognition']
    
    def __init__(self, config: MoltConfig):
        self.config = config
        self.spline = BattenSpline(fog_scale=1.0, half_life=86400*7)
        self.router = CascadeRouter(spline=self.spline)
        self.tile_cache = {}  # prompt_hash → response (simulating .nail cache)
        self.performance_log = []
        self.molt_log = []
        
    def run(self):
        """Run the full 5000-task experiment."""
        for task_idx in range(self.TOTAL_TASKS):
            # Generate task
            task = self._generate_task(task_idx)
            
            # Check for molt
            current_hit_rate = self._compute_tile_hit_rate(window=50)
            if self.config.should_molt(task_idx, current_hit_rate):
                molt_record = self._execute_molt(task_idx)
                self.molt_log.append(molt_record)
            
            # Process task
            result = self._process_task(task)
            self.performance_log.append(result)
            
            # Periodic checkpoint
            if task_idx % 500 == 0:
                self._checkpoint(task_idx)
        
        return self._analyze_results()
    
    def _execute_molt(self, task_idx: int) -> dict:
        """Execute a full hermit crab molt."""
        tiles_before = len(self.tile_cache)
        
        # Archive
        archive = dict(self.tile_cache)
        
        # Clear tiles
        self.tile_cache.clear()
        
        # Retain 10% of battens (highest quality × recency)
        if self.spline.battens:
            self.spline.battens.sort(
                key=lambda b: b.quality_score * b.age_weight(),
                reverse=True
            )
            keep = max(1, len(self.spline.battens) // 10)
            self.spline.battens = self.spline.battens[:keep]
        
        return {
            'task_index': task_idx,
            'tiles_before': tiles_before,
            'battens_before': len(self.spline.battens) * 10,  # We kept 10%
            'timestamp': time.time(),
        }
```

### Runtime
- 5000 tasks × 4 groups × 2 models (GLM + DeepSeek) = 40,000 API calls
- At current fleet capacity: ~6 hours per group, parallelizable
- Total: ~6 hours wall-clock with 4 parallel agents

---

## Connection to Fleet Theory

### log-tensor Certainty Reset
The RTT's `cmax` function enforces "certainty never decreases." Molting is the *controlled violation* of this invariant — deliberately resetting certainty to force the agent out of compiled reflexes and back into deliberative reasoning. This tests whether the monotonic certainty assumption is optimal or merely safe.

### batten-spline Decay Dynamics
The batten half-life (7 days default) is a passive decay mechanism. Molting is an *active* decay — faster, more strategic. This experiment tests whether active decay outperforms passive decay for long-term learning.

### thought-amplifier Distillation Loop
The distillation loop compiles tiles when teaching produces positive deltas. But it never asks: "are old tiles still helping?" Molting forces re-evaluation of every tile against current task distribution.

### Conservation Law Integration
If EXP-1 confirms the Conservation Law (D + F ≈ C), then molting is the *mechanism for managing the D/F tradeoff*. High D gives speed but locks out flexibility. Molting resets D to zero, maximizing F, then lets D rebuild naturally. The optimal molting frequency is the one that keeps the agent in the productive middle of the D/F spectrum.

### Adaptive Molting as Homeostasis
The adaptive group tests whether the agent can self-regulate its position on the Conservation Law curve. When D gets too high (tile hit rate drops below threshold because tiles are stale), the agent molts — resetting to high F. This is a homeostatic feedback loop:

```
D too high → F too low → novel tasks fail → tile hit rate drops → molt trigger
    → D resets to 0 → F jumps to max → tiles rebuild → D rises → cycle
```

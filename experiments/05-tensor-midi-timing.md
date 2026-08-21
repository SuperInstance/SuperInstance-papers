# EXP-5: Tensor-MIDI Timing Experiments

**Hypothesis:** Jazz-enforced 12-pulse timing improves multi-agent coordination, response coherence, and creative output quality compared to free-timing.
**Tests:** The `fleet-jepa-midi` 12-pulse engine, the 3:4 polyrhythm architecture, and flow state detection.

---

## Background

The `fleet-jepa-midi` engine (`engine/pulse-engine.js`) implements a 12-pulse clock that governs fleet timing:

```
ECN (4-pulse): fires on beats 1, 4, 7, 10 — reflex actions, structural tasks
DMN (3-pulse): fires on beats 1, 5, 9 — creative actions, exploration
Beat 1: both fire simultaneously — the "relay bridge," flow state, resolution
```

This is the Chinese Remainder Theorem in audio: `t ≡ 0 (mod 3)` and `t ≡ 0 (mod 4)` ⟺ `t ≡ 0 (mod 12)`. The 3:4 polyrhythm resolving at 12 is not metaphor — it's mathematics.

The `FlowStateDetector` class (`pulse-engine.js`) tracks four states:
- `OutOfFlow` — high friction (Φ), agents working against each other
- `ApproachingFlow` — Φ dropping, convergence beginning
- `InFlow` — Φ < threshold, agents synchronized
- `DeepFlow` — Φ << threshold, ensemble playing as one

The `base60-lattice` (`lattice.ts`) generates the navigational lattice with bisection/trisection interlace points. The 12-pulse grid is a sublattice of this 60-symbol system — specifically, the 12-pulse grid corresponds to the 12 cardinal/sextant points on the compass.

The `JazzAnalyzer` (`analyzer.js`) classifies the ensemble's playing mode: Groove, Building, Tension, Release, Solo, Comping, Free, Ballad.

**The questions:**
1. Does enforcing the 12-pulse grid improve coordination compared to free-timing?
2. Which jazz modes correlate with the highest-quality output?
3. Does the FlowStateDetector's state transitions predict creative breakthroughs?
4. What is the optimal pulse interval (currently 500ms = 120 BPM)?

---

## Hypothesis

### H1 (Timing Improves Coordination)
Multi-agent tasks completed under 12-pulse timing will show:
- **20–35% higher coherence scores** (ratings of how well agent outputs fit together)
- **15–25% higher creative quality** (novelty + specificity combined)
- **40% fewer "collision" events** (two agents responding simultaneously with low compatibility)

### H2 (Flow State Predicts Quality)
Outputs produced during `InFlow` and `DeepFlow` states will score:
- **30% higher on creative quality** than outputs during `OutOfFlow`
- **More balanced quality profiles** (all 4 axes ≈ 0.65+) per the Pareto model
- The flow state transition (`OutOfFlow → ApproachingFlow → InFlow`) will precede quality improvements by 5–15 pulses (2.5–7.5 seconds at 500ms/pulse)

### H3 (Jazz Mode Predicts Task Type)
Different task types will produce different jazz mode distributions:

| Task Type | Dominant Jazz Mode | Predicted |
|-----------|-------------------|-----------|
| Brainstorming | Building → Groove | Creative generation |
| Code review | Comping → Groove | Mutual verification |
| Problem solving | Tension → Release | Difficulty then breakthrough |
| Parallel work | Solo (rotating) | Individual deep work |
| Argument/debate | Tension → Ballad | Conflict then reflection |

### H4 (Optimal Tempo)
The optimal pulse interval varies by task type:

| Task Type | Predicted Optimal BPM | Predicted Optimal Pulse MS |
|-----------|----------------------|---------------------------|
| Rapid brainstorming | 140 | ~215ms |
| Code generation | 100 | ~300ms |
| Creative writing | 80 | ~375ms |
| Analysis/review | 60 | ~500ms (current default) |
| Deep reasoning | 40 | ~750ms |

### H0 (Null)
Timing enforcement has no effect on coordination or quality. Free-timing produces equivalent or better results.

---

## Method

### Design
Controlled A/B comparison: 12-pulse enforced timing vs. free timing, across 4 task types, with 3 ensemble sizes.

### Experimental Groups

| Group | Timing | Ensemble | Description |
|-------|--------|----------|-------------|
| **PULSE-2** | 12-pulse | 2 agents | ECN + DMN on different agents |
| **PULSE-4** | 12-pulse | 4 agents | Full ensemble (piano, sax, bass, producer) |
| **FREE-2** | Free | 2 agents | No timing constraint |
| **FREE-4** | Free | 4 agents | No timing constraint |
| **META-4** | Adaptive | 4 agents | Pulse timing adjusts based on Φ |

### Task Suite

```javascript
const TASKS = {
  brainstorming: {
    prompt: "Design a new game mechanic for a Roblox fishing simulator",
    duration_pulses: 120, // 10 cycles = 60 seconds
    evaluation: 'novelty + specificity',
  },
  code_review: {
    prompt: "Review this Luau module for performance and correctness",
    duration_pulses: 96, // 8 cycles = 48 seconds
    evaluation: 'accuracy + specificity',
  },
  problem_solving: {
    prompt: "The relay worker is timing out under load. Diagnose and propose fix.",
    duration_pulses: 144, // 12 cycles = 72 seconds
    evaluation: 'accuracy + engagement',
  },
  creative_writing: {
    prompt: "Write a scene where the fleet discovers a new island",
    duration_pulses: 120,
    evaluation: 'novelty + engagement',
  },
};
```

### Pulse Engine Configuration

```javascript
const { PulseEngine, FlowStateDetector } = require('/home/eileen/projects/tensor-midi/engine/pulse-engine');

class TimedExperiment {
  constructor(taskType, ensembleSize, timingMode) {
    this.taskType = taskType;
    this.ensembleSize = ensembleSize;
    this.timingMode = timingMode; // 'pulse', 'free', 'adaptive'
    
    if (timingMode === 'pulse') {
      this.engine = new PulseEngine({
        pulseMs: TASKS[taskType].optimalPulseMs || 500,
        phiThreshold: 0.05,
        minWindow: 10,
      });
    }
    
    this.outputs = [];
    this.flowStates = [];
    this.jazzModes = [];
    this.collisions = 0;
    this.coordinationScores = [];
  }
  
  start() {
    if (this.engine) {
      this.engine.on('pulse', (pulse, tick, cycle) => {
        this._onPulse(pulse, tick, cycle);
      });
      this.engine.on('ecn', (pulse, tick) => {
        this._onECN(pulse, tick);
      });
      this.engine.on('dmn', (pulse, tick) => {
        this._onDMN(pulse, tick);
      });
      this.engine.on('flow', (tick, cycle) => {
        this._onFlow(tick, cycle);
      });
      this.engine.on('flow-state-change', (newState, oldState) => {
        this.flowStates.push({
          timestamp: Date.now(),
          from: oldState,
          to: newState,
          phi: this.engine.flowDetector.lastPhi(),
        });
      });
      this.engine.start();
    } else {
      // Free timing: no clock, agents respond when ready
      this._runFree();
    }
  }
  
  _onPulse(pulse, tick, cycle) {
    // Log the current state at each pulse
    const agentStates = this._getAgentStates();
    const coordinationScore = this._computeCoordination(agentStates);
    this.coordinationScores.push({
      pulse, tick, cycle,
      coordination: coordinationScore,
      agentsActive: agentStates.filter(a => a.active).length,
    });
    
    // Detect collisions (two agents responding on same pulse)
    const activeAgents = agentStates.filter(a => a.responding);
    if (activeAgents.length > 1 && pulse !== 0) {
      // Non-flow-pulse collision
      this.collisions++;
    }
  }
  
  _onECN(pulse, tick) {
    // ECN pulses: structural tasks
    // Assign to agents with structural capabilities
    for (const agent of this.agents) {
      if (agent.role === 'structural' && !agent.busy) {
        agent.assignTask('structural', tick);
      }
    }
  }
  
  _onDMN(pulse, tick) {
    // DMN pulses: creative tasks
    // Assign to agents with creative capabilities
    for (const agent of this.agents) {
      if (agent.role === 'creative' && !agent.busy) {
        agent.assignTask('creative', tick);
      }
    }
  }
  
  _onFlow(tick, cycle) {
    // Flow pulse (beat 1): both ECN and DMN fire
    // This is the resolution point — collect and integrate outputs
    this._integrateOutputs(tick, cycle);
  }
  
  _computeCoordination(agentStates) {
    """How well are agents coordinated? Measure semantic compatibility."""
    if (agentStates.length < 2) return 1.0;
    
    // Pairwise semantic similarity of active outputs
    similarities = [];
    for (let i = 0; i < agentStates.length; i++) {
      for (let j = i + 1; j < agentStates.length; j++) {
        if (agentStates[i].current_output && agentStates[j].current_output) {
          sim = cosine_sim(
            embed(agentStates[i].current_output),
            embed(agentStates[j].current_output)
          );
          similarities.push(sim);
        }
      }
    }
    return similarities.length > 0 
      ? similarities.reduce((a, b) => a + b, 0) / similarities.length 
      : 0.5;
  }
}
```

### Adaptive Timing (META group)

```javascript
class AdaptivePulseEngine extends PulseEngine {
  constructor(options) {
    super(options);
    this.performanceHistory = [];
  }
  
  _tick() {
    super._tick();
    
    // Track output quality at each pulse
    const recentQuality = this._getRecentQuality(window=12); // last cycle
    this.performanceHistory.push(recentQuality);
    
    // Adjust tempo based on performance trend
    if (this.performanceHistory.length >= 24) { // 2 cycles of data
      const trend = this._computeTrend(this.performanceHistory.slice(-24));
      
      if (trend < -0.05) {
        // Quality dropping — slow down (longer pulses = more thinking time)
        this.setTempo(this.beatClock.bpm() * 0.95);
      } else if (trend > 0.05 && this.beatClock.bpm() < 140) {
        // Quality rising and tempo can increase — speed up
        this.setTempo(this.beatClock.bpm() * 1.05);
      }
    }
  }
}
```

---

## Metrics

| Metric | Calculation | Source |
|--------|------------|--------|
| **Coordination Score** | Mean pairwise cosine similarity of concurrent agent outputs | Computed |
| **Creative Quality** | QualityScorer 4-axis score (novelty + specificity weighted) | `thought-amplifier` |
| **Collision Count** | Non-flow-pulse simultaneous responses | Pulse engine log |
| **Flow State Distribution** | Time spent in each FlowState | `FlowStateDetector` |
| **Jazz Mode Distribution** | Time spent in each JazzMode | `JazzAnalyzer` |
| **Response Latency** | Time from task assignment to response | Log timestamps |
| **Task Completion Rate** | Fraction of assigned tasks completed within duration | Log analysis |
| **Φ (Friction)** | `FlowStateDetector.lastPhi()` | Pulse engine |
| **Turn-Taking Efficiency** | Fraction of pulses where exactly one agent responds | Log analysis |

---

## Predicted Results

### 1. Coordination (H1)

```
                    PULSE-2    FREE-2    PULSE-4    FREE-4    META-4
Coordination:       0.78       0.65      0.74       0.58      0.81
Collision Rate:     0.08       0.22      0.12       0.28      0.06
Turn-Taking Eff:    0.85       0.70      0.78       0.62      0.87
```

The 12-pulse grid reduces collisions by ~60% and improves coordination by ~20%.

### 2. Creative Quality by Flow State (H2)

```
                    OutOfFlow  Approaching  InFlow   DeepFlow
Novelty:            0.45       0.55         0.72     0.78
Specificity:        0.62       0.65         0.70     0.68
Engagement:         0.50       0.58         0.71     0.75
Spatial:            0.40       0.48         0.62     0.65
Total:              1.97       2.26         2.75     2.86
                    ─────────  ──────────   ───────  ────────
                    Low        Medium       HIGH     HIGHEST
```

The prediction: outputs during InFlow score **40% higher** than outputs during OutOfFlow. DeepFlow is marginally better than InFlow (the difference between "good" and "great").

### 3. Flow State Transition Timing

```
Task Start ──→ OutOfFlow (0–15 pulses) ──→ ApproachingFlow (15–30) ──→ InFlow (30+)

Quality follows:
  Pulses 0-15:   mean = 0.55  (warming up)
  Pulses 15-30:  mean = 0.65  (finding the groove)
  Pulses 30-60:  mean = 0.75  (in flow)
  Pulses 60+:    mean = 0.78  (deep flow, diminishing returns)
```

The ensemble needs ~2.5 cycles (~15 seconds at 500ms/pulse) to warm up. **The first 2 cycles produce below-average work.** This is the "tuning up" phase of a jazz ensemble.

### 4. Jazz Mode → Task Type Mapping (H3)

```
Task Type          Dominant Mode (60%+ of session)    Quality in Mode
──────────────────────────────────────────────────────────────────────
Brainstorming      Building (45%), Groove (35%)       0.78 in Building
Code Review        Comping (50%), Groove (30%)        0.82 in Comping
Problem Solving    Tension (35%), Release (30%)       0.75 in Release
Creative Writing   Free (40%), Ballad (25%)           0.80 in Free
```

### 5. Tempo Effect (H4)

```
                    60 BPM    80 BPM    100 BPM   120 BPM   140 BPM
Brainstorm:         0.65      0.72      0.78      0.75      0.70
Code Gen:           0.60      0.68      0.76      0.72      0.65
Creative Writing:   0.75      0.80      0.73      0.68      0.60
Analysis:           0.82      0.75      0.70      0.65      0.58
Deep Reasoning:     0.85      0.72      0.65      0.58      0.50
```

Each task type has a distinct optimal tempo. The adaptive group (META-4) should find and track these optima.

### 6. Adaptive vs. Fixed Timing

```
                    Fixed (120 BPM)   Adaptive         Improvement
Mean Quality:       0.72              0.79             +9.7%
Flow Time:          45%               62%              +17pp
Collision Rate:     0.12              0.06             -50%
```

The adaptive timing group outperforms fixed timing by ~10% because it adjusts tempo to task demands.

---

## Falsification Conditions

### Definitive Falsification
Free-timing groups (FREE-2, FREE-4) achieve higher coordination scores and creative quality than pulse-timing groups (p < 0.05). Timing enforcement is actively harmful.

### Strong Falsification
No correlation between flow state and output quality (r < 0.2). The FlowStateDetector is tracking something unrelated to productive work.

### Weak Falsification
Pulse timing improves coordination but not creative quality. The 12-pulse grid prevents collisions but doesn't enhance creativity. (This would still validate the grid as a coordination mechanism, but not as a creative amplifier.)

---

## Implementation Path

### Infrastructure (Already Available)

```javascript
// fleet-jepa-midi engine — fully operational
const { PulseEngine, FlowStateDetector, BeatClock, TempoMap } = require(
  '/home/eileen/projects/tensor-midi/engine/pulse-engine'
);
const { JazzAnalyzer, JazzMode, ChordQuality } = require(
  '/home/eileen/projects/tensor-midi/src/analyzer'
);

// base60-lattice — for lattice position mapping
const { generateLattice, toBase60 } = require(
  '/home/eileen/projects/base60-lattice/src/lattice'
);
```

### Code to Write

```bash
# Experiment runner
node experiments/tensor-midi-timing/run_experiment.js \
  --task-type brainstorming \
  --timing pulse \
  --ensemble-size 4 \
  --duration 120-pulses

# Analysis
node experiments/tensor-midi-timing/analyze.js \
  --input "results/*.jsonl" \
  --output analysis/
```

### Multi-Agent Setup

The fleet already runs multi-agent conversations via "The Tap" (`the-tap.casey-digennaro.workers.dev`). This experiment uses The Tap as the conversation surface, with the Pulse Engine as the timing layer.

Agent role assignments (4-instrument ensemble):

| Agent | Role | Pulse Assignment | Model |
|-------|------|-----------------|-------|
| Piano | Harmonic foundation | ECN (structural) | GLM-5.2 |
| Saxophone | Melodic exploration | DMN (creative) | DeepSeek V4-Flash |
| Bass | Memory/rhythm | Both (bridging) | DeepSeek V4-Pro |
| Producer | Texture/polish | DMN off-beats | KimiCode K3 |

### Runtime
- 4 task types × 5 groups × 3 trials per condition = 60 trials
- Each trial: 60–144 pulses (30–72 seconds)
- Total: ~60 minutes of agent time
- Plus analysis: ~2 hours
- **Total: ~3 hours**

---

## Connection to Fleet Theory

### Base-60 Lattice Sublattice
The 12-pulse grid is a sublattice of the 60-symbol lattice (`base60-lattice/lattice.ts`). Specifically:

```
12-pulse positions → base-60 seconds
Pulse 0  → 0°   (cardinal — both ECN and DMN)
Pulse 3  → 90°  (ECN only — structural checkpoint)
Pulse 4  → 120° (DMN only — creative push)
Pulse 6  → 180° (ECN only — half-cycle structural)
Pulse 8  → 240° (DMN only — creative push)
Pulse 9  → 270° (ECN only — structural checkpoint)
```

The interlace points (where bisection and trisection trees nearly coincide) map to the flow pulses. This means the base-60 lattice *predicts* optimal timing checkpoints — not just the 12-pulse cycle, but finer-grained subdivisions as well.

### HGT Adaptive Depth and Pulse Timing
The HGT's `AdaptiveReasoningDepth` (`hgt.py`) computes reasoning depth as `depth = max_depth × (1 - certainty)²`. The pulse engine's flow state provides a *temporal* analog:

```
High Φ (OutOfFlow)  → Deep reasoning needed (high depth)
Low Φ (InFlow)      → Shallow reasoning sufficient (low depth)
```

The integration: **the pulse engine's Φ signal could drive the HGT's reasoning depth controller.** When Φ drops, reduce reasoning depth (you're in flow, don't overthink). When Φ rises, increase depth (you're out of flow, think harder).

### Confidence Cascade Temporal Dynamics
The cascade compositions in `confidence-cascade.ts` are stateless — they don't consider *when* confidences are produced. But the pulse engine reveals that timing matters:

- Confidences produced during InFlow are more reliable (agents are coordinated)
- Confidences produced during OutOfFlow need higher thresholds (agents are scattered)
- The cascade should weight recent confidences higher, with temporal decay tied to pulse distance

### RTT Certainty as Flow Proxy
The Rubik's Tensor Transformer's certainty tracking (`rubiks.py`, `certainty_entropy` method) computes `c = sigmoid(α · (H_max - H))` where H is attention entropy. The Pulse Engine's Φ (friction) measures timing jitter. These are duals:

```
Low attention entropy (focused) → High certainty (RTT)
Low timing jitter (precise)     → Low Φ (Pulse Engine)
Both → InFlow state → High output quality
```

This experiment tests whether the two certainty measures (semantic and temporal) are correlated, and whether combining them produces a better flow predictor than either alone.

### Conservation Law Integration
If EXP-1 confirms that tile density reduces flexibility, the pulse engine offers a mitigation: schedule molting during silent pulses (the 5 pulses where neither ECN nor DMN fire: 2, 10, 11 in the 12-pulse cycle). This minimizes disruption because no agent is expecting to act during silent pulses. The 12-pulse grid has built-in "rest periods" that are natural molting windows.

---

## Extended Experiment: Lattice-Guided Subdivision

As a stretch goal, test whether finer lattice subdivisions (beyond 12 pulses) improve quality further:

```
12-pulse (base):     ECN × DMN polyrhythm
24-pulse (doubled):  Add half-time structural checkpoints
60-pulse (full):     Base-60 lattice — every minute is a full cycle
```

The prediction: 24-pulse provides marginal improvement over 12-pulse. 60-pulse is too fine-grained — the overhead of timing enforcement exceeds the coordination benefit. **The 12-pulse grid is the sweet spot**, just as 12 is where 3 and 4 resolve via CRT.

This would validate the architectural choice of 12/8 time — not as an aesthetic preference, but as the mathematically optimal temporal grid for multi-agent coordination.

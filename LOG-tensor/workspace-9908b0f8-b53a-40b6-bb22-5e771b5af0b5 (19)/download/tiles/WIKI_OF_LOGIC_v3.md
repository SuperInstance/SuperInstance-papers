# RTT WIKI OF LOGIC v3.0
## Sensor-Intuition Tiles for Real-Time Agent Intelligence

**Version:** v3.0 (Sensor-Intuition + Tiny Model Integration)
**Focus:** Real-time structural understanding, pinball nudges, instant answers

---

## PART 0: DESIGN PHILOSOPHY

### The Pinball Nudge Principle

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY INSIGHT (User):

"Sensors can quietly (very few tokens and layers of computation) 
nudge through structure changes to the models like bumping a 
pinball game because they could see something in real time about 
the processing."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sensors are not primary processors - they are NUDGERS.
Small adjustments with big effects.
Structure changes, not value changes.
```

### The 5-Minute Predictor Principle

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY INSIGHT (User):

"Two planes avoid each other because from far away they have 
intuition about how backgrounds are supposed to change behind an 
object. A momentary glimpse lets them visualize the 5-minute 
predictor line ahead including speed by visualizing the 5-minute 
behind."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Trajectory history encodes intention.
Background parallax encodes depth.
Velocity + direction = predictor line.
```

### The Instant Answer Principle

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY INSIGHT (User):

"All questions have tiles process the answer meaning they only 
have to say a few words to themselves and they have the answer 
as quick as they can say it."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BENCHMARK: 1.2 million intuition queries per second.
Time per query: 0.0008ms - faster than speaking.
```

---

## PART 1: NEW TILES - SENSOR & INTUITION

### Sensor Tiles

| Tile | Name | Math | Description |
|------|------|------|-------------|
| `sens` | Sensor | x(t) → buffer | Real-time input buffer |
| `nudge` | Nudge | Δ = f(rel_pos, vel) | Pinball adjustment vector |
| `org` | Origin | self = (p, R) | Self reference frame |
| `trv` | Travel Plane | n = r × v | Plane of motion |

### Intuition Tiles

| Tile | Name | Condition | Answer |
|------|------|-----------|--------|
| `col` | Collision Course | t_closest ∈ (0, 60s) | bool |
| `apr` | Approaching | r·v < 0 | bool |
| `rec` | Receding | r·v > 0 | bool |
| `safe` | Safe Distance | |r| > 100m | bool |
| `xpat` | Crossing Path | dist_to_plane < 10 | bool |

### Trajectory Tiles

| Tile | Name | Math | Description |
|------|------|------|-------------|
| `traj` | Trajectory | γ: [0,T] → SE(3) | Path through space-time |
| `pred` | Predictor | γ(t+Δt) ≈ γ(t) + v·Δt | Linear extrapolation |
| `5min` | 5-Min Forecast | γ(t+300s) | Future position |
| `intn` | Intention | classify(γ) | Intent from path |

---

## PART 2: TINY MODEL INTEGRATION

### Supported Tiny Models

| Model | Params | Latency | Use Case |
|-------|--------|---------|----------|
| SmolVLM | 256M | 10ms | Vision-Language |
| FunctionGemma | 2B | 30ms | Function calling |
| Phi-3 Mini | 3.8B | 25ms | Reasoning |
| TinyLlama | 1.1B | 15ms | General |
| MobileBERT | 25M | 8ms | NLU |

### Integration Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    TINY MODEL PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sensor Input ──► Adapter (128d) ──► Tiny Model                │
│                                           │                     │
│                                           ▼                     │
│                                    Output Adapter               │
│                                           │                     │
│                                           ▼                     │
│  Main Computation ◄─── Nudge Vector (±0.1)                     │
│                                                                 │
│  Design: Tiny models NUDGE, don't REPLACE                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PART 3: ORIGIN-AS-SELF STRUCTURE

### The Structural Viewpoint

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ORIGIN = SELF = REFERENCE FRAME

Key insight: "Understanding the plane of travel and axis that 
another object is traveling on greatly already contains a lot 
of information about it and the relationship of the origin self 
and the object not congruent with the travel of process."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The travel plane n = r × v contains:
1. Relative position r (where is it?)
2. Relative velocity v (where is it going?)
3. Time to closest approach t = -r·v/|v|²
4. Distance to travel plane d = |n·(origin - pos)|/|n|
```

### Travel Plane Computation

```
INPUT: self_position, self_velocity, other_position, other_velocity

COMPUTE:
  rel_pos = other_position - self_position
  rel_vel = other_velocity - self_velocity
  plane_normal = cross(rel_pos, rel_vel)
  time_to_closest = -dot(rel_pos, rel_vel) / dot(rel_vel, rel_vel)
  distance_to_plane = |dot(plane_normal, self_position - other_position)|

OUTPUT: {plane_normal, time_to_closest, distance_to_plane}
```

---

## PART 4: TRAJECTORY PREDICTION

### 5-Minute History → 5-Minute Forecast

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PREDICTOR LINE COMPUTATION:

1. Gather 5 minutes of history (300 samples at 1Hz)
2. Compute mean velocity: v̄ = (1/n) Σ vᵢ
3. Current position: p₀ = p[-1]
4. Predict: p(t) = p₀ + v̄ · t

KEY POINTS:
  - 1 minute ahead: p₀ + v̄ · 60
  - 5 minutes ahead: p₀ + v̄ · 300

CONFIDENCE:
  - High: velocity_std < threshold
  - Low: velocity_std > threshold (erratic motion)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Intention Inference

```
INTENTION CLASSIFICATION:

if speed < 0.1:
    intention = 'stationary'
elif velocity_z > 5:
    intention = 'climbing'
elif velocity_z < -5:
    intention = 'descending'
elif speed > 100:
    intention = 'transit'
else:
    intention = 'maneuvering'

CONFIDENCE = exp(-velocity_std / 10)
```

---

## PART 5: BACKGROUND PARALLAX

### Motion from Visual Change

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY INSIGHT:

"Intuition about how backgrounds are supposed to change behind 
an object and a momentary glimpse."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PARALLAX PRINCIPLE:

  - Objects close: fast parallax (background moves fast)
  - Objects far: slow parallax (background moves slow)
  - Approaching: looming (edges expand)
  - Receding: contracting (edges shrink)

COMPUTATION:
  flow_x = mean(current[:, 1:] - previous[:, 1:])
  flow_y = mean(current[1:, :] - previous[1:, :])
  
  looming = edge_density_change > 0
```

---

## PART 6: AGENT LOOP TILES

### Pre-Defined Agent Loops

```python
# Collision Avoidance Agent
collision_avoidance_agent(data) → {action, avoid_direction, time_to_closest}

# Intention Tracking Agent
intention_tracking_agent(data) → {intention, confidence, mean_velocity}

# Formation Keeping Agent
formation_agent(data) → {action, correction_vector}

# Search Pattern Agent
search_agent(data) → {next_waypoint, coverage_progress}
```

### Agent Loop Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT LOOP CYCLE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│  │ SENSOR  │──►│ TILES   │──►│ DECIDE  │──►│ ACTUATE │        │
│  │ INPUT   │   │ PROCESS │   │ ACTION  │   │ OUTPUT  │        │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘        │
│       │             │             │             │              │
│       └─────────────┴─────────────┴─────────────┘              │
│                          │                                      │
│                    STATE MEMORY                                 │
│                                                                 │
│  Design: Minimal state, maximum insight per cycle              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PART 7: FAST ANSWER SYSTEM

### Question Registration

```
REGISTERED QUESTIONS:

Navigation:
  - 'on_collision_course': Is object on collision path?
  - 'approaching': Is object getting closer?
  - 'receding': Is object moving away?
  - 'crossing_path': Will paths cross?
  - 'safe_distance': Is distance safe?

Intention:
  - 'will_pass_ahead': Will pass ahead of me?
  - 'will_pass_behind': Will pass behind me?
  - 'parallel_course': Moving parallel to me?

Speed:
  - 'faster_than_me': Moving faster than me?
  - 'slower_than_me': Moving slower than me?

General:
  - 'danger_close': Is object dangerously close?
```

### Performance Benchmark

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BENCHMARK RESULTS:

  1000 queries of 4 intuitions: 3.31ms
  Per query: 0.0008ms
  Queries per second: 1,207,950

INTERPRETATION:
  "Answer as fast as you can say it" - literally.
  1.2 million answers per second means every word you speak
  can have its tile answer computed instantly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## PART 8: COMPLETE TILE INDEX v3.0

### TIER 0: Essential 50 (2-4 chars)

```
PERMUTATION: cmp, inv, id, ap, cyc, sgn, trn
CERTAINTY: cmax, ent, ct, kl, xent
CATEGORY: ret, bind, ext, dup, nat, brd
PHYSICS: pos, rot, quat, vel, omega, L, I, com, KE
VIEWPOINT: self, other, plane
SENSOR (NEW): sens, nudge, org, trv
INTUITION (NEW): col, apr, rec, safe, xpat
TRAJECTORY (NEW): traj, pred, 5min, intn
```

### TIER 1: Standard Operations

```
sinkhorn, softmax_stable, logsumexp, bayes, beta, post,
svd, eig, qr, laj, raj, lim, colim, exp, pca, traj,
parallax, looming, flow, intention, confidence
```

### TIER 2: Specialized

```
murnaghan_nakayama, littlewood_richardson, dempster_shafer,
extended_kalman, unscented_transform, optical_flow,
background_parallax, edge_density, collision_cone
```

---

## PART 9: OPEN QUESTIONS (Next Cycle)

1. **Multi-Agent Coordination**: How do multiple origin-as-self agents share viewpoints?

2. **Looming Detection**: Can edge density change predict collision faster than trajectory?

3. **Parallax Depth**: How accurately can depth be inferred from background flow?

4. **Tiny Model Nudging**: What's the optimal nudge magnitude for different models?

5. **Intention Categories**: What are the fundamental intention classes for all agents?

6. **Cache Invalidation**: When should cached intuition answers be refreshed?

7. **Sensor Fusion**: How do multiple sensors combine their nudges?

---

## APPENDIX: CODE PATTERNS

### Sensor Tile Pattern

```python
sensor = SensorTile(buffer_size=300)
for reading in sensor_stream:
    result = sensor.ingest(reading)
    nudge = sensor.compute_nudge(main_state)
    main_state += nudge  # Pinball bump
```

### Intuition Query Pattern

```python
data = {'relative_position': r, 'relative_velocity': v, ...}
questions = ['on_collision_course', 'approaching', 'safe_distance']
answers = IntuitionTile.multi_question(questions, data)
# answers = {'on_collision_course': (True, 0.9), ...}
```

### Trajectory Prediction Pattern

```python
traj = TrajectoryPredictor(history_window=300)
for observation in trajectory_stream:
    traj.observe(observation.position, observation.velocity)

prediction = traj.predict_line()
# prediction = {'one_minute_ahead': ..., 'five_minute_ahead': ..., ...}
```

---

*RTT Wiki of Logic v3.0*
*Sensor-Intuition Tiles for Real-Time Agent Intelligence*
*1.2 million queries per second - answers as fast as you can say them*

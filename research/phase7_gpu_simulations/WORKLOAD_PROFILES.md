# Workload Profiles Catalog

Complete catalog of workload profiles for hybrid orchestration.

---

## Overview

Workload profiles define the characteristics of different simulation types, enabling intelligent routing decisions between local GPU and cloud infrastructure.

---

## Profile Categories

### 1. CRDT Operations

#### crdt_merge_small

**Description:** Small CRDT merge operation (< 1K elements)

**Characteristics:**
- **VRAM:** 0.1 GB
- **Compute:** 5 ms (TRIVIAL)
- **Cost:** $0.0001 per execution
- **Batchable:** Yes
- **Latency Sensitive:** Yes

**Routing Recommendation:** Local GPU (prefer low latency)

**Use Cases:**
- Real-time collaboration updates
- Small state synchronizations
- Frequent incremental merges

#### crdt_merge_medium

**Description:** Medium CRDT merge operation (1K-100K elements)

**Characteristics:**
- **VRAM:** 0.5 GB
- **Compute:** 50 ms (LIGHT)
- **Cost:** $0.001 per execution
- **Batchable:** Yes
- **Latency Sensitive:** Yes

**Routing Recommendation:** Local GPU (cost-effective)

**Use Cases:**
- Document synchronization
- State machine updates
- Incremental data processing

#### crdt_merge_large

**Description:** Large CRDT merge operation (> 100K elements)

**Characteristics:**
- **VRAM:** 4.0 GB
- **Compute:** 500 ms (MODERATE)
- **Cost:** $0.005 per execution
- **Batchable:** Yes
- **Latency Sensitive:** No

**Routing Recommendation:** Local GPU if VRAM available, otherwise cloud

**Use Cases:**
- Bulk data synchronization
- Batch state updates
- Large dataset merges

---

### 2. Emergence Detection

#### emergence_detection

**Description:** Transfer entropy and novelty detection

**Characteristics:**
- **VRAM:** 2.0 GB
- **Compute:** 1000 ms (MODERATE)
- **Cost:** $0.008 per execution
- **Batchable:** No
- **Latency Sensitive:** No
- **Stateful:** Yes

**Routing Recommendation:** Cloud for better performance on large systems

**Use Cases:**
- Agent network analysis
- Novelty detection in complex systems
- Transfer entropy computation

**Performance Notes:**
- GPU acceleration provides 3-5x speedup
- Memory usage scales with network size
- Requires sequential state updates

---

### 3. Neural Evolution

#### neural_evolution

**Description:** Evolutionary neural network optimization

**Characteristics:**
- **VRAM:** 5.5 GB
- **Compute:** 50000 ms (INTENSE)
- **Cost:** $0.15 per execution
- **Batchable:** Yes
- **Latency Sensitive:** No
- **Stateful:** Yes

**Routing Recommendation:** Cloud (exceeds local VRAM, heavy compute)

**Use Cases:**
- Neural architecture search
- Hyperparameter optimization
- Evolutionary training

**Performance Notes:**
- Requires significant GPU memory
- Cloud provides 2-3x speedup
- Can be parallelized across generations

---

### 4. Value Network Training

#### value_network_train

**Description:** TD(λ) value network training

**Characteristics:**
- **VRAM:** 3.5 GB
- **Compute:** 10000 ms (HEAVY)
- **Cost:** $0.05 per execution
- **Batchable:** Yes
- **Latency Sensitive:** No
- **Stateful:** Yes

**Routing Recommendation:** Cloud for speed, local if cost-sensitive

**Use Cases:**
- Reinforcement learning
- Value function approximation
- Policy evaluation

**Performance Notes:**
- Benefits from GPU acceleration
- Batch training improves efficiency
- Cloud offers faster convergence

---

### 5. Self-Play Simulation

#### self_play

**Description:** Self-play tournament with ELO tracking

**Characteristics:**
- **VRAM:** 2.5 GB
- **Compute:** 5000 ms (HEAVY)
- **Cost:** $0.03 per execution
- **Batchable:** Yes
- **Latency Sensitive:** No
- **Stateful:** Yes

**Routing Recommendation:** Local GPU for small tournaments, cloud for large

**Use Cases:**
- Game AI training
- Adversarial learning
- Strategy optimization

**Performance Notes:**
- Parallelizable across games
- ELO tracking requires state management
- Network overhead negligible for long games

---

### 6. Hydraulic Simulation

#### hydraulic_sim

**Description:** Pressure-flow agent network simulation

**Characteristics:**
- **VRAM:** 4.5 GB
- **Compute:** 8000 ms (HEAVY)
- **Cost:** $0.06 per execution
- **Batchable:** No
- **Latency Sensitive:** No
- **Stateful:** Yes

**Routing Recommendation:** Cloud (approaches VRAM limit)

**Use Cases:**
- Fluid dynamics simulation
- Agent network modeling
- Emergent behavior study

**Performance Notes:**
- Computationally intensive
- Benefits from large GPU memory
- Real-time not possible for large systems

---

### 7. Batch Processing

#### batch_crdt_merges

**Description:** Batch processing of multiple CRDT merges

**Characteristics:**
- **VRAM:** 6.0 GB
- **Compute:** 2000 ms (MODERATE)
- **Cost:** $0.02 per execution
- **Batchable:** Yes
- **Latency Sensitive:** No
- **Stateless:** Yes

**Routing Recommendation:** Cloud (exceeds local VRAM)

**Use Cases:**
- Bulk data processing
- Nightly batch jobs
- Data pipeline processing

**Performance Notes:**
- Designed for throughput, not latency
- Can process 1000+ merges per batch
- Cloud provides cost-effective scaling

---

### 8. Inference

#### inference_light

**Description:** Lightweight model inference

**Characteristics:**
- **VRAM:** 1.5 GB
- **Compute:** 100 ms (LIGHT)
- **Cost:** $0.002 per execution
- **Batchable:** Yes
- **Latency Sensitive:** Yes
- **Stateless:** Yes

**Routing Recommendation:** Local GPU (low latency, low cost)

**Use Cases:**
- Real-time predictions
- Model serving
- Interactive applications

**Performance Notes:**
- Latency critical
- Local GPU avoids network overhead
- Batch inference improves throughput

---

### 9. Data Processing

#### data_processing

**Description:** Large-scale data processing and transformation

**Characteristics:**
- **VRAM:** 3.0 GB
- **Compute:** 3000 ms (MODERATE)
- **Cost:** $0.015 per execution
- **Batchable:** Yes
- **Latency Sensitive:** No
- **Stateless:** Yes

**Routing Recommendation:** Local GPU for moderate tasks, cloud for large

**Use Cases:**
- Data transformation
- Feature extraction
- Preprocessing pipelines

**Performance Notes:**
- GPU provides significant speedup
- I/O bound for large datasets
- Batch processing improves efficiency

---

### 10. Validation Testing

#### validation_test

**Description:** Quick validation and testing

**Characteristics:**
- **VRAM:** 0.5 GB
- **Compute:** 20 ms (TRIVIAL)
- **Cost:** $0.0005 per execution
- **Batchable:** Yes
- **Latency Sensitive:** Yes
- **Stateless:** Yes

**Routing Recommendation:** Local GPU (fastest option)

**Use Cases:**
- Unit testing
- Validation checks
- Development iterations

**Performance Notes:**
- Extremely fast
- No need for cloud overhead
- Can run 1000s per minute locally

---

## Profile Characteristics

### Memory Profiles

| Profile | VRAM Range | Description |
|---------|------------|-------------|
| TINY | < 100MB | Fits easily in GPU memory |
| SMALL | 100MB - 1GB | Minimal memory usage |
| MEDIUM | 1GB - 4GB | Moderate memory requirements |
| LARGE | 4GB - 8GB | Significant memory usage |
| MASSIVE | > 8GB | Exceeds typical GPU memory |

### Compute Intensity

| Intensity | Time Range | Description |
|-----------|------------|-------------|
| TRIVIAL | < 1ms | Negligible computation |
| LIGHT | 1ms - 100ms | Quick operations |
| MODERATE | 100ms - 1s | Noticeable computation |
| HEAVY | 1s - 10s | Significant computation |
| INTENSE | > 10s | Very long-running |

### Cost Categories

| Category | Cost Range | Routing Implication |
|----------|------------|---------------------|
| TRIVIAL | < $0.001 | Always local if possible |
| LOW | $0.001 - $0.01 | Local preferred |
| MODERATE | $0.01 - $0.10 | Decision based on performance |
| HIGH | $0.10 - $1.00 | Cloud often better |
| EXPENSIVE | > $1.00 | Must justify cloud usage |

---

## Custom Profiles

### Creating Custom Profiles

```python
from workload_profiler import WorkloadProfile, WorkloadProfiler

# Define custom profile
custom_profile = WorkloadProfile(
    name='my_custom_simulation',
    description='My specialized simulation',
    vram_gb=2.5,
    compute_ms=1500,
    memory_profile=MemoryProfile.MEDIUM,
    compute_intensity=ComputeIntensity.MODERATE,
    cloud_cost_usd=0.012,
    batchable=True,
    latency_sensitive=False,
    parallelizable=True,
    stateless=True,
    gpu_acceleratable=True,
    cpu_fallback=True
)

# Add to profiler
profiler = WorkloadProfiler()
profiler.add_custom_profile(custom_profile)
```

### Auto-Profiling from Parameters

```python
# Let profiler analyze from parameters
profile = profiler.analyze_workload(
    'my_simulation',
    {
        'data_size': 50000,
        'iterations': 100,
        'batch_size': 32,
        'latency_critical': False
    }
)
```

---

## Profile Optimization

### Measuring Actual Performance

```python
# Execute simulation
result = await orchestrator.orchestrate_simulation(
    'my_simulation',
    parameters
)

# Record actual performance
profiler.record_performance(
    'my_simulation',
    predicted_profile,
    actual_vram_gb=result.metadata['vram_used_gb'],
    actual_compute_ms=result.metadata['execution_time_ms']
)

# Check accuracy
accuracy = profiler.get_profile_accuracy('my_simulation')
print(f"Average VRAM error: {accuracy['avg_vram_error_gb']:.2f} GB")
print(f"Average compute error: {accuracy['avg_compute_error_pct']:.1f}%")
```

### Updating Profiles

After sufficient measurements, update profiles:

```python
# Get profile accuracy
accuracy = profiler.get_profile_accuracy('simulation_type')

if accuracy['avg_vram_error_gb'] > 0.5:
    # Profile is inaccurate, update it
    profile = profiler.get_profile('simulation_type')
    profile.vram_gb += accuracy['avg_vram_error_gb']
```

---

## Best Practices

### 1. Start with Estimates

Use auto-profiling to get initial estimates:

```python
profile = profiler.analyze_workload('new_sim', parameters)
```

### 2. Measure Actual Performance

Record actuals after execution:

```python
profiler.record_performance(sim_type, profile, actual_vram, actual_time)
```

### 3. Iterate on Accuracy

Continuously refine profiles:

```python
accuracy = profiler.get_profile_accuracy(sim_type)
if accuracy['avg_compute_error_pct'] > 20:
    # Profile needs refinement
    pass
```

### 4. Use Similar Profiles

Leverage existing profiles for new simulations:

```python
# Find similar profile
similar = profiler.get_profile('crdt_merge_medium')
# Adjust for new simulation
new_profile = WorkloadProfile(
    **similar.to_dict(),
    name='new_simulation',
    vram_gb=similar.vram_gb * 1.5  # 50% more memory
)
```

---

## Troubleshooting

### Profile Inaccurate VRAM

**Symptoms:** Frequent OOM errors on local GPU

**Solution:** Increase VRAM estimate by 20-50%

```python
profile.vram_gb *= 1.3
```

### Profile Inaccurate Compute Time

**Symptoms:** Poor routing decisions, unexpected costs

**Solution:** Measure actual times and update profile

```python
profile.compute_ms = actual_compute_ms
```

### Wrong Backend Selection

**Symptoms:** Tasks routed to suboptimal backend

**Solution:** Review profile characteristics, adjust thresholds

```python
# Make less latency sensitive
profile.latency_sensitive = False

# Or increase cost threshold
orchestrator.policies['cost_threshold_usd'] = 0.02
```

---

*Last Updated: 2026-03-13*
*Version: 1.0.0*

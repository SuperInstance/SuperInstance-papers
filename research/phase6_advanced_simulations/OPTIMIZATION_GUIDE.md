# Deployment Optimization Guide

This guide explains how to use the hardware-accurate simulation framework to optimize deployments for performance, energy efficiency, and thermal constraints.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Performance Optimization](#performance-optimization)
3. [Energy Optimization](#energy-optimization)
4. [Thermal Optimization](#thermal-optimization)
5. [Multi-Objective Optimization](#multi-objective-optimization)
6. [Real-World Examples](#real-world-examples)
7. [API Reference](#api-reference)

---

## Quick Start {#quick-start}

### Installation

```bash
# Clone repository
git clone https://github.com/SuperInstance/polln.git
cd polln/research/phase6_advanced_simulations

# Install dependencies
pip install numpy pandas matplotlib
```

### Basic Usage

```python
from hardware_accurate_simulation import (
    HardwareAccurateSimulation,
    create_default_hardware,
    HardwareConfig
)

# Create simulator with default hardware
config = create_default_hardware()
sim = HardwareAccurateSimulation(config)

# Predict performance for a model
model_config = {
    'type': 'transformer',
    'parameters': 125_000_000,
    'hidden_dim': 768,
    'num_layers': 12,
    'precision': 'fp16',
    'use_gpu': True,
}
input_shape = (512, 768)
performance = sim.predict_performance(model_config, input_shape, batch_size=4)

print(f"Latency: {performance['latency_ms']:.2f} ms")
print(f"Throughput: {performance['throughput_samples_per_sec']:.1f} samples/sec")
```

### Finding Optimal Configuration

```python
# Define workload
workload = {
    'cpu_ops_per_sec': 10,
    'gpu_ops_per_sec': 100,
    'gpu_type': 'inference',
    'parallelizable': 0.9,
    'memory_access_per_sec': 5,
    'access_pattern': 'sequential',
}

# Define constraints
constraints = {
    'max_latency_ms': 10,
    'max_power_w': 80,
    'max_energy_j': 0.5,
}

# Find optimal configuration
optimal = sim.optimize_deployment(workload, constraints)

print(f"Optimal Config: {optimal}")
```

---

## Performance Optimization {#performance-optimization}

### Latency Optimization

To minimize latency for real-time applications:

```python
def minimize_latency(sim, model_config, input_shape):
    """Find configuration with minimum latency."""
    results = []

    # Test different batch sizes
    for batch_size in [1, 2, 4, 8]:
        perf = sim.predict_performance(model_config, input_shape, batch_size)
        results.append({
            'batch_size': batch_size,
            'latency_ms': perf['latency_ms'],
            'throughput': perf['throughput_samples_per_sec'],
        })

    # Find minimum latency
    best = min(results, key=lambda x: x['latency_ms'])
    return best

# Example
result = minimize_latency(sim, model_config, input_shape)
print(f"Min Latency: {result['latency_ms']:.2f} ms (batch={result['batch_size']})")
```

### Throughput Optimization

To maximize throughput for batch processing:

```python
def maximize_throughput(sim, model_config, input_shape, max_batch=32):
    """Find configuration with maximum throughput."""
    results = []

    # Test different batch sizes
    for batch_size in range(1, max_batch + 1):
        perf = sim.predict_performance(model_config, input_shape, batch_size)
        results.append({
            'batch_size': batch_size,
            'latency_ms': perf['latency_ms'],
            'throughput': perf['throughput_samples_per_sec'],
            'energy_per_sample': perf['energy_per_sample_j'],
        })

    # Find maximum throughput
    best = max(results, key=lambda x: x['throughput'])
    return best

# Example
result = maximize_throughput(sim, model_config, input_shape)
print(f"Max Throughput: {result['throughput']:.1f} samples/sec (batch={result['batch_size']})")
```

### Device Selection

Automatically select optimal device (CPU/GPU):

```python
def select_device(sim, model_config, input_shape, batch_size=1):
    """Select optimal device for given workload."""
    # Test GPU
    gpu_config = {**model_config, 'use_gpu': True}
    gpu_perf = sim.predict_performance(gpu_config, input_shape, batch_size)

    # Test CPU
    cpu_config = {**model_config, 'use_gpu': False}
    cpu_perf = sim.predict_performance(cpu_config, input_shape, batch_size)

    # Compare
    if gpu_perf['latency_ms'] < cpu_perf['latency_ms']:
        return {
            'device': 'GPU',
            'latency_ms': gpu_perf['latency_ms'],
            'speedup': cpu_perf['latency_ms'] / gpu_perf['latency_ms'],
        }
    else:
        return {
            'device': 'CPU',
            'latency_ms': cpu_perf['latency_ms'],
            'speedup': 1.0,
        }

# Example
result = select_device(sim, model_config, input_shape)
print(f"Optimal Device: {result['device']}")
print(f"Latency: {result['latency_ms']:.2f} ms")
if result['speedup'] > 1:
    print(f"Speedup: {result['speedup']:.2f}x")
```

### Precision Optimization

Find optimal precision for accuracy/performance tradeoff:

```python
def optimize_precision(sim, model_config, input_shape, batch_size=1):
    """Find optimal precision for workload."""
    precisions = ['fp32', 'fp16', 'int8']
    results = []

    for precision in precisions:
        config = {**model_config, 'precision': precision}
        perf = sim.predict_performance(config, input_shape, batch_size)
        results.append({
            'precision': precision,
            'latency_ms': perf['latency_ms'],
            'throughput': perf['throughput_samples_per_sec'],
            'energy_per_sample_j': perf['energy_per_sample_j'],
        })

    return results

# Example
results = optimize_precision(sim, model_config, input_shape)
for r in results:
    print(f"{r['precision']}: {r['latency_ms']:.2f} ms, {r['throughput']:.1f} samples/sec")
```

---

## Energy Optimization {#energy-optimization}

### Energy-Aware Batch Sizing

Find batch size that minimizes energy per sample:

```python
def minimize_energy_per_sample(sim, model_config, input_shape, max_batch=32):
    """Find batch size with minimum energy per sample."""
    results = []

    for batch_size in range(1, max_batch + 1):
        perf = sim.predict_performance(model_config, input_shape, batch_size)
        energy_per_sample = perf['energy_per_sample_j']
        results.append({
            'batch_size': batch_size,
            'energy_per_sample_j': energy_per_sample,
            'throughput': perf['throughput_samples_per_sec'],
            'avg_power_w': perf['avg_power_w'],
        })

    # Find minimum energy per sample
    best = min(results, key=lambda x: x['energy_per_sample_j'])
    return best

# Example
result = minimize_energy_per_sample(sim, model_config, input_shape)
print(f"Min Energy: {result['energy_per_sample_j']:.3f} J/sample (batch={result['batch_size']})")
```

### Power Capping

Find optimal configuration under power constraints:

```python
def optimize_with_power_cap(sim, model_config, input_shape, max_power_w):
    """Find configuration that maximizes performance within power cap."""
    best_config = None
    best_throughput = 0

    # Test batch sizes
    for batch_size in [1, 2, 4, 8, 16]:
        perf = sim.predict_performance(model_config, input_shape, batch_size)

        # Check power constraint
        if perf['avg_power_w'] <= max_power_w:
            if perf['throughput_samples_per_sec'] > best_throughput:
                best_throughput = perf['throughput_samples_per_sec']
                best_config = {
                    'batch_size': batch_size,
                    'throughput': perf['throughput_samples_per_sec'],
                    'avg_power_w': perf['avg_power_w'],
                    'latency_ms': perf['latency_ms'],
                }

    return best_config

# Example
result = optimize_with_power_cap(sim, model_config, input_shape, max_power_w=60)
if result:
    print(f"Optimal under 60W: batch={result['batch_size']}, "
          f"throughput={result['throughput']:.1f} samples/sec")
else:
    print("No configuration satisfies power cap")
```

### Energy Budget Planning

Plan deployments with energy budgets:

```python
def plan_energy_budget(sim, model_config, input_shape, energy_budget_wh, runtime_hours=24):
    """Plan deployment within energy budget."""
    energy_budget_j = energy_budget_wh * 3600

    # Find most energy-efficient configuration
    best = minimize_energy_per_sample(sim, model_config, input_shape)
    energy_per_sample = best['energy_per_sample_j']

    # Calculate max samples within budget
    max_samples = int(energy_budget_j / energy_per_sample)

    # Calculate required throughput
    required_throughput = max_samples / (runtime_hours * 3600)

    # Check if feasible
    if best['throughput'] >= required_throughput:
        return {
            'feasible': True,
            'batch_size': best['batch_size'],
            'max_samples': max_samples,
            'energy_per_sample_j': energy_per_sample,
            'actual_throughput': best['throughput'],
            'required_throughput': required_throughput,
        }
    else:
        return {
            'feasible': False,
            'shortage_percent': (required_throughput - best['throughput']) / required_throughput * 100,
        }

# Example
result = plan_energy_budget(sim, model_config, input_shape, energy_budget_wh=100, runtime_hours=24)
if result['feasible']:
    print(f"Can process {result['max_samples']} samples in 24 hours "
          f"with batch={result['batch_size']}")
else:
    print(f"Not feasible: shortage {result['shortage_percent']:.1f}%")
```

---

## Thermal Optimization {#thermal-optimization}

### Temperature-Constrained Optimization

Find configuration that avoids thermal throttling:

```python
def optimize_thermal(sim, workload, max_temp_c, duration_min=30):
    """Find configuration that avoids overheating."""
    # Simulate with different configurations
    configs = [
        {'use_gpu': True, 'batch_size': 1},
        {'use_gpu': True, 'batch_size': 4},
        {'use_gpu': True, 'batch_size': 8},
        {'use_gpu': False, 'batch_size': 1},
    ]

    valid_configs = []

    for config in configs:
        test_workload = {**workload, **config}
        result = sim.simulate_workload(test_workload, duration=duration_min*60)

        # Check temperature constraint
        max_temp = max(result.thermal_profile)
        if max_temp < max_temp_c:
            valid_configs.append({
                'config': config,
                'max_temp_c': max_temp,
                'execution_time': result.execution_time,
                'throughput': 1 / result.execution_time if result.execution_time > 0 else 0,
            })

    # Return best performing valid config
    if valid_configs:
        return max(valid_configs, key=lambda x: x['throughput'])
    else:
        return None

# Example
workload = {
    'cpu_ops_per_sec': 10,
    'gpu_ops_per_sec': 100,
    'gpu_type': 'inference',
    'parallelizable': 0.9,
}
result = optimize_thermal(sim, workload, max_temp_c=80, duration_min=30)
if result:
    print(f"Safe config: {result['config']}, max temp: {result['max_temp_c']:.1f}°C")
```

### Sustained Performance Planning

Plan for sustained workloads without throttling:

```python
def check_sustained_performance(sim, workload, duration_hours=8):
    """Check if configuration can sustain performance."""
    # Simulate sustained workload
    result = sim.simulate_workload(workload, duration=duration_hours*3600)

    # Analyze thermal profile
    temps = result.thermal_profile
    max_temp = max(temps)
    avg_temp = sum(temps) / len(temps)

    # Check for throttling
    # Throttling occurs when temp > 80°C
    throttle_time = sum(1 for t in temps if t > 80) / len(temps) * 100

    return {
        'max_temp_c': max_temp,
        'avg_temp_c': avg_temp,
        'throttle_time_percent': throttle_time,
        'can_sustain': max_temp < 85,  # Below moderate throttling
        'energy_consumed_wh': result.energy_consumed / 3600,
    }

# Example
result = check_sustained_performance(sim, workload, duration_hours=8)
print(f"Max temp: {result['max_temp_c']:.1f}°C")
print(f"Throttle time: {result['throttle_time_percent']:.1f}%")
print(f"Can sustain 8 hours: {result['can_sustain']}")
print(f"Energy consumed: {result['energy_consumed_wh']:.1f} Wh")
```

---

## Multi-Objective Optimization {#multi-objective-optimization}

### Pareto Optimization

Find Pareto-optimal configurations:

```python
def find_pareto_front(sim, model_config, input_shape):
    """Find Pareto-optimal configurations for latency vs. energy."""
    results = []

    # Test all configurations
    for use_gpu in [True, False]:
        for precision in ['fp32', 'fp16', 'int8']:
            for batch_size in [1, 2, 4, 8, 16]:
                config = {
                    **model_config,
                    'use_gpu': use_gpu,
                    'precision': precision,
                }
                perf = sim.predict_performance(config, input_shape, batch_size)
                results.append({
                    'config': {'use_gpu': use_gpu, 'precision': precision, 'batch_size': batch_size},
                    'latency_ms': perf['latency_ms'],
                    'energy_per_sample_j': perf['energy_per_sample_j'],
                    'throughput': perf['throughput_samples_per_sec'],
                })

    # Find Pareto front (no other config is better in both dimensions)
    pareto = []
    for r in results:
        is_dominated = False
        for other in results:
            if (other['latency_ms'] <= r['latency_ms'] and
                other['energy_per_sample_j'] <= r['energy_per_sample_j'] and
                (other['latency_ms'] < r['latency_ms'] or
                 other['energy_per_sample_j'] < r['energy_per_sample_j'])):
                is_dominated = True
                break
        if not is_dominated:
            pareto.append(r)

    return sorted(pareto, key=lambda x: x['latency_ms'])

# Example
pareto = find_pareto_front(sim, model_config, input_shape)
print("Pareto-optimal configurations:")
for p in pareto:
    print(f"  {p['config']}: latency={p['latency_ms']:.2f}ms, "
          f"energy={p['energy_per_sample_j']:.3f}J")
```

### Weighted Objective Optimization

Optimize with custom weights:

```python
def optimize_weighted(sim, model_config, input_shape, weights):
    """Optimize with weighted objectives."""
    """
    weights = {
        'latency': 0.4,
        'energy': 0.3,
        'power': 0.2,
        'throughput': 0.1,
    }
    """
    results = []

    # Test all configurations
    for use_gpu in [True, False]:
        for precision in ['fp32', 'fp16', 'int8']:
            for batch_size in [1, 2, 4, 8, 16]:
                config = {
                    **model_config,
                    'use_gpu': use_gpu,
                    'precision': precision,
                }
                perf = sim.predict_performance(config, input_shape, batch_size)

                # Normalize objectives (lower is better for latency, energy, power)
                score = (
                    weights['latency'] * (perf['latency_ms'] / 100) +
                    weights['energy'] * (perf['energy_per_sample_j'] / 1.0) +
                    weights['power'] * (perf['avg_power_w'] / 150) +
                    weights['throughput'] * (100 / perf['throughput_samples_per_sec'])
                )

                results.append({
                    'config': {'use_gpu': use_gpu, 'precision': precision, 'batch_size': batch_size},
                    'score': score,
                    'latency_ms': perf['latency_ms'],
                    'energy_per_sample_j': perf['energy_per_sample_j'],
                    'avg_power_w': perf['avg_power_w'],
                    'throughput': perf['throughput_samples_per_sec'],
                })

    # Return best score
    best = min(results, key=lambda x: x['score'])
    return best

# Example
weights = {'latency': 0.5, 'energy': 0.3, 'power': 0.1, 'throughput': 0.1}
result = optimize_weighted(sim, model_config, input_shape, weights)
print(f"Optimal config: {result['config']}")
print(f"Score: {result['score']:.3f}")
print(f"Latency: {result['latency_ms']:.2f} ms")
print(f"Energy: {result['energy_per_sample_j']:.3f} J/sample")
print(f"Power: {result['avg_power_w']:.1f} W")
```

---

## Real-World Examples {#real-world-examples}

### Example 1: Real-Time Inference API

**Scenario:** Deploy ML model for real-time API with 10ms latency target.

```python
# Model configuration
model_config = {
    'type': 'transformer',
    'parameters': 125_000_000,
    'hidden_dim': 768,
    'num_layers': 12,
    'precision': 'fp16',
    'use_gpu': True,
}
input_shape = (256, 768)  # Shorter sequences for real-time

# Find optimal config
constraints = {
    'max_latency_ms': 10,
    'max_power_w': 100,
}
optimal = sim.optimize_deployment({
    'gpu_ops_per_sec': 50,
    'gpu_type': 'inference',
    'parallelizable': 0.9,
    'memory_access_per_sec': 2,
    'access_pattern': 'sequential',
}, constraints)

print(f"API Deployment Config:")
print(f"  Batch Size: {optimal['batch_size']}")
print(f"  Precision: {optimal['precision']}")
print(f"  Predicted Latency: {optimal['predicted_latency_ms']:.2f} ms")
print(f"  Max QPS: {1000 / optimal['predicted_latency_ms']:.1f}")
```

### Example 2: Batch Processing Pipeline

**Scenario:** Process 1M samples overnight with energy constraints.

```python
# Model configuration
model_config = {
    'type': 'cnn',
    'parameters': 25_000_000,
    'precision': 'fp16',
    'use_gpu': True,
}
input_shape = (224, 224, 3)

# Energy budget: 500 Wh for 8 hours
energy_budget_wh = 500
runtime_hours = 8
target_samples = 1_000_000

# Plan deployment
result = plan_energy_budget(sim, model_config, input_shape, energy_budget_wh, runtime_hours)

if result['feasible']:
    print(f"Batch Processing Plan:")
    print(f"  Can process: {result['max_samples']:,} samples")
    print(f"  Target: {target_samples:,} samples")
    print(f"  Status: {'PASS' if result['max_samples'] >= target_samples else 'FAIL'}")
    print(f"  Optimal Batch Size: {result['batch_size']}")
else:
    print(f"Need {result['shortage_percent']:.1f}% more energy or time")
```

### Example 3: Edge Deployment

**Scenario:** Deploy to edge device with strict power and thermal limits.

```python
# Edge constraints
constraints = {
    'max_latency_ms': 50,
    'max_power_w': 25,  # Strict power limit
}

# Model configuration (smaller for edge)
model_config = {
    'type': 'transformer',
    'parameters': 25_000_000,  # Smaller model
    'hidden_dim': 512,
    'num_layers': 6,
    'precision': 'int8',  # Quantize for efficiency
    'use_gpu': False,  # CPU-only for edge
}
input_shape = (256, 512)

# Find optimal config
optimal = sim.optimize_deployment({
    'cpu_ops_per_sec': 20,
    'parallelizable': 0.8,
    'memory_access_per_sec': 3,
    'access_pattern': 'sequential',
}, constraints)

if optimal:
    print(f"Edge Deployment Config:")
    print(f"  Device: {optimal['device']}")
    print(f"  Latency: {optimal['predicted_latency_ms']:.2f} ms")
    print(f"  Power: {optimal['predicted_power_w']:.1f} W")
else:
    print("No configuration satisfies constraints - need smaller model")
```

---

## API Reference {#api-reference}

### HardwareAccurateSimulation

#### `__init__(config: HardwareConfig)`
Initialize simulator with hardware configuration.

**Parameters:**
- `config`: Hardware configuration object

**Example:**
```python
config = create_default_hardware()
sim = HardwareAccurateSimulation(config)
```

#### `simulate_workload(workload: Dict, duration: float) -> SimulationResult`
Simulate a workload for specified duration.

**Parameters:**
- `workload`: Dictionary with workload parameters
  - `cpu_ops_per_sec`: CPU operations (GigaOps/s)
  - `gpu_ops_per_sec`: GPU operations (GigaOps/s)
  - `gpu_type`: 'matrix', 'tensor', 'raytracing', 'inference'
  - `parallelizable`: Fraction parallelizable (0-1)
  - `memory_access_per_sec`: Memory access (GB/s)
  - `access_pattern`: 'sequential', 'random', 'strided'
- `duration`: Simulation duration (seconds)

**Returns:**
- `SimulationResult` object with:
  - `execution_time`: Total execution time (s)
  - `energy_consumed`: Total energy (J)
  - `peak_power`: Peak power (W)
  - `avg_power`: Average power (W)
  - `thermal_profile`: List of temperatures over time
  - `cpu_utilization`: CPU utilization (0-1)
  - `gpu_utilization`: GPU utilization (0-1)
  - `memory_bandwidth`: Memory bandwidth (GB/s)
  - `cache_hit_rate`: Cache hit rate (0-1)
  - `prediction_confidence`: Confidence in prediction (0-1)

#### `predict_performance(model_config: Dict, input_shape: Tuple, batch_size: int) -> Dict`
Predict performance for ML model.

**Parameters:**
- `model_config`: Model configuration
  - `type`: 'transformer', 'cnn', 'dense'
  - `parameters`: Number of parameters
  - `hidden_dim`: Hidden dimension (for transformers)
  - `num_layers`: Number of layers
  - `precision`: 'fp32', 'fp16', 'int8'
  - `use_gpu`: Whether to use GPU
- `input_shape`: Input tensor shape
- `batch_size`: Batch size

**Returns:**
- Dictionary with:
  - `latency_ms`: Inference latency (ms)
  - `throughput_samples_per_sec`: Throughput
  - `energy_per_sample_j`: Energy per sample (J)
  - `peak_power_w`: Peak power (W)
  - `avg_power_w`: Average power (W)
  - `max_batch_size`: Maximum batch size
  - `device`: 'GPU' or 'CPU'
  - `confidence`: Prediction confidence (0-1)

#### `optimize_deployment(workload: Dict, constraints: Dict) -> Dict`
Find optimal deployment configuration.

**Parameters:**
- `workload`: Workload characteristics
- `constraints`: Deployment constraints
  - `max_latency_ms`: Maximum latency
  - `max_power_w`: Maximum power
  - `max_energy_j`: Maximum energy

**Returns:**
- Optimal configuration or None if no solution

### Hardware Configurations

#### `create_default_hardware() -> HardwareConfig`
Create default hardware configuration (Intel Core Ultra + RTX 4050).

#### Custom Hardware Configuration

```python
config = HardwareConfig(
    cpu={
        'p_cores': 8,
        'e_cores': 16,
        'lp_cores': 2,
        'p_base_freq': 3600,
        # ... other CPU parameters
    },
    gpu={
        'cuda_cores': 4352,  # RTX 4070
        'tensor_cores': 136,
        'memory_size': 8,
        # ... other GPU parameters
    },
    memory={
        'size': 32,  # GB
        'frequency': 6000,  # MHz
        # ... other memory parameters
    },
    interconnect={
        'version': '5.0',  # PCIe 5.0
        'lanes': 8,
        # ... other interconnect parameters
    },
    thermal={
        'ambient_temp': 22,
        'max_temp': 100,
        # ... other thermal parameters
    }
)
```

---

## Best Practices

1. **Start with default hardware config** for initial testing
2. **Calibrate with real benchmarks** before production use
3. **Use confidence scores** to identify uncertain predictions
4. **Consider thermal constraints** for sustained workloads
5. **Profile real workloads** to get accurate input parameters
6. **Validate predictions** with small-scale tests first
7. **Update calibration** when changing hardware configurations

---

**Document Version:** 1.0
**Last Updated:** 2026-03-13
**Author:** SuperInstance Research Team

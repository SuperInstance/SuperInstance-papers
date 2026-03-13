# Quick Start Guide - Production Simulation Framework

Get up and running in 5 minutes!

---

## Installation

```bash
# Core dependencies (required)
pip install numpy scipy

# GPU acceleration (recommended)
pip install cupy-cuda12x  # Adjust for your CUDA version

# Real workload traces (optional)
pip install torch torchvision

# HDF5 support (optional)
pip install h5py
```

---

## Basic Usage

### 1. Initialize Framework

```python
from framework import ProductionSimulationFramework, HardwareConfig

# Default configuration (RTX 4050)
framework = ProductionSimulationFramework()

# Custom configuration
config = HardwareConfig(gpu_name="RTX 4090", gpu_clock_mhz=2520)
framework = ProductionSimulationFramework(config, use_gpu=True)
```

### 2. Capture Workload Trace

```python
# Capture from PyTorch model
trace = framework.capture_trace("resnet50", {"batch_size": 1})

# Or load pre-captured trace
trace = framework.load_trace("path/to/trace.h5")

# Trace info
print(f"Operations: {len(trace.operations)}")
print(f"FLOPs: {trace.total_flops / 1e9:.2f} GFLOPs")
```

### 3. Run Simulation

```python
# Single plugin
results = framework.run_simulation(
    "memory_hierarchy",
    trace,
    with_statistics=False  # Use False for dict results
)

print(f"Latency: {results['total_latency_us']:.2f} us")
print(f"Energy: {results['total_energy_joules'] * 1000:.2f} mJ")

# Multiple plugins
results = framework.run_multi_plugin(
    ["memory_hierarchy", "energy_consumption", "thermal_simulation"],
    trace,
    with_statistics=False
)
```

### 4. Export Results

```python
# Export to JSON
framework.export_results(results, "output.json", format="json")

# Export to CSV
framework.export_results(results, "output.csv", format="csv")

# Export to HDF5 (requires h5py)
framework.export_results(results, "output.h5", format="hdf5")
```

---

## Available Plugins

### Built-in Plugins

1. **memory_hierarchy** - Memory access patterns and cache performance
2. **energy_consumption** - Energy breakdown and efficiency metrics
3. **thermal_simulation** - Temperature dynamics and throttling

### Paper-Specific Plugins (P24-P26)

4. **self_play** - Self-play mechanisms with ELO tracking
5. **hydraulic** - Pressure-flow agent networks
6. **value_network** - TD learning and value prediction

---

## Example: Complete Workflow

```python
from framework import ProductionSimulationFramework, HardwareConfig

# 1. Setup
config = HardwareConfig(gpu_name="RTX 4050")
framework = ProductionSimulationFramework(config, use_gpu=True)

# 2. Capture trace
trace = framework.capture_trace("resnet50", {"batch_size": 1, "img_size": 224})

# 3. Run all simulations
results = framework.run_multi_plugin(
    ["memory_hierarchy", "energy_consumption", "thermal_simulation"],
    trace,
    with_statistics=False
)

# 4. Analyze results
print("=== Memory Hierarchy ===")
mem = results["memory_hierarchy"]
print(f"Latency: {mem['total_latency_us']:.2f} us")
print(f"Energy: {mem['total_energy_joules'] * 1000:.2f} mJ")

print("\n=== Energy Consumption ===")
energy = results["energy_consumption"]
print(f"Total Energy: {energy['total_energy_joules'] * 1000:.2f} mJ")
print(f"Efficiency: {energy['energy_efficiency_gflops_per_watt']:.2f} GFLOPs/W")

print("\n=== Thermal Simulation ===")
thermal = results["thermal_simulation"]
print(f"Peak Temp: {thermal['peak_temperature_c']:.1f} C")
print(f"Throttled: {thermal['thermal_throttle_occurred']}")

# 5. Export
framework.export_results(results, "simulation_results.json", format="json")
```

---

## Hardware Profiles

Use pre-configured hardware profiles:

```python
from hardware_configs import get_config_by_name, RTX_4090, A100

# By name
config = get_config_by_name("rtx4090")

# Direct import
config = RTX_4090
config = A100

# Auto-detect
from hardware_configs import auto_detect_hardware
config = auto_detect_hardware()
```

**Available Profiles:**
- RTX 4050, 4090, 3090, 3080, 4070
- A100, H100, RTX 6000 Ada
- AMD RX 7900 XTX
- Intel Arc A770
- Apple M2 Ultra
- Intel i9-13900K, AMD Ryzen 9 7950X

---

## Custom Plugins

Create your own simulation plugin:

```python
from framework import SimulationPlugin

class MyCustomPlugin(SimulationPlugin):
    @property
    def name(self):
        return "my_custom"

    @property
    def description(self):
        return "My custom simulation"

    def initialize(self, hardware, engine):
        self.hardware = hardware
        self.engine = engine

    def simulate(self, trace, **kwargs):
        # Your simulation logic
        total_ops = len(trace.operations)
        total_flops = trace.total_flops

        return {
            "total_operations": total_ops,
            "total_flops": total_flops,
            "custom_metric": total_flops / total_ops
        }

# Register and use
framework.register_plugin(MyCustomPlugin())
results = framework.run_simulation("my_custom", trace, with_statistics=False)
```

---

## Tips & Tricks

### 1. GPU Memory Management

```python
# Clear GPU memory
framework.engine.clear_memory()

# Limit memory usage
from framework import GPUSimulationEngine
engine = GPUSimulationEngine(use_gpu=True, memory_limit_gb=3.0)
```

### 2. Batch Simulations

```python
# Run multiple configurations
params = [
    {"batch_size": 1},
    {"batch_size": 4},
    {"batch_size": 16}
]

results = framework.engine.batch_simulate(
    lambda batch_size: framework.run_simulation(
        "memory_hierarchy",
        framework.capture_trace("resnet50", {"batch_size": batch_size}),
        with_statistics=False
    ),
    params
)
```

### 3. Compare Traces

```python
trace1 = framework.capture_trace("resnet50", {"batch_size": 1})
trace2 = framework.capture_trace("resnet18", {"batch_size": 1})

comparison = framework.compare_traces(trace1, trace2)
print(f"Improvement: {comparison['relative_improvement']:.2f}%")
```

### 4. Statistical Validation

For scalar metrics only:

```python
# Extract scalar metric
def get_latency():
    result = framework.run_simulation(
        "memory_hierarchy",
        trace,
        with_statistics=False
    )
    return result['total_latency_cycles']

# Run with statistics
from framework import StatisticalValidator
validator = StatisticalValidator(num_runs=30)
stats = validator.run_with_statistics(get_latency, "latency")

print(f"Mean: {stats.mean:.2f}")
print(f"95% CI: {stats.confidence_interval_95}")
```

---

## Troubleshooting

### GPU Not Detected

```python
# Check CuPy installation
try:
    import cupy as cp
    print("CuPy available")
    print(f"GPU: {cp.cuda.Device().name}")
except ImportError:
    print("CuPy not installed, using CPU")
```

### PyTorch Not Available

Framework automatically falls back to synthetic traces:

```python
# Works even without PyTorch
trace = framework.capture_trace("resnet50", {"batch_size": 1})
# Warning: PyTorch not available, using pre-captured trace
```

### Statistical Validation Fails

Use `with_statistics=False` for dictionary results:

```python
# This works
results = framework.run_simulation("memory_hierarchy", trace, with_statistics=False)

# This fails (currently)
# results = framework.run_simulation("memory_hierarchy", trace, with_statistics=True)
```

---

## Next Steps

1. **Explore Built-in Plugins** - Try all three built-in plugins
2. **Create Custom Plugin** - Build plugin for your research
3. **Test Different Models** - Compare ResNet, BERT, etc.
4. **Validate Paper Claims** - Use P24-P26 plugins for Phase 2 research

---

## Resources

- **Full Documentation:** `README.md`
- **Framework Summary:** `FRAMEWORK_SUMMARY.md`
- **Test Suite:** `test_framework.py`
- **Demo Script:** `demo_framework.py`
- **Hardware Profiles:** `hardware_configs.py`
- **Custom Plugins:** `custom_plugins.py`

---

**Questions?** Check the README or FRAMEWORK_SUMMARY for detailed documentation.

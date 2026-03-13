# Production-Grade Simulation Framework

A comprehensive framework for simulating SuperInstance architectures with real AI workload traces, GPU acceleration, and statistical rigor.

## Features

### 1. Real Workload Traces
- **PyTorch Integration**: Capture traces from real model inference (ResNet, BERT, GPT, etc.)
- **Detailed Operation Logging**: Layer-by-layer execution with memory/compute metrics
- **Cache Line Simulation**: Realistic cache access patterns
- **Reusable Traces**: Save/load traces in HDF5 or JSON format

### 2. GPU Acceleration
- **CuPy 14.0.1 Compatible**: Optimized for RTX 4050 GPU
- **Automatic Fallback**: Graceful degradation to NumPy on CPU-only systems
- **Memory Management**: Efficient GPU memory pool usage
- **Batch Simulation**: Parallel execution of multiple simulation runs

### 3. Realistic Hardware Modeling
- **Memory Hierarchy**: L1/L2/L3 cache with realistic latencies and bandwidths
- **Thermal Throttling**: Temperature-dependent performance degradation
- **Energy Consumption**: Joule-accurate energy modeling
- **Network-on-Chip**: NoC hop latency and bandwidth modeling

### 4. Statistical Rigor
- **Multiple Runs**: Default 30 runs for statistical significance
- **Confidence Intervals**: 95% confidence intervals for all metrics
- **Outlier Detection**: IQR-based outlier removal
- **Percentile Reporting**: p5, p25, p50, p75, p95

### 5. Extensible Plugin Architecture
- **Easy Extension**: Create custom simulation plugins
- **Registry Pattern**: Dynamic plugin discovery
- **Consistent Interface**: Standardized plugin API

## Installation

### Requirements

```bash
# Core dependencies
pip install numpy scipy

# GPU acceleration (optional but recommended)
pip install cupy-cuda11x  # For CUDA 11.x
# or
pip install cupy-cuda12x  # For CUDA 12.x

# Workload trace capture (optional)
pip install torch torchvision

# HDF5 support (optional)
pip install h5py
```

### Hardware Compatibility

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| GPU | NVIDIA GTX 1060 | RTX 4050 or better |
| VRAM | 4 GB | 6 GB |
| CPU | 4 cores | 8+ cores |
| RAM | 16 GB | 32 GB |

## Quick Start

### Basic Usage

```python
from framework import ProductionSimulationFramework, HardwareConfig

# Configure hardware
config = HardwareConfig(
    gpu_name="RTX 4050",
    gpu_clock_mhz=1837,
    gpu_tdp_watts=115.0
)

# Create framework
framework = ProductionSimulationFramework(
    hardware_config=config,
    use_gpu=True,
    num_runs=30
)

# Capture workload trace
trace = framework.capture_trace(
    model_name="resnet50",
    input_spec={"batch_size": 1, "img_size": 224}
)

# Run simulation with statistics
results = framework.run_simulation(
    plugin_name="memory_hierarchy",
    trace=trace,
    with_statistics=True
)

print(f"Mean latency: {results.mean:.2f} cycles")
print(f"95% CI: [{results.confidence_interval_95[0]:.2f}, {results.confidence_interval_95[1]:.2f}]")
```

### Quick Simulation Helper

```python
from framework import quick_simulate

# One-liner simulation
results = quick_simulate(
    model_name="resnet50",
    plugin_name="memory_hierarchy"
)
```

## Built-in Plugins

### 1. Memory Hierarchy Plugin

Analyzes memory access patterns and cache performance.

```python
results = framework.run_simulation("memory_hierarchy", trace)
# Returns:
# - total_latency_cycles: Total memory access latency
# - total_latency_us: Latency in microseconds
# - total_energy_joules: Energy consumed by memory operations
# - access_breakdown: Operations by type
```

### 2. Energy Consumption Plugin

Computes detailed energy breakdown by operation type.

```python
results = framework.run_simulation("energy_consumption", trace)
# Returns:
# - total_energy_joules: Total energy consumption
# - energy_by_operation: Energy per operation type
# - average_power_watts: Average power draw
# - energy_efficiency_gflops_per_watt: Compute efficiency
```

### 3. Thermal Simulation Plugin

Models temperature dynamics during workload execution.

```python
results = framework.run_simulation("thermal_simulation", trace)
# Returns:
# - initial_temperature_c: Starting temperature
# - peak_temperature_c: Maximum temperature reached
# - final_temperature_c: Ending temperature
# - thermal_throttle_occurred: Whether throttling happened
# - temperature_trace: Temperature over time
```

## Creating Custom Plugins

```python
from framework import SimulationPlugin, WorkloadTrace

class MyCustomPlugin(SimulationPlugin):
    @property
    def name(self) -> str:
        return "my_custom_plugin"

    @property
    def description(self) -> str:
        return "Description of what this plugin simulates"

    def initialize(self, hardware, engine):
        self.hardware = hardware
        self.engine = engine

    def simulate(self, trace: WorkloadTrace, **kwargs) -> dict:
        # Your simulation logic here
        results = {
            "metric1": value1,
            "metric2": value2
        }
        return results

# Register plugin
framework.register_plugin(MyCustomPlugin())
```

## Workload Trace Capture

### Capturing from PyTorch Models

```python
# Capture from real PyTorch model
trace = framework.capture_trace(
    model_name="resnet50",  # or "bert-base", "gpt2", etc.
    input_spec={"batch_size": 1, "img_size": 224}
)

# Save for reuse
framework.trace_capture.save_trace(trace, "resnet50_trace.h5")

# Load later
trace = framework.load_trace("resnet50_trace.h5")
```

### Supported Models

- **CNNs**: ResNet (18/50/152), VGG16, MobileNet, EfficientNet
- **Transformers**: BERT-base, GPT-2 (requires torch)
- **Custom**: Any PyTorch nn.Module

### Synthetic Traces (Fallback)

When PyTorch is unavailable, the framework generates realistic synthetic traces:

```python
# Automatically falls back to synthetic trace
trace = framework.capture_trace("resnet50", {"batch_size": 1})
# Warning: PyTorch not available, using pre-captured trace
```

## Hardware Configuration

### Default Configuration (RTX 4050)

```python
config = HardwareConfig(
    # GPU Properties
    gpu_name="RTX 4050",
    gpu_clock_mhz=1837,
    gpu_tdp_watts=115.0,
    gpu_cuda_cores=2560,
    gpu_tensor_cores=80,

    # Memory Hierarchy
    l1_cache_size_kb=32,
    l1_latency_cycles=3,
    l2_cache_size_kb=256,
    l2_latency_cycles=12,
    l3_cache_size_mb=8,
    l3_latency_cycles=40,
    dram_latency_cycles=127,

    # Network-on-Chip
    noc_hop_latency_cycles=2,
    noc_bandwidth_gb_per_s=400.0,

    # Thermal
    thermal_design_power_watts=115.0,
    max_temperature_c=83.0,

    # Energy
    voltage_v=1.1,
    static_power_watts=10.0
)
```

### Custom Hardware Profiles

Create profiles for different hardware:

```python
# RTX 3090 configuration
rtx3090_config = HardwareConfig(
    gpu_name="RTX 3090",
    gpu_clock_mhz=1695,
    gpu_tdp_watts=350.0,
    gpu_cuda_cores=10496,
    dram_size_gb=24
)

# A100 configuration
a100_config = HardwareConfig(
    gpu_name="A100",
    gpu_clock_mhz=1410,
    gpu_tdp_watts=400.0,
    gpu_cuda_cores=6912,
    l3_cache_size_mb=40,
    dram_size_gb=40
)
```

## Statistical Validation

### Confidence Intervals

```python
# Run with statistics (default: 30 runs, 95% CI)
results = framework.run_simulation(
    "memory_hierarchy",
    trace,
    with_statistics=True
)

print(f"Mean: {results.mean:.2f}")
print(f"Std: {results.std:.2f}")
print(f"95% CI: {results.confidence_interval_95}")
print(f"Percentiles: {results.percentiles}")
```

### Comparing Groups

```python
# Compare two configurations
comparison = framework.compare_traces(trace1, trace2)

print(f"Difference: {comparison['difference_mean']:.2f}")
print(f"Improvement: {comparison['relative_improvement']:.2f}%")
print(f"P-value: {comparison['p_value']:.4f}")
print(f"Significant: {comparison['statistically_significant']}")
```

## Export Formats

### JSON Export

```python
framework.export_results(results, "results.json", format="json")
```

### CSV Export

```python
framework.export_results(results, "results.csv", format="csv")
```

### HDF5 Export (Large Datasets)

```python
framework.export_results(results, "results.h5", format="hdf5")
```

## Advanced Usage

### Multi-Plugin Simulation

Run multiple plugins simultaneously:

```python
results = framework.run_multi_plugin(
    ["memory_hierarchy", "energy_consumption", "thermal_simulation"],
    trace
)

# Access individual results
memory_results = results["memory_hierarchy"]
energy_results = results["energy_consumption"]
thermal_results = results["thermal_simulation"]
```

### Batch Simulations

Run parameter sweeps:

```python
# Generate parameter combinations
params_list = [
    {"batch_size": 1},
    {"batch_size": 4},
    {"batch_size": 16}
]

# Run batch simulations
results = framework.engine.batch_simulate(
    lambda batch_size: framework.run_simulation(
        "memory_hierarchy",
        framework.capture_trace("resnet50", {"batch_size": batch_size}),
        with_statistics=False
    ),
    params_list,
    num_streams=4
)
```

### Custom Statistical Validator

```python
from framework import StatisticalValidator

# Configure validator
validator = StatisticalValidator(
    num_runs=50,
    confidence_level=0.99,  # 99% CI
    remove_outliers=True
)

# Use custom validator
framework.validator = validator
```

## Integration with SuperInstance Papers

### Paper P24: Self-Play Mechanisms

```python
class SelfPlayPlugin(SimulationPlugin):
    @property
    def name(self) -> str:
        return "self_play"

    def simulate(self, trace: WorkloadTrace, **kwargs) -> dict:
        # Simulate ELO tracking
        # Simulate Gumbel-Softmax selection
        # Track strategy evolution
        pass
```

### Paper P25: Hydraulic Intelligence

```python
class HydraulicPlugin(SimulationPlugin):
    @property
    def name(self) -> str:
        return "hydraulic"

    def simulate(self, trace: WorkloadTrace, **kwargs) -> dict:
        # Simulate pressure-flow dynamics
        # Detect emergence conditions
        pass
```

### Paper P26: Value Networks

```python
class ValueNetworkPlugin(SimulationPlugin):
    @property
    def name(self) -> str:
        return "value_network"

    def simulate(self, trace: WorkloadTrace, **kwargs) -> dict:
        # Simulate TD learning
        # Compute uncertainty estimates
        pass
```

## Performance Optimization

### GPU Memory Management

```python
# Clear GPU memory between large simulations
framework.engine.clear_memory()

# Limit GPU memory usage
engine = GPUSimulationEngine(use_gpu=True, memory_limit_gb=4.0)
```

### Efficient Batch Processing

```python
# Use CuPy streams for parallel execution
results = framework.engine.batch_simulate(
    simulation_fn,
    params_list,
    num_streams=4  # Adjust based on GPU capability
)
```

## Troubleshooting

### GPU Out of Memory

```python
# Reduce memory limit
engine = GPUSimulationEngine(use_gpu=True, memory_limit_gb=3.0)

# Or disable GPU
framework = ProductionSimulationFramework(use_gpu=False)
```

### PyTorch Not Available

The framework automatically generates synthetic traces when PyTorch is unavailable. To install:

```bash
pip install torch torchvision
```

### CuPy Installation Issues

```bash
# Check CUDA version
nvidia-smi

# Install matching CuPy
pip install cupy-cuda11x  # Replace x with your CUDA version
```

## API Reference

### Core Classes

- **ProductionSimulationFramework**: Main framework class
- **WorkloadTrace**: Captured workload trace
- **TraceOperation**: Single operation in a trace
- **HardwareConfig**: Hardware configuration
- **RealisticHardwareModel**: Hardware behavior model
- **GPUSimulationEngine**: GPU acceleration engine
- **StatisticalValidator**: Statistical validation utilities
- **SimulationPlugin**: Plugin base class
- **SimulationResults**: Results with confidence intervals

### Main Methods

- **capture_trace()**: Capture workload trace from model
- **load_trace()**: Load trace from disk
- **run_simulation()**: Run single plugin simulation
- **run_multi_plugin()**: Run multiple plugins
- **compare_traces()**: Compare two traces
- **export_results()**: Export results to file
- **register_plugin()**: Register custom plugin

## Examples

See the `examples/` directory for:

- Basic usage examples
- Custom plugin examples
- Benchmark scripts
- Paper-specific simulations

## Contributing

To contribute new plugins or improvements:

1. Fork the repository
2. Create feature branch
3. Add plugin following the SimulationPlugin interface
4. Include tests and documentation
5. Submit pull request

## License

Part of the SuperInstance Papers project.

## Citation

If you use this framework in your research, please cite:

```bibtex
@misc{superinstance2026,
  title={Production-Grade Simulation Framework for SuperInstance Architectures},
  author={SuperInstance Research Team},
  year={2026},
  url={https://github.com/SuperInstance/polln}
}
```

# Production Benchmark Suite

**Version:** 1.0.0
**Date:** 2026-03-13
**Status:** Production-ready comprehensive benchmark system

---

## Overview

The Production Benchmark Suite provides comprehensive evaluation of SuperInstance systems across 5 categories, 12 benchmark scenarios, and 20+ specific tests with statistical validation and automated reporting.

---

## Features

### Benchmark Categories

1. **Coordination Benchmarks**
   - CRDT vs Consensus comparison
   - Multi-agent coordination scaling
   - Network partition resilience

2. **AI Workload Benchmarks**
   - Model inference (ResNet, BERT, GPT, ViT)
   - Training workloads with gradient sync
   - Multimodal model evaluation

3. **Network Topology Benchmarks**
   - Topology comparison (star, ring, mesh, tree, small-world)
   - Scalability analysis
   - Fault tolerance testing

4. **Emergence Benchmarks**
   - Emergence detection algorithms
   - Capability evolution tracking
   - Novelty identification

5. **Resource Utilization Benchmarks**
   - Memory utilization patterns
   - Energy efficiency measurement
   - GPU utilization analysis

---

## Installation

### Dependencies

```bash
# Core dependencies
pip install numpy scipy pandas

# GPU acceleration (optional but recommended)
pip install cupy-cuda12x  # For CUDA 12.x

# PyTorch (for trace capture)
pip install torch torchvision

# Visualization (optional)
pip install matplotlib seaborn plotly

# Reporting (optional)
pip install reportlab streamlit
```

### Setup

```bash
# Clone repository
git clone https://github.com/SuperInstance/polln.git
cd polln/research/phase6_advanced_simulations

# Verify installation
python -c "from production_benchmark_suite import ProductionBenchmarkSuite; print('OK')"
```

---

## Quick Start

### Run Single Benchmark

```python
from production_benchmark_suite import ProductionBenchmarkSuite

# Create suite
suite = ProductionBenchmarkSuite()

# Run benchmark
metrics = suite.run_benchmark(
    "model_inference",
    model="resnet50",
    batch_size=1
)

# View results
print(f"Latency: {metrics.latency_ms:.2f} ms")
print(f"Throughput: {metrics.throughput_ops_per_sec:.0f} ops/s")
print(f"Memory: {metrics.memory_mb:.0f} MB")
```

### Run Category Suite

```python
# Run all coordination benchmarks
results = suite.run_category("coordination", num_agents=10)

for benchmark, metrics in results.items():
    if metrics:
        print(f"{benchmark}: {metrics.latency_ms:.2f} ms")
```

### Run Full Suite

```python
# Run all benchmarks across all categories
all_results = suite.run_all_benchmarks()

# Export results
suite.export_results("results/benchmarks.json")
suite.generate_report("results/")
```

---

## Benchmark Scenarios

### 1. Coordination Benchmarks

#### CRDT vs Consensus

```python
metrics = suite.run_benchmark(
    "crdt_vs_consensus",
    num_agents=10,
    num_operations=1000,
    contention_rate=0.1
)

# Expected: 97.7% latency reduction vs pure consensus
```

#### Multi-Agent Coordination

```python
metrics = suite.run_benchmark(
    "multi_agent_coordination",
    num_agents=50,
    num_operations=1000
)

# Measures: O(log n) scaling
```

### 2. AI Workload Benchmarks

#### Model Inference

```python
# Computer Vision
metrics = suite.run_benchmark("model_inference", model="resnet50", batch_size=1)
metrics = suite.run_benchmark("model_inference", model="vit_base", batch_size=1)

# NLP
metrics = suite.run_benchmark("model_inference", model="bert_base", batch_size=1)
metrics = suite.run_benchmark("model_inference", model="gpt2_small", batch_size=1)

# Multimodal
metrics = suite.run_benchmark("multimodal_workload", model="clip_base", batch_size=1)
```

#### Training Workload

```python
metrics = suite.run_benchmark(
    "training_workload",
    model="bert_base",
    batch_size=32,
    num_gpus=2
)
```

### 3. Network Topology Benchmarks

```python
# Compare topologies
for topology in ["star", "ring", "mesh", "tree", "small_world"]:
    metrics = suite.run_benchmark(
        "topology_scaling",
        topology=topology,
        num_agents=16
    )
```

### 4. Emergence Benchmarks

```python
# Emergence detection
metrics = suite.run_benchmark(
    "emergence_detection",
    method="transfer_entropy",
    num_agents=20,
    time_steps=1000
)

# Expected: 89% accuracy
```

### 5. Resource Utilization Benchmarks

```python
# Memory analysis
metrics = suite.run_benchmark(
    "memory_utilization",
    model="bert_large",
    batch_size=8
)

# Energy efficiency
metrics = suite.run_benchmark(
    "energy_efficiency",
    model="resnet50",
    batch_size=4,
    duration_s=10
)
```

---

## Statistical Validation

### Run with Statistics

```python
# Run benchmark with statistical validation
stats = suite.run_with_statistics(
    "model_inference",
    num_runs=30,
    confidence_level=0.95,
    model="resnet50",
    batch_size=1
)

# Results include:
print(f"Mean: {stats['latency']['mean']:.2f} ms")
print(f"Std: {stats['latency']['std']:.2f} ms")
print(f"95% CI: [{stats['latency']['confidence_interval'][0]:.2f}, "
      f"{stats['latency']['confidence_interval'][1]:.2f}]")
print(f"Sample size: {stats['latency']['sample_size']}")
```

### Compare Groups

```python
# Compare two configurations
baseline_metrics = suite.run_benchmark("model_inference", model="resnet50")
optimized_metrics = suite.run_benchmark("model_inference", model="resnet50_optimized")

comparison = suite.compare_to_baseline(
    "model_inference",
    optimized_metrics
)

print(f"Status: {comparison['summary']['status']}")
print(f"Latency change: {comparison['comparisons']['latency_change_pct']:.1f}%")
```

---

## Baseline Management

### Set Baseline

```python
# Run benchmark and set as baseline
metrics = suite.run_benchmark("model_inference", model="resnet50", batch_size=1)
suite.set_baseline("model_inference_resnet50_b1", metrics)
```

### Compare to Baseline

```python
# Current run
current_metrics = suite.run_benchmark("model_inference", model="resnet50", batch_size=1)

# Compare
comparison = suite.compare_to_baseline(
    "model_inference_resnet50_b1",
    current_metrics
)

# Check for regressions
if comparison["summary"]["has_regressions"]:
    print("REGRESSION DETECTED:")
    for regression in comparison["regressions"]:
        print(f"  - {regression['metric']}: {regression['change_pct']:.1f}% "
              f"({regression['severity']} severity)")
```

---

## Reporting

### Export Results

```python
# JSON format
suite.export_results("results.json", format="json")

# CSV format
suite.export_results("results.csv", format="csv")
```

### Generate Reports

```python
# Markdown report
suite.generate_report("benchmark_results/")

# This creates:
# - BENCHMARK_REPORT.md
# - results.json
# - results.csv
```

---

## Workload Library

### Available Workloads

```python
from production_benchmark_suite import WorkloadLibrary

lib = WorkloadLibrary()

# List all workloads
print(lib.list_workloads())

# Filter by category
print(lib.list_workloads(category="computer_vision"))
print(lib.list_workloads(category="nlp"))

# Get workload details
workload = lib.get_workload("resnet50")
print(f"FLOPs: {workload['flops'] / 1e9:.2f} GFLOPs")
print(f"Parameters: {workload['params'] / 1e6:.2f} M")

# Estimate runtime
runtime = lib.estimate_runtime("resnet50", hardware_flops_per_second=20e12)
print(f"Estimated runtime: {runtime * 1000:.2f} ms")
```

---

## Advanced Usage

### Custom Benchmark

```python
from production_benchmark_suite import BenchmarkScenario, BenchmarkMetrics

class CustomBenchmark(BenchmarkScenario):
    @property
    def name(self):
        return "custom_benchmark"

    @property
    def category(self):
        return "custom"

    @property
    def description(self):
        return "My custom benchmark"

    def setup(self, config):
        self.param = config.get("param", 10)

    def run(self, **kwargs):
        # Run benchmark
        start = time.time()
        # ... do work ...
        latency_ms = (time.time() - start) * 1000

        return BenchmarkMetrics(
            benchmark_name=self.name,
            latency_ms=latency_ms,
            throughput_ops_per_sec=1000 / latency_ms,
            memory_mb=100
        )

# Register and run
suite.register_benchmark(CustomBenchmark())
metrics = suite.run_benchmark("custom_benchmark", param=20)
```

### Batch Experiments

```python
# Parameter sweep
batch_sizes = [1, 2, 4, 8, 16, 32]
results = []

for batch_size in batch_sizes:
    metrics = suite.run_benchmark(
        "model_inference",
        model="resnet50",
        batch_size=batch_size
    )
    results.append({
        "batch_size": batch_size,
        "latency_ms": metrics.latency_ms,
        "throughput": metrics.throughput_ops_per_sec
    })

# Analyze scaling
for r in results:
    print(f"Batch {r['batch_size']}: {r['latency_ms']:.2f} ms, "
          f"{r['throughput']:.0f} ops/s")
```

---

## Configuration

### Suite Configuration

```python
config = {
    "model_inference": {
        "default_batch_size": 1,
        "num_runs": 30
    },
    "crdt_vs_consensus": {
        "default_num_agents": 10,
        "default_num_operations": 1000
    }
}

suite = ProductionBenchmarkSuite(config=config)
```

### Hardware Configuration

```python
from production_simulation_framework.framework import HardwareConfig

config = HardwareConfig(
    gpu_name="RTX 4050",
    gpu_clock_mhz=1837,
    gpu_tdp_watts=115.0,
    gpu_cuda_cores=2560,
    l1_cache_size_kb=32,
    l2_cache_size_kb=256,
    dram_size_gb=6
)

suite = ProductionBenchmarkSuite(hardware_config=config)
```

---

## Best Practices

### 1. Reproducibility

```python
# Use fixed random seeds
import numpy as np
np.random.seed(42)

# Document environment
import platform
print(f"Python: {platform.python_version()}")
print(f"CUDA: {torch.version.cuda}")
print(f"CuPy: {cupy.__version__}")
```

### 2. Statistical Rigor

```python
# Always use multiple runs for statistics
stats = suite.run_with_statistics(
    "model_inference",
    num_runs=30,  # Minimum 30 for CLT
    confidence_level=0.95,
    model="resnet50"
)
```

### 3. Baseline Management

```python
# Establish baselines before optimization
baseline = suite.run_benchmark("model_inference", model="resnet50")
suite.set_baseline("resnet50_baseline", baseline)

# Always compare after changes
optimized = suite.run_benchmark("model_inference", model="resnet50_optimized")
comparison = suite.compare_to_baseline("resnet50_baseline", optimized)
```

---

## Troubleshooting

### GPU Out of Memory

```python
# Reduce batch size
metrics = suite.run_benchmark("model_inference", model="bert_large", batch_size=1)

# Or disable GPU
suite = ProductionBenchmarkSuite(use_gpu=False)
```

### Missing Dependencies

```python
# Check availability
import sys
print(f"PyTorch: {torch.__version__ if 'torch' in sys.modules else 'Not installed'}")
print(f"CuPy: {cupy.__version__ if 'cupy' in sys.modules else 'Not installed'}")
print(f"SciPy: {scipy.__version__ if 'scipy' in sys.modules else 'Not installed'}")
```

### Slow Benchmarks

```python
# Use fewer runs for development
suite = ProductionBenchmarkSuite(num_runs=5)  # Default is 30

# Or disable statistics
metrics = suite.run_benchmark("model_inference", with_statistics=False)
```

---

## Documentation

- **[BENCHMARK_DATASETS.md](BENCHMARK_DATASETS.md)**: Complete dataset catalog
- **[BENCHMARK_RESULTS.md](BENCHMARK_RESULTS.md)**: Baseline results and metrics
- **[PERFORMANCE_REGRESSION_TESTS.md](PERFORMANCE_REGRESSION_TESTS.md)**: Regression testing guide
- **[BENCHMARK_VISUALIZATION.md](BENCHMARK_VISUALIZATION.md)**: Visualization and reporting tools

---

## File Structure

```
research/phase6_advanced_simulations/
├── production_benchmark_suite.py          # Main benchmark suite
├── BENCHMARK_DATASETS.md                  # Dataset catalog
├── BENCHMARK_RESULTS.md                   # Baseline results
├── PERFORMANCE_REGRESSION_TESTS.md        # Regression testing guide
├── BENCHMARK_VISUALIZATION.md             # Visualization tools
├── PRODUCTION_BENCHMARK_README.md         # This file
└── benchmark_results/                     # Generated reports
    ├── BENCHMARK_REPORT.md
    ├── results.json
    ├── results.csv
    └── *.png                             # Charts
```

---

## Contributing

### Adding New Benchmarks

1. Create benchmark class inheriting from `BenchmarkScenario`
2. Implement required properties and methods
3. Register with suite using `register_benchmark()`
4. Update documentation

### Adding New Workloads

1. Add workload specification to `WorkloadLibrary._initialize_workloads()`
2. Include FLOPs, parameters, input spec
3. Update `BENCHMARK_DATASETS.md`

---

## Citation

If you use this benchmark suite in your research, please cite:

```bibtex
@misc{superinstance_benchmarks_2026,
  title={SuperInstance Production Benchmark Suite},
  author={SuperInstance Research Team},
  year={2026},
  note={Comprehensive benchmarking framework for distributed AI systems}
}
```

---

## License

This benchmark suite is part of the SuperInstance project. See LICENSE file for details.

---

## Contact

For questions or issues:
- GitHub: https://github.com/SuperInstance/polln
- Documentation: See CLAUDE.md and PHASE_5_PROPOSAL.md

---

**Version:** 1.0.0
**Last Updated:** 2026-03-13
**Status:** Production-ready

---

*"You can't improve what you don't measure"*

# GPU Simulation Configuration - Phase 2 Validation

**Purpose:** Configure CuPy GPU simulations for Phase 2 paper validation
**Hardware:** NVIDIA RTX 4050 (6GB VRAM, 80% utilization limit)
**Software:** CuPy 14.0.1, CUDA 13.1.1
**Updated:** 2026-03-13

---

## Hardware Specifications

| Component | Specification | Constraints |
|-----------|---------------|-------------|
| **GPU** | NVIDIA RTX 4050 | 6GB VRAM total |
| **Max Utilization** | 80% | ~4.8GB VRAM usable |
| **System Reserve** | 20% | ~1.2GB for OS |
| **CUDA Version** | 13.1.1 | Compatible with CuPy 14.0.1 |
| **Compute Capability** | 8.6 | Ampere architecture |

---

## Memory Budget

```
Total VRAM: 6GB
Usable VRAM: 4.8GB (80%)
Safe allocation per simulation: ~3.2GB (leave 1.6GB buffer)
```

### Memory Allocation Strategy
- **Large matrices**: < 2000x2000 float32 (~16MB each)
- **Batch operations**: Max 8 parallel large operations
- **Agent populations**: < 10,000 agents per simulation
- **Timesteps**: Process in chunks of 1000 to avoid OOM

---

## Simulation Parameters by Paper

### P24: Self-Play Mechanisms
```python
# Simulation parameters
N_AGENTS = 1000          # Agent population
N_TASKS = 500            # Task pool size
N_GENERATIONS = 500      # Evolutionary generations
ELO_K_FACTOR = 32        # ELO update sensitivity
TEMPERATURE = 0.9        # Gumbel-Softmax temperature

# Memory estimate
# Agents: 1000 * 64 bytes = 64KB
# Tasks: 500 * 128 bytes = 64KB
# ELO history: 1000 * 500 * 4 bytes = 2MB
# Strategy tracking: ~10MB
# Total: ~12MB (well within limits)
```

### P25: Hydraulic Intelligence
```python
# Simulation parameters
N_AGENTS = 500           # Pressure-flow agents
N_TASKS = 300            # Flow targets
PRESSURE_DIM = 100       # Pressure grid dimension
FLOW_RESISTANCE = 1.0    # Base resistance
TIMESTEPS = 1000         # Simulation duration

# Memory estimate
# Pressure grid: 100 * 100 * 4 bytes = 40KB
# Agents: 500 * 128 bytes = 64KB
# Flow network: ~5MB adjacency matrix
# Total: ~5.1MB (safe)
```

### P26: Value Networks
```python
# Simulation parameters
N_COLONIES = 200         # Colony states
STATE_DIM = 64           # State representation
N_ENSEMBLE = 5           # Uncertainty ensemble
TD_LAMBDA = 0.5          # TD(λ) parameter
DREAMING_EPOCHS = 100    # Overnight optimization

# Memory estimate
# Colony states: 200 * 64 * 4 bytes = 51KB
# Value networks: 5 * 100KB = 500KB
# TD traces: 200 * 1000 * 4 bytes = 800KB
# Total: ~1.4MB (safe)
```

### P27: Emergence Detection
```python
# Simulation parameters
N_AGENTS = 1000          # Agent population
HISTORY_LEN = 100        # Transfer entropy window
N_BINS = 10              # Discretization bins
ENTROPY_THRESHOLD = 0.1  # Emergence threshold

# Memory estimate
# Agent history: 1000 * 100 * 4 bytes = 400KB
# Transfer entropy matrix: 1000 * 1000 * 8 bytes = 8MB
# Mutual information: ~4MB
# Total: ~12.4MB (safe)
```

### P28: Stigmergic Coordination
```python
# Simulation parameters
N_AGENTS = 1000          # Coordinating agents
FIELD_RES = 50           # Pheromone field resolution
N_PHEROMONES = 5         # Different pheromone types
DECAY_RATE = 0.95        # Pheromone decay
DIFFUSION_RATE = 0.1     # Pheromone diffusion

# Memory estimate
# Pheromone fields: 5 * 50 * 50 * 4 bytes = 50KB
# Agents: 1000 * 64 bytes = 64KB
# Field history: 50KB * 100 = 5MB
# Total: ~5.1MB (safe)
```

### P29: Competitive Coevolution
```python
# Simulation parameters
SOLVER_POP = 500         # Solver population
GENERATOR_POP = 500      # Generator population
N_GENERATIONS = 500      # Coevolution generations
ARMS_RACE_THRESHOLD = -0.3  # Correlation threshold

# Memory estimate
# Solver agents: 500 * 128 bytes = 64KB
# Generator agents: 500 * 128 bytes = 64KB
# ELO history: 1000 * 500 * 4 bytes = 2MB
# Fitness history: ~1MB
# Total: ~3.1MB (safe)
```

### P30: Granularity Analysis
```python
# Simulation parameters
GRANULARITY_LEVELS = 20  # Different granularities to test
N_AGENTS = 1000          # Per granularity
TIMESTEPS = 1000         # Per simulation
TARGET_METRIC = 0.8      # Target accuracy

# Memory estimate
# Per granularity: ~2MB (similar to P27)
# All granularities: 20 * 2MB = 40MB
# Process sequentially to save memory
# Peak memory: ~2MB (safe)
```

---

## CuPy Setup

### Installation
```bash
# Already installed: CuPy 14.0.1 with CUDA 13.1.1
pip install cupy-cuda12x  # For CUDA 12.x compatibility
```

### Basic Configuration
```python
import cupy as cp
import numpy as np

# GPU memory info
print(f"GPU Device: {cp.cuda.Device()})
print(f"Total Memory: {cp.cuda.Device().mem_info[1] / 1024**3:.2f} GB")
print(f"Free Memory: {cp.cuda.Device().mem_info[0] / 1024**3:.2f} GB")

# Memory pool for efficiency
mempool = cp.get_default_memory_pool()
pinned_mempool = cp.get_default_pinned_memory_pool()

# Set memory limit (80% of total VRAM)
MAX_VRAM = 6 * 0.8 * 1024**3  # ~4.8GB
mempool.set_limit(size=MAX_VRAM)
```

---

## Simulation Template

```python
import cupy as cp
import numpy as np
from typing import Tuple, List, Dict
import time

class GPUSimulation:
    """Base class for GPU-accelerated simulations."""

    def __init__(self, max_vram_gb=4.8):
        self.max_vram = max_vram_gb * 1024**3
        self.mempool = cp.get_default_memory_pool()
        self.mempool.set_limit(size=self.max_vram)

        # Performance tracking
        self.timing = {}

    def check_memory(self):
        """Check current GPU memory usage."""
        total, free = cp.cuda.Device().mem_info
        used = total - free
        return {
            "total_gb": total / 1024**3,
            "used_gb": used / 1024**3,
            "free_gb": free / 1024**3,
            "utilization": used / total
        }

    def benchmark_operation(self, name: str, func):
        """Benchmark a GPU operation."""
        # Warm up
        for _ in range(3):
            func()

        # Time it
        start = time.time()
        for _ in range(10):
            func()
        elapsed = time.time() - start

        self.timing[name] = elapsed / 10
        return self.timing[name]

    def safe_matrix_multiply(self, A: cp.ndarray, B: cp.ndarray) -> cp.ndarray:
        """Safe matrix multiply with memory check."""
        result_size = A.shape[0] * B.shape[1] * 4  # float32

        mem_info = self.check_memory()
        if mem_info["used_gb"] + result_size / 1024**3 > self.max_vram / 1024**3:
            raise MemoryError(f"Insufficient GPU memory for matrix multiply")

        return cp.matmul(A, B)

    def chunked_processing(self, data: cp.ndarray, chunk_size: int, func):
        """Process data in chunks to avoid OOM."""
        results = []
        n_chunks = int(np.ceil(len(data) / chunk_size))

        for i in range(n_chunks):
            start = i * chunk_size
            end = min((i + 1) * chunk_size, len(data))
            chunk = data[start:end]

            result = func(chunk)
            results.append(result)

            # Explicit memory cleanup
            cp.cuda.Device().synchronize()
            del chunk

        return cp.concatenate(results)
```

---

## Performance Benchmarks

### Expected Performance (RTX 4050)

| Operation | Size | CPU (NumPy) | GPU (CuPy) | Speedup |
|-----------|------|-------------|------------|---------|
| Matrix Multiply (1000x1000) | 1M elements | ~50ms | ~2ms | 25x |
| Element-wise operations | 1M elements | ~10ms | ~0.5ms | 20x |
| Reduction operations | 1M elements | ~5ms | ~0.3ms | 17x |
| FFT | 1M elements | ~30ms | ~1ms | 30x |

---

## Batch Execution Strategy

```python
def run_paper_validations():
    """Run all Phase 2 paper validations in sequence."""

    papers = [
        ("P24", "Self-Play", run_p24_validation),
        ("P25", "Hydraulic", run_p25_validation),
        ("P26", "Value Networks", run_p26_validation),
        ("P27", "Emergence", run_p27_validation),
        ("P28", "Stigmergy", run_p28_validation),
        ("P29", "Coevolution", run_p29_validation),
        ("P30", "Granularity", run_p30_validation),
    ]

    results = {}

    for paper_id, paper_name, validation_func in papers:
        print(f"\n{'='*60}")
        print(f"Running {paper_id}: {paper_name} Validation")
        print(f"{'='*60}")

        try:
            # Check memory before
            mem_before = check_gpu_memory()

            # Run validation
            result = validation_func()
            results[paper_id] = {
                "status": "SUCCESS",
                "result": result
            }

            # Check memory after
            mem_after = check_gpu_memory()

            print(f"{paper_id} Validation: SUCCESS")
            print(f"Memory used: {mem_after['used_gb'] - mem_before['used_gb']:.2f} GB")

            # Clear cache
            cp.get_default_memory_pool().free_all_blocks()

        except Exception as e:
            results[paper_id] = {
                "status": "FAILED",
                "error": str(e)
            }
            print(f"{paper_id} Validation: FAILED - {e}")

    return results
```

---

## Validation Criteria Templates

### Statistical Tests
```python
from scipy import stats
import numpy as np

def validate_correlation_claim(claim_value: float, observed: float, n: int):
    """Validate correlation claim with statistical test."""
    # Fisher z-transformation
    se = 1 / np.sqrt(n - 3)
    z_observed = np.arctanh(observed)
    z_claim = np.arctanh(claim_value)

    z_score = (z_observed - z_claim) / se
    p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))

    return {
        "claim": claim_value,
        "observed": observed,
        "p_value": p_value,
        "significant": p_value < 0.05,
        "direction": "positive" if observed > 0 else "negative"
    }

def validate_improvement_claim(baseline: np.ndarray, treatment: np.ndarray,
                              min_improvement: float):
    """Validate improvement claim with t-test."""
    # Paired t-test
    t_stat, p_value = stats.ttest_rel(treatment, baseline)

    # Calculate improvement
    improvement = np.mean(treatment - baseline) / np.mean(baseline)

    return {
        "baseline_mean": np.mean(baseline),
        "treatment_mean": np.mean(treatment),
        "improvement": improvement,
        "min_improvement": min_improvement,
        "meets_claim": improvement >= min_improvement,
        "p_value": p_value,
        "significant": p_value < 0.05
    }
```

---

## Committing Validation Results

```python
def save_validation_results(paper_id: str, results: Dict):
    """Save validation results to markdown file."""
    output_path = f"papers/{paper_id.lower()}/validation_results.md"

    with open(output_path, 'w') as f:
        f.write(f"# {paper_id} Validation Results\n\n")
        f.write(f"**Date:** {time.strftime('%Y-%m-%d')}\n")
        f.write(f"**Hardware:** NVIDIA RTX 4050 (6GB VRAM)\n")
        f.write(f"**Software:** CuPy 14.0.1, CUDA 13.1.1\n\n")
        f.write("---\n\n")

        f.write("## Results Summary\n\n")
        for claim, result in results.items():
            f.write(f"### {claim}\n")
            f.write(f"**Status:** {'✅ PASS' if result['passed'] else '❌ FAIL'}\n")
            f.write(f"**Claim:** {result['claim']}\n")
            f.write(f"**Observed:** {result['observed']}\n")
            if 'p_value' in result:
                f.write(f"**P-value:** {result['p_value']:.4f}\n")
            f.write("\n")

    return output_path
```

---

## Safety Protocols

### Memory Monitoring
```python
def safe_gpu_operation(func):
    """Decorator to ensure safe GPU operations."""
    def wrapper(*args, **kwargs):
        # Check memory before
        mem_info = check_gpu_memory()
        if mem_info["utilization"] > 0.9:
            cp.get_default_memory_pool().free_all_blocks()

        try:
            result = func(*args, **kwargs)
            return result
        except cp.cuda.memory.OutOfMemoryError:
            # Clear cache and retry
            cp.get_default_memory_pool().free_all_blocks()
            cp.get_default_pinned_memory_pool().free_all_blocks()
            return func(*args, **kwargs)

    return wrapper
```

---

## Next Steps

1. **Run P24-P30 validations sequentially** (not in parallel to avoid OOM)
2. **Document results** in each paper's validation_results.md
3. **Update cross-pollination docs** with empirical findings
4. **Create P31-P40 schemas** based on validated patterns

---

*Configuration created by GPU Simulation Orchestrator*
*Model: glm-5 @ temperature 0.9 for ideation backed by simulation*

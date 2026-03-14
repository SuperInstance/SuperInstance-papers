# GPU Optimization Guide - RTX 4050

**Target Hardware:** NVIDIA RTX 4050 (6GB VRAM, Ada Lovelace)
**Author:** GPU Simulation Orchestrator
**Updated:** 2026-03-13

---

## Table of Contents

1. [Hardware Architecture](#hardware-architecture)
2. [Memory Management](#memory-management)
3. [CUDA Kernel Optimization](#cuda-kernel-optimization)
4. [Tensor Core Utilization](#tensor-core-utilization)
5. [CuPy-Specific Optimizations](#cupy-specific-optimizations)
6. [Performance Profiling](#performance-profiling)
7. [Common Pitfalls](#common-pitfalls)
8. [Best Practices](#best-practices)

---

## Hardware Architecture

### RTX 4050 Specifications

| Component | Specification | Optimization Implication |
|-----------|--------------|--------------------------|
| **GPU** | RTX 4050 (Ada Lovelace) | Compute Capability 8.9 |
| **VRAM** | 6GB GDDR6 | Limits dataset size |
| **CUDA Cores** | 2560 | 80 SMs × 32 cores |
| **Tensor Cores** | 80 (FP16/BF16/INT8/TF32) | Key for matrix ops |
| **Memory Bandwidth** | 192 GB/s | Memory-bound operations |
| **L2 Cache** | 2MB | Small cache, optimize access |
| **Shared Mem/SM** | 100KB | Use for thread collaboration |
| **Max Power** | 115W | Thermal considerations |

### Architecture Block Diagram

```
┌─────────────────────────────────────────────────┐
│              RTX 4050 GPU                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ SM0 │ │ SM1 │ │ SM2 │ │ ... │  80 SMs       │
│  └─────┘ └─────┘ └─────┘ └─────┘              │
│    │       │       │       │                    │
│    └───────┴───────┴───────┘                    │
│            │                                   │
│    ┌───────┴───────┐                           │
│    │  L2 Cache 2MB │                           │
│    └───────┬───────┘                           │
│            │                                   │
│    ┌───────┴───────┐                           │
│    │  6GB GDDR6    │  192 GB/s                │
│    │  Memory Bus   │                           │
│    └───────────────┘                           │
│                                                 │
└─────────────────────────────────────────────────┘

Each SM contains:
- 32 CUDA cores
- 1 Tensor Core
- 100KB Shared Memory
- 64KB Register File
```

---

## Memory Management

### Memory Hierarchy

```
Speed  │
  ↑    │ Registers
  │    │ ┌─────────────────────────┐
  │    │ │ ~200 TB/s bandwidth     │
  │    │ │ Per-thread, very limited │
  │    │ └─────────────────────────┘
  │    │
  │    │ Shared Memory
  │    │ ┌─────────────────────────┐
  │    │ │ ~100 TB/s bandwidth     │
  │    │ │ 100KB per SM            │
  │    │ │ Thread-block scoped     │
  │    │ └─────────────────────────┘
  │    │
  │    │ L2 Cache
  │    │ ┌─────────────────────────┐
  │    │ │ ~3 TB/s bandwidth       │
  │    │ │ 2MB total               │
  │    │ │ Global scope            │
  │    │ └─────────────────────────┘
  │    │
  │    │ Global Memory (VRAM)
  │    │ ┌─────────────────────────┐
  │    │ │ ~192 GB/s bandwidth     │
  │    │ │ 6GB total               │
  │    │ │ Largest, slowest        │
  │    │ └─────────────────────────┘
  │    │
  └────┴──────────────────────────────────→ Size
```

### Memory Allocation Strategies

#### 1. Pre-Allocation Pattern

```python
import cupy as cp

class MemoryEfficientSimulation:
    def __init__(self, max_agents: int, max_timesteps: int):
        # Pre-allocate all memory upfront
        self.states = cp.zeros((max_agents, 10), dtype=cp.float32)
        self.history = cp.zeros((max_timesteps, max_agents), dtype=cp.float32)
        self.temp_buffer = cp.zeros(max_agents, dtype=cp.float32)

        # Memory pool configuration
        self.mempool = cp.get_default_memory_pool()
        self.mempool.set_limit(size=4.5 * 1024**3)  # 4.5GB limit

    def run(self, n_iterations: int):
        for i in range(n_iterations):
            # Reuse pre-allocated buffers
            self._compute_step(i)
            # No allocations in loop!

    def _compute_step(self, iteration: int):
        # Use pre-allocated arrays
        cp.dot(self.states, self.temp_buffer, out=self.history[iteration])
```

#### 2. Chunked Processing Pattern

```python
def process_large_dataset(data: cp.ndarray, chunk_size: int, func):
    """
    Process data in chunks to avoid OOM.

    Args:
        data: Input data on GPU
        chunk_size: Elements per chunk
        func: Processing function
    """
    n_chunks = int(np.ceil(len(data) / chunk_size))
    results = []

    for i in range(n_chunks):
        start = i * chunk_size
        end = min((i + 1) * chunk_size, len(data))

        # Process chunk
        chunk_result = func(data[start:end])
        results.append(chunk_result)

        # Explicit synchronization
        cp.cuda.Device().synchronize()

        # Free chunk memory
        del chunk_result

    return cp.concatenate(results)
```

#### 3. Memory Pool Management

```python
class OptimizedMemoryPool:
    """Advanced memory pool management for RTX 4050."""

    def __init__(self, max_vram_gb: float = 4.5):
        self.mempool = cp.get_default_memory_pool()
        self.pinned_pool = cp.get_default_pinned_memory_pool()

        # Set limits
        self.mempool.set_limit(size=int(max_vram_gb * 1024**3))
        self.pinned_pool.set_limit(size=int(1.0 * 1024**3))

        # Track allocations
        self.allocations = []

    def allocate(self, shape: tuple, dtype: cp.dtype = cp.float32) -> cp.ndarray:
        """Allocate with tracking."""
        arr = cp.zeros(shape, dtype=dtype)
        self.allocations.append(arr)
        return arr

    def free_all(self):
        """Free all tracked allocations."""
        self.allocations.clear()
        self.mempool.free_all_blocks()
        self.pinned_pool.free_all_blocks()

    def get_memory_stats(self) -> dict:
        """Get detailed memory statistics."""
        total, free = cp.cuda.Device().mem_info
        used = total - free

        return {
            "total_gb": total / 1024**3,
            "used_gb": used / 1024**3,
            "free_gb": free / 1024**3,
            "pool_used_gb": self.mempool.used_bytes() / 1024**3,
            "pool_total_gb": self.mempool.total_bytes() / 1024**3,
        }
```

### Memory Access Patterns

#### Coalesced Access (Good)

```python
# GOOD: Coalesced access
# Threads access consecutive memory locations
data = cp.arange(1000)  # [0, 1, 2, ..., 999]

def coalesced_kernel(data):
    # Each thread accesses consecutive elements
    # Thread 0: data[0], Thread 1: data[1], etc.
    return data * 2
```

#### Strided Access (Bad)

```python
# BAD: Strided access
# Threads access memory with gaps
def strided_kernel(data):
    # Each thread accesses every Nth element
    # Thread 0: data[0], Thread 1: data[16], etc.
    # Causes 16 separate memory transactions!
    return data[::16]
```

### Pinned Memory Optimization

```python
class PinnedMemoryTransfer:
    """Use pinned memory for faster CPU-GPU transfers."""

    def __init__(self):
        self.pinned_pool = cp.get_default_pinned_memory_pool()

    def allocate_pinned(self, size: int) -> cp.ndarray:
        """Allocate pinned memory on CPU."""
        return self.pinned_pool.alloc(size)

    def fast_transfer(self, cpu_array: np.ndarray) -> cp.ndarray:
        """Transfer using pinned memory for speed."""
        # Allocate pinned memory
        pinned = self.allocate_pinned(cpu_array.nbytes)

        # Copy to pinned memory
        pinned[:] = cpu_array

        # Transfer to GPU (faster from pinned memory)
        gpu_array = cp.asarray(pinned)

        return gpu_array
```

---

## CUDA Kernel Optimization

### Thread Block Configuration

```python
class KernelOptimizer:
    """Optimal thread block configurations for RTX 4050."""

    # Warp size on NVIDIA GPUs
    WARP_SIZE = 32

    # Max threads per block (RTX 4050)
    MAX_THREADS_PER_BLOCK = 1024

    # Optimal block sizes for different operations
    BLOCK_SIZES = {
        "elementwise": (256, 1, 1),     # 8 warps per block
        "reduction": (512, 1, 1),       # 16 warps per block
        "stencil": (128, 1, 1),         # 4 warps per block
        "matrix_mul": (32, 32, 1),      # 32x32 threads for matrix ops
        "transpose": (32, 8, 1),        # Optimized for memory coalescing
    }

    @staticmethod
    def get_grid_size(
        data_size: int,
        block_size: tuple
    ) -> tuple:
        """Calculate optimal grid size."""
        return (
            (data_size + block_size[0] - 1) // block_size[0],
            1,
            1
        )

    @staticmethod
    def estimate_occupancy(
        block_size: int,
        registers_per_thread: int = 32,
        shared_memory_per_block: int = 0
    ) -> float:
        """
        Estimate kernel occupancy.

        Args:
            block_size: Number of threads per block
            registers_per_thread: Registers used by each thread
            shared_memory_per_block: Shared memory in bytes

        Returns:
            Occupancy ratio (0.0 to 1.0)
        """
        # RTX 4050 specs
        max_blocks_per_sm = 16
        max_threads_per_sm = 1536
        max_registers_per_sm = 65536
        max_shared_mem_per_sm = 100 * 1024

        # Calculate limiting factors
        blocks_by_threads = max_threads_per_sm // block_size
        blocks_by_registers = max_registers_per_sm // (block_size * registers_per_thread)
        blocks_by_shared = max_shared_mem_per_sm // shared_memory_per_block if shared_memory_per_block > 0 else max_blocks_per_sm

        # Limiting factor
        blocks_per_sm = min(blocks_by_threads, blocks_by_registers, blocks_by_shared, max_blocks_per_sm)

        # Calculate occupancy
        active_warps = (blocks_per_sm * block_size) // 32
        max_warps = max_threads_per_sm // 32

        return active_warps / max_warps
```

### Shared Memory Optimization

```python
@cp.fuse()  # Fuse operations for efficiency
def shared_memory_reduction(data: cp.ndarray) -> cp.ndarray:
    """
    Reduction using shared memory for speed.

    This demonstrates the pattern, though CuPy handles
    shared memory internally in most cases.
    """
    return cp.sum(data)


class SharedMatrixMultiply:
    """Matrix multiply with shared memory tiling."""

    def __init__(self, tile_size: int = 32):
        self.tile_size = tile_size

    def multiply(self, A: cp.ndarray, B: cp.ndarray) -> cp.ndarray:
        """
        Multiply matrices with shared memory tiling.

        Pattern:
        1. Load tiles into shared memory
        2. Compute partial results
        3. Accumulate
        """
        # CuPy's matmul already uses shared memory optimally
        # This is the manual pattern for understanding
        return cp.matmul(A, B)

    def manual_tile_multiply(self, A: cp.ndarray, B: cp.ndarray) -> cp.ndarray:
        """Manual tiled matrix multiply for demonstration."""
        M, K = A.shape
        K2, N = B.shape
        assert K == K2, "Matrix dimensions must match"

        C = cp.zeros((M, N), dtype=cp.float32)

        # Tiled computation
        for i in range(0, M, self.tile_size):
            for j in range(0, N, self.tile_size):
                for k in range(0, K, self.tile_size):
                    # Load tiles (implicitly using shared memory in CuPy)
                    A_tile = A[i:i+self.tile_size, k:k+self.tile_size]
                    B_tile = B[k:k+self.tile_size, j:j+self.tile_size]

                    # Compute tile product
                    C[i:i+self.tile_size, j:j+self.tile_size] += cp.matmul(A_tile, B_tile)

        return C
```

### Avoiding Warp Divergence

```python
# BAD: Warp divergence
def divergent_kernel(data: cp.ndarray, threshold: float) -> cp.ndarray:
    """
    Different execution paths within a warp cause divergence.
    This serializes execution, killing performance.
    """
    result = cp.zeros_like(data)

    # Threads in same warp take different paths
    mask = data > threshold
    result[mask] = data[mask] * 2  # Some threads
    result[~mask] = data[~mask] + 1  # Other threads

    return result


# GOOD: Coherent execution
def coherent_kernel(data: cp.ndarray, threshold: float) -> cp.ndarray:
    """
    All threads in warp follow same execution path.
    Uses vectorized operations instead of conditionals.
    """
    # Use vectorized operations instead of per-element conditionals
    result = cp.where(data > threshold, data * 2, data + 1)
    return result
```

---

## Tensor Core Utilization

### Tensor Core Capabilities

RTX 4050 Tensor Cores support:
- **FP16**: Half precision (16-bit float)
- **BF16**: Bfloat16 (brain float)
- **INT8**: 8-bit integer
- **TF32**: TensorFloat32 (19-bit mantissa)

### Mixed Precision Matrix Operations

```python
class TensorCoreOptimizer:
    """Optimize computations using Tensor Cores."""

    def __init__(self):
        self.tensor_core_available = True  # RTX 4050 has Tensor Cores

    def mixed_precision_matmul(
        self,
        A: cp.ndarray,
        B: cp.ndarray,
        precision: str = "fp16"
    ) -> cp.ndarray:
        """
        Matrix multiply using Tensor Cores.

        Args:
            A: First matrix
            B: Second matrix
            precision: "fp16", "bf16", or "tf32"

        Returns:
            Product matrix
        """
        if precision == "fp16":
            # Convert to FP16
            A_fp16 = A.astype(cp.float16)
            B_fp16 = B.astype(cp.float16)

            # Compute (Tensor Cores accelerate FP16 matmul)
            C_fp16 = cp.matmul(A_fp16, B_fp16)

            # Convert back to FP32 for accumulation
            return C_fp16.astype(cp.float32)

        elif precision == "bf16":
            # CuPy doesn't directly support BF16 in all versions
            # Use FP16 as fallback
            return self.mixed_precision_matmul(A, B, "fp16")

        else:  # tf32 or fp32
            # Standard TF32/FP32 computation
            return cp.matmul(A, B)

    def batched_matmul(
        self,
        A_batch: cp.ndarray,
        B_batch: cp.ndarray
    ) -> cp.ndarray:
        """
        Batched matrix multiply for better Tensor Core utilization.

        Tensor Cores are designed for batch operations.
        """
        # Ensure batch dimension
        assert A_batch.ndim == 3 and B_batch.ndim == 3
        assert A_batch.shape[0] == B_batch.shape[0]

        # Batched matmul (efficiently uses Tensor Cores)
        return cp.matmul(A_batch, B_batch)
```

### Automatic Mixed Precision (AMP) Pattern

```python
class AMPSimulator:
    """Automatic Mixed Precision training pattern."""

    def __init__(self, enable_amp: bool = True):
        self.enable_amp = enable_amp

    def training_step(
        self,
        weights: cp.ndarray,
        gradients: cp.ndarray,
        learning_rate: float
    ) -> cp.ndarray:
        """
        Training step with optional mixed precision.

        Pattern:
        1. Forward pass in FP16
        2. Loss scaling to prevent underflow
        3. Backward pass in FP16
        4. Gradient conversion to FP32
        5. Weight update in FP32
        """
        if not self.enable_amp:
            # Standard FP32 training
            return weights - learning_rate * gradients

        # Mixed precision training
        loss_scale = 128.0  # Prevent FP16 underflow

        # Scale gradients (FP16)
        scaled_grads = gradients / loss_scale
        scaled_grads_fp16 = scaled_grads.astype(cp.float16)

        # Convert back to FP32 for update
        update = scaled_grads_fp16.astype(cp.float32) * learning_rate

        # Update weights in FP32
        return weights - update
```

---

## CuPy-Specific Optimizations

### 1. Kernel Fusion with `@cp.fuse()`

```python
# BAD: Multiple kernels
def bad_operations(data: cp.ndarray) -> cp.ndarray:
    """Multiple kernel launches."""
    result = data * 2  # Kernel 1
    result = result + 1  # Kernel 2
    result = cp.sqrt(result)  # Kernel 3
    return result


# GOOD: Fused kernel
@cp.fuse()
def good_operations(data: cp.ndarray) -> cp.ndarray:
    """Single fused kernel."""
    return cp.sqrt(data * 2 + 1)
```

### 2. In-Place Operations

```python
# BAD: Creates new arrays
def bad_inplace(data: cp.ndarray) -> cp.ndarray:
    result = data * 2  # Allocation
    result = result + 1  # Another allocation
    return result


# GOOD: In-place operations
def good_inplace(data: cp.ndarray) -> cp.ndarray:
    result = data.copy()  # Single allocation
    result *= 2  # In-place
    result += 1  # In-place
    return result
```

### 3. Memory-Efficient Reductions

```python
class EfficientReductions:
    """Memory-efficient reduction operations."""

    @staticmethod
    def chunked_sum(data: cp.ndarray, chunk_size: int = 1000000) -> float:
        """
        Compute sum in chunks to avoid memory spikes.

        Useful for very large arrays.
        """
        result = 0.0
        for i in range(0, len(data), chunk_size):
            chunk = data[i:i+chunk_size]
            result += float(cp.sum(chunk))
        return result

    @staticmethod
    def streaming_mean(data: cp.ndarray) -> float:
        """
        Compute mean with O(1) extra memory.

        Uses Welford's algorithm for numerical stability.
        """
        mean = 0.0
        count = 0

        for chunk in cp.array_split(data, 100):  # Process in chunks
            chunk_mean = float(cp.mean(chunk))
            chunk_count = len(chunk)

            # Online mean update
            delta = chunk_mean - mean
            mean += delta * chunk_count / (count + chunk_count)
            count += chunk_count

        return mean
```

### 4. Efficient Random Number Generation

```python
class GPURandomGenerator:
    """Efficient random number generation on GPU."""

    def __init__(self, seed: int = 42):
        self.seed = seed
        cp.random.seed(seed)

    def generate_batch(
        self,
        shape: tuple,
        distribution: str = "uniform"
    ) -> cp.ndarray:
        """
        Generate random numbers efficiently.

        CuPy's random number generation is parallelized.
        """
        if distribution == "uniform":
            return cp.random.random(shape)
        elif distribution == "normal":
            return cp.random.normal(0, 1, shape)
        elif distribution == "int":
            return cp.random.randint(0, 10, shape)
        else:
            raise ValueError(f"Unknown distribution: {distribution}")

    def parallel_stochastic_process(
        self,
        n_processes: int,
        n_steps: int
    ) -> cp.ndarray:
        """
        Generate multiple stochastic processes in parallel.

        Each row is one independent process.
        """
        # Generate all random numbers at once
        noise = cp.random.normal(0, 1, (n_processes, n_steps))

        # Parallel cumulative sum
        return cp.cumsum(noise, axis=1)
```

---

## Performance Profiling

### GPU Profiling Utilities

```python
class GPUProfiler:
    """Comprehensive GPU performance profiling."""

    def __init__(self):
        self.events = {}
        self.timings = {}

    def start(self, name: str):
        """Start profiling a section."""
        if name not in self.events:
            self.events[name] = []
        self.events[name].append(cp.cuda.Event())
        self.events[name][-1].record()

    def end(self, name: str):
        """End profiling a section."""
        self.events[name].append(cp.cuda.Event())
        self.events[name][-1].record()

    def get_time_ms(self, name: str) -> float:
        """Get elapsed time in milliseconds."""
        if len(self.events[name]) < 2:
            return 0.0

        start = self.events[name][-2]
        end = self.events[name][-1]
        return cp.cuda.get_elapsed_time(start, end)

    def report(self) -> dict:
        """Generate profiling report."""
        report = {}
        for name in self.events:
            if len(self.events[name]) >= 2:
                start = self.events[name][0]
                end = self.events[name][-1]
                elapsed = cp.cuda.get_elapsed_time(start, end)
                report[name] = elapsed
        return report


class MemoryProfiler:
    """Memory usage profiling."""

    def __init__(self):
        self.snapshots = []

    def snapshot(self, label: str = ""):
        """Take a memory snapshot."""
        total, free = cp.cuda.Device().mem_info
        used = total - free

        self.snapshots.append({
            "label": label,
            "used_gb": used / 1024**3,
            "free_gb": free / 1024**3,
            "total_gb": total / 1024**3
        })

    def report(self) -> list:
        """Generate memory report."""
        return self.snapshots

    def peak_usage(self) -> float:
        """Get peak memory usage in GB."""
        return max(s["used_gb"] for s in self.snapshots)
```

### Benchmarking Template

```python
def benchmark_operation(
    operation: Callable,
    name: str,
    n_warmup: int = 5,
    n_benchmark: int = 20
) -> dict:
    """
    Benchmark a GPU operation.

    Args:
        operation: Function to benchmark (should return to CPU)
        name: Operation name for reporting
        n_warmup: Warmup iterations (not timed)
        n_benchmark: Benchmark iterations (timed)

    Returns:
        Dictionary with benchmark results
    """
    # Warmup
    for _ in range(n_warmup):
        _ = operation()
        cp.cuda.Device().synchronize()

    # Benchmark
    times = []
    for _ in range(n_benchmark):
        start = time.time()
        _ = operation()
        cp.cuda.Device().synchronize()
        times.append(time.time() - start)

    times = np.array(times)

    return {
        "name": name,
        "mean_ms": np.mean(times) * 1000,
        "std_ms": np.std(times) * 1000,
        "min_ms": np.min(times) * 1000,
        "max_ms": np.max(times) * 1000,
        "median_ms": np.median(times) * 1000,
        "iterations": n_benchmark
    }
```

---

## Common Pitfalls

### 1. Excessive Memory Transfers

```python
# BAD: Transferring data back and forth
def bad_transfer(data: cp.ndarray) -> float:
    result = cp.sum(data)  # GPU operation
    result_cpu = result.get()  # Transfer to CPU
    result_gpu = cp.array(result_cpu)  # Transfer back!
    return float(cp.sum(result_gpu))

# GOOD: Keep data on GPU
def good_transfer(data: cp.ndarray) -> float:
    result = cp.sum(data)  # GPU operation
    return float(result)  # Only transfer at the end
```

### 2. Small Array Operations

```python
# BAD: GPU operations on small arrays (overhead > benefit)
def bad_small_array():
    small = cp.array([1, 2, 3])  # Too small for GPU!
    return cp.sum(small)

# GOOD: Use CPU for small operations
def good_small_array():
    small = np.array([1, 2, 3])  # CPU is faster
    return np.sum(small)
```

### 3. Memory Leaks

```python
# BAD: Accumulating references
def bad_leak():
    results = []
    for i in range(1000):
        data = cp.random.random(1000000)
        results.append(data)  # Accumulates GPU memory!
    return results

# GOOD: Explicit cleanup
def good_cleanup():
    results = []
    for i in range(1000):
        data = cp.random.random(1000000)
        results.append(float(cp.sum(data)))
        del data  # Free GPU memory
    return results
```

### 4. Implicit Data Copies

```python
# BAD: Implicit copies
def bad_implicit(data_gpu: cp.ndarray):
    # This creates a CPU copy implicitly
    if np.any(data_gpu > 0):  # Implicit copy!
        return True

# GOOD: Explicit checks
def good_explicit(data_gpu: cp.ndarray):
    # Keep on GPU
    if cp.any(data_gpu > 0):
        return True
```

---

## Best Practices Summary

### ✅ DO

1. **Pre-allocate memory** - Allocate once, reuse many times
2. **Use chunked processing** - For large datasets that exceed VRAM
3. **Fuse operations** - Use `@cp.fuse()` to combine kernels
4. **Keep data on GPU** - Minimize CPU-GPU transfers
5. **Use appropriate precision** - FP16 for speed, FP32 for accuracy
6. **Profile everything** - Measure before optimizing
7. **Set memory limits** - Use `mempool.set_limit()` to prevent OOM
8. **Use batch operations** - Leverage Tensor Cores
9. **Synchronize strategically** - Only when necessary
10. **Check GPU availability** - Always provide CPU fallback

### ❌ DON'T

1. **Don't transfer in loops** - Batch transfers instead
2. **Don't use small arrays** - GPU overhead > benefit for <1000 elements
3. **Don't ignore memory** - Monitor VRAM usage
4. **Don't assume GPU available** - Always provide fallback
5. **Don't forget synchronization** - Use `cp.cuda.Device().synchronize()` for timing
6. **Don't create temporary arrays** - Reuse buffers
7. **Don't use Python loops** - Vectorize operations
8. **Don't ignore data types** - Use appropriate precision
9. **Don't neglect occupancy** - Optimize thread block sizes
10. **Don't skip profiling** - Measure before optimizing

---

## Quick Reference

### Memory Limits

```
Total VRAM: 6 GB
Safe limit: 4.5 GB (75%)
Large matrix: < 2000×2000 (~16 MB)
Agent population: < 10,000 agents
Timestep batch: < 1000 steps
```

### Performance Targets

```
Matrix multiply (2000×2000): < 5 ms
Element-wise ops (10M): < 1 ms
Reduction (10M): < 0.5 ms
FFT (1M): < 2 ms
```

### Optimization Checklist

- [ ] Pre-allocated memory
- [ ] Minimized transfers
- [ ] Used appropriate precision
- [ ] Fused operations
- [ ] Batched computations
- [ ] Profiled performance
- [ ] Set memory limits
- [ ] CPU fallback provided
- [ ] Documented memory usage
- [ ] Tested with max dataset size

---

*Created by GPU Simulation Orchestrator*
*Model: DeepSeek-Reasoner (Opus)*
*Last Updated: 2026-03-13*

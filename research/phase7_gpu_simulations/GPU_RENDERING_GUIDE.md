# GPU Rendering Optimization Guide

## Overview

This guide provides comprehensive techniques for optimizing GPU-accelerated rendering to achieve 60+ FPS with <16ms frame time in real-time visualizations.

## Table of Contents

1. [Data Transfer Minimization](#data-transfer-minimization)
2. [Rendering Optimization](#rendering-optimization)
3. [Memory Management](#memory-management)
4. [Kernel Optimization](#kernel-optimization)
5. [Parallel Processing](#parallel-processing)
6. [Performance Profiling](#performance-profiling)

---

## Data Transfer Minimization

### Principle: Keep Data on GPU

CPU-GPU transfer is the bottleneck. Minimize transfers by:

```python
import cupy as cp
import numpy as np

# ❌ BAD: Transfer every frame
def update_bad():
    for i in range(1000):
        data_gpu = cp.array(data_cpu)  # Transfer each iteration
        result = cp.sum(data_gpu)
        results.append(cp.asnumpy(result))  # Transfer back

# ✅ GOOD: Transfer once, compute many times
def update_good():
    data_gpu = cp.array(data_cpu)  # Transfer once
    for i in range(1000):
        result = cp.sum(data_gpu)  # Compute on GPU
        results.append(result)  # Keep on GPU
    # Transfer all results at end
    return cp.asnumpy(cp.array(results))
```

### Batch Transfers

When transfers are necessary, batch them:

```python
# Batch multiple arrays in one transfer
def batch_transfer(positions, states, velocities):
    # Stack arrays before transfer
    stacked = np.stack([positions, states, velocities], axis=0)
    stacked_gpu = cp.array(stacked)  # Single transfer

    # Unpack on GPU
    positions_gpu, states_gpu, velocities_gpu = (
        stacked_gpu[0], stacked_gpu[1], stacked_gpu[2]
    )

    return positions_gpu, states_gpu, velocities_gpu
```

### Use Pinned Memory

Accelerate transfers with pinned memory:

```python
# Allocate pinned memory for faster transfers
def create_pinned_buffer(shape, dtype):
    # Create pinned memory buffer
    mem = cp.cuda.PinnedMemory(
        cp.cuda.alloc_pinned_memory(
            np.prod(shape) * np.dtype(dtype).itemsize
        )
    )
    return np.frombuffer(mem, dtype=dtype).reshape(shape)
```

### Asynchronous Transfers

Overlap computation and transfer:

```python
def async_transfer_compute():
    # Create streams
    compute_stream = cp.cuda.Stream()
    transfer_stream = cp.cuda.Stream()

    # Transfer data asynchronously
    with transfer_stream:
        data_gpu = cp.asarray(data_cpu)

    # Compute on previous data while transferring
    with compute_stream:
        result = process_data(previous_data_gpu)

    # Synchronize
    transfer_stream.synchronize()
    compute_stream.synchronize()
```

---

## Rendering Optimization

### Use set_data Instead of Clearing

```python
# ❌ BAD: Clear and redraw
def update_bad():
    ax.clear()
    ax.plot(x, y)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)

# ✅ GOOD: Update data only
def update_good():
    line.set_data(x, y)
    # Limits only need updating if data range changes
```

### Blit Only Changed Artists

```python
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

# Track which artists changed
def update(frame):
    updated_artists = []

    # Only update heatmap if changed
    if heatmap_needs_update:
        heatmap_artist.set_data(new_data)
        updated_artists.append(heatmap_artist)

    # Only update text if changed
    if frame % 10 == 0:  # Update text every 10 frames
        text_artist.set_text(f"Frame: {frame}")
        updated_artists.append(text_artist)

    return updated_artists

# Enable blitting
anim = FuncAnimation(
    fig,
    update,
    blit=True,  # Only redraw changed artists
    interval=16  # ~60 FPS
)
```

### Reduce Point Count for Large Datasets

```python
def downsample_for_render(data_gpu, max_points=10000):
    """Downsample large datasets for rendering."""
    n_points = data_gpu.shape[0]

    if n_points <= max_points:
        return data_gpu

    # Random sampling on GPU
    indices = cp.random.choice(
        n_points,
        max_points,
        replace=False
    )

    return data_gpu[indices]

# Usage in visualization
def update_viz():
    # Compute with full dataset
    all_positions = compute_positions()  # 1M points

    # Render with downsampled data
    render_positions = downsample_for_render(
        all_positions,
        max_points=10000
    )

    scatter.set_offsets(cp.asnumpy(render_positions))
```

### Use Fast Colormaps

```python
# Pre-compute colormap for faster rendering
import matplotlib.colors as mcolors

def precompute_colormap(cmap_name, n_levels=256):
    """Pre-compute colormap for fast lookup."""
    cmap = plt.get_cmap(cmap_name)
    return cmap(np.linspace(0, 1, n_levels))

# Apply colormap on GPU
def apply_colormap_gpu(values_gpu, colormap):
    """Fast colormap application on GPU."""
    # Normalize to 0-1
    values_norm = (values_gpu - values_gpu.min()) / (values_gpu.max() - values_gpu.min())

    # Convert to indices
    indices = (values_norm * (len(colormap) - 1)).astype(cp.int32)

    # Apply colormap (transfer colormap to GPU)
    colormap_gpu = cp.array(colormap)
    colored = colormap_gpu[indices]

    return colored
```

---

## Memory Management

### Reuse GPU Arrays

```python
class GPUMemoryPool:
    """Pool for reusing GPU arrays."""

    def __init__(self):
        self.pools = {}

    def get_array(self, shape, dtype):
        """Get array from pool or create new."""
        key = (shape, dtype)

        if key not in self.pools or self.pools[key][0] is None:
            # Create new array
            arr = cp.empty(shape, dtype)
            self.pools[key] = [arr]
        else:
            # Reuse existing
            arr = self.pools[key].pop()

        return arr

    def return_array(self, arr):
        """Return array to pool."""
        key = (arr.shape, arr.dtype)
        if key not in self.pools:
            self.pools[key] = []
        self.pools[key].append(arr)

# Usage
pool = GPUMemoryPool()

def process_with_pool():
    temp = pool.get_array((1000, 1000), cp.float32)
    # Use temp
    result = temp * 2
    # Return to pool
    pool.return_array(temp)
    return result
```

### Use In-Place Operations

```python
# ❌ BAD: Creates new arrays
def compute_bad(a_gpu, b_gpu):
    c_gpu = a_gpu + b_gpu  # New array
    d_gpu = c_gpu * 2  # Another new array
    e_gpu = cp.sin(d_gpu)  # Yet another
    return e_gpu

# ✅ GOOD: In-place operations
def compute_good(a_gpu, b_gpu):
    a_gpu += b_gpu  # In-place add
    a_gpu *= 2  # In-place multiply
    cp.sin(a_gpu, out=a_gpu)  # In-place sin
    return a_gpu
```

### Manage Memory Fragments

```python
def clear_gpu_memory():
    """Clear GPU memory fragments."""
    # Clear Cupy memory pool
    mempool = cp.get_default_memory_pool()
    mempool.free_all_blocks()

    # Clear pinned memory pool
    pinned_mempool = cp.get_default_pinned_memory_pool()
    pinned_mempool.free_all_blocks()

# Call periodically to prevent memory growth
def update_with_cleanup(frame):
    result = update_simulation(frame)

    if frame % 100 == 0:
        clear_gpu_memory()

    return result
```

---

## Kernel Optimization

### Use Vectorized Operations

```python
# ❌ BAD: Python loop
def compute_distances_bad(positions_gpu):
    n = positions_gpu.shape[0]
    distances = cp.zeros((n, n))

    for i in range(n):
        for j in range(n):
            diff = positions_gpu[i] - positions_gpu[j]
            distances[i, j] = cp.sqrt(cp.sum(diff**2))

    return distances

# ✅ GOOD: Vectorized
def compute_distances_good(positions_gpu):
    # Broadcasting
    diff = positions_gpu[:, None, :] - positions_gpu[None, :, :]
    distances = cp.sqrt(cp.sum(diff**2, axis=2))
    return distances
```

### Use Custom Kernels for Complex Operations

```python
import cupyx as cpx

# Create custom kernel
neighbors_kernel = cp.RawKernel(r'''
extern "C" __global__
void count_neighbors(
    const float* positions,
    int* neighbors,
    int n_points,
    float radius
) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= n_points) return;

    int count = 0;
    for (int j = 0; j < n_points; j++) {
        float dx = positions[2*i] - positions[2*j];
        float dy = positions[2*i+1] - positions[2*j+1];
        float dist = sqrtf(dx*dx + dy*dy);

        if (dist < radius && i != j) {
            count++;
        }
    }

    neighbors[i] = count;
}
''', 'count_neighbors')

def count_neighbors_gpu(positions_gpu, radius=0.1):
    """Count neighbors using custom kernel."""
    n = positions_gpu.shape[0]

    # Flatten positions
    positions_flat = positions_gpu.flatten()

    # Allocate result
    neighbors = cp.zeros(n, dtype=cp.int32)

    # Launch kernel
    threads_per_block = 256
    blocks_per_grid = (n + threads_per_block - 1) // threads_per_block

    neighbors_kernel(
        (blocks_per_grid,),
        (threads_per_block,),
        (positions_flat, neighbors, n, radius)
    )

    return neighbors
```

### Use Shared Memory for Repeated Access

```python
# Kernel with shared memory
shared_memory_kernel = cp.RawKernel(r'''
extern "C" __global__
void compute_with_shared(
    const float* data,
    float* result,
    int n
) {
    extern __shared__ float s_data[];

    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    int tid = threadIdx.x;

    // Load into shared memory
    if (idx < n) {
        s_data[tid] = data[idx];
    }
    __syncthreads();

    // Compute using shared memory (faster)
    if (idx < n) {
        float sum = 0;
        for (int i = 0; i < blockDim.x; i++) {
            sum += s_data[i];
        }
        result[idx] = sum / blockDim.x;
    }
}
''', 'compute_with_shared')
```

---

## Parallel Processing

### Use Multiple Streams

```python
def parallel_processing():
    """Process multiple tasks in parallel streams."""
    streams = [cp.cuda.Stream() for _ in range(4)]

    # Task 1
    with streams[0]:
        result1 = compute_task1()

    # Task 2
    with streams[1]:
        result2 = compute_task2()

    # Task 3
    with streams[2]:
        result3 = compute_task3()

    # Task 4
    with streams[3]:
        result4 = compute_task4()

    # Synchronize all streams
    for stream in streams:
        stream.synchronize()

    return result1, result2, result3, result4
```

### Pipeline Processing

```python
def pipeline_processing():
    """Pipeline multiple stages for better GPU utilization."""
    stream_compute = cp.cuda.Stream()
    stream_transfer = cp.cuda.Stream()

    results = []

    # Initial transfer
    with stream_transfer:
        data_gpu = cp.asarray(data_cpu[0])

    for i in range(len(data_cpu)):
        # Compute current data
        with stream_compute:
            if i > 0:
                result = process_data(data_gpu)
                results.append(cp.asnumpy(result))

        # Transfer next data
        with stream_transfer:
            if i < len(data_cpu) - 1:
                data_gpu = cp.asarray(data_cpu[i + 1])

    return results
```

---

## Performance Profiling

### Measure GPU Time

```python
def measure_gpu_time(func, *args, repeat=100):
    """Measure GPU execution time."""
    # Warm-up
    for _ in range(10):
        func(*args)

    # Synchronize before timing
    cp.cuda.Stream().synchronize()

    # Time execution
    start = cp.cuda.Event()
    end = cp.cuda.Event()

    start.record()
    for _ in range(repeat):
        result = func(*args)
    end.record()

    end.synchronize()

    # Calculate time in milliseconds
    time_ms = cp.cuda.get_elapsed_time(start, end) / repeat

    return time_ms

# Usage
time_ms = measure_gpu_time(compute_distances, positions_gpu)
print(f"Average time: {time_ms:.3f} ms")
```

### Profile Memory Usage

```python
def profile_memory():
    """Profile GPU memory usage."""
    pool = cp.get_default_memory_pool()

    print(f"Used bytes: {pool.used_bytes() / 1024**2:.2f} MB")
    print(f"Total bytes: {pool.total_bytes() / 1024**2:.2f} MB")
    print(f"Free bytes: {pool.free_bytes() / 1024**2:.2f} MB")

    # Get memory limits
    meminfo = cp.cuda.runtime.memGetInfo()
    print(f"Free memory: {meminfo[0] / 1024**2:.2f} MB")
    print(f"Total memory: {meminfo[1] / 1024**2:.2f} MB")
```

### Identify Bottlenecks

```python
import time

def profile_updates():
    """Profile different stages of update."""
    timings = {}

    for _ in range(100):
        # Stage 1: Data update
        start = time.perf_counter()
        update_data()
        timings['data_update'] = time.perf_counter() - start

        # Stage 2: GPU computation
        start = time.perf_counter()
        compute_on_gpu()
        cp.cuda.Stream().synchronize()
        timings['gpu_compute'] = time.perf_counter() - start

        # Stage 3: Transfer back
        start = time.perf_counter()
        data_cpu = cp.asnumpy(data_gpu)
        timings['transfer'] = time.perf_counter() - start

        # Stage 4: Rendering
        start = time.perf_counter()
        update_rendering(data_cpu)
        timings['render'] = time.perf_counter() - start

    # Print averages
    for stage, times in timings.items():
        avg = sum(times) / len(times) * 1000
        print(f"{stage}: {avg:.2f} ms")
```

---

## Best Practices Summary

### DO:
✅ Keep data on GPU as long as possible
✅ Batch transfers when necessary
✅ Use in-place operations
✅ Pre-allocate GPU arrays
✅ Use vectorized operations
✅ Profile before optimizing
✅ Reuse GPU memory
✅ Use blitting for matplotlib

### DON'T:
❌ Transfer data every frame
❌ Create temporary arrays in loops
❌ Use Python loops for GPU computation
❌ Ignore memory pool management
❌ Render more points than necessary
❌ Forget to synchronize streams
❌ Clear and redraw entire plots

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frame Rate | 60+ FPS | 1 / mean_frame_time |
| Frame Time | <16ms | Total update time |
| GPU Compute | <10ms | Computation only |
| Transfer Time | <2ms | CPU-GPU transfer |
| Render Time | <4ms | Matplotlib rendering |
| Memory Usage | <80% VRAM | GPU memory pool |

---

## Quick Reference

### Essential Commands

```python
# Clear memory
cp.get_default_memory_pool().free_all_blocks()

# Synchronize
cp.cuda.Stream().synchronize()

# Profile
start = cp.cuda.Event()
end = cp.cuda.Event()
start.record()
# ... code ...
end.record()
end.synchronize()
time_ms = cp.cuda.get_elapsed_time(start, end)

# Check memory
pool = cp.get_default_memory_pool()
print(f"Used: {pool.used_bytes() / 1024**2:.2f} MB")
```

This guide provides the foundation for achieving real-time performance with GPU-accelerated visualizations.

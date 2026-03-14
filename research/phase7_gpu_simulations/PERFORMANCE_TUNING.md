# Performance Tuning Guide

## Overview

This guide provides comprehensive techniques for optimizing visualization performance to achieve 60+ FPS with <16ms frame time in GPU-accelerated simulations.

## Table of Contents

1. [Performance Profiling](#performance-profiling)
2. [GPU Optimization](#gpu-optimization)
3. [Rendering Optimization](#rendering-optimization)
4. [Memory Optimization](#memory-optimization)
5. [Algorithm Optimization](#algorithm-optimization)
6. [System Configuration](#system-configuration)

---

## Performance Profiling

### Identify Bottlenecks

```python
import time
import cupy as cp
from contextlib import contextmanager

@contextmanager
def timer(name):
    """Context manager for timing code blocks."""
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"{name}: {elapsed*1000:.2f} ms")

def profile_update_frame():
    """Profile a single frame update."""
    print("=== Frame Update Profile ===")

    with timer("Data Update"):
        update_data()

    with timer("GPU Computation"):
        result_gpu = compute_on_gpu()
        cp.cuda.Stream().synchronize()

    with timer("Transfer to CPU"):
        result_cpu = cp.asnumpy(result_gpu)

    with timer("Rendering"):
        update_visualization(result_cpu)

    with timer("Total Frame"):
        pass  # Total time measured by outer context

# Run profile
for i in range(100):
    profile_update_frame()
    if i == 10:  # Profile after warm-up
        break
```

### GPU-Specific Profiling

```python
def profile_gpu_operations():
    """Profile GPU operations with events."""
    # Create events
    start = cp.cuda.Event()
    end = cp.cuda.Event()

    # Record computation
    start.record()

    # Your GPU code here
    result = expensive_gpu_computation()

    end.record()
    end.synchronize()

    # Get elapsed time in milliseconds
    elapsed_ms = cp.cuda.get_elapsed_time(start, end)

    print(f"GPU Computation: {elapsed_ms:.3f} ms")
    return elapsed_ms

def profile_memory_usage():
    """Profile GPU memory usage."""
    pool = cp.get_default_memory_pool()

    print(f"Memory Usage:")
    print(f"  Used:  {pool.used_bytes() / 1024**2:.2f} MB")
    print(f"  Total: {pool.total_bytes() / 1024**2:.2f} MB")
    print(f"  Free:  {pool.free_bytes() / 1024**2:.2f} MB")

    # Get device limits
    meminfo = cp.cuda.runtime.memGetInfo()
    print(f"  Device Free:  {meminfo[0] / 1024**2:.2f} MB")
    print(f"  Device Total: {meminfo[1] / 1024**2:.2f} MB")
```

### Frame Rate Monitoring

```python
class FrameRateMonitor:
    """Monitor and display frame rate statistics."""

    def __init__(self, window_size=100):
        self.window_size = window_size
        self.frame_times = []
        self.start_time = None

    def start_frame(self):
        """Mark start of frame."""
        if self.start_time is None:
            self.start_time = time.perf_counter()
        return time.perf_counter()

    def end_frame(self, start_time):
        """Mark end of frame and update stats."""
        frame_time = time.perf_counter() - start_time
        self.frame_times.append(frame_time)

        if len(self.frame_times) > self.window_size:
            self.frame_times.pop(0)

    def get_stats(self):
        """Get frame rate statistics."""
        if not self.frame_times:
            return {}

        times = np.array(self.frame_times)

        return {
            'mean_fps': 1.0 / times.mean(),
            'min_fps': 1.0 / times.max(),
            'max_fps': 1.0 / times.min(),
            'mean_frame_time_ms': times.mean() * 1000,
            'std_frame_time_ms': times.std() * 1000,
            'total_frames': len(self.frame_times)
        }

    def print_stats(self):
        """Print formatted statistics."""
        stats = self.get_stats()

        print(f"\n=== Frame Rate Statistics ===")
        print(f"Mean FPS:      {stats['mean_fps']:.1f}")
        print(f"Min FPS:       {stats['min_fps']:.1f}")
        print(f"Max FPS:       {stats['max_fps']:.1f}")
        print(f"Mean Time:     {stats['mean_frame_time_ms']:.2f} ms")
        print(f"Std Time:      {stats['std_frame_time_ms']:.2f} ms")
        print(f"Total Frames:  {stats['total_frames']}")

# Usage
monitor = FrameRateMonitor()

def update_with_monitoring(frame):
    """Update with frame rate monitoring."""
    start = monitor.start_frame()

    # Your update code here
    update_simulation()
    update_visualization()

    monitor.end_frame(start)

    # Print stats every 100 frames
    if frame % 100 == 0:
        monitor.print_stats()
```

---

## GPU Optimization

### Batch Operations

```python
# ❌ BAD: Multiple small operations
def slow_gpu_update(positions_gpu, velocities_gpu):
    """Slow multiple small operations."""
    for i in range(len(positions_gpu)):
        positions_gpu[i] += velocities_gpu[i]
        positions_gpu[i] = cp.clip(positions_gpu[i], 0, 1)

# ✅ GOOD: Single vectorized operation
def fast_gpu_update(positions_gpu, velocities_gpu):
    """Fast vectorized operation."""
    positions_gpu += velocities_gpu
    positions_gpu = cp.clip(positions_gpu, 0, 1)
    return positions_gpu
```

### Use Shared Memory

```python
# Custom kernel with shared memory
shared_mem_kernel = cp.RawKernel(r'''
extern "C" __global__
void compute_with_shared_memory(
    const float* data,
    float* result,
    int n,
    int window_size
) {
    extern __shared__ float s_data[];

    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    int tid = threadIdx.x;

    // Load data into shared memory
    if (idx < n) {
        s_data[tid] = data[idx];
    }
    __syncthreads();

    // Compute using shared memory (much faster)
    if (idx < n && tid < blockDim.x - window_size) {
        float sum = 0;
        for (int i = 0; i < window_size; i++) {
            sum += s_data[tid + i];
        }
        result[idx] = sum / window_size;
    }
}
''', 'compute_with_shared_memory')

def moving_average_gpu(data_gpu, window_size=5):
    """Compute moving average using shared memory."""
    n = len(data_gpu)
    result_gpu = cp.zeros(n, dtype=cp.float32)

    # Calculate shared memory size
    shared_mem_size = (256 + window_size) * 4  # 256 threads, 4 bytes per float

    # Launch kernel
    threads_per_block = 256
    blocks_per_grid = (n + threads_per_block - 1) // threads_per_block

    shared_mem_kernel(
        (blocks_per_grid,),
        (threads_per_block,),
        (data_gpu.astype(cp.float32), result_gpu, n, window_size),
        shared_mem=shared_mem_size
    )

    return result_gpu
```

### Optimize Memory Access Patterns

```python
# ❌ BAD: Strided access (slow)
def slow_memory_access(matrix_gpu):
    """Slow strided memory access."""
    result = cp.zeros(matrix_gpu.shape[0])
    for i in range(matrix_gpu.shape[0]):
        result[i] = matrix_gpu[i, ::2].mean()  # Strided access
    return result

# ✅ GOOD: Coalesced access (fast)
def fast_memory_access(matrix_gpu):
    """Fast coalesced memory access."""
    # Transpose for better access pattern
    matrix_t_gpu = matrix_gpu.T
    result = matrix_t_gpu[::2, :].mean(axis=0)
    return result
```

### Use CuPy Built-in Functions

```python
# ✅ GOOD: Use optimized CuPy functions
def optimized_statistics(data_gpu):
    """Use CuPy's optimized statistical functions."""
    return {
        'mean': cp.mean(data_gpu),
        'std': cp.std(data_gpu),
        'min': cp.min(data_gpu),
        'max': cp.max(data_gpu),
        'median': cp.median(data_gpu),
        'percentile': cp.percentile(data_gpu, 25)
    }

# ✅ GOOD: Use optimized linear algebra
def optimized_distance_matrix(points_gpu):
    """Use CuPy's optimized linear algebra."""
    # Broadcasting with optimized operations
    diff = points_gpu[:, None, :] - points_gpu[None, :, :]
    distances = cp.linalg.norm(diff, axis=2)
    return distances
```

---

## Rendering Optimization

### Minimize Artist Updates

```python
class OptimizedVisualizer:
    """Visualizer with optimized rendering."""

    def __init__(self):
        self.updated_artists = set()

    def update_inefficient(self, data):
        """❌ BAD: Update all artists every frame."""
        self.heatmap.set_data(data)
        self.line1.set_data(data[:, 0])
        self.line2.set_data(data[:, 1])
        self.text.set_text(f"Frame: {self.frame}")
        self.scatter.set_offsets(data)
        return [self.heatmap, self.line1, self.line2, self.text, self.scatter]

    def update_efficient(self, data):
        """✅ GOOD: Track and update only changed artists."""
        self.updated_artists.clear()

        # Only update heatmap if data changed significantly
        if self.heatmap_needs_update(data):
            self.heatmap.set_data(data)
            self.updated_artists.add(self.heatmap)

        # Update lines every frame
        self.line1.set_data(data[:, 0])
        self.line2.set_data(data[:, 1])
        self.updated_artists.add(self.line1)
        self.updated_artists.add(self.line2)

        # Update text only every 10 frames
        if self.frame % 10 == 0:
            self.text.set_text(f"Frame: {self.frame}")
            self.updated_artists.add(self.text)

        # Update scatter if positions changed
        if self.positions_changed(data):
            self.scatter.set_offsets(data)
            self.updated_artists.add(self.scatter)

        return list(self.updated_artists)
```

### Use Efficient Plot Types

```python
# ❌ BAD: Using scatter for large datasets
def plot_large_data_slow(x, y):
    """Slow scatter plot for large data."""
    plt.scatter(x, y, s=1)  # Very slow for >10k points
    plt.show()

# ✅ GOOD: Use imshow for density
def plot_large_data_fast(x, y, grid_size=100):
    """Fast density plot using histogram."""
    # Create 2D histogram
    heatmap, xedges, yedges = np.histogram2d(
        x, y, bins=grid_size
    )

    # Display as image
    plt.imshow(
        heatmap.T,
        origin='lower',
        cmap='viridis',
        interpolation='bilinear'
    )
    plt.colorbar()
    plt.show()

# ✅ GOOD: Use Line2D for trajectories
def plot_trajectory_fast(trajectory):
    """Fast trajectory plotting."""
    line, = plt.plot([], [], lw=1)

    # Update data efficiently
    line.set_data(trajectory[:, 0], trajectory[:, 1])

    return line
```

### Optimize Colormap Application

```python
def fast_colormap application(values_gpu, cmap_name='viridis'):
    """Fast colormap application using pre-computed lookup."""
    import matplotlib.colors as mcolors

    # Pre-compute colormap
    cmap = plt.get_cmap(cmap_name)
    colormap_table = cmap(np.linspace(0, 1, 256))

    # Normalize values to 0-1
    values_min = values_gpu.min()
    values_max = values_gpu.max()
    values_norm = (values_gpu - values_min) / (values_max - values_min + 1e-6)

    # Convert to indices
    indices = (values_norm * 255).astype(cp.int32)

    # Transfer colormap to GPU
    colormap_gpu = cp.array(colormap_table)

    # Apply colormap (fast indexing)
    colored_gpu = colormap_gpu[indices]

    return colored_gpu
```

### Use Blitting Strategically

```python
class BlittingAnimation:
    """Animation with optimized blitting."""

    def __init__(self):
        self.fig, self.ax = plt.subplots()
        self.setup_plot()

        # Track background for blitting
        self.background = None

    def setup_plot(self):
        """Setup initial plot."""
        self.line, = self.ax.plot([], [], lw=2)
        self.scatter = self.ax.scatter([], [], s=10)
        self.text = self.ax.text(0.02, 0.95, '', transform=self.ax.transAxes)

    def init_animation(self):
        """Initialize animation."""
        self.line.set_data([], [])
        self.scatter.set_offsets(np.empty((0, 2)))
        self.text.set_text('')
        return self.line, self.scatter, self.text

    def update_animation(self, frame):
        """Update with blitting."""
        # Save background on first frame
        if self.background is None:
            self.fig.canvas.draw_idle()
            self.background = self.fig.canvas.copy_from_bbox(self.ax.bbox)

        # Restore background
        self.fig.canvas.restore_region(self.background)

        # Update data
        data = generate_data(frame)
        self.line.set_data(data['x'], data['y'])
        self.scatter.set_offsets(data['points'])
        self.text.set_text(f"Frame: {frame}")

        # Redraw only changed artists
        for artist in [self.line, self.scatter, self.text]:
            self.ax.draw_artist(artist)

        # Blit canvas
        self.fig.canvas.blit(self.ax.bbox)

        return self.line, self.scatter, self.text

    def run(self):
        """Run animation with blitting."""
        anim = FuncAnimation(
            self.fig,
            self.update_animation,
            init_func=self.init_animation,
            frames=None,
            interval=16,
            blit=True
        )
        plt.show()
```

---

## Memory Optimization

### Reuse GPU Arrays

```python
class GPUMemoryPool:
    """Pool for reusing GPU arrays."""

    def __init__(self):
        self.pools = {}

    def get_array(self, shape, dtype=cp.float32):
        """Get array from pool."""
        key = (shape, dtype)

        if key not in self.pools:
            self.pools[key] = []

        if self.pools[key]:
            return self.pools[key].pop()
        else:
            return cp.empty(shape, dtype)

    def return_array(self, arr):
        """Return array to pool."""
        key = (arr.shape, arr.dtype)
        if key not in self.pools:
            self.pools[key] = []
        self.pools[key].append(arr)

# Usage
pool = GPUMemoryPool()

def compute_with_pool(data_gpu):
    """Compute using memory pool."""
    temp = pool.get_array((1000, 1000))
    result = cp.matmul(data_gpu, temp)
    pool.return_array(temp)
    return result
```

### Clear Memory Periodically

```python
class MemoryManagedVisualizer:
    """Visualizer with memory management."""

    def __init__(self, cleanup_interval=100):
        self.cleanup_interval = cleanup_interval
        self.frame_count = 0

    def update(self, frame):
        """Update with periodic memory cleanup."""
        # Your update code here
        result = self.update_simulation(frame)

        # Periodic cleanup
        self.frame_count += 1
        if self.frame_count % self.cleanup_interval == 0:
            self.cleanup_memory()

        return result

    def cleanup_memory(self):
        """Clean up GPU memory."""
        # Clear Cupy memory pool
        mempool = cp.get_default_memory_pool()
        mempool.free_all_blocks()

        # Clear pinned memory pool
        pinned_mempool = cp.get_default_pinned_memory_pool()
        pinned_mempool.free_all_blocks()

        # Force garbage collection
        import gc
        gc.collect()
```

### Use In-Place Operations

```python
# ❌ BAD: Creates many temporary arrays
def slow_processing(data_gpu):
    """Slow processing with many temporaries."""
    temp1 = data_gpu * 2
    temp2 = temp1 + 1
    temp3 = cp.sin(temp2)
    result = temp3 - data_gpu
    return result  # 4 temporaries created

# ✅ GOOD: In-place operations
def fast_processing(data_gpu):
    """Fast processing with in-place operations."""
    result_gpu = data_gpu.copy()  # Single copy
    result_gpu *= 2  # In-place multiply
    result_gpu += 1  # In-place add
    cp.sin(result_gpu, out=result_gpu)  # In-place sin
    result_gpu -= data_gpu  # In-place subtract
    return result_gpu  # Only 1 copy
```

---

## Algorithm Optimization

### Spatial Partitioning

```python
class SpatialHash:
    """Spatial hash for fast neighbor queries."""

    def __init__(self, cell_size=0.1):
        self.cell_size = cell_size
        self.hash_table = {}

    def insert(self, positions_gpu):
        """Insert positions into spatial hash."""
        self.hash_table = {}

        # Compute cell indices
        cell_indices = (positions_gpu / self.cell_size).astype(cp.int32)

        # Group by cell
        for i, (idx, idy) in enumerate(cell_indices):
            key = (int(idx), int(idy))
            if key not in self.hash_table:
                self.hash_table[key] = []
            self.hash_table[key].append(i)

    def query_neighbors(self, position, radius):
        """Query neighbors within radius."""
        # Compute cell range
        cx, cy = int(position[0] / self.cell_size), int(position[1] / self.cell_size)
        cell_range = int(radius / self.cell_size) + 1

        # Query nearby cells
        neighbors = []
        for dx in range(-cell_range, cell_range + 1):
            for dy in range(-cell_range, cell_range + 1):
                key = (cx + dx, cy + dy)
                if key in self.hash_table:
                    neighbors.extend(self.hash_table[key])

        return neighbors
```

### Level-of-Detail (LOD)

```python
class LODRenderer:
    """Level-of-detail renderer for performance."""

    def __init__(self, thresholds=[1000, 5000, 10000]):
        self.thresholds = thresholds

    def get_render_size(self, total_points, zoom_level):
        """Get number of points to render based on zoom."""
        if zoom_level < 0.5:
            # Far view: render 10%
            return min(total_points // 10, self.thresholds[0])
        elif zoom_level < 1.0:
            # Mid view: render 50%
            return min(total_points // 2, self.thresholds[1])
        else:
            # Close view: render all (up to threshold)
            return min(total_points, self.thresholds[2])

    def render_with_lod(self, positions_gpu, zoom_level):
        """Render with level-of-detail."""
        render_size = self.get_render_size(len(positions_gpu), zoom_level)

        if render_size < len(positions_gpu):
            # Sample points for rendering
            indices = cp.random.choice(
                len(positions_gpu),
                render_size,
                replace=False
            )
            return positions_gpu[indices]
        else:
            return positions_gpu
```

---

## System Configuration

### Optimize Matplotlib Backend

```python
import matplotlib

# Configure for better performance
matplotlib.use('Qt5Agg')  # or 'TkAgg', 'Agg'

# Configure rcParams for performance
plt.rcParams.update({
    'figure.max_open_warning': 0,
    'agg.path.chunksize': 10000,
    'path.simplify': True,
    'path.simplify_threshold': 1.0,
    'axes.linewidth': 0.5,
    'lines.linewidth': 1.0,
})
```

### GPU Memory Configuration

```python
def configure_gpu_memory():
    """Configure GPU memory settings."""
    # Set memory pool limits
    mempool = cp.get_default_memory_pool()

    # Limit memory usage (leave 1GB for system)
    total_memory = cp.cuda.Device().mem_info[1]
    mempool.set_limit(size=int(total_memory * 0.9))

    # Enable memory pool
    mempool.set_limit(size=2**30)  # 1GB limit

    print(f"GPU Memory Limit: {mempool.get_limit() / 1024**2:.2f} MB")

configure_gpu_memory()
```

### Multi-Threading Configuration

```python
import multiprocessing

def configure_threading():
    """Configure threading for optimal performance."""
    # Get CPU count
    cpu_count = multiprocessing.cpu_count()

    # Set CuPy to use appropriate number of threads
    # (leave some cores for system and rendering)
    cupy_threads = max(1, cpu_count - 2)

    # Environment variable must be set before importing CuPy
    import os
    os.environ['CUPY_NUM_THREADS'] = str(cupy_threads)

    print(f"Using {cupy_threads} threads for CuPy")

configure_threading()
```

---

## Performance Checklist

### Before Optimization

- [ ] Profile current performance
- [ ] Identify bottlenecks (CPU/GPU/Transfer)
- [ ] Measure memory usage
- [ ] Check frame rate consistency

### GPU Optimization

- [ ] Use vectorized operations
- [ ] Minimize CPU-GPU transfers
- [ ] Use in-place operations
- [ ] Implement custom kernels for bottlenecks
- [ ] Optimize memory access patterns

### Rendering Optimization

- [ ] Update only changed artists
- [ ] Use efficient plot types
- [ ] Enable blitting
- [ ] Pre-compute colormaps
- [ ] Use LOD for large datasets

### Memory Optimization

- [ ] Reuse GPU arrays
- [ ] Clear memory periodically
- [ ] Use memory pools
- [ ] Monitor memory leaks

### Final Validation

- [ ] Achieve 60+ FPS target
- [ ] Maintain <16ms frame time
- [ ] Verify visual quality
- [ ] Test with different data sizes

---

## Quick Reference

### Essential Commands

```python
# Profile GPU time
start = cp.cuda.Event()
end = cp.cuda.Event()
start.record()
# ... code ...
end.record()
end.synchronize()
time_ms = cp.cuda.get_elapsed_time(start, end)

# Clear memory
cp.get_default_memory_pool().free_all_blocks()

# Monitor frame rate
monitor = FrameRateMonitor()
monitor.start_frame()
# ... update ...
monitor.end_frame(start)
monitor.print_stats()
```

This guide provides comprehensive techniques for achieving optimal performance in GPU-accelerated visualizations.

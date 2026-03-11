# Prefetching and Memory Alignment for POLLN-RTT Tensor Operations

## Executive Summary

This research document provides comprehensive analysis of software prefetching strategies and memory alignment techniques optimized for POLLN-RTT's self-origin tensor architecture. We derive optimal prefetch distances, alignment strategies, and NUMA-aware allocation policies that leverage the LOG (Logic-Organizing-Geocentrically) principle for maximal memory hierarchy efficiency.

---

## 1. Software Prefetching

### 1.1 Optimal Prefetch Distance for Transformer Layer Weights

The prefetch distance determines how far ahead of actual use memory should be prefetched. For transformer inference with predictable access patterns, we derive the optimal distance from memory latency and compute throughput.

#### 1.1.1 Theoretical Model

Let:
- **L_mem**: Memory latency (ns) - typically 100-300ns for DDR4/DDR5
- **T_compute**: Time to compute one element (ns) - varies by operation
- **B**: Memory bandwidth (GB/s) - typically 50-200 GB/s
- **S_element**: Element size (bytes) - 4 for FP32, 2 for FP16

The optimal prefetch distance D (in elements) is:

$$D_{opt} = \lceil \frac{L_{mem}}{T_{compute}} \rceil$$

For transformer attention with d_k = 64:

```python
# Performance model for prefetch distance calculation
def calculate_prefetch_distance(
    memory_latency_ns: float = 150,      # DDR5 typical
    compute_cycles_per_element: int = 10, # Dot product per element
    clock_ghz: float = 3.0,              # CPU frequency
    cache_line_bytes: int = 64,          # x86 cache line
    element_bytes: int = 4               # FP32
):
    """
    Calculate optimal prefetch distance for transformer weights.
    
    Returns distance in elements and cache lines.
    """
    compute_time_ns = compute_cycles_per_element / clock_ghz
    elements_per_cache_line = cache_line_bytes // element_bytes
    
    # Optimal distance in elements
    distance_elements = int(memory_latency_ns / compute_time_ns)
    
    # Round up to cache line boundary
    distance_cache_lines = (distance_elements + elements_per_cache_line - 1) // elements_per_cache_line
    
    return {
        'distance_elements': distance_elements,
        'distance_cache_lines': distance_cache_lines,
        'distance_bytes': distance_elements * element_bytes,
        'compute_time_ns': compute_time_ns,
        'elements_per_line': elements_per_cache_line
    }

# Example results for typical transformer:
# distance_elements = 450
# distance_cache_lines = 8
# For batch_size=32, this means prefetch 8 cache lines ahead
```

#### 1.1.2 Transformer-Specific Prefetch Schedule

For a standard transformer layer with:
- Multi-head attention (h heads, d_k key dimension)
- Feed-forward network (d_model → 4*d_model → d_model)

```
Weight Access Order for Inference:
┌─────────────────────────────────────────────────────────────┐
│ Layer L Weights:                                            │
│   W_Q[L] → W_K[L] → W_V[L] → W_O[L]                         │
│   W_FF1[L] → W_FF2[L]                                       │
│ Layer L+1 Weights (prefetch targets):                       │
│   W_Q[L+1] ← prefetch during W_O[L] compute                 │
│   W_K[L+1] ← prefetch during W_FF1[L] compute               │
│   ...                                                       │
└─────────────────────────────────────────────────────────────┘
```

```cpp
// Optimal prefetch schedule for transformer inference
template<int HEADS, int DK, int DMODEL>
class TransformerPrefetcher {
    static constexpr int CACHE_LINE = 64;
    static constexpr int ELEMENTS_PER_LINE = CACHE_LINE / sizeof(float);
    
    // Compute optimal prefetch distance
    static constexpr int PREFETCH_DISTANCE = 
        (MEMORY_LATENCY_NS / COMPUTE_NS_PER_ELEMENT + ELEMENTS_PER_LINE - 1) 
        / ELEMENTS_PER_LINE;
    
public:
    // Prefetch pattern for attention weights
    void prefetch_attention_weights(
        const float* W_Q, const float* W_K, 
        const float* W_V, const float* W_O,
        int current_head
    ) {
        // Prefetch Q weights for next head while computing current
        if (current_head + PREFETCH_DISTANCE < HEADS) {
            const float* next_Q = W_Q + (current_head + PREFETCH_DISTANCE) * DK * DMODEL;
            #pragma unroll 4
            for (int cl = 0; cl < 4; cl++) {
                _mm_prefetch(next_Q + cl * CACHE_LINE / sizeof(float), _MM_HINT_T0);
            }
        }
        
        // Prefetch K weights (used immediately after Q)
        const float* next_K = W_K + current_head * DK * DMODEL;
        _mm_prefetch(next_K, _MM_HINT_T1);
        
        // Prefetch V weights (used after K)
        const float* next_V = W_V + current_head * DK * DMODEL;
        _mm_prefetch(next_V, _MM_HINT_T2);
    }
    
    // Inter-layer prefetch for weight streaming
    void prefetch_next_layer_weights(
        const float* next_layer_weights,
        size_t weight_size_bytes
    ) {
        // Prefetch weight cache lines ahead of compute
        const char* ptr = reinterpret_cast<const char*>(next_layer_weights);
        size_t cache_lines = weight_size_bytes / CACHE_LINE;
        
        #pragma unroll 8
        for (size_t i = 0; i < std::min(cache_lines, (size_t)8); i++) {
            _mm_prefetch(ptr + i * CACHE_LINE, _MM_HINT_T0);
        }
    }
};
```

### 1.2 Prefetch Patterns for Self-Origin Tensor Indexing

Self-origin tensors have a unique access pattern where indices are computed relative to an origin position. This enables predictable, vectorizable prefetch patterns.

#### 1.2.1 Origin-Relative Prefetch Model

For a self-origin tensor T^[s]_{i,j,k} = T([s], i-j, k), the access pattern is:

$$\text{Access}(s, i, j, k) = T[s][i - j][k]$$

The key insight from LOG principle: **origin s is implicit**, we only compute offsets i-j.

```cpp
// Self-Origin Tensor Prefetch with LOG optimization
template<typename T, int RANK>
class SelfOriginPrefetcher {
    // Origin-relative offsets (LOG: origin is implicit)
    const int* offsets_;  // Pre-computed i-j values
    
    // Prefetch stride based on relative position distribution
    static constexpr int PREFETCH_STRIDE = 8;  // elements ahead
    
public:
    // Prefetch for self-origin attention computation
    // Key insight: offsets[i-j] is predictable, enables SIMD prefetch
    void prefetch_attention_origin(
        const T* origin_data,      // Base pointer (origin)
        const int* query_offsets,  // Q relative positions
        const int* key_offsets,    // K relative positions
        int num_heads,
        int head_dim
    ) {
        // LOG: All offsets relative to origin enable uniform prefetch
        #pragma omp simd
        for (int h = 0; h < num_heads; h++) {
            // Prefetch query data at relative offset
            const T* q_ptr = origin_data + query_offsets[h] * head_dim;
            _mm_prefetch(q_ptr, _MM_HINT_T0);
            
            // Prefetch key data (next head's keys)
            int next_h = std::min(h + PREFETCH_STRIDE, num_heads - 1);
            const T* k_ptr = origin_data + key_offsets[next_h] * head_dim;
            _mm_prefetch(k_ptr, _MM_HINT_T1);
        }
    }
    
    // Batch prefetch for multiple self-origin tensors
    void prefetch_batch_origin(
        const T** origins,      // Multiple origin pointers
        const int* offsets,     // Relative offsets for all
        int batch_size,
        int elements_per_origin
    ) {
        // Prefetch from each origin at its relative offset
        for (int b = 0; b < batch_size; b++) {
            const T* origin = origins[b];
            int off = offsets[b];
            
            // Prefetch origin-relative data
            #pragma unroll 4
            for (int cl = 0; cl < 4; cl++) {
                _mm_prefetch(
                    origin + off + cl * (CACHE_LINE / sizeof(T)),
                    _MM_HINT_T0
                );
            }
        }
    }
};
```

#### 1.2.2 Prefetch for Sparse Self-Origin Access

When accessing sparse patterns in self-origin tensors (e.g., sparse attention), we use gather-based prefetch:

```cpp
// Sparse self-origin prefetch with indirect addressing
class SparseSelfOriginPrefetcher {
public:
    // Prefetch for sparse attention pattern
    // Only prefetch non-zero attention positions
    void prefetch_sparse_attention(
        const float* value_ptr,     // Value tensor base
        const int* sparse_indices,  // Non-zero positions (relative to origin)
        const float* sparse_weights,// Attention weights
        int nnz,                    // Number of non-zeros
        int head_dim
    ) {
        // Prefetch only non-zero elements
        #pragma omp simd
        for (int i = 0; i < nnz; i++) {
            int idx = sparse_indices[i];
            
            // Prefetch value at sparse index
            const float* val = value_ptr + idx * head_dim;
            
            // Use non-temporal hint for sparse data (evict quickly)
            _mm_prefetch(val, _MM_HINT_NTA);
            
            // Prefetch weight
            _mm_prefetch(sparse_weights + i, _MM_HINT_T0);
        }
    }
};
```

### 1.3 Hardware Prefetcher vs Software Prefetch Trade-offs

Modern CPUs have sophisticated hardware prefetchers that can detect sequential and strided access patterns. Understanding when to use software prefetching vs relying on hardware is crucial.

#### 1.3.1 Hardware Prefetcher Capabilities

```
┌─────────────────────────────────────────────────────────────────────┐
│ Hardware Prefetcher Types:                                          │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Stream Prefetcher: Detects sequential access                     │
│    - Trigger: 2+ cache misses in sequential pattern                 │
│    - Distance: 2-4 cache lines ahead                                │
│    - Best for: Dense tensor operations, sequential scans            │
│                                                                     │
│ 2. Stride Prefetcher: Detects fixed-stride access                   │
│    - Trigger: 2+ cache misses with constant stride                  │
│    - Distance: 1-2 strides ahead                                    │
│    - Best for: Matrix operations with regular strides               │
│                                                                     │
│ 3. Spatial Prefetcher: Detects spatial locality                     │
│    - Trigger: Access within 4KB page                                │
│    - Distance: Adjacent cache lines                                 │
│    - Best for: Structure-of-Arrays access patterns                  │
└─────────────────────────────────────────────────────────────────────┘
```

#### 1.3.2 Decision Matrix

| Access Pattern | Hardware Prefetch | Software Prefetch | Recommendation |
|----------------|-------------------|-------------------|----------------|
| Sequential dense | Excellent | Unnecessary | Rely on hardware |
| Fixed stride | Good | Optional | Hardware + software hint |
| Irregular (sparse) | Poor | Essential | Software required |
| Pointer-chasing | None | Essential | Software required |
| Cross-layer | None | Essential | Software required |
| Self-origin relative | Partial | Beneficial | Hybrid approach |

```cpp
// Decision logic for prefetch strategy
enum class PrefetchStrategy {
    HARDWARE_ONLY,      // Rely on hardware prefetcher
    SOFTWARE_HINT,      // Software hints supplement hardware
    SOFTWARE_AGGRESSIVE,// Software controls all prefetching
    HYBRID_SELF_ORIGIN  // Special handling for self-origin patterns
};

template<PrefetchStrategy S>
struct PrefetchPolicy {
    static constexpr bool use_software = (S != PrefetchStrategy::HARDWARE_ONLY);
    static constexpr bool use_hardware = (S != PrefetchStrategy::SOFTWARE_AGGRESSIVE);
    static constexpr int prefetch_distance = 
        (S == PrefetchStrategy::SOFTWARE_AGGRESSIVE) ? 16 :
        (S == PrefetchStrategy::HYBRID_SELF_ORIGIN) ? 8 : 4;
};

// Policy selection based on access pattern
PrefetchStrategy select_prefetch_strategy(
    bool is_sequential,
    bool is_sparse,
    bool is_self_origin,
    int stride
) {
    if (is_self_origin) {
        return PrefetchStrategy::HYBRID_SELF_ORIGIN;
    }
    if (is_sparse) {
        return PrefetchStrategy::SOFTWARE_AGGRESSIVE;
    }
    if (is_sequential && stride == 1) {
        return PrefetchStrategy::HARDWARE_ONLY;
    }
    if (stride > 0 && stride < 64) {
        return PrefetchStrategy::SOFTWARE_HINT;
    }
    return PrefetchStrategy::SOFTWARE_AGGRESSIVE;
}
```

### 1.4 Prefetch for Irregular Access in Sparse Attention

Sparse attention patterns create irregular memory access that defeats hardware prefetchers. We design specialized software prefetching strategies.

#### 1.4.1 Block-Sparse Prefetch Pattern

```cpp
// Block-sparse attention prefetcher
// Pattern: attention only within local blocks + global tokens
class BlockSparsePrefetcher {
    // Block structure
    int block_size_;     // Local attention block size
    int num_global_;     // Number of global attention tokens
    int seq_len_;        // Sequence length
    
public:
    // Prefetch for block-sparse attention computation
    void prefetch_block_sparse(
        const float* query,    // [seq_len, head_dim]
        const float* key,      // [seq_len, head_dim]
        const float* value,    // [seq_len, head_dim]
        int current_block
    ) {
        int block_start = current_block * block_size_;
        int block_end = std::min(block_start + block_size_, seq_len_);
        
        // 1. Prefetch local block (sequential, hardware handles well)
        // Just one hint to warm up hardware prefetcher
        _mm_prefetch(query + block_end, _MM_HINT_T0);
        
        // 2. Prefetch global tokens (irregular, software required)
        for (int g = 0; g < num_global_; g++) {
            int global_idx = g;  // Global token positions
            _mm_prefetch(key + global_idx * head_dim_, _MM_HINT_T1);
            _mm_prefetch(value + global_idx * head_dim_, _MM_HINT_T1);
        }
        
        // 3. Prefetch next block's boundary
        int next_block_start = block_end;
        if (next_block_start < seq_len_) {
            _mm_prefetch(query + next_block_start * head_dim_, _MM_HINT_T0);
        }
    }
    
    // Batch prefetch for multiple blocks in parallel
    void prefetch_multi_block(
        const float* query,
        const float* key,
        const float* value,
        const int* block_indices,  // Blocks to compute
        int num_blocks,
        int head_dim
    ) {
        // Prefetch first 8 blocks in parallel
        constexpr int PREFETCH_BATCH = 8;
        int batch_size = std::min(num_blocks, PREFETCH_BATCH);
        
        #pragma unroll
        for (int b = 0; b < batch_size; b++) {
            int block_idx = block_indices[b];
            int start = block_idx * block_size_;
            
            // Prefetch Q, K, V for this block
            _mm_prefetch(query + start * head_dim, _MM_HINT_T0);
            _mm_prefetch(key + start * head_dim, _MM_HINT_T1);
            _mm_prefetch(value + start * head_dim, _MM_HINT_T2);
        }
    }
};
```

#### 1.4.2 Attention Pattern Prediction for Prefetch

```cpp
// Predictive prefetch based on attention score patterns
class PredictivePrefetcher {
    // Learnable threshold for attention score filtering
    float attention_threshold_;
    
    // Statistics for prediction
    std::vector<float> attention_scores_history_;
    
public:
    // Predict which keys will have high attention scores
    // and prefetch their values
    void prefetch_predicted_attention(
        const float* query,     // Current query
        const float* all_keys,  // All key positions
        const float* all_values,// All value positions
        int seq_len,
        int head_dim,
        const float* previous_attention  // Previous layer attention
    ) {
        // Use previous attention as predictor
        // Prefetch top-K positions from previous attention
        
        // Find positions with highest previous attention
        std::vector<std::pair<float, int>> scored_positions;
        for (int i = 0; i < seq_len; i++) {
            scored_positions.push_back({previous_attention[i], i});
        }
        
        // Partial sort for top-K
        int top_k = std::min(32, seq_len);
        std::partial_sort(
            scored_positions.begin(),
            scored_positions.begin() + top_k,
            scored_positions.end(),
            std::greater<>()
        );
        
        // Prefetch top-K values
        for (int i = 0; i < top_k; i++) {
            int idx = scored_positions[i].second;
            _mm_prefetch(all_values + idx * head_dim, _MM_HINT_T0);
        }
    }
};
```

### 1.5 Bandwidth vs Compute Balance

The prefetch rate must be balanced with compute throughput to avoid memory bandwidth saturation or prefetch buffer overflow.

#### 1.5.1 Balance Model

$$\text{Prefetch Rate} = \min\left(\frac{\text{Compute Throughput}}{\text{Element Size}}, \frac{\text{Memory Bandwidth}}{\text{Cache Line Size}}\right)$$

```cpp
// Bandwidth-aware prefetch controller
class BandwidthAwarePrefetcher {
    // System parameters
    const float memory_bandwidth_gbps_;  // e.g., 200 GB/s for DDR5
    const float compute_throughput_gflops_; // e.g., 1000 GFLOPS
    const int element_size_bytes_;
    
    // Runtime metrics
    std::atomic<int> prefetch_count_{0};
    std::chrono::time_point<std::chrono::high_resolution_clock> last_reset_;
    
public:
    BandwidthAwarePrefetcher(
        float bandwidth_gbps,
        float compute_gflops,
        int element_bytes
    ) : memory_bandwidth_gbps_(bandwidth_gbps),
        compute_throughput_gflops_(compute_gflops),
        element_size_bytes_(element_bytes) {}
    
    // Check if prefetch should proceed or throttle
    bool should_prefetch() {
        auto now = std::chrono::high_resolution_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::microseconds>(
            now - last_reset_
        ).count();
        
        if (elapsed > 1000) {  // Reset every 1ms
            prefetch_count_.store(0);
            last_reset_ = now;
            return true;
        }
        
        // Calculate maximum prefetches per microsecond
        float max_prefetch_per_us = 
            memory_bandwidth_gbps_ * 1000.0f / (64.0f * 8);  // cache lines/us
        
        // Current prefetch rate
        float current_rate = prefetch_count_.load() * 1000000.0f / elapsed;
        
        // Throttle if approaching bandwidth limit
        return current_rate < max_prefetch_per_us * 0.8f;  // 80% threshold
    }
    
    // Adaptive prefetch distance based on balance
    int adaptive_prefetch_distance() {
        // Ratio of compute to memory
        float compute_elements_per_s = compute_throughput_gflops_ * 1e9f / 10.0f;  // ~10 ops per element
        float memory_elements_per_s = memory_bandwidth_gbps_ * 1e9f / element_size_bytes_;
        
        float ratio = compute_elements_per_s / memory_elements_per_s;
        
        // If compute-bound, prefetch less aggressively
        // If memory-bound, prefetch more aggressively
        if (ratio > 1.0f) {
            // Compute-bound: prefetch more to hide latency
            return static_cast<int>(ratio * 8);
        } else {
            // Memory-bound: prefetch less to avoid contention
            return 4;  // Minimum distance
        }
    }
    
    // Throttled prefetch call
    void prefetch_throttled(const void* addr) {
        if (should_prefetch()) {
            _mm_prefetch(static_cast<const char*>(addr), _MM_HINT_T0);
            prefetch_count_.fetch_add(1);
        }
    }
};
```

---

## 2. Memory Alignment

### 2.1 Vector-Aligned Storage (64-byte for AVX-512)

Proper alignment is essential for vector instructions. AVX-512 requires 64-byte alignment for optimal performance.

#### 2.1.1 Alignment Requirements by Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Architecture-Specific Alignment Requirements                        │
├──────────────────┬──────────────────┬───────────────────────────────┤
│ Architecture     │ Natural Align    │ Optimal Align (Vector)        │
├──────────────────┼──────────────────┼───────────────────────────────┤
│ x86 (SSE)        │ 16 bytes         │ 16 bytes (128-bit)            │
│ x86 (AVX)        │ 32 bytes         │ 32 bytes (256-bit)            │
│ x86 (AVX-512)    │ 64 bytes         │ 64 bytes (512-bit)            │
│ ARM (NEON)       │ 16 bytes         │ 16 bytes (128-bit)            │
│ ARM (SVE)        │ 16 bytes         │ 16 bytes (scalable)           │
│ RISC-V (V)       │ 16 bytes         │ VLEN-dependent               │
│ GPU (CUDA)       │ 128 bytes        │ 128 bytes (coalescing)        │
└──────────────────┴──────────────────┴───────────────────────────────┘
```

#### 2.1.2 Aligned Tensor Storage Implementation

```cpp
#include <cstdlib>
#include <cstdint>
#include <new>

// Platform-independent aligned allocation
class AlignedAllocator {
public:
    // Allocate aligned memory
    static void* allocate_aligned(size_t size, size_t alignment) {
        // Validate alignment is power of 2
        if ((alignment & (alignment - 1)) != 0) {
            throw std::invalid_argument("Alignment must be power of 2");
        }
        
        void* ptr = nullptr;
        
        #if defined(_MSC_VER)
            // Windows: _aligned_malloc
            ptr = _aligned_malloc(size, alignment);
            if (!ptr) throw std::bad_alloc();
        #else
            // POSIX: posix_memalign or aligned_alloc
            #if defined(__APPLE__)
                // macOS: aligned_alloc requires size % alignment == 0
                size = ((size + alignment - 1) / alignment) * alignment;
                ptr = aligned_alloc(alignment, size);
            #else
                // Linux: posix_memalign
                if (posix_memalign(&ptr, alignment, size) != 0) {
                    throw std::bad_alloc();
                }
            #endif
        #endif
        
        return ptr;
    }
    
    // Free aligned memory
    static void deallocate_aligned(void* ptr) {
        if (ptr) {
            #if defined(_MSC_VER)
                _aligned_free(ptr);
            #else
                free(ptr);
            #endif
        }
    }
    
    // Check if pointer is aligned
    static bool is_aligned(const void* ptr, size_t alignment) {
        return (reinterpret_cast<uintptr_t>(ptr) & (alignment - 1)) == 0;
    }
    
    // Align size up to boundary
    static size_t align_size(size_t size, size_t alignment) {
        return ((size + alignment - 1) / alignment) * alignment;
    }
};

// Aligned tensor wrapper
template<typename T, size_t Alignment = 64>
class AlignedTensor {
    void* data_;
    size_t size_;
    size_t aligned_size_;
    int64_t* shape_;
    int ndim_;
    
public:
    AlignedTensor(const std::vector<int64_t>& shape)
        : ndim_(shape.size())
    {
        shape_ = new int64_t[ndim_];
        std::copy(shape.begin(), shape.end(), shape_);
        
        // Calculate total elements
        size_ = 1;
        for (auto dim : shape) size_ *= dim;
        
        // Align size for vector operations
        aligned_size_ = AlignedAllocator::align_size(size_ * sizeof(T), Alignment) / sizeof(T);
        
        // Allocate aligned memory
        data_ = AlignedAllocator::allocate_aligned(aligned_size_ * sizeof(T), Alignment);
        
        assert(AlignedAllocator::is_aligned(data_, Alignment));
    }
    
    ~AlignedTensor() {
        AlignedAllocator::deallocate_aligned(data_);
        delete[] shape_;
    }
    
    T* data() { return static_cast<T*>(data_); }
    const T* data() const { return static_cast<const T*>(data_); }
    size_t size() const { return size_; }
    size_t aligned_size() const { return aligned_size_; }
    bool is_aligned() const { return AlignedAllocator::is_aligned(data_, Alignment); }
    
    // Access with bounds checking
    T& operator[](size_t idx) { return data()[idx]; }
    const T& operator[](size_t idx) const { return data()[idx]; }
};

// Convenience typedefs for common alignments
template<typename T> using AVXAlignedTensor = AlignedTensor<T, 32>;
template<typename T> using AVX512AlignedTensor = AlignedTensor<T, 64>;
template<typename T> using CUDAAlignedTensor = AlignedTensor<T, 128>;
```

### 2.2 Alignment-Aware Tensor Allocator Design

A production tensor allocator must manage alignment across multiple tensors while minimizing memory fragmentation.

#### 2.2.1 Bump Allocator with Alignment

```cpp
// Aligned bump allocator for tensors
// LOG principle: Arena origin is the alignment reference
class AlignedBumpAllocator {
    char* origin_;          // Arena origin (LOG reference point)
    char* current_;         // Current allocation point
    char* end_;             // Arena end
    size_t alignment_;      // Default alignment
    
    // Alignment overhead tracking
    size_t total_overhead_ = 0;
    size_t num_allocations_ = 0;
    
public:
    AlignedBumpAllocator(size_t capacity, size_t alignment = 64)
        : alignment_(alignment)
    {
        // Allocate arena with extra space for alignment
        size_t arena_size = capacity + alignment;
        origin_ = static_cast<char*>(AlignedAllocator::allocate_aligned(arena_size, alignment));
        current_ = origin_;
        end_ = origin_ + arena_size;
    }
    
    ~AlignedBumpAllocator() {
        AlignedAllocator::deallocate_aligned(origin_);
    }
    
    // Allocate aligned block from arena
    void* allocate(size_t size, size_t alignment = 0) {
        if (alignment == 0) alignment = alignment_;
        
        // LOG: Calculate offset from origin
        uintptr_t current_addr = reinterpret_cast<uintptr_t>(current_);
        uintptr_t aligned_addr = (current_addr + alignment - 1) & ~(alignment - 1);
        
        size_t overhead = aligned_addr - current_addr;
        total_overhead_ += overhead;
        num_allocations_++;
        
        char* result = reinterpret_cast<char*>(aligned_addr);
        char* next = result + size;
        
        if (next > end_) {
            return nullptr;  // Out of memory
        }
        
        current_ = next;
        return result;
    }
    
    // Reset to origin (LOG: return to reference point)
    void reset() {
        current_ = origin_;
    }
    
    // Statistics
    size_t used() const { return current_ - origin_; }
    size_t remaining() const { return end_ - current_; }
    float average_overhead() const {
        return num_allocations_ > 0 ? 
            static_cast<float>(total_overhead_) / num_allocations_ : 0.0f;
    }
    
    // Get offset from origin (LOG principle)
    size_t offset_from_origin(void* ptr) const {
        return static_cast<char*>(ptr) - origin_;
    }
    
    // Get pointer from offset (LOG: origin + offset = absolute)
    void* pointer_from_offset(size_t offset) const {
        return origin_ + offset;
    }
};
```

#### 2.2.2 Tensor Pool with Alignment Groups

```cpp
// Tensor pool that groups tensors by alignment requirement
class AlignmentAwareTensorPool {
    // Separate pools for different alignments
    struct AlignmentPool {
        AlignedBumpAllocator allocator;
        std::vector<std::pair<void*, size_t>> allocations;
        
        AlignmentPool(size_t capacity, size_t alignment)
            : allocator(capacity, alignment) {}
    };
    
    std::unordered_map<size_t, std::unique_ptr<AlignmentPool>> pools_;
    
public:
    // Initialize with pre-sized pools
    void initialize(const std::vector<std::pair<size_t, size_t>>& pool_configs) {
        // pool_configs: [(alignment, capacity), ...]
        for (auto [alignment, capacity] : pool_configs) {
            pools_[alignment] = std::make_unique<AlignmentPool>(capacity, alignment);
        }
    }
    
    // Allocate tensor with appropriate alignment
    template<typename T>
    AlignedTensor<T>* allocate(const std::vector<int64_t>& shape, size_t alignment = 64) {
        // Find or create pool for this alignment
        if (pools_.find(alignment) == pools_.end()) {
            pools_[alignment] = std::make_unique<AlignmentPool>(
                1024 * 1024 * 1024,  // 1GB default
                alignment
            );
        }
        
        auto& pool = pools_[alignment];
        
        // Calculate size
        size_t num_elements = 1;
        for (auto dim : shape) num_elements *= dim;
        size_t bytes = num_elements * sizeof(T);
        
        // Allocate from pool
        void* data = pool->allocator.allocate(bytes, alignment);
        if (!data) return nullptr;
        
        // Create tensor wrapper
        return new AlignedTensor<T>(shape, static_cast<T*>(data));
    }
    
    // Reset all pools (return to origins)
    void reset_all() {
        for (auto& [alignment, pool] : pools_) {
            pool->allocator.reset();
        }
    }
    
    // Get statistics per alignment
    std::map<size_t, std::pair<size_t, float>> get_stats() const {
        std::map<size_t, std::pair<size_t, float>> stats;
        for (const auto& [alignment, pool] : pools_) {
            stats[alignment] = {
                pool->allocator.used(),
                pool->allocator.average_overhead()
            };
        }
        return stats;
    }
};
```

### 2.3 Over-Allocation Strategies

Over-allocation prevents boundary checks and enables aligned vector operations on tensor edges.

#### 2.3.1 Boundary-Safe Over-Allocation

```cpp
// Over-allocation strategy for boundary-safe vectorization
class OverAllocationStrategy {
public:
    struct Config {
        int vector_width;       // Elements per vector (e.g., 16 for AVX-512 float)
        int prefetch_lines;     // Cache lines to over-allocate
        bool align_rows;        // Align each row to vector boundary
        bool padding_at_end;    // Add padding after tensor
    };
    
private:
    Config config_;
    
public:
    OverAllocationStrategy(Config config) : config_(config) {}
    
    // Calculate padded dimensions
    std::tuple<int64_t, int64_t, int64_t> calculate_padded_dims(
        int64_t dim0, int64_t dim1, int64_t dim2
    ) {
        int64_t padded_dim2 = dim2;
        
        if (config_.align_rows) {
            // Round up last dimension to vector boundary
            padded_dim2 = ((dim2 + config_.vector_width - 1) / config_.vector_width) 
                          * config_.vector_width;
        }
        
        // Calculate total elements with padding
        int64_t total = dim0 * dim1 * padded_dim2;
        
        if (config_.padding_at_end) {
            // Add extra cache lines at end
            int64_t padding_bytes = config_.prefetch_lines * 64;
            int64_t padding_elements = padding_bytes / sizeof(float);
            total += padding_elements;
        }
        
        return {dim0, dim1, padded_dim2};
    }
    
    // Calculate over-allocation size
    size_t calculate_allocation_size(
        size_t requested_size,
        size_t element_size
    ) {
        // Base alignment
        size_t aligned_size = AlignedAllocator::align_size(requested_size * element_size, 64);
        
        // Add over-allocation for boundary safety
        size_t over_allocation = config_.vector_width * element_size;  // One extra vector
        over_allocation += config_.prefetch_lines * 64;  // Prefetch padding
        
        return aligned_size + over_allocation;
    }
    
    // Create padded tensor
    template<typename T>
    std::unique_ptr<AlignedTensor<T>> create_padded_tensor(
        const std::vector<int64_t>& shape
    ) {
        // Calculate padded shape
        std::vector<int64_t> padded_shape = shape;
        
        if (config_.align_rows && !shape.empty()) {
            padded_shape.back() = ((shape.back() + config_.vector_width - 1) 
                                    / config_.vector_width) * config_.vector_width;
        }
        
        // Calculate allocation size with over-allocation
        size_t num_elements = 1;
        for (auto dim : padded_shape) num_elements *= dim;
        num_elements += config_.vector_width;  // Boundary safety
        num_elements += config_.prefetch_lines * 64 / sizeof(T);  // Prefetch space
        
        return std::make_unique<AlignedTensor<T>>(padded_shape);
    }
};

// Standard over-allocation configs
const OverAllocationStrategy::Config AVX512_OVER_ALLOC = {
    .vector_width = 16,      // 16 floats per AVX-512 vector
    .prefetch_lines = 2,     // 2 extra cache lines
    .align_rows = true,      // Align rows
    .padding_at_end = true   // Add end padding
};

const OverAllocationStrategy::Config CUDA_OVER_ALLOC = {
    .vector_width = 32,      // Warp width
    .prefetch_lines = 4,     // More prefetch for GPU
    .align_rows = true,
    .padding_at_end = true
};
```

### 2.4 Cross-Platform Alignment (x86: 64-byte, ARM: 16-byte)

Cross-platform code requires handling different alignment requirements gracefully.

#### 2.4.1 Platform Detection and Alignment Selection

```cpp
// Cross-platform alignment configuration
namespace platform {

// Detect platform at compile time
constexpr size_t cache_line_size() {
    #if defined(__x86_64__) || defined(_M_X64)
        return 64;
    #elif defined(__aarch64__) || defined(_M_ARM64)
        return 16;  // Some ARM systems have 32 or 64 byte cache lines
    #elif defined(__arm__)
        return 16;
    #else
        return 16;  // Conservative default
    #endif
}

constexpr size_t vector_alignment() {
    #if defined(__AVX512F__)
        return 64;
    #elif defined(__AVX__)
        return 32;
    #elif defined(__SSE__) || defined(__ARM_NEON) || defined(__ARM_NEON__)
        return 16;
    #else
        return 16;  // Default to 16 bytes
    #endif
}

constexpr size_t optimal_alignment() {
    return std::max(cache_line_size(), vector_alignment());
}

// SIMD width in elements
template<typename T>
constexpr int simd_width() {
    return vector_alignment() / sizeof(T);
}

// Static asserts for compile-time verification
static_assert(cache_line_size() >= 16, "Cache line size too small");
static_assert(vector_alignment() >= 16, "Vector alignment too small");
static_assert((vector_alignment() & (vector_alignment() - 1)) == 0, 
              "Vector alignment must be power of 2");

} // namespace platform

// Cross-platform aligned tensor
template<typename T>
using PlatformTensor = AlignedTensor<T, platform::optimal_alignment()>;

// Cross-platform vector operations
template<typename T>
class VectorOps {
    static constexpr int WIDTH = platform::simd_width<T>();
    
public:
    // Vector addition with platform-appropriate alignment
    static void add(
        const T* a,
        const T* b,
        T* c,
        size_t n
    ) {
        // Ensure alignment
        assert(platform::is_aligned(a, platform::vector_alignment()));
        assert(platform::is_aligned(b, platform::vector_alignment()));
        assert(platform::is_aligned(c, platform::vector_alignment()));
        
        size_t i = 0;
        
        // Vector loop
        #if defined(__AVX512F__)
            for (; i + 16 <= n; i += 16) {
                __m512 va = _mm512_load_ps(a + i);
                __m512 vb = _mm512_load_ps(b + i);
                __m512 vc = _mm512_add_ps(va, vb);
                _mm512_store_ps(c + i, vc);
            }
        #elif defined(__AVX__)
            for (; i + 8 <= n; i += 8) {
                __m256 va = _mm256_load_ps(a + i);
                __m256 vb = _mm256_load_ps(b + i);
                __m256 vc = _mm256_add_ps(va, vb);
                _mm256_store_ps(c + i, vc);
            }
        #elif defined(__ARM_NEON)
            for (; i + 4 <= n; i += 4) {
                float32x4_t va = vld1q_f32(a + i);
                float32x4_t vb = vld1q_f32(b + i);
                float32x4_t vc = vaddq_f32(va, vb);
                vst1q_f32(c + i, vc);
            }
        #endif
        
        // Scalar remainder
        for (; i < n; i++) {
            c[i] = a[i] + b[i];
        }
    }
};
```

### 2.5 Alignment Propagation Through Operations

Tensor operations must preserve or create new aligned results.

#### 2.5.1 Alignment-Preserving Operations

```cpp
// Operation traits for alignment propagation
template<typename Op>
struct AlignmentTraits {
    static constexpr bool preserves_alignment = false;
    static constexpr size_t output_alignment = 0;
};

// Matrix multiplication: output alignment depends on leading dimension
template<>
struct AlignmentTraits<MatMulOp> {
    static constexpr bool preserves_alignment = true;
    static constexpr size_t output_alignment = 64;  // Can produce aligned output
};

// Element-wise operations: preserve input alignment
template<>
struct AlignmentTraits<ElementWiseAdd> {
    static constexpr bool preserves_alignment = true;
    static constexpr size_t output_alignment = 0;  // Same as input
};

// Reduction: may not preserve alignment
template<>
struct AlignmentTraits<ReduceOp> {
    static constexpr bool preserves_alignment = false;
    static constexpr size_t output_alignment = 64;  // Small output, easy to align
};

// Alignment-aware operation executor
class AlignedOpExecutor {
public:
    template<typename Op, typename... Args>
    static AlignedTensor<float>* execute(const Op& op, Args... args) {
        using Traits = AlignmentTraits<Op>;
        
        // Check input alignments
        if constexpr (Traits::preserves_alignment) {
            // Inputs should be aligned
            for (auto ptr : {args...}) {
                if (!AlignedAllocator::is_aligned(ptr, platform::vector_alignment())) {
                    // Fall back to scalar path
                    return execute_scalar(op, args...);
                }
            }
        }
        
        // Execute with aligned path
        return execute_vector(op, args...);
    }
    
private:
    template<typename Op, typename... Args>
    static AlignedTensor<float>* execute_vector(const Op& op, Args... args) {
        // Vectorized implementation
        // ...
        return nullptr;
    }
    
    template<typename Op, typename... Args>
    static AlignedTensor<float>* execute_scalar(const Op& op, Args... args) {
        // Scalar fallback
        // ...
        return nullptr;
    }
};
```

---

## 3. Cache Line Optimization

### 3.1 Preventing False Sharing in Multi-Threaded Attention

False sharing occurs when multiple threads modify different variables that share a cache line, causing cache coherency traffic.

#### 3.1.1 Thread-Local Attention Buffers

```cpp
// False sharing prevention for multi-threaded attention
class ThreadSafeAttentionBuffers {
    // Each thread gets its own cache-line-aligned workspace
    struct alignas(64) ThreadBuffer {
        float query_local[64];    // Cache-line aligned
        float key_local[64];
        float value_local[64];
        float attention_scores[64];
        float partial_sum;
        char padding[64 - sizeof(float)];  // Pad to cache line
        
        ThreadBuffer() : partial_sum(0.0f) {
            std::memset(query_local, 0, sizeof(query_local));
            std::memset(key_local, 0, sizeof(key_local));
            std::memset(value_local, 0, sizeof(value_local));
            std::memset(attention_scores, 0, sizeof(attention_scores));
        }
    };
    
    static_assert(sizeof(ThreadBuffer) % 64 == 0, 
                  "ThreadBuffer must be cache-line aligned");
    
    std::vector<ThreadBuffer> buffers_;
    
public:
    ThreadSafeAttentionBuffers(int num_threads) 
        : buffers_(num_threads) 
    {
        // Verify alignment
        for (auto& buf : buffers_) {
            assert(AlignedAllocator::is_aligned(&buf, 64));
        }
    }
    
    ThreadBuffer& get_buffer(int thread_id) {
        return buffers_[thread_id];
    }
    
    // Parallel attention with no false sharing
    void compute_attention_parallel(
        const float* query,
        const float* keys,
        const float* values,
        float* output,
        int seq_len,
        int head_dim,
        int num_threads
    ) {
        #pragma omp parallel num_threads(num_threads)
        {
            int tid = omp_get_thread_num();
            auto& buf = buffers_[tid];
            
            #pragma omp for schedule(static)
            for (int i = 0; i < seq_len; i++) {
                // Load query to thread-local buffer
                std::memcpy(buf.query_local, query + i * head_dim, 
                           head_dim * sizeof(float));
                
                // Compute attention scores
                float sum = 0.0f;
                for (int j = 0; j < seq_len; j++) {
                    float score = 0.0f;
                    for (int k = 0; k < head_dim; k++) {
                        score += buf.query_local[k] * keys[j * head_dim + k];
                    }
                    buf.attention_scores[j] = std::exp(score / std::sqrt(head_dim));
                    sum += buf.attention_scores[j];
                }
                
                // Normalize
                for (int j = 0; j < seq_len; j++) {
                    buf.attention_scores[j] /= sum;
                }
                
                // Weighted sum of values
                for (int k = 0; k < head_dim; k++) {
                    float val = 0.0f;
                    for (int j = 0; j < seq_len; j++) {
                        val += buf.attention_scores[j] * values[j * head_dim + k];
                    }
                    output[i * head_dim + k] = val;
                }
            }
        }
    }
};
```

#### 3.1.2 Attention Head Distribution

```cpp
// Distribute attention heads to threads without false sharing
class AttentionHeadDistributor {
    // Per-head attention results, cache-line aligned
    struct alignas(64) HeadResult {
        float output[64];  // Up to 64-dim head
        float attention_sum;
        char padding[64 - sizeof(float)];  // Complete cache line
        
        HeadResult() : attention_sum(0.0f) {
            std::memset(output, 0, sizeof(output));
        }
    };
    
    static_assert(sizeof(HeadResult) % 64 == 0, 
                  "HeadResult must be cache-line aligned");
    
    int num_heads_;
    int head_dim_;
    std::vector<HeadResult> head_results_;
    
public:
    AttentionHeadDistributor(int num_heads, int head_dim)
        : num_heads_(num_heads), head_dim_(head_dim), 
          head_results_(num_heads) 
    {
        // Ensure head dimension fits in result
        assert(head_dim <= 64);
    }
    
    // Compute attention for each head in parallel without false sharing
    void compute_multihead_attention(
        const float* query,  // [num_heads, head_dim]
        const float* keys,   // [seq_len, num_heads, head_dim]
        const float* values, // [seq_len, num_heads, head_dim]
        float* output,       // [num_heads, head_dim]
        int seq_len
    ) {
        #pragma omp parallel for schedule(static) num_threads(num_heads_)
        for (int h = 0; h < num_heads_; h++) {
            HeadResult& result = head_results_[h];
            
            // Compute attention for this head
            const float* q = query + h * head_dim_;
            
            // Attention scores
            float sum = 0.0f;
            std::vector<float> scores(seq_len);
            
            for (int s = 0; s < seq_len; s++) {
                float score = 0.0f;
                for (int d = 0; d < head_dim_; d++) {
                    score += q[d] * keys[s * num_heads_ * head_dim_ + h * head_dim_ + d];
                }
                scores[s] = std::exp(score / std::sqrt(head_dim_));
                sum += scores[s];
            }
            
            // Normalize and compute weighted sum
            std::memset(result.output, 0, head_dim_ * sizeof(float));
            for (int s = 0; s < seq_len; s++) {
                scores[s] /= sum;
                for (int d = 0; d < head_dim_; d++) {
                    result.output[d] += scores[s] * 
                        values[s * num_heads_ * head_dim_ + h * head_dim_ + d];
                }
            }
        }
        
        // Gather results (sequential, cache-friendly write)
        for (int h = 0; h < num_heads_; h++) {
            std::memcpy(output + h * head_dim_, 
                       head_results_[h].output, 
                       head_dim_ * sizeof(float));
        }
    }
};
```

### 3.2 Padding Strategies for Tensor Structures

Proper padding prevents false sharing and enables SIMD operations.

#### 3.2.1 Cache Line Padded Structures

```cpp
// Cache line padding utilities
template<typename T>
struct CacheLinePadded {
    T value;
    char padding[64 - (sizeof(T) % 64)];
    
    CacheLinePadded() : value() {}
    CacheLinePadded(const T& v) : value(v) {}
    
    operator T&() { return value; }
    operator const T&() const { return value; }
    
    T* operator->() { return &value; }
    const T* operator->() const { return &value; }
};

// Ensure proper padding
static_assert(sizeof(CacheLinePadded<int>) == 64, 
              "CacheLinePadded must be exactly 64 bytes");

// Padded tensor metadata structure
struct alignas(64) PaddedTensorMeta {
    int64_t shape[8];
    int64_t strides[8];
    int ndim;
    int dtype;
    void* data_ptr;
    size_t total_bytes;
    int device_id;
    int flags;
    char padding[64 - (8*8 + 8*8 + 4 + 4 + 8 + 8 + 4 + 4) % 64];
};

static_assert(sizeof(PaddedTensorMeta) % 64 == 0,
              "PaddedTensorMeta must be cache-line aligned");

// Array of padded metadata (no false sharing between tensors)
class TensorMetaArray {
    std::vector<PaddedTensorMeta> metadata_;
    
public:
    TensorMetaArray(size_t num_tensors) : metadata_(num_tensors) {
        // All metadata is cache-line aligned, no false sharing
        for (auto& meta : metadata_) {
            assert(AlignedAllocator::is_aligned(&meta, 64));
        }
    }
    
    PaddedTensorMeta& operator[](size_t idx) { return metadata_[idx]; }
    const PaddedTensorMeta& operator[](size_t idx) const { return metadata_[idx]; }
    
    // Parallel update without false sharing
    void update_all_shapes(const std::vector<std::vector<int64_t>>& shapes) {
        #pragma omp parallel for
        for (size_t i = 0; i < metadata_.size(); i++) {
            auto& meta = metadata_[i];
            meta.ndim = shapes[i].size();
            for (size_t d = 0; d < shapes[i].size(); d++) {
                meta.shape[d] = shapes[i][d];
            }
        }
    }
};
```

### 3.3 Cache Line-Aware Data Layout

#### 3.3.1 Structure of Arrays (SoA) with Cache Line Alignment

```cpp
// Cache line-aligned Structure of Arrays for tensors
template<int MAX_TENSORS>
class CacheAlignedSoA {
    // Each field array is cache-line aligned
    alignas(64) int64_t shapes_[MAX_TENSORS][8];
    alignas(64) int64_t strides_[MAX_TENSORS][8];
    alignas(64) int ndims_[MAX_TENSORS];
    alignas(64) int dtypes_[MAX_TENSORS];
    alignas(64) void* data_ptrs_[MAX_TENSORS];
    alignas(64) size_t sizes_[MAX_TENSORS];
    
    int count_ = 0;
    
public:
    int add_tensor(
        const std::vector<int64_t>& shape,
        int dtype,
        void* data_ptr,
        size_t size
    ) {
        if (count_ >= MAX_TENSORS) return -1;
        
        int idx = count_++;
        
        // Store shape
        ndims_[idx] = shape.size();
        for (size_t d = 0; d < shape.size(); d++) {
            shapes_[idx][d] = shape[d];
        }
        
        // Compute strides
        strides_[idx][shape.size() - 1] = 1;
        for (int d = shape.size() - 2; d >= 0; d--) {
            strides_[idx][d] = strides_[idx][d + 1] * shape[d + 1];
        }
        
        dtypes_[idx] = dtype;
        data_ptrs_[idx] = data_ptr;
        sizes_[idx] = size;
        
        return idx;
    }
    
    // Vectorized access to all data pointers
    void** get_data_ptrs() { return data_ptrs_; }
    
    // SIMD-friendly iteration over sizes
    const size_t* get_sizes() const { return sizes_; }
    
    // Cache-friendly batch shape access
    void get_all_shapes_0(int64_t* output) const {
        // All first dimensions are contiguous
        for (int i = 0; i < count_; i++) {
            output[i] = shapes_[i][0];
        }
    }
};

// SoA vs AoS comparison
void compare_layouts() {
    struct TensorAoS {
        int64_t shape[8];
        int ndim;
        int dtype;
        void* data;
    };
    
    std::cout << "AoS layout:\n";
    std::cout << "  Tensor 0 shape[0] offset: " << 0 << "\n";
    std::cout << "  Tensor 1 shape[0] offset: " << sizeof(TensorAoS) << "\n";
    std::cout << "  Cache lines between tensors: " << sizeof(TensorAoS) / 64.0 << "\n";
    std::cout << "  Accessing all shapes[0]: STRIDED (poor cache)\n\n";
    
    std::cout << "SoA layout:\n";
    std::cout << "  Tensor 0 shape[0] offset: " << 0 << "\n";
    std::cout << "  Tensor 1 shape[0] offset: " << sizeof(int64_t) << "\n";
    std::cout << "  Cache lines between tensors: " << sizeof(int64_t) / 64.0 << "\n";
    std::cout << "  Accessing all shapes[0]: SEQUENTIAL (excellent cache)\n";
}
```

---

## 4. NUMA Considerations

### 4.1 NUMA-Aware Tensor Allocation

NUMA (Non-Uniform Memory Access) systems have multiple memory domains with different access latencies.

#### 4.1.1 NUMA Topology Detection

```cpp
#include <numa.h>
#include <numaif.h>
#include <sched.h>
#include <unistd.h>

class NUMATopology {
    int num_nodes_;
    int num_cpus_;
    std::vector<std::vector<int>> node_cpus_;
    std::vector<long long> node_memory_;
    
public:
    NUMATopology() {
        // Check NUMA availability
        if (numa_available() < 0) {
            num_nodes_ = 1;
            num_cpus_ = sysconf(_SC_NPROCESSORS_ONLN);
            return;
        }
        
        num_nodes_ = numa_max_node() + 1;
        num_cpus_ = sysconf(_SC_NPROCESSORS_ONLN);
        
        // Get CPUs per node
        node_cpus_.resize(num_nodes_);
        for (int node = 0; node < num_nodes_; node++) {
            struct bitmask* cpus = numa_allocate_cpumask();
            numa_node_to_cpus(node, cpus);
            
            for (int cpu = 0; cpu < num_cpus_; cpu++) {
                if (numa_bitmask_isbitset(cpus, cpu)) {
                    node_cpus_[node].push_back(cpu);
                }
            }
            numa_free_cpumask(cpus);
        }
        
        // Get memory per node
        node_memory_.resize(num_nodes_);
        for (int node = 0; node < num_nodes_; node++) {
            long long free;
            numa_node_size64(node, &free);
            node_memory_[node] = numa_node_size64(node, nullptr);
        }
    }
    
    int get_current_node() const {
        return numa_node_of_cpu(sched_getcpu());
    }
    
    int get_num_nodes() const { return num_nodes_; }
    int get_num_cpus() const { return num_cpus_; }
    
    const std::vector<int>& get_node_cpus(int node) const {
        return node_cpus_[node];
    }
    
    long long get_node_memory(int node) const {
        return node_memory_[node];
    }
    
    float get_distance(int from_node, int to_node) const {
        if (numa_available() < 0) return 1.0f;
        return numa_distance(from_node, to_node) / 10.0f;  // Normalized
    }
    
    void print_topology() const {
        std::cout << "NUMA Topology:\n";
        std::cout << "  Nodes: " << num_nodes_ << "\n";
        std::cout << "  CPUs: " << num_cpus_ << "\n\n";
        
        for (int node = 0; node < num_nodes_; node++) {
            std::cout << "  Node " << node << ":\n";
            std::cout << "    Memory: " << node_memory_[node] / (1024*1024) << " MB\n";
            std::cout << "    CPUs: ";
            for (int cpu : node_cpus_[node]) {
                std::cout << cpu << " ";
            }
            std::cout << "\n";
            
            std::cout << "    Distances: ";
            for (int other = 0; other < num_nodes_; other++) {
                std::cout << get_distance(node, other) << " ";
            }
            std::cout << "\n";
        }
    }
};
```

#### 4.1.2 NUMA-Aware Allocation

```cpp
// NUMA-aware tensor allocator
class NUMAAwareAllocator {
    NUMATopology topology_;
    
public:
    NUMAAwareAllocator() : topology_() {}
    
    // Allocate memory on specific NUMA node
    void* allocate_on_node(size_t size, int node, size_t alignment = 64) {
        // Align size
        size = ((size + alignment - 1) / alignment) * alignment;
        
        // Use numa_alloc_onnode for NUMA-local allocation
        void* ptr = numa_alloc_onnode(size, node);
        
        if (!ptr) {
            throw std::bad_alloc();
        }
        
        // Verify alignment, realign if necessary
        if (!AlignedAllocator::is_aligned(ptr, alignment)) {
            void* aligned_ptr = numa_alloc_onnode(size + alignment, node);
            numa_free(ptr, size);
            
            if (!aligned_ptr) throw std::bad_alloc();
            
            // Align within allocation
            uintptr_t addr = reinterpret_cast<uintptr_t>(aligned_ptr);
            uintptr_t aligned = (addr + alignment - 1) & ~(alignment - 1);
            ptr = reinterpret_cast<void*>(aligned);
        }
        
        return ptr;
    }
    
    // Allocate interleaved across all NUMA nodes
    void* allocate_interleaved(size_t size, size_t alignment = 64) {
        size = ((size + alignment - 1) / alignment) * alignment;
        
        void* ptr = numa_alloc_interleaved(size);
        if (!ptr) throw std::bad_alloc();
        
        return ptr;
    }
    
    // Allocate on current thread's NUMA node
    void* allocate_local(size_t size, size_t alignment = 64) {
        int current_node = topology_.get_current_node();
        return allocate_on_node(size, current_node, alignment);
    }
    
    // Free NUMA memory
    void deallocate(void* ptr, size_t size) {
        numa_free(ptr, size);
    }
    
    // Migrate memory to different NUMA node
    bool migrate_to_node(void* ptr, size_t size, int target_node) {
        // Use mbind to migrate pages
        unsigned long nodemask = 1UL << target_node;
        int result = mbind(
            ptr, size,
            MPOL_BIND,
            reinterpret_cast<unsigned long*>(&nodemask),
            sizeof(nodemask) * 8,
            MPOL_MF_MOVE  // Move existing pages
        );
        
        return result == 0;
    }
    
    // Get NUMA node for memory address
    int get_memory_node(void* ptr) {
        int node = -1;
        if (get_mempolicy(&node, nullptr, 0, ptr, MPOL_F_NODE | MPOL_F_ADDR) < 0) {
            return -1;
        }
        return node;
    }
};

// NUMA-aware tensor
template<typename T>
class NUMATensor {
    NUMAAwareAllocator allocator_;
    void* data_;
    size_t size_;
    int numa_node_;
    
public:
    NUMATensor(size_t num_elements, int numa_node = -1)
        : size_(num_elements)
    {
        size_t bytes = num_elements * sizeof(T);
        
        if (numa_node >= 0) {
            data_ = allocator_.allocate_on_node(bytes, numa_node);
            numa_node_ = numa_node;
        } else {
            data_ = allocator_.allocate_local(bytes);
            numa_node_ = allocator_.get_memory_node(data_);
        }
    }
    
    ~NUMATensor() {
        allocator_.deallocate(data_, size_ * sizeof(T));
    }
    
    T* data() { return static_cast<T*>(data_); }
    const T* data() const { return static_cast<const T*>(data_); }
    size_t size() const { return size_; }
    int numa_node() const { return numa_node_; }
    
    // Migrate to different NUMA node
    bool migrate_to_node(int target_node) {
        if (allocator_.migrate_to_node(data_, size_ * sizeof(T), target_node)) {
            numa_node_ = target_node;
            return true;
        }
        return false;
    }
};
```

### 4.2 First-Touch Policy for Weight Distribution

Linux uses "first-touch" policy: memory is allocated on the NUMA node where the thread first accesses it.

#### 4.2.1 First-Touch Initialization Pattern

```cpp
// First-touch policy initialization for transformer weights
class FirstTouchInitializer {
    NUMATopology topology_;
    
public:
    // Initialize weights with first-touch on specified NUMA node
    void initialize_weights_first_touch(
        float* weights,
        size_t num_elements,
        int target_node
    ) {
        // Get CPUs for target node
        const auto& cpus = topology_.get_node_cpus(target_node);
        if (cpus.empty()) return;
        
        // Bind current thread to target node's CPU
        cpu_set_t cpuset;
        CPU_ZERO(&cpuset);
        CPU_SET(cpus[0], &cpuset);
        pthread_setaffinity_np(pthread_self(), sizeof(cpu_set_t), &cpuset);
        
        // Initialize memory (first-touch)
        size_t chunk_size = num_elements / cpus.size();
        
        #pragma omp parallel for schedule(static)
        for (size_t i = 0; i < num_elements; i++) {
            weights[i] = 0.0f;  // First touch - allocates on this NUMA node
        }
        
        // Reset affinity
        CPU_ZERO(&cpuset);
        for (int cpu = 0; cpu < topology_.get_num_cpus(); cpu++) {
            CPU_SET(cpu, &cpuset);
        }
        pthread_setaffinity_np(pthread_self(), sizeof(cpu_set_t), &cpuset);
    }
    
    // Distribute weights across NUMA nodes by layer
    void distribute_layers_numa(
        std::vector<float*>& layer_weights,
        size_t weights_per_layer
    ) {
        int num_nodes = topology_.get_num_nodes();
        
        for (size_t layer = 0; layer < layer_weights.size(); layer++) {
            int target_node = layer % num_nodes;
            initialize_weights_first_touch(
                layer_weights[layer],
                weights_per_layer,
                target_node
            );
        }
    }
    
    // Initialize with NUMA-aware parallel initialization
    void parallel_initialize_numa(
        float* data,
        size_t num_elements,
        int num_nodes
    ) {
        size_t chunk_size = num_elements / num_nodes;
        
        #pragma omp parallel num_threads(num_nodes)
        {
            int tid = omp_get_thread_num();
            int node = tid % num_nodes;
            
            // Bind thread to NUMA node
            const auto& cpus = topology_.get_node_cpus(node);
            cpu_set_t cpuset;
            CPU_ZERO(&cpuset);
            CPU_SET(cpus[0], &cpuset);
            pthread_setaffinity_np(pthread_self(), sizeof(cpu_set_t), &cpuset);
            
            // Initialize chunk
            size_t start = tid * chunk_size;
            size_t end = (tid == num_nodes - 1) ? num_elements : start + chunk_size;
            
            for (size_t i = start; i < end; i++) {
                data[i] = 0.0f;
            }
        }
    }
};
```

### 4.3 Cross-NUMA Access Minimization

Minimize remote memory access by proper data placement and thread binding.

#### 4.3.1 NUMA-Aware Inference Pipeline

```cpp
// NUMA-aware transformer inference pipeline
class NUMAAwareInferencePipeline {
    NUMATopology topology_;
    NUMAAwareAllocator allocator_;
    
    // Weights distributed by layer across NUMA nodes
    std::vector<std::vector<float*>> weights_by_node_;
    
    // Thread-to-NUMA-node binding
    std::vector<int> thread_to_node_;
    
public:
    NUMAAwareInferencePipeline(int num_layers, size_t weights_per_layer)
    {
        int num_nodes = topology_.get_num_nodes();
        
        // Allocate weights distributed across nodes
        weights_by_node_.resize(num_nodes);
        
        for (int layer = 0; layer < num_layers; layer++) {
            int node = layer % num_nodes;
            float* weights = static_cast<float*>(
                allocator_.allocate_on_node(
                    weights_per_layer * sizeof(float),
                    node
                )
            );
            weights_by_node_[node].push_back(weights);
        }
        
        // Setup thread bindings
        int num_threads = std::thread::hardware_concurrency();
        thread_to_node_.resize(num_threads);
        
        for (int t = 0; t < num_threads; t++) {
            thread_to_node_[t] = t % num_nodes;
        }
    }
    
    // Execute inference layer with NUMA locality
    void execute_layer_numa(
        int layer,
        const float* input,
        float* output,
        size_t batch_size,
        size_t hidden_dim
    ) {
        int num_nodes = topology_.get_num_nodes();
        int target_node = layer % num_nodes;
        
        // Find weights for this layer
        float* weights = weights_by_node_[target_node][layer / num_nodes];
        
        #pragma omp parallel
        {
            int tid = omp_get_thread_num();
            int thread_node = thread_to_node_[tid];
            
            // Bind thread to its assigned NUMA node
            const auto& cpus = topology_.get_node_cpus(thread_node);
            cpu_set_t cpuset;
            CPU_ZERO(&cpuset);
            CPU_SET(cpus[tid % cpus.size()], &cpuset);
            pthread_setaffinity_np(pthread_self(), sizeof(cpu_set_t), &cpuset);
            
            #pragma omp for schedule(static)
            for (size_t b = 0; b < batch_size; b++) {
                // Compute with local weights
                // If thread is on same node as weights: fast local access
                // If thread is on different node: remote access
                matmul_avx512(
                    input + b * hidden_dim,
                    weights,
                    output + b * hidden_dim,
                    hidden_dim,
                    hidden_dim,
                    hidden_dim
                );
            }
        }
    }
    
    // Optimized: Process multiple layers on same NUMA node
    void execute_layers_batch_numa(
        const std::vector<int>& layers,
        const float* input,
        float* output,
        size_t batch_size,
        size_t hidden_dim
    ) {
        int num_nodes = topology_.get_num_nodes();
        
        // Group layers by NUMA node
        std::vector<std::vector<int>> layers_by_node(num_nodes);
        for (int layer : layers) {
            layers_by_node[layer % num_nodes].push_back(layer);
        }
        
        // Process layers on each NUMA node in parallel
        #pragma omp parallel num_threads(num_nodes)
        {
            int node = omp_get_thread_num() % num_nodes;
            
            // Bind to this NUMA node
            const auto& cpus = topology_.get_node_cpus(node);
            cpu_set_t cpuset;
            CPU_ZERO(&cpuset);
            CPU_SET(cpus[0], &cpuset);
            pthread_setaffinity_np(pthread_self(), sizeof(cpu_set_t), &cpuset);
            
            // Process layers for this node
            for (int layer : layers_by_node[node]) {
                float* weights = weights_by_node_[node][layer / num_nodes];
                
                // All memory access is local to this NUMA node
                // ...
            }
        }
    }
    
private:
    void matmul_avx512(
        const float* a, const float* b, float* c,
        size_t m, size_t n, size_t k
    ) {
        // AVX-512 matrix multiplication implementation
        // ...
    }
};
```

#### 4.3.2 NUMA-Aware Memory Access Profiler

```cpp
// Profile NUMA memory access patterns
class NUMAProfiler {
    NUMATopology topology_;
    
public:
    struct AccessStats {
        int local_accesses;
        int remote_accesses;
        float local_latency_ns;
        float remote_latency_ns;
        float bandwidth_gbps;
    };
    
    AccessStats profile_access(
        const void* data,
        size_t size,
        int iterations = 1000
    ) {
        AccessStats stats = {};
        
        int data_node = get_memory_node(const_cast<void*>(data));
        int current_node = topology_.get_current_node();
        
        bool is_local = (data_node == current_node);
        
        // Measure access latency
        auto start = std::chrono::high_resolution_clock::now();
        
        volatile const char* ptr = static_cast<const char*>(data);
        size_t stride = 64;  // Cache line stride
        
        for (int iter = 0; iter < iterations; iter++) {
            for (size_t i = 0; i < size; i += stride) {
                // Access each cache line
                char val = ptr[i];
                (void)val;
            }
        }
        
        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::nanoseconds>(end - start);
        
        stats.local_accesses = is_local ? iterations : 0;
        stats.remote_accesses = is_local ? 0 : iterations;
        stats.local_latency_ns = is_local ? duration.count() / (float)iterations : 0;
        stats.remote_latency_ns = is_local ? 0 : duration.count() / (float)iterations;
        stats.bandwidth_gbps = (size * iterations) / (float)duration.count();
        
        return stats;
    }
    
    // Compare local vs remote access
    void benchmark_numa_access() {
        int num_nodes = topology_.get_num_nodes();
        size_t test_size = 1024 * 1024;  // 1 MB
        
        std::cout << "NUMA Access Benchmark:\n\n";
        
        for (int src_node = 0; src_node < num_nodes; src_node++) {
            for (int dst_node = 0; dst_node < num_nodes; dst_node++) {
                // Allocate on source node
                NUMAAwareAllocator allocator;
                void* data = allocator.allocate_on_node(test_size, src_node);
                
                // Bind to destination node and measure
                const auto& cpus = topology_.get_node_cpus(dst_node);
                cpu_set_t cpuset;
                CPU_ZERO(&cpuset);
                CPU_SET(cpus[0], &cpuset);
                pthread_setaffinity_np(pthread_self(), sizeof(cpu_set_t), &cpuset);
                
                auto stats = profile_access(data, test_size);
                
                float distance = topology_.get_distance(src_node, dst_node);
                
                std::cout << "Node " << src_node << " -> Node " << dst_node 
                          << " (distance: " << distance << ")\n";
                std::cout << "  Latency: " << stats.local_latency_ns + stats.remote_latency_ns 
                          << " ns\n";
                std::cout << "  Bandwidth: " << stats.bandwidth_gbps << " GB/s\n";
                
                allocator.deallocate(data, test_size);
            }
        }
    }
    
private:
    int get_memory_node(void* ptr) {
        int node = -1;
        get_mempolicy(&node, nullptr, 0, ptr, MPOL_F_NODE | MPOL_F_ADDR);
        return node;
    }
};
```

---

## 5. Code Examples

### 5.1 Prefetch Intrinsics for Tensor Access

```cpp
// Comprehensive prefetch library for tensor operations
#include <immintrin.h>
#include <cstdint>

namespace prefetch {

// Prefetch hint types
enum class Hint {
    T0 = _MM_HINT_T0,    // Prefetch to L1 and all higher levels
    T1 = _MM_HINT_T1,    // Prefetch to L2 and higher
    T2 = _MM_HINT_T2,    // Prefetch to L3 and higher
    NTA = _MM_HINT_NTA   // Non-temporal access (evict quickly)
};

// Platform-independent prefetch
inline void prefetch(const void* addr, Hint hint = Hint::T0) {
    #if defined(__x86_64__) || defined(_M_X64)
        _mm_prefetch(static_cast<const char*>(addr), static_cast<int>(hint));
    #elif defined(__aarch64__)
        __builtin_prefetch(addr, 0, static_cast<int>(hint));
    #else
        (void)addr;
        (void)hint;
    #endif
}

// Prefetch stride pattern
template<Hint H = Hint::T0>
inline void prefetch_stride(const void* base, size_t stride, size_t count) {
    const char* ptr = static_cast<const char*>(base);
    for (size_t i = 0; i < count; i++) {
        prefetch(ptr + i * stride, H);
    }
}

// Prefetch for matrix multiplication
// Prefetch A, B matrices while computing C
template<int BLOCK_SIZE, int PREFETCH_DISTANCE>
void matmul_prefetch(
    const float* A, const float* B, float* C,
    size_t M, size_t N, size_t K
) {
    for (size_t i = 0; i < M; i++) {
        for (size_t j = 0; j < N; j++) {
            // Prefetch next rows
            if (i + PREFETCH_DISTANCE < M) {
                prefetch(A + (i + PREFETCH_DISTANCE) * K, Hint::T0);
            }
            if (j + PREFETCH_DISTANCE < N) {
                prefetch(B + j + PREFETCH_DISTANCE, Hint::T1);
            }
            
            // Compute current element
            float sum = 0.0f;
            for (size_t k = 0; k < K; k++) {
                // Prefetch K elements ahead
                if (k + PREFETCH_DISTANCE < K) {
                    prefetch(A + i * K + k + PREFETCH_DISTANCE, Hint::T2);
                    prefetch(B + (k + PREFETCH_DISTANCE) * N + j, Hint::T2);
                }
                sum += A[i * K + k] * B[k * N + j];
            }
            C[i * N + j] = sum;
        }
    }
}

// Prefetch for self-origin tensor attention
void prefetch_self_origin_attention(
    const float* origin_data,
    const int* relative_indices,
    float* output,
    int num_heads,
    int head_dim
) {
    constexpr int PREFETCH_AHEAD = 8;
    
    for (int h = 0; h < num_heads; h++) {
        // Prefetch future heads
        if (h + PREFETCH_AHEAD < num_heads) {
            int future_idx = relative_indices[h + PREFETCH_AHEAD];
            const float* future_data = origin_data + future_idx * head_dim;
            
            // Prefetch 4 cache lines for head_dim = 64 (256 bytes)
            #pragma unroll 4
            for (int cl = 0; cl < 4; cl++) {
                prefetch(future_data + cl * 16, Hint::T0);
            }
        }
        
        // Current head computation
        int idx = relative_indices[h];
        const float* data = origin_data + idx * head_dim;
        
        // Vectorized copy with intrinsic prefetch
        #pragma unroll
        for (int d = 0; d < head_dim; d += 16) {
            // Prefetch next iteration
            if (d + 16 < head_dim) {
                prefetch(data + d + 16, Hint::T0);
            }
            
            // Load, process, store
            __m512 vec = _mm512_load_ps(data + d);
            // ... process ...
            _mm512_store_ps(output + h * head_dim + d, vec);
        }
    }
}

} // namespace prefetch
```

### 5.2 Aligned Allocation Implementation

```cpp
// Complete aligned allocation implementation
#include <memory>
#include <vector>
#include <cstdint>
#include <stdexcept>

namespace aligned_alloc {

// Alignment constants
constexpr size_t CACHE_LINE = 64;
constexpr size_t PAGE_SIZE = 4096;
constexpr size_t AVX512_ALIGN = 64;

// Aligned deleter for smart pointers
template<size_t Alignment>
struct AlignedDeleter {
    void operator()(void* ptr) const {
        #if defined(_MSC_VER)
            _aligned_free(ptr);
        #else
            std::free(ptr);
        #endif
    }
};

// Aligned unique pointer type
template<typename T, size_t Alignment = AVX512_ALIGN>
using AlignedUniquePtr = std::unique_ptr<T[], AlignedDeleter<Alignment>>;

// Make aligned array
template<typename T, size_t Alignment = AVX512_ALIGN>
AlignedUniquePtr<T, Alignment> make_aligned(size_t count) {
    void* ptr = nullptr;
    size_t size = count * sizeof(T);
    
    #if defined(_MSC_VER)
        ptr = _aligned_malloc(size, Alignment);
    #elif defined(__APPLE__)
        size = ((size + Alignment - 1) / Alignment) * Alignment;
        ptr = aligned_alloc(Alignment, size);
    #else
        if (posix_memalign(&ptr, Alignment, size) != 0) {
            ptr = nullptr;
        }
    #endif
    
    if (!ptr) {
        throw std::bad_alloc();
    }
    
    return AlignedUniquePtr<T, Alignment>(static_cast<T*>(ptr));
}

// Check alignment
inline bool is_aligned(const void* ptr, size_t alignment) {
    return (reinterpret_cast<uintptr_t>(ptr) & (alignment - 1)) == 0;
}

// Align pointer up
template<typename T>
inline T* align_up(T* ptr, size_t alignment) {
    uintptr_t addr = reinterpret_cast<uintptr_t>(ptr);
    uintptr_t aligned = (addr + alignment - 1) & ~(alignment - 1);
    return reinterpret_cast<T*>(aligned);
}

// Align size up
inline size_t align_up(size_t size, size_t alignment) {
    return (size + alignment - 1) & ~(alignment - 1);
}

// Aligned tensor with metadata
template<typename T, size_t Alignment = AVX512_ALIGN>
class AlignedTensor {
public:
    AlignedTensor(const std::vector<size_t>& shape)
        : shape_(shape)
    {
        // Calculate total elements
        total_elements_ = 1;
        for (auto dim : shape_) {
            total_elements_ *= dim;
        }
        
        // Calculate strides (C-contiguous)
        strides_.resize(shape_.size());
        strides_.back() = 1;
        for (int i = shape_.size() - 2; i >= 0; i--) {
            strides_[i] = strides_[i + 1] * shape_[i + 1];
        }
        
        // Over-allocate for boundary safety
        size_t padded_elements = align_up(total_elements_, Alignment / sizeof(T));
        padded_elements += Alignment / sizeof(T);  // Extra padding
        
        // Allocate aligned memory
        data_ = make_aligned<T, Alignment>(padded_elements);
        padded_size_ = padded_elements;
        
        // Verify alignment
        assert(is_aligned(data_.get(), Alignment));
    }
    
    // Accessors
    T* data() { return data_.get(); }
    const T* data() const { return data_.get(); }
    size_t size() const { return total_elements_; }
    size_t padded_size() const { return padded_size_; }
    const std::vector<size_t>& shape() const { return shape_; }
    const std::vector<size_t>& strides() const { return strides_; }
    bool is_aligned() const { return is_aligned(data_.get(), Alignment); }
    
    // Element access
    T& operator()(const std::vector<size_t>& indices) {
        size_t flat_idx = 0;
        for (size_t i = 0; i < indices.size(); i++) {
            flat_idx += indices[i] * strides_[i];
        }
        return data_[flat_idx];
    }
    
    const T& operator()(const std::vector<size_t>& indices) const {
        size_t flat_idx = 0;
        for (size_t i = 0; i < indices.size(); i++) {
            flat_idx += indices[i] * strides_[i];
        }
        return data_[flat_idx];
    }
    
    // Flat access
    T& operator[](size_t idx) { return data_[idx]; }
    const T& operator[](size_t idx) const { return data_[idx]; }
    
private:
    AlignedUniquePtr<T, Alignment> data_;
    std::vector<size_t> shape_;
    std::vector<size_t> strides_;
    size_t total_elements_;
    size_t padded_size_;
};

// Convenience types
template<typename T>
using AVX512Tensor = AlignedTensor<T, 64>;

template<typename T>
using CUDATensor = AlignedTensor<T, 128>;

} // namespace aligned_alloc
```

### 5.3 NUMA-Aware Memory Binding

```cpp
// Complete NUMA-aware memory binding implementation
#ifdef __linux__
#include <numa.h>
#include <numaif.h>
#include <sched.h>
#include <sys/mman.h>
#endif

#include <vector>
#include <thread>
#include <memory>

namespace numa {

// NUMA context guard - binds current thread to NUMA node
class NUMAContextGuard {
    int old_node_;
    cpu_set_t old_cpuset_;
    
public:
    explicit NUMAContextGuard(int node) {
        #ifdef __linux__
        // Save old affinity
        pthread_getaffinity_np(pthread_self(), sizeof(cpu_set_t), &old_cpuset_);
        
        // Get CPUs for target node
        struct bitmask* cpus = numa_allocate_cpumask();
        numa_node_to_cpus(node, cpus);
        
        // Set new affinity
        cpu_set_t new_cpuset;
        CPU_ZERO(&new_cpuset);
        for (int cpu = 0; cpu < CPU_SETSIZE; cpu++) {
            if (numa_bitmask_isbitset(cpus, cpu)) {
                CPU_SET(cpu, &new_cpuset);
                break;  // Use first CPU on node
            }
        }
        
        numa_free_cpumask(cpus);
        pthread_setaffinity_np(pthread_self(), sizeof(cpu_set_t), &new_cpuset);
        old_node_ = node;
        #else
        (void)node;
        #endif
    }
    
    ~NUMAContextGuard() {
        #ifdef __linux__
        pthread_setaffinity_np(pthread_self(), sizeof(cpu_set_t), &old_cpuset_);
        #endif
    }
};

// NUMA-aware memory pool
class NUMAMemoryPool {
    struct NodePool {
        void* base;
        size_t capacity;
        size_t used;
        int node;
    };
    
    std::vector<NodePool> pools_;
    
public:
    NUMAMemoryPool(const std::vector<std::pair<int, size_t>>& node_configs) {
        #ifdef __linux__
        for (auto [node, capacity] : node_configs) {
            void* mem = numa_alloc_onnode(capacity, node);
            if (mem) {
                pools_.push_back({mem, capacity, 0, node});
            }
        }
        #else
        (void)node_configs;
        #endif
    }
    
    ~NUMAMemoryPool() {
        #ifdef __linux__
        for (auto& pool : pools_) {
            numa_free(pool.base, pool.capacity);
        }
        #endif
    }
    
    void* allocate(size_t size, int preferred_node = -1) {
        #ifdef __linux__
        // Try preferred node first
        if (preferred_node >= 0) {
            for (auto& pool : pools_) {
                if (pool.node == preferred_node && pool.used + size <= pool.capacity) {
                    void* ptr = static_cast<char*>(pool.base) + pool.used;
                    pool.used += size;
                    return ptr;
                }
            }
        }
        
        // Fall back to any node with space
        for (auto& pool : pools_) {
            if (pool.used + size <= pool.capacity) {
                void* ptr = static_cast<char*>(pool.base) + pool.used;
                pool.used += size;
                return ptr;
            }
        }
        #else
        (void)size;
        (void)preferred_node;
        #endif
        
        return nullptr;
    }
    
    void reset() {
        for (auto& pool : pools_) {
            pool.used = 0;
        }
    }
};

// NUMA-aware transformer weights
class NUMATransformerWeights {
    struct LayerWeights {
        void* query_weight;
        void* key_weight;
        void* value_weight;
        void* output_weight;
        void* ff_weight1;
        void* ff_weight2;
        int numa_node;
        size_t size;
    };
    
    std::vector<LayerWeights> layers_;
    NUMAMemoryPool pool_;
    
public:
    NUMATransformerWeights(
        int num_layers,
        int hidden_dim,
        int num_heads,
        int num_nodes
    ) : pool_(create_pool_config(num_layers, hidden_dim, num_heads, num_nodes))
    {
        size_t layer_size = hidden_dim * hidden_dim * sizeof(float);
        
        for (int l = 0; l < num_layers; l++) {
            int node = l % num_nodes;
            
            LayerWeights lw;
            lw.query_weight = pool_.allocate(layer_size, node);
            lw.key_weight = pool_.allocate(layer_size, node);
            lw.value_weight = pool_.allocate(layer_size, node);
            lw.output_weight = pool_.allocate(layer_size, node);
            lw.ff_weight1 = pool_.allocate(4 * layer_size, node);
            lw.ff_weight2 = pool_.allocate(4 * layer_size, node);
            lw.numa_node = node;
            lw.size = layer_size * 12;
            
            layers_.push_back(lw);
        }
    }
    
    // Initialize weights with first-touch on correct NUMA node
    void initialize() {
        #ifdef __linux__
        for (auto& layer : layers_) {
            NUMAContextGuard guard(layer.numa_node);
            
            // Initialize each weight array
            initialize_weight(layer.query_weight, layer.size);
            initialize_weight(layer.key_weight, layer.size);
            initialize_weight(layer.value_weight, layer.size);
            initialize_weight(layer.output_weight, layer.size);
            initialize_weight(layer.ff_weight1, layer.size * 4);
            initialize_weight(layer.ff_weight2, layer.size * 4);
        }
        #endif
    }
    
    LayerWeights& get_layer(int l) { return layers_[l]; }
    const LayerWeights& get_layer(int l) const { return layers_[l]; }
    
private:
    static std::vector<std::pair<int, size_t>> create_pool_config(
        int num_layers, int hidden_dim, int num_heads, int num_nodes
    ) {
        size_t layer_size = hidden_dim * hidden_dim * sizeof(float);
        size_t total_per_node = (num_layers / num_nodes + 1) * layer_size * 12;
        
        std::vector<std::pair<int, size_t>> config;
        for (int n = 0; n < num_nodes; n++) {
            config.push_back({n, total_per_node});
        }
        return config;
    }
    
    void initialize_weight(void* ptr, size_t size) {
        // First-touch initialization
        float* fptr = static_cast<float*>(ptr);
        size_t count = size / sizeof(float);
        
        #pragma omp parallel for
        for (size_t i = 0; i < count; i++) {
            fptr[i] = 0.0f;  // Zero initialization (first-touch)
        }
    }
};

} // namespace numa
```

---

## 6. Performance Models

### 6.1 Memory Hierarchy Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Memory Hierarchy Latency Model                   │
├──────────────────┬───────────────┬────────────┬─────────────────────┤
│ Level            │ Latency (ns)  │ Size       │ Bandwidth           │
├──────────────────┼───────────────┼────────────┼─────────────────────┤
│ L1 Cache         │ 1-4           │ 32 KB      │ ~2 TB/s             │
│ L2 Cache         │ 3-10          │ 256 KB     │ ~1 TB/s             │
│ L3 Cache         │ 10-40         │ 8-64 MB    │ ~500 GB/s           │
│ DRAM (local)     │ 50-150        │ 64+ GB     │ 50-200 GB/s         │
│ DRAM (remote)    │ 100-300       │ -          │ 25-100 GB/s         │
│ NVMe SSD         │ 10,000+       │ TB         │ 3-7 GB/s            │
└──────────────────┴───────────────┴────────────┴─────────────────────┘

Prefetch Decision Threshold:
- If data fits in L3: prefetch to L2 (T1 hint)
- If data fits in DRAM: prefetch to L3 (T2 hint)
- If streaming: use non-temporal (NTA hint)
```

### 6.2 Self-Origin Tensor Access Model

```
┌─────────────────────────────────────────────────────────────────────┐
│           Self-Origin Tensor Access Performance Model               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Traditional Tensor Access:                                         │
│  T[i][j][k] → Base + i*stride_i + j*stride_j + k*stride_k          │
│  Memory accesses: 3 (indices) + 1 (data) = 4                        │
│  Cache pressure: HIGH (index lookups)                               │
│                                                                     │
│  LOG Self-Origin Access:                                            │
│  T^[s]_{i,j,k} = Origin + (i-j)*stride + k                          │
│  Memory accesses: 1 (offset) + 1 (data) = 2                         │
│  Cache pressure: LOW (origin implicit)                              │
│                                                                     │
│  Speedup Model:                                                     │
│  Speedup = (Traditional accesses) / (LOG accesses)                  │
│  Speedup = 4 / 2 = 2x theoretical                                   │
│                                                                     │
│  With Prefetch:                                                     │
│  Prefetch Distance = L_mem / T_compute                              │
│  Effective Latency = max(0, L_mem - Distance * T_compute)           │
│                                                                     │
│  For L_mem = 150ns, T_compute = 10ns:                               │
│  Distance = 15 elements                                              │
│  Effective Latency ≈ 0 (fully hidden)                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 NUMA Access Cost Model

```cpp
// NUMA cost model for placement decisions
struct NUMACostModel {
    float local_latency_ns;
    float remote_latency_ns;
    float local_bandwidth_gbps;
    float remote_bandwidth_gbps;
    int num_nodes;
    
    // Calculate cost of accessing data from different NUMA node
    float access_cost(int src_node, int dst_node, size_t bytes) const {
        if (src_node == dst_node) {
            return bytes / (local_bandwidth_gbps * 1e9) + local_latency_ns;
        } else {
            return bytes / (remote_bandwidth_gbps * 1e9) + remote_latency_ns;
        }
    }
    
    // Determine if migration is beneficial
    bool should_migrate(int current_node, int compute_node, size_t working_set) const {
        float stay_cost = access_cost(current_node, compute_node, working_set);
        float migrate_cost = access_cost(compute_node, compute_node, working_set) + 
                            100000;  // Migration overhead (100 μs)
        
        return migrate_cost < stay_cost;
    }
    
    // Optimal placement for multi-threaded access
    int optimal_placement(
        const std::vector<int>& access_nodes,
        const std::vector<size_t>& access_sizes
    ) const {
        float min_cost = std::numeric_limits<float>::max();
        int best_node = 0;
        
        for (int candidate = 0; candidate < num_nodes; candidate++) {
            float total_cost = 0;
            for (size_t i = 0; i < access_nodes.size(); i++) {
                total_cost += access_cost(access_nodes[i], candidate, access_sizes[i]);
            }
            
            if (total_cost < min_cost) {
                min_cost = total_cost;
                best_node = candidate;
            }
        }
        
        return best_node;
    }
};
```

---

## 7. LOG Integration

### 7.1 LOG Principle Application Summary

| Technique | LOG Application | Benefit |
|-----------|-----------------|---------|
| Prefetch distance | Origin-relative timing | Predictable prefetch schedule |
| Self-origin prefetch | Origin implicit, offsets computed | 2x fewer memory accesses |
| Alignment | Origin = alignment boundary | Zero-offset alignment |
| NUMA placement | Origin = NUMA node | First-touch locality |
| Cache line padding | Origin = cache line start | No false sharing |
| SoA layout | Origin = first element | Sequential access |

### 7.2 Unified LOG-Based Optimizer

```cpp
// Unified optimizer applying LOG principle to all optimizations
class LOGOptimizer {
public:
    struct Config {
        int numa_node;
        size_t alignment;
        int prefetch_distance;
        bool use_soa;
        bool pad_cache_lines;
    };
    
private:
    Config config_;
    numa::NUMAMemoryPool pool_;
    
public:
    LOGOptimizer(const Config& config) 
        : config_(config), 
          pool_({{config.numa_node, 1024 * 1024 * 1024}}) 
    {}
    
    // Allocate with all LOG optimizations
    template<typename T>
    aligned_alloc::AVX512Tensor<T> allocate_optimized(
        const std::vector<size_t>& shape
    ) {
        // 1. Apply alignment (origin = aligned boundary)
        auto tensor = aligned_alloc::AVX512Tensor<T>(shape);
        
        // 2. Apply NUMA placement (origin = local NUMA node)
        #ifdef __linux__
        numa::NUMAContextGuard guard(config_.numa_node);
        
        // First-touch initialization
        for (size_t i = 0; i < tensor.size(); i++) {
            tensor[i] = T{};
        }
        #endif
        
        return tensor;
    }
    
    // Compute with all LOG optimizations
    template<typename T>
    void compute_optimized(
        const T* input,
        T* output,
        size_t size
    ) {
        // 1. Verify alignment
        assert(aligned_alloc::is_aligned(input, config_.alignment));
        assert(aligned_alloc::is_aligned(output, config_.alignment));
        
        // 2. Apply prefetching (origin-relative timing)
        constexpr int STRIDE = 64;  // Cache line stride
        
        #pragma omp parallel for
        for (size_t i = 0; i < size; i++) {
            // Prefetch ahead
            if (i + config_.prefetch_distance < size) {
                prefetch::prefetch(
                    input + i + config_.prefetch_distance, 
                    prefetch::Hint::T0
                );
            }
            
            // Compute (LOG: relative to origin)
            output[i] = input[i];  // Placeholder for actual computation
        }
    }
};
```

---

## 8. Experiment Designs

### 8.1 Prefetch Distance Experiment

```python
# Experiment: Find optimal prefetch distance
import numpy as np
import time
import matplotlib.pyplot as plt

def experiment_prefetch_distance():
    """
    Experiment to find optimal prefetch distance for transformer weights.
    
    Hypothesis: Optimal distance = L_mem / T_compute
    """
    sizes = [1024, 4096, 16384, 65536]  # Elements
    prefetch_distances = [0, 4, 8, 16, 32, 64, 128]
    
    results = {size: [] for size in sizes}
    
    for size in sizes:
        data = np.random.randn(size).astype(np.float32)
        output = np.zeros_like(data)
        
        for distance in prefetch_distances:
            # Measure with prefetch
            start = time.perf_counter()
            
            for i in range(size):
                if i + distance < size:
                    # Prefetch intrinsic (simulated)
                    pass
                output[i] = data[i] * 2.0  # Simple computation
            
            end = time.perf_counter()
            results[size].append(end - start)
    
    # Plot results
    fig, ax = plt.subplots()
    for size, times in results.items():
        ax.plot(prefetch_distances, times, label=f'Size={size}')
    
    ax.set_xlabel('Prefetch Distance (elements)')
    ax.set_ylabel('Time (seconds)')
    ax.legend()
    ax.set_title('Prefetch Distance vs Execution Time')
    plt.savefig('prefetch_distance_experiment.png')
    
    return results
```

### 8.2 Alignment Impact Experiment

```python
# Experiment: Measure impact of alignment on vector operations
def experiment_alignment_impact():
    """
    Experiment to measure performance impact of alignment.
    
    Hypothesis: Aligned access is 2-4x faster for vector operations.
    """
    import ctypes
    
    sizes = [1024, 4096, 16384, 65536]
    alignments = [16, 32, 64, 128]
    
    results = {align: [] for align in alignments}
    
    for alignment in alignments:
        for size in sizes:
            # Allocate aligned memory
            aligned_data = ctypes.create_string_buffer(size * 4 + alignment)
            base_addr = ctypes.addressof(aligned_data)
            aligned_addr = (base_addr + alignment - 1) & ~(alignment - 1)
            
            # Cast to float array
            data = (ctypes.c_float * size).from_address(aligned_addr)
            
            # Initialize
            for i in range(size):
                data[i] = float(i)
            
            # Time aligned access
            start = time.perf_counter()
            
            for _ in range(1000):  # Multiple iterations for timing
                for i in range(size):
                    data[i] *= 1.001
            
            end = time.perf_counter()
            results[alignment].append(end - start)
    
    return results
```

### 8.3 NUMA Locality Experiment

```python
# Experiment: Measure NUMA locality impact
def experiment_numa_locality():
    """
    Experiment to measure NUMA locality impact on tensor operations.
    
    Hypothesis: Local NUMA access is 2-3x faster than remote.
    """
    # This requires actual NUMA hardware
    
    numa_topologies = [
        {'nodes': 1, 'local_time': 1.0, 'remote_time': 1.0},
        {'nodes': 2, 'local_time': 1.0, 'remote_time': 1.5},
        {'nodes': 4, 'local_time': 1.0, 'remote_time': 2.0},
        {'nodes': 8, 'local_time': 1.0, 'remote_time': 2.5},
    ]
    
    # Simulated results
    print("NUMA Locality Experiment Results:")
    print("=" * 50)
    print(f"{'Nodes':<10}{'Local Time':<15}{'Remote Time':<15}{'Ratio'}")
    print("-" * 50)
    
    for topo in numa_topologies:
        ratio = topo['remote_time'] / topo['local_time']
        print(f"{topo['nodes']:<10}{topo['local_time']:<15.2f}"
              f"{topo['remote_time']:<15.2f}{ratio:.2f}x")
    
    return numa_topologies
```

---

## 9. Summary and Recommendations

### 9.1 Key Findings

1. **Prefetch Distance**: Optimal distance of 8-16 cache lines for transformer inference, derived from L_mem/T_compute ratio.

2. **Alignment**: 64-byte alignment essential for AVX-512; over-allocation of 1-2 cache lines prevents boundary issues.

3. **Self-Origin Pattern**: LOG principle reduces memory access from 4 to 2 operations per element access.

4. **NUMA**: First-touch policy critical; layer-wise distribution across NUMA nodes minimizes remote access.

5. **False Sharing**: Cache-line padded thread buffers eliminate coherency traffic in multi-threaded attention.

### 9.2 Implementation Priority

1. **High Priority**: Aligned allocation with over-allocation
2. **High Priority**: NUMA-aware weight initialization
3. **Medium Priority**: Software prefetching for sparse patterns
4. **Medium Priority**: Cache line padding for thread-local buffers
5. **Low Priority**: Hardware prefetcher tuning (usually automatic)

### 9.3 Future Research

- Adaptive prefetch distance based on runtime conditions
- Hardware-specific alignment for emerging ISAs (SVE, RVV)
- NUMA topology-aware model parallelism
- Quantized prefetch for low-precision operations

---

## References

1. Intel 64 and IA-32 Architectures Optimization Reference Manual
2. NUMA API Documentation (Linux)
3. "What Every Programmer Should Know About Memory" - Ulrich Drepper
4. "Software Prefetching" - Callenes-Slan et al.
5. AVX-512 Programming Reference
6. DeepSeek-V2 Technical Report (MLA optimization)

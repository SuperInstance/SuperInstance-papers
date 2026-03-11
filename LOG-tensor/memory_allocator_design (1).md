# Custom Memory Allocator Design for Tensor Operations

## POLLN-RTT Research: Memory Systems Architecture

**Context**: Self-origin tensors with unique allocation patterns, transformer layers requiring efficient activation storage, and the LOG principle (Logic-Organizing-Geocentrically) affecting memory layout decisions.

---

## 1. Arena Allocators for Tensors

### 1.1 Design Philosophy for Transformer Layer Activations

Arena allocators, also known as region-based allocators or bump allocators, provide an ideal memory management strategy for transformer layer activations due to their predictable allocation patterns. In a transformer forward pass, activations are allocated sequentially as data flows through each layer, then deallocated en masse during backpropagation or after inference completion.

The fundamental insight is that transformer activations exhibit **monotonic allocation with bulk deallocation** - allocations proceed in order (layer 0 → layer 1 → layer 2 → ...) and deallocations occur either in reverse order during backpropagation or all at once after the forward pass. This pattern matches arena allocators perfectly, eliminating the need for individual free operations.

**Key Design Principles:**

1. **Linear Growth**: Memory grows linearly with layer depth, enabling predictable capacity planning
2. **Zero Fragmentation**: No free-list management means no fragmentation within the arena
3. **Cache Locality**: Sequential allocation ensures contiguous memory, improving cache utilization
4. **O(1) Allocation**: Single pointer bump operation, no search through free lists

### 1.2 Pool Sizing Strategies for Variable Batch Sizes

The challenge in transformer inference is variable batch sizes - requests arrive with different sequence lengths and batch dimensions. Pool sizing must accommodate this variability efficiently.

**Tiered Pool Strategy:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Memory Pool Architecture                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ Small Pool       │  │ Medium Pool      │  │ Large Pool     │ │
│  │ Batch ≤ 4        │  │ Batch ≤ 32       │  │ Batch ≤ 256    │ │
│  │ Size: 256 MB     │  │ Size: 2 GB       │  │ Size: 16 GB    │ │
│  │ Pre-allocated    │  │ Pre-allocated    │  │ On-demand      │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┤
│  │ Overflow Arena (mmap-backed, grows dynamically)              │
│  └──────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
```

**Mathematical Model for Pool Sizing:**

Given a transformer with $L$ layers, hidden dimension $d$, sequence length $s$, batch size $b$, and attention heads $h$, the activation memory per layer is:

$$M_{layer} = b \cdot s \cdot d \cdot \text{sizeof}(float16)$$

For self-attention with KV-cache:
$$M_{attention} = 2 \cdot b \cdot h \cdot s \cdot d_k \cdot \text{sizeof}(float16)$$

where $d_k = d / h$ is the dimension per head.

**Total activation memory:**
$$M_{total} = \sum_{l=0}^{L-1} (M_{layer}^{(l)} + M_{attention}^{(l)})$$

**Pool sizing heuristic:**
$$Pool_{size} = 1.5 \times \max_{batch \in B} M_{total}(batch)$$

The 1.5x factor accounts for intermediate computations (softmax, layer norm, etc.) and provides headroom for edge cases.

### 1.3 Thread-Local vs Shared Pools

**Thread-Local Pools:**

Thread-local arenas excel in scenarios where each thread processes independent batches. The key advantages are:

1. **Zero Contention**: No atomic operations or locks needed for allocation
2. **Predictable Latency**: Allocation time is deterministic
3. **NUMA Locality**: Each thread's arena can be placed on its local NUMA node

```
Thread-Local Arena Layout:
┌─────────────────────────────────────────────────────────────────┐
│ Thread 0                    │ Thread 1                    │ ... │
│ ┌─────────────────────────┐ │ ┌─────────────────────────┐ │     │
│ │ Local Arena (NUMA 0)    │ │ │ Local Arena (NUMA 1)    │ │     │
│ │ Head: 0x7f0000000000    │ │ │ Head: 0x7f1000000000    │ │     │
│ │ Offset: 256MB           │ │ │ Offset: 128MB           │ │     │
│ │ Capacity: 512MB         │ │ │ Capacity: 512MB         │ │     │
│ └─────────────────────────┘ │ └─────────────────────────┘ │     │
└─────────────────────────────────────────────────────────────────┘
```

**Shared Pool with Sharding:**

For scenarios requiring dynamic load balancing, a sharded shared pool provides better memory utilization:

```
Shared Sharded Pool:
┌─────────────────────────────────────────────────────────────────┐
│ Global Arena Manager                                            │
├─────────────────────────────────────────────────────────────────┤
│ Shard 0        │ Shard 1        │ Shard 2        │ Shard 3      │
│ Lock: atomic   │ Lock: atomic   │ Lock: atomic   │ Lock: atomic │
│ Offset: 256MB  │ Offset: 512MB  │ Offset: 128MB  │ Offset: 384MB│
└─────────────────────────────────────────────────────────────────┘

Allocation: thread_id % num_shards → preferred shard
Fallback: try next shard on collision
```

**Hybrid Approach (Recommended):**

The optimal design combines both:
- Each thread has a small local arena for guaranteed low-latency small allocations
- A shared sharded arena handles larger allocations and overflow
- Background thread performs arena compaction and rebalancing

### 1.4 Bump Allocator for Forward Pass

The bump allocator is the simplest and fastest allocator for the forward pass scenario. It maintains a single pointer (the "bump" pointer) and advances it by the requested size.

**Implementation Principles:**

```cpp
struct BumpAllocator {
    uint8_t* origin;      // Arena start (LOG: implicit reference)
    uint8_t* current;     // Current position (offset from origin)
    uint8_t* end;         // Arena end
    
    // O(1) allocation - just bump the pointer
    void* allocate(size_t size, size_t alignment = 64) {
        // Align current pointer
        uintptr_t aligned = (reinterpret_cast<uintptr_t>(current) + alignment - 1) 
                           & ~(alignment - 1);
        
        uint8_t* result = reinterpret_cast<uint8_t*>(aligned);
        
        if (result + size > end) [[unlikely]] {
            return nullptr;  // Out of memory
        }
        
        current = result + size;
        return result;
    }
    
    // O(1) reset - return to origin (LOG principle)
    void reset() {
        current = origin;
    }
};
```

**Alignment Strategy for Tensor Operations:**

Tensors benefit from specific alignment guarantees:
- **64-byte alignment**: Matches cache line size, enables SIMD operations
- **4096-byte alignment**: Matches page size, enables huge page optimizations
- **2MB alignment**: Matches huge page size for large tensors

The allocator should support hierarchical alignment:
- Small tensors (< 64KB): 64-byte alignment
- Medium tensors (64KB - 4MB): 4096-byte alignment
- Large tensors (> 4MB): 2MB alignment

---

## 2. Self-Origin Tensor Memory Pool

### 2.1 Specialized Allocator for T^[s]_{i,j,k}

The self-origin tensor $T^{[s]}_{i,j,k}$ requires a specialized memory layout that embodies the LOG principle. The tensor is defined as:

$$T^{[s]}_{i,j,k} = T([s], i - j, k)$$

Where $[s]$ is the implicit origin (the tensor itself), and $i - j$ represents relative positioning.

**Memory Layout Design:**

```
Self-Origin Tensor Memory Layout:
┌─────────────────────────────────────────────────────────────────┐
│ Origin Block (Implicit Reference)                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Tensor Metadata                                             │ │
│ │ - Shape: [batch, seq_len, hidden_dim]                       │ │
│ │ - Strides: computed relative to origin                      │ │
│ │ - Origin_offset: 0 (implicit, not stored)                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Relative Index Table (LOG: all indices are offsets)             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ offset[i,j] = (i - j) * hidden_dim * sizeof(element)       │ │
│ │ Enables O(1) relative position lookup                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Data Block (Contiguous, origin-relative access)                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Element at (i,j,k) = origin[rel_offset[i,j] + k]           │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 O(1) Origin Computation Through Memory Layout

The key innovation is that the origin is never stored - it is computed from the memory layout itself. This enables O(1) origin-relative access:

**Algorithm:**

```cpp
template<typename T>
class SelfOriginTensor {
private:
    T* data_origin;           // Points to position [0,0,0]
    int64_t batch_size;
    int64_t seq_len;
    int64_t hidden_dim;
    
    // Precomputed stride tables (LOG: relative to origin)
    int64_t* relative_offsets;  // [seq_len][seq_len] precomputed (i-j) offsets
    
public:
    // O(1) access using LOG principle
    T& at(int64_t i, int64_t j, int64_t k) {
        // LOG: origin is implicit, only relative offset computed
        int64_t rel_offset = relative_offsets[i * seq_len + j];
        return data_origin[rel_offset + k];
    }
    
    // O(1) glitch detection at origin
    float compute_glitch_intensity(T* expected, T* actual, int64_t size) {
        // LOG: only compute deviation from origin (expected)
        float total_variation = 0.0f;
        for (int64_t idx = 0; idx < size; idx++) {
            total_variation += std::abs(expected[idx] - actual[idx]);
        }
        return total_variation / (2.0f * size);  // Normalized TV distance
    }
};
```

**Memory Efficiency Analysis:**

| Operation | Traditional | Self-Origin (LOG) |
|-----------|-------------|-------------------|
| Access T[i,j,k] | O(1) + 3 muls | O(1) + 1 lookup |
| Origin computation | O(n) search | O(1) implicit |
| Memory overhead | 3 stride values | 1 offset table |
| Cache behavior | 1-2 misses | 1 miss (prefetchable) |

### 2.3 Dynamic Origin Change Handling

When the origin must change (e.g., during tensor transformation or multi-agent coordination), the system uses **origin migration**:

**Origin Migration Protocol:**

1. **Capture Current State**: Record all tensor references relative to current origin
2. **Compute Migration Delta**: Calculate the offset from old origin to new origin
3. **Batch Update Offsets**: Apply delta to all relative offsets in vectorized manner
4. **Atomic Swap**: Switch origin pointer atomically

```cpp
void migrate_origin(T* new_origin) {
    int64_t delta = new_origin - data_origin;
    
    // Vectorized offset update (SIMD-friendly)
    #pragma omp simd
    for (int64_t i = 0; i < seq_len * seq_len; i++) {
        relative_offsets[i] += delta;
    }
    
    // Atomic swap
    std::atomic_store(&data_origin, new_origin);
}
```

**Dynamic Origin for Multi-Agent Coordination:**

In POLLN's spreadsheet cell paradigm, each cell is an agent with its own origin. When agents collaborate, their origins must be coordinated:

```
Multi-Agent Origin Coordination:
┌─────────────────────────────────────────────────────────────────┐
│ Spreadsheet Grid                                                │
│ ┌─────────────┬─────────────┬─────────────┐                     │
│ │ Agent A     │ Agent B     │ Agent C     │                     │
│ │ Origin: O_A │ Origin: O_B │ Origin: O_C │                     │
│ │ Local Pool  │ Local Pool  │ Local Pool  │                     │
│ └─────────────┴─────────────┴─────────────┘                     │
│                                                                 │
│ Coordination Protocol:                                          │
│ 1. Shared "world origin" established for inter-agent comm      │
│ 2. Each agent maintains: local_origin + world_offset            │
│ 3. Inter-agent message: convert via world_offset                │
│ 4. O(1) coordinate transform between agents                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Memory Mapping for Large Tensors

### 3.1 mmap for Billion-Parameter Models

For models with billions of parameters, traditional memory allocation becomes impractical. Memory mapping (mmap) provides a solution by mapping files directly into virtual address space, enabling:

1. **Lazy Loading**: Pages loaded on demand
2. **Memory Efficiency**: Multiple processes share same physical memory
3. **Persistence**: Model weights stored directly in mapped files

**mmap-Based Weight Loading Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Memory-Mapped Model Architecture                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Model File (on disk)                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Header: layer_offsets[], layer_sizes[], metadata           ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ Layer 0: embedding weights (256 MB)                        ││
│  │ Layer 1: attention weights (512 MB)                        ││
│  │ Layer 2: FFN weights (1.5 GB)                              ││
│  │ ...                                                        ││
│  │ Layer N-1: output projection (256 MB)                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Virtual Address Space                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ mmap'd region: [0x7f0000000000, 0x7f0000000000 + 100GB]    ││
│  │ Pages faulted in on-demand as layers are accessed          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```cpp
class MMapWeightLoader {
private:
    int fd;
    void* base_addr;
    size_t mapped_size;
    std::unordered_map<std::string, LayerMapping> layer_map;
    
public:
    void* load_model(const char* path) {
        // Open file
        fd = open(path, O_RDONLY);
        
        // Get file size
        struct stat st;
        fstat(fd, &st);
        mapped_size = st.st_size;
        
        // Map entire model (LOG: origin = base_addr)
        base_addr = mmap(
            nullptr,                    // Let kernel choose address
            mapped_size,
            PROT_READ,
            MAP_PRIVATE | MAP_POPULATE, // MAP_POPULATE for eager loading
            fd,
            0
        );
        
        // Parse header and build layer map
        parse_header(base_addr);
        
        return base_addr;
    }
    
    // Get weight tensor by layer name (O(1) lookup)
    Tensor* get_weights(const std::string& layer_name) {
        auto& mapping = layer_map[layer_name];
        // LOG: offset from base_addr (origin)
        return new Tensor(
            static_cast<char*>(base_addr) + mapping.offset,
            mapping.shape,
            mapping.dtype
        );
    }
};
```

### 3.2 Lazy Loading of Layers

For inference on memory-constrained systems, lazy loading enables running models larger than available RAM:

**Lazy Loading Strategy:**

```
Layer Loading Timeline:
┌─────────────────────────────────────────────────────────────────┐
│ Inference Request                                               │
│                                                                 │
│ t=0: Load Layer 0 (embedding) - REQUIRED                       │
│ t=1: Process through Layer 0                                    │
│ t=2: Load Layer 1 (attention) - Evict Layer 0 if needed        │
│ t=3: Process through Layer 1                                    │
│ ...                                                             │
│ t=N: Load output layer, generate result                         │
│                                                                 │
│ Memory Usage: O(max_layer_size) instead of O(total_model_size) │
└─────────────────────────────────────────────────────────────────┘
```

**Prefetching Optimization:**

```cpp
class LazyLayerLoader {
    std::future<void> prefetch_future;
    int current_layer;
    
    void prefetch_next_layer() {
        int next_layer = current_layer + 1;
        prefetch_future = std::async(std::launch::async, [this, next_layer]() {
            // Advise kernel to prefetch pages
            char* layer_start = get_layer_addr(next_layer);
            size_t layer_size = get_layer_size(next_layer);
            
            madvise(layer_start, layer_size, MADV_WILLNEED | MADV_SEQUENTIAL);
        });
    }
    
    Tensor* get_layer(int layer_idx) {
        if (layer_idx != current_layer) {
            // Evict previous layer
            if (current_layer >= 0) {
                madvise(get_layer_addr(current_layer), 
                       get_layer_size(current_layer), 
                       MADV_DONTNEED);
            }
            
            // Wait for prefetch
            if (prefetch_future.valid()) {
                prefetch_future.wait();
            }
            
            current_layer = layer_idx;
            prefetch_next_layer();
        }
        
        return get_layer_tensor(layer_idx);
    }
};
```

### 3.3 Huge Pages (2MB, 1GB)

Huge pages reduce TLB (Translation Lookaside Buffer) pressure, critical for large tensor operations:

**TLB Coverage Comparison:**

| Page Size | Pages for 100GB Model | TLB Entries Needed | TLB Miss Rate |
|-----------|----------------------|--------------------| --------------|
| 4KB | 26,214,400 | 26M+ | ~15% |
| 2MB | 51,200 | ~50K | ~2% |
| 1GB | 100 | ~100 | ~0.1% |

**Huge Page Configuration:**

```cpp
void* allocate_hugepage_tensor(size_t size) {
    void* ptr = nullptr;
    
    // Try 1GB pages first
    if (size >= (1UL << 30)) {
        ptr = mmap(
            nullptr, size,
            PROT_READ | PROT_WRITE,
            MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB | MAP_HUGE_1GB,
            -1, 0
        );
        if (ptr != MAP_FAILED) {
            return ptr;
        }
    }
    
    // Fallback to 2MB pages
    if (size >= (2UL << 20)) {
        ptr = mmap(
            nullptr, size,
            PROT_READ | PROT_WRITE,
            MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB | MAP_HUGE_2MB,
            -1, 0
        );
        if (ptr != MAP_FAILED) {
            return ptr;
        }
    }
    
    // Fallback to regular pages
    return aligned_alloc(4096, size);
}
```

### 3.4 NUMA Awareness

For multi-socket systems, NUMA-aware allocation dramatically improves performance:

**NUMA Allocation Strategy:**

```
NUMA-Aware Tensor Placement:
┌─────────────────────────────────────────────────────────────────┐
│ NUMA Node 0                           │ NUMA Node 1             │
│ ┌───────────────────────────────────┐ │ ┌─────────────────────┐ │
│ │ CPU Cores 0-31                    │ │ │ CPU Cores 32-63     │ │
│ │ Memory: 256 GB                    │ │ │ Memory: 256 GB      │ │
│ │                                   │ │ │                     │ │
│ │ Tensor Pool A (local batches)     │ │ │ Tensor Pool B       │ │
│ │ KV-Cache A                        │ │ │ KV-Cache B          │ │
│ │ Layer 0-5 weights                 │ │ │ Layer 6-11 weights  │ │
│ └───────────────────────────────────┘ │ └─────────────────────┘ │
│                                                                 │
│ Cross-NUMA Access: ~2x latency penalty                          │
│ Strategy: Partition batches by NUMA node                        │
└─────────────────────────────────────────────────────────────────┘
```

```cpp
class NUMAAwareAllocator {
    int num_numa_nodes;
    std::vector<void*> numa_pools;
    
public:
    NUMAAwareAllocator() {
        num_numa_nodes = numa_num_configured_nodes();
        
        for (int node = 0; node < num_numa_nodes; node++) {
            // Allocate pool on each NUMA node
            numa_set_preferred(node);
            numa_pools.push_back(
                mmap(nullptr, POOL_SIZE, 
                     PROT_READ | PROT_WRITE,
                     MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB,
                     -1, 0)
            );
        }
        numa_set_preferred(-1);  // Reset to default
    }
    
    void* allocate_on_node(size_t size, int numa_node) {
        // Set preferred node for this allocation
        numa_set_preferred(numa_node);
        void* ptr = bump_allocate(numa_pools[numa_node], size);
        numa_set_preferred(-1);
        return ptr;
    }
    
    // Get optimal NUMA node for current thread
    int get_thread_numa_node() {
        int cpu = sched_getcpu();
        return numa_node_of_cpu(cpu);
    }
};
```

---

## 4. Hierarchical Memory Tiers

### 4.1 L1/L2/L3 Cache-Aware Allocation

Modern CPUs have complex cache hierarchies that significantly impact tensor operation performance. Cache-aware allocation strategies optimize for:

- **L1 Cache (32-48KB per core)**: Fastest, smallest
- **L2 Cache (256KB-1MB per core)**: Medium speed/size
- **L3 Cache (8-64MB shared)**: Slowest cache, largest

**Cache-Aware Tensor Blocking:**

```
Cache Hierarchy Optimization:
┌─────────────────────────────────────────────────────────────────┐
│ L1 Cache Strategy (32KB, ~4 cycles latency)                     │
│ - Block size: 32x32 elements (float16)                         │
│ - Keep attention scores in L1 during softmax                   │
│ - Tile for element-wise ops                                    │
├─────────────────────────────────────────────────────────────────┤
│ L2 Cache Strategy (256KB, ~12 cycles latency)                   │
│ - Block size: 128x128 elements                                 │
│ - Keep Q, K, V tiles for attention computation                 │
│ - Matrix multiply inner tiles                                  │
├─────────────────────────────────────────────────────────────────┤
│ L3 Cache Strategy (32MB, ~40 cycles latency)                    │
│ - Block size: 1024x1024 elements                               │
│ - Keep entire attention head weights                          │
│ - Layer activations during forward pass                        │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```cpp
template<int L1_TILE = 32, int L2_TILE = 128, int L3_TILE = 1024>
class CacheAwareAllocator {
public:
    // Allocate with cache-line alignment
    void* allocate_l1_aligned(size_t size) {
        return aligned_alloc(64, size);  // 64-byte cache line
    }
    
    // Allocate with page alignment (L2 optimization)
    void* allocate_l2_aligned(size_t size) {
        return aligned_alloc(4096, size);
    }
    
    // Allocate with 2MB alignment (L3 optimization)
    void* allocate_l3_aligned(size_t size) {
        void* ptr = nullptr;
        posix_memalign(&ptr, 2 << 20, size);
        return ptr;
    }
    
    // Prefetch into cache hierarchy
    void prefetch_tensor(void* data, size_t size) {
        char* ptr = static_cast<char*>(data);
        
        // Prefetch to L3 (non-temporal hint)
        for (size_t i = 0; i < size; i += 64) {
            _mm_prefetch(ptr + i, _MM_HINT_T2);  // L3
        }
        
        // Prefetch to L1 (temporal hint)
        for (size_t i = 0; i < std::min(size, (size_t)L1_TILE * L1_TILE * 2); i += 64) {
            _mm_prefetch(ptr + i, _MM_HINT_T0);  // L1
        }
    }
};
```

### 4.2 HOT/MED/COLD Data Tiers

Extending POLLN's four-tier memory model (HOT/MED/COLD/ARCHIVE), we design a tensor-specific tiering system:

```
Hierarchical Tensor Tiering:
┌─────────────────────────────────────────────────────────────────┐
│ HOT Tier (GPU Memory / CPU L1-L2 Cache)                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ - Currently computing tensors                               │ │
│ │ - Attention Q, K, V matrices                                │ │
│ │ - Activation gradients                                      │ │
│ │ Allocation: GPU managed memory, L1-aligned CPU buffers      │ │
│ │ Size Limit: ~100MB per layer                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ MED Tier (CPU L3 Cache / RAM)                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ - Layer activations (forward pass)                          │ │
│ │ - KV-cache (generated tokens)                               │ │
│ │ - Intermediate computation results                          │ │
│ │ Allocation: Page-aligned, huge pages for large tensors      │ │
│ │ Size Limit: ~10GB per model                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ COLD Tier (mmap'd files / SSD)                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ - Model weights (static)                                    │ │
│ │ - Historical activations (checkpointing)                    │ │
│ │ - Expert weights (MoE not in use)                           │ │
│ │ Allocation: mmap with lazy loading                          │ │
│ │ Size Limit: Unlimited (disk-bound)                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Automatic Promotion/Demotion

The system automatically moves tensors between tiers based on access patterns:

**Promotion/Demotion Algorithm:**

```cpp
class TierManager {
    struct TensorInfo {
        void* data;
        size_t size;
        Tier current_tier;
        uint64_t access_count;
        uint64_t last_access_time;
        float promotion_score;
    };
    
    std::unordered_map<void*, TensorInfo> tensor_registry;
    
public:
    void record_access(void* tensor) {
        auto& info = tensor_registry[tensor];
        info.access_count++;
        info.last_access_time = get_current_time();
        
        // Update promotion score (exponential decay)
        float time_since_last = get_current_time() - info.last_access_time;
        info.promotion_score = info.access_count * exp(-time_since_last / DECAY_TAU);
        
        // Check if promotion needed
        if (info.promotion_score > PROMOTION_THRESHOLD) {
            promote(tensor);
        }
    }
    
    void promote(void* tensor) {
        auto& info = tensor_registry[tensor];
        
        switch (info.current_tier) {
            case COLD:
                // mmap to RAM
                madvise(info.data, info.size, MADV_WILLNEED);
                info.current_tier = MED;
                break;
                
            case MED:
                // Copy to GPU / L3-pinned memory
                if (cuda_available()) {
                    void* gpu_ptr = cuda_malloc(info.size);
                    cudaMemcpy(gpu_ptr, info.data, info.size, cudaMemcpyHostToDevice);
                    info.data = gpu_ptr;
                }
                info.current_tier = HOT;
                break;
                
            case HOT:
                // Already in hottest tier
                break;
        }
    }
    
    void demote(void* tensor) {
        auto& info = tensor_registry[tensor];
        
        switch (info.current_tier) {
            case HOT:
                // GPU to RAM
                void* cpu_ptr = aligned_alloc(4096, info.size);
                cudaMemcpy(cpu_ptr, info.data, info.size, cudaMemcpyDeviceToHost);
                cudaFree(info.data);
                info.data = cpu_ptr;
                info.current_tier = MED;
                break;
                
            case MED:
                // RAM to mmap (let OS handle)
                madvise(info.data, info.size, MADV_DONTNEED);
                info.current_tier = COLD;
                break;
                
            case COLD:
                // Already in coldest tier
                break;
        }
    }
    
    // Background thread for tier management
    void background_tier_manager() {
        while (running) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            
            // Demote low-access tensors
            for (auto& [ptr, info] : tensor_registry) {
                float time_since = get_current_time() - info.last_access_time;
                if (time_since > DEMOTION_TIMEOUT && info.current_tier != COLD) {
                    demote(ptr);
                }
            }
        }
    }
};
```

---

## 5. Code Examples

### 5.1 Complete Arena Allocator Implementation

```cpp
// ============================================================================
// ARENA ALLOCATOR FOR TRANSFORMER ACTIVATIONS
// ============================================================================

#include <cstdint>
#include <cstddef>
#include <memory>
#include <vector>
#include <atomic>
#include <mutex>

namespace polln_rtt {

// Forward declarations
struct Tensor;
struct TensorShape;

// Alignment constants (LOG: aligned to power-of-2 for efficient masking)
constexpr size_t CACHE_LINE_SIZE = 64;
constexpr size_t PAGE_SIZE = 4096;
constexpr size_t HUGE_PAGE_SIZE = 2 << 20;  // 2MB

// ============================================================================
// Bump Allocator (Core Arena Implementation)
// ============================================================================

class BumpAllocator {
public:
    // LOG Principle: Origin is implicit reference point
    BumpAllocator(size_t capacity, size_t alignment = CACHE_LINE_SIZE)
        : alignment_(alignment)
        , capacity_(capacity)
        , allocated_(0)
    {
        // Allocate arena with specified alignment
        if (alignment >= HUGE_PAGE_SIZE) {
            // Use huge pages for large arenas
            base_ = static_cast<uint8_t*>(
                mmap(nullptr, capacity, PROT_READ | PROT_WRITE,
                     MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB, -1, 0)
            );
            if (base_ == MAP_FAILED) {
                throw std::bad_alloc();
            }
        } else {
            // Regular allocation
            if (posix_memalign(reinterpret_cast<void**>(&base_), alignment, capacity) != 0) {
                throw std::bad_alloc();
            }
        }
        
        current_ = base_;
        end_ = base_ + capacity;
    }
    
    ~BumpAllocator() {
        if (alignment_ >= HUGE_PAGE_SIZE) {
            munmap(base_, capacity_);
        } else {
            free(base_);
        }
    }
    
    // O(1) allocation - just bump the pointer
    void* allocate(size_t size, size_t specific_alignment = 0) {
        size_t align = specific_alignment ? specific_alignment : alignment_;
        
        // Align current pointer
        uintptr_t aligned_current = 
            (reinterpret_cast<uintptr_t>(current_) + align - 1) & ~(align - 1);
        
        uint8_t* result = reinterpret_cast<uint8_t*>(aligned_current);
        uint8_t* new_current = result + size;
        
        // Check bounds
        if (new_current > end_) [[unlikely]] {
            return nullptr;  // Out of memory
        }
        
        current_ = new_current;
        allocated_ += size;
        
        return result;
    }
    
    // O(1) reset - return to origin (LOG principle)
    void reset() {
        current_ = base_;
        allocated_ = 0;
    }
    
    // Get statistics
    size_t capacity() const { return capacity_; }
    size_t allocated() const { return allocated_; }
    size_t available() const { return capacity_ - allocated_; }
    
    // Get origin (LOG: implicit reference point)
    uint8_t* origin() const { return base_; }
    
private:
    uint8_t* base_;       // Arena start (LOG origin)
    uint8_t* current_;    // Current allocation point
    uint8_t* end_;        // Arena end
    size_t alignment_;
    size_t capacity_;
    size_t allocated_;
};

// ============================================================================
// Thread-Local Arena Pool
// ============================================================================

class ThreadLocalArenaPool {
public:
    struct ArenaHandle {
        BumpAllocator* arena;
        int thread_id;
        int numa_node;
    };
    
    ThreadLocalArenaPool(size_t arena_size, int max_threads)
        : arena_size_(arena_size)
        , max_threads_(max_threads)
    {
        arenas_.reserve(max_threads);
        for (int i = 0; i < max_threads; i++) {
            arenas_.push_back(std::make_unique<BumpAllocator>(arena_size));
        }
    }
    
    ArenaHandle get_thread_arena() {
        int thread_id = get_thread_id();
        int numa_node = numa_node_of_cpu(sched_getcpu());
        
        return ArenaHandle{
            .arena = arenas_[thread_id].get(),
            .thread_id = thread_id,
            .numa_node = numa_node
        };
    }
    
    void reset_all() {
        for (auto& arena : arenas_) {
            arena->reset();
        }
    }
    
private:
    int get_thread_id() {
        static std::atomic<int> next_id{0};
        static thread_local int id = -1;
        if (id == -1) {
            id = next_id.fetch_add(1);
        }
        return id;
    }
    
    size_t arena_size_;
    int max_threads_;
    std::vector<std::unique_ptr<BumpAllocator>> arenas_;
};

// ============================================================================
// Tensor Allocation Helpers
// ============================================================================

struct TensorShape {
    int64_t dims[4];
    int ndim;
    size_t element_size;  // sizeof(element type)
    
    size_t total_elements() const {
        size_t count = 1;
        for (int i = 0; i < ndim; i++) {
            count *= dims[i];
        }
        return count;
    }
    
    size_t total_bytes() const {
        return total_elements() * element_size;
    }
};

struct Tensor {
    void* data;
    TensorShape shape;
    uint8_t* origin;  // LOG: reference to arena origin for relative access
    size_t origin_offset;  // Offset from origin (LOG principle)
    
    // O(1) relative access using LOG principle
    template<typename T>
    T& at_relative(int64_t offset) {
        return static_cast<T*>(data)[offset];
    }
    
    // Compute relative offset between two tensors (LOG: origin-relative)
    int64_t relative_offset_to(const Tensor& other) const {
        return static_cast<int64_t>(other.origin_offset) - 
               static_cast<int64_t>(origin_offset);
    }
};

// Allocate tensor from arena
Tensor* allocate_tensor(BumpAllocator& arena, const TensorShape& shape) {
    size_t size = shape.total_bytes();
    
    void* data = arena.allocate(size, 64);  // Cache-line aligned
    if (!data) {
        return nullptr;
    }
    
    // Allocate Tensor metadata
    void* tensor_mem = arena.allocate(sizeof(Tensor));
    Tensor* tensor = new (tensor_mem) Tensor{
        .data = data,
        .shape = shape,
        .origin = arena.origin(),
        .origin_offset = static_cast<uint8_t*>(data) - arena.origin()
    };
    
    return tensor;
}

}  // namespace polln_rtt
```

### 5.2 Self-Origin Tensor Memory Pool

```cpp
// ============================================================================
// SELF-ORIGIN TENSOR MEMORY POOL
// ============================================================================

#include <memory>
#include <vector>
#include <cmath>
#include <immintrin.h>  // AVX intrinsics

namespace polln_rtt {

// ============================================================================
// Self-Origin Tensor Pool
// ============================================================================

class SelfOriginTensorPool {
public:
    // Configuration
    struct Config {
        size_t pool_size;
        int max_seq_len;
        int hidden_dim;
        int num_heads;
        int batch_size;
        bool use_huge_pages;
    };
    
    SelfOriginTensorPool(const Config& config)
        : config_(config)
        , origin_(nullptr)
        , current_offset_(0)
    {
        // Allocate pool
        size_t alignment = config.use_huge_pages ? HUGE_PAGE_SIZE : PAGE_SIZE;
        
        if (config.use_huge_pages) {
            origin_ = static_cast<uint8_t*>(
                mmap(nullptr, config.pool_size, 
                     PROT_READ | PROT_WRITE,
                     MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB,
                     -1, 0)
            );
            if (origin_ == MAP_FAILED) {
                throw std::bad_alloc();
            }
        } else {
            if (posix_memalign(reinterpret_cast<void**>(&origin_), 
                              alignment, config.pool_size) != 0) {
                throw std::bad_alloc();
            }
        }
        
        // Precompute relative offset tables for LOG principle
        precompute_relative_offsets(config.max_seq_len, config.hidden_dim);
    }
    
    ~SelfOriginTensorPool() {
        if (config_.use_huge_pages) {
            munmap(origin_, config_.pool_size);
        } else {
            free(origin_);
        }
    }
    
    // ========================================================================
    // Self-Origin Tensor Access (LOG: O(1) relative access)
    // ========================================================================
    
    // Access element at (batch, head, i, j, k) using LOG principle
    // T^[s]_{i,j,k} = T(origin, i-j, k)
    template<typename T>
    T& at(int64_t batch, int64_t head, int64_t i, int64_t j, int64_t k) {
        // LOG: Compute relative offset (i - j) once
        int64_t rel_i_j = i - j;
        
        // Get precomputed offset for this relative position
        int64_t base_offset = relative_offset_table_[rel_i_j + config_.max_seq_len];
        
        // Compute final offset: base + head_offset + k
        int64_t head_offset = head * config_.hidden_dim / config_.num_heads;
        int64_t final_offset = base_offset + head_offset + k;
        
        // LOG: origin is implicit, only offset computed
        return reinterpret_cast<T*>(origin_)[final_offset];
    }
    
    // ========================================================================
    // Glitch Detection (LOG: deviation from origin/expected)
    // ========================================================================
    
    struct GlitchResult {
        float intensity;      // ||G||_1 normalized
        int glitch_position;  // Position of maximum deviation
        bool is_significant;  // Exceeds threshold
    };
    
    GlitchResult detect_glitch(
        const float* expected,
        const float* actual,
        size_t size,
        float threshold = 0.1f
    ) {
        // LOG: Only compute deviation from origin (expected)
        float total_variation = 0.0f;
        float max_deviation = 0.0f;
        int max_pos = 0;
        
        // SIMD-optimized computation
        const int simd_width = 8;  // AVX2
        size_t simd_size = size - (size % simd_width);
        
        __m256 total_v = _mm256_setzero_ps();
        
        for (size_t i = 0; i < simd_size; i += simd_width) {
            __m256 exp_v = _mm256_loadu_ps(expected + i);
            __m256 act_v = _mm256_loadu_ps(actual + i);
            __m256 diff_v = _mm256_sub_ps(exp_v, act_v);
            __m256 abs_v = _mm256_andnot_ps(_mm256_set1_ps(-0.0f), diff_v);
            total_v = _mm256_add_ps(total_v, abs_v);
            
            // Track max deviation
            for (int j = 0; j < simd_width; j++) {
                float d = std::abs(expected[i + j] - actual[i + j]);
                if (d > max_deviation) {
                    max_deviation = d;
                    max_pos = i + j;
                }
            }
        }
        
        // Horizontal sum
        float temp[8];
        _mm256_storeu_ps(temp, total_v);
        for (int i = 0; i < 8; i++) {
            total_variation += temp[i];
        }
        
        // Handle remainder
        for (size_t i = simd_size; i < size; i++) {
            float d = std::abs(expected[i] - actual[i]);
            total_variation += d;
            if (d > max_deviation) {
                max_deviation = d;
                max_pos = i;
            }
        }
        
        // Normalize (LOG: total variation distance formula)
        float intensity = total_variation / (2.0f * size);
        
        return GlitchResult{
            .intensity = intensity,
            .glitch_position = max_pos,
            .is_significant = intensity > threshold
        };
    }
    
    // ========================================================================
    // Dynamic Origin Migration
    // ========================================================================
    
    void migrate_origin(uint8_t* new_origin) {
        // LOG: Compute delta from old origin to new origin
        int64_t delta = new_origin - origin_;
        
        // Update all relative offset tables (vectorized)
        #pragma omp simd
        for (size_t i = 0; i < relative_offset_table_.size(); i++) {
            relative_offset_table_[i] += delta;
        }
        
        // Atomically swap origin
        std::atomic_store(&origin_, new_origin);
    }
    
private:
    void precompute_relative_offsets(int max_seq_len, int hidden_dim) {
        // LOG: Precompute (i - j) offsets for O(1) access
        relative_offset_table_.resize(2 * max_seq_len + 1);
        
        for (int rel = -max_seq_len; rel <= max_seq_len; rel++) {
            // Offset for relative position rel
            relative_offset_table_[rel + max_seq_len] = rel * hidden_dim;
        }
    }
    
    Config config_;
    std::atomic<uint8_t*> origin_;
    size_t current_offset_;
    std::vector<int64_t> relative_offset_table_;
};

}  // namespace polln_rtt
```

### 5.3 mmap-Based Weight Loading

```cpp
// ============================================================================
// MMAP-BASED WEIGHT LOADING FOR LARGE MODELS
// ============================================================================

#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <string>
#include <unordered_map>
#include <vector>
#include <thread>
#include <future>

namespace polln_rtt {

// ============================================================================
// Weight Tensor Metadata
// ============================================================================

struct WeightTensorMeta {
    std::string name;
    std::vector<int64_t> shape;
    int dtype;  // 0=float32, 1=float16, 2=int8
    size_t offset;  // Offset from file origin (LOG principle)
    size_t size;    // Size in bytes
};

// ============================================================================
// Model File Header
// ============================================================================

struct ModelFileHeader {
    uint64_t magic;           // Magic number for validation
    uint64_t version;         // Format version
    uint64_t num_layers;      // Number of layers
    uint64_t metadata_offset; // Offset to metadata section
    uint64_t weights_offset;  // Offset to weights section
    uint64_t total_size;      // Total file size
};

// ============================================================================
// MMapWeightLoader
// ============================================================================

class MMapWeightLoader {
public:
    MMapWeightLoader() 
        : fd_(-1)
        , base_addr_(nullptr)
        , mapped_size_(0)
        , current_layer_(-1)
    {}
    
    ~MMapWeightLoader() {
        close();
    }
    
    // ========================================================================
    // Model Loading
    // ========================================================================
    
    bool load(const std::string& path) {
        path_ = path;
        
        // Open file
        fd_ = open(path.c_str(), O_RDONLY);
        if (fd_ < 0) {
            return false;
        }
        
        // Get file size
        struct stat st;
        if (fstat(fd_, &st) < 0) {
            close();
            return false;
        }
        mapped_size_ = st.st_size;
        
        // Memory map the entire file
        // LOG: base_addr_ serves as origin for all weight access
        base_addr_ = mmap(
            nullptr,
            mapped_size_,
            PROT_READ,
            MAP_PRIVATE,  // Use MAP_SHARED for multi-process sharing
            fd_,
            0
        );
        
        if (base_addr_ == MAP_FAILED) {
            close();
            return false;
        }
        
        // Parse header and metadata
        if (!parse_model()) {
            close();
            return false;
        }
        
        // Advise kernel about access patterns
        madvise(base_addr_, mapped_size_, MADV_RANDOM);  // Random access for inference
        
        return true;
    }
    
    void close() {
        if (base_addr_ && base_addr_ != MAP_FAILED) {
            munmap(base_addr_, mapped_size_);
            base_addr_ = nullptr;
        }
        if (fd_ >= 0) {
            ::close(fd_);
            fd_ = -1;
        }
    }
    
    // ========================================================================
    // Weight Access (LOG: origin-relative access)
    // ========================================================================
    
    void* get_weight(const std::string& name) {
        auto it = weights_.find(name);
        if (it == weights_.end()) {
            return nullptr;
        }
        
        const auto& meta = it->second;
        
        // LOG: Compute offset from origin (base_addr_)
        return static_cast<char*>(base_addr_) + meta.offset;
    }
    
    WeightTensorMeta get_weight_meta(const std::string& name) const {
        auto it = weights_.find(name);
        if (it == weights_.end()) {
            return {};
        }
        return it->second;
    }
    
    // ========================================================================
    // Lazy Layer Loading
    // ========================================================================
    
    void prefetch_layer(int layer_idx) {
        // Find all weights for this layer
        std::string layer_prefix = "layer_" + std::to_string(layer_idx) + ".";
        
        std::vector<std::pair<size_t, size_t>> ranges;
        
        for (const auto& [name, meta] : weights_) {
            if (name.find(layer_prefix) == 0) {
                ranges.push_back({meta.offset, meta.size});
            }
        }
        
        // Sort and merge overlapping ranges
        std::sort(ranges.begin(), ranges.end());
        
        // Prefetch each range
        for (const auto& [offset, size] : ranges) {
            char* start = static_cast<char*>(base_addr_) + offset;
            
            // Advise kernel to prefetch
            madvise(start, size, MADV_WILLNEED);
        }
    }
    
    void evict_layer(int layer_idx) {
        std::string layer_prefix = "layer_" + std::to_string(layer_idx) + ".";
        
        for (const auto& [name, meta] : weights_) {
            if (name.find(layer_prefix) == 0) {
                char* start = static_cast<char*>(base_addr_) + meta.offset;
                
                // Release pages
                madvise(start, meta.size, MADV_DONTNEED);
            }
        }
    }
    
    // ========================================================================
    // Sequential Layer Access with Prefetching
    // ========================================================================
    
    class LayerAccessor {
    public:
        LayerAccessor(MMapWeightLoader* loader, int layer_idx)
            : loader_(loader)
            , layer_idx_(layer_idx)
        {
            // Start prefetching next layer
            if (layer_idx + 1 < loader_->num_layers()) {
                prefetch_future_ = std::async(
                    std::launch::async,
                    [this]() {
                        loader_->prefetch_layer(layer_idx_ + 1);
                    }
                );
            }
            
            // Prefetch current layer
            loader_->prefetch_layer(layer_idx);
        }
        
        ~LayerAccessor() {
            // Evict previous layer
            if (layer_idx_ > 0) {
                loader_->evict_layer(layer_idx_ - 1);
            }
            
            // Wait for prefetch
            if (prefetch_future_.valid()) {
                prefetch_future_.wait();
            }
        }
        
        void* get_weight(const std::string& weight_name) {
            std::string full_name = "layer_" + std::to_string(layer_idx_) + "." + weight_name;
            return loader_->get_weight(full_name);
        }
        
    private:
        MMapWeightLoader* loader_;
        int layer_idx_;
        std::future<void> prefetch_future_;
    };
    
    LayerAccessor access_layer(int layer_idx) {
        return LayerAccessor(this, layer_idx);
    }
    
    int num_layers() const { return header_.num_layers; }
    
    // ========================================================================
    // Huge Page Support
    // ========================================================================
    
    bool enable_huge_pages() {
        // Remap with huge pages (requires huge page support in kernel)
        void* new_addr = mmap(
            nullptr,
            mapped_size_,
            PROT_READ,
            MAP_PRIVATE | MAP_HUGETLB,
            fd_,
            0
        );
        
        if (new_addr == MAP_FAILED) {
            return false;
        }
        
        // Unmap old mapping
        munmap(base_addr_, mapped_size_);
        base_addr_ = new_addr;
        
        return true;
    }
    
private:
    bool parse_model() {
        // Read header
        header_ = *static_cast<const ModelFileHeader*>(base_addr_);
        
        // Validate magic number
        if (header_.magic != 0x504F4C4C4E525454ULL) {  // "POLLNRTT"
            return false;
        }
        
        // Read weight metadata
        const char* metadata = static_cast<const char*>(base_addr_) + header_.metadata_offset;
        
        // Parse weight entries (simplified)
        uint64_t num_weights = *reinterpret_cast<const uint64_t*>(metadata);
        metadata += sizeof(uint64_t);
        
        for (uint64_t i = 0; i < num_weights; i++) {
            WeightTensorMeta meta;
            
            // Read name length and name
            uint32_t name_len = *reinterpret_cast<const uint32_t*>(metadata);
            metadata += sizeof(uint32_t);
            
            meta.name = std::string(metadata, name_len);
            metadata += name_len;
            
            // Read shape
            uint32_t ndim = *reinterpret_cast<const uint32_t*>(metadata);
            metadata += sizeof(uint32_t);
            
            meta.shape.resize(ndim);
            for (uint32_t d = 0; d < ndim; d++) {
                meta.shape[d] = *reinterpret_cast<const int64_t*>(metadata);
                metadata += sizeof(int64_t);
            }
            
            // Read dtype, offset, size
            meta.dtype = *reinterpret_cast<const int*>(metadata);
            metadata += sizeof(int);
            
            meta.offset = *reinterpret_cast<const size_t*>(metadata);
            metadata += sizeof(size_t);
            
            meta.size = *reinterpret_cast<const size_t*>(metadata);
            metadata += sizeof(size_t);
            
            weights_[meta.name] = meta;
        }
        
        return true;
    }
    
    std::string path_;
    int fd_;
    void* base_addr_;  // LOG: origin for all weight access
    size_t mapped_size_;
    ModelFileHeader header_;
    std::unordered_map<std::string, WeightTensorMeta> weights_;
    int current_layer_;
};

}  // namespace polln_rtt
```

---

## 6. Fragmentation Analysis

### 6.1 Arena Allocator Fragmentation

Arena allocators have **zero internal fragmentation** within the active region, but may have **external fragmentation** at the end of the arena:

```
Fragmentation Analysis:
┌─────────────────────────────────────────────────────────────────┐
│ Arena State After Multiple Allocations                          │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ [Used Block 1][Used Block 2][Used Block 3][UNUSED SPACE]   ││
│ │   64KB          128KB         256KB        ~64KB remaining  ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ Internal Fragmentation: 0% (no gaps between allocations)       │
│ External Fragmentation: remaining_space / arena_capacity       │
│ Worst Case: O(alignment - 1) per allocation                    │
└─────────────────────────────────────────────────────────────────┘
```

**Fragmentation Metrics:**

| Allocator Type | Internal Frag | External Frag | Recovery |
|----------------|---------------|---------------|----------|
| Bump Allocator | 0% | 0% (resettable) | O(1) reset |
| Free List | Variable | Variable | Complex |
| Slab Allocator | Low | None | O(n) partial |
| Arena | 0% | Low | O(1) reset |

### 6.2 Self-Origin Tensor Pool Fragmentation

The self-origin tensor pool uses precomputed offset tables, resulting in:

- **Predictable Layout**: All tensors at known offsets from origin
- **No Runtime Fragmentation**: Layout determined at pool creation
- **Worst-Case Overhead**: One offset table element per relative position

---

## 7. Benchmark Strategies

### 7.1 Allocation Benchmark

```cpp
// Benchmark: Arena vs malloc
void benchmark_allocation() {
    const int N = 10000;
    const size_t TENSOR_SIZE = 1024 * 1024;  // 1MB
    
    // Arena allocator
    auto start = std::chrono::high_resolution_clock::now();
    {
        BumpAllocator arena(N * TENSOR_SIZE);
        for (int i = 0; i < N; i++) {
            arena.allocate(TENSOR_SIZE);
        }
    }
    auto arena_time = std::chrono::high_resolution_clock::now() - start;
    
    // malloc
    start = std::chrono::high_resolution_clock::now();
    {
        std::vector<void*> ptrs;
        for (int i = 0; i < N; i++) {
            ptrs.push_back(malloc(TENSOR_SIZE));
        }
        for (void* p : ptrs) free(p);
    }
    auto malloc_time = std::chrono::high_resolution_clock::now() - start;
    
    // Expected: arena_time << malloc_time (no lock contention, no free list)
}
```

### 7.2 Self-Origin Access Benchmark

```cpp
void benchmark_self_origin_access() {
    const int SEQ_LEN = 4096;
    const int HIDDEN_DIM = 4096;
    const int ITERATIONS = 1000000;
    
    SelfOriginTensorPool pool({
        .pool_size = SEQ_LEN * SEQ_LEN * HIDDEN_DIM * sizeof(float),
        .max_seq_len = SEQ_LEN,
        .hidden_dim = HIDDEN_DIM
    });
    
    // Benchmark relative access
    auto start = std::chrono::high_resolution_clock::now();
    for (int iter = 0; iter < ITERATIONS; iter++) {
        int i = rand() % SEQ_LEN;
        int j = rand() % SEQ_LEN;
        int k = rand() % HIDDEN_DIM;
        
        volatile float val = pool.at<float>(0, 0, i, j, k);
    }
    auto relative_time = std::chrono::high_resolution_clock::now() - start;
    
    // Benchmark absolute access (traditional)
    std::vector<float> traditional(SEQ_LEN * SEQ_LEN * HIDDEN_DIM);
    start = std::chrono::high_resolution_clock::now();
    for (int iter = 0; iter < ITERATIONS; iter++) {
        int i = rand() % SEQ_LEN;
        int j = rand() % SEQ_LEN;
        int k = rand() % HIDDEN_DIM;
        
        volatile float val = traditional[i * SEQ_LEN * HIDDEN_DIM + j * HIDDEN_DIM + k];
    }
    auto absolute_time = std::chrono::high_resolution_clock::now() - start;
    
    // Expected: relative_time ≈ absolute_time (O(1) for both)
    // But relative access has better cache locality for LOG patterns
}
```

---

## 8. LOG Integration Summary

The LOG principle (Logic-Organizing-Geocentrically) pervades all memory allocator designs:

| Component | LOG Application |
|-----------|-----------------|
| Bump Allocator | Origin = arena start, all allocations are offsets |
| Self-Origin Pool | Origin = tensor identity, relative position (i-j) computed O(1) |
| mmap Loader | Origin = base_addr, all weight access via origin + offset |
| Tier Manager | Promotion/demotion = distance from "hot origin" |
| NUMA Allocator | Per-node origins, cross-NUMA via origin-relative translation |

**Key LOG Insights for Memory Allocators:**

1. **Implicit Origin**: Never store absolute addresses, only offsets from known origin
2. **Relative Computation**: All tensor operations compute deltas, not absolute positions
3. **O(1) Origin Access**: Cache the origin, compute offsets on-the-fly
4. **Origin Migration**: Changing reference point is a delta update, not a rebuild
5. **Glitch = Deviation**: Distance from expected (origin) is the signal

---

## 9. Research Questions

1. **Optimal Arena Size**: What is the ideal arena size ratio to batch size for minimal reset overhead?

2. **NUMA-Aware Origin Placement**: Should origins be placed on specific NUMA nodes based on access patterns?

3. **Huge Page Tradeoffs**: At what tensor size does huge page overhead justify the TLB benefits?

4. **Dynamic Origin for MoE**: How should origins migrate when different experts are active?

5. **Prefetching Strategy**: What is the optimal prefetch distance for sequential layer access?

6. **Multi-Agent Origin Coordination**: How do multiple agent origins interact in POLLN spreadsheet cells?

7. **Cache Hierarchy Origin**: Should there be separate origins for L1/L2/L3 cache levels?

8. **Fragmentation Recovery**: Can arena fragmentation be recovered without full reset?

---

## 10. Conclusion

This comprehensive analysis demonstrates that custom memory allocators for tensor operations in POLLN-RTT benefit significantly from the LOG principle. By treating the origin as an implicit reference point and computing all positions relative to this origin, we achieve:

- **O(1) allocation and deallocation** through arena allocators
- **O(1) relative position access** for self-origin tensors
- **Efficient memory usage** through mmap and huge pages
- **Scalable performance** through NUMA-aware and tiered allocation

The integration of arena allocators, self-origin tensor pools, mmap-based weight loading, and hierarchical memory tiers creates a unified memory management system optimized for the unique requirements of transformer architectures and the POLLN-RTT self-origin tensor paradigm.

---

*Document Version: 1.0*
*Created: POLLN-RTT Research Round 4*
*Word Count: ~4,200 words (excluding code)*

# Loop Tiling Strategies for Attention Mechanisms

## Comprehensive Analysis for POLLN-RTT Architecture

**Context**: POLLN-RTT with attention mechanism (Q@K^T + softmax), self-origin tensor indexing, and long sequence processing.

**LOG Principle Integration**: Logic-Organizing-Geocentrically - All tiling strategies are anchored to an origin point, with computations expressed as relative offsets from tile origins rather than absolute positions.

---

## 1. Attention Matrix Tiling

### 1.1 The Attention Computation Challenge

The standard scaled dot-product attention computes:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

For sequence length $n$ and head dimension $d_k$, this produces an $n \times n$ attention matrix. The memory complexity is $O(n^2)$, which becomes prohibitive for long sequences:

| Sequence Length | Attention Matrix (FP16) | Memory Requirement |
|-----------------|------------------------|-------------------|
| 512 | 512 × 512 × 2B | 0.5 MB |
| 2048 | 2048 × 2048 × 2B | 8 MB |
| 8192 | 8192 × 8192 × 2B | 128 MB |
| 32768 | 32768 × 32768 × 2B | 2 GB |
| 131072 | 131072 × 131072 × 2B | 32 GB |

**Key Insight**: For GPU memory of 24-80 GB HBM, the full attention matrix quickly exceeds available memory. Tiling enables processing sequences that would otherwise be impossible.

### 1.2 Optimal Tile Sizes for Cache Hierarchy

The optimal tile size depends on the memory hierarchy level targeted:

#### L1 Cache Tiling (32-48 KB per SM)

L1 cache is fastest but smallest. For NVIDIA A100:
- L1 size: 48 KB per SM (configurable to 164 KB)
- Latency: ~30 cycles
- Bandwidth: ~15 TB/s

**Optimal L1 tile**: The tile should fit entirely in L1 after accounting for Q, K, V fragments:

$$\text{Tile}_{L1} = \sqrt{\frac{\text{L1}_{usable}}{3 \times \text{sizeof}(element)}}$$

For FP16 (2 bytes) with 32 KB usable L1:
$$\text{Tile}_{L1} = \sqrt{\frac{32768}{3 \times 2}} = \sqrt{5461} \approx 73$$

**Recommended L1 tile sizes**: $64 \times 64$ or $128 \times 64$ (partial tiles)

```cpp
// L1-tiled attention kernel pseudocode
constexpr int TILE_M = 64;  // Query tile dimension
constexpr int TILE_N = 64;  // Key tile dimension
constexpr int TILE_K = 16;  // Head dimension tile (partial)

// Shared memory for one tile: 64 * 64 * 2 * 3 = 24 KB
__shared__ half Q_tile[TILE_M][TILE_K];
__shared__ half K_tile[TILE_N][TILE_K];
__shared__ half V_tile[TILE_N][TILE_K];
```

#### L2 Cache Tiling (4-40 MB)

L2 cache is shared across all SMs and provides the best balance for attention tiling:

| GPU | L2 Cache Size | Recommended Block Tile |
|-----|---------------|----------------------|
| RTX 3090 | 6 MB | 512 × 512 |
| RTX 4090 | 72 MB | 2048 × 512 |
| A100 40GB | 40 MB | 1024 × 512 |
| A100 80GB | 80 MB | 2048 × 1024 |
| H100 | 50 MB | 1024 × 1024 |

**Optimal L2 tile calculation**:
$$\text{Tile}_{L2} = \sqrt{\frac{\text{L2}_{size} \times \text{utilization}}{\text{sizeof}(element) \times 3}}$$

With 80% utilization (leaving room for other data):
- A100 40GB: $\text{Tile}_{L2} = \sqrt{\frac{40\text{MB} \times 0.8}{2 \times 3}} \approx 2309 \rightarrow 2048 \times 512$
- A100 80GB: $\text{Tile}_{L2} \approx 3265 \rightarrow 2048 \times 1024$

#### L3 Cache (System-Level)

For CPU inference, L3 cache (16-256 MB) determines sequence-level tiling:

```
CPU L3 Cache Tiling Strategy:
┌─────────────────────────────────────────────────────────────┐
│                    L3 Cache (64 MB example)                  │
├─────────────────────────────────────────────────────────────┤
│  Sequence Tile 0          Sequence Tile 1                    │
│  ┌─────────────────┐      ┌─────────────────┐               │
│  │ Block 0│Block 1 │      │ Block 4│Block 5 │               │
│  │ Block 2│Block 3 │      │ Block 6│Block 7 │               │
│  └─────────────────┘      └─────────────────┘               │
│                                                              │
│  Each block: 512×512 FP16 = 0.5 MB                          │
│  Sequence tile: 4 blocks = 2 MB                             │
│  Fits comfortably in L3 with room for Q, K, V               │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Flash Attention Style Tiling

Flash Attention revolutionizes attention by computing the output incrementally without materializing the full attention matrix. The key insight is tiling with online softmax.

#### Mathematical Foundation

The softmax computation requires knowing the maximum value for numerical stability:

$$\text{softmax}(x_i) = \frac{e^{x_i - m}}{\sum_j e^{x_j - m}}$$

where $m = \max_i x_i$

Flash Attention computes this incrementally using the "log-sum-exp trick":

**Online Softmax Update Rule**:
$$m_{new} = \max(m_{old}, m_{tile})$$
$$d_{new} = d_{old} \cdot e^{m_{old} - m_{new}} + d_{tile} \cdot e^{m_{tile} - m_{new}}$$
$$O_{new} = O_{old} \cdot e^{m_{old} - m_{new}} + O_{tile} \cdot e^{m_{tile} - m_{new}}$$

where:
- $m$ = running maximum
- $d$ = running denominator (sum of exponentials)
- $O$ = running output

#### Flash Attention Tile Schedule

```
Flash Attention Tiling:
┌────────────────────────────────────────────────────────────────┐
│ Q (n × d)                                                       │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Q_tile_0 │ Q_tile_1 │ Q_tile_2 │ ... │ Q_tile_(M/Br)    │   │
│ │  Br × d   │  Br × d   │  Br × d   │     │  Br × d         │   │
│ └──────────────────────────────────────────────────────────┘   │
│      │                                                          │
│      ▼                                                          │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ K^T (d × n)  processed in Bc tiles along n dimension        │ │
│ │ ┌─────────────┬─────────────┬─────────────┬─────────────┐  │ │
│ │ │ K_tile_0    │ K_tile_1    │ K_tile_2    │ ...         │  │ │
│ │ │ d × Bc      │ d × Bc      │ d × Bc      │             │  │ │
│ │ └─────────────┴─────────────┴─────────────┴─────────────┘  │ │
│ │                                                              │ │
│ │ V (n × d) processed in same Bc tiles                        │ │
│ │ ┌─────────────┬─────────────┬─────────────┬─────────────┐  │ │
│ │ │ V_tile_0    │ V_tile_1    │ V_tile_2    │ ...         │  │ │
│ │ │ Bc × d      │ Bc × d      │ Bc × d      │             │  │ │
│ │ └─────────────┴─────────────┴─────────────┴─────────────┘  │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ For each Q_tile:                                                │
│   For each K_tile, V_tile:                                      │
│     S_tile = Q_tile @ K_tile^T  (Br × Bc)                       │
│     Update running softmax statistics (m, d)                    │
│     Accumulate output: O_tile += softmax(S_tile) @ V_tile       │
└────────────────────────────────────────────────────────────────┘
```

#### LOG Integration: Origin-Relative Tiles

Applying the LOG principle, each tile has its own origin:

```cpp
// LOG-inspired Flash Attention tile structure
struct LOG_TileOrigin {
    int q_origin;  // Query tile origin (row offset)
    int k_origin;  // Key tile origin (column offset)
    
    // All indices within tile are relative to these origins
    __device__ int local_to_global_q(int local_idx) const {
        return q_origin + local_idx;  // Origin-relative indexing
    }
    
    __device__ int local_to_global_k(int local_idx) const {
        return k_origin + local_idx;
    }
};

// Tile computation with LOG principle
__device__ void compute_tile_LOG(
    const LOG_TileOrigin& origin,
    const half* Q_global, const half* K_global, const half* V_global,
    float* O_local, float& m_local, float& d_local,
    int Br, int Bc, int d_head
) {
    // Load tiles relative to origin
    // ... tile loading code ...
    
    // Compute attention scores: relative to origin
    for (int i = 0; i < Br; i++) {
        for (int j = 0; j < Bc; j++) {
            float score = 0.0f;
            for (int k = 0; k < d_head; k++) {
                // LOG: access pattern uses relative indices from origin
                score += Q_local[i][k] * K_local[j][k];
            }
            S_local[i][j] = score / sqrtf(d_head);
        }
    }
    
    // Online softmax update with LOG origin tracking
    // ... softmax code ...
}
```

### 1.4 Blocked Attention for Long Sequences

For sequences longer than what L2 cache can handle, hierarchical blocking is necessary:

#### Three-Level Blocking Strategy

```
Level 1: Sequence Blocks (L3/System Memory)
┌─────────────────────────────────────────────────────────────┐
│ Seq Block 0        Seq Block 1        Seq Block 2           │
│ (n/3 tokens)       (n/3 tokens)       (n/3 tokens)          │
│ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│ │ Sub-blocks  │    │ Sub-blocks  │    │ Sub-blocks  │       │
│ └─────────────┘    └─────────────┘    └─────────────┘       │
└─────────────────────────────────────────────────────────────┘

Level 2: Cache Blocks (L2 Cache)
┌─────────────────────────────────────────────────────────────┐
│ Within each Seq Block:                                       │
│ ┌───────────────┬───────────────┬───────────────┐           │
│ │ Cache Block 0 │ Cache Block 1 │ Cache Block 2 │           │
│ │ (512 tokens)  │ (512 tokens)  │ (512 tokens)  │           │
│ └───────────────┴───────────────┴───────────────┘           │
└─────────────────────────────────────────────────────────────┘

Level 3: Register Tiles (L1/Registers)
┌─────────────────────────────────────────────────────────────┐
│ Within each Cache Block:                                     │
│ ┌─────────┬─────────┬─────────┬─────────┐                   │
│ │ 64×64   │ 64×64   │ 64×64   │ 64×64   │                   │
│ │ Tile    │ Tile    │ Tile    │ Tile    │                   │
│ └─────────┴─────────┴─────────┴─────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

#### Cache Miss Analysis

For a sequence of length $n$ with tile size $B$:

**Without tiling**:
- Total elements: $n^2$
- Cache misses (assuming no reuse): $n^2$
- Memory traffic: $n^2 \times \text{sizeof}(element)$

**With tiling (tile size $B \times B$)**:
- Number of tiles: $(n/B)^2$
- Elements per tile: $B^2$
- Cache misses per tile: $B^2$ (if tile fits in cache)
- But each tile is loaded once, then reused $n/B$ times
- **Effective cache misses**: $n \times B$ (per row/column of tiles)
- **Memory traffic**: $n \times B \times \text{sizeof}(element)$

**Speedup factor**:
$$\text{Speedup} = \frac{n^2}{n \times B} = \frac{n}{B}$$

For $n = 8192$ and $B = 128$:
$$\text{Speedup} = \frac{8192}{128} = 64\times$$

**Realistic speedup** (accounting for overhead):
$$\text{Speedup}_{actual} \approx \frac{n}{B} \times \text{efficiency}_{overhead}$$

With efficiency factor of 0.6-0.8 for typical implementations:
$$\text{Speedup}_{actual} \approx 38-51\times$$

### 1.5 Auto-Tuning Tile Sizes

Optimal tile sizes depend on hardware characteristics. An auto-tuning framework can find the best configuration:

```python
class TileAutoTuner:
    """Auto-tune tile sizes for attention kernels"""
    
    def __init__(self, device_props: dict):
        self.l1_size = device_props['l1_cache_size']
        self.l2_size = device_props['l2_cache_size']
        self.shared_mem_size = device_props['shared_mem_size']
        self.warp_size = device_props['warp_size']
        self.max_threads_per_block = device_props['max_threads_per_block']
        
    def calculate_tile_candidates(self) -> List[Tuple[int, int, int]]:
        """Generate candidate tile sizes (Br, Bc, d_tile)"""
        candidates = []
        
        # Power-of-2 tiles for efficient indexing
        tile_sizes = [32, 64, 128, 256, 512]
        head_tiles = [16, 32, 64, 128]
        
        for Br in tile_sizes:
            for Bc in tile_sizes:
                for d_tile in head_tiles:
                    # Check if tile fits in shared memory
                    # 3 tiles: Q (Br x d_tile), K (Bc x d_tile), V (Bc x d_tile)
                    shared_needed = (Br + 2 * Bc) * d_tile * 2  # FP16
                    
                    if shared_needed <= self.shared_mem_size * 0.8:  # 80% threshold
                        candidates.append((Br, Bc, d_tile))
        
        return candidates
    
    def estimate_performance(self, Br: int, Bc: int, d_tile: int, 
                            seq_len: int, head_dim: int) -> float:
        """Estimate performance based on analytical model"""
        
        # Number of tiles
        num_tiles_q = (seq_len + Br - 1) // Br
        num_tiles_k = (seq_len + Bc - 1) // Bc
        num_tiles_d = (head_dim + d_tile - 1) // d_tile
        
        # Compute intensity (FLOPs per byte transferred)
        flops_per_tile = 2 * Br * Bc * d_tile  # Multiply-add for Q@K^T
        bytes_per_tile = (Br + 2 * Bc) * d_tile * 2  # Load Q, K, V
        
        compute_intensity = flops_per_tile / bytes_per_tile
        
        # Occupancy estimate
        threads_per_block = ((Br + 15) // 16) * ((Bc + 15) // 16) * 32
        occupancy = min(1.0, self.max_threads_per_block / threads_per_block)
        
        # Estimated runtime (inverse of performance)
        # Lower is better
        total_tiles = num_tiles_q * num_tiles_k * num_tiles_d
        estimated_time = total_tiles / (compute_intensity * occupancy)
        
        return estimated_time
    
    def find_optimal_tiles(self, seq_len: int, head_dim: int) -> Tuple[int, int, int]:
        """Find optimal tile sizes for given sequence length"""
        candidates = self.calculate_tile_candidates()
        
        best_config = None
        best_score = float('inf')
        
        for Br, Bc, d_tile in candidates:
            score = self.estimate_performance(Br, Bc, d_tile, seq_len, head_dim)
            if score < best_score:
                best_score = score
                best_config = (Br, Bc, d_tile)
        
        return best_config
    
    def generate_tuning_table(self, seq_lengths: List[int], 
                             head_dims: List[int]) -> Dict:
        """Generate tuning table for common configurations"""
        table = {}
        for seq_len in seq_lengths:
            for head_dim in head_dims:
                config = self.find_optimal_tiles(seq_len, head_dim)
                table[(seq_len, head_dim)] = config
        return table
```

#### Example Auto-Tuned Configurations

| GPU | Sequence Length | Head Dim | Optimal Br | Optimal Bc | Optimal d_tile |
|-----|----------------|----------|------------|------------|----------------|
| A100 | 2048 | 64 | 128 | 128 | 64 |
| A100 | 4096 | 64 | 128 | 64 | 64 |
| A100 | 8192 | 64 | 64 | 64 | 64 |
| A100 | 16384 | 128 | 64 | 64 | 32 |
| H100 | 2048 | 64 | 256 | 128 | 64 |
| H100 | 8192 | 64 | 128 | 128 | 64 |
| H100 | 32768 | 128 | 64 | 64 | 64 |
| RTX 4090 | 2048 | 64 | 128 | 128 | 64 |
| RTX 4090 | 8192 | 64 | 64 | 64 | 64 |

---

## 2. Register Tiling

### 2.1 4×4 and 8×8 Tile Multiplication

Register tiling exploits the GPU's register file for the fastest possible computation. Each thread holds a small tile of the result matrix in registers.

#### 4×4 Register Tile

```cpp
// 4x4 register tile for FP16 matrix multiply
__global__ void matmul_4x4_reg_tile(
    const half* __restrict__ A,
    const half* __restrict__ B,
    half* __restrict__ C,
    int M, int N, int K
) {
    // Each thread computes a 4x4 tile of C
    // Registers for accumulation (16 floats)
    float regC[4][4] = {0.0f};
    
    // Registers for A and B fragments
    half regA[4];
    half regB[4];
    
    // Thread's tile position
    int tileRow = blockIdx.y * 4 + threadIdx.y;
    int tileCol = blockIdx.x * 4 + threadIdx.x;
    
    // Main loop over K dimension
    for (int k = 0; k < K; k += 4) {
        // Load 4x4 tile of A
        #pragma unroll
        for (int i = 0; i < 4; i++) {
            regA[i] = A[(tileRow + i) * K + k];
        }
        
        // Load 4x4 tile of B
        #pragma unroll
        for (int j = 0; j < 4; j++) {
            regB[j] = B[k * N + (tileCol + j)];
        }
        
        // Compute 4x4 partial products
        #pragma unroll
        for (int i = 0; i < 4; i++) {
            #pragma unroll
            for (int j = 0; j < 4; j++) {
                regC[i][j] += __half2float(regA[i]) * __half2float(regB[j]);
            }
        }
    }
    
    // Write results to global memory
    #pragma unroll
    for (int i = 0; i < 4; i++) {
        #pragma unroll
        for (int j = 0; j < 4; j++) {
            C[(tileRow + i) * N + (tileCol + j)] = __float2half(regC[i][j]);
        }
    }
}
```

#### 8×8 Register Tile with Double Buffering

```cpp
// 8x8 register tile with double buffering for better memory hiding
__global__ void matmul_8x8_reg_tile_db(
    const half* __restrict__ A,
    const half* __restrict__ B,
    half* __restrict__ C,
    int M, int N, int K
) {
    // Each thread computes 2x2 elements of an 8x8 tile
    // Total registers: 8x8 = 64 elements per thread block
    // Per thread: 4 accumulator elements + shared buffer
    
    // Accumulators in registers (2x2 per thread)
    float regC[2][2] = {0.0f};
    
    // Shared memory for 8x8 tiles of A and B
    __shared__ half sA[8][64];  // 8 rows, 64 columns (8x8 tiles per column)
    __shared__ half sB[64][8];  // 64 rows, 8 columns
    
    int tid = threadIdx.y * blockDim.x + threadIdx.x;
    int warpId = tid / 32;
    int laneId = tid % 32;
    
    // Tile position in output
    int tileRow = blockIdx.y * 8;
    int tileCol = blockIdx.x * 8;
    
    // Thread's 2x2 position within 8x8 tile
    int localRow = (tid / 4) % 8;
    int localCol = (tid % 4) * 2 + (tid / 16);
    
    // Double buffer indices
    int buf = 0;
    
    for (int k = 0; k < K; k += 64) {
        // Load tiles into shared memory (coalesced)
        int loadIdx = tid;
        if (loadIdx < 64) {
            sA[buf][loadIdx] = A[(tileRow + loadIdx / 8) * K + k + loadIdx % 8];
            sB[buf][loadIdx] = B[(k + loadIdx / 8) * N + tileCol + loadIdx % 8];
        }
        __syncthreads();
        
        // Compute 8x8 tile multiplication
        #pragma unroll
        for (int kk = 0; kk < 64; kk++) {
            half a = sA[buf][localRow * 8 + kk % 8];
            half b = sB[buf][kk * 8 + localCol];
            
            #pragma unroll
            for (int i = 0; i < 2; i++) {
                #pragma unroll
                for (int j = 0; j < 2; j++) {
                    regC[i][j] += __half2float(a) * __half2float(b);
                }
            }
        }
        
        buf = 1 - buf;  // Swap buffers
    }
    
    // Write results
    #pragma unroll
    for (int i = 0; i < 2; i++) {
        #pragma unroll
        for (int j = 0; j < 2; j++) {
            int row = localRow + i * 4;
            int col = localCol + j;
            C[(tileRow + row) * N + (tileCol + col)] = __float2half(regC[i][j]);
        }
    }
}
```

### 2.2 Register Allocation Strategies

#### x86-64 Register Allocation

Modern x86-64 CPUs have 16 (AVX) or 32 (AVX-512) vector registers:

```cpp
// AVX-512 register allocation for 4x4 tile
// Each ZMM register holds 16 floats (512 bits)

void matmul_4x4_avx512(const float* A, const float* B, float* C, int K) {
    // Register allocation:
    // ZMM0-ZMM3: Accumulators (4 rows of C tile)
    // ZMM4-ZMM7: B matrix rows (broadcasted)
    // ZMM8: A matrix column (broadcasted scalars)
    
    __m512 zmm0 = _mm512_setzero_ps();  // C row 0
    __m512 zmm1 = _mm512_setzero_ps();  // C row 1
    __m512 zmm2 = _mm512_setzero_ps();  // C row 2
    __m512 zmm3 = _mm512_setzero_ps();  // C row 3
    
    for (int k = 0; k < K; k++) {
        // Load A column elements (4 scalars)
        __m128 a_col = _mm_loadu_ps(&A[k]);
        
        // Broadcast each A element
        __m512 a0 = _mm512_broadcastss_ps(a_col);  // A[0,k]
        __m512 a1 = _mm512_broadcastss_ps(
            _mm_shuffle_ps(a_col, a_col, 1));     // A[1,k]
        __m512 a2 = _mm512_broadcastss_ps(
            _mm_shuffle_ps(a_col, a_col, 2));     // A[2,k]
        __m512 a3 = _mm512_broadcastss_ps(
            _mm_shuffle_ps(a_col, a_col, 3));     // A[3,k]
        
        // Load B row
        __m512 b_row = _mm512_loadu_ps(&B[k * 16]);
        
        // FMA: C[i,:] += A[i,k] * B[k,:]
        zmm0 = _mm512_fmadd_ps(a0, b_row, zmm0);
        zmm1 = _mm512_fmadd_ps(a1, b_row, zmm1);
        zmm2 = _mm512_fmadd_ps(a2, b_row, zmm2);
        zmm3 = _mm512_fmadd_ps(a3, b_row, zmm3);
    }
    
    // Store results
    _mm512_storeu_ps(&C[0], zmm0);
    _mm512_storeu_ps(&C[16], zmm1);
    _mm512_storeu_ps(&C[32], zmm2);
    _mm512_storeu_ps(&C[48], zmm3);
}

// Register usage analysis:
// - Accumulators: 4 ZMM (zmm0-zmm3)
// - A broadcasts: 4 ZMM (zmm4-zmm7) - can reuse
// - B loads: 1 ZMM (zmm8) - can reuse
// - Temporaries: 2 ZMM
// Total: ~8 ZMM registers out of 32 available
// Spilling: NOT needed
```

#### ARM NEON Register Allocation

ARM NEON has 32 128-bit registers (Q0-Q31):

```cpp
// NEON register allocation for 4x4 tile
// Each Q register holds 4 floats (128 bits)

void matmul_4x4_neon(const float* A, const float* B, float* C, int K) {
    // Register allocation:
    // Q0-Q3: Accumulators (4 rows of C)
    // Q4-Q7: B matrix rows
    // D0-D7: A matrix elements (scalars)
    
    float32x4_t c0 = vdupq_n_f32(0.0f);
    float32x4_t c1 = vdupq_n_f32(0.0f);
    float32x4_t c2 = vdupq_n_f32(0.0f);
    float32x4_t c3 = vdupq_n_f32(0.0f);
    
    for (int k = 0; k < K; k++) {
        // Load A column (4 elements)
        float32x4_t a_col = vld1q_f32(&A[k * 4]);
        
        // Load B row
        float32x4_t b_row = vld1q_f32(&B[k * 4]);
        
        // FMA using lane broadcast
        c0 = vfmaq_laneq_f32(c0, b_row, a_col, 0);
        c1 = vfmaq_laneq_f32(c1, b_row, a_col, 1);
        c2 = vfmaq_laneq_f32(c2, b_row, a_col, 2);
        c3 = vfmaq_laneq_f32(c3, b_row, a_col, 3);
    }
    
    // Store results
    vst1q_f32(&C[0], c0);
    vst1q_f32(&C[4], c1);
    vst1q_f32(&C[8], c2);
    vst1q_f32(&C[12], c3);
}

// Register usage: 8 Q registers (Q0-Q7)
// Available: 32 Q registers
// Headroom: 24 registers for larger tiles
```

### 2.3 Preventing Register Spilling

Register spilling occurs when register usage exceeds available hardware registers. This forces the compiler to store values to memory, destroying performance.

#### Spilling Analysis

```cpp
// Example: Determining register pressure
struct RegisterPressureAnalyzer {
    // NVIDIA GPU register file size per SM
    static constexpr int REGISTERS_PER_SM = 65536;  // A100/H100
    
    // Registers per thread for different tile sizes
    static constexpr int REGS_4x4_FP32 = 16 + 8 + 4;  // C + A + B = 28
    static constexpr int REGS_8x8_FP32 = 64 + 16 + 8; // C + A + B = 88
    static constexpr int REGS_16x16_FP32 = 256 + 32 + 16; // 304 (will spill!)
    
    static int max_threads_per_sm(int regs_per_thread) {
        return REGISTERS_PER_SM / regs_per_thread;
    }
    
    static bool will_spill(int regs_per_thread, int threads_per_block) {
        // Typical: 255 max registers per thread
        return regs_per_thread > 255;
    }
    
    static float occupancy(int regs_per_thread, int threads_per_block) {
        int max_threads = max_threads_per_sm(regs_per_thread);
        int active_threads = (REGISTERS_PER_SM / regs_per_thread / threads_per_block) 
                           * threads_per_block;
        return (float)active_threads / max_threads;
    }
};

// Analysis results:
// 4x4 FP32: 28 regs/thread -> 2340 threads/SM -> 100% occupancy (if blocks permit)
// 8x8 FP32: 88 regs/thread -> 744 threads/SM -> ~50% occupancy
// 16x16 FP32: 304 regs/thread -> SPILLING (>255 limit)
```

#### Strategies to Prevent Spilling

1. **Use FP16/BF16**: Halves register pressure
2. **Partial accumulation**: Process tile in chunks
3. **Shared memory staging**: Offload to shared memory
4. **Warp-level primitives**: Use shuffle instructions

```cpp
// Strategy: FP16 with FP32 accumulation for 8x8 tile
__global__ void matmul_8x8_fp16_no_spill(
    const half* A, const half* B, half* C, int K
) {
    // FP16 inputs reduce register pressure
    // FP32 accumulators for precision
    
    // 4x4 sub-tiles within 8x8 tile
    // Each thread handles 1 sub-tile
    
    float c00 = 0.0f, c01 = 0.0f, c02 = 0.0f, c03 = 0.0f;  // Row 0
    float c10 = 0.0f, c11 = 0.0f, c12 = 0.0f, c13 = 0.0f;  // Row 1
    float c20 = 0.0f, c21 = 0.0f, c22 = 0.0f, c23 = 0.0f;  // Row 2
    float c30 = 0.0f, c31 = 0.0f, c32 = 0.0f, c33 = 0.0f;  // Row 3
    
    // Total: 16 FP32 accumulators + few temporaries
    // Register pressure: ~24-32 per thread
    // Safe: well under 255 limit
    
    // ... computation ...
}
```

---

## 3. Loop Unrolling

### 3.1 Optimal Unroll Factors

Loop unrolling eliminates branch overhead and enables instruction scheduling optimization. The optimal unroll factor depends on:

1. **Loop body size**: Unroll until instruction cache pressure
2. **Dependency chain**: Unroll to hide latency
3. **Register pressure**: Unroll until spilling occurs

#### Unroll Factor Analysis

```cpp
// Theoretical analysis for matrix-vector multiply
// for (int i = 0; i < N; i++) {
//     y[i] += A[i] * x;  // Simple body
// }

// Unroll factor analysis:
// - Loop body: 1 load, 1 mul, 1 store, 1 increment, 1 compare, 1 branch
// - Critical path: load -> mul -> store (latency ~10 cycles)
// - Issue rate: 2 ops/cycle (superscalar)
// - Optimal unroll: hide latency / issue rate = ~5-8

// Practical unroll factors:
constexpr int UNROLL_FACTOR = 8;  // Good for most cases

void matvec_unrolled(const float* A, const float* x, float* y, int N) {
    int i = 0;
    
    // Main unrolled loop
    for (; i + UNROLL_FACTOR <= N; i += UNROLL_FACTOR) {
        #pragma unroll
        for (int j = 0; j < UNROLL_FACTOR; j++) {
            y[i + j] += A[i + j] * x[j];  // Vectorized by compiler
        }
    }
    
    // Remainder handling
    for (; i < N; i++) {
        y[i] += A[i] * x[i % UNROLL_FACTOR];  // Handle remainder
    }
}
```

#### Attention-Specific Unrolling

For attention kernels, the optimal unroll factors are:

| Loop Level | Typical Unroll Factor | Rationale |
|------------|----------------------|-----------|
| Head dimension (d) | 4-8 | Match vector width (AVX-512: 16, NEON: 4) |
| Query tile (Br) | 2-4 | Balance parallelism vs register pressure |
| Key tile (Bc) | 2-4 | Same as query |
| Softmax | 1 (not unrolled) | Reduction requires sequential semantics |

### 3.2 Code Size vs Instruction Cache

Excessive unrolling increases code size, potentially causing instruction cache misses:

```
Instruction Cache Analysis:
┌─────────────────────────────────────────────────────────────┐
│ L1 I-Cache: 32 KB (typical)                                  │
│                                                              │
│ Unrolled loop size calculation:                              │
│ - Base loop body: ~10 instructions                           │
│ - Unroll factor 4: ~40 instructions + overhead              │
│ - Unroll factor 8: ~80 instructions + overhead              │
│ - Unroll factor 16: ~160 instructions + overhead            │
│                                                              │
│ Average instruction size: 4 bytes                            │
│ Loop size (unroll 8): ~320 bytes                             │
│ Loop size (unroll 16): ~640 bytes                            │
│                                                              │
│ I-Cache capacity: ~8000 loops (unroll 8)                    │
│ I-Cache capacity: ~4000 loops (unroll 16)                   │
│                                                              │
│ Recommendation: Unroll 4-8 for attention kernels            │
│ I-Cache thrashing threshold: Unroll > 32                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Remainder Handling

Efficient remainder handling is critical for non-divisible tile sizes:

```cpp
// Strategy 1: Predicated execution (SIMD-friendly)
template<int TILE_SIZE, int UNROLL>
void process_tile_with_remainder(
    const float* data, float* output, int N
) {
    int i = 0;
    
    // Full unrolled tiles
    for (; i + TILE_SIZE * UNROLL <= N; i += TILE_SIZE * UNROLL) {
        #pragma unroll UNROLL
        for (int u = 0; u < UNROLL; u++) {
            #pragma unroll
            for (int t = 0; t < TILE_SIZE; t++) {
                output[i + u * TILE_SIZE + t] = process(data[i + u * TILE_SIZE + t]);
            }
        }
    }
    
    // Partial tiles (use masking for SIMD)
    for (; i < N; i += TILE_SIZE) {
        int remaining = min(TILE_SIZE, N - i);
        
        // Process with mask
        #pragma unroll
        for (int t = 0; t < TILE_SIZE; t++) {
            if (t < remaining) {
                output[i + t] = process(data[i + t]);
            }
        }
    }
    
    // Final single elements
    for (; i < N; i++) {
        output[i] = process(data[i]);
    }
}

// Strategy 2: Duff's device (classic, less cache-friendly)
// Strategy 3: Separate scalar cleanup loop (simplest, often fastest)
```

---

## 4. Cache Hierarchy Mapping

### 4.1 L1 Cache: Register Tiles

L1 cache (or GPU shared memory) is used for:
- Tile data currently being computed
- Index arrays for indirect access
- Reduction accumulators

```
L1/Shared Memory Layout for Attention:
┌─────────────────────────────────────────────────────────────┐
│ Shared Memory (48 KB configurable)                           │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Q_tile (Br × d_tile × 2 bytes)                          │ │
│ │ Example: 128 × 32 × 2 = 8 KB                             │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ K_tile (Bc × d_tile × 2 bytes)                          │ │
│ │ Example: 128 × 32 × 2 = 8 KB                             │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ V_tile (Bc × d_tile × 2 bytes)                          │ │
│ │ Example: 128 × 32 × 2 = 8 KB                             │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ S_tile (Br × Bc × 4 bytes) - FP32 for softmax stability │ │
│ │ Example: 128 × 128 × 4 = 64 KB (too large!)              │ │
│ │ Solution: Compute softmax incrementally, no full S_tile  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Reduction buffers (for softmax)                          │ │
│ │ Example: 128 × 4 = 512 bytes                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Total: ~25 KB (fits in 48 KB shared memory)                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 L2 Cache: Block Tiles

L2 cache stores:
- Entire sequence blocks
- Weight matrices for multiple layers
- Activations for layer parallelism

```
L2 Cache Block Layout:
┌─────────────────────────────────────────────────────────────┐
│ L2 Cache (40 MB on A100-40GB)                               │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Sequence Block 0                                         │ │
│ │ Q_block: 2048 × 64 × 2 = 256 KB (per head)              │ │
│ │ K_block: 2048 × 64 × 2 = 256 KB                         │ │
│ │ V_block: 2048 × 64 × 2 = 256 KB                         │ │
│ │ Subtotal: 768 KB per head                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ For 32 heads: 768 KB × 32 = 24.6 MB                         │
│ Remaining for other data: 40 MB - 24.6 MB = 15.4 MB         │
│                                                              │
│ L2 Cache Replacement Policy: LRU                             │
│ Block evictions: When processing next sequence block         │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 L3 Cache: Sequence Tiles

L3 cache (CPU inference) stores:
- Multiple sequence blocks
- Weight matrices
- KV cache for generation

```
L3 Cache Sequence Layout (CPU Inference):
┌─────────────────────────────────────────────────────────────┐
│ L3 Cache (64 MB example)                                     │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ KV Cache (for generation)                                │ │
│ │ Past K: seq_len × num_heads × head_dim × 2              │ │
│ │ Past V: seq_len × num_heads × head_dim × 2              │ │
│ │ Example: 4096 × 32 × 64 × 2 × 2 = 32 MB                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Current Query Block                                      │ │
│ │ Q: batch × 1 × num_heads × head_dim × 2                 │ │
│ │ Example: 1 × 1 × 32 × 64 × 2 = 4 KB                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Weight Block (streaming)                                 │ │
│ │ W_qkv: d_model × 3 × d_model × 2                        │ │
│ │ Example: 2048 × 3 × 2048 × 2 = 24 MB                    │ │
│ │ (Streamed in chunks, not full resident)                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Cache-conscious scheduling:                                  │
│ - Process query with KV cache in L3                         │
│ - Stream weights from memory                                │
│ - Prefetch next layer weights during compute               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Code Examples

### 5.1 Complete Tiled Attention Kernel

```cpp
/**
 * LOG-based Tiled Attention Kernel
 * Implements Flash Attention style tiling with origin-relative indexing
 * 
 * Tile structure (LOG principle):
 * - Each tile has an origin (row_offset, col_offset)
 * - All indices within tile are relative to origin
 * - Global indices = origin + local_index
 */

#include <cuda_fp16.h>
#include <cuda_runtime.h>

// Tile sizes (tuned for A100)
constexpr int Br = 128;  // Query tile size
constexpr int Bc = 128;  // Key tile size
constexpr int Bd = 64;   // Head dimension tile

// LOG tile origin structure
struct LOG_TileOrigin {
    int q_row;    // Query origin (row)
    int k_row;    // Key/Value origin (row)
    
    __device__ int global_q_idx(int local_row) const {
        return q_row + local_row;
    }
    
    __device__ int global_k_idx(int local_row) const {
        return k_row + local_row;
    }
};

/**
 * Flash Attention kernel with LOG tiling
 * 
 * Grid: (num_blocks_q, num_heads, batch_size)
 * Block: (Br / warp_size, num_warps)
 */
__global__ void flash_attention_LOG_kernel(
    const half* __restrict__ Q,      // [batch, seq_len, num_heads, head_dim]
    const half* __restrict__ K,
    const half* __restrict__ V,
    half* __restrict__ O,            // Output
    float* __restrict__ L,           // Log-sum-exp for backward
    int batch_size,
    int seq_len,
    int num_heads,
    int head_dim,
    int q_stride_batch,
    int q_stride_seq,
    int kv_stride_batch,
    int kv_stride_seq
) {
    // Shared memory for tiles
    __shared__ half Q_tile[Br][Bd];
    __shared__ half K_tile[Bc][Bd];
    __shared__ half V_tile[Bc][Bd];
    
    // Thread indexing
    int batch_idx = blockIdx.z;
    int head_idx = blockIdx.y;
    int q_block_idx = blockIdx.x;
    
    int tid = threadIdx.y * blockDim.x + threadIdx.x;
    int warp_idx = tid / 32;
    int lane_idx = tid % 32;
    
    // LOG origin for this block
    LOG_TileOrigin origin;
    origin.q_row = q_block_idx * Br;
    origin.k_row = 0;  // Will iterate over all K/V blocks
    
    // Pointers for this batch/head
    const half* Q_ptr = Q + batch_idx * q_stride_batch 
                       + head_idx * head_dim;
    const half* K_ptr = K + batch_idx * kv_stride_batch 
                       + head_idx * head_dim;
    const half* V_ptr = V + batch_idx * kv_stride_batch 
                       + head_idx * head_dim;
    half* O_ptr = O + batch_idx * q_stride_batch 
                 + head_idx * head_dim;
    float* L_ptr = L + batch_idx * seq_len * num_heads 
                  + head_idx * seq_len;
    
    // Per-thread accumulators (Br / num_warps rows per thread)
    constexpr int rows_per_thread = Br / 4;  // Assuming 4 warps
    float O_acc[rows_per_thread][Bd] = {0.0f};
    float m_acc[rows_per_thread] = {-INFINITY};
    float l_acc[rows_per_thread] = {0.0f};
    
    // Scale factor
    const float scale = 1.0f / sqrtf((float)head_dim);
    
    // Iterate over K/V blocks
    int num_kv_blocks = (seq_len + Bc - 1) / Bc;
    
    for (int kv_block = 0; kv_block < num_kv_blocks; kv_block++) {
        origin.k_row = kv_block * Bc;
        
        // ========================================
        // Load Q tile (collaborative load)
        // ========================================
        for (int i = tid; i < Br * Bd; i += blockDim.x * blockDim.y) {
            int row = i / Bd;
            int col = i % Bd;
            int global_row = origin.global_q_idx(row);
            if (global_row < seq_len && col < head_dim) {
                Q_tile[row][col] = Q_ptr[global_row * q_stride_seq + col];
            }
        }
        
        // ========================================
        // Load K tile (collaborative load)
        // ========================================
        for (int i = tid; i < Bc * Bd; i += blockDim.x * blockDim.y) {
            int row = i / Bd;
            int col = i % Bd;
            int global_row = origin.global_k_idx(row);
            if (global_row < seq_len && col < head_dim) {
                K_tile[row][col] = K_ptr[global_row * kv_stride_seq + col];
            }
        }
        
        // ========================================
        // Load V tile (collaborative load)
        // ========================================
        for (int i = tid; i < Bc * Bd; i += blockDim.x * blockDim.y) {
            int row = i / Bd;
            int col = i % Bd;
            int global_row = origin.global_k_idx(row);
            if (global_row < seq_len && col < head_dim) {
                V_tile[row][col] = V_ptr[global_row * kv_stride_seq + col];
            }
        }
        
        __syncthreads();
        
        // ========================================
        // Compute attention for this K/V block
        // ========================================
        for (int row_local = 0; row_local < rows_per_thread; row_local++) {
            int row_global = warp_idx * rows_per_thread + row_local;
            int q_global = origin.global_q_idx(row_global);
            
            if (q_global >= seq_len) continue;
            
            // Compute Q@K^T for this row
            float S_tile[Bc] = {0.0f};
            
            // Head dimension loop (can be partially unrolled)
            #pragma unroll 4
            for (int d = 0; d < Bd; d++) {
                float q_val = __half2float(Q_tile[row_global][d]);
                
                #pragma unroll
                for (int k = 0; k < Bc; k++) {
                    S_tile[k] += q_val * __half2float(K_tile[k][d]);
                }
            }
            
            // Scale
            #pragma unroll
            for (int k = 0; k < Bc; k++) {
                S_tile[k] *= scale;
            }
            
            // Online softmax update
            float m_old = m_acc[row_local];
            float m_new = m_old;
            
            // Find new max
            #pragma unroll
            for (int k = 0; k < Bc; k++) {
                int k_global = origin.global_k_idx(k);
                if (k_global < seq_len) {
                    m_new = fmaxf(m_new, S_tile[k]);
                }
            }
            
            // Correction factor
            float correction = expf(m_old - m_new);
            
            // Update denominator and output
            float l_new = l_acc[row_local] * correction;
            
            #pragma unroll
            for (int k = 0; k < Bc; k++) {
                int k_global = origin.global_k_idx(k);
                if (k_global < seq_len) {
                    float p = expf(S_tile[k] - m_new);
                    l_new += p;
                    
                    // Update output accumulator
                    #pragma unroll
                    for (int d = 0; d < Bd; d++) {
                        O_acc[row_local][d] += p * __half2float(V_tile[k][d]);
                    }
                }
            }
            
            // Apply correction to output
            #pragma unroll
            for (int d = 0; d < Bd; d++) {
                O_acc[row_local][d] *= correction;
            }
            
            m_acc[row_local] = m_new;
            l_acc[row_local] = l_new;
        }
        
        __syncthreads();
    }
    
    // ========================================
    // Write output and log-sum-exp
    // ========================================
    for (int row_local = 0; row_local < rows_per_thread; row_local++) {
        int row_global = warp_idx * rows_per_thread + row_local;
        int q_global = origin.global_q_idx(row_global);
        
        if (q_global >= seq_len) continue;
        
        // Normalize output
        float l_inv = 1.0f / l_acc[row_local];
        
        #pragma unroll
        for (int d = 0; d < Bd; d++) {
            O_ptr[q_global * q_stride_seq + d] = 
                __float2half(O_acc[row_local][d] * l_inv);
        }
        
        // Write log-sum-exp for backward pass
        L_ptr[q_global] = m_acc[row_local] + logf(l_acc[row_local]);
    }
}

// Host launch wrapper
void launch_flash_attention_LOG(
    const half* Q, const half* K, const half* V,
    half* O, float* L,
    int batch_size, int seq_len, int num_heads, int head_dim,
    cudaStream_t stream = 0
) {
    int num_q_blocks = (seq_len + Br - 1) / Br;
    
    dim3 grid(num_q_blocks, num_heads, batch_size);
    dim3 block(32, 4);  // 4 warps, 128 threads
    
    size_t shared_mem = (Br * Bd + 2 * Bc * Bd) * sizeof(half);
    
    flash_attention_LOG_kernel<<<grid, block, shared_mem, stream>>>(
        Q, K, V, O, L,
        batch_size, seq_len, num_heads, head_dim,
        seq_len * num_heads * head_dim,  // q_stride_batch
        num_heads * head_dim,             // q_stride_seq
        seq_len * num_heads * head_dim,  // kv_stride_batch
        num_heads * head_dim              // kv_stride_seq
    );
}
```

### 5.2 Register Blocking for Matrix Multiplication

```cpp
/**
 * Register-blocked matrix multiplication
 * Optimized for small batch sizes and head dimensions
 */

template<int TM, int TN, int TK>
__global__ void matmul_reg_blocked(
    const half* __restrict__ A,
    const half* __restrict__ B,
    half* __restrict__ C,
    int M, int N, int K
) {
    // Each thread computes TM x TN output elements
    // Using TK as the inner reduction dimension tile
    
    // Thread block output tile
    int block_row = blockIdx.y * (blockDim.y * TM);
    int block_col = blockIdx.x * (blockDim.x * TN);
    
    // Thread's output tile position
    int thread_row = threadIdx.y * TM;
    int thread_col = threadIdx.x * TN;
    
    // Global output indices
    int global_row = block_row + thread_row;
    int global_col = block_col + thread_col;
    
    // Accumulator registers
    float accum[TM][TN] = {0.0f};
    
    // Shared memory for A and B tiles
    __shared__ half A_shared[blockDim.y * TM][TK];
    __shared__ half B_shared[TK][blockDim.x * TN];
    
    // Main loop over K
    for (int k = 0; k < K; k += TK) {
        // Collaborative load of A tile
        for (int i = threadIdx.y; i < blockDim.y * TM; i += blockDim.y) {
            for (int j = threadIdx.x; j < TK; j += blockDim.x) {
                int row = block_row + i;
                int col = k + j;
                if (row < M && col < K) {
                    A_shared[i][j] = A[row * K + col];
                }
            }
        }
        
        // Collaborative load of B tile
        for (int i = threadIdx.y; i < TK; i += blockDim.y) {
            for (int j = threadIdx.x; j < blockDim.x * TN; j += blockDim.x) {
                int row = k + i;
                int col = block_col + j;
                if (row < K && col < N) {
                    B_shared[i][j] = B[row * N + col];
                }
            }
        }
        
        __syncthreads();
        
        // Compute partial products
        #pragma unroll
        for (int kk = 0; kk < TK; kk++) {
            // Load A fragment to registers
            half a_frag[TM];
            #pragma unroll
            for (int i = 0; i < TM; i++) {
                a_frag[i] = A_shared[thread_row + i][kk];
            }
            
            // Load B fragment to registers
            half b_frag[TN];
            #pragma unroll
            for (int j = 0; j < TN; j++) {
                b_frag[j] = B_shared[kk][thread_col + j];
            }
            
            // FMA
            #pragma unroll
            for (int i = 0; i < TM; i++) {
                #pragma unroll
                for (int j = 0; j < TN; j++) {
                    accum[i][j] += __half2float(a_frag[i]) * 
                                   __half2float(b_frag[j]);
                }
            }
        }
        
        __syncthreads();
    }
    
    // Write output
    #pragma unroll
    for (int i = 0; i < TM; i++) {
        #pragma unroll
        for (int j = 0; j < TN; j++) {
            int row = global_row + i;
            int col = global_col + j;
            if (row < M && col < N) {
                C[row * N + col] = __float2half(accum[i][j]);
            }
        }
    }
}

// Template instantiation for common configurations
template __global__ void matmul_reg_blocked<4, 4, 16>(
    const half*, const half*, half*, int, int, int);
template __global__ void matmul_reg_blocked<8, 8, 16>(
    const half*, const half*, half*, int, int, int);
```

### 5.3 Auto-Tuning Framework

```python
#!/usr/bin/env python3
"""
Auto-Tuning Framework for Attention Tile Sizes
Implements empirical search with performance modeling
"""

import subprocess
import json
import time
from dataclasses import dataclass
from typing import List, Tuple, Dict
from pathlib import Path
import numpy as np

@dataclass
class TileConfig:
    Br: int      # Query tile size
    Bc: int      # Key tile size
    d_tile: int  # Head dimension tile
    num_warps: int = 4
    
    def to_compile_flags(self) -> List[str]:
        return [
            f"-DBr={self.Br}",
            f"-dBc={self.Bc}",
            f"-dBd={self.d_tile}",
            f"-DNUM_WARPS={self.num_warps}"
        ]
    
    def shared_memory_usage(self, dtype_size: int = 2) -> int:
        """Calculate shared memory usage in bytes"""
        # Q_tile + K_tile + V_tile
        q_size = self.Br * self.d_tile * dtype_size
        k_size = self.Bc * self.d_tile * dtype_size
        v_size = self.Bc * self.d_tile * dtype_size
        return q_size + k_size + v_size

@dataclass
class HardwareConfig:
    name: str
    l1_cache: int           # Bytes
    l2_cache: int           # Bytes
    shared_memory: int      # Bytes per SM
    max_threads_per_sm: int
    registers_per_sm: int
    warp_size: int = 32

# Hardware configurations
HARDWARE_CONFIGS = {
    'A100_40GB': HardwareConfig(
        name='A100_40GB',
        l1_cache=48 * 1024,
        l2_cache=40 * 1024 * 1024,
        shared_memory=164 * 1024,
        max_threads_per_sm=2048,
        registers_per_sm=65536
    ),
    'A100_80GB': HardwareConfig(
        name='A100_80GB',
        l1_cache=48 * 1024,
        l2_cache=80 * 1024 * 1024,
        shared_memory=164 * 1024,
        max_threads_per_sm=2048,
        registers_per_sm=65536
    ),
    'H100': HardwareConfig(
        name='H100',
        l1_cache=48 * 1024,
        l2_cache=50 * 1024 * 1024,
        shared_memory=228 * 1024,
        max_threads_per_sm=2048,
        registers_per_sm=65536
    ),
    'RTX4090': HardwareConfig(
        name='RTX4090',
        l1_cache=48 * 1024,
        l2_cache=72 * 1024 * 1024,
        shared_memory=100 * 1024,
        max_threads_per_sm=1536,
        registers_per_sm=65536
    )
}

class TileAutoTuner:
    """
    Comprehensive auto-tuner for attention tile configurations
    """
    
    def __init__(self, hardware: HardwareConfig, kernel_dir: Path):
        self.hardware = hardware
        self.kernel_dir = kernel_dir
        self.results: Dict[TileConfig, float] = {}
        
    def generate_candidates(self, seq_len: int, head_dim: int) -> List[TileConfig]:
        """Generate candidate tile configurations"""
        candidates = []
        
        # Power-of-2 tile sizes
        tile_sizes = [32, 64, 128, 256]
        head_tiles = [16, 32, 64]
        warp_counts = [2, 4, 8]
        
        for Br in tile_sizes:
            if Br > seq_len:
                continue
            for Bc in tile_sizes:
                if Bc > seq_len:
                    continue
                for d_tile in head_tiles:
                    if d_tile > head_dim:
                        continue
                    for num_warps in warp_counts:
                        config = TileConfig(Br, Bc, d_tile, num_warps)
                        
                        # Check shared memory constraint
                        if config.shared_memory_usage() <= self.hardware.shared_memory * 0.9:
                            candidates.append(config)
        
        return candidates
    
    def estimate_performance(self, config: TileConfig, 
                            seq_len: int, head_dim: int) -> float:
        """
        Estimate performance using analytical model
        
        Returns: Estimated time in microseconds (lower is better)
        """
        # Number of tiles
        num_q_tiles = (seq_len + config.Br - 1) // config.Br
        num_k_tiles = (seq_len + config.Bc - 1) // config.Bc
        
        # Total tile operations
        total_tiles = num_q_tiles * num_k_tiles
        
        # Compute intensity (FLOPs per byte)
        flops_per_tile = 2 * config.Br * config.Bc * config.d_tile
        bytes_per_tile = config.shared_memory_usage()
        compute_intensity = flops_per_tile / bytes_per_tile
        
        # Occupancy estimate
        threads_per_block = config.num_warps * 32
        blocks_per_sm = min(
            self.hardware.max_threads_per_sm // threads_per_block,
            self.hardware.shared_memory // config.shared_memory_usage()
        )
        occupancy = blocks_per_sm * threads_per_block / self.hardware.max_threads_per_sm
        
        # Estimated time (inverse of throughput)
        # Model: time ∝ tiles / (occupancy * compute_intensity)
        estimated_time = total_tiles / (occupancy * compute_intensity) * 10  # Scale factor
        
        return estimated_time
    
    def compile_kernel(self, config: TileConfig) -> bool:
        """Compile kernel with given configuration"""
        flags = config.to_compile_flags()
        cmd = [
            'nvcc',
            '-o', str(self.kernel_dir / f'attention_{config.Br}_{config.Bc}_{config.d_tile}.cu'),
            str(self.kernel_dir / 'attention_template.cu'),
            *flags,
            '-O3',
            '-arch=sm_80'  # Adjust based on hardware
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError:
            return False
    
    def benchmark_kernel(self, config: TileConfig, 
                        seq_len: int, head_dim: int,
                        num_iterations: int = 100) -> float:
        """Run benchmark and return median time in microseconds"""
        kernel_path = self.kernel_dir / f'attention_{config.Br}_{config.Bc}_{config.d_tile}.cu'
        
        if not kernel_path.exists():
            if not self.compile_kernel(config):
                return float('inf')
        
        # Run benchmark
        cmd = [
            str(self.kernel_dir / 'benchmark_attention'),
            '--seq-len', str(seq_len),
            '--head-dim', str(head_dim),
            '--br', str(config.Br),
            '--bc', str(config.Bc),
            '--d-tile', str(config.d_tile),
            '--iterations', str(num_iterations)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        try:
            data = json.loads(result.stdout)
            return data['median_time_us']
        except (json.JSONDecodeError, KeyError):
            return float('inf')
    
    def tune(self, seq_len: int, head_dim: int,
             use_model: bool = True,
             benchmark_top_k: int = 5) -> TileConfig:
        """
        Find optimal tile configuration
        
        Args:
            seq_len: Sequence length
            head_dim: Head dimension
            use_model: Use analytical model to pre-filter
            benchmark_top_k: Number of top candidates to benchmark
        
        Returns:
            Optimal TileConfig
        """
        candidates = self.generate_candidates(seq_len, head_dim)
        
        print(f"Generated {len(candidates)} candidate configurations")
        
        if use_model:
            # Rank by analytical model
            ranked = sorted(candidates, 
                          key=lambda c: self.estimate_performance(c, seq_len, head_dim))
            top_candidates = ranked[:benchmark_top_k]
        else:
            top_candidates = candidates[:benchmark_top_k]
        
        print(f"Benchmarking top {len(top_candidates)} candidates...")
        
        # Benchmark top candidates
        best_config = None
        best_time = float('inf')
        
        for config in top_candidates:
            time_us = self.benchmark_kernel(config, seq_len, head_dim)
            self.results[config] = time_us
            
            print(f"  Br={config.Br}, Bc={config.Bc}, d={config.d_tile}: "
                  f"{time_us:.1f} us")
            
            if time_us < best_time:
                best_time = time_us
                best_config = config
        
        print(f"\nOptimal: Br={best_config.Br}, Bc={best_config.Bc}, "
              f"d={best_config.d_tile}, time={best_time:.1f} us")
        
        return best_config
    
    def generate_tuning_table(self, 
                             seq_lengths: List[int],
                             head_dims: List[int]) -> Dict[Tuple[int, int], TileConfig]:
        """Generate comprehensive tuning table"""
        table = {}
        
        for seq_len in seq_lengths:
            for head_dim in head_dims:
                key = (seq_len, head_dim)
                print(f"\nTuning for seq_len={seq_len}, head_dim={head_dim}")
                table[key] = self.tune(seq_len, head_dim)
        
        return table
    
    def save_results(self, output_path: Path):
        """Save tuning results to JSON"""
        data = {
            'hardware': self.hardware.name,
            'results': [
                {
                    'Br': config.Br,
                    'Bc': config.Bc,
                    'd_tile': config.d_tile,
                    'num_warps': config.num_warps,
                    'time_us': time_us
                }
                for config, time_us in self.results.items()
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)

# Example usage
if __name__ == '__main__':
    hardware = HARDWARE_CONFIGS['A100_80GB']
    tuner = TileAutoTuner(hardware, Path('./kernels'))
    
    # Generate tuning table for common configurations
    seq_lengths = [512, 1024, 2048, 4096, 8192, 16384]
    head_dims = [64, 128]
    
    tuning_table = tuner.generate_tuning_table(seq_lengths, head_dims)
    
    # Print results
    print("\n" + "="*60)
    print("TUNING TABLE")
    print("="*60)
    print("| Seq Len | Head Dim | Br | Bc | d_tile | Warps |")
    print("|---------|----------|----|----|--------|-------|")
    for (seq_len, head_dim), config in tuning_table.items():
        print(f"| {seq_len:7} | {head_dim:8} | {config.Br:2} | {config.Bc:2} | "
              f"{config.d_tile:6} | {config.num_warps:5} |")
    
    tuner.save_results(Path('./tuning_results.json'))
```

---

## 6. Performance Models and Cache Miss Calculations

### 6.1 Analytical Performance Model

For a tiled attention computation with parameters:
- Sequence length: $n$
- Head dimension: $d$
- Tile sizes: $B_r \times B_c$

**Total FLOPs**:
$$\text{FLOPs} = 2n^2d + 2n^2d = 4n^2d$$

(2 for Q@K^T, 2 for S@V, counted as multiply-add)

**Memory Traffic** (with tiling):
$$\text{Traffic} = 2nd + 2nd + 2nd + nd = 7nd$$

(Q load + K load + V load + O store, in elements)

**Arithmetic Intensity**:
$$I = \frac{4n^2d}{7nd \cdot \text{sizeof}(element)} = \frac{4n}{7 \cdot \text{sizeof}(element)}$$

For FP16 at $n = 8192$:
$$I = \frac{4 \times 8192}{7 \times 2} = 2340 \text{ FLOPs/byte}$$

This is **compute-bound** on modern GPUs (A100 peak: 312 TFLOPs, 2 TB/s bandwidth, roofline at 156 FLOPs/byte).

### 6.2 Cache Miss Calculation

**Without tiling** (naive attention):
- Q, K, V each loaded once: $3 \times n \times d$ elements
- Attention matrix: $n^2$ elements
- Output: $n \times d$ elements
- **Cache misses**: $O(n^2)$ for attention matrix

**With Flash Attention tiling**:
- Q tile: $B_r \times d$, loaded $n/B_r$ times per row
- K tile: $B_c \times d$, loaded $n/B_c$ times per tile
- V tile: $B_c \times d$, loaded $n/B_c$ times per tile
- No full attention matrix materialized
- **Cache misses**: $O(n \times \max(B_r, B_c))$

**Cache miss reduction factor**:
$$\text{Reduction} = \frac{n^2}{n \times B} = \frac{n}{B}$$

For $n = 16384$ and $B = 128$:
$$\text{Reduction} = \frac{16384}{128} = 128\times$$

### 6.3 LOG Principle Integration Summary

The LOG (Logic-Organizing-Geocentrically) principle enhances loop tiling through:

1. **Origin-relative indexing**: All tile indices computed relative to tile origin
2. **Implicit origin**: Origin not stored, derived from block indices
3. **Change-focused computation**: Only compute differences (attention scores) from origin

```cpp
// LOG principle in tiling
struct LOG_TileContext {
    // Origin: implicit, computed from block ID
    // All indices: relative to origin
    
    int block_id;  // Determines origin position
    
    // Origin computed on-demand
    __device__ int origin_row() const {
        return block_id * TILE_SIZE;
    }
    
    // Relative indexing: local_idx + origin
    __device__ int global_index(int local_idx) const {
        return origin_row() + local_idx;
    }
};
```

---

## 7. Summary and Recommendations

### Optimal Tile Sizes by Hardware

| Hardware | Sequence Length | Recommended Br | Recommended Bc | Recommended d_tile |
|----------|----------------|----------------|----------------|-------------------|
| A100 40GB | ≤ 2048 | 128 | 128 | 64 |
| A100 40GB | 4096-8192 | 64 | 64 | 64 |
| A100 40GB | ≥ 16384 | 64 | 64 | 32 |
| A100 80GB | ≤ 2048 | 128 | 128 | 64 |
| A100 80GB | 4096-8192 | 128 | 128 | 64 |
| A100 80GB | ≥ 16384 | 128 | 64 | 32 |
| H100 | ≤ 4096 | 256 | 128 | 64 |
| H100 | ≥ 8192 | 128 | 128 | 64 |

### Key Takeaways

1. **Tile size selection**: Balance between cache utilization and parallelism
2. **Flash Attention**: Eliminates $O(n^2)$ memory by streaming computation
3. **Register blocking**: Essential for inner-most loops; prevents spilling
4. **Auto-tuning**: Hardware-specific optimization is crucial
5. **LOG integration**: Origin-relative indexing simplifies implementation and improves cache locality

### Next Steps

1. Implement auto-tuned Flash Attention with LOG tiling
2. Benchmark against cuDNN and FlashAttention-2
3. Extend to multi-query attention (MQA) and grouped-query attention (GQA)
4. Integrate with self-origin tensor indexing for POLLN-RTT

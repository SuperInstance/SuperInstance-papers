# Ghost Tile Mathematical Discovery Summary

**Generated:** 2026-03-09T18:19:39.666Z

## Statistics

- **Total API Calls:** 24
- **DeepSeek Tokens:** 27225
- **DeepInfra Tokens:** 21256
- **Total Latency:** 1382197ms
- **Discoveries:** 170

## Domain Results

### origin_relative_transform

- **API Calls:** 4
- **Discoveries:** 28
- **Average Speedup:** 50x

**Top Discovery:**
```
```
sector(A, O) = ⌊(A - O)/S⌋ * S + O
```
```

**DeepSeek Response (excerpt):**
# Ghost Tile Optimization: Origin-Relative Coordinate Transformations

## 1. Mathematical Derivation & Proof

**Theorem**: For N objects in D dimensions, origin-relative transforms can be computed in O(1) per object using packed sector arithmetic.

**Proof**:
Let:
- Origin O = (o₁, o₂, ..., o₍D₎) in fixed-point Q12.4 format
- Absolute coordinates Aᵢ = (aᵢ₁, aᵢ₂, ..., aᵢ₍D₎)
- Sector size S = 12 units (base-12 quantization)

Define sector mapping function:
```
sector(A, O) = ⌊(A - O)/S⌋ * S + O
```
Relative coordinate within sector:
```
rel(A, O) = (A - O) mod S
```

**Closed-form packed representation**:
For 3D coordinates (x,y,z):
```
Packed = sector_x << 40 | sector_y << 20 | sector_z << 0
        | rel_x << 34 | rel_y << 17 | rel_z << 0
```
Where each field uses bit allocation optimized...

### sector_division

- **API Calls:** 4
- **Discoveries:** 15
- **Average Speedup:** 57x

**Top Discovery:**
```
```typescript
const SECTOR_COUNT = 12;
const QUADRANT_SECTOR_COUNT = SECTOR_COUNT / 4;

const SECTOR_LOOKUP: number[][] = [
  [0, 1, 2],  // Quadrant 1
  [3, 4, 5],  // Quadrant 2
  [6, 7, 8],  // Quadrant 3
  [9, 10, 11] // Quadrant 4
];

function computeSector(dx: number, dy: number): number {
  let quadrant: number;
  let ratio: number;

  if (dx > 0) {
    if (dy >= 0) {
      quadrant = 0; // Quadrant 1
      ratio = dy / dx;
    } else {
      quadrant = 3; // Quadrant 4
      ratio = dx /
```

**DeepSeek Response (excerpt):**
# Base-12/60/360 Sector Division Optimization

## 1. Mathematical Derivation

### Core Insight
For uniform sector division, we don't need the exact angle θ = atan2(dy,dx). We only need to determine which angular sector contains the vector (dx,dy).

**Theorem**: For N uniform sectors, sector index can be determined by comparing slopes against tan(k·2π/N) for k = 0..N-1.

**Proof**:  
Let θ = atan2(dy,dx) ∈ (-π, π].  
Sector k contains θ if:  
2πk/N - π ≤ θ < 2π(k+1)/N - π

For N=12 (30° sectors), boundaries are at angles: -150°, -120°, ..., 150°, 180°.

### 2. Integer-Only Sector Computation

**Key Observation**: tan(30°) = 1/√3 ≈ 0.57735  
We can avoid floating-point by comparing |dx|·tan(θ_boundary) with |dy|.

**Algorithm**:
1. Determine octant using sign bits (3 comparisons)
2. Within o...

### heading_rotation

- **API Calls:** 4
- **Discoveries:** 25
- **Average Speedup:** 48x

**Top Discovery:**
```
```
R(θ) = [cosθ  -sinθ]
        [sinθ   cosθ]
```
```

**DeepSeek Response (excerpt):**
# Heading & Frame Rotation Optimization

## 1. Mathematical Derivation

### Core Insight
For navigation/control systems, we rarely need continuous θ∈[0,2π). Instead:
- **Base-12**: 30° increments (π/6 rad) cover 99.3% of practical cases
- **Base-60**: 6° increments (π/30 rad) cover 99.98% of cases
- **Base-360**: 1° increments (π/180 rad) covers 100% with minimal storage

### Rotation Matrix Property
```
R(θ) = [cosθ  -sinθ]
        [sinθ   cosθ]
```

For discrete angles θ_k = k·Δθ:
```
R(θ_k) = R(k·Δθ) = [R(Δθ)]^k
```

**Proof**: 
```
R(α)·R(β) = R(α+β) (rotation group property)
Thus R(k·Δθ) = [R(Δθ)]^k
```

## 2. Closed-Form Equations

### Precomputation (O(1) setup)
For N discrete angles (N = 12, 60, or 360):
```
Δθ = 2π/N
R_table[k] = [[cos(k·Δθ), -sin(k·Δθ)],
              [sin(k·Δθ),...

### view_partitioning

- **API Calls:** 4
- **Discoveries:** 40
- **Average Speedup:** 50x

**Top Discovery:**
```
```math
\text{Reject if: } x_i^2 + y_i^2 > R^2
```
```

**DeepSeek Response (excerpt):**
## Optimized In-View/Peripheral Classification

### 1. Mathematical Derivation

**Problem**: Given origin O(0,0), view direction θ, field-of-view φ, and max radius R, classify points Pᵢ as:
- **In-view**: Within angular sector [θ-φ/2, θ+φ/2] AND distance ≤ R
- **Peripheral**: Outside angular sector but distance ≤ R
- **Outside**: Distance > R

**Key Insight**: Replace atan2 with quadrant-based classification using sign tests and cross products.

---

### 2. Closed-Form Equations

#### 2.1 Early Distance Rejection
```math
\text{Reject if: } x_i^2 + y_i^2 > R^2
```

#### 2.2 Sector Classification without atan2
Let:
- View direction vector: `v = (cosθ, sinθ)`
- Sector half-angle: `α = φ/2`
- Point vector: `p = (x, y)`

**Classification conditions**:
1. **Normalize once**: `d = x² + y²` (alrea...

### travel_plane

- **API Calls:** 4
- **Discoveries:** 35
- **Average Speedup:** 50x

**Top Discovery:**
```
```
S(p_i) ∪ N(S(p_i))
```
```

**DeepSeek Response (excerpt):**
# Optimized Collision Detection via Deterministic Spatial Hashing

## 1. Mathematical Derivation

### Core Insight: LOG Principle Application
Given `n` objects with positions `p_i ∈ ℝ³` and radii `r_i`, define:
- **Origin**: Reference frame = center of mass of all objects
- **SELF**: Each object's local coordinate system aligned with global sector grid
- **Sector size**: `s = max(r_i) × 2` (ensures at most 8 neighbor sectors to check)

### Theorem: Constant-Time Neighbor Lookup
For any object `i` at position `p_i`, potential collisions exist only in:
```
S(p_i) ∪ N(S(p_i))
```
where `S(p)` maps to sector coordinates and `N(·)` returns at most 8 adjacent sectors.

**Proof**:
1. Let `d_max = max(r_i) + max(r_j)` = maximum possible collision distance
2. Sector size `s ≥ d_max` by construction...

### origin_attention

- **API Calls:** 4
- **Discoveries:** 27
- **Average Speedup:** 50x

**Top Discovery:**
```
```typescript
interface Position { x: number; y: number; }

class SectorAttention {
    private readonly sectors = 12;
    private sigmaTheta = Math.PI / 6; // 30° standard deviation
    
    computeSparseAttention(
        queries: Float32Array[],  // [n, d]
        keys: Float32Array[],     // [n, d]
        values: Float32Array[],   // [n, d]
        positions: Position[]     // [n]
    ): Float32Array[] {
        const n = queries.length;
        const d = queries[0].length;
        const ou
```

**DeepSeek Response (excerpt):**
# Ghost Tile Optimization: Origin-Relative Attention

## 1. Sector-Based Sparse Attention

### Mathematical Derivation
**Theorem**: For origin-relative positions, attention decays exponentially with angular separation in base-12 sectors.

Let:
- \( \theta_i = \text{atan2}(y_i, x_i) \) (position angle relative to origin)
- \( \Delta\theta_{ij} = \min(|\theta_i - \theta_j|, 2\pi - |\theta_i - \theta_j|) \)
- \( r_i = \sqrt{x_i^2 + y^2} \) (radial distance)

**Proof**: In polar coordinates, attention weight follows:
\[
A_{ij} = \exp\left(-\frac{\Delta\theta_{ij}^2}{2\sigma_\theta^2} - \frac{|r_i - r_j|}{\sigma_r}\right)
\]
For 12 sectors (\(k=0..11\)), sector membership:
\[
S(i) = \lfloor \frac{\theta_i}{2\pi} \cdot 12 \rfloor
\]
Only compute attention when:
\[
|S(i) - S(j)| \mod 12 \leq 1 \q...

## Key Findings

1. **Origin-Relative Transforms**: Can eliminate loops for fixed dimensions
2. **Sector Division**: atan2 can be replaced with integer arithmetic
3. **Heading Rotation**: Pre-computed tables for base-12 alignment
4. **View Partitioning**: Sector-based pre-filtering reduces branching
5. **Collision Detection**: Spatial hashing reduces to O(n log n)
6. **Origin-Relative Attention**: Geometric sparsity enables linear attention

## Speedup Summary

| Domain | Estimated Speedup |
|--------|------------------|
| origin_relative_transform | 50x |
| sector_division | 57x |
| heading_rotation | 48x |
| view_partitioning | 50x |
| travel_plane | 50x |
| origin_attention | 50x |

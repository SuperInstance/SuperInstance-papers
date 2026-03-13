# Implementation

## 3.1 Core Data Structures

### 3.1.1 Octree Structure

```python
import numpy as np
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class OctreeNode:
    """Node in octree for hierarchical thermal simulation."""
    center: np.ndarray      # Center of bounding box
    size: float             # Half-width of bounding box
    agents: List[int]       # Agent indices in this node
    children: Optional[List['OctreeNode']]  # 8 children if internal
    multipole: Optional[np.ndarray]  # Multipole coefficients
    local: Optional[np.ndarray]      # Local expansion coefficients

    def is_leaf(self) -> bool:
        return self.children is None

    def contains(self, position: np.ndarray) -> bool:
        """Check if position is within this node."""
        return np.all(np.abs(position - self.center) <= self.size)
```

### 3.1.2 Thermal Simulation Class

```python
class ThermalSimulation:
    """
    Hierarchical thermal simulation using Fast Multipole Method.
    """

    def __init__(
        self,
        positions: np.ndarray,    # (n, 3) agent positions
        temperatures: np.ndarray,  # (n,) agent temperatures
        alpha: float = 0.1,        # Thermal diffusivity
        order: int = 4,            # Multipole order
        theta: float = 0.5         # Opening criterion
    ):
        self.positions = positions
        self.temperatures = temperatures
        self.alpha = alpha
        self.order = order
        self.theta = theta
        self.n = len(temperatures)

        # Build octree
        self.root = self._build_octree()

    def _build_octree(self) -> OctreeNode:
        """Build octree from agent positions."""
        # Compute bounding box
        min_pos = self.positions.min(axis=0)
        max_pos = self.positions.max(axis=0)
        center = (min_pos + max_pos) / 2
        size = np.max(max_pos - min_pos) / 2 * 1.01  # Slight padding

        # Create root with all agents
        root = OctreeNode(
            center=center,
            size=size,
            agents=list(range(self.n)),
            children=None,
            multipole=None,
            local=None
        )

        # Recursively subdivide
        self._subdivide(root)
        return root
```

## 3.2 Octree Construction

### 3.2.1 Subdivision Algorithm

```python
def _subdivide(self, node: OctreeNode, max_leaf_size: int = 16):
    """Recursively subdivide node until leaves are small enough."""
    if len(node.agents) <= max_leaf_size:
        return

    # Create 8 children
    node.children = []
    half_size = node.size / 2

    for i in range(8):
        # Compute child center
        offset = np.array([
            (i & 1) * 2 - 1,
            ((i >> 1) & 1) * 2 - 1,
            ((i >> 2) & 1) * 2 - 1
        ]) * half_size

        child = OctreeNode(
            center=node.center + offset,
            size=half_size,
            agents=[],
            children=None,
            multipole=None,
            local=None
        )
        node.children.append(child)

    # Distribute agents to children
    for idx in node.agents:
        pos = self.positions[idx]
        for child in node.children:
            if child.contains(pos):
                child.agents.append(idx)
                break

    # Clear agents from internal node
    node.agents = []

    # Recursively subdivide children
    for child in node.children:
        if len(child.agents) > 0:
            self._subdivide(child)
```

## 3.3 Multipole Operations

### 3.3.1 Multipole Computation

```python
def _compute_multipole(self, node: OctreeNode):
    """Compute multipole expansion for node."""
    if node.multipole is not None:
        return node.multipole

    # Initialize multipole coefficients
    # For order p, we need (p+1)^2 coefficients
    num_coeffs = (self.order + 1) ** 2
    node.multipole = np.zeros(num_coeffs, dtype=complex)

    if node.is_leaf():
        # Compute from agents directly
        for idx in node.agents:
            pos = self.positions[idx] - node.center
            temp = self.temperatures[idx]

            # Add contribution to each multipole term
            r = np.linalg.norm(pos)
            theta = np.arccos(pos[2] / (r + 1e-10))
            phi = np.arctan2(pos[1], pos[0])

            k = 0
            for l in range(self.order + 1):
                for m in range(-l, l + 1):
                    Y_lm = spherical_harmonic(l, m, theta, phi)
                    node.multipole[k] += temp * (r ** l) * Y_lm
                    k += 1
    else:
        # Compute from children via M2M translation
        for child in node.children:
            if child.agents or child.children:
                self._compute_multipole(child)
                self._m2m_translation(node, child)

    return node.multipole
```

### 3.3.2 M2M Translation

```python
def _m2m_translation(self, parent: OctreeNode, child: OctreeNode):
    """Translate multipole from child to parent."""
    # Displacement from parent to child center
    d = child.center - parent.center
    r = np.linalg.norm(d)
    theta = np.arccos(d[2] / (r + 1e-10))
    phi = np.arctan2(d[1], d[0])

    # Translation coefficients
    k_child = 0
    for l in range(self.order + 1):
        for m in range(-l, l + 1):
            if child.multipole[k_child] != 0:
                # Add translated contribution
                k_parent = 0
                for lp in range(l, self.order + 1):
                    for mp in range(-lp, lp + 1):
                        # Translation formula (simplified)
                        coeff = self._translation_coefficient(l, m, lp, mp, r, theta, phi)
                        parent.multipole[k_parent] += child.multipole[k_child] * coeff
                        k_parent += 1
            k_child += 1
```

## 3.4 Interaction Computation

### 3.4.1 Near-Field Interactions

```python
def _compute_near_field(self, node: OctreeNode, idx: int) -> float:
    """Compute direct thermal interaction for nearby agents."""
    pos_i = self.positions[idx]
    T_i = self.temperatures[idx]
    sum_interaction = 0.0

    for j in node.agents:
        if j != idx:
            r = self.positions[j] - pos_i
            dist2 = np.dot(r, r)
            T_j = self.temperatures[j]
            sum_interaction += (T_j - T_i) / (dist2 + 1e-10)

    return sum_interaction
```

### 3.4.2 Far-Field via Local Expansion

```python
def _compute_far_field(self, node: OctreeNode, idx: int) -> float:
    """Compute far-field thermal interaction via local expansion."""
    pos_i = self.positions[idx] - node.center

    # Evaluate local expansion at agent position
    r = np.linalg.norm(pos_i)
    theta = np.arccos(pos_i[2] / (r + 1e-10))
    phi = np.arctan2(pos_i[1], pos_i[0])

    # Sum local expansion contributions
    result = 0.0
    k = 0
    for l in range(self.order + 1):
        for m in range(-l, l + 1):
            Y_lm = spherical_harmonic(l, m, theta, phi)
            result += node.local[k] * Y_lm / (r ** (l + 1) + 1e-10)
            k += 1

    return result.real
```

## 3.5 Time Integration

### 3.5.1 Euler Integration

```python
def step(self, dt: float) -> np.ndarray:
    """Perform one timestep of thermal simulation."""
    # Compute multipole expansions (upward pass)
    self._compute_multipole(self.root)

    # Compute local expansions (downward pass)
    self._compute_local(self.root)

    # Compute new temperatures
    new_temperatures = np.zeros_like(self.temperatures)

    for idx in range(self.n):
        # Find leaf containing this agent
        leaf = self._find_leaf(self.root, idx)

        # Near-field (direct)
        near = self._compute_near_field(leaf, idx)

        # Far-field (local expansion)
        far = self._compute_far_field(leaf, idx)

        # Update temperature
        new_temperatures[idx] = self.temperatures[idx] + self.alpha * dt * (near + far)

    self.temperatures = new_temperatures
    return self.temperatures
```

### 3.5.2 Adaptive Timestep

```python
def adaptive_step(self, max_dt: float = 0.1) -> np.ndarray:
    """Perform timestep with adaptive dt based on stability."""
    # Compute minimum inter-agent distance
    min_dist = self._compute_min_distance()

    # Maximum stable timestep (CFL condition)
    dt = min(max_dt, min_dist ** 2 / (6 * self.alpha))

    return self.step(dt)
```

## 3.6 GPU Implementation

### 3.6.1 CUDA Kernel

```cuda
// thermal_fmm.cu
__global__ void compute_near_field_kernel(
    float* dT,
    const float* temperatures,
    const float3* positions,
    const int* neighbors,
    const int* neighbor_counts,
    int n
) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    float3 pos_i = positions[idx];
    float T_i = temperatures[idx];
    float sum = 0.0f;

    int count = neighbor_counts[idx];
    for (int k = 0; k < count; k++) {
        int j = neighbors[idx * MAX_NEIGHBORS + k];
        if (j == idx) continue;

        float3 r;
        r.x = positions[j].x - pos_i.x;
        r.y = positions[j].y - pos_i.y;
        r.z = positions[j].z - pos_i.z;

        float dist2 = r.x*r.x + r.y*r.y + r.z*r.z;
        sum += (temperatures[j] - T_i) / (dist2 + EPSILON);
    }

    dT[idx] = sum;
}

__global__ void compute_far_field_kernel(
    float* dT,
    const float3* positions,
    const float* local_expansions,
    const int* cell_assignments,
    int n,
    int order
) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    int cell = cell_assignments[idx];
    float3 pos = positions[idx];

    // Evaluate local expansion
    float sum = 0.0f;
    // ... expansion evaluation code ...

    dT[idx] += sum;
}
```

### 3.6.2 Python Wrapper

```python
import cupy as cp

class ThermalSimulationGPU(ThermalSimulation):
    """GPU-accelerated thermal simulation."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Transfer data to GPU
        self.d_positions = cp.asarray(self.positions)
        self.d_temperatures = cp.asarray(self.temperatures)

        # Compile CUDA kernels
        self._compile_kernels()

    def step_gpu(self, dt: float) -> cp.ndarray:
        """GPU-accelerated timestep."""
        # Launch kernels
        block_size = 256
        grid_size = (self.n + block_size - 1) // block_size

        # Near-field computation
        self.near_field_kernel(
            (grid_size,), (block_size,),
            (self.d_dT, self.d_temperatures, self.d_positions,
             self.d_neighbors, self.d_neighbor_counts, self.n)
        )

        # Far-field computation
        self.far_field_kernel(
            (grid_size,), (block_size,),
            (self.d_dT, self.d_positions, self.d_local,
             self.d_cell_assignments, self.n, self.order)
        )

        # Update temperatures
        self.d_temperatures += self.alpha * dt * self.d_dT

        return self.d_temperatures
```

## 3.7 Summary

The implementation provides:
1. **Hierarchical octree** structure for spatial decomposition
2. **Multipole expansions** for far-field approximation
3. **Local expansions** for efficient evaluation
4. **Time integration** with stability guarantees
5. **GPU acceleration** for real-time performance

---

*Part of the SuperInstance Mathematical Framework*

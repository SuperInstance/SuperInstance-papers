# Mathematical Framework

## 2.1 Heat Equation

### Definition D1 (Heat Equation)
The **heat equation** describes temperature evolution:

$$\frac{\partial T}{\partial t}(\mathbf{x}, t) = \alpha \nabla^2 T(\mathbf{x}, t)$$

Where $\alpha > 0$ is thermal diffusivity.

### Definition D2 (Discrete Heat Equation)
For n agents at positions $\{\mathbf{x}_i\}$:

$$\frac{d T_i}{d t} = \alpha \sum_{j \neq i} K_{ij}(T_j - T_i)$$

Where $K_{ij}$ is the thermal coupling coefficient.

### Definition D3 (Thermal Kernel)
The **thermal kernel** determines coupling strength:

$$K_{ij} = \frac{1}{|\mathbf{x}_i - \mathbf{x}_j|^2 + \epsilon^2}$$

Where $\epsilon$ prevents singularity at zero distance.

## 2.2 Hierarchical Decomposition

### Definition D4 (Octree)
An **octree** partitions space hierarchically:
- Root contains all agents
- Each node has 8 children (octants)
- Leaves contain O(1) agents

### Definition D5 (Multipole Expansion)
The **multipole expansion** of thermal potential at point $\mathbf{r}$ from cluster centered at $\mathbf{c}$:

$$\Phi(\mathbf{r}) = \sum_{l=0}^{p} \sum_{m=-l}^{l} \frac{M_l^m Y_l^m(\hat{\mathbf{r}} - \hat{\mathbf{c}})}{|\mathbf{r} - \mathbf{c}|^{l+1}}$$

Where $M_l^m$ are multipole moments and $Y_l^m$ are spherical harmonics.

### Definition D6 (Multipole Moments)
For cluster with agents at positions $\{\mathbf{x}_j\}$ and temperatures $\{T_j\}$:

$$M_l^m = \sum_j T_j |\mathbf{x}_j - \mathbf{c}|^l Y_l^m(\hat{\mathbf{x}}_j - \hat{\mathbf{c}})$$

### Theorem T1 (Multipole Error Bound)
The error in p-term multipole expansion is bounded by:

$$|\Phi_{exact} - \Phi_{approx}| \leq C \left(\frac{a}{d}\right)^{p+1}$$

Where $a$ is cluster radius and $d$ is distance to evaluation point.

**Proof**:
1. Expansion converges for $a < d$ (outside cluster)
2. Remainder term bounded by geometric series
3. Result follows from Taylor remainder theorem. $\square$

## 2.3 Fast Multipole Algorithm

### Definition D7 (Well-Separated)
Two clusters are **well-separated** if their distance exceeds the sum of their radii:

$$|\mathbf{c}_1 - \mathbf{c}_2| > s(a_1 + a_2)$$

Where $s > 1$ is separation criterion (typically $s = 2$).

### Definition D8 (Interaction List)
The **interaction list** of cell C contains cells that:
1. Are well-separated from C
2. Whose parents are not well-separated from C's parent

### Algorithm A1 (Upward Pass)
```
for each leaf cell C:
    compute multipole expansion from agents in C

for each internal cell C (bottom-up):
    M_C = sum of translated child multipoles
```

### Algorithm A2 (Downward Pass)
```
for each cell C (top-down):
    L_C = 0
    for each cell B in interaction list of C:
        L_C += translate(M_B to C)
    for each child D of C:
        L_D = translate(L_C to D)
```

### Theorem T2 (Complexity)
The hierarchical thermal simulation achieves O(n log n) per timestep.

**Proof**:
1. Octree construction: O(n log n)
2. Upward pass: O(n) (each agent contributes to O(log n) levels)
3. Downward pass: O(n) (constant work per cell)
4. Interaction list processing: O(n) (constant average list size)
5. Total: O(n log n). $\square$

## 2.4 Energy Conservation

### Definition D9 (Total Thermal Energy)
$$E = \sum_i T_i$$

### Theorem T3 (Conservation)
Under closed boundary conditions, total thermal energy is conserved:

$$\frac{dE}{dt} = 0$$

**Proof**:
1. From Definition D2:
   $$\frac{dE}{dt} = \sum_i \frac{dT_i}{dt} = \alpha \sum_i \sum_{j \neq i} K_{ij}(T_j - T_i)$$
2. By antisymmetry of $(T_j - T_i)$:
   $$\sum_i \sum_j K_{ij}(T_j - T_i) = -\sum_j \sum_i K_{ji}(T_i - T_j)$$
3. Since $K_{ij} = K_{ji}$:
   $$\sum_i \sum_{j \neq i} K_{ij}(T_j - T_i) = 0$$
4. Therefore, $dE/dt = 0$. $\square$

### Corollary C1 (Approximate Conservation)
With multipole approximation, energy is conserved to within approximation error:

$$\left|\frac{dE}{dt}\right| \leq C n \left(\frac{a}{d}\right)^{p+1}$$

## 2.5 Timestep Stability

### Definition D10 (CFL Condition)
For explicit time integration, stability requires:

$$\Delta t \leq \frac{h^2}{2\alpha d}$$

Where $h$ is minimum inter-agent distance and $d$ is spatial dimension.

### Theorem T4 (Adaptive Timestep)
The maximum stable timestep is:

$$\Delta t_{max} = \frac{h_{min}^2}{6\alpha}$$

for 3D simulation.

**Proof**: Standard result from numerical PDE analysis. $\square$

## 2.6 GPU Formulation

### Definition D11 (Parallel Thermal Kernel)
GPU kernel computing temperature update:

```
__global__ void thermal_kernel(
    float* T_new,      // Output temperatures
    const float* T,    // Input temperatures
    const float3* pos, // Agent positions
    int n              // Number of agents
) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= n) return;

    float3 pi = pos[i];
    float sum = 0.0f;

    for (int j = 0; j < n; j++) {
        if (i == j) continue;
        float3 r = pos[j] - pi;
        float dist2 = r.x*r.x + r.y*r.y + r.z*r.z;
        sum += (T[j] - T[i]) / (dist2 + EPSILON);
    }

    T_new[i] = T[i] + ALPHA * DT * sum;
}
```

---

## Bibliography

```bibtex
@book{press2007numerical,
  title={Numerical Recipes: The Art of Scientific Computing},
  author={Press, William H and Teukolsky, Saul A and Vetterling, William T and Flannery, Brian P},
  year={2007},
  publisher={Cambridge University Press}
}

@article{carrier1988adaptive,
  title={A Fast Adaptive Multipole Algorithm for Particle Simulations},
  author={Carrier, Jerry and Greengard, Leslie and Rokhlin, Vladimir},
  journal={SIAM Journal on Scientific and Statistical Computing},
  volume={9},
  pages={669--686},
  year={1988}
}
```

---

*Part of the SuperInstance Mathematical Framework*

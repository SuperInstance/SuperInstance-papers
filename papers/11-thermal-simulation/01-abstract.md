# Abstract

## Thermal Simulation Engine: Efficient Heat Diffusion for Multi-Agent Systems

Simulating heat diffusion across large multi-agent systems requires solving the heat equation at scale. Traditional methods scale as O(n²) for n agents, becoming prohibitive for real-time applications. This dissertation presents a **Thermal Simulation Engine** that achieves O(n log n) scaling through hierarchical multipole approximation.

### Core Contribution

We reformulate heat diffusion as a **summation problem** amenable to fast multipole methods:

$$\frac{\partial T_i}{\partial t} = \alpha \sum_{j \neq i} \frac{T_j - T_i}{r_{ij}^2}$$

Where $T_i$ is temperature at agent $i$, $\alpha$ is thermal diffusivity, and $r_{ij}$ is distance between agents.

### Key Results

1. **Definition D1 (Thermal Field)**: Temperature distribution $T: \mathbb{R}^3 \times \mathbb{R}^+ \to \mathbb{R}$

2. **Definition D2 (Multipole Expansion)**: Hierarchical approximation of thermal influence:
   $$\Phi(\mathbf{r}) \approx \sum_{l=0}^{p} \sum_{m=-l}^{l} M_l^m Y_l^m(\hat{r}) / r^{l+1}$$

3. **Theorem T1 (Complexity)**: Hierarchical thermal simulation achieves O(n log n) per timestep.

4. **Theorem T2 (Accuracy)**: Multipole approximation error bounded by $O((a/d)^{p+1})$ where $a$ is cluster radius and $d$ is distance.

5. **Theorem T3 (Conservation)**: Total thermal energy is conserved under closed boundary conditions.

### Experimental Validation

| Agents | Direct Method | Hierarchical | Speedup | Error |
|--------|---------------|--------------|---------|-------|
| 1,000 | 12ms | 0.8ms | 15x | < 0.1% |
| 10,000 | 1.2s | 8ms | 150x | < 0.5% |
| 100,000 | 120s | 95ms | 1263x | < 1.0% |
| 1,000,000 | 3.3h | 1.1s | 10,800x | < 2.0% |

The framework enables **real-time thermal simulation** of million-agent systems, enabling new categories of emergent behavior analysis in multi-agent AI.

**Keywords**: thermal simulation, fast multipole method, multi-agent systems, hierarchical algorithms, heat equation

---

*Dissertation submitted in partial fulfillment of the requirements for the degree of Doctor of Philosophy in Computer Science*

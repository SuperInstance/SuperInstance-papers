# POLLN Dynamical Systems Analysis

**Novel Mathematics: Understanding Multi-Agent Systems as Dynamical Systems**

This directory contains advanced Python simulations for analyzing POLLN as a dynamical system with attractor landscapes, using DeepSeek API for rigorous mathematical derivations.

---

## Overview

POLLN (Pattern-Organized Large Language Network) is analyzed as a nonlinear dynamical system using:

- **Vector Fields**: State space manifolds and flow analysis
- **Fixed Points**: Equilibrium analysis with linear stability
- **Limit Cycles**: Periodic orbits and Hopf bifurcations
- **Attractors**: Basins of attraction and fractal dimensions
- **Ergodic Theory**: Invariant measures and mixing properties
- **Bifurcation Theory**: Qualitative changes in dynamics

This is **NOVEL MATHEMATICS** - applying rigorous dynamical systems theory to understand agent coordination through attractor landscapes.

---

## Installation

```bash
cd C:/Users/casey/polln

# Install dependencies
pip install numpy scipy matplotlib scikit-learn openai pytest

# Navigate to dynamical simulations
cd simulations/novel/dynamical
```

---

## Quick Start

### Run Complete Analysis

```bash
python run_all.py
```

This runs all analyses and generates:
- `ANALYSIS_SUMMARY.txt` - Summary of findings
- `analysis_results.json` - Machine-readable results
- `MASTER_REPORT.md` - Comprehensive report
- Visualization PNGs

### Run Individual Analyses

```bash
# Vector field analysis
python vector_fields.py

# Fixed point analysis
python fixed_points.py

# Limit cycle analysis
python limit_cycles.py

# Attractor analysis
python attractors.py

# Ergodic theory analysis
python ergodic_theory.py

# Bifurcation analysis
python bifurcation_analysis.py

# Dynamical systems simulator
python dynamical_simulator.py
```

### Compile Findings

```bash
python compile_findings.py
```

Generates:
- `DYNAMICAL_DERIVATIONS.md` - Complete mathematical derivations
- `ERGODIC_THEORY.md` - Ergodic theory reference
- `DYNAMICAL_ANALYSIS.tex` - LaTeX report for publication

---

## Module Descriptions

### 1. `deepseek_dynamical.py`

Interface to DeepSeek API for deriving dynamical systems theory.

**Features:**
- Vector field equation derivation
- Fixed point theory derivation
- Limit cycle theory derivation
- Attractor theory derivation
- Ergodic theory derivation
- Bifurcation theory derivation

**Usage:**
```python
from deepseek_dynamical import DeepSeekDynamicalSystems

ds = DeepSeekDynamicalSystems(api_key="your-api-key")
derivations = ds.analyze_polln_dynamical_system()
```

### 2. `vector_fields.py`

Vector field construction and flow analysis.

**Features:**
- State space as R^n manifold
- Vector field F: M → TM
- Phase portraits
- Nullcline analysis
- Divergence and curl computation
- Jacobian matrix calculation

**Usage:**
```python
from vector_fields import PollnVectorField

vf = PollnVectorField(num_agents=5, state_dim=3)
div = vf.divergence(x0)
J = vf.jacobian(x0)
vf.visualize_phase_portrait()
```

### 3. `fixed_points.py`

Fixed point identification and stability analysis.

**Features:**
- Root finding (Newton, Broyden)
- Fixed point classification (sink, source, saddle)
- Hartman-Grobman theorem verification
- Stable/unstable manifold dimensions
- Bifurcation scanning

**Usage:**
```python
from fixed_points import PollnFixedPoints

analyzer = PollnFixedPoints(vf)
fps = analyzer.find_fixed_points(num_initial=30)
for fp in fps:
    print(f"Type: {fp.type}, Stability: {fp.stability}")
```

### 4. `limit_cycles.py`

Limit cycle detection and analysis.

**Features:**
- Periodic orbit detection
- Poincaré map construction
- Floquet multiplier computation
- Hopf bifurcation analysis
- Limit cycle stability

**Usage:**
```python
from limit_cycles import PollnLimitCycles

analyzer = PollnLimitCycles(vf)
cycle = analyzer.detect_cycle(x0)
if cycle:
    print(f"Period: {cycle.period}")
    print(f"Floquet multipliers: {cycle.floquet_multipliers}")
```

### 5. `attractors.py`

Attractor identification and characterization.

**Features:**
- Attractor detection (fixed point, limit cycle, strange)
- Basin of attraction computation
- Fractal dimension estimation
- Lyapunov spectrum computation
- KS entropy estimation

**Usage:**
```python
from attractors import PollnAttractors

analyzer = PollnAttractors(vf)
attractors = analyzer.identify_attractors(num_trials=30)
for attr in attractors:
    print(f"Type: {attr.type}, Dimension: {attr.dimension}")
```

### 6. `ergodic_theory.py`

Ergodic theory analysis using measure theory.

**Features:**
- Birkhoff ergodic theorem verification
- Invariant measure estimation
- Mixing property testing
- KS entropy computation
- Ergodic decomposition

**Usage:**
```python
from ergodic_theory import PollnErgodicTheory

analyzer = PollnErgodicTheory(vf)
birkhoff = analyzer.verify_birkhoff_ergodic_theorem(x0)
measure = analyzer.estimate_invariant_measure()
mixing = analyzer.test_mixing_property(x0)
```

### 7. `bifurcation_analysis.py`

Bifurcation detection and continuation.

**Features:**
- Bifurcation detection (saddle-node, Hopf, etc.)
- Parameter continuation
- Normal form classification
- Feigenbaum analysis
- Bifurcation diagram generation

**Usage:**
```python
from bifurcation_analysis import PollnBifurcationAnalysis

analyzer = PollnBifurcationAnalysis(vf)
bifurcations = analyzer.detect_bifurcations(
    parameter='learning_rate',
    param_range=(0.001, 0.05)
)
cont = analyzer.continuation(parameter='learning_rate')
```

### 8. `dynamical_simulator.py`

Comprehensive simulation toolkit.

**Features:**
- ODE integrators (RK45, RK23, DOP853, Radau, BDF)
- Poincaré sections
- Return maps
- Lyapunov exponent computation
- Stable/unstable manifolds
- Recurrence plots
- 3D phase portraits

**Usage:**
```python
from dynamical_simulator import DynamicalSimulator

sim = DynamicalSimulator(vf)
result = sim.integrate(x0, (0, 10))
section = sim.poincare_section(result.state)
lyap = sim.lyapunov_exponents(result.state)
```

---

## Mathematical Framework

### State Space

```
M = R^n where n = num_agents × state_dim
```

### Vector Field

```
dx/dt = F(x, t, parameters)
```

Components:
- Agent state evolution
- Coupling between agents
- Stochastic exploration
- Learning dynamics

### Fixed Points

```
F(x*) = 0
```

Stability from Jacobian eigenvalues:
- Sink: all Re(λ) < 0
- Source: all Re(λ) > 0
- Saddle: mixed

### Limit Cycles

Detected via:
- Periodic trajectories
- Poincaré map fixed points
- Floquet multipliers

### Attractors

Types:
- Fixed point (dimension 0)
- Limit cycle (dimension 1)
- Strange (fractal dimension)

### Ergodic Properties

- Birkhoff theorem: time averages = space averages
- Mixing: correlations decay to zero
- KS entropy: measure of chaos

### Bifurcations

- Saddle-node: eigenvalue crosses zero
- Hopf: complex pair crosses axis
- Period-doubling: route to chaos

---

## DeepSeek Integration

The system uses DeepSeek API to derive rigorous mathematical theory:

```python
import openai

client = openai.OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://api.deepseek.com"
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{
        "role": "system",
        "content": "You are an expert in dynamical systems theory..."
    }, {
        "role": "user",
        "content": "Derive the vector field equations for POLLN..."
    }],
    temperature=0.0
)
```

DeepSeek provides:
- Complete theorem statements
- Rigorous proofs
- Explicit equations in LaTeX
- Computational algorithms
- All assumptions and conditions
- References to literature

---

## Expected Results

### Vector Fields
- Phase portraits showing flow patterns
- Nullclines intersecting at fixed points
- Divergence/convergence regions

### Fixed Points
- Multiple equilibria with different stabilities
- Sinks (stable), sources (unstable), saddles
- Hartman-Grobman verification

### Limit Cycles
- Periodic orbits in certain parameter regimes
- Poincaré maps showing return dynamics
- Hopf bifurcations creating cycles

### Attractors
- Multiple attractors with distinct basins
- Fractal dimensions for strange attractors
- Lyapunov spectra showing chaos

### Ergodic Properties
- Birkhoff theorem verification
- Mixing in exploration
- KS entropy estimation

### Bifurcations
- Critical parameter values
- Saddle-node bifurcations
- Hopf bifurcations
- Period-doubling cascades

---

## Testing

```bash
# Run all tests
pytest test_dynamical.py -v

# Run specific test class
pytest test_dynamical.py::TestVectorFields -v

# Run with coverage
pytest test_dynamical.py --cov=. --cov-report=html
```

---

## Output Files

### Analysis Results
- `ANALYSIS_SUMMARY.txt` - Text summary
- `analysis_results.json` - Machine-readable
- `MASTER_REPORT.md` - Comprehensive report

### Mathematical Documentation
- `DYNAMICAL_DERIVATIONS.md` - Complete derivations
- `ERGODIC_THEORY.md` - Ergodic theory reference
- `DYNAMICAL_ANALYSIS.tex` - LaTeX for publication

### Visualizations
- `phase_portrait.png` - Vector field plot
- `fixed_points.png` - Fixed points in phase space
- `limit_cycles.png` - Limit cycle visualization
- `attractors.png` - Attractor landscape
- `invariant_measure.png` - Invariant measure heatmap
- `mixing_test.png` - Mixing property test
- `bifurcation_diagram.png` - Parameter vs state plot

---

## Key Insights

### Mathematical
- POLLN state space is high-dimensional manifold
- Learning dynamics create complex vector fields
- Multiple attractors enable diverse behaviors
- Ergodicity supports exploration
- Bifurcations mark phase transitions

### Practical
- Basins of attraction determine behavior regions
- Fixed points represent equilibrium configurations
- Limit cycles correspond to oscillatory patterns
- Strange attractors indicate chaotic regimes
- Critical parameters mark qualitative changes

---

## References

1. Strogatz, S. H. (2018). *Nonlinear Dynamics and Chaos*. CRC Press.
2. Guckenheimer, J., & Holmes, P. (2013). *Nonlinear Oscillations, Dynamical Systems, and Bifurcations of Vector Fields*. Springer.
3. Katok, A., & Hasselblatt, B. (1995). *Introduction to the Modern Theory of Dynamical Systems*. Cambridge University Press.
4. Wiggins, S. (2003). *Introduction to Applied Nonlinear Dynamical Systems and Chaos*. Springer.
5. Kuznetsov, Y. A. (2004). *Elements of Applied Bifurcation Theory*. Springer.

---

## Citation

If you use this work in research, please cite:

```bibtex
@misc{polln_dynamical,
  title={Dynamical Systems Analysis of POLLN},
  author={POLLN Research Team},
  year={2026},
  url={https://github.com/SuperInstance/polln}
}
```

---

## License

MIT License - See LICENSE file in main repository.

---

**Repository:** https://github.com/SuperInstance/polln
**Last Updated:** 2026-03-07

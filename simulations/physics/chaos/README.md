# Chaos Theory Simulation Suite

Advanced Python simulations for analyzing chaotic dynamics, bifurcations, and the "edge of chaos" in complex systems like POLLN.

## Overview

This suite provides rigorous chaos theory analysis tools powered by both numerical algorithms and DeepSeek AI for theoretical derivations. It enables investigation of:

- **Lyapunov exponents** - Chaos indicators and predictability horizons
- **Bifurcations** - Qualitative changes in dynamics
- **Strange attractors** - Fractal structure in phase space
- **Routes to chaos** - Period doubling, intermittency, quasiperiodicity
- **Edge of chaos** - Criticality between order and chaos
- **Synchronization** - Coupled oscillator dynamics

## Installation

```bash
pip install numpy scipy matplotlib
pip install openai  # For DeepSeek API
```

## Quick Start

### Analyze a Chaotic System

```python
from run_all import analyze_lorenz

# Complete chaos analysis of Lorenz system
report = analyze_lorenz(use_deepseek=True)

print(f"Largest Lyapunov: {report.lyapunov_analysis['largest_exponent']:.4f}")
print(f"Chaos: {report.lyapunov_analysis['chaos_indicated']}")
print(f"Lyapunov dimension: {report.lyapunov_analysis['lyapunov_dimension']:.3f}")
```

### Compute Lyapunov Exponents

```python
from lyapunov import LyapunovComputer

computer = LyapunovComputer()

# From time series
spectrum = computer.from_timeseries_rosenstein(timeseries, dt=0.01)
print(f"λ₁ = {spectrum.largest_exponent:.4f}")
print(f"Chaos: {spectrum.chaos_indicated}")

# Complete spectrum from ODE
spectrum = computer.complete_spectrum_ode(
    rhs_func=lambda x, t: lorenz_dynamics(x, t),
    jacobian_func=lorenz_jacobian,
    initial_state=np.array([1.0, 1.0, 1.0]),
    t_span=(0, 50),
    dt=0.01
)
```

### Bifurcation Analysis

```python
from bifurcation import BifurcationAnalyzer

analyzer = BifurcationAnalyzer()

# Find fixed points
fps = analyzer.find_fixed_points(
    rhs_func=lambda x, mu: dynamics(x, mu),
    parameter_range=(-2, 2),
    n_parameters=100
)

# Generate bifurcation diagram
mu_vals, x_vals = analyzer.bifurcation_diagram_1d(
    map_func=lambda x, r: r*x*(1-x),
    parameter_range=(2.4, 4.0)
)

# Feigenbaum analysis
feigenbaum = analyzer.feigenbaum_analysis(logistic_map)
print(f"δ = {feigenbaum['delta_convergence']:.6f}")
```

### Attractor Characterization

```python
from attractors import AttractorAnalyzer

analyzer = AttractorAnalyzer()

# Reconstruct attractor
reconstruction = analyzer.reconstruct_attractor(timeseries)
print(f"Embedding dimension: {reconstruction.embedding_dimension}")
print(f"Time delay: {reconstruction.time_delay}")

# Complete characterization
props = analyzer.characterize_attractor(
    timeseries,
    lyapunov_exponents=lyap_spectrum.exponents
)

print(f"Correlation dimension: {props.correlation_dimension:.3f}")
print(f"Box-counting dimension: {props.box_counting_dimension:.3f}")
print(f"Information dimension: {props.information_dimension:.3f}")
```

### DeepSeek Theoretical Analysis

```python
from deepseek_chaos import DeepSeekChaosAnalyzer

analyzer = DeepSeekChaosAnalyzer()

# Lyapunov theory
lyap_theory = analyzer.analyze_lyapunov_exponents(system_definition)

# Bifurcation theory
bif_theory = analyzer.analyze_bifurcations(system_definition)

# Edge of chaos
edge_theory = analyzer.analyze_edge_of_chaos(system_definition)

# Synchronization
sync_theory = analyzer.analyze_synchronization(oscillator_definitions)
```

## Module Reference

### `lyapunov.py`

**Classes:**
- `LyapunovComputer` - Computes complete Lyapunov spectrum
- `LyapunovSpectrum` - Container for results

**Methods:**
- `from_jacobian()` - Benettin's QR algorithm (most accurate)
- `from_timeseries_wolf()` - Wolf algorithm (classic)
- `from_timeseries_rosenstein()` - Fast, small datasets
- `from_timeseries_kantz()` - Robust to noise
- `complete_spectrum_ode()` - Full spectrum from ODE

**Example:**
```python
spectrum = computer.from_jacobian(
    jacobian_func=lambda x: compute_jacobian(x),
    trajectory=trajectory,
    dt=0.01
)

print(f"λ₁ = {spectrum.largest_exponent:.4f}")
print(f"Chaos: {spectrum.chaos_indicated}")
print(f"Horizon: {spectrum.predictability_horizon:.2f}")
```

### `bifurcation.py`

**Classes:**
- `BifurcationAnalyzer` - Detects and classifies bifurcations
- `FixedPoint`, `BifurcationPoint`, `BifurcationDiagram` - Data structures

**Methods:**
- `find_fixed_points()` - Locate equilibria
- `detect_saddle_node_bifurcations()` - Fold bifurcations
- `detect_hopf_bifurcations()` - Limit cycle creation
- `detect_period_doubling()` - Flip bifurcations
- `continuation()` - Pseudo-arclength continuation
- `bifurcation_diagram_1d()` - Generate bifurcation diagrams
- `feigenbaum_analysis()` - Compute Feigenbaum constants

### `attractors.py`

**Classes:**
- `AttractorAnalyzer` - Analyzes strange attractors
- `AttractorProperties`, `EmbeddingResult` - Result containers

**Methods:**
- `takens_embedding()` - Phase space reconstruction
- `find_optimal_delay()` - Mutual information method
- `find_optimal_dimension()` - False nearest neighbors
- `box_counting_dimension()` - Capacity dimension
- `correlation_dimension()` - Grassberger-Procaccia
- `information_dimension()` - Information-based dimension
- `lyapunov_dimension()` - Kaplan-Yorke formula
- `characterize_attractor()` - Complete analysis

### `edge_chaos.py`

**Classes:**
- `ODEIntegrator` - Numerical integration
- `ChaoticSystems` - Common chaotic systems
- `PoincareSection` - Poincaré section analysis
- `TimeSeriesAnalysis` - Time series tools

**ODE Integrators:**
- `runge_kutta_4()` - Classic RK4
- `runge_kutta_fehlberg()` - Adaptive step size
- `velocity_verlet()` - Symplectic (Hamiltonian)
- `leapfrog()` - Time-reversible

**Chaotic Systems:**
- `lorenz()` - Lorenz attractor
- `rossler()` - Rössler attractor
- `henon_map()` - Hénon map
- `logistic_map()` - Logistic map
- `duffing()` - Duffing oscillator

### `deepseek_chaos.py`

**Classes:**
- `DeepSeekChaosAnalyzer` - AI-powered theoretical analysis
- `DeepSeekAgentChaos` - Specialized for agent systems

**Methods:**
- `analyze_lyapunov_exponents()` - Derive LTE theory
- `analyze_bifurcations()` - Bifurcation theory
- `analyze_strange_attractors()` - Attractor mathematics
- `analyze_routes_to_chaos()` - Route mechanisms
- `analyze_edge_of_chaos()` - Criticality analysis
- `analyze_synchronization()` - Sync theory

### `run_all.py`

**Classes:**
- `ChaosAnalysisOrchestrator` - Master coordinator
- `ChaosAnalysisReport` - Complete analysis report

**Convenience Functions:**
- `analyze_lorenz()` - Full Lorenz analysis
- `analyze_logistic_map()` - Full logistic map analysis
- `analyze_roessler()` - Full Rössler analysis

## Mathematical Background

### Lyapunov Exponents

Measure exponential divergence of nearby trajectories:

```
λ = lim_{t→∞} (1/t) log(|δx(t)| / |δx(0)|)
```

- λ₁ > 0: Chaos (exponential divergence)
- λ₁ = 0: Edge of chaos
- λ₁ < 0: Stable dynamics

### Bifurcations

Qualitative changes as parameters vary:

- **Saddle-node**: Fixed points appear/disappear
- **Hopf**: Limit cycle birth
- **Period-doubling**: Route to chaos
- **Feigenbaum δ = 4.669...**: Universal constant

### Fractal Dimensions

- **Box-counting**: d_B = lim N(ε)/ε^{-d}
- **Correlation**: d_C from Grassberger-Procaccia
- **Lyapunov**: d_L = j + Σλ_i/|λ_{j+1}|

### Edge of Chaos

Critical regime between order and chaos:
- Maximum computational capability
- Self-organized criticality
- Power laws and 1/f noise
- Optimal complexity

## DeepSeek Integration

The suite uses DeepSeek API to derive rigorous mathematical analysis:

```python
analyzer = DeepSeekChaosAnalyzer(
    api_key="YOUR_API_KEY"
)

# Get theoretical analysis
theory = analyzer.analyze_lyapunov_exponents(system)
print(theory['analytical_form'])
```

DeepSeek provides:
- Exact mathematical derivations
- Existence/uniqueness theorems
- Stability analysis
- Normal forms
- Numerical methods with error bounds

## Applications to POLLN

### Agent Network Dynamics

```python
from deepseek_chaos import DeepSeekAgentChaos

analyzer = DeepSeekAgentChaos()

# Analyze agent network
results = analyzer.analyze_agent_network_dynamics(
    n_agents=100,
    coupling_strength=0.5,
    interaction_topology="small_world"
)

# Find optimal chaos point
optimal = analyzer.find_optimal_chaos_point({
    'coupling': (0, 1),
    'temperature': (0, 2)
)
```

### Edge of Chaos for Learning

```python
# Locate critical operating point
edge_analysis = analyzer.analyze_edge_of_chaos(agent_system)

if edge_analysis['edge_criteria']['lambda_1'] ≈ 0:
    print("System at edge of chaos - optimal for learning")
```

## Testing

```bash
# Test individual modules
python lyapunov.py
python bifurcation.py
python attractors.py
python edge_chaos.py

# Test full analysis
python run_all.py

# Test without DeepSeek
python run_all.py --no-deepseek
```

## Output

Analysis generates:
- JSON reports with all metrics
- Bifurcation diagrams
- Lyapunov spectra
- Fractal dimensions
- Theoretical derivations

## References

- Strogatz, "Nonlinear Dynamics and Chaos"
- Ott, "Chaos in Dynamical Systems"
- Kantz & Schreiber, "Nonlinear Time Series Analysis"
- Parker & Chua, "Practical Numerical Algorithms for Chaotic Systems"
- Wolf et al., "Determining Lyapunov exponents from a time series"

## License

MIT License - See LICENSE file for details.

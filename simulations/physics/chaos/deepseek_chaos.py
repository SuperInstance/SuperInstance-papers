"""
DeepSeek Chaos Theory Integration Module
========================================

Uses DeepSeek API to derive and analyze chaotic dynamics,
bifurcations, and nonlinear phenomena in agent systems.
"""

import openai
import json
import numpy as np
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import hashlib


@dataclass
class ChaosDerivation:
    """Container for chaos theory derivations from DeepSeek."""
    system_description: str
    lyapunov_exponents: Dict[str, Any]
    bifurcation_analysis: Dict[str, Any]
    attractor_properties: Dict[str, Any]
    route_to_chaos: Dict[str, Any]
    mathematical_proofs: List[str]
    numerical_methods: List[Dict[str, Any]]
    insights: List[str]


class DeepSeekChaosAnalyzer:
    """
    DeepSeek-powered chaos theory analysis engine.

    Derives rigorous mathematical analysis of chaotic systems
    including Lyapunov exponents, bifurcations, and attractors.
    """

    def __init__(self, api_key: str = "YOUR_API_KEY"):
        """Initialize DeepSeek client with chaos expertise."""
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )

        self.system_prompt = """You are a world-class expert in:
- Chaos theory and nonlinear dynamics
- Bifurcation theory and normal forms
- Ergodic theory and statistical mechanics
- Fractal geometry and multifractals
- Synchronization and coupled oscillators
- Complex systems and emergence

Provide rigorous mathematical analysis including:
1. Exact equations and derivations
2. Existence/uniqueness theorems
3. Stability analysis (linearization, Hartman-Grobman)
4. Center manifold reduction
5. Normal form computations
6. Numerical methods with error bounds
7. Mathematical proofs where applicable

Use LaTeX notation for equations. Be precise and rigorous."""

        self.cache = {}

    def _cache_key(self, content: str) -> str:
        """Generate cache key for query."""
        return hashlib.md5(content.encode()).hexdigest()

    def _make_request(self, user_content: str, temperature: float = 0.0) -> str:
        """Make DeepSeek API request with caching."""
        cache_key = self._cache_key(user_content)

        if cache_key in self.cache:
            return self.cache[cache_key]

        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=temperature
        )

        result = response.choices[0].message.content
        self.cache[cache_key] = result
        return result

    def analyze_lyapunov_exponents(self, system: Dict[str, Any]) -> Dict[str, Any]:
        """
        Derive Lyapunov exponent computation for a dynamical system.

        Args:
            system: Dictionary containing:
                - equations: List of differential/difference equations
                - variables: State variable names
                - parameters: System parameters
                - jacobian: Jacobian matrix (if available)

        Returns:
            Dictionary with:
                - analytical_form: Analytical expressions
                - numerical_methods: Wolf, Rosenstein, Kantz algorithms
                - spectrum: Complete Lyapunov spectrum derivation
                - predictability_horizon: Time horizon estimates
        """
        prompt = f"""Derive the complete Lyapunov spectrum analysis for this dynamical system:

System Equations:
{json.dumps(system.get('equations', []), indent=2)}

Variables: {system.get('variables', [])}
Parameters: {system.get('parameters', {})}

Provide:
1. Jacobian matrix J(x) computation
2. Linearized dynamics: δẋ = J(x)δx
3. QR decomposition method for spectrum
4. Largest Lyapunov exponent (λ₁) analytical form
5. Complete spectrum (λ₁ ≥ λ₂ ≥ ... ≥ λₙ)
6. Numerical methods:
   - Wolf algorithm (for continuous systems)
   - Rosenstein method (from time series)
   - Kantz method (local divergence)
7. Predictability horizon: t ~ 1/λ₁
8. Chaos condition: λ₁ > 0
9. Mathematical proofs of convergence"""

        response = self._make_request(prompt)

        return {
            "analytical_form": response,
            "numerical_methods": self._extract_methods(response),
            "spectrum_formula": self._extract_latex(response),
            "chaos_condition": "λ₁ > 0",
            "insights": self._extract_insights(response)
        }

    def analyze_bifurcations(self, system: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform complete bifurcation analysis.

        Args:
            system: System with equations and parameters

        Returns:
            Bifurcation analysis including:
                - Fixed points and stability
                - Saddle-node bifurcations
                - Hopf bifurcations
                - Period doubling
                - Normal forms
                - Continuation methods
        """
        prompt = f"""Perform comprehensive bifurcation analysis for:

System:
{json.dumps(system.get('equations', []), indent=2)}

Parameters: {system.get('parameters', {})}

Provide:
1. Fixed point analysis:
   - Solve f(x*, μ) = 0
   - Linear stability: eigenvalues of J(x*)

2. Saddle-node (fold) bifurcation:
   - Condition: det(J) = 0
   - Normal form: ẋ = μ ± x²
   - Bifurcation point computation

3. Hopf bifurcation:
   - Condition: Tr(J) = 0, Det(J) > 0
   - Normal form: ẋ = μx - ωy + ... , ẏ = ωx + μy + ...
   - Limit cycle amplitude: r ≈ √(μ/α)
   - First Lyapunov coefficient (l₁)

4. Period-doubling (flip) bifurcation:
   - Normal form: x_{n+1} = -(1+μ)x_n + x_n³
   - Feigenbaum constant: δ = 4.669201...

5. Numerical continuation:
   - Pseudo-arclength continuation
   - Predictor-corrector methods

6. Bifurcation diagram structure"""

        response = self._make_request(prompt)

        return {
            "fixed_points": self._extract_section(response, "Fixed point"),
            "saddle_node": self._extract_section(response, "Saddle-node"),
            "hopf": self._extract_section(response, "Hopf"),
            "period_doubling": self._extract_section(response, "Period-doubling"),
            "normal_forms": self._extract_latex(response),
            "feigenbaum_delta": "4.669201609102990671853203820466...",
            "insights": self._extract_insights(response)
        }

    def analyze_strange_attractors(self, timeseries: np.ndarray) -> Dict[str, Any]:
        """
        Analyze strange attractors from time series data.

        Args:
            timeseries: 1D or multi-dimensional time series

        Returns:
            Attractor analysis including:
                - Takens embedding theorem
                - Embedding dimension
                - Fractal dimensions
                - Attractor reconstruction
        """
        n_points = len(timeseries)

        prompt = f"""Derive strange attractor analysis for time series with {n_points} points.

Provide:
1. Takens Embedding Theorem:
   - Reconstruction: y_n = [x_n, x_{n-τ}, ..., x_{n-(d-1)τ}]
   - Embedding dimension: d ≥ 2D + 1 (D = attractor dimension)
   - Time delay τ: mutual information, autocorrelation
   - False nearest neighbors method

2. Fractal Dimensions:
   - Box-counting: d_B = lim_{ε→0} log(N(ε))/log(1/ε)
   - Correlation dimension: d_C = lim_{r→0} d(log C(r))/d(log r)
   - Information dimension: d_I = lim_{ε→0} Σ p_i log(p_i)/log(ε)
   - Pointwise dimension: d_p(x) = lim_{r→0} log(C(x,r))/log(r)
   - Multifractal spectrum: f(α)

3. Attractor Characterization:
   - Lyapunov dimension: d_L = j + (λ₁+...+λ_j)/|λ_{j+1}|
   - Kaplan-Yorke conjecture: d_L ≈ d_C
   - Correlation dimension estimation

4. Numerical Algorithms:
   - Grassberger-Procaccia (d_C)
   - Gaussian kernel method
   - Box-counting with optimization

5. Classic Attractors:
   - Lorenz: σ=10, ρ=28, β=8/3, d_C ≈ 2.06
   - Rössler: d_C ≈ 2.01
   - Henon: d_C ≈ 1.26"""

        response = self._make_request(prompt)

        return {
            "takens_embedding": self._extract_section(response, "Takens"),
            "embedding_dimension": "Use false nearest neighbors",
            "time_delay": "Use first minimum of mutual information",
            "fractal_dimensions": self._extract_section(response, "Fractal"),
            "algorithms": self._extract_methods(response),
            "classic_attractors": self._extract_section(response, "Classic"),
            "insights": self._extract_insights(response)
        }

    def analyze_routes_to_chaos(self, system: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze routes to chaos in the system.

        Args:
            system: System equations and parameters

        Returns:
            Route analysis including:
                - Period doubling cascade
                - Intermittency
                - Quasiperiodicity
                - Crisis
        """
        prompt = f"""Analyze routes to chaos for:

System:
{json.dumps(system.get('equations', []), indent=2)}

Provide:
1. Period Doubling Route (Feigenbaum):
   - Logistic map: x_{n+1} = rx_n(1-x_n)
   - Bifurcation points: r_n converge geometrically
   - Feigenbaum constants:
     * δ = lim (r_n - r_{n-1})/(r_{n+1} - r_n) = 4.669...
     * α = lim a_n/a_{n+1} = 2.502907875...
   - Self-similarity: universal scaling
   - Renormalization group derivation

2. Intermittency (Pomeau-Manneville):
   - Type I: Saddle-node on limit cycle
   - Type II: Subcritical Hopf
   - Type III: Inverse period doubling
   - Laminar phases: τ_laminar ~ (μ-μ_c)^{-γ}
   - Probability distribution: P(l) ~ l^{-(1+γ)}

3. Quasiperiodicity (Ruelle-Takens):
   - Torus breakdown: T² → T³ → strange attractor
   - Two incommensurate frequencies
   - Circle map: θ_{n+1} = θ_n + Ω - K sin(2πθ_n)
   - Critical coupling: K_c = 1
   - Devil's staircase structure

4. Crisis:
   - Sudden expansion of attractor
   - Boundary collision
   - Intermittent bursts
   - Hysteresis effects

5. Detection Methods:
   - Power spectrum analysis
   - Return maps (Poincaré section)
   - Bifurcation diagrams
   - Lyapunov exponent tracking"""

        response = self._make_request(prompt)

        return {
            "period_doubling": self._extract_section(response, "Period Doubling"),
            "intermittency": self._extract_section(response, "Intermittency"),
            "quasiperiodicity": self._extract_section(response, "Quasiperiodicity"),
            "crisis": self._extract_section(response, "Crisis"),
            "detection_methods": self._extract_methods(response),
            "feigenbaum_constants": {
                "delta": "4.669201609102990671853203820466...",
                "alpha": "2.502907875095892822283902873218..."
            },
            "insights": self._extract_insights(response)
        }

    def analyze_edge_of_chaos(self, system: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze the edge of chaos - criticality between order and chaos.

        Args:
            system: System description

        Returns:
            Edge of chaos analysis:
                - Self-organized criticality
                - Power laws
                - 1/f noise
                - Optimal complexity
        """
        prompt = f"""Analyze the edge of chaos for:

System:
{json.dumps(system.get('equations', []), indent=2)}

Provide:
1. Self-Organized Criticality (SOC):
   - Bak-Tang-Wiesenfeld sandpile
   - Critical state: no characteristic scale
   - Avalanche statistics: P(s) ~ s^{-τ}
   - SOC conditions:
     * Slow driving
     * Threshold dynamics
     * Nonlinear redistribution

2. Power Law Signatures:
   - Distribution: P(x) ~ x^{-α}
   - PDF: p(x) = Cx^{-α} for x ≥ x_min
   - Estimation: Maximum likelihood, Hill estimator
   - Goodness-of-fit: Kolmogorov-Smirnov
   - Power law ranges: spanning decades

3. 1/f Noise (Flicker noise):
   - Power spectrum: S(f) ~ f^{-β}, β ≈ 1
   - Long-range correlations
   - Relation to criticality
   - Origins: SOC, relaxation processes

4. Edge of Chaos Criteria:
   - λ₁ ≈ 0 (largest Lyapunov near zero)
   - Critical slowing down
   - Maximum information capacity
   - Optimal computational capability
   - Balance between stability and flexibility

5. Measures of Complexity:
   - Statistical complexity: C = H/H_max
   - Lempel-Ziv complexity
   - Mutual information
   - Transfer entropy

6. Critical Exponents:
   - Correlation length: ξ ~ |μ-μ_c|^{-ν}
   - Order parameter: φ ~ (μ-μ_c)^{β}
   - Susceptibility: χ ~ |μ-μ_c|^{-γ}
   - Scaling relations"""

        response = self._make_request(prompt)

        return {
            "soc": self._extract_section(response, "Self-Organized"),
            "power_laws": self._extract_section(response, "Power Law"),
            "f_noise": self._extract_section(response, "1/f"),
            "edge_criteria": self._extract_section(response, "Edge"),
            "complexity_measures": self._extract_section(response, "Measures"),
            "critical_exponents": self._extract_section(response, "Critical"),
            "insights": self._extract_insights(response)
        }

    def analyze_synchronization(self, oscillators: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze synchronization in coupled oscillator systems.

        Args:
            oscillators: List of oscillator definitions

        Returns:
            Synchronization analysis:
                - Kuramoto model
                - Phase locking
                - Chimera states
        """
        n_osc = len(oscillators)

        prompt = f"""Analyze synchronization for {n_osc} coupled oscillators.

Provide:
1. Kuramoto Model:
   - Phase dynamics: θ̇ᵢ = ωᵢ + (K/N)Σ sin(θ_j - θ_i)
   - Order parameter: r = |(1/N)Σ e^{iθ_j}|
   - Synchronization: r → 1 for K > K_c
   - Critical coupling: K_c = 2/(πg(0))

2. Phase Locking:
   - Condition: |ω_i - ω_j| < K|H'(φ*)|
   - Arnold tongues: synchronization regions
   - Devil's staircase structure

3. Complete Synchronization:
   - Identical systems: ẋᵢ = f(x_i) + KΣ(x_j - x_i)
   - Synchronization manifold: x₁ = x₂ = ... = x_N
   - MSF (Master Stability Function)
   - Largest transverse Lyapunov exponent: Λ(K)

4. Chimera States:
   - Coexistence: synchronized + desynchronized
   - Symmetry-breaking
   - Phase-lag configurations
   - Detection: local order parameters

5. Network Topology Effects:
   - Small-world networks (Watts-Strogatz)
   - Scale-free networks (Barabási-Albert)
   - Eigenvalue spectrum of Laplacian

6. Measurement:
   - Phase synchronization index
   - Mutual information
   - Granger causality
   - Transfer entropy"""

        response = self._make_request(prompt)

        return {
            "kuramoto": self._extract_section(response, "Kuramoto"),
            "phase_locking": self._extract_section(response, "Phase"),
            "complete_sync": self._extract_section(response, "Complete"),
            "chimera": self._extract_section(response, "Chimera"),
            "network_effects": self._extract_section(response, "Network"),
            "measurement": self._extract_section(response, "Measurement"),
            "insights": self._extract_insights(response)
        }

    def derive_ode_integrator(self, system: Dict[str, Any], method: str = "RK4") -> Dict[str, Any]:
        """
        Derive ODE integration scheme.

        Args:
            system: System equations
            method: Integration method (RK4, Verlet, etc.)

        Returns:
            Integration scheme derivation and error analysis
        """
        prompt = f"""Derive the {method} integrator for:

System:
{json.dumps(system.get('equations', []), indent=2)}

Provide:
1. Method formulation:
   - Update equations
   - Coefficients
   - Algorithm steps

2. Error analysis:
   - Local truncation error
   - Global error
   - Stability region
   - CFL condition

3. Adaptive step size:
   - Error estimation
   - Step size control
   - PI/PI controllers

4. Symplectic integrators (for Hamiltonian):
   - Verlet, leapfrog
   - Energy conservation
   - Symplecticity condition

5. Stiff systems:
   - Implicit methods (Backward Euler, BDF)
   - Rosenbrock methods
   - Stability for stiff equations"""

        response = self._make_request(prompt)

        return {
            "method": method,
            "formulation": response,
            "stability": self._extract_section(response, "Stability"),
            "error_analysis": self._extract_section(response, "Error"),
            "adaptive": self._extract_section(response, "Adaptive"),
            "insights": self._extract_insights(response)
        }

    def analyze_poincare_section(self, system: Dict[str, Any]) -> Dict[str, Any]:
        """
        Derive Poincaré section analysis.

        Args:
            system: System equations

        Returns:
            Poincaré section methodology
        """
        prompt = f"""Derive Poincaré section analysis for:

System:
{json.dumps(system.get('equations', []), indent=2)}

Provide:
1. Poincaré Section Definition:
   - Hyperplane Σ in phase space
   - Intersection conditions: Σ·ẋ = 0
   - Return map: P: Σ → Σ

2. Fixed Points on Section:
   - Period-1: P(x*) = x*
   - Period-n: P^n(x*) = x*
   - Stability: eigenvalues of DP(x*)

3. Section Selection:
   - Natural sections (e.g., θ = 0 mod 2π)
   - Surface of section
   - Multiple sections

4. Numerical Methods:
   - Event detection
   - Root finding (Newton, bisection)
   - Interpolation to section

5. Return Maps:
   - 1D maps from section
   - Bifurcation analysis
   - Lyapunov exponents from map

6. Applications:
   - Limit cycles → fixed points
   - Tori → closed curves
   - Strange attractors → fractal structures"""

        response = self._make_request(prompt)

        return {
            "definition": self._extract_section(response, "Definition"),
            "fixed_points": self._extract_section(response, "Fixed"),
            "selection": self._extract_section(response, "Selection"),
            "numerical": self._extract_methods(response),
            "return_maps": self._extract_section(response, "Return"),
            "applications": self._extract_section(response, "Application"),
            "insights": self._extract_insights(response)
        }

    def _extract_methods(self, text: str) -> List[Dict[str, str]]:
        """Extract numerical methods from response."""
        methods = []
        lines = text.split('\n')
        current_method = None

        for line in lines:
            if line.strip().startswith(('1.', '2.', '3.', '4.', '5.', '-', '*')):
                if current_method:
                    methods.append(current_method)
                current_method = {"name": line.strip(), "description": ""}
            elif current_method and line.strip():
                current_method["description"] += line + "\n"

        if current_method:
            methods.append(current_method)

        return methods

    def _extract_section(self, text: str, keyword: str) -> str:
        """Extract section containing keyword."""
        lines = text.split('\n')
        result = []
        capturing = False

        for line in lines:
            if keyword.lower() in line.lower():
                capturing = True
            if capturing:
                result.append(line)
                if len(result) > 50:  # Limit section length
                    break

        return '\n'.join(result) if result else "Section not found"

    def _extract_latex(self, text: str) -> List[str]:
        """Extract LaTeX equations from text."""
        import re
        pattern = r'\$[^$]+\$'
        return re.findall(pattern, text)

    def _extract_insights(self, text: str) -> List[str]:
        """Extract key insights from text."""
        insights = []
        lines = text.split('\n')

        for line in lines:
            if any(word in line.lower() for word in
                   ['insight', 'key', 'important', 'note', 'critical']):
                if len(line.strip()) > 10:
                    insights.append(line.strip())

        return insights[:10]  # Top 10 insights

    def derive_agent_chaos_analysis(self, agent_system: Dict[str, Any]) -> ChaosDerivation:
        """
        Complete chaos theory analysis for an agent system.

        Args:
            agent_system: Dictionary describing agent system

        Returns:
            Complete ChaosDerivation with all analysis components
        """
        return ChaosDerivation(
            system_description=str(agent_system),
            lyapunov_exponents=self.analyze_lyapunov_exponents(agent_system),
            bifurcation_analysis=self.analyze_bifurcations(agent_system),
            attractor_properties=self.analyze_strange_attractors(
                agent_system.get('timeseries', np.random.randn(1000))
            ),
            route_to_chaos=self.analyze_routes_to_chaos(agent_system),
            mathematical_proofs=self._extract_proofs(agent_system),
            numerical_methods=self._get_all_numerical_methods(),
            insights=self._generate_system_insights(agent_system)
        )

    def _extract_proofs(self, system: Dict[str, Any]) -> List[str]:
        """Extract mathematical proofs for the system."""
        prompt = f"""Provide mathematical proofs for the dynamical system:

{json.dumps(system.get('equations', []), indent=2)}

Include proofs of:
1. Existence and uniqueness of solutions
2. Lyapunov exponent convergence
3. Bifurcation conditions
4. Stability theorems
5. Attractor existence"""

        response = self._make_request(prompt)
        return response.split('\n\n')

    def _get_all_numerical_methods(self) -> List[Dict[str, Any]]:
        """Get all numerical methods for chaos analysis."""
        return [
            {"name": "Wolf Algorithm", "use": "Lyapunov exponents from time series"},
            {"name": "Rosenstein Algorithm", "use": "Fast LTE computation"},
            {"name": "Kantz Algorithm", "use": "Local divergence rates"},
            {"name": "Grassberger-Procaccia", "use": "Correlation dimension"},
            {"name": "False Nearest Neighbors", "use": "Embedding dimension"},
            {"name": "BDS Test", "use": "Nonlinearity detection"},
            {"name": "Surrogate Data", "use": "Testing for chaos"}
        ]

    def _generate_system_insights(self, system: Dict[str, Any]) -> List[str]:
        """Generate insights specific to the agent system."""
        prompt = f"""Provide key insights about chaos and emergence in this agent system:

{json.dumps(system, indent=2)}

Focus on:
1. How chaos enables adaptive behavior
2. Edge of chaos as optimal operating point
3. Synchronization for coordination
4. Bifurcations as phase transitions
5. Emergence from nonlinear interactions"""

        response = self._make_request(prompt)
        return response.split('\n')


class DeepSeekAgentChaos:
    """
    Specialized chaos analysis for agent systems.
    """

    def __init__(self, api_key: str = "YOUR_API_KEY"):
        self.analyzer = DeepSeekChaosAnalyzer(api_key)

    def analyze_agent_network_dynamics(
        self,
        n_agents: int,
        coupling_strength: float,
        interaction_topology: str
    ) -> Dict[str, Any]:
        """Analyze chaos in agent network dynamics."""

        system = {
            "type": "agent_network",
            "n_agents": n_agents,
            "coupling": coupling_strength,
            "topology": interaction_topology,
            "equations": [
                "dx_i/dt = f(x_i) + K * sum_{j} A_ij * (x_j - x_i)"
            ]
        }

        return {
            "lyapunov_spectrum": self.analyzer.analyze_lyapunov_exponents(system),
            "synchronization": self.analyzer.analyze_synchronization(
                [{"id": i} for i in range(n_agents)]
            ),
            "bifurcations": self.analyzer.analyze_bifurcations(system),
            "edge_of_chaos": self.analyzer.analyze_edge_of_chaos(system)
        }

    def find_optimal_chaos_point(
        self,
        parameter_ranges: Dict[str, tuple]
    ) -> Dict[str, Any]:
        """Find parameters at edge of chaos."""

        prompt = f"""Find the edge of chaos for an agent system with parameters:

{json.dumps(parameter_ranges, indent=2)}

Provide:
1. Critical parameter values (λ₁ ≈ 0)
2. Bifurcation points
3. Phase transitions
4. Optimal operating regimes
5. Computational capability maximization"""

        response = self.analyzer._make_request(prompt)

        return {
            "critical_parameters": self.analyzer._extract_section(response, "Critical"),
            "bifurcation_points": self.analyzer._extract_section(response, "Bifurcation"),
            "optimal_regimes": self.analyzer._extract_section(response, "Optimal"),
            "analysis": response
        }


if __name__ == "__main__":
    # Test DeepSeek chaos analyzer
    analyzer = DeepSeekChaosAnalyzer()

    # Example: Logistic map
    logistic_system = {
        "equations": ["x_{n+1} = r * x_n * (1 - x_n)"],
        "variables": ["x"],
        "parameters": {"r": "bifurcation parameter"}
    }

    print("=" * 60)
    print("LOGISTIC MAP - LYAPUNOV EXPONENT ANALYSIS")
    print("=" * 60)
    lyap_analysis = analyzer.analyze_lyapunov_exponents(logistic_system)
    print(lyap_analysis["analytical_form"][:500])

    print("\n" + "=" * 60)
    print("LOGISTIC MAP - BIFURCATION ANALYSIS")
    print("=" * 60)
    bif_analysis = analyzer.analyze_bifurcations(logistic_system)
    print(bif_analysis["period_doubling"][:500])

"""
DeepSeek Integration for Control Theory Analysis

This module provides an interface to DeepSeek's API for deriving
control-theoretic models and stability proofs for POLLN.
"""

import openai
import json
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import hashlib
import time

@dataclass
class ControlAnalysis:
    """Container for control-theoretic analysis results"""
    state_space_model: Dict[str, Any]
    lyapunov_function: Optional[str]
    stability_proof: Optional[str]
    transfer_function: Optional[str]
    bode_analysis: Optional[Dict[str, Any]]
    nyquist_analysis: Optional[Dict[str, Any]]
    robustness_margins: Optional[Dict[str, Any]]
    recommendations: List[str]


class DeepSeekControlTheorist:
    """
    Interface to DeepSeek API for control theory analysis.

    This class leverages DeepSeek's advanced mathematical reasoning
    to derive rigorous control-theoretic models and stability proofs.
    """

    def __init__(self, api_key: str = "YOUR_API_KEY"):
        """
        Initialize DeepSeek client for control theory.

        Args:
            api_key: DeepSeek API key
        """
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )

        # Cache for expensive analyses
        self.analysis_cache: Dict[str, ControlAnalysis] = {}

        # System prompt for control theory expertise
        self.system_prompt = """You are an expert in control theory, dynamical systems,
and stability analysis with deep knowledge of:

1. State-space modeling and canonical forms
2. Lyapunov stability theory (direct and indirect methods)
3. Frequency domain analysis (Bode, Nyquist, Nichols)
4. Robust control (H-infinity, mu-synthesis, small-gain theorem)
5. Optimal control (LQR, MPC, Pontryagin's maximum principle)
6. Adaptive control (MRAC, Lyapunov-based adaptation)
7. Nonlinear systems and bifurcation theory
8. Stochastic systems and filtering

Provide rigorous mathematical derivations including:
- Complete state-space representations
- Transfer function derivations
- Lyapunov function construction
- Formal stability proofs
- Convergence analysis
- Robustness margins
- Controller synthesis

Always include mathematical notation, step-by-step derivations,
and formal proofs where applicable."""

    def _create_cache_key(self, system_description: str) -> str:
        """Create cache key from system description"""
        return hashlib.md5(system_description.encode()).hexdigest()

    def analyze_stability(self, system_description: str,
                         use_cache: bool = True) -> ControlAnalysis:
        """
        Perform comprehensive control-theoretic stability analysis.

        Args:
            system_description: Description of the system to analyze
            use_cache: Whether to use cached results

        Returns:
            ControlAnalysis object with complete analysis
        """
        cache_key = self._create_cache_key(system_description)

        if use_cache and cache_key in self.analysis_cache:
            print(f"Using cached analysis for {cache_key[:8]}...")
            return self.analysis_cache[cache_key]

        print(f"Performing DeepSeek control theory analysis...")

        # Perform parallel analyses
        state_space = self._derive_state_space(system_description)
        lyapunov = self._derive_lyapunov(system_description)
        frequency = self._derive_frequency_response(system_description)
        robustness = self._analyze_robustness(system_description)

        analysis = ControlAnalysis(
            state_space_model=state_space,
            lyapunov_function=lyapunov['lyapunov_function'],
            stability_proof=lyapunov['stability_proof'],
            transfer_function=frequency['transfer_function'],
            bode_analysis=frequency['bode_analysis'],
            nyquist_analysis=frequency['nyquist_analysis'],
            robustness_margins=robustness,
            recommendations=self._generate_recommendations(
                state_space, lyapunov, frequency, robustness
            )
        )

        if use_cache:
            self.analysis_cache[cache_key] = analysis

        return analysis

    def _derive_state_space(self, system: str) -> Dict[str, Any]:
        """Derive state-space model using DeepSeek"""

        prompt = f"""Analyze the following system and derive its state-space representation:

{system}

Provide:
1. State variables and their physical meaning
2. State equation: ẋ = Ax + Bu
3. Output equation: y = Cx + Du
4. System matrices A, B, C, D
5. Controllability matrix and rank
6. Observability matrix and rank
7. Minimal realization (if applicable)
8. Eigenvalues of A (poles)
9. System type and order
10. Canonical form transformation

Include all mathematical derivations."""

        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )

        result = response.choices[0].message.content

        # Parse matrices from response
        matrices = self._extract_matrices(result)

        return {
            'derivation': result,
            'matrices': matrices,
            'controllability': self._compute_controllability(matrices),
            'observability': self._compute_observability(matrices)
        }

    def _derive_lyapunov(self, system: str) -> Dict[str, str]:
        """Derive Lyapunov function and stability proof"""

        prompt = f"""Perform Lyapunov stability analysis for the following system:

{system}

Provide:
1. Equilibrium points
2. Candidate Lyapunov function V(x)
3. Time derivative V̇(x) along trajectories
4. Definiteness analysis (positive definite, negative definite, etc.)
5. Stability conclusion (stable, asymptotically stable, exponentially stable)
6. Region of attraction estimation
7. Formal stability proof with mathematical rigor
8. Comparison with Lyapunov's indirect method (linearization)

Use Lyapunov's direct method. Include complete mathematical derivations."""

        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )

        return {
            'lyapunov_function': response.choices[0].message.content,
            'stability_proof': response.choices[0].message.content
        }

    def _derive_frequency_response(self, system: str) -> Dict[str, Any]:
        """Derive transfer function and frequency domain analysis"""

        prompt = f"""Perform frequency domain analysis for the following system:

{system}

Provide:
1. Transfer function G(s) derivation
2. Poles, zeros, and gain
3. Bode plot analysis:
   - Magnitude plot characteristics
   - Phase plot characteristics
   - Crossover frequencies
   - Bandwidth
4. Nyquist plot analysis:
   - Encirclements of -1
   - Stability assessment
   - Gain margin
   - Phase margin
5. Closed-loop stability (Nyquist criterion)
6. Sensitivity function S(s)
7. Complementary sensitivity T(s)

Include all mathematical derivations and frequency calculations."""

        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )

        result = response.choices[0].message.content

        return {
            'transfer_function': result,
            'bode_analysis': self._extract_bode_data(result),
            'nyquist_analysis': self._extract_nyquist_data(result)
        }

    def _analyze_robustness(self, system: str) -> Dict[str, Any]:
        """Analyze robustness and uncertainty"""

        prompt = f"""Perform robustness analysis for the following system:

{system}

Provide:
1. Uncertainty modeling (parametric, dynamic, unstructured)
2. H-infinity norm computation
3. Small-gain theorem application
4. Robust stability margins
5. Disk margins (gain and phase)
6. Structured singular value (mu) analysis
7. Robust performance analysis
8. Worst-case perturbation analysis

Include mathematical derivations for robustness guarantees."""

        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )

        result = response.choices[0].message.content

        return {
            'analysis': result,
            'h_infinity_norm': self._extract_h_infinity_norm(result),
            'gain_margin': self._extract_gain_margin(result),
            'phase_margin': self._extract_phase_margin(result),
            'disk_margins': self._extract_disk_margins(result)
        }

    def design_controller(self, system: str,
                        control_type: str = "LQR") -> Dict[str, Any]:
        """
        Design controller using DeepSeek.

        Args:
            system: System description
            control_type: Type of controller (LQR, H-infinity, MPC, PID)

        Returns:
            Controller design and analysis
        """

        control_prompts = {
            "LQR": """Design a Linear Quadratic Regulator (LQR) for this system.
Provide:
1. Cost function weighting matrices Q and R selection
2. Algebraic Riccati equation solution
3. Optimal feedback gain K
4. Closed-loop dynamics
5. Cost-to-go function V(x)
6. Stability proof
7. LQR robustness properties (infinite gain margin, 60° phase margin)""",

            "H-infinity": """Design an H-infinity controller for this system.
Provide:
1. Performance weighting functions
2. Generalized plant formulation
3. H-infinity optimization problem
4. Controller synthesis
5. Closed-loop H-infinity norm
6. Robustness analysis""",

            "MPC": """Design a Model Predictive Controller for this system.
Provide:
1. Prediction horizon design
2. Control horizon design
3. Cost function formulation
4. Constraints formulation
5. Optimization problem
6. Feasibility analysis
7. Stability guarantees (terminal cost, constraint)""",

            "PID": """Design a PID controller for this system.
Provide:
1. Ziegler-Nichols tuning
2. Pole placement method
3. PID parameter selection
4. Closed-loop transfer function
5. Steady-state error analysis
6. Disturbance rejection
7. Robustness analysis"""
        }

        prompt = f"""{control_prompts.get(control_type, control_prompts["LQR"])}

System:
{system}"""

        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )

        return {
            'controller_type': control_type,
            'design': response.choices[0].message.content
        }

    def analyze_nonlinear_system(self, system: str) -> Dict[str, Any]:
        """Analyze nonlinear control aspects"""

        prompt = f"""Perform nonlinear system analysis:

{system}

Provide:
1. Linearization around equilibrium
2. Jacobian matrices
3. Phase portrait analysis
4. Bifurcation analysis
5. Limit cycles (Poincaré-Bendixson, describing function)
6. Input-output stability (passivity, small-gain)
7. Feedback linearization
8. Sliding mode control design
9. Backstepping design

Include rigorous mathematical analysis."""

        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )

        return {
            'nonlinear_analysis': response.choices[0].message.content
        }

    def _extract_matrices(self, text: str) -> Dict[str, np.ndarray]:
        """Extract system matrices from DeepSeek response"""
        # This is a simplified version - in production, use more sophisticated parsing
        matrices = {}

        # Look for matrix patterns in LaTeX format
        import re

        # Extract A matrix
        a_match = re.search(r'A\s*=\s*\[([^\]]+)\]', text)
        if a_match:
            # Parse matrix entries
            pass  # Implement matrix parsing

        return matrices

    def _compute_controllability(self, matrices: Dict[str, np.ndarray]) -> Dict[str, Any]:
        """Compute controllability matrix and rank"""
        if 'A' not in matrices or 'B' not in matrices:
            return {'controllable': None}

        A = matrices['A']
        B = matrices['B']
        n = A.shape[0]

        # Controllability matrix: [B AB A²B ... A^(n-1)B]
        Co = np.column_stack([B] + [np.linalg.matrix_power(A, i) @ B for i in range(1, n)])

        return {
            'controllability_matrix': Co,
            'rank': np.linalg.matrix_rank(Co),
            'controllable': np.linalg.matrix_rank(Co) == n,
            'gramian': self._compute_controllability_gramian(A, B)
        }

    def _compute_observability(self, matrices: Dict[str, np.ndarray]) -> Dict[str, Any]:
        """Compute observability matrix and rank"""
        if 'A' not in matrices or 'C' not in matrices:
            return {'observable': None}

        A = matrices['A']
        C = matrices['C']
        n = A.shape[0]

        # Observability matrix: [C; CA; CA²; ...; CA^(n-1)]
        Ob = np.vstack([C] + [C @ np.linalg.matrix_power(A, i) for i in range(1, n)])

        return {
            'observability_matrix': Ob,
            'rank': np.linalg.matrix_rank(Ob),
            'observable': np.linalg.matrix_rank(Ob) == n,
            'gramian': self._compute_observability_gramian(A, C)
        }

    def _compute_controllability_gramian(self, A: np.ndarray, B: np.ndarray) -> np.ndarray:
        """Solve Lyapunov equation for controllability Gramian"""
        from scipy import linalg
        n = A.shape[0]
        Q = B @ B.T
        Wc = linalg.solve_continuous_lyapunov(A, -Q)
        return Wc

    def _compute_observability_gramian(self, A: np.ndarray, C: np.ndarray) -> np.ndarray:
        """Solve Lyapunov equation for observability Gramian"""
        from scipy import linalg
        Q = C.T @ C
        Wo = linalg.solve_continuous_lyapunov(A.T, -Q)
        return Wo

    def _extract_bode_data(self, text: str) -> Dict[str, Any]:
        """Extract Bode plot data from analysis"""
        # Parse frequency response characteristics
        return {
            'crossover_frequency': None,
            'bandwidth': None,
            'resonance_peak': None,
            'rollup_rate': None
        }

    def _extract_nyquist_data(self, text: str) -> Dict[str, Any]:
        """Extract Nyquist plot data from analysis"""
        return {
            'encirclements': None,
            'gain_margin': None,
            'phase_margin': None,
            'stability': None
        }

    def _extract_h_infinity_norm(self, text: str) -> Optional[float]:
        """Extract H-infinity norm from analysis"""
        import re
        match = re.search(r'\|.*?\|\s*\u221E\s*=\s*([0-9.]+)', text)
        if match:
            return float(match.group(1))
        return None

    def _extract_gain_margin(self, text: str) -> Optional[float]:
        """Extract gain margin from analysis"""
        import re
        match = re.search(r'gain\s*margin[:\s]+([0-9.]+)\s*(?:dB)?', text, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return None

    def _extract_phase_margin(self, text: str) -> Optional[float]:
        """Extract phase margin from analysis"""
        import re
        match = re.search(r'phase\s*margin[:\s]+([0-9.]+)\s*(?:°|deg)?', text, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return None

    def _extract_disk_margins(self, text: str) -> Dict[str, float]:
        """Extract disk margins from analysis"""
        return {
            'upper_gain_margin': None,
            'lower_gain_margin': None,
            'phase_margin': None
        }

    def _generate_recommendations(self, state_space: Dict, lyapunov: Dict,
                                 frequency: Dict, robustness: Dict) -> List[str]:
        """Generate design recommendations from analysis"""
        recommendations = []

        # Check controllability
        if state_space.get('controllability', {}).get('controllable') is False:
            recommendations.append(
                "System is not controllable. Consider adding additional control inputs "
                "or restructuring state variables."
            )

        # Check observability
        if state_space.get('observability', {}).get('observable') is False:
            recommendations.append(
                "System is not observable. Consider adding additional sensors "
                "or restructuring output measurements."
            )

        # Check stability margins
        gm = robustness.get('gain_margin')
        pm = robustness.get('phase_margin')

        if gm is not None and gm < 6:  # Less than 6 dB
            recommendations.append(
                f"Low gain margin ({gm:.2f} dB). Increase controller robustness "
                "or reduce loop gain."
            )

        if pm is not None and pm < 45:  # Less than 45 degrees
            recommendations.append(
                f"Low phase margin ({pm:.2f}°). Increase phase margin through "
                "lead compensation or reduce crossover frequency."
            )

        return recommendations

    def save_analysis(self, analysis: ControlAnalysis, filename: str):
        """Save analysis to file"""
        with open(filename, 'w') as f:
            json.dump({
                'state_space_model': analysis.state_space_model,
                'lyapunov_function': analysis.lyapunov_function,
                'stability_proof': analysis.stability_proof,
                'transfer_function': analysis.transfer_function,
                'bode_analysis': analysis.bode_analysis,
                'nyquist_analysis': analysis.nyquist_analysis,
                'robustness_margins': analysis.robustness_margins,
                'recommendations': analysis.recommendations
            }, f, indent=2)

    def load_analysis(self, filename: str) -> ControlAnalysis:
        """Load analysis from file"""
        with open(filename, 'r') as f:
            data = json.load(f)
        return ControlAnalysis(**data)


class ControlTheoryBatchProcessor:
    """Batch processor for multiple system analyses"""

    def __init__(self, api_key: str):
        self.theorist = DeepSeekControlTheorist(api_key)
        self.results: Dict[str, ControlAnalysis] = {}

    def analyze_multiple(self, systems: Dict[str, str]) -> Dict[str, ControlAnalysis]:
        """Analyze multiple systems"""
        for name, description in systems.items():
            print(f"\nAnalyzing system: {name}")
            try:
                analysis = self.theorist.analyze_stability(description)
                self.results[name] = analysis
                time.sleep(1)  # Rate limiting
            except Exception as e:
                print(f"Error analyzing {name}: {e}")

        return self.results

    def compare_systems(self) -> Dict[str, Any]:
        """Compare analysis results across systems"""
        comparison = {
            'stability_comparison': {},
            'robustness_comparison': {},
            'recommendations_comparison': {}
        }

        for name, analysis in self.results.items():
            comparison['stability_comparison'][name] = {
                'has_lyapunov': analysis.lyapunov_function is not None,
                'has_proof': analysis.stability_proof is not None
            }

            comparison['robustness_comparison'][name] = analysis.robustness_margins
            comparison['recommendations_comparison'][name] = analysis.recommendations

        return comparison

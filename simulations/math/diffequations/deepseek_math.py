"""
DeepSeek Integration for Mathematical Derivations
Handles PDE derivations, proofs, and mathematical rigor for POLLN dynamics
"""

import openai
import json
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import hashlib

@dataclass
class DerivationResult:
    """Container for mathematical derivation results"""
    concept: str
    derivation_steps: List[str]
    final_equation: str
    assumptions: List[str]
    boundary_conditions: List[str]
    existence_proof: str
    uniqueness_proof: str
    stability_analysis: str
    latex_code: str
    api_calls_used: int = 0
    tokens_used: int = 0

@dataclass
class APICallTracker:
    """Track API usage to stay within limits"""
    total_calls: int = 0
    total_tokens: int = 0
    call_history: List[Dict] = field(default_factory=list)
    max_calls: int = 1000
    cache_dir: Path = field(default_factory=lambda: Path(".derivations_cache"))

    def record_call(self, concept: str, tokens: int, cached: bool = False):
        """Record an API call"""
        self.total_calls += 1
        self.total_tokens += tokens
        self.call_history.append({
            "timestamp": time.time(),
            "concept": concept,
            "tokens": tokens,
            "cached": cached
        })

    def can_make_call(self) -> bool:
        """Check if we can make more API calls"""
        return self.total_calls < self.max_calls

    def get_cache_path(self, concept: str) -> Path:
        """Get cache file path for a concept"""
        concept_hash = hashlib.md5(concept.encode()).hexdigest()
        return self.cache_dir / f"{concept_hash}.json"

    def load_from_cache(self, concept: str) -> Optional[Dict]:
        """Load derivation from cache if exists"""
        cache_path = self.get_cache_path(concept)
        if cache_path.exists():
            with open(cache_path, 'r') as f:
                return json.load(f)
        return None

    def save_to_cache(self, concept: str, result: Dict):
        """Save derivation to cache"""
        self.cache_dir.mkdir(exist_ok=True)
        cache_path = self.get_cache_path(concept)
        with open(cache_path, 'w') as f:
            json.dump(result, f, indent=2)

class DeepSeekMath:
    """Interface to DeepSeek API for mathematical derivations"""

    def __init__(self, api_key: str):
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        self.tracker = APICallTracker()

    def derive_pde(self, concept: str, use_cache: bool = True) -> DerivationResult:
        """
        Derive PDE for a given concept using DeepSeek
        Makes multiple API calls for complete mathematical rigor
        """
        # Check cache first
        if use_cache:
            cached = self.tracker.load_from_cache(concept)
            if cached:
                return DerivationResult(**cached)

        if not self.tracker.can_make_call():
            raise RuntimeError(f"API call limit reached: {self.tracker.total_calls}/{self.tracker.max_calls}")

        # Multi-stage derivation for maximum rigor
        stages = [
            self._derive_initial_equation,
            self._analyze_boundary_conditions,
            self._prove_existence_uniqueness,
            self._stability_analysis,
            self._numerical_methods
        ]

        result = DerivationResult(
            concept=concept,
            derivation_steps=[],
            final_equation="",
            assumptions=[],
            boundary_conditions=[],
            existence_proof="",
            uniqueness_proof="",
            stability_analysis="",
            latex_code=""
        )

        for stage in stages:
            if not self.tracker.can_make_call():
                print(f"Warning: Stopping early at {stage.__name__} due to API limit")
                break

            stage_result = stage(concept, result)
            time.sleep(0.1)  # Rate limiting

        # Compile final LaTeX
        result.latex_code = self._compile_latex(result)

        # Save to cache
        if use_cache:
            self.tracker.save_to_cache(concept, result.__dict__)

        return result

    def _derive_initial_equation(self, concept: str, result: DerivationResult) -> DerivationResult:
        """Stage 1: Derive the base PDE"""
        prompt = f"""
You are an expert mathematician specializing in partial differential equations,
stochastic calculus, and dynamical systems.

Derive the partial differential equation describing: {concept}

For POLLN (Pattern-Organized Large Language Network), assume:
- Agents exist in a continuous state space Ω ⊂ ℝⁿ
- Agent states evolve according to stochastic dynamics
- Learning creates drift in state space
- Exploration creates diffusion
- Agent interactions create coupling terms

Provide:
1. State all assumptions explicitly
2. Starting from first principles (continuity equation, Fokker-Planck, etc.)
3. Complete step-by-step derivation
4. Final PDE in standard form
5. Explanation of each term

Format your response as JSON:
{{
    "assumptions": ["assumption1", "assumption2", ...],
    "derivation_steps": ["step1", "step2", ...],
    "final_equation": "LaTeX equation",
    "term_explanations": {{"∂ρ/∂t": "time derivative", ...}}
}}
"""

        response = self._make_api_call(prompt, "derive_equation")
        data = json.loads(response)

        result.assumptions = data["assumptions"]
        result.derivation_steps = data["derivation_steps"]
        result.final_equation = data["final_equation"]

        return result

    def _analyze_boundary_conditions(self, concept: str, result: DerivationResult) -> DerivationResult:
        """Stage 2: Determine boundary conditions"""
        prompt = f"""
For the PDE describing {concept}: {result.final_equation}

Analyze the boundary conditions for POLLN's agent state space:
1. Reflecting boundaries: Agents cannot leave state space
2. Absorbing boundaries: Agents can be terminated
3. Periodic boundaries: Cyclic state spaces
4. Natural boundary conditions: Decay at infinity

For each boundary type:
- State the mathematical condition
- Explain physical interpretation in POLLN
- Discuss well-posedness

Format as JSON:
{{
    "boundary_conditions": [
        {{
            "type": "reflecting",
            "condition": "LaTeX condition",
            "interpretation": "physical meaning",
            "well_posed": true
        }},
        ...
    ]
}}
"""

        response = self._make_api_call(prompt, "boundary_conditions")
        data = json.loads(response)
        result.boundary_conditions = [bc["condition"] for bc in data["boundary_conditions"]]

        return result

    def _prove_existence_uniqueness(self, concept: str, result: DerivationResult) -> DerivationResult:
        """Stage 3: Prove existence and uniqueness"""
        prompt = f"""
For the PDE: {result.final_equation}

Provide rigorous mathematical analysis:
1. Existence proof: Show solution exists
   - Specify function space (Sobolev space, etc.)
   - Cite relevant theorems (Cauchy-Lipschitz, Lax-Milgram, etc.)
   - Check conditions of the theorem

2. Uniqueness proof: Show solution is unique
   - Energy methods or Grönwall's inequality
   - Maximum principle if applicable

3. Regularity: Smoothness of solutions
   - Parabolic regularity theorems
   - Bootstrap arguments

Format as JSON:
{{
    "existence_proof": {{
        "theorem": "theorem name",
        "function_space": "H¹(Ω)",
        "conditions_verified": ["condition1", ...],
        "proof_outline": "steps"
    }},
    "uniqueness_proof": {{
        "method": "energy method",
        "key_inequality": "Grönwall",
        "proof_outline": "steps"
    }},
    "regularity": "regularity class"
}}
"""

        response = self._make_api_call(prompt, "existence_uniqueness")
        data = json.loads(response)

        result.existence_proof = json.dumps(data["existence_proof"], indent=2)
        result.uniqueness_proof = json.dumps(data["uniqueness_proof"], indent=2)

        return result

    def _stability_analysis(self, concept: str, result: DerivationResult) -> DerivationResult:
        """Stage 4: Analyze stability"""
        prompt = f"""
For the PDE: {result.final_equation}

Perform stability analysis:

1. Linear stability analysis:
   - Find steady states (homogeneous solutions)
   - Linearize around steady state
   - Eigenvalue analysis
   - Dispersion relation

2. Nonlinear stability:
   - Lyapunov function construction
   - Energy method
   - Turing instability conditions (if applicable)

3. Asymptotic behavior:
   - Long-time convergence
   - Attractor structure

Format as JSON:
{{
    "steady_states": ["state1", "state2"],
    "linear_stability": {{
        "eigenvalues": "λ₁, λ₂, ...",
        "stability_condition": "condition",
        "dispersion_relation": "relation"
    }},
    "turing_instability": {{
        "exists": true/false,
        "conditions": ["condition1", ...]
    }},
    "asymptotic_behavior": "description"
}}
"""

        response = self._make_api_call(prompt, "stability")
        data = json.loads(response)

        result.stability_analysis = json.dumps(data, indent=2)
        return result

    def _numerical_methods(self, concept: str, result: DerivationResult) -> DerivationResult:
        """Stage 5: Numerical solution methods"""
        prompt = f"""
For the PDE: {result.final_equation}

Recommend numerical methods for solving:

1. Spatial discretization:
   - Finite difference: order, stencil
   - Finite element: element type
   - Spectral methods: basis functions

2. Time integration:
   - Explicit Euler (stability condition)
   - Implicit schemes (Crank-Nicolson)
   - Runge-Kutta methods

3. Convergence analysis:
   - Order of accuracy
   - CFL condition
   - Numerical diffusion

4. Implementation considerations:
   - Adaptive mesh refinement
   - Parallel computing
   - Boundary condition treatment

Format as JSON:
{{
    "spatial_discretization": {{
        "method": "finite difference",
        "order": 2,
        "stencil": "5-point"
    }},
    "time_integration": {{
        "method": "Crank-Nicolson",
        "stability": "unconditionally stable",
        "order": 2
    }},
    "convergence": {{
        "spatial_order": "O(Δx²)",
        "temporal_order": "O(Δt²)",
        "cfl_condition": "condition"
    }},
    "implementation": "guidelines"
}}
"""

        response = self._make_api_call(prompt, "numerical")
        # Store for later use in solver
        return result

    def _compile_latex(self, result: DerivationResult) -> str:
        """Compile full LaTeX document"""
        latex = f"""
\\documentclass{{article}}
\\usepackage{{amsmath}}
\\usepackage{{amssymb}}
\\usepackage{{amsthm}}

\\title{{PDE Analysis: {result.concept}}}
\\author{{DeepSeek Mathematical Derivation}}
\\date{{\\today}}

\\begin{{document}}

\\maketitle

\\section{{Assumptions}}
\\begin{{enumerate}}
"""
        for assumption in result.assumptions:
            latex += f"    \\item {assumption}\n"

        latex += "\\end{enumerate}\n\n\\section{Derivation}\n"
        for i, step in enumerate(result.derivation_steps, 1):
            latex += f"\\subsection{{Step {i}}}\n{step}\n\n"

        latex += f"\n\\section{{Final Equation}}\n{result.final_equation}\n"

        latex += "\n\\section{Boundary Conditions}\n"
        for bc in result.boundary_conditions:
            latex += f"{bc}\n\n"

        latex += "\n\\section{Existence and Uniqueness}\n"
        latex += result.existence_proof + "\n\n"
        latex += result.uniqueness_proof + "\n\n"

        latex += "\n\\section{Stability Analysis}\n"
        latex += result.stability_analysis + "\n\n"

        latex += "\\end{document}\n"

        return latex

    def _make_api_call(self, prompt: str, stage_name: str) -> str:
        """Make API call with error handling and tracking"""
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{
                    "role": "system",
                    "content": "You are an expert mathematician. Always respond with valid JSON. Be rigorous and precise."
                }, {
                    "role": "user",
                    "content": prompt
                }],
                temperature=0.0,  # Deterministic for math
                max_tokens=4000
            )

            content = response.choices[0].message.content
            tokens = response.usage.total_tokens

            self.tracker.record_call(
                concept=f"{stage_name}",
                tokens=tokens,
                cached=False
            )

            print(f"[API Call {self.tracker.total_calls}/{self.tracker.max_calls}] "
                  f"{stage_name}: {tokens} tokens")

            return content

        except Exception as e:
            print(f"Error in API call for {stage_name}: {e}")
            raise

    def derive_multiple(self, concepts: List[str]) -> Dict[str, DerivationResult]:
        """Derive PDEs for multiple concepts"""
        results = {}

        for concept in concepts:
            print(f"\n{'='*60}")
            print(f"Deriving: {concept}")
            print(f"{'='*60}")

            try:
                results[concept] = self.derive_pde(concept)
                print(f"✓ Completed: {concept}")
            except Exception as e:
                print(f"✗ Failed: {concept} - {e}")

        return results

    def get_usage_report(self) -> str:
        """Generate usage report"""
        report = f"""
DeepSeek API Usage Report
{'='*60}
Total Calls: {self.tracker.total_calls}/{self.tracker.max_calls}
Total Tokens: {self.tracker.total_tokens}
Remaining Calls: {self.tracker.max_calls - self.tracker.total_calls}

Cache Status:
- Cache Directory: {self.tracker.cache_dir}
- Cache Exists: {self.tracker.cache_dir.exists()}

Recent Calls:
"""
        for call in self.tracker.call_history[-10:]:
            cached_str = "CACHED" if call["cached"] else "LIVE"
            report += f"  [{cached_str}] {call['concept']}: {call['tokens']} tokens\n"

        return report


# Example usage
if __name__ == "__main__":
    api_key = "YOUR_API_KEY"
    math_engine = DeepSeekMath(api_key)

    # Test with a simple concept
    result = math_engine.derive_pde("Agent state evolution in POLLN")

    print("\n" + "="*60)
    print("DERIVATION RESULT")
    print("="*60)
    print(f"Concept: {result.concept}")
    print(f"Equation: {result.final_equation}")
    print(f"API Calls Used: {result.api_calls_used}")

    print("\n" + math_engine.get_usage_report())

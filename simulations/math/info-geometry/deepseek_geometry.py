"""
DeepSeek Geometry Interface for Information Geometry

This module provides an interface to DeepSeek API for deriving rigorous
mathematical formulations in differential geometry and information theory.

API Key: YOUR_API_KEY
Base URL: https://api.deepseek.com
"""

import openai
from typing import Optional, Dict, Any
import json
import os
from pathlib import Path


class DeepSeekGeometer:
    """
    Interface to DeepSeek API for geometric derivations and proofs.

    This class uses DeepSeek's advanced reasoning capabilities to derive
    rigorous mathematical formulations for information geometry concepts.
    """

    def __init__(self, api_key: str = "YOUR_API_KEY"):
        """
        Initialize the DeepSeek geometer.

        Args:
            api_key: DeepSeek API key (default: provided key)
        """
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        self.system_prompt = """You are an expert in differential geometry,
        information theory, and Riemannian geometry. Provide rigorous mathematical
        derivations with proofs. Use LaTeX formatting for equations. Include:

        1. Clear definitions of all mathematical objects
        2. Step-by-step derivations with justification
        3. Key theorems and their proofs
        4. Coordinate-free formulations where possible
        5. Numerical implementation considerations
        6. References to foundational papers (Amari, information geometry)

        Be thorough and rigorous. This is for production code analysis."""

        self.derivation_cache = {}
        self.cache_dir = Path(__file__).parent / "derivations"
        self.cache_dir.mkdir(exist_ok=True)

    def derive_concept(self, topic: str, context: str = "") -> str:
        """
        Derive mathematical formulation for a geometric concept.

        Args:
            topic: The geometric concept to derive
            context: Additional context for the derivation

        Returns:
            Rigorous mathematical derivation from DeepSeek
        """
        cache_key = f"{topic}_{context}"

        # Check cache first
        if cache_key in self.derivation_cache:
            return self.derivation_cache[cache_key]

        # Check disk cache
        cache_file = self.cache_dir / f"{cache_key.replace('/', '_')}.json"
        if cache_file.exists():
            with open(cache_file, 'r') as f:
                cached = json.load(f)
                self.derivation_cache[cache_key] = cached['derivation']
                return cached['derivation']

        # Query DeepSeek
        prompt = f"Derive the mathematical formulation for {topic}"
        if context:
            prompt += f"\n\nContext: {context}"

        prompt += """

        Provide:
        1. Mathematical formulation with equations
        2. Key theorems and proofs
        3. Numerical implementation formulas
        4. Practical considerations for neural networks
        """

        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0  # Deterministic for math
            )

            derivation = response.choices[0].message.content

            # Cache result
            self.derivation_cache[cache_key] = derivation
            with open(cache_file, 'w') as f:
                json.dump({
                    'topic': topic,
                    'context': context,
                    'derivation': derivation
                }, f, indent=2)

            return derivation

        except Exception as e:
            print(f"Error querying DeepSeek: {e}")
            return f"Error: {str(e)}"

    def get_fisher_metric_formulation(self) -> str:
        """
        Get complete Fisher-Rao metric formulation.

        Returns:
            Detailed derivation of Fisher information metric
        """
        return self.derive_concept(
            "Fisher-Rao metric for neural network parameter spaces",
            context="Neural networks as statistical models, probability distributions"
        )

    def get_natural_gradient_formulation(self) -> str:
        """
        Get natural gradient derivation.

        Returns:
            Derivation of Amari's natural gradient descent
        """
        return self.derive_concept(
            "natural gradient descent in information geometry",
            context="Amari's formulation, preconditioning, comparison to vanilla gradient"
        )

    def get_curvature_formulation(self) -> str:
        """
        Get curvature tensor formulation.

        Returns:
            Derivation of Riemann curvature for information manifolds
        """
        return self.derive_concept(
            "Riemann curvature tensor for information manifolds",
            context="Gaussian curvature, Ricci curvature, scalar curvature, sectional curvature"
        )

    def get_dual_connections_formulation(self) -> str:
        """
        Get dual connections derivation.

        Returns:
            Derivation of e-connection and m-connection
        """
        return self.derive_concept(
            "dual connections in information geometry",
            context="e-connection (exponential), m-connection (mixture), dually flat spaces"
        )

    def get_geodesic_formulation(self) -> str:
        """
        Get geodesic equation derivation.

        Returns:
            Derivation of geodesic equations on information manifolds
        """
        return self.derive_concept(
            "geodesic equations on Riemannian manifolds",
            context="Christoffel symbols, exponential map, geodesic distance"
        )

    def get_optimal_transport_formulation(self) -> str:
        """
        Get optimal transport theory.

        Returns:
            Derivation of Wasserstein distance and optimal transport
        """
        return self.derive_concept(
            "optimal transport and Wasserstein geometry",
            context="Bures metric, Sinkhorn divergence, gradient flows in Wasserstein space"
        )

    def get_bures_metric_formulation(self) -> str:
        """
        Get Bures metric formulation.

        Returns:
            Derivation of Bures metric for probability distributions
        """
        return self.derive_concept(
            "Bures metric for quantum and classical probability",
            context="Relation to Fisher information, Uhlmann's theorem"
        )

    def get_divergence_formulation(self) -> str:
        """
        Get information divergence derivation.

        Returns:
            Derivation of KL divergence and Bregman divergence
        """
        return self.derive_concept(
            "information divergences in differential geometry",
            context="KL divergence, Bregman divergence, f-divergences, Pythagorean theorem"
        )

    def save_all_derivations(self, output_dir: Optional[Path] = None):
        """
        Save all geometric derivations to markdown files.

        Args:
            output_dir: Directory to save derivations (default: cache_dir)
        """
        if output_dir is None:
            output_dir = self.cache_dir.parent / "geometric_derivations"

        output_dir.mkdir(exist_ok=True)

        derivations = {
            "01_Fisher_Metric.md": self.get_fisher_metric_formulation(),
            "02_Natural_Gradient.md": self.get_natural_gradient_formulation(),
            "03_Curvature.md": self.get_curvature_formulation(),
            "04_Dual_Connections.md": self.get_dual_connections_formulation(),
            "05_Geodesics.md": self.get_geodesic_formulation(),
            "06_Optimal_Transport.md": self.get_optimal_transport_formulation(),
            "07_Bures_Metric.md": self.get_bures_metric_formulation(),
            "08_Divergences.md": self.get_divergence_formulation()
        }

        for filename, content in derivations.items():
            with open(output_dir / filename, 'w') as f:
                f.write(content)

        print(f"Saved {len(derivations)} derivations to {output_dir}")

    def get_usage_stats(self) -> Dict[str, Any]:
        """
        Get statistics about API usage.

        Returns:
            Dictionary with usage statistics
        """
        return {
            "cached_derivations": len(self.derivation_cache),
            "cached_files": len(list(self.cache_dir.glob("*.json"))),
            "cache_directory": str(self.cache_dir)
        }


def main():
    """Test the DeepSeek geometry interface."""
    geometer = DeepSeekGeometer()

    print("Testing DeepSeek Geometry Interface")
    print("=" * 50)

    # Test a few derivations
    print("\n1. Fisher Metric Formulation:")
    print("-" * 50)
    fisher = geometer.get_fisher_metric_formulation()
    print(fisher[:500] + "...")

    print("\n\n2. Natural Gradient Formulation:")
    print("-" * 50)
    natural = geometer.get_natural_gradient_formulation()
    print(natural[:500] + "...")

    # Save all derivations
    print("\n\nSaving all derivations...")
    geometer.save_all_derivations()

    # Show stats
    print("\n\nUsage Stats:")
    print(geometer.get_usage_stats())


if __name__ == "__main__":
    main()

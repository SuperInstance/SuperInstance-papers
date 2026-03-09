"""
DeepSeek Discovery Interface

Provides specialized interface for using DeepSeek API to analyze
simulation data, generate creative hypotheses, and discover novel
emergent phenomena.
"""

import openai
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import json
from datetime import datetime
import re


@dataclass
class DeepSeekAnalysis:
    """Result of DeepSeek analysis"""
    analysis_type: str
    insights: List[str]
    hypotheses: List[str]
    suggested_experiments: List[str]
    mathematical_models: List[str]
    confidence: float
    raw_response: str


class DeepSeekDiscovery:
    """
    DeepSeek-powered discovery engine for emergent phenomena

    Uses DeepSeek API for creative analysis, pattern recognition,
    and hypothesis generation.
    """

    def __init__(self,
                 api_key: str = "YOUR_API_KEY",
                 base_url: str = "https://api.deepseek.com",
                 output_dir: str = "./deepseek_discovery_results"):
        self.client = openai.OpenAI(api_key=api_key, base_url=base_url)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.analysis_history = []

    def analyze_simulation_data(self,
                               simulation_data: Dict[str, Any],
                               focus_areas: Optional[List[str]] = None) -> DeepSeekAnalysis:
        """
        Analyze simulation data for emergent phenomena

        Args:
            simulation_data: Simulation results and configurations
            focus_areas: Specific areas to focus on

        Returns:
            DeepSeek analysis results
        """
        print("🧠 Analyzing simulation data with DeepSeek...")

        prompt = self._construct_analysis_prompt(simulation_data, focus_areas)

        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{
                    "role": "system",
                    "content": self._get_analysis_system_prompt()
                }, {
                    "role": "user",
                    "content": prompt
                }],
                temperature=0.7,  # Balance creativity and rigor
                max_tokens=2500
            )

            content = response.choices[0].message.content
            analysis = self._parse_analysis(content, "simulation_data")

            self.analysis_history.append(analysis)

            # Save
            self._save_analysis(analysis)

            print(f"  ✅ Analysis complete: {len(analysis.insights)} insights")
            return analysis

        except Exception as e:
            print(f"  ❌ Analysis failed: {e}")
            return DeepSeekAnalysis(
                analysis_type="simulation_data",
                insights=[],
                hypotheses=[],
                suggested_experiments=[],
                mathematical_models=[],
                confidence=0.0,
                raw_response=str(e)
            )

    def _get_analysis_system_prompt(self) -> str:
        """Get system prompt for analysis"""
        return """You are an expert complex systems scientist and emergence researcher specializing in multi-agent systems. Your task is to analyze simulation data to identify emergent phenomena, propose mechanisms, and suggest validation experiments.

Look for:
- Phase transitions and critical phenomena
- Unexpected correlations or patterns
- Novel collective behaviors
- Computational signatures of emergence
- Mathematical relationships

Be creative but rigorous. Distinguish between:
- Observations (what you see in the data)
- Inferences (what you can deduce)
- Hypotheses (speculative mechanisms)
- Predictions (testable consequences)"""

    def _construct_analysis_prompt(self, data: Dict, focus_areas: Optional[List[str]]) -> str:
        """Construct analysis prompt"""
        prompt = "Analyze this simulation data from POLLN (Pattern-Organized Large Language Network) for emergent phenomena.\n\n"

        # Configuration
        if "config" in data:
            prompt += "CONFIGURATION:\n"
            for param, value in data["config"].items():
                prompt += f"- {param}: {value}\n"
            prompt += "\n"

        # Metrics
        if "metrics" in data:
            prompt += "METRICS:\n"
            for metric, value in data["metrics"].items():
                if isinstance(value, float):
                    prompt += f"- {metric}: {value:.4f}\n"
                else:
                    prompt += f"- {metric}: {value}\n"
            prompt += "\n"

        # Raw results
        if "raw_result" in data:
            prompt += "RAW RESULTS:\n"
            prompt += json.dumps(data["raw_result"], indent=2)[:1000]  # Truncate if too long
            prompt += "\n\n"

        # Focus areas
        if focus_areas:
            prompt += f"FOCUS AREAS: {', '.join(focus_areas)}\n\n"

        prompt += """Please provide:
1. KEY INSIGHTS: What emergent phenomena do you observe?
2. MECHANISM HYPOTHESES: What could explain these observations?
3. MATHEMATICAL MODELS: Suggest mathematical formulations
4. EXPERIMENTS: How to validate the hypotheses?

Be specific and creative."""

        return prompt

    def _parse_analysis(self, content: str, analysis_type: str) -> DeepSeekAnalysis:
        """Parse DeepSeek response"""
        # Extract sections
        insights = self._extract_bullet_points(content, ["insight", "observation", "finding"])
        hypotheses = self._extract_bullet_points(content, ["hypothesis", "mechanism", "explanation"])
        experiments = self._extract_bullet_points(content, ["experiment", "test", "validation"])
        models = self._extract_bullet_points(content, ["model", "equation", "mathematical", "formulation"])

        return DeepSeekAnalysis(
            analysis_type=analysis_type,
            insights=insights,
            hypotheses=hypotheses,
            suggested_experiments=experiments,
            mathematical_models=models,
            confidence=0.7,  # Default confidence
            raw_response=content
        )

    def _extract_bullet_points(self, content: str, keywords: List[str]) -> List[str]:
        """Extract bullet points related to keywords"""
        lines = content.split('\n')
        results = []
        collecting = False

        for line in lines:
            line_lower = line.lower()

            # Check if we're in a relevant section
            if any(kw in line_lower for kw in keywords):
                collecting = True

            # Collect bullet points
            if collecting and (line.strip().startswith('-') or line.strip().startswith('*')):
                point = line.strip()[1:].strip()
                if point:
                    results.append(point)

            # Stop collecting at new section
            if collecting and line.strip() and not line.strip().startswith('-') and not line.strip().startswith('*'):
                if not any(kw in line_lower for kw in keywords):
                    collecting = False

        return results

    def brainstorm_emergence_mechanisms(self,
                                       phenomenon_description: str,
                                       context: Optional[Dict] = None,
                                       n_mechanisms: int = 10) -> List[str]:
        """
        Brainstorm possible mechanisms for emergent phenomenon

        Args:
            phenomenon_description: Description of the phenomenon
            context: Additional context
            n_mechanisms: Number of mechanisms to generate

        Returns:
            List of mechanism descriptions
        """
        print(f"💡 Brainstorming {n_mechanisms} mechanisms...")

        prompt = f"""I need to brainstorm mechanisms for this emergent phenomenon in POLLN:

PHENOMENON:
{phenomen_description}

CONTEXT:
POLLN is a multi-agent system where:
- Specialized agents coordinate through learned connections
- Uses Hebbian learning (neurons that fire together, wire together)
- Has subsumption architecture (SAFETY > REFLEX > HABITUAL > DELIBERATE)
- Supports META tiles that differentiate based on signals
- Has value network with TD(lambda) learning

Please brainstorm {n_mechanisms} distinct mechanisms that could explain this phenomenon.

For each mechanism:
1. Give it a name
2. Explain the key components
3. Describe the interactions
4. Suggest a mathematical formulation
5. Provide analogies from other domains

Be creative and diverse. Consider mechanisms at different scales and from different perspectives."""

        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{
                    "role": "system",
                    "content": "You are a creative complex systems theorist. Brainstorm diverse, novel mechanisms for emergent phenomena."
                }, {
                    "role": "user",
                    "content": prompt
                }],
                temperature=0.9,  # High creativity
                max_tokens=3000
            )

            content = response.choices[0].message.content
            mechanisms = self._parse_mechanisms(content)

            print(f"  ✅ Generated {len(mechanisms)} mechanisms")
            return mechanisms

        except Exception as e:
            print(f"  ❌ Brainstorming failed: {e}")
            return []

    def _parse_mechanisms(self, content: str) -> List[str]:
        """Parse mechanisms from response"""
        mechanisms = []

        # Split by numbered items
        sections = re.split(r'\n\s*\d+\.\s*|\n\s*MECHANISM\s*\d+:?', content)

        for section in sections[1:]:  # Skip empty first section
            if len(section.strip()) > 50:
                mechanisms.append(section.strip())

        return mechanisms

    def suggest_mathematical_models(self,
                                   phenomenon_data: Dict[str, Any],
                                   n_models: int = 5) -> List[Dict[str, str]]:
        """
        Suggest mathematical models for phenomenon

        Args:
            phenomenon_data: Data about the phenomenon
            n_models: Number of models to suggest

        Returns:
            List of model descriptions
        """
        print(f"📐 Suggesting {n_models} mathematical models...")

        prompt = f"""I need mathematical models for this emergent phenomenon in POLLN:

PHENOMENON:
{phenomenon_data.get('description', 'Unknown phenomenon')}

KEY FEATURES:
{json.dumps(phenomenon_data.get('features', {}), indent=2)}

Please suggest {n_models} distinct mathematical models that could capture this phenomenon.

For each model:
1. MODEL TYPE: What kind of model? (ODE, PDE, stochastic, agent-based, etc.)
2. VARIABLES: Key state variables
3. PARAMETERS: Important parameters
4. EQUATIONS: Core equations (use LaTeX notation)
5. PREDICTIONS: What the model predicts
6. LIMITATIONS: What the model doesn't capture

Draw from relevant theory: statistical physics, network theory, dynamical systems, information theory."""

        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{
                    "role": "system",
                    "content": "You are a mathematical modeler specializing in complex systems. Suggest rigorous but creative mathematical models."
                }, {
                    "role": "user",
                    "content": prompt
                }],
                temperature=0.8,
                max_tokens=3000
            )

            content = response.choices[0].message.content
            models = self._parse_models(content)

            print(f"  ✅ Suggested {len(models)} models")
            return models

        except Exception as e:
            print(f"  ❌ Model suggestion failed: {e}")
            return []

    def _parse_models(self, content: str) -> List[Dict[str, str]]:
        """Parse models from response"""
        models = []

        sections = re.split(r'\n\s*\d+\.\s*MODEL|\n\s*MODEL\s*\d+:?', content)

        for section in sections[1:]:
            if len(section.strip()) < 50:
                continue

            model = {
                "description": section.strip()
            }

            # Extract components
            model["type"] = self._extract_line(section, ["TYPE", "KIND"])
            model["variables"] = self._extract_line(section, ["VARIABLES", "STATE"])
            model["parameters"] = self._extract_line(section, ["PARAMETERS"])
            model["equations"] = self._extract_line(section, ["EQUATIONS", "EQUATION"])
            model["predictions"] = self._extract_line(section, ["PREDICTIONS"])
            model["limitations"] = self._extract_line(section, ["LIMITATIONS"])

            models.append(model)

        return models

    def _extract_line(self, content: str, keywords: List[str]) -> str:
        """Extract line starting with keywords"""
        lines = content.split('\n')
        for line in lines:
            for kw in keywords:
                if kw.upper() in line.upper():
                    return line.split(':', 1)[-1].strip() if ':' in line else line.strip()
        return ""

    def design_experiments(self,
                         hypothesis: str,
                         system_context: Optional[str] = None,
                         n_experiments: int = 5) -> List[Dict[str, str]]:
        """
        Design experiments to test hypothesis

        Args:
            hypothesis: Hypothesis to test
            system_context: Additional context
            n_experiments: Number of experiments

        Returns:
            List of experiment designs
        """
        print(f"🧪 Designing {n_experiments} experiments...")

        context = system_context or """POLLN is a multi-agent system where specialized agents
coordinate through learned connections using Hebbian learning and subsumption architecture."""

        prompt = f"""I need to design experiments to test this hypothesis about emergent phenomena in POLLN:

HYPOTHESIS:
{hypothesis}

SYSTEM CONTEXT:
{context}

Please design {n_experiments} specific, implementable experiments to test this hypothesis.

For each experiment:
1. OBJECTIVE: What are we testing?
2. SETUP: How to configure POLLN?
3. MANIPULATIONS: What variables to manipulate?
4. MEASUREMENTS: What metrics to collect?
5. EXPECTED OUTCOMES: If hypothesis is correct, what should we observe?
6. ALTERNATIVE EXPLANATIONS: What else could cause these outcomes?

Be specific about parameters and procedures."""

        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{
                    "role": "system",
                    "content": "You are an experimental complex systems scientist. Design rigorous, controlled experiments."
                }, {
                    "role": "user",
                    "content": prompt
                }],
                temperature=0.7,
                max_tokens=3000
            )

            content = response.choices[0].message.content
            experiments = self._parse_experiments(content)

            print(f"  ✅ Designed {len(experiments)} experiments")
            return experiments

        except Exception as e:
            print(f"  ❌ Experiment design failed: {e}")
            return []

    def _parse_experiments(self, content: str) -> List[Dict[str, str]]:
        """Parse experiments from response"""
        experiments = []

        sections = re.split(r'\n\s*\d+\.\s*EXPERIMENT|\n\s*EXPERIMENT\s*\d+:?', content)

        for section in sections[1:]:
            if len(section.strip()) < 50:
                continue

            exp = {
                "description": section.strip(),
                "objective": self._extract_line(section, ["OBJECTIVE"]),
                "setup": self._extract_line(section, ["SETUP", "CONFIGURATION"]),
                "manipulations": self._extract_line(section, ["MANIPULATIONS", "VARIABLES"]),
                "measurements": self._extract_line(section, ["MEASUREMENTS", "METRICS"]),
                "expected": self._extract_line(section, ["EXPECTED", "OUTCOMES", "PREDICTIONS"]),
                "alternatives": self._extract_line(section, ["ALTERNATIVE", "EXPLANATIONS"])
            }

            experiments.append(exp)

        return experiments

    def assess_novelty(self,
                      phenomenon_data: Dict[str, Any],
                      literature_context: Optional[str] = None) -> Dict[str, Any]:
        """
        Assess novelty of phenomenon

        Args:
            phenomenon_data: Data about the phenomenon
            literature_context: Known literature

        Returns:
            Novelty assessment
        """
        print("🔍 Assessing novelty...")

        prompt = f"""Assess the novelty of this emergent phenomenon discovered in POLLN:

PHENOMENON:
{phenomenon_data.get('description', 'Unknown')}

KEY FEATURES:
{json.dumps(phenomenon_data.get('features', {}), indent=2)}

PROPOSED MECHANISM:
{phenomenon_data.get('mechanism', 'Unknown')}

Please assess:
1. NOVELTY: How novel is this phenomenon? (0-1 scale)
2. SIMILAR PHENOMENA: What known phenomena is it similar to?
3. UNIQUE ASPECTS: What makes it unique?
4. THEORETICAL CONTRIBUTION: What does this contribute to theory?
5. PRACTICAL IMPLICATIONS: What are the practical applications?

Be specific and justify your assessment."""

        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{
                    "role": "system",
                    "content": "You are an expert in complex systems and emergence theory. Assess novelty rigorously."
                }, {
                    "role": "user",
                    "content": prompt
                }],
                temperature=0.6,
                max_tokens=2000
            )

            content = response.choices[0].message.content

            assessment = {
                "novelty_score": self._extract_score(content, "novelty"),
                "similar_phenomena": self._extract_list(content, ["similar", "analogous"]),
                "unique_aspects": self._extract_list(content, ["unique", "distinctive"]),
                "theoretical_contribution": self._extract_section(content, ["theoretical", "contribution"]),
                "practical_implications": self._extract_section(content, ["practical", "implication", "application"]),
                "full_assessment": content
            }

            print(f"  ✅ Novelty score: {assessment['novelty_score']:.2f}")
            return assessment

        except Exception as e:
            print(f"  ❌ Novelty assessment failed: {e}")
            return {"novelty_score": 0.5, "error": str(e)}

    def _extract_score(self, content: str, keyword: str) -> float:
        """Extract numerical score from content"""
        # Look for patterns like "novelty: 0.8" or "score of 0.75"
        patterns = [
            rf'{keyword}:\s*([0-9.]+)',
            rf'score\s+(?:of\s+)?([0-9.]+)',
            rf'([0-9.]+)\s*/\s*10'
        ]

        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                try:
                    score = float(match.group(1))
                    # Normalize to 0-1 if needed
                    if score > 1:
                        score /= 10
                    return min(1.0, max(0.0, score))
                except:
                    continue

        return 0.5  # Default

    def _extract_list(self, content: str, keywords: List[str]) -> List[str]:
        """Extract list items"""
        lines = content.split('\n')
        results = []

        for line in lines:
            if any(kw in line.lower() for kw in keywords):
                continue

            if line.strip().startswith('-') or line.strip().startswith('*'):
                item = line.strip()[1:].strip()
                if item:
                    results.append(item)

        return results

    def _extract_section(self, content: str, keywords: List[str]) -> str:
        """Extract section of content"""
        for kw in keywords:
            pattern = rf'{kw}.*?:?\s*(.*?)(?=\n\n[A-Z]{{3,}}:|\n\n\d+\.|\n\n|$)'
            match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return ""

    def _save_analysis(self, analysis: DeepSeekAnalysis) -> None:
        """Save analysis to disk"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = self.output_dir / f"analysis_{timestamp}.json"

        data = {
            "analysis_type": analysis.analysis_type,
            "insights": analysis.insights,
            "hypotheses": analysis.hypotheses,
            "suggested_experiments": analysis.suggested_experiments,
            "mathematical_models": analysis.mathematical_models,
            "confidence": analysis.confidence,
            "raw_response": analysis.raw_response
        }

        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)

        print(f"  💾 Analysis saved to {filename}")


if __name__ == "__main__":
    # Test DeepSeek discovery
    print("Testing DeepSeek Discovery")

    discovery = DeepSeekDiscovery()

    # Test analysis
    test_data = {
        "config": {
            "n_agents": 100,
            "temperature": 0.8,
            "learning_rate": 0.01
        },
        "metrics": {
            "coordination": 0.95,
            "criticality": 0.92,
            "synchronization": 0.88
        },
        "description": "Sudden coordination emergence at critical density"
    }

    analysis = discovery.analyze_simulation_data(test_data)
    print(f"\n✅ Analysis: {len(analysis.insights)} insights")

    # Test brainstorming
    mechanisms = discovery.brainstorm_emergence_mechanisms(
        "Sudden coordination emergence",
        n_mechanisms=5
    )
    print(f"\n✅ Mechanisms: {len(mechanisms)}")

    # Test novelty assessment
    novelty = discovery.assess_novelty(test_data)
    print(f"\n✅ Novelty: {novelty['novelty_score']:.2f}")

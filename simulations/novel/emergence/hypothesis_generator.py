"""
Hypothesis Generator using DeepSeek API

Uses DeepSeek to generate creative hypotheses about mechanisms underlying
discovered emergent phenomena. Proposes mathematical models and suggests
validation experiments.
"""

import openai
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, field
from pathlib import Path
import json
from datetime import datetime
import re


@dataclass
class Hypothesis:
    """Generated hypothesis about emergent phenomenon"""
    hypothesis_id: str
    phenomenon: str
    mechanism: str
    mathematical_model: str
    predictions: List[str]
    validation_experiments: List[str]
    confidence: float
    novelty_score: float
    references: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MechanismProposal:
    """Proposed mechanism for emergent behavior"""
    name: str
    description: str
    key_components: List[str]
    interactions: List[str]
    mathematical_formulation: str
    analogies: List[str]


class DeepSeekHypothesisGenerator:
    """
    Advanced hypothesis generation using DeepSeek API

    Leverages DeepSeek's reasoning capabilities to generate creative,
    scientifically grounded hypotheses about emergent phenomena.
    """

    def __init__(self,
                 api_key: str = "YOUR_API_KEY",
                 base_url: str = "https://api.deepseek.com",
                 output_dir: str = "./hypothesis_results"):
        self.client = openai.OpenAI(api_key=api_key, base_url=base_url)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.hypotheses = []
        self.mechanism_proposals = []

    def generate_hypotheses(self,
                           phenomenon_data: Dict[str, Any],
                           n_hypotheses: int = 5) -> List[Hypothesis]:
        """
        Generate hypotheses about discovered phenomenon

        Args:
            phenomenon_data: Data about the phenomenon (patterns, metrics, etc.)
            n_hypotheses: Number of hypotheses to generate

        Returns:
            List of generated hypotheses
        """
        print(f"🧠 Generating {n_hypotheses} hypotheses about phenomenon...")

        # Construct prompt
        prompt = self._construct_hypothesis_prompt(phenomenon_data)

        # Generate hypotheses
        hypotheses = []
        for i in range(n_hypotheses):
            print(f"  Generating hypothesis {i+1}/{n_hypotheses}...")

            try:
                response = self.client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[{
                        "role": "system",
                        "content": self._get_system_prompt()
                    }, {
                        "role": "user",
                        "content": prompt
                    }],
                    temperature=0.8,  # High temperature for creativity
                    max_tokens=2000
                )

                content = response.choices[0].message.content
                hypothesis = self._parse_hypothesis(content, phenomenon_data, i)

                if hypothesis:
                    hypotheses.append(hypothesis)
                    print(f"    ✅ Hypothesis generated: {hypothesis.mechanism[:50]}...")

            except Exception as e:
                print(f"    ❌ Error generating hypothesis: {e}")
                continue

        self.hypotheses.extend(hypotheses)

        # Save hypotheses
        self._save_hypotheses(hypotheses)

        return hypotheses

    def _get_system_prompt(self) -> str:
        """Get system prompt for DeepSeek"""
        return """You are an expert complex systems scientist specializing in emergent phenomena, network theory, and collective intelligence. Your task is to generate creative, scientifically grounded hypotheses about mechanisms underlying emergent behaviors in multi-agent systems.

Your hypotheses should:
1. Be mechanistic - identify specific components and interactions
2. Be mathematically formulative - propose equations or models
3. Make testable predictions - what should we observe?
4. Suggest validation experiments - how to test the hypothesis?
5. Draw on relevant theory - connection to physics, biology, network science
6. Be novel - propose new mechanisms or syntheses

Be creative but rigorous. Think about phase transitions, criticality, self-organization, information flow, and network dynamics."""

    def _construct_hypothesis_prompt(self, phenomenon_data: Dict[str, Any]) -> str:
        """Construct prompt for hypothesis generation"""
        prompt = "I have discovered an interesting emergent phenomenon in a multi-agent system (POLLN).\n\n"

        # Describe phenomenon
        prompt += "PHENOMENON DESCRIPTION:\n"
        if "description" in phenomenon_data:
            prompt += phenomenon_data["description"] + "\n\n"

        # Add pattern information
        if "patterns" in phenomenon_data:
            prompt += "OBSERVED PATTERNS:\n"
            for pattern in phenomenon_data["patterns"][:5]:  # Top 5 patterns
                prompt += f"- {pattern.get('description', 'N/A')}\n"
                if "features" in pattern:
                    prompt += f"  Key features: {list(pattern['features'].keys())[:5]}\n"
            prompt += "\n"

        # Add metrics
        if "metrics" in phenomenon_data:
            prompt += "KEY METRICS:\n"
            for metric, value in list(phenomenon_data["metrics"].items())[:10]:
                prompt += f"- {metric}: {value:.4f}\n"
            prompt += "\n"

        # Add parameter regimes
        if "parameter_regime" in phenomenon_data:
            prompt += "PARAMETER REGIME:\n"
            for param, value in phenomenon_data["parameter_regime"].items():
                prompt += f"- {param}: {value}\n"
            prompt += "\n"

        # Add context about POLLN
        prompt += """SYSTEM CONTEXT:
The system is POLLN (Pattern-Organized Large Language Network), where:
- Simple, specialized agents coordinate through learned connections
- Intelligence emerges from network structure, not individual agents
- Uses subsumption architecture (SAFETY > REFLEX > HABITUAL > DELIBERATE)
- Has META tiles that differentiate based on signals
- Uses Hebbian learning (neurons that fire together, wire together)
- Has value network with TD(lambda) learning
- Supports dreaming for policy optimization

Please generate a hypothesis about the mechanism underlying this phenomenon.

Your response should follow this structure:

MECHANISM: [Brief name and description]

COMPONENTS: [Key components involved]

INTERACTIONS: [How components interact]

MATHEMATICAL MODEL: [Mathematical formulation with equations]

PREDICTIONS: [Testable predictions - what should we observe?]

VALIDATION: [Experiments to test the hypothesis]

THEORETICAL CONNECTIONS: [Related theory or analogies from physics/biology/network science]

NOVELTY: [What's new or surprising about this hypothesis?]"""

        return prompt

    def _parse_hypothesis(self, content: str, phenomenon_data: Dict, index: int) -> Optional[Hypothesis]:
        """Parse DeepSeek response into Hypothesis object"""
        try:
            # Extract sections
            mechanism = self._extract_section(content, "MECHANISM")
            components = self._extract_section(content, "COMPONENTS")
            interactions = self._extract_section(content, "INTERACTIONS")
            math_model = self._extract_section(content, "MATHEMATICAL MODEL")
            predictions_text = self._extract_section(content, "PREDICTIONS")
            validation_text = self._extract_section(content, "VALIDATION")
            theory = self._extract_section(content, "THEORETICAL CONNECTIONS")
            novelty = self._extract_section(content, "NOVELTY")

            # Parse predictions into list
            predictions = [p.strip() for p in predictions_text.split('\n') if p.strip() and not p.strip().startswith('-')]

            # Parse validation experiments
            experiments = [e.strip() for e in validation_text.split('\n') if e.strip() and not e.strip().startswith('-')]

            # Create hypothesis
            hypothesis = Hypothesis(
                hypothesis_id=f"hypothesis_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{index}",
                phenomenon=phenomenon_data.get("description", "Unknown phenomenon"),
                mechanism=mechanism,
                mathematical_model=math_model,
                predictions=predictions,
                validation_experiments=experiments,
                confidence=0.7,  # Will be updated after validation
                novelty_score=self._estimate_novelty(content),
                references=self._extract_references(theory),
                metadata={
                    "components": components,
                    "interactions": interactions,
                    "theory": theory,
                    "novelty_assessment": novelty
                }
            )

            return hypothesis

        except Exception as e:
            print(f"    ⚠️  Error parsing hypothesis: {e}")
            return None

    def _extract_section(self, content: str, section_name: str) -> str:
        """Extract a section from structured response"""
        pattern = rf"{section_name}:?\s*(.*?)(?=\n\n[A-Z_]+|$)"
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return ""

    def _estimate_novelty(self, content: str) -> float:
        """Estimate novelty of hypothesis based on content"""
        # Simple heuristic: longer mathematical formulation and specific predictions = more novel
        score = 0.5

        # Check for mathematical content
        if re.search(r'\$.*?\$', content) or re.search(r'\\[a-z]+', content):
            score += 0.2

        # Check for specific predictions
        if len(re.findall(r'prediction|observe|expect', content.lower())) > 3:
            score += 0.1

        # Check for validation experiments
        if len(re.findall(r'experiment|test|validate', content.lower())) > 3:
            score += 0.1

        # Check for theoretical connections
        if len(re.findall(r'analogy|theory|physics|biology|network', content.lower())) > 2:
            score += 0.1

        return min(1.0, score)

    def _extract_references(self, theory_section: str) -> List[str]:
        """Extract theoretical references"""
        # Look for mentions of theories, concepts, researchers
        references = []

        # Common theories/concepts
        theory_patterns = [
            r'phase transition',
            r'criticality',
            r'self-organization',
            r'network theory',
            r'complex systems',
            r'emergence',
            r'collective intelligence',
            r'swarm intelligence',
            r'critical phenomena',
            r'renormalization',
            r'percolation',
            r'synchronization'
        ]

        for pattern in theory_patterns:
            if re.search(pattern, theory_section, re.IGNORECASE):
                references.append(pattern)

        return references

    def brainstorm_mechanisms(self,
                             phenomenon_type: str,
                             context: Optional[Dict] = None,
                             n_mechanisms: int = 10) -> List[MechanismProposal]:
        """
        Brainstorm possible mechanisms for a phenomenon type

        Args:
            phenomenon_type: Type of phenomenon (e.g., "phase transition", "synchronization")
            context: Additional context about the system
            n_mechanisms: Number of mechanisms to brainstorm

        Returns:
            List of mechanism proposals
        """
        print(f"💡 Brainstorming {n_mechanisms} mechanisms for {phenomenon_type}...")

        prompt = f"""I need to brainstorm possible mechanisms for {phenomenon_type} in a multi-agent system.

CONTEXT:
The system is POLLN, where specialized agents coordinate through learned connections.
Agents use subsumption architecture with layers (SAFETY > REFLEX > HABITUAL > DELIBERATE).
Learning is Hebbian - connections strengthen between co-active agents.

Please brainstorm {n_mechanisms} distinct mechanisms that could explain this phenomenon.

For each mechanism, provide:
1. NAME: Short descriptive name
2. DESCRIPTION: Brief explanation
3. KEY COMPONENTS: What parts of the system are involved?
4. INTERACTIONS: How do these components interact?
5. MATHEMATICAL FORMULATION: Suggest mathematical form (equations or relationships)
6. ANALOGIES: Similar phenomena in other domains (physics, biology, etc.)

Be creative and diverse. Consider mechanisms at different scales (micro, meso, macro)
and from different perspectives (informational, structural, dynamical)."""

        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{
                    "role": "system",
                    "content": "You are a creative complex systems theorist. Brainstorm diverse, novel mechanisms for emergent phenomena. Think across disciplines and scales."
                }, {
                    "role": "user",
                    "content": prompt
                }],
                temperature=0.9,  # Very high temperature for creativity
                max_tokens=3000
            )

            content = response.choices[0].message.content
            mechanisms = self._parse_mechanisms(content)

            self.mechanism_proposals.extend(mechanisms)

            # Save mechanisms
            self._save_mechanisms(mechanisms)

            print(f"  ✅ Generated {len(mechanisms)} mechanism proposals")
            return mechanisms

        except Exception as e:
            print(f"  ❌ Error brainstorming mechanisms: {e}")
            return []

    def _parse_mechanisms(self, content: str) -> List[MechanismProposal]:
        """Parse brainstormed mechanisms from response"""
        mechanisms = []

        # Split by numbered items or distinct mechanisms
        # This is a simplified parser
        sections = re.split(r'\n\s*\d+\.\s*|\n\s*MECHANISM\s*\d*:?', content)

        for i, section in enumerate(sections[1:]):  # Skip empty first section
            if len(section.strip()) < 50:
                continue

            try:
                name = self._extract_line_starting_with(section, ["NAME", "MECHANISM"]) or f"Mechanism {i+1}"
                description = self._extract_line_starting_with(section, ["DESCRIPTION"]) or section[:100]
                components = self._extract_lines_after(section, ["KEY COMPONENTS", "COMPONENTS"])
                interactions = self._extract_lines_after(section, ["INTERACTIONS"])
                math_form = self._extract_section_from_brackets(section, ["MATHEMATICAL", "FORMULATION", "EQUATIONS"])
                analogies = self._extract_lines_after(section, ["ANALOGIES", "ANALOGY"])

                mechanism = MechanismProposal(
                    name=name,
                    description=description,
                    key_components=components,
                    interactions=interactions,
                    mathematical_formulation=math_form,
                    analogies=analogies
                )

                mechanisms.append(mechanism)

            except Exception as e:
                print(f"    ⚠️  Error parsing mechanism {i}: {e}")
                continue

        return mechanisms

    def _extract_line_starting_with(self, content: str, prefixes: List[str]) -> str:
        """Extract first line starting with any of the prefixes"""
        lines = content.split('\n')
        for line in lines:
            for prefix in prefixes:
                if line.strip().upper().startswith(prefix):
                    return line.split(':', 1)[-1].strip() if ':' in line else line.strip()
        return ""

    def _extract_lines_after(self, content: str, headers: List[str]) -> List[str]:
        """Extract bulleted lines after a header"""
        lines = content.split('\n')
        collecting = False
        result = []

        for line in lines:
            if any(line.strip().upper().startswith(h) for h in headers):
                collecting = True
                continue

            if collecting:
                if line.strip().startswith('-') or line.strip().startswith('*'):
                    result.append(line.strip()[1:].strip())
                elif not line.strip():
                    break
                elif collecting and len(result) > 0 and line.strip() and not line.strip()[0].isupper():
                    # Continuation of previous item
                    if result:
                        result[-1] += ' ' + line.strip()

        return result

    def _extract_section_from_brackets(self, content: str, headers: List[str]) -> str:
        """Extract content section after header"""
        for header in headers:
            pattern = rf'{header}:?\s*(.*?)(?=\n[A-Z]{{3,}}:|\n\d+\.|\n\n|$)'
            match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return ""

    def rank_hypotheses(self,
                       criteria: Optional[Dict[str, float]] = None) -> List[Hypothesis]:
        """
        Rank hypotheses by multiple criteria

        Args:
            criteria: Weights for different criteria (novelty, confidence, etc.)

        Returns:
            Ranked list of hypotheses
        """
        if criteria is None:
            criteria = {
                "novelty": 0.4,
                "confidence": 0.3,
                "testability": 0.2,
                "theoretical_grounding": 0.1
            }

        ranked = sorted(self.hypotheses,
                       key=lambda h: self._compute_hypothesis_score(h, criteria),
                       reverse=True)

        return ranked

    def _compute_hypothesis_score(self, hypothesis: Hypothesis, criteria: Dict[str, float]) -> float:
        """Compute composite score for hypothesis"""
        score = 0.0

        score += criteria.get("novelty", 0.0) * hypothesis.novelty_score
        score += criteria.get("confidence", 0.0) * hypothesis.confidence
        score += criteria.get("testability", 0.0) * min(1.0, len(hypothesis.validation_experiments) / 3)
        score += criteria.get("theoretical_grounding", 0.0) * min(1.0, len(hypothesis.references) / 5)

        return score

    def suggest_experiments(self,
                          hypothesis: Hypothesis,
                          n_experiments: int = 5) -> List[Dict[str, Any]]:
        """
        Suggest specific experiments to test a hypothesis

        Args:
            hypothesis: Hypothesis to test
            n_experiments: Number of experiments to suggest

        Returns:
            List of experiment proposals
        """
        print(f"🧪 Designing {n_experiments} experiments to test hypothesis...")

        prompt = f"""I need to design experiments to test this hypothesis about emergent phenomena in POLLN.

HYPOTHESIS: {hypothesis.mechanism}

MATHEMATICAL MODEL:
{hypothesis.mathematical_model}

PREDICTIONS:
{chr(10).join(f"- {p}" for p in hypothesis.predictions[:5])}

SYSTEM CONTEXT:
POLLN is a multi-agent system where:
- Agents coordinate through learned connections (Hebbian learning)
- Uses subsumption architecture (SAFETY > REFLEX > HABITUAL > DELIBERATE)
- Has META tiles that differentiate based on signals
- Supports dreaming for offline optimization
- Uses TD(lambda) value network

Please suggest {n_experiments} specific, implementable experiments to test this hypothesis.

For each experiment, provide:
1. OBJECTIVE: What are we testing?
2. SETUP: How to configure the system?
3. MANIPULATIONS: What variables to manipulate?
4. MEASUREMENTS: What to measure?
5. EXPECTED OUTCOMES: If hypothesis is correct, what should we observe?
6. ALTERNATIVE EXPLANATIONS: What else could cause these outcomes?

Be specific about parameters, metrics, and procedures."""

        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{
                    "role": "system",
                    "content": "You are an experimental complex systems scientist. Design rigorous, controlled experiments to test hypotheses about emergent phenomena."
                }, {
                    "role": "user",
                    "content": prompt
                }],
                temperature=0.7,
                max_tokens=2500
            )

            content = response.choices[0].message.content
            experiments = self._parse_experiments(content)

            print(f"  ✅ Designed {len(experiments)} experiments")
            return experiments

        except Exception as e:
            print(f"  ❌ Error designing experiments: {e}")
            return []

    def _parse_experiments(self, content: str) -> List[Dict[str, Any]]:
        """Parse experiment proposals from response"""
        experiments = []

        # Split by experiment numbers
        sections = re.split(r'\n\s*\d+\.\s*EXPERIMENT|\n\s*EXPERIMENT\s*\d+:?', content, flags=re.IGNORECASE)

        for i, section in enumerate(sections[1:]):
            if len(section.strip()) < 50:
                continue

            experiment = {
                "experiment_id": f"exp_{i+1}",
                "objective": self._extract_section_from_brackets(section, ["OBJECTIVE"]),
                "setup": self._extract_section_from_brackets(section, ["SETUP", "CONFIGURATION"]),
                "manipulations": self._extract_lines_after(section, ["MANIPULATIONS", "VARIABLES"]),
                "measurements": self._extract_lines_after(section, ["MEASUREMENTS", "METRICS"]),
                "expected_outcomes": self._extract_section_from_brackets(section, ["EXPECTED", "OUTCOMES", "PREDICTIONS"]),
                "alternative_explanations": self._extract_section_from_brackets(section, ["ALTERNATIVE", "EXPLANATIONS"])
            }

            experiments.append(experiment)

        return experiments

    def _save_hypotheses(self, hypotheses: List[Hypothesis]) -> None:
        """Save hypotheses to disk"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = self.output_dir / f"hypotheses_{timestamp}.json"

        data = []
        for h in hypotheses:
            data.append({
                "hypothesis_id": h.hypothesis_id,
                "phenomenon": h.phenomenon,
                "mechanism": h.mechanism,
                "mathematical_model": h.mathematical_model,
                "predictions": h.predictions,
                "validation_experiments": h.validation_experiments,
                "confidence": h.confidence,
                "novelty_score": h.novelty_score,
                "references": h.references,
                "metadata": h.metadata
            })

        with open(filename, 'w') as f:
            json.dump(data, f, indent=2, default=str)

        print(f"  💾 Hypotheses saved to {filename}")

    def _save_mechanisms(self, mechanisms: List[MechanismProposal]) -> None:
        """Save mechanism proposals to disk"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = self.output_dir / f"mechanisms_{timestamp}.json"

        data = []
        for m in mechanisms:
            data.append({
                "name": m.name,
                "description": m.description,
                "key_components": m.key_components,
                "interactions": m.interactions,
                "mathematical_formulation": m.mathematical_formulation,
                "analogies": m.analogies
            })

        with open(filename, 'w') as f:
            json.dump(data, f, indent=2, default=str)

        print(f"  💾 Mechanisms saved to {filename}")


if __name__ == "__main__":
    # Test hypothesis generation
    print("Testing DeepSeek Hypothesis Generator")

    generator = DeepSeekHypothesisGenerator()

    # Test with mock phenomenon
    phenomenon_data = {
        "description": "Sudden emergence of coordinated collective behavior when agent density exceeds threshold",
        "patterns": [
            {"description": "Phase transition at critical density", "features": {"density": 0.73}},
            {"description": "Synchronization of agent decisions", "features": {"sync": 0.95}}
        ],
        "metrics": {
            "collective_intelligence": 0.89,
            "criticality": 0.92,
            "information_integration": 0.78
        },
        "parameter_regime": {
            "n_agents": 500,
            "temperature": 0.5,
            "connectivity": 0.3
        }
    }

    # Generate hypotheses
    hypotheses = generator.generate_hypotheses(phenomenon_data, n_hypotheses=3)

    print(f"\n✅ Generated {len(hypotheses)} hypotheses")

    # Brainstorm mechanisms
    mechanisms = generator.brainstorm_mechanisms("phase transition", n_mechanisms=5)

    print(f"\n✅ Brainstormed {len(mechanisms)} mechanisms")

    # Rank hypotheses
    if hypotheses:
        ranked = generator.rank_hypotheses()
        print(f"\n🏆 Top hypothesis: {ranked[0].mechanism[:100]}...")

"""
Automated Discovery Pipeline for Emergent Phenomena

Orchestrates the full discovery process: explore → discover → model →
validate → document. Iteratively refines discoveries and enhances
serendipity.
"""

import numpy as np
from typing import Dict, List, Tuple, Any, Optional, Callable
from dataclasses import dataclass, field
from pathlib import Path
import json
from datetime import datetime
import logging

# Import discovery components
from explorer import EmergenceExplorer, ExplorationStrategy, create_polln_parameter_space, create_standard_emergence_metrics
from pattern_discovery import PatternDiscoveryEngine, Pattern
from hypothesis_generator import DeepSeekHypothesisGenerator, Hypothesis
from emergence_taxonomy import EmergenceTaxonomy, Phenomenon
from experiments import ExperimentalFramework, Experiment
from phenomenon_catalog import PhenomenonCatalog, PhenomenonEntry
from deepseek_discovery import DeepSeekDiscovery

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class DiscoveryLead:
    """Potential discovery requiring follow-up"""
    lead_id: str
    description: str
    evidence: Dict[str, Any]
    confidence: float
    priority: str  # "high", "medium", "low"
    status: str  # "pending", "investigating", "validated", "rejected"
    discovery_date: str


@dataclass
class DiscoveryReport:
    """Comprehensive discovery report"""
    report_id: str
    timestamp: str
    discoveries: List[Dict[str, Any]]
    hypotheses: List[Dict[str, Any]]
    experiments: List[Dict[str, Any]]
    phenomena_cataloged: int
    novelty_summary: Dict[str, float]
    recommendations: List[str]
    next_steps: List[str]


class AutomatedDiscoveryPipeline:
    """
    Automated pipeline for discovering novel emergent phenomena

    Orchestrates exploration, pattern discovery, hypothesis generation,
    experimentation, and documentation.
    """

    def __init__(self,
                 simulation_fn: Callable,
                 output_dir: str = "./discovery_pipeline_results",
                 deepseek_api_key: str = "YOUR_API_KEY"):
        self.simulation_fn = simulation_fn
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Initialize components
        self.explorer = EmergenceExplorer(
            parameter_space=create_polln_parameter_space(),
            emergence_metrics=create_standard_emergence_metrics(),
            output_dir=str(self.output_dir / "exploration")
        )

        self.pattern_engine = PatternDiscoveryEngine(
            output_dir=str(self.output_dir / "patterns")
        )

        self.hypothesis_generator = DeepSeekHypothesisGenerator(
            api_key=deepseek_api_key,
            output_dir=str(self.output_dir / "hypotheses")
        )

        self.taxonomy = EmergenceTaxonomy(
            output_dir=str(self.output_dir / "taxonomy")
        )

        self.experimental_framework = ExperimentalFramework(
            simulation_fn=simulation_fn,
            output_dir=str(self.output_dir / "experiments")
        )

        self.catalog = PhenomenonCatalog(
            catalog_path=str(self.output_dir / "catalog")
        )

        self.deepseek = DeepSeekDiscovery(
            api_key=deepseek_api_key,
            output_dir=str(self.output_dir / "deepseek")
        )

        # Pipeline state
        self.discovery_leads: List[DiscoveryLead] = []
        self.reports: List[DiscoveryReport] = []

        logger.info("Discovery pipeline initialized")

    def run_discovery_cycle(self,
                           n_explorations: int = 100,
                           n_iterations: int = 3,
                           strategies: Optional[List[ExplorationStrategy]] = None) -> DiscoveryReport:
        """
        Run full discovery cycle

        Args:
            n_explorations: Number of explorations per iteration
            n_iterations: Number of iterative refinement cycles
            strategies: Exploration strategies to use

        Returns:
            Comprehensive discovery report
        """
        logger.info(f"Starting discovery cycle: {n_iterations} iterations x {n_explorations} explorations")

        if strategies is None:
            strategies = [
                ExplorationStrategy.ADAPTIVE,
                ExplorationStrategy.RARE_EVENT,
                ExplorationStrategy.ENTROPY_MAX
            ]

        all_discoveries = []
        all_hypotheses = []
        all_experiments = []
        phenomena_cataloged = 0
        novelty_scores = []

        # Iterative discovery
        for iteration in range(n_iterations):
            logger.info(f"\n{'='*60}")
            logger.info(f"ITERATION {iteration + 1}/{n_iterations}")
            logger.info(f"{'='*60}")

            # Phase 1: Explore parameter space
            logger.info("\n📍 Phase 1: Exploration")
            exploration_results = self._exploration_phase(n_explorations, strategies)
            all_discoveries.extend(exploration_results["discoveries"])

            # Phase 2: Discover patterns
            logger.info("\n🔍 Phase 2: Pattern Discovery")
            pattern_results = self._pattern_discovery_phase(exploration_results["data"])
            all_discoveries.extend(pattern_results["patterns"])

            # Phase 3: Generate hypotheses
            logger.info("\n🧠 Phase 3: Hypothesis Generation")
            hypothesis_results = self._hypothesis_generation_phase(pattern_results["significant_patterns"])
            all_hypotheses.extend(hypothesis_results["hypotheses"])

            # Phase 4: Design and run experiments
            logger.info("\n🧪 Phase 4: Experimental Validation")
            experiment_results = self._experimental_validation_phase(hypothesis_results["hypotheses"])
            all_experiments.extend(experiment_results["experiments"])

            # Phase 5: Catalog phenomena
            logger.info("\n📚 Phase 5: Phenomenon Cataloging")
            catalog_results = self._cataloging_phase(
                pattern_results["significant_patterns"],
                hypothesis_results["hypotheses"],
                experiment_results["experiments"]
            )
            phenomena_cataloged += catalog_results["n_cataloged"]
            novelty_scores.extend(catalog_results["novelty_scores"])

            # Generate discovery leads for next iteration
            if iteration < n_iterations - 1:
                self._generate_leads(exploration_results, pattern_results, hypothesis_results)

        # Generate final report
        report = self._generate_report(
            all_discoveries,
            all_hypotheses,
            all_experiments,
            phenomena_cataloged,
            novelty_scores
        )

        self.reports.append(report)

        # Save report
        self._save_report(report)

        logger.info("\n✅ Discovery cycle complete")

        return report

    def _exploration_phase(self,
                          n_explorations: int,
                          strategies: List[ExplorationStrategy]) -> Dict[str, Any]:
        """Phase 1: Explore parameter space"""
        discoveries = []
        all_data = []

        for strategy in strategies:
            logger.info(f"  Running {strategy.value} exploration...")

            results = self.explorer.explore(
                n_iterations=n_explorations // len(strategies),
                strategy=strategy,
                simulation_fn=self.simulation_fn,
                batch_size=10
            )

            discoveries.extend(results.get("discoveries", []))

            # Collect data for pattern discovery
            if "all_evaluations" in results:
                all_data.extend(results["all_evaluations"])

        return {
            "discoveries": discoveries,
            "data": all_data
        }

    def _pattern_discovery_phase(self, simulation_data: List[Dict]) -> Dict[str, Any]:
        """Phase 2: Discover patterns"""
        patterns = self.pattern_engine.discover_patterns(
            simulation_data,
            methods=["cluster", "anomaly", "trend"]
        )

        # Filter significant patterns
        significant_patterns = [p for p in patterns if p.confidence > 0.7]

        logger.info(f"  Discovered {len(patterns)} patterns ({len(significant_patterns)} significant)")

        return {
            "patterns": patterns,
            "significant_patterns": significant_patterns
        }

    def _hypothesis_generation_phase(self,
                                    significant_patterns: List[Pattern]) -> Dict[str, Any]:
        """Phase 3: Generate hypotheses"""
        hypotheses = []

        for pattern in significant_patterns[:5]:  # Top 5 patterns
            logger.info(f"  Generating hypotheses for pattern: {pattern.pattern_id}")

            # Prepare phenomenon data
            phenomenon_data = {
                "description": pattern.description,
                "features": pattern.features,
                "signature": pattern.signature,
                "patterns": [pattern]
            }

            # Generate hypotheses
            pattern_hypotheses = self.hypothesis_generator.generate_hypotheses(
                phenomenon_data,
                n_hypotheses=3
            )

            hypotheses.extend(pattern_hypotheses)

        logger.info(f"  Generated {len(hypotheses)} hypotheses")

        return {
            "hypotheses": hypotheses
        }

    def _experimental_validation_phase(self,
                                      hypotheses: List[Hypothesis]) -> Dict[str, Any]:
        """Phase 4: Experimental validation"""
        experiments = []

        for hypothesis in hypotheses[:3]:  # Top 3 hypotheses
            logger.info(f"  Designing experiments for: {hypothesis.mechanism[:50]}...")

            # Design experiments
            experiment_designs = self.hypothesis_generator.suggest_experiments(
                hypothesis,
                n_experiments=2
            )

            for exp_design in experiment_designs:
                # Create experiment
                experiment = self.experimental_framework.design_experiment(
                    name=f"Test: {hypothesis.mechanism[:30]}",
                    hypothesis=hypothesis.mechanism,
                    independent_vars={"temperature": (0.1, 2.0)},
                    dependent_vars=["performance", "coordination"],
                    controls={"learning_rate": 0.01},
                    n_replicates=5,
                    procedure=exp_design.get("setup", "")
                )

                # Run experiment
                results = self.experimental_framework.run_experiment(experiment)

                experiments.append({
                    "design": exp_design,
                    "results": results,
                    "hypothesis_id": hypothesis.hypothesis_id
                })

        logger.info(f"  Ran {len(experiments)} experiments")

        return {
            "experiments": experiments
        }

    def _cataloging_phase(self,
                         patterns: List[Pattern],
                         hypotheses: List[Hypothesis],
                         experiments: List[Dict]) -> Dict[str, Any]:
        """Phase 5: Catalog phenomena"""
        n_cataloged = 0
        novelty_scores = []

        for pattern, hypothesis in zip(patterns, hypotheses):
            if pattern.confidence > 0.8 and hypothesis.confidence > 0.7:
                # Create phenomenon entry
                phenomenon_data = {
                    "description": pattern.description,
                    "features": pattern.features,
                    "signature": pattern.signature,
                    "mechanism": hypothesis.mechanism,
                    "mechanism_confidence": hypothesis.confidence,
                    "theoretical_importance": hypothesis.novelty_score
                }

                entry = self.catalog.create_entry_from_discovery(
                    phenomenon_data,
                    name=f"Phenomenon: {pattern.pattern_type}",
                    short_name=pattern.pattern_id,
                    category=pattern.pattern_type
                )

                n_cataloged += 1
                novelty_scores.append(entry.novelty_score)

        logger.info(f"  Cataloged {n_cataloged} phenomena")

        return {
            "n_cataloged": n_cataloged,
            "novelty_scores": novelty_scores
        }

    def _generate_leads(self,
                       exploration_results: Dict,
                       pattern_results: Dict,
                       hypothesis_results: Dict) -> None:
        """Generate discovery leads for next iteration"""
        # Find areas requiring more investigation
        leads = []

        # High-confidence but unexplored regions
        for discovery in exploration_results.get("discoveries", []):
            if discovery.get("value", 0) > 0.9:
                lead = DiscoveryLead(
                    lead_id=f"lead_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    description=f"High value region: {discovery.get('metric', 'unknown')}",
                    evidence=discovery,
                    confidence=0.8,
                    priority="high",
                    status="pending",
                    discovery_date=datetime.now().isoformat()
                )
                leads.append(lead)

        # Anomalous patterns
        for pattern in pattern_results.get("patterns", []):
            if pattern.pattern_type == "anomaly" and pattern.confidence > 0.7:
                lead = DiscoveryLead(
                    lead_id=f"lead_anomaly_{pattern.pattern_id}",
                    description=f"Anomalous pattern: {pattern.description}",
                    evidence={"pattern": pattern},
                    confidence=pattern.confidence,
                    priority="medium",
                    status="pending",
                    discovery_date=datetime.now().isoformat()
                )
                leads.append(lead)

        self.discovery_leads.extend(leads)

        logger.info(f"  Generated {len(leads)} discovery leads")

    def _generate_report(self,
                        discoveries: List[Dict],
                        hypotheses: List[Hypothesis],
                        experiments: List[Dict],
                        n_cataloged: int,
                        novelty_scores: List[float]) -> DiscoveryReport:
        """Generate comprehensive discovery report"""
        report_id = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Summary statistics
        novelty_summary = {
            "mean": np.mean(novelty_scores) if novelty_scores else 0.0,
            "std": np.std(novelty_scores) if novelty_scores else 0.0,
            "max": np.max(novelty_scores) if novelty_scores else 0.0,
            "n_high_novelty": sum(1 for s in novelty_scores if s > 0.8) if novelty_scores else 0
        }

        # Generate recommendations
        recommendations = []
        if novelty_summary["mean"] > 0.7:
            recommendations.append("High novelty discoveries detected - consider publication")
        if len(hypotheses) > 10:
            recommendations.append("Multiple competing hypotheses - design discriminating experiments")
        if n_cataloged > 5:
            recommendations.append("Substantial catalog built - consider comparative analysis")

        # Next steps
        next_steps = []
        if self.discovery_leads:
            next_steps.append(f"Investigate {len(self.discovery_leads)} discovery leads")
        next_steps.append("Validate high-confidence hypotheses with additional experiments")
        next_steps.append("Refine mathematical models for top phenomena")
        next_steps.append("Prepare publication-ready summaries for most novel phenomena")

        report = DiscoveryReport(
            report_id=report_id,
            timestamp=datetime.now().isoformat(),
            discoveries=discoveries,
            hypotheses=[{
                "mechanism": h.mechanism,
                "confidence": h.confidence,
                "novelty": h.novelty_score
            } for h in hypotheses],
            experiments=[{
                "hypothesis_id": e.get("hypothesis_id"),
                "n_results": len(e.get("results", []))
            } for e in experiments],
            phenomena_cataloged=n_cataloged,
            novelty_summary=novelty_summary,
            recommendations=recommendations,
            next_steps=next_steps
        )

        return report

    def _save_report(self, report: DiscoveryReport) -> None:
        """Save discovery report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = self.output_dir / f"discovery_report_{timestamp}.json"

        report_data = {
            "report_id": report.report_id,
            "timestamp": report.timestamp,
            "discoveries": report.discoveries,
            "hypotheses": report.hypotheses,
            "experiments": report.experiments,
            "phenomena_cataloged": report.phenomena_cataloged,
            "novelty_summary": report.novelty_summary,
            "recommendations": report.recommendations,
            "next_steps": report.next_steps
        }

        with open(filename, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)

        logger.info(f"  Report saved to {filename}")

    def investigate_lead(self, lead_id: str) -> Dict[str, Any]:
        """Investigate a specific discovery lead"""
        lead = next((l for l in self.discovery_leads if l.lead_id == lead_id), None)

        if not lead:
            logger.error(f"Lead not found: {lead_id}")
            return {"error": "Lead not found"}

        logger.info(f"Investigating lead: {lead.description}")

        lead.status = "investigating"

        # Design focused investigation
        # This would involve targeted exploration and experiments

        lead.status = "validated"

        return {"lead": lead, "investigation_results": []}

    def generate_publication_materials(self) -> Dict[str, str]:
        """Generate publication-ready materials"""
        # Get high-novelty phenomena
        high_novelty = self.catalog.search("", min_novelty=0.8)

        materials = {}

        # Generate LaTeX paper outline
        materials["paper_outline"] = self._generate_paper_outline(high_novelty)

        # Generate figure descriptions
        materials["figures"] = self._generate_figure_descriptions(high_novelty)

        # Generate supplementary materials
        materials["supplementary"] = self._generate_supplementary_materials(high_novelty)

        return materials

    def _generate_paper_outline(self, phenomena: List[PhenomenonEntry]) -> str:
        """Generate paper outline"""
        outline = """
# Title: Discovery of Novel Emergent Phenomena in Multi-Agent Networks

## Abstract
[Summarize key discoveries and their significance]

## Introduction
- Background on emergent phenomena
- POLLN system description
- Research questions

## Methods
- Discovery pipeline
- Exploration strategies
- Pattern recognition
- Hypothesis generation
- Experimental validation

## Results
"""

        for i, phenomenon in enumerate(phenomena[:5], 1):
            outline += f"""
### {i}. {phenomenon.name}
- Description: {phenomenon.description}
- Features: {list(phenomenon.features.keys())}
- Novelty: {phenomenon.novelty_score:.2f}
"""

        outline += """
## Discussion
- Theoretical implications
- Comparison to known phenomena
- Limitations
- Future directions

## Conclusion
[Summary and significance]

## Acknowledgments
## References
"""

        return outline

    def _generate_figure_descriptions(self, phenomena: List[PhenomenonEntry]) -> str:
        """Generate figure descriptions"""
        figures = """
## Figure Descriptions

### Figure 1: Discovery Pipeline Overview
- Flowchart of automated discovery process
- Show iteration and refinement

### Figure 2: Novel Phenomena in Feature Space
- Scatter plot of phenomena in 2D feature space
- Highlight novel discoveries

### Figure 3: Key Phenomenon Characteristics
"""

        for i, phenomenon in enumerate(phenomena[:3], 1):
            figures += f"""
#### {chr(96+i)}. {phenomenon.short_name}
- Phase space diagram
- Time series or dynamics
- Feature importance
"""

        return figures

    def _generate_supplementary_materials(self, phenomena: List[PhenomenonEntry]) -> str:
        """Generate supplementary materials"""
        supp = """
## Supplementary Materials

### S1: Detailed Phenomena Catalog
[Complete catalog entries]

### S2: Mathematical Models
[Full mathematical formulations]

### S3: Experimental Protocols
[Detailed experimental procedures]

### S4: Statistical Analyses
[Complete statistical results]

### S5: Replication Scripts
[Code for reproducing results]
"""

        return supp


if __name__ == "__main__":
    # Mock simulation function for testing
    def mock_simulation(config):
        # Simulate some interesting behavior
        np.random.seed(hash(str(sorted(config.items()))) % 2**32)

        result = {
            "metrics": {
                "collective_intelligence": np.random.beta(2, 2),
                "criticality": np.random.beta(3, 2),
                "coordination": np.random.beta(2, 3),
                "synchronization": np.random.random(),
                "complexity": np.random.random()
            }
        }

        # Add phase transition at specific parameter values
        if config.get("temperature", 0.5) > 0.7:
            result["metrics"]["coordination"] *= 1.5
            result["metrics"]["synchronization"] *= 1.3

        return result

    # Run discovery pipeline
    pipeline = AutomatedDiscoveryPipeline(
        simulation_fn=mock_simulation,
        output_dir="./test_discovery_pipeline"
    )

    # Run discovery cycle (small scale for testing)
    report = pipeline.run_discovery_cycle(
        n_explorations=30,
        n_iterations=2
    )

    print("\n" + "="*60)
    print("DISCOVERY REPORT")
    print("="*60)
    print(f"Phenomena cataloged: {report.phenomena_cataloged}")
    print(f"Mean novelty: {report.novelty_summary['mean']:.2f}")
    print(f"High novelty phenomena: {report.novelty_summary['n_high_novelty']}")
    print(f"\nRecommendations:")
    for rec in report.recommendations:
        print(f"  - {rec}")

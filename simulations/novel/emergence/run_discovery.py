"""
Master Orchestrator for Emergence Discovery

Main entry point for running emergence discovery campaigns.
Orchestrates the full discovery process with configurable parameters.
"""

import argparse
import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
import json

# Import discovery pipeline
from discovery_pipeline import AutomatedDiscoveryPipeline, DiscoveryReport

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('discovery.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def create_mock_simulation():
    """Create mock simulation function for testing"""
    import numpy as np

    def mock_simulation(config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mock POLLN simulation for testing discovery pipeline

        Simulates various emergent phenomena based on parameter values.
        """
        np.random.seed(hash(str(sorted(config.items()))) % 2**32)

        # Base metrics
        metrics = {
            "collective_intelligence": np.random.beta(2, 2),
            "criticality": np.random.beta(3, 2),
            "coordination": np.random.beta(2, 3),
            "synchronization": np.random.random(),
            "complexity": np.random.random(),
            "adaptability": np.random.random(),
            "robustness": np.random.random()
        }

        # Simulate phase transitions
        temperature = config.get("temperature", 0.5)
        n_agents = config.get("n_agents", 100)
        connectivity = config.get("connectivity", 0.3)

        # Density-induced coordination transition
        if n_agents > 300 and connectivity > 0.5:
            metrics["coordination"] = 0.9 + np.random.normal(0, 0.05)
            metrics["synchronization"] = 0.85 + np.random.normal(0, 0.05)
            metrics["collective_intelligence"] *= 1.5

        # Temperature-driven criticality
        if 0.6 < temperature < 0.8:
            metrics["criticality"] = 0.95 + np.random.normal(0, 0.02)
            metrics["complexity"] *= 1.3

        # High connectivity coordination
        if connectivity > 0.7:
            metrics["coordination"] = min(0.98, metrics["coordination"] * 1.4)

        # Low temperature synchronization
        if temperature < 0.3:
            metrics["synchronization"] = min(0.95, metrics["synchronization"] * 1.5)

        return {
            "metrics": metrics,
            "config": config,
            "raw_result": {
                "agent_behavior": {
                    "coordination": metrics["coordination"],
                    "specialization": np.random.random(),
                    "emergence": metrics["collective_intelligence"]
                },
                "collective_dynamics": {
                    "synchronization": metrics["synchronization"],
                    "phase_transitions": metrics["criticality"],
                    "criticality": metrics["criticality"]
                },
                "information_flow": {
                    "entropy": np.random.random(),
                    "mutual_information": np.random.random(),
                    "transfer_entropy": np.random.random()
                }
            }
        }

    return mock_simulation


def run_discovery_campaign(args) -> DiscoveryReport:
    """
    Run discovery campaign with specified parameters

    Args:
        args: Parsed command line arguments

    Returns:
        Discovery report
    """
    logger.info("="*60)
    logger.info("EMERGENCE DISCOVERY CAMPAIGN")
    logger.info("="*60)
    logger.info(f"Start time: {datetime.now().isoformat()}")
    logger.info(f"Explorations: {args.explorations}")
    logger.info(f"Iterations: {args.iterations}")
    logger.info(f"Output directory: {args.output}")
    logger.info("")

    # Create simulation function
    if args.use_real_polln:
        # Import real POLLN
        try:
            sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))
            from core import Colony
            logger.info("Using real POLLN simulation")

            def polln_simulation(config):
                # Create and run POLLN colony
                colony = Colony(n_agents=config.get("n_agents", 100))
                # ... run simulation
                return {"metrics": {}, "config": config}

            simulation_fn = polln_simulation
        except ImportError as e:
            logger.warning(f"Could not import POLLN: {e}. Using mock simulation.")
            simulation_fn = create_mock_simulation()
    else:
        logger.info("Using mock simulation")
        simulation_fn = create_mock_simulation()

    # Initialize discovery pipeline
    pipeline = AutomatedDiscoveryPipeline(
        simulation_fn=simulation_fn,
        output_dir=args.output,
        deepseek_api_key=args.api_key
    )

    # Run discovery cycle
    report = pipeline.run_discovery_cycle(
        n_explorations=args.explorations,
        n_iterations=args.iterations
    )

    # Generate report
    logger.info("\n" + "="*60)
    logger.info("DISCOVERY CAMPAIGN COMPLETE")
    logger.info("="*60)
    logger.info(f"Phenomena cataloged: {report.phenomena_cataloged}")
    logger.info(f"Mean novelty score: {report.novelty_summary['mean']:.3f}")
    logger.info(f"High novelty phenomena: {report.novelty_summary['n_high_novelty']}")
    logger.info("")

    logger.info("RECOMMENDATIONS:")
    for i, rec in enumerate(report.recommendations, 1):
        logger.info(f"  {i}. {rec}")

    logger.info("\nNEXT STEPS:")
    for i, step in enumerate(report.next_steps, 1):
        logger.info(f"  {i}. {step}")

    # Generate publication materials if requested
    if args.generate_materials:
        logger.info("\nGenerating publication materials...")
        materials = pipeline.generate_publication_materials()

        materials_dir = Path(args.output) / "publication_materials"
        materials_dir.mkdir(exist_ok=True)

        for material_type, content in materials.items():
            filename = materials_dir / f"{material_type}.md"
            with open(filename, 'w') as f:
                f.write(content)
            logger.info(f"  Saved: {filename}")

    return report


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Run automated emergence discovery campaigns",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Quick test run
  python run_discovery.py --explorations 50 --iterations 2

  # Full discovery campaign
  python run_discovery.py --explorations 500 --iterations 5 --use-real-polln

  # Generate publication materials
  python run_discovery.py --explorations 200 --iterations 3 --generate-materials
        """
    )

    parser.add_argument(
        "--explorations",
        type=int,
        default=100,
        help="Number of parameter space explorations per iteration (default: 100)"
    )

    parser.add_argument(
        "--iterations",
        type=int,
        default=3,
        help="Number of iterative refinement cycles (default: 3)"
    )

    parser.add_argument(
        "--output",
        type=str,
        default="./discovery_results",
        help="Output directory for results (default: ./discovery_results)"
    )

    parser.add_argument(
        "--api-key",
        type=str,
        default="YOUR_API_KEY",
        help="DeepSeek API key (default: from code)"
    )

    parser.add_argument(
        "--use-real-polln",
        action="store_true",
        help="Use real POLLN simulation instead of mock"
    )

    parser.add_argument(
        "--generate-materials",
        action="store_true",
        help="Generate publication-ready materials"
    )

    parser.add_argument(
        "--quick-test",
        action="store_true",
        help="Run quick test with minimal explorations"
    )

    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()

    # Adjust for quick test
    if args.quick_test:
        args.explorations = 20
        args.iterations = 1
        logger.info("Running in quick test mode")

    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Run discovery campaign
    try:
        report = run_discovery_campaign(args)

        # Save report summary
        summary_file = Path(args.output) / "campaign_summary.json"
        with open(summary_file, 'w') as f:
            json.dump({
                "timestamp": report.timestamp,
                "phenomena_cataloged": report.phenomena_cataloged,
                "novelty_summary": report.novelty_summary,
                "recommendations": report.recommendations,
                "next_steps": report.next_steps
            }, f, indent=2, default=str)

        logger.info(f"\nCampaign summary saved to {summary_file}")

        return 0

    except Exception as e:
        logger.error(f"Discovery campaign failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())

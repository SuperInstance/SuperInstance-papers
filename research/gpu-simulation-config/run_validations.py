"""
GPU Validation Runner for Phase 2 Papers (P24-P30)

Hardware: NVIDIA RTX 4050 (6GB VRAM, 80% utilization)
Software: CuPy 14.0.1, CUDA 13.1.1
Model: glm-5 @ temperature 0.9
"""

import cupy as cp
import numpy as np
import time
from typing import Dict, List, Tuple, Callable
from pathlib import Path
import json

# Import simulation schemas
import sys
sys.path.append(str(Path(__file__).parent.parent / "papers"))

class GPUValidator:
    """Orchestrates GPU validation for Phase 2 papers."""

    def __init__(self, max_vram_gb=4.8):
        self.max_vram = max_vram_gb * 1024**3
        self.results = {}
        self.setup_gpu()

    def setup_gpu(self):
        """Configure GPU memory pool and limits."""
        print("Initializing GPU...")
        print(f"Device: {cp.cuda.Device()}")

        total, free = cp.cuda.Device().mem_info
        print(f"Total VRAM: {total / 1024**3:.2f} GB")
        print(f"Free VRAM: {free / 1024**3:.2f} GB")

        # Set memory limit to 80% of total
        mempool = cp.get_default_memory_pool()
        mempool.set_limit(size=self.max_vram)

        print(f"Memory limit set to: {self.max_vram / 1024**3:.2f} GB\n")

    def check_memory(self) -> Dict:
        """Check current GPU memory usage."""
        total, free = cp.cuda.Device().mem_info
        used = total - free
        return {
            "total_gb": total / 1024**3,
            "used_gb": used / 1024**3,
            "free_gb": free / 1024**3,
            "utilization": used / total
        }

    def run_validation(self, paper_id: str, validation_func: Callable) -> Dict:
        """Run validation for a single paper."""
        print(f"\n{'='*60}")
        print(f"Validating {paper_id}")
        print(f"{'='*60}")

        # Memory before
        mem_before = self.check_memory()
        print(f"Memory before: {mem_before['used_gb']:.2f} GB used")

        result = {
            "paper_id": paper_id,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "memory_before": mem_before,
        }

        try:
            # Run validation
            start_time = time.time()
            validation_result = validation_func()
            elapsed = time.time() - start_time

            # Memory after
            mem_after = self.check_memory()
            memory_used = mem_after["used_gb"] - mem_before["used_gb"]

            result.update({
                "status": "SUCCESS",
                "elapsed_time": elapsed,
                "memory_after": mem_after,
                "memory_used_gb": memory_used,
                "validation_result": validation_result
            })

            print(f"✅ {paper_id} Validation: SUCCESS")
            print(f"Time: {elapsed:.2f}s")
            print(f"Memory used: {memory_used:.2f} GB")

        except Exception as e:
            # Memory after error
            mem_after = self.check_memory()

            result.update({
                "status": "FAILED",
                "error": str(e),
                "memory_after": mem_after,
            })

            print(f"❌ {paper_id} Validation: FAILED")
            print(f"Error: {e}")

        finally:
            # Clear memory
            cp.get_default_memory_pool().free_all_blocks()
            cp.get_default_pinned_memory_pool().free_all_blocks()

        return result

    def validate_p24_self_play(self) -> Dict:
        """Validate P24: Self-Play Mechanisms."""
        from papers.24_self_play_mechanisms.simulation_schema import SelfPlaySimulation

        sim = SelfPlaySimulation(
            n_agents=1000,
            n_tasks=500,
            n_generations=100  # Reduced for faster validation
        )

        # Run simulation
        results = sim.run_simulation()

        # Validate claims
        validations = {
            "improvement_gt_30pct": results["improvement"] > 0.30,
            "elo_correlation": results["elo_correlation"] > 0.8,
            "novel_strategies": len(results["novel_strategies"]) > 0,
        }

        return {
            "claims": validations,
            "metrics": results
        }

    def validate_p25_hydraulic(self) -> Dict:
        """Validate P25: Hydraulic Intelligence."""
        from papers.25_hydraulic_intelligence.simulation_schema import HydraulicSimulation

        sim = HydraulicSimulation(
            n_agents=500,
            n_tasks=300,
            pressure_dim=100
        )

        results = sim.run_simulation()

        validations = {
            "pressure_predicts_activation": results["correlation"] > 0.8,
            "kirchhoff_compliance": results["kirchhoff_error"] < 0.05,
            "emergence_detectable": results["emergence_detected"],
        }

        return {
            "claims": validations,
            "metrics": results
        }

    def validate_p26_value_networks(self) -> Dict:
        """Validate P26: Value Networks."""
        from papers.26_value_networks.simulation_schema import ValueNetworkSimulation

        sim = ValueNetworkSimulation(
            n_colonies=200,
            state_dim=64,
            n_ensemble=5
        )

        results = sim.run_simulation()

        validations = {
            "correlation_gt_07": results["value_correlation"] > 0.7,
            "brier_lt_02": results["brier_score"] < 0.2,
            "improvement_gt_20pct": results["improvement"] > 0.20,
        }

        return {
            "claims": validations,
            "metrics": results
        }

    def validate_p27_emergence(self) -> Dict:
        """Validate P27: Emergence Detection."""
        from papers.27_emergence_detection.simulation_schema import EmergenceSimulation

        sim = EmergenceSimulation(
            n_agents=1000,
            history_len=100,
            n_bins=10
        )

        results = sim.run_simulation()

        validations = {
            "emergence_detectable": len(results["emergence_events"]) > 0,
            "transfer_entropy_detects": results["te_detection_rate"] > 0.7,
            "early_detection": results["early_detection_rate"] > 0.5,
        }

        return {
            "claims": validations,
            "metrics": results
        }

    def validate_p28_stigmergy(self) -> Dict:
        """Validate P28: Stigmergic Coordination."""
        from papers.28_stigmergic_coordination.simulation_schema import StigmergySimulation

        sim = StigmergySimulation(
            n_agents=1000,
            field_res=50,
            n_pheromones=5
        )

        results = sim.run_simulation()

        validations = {
            "coordination_emerges": results["coordination_score"] > 0.7,
            "implicit_topology": results["topology_detected"],
            "reduced_messaging": results["messaging_reduction"] > 0.5,
        }

        return {
            "claims": validations,
            "metrics": results
        }

    def validate_p29_coevolution(self) -> Dict:
        """Validate P29: Competitive Coevolution."""
        from papers.29_competitive_coevolution.simulation_schema import CoevolutionSimulation

        sim = CoevolutionSimulation(
            solver_pop=500,
            generator_pop=500,
            n_generations=100
        )

        results = sim.run_simulation()

        validations = {
            "improvement_gt_25pct": results["improvement"] > 0.25,
            "arms_race_detected": results["arms_race_correlation"] < -0.3,
            "diversity_maintained": results["diversity_score"] > 0.7,
        }

        return {
            "claims": validations,
            "metrics": results
        }

    def validate_p30_granularity(self) -> Dict:
        """Validate P30: Granularity Analysis."""
        from papers.30_granularity_analysis.simulation_schema import GranularitySimulation

        sim = GranularitySimulation(
            granularity_levels=20,
            n_agents=1000
        )

        results = sim.run_simulation()

        validations = {
            "optimal_granularity_found": results["optimal_granularity"] is not None,
            "too_fine_noisy": results["noise_at_min_g"] > 0.5,
            "too_coarse_missed": results["missed_at_max_g"] > 0.5,
        }

        return {
            "claims": validations,
            "metrics": results
        }

    def run_all_validations(self) -> Dict:
        """Run all Phase 2 validations sequentially."""
        print("\n" + "="*60)
        print("PHASE 2 VALIDATION SUITE")
        print("="*60)

        validations = [
            ("P24", "Self-Play", self.validate_p24_self_play),
            ("P25", "Hydraulic", self.validate_p25_hydraulic),
            ("P26", "Value Networks", self.validate_p26_value_networks),
            ("P27", "Emergence", self.validate_p27_emergence),
            ("P28", "Stigmergy", self.validate_p28_stigmergy),
            ("P29", "Coevolution", self.validate_p29_coevolution),
            ("P30", "Granularity", self.validate_p30_granularity),
        ]

        overall_results = {}
        success_count = 0

        for paper_id, paper_name, validation_func in validations:
            result = self.run_validation(paper_id, validation_func)
            overall_results[paper_id] = result

            if result["status"] == "SUCCESS":
                success_count += 1

        # Summary
        print(f"\n{'='*60}")
        print("VALIDATION SUMMARY")
        print(f"{'='*60}")
        print(f"Total: {len(validations)}")
        print(f"Success: {success_count}")
        print(f"Failed: {len(validations) - success_count}")

        return overall_results

    def save_results(self, results: Dict, output_path: str):
        """Save validation results to JSON file."""
        # Convert numpy types for JSON serialization
        def convert_to_serializable(obj):
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, (np.integer, np.floating)):
                return float(obj)
            elif isinstance(obj, dict):
                return {k: convert_to_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_to_serializable(item) for item in obj]
            else:
                return obj

        serializable_results = convert_to_serializable(results)

        with open(output_path, 'w') as f:
            json.dump(serializable_results, f, indent=2)

        print(f"\nResults saved to: {output_path}")

    def generate_markdown_report(self, results: Dict, output_path: str):
        """Generate markdown validation report."""
        with open(output_path, 'w') as f:
            f.write("# Phase 2 Validation Results\n\n")
            f.write(f"**Generated:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Hardware:** NVIDIA RTX 4050 (6GB VRAM)\n")
            f.write(f"**Software:** CuPy 14.0.1, CUDA 13.1.1\n\n")
            f.write("---\n\n")

            for paper_id, result in results.items():
                f.write(f"## {paper_id}\n\n")
                f.write(f"**Status:** {'✅ SUCCESS' if result['status'] == 'SUCCESS' else '❌ FAILED'}\n")

                if result['status'] == 'SUCCESS':
                    f.write(f"**Time:** {result['elapsed_time']:.2f}s\n")
                    f.write(f"**Memory Used:** {result['memory_used_gb']:.2f} GB\n\n")

                    if 'validation_result' in result:
                        vr = result['validation_result']
                        if 'claims' in vr:
                            f.write("### Claims Validation\n\n")
                            for claim, passed in vr['claims'].items():
                                status = "✅" if passed else "❌"
                                f.write(f"- {status} {claim}\n")
                            f.write("\n")
                else:
                    f.write(f"**Error:** {result.get('error', 'Unknown')}\n\n")

                f.write("---\n\n")

        print(f"Markdown report saved to: {output_path}")


def main():
    """Main execution."""
    validator = GPUValidator()

    # Run all validations
    results = validator.run_all_validations()

    # Save results
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    json_path = f"research/gpu-simulation-config/validation_results_{timestamp}.json"
    markdown_path = f"research/gpu-simulation-config/validation_report_{timestamp}.md"

    validator.save_results(results, json_path)
    validator.generate_markdown_report(results, markdown_path)


if __name__ == "__main__":
    main()

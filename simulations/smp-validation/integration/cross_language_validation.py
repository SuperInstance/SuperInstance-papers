"""
Cross-Language Validation Module

Validates consistency between Python simulations and TypeScript implementation.
Ensures mathematical properties hold across both implementations.
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np
from dataclasses import asdict
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from data.schemas import (
    ConfidenceCascadeResult,
    TileConfiguration,
    ChainConfiguration,
    ConfidenceZone,
    CompositionType,
    ConfidenceDistribution,
    generate_simulation_id
)
from data.generator import (
    GenerationConfig,
    ConfidenceGenerator
)


class CrossLanguageValidator:
    """Validator for cross-language consistency between Python and TypeScript"""

    def __init__(self, typescript_script_path: str = None):
        if typescript_script_path is None:
            self.typescript_script_path = Path(__file__).parent / "validate_typescript_simple.mjs"
        else:
            self.typescript_script_path = Path(typescript_script_path)

        if not self.typescript_script_path.exists():
            raise FileNotFoundError(
                f"TypeScript validation script not found: {self.typescript_script_path}"
            )

    def prepare_test_cases(self, results: List[ConfidenceCascadeResult]) -> List[Dict[str, Any]]:
        """
        Prepare test cases from Python simulation results for TypeScript validation
        """
        test_cases = []

        for result in results:
            test_case = {
                "test_id": result.simulation_id,
                "composition_type": result.chain_config.composition_type.value,
                "confidences": result.input_confidences,
                "weights": result.weights,
                "expected_confidence": result.actual_confidence,
                "expected_zone": result.output_zone.value,
                "chain_length": len(result.input_confidences)
            }
            test_cases.append(test_case)

        return test_cases

    def run_typescript_validation(self, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Run TypeScript validation on test cases
        """
        # Serialize test cases to JSON
        test_data = json.dumps(test_cases)

        try:
            # Run TypeScript validation script
            result = subprocess.run(
                ["node", str(self.typescript_script_path)],
                input=test_data,
                capture_output=True,
                text=True,
                timeout=30  # 30 second timeout
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "error": f"TypeScript validation failed with exit code {result.returncode}",
                    "stderr": result.stderr,
                    "stdout": result.stdout
                }

            # Parse results
            ts_results = json.loads(result.stdout)

            return {
                "success": True,
                "results": ts_results,
                "stderr": result.stderr,
                "stdout": result.stdout
            }

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "TypeScript validation timed out after 30 seconds"
            }
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Failed to parse TypeScript output: {e}",
                "stdout": result.stdout if 'result' in locals() else None
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Unexpected error: {e}"
            }

    def compare_results(self,
                       python_results: List[ConfidenceCascadeResult],
                       typescript_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Compare Python and TypeScript results
        """
        if len(python_results) != len(typescript_results):
            return {
                "success": False,
                "error": f"Result count mismatch: Python={len(python_results)}, TypeScript={len(typescript_results)}"
            }

        comparisons = []
        discrepancies = []

        for py_result, ts_result in zip(python_results, typescript_results):
            # Skip if TypeScript validation failed for this test case
            if "error" in ts_result:
                comparisons.append({
                    "test_id": py_result.simulation_id,
                    "error": ts_result["error"],
                    "validation_passed": False
                })
                continue

            # Compare confidence values
            confidence_diff = abs(py_result.actual_confidence - ts_result["typescript_confidence"])
            zone_match = py_result.output_zone.value == ts_result["typescript_zone"]

            comparison = {
                "test_id": py_result.simulation_id,
                "composition_type": py_result.chain_config.composition_type.value,
                "python_confidence": py_result.actual_confidence,
                "typescript_confidence": ts_result["typescript_confidence"],
                "confidence_difference": confidence_diff,
                "python_zone": py_result.output_zone.value,
                "typescript_zone": ts_result["typescript_zone"],
                "zone_match": zone_match,
                "validation_passed": ts_result.get("validation_passed", False) and
                                     confidence_diff < 0.001 and zone_match
            }

            comparisons.append(comparison)

            if not comparison["validation_passed"]:
                discrepancies.append({
                    "test_id": py_result.simulation_id,
                    "composition_type": py_result.chain_config.composition_type.value,
                    "confidence_difference": confidence_diff,
                    "zone_match": zone_match,
                    "typescript_validation_passed": ts_result.get("validation_passed", False)
                })

        # Calculate statistics
        passed_tests = [c for c in comparisons if c.get("validation_passed", False)]
        failed_tests = [c for c in comparisons if not c.get("validation_passed", False)]

        confidence_diffs = [c["confidence_difference"] for c in comparisons if "confidence_difference" in c]
        zone_matches = [c["zone_match"] for c in comparisons if "zone_match" in c]

        return {
            "success": True,
            "summary": {
                "total_tests": len(comparisons),
                "passed_tests": len(passed_tests),
                "failed_tests": len(failed_tests),
                "success_rate": len(passed_tests) / len(comparisons) if comparisons else 0,
                "mean_confidence_difference": np.mean(confidence_diffs) if confidence_diffs else 0,
                "max_confidence_difference": max(confidence_diffs) if confidence_diffs else 0,
                "zone_match_rate": sum(zone_matches) / len(zone_matches) if zone_matches else 0
            },
            "comparisons": comparisons,
            "discrepancies": discrepancies,
            "validation_passed": len(failed_tests) == 0
        }

    def validate_simulation_results(self, results: List[ConfidenceCascadeResult]) -> Dict[str, Any]:
        """
        Complete validation pipeline: Python → TypeScript → Comparison
        """
        # Prepare test cases
        test_cases = self.prepare_test_cases(results)

        if not test_cases:
            return {
                "success": False,
                "error": "No test cases generated from results"
            }

        # Run TypeScript validation
        ts_validation = self.run_typescript_validation(test_cases)

        if not ts_validation["success"]:
            return {
                "success": False,
                "error": f"TypeScript validation failed: {ts_validation.get('error', 'Unknown error')}",
                "typescript_output": ts_validation
            }

        # Compare results
        comparison = self.compare_results(results, ts_validation["results"])

        return {
            "success": True,
            "test_case_count": len(test_cases),
            "typescript_validation": ts_validation,
            "comparison": comparison,
            "overall_validation_passed": comparison.get("validation_passed", False)
        }

    def generate_validation_report(self, validation_result: Dict[str, Any]) -> str:
        """
        Generate human-readable validation report
        """
        if not validation_result.get("success", False):
            return f"Validation failed: {validation_result.get('error', 'Unknown error')}"

        comparison = validation_result.get("comparison", {})
        summary = comparison.get("summary", {})

        report_lines = [
            "=" * 80,
            "CROSS-LANGUAGE VALIDATION REPORT",
            "=" * 80,
            f"Generated: {datetime.now().isoformat()}",
            f"Test cases: {validation_result.get('test_case_count', 0)}",
            "",
            "SUMMARY",
            "-" * 40,
            f"Total tests: {summary.get('total_tests', 0)}",
            f"Passed tests: {summary.get('passed_tests', 0)}",
            f"Failed tests: {summary.get('failed_tests', 0)}",
            f"Success rate: {summary.get('success_rate', 0):.2%}",
            f"Mean confidence difference: {summary.get('mean_confidence_difference', 0):.6f}",
            f"Max confidence difference: {summary.get('max_confidence_difference', 0):.6f}",
            f"Zone match rate: {summary.get('zone_match_rate', 0):.2%}",
            f"Overall validation passed: {validation_result.get('overall_validation_passed', False)}",
            ""
        ]

        # Add discrepancy details if any
        discrepancies = comparison.get("discrepancies", [])
        if discrepancies:
            report_lines.extend([
                "DISCREPANCIES",
                "-" * 40
            ])
            for i, disc in enumerate(discrepancies[:10]):  # Show first 10 discrepancies
                report_lines.append(
                    f"{i+1}. {disc['test_id']} ({disc['composition_type']}): "
                    f"diff={disc.get('confidence_difference', 0):.6f}, "
                    f"zone_match={disc.get('zone_match', False)}"
                )

            if len(discrepancies) > 10:
                report_lines.append(f"... and {len(discrepancies) - 10} more discrepancies")

        # Add validation criteria
        report_lines.extend([
            "",
            "VALIDATION CRITERIA",
            "-" * 40,
            "[*] All tests must pass (100% success rate)",
            "[*] Confidence differences must be < 0.001",
            "[*] Zones must match exactly",
            "[*] TypeScript validation must succeed for all test cases",
            "",
            "RECOMMENDATION",
            "-" * 40
        ])

        if validation_result.get("overall_validation_passed", False):
            report_lines.append("[PASS] CROSS-LANGUAGE VALIDATION PASSED")
            report_lines.append("Python and TypeScript implementations are consistent.")
        else:
            report_lines.append("[FAIL] CROSS-LANGUAGE VALIDATION FAILED")
            report_lines.append("Investigate discrepancies between implementations.")

        report_lines.append("=" * 80)

        return "\n".join(report_lines)


def main():
    """Main entry point for cross-language validation"""
    import argparse

    parser = argparse.ArgumentParser(description="Run cross-language validation between Python and TypeScript")
    parser.add_argument("--input", type=str, required=True,
                       help="Input JSON file with Python simulation results")
    parser.add_argument("--output", type=str, default="results/cross_language_validation.json",
                       help="Output file path for validation results")
    parser.add_argument("--report", type=str, default="results/cross_language_report.txt",
                       help="Output file path for human-readable report")
    parser.add_argument("--typescript-script", type=str,
                       default="integration/validate_typescript_simple.mjs",
                       help="Path to TypeScript validation script")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")

    args = parser.parse_args()

    # Create output directory if needed
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    # Load Python simulation results
    try:
        with open(args.input, 'r') as f:
            data = json.load(f)
            results_data = data.get("results", [])

        # Convert to ConfidenceCascadeResult objects
        results = [ConfidenceCascadeResult.from_dict(r) for r in results_data]

        if args.verbose:
            print(f"Loaded {len(results)} simulation results from {args.input}")

    except Exception as e:
        print(f"Error loading simulation results: {e}")
        sys.exit(1)

    # Initialize validator
    try:
        validator = CrossLanguageValidator(args.typescript_script)
    except Exception as e:
        print(f"Error initializing validator: {e}")
        sys.exit(1)

    if args.verbose:
        print(f"Running cross-language validation with {len(results)} test cases...")
        print(f"TypeScript script: {args.typescript_script}")

    # Run validation
    validation_result = validator.validate_simulation_results(results)

    # Generate report
    report = validator.generate_validation_report(validation_result)

    # Save results
    with open(output_path, 'w') as f:
        json.dump(validation_result, f, indent=2, default=str)

    with open(report_path, 'w') as f:
        f.write(report)

    if args.verbose:
        print("\n" + report)
        print(f"\nResults saved to: {args.output}")
        print(f"Report saved to: {args.report}")

    # Exit with appropriate code
    if validation_result.get("overall_validation_passed", False):
        if args.verbose:
            print("[PASS] Validation passed successfully!")
        sys.exit(0)
    else:
        if args.verbose:
            print("[FAIL] Validation failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
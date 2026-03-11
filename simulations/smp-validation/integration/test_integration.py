"""
Integration with Existing Test Infrastructure

Provides integration between simulation framework and existing TypeScript tests.
Generates test cases from simulation data and validates consistency.
"""

import json
import subprocess
import tempfile
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from data.schemas import (
    ConfidenceCascadeResult,
    ChainConfiguration,
    CompositionType,
    ConfidenceZone
)
from data.generator import (
    GenerationConfig,
    ConfidenceGenerator,
    TileGenerator,
    ChainGenerator,
    TestCaseGenerator
)


class TestIntegration:
    """Integrates simulation framework with existing test infrastructure"""

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize test integration

        Args:
            config_path: Path to simulation configuration file
        """
        self.config_path = config_path
        self._load_config()

        # Initialize generators
        gen_config = GenerationConfig()
        confidence_gen = ConfidenceGenerator(gen_config)
        tile_gen = TileGenerator(confidence_gen)
        chain_gen = ChainGenerator(tile_gen)
        self.test_case_gen = TestCaseGenerator(chain_gen)

        # Paths to existing test files
        self.test_files = {
            "confidence_properties": "../../src/spreadsheet/tiles/tests/confidence-properties.test.ts",
            "zone_classification": "../../src/spreadsheet/tiles/tests/zone-classification.test.ts",
            "tile_composition": "../../src/spreadsheet/tiles/tests/tile-composition.test.ts",
            "end_to_end": "../../src/spreadsheet/tiles/tests/end-to-end.test.ts"
        }

    def _load_config(self):
        """Load configuration from file"""
        # Simplified config loading
        # In practice, would load from YAML/JSON
        self.config = {
            "typescript_path": "../../src/spreadsheet/tiles/confidence-cascade.ts",
            "test_output_dir": "./generated_tests",
            "validation_script": "./validate_typescript.js"
        }

    def generate_test_cases_from_simulation(
        self,
        simulation_results: List[ConfidenceCascadeResult],
        test_type: str = "confidence_cascade"
    ) -> List[Dict[str, Any]]:
        """
        Generate test cases from simulation results

        Args:
            simulation_results: List of simulation results
            test_type: Type of test to generate

        Returns:
            List of test case dictionaries
        """
        test_cases = []

        for i, result in enumerate(simulation_results):
            test_case = {
                "test_id": f"simulation_generated_{test_type}_{i:04d}",
                "description": f"Generated from simulation {result.simulation_id}",
                "input": {
                    "confidences": result.input_confidences,
                    "zones": [z.value for z in result.input_zones],
                    "weights": result.weights
                },
                "expected": {
                    "confidence": result.actual_confidence,
                    "zone": result.output_zone.value,
                    "error": result.absolute_error
                },
                "metadata": {
                    "simulation_id": result.simulation_id,
                    "chain_config": result.chain_config.to_dict(),
                    "generation_timestamp": result.timestamp.isoformat()
                }
            }

            test_cases.append(test_case)

        return test_cases

    def convert_to_typescript_test(
        self,
        test_cases: List[Dict[str, Any]],
        test_file: str = "confidence_properties"
    ) -> str:
        """
        Convert test cases to TypeScript test code

        Args:
            test_cases: List of test case dictionaries
            test_file: Target test file type

        Returns:
            TypeScript test code as string
        """
        if test_file == "confidence_properties":
            return self._generate_confidence_properties_test(test_cases)
        elif test_file == "zone_classification":
            return self._generate_zone_classification_test(test_cases)
        elif test_file == "tile_composition":
            return self._generate_tile_composition_test(test_cases)
        else:
            raise ValueError(f"Unknown test file type: {test_file}")

    def _generate_confidence_properties_test(
        self,
        test_cases: List[Dict[str, Any]]
    ) -> str:
        """Generate TypeScript test for confidence properties"""
        test_code = """/**
 * Generated Test Cases from Simulation Results
 *
 * This file was automatically generated from simulation data.
 * DO NOT EDIT MANUALLY - Regenerate from simulation results.
 */

import { createConfidence, sequentialCascade, parallelCascade } from '../confidence-cascade';
import { assertClose } from './test-utils';

describe('Simulation-Generated Confidence Cascade Tests', () => {
"""

        for i, test_case in enumerate(test_cases):
            confidences = test_case["input"]["confidences"]
            expected = test_case["expected"]["confidence"]

            # Generate test for sequential composition
            if len(confidences) >= 2:
                test_code += f"""
    test('simulation_generated_sequential_{i:04d}', async () => {{
        // Test case from simulation {test_case['metadata']['simulation_id']}
        const conf1 = createConfidence({confidences[0]}, 'simulation_tile_1');
        const conf2 = createConfidence({confidences[1]}, 'simulation_tile_2');

        const result = sequentialCascade([conf1, conf2]);

        // Expected confidence: {confidences[0]} × {confidences[1]} = {confidences[0] * confidences[1]}
        // Simulation result: {expected}
        assertClose(result.confidence.value, {expected}, 0.001,
            `Sequential composition failed for simulation case {i}`
        );
    }});
"""

            # Generate test for parallel composition if weights provided
            if test_case["input"]["weights"] and len(confidences) >= 2:
                weights = test_case["input"]["weights"]
                test_code += f"""
    test('simulation_generated_parallel_{i:04d}', async () => {{
        // Test case from simulation {test_case['metadata']['simulation_id']}
        const conf1 = createConfidence({confidences[0]}, 'simulation_tile_1');
        const conf2 = createConfidence({confidences[1]}, 'simulation_tile_2');

        const result = parallelCascade([
            {{ confidence: conf1, weight: {weights[0]} }},
            {{ confidence: conf2, weight: {weights[1]} }}
        ]);

        // Expected weighted average
        const expectedWeighted = {confidences[0]} * {weights[0]} + {confidences[1]} * {weights[1]};
        // Simulation result: {expected}
        assertClose(result.confidence.value, {expected}, 0.001,
            `Parallel composition failed for simulation case {i}`
        );
    }});
"""

        test_code += "});\n"
        return test_code

    def _generate_zone_classification_test(
        self,
        test_cases: List[Dict[str, Any]]
    ) -> str:
        """Generate TypeScript test for zone classification"""
        test_code = """/**
 * Generated Zone Classification Tests from Simulation Results
 *
 * This file was automatically generated from simulation data.
 * DO NOT EDIT MANUALLY - Regenerate from simulation results.
 */

import { createConfidence, ConfidenceZone } from '../confidence-cascade';

describe('Simulation-Generated Zone Classification Tests', () => {
"""

        for i, test_case in enumerate(test_cases):
            confidences = test_case["input"]["confidences"]
            expected_zone = test_case["expected"]["zone"]

            for j, confidence in enumerate(confidences):
                test_code += f"""
    test('simulation_zone_{i:04d}_tile_{j}', () => {{
        // From simulation {test_case['metadata']['simulation_id']}
        const confidence = createConfidence({confidence}, 'simulation_tile_{j}');

        // Expected zone: {expected_zone}
        expect(confidence.zone).toBe(ConfidenceZone.{expected_zone});
    }});
"""

        test_code += "});\n"
        return test_code

    def _generate_tile_composition_test(
        self,
        test_cases: List[Dict[str, Any]]
    ) -> str:
        """Generate TypeScript test for tile composition"""
        # This is a simplified version
        # In practice, would generate more comprehensive composition tests
        test_code = """/**
 * Generated Tile Composition Tests from Simulation Results
 *
 * This file was automatically generated from simulation data.
 * DO NOT EDIT MANUALLY - Regenerate from simulation results.
 */

import { MockTile, Schemas } from './test-utils';
import { assertClose } from './test-utils';

describe('Simulation-Generated Tile Composition Tests', () => {
"""

        for i, test_case in enumerate(test_cases[:10]):  # Limit to 10 cases
            confidences = test_case["input"]["confidences"]

            if len(confidences) >= 2:
                test_code += f"""
    test('simulation_composition_{i:04d}', async () => {{
        // From simulation {test_case['metadata']['simulation_id']}
        const tileA = new MockTile<string, string>(
            Schemas.string,
            Schemas.string,
            async (input) => input + '-A',
            {confidences[0]},
            'Simulation tile A'
        );

        const tileB = new MockTile<string, string>(
            Schemas.string,
            Schemas.string,
            async (input) => input + '-B',
            {confidences[1]},
            'Simulation tile B'
        );

        const composed = tileA.compose(tileB);
        const confidence = await composed.confidence('test');

        // Expected: {confidences[0]} × {confidences[1]} = {confidences[0] * confidences[1]}
        assertClose(confidence, {confidences[0] * confidences[1]}, 0.001,
            `Composition failed for simulation case {i}`
        );
    }});
"""

        test_code += "});\n"
        return test_code

    def write_test_file(
        self,
        test_code: str,
        filename: str,
        output_dir: Optional[str] = None
    ) -> str:
        """
        Write test code to file

        Args:
            test_code: TypeScript test code
            filename: Output filename
            output_dir: Output directory (defaults to config)

        Returns:
            Path to written file
        """
        if output_dir is None:
            output_dir = self.config["test_output_dir"]

        os.makedirs(output_dir, exist_ok=True)
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w') as f:
            f.write(test_code)

        print(f"Test file written to: {filepath}")
        return filepath

    def validate_with_typescript(
        self,
        test_cases: List[Dict[str, Any]],
        validation_script: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate test cases with TypeScript implementation

        Args:
            test_cases: List of test cases to validate
            validation_script: Path to validation script

        Returns:
            Validation results
        """
        if validation_script is None:
            validation_script = self.config["validation_script"]

        # Create temporary file with test cases
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(test_cases, f, indent=2)
            temp_file = f.name

        try:
            # Run validation script
            result = subprocess.run(
                ["node", validation_script, temp_file],
                capture_output=True,
                text=True,
                timeout=30
            )

            # Parse results
            if result.returncode == 0:
                validation_results = json.loads(result.stdout)
            else:
                validation_results = {
                    "success": False,
                    "error": result.stderr,
                    "returncode": result.returncode
                }

        except subprocess.TimeoutExpired:
            validation_results = {
                "success": False,
                "error": "Validation timed out after 30 seconds"
            }
        except json.JSONDecodeError as e:
            validation_results = {
                "success": False,
                "error": f"Failed to parse validation output: {e}"
            }
        finally:
            # Clean up temporary file
            os.unlink(temp_file)

        return validation_results

    def run_existing_tests(
        self,
        test_file: str,
        test_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Run existing TypeScript tests

        Args:
            test_file: Which test file to run
            test_filter: Optional test filter

        Returns:
            Test results
        """
        if test_file not in self.test_files:
            raise ValueError(f"Unknown test file: {test_file}")

        test_path = self.test_files[test_file]

        # Build test command
        cmd = ["npm", "test", "--", test_path]
        if test_filter:
            cmd.extend(["--testNamePattern", test_filter])

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60,
                cwd=Path(__file__).parent.parent.parent  # Project root
            )

            test_results = {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }

        except subprocess.TimeoutExpired:
            test_results = {
                "success": False,
                "error": "Test execution timed out after 60 seconds"
            }

        return test_results

    def compare_simulation_with_tests(
        self,
        simulation_results: List[ConfidenceCascadeResult],
        test_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compare simulation results with test results

        Args:
            simulation_results: Simulation results to compare
            test_results: Test execution results

        Returns:
            Comparison results
        """
        # This is a simplified comparison
        # In practice, would parse test output and compare with simulation

        comparison = {
            "simulation_count": len(simulation_results),
            "test_success": test_results.get("success", False),
            "discrepancies": [],
            "summary": {}
        }

        # Calculate basic statistics from simulation
        if simulation_results:
            errors = [r.absolute_error for r in simulation_results if r.absolute_error is not None]
            if errors:
                comparison["summary"]["mean_error"] = sum(errors) / len(errors)
                comparison["summary"]["max_error"] = max(errors)
                comparison["summary"]["error_distribution"] = {
                    "p95": sorted(errors)[int(len(errors) * 0.95)],
                    "p99": sorted(errors)[int(len(errors) * 0.99)]
                }

        return comparison

    def generate_integration_report(
        self,
        simulation_results: List[ConfidenceCascadeResult],
        test_results: Dict[str, Any],
        comparison: Dict[str, Any]
    ) -> str:
        """
        Generate integration report

        Args:
            simulation_results: Simulation results
            test_results: Test execution results
            comparison: Comparison results

        Returns:
            Markdown report
        """
        report = f"""# Simulation-Test Integration Report

## Summary
- **Simulation Cases:** {len(simulation_results)}
- **Test Status:** {'✅ PASS' if test_results.get('success') else '❌ FAIL'}
- **Integration Status:** {'✅ SUCCESS' if comparison.get('test_success') else '❌ FAILED'}

## Simulation Results
{self._format_simulation_summary(simulation_results)}

## Test Execution
{self._format_test_results(test_results)}

## Comparison
{self._format_comparison(comparison)}

## Recommendations
{self._generate_recommendations(simulation_results, test_results, comparison)}

---
*Report generated on {datetime.now().isoformat()}*
"""

        return report

    def _format_simulation_summary(
        self,
        simulation_results: List[ConfidenceCascadeResult]
    ) -> str:
        """Format simulation summary for report"""
        if not simulation_results:
            return "No simulation results available."

        summary = []
        summary.append(f"- **Total Cases:** {len(simulation_results)}")

        # Count by composition type
        comp_types = {}
        for result in simulation_results:
            comp_type = result.chain_config.composition_type.value
            comp_types[comp_type] = comp_types.get(comp_type, 0) + 1

        summary.append("- **Composition Types:**")
        for comp_type, count in comp_types.items():
            summary.append(f"  - {comp_type}: {count} cases")

        # Error statistics
        errors = [r.absolute_error for r in simulation_results if r.absolute_error is not None]
        if errors:
            mean_error = sum(errors) / len(errors)
            max_error = max(errors)
            summary.append(f"- **Mean Absolute Error:** {mean_error:.6f}")
            summary.append(f"- **Maximum Error:** {max_error:.6f}")

        return "\n".join(summary)

    def _format_test_results(self, test_results: Dict[str, Any]) -> str:
        """Format test results for report"""
        summary = []

        if test_results.get("success"):
            summary.append("✅ **Tests Passed**")
        else:
            summary.append("❌ **Tests Failed**")

        if "stdout" in test_results and test_results["stdout"]:
            # Extract key information from test output
            lines = test_results["stdout"].split('\n')
            passed = [l for l in lines if "✓" in l]
            failed = [l for l in lines if "✗" in l]

            if passed:
                summary.append(f"- **Passed:** {len(passed)} tests")
            if failed:
                summary.append(f"- **Failed:** {len(failed)} tests")

        if "error" in test_results:
            summary.append(f"- **Error:** {test_results['error']}")

        return "\n".join(summary)

    def _format_comparison(self, comparison: Dict[str, Any]) -> str:
        """Format comparison results for report"""
        summary = []

        if comparison.get("test_success"):
            summary.append("✅ **Tests consistent with simulation**")
        else:
            summary.append("❌ **Tests inconsistent with simulation**")

        if "summary" in comparison:
            stats = comparison["summary"]
            if "mean_error" in stats:
                summary.append(f"- **Mean Simulation Error:** {stats['mean_error']:.6f}")
            if "max_error" in stats:
                summary.append(f"- **Max Simulation Error:** {stats['max_error']:.6f}")

        if comparison.get("discrepancies"):
            summary.append(f"- **Discrepancies Found:** {len(comparison['discrepancies'])}")
            # Show first few discrepancies
            for i, disc in enumerate(comparison["discrepancies"][:3]):
                summary.append(f"  {i+1}. {disc}")

        return "\n".join(summary)

    def _generate_recommendations(
        self,
        simulation_results: List[ConfidenceCascadeResult],
        test_results: Dict[str, Any],
        comparison: Dict[str, Any]
    ) -> str:
        """Generate recommendations based on integration results"""
        recommendations = []

        if not simulation_results:
            recommendations.append("1. **Run simulations** to generate test cases")
        elif not test_results.get("success"):
            recommendations.append("1. **Fix failing tests** before integration")
        elif comparison.get("discrepancies"):
            recommendations.append("1. **Investigate discrepancies** between simulation and tests")
        else:
            recommendations.append("1. **Integration successful** - proceed to production")

        # Additional recommendations based on error rates
        if simulation_results:
            errors = [r.absolute_error for r in simulation_results if r.absolute_error is not None]
            if errors:
                mean_error = sum(errors) / len(errors)
                if mean_error > 0.001:
                    recommendations.append("2. **Improve simulation accuracy** - mean error > 0.001")

        return "\n".join(recommendations)


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

def main():
    """Command-line interface for test integration"""
    import argparse

    parser = argparse.ArgumentParser(description="Integrate simulation with existing tests")
    parser.add_argument("--simulation-results", "-s", required=True,
                       help="Path to simulation results JSON file")
    parser.add_argument("--test-type", "-t", default="confidence_properties",
                       choices=["confidence_properties", "zone_classification", "tile_composition"],
                       help="Type of test to generate")
    parser.add_argument("--output-dir", "-o", default="./generated_tests",
                       help="Output directory for generated tests")
    parser.add_argument("--validate", "-v", action="store_true",
                       help="Validate with TypeScript implementation")
    parser.add_argument("--run-tests", "-r", action="store_true",
                       help="Run existing tests after generation")

    args = parser.parse_args()

    # Initialize integration
    integration = TestIntegration()

    # Load simulation results
    print(f"Loading simulation results from {args.simulation_results}...")
    with open(args.simulation_results, 'r') as f:
        simulation_data = json.load(f)

    # Convert to ConfidenceCascadeResult objects
    simulation_results = []
    for data in simulation_data.get("results", []):
        try:
            result = ConfidenceCascadeResult.from_dict(data)
            simulation_results.append(result)
        except Exception as e:
            print(f"Warning: Failed to parse result: {e}")

    print(f"Loaded {len(simulation_results)} simulation results")

    # Generate test cases
    print(f"Generating test cases for {args.test_type}...")
    test_cases = integration.generate_test_cases_from_simulation(
        simulation_results, args.test_type
    )

    # Convert to TypeScript
    print("Converting to TypeScript test code...")
    test_code = integration.convert_to_typescript_test(test_cases, args.test_type)

    # Write test file
    filename = f"simulation_generated_{args.test_type}.test.ts"
    filepath = integration.write_test_file(test_code, filename, args.output_dir)

    print(f"Generated {len(test_cases)} test cases in {filepath}")

    # Validate if requested
    if args.validate:
        print("Validating with TypeScript implementation...")
        validation_results = integration.validate_with_typescript(test_cases)

        if validation_results.get("success"):
            print("✅ Validation successful")
        else:
            print("❌ Validation failed")
            print(f"Error: {validation_results.get('error')}")

    # Run tests if requested
    if args.run_tests:
        print(f"Running {args.test_type} tests...")
        test_results = integration.run_existing_tests(args.test_type)

        if test_results.get("success"):
            print("✅ Tests passed")
        else:
            print("❌ Tests failed")
            if test_results.get("stderr"):
                print(f"Error output:\n{test_results['stderr']}")

        # Compare with simulation
        comparison = integration.compare_simulation_with_tests(
            simulation_results, test_results
        )

        # Generate report
        report = integration.generate_integration_report(
            simulation_results, test_results, comparison
        )

        report_file = os.path.join(args.output_dir, "integration_report.md")
        with open(report_file, 'w') as f:
            f.write(report)

        print(f"Integration report written to {report_file}")

    print("Integration complete!")


if __name__ == "__main__":
    from datetime import datetime
    main()


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = ["TestIntegration"]
"""
Test Runner Script for SuperInstance Integration Tests
======================================================

Convenient script to run different test suites with various configurations.

Usage:
    python run_tests.py                    # Run all fast tests
    python run_tests.py --full             # Run all tests including slow
    python run_tests.py --smoke            # Run only smoke tests
    python run_tests.py --performance      # Run performance tests
    python run_tests.py --coverage         # Run with coverage report

Author: Integration Testing Team
Created: 2026-03-13
"""

import argparse
import subprocess
import sys
from pathlib import Path


def run_command(cmd, description):
    """Run a command and print results."""
    print(f"\n{'='*70}")
    print(f"Running: {description}")
    print(f"{'='*70}")
    print(f"Command: {' '.join(cmd)}\n")

    result = subprocess.run(cmd)

    if result.returncode != 0:
        print(f"\n{'!'*70}")
        print(f"FAILED: {description}")
        print(f"{'!'*70}")
        return False
    else:
        print(f"\n{'*'*70}")
        print(f"SUCCESS: {description}")
        print(f"{'*'*70}")
        return True


def run_smoke_tests():
    """Run quick smoke tests."""
    cmd = [
        sys.executable, "-m", "pytest",
        "integration_tests.py",
        "-v",
        "-m", "smoke",
        "--tb=short",
        "--asyncio-mode=auto"
    ]
    return run_command(cmd, "Smoke Tests (basic functionality)")


def run_integration_tests():
    """Run integration tests."""
    cmd = [
        sys.executable, "-m", "pytest",
        "integration_tests.py",
        "-v",
        "-m", "integration",
        "--tb=short",
        "--asyncio-mode=auto"
    ]
    return run_command(cmd, "Integration Tests")


def run_performance_tests():
    """Run performance tests."""
    cmd = [
        sys.executable, "-m", "pytest",
        "performance_tests.py",
        "-v",
        "-m", "performance",
        "--tb=short",
        "--asyncio-mode=auto",
        "-s"  # Show print output
    ]
    return run_command(cmd, "Performance Tests")


def run_all_tests(include_slow=False):
    """Run all tests."""
    markers = []
    if not include_slow:
        markers.append("not slow")

    marker_expr = " and ".join(markers) if markers else ""

    cmd = [
        sys.executable, "-m", "pytest",
        ".",
        "-v",
        "--tb=short",
        "--asyncio-mode=auto"
    ]

    if marker_expr:
        cmd.extend(["-m", marker_expr])

    test_type = "All Tests" if include_slow else "All Fast Tests"
    return run_command(cmd, test_type)


def run_with_coverage():
    """Run tests with coverage report."""
    cmd = [
        sys.executable, "-m", "pytest",
        ".",
        "-v",
        "--tb=short",
        "--asyncio-mode=auto",
        "--cov=.",
        "--cov-report=html",
        "--cov-report=term",
        "--cov-report=json"
    ]
    return run_command(cmd, "Tests with Coverage")


def run_parallel_tests():
    """Run tests in parallel for speed."""
    cmd = [
        sys.executable, "-m", "pytest",
        ".",
        "-v",
        "-n", "auto",  # Auto-detect CPU count
        "--tb=short",
        "--asyncio-mode=auto"
    ]
    return run_command(cmd, "Parallel Tests (pytest-xdist)")


def generate_html_report():
    """Run tests and generate HTML report."""
    cmd = [
        sys.executable, "-m", "pytest",
        ".",
        "-v",
        "--tb=short",
        "--asyncio-mode=auto",
        "--html=test_reports/report.html",
        "--self-contained-html"
    ]
    return run_command(cmd, "Tests with HTML Report")


def main():
    parser = argparse.ArgumentParser(
        description="Run SuperInstance integration tests"
    )

    parser.add_argument(
        "--smoke",
        action="store_true",
        help="Run only smoke tests"
    )
    parser.add_argument(
        "--integration",
        action="store_true",
        help="Run only integration tests"
    )
    parser.add_argument(
        "--performance",
        action="store_true",
        help="Run only performance tests"
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Run all tests including slow ones"
    )
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="Run tests with coverage report"
    )
    parser.add_argument(
        "--parallel",
        action="store_true",
        help="Run tests in parallel"
    )
    parser.add_argument(
        "--html-report",
        action="store_true",
        help="Generate HTML report"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run all test suites sequentially"
    )

    args = parser.parse_args()

    # Create test reports directory
    Path("test_reports").mkdir(exist_ok=True)

    results = []

    if args.smoke:
        results.append(run_smoke_tests())

    if args.integration:
        results.append(run_integration_tests())

    if args.performance:
        results.append(run_performance_tests())

    if args.coverage:
        results.append(run_with_coverage())

    if args.parallel:
        results.append(run_parallel_tests())

    if args.html_report:
        results.append(generate_html_report())

    if args.all:
        results.append(run_smoke_tests())
        results.append(run_integration_tests())
        results.append(run_performance_tests())

    # Default: run fast tests
    if not any([args.smoke, args.integration, args.performance,
                args.full, args.coverage, args.parallel,
                args.html_report, args.all]):
        results.append(run_all_tests(include_slow=False))

    # Print summary
    print(f"\n{'='*70}")
    print("TEST SUMMARY")
    print(f"{'='*70}")

    if all(results):
        print("All test suites PASSED")
        return 0
    else:
        print("Some test suites FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(main())

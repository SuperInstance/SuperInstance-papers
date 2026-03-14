"""
Pytest Configuration for SuperInstance Integration Tests
=========================================================

Configuration and fixtures for pytest test execution.

Author: Integration Testing Team
Created: 2026-03-13
"""

import pytest
import asyncio
import sys
from pathlib import Path

# Add project paths
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "research" / "phase7_gpu_simulations"))
sys.path.insert(0, str(project_root / "research" / "phase6_advanced_simulations"))


# =============================================================================
# Async Configuration
# =============================================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# =============================================================================
# Test Markers
# =============================================================================

def pytest_configure(config):
    """Configure custom pytest markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "gpu: marks tests that require GPU"
    )
    config.addinivalue_line(
        "markers", "cloud: marks tests that require cloud access"
    )
    config.addinivalue_line(
        "markers", "smoke: marks quick smoke tests"
    )
    config.addinivalue_line(
        "markers", "performance: marks performance tests"
    )
    config.addinivalue_line(
        "markers", "reliability: marks reliability tests"
    )


# =============================================================================
# Test Options
# =============================================================================

def pytest_addoption(parser):
    """Add custom command line options."""
    parser.addoption(
        "--include-slow",
        action="store_true",
        default=False,
        help="Include slow tests"
    )
    parser.addoption(
        "--gpu-required",
        action="store_true",
        default=False,
        help="Require GPU for tests (skip if unavailable)"
    )
    parser.addoption(
        "--cloud-required",
        action="store_true",
        default=False,
        help="Require cloud access for tests"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection based on options."""
    # Skip slow tests unless requested
    if not config.getoption("--include-slow"):
        skip_slow = pytest.mark.skip(reason="Slow test skipped (use --include-slow)")
        for item in items:
            if "slow" in item.keywords:
                item.add_marker(skip_slow)

    # Skip GPU tests if not required and GPU unavailable
    if not config.getoption("--gpu-required"):
        try:
            import cupy as cp
            gpu_available = cp.cuda.is_available()
        except:
            gpu_available = False

        if not gpu_available:
            skip_gpu = pytest.mark.skip(reason="GPU not available (use --gpu-required to ensure it runs)")
            for item in items:
                if "gpu" in item.keywords:
                    item.add_marker(skip_gpu)

    # Skip cloud tests if not required
    if not config.getoption("--cloud-required"):
        skip_cloud = pytest.mark.skip(reason="Cloud access not configured (use --cloud-required)")
        for item in items:
            if "cloud" in item.keywords:
                item.add_marker(skip_cloud)


# =============================================================================
# Hooks
# =============================================================================

@pytest.fixture(autouse=True)
def reset_seed():
    """Reset random seed before each test for reproducibility."""
    import numpy as np
    np.random.seed(42)
    yield


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Generate test report with additional information.

    Adds timing and performance metrics to test reports.
    """
    outcome = yield
    report = outcome.get_result()

    # Add timing information
    if report.when == "call":
        duration = call.stop - call.start
        report.performance_metrics = {
            "duration_sec": duration
        }

    return report


# =============================================================================
# Summary Reporting
# =============================================================================

def pytest_terminal_summary(terminalreporter, exitstatus, config):
    """Add custom summary to test report."""
    terminalreporter.write_sep("=", "Test Performance Summary")

    # Collect timing data
    durations = []
    for reported in terminalreporter.stats.get("passed", []):
        if hasattr(reported, "performance_metrics"):
            durations.append(reported.performance_metrics["duration_sec"])

    if durations:
        terminalreporter.write_line(
            f"Total test time: {sum(durations):.2f}s"
        )
        terminalreporter.write_line(
            f"Average test time: {sum(durations)/len(durations):.2f}s"
        )
        terminalreporter.write_line(
            f"Slowest test: {max(durations):.2f}s"
        )
        terminalreporter.write_line(
            f"Fastest test: {min(durations):.2f}s"
        )

    terminalreporter.write_sep("=")

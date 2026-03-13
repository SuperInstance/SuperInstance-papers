#!/usr/bin/env python3
"""
Test Suite for Production Simulation Framework

Validates all core functionality:
- Workload trace capture and serialization
- GPU acceleration and fallback
- Hardware modeling accuracy
- Statistical validation
- Plugin architecture
"""

import sys
import time
import json
from pathlib import Path

# Test imports
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    print("ERROR: NumPy is required")
    sys.exit(1)

try:
    import cupy as cp
    GPU_AVAILABLE = True
except ImportError:
    GPU_AVAILABLE = False
    print("WARNING: CuPy not available, GPU tests will be skipped")

# Import framework
sys.path.insert(0, str(Path(__file__).parent))
from framework import (
    ProductionSimulationFramework,
    HardwareConfig,
    WorkloadTrace,
    TraceOperation,
    GPUSimulationEngine,
    RealisticHardwareModel,
    StatisticalValidator,
    ResultExporter
)


class TestRunner:
    """Run all tests and report results."""

    def __init__(self):
        self.tests_passed = 0
        self.tests_failed = 0
        self.test_results = []

    def run_test(self, test_name: str, test_fn):
        """Run a single test."""
        print(f"\n{'=' * 80}")
        print(f"TEST: {test_name}")
        print('=' * 80)

        try:
            start_time = time.time()
            result = test_fn()
            elapsed = time.time() - start_time

            if result:
                self.tests_passed += 1
                status = "PASSED"
            else:
                self.tests_failed += 1
                status = "FAILED"

            self.test_results.append({
                "test": test_name,
                "status": status,
                "elapsed": elapsed
            })

            print(f"\n{status} ({elapsed:.2f}s)")
            return result

        except Exception as e:
            self.tests_failed += 1
            print(f"\nFAILED with exception: {e}")
            import traceback
            traceback.print_exc()
            self.test_results.append({
                "test": test_name,
                "status": "ERROR",
                "error": str(e)
            })
            return False

    def print_summary(self):
        """Print test summary."""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_failed}")
        print(f"Total: {self.tests_passed + self.tests_failed}")

        if self.tests_failed == 0:
            print("\nALL TESTS PASSED!")
        else:
            print(f"\n{self.tests_failed} TEST(S) FAILED")

        # Print details
        print("\nDetails:")
        for result in self.test_results:
            status_symbol = "✓" if result["status"] == "PASSED" else "✗"
            elapsed = f" ({result.get('elapsed', 0):.2f}s)" if "elapsed" in result else ""
            print(f"  {status_symbol} {result['test']}{elapsed}")


# =============================================================================
# Test Functions
# =============================================================================

def test_framework_initialization():
    """Test framework initialization with default config."""
    print("Testing framework initialization...")

    framework = ProductionSimulationFramework(
        use_gpu=GPU_AVAILABLE,
        num_runs=5  # Reduced for testing
    )

    # Check components
    assert framework.hardware_config is not None
    assert framework.engine is not None
    assert framework.hardware_model is not None
    assert framework.validator is not None

    # Check default hardware config
    assert framework.hardware_config.gpu_name == "RTX 4050"
    assert framework.hardware_config.gpu_clock_mhz == 1837

    print("  Framework initialized successfully")
    print(f"  GPU Acceleration: {'Enabled' if framework.engine.use_gpu else 'Disabled'}")
    print(f"  Available plugins: {framework.plugin_registry.list_plugins()}")

    return True


def test_hardware_config():
    """Test hardware configuration."""
    print("Testing hardware configuration...")

    # Custom config
    config = HardwareConfig(
        gpu_name="RTX 4090",
        gpu_clock_mhz=2520,
        gpu_tdp_watts=450.0,
        l1_cache_size_kb=64,
        l2_cache_size_kb=512
    )

    # Convert to dict
    config_dict = config.to_dict()
    assert config_dict["gpu_name"] == "RTX 4090"
    assert config_dict["l1_cache_kb"] == 64

    print(f"  Custom config created: {config.gpu_name}")
    print(f"  Config dict: {json.dumps(config_dict, indent=4)}")

    return True


def test_gpu_engine():
    """Test GPU simulation engine."""
    print("Testing GPU simulation engine...")

    engine = GPUSimulationEngine(use_gpu=GPU_AVAILABLE)

    # Test array allocation
    arr = engine.allocate_array((100, 100), dtype=np.float32)
    assert arr.shape == (100, 100)

    # Test CPU/GPU transfer
    cpu_arr = np.random.randn(50, 50)
    gpu_arr = engine.to_device(cpu_arr)

    if GPU_AVAILABLE:
        assert isinstance(gpu_arr, cp.ndarray)
        back_to_cpu = engine.to_host(gpu_arr)
        assert np.allclose(cpu_arr, back_to_cpu)
        print("  GPU transfer: CPU -> GPU -> CPU successful")
    else:
        print("  GPU not available, using CPU mode")

    # Test batch simulation
    def simple_sim(x):
        return x ** 2

    params = [{"x": i} for i in range(5)]
    results = engine.batch_simulate(lambda x: simple_sim(x), params)
    assert len(results) == 5

    print(f"  Batch simulation: {len(results)} runs completed")

    return True


def test_hardware_model():
    """Test realistic hardware modeling."""
    print("Testing hardware modeling...")

    config = HardwareConfig()
    model = RealisticHardwareModel(config)

    # Test memory access latency
    latency = model.compute_access_latency(
        address=0x1000,
        data_size_bytes=64
    )
    assert latency > 0
    print(f"  Memory access latency: {latency} cycles")

    # Test energy computation
    energy = model.compute_energy_joules(
        operation="compute",
        data_size_bytes=1024,
        duration_cycles=1000
    )
    assert energy > 0
    print(f"  Energy consumption: {energy * 1000:.4f} mJ")

    # Test thermal model
    initial_temp = model.temperature_c
    model.update_temperature(power_watts=100.0, duration_s=0.1)
    assert model.temperature_c > initial_temp
    print(f"  Temperature: {initial_temp:.1f}C -> {model.temperature_c:.1f}C")

    # Test NoC latency
    noc_latency = model.compute_noc_latency(
        source_tile=0,
        dest_tile=15,
        message_size_bytes=256
    )
    assert noc_latency > 0
    print(f"  NoC latency (0->15): {noc_latency} cycles")

    return True


def test_trace_capture():
    """Test workload trace capture."""
    print("Testing workload trace capture...")

    from framework import PyTorchTraceCapture

    capture = PyTorchTraceCapture()

    # Capture synthetic trace
    trace = capture.capture_inference_trace(
        model_name="resnet50",
        input_spec={"batch_size": 1, "img_size": 224}
    )

    # Validate trace
    assert trace.model_name == "resnet50"
    assert len(trace.operations) > 0
    assert trace.total_flops > 0
    assert trace.total_memory_bytes > 0

    print(f"  Model: {trace.model_name}")
    print(f"  Operations: {len(trace.operations)}")
    print(f"  Total FLOPs: {trace.total_flops / 1e9:.2f} GFLOPs")
    print(f"  Total memory: {trace.total_memory_bytes / 1024**2:.2f} MB")
    print(f"  Trace hash: {trace.trace_hash}")

    # Test serialization
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        filepath = Path(tmpdir) / "test_trace"

        # Save and load
        capture.save_trace(trace, str(filepath))
        loaded_trace = capture.load_trace(str(filepath) + ".json")

        assert loaded_trace.model_name == trace.model_name
        assert len(loaded_trace.operations) == len(trace.operations)
        print(f"  Serialization: Save/Load successful")

    return True


def test_statistical_validator():
    """Test statistical validation."""
    print("Testing statistical validator...")

    validator = StatisticalValidator(num_runs=10, confidence_level=0.95)

    # Run simulation with known distribution
    def sample_simulation():
        return np.random.normal(loc=100, scale=10)

    results = validator.run_with_statistics(
        sample_simulation,
        metric_name="test_metric"
    )

    # Validate results
    assert results.sample_size == 10
    assert results.mean > 90 and results.mean < 110
    assert results.std > 0
    assert len(results.confidence_interval_95) == 2
    assert results.confidence_interval_95[0] < results.mean < results.confidence_interval_95[1]

    print(f"  Mean: {results.mean:.2f}")
    print(f"  Std: {results.std:.2f}")
    print(f"  95% CI: [{results.confidence_interval_95[0]:.2f}, {results.confidence_interval_95[1]:.2f}]")
    print(f"  Percentiles: {results.percentiles}")

    return True


def test_builtin_plugins():
    """Test built-in simulation plugins."""
    print("Testing built-in plugins...")

    framework = ProductionSimulationFramework(
        use_gpu=GPU_AVAILABLE,
        num_runs=3
    )

    # Capture trace
    trace = framework.capture_trace("resnet50", {"batch_size": 1})

    # Test each plugin
    plugins = ["memory_hierarchy", "energy_consumption", "thermal_simulation"]

    for plugin_name in plugins:
        print(f"\n  Testing {plugin_name}...")

        results = framework.run_simulation(
            plugin_name,
            trace,
            with_statistics=False
        )

        assert results is not None
        assert isinstance(results, dict)
        print(f"    Results: {list(results.keys())[:5]}...")

    return True


def test_plugin_with_statistics():
    """Test plugin execution with statistical validation."""
    print("Testing plugin with statistics...")

    framework = ProductionSimulationFramework(
        use_gpu=GPU_AVAILABLE,
        num_runs=5  # Reduced for testing
    )

    trace = framework.capture_trace("resnet50", {"batch_size": 1})

    results = framework.run_simulation(
        "memory_hierarchy",
        trace,
        with_statistics=True
    )

    # Validate statistical results
    assert hasattr(results, 'mean')
    assert hasattr(results, 'std')
    assert hasattr(results, 'confidence_interval_95')

    print(f"  Mean latency: {results.mean:.2f} cycles")
    print(f"  Std: {results.std:.2f}")
    print(f"  95% CI: {results.confidence_interval_95}")
    print(f"  Sample size: {results.sample_size}")

    return True


def test_result_export():
    """Test result export to different formats."""
    print("Testing result export...")

    framework = ProductionSimulationFramework(use_gpu=GPU_AVAILABLE, num_runs=3)
    trace = framework.capture_trace("resnet50", {"batch_size": 1})

    results = framework.run_multi_plugin(
        ["memory_hierarchy", "energy_consumption"],
        trace,
        with_statistics=False
    )

    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        # Test JSON export
        json_path = Path(tmpdir) / "results.json"
        framework.export_results(results, str(json_path), format="json")
        assert json_path.exists()
        print(f"  JSON export: {json_path.stat().st_size} bytes")

        # Test CSV export
        csv_path = Path(tmpdir) / "results.csv"
        framework.export_results(results, str(csv_path), format="csv")
        assert csv_path.exists()
        print(f"  CSV export: {csv_path.stat().st_size} bytes")

        # Verify JSON content
        with open(json_path) as f:
            loaded = json.load(f)
            assert "memory_hierarchy" in loaded
            print(f"  JSON validation: OK")

    return True


def test_multi_plugin_simulation():
    """Test running multiple plugins simultaneously."""
    print("Testing multi-plugin simulation...")

    framework = ProductionSimulationFramework(use_gpu=GPU_AVAILABLE, num_runs=3)
    trace = framework.capture_trace("resnet50", {"batch_size": 1})

    results = framework.run_multi_plugin(
        ["memory_hierarchy", "energy_consumption", "thermal_simulation"],
        trace,
        with_statistics=False
    )

    # Validate all plugins ran
    assert "memory_hierarchy" in results
    assert "energy_consumption" in results
    assert "thermal_simulation" in results

    print(f"  Plugins executed: {list(results.keys())}")

    for plugin_name, plugin_results in results.items():
        print(f"  {plugin_name}: {len(plugin_results)} metrics")

    return True


def test_trace_comparison():
    """Test comparing two workload traces."""
    print("Testing trace comparison...")

    framework = ProductionSimulationFramework(use_gpu=GPU_AVAILABLE, num_runs=5)

    # Capture two different traces
    trace1 = framework.capture_trace("resnet50", {"batch_size": 1})
    trace2 = framework.capture_trace("resnet18", {"batch_size": 1})

    # Compare
    comparison = framework.compare_traces(trace1, trace2)

    # Validate comparison
    assert "difference_mean" in comparison
    assert "relative_improvement" in comparison

    print(f"  Model 1: {trace1.model_name} ({len(trace1.operations)} ops)")
    print(f"  Model 2: {trace2.model_name} ({len(trace2.operations)} ops)")
    print(f"  Difference: {comparison['difference_mean']:.2f}")
    print(f"  Relative: {comparison['relative_improvement']:.2f}%")

    return True


def test_custom_plugin_registration():
    """Test custom plugin registration."""
    print("Testing custom plugin registration...")

    from framework import SimulationPlugin

    class TestPlugin(SimulationPlugin):
        @property
        def name(self):
            return "test_plugin"

        @property
        def description(self):
            return "Test plugin"

        def initialize(self, hardware, engine):
            self.hardware = hardware
            self.engine = engine

        def simulate(self, trace, **kwargs):
            return {"test_metric": 42}

    framework = ProductionSimulationFramework(use_gpu=GPU_AVAILABLE, num_runs=3)

    # Register custom plugin
    framework.register_plugin(TestPlugin())

    # Verify registration
    assert "test_plugin" in framework.plugin_registry.list_plugins()

    # Run custom plugin
    trace = framework.capture_trace("resnet50", {"batch_size": 1})
    results = framework.run_simulation("test_plugin", trace, with_statistics=False)

    assert results["test_metric"] == 42

    print(f"  Plugin registered: test_plugin")
    print(f"  Plugin executed: {results}")

    return True


def test_full_workflow():
    """Test complete simulation workflow."""
    print("Testing full simulation workflow...")

    # Initialize
    framework = ProductionSimulationFramework(
        hardware_config=HardwareConfig(
            gpu_name="RTX 4050",
            gpu_clock_mhz=1837
        ),
        use_gpu=GPU_AVAILABLE,
        num_runs=5
    )

    # Capture trace
    print("  1. Capturing trace...")
    trace = framework.capture_trace("resnet50", {"batch_size": 1, "img_size": 224})
    print(f"     Captured: {len(trace.operations)} operations")

    # Run simulations
    print("  2. Running simulations...")
    results = framework.run_multi_plugin(
        ["memory_hierarchy", "energy_consumption", "thermal_simulation"],
        trace
    )

    # Validate results
    print("  3. Validating results...")
    for plugin_name, plugin_results in results.items():
        if isinstance(plugin_results, dict) and "mean" in plugin_results:
            print(f"     {plugin_name}: mean={plugin_results['mean']:.2f}")

    # Export results
    print("  4. Exporting results...")
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        output_path = Path(tmpdir) / "workflow_results.json"
        framework.export_results(results, str(output_path), format="json")
        print(f"     Exported to: {output_path}")

    print("  Workflow completed successfully!")
    return True


# =============================================================================
# Main Test Runner
# =============================================================================

def main():
    """Run all tests."""
    print("=" * 80)
    print("PRODUCTION SIMULATION FRAMEWORK - TEST SUITE")
    print("=" * 80)
    print(f"NumPy: {'Available' if NUMPY_AVAILABLE else 'Not Available'}")
    print(f"CuPy/GPU: {'Available' if GPU_AVAILABLE else 'Not Available'}")
    print("=" * 80)

    runner = TestRunner()

    # Run tests
    runner.run_test("Framework Initialization", test_framework_initialization)
    runner.run_test("Hardware Configuration", test_hardware_config)
    runner.run_test("GPU Engine", test_gpu_engine)
    runner.run_test("Hardware Model", test_hardware_model)
    runner.run_test("Trace Capture", test_trace_capture)
    runner.run_test("Statistical Validator", test_statistical_validator)
    runner.run_test("Built-in Plugins", test_builtin_plugins)
    runner.run_test("Plugin with Statistics", test_plugin_with_statistics)
    runner.run_test("Result Export", test_result_export)
    runner.run_test("Multi-Plugin Simulation", test_multi_plugin_simulation)
    runner.run_test("Trace Comparison", test_trace_comparison)
    runner.run_test("Custom Plugin Registration", test_custom_plugin_registration)
    runner.run_test("Full Workflow", test_full_workflow)

    # Print summary
    runner.print_summary()

    # Exit with appropriate code
    sys.exit(0 if runner.tests_failed == 0 else 1)


if __name__ == "__main__":
    main()

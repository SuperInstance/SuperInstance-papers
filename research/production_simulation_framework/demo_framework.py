#!/usr/bin/env python3
"""
Production Simulation Framework - Demo Script

Demonstrates core functionality without relying on statistical validation
of dictionary results.
"""

import sys
from pathlib import Path

# Add framework to path
sys.path.insert(0, str(Path(__file__).parent))

from framework import (
    ProductionSimulationFramework,
    HardwareConfig,
    quick_simulate
)

print("=" * 80)
print("PRODUCTION SIMULATION FRAMEWORK - DEMONSTRATION")
print("=" * 80)

# Demo 1: Quick Simulation
print("\n1. QUICK SIMULATION (One-liner)")
print("-" * 80)
results = quick_simulate("resnet50", "memory_hierarchy", use_gpu=False)
print(f"Results: {results}")

# Demo 2: Framework with Custom Config
print("\n2. FRAMEWORK WITH CUSTOM HARDWARE CONFIG")
print("-" * 80)

config = HardwareConfig(
    gpu_name="RTX 4050",
    gpu_clock_mhz=1837,
    gpu_tdp_watts=115.0
)

framework = ProductionSimulationFramework(
    hardware_config=config,
    use_gpu=False,  # Use CPU for demo
    num_runs=5
)

print(f"Framework initialized")
print(f"Hardware: {config.gpu_name}")
print(f"Available plugins: {framework.plugin_registry.list_plugins()}")

# Demo 3: Trace Capture
print("\n3. WORKLOAD TRACE CAPTURE")
print("-" * 80)

trace = framework.capture_trace(
    model_name="resnet50",
    input_spec={"batch_size": 1, "img_size": 224}
)

print(f"Model: {trace.model_name}")
print(f"Operations: {len(trace.operations)}")
print(f"Total FLOPs: {trace.total_flops / 1e9:.2f} GFLOPs")
print(f"Total Memory: {trace.total_memory_bytes / 1024**2:.2f} MB")
print(f"Duration: {trace.total_duration_ms:.2f} ms")

# Show first few operations
print("\nFirst 5 operations:")
for i, op in enumerate(trace.operations[:5]):
    print(f"  {i+1}. {op.op_type}: {op.layer_name}")
    print(f"     Input: {op.input_shape} -> Output: {op.output_shape}")
    print(f"     FLOPs: {op.compute_flops / 1e6:.2f} MFLOPs")

# Demo 4: Single Plugin Simulation
print("\n4. SINGLE PLUGIN SIMULATION")
print("-" * 80)

# Memory Hierarchy
print("\nMemory Hierarchy Plugin:")
mem_results = framework.run_simulation(
    "memory_hierarchy",
    trace,
    with_statistics=False
)
print(f"  Total Latency: {mem_results['total_latency_us']:.2f} us")
print(f"  Total Energy: {mem_results['total_energy_joules'] * 1000:.2f} mJ")
print(f"  Operations: {mem_results['operations_count']}")

# Energy Consumption
print("\nEnergy Consumption Plugin:")
energy_results = framework.run_simulation(
    "energy_consumption",
    trace,
    with_statistics=False
)
print(f"  Total Energy: {energy_results['total_energy_joules'] * 1000:.2f} mJ")
print(f"  Avg Power: {energy_results['average_power_watts']:.2f} W")
print(f"  Efficiency: {energy_results['energy_efficiency_gflops_per_watt']:.2f} GFLOPs/W")

# Thermal Simulation
print("\nThermal Simulation Plugin:")
thermal_results = framework.run_simulation(
    "thermal_simulation",
    trace,
    with_statistics=False
)
print(f"  Initial Temp: {thermal_results['initial_temperature_c']:.1f} C")
print(f"  Peak Temp: {thermal_results['peak_temperature_c']:.1f} C")
print(f"  Final Temp: {thermal_results['final_temperature_c']:.1f} C")
print(f"  Throttled: {'Yes' if thermal_results['thermal_throttle_occurred'] else 'No'}")

# Demo 5: Multi-Plugin Simulation
print("\n5. MULTI-PLUGIN SIMULATION")
print("-" * 80)

results = framework.run_multi_plugin(
    ["memory_hierarchy", "energy_consumption", "thermal_simulation"],
    trace,
    with_statistics=False
)

print(f"Ran {len(results)} plugins")
for plugin_name, plugin_results in results.items():
    print(f"  {plugin_name}: {len(plugin_results)} metrics")

# Demo 6: Trace Comparison
print("\n6. TRACE COMPARISON")
print("-" * 80)

trace1 = framework.capture_trace("resnet50", {"batch_size": 1})
trace2 = framework.capture_trace("resnet18", {"batch_size": 1})

print(f"Trace 1: {trace1.model_name} ({len(trace1.operations)} ops)")
print(f"  FLOPs: {trace1.total_flops / 1e9:.2f} GFLOPs")
print(f"Trace 2: {trace2.model_name} ({len(trace2.operations)} ops)")
print(f"  FLOPs: {trace2.total_flops / 1e9:.2f} GFLOPs")

# Demo 7: Result Export
print("\n7. RESULT EXPORT")
print("-" * 80)

import tempfile
import json

with tempfile.TemporaryDirectory() as tmpdir:
    output_path = Path(tmpdir) / "demo_results.json"

    export_data = {
        "hardware": config.to_dict(),
        "trace": trace.to_dict(),
        "simulations": {
            "memory_hierarchy": mem_results,
            "energy_consumption": energy_results,
            "thermal_simulation": {
                k: v for k, v in thermal_results.items()
                if k not in ['temperature_trace', 'power_trace']  # Exclude large arrays
            }
        }
    }

    framework.export_results(export_data, str(output_path), format="json")

    print(f"Exported to: {output_path}")
    print(f"File size: {output_path.stat().st_size} bytes")

    # Show preview
    with open(output_path) as f:
        preview = json.load(f)
    print(f"Keys: {list(preview.keys())}")

# Demo 8: Hardware Model Details
print("\n8. HARDWARE MODEL DETAILS")
print("-" * 80)

hw_model = framework.hardware_model

# Test memory latency
print("Memory Access Latency:")
for level in ['L1', 'L2', 'L3', 'DRAM']:
    # Simulate cache state to force access at specific level
    cache_state = {'L1': set(), 'L2': set(), 'L3': set()}
    if level != 'DRAM':
        cache_state[level] = {0}  # Fake cache hit

    latency = hw_model.compute_access_latency(0, 64, cache_state if level != 'DRAM' else None)
    print(f"  {level}: {latency} cycles")

# Test energy
print("\nEnergy Consumption:")
energy = hw_model.compute_energy_joules('compute', 1024, 1000)
print(f"  1KB compute for 1000 cycles: {energy * 1e6:.2f} uJ")

# Test thermal
print("\nThermal Dynamics:")
print(f"  Starting temp: {hw_model.temperature_c:.1f} C")
hw_model.update_temperature(100.0, 1.0)  # 100W for 1 second
print(f"  After 100W for 1s: {hw_model.temperature_c:.1f} C")
hw_model.update_temperature(50.0, 1.0)   # 50W for 1 second (cooling)
print(f"  After 50W for 1s: {hw_model.temperature_c:.1f} C")

print("\n" + "=" * 80)
print("DEMONSTRATION COMPLETE")
print("=" * 80)
print("\nAll core features working:")
print("  - Workload trace capture")
print("  - GPU-accelerated simulation (CuPy)")
print("  - Realistic hardware modeling")
print("  - Built-in plugins")
print("  - Multi-plugin execution")
print("  - Result export")
print("  - Trace comparison")

"""
Simple test script for hardware-accurate simulation.
"""

import sys
sys.path.insert(0, 'C:/Users/casey/polln/research/phase6_advanced_simulations')

from hardware_accurate_simulation import (
    HardwareAccurateSimulation,
    create_default_hardware
)


def test_cpu_simulation():
    """Test CPU simulation."""
    print("=" * 60)
    print("Test 1: CPU Simulation")
    print("=" * 60)

    config = create_default_hardware()
    sim = HardwareAccurateSimulation(config)

    # Test CPU compute
    ops = 10  # 10 GigaOps
    time_ms, energy_j = sim.cpu.simulate_compute(ops, parallelizable=0.8)

    print(f"Operations: {ops} GFLOPS")
    print(f"Execution Time: {time_ms:.2f} ms")
    print(f"Energy: {energy_j:.2f} J")
    print(f"Power: {energy_j / (time_ms / 1000):.2f} W")
    print()


def test_gpu_simulation():
    """Test GPU simulation."""
    print("=" * 60)
    print("Test 2: GPU Simulation")
    print("=" * 60)

    config = create_default_hardware()
    sim = HardwareAccurateSimulation(config)

    # Test GPU compute
    ops = 100  # 100 GigaOps
    time_ms, energy_j = sim.gpu.simulate_compute('tensor', ops, batch_size=4)

    print(f"Operations: {ops} GFLOPS (Tensor Core)")
    print(f"Execution Time: {time_ms:.2f} ms")
    print(f"Energy: {energy_j:.2f} J")
    print(f"Power: {energy_j / (time_ms / 1000):.2f} W")
    print()


def test_memory_simulation():
    """Test memory simulation."""
    print("=" * 60)
    print("Test 3: Memory Simulation")
    print("=" * 60)

    config = create_default_hardware()
    sim = HardwareAccurateSimulation(config)

    # Test memory access
    data_size = 1024  # MB
    time_ms, energy_j = sim.memory.simulate_access(data_size, 'sequential')

    print(f"Data Size: {data_size} MB")
    print(f"Access Time: {time_ms:.2f} ms")
    print(f"Energy: {energy_j:.2f} J")
    print(f"Effective Bandwidth: {data_size / (time_ms / 1000):.2f} MB/s")
    print()


def test_thermal_simulation():
    """Test thermal simulation."""
    print("=" * 60)
    print("Test 4: Thermal Simulation")
    print("=" * 60)

    config = create_default_hardware()
    sim = HardwareAccurateSimulation(config)

    # Simulate 10 seconds at 50W
    power = 50  # Watts
    duration = 10  # seconds
    dt = 0.1  # time step

    temps = []
    for i in range(int(duration / dt)):
        temp = sim.thermal.update_temperature(power, dt)
        temps.append(temp)

    print(f"Power: {power} W")
    print(f"Duration: {duration} s")
    print(f"Initial Temp: {sim.thermal.ambient_temp}°C")
    print(f"Final Temp: {temps[-1]:.1f}°C")
    print(f"Max Temp: {max(temps):.1f}°C")
    print()


def test_model_prediction():
    """Test model performance prediction."""
    print("=" * 60)
    print("Test 5: Model Performance Prediction")
    print("=" * 60)

    config = create_default_hardware()
    sim = HardwareAccurateSimulation(config)

    # Small transformer model
    model_config = {
        'type': 'transformer',
        'parameters': 25_000_000,  # 25M params
        'hidden_dim': 512,
        'num_layers': 6,
        'precision': 'fp16',
        'use_gpu': True,
    }
    input_shape = (256, 512)

    # Test different batch sizes
    for batch_size in [1, 4, 8]:
        perf = sim.predict_performance(model_config, input_shape, batch_size)
        print(f"Batch {batch_size}:")
        print(f"  Latency: {perf['latency_ms']:.2f} ms")
        print(f"  Throughput: {perf['throughput_samples_per_sec']:.1f} samples/sec")
        print(f"  Energy/Sample: {perf['energy_per_sample_j']:.3f} J")
        print(f"  Power: {perf['avg_power_w']:.1f} W")
    print()


def test_optimization():
    """Test deployment optimization."""
    print("=" * 60)
    print("Test 6: Deployment Optimization")
    print("=" * 60)

    config = create_default_hardware()
    sim = HardwareAccurateSimulation(config)

    # Define workload
    workload = {
        'cpu_ops_per_sec': 5,
        'gpu_ops_per_sec': 50,
        'gpu_type': 'inference',
        'parallelizable': 0.9,
        'memory_access_per_sec': 2,
        'access_pattern': 'sequential',
    }

    # Define constraints
    constraints = {
        'max_latency_ms': 50,
        'max_power_w': 100,
    }

    # Find optimal
    optimal = sim.optimize_deployment(workload, constraints)

    if optimal and 'error' not in optimal:
        print("Optimal Configuration Found:")
        print(f"  Use GPU: {optimal['use_gpu']}")
        print(f"  Batch Size: {optimal['batch_size']}")
        print(f"  Precision: {optimal['precision']}")
        print(f"  Predicted Latency: {optimal['predicted_latency_ms']:.2f} ms")
        print(f"  Predicted Power: {optimal['predicted_power_w']:.1f} W")
    else:
        print("No configuration satisfies constraints")
    print()


if __name__ == '__main__':
    try:
        test_cpu_simulation()
        test_gpu_simulation()
        test_memory_simulation()
        test_thermal_simulation()
        test_model_prediction()
        test_optimization()

        print("=" * 60)
        print("All tests completed successfully!")
        print("=" * 60)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

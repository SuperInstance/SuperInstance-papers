"""
Test Suite for GPU-Accelerated Simulations
===========================================

Comprehensive tests for RTX 4050 optimized GPU simulations.

Author: GPU Simulation Orchestrator
Created: 2026-03-13
"""

import pytest
import numpy as np
import cupy as cp
from typing import Dict, List
import time

# Import simulator
from local_gpu_simulations import (
    LocalGPUSimulator,
    SimulationConfig,
    GPUSpecs,
    GPUArchitecture
)


class TestGPUSimulator:
    """Test suite for LocalGPUSimulator."""

    @pytest.fixture
    def simulator(self):
        """Create simulator instance for testing."""
        config = SimulationConfig(
            batch_size=100,
            max_iterations=50,
            memory_limit_gb=4.0,
            enable_profiling=False
        )
        return LocalGPUSimulator(config)

    def test_initialization(self, simulator):
        """Test simulator initialization."""
        assert simulator is not None
        assert simulator.config is not None
        assert simulator.specs is not None

        if simulator.gpu_available:
            assert simulator.device is not None
            assert simulator.mempool is not None
            assert "total_memory_gb" in simulator.device_info

    def test_memory_check(self, simulator):
        """Test memory checking functionality."""
        mem_info = simulator.check_memory()

        if simulator.gpu_available:
            assert "total_gb" in mem_info
            assert "used_gb" in mem_info
            assert "free_gb" in mem_info
            assert "utilization" in mem_info
            assert mem_info["total_gb"] > 0
            assert 0 <= mem_info["utilization"] <= 1
        else:
            assert mem_info["available"] is False

    def test_safe_allocation(self, simulator):
        """Test safe GPU memory allocation."""
        if not simulator.gpu_available:
            pytest.skip("GPU not available")

        # Small allocation (should succeed)
        arr = simulator.allocate_safe((100, 100), cp.float32)
        assert arr.shape == (100, 100)
        assert arr.dtype == cp.float32

        # Large allocation (should fail)
        with pytest.raises(MemoryError):
            simulator.allocate_safe((100000, 100000), cp.float32)


class TestCRDTSimulation:
    """Test suite for CRDT network simulation."""

    @pytest.fixture
    def simulator(self):
        """Create simulator for CRDT tests."""
        return LocalGPUSimulator(SimulationConfig(
            batch_size=100,
            max_iterations=20
        ))

    def test_small_crdt_network(self, simulator):
        """Test CRDT simulation with small network."""
        num_agents = 100
        num_operations = 1000

        operations = np.random.random((num_operations, 4))
        operations[:, 0] = operations[:, 0] * num_agents
        operations[:, 1] = operations[:, 1] * 10

        result = simulator.simulate_parallel_crdt_network(
            num_agents=num_agents,
            operations=operations,
            iterations=10
        )

        # Check results
        assert "final_states" in result
        assert result["final_states"].shape == (num_agents, 10)
        assert "convergence_rate" in result
        assert result["convergence_rate"] >= 0

        if simulator.gpu_available:
            assert "operations_per_second" in result
            assert result["operations_per_second"] > 0

    def test_crdt_cpu_fallback(self, simulator):
        """Test CPU fallback when GPU unavailable."""
        # Temporarily disable GPU
        original_gpu = simulator.gpu_available
        simulator.gpu_available = False

        num_agents = 50
        operations = np.random.random((500, 4))
        operations[:, 0] = operations[:, 0] * num_agents

        result = simulator.simulate_parallel_crdt_network(
            num_agents=num_agents,
            operations=operations,
            iterations=5
        )

        assert result["fallback"] is True
        assert "final_states" in result

        # Restore GPU availability
        simulator.gpu_available = original_gpu


class TestTransferEntropy:
    """Test suite for transfer entropy computation."""

    @pytest.fixture
    def simulator(self):
        """Create simulator for TE tests."""
        return LocalGPUSimulator(SimulationConfig(
            batch_size=50
        ))

    def test_small_te_computation(self, simulator):
        """Test transfer entropy with small dataset."""
        n_vars = 20
        n_timesteps = 1000

        # Create correlated time series
        time_series = np.random.random((n_vars, n_timesteps))

        # Add some correlations
        time_series[1] = 0.8 * time_series[0] + 0.2 * np.random.random(n_timesteps)
        time_series[2] = 0.6 * time_series[1] + 0.4 * np.random.random(n_timesteps)

        result = simulator.compute_transfer_entropy_gpu(
            time_series=time_series,
            delay=1,
            n_bins=5
        )

        # Check results
        assert "transfer_entropy_matrix" in result
        assert result["transfer_entropy_matrix"].shape == (n_vars, n_vars)
        assert "mean_te" in result

        # TE should be non-negative
        assert np.all(result["transfer_entropy_matrix"] >= 0)

        # Check for correlations (TE[0,1] and TE[1,2] should be higher)
        te_matrix = result["transfer_entropy_matrix"]
        assert te_matrix[0, 1] > te_matrix[0, 5]  # Correlated vs uncorrelated

    def test_te_cpu_fallback(self, simulator):
        """Test CPU fallback for transfer entropy."""
        # Disable GPU
        original_gpu = simulator.gpu_available
        simulator.gpu_available = False

        time_series = np.random.random((10, 500))

        result = simulator.compute_transfer_entropy_gpu(
            time_series=time_series,
            delay=1,
            n_bins=5
        )

        assert result["fallback"] is True
        assert "transfer_entropy_matrix" in result

        # Restore
        simulator.gpu_available = original_gpu


class TestNeuralEvolution:
    """Test suite for neural network evolution."""

    @pytest.fixture
    def simulator(self):
        """Create simulator for evolution tests."""
        return LocalGPUSimulator(SimulationConfig(
            batch_size=50
        ))

    def test_simple_evolution(self, simulator):
        """Test simple neural network evolution."""
        network_config = {
            "input_size": 5,
            "hidden_size": 10,
            "output_size": 2
        }

        result = simulator.evolve_neural_networks_gpu(
            population_size=100,
            network_config=network_config,
            generations=20,
            mutation_rate=0.1,
            crossover_rate=0.7,
            elitism_count=5
        )

        # Check results
        assert "final_population" in result
        assert result["final_population"].shape[0] == 100

        genome_size = (5 * 10 + 10 + 10 * 2 + 2)
        assert result["final_population"].shape[1] == genome_size

        assert "fitness_history" in result
        assert result["fitness_history"].shape == (20, 100)

        # Fitness should generally increase
        final_best = result["best_fitness"][-1]
        initial_best = result["best_fitness"][0]
        assert final_best >= initial_best  # Evolution should improve

    def test_evolution_with_custom_fitness(self, simulator):
        """Test evolution with custom fitness function."""
        def simple_fitness(genome):
            """Simple fitness: maximize sum of squares."""
            return np.sum(genome ** 2)

        network_config = {
            "input_size": 3,
            "hidden_size": 5,
            "output_size": 1
        }

        result = simulator.evolve_neural_networks_gpu(
            population_size=50,
            network_config=network_config,
            generations=10,
            fitness_function=simple_fitness
        )

        assert "final_population" in result
        assert result["best_fitness_value"] > 0


class TestQuantumSearch:
    """Test suite for quantum-inspired search."""

    @pytest.fixture
    def simulator(self):
        """Create simulator for quantum search tests."""
        return LocalGPUSimulator(SimulationConfig(
            batch_size=100
        ))

    def test_simple_search(self, simulator):
        """Test simple quantum search."""
        # Simple oracle: maximize sum
        def simple_oracle(state):
            return float(np.sum(state))

        result = simulator.quantum_parallel_search(
            search_space_size=10,
            oracle=simple_oracle,
            iterations=20,
            n_states=100
        )

        # Check results
        assert "best_state" in result
        assert result["best_state"].shape == (10,)
        assert "best_amplitude" in result
        assert 0 <= result["best_amplitude"] <= 1

        # Best state should have high sum
        assert np.sum(result["best_state"]) > 5  # Should be > 0.5 avg

    def test_search_convergence(self, simulator):
        """Test that search converges over iterations."""
        result = simulator.quantum_parallel_search(
            search_space_size=5,
            iterations=50,
            n_states=200
        )

        # Check amplitude history
        amplitude_history = result["amplitude_history"]
        assert len(amplitude_history) == 50

        # Amplitude should generally increase
        assert amplitude_history[-1] > amplitude_history[0]


class TestBenchmarks:
    """Test suite for benchmarking."""

    @pytest.fixture
    def simulator(self):
        """Create simulator for benchmarks."""
        return LocalGPUSimulator(SimulationConfig())

    def test_benchmark_all(self, simulator):
        """Test full benchmark suite."""
        if not simulator.gpu_available:
            pytest.skip("GPU not available")

        benchmarks = simulator.benchmark_all()

        # Check that all benchmarks ran
        assert len(benchmarks) > 0
        assert "matrix_multiply" in benchmarks
        assert "elementwise" in benchmarks
        assert "reduction" in benchmarks
        assert "fft" in benchmarks

        # Check benchmark results structure
        for name, result in benchmarks.items():
            assert hasattr(result, "operation_name")
            assert hasattr(result, "gpu_time_ms")
            assert hasattr(result, "cpu_time_ms")
            assert hasattr(result, "speedup")
            assert result.speedup > 0

    def test_benchmark_reproducibility(self, simulator):
        """Test that benchmarks are reproducible."""
        if not simulator.gpu_available:
            pytest.skip("GPU not available")

        # Run benchmarks twice
        benchmarks1 = simulator.benchmark_all()
        benchmarks2 = simulator.benchmark_all()

        # Check consistency (within 10% variance)
        for name in benchmarks1:
            time1 = benchmarks1[name].gpu_time_ms
            time2 = benchmarks2[name].gpu_time_ms

            relative_diff = abs(time1 - time2) / time1
            assert relative_diff < 0.1, f"{name} not reproducible: {relative_diff:.2%}"


class TestMemoryManagement:
    """Test suite for memory management."""

    @pytest.fixture
    def simulator(self):
        """Create simulator for memory tests."""
        return LocalGPUSimulator(SimulationConfig(
            memory_limit_gb=2.0  # Lower limit for testing
        ))

    def test_memory_limit_enforcement(self, simulator):
        """Test that memory limits are enforced."""
        if not simulator.gpu_available:
            pytest.skip("GPU not available")

        # Should succeed within limit
        arr = simulator.allocate_safe((1000, 1000), cp.float32)
        assert arr is not None

        # Should fail beyond limit
        with pytest.raises(MemoryError):
            simulator.allocate_safe((100000, 100000), cp.float32)

    def test_memory_cleanup(self, simulator):
        """Test that memory is properly cleaned up."""
        if not simulator.gpu_available:
            pytest.skip("GPU not available")

        mem_before = simulator.check_memory()["used_gb"]

        # Create and delete arrays
        for _ in range(10):
            arr = cp.random.random((1000, 1000))
            del arr

        cp.cuda.Device().synchronize()

        mem_after = simulator.check_memory()["used_gb"]

        # Memory should not have grown significantly
        # Allow some tolerance for fragmentation
        assert mem_after - mem_before < 0.1  # < 100MB growth


class TestIntegration:
    """Integration tests for complete workflows."""

    @pytest.fixture
    def simulator(self):
        """Create simulator for integration tests."""
        return LocalGPUSimulator(SimulationConfig(
            batch_size=50,
            max_iterations=20
        ))

    def test_complete_simulation_pipeline(self, simulator):
        """Test running all simulations in sequence."""
        results = {}

        # 1. CRDT Simulation
        operations = np.random.random((1000, 4))
        crdt_result = simulator.simulate_parallel_crdt_network(
            num_agents=500,
            operations=operations,
            iterations=10
        )
        results["crdt"] = crdt_result

        # 2. Transfer Entropy
        time_series = np.random.random((20, 2000))
        te_result = simulator.compute_transfer_entropy_gpu(
            time_series=time_series,
            delay=1,
            n_bins=5
        )
        results["te"] = te_result

        # 3. Neural Evolution
        network_config = {"input_size": 5, "hidden_size": 10, "output_size": 2}
        evo_result = simulator.evolve_neural_networks_gpu(
            population_size=100,
            network_config=network_config,
            generations=10
        )
        results["evolution"] = evo_result

        # 4. Quantum Search
        search_result = simulator.quantum_parallel_search(
            search_space_size=10,
            iterations=20,
            n_states=100
        )
        results["search"] = search_result

        # Verify all completed successfully
        for name, result in results.items():
            assert result is not None
            assert not result.get("error", False)

    def test_memory_under_load(self, simulator):
        """Test memory behavior under sustained load."""
        if not simulator.gpu_available:
            pytest.skip("GPU not available")

        mem_samples = []

        # Run multiple simulations and sample memory
        for i in range(5):
            operations = np.random.random((1000, 4))
            simulator.simulate_parallel_crdt_network(
                num_agents=1000,
                operations=operations,
                iterations=10
            )

            mem_info = simulator.check_memory()
            mem_samples.append(mem_info["used_gb"])

        # Check memory didn't grow unbounded (leak detection)
        # Allow some growth due to fragmentation
        growth = mem_samples[-1] - mem_samples[0]
        assert growth < 0.5, f"Potential memory leak: {growth:.2f} GB growth"


def test_gpu_availability():
    """Test GPU availability check."""
    sim = LocalGPUSimulator()
    assert isinstance(sim.gpu_available, bool)

    if sim.gpu_available:
        assert sim.device_info["available"] is True
        assert sim.device_info["total_memory_gb"] > 0
    else:
        assert sim.device_info["available"] is False


def test_configuration():
    """Test simulator configuration."""
    config = SimulationConfig(
        batch_size=200,
        max_iterations=100,
        memory_limit_gb=4.5,
        use_mixed_precision=True
    )

    sim = LocalGPUSimulator(config)

    assert sim.config.batch_size == 200
    assert sim.config.max_iterations == 100
    assert sim.config.memory_limit_gb == 4.5
    assert sim.config.use_mixed_precision is True


def test_gpu_specs():
    """Test GPU specifications."""
    specs = GPUSpecs()

    assert specs.name == "NVIDIA RTX 4050"
    assert specs.vram_total == 6
    assert specs.cuda_cores == 2560
    assert specs.tensor_cores == 80
    assert specs.compute_capability == 8.9
    assert specs.architecture == GPUArchitecture.ADA_LOVELACE


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])

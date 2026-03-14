"""
Example Validation Implementations

Demonstrates how to implement GPU and cloud simulators for different
simulation types and validate them with the cross-validation framework.
"""

import asyncio
import numpy as np
from typing import Dict, List
import sys
from pathlib import Path

# Add parent directory to path to import cross_validation
sys.path.insert(0, str(Path(__file__).parent.parent))

from cross_validation import (
    GPUCloudCrossValidator,
    ValidationResult,
    VALIDATION_TEST_SUITE
)


# =============================================================================
# Example 1: Simple Numerical Simulation
# =============================================================================

class SimpleGPUSimulator:
    """GPU simulator for simple numerical computation."""

    def run(self, sim_type: str, params: Dict, run_id: int) -> Dict:
        """Run simulation on GPU."""
        np.random.seed(run_id)

        # Simulate GPU computation
        if sim_type == "matrix_multiply":
            size = params.get('size', 100)
            A = np.random.randn(size, size)
            B = np.random.randn(size, size)

            import time
            start = time.time()
            C = np.dot(A, B)
            elapsed = time.time() - start

            return {
                'run_id': run_id,
                'metric': float(np.trace(C)),
                'execution_time': elapsed,
                'memory_used': size * size * 8 * 3 / 1e9,  # 3 matrices in GB
                'result': C
            }

        elif sim_type == "eigenvalue_computation":
            size = params.get('size', 50)
            M = np.random.randn(size, size)
            M = (M + M.T) / 2  # Make symmetric

            import time
            start = time.time()
            eigenvalues = np.linalg.eigvalsh(M)
            elapsed = time.time() - start

            return {
                'run_id': run_id,
                'metric': float(np.max(eigenvalues)),
                'execution_time': elapsed,
                'memory_used': size * size * 8 / 1e9,
                'eigenvalues': eigenvalues
            }

        else:
            raise ValueError(f"Unknown simulation type: {sim_type}")


class SimpleCloudSimulator:
    """Cloud simulator for simple numerical computation."""

    async def run(self, sim_type: str, params: Dict, run_id: int) -> Dict:
        """Run simulation on cloud."""
        await asyncio.sleep(0.001)  # Simulate network latency

        # Use different seed to simulate potential differences
        np.random.seed(run_id + 1000)

        if sim_type == "matrix_multiply":
            size = params.get('size', 100)
            A = np.random.randn(size, size)
            B = np.random.randn(size, size)

            import time
            start = time.time()
            C = np.dot(A, B)
            elapsed = time.time() - start

            return {
                'run_id': run_id,
                'metric': float(np.trace(C)),
                'execution_time': elapsed,
                'memory_used': size * size * 8 * 3 / 1e9,
                'result': C
            }

        elif sim_type == "eigenvalue_computation":
            size = params.get('size', 50)
            M = np.random.randn(size, size)
            M = (M + M.T) / 2

            import time
            start = time.time()
            eigenvalues = np.linalg.eigvalsh(M)
            elapsed = time.time() - start

            return {
                'run_id': run_id,
                'metric': float(np.max(eigenvalues)),
                'execution_time': elapsed,
                'memory_used': size * size * 8 / 1e9,
                'eigenvalues': eigenvalues
            }

        else:
            raise ValueError(f"Unknown simulation type: {sim_type}")


async def example1_simple_validation():
    """Example 1: Validate simple numerical simulations."""
    print("\n" + "="*70)
    print("Example 1: Simple Numerical Simulation Validation")
    print("="*70)

    validator = GPUCloudCrossValidator(
        gpu_simulator=SimpleGPUSimulator(),
        cloud_client=SimpleCloudSimulator()
    )

    # Validate matrix multiplication
    print("\n--- Validating Matrix Multiplication ---")
    result = await validator.validate_simulation(
        simulation_type='matrix_multiply',
        parameters={'size': 100},
        num_runs=20
    )

    print(f"Status: {'PASSED' if result.passed else 'FAILED'}")
    print(f"Max Relative Error: {result.numerical_metrics.max_relative_error:.6f}")
    print(f"Correlation: {result.numerical_metrics.correlation_coefficient:.6f}")
    print(f"Statistical Equivalence: {result.statistical_metrics.is_equivalent}")
    print(f"Speedup Factor: {result.performance_metrics.speedup_factor:.2f}x")

    # Validate eigenvalue computation
    print("\n--- Validating Eigenvalue Computation ---")
    result2 = await validator.validate_simulation(
        simulation_type='eigenvalue_computation',
        parameters={'size': 50},
        num_runs=20
    )

    print(f"Status: {'PASSED' if result2.passed else 'FAILED'}")
    print(f"Max Relative Error: {result2.numerical_metrics.max_relative_error:.6f}")
    print(f"Statistical Equivalence: {result2.statistical_metrics.is_equivalent}")


# =============================================================================
# Example 2: Stochastic Simulation
# =============================================================================

class StochasticGPUSimulator:
    """GPU simulator for stochastic processes."""

    def run(self, sim_type: str, params: Dict, run_id: int) -> Dict:
        """Run stochastic simulation on GPU."""
        np.random.seed(run_id)

        if sim_type == "random_walk":
            n_steps = params.get('n_steps', 1000)
            n_walkers = params.get('n_walkers', 100)

            import time
            start = time.time()

            # Simulate random walks
            steps = np.random.randn(n_steps, n_walkers)
            positions = np.cumsum(steps, axis=0)
            final_positions = positions[-1, :]

            elapsed = time.time() - start

            return {
                'run_id': run_id,
                'metric': float(np.mean(final_positions)),
                'execution_time': elapsed,
                'memory_used': n_steps * n_walkers * 8 / 1e9,
                'final_positions': final_positions
            }

        elif sim_type == "ornstein_uhlenbeck":
            n_steps = params.get('n_steps', 1000)
            theta = params.get('theta', 0.1)
            mu = params.get('mu', 0.0)
            sigma = params.get('sigma', 0.2)

            import time
            start = time.time()

            # Simulate OU process
            dt = 0.01
            x = np.zeros(n_steps)
            for i in range(1, n_steps):
                dx = theta * (mu - x[i-1]) * dt + sigma * np.sqrt(dt) * np.random.randn()
                x[i] = x[i-1] + dx

            elapsed = time.time() - start

            return {
                'run_id': run_id,
                'metric': float(np.mean(x)),
                'execution_time': elapsed,
                'memory_used': n_steps * 8 / 1e9,
                'trajectory': x
            }

        else:
            raise ValueError(f"Unknown simulation type: {sim_type}")


class StochasticCloudSimulator:
    """Cloud simulator for stochastic processes."""

    async def run(self, sim_type: str, params: Dict, run_id: int) -> Dict:
        """Run stochastic simulation on cloud."""
        await asyncio.sleep(0.001)  # Simulate network latency

        # Different seed to simulate cloud differences
        np.random.seed(run_id + 1000)

        if sim_type == "random_walk":
            n_steps = params.get('n_steps', 1000)
            n_walkers = params.get('n_walkers', 100)

            import time
            start = time.time()

            steps = np.random.randn(n_steps, n_walkers)
            positions = np.cumsum(steps, axis=0)
            final_positions = positions[-1, :]

            elapsed = time.time() - start

            return {
                'run_id': run_id,
                'metric': float(np.mean(final_positions)),
                'execution_time': elapsed,
                'memory_used': n_steps * n_walkers * 8 / 1e9,
                'final_positions': final_positions
            }

        elif sim_type == "ornstein_uhlenbeck":
            n_steps = params.get('n_steps', 1000)
            theta = params.get('theta', 0.1)
            mu = params.get('mu', 0.0)
            sigma = params.get('sigma', 0.2)

            import time
            start = time.time()

            dt = 0.01
            x = np.zeros(n_steps)
            for i in range(1, n_steps):
                dx = theta * (mu - x[i-1]) * dt + sigma * np.sqrt(dt) * np.random.randn()
                x[i] = x[i-1] + dx

            elapsed = time.time() - start

            return {
                'run_id': run_id,
                'metric': float(np.mean(x)),
                'execution_time': elapsed,
                'memory_used': n_steps * 8 / 1e9,
                'trajectory': x
            }

        else:
            raise ValueError(f"Unknown simulation type: {sim_type}")


async def example2_stochastic_validation():
    """Example 2: Validate stochastic simulations."""
    print("\n" + "="*70)
    print("Example 2: Stochastic Simulation Validation")
    print("="*70)

    validator = GPUCloudCrossValidator(
        gpu_simulator=StochasticGPUSimulator(),
        cloud_client=StochasticCloudSimulator()
    )

    # Validate random walk
    print("\n--- Validating Random Walk ---")
    result = await validator.validate_simulation(
        simulation_type='random_walk',
        parameters={'n_steps': 1000, 'n_walkers': 100},
        num_runs=50  # More runs for statistical power
    )

    print(f"Status: {'PASSED' if result.passed else 'FAILED'}")
    print(f"T-test p-value: {result.statistical_metrics.t_p_value:.6f}")
    print(f"Effect Size (Cohen's d): {result.statistical_metrics.cohens_d:.4f}")
    print(f"KS Test p-value: {result.statistical_metrics.ks_p_value:.6f}")

    # Validate Ornstein-Uhlenbeck process
    print("\n--- Validating Ornstein-Uhlenbeck Process ---")
    result2 = await validator.validate_simulation(
        simulation_type='ornstein_uhlenbeck',
        parameters={'n_steps': 1000, 'theta': 0.1, 'mu': 0.0, 'sigma': 0.2},
        num_runs=50
    )

    print(f"Status: {'PASSED' if result2.passed else 'FAILED'}")
    print(f"Statistical Equivalence: {result2.statistical_metrics.is_equivalent}")
    print(f"Noise Tolerance: {result2.robustness_metrics.noise_tolerance_score:.4f}")


# =============================================================================
# Example 3: Custom Tolerances
# =============================================================================

async def example3_custom_tolerances():
    """Example 3: Use custom tolerances for different simulation types."""
    print("\n" + "="*70)
    print("Example 3: Custom Tolerances")
    print("="*70)

    # Strict tolerances for deterministic simulations
    strict_tolerances = {
        'max_relative_error': 1e-6,
        'min_correlation': 0.999999,
        'max_p_value': 0.01
    }

    # Relaxed tolerances for stochastic simulations
    relaxed_tolerances = {
        'max_relative_error': 0.1,  # 10%
        'min_correlation': 0.9,
        'max_p_value': 0.05,
        'max_effect_size': 0.5
    }

    validator_strict = GPUCloudCrossValidator(
        gpu_simulator=SimpleGPUSimulator(),
        cloud_client=SimpleCloudSimulator(),
        tolerance_config=strict_tolerances
    )

    print("\n--- Strict Validation (Deterministic) ---")
    result = await validator_strict.validate_simulation(
        simulation_type='matrix_multiply',
        parameters={'size': 50},
        num_runs=10
    )

    print(f"Status: {'PASSED' if result.passed else 'FAILED'}")
    print(f"Max Relative Error: {result.numerical_metrics.max_relative_error:.10f}")

    validator_relaxed = GPUCloudCrossValidator(
        gpu_simulator=StochasticGPUSimulator(),
        cloud_client=StochasticCloudSimulator(),
        tolerance_config=relaxed_tolerances
    )

    print("\n--- Relaxed Validation (Stochastic) ---")
    result2 = await validator_relaxed.validate_simulation(
        simulation_type='random_walk',
        parameters={'n_steps': 500, 'n_walkers': 50},
        num_runs=30
    )

    print(f"Status: {'PASSED' if result2.passed else 'FAILED'}")
    print(f"Max Relative Error: {result2.numerical_metrics.max_relative_error:.4f}")


# =============================================================================
# Example 4: Batch Validation
# =============================================================================

async def example4_batch_validation():
    """Example 4: Validate multiple parameter configurations."""
    print("\n" + "="*70)
    print("Example 4: Batch Validation")
    print("="*70)

    validator = GPUCloudCrossValidator(
        gpu_simulator=SimpleGPUSimulator(),
        cloud_client=SimpleCloudSimulator()
    )

    # Test different matrix sizes
    sizes = [50, 100, 200]
    results = []

    print("\nValidating different matrix sizes:")
    for size in sizes:
        print(f"\n--- Size {size}x{size} ---")
        result = await validator.validate_simulation(
            simulation_type='matrix_multiply',
            parameters={'size': size},
            num_runs=10
        )

        results.append(result)

        print(f"Status: {'PASSED' if result.passed else 'FAILED'}")
        print(f"Execution Time: GPU={result.performance_metrics.gpu_mean_time:.4f}s, "
              f"Cloud={result.performance_metrics.cloud_mean_time:.4f}s")

    # Summary
    print("\n--- Batch Summary ---")
    passed = sum(1 for r in results if r.passed)
    print(f"Passed: {passed}/{len(results)}")

    # Performance scaling analysis
    print("\n--- Performance Scaling ---")
    for size, result in zip(sizes, results):
        speedup = result.performance_metrics.speedup_factor
        print(f"Size {size:3d}: {speedup:.2f}x speedup")


# =============================================================================
# Example 5: Report Generation
# =============================================================================

async def example5_report_generation():
    """Example 5: Generate validation reports."""
    print("\n" + "="*70)
    print("Example 5: Report Generation")
    print("="*70)

    validator = GPUCloudCrossValidator(
        gpu_simulator=SimpleGPUSimulator(),
        cloud_client=SimpleCloudSimulator()
    )

    # Run multiple validations
    print("\nRunning validations...")

    await validator.validate_simulation(
        simulation_type='matrix_multiply',
        parameters={'size': 100},
        num_runs=20
    )

    await validator.validate_simulation(
        simulation_type='eigenvalue_computation',
        parameters={'size': 50},
        num_runs=20
    )

    # Generate text report
    print("\n--- Generating Report ---")
    report = validator.generate_validation_report()
    print(report)

    # Save results
    report_file, json_file = validator.save_results(
        output_dir="validation_results"
    )

    print(f"\nMarkdown report saved to: {report_file}")
    print(f"JSON data saved to: {json_file}")


# =============================================================================
# Main Entry Point
# =============================================================================

async def main():
    """Run all examples."""
    print("\n" + "="*70)
    print("GPU-Cloud Cross-Validation Examples")
    print("="*70)

    # Run examples
    await example1_simple_validation()
    await example2_stochastic_validation()
    await example3_custom_tolerances()
    await example4_batch_validation()
    await example5_report_generation()

    print("\n" + "="*70)
    print("All examples completed!")
    print("="*70)


if __name__ == "__main__":
    asyncio.run(main())

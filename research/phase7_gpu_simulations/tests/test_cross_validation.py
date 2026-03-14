"""
Unit tests for the GPU-Cloud Cross-Validation Framework

Tests individual components and validates framework correctness.
"""

import pytest
import numpy as np
import asyncio
from unittest.mock import Mock, AsyncMock
from typing import Dict, List
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from cross_validation import (
    GPUCloudCrossValidator,
    NumericalMetrics,
    StatisticalMetrics,
    PerformanceMetrics,
    RobustnessMetrics,
    DiscrepancyReport,
    ValidationResult,
    DiscrepancyType,
    ValidationCategory
)


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_gpu_simulator():
    """Mock GPU simulator for testing."""
    simulator = Mock()

    def run_simulation(sim_type, params, run_id):
        np.random.seed(run_id)
        return {
            'run_id': run_id,
            'metric': np.random.randn() * 0.1 + 1.0,
            'execution_time': np.random.uniform(0.1, 0.5),
            'memory_used': np.random.uniform(1.0, 2.0)
        }

    simulator.run = run_simulation
    return simulator


@pytest.fixture
def mock_cloud_client():
    """Mock cloud client for testing."""
    client = Mock()

    async def run_simulation(sim_type, params, run_id):
        await asyncio.sleep(0.001)  # Simulate latency
        np.random.seed(run_id + 1000)  # Different seed
        return {
            'run_id': run_id,
            'metric': np.random.randn() * 0.1 + 1.0,
            'execution_time': np.random.uniform(0.05, 0.3),
            'memory_used': np.random.uniform(0.5, 1.5)
        }

    client.run = run_simulation
    return client


@pytest.fixture
def validator(mock_gpu_simulator, mock_cloud_client):
    """Create validator with mock backends."""
    return GPUCloudCrossValidator(
        gpu_simulator=mock_gpu_simulator,
        cloud_client=mock_cloud_client
    )


# =============================================================================
# Numerical Metrics Tests
# =============================================================================

class TestNumericalMetrics:
    """Test numerical accuracy metric calculations."""

    def test_perfect_agreement(self):
        """Test metrics when results are identical."""
        gpu_results = [{'metric': 1.0} for _ in range(10)]
        cloud_results = [{'metric': 1.0} for _ in range(10)]

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_numerical_metrics(gpu_results, cloud_results)

        assert metrics.max_absolute_diff == 0.0
        assert metrics.max_relative_error == 0.0
        assert metrics.correlation_coefficient == 1.0
        assert metrics.passes_tolerance is True

    def test_small_differences(self):
        """Test metrics with small numerical differences."""
        gpu_results = [{'metric': 1.0 + i * 0.01} for i in range(10)]
        cloud_results = [{'metric': 1.0 + i * 0.01 + 0.001} for i in range(10)]

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_numerical_metrics(gpu_results, cloud_results)

        assert metrics.max_absolute_diff == 0.001
        assert metrics.max_relative_error < 0.01
        assert metrics.correlation_coefficient > 0.999
        assert metrics.passes_tolerance is True

    def test_large_differences(self):
        """Test metrics with large numerical differences."""
        gpu_results = [{'metric': 1.0} for _ in range(10)]
        cloud_results = [{'metric': 1.2} for _ in range(10)]  # 20% difference

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_numerical_metrics(gpu_results, cloud_results)

        assert metrics.max_relative_error > 0.1
        assert metrics.passes_tolerance is False


# =============================================================================
# Statistical Metrics Tests
# =============================================================================

class TestStatisticalMetrics:
    """Test statistical consistency metric calculations."""

    def test_identical_distributions(self):
        """Test statistical metrics for identical distributions."""
        np.random.seed(42)
        gpu_results = [{'metric': np.random.randn()} for _ in range(100)]
        cloud_results = [{'metric': r['metric']} for r in gpu_results]

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_statistical_metrics(gpu_results, cloud_results)

        assert metrics.t_p_value > 0.99  # Cannot reject null
        assert metrics.ks_p_value > 0.99
        assert metrics.cohens_d == 0.0
        assert metrics.is_equivalent is True

    def test_similar_distributions(self):
        """Test statistical metrics for similar distributions."""
        np.random.seed(42)
        gpu_results = [{'metric': np.random.randn() + 1.0} for _ in range(100)]
        cloud_results = [{'metric': np.random.randn() + 1.01} for _ in range(100)]

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_statistical_metrics(gpu_results, cloud_results)

        assert metrics.t_p_value > 0.05  # Means not significantly different
        assert metrics.is_equivalent is True
        assert abs(metrics.cohens_d) < 0.2

    def test_different_distributions(self):
        """Test statistical metrics for different distributions."""
        np.random.seed(42)
        gpu_results = [{'metric': np.random.randn()} for _ in range(100)]
        cloud_results = [{'metric': np.random.randn() + 1.0} for _ in range(100)]

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_statistical_metrics(gpu_results, cloud_results)

        assert metrics.t_p_value < 0.01  # Means significantly different
        assert metrics.is_equivalent is False
        assert abs(metrics.cohens_d) > 0.8  # Large effect


# =============================================================================
# Performance Metrics Tests
# =============================================================================

class TestPerformanceMetrics:
    """Test performance comparison metric calculations."""

    def test_gpu_faster(self):
        """Test when GPU is faster."""
        gpu_results = [
            {'execution_time': 0.1, 'memory_used': 1.0}
            for _ in range(10)
        ]
        cloud_results = [
            {'execution_time': 0.2, 'memory_used': 0.5}
            for _ in range(10)
        ]

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_performance_metrics(gpu_results, cloud_results)

        assert metrics.gpu_mean_time < metrics.cloud_mean_time
        assert metrics.speedup_factor > 1.0

    def test_cloud_faster(self):
        """Test when cloud is faster."""
        gpu_results = [
            {'execution_time': 0.2, 'memory_used': 1.0}
            for _ in range(10)
        ]
        cloud_results = [
            {'execution_time': 0.1, 'memory_used': 0.5}
            for _ in range(10)
        ]

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_performance_metrics(gpu_results, cloud_results)

        assert metrics.gpu_mean_time > metrics.cloud_mean_time
        assert metrics.speedup_factor < 1.0


# =============================================================================
# Robustness Metrics Tests
# =============================================================================

class TestRobustnessMetrics:
    """Test robustness validation metric calculations."""

    def test_high_noise_tolerance(self):
        """Test when both systems handle noise well."""
        np.random.seed(42)
        gpu_results = [{'metric': np.random.randn() * 0.1 + 1.0} for _ in range(100)]
        cloud_results = [{'metric': np.random.randn() * 0.1 + 1.0} for _ in range(100)]

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_robustness_metrics(
            'test', {}, gpu_results, cloud_results
        )

        assert metrics.noise_tolerance_score > 0.9
        assert metrics.outlier_consistency > 0.8

    def test_low_noise_tolerance(self):
        """Test when noise handling differs."""
        np.random.seed(42)
        gpu_results = [{'metric': np.random.randn() * 0.01 + 1.0} for _ in range(100)]
        cloud_results = [{'metric': np.random.randn() * 0.2 + 1.0} for _ in range(100)]

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_robustness_metrics(
            'test', {}, gpu_results, cloud_results
        )

        assert metrics.noise_tolerance_score < 0.8


# =============================================================================
# Integration Tests
# =============================================================================

class TestIntegration:
    """Integration tests for complete validation workflow."""

    @pytest.mark.asyncio
    async def test_full_validation(self, validator):
        """Test complete validation workflow."""
        result = await validator.validate_simulation(
            simulation_type='test_simulation',
            parameters={'param1': 100},
            num_runs=20
        )

        # Check result structure
        assert isinstance(result, ValidationResult)
        assert result.simulation_type == 'test_simulation'
        assert result.num_runs == 20

        # Check metrics exist
        assert isinstance(result.numerical_metrics, NumericalMetrics)
        assert isinstance(result.statistical_metrics, StatisticalMetrics)
        assert isinstance(result.performance_metrics, PerformanceMetrics)
        assert isinstance(result.robustness_metrics, RobustnessMetrics)

    @pytest.mark.asyncio
    async def test_validation_history(self, validator):
        """Test that validation history is maintained."""
        await validator.validate_simulation('test1', {}, 5)
        await validator.validate_simulation('test2', {}, 5)

        assert len(validator.validation_history) == 2

    @pytest.mark.asyncio
    async def test_report_generation(self, validator):
        """Test validation report generation."""
        await validator.validate_simulation('test', {}, 10)

        report = validator.generate_validation_report()

        assert 'GPU-Cloud Cross-Validation Report' in report
        assert 'Total Validations: 1' in report
        assert 'test' in report

    def test_default_tolerances(self):
        """Test default tolerance configuration."""
        validator = GPUCloudCrossValidator()

        assert validator.tolerances['max_relative_error'] == 0.01
        assert validator.tolerances['min_correlation'] == 0.99
        assert validator.tolerances['max_p_value'] == 0.05

    def test_custom_tolerances(self):
        """Test custom tolerance configuration."""
        custom_tolerances = {
            'max_relative_error': 0.1,
            'min_correlation': 0.9,
            'max_p_value': 0.1
        }

        validator = GPUCloudCrossValidator(
            tolerance_config=custom_tolerances
        )

        assert validator.tolerances['max_relative_error'] == 0.1
        assert validator.tolerances['min_correlation'] == 0.9
        assert validator.tolerances['max_p_value'] == 0.1


# =============================================================================
# Edge Cases and Error Handling
# =============================================================================

class TestEdgeCases:
    """Test edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_single_run(self, validator):
        """Test validation with only one run."""
        result = await validator.validate_simulation(
            'test', {}, 1
        )

        # Should still complete
        assert isinstance(result, ValidationResult)

    def test_zero_division_protection(self):
        """Test protection against division by zero."""
        validator = GPUCloudCrossValidator()

        gpu_results = [{'metric': 0.0} for _ in range(10)]
        cloud_results = [{'metric': 0.0} for _ in range(10)]

        metrics = validator._compute_numerical_metrics(gpu_results, cloud_results)

        # Should not raise error
        assert metrics.max_relative_error >= 0

    def test_constant_values(self):
        """Test with constant (zero variance) values."""
        validator = GPUCloudCrossValidator()

        gpu_results = [{'metric': 1.0} for _ in range(10)]
        cloud_results = [{'metric': 1.0} for _ in range(10)]

        metrics = validator._compute_statistical_metrics(gpu_results, cloud_results)

        # Should handle zero variance
        assert isinstance(metrics.cohens_d, float)


# =============================================================================
# Performance Tests
# =============================================================================

class TestPerformance:
    """Performance and scalability tests."""

    @pytest.mark.asyncio
    async def test_concurrent_validations(self, validator):
        """Test running multiple validations concurrently."""
        tasks = [
            validator.validate_simulation(f'test_{i}', {}, 5)
            for i in range(5)
        ]

        results = await asyncio.gather(*tasks)

        assert len(results) == 5
        assert all(isinstance(r, ValidationResult) for r in results)

    @pytest.mark.asyncio
    async def test_large_number_of_runs(self, validator):
        """Test validation with many runs."""
        result = await validator.validate_simulation(
            'test', {}, 100
        )

        assert result.num_runs == 100
        assert result.passed in [True, False]


# =============================================================================
# Property-Based Tests
# =============================================================================

class TestProperties:
    """Property-based tests using hypothesis."""

    @pytest.mark.parametrize("mean", [-10, 0, 10])
    @pytest.mark.parametrize("std", [0.1, 1.0, 10.0])
    def test_correlation_bounds(self, mean, std):
        """Test that correlation is always between -1 and 1."""
        np.random.seed(42)
        gpu_results = [{'metric': np.random.randn() * std + mean} for _ in range(50)]
        cloud_results = [{'metric': np.random.randn() * std + mean} for _ in range(50)]

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_numerical_metrics(gpu_results, cloud_results)

        assert -1 <= metrics.correlation_coefficient <= 1

    @pytest.mark.parametrize("n", [10, 50, 100])
    def test_p_value_bounds(self, n):
        """Test that p-values are always between 0 and 1."""
        np.random.seed(42)
        gpu_results = [{'metric': np.random.randn()} for _ in range(n)]
        cloud_results = [{'metric': np.random.randn()} for _ in range(n)]

        validator = GPUCloudCrossValidator()
        metrics = validator._compute_statistical_metrics(gpu_results, cloud_results)

        assert 0 <= metrics.t_p_value <= 1
        assert 0 <= metrics.ks_p_value <= 1


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

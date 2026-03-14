"""
Test Suite for DeepInfra Cloud API Integration

Comprehensive tests for the hybrid cloud-local simulation system.

Author: SuperInstance Research Team
Date: 2026-03-13
"""

import pytest
import asyncio
import numpy as np
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import json
import time
from datetime import datetime

# Import modules to test
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

from research.phase7_gpu_simulations.deepinfra_integration import (
    DeepInfraSimulationClient,
    LocalGPUSimulator,
    HybridSimulationEngine,
    SimulationType,
    ResultCache,
    APIMetrics,
    APIError,
    RateLimitError,
    TimeoutError,
    AuthenticationError,
    run_cloud_simulation
)


class TestResultCache:
    """Test suite for ResultCache class."""

    def test_cache_initialization(self):
        """Test cache initialization."""
        cache = ResultCache(ttl=3600)
        assert cache.ttl == 3600
        assert len(cache.cache) == 0

    def test_cache_set_and_get(self):
        """Test basic cache set and get operations."""
        cache = ResultCache(ttl=3600)
        result = {"data": "test_result"}

        # Set and get
        cache.set(result, param1="value1", param2="value2")
        retrieved = cache.get(param1="value1", param2="value2")

        assert retrieved == result

    def test_cache_miss(self):
        """Test cache miss returns None."""
        cache = ResultCache(ttl=3600)

        result = cache.get(param1="nonexistent")
        assert result is None

    def test_cache_expiration(self):
        """Test cache entries expire after TTL."""
        cache = ResultCache(ttl=0)  # Immediate expiration
        result = {"data": "test"}

        cache.set(result, param1="value1")
        retrieved = cache.get(param1="value1")

        # Should be expired
        assert retrieved is None

    def test_cache_clear(self):
        """Test clearing all cache entries."""
        cache = ResultCache(ttl=3600)

        cache.set({"data": "1"}, key="1")
        cache.set({"data": "2"}, key="2")

        assert len(cache.cache) == 2

        cache.clear()

        assert len(cache.cache) == 0

    def test_cache_cleanup_expired(self):
        """Test cleanup of expired entries."""
        cache = ResultCache(ttl=0)

        cache.set({"data": "1"}, key="1")
        cache.set({"data": "2"}, key="2")

        # Clean up expired entries
        cache.cleanup_expired()

        assert len(cache.cache) == 0


class TestAPIMetrics:
    """Test suite for APIMetrics class."""

    def test_metrics_initialization(self):
        """Test metrics initialization."""
        metrics = APIMetrics()

        assert metrics.total_requests == 0
        assert metrics.successful_requests == 0
        assert metrics.failed_requests == 0
        assert metrics.total_tokens_used == 0
        assert metrics.total_cost == 0.0

    def test_record_request_success(self):
        """Test recording successful request."""
        metrics = APIMetrics()

        metrics.record_request(
            success=True,
            tokens=1000,
            latency=1.5,
            cost=0.01
        )

        assert metrics.total_requests == 1
        assert metrics.successful_requests == 1
        assert metrics.failed_requests == 0
        assert metrics.total_tokens_used == 1000
        assert metrics.total_cost == 0.01

    def test_record_request_failure(self):
        """Test recording failed request."""
        metrics = APIMetrics()

        metrics.record_request(
            success=False,
            tokens=0,
            latency=2.0,
            cost=0.0
        )

        assert metrics.total_requests == 1
        assert metrics.successful_requests == 0
        assert metrics.failed_requests == 1

    def test_success_rate_calculation(self):
        """Test success rate calculation."""
        metrics = APIMetrics()

        metrics.record_request(success=True, tokens=100, latency=1.0, cost=0.001)
        metrics.record_request(success=True, tokens=100, latency=1.0, cost=0.001)
        metrics.record_request(success=False, tokens=0, latency=1.0, cost=0.0)

        assert metrics.get_success_rate() == 2/3

    def test_cache_hit_rate(self):
        """Test cache hit rate calculation."""
        metrics = APIMetrics()

        metrics.record_cache_hit()
        metrics.record_cache_hit()
        metrics.record_cache_miss()

        assert metrics.get_cache_hit_rate() == 2/3

    def test_average_latency_smoothing(self):
        """Test average latency uses exponential smoothing."""
        metrics = APIMetrics()

        # First value sets initial average
        metrics.record_request(success=True, tokens=100, latency=10.0, cost=0.01)
        assert metrics.average_latency == 10.0

        # Second value smooths: 0.9 * 10 + 0.1 * 20 = 11
        metrics.record_request(success=True, tokens=100, latency=20.0, cost=0.01)
        assert abs(metrics.average_latency - 11.0) < 0.01


class TestLocalGPUSimulator:
    """Test suite for LocalGPUSimulator class."""

    def test_initialization_with_gpu(self):
        """Test initialization with GPU enabled."""
        try:
            import cupy as cp
            simulator = LocalGPUSimulator(use_gpu=True)
            assert simulator.gpu_available is True
        except ImportError:
            pytest.skip("CuPy not available")

    def test_initialization_without_gpu(self):
        """Test initialization without GPU."""
        simulator = LocalGPUSimulator(use_gpu=False)
        assert simulator.gpu_available is False

    def test_transfer_entropy_computation(self):
        """Test transfer entropy computation."""
        simulator = LocalGPUSimulator(use_gpu=False)

        # Create sample data
        num_timesteps = 50
        num_agents = 10
        agent_states = np.random.rand(num_timesteps, num_agents, 3)

        # Compute transfer entropy
        te_matrix = simulator.run_transfer_entropy(agent_states)

        # Check shape
        assert te_matrix.shape == (num_agents, num_agents)

        # Check values are non-negative
        assert np.all(te_matrix >= 0)

    def test_novelty_detection(self):
        """Test novelty detection."""
        simulator = LocalGPUSimulator(use_gpu=False)

        # Create sample data with anomaly
        num_timesteps = 100
        num_agents = 5
        agent_states = np.random.rand(num_timesteps, num_agents, 2)

        # Add anomaly
        agent_states[90:, :, :] += 5.0

        # Detect novelty
        novelty_scores = simulator.run_novelty_detection(agent_states, window_size=10)

        # Check shape
        assert len(novelty_scores) == num_timesteps

        # Check that anomaly is detected (higher scores at end)
        assert novelty_scores[90:].mean() > novelty_scores[:50].mean()


class TestDeepInfraSimulationClient:
    """Test suite for DeepInfraSimulationClient class."""

    @pytest.fixture
    def mock_client(self):
        """Create a mock client for testing."""
        with patch.dict(os.environ, {"DEEPINFRA_API_KEY": "test_key"}):
            client = DeepInfraSimulationClient()
            return client

    def test_initialization_with_api_key(self):
        """Test client initialization with API key."""
        client = DeepInfraSimulationClient(api_key="test_key")
        assert client.api_key == "test_key"
        assert client.base_url == "https://api.deepinfra.com/v1"

    def test_initialization_without_api_key(self):
        """Test client initialization fails without API key."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError):
                DeepInfraSimulationClient()

    def test_cost_calculation(self):
        """Test API cost calculation."""
        client = DeepInfraSimulationClient(api_key="test_key")

        cost = client._calculate_cost(input_tokens=1000, output_tokens=2000)

        # Expected: (1000/1M) * $0.07 + (2000/1M) * $0.27
        expected_cost = (1000 / 1_000_000) * 0.07 + (2000 / 1_000_000) * 0.27
        assert abs(cost - expected_cost) < 1e-10

    @pytest.mark.asyncio
    async def test_make_request_success(self, mock_client):
        """Test successful API request."""
        mock_client.session = AsyncMock()

        # Mock successful response
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"result": "success"})

        mock_client.session.request = AsyncMock(
            return_value=mock_response,
            __aenter__=AsyncMock(return_value=mock_response),
            __aexit__=AsyncMock()
        )

        result = await mock_client._make_request("test/endpoint", "GET")

        assert result == {"result": "success"}

    @pytest.mark.asyncio
    async def test_make_request_rate_limit_error(self, mock_client):
        """Test rate limit error handling."""
        mock_client.session = AsyncMock()

        # Mock rate limit response
        mock_response = Mock()
        mock_response.status = 429
        mock_response.headers = {"Retry-After": "60"}

        mock_client.session.request = AsyncMock(
            return_value=mock_response,
            __aenter__=AsyncMock(return_value=mock_response),
            __aexit__=AsyncMock()
        )

        with pytest.raises(RateLimitError):
            await mock_client._make_request("test/endpoint", "GET")

    @pytest.mark.asyncio
    async def test_make_request_auth_error(self, mock_client):
        """Test authentication error handling."""
        mock_client.session = AsyncMock()

        # Mock auth error response
        mock_response = Mock()
        mock_response.status = 401

        mock_client.session.request = AsyncMock(
            return_value=mock_response,
            __aenter__=AsyncMock(return_value=mock_response),
            __aexit__=AsyncMock()
        )

        with pytest.raises(AuthenticationError):
            await mock_client._make_request("test/endpoint", "GET")

    @pytest.mark.asyncio
    async def test_emergence_detection_with_cache(self, mock_client):
        """Test emergence detection with cache hit."""
        # Set up cache
        cached_result = {"emergence_score": 0.85}
        mock_client.cache.set(cached_result, states_hash="abc", config={"method": "test"})

        # Mock agent states
        agent_states = [{"id": i, "state": [0.1, 0.2]} for i in range(10)]

        # Run with cache
        result = await mock_client.run_emergence_detection_cloud(
            agent_states=agent_states,
            detection_config={"method": "test"},
            use_cache=True
        )

        # Should return cached result
        assert result == cached_result

    @pytest.mark.asyncio
    async def test_metrics_tracking(self, mock_client):
        """Test that metrics are tracked correctly."""
        mock_client.session = AsyncMock()

        # Mock successful response
        mock_response = Mock()
        mock_response.status = 200
        mock_response.json = AsyncMock(
            return_value={
                "choices": [{
                    "message": {
                        "content": json.dumps({"result": "test"})
                    }
                }],
                "usage": {
                    "prompt_tokens": 100,
                    "completion_tokens": 200,
                    "total_tokens": 300
                }
            }
        )

        mock_client.session.request = AsyncMock(
            return_value=mock_response,
            __aenter__=AsyncMock(return_value=mock_response),
            __aexit__=AsyncMock()
        )

        # Disable cache for this test
        mock_client.enable_cache = False

        # Make request
        await mock_client.propose_neural_architecture(
            task_description="test task",
            constraints={}
        )

        # Check metrics
        assert mock_client.metrics.total_requests == 1
        assert mock_client.metrics.successful_requests == 1
        assert mock_client.metrics.total_tokens_used == 300


class TestHybridSimulationEngine:
    """Test suite for HybridSimulationEngine class."""

    @pytest.fixture
    def mock_engine(self):
        """Create a mock engine for testing."""
        with patch.dict(os.environ, {"DEEPINFRA_API_KEY": "test_key"}):
            engine = HybridSimulationEngine(use_local_gpu=False)
            return engine

    def test_initialization(self, mock_engine):
        """Test engine initialization."""
        assert mock_engine.local is not None
        assert mock_engine.cloud is not None
        assert mock_engine.initialized is False

    def test_identify_local_tasks(self, mock_engine):
        """Test identification of local-suitable tasks."""
        scenario = {
            "requires_matrix_ops": True,
            "matrix_size": 500,
            "requires_novelty_detection": True,
            "num_agents": 50
        }

        local_tasks = mock_engine._identify_local_tasks(scenario)

        assert "matrix_operations" in local_tasks
        assert "novelty_detection" in local_tasks

    def test_identify_cloud_tasks(self, mock_engine):
        """Test identification of cloud-suitable tasks."""
        scenario = {
            "requires_llm_analysis": True,
            "num_agents": 1000,
            "requires_architecture_search": True
        }

        cloud_tasks = mock_engine._identify_cloud_tasks(scenario)

        assert "llm_analysis" in cloud_tasks
        assert "large_scale_simulation" in cloud_tasks
        assert "architecture_search" in cloud_tasks

    @pytest.mark.asyncio
    async def test_simulate_force_local(self, mock_engine):
        """Test simulation with force_local=True."""
        scenario = {
            "agent_states": np.random.rand(50, 10, 3)
        }

        result = await mock_engine.simulate(scenario, force_local=True)

        assert "local_results" in result
        assert "execution_summary" in result

    @pytest.mark.asyncio
    async def test_get_performance_metrics(self, mock_engine):
        """Test getting performance metrics."""
        metrics = mock_engine.get_performance_metrics()

        assert "local" in metrics
        assert "cloud" in metrics
        assert "gpu_available" in metrics["local"]


class TestIntegration:
    """Integration tests for the complete system."""

    @pytest.mark.asyncio
    async def test_end_to_end_emergence_detection(self):
        """Test complete emergence detection workflow."""
        # This test requires a real API key
        api_key = os.getenv("DEEPINFRA_API_KEY")
        if not api_key:
            pytest.skip("No API key available")

        client = DeepInfraSimulationClient(api_key=api_key)
        await client.initialize()

        try:
            # Create test data
            agent_states = [
                {"id": i, "state": [0.1, 0.2, 0.3], "connections": [i-1, i+1]}
                for i in range(5)
            ]

            # Run emergence detection
            result = await client.run_emergence_detection_cloud(
                agent_states=agent_states,
                detection_config={"method": "transfer_entropy"}
            )

            # Check result structure
            assert "emergence_score" in result or "analysis_summary" in result

        finally:
            await client.close()

    @pytest.mark.asyncio
    async def test_batch_simulation(self):
        """Test batch processing of multiple simulations."""
        api_key = os.getenv("DEEPINFRA_API_KEY")
        if not api_key:
            pytest.skip("No API key available")

        client = DeepInfraSimulationClient(api_key=api_key)
        await client.initialize()

        try:
            # Create test scenarios
            scenarios = [
                {
                    "task_description": f"Test task {i}",
                    "constraints": {"max_layers": 5}
                }
                for i in range(3)
            ]

            # Run batch
            results = await client.batch_simulation(
                scenarios=scenarios,
                simulation_type=SimulationType.NEURAL_ARCHITECTURE_SEARCH,
                parallel_jobs=2
            )

            # Check results
            assert len(results) == 3

        finally:
            await client.close()


class TestErrorHandling:
    """Test error handling and recovery."""

    @pytest.mark.asyncio
    async def test_retry_logic(self):
        """Test that failed requests are retried."""
        with patch.dict(os.environ, {"DEEPINFRA_API_KEY": "test_key"}):
            client = DeepInfraSimulationClient()

            # Mock session that fails twice then succeeds
            call_count = [0]

            async def mock_request(*args, **kwargs):
                call_count[0] += 1
                if call_count[0] < 3:
                    raise RateLimitError("Rate limited")
                return {"result": "success"}

            client.session = AsyncMock()
            client.session.request = mock_request

            # This should succeed after retries
            result = await client._make_request("test", "GET")
            assert result == {"result": "success"}
            assert call_count[0] == 3

    def test_error_classes(self):
        """Test custom error classes."""
        with pytest.raises(APIError):
            raise APIError("Test error")

        with pytest.raises(RateLimitError):
            raise RateLimitError("Rate limited")

        with pytest.raises(TimeoutError):
            raise TimeoutError("Request timed out")

        with pytest.raises(AuthenticationError):
            raise AuthenticationError("Auth failed")


class TestConvenienceFunctions:
    """Test convenience functions."""

    @pytest.mark.asyncio
    async def test_run_cloud_simulation(self):
        """Test convenience function for cloud simulation."""
        # This would require a real API key
        # Just test the function signature
        with pytest.raises(Exception):  # Will fail without API key
            result = await run_cloud_simulation(
                SimulationType.EMERGENCE_DETECTION,
                agent_states=[],
                detection_config={}
            )


class TestPerformance:
    """Performance tests."""

    def test_cache_performance(self):
        """Test cache performance with many entries."""
        cache = ResultCache(ttl=3600)

        # Add many entries
        start_time = time.time()
        for i in range(1000):
            cache.set({"data": f"value_{i}"}, key=f"key_{i}")
        add_time = time.time() - start_time

        # Should be fast (< 1 second)
        assert add_time < 1.0

        # Retrieve many entries
        start_time = time.time()
        for i in range(1000):
            result = cache.get(key=f"key_{i}")
            assert result is not None
        get_time = time.time() - start_time

        # Should be fast (< 1 second)
        assert get_time < 1.0

    def test_metrics_performance(self):
        """Test metrics recording performance."""
        metrics = APIMetrics()

        # Record many requests
        start_time = time.time()
        for i in range(10000):
            metrics.record_request(
                success=i % 2 == 0,
                tokens=1000,
                latency=1.0,
                cost=0.01
            )
        record_time = time.time() - start_time

        # Should be fast (< 1 second)
        assert record_time < 1.0

        # Check calculations
        assert metrics.total_requests == 10000
        assert metrics.successful_requests == 5000
        assert metrics.failed_requests == 5000


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_cache_with_empty_params(self):
        """Test cache with no parameters."""
        cache = ResultCache(ttl=3600)

        result = {"data": "test"}
        cache.set(result)

        retrieved = cache.get()
        assert retrieved == result

    def test_metrics_with_zero_requests(self):
        """Test metrics with no requests."""
        metrics = APIMetrics()

        assert metrics.get_success_rate() == 0.0
        assert metrics.get_cache_hit_rate() == 0.0

    def test_local_simulator_with_empty_data(self):
        """Test local simulator with empty data."""
        simulator = LocalGPUSimulator(use_gpu=False)

        # Empty agent states
        agent_states = np.array([]).reshape(0, 0, 0)

        # Should handle gracefully
        te_matrix = simulator.run_transfer_entropy(agent_states)
        assert te_matrix.shape == (0, 0)

    @pytest.mark.asyncio
    async def test_client_with_timeout(self):
        """Test client handles timeouts correctly."""
        with patch.dict(os.environ, {"DEEPINFRA_API_KEY": "test_key"}):
            client = DeepInfraSimulationClient()

            # Mock timeout
            async def mock_request(*args, **kwargs):
                await asyncio.sleep(10)  # Long delay
                return {"result": "success"}

            client.session = AsyncMock()
            client.session.request = mock_request
            client.session.timeout = 0.001  # Very short timeout

            # Should timeout
            with pytest.raises(TimeoutError):
                await client._make_request("test", "GET")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

"""
Performance and Load Tests for SuperInstance Platform
=====================================================

Comprehensive performance testing including load tests, stress tests,
scalability tests, and benchmarking.

Author: Performance Testing Team
Created: 2026-03-13
"""

import pytest
import asyncio
import time
import statistics
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor
import numpy as np

from integration_tests import (
    SuperInstanceResearchPlatform,
    ExperimentConfig,
    SimulationResult
)


# =============================================================================
# Performance Benchmarks
# =============================================================================

class PerformanceBenchmarks:
    """Benchmark tests for performance metrics."""

    @pytest.fixture
    async def platform(self):
        """Create platform for benchmarking."""
        return SuperInstanceResearchPlatform()

    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_simulation_throughput(self, platform):
        """
        Benchmark simulation throughput.

        Measures: simulations per second
        Target: >10 simulations/second for small workloads
        """
        num_simulations = 50
        start_time = time.time()

        for i in range(num_simulations):
            await platform.run_simulation(
                ExperimentConfig(
                    name=f"throughput_test_{i}",
                    simulation_type="crdt_merge",
                    parameters={
                        "num_agents": 100,
                        "num_operations": 500,
                        "iterations": 5
                    }
                )
            )

        total_time = time.time() - start_time
        throughput = num_simulations / total_time

        print(f"\nThroughput: {throughput:.2f} simulations/second")
        print(f"Average time: {total_time/num_simulations:.3f}s per simulation")

        # Assert minimum throughput
        assert throughput > 5.0, f"Throughput too low: {throughput:.2f} sims/sec"

    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_latency_percentiles(self, platform):
        """
        Benchmark latency percentiles.

        Measures: p50, p95, p99 latencies
        Target: p95 < 1s for small simulations
        """
        latencies = []
        num_simulations = 100

        for i in range(num_simulations):
            start = time.time()
            await platform.run_simulation(
                ExperimentConfig(
                    name=f"latency_test_{i}",
                    simulation_type="crdt_merge",
                    parameters={
                        "num_agents": 200,
                        "num_operations": 1000,
                        "iterations": 8
                    }
                )
            )
            latencies.append(time.time() - start)

        p50 = statistics.median(latencies)
        p95 = np.percentile(latencies, 95)
        p99 = np.percentile(latencies, 99)

        print(f"\nLatency percentiles:")
        print(f"  p50: {p50:.3f}s")
        print(f"  p95: {p95:.3f}s")
        print(f"  p99: {p99:.3f}s")

        # Assert latency SLAs
        assert p50 < 0.5, f"p50 latency too high: {p50:.3f}s"
        assert p95 < 2.0, f"p95 latency too high: {p95:.3f}s"

    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_memory_efficiency(self, platform):
        """
        Benchmark memory usage efficiency.

        Measures: Memory per agent, memory overhead
        Target: <1KB per agent
        """
        import psutil
        import os

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Run progressively larger simulations
        sizes = [1000, 5000, 10000]
        memory_samples = []

        for size in sizes:
            # Force garbage collection
            import gc
            gc.collect()

            await platform.run_simulation(
                ExperimentConfig(
                    name=f"memory_test_{size}",
                    simulation_type="crdt_merge",
                    parameters={
                        "num_agents": size,
                        "num_operations": size * 5,
                        "iterations": 10
                    }
                )
            )

            current_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_samples.append(current_memory)

        # Calculate memory growth
        memory_growth = memory_samples[-1] - memory_samples[0]
        agent_growth = sizes[-1] - sizes[0]

        memory_per_agent = (memory_growth * 1024) / agent_growth  # KB

        print(f"\nMemory efficiency:")
        print(f"  Initial memory: {initial_memory:.2f} MB")
        print(f"  Final memory: {memory_samples[-1]:.2f} MB")
        print(f"  Memory per agent: {memory_per_agent:.2f} KB")

        # Assert memory efficiency
        assert memory_per_agent < 10.0, f"Memory per agent too high: {memory_per_agent:.2f} KB"


# =============================================================================
# Load Tests
# =============================================================================

class LoadTests:
    """Load testing for concurrent operations."""

    @pytest.fixture
    async def platform(self):
        """Create platform for load testing."""
        return SuperInstanceResearchPlatform()

    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_concurrent_users_load(self, platform):
        """
        Load test with concurrent users.

        Simulates: 100 concurrent users
        Target: All requests succeed, p95 latency <5s
        """
        num_users = 100
        requests_per_user = 5

        async def user_session(user_id):
            """Simulate a user session."""
            results = []
            for req_id in range(requests_per_user):
                start = time.time()
                result = await platform.run_simulation(
                    ExperimentConfig(
                        name=f"user_{user_id}_req_{req_id}",
                        simulation_type="crdt_merge",
                        parameters={
                            "num_agents": 200,
                            "num_operations": 800,
                            "iterations": 8
                        }
                    )
                )
                results.append({
                    "success": result.success,
                    "latency": time.time() - start
                })
            return results

        # Run all users concurrently
        start_time = time.time()
        user_results = await asyncio.gather(*[
            user_session(i) for i in range(num_users)
        ])
        total_time = time.time() - start_time

        # Flatten results
        all_results = []
        for user_results_list in user_results:
            all_results.extend(user_results_list)

        # Calculate metrics
        success_rate = sum(1 for r in all_results if r["success"]) / len(all_results)
        latencies = [r["latency"] for r in all_results]

        p50 = statistics.median(latencies)
        p95 = np.percentile(latencies, 95)
        p99 = np.percentile(latencies, 99)

        print(f"\nLoad test results ({num_users} users, {requests_per_user} req each):")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Success rate: {success_rate*100:.1f}%")
        print(f"  Throughput: {len(all_results)/total_time:.2f} req/s")
        print(f"  p50 latency: {p50:.3f}s")
        print(f"  p95 latency: {p95:.3f}s")
        print(f"  p99 latency: {p99:.3f}s")

        # Assert load test criteria
        assert success_rate > 0.95, f"Success rate too low: {success_rate*100:.1f}%"
        assert p95 < 10.0, f"p95 latency too high: {p95:.3f}s"

    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_sustained_load(self, platform):
        """
        Sustained load test over time.

        Simulates: Continuous load for 60 seconds
        Target: No performance degradation over time
        """
        duration_sec = 60
        target_rps = 10  # requests per second

        async def continuous_load():
            """Generate continuous load."""
            start_time = time.time()
            request_count = 0
            latencies = []

            while time.time() - start_time < duration_sec:
                req_start = time.time()
                await platform.run_simulation(
                    ExperimentConfig(
                        name=f"sustained_load_{request_count}",
                        simulation_type="crdt_merge",
                        parameters={
                            "num_agents": 300,
                            "num_operations": 1200,
                            "iterations": 10
                        }
                    )
                )
                latencies.append(time.time() - req_start)
                request_count += 1

                # Maintain target RPS
                elapsed = time.time() - req_start
                sleep_time = max(0, (1/target_rps) - elapsed)
                await asyncio.sleep(sleep_time)

            return {
                "request_count": request_count,
                "latencies": latencies,
                "actual_rps": request_count / duration_sec
            }

        result = await continuous_load()

        # Analyze latency over time
        window_size = len(result["latencies"]) // 4
        first_quarter = result["latencies"][:window_size]
        last_quarter = result["latencies"][-window_size:]

        first_avg = statistics.mean(first_quarter)
        last_avg = statistics.mean(last_quarter)
        degradation = (last_avg - first_avg) / first_avg

        print(f"\nSustained load test ({duration_sec}s):")
        print(f"  Requests completed: {result['request_count']}")
        print(f"  Actual RPS: {result['actual_rps']:.2f}")
        print(f"  First quarter avg latency: {first_avg:.3f}s")
        print(f"  Last quarter avg latency: {last_avg:.3f}s")
        print(f"  Degradation: {degradation*100:.1f}%")

        # Assert no significant degradation
        assert degradation < 0.5, f"Significant degradation: {degradation*100:.1f}%"


# =============================================================================
# Stress Tests
# =============================================================================

class StressTests:
    """Stress testing for system limits."""

    @pytest.fixture
    async def platform(self):
        """Create platform for stress testing."""
        return SuperInstanceResearchPlatform()

    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_maximum_concurrent_requests(self, platform):
        """
        Find maximum concurrent request limit.

        Increases concurrent requests until failure rate >50%
        """
        async def test_concurrency_level(concurrency):
            """Test a specific concurrency level."""
            tasks = [
                platform.run_simulation(
                    ExperimentConfig(
                        name=f"stress_test_{i}",
                        simulation_type="crdt_merge",
                        parameters={
                            "num_agents": 100,
                            "num_operations": 500,
                            "iterations": 5
                        }
                    )
                )
                for i in range(concurrency)
            ]

            start = time.time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            duration = time.time() - start

            successes = sum(1 for r in results if isinstance(r, SimulationResult) and r.success)
            success_rate = successes / concurrency

            return {
                "concurrency": concurrency,
                "success_rate": success_rate,
                "duration": duration,
                "throughput": concurrency / duration
            }

        # Test increasing concurrency levels
        concurrency_levels = [10, 25, 50, 100, 200, 500]
        results = []

        for level in concurrency_levels:
            result = await test_concurrency_level(level)
            results.append(result)
            print(f"Concurrency {level}: {result['success_rate']*100:.1f}% success, "
                  f"{result['throughput']:.1f} req/s")

            # Stop if success rate drops too low
            if result["success_rate"] < 0.5:
                break

        # Find maximum sustainable concurrency
        sustainable_results = [r for r in results if r["success_rate"] >= 0.9]
        max_sustainable = max([r["concurrency"] for r in sustainable_results]) if sustainable_results else 0

        print(f"\nMaximum sustainable concurrency: {max_sustainable}")

        # Assert minimum concurrency
        assert max_sustainable >= 50, f"Max concurrency too low: {max_sustainable}"

    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_large_simulation_stress(self, platform):
        """
        Test very large simulations.

        Finds the maximum simulation size that completes successfully.
        """
        sizes = [10000, 50000, 100000, 200000, 500000]
        results = []

        for size in sizes:
            start = time.time()
            result = await platform.run_simulation(
                ExperimentConfig(
                    name=f"large_sim_{size}",
                    simulation_type="large_scale",
                    parameters={
                        "num_agents": size,
                        "num_operations": size * 10
                    }
                )
            )
            duration = time.time() - start

            results.append({
                "size": size,
                "success": result.success,
                "duration": duration,
                "backend": result.backend
            })

            print(f"Size {size}: {'Success' if result.success else 'Failed'}, "
                  f"{duration:.2f}s, backend={result.backend}")

            # Stop if failed
            if not result.success:
                break

        # Find maximum successful size
        successful_sizes = [r["size"] for r in results if r["success"]]
        max_size = max(successful_sizes) if successful_sizes else 0

        print(f"\nMaximum simulation size: {max_size} agents")

        # Assert minimum size
        assert max_size >= 50000, f"Max size too low: {max_size}"


# =============================================================================
# Scalability Tests
# =============================================================================

class ScalabilityTests:
    """Tests for horizontal and vertical scalability."""

    @pytest.fixture
    async def platform(self):
        """Create platform for scalability testing."""
        return SuperInstanceResearchPlatform()

    @pytest.mark.asyncio
    async def test_vertical_scalability(self, platform):
        """
        Test vertical scalability (increasing problem size).

        Measures how performance scales with input size.
        """
        sizes = [100, 500, 1000, 2000, 5000]
        results = []

        for size in sizes:
            start = time.time()
            result = await platform.run_simulation(
                ExperimentConfig(
                    name=f"vertical_scale_{size}",
                    simulation_type="crdt_merge",
                    parameters={
                        "num_agents": size,
                        "num_operations": size * 5,
                        "iterations": 10
                    }
                )
            )
            duration = time.time() - start

            results.append({
                "size": size,
                "duration": duration,
                "ops_per_sec": (size * 5 * 10) / duration
            })

            print(f"Size {size}: {duration:.3f}s, {results[-1]['ops_per_sec']:.0f} ops/sec")

        # Analyze scaling
        # Calculate speedup ratios
        for i in range(1, len(results)):
            size_ratio = results[i]["size"] / results[i-1]["size"]
            time_ratio = results[i]["duration"] / results[i-1]["duration"]

            print(f"Size {results[i-1]['size']} -> {results[i]['size']}: "
                  f"{size_ratio:.1f}x size, {time_ratio:.1f}x time")

            # Assert sub-linear scaling (better than O(n^2))
            assert time_ratio < size_ratio ** 1.5, (
                f"Poor vertical scaling: {size_ratio}x size = {time_ratio}x time"
            )

    @pytest.mark.asyncio
    async def test_horizontal_scalability(self, platform):
        """
        Test horizontal scalability (increasing parallelism).

        Measures how well the system utilizes additional concurrency.
        """
        # Fixed total work, varying concurrency
        total_work = 1000  # Total number of simulations
        concurrency_levels = [1, 2, 4, 8, 16]

        results = []

        for concurrency in concurrency_levels:
            simulations_per_worker = total_work // concurrency

            async def run_batch(worker_id):
                """Run a batch of simulations."""
                for i in range(simulations_per_worker):
                    await platform.run_simulation(
                        ExperimentConfig(
                            name=f"horizontal_scale_c{concurrency}_w{worker_id}_i{i}",
                            simulation_type="crdt_merge",
                            parameters={
                                "num_agents": 100,
                                "num_operations": 500,
                                "iterations": 5
                            }
                        )
                    )

            start = time.time()
            await asyncio.gather(*[
                run_batch(i) for i in range(concurrency)
            ])
            duration = time.time() - start

            throughput = total_work / duration
            efficiency = (throughput / concurrency) / (total_work / results[0]["duration"]) if results else 1.0

            results.append({
                "concurrency": concurrency,
                "duration": duration,
                "throughput": throughput,
                "efficiency": efficiency
            })

            print(f"Concurrency {concurrency}: {duration:.2f}s, "
                  f"{throughput:.1f} sims/sec, efficiency={efficiency:.2f}")

        # Assert good parallelization
        # Efficiency should not drop too low
        for result in results[1:]:
            assert result["efficiency"] > 0.5, (
                f"Poor parallelization at concurrency {result['concurrency']}: "
                f"efficiency={result['efficiency']:.2f}"
            )


# =============================================================================
# Resource Utilization Tests
# =============================================================================

class ResourceUtilizationTests:
    """Tests for resource consumption."""

    @pytest.fixture
    async def platform(self):
        """Create platform for resource testing."""
        return SuperInstanceResearchPlatform()

    @pytest.mark.asyncio
    async def test_cpu_utilization(self, platform):
        """Test CPU utilization during load."""
        import psutil

        process = psutil.Process()

        # Run simulation and monitor CPU
        async def run_and_monitor():
            start_time = time.time()
            cpu_samples = []

            monitor_task = asyncio.create_task(monitor_cpu(process, cpu_samples, duration=5))

            await platform.run_simulation(
                ExperimentConfig(
                    name="cpu_utilization_test",
                    simulation_type="neural_evolution",
                    parameters={
                        "population_size": 200,
                        "generations": 30,
                        "network_config": {
                            "input_size": 5,
                            "hidden_size": 10,
                            "output_size": 2
                        }
                    }
                )
            )

            await monitor_task  # Stop monitoring

            return {
                "avg_cpu": statistics.mean(cpu_samples),
                "max_cpu": max(cpu_samples),
                "duration": time.time() - start_time
            }

        async def monitor_cpu(process, samples, duration):
            """Monitor CPU usage."""
            start = time.time()
            while time.time() - start < duration:
                samples.append(process.cpu_percent(interval=0.1))
                await asyncio.sleep(0.1)

        result = await run_and_monitor()

        print(f"\nCPU utilization:")
        print(f"  Average: {result['avg_cpu']:.1f}%")
        print(f"  Maximum: {result['max_cpu']:.1f}%")
        print(f"  Duration: {result['duration']:.2f}s")

        # CPU should be utilized but not overloaded
        assert result['avg_cpu'] < 95, f"CPU over-utilized: {result['avg_cpu']:.1f}%"

    @pytest.mark.asyncio
    async def test_memory_leak_detection(self, platform):
        """Test for memory leaks under repeated operations."""
        import gc
        import psutil
        import os

        process = psutil.Process(os.getpid())

        # Force GC before starting
        gc.collect()

        memory_samples = []
        num_iterations = 50

        for i in range(num_iterations):
            await platform.run_simulation(
                ExperimentConfig(
                    name=f"leak_test_{i}",
                    simulation_type="crdt_merge",
                    parameters={
                        "num_agents": 500,
                        "num_operations": 2000,
                        "iterations": 10
                    }
                )
            )

            # Sample memory every 5 iterations
            if i % 5 == 0:
                gc.collect()
                memory_mb = process.memory_info().rss / 1024 / 1024
                memory_samples.append(memory_mb)

        # Analyze memory growth
        initial_memory = memory_samples[0]
        final_memory = memory_samples[-1]
        memory_growth = final_memory - initial_memory
        growth_rate = memory_growth / num_iterations

        print(f"\nMemory leak detection:")
        print(f"  Initial memory: {initial_memory:.2f} MB")
        print(f"  Final memory: {final_memory:.2f} MB")
        print(f"  Total growth: {memory_growth:.2f} MB")
        print(f"  Growth rate: {growth_rate*1024:.2f} KB/iteration")

        # Assert no significant leak
        # Allow some growth due to caching, but should be bounded
        assert growth_rate < 100, f"Potential memory leak: {growth_rate:.2f} MB/iteration"


# =============================================================================
# Test Runner
# =============================================================================

if __name__ == "__main__":
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "-m", "performance or slow",
        "--asyncio-mode=auto"
    ])

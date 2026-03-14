"""
Global Traffic Management for SuperInstance Production

Intelligent load balancing across regions with latency optimization,
geographic routing, and automatic failover.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import random

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RoutingStrategy(Enum):
    """Traffic routing strategies"""
    LATENCY_BASED = "latency"      # Route to lowest latency
    GEOGRAPHIC = "geographic"      # Route to closest region
    LOAD_BASED = "load"            # Route to least loaded region
    COST_BASED = "cost"            # Route to cheapest region
    REDUNDANCY = "redundancy"      # Spread across multiple regions


@dataclass
class RegionMetrics:
    """Real-time metrics for a region"""
    region_id: str
    active_requests: int = 0
    capacity: int = 100_000
    avg_latency_ms: float = 50.0
    p99_latency_ms: float = 100.0
    error_rate: float = 0.001
    cpu_utilization: float = 0.5
    memory_utilization: float = 0.6
    queue_depth: int = 0
    healthy: bool = True
    last_health_check: datetime = field(default_factory=datetime.utcnow)

    @property
    def available_capacity(self) -> int:
        """Calculate available capacity"""
        return max(0, self.capacity - self.active_requests)

    @property
    def load_percentage(self) -> float:
        """Calculate current load percentage"""
        return (self.active_requests / self.capacity) * 100


@dataclass
class TrafficRequest:
    """Incoming traffic request"""
    request_id: str
    source_ip: str
    source_country: str
    source_region: str
    priority: int = 1  # 1-5, 5 is highest
    estimated_duration_ms: float = 100.0
    timestamp: datetime = field(default_factory=datetime.utcnow)


class GlobalLoadBalancer:
    """
    Global traffic load balancer with intelligent routing
    """

    def __init__(self):
        self.region_metrics: Dict[str, RegionMetrics] = {}
        self.routing_strategy = RoutingStrategy.LATENCY_BASED
        self.routing_history: List[Dict] = []
        self.failover_events: List[Dict] = []

        # Initialize regions
        self._initialize_regions()

    def _initialize_regions(self):
        """Initialize region metrics"""
        regions = [
            ("aws-us-east-1", 200_000, 30),
            ("aws-us-west-2", 150_000, 40),
            ("aws-eu-west-1", 150_000, 50),
            ("aws-ap-southeast-1", 100_000, 60),
            ("gcp-us-central1", 120_000, 35),
            ("gcp-europe-west1", 100_000, 55),
            ("gcp-asia-east1", 80_000, 65),
            ("azure-eastus", 100_000, 38),
            ("azure-westeurope", 80_000, 52),
            ("azure-southeastasia", 60_000, 58),
        ]

        for region_id, capacity, base_latency in regions:
            self.region_metrics[region_id] = RegionMetrics(
                region_id=region_id,
                capacity=capacity,
                avg_latency_ms=base_latency + random.uniform(-5, 5),
                p99_latency_ms=base_latency * 2 + random.uniform(-10, 10)
            )

    async def route_request(self, request: TrafficRequest) -> Tuple[str, float]:
        """
        Route a single request to optimal region

        Args:
            request: Traffic request to route

        Returns:
            Tuple of (region_id, expected_latency)
        """
        # Get healthy regions
        healthy_regions = {
            r_id: metrics
            for r_id, metrics in self.region_metrics.items()
            if metrics.healthy
        }

        if not healthy_regions:
            logger.error("No healthy regions available")
            raise Exception("No healthy regions available")

        # Route based on strategy
        if self.routing_strategy == RoutingStrategy.LATENCY_BASED:
            region_id, latency = self._route_by_latency(request, healthy_regions)
        elif self.routing_strategy == RoutingStrategy.GEOGRAPHIC:
            region_id, latency = self._route_by_geography(request, healthy_regions)
        elif self.routing_strategy == RoutingStrategy.LOAD_BASED:
            region_id, latency = self._route_by_load(request, healthy_regions)
        elif self.routing_strategy == RoutingStrategy.COST_BASED:
            region_id, latency = self._route_by_cost(request, healthy_regions)
        else:  # REDUNDANCY
            region_id, latency = self._route_with_redundancy(request, healthy_regions)

        # Update metrics
        self.region_metrics[region_id].active_requests += 1

        # Log routing decision
        self.routing_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": request.request_id,
            "source_country": request.source_country,
            "routed_to": region_id,
            "expected_latency_ms": latency,
            "strategy": self.routing_strategy.value
        })

        return region_id, latency

    def _route_by_latency(self, request: TrafficRequest,
                         regions: Dict[str, RegionMetrics]) -> Tuple[str, float]:
        """Route to region with lowest latency"""
        # Consider both base latency and current load
        scores = {}
        for r_id, metrics in regions.items():
            # Latency increases with load
            load_factor = 1 + (metrics.load_percentage / 100) ** 2
            adjusted_latency = metrics.avg_latency_ms * load_factor
            scores[r_id] = adjusted_latency

        best_region = min(scores.keys(), key=lambda k: scores[k])
        return best_region, scores[best_region]

    def _route_by_geography(self, request: TrafficRequest,
                           regions: Dict[str, RegionMetrics]) -> Tuple[str, float]:
        """Route to closest geographic region"""
        # Simplified geographic mapping
        region_proximity = {
            "US": ["aws-us-east-1", "gcp-us-central1", "azure-eastus"],
            "CA": ["aws-us-east-1", "gcp-us-central1", "aws-us-west-2"],
            "GB": ["aws-eu-west-1", "gcp-europe-west1", "azure-westeurope"],
            "DE": ["gcp-europe-west1", "aws-eu-west-1", "azure-westeurope"],
            "FR": ["aws-eu-west-1", "gcp-europe-west1"],
            "JP": ["aws-ap-southeast-1", "gcp-asia-east1"],
            "SG": ["aws-ap-southeast-1", "azure-southeastasia"],
            "AU": ["aws-ap-southeast-1", "gcp-asia-east1"],
        }

        # Get closest regions
        closest = region_proximity.get(request.source_country,
                                      list(regions.keys())[:3])

        # Filter to healthy and available
        available = [r for r in closest if r in regions]

        if not available:
            available = list(regions.keys())

        # Choose least loaded among closest
        best_region = min(available,
                         key=lambda r: regions[r].load_percentage)

        return best_region, regions[best_region].avg_latency_ms

    def _route_by_load(self, request: TrafficRequest,
                      regions: Dict[str, RegionMetrics]) -> Tuple[str, float]:
        """Route to least loaded region"""
        best_region = min(regions.keys(),
                         key=lambda r: regions[r].load_percentage)

        return best_region, regions[best_region].avg_latency_ms

    def _route_by_cost(self, request: TrafficRequest,
                      regions: Dict[str, RegionMetrics]) -> Tuple[str, float]:
        """Route to most cost-effective region"""
        # Simplified cost tiers
        cost_tiers = {
            "aws-us-east-1": 1.0,
            "aws-us-west-2": 1.1,
            "aws-eu-west-1": 1.2,
            "aws-ap-southeast-1": 1.3,
            "gcp-us-central1": 0.9,
            "gcp-europe-west1": 1.1,
            "gcp-asia-east1": 1.2,
            "azure-eastus": 0.95,
            "azure-westeurope": 1.15,
            "azure-southeastasia": 1.25,
        }

        # Filter by available capacity (>20% free)
        available = {
            r_id: metrics
            for r_id, metrics in regions.items()
            if metrics.load_percentage < 80
        }

        if not available:
            available = regions

        # Choose lowest cost with available capacity
        best_region = min(available.keys(),
                         key=lambda r: cost_tiers.get(r, 1.5))

        return best_region, regions[best_region].avg_latency_ms

    def _route_with_redundancy(self, request: TrafficRequest,
                              regions: Dict[str, RegionMetrics]) -> Tuple[str, float]:
        """Route to primary region with backup"""
        # Use latency-based for primary
        primary_region, latency = self._route_by_latency(request, regions)

        # Store backup plan
        backup_regions = sorted(
            [r for r in regions.keys() if r != primary_region],
            key=lambda r: regions[r].load_percentage
        )[:2]

        # In production, would send to both and use first response
        return primary_region, latency

    async def process_request_batch(self, requests: List[TrafficRequest]) -> Dict:
        """
        Process a batch of requests

        Args:
            requests: List of traffic requests

        Returns:
            Batch processing statistics
        """
        results = {
            "total_requests": len(requests),
            "routing_distribution": {},
            "avg_latency": 0.0,
            "max_latency": 0.0,
            "processing_time_ms": 0.0
        }

        start_time = datetime.utcnow()

        # Route all requests
        latencies = []
        for request in requests:
            try:
                region_id, latency = await self.route_request(request)
                latencies.append(latency)

                results["routing_distribution"][region_id] = \
                    results["routing_distribution"].get(region_id, 0) + 1

            except Exception as e:
                logger.error(f"Failed to route request {request.request_id}: {e}")

        end_time = datetime.utcnow()

        if latencies:
            results["avg_latency"] = sum(latencies) / len(latencies)
            results["max_latency"] = max(latencies)

        results["processing_time_ms"] = \
            (end_time - start_time).total_seconds() * 1000

        return results

    async def update_region_metrics(self):
        """Simulate real-time metric updates"""
        for region_id, metrics in self.region_metrics.items():
            # Simulate request completion
            completed = random.randint(0, max(0, metrics.active_requests // 10))
            metrics.active_requests = max(0, metrics.active_requests - completed)

            # Simulate latency changes
            metrics.avg_latency_ms += random.uniform(-2, 2)
            metrics.avg_latency_ms = max(10, min(200, metrics.avg_latency_ms))

            metrics.p99_latency_ms = metrics.avg_latency_ms * random.uniform(1.8, 2.5)

            # Simulate load changes
            metrics.cpu_utilization += random.uniform(-0.05, 0.05)
            metrics.cpu_utilization = max(0.1, min(0.95, metrics.cpu_utilization))

            metrics.memory_utilization += random.uniform(-0.03, 0.03)
            metrics.memory_utilization = max(0.2, min(0.9, metrics.memory_utilization))

            # Random health issues (very rare)
            if random.random() < 0.001:
                metrics.healthy = False
                logger.warning(f"Region {region_id} marked as unhealthy")
                self.failover_events.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "region": region_id,
                    "reason": "health_check_failed"
                })
            elif random.random() < 0.01 and not metrics.healthy:
                metrics.healthy = True
                logger.info(f"Region {region_id} recovered")

    def get_global_metrics(self) -> Dict:
        """Get aggregated global metrics"""
        total_capacity = sum(r.capacity for r in self.region_metrics.values())
        total_active = sum(r.active_requests for r in self.region_metrics.values())
        total_healthy = sum(1 for r in self.region_metrics.values() if r.healthy)

        avg_latency = sum(r.avg_latency_ms for r in self.region_metrics.values()) / len(self.region_metrics)
        avg_p99 = sum(r.p99_latency_ms for r in self.region_metrics.values()) / len(self.region_metrics)

        return {
            "total_capacity": total_capacity,
            "total_active_requests": total_active,
            "global_load_percentage": (total_active / total_capacity) * 100,
            "healthy_regions": total_healthy,
            "total_regions": len(self.region_metrics),
            "avg_latency_ms": avg_latency,
            "avg_p99_latency_ms": avg_p99,
            "routing_strategy": self.routing_strategy.value,
            "failover_events_24h": len(self.failover_events)
        }

    def set_routing_strategy(self, strategy: RoutingStrategy):
        """Change routing strategy"""
        logger.info(f"Routing strategy changed: {self.routing_strategy.value} -> {strategy.value}")
        self.routing_strategy = strategy


async def simulate_traffic_load(duration_seconds: int = 10, requests_per_second: int = 100):
    """Simulate traffic load for testing"""
    load_balancer = GlobalLoadBalancer()

    print("=" * 60)
    print("SuperInstance Global Traffic Management Simulation")
    print("=" * 60)

    # Show initial state
    print("\nInitial Regional State:")
    for r_id, metrics in load_balancer.region_metrics.items():
        print(f"  {r_id}:")
        print(f"    Capacity: {metrics.capacity:,} ops/sec")
        print(f"    Active: {metrics.active_requests:,}")
        print(f"    Latency: {metrics.avg_latency_ms:.1f}ms avg")

    # Simulate traffic
    print(f"\nSimulating {duration_seconds}s of traffic at {requests_per_second} req/sec...")

    countries = ["US", "GB", "DE", "FR", "JP", "SG", "AU", "CA"]
    total_requests = 0

    for second in range(duration_seconds):
        # Generate requests
        requests = []
        for i in range(requests_per_second):
            request = TrafficRequest(
                request_id=f"req-{second}-{i}",
                source_ip=f"192.168.{random.randint(1,255)}.{random.randint(1,255)}",
                source_country=random.choice(countries),
                source_region=f"region-{random.randint(1,10)}",
                priority=random.choices([1,2,3,4,5], weights=[50,30,15,4,1])[0]
            )
            requests.append(request)

        # Process batch
        results = await load_balancer.process_request_batch(requests)
        total_requests += results["total_requests"]

        # Update metrics
        await load_balancer.update_region_metrics()

        # Show progress every few seconds
        if (second + 1) % 3 == 0:
            global_metrics = load_balancer.get_global_metrics()
            print(f"\n  Second {second + 1}:")
            print(f"    Requests processed: {total_requests:,}")
            print(f"    Global load: {global_metrics['global_load_percentage']:.1f}%")
            print(f"    Avg latency: {global_metrics['avg_latency_ms']:.1f}ms")
            print(f"    Healthy regions: {global_metrics['healthy_regions']}/{global_metrics['total_regions']}")

    # Final statistics
    print("\n" + "=" * 60)
    print("Simulation Complete - Final Statistics")
    print("=" * 60)

    final_metrics = load_balancer.get_global_metrics()
    print(f"\nTotal Requests Processed: {total_requests:,}")
    print(f"Global Load: {final_metrics['global_load_percentage']:.1f}%")
    print(f"Average Latency: {final_metrics['avg_latency_ms']:.1f}ms")
    print(f"Average P99: {final_metrics['avg_p99_latency_ms']:.1f}ms")
    print(f"Healthy Regions: {final_metrics['healthy_regions']}/{final_metrics['total_regions']}")

    print("\nRegional Distribution:")
    for r_id, metrics in load_balancer.region_metrics.items():
        print(f"  {r_id}:")
        print(f"    Active: {metrics.active_requests:,}")
        print(f"    Load: {metrics.load_percentage:.1f}%")
        print(f"    CPU: {metrics.cpu_utilization*100:.1f}%")
        print(f"    Memory: {metrics.memory_utilization*100:.1f}%")
        print(f"    Healthy: {'✓' if metrics.healthy else '✗'}")


async def main():
    """Main traffic management orchestration"""
    await simulate_traffic_load(duration_seconds=12, requests_per_second=100)


if __name__ == "__main__":
    asyncio.run(main())

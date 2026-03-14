"""
Auto-Scaling Infrastructure for SuperInstance Production

Dynamically scales resources based on real-time load metrics
with intelligent scaling decisions and cost optimization.
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


class ScalingDirection(Enum):
    """Scaling direction"""
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    MAINTAIN = "maintain"


class InstanceType(Enum):
    """Instance types with different characteristics"""
    SPOT = "spot"           # Spot instances (cheap, preemptible)
    RESERVED = "reserved"   # Reserved instances (baseline)
    ON_DEMAND = "on_demand" # On-demand instances (flexible)


@dataclass
class ScalingMetric:
    """Metric for scaling decisions"""
    name: str
    current_value: float
    threshold_up: float
    threshold_down: float
    weight: float = 1.0


@dataclass
class ScalingPolicy:
    """Policy defining scaling behavior"""
    policy_id: str
    name: str
    metrics: List[ScalingMetric]
    scale_up_cooldown: int = 300  # seconds
    scale_down_cooldown: int = 900  # seconds
    min_instances: int = 3
    max_instances: int = 1000
    target_utilization: float = 0.7
    scale_up_step: int = 1  # instances to add
    scale_down_step: int = 1  # instances to remove


@dataclass
class Instance:
    """A compute instance"""
    instance_id: str
    instance_type: InstanceType
    region: str
    cpu_cores: int
    memory_gb: int
    cost_per_hour: float
    created_at: datetime
    status: str = "running"


@dataclass
class ScalingEvent:
    """Record of a scaling event"""
    event_id: str
    timestamp: datetime
    direction: ScalingDirection
    previous_count: int
    new_count: int
    region: str
    reason: str
    metrics: Dict[str, float]


class AutoScaler:
    """
    Auto-scaling system with intelligent scaling decisions
    """

    def __init__(self, regions: List[str]):
        self.regions = regions
        self.scaling_policies: Dict[str, ScalingPolicy] = {}
        self.instances: Dict[str, List[Instance]] = {
            region: [] for region in regions
        }

        self.last_scale_time: Dict[str, datetime] = {}
        self.scaling_history: List[ScalingEvent] = []

        # Current metrics
        self.current_metrics: Dict[str, Dict[str, float]] = {
            region: {} for region in regions
        }

        # Initialize with default policy
        self._initialize_policies()
        self._initialize_instances()

        # Statistics
        self.stats = {
            "scale_up_events": 0,
            "scale_down_events": 0,
            "total_instances_added": 0,
            "total_instances_removed": 0,
            "current_instances": 0,
            "total_cost_usd": 0.0
        }

    def _initialize_policies(self):
        """Initialize default scaling policies"""
        default_policy = ScalingPolicy(
            policy_id="default",
            name="Default Auto-Scaling Policy",
            metrics=[
                ScalingMetric("cpu_utilization", 0.0, 0.7, 0.3, 1.0),
                ScalingMetric("memory_utilization", 0.0, 0.8, 0.4, 0.8),
                ScalingMetric("request_latency_p99", 0.0, 200.0, 50.0, 1.2),
                ScalingMetric("queue_depth", 0.0, 1000.0, 100.0, 0.5),
            ],
            scale_up_cooldown=300,
            scale_down_cooldown=900,
            min_instances=3,
            max_instances=1000,
            target_utilization=0.7,
            scale_up_step=1,
            scale_down_step=1
        )

        for region in self.regions:
            self.scaling_policies[region] = default_policy

    def _initialize_instances(self):
        """Initialize with minimum instances"""
        for region in self.regions:
            policy = self.scaling_policies[region]
            for i in range(policy.min_instances):
                instance = self._create_instance(region, InstanceType.ON_DEMAND)
                self.instances[region].append(instance)

    def _create_instance(self, region: str,
                        instance_type: InstanceType) -> Instance:
        """Create a new instance"""
        instance_id = f"{region}-{instance_type.value}-{datetime.utcnow().timestamp()}-{random.randint(1000, 9999)}"

        # Instance specifications based on type
        if instance_type == InstanceType.SPOT:
            cpu_cores = 16
            memory_gb = 64
            cost_per_hour = 0.15  # 90% discount
        elif instance_type == InstanceType.RESERVED:
            cpu_cores = 16
            memory_gb = 64
            cost_per_hour = 0.50  # 50% discount
        else:  # ON_DEMAND
            cpu_cores = 16
            memory_gb = 64
            cost_per_hour = 1.00

        return Instance(
            instance_id=instance_id,
            instance_type=instance_type,
            region=region,
            cpu_cores=cpu_cores,
            memory_gb=memory_gb,
            cost_per_hour=cost_per_hour,
            created_at=datetime.utcnow()
        )

    async def evaluate_scaling(self, region: str) -> Optional[ScalingEvent]:
        """
        Evaluate if scaling is needed for a region

        Args:
            region: Region to evaluate

        Returns:
            Scaling event if scaling needed, None otherwise
        """
        policy = self.scaling_policies[region]
        current_count = len(self.instances[region])

        # Check cooldown
        last_scale = self.last_scale_time.get(region)
        if last_scale:
            time_since_scale = (datetime.utcnow() - last_scale).total_seconds()

            # Different cooldowns for scale up vs down
            if time_since_scale < policy.scale_up_cooldown:
                return None

        # Calculate scaling score
        scale_up_score = 0.0
        scale_down_score = 0.0

        for metric in policy.metrics:
            current = self.current_metrics[region].get(metric.name, 0.0)

            # Calculate how far past threshold
            if current > metric.threshold_up:
                # Need to scale up
                excess = (current - metric.threshold_up) / metric.threshold_up
                scale_up_score += excess * metric.weight

            elif current < metric.threshold_down:
                # Can scale down
                deficit = (metric.threshold_down - current) / metric.threshold_down
                scale_down_score += deficit * metric.weight

        # Make scaling decision
        direction = self._determine_direction(
            scale_up_score,
            scale_down_score,
            current_count,
            policy
        )

        if direction == ScalingDirection.MAINTAIN:
            return None

        # Calculate new instance count
        if direction == ScalingDirection.SCALE_UP:
            # Scale up proportional to load
            scale_factor = min(2.0, 1.0 + scale_up_score)
            new_count = int(current_count * scale_factor)
            new_count = min(new_count, policy.max_instances)
            new_count = max(new_count, current_count + policy.scale_up_step)

            reason = f"Scale up triggered: scale_up_score={scale_up_score:.2f}"
        else:  # SCALE_DOWN
            # Scale down more gradually
            scale_factor = max(0.5, 1.0 - (scale_down_score / 2))
            new_count = int(current_count * scale_factor)
            new_count = max(new_count, policy.min_instances)
            new_count = min(new_count, current_count - policy.scale_down_step)

            reason = f"Scale down triggered: scale_down_score={scale_down_score:.2f}"

        # Execute scaling
        event = await self._execute_scaling(
            region,
            direction,
            current_count,
            new_count,
            reason
        )

        return event

    def _determine_direction(self, scale_up_score: float,
                            scale_down_score: float,
                            current_count: int,
                            policy: ScalingPolicy) -> ScalingDirection:
        """
        Determine scaling direction based on scores and constraints

        Args:
            scale_up_score: Score indicating need to scale up
            scale_down_score: Score indicating ability to scale down
            current_count: Current instance count
            policy: Scaling policy

        Returns:
            Scaling direction
        """
        # At minimum, don't scale down
        if current_count <= policy.min_instances:
            if scale_up_score > 0:
                return ScalingDirection.SCALE_UP
            return ScalingDirection.MAINTAIN

        # At maximum, don't scale up
        if current_count >= policy.max_instances:
            if scale_down_score > 0.5:
                return ScalingDirection.SCALE_DOWN
            return ScalingDirection.MAINTAIN

        # Compare scores
        if scale_up_score > 0.5:
            return ScalingDirection.SCALE_UP
        elif scale_down_score > 1.0:  # Higher threshold for scaling down
            return ScalingDirection.SCALE_DOWN

        return ScalingDirection.MAINTAIN

    async def _execute_scaling(self, region: str,
                              direction: ScalingDirection,
                              previous_count: int,
                              new_count: int,
                              reason: str) -> ScalingEvent:
        """
        Execute scaling action

        Args:
            region: Region to scale
            direction: Scaling direction
            previous_count: Previous instance count
            new_count: New instance count
            reason: Reason for scaling

        Returns:
            Scaling event record
        """
        event = ScalingEvent(
            event_id=f"scaling-{datetime.utcnow().timestamp()}",
            timestamp=datetime.utcnow(),
            direction=direction,
            previous_count=previous_count,
            new_count=new_count,
            region=region,
            reason=reason,
            metrics=self.current_metrics[region].copy()
        )

        if direction == ScalingDirection.SCALE_UP:
            # Add instances
            count_to_add = new_count - previous_count
            for _ in range(count_to_add):
                # Mix of instance types for cost optimization
                if previous_count >= 10:
                    # 60% spot, 30% reserved, 10% on-demand
                    instance_type = random.choices(
                        [InstanceType.SPOT, InstanceType.RESERVED, InstanceType.ON_DEMAND],
                        weights=[0.6, 0.3, 0.1]
                    )[0]
                else:
                    # Start with on-demand for stability
                    instance_type = InstanceType.ON_DEMAND

                instance = self._create_instance(region, instance_type)
                self.instances[region].append(instance)

            self.stats["scale_up_events"] += 1
            self.stats["total_instances_added"] += count_to_add
            logger.info(f"Scaled up {region}: {previous_count} -> {new_count} (+{count_to_add})")

        else:  # SCALE_DOWN
            # Remove instances (prefer spot first)
            count_to_remove = previous_count - new_count

            # Sort by instance type preference
            sorted_instances = sorted(
                self.instances[region],
                key=lambda i: {
                    InstanceType.SPOT: 0,
                    InstanceType.RESERVED: 1,
                    InstanceType.ON_DEMAND: 2
                }[i.instance_type]
            )

            for _ in range(count_to_remove):
                if sorted_instances:
                    instance = sorted_instances.pop()
                    self.instances[region].remove(instance)

            self.stats["scale_down_events"] += 1
            self.stats["total_instances_removed"] += count_to_remove
            logger.info(f"Scaled down {region}: {previous_count} -> {new_count} (-{count_to_remove})")

        # Update last scale time
        self.last_scale_time[region] = datetime.utcnow()
        self.scaling_history.append(event)

        # Update stats
        self.stats["current_instances"] = sum(
            len(instances) for instances in self.instances.values()
        )

        return event

    async def update_metrics(self, region: str, metrics: Dict[str, float]):
        """
        Update current metrics for a region

        Args:
            region: Region to update
            metrics: Metric values
        """
        self.current_metrics[region].update(metrics)

    def get_instance_summary(self) -> Dict:
        """Get summary of all instances"""
        summary = {
            "total_instances": 0,
            "by_region": {},
            "by_type": {
                "spot": 0,
                "reserved": 0,
                "on_demand": 0
            },
            "total_cores": 0,
            "total_memory_gb": 0,
            "hourly_cost_usd": 0.0
        }

        for region, instances in self.instances.items():
            region_summary = {
                "count": len(instances),
                "spot": 0,
                "reserved": 0,
                "on_demand": 0,
                "cores": 0,
                "memory_gb": 0,
                "hourly_cost": 0.0
            }

            for instance in instances:
                region_summary[instance.instance_type.value] += 1
                region_summary["cores"] += instance.cpu_cores
                region_summary["memory_gb"] += instance.memory_gb
                region_summary["hourly_cost"] += instance.cost_per_hour

            summary["by_region"][region] = region_summary
            summary["total_instances"] += region_summary["count"]
            summary["by_type"]["spot"] += region_summary["spot"]
            summary["by_type"]["reserved"] += region_summary["reserved"]
            summary["by_type"]["on_demand"] += region_summary["on_demand"]
            summary["total_cores"] += region_summary["cores"]
            summary["total_memory_gb"] += region_summary["memory_gb"]
            summary["hourly_cost_usd"] += region_summary["hourly_cost"]

        self.stats["total_cost_usd"] = summary["hourly_cost_usd"]

        return summary

    def get_scaling_stats(self) -> Dict:
        """Get scaling statistics"""
        return {
            **self.stats,
            "scale_up_ratio": (
                self.stats["scale_up_events"] /
                max(1, self.stats["scale_up_events"] + self.stats["scale_down_events"])
            ),
            "avg_instances_per_region": (
                self.stats["current_instances"] / max(1, len(self.regions))
            )
        }


async def simulate_auto_scaling(duration_seconds: int = 20):
    """Simulate auto-scaling under varying load"""
    regions = [
        "aws-us-east-1",
        "aws-us-west-2",
        "aws-eu-west-1",
        "aws-ap-southeast-1",
    ]

    scaler = AutoScaler(regions)

    print("=" * 60)
    print("SuperInstance Auto-Scaling Simulation")
    print("=" * 60)

    # Show initial state
    print("\nInitial State:")
    summary = scaler.get_instance_summary()
    print(f"  Total Instances: {summary['total_instances']}")
    print(f"  Hourly Cost: ${summary['hourly_cost_usd']:.2f}")
    print(f"  Total Cores: {summary['total_cores']}")
    print(f"  Total Memory: {summary['total_memory_gb']} GB")

    # Simulate load patterns
    print(f"\nSimulating {duration_seconds}s of varying load...")

    load_pattern = [
        ("normal", 0.4, 0.45, 50, 100),
        ("normal", 0.42, 0.47, 55, 105),
        ("normal", 0.45, 0.48, 60, 110),
        ("normal", 0.43, 0.46, 52, 108),
        ("normal", 0.41, 0.44, 48, 102),
        ("surge_start", 0.65, 0.68, 200, 400),
        ("surge_start", 0.70, 0.72, 250, 450),
        ("surge_peak", 0.85, 0.80, 500, 800),
        ("surge_peak", 0.90, 0.85, 600, 900),
        ("surge_peak", 0.88, 0.82, 550, 850),
        ("surge_decline", 0.70, 0.70, 300, 500),
        ("surge_decline", 0.60, 0.62, 200, 350),
        ("normal", 0.45, 0.48, 80, 150),
        ("normal", 0.42, 0.46, 70, 130),
        ("normal", 0.40, 0.44, 60, 110),
        ("low", 0.25, 0.30, 30, 60),
        ("low", 0.22, 0.28, 25, 55),
        ("low", 0.20, 0.25, 20, 50),
        ("low", 0.18, 0.23, 18, 45),
        ("normal", 0.40, 0.45, 50, 100),
    ]

    for second, (phase, cpu, memory, latency, queue) in enumerate(load_pattern):
        if second >= duration_seconds:
            break

        # Update metrics for all regions
        for region in regions:
            # Add some variance per region
            region_cpu = cpu * random.uniform(0.9, 1.1)
            region_memory = memory * random.uniform(0.9, 1.1)
            region_latency = latency * random.uniform(0.8, 1.2)
            region_queue = queue * random.uniform(0.8, 1.2)

            await scaler.update_metrics(region, {
                "cpu_utilization": min(1.0, region_cpu),
                "memory_utilization": min(1.0, region_memory),
                "request_latency_p99": region_latency,
                "queue_depth": int(region_queue)
            })

        # Evaluate scaling for all regions
        scaling_tasks = [
            scaler.evaluate_scaling(region) for region in regions
        ]
        results = await asyncio.gather(*scaling_tasks)

        # Show progress
        if (second + 1) % 4 == 0:
            summary = scaler.get_instance_summary()
            print(f"\n  Second {second + 1} ({phase}):")
            print(f"    Instances: {summary['total_instances']}")
            print(f"    Cost: ${summary['hourly_cost_usd']:.2f}/hour")
            print(f"    Scaling Events: {len(scaler.scaling_history)}")

        await asyncio.sleep(0.1)

    # Final statistics
    print("\n" + "=" * 60)
    print("Simulation Complete - Scaling Statistics")
    print("=" * 60)

    final_summary = scaler.get_instance_summary()
    scaling_stats = scaler.get_scaling_stats()

    print(f"\nFinal Instance State:")
    print(f"  Total Instances: {final_summary['total_instances']}")
    print(f"  By Type:")
    print(f"    Spot: {final_summary['by_type']['spot']}")
    print(f"    Reserved: {final_summary['by_type']['reserved']}")
    print(f"    On-Demand: {final_summary['by_type']['on_demand']}")

    print(f"\nResources:")
    print(f"  Total Cores: {final_summary['total_cores']}")
    print(f"  Total Memory: {final_summary['total_memory_gb']} GB")
    print(f"  Hourly Cost: ${final_summary['hourly_cost_usd']:.2f}")

    print(f"\nScaling Events:")
    print(f"  Scale Up Events: {scaling_stats['scale_up_events']}")
    print(f"  Scale Down Events: {scaling_stats['scale_down_events']}")
    print(f"  Instances Added: {scaling_stats['total_instances_added']}")
    print(f"  Instances Removed: {scaling_stats['total_instances_removed']}")
    print(f"  Scale Up Ratio: {scaling_stats['scale_up_ratio']:.1%}")

    # Show recent scaling events
    if scaler.scaling_history:
        print(f"\nRecent Scaling Events (last 5):")
        for event in scaler.scaling_history[-5:]:
            direction_symbol = "↑" if event.direction == ScalingDirection.SCALE_UP else "↓"
            print(f"  {direction_symbol} {event.region}: {event.previous_count} -> {event.new_count}")
            print(f"      {event.reason}")


async def main():
    """Main auto-scaling orchestration"""
    await simulate_auto_scaling(duration_seconds=20)


if __name__ == "__main__":
    asyncio.run(main())

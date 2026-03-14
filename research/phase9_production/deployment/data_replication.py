"""
Multi-Region Data Replication for SuperInstance Production

Handles data synchronization across regions with consistency guarantees,
conflict resolution, and compliance boundary enforcement.
"""

import asyncio
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import random

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ReplicationMode(Enum):
    """Data replication strategies"""
    SYNCHRONOUS = "synchronous"    # All regions must acknowledge
    ASYNCHRONOUS = "asynchronous"  # Replicate in background
    QUORUM = "quorum"             # Majority must acknowledge
    LOCAL_ONLY = "local"          # No replication (edge caching)


class ConsistencyLevel(Enum):
    """Consistency guarantees"""
    STRONG = "strong"             # Linearizable consistency
    EVENTUAL = "eventual"         # Eventually consistent
    READ_YOUR_WRITES = "read_your_writes"  # RYW consistency
    SESSION = "session"           # Session consistency


@dataclass
class DataRecord:
    """A data record to be replicated"""
    key: str
    value: dict
    version: int = 1
    timestamp: datetime = field(default_factory=datetime.utcnow)
    source_region: str = ""
    checksum: str = ""
    compliance_zones: List[str] = field(default_factory=list)

    def __post_init__(self):
        """Calculate checksum after creation"""
        self.checksum = self._calculate_checksum()

    def _calculate_checksum(self) -> str:
        """Calculate SHA-256 checksum of value"""
        value_str = json.dumps(self.value, sort_keys=True)
        return hashlib.sha256(value_str.encode()).hexdigest()


@dataclass
class ReplicationLog:
    """Log of replication operations"""
    operation_id: str
    key: str
    operation: str  # write, delete, update
    source_region: str
    target_regions: List[str]
    status: str  # pending, completed, failed
    start_time: datetime
    end_time: Optional[datetime] = None
    error_message: Optional[str] = None


@dataclass
class ConflictResolution:
    """Resolved data conflict"""
    key: str
    conflicting_versions: List[Tuple[str, DataRecord]]
    resolution_strategy: str
    resolved_record: DataRecord
    timestamp: datetime = field(default_factory=datetime.utcnow)


class DataReplicationManager:
    """
    Manages multi-region data replication with conflict resolution
    """

    def __init__(self, regions: List[str]):
        self.regions = regions
        self.regional_data: Dict[str, Dict[str, DataRecord]] = {
            region: {} for region in regions
        }
        self.replication_mode = ReplicationMode.QUORUM
        self.consistency_level = ConsistencyLevel.EVENTUAL

        self.replication_logs: List[ReplicationLog] = []
        self.conflict_resolutions: List[ConflictResolution] = []

        # Compliance boundaries (data must stay in these zones)
        self.compliance_boundaries: Dict[str, Set[str]] = {
            "gdpr": {"aws-eu-west-1", "gcp-europe-west1", "azure-westeurope"},
            "ccpa": {"aws-us-east-1", "aws-us-west-2", "gcp-us-central1", "azure-eastus"},
        }

        # Replication statistics
        self.replication_stats = {
            "total_operations": 0,
            "successful_replications": 0,
            "failed_replications": 0,
            "conflicts_detected": 0,
            "conflicts_resolved": 0
        }

    async def write(self, record: DataRecord, region: str) -> bool:
        """
        Write data to a region and replicate according to policy

        Args:
            record: Data record to write
            region: Source region

        Returns:
            True if successful
        """
        # Set source region
        record.source_region = region

        # Write to local region
        self.regional_data[region][record.key] = record

        # Replicate to other regions
        success = await self._replicate_write(record, region)

        return success

    async def _replicate_write(self, record: DataRecord,
                               source_region: str) -> bool:
        """
        Replicate write to other regions

        Args:
            record: Data record to replicate
            source_region: Source region

        Returns:
            True if replication successful
        """
        # Determine target regions based on compliance
        target_regions = self._get_target_regions(record, source_region)

        # Create replication log
        log = ReplicationLog(
            operation_id=f"op-{datetime.utcnow().timestamp()}",
            key=record.key,
            operation="write",
            source_region=source_region,
            target_regions=target_regions,
            status="pending",
            start_time=datetime.utcnow()
        )

        # Replicate based on mode
        if self.replication_mode == ReplicationMode.SYNCHRONOUS:
            success = await self._synchronous_replicate(record, target_regions)
        elif self.replication_mode == ReplicationMode.ASYNCHRONOUS:
            success = await self._asynchronous_replicate(record, target_regions)
        elif self.replication_mode == ReplicationMode.QUORUM:
            success = await self._quorum_replicate(record, target_regions)
        else:  # LOCAL_ONLY
            success = True  # No replication needed

        log.status = "completed" if success else "failed"
        log.end_time = datetime.utcnow()

        self.replication_logs.append(log)
        self.replication_stats["total_operations"] += 1
        if success:
            self.replication_stats["successful_replications"] += 1
        else:
            self.replication_stats["failed_replications"] += 1

        return success

    def _get_target_regions(self, record: DataRecord,
                           source_region: str) -> List[str]:
        """
        Determine target regions based on compliance requirements

        Args:
            record: Data record
            source_region: Source region

        Returns:
            List of target regions
        """
        # If record has compliance zones, filter regions
        if record.compliance_zones:
            valid_regions = set()
            for zone in record.compliance_zones:
                if zone in self.compliance_boundaries:
                    valid_regions.update(self.compliance_boundaries[zone])

            target_regions = [r for r in self.regions if r in valid_regions]
        else:
            # Replicate to all regions
            target_regions = [r for r in self.regions if r != source_region]

        return target_regions

    async def _synchronous_replicate(self, record: DataRecord,
                                    target_regions: List[str]) -> bool:
        """Synchronous replication - all must succeed"""
        tasks = [self._replicate_to_region(record, r) for r in target_regions]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        success = all(not isinstance(r, Exception) for r in results)

        if not success:
            # Rollback on failure
            await self._rollback_replication(record, target_regions)

        return success

    async def _asynchronous_replicate(self, record: DataRecord,
                                     target_regions: List[str]) -> bool:
        """Asynchronous replication - fire and forget"""
        # Start replication in background
        asyncio.create_task(self._background_replicate(record, target_regions))
        return True

    async def _background_replicate(self, record: DataRecord,
                                   target_regions: List[str]):
        """Background replication task"""
        for region in target_regions:
            await self._replicate_to_region(record, region)

    async def _quorum_replicate(self, record: DataRecord,
                               target_regions: List[str]) -> bool:
        """Quorum replication - majority must succeed"""
        if not target_regions:
            return True

        quorum_size = len(target_regions) // 2 + 1
        tasks = [self._replicate_to_region(record, r) for r in target_regions]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        successful = sum(1 for r in results if not isinstance(r, Exception))
        return successful >= quorum_size

    async def _replicate_to_region(self, record: DataRecord,
                                  region: str) -> bool:
        """
        Replicate record to specific region

        Args:
            record: Data record
            region: Target region

        Returns:
            True if successful
        """
        # Simulate network latency
        await asyncio.sleep(random.uniform(0.01, 0.05))

        # Check for conflicts
        existing = self.regional_data[region].get(record.key)
        if existing and existing.version >= record.version:
            # Conflict detected
            return await self._resolve_conflict(record, existing, region)

        # No conflict - write record
        self.regional_data[region][record.key] = record
        return True

    async def _resolve_conflict(self, incoming: DataRecord,
                               existing: DataRecord,
                               region: str) -> bool:
        """
        Resolve conflict between incoming and existing record

        Args:
            incoming: Incoming record
            existing: Existing record
            region: Region where conflict occurred

        Returns:
            True if resolved
        """
        self.replication_stats["conflicts_detected"] += 1

        # Conflict resolution strategies
        if incoming.timestamp > existing.timestamp:
            # Last write wins (most recent)
            resolved = incoming
            strategy = "last_write_wins"
        elif incoming.version > existing.version:
            # Higher version wins
            resolved = incoming
            strategy = "highest_version"
        elif incoming.source_region == region:
            # Source region wins
            resolved = incoming
            strategy = "source_wins"
        else:
            # Merge values (simplified)
            merged_value = {**existing.value, **incoming.value}
            resolved = DataRecord(
                key=incoming.key,
                value=merged_value,
                version=max(incoming.version, existing.version) + 1,
                timestamp=datetime.utcnow(),
                source_region=region
            )
            strategy = "merge"

        # Store resolution
        resolution = ConflictResolution(
            key=incoming.key,
            conflicting_versions=[(incoming.source_region, incoming),
                                 (region, existing)],
            resolution_strategy=strategy,
            resolved_record=resolved
        )

        self.conflict_resolutions.append(resolution)
        self.regional_data[region][incoming.key] = resolved
        self.replication_stats["conflicts_resolved"] += 1

        return True

    async def _rollback_replication(self, record: DataRecord,
                                   target_regions: List[str]):
        """Rollback failed replication"""
        for region in target_regions:
            if record.key in self.regional_data[region]:
                del self.regional_data[region][record.key]

    async def read(self, key: str, region: str) -> Optional[DataRecord]:
        """
        Read data from region

        Args:
            key: Data key
            region: Region to read from

        Returns:
            Data record or None
        """
        return self.regional_data[region].get(key)

    async def global_read(self, key: str) -> Optional[DataRecord]:
        """
        Read from any region (most recent version)

        Args:
            key: Data key

        Returns:
            Most recent data record or None
        """
        all_records = []
        for region in self.regions:
            if key in self.regional_data[region]:
                all_records.append(self.regional_data[region][key])

        if not all_records:
            return None

        # Return most recent
        return max(all_records, key=lambda r: (r.timestamp, r.version))

    def get_replication_stats(self) -> Dict:
        """Get replication statistics"""
        return {
            **self.replication_stats,
            "success_rate": (
                self.replication_stats["successful_replications"] /
                max(1, self.replication_stats["total_operations"])
            ) * 100,
            "conflict_rate": (
                self.replication_stats["conflicts_detected"] /
                max(1, self.replication_stats["total_operations"])
            ) * 100,
            "regions_count": len(self.regions),
            "total_records": sum(len(data) for data in self.regional_data.values())
        }

    def get_data_distribution(self) -> Dict[str, int]:
        """Get data distribution across regions"""
        return {
            region: len(data)
            for region, data in self.regional_data.items()
        }


async def simulate_replication_load(duration_seconds: int = 10,
                                   writes_per_second: int = 50):
    """Simulate replication load for testing"""
    regions = [
        "aws-us-east-1",
        "aws-us-west-2",
        "aws-eu-west-1",
        "aws-ap-southeast-1",
        "gcp-us-central1",
        "gcp-europe-west1",
    ]

    manager = DataReplicationManager(regions)

    print("=" * 60)
    print("SuperInstance Multi-Region Data Replication Simulation")
    print("=" * 60)

    print(f"\nReplication Configuration:")
    print(f"  Regions: {len(regions)}")
    print(f"  Mode: {manager.replication_mode.value}")
    print(f"  Consistency: {manager.consistency_level.value}")

    # Simulate writes
    print(f"\nSimulating {duration_seconds}s of writes at {writes_per_second} writes/sec...")

    total_writes = 0
    for second in range(duration_seconds):
        # Generate writes
        for i in range(writes_per_second):
            key = f"key-{random.randint(1, 1000)}"
            value = {
                "data": f"sample_data_{random.randint(1, 10000)}",
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": {
                    "source": "simulation",
                    "size": random.randint(100, 10000)
                }
            }

            # Some records have compliance requirements
            compliance_zones = []
            if random.random() < 0.2:
                compliance_zones = random.choice([
                    ["gdpr"],
                    ["ccpa"],
                    ["gdpr", "ccpa"]
                ])

            record = DataRecord(
                key=key,
                value=value,
                compliance_zones=compliance_zones
            )

            source_region = random.choice(regions)
            await manager.write(record, source_region)
            total_writes += 1

        # Show progress
        if (second + 1) % 3 == 0:
            stats = manager.get_replication_stats()
            distribution = manager.get_data_distribution()

            print(f"\n  Second {second + 1}:")
            print(f"    Total writes: {total_writes:,}")
            print(f"    Success rate: {stats['success_rate']:.1f}%")
            print(f"    Conflicts: {stats['conflicts_resolved']}")
            print(f"    Total records: {stats['total_records']:,}")

    # Final statistics
    print("\n" + "=" * 60)
    print("Simulation Complete - Final Statistics")
    print("=" * 60)

    final_stats = manager.get_replication_stats()
    print(f"\nTotal Writes: {total_writes:,}")
    print(f"Success Rate: {final_stats['success_rate']:.2f}%")
    print(f"Conflicts Detected: {final_stats['conflicts_detected']}")
    print(f"Conflicts Resolved: {final_stats['conflicts_resolved']}")
    print(f"Conflict Rate: {final_stats['conflict_rate']:.2f}%")

    print("\nData Distribution:")
    distribution = manager.get_data_distribution()
    for region, count in distribution.items():
        print(f"  {region}: {count:,} records")

    # Show sample conflict resolutions
    if manager.conflict_resolutions:
        print(f"\nSample Conflict Resolutions:")
        for resolution in manager.conflict_resolutions[:5]:
            print(f"  Key: {resolution.key}")
            print(f"    Strategy: {resolution.resolution_strategy}")
            print(f"    Versions: {len(resolution.conflicting_versions)}")


async def main():
    """Main replication orchestration"""
    await simulate_replication_load(duration_seconds=9, writes_per_second=50)


if __name__ == "__main__":
    asyncio.run(main())

"""
Shared Infrastructure Management
=================================

Manages shared computing and research infrastructure across global
collaborations including cloud resources, GPU time, datasets, and software.

Features:
- Cloud compute credit pooling
- GPU time scheduling and allocation
- Dataset access management
- Software license sharing
- Resource usage tracking and fair cost distribution
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
import json
from pathlib import Path


class ResourceType(Enum):
    """Types of shared resources"""
    CLOUD_COMPUTE = "cloud_compute"
    GPU_TIME = "gpu_time"
    STORAGE = "storage"
    DATASET = "dataset"
    SOFTWARE_LICENSE = "software_license"
    EXPERIMENTAL_EQUIPMENT = "experimental_equipment"


class CloudProvider(Enum):
    """Major cloud providers"""
    AWS = "aws"
    GCP = "gcp"
    AZURE = "azure"
    ALIBABA = "alibaba"


class GPUType(Enum):
    """Types of GPU resources"""
    H100 = "h100"  # NVIDIA H100
    A100 = "a100"  # NVIDIA A100
    V100 = "v100"  # NVIDIA V100
    RTX4090 = "rtx4090"  # NVIDIA RTX 4090
    RTX4080 = "rtx4080"  # NVIDIA RTX 4080
    T4 = "t4"  # NVIDIA T4


class ResourceStatus(Enum):
    """Status of shared resources"""
    AVAILABLE = "available"
    ALLOCATED = "allocated"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"
    UNAVAILABLE = "unavailable"


@dataclass
class ComputeResource:
    """Shared computing resource"""
    resource_id: str
    name: str
    resource_type: ResourceType
    provider: Optional[CloudProvider] = None
    gpu_type: Optional[GPUType] = None

    # Specifications
    cpu_cores: Optional[int] = None
    memory_gb: Optional[int] = None
    gpu_count: Optional[int] = None
    storage_gb: Optional[int] = None

    # Cost and allocation
    hourly_cost: float = 0.0
    total_credits: float = 0.0  # For cloud credit pools
    remaining_credits: float = 0.0

    # Access
    access_instructions: str = ""
    required_permissions: List[str] = field(default_factory=list)

    # Status
    status: ResourceStatus = ResourceStatus.AVAILABLE
    current_allocation: Optional[str] = None  # Project ID
    reserved_until: Optional[datetime] = None

    # Owner
    owning_institution: str = ""
    contact_email: str = ""

    # Usage tracking
    total_usage_hours: float = 0.0
    last_used: Optional[datetime] = None

    # Timestamps
    created: datetime = field(default_factory=datetime.now)
    updated: datetime = field(default_factory=datetime.now)


@dataclass
class ResourceAllocation:
    """Allocation of resource to a project"""
    allocation_id: str
    resource_id: str
    project_id: str

    # Allocation details
    allocated_by: str  # User ID
    allocated_to: List[str]  # User IDs with access
    start_time: datetime
    end_time: datetime

    # Usage
    estimated_hours: float = 0.0
    actual_hours: float = 0.0
    estimated_cost: float = 0.0
    actual_cost: float = 0.0

    # Purpose
    purpose: str = ""
    papers_researched: List[str] = field(default_factory=list)

    # Status
    active: bool = True

    # Timestamps
    created: datetime = field(default_factory=datetime.now)


@dataclass
class DatasetResource:
    """Shared research dataset"""
    dataset_id: str
    name: str
    description: str

    # Metadata
    size_gb: float
    record_count: int
    format: str  # "csv", "parquet", "hdf5", etc.
    schema_description: str = ""

    # Access control
    access_level: str = "public"  # "public", "registered", "restricted"
    required_agreements: List[str] = field(default_factory=list)
    citation_required: bool = True

    # Provenance
    source: str = ""
    collection_date: Optional[datetime] = None
    creator_institution: str = ""
    contact_email: str = ""

    # Usage tracking
    download_count: int = 0
    citation_count: int = 0
    projects_used: List[str] = field(default_factory=list)

    # Access methods
    download_url: str = ""
    api_endpoint: str = ""
    sample_records: int = 100  # Number of records available without full access

    # Tags
    tags: List[str] = field(default_factory=list)
    related_papers: List[str] = field(default_factory=list)

    # Timestamps
    created: datetime = field(default_factory=datetime.now)
    updated: datetime = field(default_factory=datetime.now)


@dataclass
class CostShare:
    """Cost sharing arrangement for resources"""
    share_id: str
    resource_id: str
    project_id: str

    # Participants
    participants: Dict[str, float]  # {institution_id: percentage_share}

    # Cost distribution
    total_cost: float = 0.0
    cost_breakdown: Dict[str, float] = field(default_factory=dict)  # {institution: cost}

    # Billing
    billing_cycle: str = "monthly"  # "daily", "weekly", "monthly", "project_end"
    payment_method: str = "credit_pool"  # "credit_pool", "direct_billing", "reimbursement"

    # Status
    active: bool = True

    # Timestamps
    created: datetime = field(default_factory=datetime.now)


class InfrastructureManager:
    """
    Manages shared research infrastructure across collaborations.

    Features:
    - Resource catalog and allocation
    - Usage tracking and cost distribution
    - Access control and permissions
    - Fair scheduling algorithms
    """

    def __init__(self, data_dir: str = "data/infrastructure"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.resources: Dict[str, ComputeResource] = {}
        self.datasets: Dict[str, DatasetResource] = {}
        self.allocations: Dict[str, ResourceAllocation] = {}
        self.cost_shares: Dict[str, CostShare] = {}

        self._load_data()

    def _load_data(self):
        """Load infrastructure data from disk"""
        resources_file = self.data_dir / "resources.json"
        datasets_file = self.data_dir / "datasets.json"
        allocations_file = self.data_dir / "allocations.json"
        cost_shares_file = self.data_dir / "cost_shares.json"

        if resources_file.exists():
            with open(resources_file, 'r') as f:
                data = json.load(f)
                self.resources = {
                    rid: ComputeResource(**rdata)
                    for rid, rdata in data.items()
                }

        if datasets_file.exists():
            with open(datasets_file, 'r') as f:
                data = json.load(f)
                self.datasets = {
                    did: DatasetResource(**ddata)
                    for did, ddata in data.items()
                }

        if allocations_file.exists():
            with open(allocations_file, 'r') as f:
                data = json.load(f)
                for adata in data:
                    # Convert datetime strings
                    adata["start_time"] = datetime.fromisoformat(adata["start_time"])
                    adata["end_time"] = datetime.fromisoformat(adata["end_time"])
                    adata["created"] = datetime.fromisoformat(adata["created"])
                    self.allocations[adata["allocation_id"]] = ResourceAllocation(**adata)

        if cost_shares_file.exists():
            with open(cost_shares_file, 'r') as f:
                data = json.load(f)
                for cdata in data:
                    cdata["created"] = datetime.fromisoformat(cdata["created"])
                    self.cost_shares[cdata["share_id"]] = CostShare(**cdata)

    def _save_data(self):
        """Save infrastructure data to disk"""
        resources_file = self.data_dir / "resources.json"
        datasets_file = self.data_dir / "datasets.json"
        allocations_file = self.data_dir / "allocations.json"
        cost_shares_file = self.data_dir / "cost_shares.json"

        with open(resources_file, 'w') as f:
            json.dump(
                {rid: resource.__dict__ for rid, resource in self.resources.items()},
                f,
                indent=2,
                default=str
            )

        with open(datasets_file, 'w') as f:
            json.dump(
                {did: dataset.__dict__ for did, dataset in self.datasets.items()},
                f,
                indent=2,
                default=str
            )

        with open(allocations_file, 'w') as f:
            json.dump(
                [alloc.__dict__ for alloc in self.allocations.values()],
                f,
                indent=2,
                default=str
            )

        with open(cost_shares_file, 'w') as f:
            json.dump(
                [share.__dict__ for share in self.cost_shares.values()],
                f,
                indent=2,
                default=str
            )

    def register_compute_resource(
        self,
        name: str,
        resource_type: ResourceType,
        provider: Optional[CloudProvider] = None,
        **kwargs
    ) -> ComputeResource:
        """Register a new compute resource"""
        resource_id = f"res_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        resource = ComputeResource(
            resource_id=resource_id,
            name=name,
            resource_type=resource_type,
            provider=provider,
            **kwargs
        )

        self.resources[resource_id] = resource
        self._save_data()
        return resource

    def register_dataset(
        self,
        name: str,
        description: str,
        size_gb: float,
        record_count: int,
        format: str,
        **kwargs
    ) -> DatasetResource:
        """Register a new dataset"""
        dataset_id = f"ds_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        dataset = DatasetResource(
            dataset_id=dataset_id,
            name=name,
            description=description,
            size_gb=size_gb,
            record_count=record_count,
            format=format,
            **kwargs
        )

        self.datasets[dataset_id] = dataset
        self._save_data()
        return dataset

    def allocate_resource(
        self,
        resource_id: str,
        project_id: str,
        allocated_by: str,
        allocated_to: List[str],
        start_time: datetime,
        end_time: datetime,
        estimated_hours: float,
        purpose: str
    ) -> ResourceAllocation:
        """Allocate a resource to a project"""
        # Check resource availability
        if resource_id not in self.resources:
            raise ValueError(f"Resource {resource_id} not found")

        resource = self.resources[resource_id]

        if resource.status != ResourceStatus.AVAILABLE:
            raise ValueError(f"Resource {resource_id} is not available")

        # Calculate estimated cost
        estimated_cost = estimated_hours * resource.hourly_cost

        # Create allocation
        allocation_id = f"alloc_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        allocation = ResourceAllocation(
            allocation_id=allocation_id,
            resource_id=resource_id,
            project_id=project_id,
            allocated_by=allocated_by,
            allocated_to=allocated_to,
            start_time=start_time,
            end_time=end_time,
            estimated_hours=estimated_hours,
            estimated_cost=estimated_cost,
            purpose=purpose
        )

        self.allocations[allocation_id] = allocation

        # Update resource status
        resource.status = ResourceStatus.ALLOCATED
        resource.current_allocation = project_id
        resource.reserved_until = end_time

        self._save_data()
        return allocation

    def release_resource(self, allocation_id: str, actual_hours: float):
        """Release a resource allocation"""
        if allocation_id not in self.allocations:
            raise ValueError(f"Allocation {allocation_id} not found")

        allocation = self.allocations[allocation_id]
        resource = self.resources[allocation.resource_id]

        # Update allocation
        allocation.actual_hours = actual_hours
        allocation.actual_cost = actual_hours * resource.hourly_cost
        allocation.active = False

        # Update resource
        resource.status = ResourceStatus.AVAILABLE
        resource.current_allocation = None
        resource.reserved_until = None
        resource.total_usage_hours += actual_hours
        resource.last_used = datetime.now()

        self._save_data()

    def create_cost_share(
        self,
        resource_id: str,
        project_id: str,
        participants: Dict[str, float],
        total_cost: float
    ) -> CostShare:
        """Create cost sharing arrangement"""
        share_id = f"share_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Verify participants sum to 1.0 (100%)
        total_share = sum(participants.values())
        if abs(total_share - 1.0) > 0.01:
            raise ValueError(f"Participant shares must sum to 1.0, got {total_share}")

        # Calculate cost breakdown
        cost_breakdown = {
            institution: total_cost * share
            for institution, share in participants.items()
        }

        cost_share = CostShare(
            share_id=share_id,
            resource_id=resource_id,
            project_id=project_id,
            participants=participants,
            total_cost=total_cost,
            cost_breakdown=cost_breakdown
        )

        self.cost_shares[share_id] = cost_share
        self._save_data()
        return cost_share

    def find_available_resources(
        self,
        resource_type: Optional[ResourceType] = None,
        min_gpu_memory: Optional[int] = None,
        max_hourly_cost: Optional[float] = None,
        provider: Optional[CloudProvider] = None
    ) -> List[ComputeResource]:
        """Find available resources matching criteria"""
        available = []

        for resource in self.resources.values():
            # Filter by status
            if resource.status != ResourceStatus.AVAILABLE:
                continue

            # Filter by type
            if resource_type is not None and resource.resource_type != resource_type:
                continue

            # Filter by GPU
            if min_gpu_memory is not None and resource.gpu_type is not None:
                gpu_memory = {
                    GPUType.H100: 80,
                    GPUType.A100: 80,
                    GPUType.V100: 32,
                    GPUType.RTX4090: 24,
                    GPUType.RTX4080: 16,
                    GPUType.T4: 16
                }.get(resource.gpu_type, 0)

                if gpu_memory < min_gpu_memory:
                    continue

            # Filter by cost
            if max_hourly_cost is not None and resource.hourly_cost > max_hourly_cost:
                continue

            # Filter by provider
            if provider is not None and resource.provider != provider:
                continue

            available.append(resource)

        return available

    def find_datasets(
        self,
        tags: Optional[List[str]] = None,
        access_level: str = "public",
        related_papers: Optional[List[str]] = None,
        min_size_gb: Optional[float] = None
    ) -> List[DatasetResource]:
        """Find datasets matching criteria"""
        results = []

        for dataset in self.datasets.values():
            # Filter by access level
            if dataset.access_level != access_level and access_level != "all":
                continue

            # Filter by tags
            if tags is not None and not any(tag in dataset.tags for tag in tags):
                continue

            # Filter by papers
            if related_papers is not None and not any(
                paper in dataset.related_papers for paper in related_papers
            ):
                continue

            # Filter by size
            if min_size_gb is not None and dataset.size_gb < min_size_gb:
                continue

            results.append(dataset)

        return results

    def get_resource_usage_report(
        self,
        resource_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """Generate usage report for a resource"""
        if resource_id not in self.resources:
            raise ValueError(f"Resource {resource_id} not found")

        resource = self.resources[resource_id]

        # Find allocations in date range
        relevant_allocations = [
            alloc for alloc in self.allocations.values()
            if alloc.resource_id == resource_id
            and alloc.start_time >= start_date
            and alloc.end_time <= end_date
        ]

        total_hours = sum(alloc.actual_hours for alloc in relevant_allocations)
        total_cost = sum(alloc.actual_cost for alloc in relevant_allocations)

        # Project breakdown
        projects = {}
        for alloc in relevant_allocations:
            if alloc.project_id not in projects:
                projects[alloc.project_id] = {
                    "hours": 0,
                    "cost": 0,
                    "allocations": 0
                }
            projects[alloc.project_id]["hours"] += alloc.actual_hours
            projects[alloc.project_id]["cost"] += alloc.actual_cost
            projects[alloc.project_id]["allocations"] += 1

        return {
            "resource_id": resource_id,
            "resource_name": resource.name,
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "total_hours": total_hours,
            "total_cost": total_cost,
            "total_allocations": len(relevant_allocations),
            "project_breakdown": projects
        }

    def get_institution_cost_summary(
        self,
        institution_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """Get cost summary for an institution"""
        total_cost = 0.0
        resources_used = []

        # Find cost shares where institution participates
        for share in self.cost_shares.values():
            if institution_id in share.participants:
                # Check if share is active in period
                if share.created >= start_date and share.created <= end_date:
                    institution_cost = share.cost_breakdown.get(institution_id, 0)
                    total_cost += institution_cost

                    # Track resources
                    if share.resource_id not in resources_used:
                        resources_used.append(share.resource_id)

        return {
            "institution_id": institution_id,
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "total_cost": total_cost,
            "resources_used": resources_used,
            "cost_shares_participated": len([
                s for s in self.cost_shares.values()
                if institution_id in s.participants
            ])
        }


def main():
    """Example usage"""
    manager = InfrastructureManager()

    # Register GPU resources
    h100_cluster = manager.register_compute_resource(
        name="H100 Research Cluster",
        resource_type=ResourceType.GPU_TIME,
        provider=CloudProvider.AWS,
        gpu_type=GPUType.H100,
        gpu_count=8,
        cpu_cores=128,
        memory_gb=1024,
        hourly_cost=15.0,
        total_credits=5000,
        remaining_credits=5000,
        owning_institution="MIT",
        contact_email="compute@mit.edu"
    )

    # Register dataset
    simulation_results = manager.register_dataset(
        name="SuperInstance Simulation Results 2024",
        description="Complete simulation results from all SuperInstance paper experiments",
        size_gb=250,
        record_count=50000000,
        format="parquet",
        access_level="public",
        source="SuperInstance Research Group",
        creator_institution="MIT",
        contact_email="data@superinstance.org",
        tags=["simulation", "distributed-systems", "consensus"],
        related_papers=["P2", "P12", "P13"]
    )

    # Allocate GPU time
    allocation = manager.allocate_resource(
        resource_id=h100_cluster.resource_id,
        project_id="proj_001",
        allocated_by="admin",
        allocated_to=["alice", "bob"],
        start_time=datetime.now(),
        end_time=datetime.now() + timedelta(days=7),
        estimated_hours=168,  # 1 week
        purpose="Train distributed consensus models"
    )

    print(f"Allocated {h100_cluster.name}")
    print(f"Allocation ID: {allocation.allocation_id}")
    print(f"Estimated cost: ${allocation.estimated_cost:.2f}")

    # Find available resources
    available = manager.find_available_resources(
        resource_type=ResourceType.GPU_TIME,
        max_hourly_cost=20.0
    )

    print(f"\nAvailable GPU resources under $20/hour: {len(available)}")
    for resource in available:
        print(f"  {resource.name}: ${resource.hourly_cost}/hour")

    # Find datasets
    datasets = manager.find_datasets(
        tags=["simulation"],
        access_level="public"
    )

    print(f"\nPublic simulation datasets: {len(datasets)}")
    for dataset in datasets:
        print(f"  {dataset.name}: {dataset.size_gb}GB")


if __name__ == "__main__":
    main()

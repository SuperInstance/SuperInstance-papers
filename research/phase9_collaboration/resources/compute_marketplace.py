"""
Compute Resource Marketplace
=============================

Marketplace for sharing and allocating computing resources across
global research collaborations with fair cost distribution.

Features:
- Resource listing and discovery
- Allocation requests and approvals
- Usage-based cost tracking
- Fair scheduling algorithms
- Multi-institutional cost sharing
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
import json
from pathlib import Path


class ResourceTier(Enum):
    """Tiers of compute resources"""
    BASIC = "basic"  # Standard CPU instances
    STANDARD = "standard"  # GPU instances
    PREMIUM = "premium"  # High-end GPU (H100, A100)
    ELITE = "elite"  # Specialized hardware (quantum, neuromorphic)


class AllocationStatus(Enum):
    """Status of resource allocation requests"""
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class PricingModel(Enum):
    """Pricing models for resource allocation"""
    HOURLY = "hourly"  # Pay per hour
    CREDIT_BASED = "credit_based"  # Deduct from credit pool
    FREE = "free"  # No cost (institutional allocation)
    GRANT_FUNDED = "grant_funded"  # Paid by specific grant


@dataclass
class ResourceListing:
    """Listing of available compute resource"""
    listing_id: str
    name: str
    description: str
    tier: ResourceTier

    # Specifications
    cpu_cores: int
    memory_gb: int
    gpu_type: Optional[str] = None  # "H100", "A100", "V100", etc.
    gpu_count: int = 0
    storage_gb: int = 0

    # Capacity
    total_capacity: float = 1.0  # Total available capacity
    available_capacity: float = 1.0  # Currently available

    # Pricing
    hourly_rate: float = 0.0
    pricing_model: PricingModel = PricingModel.HOURLY

    # Access
    access_requirements: List[str] = field(default_factory=list)
    setup_instructions: str = ""
    connection_details: str = ""

    # Provider
    provider_institution: str = ""
    contact_person: str = ""
    contact_email: str = ""

    # Availability
    available_from: datetime = field(default_factory=datetime.now)
    available_until: Optional[datetime] = None
    maintenance_windows: List[Tuple[datetime, datetime]] = field(default_factory=list)

    # Restrictions
    max_allocation_hours: Optional[float] = None
    allowed_institutions: Optional[List[str]] = None  # None = all allowed
    min_project_phase: str = "any"  # "any", "production", "research"

    # Status
    is_active: bool = True

    # Timestamps
    created: datetime = field(default_factory=datetime.now)
    updated: datetime = field(default_factory=datetime.now)


@dataclass
class AllocationRequest:
    """Request to allocate compute resources"""
    request_id: str
    project_id: str
    requesting_institution: str
    requesting_researcher: str
    requester_email: str

    # Resource requirements
    resource_tier: ResourceTier
    min_cpu_cores: int
    min_memory_gb: int
    min_gpu_count: int = 0
    preferred_gpu_type: Optional[str] = None
    storage_gb: int = 0

    # Duration
    estimated_hours: float
    preferred_start: Optional[datetime] = None
    deadline: Optional[datetime] = None

    # Purpose
    research_purpose: str = ""
    papers_researched: List[str] = field(default_factory=list)
    expected_outcomes: List[str] = field(default_factory=list)

    # Priority
    priority: int = 5  # 1-10, 10 = highest
    justification: str = ""

    # Cost
    budget_limit: Optional[float] = None
    funding_source: str = "institutional"

    # Status
    status: AllocationStatus = AllocationStatus.PENDING
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    # Allocation details (when approved)
    allocated_listing_id: Optional[str] = None
    allocated_capacity: float = 0.0
    actual_cost: float = 0.0

    # Reviews
    reviewer_comments: List[str] = field(default_factory=list)

    # Timestamps
    created: datetime = field(default_factory=datetime.now)
    updated: datetime = field(default_factory=datetime.now)


@dataclass
class UsageRecord:
    """Record of actual resource usage"""
    record_id: str
    allocation_request_id: str
    project_id: str

    # Usage details
    listing_id: str
    start_time: datetime
    end_time: datetime
    hours_used: float

    # Resources used
    cpu_hours: float
    gpu_hours: float = 0.0
    storage_gb_hours: float = 0.0

    # Cost
    hourly_rate: float
    total_cost: float
    cost_breakdown: Dict[str, float] = field(default_factory=dict)

    # Performance
    average_utilization: float = 0.0  # 0.0 to 1.0
    peak_utilization: float = 0.0

    # Metadata
    job_id: str = ""
    notes: str = ""

    # Timestamps
    recorded: datetime = field(default_factory=datetime.now)


class ComputeMarketplace:
    """
    Marketplace for compute resource sharing.

    Features:
    - Resource discovery and matching
    - Allocation request management
    - Fair scheduling
    - Usage tracking and billing
    """

    def __init__(self, data_dir: str = "data/compute_marketplace"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.listings: Dict[str, ResourceListing] = {}
        self.requests: Dict[str, AllocationRequest] = {}
        self.usage_records: Dict[str, UsageRecord] = {}

        self._load_data()

    def _load_data(self):
        """Load marketplace data from disk"""
        listings_file = self.data_dir / "listings.json"
        requests_file = self.data_dir / "requests.json"
        usage_file = self.data_dir / "usage.json"

        if listings_file.exists():
            with open(listings_file, 'r') as f:
                data = json.load(f)
                for ldata in data:
                    # Parse maintenance windows
                    if "maintenance_windows" in ldata:
                        ldata["maintenance_windows"] = [
                            (datetime.fromisoformat(start), datetime.fromisoformat(end))
                            for start, end in ldata["maintenance_windows"]
                        ]
                    ldata["created"] = datetime.fromisoformat(ldata["created"])
                    ldata["updated"] = datetime.fromisoformat(ldata["updated"])
                    self.listings[ldata["listing_id"]] = ResourceListing(**ldata)

        if requests_file.exists():
            with open(requests_file, 'r') as f:
                data = json.load(f)
                for rdata in data:
                    if "preferred_start" in rdata and rdata["preferred_start"]:
                        rdata["preferred_start"] = datetime.fromisoformat(rdata["preferred_start"])
                    if "deadline" in rdata and rdata["deadline"]:
                        rdata["deadline"] = datetime.fromisoformat(rdata["deadline"])
                    if "approved_at" in rdata and rdata["approved_at"]:
                        rdata["approved_at"] = datetime.fromisoformat(rdata["approved_at"])
                    rdata["created"] = datetime.fromisoformat(rdata["created"])
                    rdata["updated"] = datetime.fromisoformat(rdata["updated"])
                    self.requests[rdata["request_id"]] = AllocationRequest(**rdata)

        if usage_file.exists():
            with open(usage_file, 'r') as f:
                data = json.load(f)
                for udata in data:
                    udata["start_time"] = datetime.fromisoformat(udata["start_time"])
                    udata["end_time"] = datetime.fromisoformat(udata["end_time"])
                    udata["recorded"] = datetime.fromisoformat(udata["recorded"])
                    self.usage_records[udata["record_id"]] = UsageRecord(**udata)

    def _save_data(self):
        """Save marketplace data to disk"""
        listings_file = self.data_dir / "listings.json"
        requests_file = self.data_dir / "requests.json"
        usage_file = self.data_dir / "usage.json"

        with open(listings_file, 'w') as f:
            data = []
            for listing in self.listings.values():
                ldict = listing.__dict__.copy()
                # Convert maintenance windows to list of tuples
                ldict["maintenance_windows"] = [
                    (start.isoformat(), end.isoformat())
                    for start, end in listing.maintenance_windows
                ]
                data.append(ldict)
            json.dump(data, f, indent=2, default=str)

        with open(requests_file, 'w') as f:
            json.dump(
                [r.__dict__ for r in self.requests.values()],
                f,
                indent=2,
                default=str
            )

        with open(usage_file, 'w') as f:
            json.dump(
                [u.__dict__ for u in self.usage_records.values()],
                f,
                indent=2,
                default=str
            )

    def list_resource(
        self,
        name: str,
        description: str,
        tier: ResourceTier,
        cpu_cores: int,
        memory_gb: int,
        hourly_rate: float,
        provider_institution: str,
        **kwargs
    ) -> ResourceListing:
        """List a new compute resource"""
        listing_id = f"listing_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        listing = ResourceListing(
            listing_id=listing_id,
            name=name,
            description=description,
            tier=tier,
            cpu_cores=cpu_cores,
            memory_gb=memory_gb,
            hourly_rate=hourly_rate,
            provider_institution=provider_institution,
            **kwargs
        )

        self.listings[listing_id] = listing
        self._save_data()
        return listing

    def submit_allocation_request(
        self,
        project_id: str,
        requesting_institution: str,
        requesting_researcher: str,
        requester_email: str,
        resource_tier: ResourceTier,
        min_cpu_cores: int,
        min_memory_gb: int,
        estimated_hours: float,
        research_purpose: str,
        **kwargs
    ) -> AllocationRequest:
        """Submit a resource allocation request"""
        request_id = f"req_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        request = AllocationRequest(
            request_id=request_id,
            project_id=project_id,
            requesting_institution=requesting_institution,
            requesting_researcher=requesting_researcher,
            requester_email=requester_email,
            resource_tier=resource_tier,
            min_cpu_cores=min_cpu_cores,
            min_memory_gb=min_memory_gb,
            estimated_hours=estimated_hours,
            research_purpose=research_purpose,
            **kwargs
        )

        self.requests[request_id] = request
        self._save_data()
        return request

    def find_matching_listings(
        self,
        request: AllocationRequest
    ) -> List[Tuple[ResourceListing, float]]:
        """
        Find resource listings that match a request.

        Returns: List of (listing, match_score) tuples
        """
        matches = []

        for listing in self.listings.values():
            # Skip inactive listings
            if not listing.is_active:
                continue

            # Check tier match
            if listing.tier != request.resource_tier:
                continue

            # Check minimum requirements
            if listing.cpu_cores < request.min_cpu_cores:
                continue
            if listing.memory_gb < request.min_memory_gb:
                continue
            if listing.min_gpu_count > 0 and listing.gpu_count < request.min_gpu_count:
                continue

            # Check GPU type preference
            if request.preferred_gpu_type and listing.gpu_type != request.preferred_gpu_type:
                continue

            # Check availability
            if listing.available_capacity <= 0:
                continue

            # Check institution restrictions
            if listing.allowed_institutions is not None:
                if request.requesting_institution not in listing.allowed_institutions:
                    continue

            # Check budget
            estimated_cost = listing.hourly_rate * request.estimated_hours
            if request.budget_limit and estimated_cost > request.budget_limit:
                continue

            # Calculate match score
            score = self._calculate_match_score(request, listing)
            matches.append((listing, score))

        # Sort by score descending
        matches.sort(key=lambda x: x[1], reverse=True)

        return matches

    def _calculate_match_score(
        self,
        request: AllocationRequest,
        listing: ResourceListing
    ) -> float:
        """Calculate match score between request and listing"""
        score = 0.0

        # Resource fit (40%)
        cpu_fit = min(1.0, listing.cpu_cores / request.min_cpu_cores)
        memory_fit = min(1.0, listing.memory_gb / request.min_memory_gb)
        resource_score = (cpu_fit + memory_fit) / 2
        score += resource_score * 0.40

        # Availability (30%)
        availability_score = listing.available_capacity
        score += availability_score * 0.30

        # Cost efficiency (20%)
        if request.budget_limit:
            estimated_cost = listing.hourly_rate * request.estimated_hours
            cost_score = 1.0 - (estimated_cost / request.budget_limit) * 0.5
            score += max(0, cost_score) * 0.20
        else:
            score += 0.5 * 0.20

        # Tier preference (10%)
        tier_scores = {
            ResourceTier.BASIC: 0.5,
            ResourceTier.STANDARD: 0.7,
            ResourceTier.PREMIUM: 0.9,
            ResourceTier.ELITE: 1.0
        }
        score += tier_scores.get(listing.tier, 0.5) * 0.10

        return min(1.0, score)

    def approve_request(
        self,
        request_id: str,
        listing_id: str,
        approved_by: str,
        allocated_capacity: float = 1.0
    ):
        """Approve an allocation request"""
        if request_id not in self.requests:
            raise ValueError(f"Request {request_id} not found")
        if listing_id not in self.listings:
            raise ValueError(f"Listing {listing_id} not found")

        request = self.requests[request_id]
        listing = self.listings[listing_id]

        # Check capacity
        if listing.available_capacity < allocated_capacity:
            raise ValueError(f"Insufficient capacity: {listing.available_capacity} < {allocated_capacity}")

        # Update request
        request.status = AllocationStatus.APPROVED
        request.approved_by = approved_by
        request.approved_at = datetime.now()
        request.allocated_listing_id = listing_id
        request.allocated_capacity = allocated_capacity
        request.actual_cost = listing.hourly_rate * request.estimated_hours

        # Update listing capacity
        listing.available_capacity -= allocated_capacity

        self._save_data()

    def record_usage(
        self,
        allocation_request_id: str,
        start_time: datetime,
        end_time: datetime,
        cpu_hours: float,
        gpu_hours: float,
        storage_gb_hours: float,
        hourly_rate: float,
        job_id: str = "",
        notes: str = ""
    ) -> UsageRecord:
        """Record actual resource usage"""
        if allocation_request_id not in self.requests:
            raise ValueError(f"Request {allocation_request_id} not found")

        request = self.requests[allocation_request_id]
        listing_id = request.allocated_listing_id

        if not listing_id:
            raise ValueError(f"Request {allocation_request_id} not approved")

        # Calculate duration and cost
        duration_hours = (end_time - start_time).total_seconds() / 3600
        total_cost = hourly_rate * duration_hours

        # Cost breakdown
        cost_breakdown = {
            "cpu": cpu_hours * hourly_rate * 0.5,
            "gpu": gpu_hours * hourly_rate * 0.4,
            "storage": storage_gb_hours * hourly_rate * 0.1
        }

        record_id = f"usage_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        record = UsageRecord(
            record_id=record_id,
            allocation_request_id=allocation_request_id,
            project_id=request.project_id,
            listing_id=listing_id,
            start_time=start_time,
            end_time=end_time,
            hours_used=duration_hours,
            cpu_hours=cpu_hours,
            gpu_hours=gpu_hours,
            storage_gb_hours=storage_gb_hours,
            hourly_rate=hourly_rate,
            total_cost=total_cost,
            cost_breakdown=cost_breakdown,
            job_id=job_id,
            notes=notes
        )

        self.usage_records[record_id] = record

        # Update request status
        request.status = AllocationStatus.COMPLETED

        # Release capacity
        if listing_id in self.listings:
            listing = self.listings[listing_id]
            listing.available_capacity += request.allocated_capacity

        self._save_data()
        return record

    def get_usage_report(
        self,
        project_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """Generate usage report for a project"""
        # Find usage records for project
        records = [
            record for record in self.usage_records.values()
            if record.project_id == project_id
        ]

        # Filter by date range
        if start_date:
            records = [r for r in records if r.start_time >= start_date]
        if end_date:
            records = [r for r in records if r.end_time <= end_date]

        if not records:
            return {
                "project_id": project_id,
                "total_records": 0,
                "total_hours": 0,
                "total_cost": 0
            }

        # Calculate totals
        total_hours = sum(r.hours_used for r in records)
        total_cost = sum(r.total_cost for r in records)
        total_cpu_hours = sum(r.cpu_hours for r in records)
        total_gpu_hours = sum(r.gpu_hours for r in records)

        # Cost breakdown
        cost_breakdown = {}
        for record in records:
            for category, cost in record.cost_breakdown.items():
                cost_breakdown[category] = cost_breakdown.get(category, 0) + cost

        return {
            "project_id": project_id,
            "period_start": start_date.isoformat() if start_date else None,
            "period_end": end_date.isoformat() if end_date else None,
            "total_records": len(records),
            "total_hours": total_hours,
            "total_cpu_hours": total_cpu_hours,
            "total_gpu_hours": total_gpu_hours,
            "total_cost": total_cost,
            "cost_breakdown": cost_breakdown,
            "average_hourly_cost": total_cost / total_hours if total_hours > 0 else 0
        }


def main():
    """Example usage"""
    marketplace = ComputeMarketplace()

    # List some resources
    h100_cluster = marketplace.list_resource(
        name="H100 Research Cluster",
        description="High-performance GPU cluster for AI research",
        tier=ResourceTier.PREMIUM,
        cpu_cores=128,
        memory_gb=1024,
        gpu_type="H100",
        gpu_count=8,
        hourly_rate=15.0,
        provider_institution="MIT",
        contact_person="Dr. Alice Chen",
        contact_email="compute@mit.edu"
    )

    print(f"Listed resource: {h100_cluster.name}")
    print(f"Hourly rate: ${h100_cluster.hourly_rate}/hour")

    # Submit allocation request
    request = marketplace.submit_allocation_request(
        project_id="proj_001",
        requesting_institution="Stanford University",
        requesting_researcher="Dr. Bob Smith",
        requester_email="bob@stanford.edu",
        resource_tier=ResourceTier.PREMIUM,
        min_cpu_cores=64,
        min_memory_gb=512,
        min_gpu_count=4,
        estimated_hours=168,  # 1 week
        research_purpose="Train distributed consensus models",
        papers_researched=["P12", "P13"],
        priority=8,
        justification="High priority publication deadline",
        budget_limit=3000
    )

    print(f"\nSubmitted request: {request.request_id}")
    print(f"Estimated cost: ${request.budget_limit}")

    # Find matches
    matches = marketplace.find_matching_listings(request)

    print(f"\nFound {len(matches)} matching resources:")
    for listing, score in matches[:3]:
        print(f"  {listing.name}: {score:.2f}")

    # Approve request
    if matches:
        marketplace.approve_request(
            request_id=request.request_id,
            listing_id=matches[0][0].listing_id,
            approved_by="admin",
            allocated_capacity=0.5
        )

        print(f"\nApproved request")

        # Record usage
        usage = marketplace.record_usage(
            allocation_request_id=request.request_id,
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(hours=24),
            cpu_hours=24 * 64,
            gpu_hours=24 * 4,
            storage_gb_hours=0,
            hourly_rate=15.0,
            job_id="job_001"
        )

        print(f"\nRecorded usage: ${usage.total_cost:.2f}")


if __name__ == "__main__":
    main()

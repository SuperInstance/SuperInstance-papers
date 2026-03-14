"""
Data Exchange Protocols
=======================

Secure protocols for sharing research data across global collaborations
with proper access control, provenance tracking, and citation management.

Features:
- Secure data transfer protocols
- Access control and permissions
- Data provenance tracking
- Citation and attribution management
- Compliance with data sharing agreements
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set
from datetime import datetime
from enum import Enum
import json
import hashlib
from pathlib import Path


class DataClassification(Enum):
    """Classification levels for research data"""
    PUBLIC = "public"  # Open to all
    INTERNAL = "internal"  # Within collaboration only
    CONFIDENTIAL = "confidential"  # Named recipients only
    RESTRICTED = "restricted"  # Additional legal restrictions


class DataFormat(Enum):
    """Common data formats"""
    CSV = "csv"
    JSON = "json"
    PARQUET = "parquet"
    HDF5 = "hdf5"
    NETCDF = "netcdf"
    BINARY = "binary"
    TEXT = "text"


@dataclass
class DataPackage:
    """Package of research data for sharing"""
    package_id: str
    name: str
    description: str

    # Content
    files: List[Dict[str, str]]  # [{filename, size, format, hash}]
    total_size_gb: float
    record_count: int = 0

    # Metadata
    data_classification: DataClassification = DataClassification.INTERNAL
    formats: List[DataFormat] = field(default_factory=list)
    schema_description: str = ""

    # Provenance
    creator_institution: str = ""
    creator_researcher: str = ""
    creation_date: datetime = field(default_factory=datetime.now)
    source_experiments: List[str] = field(default_factory=list)  # Experiment IDs
    related_papers: List[str] = field(default_factory=list)

    # Access control
    allowed_recipients: Optional[List[str]] = None  # None = all registered researchers
    access_level: str = "registered"  # "public", "registered", "named"
    requires_agreement: bool = False

    # Citation
    requires_citation: bool = True
    citation_text: str = ""
    doi: Optional[str] = None
    license: str = "CC-BY-4.0"

    # Transfer
    transfer_method: str = "download"  # "download", "api", "physical"
    download_url: str = ""
    api_endpoint: str = ""
    checksum: str = ""  # SHA-256 of package

    # Usage tracking
    download_count: int = 0
    citation_count: int = 0
    projects_used_in: List[str] = field(default_factory=list)

    # Timestamps
    created: datetime = field(default_factory=datetime.now)
    updated: datetime = field(default_factory=datetime.now)


@dataclass
class DataTransferRequest:
    """Request to transfer data package"""
    request_id: str
    package_id: str
    requester_institution: str
    requester_researcher: str
    requester_email: str

    # Purpose
    intended_use: str = ""
    projects_to_be_used_in: List[str] = field(default_factory=list)
    expected_outcomes: List[str] = field(default_factory=list)

    # Terms
    agrees_to_citation: bool = False
    agrees_to_license: bool = False
    will_share_results: bool = True

    # Status
    approved: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    denial_reason: str = ""

    # Access
    access_granted: bool = False
    access_url: str = ""
    access_expires: Optional[datetime] = None

    # Timestamps
    created: datetime = field(default_factory=datetime.now)


@dataclass
class DataCitation:
    """Record of data citation"""
    citation_id: str
    package_id: str
    citing_project: str
    citing_researcher: str

    # Publication details
    publication_title: str = ""
    publication_venue: str = ""
    publication_year: int = 0
    publication_doi: str = ""

    # Usage
    usage_description: str = ""
    datasets_used: List[str] = field(default_factory=list)

    # Verification
    verified: bool = False
    verified_by: Optional[str] = None

    # Timestamps
    created: datetime = field(default_factory=datetime.now)


class DataExchangeManager:
    """
    Manages secure data exchange across collaborations.

    Features:
    - Package creation and metadata management
    - Access control and permissions
    - Transfer request handling
    - Citation tracking
    """

    def __init__(self, data_dir: str = "data/data_exchange"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.packages: Dict[str, DataPackage] = {}
        self.transfer_requests: Dict[str, DataTransferRequest] = {}
        self.citations: Dict[str, DataCitation] = {}

        self._load_data()

    def _load_data(self):
        """Load data exchange data from disk"""
        packages_file = self.data_dir / "packages.json"
        requests_file = self.data_dir / "transfer_requests.json"
        citations_file = self.data_dir / "citations.json"

        if packages_file.exists():
            with open(packages_file, 'r') as f:
                data = json.load(f)
                for pdata in data:
                    # Convert datetime strings
                    for dt_field in ["creation_date", "created", "updated"]:
                        if dt_field in pdata and pdata[dt_field]:
                            pdata[dt_field] = datetime.fromisoformat(pdata[dt_field])
                    # Convert format enums
                    if "formats" in pdata:
                        pdata["formats"] = [DataFormat(f) for f in pdata["formats"]]
                    self.packages[pdata["package_id"]] = DataPackage(**pdata)

        if requests_file.exists():
            with open(requests_file, 'r') as f:
                data = json.load(f)
                for rdata in data:
                    for dt_field in ["created", "approved_at", "access_expires"]:
                        if dt_field in rdata and rdata[dt_field]:
                            rdata[dt_field] = datetime.fromisoformat(rdata[dt_field])
                    self.transfer_requests[rdata["request_id"]] = DataTransferRequest(**rdata)

        if citations_file.exists():
            with open(citations_file, 'r') as f:
                data = json.load(f)
                for cdata in data:
                    if "created" in cdata and cdata["created"]:
                        cdata["created"] = datetime.fromisoformat(cdata["created"])
                    self.citations[cdata["citation_id"]] = DataCitation(**cdata)

    def _save_data(self):
        """Save data exchange data to disk"""
        packages_file = self.data_dir / "packages.json"
        requests_file = self.data_dir / "transfer_requests.json"
        citations_file = self.data_dir / "citations.json"

        with open(packages_file, 'w') as f:
            data = []
            for package in self.packages.values():
                pdict = package.__dict__.copy()
                # Convert enums to strings
                pdict["formats"] = [f.value for f in package.formats]
                data.append(pdict)
            json.dump(data, f, indent=2, default=str)

        with open(requests_file, 'w') as f:
            json.dump(
                [r.__dict__ for r in self.transfer_requests.values()],
                f,
                indent=2,
                default=str
            )

        with open(citations_file, 'w') as f:
            json.dump(
                [c.__dict__ for c in self.citations.values()],
                f,
                indent=2,
                default=str
            )

    def create_data_package(
        self,
        name: str,
        description: str,
        files: List[Dict[str, str]],
        creator_institution: str,
        creator_researcher: str,
        data_classification: DataClassification = DataClassification.INTERNAL,
        **kwargs
    ) -> DataPackage:
        """Create a new data package for sharing"""
        package_id = f"pkg_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Calculate total size
        total_size = sum(float(f.get("size", 0)) for f in files)
        total_size_gb = total_size / (1024**3)

        # Extract formats
        formats = list(set(DataFormat(f.get("format", "binary")) for f in files))

        # Generate checksum (simplified)
        checksum = hashlib.sha256(
            f"{package_id}{name}{total_size}".encode()
        ).hexdigest()[:16]

        package = DataPackage(
            package_id=package_id,
            name=name,
            description=description,
            files=files,
            total_size_gb=total_size_gb,
            formats=formats,
            creator_institution=creator_institution,
            creator_researcher=creator_researcher,
            data_classification=data_classification,
            checksum=checksum,
            **kwargs
        )

        self.packages[package_id] = package
        self._save_data()
        return package

    def request_data_access(
        self,
        package_id: str,
        requester_institution: str,
        requester_researcher: str,
        requester_email: str,
        intended_use: str,
        projects_to_be_used_in: Optional[List[str]] = None
    ) -> DataTransferRequest:
        """Submit request to access data package"""
        if package_id not in self.packages:
            raise ValueError(f"Package {package_id} not found")

        package = self.packages[package_id]

        request_id = f"req_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        request = DataTransferRequest(
            request_id=request_id,
            package_id=package_id,
            requester_institution=requester_institution,
            requester_researcher=requester_researcher,
            requester_email=requester_email,
            intended_use=intended_use,
            projects_to_be_used_in=projects_to_be_used_in or [],
            agrees_to_citation=package.requires_citation,
            agrees_to_license=True
        )

        self.transfer_requests[request_id] = request
        self._save_data()
        return request

    def approve_transfer_request(
        self,
        request_id: str,
        approved_by: str,
        access_expires: Optional[datetime] = None
    ):
        """Approve a data transfer request"""
        if request_id not in self.transfer_requests:
            raise ValueError(f"Request {request_id} not found")

        request = self.transfer_requests[request_id]
        package = self.packages[request.package_id]

        # Check permissions
        if not request.agrees_to_citation and package.requires_citation:
            raise ValueError("Requester must agree to citation requirements")

        if not request.agrees_to_license:
            raise ValueError("Requester must agree to license terms")

        # Approve request
        request.approved = True
        request.approved_by = approved_by
        request.approved_at = datetime.now()
        request.access_granted = True
        request.access_expires = access_expires
        request.access_url = package.download_url

        # Update package stats
        package.download_count += 1

        self._save_data()

    def record_citation(
        self,
        package_id: str,
        citing_project: str,
        citing_researcher: str,
        publication_title: str,
        publication_venue: str = "",
        publication_year: int = 0,
        usage_description: str = ""
    ) -> DataCitation:
        """Record a citation of data package"""
        if package_id not in self.packages:
            raise ValueError(f"Package {package_id} not found")

        citation_id = f"cite_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        citation = DataCitation(
            citation_id=citation_id,
            package_id=package_id,
            citing_project=citing_project,
            citing_researcher=citing_researcher,
            publication_title=publication_title,
            publication_venue=publication_venue,
            publication_year=publication_year,
            usage_description=usage_description
        )

        self.citations[citation_id] = citation

        # Update package stats
        package = self.packages[package_id]
        package.citation_count += 1
        if citing_project not in package.projects_used_in:
            package.projects_used_in.append(citing_project)

        self._save_data()
        return citation

    def find_data_packages(
        self,
        classification: Optional[DataClassification] = None,
        formats: Optional[List[DataFormat]] = None,
        related_papers: Optional[List[str]] = None,
        creator_institution: Optional[str] = None,
        min_size_gb: Optional[float] = None,
        max_size_gb: Optional[float] = None
    ) -> List[DataPackage]:
        """Find data packages matching criteria"""
        results = []

        for package in self.packages.values():
            # Filter by classification
            if classification is not None and package.data_classification != classification:
                continue

            # Filter by formats
            if formats is not None and not any(f in package.formats for f in formats):
                continue

            # Filter by papers
            if related_papers is not None and not any(
                paper in package.related_papers for paper in related_papers
            ):
                continue

            # Filter by institution
            if creator_institution is not None and package.creator_institution != creator_institution:
                continue

            # Filter by size
            if min_size_gb is not None and package.total_size_gb < min_size_gb:
                continue
            if max_size_gb is not None and package.total_size_gb > max_size_gb:
                continue

            results.append(package)

        return results

    def get_package_usage_report(self, package_id: str) -> Dict:
        """Generate usage report for data package"""
        if package_id not in self.packages:
            raise ValueError(f"Package {package_id} not found")

        package = self.packages[package_id]

        # Find all citations
        citations = [
            c for c in self.citations.values()
            if c.package_id == package_id
        ]

        # Find all transfer requests
        requests = [
            r for r in self.transfer_requests.values()
            if r.package_id == package_id
        ]

        return {
            "package_id": package_id,
            "package_name": package.name,
            "total_downloads": package.download_count,
            "total_citations": package.citation_count,
            "projects_using": len(package.projects_used_in),
            "pending_requests": len([r for r in requests if not r.approved]),
            "approved_requests": len([r for r in requests if r.approved]),
            "citations": [
                {
                    "project": c.citing_project,
                    "researcher": c.citing_researcher,
                    "title": c.publication_title,
                    "venue": c.publication_venue,
                    "year": c.publication_year
                }
                for c in citations
            ]
        }


def main():
    """Example usage"""
    manager = DataExchangeManager()

    # Create data package
    package = manager.create_data_package(
        name="SuperInstance Simulation Results 2024",
        description="Complete simulation results from distributed consensus experiments",
        files=[
            {"filename": "results.parquet", "size": str(50 * 1024**3), "format": "parquet"},
            {"filename": "metadata.json", "size": str(1024), "format": "json"}
        ],
        creator_institution="MIT",
        creator_researcher="Dr. Alice Chen",
        data_classification=DataClassification.PUBLIC,
        related_papers=["P12", "P13"],
        license="CC-BY-4.0"
    )

    print(f"Created package: {package.name}")
    print(f"Package ID: {package.package_id}")
    print(f"Size: {package.total_size_gb:.2f} GB")

    # Request access
    request = manager.request_data_access(
        package_id=package.package_id,
        requester_institution="Stanford University",
        requester_researcher="Dr. Bob Smith",
        requester_email="bob@stanford.edu",
        intended_use="Train machine learning models on simulation data"
    )

    print(f"\nSubmitted access request: {request.request_id}")

    # Approve request
    manager.approve_transfer_request(
        request_id=request.request_id,
        approved_by="alice@mit.edu"
    )

    print(f"Approved request")

    # Record citation
    citation = manager.record_citation(
        package_id=package.package_id,
        citing_project="proj_001",
        citing_researcher="Dr. Bob Smith",
        publication_title="Machine Learning for Distributed Consensus",
        publication_venue="ICML",
        publication_year=2024,
        usage_description="Training data for neural network models"
    )

    print(f"\nRecorded citation: {citation.citation_id}")

    # Get usage report
    report = manager.get_package_usage_report(package.package_id)
    print(f"\nUsage Report:")
    print(f"  Downloads: {report['total_downloads']}")
    print(f"  Citations: {report['total_citations']}")
    print(f"  Projects Using: {report['projects_using']}")


if __name__ == "__main__":
    main()

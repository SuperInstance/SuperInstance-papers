"""
Global Research Collaboration Network
====================================

A comprehensive system for managing global research collaborations across the
SuperInstance papers project. Enables researcher discovery, partnership formation,
and collaborative resource sharing.

Core Features:
- Researcher profile management with expertise matching
- Project matchmaking using skill compatibility scoring
- Collaboration history and success tracking
- Multi-institutional partnership support
- Timezone and language-aware coordination
"""

from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional, Tuple
from datetime import datetime
from enum import Enum
import json
from pathlib import Path


class CollaborationStatus(Enum):
    """Status of research collaborations"""
    PROPOSAL = "proposal"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ExpertiseLevel(Enum):
    """Researcher expertise levels"""
    UNDERGRADUATE = "undergraduate"
    GRADUATE_STUDENT = "graduate_student"
    POSTDOCTORAL = "postdoctoral"
    ASSISTANT_PROFESSOR = "assistant_professor"
    ASSOCIATE_PROFESSOR = "associate_professor"
    FULL_PROFESSOR = "full_professor"
    INDUSTRY_RESEARCHER = "industry_researcher"
    INDEPENDENT_RESEARCHER = "independent_researcher"


class ResearchArea(Enum):
    """Research areas aligned with SuperInstance papers"""
    DISTRIBUTED_SYSTEMS = "distributed_systems"
    MATHEMATICS = "mathematics"
    ARTIFICIAL_INTELLIGENCE = "artificial_intelligence"
    PHYSICS = "physics"
    COMPUTER_SCIENCE = "computer_science"
    GAME_THEORY = "game_theory"
    NETWORK_TOPOLOGY = "network_topology"
    NEUROMORPHIC_COMPUTING = "neuromorphic_computing"
    QUANTUM_COMPUTING = "quantum_computing"
    ENERGY_SYSTEMS = "energy_systems"


@dataclass
class ResearchProfile:
    """Complete researcher profile for collaboration matching"""

    # Basic Information
    researcher_id: str
    name: str
    email: str
    institution: str
    department: str
    location: str
    timezone: str
    languages: List[str]

    # Expertise
    expertise_level: ExpertiseLevel
    primary_research_area: ResearchArea
    secondary_areas: List[ResearchArea]
    specific_skills: List[str]  # e.g., ["PyTorch", "CUDA", "Formal Proofs"]

    # Interests
    papers_of_interest: List[str]  # Paper IDs (e.g., ["P2", "P13", "P27"])
    collaboration_interests: List[str]  # Types of collaboration
    availability_hours_per_week: int

    # Publication Record
    publications: List[Dict[str, str]]  # {title, venue, year, citations}
    h_index: Optional[int] = None

    # Collaboration History
    past_collaborations: List[str] = field(default_factory=list)  # collaborator IDs
    collaboration_success_rate: float = 0.0  # 0.0 to 1.0

    # Preferences
    preferred_collaboration_size: int = 3  # ideal team size
    willing_to_lead: bool = True
    willing_to_follow: bool = True
    open_to_cross_cultural: bool = True
    open_to_industry_partnerships: bool = True

    # Availability
    current_collaboration_count: int = 0
    max_concurrent_collaborations: int = 3
    available_for_new_collaborations: bool = True

    # Timestamps
    profile_created: datetime = field(default_factory=datetime.now)
    profile_updated: datetime = field(default_factory=datetime.now)
    last_active: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        """Convert profile to dictionary"""
        return {
            "researcher_id": self.researcher_id,
            "name": self.name,
            "email": self.email,
            "institution": self.institution,
            "department": self.department,
            "location": self.location,
            "timezone": self.timezone,
            "languages": self.languages,
            "expertise_level": self.expertise_level.value,
            "primary_research_area": self.primary_research_area.value,
            "secondary_areas": [area.value for area in self.secondary_areas],
            "specific_skills": self.specific_skills,
            "papers_of_interest": self.papers_of_interest,
            "collaboration_interests": self.collaboration_interests,
            "availability_hours_per_week": self.availability_hours_per_week,
            "publications": self.publications,
            "h_index": self.h_index,
            "past_collaborations": self.past_collaborations,
            "collaboration_success_rate": self.collaboration_success_rate,
            "preferred_collaboration_size": self.preferred_collaboration_size,
            "willing_to_lead": self.willing_to_lead,
            "willing_to_follow": self.willing_to_follow,
            "open_to_cross_cultural": self.open_to_cross_cultural,
            "open_to_industry_partnerships": self.open_to_industry_partnerships,
            "current_collaboration_count": self.current_collaboration_count,
            "max_concurrent_collaborations": self.max_concurrent_collaborations,
            "available_for_new_collaborations": self.available_for_new_collaborations,
            "profile_created": self.profile_created.isoformat(),
            "profile_updated": self.profile_updated.isoformat(),
            "last_active": self.last_active.isoformat()
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'ResearchProfile':
        """Create profile from dictionary"""
        # Handle enum conversions
        data["expertise_level"] = ExpertiseLevel(data["expertise_level"])
        data["primary_research_area"] = ResearchArea(data["primary_research_area"])
        data["secondary_areas"] = [ResearchArea(area) for area in data["secondary_areas"]]

        # Handle datetime conversions
        for dt_field in ["profile_created", "profile_updated", "last_active"]:
            if dt_field in data and isinstance(data[dt_field], str):
                data[dt_field] = datetime.fromisoformat(data[dt_field])

        return cls(**data)


@dataclass
class CollaborationProject:
    """Research collaboration project"""

    project_id: str
    title: str
    description: str

    # Papers Involved
    related_papers: List[str]  # Paper IDs

    # Team
    lead_researcher_id: str
    team_members: List[str]  # Researcher IDs
    institutions: List[str]

    # Status
    status: CollaborationStatus
    start_date: datetime
    expected_end_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None

    # Goals
    research_goals: List[str] = field(default_factory=list)
    deliverables: List[str] = field(default_factory=list)

    # Progress Tracking
    milestones: List[Dict[str, str]] = field(default_factory=list)
    completion_percentage: float = 0.0

    # Resources
    required_resources: List[str] = field(default_factory=list)
    allocated_resources: List[str] = field(default_factory=list)

    # Communication
    meeting_schedule: str = "weekly"  # daily, weekly, biweekly, monthly
    communication_channels: List[str] = field(default_factory=list)

    # IP and Authorship
    ip_agreement: Optional[str] = None
    authorship_agreement: Optional[str] = None

    # Timestamps
    created: datetime = field(default_factory=datetime.now)
    updated: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        """Convert project to dictionary"""
        return {
            "project_id": self.project_id,
            "title": self.title,
            "description": self.description,
            "related_papers": self.related_papers,
            "lead_researcher_id": self.lead_researcher_id,
            "team_members": self.team_members,
            "institutions": self.institutions,
            "status": self.status.value,
            "start_date": self.start_date.isoformat(),
            "expected_end_date": self.expected_end_date.isoformat() if self.expected_end_date else None,
            "actual_end_date": self.actual_end_date.isoformat() if self.actual_end_date else None,
            "research_goals": self.research_goals,
            "deliverables": self.deliverables,
            "milestones": self.milestones,
            "completion_percentage": self.completion_percentage,
            "required_resources": self.required_resources,
            "allocated_resources": self.allocated_resources,
            "meeting_schedule": self.meeting_schedule,
            "communication_channels": self.communication_channels,
            "ip_agreement": self.ip_agreement,
            "authorship_agreement": self.authorship_agreement,
            "created": self.created.isoformat(),
            "updated": self.updated.isoformat()
        }


class ResearchNetwork:
    """
    Global research network managing collaborations across the SuperInstance project.

    Features:
    - Researcher discovery and profiling
    - Project matchmaking
    - Collaboration lifecycle management
    - Success tracking and analytics
    """

    def __init__(self, data_dir: str = "data/collaboration"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.researchers: Dict[str, ResearchProfile] = {}
        self.projects: Dict[str, CollaborationProject] = {}
        self.collaboration_history: List[Dict] = []

        self._load_data()

    def _load_data(self):
        """Load research network data from disk"""
        researchers_file = self.data_dir / "researchers.json"
        projects_file = self.data_dir / "projects.json"
        history_file = self.data_dir / "history.json"

        if researchers_file.exists():
            with open(researchers_file, 'r') as f:
                data = json.load(f)
                self.researchers = {
                    rid: ResearchProfile.from_dict(rdata)
                    for rid, rdata in data.items()
                }

        if projects_file.exists():
            with open(projects_file, 'r') as f:
                data = json.load(f)
                self.projects = {
                    pid: CollaborationProject.from_dict(pdata)
                    for pid, pdata in data.items()
                }

        if history_file.exists():
            with open(history_file, 'r') as f:
                self.collaboration_history = json.load(f)

    def _save_data(self):
        """Save research network data to disk"""
        researchers_file = self.data_dir / "researchers.json"
        projects_file = self.data_dir / "projects.json"
        history_file = self.data_dir / "history.json"

        with open(researchers_file, 'w') as f:
            json.dump(
                {rid: profile.to_dict() for rid, profile in self.researchers.items()},
                f,
                indent=2
            )

        with open(projects_file, 'w') as f:
            json.dump(
                {pid: project.to_dict() for pid, project in self.projects.items()},
                f,
                indent=2
            )

        with open(history_file, 'w') as f:
            json.dump(self.collaboration_history, f, indent=2)

    def register_researcher(self, profile: ResearchProfile) -> str:
        """Register a new researcher in the network"""
        self.researchers[profile.researcher_id] = profile
        profile.profile_created = datetime.now()
        profile.last_active = datetime.now()
        self._save_data()
        return profile.researcher_id

    def get_researcher(self, researcher_id: str) -> Optional[ResearchProfile]:
        """Get researcher profile by ID"""
        return self.researchers.get(researcher_id)

    def update_researcher_activity(self, researcher_id: str):
        """Update researcher's last active timestamp"""
        if researcher_id in self.researchers:
            self.researchers[researcher_id].last_active = datetime.now()
            self._save_data()

    def search_researchers(
        self,
        research_area: Optional[ResearchArea] = None,
        expertise_level: Optional[ExpertiseLevel] = None,
        papers_of_interest: Optional[List[str]] = None,
        language: Optional[str] = None,
        available_only: bool = True,
        min_hours: int = 0
    ) -> List[ResearchProfile]:
        """Search for researchers matching criteria"""
        results = []

        for profile in self.researchers.values():
            # Filter by availability
            if available_only and not profile.available_for_new_collaborations:
                continue

            # Filter by hours
            if profile.availability_hours_per_week < min_hours:
                continue

            # Filter by research area
            if research_area is not None:
                if profile.primary_research_area != research_area:
                    if research_area not in profile.secondary_areas:
                        continue

            # Filter by expertise level
            if expertise_level is not None and profile.expertise_level != expertise_level:
                continue

            # Filter by papers of interest
            if papers_of_interest is not None:
                if not any(paper in profile.papers_of_interest for paper in papers_of_interest):
                    continue

            # Filter by language
            if language is not None and language not in profile.languages:
                continue

            results.append(profile)

        return results

    def calculate_compatibility_score(
        self,
        researcher1: ResearchProfile,
        researcher2: ResearchProfile
    ) -> float:
        """
        Calculate compatibility score between two researchers.

        Score based on:
        - Research area alignment (30%)
        - Skill complementarity (25%)
        - Paper interest overlap (20%)
        - Timezone compatibility (15%)
        - Language overlap (10%)

        Returns: Score from 0.0 to 1.0
        """
        score = 0.0

        # Research area alignment (30%)
        area_score = 0.0
        if researcher1.primary_research_area == researcher2.primary_research_area:
            area_score = 1.0
        elif researcher2.primary_research_area in researcher1.secondary_areas:
            area_score = 0.7
        elif researcher1.primary_research_area in researcher2.secondary_areas:
            area_score = 0.7
        elif any(area in researcher2.secondary_areas for area in researcher1.secondary_areas):
            area_score = 0.4
        score += area_score * 0.30

        # Skill complementarity (25%)
        skills1 = set(researcher1.specific_skills)
        skills2 = set(researcher2.specific_skills)
        overlap = len(skills1 & skills2)
        total = len(skills1 | skills2)
        if total > 0:
            # Balance between overlap (common ground) and uniqueness (complementarity)
            complement_score = (overlap / total) * 0.5 + (1 - overlap / total) * 0.5
            score += complement_score * 0.25

        # Paper interest overlap (20%)
        papers1 = set(researcher1.papers_of_interest)
        papers2 = set(researcher2.papers_of_interest)
        if len(papers1) > 0 and len(papers2) > 0:
            paper_overlap = len(papers1 & papers2) / len(papers1 | papers2)
            score += paper_overlap * 0.20

        # Timezone compatibility (15%)
        # Parse timezone offsets (simplified)
        try:
            tz1_offset = self._parse_timezone(researcher1.timezone)
            tz2_offset = self._parse_timezone(researcher2.timezone)
            hour_diff = abs(tz1_offset - tz2_offset)
            # Prefer timezones within 3 hours
            tz_score = max(0, 1 - hour_diff / 12)
            score += tz_score * 0.15
        except:
            # If timezone parsing fails, assume neutral
            score += 0.5 * 0.15

        # Language overlap (10%)
        lang1 = set(researcher1.languages)
        lang2 = set(researcher2.languages)
        if len(lang1) > 0 and len(lang2) > 0:
            lang_overlap = len(lang1 & lang2) / len(lang1 | lang2)
            score += lang_overlap * 0.10

        return min(1.0, score)

    def _parse_timezone(self, tz_str: str) -> float:
        """Parse timezone string to hour offset (simplified)"""
        # This is a simplified version - production should use proper timezone libraries
        try:
            if "UTC" in tz_str or "GMT" in tz_str:
                if "+" in tz_str:
                    hours = float(tz_str.split("+")[1][:2])
                    return hours
                elif "-" in tz_str:
                    hours = float(tz_str.split("-")[1][:2])
                    return -hours
                else:
                    return 0.0
            # Add more timezone parsing as needed
            return 0.0
        except:
            return 0.0

    def find_collaborators(
        self,
        researcher: ResearchProfile,
        max_results: int = 10,
        min_score: float = 0.3
    ) -> List[Tuple[ResearchProfile, float]]:
        """
        Find potential collaborators for a researcher.

        Returns: List of (researcher_profile, compatibility_score) tuples
        """
        candidates = []

        for candidate in self.researchers.values():
            # Skip self
            if candidate.researcher_id == researcher.researcher_id:
                continue

            # Skip if not available
            if not candidate.available_for_new_collaborations:
                continue

            # Calculate compatibility
            score = self.calculate_compatibility_score(researcher, candidate)

            if score >= min_score:
                candidates.append((candidate, score))

        # Sort by score descending
        candidates.sort(key=lambda x: x[1], reverse=True)

        return candidates[:max_results]

    def create_collaboration_project(
        self,
        title: str,
        description: str,
        lead_researcher_id: str,
        team_members: List[str],
        related_papers: List[str],
        research_goals: List[str],
        expected_end_date: Optional[datetime] = None
    ) -> CollaborationProject:
        """Create a new collaboration project"""
        project_id = f"proj_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Verify lead researcher exists
        if lead_researcher_id not in self.researchers:
            raise ValueError(f"Lead researcher {lead_researcher_id} not found")

        # Get institutions
        institutions = []
        for member_id in [lead_researcher_id] + team_members:
            if member_id in self.researchers:
                inst = self.researchers[member_id].institution
                if inst not in institutions:
                    institutions.append(inst)

        project = CollaborationProject(
            project_id=project_id,
            title=title,
            description=description,
            related_papers=related_papers,
            lead_researcher_id=lead_researcher_id,
            team_members=team_members,
            institutions=institutions,
            status=CollaborationStatus.PROPOSAL,
            start_date=datetime.now(),
            expected_end_date=expected_end_date,
            research_goals=research_goals,
            deliverables=[]
        )

        self.projects[project_id] = project

        # Update collaboration counts
        for member_id in [lead_researcher_id] + team_members:
            if member_id in self.researchers:
                self.researchers[member_id].current_collaboration_count += 1

        self._save_data()
        return project

    def get_project(self, project_id: str) -> Optional[CollaborationProject]:
        """Get project by ID"""
        return self.projects.get(project_id)

    def update_project_status(
        self,
        project_id: str,
        status: CollaborationStatus,
        completion_percentage: Optional[float] = None
    ):
        """Update project status"""
        if project_id in self.projects:
            self.projects[project_id].status = status
            self.projects[project_id].updated = datetime.now()

            if completion_percentage is not None:
                self.projects[project_id].completion_percentage = completion_percentage

            if status == CollaborationStatus.COMPLETED:
                self.projects[project_id].actual_end_date = datetime.now()

                # Update collaboration counts
                for member_id in (self.projects[project_id].team_members +
                                 [self.projects[project_id].lead_researcher_id]):
                    if member_id in self.researchers:
                        self.researchers[member_id].current_collaboration_count -= 1

            self._save_data()

    def get_network_statistics(self) -> Dict:
        """Get statistics about the research network"""
        active_projects = [
            p for p in self.projects.values()
            if p.status == CollaborationStatus.ACTIVE
        ]

        completed_projects = [
            p for p in self.projects.values()
            if p.status == CollaborationStatus.COMPLETED
        ]

        # Calculate average collaboration success rate
        success_rates = [
            r.collaboration_success_rate
            for r in self.researchers.values()
            if r.collaboration_success_rate > 0
        ]
        avg_success_rate = sum(success_rates) / len(success_rates) if success_rates else 0.0

        # Count institutions
        institutions = set()
        for researcher in self.researchers.values():
            institutions.add(researcher.institution)

        # Count countries
        countries = set()
        for researcher in self.researchers.values():
            # Extract country from location (simplified)
            parts = researcher.location.split(",")
            if parts:
                countries.add(parts[-1].strip())

        return {
            "total_researchers": len(self.researchers),
            "total_projects": len(self.projects),
            "active_projects": len(active_projects),
            "completed_projects": len(completed_projects),
            "total_institutions": len(institutions),
            "total_countries": len(countries),
            "average_collaboration_success_rate": avg_success_rate,
            "researchers_available_for_collaboration": sum(
                1 for r in self.researchers.values()
                if r.available_for_new_collaborations
            )
        }


def main():
    """Example usage of the Research Network"""
    # Initialize network
    network = ResearchNetwork()

    # Create sample researchers
    researcher1 = ResearchProfile(
        researcher_id="r001",
        name="Dr. Alice Chen",
        email="alice.chen@university.edu",
        institution="MIT",
        department="Computer Science",
        location="Cambridge, MA, USA",
        timezone="UTC-5",
        languages=["English", "Mandarin"],
        expertise_level=ExpertiseLevel.ASSISTANT_PROFESSOR,
        primary_research_area=ResearchArea.DISTRIBUTED_SYSTEMS,
        secondary_areas=[ResearchArea.COMPUTER_SCIENCE, ResearchArea.NETWORK_TOPOLOGY],
        specific_skills=["Python", "Kubernetes", "Consensus Algorithms"],
        papers_of_interest=["P2", "P12", "P13"],
        collaboration_interests=["Joint Research", "Grant Writing", "Paper Co-authorship"],
        availability_hours_per_week=15,
        publications=[
            {"title": "Distributed Consensus in Edge Networks", "venue": "PODC", "year": "2023", "citations": "45"}
        ],
        h_index=12
    )

    researcher2 = ResearchProfile(
        researcher_id="r002",
        name="Dr. Bob Mueller",
        email="bob.mueller@tech.de",
        institution="Technical University of Munich",
        department="Mathematics",
        location="Munich, Germany",
        timezone="UTC+1",
        languages=["German", "English", "French"],
        expertise_level=ExpertiseLevel.ASSOCIATE_PROFESSOR,
        primary_research_area=ResearchArea.MATHEMATICS,
        secondary_areas=[ResearchArea.PHYSICS, ResearchArea.QUANTUM_COMPUTING],
        specific_skills=["Formal Proofs", "Coq", "Tensor Calculus"],
        papers_of_interest=["P2", "P4", "P9"],
        collaboration_interests=["Joint Research", "Student Exchange"],
        availability_hours_per_week=10,
        publications=[
            {"title": "Geometric Tensors in Higher Dimensions", "venue": "Annals of Mathematics", "year": "2022", "citations": "78"}
        ],
        h_index=23
    )

    # Register researchers
    network.register_researcher(researcher1)
    network.register_researcher(researcher2)

    # Find collaborators for researcher1
    collaborators = network.find_collaborators(researcher1)

    print(f"Found {len(collaborators)} potential collaborators")
    for collaborator, score in collaborators:
        print(f"  {collaborator.name} ({collaborator.institution}): {score:.2f}")

    # Create a collaboration project
    project = network.create_collaboration_project(
        title="Cross-Cultural Distributed Systems Research",
        description="Joint research on distributed consensus across cultural contexts",
        lead_researcher_id="r001",
        team_members=["r002"],
        related_papers=["P12", "P13"],
        research_goals=[
            "Analyze cultural factors in distributed system adoption",
            "Develop culturally-aware consensus algorithms",
            "Publish joint paper in top-tier venue"
        ],
        expected_end_date=datetime(2025, 12, 31)
    )

    print(f"\nCreated project: {project.title}")
    print(f"Project ID: {project.project_id}")
    print(f"Team: {project.institutions}")

    # Get network statistics
    stats = network.get_network_statistics()
    print(f"\nNetwork Statistics:")
    print(f"  Total Researchers: {stats['total_researchers']}")
    print(f"  Total Projects: {stats['total_projects']}")
    print(f"  Institutions: {stats['total_institutions']}")
    print(f"  Countries: {stats['total_countries']}")


if __name__ == "__main__":
    main()

"""
Project Matchmaking System
==========================

Advanced matchmaking algorithm for connecting researchers with complementary
skills, interests, and availability for collaborative research projects.

Features:
- Skill-based compatibility scoring
- Interest and expertise matching
- Availability synchronization
- Past collaboration success tracking
- Cross-cultural and multi-institutional support
"""

from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import json
from pathlib import Path

from research_network import (
    ResearchProfile,
    CollaborationProject,
    ResearchArea,
    ExpertiseLevel
)


class MatchType(Enum):
    """Types of collaboration matches"""
    SKILL_COMPLEMENTARY = "skill_complementary"  # Different skills, same goal
    EXPERTISE_ALIGNMENT = "expertise_alignment"  # Similar expertise, joint effort
    CROSS_DISCIPLINARY = "cross_disciplinary"  # Different fields, novel insights
    MENTORSHIP = "mentorship"  # Senior + junior researchers
    PEER_COLLABORATION = "peer_collaboration"  # Similar level, shared interest


class ProjectRequirement(Enum):
    """Types of project requirements"""
    PROGRAMMING = "programming"
    MATHEMATICAL_PROOFS = "mathematical_proofs"
    SIMULATION_EXPERIENCE = "simulation_experience"
    DOMAIN_EXPERTISE = "domain_expertise"
    WRITING_EDITING = "writing_editing"
    DATA_ANALYSIS = "data_analysis"
    VISUALIZATION = "visualization"
    EXPERIMENTAL_DESIGN = "experimental_design"
    HARDWARE_ACCESS = "hardware_access"
    INDUSTRY_EXPERIENCE = "industry_experience"


@dataclass
class ProjectProposal:
    """Proposal for a research collaboration project"""
    proposal_id: str
    title: str
    description: str

    # Lead proposer
    proposer_id: str

    # Requirements
    required_skills: List[str]
    required_expertise: List[ResearchArea]
    required_expertise_level: Optional[ExpertiseLevel] = None

    # Team preferences
    ideal_team_size: int = 3
    preferred_institutions: Optional[List[str]] = None
    preferred_countries: Optional[List[str]] = None

    # Timeline
    expected_duration_months: int = 12
    hours_per_week_required: int = 10
    start_date: Optional[datetime] = None

    # Papers and topics
    related_papers: List[str] = None
    research_description: str = ""

    # Match preferences
    open_to_cross_cultural: bool = True
    open_to_industry_partnerships: bool = True
    open_to_mentorship: bool = True

    # Status
    seeking_collaborators: bool = True
    created: datetime = None

    def __post_init__(self):
        if self.related_papers is None:
            self.related_papers = []
        if self.created is None:
            self.created = datetime.now()


@dataclass
class CollaborationMatch:
    """Result of matching researchers to projects"""
    researcher_id: str
    project_id: str

    # Scoring
    overall_score: float  # 0.0 to 1.0
    skill_match_score: float
    expertise_match_score: float
    availability_match_score: float
    interest_alignment_score: float
    cultural_compatibility_score: float

    # Match type
    match_type: MatchType

    # Details
    complementary_skills: List[str]
    shared_interests: List[str]
    potential_conflicts: List[str]

    # Recommendations
    collaboration_role: str  # "lead", "co-lead", "contributor", "reviewer"
    fit_summary: str

    # Timestamp
    generated: datetime = None

    def __post_init__(self):
        if self.generated is None:
            self.generated = datetime.now()


class MatchmakingEngine:
    """
    Advanced matchmaking engine for research collaborations.

    Uses multi-factor scoring to find optimal researcher-project matches.
    """

    def __init__(self):
        self.match_history: List[CollaborationMatch] = []
        self.success_tracking: Dict[str, float] = {}  # Track success of matches

    def score_skill_compatibility(
        self,
        researcher_skills: List[str],
        required_skills: List[str],
        project_type: str = "general"
    ) -> Tuple[float, List[str], List[str]]:
        """
        Score how well researcher skills match project requirements.

        Returns: (score, complementary_skills, missing_skills)
        """
        researcher_skill_set = set(skill.lower() for skill in researcher_skills)
        required_skill_set = set(skill.lower() for skill in required_skills)

        # Direct skill matches
        matched_skills = researcher_skill_set & required_skill_set

        # Look for complementary skills (related but not exact match)
        complementary = []
        skill_categories = {
            "programming": ["python", "java", "c++", "javascript", "rust", "go"],
            "machine learning": ["pytorch", "tensorflow", "keras", "scikit-learn"],
            "distributed systems": ["kubernetes", "docker", "consensus", "paxos", "raft"],
            "mathematics": ["calculus", "linear algebra", "probability", "statistics"],
            "visualization": ["matplotlib", "d3.js", "plotly", "tableau"],
            "data analysis": ["pandas", "numpy", "sql", "spark"]
        }

        for req_skill in required_skill_set:
            if req_skill not in matched_skills:
                # Check for complementary skills in same category
                for category, skills in skill_categories.items():
                    if req_skill in skills:
                        for researcher_skill in researcher_skill_set:
                            if researcher_skill in skills:
                                complementary.append(f"{researcher_skill} (complementary to {req_skill})")

        # Missing skills
        missing = list(required_skill_set - matched_skills)

        # Calculate score
        if len(required_skills) == 0:
            score = 0.5  # Neutral if no requirements specified
        else:
            # Weight direct matches higher than complementary
            direct_score = len(matched_skills) / len(required_skill_set) if required_skill_set else 0
            complementary_score = len(complementary) / len(required_skill_set) * 0.5 if required_skill_set else 0
            score = direct_score * 0.7 + complementary_score * 0.3

        return (min(1.0, score), complementary, missing)

    def score_expertise_alignment(
        self,
        researcher_area: ResearchArea,
        researcher_secondary: List[ResearchArea],
        required_areas: List[ResearchArea],
        researcher_level: ExpertiseLevel,
        required_level: Optional[ExpertiseLevel] = None
    ) -> float:
        """
        Score expertise alignment between researcher and project.
        """
        # Primary area match
        if researcher_area in required_areas:
            area_score = 1.0
        elif any(area in researcher_secondary for area in required_areas):
            area_score = 0.7
        else:
            # Check for related areas
            related_pairs = [
                (ResearchArea.DISTRIBUTED_SYSTEMS, ResearchArea.NETWORK_TOPOLOGY),
                (ResearchArea.MATHEMATICS, ResearchArea.PHYSICS),
                (ResearchArea.ARTIFICIAL_INTELLIGENCE, ResearchArea.NEUROMORPHIC_COMPUTING),
                (ResearchArea.COMPUTER_SCIENCE, ResearchArea.DISTRIBUTED_SYSTEMS),
            ]
            area_score = 0.0
            for req_area in required_areas:
                for pair in related_pairs:
                    if researcher_area in pair and req_area in pair:
                        area_score = 0.4
                        break

        # Expertise level match
        level_score = 1.0
        if required_level is not None:
            if researcher_level == required_level:
                level_score = 1.0
            elif self._level_compare(researcher_level, required_level) > 0:
                # Researcher is more senior than required
                level_score = 0.9
            else:
                # Researcher is more junior than required
                level_score = 0.6

        return (area_score * 0.6 + level_score * 0.4)

    def _level_compare(self, level1: ExpertiseLevel, level2: ExpertiseLevel) -> int:
        """Compare expertise levels (returns -1, 0, or 1)"""
        levels_order = [
            ExpertiseLevel.UNDERGRADUATE,
            ExpertiseLevel.GRADUATE_STUDENT,
            ExpertiseLevel.POSTDOCTORAL,
            ExpertiseLevel.ASSISTANT_PROFESSOR,
            ExpertiseLevel.ASSOCIATE_PROFESSOR,
            ExpertiseLevel.FULL_PROFESSOR
        ]

        try:
            idx1 = levels_order.index(level1)
            idx2 = levels_order.index(level2)
            if idx1 < idx2:
                return -1
            elif idx1 > idx2:
                return 1
            else:
                return 0
        except ValueError:
            return 0

    def score_availability_match(
        self,
        researcher_hours: int,
        required_hours: int,
        researcher_current_collabs: int,
        researcher_max_collabs: int
    ) -> float:
        """
        Score availability match.
        """
        # Hours availability
        if researcher_hours >= required_hours:
            hours_score = 1.0
        elif researcher_hours >= required_hours * 0.7:
            hours_score = 0.7
        else:
            hours_score = 0.3

        # Collaboration capacity
        capacity_ratio = researcher_current_collabs / researcher_max_collabs
        if capacity_ratio < 0.5:
            capacity_score = 1.0
        elif capacity_ratio < 0.8:
            capacity_score = 0.6
        else:
            capacity_score = 0.2

        return (hours_score * 0.6 + capacity_score * 0.4)

    def score_interest_alignment(
        self,
        researcher_papers: List[str],
        project_papers: List[str],
        researcher_interests: List[str],
        project_description: str
    ) -> Tuple[float, List[str]]:
        """
        Score alignment of research interests.

        Returns: (score, shared_interests)
        """
        # Paper overlap
        paper_set = set(researcher_papers)
        project_paper_set = set(project_papers)

        if len(project_paper_set) > 0:
            paper_overlap = len(paper_set & project_paper_set) / len(project_paper_set)
        else:
            paper_overlap = 0.0

        # Interest keyword matching (simplified)
        shared_interests = []
        keywords = self._extract_keywords(project_description)

        for interest in researcher_interests:
            interest_lower = interest.lower()
            for keyword in keywords:
                if keyword.lower() in interest_lower or interest_lower in keyword.lower():
                    if interest not in shared_interests:
                        shared_interests.append(interest)

        if len(keywords) > 0:
            interest_score = len(shared_interests) / len(keywords)
        else:
            interest_score = 0.0

        # Combined score
        score = paper_overlap * 0.6 + min(1.0, interest_score) * 0.4

        return (score, shared_interests)

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract research keywords from text"""
        # This is a simplified version - production would use NLP
        common_terms = [
            "distributed", "consensus", "machine learning", "optimization",
            "neural", "quantum", "game theory", "simulation", "network",
            "algorithm", "protocol", "security", "privacy", "scalability",
            "performance", "energy", "hardware", "software"
        ]

        found = []
        text_lower = text.lower()
        for term in common_terms:
            if term in text_lower:
                found.append(term)

        return found

    def score_cultural_compatibility(
        self,
        researcher1: ResearchProfile,
        researcher2: ResearchProfile
    ) -> float:
        """
        Score cultural and institutional compatibility.
        """
        score = 0.0

        # Language overlap (40%)
        lang1 = set(lang.lower() for lang in researcher1.languages)
        lang2 = set(lang.lower() for lang in researcher2.languages)
        if len(lang1) > 0 and len(lang2) > 0:
            lang_overlap = len(lang1 & lang2) / len(lang1 | lang2)
            score += lang_overlap * 0.4

        # Institution diversity (30%) - prefer cross-institutional but not too distant
        if researcher1.institution == researcher2.institution:
            # Same institution - good for coordination
            score += 0.25 * 0.3
        else:
            # Different institution - good for diversity
            score += 0.30 * 0.3

        # Timezone compatibility (30%)
        try:
            tz1 = self._parse_timezone_offset(researcher1.timezone)
            tz2 = self._parse_timezone_offset(researcher2.timezone)
            hour_diff = abs(tz1 - tz2)
            # Prefer timezones within 3 hours
            tz_score = max(0, 1 - hour_diff / 12)
            score += tz_score * 0.3
        except:
            # Neutral if timezone parsing fails
            score += 0.5 * 0.3

        return min(1.0, score)

    def _parse_timezone_offset(self, tz_str: str) -> float:
        """Parse timezone offset in hours"""
        try:
            if "UTC" in tz_str or "GMT" in tz_str:
                if "+" in tz_str:
                    return float(tz_str.split("+")[1][:2])
                elif "-" in tz_str:
                    return -float(tz_str.split("-")[1][:2])
                return 0.0
            return 0.0
        except:
            return 0.0

    def determine_match_type(
        self,
        skill_score: float,
        expertise_score: float,
        researcher_level: ExpertiseLevel,
        proposer_level: ExpertiseLevel
    ) -> MatchType:
        """Determine the type of collaboration match"""
        level_diff = self._level_compare(researcher_level, proposer_level)

        if abs(level_diff) >= 2:
            return MatchType.MENTORSHIP
        elif skill_score > 0.7 and expertise_score > 0.7:
            return MatchType.EXPERTISE_ALIGNMENT
        elif skill_score < 0.4 or expertise_score < 0.4:
            return MatchType.CROSS_DISCIPLINARY
        else:
            return MatchType.PEER_COLLABORATION

    def generate_fit_summary(
        self,
        match: CollaborationMatch,
        researcher: ResearchProfile,
        proposal: ProjectProposal
    ) -> str:
        """Generate human-readable fit summary"""
        summary_parts = []

        # Overall assessment
        if match.overall_score > 0.8:
            summary_parts.append("Excellent fit")
        elif match.overall_score > 0.6:
            summary_parts.append("Good fit")
        elif match.overall_score > 0.4:
            summary_parts.append("Moderate fit")
        else:
            summary_parts.append("Potential fit with considerations")

        # Key strengths
        if match.skill_match_score > 0.7:
            summary_parts.append(f"Strong skills alignment")
        if match.expertise_match_score > 0.7:
            summary_parts.append(f"Relevant expertise in {researcher.primary_research_area.value}")
        if match.interest_alignment_score > 0.6:
            summary_parts.append(f"Shared interest in {len(match.shared_interests)} areas")

        # Potential concerns
        if match.availability_match_score < 0.5:
            summary_parts.append("Limited availability may be a constraint")
        if len(match.potential_conflicts) > 0:
            summary_parts.append(f"Some skill gaps to address")

        # Collaboration role
        summary_parts.append(f"Recommended role: {match.collaboration_role}")

        return ". ".join(summary_parts) + "."

    def determine_collaboration_role(
        self,
        researcher: ResearchProfile,
        proposer_id: str,
        match_type: MatchType,
        skill_score: float,
        expertise_score: float
    ) -> str:
        """Determine recommended collaboration role"""
        if match_type == MatchType.MENTORSHIP:
            if self._level_compare(
                researcher.expertise_level,
                ExpertiseLevel.POSTDOCTORAL
            ) >= 0:
                return "mentor"
            else:
                return "mentee"
        elif skill_score > 0.8 and expertise_score > 0.8:
            return "co-lead"
        elif skill_score > 0.6:
            return "contributor"
        else:
            return "reviewer"

    def find_matches(
        self,
        proposal: ProjectProposal,
        researchers: Dict[str, ResearchProfile],
        max_results: int = 20,
        min_score: float = 0.3
    ) -> List[CollaborationMatch]:
        """
        Find matching researchers for a project proposal.

        Args:
            proposal: Project proposal requiring collaborators
            researchers: Dictionary of all registered researchers
            max_results: Maximum number of matches to return
            min_score: Minimum overall score to consider

        Returns:
            List of CollaborationMatch objects, sorted by overall score
        """
        matches = []

        for researcher_id, researcher in researchers.items():
            # Skip proposer
            if researcher_id == proposal.proposer_id:
                continue

            # Skip if not available
            if not researcher.available_for_new_collaborations:
                continue

            # Check preferences
            if not proposal.open_to_cross_cultural and not researcher.open_to_cross_cultural:
                continue

            if not proposal.open_to_industry_partnerships:
                if "university" not in researcher.institution.lower():
                    continue

            # Calculate component scores
            skill_score, complementary_skills, missing_skills = self.score_skill_compatibility(
                researcher.specific_skills,
                proposal.required_skills
            )

            expertise_score = self.score_expertise_alignment(
                researcher.primary_research_area,
                researcher.secondary_areas,
                proposal.required_expertise,
                researcher.expertise_level,
                proposal.required_expertise_level
            )

            availability_score = self.score_availability_match(
                researcher.availability_hours_per_week,
                proposal.hours_per_week_required,
                researcher.current_collaboration_count,
                researcher.max_concurrent_collaborations
            )

            interest_score, shared_interests = self.score_interest_alignment(
                researcher.papers_of_interest,
                proposal.related_papers,
                researcher.collaboration_interests,
                proposal.research_description
            )

            # Get proposer profile for cultural compatibility
            proposer = researchers.get(proposal.proposer_id)
            cultural_score = 0.5  # Default
            if proposer:
                cultural_score = self.score_cultural_compatibility(researcher, proposer)

            # Calculate overall score (weighted average)
            weights = {
                "skill": 0.25,
                "expertise": 0.25,
                "availability": 0.20,
                "interest": 0.20,
                "cultural": 0.10
            }

            overall_score = (
                skill_score * weights["skill"] +
                expertise_score * weights["expertise"] +
                availability_score * weights["availability"] +
                interest_score * weights["interest"] +
                cultural_score * weights["cultural"]
            )

            # Filter by minimum score
            if overall_score < min_score:
                continue

            # Determine match type
            proposer_level = proposer.expertise_level if proposer else ExpertiseLevel.GRADUATE_STUDENT
            match_type = self.determine_match_type(
                skill_score,
                expertise_score,
                researcher.expertise_level,
                proposer_level
            )

            # Determine collaboration role
            collaboration_role = self.determine_collaboration_role(
                researcher,
                proposal.proposer_id,
                match_type,
                skill_score,
                expertise_score
            )

            # Identify potential conflicts
            potential_conflicts = []
            if availability_score < 0.5:
                potential_conflicts.append("Limited availability")
            if len(missing_skills) > 0:
                potential_conflicts.append(f"Missing skills: {', '.join(missing_skills[:3])}")

            # Generate fit summary
            match = CollaborationMatch(
                researcher_id=researcher_id,
                project_id=proposal.proposal_id,
                overall_score=overall_score,
                skill_match_score=skill_score,
                expertise_match_score=expertise_score,
                availability_match_score=availability_score,
                interest_alignment_score=interest_score,
                cultural_compatibility_score=cultural_score,
                match_type=match_type,
                complementary_skills=complementary_skills,
                shared_interests=shared_interests,
                potential_conflicts=potential_conflicts,
                collaboration_role=collaboration_role,
                fit_summary=""  # Will be generated after all data is available
            )

            # Get researcher profile for summary generation
            match.fit_summary = self.generate_fit_summary(match, researcher, proposal)

            matches.append(match)

        # Sort by overall score descending
        matches.sort(key=lambda m: m.overall_score, reverse=True)

        return matches[:max_results]

    def save_matches(self, matches: List[CollaborationMatch], filepath: str):
        """Save matches to file"""
        data = [
            {
                "researcher_id": m.researcher_id,
                "project_id": m.project_id,
                "overall_score": m.overall_score,
                "match_type": m.match_type.value,
                "collaboration_role": m.collaboration_role,
                "fit_summary": m.fit_summary,
                "complementary_skills": m.complementary_skills,
                "shared_interests": m.shared_interests,
                "potential_conflicts": m.potential_conflicts,
                "generated": m.generated.isoformat()
            }
            for m in matches
        ]

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)


def main():
    """Example usage of matchmaking system"""
    # Create sample researchers
    researchers = {
        "r001": ResearchProfile(
            researcher_id="r001",
            name="Dr. Alice Chen",
            email="alice@university.edu",
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
            collaboration_interests=["Joint Research", "Grant Writing"],
            availability_hours_per_week=15,
            publications=[]
        ),
        "r002": ResearchProfile(
            researcher_id="r002",
            name="Dr. Bob Mueller",
            email="bob@tech.de",
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
            publications=[]
        )
    }

    # Create sample project proposal
    proposal = ProjectProposal(
        proposal_id="prop001",
        title="Distributed Consensus for Edge Computing",
        description="Developing novel consensus algorithms for edge computing environments with focus on energy efficiency and scalability.",
        proposer_id="r001",
        required_skills=["Python", "Consensus Algorithms", "Network Protocols"],
        required_expertise=[ResearchArea.DISTRIBUTED_SYSTEMS, ResearchArea.COMPUTER_SCIENCE],
        ideal_team_size=4,
        expected_duration_months=12,
        hours_per_week_required=10,
        related_papers=["P2", "P12", "P13"],
        research_description="distributed consensus edge computing energy efficiency scalability"
    )

    # Find matches
    engine = MatchmakingEngine()
    matches = engine.find_matches(proposal, researchers)

    print(f"Found {len(matches)} matches for project: {proposal.title}\n")

    for i, match in enumerate(matches, 1):
        researcher = researchers[match.researcher_id]
        print(f"{i}. {researcher.name} ({researcher.institution})")
        print(f"   Overall Score: {match.overall_score:.2f}")
        print(f"   Match Type: {match.match_type.value}")
        print(f"   Role: {match.collaboration_role}")
        print(f"   {match.fit_summary}")
        if match.complementary_skills:
            print(f"   Complementary Skills: {', '.join(match.complementary_skills)}")
        if match.shared_interests:
            print(f"   Shared Interests: {', '.join(match.shared_interests)}")
        if match.potential_conflicts:
            print(f"   Considerations: {', '.join(match.potential_conflicts)}")
        print()


if __name__ == "__main__":
    main()

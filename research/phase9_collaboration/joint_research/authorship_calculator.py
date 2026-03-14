"""
Fair Authorship Calculator
==========================

Calculates fair authorship order and contribution attribution for collaborative
research projects based on objective contribution metrics.

Features:
- Multi-dimensional contribution tracking
- Fair authorship order calculation
- Contribution percentage attribution
- CRediT taxonomy support
- Conflict resolution framework
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from enum import Enum
import json


class ContributionType(Enum):
    """Types of contributions to research"""
    IDEA_CONCEPTION = "idea_conception"
    METHODOLOGY_DESIGN = "methodology_design"
    IMPLEMENTATION = "implementation"
    DATA_COLLECTION = "data_collection"
    DATA_ANALYSIS = "data_analysis"
    VISUALIZATION = "visualization"
    WRITING_DRAFT = "writing_draft"
    WRITING_REVISION = "writing_revision"
    EDITING_REVIEW = "editing_review"
    FUNDING_ACQUISITION = "funding_acquisition"
    PROJECT_LEADERSHIP = "project_leadership"
    SUPERVISION = "supervision"
    RESOURCE_PROVISION = "resource_provision"


class AuthorRole(Enum):
    """Standard author roles"""
    FIRST_AUTHOR = "first_author"
    CO_FIRST_AUTHOR = "co_first_author"
    MIDDLE_AUTHOR = "middle_author"
    SENIOR_AUTHOR = "senior_author"
    CORRESPONDING_AUTHOR = "corresponding_author"


@dataclass
class Contribution:
    """Individual contribution record"""
    contribution_id: str
    contributor_id: str
    contributor_name: str
    contribution_type: ContributionType
    description: str
    hours_spent: float = 0.0
    impact_weight: float = 1.0  # Subjective importance multiplier

    # Paper/section specific
    paper_sections: List[str] = field(default_factory=list)  # ["introduction", "methods"]
    related_papers: List[str] = field(default_factory=list)

    # Verification
    verified_by: Optional[str] = None  # Another contributor who verified
    verification_notes: str = ""

    # Timestamps
    created: datetime = field(default_factory=datetime.now)


@dataclass
class AuthorshipAttribution:
    """Calculated authorship for a contributor"""
    contributor_id: str
    contributor_name: str

    # Contribution scores
    total_contribution_score: float = 0.0
    contribution_breakdown: Dict[str, float] = field(default_factory=dict)  # {type: score}

    # Percentages
    overall_percentage: float = 0.0
    idea_percentage: float = 0.0  # Conception + Methodology
    execution_percentage: float = 0.0  # Implementation + Data + Analysis
    communication_percentage: float = 0.0  # Writing + Editing

    # Role determination
    suggested_role: Optional[AuthorRole] = None
    authorship_position: int = 0  # 1 = first author

    # Corresponding author
    is_corresponding_author: bool = False

    # Equal contributions
    equal_contribution_with: Optional[str] = None  # contributor_id


class AuthorshipCalculator:
    """
    Calculates fair authorship based on contributions.

    Uses weighted contribution model aligned with academic standards:
    - Idea & Methodology: 25%
    - Implementation & Execution: 35%
    - Writing & Communication: 25%
    - Leadership & Resources: 15%

    Based on CRediT (Contributor Roles Taxonomy) guidelines.
    """

    # Default weights for contribution types (sum to 1.0)
    DEFAULT_WEIGHTS = {
        ContributionType.IDEA_CONCEPTION: 0.15,
        ContributionType.METHODOLOGY_DESIGN: 0.10,
        ContributionType.IMPLEMENTATION: 0.20,
        ContributionType.DATA_COLLECTION: 0.08,
        ContributionType.DATA_ANALYSIS: 0.07,
        ContributionType.VISUALIZATION: 0.05,
        ContributionType.WRITING_DRAFT: 0.10,
        ContributionType.WRITING_REVISION: 0.05,
        ContributionType.EDITING_REVIEW: 0.05,
        ContributionType.FUNDING_ACQUISITION: 0.05,
        ContributionType.PROJECT_LEADERSHIP: 0.07,
        ContributionType.SUPERVISION: 0.02,
        ContributionType.RESOURCE_PROVISION: 0.01
    }

    def __init__(self, custom_weights: Optional[Dict[ContributionType, float]] = None):
        """
        Initialize calculator with optional custom weights.

        Args:
            custom_weights: Dictionary mapping contribution types to weights
        """
        self.weights = custom_weights if custom_weights else self.DEFAULT_WEIGHTS
        self.contributions: List[Contribution] = []

        # Verify weights sum to 1.0
        total_weight = sum(self.weights.values())
        if abs(total_weight - 1.0) > 0.01:
            raise ValueError(f"Weights must sum to 1.0, got {total_weight}")

    def add_contribution(
        self,
        contributor_id: str,
        contributor_name: str,
        contribution_type: ContributionType,
        description: str,
        hours_spent: float = 0.0,
        impact_weight: float = 1.0,
        paper_sections: Optional[List[str]] = None,
        related_papers: Optional[List[str]] = None
    ) -> Contribution:
        """Add a contribution record"""
        contribution_id = f"contrib_{datetime.now().strftime('%Y%m%d%H%M%S')}_{len(self.contributions)}"

        contribution = Contribution(
            contribution_id=contribution_id,
            contributor_id=contributor_id,
            contributor_name=contributor_name,
            contribution_type=contribution_type,
            description=description,
            hours_spent=hours_spent,
            impact_weight=impact_weight,
            paper_sections=paper_sections or [],
            related_papers=related_papers or []
        )

        self.contributions.append(contribution)
        return contribution

    def calculate_contributor_score(
        self,
        contributor_id: str,
        contributions: Optional[List[Contribution]] = None
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculate total contribution score for a contributor.

        Returns: (total_score, breakdown_by_type)
        """
        if contributions is None:
            contributions = self.contributions

        # Filter contributions by contributor
        contributor_contributions = [
            c for c in contributions
            if c.contributor_id == contributor_id
        ]

        if not contributor_contributions:
            return (0.0, {})

        # Calculate weighted score by contribution type
        breakdown = {}
        total_score = 0.0

        for contrib_type in ContributionType:
            weight = self.weights.get(contrib_type, 0.0)

            # Find contributions of this type
            type_contributions = [
                c for c in contributor_contributions
                if c.contribution_type == contrib_type
            ]

            if not type_contributions:
                continue

            # Calculate score for this type
            # Base score = hours * impact_weight
            type_score = sum(c.hours_spent * c.impact_weight for c in type_contributions)

            # Apply type weight
            weighted_score = type_score * weight

            breakdown[contrib_type.value] = weighted_score
            total_score += weighted_score

        return (total_score, breakdown)

    def calculate_all_contributions(
        self,
        contributions: Optional[List[Contribution]] = None
    ) -> Dict[str, AuthorshipAttribution]:
        """
        Calculate authorship attribution for all contributors.

        Returns: Dictionary mapping contributor_id to AuthorshipAttribution
        """
        if contributions is None:
            contributions = self.contributions

        # Get unique contributors
        contributor_ids = set(c.contributor_id for c in contributions)
        contributor_names = {
            c.contributor_id: c.contributor_name
            for c in contributions
        }

        # Calculate scores for all contributors
        scores = {}
        for contributor_id in contributor_ids:
            score, breakdown = self.calculate_contributor_score(contributor_id, contributions)
            scores[contributor_id] = (score, breakdown)

        # Calculate total score across all contributors
        total_score = sum(score for score, _ in scores.values())

        if total_score == 0:
            # No contributions recorded
            return {}

        # Calculate percentages and create attributions
        attributions = {}
        for contributor_id in contributor_ids:
            score, breakdown = scores[contributor_id]

            # Calculate category percentages
            idea_pct = (
                breakdown.get(ContributionType.IDEA_CONCEPTION.value, 0) +
                breakdown.get(ContributionType.METHODOLOGY_DESIGN.value, 0)
            ) / score if score > 0 else 0

            execution_pct = (
                breakdown.get(ContributionType.IMPLEMENTATION.value, 0) +
                breakdown.get(ContributionType.DATA_COLLECTION.value, 0) +
                breakdown.get(ContributionType.DATA_ANALYSIS.value, 0) +
                breakdown.get(ContributionType.VISUALIZATION.value, 0)
            ) / score if score > 0 else 0

            communication_pct = (
                breakdown.get(ContributionType.WRITING_DRAFT.value, 0) +
                breakdown.get(ContributionType.WRITING_REVISION.value, 0) +
                breakdown.get(ContributionType.EDITING_REVIEW.value, 0)
            ) / score if score > 0 else 0

            attribution = AuthorshipAttribution(
                contributor_id=contributor_id,
                contributor_name=contributor_names[contributor_id],
                total_contribution_score=score,
                contribution_breakdown=breakdown,
                overall_percentage=(score / total_score) * 100,
                idea_percentage=idea_pct * 100,
                execution_percentage=execution_pct * 100,
                communication_percentage=communication_pct * 100
            )

            attributions[contributor_id] = attribution

        # Determine authorship positions
        attributions = self._determine_positions(attributions)

        return attributions

    def _determine_positions(
        self,
        attributions: Dict[str, AuthorshipAttribution]
    ) -> Dict[str, AuthorshipAttribution]:
        """Determine authorship positions and roles"""
        # Sort by overall contribution
        sorted_contributors = sorted(
            attributions.items(),
            key=lambda x: x[1].total_contribution_score,
            reverse=True
        )

        # Assign positions
        for position, (contributor_id, attribution) in enumerate(sorted_contributors, 1):
            attribution.authorship_position = position

            # Determine role
            if position == 1:
                # First author - check for equal contributions
                if len(sorted_contributors) > 1:
                    second_score = sorted_contributors[1][1].total_contribution_score
                    if abs(attribution.total_contribution_score - second_score) / attribution.total_contribution_score < 0.05:
                        # Within 5% - equal contribution
                        attribution.suggested_role = AuthorRole.CO_FIRST_AUTHOR
                        attribution.equal_contribution_with = sorted_contributors[1][0]
                    else:
                        attribution.suggested_role = AuthorRole.FIRST_AUTHOR
                else:
                    attribution.suggested_role = AuthorRole.FIRST_AUTHOR

            elif position == len(sorted_contributors):
                # Last author - typically senior/PI
                attribution.suggested_role = AuthorRole.SENIOR_AUTHOR

                # Check if should be corresponding author
                # (high leadership + supervision + funding)
                leadership_score = (
                    attribution.contribution_breakdown.get(ContributionType.PROJECT_LEADERSHIP.value, 0) +
                    attribution.contribution_breakdown.get(ContributionType.SUPERVISION.value, 0) +
                    attribution.contribution_breakdown.get(ContributionType.FUNDING_ACQUISITION.value, 0)
                )

                if leadership_score > 0:
                    attribution.is_corresponding_author = True

            else:
                attribution.suggested_role = AuthorRole.MIDDLE_AUTHOR

        return attributions

    def generate_authorship_report(
        self,
        attributions: Dict[str, AuthorshipAttribution]
    ) -> str:
        """Generate human-readable authorship report"""
        lines = []
        lines.append("AUTHORSHIP ATTRIBUTION REPORT")
        lines.append("=" * 80)
        lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"Total Contributors: {len(attributions)}")
        lines.append("")

        # Sort by position
        sorted_attributions = sorted(
            attributions.values(),
            key=lambda a: a.authorship_position
        )

        lines.append("AUTHORSHIP ORDER:")
        lines.append("")

        for attribution in sorted_attributions:
            position_str = f"{attribution.authorship_position}."
            role_str = f"({attribution.suggested_role.value})" if attribution.suggested_role else ""

            lines.append(f"  {position_str} {attribution.contributor_name} {role_str}")
            lines.append(f"      Contribution: {attribution.overall_percentage:.1f}%")
            lines.append(f"      Breakdown: Idea {attribution.idea_percentage:.0f}%, "
                        f"Execution {attribution.execution_percentage:.0f}%, "
                        f"Communication {attribution.communication_percentage:.0f}%")

            if attribution.equal_contribution_with:
                equal_name = attributions[attribution.equal_contribution_with].contributor_name
                lines.append(f"      Equal contribution with: {equal_name}")

            if attribution.is_corresponding_author:
                lines.append(f"      ✓ Corresponding Author")

            lines.append("")

        lines.append("DETAILED CONTRIBUTIONS:")
        lines.append("")

        for attribution in sorted_attributions:
            lines.append(f"{attribution.contributor_name}:")
            lines.append(f"  Total Score: {attribution.total_contribution_score:.2f}")

            if attribution.contribution_breakdown:
                lines.append(f"  By Type:")
                for contrib_type, score in sorted(
                    attribution.contribution_breakdown.items(),
                    key=lambda x: x[1],
                    reverse=True
                ):
                    if score > 0:
                        type_label = contrib_type.replace('_', ' ').title()
                        lines.append(f"    - {type_label}: {score:.2f}")

            lines.append("")

        lines.append("METHODOLOGY:")
        lines.append("")
        lines.append("  Contribution Weights:")
        for contrib_type, weight in sorted(self.weights.items(), key=lambda x: x[1], reverse=True):
            if weight > 0:
                type_label = contrib_type.value.replace('_', ' ').title()
                lines.append(f"    - {type_label}: {weight*100:.0f}%")
        lines.append("")
        lines.append("  Score Calculation:")
        lines.append("    For each contribution: score = hours_spent × impact_weight × type_weight")
        lines.append("    Total contributor score = sum of all contribution scores")
        lines.append("    Percentage = (contributor_score / total_all_scores) × 100")
        lines.append("")

        return "\n".join(lines)

    def export_contributions_json(
        self,
        attributions: Dict[str, AuthorshipAttribution],
        filepath: str
    ):
        """Export contributions to JSON file"""
        data = {
            "generated": datetime.now().isoformat(),
            "weights": {k.value: v for k, v in self.weights.items()},
            "contributors": {}
        }

        for contributor_id, attribution in attributions.items():
            data["contributors"][contributor_id] = {
                "name": attribution.contributor_name,
                "total_score": attribution.total_contribution_score,
                "overall_percentage": attribution.overall_percentage,
                "authorship_position": attribution.authorship_position,
                "suggested_role": attribution.suggested_role.value if attribution.suggested_role else None,
                "is_corresponding_author": attribution.is_corresponding_author,
                "equal_contribution_with": attribution.equal_contribution_with,
                "contribution_breakdown": attribution.contribution_breakdown,
                "idea_percentage": attribution.idea_percentage,
                "execution_percentage": attribution.execution_percentage,
                "communication_percentage": attribution.communication_percentage
            }

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)


def main():
    """Example usage"""
    calculator = AuthorshipCalculator()

    # Add contributions for a collaborative paper
    # Alice - lead researcher, conceived idea, wrote paper
    calculator.add_contribution(
        contributor_id="alice",
        contributor_name="Dr. Alice Chen",
        contribution_type=ContributionType.IDEA_CONCEPTION,
        description="Initial concept and problem formulation",
        hours_spent=40,
        impact_weight=1.0
    )

    calculator.add_contribution(
        contributor_id="alice",
        contributor_name="Dr. Alice Chen",
        contribution_type=ContributionType.METHODOLOGY_DESIGN,
        description="Designed experimental methodology",
        hours_spent=30,
        impact_weight=1.0
    )

    calculator.add_contribution(
        contributor_id="alice",
        contributor_name="Dr. Alice Chen",
        contribution_type=ContributionType.WRITING_DRAFT,
        description="Wrote initial manuscript draft",
        hours_spent=60,
        impact_weight=1.0
    )

    # Bob - mathematical proofs
    calculator.add_contribution(
        contributor_id="bob",
        contributor_name="Dr. Bob Mueller",
        contribution_type=ContributionType.METHODOLOGY_DESIGN,
        description="Mathematical framework design",
        hours_spent=50,
        impact_weight=1.2  # High impact - novel mathematical approach
    )

    calculator.add_contribution(
        contributor_id="bob",
        contributor_name="Dr. Bob Mueller",
        contribution_type=ContributionType.IMPLEMENTATION,
        description="Formal proof verification in Coq",
        hours_spent=80,
        impact_weight=1.0
    )

    # Carol - simulations and data analysis
    calculator.add_contribution(
        contributor_id="carol",
        contributor_name="Dr. Carol Williams",
        contribution_type=ContributionType.IMPLEMENTATION,
        description="Implemented simulation framework",
        hours_spent=120,
        impact_weight=1.0
    )

    calculator.add_contribution(
        contributor_id="carol",
        contributor_name="Dr. Carol Williams",
        contribution_type=ContributionType.DATA_ANALYSIS,
        description="Analyzed simulation results",
        hours_spent=40,
        impact_weight=1.0
    )

    calculator.add_contribution(
        contributor_id="carol",
        contributor_name="Dr. Carol Williams",
        contribution_type=ContributionType.VISUALIZATION,
        description="Created figures and visualizations",
        hours_spent=30,
        impact_weight=1.0
    )

    # David - funding and supervision
    calculator.add_contribution(
        contributor_id="david",
        contributor_name="Prof. David Kim",
        contribution_type=ContributionType.PROJECT_LEADERSHIP,
        description="Project coordination and direction",
        hours_spent=20,
        impact_weight=1.0
    )

    calculator.add_contribution(
        contributor_id="david",
        contributor_name="Prof. David Kim",
        contribution_type=ContributionType.SUPERVISION,
        description="Supervised research team",
        hours_spent=15,
        impact_weight=1.0
    )

    calculator.add_contribution(
        contributor_id="david",
        contributor_name="Prof. David Kim",
        contribution_type=ContributionType.FUNDING_ACQUISITION,
        description="Secured grant funding",
        hours_spent=40,
        impact_weight=1.5  # High impact - enabled the research
    )

    calculator.add_contribution(
        contributor_id="david",
        contributor_name="Prof. David Kim",
        contribution_type=ContributionType.EDITING_REVIEW,
        description="Review and editing of manuscript",
        hours_spent=10,
        impact_weight=1.0
    )

    # Calculate authorship
    attributions = calculator.calculate_all_contributions()

    # Generate report
    report = calculator.generate_authorship_report(attributions)
    print(report)

    # Export to JSON
    calculator.export_contributions_json(attributions, "authorship_data.json")
    print("\nExported data to: authorship_data.json")


if __name__ == "__main__":
    main()

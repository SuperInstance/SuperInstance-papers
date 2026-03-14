"""
Collaboration Agreement Generator
==================================

Automates generation of collaboration agreements for joint research projects,
including IP ownership, authorship terms, and institutional agreements.

Features:
- Automated agreement generation
- Customizable terms and conditions
- Multi-institutional support
- IP ownership tracking
- Legal compliance checks
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum
import json
from pathlib import Path


class AgreementType(Enum):
    """Types of collaboration agreements"""
    BILATERAL = "bilateral"  # Two institutions
    MULTILATERAL = "multilateral"  # Three or more institutions
    INDUSTRY_ACADEMIA = "industry_academia"  # Industry + academia
    CONSORTIUM = "consortium"  # Large multi-party consortium


class IPOwnershipModel(Enum):
    """Models for IP ownership"""
    JOINT_OWNERSHIP = "joint_ownership"  # All parties own equally
    LEAD_OWNERSHIP = "lead_ownership"  # Lead institution owns
    PROPORTIONAL = "proportional"  # Ownership proportional to contribution
    SEPARATE_OWNERSHIP = "separate_ownership"  # Each owns their contributions
    OPEN_SOURCE = "open_source"  # Released as open source


class AuthorshipModel(Enum):
    """Models for determining authorship"""
    CONTRIBUTION_BASED = "contribution_based"  # Based on contribution score
    ALPHABETICAL = "alphabetical"  # Alphabetical order
    POSITION_IMPORTANCE = "position_importance"  # PIs first, then others
    NEGOTIATED = "negotiated"  # Determined by team


@dataclass
class Institution:
    """Institution participating in collaboration"""
    institution_id: str
    name: str
    type: str  # "university", "industry", "government", "nonprofit"
    country: str
    address: str
    contact_person: str
    contact_email: str
    legal_department_email: str

    # Policies
    default_ip_policy: str = ""
    requires_irb: bool = False
    requires_tech_transfer: bool = False

    # Tax and legal
    tax_id: str = ""
    preferred_jurisdiction: str = ""


@dataclass
class AgreementTerms:
    """Terms and conditions for collaboration agreement"""

    # Basic terms
    agreement_type: AgreementType
    start_date: datetime
    end_date: Optional[datetime] = None
    can_be_renewed: bool = True

    # IP terms
    ip_ownership_model: IPOwnershipModel = IPOwnershipModel.JOINT_OWNERSHIP
    ip_ownership_percentages: Dict[str, float] = field(default_factory=dict)  # {institution_id: percentage}
    patent_rights: List[str] = field(default_factory=list)
    copyright_license: str = "exclusive"  # "exclusive", "non-exclusive", "open_source"

    # Publication terms
    authorship_model: AuthorshipModel = AuthorshipModel.CONTRIBUTION_BASED
    publication_review_required: bool = True
    minimum_review_days: int = 14
    conference_approval_required: bool = False

    # Data sharing
    data_sharing_allowed: bool = True
    data_ownership: str = "joint"  # "joint", "lead", "separate"
    confidentiality_period_days: int = 0

    # Financial terms
    funding_source: str = "external"  # "external", "internal", "mixed"
    cost_sharing_model: str = "equal"  # "equal", "proportional", "negotiated"
    budget_usd: float = 0.0

    # Liability and termination
    liability_cap: float = 0.0
    termination_notice_days: int = 30
    force_majeureincluded: bool = True

    # Dispute resolution
    dispute_resolution_method: str = "mediation"  # "mediation", "arbitration", "litigation"
    governing_law: str = ""
    jurisdiction: str = ""


@dataclass
class CollaborationAgreement:
    """Complete collaboration agreement"""
    agreement_id: str
    project_title: str
    project_description: str

    # Participants
    institutions: List[Institution]
    lead_institution_id: str

    # Terms
    terms: AgreementTerms

    # Scope
    research_objectives: List[str]
    deliverables: List[str]
    milestones: List[Dict[str, str]] = field(default_factory=list)

    # Approvals
    institution_approvals: Dict[str, bool] = field(default_factory=dict)  # {institution_id: approved}
    legal_approvals: Dict[str, bool] = field(default_factory=dict)  # {institution_id: approved}

    # Metadata
    agreement_version: str = "1.0"
    created: datetime = field(default_factory=datetime.now)
    last_modified: datetime = field(default_factory=datetime.now)
    effective_date: Optional[datetime] = None


class AgreementGenerator:
    """
    Generates collaboration agreements for research projects.

    Automates the creation of legally-sound agreements with customizable terms.
    """

    def __init__(self, template_dir: str = "templates/agreements"):
        self.template_dir = Path(template_dir)
        self.template_dir.mkdir(parents=True, exist_ok=True)

        self.agreements: Dict[str, CollaborationAgreement] = {}

    def create_agreement(
        self,
        project_title: str,
        project_description: str,
        institutions: List[Institution],
        lead_institution_id: str,
        research_objectives: List[str],
        deliverables: List[str],
        terms_override: Optional[Dict] = None
    ) -> CollaborationAgreement:
        """Create a new collaboration agreement"""
        agreement_id = f"agr_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Determine agreement type
        if len(institutions) == 2:
            agreement_type = AgreementType.BILATERAL
        elif len(institutions) > 2:
            agreement_type = AgreementType.MULTILATERAL
        else:
            agreement_type = AgreementType.BILATERAL

        # Check for industry partners
        has_industry = any(inst.type == "industry" for inst in institutions)
        if has_industry:
            agreement_type = AgreementType.INDUSTRY_ACADEMIA

        # Create default terms
        default_terms = {
            "agreement_type": agreement_type,
            "start_date": datetime.now(),
            "end_date": datetime.now() + timedelta(days=365),  # 1 year default
            "can_be_renewed": True,
            "ip_ownership_model": IPOwnershipModel.JOINT_OWNERSHIP,
            "authorship_model": AuthorshipModel.CONTRIBUTION_BASED,
            "publication_review_required": True,
            "minimum_review_days": 14,
            "data_sharing_allowed": True,
            "cost_sharing_model": "equal",
            "termination_notice_days": 30,
            "force_majeure_included": True,
            "dispute_resolution_method": "mediation"
        }

        # Apply overrides
        if terms_override:
            default_terms.update(terms_override)

        terms = AgreementTerms(**default_terms)

        # Set up approval tracking
        institution_approvals = {inst.institution_id: False for inst in institutions}
        legal_approvals = {inst.institution_id: False for inst in institutions}

        agreement = CollaborationAgreement(
            agreement_id=agreement_id,
            project_title=project_title,
            project_description=project_description,
            institutions=institutions,
            lead_institution_id=lead_institution_id,
            terms=terms,
            research_objectives=research_objectives,
            deliverables=deliverables,
            institution_approvals=institution_approvals,
            legal_approvals=legal_approvals
        )

        self.agreements[agreement_id] = agreement
        return agreement

    def generate_agreement_document(self, agreement_id: str) -> str:
        """Generate human-readable agreement document"""
        if agreement_id not in self.agreements:
            raise ValueError(f"Agreement {agreement_id} not found")

        agreement = self.agreements[agreement_id]

        # Generate document
        doc_lines = []
        doc_lines.append(f"COLLABORATION AGREEMENT")
        doc_lines.append(f"=" * 80)
        doc_lines.append(f"")
        doc_lines.append(f"Agreement ID: {agreement.agreement_id}")
        doc_lines.append(f"Version: {agreement.agreement_version}")
        doc_lines.append(f"Date: {agreement.created.strftime('%B %d, %Y')}")
        doc_lines.append(f"")
        doc_lines.append(f"PROJECT TITLE: {agreement.project_title}")
        doc_lines.append(f"")
        doc_lines.append(f"PROJECT DESCRIPTION:")
        doc_lines.append(f"  {agreement.project_description}")
        doc_lines.append(f"")
        doc_lines.append(f"PARTICIPATING INSTITUTIONS:")

        for inst in agreement.institutions:
            is_lead = " (LEAD)" if inst.institution_id == agreement.lead_institution_id else ""
            doc_lines.append(f"  - {inst.name}{is_lead}")
            doc_lines.append(f"    Contact: {inst.contact_person} ({inst.contact_email})")
            doc_lines.append(f"    Legal Contact: {inst.legal_department_email}")

        doc_lines.append(f"")
        doc_lines.append(f"RESEARCH OBJECTIVES:")
        for i, obj in enumerate(agreement.research_objectives, 1):
            doc_lines.append(f"  {i}. {obj}")

        doc_lines.append(f"")
        doc_lines.append(f"DELIVERABLES:")
        for i, deliv in enumerate(agreement.deliverables, 1):
            doc_lines.append(f"  {i}. {deliv}")

        doc_lines.append(f"")
        doc_lines.append(f"TERMS AND CONDITIONS:")
        doc_lines.append(f"")
        doc_lines.append(f"1. AGREEMENT TYPE")
        doc_lines.append(f"   {agreement.terms.agreement_type.value.replace('_', ' ').title()}")
        doc_lines.append(f"")
        doc_lines.append(f"2. TERM")
        doc_lines.append(f"   Start Date: {agreement.terms.start_date.strftime('%B %d, %Y')}")
        if agreement.terms.end_date:
            doc_lines.append(f"   End Date: {agreement.terms.end_date.strftime('%B %d, %Y')}")
        doc_lines.append(f"   Renewable: {'Yes' if agreement.terms.can_be_renewed else 'No'}")
        doc_lines.append(f"")
        doc_lines.append(f"3. INTELLECTUAL PROPERTY")
        doc_lines.append(f"   Ownership Model: {agreement.terms.ip_ownership_model.value.replace('_', ' ').title()}")
        if agreement.terms.ip_ownership_percentages:
            doc_lines.append(f"   Ownership Distribution:")
            for inst_id, percentage in agreement.terms.ip_ownership_percentages.items():
                inst = next((i for i in agreement.institutions if i.institution_id == inst_id), None)
                if inst:
                    doc_lines.append(f"     {inst.name}: {percentage*100:.1f}%")
        doc_lines.append(f"   Copyright License: {agreement.terms.copyright_license}")
        doc_lines.append(f"")
        doc_lines.append(f"4. PUBLICATION AND AUTHORSHIP")
        doc_lines.append(f"   Authorship Model: {agreement.terms.authorship_model.value.replace('_', ' ').title()}")
        doc_lines.append(f"   Review Required: {'Yes' if agreement.terms.publication_review_required else 'No'}")
        if agreement.terms.publication_review_required:
            doc_lines.append(f"   Minimum Review Period: {agreement.terms.minimum_review_days} days")
        doc_lines.append(f"")
        doc_lines.append(f"5. DATA SHARING")
        doc_lines.append(f"   Data Sharing Allowed: {'Yes' if agreement.terms.data_sharing_allowed else 'No'}")
        doc_lines.append(f"   Data Ownership: {agreement.terms.data_ownership}")
        if agreement.terms.confidentiality_period_days > 0:
            doc_lines.append(f"   Confidentiality Period: {agreement.terms.confidentiality_period_days} days")
        doc_lines.append(f"")
        doc_lines.append(f"6. FINANCIAL TERMS")
        doc_lines.append(f"   Funding Source: {agreement.terms.funding_source}")
        doc_lines.append(f"   Cost Sharing Model: {agreement.terms.cost_sharing_model}")
        if agreement.terms.budget_usd > 0:
            doc_lines.append(f"   Total Budget: ${agreement.terms.budget_usd:,.2f} USD")
        doc_lines.append(f"")
        doc_lines.append(f"7. LIABILITY AND TERMINATION")
        if agreement.terms.liability_cap > 0:
            doc_lines.append(f"   Liability Cap: ${agreement.terms.liability_cap:,.2f} USD")
        doc_lines.append(f"   Termination Notice: {agreement.terms.termination_notice_days} days")
        doc_lines.append(f"   Force Majeure: {'Included' if agreement.terms.force_majeureincluded else 'Not Included'}")
        doc_lines.append(f"")
        doc_lines.append(f"8. DISPUTE RESOLUTION")
        doc_lines.append(f"   Method: {agreement.terms.dispute_resolution_method}")
        if agreement.terms.governing_law:
            doc_lines.append(f"   Governing Law: {agreement.terms.governing_law}")
        if agreement.terms.jurisdiction:
            doc_lines.append(f"   Jurisdiction: {agreement.terms.jurisdiction}")
        doc_lines.append(f"")
        doc_lines.append(f"APPROVALS:")
        doc_lines.append(f"")
        for inst in agreement.institutions:
            inst_approved = agreement.institution_approvals.get(inst.institution_id, False)
            legal_approved = agreement.legal_approvals.get(inst.institution_id, False)

            inst_status = "✓ Approved" if inst_approved else "✗ Pending"
            legal_status = "✓ Approved" if legal_approved else "✗ Pending"

            doc_lines.append(f"  {inst.name}:")
            doc_lines.append(f"    Institution Approval: {inst_status}")
            doc_lines.append(f"    Legal Review: {legal_status}")
        doc_lines.append(f"")
        doc_lines.append(f"SIGNATURES:")
        doc_lines.append(f"")
        for inst in agreement.institutions:
            doc_lines.append(f"  ___________________")
            doc_lines.append(f"  {inst.name}")
            doc_lines.append(f"  Authorized Signature")
            doc_lines.append(f"  Date: _______________")
            doc_lines.append(f"")

        return "\n".join(doc_lines)

    def check_agreement_complete(self, agreement_id: str) -> bool:
        """Check if agreement has all required approvals"""
        if agreement_id not in self.agreements:
            return False

        agreement = self.agreements[agreement_id]

        # Check all institution approvals
        inst_approvals_complete = all(
            agreement.institution_approvals.get(inst.institution_id, False)
            for inst in agreement.institutions
        )

        # Check all legal approvals
        legal_approvals_complete = all(
            agreement.legal_approvals.get(inst.institution_id, False)
            for inst in agreement.institutions
        )

        return inst_approvals_complete and legal_approvals_complete

    def approve_agreement(
        self,
        agreement_id: str,
        institution_id: str,
        approval_type: str = "institution"
    ):
        """Record approval for agreement"""
        if agreement_id not in self.agreements:
            raise ValueError(f"Agreement {agreement_id} not found")

        agreement = self.agreements[agreement_id]

        if approval_type == "institution":
            agreement.institution_approvals[institution_id] = True
        elif approval_type == "legal":
            agreement.legal_approvals[institution_id] = True
        else:
            raise ValueError(f"Unknown approval type: {approval_type}")

        # Check if agreement is now complete
        if self.check_agreement_complete(agreement_id):
            agreement.effective_date = datetime.now()

    def save_agreement(self, agreement_id: str, filepath: str):
        """Save agreement document to file"""
        document = self.generate_agreement_document(agreement_id)

        with open(filepath, 'w') as f:
            f.write(document)


def main():
    """Example usage"""
    from datetime import timedelta

    generator = AgreementGenerator()

    # Create institutions
    mit = Institution(
        institution_id="inst001",
        name="Massachusetts Institute of Technology",
        type="university",
        country="USA",
        address="77 Massachusetts Ave, Cambridge, MA 02139",
        contact_person="Dr. Alice Chen",
        contact_email="achen@mit.edu",
        legal_department_email="legal@mit.edu",
        default_ip_policy="university_policy",
        requires_irb=True
    )

    tum = Institution(
        institution_id="inst002",
        name="Technical University of Munich",
        type="university",
        country="Germany",
        address="Arcisstraße 21, 80333 München",
        contact_person="Dr. Bob Mueller",
        contact_email="bob.mueller@tum.de",
        legal_department_email="legal@tum.de",
        default_ip_policy="university_policy",
        requires_irb=True
    )

    # Create agreement
    agreement = generator.create_agreement(
        project_title="Cross-Cultural Distributed Systems Research",
        project_description="Joint research on distributed consensus algorithms across cultural contexts with focus on energy efficiency and scalability.",
        institutions=[mit, tum],
        lead_institution_id="inst001",
        research_objectives=[
            "Analyze cultural factors in distributed system adoption",
            "Develop culturally-aware consensus algorithms",
            "Validate algorithms through simulation",
            "Publish joint paper in top-tier venue"
        ],
        deliverables=[
            "Joint research paper",
            "Open-source simulation framework",
            "Dataset of cultural factors",
            "Presentation at major conference"
        ],
        terms_override={
            "end_date": datetime.now() + timedelta(days=730),  # 2 years
            "budget_usd": 250000,
            "governing_law": "Massachusetts State Law",
            "jurisdiction": "Massachusetts, USA"
        }
    )

    print(f"Created agreement: {agreement.agreement_id}")
    print(f"Project: {agreement.project_title}")
    print(f"Type: {agreement.terms.agreement_type.value}")

    # Generate document
    document = generator.generate_agreement_document(agreement.agreement_id)

    # Save to file
    output_file = f"agreement_{agreement.agreement_id}.txt"
    generator.save_agreement(agreement.agreement_id, output_file)

    print(f"\nAgreement document saved to: {output_file}")
    print("\nFirst 50 lines of document:")
    print("\n".join(document.split("\n")[:50]))


if __name__ == "__main__":
    main()

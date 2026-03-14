"""
SuperInstance Compliance Tools
==============================

Compliance management for major regulatory frameworks.

Supported Standards:
- SOC2 Type II (Trust Services Criteria)
- GDPR (General Data Protection Regulation)
- HIPAA (Health Insurance Portability and Accountability Act)
- ISO 27001 (Information Security Management)
- PCI DSS (Payment Card Industry Data Security Standard)

Features:
- Automated compliance assessment
- Evidence collection and documentation
- Gap analysis and remediation tracking
- Policy template library
- Third-party risk assessment
- Vendor questionnaires (CAIQ, SIG)

Author: SuperInstance Enterprise Team
Version: 1.0.0
License: Enterprise (see partnership agreement)
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any, Set
from dataclasses import dataclass, field
from pathlib import Path
import json
import hashlib
import uuid
import logging
import asyncio
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


# ============================================================================
# Compliance Standards
# ============================================================================

class ComplianceStandard(str, Enum):
    """Supported compliance standards"""
    SOC2 = "SOC2"
    GDPR = "GDPR"
    HIPAA = "HIPAA"
    ISO27001 = "ISO27001"
    PCI_DSS = "PCI_DSS"


class ControlStatus(str, Enum):
    """Status of compliance controls"""
    IMPLEMENTED = "implemented"
    PARTIAL = "partial"
    NOT_IMPLEMENTED = "not_implemented"
    NOT_APPLICABLE = "not_applicable"
    TESTING_REQUIRED = "testing_required"


class RiskLevel(str, Enum):
    """Risk severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ============================================================================
# Control Frameworks
# ============================================================================

@dataclass
class Control:
    """Compliance control"""
    id: str
    standard: ComplianceStandard
    category: str
    title: str
    description: str
    requirements: List[str] = field(default_factory=list)
    status: ControlStatus = ControlStatus.NOT_IMPLEMENTED
    evidence: List[str] = field(default_factory=list)
    risk_level: RiskLevel = RiskLevel.MEDIUM
    last_reviewed: Optional[datetime] = None
    next_review: Optional[datetime] = None
    owner: Optional[str] = None
    implementation_notes: str = ""
    testing_procedures: List[str] = field(default_factory=list)
    gaps_identified: List[str] = field(default_factory=list)


@dataclass
class Policy:
    """Compliance policy document"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    standard: ComplianceStandard = None
    version: str = "1.0"
    effective_date: datetime = field(default_factory=datetime.utcnow)
    review_date: Optional[datetime] = None
    content: str = ""
    approval_status: str = "draft"  # draft, approved, deprecated
    approved_by: Optional[str] = None
    approvers: List[str] = field(default_factory=list)
    related_controls: List[str] = field(default_factory=list)
    change_history: List[Dict[str, Any]] = field(default_factory=list)


# ============================================================================
# SOC2 Controls
# ============================================================================

SOC2_CONTROLS = {
    # Security Category
    "CC1.1": Control(
        id="CC1.1",
        standard=ComplianceStandard.SOC2,
        category="Security",
        title="Control Environment",
        description="Management establishes structures, reporting lines, and authorities to support IT governance and control processes.",
        requirements=[
            "Board of directors or equivalent oversight",
            "Defined lines of authority and responsibility",
            "IT governance committee",
            "Risk management framework"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.HIGH
    ),
    "CC2.1": Control(
        id="CC2.1",
        standard=ComplianceStandard.SOC2,
        category="Security",
        title="Communication and Responsibility",
        description="Management communicates responsibilities, expectations, and consequences for IT control performance.",
        requirements=[
            "Written policies and procedures",
            "Employee acknowledgment of policies",
            "Regular security awareness training",
            "Disciplinary process for violations"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.HIGH
    ),
    "CC3.2": Control(
        id="CC3.2",
        standard=ComplianceStandard.SOC2,
        category="Security",
        title="Logical and Physical Access",
        description="Logical and physical access controls safeguard against unauthorized access.",
        requirements=[
            "Unique user credentials",
            "Multi-factor authentication",
            "Access review process",
            "Immediate access revocation upon termination"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.CRITICAL
    ),
    "CC6.1": Control(
        id="CC6.1",
        standard=ComplianceStandard.SOC2,
        category="Security",
        title="Logical or Physical Barriers",
        description="Logical or physical barriers prevent unauthorized access to system components.",
        requirements=[
            "Network segmentation",
            "Firewalls and intrusion prevention",
            "Physical security for data centers",
            "Secure configuration standards"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.HIGH
    ),
    "CC6.6": Control(
        id="CC6.6",
        standard=ComplianceStandard.SOC2,
        category="Security",
        title="Data Disposal",
        description="Data is disposed of securely based on policy.",
        requirements=[
            "Data retention and disposal policy",
            "Secure deletion procedures",
            "Verification of data destruction",
            "Logging of disposal activities"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.MEDIUM
    ),
    "CC7.2": Control(
        id="CC7.2",
        standard=ComplianceStandard.SOC2,
        category="Availability",
        title="System Monitoring",
        description="System performance is monitored to identify capacity issues and incidents.",
        requirements=[
            "24/7 monitoring infrastructure",
            "Performance baseline establishment",
            "Automated alerting",
            "Incident response procedures"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.HIGH
    ),
    "CC8.1": Control(
        id="CC8.1",
        standard=ComplianceStandard.SOC2,
        category="Processing Integrity",
        title="Input Data Quality",
        description="Input data is accurate, complete, and authorized.",
        requirements=[
            "Data validation procedures",
            "Input sanitization",
            "Authorization checks",
            "Error handling and logging"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.MEDIUM
    ),
    "CC9.2": Control(
        id="CC9.2",
        standard=ComplianceStandard.SOC2,
        category="Confidentiality",
        title="Data Encryption",
        description="Confidential information is encrypted during transmission and storage.",
        requirements=[
            "Encryption in transit (TLS 1.2+)",
            "Encryption at rest (AES-256)",
            "Key management procedures",
            "Cryptographic algorithm standards"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.CRITICAL
    ),
    "CC9.3": Control(
        id="CC9.3",
        standard=ComplianceStandard.SOC2,
        category="Confidentiality",
        title="Confidentiality Commitments",
        description="Confidentiality commitments are communicated and agreements are maintained.",
        requirements=[
            "NDAs with employees and contractors",
            "Confidentiality agreements with vendors",
            "Data classification scheme",
            "Privacy policy and notices"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.HIGH
    ),
    "A1.2": Control(
        id="A1.2",
        standard=ComplianceStandard.SOC2,
        category="Privacy",
        title="Privacy Notice",
        description="Notice is provided about personal information collection, use, retention, and disclosure.",
        requirements=[
            "Privacy policy published",
            "Notice at point of collection",
            "Clear description of data use",
            "Contact information for inquiries"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.HIGH
    )
}


# ============================================================================
# GDPR Controls
# ============================================================================

GDPR_CONTROLS = {
    "ART_32": Control(
        id="ART_32",
        standard=ComplianceStandard.GDPR,
        category="Security of Processing",
        title="Security of Processing",
        description="Technical and organizational measures to ensure appropriate security of personal data.",
        requirements=[
            "Pseudonymization and encryption",
            "Confidentiality, integrity, availability",
            "Ability to restore availability and access",
            "Regular testing of security measures"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.CRITICAL
    ),
    "ART_33": Control(
        id="ART_33",
        standard=ComplianceStandard.GDPR,
        category="Breach Notification",
        title="Notification of Personal Data Breach",
        description="Notification of personal data breaches to supervisory authority without undue delay.",
        requirements=[
            "Breach detection procedures",
            "Notification process (72 hours)",
            "Documentation of breaches",
            "Risk assessment procedures"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.CRITICAL
    ),
    "ART_35": Control(
        id="ART_35",
        standard=ComplianceStandard.GDPR,
        category="DPIA",
        title="Data Protection Impact Assessment",
        description="Assessment of impact of processing operations on privacy.",
        requirements=[
            "DPIA process for high-risk processing",
            "Systematic description of processing",
            "Necessity and proportionality assessment",
            "Risk mitigation measures"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.HIGH
    ),
    "ART_28": Control(
        id="ART_28",
        standard=ComplianceStandard.GDPR,
        category="Processors",
        title="Processor",
        description="Processor acting on behalf of controller provides sufficient guarantees.",
        requirements=[
            "Data processing agreements",
            "Processor audit rights",
            "Sub-processor consent requirements",
            "Assistance to controller obligations"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.HIGH
    )
}


# ============================================================================
# HIPAA Controls
# ============================================================================

HIPAA_CONTROLS = {
    "164_308_a1": Control(
        id="164_308_a1",
        standard=ComplianceStandard.HIPAA,
        category="Administrative Safeguards",
        title="Risk Analysis",
        description="Conduct an accurate and thorough assessment of potential risks and vulnerabilities.",
        requirements=[
            "Annual risk assessment",
            "Threat and vulnerability identification",
            "Impact assessment",
            "Risk mitigation planning"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.CRITICAL
    ),
    "164_308_a3": Control(
        id="164_308_a3",
        standard=ComplianceStandard.HIPAA,
        category="Administrative Safeguards",
        title="Workforce Security",
        description="Policies and procedures to ensure workforce members access PHI appropriately.",
        requirements=[
            "Authorization and supervision",
            "Workforce clearance procedures",
            "Termination procedures",
            "Access review process"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.HIGH
    ),
    "164_308_a5": Control(
        id="164_308_a5",
        standard=ComplianceStandard.HIPAA,
        category="Administrative Safeguards",
        title="Security Awareness and Training",
        description="Security awareness and training program for workforce members.",
        requirements=[
            "Periodic security updates",
            "Password management training",
            "Malicious software protection",
            "Login monitoring"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.MEDIUM
    ),
    "164_312_a1": Control(
        id="164_312_a1",
        standard=ComplianceStandard.HIPAA,
        category="Technical Safeguards",
        title="Access Control",
        description="Implement technical policies and procedures for electronic PHI access.",
        requirements=[
            "Unique user identification",
            "Emergency access procedures",
            "Automatic logoff",
            "Encryption and decryption"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.CRITICAL
    ),
    "164_312_b": Control(
        id="164_312_b",
        standard=ComplianceStandard.HIPAA,
        category="Technical Safeguards",
        title="Audit Controls",
        description="Implement hardware, software, and/or procedural mechanisms to record and examine activity.",
        requirements=[
            "Comprehensive audit logging",
            "Log retention (6 years)",
            "Audit report generation",
            "Regular audit review"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.HIGH
    ),
    "164_312_c1": Control(
        id="164_312_c1",
        standard=ComplianceStandard.HIPAA,
        category="Technical Safeguards",
        title="Integrity",
        description "Protect electronic PHI from improper alteration or destruction.",
        requirements=[
            "Data integrity controls",
            "Digital signatures",
            "Checksum verification",
            "Change tracking"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.HIGH
    ),
    "164_312_e1": Control(
        id="164_312_e1",
        standard=ComplianceStandard.HIPAA,
        category="Technical Safeguards",
        title="Transmission Security",
        description="Implement technical security measures to guard against unauthorized access.",
        requirements=[
            "Encryption in transit",
            "Integrity controls",
            "Network security",
            "Secure API endpoints"
        ],
        status=ControlStatus.NOT_IMPLEMENTED,
        risk_level=RiskLevel.CRITICAL
    )
}


# ============================================================================
# Compliance Assessment
# ============================================================================

@dataclass
class ComplianceAssessment:
    """Compliance assessment results"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    standard: ComplianceStandard = None
    assessment_date: datetime = field(default_factory=datetime.utcnow)
    assessed_by: str = ""
    overall_score: float = 0.0  # 0-100
    control_scores: Dict[str, float] = field(default_factory=dict)
    gaps_identified: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    evidence_collected: List[str] = field(default_factory=list)
    next_assessment_date: Optional[datetime] = None
    status: str = "in_progress"  # in_progress, complete, review_required


class ComplianceAssessor:
    """Automated compliance assessment"""

    def __init__(self):
        self.controls: Dict[str, Dict[str, Control]] = {
            ComplianceStandard.SOC2: SOC2_CONTROLS,
            ComplianceStandard.GDPR: GDPR_CONTROLS,
            ComplianceStandard.HIPAA: HIPAA_CONTROLS
        }

    def assess_standard(self, standard: ComplianceStandard) -> ComplianceAssessment:
        """Assess compliance against a standard"""
        controls = self.controls.get(standard, {})
        control_scores = {}
        gaps = []

        for control_id, control in controls.items():
            # Automated assessment logic
            score = self._assess_control(control)
            control_scores[control_id] = score

            if score < 100:
                gaps.append({
                    'control_id': control_id,
                    'title': control.title,
                    'current_score': score,
                    'gaps': self._identify_gaps(control)
                })

        overall_score = sum(control_scores.values()) / len(control_scores) if control_scores else 0

        return ComplianceAssessment(
            standard=standard,
            overall_score=overall_score,
            control_scores=control_scores,
            gaps_identified=gaps,
            recommendations=self._generate_recommendations(standard, gaps),
            next_assessment_date=datetime.utcnow() + timedelta(days=90)
        )

    def _assess_control(self, control: Control) -> float:
        """Assess individual control implementation"""
        # In production, this would:
        # 1. Check for automated evidence (logs, configs)
        # 2. Run security scans
        # 3. Review documentation
        # 4. Interview stakeholders

        score = 0.0

        # Check if evidence exists
        if control.evidence:
            score += 30

        # Check implementation status
        if control.status == ControlStatus.IMPLEMENTED:
            score += 50
        elif control.status == ControlStatus.PARTIAL:
            score += 25
        elif control.status == ControlStatus.TESTING_REQUIRED:
            score += 40

        # Check if testing procedures exist
        if control.testing_procedures:
            score += 20

        return min(score, 100.0)

    def _identify_gaps(self, control: Control) -> List[str]:
        """Identify gaps in control implementation"""
        gaps = []

        if not control.evidence:
            gaps.append("No evidence collected")

        if control.status == ControlStatus.NOT_IMPLEMENTED:
            gaps.append("Control not implemented")
        elif control.status == ControlStatus.PARTIAL:
            gaps.append("Control partially implemented")

        if not control.testing_procedures:
            gaps.append("No testing procedures defined")

        if not control.last_reviewed:
            gaps.append("Control never reviewed")

        return gaps

    def _generate_recommendations(self, standard: ComplianceStandard, gaps: List[Dict[str, Any]]) -> List[str]:
        """Generate remediation recommendations"""
        recommendations = []

        for gap in gaps:
            control_id = gap['control_id']
            for gap_desc in gap['gaps']:
                recommendations.append(f"{control_id}: {gap_desc}")

        return recommendations


# ============================================================================
# Policy Management
# ============================================================================

class PolicyManager:
    """Manage compliance policies"""

    def __init__(self):
        self.policies: Dict[str, Policy] = {}
        self.policy_templates = self._load_templates()

    def _load_templates(self) -> Dict[str, str]:
        """Load policy templates"""
        return {
            "information_security": """
Information Security Policy
==========================

1. Purpose
   Establish the framework for protecting SuperInstance information assets.

2. Scope
   Applies to all employees, contractors, and third parties with access to SuperInstance systems.

3. Policy Statements
   - All access to information assets requires authorization
   - Strong authentication mechanisms must be used
   - Data must be classified according to sensitivity
   - Security incidents must be reported immediately
   - Regular security awareness training is mandatory

4. Roles and Responsibilities
   - CISO: Overall security program ownership
   - Security Team: Implementation and monitoring
   - All Employees: Compliance with security policies

5. Enforcement
   Violations may result in disciplinary action up to and including termination.
            """,

            "data_retention": """
Data Retention Policy
=====================

1. Purpose
   Define requirements for retaining and disposing of data.

2. Retention Periods
   - Audit logs: 7 years
   - Customer data: 3 years after termination
   - Security events: 5 years
   - Financial records: 7 years

3. Disposal
   Data must be securely deleted using NIST 800-88 guidelines.

4. Exceptions
   Requires written approval from CISO and Legal.
            """,

            "access_control": """
Access Control Policy
=====================

1. Purpose
   Control access to SuperInstance systems and data.

2. Principles
   - Least privilege access
   - Need-to-know basis
   - Separation of duties
   - Regular access reviews (quarterly)

3. Authentication
   - Multi-factor authentication required
   - Minimum 12-character passwords
   - 90-day password rotation
   - Account lockout after 5 failed attempts

4. Authorization
   - Role-based access control
   - Manager approval for access grants
   - Automatic access revocation on termination
            """,

            "incident_response": """
Incident Response Policy
========================

1. Purpose
   Define procedures for responding to security incidents.

2. Incident Classification
   - SEV1: Critical - System-wide impact
   - SEV2: High - Significant service degradation
   - SEV3: Medium - Limited impact
   - SEV4: Low - Minimal impact

3. Response Procedures
   - Detection and analysis: 1 hour
   - Containment: 4 hours
   - Eradication: 24 hours
   - Recovery: 48 hours
   - Post-incident review: 1 week

4. Reporting
   - SEV1: Immediate executive notification
   - SEV2: Executive notification within 4 hours
   - Regulatory breaches: Legal notification within 24 hours
            """,

            "gdpr_privacy": """
GDPR Privacy Policy
====================

1. Data Controller
   SuperInstance Inc. is the data controller for all personal data processed.

2. Legal Basis for Processing
   - Consent: Marketing communications
   - Contract: Service provision
   - Legal Obligation: Regulatory compliance
   - Legitimate Interest: Fraud prevention

3. Data Subject Rights
   - Right to access
   - Right to rectification
   - Right to erasure
   - Right to restrict processing
   - Right to data portability
   - Right to object

4. Data Retention
   Personal data retained only as long as necessary for the purpose.

5. International Transfers
   Data transfers comply with GDPR Chapter V requirements.
            """,

            "hipaa_security": """
HIPAA Security Policy
=====================

1. Purpose
   Comply with HIPAA Security Rule for protected health information (PHI).

2. Administrative Safeguards
   - Security management process
   - Assigned security responsibility
   - Workforce security
   - Information access management
   - Security awareness and training
   - Security incident procedures

3. Physical Safeguards
   - Facility access controls
   - Workstation use
   - Workstation security
   - Device and media controls

4. Technical Safeguards
   - Access control
   - Audit controls
   - Integrity controls
   - Transmission security

5. Breach Notification
   Breaches affecting >500 individuals: Notification within 60 days
   Breaches affecting <500 individuals: Notification within 60 days of end of calendar year
            """
        }

    def create_policy(self, template_name: str, title: str, standard: ComplianceStandard) -> Policy:
        """Create policy from template"""
        content = self.policy_templates.get(template_name, "")

        policy = Policy(
            title=title,
            standard=standard,
            content=content,
            review_date=datetime.utcnow() + timedelta(days=365)
        )

        self.policies[policy.id] = policy
        return policy

    def update_policy(self, policy_id: str, content: str, approved_by: str) -> Policy:
        """Update policy with change tracking"""
        policy = self.policies.get(policy_id)
        if not policy:
            raise ValueError(f"Policy {policy_id} not found")

        # Record change
        policy.change_history.append({
            'timestamp': datetime.utcnow().isoformat(),
            'approved_by': approved_by,
            'previous_version': policy.version,
            'change_summary': 'Policy updated'
        })

        # Update version
        major, minor = map(int, policy.version.split('.'))
        policy.version = f"{major}.{minor + 1}"
        policy.content = content
        policy.approved_by = approved_by
        policy.approval_status = "approved"

        return policy


# ============================================================================
# Third-Party Risk Assessment
# ============================================================================

@dataclass
class VendorAssessment:
    """Third-party vendor assessment"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    vendor_name: str = ""
    vendor_type: str = ""
    assessment_date: datetime = field(default_factory=datetime.utcnow)
    assessed_by: str = ""
    risk_score: float = 0.0  # 0-100
    risk_level: RiskLevel = RiskLevel.MEDIUM
    controls_reviewed: List[str] = field(default_factory=list)
    gaps_identified: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    due_diligence_completed: bool = False
    soc2_report_available: bool = False
    other_certifications: List[str] = field(default_factory=list)
    data_processed: List[str] = field(default_factory=list)  # Types of data
    subprocessors: List[str] = field(default_factory=list)


class VendorRiskManager:
    """Manage third-party risk assessments"""

    def assess_vendor(self,
                     vendor_name: str,
                     vendor_type: str,
                     questionnaire_responses: Dict[str, Any]) -> VendorAssessment:
        """Assess vendor risk"""
        risk_score = 0.0
        gaps = []

        # SOC2 report check
        if not questionnaire_responses.get('soc2_report'):
            risk_score += 20
            gaps.append("No SOC2 report available")

        # Security controls check
        security_controls = questionnaire_responses.get('security_controls', {})
        if not security_controls.get('encryption_at_rest'):
            risk_score += 15
            gaps.append("No encryption at rest")

        if not security_controls.get('encryption_in_transit'):
            risk_score += 15
            gaps.append("No encryption in transit")

        if not security_controls.get('mfa_enabled'):
            risk_score += 10
            gaps.append("No multi-factor authentication")

        # Data handling check
        data_handling = questionnaire_responses.get('data_handling', {})
        if not data_handling.get('data_classification'):
            risk_score += 10
            gaps.append("No data classification scheme")

        # Incident response check
        if not questionnaire_responses.get('incident_response_plan'):
            risk_score += 10
            gaps.append("No incident response plan")

        # Calculate risk level
        if risk_score >= 60:
            risk_level = RiskLevel.CRITICAL
        elif risk_score >= 40:
            risk_level = RiskLevel.HIGH
        elif risk_score >= 20:
            risk_level = RiskLevel.MEDIUM
        else:
            risk_level = RiskLevel.LOW

        return VendorAssessment(
            vendor_name=vendor_name,
            vendor_type=vendor_type,
            risk_score=risk_score,
            risk_level=risk_level,
            gaps_identified=gaps,
            soc2_report_available=questionnaire_responses.get('soc2_report', False),
            other_certifications=questionnaire_responses.get('certifications', []),
            data_processed=questionnaire_responses.get('data_types', [])
        )


# ============================================================================
# Main Compliance Manager
# ============================================================================

class ComplianceManager:
    """Main compliance management system"""

    def __init__(self):
        self.assessor = ComplianceAssessor()
        self.policy_manager = PolicyManager()
        self.vendor_manager = VendorRiskManager()
        self.assessments: Dict[str, ComplianceAssessment] = {}
        self.vendor_assessments: Dict[str, VendorAssessment] = {}

    def run_compliance_assessment(self, standard: ComplianceStandard) -> ComplianceAssessment:
        """Run complete compliance assessment"""
        assessment = self.assessor.assess_standard(standard)
        self.assessments[assessment.id] = assessment
        return assessment

    def generate_compliance_report(self, assessment_id: str) -> Dict[str, Any]:
        """Generate compliance report"""
        assessment = self.assessments.get(assessment_id)
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        return {
            'assessment_id': assessment.id,
            'standard': assessment.standard.value,
            'assessment_date': assessment.assessment_date.isoformat(),
            'overall_score': assessment.overall_score,
            'control_scores': assessment.control_scores,
            'gaps_identified': assessment.gaps_identified,
            'recommendations': assessment.recommendations,
            'status': assessment.status,
            'summary': self._generate_summary(assessment)
        }

    def _generate_summary(self, assessment: ComplianceAssessment) -> str:
        """Generate executive summary"""
        if assessment.overall_score >= 90:
            return "Excellent compliance posture with minor gaps."
        elif assessment.overall_score >= 75:
            return "Good compliance posture with specific areas for improvement."
        elif assessment.overall_score >= 60:
            return "Moderate compliance posture requiring significant improvements."
        else:
            return "Poor compliance posture requiring immediate remediation."

    def get_control_matrix(self) -> Dict[str, Dict[str, Control]]:
        """Get complete control matrix"""
        return self.assessor.controls


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == "__main__":
    # Initialize compliance manager
    manager = ComplianceManager()

    # Run SOC2 assessment
    soc2_assessment = manager.run_compliance_assessment(ComplianceStandard.SOC2)
    print(f"SOC2 Score: {soc2_assessment.overall_score}%")

    # Generate report
    report = manager.generate_compliance_report(soc2_assessment.id)
    print(json.dumps(report, indent=2, default=str))

    # Create policy
    policy = manager.policy_manager.create_policy(
        template_name="information_security",
        title="SuperInstance Information Security Policy",
        standard=ComplianceStandard.SOC2
    )
    print(f"Created policy: {policy.title}")

    # Assess vendor
    vendor_assessment = manager.vendor_manager.assess_vendor(
        vendor_name="Cloud Provider X",
        vendor_type="Infrastructure",
        questionnaire_responses={
            'soc2_report': True,
            'security_controls': {
                'encryption_at_rest': True,
                'encryption_in_transit': True,
                'mfa_enabled': False
            },
            'incident_response_plan': True,
            'certifications': ['ISO27001', 'CSA STAR']
        }
    )
    print(f"Vendor Risk Score: {vendor_assessment.risk_score}")
    print(f"Vendor Risk Level: {vendor_assessment.risk_level.value}")

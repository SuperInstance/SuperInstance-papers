"""
Open Badges 2.0 Issuer for SuperInstance Certifications

Issue, manage, and verify Open Badges 2.0 compliant digital badges
for SuperInstance certifications.

Author: SuperInstance Education Team
Version: 1.0.0
References:
    - Open Badges 2.0 Specification: https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import json
import hashlib
import uuid
from enum import Enum


class BadgeLevel(Enum):
    """Badge levels corresponding to certification levels."""
    ASSOCIATE = "Associate"
    PROFESSIONAL = "Professional"
    EXPERT = "Expert"


@dataclass
class BadgeImage:
    """Badge image metadata."""
    url: str
    type: str = "image/png"
    width: int = 256
    height: int = 256

    def to_dict(self) -> Dict:
        """Convert to Open Badges format."""
        return {
            "id": self.url,
            "type": self.type
        }


@dataclass
class BadgeClass:
    """Open Badges Badge Class definition."""

    id: str  # Unique identifier URL
    name: str
    description: str
    image: BadgeImage
    criteria: str  # URL to criteria
    issuer: str  # Issuer ID
    tags: List[str] = field(default_factory=list)
    alignment: List[Dict[str, str]] = field(default_factory=list)
    level: BadgeLevel = BadgeLevel.ASSOCIATE

    def to_dict(self) -> Dict:
        """Convert to Open Badges 2.0 JSON."""
        return {
            "@context": "https://w3id.org/openbadges/v2",
            "type": "BadgeClass",
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "image": self.image.to_dict(),
            "criteria": self.criteria,
            "issuer": self.issuer,
            "tags": self.tags,
            "alignment": self.alignment
        }

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), indent=2)


@dataclass
class Issuer:
    """Open Badges Issuer organization."""

    id: str  # Unique identifier URL
    name: str
    url: str
    description: str
    image: Optional[str] = None
    email: str
    revocationList: str = ""  # URL to revocation list

    def to_dict(self) -> Dict:
        """Convert to Open Badges 2.0 JSON."""
        data = {
            "@context": "https://w3id.org/openbadges/v2",
            "type": "Issuer",
            "id": self.id,
            "name": self.name,
            "url": self.url,
            "description": self.description,
            "email": self.email
        }

        if self.image:
            data["image"] = self.image

        if self.revocationList:
            data["revocationList"] = self.revocationList

        return data

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), indent=2)


@dataclass
class IdentityObject:
    """Recipient identity information."""

    identity: str  # Email or hashed email
    type: str = "email"
    hashed: bool = False
    salt: str = ""

    def to_dict(self) -> Dict:
        """Convert to Open Badges format."""
        data = {
            "identity": self.identity,
            "type": self.type,
            "hashed": self.hashed
        }

        if self.salt:
            data["salt"] = self.salt

        return data


@dataclass
class Assertion:
    """Open Badges Assertion (issued badge)."""

    id: str  # Unique assertion ID
    recipient: IdentityObject
    badge: str  # Badge class ID
    verification: str  # Verification type
    issuedOn: str  # ISO 8601 timestamp
    expires: Optional[str] = None
    revocationReason: Optional[str] = None
    evidence: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        """Convert to Open Badges 2.0 JSON."""
        data = {
            "@context": "https://w3id.org/openbadges/v2",
            "type": "Assertion",
            "id": self.id,
            "recipient": self.recipient.to_dict(),
            "badge": self.badge,
            "verification": self.verification,
            "issuedOn": self.issuedOn
        }

        if self.expires:
            data["expires"] = self.expires

        if self.revocationReason:
            data["revocationReason"] = self.revocationReason

        if self.evidence:
            data["evidence"] = self.evidence

        return data

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), indent=2)

    def is_valid(self) -> bool:
        """Check if assertion is valid (not revoked)."""
        return self.revocationReason is None


class BadgeIssuer:
    """Open Badges 2.0 badge issuer."""

    def __init__(
        self,
        issuer_id: str,
        issuer_name: str,
        issuer_url: str,
        issuer_email: str,
        base_url: str = "https://badges.superinstance.org"
    ):
        self.issuer = Issuer(
            id=f"{base_url}/issuer.json",
            name=issuer_name,
            url=issuer_url,
            description="SuperInstance Foundation - Advancing distributed AI systems through education and certification.",
            email=issuer_email,
            revocationList=f"{base_url}/revocation-list.json"
        )
        self.base_url = base_url
        self.badge_classes: Dict[str, BadgeClass] = {}
        self.assertions: Dict[str, Assertion] = {}
        self.revocation_list: List[str] = []

        # Initialize standard badge classes
        self._initialize_badge_classes()

    def _initialize_badge_classes(self):
        """Initialize standard SuperInstance badge classes."""
        base_url = self.base_url

        # Associate Badge
        associate_badge = BadgeClass(
            id=f"{base_url}/badges/associate.json",
            name="Associate SuperInstance Developer",
            description="Certified Associate SuperInstance Developer. Demonstrated understanding of core SuperInstance concepts including origin-centric data, type systems, and confidence cascades.",
            image=BadgeImage(url=f"{base_url}/images/associate-badge.png"),
            criteria=f"{base_url}/criteria/associate.html",
            issuer=self.issuer.id,
            tags=["SuperInstance", "Distributed AI", "Associate"],
            level=BadgeLevel.ASSOCIATE,
            alignment=[
                {
                    "name": "SuperInstance Paper 1-3",
                    "url": "https://superinstance.org/papers/",
                    "description": "Core SuperInstance concepts"
                }
            ]
        )

        # Professional Badge
        professional_badge = BadgeClass(
            id=f"{base_url}/badges/professional.json",
            name="Professional SuperInstance Engineer",
            description="Certified Professional SuperInstance Engineer. Demonstrated ability to design, implement, and deploy production SuperInstance systems at scale.",
            image=BadgeImage(url=f"{base_url}/images/professional-badge.png"),
            criteria=f"{base_url}/criteria/professional.html",
            issuer=self.issuer.id,
            tags=["SuperInstance", "Distributed AI", "Professional", "Engineering"],
            level=BadgeLevel.PROFESSIONAL,
            alignment=[
                {
                    "name": "SuperInstance Papers 1-21",
                    "url": "https://superinstance.org/papers/",
                    "description": "Comprehensive SuperInstance knowledge"
                }
            ]
        )

        # Expert Badge
        expert_badge = BadgeClass(
            id=f"{base_url}/badges/expert.json",
            name="Expert SuperInstance Researcher",
            description="Certified Expert SuperInstance Researcher. Demonstrated mastery of SuperInstance theory and ability to advance the field through original research and publication.",
            image=BadgeImage(url=f"{base_url}/images/expert-badge.png"),
            criteria=f"{base_url}/criteria/expert.html",
            issuer=self.issuer.id,
            tags=["SuperInstance", "Distributed AI", "Expert", "Research"],
            level=BadgeLevel.EXPERT,
            alignment=[
                {
                    "name": "SuperInstance Papers 1-40",
                    "url": "https://superinstance.org/papers/",
                    "description": "Advanced SuperInstance research"
                }
            ]
        )

        self.badge_classes["associate"] = associate_badge
        self.badge_classes["professional"] = professional_badge
        self.badge_classes["expert"] = expert_badge

    def issue_badge(
        self,
        recipient_email: str,
        level: BadgeLevel,
        certificate_number: str,
        expires_in_days: Optional[int] = None,
        evidence_urls: Optional[List[str]] = None,
        hash_email: bool = True
    ) -> Assertion:
        """
        Issue a badge to a recipient.

        Args:
            recipient_email: Recipient's email address
            level: Badge level to issue
            certificate_number: Associated certificate number
            expires_in_days: Optional expiration in days (None = no expiration for Expert)
            evidence_urls: Optional URLs to evidence (project, paper, etc.)
            hash_email: Whether to hash the email for privacy

        Returns:
            Assertion object
        """
        # Get badge class
        badge_key = level.value.lower()
        badge_class = self.badge_classes.get(badge_key)
        if not badge_class:
            raise ValueError(f"Unknown badge level: {level}")

        # Prepare recipient identity
        if hash_email:
            # Hash email with salt for privacy
            salt = uuid.uuid4().hex
            hashed = hashlib.sha256(f"{salt}{recipient_email}".encode()).hexdigest()
            recipient_identity = f"sha256${hashed}"
            identity = IdentityObject(
                identity=recipient_identity,
                type="id",
                hashed=True,
                salt=salt
            )
        else:
            identity = IdentityObject(
                identity=recipient_email,
                type="email"
            )

        # Calculate expiration
        issued_on = datetime.now().isoformat()
        expires = None
        if expires_in_days and level != BadgeLevel.EXPERT:
            from datetime import timedelta
            expires_date = datetime.now() + timedelta(days=expires_in_days)
            expires = expires_date.isoformat()

        # Create assertion
        assertion = Assertion(
            id=f"{self.base_url}/assertions/{certificate_number}",
            recipient=identity,
            badge=badge_class.id,
            verification="hosted",
            issuedOn=issued_on,
            expires=expires,
            evidence=evidence_urls or []
        )

        # Store assertion
        self.assertions[certificate_number] = assertion

        return assertion

    def revoke_badge(
        self,
        certificate_number: str,
        reason: str
    ) -> bool:
        """
        Revoke a previously issued badge.

        Args:
            certificate_number: Certificate/Assertion identifier
            reason: Reason for revocation

        Returns:
            True if successful
        """
        if certificate_number not in self.assertions:
            return False

        assertion = self.assertions[certificate_number]
        assertion.revocationReason = reason

        # Add to revocation list
        self.revocation_list.append(assertion.id)

        return True

    def get_assertion(self, certificate_number: str) -> Optional[Assertion]:
        """Get an assertion by certificate number."""
        return self.assertions.get(certificate_number)

    def get_badge_class(self, level: BadgeLevel) -> Optional[BadgeClass]:
        """Get a badge class by level."""
        badge_key = level.value.lower()
        return self.badge_classes.get(badge_key)

    def get_issuer(self) -> Issuer:
        """Get the issuer profile."""
        return self.issuer

    def verify_assertion(self, assertion_id: str) -> Dict[str, Any]:
        """
        Verify an assertion.

        Returns verification result with status and details.
        """
        # Find assertion
        assertion = None
        for cert_num, assert_obj in self.assertions.items():
            if assert_obj.id == assertion_id:
                assertion = assert_obj
                break

        if not assertion:
            return {
                "valid": False,
                "reason": "Assertion not found"
            }

        # Check if revoked
        if assertion.revocationReason:
            return {
                "valid": False,
                "reason": f"Revoked: {assertion.revocationReason}"
            }

        # Check expiration
        if assertion.expires:
            expires_date = datetime.fromisoformat(assertion.expires)
            if datetime.now() > expires_date:
                return {
                    "valid": False,
                    "reason": f"Expired on {assertion.expires}"
                }

        return {
            "valid": True,
            "assertion": assertion.to_dict()
        }

    def export_assertion_package(self, certificate_number: str) -> Optional[Dict]:
        """
        Export complete assertion package for import into backpack.

        Returns JSON structure with assertion, badge, and issuer.
        """
        assertion = self.assertions.get(certificate_number)
        if not assertion:
            return None

        badge = None
        for badge_class in self.badge_classes.values():
            if badge_class.id == assertion.badge:
                badge = badge_class
                break

        if not badge:
            return None

        return {
            "assertion": assertion.to_dict(),
            "badge": badge.to_dict(),
            "issuer": self.issuer.to_dict()
        }

    def generate_hosted_badge_url(self, certificate_number: str) -> Optional[str]:
        """Generate URL to hosted badge assertion."""
        assertion = self.assertions.get(certificate_number)
        if assertion:
            return assertion.id
        return None

    def get_revocation_list(self) -> List[str]:
        """Get the current revocation list."""
        return self.revocation_list.copy()


class BadgeVisualizer:
    """Generate visual representations of badges."""

    @staticmethod
    def generate_embed_html(assertion_url: str, badge_image_url: str) -> str:
        """
        Generate HTML for embedding badge in websites.

        Args:
            assertion_url: URL to assertion JSON
            badge_image_url: URL to badge image

        Returns:
            HTML snippet
        """
        return f'''
<div class="openbadges" style="display: inline-block;">
  <a href="{assertion_url}" target="_blank" rel="noopener">
    <img src="{badge_image_url}"
         alt="SuperInstance Badge"
         style="border: 0; height: auto; width: 100%; max-width: 256px;">
  </a>
  <script type="application/ld+json">
  {{
    "@context": "https://w3id.org/openbadges/v2",
    "type": "Assertion",
    "id": "{assertion_url}"
  }}
  </script>
</div>
'''

    @staticmethod
    def generate_markdown(assertion_url: str, badge_image_url: str, alt_text: str) -> str:
        """
        Generate Markdown for badge.

        Args:
            assertion_url: URL to assertion JSON
            badge_image_url: URL to badge image
            alt_text: Alt text for image

        Returns:
            Markdown snippet
        """
        return f'[![{alt_text}]({badge_image_url})]({assertion_url})'


# Example usage
if __name__ == "__main__":
    # Initialize badge issuer
    issuer = BadgeIssuer(
        issuer_id="https://badges.superinstance.org/issuer.json",
        issuer_name="SuperInstance Foundation",
        issuer_url="https://superinstance.org",
        issuer_email="badges@superinstance.org"
    )

    # Issue a badge
    assertion = issuer.issue_badge(
        recipient_email="student@example.com",
        level=BadgeLevel.ASSOCIATE,
        certificate_number="ASOC-20260313-ABC123",
        expires_in_days=730,  # 2 years
        evidence_urls=[
            "https://github.com/student/superinstance-project",
            "https://superinstance.org/certificates/ASOC-20260313-ABC123"
        ]
    )

    print("Issued badge:")
    print(assertion.to_json())

    # Verify assertion
    verification = issuer.verify_assertion(assertion.id)
    print(f"\nVerification: {verification}")

    # Get badge class
    badge = issuer.get_badge_class(BadgeLevel.ASSOCIATE)
    print(f"\nBadge class:")
    print(badge.to_json())

    # Get issuer profile
    issuer_profile = issuer.get_issuer()
    print(f"\nIssuer profile:")
    print(issuer_profile.to_json())

    # Generate embed HTML
    html = BadgeVisualizer.generate_embed_html(
        assertion.id,
        f"{issuer.base_url}/images/associate-badge.png"
    )
    print(f"\nEmbed HTML:")
    print(html)

    # Export assertion package
    package = issuer.export_assertion_package("ASOC-20260313-ABC123")
    print(f"\nAssertion package:")
    print(json.dumps(package, indent=2))

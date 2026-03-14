"""
Credential Verification System for SuperInstance Certifications

Verify and validate SuperInstance certifications using blockchain-based
credential verification.

Author: SuperInstance Education Team
Version: 1.0.0
"""

from typing import Dict, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
import hashlib
import json
from enum import Enum


class VerificationStatus(Enum):
    """Credential verification status."""
    VALID = "valid"
    INVALID = "invalid"
    EXPIRED = "expired"
    REVOKED = "revoked"
    NOT_FOUND = "not_found"


@dataclass
class CredentialRecord:
    """Record of a issued credential."""
    certificate_number: str
    verification_code: str
    user_id: str
    level: str
    issued_at: datetime
    expires_at: Optional[datetime]
    name: str = ""
    email: str = ""
    is_revoked: bool = False
    revocation_reason: str = ""
    blockchain_tx_hash: str = ""  # For blockchain verification

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "certificate_number": self.certificate_number,
            "verification_code": self.verification_code,
            "user_id": self.user_id,
            "level": self.level,
            "issued_at": self.issued_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "name": self.name,
            "email": self.email,
            "is_revoked": self.is_revoked,
            "is_valid": self.is_valid()
        }

    def is_valid(self) -> bool:
        """Check if credential is currently valid."""
        if self.is_revoked:
            return False
        if self.expires_at and datetime.now() > self.expires_at:
            return False
        return True

    def generate_verification_hash(self) -> str:
        """Generate hash for verification."""
        data = f"{self.certificate_number}:{self.user_id}:{self.issued_at.isoformat()}:{self.level}"
        return hashlib.sha256(data.encode()).hexdigest()


@dataclass
class VerificationResult:
    """Result of credential verification."""
    status: VerificationStatus
    credential: Optional[CredentialRecord] = None
    message: str = ""
    verified_at: datetime = field(default_factory=datetime.now)
    verification_method: str = "database"  # database, blockchain, api


class CredentialDatabase:
    """Database of issued credentials."""

    def __init__(self):
        self.credentials: Dict[str, CredentialRecord] = {}
        self.by_user: Dict[str, List[str]] = {}  # user_id -> list of certificate numbers
        self.by_verification_code: Dict[str, str] = {}  # verification_code -> certificate number

    def add_credential(self, credential: CredentialRecord):
        """Add a credential to the database."""
        self.credentials[credential.certificate_number] = credential

        if credential.user_id not in self.by_user:
            self.by_user[credential.user_id] = []
        self.by_user[credential.user_id].append(credential.certificate_number)

        self.by_verification_code[credential.verification_code] = credential.certificate_number

    def get_by_certificate_number(self, certificate_number: str) -> Optional[CredentialRecord]:
        """Get credential by certificate number."""
        return self.credentials.get(certificate_number)

    def get_by_verification_code(self, verification_code: str) -> Optional[CredentialRecord]:
        """Get credential by verification code."""
        cert_number = self.by_verification_code.get(verification_code)
        if cert_number:
            return self.credentials.get(cert_number)
        return None

    def get_by_user(self, user_id: str) -> List[CredentialRecord]:
        """Get all credentials for a user."""
        cert_numbers = self.by_user.get(user_id, [])
        return [
            self.credentials[cn]
            for cn in cert_numbers
            if cn in self.credentials
        ]

    def revoke_credential(
        self,
        certificate_number: str,
        reason: str
    ) -> bool:
        """Revoke a credential."""
        credential = self.credentials.get(certificate_number)
        if credential:
            credential.is_revoked = True
            credential.revocation_reason = reason
            return True
        return False


class BlockchainVerifier:
    """Simulated blockchain verification (placeholder for real blockchain)."""

    def __init__(self):
        self.ledger: Dict[str, Dict] = {}  # Simulated blockchain ledger

    def record_credential(self, credential: CredentialRecord) -> str:
        """
        Record credential on blockchain.

        Returns transaction hash.
        """
        # In production, this would interact with real blockchain
        tx_data = {
            "certificate_number": credential.certificate_number,
            "user_id": credential.user_id,
            "level": credential.level,
            "issued_at": credential.issued_at.isoformat(),
            "verification_hash": credential.generate_verification_hash()
        }

        tx_hash = hashlib.sha256(json.dumps(tx_data).encode()).hexdigest()
        self.ledger[tx_hash] = tx_data

        return tx_hash

    def verify_credential(
        self,
        certificate_number: str,
        verification_hash: str
    ) -> bool:
        """
        Verify credential against blockchain ledger.

        Returns True if credential matches blockchain record.
        """
        # In production, this would query real blockchain
        for tx_data in self.ledger.values():
            if tx_data["certificate_number"] == certificate_number:
                # Verify hash matches
                expected_hash = hashlib.sha256(json.dumps(tx_data).encode()).hexdigest()
                return expected_hash == verification_hash
        return False


class CredentialVerifier:
    """Main credential verification system."""

    def __init__(self):
        self.database = CredentialDatabase()
        self.blockchain = BlockchainVerifier()
        self.verification_log: List[Dict] = []

    def issue_credential(
        self,
        user_id: str,
        level: str,
        name: str,
        email: str,
        expires_at: Optional[datetime] = None
    ) -> CredentialRecord:
        """
        Issue a new credential.

        Args:
            user_id: User identifier
            level: Certification level (associate, professional, expert)
            name: Recipient name
            email: Recipient email
            expires_at: Optional expiration date

        Returns:
            CredentialRecord
        """
        import uuid

        # Generate certificate number
        timestamp = datetime.now().strftime("%Y%m%d")
        unique = uuid.uuid4().hex[:8].upper()
        level_code = {
            "associate": "ASOC",
            "professional": "PROF",
            "expert": "EXPT"
        }.get(level, "CERT")
        certificate_number = f"{level_code}-{timestamp}-{unique}"

        # Generate verification code
        verification_data = f"{user_id}:{level}:{datetime.now().isoformat()}"
        verification_code = hashlib.sha256(verification_data.encode()).hexdigest()[:16].upper()

        # Create credential record
        credential = CredentialRecord(
            certificate_number=certificate_number,
            verification_code=verification_code,
            user_id=user_id,
            level=level,
            issued_at=datetime.now(),
            expires_at=expires_at,
            name=name,
            email=email
        )

        # Record on blockchain
        tx_hash = self.blockchain.record_credential(credential)
        credential.blockchain_tx_hash = tx_hash

        # Add to database
        self.database.add_credential(credential)

        return credential

    def verify_by_certificate_number(
        self,
        certificate_number: str
    ) -> VerificationResult:
        """
        Verify credential using certificate number.

        Args:
            certificate_number: Certificate number to verify

        Returns:
            VerificationResult
        """
        credential = self.database.get_by_certificate_number(certificate_number)

        if not credential:
            return VerificationResult(
                status=VerificationStatus.NOT_FOUND,
                message=f"Credential {certificate_number} not found"
            )

        # Check validity
        if credential.is_revoked:
            return VerificationResult(
                status=VerificationStatus.REVOKED,
                credential=credential,
                message=f"Credential revoked: {credential.revocation_reason}"
            )

        if credential.expires_at and datetime.now() > credential.expires_at:
            return VerificationResult(
                status=VerificationStatus.EXPIRED,
                credential=credential,
                message=f"Credential expired on {credential.expires_at.strftime('%Y-%m-%d')}"
            )

        # Verify against blockchain
        verification_hash = credential.generate_verification_hash()
        blockchain_valid = self.blockchain.verify_credential(
            certificate_number,
            verification_hash
        )

        if not blockchain_valid:
            return VerificationResult(
                status=VerificationStatus.INVALID,
                credential=credential,
                message="Blockchain verification failed"
            )

        return VerificationResult(
            status=VerificationStatus.VALID,
            credential=credential,
            message="Credential is valid",
            verification_method="blockchain"
        )

    def verify_by_code(
        self,
        verification_code: str
    ) -> VerificationResult:
        """
        Verify credential using verification code.

        Args:
            verification_code: Verification code from certificate

        Returns:
            VerificationResult
        """
        credential = self.database.get_by_verification_code(verification_code)

        if not credential:
            return VerificationResult(
                status=VerificationStatus.NOT_FOUND,
                message=f"Verification code {verification_code} not found"
            )

        # Use certificate number verification
        return self.verify_by_certificate_number(credential.certificate_number)

    def verify_by_user(
        self,
        user_id: str,
        level: Optional[str] = None
    ) -> List[VerificationResult]:
        """
        Verify all credentials for a user.

        Args:
            user_id: User identifier
            level: Optional level filter

        Returns:
            List of VerificationResults
        """
        credentials = self.database.get_by_user(user_id)

        if level:
            credentials = [c for c in credentials if c.level == level]

        return [
            self.verify_by_certificate_number(c.certificate_number)
            for c in credentials
        ]

    def revoke_credential(
        self,
        certificate_number: str,
        reason: str,
        admin_user_id: str
    ) -> bool:
        """
        Revoke a credential (admin only).

        Args:
            certificate_number: Certificate to revoke
            reason: Reason for revocation
            admin_user_id: Admin performing revocation

        Returns:
            True if successful
        """
        # In production, verify admin permissions
        success = self.database.revoke_credential(certificate_number, reason)

        if success:
            # Log revocation
            self.verification_log.append({
                "action": "revoke",
                "certificate_number": certificate_number,
                "reason": reason,
                "admin": admin_user_id,
                "timestamp": datetime.now().isoformat()
            })

        return success

    def get_verification_certificate(
        self,
        certificate_number: str
    ) -> Optional[Dict]:
        """
        Get verification certificate for sharing.

        Returns JSON data suitable for verification.
        """
        result = self.verify_by_certificate_number(certificate_number)

        if result.status == VerificationStatus.VALID:
            return {
                "certificate_number": result.credential.certificate_number,
                "verification_code": result.credential.verification_code,
                "level": result.credential.level,
                "issued_at": result.credential.issued_at.isoformat(),
                "expires_at": result.credential.expires_at.isoformat() if result.credential.expires_at else None,
                "is_valid": True,
                "verification_url": f"https://verify.superinstance.org/{certificate_number}",
                "qr_code": f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={certificate_number}"
            }

        return None

    def get_verification_badge(
        self,
        certificate_number: str
    ) -> Optional[str]:
        """
        Get verification badge HTML for embedding.

        Returns HTML snippet.
        """
        result = self.verify_by_certificate_number(certificate_number)

        if result.status == VerificationStatus.VALID:
            return f'''
            <div class="si-badge" data-certificate="{certificate_number}">
                <img src="https://superinstance.org/badges/{result.credential.level}.png"
                     alt="SuperInstance {result.credential.level.title()} Certified">
                <a href="https://verify.superinstance.org/{certificate_number}">
                    Verify Certificate
                </a>
            </div>
            '''

        return None


# Public API for verification
class PublicVerificationAPI:
    """Public API for credential verification."""

    def __init__(self, verifier: CredentialVerifier):
        self.verifier = verifier

    def verify(self, certificate_number: str) -> Dict:
        """
        Public verification endpoint.

        Args:
            certificate_number: Certificate to verify

        Returns:
            JSON response with verification status
        """
        result = self.verifier.verify_by_certificate_number(certificate_number)

        response = {
            "status": result.status.value,
            "message": result.message,
            "verified_at": result.verified_at.isoformat()
        }

        if result.credential:
            # Only return public information
            response["credential"] = {
                "certificate_number": result.credential.certificate_number,
                "level": result.credential.level,
                "issued_at": result.credential.issued_at.isoformat(),
                "expires_at": result.credential.expires_at.isoformat() if result.credential.expires_at else None,
                "is_valid": result.status == VerificationStatus.VALID
            }

        return response


# Example usage
if __name__ == "__main__":
    verifier = CredentialVerifier()

    # Issue a credential
    credential = verifier.issue_credential(
        user_id="user123",
        level="associate",
        name="Jane Doe",
        email="jane@example.com"
    )

    print(f"Issued credential: {credential.certificate_number}")
    print(f"Verification code: {credential.verification_code}")

    # Verify by certificate number
    result = verifier.verify_by_certificate_number(credential.certificate_number)
    print(f"\nVerification result: {result.status.value}")
    print(f"Message: {result.message}")

    # Get verification certificate
    cert_data = verifier.get_verification_certificate(credential.certificate_number)
    print(f"\nVerification certificate:")
    print(json.dumps(cert_data, indent=2))

    # Revoke credential
    verifier.revoke_credential(
        credential.certificate_number,
        reason="Administrative review",
        admin_user_id="admin1"
    )

    # Verify again
    result = verifier.verify_by_certificate_number(credential.certificate_number)
    print(f"\nAfter revocation: {result.status.value}")

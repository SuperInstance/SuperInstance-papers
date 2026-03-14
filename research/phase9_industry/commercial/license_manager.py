"""
SuperInstance License Manager
=============================

Enterprise license key generation, validation, and management.

Features:
- License key generation and validation
- Feature-based licensing
- Usage-based licensing
- Offline license activation
- License expiration and renewal
- License transfer and revocation

License Types:
- Trial (30 days)
- Research (perpetual, open-source)
- Strategic (annual subscription)
- Enterprise (annual subscription)
- Custom (negotiated)

Author: SuperInstance Enterprise Team
Version: 1.0.0
License: Enterprise (see partnership agreement)
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any, Set
from dataclasses import dataclass, field
import uuid
import hashlib
import json
import base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# License Types and Features
# ============================================================================

class LicenseType(str, Enum):
    """License types"""
    TRIAL = "trial"
    RESEARCH = "research"
    STRATEGIC = "strategic"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"


class Feature(str, Enum):
    """Licensed features"""
    # Core features
    BASIC_COORDINATION = "basic_coordination"
    ADVANCED_COORDINATION = "advanced_coordination"
    DISTRIBUTED_CONSENSUS = "distributed_consensus"
    FAULT_TOLERANCE = "fault_tolerance"
    SCALABLE_DISPATCH = "scalable_dispatch"

    # Enterprise features
    API_ACCESS = "api_access"
    WEBHOOKS = "webhooks"
    CUSTOM_INTEGRATIONS = "custom_integrations"
    WHITE_LABELING = "white_labeling"

    # Advanced features
    GPU_ACCELERATION = "gpu_acceleration"
    EDGE_DEPLOYMENT = "edge_deployment"
    AIRGAP_DEPLOYMENT = "airgap_deployment"
    MULTI_REGION = "multi_region"

    # Compliance features
    SOC2_REPORT = "soc2_report"
    GDPR_TOOLS = "gdpr_tools"
    HIPAA_MODE = "hipaa_mode"
    AUDIT_LOGGING = "audit_logging"
    COMPLIANCE_REPORTS = "compliance_reports"

    # Support features
    COMMUNITY_SUPPORT = "community_support"
    EMAIL_SUPPORT = "email_support"
    PRIORITY_SUPPORT = "priority_support"
    DEDICATED_SUPPORT = "dedicated_support"
    24_7_SUPPORT = "24_7_support"

    # Custom features
    CUSTOM_FEATURE_1 = "custom_feature_1"
    CUSTOM_FEATURE_2 = "custom_feature_2"
    CUSTOM_FEATURE_3 = "custom_feature_3"


# ============================================================================
# Tier Feature Sets
# ============================================================================

TIER_FEATURES = {
    LicenseType.RESEARCH: {
        Feature.BASIC_COORDINATION,
        Feature.FAULT_TOLERANCE,
        Feature.COMMUNITY_SUPPORT,
        Feature.AUDIT_LOGGING,
    },
    LicenseType.STRATEGIC: {
        Feature.BASIC_COORDINATION,
        Feature.ADVANCED_COORDINATION,
        Feature.DISTRIBUTED_CONSENSUS,
        Feature.FAULT_TOLERANCE,
        Feature.SCALABLE_DISPATCH,
        Feature.API_ACCESS,
        Feature.WEBHOOKS,
        Feature.CUSTOM_INTEGRATIONS,
        Feature.GPU_ACCELERATION,
        Feature.EDGE_DEPLOYMENT,
        Feature.SOC2_REPORT,
        Feature.GDPR_TOOLS,
        Feature.AUDIT_LOGGING,
        Feature.COMPLIANCE_REPORTS,
        Feature.EMAIL_SUPPORT,
        Feature.PRIORITY_SUPPORT,
    },
    LicenseType.ENTERPRISE: {
        # All features available
        Feature.BASIC_COORDINATION,
        Feature.ADVANCED_COORDINATION,
        Feature.DISTRIBUTED_CONSENSUS,
        Feature.FAULT_TOLERANCE,
        Feature.SCALABLE_DISPATCH,
        Feature.API_ACCESS,
        Feature.WEBHOOKS,
        Feature.CUSTOM_INTEGRATIONS,
        Feature.WHITE_LABELING,
        Feature.GPU_ACCELERATION,
        Feature.EDGE_DEPLOYMENT,
        Feature.AIRGAP_DEPLOYMENT,
        Feature.MULTI_REGION,
        Feature.SOC2_REPORT,
        Feature.GDPR_TOOLS,
        Feature.HIPAA_MODE,
        Feature.AUDIT_LOGGING,
        Feature.COMPLIANCE_REPORTS,
        Feature.DEDICATED_SUPPORT,
        Feature.PRIORITY_SUPPORT,
        Feature._24_7_SUPPORT,
    }
}


# ============================================================================
# License Model
# ============================================================================

@dataclass
class License:
    """License instance"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    license_type: LicenseType = LicenseType.RESEARCH
    organization: str = ""
    contact_email: str = ""
    features: Set[Feature] = field(default_factory=set)
    issued_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    max_agents: int = -1  # -1 = unlimited
    max_api_calls_per_day: int = -1
    max_storage_gb: int = -1
    allowed_domains: List[str] = field(default_factory=list)
    allowed_ips: List[str] = field(default_factory=list)
    custom_limits: Dict[str, Any] = field(default_factory=dict)
    is_active: bool = True
    renewal_grace_period_days: int = 30

    # Usage tracking
    current_agents: int = 0
    api_calls_today: int = 0
    storage_used_gb: float = 0.0

    # Validation
    signature: Optional[str] = None
    checksum: Optional[str] = None

    def calculate_checksum(self) -> str:
        """Calculate license checksum"""
        license_dict = {
            'id': self.id,
            'license_type': self.license_type.value,
            'organization': self.organization,
            'contact_email': self.contact_email,
            'features': sorted([f.value for f in self.features]),
            'issued_at': self.issued_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'max_agents': self.max_agents,
            'max_api_calls_per_day': self.max_api_calls_per_day,
            'max_storage_gb': self.max_storage_gb,
            'allowed_domains': sorted(self.allowed_domains),
            'allowed_ips': sorted(self.allowed_ips),
            'custom_limits': self.custom_limits,
        }

        json_str = json.dumps(license_dict, sort_keys=True)
        return hashlib.sha256(json_str.encode()).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'license_type': self.license_type.value,
            'organization': self.organization,
            'contact_email': self.contact_email,
            'features': [f.value for f in self.features],
            'issued_at': self.issued_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'max_agents': self.max_agents,
            'max_api_calls_per_day': self.max_api_calls_per_day,
            'max_storage_gb': self.max_storage_gb,
            'allowed_domains': self.allowed_domains,
            'allowed_ips': self.allowed_ips,
            'custom_limits': self.custom_limits,
            'is_active': self.is_active,
            'checksum': self.checksum,
            'signature': self.signature,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'License':
        """Create from dictionary"""
        license_obj = cls(
            id=data['id'],
            license_type=LicenseType(data['license_type']),
            organization=data['organization'],
            contact_email=data['contact_email'],
            features=set(Feature(f) for f in data['features']),
            issued_at=datetime.fromisoformat(data['issued_at']),
            expires_at=datetime.fromisoformat(data['expires_at']) if data.get('expires_at') else None,
            max_agents=data['max_agents'],
            max_api_calls_per_day=data['max_api_calls_per_day'],
            max_storage_gb=data['max_storage_gb'],
            allowed_domains=data.get('allowed_domains', []),
            allowed_ips=data.get('allowed_ips', []),
            custom_limits=data.get('custom_limits', {}),
            is_active=data.get('is_active', True),
            checksum=data.get('checksum'),
            signature=data.get('signature'),
        )
        return license_obj


# ============================================================================
# License Manager
# ============================================================================

class LicenseManager:
    """License generation and validation"""

    def __init__(self, private_key=None, public_key=None):
        self.private_key = private_key or self._generate_private_key()
        self.public_key = public_key or self.private_key.public_key()
        self.licenses: Dict[str, License] = {}

    def _generate_private_key(self):
        """Generate RSA key pair for signing"""
        return rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )

    def generate_license(self,
                        license_type: LicenseType,
                        organization: str,
                        contact_email: str,
                        duration_days: Optional[int] = None,
                        **kwargs) -> License:
        """Generate new license"""
        # Get features for tier
        if license_type in TIER_FEATURES:
            features = TIER_FEATURES[license_type].copy()
        else:
            features = kwargs.get('features', set())

        # Calculate expiration
        expires_at = None
        if duration_days:
            expires_at = datetime.utcnow() + timedelta(days=duration_days)
        elif license_type != LicenseType.RESEARCH:
            # Default to 1 year for paid tiers
            expires_at = datetime.utcnow() + timedelta(days=365)

        # Create license
        license_obj = License(
            license_type=license_type,
            organization=organization,
            contact_email=contact_email,
            features=features,
            expires_at=expires_at,
            **kwargs
        )

        # Calculate checksum
        license_obj.checksum = license_obj.calculate_checksum()

        # Sign license
        license_obj.signature = self._sign_license(license_obj)

        # Store license
        self.licenses[license_obj.id] = license_obj

        logger.info(f"Generated {license_type.value} license for {organization}")
        return license_obj

    def _sign_license(self, license_obj: License) -> str:
        """Sign license with private key"""
        message = license_obj.checksum.encode()
        signature = self.private_key.sign(
            message,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return base64.b64encode(signature).decode()

    def validate_license(self, license_obj: License, check_domain: Optional[str] = None, check_ip: Optional[str] = None) -> Dict[str, Any]:
        """Validate license"""
        validation_result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }

        # Check if active
        if not license_obj.is_active:
            validation_result['valid'] = False
            validation_result['errors'].append("License is not active")

        # Check expiration
        if license_obj.expires_at and datetime.utcnow() > license_obj.expires_at:
            # Check grace period
            grace_expiry = license_obj.expires_at + timedelta(days=license_obj.renewal_grace_period_days)
            if datetime.utcnow() > grace_expiry:
                validation_result['valid'] = False
                validation_result['errors'].append("License has expired")
            else:
                validation_result['warnings'].append("License is in grace period")

        # Check domain
        if check_domain and license_obj.allowed_domains:
            if check_domain not in license_obj.allowed_domains:
                validation_result['valid'] = False
                validation_result['errors'].append(f"Domain {check_domain} not allowed")

        # Check IP
        if check_ip and license_obj.allowed_ips:
            if check_ip not in license_obj.allowed_ips:
                validation_result['valid'] = False
                validation_result['errors'].append(f"IP {check_ip} not allowed")

        # Verify signature
        if not self._verify_signature(license_obj):
            validation_result['valid'] = False
            validation_result['errors'].append("Invalid license signature")

        # Verify checksum
        calculated_checksum = license_obj.calculate_checksum()
        if calculated_checksum != license_obj.checksum:
            validation_result['valid'] = False
            validation_result['errors'].append("License checksum mismatch")

        return validation_result

    def _verify_signature(self, license_obj: License) -> bool:
        """Verify license signature"""
        if not license_obj.signature:
            return False

        try:
            signature = base64.b64decode(license_obj.signature)
            message = license_obj.checksum.encode()

            self.public_key.verify(
                signature,
                message,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except Exception as e:
            logger.error(f"Signature verification failed: {e}")
            return False

    def check_feature_access(self, license_obj: License, feature: Feature) -> bool:
        """Check if license has feature access"""
        validation = self.validate_license(license_obj)
        if not validation['valid']:
            return False

        return feature in license_obj.features

    def check_usage_limits(self, license_obj: License) -> Dict[str, Any]:
        """Check usage limits"""
        usage = {
            'within_limits': True,
            'limits': {}
        }

        # Check agent limit
        if license_obj.max_agents >= 0:
            agent_usage = license_obj.current_agents / license_obj.max_agents
            usage['limits']['agents'] = {
                'current': license_obj.current_agents,
                'max': license_obj.max_agents,
                'percentage': agent_usage * 100,
                'within_limit': license_obj.current_agents <= license_obj.max_agents
            }
            if license_obj.current_agents > license_obj.max_agents:
                usage['within_limits'] = False

        # Check API call limit
        if license_obj.max_api_calls_per_day >= 0:
            api_usage = license_obj.api_calls_today / license_obj.max_api_calls_per_day
            usage['limits']['api_calls'] = {
                'current': license_obj.api_calls_today,
                'max': license_obj.max_api_calls_per_day,
                'percentage': api_usage * 100,
                'within_limit': license_obj.api_calls_today <= license_obj.max_api_calls_per_day
            }
            if license_obj.api_calls_today > license_obj.max_api_calls_per_day:
                usage['within_limits'] = False

        # Check storage limit
        if license_obj.max_storage_gb >= 0:
            storage_usage = license_obj.storage_used_gb / license_obj.max_storage_gb
            usage['limits']['storage'] = {
                'current_gb': license_obj.storage_used_gb,
                'max_gb': license_obj.max_storage_gb,
                'percentage': storage_usage * 100,
                'within_limit': license_obj.storage_used_gb <= license_obj.max_storage_gb
            }
            if license_obj.storage_used_gb > license_obj.max_storage_gb:
                usage['within_limits'] = False

        return usage

    def renew_license(self, license_id: str, duration_days: int = 365) -> License:
        """Renew existing license"""
        license_obj = self.licenses.get(license_id)
        if not license_obj:
            raise ValueError(f"License {license_id} not found")

        # Extend expiration
        if license_obj.expires_at:
            license_obj.expires_at = license_obj.expires_at + timedelta(days=duration_days)
        else:
            license_obj.expires_at = datetime.utcnow() + timedelta(days=duration_days)

        # Re-sign license
        license_obj.checksum = license_obj.calculate_checksum()
        license_obj.signature = self._sign_license(license_obj)

        logger.info(f"Renewed license {license_id} for {duration_days} days")
        return license_obj

    def revoke_license(self, license_id: str, reason: str = ""):
        """Revoke license"""
        license_obj = self.licenses.get(license_id)
        if not license_obj:
            raise ValueError(f"License {license_id} not found")

        license_obj.is_active = False
        logger.info(f"Revoked license {license_id}. Reason: {reason}")

    def export_license_key(self, license_obj: License) -> str:
        """Export license as encoded key string"""
        license_dict = license_obj.to_dict()
        json_str = json.dumps(license_dict)
        encoded = base64.b64encode(json_str.encode()).decode()
        return encoded

    def import_license_key(self, license_key: str) -> License:
        """Import license from encoded key string"""
        try:
            json_str = base64.b64decode(license_key).decode()
            license_dict = json.loads(json_str)
            license_obj = License.from_dict(license_dict)
            return license_obj
        except Exception as e:
            logger.error(f"Failed to import license: {e}")
            raise ValueError("Invalid license key format")


# ============================================================================
# License Server (for online validation)
# ============================================================================

class LicenseServer:
    """Online license validation server"""

    def __init__(self, license_manager: LicenseManager):
        self.license_manager = license_manager
        self.activation_records: Dict[str, Dict[str, Any]] = {}

    def activate_license(self, license_key: str, machine_id: str) -> Dict[str, Any]:
        """Activate license on machine"""
        try:
            # Import license
            license_obj = self.license_manager.import_license_key(license_key)

            # Validate license
            validation = self.license_manager.validate_license(license_obj)
            if not validation['valid']:
                return {
                    'success': False,
                    'errors': validation['errors']
                }

            # Check if already activated on too many machines
            existing_activations = [
                r for r in self.activation_records.values()
                if r['license_id'] == license_obj.id and r['active']
            ]

            max_activations = self._get_max_activations(license_obj.license_type)
            if len(existing_activations) >= max_activations:
                return {
                    'success': False,
                    'errors': [f"Maximum activations ({max_activations}) exceeded"]
                }

            # Create activation record
            activation_id = str(uuid.uuid4())
            self.activation_records[activation_id] = {
                'activation_id': activation_id,
                'license_id': license_obj.id,
                'machine_id': machine_id,
                'activated_at': datetime.utcnow().isoformat(),
                'active': True,
                'last_seen': datetime.utcnow().isoformat()
            }

            return {
                'success': True,
                'activation_id': activation_id,
                'license': license_obj.to_dict(),
                'expires_at': license_obj.expires_at.isoformat() if license_obj.expires_at else None
            }

        except Exception as e:
            logger.error(f"Activation failed: {e}")
            return {
                'success': False,
                'errors': [str(e)]
            }

    def deactivate_license(self, activation_id: str) -> bool:
        """Deactivate license"""
        record = self.activation_records.get(activation_id)
        if not record:
            return False

        record['active'] = False
        record['deactivated_at'] = datetime.utcnow().isoformat()
        return True

    def validate_activation(self, activation_id: str, machine_id: str) -> Dict[str, Any]:
        """Validate license activation"""
        record = self.activation_records.get(activation_id)
        if not record:
            return {'valid': False, 'errors': ['Activation not found']}

        if not record['active']:
            return {'valid': False, 'errors': ['Activation is inactive']}

        if record['machine_id'] != machine_id:
            return {'valid': False, 'errors': ['Machine ID mismatch']}

        # Get license
        license_obj = self.license_manager.licenses.get(record['license_id'])
        if not license_obj:
            return {'valid': False, 'errors': ['License not found']}

        # Validate license
        validation = self.license_manager.validate_license(license_obj)

        # Update last seen
        record['last_seen'] = datetime.utcnow().isoformat()

        return validation

    def _get_max_activations(self, license_type: LicenseType) -> int:
        """Get maximum activations for license type"""
        if license_type == LicenseType.RESEARCH:
            return -1  # Unlimited
        elif license_type == LicenseType.STRATEGIC:
            return 5
        elif license_type == LicenseType.ENTERPRISE:
            return 50
        else:
            return 1


# ============================================================================
# Offline Activation
# ============================================================================

class OfflineLicenseManager:
    """Offline license activation (for air-gapped deployments)"""

    @staticmethod
    def generate_machine_id() -> str:
        """Generate unique machine ID"""
        import platform
        import subprocess

        system_info = {
            'platform': platform.platform(),
            'machine': platform.machine(),
            'processor': platform.processor(),
        }

        # Try to get MAC address
        try:
            mac = ':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0, 48, 8)][::-1])
            system_info['mac'] = mac
        except:
            pass

        # Generate hash
        info_str = json.dumps(system_info, sort_keys=True)
        machine_id = hashlib.sha256(info_str.encode()).hexdigest()

        return machine_id

    @staticmethod
    def generate_activation_request(license_key: str) -> str:
        """Generate offline activation request"""
        machine_id = OfflineLicenseManager.generate_machine_id()

        request = {
            'license_key': license_key,
            'machine_id': machine_id,
            'requested_at': datetime.utcnow().isoformat()
        }

        request_json = json.dumps(request)
        return base64.b64encode(request_json.encode()).decode()

    @staticmethod
    def process_activation_request(request_str: str, license_manager: LicenseManager) -> str:
        """Process offline activation request (on online machine)"""
        try:
            # Decode request
            request_json = base64.b64decode(request_str).decode()
            request = json.loads(request_json)

            # Import license
            license_obj = license_manager.import_license_key(request['license_key'])

            # Validate
            validation = license_manager.validate_license(license_obj)
            if not validation['valid']:
                raise ValueError(f"Invalid license: {validation['errors']}")

            # Create activation token
            activation_token = {
                'license_id': license_obj.id,
                'machine_id': request['machine_id'],
                'activated_at': datetime.utcnow().isoformat(),
                'expires_at': license_obj.expires_at.isoformat() if license_obj.expires_at else None,
                'features': [f.value for f in license_obj.features],
            }

            # Sign activation token
            token_json = json.dumps(activation_token, sort_keys=True)
            signature = license_manager._sign_license(license_obj)  # Reuse signing

            # Combine token and signature
            activation_response = {
                'token': activation_token,
                'signature': signature
            }

            response_json = json.dumps(activation_response)
            return base64.b64encode(response_json.encode()).decode()

        except Exception as e:
            logger.error(f"Failed to process activation request: {e}")
            raise

    @staticmethod
    def validate_activation_token(token_str: str, public_key) -> Dict[str, Any]:
        """Validate activation token (on offline machine)"""
        try:
            # Decode token
            token_json = base64.b64decode(token_str).decode()
            token_data = json.loads(token_json)

            token = token_data['token']
            signature = token_data['signature']

            # Verify signature (implementation depends on key format)
            # This is simplified - implement proper verification

            return {
                'valid': True,
                'license': token
            }

        except Exception as e:
            logger.error(f"Failed to validate activation token: {e}")
            return {'valid': False, 'errors': [str(e)]}


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == "__main__":
    # Create license manager
    manager = LicenseManager()

    # Generate strategic license
    license = manager.generate_license(
        license_type=LicenseType.STRATEGIC,
        organization="Acme Corp",
        contact_email="it@acme.com",
        duration_days=365,
        max_agents=1000,
        max_api_calls_per_day=100000,
        max_storage_gb=1000,
        allowed_domains=["acme.com", "*.acme.com"]
    )

    print(f"Generated license: {license.id}")
    print(f"Organization: {license.organization}")
    print(f"Type: {license.license_type.value}")
    print(f"Expires: {license.expires_at}")
    print(f"Features: {[f.value for f in license.features]}")

    # Validate license
    validation = manager.validate_license(license, check_domain="acme.com")
    print(f"Validation: {validation}")

    # Check feature access
    has_api = manager.check_feature_access(license, Feature.API_ACCESS)
    print(f"Has API access: {has_api}")

    # Export license key
    license_key = manager.export_license_key(license)
    print(f"License key: {license_key[:50]}...")

    # Online activation
    server = LicenseServer(manager)
    machine_id = OfflineLicenseManager.generate_machine_id()

    activation = server.activate_license(license_key, machine_id)
    print(f"Activation: {activation}")

    # Offline activation
    activation_request = OfflineLicenseManager.generate_activation_request(license_key)
    print(f"Activation request: {activation_request[:50]}...")

    activation_response = OfflineLicenseManager.process_activation_request(activation_request, manager)
    print(f"Activation response: {activation_response[:50]}...")

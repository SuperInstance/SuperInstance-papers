"""
Compliance Boundary Enforcement for SuperInstance Production

Enforces data sovereignty requirements, GDPR, CCPA, and other
regulatory compliance across multi-region deployment.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ComplianceZone(Enum):
    """Regulatory compliance zones"""
    GDPR_EU = "gdpr_eu"           # European Union GDPR
    CCPA_US = "ccpa_us"           # California CCPA
    LGPD_BR = "lgpd_br"           # Brazil LGPD
    PIPL_CN = "pipl_cn"           # China PIPL
    PIPA_CA = "pipa_ca"           # Canada PIPA
    APAC = "apac"                 # Asia-Pacific general
    GLOBAL = "global"             # No restrictions


class DataType(Enum):
    """Types of data with different sensitivity levels"""
    PII = "pii"                   # Personally Identifiable Information
    HEALTH = "health"             # Health data (HIPAA)
    FINANCIAL = "financial"       # Financial data
    BEHAVIORAL = "behavioral"     # User behavioral data
    ANALYTICS = "analytics"       # Anonymous analytics
    PUBLIC = "public"             # Public data


@dataclass
class ComplianceRule:
    """Rule for data handling compliance"""
    rule_id: str
    name: str
    description: str
    applies_to_zones: List[ComplianceZone]
    applies_to_data_types: List[DataType]
    allowed_regions: Set[str]
    prohibited_regions: Set[str]
    encryption_required: bool = True
    retention_days: Optional[int] = None
    right_to_deletion: bool = True
    right_to_portability: bool = True


@dataclass
class DataAccessRequest:
    """Request to access data"""
    request_id: str
    data_key: str
    data_type: DataType
    source_country: str
    user_consent: bool
    purpose: str
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ComplianceResult:
    """Result of compliance check"""
    is_compliant: bool
    reason: str
    allowed_regions: List[str]
    prohibited_regions: List[str]
    additional_requirements: List[str]


class ComplianceEnforcer:
    """
    Enforces compliance boundaries for data storage and access
    """

    def __init__(self):
        # Define compliance rules
        self.rules: List[ComplianceRule] = self._initialize_rules()

        # Region to compliance zone mapping
        self.region_zones: Dict[str, Set[ComplianceZone]] = self._initialize_regions()

        # Country to compliance zone mapping
        self.country_zones: Dict[str, ComplianceZone] = self._initialize_countries()

        # Audit log
        self.audit_log: List[Dict] = []

        # Compliance statistics
        self.stats = {
            "total_checks": 0,
            "compliant": 0,
            "non_compliant": 0,
            "blocks_enforced": 0,
            "data_deletion_requests": 0,
            "data_portability_requests": 0
        }

    def _initialize_rules(self) -> List[ComplianceRule]:
        """Initialize compliance rules"""
        return [
            # GDPR Rule
            ComplianceRule(
                rule_id="gdpr-001",
                name="EU Data Sovereignty",
                description="EU personal data must remain in EU",
                applies_to_zones=[ComplianceZone.GDPR_EU],
                applies_to_data_types=[DataType.PII, DataType.BEHAVIORAL],
                allowed_regions={
                    "aws-eu-west-1", "aws-eu-central-1",
                    "gcp-europe-west1", "gcp-europe-west4",
                    "azure-westeurope", "azure-northeurope"
                },
                prohibited_regions={
                    "aws-us-east-1", "aws-us-west-2",
                    "aws-ap-southeast-1"
                },
                encryption_required=True,
                retention_days=None,
                right_to_deletion=True,
                right_to_portability=True
            ),

            # CCPA Rule
            ComplianceRule(
                rule_id="ccpa-001",
                name="California Privacy Rights",
                description="California resident data protections",
                applies_to_zones=[ComplianceZone.CCPA_US],
                applies_to_data_types=[DataType.PII, DataType.BEHAVIORAL],
                allowed_regions={
                    "aws-us-west-2", "gcp-us-west1",
                    "azure-westus2", "aws-us-east-1"
                },
                prohibited_regions={
                    "aws-eu-west-1", "aws-ap-southeast-1"
                },
                encryption_required=True,
                retention_days=None,
                right_to_deletion=True,
                right_to_portability=True
            ),

            # Health Data (HIPAA)
            ComplianceRule(
                rule_id="hipaa-001",
                name="Health Data Protection",
                description="HIPAA compliant health data storage",
                applies_to_zones=[ComplianceZone.GLOBAL],
                applies_to_data_types=[DataType.HEALTH],
                allowed_regions={
                    "aws-us-east-1", "aws-us-west-2",
                    "gcp-us-central1", "gcp-us-east1",
                    "azure-eastus", "azure-westus"
                },
                prohibited_regions=set(),
                encryption_required=True,
                retention_days=365 * 6,  # 6 years
                right_to_deletion=True,
                right_to_portability=True
            ),

            # Financial Data
            ComplianceRule(
                rule_id="financial-001",
                name="Financial Data Security",
                description="Financial data handling requirements",
                applies_to_zones=[ComplianceZone.GLOBAL],
                applies_to_data_types=[DataType.FINANCIAL],
                allowed_regions={
                    "aws-us-east-1", "aws-us-west-2",
                    "gcp-us-central1", "azure-eastus"
                },
                prohibited_regions=set(),
                encryption_required=True,
                retention_days=365 * 7,  # 7 years
                right_to_deletion=False,  # Regulatory retention
                right_to_portability=True
            ),

            # Analytics Data (More flexible)
            ComplianceRule(
                rule_id="analytics-001",
                name="Analytics Data Distribution",
                description="Anonymous analytics can be global",
                applies_to_zones=[ComplianceZone.GLOBAL],
                applies_to_data_types=[DataType.ANALYTICS, DataType.PUBLIC],
                allowed_regions=set(),  # All regions allowed
                prohibited_regions=set(),
                encryption_required=False,
                retention_days=90,
                right_to_deletion=True,
                right_to_portability=False
            )
        ]

    def _initialize_regions(self) -> Dict[str, Set[ComplianceZone]]:
        """Map regions to compliance zones"""
        return {
            # EU Regions
            "aws-eu-west-1": {ComplianceZone.GDPR_EU},
            "aws-eu-central-1": {ComplianceZone.GDPR_EU},
            "gcp-europe-west1": {ComplianceZone.GDPR_EU},
            "gcp-europe-west4": {ComplianceZone.GDPR_EU},
            "azure-westeurope": {ComplianceZone.GDPR_EU},
            "azure-northeurope": {ComplianceZone.GDPR_EU},

            # US Regions
            "aws-us-east-1": {ComplianceZone.CCPA_US, ComplianceZone.GLOBAL},
            "aws-us-west-2": {ComplianceZone.CCPA_US, ComplianceZone.GLOBAL},
            "gcp-us-central1": {ComplianceZone.CCPA_US, ComplianceZone.GLOBAL},
            "gcp-us-west1": {ComplianceZone.CCPA_US, ComplianceZone.GLOBAL},
            "azure-eastus": {ComplianceZone.CCPA_US, ComplianceZone.GLOBAL},
            "azure-westus2": {ComplianceZone.CCPA_US, ComplianceZone.GLOBAL},

            # Asia Pacific
            "aws-ap-southeast-1": {ComplianceZone.APAC},
            "aws-ap-northeast-1": {ComplianceZone.APAC},
            "gcp-asia-east1": {ComplianceZone.APAC},
            "gcp-asia-southeast1": {ComplianceZone.APAC},
            "azure-southeastasia": {ComplianceZone.APAC},
            "azure-eastasia": {ComplianceZone.APAC},
        }

    def _initialize_countries(self) -> Dict[str, ComplianceZone]:
        """Map countries to compliance zones"""
        return {
            # EU Countries
            "DE": ComplianceZone.GDPR_EU,
            "FR": ComplianceZone.GDPR_EU,
            "GB": ComplianceZone.GDPR_EU,
            "IT": ComplianceZone.GDPR_EU,
            "ES": ComplianceZone.GDPR_EU,
            "NL": ComplianceZone.GDPR_EU,
            "BE": ComplianceZone.GDPR_EU,
            "AT": ComplianceZone.GDPR_EU,
            "SE": ComplianceZone.GDPR_EU,
            "PL": ComplianceZone.GDPR_EU,

            # US
            "US": ComplianceZone.CCPA_US,

            # Others default to global
            "CA": ComplianceZone.GLOBAL,
            "AU": ComplianceZone.GLOBAL,
            "JP": ComplianceZone.GLOBAL,
            "SG": ComplianceZone.GLOBAL,
        }

    def check_compliance(self, request: DataAccessRequest) -> ComplianceResult:
        """
        Check if data access request is compliant

        Args:
            request: Data access request

        Returns:
            Compliance check result
        """
        self.stats["total_checks"] += 1

        # Determine applicable rules
        applicable_rules = []
        for rule in self.rules:
            # Check if rule applies to this data type
            if request.data_type not in rule.applies_to_data_types:
                continue

            # Check if rule applies to this zone
            user_zone = self.country_zones.get(
                request.source_country,
                ComplianceZone.GLOBAL
            )

            if user_zone in rule.applies_to_zones:
                applicable_rules.append(rule)

        if not applicable_rules:
            # No specific rules, allow
            self.stats["compliant"] += 1
            return ComplianceResult(
                is_compliant=True,
                reason="No specific compliance rules apply",
                allowed_regions=list(self.region_zones.keys()),
                prohibited_regions=[],
                additional_requirements=[]
            )

        # Collect constraints from all rules
        allowed = set(self.region_zones.keys())
        prohibited = set()
        requirements = []

        for rule in applicable_rules:
            # Intersect allowed regions
            if rule.allowed_regions:
                allowed = allowed.intersection(rule.allowed_regions)

            # Union prohibited regions
            prohibited = prohibited.union(rule.prohibited_regions)

            # Collect requirements
            if rule.encryption_required:
                requirements.append("Encryption required")
            if rule.retention_days:
                requirements.append(f"Retention limit: {rule.retention_days} days")
            if not rule.right_to_deletion:
                requirements.append("Data cannot be deleted (regulatory retention)")

        # Remove prohibited regions from allowed
        allowed = allowed - prohibited

        # Check compliance
        is_compliant = len(allowed) > 0

        # Determine reason
        if not is_compliant:
            reason = f"Prohibited by compliance rules: {', '.join(prohibited)}"
            self.stats["non_compliant"] += 1
            self.stats["blocks_enforced"] += 1
        else:
            reason = f"Allowed in {len(allowed)} compliant regions"
            self.stats["compliant"] += 1

        # Log check
        self._log_check(request, is_compliant, applicable_rules)

        return ComplianceResult(
            is_compliant=is_compliant,
            reason=reason,
            allowed_regions=list(allowed),
            prohibited_regions=list(prohibited),
            additional_requirements=requirements
        )

    def _log_check(self, request: DataAccessRequest,
                   is_compliant: bool,
                   rules: List[ComplianceRule]):
        """Log compliance check"""
        self.audit_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": request.request_id,
            "data_type": request.data_type.value,
            "source_country": request.source_country,
            "is_compliant": is_compliant,
            "applicable_rules": [r.rule_id for r in rules]
        })

    def get_allowed_regions(self, data_type: DataType,
                           source_country: str) -> List[str]:
        """
        Get allowed regions for data

        Args:
            data_type: Type of data
            source_country: Source country

        Returns:
            List of allowed regions
        """
        request = DataAccessRequest(
            request_id=f"check-{datetime.utcnow().timestamp()}",
            data_key="",
            data_type=data_type,
            source_country=source_country,
            user_consent=True,
            purpose="storage"
        )

        result = self.check_compliance(request)
        return result.allowed_regions if result.is_compliant else []

    def request_data_deletion(self, user_id: str, source_country: str) -> bool:
        """
        Process data deletion request (GDPR right to erasure)

        Args:
            user_id: User identifier
            source_country: User's country

        Returns:
            True if deletion allowed
        """
        self.stats["data_deletion_requests"] += 1

        # Check if deletion is allowed
        user_zone = self.country_zones.get(source_country, ComplianceZone.GLOBAL)

        # GDPR and CCPA allow deletion
        if user_zone in [ComplianceZone.GDPR_EU, ComplianceZone.CCPA_US]:
            logger.info(f"Data deletion approved for user {user_id} from {source_country}")
            return True

        # Some regulations require retention (e.g., financial)
        logger.warning(f"Data deletion denied for user {user_id} from {source_country} - regulatory retention")
        return False

    def request_data_portability(self, user_id: str,
                                source_country: str) -> bool:
        """
        Process data portability request (GDPR right to portability)

        Args:
            user_id: User identifier
            source_country: User's country

        Returns:
            True if portability allowed
        """
        self.stats["data_portability_requests"] += 1

        # Check if portability is allowed
        user_zone = self.country_zones.get(source_country, ComplianceZone.GLOBAL)

        # GDPR allows portability
        if user_zone == ComplianceZone.GDPR_EU:
            logger.info(f"Data portability approved for user {user_id} from {source_country}")
            return True

        logger.info(f"Data portability approved for user {user_id} from {source_country}")
        return True

    def get_compliance_stats(self) -> Dict:
        """Get compliance statistics"""
        total = self.stats["total_checks"]
        return {
            **self.stats,
            "compliance_rate": (
                self.stats["compliant"] / max(1, total) * 100
            )
        }

    def generate_compliance_report(self) -> Dict:
        """Generate compliance report"""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "summary": self.get_compliance_stats(),
            "active_rules": len(self.rules),
            "monitored_regions": len(self.region_zones),
            "monitored_countries": len(self.country_zones),
            "recent_audit_entries": len(self.audit_log)
        }


async def simulate_compliance_checks():
    """Simulate compliance checking scenarios"""
    enforcer = ComplianceEnforcer()

    print("=" * 60)
    print("SuperInstance Compliance Boundary Enforcement")
    print("=" * 60)

    print(f"\nCompliance Configuration:")
    print(f"  Active Rules: {len(enforcer.rules)}")
    print(f"  Monitored Regions: {len(enforcer.region_zones)}")
    print(f"  Monitored Countries: {len(enforcer.country_zones)}")

    # Show rules
    print("\nCompliance Rules:")
    for rule in enforcer.rules:
        print(f"\n  {rule.rule_id}: {rule.name}")
        print(f"    Description: {rule.description}")
        print(f"    Data Types: {', '.join(dt.value for dt in rule.applies_to_data_types)}")
        print(f"    Allowed Regions: {len(rule.allowed_regions)}")
        print(f"    Encryption Required: {rule.encryption_required}")

    # Simulate compliance checks
    print("\n" + "=" * 60)
    print("Simulating Compliance Checks")
    print("=" * 60)

    test_cases = [
        ("German user PII data", "DE", DataType.PII),
        ("California user behavioral data", "US", DataType.BEHAVIORAL),
        ("US user health data", "US", DataType.HEALTH),
        ("Global user analytics data", "AU", DataType.ANALYTICS),
        ("French user financial data", "FR", DataType.FINANCIAL),
    ]

    for description, country, data_type in test_cases:
        request = DataAccessRequest(
            request_id=f"test-{country}-{data_type.value}",
            data_key="test-key",
            data_type=data_type,
            source_country=country,
            user_consent=True,
            purpose="storage"
        )

        result = enforcer.check_compliance(request)

        status = "✓ Compliant" if result.is_compliant else "✗ Non-Compliant"
        print(f"\n  {description}:")
        print(f"    Status: {status}")
        print(f"    Reason: {result.reason}")
        if result.is_compliant:
            print(f"    Allowed Regions: {len(result.allowed_regions)}")
            print(f"      {', '.join(sorted(result.allowed_regions)[:5])}")
        else:
            print(f"    Prohibited Regions: {', '.join(result.prohibited_regions)}")

        if result.additional_requirements:
            print(f"    Requirements:")
            for req in result.additional_requirements:
                print(f"      - {req}")

    # Show statistics
    print("\n" + "=" * 60)
    print("Compliance Statistics")
    print("=" * 60)

    stats = enforcer.get_compliance_stats()
    print(f"\nTotal Checks: {stats['total_checks']}")
    print(f"Compliant: {stats['compliant']}")
    print(f"Non-Compliant: {stats['non_compliant']}")
    print(f"Blocks Enforced: {stats['blocks_enforced']}")
    print(f"Compliance Rate: {stats['compliance_rate']:.1f}%")
    print(f"Deletion Requests: {stats['data_deletion_requests']}")
    print(f"Portability Requests: {stats['data_portability_requests']}")

    # Test data rights
    print("\n" + "=" * 60)
    print("Testing Data Rights")
    print("=" * 60)

    # Deletion requests
    print("\nData Deletion Requests:")
    for country in ["DE", "US", "FR"]:
        result = enforcer.request_data_deletion(f"user-{country}", country)
        status = "✓ Approved" if result else "✗ Denied"
        print(f"  {country}: {status}")

    # Portability requests
    print("\nData Portability Requests:")
    for country in ["DE", "US", "FR"]:
        result = enforcer.request_data_portability(f"user-{country}", country)
        status = "✓ Approved" if result else "✗ Denied"
        print(f"  {country}: {status}")


async def main():
    """Main compliance enforcement orchestration"""
    await simulate_compliance_checks()


if __name__ == "__main__":
    asyncio.run(main())

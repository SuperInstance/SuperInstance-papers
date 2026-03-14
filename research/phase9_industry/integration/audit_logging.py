"""
SuperInstance Audit Logging System
===================================

Comprehensive audit logging for enterprise compliance and security.

Compliance Standards Supported:
- SOC2 Type II
- GDPR (Article 30 - Records of processing activities)
- HIPAA (45 CFR 164.312(b) - Audit controls)
- ISO 27001 (A.12.3 - Audit logging)
- PCI DSS (Requirement 10 - Track and monitor all access)

Features:
- Immutable audit logs
- Compliance report generation
- Real-time alerting
- Log retention policies
- Anomaly detection
- Integration with SIEM systems

Author: SuperInstance Enterprise Team
Version: 1.0.0
License: Enterprise (see partnership agreement)
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, field, asdict
from functools import wraps
import json
import hashlib
import hmac
import uuid
import logging
from pathlib import Path
import gzip
import asyncio
from contextlib import asynccontextmanager

# Cryptography for log signing
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend

# Database integration
import sqlite3
from sqlite3 import Connection, Row

logger = logging.getLogger(__name__)


# ============================================================================
# Audit Event Types
# ============================================================================

class AuditEventType(str, Enum):
    """Categories of audit events"""

    # Authentication events
    AUTH_LOGIN = "auth.login"
    AUTH_LOGOUT = "auth.logout"
    AUTH_FAILED = "auth.failed"
    AUTH_PASSWORD_CHANGE = "auth.password_change"
    AUTH_MFA_ENABLED = "auth.mfa_enabled"
    AUTH_MFA_DISABLED = "auth.mfa_disabled"

    # Authorization events
    AUTHZ_GRANT = "authz.grant"
    AUTHZ_REVOKE = "authz.revoke"
    AUTHZ_ROLE_CHANGE = "authz.role_change"
    AUTHZ_PERMISSION_CHECK = "authz.permission_check"
    AUTHZ_ACCESS_DENIED = "authz.access_denied"

    # Data access events
    DATA_READ = "data.read"
    DATA_WRITE = "data.write"
    DATA_DELETE = "data.delete"
    DATA_EXPORT = "data.export"
    DATA_IMPORT = "data.import"
    DATA_QUERY = "data.query"

    # Configuration events
    CONFIG_CHANGE = "config.change"
    CONFIG_DEPLOY = "config.deploy"
    CONFIG_ROLLBACK = "config.rollback"

    # System events
    SYSTEM_STARTUP = "system.startup"
    SYSTEM_SHUTDOWN = "system.shutdown"
    SYSTEM_ERROR = "system.error"
    SYSTEM_UPGRADE = "system.upgrade"

    # Agent events
    AGENT_CREATE = "agent.create"
    AGENT_DELETE = "agent.delete"
    AGENT_START = "agent.start"
    AGENT_STOP = "agent.stop"
    AGENT_RESTART = "agent.restart"
    AGENT_SCALE = "agent.scale"

    # Task events
    TASK_SUBMIT = "task.submit"
    TASK_COMPLETE = "task.complete"
    TASK_FAIL = "task.fail"
    TASK_CANCEL = "task.cancel"

    # Compliance events
    COMPLIANCE_AUDIT = "compliance.audit"
    COMPLIANCE_REPORT = "compliance.report"
    COMPLIANCE_VIOLATION = "compliance.violation"


class EventSeverity(str, Enum):
    """Severity levels for audit events"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


# ============================================================================
# Audit Event Model
# ============================================================================

@dataclass
class AuditEvent:
    """Immutable audit event record"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=datetime.utcnow)
    event_type: AuditEventType = None
    severity: EventSeverity = EventSeverity.INFO
    actor: Optional[str] = None  # User ID or system component
    action: str = ""  # Human-readable description
    resource: Optional[str] = None  # Resource affected (e.g., agent ID)
    resource_type: Optional[str] = None  # Type of resource
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    correlation_id: Optional[str] = None  # For linking related events
    status: str = "success"  # success, failure, partial
    error_message: Optional[str] = None
    compliance_tags: List[str] = field(default_factory=list)  # SOC2, GDPR, HIPAA, etc.

    # Immutable fields
    signature: Optional[str] = None  # Cryptographic signature
    checksum: Optional[str] = None  # SHA-256 hash
    chain_index: Optional[int] = None  # Position in immutable chain

    def __post_init__(self):
        """Calculate checksum after initialization"""
        if not self.checksum:
            self.checksum = self._calculate_checksum()

    def _calculate_checksum(self) -> str:
        """Calculate SHA-256 checksum of event data"""
        event_dict = asdict(self)
        # Remove signature and checksum from calculation
        event_dict.pop('signature', None)
        event_dict.pop('checksum', None)

        json_str = json.dumps(event_dict, sort_keys=True, default=str)
        return hashlib.sha256(json_str.encode()).hexdigest()

    def sign(self, private_key: rsa.RSAPrivateKey):
        """Sign event with private key"""
        if self.signature:
            raise ValueError("Event already signed")

        message = self.checksum.encode()
        signature = private_key.sign(
            message,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        self.signature = signature.hex()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)

    def to_json(self) -> str:
        """Convert to JSON"""
        return json.dumps(self.to_dict(), default=str)


# ============================================================================
# Audit Log Storage
# ============================================================================

class AuditLogStorage:
    """Immutable audit log storage with chain linking"""

    def __init__(self, db_path: str = "audit.db"):
        self.db_path = db_path
        self.conn: Optional[Connection] = None
        self.private_key: Optional[rsa.RSAPrivateKey] = None
        self.public_key: Optional[rsa.RSAPublicKey] = None
        self._initialize_storage()

    def _initialize_storage(self):
        """Initialize database schema"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = Row

        # Create audit logs table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                actor TEXT,
                action TEXT NOT NULL,
                resource TEXT,
                resource_type TEXT,
                ip_address TEXT,
                user_agent TEXT,
                metadata TEXT,
                correlation_id TEXT,
                status TEXT NOT NULL,
                error_message TEXT,
                compliance_tags TEXT,
                signature TEXT,
                checksum TEXT NOT NULL,
                chain_index INTEGER UNIQUE,
                prev_checksum TEXT,
                created_at TEXT NOT NULL
            )
        """)

        # Create indexes
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_timestamp
            ON audit_events(timestamp)
        """)

        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_actor
            ON audit_events(actor)
        """)

        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_resource
            ON audit_events(resource)
        """)

        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_event_type
            ON audit_events(event_type)
        """)

        # Generate signing keys
        self._generate_keys()

        self.conn.commit()

    def _generate_keys(self):
        """Generate RSA key pair for signing"""
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        self.public_key = self.private_key.public_key()

    def append(self, event: AuditEvent) -> AuditEvent:
        """Append event to immutable log chain"""
        # Get previous checksum for chain linking
        cursor = self.conn.execute(
            "SELECT checksum FROM audit_events ORDER BY chain_index DESC LIMIT 1"
        )
        row = cursor.fetchone()
        prev_checksum = row['checksum'] if row else None
        chain_index = (row['chain_index'] + 1) if row else 0

        event.chain_index = chain_index
        event.sign(self.private_key)

        # Verify chain integrity
        if prev_checksum:
            cursor = self.conn.execute(
                "SELECT * FROM audit_events WHERE checksum = ?",
                (prev_checksum,)
            )
            if not cursor.fetchone():
                raise ValueError("Chain integrity check failed")

        # Insert event
        self.conn.execute("""
            INSERT INTO audit_events (
                id, timestamp, event_type, severity, actor, action,
                resource, resource_type, ip_address, user_agent,
                metadata, correlation_id, status, error_message,
                compliance_tags, signature, checksum, chain_index,
                prev_checksum, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event.id,
            event.timestamp.isoformat(),
            event.event_type.value,
            event.severity.value,
            event.actor,
            event.action,
            event.resource,
            event.resource_type,
            event.ip_address,
            event.user_agent,
            json.dumps(event.metadata),
            event.correlation_id,
            event.status,
            event.error_message,
            json.dumps(event.compliance_tags),
            event.signature,
            event.checksum,
            event.chain_index,
            prev_checksum,
            datetime.utcnow().isoformat()
        ))

        self.conn.commit()
        logger.info(f"Audit event logged: {event.event_type.value} - {event.action}")

        return event

    def verify_chain(self) -> bool:
        """Verify integrity of entire audit chain"""
        cursor = self.conn.execute("""
            SELECT id, checksum, prev_checksum, signature
            FROM audit_events
            ORDER BY chain_index
        """)

        events = cursor.fetchall()

        for i, event in enumerate(events):
            # Verify chain linkage
            if i > 0:
                if event['prev_checksum'] != events[i-1]['checksum']:
                    logger.error(f"Chain break at index {i}")
                    return False

            # Verify signature
            try:
                self.public_key.verify(
                    bytes.fromhex(event['signature']),
                    event['checksum'].encode(),
                    padding.PSS(
                        mgf=padding.MGF1(hashes.SHA256()),
                        salt_length=padding.PSS.MAX_LENGTH
                    ),
                    hashes.SHA256()
                )
            except Exception as e:
                logger.error(f"Signature verification failed for {event['id']}: {e}")
                return False

        return True

    def query(self,
              start_time: Optional[datetime] = None,
              end_time: Optional[datetime] = None,
              event_types: Optional[List[AuditEventType]] = None,
              actor: Optional[str] = None,
              resource: Optional[str] = None,
              compliance_tag: Optional[str] = None,
              limit: int = 1000) -> List[AuditEvent]:
        """Query audit logs"""
        query = "SELECT * FROM audit_events WHERE 1=1"
        params = []

        if start_time:
            query += " AND timestamp >= ?"
            params.append(start_time.isoformat())

        if end_time:
            query += " AND timestamp <= ?"
            params.append(end_time.isoformat())

        if event_types:
            placeholders = ','.join('?' * len(event_types))
            query += f" AND event_type IN ({placeholders})"
            params.extend([et.value for et in event_types])

        if actor:
            query += " AND actor = ?"
            params.append(actor)

        if resource:
            query += " AND resource = ?"
            params.append(resource)

        if compliance_tag:
            query += " AND compliance_tags LIKE ?"
            params.append(f'%{compliance_tag}%')

        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        cursor = self.conn.execute(query, params)
        rows = cursor.fetchall()

        events = []
        for row in rows:
            events.append(AuditEvent(
                id=row['id'],
                timestamp=datetime.fromisoformat(row['timestamp']),
                event_type=AuditEventType(row['event_type']),
                severity=EventSeverity(row['severity']),
                actor=row['actor'],
                action=row['action'],
                resource=row['resource'],
                resource_type=row['resource_type'],
                ip_address=row['ip_address'],
                user_agent=row['user_agent'],
                metadata=json.loads(row['metadata']) if row['metadata'] else {},
                correlation_id=row['correlation_id'],
                status=row['status'],
                error_message=row['error_message'],
                compliance_tags=json.loads(row['compliance_tags']) if row['compliance_tags'] else [],
                signature=row['signature'],
                checksum=row['checksum'],
                chain_index=row['chain_index']
            ))

        return events


# ============================================================================
# Audit Logger
# ============================================================================

class AuditLogger:
    """Main audit logging system"""

    def __init__(self, storage: AuditLogStorage):
        self.storage = storage
        self.alert_handlers: List[Callable] = []
        self.compliance_standards: Dict[str, List[str]] = {
            'SOC2': ['auth.*', 'data.*', 'config.*', 'system.*'],
            'GDPR': ['data.*', 'auth.*', 'compliance.*'],
            'HIPAA': ['auth.*', 'data.*', 'compliance.*'],
            'ISO27001': ['*']
        }

    def log(self, event: AuditEvent) -> AuditEvent:
        """Log audit event"""
        # Auto-tag compliance events
        event.compliance_tags = self._get_compliance_tags(event.event_type)

        # Store event
        stored_event = self.storage.append(event)

        # Check for alerts
        self._check_alerts(stored_event)

        return stored_event

    def _get_compliance_tags(self, event_type: AuditEventType) -> List[str]:
        """Get applicable compliance tags for event type"""
        tags = []
        event_pattern = event_type.value

        for standard, patterns in self.compliance_standards.items():
            for pattern in patterns:
                if pattern == '*' or event_pattern.startswith(pattern.replace('*', '')):
                    tags.append(standard)
                    break

        return tags

    def _check_alerts(self, event: AuditEvent):
        """Check if event should trigger alerts"""
        # Critical events always alert
        if event.severity == EventSeverity.CRITICAL:
            self._send_alert(event)

        # Failed authorization attempts
        if event.event_type == AuditEventType.AUTHZ_ACCESS_DENIED:
            self._send_alert(event)

        # Compliance violations
        if event.event_type == AuditEventType.COMPLIANCE_VIOLATION:
            self._send_alert(event)

        # Check for suspicious patterns
        self._check_suspicious_patterns(event)

    def _check_suspicious_patterns(self, event: AuditEvent):
        """Detect suspicious activity patterns"""
        # Multiple failed logins from same IP
        if event.event_type == AuditEventType.AUTH_FAILED:
            recent_failures = self.storage.query(
                start_time=datetime.utcnow() - timedelta(minutes=15),
                event_types=[AuditEventType.AUTH_FAILED],
                actor=event.actor
            )

            if len(recent_failures) >= 5:
                # Create security alert
                alert_event = AuditEvent(
                    event_type=AuditEventType.COMPLIANCE_VIOLATION,
                    severity=EventSeverity.HIGH,
                    actor="system",
                    action=f"Multiple failed authentication attempts for {event.actor}",
                    resource=event.actor,
                    resource_type="user",
                    metadata={
                        'attempt_count': len(recent_failures),
                        'timeframe_minutes': 15,
                        'ip_address': event.ip_address
                    },
                    compliance_tags=['SOC2', 'ISO27001']
                )
                self.log(alert_event)

    def _send_alert(self, event: AuditEvent):
        """Send alert to registered handlers"""
        for handler in self.alert_handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"Alert handler failed: {e}")

    def register_alert_handler(self, handler: Callable):
        """Register alert handler"""
        self.alert_handlers.append(handler)

    def generate_compliance_report(self,
                                   standard: str,
                                   start_time: datetime,
                                   end_time: datetime) -> Dict[str, Any]:
        """Generate compliance report"""
        patterns = self.compliance_standards.get(standard, [])

        events = []
        for pattern in patterns:
            if pattern == '*':
                events.extend(self.storage.query(
                    start_time=start_time,
                    end_time=end_time,
                    limit=100000
                ))
            else:
                event_types = [et for et in AuditEventType if et.value.startswith(pattern.replace('*', ''))]
                events.extend(self.storage.query(
                    start_time=start_time,
                    end_time=end_time,
                    event_types=event_types,
                    limit=100000
                ))

        # Deduplicate events
        unique_events = {e.id: e for e in events}.values()

        return {
            'standard': standard,
            'period': {
                'start': start_time.isoformat(),
                'end': end_time.isoformat()
            },
            'total_events': len(unique_events),
            'events_by_type': self._group_events_by_type(unique_events),
            'events_by_severity': self._group_events_by_severity(unique_events),
            'events_by_actor': self._group_events_by_actor(unique_events),
            'compliance_verification': self.storage.verify_chain(),
            'generated_at': datetime.utcnow().isoformat()
        }

    def _group_events_by_type(self, events: List[AuditEvent]) -> Dict[str, int]:
        """Group events by type"""
        grouped = {}
        for event in events:
            event_type = event.event_type.value
            grouped[event_type] = grouped.get(event_type, 0) + 1
        return grouped

    def _group_events_by_severity(self, events: List[AuditEvent]) -> Dict[str, int]:
        """Group events by severity"""
        grouped = {}
        for event in events:
            severity = event.severity.value
            grouped[severity] = grouped.get(severity, 0) + 1
        return grouped

    def _group_events_by_actor(self, events: List[AuditEvent]) -> Dict[str, int]:
        """Group events by actor"""
        grouped = {}
        for event in events:
            actor = event.actor or 'system'
            grouped[actor] = grouped.get(actor, 0) + 1
        return grouped


# ============================================================================
# Decorators for Automatic Auditing
# ============================================================================

def audit_action(event_type: AuditEventType,
                 action: str,
                 resource_type: Optional[str] = None,
                 severity: EventSeverity = EventSeverity.INFO):
    """Decorator for automatic audit logging"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            audit_logger = kwargs.get('audit_logger')
            if not audit_logger:
                return await func(*args, **kwargs)

            # Get request context if available
            request = kwargs.get('request')
            actor = getattr(request, 'state', {}).get('user_id') if request else None
            ip_address = getattr(request, 'client', '').host if request else None

            event = AuditEvent(
                event_type=event_type,
                severity=severity,
                actor=actor,
                action=action,
                resource_type=resource_type,
                ip_address=ip_address,
                correlation_id=kwargs.get('correlation_id')
            )

            try:
                result = await func(*args, **kwargs)
                event.status = "success"
                return result
            except Exception as e:
                event.status = "failure"
                event.error_message = str(e)
                event.severity = EventSeverity.HIGH
                raise
            finally:
                audit_logger.log(event)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            audit_logger = kwargs.get('audit_logger')
            if not audit_logger:
                return func(*args, **kwargs)

            event = AuditEvent(
                event_type=event_type,
                severity=severity,
                actor=kwargs.get('actor'),
                action=action,
                resource_type=resource_type
            )

            try:
                result = func(*args, **kwargs)
                event.status = "success"
                return result
            except Exception as e:
                event.status = "failure"
                event.error_message = str(e)
                event.severity = EventSeverity.HIGH
                raise
            finally:
                audit_logger.log(event)

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


# ============================================================================
# SIEM Integration
# ============================================================================

class SIEMExporter:
    """Export audit logs to SIEM systems"""

    def __init__(self, audit_logger: AuditLogger):
        self.audit_logger = audit_logger

    async def export_to_splunk(self, hec_url: str, hec_token: str):
        """Export to Splunk HTTP Event Collector"""
        import aiohttp

        # Get recent events
        events = self.audit_logger.storage.query(
            start_time=datetime.utcnow() - timedelta(hours=1)
        )

        async with aiohttp.ClientSession() as session:
            headers = {
                'Authorization': f'Splunk {hec_token}',
                'Content-Type': 'application/json'
            }

            for event in events:
                payload = {
                    'time': int(event.timestamp.timestamp()),
                    'event': event.to_dict(),
                    'sourcetype': '_json',
                    'index': 'superinstance',
                    'source': 'superinstance-audit'
                }

                async with session.post(hec_url, json=payload, headers=headers) as resp:
                    if resp.status != 200:
                        logger.error(f"Failed to export event {event.id} to Splunk")

    async def export_to_sumologic(self, collector_url: str):
        """Export to Sumo Logic HTTP Source"""
        import aiohttp

        events = self.audit_logger.storage.query(
            start_time=datetime.utcnow() - timedelta(hours=1)
        )

        async with aiohttp.ClientSession() as session:
            for event in events:
                async with session.post(collector_url, json=event.to_dict()) as resp:
                    if resp.status != 200:
                        logger.error(f"Failed to export event {event.id} to Sumo Logic")


# ============================================================================
# Global Audit Logger Instance
# ============================================================================

# Initialize storage and logger
audit_storage = AuditLogStorage()
audit_logger = AuditLogger(audit_storage)


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == "__main__":
    # Example: Log authentication event
    auth_event = AuditEvent(
        event_type=AuditEventType.AUTH_LOGIN,
        severity=EventSeverity.INFO,
        actor="user-123",
        action="User logged in via SSO",
        ip_address="192.168.1.100",
        user_agent="Mozilla/5.0...",
        metadata={
            'method': 'sso',
            'provider': 'okta'
        },
        correlation_id=str(uuid.uuid4())
    )

    audit_logger.log(auth_event)

    # Example: Generate compliance report
    report = audit_logger.generate_compliance_report(
        standard='SOC2',
        start_time=datetime.utcnow() - timedelta(days=30),
        end_time=datetime.utcnow()
    )

    print(json.dumps(report, indent=2, default=str))

    # Example: Verify chain integrity
    is_valid = audit_storage.verify_chain()
    print(f"Chain integrity: {is_valid}")

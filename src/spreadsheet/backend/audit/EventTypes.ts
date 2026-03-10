/**
 * POLLN Spreadsheet Backend - Audit Event Types
 *
 * Comprehensive event type definitions for compliance audit logging.
 * Supports SOC 2 Type II, GDPR, and other compliance frameworks.
 *
 * Features:
 * - Authentication events
 * - Authorization events
 * - Data access events
 * - Configuration changes
 * - Collaboration events
 * - System events
 */

/**
 * Audit event categories for organizing events
 */
export enum AuditCategory {
  // Security-related events
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',

  // User actions
  COLLABORATION = 'collaboration',
  USER_MANAGEMENT = 'user_management',

  // System events
  CONFIGURATION = 'configuration',
  SYSTEM = 'system',
  PERFORMANCE = 'performance',

  // Compliance
  COMPLIANCE = 'compliance',
  SECURITY = 'security',
}

/**
 * Authentication event types
 */
export enum AuthEventType {
  // Login events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGIN_BLOCKED = 'login_blocked',
  LOGOUT = 'logout',
  SESSION_CREATED = 'session_created',
  SESSION_DESTROYED = 'session_destroyed',
  SESSION_EXPIRED = 'session_expired',

  // Token events
  TOKEN_ISSUED = 'token_issued',
  TOKEN_REFRESHED = 'token_refreshed',
  TOKEN_REVOKED = 'token_revoked',
  TOKEN_VALIDATED = 'token_validated',
  TOKEN_INVALIDATED = 'token_invalidated',

  // OAuth events
  OAUTH_INITIATED = 'oauth_initiated',
  OAUTH_CALLBACK = 'oauth_callback',
  OAUTH_SUCCESS = 'oauth_success',
  OAUTH_FAILED = 'oauth_failed',
  OAUTH_LINKED = 'oauth_linked',
  OAUTH_UNLINKED = 'oauth_unlinked',

  // MFA events
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  MFA_CHALLENGE = 'mfa_challenge',
  MFA_VERIFIED = 'mfa_verified',
  MFA_FAILED = 'mfa_failed',

  // Password events
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  PASSWORD_COMPROMISED = 'password_compromised',
}

/**
 * Authorization event types
 */
export enum AuthzEventType {
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_UNASSIGNED = 'role_unassigned',
  ROLE_CREATED = 'role_created',
  ROLE_UPDATED = 'role_updated',
  ROLE_DELETED = 'role_deleted',

  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  PRIVILEGE_DEESCALATION = 'privilege_deescalation',

  RESOURCE_LOCKED = 'resource_locked',
  RESOURCE_UNLOCKED = 'resource_unlocked',
}

/**
 * Data access event types
 */
export enum DataAccessEventType {
  CELL_READ = 'cell_read',
  CELL_READ_BATCH = 'cell_read_batch',
  ROW_READ = 'row_read',
  COLUMN_READ = 'column_read',
  SHEET_READ = 'sheet_read',
  WORKBOOK_READ = 'workbook_read',
  QUERY_EXECUTED = 'query_executed',
  EXPORT_INITIATED = 'export_initiated',
  REPORT_GENERATED = 'report_generated',
}

/**
 * Data modification event types
 */
export enum DataModificationEventType {
  CELL_CREATED = 'cell_created',
  CELL_UPDATED = 'cell_updated',
  CELL_DELETED = 'cell_deleted',
  CELL_BATCH_UPDATED = 'cell_batch_updated',

  ROW_INSERTED = 'row_inserted',
  ROW_DELETED = 'row_deleted',
  COLUMN_INSERTED = 'column_inserted',
  COLUMN_DELETED = 'column_deleted',

  SHEET_CREATED = 'sheet_created',
  SHEET_UPDATED = 'sheet_updated',
  SHEET_DELETED = 'sheet_deleted',
  SHEET_COPIED = 'sheet_copied',
  SHEET_MOVED = 'sheet_moved',

  WORKBOOK_CREATED = 'workbook_created',
  WORKBOOK_UPDATED = 'workbook_updated',
  WORKBOOK_DELETED = 'workbook_deleted',
  WORKBOOK_ARCHIVED = 'workbook_archived',
  WORKBOOK_RESTORED = 'workbook_restored',

  BULK_IMPORT = 'bulk_import',
  BULK_EXPORT = 'bulk_export',
  BULK_DELETE = 'bulk_delete',
}

/**
 * Collaboration event types
 */
export enum CollaborationEventType {
  COMMENT_ADDED = 'comment_added',
  COMMENT_EDITED = 'comment_edited',
  COMMENT_DELETED = 'comment_deleted',
  COMMENT_RESOLVED = 'comment_resolved',

  SHARE_CREATED = 'share_created',
  SHARE_UPDATED = 'share_updated',
  SHARE_DELETED = 'share_deleted',
  SHARE_ACCEPTED = 'share_accepted',
  SHARE_REVOKED = 'share_revoked',

  INVITE_SENT = 'invite_sent',
  INVITE_ACCEPTED = 'invite_accepted',
  INVITE_DECLINED = 'invite_declined',
  INVITE_REVOKED = 'invite_revoked',

  COLLABORATOR_JOINED = 'collaborator_joined',
  COLLABORATOR_LEFT = 'collaborator_left',
  COLLABORATOR_ROLE_CHANGED = 'collaborator_role_changed',

  PRESENCE_UPDATE = 'presence_update',
  CURSOR_MOVED = 'cursor_moved',
  SELECTION_CHANGED = 'selection_changed',

  EDIT_CONFLICT = 'edit_conflict',
  EDIT_CONFLICT_RESOLVED = 'edit_conflict_resolved',
  MERGE_APPLIED = 'merge_applied',
}

/**
 * User management event types
 */
export enum UserManagementEventType {
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_SUSPENDED = 'user_suspended',
  USER_REACTIVATED = 'user_reactivated',
  USER_MERGED = 'user_merged',

  PROFILE_UPDATED = 'profile_updated',
  EMAIL_CHANGED = 'email_changed',
  USERNAME_CHANGED = 'username_changed',

  PREFERENCES_UPDATED = 'preferences_updated',
  NOTIFICATION_SETTINGS_CHANGED = 'notification_settings_changed',

  ACCOUNT_VERIFIED = 'account_verified',
  ACCOUNT_DEACTIVATED = 'account_deactivated',
  ACCOUNT_REACTIVATED = 'account_reactivated',
}

/**
 * Configuration event types
 */
export enum ConfigurationEventType {
  SETTINGS_UPDATED = 'settings_updated',
  SETTINGS_RESET = 'settings_reset',
  SETTINGS_IMPORTED = 'settings_imported',
  SETTINGS_EXPORTED = 'settings_exported',

  FEATURE_FLAG_ENABLED = 'feature_flag_enabled',
  FEATURE_FLAG_DISABLED = 'feature_flag_disabled',

  INTEGRATION_ADDED = 'integration_added',
  INTEGRATION_UPDATED = 'integration_updated',
  INTEGRATION_REMOVED = 'integration_removed',
  INTEGRATION_ENABLED = 'integration_enabled',
  INTEGRATION_DISABLED = 'integration_disabled',

  WEBHOOK_CREATED = 'webhook_created',
  WEBHOOK_UPDATED = 'webhook_updated',
  WEBHOOK_DELETED = 'webhook_deleted',
  WEBHOOK_TRIGGERED = 'webhook_triggered',

  API_KEY_CREATED = 'api_key_created',
  API_KEY_UPDATED = 'api_key_updated',
  API_KEY_DELETED = 'api_key_deleted',
  API_KEY_ROTATED = 'api_key_rotated',
}

/**
 * System event types
 */
export enum SystemEventType {
  SYSTEM_STARTUP = 'system_startup',
  SYSTEM_SHUTDOWN = 'system_shutdown',
  SYSTEM_RESTART = 'system_restart',
  SYSTEM_UPGRADE = 'system_upgrade',

  SERVICE_STARTED = 'service_started',
  SERVICE_STOPPED = 'service_stopped',
  SERVICE_CRASHED = 'service_crashed',
  SERVICE_RESTARTED = 'service_restarted',

  DATABASE_CONNECTED = 'database_connected',
  DATABASE_DISCONNECTED = 'database_disconnected',
  DATABASE_MIGRATION = 'database_migration',
  DATABASE_BACKUP = 'database_backup',
  DATABASE_RESTORE = 'database_restore',

  CACHE_CLEARED = 'cache_cleared',
  CACHE_WARMED = 'cache_warmed',
  CACHE_INVALIDATED = 'cache_invalidated',

  QUEUE_DRAINED = 'queue_drained',
  QUEUE_PURGED = 'queue_purged',

  HEALTH_CHECK = 'health_check',
  MAINTENANCE_MODE = 'maintenance_mode',
}

/**
 * Security event types
 */
export enum SecurityEventType {
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ANOMALY_DETECTED = 'anomaly_detected',
  THREAT_DETECTED = 'threat_detected',
  THREAT_MITIGATED = 'threat_mitigated',

  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  RATE_LIMIT_RESET = 'rate_limit_reset',

  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  BRUTE_FORCE_BLOCKED = 'brute_force_blocked',

  INJECTION_ATTEMPT = 'injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',

  MALWARE_DETECTED = 'malware_detected',
  VULNERABILITY_SCANNED = 'vulnerability_scanned',

  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',

  ENCRYPTION_ENABLED = 'encryption_enabled',
  ENCRYPTION_DISABLED = 'encryption_disabled',
  ENCRYPTION_KEY_ROTATED = 'encryption_key_rotated',

  SECURITY_SCAN_COMPLETED = 'security_scan_completed',
  PENETRATION_TEST_COMPLETED = 'penetration_test_completed',
}

/**
 * Compliance event types
 */
export enum ComplianceEventType {
  GDPR_DATA_REQUEST = 'gdpr_data_request',
  GDPR_DATA_EXPORT = 'gdpr_data_export',
  GDPR_DATA_DELETION = 'gdpr_data_deletion',
  GDPR_CONSENT_GIVEN = 'gdpr_consent_given',
  GDPR_CONSENT_WITHDRAWN = 'gdpr_consent_withdrawn',

  SOC2_AUDIT_STARTED = 'soc2_audit_started',
  SOC2_AUDIT_COMPLETED = 'soc2_audit_completed',
  SOC2_CONTROL_TESTED = 'soc2_control_tested',
  SOC2_EVIDENCE_COLLECTED = 'soc2_evidence_collected',

  HIPAA_DATA_ACCESS = 'hipaa_data_access',
  HIPAA_DATA_DISCLOSURE = 'hipaa_data_disclosure',

  RETENTION_POLICY_APPLIED = 'retention_policy_applied',
  RETENTION_POLICY_VIOLATED = 'retention_policy_violated',
  DATA_ARCHIVED = 'data_archived',
  DATA_PURGED = 'data_purged',
}

/**
 * Performance event types
 */
export enum PerformanceEventType {
  SLOW_QUERY_DETECTED = 'slow_query_detected',
  HIGH_MEMORY_USAGE = 'high_memory_usage',
  HIGH_CPU_USAGE = 'high_cpu_usage',
  DISK_SPACE_LOW = 'disk_space_low',

  API_SLOW_RESPONSE = 'api_slow_response',
  API_TIMEOUT = 'api_timeout',
  API_ERROR_RATE_HIGH = 'api_error_rate_high',

  BOTTLENECK_DETECTED = 'bottleneck_detected',
  OPTIMIZATION_APPLIED = 'optimization_applied',
}

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  CRITICAL = 'critical',   // Security breach, data loss
  HIGH = 'high',          // Unauthorized access, suspicious activity
  MEDIUM = 'medium',      // Configuration changes, failed attempts
  LOW = 'low',            // Normal operations, successful actions
  INFO = 'info',          // Informational events
}

/**
 * Audit event outcome
 */
export enum AuditOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  PENDING = 'pending',
}

/**
 * Event type metadata
 */
export interface EventTypeMetadata {
  category: AuditCategory;
  severity: AuditSeverity;
  description: string;
  retentionDays: number;
  requiresImmediateAction: boolean;
  compliantFrameworks: string[];
}

/**
 * Mapping of event types to metadata
 */
export const EVENT_TYPE_METADATA: Record<string, EventTypeMetadata> = {
  // Authentication events
  [AuthEventType.LOGIN_SUCCESS]: {
    category: AuditCategory.AUTHENTICATION,
    severity: AuditSeverity.INFO,
    description: 'User successfully logged in',
    retentionDays: 90,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2', 'GDPR', 'HIPAA'],
  },
  [AuthEventType.LOGIN_FAILED]: {
    category: AuditCategory.AUTHENTICATION,
    severity: AuditSeverity.MEDIUM,
    description: 'Failed login attempt',
    retentionDays: 365,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2', 'GDPR'],
  },
  [AuthEventType.LOGIN_BLOCKED]: {
    category: AuditCategory.AUTHENTICATION,
    severity: AuditSeverity.HIGH,
    description: 'Login blocked due to security policy',
    retentionDays: 365,
    requiresImmediateAction: true,
    compliantFrameworks: ['SOC2', 'GDPR'],
  },
  [AuthEventType.TOKEN_ISSUED]: {
    category: AuditCategory.AUTHENTICATION,
    severity: AuditSeverity.INFO,
    description: 'Authentication token issued',
    retentionDays: 90,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2'],
  },
  [AuthEventType.MFA_ENABLED]: {
    category: AuditCategory.AUTHENTICATION,
    severity: AuditSeverity.LOW,
    description: 'Multi-factor authentication enabled',
    retentionDays: 365,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2', 'GDPR', 'HIPAA'],
  },
  [AuthEventType.PASSWORD_CHANGED]: {
    category: AuditCategory.AUTHENTICATION,
    severity: AuditSeverity.LOW,
    description: 'User password changed',
    retentionDays: 90,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2', 'GDPR'],
  },

  // Authorization events
  [AuthzEventType.PERMISSION_GRANTED]: {
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.MEDIUM,
    description: 'Permission granted to user',
    retentionDays: 365,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2', 'GDPR'],
  },
  [AuthzEventType.ACCESS_DENIED]: {
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.MEDIUM,
    description: 'Access to resource denied',
    retentionDays: 365,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2'],
  },
  [AuthzEventType.PRIVILEGE_ESCALATION]: {
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.HIGH,
    description: 'User privilege escalated',
    retentionDays: 365 * 7,
    requiresImmediateAction: true,
    compliantFrameworks: ['SOC2', 'GDPR', 'HIPAA'],
  },

  // Data access events
  [DataAccessEventType.CELL_READ]: {
    category: AuditCategory.DATA_ACCESS,
    severity: AuditSeverity.INFO,
    description: 'Cell data read',
    retentionDays: 90,
    requiresImmediateAction: false,
    compliantFrameworks: ['GDPR', 'HIPAA'],
  },
  [DataAccessEventType.SHEET_READ]: {
    category: AuditCategory.DATA_ACCESS,
    severity: AuditSeverity.INFO,
    description: 'Sheet data read',
    retentionDays: 90,
    requiresImmediateAction: false,
    compliantFrameworks: ['GDPR', 'HIPAA'],
  },
  [DataAccessEventType.EXPORT_INITIATED]: {
    category: AuditCategory.DATA_ACCESS,
    severity: AuditSeverity.MEDIUM,
    description: 'Data export initiated',
    retentionDays: 365,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2', 'GDPR', 'HIPAA'],
  },

  // Data modification events
  [DataModificationEventType.CELL_UPDATED]: {
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.INFO,
    description: 'Cell data updated',
    retentionDays: 90,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2', 'GDPR'],
  },
  [DataModificationEventType.CELL_DELETED]: {
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.LOW,
    description: 'Cell data deleted',
    retentionDays: 90,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2', 'GDPR'],
  },
  [DataModificationEventType.WORKBOOK_DELETED]: {
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.MEDIUM,
    description: 'Workbook deleted',
    retentionDays: 365,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2', 'GDPR'],
  },
  [DataModificationEventType.BULK_DELETE]: {
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
    description: 'Bulk data deletion',
    retentionDays: 365 * 7,
    requiresImmediateAction: true,
    compliantFrameworks: ['SOC2', 'GDPR'],
  },

  // Collaboration events
  [CollaborationEventType.COMMENT_ADDED]: {
    category: AuditCategory.COLLABORATION,
    severity: AuditSeverity.INFO,
    description: 'Comment added',
    retentionDays: 90,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2'],
  },
  [CollaborationEventType.SHARE_CREATED]: {
    category: AuditCategory.COLLABORATION,
    severity: AuditSeverity.MEDIUM,
    description: 'Share created',
    retentionDays: 365,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2', 'GDPR'],
  },

  // Security events
  [SecurityEventType.SUSPICIOUS_ACTIVITY]: {
    category: AuditCategory.SECURITY,
    severity: AuditSeverity.HIGH,
    description: 'Suspicious activity detected',
    retentionDays: 365 * 7,
    requiresImmediateAction: true,
    compliantFrameworks: ['SOC2', 'GDPR', 'HIPAA'],
  },
  [SecurityEventType.BRUTE_FORCE_DETECTED]: {
    category: AuditCategory.SECURITY,
    severity: AuditSeverity.HIGH,
    description: 'Brute force attack detected',
    retentionDays: 365 * 7,
    requiresImmediateAction: true,
    compliantFrameworks: ['SOC2'],
  },
  [SecurityEventType.DATA_BREACH_ATTEMPT]: {
    category: AuditCategory.SECURITY,
    severity: AuditSeverity.CRITICAL,
    description: 'Data breach attempt detected',
    retentionDays: 365 * 10,
    requiresImmediateAction: true,
    compliantFrameworks: ['SOC2', 'GDPR', 'HIPAA'],
  },

  // Compliance events
  [ComplianceEventType.GDPR_DATA_EXPORT]: {
    category: AuditCategory.COMPLIANCE,
    severity: AuditSeverity.HIGH,
    description: 'GDPR data export requested',
    retentionDays: 365 * 5,
    requiresImmediateAction: false,
    compliantFrameworks: ['GDPR'],
  },
  [ComplianceEventType.SOC2_AUDIT_COMPLETED]: {
    category: AuditCategory.COMPLIANCE,
    severity: AuditSeverity.MEDIUM,
    description: 'SOC 2 audit completed',
    retentionDays: 365 * 7,
    requiresImmediateAction: false,
    compliantFrameworks: ['SOC2'],
  },
};

/**
 * Get metadata for an event type
 */
export function getEventTypeMetadata(eventType: string): EventTypeMetadata | undefined {
  return EVENT_TYPE_METADATA[eventType];
}

/**
 * Check if event type requires immediate action
 */
export function requiresImmediateAction(eventType: string): boolean {
  const metadata = getEventTypeMetadata(eventType);
  return metadata?.requiresImmediateAction ?? false;
}

/**
 * Get retention period for event type
 */
export function getRetentionDays(eventType: string): number {
  const metadata = getEventTypeMetadata(eventType);
  return metadata?.retentionDays ?? 90;
}

/**
 * Get severity for event type
 */
export function getSeverity(eventType: string): AuditSeverity {
  const metadata = getEventTypeMetadata(eventType);
  return metadata?.severity ?? AuditSeverity.INFO;
}

/**
 * Event type groups for filtering
 */
export const EVENT_TYPE_GROUPS = {
  authentication: Object.values(AuthEventType),
  authorization: Object.values(AuthzEventType),
  dataAccess: Object.values(DataAccessEventType),
  dataModification: Object.values(DataModificationEventType),
  collaboration: Object.values(CollaborationEventType),
  userManagement: Object.values(UserManagementEventType),
  configuration: Object.values(ConfigurationEventType),
  system: Object.values(SystemEventType),
  security: Object.values(SecurityEventType),
  compliance: Object.values(ComplianceEventType),
  performance: Object.values(PerformanceEventType),
};

export default {
  AuditCategory,
  AuthEventType,
  AuthzEventType,
  DataAccessEventType,
  DataModificationEventType,
  CollaborationEventType,
  UserManagementEventType,
  ConfigurationEventType,
  SystemEventType,
  SecurityEventType,
  ComplianceEventType,
  PerformanceEventType,
  AuditSeverity,
  AuditOutcome,
  getEventTypeMetadata,
  requiresImmediateAction,
  getRetentionDays,
  getSeverity,
  EVENT_TYPE_METADATA,
  EVENT_TYPE_GROUPS,
};

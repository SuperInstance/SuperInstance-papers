/**
 * Security Types for POLLN Spreadsheet System
 * Defense in depth with comprehensive type safety
 */

/**
 * Permission actions available in the system
 */
export type PermissionAction = 'read' | 'write' | 'delete' | 'share' | 'admin' | 'execute' | 'approve';

/**
 * Scope types for permissions
 */
export type ScopeType = 'sheet' | 'range' | 'cell' | 'row' | 'column';

/**
 * Data classification levels
 */
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  CRITICAL = 'critical'
}

/**
 * PII types for automatic detection
 */
export enum PIIType {
  EMAIL = 'email',
  SSN = 'ssn',
  CREDIT_CARD = 'credit_card',
  PHONE = 'phone',
  ADDRESS = 'address',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  BANK_ACCOUNT = 'bank_account',
  IP_ADDRESS = 'ip_address',
  MAC_ADDRESS = 'mac_address',
  MEDICAL_RECORD = 'medical_record',
  CUSTOM = 'custom'
}

/**
 * User roles in the system
 */
export enum SystemRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  COMMENTER = 'commenter',
  GUEST = 'guest'
}

/**
 * Cell range definition
 */
export interface CellRange {
  sheetId: string;
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
}

/**
 * Permission scope definition
 */
export interface PermissionScope {
  type: ScopeType;
  id?: string;
  range?: CellRange;
  row?: number;
  column?: number;
}

/**
 * Complete permission definition
 */
export interface Permission {
  id: string;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
  conditions?: PermissionCondition[];
  expiresAt?: Date;
}

/**
 * Permission conditions for fine-grained control
 */
export interface PermissionCondition {
  type: 'time' | 'ip' | 'location' | 'context';
  operator: 'equals' | 'contains' | 'matches' | 'in' | 'between';
  value: any;
}

/**
 * Role definition
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystemRole?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User assignment to role
 */
export interface RoleAssignment {
  userId: string;
  roleId: string;
  scope?: PermissionScope;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
}

/**
 * Authentication result
 */
export interface AuthenticationResult {
  success: boolean;
  userId?: string;
  error?: string;
  token?: string;
  expiresIn?: number;
}

/**
 * Authorization result
 */
export interface AuthorizationResult {
  granted: boolean;
  reason?: string;
  permissions?: Permission[];
}

/**
 * User session
 */
export interface UserSession {
  sessionId: string;
  userId: string;
  username: string;
  roles: string[];
  permissions: Permission[];
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit event types
 */
export enum AuditEventType {
  ACCESS = 'access',
  MODIFICATION = 'modification',
  DELETION = 'deletion',
  SHARE = 'share',
  PERMISSION_CHANGE = 'permission_change',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
  SECURITY_EVENT = 'security_event',
  DATA_CLASSIFICATION = 'data_classification'
}

/**
 * Audit event structure
 */
export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  userId: string;
  username?: string;
  resourceId: string;
  resourceType: string;
  action: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  result: 'success' | 'failure' | 'partial';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Audit filter for querying logs
 */
export interface AuditFilter {
  userId?: string;
  eventType?: AuditEventType;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  minRiskLevel?: 'low' | 'medium' | 'high' | 'critical';
  action?: string;
  limit?: number;
  offset?: number;
}

/**
 * Cell value for audit
 */
export type CellValue = string | number | boolean | Date | null | undefined;

/**
 * Cell modification details
 */
export interface CellModification {
  cellId: string;
  sheetId: string;
  row: number;
  column: number;
  before: CellValue;
  after: CellValue;
  formula?: string;
  classification?: DataClassification;
}

/**
 * Security threat types
 */
export enum SecurityThreatType {
  FORMULA_INJECTION = 'formula_injection',
  XSS = 'xss',
  SQL_INJECTION = 'sql_injection',
  PATH_TRAVERSAL = 'path_traversal',
  MALICIOUS_MACRO = 'malicious_macro',
  DATA_EXFILTRATION = 'data_exfiltration',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  BRUTE_FORCE = 'brute_force'
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  valid: boolean;
  threats: SecurityThreat[];
  sanitized: string;
  confidence: number;
}

/**
 * Individual security threat
 */
export interface SecurityThreat {
  type: SecurityThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: {
    row?: number;
    column?: number;
    sheetId?: string;
  };
  evidence?: string;
}

/**
 * Data classification result
 */
export interface DataClassificationResult {
  classification: DataClassification;
  piiTypes: PIIType[];
  confidence: number;
  detectedPatterns: PatternMatch[];
}

/**
 * Pattern match for PII detection
 */
export interface PatternMatch {
  type: PIIType;
  matched: string;
  position: {
    start: number;
    end: number;
  };
  confidence: number;
}

/**
 * Permission cache entry
 */
export interface PermissionCacheEntry {
  key: string;
  result: boolean;
  permissions: Permission[];
  timestamp: Date;
  ttl: number;
}

/**
 * Security context for requests
 */
export interface SecurityContext {
  userId: string;
  sessionId: string;
  roles: string[];
  permissions: Permission[];
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Express request handler type
 */
export type RequestHandler = (req: any, res: any, next: any) => void | Promise<void>;

/**
 * Request interface with security context
 */
export interface SecureRequest {
  user?: {
    id: string;
    username: string;
    roles: string[];
    permissions: Permission[];
  };
  session?: UserSession;
  securityContext?: SecurityContext;
  body?: any;
  params?: any;
  query?: any;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  enableAuditLog: boolean;
  enableDataClassification: boolean;
  enablePermissionCache: boolean;
  cacheTTL: number;
  maxFailedLoginAttempts: number;
  lockoutDuration: number;
  requireMFA: boolean;
  allowedIPs?: string[];
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
}

/**
 * Share permissions
 */
export interface SharePermission {
  userId: string;
  permission: PermissionAction;
  scope?: PermissionScope;
  expiresAt?: Date;
}

/**
 * Share link configuration
 */
export interface ShareLink {
  id: string;
  resourceId: string;
  createdBy: string;
  permissions: PermissionAction[];
  expiresAt?: Date;
  maxUses?: number;
  currentUses: number;
  password?: string;
  allowedEmails?: string[];
}

/**
 * Security metrics
 */
export interface SecurityMetrics {
  totalAttempts: number;
  failedAttempts: number;
  uniqueUsers: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  threatCounts: Record<SecurityThreatType, number>;
  averageResponseTime: number;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Rate limit entry
 */
export interface RateLimitEntry {
  userId: string;
  count: number;
  resetTime: Date;
  blocked: boolean;
}

/**
 * Security event for real-time monitoring
 */
export interface SecurityEvent {
  type: 'threat_detected' | 'policy_violation' | 'anomaly_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  userId?: string;
  requiresAction: boolean;
}

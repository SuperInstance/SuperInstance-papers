/**
 * POLLN Spreadsheet Security - Main Export Module
 *
 * Comprehensive security utilities for the POLLN spreadsheet system.
 * Exports all security modules, types, and convenience functions.
 *
 * Modules:
 * - SecurityValidator: Input validation and sanitization
 * - ContentSecurityPolicy: CSP management and enforcement
 * - RateLimiter: Rate limiting with multiple algorithms
 * - SecretScanner: Secret and credential detection
 * - AuditLogger: Security audit logging
 * - SecurityManager: Central security orchestration
 *
 * @module spreadsheet/security
 */

// ============================================================================
// SecurityValidator
// ============================================================================

export {
  SecurityValidator,
  defaultValidator,
  validate,
  validateCellValue,
  escapeHTML,
  escapeSQL,
  escapeShell,
} from './SecurityValidator.js';

export type {
  ValidationResult,
  Threat,
  ValidationOptions,
  ValidationRule,
  SecurityStatistics,
} from './SecurityValidator.js';

export { Severity, ThreatCategory } from './SecurityValidator.js';

// ============================================================================
// ContentSecurityPolicy
// ============================================================================

export {
  ContentSecurityPolicyManager,
  defaultCSPManager,
  createStrictPolicy,
  createDevelopmentPolicy,
  generateNonce,
  generateHash,
  formatSource,
  generateCSPHeaders,
} from './ContentSecurityPolicy.js';

export type {
  CSPPolicy,
  CSPSource,
  CSPViolationReport,
  CSPManagerOptions,
  CSPStatistics,
} from './ContentSecurityPolicy.js';

export { CSPDirective, SandboxValue, HashAlgorithm } from './ContentSecurityPolicy.js';

// ============================================================================
// RateLimiter
// ============================================================================

export {
  RateLimiter,
  defaultRateLimiter,
  checkRateLimit,
  createRateLimitMiddleware,
} from './RateLimiter.js';

export type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitIdentifier,
  RateLimitStatistics,
} from './RateLimiter.js';

export { RateLimitAlgorithm, TimeUnit } from './RateLimiter.js';

// ============================================================================
// SecretScanner
// ============================================================================

export {
  SecretScanner,
  defaultSecretScanner,
  scanForSecrets,
  scanFileForSecrets,
  redactSecrets,
} from './SecretScanner.js';

export type {
  SecretDetection,
  ScanResult,
  SecretScannerOptions,
} from './SecretScanner.js';

export { SecretType } from './SecretScanner.js';

// ============================================================================
// AuditLogger
// ============================================================================

export {
  AuditLogger,
  defaultAuditLogger,
  logAuditEvent,
  queryAuditLogs,
} from './AuditLogger.js';

export type {
  AuditEvent,
  AuditQuery,
  ComplianceReport,
  StorageBackend,
  AuditLoggerOptions,
} from './AuditLogger.js';

export { AuditCategory, AuditSeverity, AuditOutcome } from './AuditLogger.js';

// ============================================================================
// SecurityManager
// ============================================================================

export {
  SecurityManager,
  defaultSecurityManager,
  secureValidate,
  secureRateLimit,
  secureScanSecrets,
} from './SecurityManager.js';

export type {
  SecurityIncident,
  SecurityMetrics,
  SecurityPolicy,
  SecurityPolicyRule,
  SecurityManagerOptions,
} from './SecurityManager.js';

export { IncidentLevel, IncidentStatus } from './SecurityManager.js';

// ============================================================================
// Default Exports
// ============================================================================

/**
 * Default security manager instance
 */
export { defaultSecurityManager as securityManager } from './SecurityManager.js';

/**
 * Default security validator instance
 */
export { defaultValidator as validator } from './SecurityValidator.js';

/**
 * Default CSP manager instance
 */
export { defaultCSPManager as cspManager } from './ContentSecurityPolicy.js';

/**
 * Default rate limiter instance
 */
export { defaultRateLimiter as rateLimiter } from './RateLimiter.js';

/**
 * Default secret scanner instance
 */
export { defaultSecretScanner as secretScanner } from './SecretScanner.js';

/**
 * Default audit logger instance
 */
export { defaultAuditLogger as auditLogger } from './AuditLogger.js';

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quickly validate input and check for threats
 *
 * @param input - Input to validate
 * @returns Whether input is safe
 */
export async function isSafe(input: string): Promise<boolean> {
  const result = await secureValidate(input);
  return result.valid;
}

/**
 * Quickly escape HTML to prevent XSS
 *
 * @param input - Input to escape
 * @returns Escaped string
 */
export function escape(input: string): string {
  return escapeHTML(input);
}

/**
 * Quickly check if rate limit allows request
 *
 * @param identifier - Rate limit identifier
 * @returns Whether request is allowed
 */
export async function isAllowed(identifier: RateLimitIdentifier): Promise<boolean> {
  const result = await secureRateLimit(identifier);
  return result.allowed;
}

/**
 * Quickly scan content for secrets
 *
 * @param content - Content to scan
 * @returns Whether secrets were detected
 */
export async function hasSecrets(content: string): Promise<boolean> {
  const result = await secureScanSecrets(content);
  return result.detected;
}

/**
 * Get comprehensive security metrics
 *
 * @returns Current security metrics
 */
export function getSecurityMetrics(): SecurityMetrics {
  return defaultSecurityManager.getMetrics();
}

/**
 * Create a new security manager with custom options
 *
 * @param options - Security manager options
 * @returns New security manager instance
 */
export function createSecurityManager(options?: SecurityManagerOptions): SecurityManager {
  return new SecurityManager(options);
}

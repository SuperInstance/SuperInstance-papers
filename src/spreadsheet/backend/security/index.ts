/**
 * Security System - Main export file
 *
 * Exports all security modules for easy importing
 */

// Core components
export { SecretManager } from './SecretManager';
export type {
  SecretValue,
  SecretCacheEntry,
  SecretAccessLog,
  SecretManagerConfig
} from './SecretManager';

export { EncryptionService } from './EncryptionService';
export type {
  EncryptionResult,
  DecryptionResult,
  KeyPair,
  EncryptionConfig
} from './EncryptionService';

export { KeyManager } from './KeyManager';
export type {
  KeyMetadata,
  EncryptResult,
  DecryptResult,
  KMSProvider,
  KeyManagerConfig
} from './KeyManager';

export { SecureConfig, ConfigBuilder } from './SecureConfig';
export type {
  ConfigSchema,
  ConfigValue,
  SecureConfigOptions,
  ValidationResult
} from './SecureConfig';

// Providers
export { EnvironmentProvider } from './providers/EnvironmentProvider';
export { VaultProvider } from './providers/VaultProvider';
export { AWSSecretsProvider } from './providers/AWSSecretsProvider';
export { AzureKeyVaultProvider } from './providers/AzureKeyVaultProvider';
export { GCPSecretManagerProvider } from './providers/GCPSecretManagerProvider';

export type {
  SecretProvider,
  ProviderConfig,
  EnvironmentProviderConfig,
  VaultProviderConfig,
  AWSSecretsProviderConfig,
  AzureKeyVaultProviderConfig,
  GCPSecretManagerProviderConfig
} from './providers/types';

// ============================================================================
// Application Security Modules
// ============================================================================

// SecurityValidator - Input validation and sanitization
export {
  SecurityValidator,
  defaultValidator,
  validate,
  validateCellValue,
  escapeHTML,
  escapeSQL,
  escapeShell,
} from '../security/SecurityValidator.js';

export type {
  ValidationResult as SecurityValidationResult,
  Threat as SecurityThreat,
  ValidationOptions,
  ValidationRule,
  SecurityStatistics,
} from '../security/SecurityValidator.js';

export { Severity, ThreatCategory } from '../security/SecurityValidator.js';

// ContentSecurityPolicy - CSP management
export {
  ContentSecurityPolicyManager,
  defaultCSPManager,
  createStrictPolicy,
  createDevelopmentPolicy,
  generateNonce as generateCSPNonce,
  generateHash as generateCSPHash,
  formatSource as formatCSPSource,
  generateCSPHeaders,
} from '../security/ContentSecurityPolicy.js';

export type {
  CSPPolicy,
  CSPSource,
  CSPViolationReport,
  CSPManagerOptions,
  CSPStatistics,
} from '../security/ContentSecurityPolicy.js';

export { CSPDirective, SandboxValue, HashAlgorithm } from '../security/ContentSecurityPolicy.js';

// RateLimiter - Rate limiting
export {
  RateLimiter,
  defaultRateLimiter,
  checkRateLimit,
  createRateLimitMiddleware,
} from '../security/RateLimiter.js';

export type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitIdentifier,
  RateLimitStatistics,
} from '../security/RateLimiter.js';

export { RateLimitAlgorithm, TimeUnit } from '../security/RateLimiter.js';

// SecretScanner - Secret detection
export {
  SecretScanner,
  defaultSecretScanner,
  scanForSecrets,
  scanFileForSecrets,
  redactSecrets,
} from '../security/SecretScanner.js';

export type {
  SecretDetection,
  ScanResult,
  SecretScannerOptions,
} from '../security/SecretScanner.js';

export { SecretType } from '../security/SecretScanner.js';

// AuditLogger - Security audit logging
export {
  AuditLogger,
  defaultAuditLogger,
  logAuditEvent,
  queryAuditLogs,
} from '../security/AuditLogger.js';

export type {
  AuditEvent,
  AuditQuery,
  ComplianceReport,
  StorageBackend as AuditStorageBackend,
  AuditLoggerOptions,
} from '../security/AuditLogger.js';

export { AuditCategory, AuditSeverity, AuditOutcome } from '../security/AuditLogger.js';

// SecurityManager - Central security orchestration
export {
  SecurityManager,
  defaultSecurityManager,
  secureValidate,
  secureRateLimit,
  secureScanSecrets,
} from '../security/SecurityManager.js';

export type {
  SecurityIncident,
  SecurityMetrics,
  SecurityPolicy,
  SecurityPolicyRule,
  SecurityManagerOptions,
} from '../security/SecurityManager.js';

export { IncidentLevel, IncidentStatus } from '../security/SecurityManager.js';

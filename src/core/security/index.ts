/**
 * POLLN Security Module
 * Comprehensive security features for POLLN
 *
 * Features:
 * - Cryptographic signing and encryption
 * - Key management and rotation
 * - Audit logging
 * - Security configuration
 */

export {
  KeyManager,
  SignatureService,
  EncryptionService,
  SecurityConfigManager,
  createSecurityManager,
  generateSecureId,
  hashPassword,
  verifyPassword,
} from './crypto.js';

export type {
  KeyPair,
  Signature,
  SignedData,
  EncryptedData,
  SecurityConfig,
} from './crypto.js';

export {
  AuditLogger,
  createAuditLogger,
  createAuditEventId,
} from './audit.js';

export type {
  AuditEvent,
  AuditEventType,
  AuditSeverity,
  AuditFilter,
  AuditStatistics,
  AuditLoggerConfig,
} from './audit.js';

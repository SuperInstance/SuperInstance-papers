/**
 * @file telemetry/PrivacyManager.ts
 * @brief Privacy management, PII detection, and GDPR/CCPA compliance
 *
 * This file implements comprehensive privacy management for the telemetry system,
 * including PII detection and redaction, consent management, data retention
 * enforcement, and compliance with GDPR and CCPA regulations.
 *
 * @copyright Copyright (c) 2026 POLLN
 * @license MIT
 */

import crypto from 'crypto';
import {
  AnonymousUserId,
  ConsentRecord,
  ConsentStatus,
  PIIType,
  PIIDetectionResult,
  PrivacyConfig,
  RetentionPolicy,
  Timestamp,
} from './types.js';

/**
 * Privacy Manager class
 * Handles all privacy-related functionality for the telemetry system
 */
export class PrivacyManager {
  private readonly config: PrivacyConfig;
  private readonly consentRecords: Map<AnonymousUserId, ConsentRecord>;
  private readonly piiPatterns: Map<PIIType, RegExp[]>;
  private readonly dataExpiry: Map<RetentionPolicy, number>;

  /**
   * Create a new PrivacyManager
   * @param config - Privacy configuration
   */
  constructor(config: PrivacyConfig) {
    this.config = config;
    this.consentRecords = new Map();
    this.piiPatterns = this.initializePIIPatterns();
    this.dataExpiry = this.initializeDataExpiry();
  }

  /**
   * Initialize PII detection patterns
   * @returns Map of PII types to regex patterns
   */
  private initializePIIPatterns(): Map<PIIType, RegExp[]> {
    const patterns = new Map<PIIType, RegExp[]>();

    // Email patterns
    patterns.set(PIIType.EMAIL, [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    ]);

    // Phone patterns (international formats)
    patterns.set(PIIType.PHONE, [
      /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /\+?44[-.\s]?\d{4}[-.\s]?\d{6}/g,
      /\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
    ]);

    // Credit card patterns
    patterns.set(PIIType.CREDIT_CARD, [
      /\b(?:\d[ -]*?){13,16}\b/g,
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    ]);

    // SSN patterns
    patterns.set(PIIType.SSN, [
      /\b\d{3}-\d{2}-\d{4}\b/g,
      /\b\d{3}\s\d{2}\s\d{4}\b/g,
    ]);

    // IP address patterns
    patterns.set(PIIType.IP_ADDRESS, [
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    ]);

    // Address patterns
    patterns.set(PIIType.ADDRESS, [
      /\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)/gi,
    ]);

    // Date of birth patterns
    patterns.set(PIIType.DOB, [
      /\b(?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
      /\b(?:0[1-9]|[12]\d|3[01])[-/](?:0[1-9]|1[0-2])[-/](?:19|20)\d{2}\b/g,
    ]);

    // Name patterns (simple heuristic)
    patterns.set(PIIType.NAME, [
      /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
    ]);

    // Geocoordinate patterns
    patterns.set(PIIType.GEOCOORDINATES, [
      /[-+]?\d{1,3}\.\d+[, ]\s*[-+]?\d{1,3}\.\d+/g,
    ]);

    return patterns;
  }

  /**
   * Initialize data expiry times
   * @returns Map of retention policies to milliseconds
   */
  private initializeDataExpiry(): Map<RetentionPolicy, number> {
    const expiry = new Map<RetentionPolicy, number>();

    expiry.set(RetentionPolicy.DAY_1, 24 * 60 * 60 * 1000);
    expiry.set(RetentionPolicy.DAY_7, 7 * 24 * 60 * 60 * 1000);
    expiry.set(RetentionPolicy.DAY_30, 30 * 24 * 60 * 60 * 1000);
    expiry.set(RetentionPolicy.DAY_90, 90 * 24 * 60 * 60 * 1000);
    expiry.set(RetentionPolicy.YEAR_1, 365 * 24 * 60 * 60 * 1000);
    expiry.set(RetentionPolicy.INDEFINITE, Infinity);

    return expiry;
  }

  /**
   * Detect PII in a text string
   * @param text - Text to analyze
   * @param maxConfidence - Whether to use high confidence threshold
   * @returns PII detection result
   */
  detectPII(text: string, maxConfidence = false): PIIDetectionResult {
    if (!text || typeof text !== 'string') {
      return {
        detected: false,
        types: [],
        sanitized: text || '',
        original: text || '',
        confidence: 0,
      };
    }

    const detectedTypes: PIIType[] = [];
    let totalMatches = 0;
    let sanitized = text;

    for (const [type, patterns] of this.piiPatterns.entries()) {
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          detectedTypes.push(type);
          totalMatches += matches.length;

          // Redact detected PII
          for (const match of matches) {
            const redacted = this.redactPII(match, type);
            sanitized = sanitized.replace(match, redacted);
          }
        }
      }
    }

    // Calculate confidence based on number and types of PII detected
    const confidence = this.calculateConfidence(detectedTypes, totalMatches, maxConfidence);

    return {
      detected: detectedTypes.length > 0 && confidence >= (maxConfidence ? 0.8 : 0.5),
      types: detectedTypes,
      sanitized,
      original: text,
      confidence,
    };
  }

  /**
   * Calculate confidence score for PII detection
   * @param types - Detected PII types
   * @param matches - Number of matches
   * @param maxConfidence - Whether to use high confidence threshold
   * @returns Confidence score (0-1)
   */
  private calculateConfidence(types: PIIType[], matches: number, maxConfidence: boolean): number {
    if (types.length === 0) return 0;

    // High-confidence PII types
    const highConfidenceTypes = [PIIType.EMAIL, PIIType.SSN, PIIType.CREDIT_CARD, PIIType.PHONE];
    const hasHighConfidence = types.some(t => highConfidenceTypes.includes(t));

    // Base confidence from type count
    let confidence = Math.min(types.length * 0.2, 0.8);

    // Boost for high-confidence types
    if (hasHighConfidence) {
      confidence = Math.min(confidence + 0.15, 0.95);
    }

    // Adjust for match count
    if (matches > 1) {
      confidence = Math.min(confidence + 0.05, 0.98);
    }

    // Apply max confidence threshold
    if (maxConfidence && confidence < 0.8) {
      confidence = 0;
    }

    return confidence;
  }

  /**
   * Redact PII from text
   * @param text - Text containing PII
   * @param type - Type of PII
   * @returns Redacted text
   */
  redactPII(text: string, type: PIIType): string {
    switch (type) {
      case PIIType.EMAIL:
        return this.redactEmail(text);
      case PIIType.PHONE:
        return this.redactPhone(text);
      case PIIType.CREDIT_CARD:
        return this.redactCreditCard(text);
      case PIIType.SSN:
        return '***-**-****';
      case PIIType.IP_ADDRESS:
        return this.redactIP(text);
      default:
        return '*'.repeat(Math.min(text.length, 10));
    }
  }

  /**
   * Redact email address
   * @param email - Email to redact
   * @returns Redacted email
   */
  private redactEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.***';

    const [local, domain] = parts;
    const localRedacted = local.charAt(0) + '***';
    const domainParts = domain.split('.');
    const domainRedacted =
      domainParts.map((part, i) => (i === domainParts.length - 1 ? part : '***')).join('.');

    return `${localRedacted}@${domainRedacted}`;
  }

  /**
   * Redact phone number
   * @param phone - Phone to redact
   * @returns Redacted phone
   */
  private redactPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '***';

    const lastFour = digits.slice(-4);
    return `***-***-${lastFour}`;
  }

  /**
   * Redact credit card number
   * @param card - Card number to redact
   * @returns Redacted card number
   */
  private redactCreditCard(card: string): string {
    const digits = card.replace(/\D/g, '');
    if (digits.length < 4) return '****';

    const lastFour = digits.slice(-4);
    return `****-****-****-${lastFour}`;
  }

  /**
   * Redact IP address
   * @param ip - IP to redact
   * @returns Redacted IP
   */
  private redactIP(ip: string): string {
    if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      return `${parts[0]}:${parts[1]}:***:***:***:***`;
    } else {
      // IPv4
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  }

  /**
   * Anonymize IP address (keep first octet only)
   * @param ip - IP to anonymize
   * @returns Anonymized IP
   */
  anonymizeIP(ip: string): string {
    if (this.config.anonymizeIP === false) {
      return ip;
    }

    try {
      if (ip.includes(':')) {
        // IPv6: Keep first 48 bits
        const parts = ip.split(':');
        return `${parts[0]}:${parts[1]}:${parts[2]}::`;
      } else {
        // IPv4: Keep first octet
        const parts = ip.split('.');
        return `${parts[0]}.0.0.0`;
      }
    } catch {
      return '0.0.0.0';
    }
  }

  /**
   * Generate anonymous user ID
   * @param identifier - Original identifier (email, username, etc.)
   * @param salt - Salt for hashing
   * @returns Anonymous user ID
   */
  anonymizeIdentifier(identifier: string, salt: string): AnonymousUserId {
    if (!this.config.anonymization) {
      return identifier;
    }

    const hash = crypto
      .createHash('sha256')
      .update(salt + identifier)
      .digest('hex');

    return `anon_${hash.substring(0, 16)}`;
  }

  /**
   * Get or create consent record for user
   * @param userId - Anonymous user ID
   * @returns Consent record
   */
  getConsentRecord(userId: AnonymousUserId): ConsentRecord {
    let record = this.consentRecords.get(userId);

    if (!record) {
      record = {
        userId,
        status: this.config.requireConsent ? ConsentStatus.PENDING : ConsentStatus.NOT_REQUIRED,
        timestamp: new Date().toISOString() as Timestamp,
        expiration: null,
        version: '1.0.0',
        categories: {
          analytics: false,
          marketing: false,
          performance: false,
          security: true, // Always allowed
        },
      };
      this.consentRecords.set(userId, record);
    }

    return record;
  }

  /**
   * Update consent for a user
   * @param userId - Anonymous user ID
   * @param status - New consent status
   * @param categories - Specific category consent
   */
  updateConsent(
    userId: AnonymousUserId,
    status: ConsentStatus,
    categories?: Partial<ConsentRecord['categories']>
  ): void {
    const record = this.getConsentRecord(userId);
    record.status = status;
    record.timestamp = new Date().toISOString() as Timestamp;

    // Update expiration if consent period is limited
    if (this.config.consentExpiration > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + this.config.consentExpiration);
      record.expiration = expiryDate.toISOString() as Timestamp;
    }

    // Update category consent
    if (categories) {
      record.categories = { ...record.categories, ...categories };
    }

    this.consentRecords.set(userId, record);
  }

  /**
   * Check if user has consent for data collection
   * @param userId - Anonymous user ID
   * @param category - Data category
   * @returns Whether consent is granted
   */
  hasConsent(userId: AnonymousUserId, category?: keyof ConsentRecord['categories']): boolean {
    const record = this.consentRecords.get(userId);
    if (!record) {
      return !this.config.requireConsent;
    }

    // Check if consent has expired
    if (record.expiration && new Date(record.expiration) < new Date()) {
      return false;
    }

    // Check overall status
    if (record.status === ConsentStatus.OPTED_OUT) {
      return false;
    }

    if (record.status === ConsentStatus.OPTED_IN) {
      // Check category-specific consent
      if (category) {
        return record.categories[category];
      }
      return true;
    }

    return !this.config.requireConsent;
  }

  /**
   * Revoke all consent for a user (GDPR/CCPA right to be forgotten)
   * @param userId - Anonymous user ID
   */
  revokeAllConsent(userId: AnonymousUserId): void {
    const record = this.getConsentRecord(userId);
    record.status = ConsentStatus.OPTED_OUT;
    record.categories = {
      analytics: false,
      marketing: false,
      performance: false,
      security: true,
    };
    record.timestamp = new Date().toISOString() as Timestamp;
    this.consentRecords.set(userId, record);
  }

  /**
   * Check if data should be retained based on retention policy
   * @param timestamp - Data timestamp
   * @param policy - Retention policy
   * @returns Whether data should be retained
   */
  shouldRetainData(timestamp: Timestamp, policy: RetentionPolicy): boolean {
    if (!this.config.enforceRetention) {
      return true;
    }

    const expiry = this.dataExpiry.get(policy);
    if (!expiry || expiry === Infinity) {
      return true;
    }

    const dataAge = Date.now() - new Date(timestamp).getTime();
    return dataAge < expiry;
  }

  /**
   * Clean up expired consent records
   */
  cleanupExpiredConsent(): void {
    const now = new Date();

    for (const [userId, record] of this.consentRecords.entries()) {
      if (record.expiration && new Date(record.expiration) < now) {
        // Reset to pending
        record.status = ConsentStatus.PENDING;
        this.consentRecords.set(userId, record);
      }
    }
  }

  /**
   * Get consent statistics
   * @returns Consent statistics
   */
  getConsentStats(): {
    total: number;
    optedIn: number;
    optedOut: number;
    pending: number;
    notRequired: number;
    byCategory: Record<string, number>;
  } {
    const stats = {
      total: this.consentRecords.size,
      optedIn: 0,
      optedOut: 0,
      pending: 0,
      notRequired: 0,
      byCategory: {
        analytics: 0,
        marketing: 0,
        performance: 0,
        security: this.consentRecords.size,
      },
    };

    for (const record of this.consentRecords.values()) {
      switch (record.status) {
        case ConsentStatus.OPTED_IN:
          stats.optedIn++;
          if (record.categories.analytics) stats.byCategory.analytics++;
          if (record.categories.marketing) stats.byCategory.marketing++;
          if (record.categories.performance) stats.byCategory.performance++;
          break;
        case ConsentStatus.OPTED_OUT:
          stats.optedOut++;
          break;
        case ConsentStatus.PENDING:
          stats.pending++;
          break;
        case ConsentStatus.NOT_REQUIRED:
          stats.notRequired++;
          break;
      }
    }

    return stats;
  }

  /**
   * Sanitize an object by removing or redacting PII
   * @param obj - Object to sanitize
   * @returns Sanitized object
   */
  sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized = { ...obj };

    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        const result = this.detectPII(value);
        if (result.detected) {
          (sanitized as Record<string, unknown>)[key] = result.sanitized;
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        (sanitized as Record<string, unknown>)[key] = this.sanitizeObject(
          value as Record<string, unknown>
        );
      } else if (Array.isArray(value)) {
        (sanitized as Record<string, unknown>)[key] = value.map(item =>
          typeof item === 'object' && item !== null
            ? this.sanitizeObject(item as Record<string, unknown>)
            : item
        );
      }
    }

    return sanitized;
  }

  /**
   * Export consent data for GDPR/CCPA requests
   * @param userId - Anonymous user ID
   * @returns Consent data export
   */
  exportConsentData(userId: AnonymousUserId): ConsentRecord | null {
    const record = this.consentRecords.get(userId);
    return record ? { ...record } : null;
  }

  /**
   * Delete all data for a user (GDPR/CCPA right to be forgotten)
   * @param userId - Anonymous user ID
   */
  deleteUserData(userId: AnonymousUserId): void {
    this.consentRecords.delete(userId);
  }

  /**
   * Check if privacy manager is configured for GDPR compliance
   * @returns GDPR compliance status
   */
  isGDPRCompliant(): boolean {
    return (
      this.config.piiDetection &&
      this.config.anonymization &&
      this.config.requireConsent &&
      this.config.enforceRetention
    );
  }

  /**
   * Check if privacy manager is configured for CCPA compliance
   * @returns CCPA compliance status
   */
  isCCPACompliant(): boolean {
    return (
      this.config.piiDetection &&
      this.config.anonymization &&
      !this.config.requireConsent // CCPA doesn't require opt-in
    );
  }
}

/**
 * Default privacy configuration
 */
export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  piiDetection: true,
  anonymization: true,
  anonymizeIP: true,
  requireConsent: true,
  consentExpiration: 365, // 1 year
  enforceRetention: true,
  allowedPIIPatterns: [],
  blockedPIIPatterns: [],
};

/**
 * POLLN Spreadsheet Security - ContentSecurityPolicy
 *
 * Comprehensive Content Security Policy (CSP) management system.
 * Generates CSP headers, manages nonces, enforces policies, and handles violation reports.
 *
 * Key Features:
 * - CSP header generation for all modern directives
 * - Cryptographically secure nonce generation
 * - Policy enforcement and validation
 * - Violation reporting and analysis
 * - Directive management and inheritance
 * - SHA-256, SHA-384, SHA-512 hash support
 * - JSDoc documentation throughout
 *
 * @module ContentSecurityPolicy
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { EventEmitter } from 'events';

/**
 * CSP directive types
 */
export enum CSPDirective {
  // Fetch directives
  DEFAULT_SRC = 'default-src',
  SCRIPT_SRC = 'script-src',
  SCRIPT_SRC_ATTR = 'script-src-attr',
  SCRIPT_SRC_ELEM = 'script-src-elem',
  STYLE_SRC = 'style-src',
  STYLE_SRC_ATTR = 'style-src-attr',
  STYLE_SRC_ELEM = 'style-src-elem',
  IMG_SRC = 'img-src',
  FONT_SRC = 'font-src',
  CONNECT_SRC = 'connect-src',
  MEDIA_SRC = 'media-src',
  OBJECT_SRC = 'object-src',
  FRAME_SRC = 'frame-src',
  CHILD_SRC = 'child-src',
  FRAME_ANCESTORS = 'frame-ancestors',
  WORKER_SRC = 'worker-src',
  MANIFEST_SRC = 'manifest-src',
  PREFETCH_SRC = 'prefetch-src',
  NAVIGATE_TO = 'navigate-to',

  // Document directives
  BASE_URI = 'base-uri',
  SANDBOX = 'sandbox',
  FORM_ACTION = 'form-action',
  PROGRESSIVE_NONCE = 'progressive-nonce',

  // Reporting directives
  REPORT_URI = 'report-uri',
  REPORT_TO = 'report-to',

  // Other directives
  UPGRADE_INSECURE_REQUESTS = 'upgrade-insecure-requests',
  BLOCK_ALL_MIXED_CONTENT = 'block-all-mixed-content',
  REQUIRE_TRUSTED_TYPES_FOR = 'require-trusted-types-for',
  TRUSTED_TYPES = 'trusted-types',
}

/**
 * CSP sandbox values
 */
export enum SandboxValue {
  ALLOW_FORMS = 'allow-forms',
  ALLOW_MODALS = 'allow-modals',
  ALLOW_ORIENTATION_LOCK = 'allow-orientation-lock',
  ALLOW_POINTER_LOCK = 'allow-pointer-lock',
  ALLOW_POPUPS = 'allow-popups',
  ALLOW_POPUPS_TO_ESCAPE_SANDBOX = 'allow-popups-to-escape-sandbox',
  ALLOW_PRESENTATION = 'allow-presentation',
  ALLOW_SAME_ORIGIN = 'allow-same-origin',
  ALLOW_SCRIPTS = 'allow-scripts',
  ALLOW_TOP_NAVIGATION = 'allow-top-navigation',
  ALLOW_TOP_NAVIGATION_BY_USER_ACTIVATION = 'allow-top-navigation-by-user-activation',
}

/**
 * Hash algorithm types
 */
export enum HashAlgorithm {
  SHA256 = 'sha256',
  SHA384 = 'sha384',
  SHA512 = 'sha512',
}

/**
 * CSP source expression
 */
export interface CSPSource {
  /** Scheme (e.g., 'https:') */
  scheme?: string;
  /** Host (e.g., 'example.com') */
  host?: string;
  /** Port number */
  port?: number;
  /** Path */
  path?: string;
  /** Is wildcard */
  wildcard?: boolean;
  /** Is self reference */
  self?: boolean;
  /** Is data URL */
  data?: boolean;
  /** Is blob URL */
  blob?: boolean;
  /** Is about:blank */
  about?: boolean;
  /** Is any (unsafe) */
  any?: boolean;
  /** Nonce value */
  nonce?: string;
  /** Hash value */
  hash?: { algorithm: HashAlgorithm; value: string };
  /** Is unsafe eval */
  unsafeEval?: boolean;
  /** Is unsafe inline */
  unsafeInline?: boolean;
  /** Is unsafe hashes */
  unsafeHashes?: boolean;
  /** Is strict dynamic */
  strictDynamic?: boolean;
  /** Is report sample */
  reportSample?: boolean;
}

/**
 * CSP policy configuration
 */
export interface CSPPolicy {
  /** Policy directives */
  directives: Map<CSPDirective, string[]>;
  /** Policy name/identifier */
  name?: string;
  /** Is report-only mode */
  reportOnly?: boolean;
  /** Disposition */
  disposition?: 'enforce' | 'report-only';
}

/**
 * CSP violation report
 */
export interface CSPViolationReport {
  /** Document URI */
  'document-uri'?: string;
  /** Referrer */
  referrer?: string;
  /** Blocked URI */
  'blocked-uri'?: string;
  /** Violated directive */
  'violated-directive'?: string;
  /** Effective directive */
  'effective-directive'?: string;
  /** Original policy */
  'original-policy'?: string;
  /** Disposition */
  disposition?: 'enforce' | 'report-only';
  /** Script sample */
  'script-sample'?: string;
  /** Status code */
  'status-code'?: number;
  /** Source file */
  'source-file'?: string;
  /** Line number */
  'line-number'?: number;
  /** Column number */
  'column-number'?: number;
}

/**
 * CSP management options
 */
export interface CSPManagerOptions {
  /** Default nonce size in bytes */
  nonceSize?: number;
  /** Default hash algorithm */
  defaultHashAlgorithm?: HashAlgorithm;
  /** Enable nonce caching */
  enableNonceCache?: boolean;
  /** Nonce cache TTL in seconds */
  nonceCacheTTL?: number;
  /** Enable violation reporting */
  enableReporting?: boolean;
  /** Violation report endpoint */
  reportEndpoint?: string;
  /** Report sample size */
  reportSampleSize?: number;
}

/**
 * CSP statistics
 */
export interface CSPStatistics {
  totalPoliciesGenerated: number;
  totalNoncesGenerated: number;
  totalViolationsReported: number;
  violationsByDirective: Record<string, number>;
  averagePolicyGenerationTime: number;
  lastPolicyGenerationTime: Date;
}

/**
 * Nonce cache entry
 */
interface NonceCacheEntry {
  nonce: string;
  timestamp: number;
}

/**
 * ContentSecurityPolicyManager class
 *
 * Manages CSP policies, nonces, and violation reporting.
 */
export class ContentSecurityPolicyManager extends EventEmitter {
  private options: Required<CSPManagerOptions>;
  private policies: Map<string, CSPPolicy> = new Map();
  private nonceCache: Map<string, NonceCacheEntry> = new Map();
  private statistics: CSPStatistics;

  /**
   * Create a new CSP manager
   *
   * @param options - Manager options
   */
  constructor(options: CSPManagerOptions = {}) {
    super();

    this.options = {
      nonceSize: 16,
      defaultHashAlgorithm: HashAlgorithm.SHA256,
      enableNonceCache: true,
      nonceCacheTTL: 3600, // 1 hour
      enableReporting: true,
      reportEndpoint: '/csp-violation-report',
      reportSampleSize: 40,
      ...options,
    };

    this.statistics = {
      totalPoliciesGenerated: 0,
      totalNoncesGenerated: 0,
      totalViolationsReported: 0,
      violationsByDirective: {},
      averagePolicyGenerationTime: 0,
      lastPolicyGenerationTime: new Date(),
    };

    // Start nonce cache cleanup interval
    if (this.options.enableNonceCache) {
      setInterval(() => this.cleanupNonceCache(), 60000); // Every minute
    }
  }

  /**
   * Create a new CSP policy
   *
   * @param name - Policy name
   * @param directives - Policy directives
   * @param reportOnly - Whether this is a report-only policy
   * @returns CSP policy
   */
  createPolicy(
    name: string,
    directives: Partial<Record<CSPDirective, string | string[]>>,
    reportOnly = false
  ): CSPPolicy {
    const directiveMap = new Map<CSPDirective, string[]>();

    for (const [directive, value] of Object.entries(directives)) {
      const values = Array.isArray(value) ? value : [value];
      directiveMap.set(directive as CSPDirective, values);
    }

    const policy: CSPPolicy = {
      directives: directiveMap,
      name,
      reportOnly,
      disposition: reportOnly ? 'report-only' : 'enforce',
    };

    this.policies.set(name, policy);
    return policy;
  }

  /**
   * Get a policy by name
   *
   * @param name - Policy name
   * @returns CSP policy or undefined
   */
  getPolicy(name: string): CSPPolicy | undefined {
    return this.policies.get(name);
  }

  /**
   * Generate CSP header from policy
   *
   * @param policy - CSP policy
   * @returns CSP header value
   */
  generateHeader(policy: CSPPolicy): string {
    const startTime = Date.now();

    const parts: string[] = [];

    for (const [directive, sources] of policy.directives.entries()) {
      const sourceList = sources.join(' ');
      parts.push(`${directive} ${sourceList}`);
    }

    const header = parts.join('; ');

    // Update statistics
    this.statistics.totalPoliciesGenerated++;
    const duration = Date.now() - startTime;
    this.statistics.averagePolicyGenerationTime =
      (this.statistics.averagePolicyGenerationTime * (this.statistics.totalPoliciesGenerated - 1) + duration) /
      this.statistics.totalPoliciesGenerated;
    this.statistics.lastPolicyGenerationTime = new Date();

    return header;
  }

  /**
   * Generate CSP headers for a policy (both enforce and report-only)
   *
   * @param policy - CSP policy
   * @returns Object with header names and values
   */
  generateHeaders(policy: CSPPolicy): Record<string, string> {
    const headers: Record<string, string> = {};

    const headerValue = this.generateHeader(policy);

    if (policy.reportOnly) {
      headers['Content-Security-Policy-Report-Only'] = headerValue;
    } else {
      headers['Content-Security-Policy'] = headerValue;
    }

    return headers;
  }

  /**
   * Generate a cryptographically secure nonce
   *
   * @returns Nonce string (base64 encoded)
   */
  generateNonce(): string {
    const nonceBytes = randomBytes(this.options.nonceSize);
    const nonce = nonceBytes.toString('base64');

    this.statistics.totalNoncesGenerated++;

    return nonce;
  }

  /**
   * Generate and cache a nonce for a specific resource
   *
   * @param resource - Resource identifier
   * @returns Nonce string
   */
  generateNonceFor(resource: string): string {
    let nonce: string;

    if (this.options.enableNonceCache) {
      const cached = this.nonceCache.get(resource);
      if (cached && Date.now() - cached.timestamp < this.options.nonceCacheTTL * 1000) {
        return cached.nonce;
      }
    }

    nonce = this.generateNonce();

    if (this.options.enableNonceCache) {
      this.nonceCache.set(resource, {
        nonce,
        timestamp: Date.now(),
      });
    }

    return nonce;
  }

  /**
   * Generate a hash from inline script or style
   *
   * @param content - Inline content to hash
   * @param algorithm - Hash algorithm to use
   * @returns Hash string (e.g., 'sha256-abc123...')
   */
  generateHash(content: string, algorithm: HashAlgorithm = this.options.defaultHashAlgorithm): string {
    const hash = createHash(algorithm);
    hash.update(content);
    const digest = hash.digest('base64');
    return `${algorithm}-${digest}`;
  }

  /**
   * Format a CSP source for use in a policy
   *
   * @param source - CSP source
   * @returns Formatted source string
   */
  formatSource(source: CSPSource): string {
    if (source.self) return "'self'";
    if (source.any) return '*';
    if (source.unsafeEval) return "'unsafe-eval'";
    if (source.unsafeInline) return "'unsafe-inline'";
    if (source.unsafeHashes) return "'unsafe-hashes'";
    if (source.strictDynamic) return "'strict-dynamic'";
    if (source.reportSample) return "'report-sample'";
    if (source.data) return 'data:';
    if (source.blob) return 'blob:';
    if (source.about) return 'about:';
    if (source.nonce) return `'nonce-${source.nonce}'`;
    if (source.hash) return `'${source.hash.algorithm}-${source.hash.value}'`;

    let sourceStr = '';
    if (source.scheme) sourceStr += source.scheme;
    if (source.wildcard) sourceStr += '*.';
    if (source.host) sourceStr += source.host;
    if (source.port) sourceStr += `:${source.port}`;
    if (source.path) sourceStr += source.path;

    return sourceStr || '';
  }

  /**
   * Create a strict security policy (recommended for production)
   *
   * @returns CSP policy with strict directives
   */
  createStrictPolicy(): CSPPolicy {
    return this.createPolicy('strict', {
      [CSPDirective.DEFAULT_SRC]: ["'self'"],
      [CSPDirective.SCRIPT_SRC]: ["'self'"],
      [CSPDirective.STYLE_SRC]: ["'self'", "'unsafe-inline'"], // Inline styles often needed for CSS-in-JS
      [CSPDirective.IMG_SRC]: ["'self'", 'data:', 'https:'],
      [CSPDirective.FONT_SRC]: ["'self'", 'data:'],
      [CSPDirective.CONNECT_SRC]: ["'self'"],
      [CSPDirective.MEDIA_SRC]: ["'self'"],
      [CSPDirective.OBJECT_SRC]: ["'none'"],
      [CSPDirective.FRAME_SRC]: ["'none'"],
      [CSPDirective.FRAME_ANCESTORS]: ["'none'"],
      [CSPDirective.BASE_URI]: ["'self'"],
      [CSPDirective.FORM_ACTION]: ["'self'"],
      [CSPDirective.UPGRADE_INSECURE_REQUESTS]: [],
    });
  }

  /**
   * Create a development policy (more permissive for local development)
   *
   * @returns CSP policy for development
   */
  createDevelopmentPolicy(): CSPPolicy {
    return this.createPolicy('development', {
      [CSPDirective.DEFAULT_SRC]: ["'self'", 'http://localhost:*', 'ws://localhost:*'],
      [CSPDirective.SCRIPT_SRC]: ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'http://localhost:*'],
      [CSPDirective.STYLE_SRC]: ["'self'", "'unsafe-inline'"],
      [CSPDirective.IMG_SRC]: ["'self'", 'data:', 'https:', 'http:'],
      [CSPDirective.FONT_SRC]: ["'self'", 'data:'],
      [CSPDirective.CONNECT_SRC]: ["'self'", 'ws://localhost:*', 'http://localhost:*'],
      [CSPDirective.MEDIA_SRC]: ["'self'"],
      [CSPDirective.OBJECT_SRC]: ["'none'"],
      [CSPDirective.FRAME_SRC]: ["'none'"],
    });
  }

  /**
   * Handle a CSP violation report
   *
   * @param report - Violation report
   */
  handleViolationReport(report: CSPViolationReport): void {
    this.statistics.totalViolationsReported++;

    const directive = report['violated-directive'] || report['effective-directive'] || 'unknown';
    this.statistics.violationsByDirective[directive] =
      (this.statistics.violationsByDirective[directive] || 0) + 1;

    // Emit violation event
    this.emit('violation', report);

    // Log critical violations
    if (report.disposition === 'enforce') {
      this.emit('blocked-violation', report);
    }
  }

  /**
   * Validate a policy configuration
   *
   * @param policy - Policy to validate
   * @returns Validation result
   */
  validatePolicy(policy: CSPPolicy): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for 'unsafe-inline' in script-src
    const scriptSrc = policy.directives.get(CSPDirective.SCRIPT_SRC);
    if (scriptSrc && scriptSrc.includes("'unsafe-inline'")) {
      errors.push("Using 'unsafe-inline' in script-src is a security risk");
    }

    // Check for 'unsafe-eval' in script-src
    if (scriptSrc && scriptSrc.includes("'unsafe-eval'")) {
      errors.push("Using 'unsafe-eval' in script-src is a security risk");
    }

    // Check for missing default-src
    if (!policy.directives.has(CSPDirective.DEFAULT_SRC)) {
      errors.push('Missing default-src directive');
    }

    // Check for unsafe sources in object-src
    const objectSrc = policy.directives.get(CSPDirective.OBJECT_SRC);
    if (objectSrc && !objectSrc.includes("'none'")) {
      errors.push('object-src should be set to none for best security');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Merge multiple policies
   *
   * @param policies - Policies to merge
   * @returns Merged policy
   */
  mergePolicies(...policies: CSPPolicy[]): CSPPolicy {
    const merged = new Map<CSPDirective, Set<string>>();

    for (const policy of policies) {
      for (const [directive, sources] of policy.directives.entries()) {
        if (!merged.has(directive)) {
          merged.set(directive, new Set());
        }
        for (const source of sources) {
          merged.get(directive)!.add(source);
        }
      }
    }

    const mergedDirectives: Record<CSPDirective, string[]> = {} as Record<CSPDirective, string[]>;
    for (const [directive, sources] of merged.entries()) {
      mergedDirectives[directive] = Array.from(sources);
    }

    return this.createPolicy('merged', mergedDirectives);
  }

  /**
   * Cleanup expired nonces from cache
   */
  private cleanupNonceCache(): void {
    const now = Date.now();
    const ttl = this.options.nonceCacheTTL * 1000;

    for (const [resource, entry] of this.nonceCache.entries()) {
      if (now - entry.timestamp > ttl) {
        this.nonceCache.delete(resource);
      }
    }
  }

  /**
   * Get statistics
   *
   * @returns CSP statistics
   */
  getStatistics(): CSPStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalPoliciesGenerated: 0,
      totalNoncesGenerated: 0,
      totalViolationsReported: 0,
      violationsByDirective: {},
      averagePolicyGenerationTime: 0,
      lastPolicyGenerationTime: new Date(),
    };
  }

  /**
   * Clear nonce cache
   */
  clearNonceCache(): void {
    this.nonceCache.clear();
  }

  /**
   * Remove a policy
   *
   * @param name - Policy name
   * @returns True if policy was removed
   */
  removePolicy(name: string): boolean {
    return this.policies.delete(name);
  }

  /**
   * List all policy names
   *
   * @returns Array of policy names
   */
  listPolicies(): string[] {
    return Array.from(this.policies.keys());
  }

  /**
   * Add a directive to a policy
   *
   * @param policyName - Policy name
   * @param directive - Directive to add
   * @param sources - Source list
   * @returns True if directive was added
   */
  addDirective(policyName: string, directive: CSPDirective, sources: string[]): boolean {
    const policy = this.policies.get(policyName);
    if (!policy) return false;

    policy.directives.set(directive, sources);
    return true;
  }

  /**
   * Remove a directive from a policy
   *
   * @param policyName - Policy name
   * @param directive - Directive to remove
   * @returns True if directive was removed
   */
  removeDirective(policyName: string, directive: CSPDirective): boolean {
    const policy = this.policies.get(policyName);
    if (!policy) return false;

    return policy.directives.delete(directive);
  }
}

/**
 * Default CSP manager instance
 */
export const defaultCSPManager = new ContentSecurityPolicyManager();

/**
 * Convenience function to create a strict policy
 *
 * @returns CSP policy
 */
export function createStrictPolicy(): CSPPolicy {
  return defaultCSPManager.createStrictPolicy();
}

/**
 * Convenience function to create a development policy
 *
 * @returns CSP policy
 */
export function createDevelopmentPolicy(): CSPPolicy {
  return defaultCSPManager.createDevelopmentPolicy();
}

/**
 * Convenience function to generate a nonce
 *
 * @returns Nonce string
 */
export function generateNonce(): string {
  return defaultCSPManager.generateNonce();
}

/**
 * Convenience function to generate a hash
 *
 * @param content - Content to hash
 * @param algorithm - Hash algorithm
 * @returns Hash string
 */
export function generateHash(content: string, algorithm?: HashAlgorithm): string {
  return defaultCSPManager.generateHash(content, algorithm);
}

/**
 * Convenience function to format a source
 *
 * @param source - CSP source
 * @returns Formatted source string
 */
export function formatSource(source: CSPSource): string {
  return defaultCSPManager.formatSource(source);
}

/**
 * Convenience function to generate CSP headers
 *
 * @param policy - CSP policy
 * @returns Headers object
 */
export function generateCSPHeaders(policy: CSPPolicy): Record<string, string> {
  return defaultCSPManager.generateHeaders(policy);
}

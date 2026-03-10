/**
 * Plugin Validator
 *
 * Comprehensive validation system for plugins including manifest validation,
 * security scanning, permission validation, and compatibility checks.
 */

import {
  PluginManifest,
  PluginValidationResult,
  ValidationError,
  ValidationWarning,
  SecurityScanResult,
  SecurityIssue,
  PermissionType,
  PluginCategory,
} from './types';
import { createHash } from 'crypto';

/**
 * Plugin Validator class
 */
export class PluginValidator {
  private readonly semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly urlRegex = /^https?:\/\/.+/;

  /**
   * Validate plugin manifest
   */
  validateManifest(manifest: PluginManifest): PluginValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    this.validateRequiredFields(manifest, errors);
    this.validateIdentifiers(manifest, errors);
    this.validateVersion(manifest, errors);
    this.validateAuthor(manifest, errors, warnings);
    this.validateExtensions(manifest, errors, warnings);
    this.validatePermissions(manifest, errors, warnings);
    this.validateDependencies(manifest, warnings);
    this.validateSignature(manifest, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate plugin package (including security scan)
   */
  async validatePlugin(
    manifest: PluginManifest,
    pluginCode: string
  ): Promise<PluginValidationResult> {
    const manifestResult = this.validateManifest(manifest);
    const securityResults = await this.performSecurityScan(manifest, pluginCode);

    return {
      ...manifestResult,
      securityResults,
    };
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(
    manifest: PluginManifest,
    errors: ValidationError[]
  ): void {
    const requiredFields: (keyof PluginManifest)[] = [
      'id',
      'name',
      'version',
      'description',
      'author',
      'license',
      'pollnVersion',
      'main',
      'extensions',
      'permissions',
    ];

    for (const field of requiredFields) {
      if (!manifest[field]) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: `Required field '${field}' is missing`,
          field,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate identifiers
   */
  private validateIdentifiers(
    manifest: PluginManifest,
    errors: ValidationError[]
  ): void {
    // Plugin ID should be lowercase with hyphens
    if (manifest.id && !/^[a-z0-9-]+$/.test(manifest.id)) {
      errors.push({
        code: 'INVALID_PLUGIN_ID',
        message: 'Plugin ID must be lowercase with hyphens only',
        field: 'id',
        severity: 'error',
      });
    }

    // Plugin ID should not start or end with hyphen
    if (manifest.id && (manifest.id.startsWith('-') || manifest.id.endsWith('-'))) {
      errors.push({
        code: 'INVALID_PLUGIN_ID',
        message: 'Plugin ID must not start or end with a hyphen',
        field: 'id',
        severity: 'error',
      });
    }

    // Name should not be empty
    if (manifest.name && manifest.name.trim().length === 0) {
      errors.push({
        code: 'INVALID_PLUGIN_NAME',
        message: 'Plugin name cannot be empty',
        field: 'name',
        severity: 'error',
      });
    }
  }

  /**
   * Validate version strings
   */
  private validateVersion(
    manifest: PluginManifest,
    errors: ValidationError[]
  ): void {
    if (!manifest.version) return;

    if (!this.semverRegex.test(manifest.version)) {
      errors.push({
        code: 'INVALID_VERSION',
        message: 'Plugin version must follow semantic versioning (e.g., 1.0.0)',
        field: 'version',
        severity: 'error',
      });
    }

    if (!this.semverRegex.test(manifest.pollnVersion)) {
      errors.push({
        code: 'INVALID_POLLN_VERSION',
        message: 'Polln version must follow semantic versioning',
        field: 'pollnVersion',
        severity: 'error',
      });
    }

    if (manifest.minPollnVersion && !this.semverRegex.test(manifest.minPollnVersion)) {
      errors.push({
        code: 'INVALID_MIN_POLLN_VERSION',
        message: 'Minimum Polln version must follow semantic versioning',
        field: 'minPollnVersion',
        severity: 'error',
      });
    }

    if (manifest.maxPollnVersion && !this.semverRegex.test(manifest.maxPollnVersion)) {
      errors.push({
        code: 'INVALID_MAX_POLLN_VERSION',
        message: 'Maximum Polln version must follow semantic versioning',
        field: 'maxPollnVersion',
        severity: 'error',
      });
    }
  }

  /**
   * Validate author information
   */
  private validateAuthor(
    manifest: PluginManifest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!manifest.author) return;

    if (!manifest.author.name) {
      errors.push({
        code: 'MISSING_AUTHOR_NAME',
        message: 'Author name is required',
        field: 'author.name',
        severity: 'error',
      });
    }

    if (manifest.author.email && !this.emailRegex.test(manifest.author.email)) {
      errors.push({
        code: 'INVALID_AUTHOR_EMAIL',
        message: 'Author email format is invalid',
        field: 'author.email',
        severity: 'error',
      });
    }

    if (manifest.author.url && !this.urlRegex.test(manifest.author.url)) {
      errors.push({
        code: 'INVALID_AUTHOR_URL',
        message: 'Author URL must be a valid HTTP/HTTPS URL',
        field: 'author.url',
        severity: 'error',
      });
    }

    // Warn if missing contact information
    if (!manifest.author.email && !manifest.author.url) {
      warnings.push({
        code: 'NO_AUTHOR_CONTACT',
        message: 'Author contact information (email or URL) is recommended',
        field: 'author',
      });
    }
  }

  /**
   * Validate extensions
   */
  private validateExtensions(
    manifest: PluginManifest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!manifest.extensions || manifest.extensions.length === 0) {
      warnings.push({
        code: 'NO_EXTENSIONS',
        message: 'Plugin has no extensions defined',
        field: 'extensions',
      });
      return;
    }

    const extensionIds = new Set<string>();

    for (const extension of manifest.extensions) {
      // Validate extension ID
      if (!extension.id) {
        errors.push({
          code: 'MISSING_EXTENSION_ID',
          message: 'Extension ID is required',
          field: 'extensions[].id',
          severity: 'error',
        });
        continue;
      }

      // Check for duplicate extension IDs
      if (extensionIds.has(extension.id)) {
        errors.push({
          code: 'DUPLICATE_EXTENSION_ID',
          message: `Duplicate extension ID: ${extension.id}`,
          field: 'extensions[].id',
          severity: 'error',
        });
      }
      extensionIds.add(extension.id);

      // Validate extension type
      if (!extension.type) {
        errors.push({
          code: 'MISSING_EXTENSION_TYPE',
          message: `Extension type is required for ${extension.id}`,
          field: 'extensions[].type',
          severity: 'error',
        });
      }

      // Validate extension name
      if (!extension.name) {
        errors.push({
          code: 'MISSING_EXTENSION_NAME',
          message: `Extension name is required for ${extension.id}`,
          field: 'extensions[].name',
          severity: 'error',
        });
      }

      // Warn if missing description
      if (!extension.description) {
        warnings.push({
          code: 'NO_EXTENSION_DESCRIPTION',
          message: `Extension ${extension.id} is missing a description`,
          field: 'extensions[].description',
        });
      }
    }
  }

  /**
   * Validate permissions
   */
  private validatePermissions(
    manifest: PluginManifest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!manifest.permissions || manifest.permissions.length === 0) {
      return; // No permissions is valid
    }

    for (const permission of manifest.permissions) {
      // Validate permission type
      if (!permission.type) {
        errors.push({
          code: 'MISSING_PERMISSION_TYPE',
          message: 'Permission type is required',
          field: 'permissions[].type',
          severity: 'error',
        });
        continue;
      }

      // Check if permission type is valid
      if (!Object.values(PermissionType).includes(permission.type)) {
        errors.push({
          code: 'INVALID_PERMISSION_TYPE',
          message: `Unknown permission type: ${permission.type}`,
          field: 'permissions[].type',
          severity: 'error',
        });
      }

      // Warn if missing reason for sensitive permissions
      const sensitivePermissions = [
        PermissionType.NETWORK_ACCESS,
        PermissionType.FILE_READ,
        PermissionType.FILE_WRITE,
        PermissionType.SYSTEM_INFO,
      ];

      if (sensitivePermissions.includes(permission.type) && !permission.reason) {
        warnings.push({
          code: 'NO_PERMISSION_REASON',
          message: `Permission ${permission.type} should include a reason`,
          field: 'permissions[].reason',
        });
      }
    }

    // Warn about excessive permissions
    if (manifest.permissions.length > 10) {
      warnings.push({
        code: 'EXCESSIVE_PERMISSIONS',
        message: 'Plugin requests many permissions - consider minimizing',
        field: 'permissions',
      });
    }
  }

  /**
   * Validate dependencies
   */
  private validateDependencies(
    manifest: PluginManifest,
    warnings: ValidationWarning[]
  ): void {
    if (!manifest.dependencies || manifest.dependencies.length === 0) {
      return;
    }

    const dependencyIds = new Set<string>();

    for (const dependency of manifest.dependencies) {
      // Validate dependency ID
      if (!dependency.pluginId) {
        warnings.push({
          code: 'MISSING_DEPENDENCY_ID',
          message: 'Dependency plugin ID is missing',
          field: 'dependencies[].pluginId',
        });
        continue;
      }

      // Check for duplicate dependencies
      if (dependencyIds.has(dependency.pluginId)) {
        warnings.push({
          code: 'DUPLICATE_DEPENDENCY',
          message: `Duplicate dependency: ${dependency.pluginId}`,
          field: 'dependencies[].pluginId',
        });
      }
      dependencyIds.add(dependency.pluginId);

      // Validate version range
      if (!dependency.version) {
        warnings.push({
          code: 'MISSING_DEPENDENCY_VERSION',
          message: `Dependency ${dependency.pluginId} is missing version range`,
          field: 'dependencies[].version',
        });
      }
    }

    // Warn about too many dependencies
    if (manifest.dependencies.length > 5) {
      warnings.push({
        code: 'MANY_DEPENDENCIES',
        message: 'Plugin has many dependencies - consider reducing',
        field: 'dependencies',
      });
    }
  }

  /**
   * Validate signature
   */
  private validateSignature(
    manifest: PluginManifest,
    warnings: ValidationWarning[]
  ): void {
    if (!manifest.signature) {
      warnings.push({
        code: 'NO_SIGNATURE',
        message: 'Plugin is not signed - signed plugins are preferred',
        field: 'signature',
      });
      return;
    }

    // Validate signature algorithm
    const validAlgorithms = ['RS256', 'ES256', 'HS256'];
    if (!validAlgorithms.includes(manifest.signature.algorithm)) {
      warnings.push({
        code: 'INVALID_SIGNATURE_ALGORITHM',
        message: `Unknown signature algorithm: ${manifest.signature.algorithm}`,
        field: 'signature.algorithm',
      });
    }

    // Validate signer information
    if (!manifest.signature.signer || !manifest.signature.signer.name) {
      warnings.push({
        code: 'NO_SIGNER_NAME',
        message: 'Signature is missing signer name',
        field: 'signature.signer.name',
      });
    }

    // Warn if certificate URL is missing
    if (!manifest.signature.certificateUrl) {
      warnings.push({
        code: 'NO_CERTIFICATE_URL',
        message: 'Signature is missing certificate URL',
        field: 'signature.certificateUrl',
      });
    }
  }

  /**
   * Perform security scan on plugin code
   */
  async performSecurityScan(
    manifest: PluginManifest,
    pluginCode: string
  ): Promise<SecurityScanResult> {
    const issues: SecurityIssue[] = [];

    // Check for suspicious patterns
    issues.push(...this.scanForSuspiciousCode(pluginCode));

    // Check for excessive permissions
    issues.push(...this.scanForExcessivePermissions(manifest));

    // Check for vulnerabilities
    issues.push(...this.scanForVulnerabilities(pluginCode));

    // Calculate permission score
    const permissionScore = this.calculatePermissionScore(manifest);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(issues, permissionScore);

    return {
      passed: issues.filter(i => i.severity === 'high' || i.severity === 'critical').length === 0,
      issues,
      permissionScore,
      riskLevel,
    };
  }

  /**
   * Scan for suspicious code patterns
   */
  private scanForSuspiciousCode(code: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lowerCode = code.toLowerCase();

    // Check for eval usage
    if (lowerCode.includes('eval(')) {
      issues.push({
        type: 'suspicious_code',
        severity: 'high',
        message: 'Plugin uses eval() which can be dangerous',
        location: this.findCodeLocation(code, 'eval('),
      });
    }

    // Check for Function constructor
    if (lowerCode.includes('new function(')) {
      issues.push({
        type: 'suspicious_code',
        severity: 'high',
        message: 'Plugin uses Function constructor which can be dangerous',
        location: this.findCodeLocation(code, 'new Function('),
      });
    }

    // Check forinnerHTML usage
    if (lowerCode.includes('innerhtml')) {
      issues.push({
        type: 'suspicious_code',
        severity: 'medium',
        message: 'Plugin uses innerHTML which can lead to XSS vulnerabilities',
        location: this.findCodeLocation(code, 'innerHTML'),
      });
    }

    // Check for external script loading
    if (lowerCode.includes('createelement(') && lowerCode.includes('script')) {
      issues.push({
        type: 'suspicious_code',
        severity: 'medium',
        message: 'Plugin may dynamically load scripts',
        location: this.findCodeLocation(code, 'createElement'),
      });
    }

    // Check for network requests to non-HTTPS
    const httpMatches = code.match(/http:\/\/[^\s"'>]+/g);
    if (httpMatches && httpMatches.length > 0) {
      issues.push({
        type: 'suspicious_code',
        severity: 'low',
        message: 'Plugin makes HTTP (non-HTTPS) requests',
        location: this.findCodeLocation(code, httpMatches[0]),
      });
    }

    return issues;
  }

  /**
   * Scan for excessive permissions
   */
  private scanForExcessivePermissions(manifest: PluginManifest): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const permissions = manifest.permissions || [];

    // Check for file system access
    if (permissions.some(p => p.type === PermissionType.FILE_WRITE)) {
      issues.push({
        type: 'excessive_permissions',
        severity: 'medium',
        message: 'Plugin requests file write access',
      });
    }

    // Check for system info access
    if (permissions.some(p => p.type === PermissionType.SYSTEM_INFO)) {
      issues.push({
        type: 'excessive_permissions',
        severity: 'medium',
        message: 'Plugin requests system information access',
      });
    }

    // Check for network access
    if (permissions.some(p => p.type === PermissionType.NETWORK_ACCESS)) {
      issues.push({
        type: 'excessive_permissions',
        severity: 'low',
        message: 'Plugin requests network access',
      });
    }

    return issues;
  }

  /**
   * Scan for known vulnerabilities
   */
  private scanForVulnerabilities(code: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for prototype pollution
    if (code.includes('__proto__') || code.includes('constructor[')) {
      issues.push({
        type: 'vulnerability',
        severity: 'critical',
        message: 'Potential prototype pollution vulnerability',
        location: this.findCodeLocation(code, '__proto__'),
      });
    }

    // Check for regex DoS
    if (this.hasComplexRegex(code)) {
      issues.push({
        type: 'vulnerability',
        severity: 'medium',
        message: 'Complex regular expression may be vulnerable to DoS',
      });
    }

    return issues;
  }

  /**
   * Calculate permission score (0-100)
   */
  private calculatePermissionScore(manifest: PluginManifest): number {
    const permissions = manifest.permissions || [];
    let score = 100;

    // Deduct points for sensitive permissions
    const sensitivePermissions = [
      { type: PermissionType.FILE_WRITE, penalty: 20 },
      { type: PermissionType.FILE_READ, penalty: 15 },
      { type: PermissionType.SYSTEM_INFO, penalty: 15 },
      { type: PermissionType.NETWORK_ACCESS, penalty: 10 },
      { type: PermissionType.CLIPBOARD_READ, penalty: 5 },
      { type: PermissionType.CLIPBOARD_WRITE, penalty: 5 },
    ];

    for (const permission of permissions) {
      const sensitive = sensitivePermissions.find(sp => sp.type === permission.type);
      if (sensitive) {
        score -= sensitive.penalty;
      }
    }

    // Deduct points for too many permissions
    if (permissions.length > 5) {
      score -= (permissions.length - 5) * 3;
    }

    return Math.max(0, score);
  }

  /**
   * Determine risk level
   */
  private determineRiskLevel(issues: SecurityIssue[], permissionScore: number): 'low' | 'medium' | 'high' | 'critical' {
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const mediumIssues = issues.filter(i => i.severity === 'medium').length;

    if (criticalIssues > 0 || permissionScore < 30) {
      return 'critical';
    }
    if (highIssues > 0 || permissionScore < 50) {
      return 'high';
    }
    if (mediumIssues > 2 || permissionScore < 70) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Find code location (line number)
   */
  private findCodeLocation(code: string, pattern: string): string {
    const index = code.toLowerCase().indexOf(pattern.toLowerCase());
    if (index === -1) return 'unknown';

    const before = code.substring(0, index);
    const line = before.split('\n').length;
    return `line ${line}`;
  }

  /**
   * Check for complex regex patterns
   */
  private hasComplexRegex(code: string): boolean {
    const regexMatches = code.match(/\/[^\/\n]+\//g) || [];
    for (const regex of regexMatches) {
      // Check for nested quantifiers, excessive repetition, etc.
      if (regex.includes('++') || regex.includes('**') || regex.length > 50) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate compatibility
   */
  validateCompatibility(
    manifest: PluginManifest,
    pollnVersion: string
  ): { compatible: boolean; reason?: string } {
    const pluginVersion = manifest.pollnVersion;
    const minVersion = manifest.minPollnVersion;
    const maxVersion = manifest.maxPollnVersion;

    // Simple version comparison (semver-aware)
    const pluginMajor = this.getMajorVersion(pluginVersion);
    const pollnMajor = this.getMajorVersion(pollnVersion);

    if (pluginMajor !== pollnMajor) {
      return {
        compatible: false,
        reason: `Plugin requires Polln major version ${pluginMajor}, current is ${pollnMajor}`,
      };
    }

    if (minVersion && this.compareVersions(pollnVersion, minVersion) < 0) {
      return {
        compatible: false,
        reason: `Polln version ${pollnVersion} is below minimum required ${minVersion}`,
      };
    }

    if (maxVersion && this.compareVersions(pollnVersion, maxVersion) > 0) {
      return {
        compatible: false,
        reason: `Polln version ${pollnVersion} exceeds maximum supported ${maxVersion}`,
      };
    }

    return { compatible: true };
  }

  /**
   * Get major version from semver string
   */
  private getMajorVersion(version: string): number {
    const match = version.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Compare two semver versions
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (parts1[i] < parts2[i]) return -1;
      if (parts1[i] > parts2[i]) return 1;
    }
    return 0;
  }

  /**
   * Compute plugin hash for integrity checking
   */
  computePluginHash(pluginCode: string): string {
    return createHash('sha256').update(pluginCode).digest('hex');
  }
}

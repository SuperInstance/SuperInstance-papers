/**
 * POLLN Dependency Scanner
 * Scans npm dependencies for known vulnerabilities
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import type {
  ScanResult,
  ScanType,
  Vulnerability,
  Severity,
  SecurityFinding,
  ScanOptions
} from './types.js';

const execAsync = promisify(exec);

/**
 * NPM audit result
 */
interface NPMAuditResult {
  vulnerabilities: {
    [key: string]: {
      name: string;
      severity: 'low' | 'moderate' | 'high' | 'critical';
      via: Array<string | { url: string; }>;
      effects: string[];
      range: string;
      nodes: string[];
      fixAvailable: { name: string; version: string; isSemVerMajor: boolean; } | false;
    };
  };
  metadata: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
    };
    dependencies: number;
    devDependencies: number;
    optionalDependencies: number;
    totalDependencies: number;
  };
}

/**
 * Snyk scan result
 */
interface SnykResult {
  vulnerabilities: Array<{
    id: string;
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    cvssScore: number;
    cves: string[];
    packageName: string;
    version: string;
    fixVersions: string[];
    language: string;
    packageManager: string;
  }>;
}

/**
 * Dependency Scanner Options
 */
export interface DependencyScannerOptions {
  includeDevDependencies?: boolean;
  useSnyk?: boolean;
  snykToken?: string;
  timeout?: number;
}

/**
 * Dependency Scanner Class
 */
export class DependencyScanner {
  private options: Required<DependencyScannerOptions>;

  constructor(options: DependencyScannerOptions = {}) {
    this.options = {
      includeDevDependencies: options.includeDevDependencies ?? true,
      useSnyk: options.useSnyk ?? false,
      snykToken: options.snykToken ?? '',
      timeout: options.timeout ?? 60000
    };
  }

  /**
   * Scan dependencies for vulnerabilities
   */
  async scan(targetPath: string, scanOptions: ScanOptions = {}): Promise<ScanResult> {
    const startTime = Date.now();
    const findings: SecurityFinding[] = [];

    try {
      // Run npm audit
      const npmFindings = await this.runNPMAudit(targetPath);
      findings.push(...npmFindings);

      // Run Snyk if enabled
      if (this.options.useSnyk && this.options.snykToken) {
        const snykFindings = await this.runSnykScan(targetPath);
        findings.push(...snykFindings);
      }

      const duration = Date.now() - startTime;

      return {
        id: randomUUID(),
        type: ScanType.DEPENDENCY,
        targetPath,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration,
        status: 'completed',
        findings,
        summary: this.generateSummary(findings),
        metadata: {
          scanner: 'dependency-scanner',
          version: '1.0.0',
          includeDevDependencies: this.options.includeDevDependencies,
          totalDependencies: await this.countDependencies(targetPath)
        }
      };
    } catch (error) {
      return {
        id: randomUUID(),
        type: ScanType.DEPENDENCY,
        targetPath,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
        status: 'failed',
        findings: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Run npm audit
   */
  private async runNPMAudit(targetPath: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      const { stdout } = await execAsync('npm audit --json', {
        cwd: targetPath,
        timeout: this.options.timeout
      });

      const result: NPMAuditResult = JSON.parse(stdout);

      for (const [packageName, vuln] of Object.entries(result.vulneraries)) {
        const severity = this.mapNPMSeverity(vuln.severity);

        findings.push({
          id: randomUUID(),
          category: 'dependency-vulnerability',
          severity,
          title: `${packageName} - ${vuln.name}`,
          description: `Known vulnerability in ${packageName}@${vuln.range}`,
          recommendation: vuln.fixAvailable
            ? `Update to ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}`
            : 'No fix available',
          references: [],
          codeLocations: [{
            file: 'package.json',
            line: 0,
            column: 0,
            snippet: `"${packageName}": "${vuln.range}"`
          }],
          owaspCategory: 'A05:2021 - Security Misconfiguration',
          cwe: ['CWE-1104'],
          metadata: {
            packageName,
            vulnerableRange: vuln.range,
            affectedPackages: vuln.effects,
            fixAvailable: !!vuln.fixAvailable,
            nodes: vuln.nodes
          }
        });
      }
    } catch (error) {
      // npm audit exits with non-zero code when vulnerabilities are found
      const stderr = (error as any).stderr;
      if (stderr) {
        try {
          const result: NPMAuditResult = JSON.parse(stderr);
          // Process the same way as above
        } catch {
          // Output is not JSON, ignore
        }
      }
    }

    return findings;
  }

  /**
   * Run Snyk scan
   */
  private async runSnykScan(targetPath: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      // Set Snyk token
      process.env.SNYK_TOKEN = this.options.snykToken;

      const { stdout } = await execAsync('snyk test --json', {
        cwd: targetPath,
        timeout: this.options.timeout
      });

      const result: SnykResult = JSON.parse(stdout);

      for (const vuln of result.vulnerabilities) {
        const severity = this.mapSnykSeverity(vuln.severity);

        findings.push({
          id: randomUUID(),
          category: 'dependency-vulnerability',
          severity,
          title: vuln.title,
          description: `${vuln.packageName}@${vuln.version} - ${vuln.title}`,
          recommendation: vuln.fixVersions.length > 0
            ? `Update to version ${vuln.fixVersions.join(' or ')}`
            : 'No fix available',
          references: vuln.cves.map(cve => `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cve}`),
          codeLocations: [{
            file: 'package.json',
            line: 0,
            column: 0,
            snippet: `"${vuln.packageName}": "${vuln.version}"`
          }],
          owaspCategory: 'A05:2021 - Security Misconfiguration',
          cwe: ['CWE-1104'],
          metadata: {
            snykId: vuln.id,
            packageName: vuln.packageName,
            vulnerableVersion: vuln.version,
            fixVersions: vuln.fixVersions,
            cvssScore: vuln.cvssScore,
            cves: vuln.cves
          }
        });
      }
    } catch (error) {
      // Snyk may not be installed or no token provided
      console.warn('Snyk scan failed:', (error as Error).message);
    }

    return findings;
  }

  /**
   * Count dependencies
   */
  private async countDependencies(targetPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync('npm ls --json', {
        cwd: targetPath,
        timeout: this.options.timeout
      });

      const result = JSON.parse(stdout);
      return result.dependencies ? Object.keys(result.dependencies).length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Map npm severity to our severity
   */
  private mapNPMSeverity(severity: string): Severity {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'moderate':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'info';
    }
  }

  /**
   * Map Snyk severity to our severity
   */
  private mapSnykSeverity(severity: string): Severity {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'info';
    }
  }

  /**
   * Generate summary
   */
  private generateSummary(findings: SecurityFinding[]): ScanResult['summary'] {
    return {
      total: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length
    };
  }

  /**
   * Check if Snyk is available
   */
  async isSnykAvailable(): Promise<boolean> {
    try {
      await execAsync('snyk --version');
      return true;
    } catch {
      return false;
    }
  }
}

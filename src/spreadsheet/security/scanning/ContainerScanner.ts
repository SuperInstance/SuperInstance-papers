/**
 * POLLN Container Scanner
 * Scans Docker images for vulnerabilities using Trivy
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import type {
  ScanResult,
  ScanType,
  SecurityFinding,
  ScanOptions
} from './types.js';

const execAsync = promisify(exec);

/**
 * Trivy vulnerability result
 */
interface TrivyVulnerability {
  Target: string;
  Type: string;
  Vulnerabilities: Array<{
    VulnerabilityID: string;
    PkgName: string;
    InstalledVersion: string;
    FixedVersion: string;
    Severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    Title: string;
    Description: string;
    CVSS: {
      V3Score?: number;
      V2Score?: number;
    };
    References: string[];
    Layer: {
      Digest: string;
      DiffID: string;
    };
  }>;
}

/**
 * Container Scanner Options
 */
export interface ContainerScannerOptions {
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'ALL';
  skipDirs?: string[];
  timeout?: number;
}

/**
 * Container Scanner Class
 */
export class ContainerScanner {
  private options: Required<ContainerScannerOptions>;

  constructor(options: ContainerScannerOptions = {}) {
    this.options = {
      severity: options.severity || 'ALL',
      skipDirs: options.skipDirs || [],
      timeout: options.timeout || 300000 // 5 minutes
    };
  }

  /**
   * Scan Docker image
   */
  async scanImage(imageName: string, scanOptions: ScanOptions = {}): Promise<ScanResult> {
    const startTime = Date.now();
    const findings: SecurityFinding[] = [];

    try {
      const trivyFindings = await this.runTrivy(imageName);
      findings.push(...trivyFindings);

      const duration = Date.now() - startTime;

      return {
        id: randomUUID(),
        type: ScanType.CONTAINER,
        targetPath: imageName,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration,
        status: 'completed',
        findings,
        summary: this.generateSummary(findings),
        metadata: {
          scanner: 'container-scanner',
          version: '1.0.0',
          image: imageName,
          severity: this.options.severity
        }
      };
    } catch (error) {
      return {
        id: randomUUID(),
        type: ScanType.CONTAINER,
        targetPath: imageName,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
        status: 'failed',
        findings,
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Scan Dockerfile
   */
  async scanDockerfile(dockerfilePath: string, scanOptions: ScanOptions = {}): Promise<ScanResult> {
    const startTime = Date.now();
    const findings: SecurityFinding[] = [];

    try {
      // Read and analyze Dockerfile
      const fs = await import('fs/promises');
      const content = await fs.readFile(dockerfilePath, 'utf-8');

      // Check for security issues in Dockerfile
      findings.push(...this.analyzeDockerfile(content, dockerfilePath));

      const duration = Date.now() - startTime;

      return {
        id: randomUUID(),
        type: ScanType.SAST,
        targetPath: dockerfilePath,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration,
        status: 'completed',
        findings,
        summary: this.generateSummary(findings),
        metadata: {
          scanner: 'dockerfile-scanner',
          version: '1.0.0',
          dockerfilePath
        }
      };
    } catch (error) {
      return {
        id: randomUUID(),
        type: ScanType.SAST,
        targetPath: dockerfilePath,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
        status: 'failed',
        findings,
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Run Trivy scan
   */
  private async runTrivy(imageName: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      const { stdout } = await execAsync(
        `trivy image --format json --severity ${this.options.severity} ${imageName}`,
        { timeout: this.options.timeout }
      );

      const results: TrivyVulnerability[] = JSON.parse(stdout);

      for (const result of results) {
        for (const vuln of result.Vulnerabilities) {
          findings.push({
            id: randomUUID(),
            category: 'container-vulnerability',
            severity: this.mapTrivySeverity(vuln.Severity),
            title: `${vuln.VulnerabilityID} in ${vuln.PkgName}`,
            description: vuln.Description || vuln.Title,
            recommendation: vuln.FixedVersion
              ? `Update ${vuln.PkgName} to ${vuln.FixedVersion}`
              : 'No fix available',
            references: vuln.References,
            codeLocations: [{
              file: result.Target,
              line: 0,
              column: 0,
              snippet: `${vuln.PkgName} @ ${vuln.InstalledVersion}`
            }],
            owaspCategory: 'A05:2021 - Security Misconfiguration',
            cwe: ['CWE-1104'],
            metadata: {
              vulnerabilityId: vuln.VulnerabilityID,
              packageName: vuln.PkgName,
              installedVersion: vuln.InstalledVersion,
              fixedVersion: vuln.FixedVersion,
              cvssScore: vuln.CVSS.V3Score || vuln.CVSS.V2Score,
              target: result.Target,
              layer: vuln.Layer
            }
          });
        }
      }
    } catch (error) {
      console.warn('Trivy scan failed:', (error as Error).message);
    }

    return findings;
  }

  /**
   * Analyze Dockerfile for security issues
   */
  private analyzeDockerfile(content: string, filepath: string): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for latest tag
      if (line.toLowerCase().includes(':latest')) {
        findings.push({
          id: randomUUID(),
          category: 'dockerfile-security',
          severity: 'medium',
          title: 'Using :latest tag in FROM instruction',
          description: 'Using the :latest tag can lead to unexpected updates and potential security vulnerabilities',
          recommendation: 'Pin to a specific version instead of using :latest',
          references: ['https://docs.docker.com/develop/develop-images/dockerfile_best-practices/'],
          codeLocations: [{
            file: filepath,
            line: lineNum,
            column: 0,
            snippet: line.trim()
          }],
          owaspCategory: 'A05:2021 - Security Misconfiguration',
          cwe: ['CWE-1104']
        });
      }

      // Check for running as root
      if (line.trim().startsWith('USER') && !line.includes('root')) {
        // Good - not running as root
      } else if (line.trim().startsWith('USER root') || !lines.some(l => l.trim().startsWith('USER'))) {
        findings.push({
          id: randomUUID(),
          category: 'dockerfile-security',
          severity: 'high',
          title: 'Container running as root user',
          description: 'Running containers as root can lead to privilege escalation vulnerabilities',
          recommendation: 'Add a USER instruction to run as a non-root user',
          references: ['https://docs.docker.com/develop/develop-images/dockerfile_best-practices/'],
          codeLocations: [{
            file: filepath,
            line: lineNum,
            column: 0,
            snippet: line.trim() || '<no USER instruction>'
          }],
          owaspCategory: 'A01:2021 - Broken Access Control',
          cwe: ['CWE-250']
        });
      }

      // Check for exposed credentials
      if (line.toLowerCase().includes('password') || line.toLowerCase().includes('secret') || line.toLowerCase().includes('api_key')) {
        findings.push({
          id: randomUUID(),
          category: 'dockerfile-security',
          severity: 'critical',
          title: 'Potential credential exposure in Dockerfile',
          description: 'Credentials should not be hardcoded in Dockerfiles',
          recommendation: 'Use environment variables or secrets management',
          references: ['https://docs.docker.com/engine/swarm/secrets/'],
          codeLocations: [{
            file: filepath,
            line: lineNum,
            column: 0,
            snippet: line.trim()
          }],
          owaspCategory: 'A07:2021 - Identification and Authentication Failures',
          cwe: ['CWE-798']
        });
      }

      // Check for ADD instruction (should use COPY instead)
      if (line.trim().startsWith('ADD ')) {
        findings.push({
          id: randomUUID(),
          category: 'dockerfile-security',
          severity: 'low',
          title: 'Using ADD instead of COPY',
          description: 'ADD can extract tar files and fetch remote URLs, which can be a security risk',
          recommendation: 'Use COPY for local files, only use ADD when tar extraction is needed',
          references: ['https://docs.docker.com/develop/develop-images/dockerfile_best-practices/'],
          codeLocations: [{
            file: filepath,
            line: lineNum,
            column: 0,
            snippet: line.trim()
          }],
          owaspCategory: 'A05:2021 - Security Misconfiguration',
          cwe: ['CWE-434']
        });
      }
    }

    return findings;
  }

  /**
   * Map Trivy severity to our severity
   */
  private mapTrivySeverity(severity: string): SecurityFinding['severity'] {
    switch (severity) {
      case 'CRITICAL':
        return 'critical';
      case 'HIGH':
        return 'high';
      case 'MEDIUM':
        return 'medium';
      case 'LOW':
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
   * Check if Trivy is available
   */
  async isTrivyAvailable(): Promise<boolean> {
    try {
      await execAsync('trivy --version');
      return true;
    } catch {
      return false;
    }
  }
}

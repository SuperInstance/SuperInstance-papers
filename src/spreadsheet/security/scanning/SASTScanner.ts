/**
 * POLLN SAST Scanner
 * Static Application Security Testing for TypeScript/JavaScript
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import type {
  Vulnerability,
  SecurityFinding,
  ScanResult,
  ScanSummary,
  FindingLocation,
  Severity,
  ScanType
} from './types.js';

const execAsync = promisify(exec);

/**
 * SAST Scanner Configuration
 */
export interface SASTConfig {
  rulesets: string[];
  excludePatterns: string[];
  maxDepth: number;
  timeout: number;
}

/**
 * SAST Scanner Class
 * Performs static analysis on TypeScript/JavaScript code
 */
export class SASTScanner {
  private config: SASTConfig;

  constructor(config: Partial<SASTConfig> = {}) {
    this.config = {
      rulesets: ['security', 'best-practices'],
      excludePatterns: ['node_modules/**', 'dist/**', 'build/**', '**/*.test.ts'],
      maxDepth: 10,
      timeout: 30000,
      ...config
    };
  }

  /**
   * Run full SAST scan
   */
  async scan(targetPath: string): Promise<ScanResult> {
    const scanId = this.generateScanId();
    const startedAt = new Date();

    try {
      // Run ESLint security scan
      const eslintFindings = await this.runESLint(targetPath);

      // Run custom security rules
      const customFindings = await this.runCustomRules(targetPath);

      // Merge findings
      const allFindings = [...eslintFindings, ...customFindings];

      const summary = this.calculateSummary(allFindings);

      return {
        scanId,
        type: ScanType.SAST,
        status: 'completed',
        startedAt,
        completedAt: new Date(),
        duration: Date.now() - startedAt.getTime(),
        vulnerabilities: allFindings,
        summary
      };
    } catch (error) {
      return {
        scanId,
        type: ScanType.SAST,
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        vulnerabilities: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Run ESLint with security plugins
   */
  private async runESLint(targetPath: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      // Check if eslint is available
      await execAsync('npx eslint --version', { timeout: 5000 });

      // Run eslint with security rules
      const { stdout } = await execAsync(
        `npx eslint "${targetPath}" --format json --no-eslintrc --config .eslintrc.security.json`,
        { timeout: this.config.timeout }
      );

      const results = JSON.parse(stdout);

      for (const result of results || []) {
        for (const message of result.messages || []) {
          findings.push({
            id: this.generateFindingId(),
            type: ScanType.SAST,
            severity: this.mapESLintSeverity(message.severity),
            title: message.ruleId || 'ESLint Finding',
            description: message.message,
            location: {
              file: result.filePath,
              line: message.line,
              column: message.column,
              endLine: message.endLine,
              endColumn: message.endColumn
            },
            ruleId: message.ruleId,
            category: this.categorizeRule(message.ruleId),
            references: [],
            detectedAt: new Date(),
            status: 'open'
          });
        }
      }
    } catch (error) {
      // ESLint not available or error running - continue with custom rules
      console.log('ESLint scan skipped, using custom rules only');
    }

    return findings;
  }

  /**
   * Run custom security rules
   */
  private async runCustomRules(targetPath: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    // Scan for common security patterns
    const patterns = this.getSecurityPatterns();

    await this.scanDirectory(targetPath, patterns, findings);

    return findings;
  }

  /**
   * Get security patterns to scan for
   */
  private getSecurityPatterns(): Array<{
    pattern: RegExp;
    title: string;
    description: string;
    severity: Severity;
    category: string;
  }> {
    return [
      {
        pattern: /(process\.env\.[A-Z_]+)/g,
        title: 'Environment Variable Usage',
        description: 'Environment variable should be validated before use',
        severity: Severity.LOW,
        category: 'Security'
      },
      {
        pattern: /eval\s*\(/g,
        title: 'Use of eval()',
        description: 'eval() can execute arbitrary code and should be avoided',
        severity: Severity.HIGH,
        category: 'Code Injection'
      },
      {
        pattern: /innerHTML\s*=/g,
        title: 'Direct innerHTML Assignment',
        description: 'Direct innerHTML assignment can lead to XSS vulnerabilities',
        severity: Severity.HIGH,
        category: 'XSS'
      },
      {
        pattern: /dangerouslySetInnerHTML/g,
        title: 'Dangerous InnerHTML',
        description: 'dangerouslySetInnerHTML bypasses React XSS protection',
        severity: Severity.MEDIUM,
        category: 'XSS'
      },
      {
        pattern: /document\.write\s*\(/g,
        title: 'Document Write Usage',
        description: 'document.write() can lead to XSS vulnerabilities',
        severity: Severity.MEDIUM,
        category: 'XSS'
      },
      {
        pattern: /setTimeout\s*\(\s*["'`][^"'`]*["'`]\s*,/g,
        title: 'setTimeout with String',
        description: 'setTimeout with string argument acts like eval()',
        severity: Severity.MEDIUM,
        category: 'Code Injection'
      }
    ];
  }

  /**
   * Scan directory for security patterns
   */
  private async scanDirectory(
    dirPath: string,
    patterns: Array<{ pattern: RegExp; title: string; description: string; severity: Severity; category: string }>,
    findings: SecurityFinding[],
    depth = 0
  ): Promise<void> {
    if (depth > this.config.maxDepth) return;

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        // Skip excluded patterns
        if (this.shouldExclude(fullPath)) continue;

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, patterns, findings, depth + 1);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
          await this.scanFile(fullPath, patterns, findings);
        }
      }
    } catch (error) {
      // Directory not accessible or doesn't exist
    }
  }

  /**
   * Scan individual file
   */
  private async scanFile(
    filePath: string,
    patterns: Array<{ pattern: RegExp; title: string; description: string; severity: Severity; category: string }>,
    findings: SecurityFinding[]
  ): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const patternConfig of patterns) {
        let match;
        const regex = new RegExp(patternConfig.pattern.source, patternConfig.pattern.flags + 'g');

        while ((match = regex.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const columnNumber = match.index - content.lastIndexOf('\n', match.index);

          findings.push({
            id: this.generateFindingId(),
            type: ScanType.SAST,
            severity: patternConfig.severity,
            title: patternConfig.title,
            description: patternConfig.description,
            location: {
              file: filePath,
              line: lineNumber,
              column: columnNumber
            },
            code: lines[lineNumber - 1]?.trim(),
            category: patternConfig.category,
            references: [],
            detectedAt: new Date(),
            status: 'open'
          });
        }
      }
    } catch (error) {
      // File not readable
    }
  }

  /**
   * Check if path should be excluded
   */
  private shouldExclude(path: string): boolean {
    return this.config.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(path);
    });
  }

  /**
   * Map ESLint severity to our Severity enum
   */
  private mapESLintSeverity(eslintSeverity: number): Severity {
    switch (eslintSeverity) {
      case 0:
      case 1:
        return Severity.LOW;
      case 2:
        return Severity.MEDIUM;
      default:
        return Severity.HIGH;
    }
  }

  /**
   * Categorize rule based on rule ID
   */
  private categorizeRule(ruleId: string | undefined): string {
    if (!ruleId) return 'General';

    const rule = ruleId.toLowerCase();

    if (rule.includes('security')) return 'Security';
    if (rule.includes('xss')) return 'XSS';
    if (rule.includes('injection')) return 'Injection';
    if (rule.includes('crypto')) return 'Cryptography';
    if (rule.includes('auth')) return 'Authentication';
    if (rule.includes('sql')) return 'SQL Injection';

    return 'General';
  }

  /**
   * Calculate scan summary
   */
  private calculateSummary(findings: SecurityFinding[]): ScanSummary {
    return findings.reduce(
      (summary, finding) => {
        summary.total++;
        summary[finding.severity]++;
        return summary;
      },
      { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    );
  }

  /**
   * Generate unique scan ID
   */
  private generateScanId(): string {
    return `sast-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate unique finding ID
   */
  private generateFindingId(): string {
    return `finding-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

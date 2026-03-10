/**
 * POLLN Security Scanning System
 * Comprehensive type definitions for security scanning
 */

// Severity levels
export enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

// Scan types
export enum ScanType {
  SAST = 'sast',
  DAST = 'dast',
  DEPENDENCY = 'dependency',
  CONTAINER = 'container',
  LICENSE = 'license'
}

// Scan status
export enum ScanStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Vulnerability interface
export interface Vulnerability {
  id: string;
  type: ScanType;
  severity: Severity;
  title: string;
  description: string;
  location?: string;
  cve?: string;
  cvssScore?: number;
  references: string[];
  remediation?: string;
  detectedAt: Date;
  status: 'open' | 'fixed' | 'ignored' | 'false-positive';
}

// Scan result interface
export interface ScanResult {
  scanId: string;
  type: ScanType;
  status: ScanStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  vulnerabilities: Vulnerability[];
  summary: ScanSummary;
  errors?: string[];
}

// Scan summary
export interface ScanSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

// Finding location
export interface FindingLocation {
  file: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  function?: string;
  className?: string;
}

// Security finding extends Vulnerability
export interface SecurityFinding extends Vulnerability {
  location: FindingLocation;
  code?: string;
  context?: string;
  ruleId?: string;
  category?: string;
}

// Compliance frameworks
export enum ComplianceFramework {
  OWASP_TOP_10 = 'owasp-top-10',
  CIS_CONTROLS = 'cis-controls',
  PCI_DSS = 'pci-dss',
  SOC_2 = 'soc-2',
  GDPR = 'gdpr',
  CUSTOM = 'custom'
}

// Compliance check result
export interface ComplianceResult {
  framework: ComplianceFramework;
  passed: boolean;
  score: number; // 0-100
  requirements: ComplianceRequirement[];
  scannedAt: Date;
}

// Compliance requirement
export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'compliant' | 'non-compliant' | 'partial';
  findings: Vulnerability[];
}

// Security metrics
export interface SecurityMetrics {
  period: {
    start: Date;
    end: Date;
  };
  scans: {
    total: number;
    completed: number;
    failed: number;
  };
  vulnerabilities: {
    open: number;
    fixed: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  mttf: number; // Mean Time To Fix in hours
  coverage: number; // percentage
}

// Severity utilities
export const SeverityUtils = {
  toNumber(severity: Severity): number {
    switch (severity) {
      case Severity.CRITICAL: return 5;
      case Severity.HIGH: return 4;
      case Severity.MEDIUM: return 3;
      case Severity.LOW: return 2;
      case Severity.INFO: return 1;
      default: return 0;
    }
  },

  fromNumber(score: number): Severity {
    if (score >= 5) return Severity.CRITICAL;
    if (score >= 4) return Severity.HIGH;
    if (score >= 3) return Severity.MEDIUM;
    if (score >= 2) return Severity.LOW;
    return Severity.INFO;
  },

  color(severity: Severity): string {
    switch (severity) {
      case Severity.CRITICAL: return '#dc2626';
      case Severity.HIGH: return '#ea580c';
      case Severity.MEDIUM: return '#d97706';
      case Severity.LOW: return '#65a30d';
      case Severity.INFO: return '#0891b2';
      default: return '#6b7280';
    }
  }
};

// OWASP Top 10 (2021) categories
export const OWASP_TOP_10 = [
  'A01:2021-Broken Access Control',
  'A02:2021-Cryptographic Failures',
  'A03:2021-Injection',
  'A04:2021-Insecure Design',
  'A05:2021-Security Misconfiguration',
  'A06:2021-Vulnerable and Outdated Components',
  'A07:2021-Identification and Authentication Failures',
  'A08:2021-Software and Data Integrity Failures',
  'A09:2021-Security Logging and Monitoring Failures',
  'A10:2021-Server-Side Request Forgery'
] as const;

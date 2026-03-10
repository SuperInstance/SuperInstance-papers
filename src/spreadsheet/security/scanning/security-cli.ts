#!/usr/bin/env node
/**
 * POLLN Security CLI
 * Command-line interface for security scanning
 */

import { Command } from 'commander';
import { SASTScanner } from './SASTScanner.js';
import { VulnerabilityTracker } from './VulnerabilityTracker.js';
import type { Severity, ScanType } from './types.js';

const program = new Command();

// Global options
program
  .name('polln-security')
  .description('POLLN Security Scanning CLI')
  .version('1.0.0');

/**
 * Scan command
 */
program
  .command('scan')
  .description('Run security scan')
  .option('-p, --path <path>', 'Path to scan', '.')
  .option('-t, --type <type>', 'Scan type (sast, dast, dependency, container, all)', 'all')
  .option('-o, --output <format>', 'Output format (json, text, sarif)', 'text')
  .option('-s, --severity <severity>', 'Minimum severity (critical, high, medium, low, info)', 'low')
  .action(async (options) => {
    const tracker = new VulnerabilityTracker();
    const results: any[] = [];

    console.log(`\n= POLLN Security Scanner`);
    console.log(`Scanning: ${options.path}`);
    console.log(`Type: ${options.type}`);
    console.log(`Minimum severity: ${options.severity}\n`);

    if (options.type === 'sast' || options.type === 'all') {
      console.log('Running SAST scan...');
      const sastScanner = new SASTScanner();
      const sastResult = await sastScanner.scan(options.path);

      for (const vuln of sastResult.vulnerabilities) {
        tracker.addOrUpdate(vuln);
      }

      results.push(sastResult);
      console.log(`  Found ${sastResult.summary.total} issues`);
    }

    if (options.type === 'all' || options.type === 'dependency') {
      console.log('Running dependency scan...');
      // Dependency scanner would be implemented here
    }

    const stats = tracker.getStatistics();
    console.log(`\n=Ê Summary:`);
    console.log(`  Total: ${stats.open} open vulnerabilities`);
    console.log(`  Critical: ${stats.bySeverity.critical}`);
    console.log(`  High: ${stats.bySeverity.high}`);
    console.log(`  Medium: ${stats.bySeverity.medium}`);
    console.log(`  Low: ${stats.bySeverity.low}`);

    if (stats.bySeverity.critical > 0 || stats.bySeverity.high > 0) {
      console.log(`\n   Action required: ${stats.bySeverity.critical + stats.bySeverity.high} critical/high issues found`);
    }
  });

/**
 * Vulnerabilities command
 */
program
  .command('vulnerabilities')
  .description('List and manage vulnerabilities')
  .option('-s, --severity <severity>', 'Filter by severity')
  .option('-t, --type <type>', 'Filter by type')
  .option('--status <status>', 'Filter by status')
  .option('-o, --output <format>', 'Output format (json, text)', 'text')
  .action((options) => {
    const tracker = new VulnerabilityTracker();
    const vulns = tracker.getAll();

    let filtered = vulns;

    if (options.severity) {
      filtered = filtered.filter(v => v.severity === options.severity);
    }

    if (options.type) {
      filtered = filtered.filter(v => v.type === options.type);
    }

    if (options.status) {
      filtered = filtered.filter(v => v.status === options.status);
    }

    // Sort by risk score
    filtered.sort((a, b) => b.riskScore.score - a.riskScore.score);

    if (options.output === 'json') {
      console.log(JSON.stringify(filtered, null, 2));
    } else {
      console.log(`\n= Vulnerabilities (${filtered.length}):\n`);

      for (const vuln of filtered) {
        console.log(`[${vuln.severity.toUpperCase()}] ${vuln.title}`);
        console.log(`  Risk Score: ${vuln.riskScore.score}/100`);
        console.log(`  Location: ${vuln.location || 'N/A'}`);
        console.log(`  Status: ${vuln.status}`);
        console.log(`  CVE: ${vuln.cve || 'N/A'}`);
        console.log(`  Detected: ${vuln.detectedAt.toLocaleDateString()}`);
        console.log(`  Recommendation: ${vuln.riskScore.recommendation}`);
        console.log('');
      }
    }
  });

/**
 * Remediation command
 */
program
  .command('remediation')
  .description('Generate remediation plan')
  .option('-p, --priority <priority>', 'Filter by priority (critical, high, medium, low)')
  .action((options) => {
    const tracker = new VulnerabilityTracker();
    const plan = tracker.generateRemediationPlan();

    console.log(`\n=Ë Remediation Plan\n`);
    console.log(`Priority: ${plan.priority.toUpperCase()}`);
    console.log(`Total Effort: ${plan.estimatedTotalEffort} hours`);
    console.log(`Can Start: ${plan.canStartImmediately ? 'Yes' : 'No'}\n`);

    console.log('Vulnerabilities to fix:');

    for (const vuln of plan.vulnerabilities) {
      const effort = vuln.estimatedEffort || 0;
      console.log(`  [${vuln.severity.toUpperCase()}] ${vuln.title} (${effort}h)`);
      console.log(`    Risk: ${vuln.riskScore.score}/100`);
      console.log(`    Due: ${vuln.dueDate?.toLocaleDateString() || 'N/A'}`);
      console.log('');
    }
  });

/**
 * Compliance command
 */
program
  .command('compliance')
  .description('Check compliance against frameworks')
  .option('-f, --framework <framework>', 'Framework (owasp-top-10, cis-controls, pci-dss, soc-2, gdpr)', 'owasp-top-10')
  .action(async (options) => {
    console.log(`\n Compliance Check: ${options.framework.toUpperCase()}\n`);

    // Compliance check would be implemented here
    console.log('Compliance checking not yet implemented');
  });

/**
 * Export command
 */
program
  .command('export')
  .description('Export scan results')
  .option('-f, --format <format>', 'Export format (json, csv, sarif)', 'json')
  .option('-o, --output <file>', 'Output file')
  .action((options) => {
    console.log(`\n=ä Exporting results as ${options.format.toUpperCase()}\n`);

    const tracker = new VulnerabilityTracker();
    const vulns = tracker.getAll();

    if (options.format === 'json') {
      const data = {
        exportedAt: new Date(),
        version: '1.0.0',
        vulnerabilities: vulns
      };
      console.log(JSON.stringify(data, null, 2));
    } else if (options.format === 'csv') {
      console.log('id,severity,title,type,status,riskScore');
      for (const vuln of vulns) {
        console.log(`${vuln.id},${vuln.severity},"${vuln.title}",${vuln.type},${vuln.status},${vuln.riskScore.score}`);
      }
    } else {
      console.log('SARIF export not yet implemented');
    }
  });

/**
 * Metrics command
 */
program
  .command('metrics')
  .description('Show security metrics')
  .option('-d, --days <days>', 'Period in days', '30')
  .action((options) => {
    const tracker = new VulnerabilityTracker();
    const stats = tracker.getStatistics();

    console.log(`\n=È Security Metrics (Last ${options.days} days)\n`);

    console.log('Vulnerabilities:');
    console.log(`  Total: ${stats.total}`);
    console.log(`  Open: ${stats.open}`);
    console.log(`  Fixed: ${stats.fixed}`);
    console.log(`  Ignored: ${stats.ignored}`);

    console.log('\nBy Severity:');
    console.log(`  Critical: ${stats.bySeverity.critical}`);
    console.log(`  High: ${stats.bySeverity.high}`);
    console.log(`  Medium: ${stats.bySeverity.medium}`);
    console.log(`  Low: ${stats.bySeverity.low}`);

    console.log('\nBy Type:');
    console.log(`  SAST: ${stats.byType.sast}`);
    console.log(`  DAST: ${stats.byType.dast}`);
    console.log(`  Dependency: ${stats.byType.dependency}`);
    console.log(`  Container: ${stats.byType.container}`);

    console.log(`\nAverage Risk Score: ${stats.averageRiskScore.toFixed(1)}/100`);
  });

/**
 * Assign command
 */
program
  .command('assign')
  .description('Assign vulnerability to user')
  .requiredOption('-i, --id <id>', 'Vulnerability ID')
  .requiredOption('-u, --user <user>', 'User ID')
  .action((options) => {
    const tracker = new VulnerabilityTracker();
    const result = tracker.assignTo(options.id, options.user);

    if (result) {
      console.log(`\n Assigned vulnerability ${options.id} to ${options.user}`);
      console.log(`   Due: ${result.dueDate?.toLocaleDateString() || 'N/A'}`);
    } else {
      console.log(`\nL Vulnerability ${options.id} not found`);
    }
  });

/**
 * Fix command
 */
program
  .command('fix')
  .description('Mark vulnerability as fixed')
  .requiredOption('-i, --id <id>', 'Vulnerability ID')
  .requiredOption('-u, --user <user>', 'User who fixed it')
  .action((options) => {
    const tracker = new VulnerabilityTracker();
    const result = tracker.markAsFixed(options.id, options.user);

    if (result) {
      console.log(`\n Vulnerability ${options.id} marked as fixed by ${options.user}`);
    } else {
      console.log(`\nL Vulnerability ${options.id} not found`);
    }
  });

/**
 * Ignore command
 */
program
  .command('ignore')
  .description('Mark vulnerability as ignored')
  .requiredOption('-i, --id <id>', 'Vulnerability ID')
  .requiredOption('-r, --reason <reason>', 'Reason for ignoring')
  .action((options) => {
    const tracker = new VulnerabilityTracker();
    const result = tracker.markAsIgnored(options.id, options.reason);

    if (result) {
      console.log(`\n Vulnerability ${options.id} marked as ignored`);
      console.log(`   Reason: ${options.reason}`);
    } else {
      console.log(`\nL Vulnerability ${options.id} not found`);
    }
  });

// Parse arguments
program.parse();

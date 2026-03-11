#!/usr/bin/env node

/**
 * Security verification script for SuperInstance website
 * Verifies security headers, CSP, and compliance requirements
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

class SecurityVerifier {
  constructor() {
    this.results = [];
    this.failures = [];
  }

  /**
   * Verify security headers are properly configured
   */
  async verifySecurityHeaders() {
    console.log('🔍 Verifying security headers configuration...');

    try {
      // Check wrangler.toml for security headers configuration
      const wranglerConfig = fs.readFileSync(path.join(projectRoot, 'wrangler.toml'), 'utf8');

      const requiredHeaders = [
        'csp =',
        'x_frame_options =',
        'x_content_type_options =',
        'referrer_policy =',
        'permissions_policy =',
        'strict_transport_security =',
        'x_xss_protection =',
      ];

      const missingHeaders = requiredHeaders.filter(header => !wranglerConfig.includes(header));

      const result = {
        name: 'Security Headers Configuration',
        type: 'configuration',
        passed: missingHeaders.length === 0,
        missingHeaders,
        details: `Found ${requiredHeaders.length - missingHeaders.length}/${requiredHeaders.length} required headers`,
      };

      this.results.push(result);

      if (!result.passed) {
        this.failures.push({
          name: 'Security Headers Configuration',
          reason: `Missing security headers: ${missingHeaders.join(', ')}`,
        });
      }

      console.log(result.passed ? '✅ Security headers configured' : '❌ Missing security headers');
      return result;
    } catch (error) {
      console.error('❌ Failed to verify security headers:', error.message);
      return null;
    }
  }

  /**
   * Verify CSP configuration
   */
  async verifyCspConfiguration() {
    console.log('🔒 Verifying Content Security Policy...');

    try {
      const wranglerConfig = fs.readFileSync(path.join(projectRoot, 'wrangler.toml'), 'utf8');

      // Extract CSP from wrangler.toml
      const cspMatch = wranglerConfig.match(/csp = "([^"]+)"/);

      if (!cspMatch) {
        const result = {
          name: 'CSP Configuration',
          type: 'configuration',
          passed: false,
          error: 'CSP not found in wrangler.toml',
        };
        this.results.push(result);
        this.failures.push({ name: 'CSP Configuration', reason: 'CSP not configured' });
        console.log('❌ CSP not configured');
        return result;
      }

      const csp = cspMatch[1];

      // Check for essential CSP directives
      const requiredDirectives = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'self'",
        "frame-src 'none'",
        "object-src 'none'",
      ];

      const missingDirectives = requiredDirectives.filter(directive => !csp.includes(directive));

      const result = {
        name: 'CSP Configuration',
        type: 'configuration',
        passed: missingDirectives.length === 0,
        csp,
        missingDirectives,
        details: `CSP configured with ${csp.split(';').length} directives`,
      };

      this.results.push(result);

      if (!result.passed) {
        this.failures.push({
          name: 'CSP Configuration',
          reason: `Missing CSP directives: ${missingDirectives.join(', ')}`,
        });
      }

      console.log(result.passed ? '✅ CSP properly configured' : '❌ Missing CSP directives');
      return result;
    } catch (error) {
      console.error('❌ Failed to verify CSP:', error.message);
      return null;
    }
  }

  /**
   * Verify compliance configuration
   */
  async verifyComplianceConfiguration() {
    console.log('📋 Verifying compliance configuration...');

    try {
      const wranglerConfig = fs.readFileSync(path.join(projectRoot, 'wrangler.toml'), 'utf8');

      // Check for compliance section
      const hasComplianceSection = wranglerConfig.includes('[compliance]');
      const hasCoppa = wranglerConfig.includes('coppa = true');
      const hasFerpa = wranglerConfig.includes('ferpa = true');
      const hasGdpr = wranglerConfig.includes('gdpr = true');
      const hasDataRetention = wranglerConfig.includes('data_retention_days = 30');

      const complianceChecks = [
        { name: 'Compliance Section', passed: hasComplianceSection },
        { name: 'COPPA Compliance', passed: hasCoppa },
        { name: 'FERPA Compliance', passed: hasFerpa },
        { name: 'GDPR Compliance', passed: hasGdpr },
        { name: 'Data Retention', passed: hasDataRetention },
      ];

      const passedChecks = complianceChecks.filter(check => check.passed).length;
      const failedChecks = complianceChecks.filter(check => !check.passed);

      const result = {
        name: 'Compliance Configuration',
        type: 'compliance',
        passed: failedChecks.length === 0,
        checks: complianceChecks,
        details: `${passedChecks}/${complianceChecks.length} compliance checks passed`,
      };

      this.results.push(result);

      if (!result.passed) {
        this.failures.push({
          name: 'Compliance Configuration',
          reason: `Failed compliance checks: ${failedChecks.map(c => c.name).join(', ')}`,
        });
      }

      console.log(result.passed ? '✅ Compliance properly configured' : '❌ Missing compliance configuration');
      return result;
    } catch (error) {
      console.error('❌ Failed to verify compliance:', error.message);
      return null;
    }
  }

  /**
   * Verify security middleware exists
   */
  async verifySecurityMiddleware() {
    console.log('🛡️ Verifying security middleware...');

    try {
      const middlewarePath = path.join(projectRoot, 'src', 'middleware', 'security.ts');
      const middlewareExists = fs.existsSync(middlewarePath);

      let middlewareContent = '';
      if (middlewareExists) {
        middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
      }

      // Check for essential security functions
      const requiredFunctions = [
        'securityMiddleware',
        'validateFormInput',
        'sanitizeHtml',
        'generateCsrfToken',
        'validateCsrfToken',
        'logSecurityEvent',
      ];

      const missingFunctions = requiredFunctions.filter(func => !middlewareContent.includes(func));

      const result = {
        name: 'Security Middleware',
        type: 'code',
        passed: middlewareExists && missingFunctions.length === 0,
        middlewareExists,
        missingFunctions,
        details: middlewareExists
          ? `Middleware found with ${requiredFunctions.length - missingFunctions.length}/${requiredFunctions.length} required functions`
          : 'Middleware file not found',
      };

      this.results.push(result);

      if (!result.passed) {
        this.failures.push({
          name: 'Security Middleware',
          reason: middlewareExists
            ? `Missing security functions: ${missingFunctions.join(', ')}`
            : 'Security middleware file not found',
        });
      }

      console.log(result.passed ? '✅ Security middleware properly implemented' : '❌ Issues with security middleware');
      return result;
    } catch (error) {
      console.error('❌ Failed to verify security middleware:', error.message);
      return null;
    }
  }

  /**
   * Verify Cloudflare security worker
   */
  async verifyCloudflareWorker() {
    console.log('☁️ Verifying Cloudflare security worker...');

    try {
      const workerPath = path.join(projectRoot, 'cloudflare-security.js');
      const workerExists = fs.existsSync(workerPath);

      let workerContent = '';
      if (workerExists) {
        workerContent = fs.readFileSync(workerPath, 'utf8');
      }

      // Check for essential worker functions
      const requiredComponents = [
        'SECURITY_HEADERS',
        'addSecurityHeaders',
        'checkSecurityThreats',
        'logSecurityEvent',
        'export default',
      ];

      const missingComponents = requiredComponents.filter(component => !workerContent.includes(component));

      const result = {
        name: 'Cloudflare Security Worker',
        type: 'infrastructure',
        passed: workerExists && missingComponents.length === 0,
        workerExists,
        missingComponents,
        details: workerExists
          ? `Worker found with ${requiredComponents.length - missingComponents.length}/${requiredComponents.length} required components`
          : 'Cloudflare security worker file not found',
      };

      this.results.push(result);

      if (!result.passed) {
        this.failures.push({
          name: 'Cloudflare Security Worker',
          reason: workerExists
            ? `Missing worker components: ${missingComponents.join(', ')}`
            : 'Cloudflare security worker file not found',
        });
      }

      console.log(result.passed ? '✅ Cloudflare security worker properly implemented' : '❌ Issues with Cloudflare worker');
      return result;
    } catch (error) {
      console.error('❌ Failed to verify Cloudflare worker:', error.message);
      return null;
    }
  }

  /**
   * Verify dependency vulnerabilities
   */
  async verifyDependencies() {
    console.log('📦 Verifying dependency vulnerabilities...');

    try {
      // Run npm audit
      const auditOutput = execSync('npm audit --json', { cwd: projectRoot, encoding: 'utf8' });
      const auditResult = JSON.parse(auditOutput);

      const vulnerabilities = auditResult.metadata?.vulnerabilities || {};
      const criticalVulns = vulnerabilities.critical || 0;
      const highVulns = vulnerabilities.high || 0;

      const result = {
        name: 'Dependency Vulnerabilities',
        type: 'dependencies',
        passed: criticalVulns === 0 && highVulns === 0,
        vulnerabilities,
        details: `Critical: ${criticalVulns}, High: ${highVulns}, Medium: ${vulnerabilities.medium || 0}, Low: ${vulnerabilities.low || 0}`,
      };

      this.results.push(result);

      if (!result.passed) {
        this.failures.push({
          name: 'Dependency Vulnerabilities',
          reason: `Critical or high severity vulnerabilities found: Critical=${criticalVulns}, High=${highVulns}`,
        });
      }

      console.log(result.passed ? '✅ No critical/high dependency vulnerabilities' : '⚠️  Critical/high vulnerabilities found');
      return result;
    } catch (error) {
      console.error('❌ Failed to verify dependencies:', error.message);
      return null;
    }
  }

  /**
   * Verify documentation exists
   */
  async verifyDocumentation() {
    console.log('📚 Verifying security documentation...');

    try {
      const docsPath = path.join(projectRoot, 'docs', 'security-compliance.md');
      const docsExist = fs.existsSync(docsPath);

      let docsContent = '';
      if (docsExist) {
        docsContent = fs.readFileSync(docsPath, 'utf8');
      }

      // Check for essential documentation sections
      const requiredSections = [
        'COPPA',
        'FERPA',
        'GDPR',
        'Security Architecture',
        'Incident Response',
        'Privacy Protections',
      ];

      const missingSections = requiredSections.filter(section => !docsContent.includes(section));

      const result = {
        name: 'Security Documentation',
        type: 'documentation',
        passed: docsExist && missingSections.length === 0,
        docsExist,
        missingSections,
        details: docsExist
          ? `Documentation found with ${requiredSections.length - missingSections.length}/${requiredSections.length} required sections`
          : 'Security documentation file not found',
      };

      this.results.push(result);

      if (!result.passed) {
        this.failures.push({
          name: 'Security Documentation',
          reason: docsExist
            ? `Missing documentation sections: ${missingSections.join(', ')}`
            : 'Security compliance documentation not found',
        });
      }

      console.log(result.passed ? '✅ Security documentation complete' : '❌ Issues with security documentation');
      return result;
    } catch (error) {
      console.error('❌ Failed to verify documentation:', error.message);
      return null;
    }
  }

  /**
   * Run all security verifications
   */
  async runAllVerifications() {
    console.log('🔐 Starting security verification suite...');
    console.log('='.repeat(60));

    await this.verifySecurityHeaders();
    console.log('-'.repeat(30));

    await this.verifyCspConfiguration();
    console.log('-'.repeat(30));

    await this.verifyComplianceConfiguration();
    console.log('-'.repeat(30));

    await this.verifySecurityMiddleware();
    console.log('-'.repeat(30));

    await this.verifyCloudflareWorker();
    console.log('-'.repeat(30));

    await this.verifyDependencies();
    console.log('-'.repeat(30));

    await this.verifyDocumentation();
    console.log('-'.repeat(30));

    await this.generateVerificationReport();
  }

  /**
   * Generate verification report
   */
  async generateVerificationReport() {
    const timestamp = new Date().toISOString();
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.failures.length;

    const report = {
      timestamp,
      totalTests,
      passedTests,
      failedTests,
      results: this.results,
      failures: this.failures,
      securityScore: Math.round((passedTests / totalTests) * 100),
    };

    // Save report to file
    const reportsDir = path.join(projectRoot, 'security-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFile = path.join(reportsDir, `${timestamp.replace(/[:.]/g, '-')}-verification.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Print summary
    console.log('\n📊 Security Verification Summary:');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Security Score: ${report.securityScore}%`);

    if (failedTests > 0) {
      console.log('\n❌ Verification Failures:');
      this.failures.forEach(failure => {
        console.log(`  - ${failure.name}: ${failure.reason}`);
      });
      console.log('\n🚨 Security verification failed! Please address the issues above.');
      process.exit(1);
    } else {
      console.log('\n✅ All security verifications passed!');
      console.log('🔒 Security implementation meets requirements.');
      process.exit(0);
    }
  }
}

// Main execution
async function main() {
  const verifier = new SecurityVerifier();

  try {
    await verifier.runAllVerifications();
  } catch (error) {
    console.error('❌ Security verification suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default SecurityVerifier;
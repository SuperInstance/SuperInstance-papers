#!/usr/bin/env node

/**
 * Performance test runner for SuperInstance website
 * Runs Lighthouse audits and Web Vitals measurements
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performanceScenarios, performanceThresholds } from './web-vitals.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const reportsDir = path.join(projectRoot, 'performance-reports');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

class PerformanceTestRunner {
  constructor() {
    this.results = [];
    this.failures = [];
  }

  async runLighthouseAudit(url, name) {
    console.log(`🚀 Running Lighthouse audit for: ${name} (${url})`);

    const outputFile = path.join(reportsDir, `${timestamp}-${name.replace(/\s+/g, '-').toLowerCase()}.json`);

    try {
      // Run Lighthouse CLI
      const command = `npx lighthouse ${url} \
        --output=json \
        --output-path=${outputFile} \
        --chrome-flags="--headless --no-sandbox" \
        --only-categories=performance,accessibility,best-practices,seo \
        --throttling.method=devtools \
        --throttling.rttMs=150 \
        --throttling.throughputKbps=1638.4 \
        --throttling.cpuSlowdownMultiplier=4 \
        --throttling.requestLatencyMs=0 \
        --throttling.downloadThroughputKbps=0 \
        --throttling.uploadThroughputKbps=0`;

      execSync(command, { stdio: 'inherit', cwd: projectRoot });

      // Parse results
      const report = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      const scores = {
        performance: report.categories.performance.score * 100,
        accessibility: report.categories.accessibility.score * 100,
        bestPractices: report.categories['best-practices'].score * 100,
        seo: report.categories.seo.score * 100,
      };

      // Extract Core Web Vitals
      const audits = report.audits;
      const coreWebVitals = {
        lcp: audits['largest-contentful-paint'].numericValue,
        fid: audits['max-potential-fid'].numericValue,
        cls: audits['cumulative-layout-shift'].numericValue,
        fcp: audits['first-contentful-paint'].numericValue,
        tti: audits['interactive'].numericValue,
        tbt: audits['total-blocking-time'].numericValue,
        speedIndex: audits['speed-index'].numericValue,
      };

      // Check thresholds
      const thresholdChecks = this.checkThresholds(coreWebVitals, scores);

      const result = {
        name,
        url,
        timestamp,
        scores,
        coreWebVitals,
        thresholdChecks,
        passed: thresholdChecks.every(check => check.passed),
      };

      this.results.push(result);
      console.log(`✅ ${name} audit completed:`);
      console.log(`   Performance: ${scores.performance.toFixed(1)}%`);
      console.log(`   LCP: ${coreWebVitals.lcp.toFixed(0)}ms`);
      console.log(`   FID: ${coreWebVitals.fid.toFixed(0)}ms`);
      console.log(`   CLS: ${coreWebVitals.cls.toFixed(3)}`);

      if (!result.passed) {
        this.failures.push({ name, failedChecks: thresholdChecks.filter(c => !c.passed) });
      }

      return result;
    } catch (error) {
      console.error(`❌ Lighthouse audit failed for ${name}:`, error.message);
      this.failures.push({ name, error: error.message });
      return null;
    }
  }

  checkThresholds(coreWebVitals, scores) {
    const checks = [];

    // Core Web Vitals checks
    checks.push({
      metric: 'LCP',
      value: coreWebVitals.lcp,
      threshold: performanceThresholds.coreWebVitals.lcp,
      passed: coreWebVitals.lcp <= performanceThresholds.coreWebVitals.lcp,
    });

    checks.push({
      metric: 'FID',
      value: coreWebVitals.fid,
      threshold: performanceThresholds.coreWebVitals.fid,
      passed: coreWebVitals.fid <= performanceThresholds.coreWebVitals.fid,
    });

    checks.push({
      metric: 'CLS',
      value: coreWebVitals.cls,
      threshold: performanceThresholds.coreWebVitals.cls,
      passed: coreWebVitals.cls <= performanceThresholds.coreWebVitals.cls,
    });

    // Performance score check
    checks.push({
      metric: 'Performance Score',
      value: scores.performance,
      threshold: 90, // Minimum 90% score
      passed: scores.performance >= 90,
    });

    // Accessibility score check
    checks.push({
      metric: 'Accessibility Score',
      value: scores.accessibility,
      threshold: 90, // Minimum 90% score
      passed: scores.accessibility >= 90,
    });

    return checks;
  }

  async runAllAudits(baseUrl = 'http://localhost:4321') {
    console.log('📊 Starting performance test suite...');
    console.log(`Base URL: ${baseUrl}`);
    console.log('='.repeat(50));

    // Run audits for each endpoint
    const endpoints = [
      { name: 'Homepage', path: '/' },
      { name: 'Features Page', path: '/features' },
      { name: 'Documentation', path: '/docs' },
      { name: 'Demos', path: '/demos' },
      { name: 'Blog', path: '/blog' },
    ];

    for (const endpoint of endpoints) {
      const url = `${baseUrl}${endpoint.path}`;
      await this.runLighthouseAudit(url, endpoint.name);
      console.log('-'.repeat(50));
    }

    // Generate summary report
    await this.generateSummaryReport();
  }

  async generateSummaryReport() {
    const summary = {
      timestamp,
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.passed).length,
      failedTests: this.failures.length,
      results: this.results,
      failures: this.failures,
    };

    const summaryFile = path.join(reportsDir, `${timestamp}-summary.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    // Generate HTML report
    await this.generateHtmlReport(summary);

    console.log('\n📈 Performance Test Summary:');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests}`);
    console.log(`Failed: ${summary.failedTests}`);

    if (summary.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      summary.failures.forEach(failure => {
        console.log(`  - ${failure.name}`);
        if (failure.failedChecks) {
          failure.failedChecks.forEach(check => {
            console.log(`    ${check.metric}: ${check.value} (threshold: ${check.threshold})`);
          });
        }
        if (failure.error) {
          console.log(`    Error: ${failure.error}`);
        }
      });
      process.exit(1);
    } else {
      console.log('\n✅ All performance tests passed!');
      process.exit(0);
    }
  }

  async generateHtmlReport(summary) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Report - ${timestamp}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .summary-card h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; text-transform: uppercase; }
        .summary-card .value { font-size: 36px; font-weight: bold; }
        .summary-card.passed .value { color: #10b981; }
        .summary-card.failed .value { color: #ef4444; }
        .results-table { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 15px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
        td { padding: 15px; border-bottom: 1px solid #e2e8f0; }
        tr:hover { background: #f8fafc; }
        .metric { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .metric.passed { background: #d1fae5; color: #065f46; }
        .metric.failed { background: #fee2e2; color: #991b1b; }
        .score { font-weight: bold; }
        .score.good { color: #10b981; }
        .score.warning { color: #f59e0b; }
        .score.poor { color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Performance Test Report</h1>
            <p>Generated: ${new Date(timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${summary.totalTests}</div>
            </div>
            <div class="summary-card passed">
                <h3>Passed</h3>
                <div class="value">${summary.passedTests}</div>
            </div>
            <div class="summary-card ${summary.failedTests > 0 ? 'failed' : 'passed'}">
                <h3>Failed</h3>
                <div class="value">${summary.failedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="value">${((summary.passedTests / summary.totalTests) * 100).toFixed(1)}%</div>
            </div>
        </div>

        <div class="results-table">
            <table>
                <thead>
                    <tr>
                        <th>Page</th>
                        <th>Performance</th>
                        <th>Accessibility</th>
                        <th>LCP</th>
                        <th>FID</th>
                        <th>CLS</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.results.map(result => `
                    <tr>
                        <td><strong>${result.name}</strong><br><small>${result.url}</small></td>
                        <td><span class="score ${this.getScoreClass(result.scores.performance)}">${result.scores.performance.toFixed(1)}%</span></td>
                        <td><span class="score ${this.getScoreClass(result.scores.accessibility)}">${result.scores.accessibility.toFixed(1)}%</span></td>
                        <td>${result.coreWebVitals.lcp.toFixed(0)}ms</td>
                        <td>${result.coreWebVitals.fid.toFixed(0)}ms</td>
                        <td>${result.coreWebVitals.cls.toFixed(3)}</td>
                        <td><span class="metric ${result.passed ? 'passed' : 'failed'}">${result.passed ? 'PASSED' : 'FAILED'}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        function getScoreClass(score) {
            if (score >= 90) return 'good';
            if (score >= 70) return 'warning';
            return 'poor';
        }
    </script>
</body>
</html>
    `;

    const htmlFile = path.join(reportsDir, `${timestamp}-report.html`);
    fs.writeFileSync(htmlFile, html);
    console.log(`📄 HTML report generated: ${htmlFile}`);
  }

  getScoreClass(score) {
    if (score >= 90) return 'good';
    if (score >= 70) return 'warning';
    return 'poor';
  }
}

// Main execution
async function main() {
  const runner = new PerformanceTestRunner();

  // Get base URL from command line or use default
  const baseUrl = process.argv[2] || 'http://localhost:4321';

  try {
    await runner.runAllAudits(baseUrl);
  } catch (error) {
    console.error('❌ Performance test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default PerformanceTestRunner;
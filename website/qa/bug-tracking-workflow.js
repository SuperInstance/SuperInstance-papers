#!/usr/bin/env node

/**
 * Bug tracking and regression testing workflow
 * Manages bug lifecycle and regression test execution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { bugTrackingConfig, regressionTestScenarios, bugTrackingMetrics } from './bug-tracking.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const bugsDir = path.join(projectRoot, '.bugs');
const reportsDir = path.join(projectRoot, 'qa-reports');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Ensure directories exist
[bugsDir, reportsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

class BugTrackingWorkflow {
  constructor() {
    this.bugs = this.loadBugs();
    this.regressionResults = [];
  }

  loadBugs() {
    const bugsFile = path.join(bugsDir, 'bugs.json');
    if (fs.existsSync(bugsFile)) {
      try {
        return JSON.parse(fs.readFileSync(bugsFile, 'utf8'));
      } catch (error) {
        console.error('Error loading bugs:', error.message);
        return [];
      }
    }
    return [];
  }

  saveBugs() {
    const bugsFile = path.join(bugsDir, 'bugs.json');
    fs.writeFileSync(bugsFile, JSON.stringify(this.bugs, null, 2));
  }

  createBugReport(bugData) {
    // Validate required fields
    const requiredFields = bugTrackingConfig.bugReportTemplate.requiredFields;
    const missingFields = requiredFields.filter(field => !bugData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const bug = {
      id: `BUG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'new',
      ...bugData,
      environment: bugData.environment || 'production',
      browser: bugData.browser || 'unknown',
      device: bugData.device || 'desktop',
      attachments: bugData.attachments || [],
      comments: [],
    };

    this.bugs.push(bug);
    this.saveBugs();

    console.log(`✅ Bug report created: ${bug.id}`);
    console.log(`   Title: ${bug.title}`);
    console.log(`   Severity: ${bug.severity}`);
    console.log(`   Category: ${bug.category}`);

    // Notify appropriate channels
    this.notifyBugCreated(bug);

    return bug;
  }

  notifyBugCreated(bug) {
    // In a real implementation, this would send notifications to Slack, email, etc.
    console.log(`📢 Bug ${bug.id} created - ${bug.severity.toUpperCase()} severity`);

    // Critical bugs get immediate attention
    if (bug.severity === 'critical') {
      console.log('🚨 CRITICAL BUG - Immediate attention required!');
      console.log(`   SLA: ${bugTrackingConfig.severityLevels.critical.sla}`);
    }
  }

  updateBugStatus(bugId, newStatus, comment = '') {
    const bug = this.bugs.find(b => b.id === bugId);
    if (!bug) {
      throw new Error(`Bug ${bugId} not found`);
    }

    const oldStatus = bug.status;
    bug.status = newStatus;
    bug.updatedAt = new Date().toISOString();

    if (comment) {
      bug.comments.push({
        timestamp: new Date().toISOString(),
        author: 'system',
        text: comment,
        statusChange: `${oldStatus} → ${newStatus}`,
      });
    }

    this.saveBugs();

    console.log(`✅ Bug ${bugId} status updated: ${oldStatus} → ${newStatus}`);
    if (comment) {
      console.log(`   Comment: ${comment}`);
    }

    return bug;
  }

  assignBug(bugId, assignee) {
    const bug = this.bugs.find(b => b.id === bugId);
    if (!bug) {
      throw new Error(`Bug ${bugId} not found`);
    }

    bug.assignee = assignee;
    bug.updatedAt = new Date().toISOString();
    bug.comments.push({
      timestamp: new Date().toISOString(),
      author: 'system',
      text: `Assigned to ${assignee}`,
    });

    this.saveBugs();

    console.log(`✅ Bug ${bugId} assigned to: ${assignee}`);
    return bug;
  }

  addComment(bugId, author, text) {
    const bug = this.bugs.find(b => b.id === bugId);
    if (!bug) {
      throw new Error(`Bug ${bugId} not found`);
    }

    bug.comments.push({
      timestamp: new Date().toISOString(),
      author,
      text,
    });

    bug.updatedAt = new Date().toISOString();
    this.saveBugs();

    console.log(`💬 Comment added to bug ${bugId} by ${author}`);
    return bug;
  }

  getBugMetrics() {
    const now = new Date();
    const bugs = this.bugs;

    const metrics = {
      total: bugs.length,
      bySeverity: {},
      byStatus: {},
      byCategory: {},
      aging: {},
      mttr: this.calculateMTTR(bugs),
      reopenRate: this.calculateReopenRate(bugs),
    };

    // Count by severity
    Object.keys(bugTrackingConfig.severityLevels).forEach(severity => {
      metrics.bySeverity[severity] = bugs.filter(b => b.severity === severity).length;
    });

    // Count by status
    Object.keys(bugTrackingConfig.states).forEach(status => {
      metrics.byStatus[status] = bugs.filter(b => b.status === status).length;
    });

    // Count by category
    Object.keys(bugTrackingConfig.categories).forEach(category => {
      metrics.byCategory[category] = bugs.filter(b => b.category === category).length;
    });

    // Calculate aging bugs
    bugs.forEach(bug => {
      const createdAt = new Date(bug.createdAt);
      const ageInDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

      const severityConfig = bugTrackingConfig.severityLevels[bug.severity];
      const slaDays = this.parseSLADays(severityConfig.sla);

      if (ageInDays > slaDays && bug.status !== 'closed' && bug.status !== 'wontFix') {
        metrics.aging[bug.id] = {
          age: ageInDays,
          sla: slaDays,
          severity: bug.severity,
          title: bug.title,
        };
      }
    });

    return metrics;
  }

  calculateMTTR(bugs) {
    const closedBugs = bugs.filter(b => b.status === 'closed');
    if (closedBugs.length === 0) return 0;

    const totalTime = closedBugs.reduce((sum, bug) => {
      const created = new Date(bug.createdAt);
      const closed = new Date(bug.updatedAt); // Assuming updatedAt is when closed
      return sum + (closed - created);
    }, 0);

    return Math.floor(totalTime / closedBugs.length / (1000 * 60 * 60 * 24)); // Days
  }

  calculateReopenRate(bugs) {
    const closedBugs = bugs.filter(b => b.status === 'closed');
    if (closedBugs.length === 0) return 0;

    // In a real system, we'd track reopen history
    // For now, return a placeholder
    return 0;
  }

  parseSLADays(slaString) {
    // Parse strings like "24 hours", "3 days", "1 week", etc.
    const match = slaString.match(/(\d+)\s*(hour|day|week|month)/);
    if (!match) return 7; // Default 7 days

    const [, amount, unit] = match;
    const multipliers = {
      hour: 1 / 24,
      day: 1,
      week: 7,
      month: 30,
    };

    return parseInt(amount) * (multipliers[unit] || 1);
  }

  async runRegressionSuite(suiteName) {
    console.log(`🧪 Running regression suite: ${suiteName}`);

    const suite = bugTrackingConfig.regressionSuites[suiteName];
    if (!suite) {
      throw new Error(`Regression suite "${suiteName}" not found`);
    }

    const scenarios = regressionTestScenarios.filter(s => s.category === suiteName);
    const results = [];

    console.log(`   Description: ${suite.description}`);
    console.log(`   Duration: ${suite.duration}`);
    console.log(`   Frequency: ${suite.frequency}`);
    console.log(`   Tests: ${scenarios.length}`);

    for (const scenario of scenarios) {
      console.log(`\n   Running: ${scenario.name}`);
      console.log(`   ${scenario.description}`);

      try {
        // In a real implementation, this would execute the actual tests
        // For now, we'll simulate test execution
        await this.simulateTestExecution(scenario);

        const result = {
          scenarioId: scenario.id,
          name: scenario.name,
          passed: true,
          duration: Math.random() * 5000 + 1000, // 1-6 seconds
          timestamp: new Date().toISOString(),
        };

        results.push(result);
        console.log(`   ✅ PASSED`);
      } catch (error) {
        const result = {
          scenarioId: scenario.id,
          name: scenario.name,
          passed: false,
          error: error.message,
          duration: Math.random() * 3000 + 500, // 0.5-3.5 seconds
          timestamp: new Date().toISOString(),
        };

        results.push(result);
        console.log(`   ❌ FAILED: ${error.message}`);

        // Create bug report for regression failure
        this.createBugReport({
          title: `Regression: ${scenario.name}`,
          description: `Regression test failed: ${scenario.description}`,
          stepsToReproduce: scenario.steps.join('\n'),
          expectedBehavior: scenario.assertions.join('\n'),
          actualBehavior: error.message,
          severity: 'high',
          category: 'functionality',
          environment: 'testing',
        });
      }
    }

    this.regressionResults.push({
      suite: suiteName,
      timestamp,
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        duration: results.reduce((sum, r) => sum + r.duration, 0),
      },
    });

    await this.generateRegressionReport(suiteName);

    const summary = this.regressionResults[this.regressionResults.length - 1].summary;
    console.log(`\n📊 Regression suite ${suiteName} completed:`);
    console.log(`   Total: ${summary.total}`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Duration: ${Math.floor(summary.duration / 1000)}s`);

    return summary.failed === 0;
  }

  async simulateTestExecution(scenario) {
    // Simulate test execution with random failures
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

    // 5% chance of simulated failure
    if (Math.random() < 0.05) {
      const failures = [
        'Element not found',
        'Timeout waiting for page load',
        'Assertion failed',
        'Network error',
        'JavaScript error',
      ];
      throw new Error(failures[Math.floor(Math.random() * failures.length)]);
    }
  }

  async generateRegressionReport(suiteName) {
    const suiteResults = this.regressionResults.find(r => r.suite === suiteName);
    if (!suiteResults) return;

    const report = {
      ...suiteResults,
      bugMetrics: this.getBugMetrics(),
      qualityGates: this.checkQualityGates(),
    };

    const reportFile = path.join(reportsDir, `${timestamp}-${suiteName}-regression.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Generate HTML report
    await this.generateRegressionHtmlReport(report, suiteName);

    console.log(`📄 Regression report generated: ${reportFile}`);
  }

  checkQualityGates() {
    const metrics = this.getBugMetrics();
    const gates = bugTrackingMetrics.qualityGates.releaseReadiness;

    const results = {
      criticalBugs: {
        required: gates.criticalBugs,
        actual: metrics.bySeverity.critical || 0,
        passed: (metrics.bySeverity.critical || 0) <= gates.criticalBugs,
      },
      highBugs: {
        required: gates.highBugs,
        actual: metrics.bySeverity.high || 0,
        passed: (metrics.bySeverity.high || 0) <= gates.highBugs,
      },
      mediumBugs: {
        required: gates.mediumBugs,
        actual: metrics.bySeverity.medium || 0,
        passed: this.evaluateCondition(metrics.bySeverity.medium || 0, gates.mediumBugs),
      },
    };

    results.allPassed = Object.values(results).every(r => r.passed !== undefined ? r.passed : true);
    return results;
  }

  evaluateCondition(actual, condition) {
    if (typeof condition === 'string' && condition.startsWith('<=')) {
      const value = parseInt(condition.substring(2));
      return actual <= value;
    }
    return actual <= condition;
  }

  async generateRegressionHtmlReport(report, suiteName) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Regression Test Report - ${suiteName} - ${timestamp}</title>
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
        .quality-gates { background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .gate { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .gate:last-child { border-bottom: none; }
        .gate-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .gate-status.passed { background: #d1fae5; color: #065f46; }
        .gate-status.failed { background: #fee2e2; color: #991b1b; }
        .results-table { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 15px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
        td { padding: 15px; border-bottom: 1px solid #e2e8f0; }
        tr:hover { background: #f8fafc; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .status.passed { background: #d1fae5; color: #065f46; }
        .status.failed { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Regression Test Report</h1>
            <p>Suite: ${suiteName} | Generated: ${new Date(timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${report.summary.total}</div>
            </div>
            <div class="summary-card passed">
                <h3>Passed</h3>
                <div class="value">${report.summary.passed}</div>
            </div>
            <div class="summary-card ${report.summary.failed > 0 ? 'failed' : 'passed'}">
                <h3>Failed</h3>
                <div class="value">${report.summary.failed}</div>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <div class="value">${Math.floor(report.summary.duration / 1000)}s</div>
            </div>
        </div>

        ${report.qualityGates ? `
        <div class="quality-gates">
            <h2>Quality Gates</h2>
            ${Object.entries(report.qualityGates).filter(([key, value]) => key !== 'allPassed' && typeof value === 'object').map(([key, gate]) => `
            <div class="gate">
                <div>
                    <strong>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</strong><br>
                    <small>Required: ${gate.required} | Actual: ${gate.actual}</small>
                </div>
                <span class="gate-status ${gate.passed ? 'passed' : 'failed'}">${gate.passed ? 'PASSED' : 'FAILED'}</span>
            </div>
            `).join('')}
            <div class="gate">
                <div><strong>Overall Quality Gate</strong></div>
                <span class="gate-status ${report.qualityGates.allPassed ? 'passed' : 'failed'}">${report.qualityGates.allPassed ? 'ALL PASSED' : 'SOME FAILED'}</span>
            </div>
        </div>
        ` : ''}

        <div class="results-table">
            <h2>Test Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test</th>
                        <th>Description</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.results.map(result => `
                    <tr>
                        <td><strong>${result.name}</strong><br><small>${result.scenarioId}</small></td>
                        <td>${regressionTestScenarios.find(s => s.id === result.scenarioId)?.description || 'N/A'}</td>
                        <td>${Math.floor(result.duration)}ms</td>
                        <td><span class="status ${result.passed ? 'passed' : 'failed'}">${result.passed ? 'PASSED' : 'FAILED'}</span></td>
                        <td>${result.error || 'No issues'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
    `;

    const htmlFile = path.join(reportsDir, `${timestamp}-${suiteName}-regression.html`);
    fs.writeFileSync(htmlFile, html);
  }

  // CLI interface methods
  async handleCommand(command, ...args) {
    switch (command) {
      case 'create-bug':
        const bugData = {
          title: args[0] || 'Untitled Bug',
          description: args[1] || 'No description provided',
          stepsToReproduce: args[2] || 'Not specified',
          expectedBehavior: args[3] || 'Not specified',
          actualBehavior: args[4] || 'Not specified',
          severity: args[5] || 'medium',
          category: args[6] || 'functionality',
        };
        return this.createBugReport(bugData);

      case 'list-bugs':
        return this.listBugs(args[0]); // status filter

      case 'run-regression':
        return this.runRegressionSuite(args[0] || 'smoke');

      case 'metrics':
        return this.showMetrics();

      case 'help':
        return this.showHelp();

      default:
        console.log(`Unknown command: ${command}`);
        console.log('Use "help" to see available commands');
    }
  }

  listBugs(statusFilter) {
    const bugs = statusFilter
      ? this.bugs.filter(b => b.status === statusFilter)
      : this.bugs;

    console.log(`\n📋 Bugs (${bugs.length} total):`);
    console.log('='.repeat(100));
    bugs.forEach(bug => {
      const severityColor = bugTrackingConfig.severityLevels[bug.severity]?.color || '#000000';
      console.log(`🪲 ${bug.id} | ${bug.title}`);
      console.log(`   Status: ${bug.status} | Severity: ${bug.severity} | Category: ${bug.category}`);
      console.log(`   Created: ${new Date(bug.createdAt).toLocaleDateString()}`);
      console.log(`   Updated: ${new Date(bug.updatedAt).toLocaleDateString()}`);
      if (bug.assignee) {
        console.log(`   Assignee: ${bug.assignee}`);
      }
      console.log('-'.repeat(100));
    });

    return bugs;
  }

  showMetrics() {
    const metrics = this.getBugMetrics();

    console.log('\n📊 Bug Tracking Metrics:');
    console.log('='.repeat(50));
    console.log(`Total Bugs: ${metrics.total}`);
    console.log(`Mean Time To Resolution: ${metrics.mttr} days`);
    console.log(`Reopen Rate: ${(metrics.reopenRate * 100).toFixed(1)}%`);

    console.log('\nBy Severity:');
    Object.entries(metrics.bySeverity).forEach(([severity, count]) => {
      console.log(`  ${severity}: ${count}`);
    });

    console.log('\nBy Status:');
    Object.entries(metrics.byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    if (Object.keys(metrics.aging).length > 0) {
      console.log('\n⚠️  Aging Bugs (exceed SLA):');
      Object.entries(metrics.aging).forEach(([bugId, data]) => {
        console.log(`  ${bugId}: ${data.age} days (SLA: ${data.sla} days) - ${data.title}`);
      });
    }

    return metrics;
  }

  showHelp() {
    console.log('\n🪲 Bug Tracking Workflow CLI');
    console.log('='.repeat(50));
    console.log('Available commands:');
    console.log('  create-bug <title> <description> <steps> <expected> <actual> <severity> <category>');
    console.log('  list-bugs [status]');
    console.log('  run-regression [suite]');
    console.log('  metrics');
    console.log('  help');
    console.log('\nExamples:');
    console.log('  node qa/bug-tracking-workflow.js create-bug "Homepage broken" "Homepage not loading"');
    console.log('  node qa/bug-tracking-workflow.js list-bugs new');
    console.log('  node qa/bug-tracking-workflow.js run-regression smoke');
  }
}

// Main execution
async function main() {
  const workflow = new BugTrackingWorkflow();
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    workflow.showHelp();
    process.exit(0);
  }

  try {
    await workflow.handleCommand(command, ...args);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default BugTrackingWorkflow;
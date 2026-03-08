/**
 * POLLN Benchmark Reporter
 *
 * Generate reports in multiple formats (JSON, Markdown, HTML)
 * with charts and visualizations.
 */

import type {
  BenchmarkResult,
  BenchmarkMetrics,
  BaselineData,
  ComparisonResult,
  RegressionReport
} from './types.js';
import { calculateStats } from './benchmark-profiler.js';

/**
 * BenchmarkReporter - Generate benchmark reports
 */
export class BenchmarkReporter {
  /**
   * Generate report in specified format
   */
  static generateReport(
    results: BenchmarkResult[],
    format: 'json' | 'markdown' | 'html' = 'json',
    baseline?: BaselineData
  ): string {
    switch (format) {
      case 'json':
        return this.generateJsonReport(results, baseline);
      case 'markdown':
        return this.generateMarkdownReport(results, baseline);
      case 'html':
        return this.generateHtmlReport(results, baseline);
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  /**
   * Generate JSON report
   */
  private static generateJsonReport(
    results: BenchmarkResult[],
    baseline?: BaselineData
  ): string {
    const report = {
      timestamp: Date.now(),
      summary: this.generateSummary(results),
      results: results.map(r => ({
        ...r,
        comparison: baseline ? this.compareWithBaseline(r, baseline) : undefined,
      })),
      systemInfo: this.getSystemInfo(),
    };

    return JSON.stringify(report, (_, v) => {
      if (v instanceof Map) return Object.fromEntries(v);
      return v;
    }, 2);
  }

  /**
   * Generate Markdown report
   */
  private static generateMarkdownReport(
    results: BenchmarkResult[],
    baseline?: BaselineData
  ): string {
    const summary = this.generateSummary(results);
    let report = '# POLLN Benchmark Report\n\n';

    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Total Benchmarks:** ${summary.total}\n`;
    report += `**Passed:** ${summary.passed}\n`;
    report += `**Failed:** ${summary.failed}\n\n`;

    // Summary table
    report += '## Summary\n\n';
    report += '| Suite | Benchmark | Mean (ms) | P95 (ms) | P99 (ms) | Status |\n';
    report += '|-------|-----------|-----------|----------|----------|--------|\n';

    for (const result of results) {
      const comparison = baseline ? this.compareWithBaseline(result, baseline) : null;
      const delta = comparison ? this.formatDelta(comparison.percentChanges.get('mean') || 0) : '';

      report += `| ${result.suite} | ${result.name} | ` +
        `${result.metrics.mean.toFixed(2)} | ` +
        `${result.metrics.p95.toFixed(2)} | ` +
        `${result.metrics.p99.toFixed(2)} | ` +
        `${result.passed ? '✅' : '❌'} ${delta} |\n`;
    }

    report += '\n';

    // Detailed results by suite
    const bySuite = this.groupBySuite(results);
    for (const [suite, suiteResults] of bySuite) {
      report += `## ${suite}\n\n`;

      for (const result of suiteResults) {
        report += `### ${result.name}\n\n`;

        if (result.error) {
          report += `**Error:** ${result.error}\n\n`;
          continue;
        }

        report += '**Timing Metrics:**\n';
        report += `- Mean: ${result.metrics.mean.toFixed(3)}ms\n`;
        report += `- Median: ${result.metrics.median.toFixed(3)}ms\n`;
        report += `- Min: ${result.metrics.min.toFixed(3)}ms\n`;
        report += `- Max: ${result.metrics.max.toFixed(3)}ms\n`;
        report += `- Std Dev: ${result.metrics.stdDev.toFixed(3)}ms\n`;
        report += `- P50: ${result.metrics.p50.toFixed(3)}ms\n`;
        report += `- P75: ${result.metrics.p75.toFixed(3)}ms\n`;
        report += `- P90: ${result.metrics.p90.toFixed(3)}ms\n`;
        report += `- P95: ${result.metrics.p95.toFixed(3)}ms\n`;
        report += `- P99: ${result.metrics.p99.toFixed(3)}ms\n\n`;

        report += '**Memory Metrics:**\n';
        report += `- Before: ${(result.metrics.memoryBefore / 1024 / 1024).toFixed(2)} MB\n`;
        report += `- After: ${(result.metrics.memoryAfter / 1024 / 1024).toFixed(2)} MB\n`;
        report += `- Delta: ${(result.metrics.memoryDelta / 1024 / 1024).toFixed(2)} MB\n`;
        report += `- Peak: ${(result.metrics.memoryPeak / 1024 / 1024).toFixed(2)} MB\n\n`;

        report += '**Throughput:**\n';
        report += `- Ops/sec: ${result.metrics.opsPerSecond.toFixed(2)}\n`;
        report += `- Total ops: ${result.metrics.totalOps}\n`;
        report += `- Total time: ${result.metrics.totalTime.toFixed(2)}s\n\n`;

        if (result.metrics.customMetrics && result.metrics.customMetrics.size > 0) {
          report += '**Custom Metrics:**\n';
          for (const [name, value] of result.metrics.customMetrics) {
            report += `- ${name}: ${value}\n`;
          }
          report += '\n';
        }

        // Comparison with baseline
        if (baseline) {
          const comparison = this.compareWithBaseline(result, baseline);
          report += '**Baseline Comparison:**\n';
          report += `- Status: ${comparison.status}\n`;
          for (const [metric, delta] of comparison.percentChanges) {
            report += `- ${metric}: ${this.formatDelta(delta)}\n`;
          }
          report += '\n';
        }

        report += '---\n\n';
      }
    }

    return report;
  }

  /**
   * Generate HTML report with charts
   */
  private static generateHtmlReport(
    results: BenchmarkResult[],
    baseline?: BaselineData
  ): string {
    const summary = this.generateSummary(results);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>POLLN Benchmark Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 { margin: 0 0 10px 0; }
    .header .meta { opacity: 0.9; }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .card .value {
      font-size: 32px;
      font-weight: bold;
      margin-top: 5px;
    }
    .card.passed .value { color: #10b981; }
    .card.failed .value { color: #ef4444; }
    .benchmark-section {
      background: white;
      border-radius: 10px;
      padding: 25px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .benchmark-section h2 {
      margin-top: 0;
      color: #667eea;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
    }
    .benchmark-item {
      margin: 20px 0;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #e5e7eb;
    }
    .benchmark-item.passed { border-left-color: #10b981; }
    .benchmark-item.failed { border-left-color: #ef4444; }
    .benchmark-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .benchmark-name {
      font-weight: 600;
      font-size: 16px;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge.passed { background: #d1fae5; color: #065f46; }
    .status-badge.failed { background: #fee2e2; color: #991b1b; }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .metric {
      background: white;
      padding: 10px;
      border-radius: 6px;
    }
    .metric-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
    }
    .metric-value {
      font-size: 18px;
      font-weight: 600;
      color: #667eea;
    }
    .chart-container {
      position: relative;
      height: 300px;
      margin: 20px 0;
    }
    .comparison {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 14px;
    }
    .comparison.improvement { color: #10b981; }
    .comparison.regression { color: #ef4444; }
    .comparison.neutral { color: #6b7280; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
    }
    .error-message {
      background: #fee2e2;
      color: #991b1b;
      padding: 10px;
      border-radius: 6px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>POLLN Benchmark Report</h1>
    <div class="meta">
      <strong>Generated:</strong> ${new Date().toISOString()}<br>
      <strong>Total Benchmarks:</strong> ${summary.total}<br>
      <strong>Passed:</strong> ${summary.passed} | <strong>Failed:</strong> ${summary.failed}
    </div>
  </div>

  <div class="summary-cards">
    <div class="card passed">
      <div class="label">Passed</div>
      <div class="value">${summary.passed}</div>
    </div>
    <div class="card failed">
      <div class="label">Failed</div>
      <div class="value">${summary.failed}</div>
    </div>
    <div class="card">
      <div class="label">Total Time</div>
      <div class="value">${(summary.totalTime / 1000).toFixed(1)}s</div>
    </div>
    <div class="card">
      <div class="label">Avg Time</div>
      <div class="value">${(summary.totalTime / summary.total).toFixed(1)}ms</div>
    </div>
  </div>

  ${this.generateHtmlCharts(results)}

  ${this.generateHtmlBenchmarkSections(results, baseline)}
</body>
</html>`;
  }

  /**
   * Generate HTML charts section
   */
  private static generateHtmlCharts(results: BenchmarkResult[]): string {
    // Prepare data for charts
    const bySuite = this.groupBySuite(results);

    let chartsHtml = '<div class="benchmark-section"><h2>Performance Charts</h2>';

    // Main performance comparison chart
    const labels = results.map(r => r.name);
    const meanData = results.map(r => r.metrics.mean);
    const p95Data = results.map(r => r.metrics.p95);
    const p99Data = results.map(r => r.metrics.p99);

    chartsHtml += `
  <h3>Timing Overview (All Benchmarks)</h3>
  <div class="chart-container">
    <canvas id="timingChart"></canvas>
  </div>
</div>

<script>
// Timing chart
new Chart(document.getElementById('timingChart'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(labels)},
    datasets: [
      {
        label: 'Mean',
        data: ${JSON.stringify(meanData)},
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
      },
      {
        label: 'P95',
        data: ${JSON.stringify(p95Data)},
        backgroundColor: 'rgba(118, 75, 162, 0.8)',
      },
      {
        label: 'P99',
        data: ${JSON.stringify(p99Data)},
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Time (ms)'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top'
      }
    }
  }
});
</script>`;

    return chartsHtml;
  }

  /**
   * Generate HTML benchmark sections
   */
  private static generateHtmlBenchmarkSections(
    results: BenchmarkResult[],
    baseline?: BaselineData
  ): string {
    const bySuite = this.groupBySuite(results);
    let html = '';

    for (const [suite, suiteResults] of bySuite) {
      html += `<div class="benchmark-section"><h2>${suite}</h2>`;

      for (const result of suiteResults) {
        const statusClass = result.passed ? 'passed' : 'failed';
        const comparison = baseline ? this.compareWithBaseline(result, baseline) : null;

        html += `
  <div class="benchmark-item ${statusClass}">
    <div class="benchmark-header">
      <div class="benchmark-name">${result.name}</div>
      <span class="status-badge ${statusClass}">
        ${result.passed ? 'PASSED' : 'FAILED'}
      </span>
    </div>`;

        if (result.error) {
          html += `<div class="error-message">${result.error}</div>`;
        } else {
          html += `
    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-label">Mean</div>
        <div class="metric-value">${result.metrics.mean.toFixed(2)}ms</div>
      </div>
      <div class="metric">
        <div class="metric-label">Median</div>
        <div class="metric-value">${result.metrics.median.toFixed(2)}ms</div>
      </div>
      <div class="metric">
        <div class="metric-label">P95</div>
        <div class="metric-value">${result.metrics.p95.toFixed(2)}ms</div>
      </div>
      <div class="metric">
        <div class="metric-label">P99</div>
        <div class="metric-value">${result.metrics.p99.toFixed(2)}ms</div>
      </div>
      <div class="metric">
        <div class="metric-label">Std Dev</div>
        <div class="metric-value">${result.metrics.stdDev.toFixed(2)}ms</div>
      </div>
      <div class="metric">
        <div class="metric-label">Ops/sec</div>
        <div class="metric-value">${result.metrics.opsPerSecond.toFixed(0)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Memory Delta</div>
        <div class="metric-value">${(result.metrics.memoryDelta / 1024).toFixed(0)}KB</div>
      </div>
    </div>`;

          if (comparison) {
            const meanDelta = comparison.percentChanges.get('mean') || 0;
            html += `
    <div style="margin-top: 15px;">
      <span class="comparison ${this.getDeltaClass(meanDelta)}">
        ${this.formatDeltaIcon(meanDelta)} vs baseline
      </span>
    </div>`;
          }
        }

        html += '</div>';
      }

      html += '</div>';
    }

    return html;
  }

  /**
   * Generate summary statistics
   */
  private static generateSummary(results: BenchmarkResult[]): {
    total: number;
    passed: number;
    failed: number;
    totalTime: number;
  } {
    return {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      totalTime: results.reduce((sum, r) => sum + r.metrics.totalTime * 1000, 0),
    };
  }

  /**
   * Group results by suite
   */
  private static groupBySuite(results: BenchmarkResult[]): Map<string, BenchmarkResult[]> {
    const grouped = new Map<string, BenchmarkResult[]>();
    for (const result of results) {
      if (!grouped.has(result.suite)) {
        grouped.set(result.suite, []);
      }
      grouped.get(result.suite)!.push(result);
    }
    return grouped;
  }

  /**
   * Compare result with baseline
   */
  private static compareWithBaseline(
    result: BenchmarkResult,
    baseline: BaselineData
  ): ComparisonResult {
    const baselineKey = `${result.suite}:${result.name}`;
    const baselineResult = baseline.results.get(baselineKey);

    if (!baselineResult) {
      return {
        benchmarkName: result.name,
        suite: result.suite,
        baseline: result.metrics,
        current: result.metrics,
        differences: new Map(),
        percentChanges: new Map(),
        status: 'stable',
      };
    }

    const differences = new Map<string, number>();
    const percentChanges = new Map<string, number>();

    const compareMetrics = [
      'mean', 'median', 'min', 'max', 'stdDev',
      'p50', 'p75', 'p90', 'p95', 'p99',
      'memoryDelta', 'opsPerSecond'
    ] as const;

    for (const metric of compareMetrics) {
      const current = result.metrics[metric];
      const baselineValue = baselineResult.metrics[metric];
      const diff = current - baselineValue;
      const pctChange = baselineValue !== 0 ? (diff / baselineValue) * 100 : 0;

      differences.set(metric, diff);
      percentChanges.set(metric, pctChange);
    }

    // Determine status
    const meanChange = percentChanges.get('mean') || 0;
    const status = Math.abs(meanChange) > 10
      ? (meanChange > 0 ? 'regressed' : 'improved')
      : 'stable';

    return {
      benchmarkName: result.name,
      suite: result.suite,
      baseline: baselineResult.metrics,
      current: result.metrics,
      differences,
      percentChanges,
      status,
    };
  }

  /**
   * Format delta as string
   */
  private static formatDelta(delta: number): string {
    const absDelta = Math.abs(delta);
    const sign = delta > 0 ? '+' : '';
    return `${sign}${absDelta.toFixed(1)}%`;
  }

  /**
   * Get delta class for styling
   */
  private static getDeltaClass(delta: number): string {
    if (Math.abs(delta) <= 5) return 'neutral';
    return delta < 0 ? 'improvement' : 'regression';
  }

  /**
   * Format delta with icon
   */
  private static formatDeltaIcon(delta: number): string {
    if (Math.abs(delta) <= 5) return '≈';
    return delta < 0 ? '↓' : '↑';
  }

  /**
   * Get system information
   */
  private static getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuCores: require('os').cpus().length,
      totalMemory: require('os').totalmem(),
    };
  }

  /**
   * Save report to file
   */
  static async saveReport(
    report: string,
    filepath: string
  ): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(filepath, report, 'utf-8');
  }
}

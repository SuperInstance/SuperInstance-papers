/**
 * POLLN Baseline Manager
 *
 * Manage baseline data for performance regression detection.
 */

import type { BaselineData, BenchmarkResult, RegressionReport, RegressionIssue } from './types.js';
import { BenchmarkReporter } from './benchmark-reporter.js';

/**
 * BaselineManager - Store and compare baseline performance data
 */
export class BaselineManager {
  private baselines: Map<string, BaselineData> = new Map();
  private currentBaseline?: BaselineData;

  /**
   * Load baseline from file
   */
  static async load(filepath: string): Promise<BaselineManager> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filepath, 'utf-8');
    const data = JSON.parse(content) as BaselineData;

    const manager = new BaselineManager();
    manager.currentBaseline = data;
    manager.baselines.set('current', data);

    return manager;
  }

  /**
   * Save baseline to file
   */
  async save(filepath: string, results: BenchmarkResult[]): Promise<void> {
    const baseline: BaselineData = {
      timestamp: Date.now(),
      commitHash: await this.getGitCommit(),
      branch: await this.getGitBranch(),
      results: new Map(results.map(r => [`${r.suite}:${r.name}`, r])),
      systemInfo: this.getSystemInfo(),
    };

    const fs = await import('fs/promises');
    await fs.writeFile(
      filepath,
      JSON.stringify(baseline, (_, v) => {
        if (v instanceof Map) return Object.fromEntries(v);
        return v;
      }, 2),
      'utf-8'
    );

    this.currentBaseline = baseline;
    this.baselines.set('current', baseline);
  }

  /**
   * Check for regressions
   */
  checkRegressions(
    results: BenchmarkResult[],
    thresholds: {
      critical: number; // > 20% regression
      major: number;   // > 10% regression
      minor: number;   // > 5% regression
    } = {
      critical: 20,
      major: 10,
      minor: 5,
    }
  ): RegressionReport {
    const regressions: RegressionIssue[] = [];
    const improvements: RegressionIssue[] = [];

    if (!this.currentBaseline) {
      throw new Error('No baseline loaded. Load a baseline first.');
    }

    for (const result of results) {
      const baselineKey = `${result.suite}:${result.name}`;
      const baselineResult = this.currentBaseline.results.get(baselineKey);

      if (!baselineResult) {
        continue; // No baseline to compare
      }

      // Compare key metrics
      const metrics = ['mean', 'p95', 'p99', 'memoryDelta'];

      for (const metric of metrics) {
        const baselineValue = baselineResult.metrics[metric as keyof BenchmarkMetrics] as number;
        const currentValue = result.metrics[metric as keyof BenchmarkMetrics] as number;

        if (baselineValue === 0) continue;

        const percentChange = ((currentValue - baselineValue) / baselineValue) * 100;

        // For time metrics, increase is regression
        // For memory, increase is regression
        const isRegression = percentChange > thresholds.minor;
        const isImprovement = percentChange < -thresholds.minor;

        if (isRegression || isImprovement) {
          const issue: RegressionIssue = {
            benchmarkName: result.name,
            suite: result.suite,
            metricName: metric,
            baselineValue,
            currentValue,
            percentChange: Math.abs(percentChange),
            threshold: thresholds.minor,
            severity: this.getSeverity(Math.abs(percentChange), thresholds),
          };

          if (isRegression) {
            regressions.push(issue);
          } else {
            improvements.push(issue);
          }
        }
      }
    }

    // Sort by severity and percent change
    regressions.sort((a, b) => {
      const severityOrder = { critical: 0, major: 1, minor: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.percentChange - a.percentChange;
    });

    return {
      timestamp: Date.now(),
      commitHash: this.currentBaseline.commitHash,
      branch: this.currentBaseline.branch,
      regressions,
      improvements,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        regressed: regressions.length,
        improved: improvements.length,
      },
    };
  }

  /**
   * Get severity level based on percent change
   */
  private getSeverity(
    percentChange: number,
    thresholds: { critical: number; major: number; minor: number }
  ): 'critical' | 'major' | 'minor' {
    if (percentChange >= thresholds.critical) return 'critical';
    if (percentChange >= thresholds.major) return 'major';
    return 'minor';
  }

  /**
   * Get current git commit hash
   */
  private async getGitCommit(): Promise<string | undefined> {
    try {
      const { execSync } = await import('child_process');
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Get current git branch
   */
  private async getGitBranch(): Promise<string | undefined> {
    try {
      const { execSync } = await import('child_process');
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Get system information
   */
  private getSystemInfo() {
    const os = require('os');
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuModel: os.cpus()[0]?.model || 'unknown',
      cpuCores: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
    };
  }

  /**
   * Get current baseline
   */
  getCurrentBaseline(): BaselineData | undefined {
    return this.currentBaseline;
  }

  /**
   * Check if baseline is loaded
   */
  hasBaseline(): boolean {
    return this.currentBaseline !== undefined;
  }
}

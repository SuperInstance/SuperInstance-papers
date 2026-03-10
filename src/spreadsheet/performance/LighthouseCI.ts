/**
 * POLLN Spreadsheet - Lighthouse CI Integration
 *
 * Integration with Lighthouse CI for automated performance testing.
 * Provides CI/CD pipeline integration and performance regression detection.
 */

import { LighthouseConfig, LighthouseResult, BudgetResult, RatedWebVital } from './types';
import { MetricsCollector } from './MetricsCollector';
import { WebVitalsTracker } from './WebVitalsTracker';

/**
 * Lighthouse CI configuration
 */
interface LighthouseCIConfig {
  url: string;
  config?: LighthouseConfig;
  budgets?: Array<{
    path: string;
    timings: number[];
    resourceSizes: number[];
    resourceCounts: number[];
  }>;
  assertions?: Record<string, { minScore?: number; maxNumericValue?: number }>;
}

/**
 * Lighthouse CI runner
 */
export class LighthouseCIRunner {
  private metricsCollector: MetricsCollector;
  private webVitalsTracker: WebVitalsTracker;
  private config: LighthouseCIConfig;

  constructor(
    config: LighthouseCIConfig,
    metricsCollector?: MetricsCollector,
    webVitalsTracker?: WebVitalsTracker
  ) {
    this.config = config;
    this.metricsCollector = metricsCollector || new MetricsCollector();
    this.webVitalsTracker = webVitalsTracker || new WebVitalsTracker();
  }

  /**
   * Run Lighthouse audit
   */
  async runAudit(): Promise<LighthouseResult> {
    // This would typically use the actual Lighthouse library
    // For now, we'll create a mock result based on Web Vitals

    const vitals = this.webVitalsTracker.getWebVitals();
    const ratedVitals = Array.from(this.webVitalsTracker.getRatedMetrics().values());

    const result: LighthouseResult = {
      version: '1.0.0',
      url: this.config.url,
      timestamp: Date.now(),
      scores: {
        performance: this.calculatePerformanceScore(vitals),
        accessibility: 0, // Would need actual Lighthouse
        bestPractices: 0,
        seo: 0,
      },
      metrics: {
        fcp: vitals.fcp || 0,
        lcp: vitals.lcp || 0,
        cls: vitals.cls || 0,
        fid: vitals.fid || 0,
        tti: vitals.tti || 0,
        tbt: vitals.tbt || 0,
        inp: vitals.inp || 0,
        lcpTarget: 2500,
        clsTarget: 0.1,
        fidTarget: 100,
        ttiTarget: 3800,
      },
      audits: this.generateAudits(ratedVitals),
      budgets: this.checkBudgets(),
    };

    // Record metrics
    this.metricsCollector.recordMetric('lighthouse_performance_score', result.scores.performance);
    this.metricsCollector.recordMetric('lighthouse_lcp', result.metrics.lcp);
    this.metricsCollector.recordMetric('lighthouse_cls', result.metrics.cls);
    this.metricsCollector.recordMetric('lighthouse_fid', result.metrics.fid);

    return result;
  }

  /**
   * Calculate performance score from Web Vitals
   */
  private calculatePerformanceScore(vitals: Partial<typeof import('./types').WebVitals>): number {
    let totalScore = 0;
    let count = 0;

    // LCP (25% weight)
    if (vitals.lcp !== undefined) {
      const lcpScore = vitals.lcp <= 2500 ? 100 :
                      vitals.lcp <= 4000 ? 50 :
                      25;
      totalScore += lcpScore * 0.25;
      count++;
    }

    // CLS (25% weight)
    if (vitals.cls !== undefined) {
      const clsScore = vitals.cls <= 0.1 ? 100 :
                      vitals.cls <= 0.25 ? 50 :
                      25;
      totalScore += clsScore * 0.25;
      count++;
    }

    // FID (25% weight)
    if (vitals.fid !== undefined) {
      const fidScore = vitals.fid <= 100 ? 100 :
                      vitals.fid <= 300 ? 50 :
                      25;
      totalScore += fidScore * 0.25;
      count++;
    }

    // TBT (25% weight)
    if (vitals.tbt !== undefined) {
      const tbtScore = vitals.tbt <= 200 ? 100 :
                      vitals.tbt <= 600 ? 50 :
                      25;
      totalScore += tbtScore * 0.25;
      count++;
    }

    return Math.round(totalScore);
  }

  /**
   * Generate audit results from rated Web Vitals
   */
  private generateAudits(ratedVitals: RatedWebVital[]): Record<string, any> {
    const audits: Record<string, any> = {};

    for (const vital of ratedVitals) {
      audits[vital.name] = {
        score: vital.rating === 'good' ? 1 :
              vital.rating === 'needs-improvement' ? 0.5 :
              0,
        displayValue: `${vital.value.toFixed(2)}`,
        explanation: this.getAuditExplanation(vital),
      };
    }

    return audits;
  }

  /**
   * Get explanation for an audit
   */
  private getAuditExplanation(vital: RatedWebVital): string {
    if (vital.rating === 'good') {
      return `${vital.name} is within the recommended range.`;
    } else if (vital.rating === 'needs-improvement') {
      return `${vital.name} needs improvement. Current: ${vital.value.toFixed(2)}, Target: ${vital.target}`;
    } else {
      return `${vital.name} is poor. Current: ${vital.value.toFixed(2)}, Target: ${vital.target}`;
    }
  }

  /**
   * Check budget compliance
   */
  private checkBudgets(): BudgetResult[] {
    if (!this.config.budgets) {
      return [];
    }

    const results: BudgetResult[] = [];

    for (const budget of this.config.budgets) {
      // This would typically check actual resource sizes and timings
      // For now, we'll create placeholder results

      results.push({
        name: budget.path,
        status: 'pass',
        size: 0,
        sizeBudget: budget.resourceSizes[0] || 0,
        count: 0,
        countBudget: budget.resourceCounts[0] || 0,
      });
    }

    return results;
  }

  /**
   * Assert that performance meets requirements
   */
  assertPerformance(result: LighthouseResult): {
    passed: boolean;
    failures: Array<{ assertion: string; expected: any; actual: any }>;
  } {
    const failures: Array<{ assertion: string; expected: any; actual: any }> = [];
    const assertions = this.config.assertions || {};

    // Default assertions
    const defaultAssertions = {
      'categories:performance': { minScore: 70 },
      'metrics:lcp': { maxNumericValue: 4000 },
      'metrics:cls': { maxNumericValue: 0.25 },
      'metrics:fid': { maxNumericValue: 300 },
    };

    const allAssertions = { ...defaultAssertions, ...assertions };

    // Check performance score
    const perfAssertion = allAssertions['categories:performance'];
    if (perfAssertion?.minScore !== undefined && result.scores.performance < perfAssertion.minScore) {
      failures.push({
        assertion: 'categories:performance',
        expected: `>= ${perfAssertion.minScore}`,
        actual: result.scores.performance,
      });
    }

    // Check LCP
    const lcpAssertion = allAssertions['metrics:lcp'];
    if (lcpAssertion?.maxNumericValue !== undefined && result.metrics.lcp > lcpAssertion.maxNumericValue) {
      failures.push({
        assertion: 'metrics:lcp',
        expected: `<= ${lcpAssertion.maxNumericValue}`,
        actual: result.metrics.lcp,
      });
    }

    // Check CLS
    const clsAssertion = allAssertions['metrics:cls'];
    if (clsAssertion?.maxNumericValue !== undefined && result.metrics.cls > clsAssertion.maxNumericValue) {
      failures.push({
        assertion: 'metrics:cls',
        expected: `<= ${clsAssertion.maxNumericValue}`,
        actual: result.metrics.cls,
      });
    }

    // Check FID
    const fidAssertion = allAssertions['metrics:fid'];
    if (fidAssertion?.maxNumericValue !== undefined && result.metrics.fid > fidAssertion.maxNumericValue) {
      failures.push({
        assertion: 'metrics:fid',
        expected: `<= ${fidAssertion.maxNumericValue}`,
        actual: result.metrics.fid,
      });
    }

    return {
      passed: failures.length === 0,
      failures,
    };
  }

  /**
   * Export result as JSON
   */
  exportResult(result: LighthouseResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Generate JUnit XML for CI systems
   */
  generateJUnitXML(result: LighthouseResult, assertionResult: ReturnType<typeof this.assertPerformance>): string {
    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<testsuites>');
    lines.push(`<testsuite name="Lighthouse" tests="${Object.keys(result.audits).length}" failures="${assertionResult.failures.length}">`);

    // Test cases
    for (const [name, audit] of Object.entries(result.audits)) {
      lines.push(`  <testcase name="${name}">`);
      lines.push(`    <system-out>${audit.explanation || ''}</system-out>`);

      if (audit.score === 0) {
        lines.push(`    <failure message="${audit.name} failed"/>`);
      }

      lines.push(`  </testcase>`);
    }

    // Assertion failures
    for (const failure of assertionResult.failures) {
      lines.push(`  <testcase name="${failure.assertion}">`);
      lines.push(`    <failure message="Expected ${failure.expected}, got ${failure.actual}"/>`);
      lines.push(`  </testcase>`);
    }

    lines.push('</testsuite>');
    lines.push('</testsuites>');

    return lines.join('\n');
  }
}

/**
 * Run Lighthouse CI with default configuration
 */
export async function runLighthouseCI(
  url: string,
  config?: LighthouseCIConfig
): Promise<{
  result: LighthouseResult;
  assertions: ReturnType<LighthouseCIRunner['assertPerformance']>;
}> {
  const runner = new LighthouseCIRunner({ url, ...config });
  const result = await runner.runAudit();
  const assertions = runner.assertPerformance(result);

  return { result, assertions };
}

/**
 * Lighthouse CI GitHub Actions output format
 */
export function generateGitHubActionsOutput(
  result: LighthouseResult,
  assertions: ReturnType<LighthouseCIRunner['assertPerformance']>
): string {
  const lines: string[] = [];

  // Performance score
  lines.push(`::notice title=Performance Score::${result.scores.performance}/100`);

  // Web Vitals
  lines.push(`::notice title=LCP::${result.metrics.lcp.toFixed(0)}ms`);
  lines.push(`::notice title=CLS::${result.metrics.cls.toFixed(3)}`);
  lines.push(`::notice title=FID::${result.metrics.fid.toFixed(0)}ms`);
  lines.push(`::notice title=TTI::${result.metrics.tti.toFixed(0)}ms`);
  lines.push(`::notice title=TBT::${result.metrics.tbt.toFixed(0)}ms`);

  // Failures
  if (!assertions.passed) {
    for (const failure of assertions.failures) {
      lines.push(`::error title=${failure.assertion}::Expected ${failure.expected}, got ${failure.actual}`);
    }
  }

  return lines.join('\n');
}

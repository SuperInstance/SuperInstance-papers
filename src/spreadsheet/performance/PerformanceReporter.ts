/**
 * POLLN Spreadsheet - Performance Reporter
 *
 * Comprehensive performance reporting with:
 * - Performance score calculation
 * - Baseline comparison
 * - Trend analysis
 * - Regression detection
 * - Actionable recommendations
 * - Alert generation
 */

import {
  PerformanceReport,
  PerformanceSummary,
  MetricStatistics,
  BenchmarkResult,
  WebVitals,
  RatedWebVital,
  Recommendation,
  RegressionAnalysis,
  Regression,
  BaselineMetrics,
  CurrentMetrics,
  PerformanceTrend,
  TrendDataPoint,
} from './types';
import { MetricsCollector } from './MetricsCollector';
import { WebVitalsTracker } from './WebVitalsTracker';
import { SpreadsheetBenchmark } from './SpreadsheetBenchmark';

/**
 * Reporter configuration
 */
interface ReporterConfig {
  baselineMetrics?: BaselineMetrics;
  regressionThreshold?: number; // percentage
  trendWindow?: number; // time window in ms
  enableRecommendations?: boolean;
  enableRegressionDetection?: boolean;
}

/**
 * Metric threshold for scoring
 */
interface MetricThreshold {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
  invert?: boolean; // If true, lower is better
}

/**
 * Performance thresholds
 */
const PERFORMANCE_THRESHOLDS: Record<string, MetricThreshold> = {
  fps: { excellent: 60, good: 55, fair: 30, poor: 0, invert: false },
  frameTime: { excellent: 16.67, good: 18, fair: 33.33, poor: 100, invert: true },
  memoryUsage: { excellent: 50, good: 70, fair: 85, poor: 95, invert: true },
  lcp: { excellent: 2000, good: 2500, fair: 4000, poor: 10000, invert: true },
  fid: { excellent: 50, good: 100, fair: 300, poor: 1000, invert: true },
  cls: { excellent: 0.05, good: 0.1, fair: 0.25, poor: 0.5, invert: true },
  tti: { excellent: 3000, good: 3800, fair: 7300, poor: 20000, invert: true },
  tbt: { excellent: 100, good: 200, fair: 600, poor: 2000, invert: true },
  renderTime: { excellent: 100, good: 200, fair: 500, poor: 1000, invert: true },
  formulaEvaluation: { excellent: 1, good: 5, fair: 20, poor: 100, invert: true },
};

/**
 * Performance Reporter
 *
 * Generates comprehensive performance reports with analysis,
 * recommendations, and regression detection.
 */
export class PerformanceReporter {
  private config: Required<ReporterConfig>;
  private metricsCollector: MetricsCollector;
  private webVitalsTracker: WebVitalsTracker | null = null;
  private benchmark: SpreadsheetBenchmark;

  constructor(
    config: ReporterConfig = {},
    metricsCollector?: MetricsCollector,
    webVitalsTracker?: WebVitalsTracker
  ) {
    this.config = {
      baselineMetrics: config.baselineMetrics || {
        timestamp: Date.now(),
        metrics: {},
      },
      regressionThreshold: config.regressionThreshold || 10, // 10%
      trendWindow: config.trendWindow || 60 * 60 * 1000, // 1 hour
      enableRecommendations: config.enableRecommendations ?? true,
      enableRegressionDetection: config.enableRegressionDetection ?? true,
    };

    this.metricsCollector = metricsCollector || new MetricsCollector();
    this.webVitalsTracker = webVitalsTracker || null;
    this.benchmark = new SpreadsheetBenchmark({}, this.metricsCollector);
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(): Promise<PerformanceReport> {
    const startTime = performance.now();

    // Gather data
    const summary = this.generateSummary();
    const webVitals = this.getWebVitals();
    const metrics = this.metricsCollector.getAllStatistics();
    const benchmarks = await this.runBenchmarks();

    // Analyze
    const recommendations = this.config.enableRecommendations
      ? this.generateRecommendations(summary, webVitals, metrics, benchmarks)
      : [];

    const regressionAnalysis = this.config.enableRegressionDetection
      ? this.detectRegression(metrics)
      : undefined;

    const duration = performance.now() - startTime;

    return {
      id: `report_${Date.now()}`,
      timestamp: Date.now(),
      duration,
      summary,
      webVitals,
      metrics,
      benchmarks,
      profiles: {},
      network: [],
      longTasks: [],
      recommendations,
      regressionAnalysis,
    };
  }

  /**
   * Generate performance summary
   */
  private generateSummary(): PerformanceSummary {
    const webVitals = this.webVitalsTracker?.getWebVitals();
    const metrics = this.metricsCollector.getAllStatistics();

    // Calculate component scores
    let totalScore = 0;
    let scoreCount = 0;

    let fps = 0;
    let memoryUsage = 0;
    let cpuUsage = 0;

    // Web Vitals score
    if (webVitals) {
      const webVitalsScore = this.calculateWebVitalsScore(webVitals);
      totalScore += webVitalsScore;
      scoreCount++;

      if (webVitals.lcp !== undefined) {
        fps = 1000 / webVitals.lcp;
      }
    }

    // Metrics score
    for (const metric of metrics) {
      const threshold = PERFORMANCE_THRESHOLDS[metric.name];
      if (threshold) {
        const score = this.calculateMetricScore(metric.avg, threshold);
        totalScore += score;
        scoreCount++;

        if (metric.name === 'memoryUsage') {
          memoryUsage = metric.avg;
        }
      }
    }

    const overallScore = scoreCount > 0 ? totalScore / scoreCount : 50;
    const rating = this.getScoreRating(overallScore);

    // Identify bottleneck
    const bottleneck = this.identifyBottleneck(metrics, webVitals);

    return {
      overall: rating,
      score: Math.round(overallScore),
      fps,
      memoryUsage,
      cpuUsage,
      bottleneck,
    };
  }

  /**
   * Get rated Web Vitals
   */
  private getWebVitals(): RatedWebVital[] {
    if (!this.webVitalsTracker) {
      return [];
    }

    const ratedMetrics = this.webVitalsTracker.getRatedMetrics();
    return Array.from(ratedMetrics.values());
  }

  /**
   * Calculate Web Vitals score
   */
  private calculateWebVitalsScore(webVitals: Partial<WebVitals>): number {
    let score = 0;
    let count = 0;

    if (webVitals.lcp !== undefined) {
      const threshold = PERFORMANCE_THRESHOLDS.lcp;
      score += this.calculateMetricScore(webVitals.lcp, threshold);
      count++;
    }

    if (webVitals.fid !== undefined) {
      const threshold = PERFORMANCE_THRESHOLDS.fid;
      score += this.calculateMetricScore(webVitals.fid, threshold);
      count++;
    }

    if (webVitals.cls !== undefined) {
      const threshold = PERFORMANCE_THRESHOLDS.cls;
      score += this.calculateMetricScore(webVitals.cls, threshold);
      count++;
    }

    if (webVitals.tti !== undefined) {
      const threshold = PERFORMANCE_THRESHOLDS.tti;
      score += this.calculateMetricScore(webVitals.tti, threshold);
      count++;
    }

    if (webVitals.tbt !== undefined) {
      const threshold = PERFORMANCE_THRESHOLDS.tbt;
      score += this.calculateMetricScore(webVitals.tbt, threshold);
      count++;
    }

    return count > 0 ? score / count : 50;
  }

  /**
   * Calculate metric score based on threshold
   */
  private calculateMetricScore(value: number, threshold: MetricThreshold): number {
    const { excellent, good, fair, poor, invert = false } = threshold;

    let score: number;

    if (invert) {
      // Lower is better
      if (value <= excellent) score = 100;
      else if (value <= good) score = 80;
      else if (value <= fair) score = 60;
      else if (value <= poor) score = 40;
      else score = 20;
    } else {
      // Higher is better
      if (value >= excellent) score = 100;
      else if (value >= good) score = 80;
      else if (value >= fair) score = 60;
      else if (value >= poor) score = 40;
      else score = 20;
    }

    return score;
  }

  /**
   * Get rating from score
   */
  private getScoreRating(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Identify performance bottleneck
   */
  private identifyBottleneck(
    metrics: MetricStatistics[],
    webVitals?: Partial<WebVitals>
  ): string {
    let worstScore = 100;
    let bottleneck = 'none';

    // Check Web Vitals
    if (webVitals) {
      if (webVitals.lcp !== undefined) {
        const score = this.calculateMetricScore(webVitals.lcp, PERFORMANCE_THRESHOLDS.lcp);
        if (score < worstScore) {
          worstScore = score;
          bottleneck = 'LCP (Largest Contentful Paint)';
        }
      }

      if (webVitals.cls !== undefined) {
        const score = this.calculateMetricScore(webVitals.cls, PERFORMANCE_THRESHOLDS.cls);
        if (score < worstScore) {
          worstScore = score;
          bottleneck = 'CLS (Cumulative Layout Shift)';
        }
      }

      if (webVitals.fid !== undefined) {
        const score = this.calculateMetricScore(webVitals.fid, PERFORMANCE_THRESHOLDS.fid);
        if (score < worstScore) {
          worstScore = score;
          bottleneck = 'FID (First Input Delay)';
        }
      }
    }

    // Check custom metrics
    for (const metric of metrics) {
      const threshold = PERFORMANCE_THRESHOLDS[metric.name];
      if (threshold) {
        const score = this.calculateMetricScore(metric.avg, threshold);
        if (score < worstScore) {
          worstScore = score;
          bottleneck = metric.name;
        }
      }
    }

    return bottleneck;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    summary: PerformanceSummary,
    webVitals: RatedWebVital[],
    metrics: MetricStatistics[],
    benchmarks: BenchmarkResult[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Web Vitals recommendations
    for (const vital of webVitals) {
      if (vital.rating === 'poor') {
        recommendations.push(this.getWebVitalRecommendation(vital));
      } else if (vital.rating === 'needs-improvement') {
        recommendations.push(this.getWebVitalImprovement(vital));
      }
    }

    // Custom metric recommendations
    for (const metric of metrics) {
      const threshold = PERFORMANCE_THRESHOLDS[metric.name];
      if (threshold) {
        const score = this.calculateMetricScore(metric.avg, threshold);
        if (score < 60) {
          recommendations.push(this.getMetricRecommendation(metric, threshold));
        }
      }
    }

    // Benchmark recommendations
    for (const benchmark of benchmarks) {
      if (benchmark.statistics.p95 > benchmark.statistics.avg * 2) {
        recommendations.push({
          type: 'optimization',
          category: 'consistency',
          title: 'High Performance Variability Detected',
          description: `The ${benchmark.name} benchmark shows high variance (p95 is ${
            (benchmark.statistics.p95 / benchmark.statistics.avg) * 100
          }% of average). Consider optimizing for consistent performance.`,
          impact: 'medium',
          effort: 'medium',
          priority: 5,
          actionable: true,
        });
      }
    }

    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority);

    return recommendations;
  }

  /**
   * Get recommendation for poor Web Vital
   */
  private getWebVitalRecommendation(vital: RatedWebVital): Recommendation {
    const recommendations: Record<string, Recommendation> = {
      lcp: {
        type: 'critical',
        category: 'loading',
        title: 'Improve Largest Contentful Paint',
        description: 'LCP is poor. Consider: lazy loading images, optimizing image formats, reducing JavaScript bundle size, using a CDN, and optimizing server response time.',
        impact: 'high',
        effort: 'medium',
        priority: 10,
        actionable: true,
      },
      cls: {
        type: 'critical',
        category: 'visual-stability',
        title: 'Reduce Cumulative Layout Shift',
        description: 'CLS is poor. Always include size attributes on images and videos, never insert content above existing content, and reserve space for dynamic content.',
        impact: 'high',
        effort: 'low',
        priority: 9,
        actionable: true,
      },
      fid: {
        type: 'critical',
        category: 'interactivity',
        title: 'Reduce First Input Delay',
        description: 'FID is poor. Break up long JavaScript tasks, reduce JavaScript execution time, use web workers for heavy computation, and minimize main thread work.',
        impact: 'high',
        effort: 'medium',
        priority: 8,
        actionable: true,
      },
      tti: {
        type: 'warning',
        category: 'interactivity',
        title: 'Improve Time to Interactive',
        description: 'TTI is slow. Reduce JavaScript payloads, defer non-critical JavaScript, minimize critical request depth, and optimize resource loading.',
        impact: 'high',
        effort: 'medium',
        priority: 7,
        actionable: true,
      },
      tbt: {
        type: 'warning',
        category: 'responsiveness',
        title: 'Reduce Total Blocking Time',
        description: 'TBT is high. Minimize main thread work, reduce JavaScript execution time, and break up long tasks.',
        impact: 'medium',
        effort: 'medium',
        priority: 6,
        actionable: true,
      },
    };

    return recommendations[vital.name] || {
      type: 'warning',
      category: 'performance',
      title: `Improve ${vital.name}`,
      description: `${vital.name} is ${vital.rating}. Current value: ${vital.value.toFixed(2)}, Target: ${vital.target}`,
      impact: 'medium',
      effort: 'medium',
      priority: 5,
      actionable: true,
    };
  }

  /**
   * Get improvement recommendation for Web Vital
   */
  private getWebVitalImprovement(vital: RatedWebVital): Recommendation {
    return {
      type: 'optimization',
      category: vital.name,
      title: `Further Optimize ${vital.name}`,
      description: `${vital.name} needs improvement. Current value: ${vital.value.toFixed(2)}, Target: ${vital.target}. Consider implementing additional optimizations.`,
      impact: 'medium',
      effort: 'low',
      priority: 4,
      actionable: true,
    };
  }

  /**
   * Get recommendation for metric
   */
  private getMetricRecommendation(
    metric: MetricStatistics,
    threshold: MetricThreshold
  ): Recommendation {
    return {
      type: 'warning',
      category: metric.name,
      title: `Optimize ${metric.name}`,
      description: `${metric.name} is performing poorly. Average: ${metric.avg.toFixed(2)}, Target: < ${threshold.good}. Consider profiling and optimizing this area.`,
      impact: 'medium',
      effort: 'medium',
      priority: 5,
      actionable: true,
    };
  }

  /**
   * Detect performance regression
   */
  private detectRegression(metrics: MetricStatistics[]): RegressionAnalysis | undefined {
    if (!this.config.baselineMetrics) {
      return undefined;
    }

    const baseline = this.config.baselineMetrics.metrics;
    const current: Record<string, number> = {};

    for (const metric of metrics) {
      current[metric.name] = metric.avg;
    }

    const regressions: Regression[] = [];
    const improvements: Regression[] = [];

    for (const [name, currentValue] of Object.entries(current)) {
      const baselineValue = baseline[name];

      if (baselineValue !== undefined && baselineValue !== 0) {
        const changePercent = ((currentValue - baselineValue) / baselineValue) * 100;

        // Determine if this is a regression or improvement
        const threshold = PERFORMANCE_THRESHOLDS[name];
        const isRegression = threshold?.invert
          ? changePercent > this.config.regressionThreshold // Lower is better, increase is bad
          : changePercent < -this.config.regressionThreshold; // Higher is better, decrease is bad

        const isImprovement = threshold?.invert
          ? changePercent < -this.config.regressionThreshold // Lower is better, decrease is good
          : changePercent > this.config.regressionThreshold; // Higher is better, increase is good

        if (isRegression) {
          regressions.push({
            metric: name,
            baseline: baselineValue,
            current: currentValue,
            changePercent,
            severity: Math.abs(changePercent) > 50 ? 'critical' :
                      Math.abs(changePercent) > 25 ? 'major' : 'minor',
            confidence: 0.9,
          });
        } else if (isImprovement) {
          improvements.push({
            metric: name,
            baseline: baselineValue,
            current: currentValue,
            changePercent,
            severity: Math.abs(changePercent) > 50 ? 'critical' :
                      Math.abs(changePercent) > 25 ? 'major' : 'minor',
            confidence: 0.9,
          });
        }
      }
    }

    return {
      hasRegression: regressions.length > 0,
      regressions,
      improvements,
      baseline: this.config.baselineMetrics,
      current: {
        timestamp: Date.now(),
        metrics: current,
      },
    };
  }

  /**
   * Analyze performance trends
   */
  analyzeTrend(metricName: string): PerformanceTrend | null {
    const now = Date.now();
    const start = now - this.config.trendWindow;

    const timeRange = { start, end: now };
    const metrics = this.metricsCollector.getMetrics(timeRange)
      .filter(m => m.name === metricName);

    if (metrics.length < 2) {
      return null;
    }

    // Calculate trend
    const dataPoints: TrendDataPoint[] = metrics.map(m => ({
      timestamp: m.timestamp,
      value: m.value,
    }));

    // Simple linear regression
    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = dataPoints[i].value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;

    // Determine direction
    let direction: 'improving' | 'degrading' | 'stable';
    const threshold = PERFORMANCE_THRESHOLDS[metricName];

    if (threshold?.invert) {
      // Lower is better
      if (slope < -avgY * 0.01) direction = 'improving';
      else if (slope > avgY * 0.01) direction = 'degrading';
      else direction = 'stable';
    } else {
      // Higher is better
      if (slope > avgY * 0.01) direction = 'improving';
      else if (slope < -avgY * 0.01) direction = 'degrading';
      else direction = 'stable';
    }

    const changePercent = (slope / avgY) * 100;
    const confidence = Math.min(1, n / 20); // More data = higher confidence

    return {
      metric: metricName,
      direction,
      changePercent,
      confidence,
      dataPoints,
    };
  }

  /**
   * Set baseline metrics
   */
  setBaseline(metrics: Record<string, number>): void {
    this.config.baselineMetrics = {
      timestamp: Date.now(),
      metrics,
    };
  }

  /**
   * Run benchmarks
   */
  private async runBenchmarks(): Promise<BenchmarkResult[]> {
    const benchmarks: BenchmarkResult[] = [];

    // Run a few key benchmarks
    const cellCounts = [100, 500];
    for (const count of cellCounts) {
      try {
        const result = this.benchmark.benchmarkRender(count);
        benchmarks.push(result);
      } catch (error) {
        console.error(`Benchmark failed for ${count} cells:`, error);
      }
    }

    return benchmarks;
  }

  /**
   * Export report as JSON
   */
  exportReport(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate markdown summary
   */
  generateMarkdown(report: PerformanceReport): string {
    const lines: string[] = [];

    lines.push(`# Performance Report`);
    lines.push(``);
    lines.push(`**Generated:** ${new Date(report.timestamp).toISOString()}`);
    lines.push(`**Duration:** ${report.duration.toFixed(2)}ms`);
    lines.push(``);

    // Summary
    lines.push(`## Summary`);
    lines.push(``);
    lines.push(`- **Overall Score:** ${report.summary.score}/100`);
    lines.push(`- **Rating:** ${report.summary.overall.toUpperCase()}`);
    lines.push(`- **Bottleneck:** ${report.summary.bottleneck}`);
    lines.push(`- **FPS:** ${report.summary.fps.toFixed(1)}`);
    lines.push(`- **Memory Usage:** ${report.summary.memoryUsage.toFixed(1)}%`);
    lines.push(``);

    // Web Vitals
    if (report.webVitals.length > 0) {
      lines.push(`## Web Vitals`);
      lines.push(``);

      for (const vital of report.webVitals) {
        const emoji = vital.rating === 'good' ? '✅' :
                     vital.rating === 'needs-improvement' ? '⚠️' : '❌';
        lines.push(`- ${emoji} **${vital.name}:** ${vital.value.toFixed(2)}ms (${vital.rating})`);
      }

      lines.push(``);
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push(`## Recommendations`);
      lines.push(``);

      for (const rec of report.recommendations) {
        const emoji = rec.type === 'critical' ? '🚨' :
                     rec.type === 'warning' ? '⚠️' : '💡';
        lines.push(`### ${emoji} ${rec.title}`);
        lines.push(``);
        lines.push(`${rec.description}`);
        lines.push(``);
        lines.push(`- **Impact:** ${rec.impact}`);
        lines.push(`- **Effort:** ${rec.effort}`);
        lines.push(`- **Priority:** ${rec.priority}`);
        lines.push(``);
      }
    }

    // Regression Analysis
    if (report.regressionAnalysis) {
      const analysis = report.regressionAnalysis;

      if (analysis.regressions.length > 0) {
        lines.push(`## Performance Regressions Detected`);
        lines.push(``);

        for (const regression of analysis.regressions) {
          lines.push(`### ${regression.metric}`);
          lines.push(``);
          lines.push(`- **Baseline:** ${regression.baseline.toFixed(2)}`);
          lines.push(`- **Current:** ${regression.current.toFixed(2)}`);
          lines.push(`- **Change:** ${regression.changePercent > 0 ? '+' : ''}${regression.changePercent.toFixed(1)}%`);
          lines.push(`- **Severity:** ${regression.severity}`);
          lines.push(``);
        }
      }

      if (analysis.improvements.length > 0) {
        lines.push(`## Performance Improvements`);
        lines.push(``);

        for (const improvement of analysis.improvements) {
          lines.push(`### ${improvement.metric}`);
          lines.push(``);
          lines.push(`- **Baseline:** ${improvement.baseline.toFixed(2)}`);
          lines.push(`- **Current:** ${improvement.current.toFixed(2)}`);
          lines.push(`- **Change:** ${improvement.changePercent > 0 ? '+' : ''}${improvement.changePercent.toFixed(1)}%`);
          lines.push(``);
        }
      }
    }

    return lines.join('\n');
  }
}

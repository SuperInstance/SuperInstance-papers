/**
 * Example: Validating Performance Claims with Statistical Testing
 *
 * This example demonstrates how to use the statistical testing module
 * to validate performance claims such as "15x speedup" or "80% energy reduction"
 */

import {
  StatisticalTest,
  EffectSizeCalculator,
  SampleSizeCalculator,
  MultipleTestCorrector,
  ConfidenceInterval,
  NormalityTest,
} from '../stats.js';

/**
 * Utility class for statistical operations
 */
class StatsUtils {
  static mean(data: number[]): number {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  static std(data: number[]): number {
    const m = this.mean(data);
    const variance = data.reduce((sum, val) => sum + (val - m) ** 2, 0) / (data.length - 1);
    return Math.sqrt(variance);
  }

  static percentile(data: number[], p: number): number {
    const sorted = [...data].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

/**
 * Simulated benchmark data generator
 */
class BenchmarkDataGenerator {
  /**
   * Generate baseline timing data (ms)
   */
  static baseline(n: number): number[] {
    // Mean: 100ms, SD: 10ms
    return Array.from({ length: n }, () => this.normalRandom(100, 10));
  }

  /**
   * Generate optimized timing data (ms) - ~15x faster
   */
  static optimized(n: number): number[] {
    // Mean: 6.67ms (~15x faster), SD: 1ms
    return Array.from({ length: n }, () => this.normalRandom(6.67, 1));
  }

  /**
   * Generate baseline energy data (J)
   */
  static baselineEnergy(n: number): number[] {
    // Mean: 100J, SD: 15J
    return Array.from({ length: n }, () => this.normalRandom(100, 15));
  }

  /**
   * Generate optimized energy data (J) - ~80% reduction
   */
  static optimizedEnergy(n: number): number[] {
    // Mean: 20J (80% reduction), SD: 5J
    return Array.from({ length: n }, () => this.normalRandom(20, 5));
  }

  /**
   * Box-Muller transform for normal random
   */
  private static normalRandom(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * std + mean;
  }
}

/**
 * Benchmark validation reporter
 */
class BenchmarkReporter {
  /**
   * Generate comprehensive validation report
   */
  static generateReport(
    baseline: number[],
    optimized: number[],
    metricName: string,
    units: string
  ): string {
    const lines: string[] = [];
    lines.push('='.repeat(70));
    lines.push(`PERFORMANCE VALIDATION REPORT: ${metricName}`);
    lines.push('='.repeat(70));
    lines.push('');

    // Descriptive statistics
    lines.push('DESCRIPTIVE STATISTICS');
    lines.push('-'.repeat(70));
    lines.push(`${'Metric'.padEnd(20)} ${'Baseline'.padEnd(15)} ${'Optimized'.padEnd(15)} ${'Change'.padEnd(15)}`);
    lines.push('-'.repeat(70));

    const baselineMean = StatsUtils.mean(baseline);
    const optimizedMean = StatsUtils.mean(optimized);
    const change = ((baselineMean - optimizedMean) / baselineMean) * 100;

    lines.push(
      `Mean (${units})`.padEnd(20) +
        `${baselineMean.toFixed(2).padEnd(15)} ${optimizedMean.toFixed(2).padEnd(15)} ${change.toFixed(1)}%`
    );

    const baselineStd = StatsUtils.std(baseline);
    const optimizedStd = StatsUtils.std(optimized);

    lines.push(
      `Std Dev (${units})`.padEnd(20) +
        `${baselineStd.toFixed(2).padEnd(15)} ${optimizedStd.toFixed(2).padEnd(15)}`
    );

    const baselineMedian = StatsUtils.percentile(baseline, 50);
    const optimizedMedian = StatsUtils.percentile(optimized, 50);

    lines.push(
      `Median (${units})`.padEnd(20) +
        `${baselineMedian.toFixed(2).padEnd(15)} ${optimizedMedian.toFixed(2).padEnd(15)}`
    );

    const baselineP95 = StatsUtils.percentile(baseline, 95);
    const optimizedP95 = StatsUtils.percentile(optimized, 95);

    lines.push(
      `95th Percentile`.padEnd(20) +
        `${baselineP95.toFixed(2).padEnd(15)} ${optimizedP95.toFixed(2).padEnd(15)}`
    );

    lines.push('');

    // Normality test
    lines.push('ASSUMPTION CHECKS');
    lines.push('-'.repeat(70));

    const baselineNormality = NormalityTest.shapiroWilk(baseline);
    const optimizedNormality = NormalityTest.shapiroWilk(optimized);

    lines.push(`Baseline normality test: p = ${baselineNormality.pValue.toFixed(4)}`);
    lines.push(
      `  → Data is ${baselineNormality.rejected ? 'NOT ' : ''}normally distributed (α = 0.05)`
    );
    lines.push(`Optimized normality test: p = ${optimizedNormality.pValue.toFixed(4)}`);
    lines.push(
      `  → Data is ${optimizedNormality.rejected ? 'NOT ' : ''}normally distributed (α = 0.05)`
    );

    const useParametric = !baselineNormality.rejected && !optimizedNormality.rejected;
    lines.push(`Recommended test: ${useParametric ? 'Parametric (t-test)' : 'Non-parametric (Mann-Whitney)'}`);

    lines.push('');

    // Hypothesis test
    lines.push('HYPOTHESIS TEST');
    lines.push('-'.repeat(70));

    const test = new StatisticalTest({ alpha: 0.01, twoTailed: false });
    const result = useParametric
      ? test.twoSampleTTest(baseline, optimized, false)
      : test.mannWhitneyUTest(baseline, optimized);

    lines.push(`Test: ${result.testName}`);
    lines.push(`Null hypothesis: No difference between baseline and optimized`);
    lines.push(`Alternative: Optimized is better than baseline (one-tailed)`);
    lines.push(`Significance level: α = 0.01`);
    lines.push('');
    lines.push(`Test statistic: ${result.statistic.toFixed(4)}`);
    lines.push(`P-value: ${result.pValue.toExponential(4)}`);
    lines.push(`Result: ${result.rejected ? 'REJECTED' : 'FAILED TO REJECT'} null hypothesis`);
    lines.push(`Conclusion: ${result.rejected ? 'Statistically significant improvement' : 'Not statistically significant'}`);

    lines.push('');

    // Effect size
    lines.push('EFFECT SIZE');
    lines.push('-'.repeat(70));

    const effectSize = EffectSizeCalculator.cohensD(baseline, optimized);
    lines.push(`Cohen's d: ${effectSize.value.toFixed(4)}`);
    lines.push(`Interpretation: ${effectSize.interpretation}`);
    lines.push(`95% CI: [${effectSize.confidenceInterval[0].toFixed(4)}, ${effectSize.confidenceInterval[1].toFixed(4)}]`);

    lines.push('');

    // Confidence interval for difference
    lines.push('CONFIDENCE INTERVAL');
    lines.push('-'.repeat(70));

    const ci = ConfidenceInterval.forMeanDifference(baseline, optimized, 0.95, false);
    const meanDiff = baselineMean - optimizedMean;
    lines.push(`Mean difference: ${meanDiff.toFixed(2)} ${units}`);
    lines.push(`95% CI: [${ci[0].toFixed(2)}, ${ci[1].toFixed(2)}] ${units}`);
    lines.push(`We are 95% confident the true improvement is between ${ci[0].toFixed(2)} and ${ci[1].toFixed(2)} ${units}`);

    lines.push('');

    // Practical significance
    lines.push('PRACTICAL SIGNIFICANCE');
    lines.push('-'.repeat(70));

    if (metricName.toLowerCase().includes('speed')) {
      const speedup = baselineMean / optimizedMean;
      lines.push(`Speedup: ${speedup.toFixed(2)}x`);
      lines.push(`  → Optimized is ${speedup.toFixed(2)} times faster than baseline`);

      if (speedup >= 15) {
        lines.push(`  ✓ CLAIM VALIDATED: Meets 15x speedup target`);
      } else if (speedup >= 10) {
        lines.push(`  ~ CLOSE: Approaching 15x speedup target (${speedup.toFixed(2)}x)`);
      } else {
        lines.push(`  ✗ CLAIM NOT MET: Below 15x speedup target (${speedup.toFixed(2)}x)`);
      }
    } else if (metricName.toLowerCase().includes('energy')) {
      const reduction = ((baselineMean - optimizedMean) / baselineMean) * 100;
      lines.push(`Energy reduction: ${reduction.toFixed(1)}%`);
      lines.push(`  → Optimized uses ${reduction.toFixed(1)}% less energy than baseline`);

      if (reduction >= 80) {
        lines.push(`  ✓ CLAIM VALIDATED: Meets 80% reduction target`);
      } else if (reduction >= 70) {
        lines.push(`  ~ CLOSE: Approaching 80% reduction target (${reduction.toFixed(1)}%)`);
      } else {
        lines.push(`  ✗ CLAIM NOT MET: Below 80% reduction target (${reduction.toFixed(1)}%)`);
      }
    }

    lines.push('');
    lines.push('='.repeat(70));

    return lines.join('\n');
  }
}

/**
 * Example 1: Validate 15x Speedup Claim
 */
function validateSpeedupClaim(): void {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + 'EXAMPLE 1: Validating 15x Speedup Claim'.padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  // Step 1: Determine required sample size
  console.log('\nStep 1: Power Analysis');
  console.log('-'.repeat(70));

  const powerAnalysis = SampleSizeCalculator.forTTest({
    effectSize: 2.0, // Very large effect (15x speedup)
    power: 0.90,
    alpha: 0.01,
  });

  console.log(`Required sample size: ${powerAnalysis.sampleSize} total (${powerAnalysis.sampleSize / 2} per group)`);
  console.log(`Expected power: ${(powerAnalysis.power * 100).toFixed(1)}%`);

  // Step 2: Generate data
  console.log('\nStep 2: Collect Data');
  console.log('-'.repeat(70));

  const n = powerAnalysis.sampleSize / 2;
  const baselineData = BenchmarkDataGenerator.baseline(n);
  const optimizedData = BenchmarkDataGenerator.optimized(n);

  console.log(`Collected ${baselineData.length} baseline measurements`);
  console.log(`Collected ${optimizedData.length} optimized measurements`);

  // Step 3: Generate report
  console.log('\nStep 3: Statistical Analysis');
  console.log('');

  const report = BenchmarkReporter.generateReport(baselineData, optimizedData, 'Execution Speed', 'ms');
  console.log(report);
}

/**
 * Example 2: Validate 80% Energy Reduction Claim
 */
function validateEnergyReductionClaim(): void {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + 'EXAMPLE 2: Validating 80% Energy Reduction Claim'.padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  // Power analysis
  console.log('\nStep 1: Power Analysis');
  console.log('-'.repeat(70));

  const powerAnalysis = SampleSizeCalculator.forTTest({
    effectSize: 3.0, // Huge effect (80% reduction)
    power: 0.95,
    alpha: 0.01,
  });

  console.log(`Required sample size: ${powerAnalysis.sampleSize} total`);
  console.log(`Expected power: ${(powerAnalysis.power * 100).toFixed(1)}%`);

  // Generate data
  console.log('\nStep 2: Collect Data');
  console.log('-'.repeat(70));

  const n = powerAnalysis.sampleSize / 2;
  const baselineData = BenchmarkDataGenerator.baselineEnergy(n);
  const optimizedData = BenchmarkDataGenerator.optimizedEnergy(n);

  console.log(`Collected ${baselineData.length} baseline energy measurements`);
  console.log(`Collected ${optimizedData.length} optimized energy measurements`);

  // Analysis
  console.log('\nStep 3: Statistical Analysis');
  console.log('');

  const report = BenchmarkReporter.generateReport(baselineData, optimizedData, 'Energy Consumption', 'J');
  console.log(report);
}

/**
 * Example 3: Multiple Comparison Correction
 */
function multipleComparisonExample(): void {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + 'EXAMPLE 3: Multiple Comparison Correction'.padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  // Simulate testing multiple optimizations
  console.log('\nScenario: Testing 10 different optimizations');
  console.log('-'.repeat(70));

  const pValues = [
    0.0001, 0.003, 0.015, 0.023, 0.042, 0.067, 0.089, 0.123, 0.187, 0.234,
  ];

  console.log('\nRaw p-values:');
  pValues.forEach((p, i) => {
    console.log(`  Optimization ${i + 1}: p = ${p.toFixed(4)}`);
  });

  console.log(`\nWithout correction (α = 0.05): ${pValues.filter((p) => p < 0.05).length} significant`);

  // Bonferroni
  const bonferroni = MultipleTestCorrector.bonferroni(pValues, 0.05);
  console.log(`\nBonferroni correction: ${bonferroni.filter((r: number) => r === 1).length} significant`);
  console.log(
    '  Significant optimizations:',
    bonferroni
      .map((r: number, i: number) => (r === 1 ? i + 1 : -1))
      .filter((i: number) => i > 0)
      .join(', ')
  );

  // Holm
  const holm = MultipleTestCorrector.holm(pValues, 0.05);
  console.log(`\nHolm-Bonferroni: ${holm.filter((r) => r === 1).length} significant`);
  console.log(
    '  Significant optimizations:',
    holm
      .map((r, i) => (r === 1 ? i + 1 : -1))
      .filter((i) => i > 0)
      .join(', ')
  );

  // Benjamini-Hochberg
  const bh = MultipleTestCorrector.benjaminiHochberg(pValues, 0.05);
  console.log(`\nBenjamini-Hochberg (FDR): ${bh.filter((r) => r === 1).length} significant`);
  console.log(
    '  Significant optimizations:',
    bh
      .map((r, i) => (r === 1 ? i + 1 : -1))
      .filter((i) => i > 0)
      .join(', ')
  );

  // Q-values
  const qValues = MultipleTestCorrector.calculateQValues(pValues);
  console.log('\nQ-values (FDR-adjusted):');
  qValues.forEach((q, i) => {
    console.log(`  Optimization ${i + 1}: q = ${q.toFixed(4)}`);
  });
}

/**
 * Example 4: Power Analysis for Different Effect Sizes
 */
function powerAnalysisExample(): void {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + 'EXAMPLE 4: Sample Size vs Effect Size'.padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  console.log('\nRequired sample sizes for different effect sizes (80% power, α = 0.05):');
  console.log('-'.repeat(70));
  console.log(`${'Effect Size'.padEnd(15)} ${'Interpretation'.padEnd(15)} ${'Sample Size'.padEnd(15)} ${'Per Group'}`);
  console.log('-'.repeat(70));

  const effectSizes = [
    { d: 0.2, interpretation: 'small' },
    { d: 0.5, interpretation: 'medium' },
    { d: 0.8, interpretation: 'large' },
    { d: 1.2, interpretation: 'very large' },
    { d: 2.0, interpretation: 'huge' },
  ];

  effectSizes.forEach(({ d, interpretation }) => {
    const result = SampleSizeCalculator.forTTest({
      effectSize: d,
      power: 0.80,
      alpha: 0.05,
    });

    console.log(
      `${d.toFixed(1).padEnd(15)} ${interpretation.padEnd(15)} ${result.sampleSize.toString().padEnd(15)} ${result.sampleSize / 2}`
    );
  });

  console.log('\nKey insight: Larger effects require much smaller samples!');
}

/**
 * Example 5: Choosing the Right Test
 */
function testSelectionExample(): void {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + 'EXAMPLE 5: Statistical Test Selection Guide'.padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  console.log('\nDecision Tree:');
  console.log('-'.repeat(70));

  console.log(`
1. Are observations paired?
   ├─ Yes → Check normality of differences
   │        ├─ Normal → Paired t-test
   │        └─ Non-normal → Wilcoxon signed-rank test
   └─ No → Check normality of both groups
            ├─ Both normal → Check variance equality
            │                ├─ Equal → Two-sample t-test
            │                └─ Unequal → Welch's t-test
            └─ At least one non-normal → Mann-Whitney U test
  `);

  console.log('Example Scenarios:');
  console.log('-'.repeat(70));

  const scenarios = [
    {
      name: 'Before/After optimization on same system',
      paired: true,
      normal: true,
      test: 'Paired t-test',
    },
    {
      name: 'Comparing two different algorithms',
      paired: false,
      normal: true,
      equalVar: false,
      test: "Welch's t-test",
    },
    {
      name: 'Comparing performance with outliers',
      paired: false,
      normal: false,
      test: "Mann-Whitney U test",
    },
    {
      name: 'Multiple measurements on same subjects',
      paired: true,
      normal: false,
      test: 'Wilcoxon signed-rank test',
    },
  ];

  scenarios.forEach((scenario, i) => {
    console.log(`\n${i + 1}. ${scenario.name}`);
    console.log(`   Recommended test: ${scenario.test}`);
  });
}

/**
 * Run all examples
 */
function main(): void {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + 'Statistical Testing for Benchmark Validation'.padEnd(68) + '║');
  console.log('║' + 'Production-Quality Performance Claim Validation'.padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  validateSpeedupClaim();
  validateEnergyReductionClaim();
  multipleComparisonExample();
  powerAnalysisExample();
  testSelectionExample();

  console.log('\n\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + 'Summary: Statistical Validation is Essential'.padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  console.log(`
Key Takeaways:

1. ALWAYS use statistical testing for performance claims
   - "15x faster" requires statistical evidence
   - P-value < 0.01 for strong claims
   - Report effect sizes with confidence intervals

2. Sample size matters
   - Use power analysis before collecting data
   - Larger effects need fewer samples
   - Aim for 80-90% power

3. Check assumptions
   - Test for normality
   - Choose parametric vs non-parametric appropriately
   - Use Welch's test for unequal variances

4. Correct for multiple comparisons
   - Bonferroni for few tests (< 5)
   - Benjamini-Hochberg for many tests
   - Report which correction was used

5. Report comprehensively
   - Descriptive statistics (mean, SD, percentiles)
   - Hypothesis test results (test, statistic, p-value)
   - Effect size with interpretation
   - Confidence intervals
   - Practical significance (speedup, reduction %)

Remember: Without proper statistics, performance claims are just anecdotes!
`);

  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + 'End of Examples'.padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  console.log('\n');
}

// Run examples
main();

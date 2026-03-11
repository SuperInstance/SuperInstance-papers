/**
 * Stability Validation Framework for SMPbots
 *
 * Implements comprehensive stability testing and drift detection
 * for SMPbot = Seed + Model + Prompt = Stable Output
 */

import SMPbot, {
  StabilityValidator, StabilityReport, InputRange, Duration,
  DriftDetection, StabilizationPlan, StabilizationAction
} from './SMPbot';

// ============================================================================
// CONCRETE STABILITY VALIDATOR
// ============================================================================

/**
 * Concrete implementation of stability validation framework
 */
export class ConcreteStabilityValidator<O> implements StabilityValidator<O> {
  private readonly significanceLevel: number = 0.01; // α = 0.01
  private readonly minSamples: number = 1000;

  constructor(
    private options: {
      significanceLevel?: number;
      minSamples?: number;
      driftThreshold?: number;
    } = {}
  ) {
    this.significanceLevel = options.significanceLevel ?? 0.01;
    this.minSamples = options.minSamples ?? 1000;
  }

  /**
   * Test stability across model variations
   */
  async testModelVariation(bot: SMPbot<I, O>, variations: number = 10): Promise<StabilityReport> {
    console.log(`Testing model variation stability for ${bot.id} with ${variations} variations`);

    const testInput = this.generateTestInput(bot);
    const outputs: O[] = [];
    const confidences: number[] = [];

    // Test with simulated model variations
    for (let i = 0; i < variations; i++) {
      const output = await bot.discriminate(testInput);
      const confidence = await bot.confidence(testInput);

      outputs.push(output);
      confidences.push(confidence);

      // Simulate model parameter variation
      await this.simulateModelVariation(bot, i);
    }

    const stabilityScore = this.calculateOutputStability(outputs);
    const confidenceInterval = this.calculateConfidenceInterval(confidences);
    const variance = this.calculateVariance(outputs);
    const outliers = this.countOutliers(outputs, stabilityScore);

    return {
      botId: bot.id,
      testType: 'model',
      stabilityScore,
      confidenceInterval,
      variance,
      outliers,
      recommendations: this.generateModelVariationRecommendations(stabilityScore, variance, outliers),
    };
  }

  /**
   * Test stability across input variations
   */
  async testInputVariation(bot: SMPbot<I, O>, inputRange: InputRange): Promise<StabilityReport> {
    console.log(`Testing input variation stability for ${bot.id}`);

    const testInputs = this.generateInputVariations(inputRange, 100);
    const outputs: O[] = [];
    const confidences: number[] = [];

    for (const input of testInputs) {
      try {
        const output = await bot.discriminate(input as I);
        const confidence = await bot.confidence(input as I);

        outputs.push(output);
        confidences.push(confidence);
      } catch (error) {
        console.warn(`Input variation test failed for input: ${input}`);
      }
    }

    const stabilityScore = this.calculateOutputStability(outputs);
    const confidenceInterval = this.calculateConfidenceInterval(confidences);
    const variance = this.calculateVariance(outputs);
    const outliers = this.countOutliers(outputs, stabilityScore);

    return {
      botId: bot.id,
      testType: 'input',
      stabilityScore,
      confidenceInterval,
      variance,
      outliers,
      recommendations: this.generateInputVariationRecommendations(stabilityScore, variance, outliers),
    };
  }

  /**
   * Test temporal stability over time
   */
  async testTemporalStability(bot: SMPbot<I, O>, duration: Duration): Promise<StabilityReport> {
    console.log(`Testing temporal stability for ${bot.id} over ${duration.samplingInterval}ms intervals`);

    const testInput = this.generateTestInput(bot);
    const outputs: O[] = [];
    const confidences: number[] = [];
    const timestamps: Date[] = [];

    const startTime = Date.now();
    const endTime = startTime + (duration.end.getTime() - duration.start.getTime());

    while (Date.now() < endTime && outputs.length < this.minSamples) {
      const output = await bot.discriminate(testInput);
      const confidence = await bot.confidence(testInput);

      outputs.push(output);
      confidences.push(confidence);
      timestamps.push(new Date());

      // Wait for sampling interval
      await new Promise(resolve => setTimeout(resolve, duration.samplingInterval));
    }

    const stabilityScore = this.calculateTemporalStability(outputs, timestamps);
    const confidenceInterval = this.calculateConfidenceInterval(confidences);
    const variance = this.calculateVariance(outputs);
    const outliers = this.countOutliers(outputs, stabilityScore);

    return {
      botId: bot.id,
      testType: 'temporal',
      stabilityScore,
      confidenceInterval,
      variance,
      outliers,
      recommendations: this.generateTemporalRecommendations(stabilityScore, variance, outliers),
    };
  }

  /**
   * Calculate overall stability score from multiple reports
   */
  calculateStabilityScore(reports: StabilityReport[]): number {
    if (reports.length === 0) return 0;

    // Weight different test types
    const weights = {
      model: 0.4,    // Model variation most important
      input: 0.3,    // Input robustness important
      temporal: 0.3, // Temporal stability important
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const report of reports) {
      const weight = weights[report.testType] || 0.33;
      weightedSum += report.stabilityScore * weight;
      totalWeight += weight;
    }

    return weightedSum / totalWeight;
  }

  /**
   * Detect drift in current output compared to historical data
   */
  detectDrift(current: O, historical: O[]): DriftDetection {
    if (historical.length < 10) {
      return {
        detected: false,
        magnitude: 0,
        type: 'data',
        confidence: 0,
        recommendations: ['Insufficient historical data for drift detection'],
      };
    }

    // Convert outputs to numerical representation for analysis
    const historicalValues = this.convertToNumerical(historical);
    const currentValue = this.convertToNumerical([current])[0];

    // Statistical tests for drift detection
    const ksTest = this.kolmogorovSmirnovTest(historicalValues, [currentValue]);
    const chiSquareTest = this.chiSquareTest(historicalValues, [currentValue]);
    const klDivergence = this.klDivergence(historicalValues, [currentValue]);

    // Determine drift type and magnitude
    const driftDetected = ksTest.pValue < this.significanceLevel ||
                         chiSquareTest.pValue < this.significanceLevel;

    const magnitude = Math.max(ksTest.statistic, chiSquareTest.statistic, klDivergence);
    const driftType = this.determineDriftType(historicalValues, [currentValue]);

    return {
      detected: driftDetected,
      magnitude,
      type: driftType,
      confidence: 1 - Math.min(ksTest.pValue, chiSquareTest.pValue),
      recommendations: this.generateDriftRecommendations(driftDetected, magnitude, driftType),
    };
  }

  /**
   * Recommend stabilization actions based on stability report
   */
  recommendStabilization(report: StabilityReport): StabilizationPlan {
    const actions: StabilizationAction[] = [];
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let estimatedTime = 0;
    let expectedImprovement = 0;

    // Analyze report and recommend actions
    if (report.stabilityScore < 0.7) {
      priority = 'critical';
      actions.push({
        type: 'retrain',
        epochs: 50,
        dataSize: 1000,
      });
      estimatedTime += 3600; // 1 hour
      expectedImprovement += 0.3;
    }

    if (report.variance > 0.2) {
      priority = Math.max(priority, 'high');
      actions.push({
        type: 'fineTune',
        learningRate: 0.001,
        steps: 1000,
      });
      estimatedTime += 1800; // 30 minutes
      expectedImprovement += 0.15;
    }

    if (report.outliers > report.stabilityScore * 100) {
      priority = Math.max(priority, 'medium');
      actions.push({
        type: 'promptOptimization',
        iterations: 10,
      });
      estimatedTime += 900; // 15 minutes
      expectedImprovement += 0.1;
    }

    if (report.confidenceInterval[1] - report.confidenceInterval[0] > 0.3) {
      actions.push({
        type: 'seedAugmentation',
        newData: this.generateAugmentationData(100),
      });
      estimatedTime += 1200; // 20 minutes
      expectedImprovement += 0.1;
    }

    // Cap expected improvement
    expectedImprovement = Math.min(0.5, expectedImprovement);

    return {
      actions,
      priority,
      estimatedTime,
      expectedImprovement,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private generateTestInput(bot: SMPbot<I, O>): I {
    // Generate appropriate test input based on bot type
    // This is a simplified implementation
    return {} as I;
  }

  private async simulateModelVariation(bot: SMPbot<I, O>, variationIndex: number): Promise<void> {
    // Simulate model parameter variation
    // In real implementation, this would modify model parameters
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  private generateInputVariations(inputRange: InputRange, count: number): unknown[] {
    const variations: unknown[] = [];

    for (let i = 0; i < count; i++) {
      switch (inputRange.distribution) {
        case 'uniform':
          variations.push(this.generateUniformVariation(inputRange));
          break;
        case 'normal':
          variations.push(this.generateNormalVariation(inputRange));
          break;
        default:
          variations.push(inputRange.min);
      }
    }

    return variations;
  }

  private generateUniformVariation(inputRange: InputRange): unknown {
    // Simplified uniform distribution
    if (typeof inputRange.min === 'number' && typeof inputRange.max === 'number') {
      return inputRange.min + Math.random() * (inputRange.max - inputRange.min);
    }
    return inputRange.min;
  }

  private generateNormalVariation(inputRange: InputRange): unknown {
    // Simplified normal distribution
    if (typeof inputRange.min === 'number' && typeof inputRange.max === 'number') {
      const mean = (inputRange.min + inputRange.max) / 2;
      const stdDev = (inputRange.max - inputRange.min) / 6; // 99.7% within range
      return this.boxMullerTransform(mean, stdDev);
    }
    return inputRange.min;
  }

  private boxMullerTransform(mean: number, stdDev: number): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  private calculateOutputStability(outputs: O[]): number {
    if (outputs.length === 0) return 0;

    // Calculate similarity between outputs
    let similaritySum = 0;
    let pairCount = 0;

    for (let i = 0; i < outputs.length; i++) {
      for (let j = i + 1; j < outputs.length; j++) {
        similaritySum += this.calculateSimilarity(outputs[i], outputs[j]);
        pairCount++;
      }
    }

    return pairCount > 0 ? similaritySum / pairCount : 0;
  }

  private calculateSimilarity(a: O, b: O): number {
    // Simplified similarity calculation
    // In real implementation, this would be domain-specific

    if (typeof a === 'string' && typeof b === 'string') {
      return a === b ? 1 : 0;
    }

    if (typeof a === 'number' && typeof b === 'number') {
      const diff = Math.abs(a - b);
      const maxDiff = Math.max(Math.abs(a), Math.abs(b), 1);
      return 1 - (diff / maxDiff);
    }

    // Default similarity
    return JSON.stringify(a) === JSON.stringify(b) ? 1 : 0.5;
  }

  private calculateConfidenceInterval(confidences: number[]): [number, number] {
    if (confidences.length === 0) return [0, 0];

    const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance = confidences.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / confidences.length;
    const stdDev = Math.sqrt(variance);

    // 95% confidence interval
    const zScore = 1.96; // For 95% confidence
    const margin = zScore * stdDev / Math.sqrt(confidences.length);

    return [
      Math.max(0, mean - margin),
      Math.min(1, mean + margin),
    ];
  }

  private calculateVariance(outputs: O[]): number {
    if (outputs.length <= 1) return 0;

    // Convert outputs to numerical values for variance calculation
    const values = this.convertToNumerical(outputs);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;

    return variance;
  }

  private countOutliers(outputs: O[], stabilityScore: number): number {
    if (outputs.length === 0) return 0;

    // Simple outlier detection based on similarity threshold
    const threshold = 0.7; // Similarity threshold for outliers
    let outliers = 0;

    for (let i = 0; i < outputs.length; i++) {
      let similarCount = 0;
      for (let j = 0; j < outputs.length; j++) {
        if (i !== j && this.calculateSimilarity(outputs[i], outputs[j]) > threshold) {
          similarCount++;
        }
      }

      // If less than 50% of other outputs are similar, consider it an outlier
      if (similarCount < (outputs.length - 1) * 0.5) {
        outliers++;
      }
    }

    return outliers;
  }

  private calculateTemporalStability(outputs: O[], timestamps: Date[]): number {
    if (outputs.length <= 1) return 1;

    // Calculate stability over time (resistance to drift)
    const timeWindow = 3; // Compare outputs within time windows
    let stabilitySum = 0;
    let windowCount = 0;

    for (let i = 0; i < outputs.length - timeWindow; i += timeWindow) {
      const windowOutputs = outputs.slice(i, i + timeWindow);
      const windowStability = this.calculateOutputStability(windowOutputs);
      stabilitySum += windowStability;
      windowCount++;
    }

    return windowCount > 0 ? stabilitySum / windowCount : 1;
  }

  private convertToNumerical(outputs: O[]): number[] {
    // Convert outputs to numerical representation for statistical analysis
    return outputs.map(output => {
      if (typeof output === 'number') return output;
      if (typeof output === 'string') return output.length;
      if (typeof output === 'boolean') return output ? 1 : 0;
      if (Array.isArray(output)) return output.length;
      if (output && typeof output === 'object') return Object.keys(output).length;
      return 0;
    });
  }

  private kolmogorovSmirnovTest(historical: number[], current: number[]): {
    statistic: number;
    pValue: number;
  } {
    // Simplified KS test implementation
    const combined = [...historical, ...current].sort((a, b) => a - b);
    const n = historical.length;
    const m = current.length;

    let maxDiff = 0;
    let historicalCDF = 0;
    let currentCDF = 0;

    for (const value of combined) {
      historicalCDF = historical.filter(v => v <= value).length / n;
      currentCDF = current.filter(v => v <= value).length / m;
      maxDiff = Math.max(maxDiff, Math.abs(historicalCDF - currentCDF));
    }

    // Simplified p-value calculation
    const statistic = maxDiff;
    const pValue = Math.exp(-2 * statistic * statistic * (n * m) / (n + m));

    return { statistic, pValue };
  }

  private chiSquareTest(historical: number[], current: number[]): {
    statistic: number;
    pValue: number;
  } {
    // Simplified chi-square test
    const bins = 10;
    const minVal = Math.min(...historical, ...current);
    const maxVal = Math.max(...historical, ...current);
    const binWidth = (maxVal - minVal) / bins;

    let chiSquare = 0;

    for (let i = 0; i < bins; i++) {
      const binStart = minVal + i * binWidth;
      const binEnd = binStart + binWidth;

      const histCount = historical.filter(v => v >= binStart && v < binEnd).length;
      const currCount = current.filter(v => v >= binStart && v < binEnd).length;
      const expected = (histCount + currCount) / 2;

      if (expected > 0) {
        chiSquare += Math.pow(histCount - expected, 2) / expected;
        chiSquare += Math.pow(currCount - expected, 2) / expected;
      }
    }

    // Simplified p-value (chi-square distribution with bins-1 degrees of freedom)
    const df = bins - 1;
    const pValue = Math.exp(-chiSquare / 2) * Math.pow(chiSquare, df / 2 - 1);

    return { statistic: chiSquare, pValue };
  }

  private klDivergence(historical: number[], current: number[]): number {
    // Simplified KL divergence
    const bins = 10;
    const minVal = Math.min(...historical, ...current);
    const maxVal = Math.max(...historical, ...current);
    const binWidth = (maxVal - minVal) / bins;

    let kl = 0;

    for (let i = 0; i < bins; i++) {
      const binStart = minVal + i * binWidth;
      const binEnd = binStart + binWidth;

      const histProb = historical.filter(v => v >= binStart && v < binEnd).length / historical.length;
      const currProb = current.filter(v => v >= binStart && v < binEnd).length / current.length;

      if (histProb > 0 && currProb > 0) {
        kl += histProb * Math.log(histProb / currProb);
      }
    }

    return kl;
  }

  private determineDriftType(historical: number[], current: number[]): 'concept' | 'data' | 'covariate' {
    // Simplified drift type detection
    const histMean = historical.reduce((a, b) => a + b, 0) / historical.length;
    const currMean = current.reduce((a, b) => a + b, 0) / current.length;
    const meanDiff = Math.abs(histMean - currMean);

    const histVar = this.calculateVariance(historical as any);
    const currVar = this.calculateVariance(current as any);
    const varDiff = Math.abs(histVar - currVar);

    if (meanDiff > 2 * Math.sqrt(histVar)) {
      return 'concept'; // Significant mean shift
    } else if (varDiff > 0.5 * histVar) {
      return 'data'; // Variance change
    } else {
      return 'covariate'; // Distribution shape change
    }
  }

  private generateModelVariationRecommendations(
    stabilityScore: number,
    variance: number,
    outliers: number
  ): string[] {
    const recommendations: string[] = [];

    if (stabilityScore < 0.8) {
      recommendations.push('Model shows low stability across variations. Consider retraining with more diverse data.');
    }

    if (variance > 0.15) {
      recommendations.push('High output variance suggests model parameter sensitivity. Regularization may help.');
    }

    if (outliers > 0) {
      recommendations.push(`Found ${outliers} outlier outputs. Investigate model behavior for edge cases.`);
    }

    if (stabilityScore >= 0.95 && variance < 0.05 && outliers === 0) {
      recommendations.push('Model shows excellent stability across variations.');
    }

    return recommendations;
  }

  private generateInputVariationRecommendations(
    stabilityScore: number,
    variance: number,
    outliers: number
  ): string[] {
    const recommendations: string[] = [];

    if (stabilityScore < 0.7) {
      recommendations.push('Model unstable across input variations. Add input validation and normalization.');
    }

    if (variance > 0.2) {
      recommendations.push('High variance suggests poor generalization. Consider data augmentation.');
    }

    if (outliers > 0) {
      recommendations.push(`Found ${outliers} outlier responses to input variations. Review prompt constraints.`);
    }

    return recommendations;
  }

  private generateTemporalRecommendations(
    stabilityScore: number,
    variance: number,
    outliers: number
  ): string[] {
    const recommendations: string[] = [];

    if (stabilityScore < 0.9) {
      recommendations.push('Temporal drift detected. Implement periodic retraining schedule.');
    }

    if (variance > 0.1) {
      recommendations.push('Output variance increasing over time. Monitor for concept drift.');
    }

    if (outliers > 0) {
      recommendations.push(`Found ${outliers} temporal outliers. Check for external factor influence.`);
    }

    return recommendations;
  }

  private generateDriftRecommendations(
    detected: boolean,
    magnitude: number,
    type: 'concept' | 'data' | 'covariate'
  ): string[] {
    const recommendations: string[] = [];

    if (detected) {
      recommendations.push(`Drift detected (${type}, magnitude: ${magnitude.toFixed(3)})`);

      switch (type) {
        case 'concept':
          recommendations.push('Concept drift: Target relationship has changed. Full retraining recommended.');
          break;
        case 'data':
          recommendations.push('Data drift: Input distribution has changed. Update training data.');
          break;
        case 'covariate':
          recommendations.push('Covariate drift: Feature relationships have changed. Feature engineering may help.');
          break;
      }
    } else {
      recommendations.push('No significant drift detected. Continue monitoring.');
    }

    return recommendations;
  }

  private generateAugmentationData(count: number): unknown[] {
    // Generate synthetic data for augmentation
    const data: unknown[] = [];
    for (let i = 0; i < count; i++) {
      data.push({
        id: `augment_${i}`,
        value: Math.random(),
        timestamp: new Date(),
      });
    }
    return data;
  }
}

// ============================================================================
// STABILITY MONITORING SERVICE
// ============================================================================

/**
 * Service for continuous stability monitoring of SMPbots
 */
export class StabilityMonitoringService {
  private validators: Map<string, ConcreteStabilityValidator<unknown>> = new Map();
  private reports: Map<string, StabilityReport[]> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private options: {
      monitoringInterval?: number; // ms
      maxReportsPerBot?: number;
    } = {}
  ) {}

  /**
   * Start monitoring an SMPbot
   */
  startMonitoring(bot: SMPbot<I, O>, botId: string): void {
    console.log(`Starting stability monitoring for ${botId}`);

    // Create validator for this bot
    const validator = new ConcreteStabilityValidator();
    this.validators.set(botId, validator);

    // Initialize reports storage
    this.reports.set(botId, []);

    // Start periodic monitoring
    const interval = this.options.monitoringInterval ?? 3600000; // Default: 1 hour
    this.monitoringIntervals.set(
      botId,
      setInterval(() => this.runMonitoringCycle(bot, botId), interval)
    );

    // Run initial monitoring
    this.runMonitoringCycle(bot, botId);
  }

  /**
   * Stop monitoring an SMPbot
   */
  stopMonitoring(botId: string): void {
    console.log(`Stopping stability monitoring for ${botId}`);

    const interval = this.monitoringIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(botId);
    }

    this.validators.delete(botId);
    this.reports.delete(botId);
  }

  /**
   * Get stability reports for a bot
   */
  getReports(botId: string): StabilityReport[] {
    return this.reports.get(botId) || [];
  }

  /**
   * Get current stability score for a bot
   */
  getStabilityScore(botId: string): number {
    const reports = this.getReports(botId);
    if (reports.length === 0) return 0;

    const validator = this.validators.get(botId);
    if (!validator) return 0;

    return validator.calculateStabilityScore(reports);
  }

  /**
   * Check if any bot needs stabilization
   */
  checkStabilizationNeeded(threshold: number = 0.7): Array<{botId: string; score: number; plan: StabilizationPlan}> {
    const needsStabilization: Array<{botId: string; score: number; plan: StabilizationPlan}> = [];

    for (const [botId, reports] of this.reports) {
      if (reports.length === 0) continue;

      const validator = this.validators.get(botId);
      if (!validator) continue;

      const latestReport = reports[reports.length - 1];
      const stabilityScore = validator.calculateStabilityScore([latestReport]);

      if (stabilityScore < threshold) {
        const plan = validator.recommendStabilization(latestReport);
        needsStabilization.push({ botId, score: stabilityScore, plan });
      }
    }

    return needsStabilization;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async runMonitoringCycle(bot: SMPbot<I, O>, botId: string): Promise<void> {
    console.log(`Running monitoring cycle for ${botId}`);

    try {
      const validator = this.validators.get(botId);
      if (!validator) return;

      // Run different stability tests
      const modelReport = await validator.testModelVariation(bot, 5);
      const inputReport = await validator.testInputVariation(bot, {
        min: 'test_min',
        max: 'test_max',
        distribution: 'uniform',
      });
      const temporalReport = await validator.testTemporalStability(bot, {
        start: new Date(Date.now() - 3600000), // 1 hour ago
        end: new Date(),
        samplingInterval: 60000, // 1 minute
      });

      // Store reports
      const reports = this.reports.get(botId) || [];
      reports.push(modelReport, inputReport, temporalReport);

      // Limit stored reports
      const maxReports = this.options.maxReportsPerBot ?? 100;
      if (reports.length > maxReports) {
        reports.splice(0, reports.length - maxReports);
      }

      this.reports.set(botId, reports);

      // Log summary
      const overallScore = validator.calculateStabilityScore([modelReport, inputReport, temporalReport]);
      console.log(`Monitoring complete for ${botId}. Overall stability: ${(overallScore * 100).toFixed(1)}%`);

      // Check for immediate action needed
      if (overallScore < 0.6) {
        console.warn(`CRITICAL: ${botId} stability below 60%. Immediate stabilization recommended.`);
      }

    } catch (error) {
      console.error(`Monitoring cycle failed for ${botId}:`, error);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ConcreteStabilityValidator;
/**
 * POLLN Spreadsheet Integration - PredictionCell
 *
 * PredictionCell makes predictions about future outcomes.
 * Uses L2-L3 logic (pattern recognition + LLM support).
 *
 * Design Philosophy:
 * "Predictions are the bridge between past patterns and future possibilities."
 * - Forward-looking analysis
 * - Confidence-weighted forecasts
 * - Multiple prediction models (simple to complex)
 *
 * Prediction Architecture:
 * - Pattern-based prediction (simple trends)
 * - Statistical prediction (regression, etc.)
 * - Machine learning prediction (can use LLM)
 * - Ensemble prediction (multiple models combined)
 *
 * The Prediction Spectrum:
 * L0: Simple extrapolation
 * L1: Pattern-based prediction
 * L2: Statistical models
 * L3: Complex reasoning + LLM
 */

import { LogCell, LogCellConfig } from '../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../core/types.js';

/**
 * Prediction types
 */
export enum PredictionType {
  EXTRAPOLATION = 'extrapolation',     // Simple trend continuation
  PATTERN = 'pattern',               // Pattern-based prediction
  STATISTICAL = 'statistical',       // Statistical models (regression)
  CLASSIFICATION = 'classification', // Classify into categories
  TIME_SERIES = 'time_series',       // Time series forecasting
  PROBABILISTIC = 'probabilistic',   // Probability distributions
  SCENARIO = 'scenario',             // Scenario-based prediction
  ENSEMBLE = 'ensemble',             // Combine multiple models
}

/**
 * Prediction horizon
 */
export enum PredictionHorizon {
  SHORT = 'short',     // Immediate (next value/event)
  MEDIUM = 'medium',   // Near-term (next few values/events)
  LONG = 'long',       // Long-term (future trends)
}

/**
 * Prediction result
 */
export interface PredictionResult {
  type: PredictionType;
  horizon: PredictionHorizon;
  predictions: Array<{
    value: unknown;
    confidence: number;
    probability: number;
    reasoning: string;
  }>;
  model: string;
  accuracy?: number;
  timestamp: number;
}

/**
 * Configuration for PredictionCell
 */
export interface PredictionCellConfig extends LogCellConfig {
  predictionType: PredictionType;
  horizon?: PredictionHorizon;
  historyWindow?: number;  // How many past values to consider
  confidenceThreshold?: number;
}

/**
 * PredictionCell - Makes predictions about future outcomes
 *
 * The Oracle of the Cell System
 * -----------------------------
 * PredictionCell looks forward, anticipating what might happen
 * based on patterns in the data.
 *
 * Key Insight from Research:
 * "The hippocampus replays past experiences to predict future outcomes.
 * PredictionCell does the same - it studies history to forecast the future."
 *
 * Prediction vs Analysis:
 * - Analysis looks at what IS (present/past)
 * - Prediction looks at what COULD BE (future)
 * - Both are knowledge-building, but prediction is forward-looking
 *
 * Confidence-Weighted Predictions:
 * - Not all predictions are equal
 * - Higher confidence = more likely
 * - Lower confidence = explore alternatives
 * - Multiple predictions = hedge bets
 *
 * The Prediction Spectrum:
 * - L0: "The last 3 values went 1, 2, 3, so next is probably 4"
 * - L1: "This pattern (up, up, down) has repeated 3 times"
 * - L2: "Linear regression shows slope of 0.5 with R² = 0.95"
 * - L3: "Based on context, similar patterns in other domains suggest X"
 *
 * Logic Level: L2-L3 (pattern recognition + optional LLM)
 */
export class PredictionCell extends LogCell {
  private predictionType: PredictionType;
  private horizon: PredictionHorizon;
  private historyWindow: number;
  private confidenceThreshold: number;
  private predictionHistory: PredictionResult[] = [];
  private accuracyHistory: number[] = [];

  constructor(config: PredictionCellConfig) {
    super({
      type: CellType.PREDICTION,
      position: config.position,
      logicLevel: LogicLevel.L2_AGENT,
      memoryLimit: config.memoryLimit,
    });

    this.predictionType = config.predictionType;
    this.horizon = config.horizon || PredictionHorizon.MEDIUM;
    this.historyWindow = config.historyWindow || 10;
    this.confidenceThreshold = config.confidenceThreshold || 0.7;
  }

  /**
   * Make predictions based on input data
   */
  async predict(input: unknown): Promise<CellOutput> {
    this.state = CellState.PROCESSING;

    try {
      if (!Array.isArray(input)) {
        throw new Error('Prediction requires array input (historical data)');
      }

      let result: PredictionResult;

      switch (this.predictionType) {
      case PredictionType.EXTRAPOLATION:
        result = this.extrapolate(input);
        break;

      case PredictionType.PATTERN:
        result = this.patternPrediction(input);
        break;

      case PredictionType.STATISTICAL:
        result = this.statisticalPrediction(input);
        break;

      case PredictionType.CLASSIFICATION:
        result = this.classificationPrediction(input);
        break;

      case PredictionType.TIME_SERIES:
        result = this.timeSeriesPrediction(input);
        break;

      case PredictionType.PROBABILISTIC:
        result = this.probabilisticPrediction(input);
        break;

      case PredictionType.SCENARIO:
        result = this.scenarioPrediction(input);
        break;

      case PredictionType.ENSEMBLE:
        result = this.ensemblePrediction(input);
        break;

      default:
        throw new Error(`Unknown prediction type: ${this.predictionType}`);
      }

      this.state = CellState.EMITTING;
      this.predictionHistory.push(result);

      return {
        success: true,
        value: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.state = CellState.ERROR;
      return {
        success: false,
        value: null,
        error: error instanceof Error ? error.message : 'Prediction failed',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Simple extrapolation
   */
  private extrapolate(input: unknown[]): PredictionResult {
    const numbers = this.extractNumbers(input);
    const predictions: PredictionResult['predictions'] = [];

    if (numbers.length < 2) {
      return this.insufficientData();
    }

    // Calculate trend
    const lastTwo = numbers.slice(-2);
    const diff = lastTwo[1] - lastTwo[0];
    const nextValue = lastTwo[1] + diff;

    predictions.push({
      value: nextValue,
      confidence: this.calculateExtrapolationConfidence(numbers),
      probability: 0.7,
      reasoning: `Linear extrapolation from last two values (${lastTwo[0]} → ${lastTwo[1]})`,
    });

    // Add more distant predictions
    if (this.horizon !== PredictionHorizon.SHORT) {
      predictions.push({
        value: nextValue + diff,
        confidence: predictions[0].confidence * 0.8,
        probability: 0.5,
        reasoning: `Two-step extrapolation`,
      });
    }

    return {
      type: PredictionType.EXTRAPOLATION,
      horizon: this.horizon,
      predictions,
      model: 'linear_extrapolation',
      timestamp: Date.now(),
    };
  }

  /**
   * Pattern-based prediction
   */
  private patternPrediction(input: unknown[]): PredictionResult {
    const patterns = this.detectPatterns(input);
    const predictions: PredictionResult['predictions'] = [];

    for (const pattern of patterns) {
      const nextInPattern = this.predictNextInPattern(input, pattern);
      predictions.push({
        value: nextInPattern,
        confidence: pattern.confidence,
        probability: pattern.confidence,
        reasoning: `Pattern "${pattern.description}" suggests next value: ${nextInPattern}`,
      });
    }

    return {
      type: PredictionType.PATTERN,
      horizon: this.horizon,
      predictions: predictions.slice(0, 3),
      model: 'pattern_matching',
      timestamp: Date.now(),
    }
  }

  /**
   * Statistical prediction
   */
  private statisticalPrediction(input: unknown[]): PredictionResult {
    const numbers = this.extractNumbers(input);
    const predictions: PredictionResult['predictions'] = [];

    // Linear regression
    const regression = this.linearRegression(numbers);

    predictions.push({
      value: regression.predictNext(),
      confidence: regression.rSquared,
      probability: regression.rSquared,
      reasoning: `Linear regression (R² = ${regression.rSquared.toFixed(3)})`,
    });

    // Moving average
    const ma = this.movingAverage(numbers);
    predictions.push({
      value: ma,
      confidence: 0.7,
      probability: 0.7,
      reasoning: `Moving average prediction: ${ma.toFixed(2)}`,
    });

    return {
      type: PredictionType.STATISTICAL,
      horizon: this.horizon,
      predictions,
      model: 'linear_regression',
      accuracy: regression.rSquared,
      timestamp: Date.now(),
    }
  }

  /**
   * Classification prediction
   */
  private classificationPrediction(input: unknown[]): PredictionResult {
    const categories = this.classifyInput(input);
    const predictions: PredictionResult['predictions'] = [];

    for (const [category, probability] of categories) {
      predictions.push({
        value: category,
        confidence: probability,
        probability,
        reasoning: `Classification probability: ${(probability * 100).toFixed(1)}%`,
      });
    }

    return {
      type: PredictionType.CLASSIFICATION,
      horizon: this.horizon,
      predictions,
      model: 'frequency_classification',
      timestamp: Date.now(),
    }
  }

  /**
   * Time series prediction
   */
  private timeSeriesPrediction(input: unknown[]): PredictionResult {
    const numbers = this.extractNumbers(input);
    const predictions: PredictionResult['predictions'] = [];

    // Decompose into trend + seasonality
    const { trend, seasonality } = this.decomposeTimeSeries(numbers);

    // Predict next value
    const nextTrend = trend.next;
    const nextSeasonality = seasonality.next;
    const nextValue = nextTrend + nextSeasonality;

    predictions.push({
      value: nextValue,
      confidence: 0.75,
      probability: 0.75,
      reasoning: `Time series decomposition: trend=${nextTrend.toFixed(2)}, seasonality=${nextSeasonality.toFixed(2)}`,
    });

    return {
      type: PredictionType.TIME_SERIES,
      horizon: this.horizon,
      predictions,
      model: 'time_series_decomposition',
      timestamp: Date.now(),
    }
  }

  /**
   * Probabilistic prediction
   */
  private probabilisticPrediction(input: unknown[]): PredictionResult {
    const numbers = this.extractNumbers(input);
    const distribution = this.estimateDistribution(numbers);
    const predictions: PredictionResult['predictions'] = [];

    // Generate predictions at different percentiles
    const percentiles = [0.5, 0.75, 0.9];
    for (const p of percentiles) {
      const value = distribution.percentile(p);
      predictions.push({
        value,
        confidence: p,
        probability: p,
        reasoning: `${(p * 100).toFixed(0)}th percentile prediction: ${value.toFixed(2)}`,
      });
    }

    return {
      type: PredictionType.PROBABILISTIC,
      horizon: this.horizon,
      predictions,
      model: 'distribution_estimation',
      timestamp: Date.now(),
    }
  }

  /**
   * Scenario-based prediction
   */
  private scenarioPrediction(input: unknown[]): PredictionResult {
    const scenarios = this.generateScenarios(input);
    const predictions: PredictionResult['predictions'] = [];

    for (const scenario of scenarios) {
      predictions.push({
        value: scenario.outcome,
        confidence: scenario.probability,
        probability: scenario.probability,
        reasoning: `Scenario "${scenario.name}": ${scenario.description}`,
      });
    }

    return {
      type: PredictionType.SCENARIO,
      horizon: this.horizon,
      predictions,
      model: 'scenario_analysis',
      timestamp: Date.now(),
    }
  }

  /**
   * Ensemble prediction (combines multiple models)
   */
  private ensemblePrediction(input: unknown[]): PredictionResult {
    const modelPredictions = [
      this.extrapolate(input),
      this.statisticalPrediction(input),
      this.patternPrediction(input),
    ];

    // Weight predictions by model accuracy
    const weights = [0.3, 0.4, 0.3];
    const combinedPrediction = this.combinePredictions(modelPredictions, weights);

    return {
      type: PredictionType.ENSEMBLE,
      horizon: this.horizon,
      predictions: combinedPrediction.predictions,
      model: 'ensemble_voting',
      accuracy: combinedPrediction.accuracy,
      timestamp: Date.now(),
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private extractNumbers(input: unknown[]): number[] {
    return input
      .map((item) => (typeof item === 'number' ? item : this.extractNumberFromObject(item)))
      .filter((n) => n !== null) as number[];
  }

  private extractNumberFromObject(item: unknown): number | null {
    if (typeof item === 'object' && item !== null) {
      const values = Object.values(item as Record<string, unknown>);
      for (const v of values) {
        if (typeof v === 'number') {
          return v;
        }
      }
    }
    return null;
  }

  private insufficientData(): PredictionResult {
    return {
      type: this.predictionType,
      horizon: this.horizon,
      predictions: [{
        value: null,
        confidence: 0,
        probability: 0,
        reasoning: 'Insufficient data for prediction',
      }],
      model: 'none',
      timestamp: Date.now(),
    }
  }

  private calculateExtrapolationConfidence(numbers: number[]): number {
    // Higher confidence if trend is consistent
    const diffs = [];
    for (let i = 1; i < numbers.length; i++) {
      diffs.push(numbers[i] - numbers[i - 1]);
    }

    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((sum, d) => sum + Math.pow(d - avgDiff, 2), 0) / diffs.length;

    // Lower variance = higher confidence
    return Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / (Math.abs(avgDiff) + 1)));
  }

  private detectPatterns(input: unknown[]): Array<{
    description: string;
    pattern: number[];
    confidence: number;
  }> {
    const numbers = this.extractNumbers(input);
    const patterns: Array<{ description: string; pattern: number[]; confidence: number }> = [];

    // Detect repeating sequences
    for (let len = 2; len <= Math.floor(numbers.length / 2); len++) {
      const sequence = numbers.slice(-len);
      let matches = 0;

      for (let i = 0; i <= numbers.length - len * 2; i++) {
        const candidate = numbers.slice(i, i + len);
        if (JSON.stringify(candidate) === JSON.stringify(sequence)) {
          matches++;
        }
      }

      if (matches >= 2) {
        patterns.push({
          description: `Repeating sequence of length ${len}`,
          pattern: sequence,
          confidence: Math.min(0.9, 0.5 + matches * 0.1),
        });
      }
    }

    return patterns;
  }

  private predictNextInPattern(input: unknown[], pattern: {
    description: string;
    pattern: number[];
    confidence: number;
  }): number {
    const numbers = this.extractNumbers(input);
    // Simple: predict the pattern continues
    const lastPatternIndex = numbers.length % pattern.pattern.length;
    return pattern.pattern[lastPatternIndex];
  }

  private linearRegression(numbers: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
    predictNext: () => number;
  } {
    const n = numbers.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = numbers.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, i) => sum + i * numbers[i], 0);
    const sumX2 = indices.reduce((sum, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    const ssTotal = numbers.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = numbers.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = 1 - ssResidual / ssTotal;

    return {
      slope,
      intercept,
      rSquared: Math.max(0, rSquared),
      predictNext: () => slope * n + intercept,
    }
  }

  private movingAverage(numbers: number[], window = 3): number {
    const recent = numbers.slice(-window);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  private classifyInput(input: unknown[]): Map<string, number> {
    const categories = new Map<string, number>();

    // Simple frequency-based classification
    for (const item of input) {
      const key = this.getCategory(item);
      categories.set(key, (categories.get(key) || 0) + 1);
    }

    // Normalize to probabilities
    const total = input.length;
    for (const [key, count] of categories) {
      categories.set(key, count / total);
    }

    return categories;
  }

  private getCategory(item: unknown): string {
    if (typeof item === 'number') {
      if (item < 0) return 'negative';
      if (item === 0) return 'zero';
      if (item < 10) return 'small';
      if (item < 100) return 'medium';
      return 'large';
    }
    if (typeof item === 'string') {
      return item.length < 5 ? 'short_text' : 'long_text';
    }
    return 'other';
  }

  private decomposeTimeSeries(numbers: number[]): {
    trend: { next: number };
    seasonality: { next: number };
  } {
    // Simplified decomposition
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const trendSlope = (numbers[numbers.length - 1] - numbers[0]) / numbers.length;

    return {
      trend: { next: mean + trendSlope * (numbers.length + 1) },
      seasonality: { next: 0 }, // Simplified - no seasonality
    }
  }

  private estimateDistribution(numbers: number[]): {
    mean: number;
    stdDev: number;
    percentile: (p: number) => number;
  } {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);
    const sorted = [...numbers].sort((a, b) => a - b);

    return {
      mean,
      stdDev,
      percentile: (p: number) => sorted[Math.floor(p * sorted.length)],
    }
  }

  private generateScenarios(input: unknown[]): Array<{
    name: string;
    description: string;
    outcome: unknown;
    probability: number;
  }> {
    const numbers = this.extractNumbers(input);
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const stdDev = Math.sqrt(
      numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length
    );

    return [
      {
        name: 'Optimistic',
        description: 'Trend continues positively',
        outcome: mean + stdDev,
        probability: 0.25,
      },
      {
        name: 'Baseline',
        description: 'Continues at current average',
        outcome: mean,
        probability: 0.5,
      },
      {
        name: 'Pessimistic',
        description: 'Trend reverses',
        outcome: mean - stdDev,
        probability: 0.25,
      },
    ];
  }

  private combinePredictions(
    predictions: PredictionResult[],
    weights: number[]
  ): { predictions: PredictionResult['predictions']; accuracy: number } {
    // Weighted average of predictions
    const combined: PredictionResult['predictions'] = [];

    // Take the top prediction from each model
    predictions.forEach((pred, idx) => {
      if (pred.predictions.length > 0) {
        const top = pred.predictions[0];
        combined.push({
          value: top.value,
          confidence: top.confidence * weights[idx],
          probability: top.probability * weights[idx],
          reasoning: `[${pred.model}] ${top.reasoning}`,
        });
      }
    });

    // Sort by confidence
    combined.sort((a, b) => b.confidence - a.confidence);

    const accuracy = combined.length > 0
      ? combined.reduce((sum, p) => sum + p.confidence, 0) / combined.length
      : 0;

    return { predictions: combined.slice(0, 3), accuracy };
  }

  /**
   * Track prediction accuracy (call when actual value is known)
   */
  trackAccuracy(predicted: number, actual: number): void {
    const error = Math.abs(predicted - actual) / Math.abs(actual);
    const accuracy = Math.max(0, 1 - error);
    this.accuracyHistory.push(accuracy);
  }

  /**
   * Get average prediction accuracy
   */
  getAverageAccuracy(): number {
    if (this.accuracyHistory.length === 0) return 0;
    return this.accuracyHistory.reduce((a, b) => a + b, 0) / this.accuracyHistory.length;
  }

  /**
   * Get prediction history
   */
  getPredictionHistory(): PredictionResult[] {
    return [...this.predictionHistory];
  }

  /**
   * Create the processing logic for this cell
   */
  protected createProcessingLogic(): any {
    return {
      type: 'prediction',
      predictionType: this.predictionType,
      logic: this.logicLevel,
    };
  }
}

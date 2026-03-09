/**
 * TrendAnalyzer - Time series trend analysis for cell data
 *
 * Detects and analyzes trends using:
 * - Linear regression
 * - Moving averages
 * - Auto-correlation
 * - Momentum indicators
 */

/**
 * Trend analysis result
 */
export interface TrendResult {
  detected: boolean;
  direction: 'trend_up' | 'trend_down' | 'trend_flat' | null;
  confidence: number;
  slope: number;
  correlation: number;
  description: string;
  metadata?: {
    startDate?: Date;
    endDate?: Date;
    percentChange?: number;
    volatility?: number;
  };
}

/**
 * Trend detection methods
 */
export enum TrendMethod {
  LINEAR_REGRESSION = 'linear_regression',
  MOVING_AVERAGE = 'moving_average',
  MOMENTUM = 'momentum'
}

/**
 * Analysis options
 */
export interface TrendAnalysisOptions {
  method?: TrendMethod;
  windowSize?: number;
  minConfidence?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: TrendAnalysisOptions = {
  method: TrendMethod.LINEAR_REGRESSION,
  windowSize: 5,
  minConfidence: 0.5
};

/**
 * TrendAnalyzer class
 */
export class TrendAnalyzer {
  private options: TrendAnalysisOptions;

  constructor(options: TrendAnalysisOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Analyze trend in a sequence of values
   */
  analyze(values: number[]): TrendResult {
    if (values.length < 3) {
      return {
        detected: false,
        direction: null,
        confidence: 0,
        slope: 0,
        correlation: 0,
        description: 'Insufficient data for trend analysis'
      };
    }

    switch (this.options.method) {
      case TrendMethod.LINEAR_REGRESSION:
        return this.analyzeLinearRegression(values);
      case TrendMethod.MOVING_AVERAGE:
        return this.analyzeMovingAverage(values);
      case TrendMethod.MOMENTUM:
        return this.analyzeMomentum(values);
      default:
        return this.analyzeLinearRegression(values);
    }
  }

  /**
   * Linear regression based trend analysis
   */
  private analyzeLinearRegression(values: number[]): TrendResult {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    // Calculate linear regression: y = mx + b
    const { slope, intercept, correlation } = this.calculateLinearRegression(x, y);

    // Determine trend direction
    let direction: 'trend_up' | 'trend_down' | 'trend_flat';
    const slopeThreshold = 0.01; // Minimum slope to consider it a trend

    if (Math.abs(slope) < slopeThreshold) {
      direction = 'trend_flat';
    } else if (slope > 0) {
      direction = 'trend_up';
    } else {
      direction = 'trend_down';
    }

    // Calculate confidence based on correlation coefficient
    const confidence = Math.abs(correlation);

    // Calculate percent change
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const percentChange = firstValue !== 0
      ? ((lastValue - firstValue) / firstValue) * 100
      : 0;

    // Calculate volatility (standard deviation of returns)
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        returns.push((values[i] - values[i - 1]) / values[i - 1]);
      }
    }
    const volatility = returns.length > 0 ? this.calculateStdDev(returns) : 0;

    // Generate description
    const detected = confidence >= this.options.minConfidence!;
    const description = detected
      ? `${direction.replace('_', ' ')} trend (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%) with ${(confidence * 100).toFixed(1)}% confidence`
      : 'No significant trend detected';

    return {
      detected,
      direction,
      confidence,
      slope,
      correlation,
      description,
      metadata: {
        percentChange,
        volatility
      }
    };
  }

  /**
   * Moving average based trend analysis
   */
  private analyzeMovingAverage(values: number[]): TrendResult {
    const windowSize = Math.min(this.options.windowSize!, values.length);
    if (values.length < windowSize * 2) {
      return {
        detected: false,
        direction: null,
        confidence: 0,
        slope: 0,
        correlation: 0,
        description: 'Insufficient data for moving average analysis'
      };
    }

    // Calculate moving averages
    const ma = this.calculateMovingAverage(values, windowSize);

    // Count direction changes
    let upCount = 0;
    let downCount = 0;
    let flatCount = 0;

    for (let i = 1; i < ma.length; i++) {
      const diff = ma[i] - ma[i - 1];
      if (diff > 0.001) upCount++;
      else if (diff < -0.001) downCount++;
      else flatCount++;
    }

    // Determine trend
    let direction: 'trend_up' | 'trend_down' | 'trend_flat';
    const total = upCount + downCount + flatCount;

    if (upCount > downCount * 1.5) {
      direction = 'trend_up';
    } else if (downCount > upCount * 1.5) {
      direction = 'trend_down';
    } else {
      direction = 'trend_flat';
    }

    // Calculate confidence
    const confidence = Math.max(upCount, downCount, flatCount) / total;

    // Calculate slope using first and last MA values
    const slope = (ma[ma.length - 1] - ma[0]) / ma.length;

    // Estimate correlation (R² approximation)
    const correlation = confidence * (direction === 'trend_flat' ? -0.5 : 1);

    const detected = confidence >= this.options.minConfidence!;
    const description = detected
      ? `${direction.replace('_', ' ')} trend (moving average) with ${(confidence * 100).toFixed(1)}% confidence`
      : 'No significant trend detected';

    return {
      detected,
      direction,
      confidence,
      slope,
      correlation,
      description
    };
  }

  /**
   * Momentum based trend analysis
   */
  private analyzeMomentum(values: number[]): TrendResult {
    const windowSize = Math.min(this.options.windowSize!, values.length);
    if (values.length < windowSize + 1) {
      return {
        detected: false,
        direction: null,
        confidence: 0,
        slope: 0,
        correlation: 0,
        description: 'Insufficient data for momentum analysis'
      };
    }

    // Calculate momentum indicators
    const momentums: number[] = [];
    for (let i = windowSize; i < values.length; i++) {
      const momentum = values[i] - values[i - windowSize];
      momentums.push(momentum);
    }

    // Calculate average momentum
    const avgMomentum = this.calculateMean(momentums);

    // Determine trend direction
    let direction: 'trend_up' | 'trend_down' | 'trend_flat';
    const momentumThreshold = this.calculateStdDev(momentums) * 0.5;

    if (avgMomentum > momentumThreshold) {
      direction = 'trend_up';
    } else if (avgMomentum < -momentumThreshold) {
      direction = 'trend_down';
    } else {
      direction = 'trend_flat';
    }

    // Calculate confidence based on momentum consistency
    const positiveMomentums = momentums.filter(m => m > 0).length;
    const momentumRatio = positiveMomentums / momentums.length;
    const confidence = Math.abs(momentumRatio - 0.5) * 2; // 0 when mixed, 1 when consistent

    // Estimate slope
    const slope = avgMomentum / windowSize;

    // Estimate correlation
    const correlation = direction === 'trend_flat' ? -confidence : confidence;

    const detected = confidence >= this.options.minConfidence!;
    const description = detected
      ? `${direction.replace('_', ' ')} momentum trend with ${(confidence * 100).toFixed(1)}% confidence`
      : 'No significant trend detected';

    return {
      detected,
      direction,
      confidence,
      slope,
      correlation,
      description
    };
  }

  /**
   * Calculate linear regression parameters
   */
  private calculateLinearRegression(x: number[], y: number[]): {
    slope: number;
    intercept: number;
    correlation: number;
  } {
    const n = x.length;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    return { slope, intercept, correlation };
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(values: number[], windowSize: number): number[] {
    const ma: number[] = [];

    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      const avg = this.calculateMean(window);
      ma.push(avg);
    }

    return ma;
  }

  /**
   * Calculate mean
   */
  private calculateMean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    const mean = this.calculateMean(values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Detect seasonality in data
   */
  detectSeasonality(values: number[], period?: number): {
    detected: boolean;
    period: number | null;
    confidence: number;
    description: string;
  } {
    if (values.length < 10) {
      return {
        detected: false,
        period: null,
        confidence: 0,
        description: 'Insufficient data for seasonality detection'
      };
    }

    // Auto-detect period if not provided
    const detectedPeriod = period || this.autoDetectPeriod(values);

    if (!detectedPeriod) {
      return {
        detected: false,
        period: null,
        confidence: 0,
        description: 'No significant seasonality detected'
      };
    }

    // Calculate auto-correlation at detected period
    const autocorr = this.calculateAutocorrelation(values, detectedPeriod);

    // Confidence based on auto-correlation strength
    const confidence = Math.abs(autocorr);

    return {
      detected: confidence >= this.options.minConfidence!,
      period: detectedPeriod,
      confidence,
      description: confidence >= this.options.minConfidence!
        ? `Seasonal pattern detected with period ${detectedPeriod} (${(confidence * 100).toFixed(1)}% confidence)`
        : 'No significant seasonality detected'
    };
  }

  /**
   * Auto-detect seasonal period using auto-correlation
   */
  private autoDetectPeriod(values: number[]): number | null {
    const maxPeriod = Math.floor(values.length / 3);
    let bestPeriod = null;
    let bestCorr = 0;

    for (let period = 2; period <= maxPeriod; period++) {
      const corr = this.calculateAutocorrelation(values, period);
      if (Math.abs(corr) > Math.abs(bestCorr)) {
        bestCorr = corr;
        bestPeriod = period;
      }
    }

    return Math.abs(bestCorr) >= this.options.minConfidence! ? bestPeriod : null;
  }

  /**
   * Calculate auto-correlation at a specific lag
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (lag >= values.length) return 0;

    const n = values.length - lag;
    const mean = this.calculateMean(values.slice(0, n));

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Update analysis options
   */
  setOptions(options: Partial<TrendAnalysisOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

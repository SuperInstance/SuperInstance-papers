/**
 * AnomalyDetector - Statistical anomaly detection for cell data
 *
 * Uses multiple methods:
 * - Z-score: Identifies outliers based on standard deviations
 * - IQR: Interquartile range method
 * - Modified Z-Score: For non-normal distributions
 */

/**
 * Anomaly detection result
 */
export interface AnomalyResult {
  index: number;
  value: number;
  isOutlier: boolean;
  confidence: number;
  zScore: number;
  description: string;
}

/**
 * Anomaly detection methods
 */
export enum AnomalyMethod {
  Z_SCORE = 'z_score',
  IQR = 'iqr',
  MODIFIED_Z_SCORE = 'modified_z_score'
}

/**
 * Detection options
 */
export interface AnomalyDetectionOptions {
  method?: AnomalyMethod;
  threshold?: number; // Z-score threshold or IQR multiplier
  windowSize?: number; // For rolling window detection
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: AnomalyDetectionOptions = {
  method: AnomalyMethod.Z_SCORE,
  threshold: 3, // 3 standard deviations
  windowSize: 20
};

/**
 * AnomalyDetector class
 */
export class AnomalyDetector {
  private options: AnomalyDetectionOptions;

  constructor(options: AnomalyDetectionOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Detect anomalies in a sequence of values
   */
  detect(values: number[]): AnomalyResult[] {
    if (values.length < 3) return [];

    switch (this.options.method) {
      case AnomalyMethod.Z_SCORE:
        return this.detectZScore(values);
      case AnomalyMethod.IQR:
        return this.detectIQR(values);
      case AnomalyMethod.MODIFIED_Z_SCORE:
        return this.detectModifiedZScore(values);
      default:
        return this.detectZScore(values);
    }
  }

  /**
   * Z-score based anomaly detection
   */
  private detectZScore(values: number[]): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStdDev(values, mean);
    const threshold = this.options.threshold!;

    for (let i = 0; i < values.length; i++) {
      const zScore = stdDev === 0 ? 0 : (values[i] - mean) / stdDev;
      const isOutlier = Math.abs(zScore) > threshold;
      const confidence = Math.min(Math.abs(zScore) / threshold, 1);

      if (isOutlier) {
        results.push({
          index: i,
          value: values[i],
          isOutlier,
          confidence,
          zScore,
          description: this.formatDescription('Z-score', i, values[i], zScore)
        });
      }
    }

    return results;
  }

  /**
   * IQR (Interquartile Range) based anomaly detection
   */
  private detectIQR(values: number[]): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.calculateQuartile(sorted, 0.25);
    const q3 = this.calculateQuartile(sorted, 0.75);
    const iqr = q3 - q1;
    const multiplier = this.options.threshold!;
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    for (let i = 0; i < values.length; i++) {
      const isOutlier = values[i] < lowerBound || values[i] > upperBound;
      const zScore = (values[i] - (q1 + q3) / 2) / (iqr || 1);
      const confidence = isOutlier ? 1 : 0;

      if (isOutlier) {
        results.push({
          index: i,
          value: values[i],
          isOutlier,
          confidence,
          zScore,
          description: this.formatDescription('IQR', i, values[i], zScore)
        });
      }
    }

    return results;
  }

  /**
   * Modified Z-score based anomaly detection
   * Uses median and MAD (Median Absolute Deviation) instead of mean/std
   * More robust for non-normal distributions
   */
  private detectModifiedZScore(values: number[]): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const median = this.calculateMedian(values);
    const mad = this.calculateMAD(values, median);
    const threshold = this.options.threshold!;

    for (let i = 0; i < values.length; i++) {
      const modifiedZScore = mad === 0 ? 0 : (0.6745 * (values[i] - median)) / mad;
      const isOutlier = Math.abs(modifiedZScore) > threshold;
      const confidence = Math.min(Math.abs(modifiedZScore) / threshold, 1);

      if (isOutlier) {
        results.push({
          index: i,
          value: values[i],
          isOutlier,
          confidence,
          zScore: modifiedZScore,
          description: this.formatDescription('Modified Z-score', i, values[i], modifiedZScore)
        });
      }
    }

    return results;
  }

  /**
   * Calculate mean of values
   */
  private calculateMean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate median of values
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate quartile
   */
  private calculateQuartile(sorted: number[], percentile: number): number {
    const index = (sorted.length - 1) * percentile;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate Median Absolute Deviation (MAD)
   */
  private calculateMAD(values: number[], median: number): number {
    const deviations = values.map(v => Math.abs(v - median));
    return this.calculateMedian(deviations);
  }

  /**
   * Format anomaly description
   */
  private formatDescription(method: string, index: number, value: number, score: number): string {
    const sign = score > 0 ? 'high' : 'low';
    return `${method} anomaly at index ${index}: ${sign} value ${value.toFixed(2)} (score: ${score.toFixed(2)})`;
  }

  /**
   * Detect anomalies using rolling window
   */
  detectRolling(values: number[]): AnomalyResult[] {
    const results: AnomalyResult[] = [];
    const windowSize = Math.min(this.options.windowSize!, values.length);

    for (let i = windowSize; i < values.length; i++) {
      const window = values.slice(i - windowSize, i);
      const currentValue = values[i];

      const mean = this.calculateMean(window);
      const stdDev = this.calculateStdDev(window, mean);
      const zScore = stdDev === 0 ? 0 : (currentValue - mean) / stdDev;

      if (Math.abs(zScore) > this.options.threshold!) {
        results.push({
          index: i,
          value: currentValue,
          isOutlier: true,
          confidence: Math.min(Math.abs(zScore) / this.options.threshold!, 1),
          zScore,
          description: `Rolling window anomaly at index ${i}: ${currentValue.toFixed(2)} (z-score: ${zScore.toFixed(2)})`
        });
      }
    }

    return results;
  }

  /**
   * Update detection options
   */
  setOptions(options: Partial<AnomalyDetectionOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

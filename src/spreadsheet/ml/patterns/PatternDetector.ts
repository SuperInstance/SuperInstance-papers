/**
 * PatternDetector - Core pattern detection system for living cells
 *
 * Detects common patterns in cell data using lightweight statistical methods.
 * No heavy ML libraries - pure TypeScript implementations.
 */

import { AnomalyDetector } from './AnomalyDetector';
import { TrendAnalyzer } from './TrendAnalyzer';
import { PatternLibrary } from './PatternLibrary';

/**
 * Detected pattern with metadata
 */
export interface DetectedPattern {
  type: PatternType;
  confidence: number; // 0-1
  description: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Pattern types that can be detected
 */
export enum PatternType {
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  LOGARITHMIC = 'logarithmic',
  SEASONAL = 'seasonal',
  CYCLIC = 'cyclic',
  ANOMALY = 'anomaly',
  OUTLIER = 'outlier',
  CORRELATION = 'correlation',
  TREND_UP = 'trend_up',
  TREND_DOWN = 'trend_down',
  TREND_FLAT = 'trend_flat',
  SPIKE = 'spike',
  DROP = 'drop',
  PLATEAU = 'plateau',
  UNKNOWN = 'unknown'
}

/**
 * Pattern detection options
 */
export interface PatternDetectionOptions {
  minDataPoints?: number;
  confidenceThreshold?: number;
  lookbackWindow?: number;
  detectAnomalies?: boolean;
  detectTrends?: boolean;
  detectSeasonality?: boolean;
  customPatterns?: string[];
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: PatternDetectionOptions = {
  minDataPoints: 3,
  confidenceThreshold: 0.7,
  lookbackWindow: 20,
  detectAnomalies: true,
  detectTrends: true,
  detectSeasonality: true
};

/**
 * PatternDetector main class
 */
export class PatternDetector {
  private anomalyDetector: AnomalyDetector;
  private trendAnalyzer: TrendAnalyzer;
  private patternLibrary: PatternLibrary;
  private options: PatternDetectionOptions;

  constructor(options: PatternDetectionOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.anomalyDetector = new AnomalyDetector();
    this.trendAnalyzer = new TrendAnalyzer();
    this.patternLibrary = new PatternLibrary();
  }

  /**
   * Detect all patterns in a sequence of values
   */
  detectPatterns(values: number[]): DetectedPattern[] {
    if (values.length < this.options.minDataPoints!) {
      return [];
    }

    const patterns: DetectedPattern[] = [];
    const now = new Date();

    // Detect anomalies
    if (this.options.detectAnomalies) {
      const anomalies = this.anomalyDetector.detect(values);
      patterns.push(...anomalies.map(a => ({
        type: a.isOutlier ? PatternType.OUTLIER : PatternType.ANOMALY,
        confidence: a.confidence,
        description: a.description,
        metadata: { index: a.index, value: a.value, zScore: a.zScore },
        timestamp: now
      })));
    }

    // Detect trends
    if (this.options.detectTrends) {
      const trend = this.trendAnalyzer.analyze(values);
      if (trend.detected) {
        patterns.push({
          type: trend.direction!,
          confidence: trend.confidence,
          description: trend.description,
          metadata: { slope: trend.slope, correlation: trend.correlation },
          timestamp: now
        });
      }
    }

    // Detect specific patterns
    patterns.push(...this.detectShapes(values));

    // Filter by confidence threshold
    return patterns.filter(
      p => p.confidence >= this.options.confidenceThreshold!
    );
  }

  /**
   * Detect pattern shapes (spikes, drops, plateaus, etc.)
   */
  private detectShapes(values: number[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const now = new Date();

    if (values.length < 3) return patterns;

    // Detect spikes
    const spikes = this.detectSpikes(values);
    patterns.push(...spikes);

    // Detect drops
    const drops = this.detectDrops(values);
    patterns.push(...drops);

    // Detect plateaus
    const plateaus = this.detectPlateaus(values);
    patterns.push(...plateaus);

    return patterns;
  }

  /**
   * Detect sudden spikes in data
   */
  private detectSpikes(values: number[]): DetectedPattern[] {
    const spikes: DetectedPattern[] = [];
    const now = new Date();
    const threshold = 2.5; // Standard deviations

    for (let i = 1; i < values.length - 1; i++) {
      const prev = values[i - 1];
      const curr = values[i];
      const next = values[i + 1];

      // Spike if current is much higher than neighbors
      if (curr > prev && curr > next) {
        const localMean = (prev + next) / 2;
        const localStd = Math.abs(curr - localMean);
        const zScore = localStd > 0 ? Math.abs((curr - localMean) / localStd) : 0;

        if (zScore > threshold) {
          spikes.push({
            type: PatternType.SPIKE,
            confidence: Math.min(zScore / threshold, 1),
            description: `Spike detected at index ${i}: ${curr.toFixed(2)}`,
            metadata: { index: i, value: curr, zScore },
            timestamp: now
          });
        }
      }
    }

    return spikes;
  }

  /**
   * Detect sudden drops in data
   */
  private detectDrops(values: number[]): DetectedPattern[] {
    const drops: DetectedPattern[] = [];
    const now = new Date();
    const threshold = 2.5; // Standard deviations

    for (let i = 1; i < values.length - 1; i++) {
      const prev = values[i - 1];
      const curr = values[i];
      const next = values[i + 1];

      // Drop if current is much lower than neighbors
      if (curr < prev && curr < next) {
        const localMean = (prev + next) / 2;
        const localStd = Math.abs(curr - localMean);
        const zScore = localStd > 0 ? Math.abs((curr - localMean) / localStd) : 0;

        if (zScore > threshold) {
          drops.push({
            type: PatternType.DROP,
            confidence: Math.min(zScore / threshold, 1),
            description: `Drop detected at index ${i}: ${curr.toFixed(2)}`,
            metadata: { index: i, value: curr, zScore },
            timestamp: now
          });
        }
      }
    }

    return drops;
  }

  /**
   * Detect plateaus (flat regions)
   */
  private detectPlateaus(values: number[]): DetectedPattern[] {
    const plateaus: DetectedPattern[] = [];
    const now = new Date();
    const threshold = 0.05; // 5% variance allowed

    let plateauStart = 0;
    let plateauSum = values[0];
    let plateauCount = 1;

    for (let i = 1; i < values.length; i++) {
      const mean = plateauSum / plateauCount;
      const diff = Math.abs(values[i] - mean) / (mean || 1);

      if (diff < threshold) {
        // Continue plateau
        plateauSum += values[i];
        plateauCount++;
      } else {
        // End plateau
        if (plateauCount >= 3) {
          const plateauMean = plateauSum / plateauCount;
          const variance = this.calculateVariance(
            values.slice(plateauStart, i),
            plateauMean
          );

          plateaus.push({
            type: PatternType.PLATEAU,
            confidence: 1 - variance,
            description: `Plateau from index ${plateauStart} to ${i - 1}: ${plateauMean.toFixed(2)}`,
            metadata: {
              startIndex: plateauStart,
              endIndex: i - 1,
              mean: plateauMean,
              variance
            },
            timestamp: now
          });
        }

        // Start new plateau
        plateauStart = i;
        plateauSum = values[i];
        plateauCount = 1;
      }
    }

    return plateaus;
  }

  /**
   * Calculate variance of values from mean
   */
  private calculateVariance(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const sumSquaredDiff = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
    return sumSquaredDiff / values.length;
  }

  /**
   * Detect correlation between two sequences
   */
  detectCorrelation(values1: number[], values2: number[]): DetectedPattern | null {
    const minLength = Math.min(values1.length, values2.length);
    if (minLength < 3) return null;

    const v1 = values1.slice(0, minLength);
    const v2 = values2.slice(0, minLength);

    const correlation = this.calculateCorrelation(v1, v2);
    const confidence = Math.abs(correlation);

    if (confidence >= this.options.confidenceThreshold!) {
      return {
        type: PatternType.CORRELATION,
        confidence,
        description: `${correlation > 0 ? 'Positive' : 'Negative'} correlation: ${(correlation * 100).toFixed(1)}%`,
        metadata: { correlation, sequence1: v1, sequence2: v2 },
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Get pattern library
   */
  getLibrary(): PatternLibrary {
    return this.patternLibrary;
  }

  /**
   * Update detection options
   */
  setOptions(options: Partial<PatternDetectionOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

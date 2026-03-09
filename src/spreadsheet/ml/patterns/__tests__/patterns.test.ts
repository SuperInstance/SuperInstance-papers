/**
 * Pattern recognition tests
 *
 * Tests for pattern detection, anomaly detection, trend analysis,
 * and pattern cell functionality using synthetic data.
 */

import { describe, it, expect } from '@jest/globals';
import {
  PatternDetector,
  PatternType,
  AnomalyDetector,
  AnomalyMethod,
  TrendAnalyzer,
  TrendMethod,
  PatternLibrary,
  PatternCategory,
  PatternCell,
  PatternAlert,
  createPatternCell
} from '../index';

/**
 * Synthetic data generators
 */
const SyntheticData = {
  // Linear growth
  linearGrowth: (n: number, slope: number = 1, intercept: number = 0): number[] => {
    return Array.from({ length: n }, (_, i) => intercept + slope * i);
  },

  // Exponential growth
  exponentialGrowth: (n: number, base: number = 2): number[] => {
    return Array.from({ length: n }, (_, i) => Math.pow(base, i));
  },

  // Sine wave
  sineWave: (n: number, period: number = 10): number[] => {
    return Array.from({ length: n }, (_, i) =>
      Math.sin((2 * Math.PI * i) / period)
    );
  },

  // Random walk
  randomWalk: (n: number, start: number = 0): number[] => {
    const values = [start];
    for (let i = 1; i < n; i++) {
      values.push(values[i - 1] + (Math.random() - 0.5) * 2);
    }
    return values;
  },

  // With outliers
  withOutliers: (values: number[], outlierIndices: number[], outlierMagnitude: number = 5): number[] => {
    const result = [...values];
    for (const index of outlierIndices) {
      if (index < result.length) {
        result[index] = result[index] + outlierMagnitude * (Math.random() > 0.5 ? 1 : -1);
      }
    }
    return result;
  },

  // Step function
  stepFunction: (n: number, stepIndex: number, before: number, after: number): number[] => {
    return Array.from({ length: n }, (_, i) =>
      i < stepIndex ? before : after
    );
  },

  // Seasonal data
  seasonal: (n: number, period: number = 7, amplitude: number = 10): number[] => {
    return Array.from({ length: n }, (_, i) =>
      amplitude * Math.sin((2 * Math.PI * i) / period) + (i * 0.5)
    );
  }
};

describe('PatternDetector', () => {
  describe('Pattern Detection', () => {
    it('should detect linear growth', () => {
      const detector = new PatternDetector();
      const values = SyntheticData.linearGrowth(20, 2);
      const patterns = detector.detectPatterns(values);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.type === PatternType.TREND_UP)).toBe(true);
    });

    it('should detect linear decay', () => {
      const detector = new PatternDetector();
      const values = SyntheticData.linearGrowth(20, -2, 100);
      const patterns = detector.detectPatterns(values);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.type === PatternType.TREND_DOWN)).toBe(true);
    });

    it('should detect outliers', () => {
      const detector = new PatternDetector();
      const baseValues = SyntheticData.linearGrowth(20, 1);
      const values = SyntheticData.withOutliers(baseValues, [5, 10, 15], 10);
      const patterns = detector.detectPatterns(values);

      const outliers = patterns.filter(p => p.type === PatternType.OUTLIER);
      expect(outliers.length).toBeGreaterThan(0);
    });

    it('should detect spikes', () => {
      const detector = new PatternDetector();
      const values = [1, 1, 1, 10, 1, 1, 1];
      const patterns = detector.detectPatterns(values);

      expect(patterns.some(p => p.type === PatternType.SPIKE)).toBe(true);
    });

    it('should detect drops', () => {
      const detector = new PatternDetector();
      const values = [10, 10, 10, 1, 10, 10, 10];
      const patterns = detector.detectPatterns(values);

      expect(patterns.some(p => p.type === PatternType.DROP)).toBe(true);
    });

    it('should detect plateaus', () => {
      const detector = new PatternDetector();
      const values = [5, 5, 5, 5, 5, 5, 5];
      const patterns = detector.detectPatterns(values);

      expect(patterns.some(p => p.type === PatternType.PLATEAU)).toBe(true);
    });

    it('should detect correlation between sequences', () => {
      const detector = new PatternDetector();
      const values1 = SyntheticData.linearGrowth(20, 2);
      const values2 = SyntheticData.linearGrowth(20, 2); // Perfectly correlated
      const correlation = detector.detectCorrelation(values1, values2);

      expect(correlation).not.toBeNull();
      expect(correlation!.confidence).toBeGreaterThan(0.9);
      expect(correlation!.type).toBe(PatternType.CORRELATION);
    });

    it('should require minimum data points', () => {
      const detector = new PatternDetector({ minDataPoints: 10 });
      const values = SyntheticData.linearGrowth(5);
      const patterns = detector.detectPatterns(values);

      expect(patterns.length).toBe(0);
    });

    it('should filter by confidence threshold', () => {
      const detector = new PatternDetector({ confidenceThreshold: 0.9 });
      const values = SyntheticData.linearGrowth(20, 0.5); // Weak trend
      const patterns = detector.detectPatterns(values);

      // All patterns should meet confidence threshold
      for (const pattern of patterns) {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });
  });

  describe('Pattern Metadata', () => {
    it('should include pattern metadata', () => {
      const detector = new PatternDetector();
      const values = SyntheticData.linearGrowth(20);
      const patterns = detector.detectPatterns(values);

      for (const pattern of patterns) {
        expect(pattern).toHaveProperty('type');
        expect(pattern).toHaveProperty('confidence');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('metadata');
        expect(pattern).toHaveProperty('timestamp');
      }
    });

    it('should include slope in trend metadata', () => {
      const detector = new PatternDetector();
      const values = SyntheticData.linearGrowth(20, 2);
      const patterns = detector.detectPatterns(values);
      const trendPattern = patterns.find(p => p.type === PatternType.TREND_UP);

      expect(trendPattern).toBeDefined();
      expect(trendPattern!.metadata).toHaveProperty('slope');
    });
  });
});

describe('AnomalyDetector', () => {
  describe('Z-Score Method', () => {
    it('should detect outliers using z-score', () => {
      const detector = new AnomalyDetector({ method: AnomalyMethod.Z_SCORE, threshold: 3 });
      const values = SyntheticData.withOutliers(SyntheticData.linearGrowth(20), [10], 10);
      const anomalies = detector.detect(values);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].isOutlier).toBe(true);
    });

    it('should handle normal distribution', () => {
      const detector = new AnomalyDetector({ method: AnomalyMethod.Z_SCORE });
      const values = Array.from({ length: 100 }, () =>
        (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) * 2
      );
      const anomalies = detector.detect(values);

      // Should find very few outliers in normal distribution
      expect(anomalies.length).toBeLessThan(5);
    });
  });

  describe('IQR Method', () => {
    it('should detect outliers using IQR', () => {
      const detector = new AnomalyDetector({ method: AnomalyMethod.IQR, threshold: 1.5 });
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]; // 100 is outlier
      const anomalies = detector.detect(values);

      expect(anomalies.length).toBeGreaterThan(0);
    });

    it('should be robust to non-normal distributions', () => {
      const detector = new AnomalyDetector({ method: AnomalyMethod.IQR });
      const values = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100, 100, 100, 100, 100];
      const anomalies = detector.detect(values);

      // Should detect both 1 and 100 as outliers relative to each other
      expect(anomalies.length).toBeGreaterThan(0);
    });
  });

  describe('Modified Z-Score Method', () => {
    it('should detect outliers using modified z-score', () => {
      const detector = new AnomalyDetector({ method: AnomalyMethod.MODIFIED_Z_SCORE, threshold: 3.5 });
      const values = SyntheticData.withOutliers(SyntheticData.linearGrowth(20), [10], 10);
      const anomalies = detector.detect(values);

      expect(anomalies.length).toBeGreaterThan(0);
    });

    it('should use median instead of mean', () => {
      const detector = new AnomalyDetector({ method: AnomalyMethod.MODIFIED_Z_SCORE });
      const values = [1, 2, 3, 4, 5, 100]; // 100 is extreme outlier
      const anomalies = detector.detect(values);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].isOutlier).toBe(true);
    });
  });

  describe('Rolling Window Detection', () => {
    it('should detect anomalies in rolling window', () => {
      const detector = new AnomalyDetector({ windowSize: 5 });
      const base = SyntheticData.linearGrowth(20);
      base[15] = base[14] + 20; // Sudden spike
      const anomalies = detector.detectRolling(base);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].index).toBe(15);
    });
  });

  describe('Anomaly Metadata', () => {
    it('should include anomaly metadata', () => {
      const detector = new AnomalyDetector();
      const values = SyntheticData.withOutliers(SyntheticData.linearGrowth(20), [10], 10);
      const anomalies = detector.detect(values);

      for (const anomaly of anomalies) {
        expect(anomaly).toHaveProperty('index');
        expect(anomaly).toHaveProperty('value');
        expect(anomaly).toHaveProperty('isOutlier');
        expect(anomaly).toHaveProperty('confidence');
        expect(anomaly).toHaveProperty('zScore');
        expect(anomaly).toHaveProperty('description');
      }
    });
  });
});

describe('TrendAnalyzer', () => {
  describe('Linear Regression Method', () => {
    it('should detect upward trend', () => {
      const analyzer = new TrendAnalyzer({ method: TrendMethod.LINEAR_REGRESSION });
      const values = SyntheticData.linearGrowth(20, 2);
      const result = analyzer.analyze(values);

      expect(result.detected).toBe(true);
      expect(result.direction).toBe('trend_up');
      expect(result.slope).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect downward trend', () => {
      const analyzer = new TrendAnalyzer({ method: TrendMethod.LINEAR_REGRESSION });
      const values = SyntheticData.linearGrowth(20, -2, 100);
      const result = analyzer.analyze(values);

      expect(result.detected).toBe(true);
      expect(result.direction).toBe('trend_down');
      expect(result.slope).toBeLessThan(0);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect flat trend', () => {
      const analyzer = new TrendAnalyzer({ method: TrendMethod.LINEAR_REGRESSION });
      const values = Array.from({ length: 20 }, () => 5 + Math.random() * 0.1);
      const result = analyzer.analyze(values);

      expect(result.detected).toBe(true);
      expect(result.direction).toBe('trend_flat');
      expect(Math.abs(result.slope)).toBeLessThan(0.1);
    });

    it('should calculate correlation coefficient', () => {
      const analyzer = new TrendAnalyzer();
      const values = SyntheticData.linearGrowth(20, 2);
      const result = analyzer.analyze(values);

      expect(result.correlation).toBeCloseTo(1, 1);
    });
  });

  describe('Moving Average Method', () => {
    it('should detect trend using moving average', () => {
      const analyzer = new TrendAnalyzer({
        method: TrendMethod.MOVING_AVERAGE,
        windowSize: 5
      });
      const values = SyntheticData.linearGrowth(20, 2);
      const result = analyzer.analyze(values);

      expect(result.detected).toBe(true);
      expect(result.direction).toBe('trend_up');
    });
  });

  describe('Momentum Method', () => {
    it('should detect momentum trend', () => {
      const analyzer = new TrendAnalyzer({
        method: TrendMethod.MOMENTUM,
        windowSize: 5
      });
      const values = SyntheticData.linearGrowth(20, 2);
      const result = analyzer.analyze(values);

      expect(result.detected).toBe(true);
      expect(result.direction).toBe('trend_up');
    });
  });

  describe('Seasonality Detection', () => {
    it('should detect seasonal patterns', () => {
      const analyzer = new TrendAnalyzer();
      const values = SyntheticData.seasonal(50, 7);
      const seasonality = analyzer.detectSeasonality(values, 7);

      expect(seasonality.detected).toBe(true);
      expect(seasonality.period).toBe(7);
      expect(seasonality.confidence).toBeGreaterThan(0.5);
    });

    it('should auto-detect period', () => {
      const analyzer = new TrendAnalyzer();
      const values = SyntheticData.sineWave(50, 10);
      const seasonality = analyzer.detectSeasonality(values);

      expect(seasonality.detected).toBe(true);
      expect(seasonality.period).toBeGreaterThan(0);
    });
  });

  describe('Trend Metadata', () => {
    it('should include trend metadata', () => {
      const analyzer = new TrendAnalyzer();
      const values = SyntheticData.linearGrowth(20, 2);
      const result = analyzer.analyze(values);

      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('direction');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('slope');
      expect(result).toHaveProperty('correlation');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('metadata');
    });

    it('should include percent change in metadata', () => {
      const analyzer = new TrendAnalyzer();
      const values = SyntheticData.linearGrowth(20, 2);
      const result = analyzer.analyze(values);

      expect(result.metadata).toHaveProperty('percentChange');
      expect(result.metadata!.percentChange).toBeGreaterThan(0);
    });
  });
});

describe('PatternLibrary', () => {
  describe('Built-in Patterns', () => {
    it('should have all built-in patterns', () => {
      const library = new PatternLibrary();
      const patterns = library.getAllPatterns();

      expect(patterns.length).toBeGreaterThan(10);
    });

    it('should categorize patterns correctly', () => {
      const library = new PatternLibrary();
      const growthPatterns = library.getPatternsByCategory(PatternCategory.GROWTH);
      const decayPatterns = library.getPatternsByCategory(PatternCategory.DECAY);
      const oscillationPatterns = library.getPatternsByCategory(PatternCategory.OSCILLATION);

      expect(growthPatterns.length).toBeGreaterThan(0);
      expect(decayPatterns.length).toBeGreaterThan(0);
      expect(oscillationPatterns.length).toBeGreaterThan(0);
    });

    it('should match linear growth pattern', () => {
      const library = new PatternLibrary();
      const values = SyntheticData.linearGrowth(20, 2);
      const matches = library.matchAll(values);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.pattern.id === 'linear_growth')).toBe(true);
    });

    it('should match sine wave pattern', () => {
      const library = new PatternLibrary();
      const values = SyntheticData.sineWave(20, 10);
      const matches = library.matchAll(values);

      expect(matches.length).toBeGreaterThan(0);
    });

    it('should search by tag', () => {
      const library = new PatternLibrary();
      const trendPatterns = library.searchByTag('trend');

      expect(trendPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Matching', () => {
    it('should return confidence scores', () => {
      const library = new PatternLibrary();
      const values = SyntheticData.linearGrowth(20, 2);
      const matches = library.matchAll(values);

      for (const match of matches) {
        expect(match.confidence).toBeGreaterThanOrEqual(0);
        expect(match.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should sort matches by confidence', () => {
      const library = new PatternLibrary();
      const values = SyntheticData.linearGrowth(20, 2);
      const matches = library.matchAll(values);

      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence);
      }
    });
  });
});

describe('PatternCell', () => {
  describe('Pattern Detection', () => {
    it('should detect patterns in incoming data', async () => {
      const cell = createPatternCell('pattern-1', 'source-1');
      const values = SyntheticData.linearGrowth(20, 2);

      // Feed values to cell
      for (const value of values) {
        await cell.process({
          type: 'absolute',
          from: 'source-1',
          to: 'pattern-1',
          value,
          timestamp: new Date()
        });
      }

      const patterns = cell.getDetectedPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should generate alerts for significant patterns', async () => {
      const cell = createPatternCell('pattern-1', 'source-1', {
        alertThreshold: 0.8
      });
      const values = SyntheticData.withOutliers(
        SyntheticData.linearGrowth(20, 2),
        [10, 15],
        20
      );

      // Feed values to cell
      for (const value of values) {
        await cell.process({
          type: 'absolute',
          from: 'source-1',
          to: 'pattern-1',
          value,
          timestamp: new Date()
        });
      }

      const alerts = cell.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should maintain history', async () => {
      const cell = createPatternCell('pattern-1', 'source-1', {
        historyLength: 50
      });
      const values = SyntheticData.linearGrowth(20, 2);

      // Feed values to cell
      for (const value of values) {
        await cell.process({
          type: 'absolute',
          from: 'source-1',
          to: 'pattern-1',
          value,
          timestamp: new Date()
        });
      }

      const history = cell.getHistory();
      expect(history.length).toBe(20);
    });

    it('should limit history length', async () => {
      const cell = createPatternCell('pattern-1', 'source-1', {
        historyLength: 10
      });
      const values = SyntheticData.linearGrowth(20, 2);

      // Feed values to cell
      for (const value of values) {
        await cell.process({
          type: 'absolute',
          from: 'source-1',
          to: 'pattern-1',
          value,
          timestamp: new Date()
        });
      }

      const history = cell.getHistory();
      expect(history.length).toBe(10);
    });
  });

  describe('Alert Management', () => {
    it('should acknowledge alerts', async () => {
      const cell = createPatternCell('pattern-1', 'source-1');
      const values = SyntheticData.withOutliers(
        SyntheticData.linearGrowth(20, 2),
        [10],
        20
      );

      // Feed values to cell
      for (const value of values) {
        await cell.process({
          type: 'absolute',
          from: 'source-1',
          to: 'pattern-1',
          value,
          timestamp: new Date()
        });
      }

      const alertsBefore = cell.getAlerts();
      expect(alertsBefore.length).toBeGreaterThan(0);

      const alertId = alertsBefore[0].id;
      cell.acknowledgeAlert(alertId);

      const alertsAfter = cell.getAlerts();
      expect(alertsAfter.length).toBe(0); // All acknowledged
    });

    it('should clear all alerts', async () => {
      const cell = createPatternCell('pattern-1', 'source-1');
      const values = SyntheticData.withOutliers(
        SyntheticData.linearGrowth(20, 2),
        [5, 10, 15],
        15
      );

      // Feed values to cell
      for (const value of values) {
        await cell.process({
          type: 'absolute',
          from: 'source-1',
          to: 'pattern-1',
          value,
          timestamp: new Date()
        });
      }

      const alertsBefore = cell.getAlerts();
      expect(alertsBefore.length).toBeGreaterThan(0);

      cell.clearAlerts();

      const alertsAfter = cell.getAlerts();
      expect(alertsAfter.length).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide pattern statistics', async () => {
      const cell = createPatternCell('pattern-1', 'source-1');
      const values = SyntheticData.linearGrowth(20, 2);

      // Feed values to cell
      for (const value of values) {
        await cell.process({
          type: 'absolute',
          from: 'source-1',
          to: 'pattern-1',
          value,
          timestamp: new Date()
        });
      }

      const stats = cell.getStatistics();
      expect(stats).toHaveProperty('totalDetections');
      expect(stats).toHaveProperty('activeAlerts');
      expect(stats).toHaveProperty('patternTypes');
      expect(stats).toHaveProperty('lastDetection');
      expect(stats.totalDetections).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should update detection options', async () => {
      const cell = createPatternCell('pattern-1', 'source-1', {
        detectionOptions: {
          confidenceThreshold: 0.5
        }
      });

      cell.updateOptions({ confidenceThreshold: 0.9 });

      // Should detect fewer patterns with higher threshold
      const values = SyntheticData.linearGrowth(20, 0.5); // Weak trend
      for (const value of values) {
        await cell.process({
          type: 'absolute',
          from: 'source-1',
          to: 'pattern-1',
          value,
          timestamp: new Date()
        });
      }

      const patterns = cell.getDetectedPatterns();
      for (const pattern of patterns) {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });
  });
});

describe('Integration Tests', () => {
  it('should detect complex patterns in noisy data', () => {
    const detector = new PatternDetector();
    const base = SyntheticData.seasonal(50, 7, 5);
    const noise = base.map(v => v + (Math.random() - 0.5) * 2);
    const patterns = detector.detectPatterns(noise);

    expect(patterns.length).toBeGreaterThan(0);
  });

  it('should handle edge cases', () => {
    const detector = new PatternDetector();

    // Empty array
    expect(detector.detectPatterns([])).toEqual([]);

    // Single value
    expect(detector.detectPatterns([5])).toEqual([]);

    // Two values
    expect(detector.detectPatterns([1, 2])).toEqual([]);

    // All same values
    const patterns = detector.detectPatterns([5, 5, 5, 5, 5]);
    expect(patterns.some(p => p.type === PatternType.PLATEAU)).toBe(true);
  });

  it('should detect multiple pattern types simultaneously', () => {
    const detector = new PatternDetector();
    const values = [
      1, 2, 3, 4, 5, // Linear growth
      100, // Spike
      6, 7, 8, 9, 10, // Continue growth
      10, 10, 10, 10, 10 // Plateau
    ];
    const patterns = detector.detectPatterns(values);

    const types = new Set(patterns.map(p => p.type));
    expect(types.size).toBeGreaterThan(1);
  });
});

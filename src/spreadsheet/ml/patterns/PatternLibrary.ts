/**
 * PatternLibrary - Built-in pattern catalog for living cells
 *
 * Contains pre-defined patterns that can be matched against cell data.
 * Patterns are organized by category and include metadata for display.
 */

/**
 * Pattern definition
 */
export interface PatternDefinition {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  examples: number[][];
  matchFunction: (values: number[]) => boolean;
  confidenceFunction: (values: number[]) => number;
  metadata: {
    complexity: 'simple' | 'moderate' | 'complex';
    domain: string[];
    tags: string[];
  };
}

/**
 * Pattern categories
 */
export enum PatternCategory {
  GROWTH = 'growth',
  DECAY = 'decay',
  OSCILLATION = 'oscillation',
  STRUCTURAL = 'structural',
  STATISTICAL = 'statistical',
  TEMPORAL = 'temporal',
  CUSTOM = 'custom'
}

/**
 * PatternLibrary class
 */
export class PatternLibrary {
  private patterns: Map<string, PatternDefinition>;
  private customPatterns: Map<string, PatternDefinition>;

  constructor() {
    this.patterns = new Map();
    this.customPatterns = new Map();
    this.initializeBuiltInPatterns();
  }

  /**
   * Initialize built-in pattern library
   */
  private initializeBuiltInPatterns(): void {
    // Growth patterns
    this.addPattern(this.linearGrowthPattern());
    this.addPattern(this.exponentialGrowthPattern());
    this.addPattern(this.logarithmicGrowthPattern());

    // Decay patterns
    this.addPattern(this.linearDecayPattern());
    this.addPattern(this.exponentialDecayPattern());

    // Oscillation patterns
    this.addPattern(this.sineWavePattern());
    this.addPattern(this.dampedOscillationPattern());

    // Structural patterns
    this.addPattern(this.stepPattern());
    this.addPattern(this.sawtoothPattern());
    this.addPattern(this.staircasePattern());

    // Statistical patterns
    this.addPattern(this.normalDistributionPattern());
    this.addPattern(this.uniformDistributionPattern());

    // Temporal patterns
    this.addPattern(this.burstPattern());
    this.addPattern(this.periodicSpikePattern());
  }

  /**
   * Linear growth pattern
   */
  private linearGrowthPattern(): PatternDefinition {
    return {
      id: 'linear_growth',
      name: 'Linear Growth',
      category: PatternCategory.GROWTH,
      description: 'Constant increase over time (y = mx + b)',
      examples: [
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        [10, 12, 14, 16, 18, 20, 22, 24, 26, 28],
        [0, 5, 10, 15, 20, 25, 30, 35, 40, 45]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 3) return false;

        // Calculate linear regression
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        // Linear growth has positive slope
        return slope > 0.01;
      },
      confidenceFunction: (values: number[]) => {
        const correlation = this.calculateCorrelation(values);
        return Math.max(0, Math.min(1, correlation));
      },
      metadata: {
        complexity: 'simple',
        domain: ['finance', 'sales', 'metrics'],
        tags: ['trend', 'growth', 'linear']
      }
    };
  }

  /**
   * Exponential growth pattern
   */
  private exponentialGrowthPattern(): PatternDefinition {
    return {
      id: 'exponential_growth',
      name: 'Exponential Growth',
      category: PatternCategory.GROWTH,
      description: 'Accelerating growth rate (y = a * e^bx)',
      examples: [
        [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
        [100, 110, 121, 133, 146, 161, 177, 195, 215, 237],
        [1, 1.5, 2.25, 3.38, 5.06, 7.59, 11.39, 17.09, 25.63, 38.45]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 3) return false;

        // Check if logarithmic transformation yields linear relationship
        const logValues = values.map(v => Math.log(v > 0 ? v : 1));
        const correlation = this.calculateCorrelation(logValues);

        return correlation > 0.8;
      },
      confidenceFunction: (values: number[]) => {
        const logValues = values.map(v => Math.log(v > 0 ? v : 1));
        return Math.max(0, Math.min(1, this.calculateCorrelation(logValues)));
      },
      metadata: {
        complexity: 'moderate',
        domain: ['viral', 'compound_interest', 'population'],
        tags: ['trend', 'growth', 'exponential', 'accelerating']
      }
    };
  }

  /**
   * Logarithmic growth pattern
   */
  private logarithmicGrowthPattern(): PatternDefinition {
    return {
      id: 'logarithmic_growth',
      name: 'Logarithmic Growth',
      category: PatternCategory.GROWTH,
      description: 'Diminishing returns growth (y = a + b * ln(x))',
      examples: [
        [1, 1.69, 2.1, 2.39, 2.61, 2.79, 2.94, 3.08, 3.2, 3.3],
        [0, 10, 15.9, 20.9, 25, 28.5, 31.6, 34.3, 36.8, 39.1]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 3) return false;

        // Check if data follows log curve (first differences decrease)
        const differences = [];
        for (let i = 1; i < values.length; i++) {
          differences.push(values[i] - values[i - 1]);
        }

        // Logarithmic growth has decreasing differences
        let decreasingCount = 0;
        for (let i = 1; i < differences.length; i++) {
          if (differences[i] < differences[i - 1]) {
            decreasingCount++;
          }
        }

        return decreasingCount / differences.length > 0.6;
      },
      confidenceFunction: (values: number[]) => {
        const differences = [];
        for (let i = 1; i < values.length; i++) {
          differences.push(values[i] - values[i - 1]);
        }

        let decreasingCount = 0;
        for (let i = 1; i < differences.length; i++) {
          if (differences[i] < differences[i - 1]) {
            decreasingCount++;
          }
        }

        return decreasingCount / differences.length;
      },
      metadata: {
        complexity: 'moderate',
        domain: ['learning', 'saturation', 'limits'],
        tags: ['trend', 'growth', 'logarithmic', 'diminishing']
      }
    };
  }

  /**
   * Linear decay pattern
   */
  private linearDecayPattern(): PatternDefinition {
    return {
      id: 'linear_decay',
      name: 'Linear Decay',
      category: PatternCategory.DECAY,
      description: 'Constant decrease over time (y = -mx + b)',
      examples: [
        [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
        [100, 90, 80, 70, 60, 50, 40, 30, 20, 10],
        [50, 45, 40, 35, 30, 25, 20, 15, 10, 5]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 3) return false;

        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        // Linear decay has negative slope
        return slope < -0.01;
      },
      confidenceFunction: (values: number[]) => {
        const correlation = this.calculateCorrelation(values);
        return Math.max(0, Math.min(1, -correlation));
      },
      metadata: {
        complexity: 'simple',
        domain: ['depreciation', 'consumption', 'decline'],
        tags: ['trend', 'decay', 'linear']
      }
    };
  }

  /**
   * Exponential decay pattern
   */
  private exponentialDecayPattern(): PatternDefinition {
    return {
      id: 'exponential_decay',
      name: 'Exponential Decay',
      category: PatternCategory.DECAY,
      description: 'Rapid decline that levels off (y = a * e^(-bx))',
      examples: [
        [100, 50, 25, 12.5, 6.25, 3.13, 1.56, 0.78, 0.39, 0.2],
        [1000, 900, 810, 729, 656, 590, 531, 478, 430, 387]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 3) return false;

        // Check if logarithmic transformation yields negative linear relationship
        const logValues = values.map(v => Math.log(v > 0 ? v : 1));
        const correlation = this.calculateCorrelation(logValues);

        return correlation < -0.8;
      },
      confidenceFunction: (values: number[]) => {
        const logValues = values.map(v => Math.log(v > 0 ? v : 1));
        return Math.max(0, Math.min(1, -this.calculateCorrelation(logValues)));
      },
      metadata: {
        complexity: 'moderate',
        domain: ['half_life', 'cooling', 'damping'],
        tags: ['trend', 'decay', 'exponential', 'leveling']
      }
    };
  }

  /**
   * Sine wave pattern
   */
  private sineWavePattern(): PatternDefinition {
    return {
      id: 'sine_wave',
      name: 'Sine Wave',
      category: PatternCategory.OSCILLATION,
      description: 'Smooth periodic oscillation',
      examples: [
        [0, 1, 0, -1, 0, 1, 0, -1, 0, 1],
        [1, 0.5, -0.5, -1, -0.5, 0.5, 1, 0.5, -0.5, -1]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 6) return false;

        // Detect periodicity using auto-correlation
        const maxLag = Math.floor(values.length / 2);
        let foundPeriod = false;

        for (let lag = 2; lag <= maxLag; lag++) {
          const autocorr = this.calculateAutocorrelation(values, lag);
          if (Math.abs(autocorr) > 0.7) {
            foundPeriod = true;
            break;
          }
        }

        return foundPeriod;
      },
      confidenceFunction: (values: number[]) => {
        const maxLag = Math.floor(values.length / 2);
        let maxAutocorr = 0;

        for (let lag = 2; lag <= maxLag; lag++) {
          const autocorr = this.calculateAutocorrelation(values, lag);
          maxAutocorr = Math.max(maxAutocorr, Math.abs(autocorr));
        }

        return maxAutocorr;
      },
      metadata: {
        complexity: 'moderate',
        domain: ['cycles', 'waves', 'vibrations'],
        tags: ['oscillation', 'periodic', 'smooth']
      }
    };
  }

  /**
   * Damped oscillation pattern
   */
  private dampedOscillationPattern(): PatternDefinition {
    return {
      id: 'damped_oscillation',
      name: 'Damped Oscillation',
      category: PatternCategory.OSCILLATION,
      description: 'Oscillation with decreasing amplitude',
      examples: [
        [1, 0.5, -0.25, 0.125, -0.0625, 0.0313, -0.0156, 0.0078, -0.0039, 0.002]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 6) return false;

        // Find peaks
        const peaks = this.findPeaks(values);
        if (peaks.length < 2) return false;

        // Check if peaks are decreasing
        for (let i = 1; i < peaks.length; i++) {
          if (Math.abs(values[peaks[i]]) >= Math.abs(values[peaks[i - 1]])) {
            return false;
          }
        }

        return true;
      },
      confidenceFunction: (values: number[]) => {
        const peaks = this.findPeaks(values);
        if (peaks.length < 2) return 0;

        // Calculate decay rate
        let totalDecay = 0;
        for (let i = 1; i < peaks.length; i++) {
          const decay = 1 - Math.abs(values[peaks[i]]) / Math.abs(values[peaks[i - 1]]);
          totalDecay += decay;
        }

        return totalDecay / (peaks.length - 1);
      },
      metadata: {
        complexity: 'complex',
        domain: ['spring_mass', 'electrical', 'resonance'],
        tags: ['oscillation', 'damped', 'decaying']
      }
    };
  }

  /**
   * Step pattern
   */
  private stepPattern(): PatternDefinition {
    return {
      id: 'step',
      name: 'Step Function',
      category: PatternCategory.STRUCTURAL,
      description: 'Sudden change then constant',
      examples: [
        [1, 1, 1, 1, 10, 10, 10, 10, 10, 10],
        [5, 5, 5, 20, 20, 20, 20, 20, 20, 20]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 4) return false;

        // Find sudden changes
        const changes = [];
        for (let i = 1; i < values.length; i++) {
          changes.push(Math.abs(values[i] - values[i - 1]));
        }

        // Find maximum change
        const maxChange = Math.max(...changes);
        const meanChange = changes.reduce((a, b) => a + b, 0) / changes.length;

        // Step function has one large change and others near zero
        const largeChanges = changes.filter(c => c > meanChange * 3).length;
        return largeChanges === 1;
      },
      confidenceFunction: (values: number[]) => {
        const changes = [];
        for (let i = 1; i < values.length; i++) {
          changes.push(Math.abs(values[i] - values[i - 1]));
        }

        const maxChange = Math.max(...changes);
        const meanChange = changes.filter(c => c !== maxChange).reduce((a, b) => a + b, 0) / (changes.length - 1);

        return 1 - (meanChange / maxChange);
      },
      metadata: {
        complexity: 'simple',
        domain: ['discrete', 'transitions', 'thresholds'],
        tags: ['structural', 'sudden', 'constant']
      }
    };
  }

  /**
   * Sawtooth pattern
   */
  private sawtoothPattern(): PatternDefinition {
    return {
      id: 'sawtooth',
      name: 'Sawtooth Wave',
      category: PatternCategory.STRUCTURAL,
      description: 'Linear rise followed by sharp drop',
      examples: [
        [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
        [0, 2.5, 5, 7.5, 10, 0, 2.5, 5, 7.5, 10]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 6) return false;

        // Find drops
        const drops = [];
        for (let i = 1; i < values.length; i++) {
          if (values[i] < values[i - 1]) {
            drops.push({ index: i, magnitude: values[i - 1] - values[i] });
          }
        }

        // Sawtooth has regular, large drops
        if (drops.length < 2) return false;

        // Check if drops are roughly equally spaced
        const intervals = [];
        for (let i = 1; i < drops.length; i++) {
          intervals.push(drops[i].index - drops[i - 1].index);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, v) => sum + Math.pow(v - avgInterval, 2), 0) / intervals.length;

        return variance < avgInterval * 0.5; // Low variance in spacing
      },
      confidenceFunction: (values: number[]) => {
        const drops = [];
        for (let i = 1; i < values.length; i++) {
          if (values[i] < values[i - 1]) {
            drops.push({ index: i, magnitude: values[i - 1] - values[i] });
          }
        }

        if (drops.length < 2) return 0;

        const intervals = [];
        for (let i = 1; i < drops.length; i++) {
          intervals.push(drops[i].index - drops[i - 1].index);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, v) => sum + Math.pow(v - avgInterval, 2), 0) / intervals.length;

        return 1 - (variance / avgInterval);
      },
      metadata: {
        complexity: 'moderate',
        domain: ['clocks', 'reset', 'cycles'],
        tags: ['structural', 'periodic', 'asymmetric']
      }
    };
  }

  /**
   * Staircase pattern
   */
  private staircasePattern(): PatternDefinition {
    return {
      id: 'staircase',
      name: 'Staircase',
      category: PatternCategory.STRUCTURAL,
      description: 'Series of steps upward',
      examples: [
        [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
        [10, 10, 20, 20, 30, 30, 40, 40, 50, 50]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 4) return false;

        // Count value changes
        const uniqueValues = new Set(values);
        const changes = [];
        let currentValue = values[0];

        for (let i = 0; i < values.length; i++) {
          if (values[i] !== currentValue) {
            changes.push(i);
            currentValue = values[i];
          }
        }

        // Staircase has multiple steps and values only increase
        const valuesArray = Array.from(uniqueValues);
        const onlyIncreases = valuesArray.every((v, i) => i === 0 || v > valuesArray[i - 1]);

        return changes.length >= 2 && onlyIncreases;
      },
      confidenceFunction: (values: number[]) => {
        const uniqueValues = new Set(values);
        const changes = [];
        let currentValue = values[0];

        for (let i = 0; i < values.length; i++) {
          if (values[i] !== currentValue) {
            changes.push(i);
            currentValue = values[i];
          }
        }

        return Math.min(1, changes.length / 3);
      },
      metadata: {
        complexity: 'simple',
        domain: ['tiers', 'levels', 'progression'],
        tags: ['structural', 'discrete', 'increasing']
      }
    };
  }

  /**
   * Normal distribution pattern
   */
  private normalDistributionPattern(): PatternDefinition {
    return {
      id: 'normal_distribution',
      name: 'Normal Distribution',
      category: PatternCategory.STATISTICAL,
      description: 'Bell curve distribution',
      examples: [
        [1, 2, 5, 10, 15, 10, 5, 2, 1]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 5) return false;

        // Check if values rise then fall (bell shape)
        const maxIndex = values.indexOf(Math.max(...values));

        // Should be near middle
        const middle = values.length / 2;
        const isCentered = Math.abs(maxIndex - middle) < values.length * 0.2;

        // Should rise to peak then fall
        const rising = maxIndex > 0 && values.slice(0, maxIndex).every((v, i) =>
          i === 0 || v >= values[i - 1]
        );
        const falling = maxIndex < values.length - 1 &&
          values.slice(maxIndex).every((v, i) =>
            i === 0 || v <= values[i - 1]
          );

        return isCentered && rising && falling;
      },
      confidenceFunction: (values: number[]) => {
        const maxIndex = values.indexOf(Math.max(...values));
        const middle = values.length / 2;
        const centeringScore = 1 - Math.abs(maxIndex - middle) / middle;

        return centeringScore;
      },
      metadata: {
        complexity: 'moderate',
        domain: ['statistics', 'probability', 'natural'],
        tags: ['statistical', 'distribution', 'bell']
      }
    };
  }

  /**
   * Uniform distribution pattern
   */
  private uniformDistributionPattern(): PatternDefinition {
    return {
      id: 'uniform_distribution',
      name: 'Uniform Distribution',
      category: PatternCategory.STATISTICAL,
      description: 'Evenly distributed values',
      examples: [
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 3) return false;

        // Calculate variance
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

        // For uniform distribution, variance should be relatively high
        const range = Math.max(...values) - Math.min(...values);
        const normalizedVariance = variance / (range * range);

        return normalizedVariance > 0.05;
      },
      confidenceFunction: (values: number[]) => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const range = Math.max(...values) - Math.min(...values);

        // For perfect uniform distribution, variance = range²/12
        const expectedVariance = (range * range) / 12;
        return 1 - Math.abs(variance - expectedVariance) / expectedVariance;
      },
      metadata: {
        complexity: 'simple',
        domain: ['random', 'uniform', 'spread'],
        tags: ['statistical', 'distribution', 'even']
      }
    };
  }

  /**
   * Burst pattern
   */
  private burstPattern(): PatternDefinition {
    return {
      id: 'burst',
      name: 'Burst',
      category: PatternCategory.TEMPORAL,
      description: 'Short period of high activity',
      examples: [
        [1, 1, 10, 10, 10, 1, 1, 1, 1, 1],
        [5, 5, 50, 50, 50, 5, 5, 5, 5, 5]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 5) return false;

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

        // Find values above threshold
        const threshold = mean + 2 * stdDev;
        const highValues = values.filter(v => v > threshold);

        // Burst should have cluster of high values
        return highValues.length >= 2 && highValues.length < values.length / 2;
      },
      confidenceFunction: (values: number[]) => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const threshold = mean * 1.5;
        const highValues = values.filter(v => v > threshold);

        return highValues.length / values.length;
      },
      metadata: {
        complexity: 'simple',
        domain: ['traffic', 'load', 'spikes'],
        tags: ['temporal', 'cluster', 'high']
      }
    };
  }

  /**
   * Periodic spike pattern
   */
  private periodicSpikePattern(): PatternDefinition {
    return {
      id: 'periodic_spike',
      name: 'Periodic Spike',
      category: PatternCategory.TEMPORAL,
      description: 'Regular spikes at intervals',
      examples: [
        [1, 10, 1, 1, 10, 1, 1, 10, 1, 1],
        [5, 50, 5, 5, 50, 5, 5, 50, 5, 5]
      ],
      matchFunction: (values: number[]) => {
        if (values.length < 6) return false;

        // Find spikes (local maxima)
        const spikes = [];
        for (let i = 1; i < values.length - 1; i++) {
          if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
            spikes.push(i);
          }
        }

        if (spikes.length < 2) return false;

        // Check if spikes are evenly spaced
        const intervals = [];
        for (let i = 1; i < spikes.length; i++) {
          intervals.push(spikes[i] - spikes[i - 1]);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, v) => sum + Math.pow(v - avgInterval, 2), 0) / intervals.length;

        return variance < 1; // Very regular spacing
      },
      confidenceFunction: (values: number[]) => {
        const spikes = [];
        for (let i = 1; i < values.length - 1; i++) {
          if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
            spikes.push(i);
          }
        }

        if (spikes.length < 2) return 0;

        const intervals = [];
        for (let i = 1; i < spikes.length; i++) {
          intervals.push(spikes[i] - spikes[i - 1]);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, v) => sum + Math.pow(v - avgInterval, 2), 0) / intervals.length;

        return 1 - (variance / avgInterval);
      },
      metadata: {
        complexity: 'moderate',
        domain: ['cron', 'scheduled', 'periodic'],
        tags: ['temporal', 'periodic', 'spikes']
      }
    };
  }

  /**
   * Calculate correlation coefficient
   */
  private calculateCorrelation(values: number[]): number {
    if (values.length < 3) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = values.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate auto-correlation at a specific lag
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (lag >= values.length) return 0;

    const n = values.length - lag;
    const mean = values.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Find peaks in values
   */
  private findPeaks(values: number[]): number[] {
    const peaks: number[] = [];

    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push(i);
      }
    }

    return peaks;
  }

  /**
   * Add a pattern to the library
   */
  addPattern(pattern: PatternDefinition): void {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Get a pattern by ID
   */
  getPattern(id: string): PatternDefinition | undefined {
    return this.patterns.get(id);
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): PatternDefinition[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: PatternCategory): PatternDefinition[] {
    return Array.from(this.patterns.values()).filter(p => p.category === category);
  }

  /**
   * Search patterns by tag
   */
  searchByTag(tag: string): PatternDefinition[] {
    return Array.from(this.patterns.values()).filter(p =>
      p.metadata.tags.includes(tag)
    );
  }

  /**
   * Match values against all patterns
   */
  matchAll(values: number[]): Array<{
    pattern: PatternDefinition;
    confidence: number;
  }> {
    const matches: Array<{
      pattern: PatternDefinition;
      confidence: number;
    }> = [];

    for (const pattern of this.patterns.values()) {
      if (pattern.matchFunction(values)) {
        const confidence = pattern.confidenceFunction(values);
        matches.push({ pattern, confidence });
      }
    }

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Add custom pattern
   */
  addCustomPattern(pattern: PatternDefinition): void {
    this.customPatterns.set(pattern.id, pattern);
  }

  /**
   * Get custom patterns
   */
  getCustomPatterns(): PatternDefinition[] {
    return Array.from(this.customPatterns.values());
  }
}

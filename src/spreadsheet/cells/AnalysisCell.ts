/**
 * POLLN Spreadsheet Integration - AnalysisCell
 *
 * AnalysisCell performs data analysis and pattern detection.
 * Uses L1-L2 logic (patterns + agent reasoning).
 *
 * Design Philosophy:
 * - ANALYSIS IS KNOWLEDGE, NOT ACTION
 * - Focus on UNDERSTANDING data before acting on it
 * - Think of the as exploration vs execution
 * - This is where cells "learn" about their data
 */

import { LogCell, LogCellConfig } from '../core/LogCell.js';
import { CellType, CellState, LogicLevel, CellOutput } from '../core/types.js';

/**
 * Analysis types
 */
export enum AnalysisType {
  STATISTICAL = 'statistical',     // Basic stats (mean, median, mode, std dev)
  PATTERN = 'pattern',             // Pattern detection in data
  TREND = 'trend',                 // Trend analysis over time
  DISTRIBUTION = 'distribution',   // Data distribution analysis
  CORRELATION = 'correlation',     // Correlation between variables
  ANOMALY = 'anomaly',             // Anomaly/outlier detection
  CLUSTER = 'cluster',             // Clustering analysis
  SENTIMENT = 'sentiment',         // Sentiment analysis (for text)
  FREQUENCY = 'frequency',         // Frequency analysis
  COMPARATIVE = 'comparative',     // Comparative analysis
}

/**
 * Analysis configuration
 */
export interface AnalysisConfig {
  analysisType: AnalysisType;
  fields?: string[];
  options?: Record<string, unknown>;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  type: AnalysisType;
  insights: string[];
  patterns: Array<{
    description: string;
    confidence: number;
    data: Record<string, unknown>;
  }>;
  metrics: Record<string, number>;
  recommendations?: string[];
  timestamp: number;
}

/**
 * Configuration for AnalysisCell
 */
export interface AnalysisCellConfig extends LogCellConfig {
  analysisConfig: AnalysisConfig;
  autoDetect?: boolean;  // Auto-detect analysis type
}

/**
 * AnalysisCell - Analyzes data to gain insights
 *
 * The Knowledge Worker
 * -------------------
 * Unlike action-oriented cells, AnalysisCell focuses on UNDERSTANDING.
 * It's about building knowledge, not just processing data.
 *
 * Key Insight:
 * "Analysis is knowing what you're looking at before deciding what to do with it."
 *
 * This aligns with:
 * - Top-down signals: Understanding context before action
 * - Bottom-up: Building knowledge from data
 * - The balance between exploration and exploitation
 *
 * Logic Level: L1-L2 (patterns + simple agent reasoning)
 */
export class AnalysisCell extends LogCell {
  private analysisConfig: AnalysisConfig;
  private autoDetect: boolean;
  private analysisHistory: AnalysisResult[] = [];

  constructor(config: AnalysisCellConfig) {
    super({
      type: CellType.ANALYSIS,
      position: config.position,
      logicLevel: LogicLevel.L2_AGENT,
      memoryLimit: config.memoryLimit,
    });

    this.analysisConfig = config.analysisConfig;
    this.autoDetect = config.autoDetect || false;
  }

  /**
   * Analyze input data
   */
  async analyze(input: unknown): Promise<CellOutput> {
    this.state = CellState.PROCESSING;

    try {
      if (!Array.isArray(input)) {
        throw new Error('Analysis requires array input');
      }

      let result: AnalysisResult;

      // Auto-detect the best analysis type if enabled
      const analysisType = this.autoDetect
        ? this.detectAnalysisType(input)
        : this.analysisConfig.analysisType;

      result = await this.performAnalysis(input, analysisType);

      this.state = CellState.EMITTING;
      this.analysisHistory.push(result);

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
        error: error instanceof Error ? error.message : 'Analysis failed',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Detect the most appropriate analysis type
   */
  private detectAnalysisType(input: unknown[]): AnalysisType {
    const sample = input.slice(0, Math.min(10, input.length));

    // Check if data has numeric fields
    const hasNumbers = sample.some((item) => {
      if (typeof item === 'object' && item !== null) {
        return Object.values(item).some((v) => typeof v === 'number');
      }
      return typeof item === 'number';
    });

    // Check if data has temporal fields
    const hasTemporal = sample.some((item) => {
      if (typeof item === 'object' && item !== null) {
        return Object.keys(item).some((k) =>
          k.toLowerCase().includes('date') ||
          k.toLowerCase().includes('time')
        );
      }
      return false;
    });

    // Check if data has text fields
    const hasText = sample.some((item) => {
      if (typeof item === 'object' && item !== null) {
        return Object.values(item).some((v) => typeof v === 'string');
      }
      return typeof item === 'string';
    });

    // Determine best analysis type
    if (hasTemporal) {
      return AnalysisType.TREND;
    }
    if (hasText) {
      return AnalysisType.SENTIMENT;
    }
    if (hasNumbers) {
      return AnalysisType.STATISTICAL;
    }

    return AnalysisType.PATTERN;
  }

  /**
   * Perform the specified analysis
   */
  private async performAnalysis(
    input: unknown[],
    type: AnalysisType
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    switch (type) {
    case AnalysisType.STATISTICAL:
      return this.statisticalAnalysis(input);

    case AnalysisType.PATTERN:
      return this.patternAnalysis(input);

    case AnalysisType.TREND:
      return this.trendAnalysis(input);

    case AnalysisType.DISTRIBUTION:
      return this.distributionAnalysis(input);

    case AnalysisType.CORRELATION:
      return this.correlationAnalysis(input);

    case AnalysisType.ANOMALY:
      return this.anomalyAnalysis(input);

    case AnalysisType.CLUSTER:
      return this.clusterAnalysis(input);

    case AnalysisType.SENTIMENT:
      return this.sentimentAnalysis(input);

    case AnalysisType.FREQUENCY:
      return this.frequencyAnalysis(input);

    case AnalysisType.COMPARATIVE:
      return this.comparativeAnalysis(input);

    default:
      throw new Error(`Unknown analysis type: ${type}`);
    }
  }

  /**
   * Statistical analysis
   */
  private async statisticalAnalysis(input: unknown[]): Promise<AnalysisResult> {
    const numbers = this.extractNumbers(input);
    const metrics: Record<string, number> = {
      count: numbers.length,
      sum: this.sum(numbers),
      mean: this.mean(numbers),
      median: this.median(numbers),
      mode: this.mode(numbers),
      min: Math.min(...numbers),
      max: Math.max(...numbers),
      stdDev: this.stdDev(numbers),
      variance: this.variance(numbers),
    };

    return {
      type: AnalysisType.STATISTICAL,
      insights: this.generateStatisticalInsights(metrics),
      patterns: [],
      metrics,
      timestamp: Date.now(),
    };
  }

  /**
   * Pattern analysis
   */
  private async patternAnalysis(input: unknown[]): Promise<AnalysisResult> {
    const patterns = this.detectPatterns(input);
    const insights = patterns.map((p) => p.description);

    return {
      type: AnalysisType.PATTERN,
      insights,
      patterns,
      metrics: {
        patternCount: patterns.length,
        avgConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Trend analysis
   */
  private async trendAnalysis(input: unknown[]): Promise<AnalysisResult> {
    const trends = this.analyzeTrends(input);
    const insights = this.generateTrendInsights(trends);

    return {
      type: AnalysisType.TREND,
      insights,
      patterns: trends.map((t) => ({
        description: t.direction,
        confidence: t.confidence,
        data: t,
      })),
      metrics: {
        trendStrength: trends[0]?.strength || 0,
        direction: trends[0]?.direction || 'stable',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Distribution analysis
   */
  private async distributionAnalysis(input: unknown[]): Promise<AnalysisResult> {
    const numbers = this.extractNumbers(input);
    const distribution = this.calculateDistribution(numbers);

    return {
      type: AnalysisType.DISTRIBUTION,
      insights: this.generateDistributionInsights(distribution),
      patterns: [],
      metrics: {
        skewness: distribution.skewness,
        kurtosis: distribution.kurtosis,
        quartiles: distribution.quartiles,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Correlation analysis
   */
  private async correlationAnalysis(input: unknown[]): Promise<AnalysisResult> {
    const correlations = this.calculateCorrelations(input);

    return {
      type: AnalysisType.CORRELATION,
      insights: this.generateCorrelationInsights(correlations),
      patterns: [],
      metrics: {
        correlations: correlations,
      },
      timestamp: Date.now(),
    }
  }

  /**
   * Anomaly analysis
   */
  private async anomalyAnalysis(input: unknown[]): Promise<AnalysisResult> {
    const anomalies = this.detectAnomalies(input);

    return {
      type: AnalysisType.ANOMALY,
      insights: anomalies.map((a) => a.description),
      patterns: anomalies.map((a) => ({
        description: a.description,
        confidence: a.confidence,
        data: a,
      })),
      metrics: {
        anomalyCount: anomalies.length,
        anomalyRate: anomalies.length / input.length,
      },
      timestamp: Date.now(),
    }
  }

  /**
   * Cluster analysis (placeholder - would use k-means or similar)
   */
  private async clusterAnalysis(input: unknown[]): Promise<AnalysisResult> {
    // Simple clustering based on numeric similarity
    const clusters = this.simpleClustering(input);

    return {
      type: AnalysisType.CLUSTER,
      insights: this.generateClusterInsights(clusters),
      patterns: clusters.map((c) => ({
        description: `Cluster ${c.id}: ${c.size} items`,
        confidence: c.coherence,
        data: c,
      })),
      metrics: {
        clusterCount: clusters.length,
        avgClusterSize: clusters.reduce((sum, c) => sum + c.size, 0) / clusters.length,
      },
      timestamp: Date.now(),
    }
  }

  /**
   * Sentiment analysis (basic implementation)
   */
  private async sentimentAnalysis(input: unknown[]): Promise<AnalysisResult> {
    const sentiments = this.analyzeSentiments(input);

    return {
      type: AnalysisType.SENTIMENT,
      insights: this.generateSentimentInsights(sentiments),
      patterns: [],
      metrics: {
        positive: sentiments.filter((s) => s.sentiment === 'positive').length,
        negative: sentiments.filter((s) => s.sentiment === 'negative').length,
        neutral: sentiments.filter((s) => s.sentiment === 'neutral').length,
        avgScore: this.mean(sentiments.map((s) => s.score)),
      },
      timestamp: Date.now(),
    }
  }

  /**
   * Frequency analysis
   */
  private async frequencyAnalysis(input: unknown[]): Promise<AnalysisResult> {
    const frequencies = this.calculateFrequencies(input);

    return {
      type: AnalysisType.FREQUENCY,
      insights: this.generateFrequencyInsights(frequencies),
      patterns: [],
      metrics: {
        uniqueValues: frequencies.size,
        maxFrequency: Math.max(...frequencies.values()),
      },
      timestamp: Date.now(),
    }
  }

  /**
   * Comparative analysis
   */
  private async comparativeAnalysis(input: unknown[]): Promise<AnalysisResult> {
    const comparison = this.performComparison(input);

    return {
      type: AnalysisType.COMPARATIVE,
      insights: comparison.insights,
      patterns: [],
      metrics: comparison.metrics,
      timestamp: Date.now(),
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private extractNumbers(input: unknown[]): number[] {
    const numbers: number[] = [];

    for (const item of input) {
      if (typeof item === 'number') {
        numbers.push(item);
      } else if (typeof item === 'object' && item !== null) {
        const values = Object.values(item as Record<string, unknown>);
        for (const v of values) {
          if (typeof v === 'number') {
            numbers.push(v);
          }
        }
      }
    }

    return numbers;
  }

  private sum(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0);
  }

  private mean(numbers: number[]): number {
    return numbers.length > 0 ? this.sum(numbers) / numbers.length : 0;
  }

  private median(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private mode(numbers: number[]): number {
    const counts = new Map<number, number>();
    let maxCount = 0;
    let mode = numbers[0];

    for (const n of numbers) {
      const count = (counts.get(n) || 0) + 1;
      counts.set(n, count);
      if (count > maxCount) {
        maxCount = count;
        mode = n;
      }
    }

    return mode;
  }

  private stdDev(numbers: number[]): number {
    const avg = this.mean(numbers);
    const squaredDiffs = numbers.map((n) => Math.pow(n - avg, 2));
    return Math.sqrt(this.mean(squaredDiffs));
  }

  private variance(numbers: number[]): number {
    const avg = this.mean(numbers);
    const squaredDiffs = numbers.map((n) => Math.pow(n - avg, 2));
    return this.mean(squaredDiffs);
  }

  private generateStatisticalInsights(metrics: Record<string, number>): string[] {
    const insights: string[] = [];

    if (metrics.stdDev === 0) {
      insights.push('All values are identical');
    } else if (metrics.stdDev! < metrics.mean * 0.1) {
      insights.push('Low variability - data is relatively consistent');
    } else if (metrics.stdDev! > metrics.mean) {
      insights.push('High variability - data is widely dispersed');
    }

    if (metrics.mean! > metrics.median) {
      insights.push('Distribution is right-skewed (positive skew)');
    } else if (metrics.mean < metrics.median) {
      insights.push('Distribution is left-skewed (negative skew)');
    }

    return insights;
  }

  private detectPatterns(input: unknown[]): Array<{ description: string; confidence: number; data: Record<string, unknown> }> {
    const patterns: Array<{ description: string; confidence: number; data: Record<string, unknown> }> = [];

    // Detect sequential patterns
    const numbers = this.extractNumbers(input);
    if (numbers.length >= 3) {
      // Check for increasing sequence
      let increasing = true;
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] <= numbers[i - 1]) {
          increasing = false;
          break;
        }
      }
      if (increasing) {
        patterns.push({
          description: 'Strictly increasing sequence detected',
          confidence: 0.9,
          data: { type: 'monotonic_increasing' },
        });
      }

      // Check for decreasing sequence
      let decreasing = true;
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] >= numbers[i - 1]) {
          decreasing = false;
          break;
        }
      }
      if (decreasing) {
        patterns.push({
          description: 'Strictly decreasing sequence detected',
          confidence: 0.9,
          data: { type: 'monotonic_decreasing' },
        });
      }
    }

    return patterns;
  }

  private analyzeTrends(input: unknown[]): Array<{
    direction: string;
    strength: number;
    confidence: number;
  }> {
    const numbers = this.extractNumbers(input);
    if (numbers.length < 2) {
      return [{ direction: 'insufficient_data', strength: 0, confidence: 0 }];
    }

    // Simple linear trend detection
    let upCount = 0;
    let downCount = 0;

    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] > numbers[i - 1]) upCount++;
      else if (numbers[i] < numbers[i - 1]) downCount++;
    }

    const total = upCount + downCount;
    const direction = upCount > downCount ? 'upward' : downCount > upCount ? 'downward' : 'stable';
    const strength = Math.max(upCount, downCount) / total;

    return [{
      direction,
      strength,
      confidence: strength,
    }];
  }

  private generateTrendInsights(trends: Array<{ direction: string; strength: number; confidence: number }>): string[] {
    return trends.map((t) => {
      if (t.direction === 'upward') {
        return `Upward trend detected with ${(t.strength * 100).toFixed(1)}% consistency`;
      } else if (t.direction === 'downward') {
        return `Downward trend detected with ${(t.strength * 100).toFixed(1)}% consistency`;
      }
      return 'No clear trend detected';
    });
  }

  private calculateDistribution(numbers: number[]): {
    skewness: number;
    kurtosis: number;
    quartiles: [number, number, number];
  } {
    const sorted = [...numbers].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q2 = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];

    const mean = this.mean(numbers);
    const stdDev = this.stdDev(numbers);
    const skewness = stdDev > 0
      ? numbers.reduce((sum, n) => sum + Math.pow((n - mean) / stdDev, 3), 0) / numbers.length
      : 0;

    const kurtosis = stdDev > 0
      ? numbers.reduce((sum, n) => sum + Math.pow((n - mean) / stdDev, 4), 0) / numbers.length - 3
      : 0;

    return {
      skewness,
      kurtosis,
      quartiles: [q1, q2, q3],
    };
  }

  private generateDistributionInsights(distribution: {
    skewness: number;
    kurtosis: number;
    quartiles: [number, number, number];
  }): string[] {
    const insights: string[] = [];

    if (distribution.skewness > 0.5) {
      insights.push('Distribution has significant positive skew (tail to the right)');
    } else if (distribution.skewness < -0.5) {
      insights.push('Distribution has significant negative skew (tail to the left)');
    } else {
      insights.push('Distribution is approximately symmetric');
    }

    if (distribution.kurtosis > 1) {
      insights.push('Distribution is leptokurtic (heavy tails)');
    } else if (distribution.kurtosis < -1) {
      insights.push('Distribution is platykurtic (light tails)');
    }

    const iqr = distribution.quartiles[2] - distribution.quartiles[0];
    insights.push(`Interquartile range: ${iqr.toFixed(2)}`);

    return insights;
  }

  private calculateCorrelations(input: unknown[]): Record<string, number> {
    // Simplified correlation calculation
    const correlations: Record<string, number> = {};

    if (typeof input[0] === 'object' && input[0] !== null) {
      const obj = input[0] as Record<string, unknown>;
      const keys = Object.keys(obj).filter((k) => typeof obj[k] === 'number');

      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const key1 = keys[i];
          const key2 = keys[j];

          const values1 = input.map((item) => (item as Record<string, unknown>)[key1] as number);
          const values2 = input.map((item) => (item as Record<string, unknown>)[key2] as number);

          const correlation = this.pearsonCorrelation(values1, values2);
          correlations[`${key1}_${key2}`] = correlation;
        }
      }
    }

    return correlations;
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = this.sum(x);
    const sumY = this.sum(y);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private generateCorrelationInsights(correlations: Record<string, number>): string[] {
    const insights: string[] = [];

    for (const [pair, corr] of Object.entries(correlations)) {
      if (Math.abs(corr) > 0.7) {
        insights.push(`Strong correlation (${corr.toFixed(2)}) between ${pair}`);
      } else if (Math.abs(corr) > 0.4) {
        insights.push(`Moderate correlation (${corr.toFixed(2)}) between ${pair}`);
      }
    }

    return insights;
  }

  private detectAnomalies(input: unknown[]): Array<{
    index: number;
    value: unknown;
    description: string;
    confidence: number;
  }> {
    const anomalies: Array<{
      index: number;
      value: unknown;
      description: string;
      confidence: number;
  }> = [];

    const numbers = this.extractNumbers(input);
    const mean = this.mean(numbers);
    const stdDev = this.stdDev(numbers);

    // Z-score based anomaly detection
    const threshold = 2; // 2 standard deviations

    numbers.forEach((num, idx) => {
      const zScore = Math.abs((num - mean) / stdDev);
      if (zScore > threshold) {
        anomalies.push({
          index: idx,
          value: num,
          description: `Anomaly at index ${idx}: value ${num} is ${(zScore * 100).toFixed(1)}% deviations from mean`,
          confidence: Math.min(1, zScore / 3),
        });
      }
    });

    return anomalies;
  }

  private simpleClustering(input: unknown[]): Array<{
    id: number;
    size: number;
    coherence: number;
    centroid: number;
  }> {
    // Very simplified clustering - would use k-means in production
    const numbers = this.extractNumbers(input);
    const mean = this.mean(numbers);

    const clusters = [
      { id: 0, size: 0, coherence: 0.8, centroid: mean * 0.5 },
      { id: 1, size: 0, coherence: 0.8, centroid: mean },
      { id: 2, size: 0, coherence: 0.8, centroid: mean * 1.5 },
    ];

    numbers.forEach((num) => {
      const distances = clusters.map((c) => Math.abs(num - c.centroid));
      const closestIdx = distances.indexOf(Math.min(...distances));
      clusters[closestIdx].size++;
    });

    return clusters.filter((c) => c.size > 0);
  }

  private generateClusterInsights(clusters: Array<{
    id: number;
    size: number;
    coherence: number;
    centroid: number;
  }>): string[] {
    return clusters.map((c) => `Cluster ${c.id}: ${c.size} items centered around ${c.centroid.toFixed(2)}`);
  }

  private analyzeSentiments(input: unknown[]): Array<{
    value: unknown;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }> {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'happy', 'love', 'best', 'beautiful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointing', 'poor', 'sad', 'angry'];

    return input.map((item) => {
      const text = String(item).toLowerCase();
      let score = 0;

      for (const word of positiveWords) {
        if (text.includes(word)) score += 1;
      }

      for (const word of negativeWords) {
        if (text.includes(word)) score -= 1;
      }

      const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';

      return {
        value: item,
        sentiment,
        score: Math.abs(score) / Math.max(1, positiveWords.length),
      };
    });
  }

  private generateSentimentInsights(sentiments: Array<{
    value: unknown;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }>): string[] {
    const insights: string[] = [];
    const positive = sentiments.filter((s) => s.sentiment === 'positive').length;
    const negative = sentiments.filter((s) => s.sentiment === 'negative').length;

    if (positive > negative * 2) {
      insights.push('Overall positive sentiment dominates');
    } else if (negative > positive * 2) {
      insights.push('Overall negative sentiment dominates');
    } else {
      insights.push('Mixed sentiment with no clear dominant polarity');
    }

    return insights;
  }

  private calculateFrequencies(input: unknown[]): Map<unknown, number> {
    const frequencies = new Map<unknown, number>();

    for (const item of input) {
      const key = typeof item === 'object' ? JSON.stringify(item) : item;
      frequencies.set(key, (frequencies.get(key) || 0) + 1);
    }

    return frequencies;
  }

  private generateFrequencyInsights(frequencies: Map<unknown, number>): string[] {
    const insights: string[] = [];
    const sorted = [...frequencies.entries()].sort((a, b) => b[1] - a[1]);

    const top = sorted.slice(0, 3);
    insights.push(`Top 3 most frequent values: ${top.map(([k, v]) => `${k} (${v}x)`).join(', ')}`);

    const unique = frequencies.size;
    const total = [...frequencies.values()].reduce((a, b) => a + b, 0);
    const uniqueRatio = unique / total;

    if (uniqueRatio > 0.8) {
      insights.push('High uniqueness - most values appear only once');
    } else if (uniqueRatio < 0.2) {
      insights.push('Low uniqueness - few values repeat frequently');
    }

    return insights;
  }

  private performComparison(input: unknown[]): {
    insights: string[];
    metrics: Record<string, number>;
  } {
    const numbers = this.extractNumbers(input);
    const mean = this.mean(numbers);
    const median = this.median(numbers);

    return {
      insights: [
        `Mean: ${mean.toFixed(2)}, Median: ${median.toFixed(2)}`,
        mean !== median
          ? `Mean and median differ by ${Math.abs(mean - median).toFixed(2)}`
          : 'Mean and median are equal',
      ],
      metrics: {
        mean,
        median,
        difference: Math.abs(mean - median),
      },
    };
  }

  /**
   * Get analysis history
   */
  getAnalysisHistory(): AnalysisResult[] {
    return [...this.analysisHistory];
  }
}
  /**
   * Create the processing logic for this cell
   */
  protected createProcessingLogic(): any {
    return {
      type: 'analysis',
      logic: this.logicLevel,
    };
  }
}

/**
 * AnomalyModel.ts - Autoencoder-based anomaly detection for spreadsheet cells
 *
 * Detects anomalies in cell behavior using reconstruction error from autoencoder networks.
 * Features adaptive thresholding and online learning capabilities.
 */

import * as tf from '@tensorflow/tfjs';

export interface AnomalyScore {
  score: number;
  isAnomaly: boolean;
  threshold: number;
  confidence: number;
  features: number[];
}

export interface AnomalyModelConfig {
  encodingDim: number[];
  learningRate: number;
  epochs: number;
  batchSize: number;
  validationSplit: number;
  thresholdPercentile: number;
  adaptiveThreshold: boolean;
  windowSize: number;
}

export class AnomalyModel {
  private autoencoder: tf.LayersModel | null = null;
  private encoder: tf.LayersModel | null = null;
  private decoder: tf.LayersModel | null = null;
  private config: AnomalyModelConfig;
  private isTrained: boolean = false;
  private threshold: number = 0;
  private normalStats: { mean: number; std: number }[] = [];
  private errorHistory: number[] = [];

  constructor(config?: Partial<AnomalyModelConfig>) {
    this.config = {
      encodingDim: [32, 16, 8],
      learningRate: 0.001,
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      thresholdPercentile: 95,
      adaptiveThreshold: true,
      windowSize: 100,
      ...config
    };
  }

  /**
   * Build autoencoder architecture
   */
  buildAutoencoder(inputDim: number): void {
    if (this.autoencoder) {
      this.autoencoder.dispose();
    }

    // Build encoder
    const encoderLayers: tf.Layer[] = [
      tf.layers.dense({
        units: this.config.encodingDim[0],
        activation: 'relu',
        inputDim
      })
    ];

    for (let i = 1; i < this.config.encodingDim.length; i++) {
      encoderLayers.push(
        tf.layers.dense({
          units: this.config.encodingDim[i],
          activation: 'relu'
        })
      );
    }

    // Build decoder (reverse of encoder)
    const decoderLayers: tf.Layer[] = [];

    for (let i = this.config.encodingDim.length - 2; i >= 0; i--) {
      decoderLayers.push(
        tf.layers.dense({
          units: this.config.encodingDim[i],
          activation: 'relu'
        })
      );
    }

    decoderLayers.push(
      tf.layers.dense({
        units: inputDim,
        activation: 'linear'
      })
    );

    // Create full autoencoder
    this.autoencoder = tf.sequential();
    encoderLayers.forEach(layer => this.autoencoder!.add(layer));
    decoderLayers.forEach(layer => this.autoencoder!.add(layer));

    // Create separate encoder model
    this.encoder = tf.sequential();
    encoderLayers.forEach(layer => this.encoder!.add(layer));

    // Create separate decoder model
    this.decoder = tf.sequential();
    decoderLayers.forEach(layer => this.decoder!.add(layer));

    // Compile
    this.autoencoder.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'mse',
      metrics: ['mae']
    });
  }

  /**
   * Extract features from cell history
   */
  private extractFeatures(history: number[]): number[] {
    const features: number[] = [];

    // Statistical features
    features.push(
      ...this.computeStatisticalFeatures(history)
    );

    // Temporal features
    features.push(
      ...this.computeTemporalFeatures(history)
    );

    // Pattern features
    features.push(
      ...this.computePatternFeatures(history)
    );

    return features;
  }

  /**
   * Compute statistical features
   */
  private computeStatisticalFeatures(history: number[]): number[] {
    const valid = history.filter(v => !isNaN(v) && isFinite(v));
    if (valid.length === 0) return new Array(10).fill(0);

    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const variance = valid.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / valid.length;
    const std = Math.sqrt(variance);

    const sorted = [...valid].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return [
      mean,
      std,
      variance,
      median,
      sorted[0], // min
      sorted[sorted.length - 1], // max
      sorted[Math.floor(sorted.length * 0.25)], // Q1
      sorted[Math.floor(sorted.length * 0.75)], // Q3
      sorted[sorted.length - 1] - sorted[0], // range
      std / (mean || 1) // coefficient of variation
    ];
  }

  /**
   * Compute temporal features
   */
  private computeTemporalFeatures(history: number[]): number[] {
    if (history.length < 2) return new Array(10).fill(0);

    const features: number[] = [];

    // First differences
    const diffs = [];
    for (let i = 1; i < history.length; i++) {
      diffs.push(history[i] - history[i - 1]);
    }

    // Mean and std of differences
    const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const stdDiff = Math.sqrt(
      diffs.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / diffs.length
    );

    features.push(meanDiff, stdDiff);

    // Second differences (acceleration)
    const accels = [];
    for (let i = 1; i < diffs.length; i++) {
      accels.push(diffs[i] - diffs[i - 1]);
    }

    const meanAccel = accels.reduce((a, b) => a + b, 0) / accels.length;
    const stdAccel = Math.sqrt(
      accels.reduce((sum, a) => sum + Math.pow(a - meanAccel, 2), 0) / accels.length
    );

    features.push(meanAccel, stdAccel);

    // Recent vs historical comparison
    const recentWindow = Math.min(10, Math.floor(history.length / 4));
    const recent = history.slice(-recentWindow);
    const historical = history.slice(0, -recentWindow);

    const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const historicalMean = historical.reduce((a, b) => a + b, 0) / historical.length;

    features.push(recentMean - historicalMean);

    // Volatility features
    const rollingStd = this.computeRollingStd(history, 5);
    features.push(
      Math.max(...rollingStd),
      Math.min(...rollingStd),
      rollingStd.reduce((a, b) => a + b, 0) / rollingStd.length
    );

    return features;
  }

  /**
   * Compute pattern features
   */
  private computePatternFeatures(history: number[]): number[] {
    if (history.length < 5) return new Array(8).fill(0);

    const features: number[] = [];

    // Trend direction (linear regression slope)
    const n = history.length;
    const xMean = (n - 1) / 2;
    const yMean = history.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (history[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = denominator > 0 ? numerator / denominator : 0;
    features.push(slope);

    // Cyclical behavior detection
    const autocorr = this.computeAutocorrelation(history, [1, 2, 3, 4, 5]);
    features.push(...autocorr);

    // Entropy (measure of randomness)
    const entropy = this.computeEntropy(history);
    features.push(entropy);

    return features;
  }

  /**
   * Compute rolling standard deviation
   */
  private computeRollingStd(data: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = window - 1; i < data.length; i++) {
      const slice = data.slice(i - window + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / window;
      const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / window;
      result.push(Math.sqrt(variance));
    }
    return result;
  }

  /**
   * Compute autocorrelation at various lags
   */
  private computeAutocorrelation(data: number[], lags: number[]): number[] {
    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;

    return lags.map(lag => {
      if (lag >= n) return 0;
      let sum = 0;
      for (let i = 0; i < n - lag; i++) {
        sum += (data[i] - mean) * (data[i + lag] - mean);
      }
      return variance > 0 ? sum / ((n - lag) * variance) : 0;
    });
  }

  /**
   * Compute entropy of data
   */
  private computeEntropy(data: number[]): number {
    // Bin the data
    const bins = 10;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const counts = new Array(bins).fill(0);
    data.forEach(v => {
      const binIndex = Math.min(Math.floor((v - min) / range * bins), bins - 1);
      counts[binIndex]++;
    });

    // Calculate entropy
    let entropy = 0;
    const total = data.length;
    counts.forEach(count => {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    });

    return entropy;
  }

  /**
   * Normalize features
   */
  private normalizeFeatures(features: number[][]): tf.Tensor {
    const tensor = tf.tensor2d(features);

    // Compute statistics for each feature
    const mean = tensor.mean(0);
    const std = tensor.sub(tensor.mean(0, true)).square().mean(0).sqrt();

    // Store for later use
    this.normalStats = Array.from(await mean.data()).map((m, i) => ({
      mean: m,
      std: await std.data().then(d => d[i])
    }));

    // Normalize
    const normalized = tensor.sub(mean).div(std);

    mean.dispose();
    std.dispose();

    return normalized;
  }

  /**
   * Train autoencoder on normal patterns
   */
  async train(history: number[]): Promise<tf.History> {
    // Extract features from multiple windows
    const windowSize = Math.min(50, history.length);
    const features: number[][] = [];

    for (let i = windowSize; i <= history.length; i++) {
      const window = history.slice(i - windowSize, i);
      features.push(this.extractFeatures(window));
    }

    if (features.length === 0) {
      throw new Error('Not enough data for training');
    }

    // Normalize features
    const normalizedFeatures = this.normalizeFeatures(features);

    // Build autoencoder
    this.buildAutoencoder(features[0].length);

    // Train
    const history = await this.autoencoder.fit(normalizedFeatures, normalizedFeatures, {
      epochs: this.config.epochs,
      batchSize: this.config.batchSize,
      validationSplit: this.config.validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`);
          }
        }
      }
    });

    // Calculate threshold on training data
    await this.calculateThreshold(normalizedFeatures);

    normalizedFeatures.dispose();
    this.isTrained = true;

    return history;
  }

  /**
   * Calculate anomaly threshold
   */
  private async calculateThreshold(data: tf.Tensor): Promise<void> {
    const reconstructed = this.autoencoder!.predict(data) as tf.Tensor;
    const errors = reconstructed.sub(data).square().sum(1);

    const errorValues = await errors.data();
    this.errorHistory = Array.from(errorValues);

    // Set threshold at percentile
    const sorted = [...errorValues].sort((a, b) => a - b);
    const index = Math.floor(this.config.thresholdPercentile / 100 * sorted.length);
    this.threshold = sorted[index];

    reconstructed.dispose();
    errors.dispose();
  }

  /**
   * Detect anomalies in new data
   */
  async detectAnomaly(history: number[]): Promise<AnomalyScore> {
    if (!this.autoencoder || !this.isTrained) {
      throw new Error('Model must be trained before detection');
    }

    // Extract features
    const windowSize = Math.min(50, history.length);
    const window = history.slice(-windowSize);
    const features = this.extractFeatures(window);

    // Normalize using stored statistics
    const normalized = features.map((f, i) => {
      const stats = this.normalStats[i];
      return stats.std > 0 ? (f - stats.mean) / stats.std : 0;
    });

    // Reconstruct
    const input = tf.tensor2d([normalized]);
    const reconstructed = this.autoencoder.predict(input) as tf.Tensor;
    const reconstructionError = reconstructed.sub(input).square().sum().dataSync()[0];

    // Determine if anomaly
    const isAnomaly = reconstructionError > this.threshold;

    // Calculate confidence
    const confidence = this.calculateConfidence(reconstructionError);

    // Update error history for adaptive threshold
    if (this.config.adaptiveThreshold) {
      this.errorHistory.push(reconstructionError);
      if (this.errorHistory.length > this.config.windowSize) {
        this.errorHistory.shift();
      }
      await this.updateThreshold();
    }

    input.dispose();
    reconstructed.dispose();

    return {
      score: reconstructionError,
      isAnomaly,
      threshold: this.threshold,
      confidence,
      features
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(error: number): number {
    // Distance from threshold
    const distance = Math.abs(error - this.threshold);
    return Math.min(1, distance / this.threshold);
  }

  /**
   * Update threshold based on recent errors
   */
  private async updateThreshold(): Promise<void> {
    const sorted = [...this.errorHistory].sort((a, b) => a - b);
    const index = Math.floor(this.config.thresholdPercentile / 100 * sorted.length);
    this.threshold = sorted[index];
  }

  /**
   * Online learning - update model with new data
   */
  async onlineLearning(history: number[]): Promise<void> {
    if (!this.isTrained) {
      await this.train(history);
      return;
    }

    // Extract features from new window
    const windowSize = Math.min(50, history.length);
    const window = history.slice(-windowSize);
    const features = this.extractFeatures(window);

    // Normalize
    const normalized = features.map((f, i) => {
      const stats = this.normalStats[i];
      return stats.std > 0 ? (f - stats.mean) / stats.std : 0;
    });

    // Fine-tune with single epoch
    const input = tf.tensor2d([normalized]);
    await this.autoencoder!.fit(input, input, {
      epochs: 1,
      batchSize: 1,
      verbose: 0
    });

    input.dispose();
  }

  /**
   * Get model summary
   */
  getSummary(): string {
    if (!this.autoencoder) {
      return 'Model not built yet';
    }

    return this.autoencoder.summary();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.autoencoder) {
      this.autoencoder.dispose();
      this.autoencoder = null;
    }
    if (this.encoder) {
      this.encoder.dispose();
      this.encoder = null;
    }
    if (this.decoder) {
      this.decoder.dispose();
      this.decoder = null;
    }
    this.isTrained = false;
  }
}

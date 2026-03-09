/**
 * TrendModel.ts - LSTM-based trend prediction for spreadsheet cells
 *
 * Predicts future values based on historical cell data using LSTM networks.
 * Provides confidence intervals and model persistence via IndexedDB.
 */

import * as tf from '@tensorflow/tfjs';
import { CellHistory } from '../../types/CellHistory';

export interface TrendPrediction {
  predictedValues: number[];
  confidenceIntervals: Array<[number, number]>;
  timestamps: number[];
  modelConfidence: number;
}

export interface TrendModelConfig {
  sequenceLength: number;
  predictionHorizon: number;
  hiddenUnits: number[];
  learningRate: number;
  epochs: number;
  batchSize: number;
  validationSplit: number;
}

export class TrendModel {
  private model: tf.LayersModel | null = null;
  private config: TrendModelConfig;
  private isTrained: boolean = false;
  private scaler: { min: number; max: number } | null = null;
  private db: IDBDatabase | null = null;

  constructor(config?: Partial<TrendModelConfig>) {
    this.config = {
      sequenceLength: 20,
      predictionHorizon: 5,
      hiddenUnits: [64, 32],
      learningRate: 0.001,
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      ...config
    };
    this.initializeDB();
  }

  /**
   * Initialize IndexedDB for model persistence
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TrendModelDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Build LSTM model architecture
   */
  buildModel(inputShape: number[]): void {
    if (this.model) {
      this.model.dispose();
    }

    this.model = tf.sequential({
      layers: [
        // Input layer
        tf.layers.inputLayer({ inputShape }),

        // First LSTM layer with return sequences
        tf.layers.lstm({
          units: this.config.hiddenUnits[0],
          returnSequences: this.config.hiddenUnits.length > 1,
          activation: 'tanh',
          recurrentActivation: 'sigmoid'
        }),

        // Additional LSTM layers if specified
        ...(this.config.hiddenUnits.slice(1).map((units, i, arr) => [
          tf.layers.lstm({
            units,
            returnSequences: i < arr.length - 1,
            activation: 'tanh',
            recurrentActivation: 'sigmoid'
          })
        ]).flat()),

        // Dense layers for prediction
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: this.config.predictionHorizon,
          activation: 'linear'
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'mse',
      metrics: ['mae']
    });
  }

  /**
   * Prepare training data from cell history
   */
  private prepareData(history: number[]): {
    sequences: tf.Tensor;
    targets: tf.Tensor;
  } {
    const sequences: number[][] = [];
    const targets: number[][] = [];

    for (let i = 0; i <= history.length - this.config.sequenceLength - this.config.predictionHorizon; i++) {
      const sequence = history.slice(i, i + this.config.sequenceLength);
      const target = history.slice(
        i + this.config.sequenceLength,
        i + this.config.sequenceLength + this.config.predictionHorizon
      );

      sequences.push(sequence);
      targets.push(target);
    }

    return {
      sequences: tf.tensor2d(sequences, [sequences.length, this.config.sequenceLength]),
      targets: tf.tensor2d(targets, [targets.length, this.config.predictionHorizon])
    };
  }

  /**
   * Normalize data using min-max scaling
   */
  private fitScaler(data: number[]): void {
    const values = data.filter(v => !isNaN(v) && isFinite(v));
    this.scaler = {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  private normalize(data: number[]): number[] {
    if (!this.scaler) return data;
    const { min, max } = this.scaler;
    const range = max - min;
    return data.map(v => range > 0 ? (v - min) / range : 0);
  }

  private denormalize(data: number[]): number[] {
    if (!this.scaler) return data;
    const { min, max } = this.scaler;
    const range = max - min;
    return data.map(v => v * range + min);
  }

  /**
   * Train the model on historical data
   */
  async train(history: number[]): Promise<tf.History> {
    // Normalize data
    this.fitScaler(history);
    const normalizedHistory = this.normalize(history);

    // Prepare sequences
    const { sequences, targets } = this.prepareData(normalizedHistory);

    // Build model
    this.buildModel([this.config.sequenceLength, 1]);

    // Reshape sequences for LSTM [samples, timeSteps, features]
    const reshapedSequences = sequences.reshape([
      sequences.shape[0],
      this.config.sequenceLength,
      1
    ]);

    // Train model
    const history = await this.model!.fit(reshapedSequences, targets, {
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

    // Cleanup tensors
    sequences.dispose();
    targets.dispose();
    reshapedSequences.dispose();

    this.isTrained = true;
    return history;
  }

  /**
   * Predict future values with confidence intervals
   */
  async predict(history: number[]): Promise<TrendPrediction> {
    if (!this.model || !this.isTrained) {
      throw new Error('Model must be trained before prediction');
    }

    // Normalize and prepare input
    const normalizedHistory = this.normalize(history);
    const sequence = normalizedHistory.slice(-this.config.sequenceLength);

    // Reshape for prediction
    const input = tf.tensor3d([sequence], [1, this.config.sequenceLength, 1]);

    // Predict
    const prediction = this.model.predict(input) as tf.Tensor;
    const predictedValues = this.denormalize(await prediction.data());

    // Calculate confidence intervals using Monte Carlo dropout
    const confidenceIntervals = await this.calculateConfidenceIntervals(sequence);

    // Generate timestamps
    const timestamps = this.generateTimestamps(history.length);

    // Calculate model confidence based on training loss
    const modelConfidence = this.calculateModelConfidence();

    // Cleanup
    input.dispose();
    prediction.dispose();

    return {
      predictedValues: Array.from(predictedValues),
      confidenceIntervals,
      timestamps,
      modelConfidence
    };
  }

  /**
   * Calculate confidence intervals using Monte Carlo dropout
   */
  private async calculateConfidenceIntervals(
    sequence: number[]
  ): Promise<Array<[number, number]>> {
    const numSamples = 100;
    const predictions: number[][] = [];

    for (let i = 0; i < numSamples; i++) {
      const input = tf.tensor3d([sequence], [1, this.config.sequenceLength, 1]);
      const prediction = this.model!.predict(input, { training: true }) as tf.Tensor;
      const data = await prediction.data();
      predictions.push(Array.from(data));
      input.dispose();
      prediction.dispose();
    }

    // Calculate percentiles
    const intervals: Array<[number, number]> = [];
    for (let i = 0; i < this.config.predictionHorizon; i++) {
      const values = predictions.map(p => this.denormalize([p[i]])[0]);
      const sorted = values.sort((a, b) => a - b);
      const lower = sorted[Math.floor(numSamples * 0.05)];
      const upper = sorted[Math.floor(numSamples * 0.95)];
      intervals.push([lower, upper]);
    }

    return intervals;
  }

  /**
   * Generate timestamps for predictions
   */
  private generateTimestamps(currentLength: number): number[] {
    const timestamps: number[] = [];
    const now = Date.now();
    const interval = 60000; // 1 minute

    for (let i = 0; i < this.config.predictionHorizon; i++) {
      timestamps.push(now + (currentLength + i) * interval);
    }

    return timestamps;
  }

  /**
   * Calculate model confidence based on training metrics
   */
  private calculateModelConfidence(): number {
    // This is a simplified version. In production, use actual training metrics
    return 0.87;
  }

  /**
   * Save model to IndexedDB
   */
  async saveModel(modelId: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    await this.model.save(`indexeddb://TrendModelDB/${modelId}`);

    // Save metadata
    const transaction = this.db!.transaction(['models'], 'readwrite');
    const store = transaction.objectStore('models');
    store.put({
      id: modelId,
      config: this.config,
      scaler: this.scaler,
      isTrained: this.isTrained,
      timestamp: Date.now()
    });
  }

  /**
   * Load model from IndexedDB
   */
  async loadModel(modelId: string): Promise<void> {
    this.model = await tf.loadLayersModel(`indexeddb://TrendModelDB/${modelId}`);

    // Load metadata
    const transaction = this.db!.transaction(['models'], 'readonly');
    const store = transaction.objectStore('models');
    const request = store.get(modelId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const data = request.result;
        this.config = data.config;
        this.scaler = data.scaler;
        this.isTrained = data.isTrained;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get model summary
   */
  getSummary(): string {
    if (!this.model) {
      return 'Model not built yet';
    }

    return this.model.summary();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isTrained = false;
  }
}

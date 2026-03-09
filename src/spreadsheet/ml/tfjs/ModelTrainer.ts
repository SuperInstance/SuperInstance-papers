/**
 * ModelTrainer.ts - Training pipeline for TensorFlow.js models
 *
 * Handles data preparation, training orchestration, and model checkpointing.
 * Provides comprehensive training utilities and progress tracking.
 */

import * as tf from '@tensorflow/tfjs';
import { TrendModel, TrendModelConfig } from './TrendModel';
import { AnomalyModel, AnomalyModelConfig } from './AnomalyModel';
import { ClusteringModel, ClusteringModelConfig } from './ClusteringModel';

export interface TrainingConfig {
  modelType: 'trend' | 'anomaly' | 'clustering';
  modelConfig?: TrendModelConfig | AnomalyModelConfig | ClusteringModelConfig;
  testData?: number[] | Map<string, number[]>;
  validationSplit?: number;
  checkpointInterval?: number;
  earlyStoppingPatience?: number;
  tensorboardCallback?: boolean;
}

export interface TrainingProgress {
  epoch: number;
  loss: number;
  metrics: Record<string, number>;
  timestamp: number;
}

export interface TrainingResult {
  success: boolean;
  epochsCompleted: number;
  finalLoss: number;
  finalMetrics: Record<string, number>;
  trainingTime: number;
  modelPath: string;
  checkpoints: string[];
}

export class ModelTrainer {
  private db: IDBDatabase | null = null;
  private progressCallbacks: Map<string, (progress: TrainingProgress) => void> = new Map();

  constructor() {
    this.initializeDB();
  }

  /**
   * Initialize IndexedDB for model storage
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ModelTrainerDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for trained models
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }

        // Store for training checkpoints
        if (!db.objectStoreNames.contains('checkpoints')) {
          db.createObjectStore('checkpoints', { keyPath: 'id' });
        }

        // Store for training logs
        if (!db.objectStoreNames.contains('logs')) {
          db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  /**
   * Prepare data from cell history
   */
  prepareData(
    history: number[],
    validationSplit: number = 0.2
  ): {
    trainData: number[];
    testData: number[];
    validationData: number[];
  } {
    // Clean data
    const cleaned = history.filter(v => !isNaN(v) && isFinite(v));

    if (cleaned.length < 10) {
      throw new Error('Insufficient data for training (minimum 10 points required)');
    }

    // Shuffle data
    const shuffled = [...cleaned].sort(() => Math.random() - 0.5);

    // Split data
    const splitIndex = Math.floor(shuffled.length * (1 - validationSplit));
    const trainData = shuffled.slice(0, splitIndex);
    const validationData = shuffled.slice(splitIndex);

    // Reserve 10% of training for testing
    const testSplitIndex = Math.floor(trainData.length * 0.9);
    const testData = trainData.slice(testSplitIndex);
    const finalTrainData = trainData.slice(0, testSplitIndex);

    return {
      trainData: finalTrainData,
      testData,
      validationData
    };
  }

  /**
   * Prepare multi-cell data for clustering
   */
  prepareClusteringData(
    cellHistories: Map<string, number[]>,
    validationSplit: number = 0.2
  ): {
    trainData: Map<string, number[]>;
    testData: Map<string, number[]>;
  } {
    const trainData = new Map<string, number[]>();
    const testData = new Map<string, number[]>();

    cellHistories.forEach((history, cellId) => {
      const { train, test } = this.prepareData(history, validationSplit);
      trainData.set(cellId, train);
      testData.set(cellId, test);
    });

    return { trainData, testData };
  }

  /**
   * Train trend model
   */
  async trainTrendModel(
    modelId: string,
    history: number[],
    config?: Partial<TrendModelConfig>
  ): Promise<TrainingResult> {
    const startTime = Date.now();
    const checkpoints: string[] = [];

    try {
      // Prepare data
      const { trainData, testData, validationData } = this.prepareData(history);

      // Create model
      const model = new TrendModel(config);

      // Setup progress callback
      this.setupProgressCallback(modelId, model);

      // Train model
      const trainingHistory = await model.train([...trainData, ...validationData]);

      // Evaluate on test data
      const predictions = await model.predict([...trainData.slice(-20), ...testData]);
      const testLoss = this.calculatePredictionLoss(testData, predictions.predictedValues);

      // Save model
      const modelPath = `trend_${modelId}`;
      await model.saveModel(modelId);
      checkpoints.push(modelPath);

      // Save metadata
      await this.saveModelMetadata({
        id: modelId,
        type: 'trend',
        config: model['config'],
        trainingTime: Date.now() - startTime,
        finalLoss: testLoss,
        timestamp: Date.now()
      });

      const result: TrainingResult = {
        success: true,
        epochsCompleted: trainingHistory.epoch.length,
        finalLoss: testLoss,
        finalMetrics: {
          mae: trainingHistory.history.mae[trainingHistory.history.mae.length - 1] as number,
          confidence: predictions.modelConfidence
        },
        trainingTime: Date.now() - startTime,
        modelPath,
        checkpoints
      };

      model.dispose();
      return result;

    } catch (error) {
      console.error('Trend model training failed:', error);
      return {
        success: false,
        epochsCompleted: 0,
        finalLoss: Infinity,
        finalMetrics: {},
        trainingTime: Date.now() - startTime,
        modelPath: '',
        checkpoints
      };
    }
  }

  /**
   * Train anomaly model
   */
  async trainAnomalyModel(
    modelId: string,
    history: number[],
    config?: Partial<AnomalyModelConfig>
  ): Promise<TrainingResult> {
    const startTime = Date.now();
    const checkpoints: string[] = [];

    try {
      // Prepare data
      const { trainData, testData, validationData } = this.prepareData(history);

      // Create model
      const model = new AnomalyModel(config);

      // Setup progress callback
      this.setupProgressCallback(modelId, model);

      // Train model
      const trainingHistory = await model.train([...trainData, ...validationData]);

      // Evaluate on test data
      const anomalyScore = await model.detectAnomaly([...trainData.slice(-50), ...testData]);
      const testLoss = anomalyScore.score;

      // Save model metadata
      await this.saveModelMetadata({
        id: modelId,
        type: 'anomaly',
        config: model['config'],
        trainingTime: Date.now() - startTime,
        finalLoss: testLoss,
        timestamp: Date.now()
      });

      const result: TrainingResult = {
        success: true,
        epochsCompleted: trainingHistory.epoch.length,
        finalLoss: testLoss,
        finalMetrics: {
          mae: trainingHistory.history.mae[trainingHistory.history.mae.length - 1] as number,
          threshold: anomalyScore.threshold,
          confidence: anomalyScore.confidence
        },
        trainingTime: Date.now() - startTime,
        modelPath: `anomaly_${modelId}`,
        checkpoints
      };

      model.dispose();
      return result;

    } catch (error) {
      console.error('Anomaly model training failed:', error);
      return {
        success: false,
        epochsCompleted: 0,
        finalLoss: Infinity,
        finalMetrics: {},
        trainingTime: Date.now() - startTime,
        modelPath: '',
        checkpoints
      };
    }
  }

  /**
   * Train clustering model
   */
  async trainClusteringModel(
    modelId: string,
    cellHistories: Map<string, number[]>,
    config?: Partial<ClusteringModelConfig>
  ): Promise<TrainingResult> {
    const startTime = Date.now();
    const checkpoints: string[] = [];

    try {
      // Prepare data
      const { trainData, testData } = this.prepareClusteringData(cellHistories);

      // Create model
      const model = new ClusteringModel(config);

      // Train model
      const result = await model.fit(trainData);

      // Evaluate on test data
      const testResult = await model.fit(testData);

      // Save model metadata
      await this.saveModelMetadata({
        id: modelId,
        type: 'clustering',
        config: model['config'],
        trainingTime: Date.now() - startTime,
        finalLoss: 1 - testResult.silhouetteScore,
        timestamp: Date.now()
      });

      const trainingResult: TrainingResult = {
        success: true,
        epochsCompleted: 1,
        finalLoss: 1 - result.silhouetteScore,
        finalMetrics: {
          silhouetteScore: result.silhouetteScore,
          optimalK: result.optimalK,
          numClusters: result.clusters.length
        },
        trainingTime: Date.now() - startTime,
        modelPath: `clustering_${modelId}`,
        checkpoints
      };

      model.dispose();
      return trainingResult;

    } catch (error) {
      console.error('Clustering model training failed:', error);
      return {
        success: false,
        epochsCompleted: 0,
        finalLoss: Infinity,
        finalMetrics: {},
        trainingTime: Date.now() - startTime,
        modelPath: '',
        checkpoints
      };
    }
  }

  /**
   * Setup progress callback
   */
  private setupProgressCallback(modelId: string, model: any): void {
    // Note: This is a simplified version
    // In production, integrate with model's training callbacks
  }

  /**
   * Calculate prediction loss
   */
  private calculatePredictionLoss(actual: number[], predicted: number[]): number {
    const n = Math.min(actual.length, predicted.length);
    let sumSquaredError = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - predicted[i];
      sumSquaredError += error * error;
    }

    return sumSquaredError / n;
  }

  /**
   * Save model metadata to IndexedDB
   */
  private async saveModelMetadata(metadata: any): Promise<void> {
    const transaction = this.db!.transaction(['models'], 'readwrite');
    const store = transaction.objectStore('models');
    store.put(metadata);
  }

  /**
   * Save training checkpoint
   */
  async saveCheckpoint(
    modelId: string,
    epoch: number,
    model: any
  ): Promise<void> {
    const checkpointId = `${modelId}_epoch_${epoch}`;

    // Save model
    await model.saveModel(checkpointId);

    // Save checkpoint metadata
    const transaction = this.db!.transaction(['checkpoints'], 'readwrite');
    const store = transaction.objectStore('checkpoints');
    store.put({
      id: checkpointId,
      modelId,
      epoch,
      timestamp: Date.now()
    });
  }

  /**
   * Load training checkpoint
   */
  async loadCheckpoint(checkpointId: string): Promise<any> {
    const transaction = this.db!.transaction(['checkpoints'], 'readonly');
    const store = transaction.objectStore('checkpoints');
    const request = store.get(checkpointId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Log training progress
   */
  async logTrainingProgress(
    modelId: string,
    progress: TrainingProgress
  ): Promise<void> {
    const transaction = this.db!.transaction(['logs'], 'readwrite');
    const store = transaction.objectStore('logs');
    store.add({
      modelId,
      ...progress
    });
  }

  /**
   * Get training history
   */
  async getTrainingHistory(modelId: string): Promise<TrainingProgress[]> {
    const transaction = this.db!.transaction(['logs'], 'readonly');
    const store = transaction.objectStore('logs');
    const index = store.index('modelId');
    const request = index.getAll(modelId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Hyperparameter logging
   */
  async logHyperparameters(
    modelId: string,
    config: any,
    results: TrainingResult
  ): Promise<void> {
    const transaction = this.db!.transaction(['logs'], 'readwrite');
    const store = transaction.objectStore('logs');
    store.add({
      modelId,
      type: 'hyperparameters',
      config,
      results,
      timestamp: Date.now()
    });
  }

  /**
   * Batch training for multiple models
   */
  async batchTrain(configs: TrainingConfig[]): Promise<TrainingResult[]> {
    const results: TrainingResult[] = [];

    for (const config of configs) {
      const modelId = `${config.modelType}_${Date.now()}`;

      let result: TrainingResult;
      switch (config.modelType) {
        case 'trend':
          // Assumes history is provided in config
          result = await this.trainTrendModel(modelId, [], config.modelConfig as any);
          break;
        case 'anomaly':
          result = await this.trainAnomalyModel(modelId, [], config.modelConfig as any);
          break;
        case 'clustering':
          result = await this.trainClusteringModel(modelId, new Map(), config.modelConfig as any);
          break;
        default:
          result = {
            success: false,
            epochsCompleted: 0,
            finalLoss: Infinity,
            finalMetrics: {},
            trainingTime: 0,
            modelPath: '',
            checkpoints: []
          };
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.progressCallbacks.clear();
  }
}

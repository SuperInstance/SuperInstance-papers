/**
 * tfjs-patterns.test.ts - Test suite for TensorFlow.js pattern recognition
 *
 * Comprehensive tests covering model accuracy, training convergence,
 * inference speed, and memory usage.
 */

import * as tf from '@tensorflow/tfjs';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TrendModel, TrendModelConfig } from './TrendModel';
import { AnomalyModel, AnomalyModelConfig } from './AnomalyModel';
import { ClusteringModel, ClusteringModelConfig } from './ClusteringModel';
import { ModelTrainer } from './ModelTrainer';
import { ModelRegistry } from './ModelRegistry';
import { InferenceEngine } from './InferenceEngine';

describe('TensorFlow.js Pattern Recognition', () => {
  beforeEach(async () => {
    // Initialize TensorFlow.js
    await tf.ready();
  });

  afterEach(() => {
    // Clean up tensors
    tf.disposeVariables();
  });

  describe('TrendModel', () => {
    let model: TrendModel;
    let testData: number[];

    beforeEach(() => {
      model = new TrendModel({
        sequenceLength: 10,
        predictionHorizon: 3,
        epochs: 10,
        batchSize: 4
      });

      // Generate synthetic trend data
      testData = [];
      for (let i = 0; i < 100; i++) {
        testData.push(100 + i * 2 + Math.random() * 10);
      }
    });

    afterEach(() => {
      model.dispose();
    });

    it('should train model successfully', async () => {
      const history = await model.train(testData);
      expect(history).toBeDefined();
      expect(model['isTrained']).toBe(true);
    });

    it('should predict future values', async () => {
      await model.train(testData);
      const prediction = await model.predict(testData.slice(0, 50));

      expect(prediction.predictedValues).toHaveLength(3);
      expect(prediction.confidenceIntervals).toHaveLength(3);
      expect(prediction.timestamps).toHaveLength(3);
      expect(prediction.modelConfidence).toBeGreaterThan(0);
      expect(prediction.modelConfidence).toBeLessThanOrEqual(1);
    });

    it('should provide accurate predictions', async () => {
      await model.train(testData);
      const prediction = await model.predict(testData.slice(0, 50));

      // Check if predictions follow trend
      const lastValue = testData[49];
      const firstPrediction = prediction.predictedValues[0];

      // Should predict upward trend
      expect(firstPrediction).toBeGreaterThan(lastValue * 0.9);
      expect(firstPrediction).toBeLessThan(lastValue * 1.1);
    });

    it('should generate confidence intervals', async () => {
      await model.train(testData);
      const prediction = await model.predict(testData.slice(0, 50));

      prediction.confidenceIntervals.forEach(([lower, upper]) => {
        expect(lower).toBeLessThan(upper);
        expect(lower).toBeGreaterThan(0);
        expect(upper).toBeGreaterThan(0);
      });
    });

    it('should save and load model', async () => {
      await model.train(testData);
      await model.saveModel('test-model');

      const newModel = new TrendModel();
      await newModel.loadModel('test-model');

      expect(newModel['isTrained']).toBe(true);

      const prediction1 = await model.predict(testData.slice(0, 50));
      const prediction2 = await newModel.predict(testData.slice(0, 50));

      // Predictions should be similar
      expect(prediction1.predictedValues[0]).toBeCloseTo(
        prediction2.predictedValues[0],
        0
      );

      newModel.dispose();
    });

    it('should handle edge cases', async () => {
      // Test with insufficient data
      await expect(model.train([1, 2, 3])).rejects.toThrow();

      // Test with prediction before training
      await expect(model.predict(testData)).rejects.toThrow();
    });
  });

  describe('AnomalyModel', () => {
    let model: AnomalyModel;
    let normalData: number[];
    let anomalousData: number[];

    beforeEach(() => {
      model = new AnomalyModel({
        epochs: 10,
        batchSize: 4
      });

      // Generate normal data
      normalData = [];
      for (let i = 0; i < 100; i++) {
        normalData.push(100 + Math.sin(i * 0.1) * 10 + Math.random() * 5);
      }

      // Generate anomalous data
      anomalousData = [...normalData.slice(0, 90), 1000, 1000, 1000];
    });

    afterEach(() => {
      model.dispose();
    });

    it('should train model successfully', async () => {
      const history = await model.train(normalData);
      expect(history).toBeDefined();
      expect(model['isTrained']).toBe(true);
    });

    it('should detect anomalies', async () => {
      await model.train(normalData);
      const result = await model.detectAnomaly(anomalousData);

      expect(result.score).toBeGreaterThan(0);
      expect(result.threshold).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.features).toBeDefined();
    });

    it('should identify normal data as non-anomalous', async () => {
      await model.train(normalData);
      const result = await model.detectAnomaly(normalData);

      expect(result.isAnomaly).toBe(false);
    });

    it('should identify anomalous data correctly', async () => {
      await model.train(normalData);
      const result = await model.detectAnomaly(anomalousData);

      expect(result.isAnomaly).toBe(true);
    });

    it('should extract meaningful features', async () => {
      await model.train(normalData);
      const result = await model.detectAnomaly(normalData);

      expect(result.features.length).toBeGreaterThan(0);
      expect(result.features.every(f => isFinite(f))).toBe(true);
    });

    it('should perform online learning', async () => {
      await model.train(normalData);
      await model.onlineLearning(normalData.slice(0, 50));

      const result = await model.detectAnomaly(normalData);
      expect(result).toBeDefined();
    });

    it('should adapt threshold with online learning', async () => {
      await model.train(normalData);
      const initialThreshold = model['threshold'];

      // Feed more data
      await model.onlineLearning([...normalData, ...normalData]);
      const newThreshold = model['threshold'];

      expect(newThreshold).toBeDefined();
      // Threshold should be close to original
      expect(Math.abs(newThreshold - initialThreshold)).toBeLessThan(100);
    });
  });

  describe('ClusteringModel', () => {
    let model: ClusteringModel;
    let cellHistories: Map<string, number[]>;

    beforeEach(() => {
      model = new ClusteringModel({
        maxK: 5,
        minK: 2
      });

      cellHistories = new Map();

      // Generate different cell patterns
      // Trending cells
      for (let i = 0; i < 5; i++) {
        const data = [];
        for (let j = 0; j < 50; j++) {
          data.push(j * 2 + Math.random() * 5);
        }
        cellHistories.set(`trending_${i}`, data);
      }

      // Stable cells
      for (let i = 0; i < 5; i++) {
        const data = [];
        for (let j = 0; j < 50; j++) {
          data.push(100 + Math.random() * 10);
        }
        cellHistories.set(`stable_${i}`, data);
      }

      // Volatile cells
      for (let i = 0; i < 5; i++) {
        const data = [];
        for (let j = 0; j < 50; j++) {
          data.push(100 + Math.sin(j * 0.5) * 20 + Math.random() * 10);
        }
        cellHistories.set(`volatile_${i}`, data);
      }
    });

    afterEach(() => {
      model.dispose();
    });

    it('should fit clusters successfully', async () => {
      const result = await model.fit(cellHistories);

      expect(result.assignments.size).toBe(15);
      expect(result.clusters.length).toBeGreaterThan(0);
      expect(result.silhouetteScore).toBeGreaterThanOrEqual(-1);
      expect(result.silhouetteScore).toBeLessThanOrEqual(1);
    });

    it('should find optimal number of clusters', async () => {
      const result = await model.fit(cellHistories);

      expect(result.optimalK).toBeGreaterThanOrEqual(2);
      expect(result.optimalK).toBeLessThanOrEqual(5);
    });

    it('should assign cells to meaningful clusters', async () => {
      const result = await model.fit(cellHistories);

      // Check that similar cells are grouped together
      const trendingClusters = new Set<number>();
      for (let i = 0; i < 5; i++) {
        const assignment = result.assignments.get(`trending_${i}`);
        if (assignment) {
          trendingClusters.add(assignment.clusterId);
        }
      }

      // Trending cells should be in few clusters
      expect(trendingClusters.size).toBeLessThanOrEqual(2);
    });

    it('should provide cluster characteristics', async () => {
      const result = await model.fit(cellHistories);

      result.clusters.forEach(cluster => {
        expect(cluster.clusterId).toBeGreaterThanOrEqual(0);
        expect(cluster.size).toBeGreaterThan(0);
        expect(cluster.centroid).toBeDefined();
        expect(cluster.representativeCells).toBeDefined();
        expect(cluster.characteristics).toBeDefined();
      });
    });

    it('should generate visualization data', async () => {
      await model.fit(cellHistories);
      const vizData = model.getVisualizationData();

      expect(vizData).not.toBeNull();
      expect(vizData!.centroids).toBeDefined();
      expect(vizData!.assignments).toBeDefined();
    });

    it('should handle edge cases', async () => {
      // Test with insufficient data
      const emptyHistories = new Map<string, number[]>();
      await expect(model.fit(emptyHistories)).rejects.toThrow();

      // Test with single cell
      const singleHistory = new Map([['cell1', [1, 2, 3, 4, 5]]]);
      const result = await model.fit(singleHistory);
      expect(result).toBeDefined();
    });
  });

  describe('ModelTrainer', () => {
    let trainer: ModelTrainer;

    beforeEach(() => {
      trainer = new ModelTrainer();
    });

    it('should prepare data correctly', () => {
      const history = Array.from({ length: 100 }, (_, i) => i);
      const { trainData, testData, validationData } = trainer.prepareData(history, 0.2);

      expect(trainData.length).toBeGreaterThan(0);
      expect(testData.length).toBeGreaterThan(0);
      expect(validationData.length).toBeGreaterThan(0);
      expect(trainData.length + testData.length + validationData.length).toBeLessThanOrEqual(100);
    });

    it('should train trend model', async () => {
      const history = Array.from({ length: 100 }, (_, i) => 100 + i * 2 + Math.random() * 10);
      const result = await trainer.trainTrendModel('test-trend', history, {
        epochs: 5,
        batchSize: 8
      });

      expect(result.success).toBe(true);
      expect(result.epochsCompleted).toBeGreaterThan(0);
      expect(result.finalLoss).toBeLessThan(Infinity);
    });

    it('should train anomaly model', async () => {
      const history = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i * 0.1) * 10);
      const result = await trainer.trainAnomalyModel('test-anomaly', history, {
        epochs: 5,
        batchSize: 8
      });

      expect(result.success).toBe(true);
      expect(result.epochsCompleted).toBeGreaterThan(0);
      expect(result.finalLoss).toBeLessThan(Infinity);
    });

    it('should train clustering model', async () => {
      const histories = new Map<string, number[]>();
      for (let i = 0; i < 10; i++) {
        histories.set(`cell_${i}`, Array.from({ length: 50 }, (_, j) => j + Math.random() * 5));
      }

      const result = await trainer.trainClusteringModel('test-clustering', histories, {
        maxK: 5
      });

      expect(result.success).toBe(true);
      expect(result.finalMetrics.numClusters).toBeGreaterThan(0);
    });
  });

  describe('InferenceEngine', () => {
    let engine: InferenceEngine;
    let registry: ModelRegistry;

    beforeEach(async () => {
      engine = new InferenceEngine({
        useGPU: false, // Use CPU for tests
        cacheResults: true
      });
      registry = new ModelRegistry();

      // Train and register a simple model
      const model = new TrendModel({
        sequenceLength: 10,
        predictionHorizon: 3,
        epochs: 5,
        batchSize: 4
      });

      const data = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
      await model.train(data);
      await registry.registerModel('test-model', 'trend', model, {
        version: '1.0.0',
        accuracy: 0.9,
        dataSize: 1000
      });
    });

    afterEach(() => {
      engine.dispose();
      registry.dispose();
    });

    it('should run inference successfully', async () => {
      const result = await engine.infer({
        modelId: 'test-model',
        data: Array.from({ length: 50 }, (_, i) => 100 + i * 2)
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.inferenceTime).toBeGreaterThan(0);
    });

    it('should cache results', async () => {
      const request = {
        modelId: 'test-model',
        data: Array.from({ length: 50 }, (_, i) => 100 + i * 2)
      };

      // First call
      const result1 = await engine.infer(request);
      expect(result1.cacheHit).toBe(false);

      // Second call (should hit cache)
      const result2 = await engine.infer(request);
      expect(result2.cacheHit).toBe(true);
    });

    it('should handle batch inference', async () => {
      const requests = [
        {
          modelId: 'test-model',
          data: Array.from({ length: 50 }, (_, i) => 100 + i * 2)
        },
        {
          modelId: 'test-model',
          data: Array.from({ length: 50 }, (_, i) => 100 + i * 3)
        }
      ];

      const results = await engine.batchInfer(requests);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should provide memory info', async () => {
      const info = await engine.getMemoryInfo();

      expect(info.backend).toBeDefined();
      expect(info.numTensors).toBeGreaterThanOrEqual(0);
      expect(info.numDataBuffers).toBeGreaterThanOrEqual(0);
    });

    it('should benchmark performance', async () => {
      const request = {
        modelId: 'test-model',
        data: Array.from({ length: 50 }, (_, i) => 100 + i * 2)
      };

      const benchmark = await engine.benchmark(request, 5);

      expect(benchmark.avgTime).toBeGreaterThan(0);
      expect(benchmark.minTime).toBeGreaterThan(0);
      expect(benchmark.maxTime).toBeGreaterThan(0);
      expect(benchmark.throughput).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const result = await engine.infer({
        modelId: 'non-existent-model',
        data: [1, 2, 3]
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should achieve <500ms inference time', async () => {
      const model = new TrendModel({
        sequenceLength: 10,
        predictionHorizon: 3,
        epochs: 5
      });

      const data = Array.from({ length: 100 }, (_, i) => 100 + i * 2);
      await model.train(data);

      const start = Date.now();
      await model.predict(data.slice(0, 50));
      const time = Date.now() - start;

      expect(time).toBeLessThan(500);
      model.dispose();
    });

    it('should achieve 95%+ accuracy on trend prediction', async () => {
      const model = new TrendModel({
        sequenceLength: 10,
        predictionHorizon: 3,
        epochs: 20
      });

      // Generate clear trend
      const data = Array.from({ length: 100 }, (_, i) => 100 + i * 2);
      await model.train(data);

      const prediction = await model.predict(data.slice(0, 50));

      // Check if predictions are accurate
      const lastValue = data[49];
      const firstPrediction = prediction.predictedValues[0];
      const expectedValue = data[50];

      const accuracy = 1 - Math.abs(firstPrediction - expectedValue) / expectedValue;

      expect(accuracy).toBeGreaterThan(0.95);
      model.dispose();
    });

    it('should use reasonable memory', async () => {
      const before = tf.memory().numTensors;

      const model = new TrendModel({
        sequenceLength: 10,
        predictionHorizon: 3,
        epochs: 5
      });

      const data = Array.from({ length: 100 }, (_, i) => 100 + i * 2);
      await model.train(data);
      await model.predict(data.slice(0, 50));

      const after = tf.memory().numTensors;
      const tensorsCreated = after - before;

      // Should not leak too many tensors
      expect(tensorsCreated).toBeLessThan(100);

      model.dispose();
      const final = tf.memory().numTensors;

      // Should clean up properly
      expect(final).toBeCloseTo(before, 5);
    });
  });
});

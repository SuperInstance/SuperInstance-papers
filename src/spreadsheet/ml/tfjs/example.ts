/**
 * Example usage of TensorFlow.js pattern recognition models
 *
 * This example demonstrates how to use the various ML models
 * for spreadsheet cell pattern recognition.
 */

import {
  TrendModel,
  AnomalyModel,
  ClusteringModel,
  InferenceEngine,
  ModelRegistry,
  ModelTrainer
} from './index';

/**
 * Example 1: Trend Prediction
 */
async function trendPredictionExample() {
  console.log('=== Trend Prediction Example ===\n');

  // Create model
  const model = new TrendModel({
    sequenceLength: 20,
    predictionHorizon: 5,
    epochs: 50,
    batchSize: 16
  });

  // Generate synthetic trend data
  const history = [];
  for (let i = 0; i < 100; i++) {
    history.push(100 + i * 2 + Math.random() * 10);
  }

  console.log('Training model on 100 data points...');
  await model.train(history);
  console.log('Training complete!\n');

  // Make predictions
  const prediction = await model.predict(history.slice(0, 50));

  console.log('Predictions:');
  prediction.predictedValues.forEach((value, i) => {
    const [lower, upper] = prediction.confidenceIntervals[i];
    console.log(`  Step ${i + 1}: ${value.toFixed(2)} (${lower.toFixed(2)} - ${upper.toFixed(2)})`);
  });

  console.log(`\nModel confidence: ${(prediction.modelConfidence * 100).toFixed(1)}%`);
  console.log(`Inference time: <500ms target`);

  model.dispose();
}

/**
 * Example 2: Anomaly Detection
 */
async function anomalyDetectionExample() {
  console.log('\n=== Anomaly Detection Example ===\n');

  // Create model
  const model = new AnomalyModel({
    encodingDim: [32, 16, 8],
    epochs: 50,
    thresholdPercentile: 95
  });

  // Generate normal data
  const normalData = [];
  for (let i = 0; i < 100; i++) {
    normalData.push(100 + Math.sin(i * 0.1) * 10 + Math.random() * 5);
  }

  console.log('Training on normal patterns...');
  await model.train(normalData);
  console.log('Training complete!\n');

  // Test with normal data
  const normalResult = await model.detectAnomaly(normalData);
  console.log('Normal data test:');
  console.log(`  Anomaly: ${normalResult.isAnomaly ? 'YES' : 'NO'}`);
  console.log(`  Score: ${normalResult.score.toFixed(4)}`);
  console.log(`  Threshold: ${normalResult.threshold.toFixed(4)}`);
  console.log(`  Confidence: ${(normalResult.confidence * 100).toFixed(1)}%`);

  // Test with anomalous data
  const anomalousData = [...normalData.slice(0, 90), 500, 500, 500];
  const anomalousResult = await model.detectAnomaly(anomalousData);
  console.log('\nAnomalous data test:');
  console.log(`  Anomaly: ${anomalousResult.isAnomaly ? 'YES' : 'NO'}`);
  console.log(`  Score: ${anomalousResult.score.toFixed(4)}`);
  console.log(`  Threshold: ${anomalousResult.threshold.toFixed(4)}`);
  console.log(`  Confidence: ${(anomalousResult.confidence * 100).toFixed(1)}%`);

  model.dispose();
}

/**
 * Example 3: Cell Clustering
 */
async function clusteringExample() {
  console.log('\n=== Cell Clustering Example ===\n');

  // Create model
  const model = new ClusteringModel({
    maxK: 5,
    minK: 2
  });

  // Generate different cell patterns
  const cellHistories = new Map<string, number[]>();

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

  console.log('Clustering 15 cells with different patterns...');
  const result = await model.fit(cellHistories);
  console.log('Clustering complete!\n');

  console.log(`Optimal number of clusters: ${result.optimalK}`);
  console.log(`Silhouette score: ${result.silhouetteScore.toFixed(3)}`);
  console.log('\nCluster assignments:');

  result.assignments.forEach((assignment, cellId) => {
    console.log(`  ${cellId}: Cluster ${assignment.clusterId} (confidence: ${(assignment.confidence * 100).toFixed(1)}%)`);
  });

  console.log('\nCluster characteristics:');
  result.clusters.forEach(cluster => {
    console.log(`\n  Cluster ${cluster.clusterId}:`);
    console.log(`    Size: ${cluster.size} cells`);
    console.log(`    Characteristics: ${cluster.characteristics.join(', ') || 'none'}`);
    console.log(`    Representative cells: ${cluster.representativeCells.slice(0, 3).join(', ')}`);
  });

  model.dispose();
}

/**
 * Example 4: Using the Inference Engine
 */
async function inferenceEngineExample() {
  console.log('\n=== Inference Engine Example ===\n');

  // Create engine
  const engine = new InferenceEngine({
    useGPU: true,
    cacheResults: true
  });

  // Create and train a model
  const model = new TrendModel({
    sequenceLength: 20,
    predictionHorizon: 5,
    epochs: 20
  });

  const history = [];
  for (let i = 0; i < 100; i++) {
    history.push(100 + i * 2 + Math.random() * 10);
  }

  console.log('Training model...');
  await model.train(history);

  // Register model
  const registry = new ModelRegistry();
  await registry.registerModel('example-trend', 'trend', model, {
    version: '1.0.0',
    accuracy: 0.92,
    description: 'Example trend model'
  });

  console.log('Model registered!\n');

  // Run inference
  console.log('Running inference...');
  const result = await engine.infer({
    modelId: 'example-trend',
    data: history.slice(0, 50)
  });

  if (result.success) {
    console.log('Inference successful!');
    console.log(`  Time: ${result.inferenceTime}ms`);
    console.log(`  Cached: ${result.cacheHit}`);
    console.log(`  Version: ${result.modelVersion}`);
    console.log('\nPredictions:');
    result.result.predictedValues.forEach((value: number, i: number) => {
      console.log(`    Step ${i + 1}: ${value.toFixed(2)}`);
    });
  }

  // Benchmark performance
  console.log('\nRunning benchmark...');
  const benchmark = await engine.benchmark({
    modelId: 'example-trend',
    data: history.slice(0, 50)
  }, 10);

  console.log('Benchmark results:');
  console.log(`  Average time: ${benchmark.avgTime.toFixed(2)}ms`);
  console.log(`  Min time: ${benchmark.minTime.toFixed(2)}ms`);
  console.log(`  Max time: ${benchmark.maxTime.toFixed(2)}ms`);
  console.log(`  Throughput: ${benchmark.throughput.toFixed(2)} predictions/second`);

  // Memory info
  const memory = await engine.getMemoryInfo();
  console.log('\nMemory usage:');
  console.log(`  Backend: ${memory.backend}`);
  console.log(`  Tensors: ${memory.numTensors}`);
  console.log(`  Data buffers: ${memory.numDataBuffers}`);

  model.dispose();
  engine.dispose();
  registry.dispose();
}

/**
 * Example 5: Batch Processing
 */
async function batchProcessingExample() {
  console.log('\n=== Batch Processing Example ===\n');

  // Create engine
  const engine = new InferenceEngine({
    useGPU: true,
    batchSize: 32
  });

  // Create model
  const model = new TrendModel({
    sequenceLength: 20,
    predictionHorizon: 5,
    epochs: 20
  });

  const history = [];
  for (let i = 0; i < 100; i++) {
    history.push(100 + i * 2 + Math.random() * 10);
  }

  await model.train(history);

  // Register model
  const registry = new ModelRegistry();
  await registry.registerModel('batch-model', 'trend', model, {
    version: '1.0.0',
    accuracy: 0.90
  });

  // Prepare batch requests
  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push({
      modelId: 'batch-model',
      data: history.slice(i * 5, i * 5 + 50)
    });
  }

  console.log(`Processing ${requests.length} requests in batch...`);
  const startTime = Date.now();
  const results = await engine.batchInfer(requests);
  const totalTime = Date.now() - startTime;

  console.log(`Batch processing complete in ${totalTime}ms`);
  console.log(`Average time per request: ${(totalTime / requests.length).toFixed(2)}ms`);
  console.log(`Successful: ${results.filter(r => r.success).length}/${results.length}`);

  model.dispose();
  engine.dispose();
  registry.dispose();
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await trendPredictionExample();
    await anomalyDetectionExample();
    await clusteringExample();
    await inferenceEngineExample();
    await batchProcessingExample();

    console.log('\n=== All Examples Complete! ===');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  trendPredictionExample,
  anomalyDetectionExample,
  clusteringExample,
  inferenceEngineExample,
  batchProcessingExample
};

# TensorFlow.js Pattern Recognition - Quick Start Guide

Get up and running with pattern recognition in 5 minutes!

## Installation

```bash
# Install dependencies
npm install

# TensorFlow.js is already included in package.json
```

## Your First Prediction (2 minutes)

```typescript
import { TrendModel } from './src/spreadsheet/ml/tfjs';

// 1. Create a model
const model = new TrendModel({
  sequenceLength: 10,    // Look at last 10 values
  predictionHorizon: 3,  // Predict next 3 values
  epochs: 20             // Quick training
});

// 2. Prepare your data
const salesData = [100, 105, 102, 108, 110, 107, 112, 115, 113, 118];

// 3. Train
await model.train(salesData);

// 4. Predict
const prediction = await model.predict(salesData);
console.log('Next 3 values:', prediction.predictedValues);
// Output: [120, 122, 125] (example)
```

## Detect Anomalies (2 minutes)

```typescript
import { AnomalyModel } from './src/spreadsheet/ml/tfjs';

// 1. Create model
const model = new AnomalyModel({
  epochs: 20
});

// 2. Train on normal data
const normalData = [100, 102, 98, 101, 99, 103, 97, 102];
await model.train(normalData);

// 3. Check for anomalies
const testData = [...normalData, 500];  // 500 is unusual!
const result = await model.detectAnomaly(testData);

if (result.isAnomaly) {
  console.log('⚠️ Anomaly detected!');
  console.log('Confidence:', result.confidence);
}
```

## Group Similar Cells (1 minute)

```typescript
import { ClusteringModel } from './src/spreadsheet/ml/tfjs';

// 1. Prepare data from multiple cells
const cells = new Map([
  ['A1', [100, 102, 104, 106, 108]],  // Trending up
  ['A2', [100, 98, 102, 99, 101]],    // Stable
  ['B1', [102, 104, 106, 108, 110]]   // Also trending up
]);

// 2. Find clusters
const model = new ClusteringModel();
const result = await model.fit(cells);

// 3. See groupings
result.assignments.forEach((assignment, cellId) => {
  console.log(`${cellId} is in group ${assignment.clusterId}`);
});
// Output:
//   A1 is in group 0
//   A2 is in group 1
//   B1 is in group 0 (same as A1!)
```

## Real-World Example: Sales Forecasting

```typescript
import { TrendModel } from './src/spreadsheet/ml/tfjs';

async function forecastSales() {
  // Your historical sales data
  const monthlySales = [
    45000, 47000, 46000, 49000, 51000,
    50000, 53000, 55000, 54000, 57000
  ];

  // Create and train model
  const model = new TrendModel({
    sequenceLength: 8,
    predictionHorizon: 3,
    epochs: 50
  });

  await model.train(monthlySales);

  // Predict next 3 months
  const prediction = await model.predict(monthlySales);

  console.log('Sales Forecast:');
  prediction.predictedValues.forEach((value, i) => {
    const [lower, upper] = prediction.confidenceIntervals[i];
    console.log(`  Month ${i + 1}: $${value.toFixed(0)} ($${lower.toFixed(0)} - $${upper.toFixed(0)})`);
  });

  // Output:
  //   Month 1: $59000 ($57000 - $61000)
  //   Month 2: $61000 ($59000 - $63000)
  //   Month 3: $63000 ($61000 - $65000)
}

forecastSales();
```

## Real-World Example: Fraud Detection

```typescript
import { AnomalyModel } from './src/spreadsheet/ml/tfjs';

async function detectFraud() {
  // Normal transaction patterns
  const normalTransactions = [
    120.50, 89.99, 250.00, 45.99, 120.50,
    89.99, 310.00, 55.00, 120.50, 89.99
  ];

  // Train on normal data
  const model = new AnomalyModel({
    thresholdPercentile: 95  // Strict threshold
  });

  await model.train(normalTransactions);

  // Monitor new transactions
  const newTransactions = [
    120.50,  // Normal
    89.99,   // Normal
    9999.99  // SUSPICIOUS!
  ];

  for (let i = 0; i < newTransactions.length; i++) {
    const result = await model.detectAnomaly(
      [...normalTransactions.slice(-20), ...newTransactions.slice(0, i + 1)]
    );

    if (result.isAnomaly) {
      console.log(`⚠️ Alert: Unusual transaction of $${newTransactions[i]}`);
      console.log(`   Anomaly score: ${result.score.toFixed(2)}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    }
  }
}

detectFraud();
```

## Performance Tips

### 1. Use GPU Acceleration

```typescript
import { InferenceEngine } from './src/spreadsheet/ml/tfjs';

const engine = new InferenceEngine({
  useGPU: true  // 2-3x faster!
});

const result = await engine.infer({
  modelId: 'my-model',
  data: myData
});
```

### 2. Cache Results

```typescript
const engine = new InferenceEngine({
  cacheResults: true,
  cacheTimeout: 300000  // 5 minutes
});

// First call: ~200ms
const result1 = await engine.infer(request);

// Second call: ~5ms (from cache!)
const result2 = await engine.infer(request);
```

### 3. Batch Processing

```typescript
// Process multiple cells at once
const requests = cellIds.map(id => ({
  modelId: 'trend-model',
  data: getCellHistory(id)
}));

const results = await engine.batchInfer(requests);
// Much faster than individual calls!
```

## Common Patterns

### Pattern 1: Continuous Monitoring

```typescript
// Set up continuous anomaly monitoring
setInterval(async () => {
  const recentData = getRecentCellData();
  const result = await anomalyModel.detectAnomaly(recentData);

  if (result.isAnomaly) {
    sendAlert(result);
  }
}, 60000);  // Check every minute
```

### Pattern 2: Model Persistence

```typescript
// Train once, use many times
await model.train(data);
await model.saveModel('my-trend-model');

// Later, in a new session:
const newModel = new TrendModel();
await newModel.loadModel('my-trend-model');
const prediction = await newModel.predict(newData);
```

### Pattern 3: Confidence Thresholds

```typescript
// Only act when confident
const prediction = await model.predict(data);

if (prediction.modelConfidence > 0.8) {
  takeAction(prediction.predictedValues);
} else {
  requestMoreData();
}
```

## Troubleshooting

### Problem: "Out of memory"

**Solution:** Reduce batch size or sequence length
```typescript
const model = new TrendModel({
  sequenceLength: 10,  // Was 20
  batchSize: 8         // Was 16
});
```

### Problem: "Predictions are inaccurate"

**Solution:** More training data or epochs
```typescript
const model = new TrendModel({
  epochs: 100  // Was 50
});

// Need more data
if (history.length < 50) {
  throw new Error('Need at least 50 data points');
}
```

### Problem: "Training is slow"

**Solution:** Use GPU or reduce epochs
```typescript
// Enable GPU
const engine = new InferenceEngine({ useGPU: true });

// Or reduce for testing
const model = new TrendModel({ epochs: 10 });
```

## Next Steps

1. **Read the full docs**: `README.md` has complete API reference
2. **Run the examples**: `npm run example` to see all models in action
3. **Check the tests**: `tfjs-patterns.test.ts` for usage patterns
4. **Integrate with cells**: See `CellHistory` type for data format

## Browser Requirements

- **Chrome 90+**: Full support (WebGPU + WebGL)
- **Firefox 88+**: Good support (WebGL)
- **Safari 14+**: Good support (WebGL)
- **Edge 90+**: Full support (WebGPU + WebGL)

Need more help? Check:
- Complete README: `src/spreadsheet/ml/tfjs/README.md`
- Example code: `src/spreadsheet/ml/tfjs/example.ts`
- Implementation details: `src/spreadsheet/ml/tfjs/IMPLEMENTATION_SUMMARY.md`

Happy predicting! 🚀

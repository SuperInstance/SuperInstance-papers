# Examples

Real-world examples and use cases for POLLN living spreadsheets.

## Table of Contents

- [Basic Spreadsheet](#basic-spreadsheet) - Simple monitoring
- [Data Pipeline](#data-pipeline) - ETL workflow
- [Real-Time Analytics](#real-time-analytics) - Live dashboard
- [Predictive Model](#predictive-model) - Forecasting
- [Multi-Colony System](#multi-colony-system) - Distributed processing

---

## Basic Spreadsheet

Monitor sales data and alert on significant changes.

### Setup

```typescript
import { Colony, LogCell, TransformCell } from 'polln'

// Create colony
const colony = new Colony('sales-monitor')

// Sales input
const sales = new LogCell('A1', {
  initialValue: 0,
  head: {
    sensation: 'absolute_change',
    threshold: 0.15  // 15% change
  },
  tail: {
    action: 'notify',
    targets: ['sales-team@company.com']
  }
})

// Trend calculation
const trend = new TransformCell('A2', {
  sources: ['A1'],
  transform: (value) => {
    return {
      current: value,
      direction: value > 1000 ? 'up' : 'down',
      status: value > 1500 ? 'high' : 'normal'
    }
  }
})

colony.addCells([sales, trend])
await colony.start()
```

### Usage

```typescript
// Update sales
await sales.update(1200)
console.log(trend.state.value)
// Output: { current: 1200, direction: 'up', status: 'normal' }

// Large change triggers alert
await sales.update(2000)
// Email sent to sales-team@company.com
```

---

## Data Pipeline

ETL workflow: Ingest → Clean → Transform → Aggregate → Output

### Setup

```typescript
import {
  Colony,
  InputCell,
  FilterCell,
  TransformCell,
  AggregateCell,
  OutputCell
} from 'polln'

const colony = new Colony('etl-pipeline')

// 1. Ingest CSV data
const raw = new InputCell('raw-data', {
  source: 'csv',
  path: './transactions.csv',
  refreshInterval: 60000
})

// 2. Filter valid records
const valid = new FilterCell('valid-data', {
  sources: ['raw-data'],
  filter: (record) => record.amount > 0 && record.status === 'complete'
})

// 3. Transform and normalize
const clean = new TransformCell('clean-data', {
  sources: ['valid-data'],
  transform: (records) => {
    return records.map(r => ({
      ...r,
      amount: Math.round(r.amount * 100) / 100,
      date: new Date(r.date).toISOString(),
      category: r.category.toLowerCase()
    }))
  }
})

// 4. Aggregate by category
const byCategory = new AggregateCell('category-totals', {
  sources: ['clean-data'],
  aggregation: 'sum',
  groupBy: 'category',
  field: 'amount'
})

// 5. Output results
const output = new OutputCell('output', {
  sources: ['category-totals'],
  destination: './results/category-totals.json',
  format: 'json'
})

colony.addCells([raw, valid, clean, byCategory, output])
await colony.start()
```

### Input Data (transactions.csv)

```csv
date,description,amount,category,status
2024-03-01,Sale 1,150.50,Electronics,complete
2024-03-01,Sale 2,75.25,Books,complete
2024-03-02,Sale 3,-25.00,Electronics,complete
2024-03-02,Sale 4,200.00,Electronics,complete
```

### Output (category-totals.json)

```json
{
  "electronics": 325.5,
  "books": 75.25
}
```

---

## Real-Time Analytics

Live dashboard with real-time metrics and anomaly detection.

### Setup

```typescript
import {
  Colony,
  InputCell,
  AnalysisCell,
  DecisionCell,
  PredictionCell
} from 'polln'

const colony = new Colony('realtime-analytics')

// Stream metrics from API
const metrics = new InputCell('metrics', {
  source: 'api',
  url: 'https://api.example.com/metrics',
  refreshInterval: 5000
})

// Detect anomalies
const anomalies = new AnalysisCell('anomaly-detector', {
  sources: ['metrics'],
  analysis: 'anomaly',
  method: 'zscore',
  threshold: 3.0,
  window: 100
})

// Make decisions
const decisions = new DecisionCell('decider', {
  sources: ['anomaly-detector'],
  rules: [
    {
      condition: 'anomaly.score > 0.9',
      action: 'critical_alert',
      targets: ['on-call@example.com']
    },
    {
      condition: 'anomaly.score > 0.7',
      action: 'warning',
      targets: ['team@example.com']
    }
  ]
})

// Predict next values
const forecast = new PredictionCell('forecast', {
  sources: ['metrics'],
  model: 'arima',
  horizon: 5,  // Predict 5 steps ahead
  confidence: 0.95
})

colony.addCells([metrics, anomalies, decisions, forecast])
await colony.start()

// Monitor for alerts
setInterval(() => {
  const decision = decisions.state.value
  if (decision.action === 'critical_alert') {
    console.log('🚨 CRITICAL:', decision.reason)
  }
}, 1000)
```

### Dashboard Output

```typescript
{
  "metrics": {
    "cpu": 75,
    "memory": 60,
    "requests": 1000
  },
  "anomalies": {
    "detected": true,
    "score": 0.85,
    "field": "cpu"
  },
  "decision": {
    "action": "warning",
    "reason": "CPU usage elevated"
  },
  "forecast": {
    "next_5_steps": [80, 85, 90, 88, 82],
    "confidence": 0.95
  }
}
```

---

## Predictive Model

Sales forecasting with machine learning.

### Setup

```typescript
import {
  Colony,
  InputCell,
  TransformCell,
  PredictionCell,
  ExplainCell
} from 'polln'

const colony = new Colony('sales-forecast')

// Load historical data
const history = new InputCell('history', {
  source: 'csv',
  path: './historical-sales.csv'
})

// Feature engineering
const features = new TransformCell('features', {
  sources: ['history'],
  transform: (data) => {
    return data.map((row, i) => ({
      ...row,
      dayOfWeek: new Date(row.date).getDay(),
      month: new Date(row.date).getMonth(),
      rollingAvg: calculateRollingAverage(data, i, 7),
      yearOverYear: calculateYoY(data, i)
    }))
  }
})

// Train prediction model
const model = new PredictionCell('model', {
  sources: ['features'],
  model: 'neural',
  features: ['dayOfWeek', 'month', 'rollingAvg', 'yearOverYear'],
  target: 'sales',
  trainTestSplit: 0.8,
  retrainInterval: 604800000  // Retrain weekly
})

// Explain predictions
const explainer = new ExplainCell('explainer', {
  sources: ['model'],
  format: 'natural-language',
  include: {
    reasoning: true,
    confidence: true,
    factors: true
  }
})

colony.addCells([history, features, model, explainer])
await colony.start()
```

### Prediction Output

```typescript
{
  "prediction": {
    "date": "2024-03-16",
    "sales": 15250,
    "confidence": 0.87
  },
  "explanation": {
    "summary": "Sales predicted to be $15,250 with 87% confidence",
    "factors": {
      "dayOfWeek": "Friday (high sales day)",
      "month": "March (seasonal peak)",
      "trend": "Upward trend (+12% vs last month)",
      "yearOverYear": "+8% vs same period last year"
    },
    "reasoning": "Strong forecast due to favorable day-of-week, seasonal peak, and positive trend"
  }
}
```

---

## Multi-Colony System

Distributed processing across multiple colonies.

### Setup

```typescript
import { Colony, LogCell, TransformCell } from 'polln'

// Colony 1: Data ingestion
const ingestion = new Colony('ingestion', {
  location: 'us-east-1'
})

const inputStream = new InputCell('stream', {
  source: 'kafka',
  topic: 'events'
})

const filtered = new FilterCell('filtered', {
  sources: ['stream'],
  filter: (event) => event.type === 'transaction'
})

ingestion.addCells([inputStream, filtered])
await ingestion.start()

// Colony 2: Processing
const processing = new Colony('processing', {
  location: 'us-west-1'
})

const enriched = new TransformCell('enriched', {
  sources: ['ingestion.filtered'],
  transform: (event) => ({
    ...event,
    enriched: true,
    timestamp: Date.now()
  })
})

processing.addCells([enriched])
await processing.start()

// Colony 3: Analytics
const analytics = new Colony('analytics', {
  location: 'eu-west-1'
})

const aggregated = new AggregateCell('metrics', {
  sources: ['processing.enriched'],
  aggregation: 'sum',
  groupBy: 'type',
  field: 'amount'
})

analytics.addCells([aggregated])
await analytics.start()

// Cross-colony communication
ingestion.on('filtered', (data) => {
  processing.updateCell('enriched', data)
})

processing.on('enriched', (data) => {
  analytics.updateCell('metrics', data)
})
```

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ingestion     │───→│   Processing    │───→│   Analytics     │
│   us-east-1     │    │   us-west-1     │    │   eu-west-1     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Kafka Input   │    │ • Enrichment    │    │ • Aggregation   │
│ • Filtering     │    │ • Validation    │    │ • Reporting     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Testing Examples

### Unit Tests

```typescript
import { LogCell } from 'polln'

describe('LogCell', () => {
  it('should update value', async () => {
    const cell = new LogCell('test', { initialValue: 0 })
    await cell.update(100)
    expect(cell.state.value).toBe(100)
  })

  it('should detect threshold exceed', async () => {
    const cell = new LogCell('test', {
      initialValue: 100,
      head: { threshold: 10 }
    })

    await cell.update(120)
    expect(cell.head.lastSensation.detected).toBe(true)
  })
})
```

### Integration Tests

```typescript
import { Colony, TransformCell } from 'polln'

describe('Data Pipeline', () => {
  it('should process end-to-end', async () => {
    const colony = new Colony('test')

    const input = new InputCell('input', {
      source: 'csv',
      path: './test.csv'
    })

    const transform = new TransformCell('transform', {
      sources: ['input'],
      transform: (data) => data.map(x => x * 2)
    })

    colony.addCells([input, transform])
    await colony.start()

    expect(transform.state.value).toEqual([2, 4, 6])
  })
})
```

---

## Next Steps

- [Quick Start](../guide/quick-start) - Get started quickly
- [API Reference](../guide/api/) - Complete API docs
- [Advanced Topics](../guide/advanced/) - Performance, security

---

**More examples?** Check the [GitHub repository](https://github.com/SuperInstance/polln/tree/main/examples) or join our [Discord](https://discord.gg/polln)!

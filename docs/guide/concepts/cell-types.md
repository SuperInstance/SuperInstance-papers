# Cell Types

POLLN provides a rich set of cell types for different purposes. Each cell type is optimized for specific tasks while following the Head/Body/Tail paradigm.

## Core Cell Types

### LogCell
The foundational living cell with full sensation, reasoning, and action capabilities.

**Use Case**: General-purpose intelligent monitoring

```typescript
import { LogCell } from 'polln/spreadsheet'

const cell = new LogCell('A1', {
  initialValue: 100,
  head: {
    sensation: 'absolute_change',
    threshold: 0.15
  },
  body: {
    analyzer: 'basic'
  },
  tail: {
    action: 'notify'
  }
})
```

**Features**:
- Full sensation capabilities
- Configurable analysis
- Action triggers
- History tracking

---

## Input/Output Cells

### InputCell
Receives data from external sources.

**Use Case**: Data ingestion from APIs, files, streams

```typescript
import { InputCell } from 'polln/spreadsheet'

const input = new InputCell('sales-data', {
  source: 'csv',
  path: './data/sales.csv',
  refreshInterval: 60000,  // Every minute
  transform: (row) => ({
    date: new Date(row.date),
    amount: parseFloat(row.amount)
  })
})
```

**Source Types**:
- `csv` - CSV files
- `json` - JSON files
- `api` - REST APIs
- `database` - SQL/NoSQL databases
- `stream` - Real-time streams
- `websocket` - WebSocket connections

---

### OutputCell
Sends data to external destinations.

**Use Case**: Export results, trigger webhooks

```typescript
import { OutputCell } from 'polln/spreadsheet'

const output = new OutputCell('results', {
  sources: ['analysis'],
  destination: './output/results.json',
  format: 'json',
  append: false,
  compression: 'gzip'
})
```

**Destination Types**:
- `file` - Local files
- `api` - REST APIs
- `database` - Databases
- `webhook` - HTTP webhooks
- `email` - Email notifications
- `slack` - Slack messages

---

## Transformation Cells

### TransformCell
Transforms data using custom functions.

**Use Case**: Data cleaning, normalization, conversion

```typescript
import { TransformCell } from 'polln/spreadsheet'

const transform = new TransformCell('clean-data', {
  sources: ['raw-data'],
  transform: (data) => {
    return data
      .filter(item => item.value > 0)
      .map(item => ({
        ...item,
        value: Math.round(item.value * 100) / 100,
        timestamp: new Date(item.date).toISOString()
      }))
  }
})
```

---

### FilterCell
Filters data based on conditions.

**Use Case**: Data subset selection, validation

```typescript
import { FilterCell } from 'polln/spreadsheet'

const filter = new FilterCell('high-value', {
  sources: ['transactions'],
  filter: (data) => {
    return data.filter(item =>
      item.amount > 1000 &&
      item.status === 'approved'
    )
  }
})
```

---

### AggregateCell
Aggregates multiple values into summaries.

**Use Case**: Summarization, statistics, rollups

```typescript
import { AggregateCell } from 'polln/spreadsheet'

const aggregate = new AggregateCell('daily-totals', {
  sources: ['transactions'],
  aggregation: 'sum',  // 'sum', 'avg', 'min', 'max', 'count'
  groupBy: 'date',
  field: 'amount'
})
```

**Aggregation Types**:
- `sum` - Sum of values
- `avg` - Average (mean)
- `min` - Minimum value
- `max` - Maximum value
- `count` - Count of items
- `stddev` - Standard deviation
- `percentile` - Percentile value
- `custom` - Custom aggregation

---

## Validation Cells

### ValidateCell
Validates data against rules.

**Use Case**: Data quality checks, business rules

```typescript
import { ValidateCell } from 'polln/spreadsheet'

const validate = new ValidateCell('validator', {
  sources: ['input-data'],
  rules: [
    {
      field: 'email',
      validator: 'regex',
      pattern: '^[\\w-\\.]+@[\\w-]+\\.[a-z]{2,4}$'
    },
    {
      field: 'age',
      validator: 'range',
      min: 18,
      max: 120
    },
    {
      field: 'required',
      validator: 'required'
    }
  ],
  onFail: 'reject'  // 'reject', 'warn', 'fix'
})
```

**Validator Types**:
- `required` - Field must be present
- `type` - Type checking
- `range` - Numeric range
- `regex` - Pattern matching
- `enum` - Enumerated values
- `custom` - Custom validation function

---

## Analysis Cells

### AnalysisCell
Performs statistical analysis.

**Use Case**: Trends, patterns, anomalies

```typescript
import { AnalysisCell } from 'polln/spreadsheet'

const analysis = new AnalysisCell('analyzer', {
  sources: ['time-series'],
  analysis: 'trend',
  window: 30,
  metrics: ['mean', 'stddev', 'trend', 'seasonality'],
  confidence: 0.95
})
```

**Analysis Types**:
- `trend` - Trend detection
- `anomaly` - Anomaly detection
- `correlation` - Correlation analysis
- `regression` - Regression analysis
- `clustering` - Clustering
- `pattern` - Pattern recognition

---

### PredictionCell
Makes predictions using ML models.

**Use Case**: Forecasting, classification

```typescript
import { PredictionCell } from 'polln/spreadsheet'

const prediction = new PredictionCell('forecaster', {
  sources: ['historical-data'],
  model: 'arima',
  horizon: 7,  // Predict 7 days ahead
  confidence: 0.95,
  retrainInterval: 86400000  // Retrain daily
})
```

**Model Types**:
- `arima` - Time series forecasting
- `linear` - Linear regression
- `neural` - Neural network
- `ensemble` - Ensemble methods
- `custom` - Custom model

---

## Decision Cells

### DecisionCell
Makes decisions based on rules.

**Use Case**: Business logic, workflows

```typescript
import { DecisionCell } from 'polln/spreadsheet'

const decision = new DecisionCell('approver', {
  sources: ['loan-application'],
  rules: [
    {
      condition: 'score > 700 AND income > 50000',
      action: 'approve',
      priority: 'high'
    },
    {
      condition: 'score > 650',
      action: 'review',
      priority: 'medium'
    },
    {
      condition: 'true',
      action: 'reject',
      priority: 'low'
    }
  ]
})
```

**Rule Features**:
- Complex conditions
- Priority levels
- Fallback rules
- Context-aware decisions

---

## Explanation Cells

### ExplainCell
Provides explanations for decisions.

**Use Case**: AI explainability, audit trails

```typescript
import { ExplainCell } from 'polln/spreadsheet'

const explain = new ExplainCell('explainer', {
  sources: ['decision', 'prediction'],
  format: 'natural-language',
  detail: 'full',  // 'brief', 'summary', 'full'
  include: {
    reasoning: true,
    confidence: true,
    alternatives: true,
    evidence: true
  }
})
```

**Output Example**:
```
The loan was approved because:
- Credit score (750) exceeds threshold (700)
- Annual income ($65,000) exceeds requirement ($50,000)
- Debt-to-income ratio (25%) is within acceptable range

Confidence: 92%
```

---

## Cell Type Selection Guide

| Use Case | Recommended Cell |
|----------|------------------|
| Data ingestion | InputCell |
| Data export | OutputCell |
| Cleaning/normalization | TransformCell |
| Filtering | FilterCell |
| Summarization | AggregateCell |
| Validation | ValidateCell |
| Trend analysis | AnalysisCell |
| Forecasting | PredictionCell |
| Business rules | DecisionCell |
| Explainability | ExplainCell |
| General monitoring | LogCell |

## Creating Custom Cells

Extend the base `LogCell` class:

```typescript
import { LogCell } from 'polln/spreadsheet'

class CustomCell extends LogCell {
  constructor(id: string, config: CellConfig) {
    super(id, config)
  }

  protected async process(input: any): Promise<any> {
    // Custom processing logic
    return this.transform(input)
  }

  private transform(data: any): any {
    // Your transformation
    return data
  }
}

// Use it
const custom = new CustomCell('custom', {
  initialValue: {},
  customOption: true
})
```

## Cell Composition

Cells can be composed:

```typescript
// Input → Filter → Transform → Aggregate → Output
const pipeline = [
  new InputCell('input', { source: 'csv', path: 'data.csv' }),
  new FilterCell('filter', {
    sources: ['input'],
    filter: (data) => data.filter(item => item.active)
  }),
  new TransformCell('transform', {
    sources: ['filter'],
    transform: (data) => data.map(item => ({ ...item, processed: true }))
  }),
  new AggregateCell('aggregate', {
    sources: ['transform'],
    aggregation: 'sum',
    field: 'value'
  }),
  new OutputCell('output', {
    sources: ['aggregate'],
    destination: './result.json'
  })
]
```

## Performance Considerations

### Memory Usage
- Large datasets: Use `AggregateCell` with streaming
- Real-time: Use `InputCell` with polling
- Batch: Use `TransformCell` with batch processing

### CPU Usage
- Complex transformations: Consider `AnalysisCell` with caching
- ML models: Use `PredictionCell` with model optimization
- Rules: Use `DecisionCell` with indexed rules

### Network
- API calls: Use `InputCell` with retry logic
- Webhooks: Use `OutputCell` with batching
- Streaming: Use `InputCell` with backpressure

## Next Steps

- [Sensation Types](./sensation) - Configure sensation
- [API Reference](../api/) - Complete API docs
- [Examples](../../examples/) - Real-world examples

---

**Need a specific cell type?** Check the [API Reference](../api/) or [create a custom cell](#creating-custom-cells)!

# Cell Reference

Complete reference for all POLLN cell types, their configuration options, and usage patterns.

## Quick Reference

| Cell Type | Package | Purpose |
|-----------|---------|---------|
| [LogCell](#logcell) | `polln/spreadsheet` | Foundation cell with full sensation/reasoning/action |
| [InputCell](#inputcell) | `polln/spreadsheet` | Ingest data from external sources |
| [OutputCell](#outputcell) | `polln/spreadsheet` | Export data to external destinations |
| [TransformCell](#transformcell) | `polln/spreadsheet` | Transform data using functions |
| [FilterCell](#filtercell) | `polln/spreadsheet` | Filter data based on conditions |
| [AggregateCell](#aggregatecell) | `polln/spreadsheet` | Aggregate multiple values |
| [ValidateCell](#validatecell) | `polln/spreadsheet` | Validate data against rules |
| [AnalysisCell](#analysiscell) | `polln/spreadsheet` | Statistical analysis |
| [PredictionCell](#predictioncell) | `polln/spreadsheet` | ML-based predictions |
| [DecisionCell](#decisioncell) | `polln/spreadsheet` | Rule-based decisions |
| [ExplainCell](#explaincell) | `polln/spreadsheet` | Explain decisions/predictions |

---

## LogCell

The foundational living cell.

### Import

```typescript
import { LogCell } from 'polln/spreadsheet'
```

### Constructor

```typescript
new LogCell(id: string, config: LogCellConfig)
```

### Configuration

```typescript
interface LogCellConfig {
  // Initial value
  initialValue?: any

  // Head (Sensation)
  head?: {
    sensation?: SensationType
    threshold?: number
    sources?: string[]
    debounce?: number
  }

  // Body (Processing)
  body?: {
    analyzer?: AnalyzerType
    rules?: Rule[]
    learning?: LearningConfig
  }

  // Tail (Action)
  tail?: {
    action?: ActionType
    targets?: string[]
    format?: string
  }
}
```

### Example

```typescript
const cell = new LogCell('monitor', {
  initialValue: 100,
  head: {
    sensation: 'absolute_change',
    threshold: 15
  },
  body: {
    analyzer: 'statistical'
  },
  tail: {
    action: 'notify',
    targets: ['admin@example.com']
  }
})
```

### Methods

- `update(value: any)` - Update cell value
- `getState()` - Get current state
- `getHistory()` - Get value history
- `reset()` - Reset to initial value

---

## InputCell

Ingest data from external sources.

### Import

```typescript
import { InputCell } from 'polln/spreadsheet'
```

### Configuration

```typescript
interface InputCellConfig {
  source: 'csv' | 'json' | 'api' | 'database' | 'stream' | 'websocket'
  path?: string
  url?: string
  refreshInterval?: number
  transform?: (data: any) => any
  headers?: Record<string, string>
  auth?: AuthConfig
}
```

### Examples

#### CSV Input

```typescript
const csvInput = new InputCell('sales', {
  source: 'csv',
  path: './data/sales.csv',
  refreshInterval: 60000,
  transform: (row) => ({
    ...row,
    amount: parseFloat(row.amount),
    date: new Date(row.date)
  })
})
```

#### API Input

```typescript
const apiInput = new InputCell('weather', {
  source: 'api',
  url: 'https://api.weather.com/data',
  refreshInterval: 300000,  // 5 minutes
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
```

#### WebSocket Input

```typescript
const wsInput = new InputCell('stream', {
  source: 'websocket',
  url: 'wss://api.example.com/stream',
  reconnect: true
})
```

---

## OutputCell

Export data to external destinations.

### Import

```typescript
import { OutputCell } from 'polln/spreadsheet'
```

### Configuration

```typescript
interface OutputCellConfig {
  sources: string[]
  destination: string
  format?: 'json' | 'csv' | 'xml' | 'custom'
  append?: boolean
  compression?: 'gzip' | 'brotli' | 'none'
  batch?: number
  auth?: AuthConfig
}
```

### Examples

#### File Output

```typescript
const fileOutput = new OutputCell('results', {
  sources: ['analysis'],
  destination: './output/results.json',
  format: 'json',
  append: false
})
```

#### Webhook Output

```typescript
const webhookOutput = new OutputCell('webhook', {
  sources: ['events'],
  destination: 'https://api.example.com/webhook',
  format: 'json',
  batch: 10  // Send in batches of 10
})
```

---

## TransformCell

Transform data using custom functions.

### Import

```typescript
import { TransformCell } from 'polln/spreadsheet'
```

### Configuration

```typescript
interface TransformCellConfig {
  sources: string | string[]
  transform: (data: any) => any
  async?: boolean
  cache?: boolean
}
```

### Example

```typescript
const transform = new TransformCell('clean', {
  sources: ['raw-data'],
  transform: (data) => {
    return data
      .filter(item => item.active)
      .map(item => ({
        id: item.id,
        value: Math.round(item.value * 100) / 100
      }))
  }
})
```

---

## FilterCell

Filter data based on conditions.

### Import

```typescript
import { FilterCell } from 'polln/spreadsheet'
```

### Configuration

```typescript
interface FilterCellConfig {
  sources: string | string[]
  filter: (data: any) => boolean
  negate?: boolean
}
```

### Example

```typescript
const filter = new FilterCell('active', {
  sources: ['users'],
  filter: (user) => {
    return user.active && user.lastLogin > thirtyDaysAgo
  }
})
```

---

## AggregateCell

Aggregate multiple values.

### Import

```typescript
import { AggregateCell } from 'polln/spreadsheet'
```

### Configuration

```typescript
interface AggregateCellConfig {
  sources: string | string[]
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'stddev' | 'percentile' | 'custom'
  groupBy?: string
  field?: string
  percentile?: number
  customFn?: (data: any[]) => any
}
```

### Examples

#### Sum

```typescript
const sum = new AggregateCell('total', {
  sources: ['transactions'],
  aggregation: 'sum',
  field: 'amount'
})
```

#### Grouped Average

```typescript
const avgByRegion = new AggregateCell('regional-avg', {
  sources: ['sales'],
  aggregation: 'avg',
  groupBy: 'region',
  field: 'amount'
})
```

#### Percentile

```typescript
const percentile = new AggregateCell('p95', {
  sources: ['response-times'],
  aggregation: 'percentile',
  percentile: 95
})
```

---

## ValidateCell

Validate data against rules.

### Import

```typescript
import { ValidateCell } from 'polln/spreadsheet'
```

### Configuration

```typescript
interface ValidateCellConfig {
  sources: string | string[]
  rules: ValidationRule[]
  onFail?: 'reject' | 'warn' | 'fix'
  stopOnFirstError?: boolean
}
```

### Example

```typescript
const validate = new ValidateCell('validator', {
  sources: ['input'],
  rules: [
    {
      field: 'email',
      validator: 'regex',
      pattern: '^[\\w-\\.]+@[\\w-]+\\.[a-z]{2,4}$',
      message: 'Invalid email format'
    },
    {
      field: 'age',
      validator: 'range',
      min: 18,
      max: 120,
      message: 'Age must be between 18 and 120'
    }
  ],
  onFail: 'reject'
})
```

---

## AnalysisCell

Statistical analysis.

### Import

```typescript
import { AnalysisCell } from 'polln/spreadsheet'
```

### Configuration

```typescript
interface AnalysisCellConfig {
  sources: string | string[]
  analysis: 'trend' | 'anomaly' | 'correlation' | 'regression' | 'clustering' | 'pattern'
  window?: number
  confidence?: number
  metrics?: string[]
}
```

### Example

```typescript
const analysis = new AnalysisCell('trend-analysis', {
  sources: ['time-series'],
  analysis: 'trend',
  window: 30,
  metrics: ['slope', 'intercept', 'r2', 'p-value'],
  confidence: 0.95
})
```

---

## PredictionCell

ML-based predictions.

### Import

```typescript
import { PredictionCell } from 'polln/spreadsheet'
```

### Configuration

```typescript
interface PredictionCellConfig {
  sources: string | string[]
  model: 'arima' | 'linear' | 'neural' | 'ensemble' | 'custom'
  horizon?: number
  confidence?: number
  retrainInterval?: number
  features?: string[]
}
```

### Example

```typescript
const prediction = new PredictionCell('forecast', {
  sources: ['historical-data'],
  model: 'arima',
  horizon: 7,  // Predict 7 days ahead
  confidence: 0.95,
  retrainInterval: 86400000  // Retrain daily
})
```

---

## DecisionCell

Rule-based decisions.

### Import

```typescript
import { DecisionCell } from 'polln/spreadsheet'
```

### Configuration

```typescript
interface DecisionCellConfig {
  sources: string | string[]
  rules: DecisionRule[]
  defaultAction?: string
  explain?: boolean
}
```

### Example

```typescript
const decision = new DecisionCell('approver', {
  sources: ['application'],
  rules: [
    {
      condition: 'score > 700 AND income > 50000',
      action: 'approve',
      priority: 'high',
      reason: 'Excellent credit score and income'
    },
    {
      condition: 'score > 650',
      action: 'review',
      priority: 'medium',
      reason: 'Moderate credit score'
    }
  ],
  defaultAction: 'reject'
})
```

---

## ExplainCell

Explain decisions/predictions.

### Import

```typescript
import { ExplainCell } from 'polln/spreadsheet'
```

### Configuration

```typescript
interface ExplainCellConfig {
  sources: string | string[]
  format: 'brief' | 'summary' | 'full' | 'natural-language'
  detail?: 'low' | 'medium' | 'high'
  include?: {
    reasoning?: boolean
    confidence?: boolean
    alternatives?: boolean
    evidence?: boolean
  }
}
```

### Example

```typescript
const explain = new ExplainCell('explainer', {
  sources: ['decision', 'prediction'],
  format: 'natural-language',
  detail: 'full',
  include: {
    reasoning: true,
    confidence: true,
    alternatives: true,
    evidence: true
  }
})
```

---

## Best Practices

### 1. Choose the Right Cell

```typescript
// ✅ Good: Use InputCell for ingestion
const input = new InputCell('data', { source: 'csv', path: 'data.csv' })

// ❌ Bad: Use LogCell for ingestion
const input = new LogCell('data')  // Not designed for external sources
```

### 2. Configure Sensation Appropriately

```typescript
// ✅ Good: Appropriate threshold
head: { sensation: 'anomaly', threshold: 3.0 }

// ❌ Bad: Arbitrary threshold
head: { sensation: 'anomaly', threshold: 100 }
```

### 3. Handle Errors

```typescript
const cell = new TransformCell('transform', {
  sources: ['input'],
  transform: (data) => {
    try {
      return processData(data)
    } catch (error) {
      console.error('Transform error:', error)
      return null  // Or throw, depending on use case
    }
  }
})
```

### 4. Use Type Safety

```typescript
interface UserData {
  id: string
  name: string
  email: string
}

const userCell = new InputCell<UserData>('users', {
  source: 'api',
  url: '/api/users'
})
```

---

## Next Steps

- [API Reference](../api/) - Complete API docs
- [Examples](../../examples/) - Real-world examples
- [Advanced Topics](../advanced/) - Performance, security

---

**Need more?** Check the [API Reference](../api/) or [Examples](../../examples/)!

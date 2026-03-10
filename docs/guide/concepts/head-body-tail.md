# Head/Body/Tail Paradigm

The Head/Body/Tail paradigm is the foundational architecture of every cell in POLLN. This pattern transforms simple data storage into intelligent, aware entities.

## Overview

```
    HEAD                  BODY                  TAIL
  [Input]  ──────────→ [Process]  ──────────→ [Output]
     │                      │                      │
     │ Sensation            │ Reasoning            │ Action
     ▼                      ▼                      ▼
  • Monitor             • Transform              • Update
  • Detect              • Analyze                • Notify
  • Receive             • Decide                • Trigger
```

## Head: The Sensory Organ

The head is responsible for **sensation** - perceiving changes in the environment.

### Responsibilities

- **Monitoring**: Watching other cells or external sources
- **Detection**: Identifying changes, patterns, anomalies
- **Reception**: Accepting new data
- **Filtering**: Deciding what information matters

### Configuration

```typescript
const cell = new LogCell('A1', {
  head: {
    // What to sense
    sensation: 'absolute_change',  // 'rate_of_change', 'acceleration', etc.

    // When to react
    threshold: 0.15,              // Alert when change exceeds 15%
    debounce: 1000,               // Wait 1s before processing again

    // What to watch
    sources: ['B1', 'C1'],        // Monitor these cells
    sourceType: 'cell',           // 'cell', 'external', 'stream'

    // How to receive
    pollInterval: 5000,           // Poll every 5 seconds
    batchSize: 100                // Process in batches of 100
  }
})
```

### Sensation Modes

```typescript
enum SensationMode {
  ABSOLUTE_CHANGE = 'absolute_change',    // Δvalue
  RATE_OF_CHANGE = 'rate_of_change',      // d/dt
  ACCELERATION = 'acceleration',          // d²/dt²
  PRESENCE = 'presence',                  // exists/doesn't exist
  PATTERN = 'pattern',                    // pattern match
  ANOMALY = 'anomaly'                     // outlier detection
}
```

### Example: Monitoring Head

```typescript
const monitorCell = new LogCell('monitor', {
  head: {
    sensation: 'anomaly',
    sources: ['sensor-data'],
    anomalyDetection: {
      method: 'z-score',
      threshold: 3.0  // 3 standard deviations
    }
  }
})
```

## Body: The Reasoning Engine

The body is responsible for **processing** - transforming inputs into outputs.

### Responsibilities

- **Transformation**: Converting input to output
- **Analysis**: Statistical, logical, or ML-based analysis
- **Decision Making**: Choosing actions based on conditions
- **Learning**: Adapting behavior over time

### Configuration

```typescript
const cell = new LogCell('A1', {
  body: {
    // How to process
    analyzer: 'statistical',       // 'statistical', 'ml', 'rule-based'
    window: 7,                     // 7-day rolling window

    // Analysis parameters
    confidence: 0.95,              // 95% confidence interval
    model: 'arima',                // Time series model

    // Learning
    learning: {
      enabled: true,
      rate: 0.01,                  // Learning rate
      algorithm: 'q-learning'      // Learning algorithm
    },

    // Decision rules
    rules: [
      {
        condition: 'value > threshold',
        action: 'alert',
        priority: 'high'
      }
    ]
  }
})
```

### Processing Types

```typescript
enum ProcessingType {
  TRANSFORM = 'transform',         // Direct transformation
  AGGREGATE = 'aggregate',         // Combine multiple inputs
  FILTER = 'filter',               // Select subset
  ANALYZE = 'analyze',             // Statistical analysis
  PREDICT = 'predict',             // ML prediction
  DECIDE = 'decide'                // Decision making
}
```

### Example: Analyzing Body

```typescript
const analysisCell = new AnalysisCell('analyzer', {
  body: {
    analyzer: 'statistical',
    metrics: ['mean', 'median', 'stddev', 'trend'],
    window: 30,                   // 30-day window
    predictions: {
      enabled: true,
      horizon: 7                  // Predict 7 days ahead
    }
  }
})
```

## Tail: The Actuator

The tail is responsible for **action** - producing effects in the world.

### Responsibilities

- **Output**: Producing results
- **Notification**: Alerting users or systems
- **Triggering**: Initiating actions in other cells
- **Storing**: Persisting data

### Configuration

```typescript
const cell = new LogCell('A1', {
  tail: {
    // What to do
    action: 'notify',             // 'notify', 'update', 'trigger', 'store'

    // Where to send
    targets: ['admin@company.com', 'slack:#alerts'],

    // How to format
    format: 'summary',            // 'summary', 'detailed', 'raw'
    template: 'alert-template',

    // When to act
    condition: 'value > threshold',
    throttle: 60000,              // Max once per minute

    // Retries
    retries: 3,
    backoff: 'exponential'
  }
})
```

### Action Types

```typescript
enum ActionType {
  NOTIFY = 'notify',              // Send notification
  UPDATE = 'update',              // Update another cell
  TRIGGER = 'trigger',            // Trigger workflow
  STORE = 'store',                // Persist to storage
  LOG = 'log',                    // Write to log
  NONE = 'none'                   // No action
}
```

### Example: Acting Tail

```typescript
const alertCell = new LogCell('alerter', {
  tail: {
    action: 'notify',
    targets: [
      { type: 'email', address: 'admin@example.com' },
      { type: 'webhook', url: 'https://api.example.com/alert' }
    ],
    format: 'detailed',
    includeContext: true
  }
})
```

## Complete Cell Example

```typescript
const smartCell = new LogCell('smart-sensor', {
  // HEAD: Monitor and detect
  head: {
    sensation: 'rate_of_change',
    sources: ['temperature-sensor'],
    threshold: 2.0,              // 2° per minute
    window: 5                    // 5-minute window
  },

  // BODY: Analyze and decide
  body: {
    analyzer: 'statistical',
    confidence: 0.99,
    rules: [
      {
        condition: 'rate_of_change > 2.0 AND temperature > 80',
        action: 'emergency_shutdown',
        priority: 'critical'
      },
      {
        condition: 'rate_of_change > 1.0',
        action: 'warning',
        priority: 'high'
      }
    ]
  },

  // TAIL: Act and notify
  tail: {
    action: 'notify',
    targets: ['ops-team@company.com'],
    format: 'detailed',
    includeHistory: true,
    throttle: 300000             // Max once per 5 minutes
  }
})
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CELL EXECUTION FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. HEAD: Sensation                                        │
│      ├─ Monitor sources                                     │
│      ├─ Detect changes                                      │
│      ├─ Apply thresholds                                    │
│      └─ Pass to body →                                      │
│                                                              │
│   2. BODY: Processing                                       │
│      ├─ Receive input from head                             │
│      ├─ Apply transformations                               │
│      ├─ Run analysis                                        │
│      ├─ Make decisions                                      │
│      └─ Pass to tail →                                      │
│                                                              │
│   3. TAIL: Action                                           │
│      ├─ Receive result from body                            │
│      ├─ Format output                                       │
│      ├─ Execute actions                                     │
│      └─ Return results                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Advanced Patterns

### Cascading Heads

```typescript
// Cell A's tail triggers Cell B's head
const cellA = new LogCell('A', {
  tail: { action: 'update', targets: ['B'] }
})

const cellB = new LogCell('B', {
  head: { sources: ['A'] }
})
```

### Multi-Input Bodies

```typescript
const cell = new LogCell('aggregator', {
  head: {
    sources: ['A', 'B', 'C'],
    aggregation: 'weighted_average',
    weights: { A: 0.5, B: 0.3, C: 0.2 }
  }
})
```

### Conditional Tails

```typescript
const cell = new LogCell('conditional', {
  tail: {
    action: 'conditional',
    branches: [
      { condition: 'value > 100', action: 'approve' },
      { condition: 'value > 50', action: 'review' },
      { condition: 'true', action: 'reject' }
    ]
  }
})
```

## Best Practices

### 1. Keep Heads Simple
```typescript
// ✅ Good
head: { sensation: 'anomaly' }

// ❌ Bad
head: {
  sensation: 'complex',
  algorithm: 'neural-network',
  layers: 10
}
```

### 2. Put Logic in Body
```typescript
// ✅ Good
body: { analyzer: 'statistical', rules: [...] }

// ❌ Bad
tail: { action: 'complex-calculation' }
```

### 3. Make Tails Deterministic
```typescript
// ✅ Good
tail: { action: 'notify', targets: ['admin@example.com'] }

// ❌ Bad
tail: { action: 'maybe-notify', sometimes: true }
```

## Testing Each Component

```typescript
// Test head
await cell.head.sense({ value: 100 })
assert(cell.head.detected)

// Test body
const result = await cell.body.process({ value: 100 })
assert(result.action === 'alert')

// Test tail
await cell.tail.act({ action: 'alert', value: 100 })
assert(notificationSent)
```

## Next Steps

- [Cell Types](./cell-types) - Specific implementations
- [Sensation Types](./sensation) - Detailed sensation reference
- [Examples](../../examples/) - Real-world examples

---

**Ready to build?** See the [Quick Start Guide](../quick-start) or explore [Cell Types](./cell-types)!

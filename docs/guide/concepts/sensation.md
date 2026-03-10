# Sensation Types

Sensation is how cells "feel" changes in their environment. Unlike traditional computation, POLLN cells are aware of their neighbors and can detect patterns, trends, and anomalies.

## Overview

Cells don't just compute - they **sense**:

```typescript
const cell = new LogCell('monitor', {
  head: {
    sensation: 'absolute_change',  // What to feel
    threshold: 0.15,              // When to react
    sources: ['target-cell']      // What to watch
  }
})
```

## Sensation Types

### 1. Absolute Change
**Monitors**: State delta (new - old)

**Use Case**: Detect when a value changes by a specific amount

```typescript
const cell = new LogCell('A1', {
  head: {
    sensation: 'absolute_change',
    threshold: 100  // Alert when change exceeds ±100
  }
})

// Example: Value changes from 1000 to 1150
// Detected change: +150 (exceeds threshold)
```

**Configuration**:
```typescript
{
  sensation: 'absolute_change',
  threshold: 100,        // Absolute threshold
  direction: 'both',     // 'positive', 'negative', 'both'
  debounce: 1000         // Wait 1s before detecting again
}
```

**Applications**:
- Budget alerts (spending exceeds limit)
- Inventory monitoring (stock drops below threshold)
- Price tracking (price changes by amount)

---

### 2. Rate of Change
**Monitors**: First derivative (d/dt, velocity)

**Use Case**: Detect how fast a value is changing

```typescript
const cell = new LogCell('A2', {
  head: {
    sensation: 'rate_of_change',
    threshold: 10,        // 10 units per second
    window: 60           // Over 60-second window
  }
})

// Example: Temperature rising at 15°C/minute
// Detected: Rapid increase
```

**Configuration**:
```typescript
{
  sensation: 'rate_of_change',
  threshold: 10,         // Units per time period
  window: 60,           // Time window in seconds
  smoothing: 'exponential'  // Smoothing algorithm
}
```

**Applications**:
- Velocity monitoring (speed of change)
- Trend acceleration (is trend speeding up?)
- Process monitoring (production rate)

---

### 3. Acceleration
**Monitors**: Second derivative (d²/dt², trend direction)

**Use Case**: Detect if rate of change is increasing/decreasing

```typescript
const cell = new LogCell('A3', {
  head: {
    sensation: 'acceleration',
    threshold: 0.5,      // Acceleration threshold
    window: 120         // 2-minute window
  }
})

// Example: CPU usage increasing at increasing rate
// Detected: Exponential growth pattern
```

**Configuration**:
```typescript
{
  sensation: 'acceleration',
  threshold: 0.5,
  window: 120,
  detect: 'inflection'  // Detect trend changes
}
```

**Applications**:
- Inflection point detection
- Exponential growth detection
- System capacity planning

---

### 4. Presence
**Monitors**: Cell existence/activity

**Use Case**: Detect when cells appear/disappear

```typescript
const cell = new LogCell('A4', {
  head: {
    sensation: 'presence',
    checkInterval: 5000  // Check every 5 seconds
  }
})

// Example: Service goes down
// Detected: Target cell no longer active
```

**Configuration**:
```typescript
{
  sensation: 'presence',
  checkInterval: 5000,
  timeout: 30000,       // Consider inactive after 30s
  onAbsent: 'alert',    // What to do when absent
  onPresent: 'log'      // What to do when present
}
```

**Applications**:
- Service health monitoring
- Connection tracking
- Resource availability

---

### 5. Pattern
**Monitors**: Pattern matches in data

**Use Case**: Detect recurring patterns

```typescript
const cell = new LogCell('A5', {
  head: {
    sensation: 'pattern',
    pattern: 'seasonal',  // 'seasonal', 'cyclical', 'custom'
    period: 7,           // 7-day period
    confidence: 0.8      // 80% confidence required
  }
})

// Example: Sales spike every Friday
// Detected: Weekly pattern
```

**Configuration**:
```typescript
{
  sensation: 'pattern',
  pattern: 'seasonal',   // Pattern type
  period: 7,            // Pattern period
  confidence: 0.8,      // Match confidence
  method: 'autocorrelation'  // Detection method
}
```

**Pattern Types**:
- `seasonal` - Seasonal patterns
- `cyclical` - Cyclical patterns
- `trend` - Trend patterns
- `custom` - Custom pattern matching

**Applications**:
- Seasonal business detection
- Periodic behavior monitoring
- Anomaly detection (pattern breaks)

---

### 6. Anomaly
**Monitors**: Outliers and deviations

**Use Case**: Detect unusual values

```typescript
const cell = new LogCell('A6', {
  head: {
    sensation: 'anomaly',
    method: 'zscore',    // 'zscore', 'iqr', 'isolation_forest'
    threshold: 3.0,      // 3 standard deviations
    window: 100         // Look at last 100 points
  }
})

// Example: Transaction 10x larger than normal
// Detected: Anomaly
```

**Configuration**:
```typescript
{
  sensation: 'anomaly',
  method: 'zscore',     // Detection method
  threshold: 3.0,       // Z-score threshold
  window: 100,         // Historical window
  adaptative: true     // Adapt threshold over time
}
```

**Detection Methods**:
- `zscore` - Z-score based
- `iqr` - Interquartile range
- `isolation_forest` - Machine learning
- `local_outlier_factor` - LOF algorithm
- `custom` - Custom detection

**Applications**:
- Fraud detection
- Error detection
- Quality control
- Security monitoring

---

## Advanced Sensation

### Multi-Sensation Cells

Monitor multiple sensation types:

```typescript
const cell = new LogCell('multi-sensor', {
  head: {
    sensations: [
      { type: 'absolute_change', threshold: 100 },
      { type: 'rate_of_change', threshold: 10 },
      { type: 'anomaly', method: 'zscore', threshold: 3.0 }
    ],
    combine: 'OR'  // 'AND', 'OR', 'CUSTOM'
  }
})
```

### Conditional Sensation

React only when conditions are met:

```typescript
const cell = new LogCell('conditional', {
  head: {
    sensation: 'absolute_change',
    threshold: 100,
    when: (context) => {
      // Only sense during business hours
      const hour = new Date().getHours()
      return hour >= 9 && hour <= 17
    }
  }
})
```

### Contextual Sensation

Consider context in detection:

```typescript
const cell = new LogCell('contextual', {
  head: {
    sensation: 'anomaly',
    threshold: 3.0,
    context: {
      seasonality: true,    // Account for seasonality
      trends: true,         // Account for trends
      external: ['weather', 'holidays']  // External factors
    }
  }
})
```

## Sensation Best Practices

### 1. Choose the Right Sensation

```typescript
// ✅ Good: Use rate_of_change for velocity
sensation: 'rate_of_change'

// ❌ Bad: Use absolute_change for velocity
sensation: 'absolute_change'  // Won't detect speed
```

### 2. Set Appropriate Thresholds

```typescript
// ✅ Good: Calibrated threshold
sensation: 'anomaly',
threshold: 3.0  // Based on data distribution

// ❌ Bad: Arbitrary threshold
sensation: 'anomaly',
threshold: 100  // Not data-driven
```

### 3. Use Debouncing

```typescript
// ✅ Good: Prevent alert fatigue
sensation: 'absolute_change',
threshold: 100,
debounce: 60000  // Max once per minute

// ❌ Bad: No debouncing
sensation: 'absolute_change',
threshold: 100  // May spam alerts
```

### 4. Consider Window Size

```typescript
// ✅ Good: Appropriate window
sensation: 'rate_of_change',
window: 300  // 5 minutes for minute-by-minute data

// ❌ Bad: Wrong window
sensation: 'rate_of_change',
window: 1  // Too noisy
```

## Testing Sensation

```typescript
// Test absolute change detection
await cell.update(100)  // Initial value
await cell.update(200)  // +100 change
assert(cell.head.lastSensation.detected)

// Test rate of change
await cell.update(100)
await cell.update(200)
await cell.update(300)
assert(cell.head.lastSention.rate === 100)

// Test anomaly
await cell.loadHistoricalData(normalData)
await cell.update(outlierValue)
assert(cell.head.lastSensation.anomaly)
```

## Sensation Configuration Examples

### Financial Monitoring

```typescript
const stockMonitor = new LogCell('stock', {
  head: {
    sensation: 'rate_of_change',
    threshold: 0.05,  // 5% change per hour
    window: 3600,     // 1 hour
    direction: 'both'  // Up or down
  }
})
```

### Quality Control

```typescript
const qualityCheck = new LogCell('quality', {
  head: {
    sensation: 'anomaly',
    method: 'iqr',
    threshold: 1.5,  // 1.5 * IQR
    window: 50      // Last 50 items
  }
})
```

### Service Health

```typescript
const healthCheck = new LogCell('health', {
  head: {
    sensation: 'presence',
    checkInterval: 10000,  // Every 10 seconds
    timeout: 30000,        // Down after 30 seconds
    onAbsent: 'critical_alert'
  }
})
```

### Seasonal Pattern

```typescript
const seasonalMonitor = new LogCell('seasonal', {
  head: {
    sensation: 'pattern',
    pattern: 'seasonal',
    period: 7,           // Weekly pattern
    confidence: 0.85,    // 85% confidence
    onPatternBreak: 'alert'
  }
})
```

## Next Steps

- [Cell Types](./cell-types) - Cells that use sensation
- [Colony Architecture](./colony) - Multi-cell sensation
- [Examples](../../examples/) - Real-world sensation examples

---

**Ready to sense?** Start with the [Quick Start Guide](../quick-start) or explore [Cell Types](./cell-types)!

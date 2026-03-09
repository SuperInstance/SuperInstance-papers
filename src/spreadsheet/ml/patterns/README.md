# Pattern Recognition for Living Cells

Lightweight, browser-based pattern recognition system for POLLN living cells. Detects trends, anomalies, and patterns in cell data without requiring heavy ML libraries.

## Features

- **Pattern Detection**: Detect linear, exponential, and logarithmic growth/decay
- **Anomaly Detection**: Statistical outlier detection using Z-score, IQR, and modified Z-score
- **Trend Analysis**: Moving averages, momentum indicators, linear regression
- **Pattern Library**: Built-in catalog of common patterns (sine waves, steps, plateaus, etc.)
- **Pattern Cells**: Living cells that monitor other cells and detect patterns
- **WebSocket Integration**: Real-time pattern alerts and notifications
- **Lightweight**: Pure TypeScript implementation, no external ML dependencies

## Installation

```bash
npm install
```

## Quick Start

### Basic Pattern Detection

```typescript
import { PatternDetector } from './ml/patterns';

const detector = new PatternDetector({
  confidenceThreshold: 0.7,
  detectAnomalies: true,
  detectTrends: true
});

// Detect patterns in data
const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const patterns = detector.detectPatterns(values);

console.log(patterns);
// Output: DetectedPattern[] with trend_up pattern
```

### Anomaly Detection

```typescript
import { AnomalyDetector, AnomalyMethod } from './ml/patterns';

const detector = new AnomalyDetector({
  method: AnomalyMethod.Z_SCORE,
  threshold: 3
});

const values = [1, 2, 3, 4, 5, 100, 6, 7, 8]; // 100 is an outlier
const anomalies = detector.detect(values);

console.log(anomalies);
// Output: AnomalyResult[] detecting the outlier at index 5
```

### Trend Analysis

```typescript
import { TrendAnalyzer, TrendMethod } from './ml/patterns';

const analyzer = new TrendAnalyzer({
  method: TrendMethod.LINEAR_REGRESSION
});

const values = [10, 12, 14, 16, 18, 20, 22, 24];
const trend = analyzer.analyze(values);

console.log(trend);
// Output: { detected: true, direction: 'trend_up', confidence: 0.99, ... }
```

### Pattern Cell

```typescript
import { createPatternCell } from './ml/patterns';

// Create a pattern cell that monitors another cell
const patternCell = createPatternCell('pattern-1', 'source-1', {
  alertThreshold: 0.8,
  historyLength: 100,
  detectionOptions: {
    confidenceThreshold: 0.7,
    detectAnomalies: true
  }
});

// Feed data to the pattern cell
for (const value of dataValues) {
  await patternCell.process({
    type: 'absolute',
    from: 'source-1',
    to: 'pattern-1',
    value,
    timestamp: new Date()
  });
}

// Get detected patterns
const patterns = patternCell.getDetectedPatterns();

// Get alerts
const alerts = patternCell.getAlerts();

// Get statistics
const stats = patternCell.getStatistics();
```

### WebSocket Integration

```typescript
import { createPatternWebSocketIntegration } from './ml/patterns';

const integration = createPatternWebSocketIntegration(wsHandler, {
  autoBroadcast: true,
  broadcastInterval: 1000,
  includeStatistics: true
});

// Attach to pattern cells
integration.attachToCell(patternCell);

// Listen for events
integration.on('pattern_alert', (event) => {
  console.log('Pattern alert:', event);
});
```

## Pattern Types

### Growth Patterns
- `linear`: Constant growth (y = mx + b)
- `exponential`: Accelerating growth (y = a * e^bx)
- `logarithmic`: Diminishing returns (y = a + b * ln(x))

### Decay Patterns
- `linear_decay`: Constant decrease
- `exponential_decay`: Rapid decline that levels off

### Oscillation Patterns
- `sine_wave`: Smooth periodic oscillation
- `damped_oscillation`: Oscillation with decreasing amplitude

### Structural Patterns
- `step`: Sudden change then constant
- `sawtooth`: Linear rise followed by sharp drop
- `staircase`: Series of steps upward

### Temporal Patterns
- `burst`: Short period of high activity
- `periodic_spike`: Regular spikes at intervals

### Statistical Patterns
- `normal_distribution`: Bell curve distribution
- `uniform_distribution`: Evenly distributed values

## Detection Methods

### Anomaly Detection
- **Z-Score**: Identifies outliers based on standard deviations from mean
- **IQR**: Interquartile range method (robust to extreme values)
- **Modified Z-Score**: Uses median and MAD (better for non-normal distributions)

### Trend Analysis
- **Linear Regression**: Fits line to data, calculates slope and correlation
- **Moving Average**: Smooths data to identify underlying trends
- **Momentum**: Measures rate of change over window

### Pattern Matching
- **Built-in Library**: Pre-defined patterns with match functions
- **Custom Patterns**: Add your own pattern definitions
- **Confidence Scoring**: Each pattern match includes confidence level

## API Reference

### PatternDetector

```typescript
class PatternDetector {
  constructor(options?: PatternDetectionOptions)

  detectPatterns(values: number[]): DetectedPattern[]
  detectCorrelation(values1: number[], values2: number[]): DetectedPattern | null
  setOptions(options: Partial<PatternDetectionOptions>): void
}
```

### AnomalyDetector

```typescript
class AnomalyDetector {
  constructor(options?: AnomalyDetectionOptions)

  detect(values: number[]): AnomalyResult[]
  detectRolling(values: number[]): AnomalyResult[]
  setOptions(options: Partial<AnomalyDetectionOptions>): void
}
```

### TrendAnalyzer

```typescript
class TrendAnalyzer {
  constructor(options?: TrendAnalysisOptions)

  analyze(values: number[]): TrendResult
  detectSeasonality(values: number[], period?: number): SeasonalityResult
  setOptions(options: Partial<TrendAnalysisOptions>): void
}
```

### PatternLibrary

```typescript
class PatternLibrary {
  constructor()

  addPattern(pattern: PatternDefinition): void
  getPattern(id: string): PatternDefinition | undefined
  getPatternsByCategory(category: PatternCategory): PatternDefinition[]
  searchByTag(tag: string): PatternDefinition[]
  matchAll(values: number[]): PatternMatch[]
  addCustomPattern(pattern: PatternDefinition): void
}
```

### PatternCell

```typescript
class PatternCell extends LogCell {
  constructor(id: string, config: PatternCellConfig)

  getDetectedPatterns(): DetectedPattern[]
  getAlerts(): PatternAlert[]
  getAllAlerts(): PatternAlert[]
  acknowledgeAlert(alertId: string): void
  clearAlerts(): void
  getHistory(): number[]
  getStatistics(): PatternStatistics
  updateOptions(options: Partial<PatternDetectionOptions>): void
}
```

## Configuration Options

### PatternDetectionOptions

```typescript
interface PatternDetectionOptions {
  minDataPoints?: number;        // Default: 3
  confidenceThreshold?: number;   // Default: 0.7
  lookbackWindow?: number;        // Default: 20
  detectAnomalies?: boolean;      // Default: true
  detectTrends?: boolean;         // Default: true
  detectSeasonality?: boolean;    // Default: true
}
```

### AnomalyDetectionOptions

```typescript
interface AnomalyDetectionOptions {
  method?: AnomalyMethod;         // Default: Z_SCORE
  threshold?: number;             // Default: 3
  windowSize?: number;            // Default: 20
}
```

### TrendAnalysisOptions

```typescript
interface TrendAnalysisOptions {
  method?: TrendMethod;           // Default: LINEAR_REGRESSION
  windowSize?: number;            // Default: 5
  minConfidence?: number;         // Default: 0.5
}
```

### PatternCellConfig

```typescript
interface PatternCellConfig {
  targetCellId: string;
  sensationType?: SensationType;
  detectionOptions?: PatternDetectionOptions;
  alertThreshold?: number;        // Default: 0.8
  historyLength?: number;         // Default: 100
}
```

## WebSocket Events

### pattern_detected
Emitted when a new pattern is detected.

```typescript
interface PatternDetectedEvent {
  type: 'pattern_detected';
  cellId: string;
  targetCellId: string;
  pattern: {
    type: PatternType;
    confidence: number;
    description: string;
    metadata: Record<string, unknown>;
  };
  timestamp: Date;
}
```

### pattern_alert
Emitted when a significant pattern triggers an alert.

```typescript
interface PatternAlertEvent {
  type: 'pattern_alert';
  cellId: string;
  alert: {
    id: string;
    patternType: PatternType;
    confidence: number;
    description: string;
    severity: 'info' | 'warning' | 'critical';
  };
  timestamp: Date;
}
```

### pattern_statistics
Emitted with pattern detection statistics.

```typescript
interface PatternStatisticsEvent {
  type: 'pattern_statistics';
  cellId: string;
  statistics: {
    totalDetections: number;
    activeAlerts: number;
    patternTypes: Record<PatternType, number>;
    lastDetection: Date | null;
  };
  timestamp: Date;
}
```

## Testing

```bash
npm test -- patterns.test.ts
```

## Use Cases

1. **Financial Monitoring**: Detect unusual transactions or spending patterns
2. **System Health**: Monitor metrics for anomalies and trends
3. **User Behavior**: Identify usage patterns and anomalies
4. **Sales Analysis**: Detect trends, seasonality, and outliers
5. **Quality Control**: Identify defects or anomalies in manufacturing
6. **Network Traffic**: Detect DDoS attacks or unusual traffic patterns
7. **IoT Sensors**: Monitor sensor data for anomalies and trends

## Performance

- **Lightweight**: Pure TypeScript, no external dependencies
- **Fast**: Efficient statistical algorithms
- **Scalable**: Handles thousands of data points
- **Browser-ready**: Works in any modern browser

## License

MIT

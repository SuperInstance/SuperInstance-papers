# Performance Optimization Quick Start

Get started with POLLN spreadsheet performance optimizations in 5 minutes.

## Installation

The performance module is included in the main spreadsheet package:

```bash
npm install @polln/spreadsheet
```

## Basic Usage

### 1. Create an Optimized Grid

```typescript
import { GridDisplay } from '@polln/spreadsheet/ui';

// Create grid with all optimizations enabled
const grid = new GridDisplay({
  container: document.getElementById('spreadsheet')!,
  rowCount: 100000,      // 100K rows
  colCount: 1000,        // 1K columns
  rowHeight: 25,
  colWidth: 100,
  enableVirtualScrolling: true,   // Only render visible cells
  enableObjectPooling: true,      // Reuse cell instances
  enableBatchUpdates: true,       // Batch DOM updates
  enableMetrics: true,            // Track performance
});

// Add data to a cell
grid.setCellData(0, 0, {
  row: 0,
  col: 0,
  value: 'Hello, World!',
  state: CellState.DORMANT,
  type: 'input',
});
```

### 2. Add Performance Monitoring

```typescript
import { PerformancePanel, MetricsCollector } from '@polln/spreadsheet/performance';

// Create metrics collector
const collector = new MetricsCollector();
collector.start();

// Add performance panel (top-right corner)
const panel = new PerformancePanel({
  container: document.body,
  position: 'top-right',
  updateInterval: 1000,  // Update every second
  showFPS: true,
  showMemory: true,
  showLatency: true,
}, collector);

// Panel shows:
// - Real-time FPS counter
// - Memory usage percentage
// - Latency (p95)
// - Overall status (GOOD/OK/POOR)
```

### 3. Monitor Performance

```typescript
// Get performance summary
console.log(grid.getPerformanceSummary());

// Get detailed metrics
const metrics = collector.getMetrics();
console.log(`FPS: ${metrics.fps}`);
console.log(`Frame Time: ${metrics.frameTime}ms`);
console.log(`Memory: ${metrics.memoryUsage.usagePercentage}%`);
console.log(`Latency (p95): ${metrics.latency.p95}ms`);

// Get performance scorecard
const scorecard = collector.getScorecard();
console.log(`Overall: ${scorecard.overall}`); // 'good' | 'ok' | 'poor'
```

## Common Patterns

### Timing Operations

```typescript
import { OperationTimer } from '@polln/spreadsheet/performance';

// Time an operation
const timer = new OperationTimer(collector, 'cell_update');
try {
  await expensiveOperation();
} finally {
  timer.end();  // Automatically records duration
}
```

### Custom Metrics

```typescript
// Record custom metric
collector.recordMetric('cache_hit_rate', 0.85);

// Get custom metric
const hitRate = collector.getMetric('cache_hit_rate');
console.log(`Cache hit rate: ${hitRate * 100}%`);
```

### Cell Pooling

```typescript
import { CellPool } from '@polln/spreadsheet/performance';
import { InputCell } from '@polln/spreadsheet/cells';

// Create pool
const pool = new CellPool({
  initialSize: 100,
  maxSize: 10000,
});

// Register factory
pool.registerFactory(CellType.INPUT, () => {
  return new InputCell({
    id: 'cell',
    inputType: InputType.USER_DATA,
  });
});

// Use pool
const cell = pool.acquire(CellType.INPUT);
// ... use cell ...
pool.release(cell);

// Check efficiency
const stats = pool.getStats(CellType.INPUT);
console.log(`Reuse rate: ${stats.reuseRate * 100}%`);
```

### Batch Updates

```typescript
import { BatchScheduler } from '@polln/spreadsheet/performance';

// Create scheduler
const scheduler = new BatchScheduler({
  maxTasksPerFrame: 100,
  maxFrameTime: 14,  // Leave 2ms for browser
});

// Schedule updates
scheduler.schedule('update1', async () => {
  await updateCell1();
}, 10, 'write');  // priority 10, write operation

scheduler.schedule('update2', async () => {
  await updateCell2();
}, 5, 'write');   // priority 5, write operation

// Tasks execute in priority order on next RAF
```

## Performance Targets

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| Frame Time | <16ms | Enable virtual scrolling |
| FPS | 60 | Enable batch updates |
| Memory | Stable | Enable object pooling |
| Cell Count | 100K+ | Use virtual grid |

## Troubleshooting

### Low FPS

**Problem**: FPS drops below 30

**Solutions**:
1. Enable virtual scrolling
2. Reduce buffer size
3. Enable object pooling
4. Check for expensive computations

```typescript
const grid = new GridDisplay({
  // ...
  enableVirtualScrolling: true,
  enableObjectPooling: true,
});
```

### High Memory Usage

**Problem**: Memory grows continuously

**Solutions**:
1. Enable pool shrinking
2. Limit history size
3. Clear unused cells

```typescript
const pool = new CellPool({
  initialSize: 100,
  maxSize: 1000,
  shrinkThreshold: 0.25,  // Shrink when 25% utilized
});

// Periodically cleanup
setInterval(() => {
  pool.gc();
}, 30000);
```

### Choppy Scrolling

**Problem**: Scrolling isn't smooth

**Solutions**:
1. Increase buffer zones
2. Preallocate pools
3. Optimize cell rendering

```typescript
const grid = new GridDisplay({
  // ...
  enableBatchUpdates: true,
});

// Preallocate cells
pool.preload(CellType.INPUT, 100);
```

## Best Practices

### 1. Always Use Virtual Scrolling

For grids with >1000 cells:

```typescript
// ✅ Good
const grid = new GridDisplay({
  enableVirtualScrolling: true,
  // ...
});

// ❌ Bad - will be slow
const grid = new GridDisplay({
  enableVirtualScrolling: false,
  rowCount: 100000,
  // ...
});
```

### 2. Pool Expensive Objects

```typescript
// ✅ Good - reuse cells
const cell = pool.acquire(CellType.INPUT);
// ... use cell ...
pool.release(cell);

// ❌ Bad - creates new instances
const cell = new InputCell(config);
```

### 3. Batch Updates

```typescript
// ✅ Good - batched
scheduler.schedule('update', async () => {
  await updateMultipleCells();
});

// ❌ Bad - immediate
await updateMultipleCells();
```

### 4. Monitor in Development

```typescript
if (process.env.NODE_ENV === 'development') {
  const panel = new PerformancePanel({
    container: document.body,
  }, collector);
}
```

### 5. Profile Before Optimizing

```typescript
// Measure first
const timer = new OperationTimer(collector, 'operation');
await operation();
timer.end();

// Then optimize if needed
const duration = collector.getMetric('operation');
if (duration > 16) {
  // Optimization needed
}
```

## Examples

### Complete Example

```typescript
import { GridDisplay } from '@polln/spreadsheet/ui';
import { PerformancePanel, MetricsCollector } from '@polln/spreadsheet/performance';

// Setup
const container = document.getElementById('spreadsheet')!;
const collector = new MetricsCollector();
collector.start();

// Create grid
const grid = new GridDisplay({
  container,
  rowCount: 100000,
  colCount: 1000,
  rowHeight: 25,
  colWidth: 100,
  enableVirtualScrolling: true,
  enableObjectPooling: true,
  enableBatchUpdates: true,
  enableMetrics: true,
});

// Add performance panel
const panel = new PerformancePanel({
  container: document.body,
  position: 'top-right',
}, collector);

// Populate with data
for (let row = 0; row < 1000; row++) {
  for (let col = 0; col < 100; col++) {
    grid.setCellData(row, col, {
      row,
      col,
      value: `Cell ${row},${col}`,
      state: CellState.DORMANT,
      type: 'input',
    });
  }
}

// Scroll to specific cell
grid.scrollToCell(500, 50, true);

// Get performance summary
console.log(grid.getPerformanceSummary());
```

### Real-time Updates

```typescript
// Setup grid and collector
const grid = new GridDisplay({ /* ... */ });
const collector = new MetricsCollector();
collector.start();

// Simulate real-time updates
setInterval(() => {
  const timer = new OperationTimer(collector, 'realtime_update');

  try {
    // Update random cells
    for (let i = 0; i < 10; i++) {
      const row = Math.floor(Math.random() * 1000);
      const col = Math.floor(Math.random() * 100);
      const value = Math.random() * 100;

      grid.setCellData(row, col, {
        row,
        col,
        value: value.toFixed(2),
        state: CellState.EMITTING,
        type: 'input',
      });
    }
  } finally {
    timer.end();
  }
}, 100);
```

## API Reference

### GridDisplay

```typescript
class GridDisplay {
  constructor(config: GridDisplayConfig)
  setCellData(row: number, col: number, data: CellData): void
  getCellData(row: number, col: number): CellData | undefined
  scrollToCell(row: number, col: number, smooth?: boolean): void
  getMetrics(): object
  getPerformanceSummary(): string
  destroy(): void
}
```

### MetricsCollector

```typescript
class MetricsCollector {
  constructor(config?: Partial<MetricsConfig>)
  start(): void
  stop(): void
  recordLatency(value: number): void
  recordMetric(name: string, value: number): void
  getMetrics(): PerformanceMetrics
  getScorecard(): PerformanceScorecard
  export(): string
  reset(): void
}
```

### PerformancePanel

```typescript
class PerformancePanel {
  constructor(config: PerformancePanelConfig, collector: MetricsCollector)
  setComponents(components: object): void
  show(): void
  hide(): void
  toggle(): void
  destroy(): void
}
```

## Resources

- [Full Documentation](./README.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [API Reference](./README.md#api-reference)
- [Examples](./example.ts)

## Support

For issues and questions:
- GitHub: https://github.com/SuperInstance/polln
- Documentation: https://docs.polln.ai

---

**Last Updated**: 2026-03-09
**Version**: 1.0.0

# POLLN Spreadsheet - Performance Monitoring System

Comprehensive performance monitoring and profiling system for POLLN spreadsheets. Provides real-time metrics collection, Web Vitals tracking, CPU/memory profiling, benchmarking, and Lighthouse CI integration.

## Features

- **Metrics Collection**: Advanced metrics collection with tagging, filtering, and aggregation
- **Web Vitals Tracking**: Automatic tracking of all Core Web Vitals (FCP, LCP, CLS, FID, INP)
- **Performance Profiling**: CPU profiling with flame graphs, memory profiling with leak detection
- **Benchmarking**: Comprehensive benchmarking suite for spreadsheet operations
- **Performance Reporting**: Detailed reports with recommendations and regression detection
- **Alert System**: Configurable alerts with thresholds and cooldowns
- **Lighthouse CI**: Automated performance testing integration for CI/CD pipelines

## Installation

```bash
npm install @polln/spreadsheet-performance
```

## Quick Start

```typescript
import {
  MetricsCollector,
  WebVitalsTracker,
  PerformanceProfiler,
  SpreadsheetBenchmark,
  PerformanceReporter,
} from '@polln/spreadsheet-performance';

// Start collecting metrics
const collector = new MetricsCollector();
collector.recordMetric('operation_duration', 150);

// Track Web Vitals
const vitalsTracker = new WebVitalsTracker();
vitalsTracker.onChange((metric) => {
  console.log(`${metric.name}: ${metric.value} (${metric.rating})`);
});

// Profile performance
const profiler = new PerformanceProfiler();
profiler.startProfiling();
// ... run your code ...
const profile = profiler.stopProfiling();

// Generate report
const reporter = new PerformanceReporter({}, collector, vitalsTracker);
const report = await reporter.generateReport();
console.log(reporter.generateMarkdown(report));
```

## Components

### MetricsCollector

Advanced metrics collection with tagging and alerting.

```typescript
import { MetricsCollector, OperationTimer } from '@polln/spreadsheet-performance';

const collector = new MetricsCollector();

// Record metrics with tags
collector.recordMetric('api_call_duration', 250, {
  endpoint: '/api/users',
  method: 'GET',
});

// Query metrics by tags
const apiMetrics = collector.queryByTags({ endpoint: '/api/users' });

// Get statistics
const stats = collector.getMetricStatistics('api_call_duration');
console.log(`Average: ${stats.avg}ms, p95: ${stats.p95}ms`);

// Set up alerts
collector.setupAlert({
  metricName: 'api_call_duration',
  operator: '>',
  threshold: 1000,
  severity: 'warning',
  cooldown: 5000,
});

collector.onAlert((alert) => {
  console.warn(`Alert: ${alert.message}`);
});

// Time operations
const timer = new OperationTimer(collector, 'database_query');
// ... perform query ...
timer.end();
```

### WebVitalsTracker

Automatic tracking of Core Web Vitals.

```typescript
import { WebVitalsTracker, getWebVitals } from '@polln/spreadsheet-performance';

// Automatic tracking
const tracker = new WebVitalsTracker({
  reportAllChanges: true,
  attributionEnabled: true,
});

// Subscribe to changes
tracker.onChange((metric) => {
  console.log(`${metric.name}: ${metric.value}ms (${metric.rating})`);
});

// Get all Web Vitals
const vitals = tracker.getWebVitals();
console.log(vitals); // { fcp, lcp, cls, fid, tti, tbt, inp }

// Get summary
const summary = tracker.getSummary();
console.log(`Score: ${summary.score}, Rating: ${summary.rating}`);

// Or use the utility function
const webVitals = await getWebVitals();
```

### PerformanceProfiler

Comprehensive CPU and memory profiling.

```typescript
import { PerformanceProfiler } from '@polln/spreadsheet-performance';

const profiler = new PerformanceProfiler();

// Profile everything
profiler.startProfiling();
// ... run your code ...
profiler.stopProfiling();

// Profile specific components
profiler.startCPUProfiling();
// ... CPU-intensive work ...
const cpuProfile = profiler.stopCPUProfiling();

// Generate flame graph
const flameGraph = profiler.generateFlameGraph(cpuProfile);

// Profile memory
profiler.startMemoryProfiling();
// ... allocate objects ...
const memorySnapshots = profiler.stopMemoryProfiling();

// Get memory statistics
const stats = profiler.getMemoryStats();
console.log(`Trend: ${stats.trend}, Peak: ${stats.peak.usedJSHeapSize}`);
```

### SpreadsheetBenchmark

Benchmark spreadsheet operations.

```typescript
import { SpreadsheetBenchmark } from '@polln/spreadsheet-performance';

const benchmark = new SpreadsheetBenchmark();

// Benchmark rendering
const renderResult = benchmark.benchmarkRender(1000);
console.log(`Rendered ${renderResult.operations} cells in ${renderResult.duration}ms`);
console.log(`${renderResult.opsPerSecond.toFixed(0)} ops/sec`);

// Benchmark formula complexity
const formulas = ['=SUM(A1:A100)', '=AVERAGE(B1:B50)', '=VLOOKUP(C1, D1:E100, 2, FALSE)'];
const formulaResult = benchmark.benchmarkFormulaComplexity(formulas);

// Benchmark memory usage
const memoryResult = benchmark.benchmarkMemoryUsage(5000);
console.log(`Memory leaked: ${memoryResult.memoryLeaked} bytes`);

// Benchmark collaboration
const collabResult = benchmark.benchmarkCollaboration(10);
console.log(`Average latency: ${collabResult.avgLatency}ms`);

// Run all benchmarks
const allResults = await benchmark.runAllBenchmarks();
```

### PerformanceReporter

Generate comprehensive performance reports.

```typescript
import { PerformanceReporter } from '@polln/spreadsheet-performance';

const reporter = new PerformanceReporter({
  regressionThreshold: 10, // 10% change threshold
  enableRecommendations: true,
  enableRegressionDetection: true,
});

// Set baseline
reporter.setBaseline({
  lcp: 2000,
  fid: 100,
  cls: 0.1,
});

// Generate report
const report = await reporter.generateReport();

// Get summary
console.log(`Overall Score: ${report.summary.score}/100`);
console.log(`Rating: ${report.summary.overall}`);
console.log(`Bottleneck: ${report.summary.bottleneck}`);

// View recommendations
for (const rec of report.recommendations) {
  console.log(`${rec.type}: ${rec.title}`);
  console.log(`  ${rec.description}`);
  console.log(`  Impact: ${rec.impact}, Effort: ${rec.effort}`);
}

// Check for regressions
if (report.regressionAnalysis?.hasRegression) {
  console.warn('Performance regressions detected!');
  for (const regression of report.regressionAnalysis.regressions) {
    console.warn(`  ${regression.metric}: ${regression.changePercent.toFixed(1)}%`);
  }
}

// Export as markdown
const markdown = reporter.generateMarkdown(report);
```

### Profiler

Low-level profiling interface.

```typescript
import { Profiler, profileFunction, compareCPUProfiles } from '@polln/spreadsheet-performance';

const profiler = new Profiler();

// Start profiling session
const sessionId = await profiler.startProfiling('cpu');
// ... run code ...
const { cpu } = await profiler.stopProfiling(sessionId);

// Profile a function
const { result, profile } = await profileFunction(() => {
  // Your code here
  return 42;
});

// Compare profiles
const comparison = compareCPUProfiles(baselineProfile, currentProfile);
console.log(`Duration change: ${comparison.durationChangePercent.toFixed(1)}%`);
```

### Lighthouse CI

Automated performance testing for CI/CD.

```typescript
import { LighthouseCIRunner, runLighthouseCI } from '@polln/spreadsheet-performance';

// Quick run
const { result, assertions } = await runLighthouseCI('https://example.com');

// Or use the runner
const runner = new LighthouseCIRunner({
  url: 'https://example.com',
  budgets: [
    {
      path: '/*.js',
      resourceSizes: [100000], // 100KB max
      resourceCounts: [10], // 10 files max
    },
  ],
  assertions: {
    'categories:performance': { minScore: 80 },
    'metrics:lcp': { maxNumericValue: 2500 },
    'metrics:cls': { maxNumericValue: 0.1 },
  },
});

const result = await runner.runAudit();
const assertionResult = runner.assertPerformance(result);

if (!assertionResult.passed) {
  console.error('Performance assertions failed!');
  for (const failure of assertionResult.failures) {
    console.error(`  ${failure.assertion}: ${failure.actual}`);
  }
}

// Generate JUnit XML for CI
const junitXML = runner.generateJUnitXML(result, assertionResult);

// Generate GitHub Actions output
const githubOutput = generateGitHubActionsOutput(result, assertionResult);
```

## Configuration

### MetricsCollector Options

```typescript
interface MetricsConfig {
  sampleInterval: number;        // Sampling interval (ms)
  historySize: number;           // Max history size
  enableMemoryTracking: boolean; // Enable memory metrics
  enableFPSTracking: boolean;    // Enable FPS tracking
  enableLatencyTracking: boolean;// Enable latency tracking
}
```

### WebVitalsTracker Options

```typescript
interface WebVitalsConfig {
  reportAllChanges?: boolean;     // Report all metric changes
  reportCallback?: (metric) => void;
  attributionEnabled?: boolean;    // Enable attribution
  navigationTiming?: boolean;      // Track navigation timing
}
```

### PerformanceProfiler Options

```typescript
interface ProfilerConfig {
  enableCPU: boolean;             // Enable CPU profiling
  enableMemory: boolean;          // Enable memory profiling
  enableNetwork: boolean;         // Enable network profiling
  enableLongTasks: boolean;       // Enable long task detection
  sampleInterval?: number;        // CPU sampling interval (μs)
  maxSamples?: number;            // Max samples to collect
}
```

## Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| FCP | < 1.8s | < 3.0s | ≥ 3.0s |
| LCP | < 2.5s | < 4.0s | ≥ 4.0s |
| CLS | < 0.1 | < 0.25 | ≥ 0.25 |
| FID | < 100ms | < 300ms | ≥ 300ms |
| INP | < 200ms | < 500ms | ≥ 500ms |
| TTI | < 3.8s | < 7.3s | ≥ 7.3s |
| TBT | < 200ms | < 600ms | ≥ 600ms |

## CI/CD Integration

### GitHub Actions

```yaml
name: Performance Tests

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test:performance
        env:
          CI: true
```

### GitLab CI

```yaml
performance:
  stage: test
  script:
    - npm ci
    - npm run build
    - npm run test:performance
  artifacts:
    reports:
      junit: lighthouse-results.xml
```

## API Reference

See the [TypeScript types](./types.ts) for complete API documentation.

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

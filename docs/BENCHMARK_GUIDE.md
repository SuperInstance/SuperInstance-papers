# POLLN Performance Benchmarking Suite

A comprehensive performance testing framework for measuring and tracking performance across all POLLN core operations.

## Overview

The benchmarking suite provides:

- **20+ benchmarks** covering all core operations
- **Statistical analysis** with mean, median, percentiles (p50, p75, p90, p95, p99)
- **Memory profiling** integration
- **Historical comparison** and regression detection
- **HTML report generation** with interactive charts
- **CI/CD integration** for automated performance tracking

## Quick Start

```bash
# Install dependencies
npm install

# Run all benchmarks
npm run bench

# Run specific suite
npm run bench:agent
npm run bench:comm
npm run bench:decision
npm run bench:learning
npm run bench:kv
npm run bench:worldmodel
npm run bench:integration

# Generate HTML report
npm run bench:report

# Save baseline for future comparison
npm run bench:baseline

# Compare against baseline
npm run bench:compare
```

## CLI Usage

### Run Benchmarks

```bash
# Run all benchmarks
npm run bench -- run

# Run specific suite
npm run bench -- run -s agent

# Run specific benchmark
npm run bench -- run -b agent-spawn

# Run with filter (regex)
npm run bench -- run -f ".*spawn.*"

# Custom iterations
npm run bench -- run -i 1000 -w 100

# Generate report
npm run bench -- run --format html --output report.html

# Compare with baseline
npm run bench -- run --baseline baseline.json

# Save as baseline
npm run bench -- run --save-baseline baseline.json
```

### List Available Benchmarks

```bash
npm run bench -- list
```

### Compare Baselines

```bash
npm run bench -- compare --baseline baseline.json --report comparison.html
```

## Benchmark Suites

### Agent Benchmarks (`agent`)

Agent lifecycle and operations performance.

| Benchmark | Description |
|-----------|-------------|
| `agent-spawn` | Agent creation time |
| `agent-initialize` | Agent initialization |
| `agent-process` | Message processing |
| `agent-state-get` | State retrieval |
| `agent-state-set` | State updates |
| `agent-value-update` | Value function updates |
| `agent-shutdown` | Agent shutdown |
| `agent-batch-spawn` | Batch agent creation |
| `agent-communication` | Inter-agent communication |
| `agent-lifecycle-full` | End-to-end lifecycle |

### Communication Benchmarks (`communication`)

A2A package communication performance.

| Benchmark | Description |
|-----------|-------------|
| `a2a-create` | Package creation |
| `a2a-serialize` | JSON serialization |
| `a2a-deserialize` | JSON deserialization |
| `a2a-roundtrip` | Serialize + deserialize |
| `pollen-grain-create` | Pollen grain creation |
| `pollen-grain-embed` | Embedding generation |
| `a2a-large-payload` | Large payload handling |
| `a2a-batch-create` | Batch package creation |
| `a2a-trace-validation` | Causal trace validation |
| `a2a-compression` | Compression efficiency |

### Decision Benchmarks (`decision`)

Plinko decision layer performance.

| Benchmark | Description |
|-----------|-------------|
| `plinko-single-proposal` | Single proposal processing |
| `plinko-multiple-proposals` | Multiple proposals |
| `plinko-gumbel-softmax` | Stochastic selection |
| `plinko-entropy-calc` | Entropy calculation |
| `plinko-discriminator` | Discriminator checks |
| `plinko-temperature-anneal` | Temperature annealing |
| `plinko-safety-override` | Safety override handling |
| `plinko-batch-process` | Batch processing |
| `plinko-selection-stability` | Selection consistency |
| `plinko-scalability` | Proposal count scalability |

### Learning Benchmarks (`learning`)

Hebbian and Value Network learning performance.

| Benchmark | Description |
|-----------|-------------|
| `hebbian-synapse-update` | Synapse weight updates |
| `hebbian-batch-update` | Batch updates |
| `hebbian-weight-decay` | Decay computation |
| `hebbian-oja-normalization` | Oja's rule normalization |
| `valuenet-predict` | Value predictions |
| `valuenet-update` | Value updates |
| `valuenet-td-lambda` | TD(lambda) learning |
| `valuenet-eligibility-trace` | Eligibility trace management |
| `learning-integration` | Combined learning systems |
| `learning-scalability` | Synapse count scalability |

### KV-Cache Benchmarks (`kv-cache`)

KV-cache and anchor management performance.

| Benchmark | Description |
|-----------|-------------|
| `anchor-create` | Anchor creation |
| `anchor-retrieve` | Anchor retrieval |
| `anchor-match` | Similarity matching |
| `anchor-pool-operations` | Pool operations |
| `ann-index-build` | ANN index building |
| `ann-search` | ANN search |
| `ann-batch-search` | Batch search |
| `lmcache-serialize` | Segment serialization |
| `lmcache-deserialize` | Segment deserialization |
| `kv-integration` | Full KV workflow |

### World Model Benchmarks (`worldmodel`)

World model and dreaming performance.

| Benchmark | Description |
|-----------|-------------|
| `worldmodel-encode` | State encoding |
| `worldmodel-decode` | State decoding |
| `worldmodel-reconstruct` | Full reconstruction |
| `dreaming-single` | Single dream generation |
| `dreaming-batch` | Batch dream generation |
| `dreaming-optimization` | Policy optimization |
| `tile-dreaming` | Tile dreaming |
| `tile-dreaming-overnight` | Overnight optimization |
| `worldmodel-training` | Model training |
| `dreaming-integration` | Integrated dreaming |

### Integration Benchmarks (`integration`)

End-to-end workflow performance.

| Benchmark | Description |
|-----------|-------------|
| `workflow-single-agent` | Single agent workflow |
| `workflow-multi-agent` | Multi-agent coordination |
| `workflow-dream-cycle` | Dream cycle execution |
| `workflow-meadow-share` | Meadow pattern sharing |
| `workflow-full-pipeline` | Complete pipeline |
| `coordination-consensus` | Consensus formation |
| `coordination-pipeline` | Pipeline coordination |
| `federated-sync` | Federated learning sync |
| `evolution-pruning` | Graph evolution pruning |
| `scalability-large-colony` | Large colony scalability |

## Report Formats

### JSON Report

```json
{
  "timestamp": 1699999999999,
  "summary": {
    "total": 70,
    "passed": 70,
    "failed": 0,
    "totalTime": 15000
  },
  "results": [...]
}
```

### Markdown Report

Human-readable text report with tables and metrics.

### HTML Report

Interactive HTML report with:
- Performance charts (using Chart.js)
- Metric cards
- Color-coded status indicators
- Baseline comparison
- Trend visualization

## Regression Detection

The framework automatically detects performance regressions by comparing against baselines:

- **Critical**: >20% regression
- **Major**: >10% regression
- **Minor**: >5% regression

Configure thresholds:

```bash
npm run bench -- compare --threshold 15
```

## CI/CD Integration

The benchmark suite integrates with GitHub Actions:

```yaml
# .github/workflows/benchmark.yml
name: Performance Benchmarks
on: [push, pull_request]
jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run benchmarks
        run: npm run bench:ci
```

Features:
- Automatic baseline tracking on `main` branch
- PR comments with performance comparison
- Regression alerts
- Historical data persistence

## Performance Targets

### Agent Operations

| Operation | Target | P95 Target |
|-----------|--------|------------|
| Spawn | <1ms | <2ms |
| Initialize | <5ms | <10ms |
| Process | <1ms | <2ms |

### Communication

| Operation | Target | P95 Target |
|-----------|--------|------------|
| A2A Create | <0.1ms | <0.2ms |
| Serialize | <0.5ms | <1ms |
| Deserialize | <0.5ms | <1ms |

### Decision Layer

| Operation | Target | P95 Target |
|-----------|--------|------------|
| Single Proposal | <0.1ms | <0.2ms |
| 10 Proposals | <0.5ms | <1ms |
| 100 Proposals | <2ms | <5ms |

### Learning

| Operation | Target | P95 Target |
|-----------|--------|------------|
| Synapse Update | <0.1ms | <0.2ms |
| Value Predict | <0.5ms | <1ms |
| TD(lambda) Update | <1ms | <2ms |

### KV-Cache

| Operation | Target | P95 Target |
|-----------|--------|------------|
| Anchor Create | <1ms | <2ms |
| Anchor Match | <0.5ms | <1ms |
| ANN Search | <1ms | <2ms |

## Troubleshooting

### Benchmarks timing out

Increase timeout:

```bash
npm run bench -- run --timeout 600000
```

### Memory issues

Reduce iterations:

```bash
npm run bench -- run -i 50
```

### Inconsistent results

Increase warmup iterations:

```bash
npm run bench -- run -w 100
```

## Advanced Usage

### Custom Benchmark Configuration

```typescript
import { BenchmarkRunner } from './src/benchmarks/index.js';

const runner = new BenchmarkRunner({
  iterations: 1000,
  warmupIterations: 100,
  timeout: 600000,
  enableMemoryProfiling: true,
  verbose: true,
});

runner.registerSuite(new AgentBenchmarks());
const summary = await runner.run();
```

### Creating Custom Benchmarks

```typescript
export class MyBenchmarks implements BenchmarkSuite {
  name = 'my-suite';
  description = 'My custom benchmarks';
  version = '1.0.0';

  async setup(): Promise<void> {
    // Setup code
  }

  async teardown(): Promise<void> {
    // Cleanup code
  }

  benchmarks = new Map([
    ['my-benchmark', this.myBenchmark.bind(this)],
  ]);

  async myBenchmark(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    // Benchmark implementation
  }
}
```

## Contributing

When adding new features, include benchmarks:

1. Create benchmark in appropriate suite
2. Add to `src/benchmarks/suites/`
3. Document in this README
4. Update performance targets if needed

## License

MIT License - see LICENSE file for details.

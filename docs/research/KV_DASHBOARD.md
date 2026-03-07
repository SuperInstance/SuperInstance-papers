# KV System Metrics Dashboard Design

## Overview

This document outlines the design for a comprehensive metrics dashboard monitoring the KV (Key-Value) system components in POLLN, including cache efficiency, anchor quality, throughput, and memory usage across distributed colonies and the Meadow marketplace.

---

## 1. Dashboard Layout

### Panel Organization

```
┌─────────────────────────────────────────────────────────────────┐
│                    KV SYSTEM MONITORING DASHBOARD              │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │   CACHE     │ │    ANCHOR   │ │  THROUGHPUT │ │   MEMORY    │ │
│ │ EFFICIENCY  │ │   QUALITY   │ │    RATE     │ │   USAGE     │ │
│ │             │ │             │ │             │ │             │ │
│ │ Hit Rate:   │ │ Distribution:│ │ Requests/s: │ │ By Tier:    │ │
│ │ 87.3% ✓     │ │ ┌─────────┐ │ │ 1,247       │ │ ┌─────────┐ │ │
│ │ [trend]     │ │ │  ████   │ │ │ 1,189       │ │ │ L1: 12% │ │ │
│ │             │ │ │ ██████ █│ │ │ [sparkline] │ │ │ L2: 45% │ │ │
│ │ Latency:    │ │ │ ████████│ │ │             │ │ │ L3: 30% │ │ │
│ │ 2.3ms       │ │ └─────────┘ │ │ Agents/s:   │ │ │Anchor:13%│ │ │
│ │ [-15%]      │ │ Quality:    │ │ 342         │ │ └─────────┘ │ │
│ │             │ │ 8.7/10 ✓    │ │             │ │             │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      REAL-TIME CHARTS                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │         Cache Hit Rate vs Memory Usage (Last 24h)            │ │
│ │ 100% │████████████████████████████████                       │ │
│ │  75% │████████████████████████████████                       │ │
│ │  50% │████████████████████           ████                    │ │
│ │  25% │████████████████               █████                   │ │
│ │   0% └────────────────────────────────────────────────────  │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      DISTRIBUTION GRAPHS                        │
│ ┌──────────────────────┐ ┌──────────────────────┐              │
│ │   Anchor Reuse Heat  │ │   Meadow Activity    │              │
│ │       Map            │ │      Distribution    │              │
│ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │              │
│ │ │ ▓▓░░▓▓▓░▓▓░░▓▓░ │ │ │ │ ████░░░░░░░░░░░░ │ │              │
│ │ │ ▓▓▓▓▓▓▓░░▓▓░░▓▓░ │ │ │ │ ████████░░░░░░░ │ │              │
│ │ │ ░░▓▓▓▓▓▓▓▓░░▓▓░ │ │ │ │ ███████████░░░░ │ │              │
│ │ └──────────────────┘ │ │ └──────────────────┘ │              │
│ └──────────────────────┘ └──────────────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                      ALERTS & NOTIFICATIONS                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ WARNING  | Colony-3 hit rate dropped to 58% (2m ago)     │ │
│ │ ⚠️ WARNING  | Memory usage at 82% (5m ago)                  │ │
│ │ ✓ INFO      | Meadow sync completed (1.2s)                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Panel Details

#### 1.1 Cache Efficiency Panel

**Purpose:** Monitor cache performance and TTFT improvements

**Metrics Displayed:**
- Overall hit rate (percentage with trend indicator)
- L1/L2/L3 hit rates (nested breakdown)
- Average latency (ms with change indicator)
- TTFT improvement (ms saved, speedup factor)
- Eviction rate (evictions/sec)
- Cache size utilization

**Visual Elements:**
- Sparkline for hit rate trend (last hour)
- Gauge for memory utilization
- Color coding: Green (>80%), Yellow (60-80%), Red (<60%)

#### 1.2 Anchor Quality Panel

**Purpose:** Track anchor distribution and quality metrics

**Metrics Displayed:**
- Anchor distribution histogram (bins by quality score)
- Average quality score (0-10 scale)
- Anchor reuse count (total and per-tier)
- Anchor age distribution (fresh vs stale)
- Anchor collision rate
- Anchor compression ratio

**Visual Elements:**
- Horizontal bar chart for distribution
- Quality score gauge
- Heat map showing hot/cold anchors

#### 1.3 Throughput Panel

**Purpose:** Monitor system capacity and load

**Metrics Displayed:**
- Requests per second (with peak indicator)
- Agents per second (active agents throughput)
- Operations per second (get/set/evict)
- Queue depth (pending operations)
- Average queue wait time
- Concurrent connection count

**Visual Elements:**
- Real-time throughput line chart
- Operations breakdown pie chart
- Queue depth indicator

#### 1.4 Memory Usage Panel

**Purpose:** Track memory allocation and efficiency

**Metrics Displayed:**
- Memory by tier (L1/L2/L3/Anchor)
- Memory by component (cache/index/metadata)
- Total memory used (MB/GB)
- Memory efficiency (bytes saved via sharing)
- Memory fragmentation ratio
- Growth rate (MB/hour)

**Visual Elements:**
- Stacked area chart (by tier)
- Donut chart (by component)
- Growth trend line

---

## 2. Key Metrics

### 2.1 Cache Performance Metrics

| Metric | Description | Calculation | Thresholds |
|--------|-------------|-------------|------------|
| **Hit Rate** | Percentage of cache hits | `(hits / (hits + misses)) * 100` | >80% ✓, 60-80% ⚠️, <60% 🚨 |
| **L1 Hit Rate** | Fastest tier hit rate | `l1Hits / totalRequests` | >60% ✓ |
| **L2 Hit Rate** | Mid-tier hit rate | `l2Hits / totalRequests` | >25% ✓ |
| **L3 Hit Rate** | Slowest tier hit rate | `l3Hits / totalRequests` | >10% ✓ |
| **TTFT Improvement** | Time saved per request | `baselineTTFT - cachedTTFT` | >50ms ✓ |
| **Speedup Factor** | Latency reduction ratio | `baselineTTFT / cachedTTFT` | >2x ✓ |
| **Average Latency** | Mean cache response time | `Σ responseTime / requestCount` | <5ms ✓ |
| **P95 Latency** | 95th percentile latency | `percentile(responseTimes, 95)` | <10ms ✓ |
| **Eviction Rate** | Evictions per second | `evictions / timeWindow` | <100/sec ✓ |
| **Cache Turnover** | How quickly cache refreshes | `evictions / cacheSize` | <10%/hour ✓ |

### 2.2 Anchor Quality Metrics

| Metric | Description | Calculation | Thresholds |
|--------|-------------|-------------|------------|
| **Quality Score** | Average anchor quality | `Σ qualityScores / anchorCount` | >7.0/10 ✓ |
| **Anchor Reuse** | Times anchor was reused | `Σ reuseCount / anchorCount` | >5x ✓ |
| **Anchor Distribution** | Histogram bin counts | Quality bin frequencies | Balanced ✓ |
| **Collision Rate** | Anchor hash collisions | `collisions / totalAnchors` | <1% ✓ |
| **Compression Ratio** | Space saved by anchoring | `uncompressedSize / compressedSize` | >3x ✓ |
| **Anchor Freshness** | Age of anchors in cache | `now - anchorCreationTime` | <24h ✓ |
| **Stale Anchor Ratio** | Outdated anchors | `staleAnchors / totalAnchors` | <5% ✓ |

### 2.3 Throughput Metrics

| Metric | Description | Calculation | Thresholds |
|--------|-------------|-------------|------------|
| **Requests/sec** | Total request throughput | `requests / timeWindow` | >1000 ✓ |
| **Agents/sec** | Active agent throughput | `agentsProcessed / timeWindow` | >100 ✓ |
| **Operations/sec** | Cache operations | `gets + sets + evicts / timeWindow` | >5000 ✓ |
| **Queue Depth** | Pending operations | `currentQueueLength` | <100 ✓ |
| **Queue Wait Time** | Average queue latency | `Σ waitTime / requestCount` | <10ms ✓ |
| **Connection Count** | Active connections | `currentConnections` | <500 ✓ |
| **Peak RPS** | Maximum sustained RPS | `max(requestsInWindow)` | Measured |

### 2.4 Memory Efficiency Metrics

| Metric | Description | Calculation | Thresholds |
|--------|-------------|-------------|------------|
| **Memory Used** | Total cache memory | `Σ tierMemory` | <80% capacity ✓ |
| **Memory Saved** | Bytes saved by deduplication | `baselineBytes - actualBytes` | Report absolute |
| **Reduction %** | Percentage memory saved | `(1 - actualBytes / baselineBytes) * 100` | >40% ✓ |
| **Fragmentation** | Memory fragmentation ratio | `allocatedMemory / usedMemory` | <1.2 ✓ |
| **Growth Rate** | Memory increase per hour | `Δmemory / time` | <100MB/hour ✓ |
| **L1 Memory Ratio** | L1 as % of total | `l1Memory / totalMemory` | 10-20% ✓ |
| **L2 Memory Ratio** | L2 as % of total | `l2Memory / totalMemory` | 30-50% ✓ |
| **L3 Memory Ratio** | L3 as % of total | `l3Memory / totalMemory` | 20-40% ✓ |
| **Anchor Memory Ratio** | Anchors as % of total | `anchorMemory / totalMemory` | 10-20% ✓ |

### 2.5 Distributed System Metrics

| Metric | Description | Calculation | Thresholds |
|--------|-------------|-------------|------------|
| **Sync Rate** | Cross-colony sync success | `successfulSyncs / totalSyncs` | >95% ✓ |
| **Sync Latency** | Time to complete sync | `syncCompleteTime - syncStartTime` | <5s ✓ |
| **Meadow Activity** | Marketplace operations/sec | `meadowOps / timeWindow` | >10 ✓ |
| **Anchor Sharing** | Anchors shared to meadow | `sharedAnchors / timeWindow` | Report |
| **Anchor Adoption** | Anchors adopted from meadow | `adoptedAnchors / timeWindow` | Report |
| **Colony Health** | Colony uptime/availability | `uptime / totaltime` | >99.9% ✓ |
| **Network Bandwidth** | Data transferred/sec | `bytesTransferred / timeWindow` | <10MB/s ✓ |

---

## 3. Alert Thresholds

### 3.1 Severity Levels

| Severity | Color | Response Time | Action |
|----------|-------|---------------|--------|
| **Critical** | 🔴 Red | Immediate | Page on-call, auto-remediate |
| **Warning** | 🟡 Yellow | 5 minutes | Investigate, prepare remediation |
| **Info** | 🔵 Blue | Log only | Record for analysis |
| **Success** | 🟢 Green | Log only | Confirm normal operation |

### 3.2 Cache Performance Alerts

```
CRITICAL:
  - Hit rate < 50% for > 5 minutes
  - Latency > 50ms for > 2 minutes
  - Cache size > 95% capacity

WARNING:
  - Hit rate < 60% for > 5 minutes
  - Latency > 10ms for > 5 minutes
  - Cache size > 80% capacity
  - Hit rate declining trend (>10% drop in 1h)

INFO:
  - Hit rate < 70% for > 10 minutes
  - Cache size > 70% capacity
```

### 3.3 Memory Alerts

```
CRITICAL:
  - Memory usage > 95% capacity
  - Memory growth rate > 500MB/hour
  - Out of memory errors
  - Memory leak detected (continuous growth)

WARNING:
  - Memory usage > 80% capacity
  - Memory growth rate > 200MB/hour
  - Fragmentation ratio > 1.5
  - Any tier exceeds 90% of allocation

INFO:
  - Memory usage > 70% capacity
  - Memory growth rate > 100MB/hour
  - Fragmentation ratio > 1.3
```

### 3.4 Anchor Quality Alerts

```
CRITICAL:
  - Quality score < 4.0/10 for > 10 minutes
  - Collision rate > 5%
  - Anchor corruption detected

WARNING:
  - Quality score < 6.0/10 for > 10 minutes
  - Collision rate > 2%
  - Stale anchor ratio > 15%
  - Anchor reuse < 2x average

INFO:
  - Quality score < 7.0/10 for > 10 minutes
  - Stale anchor ratio > 10%
  - Anchor distribution significantly skewed
```

### 3.5 Throughput Alerts

```
CRITICAL:
  - Requests/sec < 100 for > 5 minutes (expected load)
  - Queue depth > 1000
  - Queue wait time > 100ms
  - Service unavailable errors

WARNING:
  - Requests/sec < 500 for > 5 minutes (expected load)
  - Queue depth > 500
  - Queue wait time > 50ms
  - Connection count > 400
  - Throughput declining trend (>20% drop in 1h)

INFO:
  - Queue depth > 200
  - Queue wait time > 20ms
  - Connection count > 300
```

### 3.6 Distributed System Alerts

```
CRITICAL:
  - Sync rate < 80% for > 5 minutes
  - Sync latency > 30s
  - Colony partition detected
  - Meadow unavailable

WARNING:
  - Sync rate < 90% for > 5 minutes
  - Sync latency > 10s
  - Sync failure rate increasing
  - Meadow response time > 5s
  - Network bandwidth > 8MB/s

INFO:
  - Sync rate < 95% for > 10 minutes
  - Meadow activity < 5 ops/sec
  - Anchor sharing rate decreasing
```

### 3.7 Alert Configuration Example

```yaml
alerts:
  cache_hit_rate_critical:
    condition: hit_rate < 50
    duration: 5m
    severity: critical
    action: page_on_call

  cache_hit_rate_warning:
    condition: hit_rate < 60
    duration: 5m
    severity: warning
    action: log_and_notify

  memory_usage_warning:
    condition: memory_usage_percent > 80
    duration: 1m
    severity: warning
    action: trigger_cleanup

  sync_latency_critical:
    condition: sync_latency_ms > 30000
    duration: 2m
    severity: critical
    action: alert_ops_team

  quality_score_warning:
    condition: avg_quality_score < 6.0
    duration: 10m
    severity: warning
    action: review_anchors
```

---

## 4. Visualization Components

### 4.1 Real-Time Charts

#### Line Chart: Hit Rate Over Time

```
Configuration:
  X-axis: Time (last 1h, 6h, 24h, 7d)
  Y-axis: Hit Rate (0-100%)
  Series: Overall, L1, L2, L3
  Update: Every 5 seconds
  Interpolation: Smooth curve
  Grid: Horizontal lines at 20% intervals

Features:
  - Hover tooltips show exact values
  - Click to zoom into time range
  - Toggle series visibility
  - Annotate events (deployments, incidents)
```

#### Area Chart: Memory Usage Over Time

```
Configuration:
  X-axis: Time (last 24h default)
  Y-axis: Memory (MB/GB)
  Series: L1, L2, L3, Anchor (stacked)
  Update: Every 10 seconds
  Colors: Semi-transparent fills

Features:
  - Stack shows total memory
  - Individual series expandable
  - Compare multiple time ranges
  - Export data as CSV
```

#### Gauge: Current Memory Utilization

```
Configuration:
  Type: Semi-circle gauge
  Range: 0-100%
  Zones: Green (0-60%), Yellow (60-80%), Red (80-100%)
  Value: Current usage percentage
  Label: "Memory Usage"

Features:
  - Color changes based on threshold
  - Animated needle movement
  - Click to see breakdown
```

### 4.2 Historical Trends

#### Candlestick Chart: Daily Performance

```
Configuration:
  X-axis: Date (last 30/90/365 days)
  Y-axis: Hit Rate (0-100%)
  Candle: High, Low, Open, Close
  Color: Green (up day), Red (down day)

Features:
  - Show daily range and trend
  - Compare multiple periods
  - Highlight anomalies
  - Correlate with events
```

#### Heat Map: Performance by Hour/Day

```
Configuration:
  X-axis: Hour of day (0-23)
  Y-axis: Day of week (Mon-Sun)
  Color: Hit Rate (gradient green to red)
  Cell: Average hit rate for that hour/day

Features:
  - Identify patterns (peak/off-peak)
  - Spot outliers
  - Plan capacity based on patterns
```

### 4.3 Heat Maps

#### Anchor Reuse Heat Map

```
Configuration:
  Grid: Anchor ID ranges (rows) x Time (columns)
  Color: Reuse frequency (blue=low, red=high)
  Update: Every minute
  Cell size: 20x20 pixels

Features:
  - Identify hot anchors
  - Detect cold anchors
  - Plan cache eviction strategy
  - Zoom into anchor ID ranges
```

#### Colony Health Heat Map

```
Configuration:
  Grid: Colonies (rows) x Metrics (columns)
  Color: Health score (green=good, red=poor)
  Metrics: Hit rate, latency, memory, sync rate
  Update: Every 30 seconds

Features:
  - At-a-glance colony status
  - Drill down to colony details
  - Compare colonies
  - Identify problem colonies
```

### 4.4 Distribution Graphs

#### Histogram: Anchor Quality Distribution

```
Configuration:
  X-axis: Quality Score (0-10)
  Y-axis: Count (or percentage)
  Bins: 0.5 unit increments
  Overlay: Normal distribution curve
  Update: Every minute

Features:
  - Show distribution shape
  - Identify skewness
  - Compare to baseline
  - Filter by tier, colony
```

#### Scatter Plot: Latency vs Cache Size

```
Configuration:
  X-axis: Cache Size (MB)
  Y-axis: Latency (ms)
  Points: Individual measurements
  Color: Time (gradient)
  Update: Every 10 seconds

Features:
  - Identify correlation
  - Spot outliers
  - Trend line
  - Filter by tier
```

#### Pie/Donut Chart: Memory by Component

```
Configuration:
  Segments: Cache, Index, Metadata, Overhead
  Labels: Component name + percentage
  Colors: Distinct palette
  Update: Every minute

Features:
  - Quick overview of allocation
  - Click segment to drill down
  - Export as image
```

### 4.5 Dashboard Templates

#### Overview Dashboard

```
Panels:
  1. Hit Rate Gauge (current)
  2. Memory Usage Gauge (current)
  3. Requests/sec (sparkline)
  4. Active Alerts (count + severity)
  5. Hit Rate Trend (line chart, 24h)
  6. Memory Trend (area chart, 24h)
  7. Top 5 Colonies by Hit Rate (bar chart)
  8. Recent Alerts (table)
```

#### Detailed Cache Dashboard

```
Panels:
  1. Hit Rate by Tier (multi-line chart)
  2. Latency by Tier (multi-line chart)
  3. Cache Size by Tier (stacked area chart)
  4. Eviction Rate (line chart)
  5. Hit Rate Distribution (histogram)
  6. TTFT Improvement (line chart)
  7. Top Operations (table)
```

#### Distributed System Dashboard

```
Panels:
  1. Colony Status (heat map)
  2. Sync Rate (line chart)
  3. Sync Latency (line chart)
  4. Meadow Activity (line chart)
  5. Anchor Sharing (bar chart)
  6. Network Bandwidth (line chart)
  7. Colony List (table with details)
```

---

## 5. Implementation Guide

### 5.1 Integration with Existing Monitoring

#### Metrics Collection Architecture

```typescript
// src/monitoring/metrics-collector.ts

interface MetricCollector {
  // Initialize metric collection
  initialize(config: MetricsConfig): Promise<void>;

  // Record a metric value
  recordMetric(metric: Metric): void;

  // Batch record multiple metrics
  recordMetrics(metrics: Metric[]): void;

  // Get current metric values
  getMetrics(filter?: MetricFilter): Metric[];

  // Export metrics in various formats
  export(format: ExportFormat): string;

  // Shutdown collector
  shutdown(): Promise<void>;
}

interface Metric {
  name: string;
  value: number;
  timestamp: number;
  labels: Record<string, string>;
  type: 'gauge' | 'counter' | 'histogram' | 'summary';
}

interface MetricsConfig {
  collectInterval: number; // milliseconds
  retentionPeriod: number; // milliseconds
  exporters: ExporterConfig[];
}
```

#### Prometheus Integration

```typescript
// src/monitoring/prometheus-exporter.ts

import { Registry, Counter, Gauge, Histogram, Summary } from 'prom-client';

class PrometheusMetricsExporter {
  private registry: Registry;
  private metrics: Map<string, Counter | Gauge | Histogram | Summary>;

  constructor() {
    this.registry = new Registry();
    this.metrics = new Map();
    this.registerDefaultMetrics();
  }

  // Register cache hit rate metric
  registerHitRate(): Gauge {
    const gauge = new Gauge({
      name: 'kv_cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['tier', 'colony'],
      registers: [this.registry]
    });
    this.metrics.set('hit_rate', gauge);
    return gauge;
  }

  // Register latency metric
  registerLatency(): Histogram {
    const histogram = new Histogram({
      name: 'kv_cache_latency_seconds',
      help: 'Cache latency in seconds',
      labelNames: ['tier', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1],
      registers: [this.registry]
    });
    this.metrics.set('latency', histogram);
    return histogram;
  }

  // Register memory usage metric
  registerMemoryUsage(): Gauge {
    const gauge = new Gauge({
      name: 'kv_memory_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['tier', 'component'],
      registers: [this.registry]
    });
    this.metrics.set('memory', gauge);
    return gauge;
  }

  // Expose metrics endpoint
  getMetrics(): string {
    return this.registry.metrics();
  }

  // Start HTTP server for scraping
  async startServer(port: number = 9090): Promise<void> {
    const express = require('express');
    const app = express();

    app.get('/metrics', (req, res) => {
      res.set('Content-Type', this.registry.contentType);
      res.end(this.getMetrics());
    });

    app.listen(port, () => {
      console.log(`Prometheus exporter listening on port ${port}`);
    });
  }
}
```

#### Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "KV System Monitoring",
    "tags": ["kv", "cache", "performance"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Cache Hit Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "kv_cache_hit_rate{tier=\"overall\"}",
            "legendFormat": "Overall Hit Rate"
          },
          {
            "expr": "kv_cache_hit_rate{tier=\"L1\"}",
            "legendFormat": "L1 Hit Rate"
          },
          {
            "expr": "kv_cache_hit_rate{tier=\"L2\"}",
            "legendFormat": "L2 Hit Rate"
          },
          {
            "expr": "kv_cache_hit_rate{tier=\"L3\"}",
            "legendFormat": "L3 Hit Rate"
          }
        ],
        "yaxes": [
          {
            "format": "percent",
            "label": "Hit Rate"
          }
        ]
      },
      {
        "id": 2,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "kv_memory_bytes",
            "legendFormat": "{{tier}} - {{component}}"
          }
        ],
        "yaxes": [
          {
            "format": "bytes",
            "label": "Memory Usage"
          }
        ]
      },
      {
        "id": 3,
        "title": "Request Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, kv_cache_latency_seconds)",
            "legendFormat": "P95 Latency"
          },
          {
            "expr": "histogram_quantile(0.50, kv_cache_latency_seconds)",
            "legendFormat": "P50 Latency"
          }
        ],
        "yaxes": [
          {
            "format": "s",
            "label": "Latency"
          }
        ]
      },
      {
        "id": 4,
        "title": "Throughput",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(kv_requests_total[1m])",
            "legendFormat": "Requests/sec"
          }
        ],
        "yaxes": [
          {
            "format": "ops",
            "label": "Operations"
          }
        ]
      }
    ]
  }
}
```

### 5.2 API Endpoints

#### Metrics API

```typescript
// src/api/metrics-api.ts

import express from 'express';

const router = express.Router();

/**
 * GET /api/metrics/summary
 * Returns current summary of all metrics
 */
router.get('/summary', async (req, res) => {
  const summary = {
    cache: {
      hitRate: await getMetric('cache_hit_rate_overall'),
      l1HitRate: await getMetric('cache_hit_rate_L1'),
      l2HitRate: await getMetric('cache_hit_rate_L2'),
      l3HitRate: await getMetric('cache_hit_rate_L3'),
      avgLatency: await getMetric('cache_latency_avg'),
      p95Latency: await getMetric('cache_latency_p95'),
    },
    memory: {
      totalUsed: await getMetric('memory_total_bytes'),
      l1Used: await getMetric('memory_L1_bytes'),
      l2Used: await getMetric('memory_L2_bytes'),
      l3Used: await getMetric('memory_L3_bytes'),
      anchorUsed: await getMetric('memory_anchor_bytes'),
      efficiency: await getMetric('memory_efficiency_percent'),
    },
    anchors: {
      qualityScore: await getMetric('anchor_quality_score'),
      reuseCount: await getMetric('anchor_reuse_count'),
      distribution: await getMetric('anchor_distribution'),
    },
    throughput: {
      requestsPerSec: await getMetric('throughput_requests_sec'),
      agentsPerSec: await getMetric('throughput_agents_sec'),
      queueDepth: await getMetric('throughput_queue_depth'),
    },
    distributed: {
      syncRate: await getMetric('sync_success_rate'),
      syncLatency: await getMetric('sync_latency_ms'),
      meadowActivity: await getMetric('meadow_ops_sec'),
    },
  };

  res.json(summary);
});

/**
 * GET /api/metrics/history
 * Returns historical metrics data
 * Query params:
 *   - metric: metric name
 *   - from: start timestamp (ISO 8601)
 *   - to: end timestamp (ISO 8601)
 *   - interval: aggregation interval (1m, 5m, 1h, 1d)
 *   - labels: label filters (key=value,key2=value2)
 */
router.get('/history', async (req, res) => {
  const { metric, from, to, interval = '5m', labels } = req.query;

  const history = await getMetricHistory({
    name: metric as string,
    from: new Date(from as string),
    to: new Date(to as string),
    interval: interval as string,
    labels: parseLabels(labels as string),
  });

  res.json({
    metric,
    from,
    to,
    interval,
    data: history.points,
  });
});

/**
 * GET /api/metrics/alerts
 * Returns current active alerts
 */
router.get('/alerts', async (req, res) => {
  const { severity } = req.query;

  const alerts = await getActiveAlerts(severity as string);

  res.json({
    count: alerts.length,
    alerts: alerts.map(a => ({
      id: a.id,
      severity: a.severity,
      metric: a.metric,
      condition: a.condition,
      currentValue: a.currentValue,
      threshold: a.threshold,
      triggeredAt: a.triggeredAt,
      duration: a.duration,
    })),
  });
});

/**
 * GET /api/metrics/export
 * Export metrics in various formats
 * Query params:
 *   - format: prometheus, json, csv
 *   - from: start timestamp (optional)
 *   - to: end timestamp (optional)
 */
router.get('/export', async (req, res) => {
  const { format = 'json', from, to } = req.query;

  const metrics = await exportMetrics({
    format: format as string,
    from: from ? new Date(from as string) : undefined,
    to: to ? new Date(to as string) : undefined,
  });

  switch (format) {
    case 'prometheus':
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
      break;
    case 'csv':
      res.set('Content-Type', 'text/csv');
      res.send(metrics);
      break;
    case 'json':
    default:
      res.json(metrics);
  }
});

/**
 * POST /api/metrics/query
 * Execute custom queries
 * Body: {
 *   query: string, // PromQL-like query
 *   from: timestamp,
 *   to: timestamp,
 *   step: interval
 * }
 */
router.post('/query', async (req, res) => {
  const { query, from, to, step } = req.body;

  const results = await executeQuery(query, from, to, step);

  res.json({
    query,
    from,
    to,
    step,
    results,
  });
});

/**
 * GET /api/metrics/health
 * Returns system health status
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    checks: {
      cache: await checkCacheHealth(),
      memory: await checkMemoryHealth(),
      anchors: await checkAnchorHealth(),
      distributed: await checkDistributedHealth(),
    },
    timestamp: new Date().toISOString(),
  };

  const overallStatus = Object.values(health.checks).every(c => c.status === 'ok')
    ? 'healthy'
    : 'degraded';

  health.status = overallStatus;
  res.json(health);
});

export default router;
```

### 5.3 Custom Dashboard Implementation

#### React Dashboard Component

```typescript
// src/dashboard/components/KVDashboard.tsx

import React, { useState, useEffect } from 'react';
import { LineChart, AreaChart, GaugeChart, HeatMap } from './charts';

interface KVDashboardProps {
  apiBaseUrl: string;
  refreshInterval?: number;
}

export const KVDashboard: React.FC<KVDashboardProps> = ({
  apiBaseUrl,
  refreshInterval = 5000,
}) => {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [metricsRes, alertsRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/metrics/summary`),
          fetch(`${apiBaseUrl}/api/metrics/alerts`),
        ]);

        const [metricsData, alertsData] = await Promise.all([
          metricsRes.json(),
          alertsRes.json(),
        ]);

        setMetrics(metricsData);
        setAlerts(alertsData.alerts);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [apiBaseUrl, refreshInterval]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="kv-dashboard">
      <header>
        <h1>KV System Monitoring</h1>
        <AlertPanel alerts={alerts} />
      </header>

      <main className="dashboard-grid">
        {/* Cache Efficiency Panel */}
        <section className="panel cache-efficiency">
          <h2>Cache Efficiency</h2>
          <div className="metrics">
            <div className="metric">
              <label>Hit Rate</label>
              <GaugeChart
                value={metrics.cache.hitRate}
                min={0}
                max={100}
                unit="%"
                zones={[
                  { value: 60, color: '#ef4444' },
                  { value: 80, color: '#f59e0b' },
                  { value: 100, color: '#10b981' },
                ]}
              />
            </div>
            <div className="metric">
              <label>Average Latency</label>
              <span className="value">{metrics.cache.avgLatency.toFixed(2)} ms</span>
            </div>
            <div className="metric">
              <label>P95 Latency</label>
              <span className="value">{metrics.cache.p95Latency.toFixed(2)} ms</span>
            </div>
          </div>
          <div className="chart">
            <LineChart
              title="Hit Rate Trend"
              dataUrl={`${apiBaseUrl}/api/metrics/history?metric=cache_hit_rate&interval=5m`}
              yLabel="Hit Rate (%)"
              xLabel="Time"
            />
          </div>
        </section>

        {/* Memory Usage Panel */}
        <section className="panel memory-usage">
          <h2>Memory Usage</h2>
          <div className="metrics">
            <div className="metric">
              <label>Total Used</label>
              <span className="value">{formatBytes(metrics.memory.totalUsed)}</span>
            </div>
            <div className="metric">
              <label>Efficiency</label>
              <span className="value">{metrics.memory.efficiency.toFixed(1)}%</span>
            </div>
          </div>
          <div className="chart">
            <AreaChart
              title="Memory by Tier"
              dataUrl={`${apiBaseUrl}/api/metrics/history?metric=memory_bytes&interval=5m`}
              series={['L1', 'L2', 'L3', 'Anchor']}
              yLabel="Memory (MB)"
              xLabel="Time"
              stacked
            />
          </div>
        </section>

        {/* Anchor Quality Panel */}
        <section className="panel anchor-quality">
          <h2>Anchor Quality</h2>
          <div className="metrics">
            <div className="metric">
              <label>Quality Score</label>
              <GaugeChart
                value={metrics.anchors.qualityScore}
                min={0}
                max={10}
                unit="/10"
              />
            </div>
            <div className="metric">
              <label>Average Reuse</label>
              <span className="value">{metrics.anchors.reuseCount.toFixed(1)}x</span>
            </div>
          </div>
          <div className="chart">
            <HistogramChart
              title="Quality Distribution"
              data={metrics.anchors.distribution}
              xLabel="Quality Score"
              yLabel="Count"
            />
          </div>
        </section>

        {/* Throughput Panel */}
        <section className="panel throughput">
          <h2>Throughput</h2>
          <div className="metrics">
            <div className="metric">
              <label>Requests/sec</label>
              <span className="value">{metrics.throughput.requestsPerSec}</span>
            </div>
            <div className="metric">
              <label>Agents/sec</label>
              <span className="value">{metrics.throughput.agentsPerSec}</span>
            </div>
            <div className="metric">
              <label>Queue Depth</label>
              <span className="value">{metrics.throughput.queueDepth}</span>
            </div>
          </div>
          <div className="chart">
            <LineChart
              title="Request Rate"
              dataUrl={`${apiBaseUrl}/api/metrics/history?metric=throughput_requests&interval=1m`}
              yLabel="Requests/sec"
              xLabel="Time"
            />
          </div>
        </section>

        {/* Distributed System Panel */}
        <section className="panel distributed">
          <h2>Distributed System</h2>
          <div className="metrics">
            <div className="metric">
              <label>Sync Rate</label>
              <span className="value">{metrics.distributed.syncRate.toFixed(1)}%</span>
            </div>
            <div className="metric">
              <label>Sync Latency</label>
              <span className="value">{metrics.distributed.syncLatency.toFixed(0)} ms</span>
            </div>
          </div>
          <div className="chart">
            <HeatMap
              title="Colony Health"
              dataUrl={`${apiBaseUrl}/api/metrics/colonies`}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

// Utility functions
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
```

### 5.4 Deployment Configuration

#### Docker Compose for Monitoring Stack

```yaml
# docker-compose.monitoring.yml

version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    networks:
      - monitoring
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    networks:
      - monitoring

volumes:
  prometheus-data:
  grafana-data:

networks:
  monitoring:
    driver: bridge
```

#### Prometheus Configuration

```yaml
# prometheus/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'kv-system'
    environment: 'production'

rule_files:
  - 'alerts.yml'

scrape_configs:
  - job_name: 'kv-system'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

#### Alert Rules

```yaml
# prometheus/alerts.yml

groups:
  - name: kv_system_alerts
    interval: 30s
    rules:
      - alert: HighCacheMissRate
        expr: kv_cache_hit_rate < 60
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Cache miss rate too high"
          description: "Cache hit rate is {{ $value }}% for the last 5 minutes"

      - alert: CriticalCacheMissRate
        expr: kv_cache_hit_rate < 50
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Critical cache miss rate"
          description: "Cache hit rate is {{ $value }}% for the last 5 minutes"

      - alert: HighMemoryUsage
        expr: (kv_memory_bytes / kv_memory_capacity_bytes) * 100 > 80
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}%"

      - alert: CriticalMemoryUsage
        expr: (kv_memory_bytes / kv_memory_capacity_bytes) * 100 > 95
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Critical memory usage"
          description: "Memory usage is {{ $value }}%"

      - alert: HighLatency
        expr: histogram_quantile(0.95, kv_cache_latency_seconds) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High cache latency"
          description: "P95 latency is {{ $value }}s"

      - alert: LowSyncRate
        expr: kv_sync_success_rate < 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low sync success rate"
          description: "Sync success rate is {{ $value }}%"
```

---

## 6. Best Practices

### 6.1 Dashboard Design

1. **Less is More**: Start with 4-6 key metrics per dashboard
2. **Use Color Strategically**: Only use color to draw attention to problems
3. **Provide Context**: Always show trends, not just current values
4. **Enable Drill-Down**: Click any panel to see more detail
5. **Set Realistic Baselines**: Compare against expected values, not zero

### 6.2 Alert Management

1. **Avoid Alert Fatigue**: Only alert for actionable issues
2. **Use Severity Levels**: Not all alerts need immediate attention
3. **Include Context**: Alerts should include relevant metrics and logs
4. **Set Clear Ownership**: Each alert should have an owner
5. **Review Regularly**: Remove or adjust alerts that aren't useful

### 6.3 Performance

1. **Cache Expensive Queries**: Pre-compute aggregations
2. **Use Sampling**: For high-frequency metrics, sample data
3. **Implement Retention Policies**: Don't keep data forever
4. **Optimize Storage**: Use appropriate data types and compression
5. **Scale Horizontally**: Distribute load across multiple instances

---

## 7. Future Enhancements

### 7.1 Machine Learning Features

- **Anomaly Detection**: ML models to detect unusual patterns
- **Predictive Alerts**: Forecast problems before they occur
- **Automatic Optimization**: Suggest configuration changes
- **Capacity Planning**: Predict when resources will be exhausted

### 7.2 Advanced Visualizations

- **Network Graphs**: Visualize colony connections
- **3D Visualizations**: Memory topology in 3D
- **AR/VR Interfaces**: Immersive monitoring experience
- **Natural Language Queries**: Ask questions about system health

### 7.3 Integration Options

- **ChatOps**: Alert and manage via Slack/Teams
- **Automation**: Auto-remediation based on alerts
- **AIOps**: Integration with APM and logging tools
- **Custom Export**: Export to external systems (SIEM, CMDB)

---

## Conclusion

This dashboard design provides comprehensive visibility into KV system performance, with actionable metrics, intelligent alerts, and flexible visualization options. The modular design allows for easy extension and customization based on specific needs.

**Next Steps:**
1. Implement metrics collection infrastructure
2. Set up Prometheus and Grafana
3. Create initial dashboards with core metrics
4. Configure alert thresholds
5. Iterate based on user feedback

---

*Document Version: 1.0*
*Last Updated: 2026-03-07*
*Author: POLLN Development Team*

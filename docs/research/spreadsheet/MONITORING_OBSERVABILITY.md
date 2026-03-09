# POLLN Spreadsheet - Monitoring & Observability Guide

**Version:** 1.0.0
**Last Updated:** 2026-03-09
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Metrics Strategy](#metrics-strategy)
3. [Logging Architecture](#logging-architecture)
4. [Alerting Strategy](#alerting-strategy)
5. [Dashboarding](#dashboarding)
6. [Distributed Tracing](#distributed-tracing)
7. [Error Tracking](#error-tracking)
8. [Uptime Monitoring](#uptime-monitoring)
9. [Capacity Planning](#capacity-planning)
10. [Implementation Guide](#implementation-guide)
11. [Best Practices](#best-practices)

---

## Executive Summary

POLLN's monitoring and observability strategy follows the **Three Pillars of Observability**: Metrics, Logs, and Traces. This comprehensive approach ensures complete visibility into the LOG (Ledger-Organizing Graph) system, from individual cell operations to colony-wide coordination.

### Key Objectives

- **Proactive Detection**: Identify issues before they impact users
- **Rapid Resolution**: Mean Time to Resolution (MTTR) < 15 minutes
- **Data-Driven Decisions**: Use metrics to drive optimization
- **Business Intelligence**: Connect technical metrics to business outcomes

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Metrics** | OpenTelemetry + Prometheus | Collection and storage |
| **Visualization** | Grafana | Dashboarding and alerting |
| **Logging** | Pino (structured JSON) | Log aggregation |
| **Tracing** | OpenTelemetry + Jaeger | Distributed tracing |
| **Error Tracking** | Sentry | Error aggregation |
| **Uptime** | Pingdom + Synthetics | External monitoring |

---

## Metrics Strategy

### RED Method (Rate, Errors, Duration)

The RED method focuses on **request-driven** metrics:

```
Rate:   Requests per second
Errors: Failed requests percentage
Duration: Request latency distribution
```

#### RED Metrics for POLLN

```yaml
# Agent Execution Rate
polln_agent_requests_total:
  type: counter
  labels: [colony_id, agent_type, operation]
  description: "Total agent execution requests"

# Agent Error Rate
polln_agent_errors_total:
  type: counter
  labels: [colony_id, agent_type, error_type]
  description: "Total failed agent executions"

# Agent Duration
polln_agent_duration_seconds:
  type: histogram
  labels: [colony_id, agent_type, operation]
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  description: "Agent execution duration in seconds"
```

### USE Method (Utilization, Saturation, Errors)

The USE method focuses on **resource-driven** metrics:

```
Utilization:  Average resource usage
Saturation:  How full the resource is
Errors:      Resource errors
```

#### USE Metrics for POLLN

```yaml
# Memory Utilization
polln_memory_usage_bytes:
  type: gauge
  labels: [colony_id, memory_type]
  description: "Memory usage by type (heap, rss, external)"

# CPU Utilization
polln_cpu_usage_percent:
  type: gauge
  labels: [colony_id]
  description: "CPU usage percentage"

# KV-Cache Saturation
polln_kv_cache_saturation:
  type: gauge
  labels: [colony_id, cache_type]
  description: "KV-cache fullness percentage"

# Event Loop Saturation
polln_event_loop_lag_seconds:
  type: gauge
  labels: [colony_id]
  description: "Event loop delay in seconds"
```

### Golden Signals

Google's "Four Golden Signals" for monitoring:

```yaml
# 1. Latency
polln_request_latency:
  type: histogram
  labels: [endpoint, method, status]
  description: "Request latency distribution"

# 2. Traffic
polln_requests_total:
  type: counter
  labels: [endpoint, method]
  description: "Total requests received"

# 3. Errors
polln_errors_total:
  type: counter
  labels: [endpoint, error_type]
  description: "Total errors encountered"

# 4. Saturation
polln_resource_saturation:
  type: gauge
  labels: [resource_type]
  description: "Resource saturation percentage"
```

### Business Metrics

Connect technical metrics to business value:

```yaml
# Daily Active Users (DAU)
polln_dau:
  type: gauge
  labels: [product, tier]
  description: "Daily active users"

# Cell Operations
polln_cell_operations_total:
  type: counter
  labels: [cell_type, operation, user_tier]
  description: "Total cell operations"

# Collaboration Sessions
polln_collaboration_sessions_active:
  type: gauge
  labels: [workspace_id]
  description: "Active collaboration sessions"

# Value Delivered
polln_value_function_score:
  type: gauge
  labels: [colony_id, metric]
  description: "Value function scores across colonies"
```

### Spreadsheet-Specific Metrics

```yaml
# Cell Lifecycle Metrics
polln_cell_state_transitions_total:
  type: counter
  labels: [cell_type, from_state, to_state]
  description: "Cell state transitions"

polln_cell_processing_duration:
  type: histogram
  labels: [cell_type, logic_level]
  buckets: [0.001, 0.01, 0.1, 1, 10, 60]
  description: "Cell processing duration"

polln_cell_confidence_score:
  type: gauge
  labels: [cell_type, logic_level]
  description: "Cell output confidence scores"

# Sensation Metrics
polln_cell_sensations_total:
  type: counter
  labels: [sensation_type, cell_id]
  description: "Cell sensations received"

polln_cell_sensation_latency:
  type: histogram
  labels: [sensation_type]
  description: "Sensation detection latency"

# Collaboration Metrics
polln_websocket_connections:
  type: gauge
  labels: [workspace_id, user_role]
  description: "Active WebSocket connections"

polln_collaboration_conflicts_total:
  type: counter
  labels: [workspace_id, conflict_type]
  description: "Collaboration conflicts resolved"

polln_yjs_updates_total:
  type: counter
  labels: [workspace_id, update_type]
  description: "Yjs CRDT updates processed"
```

### Sample Prometheus Queries

```promql
# Error rate by agent type
rate(polln_agent_errors_total[5m]) / rate(polln_agent_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(polln_agent_duration_seconds_bucket[5m]))

# Memory growth rate
rate(polln_memory_usage_bytes[1h])

# Cache hit rate
rate(polln_kv_cache_hits_total[5m]) /
  (rate(polln_kv_cache_hits_total[5m]) + rate(polln_kv_cache_misses_total[5m]))

# Active agents by colony
sum by (colony_id) (polln_agent_active)

# Cell operations by logic level
sum by (logic_level) (rate(polln_cell_operations_total[1h]))

# Collaboration session duration
avg(polln_collaboration_session_duration) by (workspace_id)

# WebSocket connection churn
rate(polln_websocket_connections[5m])
```

---

## Logging Architecture

### Structured Logging with Pino

POLLN uses **Pino** for structured JSON logging:

```typescript
import pino from 'pino';

const logger = pino({
  name: 'polln-spreadsheet',
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME,
  },
});

// Structured log example
logger.info({
  cellId: 'abc123',
  cellType: 'AnalysisCell',
  operation: 'process',
  duration: 42,
  confidence: 0.87,
  input: { value: 42 },
  output: { prediction: 45, confidence: 0.87 },
}, 'Cell processing completed');
```

### Log Levels

```typescript
enum LogLevel {
  TRACE = 60,   // Detailed diagnostic information
  DEBUG = 50,   // General diagnostic information
  INFO = 40,    // General informational messages
  WARN = 30,    // Warning messages
  ERROR = 20,   // Error messages
  FATAL = 10,   // Critical errors requiring immediate attention
}
```

### Log Aggregation Strategy

#### Centralized Logging with ELK

```yaml
# docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml
      - ./logs:/var/log/polln
    depends_on:
      - logstash
```

#### Logstash Pipeline Configuration

```ruby
# logstash/pipeline/polln.conf
input {
  beats {
    port => 5044
  }
}

filter {
  # Parse JSON logs
  json {
    source => "message"
  }

  # Extract cell-level metrics
  if [cellType] {
    mutate {
      add_field => {
        "metric_type" => "cell_operation"
        "metric_name" => "%{cellType}_processing"
      }
    }
  }

  # Extract error metrics
  if [level] == "error" {
    mutate {
      add_tag => ["error"]
    }
  }

  # Add environment
  mutate {
    add_field => {
      "environment" => "${ENVIRONMENT:production}"
      "cluster" => "${CLUSTER:main}"
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "polln-%{+YYYY.MM.dd}"
  }
}
```

### Log Retention Policy

```yaml
# Index Lifecycle Management
indices:
  polln-*:
    phases:
      hot:
        actions:
          rollover:
            max_age: 1d
            max_size: 50gb
      warm:
        min_age: 7d
        actions:
          forcemerge:
            max_num_segments: 1
          shrink:
            number_of_shards: 1
      delete:
        min_age: 30d
```

### Distributed Logging with OpenTelemetry

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-trace-jaeger';

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'polln-spreadsheet',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
  }),
});

const exporter = new JaegerExporter({
  endpoint: 'http://jaeger:14268/api/traces',
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();
```

### Log Query Examples

```json
// Kibana Query DSL (KQL)
// Find all cell processing errors
level: "error" AND cellType: * AND operation: "process"

// Find slow processing (>1s)
operation: "process" AND duration: >1000

// Find low confidence predictions
cellType: "PredictionCell" AND output.confidence: <0.5

// Find collaboration conflicts
operation: "resolve_conflict" AND workspace_id: *

// Find WebSocket connection issues
level: "error" AND message: *websocket*
```

---

## Alerting Strategy

### Alert Severity Levels

```typescript
enum AlertSeverity {
  CRITICAL = 'critical',  // Immediate action required
  ERROR = 'error',        // Action required soon
  WARNING = 'warning',    // Investigate within hour
  INFO = 'info',          // Informational only
}
```

### SLO/SLI Definitions

#### Service Level Objectives (SLOs)

```yaml
# Spreadsheet SLOs
slos:
  availability:
    target: 99.9%
    description: "Spreadsheet API availability"

  latency:
    target: 95th percentile < 500ms
    description: "Cell processing latency"

  correctness:
    target: 99.95%
    description: "Prediction accuracy"

  durability:
    target: 99.999%
    description: "Data persistence"
```

#### Service Level Indicators (SLIs)

```typescript
// Availability SLI
const availabilitySLI = async () => {
  const total = await metrics.getTotalRequests();
  const successful = await metrics.getSuccessfulRequests();
  return successful / total;
};

// Latency SLI
const latencySLI = async () => {
  const histogram = await metrics.getLatencyHistogram();
  return histogram.percentile(95);
};

// Correctness SLI
const correctnessSLI = async () => {
  const total = await metrics.getTotalPredictions();
  const accurate = await metrics.getAccuratePredictions();
  return accurate / total;
};
```

### Alert Rules

#### Critical Alerts

```yaml
# Critical: Service Down
- name: ServiceDown
  severity: critical
  condition: |
    up{job="polln-spreadsheet"} == 0
  annotations:
    summary: "Spreadsheet service is down"
    description: "The spreadsheet API has been down for >1m"
  actions:
    - type: pagerduty
      config:
        service: polln-critical
    - type: slack
      config:
        channel: "#alerts-critical"

# Critical: High Error Rate
- name: HighErrorRate
  severity: critical
  condition: |
    rate(polln_errors_total[5m]) > 0.05
  annotations:
    summary: "Error rate above 5%"
    description: "Error rate is {{ $value | humanizePercentage }}"
  for: 5m
  actions:
    - type: pagerduty
    - type: webhook
      config:
        url: https://api.opsgenie.com/v1/alerts

# Critical: Data Loss Risk
- name: DataLossRisk
  severity: critical
  condition: |
    rate(polln_persistence_failures_total[1m]) > 0
  annotations:
    summary: "Data persistence failures detected"
  actions:
    - type: pagerduty
    - type: email
      config:
        to: ["oncall@polln.ai", "dba@polln.ai"]
```

#### Warning Alerts

```yaml
# Warning: High Latency
- name: HighLatency
  severity: warning
  condition: |
    histogram_quantile(0.95, rate(polln_cell_processing_duration_bucket[5m])) > 1
  annotations:
    summary: "P95 latency above 1s"
  for: 10m
  actions:
    - type: slack
      config:
        channel: "#alerts-performance"

# Warning: Low Cache Hit Rate
- name: LowCacheHitRate
  severity: warning
  condition: |
    rate(polln_kv_cache_hits_total[10m]) /
    (rate(polln_kv_cache_hits_total[10m]) + rate(polln_kv_cache_misses_total[10m])) < 0.5
  annotations:
    summary: "Cache hit rate below 50%"
  actions:
    - type: slack
      config:
        channel: "#alerts-performance"

# Warning: High Memory Usage
- name: HighMemoryUsage
  severity: warning
  condition: |
    polln_memory_usage_bytes / polln_memory_limit_bytes > 0.8
  annotations:
    summary: "Memory usage above 80%"
  for: 5m
  actions:
    - type: slack
```

#### Info Alerts

```yaml
# Info: Scale Event
- name: ScaleEvent
  severity: info
  condition: |
    changes(polln_agent_active[1m]) > 0
  annotations:
    summary: "Colony scaled {{ $value }} agents"
  actions:
    - type: slack
      config:
        channel: "#scaling-events"

# Info: Deployment
- name: Deployment
  severity: info
  condition: |
    polln_deployments_total > 0
  annotations:
    summary: "New deployment detected"
  actions:
    - type: slack
      config:
        channel: "#deployments"
```

### Alert Fatigue Prevention

```yaml
# Alert grouping
group_by: [alertname, cluster, service]

# Alert throttling
repeat_interval: 12h

# Alert aggregation
group_wait: 30s
group_interval: 5m

# Silence rules
silences:
  - name: "Scheduled maintenance"
    matchers:
      - name: maintenance
        value: "true"
    startsAt: "2026-03-09T02:00:00Z"
    endsAt: "2026-03-09T04:00:00Z"
    comment: "Scheduled system maintenance"
```

### On-Call Procedures

```markdown
## On-Call Runbook

### Severity Levels
- **P0 (Critical)**: Immediate response (<5 min), service down
- **P1 (High)**: Response within 15 min, degraded service
- **P2 (Medium)**: Response within 1 hour, non-critical issue
- **P3 (Low)**: Response within 1 day, cosmetic issue

### Escalation Path
1. **Level 1**: On-call engineer
2. **Level 2** (15 min): Engineering lead
3. **Level 3** (30 min): CTO
4. **Level 4** (1 hour): Executive team

### Response Checklist
- [ ] Acknowledge alert in PagerDuty
- [ ] Check dashboard for context
- [ ] Review recent deployments
- [ ] Check error tracking (Sentry)
- [ ] Verify system health
- [ ] Implement fix or workaround
- [ ] Document incident
- [ ] Post-mortem within 24 hours
```

---

## Dashboarding

### Grafana Dashboard Templates

#### Main Dashboard

```json
{
  "dashboard": {
    "title": "POLLN Spreadsheet - Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(polln_requests_total[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(polln_errors_total[5m])) / sum(rate(polln_requests_total[5m]))"
          }
        ]
      },
      {
        "title": "P95 Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(polln_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Active Cells",
        "type": "stat",
        "targets": [
          {
            "expr": "count(polln_cell_active == 1)"
          }
        ]
      },
      {
        "title": "Collaboration Sessions",
        "type": "stat",
        "targets": [
          {
            "expr": "count(polln_collaboration_sessions_active)"
          }
        ]
      }
    ]
  }
}
```

#### Cell Performance Dashboard

```json
{
  "dashboard": {
    "title": "Cell Performance",
    "panels": [
      {
        "title": "Cell Operations by Type",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (cell_type) (polln_cell_operations_total)"
          }
        ]
      },
      {
        "title": "Cell Processing Duration",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(polln_cell_processing_duration_bucket[5m])"
          }
        ]
      },
      {
        "title": "Confidence Score Distribution",
        "type": "histogram",
        "targets": [
          {
            "expr": "polln_cell_confidence_score"
          }
        ]
      },
      {
        "title": "Sensation Types",
        "type": "bargauge",
        "targets": [
          {
            "expr": "sum by (sensation_type) (rate(polln_cell_sensations_total[1h]))"
          }
        ]
      }
    ]
  }
}
```

#### Collaboration Dashboard

```json
{
  "dashboard": {
    "title": "Collaboration Metrics",
    "panels": [
      {
        "title": "Active Sessions",
        "type": "graph",
        "targets": [
          {
            "expr": "count(polln_websocket_connections)"
          }
        ]
      },
      {
        "title": "Conflict Resolution Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(polln_collaboration_conflicts_total[5m])"
          }
        ]
      },
      {
        "title": "Yjs Update Throughput",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(polln_yjs_updates_total[1m]))"
          }
        ]
      },
      {
        "title": "User Activity Heatmap",
        "type": "heatmap",
        "targets": [
          {
            "expr": "count by (user_id, workspace_id) (polln_websocket_connections)"
          }
        ]
      }
    ]
  }
}
```

### Real-Time Metrics Visualization

#### WebSocket Streaming

```typescript
import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:4000/metrics');

ws.on('message', (data) => {
  const metrics = JSON.parse(data.toString());

  // Update UI
  updateDashboard(metrics);

  // Check thresholds
  checkThresholds(metrics);
});

function updateDashboard(metrics: Metrics) {
  // Update request rate
  document.getElementById('request-rate').textContent =
    metrics.requestRate.toFixed(2) + ' req/s';

  // Update error rate
  document.getElementById('error-rate').textContent =
    (metrics.errorRate * 100).toFixed(2) + '%';

  // Update latency
  document.getElementById('latency-p95').textContent =
    metrics.latencyP95.toFixed(0) + 'ms';
}

function checkThresholds(metrics: Metrics) {
  if (metrics.errorRate > 0.05) {
    triggerAlert('HighErrorRate', metrics.errorRate);
  }

  if (metrics.latencyP95 > 1000) {
    triggerAlert('HighLatency', metrics.latencyP95);
  }
}
```

### Business Intelligence Dashboards

#### Executive Summary

```typescript
interface ExecutiveMetrics {
  // User Engagement
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;

  // System Health
  availability: number;
  averageLatency: number;
  errorRate: number;

  // Business Value
  totalCellOperations: number;
  averageConfidence: number;
  collaborationSessions: number;

  // Cost Efficiency
  costPerOperation: number;
  resourceUtilization: number;
}

async function getExecutiveMetrics(): Promise<ExecutiveMetrics> {
  const dau = await prometheus.query('count(last_over_time(polln_user_active[24h]))');
  const availability = await prometheus.query('avg(up{job="polln-spreadsheet"})');
  const latency = await prometheus.query('histogram_quantile(0.95, polln_request_duration_seconds_bucket)');
  const errors = await prometheus.query('sum(rate(polln_errors_total[5m])) / sum(rate(polln_requests_total[5m]))');

  return {
    dailyActiveUsers: dau,
    availability: availability * 100,
    averageLatency: latency * 1000,
    errorRate: errors,
    // ... more metrics
  };
}
```

---

## Distributed Tracing

### Trace Context Propagation

```typescript
import { trace } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

// Set up propagator
const propagator = new W3CTraceContextPropagator();

// Inject context into outgoing requests
const tracer = trace.getTracer('polln-spreadsheet');

async function processCell(input: CellInput): Promise<CellOutput> {
  const span = tracer.startSpan('cell.process', {
    attributes: {
      'cell.id': input.cellId,
      'cell.type': input.cellType,
      'input.value': JSON.stringify(input.value),
    },
  });

  try {
    // Add child spans for each step
    await span.startActiveSpan('validate', async (validateSpan) => {
      validateSpan.setAttribute('validation.rules', input.rules.length);
      await validateInput(input);
      validateSpan.end();
    });

    await span.startActiveSpan('transform', async (transformSpan) => {
      transformSpan.setAttribute('transform.type', input.transformType);
      await transformInput(input);
      transformSpan.end();
    });

    const result = await span.startActiveSpan('compute', async (computeSpan) => {
      computeSpan.setAttribute('compute.logic_level', input.logicLevel);
      const r = await computeOutput(input);
      computeSpan.end();
      return r;
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
}
```

### Service Mesh Integration

```yaml
# Istio ServiceMesh Configuration
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: polln-spreadsheet
spec:
  hosts:
  - spreadsheet.polln.ai
  http:
  - match:
    - uri:
        prefix: /api/
    route:
    - destination:
        host: spreadsheet-service
        subset: v1
      weight: 100
    retries:
      attempts: 3
      perTryTimeout: 2s
    timeout: 10s
```

### Transaction Analysis

```typescript
interface TraceAnalysis {
  traceId: string;
  duration: number;
  spans: Span[];
  criticalPath: Span[];
  bottlenecks: Bottleneck[];
}

async function analyzeTrace(traceId: string): Promise<TraceAnalysis> {
  const trace = await jaeger.getTrace(traceId);

  const spans = trace.spans.map(span => ({
    operationName: span.operationName,
    duration: span.duration,
    startTime: span.startTime,
    tags: span.tags,
  }));

  // Find critical path
  const criticalPath = findCriticalPath(spans);

  // Find bottlenecks (spans with high duration)
  const bottlenecks = spans
    .filter(s => s.duration > 1000000) // >1s
    .map(s => ({
      operation: s.operationName,
      duration: s.duration,
      percentage: (s.duration / trace.duration) * 100,
    }));

  return {
    traceId,
    duration: trace.duration,
    spans,
    criticalPath,
    bottlenecks,
  };
}
```

### Performance Profiling

```typescript
import { profiler } from '@opentelemetry/sdk-node';

// Enable continuous profiling
profiler.start({
  interval: 1000, // Sample every 1s
  duration: 60000, // Collect for 60s
});

// Analyze profile
const profile = await profiler.getProfile();

// Find hot functions
const hotFunctions = profile.functions
  .filter(f => f.totalTime > 1000)
  .sort((a, b) => b.totalTime - a.totalTime)
  .slice(0, 10);

console.table(hotFunctions);
```

---

## Error Tracking

### Error Aggregation with Sentry

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_SHA,

  // Tracing
  tracesSampleRate: 0.1,

  // Performance monitoring
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],

  // beforeSend for filtering
  beforeSend(event) {
    // Filter out expected errors
    if (event.exception?.values?.[0]?.type === 'ValidationException') {
      return null;
    }
    return event;
  },
});

// Capture error with context
try {
  await processCell(input);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      cellType: input.cellType,
      operation: 'process',
    },
    user: {
      id: userId,
      email: userEmail,
    },
    extra: {
      input: JSON.stringify(input),
      cellId: input.cellId,
    },
  });
}
```

### Stack Trace Collection

```typescript
import { SourceMapSupport } from 'source-map-support';

SourceMapSupport.install();

// Enhance stack traces
Error.stackTraceLimit = 50;

// Capture full stack trace
function captureStackTrace(error: Error): string {
  const stack = error.stack || '';

  // Parse and enhance
  const lines = stack.split('\n').map(line => {
    // Add context from source maps
    const enhanced = enhanceStackTrace(line);
    return enhanced;
  });

  return lines.join('\n');
}

// Store in Sentry
Sentry.captureException(error, {
  contexts: {
    trace: {
      stack_trace: captureStackTrace(error),
    },
  },
});
```

### User Context Tracking

```typescript
interface UserContext {
  id: string;
  email?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  session?: string;
  workspace?: string;
}

// Set user context
function setUserContext(context: UserContext) {
  Sentry.setUser({
    id: context.id,
    email: context.email,
    plan: context.plan,
  });

  // Add custom context
  Sentry.setContext('workspace', {
    id: context.workspace,
    session: context.session,
  });
}

// Use in error tracking
try {
  await operation();
} catch (error) {
  Sentry.captureException(error, {
    user: { id: userContext.id },
    tags: {
      plan: userContext.plan,
      workspace: userContext.workspace,
    },
  });
}
```

### Error Rate Alerting

```typescript
// Monitor error rate
const errorRate = await prometheus.query(
  'sum(rate(polln_errors_total[5m])) / sum(rate(polln_requests_total[5m]))'
);

if (errorRate > 0.05) {
  // Trigger alert
  await Sentry.captureMessage(`High error rate: ${(errorRate * 100).toFixed(2)}%`, {
    level: 'error',
    tags: {
      alert: 'high_error_rate',
      threshold: '5%',
    },
  });

  // Send to PagerDuty
  await pagerduty.trigger({
    severity: 'error',
    summary: `Error rate above 5%: ${(errorRate * 100).toFixed(2)}%`,
    source: 'polln-spreadsheet',
  });
}
```

---

## Uptime Monitoring

### Synthetic Checks

```yaml
# Pingdom configuration
checks:
  - name: "Spreadsheet API"
    url: "https://spreadsheet.polln.ai/api/health"
    interval: 1
    timeout: 30
    regions:
      - "US East"
      - "US West"
      - "EU West"
      - "Asia Pacific"
    assertions:
      - type: "status"
        condition: 200
      - type: "json_path"
        path: "$.status"
        condition: "healthy"
```

### Real User Monitoring (RUM)

```typescript
// Browser RUM
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  release: process.env.GIT_SHA,

  // Performance monitoring
  tracesSampleRate: 0.1,

  // Session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
});

// Track core web vitals
function trackCoreWebVitals() {
  // Largest Contentful Paint (LCP)
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as any;
    Sentry.captureMessage(`LCP: ${lastEntry.renderTime || lastEntry.loadTime}ms`, {
      level: 'info',
      tags: {
        metric: 'lcp',
      },
    });
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay (FID)
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      Sentry.captureMessage(`FID: ${entry.processingStart - entry.startTime}ms`, {
        level: 'info',
        tags: {
          metric: 'fid',
        },
      });
    });
  }).observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift (CLS)
  let clsValue = 0;
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    });
    Sentry.captureMessage(`CLS: ${clsValue.toFixed(3)}`, {
      level: 'info',
      tags: {
        metric: 'cls',
      },
    });
  }).observe({ entryTypes: ['layout-shift'] });
}
```

### API Availability Monitoring

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkKafka(),
    checkColony(),
  ]);

  const healthy = checks.every(c => c.status === 'ok');

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks: {
      database: checks[0],
      redis: checks[1],
      kafka: checks[2],
      colony: checks[3],
    },
    timestamp: new Date().toISOString(),
  });
});

// External monitoring
async function checkHealth() {
  const response = await fetch('https://spreadsheet.polln.ai/health');
  const data = await response.json();

  // Record metrics
  prometheus.registerMetric({
    name: 'polln_health_check',
    value: data.status === 'healthy' ? 1 : 0,
    labels: {
      endpoint: 'health',
    },
  });

  return data.status === 'healthy';
}
```

### WebSocket Health Monitoring

```typescript
// Monitor WebSocket connections
class WebSocketHealthMonitor {
  private connections: Map<string, WebSocket> = new Map();
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    failedConnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
  };

  onConnection(ws: WebSocket, id: string) {
    this.connections.set(id, ws);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    ws.on('close', () => {
      this.connections.delete(id);
      this.metrics.activeConnections--;
    });

    ws.on('error', () => {
      this.metrics.failedConnections++;
    });

    ws.on('message', () => {
      this.metrics.messagesReceived++;
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      healthScore: this.metrics.activeConnections / this.metrics.totalConnections,
    };
  }
}
```

---

## Capacity Planning

### Growth Forecasting

```typescript
interface GrowthForecast {
  metric: string;
  current: number;
  projected: {
    month1: number;
    month3: number;
    month6: number;
    month12: number;
  };
  trend: 'increasing' | 'stable' | 'decreasing';
  confidence: number;
}

async function forecastGrowth(metric: string): Promise<GrowthForecast> {
  // Fetch historical data
  const historical = await prometheus.queryRange(
    metric,
    { start: 'now-90d', end: 'now', step: '1d' }
  );

  // Fit growth model (exponential)
  const model = fitExponentialGrowth(historical);

  // Project future values
  const projected = {
    month1: model.predict(30),
    month3: model.predict(90),
    month6: model.predict(180),
    month12: model.predict(365),
  };

  return {
    metric,
    current: historical[historical.length - 1],
    projected,
    trend: model.rate > 0.01 ? 'increasing' : model.rate < -0.01 ? 'decreasing' : 'stable',
    confidence: model.r2,
  };
}
```

### Resource Utilization Trends

```typescript
interface ResourceReport {
  cpu: UtilizationReport;
  memory: UtilizationReport;
  storage: UtilizationReport;
  network: UtilizationReport;
}

interface UtilizationReport {
  current: number;
  peak: number;
  average: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  forecast: {
    week1: number;
    month1: number;
    quarter1: number;
  };
}

async function generateResourceReport(): Promise<ResourceReport> {
  const cpuQuery = 'avg(rate(polln_cpu_usage_percent[5m]))';
  const memoryQuery = 'avg(polln_memory_usage_bytes / polln_memory_limit_bytes)';

  const [cpu, memory] = await Promise.all([
    analyzeResource(cpuQuery),
    analyzeResource(memoryQuery),
  ]);

  return {
    cpu,
    memory,
    storage: await analyzeStorage(),
    network: await analyzeNetwork(),
  };
}

async function analyzeResource(query: string): Promise<UtilizationReport> {
  const historical = await prometheus.queryRange(query, {
    start: 'now-30d',
    end: 'now',
    step: '1h',
  });

  const values = historical.map(v => v.value);
  const current = values[values.length - 1];
  const peak = Math.max(...values);
  const average = values.reduce((a, b) => a + b, 0) / values.length;

  // Linear regression for trend
  const trend = calculateTrend(values);

  return {
    current,
    peak,
    average,
    trend: trend.slope > 0.01 ? 'increasing' : trend.slope < -0.01 ? 'decreasing' : 'stable',
    forecast: {
      week1: predictValue(values, 7 * 24),
      month1: predictValue(values, 30 * 24),
      quarter1: predictValue(values, 90 * 24),
    },
  };
}
```

### Scaling Recommendations

```typescript
interface ScalingRecommendation {
  action: 'scale_up' | 'scale_down' | 'maintain';
  resource: 'cpu' | 'memory' | 'agents';
  current: number;
  recommended: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

async function generateScalingRecommendations(): Promise<ScalingRecommendation[]> {
  const recommendations: ScalingRecommendation[] = [];

  // Check CPU utilization
  const cpuUtil = await prometheus.query('avg(polln_cpu_usage_percent)');
  if (cpuUtil > 80) {
    recommendations.push({
      action: 'scale_up',
      resource: 'cpu',
      current: cpuUtil,
      recommended: cpuUtil * 1.5,
      reason: 'CPU utilization above 80%',
      priority: 'high',
    });
  }

  // Check memory utilization
  const memUtil = await prometheus.query('avg(polln_memory_usage_bytes / polln_memory_limit_bytes)');
  if (memUtil > 80) {
    recommendations.push({
      action: 'scale_up',
      resource: 'memory',
      current: memUtil,
      recommended: memUtil * 1.5,
      reason: 'Memory utilization above 80%',
      priority: 'high',
    });
  }

  // Check agent pool
  const activeAgents = await prometheus.query('sum(polln_agent_active)');
  const totalAgents = await prometheus.query('sum(polln_agent_total)');
  const agentUtil = activeAgents / totalAgents;

  if (agentUtil > 0.9) {
    recommendations.push({
      action: 'scale_up',
      resource: 'agents',
      current: totalAgents,
      recommended: totalAgents * 2,
      reason: 'Agent pool at 90% capacity',
      priority: 'medium',
    });
  }

  return recommendations;
}
```

### Cost Optimization

```typescript
interface CostReport {
  totalCost: number;
  costByResource: {
    compute: number;
    memory: number;
    storage: number;
    network: number;
  };
  costByService: {
    spreadsheet: number;
    colony: number;
    collaboration: number;
  };
  optimizations: CostOptimization[];
}

interface CostOptimization {
  type: 'rightsize' | 'schedule' | 'reserve' | 'spot';
  resource: string;
  currentCost: number;
  projectedCost: number;
  savings: number;
  implementation: string;
}

async function generateCostReport(): Promise<CostReport> {
  // Fetch cost data from cloud provider
  const costs = await fetchCostData();

  // Analyze utilization
  const utilization = await analyzeUtilization();

  // Generate optimizations
  const optimizations: CostOptimization[] = [];

  // Right-size underutilized resources
  for (const [resource, util] of Object.entries(utilization)) {
    if (util.average < 0.3) {
      optimizations.push({
        type: 'rightsize',
        resource,
        currentCost: costs[resource],
        projectedCost: costs[resource] * 0.5,
        savings: costs[resource] * 0.5,
        implementation: `Reduce ${resource} capacity by 50%`,
      });
    }
  }

  // Schedule non-critical resources
  optimizations.push({
    type: 'schedule',
    resource: 'development-environments',
    currentCost: costs.dev,
    projectedCost: costs.dev * 0.4,
    savings: costs.dev * 0.6,
    implementation: 'Schedule dev environments to run only during business hours',
  });

  return {
    totalCost: Object.values(costs).reduce((a, b) => a + b, 0),
    costByResource: {
      compute: costs.compute,
      memory: costs.memory,
      storage: costs.storage,
      network: costs.network,
    },
    costByService: {
      spreadsheet: costs.spreadsheet,
      colony: costs.colony,
      collaboration: costs.collaboration,
    },
    optimizations,
  };
}
```

---

## Implementation Guide

### Step 1: Set Up Monitoring Stack

```bash
# Deploy monitoring infrastructure
kubectl apply -f monitoring/namespace.yaml
kubectl apply -f monitoring/prometheus/
kubectl apply -f monitoring/grafana/
kubectl apply -f monitoring/jaeger/
kubectl apply -f monitoring/elasticsearch/

# Verify deployment
kubectl get pods -n monitoring
```

### Step 2: Integrate OpenTelemetry

```typescript
// src/monitoring/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-trace-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces',
  }),
  metricExporter: new PrometheusExporter({
    port: 9464,
  }),
  serviceName: 'polln-spreadsheet',
});

sdk.start();
```

### Step 3: Configure Dashboards

```bash
# Import Grafana dashboards
curl -X POST http://localhost:3000/api/dashboards/import \
  -H "Content-Type: application/json" \
  -d @monitoring/grafana/dashboards/spreadsheet-overview.json

curl -X POST http://localhost:3000/api/dashboards/import \
  -H "Content-Type: application/json" \
  -d @monitoring/grafana/dashboards/cell-performance.json
```

### Step 4: Set Up Alerting

```bash
# Apply Prometheus alerting rules
kubectl apply -f monitoring/prometheus/alerts/

# Configure alert manager
kubectl apply -f monitoring/alertmanager/
```

### Step 5: Enable Error Tracking

```typescript
// src/monitoring/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

---

## Best Practices

### DO's

1. **Define SLOs early** - Establish clear service level objectives
2. **Monitor the right metrics** - Focus on user-facing metrics
3. **Set up alerts thoughtfully** - Avoid alert fatigue
4. **Use structured logging** - Make logs queryable
5. **Implement distributed tracing** - Understand request flows
6. **Create dashboards for different audiences** - Technical vs. business
7. **Review and iterate** - Continuously improve monitoring
8. **Document runbooks** - Have clear incident response procedures

### DON'Ts

1. **Don't monitor everything** - Focus on what matters
2. **Don't ignore golden signals** - Latency, traffic, errors, saturation
3. **Don't set alerts without thresholds** - Avoid false positives
4. **Don't forget about cost** - Monitoring has a cost
5. **Don't neglect business metrics** - Connect to business value
6. **Don't skip on-call rotation** - Have clear ownership
7. **Don't ignore trends** - Look for patterns over time
8. **Don't forget to test** - Test monitoring and alerting

### Monitoring Checklist

- [ ] Metrics collection enabled
- [ ] Prometheus configured
- [ ] Grafana dashboards created
- [ ] Alert rules defined
- [ ] On-call rotation established
- [ ] Runbooks documented
- [ ] Error tracking integrated
- [ ] Distributed tracing enabled
- [ ] Log aggregation configured
- [ ] SLOs defined and tracked
- [ ] Capacity planning process in place
- [ ] Cost monitoring active
- [ ] Security monitoring enabled
- [ ] Performance baselines established
- [ ] Regular review meetings scheduled

---

**Document Owner:** POLLN Team
**Maintainer:** DevOps Team
**Last Review:** 2026-03-09
**Next Review:** 2026-04-09

For questions or issues, contact: #monitoring-slack or ops@polln.ai

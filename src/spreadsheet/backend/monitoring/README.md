# Spreadsheet Backend - Monitoring Module

Comprehensive Prometheus monitoring and Grafana dashboards for the Spreadsheet Backend.

## Features

- **Prometheus Metrics Collection**: Counters, Histograms, Gauges, and Summaries
- **Express Middleware**: Automatic HTTP request tracking
- **Cell-Specific Metrics**: Operation counts, type distribution, state transitions
- **WebSocket Metrics**: Connections, messages, broadcasts, latency
- **Cache Performance**: Hit/miss rates, evictions, promotions/demotions
- **Queue Monitoring**: Throughput, depth, consumer lag, error rates
- **Health Checks**: Liveness, readiness, startup, dependency probes
- **Grafana Dashboards**: Pre-built dashboards for visualization
- **Alert Rules**: Configurable Prometheus alerts

## Installation

```bash
npm install prom-client
```

## Quick Start

### 1. Initialize Monitoring

```typescript
import { getMetricsCollector, metricsMiddleware } from './monitoring';
import express from 'express';

const app = express();

// Apply metrics middleware
app.use(metricsMiddleware);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  const collector = getMetricsCollector();
  res.set('Content-Type', 'text/plain');
  res.send(await collector.getMetrics());
});
```

### 2. Track Custom Metrics

```typescript
import { getMetricsCollector } from './monitoring';

const collector = getMetricsCollector();

// Record an HTTP request
collector.recordHttpRequest('GET', '/api/cells', 200, 0.123);

// Record a cell operation
collector.recordCellOperation('TransformCell', 'transform', 0.456);

// Track cache operation
collector.recordCacheOperation('l1', true, 0.001);
```

### 3. Use Specialized Metrics

```typescript
import {
  getCellMetrics,
  getWebSocketMetrics,
  getCacheMetrics,
  getQueueMetrics,
} from './monitoring';

// Cell metrics
const cellMetrics = getCellMetrics();
cellMetrics.startOperation('cell-1', 'TransformCell', CellOperationType.TRANSFORM);
cellMetrics.endOperation('cell-1', 'TransformCell', CellOperationType.TRANSFORM, CellOperationStatus.SUCCESS);

// WebSocket metrics
const wsMetrics = getWebSocketMetrics();
wsMetrics.trackConnection('ws-conn-1');
wsMetrics.trackIncomingMessage('ws-conn-1', MessageType.CELL_UPDATE);

// Cache metrics
const cacheMetrics = getCacheMetrics();
cacheMetrics.trackGet(CacheTier.L1, 'key-1', true, 0.001);

// Queue metrics
const queueMetrics = getQueueMetrics();
queueMetrics.trackPublish('cell-operations', 1024);
```

### 4. Health Check Endpoints

```typescript
import { getHealthChecks } from './monitoring';

const healthChecks = getHealthChecks();

// Liveness probe
app.get('/health', healthChecks.livenessMiddleware());

// Readiness probe
app.get('/readiness', healthChecks.readinessMiddleware());

// Startup probe
app.get('/startup', healthChecks.startupMiddleware());

// Comprehensive health check
app.get('/healthz', healthChecks.healthMiddleware());
```

## Configuration

### Prometheus Configuration

Use the provided `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'spreadsheet-backend'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 10s
    metrics_path: '/metrics'
```

### Grafana Dashboards

Import the provided dashboards from the `grafana/` directory:

1. **overview.json** - System overview with key metrics
2. **api-performance.json** - API performance and latency
3. **cell-operations.json** - Cell operation metrics
4. **cache-performance.json** - Cache performance metrics
5. **infrastructure.json** - Infrastructure and resource usage

### Alert Rules

Configure alerts using `alerts.yml`:

```yaml
groups:
  - name: api_performance
    rules:
      - alert: HighErrorRate
        expr: sum(rate(spreadsheet_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(spreadsheet_http_requests_total[5m])) > 0.05
        for: 5m
```

## API Reference

### MetricsCollector

```typescript
class MetricsCollector {
  // Record HTTP request
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number): void

  // Record cell operation
  recordCellOperation(cellType: string, operation: string, duration: number, error?: Error): void

  // Record cache operation
  recordCacheOperation(tier: string, hit: boolean, duration: number): void

  // Update gauge metrics
  setActiveConnections(count: number, connectionType: string): void
  setQueueDepth(count: number, queueName: string): void
  setCacheSize(size: number, tier: string): void

  // Get metrics for Prometheus
  async getMetrics(): Promise<string>

  // Reset metrics
  async resetMetrics(): Promise<void>
}
```

### CellMetrics

```typescript
class CellMetrics {
  // Track operation lifecycle
  startOperation(cellId: string, cellType: string, operation: CellOperationType): void
  endOperation(cellId: string, cellType: string, operation: CellOperationType, status: CellOperationStatus, complexity?: number): void

  // Track state transitions
  recordStateTransition(cellId: string, cellType: string, fromState: CellState, toState: CellState): void

  // Track errors
  recordError(cellId: string, cellType: string, operation: CellOperationType, error: Error): void

  // Get statistics
  async getCellTypeStats(cellType: string): Promise<CellTypeStats>
}
```

### WebSocketMetrics

```typescript
class WebSocketMetrics {
  // Track connections
  trackConnection(connectionId: string, metadata?: ConnectionMetadata): void
  trackDisconnection(connectionId: string, reason?: string): void

  // Track messages
  trackIncomingMessage(connectionId: string, messageType: MessageType, messageSize?: number): void
  trackOutgoingMessage(connectionId: string, messageType: MessageType, messageSize?: number): void
  trackBroadcast(messageType: MessageType, recipientCount: number, duration: number, messageSize?: number): void

  // Get statistics
  getMessagesPerSecond(connectionId?: string): { incoming: number; outgoing: number }
  getConnectionStats(): ConnectionStats
}
```

### CacheMetrics

```typescript
class CacheMetrics {
  // Track operations
  trackGet(tier: CacheTier, key: string, hit: boolean, duration: number): void
  trackSet(tier: CacheTier, key: string, size: number, duration: number): void
  trackDelete(tier: CacheTier, key: string, duration: number): void

  // Track tier changes
  trackPromotion(fromTier: CacheTier, toTier: CacheTier, key: string): void
  trackDemotion(fromTier: CacheTier, toTier: CacheTier, key: string): void

  // Get statistics
  getHitRate(tier: CacheTier): number
  getCacheStats(): CacheStats
}
```

### QueueMetrics

```typescript
class QueueMetrics {
  // Track messages
  trackPublish(queueName: string, messageSize?: number): void
  trackConsume(queueName: string, consumerId: string): void
  trackAck(queueName: string, consumerId: string, processingTime: number): void
  trackNack(queueName: string, consumerId: string, error?: Error): void

  // Get statistics
  getThroughput(queueName: string, windowSeconds?: number): ThroughputStats
  getErrorRate(queueName: string): number
  getSystemStats(): SystemStats
}
```

### HealthChecks

```typescript
class HealthChecks {
  // Probe methods
  async liveness(): Promise<HealthCheckResult>
  async readiness(): Promise<HealthCheckResult>
  async startup(): Promise<HealthCheckResult>
  async health(): Promise<HealthCheckResult>

  // Middleware factories
  livenessMiddleware(): RequestHandler
  readinessMiddleware(): RequestHandler
  startupMiddleware(): RequestHandler
  healthMiddleware(): RequestHandler

  // Custom checks
  addCustomCheck(name: string, checkFn: () => Promise<ComponentHealth>): void
  removeCustomCheck(name: string): void

  // Dependencies
  setRedisClient(client: RedisClientType): void
  setDatabasePool(pool: any): void
}
```

## Metrics Reference

### HTTP Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `spreadsheet_http_requests_total` | Counter | method, path, status_code | Total HTTP requests |
| `spreadsheet_http_request_duration_seconds` | Histogram | method, path, status_code | Request duration |
| `spreadsheet_response_size_bytes` | Summary | endpoint | Response size |

### Cell Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `spreadsheet_cell_operations_total` | Counter | cell_type, operation, status | Total cell operations |
| `spreadsheet_cell_processing_seconds` | Histogram | cell_type, operation | Processing time |
| `spreadsheet_cell_complexity` | Summary | cell_type | Complexity score |

### Cache Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `spreadsheet_cache_operations_total` | Counter | tier, operation, result | Total cache operations |
| `spreadsheet_cache_size_bytes` | Gauge | tier | Cache size |
| `spreadsheet_cache_operation_seconds` | Histogram | tier, operation | Operation duration |

### Queue Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `spreadsheet_queue_messages_total` | Counter | queue_name, operation | Total queue messages |
| `spreadsheet_queue_depth` | Gauge | queue_name | Current queue depth |
| `spreadsheet_queue_processing_seconds` | Histogram | queue_name, operation | Processing time |

### WebSocket Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `spreadsheet_websocket_messages_total` | Counter | direction, message_type | Total messages |
| `spreadsheet_websocket_broadcast_seconds` | Histogram | broadcast_type | Broadcast duration |
| `spreadsheet_active_connections` | Gauge | connection_type | Active connections |

### System Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `spreadsheet_memory_usage_bytes` | Gauge | type | Memory usage |
| `spreadsheet_cpu_usage_percent` | Gauge | - | CPU usage |
| `spreadsheet_event_loop_lag_seconds` | Gauge | - | Event loop lag |

## Testing

Run the monitoring tests:

```bash
npm test src/spreadsheet/backend/monitoring/monitoring.test.ts
```

## Best Practices

1. **Use Descriptive Labels**: Include relevant context in metric labels
2. **Avoid High Cardinality**: Keep label values bounded
3. **Track Operation Duration**: Use histograms for timing metrics
4. **Monitor Errors**: Track both error count and error rate
5. **Set Appropriate Buckets**: Configure histogram buckets for your use case
6. **Use Gauges for State**: Track current state with gauges
7. **Use Counters for Events**: Count events with counters
8. **Implement Health Checks**: Use all three probe types
9. **Configure Alert Thresholds**: Set appropriate alert thresholds
10. **Review Dashboards Regularly**: Keep dashboards up to date

## License

MIT

/**
 * Monitoring Module - Index
 *
 * Exports all monitoring and metrics collection functionality.
 */

// Metrics Collector
export {
  MetricsCollector,
  getMetricsCollector,
  resetMetricsCollector,
} from './MetricsCollector';
export type { MetricLabels } from './MetricsCollector';

// Middleware
export {
  createMetricsMiddleware,
  createErrorMetricsMiddleware,
  createConnectionTrackingMiddleware,
  trackAsyncOperation,
  trackOperation,
  TrackOperation,
  metricsMiddleware,
  errorMetricsMiddleware,
  connectionTrackingMiddleware,
} from './Middleware';
export type {
  MetricsMiddlewareOptions,
} from './Middleware';

// Cell Metrics
export {
  CellMetrics,
  getCellMetrics,
  resetCellMetrics,
  CellOperationType,
  CellOperationStatus,
  CellState,
} from './CellMetrics';

// WebSocket Metrics
export {
  WebSocketMetrics,
  getWebSocketMetrics,
  resetWebSocketMetrics,
  MessageDirection,
  MessageType,
  ConnectionState,
} from './WebSocketMetrics';

// Cache Metrics
export {
  CacheMetrics,
  getCacheMetrics,
  resetCacheMetrics,
  CacheTier,
  CacheOperation,
  CacheResult,
} from './CacheMetrics';

// Queue Metrics
export {
  QueueMetrics,
  getQueueMetrics,
  resetQueueMetrics,
  QueueOperation,
  QueueState,
} from './QueueMetrics';

// Health Checks
export {
  HealthChecks,
  getHealthChecks,
  resetHealthChecks,
  HealthStatus,
} from './HealthChecks';
export type {
  HealthCheckResult,
  ComponentHealth,
  HealthCheckOptions,
} from './HealthChecks';

// Default exports
export { default } from './MetricsCollector';

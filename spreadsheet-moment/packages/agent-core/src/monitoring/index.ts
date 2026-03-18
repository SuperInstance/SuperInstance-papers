/**
 * Monitoring Module - Production Monitoring & Observability
 *
 * Comprehensive monitoring and observability for Claw API integration including:
 * - Metrics collection and aggregation
 * - Health checking and alerting
 * - Performance monitoring
 * - Error tracking
 *
 * @packageDocumentation
 * @version 1.0.0 - Week 4: Production Deployment
 */

// Re-export all monitoring components
export {
  MetricsCollector,
  MetricType,
  MetricCategory,
  getMetricsCollector,
  resetMetricsCollector
} from './MetricsCollector';

export {
  HealthChecker,
  HealthStatus,
  HealthCheckResult,
  CheckResult,
  HealthCheckConfig,
  HTTPHealthCheckConfig,
  WebSocketHealthCheckConfig,
  ResourceThresholds,
  getHealthChecker,
  resetHealthChecker
} from './HealthChecker';

// Re-export types
export type {
  Metric,
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  SummaryMetric
} from './MetricsCollector';


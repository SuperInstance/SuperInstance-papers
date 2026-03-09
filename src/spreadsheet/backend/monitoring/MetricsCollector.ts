/**
 * MetricsCollector.ts
 *
 * Prometheus metrics collector for the spreadsheet backend.
 * Provides centralized metric registration and collection.
 */

import promClient, { Counter, Histogram, Gauge, Summary, Registry } from 'prom-client';

/**
 * Metric labels for consistent tagging across all metrics
 */
export interface MetricLabels {
  method?: string;
  path?: string;
  status_code?: string;
  cell_type?: string;
  operation?: string;
  tier?: string;
  queue_name?: string;
  error_type?: string;
}

/**
 * MetricsCollector manages all Prometheus metrics
 */
export class MetricsCollector {
  private readonly registry: Registry;
  private readonly defaultLabels: Record<string, string>;

  // Counters
  private httpRequestsTotal: Counter<string>;
  private errorsTotal: Counter<string>;
  private cellOperationsTotal: Counter<string>;
  private cacheOperationsTotal: Counter<string>;
  private websocketMessagesTotal: Counter<string>;
  private queueMessagesTotal: Counter<string>;

  // Histograms
  private httpRequestDuration: Histogram<string>;
  private cellProcessingTime: Histogram<string>;
  private cacheOperationDuration: Histogram<string>;
  private websocketBroadcastDuration: Histogram<string>;
  private queueProcessingDuration: Histogram<string>;

  // Gauges
  private activeConnections: Gauge<string>;
  private queueDepth: Gauge<string>;
  private cacheSize: Gauge<string>;
  private memoryUsage: Gauge<string>;
  private cpuUsage: Gauge<string>;

  // Summaries
  private responseSize: Summary<string>;
  private cellComplexity: Summary<string>;

  constructor(defaultLabels: Record<string, string> = {}) {
    this.registry = new Registry();
    this.defaultLabels = defaultLabels;

    // Apply default labels to all metrics
    this.registry.setDefaultLabels(defaultLabels);

    // Initialize all metrics
    this.initializeCounters();
    this.initializeHistograms();
    this.initializeGauges();
    this.initializeSummaries();
  }

  private initializeCounters(): void {
    // HTTP request counter
    this.httpRequestsTotal = new promClient.Counter({
      name: 'spreadsheet_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code'],
      registers: [this.registry],
    });

    // Error counter
    this.errorsTotal = new promClient.Counter({
      name: 'spreadsheet_errors_total',
      help: 'Total number of errors',
      labelNames: ['error_type', 'component'],
      registers: [this.registry],
    });

    // Cell operation counter
    this.cellOperationsTotal = new promClient.Counter({
      name: 'spreadsheet_cell_operations_total',
      help: 'Total number of cell operations',
      labelNames: ['cell_type', 'operation', 'status'],
      registers: [this.registry],
    });

    // Cache operation counter
    this.cacheOperationsTotal = new promClient.Counter({
      name: 'spreadsheet_cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['tier', 'operation', 'result'],
      registers: [this.registry],
    });

    // WebSocket message counter
    this.websocketMessagesTotal = new promClient.Counter({
      name: 'spreadsheet_websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['direction', 'message_type'],
      registers: [this.registry],
    });

    // Queue message counter
    this.queueMessagesTotal = new promClient.Counter({
      name: 'spreadsheet_queue_messages_total',
      help: 'Total number of queue messages',
      labelNames: ['queue_name', 'operation'],
      registers: [this.registry],
    });
  }

  private initializeHistograms(): void {
    // HTTP request duration
    this.httpRequestDuration = new promClient.Histogram({
      name: 'spreadsheet_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // Cell processing time
    this.cellProcessingTime = new promClient.Histogram({
      name: 'spreadsheet_cell_processing_seconds',
      help: 'Cell operation processing time in seconds',
      labelNames: ['cell_type', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
      registers: [this.registry],
    });

    // Cache operation duration
    this.cacheOperationDuration = new promClient.Histogram({
      name: 'spreadsheet_cache_operation_seconds',
      help: 'Cache operation duration in seconds',
      labelNames: ['tier', 'operation'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05],
      registers: [this.registry],
    });

    // WebSocket broadcast duration
    this.websocketBroadcastDuration = new promClient.Histogram({
      name: 'spreadsheet_websocket_broadcast_seconds',
      help: 'WebSocket broadcast duration in seconds',
      labelNames: ['broadcast_type'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
      registers: [this.registry],
    });

    // Queue processing duration
    this.queueProcessingDuration = new promClient.Histogram({
      name: 'spreadsheet_queue_processing_seconds',
      help: 'Queue message processing time in seconds',
      labelNames: ['queue_name', 'operation'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
  }

  private initializeGauges(): void {
    // Active connections
    this.activeConnections = new promClient.Gauge({
      name: 'spreadsheet_active_connections',
      help: 'Number of active connections',
      labelNames: ['connection_type'],
      registers: [this.registry],
    });

    // Queue depth
    this.queueDepth = new promClient.Gauge({
      name: 'spreadsheet_queue_depth',
      help: 'Current queue depth',
      labelNames: ['queue_name'],
      registers: [this.registry],
    });

    // Cache size
    this.cacheSize = new promClient.Gauge({
      name: 'spreadsheet_cache_size_bytes',
      help: 'Current cache size in bytes',
      labelNames: ['tier'],
      registers: [this.registry],
    });

    // Memory usage
    this.memoryUsage = new promClient.Gauge({
      name: 'spreadsheet_memory_usage_bytes',
      help: 'Process memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    // CPU usage
    this.cpuUsage = new promClient.Gauge({
      name: 'spreadsheet_cpu_usage_percent',
      help: 'Process CPU usage percentage',
      registers: [this.registry],
    });
  }

  private initializeSummaries(): void {
    // Response size
    this.responseSize = new promClient.Summary({
      name: 'spreadsheet_response_size_bytes',
      help: 'Response size in bytes',
      labelNames: ['endpoint'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    // Cell complexity
    this.cellComplexity = new promClient.Summary({
      name: 'spreadsheet_cell_complexity',
      help: 'Cell operation complexity score',
      labelNames: ['cell_type'],
      percentiles: [0.5, 0.75, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });
  }

  // Counter methods
  incrementHttpRequests(labels: MetricLabels): void {
    this.httpRequestsTotal.inc({
      method: labels.method || 'unknown',
      path: labels.path || 'unknown',
      status_code: labels.status_code || 'unknown',
    });
  }

  incrementErrors(labels: MetricLabels): void {
    this.errorsTotal.inc({
      error_type: labels.error_type || 'unknown',
      component: labels.cell_type || 'unknown',
    });
  }

  incrementCellOperations(labels: MetricLabels): void {
    this.cellOperationsTotal.inc({
      cell_type: labels.cell_type || 'unknown',
      operation: labels.operation || 'unknown',
      status: labels.status_code || 'unknown',
    });
  }

  incrementCacheOperations(labels: MetricLabels): void {
    this.cacheOperationsTotal.inc({
      tier: labels.tier || 'unknown',
      operation: labels.operation || 'unknown',
      result: labels.status_code || 'unknown',
    });
  }

  incrementWebsocketMessages(labels: MetricLabels): void {
    this.websocketMessagesTotal.inc({
      direction: labels.operation || 'unknown',
      message_type: labels.cell_type || 'unknown',
    });
  }

  incrementQueueMessages(labels: MetricLabels): void {
    this.queueMessagesTotal.inc({
      queue_name: labels.queue_name || 'unknown',
      operation: labels.operation || 'unknown',
    });
  }

  // Histogram methods
  observeHttpRequestDuration(duration: number, labels: MetricLabels): void {
    this.httpRequestDuration.observe({
      method: labels.method || 'unknown',
      path: labels.path || 'unknown',
      status_code: labels.status_code || 'unknown',
    }, duration);
  }

  observeCellProcessingTime(duration: number, labels: MetricLabels): void {
    this.cellProcessingTime.observe({
      cell_type: labels.cell_type || 'unknown',
      operation: labels.operation || 'unknown',
    }, duration);
  }

  observeCacheOperationDuration(duration: number, labels: MetricLabels): void {
    this.cacheOperationDuration.observe({
      tier: labels.tier || 'unknown',
      operation: labels.operation || 'unknown',
    }, duration);
  }

  observeWebsocketBroadcastDuration(duration: number, labels: MetricLabels): void {
    this.websocketBroadcastDuration.observe({
      broadcast_type: labels.cell_type || 'unknown',
    }, duration);
  }

  observeQueueProcessingDuration(duration: number, labels: MetricLabels): void {
    this.queueProcessingDuration.observe({
      queue_name: labels.queue_name || 'unknown',
      operation: labels.operation || 'unknown',
    }, duration);
  }

  // Gauge methods
  setActiveConnections(count: number, connectionType: string): void {
    this.activeConnections.set({ connection_type: connectionType }, count);
  }

  setQueueDepth(count: number, queueName: string): void {
    this.queueDepth.set({ queue_name: queueName }, count);
  }

  setCacheSize(size: number, tier: string): void {
    this.cacheSize.set({ tier }, size);
  }

  setMemoryUsage(bytes: number, type: string): void {
    this.memoryUsage.set({ type }, bytes);
  }

  setCpuUsage(percent: number): void {
    this.cpuUsage.set(percent);
  }

  // Summary methods
  observeResponseSize(size: number, endpoint: string): void {
    this.responseSize.observe({ endpoint }, size);
  }

  observeCellComplexity(complexity: number, cellType: string): void {
    this.cellComplexity.observe({ cell_type: cellType }, complexity);
  }

  // Registry methods
  getRegistry(): Registry {
    return this.registry;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async clearMetrics(): Promise<void> {
    return this.registry.clear();
  }

  /**
   * Update system resource metrics
   */
  updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    this.setMemoryUsage(memUsage.heapUsed, 'heap_used');
    this.setMemoryUsage(memUsage.heapTotal, 'heap_total');
    this.setMemoryUsage(memUsage.rss, 'rss');
    this.setMemoryUsage(memUsage.external, 'external');
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return this.registry.getMetricsAsArray().map(metric => metric.name);
  }

  /**
   * Remove all metrics
   */
  removeAllMetrics(): void {
    this.registry.clear();
  }

  /**
   * Merge another registry into this one
   */
  mergeRegistry(otherRegistry: Registry): void {
    otherRegistry.getMetricsAsArray().forEach(metric => {
      this.registry.registerMetric(metric);
    });
  }

  /**
   * Get metric by name
   */
  getMetricByName(name: string): promClient.Metric<string> | undefined {
    return this.registry.getMetricAs(name);
  }
}

/**
 * Singleton instance of MetricsCollector
 */
let metricsCollectorInstance: MetricsCollector | null = null;

/**
 * Get or create the MetricsCollector singleton
 */
export function getMetricsCollector(defaultLabels?: Record<string, string>): MetricsCollector {
  if (!metricsCollectorInstance) {
    metricsCollectorInstance = new MetricsCollector(defaultLabels);
  }
  return metricsCollectorInstance;
}

/**
 * Reset the MetricsCollector singleton (useful for testing)
 */
export function resetMetricsCollector(): void {
  if (metricsCollectorInstance) {
    metricsCollectorInstance.removeAllMetrics();
  }
  metricsCollectorInstance = null;
}

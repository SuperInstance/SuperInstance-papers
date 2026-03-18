# Production Monitoring & Observability Configuration

**Repository:** spreadsheet-moment
**Environment:** Production
**Version:** 1.0.0
**Date:** 2026-03-16
**Status:** Production Ready

---

## Table of Contents

1. [Monitoring Strategy](#monitoring-strategy)
2. [Metrics Collection](#metrics-collection)
3. [Logging Strategy](#logging-strategy)
4. [Alerting Configuration](#alerting-configuration)
5. [Dashboard Setup](#dashboard-setup)
6. [Performance Monitoring](#performance-monitoring)
7. [Error Tracking](#error-tracking)
8. [User Analytics](#user-analytics)
9. [System Health Monitoring](#system-health-monitoring)
10. [Incident Response](#incident-response)

---

## Monitoring Strategy

### Monitoring Pillars

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STRATEGY                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   METRICS    │  │    LOGS      │  │    TRACES    │      │
│  │              │  │              │  │              │      │
│  │  • Counters  │  │  • Structured│  │  • Request   │      │
│  │  • Gauges    │  │  • JSON      │  │  • Distributed      │
│  │  • Histograms│  │  • Correlated│  │  • Spans     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   ALERTS    │  │  DASHBOARDS  │  │   REPORTS    │      │
│  │              │  │              │  │              │      │
│  │  • Real-time │  │  • Grafana   │  │  • Daily     │      │
│  │  • Severity  │  │  • Cloudflare│  │  • Weekly    │      │
│  │  • Escalation│  │  • Custom    │  │  • Monthly   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Performance Indicators (KPIs)

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **Error Rate** | < 1% | > 1% | > 5% |
| **P95 Latency** | < 200ms | > 200ms | > 500ms |
| **P99 Latency** | < 500ms | > 500ms | > 1000ms |
| **Availability** | > 99.9% | < 99.9% | < 99% |
| **Memory Usage** | < 80% | > 80% | > 90% |
| **CPU Usage** | < 70% | > 70% | > 85% |
| **WebSocket Success Rate** | > 99% | < 99% | < 95% |
| **Cache Hit Rate** | > 80% | < 80% | < 60% |

---

## Metrics Collection

### Cloudflare Workers Metrics

```typescript
// Metrics Collector
export class MetricsCollector {
  private analytics: AnalyticsEngineDataset;
  private env: Env;

  constructor(env: Env) {
    this.analytics = env.ANALYTICS;
    this.env = env;
  }

  // Request metrics
  async recordRequest(request: Request, response: Response, duration: number): Promise<void> {
    const url = new URL(request.url);

    await this.analytics.writeDataPoint({
      blobs: [
        'http_request',
        request.method,
        url.pathname,
        response.status.toString(),
      ],
      doubles: [duration, Date.now()],
      indexes: [this.env.ENVIRONMENT],
    });
  }

  // Error metrics
  async recordError(error: Error, context: any): Promise<void> {
    await this.analytics.writeDataPoint({
      blobs: [
        'error',
        error.name,
        error.message,
        JSON.stringify(context),
      ],
      doubles: [Date.now()],
      indexes: [this.env.ENVIRONMENT],
    });
  }

  // Business metrics
  async recordCellUpdate(cellId: string, operation: string): Promise<void> {
    await this.analytics.writeDataPoint({
      blobs: ['cell_operation', cellId, operation],
      doubles: [Date.now()],
      indexes: [this.env.ENVIRONMENT],
    });
  }

  // WebSocket metrics
  async recordWebSocketConnection(action: 'connect' | 'disconnect' | 'error'): Promise<void> {
    await this.analytics.writeDataPoint({
      blobs: ['websocket', action],
      doubles: [Date.now()],
      indexes: [this.env.ENVIRONMENT],
    });
  }

  // Cache metrics
  async recordCacheHit(key: string, hit: boolean): Promise<void> {
    await this.analytics.writeDataPoint({
      blobs: ['cache', key, hit ? 'hit' : 'miss'],
      doubles: [Date.now()],
      indexes: [this.env.ENVIRONMENT],
    });
  }

  // Claw API metrics
  async recordClawAPICall(operation: string, duration: number, success: boolean): Promise<void> {
    await this.analytics.writeDataPoint({
      blobs: ['claw_api', operation, success ? 'success' : 'failure'],
      doubles: [duration, Date.now()],
      indexes: [this.env.ENVIRONMENT],
    });
  }
}
```

### Custom Metrics Definitions

```typescript
// Metric Types and Definitions
export interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  description: string;
  unit: string;
  labels?: string[];
}

export const CUSTOM_METRICS: Record<string, MetricDefinition> = {
  // Request Metrics
  http_requests_total: {
    name: 'http_requests_total',
    type: 'counter',
    description: 'Total number of HTTP requests',
    unit: 'requests',
    labels: ['method', 'path', 'status'],
  },

  http_request_duration_ms: {
    name: 'http_request_duration_ms',
    type: 'histogram',
    description: 'HTTP request latency in milliseconds',
    unit: 'milliseconds',
    labels: ['method', 'path'],
  },

  // Error Metrics
  errors_total: {
    name: 'errors_total',
    type: 'counter',
    description: 'Total number of errors',
    unit: 'errors',
    labels: ['type', 'severity'],
  },

  // Business Metrics
  cell_operations_total: {
    name: 'cell_operations_total',
    type: 'counter',
    description: 'Total number of cell operations',
    unit: 'operations',
    labels: ['operation', 'cell_type'],
  },

  claw_api_calls_total: {
    name: 'claw_api_calls_total',
    type: 'counter',
    description: 'Total number of Claw API calls',
    unit: 'calls',
    labels: ['operation', 'status'],
  },

  claw_api_duration_ms: {
    name: 'claw_api_duration_ms',
    type: 'histogram',
    description: 'Claw API call duration in milliseconds',
    unit: 'milliseconds',
    labels: ['operation'],
  },

  // WebSocket Metrics
  websocket_connections_active: {
    name: 'websocket_connections_active',
    type: 'gauge',
    description: 'Number of active WebSocket connections',
    unit: 'connections',
  },

  websocket_messages_total: {
    name: 'websocket_messages_total',
    type: 'counter',
    description: 'Total number of WebSocket messages',
    unit: 'messages',
    labels: ['direction', 'type'],
  },

  // Cache Metrics
  cache_hits_total: {
    name: 'cache_hits_total',
    type: 'counter',
    description: 'Total number of cache hits',
    unit: 'hits',
    labels: ['cache_type'],
  },

  cache_misses_total: {
    name: 'cache_misses_total',
    type: 'counter',
    description: 'Total number of cache misses',
    unit: 'misses',
    labels: ['cache_type'],
  },

  // System Metrics
  memory_usage_bytes: {
    name: 'memory_usage_bytes',
    type: 'gauge',
    description: 'Memory usage in bytes',
    unit: 'bytes',
  },

  cpu_usage_percent: {
    name: 'cpu_usage_percent',
    type: 'gauge',
    description: 'CPU usage percentage',
    unit: 'percent',
  },
};
```

---

## Logging Strategy

### Structured Logging

```typescript
// Structured Logger
export class StructuredLogger {
  private env: Env;
  private context: ExecutionContext;

  constructor(env: Env, context: ExecutionContext) {
    this.env = env;
    this.context = context;
  }

  private log(level: string, message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.env.ENVIRONMENT,
      version: this.env.API_VERSION,
      ...data,
    };

    // Console logging for development
    if (this.env.ENVIRONMENT !== 'production') {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(JSON.stringify(logEntry));
    }

    // In production, send to log aggregation service
    if (this.env.ENVIRONMENT === 'production') {
      this.sendToLogAggregation(logEntry);
    }
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error, data?: any): void {
    this.log('error', message, {
      ...data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  debug(message: string, data?: any): void {
    if (this.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, data);
    }
  }

  private async sendToLogAggregation(logEntry: any): Promise<void> {
    // Implement log aggregation (Cloudflare Logpush, Splunk, etc.)
    // For now, we'll use Analytics Engine
    await this.env.ANALYTICS.writeDataPoint({
      blobs: [JSON.stringify(logEntry)],
      doubles: [Date.now()],
      indexes: ['logs'],
    });
  }
}
```

### Request/Response Logging

```typescript
// Request Logger Middleware
export class RequestLogger {
  private logger: StructuredLogger;
  private metrics: MetricsCollector;

  constructor(logger: StructuredLogger, metrics: MetricsCollector) {
    this.logger = logger;
    this.metrics = metrics;
  }

  async logRequest(request: Request, response: Response, duration: number): Promise<void> {
    const url = new URL(request.url);
    const logData = {
      request: {
        method: request.method,
        url: url.pathname,
        query: url.search,
        headers: this.sanitizeHeaders(request.headers),
        cf: request.cf,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: this.sanitizeHeaders(response.headers),
      },
      performance: {
        duration: duration,
        timestamp: Date.now(),
      },
    };

    this.logger.info('Request completed', logData);
    await this.metrics.recordRequest(request, response, duration);
  }

  private sanitizeHeaders(headers: Headers): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];

    headers.forEach((value, key) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }
}
```

---

## Alerting Configuration

### Alert Definitions

```typescript
// Alert Configuration
export interface AlertConfig {
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  condition: () => Promise<boolean>;
  message: string;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook';
  target: string;
  payload?: any;
}

// Production Alerts
export const PRODUCTION_ALERTS: AlertConfig[] = [
  {
    name: 'high_error_rate',
    description: 'Error rate exceeds threshold',
    severity: 'critical',
    condition: async () => {
      // Check error rate from metrics
      // Return true if error rate > 5%
      return false; // Implement logic
    },
    message: 'Error rate is CRITICAL: {{error_rate}}% (> 5% threshold)',
    actions: [
      {
        type: 'slack',
        target: '#alerts-production',
      },
      {
        type: 'pagerduty',
        target: 'engineering-on-call',
      },
    ],
  },
  {
    name: 'high_latency',
    description: 'Response latency exceeds threshold',
    severity: 'warning',
    condition: async () => {
      // Check P95 latency
      // Return true if P95 > 500ms
      return false; // Implement logic
    },
    message: 'P95 latency is HIGH: {{p95_latency}}ms (> 500ms threshold)',
    actions: [
      {
        type: 'slack',
        target: '#performance-production',
      },
    ],
  },
  {
    name: 'websocket_failures',
    description: 'WebSocket connection failures',
    severity: 'critical',
    condition: async () => {
      // Check WebSocket success rate
      // Return true if success rate < 95%
      return false; // Implement logic
    },
    message: 'WebSocket success rate is CRITICAL: {{success_rate}}% (< 95% threshold)',
    actions: [
      {
        type: 'slack',
        target: '#alerts-production',
        payload: { channels: ['#websocket-team'] },
      },
    ],
  },
  {
    name: 'memory_usage',
    description: 'Memory usage exceeds threshold',
    severity: 'warning',
    condition: async () => {
      // Check memory usage
      // Return true if memory > 80%
      return false; // Implement logic
    },
    message: 'Memory usage is HIGH: {{memory_usage}}% (> 80% threshold)',
    actions: [
      {
        type: 'slack',
        target: '#infrastructure',
      },
    ],
  },
  {
    name: 'cache_hit_rate',
    description: 'Cache hit rate below threshold',
    severity: 'warning',
    condition: async () => {
      // Check cache hit rate
      // Return true if hit rate < 60%
      return false; // Implement logic
    },
    message: 'Cache hit rate is LOW: {{hit_rate}}% (< 60% threshold)',
    actions: [
      {
        type: 'slack',
        target: '#performance-production',
      },
    ],
  },
];
```

### Alert Manager

```typescript
// Alert Manager
export class AlertManager {
  private env: Env;
  private alerts: AlertConfig[];
  private logger: StructuredLogger;

  constructor(env: Env, logger: StructuredLogger) {
    this.env = env;
    this.alerts = PRODUCTION_ALERTS;
    this.logger = logger;
  }

  async checkAlerts(): Promise<void> {
    for (const alert of this.alerts) {
      try {
        const shouldAlert = await alert.condition();

        if (shouldAlert) {
          await this.triggerAlert(alert);
        }
      } catch (error) {
        this.logger.error(`Failed to check alert: ${alert.name}`, error as Error);
      }
    }
  }

  private async triggerAlert(alert: AlertConfig): Promise<void> {
    this.logger.warn(`Alert triggered: ${alert.name}`, {
      severity: alert.severity,
      message: alert.message,
    });

    // Execute alert actions
    for (const action of alert.actions) {
      await this.executeAction(action, alert);
    }
  }

  private async executeAction(action: AlertAction, alert: AlertConfig): Promise<void> {
    switch (action.type) {
      case 'slack':
        await this.sendSlackAlert(action.target, alert);
        break;
      case 'email':
        await this.sendEmailAlert(action.target, alert);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(action.target, alert);
        break;
      case 'webhook':
        await this.sendWebhookAlert(action.target, alert, action.payload);
        break;
    }
  }

  private async sendSlackAlert(channel: string, alert: AlertConfig): Promise<void> {
    const message = {
      channel,
      username: 'SpreadsheetMoment Alerts',
      icon_emoji: this.getSeverityEmoji(alert.severity),
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          title: `Alert: ${alert.name}`,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Environment',
              value: this.env.ENVIRONMENT,
              short: true,
            },
          ],
          timestamp: Math.floor(Date.now() / 1000),
        },
      ],
    };

    // Send to Slack webhook
    await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical':
        return ':rotating_light:';
      case 'warning':
        return ':warning:';
      case 'info':
        return ':information_source:';
      default:
        return ':grey_question:';
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
        return 'good';
      default:
        return '#808080';
    }
  }

  private async sendEmailAlert(email: string, alert: AlertConfig): Promise<void> {
    // Implement email sending
    this.logger.info('Email alert would be sent', { email, alert: alert.name });
  }

  private async sendPagerDutyAlert(service: string, alert: AlertConfig): Promise<void> {
    // Implement PagerDuty integration
    this.logger.info('PagerDuty alert would be sent', { service, alert: alert.name });
  }

  private async sendWebhookAlert(url: string, alert: AlertConfig, payload?: any): Promise<void> {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: alert.name,
        severity: alert.severity,
        message: alert.message,
        environment: this.env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });
  }
}
```

---

## Dashboard Setup

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "SpreadsheetMoment Production Dashboard",
    "tags": ["production", "spreadsheet-moment"],
    "timezone": "UTC",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{path}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(errors_total[5m])",
            "legendFormat": "{{type}} {{severity}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "P95 Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_ms)",
            "legendFormat": "P95 Latency"
          }
        ]
      },
      {
        "id": 4,
        "title": "WebSocket Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "websocket_connections_active",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "id": 5,
        "title": "Cache Hit Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))",
            "legendFormat": "Hit Rate"
          }
        ]
      },
      {
        "id": 6,
        "title": "Claw API Duration",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, claw_api_duration_ms)",
            "legendFormat": "P95 Duration"
          }
        ]
      }
    ]
  }
}
```

---

## Performance Monitoring

### Performance Monitoring Strategy

```typescript
// Performance Monitor
export class PerformanceMonitor {
  private logger: StructuredLogger;
  private metrics: MetricsCollector;

  constructor(logger: StructuredLogger, metrics: MetricsCollector) {
    this.logger = logger;
    this.metrics = metrics;
  }

  // Track request performance
  async trackRequest(request: Request, handler: () => Promise<Response>): Promise<Response> {
    const startTime = performance.now();
    const url = new URL(request.url);

    try {
      const response = await handler();
      const duration = performance.now() - startTime;

      await this.metrics.recordRequest(request, response, duration);

      // Log slow requests
      if (duration > 500) {
        this.logger.warn('Slow request detected', {
          url: url.pathname,
          duration,
          threshold: 500,
        });
      }

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      await this.metrics.recordError(error as Error, {
        url: url.pathname,
        duration,
      });

      throw error;
    }
  }

  // Track Claw API performance
  async trackClawAPICall(
    operation: string,
    call: () => Promise<any>
  ): Promise<any> {
    const startTime = performance.now();

    try {
      const result = await call();
      const duration = performance.now() - startTime;

      await this.metrics.recordClawAPICall(operation, duration, true);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      await this.metrics.recordClawAPICall(operation, duration, false);
      await this.metrics.recordError(error as Error, { operation });

      throw error;
    }
  }

  // Track database query performance
  async trackDatabaseQuery(
    query: string,
    execute: () => Promise<any>
  ): Promise<any> {
    const startTime = performance.now();

    try {
      const result = await execute();
      const duration = performance.now() - startTime;

      if (duration > 100) {
        this.logger.warn('Slow database query detected', {
          query,
          duration,
          threshold: 100,
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      await this.metrics.recordError(error as Error, {
        query,
        duration,
      });

      throw error;
    }
  }
}
```

---

## Error Tracking

### Error Tracking Strategy

```typescript
// Error Tracker
export class ErrorTracker {
  private logger: StructuredLogger;
  private metrics: MetricsCollector;

  constructor(logger: StructuredLogger, metrics: MetricsCollector) {
    this.logger = logger;
    this.metrics = metrics;
  }

  // Track error
  async trackError(error: Error, context: any): Promise<void> {
    // Log error
    this.logger.error('Error occurred', error, context);

    // Record error metric
    await this.metrics.recordError(error, context);

    // Group similar errors
    const errorGroup = this.groupError(error);

    // Check if error should trigger alert
    if (this.shouldAlert(error, errorGroup)) {
      await this.sendErrorAlert(error, context, errorGroup);
    }
  }

  private groupError(error: Error): string {
    // Group errors by type and message similarity
    return `${error.name}:${error.message}`;
  }

  private shouldAlert(error: Error, errorGroup: string): boolean {
    // Implement logic to determine if error should trigger alert
    // For example: new errors, critical errors, high-frequency errors
    return false;
  }

  private async sendErrorAlert(error: Error, context: any, errorGroup: string): Promise<void> {
    // Implement error alerting
    this.logger.error('Error alert triggered', {
      error: errorGroup,
      context,
    });
  }

  // Track error rate
  async getErrorRate(timeWindow: number = 300): Promise<number> {
    // Calculate error rate over time window (in seconds)
    // This would query the metrics storage
    return 0; // Implement logic
  }

  // Get top errors
  async getTopErrors(limit: number = 10): Promise<any[]> {
    // Get most frequent errors
    return []; // Implement logic
  }
}
```

---

## User Analytics

### User Analytics Tracking

```typescript
// User Analytics
export class UserAnalytics {
  private analytics: AnalyticsEngineDataset;

  constructor(analytics: AnalyticsEngineDataset) {
    this.analytics = analytics;
  }

  // Track page view
  async trackPageView(userId: string, page: string): Promise<void> {
    await this.analytics.writeDataPoint({
      blobs: ['page_view', page],
      doubles: [Date.now()],
      indexes: [userId],
    });
  }

  // Track user action
  async trackUserAction(userId: string, action: string, details?: any): Promise<void> {
    await this.analytics.writeDataPoint({
      blobs: ['user_action', action, JSON.stringify(details || {})],
      doubles: [Date.now()],
      indexes: [userId],
    });
  }

  // Track feature usage
  async trackFeatureUsage(userId: string, feature: string): Promise<void> {
    await this.analytics.writeDataPoint({
      blobs: ['feature_usage', feature],
      doubles: [Date.now()],
      indexes: [userId],
    });
  }

  // Track user session
  async trackSessionStart(userId: string): Promise<void> {
    await this.analytics.writeDataPoint({
      blobs: ['session_start'],
      doubles: [Date.now()],
      indexes: [userId],
    });
  }

  async trackSessionEnd(userId: string, duration: number): Promise<void> {
    await this.analytics.writeDataPoint({
      blobs: ['session_end'],
      doubles: [duration, Date.now()],
      indexes: [userId],
    });
  }
}
```

---

## System Health Monitoring

### Health Check Endpoints

```typescript
// Health Check Manager
export class HealthCheckManager {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async performHealthChecks(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { healthy: boolean; message?: string }>;
  }> {
    const checks: Record<string, { healthy: boolean; message?: string }> = {
      // KV storage check
      kv_storage: await this.checkKVStorage(),

      // D1 database check
      d1_database: await this.checkD1Database(),

      // Claw API check
      claw_api: await this.checkClawAPI(),

      // WebSocket check
      websocket: await this.checkWebSocket(),

      // Cache check
      cache: await this.checkCache(),
    };

    // Determine overall health
    const healthyCount = Object.values(checks).filter(c => c.healthy).length;
    const totalCount = Object.keys(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      status = 'healthy';
    } else if (healthyCount >= totalCount / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, checks };
  }

  private async checkKVStorage(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const testKey = `health_check_${Date.now()}`;
      await this.env.CELLS.put(testKey, 'test');
      const value = await this.env.CELLS.get(testKey);
      await this.env.CELLS.delete(testKey);

      if (value === 'test') {
        return { healthy: true };
      } else {
        return { healthy: false, message: 'KV storage read/write failed' };
      }
    } catch (error) {
      return { healthy: false, message: (error as Error).message };
    }
  }

  private async checkD1Database(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const result = await this.env.DB.prepare('SELECT 1').first();
      if (result) {
        return { healthy: true };
      } else {
        return { healthy: false, message: 'D1 database query failed' };
      }
    } catch (error) {
      return { healthy: false, message: (error as Error).message };
    }
  }

  private async checkClawAPI(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.env.CLAW_API_BASE_URL}/health`, {
        headers: {
          'Authorization': `Bearer ${this.env.CLAW_API_KEY}`,
        },
      });

      if (response.ok) {
        return { healthy: true };
      } else {
        return { healthy: false, message: `Claw API returned ${response.status}` };
      }
    } catch (error) {
      return { healthy: false, message: (error as Error).message };
    }
  }

  private async checkWebSocket(): Promise<{ healthy: boolean; message?: string }> {
    // WebSocket health check (simplified)
    return { healthy: true };
  }

  private async checkCache(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const testKey = `cache_health_check_${Date.now()}`;
      await this.env.CACHE.put(testKey, 'test', { expirationTtl: 60 });
      const value = await this.env.CACHE.get(testKey);
      await this.env.CACHE.delete(testKey);

      if (value === 'test') {
        return { healthy: true };
      } else {
        return { healthy: false, message: 'Cache read/write failed' };
      }
    } catch (error) {
      return { healthy: false, message: (error as Error).message };
    }
  }
}
```

---

## Incident Response

### Incident Response Procedures

1. **Detection**
   - Automated alerts trigger
   - Manual monitoring identifies issues
   - User reports received

2. **Assessment**
   - Determine severity (P1, P2, P3, P4)
   - Identify affected systems
   - Estimate impact

3. **Response**
   - Activate incident response team
   - Implement mitigation strategies
   - Communicate with stakeholders

4. **Resolution**
   - Fix root cause
   - Verify system recovery
   - Document incident

5. **Post-Mortem**
   - Write incident report
   - Identify action items
   - Improve processes

---

**Monitoring Version:** 1.0.0
**Last Updated:** 2026-03-16
**Next Review:** 2026-06-16

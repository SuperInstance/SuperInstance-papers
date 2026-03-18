# Phase 3 Integration Guide - Production Documentation

**Version:** 1.0.0 - Week 4: Production Deployment
**Date:** 2026-03-15
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Claw API Integration](#claw-api-integration)
4. [Monitoring & Observability](#monitoring--observability)
5. [Health Checking](#health-checking)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#trroubleshooting)
10. [Production Deployment](#production-deployment)

---

## Overview

This guide provides comprehensive documentation for integrating the Claw API into production applications. It covers API usage, monitoring, health checking, error handling, and deployment best practices.

### What is Claw?

Claw is an agentic AI system that enables autonomous reasoning and action within spreadsheet cells. Each Claw agent can:

- **Reason:** Multi-step reasoning with streaming updates
- **Act:** Execute actions on spreadsheet data
- **Collaborate:** Work with other Claw agents
- **Learn:** Adapt based on feedback

### Key Features

- **Real-time Updates:** WebSocket streaming of reasoning steps
- **Fault Tolerance:** Automatic retry with exponential backoff
- **Type Safety:** Full TypeScript support with Zod validation
- **Monitoring:** Comprehensive metrics and health checks
- **Security:** API key authentication and request validation

---

## Quick Start

### Installation

```bash
# Install the package
pnpm install @spreadsheet-moment/agent-core

# Install peer dependencies
pnpm install zod
```

### Basic Usage

```typescript
import { ClawClient } from '@spreadsheet-moment/agent-core';

// Create a Claw client
const client = new ClawClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key-here',
  wsUrl: 'wss://api.example.com/ws'
});

// Create a Claw agent
const claw = await client.createClaw({
  clawId: 'my-claw',
  cellId: 'A1',
  sheetId: 'sheet1',
  config: {
    goal: 'Analyze sales data and identify trends',
    context: {
      dataRange: 'A1:Z1000',
      timeframe: 'last-30-days'
    }
  }
});

// Trigger the Claw
const result = await client.triggerClaw({
  clawId: 'my-claw',
  triggerData: {
    action: 'analyze'
  }
});

// Listen for real-time updates
client.on('reasoningStep', (step) => {
  console.log('Reasoning:', step.content);
});

client.on('stateChange', (state) => {
  console.log('State changed to:', state.state);
});
```

---

## Claw API Integration

### HTTP API Methods

#### Create Claw Agent

```typescript
const response = await client.createClaw({
  clawId: 'unique-claw-id',
  cellId: 'A1',
  sheetId: 'sheet1',
  config: {
    goal: 'Analyze data',
    context: {},
    tools: ['web-search', 'calculator'],
    capabilities: ['read', 'write', 'analyze']
  }
});

// Response
interface CreateClawResponse {
  clawId: string;
  state: ClawState;
  createdAt: number;
  message: string;
}
```

#### Query Claw State

```typescript
const state = await client.queryClaw({
  clawId: 'my-claw'
});

// Response
interface QueryClawResponse {
  clawId: string;
  state: ClawState;
  currentStateInfo: ClawStateInfo;
  history: ClawStateInfo[];
}
```

#### Trigger Claw

```typescript
const result = await client.triggerClaw({
  clawId: 'my-claw',
  triggerData: {
    action: 'execute',
    parameters: {}
  }
});

// Response
interface TriggerClawResponse {
  clawId: string;
  executionId: string;
  state: ClawState;
  message: string;
}
```

#### Cancel Claw

```typescript
const result = await client.cancelClaw({
  clawId: 'my-claw',
  reason: 'User cancelled'
});

// Response
interface CancelClawResponse {
  clawId: string;
  state: ClawState.CANCELLED;
  message: string;
}
```

#### Approve Claw Action

```typescript
const result = await client.approveClaw({
  clawId: 'my-claw',
  actionId: 'action-123',
  approved: true,
  comment: 'Approved'
});

// Response
interface ApproveClawResponse {
  clawId: string;
  actionId: string;
  approved: boolean;
  message: string;
}
```

### WebSocket Events

#### Connection Events

```typescript
// Connection established
client.on('connected', () => {
  console.log('WebSocket connected');
});

// Connection lost
client.on('disconnected', () => {
  console.log('WebSocket disconnected');
});

// Reconnection failed
client.on('reconnectFailed', () => {
  console.log('Max reconnection attempts reached');
});
```

#### Claw Events

```typescript
// Reasoning step received
client.on('reasoningStep', (step: ReasoningStep) => {
  console.log(`Step ${step.stepNumber}:`, step.content);
  console.log('Confidence:', step.confidence);
});

// State changed
client.on('stateChange', (info: ClawStateInfo) => {
  console.log('State:', info.state);
  console.log('Progress:', info.progress);
});

// Approval required
client.on('approvalRequired', (action: ClawAction) => {
  console.log('Action requires approval:', action.description);
  showApprovalDialog(action);
});

// Action completed
client.on('actionCompleted', (action: ClawAction) => {
  console.log('Action completed:', action.result);
});

// Error occurred
client.on('clawError', (error: ClawError) => {
  console.error('Claw error:', error.message);
  handleError(error);
});

// Cell update
client.on('cellUpdate', (update: CellUpdate) => {
  console.log('Cell updated:', update.cellId, update.value);
  updateCellDisplay(update);
});
```

---

## Monitoring & Observability

### Metrics Collection

The ClawClient includes comprehensive metrics collection for production monitoring.

#### Setup Metrics Collector

```typescript
import { getMetricsCollector, MetricType } from '@spreadsheet-moment/agent-core';

// Get global metrics collector
const metrics = getMetricsCollector({
  debug: true,
  globalTags: {
    environment: 'production',
    region: 'us-east-1'
  },
  samplingRate: 1.0 // 100% sampling
});

// Metrics are automatically collected by ClawClient
```

#### Metric Types

```typescript
// Counter metrics (monotonically increasing)
metrics.recordHttpRequest('POST', '/api/claws', 200, 150);
metrics.recordClawCreation();
metrics.recordClawTrigger();

// Gauge metrics (can go up or down)
metrics.recordWebSocketConnection();
metrics.recordMemoryUsage();

// Histogram metrics (distributions)
metrics.recordOperationDuration('claw_execution', 5000);
```

#### Export Metrics

```typescript
// Export in Prometheus format
const prometheusMetrics = metrics.exportPrometheus();
console.log(prometheusMetrics);

// Export as JSON
const jsonMetrics = metrics.exportJSON();
console.log(jsonMetrics);

// Get metrics by category
const httpMetrics = metrics.getMetrics(MetricCategory.HTTP);
const errorMetrics = metrics.getMetrics(MetricCategory.ERROR);
```

### Performance Monitoring

#### Track Operation Performance

```typescript
import { MetricsCollector } from '@spreadsheet-moment/agent-core';

// Manual operation tracking
const startTime = Date.now();
await performExpensiveOperation();
const duration = Date.now() - startTime;

metrics.recordOperationDuration('expensive_operation', duration, {
  operation_type: 'data_analysis'
});
```

#### Monitor Latency Distribution

```typescript
// Histogram buckets automatically calculated
const latencyMetrics = metrics.getMetrics(MetricCategory.PERFORMANCE);

// Analyze latency distribution
latencyMetrics.forEach(metric => {
  if (metric.type === MetricType.HISTOGRAM) {
    console.log(`${metric.name}:`, metric.buckets);
  }
});
```

### Error Tracking

```typescript
// Record errors with context
metrics.recordError('validation_error', 'Invalid request payload', {
  endpoint: '/api/claws',
  error_code: 'INVALID_SCHEMA',
  user_id: 'user-123'
});

// Record HTTP errors
metrics.recordHttpError('POST', '/api/claws', 'Rate limit exceeded', 429, {
  user_id: 'user-123',
  retry_after: '60'
});
```

---

## Health Checking

### Setup Health Checker

```typescript
import { getHealthChecker, HealthStatus } from '@spreadsheet-moment/agent-core';

const healthChecker = getHealthChecker({
  debug: true
});

// Add HTTP health check
healthChecker.addHTTPCheck('api', {
  url: 'https://api.example.com/health',
  expectedStatus: 200,
  timeout: 5000
});

// Add WebSocket health check
healthChecker.addWebSocketCheck('websocket', {
  url: 'wss://api.example.com/ws',
  expectConnected: true
}, client);

// Add resource check
healthChecker.addResourceCheck('memory', {
  maxHeapMB: 512,
  maxHeapUsagePercent: 80
});

// Start monitoring
healthChecker.start();

// Listen for health changes
healthChecker.on('healthChange', (result) => {
  console.log('Health status:', result.status);
  console.log('Summary:', result.summary);

  if (result.status === HealthStatus.UNHEALTHY) {
    alertAdmins('System unhealthy!');
  }
});
```

### Health Check Results

```typescript
const health = await healthChecker.checkHealth();

// Overall status
console.log('Status:', health.status); // HEALTHY | DEGRADED | UNHEALTHY
console.log('Summary:', health.summary);

// Individual check results
health.checks.forEach(check => {
  console.log(`${check.name}: ${check.status}`);
  console.log(`  ${check.message}`);
  console.log(`  Duration: ${check.duration}ms`);
});
```

### Custom Health Checks

```typescript
// Add custom health check
healthChecker.addHealthCheck({
  name: 'database',
  interval: 30000, // 30 seconds
  timeout: 5000,
  failureThreshold: 3,
  check: async () => {
    const startTime = Date.now();

    try {
      // Perform health check
      await database.ping();

      return {
        name: 'database',
        status: HealthStatus.HEALTHY,
        message: 'Database responding',
        duration: Date.now() - startTime,
        metadata: {
          latency: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        message: `Database error: ${error.message}`,
        duration: Date.now() - startTime
      };
    }
  }
});
```

---

## Error Handling

### Error Types

```typescript
import { ClawAPIError, ClawErrorCode } from '@spreadsheet-moment/agent-core';

try {
  await client.createClaw(request);
} catch (error) {
  if (error instanceof ClawAPIError) {
    switch (error.code) {
      case ClawErrorCode.VALIDATION_ERROR:
        console.error('Validation failed:', error.details);
        break;

      case ClawErrorCode.UNAUTHORIZED:
        console.error('Authentication failed');
        // Redirect to login
        break;

      case ClawErrorCode.RATE_LIMITED:
        console.error('Rate limited. Retry after:', error.retryAfter);
        // Implement exponential backoff
        break;

      case ClawErrorCode.TIMEOUT:
        console.error('Request timeout');
        // Retry with longer timeout
        break;

      case ClawErrorCode.NOT_FOUND:
        console.error('Resource not found');
        break;

      default:
        console.error('Unknown error:', error.message);
    }
  }
}
```

### Retry Strategy

```typescript
// Automatic retry with exponential backoff
const client = new ClawClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key',
  maxRetries: 5, // Maximum retry attempts
  initialRetryDelay: 1000, // Initial delay: 1 second
  maxRetryDelay: 30000, // Maximum delay: 30 seconds
  retryBackoffMultiplier: 2 // Exponential backoff
});

// Client will automatically retry on:
// - Network errors
// - Timeouts
// - Rate limits (respects Retry-After header)
// - Server errors (5xx)
```

### Error Recovery

```typescript
// Listen for errors and implement recovery
client.on('clawError', (error) => {
  console.error('Claw error:', error);

  switch (error.type) {
    case 'validation_error':
      // Fix validation error
      fixValidationIssue(error.details);
      break;

    case 'rate_limit_error':
      // Wait and retry
      setTimeout(() => {
        client.triggerClaw({ clawId: error.clawId });
      }, error.retryAfter * 1000);
      break;

    case 'timeout_error':
      // Retry with longer timeout
      retryWithLongerTimeout(error.clawId);
      break;

    default:
      // Log error for investigation
      logErrorForInvestigation(error);
  }
});
```

---

## Performance Optimization

### Connection Pooling

```typescript
// ClawClient maintains a single WebSocket connection
// Multiple ClawClient instances will create multiple connections

// Use singleton pattern for optimal performance
import { getMetricsCollector } from '@spreadsheet-moment/agent-core';

// Single instance for entire application
const metrics = getMetricsCollector();
const client = new ClawClient(config);
```

### Request Batching

```typescript
// Batch multiple operations
const claws = await Promise.all([
  client.createClaw(clawConfig1),
  client.createClaw(clawConfig2),
  client.createClaw(clawConfig3)
]);
```

### Caching

```typescript
// Cache Claw state queries
const stateCache = new Map<string, ClawStateInfo>();

async function getCachedClawState(clawId: string): Promise<ClawStateInfo> {
  const cached = stateCache.get(clawId);
  if (cached && Date.now() - cached.timestamp < 5000) {
    return cached; // Cache for 5 seconds
  }

  const state = await client.queryClaw({ clawId });
  stateCache.set(clawId, state.currentStateInfo);
  return state.currentStateInfo;
}
```

### WebSocket Message Filtering

```typescript
// Subscribe only to relevant claws
client.subscribeToClaw('claw-1', 'A1', 'sheet1');
client.subscribeToClaw('claw-2', 'A2', 'sheet1');

// Unsubscribe when done
client.unsubscribeFromClaw('claw-1', 'A1', 'sheet1');
```

---

## Security Best Practices

### API Key Management

```typescript
// NEVER hardcode API keys
// Use environment variables
const apiKey = process.env.CLAW_API_KEY;

// Or use a secret management service
const apiKey = await secretsManager.getSecret('claw-api-key');

const client = new ClawClient({
  baseUrl: 'https://api.example.com',
  apiKey: apiKey // Minimum 20 characters
});
```

### Request Validation

```typescript
// Enable validation (default: true)
const client = new ClawClient({
  baseUrl: 'https://api.example.com',
  apiKey: apiKey,
  enableValidation: true
});

// All requests are validated using Zod schemas
// Invalid requests are rejected before being sent
```

### WebSocket Authentication

```typescript
// WebSocket automatically authenticates with API key
const client = new ClawClient({
  baseUrl: 'https://api.example.com',
  apiKey: apiKey,
  wsUrl: 'wss://api.example.com/ws'
  // WebSocket will authenticate automatically
});
```

### Content Security Policy

```typescript
// Sanitize headers in logs
const middleware = new MonitoringMiddleware({
  sanitizeHeaders: true,
  sensitiveHeaders: [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key'
  ]
});
```

---

## Troubleshooting

### Common Issues

#### WebSocket Connection Fails

**Problem:** WebSocket fails to connect

**Solutions:**
1. Check firewall rules allow WebSocket connections
2. Verify WebSocket URL is correct
3. Check API key is valid
4. Review browser console for errors

```typescript
// Enable debug logging
const client = new ClawClient({
  baseUrl: 'https://api.example.com',
  apiKey: apiKey,
  debug: true
});

// Monitor connection events
client.on('disconnected', () => {
  console.log('WebSocket disconnected');
});

client.on('reconnectFailed', () => {
  console.log('Reconnection failed - check network');
});
```

#### Rate Limiting

**Problem:** Receiving 429 errors

**Solutions:**
1. Implement exponential backoff (automatic)
2. Reduce request frequency
3. Contact support for higher limits

```typescript
// Automatic retry with rate limit handling
const client = new ClawClient({
  baseUrl: 'https://api.example.com',
  apiKey: apiKey,
  maxRetries: 5,
  initialRetryDelay: 1000,
  maxRetryDelay: 60000
});

// Monitor rate limit events
metricsCollector.on('metric', (metric) => {
  if (metric.name === 'http_errors_total' &&
      metric.labels?.status === '429') {
    console.warn('Rate limit detected');
  }
});
```

#### Memory Leaks

**Problem:** Memory usage increases over time

**Solutions:**
1. Dispose unused ClawClient instances
2. Clear event listeners
3. Monitor memory usage

```typescript
// Properly dispose client
client.dispose();

// Remove event listeners
client.removeAllListeners();

// Monitor memory usage
healthChecker.addResourceCheck('memory', {
  maxHeapMB: 512,
  maxHeapUsagePercent: 80
});

// Alert on high memory
healthChecker.on('warning', (warning) => {
  if (warning.type === 'high_memory') {
    console.warn(warning.message);
    // Take action to reduce memory usage
  }
});
```

#### Slow Response Times

**Problem:** API responses are slow

**Solutions:**
1. Check network connectivity
2. Monitor performance metrics
3. Implement caching
4. Use WebSocket for real-time updates

```typescript
// Monitor response times
metricsCollector.on('metric', (metric) => {
  if (metric.name === 'http_request_duration_ms') {
    console.log(`Request duration: ${metric.value}ms`);
    if (metric.value > 1000) {
      console.warn('Slow request detected');
    }
  }
});

// Use WebSocket for faster updates
client.on('reasoningStep', (step) => {
  // Real-time updates without polling
  updateUI(step);
});
```

### Debug Mode

Enable debug mode for detailed logging:

```typescript
const client = new ClawClient({
  baseUrl: 'https://api.example.com',
  apiKey: apiKey,
  debug: true
});

const metrics = getMetricsCollector({
  debug: true
});

const healthChecker = getHealthChecker({
  debug: true
});
```

---

## Production Deployment

### Environment Variables

```bash
# Required
CLAW_API_BASE_URL=https://api.example.com
CLAW_API_KEY=your-api-key-here

# Optional
CLAW_WS_URL=wss://api.example.com/ws
CLAW_REQUEST_TIMEOUT=30000
CLAW_MAX_RETRIES=5
CLAW_DEBUG=false

# Monitoring
CLAW_METRICS_ENABLED=true
CLAW_HEALTH_CHECK_ENABLED=true
CLAW_HEALTH_CHECK_INTERVAL=60000
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claw-client
spec:
  replicas: 3
  selector:
    matchLabels:
      app: claw-client
  template:
    metadata:
      labels:
        app: claw-client
    spec:
      containers:
      - name: claw-client
        image: claw-client:latest
        ports:
        - containerPort: 3000
        env:
        - name: CLAW_API_BASE_URL
          value: "https://api.example.com"
        - name: CLAW_API_KEY
          valueFrom:
            secretKeyRef:
              name: claw-secrets
              key: api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Monitoring Stack

#### Prometheus Metrics Endpoint

```typescript
import express from 'express';
import { getMetricsCollector } from '@spreadsheet-moment/agent-core';

const app = express();
const metrics = getMetricsCollector();

// Metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metrics.exportPrometheus());
});

app.listen(9090, () => {
  console.log('Metrics endpoint available on port 9090');
});
```

#### Grafana Dashboard

Import the following metrics into Grafana:

- `http_requests_total` - Total HTTP requests
- `http_request_duration_ms` - HTTP request duration
- `websocket_connections_active` - Active WebSocket connections
- `claw_creations_total` - Total claw creations
- `claw_triggers_total` - Total claw triggers
- `errors_total` - Total errors

### Health Check Endpoint

```typescript
import express from 'express';
import { getHealthChecker } from '@spreadsheet-moment/agent-core';

const app = express();
const healthChecker = getHealthChecker();

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = await healthChecker.checkHealth();

  const statusCode = health.status === HealthStatus.HEALTHY ? 200 :
                    health.status === HealthStatus.DEGRADED ? 200 : 503;

  res.status(statusCode).json(health);
});

app.listen(3000, () => {
  console.log('Health check endpoint available on port 3000');
});
```

---

## Support

For issues, questions, or contributions:

- **Documentation:** [https://docs.spreadsheet-moment.com](https://docs.spreadsheet-moment.com)
- **Issues:** [https://github.com/SuperInstance/spreadsheet-moment/issues](https://github.com/SuperInstance/spreadsheet-moment/issues)
- **Discussions:** [https://github.com/SuperInstance/spreadsheet-moment/discussions](https://github.com/SuperInstance/spreadsheet-moment/discussions)

---

**Document Version:** 1.0.0
**Last Updated:** 2026-03-15
**Maintained by:** SpreadsheetMoment Team

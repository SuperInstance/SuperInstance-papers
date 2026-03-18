# Production Deployment Guide

**Version:** 1.0.0 - Week 4: Production Deployment
**Date:** 2026-03-15
**Status:** Production Ready

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Environment Setup](#environment-setup)
3. [Configuration Management](#configuration-management)
4. [Deployment Strategies](#deployment-strategies)
5. [Monitoring & Logging](#monitoring--logging)
6. [Security Hardening](#security-hardening)
7. [Scaling Considerations](#scaling-considerations)
8. [Disaster Recovery](#disaster-recovery)
9. [Maintenance Procedures](#maintenance-procedures)
10. [Runbook](#runbook)

---

## Deployment Overview

### Architecture

The SpreadsheetMoment Claw API integration supports multiple deployment strategies:

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                         │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌──▼────────┐ ┌─▼──────────┐
│  Instance 1  │ │ Instance 2│ │ Instance 3 │
│              │ │          │ │            │
│ - ClawClient │ │ - Client │ │ - Client   │
│ - Monitoring │ │ - Metrics│ │ - Health   │
│ - Health     │ │ - Health │ │ - Logging  │
└──────────────┘ └──────────┘ └────────────┘
        │            │            │
        └────────────┼────────────┘
                     │
        ┌────────────▼────────────┐
        │   Claw API Server       │
        │ - WebSocket Gateway     │
        │ - HTTP API              │
        │ - Metrics Endpoint      │
        └─────────────────────────┘
```

### Deployment Targets

- **Cloudflare Workers** - Edge deployment with global distribution
- **Docker Containers** - Containerized deployment on any platform
- **Kubernetes** - Orchestration for large-scale deployments
- **Serverless** - AWS Lambda, Azure Functions, Google Cloud Functions

---

## Environment Setup

### Prerequisites

```bash
# Node.js 18+ required
node --version

# pnpm package manager
pnpm --version

# Git
git --version
```

### Environment Variables

Create a `.env.production` file:

```bash
# Claw API Configuration
CLAW_API_BASE_URL=https://api.example.com
CLAW_API_KEY=your-production-api-key
CLAW_WS_URL=wss://api.example.com/ws

# Request Configuration
CLAW_REQUEST_TIMEOUT=30000
CLAW_MAX_RETRIES=5
CLAW_INITIAL_RETRY_DELAY=1000
CLAW_MAX_RETRY_DELAY=30000
CLAW_RETRY_BACKOFF_MULTIPLIER=2

# WebSocket Configuration
CLAW_WS_RECONNECT_INTERVAL=5000
CLAW_MAX_WS_RECONNECT_DELAY=60000
CLAW_MAX_WS_RECONNECT_ATTEMPTS=10

# Monitoring Configuration
CLAW_METRICS_ENABLED=true
CLAW_METRICS_DEBUG=false
CLAW_METRICS_SAMPLING_RATE=1.0

# Health Check Configuration
CLAW_HEALTH_CHECK_ENABLED=true
CLAW_HEALTH_CHECK_INTERVAL=60000
CLAW_HEALTH_CHECK_TIMEOUT=5000

# Application Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

### Secret Management

**Never commit secrets to git.** Use one of these approaches:

#### Environment Variables (Simple)

```bash
# Export secrets in production environment
export CLAW_API_KEY="your-api-key"
```

#### Secret Managers (Recommended)

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name prod/claw-api-key \
  --secret-string "your-api-key"
```

**HashiCorp Vault:**
```bash
vault kv put secret/production/claw \
  api_key="your-api-key"
```

**Cloudflare Secrets:**
```bash
wrangler secret put CLAW_API_KEY
```

---

## Configuration Management

### Configuration Files

#### Production Configuration (`config/production.ts`)

```typescript
export const productionConfig = {
  claw: {
    baseUrl: process.env.CLAW_API_BASE_URL!,
    apiKey: process.env.CLAW_API_KEY!,
    wsUrl: process.env.CLAW_WS_URL,
    timeout: parseInt(process.env.CLAW_REQUEST_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.CLAW_MAX_RETRIES || '5'),
    initialRetryDelay: parseInt(process.env.CLAW_INITIAL_RETRY_DELAY || '1000'),
    maxRetryDelay: parseInt(process.env.CLAW_MAX_RETRY_DELAY || '30000'),
    retryBackoffMultiplier: parseFloat(
      process.env.CLAW_RETRY_BACKOFF_MULTIPLIER || '2'
    ),
    enableValidation: true,
    enableWebSocket: true,
    wsReconnectInterval: parseInt(process.env.CLAW_WS_RECONNECT_INTERVAL || '5000'),
    maxWsReconnectDelay: parseInt(process.env.CLAW_MAX_WS_RECONNECT_DELAY || '60000'),
    maxWsReconnectAttempts: parseInt(process.env.CLAW_MAX_WS_RECONNECT_ATTEMPTS || '10'),
    healthCheckInterval: parseInt(process.env.CLAW_HEALTH_CHECK_INTERVAL || '60000'),
    debug: process.env.CLAW_DEBUG === 'true'
  },

  monitoring: {
    enabled: process.env.CLAW_METRICS_ENABLED === 'true',
    debug: process.env.CLAW_METRICS_DEBUG === 'true',
    samplingRate: parseFloat(process.env.CLAW_METRICS_SAMPLING_RATE || '1.0'),
    globalTags: {
      environment: 'production',
      region: process.env.AWS_REGION || 'unknown',
      version: process.env.APP_VERSION || '1.0.0'
    }
  },

  healthCheck: {
    enabled: process.env.CLAW_HEALTH_CHECK_ENABLED === 'true',
    interval: parseInt(process.env.CLAW_HEALTH_CHECK_INTERVAL || '60000'),
    timeout: parseInt(process.env.CLAW_HEALTH_CHECK_TIMEOUT || '5000'),
    failureThreshold: 3
  },

  server: {
    port: parseInt(process.env.PORT || '3000'),
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};
```

### Configuration Validation

```typescript
import { z } from 'zod';

const configSchema = z.object({
  claw: z.object({
    baseUrl: z.string().url(),
    apiKey: z.string().min(20),
    wsUrl: z.string().url().optional(),
    timeout: z.number().min(1000).max(300000),
    maxRetries: z.number().min(0).max(10),
    // ... other fields
  }),
  monitoring: z.object({
    enabled: z.boolean(),
    debug: z.boolean(),
    samplingRate: z.number().min(0).max(1)
  })
});

// Validate configuration on startup
const validatedConfig = configSchema.parse(productionConfig);
```

---

## Deployment Strategies

### 1. Cloudflare Workers (Edge Deployment)

#### Benefits
- Global edge distribution
- Automatic scaling
- No infrastructure management
- Built-in DDoS protection

#### Deployment

```bash
# Install Wrangler CLI
pnpm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy worker
wrangler publish
```

#### Configuration (`wrangler.toml`)

```toml
name = "spreadsheet-moment"
main = "cloudflare/worker.js"
compatibility_date = "2024-01-01"

[env.production]
name = "spreadsheet-moment-production"
vars = { ENVIRONMENT = "production" }

[[env.production.routes]]
pattern = "https://api.example.com/*"
zone_name = "example.com"

[env.production.durable_objects]
bindings = [
  { name = "CLAW_STATE", class_name = "ClawStateDurableObject" }
]
```

#### Environment Secrets

```bash
# Set secrets for production
wrangler secret put CLAW_API_KEY --env production
wrangler secret put CLAW_API_BASE_URL --env production
```

### 2. Docker Containers

#### Benefits
- Consistent environments
- Easy scaling
- Portability
- Resource isolation

#### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build application
RUN pnpm build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "dist/index.js"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - CLAW_API_BASE_URL=${CLAW_API_BASE_URL}
      - CLAW_API_KEY=${CLAW_API_KEY}
      - CLAW_WS_URL=${CLAW_WS_URL}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### Build and Deploy

```bash
# Build image
docker build -t spreadsheet-moment:latest .

# Run container
docker run -d \
  --name spreadsheet-moment \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  spreadsheet-moment:latest

# View logs
docker logs -f spreadsheet-moment

# Stop container
docker stop spreadsheet-moment

# Remove container
docker rm spreadsheet-moment
```

### 3. Kubernetes

#### Benefits
- Auto-scaling
- Self-healing
- Rollout management
- Service discovery

#### Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spreadsheet-moment
  namespace: production
  labels:
    app: spreadsheet-moment
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: spreadsheet-moment
  template:
    metadata:
      labels:
        app: spreadsheet-moment
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: spreadsheet-moment
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: app
        image: registry.example.com/spreadsheet-moment:v1.0.0
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: CLAW_API_BASE_URL
          valueFrom:
            configMapKeyRef:
              name: claw-config
              key: api-base-url
        - name: CLAW_API_KEY
          valueFrom:
            secretKeyRef:
              name: claw-secrets
              key: api-key
        - name: CLAW_WS_URL
          valueFrom:
            configMapKeyRef:
              name: claw-config
              key: ws-url
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
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: spreadsheet-moment
  namespace: production
  labels:
    app: spreadsheet-moment
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  selector:
    app: spreadsheet-moment
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: claw-config
  namespace: production
data:
  api-base-url: "https://api.example.com"
  ws-url: "wss://api.example.com/ws"
---
apiVersion: v1
kind: Secret
metadata:
  name: claw-secrets
  namespace: production
type: Opaque
data:
  api-key: <base64-encoded-api-key>
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spreadsheet-moment
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spreadsheet-moment
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
```

#### Deploy to Kubernetes

```bash
# Apply configuration
kubectl apply -f deployment/production/k8s/

# Check deployment status
kubectl rollout status deployment/spreadsheet-moment -n production

# View logs
kubectl logs -f deployment/spreadsheet-moment -n production

# Scale deployment
kubectl scale deployment spreadsheet-moment --replicas=5 -n production

# Update deployment
kubectl set image deployment/spreadsheet-moment \
  app=registry.example.com/spreadsheet-moment:v1.1.0 \
  -n production
```

---

## Monitoring & Logging

### Metrics Collection

#### Prometheus Endpoint

```typescript
import express from 'express';
import { getMetricsCollector } from '@spreadsheet-moment/agent-core';

const app = express();
const metrics = getMetricsCollector();

// Expose metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    const metricsData = metrics.exportPrometheus();
    res.set('Content-Type', 'text/plain');
    res.send(metricsData);
  } catch (error) {
    res.status(500).send('Failed to collect metrics');
  }
});

app.listen(9090, () => {
  console.log('Metrics endpoint listening on port 9090');
});
```

#### Prometheus Configuration

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'spreadsheet-moment'
    static_configs:
      - targets: ['spreadsheet-moment:9090']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Health Check Endpoint

```typescript
import express from 'express';
import { getHealthChecker, HealthStatus } from '@spreadsheet-moment/agent-core';

const app = express();
const healthChecker = getHealthChecker();

// Liveness probe
app.get('/health', async (req, res) => {
  const health = await healthChecker.checkHealth();

  const statusCode = health.status === HealthStatus.HEALTHY ? 200 :
                    health.status === HealthStatus.DEGRADED ? 200 : 503;

  res.status(statusCode).json({
    status: health.status,
    timestamp: health.timestamp,
    summary: health.summary
  });
});

// Readiness probe
app.get('/ready', async (req, res) => {
  const connectionStatus = client.getConnectionStatus();

  if (connectionStatus.websocket && connectionStatus.healthy) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: 'WebSocket not connected' });
  }
});
```

### Logging

#### Structured Logging

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  }
});

// Usage
logger.info({ requestId: 'req-123' }, 'Processing request');
logger.error({ err: error, requestId: 'req-123' }, 'Request failed');
```

#### Log Aggregation

**ELK Stack (Elasticsearch, Logstash, Kibana):**
```yaml
# Filebeat configuration
filebeat.inputs:
  - type: container
    paths:
      - /var/lib/docker/containers/*/*.log
    processors:
      - add_kubernetes_metadata:
          host: ${NODE_NAME}
          matchers:
            - logs_path:
                logs_path: "/var/lib/docker/containers/"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "spreadsheet-moment-%{+yyyy.MM.dd}"
```

---

## Security Hardening

### HTTPS/TLS

```typescript
import https from 'https';
import fs from 'fs';

const server = https.createServer({
  cert: fs.readFileSync('/path/to/cert.pem'),
  key: fs.readFileSync('/path/to/key.pem'),
  minVersion: 'TLSv1.2',
  ciphers: [
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384'
  ].join(':')
}, app);
```

### Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.example.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);
```

### Input Validation

```typescript
import { z } from 'zod';

const clawCreationSchema = z.object({
  clawId: z.string().min(1).max(100),
  cellId: z.string().regex(/^[A-Z]+[0-9]+$/),
  sheetId: z.string().min(1),
  config: z.object({
    goal: z.string().min(1).max(500),
    context: z.record(z.any())
  })
});

// Validate input
const validated = clawCreationSchema.parse(req.body);
```

---

## Scaling Considerations

### Horizontal Scaling

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spreadsheet-moment-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spreadsheet-moment
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Vertical Scaling

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Caching Strategy

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 320,
  useClones: false
});

// Cache Claw state
async function getCachedClawState(clawId: string): Promise<ClawStateInfo> {
  const cached = cache.get<ClawStateInfo>(clawId);
  if (cached) {
    return cached;
  }

  const state = await client.queryClaw({ clawId });
  cache.set(clawId, state.currentStateInfo);
  return state.currentStateInfo;
}
```

---

## Disaster Recovery

### Backup Strategy

```bash
# Backup database
pg_dump -U user -h localhost database_name > backup.sql

# Backup to S3
aws s3 cp backup.sql s3://backups/spreadsheet-moment/
```

### Rollback Procedure

```bash
# Kubernetes rollback
kubectl rollout undo deployment/spreadsheet-moment -n production

# Docker rollback
docker run -d \
  --name spreadsheet-moment \
  registry.example.com/spreadsheet-moment:v1.0.0
```

### High Availability

```yaml
# Multi-region deployment
apiVersion: v1
kind: Service
metadata:
  name: spreadsheet-moment-global
spec:
  type: LoadBalancer
  selector:
    app: spreadsheet-moment
  ports:
  - port: 80
    targetPort: 3000
```

---

## Maintenance Procedures

### Zero-Downtime Deployment

```bash
# Kubernetes rolling update
kubectl set image deployment/spreadsheet-moment \
  app=registry.example.com/spreadsheet-moment:v1.1.0 \
  -n production

# Monitor rollout
kubectl rollout status deployment/spreadsheet-moment -n production
```

### Database Migrations

```bash
# Run migrations
npm run migrate:up

# Rollback migrations
npm run migrate:down
```

### Configuration Updates

```bash
# Update ConfigMap
kubectl apply -f configmap.yaml

# Restart pods to pick up changes
kubectl rollout restart deployment/spreadsheet-moment -n production
```

---

## Runbook

### Incident Response

#### 1. High Error Rate

**Symptoms:**
- Increased 5xx errors
- Error rate > 5%

**Actions:**
1. Check error logs: `kubectl logs -f deployment/spreadsheet-moment -n production`
2. Check health status: `curl http://app/health`
3. Check Claw API status
4. Scale up if needed: `kubectl scale deployment spreadsheet-moment --replicas=5 -n production`

#### 2. High Memory Usage

**Symptoms:**
- Memory usage > 80%
- OOMKilled pods

**Actions:**
1. Check memory metrics: `kubectl top pods -n production`
2. Restart deployment: `kubectl rollout restart deployment/spreadsheet-moment -n production`
3. Increase memory limits in deployment manifest
4. Investigate memory leak: `kubectl exec -it <pod> -- node --inspect`

#### 3. WebSocket Connection Issues

**Symptoms:**
- Clients unable to connect
- Frequent disconnections

**Actions:**
1. Check WebSocket URL configuration
2. Verify API key authentication
3. Check firewall rules
4. Review load balancer WebSocket support

#### 4. Slow Response Times

**Symptoms:**
- P95 latency > 500ms
- Client timeouts

**Actions:**
1. Check performance metrics
2. Review Claw API response times
3. Check network latency
4. Scale horizontally if needed

### Monitoring Alerts

**Prometheus Alerting Rules:**

```yaml
groups:
  - name: spreadsheet-moment
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      - alert: HighMemoryUsage
        expr: memory_usage_bytes / 1024 / 1024 > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}MB"

      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_ms) > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}ms"

      - alert: WebSocketDisconnected
        expr: websocket_connections_active == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "WebSocket disconnected"
          description: "No active WebSocket connections"
```

### Health Check Commands

```bash
# Check health endpoint
curl http://app/health

# Check metrics endpoint
curl http://app/metrics

# Check ready endpoint
curl http://app/ready

# Check WebSocket connection
wscat -c wss://api.example.com/ws
```

---

**Document Version:** 1.0.0
**Last Updated:** 2026-03-15
**Maintained by:** SpreadsheetMoment Team

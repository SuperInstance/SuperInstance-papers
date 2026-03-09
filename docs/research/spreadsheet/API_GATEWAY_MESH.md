# API Gateway and Service Mesh Architecture for POLLN

**Document Version:** 1.0
**Last Updated:** 2026-03-09
**Author:** Master Planner (glm-5)
**Status:** Research Complete

---

## Executive Summary

This document provides comprehensive architectural guidance for implementing API Gateway and Service Mesh infrastructure for POLLN (PersonalLOG.AI), the first product in the LOG.AI line. The architecture supports living spreadsheet cells with sensation, reasoning, and agency capabilities.

### Key Recommendations

| Component | Primary Choice | Secondary Choice | Rationale |
|-----------|----------------|------------------|-----------|
| **API Gateway** | Kong Gateway | Ambassador Edge Stack | Maximum performance, extensibility, and WebSocket support |
| **Service Mesh** | Linkerd | Istio | Lightweight, minimal latency, Rust-based proxy |
| **GraphQL** | Apollo Federation | GraphQL Tools | Battle-tested, excellent TypeScript support |
| **BFF Pattern** | Node.js BFF Layer | GraphQL BFF | Event-driven, excellent for aggregation |
| **CDN** | CloudFront | Cloudflare | AWS integration, edge optimization |
| **Deployment** | Blue-Green + Canary | Strangler Fig | Zero-downtime migration capability |

---

## Table of Contents

1. [API Gateway Architecture](#1-api-gateway-architecture)
2. [Service Mesh Implementation](#2-service-mesh-implementation)
3. [GraphQL Federation](#3-graphql-federation)
4. [BFF Pattern](#4-bff-backend-for-frontend-pattern)
5. [Resilience Patterns](#5-resilience-patterns)
6. [Performance Optimization](#6-performance-optimization)
7. [Migration Strategy](#7-migration-strategy)
8. [Cost Analysis](#8-cost-analysis)
9. [Architecture Diagrams](#9-architecture-diagrams)
10. [Implementation Timeline](#10-implementation-timeline)

---

## 1. API Gateway Architecture

### 1.1 Gateway Selection

#### Kong Gateway (Primary Recommendation)

**Why Kong for POLLN:**

```
CRITICAL REQUIREMENTS              KONG CAPABILITIES
───────────────────────────────────────────────────────────────────
Real-time cell communication    →  Native WebSocket support
Low latency overhead            →  Sub-millisecond proxy latency
Complex routing logic           →  Lua/Go plugin framework
Rate limiting per user          →  Local and distributed rate limiting
API composition                 →  Request/response transformation
Protocol translation            →  HTTP, HTTPS, WS, gRPC, TCP
```

**Performance Characteristics:**

| Metric | Value | Notes |
|--------|-------|-------|
| Throughput | 10,000+ RPS per instance | Scales horizontally |
| Latency | < 1ms overhead | Minimal added latency |
| Memory | ~100MB base + plugins | Lightweight footprint |
| CPU | Single core per 5K RPS | Efficient resource usage |

**Deployment Architecture:**

```yaml
# Kong Deployment for POLLN
apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-config
data:
  kong.conf: |
    # Worker processes (auto-detects CPU cores)
    nginx_worker_processes auto

    # WebSocket support for real-time cell updates
    proxy_listen=0.0.0.0:8000, 0.0.0.0:8443 ssl
    stream_listen=0.0.0.0:9000, 0.0.0.0:9443 ssl

    # Performance tuning
    nginx_user=kong nobody
    client_body_timeout=60s
    client_header_timeout=60s
    keepalive_timeout=3600s
    upstream_keepalive_timeout=600s
    upstream_keepalive_connections=200

    # Log levels (reduce in production)
    log_level=notice
    proxy_error_log=/dev/stderr notice

    # Database-less mode (Declarative Config)
    database=off
    declarative_config=/kong/declarative/kong.yml
```

**Plugin Configuration for POLLN:**

```yaml
# Essential plugins for living cells
plugins:
  # Rate limiting per workspace/user
  - name: rate-limiting
    config:
      minute: 1000      # 1000 requests per minute per cell
      hour: 10000      # 10K per hour
      policy: redis
      redis_host: redis.production
      redis_port: 6379

  # Request transformation for protocol translation
  - name: request-transformer
    config:
      add:
        headers:
          - X-Cell-ID:$(uri_captures[1])
          - X-Workspace-ID:$(headers.x-workspace-id)

  # CORS for browser-based WebSocket connections
  - name: cors
    config:
      origins:
        - https://*.polln.ai
        - https://polln.ai
      methods:
        - GET
        - POST
        - PUT
        - DELETE
        - OPTIONS
      headers:
        - Accept
        - Authorization
        - Content-Type
        - X-Cell-ID
      exposed_headers:
        - X-Cell-State
        - X-Cell-Reasoning
      max_age: 3600
      credentials: true

  # WebSocket upgrade handling
  - name: websocket
    config:
      timeout: 3600
      keepalive: 60

  # Security headers
  - name: acl
    config:
      deny:
        - blacklisted_ips
      allow:
        - authenticated_users
```

**Declarative Configuration:**

```yaml
_format_version: "3.0"

services:
  # Cell Management API
  - name: cell-service
    url: http://cell-service.production.svc.cluster.local:3000
    routes:
      - name: cell-routes
        paths:
          - /api/v1/cells
        strip_path: false
        methods:
          - GET
          - POST
          - PUT
          - DELETE
        protocols:
          - http
          - https

  # WebSocket endpoint for real-time cell updates
  - name: cell-websocket
    url: http://websocket-service.production.svc.cluster.local:3001
    routes:
      - name: websocket-route
        paths:
          - /ws/cells
        strip_path: false
        protocols:
          - http
          - https
          - websocket

  # Colony orchestration API
  - name: colony-service
    url: http://colony-service.production.svc.cluster.local:3002
    routes:
      - name: colony-routes
        paths:
          - /api/v1/colonies
        strip_path: false

  # Reasoning and decision engine
  - name: reasoning-service
    url: http://reasoning-service.production.svc.cluster.local:3003
    routes:
      - name: reasoning-routes
        paths:
          - /api/v1/reasoning
        strip_path: false

  # Learning and evolution
  - name: learning-service
    url: http://learning-service.production.svc.cluster.local:3004
    routes:
      - name: learning-routes
        paths:
          - /api/v1/learning
        strip_path: false
```

---

#### Ambassador Edge Stack (Alternative)

**When to Choose Ambassador:**

- Pure Kubernetes environment
- Strong GitOps workflow
- Developer experience priority
- Telepresence for local development

**Advantages:**

```yaml
# Ambassador is Kubernetes-native
apiVersion: getambassador.io/v3alpha
kind: Mapping
metadata:
  name: cell-mapping
spec:
  prefix: /api/v1/cells
  service: cell-service.production:3000
  circuit_breakers:
    - max_connections: 100
      max_pending_requests: 50
      max_requests: 100
      max_retries: 3
  load_balancer:
    policy: round_robin
  timeout_ms: 30000
  retry_policy:
    retry_on: 5xx
    num_retries: 3
    per_try_timeout_ms: 10000
```

**Performance Comparison:**

| Metric | Kong | Ambassador |
|--------|------|------------|
| Overhead | < 1ms | < 2ms |
| Max RPS | 10,000+ | 8,000+ |
| Memory | ~100MB | ~150MB |
| Setup Complexity | Medium | Low (K8s CRDs) |

---

#### AWS API Gateway (Cloud-Native Alternative)

**Use Cases:**

- Serverless architecture with Lambda
- AWS-centric deployment
- Rapid prototyping
- Enterprise compliance requirements

**Pricing Model:**

```
API Gateway Pricing (2026)
├─ HTTP APIs (Newer, faster, cheaper)
│  ├─ $1.00 per million requests
│  ├─ Data transfer: $0.09/GB
│  └─ WebSocket: $1.00 per million messages/min
│
└─ REST APIs (More features, slower)
   ├─ $3.50 per million requests
   ├─ Data transfer: $0.09/GB
   └─ Caching: $0.025 per GB-month
```

**Integration Architecture:**

```typescript
// API Gateway → Lambda integration for serverless cells
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const cellId = event.pathParameters?.cellId;
  const workspaceId = event.requestContext.authorizer?.workspaceId;

  // Connect to CellService via VPC Link
  const response = await cellService.processCell({
    cellId,
    workspaceId,
    action: event.httpMethod,
    body: JSON.parse(event.body || '{}'),
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Cell-State': response.state,
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(response),
  };
};
```

---

### 1.2 Request Routing Policies

#### Content-Based Routing

```yaml
# Route requests based on cell type and operation
routes:
  - name: input-cell-route
    paths:
      - /api/v1/cells/input/*
    methods:
      - POST
    plugins:
      - name: request-transformer
    service: input-cell-service

  - name: analysis-cell-route
    paths:
      - /api/v1/cells/analysis/*
    methods:
      - GET
      - POST
    service: analysis-cell-service

  - name: prediction-cell-route
    paths:
      - /api/v1/cells/prediction/*
    methods:
      - POST
    plugins:
      - name: rate-limiting
        config:
          minute: 100  # Stricter limit for expensive predictions
    service: prediction-cell-service
```

#### Header-Based Routing

```yaml
# Route based on client type (web, mobile, CLI)
routes:
  - name: web-client-route
    headers:
      - X-Client-Type: web
    plugins:
      - name: cors
    service: web-bff-service

  - name: mobile-client-route
    headers:
      - X-Client-Type: mobile
    service: mobile-bff-service

  - name: cli-client-route
    headers:
      - X-Client-Type: cli
    service: cli-bff-service
```

#### Version-Based Routing

```yaml
# Support multiple API versions simultaneously
routes:
  - name: api-v1
    paths:
      - /api/v1/(/.*)$
    service: polln-api-v1
    strip_path: false

  - name: api-v2
    paths:
      - /api/v2/(/.*)$
    service: polln-api-v2
    strip_path: false

  - name: api-latest
    paths:
      - /api/latest/(/.*)$
    plugins:
      - name: request-transformer
        config:
          replace:
            uri: /api/v2$1
    service: polln-api-v2
```

---

### 1.3 API Composition

#### Backend Composition Pattern

```typescript
// Gateway-level composition for cell aggregation
import { compose } from '@kong/kong-pdk';

async function composeCellData(ctx) {
  // Parallel composition of multiple services
  const [cellState, cellReasoning, cellPredictions] = await Promise.all([
    fetchFromService('cell-service', `/cells/${ctx.params.id}`),
    fetchFromService('reasoning-service', `/reasoning/${ctx.params.id}`),
    fetchFromService('prediction-service', `/predictions/${ctx.params.id}`),
  ]);

  // Compose response
  return {
    cell: {
      id: ctx.params.id,
      state: cellState,
      reasoning: cellReasoning,
      predictions: cellPredictions,
    },
    meta: {
      composedAt: new Date().toISOString(),
      version: '2.0',
    },
  };
}
```

#### GraphQL Composition Layer

```typescript
// Gateway as GraphQL composition layer
import { ApolloServer, gql } from 'apollo-server-kong';

const typeDefs = gql`
  type Cell {
    id: ID!
    state: CellState
    reasoning: ReasoningTrace
    predictions: [Prediction!]
    sensation: SensationData
  }

  type Query {
    cell(id: ID!): Cell
    cells(workspaceId: ID!): [Cell!]
  }
`;

const resolvers = {
  Query: {
    cell: async (_, { id }, { dataSources }) => {
      const [state, reasoning, predictions] = await Promise.all([
        dataSources.cellAPI.getCellState(id),
        dataSources.reasoningAPI.getReasoning(id),
        dataSources.predictionAPI.getPredictions(id),
      ]);

      return { id, state, reasoning, predictions };
    },
  },
};

// Gateway-hosted GraphQL endpoint
const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: () => ({
    cellAPI: new CellAPI(),
    reasoningAPI: new ReasoningAPI(),
    predictionAPI: new PredictionAPI(),
  }),
});
```

---

### 1.4 Protocol Translation

#### WebSocket to HTTP Bridge

```typescript
// Kong plugin for WebSocket ↔ HTTP translation
const WebSocketHandler = {
  accept: (ws, req) => {
    const cellId = req.params.cellId;

    // Handle incoming WebSocket messages
    ws.on('message', async (message) => {
      const data = JSON.parse(message);

      // Translate to HTTP POST
      const response = await axios.post(
        `http://cell-service.production:3000/cells/${cellId}/sensation`,
        data
      );

      // Send response back over WebSocket
      ws.send(JSON.stringify(response.data));
    });

    // Maintain connection for real-time updates
    const interval = setInterval(async () => {
      const state = await axios.get(
        `http://cell-service.production:3000/cells/${cellId}/state`
      );
      ws.send(JSON.stringify({ type: 'state-update', data: state.data }));
    }, 1000);

    ws.on('close', () => clearInterval(interval));
  },
};
```

#### gRPC to HTTP Translation

```yaml
# Kong gRPC plugin configuration
plugins:
  - name: grpc-gateway
    config:
      proto: /etc/kong/polln.proto
      proto_descriptor: /etc/kong/polln.pb

# polln.proto definition
syntax = "proto3";

package polln;

service CellService {
  rpc GetCell(CellRequest) returns (CellResponse);
  rpc UpdateCell(CellUpdate) returns (CellResponse);
  rpc StreamCellUpdates(CellRequest) returns (stream CellUpdate);
}

message CellRequest {
  string cell_id = 1;
  string workspace_id = 2;
}

message CellResponse {
  string cell_id = 1;
  CellState state = 2;
  int64 timestamp = 3;
}
```

---

### 1.5 Rate Limiting at Edge

#### Multi-Level Rate Limiting

```yaml
# Rate limiting strategy for POLLN
rate_limiting:
  global:
    minute: 100000    # Platform-wide limit
    hour: 1000000

  per_workspace:
    minute: 10000     # Per workspace
    hour: 100000

  per_user:
    minute: 1000      # Per authenticated user
    hour: 10000

  per_cell:
    minute: 500       # Per cell (prevent spam)
    hour: 5000

  expensive_operations:
    prediction:
      minute: 100     # Stricter for expensive operations
      hour: 1000
    evolution:
      minute: 10      # Very strict for evolution
      hour: 100
```

#### Distributed Rate Limiting

```typescript
// Redis-based distributed rate limiting
import Redis from 'ioredis';

const redis = new Redis({
  host: 'redis.production',
  port: 6379,
  maxRetriesPerRequest: 3,
});

async function checkRateLimit(
  identifier: string,
  limit: number,
  window: number
): Promise<boolean> {
  const key = `ratelimit:${identifier}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, window);
  }

  return current <= limit;
}

// Usage in Kong plugin
async function rateLimitPlugin(ctx) {
  const identifier = [
    ctx.headers['x-workspace-id'],
    ctx.headers['x-user-id'],
    ctx.params.cellId,
  ].join(':');

  const allowed = await checkRateLimit(identifier, 1000, 60);

  if (!allowed) {
    return ctx.respondWith({
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': '1000',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 60,
      },
    });
  }
}
```

#### Adaptive Rate Limiting

```typescript
// Adjust limits based on system load
async function adaptiveRateLimit(ctx) {
  const systemLoad = await getSystemLoad();
  const baseLimit = 1000;

  // Reduce limits during high load
  const adaptiveLimit = systemLoad > 0.7
    ? Math.floor(baseLimit * 0.5)  // 50% reduction
    : baseLimit;

  const allowed = await checkRateLimit(
    ctx.headers['x-user-id'],
    adaptiveLimit,
    60
  );

  if (!allowed) {
    return ctx.respondWith({
      status: 429,
      body: JSON.stringify({
        error: 'Rate limit exceeded',
        limit: adaptiveLimit,
        retryAfter: 60,
        loadReduction: true,
      }),
    });
  }
}

async function getSystemLoad(): Promise<number> {
  const metrics = await prometheusService.getMetrics({
    query: 'avg(system_cpu_usage)',
  });
  return metrics[0].value;
}
```

---

## 2. Service Mesh Implementation

### 2.1 Mesh Comparison

#### Linkerd (Primary Recommendation)

**Why Linkerd for POLLN:**

```
CRITICAL REQUIREMENTS              LINKERD CAPABILITIES
───────────────────────────────────────────────────────────────────
Minimal latency overhead        →  Rust-based proxy, < 1ms overhead
Resource efficiency             →  ~10MB per sidecar (vs 100MB+)
Simplicity                      →  Single binary, easy install
Security                        →  Automatic mTLS, zero config
Observability                   →  Golden metrics, automatic
Kubernetes-native               →  No CRD complexity
```

**Performance Comparison:**

| Metric | Linkerd | Istio | Consul |
|--------|---------|-------|--------|
| Proxy Overhead | ~1ms | ~2-5ms | ~2-3ms |
| Memory per Sidecar | ~10MB | ~40-100MB | ~30-50MB |
| CPU per Sidecar | Minimal | Low-Medium | Low |
| Setup Complexity | Simple | Complex | Medium |
| mTLS Setup | Automatic | Manual config | Auto + config |
| Feature Set | Focused | Extensive | Moderate |

**Linkerd Installation:**

```bash
# Install Linkerd for POLLN
linkerd install | kubectl apply -f -

# Install Linkerd Viz for observability
linkerd viz install | kubectl apply -f -

# Verify installation
linkerd check

# Enable automatic injection on namespace
kubectl annotate namespace polln-production \
  linkerd.io/inject=enabled
```

**Service Profile for POLLN:**

```yaml
# Linkerd ServiceProfile for cell service
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: cell-service
  namespace: polln-production
spec:
  routes:
    - name: 'GetCellState'
      condition:
        method: GET
        path: /api/v1/cells/:id
      responseClasses:
        - classification:
            - status: 200
          labels:
            - success
        - classification:
            - status: 404
          labels:
            - not_found
        - classification:
            - status:
                - 500
                - 503
          labels:
            - server_error

    - name: 'UpdateCell'
      condition:
        method: PUT
        path: /api/v1/cells/:id
      responseClasses:
        - classification:
            - status: 200
          labels:
            - success
        - classification:
            - status: 400
          labels:
            - bad_request
        - classification:
            - status:
                - 500
                - 503
          labels:
            - server_error

  retryBudget:
    retryRatio: 0.2
    minRetriesPerSecond: 10
    ttl: 10s
```

**Traffic Splitting for Canary:**

```yaml
# Canary deployment for new cell reasoning engine
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: cell-reasoning-canary
  namespace: polln-production
spec:
  service: cell-reasoning-service
  backends:
    - service: cell-reasoning-v1
      weight: 900  # 90% to old version
    - service: cell-reasoning-v2
      weight: 100  # 10% to new version
```

---

#### Istio (Alternative for Complex Requirements)

**When to Choose Istio:**

- Complex traffic management needs
- Advanced security policies
- Multi-cluster deployments
- Extensive customization requirements

**Istio Installation:**

```bash
# Install Istio with minimal profile
istioctl install --set profile=demo -y

# Enable injection
kubectl label namespace polln-production \
  istio-injection=enabled
```

**VirtualService for POLLN:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: cell-service
  namespace: polln-production
spec:
  hosts:
    - cell-service
  http:
    - match:
        - headers:
            x-cell-type:
              exact: prediction
      route:
        - destination:
            host: cell-prediction-service
          weight: 100
    - route:
        - destination:
            host: cell-service
          weight: 100
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,connect-failure,refused-stream
      timeout: 5s
```

---

#### Consul Connect (Multi-Cloud Option)

**Use Cases:**

- Multi-cloud deployments
- Non-Kubernetes workloads
- Service discovery needs
- Consul ecosystem integration

---

### 2.2 mTLS for Service-to-Service

#### Automatic mTLS with Linkerd

```yaml
# Automatic mTLS configuration
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: cell-service-server
  namespace: polln-production
spec:
  podSelector:
    matchLabels:
      app: cell-service
  port:
    port: 8080
    protocol: HTTP
  proxyProtocol: HTTP/2
---
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: cell-service-authz
  namespace: polln-production
spec:
  server:
    name: cell-service-server
  client:
    unauthenticated: false
    networks:
      - 10.0.0.0/8  # Only cluster traffic
```

**mTLS Certificate Rotation:**

```bash
# Linkerd automatically rotates certificates
# Default: certificates rotate every 24 hours

# Check certificate expiration
linkerd identity check | grep certificate

# Manual rotation (if needed)
linkerd identity reboot --namespace polln-production
```

---

### 2.3 Traffic Management

#### Weighted Routing

```yaml
# Gradual rollout of new cell types
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: analysis-cell-rollout
  namespace: polln-production
spec:
  service: analysis-cell-service
  backends:
    - service: analysis-cell-v1
      weight: 1000  # Start at 100%
    - service: analysis-cell-v2
      weight: 0     # Gradually increase
```

**Progressive Rollout Script:**

```typescript
// Automated progressive rollout
async function progressiveRollout(
  service: string,
  newVersion: string,
  duration: number
) {
  const steps = 10;
  const stepDuration = duration / steps;

  for (let i = 0; i <= steps; i++) {
    const newWeight = i * 10;
    const oldWeight = 100 - newWeight;

    await updateTrafficSplit(service, {
      backends: [
        { service: `${service}-v1`, weight: oldWeight },
        { service: newVersion, weight: newWeight },
      ],
    });

    console.log(`Rollout progress: ${newWeight}% to new version`);

    // Monitor for errors
    const errorRate = await getErrorRate(newVersion);
    if (errorRate > 0.01) {  // 1% error threshold
      console.error('Error rate too high, rolling back');
      await rollbackTrafficSplit(service);
      throw new Error('Rollout failed');
    }

    await sleep(stepDuration * 1000);
  }

  console.log('Rollout complete');
}
```

---

### 2.4 Circuit Breaking

```yaml
# Circuit breaker configuration
apiVersion: config.linkerd.io/v1alpha1
kind: ProxyConfig
metadata:
  name: cell-service-proxy
  namespace: polln-production
spec:
  circuitBreakers:
    - successRate: 0.9     # 90% success rate threshold
      consecutiveErrors: 5
      interval: 30s
      minRequests: 10
```

**Advanced Circuit Breaking:**

```typescript
// Custom circuit breaker implementation
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private openUntil = 0;

  constructor(
    private threshold: number,
    private timeout: number,
    private halfOpenAttempts: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() > this.openUntil) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenAttempts) {
        this.state = 'CLOSED';
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.openUntil = Date.now() + this.timeout;
    }
  }
}

// Usage in service
const circuitBreaker = new CircuitBreaker(5, 60000, 3);

app.get('/api/v1/cells/:id', async (req, res) => {
  try {
    const data = await circuitBreaker.execute(async () => {
      return await cellService.getCell(req.params.id);
    });
    res.json(data);
  } catch (error) {
    if (error.message === 'Circuit breaker is OPEN') {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        retryAfter: Math.ceil((circuitBreaker['openUntil'] - Date.now()) / 1000),
      });
    } else {
      res.status(500).json({ error: 'Service error' });
    }
  }
});
```

---

### 2.5 Retry with Exponential Backoff

```yaml
# Retry configuration in Linkerd
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: cell-service
  namespace: polln-production
spec:
  retryBudget:
    retryRatio: 0.2        # 20% of requests can be retries
    minRetriesPerSecond: 10
    ttl: 10s
```

**Exponential Backoff Implementation:**

```typescript
class RetryPolicy {
  async execute<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 5,
      initialDelay = 100,
      maxDelay = 10000,
      backoffMultiplier = 2,
    } = options;

    let delay = initialDelay;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          throw new Error(
            `Max retry attempts (${maxAttempts}) reached. Last error: ${error.message}`
          );
        }

        console.warn(
          `Attempt ${attempt} failed, retrying in ${delay}ms:`,
          error.message
        );

        await this.sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const retryPolicy = new RetryPolicy();

app.post('/api/v1/cells', async (req, res) => {
  try {
    const result = await retryPolicy.execute(
      async () => {
        return await cellService.createCell(req.body);
      },
      {
        maxAttempts: 3,
        initialDelay: 100,
        maxDelay: 5000,
      }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Jitter for Retry Storm Prevention:**

```typescript
// Add jitter to prevent thundering herd
function calculateDelayWithJitter(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attempt),
    maxDelay
  );

  // Add random jitter (±25%)
  const jitter = exponentialDelay * 0.25;
  const randomJitter = (Math.random() - 0.5) * 2 * jitter;

  return Math.max(0, exponentialDelay + randomJitter);
}

// Usage in retry loop
for (let attempt = 0; attempt < maxAttempts; attempt++) {
  try {
    return await fn();
  } catch (error) {
    const delay = calculateDelayWithJitter(attempt, 100, 5000);
    await sleep(delay);
  }
}
```

---

## 3. GraphQL Federation

### 3.1 Schema Stitching vs Federation

| Aspect | Schema Stitching (Legacy) | Federation (Modern) |
|--------|--------------------------|---------------------|
| Architecture | Monolithic gateway | Distributed subgraphs |
| Ownership | Single team | Domain ownership |
| Scalability | Limited | High |
| Complexity | High setup | Lower with Apollo |
| Performance | Gateway bottleneck | Direct queries |

### 3.2 Federation Gateway

**Apollo Router Configuration:**

```yaml
# supergraph.yaml for POLLN
subgraphs:
  cells:
    routing_url:
      - http://cell-subgraph.production:4000
    schema:
      file: ./schemas/cells.graphql

  reasoning:
    routing_url:
      - http://reasoning-subgraph.production:4001
    schema:
      file: ./schemas/reasoning.graphql

  learning:
    routing_url:
      - http://learning-subgraph.production:4002
    schema:
      file: ./schemas/learning.graphql

  colony:
    routing_url:
      - http://colony-subgraph.production:4003
    schema:
      file: ./schemas/colony.graphql
```

**Subgraph Example:**

```graphql
# cell-subgraph/schemas/cells.graphql
extend type Query {
  cell(id: ID!): Cell
  cells(workspaceId: ID!): [Cell!]!
}

type Cell @key(fields: "id") {
  id: ID!
  state: CellState
  type: CellType
  workspaceId: ID!
  createdAt: DateTime!
  updatedAt: DateTime!

  # Relationships to other subgraphs
  reasoning: Reasoning
  predictions: [Prediction!]!
  sensations: [Sensation!]!
}

enum CellType {
  INPUT
  OUTPUT
  TRANSFORM
  ANALYSIS
  PREDICTION
  DECISION
}

type CellState {
  value: JSON
  timestamp: DateTime!
  version: Int!
}

scalar DateTime
scalar JSON
```

```graphql
# reasoning-subgraph/schemas/reasoning.graphql
extend type Query {
  reasoning(cellId: ID!): Reasoning
}

type Reasoning @key(fields: "cellId") {
  cellId: ID!
  steps: [ReasoningStep!]!
  conclusion: String
  confidence: Float!
  timestamp: DateTime!
}

type ReasoningStep {
  order: Int!
  description: String!
  logic: String!
  result: JSON
}
```

---

### 3.3 Authorization at Edge

**Apollo Router Authorization:**

```typescript
// Apollo Router with Rhai scripting
use std::http;

fn authorize_request(request_context: RequestContext) -> bool {
  // Extract auth header
  let auth_header = match request_context.request.headers.get("authorization") {
    Some(header) => header,
    None => return false,
  };

  // Parse and validate JWT
  let token = auth_header.replace("Bearer ", "");
  let claims = match jwt::decode(&token) {
    Ok(claims) => claims,
    Err(_) => return false,
  };

  // Check workspace access
  let workspace_id = request_context.request.variables["workspaceId"];
  if claims.workspace_id != workspace_id {
    return false;
  }

  // Check rate limits
  let user_id = claims.user_id;
  let requests = redis::incr(format!("rate:{}", user_id));
  if requests > 1000 {
    return false;
  }

  true
}

router::post_operation_authorize("authorize_request");
```

**Field-Level Authorization:**

```typescript
// Subgraph-level field authorization
import { AuthZState } from '@apollo/federation';

export const resolvers = {
  Cell: {
    reasoning: async (
      cell: { id: string; workspaceId: string },
      _args: never,
      { authState }: { authState: AuthZState }
    ) => {
      // Check if user has access to reasoning data
      if (!authState.user.permissions.includes('read:reasoning')) {
        throw new Error('Unauthorized');
      }

      return reasoningService.getByCellId(cell.id);
    },
  },
};
```

---

## 4. BFF (Backend for Frontend) Pattern

### 4.1 BFF Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Web App (React)     Mobile App (iOS/Android)    CLI Tool       │
│       │                    │                     │               │
│       ▼                    ▼                     ▼               │
└───────────────┬──────────────────┬───────────────────────┘
                │                  │
                ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Kong)                         │
├─────────────────────────────────────────────────────────────────┤
│  /web/*    →  Web BFF        /mobile/*  →  Mobile BFF          │
│  /cli/*    →  CLI BFF        /graphql   →  GraphQL Gateway     │
└─────────────────────────────────────────────────────────────────┘
                │                  │
                ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MICROSERVICES LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Cell Service    Reasoning Service    Learning Service          │
│  Colony Service    Prediction Service    Evolution Service      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Web BFF

```typescript
// Web BFF for browser clients
import express from 'express';
import fetch from 'node-fetch';

const app = express();

app.get('/web/api/v1/workspaces/:workspaceId', async (req, res) => {
  const { workspaceId } = req.params;

  try {
    // Aggregation of multiple services
    const [
      workspace,
      cells,
      colonies,
      stats,
    ] = await Promise.all([
      fetchFromService('workspace', `/workspaces/${workspaceId}`),
      fetchFromService('cell', `/cells?workspaceId=${workspaceId}`),
      fetchFromService('colony', `/colonies?workspaceId=${workspaceId}`),
      fetchFromService('analytics', `/stats?workspaceId=${workspaceId}`),
    ]);

    // Web-specific response format
    res.json({
      workspace: {
        ...workspace,
        cells: cells.map(normalizeCellForWeb),
        colonies: colonies.map(normalizeColonyForWeb),
      },
      stats: aggregateStatsForWeb(stats),
      _meta: {
        platform: 'web',
        version: '2.0.0',
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load workspace',
      message: error.message,
    });
  }
});

// Optimized for web (smaller payloads, browser-friendly formats)
function normalizeCellForWeb(cell: any) {
  return {
    id: cell.id,
    name: cell.name,
    type: cell.type,
    state: {
      value: cell.state.value,
      timestamp: cell.state.timestamp,
    },
    // Omit heavy reasoning trace for list view
    _compact: true,
  };
}
```

### 4.3 Mobile BFF

```typescript
// Mobile BFF for iOS/Android apps
app.get('/mobile/api/v1/workspaces/:workspaceId', async (req, res) => {
  const { workspaceId } = req.params;
  const platform = req.headers['x-platform'];  // 'ios' or 'android'

  try {
    // Mobile-specific optimizations
    const [
      workspace,
      cells,
    ] = await Promise.all([
      fetchFromService('workspace', `/workspaces/${workspaceId}`),
      fetchFromService('cell', `/cells?workspaceId=${workspaceId}&limit=50`),
    ]);

    // Mobile-specific response format (even smaller payload)
    res.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        cells: cells.map(cell => ({
          id: cell.id,
          n: cell.name,        // Shortened keys
          t: cell.type,        // Reduced payload size
          v: cell.state.value,
        })),
      },
      _meta: {
        platform,
        version: '2.0.0',
        offline: req.headers['x-offline-mode'] === 'true',
      },
    });
  } catch (error) {
    res.status(500).json({
      e: 'LOAD_ERROR',        // Error codes for mobile
      m: error.message,
    });
  }
});
```

### 4.4 Aggregation Services

```typescript
// Generic aggregation helper
class ServiceAggregator {
  async aggregate<T>(
    services: Array<{
      name: string;
      path: string;
      timeout?: number;
    }>,
    context: Record<string, any>
  ): Promise<Record<string, T>> {
    const results = await Promise.allSettled(
      services.map(async ({ name, path, timeout = 5000 }) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(
            `http://${name}-service.production:3000${path}`,
            {
              signal: controller.signal,
              headers: {
                'X-Request-ID': context.requestId,
                'X-User-ID': context.userId,
              },
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          return { name, data: await response.json() };
        } catch (error) {
          clearTimeout(timeoutId);
          return { name, error };
        }
      })
    );

    // Aggregate results, handling failures gracefully
    return results.reduce((acc, result, index) => {
      const serviceName = services[index].name;

      if (result.status === 'fulfilled') {
        acc[serviceName] = result.value.data;
      } else {
        acc[serviceName] = null;
      }

      return acc;
    }, {} as Record<string, T>);
  }
}

// Usage in BFF
const aggregator = new ServiceAggregator();

app.get('/web/api/v1/dashboard', async (req, res) => {
  const data = await aggregator.aggregate([
    { name: 'workspace', path: `/workspaces/${req.params.id}` },
    { name: 'cell', path: '/cells/summary' },
    { name: 'colony', path: '/colonies/active' },
    { name: 'analytics', path: '/stats/overview' },
  ], {
    requestId: req.id,
    userId: req.user.id,
  });

  res.json(data);
});
```

---

## 5. Resilience Patterns

### 5.1 Bulkhead Pattern

```typescript
// Bulkhead pattern for resource isolation
class Bulkhead {
  private semaphore: Semaphore;
  private queue: Queue<any>;

  constructor(
    private name: string,
    private maxConcurrent: number,
    private maxQueueSize: number
  ) {
    this.semaphore = new Semaphore(maxConcurrent);
    this.queue = new Queue(maxQueueSize);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Acquire semaphore or queue the request
    const acquired = await this.semaphore.acquire();

    if (!acquired) {
      // Try to queue the request
      const queued = await this.queue.enqueue(fn);

      if (!queued) {
        throw new Error(`Bulkhead '${this.name}' is at capacity`);
      }

      // Wait in queue
      return await this.queue.waitForNext();
    }

    try {
      // Execute with semaphore held
      return await fn();
    } finally {
      // Release semaphore
      this.semaphore.release();
    }
  }
}

// Usage
const cellServiceBulkhead = new Bulkhead('cell-service', 100, 50);
const reasoningServiceBulkhead = new Bulkhead('reasoning-service', 50, 25);

app.get('/api/v1/cells/:id', async (req, res) => {
  try {
    const cell = await cellServiceBulkhead.execute(() =>
      cellService.getCell(req.params.id)
    );
    res.json(cell);
  } catch (error) {
    if (error.message.includes('at capacity')) {
      res.status(503).json({
        error: 'Service at capacity',
        retryAfter: 30,
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});
```

### 5.2 Retry Patterns

```typescript
// Retry strategies
enum RetryStrategy {
  FIXED_DELAY = 'fixed',
  LINEAR_BACKOFF = 'linear',
  EXPONENTIAL_BACKOFF = 'exponential',
}

class RetryPolicy {
  constructor(
    private strategy: RetryStrategy,
    private maxAttempts: number,
    private initialDelay: number,
    private maxDelay: number
  ) {}

  getDelay(attempt: number): number {
    switch (this.strategy) {
      case RetryStrategy.FIXED_DELAY:
        return this.initialDelay;

      case RetryStrategy.LINEAR_BACKOFF:
        return Math.min(
          this.initialDelay * attempt,
          this.maxDelay
        );

      case RetryStrategy.EXPONENTIAL_BACKOFF:
        return Math.min(
          this.initialDelay * Math.pow(2, attempt),
          this.maxDelay
        );

      default:
        return this.initialDelay;
    }
  }
}

// Usage with different strategies
const fixedRetry = new RetryPolicy(RetryStrategy.FIXED_DELAY, 3, 100, 100);
const exponentialRetry = new RetryPolicy(
  RetryStrategy.EXPONENTIAL_BACKOFF,
  5,
  100,
  10000
);
```

### 5.3 Timeout Strategies

```typescript
// Hierarchical timeout configuration
const timeoutConfig = {
  // Global timeout
  global: 30000,  // 30 seconds

  // Service-level timeouts
  services: {
    'cell-service': 5000,
    'reasoning-service': 15000,  // Longer for complex reasoning
    'learning-service': 10000,
    'colony-service': 8000,
  },

  // Operation-level timeouts
  operations: {
    'cell.predict': 10000,
    'cell.evolve': 20000,  // Evolution is expensive
    'colony.coordinate': 15000,
  },
};

async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fn();
  } finally {
    clearTimeout(timeoutId);
  }
}

// Usage
app.post('/api/v1/cells/:id/predict', async (req, res) => {
  const timeout = timeoutConfig.operations['cell.predict'];

  try {
    const result = await executeWithTimeout(
      () => cellService.predict(req.params.id, req.body),
      timeout
    );
    res.json(result);
  } catch (error) {
    if (error.name === 'AbortError') {
      res.status(408).json({
        error: 'Request timeout',
        timeout,
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});
```

### 5.4 Fallback Mechanisms

```typescript
// Fallback strategy pattern
class FallbackStrategy {
  constructor(
    private primary: () => Promise<any>,
    private fallbacks: Array<{
      condition: (error: Error) => boolean;
      handler: () => Promise<any>;
    }>,
    private defaultFallback: () => any
  ) {}

  async execute(): Promise<any> {
    try {
      return await this.primary();
    } catch (error) {
      // Find matching fallback
      for (const { condition, handler } of this.fallbacks) {
        if (condition(error)) {
          return await handler();
        }
      }

      // Use default fallback
      return this.defaultFallback();
    }
  }
}

// Usage
const cellQueryStrategy = new FallbackStrategy(
  // Primary: Fresh data from service
  async () => {
    return await cellService.getCell(cellId);
  },
  // Fallbacks
  [
    {
      // Service unavailable: try cache
      condition: (error) => error.message.includes('ECONNREFUSED'),
      handler: async () => {
        return await cacheService.get(`cell:${cellId}`);
      },
    },
    {
      // Timeout: return stale data
      condition: (error) => error.name === 'AbortError',
      handler: async () => {
        const stale = await cacheService.get(`cell:${cellId}:stale`);
        return {
          ...stale,
          _stale: true,
          _warning: 'Showing stale data due to timeout',
        };
      },
    },
  ],
  // Default: return error response
  () => ({
    error: 'Service unavailable',
    retryable: true,
  })
);
```

---

## 6. Performance Optimization

### 6.1 CDN Integration

**CloudFront Distribution for POLLN:**

```yaml
# CloudFront distribution configuration
DistributionConfig:
  Comment: POLLN API Distribution
  Enabled: true
  Origins:
    # API Gateway origin
    - Id: api-gateway-origin
      DomainName: api-gateway.polln.ai
      CustomOriginConfig:
        HTTPPort: 80
        HTTPSPort: 443
        OriginProtocolPolicy: https-only
      OriginShield:
        Enabled: true

    # S3 origin for static assets
    - Id: s3-origin
      DomainName: polln-static.s3.amazonaws.com
      S3OriginConfig:
        OriginAccessIdentity: origin-access-identity/cloudfront/XXXX

  DefaultCacheBehavior:
    TargetOriginId: api-gateway-origin
    ViewerProtocolPolicy: redirect-to-https
    AllowedMethods:
      - GET
      - HEAD
      - OPTIONS
    CachedMethods:
      - GET
      - HEAD
    Compress: true
    MinTTL: 0
    MaxTTL: 31536000  # 1 year
    DefaultTTL: 86400  # 1 day
    ForwardedValues:
      QueryString: true
      Cookies:
        Forward: whitelist
        WhitelistedNames:
          - session_id
          - workspace_id

  CacheBehaviors:
    # API responses
    - PathPattern: /api/v1/*
      TargetOriginId: api-gateway-origin
      ViewerProtocolPolicy: redirect-to-https
      MinTTL: 0
      MaxTTL: 3600  # 1 hour for API data
      DefaultTTL: 300  # 5 minutes
      AllowedMethods:
        - GET
        - HEAD
      CachedMethods:
        - GET
        - HEAD
      Compress: true

    # Static assets
    - PathPattern: /static/*
      TargetOriginId: s3-origin
      ViewerProtocolPolicy: redirect-to-https
      MinTTL: 86400  # 1 day
      MaxTTL: 31536000  # 1 year
      DefaultTTL: 604800  # 1 week
      Compress: true
```

### 6.2 Edge Computing

**Lambda@Edge for Custom Logic:**

```javascript
// Lambda@Edge for origin request
export const handler = async (event) => {
  const request = event.Records[0].cf.request;

  // Rewrite WebSocket upgrade requests
  if (request.headers['upgrade']?.[0]?.value === 'websocket') {
    request.origin = {
      custom: {
        domainName: 'websocket-gateway.polln.ai',
        port: 443,
        protocol: 'https',
        path: '',
        sslProtocols: ['TLSv1.2'],
      },
    };
  }

  // Add geolocation headers
  const country = event.Records[0].cf.config?.country;
  if (country) {
    request.headers['x-edge-country'] = [{ value: country }];
  }

  return request;
};

// Lambda@Edge for origin response
export const responseHandler = async (event) => {
  const response = event.Records[0].cf.response;

  // Add security headers
  response.headers['strict-transport-security'] = [
    { value: 'max-age=31536000; includeSubDomains' }
  ];

  response.headers['x-content-type-options'] = [
    { value: 'nosniff' }
  ];

  response.headers['x-frame-options'] = [
    { value: 'DENY' }
  ];

  // Add CORS headers for API responses
  if (response.headers['content-type']?.[0]?.value.includes('application/json')) {
    response.headers['access-control-allow-origin'] = [
      { value: 'https://polln.ai' }
    ];
  }

  return response;
};
```

### 6.3 Response Caching

```typescript
// Intelligent caching strategy
class CacheStrategy {
  private cache: Cache;

  constructor() {
    this.cache = new Cache({
      ttl: 300,  // 5 minutes default
      maxEntries: 10000,
    });
  }

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      staleWhileRevalidate?: boolean;
      tags?: string[];
    } = {}
  ): Promise<T> {
    const { ttl = 300, staleWhileRevalidate = true, tags = [] } = options;

    // Try cache first
    const cached = await this.cache.get<T>(key);
    if (cached && !cached.isStale()) {
      return cached.value;
    }

    // Stale while revalidate
    if (cached && staleWhileRevalidate) {
      // Return stale data, fetch fresh in background
      fetcher().then(fresh => {
        this.cache.set(key, fresh, { ttl, tags });
      });

      return cached.value;
    }

    // Cache miss or stale, fetch fresh
    const fresh = await fetcher();
    await this.cache.set(key, fresh, { ttl, tags });

    return fresh;
  }

  async invalidate(tags: string[]): Promise<void> {
    await this.cache.invalidateByTags(tags);
  }
}

// Usage with different TTLs
const cache = new CacheStrategy();

app.get('/api/v1/cells/:id', async (req, res) => {
  const cell = await cache.get(
    `cell:${req.params.id}`,
    () => cellService.getCell(req.params.id),
    {
      ttl: 60,  // 1 minute for cell data
      tags: [`cell:${req.params.id}`, 'cells'],
    }
  );

  res.json(cell);
});

// Invalidate cache on updates
app.put('/api/v1/cells/:id', async (req, res) => {
  const updated = await cellService.updateCell(req.params.id, req.body);

  // Invalidate related caches
  await cache.invalidate([`cell:${req.params.id}`, 'cells']);

  res.json(updated);
});
```

### 6.4 Compression

```typescript
// Response compression middleware
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Only compress compressible content types
    const type = res.getHeader('Content-Type') as string;
    return compressible(type);
  },
  threshold: 1024,  // Only compress responses > 1KB
  level: 6,  // Compression level (1-9)
  chunkSize: 16 * 1024,  // 16KB chunks
}));

// Brotli compression for better ratios
import brotli from 'express-static-gzip';

app.use('/static', brotli('dist/static', {
  enableBrotli: true,
  orderPreference: ['br', 'gz'],
  serveStatic: {
    maxAge: '1y',
    immutable: true,
  },
}));
```

---

## 7. Migration Strategy

### 7.1 Strangler Fig Pattern

```
PHASE 1: MONOLITH IDENTIFICATION
┌─────────────────────────────────────────────────────────────┐
│                    LEGACY MONOLITH                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │  Cells  │  │Reasoning│  │Learning │  │ Colony  │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼

PHASE 2: GATEWAY PLACEMENT
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Routes: /api/v1/* → Legacy                          │  │
│  │          /api/v2/cells/* → New Cell Service          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           │                           │
           ▼                           ▼
┌──────────────────┐      ┌──────────────────────┐
│   LEGACY         │      │  NEW CELL SERVICE    │
│   MONOLITH       │      │  (microservice)      │
└──────────────────┘      └──────────────────────┘

PHASE 3: GRADUAL EXTRACTION
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Routes: /api/v1/* → Legacy (deprecated)            │  │
│  │          /api/v2/cells/* → Cell Service             │  │
│  │          /api/v2/reasoning/* → Reasoning Service    │  │
│  │          /api/v2/learning/* → Learning Service      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
     │            │              │              │
     ▼            ▼              ▼              ▼
 ┌───────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐
 │Cell SV│  │Reasoning │  │ Learning  │  │   Legacy  │
 │       │  │   SV     │  │   SV      │  │ Colony    │
 └───────┘  └──────────┘  └───────────┘  └───────────┘

PHASE 4: FULL MIGRATION
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Routes: /api/v2/* → All microservices              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
 ┌───────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐
 │Cell SV│  │Reasoning │  │ Learning  │  │  Colony   │
 │       │  │   SV     │  │   SV      │  │    SV     │
 └───────┘  └──────────┘  └───────────┘  └───────────┘

LEGACY RETIRED ✓
```

### 7.2 Blue-Green Deployment

```bash
# Blue-Green deployment script for POLLN
#!/bin/bash

set -e

BLUE="polln-blue"
GREEN="polln-green"
PRODUCTION="polln-production"  # Points to blue or green

# Determine which environment is currently production
CURRENT=$(kubectl get svc polln-production -o jsonpath='{.spec.selector.version}')

if [ "$CURRENT" = "blue" ]; then
  TARGET="green"
else
  TARGET="blue"
fi

echo "Deploying to $TARGET environment..."

# Deploy to target environment
kubectl apply -f k8s/$TARGET/deployment.yaml

# Wait for rollout to complete
kubectl rollout status deployment/polln-$TARGET -n production

# Health check
echo "Performing health check..."
ATTEMPTS=0
MAX_ATTEMPTS=30

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  HEALTHY=$(kubectl get pods -n production -l version=$TARGET -o json | \
    jq '.items[].status.conditions[] | select(.type=="Ready") | .status' | \
    grep -c true || echo 0)

  if [ "$HEALTHY" -eq 3 ]; then
    echo "Health check passed!"
    break
  fi

  ATTEMPTS=$((ATTEMPTS + 1))
  echo "Waiting for pods to be ready... ($ATTEMPTS/$MAX_ATTEMPTS)"
  sleep 10
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
  echo "Health check failed! Aborting switch."
  exit 1
fi

# Switch traffic to target
echo "Switching traffic to $TARGET..."
kubectl patch svc polln-production -n production -p '{"spec":{"selector":{"version":"'"$TARGET"'"}}}'

echo "Deployment complete! Traffic now routed to $TARGET"
echo "To rollback: kubectl patch svc polln-production -n production -p '{\"spec\":{\"selector\":{\"version\":\"'"$CURRENT"\"}}}'"
```

### 7.3 Canary Releases

```yaml
# Progressive canary deployment
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: cell-service
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cell-service
  service:
    port: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
      - name: cell-prediction-accuracy
        templateRef:
          name: cell-accuracy
          namespace: polln
        thresholdRange:
          min: 0.95
        interval: 5m
  webhooks:
    - name: load-test
      url: http://flagger-loadtester/
      timeout: 5s
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://cell-service-canary:8080/api/v1/cells"
```

### 7.4 Feature Flags

```typescript
// Feature flag system for gradual rollout
import * as Flagsmith from 'flagsmith-nodejs';

const flagsmith = new Flagsmith({
  environmentKey: process.env.FLAGSMITH_KEY,
});

interface FeatureFlags {
  new_reasoning_engine: boolean;
  advanced_cell_types: boolean;
  colony_optimization: boolean;
  ml_predictions: boolean;
}

async function getFlags(userId: string): Promise<FeatureFlags> {
  const flags = await flagsmith.getIdentityFlags(userId);

  return {
    new_reasoning_engine: flags.isFeatureEnabled('new_reasoning_engine'),
    advanced_cell_types: flags.isFeatureEnabled('advanced_cell_types'),
    colony_optimization: flags.isFeatureEnabled('colony_optimization'),
    ml_predictions: flags.isFeatureEnabled('ml_predictions'),
  };
}

// Usage in service
app.get('/api/v1/cells/:id/reasoning', async (req, res) => {
  const flags = await getFlags(req.user.id);

  if (flags.new_reasoning_engine) {
    // Use new reasoning engine
    const result = await reasoningService.v2.reason(req.params.id);
    res.json({ ...result, engine: 'v2' });
  } else {
    // Use legacy reasoning
    const result = await reasoningService.v1.reason(req.params.id);
    res.json({ ...result, engine: 'v1' });
  }
});

// Gradual rollout configuration
// In Flagsmith dashboard:
// - new_reasoning_engine: 10% of users
// - advanced_cell_types: 5% of users (beta)
// - colony_optimization: 100% (fully rolled out)
// - ml_predictions: 0% (development only)
```

---

## 8. Cost Analysis

### 8.1 Managed Services vs Self-Hosted

#### Cost Comparison Table (Monthly, 1M requests/day)

| Component | Managed (AWS) | Self-Hosted (EKS) | Break-even |
|-----------|---------------|-------------------|------------|
| **API Gateway** | $90/month | $0 (included in cluster) | - |
| **ALB** | $20 + $0.008/GB | $0 (included in cluster) | - |
| **ECS/EKS** | $70/month | $73/month (2 nodes) | ~1M req/day |
| **Service Mesh** | $0 (App Mesh) | $0 (Linkerd) | - |
| **Redis** | $38/month (ElastiCache) | $0 (self-hosted) | ~10K ops/sec |
| **Total** | **$218/month** | **$73/month** | **100K req/day** |

#### Detailed Cost Breakdown

**AWS API Gateway:**
```
Requests: 30M/month × $3.50/M = $105/month
Data transfer: 1TB × $0.09/GB = $90/month
Caching: 100GB × $0.025/GB-month = $2.50/month
Total: ~$200/month
```

**Self-Hosted Kong:**
```
Compute: 2 nodes × $36/month = $72/month
Load balancer: $20/month
Total: ~$92/month
Savings: ~$108/month at 1M req/day
```

**Break-even Analysis:**
```
Let x = requests per day
AWS cost = $200 + (x × 30 days × $3.50/1M)
Self-hosted cost = $92

Break-even: x = 31,428 requests/day (~1M requests/month)

Above 31K req/day: Self-hosted wins
Below 31K req/day: Managed may be better (consider ops overhead)
```

### 8.2 Egress Costs

```
Egress Cost Breakdown (per TB):
├─ AWS Standard: $0.09/GB = $90/TB
├─ CloudFlare: $0.005/GB (paid) = $5/TB
└─ CloudFront: $0.085/GB = $85/TB

Optimization Strategies:
1. Use CloudFront for CDN (free ingress)
2. Compress responses (gzip/brotli)
3. Cache at edge (reduce origin hits)
4. Use S3 Transfer Acceleration for large files
5. Multi-region for global distribution
```

### 8.3 Request Pricing Models

```
API Gateway Pricing Models (2026):

1. AWS API Gateway:
   - HTTP APIs: $1.00 per million
   - REST APIs: $3.50 per million
   - WebSocket: $1.00 per million + $0.25/WS connection/hour

2. Kong (Self-Hosted):
   - Software: Free (Open Source) or $3,000/year (Enterprise)
   - Compute: Dependent on infrastructure

3. Google Cloud Apigee:
   - Pay-as-you-go: $1.75 per million
   - Package: Starts at $450/month (includes 10M requests)

4. Azure API Management:
   - Consumption: $1.68 per million
   - Standard: $150/month (includes 15M requests)

Recommendation for POLLN:
- Development: HTTP APIs ($1.00/M)
- Production: Self-hosted Kong (scale to 10M+ req/day)
- Migration: Hybrid (HTTP APIs → Kong)
```

### 8.4 Total Cost of Ownership (TCO)

```
3-Year TCO Comparison (assuming 10M req/day growth):

Year 1:
  Managed: $2,400 + $1,080 (egress) = $3,480
  Self-hosted: $1,104 + $2,160 (engineer time) = $3,264

Year 2:
  Managed: $2,400 + $1,080 = $3,480
  Self-hosted: $1,104 + $1,440 (less ops time) = $2,544

Year 3:
  Managed: $2,400 + $1,080 = $3,480
  Self-hosted: $1,104 + $720 (mature system) = $1,824

3-Year Total:
  Managed: $10,440
  Self-hosted: $7,632
  Savings: $2,808 (27% savings)

Key Insight: Self-hosted pays off after Year 2
```

---

## 9. Architecture Diagrams

### 9.1 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Web Browser │  │  Mobile App  │  │   CLI Tool   │                  │
│  │   (React)    │  │  (iOS/Andr.) │  │   (Node.js)  │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
└─────────┼────────────────┼────────────────┼─────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CDN LAYER (CloudFront)                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Cache: Static assets, API responses (TTL: 5min)                        │
│  Edge: Lambda@Edge for auth, routing                                   │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER (Kong)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Web BFF    │  │ Mobile BFF   │  │   CLI BFF    │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                 │                            │
│  ┌──────┴─────────────────┴─────────────────┴──────┐                    │
│  │         GraphQL Gateway (Apollo Router)         │                    │
│  └────────────────────────────┬───────────────────┘                    │
│                               │                                         │
│  Plugins: Rate limit, CORS, Auth, Transform, Cache                      │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SERVICE MESH (Linkerd)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  mTLS, Observability, Circuit Breaking, Traffic Splitting              │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      MICROSERVICES LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │Cell Service  │  │Reasoning SV  │  │Learning SV   │                  │
│  │ (LogCell)    │  │  (DeepSeek)  │  │ (Evolution)  │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │Colony SV     │  │Prediction SV │  │Sensation SV  │                  │
│  │ (Coordination)│  │  (ML Model)  │  │  (Monitoring)│                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ PostgreSQL   │  │    Redis     │  │ S3 / EFS     │                  │
│  │  (Cells)     │  │   (Cache)    │  │ (Storage)    │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐                                     │
│  │Prometheus    │  │  Grafana     │                                     │
│  │ (Metrics)    │  │ (Dashboards) │                                     │
│  └──────────────┘  └──────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Request Flow Diagram

```
Request Flow: Cell State Query

1. Client → CloudFront (Edge)
   GET /api/v1/cells/abc123
   Headers: { Authorization: Bearer <token>, X-Client-Type: web }

2. CloudFront → Lambda@Edge
   - Validate JWT
   - Extract user context
   - Add headers: X-User-ID, X-Workspace-ID
   - Check cache: MISS (proceed to origin)

3. Lambda@Edge → Kong Gateway
   Route: /api/v1/cells/* → Cell Service
   Plugins executed:
   - Rate limiting: Check Redis for user quota
   - Authentication: Validate token signature
   - Request transformer: Add tracing headers

4. Kong → Web BFF
   - Aggregation: Fetch cell + reasoning + predictions
   - Optimization: Parallel requests, timeout handling

5. BFF → Linkerd Mesh
   - mTLS: Encrypt service-to-service traffic
   - Observability: Add tracing span
   - Circuit breaking: Check service health

6. Linkerd → Cell Service
   - Business logic: Retrieve cell state
   - Database: Query PostgreSQL
   - Response: Cell data + metadata

7. Cell Service → BFF (aggregation)
   - Collect responses from all services
   - Format for web client
   - Add web-specific metadata

8. BFF → Kong → CloudFront → Client
   Response: {
     cell: { ... },
     reasoning: { ... },
     predictions: { ... },
     _meta: { timestamp, version, platform: 'web' }
   }

9. CloudFront Cache
   - Store response for 5 minutes
   - Next request: HIT (served from edge)
```

---

## 10. Implementation Timeline

### Phase 1: Foundation (Weeks 1-4)

**Week 1: Setup and Planning**
- [ ] Create EKS cluster (production environment)
- [ ] Setup CI/CD pipeline (GitHub Actions)
- [ ] Configure monitoring (Prometheus, Grafana)
- [ ] Setup logging (ELK stack)
- [ ] Create service mesh implementation plan

**Week 2: API Gateway Installation**
- [ ] Install Kong Gateway (Helm chart)
- [ ] Configure declarative config
- [ ] Setup rate limiting (Redis backend)
- [ ] Configure SSL/TLS certificates
- [ ] Test routing and plugins

**Week 3: Service Mesh Deployment**
- [ ] Install Linkerd (control plane)
- [ ] Enable automatic injection
- [ ] Configure mTLS policies
- [ ] Setup traffic splitting
- [ ] Deploy demo services

**Week 4: BFF Layer**
- [ ] Create Web BFF service
- [ ] Create Mobile BFF service
- [ ] Implement aggregation helpers
- [ ] Configure Kong routes
- [ ] Load testing (1K RPS target)

### Phase 2: Migration (Weeks 5-8)

**Week 5: Extract Cell Service**
- [ ] Create cell-service microservice
- [ ] Deploy to production (blue-green)
- [ ] Configure service mesh
- [ ] Migrate 25% of traffic
- [ ] Monitor metrics and errors

**Week 6: Extract Reasoning Service**
- [ ] Create reasoning-service microservice
- [ ] Deploy to production
- [ ] Configure mTLS with cell-service
- [ ] Migrate 50% of traffic
- [ ] Performance testing

**Week 7: Extract Learning Service**
- [ ] Create learning-service microservice
- [ ] Deploy to production
- [ ] Configure circuit breaking
- [ ] Migrate 75% of traffic
- [ ] Load testing (5K RPS target)

**Week 8: Extract Colony Service**
- [ ] Create colony-service microservice
- [ ] Deploy to production
- [ ] Configure all service-to-service mTLS
- [ ] Migrate 100% of traffic
- [ ] Retire legacy monolith

### Phase 3: Optimization (Weeks 9-12)

**Week 9: Caching Strategy**
- [ ] Implement Redis caching layer
- [ ] Configure Kong caching
- [ ] Setup CloudFront distribution
- [ ] Implement stale-while-revalidate
- [ ] Cache invalidation logic

**Week 10: Performance Tuning**
- [ ] Optimize database queries
- [ ] Implement connection pooling
- [ ] Configure keep-alive settings
- [ ] Enable HTTP/2
- [ ] Response compression (brotli)

**Week 11: Resilience**
- [ ] Implement circuit breakers
- [ ] Configure retry policies
- [ ] Setup fallback mechanisms
- [ ] Chaos engineering tests
- [ ] Disaster recovery drills

**Week 12: Monitoring and Alerting**
- [ ] Setup Grafana dashboards
- [ ] Configure Prometheus alerts
- [ ] Implement distributed tracing
- [ ] Log aggregation
- [ ] Performance baselines

### Phase 4: Advanced Features (Weeks 13-16)

**Week 13: GraphQL Federation**
- [ ] Design subgraph schemas
- [ ] Implement Apollo Router
- [ ] Deploy subgraph services
- [ ] Field-level authorization
- [ ] Performance testing

**Week 14: Feature Flags**
- [ ] Install feature flag system
- [ ] Configure flags for new features
- [ ] Implement gradual rollouts
- [ ] A/B testing framework
- [ ] Analytics integration

**Week 15: Edge Computing**
- [ ] Implement Lambda@Edge functions
- [ ] Configure CloudFront behaviors
- [ ] Edge authentication
- [ ] Edge caching strategies
- [ ] Performance testing

**Week 16: Hardening**
- [ ] Security audit
- [ ] Penetration testing
- [ ] Rate limiting stress test
- [ ] DDoS protection
- [ ] Compliance review

### Phase 5: Production Readiness (Weeks 17-20)

**Week 17: Load Testing**
- [ ] Baseline: 10K RPS sustained
- [ ] Peak: 50K RPS burst
- [ ] WebSocket: 10K concurrent connections
- [ ] Database stress test
- [ ] Cache hit ratio optimization

**Week 18: Disaster Recovery**
- [ ] Backup procedures
- [ ] Restore procedures
- [ ] Failover testing
- [ ] Multi-region setup
- [ ] Runbook documentation

**Week 19: Documentation**
- [ ] API documentation (OpenAPI)
- [ ] Architecture diagrams
- [ ] Runbook procedures
- [ ] Onboarding guides
- [ ] Troubleshooting guides

**Week 20: Launch Preparation**
- [ ] Final security review
- [ ] Performance validation
- [ ] Stakeholder sign-off
- [ ] Launch checklist
- [ ] Go-live preparation

### Milestones and Checkpoints

| Milestone | Date | Criteria | Success Metrics |
|-----------|------|----------|-----------------|
| **M1: Gateway Live** | Week 2 | Kong routing traffic | 100% routing success |
| **M2: Mesh Enabled** | Week 4 | Linkerd mTLS active | 100% encrypted traffic |
| **M3: First Service** | Week 5 | Cell service deployed | < 100ms latency |
| **M4: Half Migrated** | Week 7 | 50% traffic migrated | < 1% error rate |
| **M5: Full Migration** | Week 8 | 100% traffic migrated | Zero downtime |
| **M6: Performance** | Week 10 | 10K RPS sustained | < 200ms p95 latency |
| **M7: Caching** | Week 9 | 50% cache hit ratio | < 50ms p50 latency |
| **M8: GraphQL** | Week 13 | Federation live | < 300ms query time |
| **M9: Production** | Week 20 | Launch ready | All checkpoints pass |

---

## Conclusion

This document provides a comprehensive architectural foundation for POLLN's API Gateway and Service Mesh infrastructure. The recommended architecture prioritizes:

1. **Performance**: Kong Gateway + Linkerd for minimal latency
2. **Scalability**: Horizontal scaling with automatic mTLS
3. **Resilience**: Circuit breaking, retries, fallbacks
4. **Observability**: Distributed tracing, metrics, logging
5. **Cost-Effectiveness**: Self-hosted at scale, managed during development

### Next Steps

1. **Immediate (Week 1-4)**:
   - Setup EKS cluster
   - Install Kong and Linkerd
   - Deploy BFF layer
   - Initial load testing

2. **Short-term (Week 5-12)**:
   - Extract services using strangler fig
   - Implement caching
   - Performance optimization
   - Resilience patterns

3. **Long-term (Week 13-20)**:
   - GraphQL federation
   - Edge computing
   - Feature flags
   - Production launch

### Key Success Metrics

- **Latency**: p95 < 200ms
- **Throughput**: 10K RPS sustained
- **Availability**: 99.9% uptime
- **Error Rate**: < 0.1%
- **Cache Hit Ratio**: > 50%

---

**Document Owner:** Master Planner (glm-5)
**Review Cycle:** Monthly updates during implementation
**Related Documents:**
- [MASTER_PLAN.md](./MASTER_PLAN.md)
- [CELL_ONTOLOGY.md](./CELL_ONTOLOGY.md)
- [DECISION_LOG.md](./DECISION_LOG.md)

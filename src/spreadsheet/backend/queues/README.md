# Redis Queue System - Distributed Message Infrastructure

High-performance, distributed message queue system built on Redis for the POLLN spreadsheet backend. Designed for 4M+ sensations/second throughput with <10ms p99 latency.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Queue System Architecture                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │ SensationQueue │◄────┤ Redis Pub/Sub │  Real-time        │
│  │  (Pub/Sub)    │      │   Channels    │  Sensations       │
│  └──────────────┘      └──────────────┘                     │
│          │                                                      │
│          ▼                                                      │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │  EventQueue   │◄────┤ Redis Streams  │  Reliable         │
│  │ (Streams)     │      │ Consumer Groups│  Events          │
│  └──────────────┘      └──────────────┘                     │
│          │                                                      │
│          ▼                                                      │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │CacheCoordinator│◄───┤   Redis Cache  │  Distributed      │
│  │  (L2 Cache)   │      │ Invalidation  │  Cache            │
│  └──────────────┘      └──────────────┘                     │
│          │                                                      │
│          ▼                                                      │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │ ShardManager  │◄────┤ Redis Cluster  │  Sharded          │
│  │(Consistent Hash)│   │   Nodes       │  Data             │
│  └──────────────┘      └──────────────┘                     │
│          │                                                      │
│          ▼                                                      │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │ QueueMetrics  │      │ Monitoring    │  Real-time        │
│  │ (Telemetry)   │─────►& Alerting     │  Metrics          │
│  └──────────────┘      └──────────────┘                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. RedisConnection (`RedisConnection.ts`)

Manages Redis client connections with pooling, reconnection, and health monitoring.

**Features:**
- Connection pooling with automatic scaling
- Automatic reconnection with exponential backoff
- Redis Cluster support for horizontal scaling
- Sentinel for high availability
- Health monitoring and metrics
- TLS/SSL support

**Usage:**
```typescript
import { getRedisConnection } from './queues/index.js';

const connection = getRedisConnection({
  host: 'localhost',
  port: 6379,
  password: 'optional-password',
  db: 0,
  cluster: false,
  sentinel: false,
});

const client = await connection.getClient('my-service');
await client.ping();
```

### 2. SensationQueue (`SensationQueue.ts`)

Pub/Sub system for real-time sensation distribution between cells.

**Features:**
- Channel-based publish/subscribe
- Pattern-based subscriptions (e.g., `cell:*`)
- Message batching for efficiency
- Backpressure handling
- Automatic reconnection

**Usage:**
```typescript
import { getSensationQueue, SensationType } from './queues/index.js';

const queue = getSensationQueue({
  batchSize: 100,
  batchTimeout: 10,
  backpressureThreshold: 10000,
});

await queue.init();

// Subscribe to sensations
await queue.subscribe('cell:neighborhood', (sensation) => {
  console.log('Received sensation:', sensation);
});

// Publish sensations
await queue.publish('cell:neighborhood', {
  id: 'sensation-1',
  sourceCellId: 'A1',
  targetCellId: 'A2',
  sensationType: SensationType.ABSOLUTE_CHANGE,
  timestamp: Date.now(),
  data: { oldValue: 10, newValue: 15 },
});
```

### 3. EventQueue (`EventQueue.ts`)

Reliable event processing using Redis Streams with consumer groups.

**Features:**
- Redis Streams for event storage
- Consumer groups for parallel processing
- Acknowledgment handling
- Dead letter queue
- Event replay from any point
- Exactly-once semantics

**Usage:**
```typescript
import { createEventQueue } from './queues/index.js';

const eventQueue = createEventQueue(
  'cell-events',
  {
    name: 'processors',
    consumerName: 'processor-1',
  },
  {
    maxRetries: 3,
    retryDelay: 1000,
  }
);

await eventQueue.init();

// Produce events
await eventQueue.produce({
  type: 'cell-updated',
  data: { cellId: 'A1', value: 42 },
  timestamp: Date.now(),
});

// Consume events
await eventQueue.consume(async (event) => {
  console.log('Processing event:', event);
  // Processing logic here
});
```

### 4. CacheCoordinator (`CacheCoordinator.ts`)

Distributed cache management with Redis as L2 cache.

**Features:**
- Local L1 cache with Redis L2 cache
- Cache invalidation via pub/sub
- Distributed locks
- Cache warming strategies
- Automatic expiration

**Usage:**
```typescript
import { getCacheCoordinator } from './queues/index.js';

const cache = getCacheCoordinator({
  defaultTTL: 3600000, // 1 hour
  maxSize: 10000,
  enableDistributed: true,
});

await cache.init();

// Set value
await cache.set('cell:A1', { value: 42, formula: '=B1*2' });

// Get value
const data = await cache.get('cell:A1');

// Acquire distributed lock
const acquired = await cache.acquireLock('cell:A1:lock', 'process-1');
if (acquired) {
  try {
    // Critical section
  } finally {
    await cache.releaseLock('cell:A1:lock', 'process-1');
  }
}
```

### 5. ShardManager (`ShardManager.ts`)

Database sharding with consistent hashing for even distribution.

**Features:**
- Consistent hashing ring
- Virtual nodes for better distribution
- Shard assignment and rebalancing
- Health monitoring
- Query routing

**Usage:**
```typescript
import { createShardManager } from './queues/index.js';

const shardManager = createShardManager(
  [
    {
      id: 'shard-1',
      host: 'redis-1.example.com',
      port: 6379,
      db: 0,
      healthy: true,
      weight: 1,
      lastHealthCheck: new Date(),
      connectionCount: 0,
    },
    {
      id: 'shard-2',
      host: 'redis-2.example.com',
      port: 6379,
      db: 0,
      healthy: true,
      weight: 1,
      lastHealthCheck: new Date(),
      connectionCount: 0,
    },
  ],
  {
    replicas: 150,
    algorithm: 'md5',
  }
);

await shardManager.init();

// Route query to appropriate shard
const result = await shardManager.routeQuery('cell:A1', async (shard) => {
  // Execute query on shard
  return { shardId: shard.id, data: '...' };
});
```

### 6. QueueMetrics (`QueueMetrics.ts`)

Comprehensive monitoring and metrics for all queue operations.

**Features:**
- Message throughput tracking
- Latency measurements (p50, p95, p99)
- Queue depth monitoring
- Error rate tracking
- Consumer lag monitoring
- Alert generation

**Usage:**
```typescript
import { getQueueMetrics } from './queues/index.js';

const metrics = getQueueMetrics();

// Record metrics
metrics.recordMessage();
metrics.recordLatency(5);
metrics.recordDepth(100);
metrics.recordError('timeout');

// Get statistics
const throughput = metrics.getThroughputMetrics();
const latency = metrics.getCurrentLatency();
const health = metrics.getQueueHealth();

// Configure alerts
metrics.configureAlert('latency', {
  latencyThreshold: 50, // Alert if p99 latency > 50ms
});
```

## Docker Setup

### Quick Start

```bash
cd src/spreadsheet/backend/server/redis
docker-compose up -d
```

This starts:
- **Primary Redis** on port 6379
- **2 Replicas** on ports 6380-6381
- **3 Sentinel** instances on ports 26379-26381
- **3 Cluster nodes** on ports 7001-7003
- **Redis Commander** (Web UI) on port 8081
- **Redis Exporter** (Prometheus) on port 9121

### Configuration Files

- `redis-primary.conf` - Primary Redis configuration
- `redis-replica.conf` - Replica Redis configuration
- `redis-sentinel.conf` - Sentinel configuration
- `redis-cluster.conf` - Cluster configuration
- `docker-compose.yml` - Full stack orchestration

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Throughput | 4M+ msg/sec | Sensation publish rate |
| Latency (p99) | <10ms | End-to-end sensation delivery |
| Latency (p50) | <1ms | Median latency |
| Queue Depth | <100K | Max queued messages |
| Error Rate | <0.01% | Failed operations |
| Consumer Lag | <100 | Max unprocessed events |

## Development

### Installation

```bash
npm install
```

### Running Tests

```bash
npm test queues.test.ts
```

### Building

```bash
npm run build
```

## Environment Variables

```bash
# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional-password
REDIS_DB=0

# High Availability
REDIS_SENTINEL_MASTER=mymaster
REDIS_REPLICAS=2

# Cluster
REDIS_CLUSTER_ENABLED=true
REDIS_CLUSTER_NODES=3

# Queue Configuration
SENSATION_BATCH_SIZE=100
EVENT_MAX_RETRIES=3
CACHE_DEFAULT_TTL=3600000
SHARD_COUNT=3
```

## Production Deployment

### Using QueueSystem

```typescript
import { createQueueSystem, getProductionConfig } from './queues/index.js';

const queueSystem = createQueueSystem(getProductionConfig());

await queueSystem.init();

// Use components
const sensationQueue = queueSystem.getSensationQueue();
const cache = queueSystem.getCacheCoordinator();
const metrics = queueSystem.getMetrics();

// Graceful shutdown
await queueSystem.close();
```

### Scaling

1. **Horizontal Scaling**: Add more Redis cluster nodes
2. **Vertical Scaling**: Increase Redis memory and CPU
3. **Sharding**: Distribute data across multiple shards
4. **Replication**: Add read replicas for read-heavy workloads

### Monitoring

```bash
# Redis Commander UI
open http://localhost:8081

# Prometheus Metrics
curl http://localhost:9121/metrics
```

## Troubleshooting

### Connection Issues

```bash
# Check Redis is running
docker-compose ps

# View logs
docker-compose logs redis-primary

# Test connection
redis-cli -h localhost -p 6379 ping
```

### Performance Issues

```bash
# Check slow log
redis-cli -h localhost -p 6379 SLOWLOG GET

# Monitor commands
redis-cli -h localhost -p 6379 MONITOR

# Check info
redis-cli -h localhost -p 6379 INFO
```

### Memory Issues

```bash
# Check memory usage
redis-cli -h localhost -p 6379 INFO memory

# Configure maxmemory
redis-cli -h localhost -p 6379 CONFIG SET maxmemory 2gb
redis-cli -h localhost -p 6379 CONFIG SET maxmemory-policy allkeys-lru
```

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines.

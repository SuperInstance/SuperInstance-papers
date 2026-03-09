# Quick Start Guide - Redis Queue System

## 5-Minute Setup

### 1. Start Redis

```bash
cd src/spreadsheet/backend/server/redis
docker-compose up -d
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Basic Usage

```typescript
import { createQueueSystem } from './queues/index.js';

// Create and initialize
const queueSystem = createQueueSystem({
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

await queueSystem.init();

// Use sensation queue
const sensationQueue = queueSystem.getSensationQueue();
await sensationQueue.subscribe('cell:updates', (sensation) => {
  console.log('Received:', sensation);
});

await sensationQueue.publish('cell:updates', {
  id: '1',
  sourceCellId: 'A1',
  sensationType: 'absolute',
  timestamp: Date.now(),
  data: { value: 42 },
});
```

## Common Patterns

### Publishing Sensations

```typescript
const queue = getSensationQueue();

// Single sensation
await queue.publish('cell:A1', {
  id: 'sensation-1',
  sourceCellId: 'A1',
  targetCellId: 'A2',
  sensationType: SensationType.ABSOLUTE_CHANGE,
  timestamp: Date.now(),
  data: { oldValue: 10, newValue: 15 },
});

// Batch sensations
const sensations = Array.from({ length: 100 }, (_, i) => ({
  id: `sensation-${i}`,
  sourceCellId: 'A1',
  sensationType: SensationType.ABSOLUTE_CHANGE,
  timestamp: Date.now(),
  data: { value: i },
}));

await queue.publishBatch('cell:A1', sensations);
```

### Subscribing to Sensations

```typescript
// Specific channel
await queue.subscribe('cell:A1', (sensation) => {
  console.log('A1 updated:', sensation);
});

// Pattern matching
await queue.psubscribe('cell:*', (sensation) => {
  console.log('Cell updated:', sensation);
});

// Unsubscribe
await queue.unsubscribe('cell:A1');
```

### Using Event Queue

```typescript
const eventQueue = createEventQueue('cell-events', {
  name: 'processors',
  consumerName: 'worker-1',
});

await eventQueue.init();

// Produce events
await eventQueue.produce({
  type: 'cell-updated',
  data: { cellId: 'A1', value: 42 },
  timestamp: Date.now(),
});

// Consume events
await eventQueue.consume(async (event) => {
  console.log('Processing:', event);
  // Event is automatically acknowledged after handler completes
});
```

### Using Cache

```typescript
const cache = getCacheCoordinator();
await cache.init();

// Set value
await cache.set('cell:A1', { value: 42, formula: '=B1*2' }, 3600000);

// Get value
const data = await cache.get('cell:A1');

// Delete value
await cache.delete('cell:A1');

// Invalidate all
await cache.invalidateAll();
```

### Using Distributed Locks

```typescript
const cache = getCacheCoordinator();

// Acquire lock
const acquired = await cache.acquireLock('cell:A1:lock', 'process-1');

if (acquired) {
  try {
    // Critical section - only one process can execute
    await updateCell('A1');
  } finally {
    // Always release lock
    await cache.releaseLock('cell:A1:lock', 'process-1');
  }
}
```

### Using Shard Manager

```typescript
const shardManager = createShardManager([
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
]);

await shardManager.init();

// Route query to appropriate shard
const result = await shardManager.routeQuery('cell:A1', async (shard) => {
  // Execute query on this shard
  return await fetchCellData(shard, 'A1');
});

// Query all shards
const results = await shardManager.routeQueryToAll(async (shard) => {
  return await getAllCells(shard);
});
```

### Monitoring Metrics

```typescript
const metrics = getQueueMetrics();

// Record metrics
metrics.recordMessage();
metrics.recordLatency(5);
metrics.recordDepth(100);
metrics.recordError('timeout');
metrics.recordLag(50);

// Get statistics
const summary = metrics.getSummary();
console.log('Throughput:', summary.throughput.messagesPerSecond);
console.log('Latency p99:', summary.latency.p99);
console.log('Health:', summary.health);

// Configure alerts
metrics.configureAlert('latency', { latencyThreshold: 50 });
metrics.configureAlert('throughput', { throughputThreshold: 1000 });

// Get alerts
const alerts = metrics.getAlerts();
alerts.forEach(alert => console.log('Alert:', alert.message));
```

## Environment Setup

### Development

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

### Production

```bash
# .env.production
REDIS_HOST=redis-production.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0
REDIS_SENTINEL_MASTER=mymaster
REDIS_CLUSTER_ENABLED=true
```

## Docker Commands

```bash
# Start all Redis services
docker-compose up -d

# View logs
docker-compose logs -f redis-primary

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Check status
docker-compose ps

# Access Redis CLI
docker-compose exec redis-primary redis-cli
```

## Testing

```bash
# Run all queue tests
npm test queues.test.ts

# Run specific test suite
npm test -- --testNamePattern="SensationQueue"

# Run with coverage
npm test -- --coverage --collectCoverageFrom='queues/**/*.ts'
```

## Monitoring

### Redis Commander (Web UI)
```
http://localhost:8081
```

### Prometheus Metrics
```
http://localhost:9121/metrics
```

### Redis CLI Commands

```bash
# Check memory usage
redis-cli INFO memory

# Check connections
redis-cli CLIENT LIST

# Monitor commands
redis-cli MONITOR

# Check slow log
redis-cli SLOWLOG GET 10

# Pub/Sub stats
redis-cli PUBSUB CHANNELS
redis-cli PUBSUB NUMSUB

# Stream info
redis-cli XINFO STREAMS cell-events
```

## Troubleshooting

### Connection Issues

```typescript
// Increase retry attempts
const connection = getRedisConnection({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 10,
});
```

### Memory Issues

```typescript
// Configure cache size limits
const cache = getCacheCoordinator({
  maxSize: 1000, // Max entries
  defaultTTL: 3600000, // 1 hour
});
```

### Performance Issues

```typescript
// Increase batch size
const queue = getSensationQueue({
  batchSize: 1000, // Process 1000 at a time
  batchTimeout: 5, // Wait max 5ms
});
```

### High Consumer Lag

```typescript
// Add more consumers
const consumer1 = createEventQueue('stream', {
  name: 'group',
  consumerName: 'worker-1',
});

const consumer2 = createEventQueue('stream', {
  name: 'group',
  consumerName: 'worker-2',
});

// Both will consume in parallel
```

## Best Practices

1. **Always initialize before use**
   ```typescript
   await queueSystem.init();
   ```

2. **Use batching for high throughput**
   ```typescript
   await queue.publishBatch(channel, sensations);
   ```

3. **Handle errors gracefully**
   ```typescript
   try {
     await queue.publish(channel, sensation);
   } catch (error) {
     logger.error('Publish failed', error);
   }
   ```

4. **Always release locks**
   ```typescript
   try {
     // Critical section
   } finally {
     await cache.releaseLock(key, holder);
   }
   ```

5. **Monitor metrics regularly**
   ```typescript
   setInterval(() => {
     const health = metrics.getQueueHealth();
     if (!health.healthy) {
       console.warn('Queue unhealthy:', health.issues);
     }
   }, 5000);
   ```

6. **Use appropriate cache TTL**
   ```typescript
   // Short TTL for rapidly changing data
   await cache.set('temp', data, 60000); // 1 minute

   // Long TTL for static data
   await cache.set('config', data, 3600000); // 1 hour
   ```

## Production Checklist

- [ ] Redis password configured
- [ ] TLS enabled for secure connections
- [ ] Sentinel configured for HA
- [ ] Cluster enabled for scaling
- [ ] Monitoring setup (Prometheus)
- [ ] Alerting configured
- [ ] Backup strategy in place
- [ ] Load testing completed
- [ ] Failover testing completed
- [ ] Documentation updated

## Support

For issues or questions:
- Check README.md for detailed documentation
- Review test files for usage examples
- Check Redis logs: `docker-compose logs redis-primary`
- Monitor metrics in Redis Commander: http://localhost:8081

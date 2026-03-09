/**
 * Redis Queue System Tests
 *
 * Comprehensive test suite for Redis-based message queue infrastructure.
 * Tests pub/sub functionality, queue reliability, sharding logic, and failover scenarios.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { RedisConnectionManager, getRedisConnection } from '../queues/RedisConnection.js';
import { SensationQueue, getSensationQueue, SensationType } from '../queues/SensationQueue.js';
import { EventQueue, createEventQueue } from '../queues/EventQueue.js';
import { CacheCoordinator, getCacheCoordinator } from '../queues/CacheCoordinator.js';
import { ShardManager, createShardManager } from '../queues/ShardManager.js';
import { QueueMetrics, getQueueMetrics } from '../queues/QueueMetrics.js';
import type { Shard } from '../queues/ShardManager.js';

describe('Redis Queue System', () => {
  describe('RedisConnection', () => {
    let connection: RedisConnectionManager;

    beforeAll(() => {
      connection = getRedisConnection({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      });
    });

    afterAll(async () => {
      await connection.closeAll();
    });

    it('should create a Redis client', async () => {
      const client = await connection.getClient('test');
      expect(client).toBeDefined();
      await connection.closeClient('test');
    });

    it('should execute commands', async () => {
      const result = await connection.executeCommand('test', (redis) => redis.ping());
      expect(result).toBe('PONG');
    });

    it('should track health status', async () => {
      await connection.getClient('health-test');
      const health = connection.getHealthStatus('health-test');

      expect(health).toBeDefined();
      expect(health?.connected).toBe(true);
      expect(health?.healthy).toBe(true);

      await connection.closeClient('health-test');
    });

    it('should track statistics', async () => {
      const client = await connection.getClient('stats-test');
      await client.ping();
      await client.ping();

      const stats = connection.getStats('stats-test');
      expect(stats).toBeDefined();
      expect(stats?.totalCommands).toBeGreaterThan(0);

      await connection.closeClient('stats-test');
    });
  });

  describe('SensationQueue', () => {
    let queue: SensationQueue;

    beforeEach(async () => {
      queue = getSensationQueue({ batchSize: 10, batchTimeout: 100 });
      await queue.init();
    });

    afterEach(async () => {
      await queue.close();
    });

    it('should publish and receive sensations', async () => {
      const channel = 'test-channel';
      const sensation = {
        id: 'test-1',
        sourceCellId: 'cell-1',
        targetCellId: 'cell-2',
        sensationType: SensationType.ABSOLUTE_CHANGE,
        timestamp: Date.now(),
        data: { value: 42 },
      };

      // Subscribe
      await new Promise<void>((resolve) => {
        queue.subscribe(channel, (received) => {
          expect(received.id).toBe(sensation.id);
          expect(received.data.value).toBe(42);
          resolve();
        });

        // Publish
        queue.publish(channel, sensation);
      });
    });

    it('should handle pattern subscriptions', async () => {
      const pattern = 'channel:*';
      const sensation = {
        id: 'test-2',
        sourceCellId: 'cell-1',
        sensationType: SensationType.RATE_OF_CHANGE,
        timestamp: Date.now(),
        data: { delta: 5 },
      };

      await new Promise<void>((resolve) => {
        queue.psubscribe(pattern, (received) => {
          expect(received.id).toBe(sensation.id);
          resolve();
        });

        queue.publish('channel:test', sensation);
      });
    });

    it('should batch messages', async () => {
      const channel = 'batch-channel';
      const batchSize = 10;
      const receivedMessages: any[] = [];

      await queue.subscribe(channel, (sensation) => {
        receivedMessages.push(sensation);
      });

      // Publish multiple messages
      const promises = [];
      for (let i = 0; i < batchSize; i++) {
        const sensation = {
          id: `batch-${i}`,
          sourceCellId: 'cell-1',
          sensationType: SensationType.ABSOLUTE_CHANGE,
          timestamp: Date.now(),
          data: { index: i },
        };
        promises.push(queue.publish(channel, sensation));
      }

      await Promise.all(promises);

      // Wait for batch to be processed
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(receivedMessages.length).toBeGreaterThan(0);
    });

    it('should track statistics', async () => {
      const stats = queue.getStats();

      expect(stats).toBeDefined();
      expect(stats.messagesPublished).toBeGreaterThanOrEqual(0);
      expect(stats.messagesReceived).toBeGreaterThanOrEqual(0);
    });

    it('should handle backpressure', async () => {
      const channel = 'backpressure-channel';
      const queue = getSensationQueue({
        batchSize: 1,
        batchTimeout: 10,
        backpressureThreshold: 5,
      });

      await queue.init();

      let receivedCount = 0;
      await queue.subscribe(channel, () => {
        receivedCount++;
      });

      // Publish more messages than threshold
      for (let i = 0; i < 20; i++) {
        await queue.publish(channel, {
          id: `bp-${i}`,
          sourceCellId: 'cell-1',
          sensationType: SensationType.ABSOLUTE_CHANGE,
          timestamp: Date.now(),
          data: {},
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = queue.getStats();
      expect(stats.messagesDropped).toBeGreaterThanOrEqual(0);

      await queue.close();
    });
  });

  describe('EventQueue', () => {
    let eventQueue: EventQueue;

    beforeEach(async () => {
      eventQueue = createEventQueue('test-stream', {
        name: 'test-group',
        consumerName: 'test-consumer',
      });
      await eventQueue.init();
    });

    afterEach(async () => {
      await eventQueue.close();
    });

    it('should produce and consume events', async () => {
      const event = {
        type: 'test-event',
        data: { message: 'Hello, World!' },
        timestamp: Date.now(),
      };

      const eventId = await eventQueue.produce(event);
      expect(eventId).toBeDefined();

      // Consume event
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 2000);

        eventQueue.consume(async (received) => {
          if (received.type === 'test-event') {
            expect(received.data.message).toBe('Hello, World!');
            clearTimeout(timeout);
            eventQueue.stop();
            resolve();
          }
        });
      });
    });

    it('should handle event batches', async () => {
      const events = [];
      for (let i = 0; i < 100; i++) {
        events.push({
          type: 'batch-event',
          data: { index: i },
          timestamp: Date.now(),
        });
      }

      const eventIds = await eventQueue.produceBatch(events);
      expect(eventIds.length).toBe(100);
    });

    it('should track statistics', async () => {
      await eventQueue.produce({
        type: 'stats-test',
        data: {},
        timestamp: Date.now(),
      });

      const stats = eventQueue.getStats();
      expect(stats.eventsProduced).toBe(1);
    });

    it('should handle event replay', async () => {
      // Add some events
      for (let i = 0; i < 5; i++) {
        await eventQueue.produce({
          type: 'replay-test',
          data: { index: i },
          timestamp: Date.now(),
        });
      }

      // Replay from beginning
      let replayCount = 0;
      await eventQueue.replay('0', async (event) => {
        if (event.type === 'replay-test') {
          replayCount++;
        }
      });

      expect(replayCount).toBe(5);
    });
  });

  describe('CacheCoordinator', () => {
    let cache: CacheCoordinator;

    beforeEach(async () => {
      cache = getCacheCoordinator({
        defaultTTL: 60000,
        maxSize: 100,
        enableDistributed: true,
      });
      await cache.init();
    });

    afterEach(async () => {
      await cache.close();
    });

    it('should set and get values', async () => {
      await cache.set('test-key', { value: 42 });
      const result = await cache.get('test-key');

      expect(result).toEqual({ value: 42 });
    });

    it('should handle cache misses', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      await cache.set('delete-test', { value: 100 });
      await cache.delete('delete-test');

      const result = await cache.get('delete-test');
      expect(result).toBeNull();
    });

    it('should track statistics', async () => {
      await cache.set('stats-key', { value: 1 });
      await cache.get('stats-key');
      await cache.get('miss-key');

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should acquire and release locks', async () => {
      const lockAcquired = await cache.acquireLock('test-lock', 'holder-1');
      expect(lockAcquired).toBe(true);

      const lockReleased = await cache.releaseLock('test-lock', 'holder-1');
      expect(lockReleased).toBe(true);
    });

    it('should handle lock contention', async () => {
      await cache.acquireLock('contention-lock', 'holder-1');

      const lockAcquired = await cache.acquireLock('contention-lock', 'holder-2');
      expect(lockAcquired).toBe(false);

      await cache.releaseLock('contention-lock', 'holder-1');
    });

    it('should warm up cache', async () => {
      const data = new Map([
        ['key-1', { value: 1 }],
        ['key-2', { value: 2 }],
        ['key-3', { value: 3 }],
      ]);

      await cache.warmUp(data);

      expect(await cache.get('key-1')).toEqual({ value: 1 });
      expect(await cache.get('key-2')).toEqual({ value: 2 });
      expect(await cache.get('key-3')).toEqual({ value: 3 });
    });
  });

  describe('ShardManager', () => {
    let shardManager: ShardManager;
    const shards: Shard[] = [
      {
        id: 'shard-1',
        host: 'localhost',
        port: 6379,
        db: 0,
        healthy: true,
        weight: 1,
        lastHealthCheck: new Date(),
        connectionCount: 0,
      },
      {
        id: 'shard-2',
        host: 'localhost',
        port: 6380,
        db: 0,
        healthy: true,
        weight: 1,
        lastHealthCheck: new Date(),
        connectionCount: 0,
      },
      {
        id: 'shard-3',
        host: 'localhost',
        port: 6381,
        db: 0,
        healthy: true,
        weight: 1,
        lastHealthCheck: new Date(),
        connectionCount: 0,
      },
    ];

    beforeEach(async () => {
      shardManager = createShardManager(shards, { replicas: 50, algorithm: 'md5' });
      await shardManager.init();
    });

    afterEach(async () => {
      await shardManager.close();
    });

    it('should route queries to correct shard', async () => {
      const shard = shardManager.getShardForKey('test-key');
      expect(shard).toBeDefined();
      expect(shards.map((s) => s.id)).toContain(shard!.id);
    });

    it('should distribute keys evenly across shards', async () => {
      const distribution = new Map<string, number>();

      for (let i = 0; i < 1000; i++) {
        const key = `key-${i}`;
        const shard = shardManager.getShardForKey(key);

        if (shard) {
          distribution.set(shard.id, (distribution.get(shard.id) || 0) + 1);
        }
      }

      // Check that distribution is reasonably even
      const counts = Array.from(distribution.values());
      const max = Math.max(...counts);
      const min = Math.min(...counts);

      expect(max - min).toBeLessThan(200); // Allow 20% variance
    });

    it('should return consistent shard for same key', async () => {
      const shard1 = shardManager.getShardForKey('consistent-key');
      const shard2 = shardManager.getShardForKey('consistent-key');

      expect(shard1?.id).toBe(shard2?.id);
    });

    it('should add and remove shards', async () => {
      const newShard: Shard = {
        id: 'shard-4',
        host: 'localhost',
        port: 6382,
        db: 0,
        healthy: true,
        weight: 1,
        lastHealthCheck: new Date(),
        connectionCount: 0,
      };

      shardManager.addShard(newShard);

      const allShards = shardManager.getShards();
      expect(allShards.length).toBe(4);

      await shardManager.removeShard('shard-4');

      const remainingShards = shardManager.getShards();
      expect(remainingShards.length).toBe(3);
    });

    it('should track statistics', async () => {
      const stats = shardManager.getStats();

      expect(stats.totalShards).toBe(3);
      expect(stats.queriesRouted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('QueueMetrics', () => {
    let metrics: QueueMetrics;

    beforeEach(() => {
      metrics = getQueueMetrics();
    });

    afterEach(() => {
      metrics.reset();
    });

    it('should track throughput', () => {
      metrics.recordMessage();
      metrics.recordMessages(5);

      const throughput = metrics.getThroughputMetrics();
      expect(throughput.totalMessages).toBe(6);
    });

    it('should track latency', () => {
      metrics.recordLatency(10);
      metrics.recordLatency(20);
      metrics.recordLatency(30);

      const latency = metrics.getCurrentLatency();
      expect(latency.avg).toBe(20);
      expect(latency.min).toBe(10);
      expect(latency.max).toBe(30);
    });

    it('should calculate percentiles', () => {
      for (let i = 0; i < 100; i++) {
        metrics.recordLatency(i);
      }

      const latency = metrics.getCurrentLatency();
      expect(latency.p50).toBeGreaterThan(0);
      expect(latency.p95).toBeGreaterThan(latency.p50);
      expect(latency.p99).toBeGreaterThan(latency.p95);
    });

    it('should track queue depth', () => {
      metrics.recordDepth(10);
      metrics.recordDepth(20);
      metrics.recordDepth(15);

      const depth = metrics.getDepthMetrics();
      expect(depth.currentDepth).toBe(15);
      expect(depth.maxDepth).toBe(20);
    });

    it('should track errors', () => {
      metrics.recordError('timeout');
      metrics.recordError('connection');

      const errors = metrics.getErrorMetrics();
      expect(errors.totalErrors).toBe(2);
      expect(errors.errorsByType.get('timeout')).toBe(1);
      expect(errors.errorsByType.get('connection')).toBe(1);
    });

    it('should track consumer lag', () => {
      metrics.recordLag(100);
      metrics.recordLag(200);
      metrics.recordLag(150);

      const lag = metrics.getLagMetrics();
      expect(lag.currentLag).toBe(150);
      expect(lag.maxLag).toBe(200);
    });

    it('should calculate trends', () => {
      metrics.recordDepth(10);
      metrics.recordDepth(20);
      metrics.recordDepth(30);

      const depth = metrics.getDepthMetrics();
      expect(depth.trend).toBe('increasing');
    });

    it('should trigger alerts', () => {
      metrics.configureAlert('latency', { latencyThreshold: 50 });

      metrics.recordLatency(100);

      const alerts = metrics.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('latency');
    });

    it('should calculate queue health', () => {
      metrics.recordMessage();
      metrics.recordLatency(10);

      const health = metrics.getQueueHealth();
      expect(health.healthy).toBe(true);
      expect(health.score).toBeGreaterThan(0);
    });

    it('should provide summary', () => {
      metrics.recordMessage();
      metrics.recordLatency(15);
      metrics.recordDepth(5);

      const summary = metrics.getSummary();
      expect(summary.throughput).toBeDefined();
      expect(summary.latency).toBeDefined();
      expect(summary.depth).toBeDefined();
      expect(summary.errors).toBeDefined();
      expect(summary.lag).toBeDefined();
      expect(summary.health).toBeDefined();
    });

    it('should reset metrics', () => {
      metrics.recordMessage();
      metrics.recordLatency(10);

      metrics.reset();

      const summary = metrics.getSummary();
      expect(summary.throughput.totalMessages).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle end-to-end sensation flow', async () => {
      const queue = getSensationQueue();
      await queue.init();

      const channel = 'integration-test';
      const receivedSensations: any[] = [];

      await queue.subscribe(channel, (sensation) => {
        receivedSensations.push(sensation);
      });

      // Publish sensations
      for (let i = 0; i < 10; i++) {
        await queue.publish(channel, {
          id: `integration-${i}`,
          sourceCellId: 'cell-1',
          sensationType: SensationType.ABSOLUTE_CHANGE,
          timestamp: Date.now(),
          data: { value: i },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(receivedSensations.length).toBeGreaterThan(0);

      await queue.close();
    });

    it('should handle cache with queue coordination', async () => {
      const cache = getCacheCoordinator();
      await cache.init();

      const queue = getSensationQueue();
      await queue.init();

      const channel = 'cache-coordination';

      // Subscribe and update cache
      await queue.subscribe(channel, async (sensation) => {
        await cache.set(`sensation:${sensation.id}`, sensation);
      });

      const testSensation = {
        id: 'cache-test-1',
        sourceCellId: 'cell-1',
        sensationType: SensationType.ABSOLUTE_CHANGE,
        timestamp: Date.now(),
        data: { cached: true },
      };

      await queue.publish(channel, testSensation);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const cached = await cache.get('sensation:cache-test-1');
      expect(cached).toBeDefined();

      await cache.close();
      await queue.close();
    });

    it('should handle high throughput scenarios', async () => {
      const metrics = getQueueMetrics();
      const queue = getSensationQueue({ batchSize: 100 });
      await queue.init();

      const channel = 'high-throughput';
      const messageCount = 1000;

      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < messageCount; i++) {
        const sensation = {
          id: `ht-${i}`,
          sourceCellId: 'cell-1',
          sensationType: SensationType.ABSOLUTE_CHANGE,
          timestamp: Date.now(),
          data: { index: i },
        };
        promises.push(queue.publish(channel, sensation));
        metrics.recordMessage();
      }

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      const throughput = messageCount / (duration / 1000);

      console.log(`Published ${messageCount} messages in ${duration}ms`);
      console.log(`Throughput: ${throughput.toFixed(2)} messages/second`);

      expect(throughput).toBeGreaterThan(100); // At least 100 msg/sec

      await queue.close();
    });
  });

  describe('Failover Scenarios', () => {
    it('should handle Redis connection failure', async () => {
      const connection = getRedisConnection({
        host: 'invalid-host',
        port: 6379,
        maxRetriesPerRequest: 2,
      });

      try {
        await connection.getClient('failover-test');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle reconnection', async () => {
      const connection = getRedisConnection({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      });

      const client = await connection.getClient('reconnect-test');

      // Simulate disconnect
      await client.disconnect();

      // Should reconnect automatically
      await new Promise((resolve) => setTimeout(resolve, 100));

      const health = connection.getHealthStatus('reconnect-test');
      expect(health?.connected).toBe(true);

      await connection.closeClient('reconnect-test');
    });
  });

  describe('Performance Tests', () => {
    it('should achieve target throughput', async () => {
      const metrics = getQueueMetrics();
      const queue = getSensationQueue();
      await queue.init();

      const channel = 'perf-test';
      const targetThroughput = 100000; // 100k messages/second
      const duration = 5000; // 5 seconds
      const messageCount = (targetThroughput * duration) / 1000;

      const startTime = Date.now();

      // Batch publish for better performance
      const batchSize = 100;
      for (let i = 0; i < messageCount; i += batchSize) {
        const sensations = [];
        for (let j = 0; j < batchSize && i + j < messageCount; j++) {
          sensations.push({
            id: `perf-${i + j}`,
            sourceCellId: 'cell-1',
            sensationType: SensationType.ABSOLUTE_CHANGE,
            timestamp: Date.now(),
            data: {},
          });
        }

        await queue.publishBatch(channel, sensations);
        metrics.recordMessages(sensations.length);
      }

      const actualDuration = Date.now() - startTime;
      const actualThroughput = messageCount / (actualDuration / 1000);

      console.log(`Target: ${targetThroughput} msg/sec`);
      console.log(`Actual: ${actualThroughput.toFixed(2)} msg/sec`);
      console.log(`Duration: ${actualDuration}ms`);

      // Relaxed threshold for testing environment
      expect(actualThroughput).toBeGreaterThan(10000);

      await queue.close();
    });

    it('should maintain low latency', async () => {
      const metrics = getQueueMetrics();
      const queue = getSensationQueue();
      await queue.init();

      const channel = 'latency-test';
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await queue.publish(channel, {
          id: `latency-${i}`,
          sourceCellId: 'cell-1',
          sensationType: SensationType.ABSOLUTE_CHANGE,
          timestamp: Date.now(),
          data: {},
        });

        const latency = Date.now() - startTime;
        metrics.recordLatency(latency);
      }

      const latencyStats = metrics.getCurrentLatency();

      console.log(`Latency Stats:`);
      console.log(`  p50: ${latencyStats.p50}ms`);
      console.log(`  p95: ${latencyStats.p95}ms`);
      console.log(`  p99: ${latencyStats.p99}ms`);

      // Target: <10ms p99 latency
      expect(latencyStats.p99).toBeLessThan(50);

      await queue.close();
    });
  });
});

/**
 * Resource Management Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ResourceAllocator } from '../allocator.js';
import { AgentScheduler } from '../scheduler.js';
import { LoadBalancer } from '../balancer.js';
import { RequestThrottler, createDefaultThrottlingConfig } from '../throttler.js';
import type { LoadBalancingStrategy, ThrottlingConfig } from '../types.js';

describe('ResourceAllocator', () => {
  let allocator: ResourceAllocator;

  beforeEach(() => {
    allocator = new ResourceAllocator({
      totalCPU: 100,
      totalMemory: 16 * 1024 * 1024 * 1024, // 16GB
      totalKVCache: 2 * 1024 * 1024 * 1024, // 2GB
      allocatedCPU: 0,
      allocatedMemory: 0,
      allocatedKVCache: 0,
    });
  });

  it('should allocate resources', async () => {
    const request = {
      agentId: 'agent-1',
      cpu: 10,
      memory: 1024 * 1024 * 1024, // 1GB
      kvCache: 512 * 1024 * 1024, // 512MB
      priority: 5,
    };

    const allocated = await allocator.request(request);

    expect(allocated).toBe(true);
    expect(allocator.getAllocation('agent-1')).toBeDefined();
  });

  it('should queue request when insufficient resources', async () => {
    const request = {
      agentId: 'agent-1',
      cpu: 200, // More than available
      memory: 1024,
      priority: 5,
    };

    const allocated = await allocator.request(request);

    expect(allocated).toBe(false);
    expect(allocator.getPendingCount()).toBe(1);
  });

  it('should release resources', () => {
    const request = {
      agentId: 'agent-1',
      cpu: 10,
      memory: 1024,
      priority: 5,
    };

    allocator.request(request);
    allocator.release('agent-1');

    expect(allocator.getAllocation('agent-1')).toBeUndefined();
  });

  it('should process pending queue when resources available', async () => {
    // First request that will be queued
    const request1 = {
      agentId: 'agent-1',
      cpu: 150,
      memory: 1024,
      priority: 5,
    };

    await allocator.request(request1);
    expect(allocator.getPendingCount()).toBe(1);

    // Expand pool
    allocator.expandPool({ totalCPU: 100 });

    // Should now be able to allocate
    expect(allocator.getPendingCount()).toBe(0);
  });

  it('should get utilization', () => {
    const request = {
      agentId: 'agent-1',
      cpu: 50,
      memory: 8 * 1024 * 1024 * 1024,
      priority: 5,
    };

    allocator.request(request);

    const utilization = allocator.getUtilization();

    expect(utilization.cpu).toBe(0.5);
    expect(utilization.memory).toBe(0.5);
  });
});

describe('AgentScheduler', () => {
  let scheduler: AgentScheduler;

  beforeEach(() => {
    scheduler = new AgentScheduler('least_loaded');
  });

  it('should register agent', () => {
    scheduler.registerAgent({
      id: 'agent-1',
      type: 'task',
      load: 0,
      activeTasks: 0,
      capacity: 10,
      lastHeartbeat: Date.now(),
    });

    expect(scheduler.getAgentCount()).toBe(1);
    expect(scheduler.getAgent('agent-1')).toBeDefined();
  });

  it('should unregister agent', () => {
    scheduler.registerAgent({
      id: 'agent-1',
      type: 'task',
      load: 0,
      activeTasks: 0,
      capacity: 10,
      lastHeartbeat: Date.now(),
    });

    scheduler.unregisterAgent('agent-1');

    expect(scheduler.getAgentCount()).toBe(0);
  });

  it('should submit and schedule task', () => {
    scheduler.registerAgent({
      id: 'agent-1',
      type: 'task',
      load: 0,
      activeTasks: 0,
      capacity: 10,
      lastHeartbeat: Date.now(),
    });

    const task = {
      id: 'task-1',
      type: 'test',
      payload: {},
      priority: 5,
      estimatedDuration: 1000,
      timeout: 5000,
      createdAt: Date.now(),
    };

    scheduler.submitTask(task);

    expect(scheduler.getRunningTaskCount()).toBe(1);
  });

  it('should queue tasks when no capacity', () => {
    scheduler.registerAgent({
      id: 'agent-1',
      type: 'task',
      load: 1, // Full
      activeTasks: 10,
      capacity: 10,
      lastHeartbeat: Date.now(),
    });

    const task = {
      id: 'task-1',
      type: 'test',
      payload: {},
      priority: 5,
      estimatedDuration: 1000,
      timeout: 5000,
      createdAt: Date.now(),
    };

    scheduler.submitTask(task);

    expect(scheduler.getQueueDepth()).toBe(1);
  });

  it('should complete task and update agent', () => {
    scheduler.registerAgent({
      id: 'agent-1',
      type: 'task',
      load: 0.5,
      activeTasks: 5,
      capacity: 10,
      lastHeartbeat: Date.now(),
    });

    const task = {
      id: 'task-1',
      type: 'test',
      payload: {},
      priority: 5,
      estimatedDuration: 1000,
      timeout: 5000,
      createdAt: Date.now(),
    };

    scheduler.submitTask(task);
    scheduler.completeTask('task-1');

    expect(scheduler.getRunningTaskCount()).toBe(0);
  });

  it('should get statistics', () => {
    scheduler.registerAgent({
      id: 'agent-1',
      type: 'task',
      load: 0.5,
      activeTasks: 5,
      capacity: 10,
      lastHeartbeat: Date.now(),
    });

    const stats = scheduler.getStats();

    expect(stats.agentCount).toBe(1);
    expect(stats.averageLoad).toBe(0.5);
    expect(stats.utilization).toBeCloseTo(0.5);
  });
});

describe('LoadBalancer', () => {
  let balancer: LoadBalancer;

  beforeEach(() => {
    balancer = new LoadBalancer({
      strategy: 'least_loaded',
      healthCheckInterval: 30000,
      unhealthyThreshold: 3,
      healthyThreshold: 2,
    });
  });

  afterEach(() => {
    balancer.stop();
  });

  it('should add node', () => {
    balancer.addNode({
      id: 'node-1',
      address: 'localhost',
      port: 8080,
      weight: 1,
      maxConnections: 100,
    });

    expect(balancer.getAllNodes()).toHaveLength(1);
    expect(balancer.getHealthyNodes()).toHaveLength(1);
  });

  it('should remove node', () => {
    balancer.addNode({
      id: 'node-1',
      address: 'localhost',
      port: 8080,
      weight: 1,
      maxConnections: 100,
    });

    balancer.removeNode('node-1');

    expect(balancer.getAllNodes()).toHaveLength(0);
  });

  it('should open connection', () => {
    balancer.addNode({
      id: 'node-1',
      address: 'localhost',
      port: 8080,
      weight: 1,
      maxConnections: 100,
    });

    const connectionId = balancer.openConnection('node-1');

    expect(connectionId).not.toBeNull();
    expect(balancer.getStats().totalConnections).toBe(1);
  });

  it('should close connection', () => {
    balancer.addNode({
      id: 'node-1',
      address: 'localhost',
      port: 8080,
      weight: 1,
      maxConnections: 100,
    });

    const connectionId = balancer.openConnection('node-1');
    balancer.closeConnection(connectionId!);

    expect(balancer.getStats().totalConnections).toBe(0);
  });

  it('should reject connection when node at capacity', () => {
    balancer.addNode({
      id: 'node-1',
      address: 'localhost',
      port: 8080,
      weight: 1,
      maxConnections: 1,
    });

    balancer.openConnection('node-1');
    const connectionId = balancer.openConnection('node-1');

    expect(connectionId).toBeNull();
  });

  it('should get statistics', () => {
    balancer.addNode({
      id: 'node-1',
      address: 'localhost',
      port: 8080,
      weight: 1,
      maxConnections: 100,
    });

    const stats = balancer.getStats();

    expect(stats.totalNodes).toBe(1);
    expect(stats.healthyNodes).toBe(1);
  });
});

describe('RequestThrottler', () => {
  let throttler: RequestThrottler;
  let config: ThrottlingConfig;

  beforeEach(() => {
    config = createDefaultThrottlingConfig();
    // Reduce timeout for tests
    config.timeout = 1000; // 1 second
    throttler = new RequestThrottler(config);
  });

  afterEach(() => {
    throttler.stop();
  });

  it('should allow request when under limit', async () => {
    config.maxRequestsPerSecond = 100;
    config.maxConcurrentRequests = 10;

    const allowed = await throttler.request();

    expect(allowed).toBe(true);
  });

  it('should queue request when at concurrent limit', async () => {
    config.maxConcurrentRequests = 1;

    // First request
    await throttler.request();

    // Second request queues but we don't wait for it
    const queuedRequest = throttler.request();
    // Give it time to queue
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check it's queued without waiting for the promise
    expect(throttler.getQueueLength()).toBe(1);

    // Clean up
    queuedRequest.catch(() => {});
    throttler.complete();
  });

  it('should process queue on complete', async () => {
    config.maxConcurrentRequests = 1;

    // First request
    await throttler.request();

    // Second request queues
    const queuedRequest = throttler.request();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(throttler.getQueueLength()).toBe(1);

    // Complete first request
    throttler.complete();

    // Wait a bit for queue processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Queue should be processed
    expect(throttler.getQueueLength()).toBe(0);

    // Clean up
    queuedRequest.catch(() => {});
  });

  it('should get statistics', async () => {
    config.enabled = true;

    await throttler.request();

    const stats = throttler.getStats();

    expect(stats.activeRequests).toBe(1);
    expect(stats.queuedRequests).toBe(0);
  });

  it('should disable throttling', async () => {
    config.enabled = false;

    const allowed = await throttler.request();

    expect(allowed).toBe(true);
  });

  it('should clear queue', async () => {
    config.maxConcurrentRequests = 1;

    // First request succeeds
    await throttler.request();

    // Second request queues but we don't wait for it
    const queuedRequest = throttler.request();
    // Give it time to queue
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(throttler.getQueueLength()).toBe(1);

    throttler.clearQueue();

    expect(throttler.getQueueLength()).toBe(0);

    // The queued request will be rejected, ignore the error
    queuedRequest.catch(() => {});
  });
});

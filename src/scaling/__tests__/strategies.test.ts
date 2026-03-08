/**
 * Scaling Strategies Tests
 */

import { describe, it, expect } from '@jest/globals';
import { ReactiveScalingStrategy } from '../strategies/reactive.js';
import { PredictiveScalingStrategy } from '../strategies/predictive.js';
import { CostOptimizedScalingStrategy } from '../strategies/cost-optimized.js';
import type { ScalingPolicy, ResourceMetrics, TimeSeriesPoint } from '../types.js';
import { ScalingStrategy, ScalingActionType, ScalingDirection } from '../types.js';

describe('ReactiveScalingStrategy', () => {
  let strategy: ReactiveScalingStrategy;

  beforeEach(() => {
    strategy = new ReactiveScalingStrategy();
  });

  const createMockPolicy = (): ScalingPolicy => ({
    id: 'test-policy',
    name: 'Test Policy',
    description: 'Test',
    enabled: true,
    strategy: ScalingStrategy.REACTIVE,
    triggers: [
      {
        id: 'cpu-trigger',
        name: 'CPU Trigger',
        description: 'CPU > 80%',
        metric: 'cpu',
        condition: 'greater_than',
        threshold: 80,
        duration: 1000,
        cooldown: 5000,
      },
    ],
    actions: [
      {
        id: 'spawn-action',
        type: ScalingActionType.SPAWN_AGENTS,
        direction: ScalingDirection.UP,
        magnitude: 10,
        params: {},
        priority: 7,
        estimatedDuration: 30000,
        estimatedCost: 0.1,
      },
    ],
    constraints: {
      minAgents: 1,
      maxAgents: 100,
      minMemory: 1024,
      maxMemory: 10240,
      minKVCache: 512,
      maxKVCache: 5120,
      targetUtilization: 70,
    },
    maxScaleUp: 50,
    maxScaleDown: 0,
    cooldown: 60000,
  });

  const createMockMetrics = (cpuUsage: number): ResourceMetrics => ({
    cpu: { usage: cpuUsage, available: 100 - cpuUsage, total: 100 },
    memory: { usage: 50, used: 500, total: 1000, heapUsed: 250, heapTotal: 500 },
    network: { requestRate: 500, bandwidth: 1000000, connections: 10 },
    agents: { total: 10, active: 8, dormant: 2, spawning: 0, terminating: 0 },
    tasks: {
      queueDepth: 20,
      pending: 15,
      running: 8,
      completed: 100,
      failed: 5,
      averageLatency: 100,
    },
  });

  it('should return null when trigger not met', async () => {
    const policy = createMockPolicy();
    const metrics = createMockMetrics(50);
    const history: TimeSeriesPoint[][] = [[]];

    const decision = await strategy.evaluate(policy, metrics, history);

    expect(decision).toBeNull();
  });

  it('should create decision when trigger met', async () => {
    const policy = createMockPolicy();
    const metrics = createMockMetrics(85);

    // Create history showing CPU > 80% for required duration
    const now = Date.now();
    const history: TimeSeriesPoint[][] = [[
      { timestamp: now - 2000, value: 82 },
      { timestamp: now - 1000, value: 84 },
      { timestamp: now, value: 85 },
    ]];

    const decision = await strategy.evaluate(policy, metrics, history);

    expect(decision).not.toBeNull();
    expect(decision?.policyId).toBe('test-policy');
    expect(decision?.actions).toHaveLength(1);
    expect(decision?.confidence).toBeGreaterThan(0.5);
  });

  it('should calculate confidence based on threshold exceedance', async () => {
    const policy = createMockPolicy();
    const metrics = createMockMetrics(95); // Way above threshold

    const now = Date.now();
    const history: TimeSeriesPoint[][] = [[
      { timestamp: now - 2000, value: 90 },
      { timestamp: now - 1000, value: 92 },
      { timestamp: now, value: 95 },
    ]];

    const decision = await strategy.evaluate(policy, metrics, history);

    expect(decision).not.toBeNull();
    expect(decision?.confidence).toBeGreaterThan(0.6); // Adjusted threshold
  });
});

describe('PredictiveScalingStrategy', () => {
  let strategy: PredictiveScalingStrategy;

  beforeEach(() => {
    strategy = new PredictiveScalingStrategy();
  });

  const createMockMetrics = (): ResourceMetrics => ({
    cpu: { usage: 50, available: 50, total: 100 },
    memory: { usage: 50, used: 500, total: 1000, heapUsed: 250, heapTotal: 500 },
    network: { requestRate: 500, bandwidth: 1000000, connections: 10 },
    agents: { total: 10, active: 8, dormant: 2, spawning: 0, terminating: 0 },
    tasks: {
      queueDepth: 20,
      pending: 15,
      running: 8,
      completed: 100,
      failed: 5,
      averageLatency: 100,
    },
  });

  it('should return null with insufficient history', async () => {
    const metrics = createMockMetrics();
    const history: TimeSeriesPoint[][] = [[]];

    const prediction = await strategy.predict(metrics, history, 60000);

    expect(prediction).toBeNull();
  });

  it('should make prediction with sufficient history', async () => {
    const metrics = createMockMetrics();
    const now = Date.now();

    // Create 20 data points
    const cpuHistory: TimeSeriesPoint[] = [];
    for (let i = 0; i < 20; i++) {
      cpuHistory.push({
        timestamp: now - (20 - i) * 60000, // 1 minute intervals
        value: 50 + i * 2, // Increasing trend
      });
    }

    const history: TimeSeriesPoint[][] = [cpuHistory];

    const prediction = await strategy.predict(metrics, history, 60000);

    expect(prediction).not.toBeNull();
    expect(prediction?.predictionHorizon).toBe(60000);
    expect(prediction?.predictedMetrics).toBeDefined();
    expect(prediction?.confidence).toBeGreaterThan(0);
    expect(prediction?.model).toBe('trend+seasonality');
  });

  it('should detect increasing trend', async () => {
    const metrics = createMockMetrics();
    const now = Date.now();

    const cpuHistory: TimeSeriesPoint[] = [];
    for (let i = 0; i < 20; i++) {
      cpuHistory.push({
        timestamp: now - (20 - i) * 60000,
        value: 40 + i * 3, // Strong increasing trend
      });
    }

    const history: TimeSeriesPoint[][] = [cpuHistory];

    const prediction = await strategy.predict(metrics, history, 60000);

    expect(prediction).not.toBeNull();
    expect(prediction?.predictedMetrics.cpu.usage).toBeGreaterThan(50); // Should predict higher usage
  });
});

describe('CostOptimizedScalingStrategy', () => {
  let strategy: CostOptimizedScalingStrategy;

  beforeEach(() => {
    strategy = new CostOptimizedScalingStrategy({
      costPerAgentPerHour: 0.01,
      costPerGBMemoryPerHour: 0.005,
      costPerGBKVCachePerHour: 0.001,
      costPerNodePerHour: 0.5,
    });
  });

  const createMockPolicy = (): ScalingPolicy => ({
    id: 'cost-policy',
    name: 'Cost Optimized Policy',
    description: 'Cost-aware scaling',
    enabled: true,
    strategy: ScalingStrategy.COST_OPTIMIZED,
    triggers: [],
    actions: [
      {
        id: 'spawn-action',
        type: ScalingActionType.SPAWN_AGENTS,
        direction: ScalingDirection.UP,
        magnitude: 5,
        params: {},
        priority: 5,
        estimatedDuration: 30000,
        estimatedCost: 0.05,
      },
    ],
    constraints: {
      minAgents: 1,
      maxAgents: 100,
      minMemory: 1024,
      maxMemory: 10240,
      minKVCache: 512,
      maxKVCache: 5120,
      targetUtilization: 70,
      maxCostPerHour: 5,
    },
    maxScaleUp: 20,
    maxScaleDown: 10,
    cooldown: 600000,
  });

  const createMockMetrics = (cpuUsage: number, queueDepth: number): ResourceMetrics => ({
    cpu: { usage: cpuUsage, available: 100 - cpuUsage, total: 100 },
    memory: { usage: 50, used: 500, total: 1000, heapUsed: 250, heapTotal: 500 },
    network: { requestRate: 500, bandwidth: 1000000, connections: 10 },
    agents: { total: 10, active: 8, dormant: 2, spawning: 0, terminating: 0 },
    tasks: {
      queueDepth,
      pending: queueDepth - 5,
      running: 8,
      completed: 100,
      failed: 5,
      averageLatency: 100,
    },
  });

  it('should not scale when resources adequate', async () => {
    const policy = createMockPolicy();
    const metrics = createMockMetrics(50, 20);
    const history: TimeSeriesPoint[][] = [[]];

    const decision = await strategy.evaluate(policy, metrics, history);

    expect(decision).toBeNull();
  });

  it('should scale up when CPU is very high', async () => {
    const policy = createMockPolicy();
    const metrics = createMockMetrics(85, 20);
    const history: TimeSeriesPoint[][] = [[]];

    const decision = await strategy.evaluate(policy, metrics, history);

    expect(decision).not.toBeNull();
    expect(decision?.actions).toHaveLength(1);
    expect(decision?.actions[0].magnitude).toBe(5); // Conservative scaling
  });

  it('should not scale down when no despawn action configured', async () => {
    const policy = createMockPolicy();
    const metrics = createMockMetrics(20, 5); // Low CPU and queue
    const history: TimeSeriesPoint[][] = [[]];

    // The mock policy only has spawn action, not despawn
    // So decision should be null even if resources are underutilized
    const decision = await strategy.evaluate(policy, metrics, history);

    expect(decision).toBeNull();
  });

  it('should calculate average cost', () => {
    const avgCost = strategy.getAverageCost();

    expect(avgCost).toBe(0);
  });

  it('should get cost trend', () => {
    const trend = strategy.getCostTrend();

    expect(['increasing', 'decreasing', 'stable']).toContain(trend);
  });
});

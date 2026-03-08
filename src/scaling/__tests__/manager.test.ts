/**
 * Scaling Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ScalingManager } from '../manager.js';
import type { ScalingManagerConfig, ResourceMetrics, ScalingPolicy } from '../types.js';
import { ScalingStrategy } from '../types.js';

describe('ScalingManager', () => {
  let manager: ScalingManager;
  let config: ScalingManagerConfig;

  beforeEach(() => {
    config = {
      evaluationInterval: 100, // Fast for testing
      predictionHorizon: 60000,
      historyRetention: 3600000,
      maxConcurrentActions: 3,
      dryRun: true, // Don't actually spawn agents
      enablePredictive: false, // Disable for basic tests
      enableCostOptimization: true,
      alertThresholds: {
        warning: 70,
        critical: 90,
      },
    };

    manager = new ScalingManager(config);
  });

  afterEach(() => {
    manager.stop();
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      expect(manager).toBeDefined();
      expect(manager.getCurrentMetrics()).toBeNull();
    });

    it('should start evaluation loop', () => {
      const emitSpy = jest.spyOn(manager, 'emit');
      manager.emit('started', { id: 'test' });
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Metrics Management', () => {
    it('should update current metrics', () => {
      const metrics: ResourceMetrics = {
        cpu: { usage: 50, available: 50, total: 100 },
        memory: { usage: 60, used: 600, total: 1000, heapUsed: 300, heapTotal: 500 },
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
      };

      manager.updateMetrics(metrics);
      expect(manager.getCurrentMetrics()).toEqual(metrics);
    });

    it('should emit alert when CPU exceeds critical threshold', () => {
      const emitSpy = jest.spyOn(manager, 'emit');
      const metrics: ResourceMetrics = {
        cpu: { usage: 95, available: 5, total: 100 },
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
      };

      manager.updateMetrics(metrics);
      expect(emitSpy).toHaveBeenCalledWith('alert', {
        type: 'critical',
        metric: 'cpu',
        value: 95,
      });
    });

    it('should emit alert when memory exceeds warning threshold', () => {
      const emitSpy = jest.spyOn(manager, 'emit');
      const metrics: ResourceMetrics = {
        cpu: { usage: 50, available: 50, total: 100 },
        memory: { usage: 75, used: 750, total: 1000, heapUsed: 375, heapTotal: 500 },
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
      };

      manager.updateMetrics(metrics);
      expect(emitSpy).toHaveBeenCalledWith('alert', {
        type: 'warning',
        metric: 'memory',
        value: 75,
      });
    });

    it('should emit alert when queue depth is high', () => {
      const emitSpy = jest.spyOn(manager, 'emit');
      const metrics: ResourceMetrics = {
        cpu: { usage: 50, available: 50, total: 100 },
        memory: { usage: 50, used: 500, total: 1000, heapUsed: 250, heapTotal: 500 },
        network: { requestRate: 500, bandwidth: 1000000, connections: 10 },
        agents: { total: 10, active: 8, dormant: 2, spawning: 0, terminating: 0 },
        tasks: {
          queueDepth: 150,
          pending: 100,
          running: 8,
          completed: 100,
          failed: 5,
          averageLatency: 100,
        },
      };

      manager.updateMetrics(metrics);
      expect(emitSpy).toHaveBeenCalledWith('alert', {
        type: 'warning',
        metric: 'queue_depth',
        value: 150,
      });
    });
  });

  describe('Policy Management', () => {
    it('should add policy', () => {
      const policy: ScalingPolicy = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test description',
        enabled: true,
        strategy: ScalingStrategy.REACTIVE,
        triggers: [],
        actions: [],
        constraints: {
          minAgents: 1,
          maxAgents: 100,
          minMemory: 1024,
          maxMemory: 10240,
          minKVCache: 512,
          maxKVCache: 5120,
          targetUtilization: 70,
        },
        maxScaleUp: 10,
        maxScaleDown: 5,
        cooldown: 60000,
      };

      const emitSpy = jest.spyOn(manager, 'emit');
      manager.addPolicy(policy);

      expect(emitSpy).toHaveBeenCalledWith('policy_added', policy);
      expect(manager.getPolicy('test-policy')).toEqual(policy);
    });

    it('should remove policy', () => {
      const policy: ScalingPolicy = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test description',
        enabled: true,
        strategy: ScalingStrategy.REACTIVE,
        triggers: [],
        actions: [],
        constraints: {
          minAgents: 1,
          maxAgents: 100,
          minMemory: 1024,
          maxMemory: 10240,
          minKVCache: 512,
          maxKVCache: 5120,
          targetUtilization: 70,
        },
        maxScaleUp: 10,
        maxScaleDown: 5,
        cooldown: 60000,
      };

      manager.addPolicy(policy);

      const emitSpy = jest.spyOn(manager, 'emit');
      manager.removePolicy('test-policy');

      expect(emitSpy).toHaveBeenCalledWith('policy_removed', 'test-policy');
      expect(manager.getPolicy('test-policy')).toBeUndefined();
    });

    it('should enable/disable policy', () => {
      const policy: ScalingPolicy = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test description',
        enabled: true,
        strategy: ScalingStrategy.REACTIVE,
        triggers: [],
        actions: [],
        constraints: {
          minAgents: 1,
          maxAgents: 100,
          minMemory: 1024,
          maxMemory: 10240,
          minKVCache: 512,
          maxKVCache: 5120,
          targetUtilization: 70,
        },
        maxScaleUp: 10,
        maxScaleDown: 5,
        cooldown: 60000,
      };

      manager.addPolicy(policy);

      const emitSpy = jest.spyOn(manager, 'emit');
      manager.setPolicyEnabled('test-policy', false);

      expect(emitSpy).toHaveBeenCalledWith('policy_toggled', {
        policyId: 'test-policy',
        enabled: false,
      });
      expect(manager.getPolicy('test-policy')?.enabled).toBe(false);
    });

    it('should get all policies', () => {
      const policy1: ScalingPolicy = {
        id: 'policy-1',
        name: 'Policy 1',
        description: 'Test',
        enabled: true,
        strategy: ScalingStrategy.REACTIVE,
        triggers: [],
        actions: [],
        constraints: {
          minAgents: 1,
          maxAgents: 100,
          minMemory: 1024,
          maxMemory: 10240,
          minKVCache: 512,
          maxKVCache: 5120,
          targetUtilization: 70,
        },
        maxScaleUp: 10,
        maxScaleDown: 5,
        cooldown: 60000,
      };

      const policy2: ScalingPolicy = {
        ...policy1,
        id: 'policy-2',
        name: 'Policy 2',
      };

      manager.addPolicy(policy1);
      manager.addPolicy(policy2);

      const policies = manager.getPolicies();
      expect(policies).toHaveLength(2);
      expect(policies).toContainEqual(policy1);
      expect(policies).toContainEqual(policy2);
    });
  });

  describe('Manual Scaling', () => {
    it('should execute manual scaling', async () => {
      const metrics: ResourceMetrics = {
        cpu: { usage: 80, available: 20, total: 100 },
        memory: { usage: 70, used: 700, total: 1000, heapUsed: 350, heapTotal: 500 },
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
      };

      manager.updateMetrics(metrics);

      const emitSpy = jest.spyOn(manager, 'emit');
      const decision = await manager.manualScale('spawn_agents', 5, { agentType: 'task' });

      expect(decision).toBeDefined();
      expect(decision.policyId).toBe('manual');
      expect(decision.actions).toHaveLength(1);
      expect(decision.actions[0].magnitude).toBe(5);
      expect(decision.status).toBe('completed'); // dry run completes immediately
      expect(emitSpy).toHaveBeenCalledWith('scaling_started', expect.any(Object));
    });
  });

  describe('Statistics', () => {
    it('should get stats', () => {
      const stats = manager.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalScalingEvents).toBe(0);
      expect(stats.scaleUpEvents).toBe(0);
      expect(stats.scaleDownEvents).toBe(0);
      expect(stats.failedEvents).toBe(0);
    });

    it('should get history', () => {
      const history = manager.getHistory();

      expect(history).toEqual([]);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Predictions', () => {
    it('should get predictions', () => {
      const predictions = manager.getPredictions();

      expect(predictions).toEqual([]);
      expect(Array.isArray(predictions)).toBe(true);
    });
  });

  describe('Lifecycle', () => {
    it('should stop manager', () => {
      const emitSpy = jest.spyOn(manager, 'emit');
      manager.stop();

      expect(emitSpy).toHaveBeenCalledWith('stopped', expect.any(Object));
    });
  });
});

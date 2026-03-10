/**
 * Colony Testing Examples - Demonstrates ColonyTestHelper usage
 *
 * Run with: npm test colony.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ColonyTestHelper, AssertionHelpers } from '../../src/spreadsheet/testing';
import { PollnColony } from '../../src/core/Colony';
import { ColonyState } from '../../src/core/types';

describe('Colony Testing Examples', () => {
  afterEach(() => {
    ColonyTestHelper.cleanup();
  });

  describe('Basic Colony Creation', () => {
    it('should create a test colony with minimal config', () => {
      const colony = ColonyTestHelper.createTestColony({
        testId: 'test-colony-1'
      });

      expect(colony).toBeDefined();
      expect(colony.id).toBe('test-colony-1');
    });

    it('should create colony with mock agents', () => {
      const colony = ColonyTestHelper.createTestColony({
        mockAgents: [
          { id: 'agent-1', type: 'test', config: {}, capabilities: ['test'] },
          { id: 'agent-2', type: 'test', config: {}, capabilities: ['test'] }
        ]
      });

      expect(colony.getAgentCount()).toBe(2);
    });

    it('should create colony from cells', () => {
      const { CellTestHelper } = require('../../src/spreadsheet/testing');
      const cells = CellTestHelper.createTestCells(5);

      const colony = ColonyTestHelper.createColonyWithCells(cells);

      expect(colony.getAgentCount()).toBe(5);
    });

    it('should auto-start colony if configured', () => {
      const colony = ColonyTestHelper.createTestColony({
        simulation: { autoStart: true }
      });

      expect(colony.getState()).toBe(ColonyState.RUNNING);

      colony.stop();
    });
  });

  describe('Colony State Inspection', () => {
    it('should capture colony snapshots', () => {
      const colony = ColonyTestHelper.createTestColony();
      const snapshot = ColonyTestHelper.captureSnapshot(colony);

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBe(colony.id);
      expect(snapshot.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should track agent count in snapshots', () => {
      const colony = ColonyTestHelper.createTestColony({
        mockAgents: Array.from({ length: 10 }, (_, i) => ({
          id: `agent-${i}`,
          type: 'test',
          config: {},
          capabilities: ['test']
        }))
      });

      const snapshot = ColonyTestHelper.captureSnapshot(colony);

      expect(snapshot.agentCount).toBe(10);
    });
  });

  describe('Colony Simulation', () => {
    it('should simulate colony execution', async () => {
      const colony = ColonyTestHelper.createTestColony();

      const result = await ColonyTestHelper.simulateExecution(
        colony,
        1000 // 1 second
      );

      expect(result.passed).toBe(true);
      expect(result.performance.ticksProcessed).toBeGreaterThan(0);
    });

    it('should simulate with custom tick rate', async () => {
      const colony = ColonyTestHelper.createTestColony();

      const result = await ColonyTestHelper.simulateExecution(
        colony,
        500,
        { tickRate: 50 }
      );

      expect(result.performance.ticksProcessed).toBeGreaterThan(5);
    });

    it('should track performance metrics', async () => {
      const colony = ColonyTestHelper.createTestColony();

      const result = await ColonyTestHelper.simulateExecution(colony, 1000);

      expect(result.performance.averageTickTime).toBeGreaterThan(0);
      expect(result.performance.peakMemoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Agent Deployment', () => {
    it('should deploy test agent', () => {
      const colony = ColonyTestHelper.createTestColony();

      const agentId = ColonyTestHelper.deployTestAgent(colony, {
        type: 'test-agent'
      });

      expect(agentId).toMatch(/^test-agent-/);
      expect(colony.getAgent(agentId)).toBeDefined();
    });

    it('should deploy multiple test agents', () => {
      const colony = ColonyTestHelper.createTestColony();

      const agentIds = ColonyTestHelper.deployTestAgents(colony, 5, {
        type: 'batch-agent'
      });

      expect(agentIds).toHaveLength(5);
      expect(colony.getAgentCount()).toBe(5);
    });

    it('should deploy agents with custom config', () => {
      const colony = ColonyTestHelper.createTestColony();

      const agentId = ColonyTestHelper.deployTestAgent(colony, {
        type: 'custom-agent',
        capabilities: ['process', 'learn', 'evolve']
      });

      const agent = colony.getAgent(agentId);
      expect(agent?.config.type).toBe('custom-agent');
    });
  });

  describe('Colony Assertions', () => {
    it('should assert colony state', () => {
      const colony = ColonyTestHelper.createTestColony();

      AssertionHelpers.assertColonyState(colony, ColonyState.IDLE);
    });

    it('should assert agent count', () => {
      const colony = ColonyTestHelper.createTestColony({
        mockAgents: [
          { id: 'agent-1', type: 'test', config: {}, capabilities: ['test'] },
          { id: 'agent-2', type: 'test', config: {}, capabilities: ['test'] }
        ]
      });

      AssertionHelpers.assertColonyAgentCount(colony, 2);
    });

    it('should assert colony has specific agent', () => {
      const colony = ColonyTestHelper.createTestColony({
        mockAgents: [
          { id: 'special-agent', type: 'test', config: {}, capabilities: ['test'] }
        ]
      });

      AssertionHelpers.assertColonyHasAgent(colony, 'special-agent');
    });
  });

  describe('Performance Measurement', () => {
    it('should measure tick performance', async () => {
      const colony = ColonyTestHelper.createTestColony();

      const metrics = await ColonyTestHelper.measurePerformance(
        colony,
        'tick',
        50
      );

      expect(metrics.totalTime).toBeGreaterThan(0);
      expect(metrics.averageTime).toBeGreaterThan(0);
      expect(metrics.operationsPerSecond).toBeGreaterThan(0);
    });

    it('should measure deploy performance', async () => {
      const colony = ColonyTestHelper.createTestColony();

      const metrics = await ColonyTestHelper.measurePerformance(
        colony,
        'deploy',
        20
      );

      expect(metrics.totalTime).toBeGreaterThan(0);
      expect(metrics.operationsPerSecond).toBeGreaterThan(0);
    });

    it('should provide min/max timing', async () => {
      const colony = ColonyTestHelper.createTestColony();

      const metrics = await ColonyTestHelper.measurePerformance(
        colony,
        'tick',
        50
      );

      expect(metrics.minTime).toBeLessThanOrEqual(metrics.maxTime);
      expect(metrics.minTime).toBeGreaterThan(0);
    });
  });

  describe('Stress Testing', () => {
    it('should handle agent deployment stress', async () => {
      const colony = ColonyTestHelper.createTestColony();

      const result = await ColonyTestHelper.stressTest(colony, {
        agentCount: 50,
        duration: 2000
      });

      expect(result.success).toBe(true);
      expect(result.maxAgentsReached).toBe(50);
    });

    it('should handle operation rate stress', async () => {
      const colony = ColonyTestHelper.createTestColony();

      const result = await ColonyTestHelper.stressTest(colony, {
        agentCount: 20,
        duration: 1000,
        operationRate: 50
      });

      expect(result.averageResponseTime).toBeGreaterThan(0);
      expect(result.operationsCompleted).toBeGreaterThan(0);
    });

    it('should track errors during stress test', async () => {
      const colony = ColonyTestHelper.createTestColony();

      const result = await ColonyTestHelper.stressTest(colony, {
        agentCount: 100,
        duration: 1000
      });

      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Advanced Usage', () => {
    it('should wait for colony state', async () => {
      const colony = ColonyTestHelper.createTestColony();

      colony.start();

      await expect(
        ColonyTestHelper.waitForState(colony, ColonyState.RUNNING, 1000)
      ).resolves.toBeUndefined();

      colony.stop();
    });

    it('should assert state transitions', () => {
      const colony = ColonyTestHelper.createTestColony();
      ColonyTestHelper.captureSnapshot(colony);

      colony.start();
      ColonyTestHelper.captureSnapshot(colony);
      colony.stop();
      ColonyTestHelper.captureSnapshot(colony);

      const result = ColonyTestHelper.assertStateTransition(colony.id, [
        ColonyState.IDLE,
        ColonyState.RUNNING,
        ColonyState.IDLE
      ]);

      expect(result.passed).toBe(true);
    });

    it('should get test results', async () => {
      const colony = ColonyTestHelper.createTestColony();
      await ColonyTestHelper.simulateExecution(colony, 500);

      const result = ColonyTestHelper.getTestResult(colony.id);
      expect(result).toBeDefined();
      expect(result?.colonyId).toBe(colony.id);
    });

    it('should track multiple colonies', async () => {
      const colony1 = ColonyTestHelper.createTestColony();
      const colony2 = ColonyTestHelper.createTestColony();

      await ColonyTestHelper.simulateExecution(colony1, 500);
      await ColonyTestHelper.simulateExecution(colony2, 500);

      const results = ColonyTestHelper.getAllTestResults();
      expect(results.size).toBe(2);
    });
  });
});

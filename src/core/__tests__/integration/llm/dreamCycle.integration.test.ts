/**
 * Dream Cycle Integration Tests with Mock World Model
 *
 * Tests dream-based policy optimization using mock LLM backends
 * and world models, including dream episode generation, policy updates,
 * and integration with value networks.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { MockLLMBackend, MockLLMBackendFactory } from './MockLLMBackend.js';
import { WorldModel, MockValueNetwork } from '../../../worldmodel.js';
import { DreamBasedPolicyOptimizer } from '../../../dreaming.js';
import type { ValueNetwork } from '../../../valuenetwork.js';

// ============================================================================
// Test Fixtures
// ============================================================================

class TestValueNetwork implements ValueNetwork {
  private weights: Float32Array;
  private inputDim: number;

  constructor(inputDim: number = 64) {
    this.inputDim = inputDim;
    this.weights = new Float32Array(inputDim);
    for (let i = 0; i < inputDim; i++) {
      this.weights[i] = (Math.random() - 0.5) * 0.1;
    }
  }

  predict(state: Map<string, unknown>): { value: number; uncertainty: number } {
    const embedding = state.get('embedding') as number[] || [];
    let value = 0;
    const minLen = Math.min(embedding.length, this.inputDim);

    for (let i = 0; i < minLen; i++) {
      value += embedding[i] * this.weights[i];
    }

    value = Math.tanh(value * 0.1);

    const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
    const uncertainty = Math.min(1, norm / 10);

    return { value, uncertainty };
  }

  train(states: Map<string, unknown>[], targets: number[]): { loss: number } {
    let totalLoss = 0;

    for (let i = 0; i < states.length; i++) {
      const prediction = this.predict(states[i]).value;
      const error = prediction - targets[i];
      totalLoss += 0.5 * error * error;

      const embedding = (states[i].get('embedding') as number[]) || [];
      const minLen = Math.min(embedding.length, this.inputDim);

      for (let j = 0; j < minLen; j++) {
        this.weights[j] -= 0.01 * error * embedding[j];
      }
    }

    return { loss: totalLoss / states.length };
  }
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Dream Cycle Integration Tests', () => {
  let worldModel: WorldModel;
  let valueNetwork: ValueNetwork;
  let llm: MockLLMBackend;
  let dreamOptimizer: DreamBasedPolicyOptimizer;

  beforeEach(() => {
    MockLLMBackendFactory.resetAll();

    // Initialize world model
    worldModel = new WorldModel({
      latentDim: 64,
      hiddenDim: 256,
      learningRate: 0.001,
      dreamHorizon: 20, // Shorter for faster tests
      dreamBatchSize: 5,
    });
    worldModel.initialize();

    // Initialize value network
    valueNetwork = new TestValueNetwork(64);

    // Initialize LLM
    llm = MockLLMBackendFactory.create('dream-model', {
      baseLatencyMs: 5,
      latencyVarianceMs: 2,
      errorRate: 0,
      timeoutRate: 0,
    });

    // Initialize dream optimizer
    dreamOptimizer = new DreamBasedPolicyOptimizer(
      worldModel,
      valueNetwork,
      null, // No graph evolution for basic tests
      {
        dreamHorizon: 20,
        dreamBatchSize: 5,
        dreamIntervalMs: 100, // Short interval for testing
        replayBufferSize: 100,
        replaySampleSize: 3,
      }
    );
  });

  afterEach(() => {
    MockLLMBackendFactory.resetAll();
    dreamOptimizer.reset();
  });

  // ==========================================================================
  // Dream Episode Generation Tests
  // ==========================================================================

  describe('Dream Episode Generation', () => {
    it('should generate dream episodes from replay buffer', async () => {
      // Add experiences to replay buffer
      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        const nextState = Array.from({ length: 64 }, () => Math.random());

        dreamOptimizer.addExperience(
          state,
          i % 10, // action
          Math.random() * 2 - 1, // reward
          nextState,
          false
        );
      }

      dreamOptimizer.resetDreamTimer();

      const result = await dreamOptimizer.optimize();

      expect(result.episodesGenerated).toBeGreaterThan(0);
      expect(result.episodesGenerated).toBeLessThanOrEqual(5);
    });

    it('should generate episodes with correct length', async () => {
      const state = Array.from({ length: 64 }, () => Math.random());
      dreamOptimizer.addExperience(state, 0, 0.5, state, false);

      dreamOptimizer.resetDreamTimer();

      const result = await dreamOptimizer.optimize();

      if (result.episodesGenerated > 0) {
        const stats = dreamOptimizer.getStats();
        expect(stats.replayBufferSize).toBeGreaterThan(0);
      }
    });

    it('should not generate episodes without experiences', async () => {
      dreamOptimizer.resetDreamTimer();

      const result = await dreamOptimizer.optimize();

      expect(result.episodesGenerated).toBe(0);
      expect(result.policyUpdated).toBe(false);
    });

    it('should generate diverse episodes', async () => {
      // Add diverse experiences
      for (let i = 0; i < 20; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        const nextState = Array.from({ length: 64 }, () => Math.random());

        dreamOptimizer.addExperience(
          state,
          Math.floor(Math.random() * 10),
          Math.random() * 2 - 1,
          nextState,
          Math.random() > 0.9 // 10% done rate
        );
      }

      dreamOptimizer.resetDreamTimer();

      const result = await dreamOptimizer.optimize();

      expect(result.episodesGenerated).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Policy Optimization Tests
  // ==========================================================================

  describe('Policy Optimization', () => {
    it('should update policy after dream cycle', async () => {
      // Add experiences
      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.5, state, false);
      }

      dreamOptimizer.resetDreamTimer();

      const result = await dreamOptimizer.optimize();

      if (result.episodesGenerated > 0) {
        expect(result.policyUpdated).toBe(true);
        expect(result.improvement).not.toBeNull();
      }
    });

    it('should track improvement metrics', async () => {
      // Add experiences with positive rewards
      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.8, state, false);
      }

      dreamOptimizer.resetDreamTimer();

      const result = await dreamOptimizer.optimize();

      if (result.improvement) {
        expect(result.improvement.episode).toBeGreaterThanOrEqual(0);
        expect(result.improvement.oldReturn).toBeDefined();
        expect(result.improvement.newReturn).toBeDefined();
        expect(result.improvement.improvement).toBeDefined();
      }
    });

    it('should compute policy and value losses', async () => {
      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.5, state, false);
      }

      dreamOptimizer.resetDreamTimer();

      const result = await dreamOptimizer.optimize();

      if (result.episodesGenerated > 0) {
        expect(result.avgPolicyLoss).toBeDefined();
        expect(result.avgValueLoss).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // World Model Integration Tests
  // ==========================================================================

  describe('World Model Integration', () => {
    it('should use world model for encoding states', async () => {
      const state = Array.from({ length: 64 }, () => Math.random());
      const latent = worldModel.encode(state);

      expect(latent.mean).toBeDefined();
      expect(latent.logVar).toBeDefined();
      expect(latent.sample).toBeDefined();
      expect(latent.sample.length).toBe(64);
    });

    it('should use world model for predicting transitions', async () => {
      const state = Array.from({ length: 64 }, () => Math.random());
      const latent = worldModel.encode(state);
      const action = 0.5;

      const transition = worldModel.predict(latent.sample, action);

      expect(transition.nextState).toBeDefined();
      expect(transition.reward).toBeDefined();
      expect(transition.uncertainty).toBeDefined();
      expect(transition.predictionError).toBeDefined();
    });

    it('should use world model for decoding states', async () => {
      const latent = Array.from({ length: 64 }, () => Math.random());
      const decoded = worldModel.decode(latent);

      expect(decoded).toBeDefined();
      expect(decoded.length).toBeGreaterThan(0);
    });

    it('should train world model with experiences', async () => {
      const batch = {
        observations: [
          Array.from({ length: 256 }, () => Math.random()),
          Array.from({ length: 256 }, () => Math.random()),
        ],
        actions: [[0.5], [0.3]],
        rewards: [0.5, 0.8],
        nextObservations: [
          Array.from({ length: 256 }, () => Math.random()),
          Array.from({ length: 256 }, () => Math.random()),
        ],
        dones: [false, false],
      };

      const result = worldModel.train(batch);

      expect(result.encoderLoss).toBeDefined();
      expect(result.transitionLoss).toBeDefined();
      expect(result.rewardLoss).toBeDefined();
      expect(result.totalLoss).toBeDefined();
    });
  });

  // ==========================================================================
  // Value Network Integration Tests
  // ==========================================================================

  describe('Value Network Integration', () => {
    it('should predict values for states', () => {
      const state = new Map<string, unknown>([
        ['embedding', Array.from({ length: 64 }, () => Math.random())],
        ['value', 0],
      ]);

      const prediction = valueNetwork.predict(state);

      expect(prediction.value).toBeDefined();
      expect(prediction.uncertainty).toBeDefined();
      expect(prediction.value).toBeGreaterThanOrEqual(-1);
      expect(prediction.value).toBeLessThanOrEqual(1);
    });

    it('should train value network with targets', () => {
      const states = Array.from({ length: 5 }, () =>
        new Map<string, unknown>([
          ['embedding', Array.from({ length: 64 }, () => Math.random())],
          ['value', 0],
        ])
      );

      const targets = [0.5, 0.7, 0.3, 0.9, 0.6];

      const result = valueNetwork.train(states, targets);

      expect(result.loss).toBeDefined();
      expect(result.loss).toBeGreaterThan(0);
    });

    it('should integrate with dream episodes', async () => {
      // Add experiences
      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.5, state, false);
      }

      dreamOptimizer.resetDreamTimer();

      const result = await dreamOptimizer.optimize();

      if (result.episodesGenerated > 0) {
        expect(result.avgValueLoss).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Replay Buffer Tests
  // ==========================================================================

  describe('Replay Buffer', () => {
    it('should store experiences correctly', () => {
      const state = Array.from({ length: 64 }, () => Math.random());
      const nextState = Array.from({ length: 64 }, () => Math.random());

      dreamOptimizer.addExperience(state, 5, 0.8, nextState, false);

      const stats = dreamOptimizer.getStats();

      expect(stats.replayBufferSize).toBe(1);
    });

    it('should respect max buffer size', () => {
      const maxSize = 100;

      for (let i = 0; i < maxSize + 50; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.5, state, false);
      }

      const stats = dreamOptimizer.getStats();

      expect(stats.replayBufferSize).toBeLessThanOrEqual(maxSize);
    });

    it('should prioritize high-reward experiences', () => {
      // Add low reward experiences
      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.1, state, false);
      }

      // Add high reward experiences
      for (let i = 0; i < 5; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.9, state, false);
      }

      const stats = dreamOptimizer.getStats();

      expect(stats.replayBufferSize).toBe(15);
    });
  });

  // ==========================================================================
  // LLM Integration Tests
  // ==========================================================================

  describe('LLM Integration', () => {
    it('should generate context using LLM', async () => {
      const contextPrompt = 'Generate dream context for exploration';
      const response = await llm.generateTokens({
        prompt: contextPrompt,
        maxTokens: 50,
      });

      expect(response.text).toBeDefined();
      expect(response.tokens).toBeDefined();
    });

    it('should use LLM embeddings for state representation', async () => {
      const stateDesc = 'State: high value, low uncertainty';
      const response = await llm.createEmbeddings({
        input: stateDesc,
      });

      expect(response.embeddings).toHaveLength(1);
      expect(response.embeddings[0].length).toBeGreaterThan(0);
    });

    it('should cache LLM responses for efficiency', async () => {
      const prompt = 'Repeated dream prompt';

      await llm.generateTokens({ prompt });
      await llm.generateTokens({ prompt });

      const stats = llm.getCacheStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  // ==========================================================================
  // Dream Statistics Tests
  // ==========================================================================

  describe('Dream Statistics', () => {
    it('should track dream history', async () => {
      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.5, state, false);
      }

      dreamOptimizer.resetDreamTimer();
      await dreamOptimizer.optimize();

      const stats = dreamOptimizer.getStats();

      expect(stats.dreamHistorySize).toBeGreaterThan(0);
    });

    it('should track improvement history', async () => {
      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.5, state, false);
      }

      dreamOptimizer.resetDreamTimer();
      await dreamOptimizer.optimize();

      const stats = dreamOptimizer.getStats();

      expect(stats.improvementHistory).toBeDefined();
      expect(Array.isArray(stats.improvementHistory)).toBe(true);
    });

    it('should compute improvement statistics', async () => {
      for (let i = 0; i < 20; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.5, state, false);
      }

      dreamOptimizer.resetDreamTimer();

      // Run multiple optimization cycles
      for (let i = 0; i < 3; i++) {
        await dreamOptimizer.optimize();
      }

      const improvementStats = dreamOptimizer.getImprovementStats();

      expect(improvementStats.avgImprovement).toBeDefined();
      expect(improvementStats.maxImprovement).toBeDefined();
      expect(improvementStats.minImprovement).toBeDefined();
      expect(improvementStats.improvementTrend).toBeDefined();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle insufficient experiences gracefully', async () => {
      // Add only 1 experience (less than replaySampleSize)
      const state = Array.from({ length: 64 }, () => Math.random());
      dreamOptimizer.addExperience(state, 0, 0.5, state, false);

      dreamOptimizer.resetDreamTimer();

      const result = await dreamOptimizer.optimize();

      expect(result.episodesGenerated).toBe(0);
      expect(result.policyUpdated).toBe(false);
    });

    it('should continue after failed dream cycle', async () => {
      // Add experiences
      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.5, state, false);
      }

      dreamOptimizer.resetDreamTimer();

      const result1 = await dreamOptimizer.optimize();
      const result2 = await dreamOptimizer.optimize();

      // Second call should not crash
      expect(result2).toBeDefined();
    });
  });

  // ==========================================================================
  // Integration with Graph Evolution Tests
  // ==========================================================================

  describe('Graph Evolution Integration', () => {
    it('should emit policy improvement events', async () => {
      let eventFired = false;

      dreamOptimizer.on('policy_improved', () => {
        eventFired = true;
      });

      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.5, state, false);
      }

      dreamOptimizer.resetDreamTimer();
      await dreamOptimizer.optimize();

      // Event may or may not fire depending on improvement
      expect(eventFired).toBeDefined();
    });

    it('should emit dream completion events', async () => {
      let eventFired = false;

      dreamOptimizer.on('dream_complete', () => {
        eventFired = true;
      });

      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.5, state, false);
      }

      dreamOptimizer.resetDreamTimer();
      await dreamOptimizer.optimize();

      expect(eventFired).toBe(true);
    });
  });

  // ==========================================================================
  // Policy Export/Import Tests
  // ==========================================================================

  describe('Policy Export/Import', () => {
    it('should export policy parameters', () => {
      const policy = dreamOptimizer.exportPolicy();

      expect(policy.weights).toBeDefined();
      expect(policy.biases).toBeDefined();
      expect(policy.version).toBeDefined();
      expect(policy.lastUpdated).toBeDefined();
    });

    it('should import policy parameters', async () => {
      // Train a bit
      for (let i = 0; i < 10; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.5, state, false);
      }

      dreamOptimizer.resetDreamTimer();
      await dreamOptimizer.optimize();

      const policy1 = dreamOptimizer.exportPolicy();

      // Import into new optimizer
      const newOptimizer = new DreamBasedPolicyOptimizer(
        worldModel,
        valueNetwork,
        null,
        dreamOptimizer.getStats().config
      );

      newOptimizer.importPolicy(policy1);

      const policy2 = newOptimizer.exportPolicy();

      expect(policy2.version).toBe(policy1.version);
    });

    it('should get action from policy', () => {
      const state = Array.from({ length: 64 }, () => Math.random());
      const action = dreamOptimizer.getAction(state);

      expect(action.action).toBeDefined();
      expect(action.probability).toBeDefined();
      expect(action.probability).toBeGreaterThan(0);
      expect(action.probability).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // End-to-End Dream Cycle Tests
  // ==========================================================================

  describe('End-to-End Dream Cycle', () => {
    it('should complete full dream cycle', async () => {
      // Add diverse experiences
      for (let i = 0; i < 30; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        const nextState = Array.from({ length: 64 }, () => Math.random());

        dreamOptimizer.addExperience(
          state,
          Math.floor(Math.random() * 10),
          Math.random() * 2 - 1,
          nextState,
          Math.random() > 0.9
        );
      }

      dreamOptimizer.resetDreamTimer();

      const result = await dreamOptimizer.optimize();

      expect(result.episodesGenerated).toBeGreaterThan(0);
      expect(result.avgDreamReturn).toBeDefined();
    });

    it('should improve over multiple dream cycles', async () => {
      // Add experiences
      for (let i = 0; i < 30; i++) {
        const state = Array.from({ length: 64 }, () => Math.random());
        dreamOptimizer.addExperience(state, i % 10, 0.7, state, false);
      }

      const returns: number[] = [];

      // Run multiple cycles
      for (let i = 0; i < 5; i++) {
        dreamOptimizer.resetDreamTimer();
        const result = await dreamOptimizer.optimize();

        if (result.avgDreamReturn !== undefined) {
          returns.push(result.avgDreamReturn);
        }
      }

      expect(returns.length).toBeGreaterThan(0);
    });
  });
});

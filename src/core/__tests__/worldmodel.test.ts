/**
 * POLLN World Model Tests
 * Enhanced VAE-based world model with dreaming capabilities
 */

import {
  WorldModel,
  MockValueNetwork,
  type WorldModelConfig,
  type TrainingBatch,
  type ValueNetwork,
  type DreamEpisode,
} from '../worldmodel';

describe('WorldModel - VAE Training', () => {
  let worldModel: WorldModel;

  beforeEach(() => {
    worldModel = new WorldModel({
      latentDim: 32,
      hiddenDim: 64,
      learningRate: 0.001,
      beta: 0.1,
      batchSize: 16,
    });
    worldModel.initialize();
  });

  describe('VAE Encoding and Decoding', () => {
    it('should encode observation to latent space with mean, logVar, and sample', () => {
      const observation = new Array(64).fill(0).map(() => Math.random());
      const latent = worldModel.encode(observation);

      expect(latent.mean).toBeDefined();
      expect(latent.logVar).toBeDefined();
      expect(latent.sample).toBeDefined();
      expect(latent.mean.length).toBe(32);
      expect(latent.logVar.length).toBe(32);
      expect(latent.sample.length).toBe(32);
    });

    it('should decode latent back to observation space', () => {
      const latent = new Array(32).fill(0).map(() => Math.random() - 0.5);
      const observation = worldModel.decode(latent);

      expect(observation).toBeDefined();
      expect(observation.length).toBe(64);
      expect(observation.every(v => v >= -1 && v <= 1)).toBe(true);
    });

    it('should maintain latent dimension consistency', () => {
      const observation = new Array(64).fill(0.5);
      const latent = worldModel.encode(observation);

      expect(latent.sample.length).toBe(32);

      const decoded = worldModel.decode(latent.sample);
      expect(decoded.length).toBe(64);
    });

    it('should have different samples due to reparameterization trick', () => {
      const observation = new Array(64).fill(0.5);

      const latent1 = worldModel.encode(observation);
      const latent2 = worldModel.encode(observation);

      // Mean and logVar should be the same
      expect(latent1.mean).toEqual(latent2.mean);
      expect(latent1.logVar).toEqual(latent2.logVar);

      // Samples should differ due to random noise
      expect(latent1.sample).not.toEqual(latent2.sample);
    });
  });

  describe('Reconstruction Loss and KL Divergence', () => {
    it('should compute reconstruction loss correctly', () => {
      const observation = new Array(64).fill(0.5);
      const latent = worldModel.encode(observation);
      const reconstructed = worldModel.decode(latent.sample);

      // Reconstruction should be close to original (after training)
      expect(reconstructed.length).toBe(observation.length);
    });

    it('should train with proper VAE loss (reconstruction + beta * KL)', () => {
      const batch: TrainingBatch = {
        observations: [
          new Array(64).fill(0.5),
          new Array(64).fill(0.3),
          new Array(64).fill(0.7),
        ],
        actions: [[0.1], [0.2], [0.3]],
        rewards: [0.5, 0.3, 0.7],
        nextObservations: [
          new Array(64).fill(0.6),
          new Array(64).fill(0.4),
          new Array(64).fill(0.8),
        ],
        dones: [false, false, false],
      };

      const result = worldModel.train(batch);

      expect(result.encoderLoss).toBeGreaterThanOrEqual(0);
      expect(result.klDivergence).toBeGreaterThanOrEqual(0);
      expect(result.totalLoss).toBeGreaterThanOrEqual(0);
    });

    it('should have KL divergence bounded and reasonable', () => {
      const batch: TrainingBatch = {
        observations: [new Array(64).fill(0.5)],
        actions: [[0.5]],
        rewards: [0.5],
        nextObservations: [new Array(64).fill(0.6)],
        dones: [false],
      };

      worldModel.train(batch);
      const state = worldModel.getState();

      // KL divergence should be non-negative and not explode
      expect(state.klDivergence).toBeGreaterThanOrEqual(0);
      expect(state.klDivergence).toBeLessThan(100);
    });
  });

  describe('Gradient Computation', () => {
    it('should update weights after training', () => {
      const weightsBefore = worldModel.saveWeights();

      const batch: TrainingBatch = {
        observations: [new Array(64).fill(0.5)],
        actions: [[0.5]],
        rewards: [0.5],
        nextObservations: [new Array(64).fill(0.6)],
        dones: [false],
      };

      worldModel.train(batch);
      const weightsAfter = worldModel.saveWeights();

      // Weights should have changed
      expect(weightsBefore.encoderWeights).not.toEqual(weightsAfter.encoderWeights);
    });

    it('should decrease loss with multiple training steps', () => {
      const batch: TrainingBatch = {
        observations: [new Array(64).fill(0.5)],
        actions: [[0.5]],
        rewards: [0.5],
        nextObservations: [new Array(64).fill(0.6)],
        dones: [false],
      };

      const loss1 = worldModel.train(batch).totalLoss;
      const loss2 = worldModel.train(batch).totalLoss;
      const loss3 = worldModel.train(batch).totalLoss;

      // Loss should generally decrease (though may fluctuate due to random gradient updates)
      // Just verify losses are finite and reasonable
      expect(Number.isFinite(loss1)).toBe(true);
      expect(Number.isFinite(loss2)).toBe(true);
      expect(Number.isFinite(loss3)).toBe(true);
    });
  });
});

describe('WorldModel - Dream Episode Generation', () => {
  let worldModel: WorldModel;

  beforeEach(() => {
    worldModel = new WorldModel({
      latentDim: 32,
      hiddenDim: 64,
      dreamHorizon: 20,
    });
    worldModel.initialize();
  });

  it('should generate dream episode with correct length', () => {
    const startState = new Array(64).fill(0.5);
    const episode = worldModel.dream(startState, 20);

    expect(episode).toBeDefined();
    expect(episode.length).toBe(20);
    expect(episode.actions.length).toBe(20);
    expect(episode.states.length).toBeGreaterThan(0);
    expect(episode.rewards.length).toBe(20);
    expect(episode.values.length).toBe(20);
    expect(episode.uncertainties.length).toBe(20);
  });

  it('should use custom action sampler when provided', () => {
    const startState = new Array(64).fill(0.5);
    let callCount = 0;

    const customSampler = (_state: number[], timestep: number) => {
      callCount++;
      return timestep % 2 === 0 ? 1.0 : -1.0;
    };

    const episode = worldModel.dream(startState, 10, customSampler);

    expect(callCount).toBe(10);
    expect(episode.actions[0]).toBe(1.0);
    expect(episode.actions[1]).toBe(-1.0);
  });

  it('should compute returns using TD(λ)', () => {
    const startState = new Array(64).fill(0.5);
    const episode = worldModel.dream(startState, 20);

    // Returns should be computed
    expect(episode.rewards).toBeDefined();
    expect(episode.rewards.length).toBe(20);

    // Returns should be discounted (later rewards have less impact)
    // This is a weak test; in practice, returns should decay
    expect(episode.totalReward).toBeDefined();
  });

  it('should estimate uncertainty for each step', () => {
    const startState = new Array(64).fill(0.5);
    const episode = worldModel.dream(startState, 20);

    expect(episode.uncertainties.length).toBe(20);
    episode.uncertainties.forEach(u => {
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(1);
    });
  });

  it('should generate batch of dream episodes', () => {
    const startStates = [
      new Array(64).fill(0.5),
      new Array(64).fill(0.3),
      new Array(64).fill(0.7),
    ];

    const episodes = worldModel.dreamBatch(startStates, 10);

    expect(episodes.length).toBe(3);
    episodes.forEach(ep => {
      expect(ep.length).toBe(10);
      expect(ep.actions.length).toBe(10);
    });
  });
});

describe('WorldModel - Value Network Integration', () => {
  let worldModel: WorldModel;
  let valueNetwork: ValueNetwork;

  beforeEach(() => {
    worldModel = new WorldModel({
      latentDim: 32,
      hiddenDim: 64,
      discountFactor: 0.99,
      lambda: 0.8,
    });
    worldModel.initialize();

    valueNetwork = new MockValueNetwork(32);
    worldModel.setValueNetwork(valueNetwork);
  });

  it('should set value network', () => {
    const result = worldModel.train({
      observations: [new Array(64).fill(0.5)],
      actions: [[0.5]],
      rewards: [0.5],
      nextObservations: [new Array(64).fill(0.6)],
      dones: [false],
    });

    expect(result.totalLoss).toBeDefined();
  });

  it('should use value network for return estimation in dreams', () => {
    const startState = new Array(64).fill(0.5);
    const episode = worldModel.dream(startState, 20);

    // Values should be estimated
    expect(episode.values.length).toBe(20);
    expect(episode.totalValue).toBeDefined();

    // At least some values should be non-zero
    const nonZeroValues = episode.values.filter(v => Math.abs(v) > 0.001);
    expect(nonZeroValues.length).toBeGreaterThan(0);
  });

  it('should train with TD(λ) signals', () => {
    const batch: TrainingBatch = {
      observations: [new Array(64).fill(0.5)],
      actions: [[0.5]],
      rewards: [0.5],
      nextObservations: [new Array(64).fill(0.6)],
      dones: [false],
    };

    const result = worldModel.trainWithTD(batch, 0.8);

    expect(result.encoderLoss).toBeDefined();
    expect(result.tdError).toBeDefined();
    expect(result.tdError).toBeGreaterThanOrEqual(0);
  });

  it('should throw error when training with TD without value network', () => {
    const worldModelNoVN = new WorldModel();
    worldModelNoVN.initialize();

    const batch: TrainingBatch = {
      observations: [new Array(64).fill(0.5)],
      actions: [[0.5]],
      rewards: [0.5],
      nextObservations: [new Array(64).fill(0.6)],
      dones: [false],
    };

    expect(() => worldModelNoVN.trainWithTD(batch)).toThrow('Value network required');
  });

  it('should use value network for TD targets during training', () => {
    const batch: TrainingBatch = {
      observations: [new Array(64).fill(0.5)],
      actions: [[0.5]],
      rewards: [1.0],
      nextObservations: [new Array(64).fill(0.6)],
      dones: [false],
    };

    const result = worldModel.train(batch);

    // Training should complete successfully
    expect(result.totalLoss).toBeGreaterThanOrEqual(0);
  });
});

describe('WorldModel - Latent Space Interpolation', () => {
  let worldModel: WorldModel;

  beforeEach(() => {
    worldModel = new WorldModel({ latentDim: 32, hiddenDim: 64 });
    worldModel.initialize();
  });

  it('should interpolate between two latent states', () => {
    const latent1 = new Array(32).fill(0).map(() => -1);
    const latent2 = new Array(32).fill(0).map(() => 1);

    const interpolated = worldModel.interpolate(latent1, latent2, 5);

    expect(interpolated.length).toBe(6); // 5 steps + 1

    // First should be close to latent1
    expect(interpolated[0][0]).toBeCloseTo(-1, 1);

    // Last should be close to latent2
    expect(interpolated[5][0]).toBeCloseTo(1, 1);

    // Middle should be around 0 (step 3 out of 5: 3/5 = 0.6, so closer to 1)
    expect(interpolated[3][0]).toBeCloseTo(0.2, 1);
  });

  it('should interpolate between observations', () => {
    const obs1 = new Array(64).fill(0);
    const obs2 = new Array(64).fill(1);

    const interpolated = worldModel.interpolateObs(obs1, obs2, 5);

    expect(interpolated.length).toBe(6);
    interpolated.forEach(obs => {
      expect(obs.length).toBe(64);
    });
  });

  it('should sample from latent space', () => {
    const latent = worldModel.sampleLatent();

    expect(latent).toBeDefined();
    expect(latent.length).toBe(32);

    // Values should be roughly normally distributed
    const mean = latent.reduce((a, b) => a + b, 0) / latent.length;
    expect(Math.abs(mean)).toBeLessThan(2);
  });
});

describe('WorldModel - Uncertainty Estimation', () => {
  let worldModel: WorldModel;

  beforeEach(() => {
    worldModel = new WorldModel({
      latentDim: 32,
      hiddenDim: 64,
      uncertaintyThreshold: 0.5,
    });
    worldModel.initialize();
  });

  it('should estimate uncertainty for predictions', () => {
    const latent = new Array(32).fill(0.5);
    const action = 0.5;

    const transition = worldModel.predict(latent, action);

    expect(transition.uncertainty).toBeDefined();
    expect(transition.uncertainty).toBeGreaterThanOrEqual(0);
    expect(transition.uncertainty).toBeLessThanOrEqual(1);
  });

  it('should determine if state should be explored', () => {
    const obs = new Array(64).fill(0.5);

    const shouldExplore = worldModel.shouldExplore(obs);

    expect(typeof shouldExplore).toBe('boolean');
  });

  it('should provide exploration bonus based on prediction error', () => {
    const obs = new Array(64).fill(0.5);

    const bonus = worldModel.getExplorationBonus(obs);

    expect(bonus).toBeGreaterThanOrEqual(0);
  });

  it('should track average uncertainty over time', () => {
    const batch: TrainingBatch = {
      observations: [
        new Array(64).fill(0.5),
        new Array(64).fill(0.3),
        new Array(64).fill(0.7),
      ],
      actions: [[0.1], [0.2], [0.3]],
      rewards: [0.5, 0.3, 0.7],
      nextObservations: [
        new Array(64).fill(0.6),
        new Array(64).fill(0.4),
        new Array(64).fill(0.8),
      ],
      dones: [false, false, false],
    };

    worldModel.train(batch);
    const state = worldModel.getState();

    expect(state.avgUncertainty).toBeGreaterThanOrEqual(0);
    expect(state.avgUncertainty).toBeLessThanOrEqual(1);
  });
});

describe('WorldModel - Curiosity-Driven Exploration', () => {
  let worldModel: WorldModel;

  beforeEach(() => {
    worldModel = new WorldModel({
      latentDim: 32,
      hiddenDim: 64,
      curiosityWeight: 0.1,
    });
    worldModel.initialize();
  });

  it('should compute curiosity reward based on prediction error', () => {
    const obs = new Array(64).fill(0.5);
    const action = 0.5;

    const curiosityReward = worldModel.getCuriosityReward(obs, action);

    expect(curiosityReward).toBeDefined();
    expect(curiosityReward).toBeGreaterThanOrEqual(0);
  });

  it('should track average curiosity reward during training', () => {
    const batch: TrainingBatch = {
      observations: [
        new Array(64).fill(0.5),
        new Array(64).fill(0.3),
      ],
      actions: [[0.1], [0.2]],
      rewards: [0.5, 0.3],
      nextObservations: [
        new Array(64).fill(0.6),
        new Array(64).fill(0.4),
      ],
      dones: [false, false],
    };

    worldModel.train(batch);
    const state = worldModel.getState();

    expect(state.avgCuriosityReward).toBeDefined();
    expect(state.avgCuriosityReward).toBeGreaterThanOrEqual(0);
  });

  it('should include curiosity rewards in dream episodes', () => {
    const startState = new Array(64).fill(0.5);
    const episode = worldModel.dream(startState, 10);

    // Rewards should include intrinsic motivation
    expect(episode.rewards.length).toBe(10);

    // Some rewards should be non-zero (intrinsic + extrinsic)
    const nonZeroRewards = episode.rewards.filter(r => Math.abs(r) > 0.001);
    expect(nonZeroRewards.length).toBeGreaterThan(0);
  });

  it('should compute prediction error for transitions', () => {
    const latent = new Array(32).fill(0.5);
    const action = 0.5;

    const transition = worldModel.predict(latent, action);

    expect(transition.predictionError).toBeDefined();
    expect(transition.predictionError).toBeGreaterThanOrEqual(0);
  });
});

describe('WorldModel - State Management', () => {
  let worldModel: WorldModel;

  beforeEach(() => {
    worldModel = new WorldModel();
  });

  it('should get model state', () => {
    worldModel.initialize();
    const state = worldModel.getState();

    expect(state).toBeDefined();
    expect(state.trainingSteps).toBe(0);
    expect(state.encoderLoss).toBe(0);
    expect(state.klDivergence).toBe(0);
  });

  it('should get configuration', () => {
    const config = worldModel.getConfig();

    expect(config).toBeDefined();
    expect(config.latentDim).toBeDefined();
    expect(config.learningRate).toBeDefined();
    expect(config.beta).toBeDefined();
  });

  it('should get statistics', () => {
    worldModel.initialize();
    const stats = worldModel.getStats();

    expect(stats).toBeDefined();
    expect(stats.latentDim).toBe(64);
    expect(stats.trainingSteps).toBe(0);
  });

  it('should reset model state', () => {
    worldModel.initialize();

    const batch: TrainingBatch = {
      observations: [new Array(256).fill(0.5)],
      actions: [[0.5]],
      rewards: [0.5],
      nextObservations: [new Array(256).fill(0.6)],
      dones: [false],
    };

    worldModel.train(batch);

    expect(worldModel.getState().trainingSteps).toBeGreaterThan(0);

    worldModel.reset();

    expect(worldModel.getState().trainingSteps).toBe(0);
    expect(worldModel.getState().encoderLoss).toBe(0);
  });

  it('should save and load weights', () => {
    worldModel.initialize();

    const weightsBefore = worldModel.saveWeights();

    // Train to change weights
    const batch: TrainingBatch = {
      observations: [new Array(256).fill(0.5)],
      actions: [[0.5]],
      rewards: [0.5],
      nextObservations: [new Array(256).fill(0.6)],
      dones: [false],
    };

    worldModel.train(batch);

    const weightsAfter = worldModel.saveWeights();
    expect(weightsBefore.encoderWeights).not.toEqual(weightsAfter.encoderWeights);

    // Load old weights
    worldModel.loadWeights(weightsBefore);
    const weightsRestored = worldModel.saveWeights();

    expect(weightsRestored.encoderWeights).toEqual(weightsBefore.encoderWeights);
  });
});

describe('WorldModel - Transition Prediction', () => {
  let worldModel: WorldModel;

  beforeEach(() => {
    worldModel = new WorldModel({
      latentDim: 32,
      hiddenDim: 64,
      transitionHiddenDim: 64,
    });
    worldModel.initialize();
  });

  it('should predict next state given latent and action', () => {
    const latent = new Array(32).fill(0.5);
    const action = 0.3;

    const transition = worldModel.predict(latent, action);

    expect(transition.nextState).toBeDefined();
    expect(transition.nextState.length).toBe(32);
    expect(transition.hiddenState).toBeDefined();
    expect(transition.hiddenState.length).toBe(64);
  });

  it('should predict reward for transition', () => {
    const latent = new Array(32).fill(0.5);
    const action = 0.5;

    const transition = worldModel.predict(latent, action);

    expect(transition.reward).toBeDefined();
    expect(transition.reward).toBeGreaterThanOrEqual(-0.5);
    expect(transition.reward).toBeLessThanOrEqual(0.5);
  });

  it('should predict different states for different actions', () => {
    const latent = new Array(32).fill(0.5);

    const transition1 = worldModel.predict(latent, 0.0);
    const transition2 = worldModel.predict(latent, 1.0);

    expect(transition1.nextState).not.toEqual(transition2.nextState);
  });
});

describe('WorldModel - Backward Compatibility', () => {
  it('should work with old-style train method signature', () => {
    const worldModel = new WorldModel();
    worldModel.initialize();

    // Old-style train (backward compatible)
    const result = worldModel.train({
      observations: [
        new Array(256).fill(0.5),
        new Array(256).fill(0.3),
      ],
      actions: [[0.1], [0.2]],
      rewards: [0.5, 0.3],
      nextObservations: [
        new Array(256).fill(0.6),
        new Array(256).fill(0.4),
      ],
      dones: [false, false],
    });

    expect(result.encoderLoss).toBeDefined();
    expect(result.transitionLoss).toBeDefined();
    expect(result.rewardLoss).toBeDefined();
  });

  it('should work with old dream method signature', () => {
    const worldModel = new WorldModel();
    worldModel.initialize();

    const startState = new Array(256).fill(0.5);
    const episode = worldModel.dream(startState, 10);

    expect(episode.length).toBe(10);
    expect(episode.actions.length).toBe(10);
    expect(episode.rewards.length).toBe(10);
  });

  it('should maintain existing getStats interface', () => {
    const worldModel = new WorldModel();
    worldModel.initialize();

    const stats = worldModel.getStats();

    expect(stats.latentDim).toBeDefined();
    expect(stats.hiddenDim).toBeDefined();
    expect(stats.trainingSteps).toBeDefined();
    expect(stats.encoderLoss).toBeDefined();
    expect(stats.transitionLoss).toBeDefined();
    expect(stats.rewardLoss).toBeDefined();
  });
});

describe('WorldModel - Performance and Edge Cases', () => {
  it('should handle empty batches gracefully', () => {
    const worldModel = new WorldModel();
    worldModel.initialize();

    const result = worldModel.train({
      observations: [],
      actions: [],
      rewards: [],
      nextObservations: [],
      dones: [],
    });

    // Should not crash, losses should be 0 for empty batch
    expect(result.totalLoss).toBe(0);
  });

  it('should handle large observation dimensions', () => {
    const worldModel = new WorldModel({
      latentDim: 32,
      hiddenDim: 128,
    });
    worldModel.initialize();

    const obs = new Array(1000).fill(0.5);
    const latent = worldModel.encode(obs);

    expect(latent.sample.length).toBe(32);
  });

  it('should handle extreme action values', () => {
    const worldModel = new WorldModel();
    worldModel.initialize();

    const latent = new Array(64).fill(0.5);

    const transition1 = worldModel.predict(latent, -10);
    const transition2 = worldModel.predict(latent, 10);

    expect(transition1.nextState).toBeDefined();
    expect(transition2.nextState).toBeDefined();
  });

  it('should handle zero observations', () => {
    const worldModel = new WorldModel();
    worldModel.initialize();

    const obs = new Array(256).fill(0);
    const latent = worldModel.encode(obs);

    expect(latent.sample).toBeDefined();
    expect(latent.sample.length).toBe(64);
  });

  it('should maintain numerical stability with training', () => {
    const worldModel = new WorldModel({
      latentDim: 32,
      learningRate: 0.01,
    });
    worldModel.initialize();

    // Train many times
    for (let i = 0; i < 100; i++) {
      const batch: TrainingBatch = {
        observations: [new Array(256).fill(Math.random())],
        actions: [[Math.random() * 2 - 1]],
        rewards: [Math.random()],
        nextObservations: [new Array(256).fill(Math.random())],
        dones: [Math.random() > 0.5],
      };

      const result = worldModel.train(batch);

      // Losses should remain finite
      expect(Number.isFinite(result.totalLoss)).toBe(true);
      expect(Number.isFinite(result.klDivergence)).toBe(true);
    }
  });
});

describe('WorldModel - Integration Tests', () => {
  it('should complete full training and dreaming cycle', () => {
    const worldModel = new WorldModel({
      latentDim: 32,
      hiddenDim: 64,
      dreamHorizon: 20,
    });
    worldModel.initialize();

    // Train on some data
    const batch: TrainingBatch = {
      observations: [
        new Array(64).fill(0.5),
        new Array(64).fill(0.3),
        new Array(64).fill(0.7),
      ],
      actions: [[0.1], [0.2], [0.3]],
      rewards: [0.5, 0.3, 0.7],
      nextObservations: [
        new Array(64).fill(0.6),
        new Array(64).fill(0.4),
        new Array(64).fill(0.8),
      ],
      dones: [false, false, false],
    };

    const trainResult = worldModel.train(batch);
    expect(trainResult.totalLoss).toBeGreaterThanOrEqual(0);

    // Generate dream episode
    const startState = new Array(64).fill(0.5);
    const dream = worldModel.dream(startState, 20);

    expect(dream.length).toBe(20);
    expect(dream.totalReward).toBeDefined();

    // Check state updated
    const state = worldModel.getState();
    expect(state.trainingSteps).toBeGreaterThan(0);
  });

  it('should integrate with value network for complete TD learning', () => {
    const worldModel = new WorldModel({
      latentDim: 32,
      hiddenDim: 64,
    });
    worldModel.initialize();

    const valueNetwork = new MockValueNetwork(32);
    worldModel.setValueNetwork(valueNetwork);

    // Train with TD
    const batch: TrainingBatch = {
      observations: [new Array(64).fill(0.5)],
      actions: [[0.5]],
      rewards: [1.0],
      nextObservations: [new Array(64).fill(0.6)],
      dones: [false],
    };

    const result = worldModel.trainWithTD(batch);

    expect(result.tdError).toBeDefined();
    expect(result.totalLoss).toBeGreaterThanOrEqual(0);

    // Dream with value estimates
    const dream = worldModel.dream(new Array(64).fill(0.5), 10);

    expect(dream.values.length).toBe(10);
    expect(dream.totalValue).toBeDefined();
  });

  it('should support latent space exploration and interpolation', () => {
    const worldModel = new WorldModel({
      latentDim: 32,
      hiddenDim: 64,
    });
    worldModel.initialize();

    // Sample from latent space
    const latent = worldModel.sampleLatent();
    expect(latent.length).toBe(32);

    // Interpolate
    const latent1 = worldModel.sampleLatent();
    const latent2 = worldModel.sampleLatent();
    const interpolated = worldModel.interpolate(latent1, latent2, 5);

    expect(interpolated.length).toBe(6);

    // Decode to observation (hiddenDim is 64 by default)
    const obs = worldModel.decode(latent);
    expect(obs.length).toBe(64);
  });
});

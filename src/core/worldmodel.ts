/**
 * POLLN World Model (VAE-based)
 *
 * Based on Round 2 research: World models for dreaming
 * VAE encoder + GRU transition + MLP reward predictor
 */

import { v4 as uuidv4 } from 'uuid';

export interface WorldModelConfig {
  latentDim: number;
  hiddenDim: number;
  learningRate: number;
  transitionHiddenDim: number;
  rewardHiddenDim: number;
}

export interface WorldModelState {
  encoderLoss: number;
  reconstructionLoss: number;
  klDivergence: number;
  transitionLoss: number;
  rewardLoss: number;
  lastUpdated: number;
  trainingSteps: number;
}

export interface LatentState {
  mean: number[];
  logVar: number[];
  sample: number[];
}

export interface TransitionResult {
  nextState: number[];
  hiddenState: number[];
  reward: number;
}

export interface DreamEpisode {
  id: string;
  startState: number[];
  actions: number[];
  states: number[];
  rewards: number[];
  totalReward: number;
  length: number;
}

/**
 * WorldModel Implementation
 *
 * Based on Round 2 research: Dreaming system
 * Implements VAE for state encoding, GRU for transitions, MLP for rewards
 */
export class WorldModel {
  private config: WorldModelConfig;
  private state: WorldModelState;
  private encoderWeights: Float32Array | null = null;
  private transitionWeights: Float32Array | null = null;
  private rewardWeights: Float32Array | null = null;

  constructor(config?: Partial<WorldModelConfig>) {
    this.config = {
      latentDim: 64,
      hiddenDim: 256,
      learningRate: 0.001,
      transitionHiddenDim: 128,
      rewardHiddenDim: 64,
      ...config
    };

    this.state = {
      encoderLoss: 0,
      reconstructionLoss: 0,
      klDivergence: 0,
      transitionLoss: 0,
      rewardLoss: 0,
      lastUpdated: Date.now(),
      trainingSteps: 0,
    };
  }

  /**
   * Initialize model weights
   */
  initialize(): void {
    const { latentDim, hiddenDim, transitionHiddenDim, rewardHiddenDim } = this.config;

    // Initialize encoder weights (simplified)
    this.encoderWeights = new Float32Array(latentDim * hiddenDim * 2);
    for (let i = 0; i < this.encoderWeights.length; i++) {
      this.encoderWeights[i] = (Math.random() - 0.5) * 0.1;
    }

    // Initialize transition weights
    this.transitionWeights = new Float32Array(transitionHiddenDim * latentDim * 3);
    for (let i = 0; i < this.transitionWeights.length; i++) {
      this.transitionWeights[i] = (Math.random() - 0.5) * 0.1;
    }

    // Initialize reward weights
    this.rewardWeights = new Float32Array(rewardHiddenDim * latentDim);
    for (let i = 0; i < this.rewardWeights.length; i++) {
      this.rewardWeights[i] = (Math.random() - 0.5) * 0.1;
    }
  }

  /**
   * Encode observation to latent space (VAE)
   */
  encode(observation: number[]): LatentState {
    if (!this.encoderWeights) this.initialize();

    const { latentDim } = this.config;
    const mean = new Array(latentDim).fill(0);
    const logVar = new Array(latentDim).fill(0);

    // Simplified encoding (in production, use proper VAE)
    for (let i = 0; i < latentDim; i++) {
      let sum = 0;
      for (let j = 0; j < observation.length; j++) {
        sum += observation[j] * (this.encoderWeights![i * observation.length + j] || 0);
      }
      mean[i] = Math.tanh(sum * 0.1);
      logVar[i] = 0; // Deterministic for simplicity
    }

    // Sample from latent distribution
    const sample = mean.map((m, i) => m + Math.random() * 0.01 * Math.exp(logVar[i] / 2));

    return { mean, logVar, sample };
  }

  /**
   * Decode latent to observation
   */
  decode(latent: number[]): number[] {
    const { hiddenDim } = this.config;
    const observation = new Array(hiddenDim).fill(0);

    // Simplified decoding
    for (let i = 0; i < hiddenDim; i++) {
      let sum = 0;
      for (let j = 0; j < latent.length; j++) {
        sum += latent[j] * (this.encoderWeights![j * hiddenDim + i] || 0);
      }
      observation[i] = Math.tanh(sum * 0.1);
    }

    return observation;
  }

  /**
   * Predict next state (GRU transition model)
   */
  predict(latent: number[], action: number): TransitionResult {
    if (!this.transitionWeights) this.initialize();

    const { latentDim, transitionHiddenDim } = this.config;

    // Simplified GRU-style prediction
    const hiddenState = new Array(transitionHiddenDim).fill(0);
    const nextState = new Array(latentDim).fill(0);

    // Combine latent and action
    const combined = [...latent, action];
    const combinedDim = combined.length;

    for (let i = 0; i < transitionHiddenDim; i++) {
      let sum = 0;
      for (let j = 0; j < combinedDim; j++) {
        sum += combined[j] * (this.transitionWeights![i * combinedDim + j] || 0);
      }
      hiddenState[i] = Math.tanh(sum * 0.1);
    }

    // Project back to latent space
    for (let i = 0; i < latentDim; i++) {
      let sum = 0;
      for (let j = 0; j < transitionHiddenDim; j++) {
        sum += hiddenState[j] * (this.transitionWeights![j * latentDim + i] || 0);
      }
      nextState[i] = latent[i] * 0.9 + sum * 0.1;
    }

    // Predict reward
    const reward = this.predictReward(nextState, action);

    return { nextState, hiddenState, reward };
  }

  /**
   * Predict reward (MLP)
   */
  predictReward(latent: number[], action: number): number {
    if (!this.rewardWeights) this.initialize();

    const { rewardHiddenDim } = this.config;
    const combined = [...latent, action];

    // Simplified MLP
    let sum = 0;
    for (let i = 0; i < Math.min(combined.length, rewardHiddenDim); i++) {
      sum += combined[i] * this.rewardWeights![i] * 0.1;
    }

    return Math.tanh(sum) * 0.5; // Normalize to [-0.5, 0.5]
  }

  /**
   * Train on a batch of experiences
   */
  train(
    observations: number[][],
    actions: number[][],
    rewards: number[],
    nextObservations: number[][]
  ): { encoderLoss: number; transitionLoss: number; rewardLoss: number } {
    const batchSize = observations.length;
    let totalEncoderLoss = 0;
    let totalTransitionLoss = 0;
    let totalRewardLoss = 0;

    for (let i = 0; i < batchSize; i++) {
      // Encode current observation
      const latent = this.encode(observations[i]);

      // Decode and compute reconstruction loss
      const reconstructed = this.decode(latent.sample);
      const encoderLoss = this.computeReconstructionLoss(observations[i], reconstructed);
      totalEncoderLoss += encoderLoss;

      // Predict next state
      const transition = this.predict(latent.sample, actions[i]);
      const nextLatent = this.encode(nextObservations[i]);

      // Compute transition loss
      const transitionLoss = this.computeTransitionLoss(transition.nextState, nextLatent.sample);
      totalTransitionLoss += transitionLoss;

      // Compute reward loss
      const rewardLoss = Math.pow(transition.reward - rewards[i], 2);
      totalRewardLoss += rewardLoss;

      // Update weights (simplified gradient descent)
      this.updateWeights(encoderLoss, transitionLoss, rewardLoss);
    }

    // Update state
    this.state.encoderLoss = totalEncoderLoss / batchSize;
    this.state.transitionLoss = totalTransitionLoss / batchSize;
    this.state.rewardLoss = totalRewardLoss / batchSize;
    this.state.lastUpdated = Date.now();
    this.state.trainingSteps++;

    return {
      encoderLoss: this.state.encoderLoss,
      transitionLoss: this.state.transitionLoss,
      rewardLoss: this.state.rewardLoss,
    };
  }

  /**
   * Compute reconstruction loss
   */
  private computeReconstructionLoss(original: number[], reconstructed: number[]): number {
    let loss = 0;
    for (let i = 0; i < original.length; i++) {
      loss += Math.pow(original[i] - (reconstructed[i] || 0), 2);
    }
    return loss / original.length;
  }

  /**
   * Compute transition loss
   */
  private computeTransitionLoss(predicted: number[], actual: number[]): number {
    let loss = 0;
    for (let i = 0; i < predicted.length; i++) {
      loss += Math.pow(predicted[i] - actual[i], 2);
    }
    return loss / predicted.length;
  }

  /**
   * Update model weights
   */
  private updateWeights(encoderLoss: number, transitionLoss: number, rewardLoss: number): void {
    const lr = this.config.learningRate;

    // Simplified weight updates (gradient descent)
    if (this.encoderWeights) {
      for (let i = 0; i < this.encoderWeights.length; i++) {
        this.encoderWeights[i] *= (1 - lr * encoderLoss * 0.01);
      }
    }

    if (this.transitionWeights) {
      for (let i = 0; i < this.transitionWeights.length; i++) {
        this.transitionWeights[i] *= (1 - lr * transitionLoss * 0.01);
      }
    }

    if (this.rewardWeights) {
      for (let i = 0; i < this.rewardWeights.length; i++) {
        this.rewardWeights[i] *= (1 - lr * rewardLoss * 0.01);
      }
    }
  }

  /**
   * Generate a dream episode for optimization
   */
  dream(
    startState: number[],
    horizon: number = 50,
    actionSampler?: (state: number[]) => number
  ): DreamEpisode {
    const id = uuidv4();
    const states: number[] = [];
    const actions: number[] = [];
    const rewards: number[] = [];

    let currentState = startState;

    for (let t = 0; t < horizon; t++) {
      // Encode current state
      const latent = this.encode(currentState);

      // Sample or use provided action sampler
      const action = actionSampler
        ? actionSampler(latent.sample)
        : Math.random() * 2 - 1; // Random action [-1, 1]

      // Predict next state and reward
      const transition = this.predict(latent.sample, action);

      states.push(transition.nextState);
      actions.push(action);
      rewards.push(transition.reward);

      currentState = this.decode(transition.nextState);
    }

    const totalReward = rewards.reduce((sum, r) => sum + r, 0);

    return {
      id,
      startState,
      actions,
      states,
      rewards,
      totalReward,
      length: horizon,
    };
  }

  /**
   * Get model state
   */
  getState(): WorldModelState {
    return { ...this.state };
  }

  /**
   * Get configuration
   */
  getConfig(): WorldModelConfig {
    return { ...this.config };
  }

  /**
   * Get statistics
   */
  getStats(): {
    latentDim: number;
    hiddenDim: number;
    trainingSteps: number;
    encoderLoss: number;
    transitionLoss: number;
    rewardLoss: number;
  } {
    return {
      latentDim: this.config.latentDim,
      hiddenDim: this.config.hiddenDim,
      trainingSteps: this.state.trainingSteps,
      encoderLoss: this.state.encoderLoss,
      transitionLoss: this.state.transitionLoss,
      rewardLoss: this.state.rewardLoss,
    };
  }
}

/**
 * POLLN Value Network
 *
 * Predicts the expected long-term value of agent decisions.
 * Inspired by AlphaGo's value network for position evaluation.
 *
 * Key insight: "What is the expected outcome of this pathway?"
 *
 * Based on Wave 8 research: Value networks for agent evaluation
 */

import { EventEmitter } from 'events';
import type { AgentState } from './types.js';

// ============================================================================
// VALUE NETWORK TYPES
// ============================================================================

/**
 * Represents a state value prediction
 */
export interface ValuePrediction {
  stateId: string;
  value: number; // -1 to 1 (bad to good)
  confidence: number; // 0 to 1
  horizon: number; // How many steps ahead this predicts
  timestamp: number;
}

/**
 * Agent trajectory - sequence of states and actions
 */
export interface Trajectory {
  id: string;
  agentId: string;
  states: StateAction[];
  finalValue: number; // Actual outcome
  length: number;
}

/**
 * State-action pair for trajectories
 */
export interface StateAction {
  state: Map<string, unknown>;
  action: string;
  reward: number;
  timestamp: number;
}

/**
 * Value network configuration
 */
export interface ValueNetworkConfig {
  discountFactor: number; // γ - future reward discount (0-1)
  tdLambda: number; // λ - eligibility trace decay (0-1)
  learningRate: number; // α - update rate
  hiddenLayers: number[]; // Neural network architecture
  inputDimension: number; // State encoding size
  minSamplesForTraining: number;
  trainingIntervalMs: number;
}

/**
 * Training sample for the value network
 */
export interface TrainingSample {
  stateEncoding: number[];
  targetValue: number;
  weight: number;
}

// ============================================================================
// VALUE NETWORK IMPLEMENTATION
// ============================================================================

/**
 * ValueNetwork - Predicts expected value of agent states
 *
 * Uses temporal difference learning to estimate:
 * V(s) = E[Σ γ^t * r_t]
 *
 * Where:
 * - V(s) = value of state s
 * - γ = discount factor (future rewards worth less)
 * - r_t = reward at time t
 */
export class ValueNetwork extends EventEmitter {
  private config: ValueNetworkConfig;
  private weights: number[]; // Simplified linear weights for demo
  private trajectories: Trajectory[] = [];
  private predictions: Map<string, ValuePrediction> = new Map();
  private lastTrainingTime: number = 0;
  private trainingCount: number = 0;

  constructor(config: Partial<ValueNetworkConfig> = {}) {
    super();
    this.config = {
      discountFactor: 0.99,
      tdLambda: 0.8,
      learningRate: 0.001,
      hiddenLayers: [64, 32],
      inputDimension: 128,
      minSamplesForTraining: 100,
      trainingIntervalMs: 60000, // 1 minute
      ...config,
    };

    // Initialize weights randomly (simplified)
    this.weights = this.initializeWeights(this.config.inputDimension);
  }

  /**
   * Initialize network weights
   */
  private initializeWeights(size: number): number[] {
    const weights: number[] = [];
    for (let i = 0; i < size; i++) {
      weights.push((Math.random() - 0.5) * 0.1);
    }
    return weights;
  }

  /**
   * Encode agent state to vector
   * Simplified: uses hash-based encoding
   */
  encodeState(state: AgentState | Map<string, unknown>): number[] {
    const encoding = new Array(this.config.inputDimension).fill(0);

    // Simple feature extraction
    const features = this.extractFeatures(state);
    for (let i = 0; i < Math.min(features.length, this.config.inputDimension); i++) {
      encoding[i] = features[i];
    }

    return encoding;
  }

  /**
   * Extract features from state
   */
  private extractFeatures(state: AgentState | Map<string, unknown>): number[] {
    const features: number[] = [];

    if (state instanceof Map) {
      // Generic map state
      features.push(state.size / 100); // Normalize by expected max
      features.push(state.has('success') ? 1 : 0);
      features.push(state.has('error') ? -1 : 0);
      features.push(state.has('initializedAt') ? 1 : 0);
    } else {
      // AgentState type
      features.push(state.executionCount / 1000);
      features.push(state.successRate);
      features.push(state.valueFunction);
      features.push(state.active ? 1 : 0);
    }

    // Pad with zeros
    while (features.length < this.config.inputDimension) {
      features.push(0);
    }

    return features;
  }

  /**
   * Predict value of a state
   * V(s) = Σ w_i * f_i(s)
   */
  predict(state: AgentState | Map<string, unknown>): ValuePrediction {
    const encoding = this.encodeState(state);
    const stateId = this.hashEncoding(encoding);

    // Check cache
    const cached = this.predictions.get(stateId);
    if (cached && Date.now() - cached.timestamp < 10000) {
      return cached;
    }

    // Compute prediction (simplified linear model)
    let value = 0;
    for (let i = 0; i < encoding.length; i++) {
      value += encoding[i] * this.weights[i];
    }

    // Apply sigmoid to bound to [-1, 1]
    value = (2 / (1 + Math.exp(-value))) - 1;

    // Confidence based on training count
    const confidence = Math.min(0.95, 0.5 + this.trainingCount / 1000);

    const prediction: ValuePrediction = {
      stateId,
      value,
      confidence,
      horizon: 10, // Default prediction horizon
      timestamp: Date.now(),
    };

    this.predictions.set(stateId, prediction);
    this.emit('prediction_made', prediction);

    return prediction;
  }

  /**
   * Add trajectory for training
   */
  addTrajectory(trajectory: Trajectory): void {
    this.trajectories.push(trajectory);

    // Trim to last 10000 trajectories
    if (this.trajectories.length > 10000) {
      this.trajectories.shift();
    }

    this.emit('trajectory_added', {
      id: trajectory.id,
      length: trajectory.length,
      finalValue: trajectory.finalValue,
    });
  }

  /**
   * Train network on collected trajectories
   * Uses TD(λ) learning
   */
  train(): { samplesUsed: number; loss: number } {
    if (this.trajectories.length < this.config.minSamplesForTraining) {
      return { samplesUsed: 0, loss: 0 };
    }

    const samples: TrainingSample[] = [];

    // Generate training samples from trajectories
    for (const trajectory of this.trajectories) {
      const trajectorySamples = this.generateTDSamples(trajectory);
      samples.push(...trajectorySamples);
    }

    // Shuffle samples
    this.shuffleArray(samples);

    // Train on samples
    let totalLoss = 0;
    let samplesUsed = 0;

    for (const sample of samples.slice(0, 1000)) { // Limit batch size
      const prediction = this.forwardPass(sample.stateEncoding);
      const error = sample.targetValue - prediction;
      totalLoss += error * error;

      this.backwardPass(sample.stateEncoding, error, sample.weight);
      samplesUsed++;
    }

    this.trainingCount++;
    this.lastTrainingTime = Date.now();

    const avgLoss = samplesUsed > 0 ? totalLoss / samplesUsed : 0;

    this.emit('training_complete', {
      samplesUsed,
      avgLoss,
      totalTrajectories: this.trajectories.length,
    });

    return { samplesUsed, loss: avgLoss };
  }

  /**
   * Generate TD(λ) samples from trajectory
   */
  private generateTDSamples(trajectory: Trajectory): TrainingSample[] {
    const samples: TrainingSample[] = [];

    for (let t = 0; t < trajectory.states.length; t++) {
      // Compute λ-return
      let targetValue = 0;
      let weight = 1;

      for (let n = 0; n < trajectory.states.length - t; n++) {
        const reward = trajectory.states[t + n]?.reward || 0;
        const lambdaWeight = Math.pow(this.config.tdLambda, n);
        targetValue += lambdaWeight * reward;
        weight *= this.config.tdLambda;
      }

      // Add final value estimate
      const finalState = trajectory.states[trajectory.states.length - 1];
      if (finalState) {
        targetValue += Math.pow(this.config.discountFactor, trajectory.states.length - t) *
          trajectory.finalValue;
      }

      const encoding = this.encodeState(trajectory.states[t].state);
      samples.push({
        stateEncoding: encoding,
        targetValue,
        weight,
      });
    }

    return samples;
  }

  /**
   * Forward pass through network (simplified)
   */
  private forwardPass(encoding: number[]): number {
    let value = 0;
    for (let i = 0; i < encoding.length; i++) {
      value += encoding[i] * this.weights[i];
    }
    return (2 / (1 + Math.exp(-value))) - 1; // Sigmoid to [-1, 1]
  }

  /**
   * Backward pass - update weights
   */
  private backwardPass(encoding: number[], error: number, weight: number): void {
    const gradient = error * weight * this.config.learningRate;

    for (let i = 0; i < encoding.length; i++) {
      // Gradient descent with weight decay
      this.weights[i] += gradient * encoding[i] - 0e-6 * this.weights[i];
    }
  }

  /**
   * Hash encoding to string ID
   */
  private hashEncoding(encoding: number[]): string {
    // Simple hash for caching
    return encoding.slice(0, 10).map(v => v.toFixed(3)).join(',');
  }

  /**
   * Shuffle array in place
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Get network statistics
   */
  getStats(): {
    trajectories: number;
    predictions: number;
    trainingCount: number;
    lastTrainingTime: number;
    avgWeight: number;
  } {
    const avgWeight = this.weights.reduce((a, b) => a + b, 0) / this.weights.length;

    return {
      trajectories: this.trajectories.length,
      predictions: this.predictions.size,
      trainingCount: this.trainingCount,
      lastTrainingTime: this.lastTrainingTime,
      avgWeight,
    };
  }

  /**
   * Check if should train
   */
  shouldTrain(): boolean {
    return (
      this.trajectories.length >= this.config.minSamplesForTraining &&
      Date.now() - this.lastTrainingTime > this.config.trainingIntervalMs
    );
  }

  /**
   * Get prediction confidence for a state type
   */
  getConfidence(stateType: string): number {
    // Different state types have different confidence levels
    const baseConfidence = Math.min(0.95, 0.5 + this.trainingCount / 1000);

    switch (stateType) {
      case 'ephemeral':
        return baseConfidence * 0.7; // Less confident for short-lived states
      case 'role':
        return baseConfidence * 0.9;
      case 'core':
        return baseConfidence * 0.95; // Most confident for stable states
      default:
        return baseConfidence * 0.8;
    }
  }
}

// ============================================================================
// VALUE NETWORK MANAGER
// ============================================================================

/**
 * Manages value networks for multiple agent types
 */
export class ValueNetworkManager extends EventEmitter {
  private networks: Map<string, ValueNetwork> = new Map();
  private globalTrajectories: Trajectory[] = [];

  constructor() {
    super();
  }

  /**
   * Get or create network for agent type
   */
  getNetwork(agentType: string): ValueNetwork {
    if (!this.networks.has(agentType)) {
      const network = new ValueNetwork({
        inputDimension: 128,
        hiddenLayers: [64, 32],
      });
      this.networks.set(agentType, network);

      network.on('training_complete', (data) => {
        this.emit('network_trained', { agentType, ...data });
      });
    }

    return this.networks.get(agentType)!;
  }

  /**
   * Record trajectory for training
   */
  recordTrajectory(trajectory: Trajectory): void {
    // Add to type-specific network
    const network = this.getNetwork(trajectory.agentId.split('-')[0]);
    network.addTrajectory(trajectory);

    // Add to global pool
    this.globalTrajectories.push(trajectory);
    if (this.globalTrajectories.length > 50000) {
      this.globalTrajectories.shift();
    }

    this.emit('trajectory_recorded', {
      id: trajectory.id,
      agentId: trajectory.agentId,
      length: trajectory.length,
    });
  }

  /**
   * Train all networks
   */
  trainAll(): Map<string, { samplesUsed: number; loss: number }> {
    const results = new Map<string, { samplesUsed: number; loss: number }>();

    for (const [type, network] of this.networks) {
      if (network.shouldTrain()) {
        const result = network.train();
        results.set(type, result);
      }
    }

    return results;
  }

  /**
   * Get global statistics
   */
  getGlobalStats(): {
    networkCount: number;
    totalTrajectories: number;
    totalPredictions: number;
    networkStats: Map<string, ReturnType<ValueNetwork['getStats']>>;
  } {
    const networkStats = new Map();
    let totalPredictions = 0;

    for (const [type, network] of this.networks) {
      const stats = network.getStats();
      networkStats.set(type, stats);
      totalPredictions += stats.predictions;
    }

    return {
      networkCount: this.networks.size,
      totalTrajectories: this.globalTrajectories.length,
      totalPredictions,
      networkStats,
    };
  }
}

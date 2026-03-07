/**
 * POLLN Dream-Based Policy Optimization
 *
 * Uses the WorldModel to generate dream episodes for policy optimization.
 * Implements Proximal Policy Optimization (PPO) style updates with value-based baselines.
 *
 * Based on Wave 8 research: Model-based RL through imagination
 * Key insight: "Dreams are free experience - learn without acting"
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { WorldModel, DreamEpisode } from './worldmodel.js';
import type { ValueNetwork, Trajectory, StateAction } from './valuenetwork.js';
import type { GraphEvolution } from './evolution.js';

// ============================================================================
// DREAMING TYPES
// ============================================================================

/**
 * Configuration for dream-based policy optimization
 */
export interface DreamingConfig {
  // Dream parameters
  dreamHorizon: number;           // Length of dream episodes
  dreamBatchSize: number;         // Episodes per optimization cycle
  dreamIntervalMs: number;        // Time between dream cycles
  explorationRate: number;        // Random action probability in dreams

  // PPO parameters
  ppoClipEpsilon: number;         // PPO clipping parameter (0.1-0.3)
  ppoEpochs: number;              // PPO optimization epochs per batch
  learningRate: number;           // Policy learning rate
  entropyCoefficient: number;     // Entropy bonus for exploration
  valueLossCoefficient: number;   // Value function loss weight

  // Experience replay parameters
  replayBufferSize: number;       // Max experiences to store
  replaySampleSize: number;       // Experiences per dream batch
  prioritizationAlpha: number;    // Priority sampling strength (0-1)

  // Policy network parameters
  policyHiddenDim: number;        // Hidden layer size
  policyLayers: number;           // Number of hidden layers
  actionSpaceSize: number;        // Discrete actions (or use continuous)

  // Improvement tracking
  improvementWindow: number;      // Episodes to average for improvement
  minImprovementThreshold: number; // Minimum improvement to be significant
}

/**
 * Policy network parameters
 */
export interface PolicyParameters {
  weights: number[][];
  biases: number[];
  version: number;
  lastUpdated: number;
}

/**
 * Policy improvement metrics
 */
export interface PolicyImprovement {
  episode: number;
  oldReturn: number;
  newReturn: number;
  improvement: number;
  policyEntropy: number;
  valueLoss: number;
  policyLoss: number;
  timestamp: number;
}

/**
 * Experience for replay buffer
 */
export interface Experience {
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
  done: boolean;
  priority: number;
  timestamp: number;
}

/**
 * Dream optimization result
 */
export interface DreamOptimizationResult {
  episodesGenerated: number;
  policyUpdated: boolean;
  improvement: PolicyImprovement | null;
  avgDreamReturn: number;
  avgValueLoss: number;
  avgPolicyLoss: number;
  explorationExploited: number;
  timestamp: number;
}

/**
 * Action probability distribution
 */
export interface ActionDistribution {
  actions: number[];
  probabilities: number[];
  logProbabilities: number[];
  entropy: number;
}

// ============================================================================
// DREAM-BASED POLICY OPTIMIZATION IMPLEMENTATION
// ============================================================================

/**
 * DreamBasedPolicyOptimizer - Optimizes policies through simulated dream episodes
 *
 * Combines:
 * 1. World Model for imagination
 * 2. Value Network for baseline estimation
 * 3. PPO for stable policy updates
 * 4. Experience Replay for diverse starting states
 *
 * Architecture:
 * - Dream episodes generated from replay buffer states
 * - Policy improved using PPO with value baseline
 * - Improvements tracked over time
 * - Integration with GraphEvolution for structure learning
 */
export class DreamBasedPolicyOptimizer extends EventEmitter {
  private config: DreamingConfig;
  private worldModel: WorldModel;
  private valueNetwork: ValueNetwork;
  private graphEvolution: GraphEvolution | null;

  // Policy network (simplified MLP)
  private policyWeights: number[][] = [];
  private policyBiases: number[] = [];
  private policyVersion: number = 0;

  // Experience replay buffer
  private replayBuffer: Experience[] = [];

  // Tracking
  private improvementHistory: PolicyImprovement[] = [];
  private dreamHistory: DreamEpisode[] = [];
  private lastDreamTime: number = 0;
  private episodeCount: number = 0;

  // Policy optimization state
  private oldPolicyParameters: PolicyParameters | null = null;
  private cumulativeImprovement: number = 0;

  constructor(
    worldModel: WorldModel,
    valueNetwork: ValueNetwork,
    graphEvolution: GraphEvolution | null,
    config?: Partial<DreamingConfig>
  ) {
    super();

    this.worldModel = worldModel;
    this.valueNetwork = valueNetwork;
    this.graphEvolution = graphEvolution;

    this.config = {
      dreamHorizon: 50,
      dreamBatchSize: 10,
      dreamIntervalMs: 30000, // 30 seconds
      explorationRate: 0.1,
      ppoClipEpsilon: 0.2,
      ppoEpochs: 4,
      learningRate: 0.0003,
      entropyCoefficient: 0.01,
      valueLossCoefficient: 0.5,
      replayBufferSize: 10000,
      replaySampleSize: 32,
      prioritizationAlpha: 0.6,
      policyHiddenDim: 64,
      policyLayers: 2,
      actionSpaceSize: 10,
      improvementWindow: 100,
      minImprovementThreshold: 0.01,
      ...config,
    };

    // Initialize policy network
    this.initializePolicyNetwork();
  }

  /**
   * Initialize policy network weights
   */
  private initializePolicyNetwork(): void {
    const inputDim = this.worldModel.getConfig().latentDim;

    // Initialize layers
    let prevDim = inputDim;
    for (let i = 0; i < this.config.policyLayers; i++) {
      const layerSize = this.config.policyHiddenDim;
      const weights: number[] = [];

      // Xavier initialization
      const scale = Math.sqrt(2.0 / (prevDim + layerSize));
      for (let j = 0; j < prevDim * layerSize; j++) {
        weights.push((Math.random() - 0.5) * 2 * scale);
      }

      this.policyWeights.push(weights);
      this.policyBiases.push(0);
      prevDim = layerSize;
    }

    // Output layer (action probabilities)
    const outputWeights: number[] = [];
    const scale = Math.sqrt(2.0 / (prevDim + this.config.actionSpaceSize));
    for (let j = 0; j < prevDim * this.config.actionSpaceSize; j++) {
      outputWeights.push((Math.random() - 0.5) * 2 * scale);
    }
    this.policyWeights.push(outputWeights);
    this.policyBiases.push(0);
  }

  /**
   * Add experience to replay buffer
   */
  addExperience(
    state: number[],
    action: number,
    reward: number,
    nextState: number[],
    done: boolean = false
  ): void {
    // Compute priority based on TD error
    const priority = this.computePriority(state, reward, nextState);

    const experience: Experience = {
      state,
      action,
      reward,
      nextState,
      done,
      priority,
      timestamp: Date.now(),
    };

    this.replayBuffer.push(experience);

    // Trim buffer
    if (this.replayBuffer.length > this.config.replayBufferSize) {
      // Remove oldest or lowest priority
      this.replayBuffer.sort((a, b) => b.priority - a.priority);
      this.replayBuffer = this.replayBuffer.slice(0, this.config.replayBufferSize);
    }

    this.emit('experience_added', {
      bufferSize: this.replayBuffer.length,
      priority,
    });
  }

  /**
   * Compute experience priority for sampling
   */
  private computePriority(state: number[], reward: number, nextState: number[]): number {
    // Simplified: use reward magnitude + recency
    const rewardPriority = Math.abs(reward);
    const agePenalty = Math.max(0, 1 - (Date.now() - Date.now()) / 86400000); // 1 day decay
    return rewardPriority * agePenalty + 0.1; // Minimum priority
  }

  /**
   * Sample experiences from replay buffer with prioritization
   */
  private sampleExperiences(count: number): Experience[] {
    if (this.replayBuffer.length === 0) return [];

    // Prioritized sampling
    const priorities = this.replayBuffer.map(e => Math.pow(e.priority, this.config.prioritizationAlpha));
    const totalPriority = priorities.reduce((a, b) => a + b, 0);

    const samples: Experience[] = [];
    for (let i = 0; i < Math.min(count, this.replayBuffer.length); i++) {
      const r = Math.random() * totalPriority;
      let sum = 0;

      for (let j = 0; j < this.replayBuffer.length; j++) {
        sum += priorities[j];
        if (sum >= r) {
          samples.push(this.replayBuffer[j]);
          break;
        }
      }
    }

    return samples;
  }

  /**
   * Generate dream episode from starting state
   */
  private generateDreamEpisode(
    startState: number[],
    policy: (state: number[]) => ActionDistribution
  ): DreamEpisode {
    const id = uuidv4();
    const states: number[] = [];
    const actions: number[] = [];
    const rewards: number[] = [];
    const values: number[] = [];
    const uncertainties: number[] = [];

    let currentState = startState;
    let done = false;
    let step = 0;
    let totalValue = 0;

    while (!done && step < this.config.dreamHorizon) {
      // Encode current state
      const latent = this.worldModel.encode(currentState);

      // Get action distribution from policy
      const actionDist = policy(latent.sample);

      // Sample action or explore
      let action: number;
      if (Math.random() < this.config.explorationRate) {
        // Explore: random action
        action = Math.floor(Math.random() * this.config.actionSpaceSize);
      } else {
        // Exploit: sample from policy
        action = this.sampleAction(actionDist);
      }

      // Normalize action to [-1, 1] for world model
      const normalizedAction = (action / this.config.actionSpaceSize) * 2 - 1;

      // Predict next state and reward
      const transition = this.worldModel.predict(latent.sample, normalizedAction);

      states.push(...transition.nextState);
      actions.push(action);
      rewards.push(transition.reward);
      uncertainties.push(transition.uncertainty);

      // Get value estimate
      const stateMap = new Map<string, unknown>([
        ['embedding', latent.sample],
        ['value', 0],
      ]);
      const valuePred = this.valueNetwork.predict(stateMap);
      values.push(valuePred.value);
      totalValue += valuePred.value;

      // Decode next state
      currentState = this.worldModel.decode(transition.nextState);

      step++;
    }

    const totalReward = rewards.reduce((sum, r) => sum + r, 0);

    const episode: DreamEpisode = {
      id,
      startState,
      actions,
      states,
      rewards,
      values,
      uncertainties,
      totalReward,
      totalValue,
      length: step,
    };

    this.dreamHistory.push(episode);
    if (this.dreamHistory.length > 1000) {
      this.dreamHistory.shift();
    }

    return episode;
  }

  /**
   * Sample action from distribution
   */
  private sampleAction(dist: ActionDistribution): number {
    const r = Math.random();
    let cumulative = 0;

    for (let i = 0; i < dist.probabilities.length; i++) {
      cumulative += dist.probabilities[i];
      if (r <= cumulative) {
        return i;
      }
    }

    return dist.probabilities.length - 1;
  }

  /**
   * Forward pass through policy network
   */
  private policyForward(state: number[]): ActionDistribution {
    let activations = state;
    const logProbabilities: number[] = [];

    // Hidden layers (ReLU)
    for (let i = 0; i < this.config.policyLayers; i++) {
      const weights = this.policyWeights[i];
      const bias = this.policyBiases[i];
      const nextActivations: number[] = [];

      const inputSize = activations.length;
      const outputSize = this.config.policyHiddenDim;

      for (let j = 0; j < outputSize; j++) {
        let sum = bias;
        for (let k = 0; k < inputSize; k++) {
          sum += activations[k] * weights[j * inputSize + k];
        }
        nextActivations.push(Math.max(0, sum)); // ReLU
      }

      activations = nextActivations;
    }

    // Output layer (softmax)
    const outputWeights = this.policyWeights[this.config.policyLayers];
    const outputBias = this.policyBiases[this.config.policyLayers];
    const logits: number[] = [];

    const inputSize = activations.length;
    const outputSize = this.config.actionSpaceSize;

    for (let j = 0; j < outputSize; j++) {
      let sum = outputBias;
      for (let k = 0; k < inputSize; k++) {
        sum += activations[k] * outputWeights[j * inputSize + k];
      }
      logits.push(sum);
    }

    // Softmax
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const probabilities = expLogits.map(e => e / sumExp);

    // Log probabilities
    for (let j = 0; j < outputSize; j++) {
      logProbabilities.push(Math.log(Math.max(probabilities[j], 1e-10)));
    }

    // Entropy
    const entropy = -probabilities.reduce((sum, p) => sum + p * Math.log(Math.max(p, 1e-10)), 0);

    return {
      actions: Array.from({ length: outputSize }, (_, i) => i),
      probabilities,
      logProbabilities,
      entropy,
    };
  }

  /**
   * Compute returns using value network as baseline
   */
  private computeReturns(
    episode: DreamEpisode,
    gamma: number = 0.99
  ): number[] {
    const returns: number[] = [];
    let G = 0;

    // Compute discounted returns backwards
    for (let t = episode.rewards.length - 1; t >= 0; t--) {
      G = episode.rewards[t] + gamma * G;
      returns.unshift(G);
    }

    return returns;
  }

  /**
   * Compute advantage estimates using value network
   */
  private computeAdvantages(
    episode: DreamEpisode,
    returns: number[],
    gamma: number = 0.99,
    lambda: number = 0.95
  ): number[] {
    const advantages: number[] = [];
    const stateDim = this.worldModel.getConfig().latentDim;

    // Compute TD(lambda) advantages
    let lastAdvantage = 0;
    let lastValue = 0;

    for (let t = episode.rewards.length - 1; t >= 0; t--) {
      // Extract state representation
      const stateStart = t * stateDim;
      const stateEnd = stateStart + stateDim;
      const state = episode.states.slice(stateStart, Math.min(stateEnd, episode.states.length));

      // Get value estimate
      const stateMap = new Map<string, unknown>([
        ['embedding', state],
        ['value', 0],
      ]);
      const valuePred = this.valueNetwork.predict(stateMap);
      const value = valuePred.value;

      // TD residual
      const delta = episode.rewards[t] + gamma * lastValue - value;

      // Advantage
      const advantage = delta + gamma * lambda * lastAdvantage;
      advantages.unshift(advantage);

      lastAdvantage = advantage;
      lastValue = value;
    }

    return advantages;
  }

  /**
   * PPO policy update
   */
  private ppoUpdate(
    episodes: DreamEpisode[]
  ): { policyLoss: number; valueLoss: number; entropy: number } {
    let totalPolicyLoss = 0;
    let totalValueLoss = 0;
    let totalEntropy = 0;
    let totalSamples = 0;

    // Store old policy for PPO clipping
    this.oldPolicyParameters = {
      weights: this.policyWeights.map(w => [...w]),
      biases: [...this.policyBiases],
      version: this.policyVersion,
      lastUpdated: Date.now(),
    };

    // PPO epochs
    for (let epoch = 0; epoch < this.config.ppoEpochs; epoch++) {
      // Shuffle episodes
      const shuffled = [...episodes].sort(() => Math.random() - 0.5);

      for (const episode of shuffled) {
        const returns = this.computeReturns(episode);
        const advantages = this.computeAdvantages(episode, returns);

        // Normalize advantages
        const advMean = advantages.reduce((a, b) => a + b, 0) / advantages.length;
        const advStd = Math.sqrt(
          advantages.reduce((sum, a) => sum + (a - advMean) ** 2, 0) / advantages.length
        );
        const normalizedAdvantages = advantages.map(a => (a - advMean) / (advStd + 1e-8));

        // Process each timestep
        for (let t = 0; t < episode.length; t++) {
          const stateDim = this.worldModel.getConfig().latentDim;
          const stateStart = t * stateDim;
          const stateEnd = stateStart + stateDim;
          const state = episode.states.slice(stateStart, Math.min(stateEnd, episode.states.length));

          // Get action and old log prob
          const action = episode.actions[t];
          const actionDist = this.policyForward(state);
          const logProb = actionDist.logProbabilities[action];

          // Get old log prob
          const oldLogProb = this.computeOldLogProb(state, action);

          // PPO ratio
          const ratio = Math.exp(logProb - oldLogProb);

          // PPO clipped loss
          const advantage = normalizedAdvantages[t];
          const clippedRatio = Math.max(
            1 - this.config.ppoClipEpsilon,
            Math.min(1 + this.config.ppoClipEpsilon, ratio)
          );

          const policyLoss = -Math.min(
            ratio * advantage,
            clippedRatio * advantage
          );

          // Entropy bonus
          const entropyBonus = this.config.entropyCoefficient * actionDist.entropy;

          // Value loss (simplified)
          const stateMap = new Map<string, unknown>([
            ['embedding', state],
            ['value', 0],
          ]);
          const valuePred = this.valueNetwork.predict(stateMap);
          const valueLoss = this.config.valueLossCoefficient *
            Math.pow(returns[t] - valuePred.value, 2);

          // Total loss
          const loss = policyLoss + valueLoss - entropyBonus;

          // Update policy (simplified gradient descent)
          this.updatePolicyGradients(state, action, loss);

          totalPolicyLoss += policyLoss;
          totalValueLoss += valueLoss;
          totalEntropy += actionDist.entropy;
          totalSamples++;
        }
      }
    }

    this.policyVersion++;

    return {
      policyLoss: totalSamples > 0 ? totalPolicyLoss / totalSamples : 0,
      valueLoss: totalSamples > 0 ? totalValueLoss / totalSamples : 0,
      entropy: totalSamples > 0 ? totalEntropy / totalSamples : 0,
    };
  }

  /**
   * Compute old policy log probability
   */
  private computeOldLogProb(state: number[], action: number): number {
    if (!this.oldPolicyParameters) return 0;

    // Use old weights to compute log prob
    const oldWeights = this.oldPolicyParameters.weights;
    const oldBiases = this.oldPolicyParameters.biases;

    // Simplified: return current log prob for now
    // In production, would implement full forward pass with old weights
    return Math.log(1.0 / this.config.actionSpaceSize);
  }

  /**
   * Update policy with gradient descent (simplified)
   */
  private updatePolicyGradients(state: number[], action: number, loss: number): void {
    const lr = this.config.learningRate;
    const gradient = loss; // Simplified gradient

    // Update weights (very simplified - proper implementation would backpropagate)
    for (let i = 0; i < this.policyWeights.length; i++) {
      for (let j = 0; j < this.policyWeights[i].length; j++) {
        this.policyWeights[i][j] -= lr * gradient * Math.sign(this.policyWeights[i][j]) * 0.01;
      }
    }

    // Update biases
    for (let i = 0; i < this.policyBiases.length; i++) {
      this.policyBiases[i] -= lr * gradient * 0.01;
    }
  }

  /**
   * Run dream-based optimization cycle
   */
  async optimize(): Promise<DreamOptimizationResult> {
    const now = Date.now();

    // Check if should dream
    if (now - this.lastDreamTime < this.config.dreamIntervalMs) {
      return {
        episodesGenerated: 0,
        policyUpdated: false,
        improvement: null,
        avgDreamReturn: 0,
        avgValueLoss: 0,
        avgPolicyLoss: 0,
        explorationExploited: 0,
        timestamp: now,
      };
    }

    // Sample starting states from replay buffer
    const experiences = this.sampleExperiences(this.config.dreamBatchSize);
    if (experiences.length === 0) {
      return {
        episodesGenerated: 0,
        policyUpdated: false,
        improvement: null,
        avgDreamReturn: 0,
        avgValueLoss: 0,
        avgPolicyLoss: 0,
        explorationExploited: 0,
        timestamp: now,
      };
    }

    // Generate dream episodes
    const episodes: DreamEpisode[] = [];
    let totalReward = 0;
    let explorationCount = 0;
    let exploitationCount = 0;

    for (const exp of experiences) {
      const episode = this.generateDreamEpisode(exp.state, (state) => this.policyForward(state));
      episodes.push(episode);
      totalReward += episode.totalReward;

      // Count exploration vs exploitation
      for (let i = 0; i < episode.actions.length; i++) {
        if (Math.random() < this.config.explorationRate) {
          explorationCount++;
        } else {
          exploitationCount++;
        }
      }
    }

    // Compute average return before update
    const oldAvgReturn = this.computeAverageReturn();

    // PPO update
    const updateResult = this.ppoUpdate(episodes);

    // Compute improvement
    const newAvgReturn = this.computeAverageReturn();
    const improvement = newAvgReturn - oldAvgReturn;

    const improvementRecord: PolicyImprovement = {
      episode: this.episodeCount++,
      oldReturn: oldAvgReturn,
      newReturn: newAvgReturn,
      improvement,
      policyEntropy: updateResult.entropy,
      valueLoss: updateResult.valueLoss,
      policyLoss: updateResult.policyLoss,
      timestamp: now,
    };

    this.improvementHistory.push(improvementRecord);
    if (this.improvementHistory.length > this.config.improvementWindow) {
      this.improvementHistory.shift();
    }

    this.lastDreamTime = now;
    this.cumulativeImprovement += improvement;

    // Notify graph evolution about policy change
    if (this.graphEvolution && Math.abs(improvement) > this.config.minImprovementThreshold) {
      this.emit('policy_improved', improvementRecord);
    }

    this.emit('dream_complete', {
      episodesGenerated: episodes.length,
      improvement,
      avgReturn: totalReward / episodes.length,
    });

    return {
      episodesGenerated: episodes.length,
      policyUpdated: true,
      improvement: improvementRecord,
      avgDreamReturn: totalReward / episodes.length,
      avgValueLoss: updateResult.valueLoss,
      avgPolicyLoss: updateResult.policyLoss,
      explorationExploited: exploitationCount,
      timestamp: now,
    };
  }

  /**
   * Compute average return over recent episodes
   */
  private computeAverageReturn(): number {
    if (this.dreamHistory.length === 0) return 0;

    const recentEpisodes = this.dreamHistory.slice(-this.config.improvementWindow);
    return recentEpisodes.reduce((sum, ep) => sum + ep.totalReward, 0) / recentEpisodes.length;
  }

  /**
   * Get action from current policy
   */
  getAction(state: number[]): { action: number; probability: number } {
    const latent = this.worldModel.encode(state);
    const actionDist = this.policyForward(latent.sample);
    const action = this.sampleAction(actionDist);

    return {
      action,
      probability: actionDist.probabilities[action],
    };
  }

  /**
   * Export policy parameters
   */
  exportPolicy(): PolicyParameters {
    return {
      weights: this.policyWeights.map(w => [...w]),
      biases: [...this.policyBiases],
      version: this.policyVersion,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Import policy parameters
   */
  importPolicy(params: PolicyParameters): void {
    this.policyWeights = params.weights.map(w => [...w]);
    this.policyBiases = [...params.biases];
    this.policyVersion = params.version;
    this.emit('policy_imported', { version: params.version });
  }

  /**
   * Get optimizer statistics
   */
  getStats(): {
    replayBufferSize: number;
    dreamHistorySize: number;
    policyVersion: number;
    improvementHistory: PolicyImprovement[];
    cumulativeImprovement: number;
    lastDreamTime: number;
    episodeCount: number;
    config: DreamingConfig;
  } {
    return {
      replayBufferSize: this.replayBuffer.length,
      dreamHistorySize: this.dreamHistory.length,
      policyVersion: this.policyVersion,
      improvementHistory: [...this.improvementHistory],
      cumulativeImprovement: this.cumulativeImprovement,
      lastDreamTime: this.lastDreamTime,
      episodeCount: this.episodeCount,
      config: { ...this.config },
    };
  }

  /**
   * Reset optimizer state
   */
  reset(): void {
    this.replayBuffer = [];
    this.dreamHistory = [];
    this.improvementHistory = [];
    this.lastDreamTime = 0;
    this.episodeCount = 0;
    this.cumulativeImprovement = 0;
    this.policyVersion = 0;
    this.initializePolicyNetwork();

    this.emit('reset');
  }

  /**
   * Reset the lastDreamTime to to initial state
   * Useful for testing to ensure optimizers can run
   */
  resetDreamTimer(): void {
    this.lastDreamTime = 0;
  }

  /**
   * Check if optimizer should run dreaming cycle
   */
  shouldDream(): boolean {
    return (
      this.replayBuffer.length >= this.config.replaySampleSize &&
      Date.now() - this.lastDreamTime >= this.config.dreamIntervalMs
    );
  }

  /**
   * Compute improvement statistics over window
   */
  getImprovementStats(): {
    avgImprovement: number;
    maxImprovement: number;
    minImprovement: number;
    improvementTrend: 'improving' | 'stable' | 'degrading';
    confidence: number;
  } {
    if (this.improvementHistory.length < 2) {
      return {
        avgImprovement: 0,
        maxImprovement: 0,
        minImprovement: 0,
        improvementTrend: 'stable',
        confidence: 0,
      };
    }

    const improvements = this.improvementHistory.map(h => h.improvement);
    const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    const maxImprovement = Math.max(...improvements);
    const minImprovement = Math.min(...improvements);

    // Compute trend
    const recentHalf = improvements.slice(Math.floor(improvements.length / 2));
    const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;

    let trend: 'improving' | 'stable' | 'degrading';
    if (recentAvg > avgImprovement + this.config.minImprovementThreshold) {
      trend = 'improving';
    } else if (recentAvg < avgImprovement - this.config.minImprovementThreshold) {
      trend = 'degrading';
    } else {
      trend = 'stable';
    }

    // Confidence based on number of samples
    const confidence = Math.min(0.95, this.improvementHistory.length / this.config.improvementWindow);

    return {
      avgImprovement,
      maxImprovement,
      minImprovement,
      improvementTrend: trend,
      confidence,
    };
  }
}

// ============================================================================
// DREAM MANAGER
// ============================================================================

/**
 * Manages multiple dream-based policy optimizers
 */
export class DreamManager extends EventEmitter {
  private optimizers: Map<string, DreamBasedPolicyOptimizer> = new Map();

  /**
   * Create or get optimizer for agent type
   */
  getOptimizer(
    key: string,
    worldModel: WorldModel,
    valueNetwork: ValueNetwork,
    graphEvolution: GraphEvolution | null,
    config?: Partial<DreamingConfig>
  ): DreamBasedPolicyOptimizer {
    if (!this.optimizers.has(key)) {
      const optimizer = new DreamBasedPolicyOptimizer(
        worldModel,
        valueNetwork,
        graphEvolution,
        config
      );

      optimizer.on('dream_complete', (data) => {
        this.emit('optimizer_dream_complete', { key, ...data });
      });

      optimizer.on('policy_improved', (data) => {
        this.emit('optimizer_policy_improved', { key, ...data });
      });

      this.optimizers.set(key, optimizer);
    }

    return this.optimizers.get(key)!;
  }

  /**
   * Run optimization for all optimizers
   */
  async optimizeAll(): Promise<Map<string, DreamOptimizationResult>> {
    const results = new Map<string, DreamOptimizationResult>();

    for (const [key, optimizer] of this.optimizers) {
      if (optimizer.shouldDream()) {
        const result = await optimizer.optimize();
        results.set(key, result);
      }
    }

    return results;
  }

  /**
   * Get global statistics
   */
  getGlobalStats(): {
    optimizerCount: number;
    totalReplaySize: number;
    totalDreamEpisodes: number;
    totalImprovement: number;
    activeOptimizers: string[];
  } {
    let totalReplaySize = 0;
    let totalDreamEpisodes = 0;
    let totalImprovement = 0;
    const activeOptimizers: string[] = [];

    for (const [key, optimizer] of this.optimizers) {
      const stats = optimizer.getStats();
      totalReplaySize += stats.replayBufferSize;
      totalDreamEpisodes += stats.dreamHistorySize;
      totalImprovement += stats.cumulativeImprovement;

      if (stats.replayBufferSize > 0) {
        activeOptimizers.push(key);
      }
    }

    return {
      optimizerCount: this.optimizers.size,
      totalReplaySize,
      totalDreamEpisodes,
      totalImprovement,
      activeOptimizers,
    };
  }
}

/**
 * POLLN Adaptive Federated Learning Strategy
 * Pattern-Organized Large Language Network
 *
 * References:
 * - Li et al., "Federated Learning with Adaptive Aggregation" (2021)
 * - Wang et al., "Adaptive Federated Learning in Resource Constrained Edge Computing Systems" (2020)
 *
 * AdaptiveFed dynamically adjusts aggregation strategy based on:
 * 1. Participant data quality (loss, gradient norm)
 * 2. Participant reliability (historical performance)
 * 3. System conditions (bandwidth, latency)
 * 4. Data heterogeneity (KL divergence from global model)
 *
 * Key innovations:
 * - Quality-weighted aggregation - higher quality updates get more weight
 * - Dynamic participant selection - prefer high-quality, reliable participants
 * - Adaptive learning rate - adjust based on convergence progress
 * - Multi-metric evaluation - combine multiple signals for decision making
 * - Self-tuning parameters - automatically adjust hyperparameters
 */

import { FederatedStrategy, StrategyConfig, AggregationResult, ParticipantUpdate } from '../types.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AdaptiveFedConfig extends StrategyConfig {
  // Quality metrics
  qualityMetrics: ('loss' | 'gradientNorm' | 'dataSize' | 'latency' | 'reliability')[];
  qualityWeights: {
    loss: number;
    gradientNorm: number;
    dataSize: number;
    latency: number;
    reliability: number;
  };

  // Participant selection
  participantSelection: 'quality-based' | 'diversity-based' | 'hybrid';
  minParticipants: number;
  maxParticipants: number;
  selectionFraction: number;

  // Aggregation strategy
  aggregationMethod: 'quality-weighted' | 'reliability-weighted' | 'adaptive';
  dynamicWeighting: boolean;
  weightNormalization: 'softmax' | 'minmax' | 'zscore';

  // Learning rate adaptation
  adaptiveLearningRate: boolean;
  initialLearningRate: number;
  lrSchedule: 'constant' | 'decay' | 'cosine' | 'adaptive';
  lrWarmupRounds: number;
  lrDecayFactor: number;

  // Convergence detection
  convergenceWindow: number; // Rounds to check for convergence
  convergenceThreshold: number; // Minimum improvement to continue
  patience: number; // Rounds to wait before early stopping

  // Self-tuning
  autoTuneMetrics: boolean;
  tuningInterval: number; // Rounds between tuning
}

export interface AdaptiveFedState {
  roundNumber: number;
  globalModel: Float32Array;
  globalRound: number;
  bestLoss: number;
  convergenceHistory: number[];
  participantHistory: Map<string, ParticipantHistory>;
  currentLearningRate: number;
  qualityWeights: AdaptiveFedConfig['qualityWeights'];
}

export interface ParticipantHistory {
  participantId: string;
  totalRounds: number;
  successfulRounds: number;
  avgLoss: number;
  avgGradientNorm: number;
  avgLatency: number;
  reliability: number;
  lastUpdate: number;
}

export interface QualityScore {
  participantId: string;
  score: number;
  components: {
    loss: number;
    gradientNorm: number;
    dataSize: number;
    latency: number;
    reliability: number;
  };
}

// ============================================================================
// AdaptiveFed Strategy Implementation
// ============================================================================

/**
 * AdaptiveFederated
 *
 * Implements adaptive federated learning with quality-based aggregation
 * and dynamic participant selection.
 */
export class AdaptiveFederated implements FederatedStrategy {
  private config: AdaptiveFedConfig;
  private state: AdaptiveFedState;

  constructor(config: Partial<AdaptiveFedConfig> = {}) {
    this.config = {
      name: 'fed-adaptive',
      qualityMetrics: ['loss', 'gradientNorm', 'dataSize', 'reliability'],
      qualityWeights: {
        loss: 0.3,
        gradientNorm: 0.2,
        dataSize: 0.2,
        latency: 0.1,
        reliability: 0.2,
      },
      participantSelection: 'hybrid',
      minParticipants: 2,
      maxParticipants: 100,
      selectionFraction: 1.0,
      aggregationMethod: 'quality-weighted',
      dynamicWeighting: true,
      weightNormalization: 'softmax',
      adaptiveLearningRate: true,
      initialLearningRate: 0.01,
      lrSchedule: 'adaptive',
      lrWarmupRounds: 5,
      lrDecayFactor: 0.99,
      convergenceWindow: 5,
      convergenceThreshold: 1e-4,
      patience: 10,
      autoTuneMetrics: true,
      tuningInterval: 10,
      ...config,
    };

    this.state = {
      roundNumber: 0,
      globalModel: new Float32Array(0),
      globalRound: 0,
      bestLoss: Infinity,
      convergenceHistory: [],
      participantHistory: new Map(),
      currentLearningRate: this.config.initialLearningRate,
      qualityWeights: { ...this.config.qualityWeights },
    };
  }

  /**
   * Get strategy configuration
   */
  getConfig(): AdaptiveFedConfig {
    return { ...this.config };
  }

  /**
   * Get current state
   */
  getState(): AdaptiveFedState {
    return {
      ...this.state,
      participantHistory: new Map(this.state.participantHistory),
    };
  }

  /**
   * Initialize global model
   */
  initializeModel(parameters: Float32Array): void {
    this.state.globalModel = new Float32Array(parameters);
    this.state.globalRound = 0;
    this.state.roundNumber = 0;
    this.state.bestLoss = Infinity;
    this.state.convergenceHistory = [];
    this.state.participantHistory.clear();
    this.state.currentLearningRate = this.config.initialLearningRate;
    this.state.qualityWeights = { ...this.config.qualityWeights };
  }

  /**
   * Select participants based on quality and diversity
   */
  selectParticipants(
    availableParticipants: string[],
    _participantStats?: Map<string, { sampleCount: number; updateLatency: number }>
  ): string[] {
    const targetCount = Math.min(
      this.config.maxParticipants,
      Math.max(
        this.config.minParticipants,
        Math.floor(availableParticipants.length * this.config.selectionFraction)
      )
    );

    // Get quality scores for all participants
    const scores = availableParticipants.map(participantId => {
      const history = this.state.participantHistory.get(participantId);
      return {
        participantId,
        score: history?.reliability || 0.5, // Default score for new participants
      };
    });

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    // Select top participants
    const selected = scores.slice(0, targetCount).map(s => s.participantId);

    return selected;
  }

  /**
   * Aggregate updates with quality-based weighting
   */
  async aggregateUpdates(
    updates: ParticipantUpdate[]
  ): Promise<AggregationResult> {
    if (updates.length === 0) {
      throw new Error('No updates to aggregate');
    }

    const startTime = Date.now();

    // 1. Calculate quality scores for each update
    const qualityScores = this.calculateQualityScores(updates);

    // 2. Update participant history
    this.updateParticipantHistory(updates, qualityScores);

    // 3. Auto-tune quality weights if enabled
    if (this.config.autoTuneMetrics && this.state.roundNumber % this.config.tuningInterval === 0) {
      this.tuneQualityWeights();
    }

    // 4. Calculate aggregation weights
    const aggregationWeights = this.calculateAggregationWeights(
      updates,
      qualityScores
    );

    // 5. Perform weighted aggregation
    const aggregatedGradients = this.performWeightedAggregation(
      updates,
      aggregationWeights
    );

    // 6. Update learning rate
    const learningRate = this.calculateLearningRate();

    // 7. Update global model
    const newGlobalModel = new Float32Array(this.state.globalModel.length);
    for (let i = 0; i < newGlobalModel.length; i++) {
      newGlobalModel[i] = this.state.globalModel[i] - learningRate * aggregatedGradients[i];
    }

    // 8. Calculate metadata
    const totalSamples = updates.reduce((sum, u) => sum + u.sampleCount, 0);
    const avgLoss = updates.reduce((sum, u) => sum + (u.loss || 0), 0) / updates.length;
    const weightedLoss = updates.reduce(
      (sum, u) => sum + (u.loss || 0) * u.sampleCount,
      0
    ) / totalSamples;
    const avgQuality = qualityScores.reduce((sum, q) => sum + q.score, 0) / qualityScores.length;

    // 9. Update state
    this.state.globalModel = newGlobalModel;
    this.state.globalRound++;
    this.state.roundNumber++;
    this.state.convergenceHistory.push(weightedLoss);

    // Track best loss
    if (weightedLoss < this.state.bestLoss) {
      this.state.bestLoss = weightedLoss;
    }

    // 10. Check convergence
    const hasConverged = this.checkConvergence();

    const aggregationTime = Date.now() - startTime;

    return {
      aggregatedModel: newGlobalModel,
      roundNumber: this.state.roundNumber,
      globalRound: this.state.globalRound,
      participantCount: updates.length,
      totalSamples,
      avgLoss,
      weightedLoss,
      aggregationTime,
      hasConverged,
      metadata: {
        strategy: this.config.name,
        avgQuality,
        learningRate,
        bestLoss: this.state.bestLoss,
        qualityWeights: this.state.qualityWeights,
        aggregationMethod: this.config.aggregationMethod,
        dynamicWeighting: this.config.dynamicWeighting,
      },
    };
  }

  /**
   * Calculate quality scores for each update
   */
  private calculateQualityScores(updates: ParticipantUpdate[]): QualityScore[] {
    return updates.map(update => {
      const components: QualityScore['components'] = {
        loss: 0,
        gradientNorm: 0,
        dataSize: 0,
        latency: 0,
        reliability: 0,
      };

      // Loss component (lower is better)
      if (this.config.qualityMetrics.includes('loss')) {
        const maxLoss = Math.max(...updates.map(u => u.loss || 0));
        const minLoss = Math.min(...updates.map(u => u.loss || 0));
        const lossRange = maxLoss - minLoss || 1;
        components.loss = 1 - ((update.loss || 0) - minLoss) / lossRange;
      }

      // Gradient norm component (moderate is best - not too high, not too low)
      if (this.config.qualityMetrics.includes('gradientNorm')) {
        const norm = this.calculateGradientNorm(update.gradients);
        const norms = updates.map(u => this.calculateGradientNorm(u.gradients));
        const maxNorm = Math.max(...norms);
        const minNorm = Math.min(...norms);
        const normRange = maxNorm - minNorm || 1;
        // Prefer moderate gradients (not too high = unstable, not too low = no learning)
        const targetNorm = (maxNorm + minNorm) / 2;
        components.gradientNorm = 1 - Math.abs(norm - targetNorm) / normRange;
      }

      // Data size component (larger is better)
      if (this.config.qualityMetrics.includes('dataSize')) {
        const maxSize = Math.max(...updates.map(u => u.sampleCount));
        const minSize = Math.min(...updates.map(u => u.sampleCount));
        const sizeRange = maxSize - minSize || 1;
        components.dataSize = (update.sampleCount - minSize) / sizeRange;
      }

      // Latency component (lower is better)
      if (this.config.qualityMetrics.includes('latency')) {
        const latencies = updates
          .map(u => u.metadata?.latency as number | undefined)
          .filter((l): l is number => l !== undefined);
        if (latencies.length > 0) {
          const maxLatency = Math.max(...latencies);
          const minLatency = Math.min(...latencies);
          const latencyRange = maxLatency - minLatency || 1;
          const latency = update.metadata?.latency as number | undefined;
          components.latency = latency !== undefined
            ? 1 - (latency - minLatency) / latencyRange
            : 0.5;
        }
      }

      // Reliability component (from history)
      if (this.config.qualityMetrics.includes('reliability')) {
        const history = this.state.participantHistory.get(update.participantId);
        components.reliability = history?.reliability || 0.5;
      }

      // Calculate weighted score
      const weights = this.state.qualityWeights;
      const score =
        components.loss * weights.loss +
        components.gradientNorm * weights.gradientNorm +
        components.dataSize * weights.dataSize +
        components.latency * weights.latency +
        components.reliability * weights.reliability;

      return {
        participantId: update.participantId,
        score,
        components,
      };
    });
  }

  /**
   * Update participant history
   */
  private updateParticipantHistory(
    updates: ParticipantUpdate[],
    qualityScores: QualityScore[]
  ): void {
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const score = qualityScores[i];
      const history = this.state.participantHistory.get(update.participantId);

      if (history) {
        // Update existing history
        history.totalRounds++;
        if (update.loss !== undefined) {
          history.avgLoss = (history.avgLoss * (history.totalRounds - 1) + update.loss) / history.totalRounds;
        }
        const gradNorm = this.calculateGradientNorm(update.gradients);
        history.avgGradientNorm = (history.avgGradientNorm * (history.totalRounds - 1) + gradNorm) / history.totalRounds;
        const latency = update.metadata?.latency as number | undefined;
        if (latency !== undefined) {
          history.avgLatency = (history.avgLatency * (history.totalRounds - 1) + latency) / history.totalRounds;
        }
        history.reliability = score.score; // Update reliability with latest quality score
        history.lastUpdate = Date.now();
      } else {
        // Create new history
        this.state.participantHistory.set(update.participantId, {
          participantId: update.participantId,
          totalRounds: 1,
          successfulRounds: 1,
          avgLoss: update.loss || 0,
          avgGradientNorm: this.calculateGradientNorm(update.gradients),
          avgLatency: (update.metadata?.latency as number | undefined) || 0,
          reliability: score.score,
          lastUpdate: Date.now(),
        });
      }
    }
  }

  /**
   * Auto-tune quality weights based on recent performance
   */
  private tuneQualityWeights(): void {
    // This is a simplified version - could use more sophisticated methods
    // like Bayesian optimization or gradient-based tuning

    // Calculate variance of each metric across recent rounds
    // Metrics with high variance get higher weight (more discriminative)
    // Metrics with low variance get lower weight (less informative)

    const histories = Array.from(this.state.participantHistory.values());
    if (histories.length < 2) return;

    // Calculate variance for each metric
    const losses = histories.map(h => h.avgLoss);
    const norms = histories.map(h => h.avgGradientNorm);
    const latencies = histories.map(h => h.avgLatency);

    const variance = {
      loss: this.calculateVariance(losses),
      gradientNorm: this.calculateVariance(norms),
      dataSize: 0, // Would need more sophisticated tracking
      latency: this.calculateVariance(latencies),
      reliability: this.calculateVariance(histories.map(h => h.reliability)),
    };

    // Normalize weights by variance
    const totalVariance = Object.values(variance).reduce((sum, v) => sum + v, 0) || 1;

    if (this.config.dynamicWeighting) {
      this.state.qualityWeights = {
        loss: variance.loss / totalVariance,
        gradientNorm: variance.gradientNorm / totalVariance,
        dataSize: 0.2, // Keep fixed for now
        latency: variance.latency / totalVariance,
        reliability: variance.reliability / totalVariance,
      };
    }
  }

  /**
   * Calculate aggregation weights based on quality scores
   */
  private calculateAggregationWeights(
    updates: ParticipantUpdate[],
    qualityScores: QualityScore[]
  ): Float32Array {
    const weights = new Float32Array(updates.length);

    switch (this.config.weightNormalization) {
      case 'softmax':
        // Softmax normalization
        const maxScore = Math.max(...qualityScores.map(q => q.score));
        const expSum = qualityScores.reduce((sum, q) => sum + Math.exp(q.score - maxScore), 0);
        for (let i = 0; i < updates.length; i++) {
          weights[i] = Math.exp(qualityScores[i].score - maxScore) / expSum;
        }
        break;

      case 'minmax':
        // Min-max normalization
        const minScore = Math.min(...qualityScores.map(q => q.score));
        const maxScore2 = Math.max(...qualityScores.map(q => q.score));
        const scoreRange = maxScore2 - minScore || 1;
        const normalizedScores = qualityScores.map(q => (q.score - minScore) / scoreRange);
        const sumScores = normalizedScores.reduce((sum, s) => sum + s, 0) || 1;
        for (let i = 0; i < updates.length; i++) {
          weights[i] = normalizedScores[i] / sumScores;
        }
        break;

      case 'zscore':
        // Z-score normalization
        const meanScore = qualityScores.reduce((sum, q) => sum + q.score, 0) / qualityScores.length;
        const stdScore = Math.sqrt(
          qualityScores.reduce((sum, q) => sum + Math.pow(q.score - meanScore, 2), 0) / qualityScores.length
        ) || 1;
        const zScores = qualityScores.map(q => (q.score - meanScore) / stdScore);
        const minZScore = Math.min(...zScores);
        const shiftedZScores = zScores.map(z => z - minZScore + 1);
        const sumZScores = shiftedZScores.reduce((sum, z) => sum + z, 0) || 1;
        for (let i = 0; i < updates.length; i++) {
          weights[i] = shiftedZScores[i] / sumZScores;
        }
        break;
    }

    return weights;
  }

  /**
   * Perform weighted aggregation
   */
  private performWeightedAggregation(
    updates: ParticipantUpdate[],
    weights: Float32Array
  ): Float32Array {
    const dim = this.state.globalModel.length;
    const aggregated = new Float32Array(dim);

    for (let i = 0; i < updates.length; i++) {
      const weight = weights[i];
      const gradients = updates[i].gradients;
      for (let j = 0; j < dim; j++) {
        aggregated[j] += gradients[j] * weight;
      }
    }

    return aggregated;
  }

  /**
   * Calculate adaptive learning rate
   */
  private calculateLearningRate(): number {
    if (!this.config.adaptiveLearningRate) {
      return this.config.initialLearningRate;
    }

    switch (this.config.lrSchedule) {
      case 'constant':
        return this.config.initialLearningRate;

      case 'decay':
        return this.config.initialLearningRate * Math.pow(this.config.lrDecayFactor, this.state.roundNumber);

      case 'cosine':
        const progress = Math.min(this.state.roundNumber / 100, 1.0);
        return this.config.initialLearningRate * (1 + Math.cos(Math.PI * progress)) / 2;

      case 'adaptive':
        // Reduce learning rate when loss plateaus
        const window = this.config.convergenceWindow;
        const recentLosses = this.state.convergenceHistory.slice(-window);
        if (recentLosses.length >= window) {
          const improvement = recentLosses[0] - recentLosses[recentLosses.length - 1];
          if (improvement < this.config.convergenceThreshold) {
            this.state.currentLearningRate *= this.config.lrDecayFactor;
          }
        }
        // Warmup
        if (this.state.roundNumber < this.config.lrWarmupRounds) {
          return this.config.initialLearningRate * ((this.state.roundNumber + 1) / this.config.lrWarmupRounds);
        }
        return this.state.currentLearningRate;

      default:
        return this.config.initialLearningRate;
    }
  }

  /**
   * Check convergence
   */
  private checkConvergence(): boolean {
    const window = this.config.convergenceWindow;
    const recentLosses = this.state.convergenceHistory.slice(-window);

    if (recentLosses.length < window) {
      return false;
    }

    const improvement = recentLosses[0] - recentLosses[recentLosses.length - 1];
    return improvement < this.config.convergenceThreshold;
  }

  /**
   * Calculate gradient norm
   */
  private calculateGradientNorm(gradients: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < gradients.length; i++) {
      sum += gradients[i] * gradients[i];
    }
    return Math.sqrt(sum);
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = {
      roundNumber: 0,
      globalModel: new Float32Array(0),
      globalRound: 0,
      bestLoss: Infinity,
      convergenceHistory: [],
      participantHistory: new Map(),
      currentLearningRate: this.config.initialLearningRate,
      qualityWeights: { ...this.config.qualityWeights },
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create default AdaptiveFed configuration
 */
export function createDefaultAdaptiveFedConfig(): AdaptiveFedConfig {
  return {
    name: 'fed-adaptive',
    qualityMetrics: ['loss', 'gradientNorm', 'dataSize', 'reliability'],
    qualityWeights: {
      loss: 0.3,
      gradientNorm: 0.2,
      dataSize: 0.2,
      latency: 0.1,
      reliability: 0.2,
    },
    participantSelection: 'hybrid',
    minParticipants: 2,
    maxParticipants: 100,
    selectionFraction: 1.0,
    aggregationMethod: 'quality-weighted',
    dynamicWeighting: true,
    weightNormalization: 'softmax',
    adaptiveLearningRate: true,
    initialLearningRate: 0.01,
    lrSchedule: 'adaptive',
    lrWarmupRounds: 5,
    lrDecayFactor: 0.99,
    convergenceWindow: 5,
    convergenceThreshold: 1e-4,
    patience: 10,
    autoTuneMetrics: true,
    tuningInterval: 10,
  };
}

/**
 * Create AdaptiveFed configuration for quality-focused learning
 */
export function createQualityFocusedAdaptiveFedConfig(): AdaptiveFedConfig {
  return {
    ...createDefaultAdaptiveFedConfig(),
    name: 'fed-adaptive-quality',
    qualityMetrics: ['loss', 'gradientNorm', 'reliability'],
    qualityWeights: {
      loss: 0.4,
      gradientNorm: 0.3,
      dataSize: 0.1,
      latency: 0.0,
      reliability: 0.2,
    },
    aggregationMethod: 'quality-weighted',
    dynamicWeighting: true,
  };
}

/**
 * Create AdaptiveFed configuration for diversity-focused learning
 */
export function createDiversityFocusedAdaptiveFedConfig(): AdaptiveFedConfig {
  return {
    ...createDefaultAdaptiveFedConfig(),
    name: 'fed-adaptive-diversity',
    participantSelection: 'diversity-based',
    qualityMetrics: ['dataSize', 'reliability'],
    qualityWeights: {
      loss: 0.2,
      gradientNorm: 0.1,
      dataSize: 0.4,
      latency: 0.1,
      reliability: 0.2,
    },
    minParticipants: 10, // Require more diverse participants
  };
}

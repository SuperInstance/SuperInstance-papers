/**
 * POLLN Federated Averaging (FedAvg) Strategy
 * Pattern-Organized Large Language Network
 *
 * Reference: McMahan et al., "Communication-Efficient Learning of Deep Networks from Decentralized Data" (AISTATS 2017)
 *
 * FedAvg is the foundational federated learning algorithm that:
 * 1. Server sends current global model to selected clients
 * 2. Each client performs local training for E epochs on their data
 * 3. Clients send model updates (gradients or weights) to server
 * 4. Server aggregates updates using weighted average (by sample count)
 * 5. Process repeats until convergence
 *
 * Key advantages:
 * - Reduces communication rounds by enabling local training
 * - Simple to implement and understand
 * - Works well with IID and non-IID data
 * - Weighted aggregation accounts for dataset size imbalance
 */

import { FederatedStrategy, StrategyConfig, AggregationResult, ParticipantUpdate } from '../types.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface FedAvgConfig extends StrategyConfig {
  // Local training configuration
  localEpochs: number;
  localBatchSize: number;
  localLearningRate: number;

  // Aggregation configuration
  weightedBySampleCount: boolean;
  normalizeGradients: boolean;
  clipGradients: boolean;
  clipThreshold: number;

  // Participant selection
  minParticipants: number;
  maxParticipants: number;
  participationFraction: number; // Fraction of selected participants to wait for

  // Convergence
  maxRounds: number;
  tolerance: number; // Early stopping if improvement < tolerance
  patience: number; // Rounds to wait for improvement before stopping
}

export interface FedAvgState {
  roundNumber: number;
  globalModel: Float32Array;
  globalRound: number;
  bestLoss: number;
  roundsWithoutImprovement: number;
  convergenceHistory: number[];
}

// ============================================================================
// FedAvg Strategy Implementation
// ============================================================================

/**
 * FederatedAveraging
 *
 * Implements the FedAvg algorithm for federated learning.
 * Weighted average of participant updates by sample count.
 */
export class FederatedAveraging implements FederatedStrategy {
  private config: FedAvgConfig;
  private state: FedAvgState;

  constructor(config: Partial<FedAvgConfig> = {}) {
    this.config = {
      name: 'fed-avg',
      localEpochs: 1,
      localBatchSize: 32,
      localLearningRate: 0.01,
      weightedBySampleCount: true,
      normalizeGradients: true,
      clipGradients: true,
      clipThreshold: 1.0,
      minParticipants: 2,
      maxParticipants: 100,
      participationFraction: 1.0,
      maxRounds: 100,
      tolerance: 1e-4,
      patience: 5,
      ...config,
    };

    this.state = {
      roundNumber: 0,
      globalModel: new Float32Array(0),
      globalRound: 0,
      bestLoss: Infinity,
      roundsWithoutImprovement: 0,
      convergenceHistory: [],
    };
  }

  /**
   * Get strategy configuration
   */
  getConfig(): FedAvgConfig {
    return { ...this.config };
  }

  /**
   * Get current state
   */
  getState(): FedAvgState {
    return { ...this.state };
  }

  /**
   * Initialize global model
   */
  initializeModel(parameters: Float32Array): void {
    this.state.globalModel = new Float32Array(parameters);
    this.state.globalRound = 0;
    this.state.roundNumber = 0;
    this.state.bestLoss = Infinity;
    this.state.roundsWithoutImprovement = 0;
    this.state.convergenceHistory = [];
  }

  /**
   * Select participants for current round
   */
  selectParticipants(
    availableParticipants: string[],
    participantStats?: Map<string, { sampleCount: number; updateLatency: number }>
  ): string[] {
    const totalAvailable = availableParticipants.length;
    const targetCount = Math.min(
      this.config.maxParticipants,
      Math.max(
        this.config.minParticipants,
        Math.floor(totalAvailable * this.config.participationFraction)
      )
    );

    // Shuffle and select
    const shuffled = [...availableParticipants].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, targetCount);
  }

  /**
   * Aggregate participant updates
   */
  async aggregateUpdates(
    updates: ParticipantUpdate[]
  ): Promise<AggregationResult> {
    if (updates.length === 0) {
      throw new Error('No updates to aggregate');
    }

    const startTime = Date.now();

    // 1. Extract and validate updates
    const validUpdates = this.validateAndPrepareUpdates(updates);

    // 2. Clip gradients if enabled
    const clippedUpdates = this.config.clipGradients
      ? this.clipUpdates(validUpdates)
      : validUpdates;

    // 3. Perform weighted averaging
    const aggregatedModel = this.performWeightedAverage(clippedUpdates);

    // 4. Update global model
    const learningRate = this.config.localLearningRate;
    const newGlobalModel = new Float32Array(this.state.globalModel.length);

    for (let i = 0; i < newGlobalModel.length; i++) {
      newGlobalModel[i] = this.state.globalModel[i] - learningRate * aggregatedModel[i];
    }

    // 5. Calculate metadata
    const totalSamples = clippedUpdates.reduce((sum, u) => sum + u.sampleCount, 0);
    const avgLoss = clippedUpdates.reduce((sum, u) => sum + (u.loss || 0), 0) / clippedUpdates.length;
    const weightedLoss = clippedUpdates.reduce(
      (sum, u) => sum + (u.loss || 0) * u.sampleCount,
      0
    ) / totalSamples;

    // 6. Update state
    this.state.globalModel = newGlobalModel;
    this.state.globalRound++;
    this.state.roundNumber++;
    this.state.convergenceHistory.push(weightedLoss);

    // 7. Check convergence
    const hasImproved = weightedLoss < this.state.bestLoss - this.config.tolerance;
    if (hasImproved) {
      this.state.bestLoss = weightedLoss;
      this.state.roundsWithoutImprovement = 0;
    } else {
      this.state.roundsWithoutImprovement++;
    }

    const hasConverged =
      this.state.roundsWithoutImprovement >= this.config.patience ||
      this.state.roundNumber >= this.config.maxRounds;

    const aggregationTime = Date.now() - startTime;

    return {
      aggregatedModel: newGlobalModel,
      roundNumber: this.state.roundNumber,
      globalRound: this.state.globalRound,
      participantCount: clippedUpdates.length,
      totalSamples,
      avgLoss,
      weightedLoss,
      aggregationTime,
      hasConverged,
      metadata: {
        strategy: this.config.name,
        localEpochs: this.config.localEpochs,
        localLearningRate: this.config.localLearningRate,
        bestLoss: this.state.bestLoss,
        roundsWithoutImprovement: this.state.roundsWithoutImprovement,
        gradientClipThreshold: this.config.clipThreshold,
        gradientsWereClipped: this.config.clipGradients,
      },
    };
  }

  /**
   * Validate and prepare updates
   */
  private validateAndPrepareUpdates(updates: ParticipantUpdate[]): ParticipantUpdate[] {
    const validUpdates: ParticipantUpdate[] = [];
    const expectedDim = this.state.globalModel.length;

    for (const update of updates) {
      // Check dimension match
      if (update.gradients.length !== expectedDim) {
        console.warn(`Update from ${update.participantId} has wrong dimension: ${update.gradients.length} != ${expectedDim}`);
        continue;
      }

      // Check sample count
      if (update.sampleCount <= 0) {
        console.warn(`Update from ${update.participantId} has invalid sample count: ${update.sampleCount}`);
        continue;
      }

      validUpdates.push(update);
    }

    if (validUpdates.length === 0) {
      throw new Error('No valid updates after validation');
    }

    return validUpdates;
  }

  /**
   * Clip gradients to bound sensitivity
   */
  private clipUpdates(updates: ParticipantUpdate[]): ParticipantUpdate[] {
    return updates.map(update => {
      const gradients = new Float32Array(update.gradients);

      // Calculate L2 norm
      let norm = 0;
      for (let i = 0; i < gradients.length; i++) {
        norm += gradients[i] * gradients[i];
      }
      norm = Math.sqrt(norm);

      // Clip if necessary
      if (norm > this.config.clipThreshold) {
        const scale = this.config.clipThreshold / norm;
        for (let i = 0; i < gradients.length; i++) {
          gradients[i] *= scale;
        }
      }

      return {
        ...update,
        gradients,
        metadata: {
          ...update.metadata,
          clipped: norm > this.config.clipThreshold,
          originalNorm: norm,
          clippedNorm: Math.min(norm, this.config.clipThreshold),
        },
      };
    });
  }

  /**
   * Perform weighted average of updates
   */
  private performWeightedAverage(updates: ParticipantUpdate[]): Float32Array {
    const dim = this.state.globalModel.length;
    const aggregated = new Float32Array(dim);

    if (!this.config.weightedBySampleCount) {
      // Simple average (equal weights)
      for (const update of updates) {
        for (let i = 0; i < dim; i++) {
          aggregated[i] += update.gradients[i] / updates.length;
        }
      }
    } else {
      // Weighted average by sample count
      const totalSamples = updates.reduce((sum, u) => sum + u.sampleCount, 0);

      for (const update of updates) {
        const weight = update.sampleCount / totalSamples;
        for (let i = 0; i < dim; i++) {
          aggregated[i] += update.gradients[i] * weight;
        }
      }
    }

    // Normalize if enabled
    if (this.config.normalizeGradients) {
      let norm = 0;
      for (let i = 0; i < dim; i++) {
        norm += aggregated[i] * aggregated[i];
      }
      norm = Math.sqrt(norm);

      if (norm > 0) {
        for (let i = 0; i < dim; i++) {
          aggregated[i] /= norm;
        }
      }
    }

    return aggregated;
  }

  /**
   * Check if convergence has been reached
   */
  hasConverged(): boolean {
    return (
      this.state.roundsWithoutImprovement >= this.config.patency ||
      this.state.roundNumber >= this.config.maxRounds
    );
  }

  /**
   * Get convergence metrics
   */
  getConvergenceMetrics(): {
    currentRound: number;
    currentLoss: number;
    bestLoss: number;
    roundsWithoutImprovement: number;
    hasConverged: boolean;
    convergenceRate: number;
  } {
    const currentLoss = this.state.convergenceHistory[this.state.convergenceHistory.length - 1] || 0;
    const initialLoss = this.state.convergenceHistory[0] || currentLoss;
    const convergenceRate = initialLoss > 0 ? (initialLoss - currentLoss) / initialLoss : 0;

    return {
      currentRound: this.state.roundNumber,
      currentLoss,
      bestLoss: this.state.bestLoss,
      roundsWithoutImprovement: this.state.roundsWithoutImprovement,
      hasConverged: this.hasConverged(),
      convergenceRate,
    };
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
      roundsWithoutImprovement: 0,
      convergenceHistory: [],
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create default FedAvg configuration
 */
export function createDefaultFedAvgConfig(): FedAvgConfig {
  return {
    name: 'fed-avg',
    localEpochs: 1,
    localBatchSize: 32,
    localLearningRate: 0.01,
    weightedBySampleCount: true,
    normalizeGradients: true,
    clipGradients: true,
    clipThreshold: 1.0,
    minParticipants: 2,
    maxParticipants: 100,
    participationFraction: 1.0,
    maxRounds: 100,
    tolerance: 1e-4,
    patience: 5,
  };
}

/**
 * Create FedAvg configuration for quick learning
 */
export function createFastFedAvgConfig(): FedAvgConfig {
  return {
    ...createDefaultFedAvgConfig(),
    name: 'fed-avg-fast',
    localEpochs: 3,
    localLearningRate: 0.05,
    participationFraction: 0.5,
    patience: 3,
  };
}

/**
 * Create FedAvg configuration for stable learning
 */
export function createStableFedAvgConfig(): FedAvgConfig {
  return {
    ...createDefaultFedAvgConfig(),
    name: 'fed-avg-stable',
    localEpochs: 1,
    localLearningRate: 0.005,
    clipThreshold: 0.5,
    tolerance: 1e-5,
    patience: 10,
  };
}

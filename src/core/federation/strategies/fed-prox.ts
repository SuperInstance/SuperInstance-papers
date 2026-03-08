/**
 * POLLN Federated Proximal (FedProx) Strategy
 * Pattern-Organized Large Language Network
 *
 * Reference: Li et al., "Federated Optimization in Heterogeneous Networks" (MLSys 2020)
 *
 * FedProx addresses the challenge of heterogeneous data distribution across clients
 * by adding a proximal term to the local objective function. This prevents each
 * client's local model from drifting too far from the global model.
 *
 * Key innovations:
 * 1. Proximal term: μ/2 * ||w - w_global||²
 * 2. Handles stragglers gracefully (partial participation is OK)
 * 3. Reduces communication overhead with variable local epochs
 * 4. More robust to non-IID data than FedAvg
 *
 * The proximal term acts as a regularizer that keeps local updates close to
 * the global model, preventing the "client drift" problem that occurs when
 * data is highly heterogeneous across clients.
 */

import { FederatedStrategy, StrategyConfig, AggregationResult, ParticipantUpdate } from '../types.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface FedProxConfig extends StrategyConfig {
  // Proximal term configuration
  mu: number; // Proximal term coefficient (typical values: 0.01 - 1.0)

  // Local training configuration
  localEpochs: number;
  localBatchSize: number;
  localLearningRate: number;

  // Aggregation configuration
  weightedBySampleCount: boolean;
  normalizeGradients: boolean;
  clipGradients: boolean;
  clipThreshold: number;

  // Straggler handling
  minParticipants: number;
  maxParticipants: number;
  participationFraction: number;
  stragglerThreshold: number; // Seconds to wait before considering a client a straggler
  stragglerHandling: 'drop' | 'wait' | 'use-partial';

  // Convergence
  maxRounds: number;
  tolerance: number;
  patience: number;
}

export interface FedProxState {
  roundNumber: number;
  globalModel: Float32Array;
  globalRound: number;
  bestLoss: number;
  roundsWithoutImprovement: number;
  convergenceHistory: number[];
  proximalTermHistory: number[];
  stragglerCount: number;
}

// ============================================================================
// FedProx Strategy Implementation
// ============================================================================

/**
 * FederatedProximal
 *
 * Implements the FedProx algorithm with proximal term for handling
 * heterogeneous data and stragglers.
 */
export class FederatedProximal implements FederatedStrategy {
  private config: FedProxConfig;
  private state: FedProxState;

  constructor(config: Partial<FedProxConfig> = {}) {
    this.config = {
      name: 'fed-prox',
      mu: 0.01, // Default proximal term coefficient
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
      stragglerThreshold: 300, // 5 minutes
      stragglerHandling: 'drop',
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
      proximalTermHistory: [],
      stragglerCount: 0,
    };
  }

  /**
   * Get strategy configuration
   */
  getConfig(): FedProxConfig {
    return { ...this.config };
  }

  /**
   * Get current state
   */
  getState(): FedProxState {
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
    this.state.proximalTermHistory = [];
    this.state.stragglerCount = 0;
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

    // Prefer participants with lower latency (less likely to be stragglers)
    if (participantStats) {
      const sorted = [...availableParticipants].sort((a, b) => {
        const statsA = participantStats.get(a);
        const statsB = participantStats.get(b);
        const latencyA = statsA?.updateLatency || 0;
        const latencyB = statsB?.updateLatency || 0;
        return latencyA - latencyB;
      });
      return sorted.slice(0, targetCount);
    }

    // Random selection if no stats available
    const shuffled = [...availableParticipants].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, targetCount);
  }

  /**
   * Aggregate participant updates with proximal term
   */
  async aggregateUpdates(
    updates: ParticipantUpdate[]
  ): Promise<AggregationResult> {
    if (updates.length === 0) {
      throw new Error('No updates to aggregate');
    }

    const startTime = Date.now();

    // 1. Identify and handle stragglers
    const { validUpdates, stragglers } = this.identifyStragglers(updates);
    this.state.stragglerCount += stragglers.length;

    if (validUpdates.length < this.config.minParticipants) {
      throw new Error(
        `Insufficient participants after straggler handling: ${validUpdates.length} < ${this.config.minParticipants}`
      );
    }

    // 2. Extract and validate updates
    const preparedUpdates = this.validateAndPrepareUpdates(validUpdates);

    // 3. Clip gradients if enabled
    const clippedUpdates = this.config.clipGradients
      ? this.clipUpdates(preparedUpdates)
      : preparedUpdates;

    // 4. Apply proximal term correction
    const proximalUpdates = this.applyProximalTerm(clippedUpdates);

    // 5. Perform weighted averaging
    const aggregatedModel = this.performWeightedAverage(proximalUpdates);

    // 6. Update global model
    const learningRate = this.config.localLearningRate;
    const newGlobalModel = new Float32Array(this.state.globalModel.length);

    for (let i = 0; i < newGlobalModel.length; i++) {
      newGlobalModel[i] = this.state.globalModel[i] - learningRate * aggregatedModel[i];
    }

    // 7. Calculate metadata
    const totalSamples = clippedUpdates.reduce((sum, u) => sum + u.sampleCount, 0);
    const avgLoss = clippedUpdates.reduce((sum, u) => sum + (u.loss || 0), 0) / clippedUpdates.length;
    const weightedLoss = clippedUpdates.reduce(
      (sum, u) => sum + (u.loss || 0) * u.sampleCount,
      0
    ) / totalSamples;

    // Calculate average proximal term magnitude
    const avgProximalTerm = proximalUpdates.reduce(
      (sum, u) => sum + (u.metadata?.proximalTerm || 0),
      0
    ) / proximalUpdates.length;

    // 8. Update state
    this.state.globalModel = newGlobalModel;
    this.state.globalRound++;
    this.state.roundNumber++;
    this.state.convergenceHistory.push(weightedLoss);
    this.state.proximalTermHistory.push(avgProximalTerm);

    // 9. Check convergence
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
        mu: this.config.mu,
        localEpochs: this.config.localEpochs,
        localLearningRate: this.config.localLearningRate,
        bestLoss: this.state.bestLoss,
        roundsWithoutImprovement: this.state.roundsWithoutImprovement,
        avgProximalTerm,
        stragglerCount: stragglers.length,
        gradientClipThreshold: this.config.clipThreshold,
        gradientsWereClipped: this.config.clipGradients,
      },
    };
  }

  /**
   * Identify stragglers based on timing
   */
  private identifyStragglers(updates: ParticipantUpdate[]): {
    validUpdates: ParticipantUpdate[];
    stragglers: ParticipantUpdate[];
  } {
    const now = Date.now();
    const validUpdates: ParticipantUpdate[] = [];
    const stragglers: ParticipantUpdate[] = [];

    for (const update of updates) {
      const updateTime = update.metadata?.timestamp || 0;
      const elapsed = (now - updateTime) / 1000; // Convert to seconds

      if (elapsed > this.config.stragglerThreshold) {
        switch (this.config.stragglerHandling) {
          case 'drop':
            stragglers.push(update);
            break;
          case 'wait':
            // Still use the update but mark as straggler
            validUpdates.push(update);
            stragglers.push(update);
            break;
          case 'use-partial':
            // Use partial update with reduced weight
            validUpdates.push({
              ...update,
              sampleCount: Math.floor(update.sampleCount * 0.5),
              metadata: {
                ...update.metadata,
                straggler: true,
                weightReduction: 0.5,
              },
            });
            break;
        }
      } else {
        validUpdates.push(update);
      }
    }

    return { validUpdates, stragglers };
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
   * Apply proximal term correction to gradients
   *
   * The proximal term is: μ/2 * ||w - w_global||²
   * Its gradient is: μ * (w - w_global)
   *
   * We add this to the local gradients before aggregation
   */
  private applyProximalTerm(updates: ParticipantUpdate[]): ParticipantUpdate[] {
    const mu = this.config.mu;
    const globalModel = this.state.globalModel;

    return updates.map(update => {
      const correctedGradients = new Float32Array(update.gradients);

      // Get local model parameters (if available)
      const localModel = update.metadata?.localModel || new Float32Array(globalModel);

      // Add proximal term gradient: μ * (w_local - w_global)
      let proximalTerm = 0;
      for (let i = 0; i < correctedGradients.length; i++) {
        const proximalGradient = mu * (localModel[i] - globalModel[i]);
        correctedGradients[i] += proximalGradient;
        proximalTerm += Math.abs(proximalGradient);
      }

      // Average proximal term magnitude
      proximalTerm /= correctedGradients.length;

      return {
        ...update,
        gradients: correctedGradients,
        metadata: {
          ...update.metadata,
          proximalTerm,
          mu,
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
      this.state.roundsWithoutImprovement >= this.config.patience ||
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
    avgProximalTerm: number;
    stragglerRate: number;
  } {
    const currentLoss = this.state.convergenceHistory[this.state.convergenceHistory.length - 1] || 0;
    const initialLoss = this.state.convergenceHistory[0] || currentLoss;
    const convergenceRate = initialLoss > 0 ? (initialLoss - currentLoss) / initialLoss : 0;
    const avgProximalTerm = this.state.proximalTermHistory.length > 0
      ? this.state.proximalTermHistory.reduce((sum, v) => sum + v, 0) / this.state.proximalTermHistory.length
      : 0;
    const stragglerRate = this.state.roundNumber > 0
      ? this.state.stragglerCount / this.state.roundNumber
      : 0;

    return {
      currentRound: this.state.roundNumber,
      currentLoss,
      bestLoss: this.state.bestLoss,
      roundsWithoutImprovement: this.state.roundsWithoutImprovement,
      hasConverged: this.hasConverged(),
      convergenceRate,
      avgProximalTerm,
      stragglerRate,
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
      proximalTermHistory: [],
      stragglerCount: 0,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create default FedProx configuration
 */
export function createDefaultFedProxConfig(): FedProxConfig {
  return {
    name: 'fed-prox',
    mu: 0.01,
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
    stragglerThreshold: 300,
    stragglerHandling: 'drop',
    maxRounds: 100,
    tolerance: 1e-4,
    patience: 5,
  };
}

/**
 * Create FedProx configuration for high heterogeneity
 */
export function createHeterogeneousFedProxConfig(): FedProxConfig {
  return {
    ...createDefaultFedProxConfig(),
    name: 'fed-prox-heterogeneous',
    mu: 0.1, // Higher proximal term for more heterogeneity
    localEpochs: 5, // More local epochs to handle non-IID data
    stragglerHandling: 'use-partial',
    tolerance: 1e-5,
    patience: 8,
  };
}

/**
 * Create FedProx configuration for low heterogeneity
 */
export function createHomogeneousFedProxConfig(): FedProxConfig {
  return {
    ...createDefaultFedProxConfig(),
    name: 'fed-prox-homogeneous',
    mu: 0.001, // Lower proximal term for less heterogeneity
    localEpochs: 1,
    stragglerHandling: 'wait',
    tolerance: 1e-4,
    patience: 5,
  };
}

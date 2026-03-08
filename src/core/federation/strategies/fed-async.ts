/**
 * POLLN Asynchronous Federated Learning Strategy
 * Pattern-Organized Large Language Network
 *
 * References:
 * - Xie et al., "Asynchronous Federated Optimization" (ICLR 2020)
 * - Nguyen et al., "Asynchronous Federated Learning with Geometrically Converging Models" (2020)
 *
 * AsyncFed addresses the bottleneck of synchronous federated learning where
 * the server must wait for the slowest (straggler) clients. Instead, it processes
 * updates as they arrive, leading to faster training and better resource utilization.
 *
 * Key features:
 * 1. Asynchronous aggregation - process updates immediately upon arrival
 * 2. Staleness-aware weighting - down-weight updates from older global models
 * 3. Buffer-based updates - maintain a buffer of recent updates
 * 4. Versioning - track model versions to handle concurrent updates
 * 5. Convergence guarantees - bounded staleness for convergence
 *
 * Trade-offs:
 * - Faster training (no waiting for stragglers)
 * - Better resource utilization
 * - More complex synchronization
 * - Potential for staleness divergence (mitigated by staleness-aware weighting)
 */

import { FederatedStrategy, StrategyConfig, AggregationResult, ParticipantUpdate } from '../types.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AsyncFedConfig extends StrategyConfig {
  // Buffer configuration
  bufferSize: number; // Number of updates to keep in buffer
  bufferStrategy: 'fifo' | 'lifo' | 'priority';

  // Staleness handling
  stalenessThreshold: number; // Maximum version difference to accept
  stalenessWeighting: 'uniform' | 'linear' | 'exponential';
  stalenessDecay: number; // Decay factor for staleness weighting

  // Aggregation configuration
  minBufferSize: number; // Minimum updates before aggregation
  maxBufferSize: number; // Maximum updates to aggregate at once
  aggregationTrigger: 'timer' | 'count' | 'hybrid';
  aggregationInterval: number; // Milliseconds
  aggregationCount: number; // Number of updates to trigger aggregation

  // Model versioning
  versioningEnabled: boolean;
  maxConcurrentVersions: number;

  // Learning rate
  localLearningRate: number;
  adaptiveLearningRate: boolean;
  lrDecay: number;
}

export interface AsyncFedState {
  globalModel: Float32Array;
  globalVersion: number;
  updateBuffer: BufferedUpdate[];
  totalUpdatesReceived: number;
  totalUpdatesProcessed: number;
  stalenessHistory: number[];
  convergenceHistory: number[];
  bestLoss: number;
}

export interface BufferedUpdate {
  participantId: string;
  gradients: Float32Array;
  sampleCount: number;
  loss?: number;
  version: number;
  staleness: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AsyncFed Strategy Implementation
// ============================================================================

/**
 * AsynchronousFederated
 *
 * Implements asynchronous federated learning with staleness-aware weighting.
 */
export class AsynchronousFederated implements FederatedStrategy {
  private config: AsyncFedConfig;
  private state: AsyncFedState;
  private lastAggregationTime: number = 0;
  private aggregationTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<AsyncFedConfig> = {}) {
    this.config = {
      name: 'fed-async',
      bufferSize: 100,
      bufferStrategy: 'fifo',
      stalenessThreshold: 5,
      stalenessWeighting: 'linear',
      stalenessDecay: 0.5,
      minBufferSize: 2,
      maxBufferSize: 50,
      aggregationTrigger: 'hybrid',
      aggregationInterval: 5000, // 5 seconds
      aggregationCount: 10,
      versioningEnabled: true,
      maxConcurrentVersions: 10,
      localLearningRate: 0.01,
      adaptiveLearningRate: true,
      lrDecay: 0.995,
      ...config,
    };

    this.state = {
      globalModel: new Float32Array(0),
      globalVersion: 0,
      updateBuffer: [],
      totalUpdatesReceived: 0,
      totalUpdatesProcessed: 0,
      stalenessHistory: [],
      convergenceHistory: [],
      bestLoss: Infinity,
    };
  }

  /**
   * Get strategy configuration
   */
  getConfig(): AsyncFedConfig {
    return { ...this.config };
  }

  /**
   * Get current state
   */
  getState(): AsyncFedState {
    return { ...this.state };
  }

  /**
   * Initialize global model
   */
  initializeModel(parameters: Float32Array): void {
    this.state.globalModel = new Float32Array(parameters);
    this.state.globalVersion = 0;
    this.state.updateBuffer = [];
    this.state.totalUpdatesReceived = 0;
    this.state.totalUpdatesProcessed = 0;
    this.state.stalenessHistory = [];
    this.state.convergenceHistory = [];
    this.state.bestLoss = Infinity;
    this.lastAggregationTime = Date.now();
  }

  /**
   * Select participants (not used in async - all can participate)
   */
  selectParticipants(
    availableParticipants: string[],
    _participantStats?: Map<string, { sampleCount: number; updateLatency: number }>
  ): string[] {
    // In async mode, all available participants can send updates
    return availableParticipants;
  }

  /**
   * Add update to buffer (called when update arrives)
   */
  addUpdateToBuffer(update: ParticipantUpdate): void {
    // Calculate staleness
    const updateVersion = update.metadata?.version || 0;
    const staleness = this.state.globalVersion - updateVersion;

    // Check staleness threshold
    if (staleness > this.config.stalenessThreshold) {
      console.warn(
        `Update from ${update.participantId} is too stale (${staleness} > ${this.config.stalenessThreshold})`
      );
      return;
    }

    // Create buffered update
    const bufferedUpdate: BufferedUpdate = {
      participantId: update.participantId,
      gradients: new Float32Array(update.gradients),
      sampleCount: update.sampleCount,
      loss: update.loss,
      version: updateVersion,
      staleness,
      timestamp: Date.now(),
      metadata: update.metadata,
    };

    // Add to buffer according to strategy
    this.addToBuffer(bufferedUpdate);
    this.state.totalUpdatesReceived++;

    // Track staleness
    this.state.stalenessHistory.push(staleness);
    if (this.state.stalenessHistory.length > 100) {
      this.state.stalenessHistory.shift();
    }

    // Check if aggregation should be triggered
    this.checkAggregationTrigger();
  }

  /**
   * Aggregate buffered updates
   */
  async aggregateUpdates(
    updates: ParticipantUpdate[]
  ): Promise<AggregationResult> {
    // Add all updates to buffer first
    for (const update of updates) {
      this.addUpdateToBuffer(update);
    }

    // Check if we have enough updates to aggregate
    if (this.state.updateBuffer.length < this.config.minBufferSize) {
      throw new Error(
        `Insufficient updates in buffer: ${this.state.updateBuffer.length} < ${this.config.minBufferSize}`
      );
    }

    const startTime = Date.now();

    // 1. Select updates from buffer
    const selectedUpdates = this.selectUpdatesFromBuffer();

    // 2. Calculate staleness-aware weights
    const weightedUpdates = this.calculateStalenessWeights(selectedUpdates);

    // 3. Perform weighted aggregation
    const aggregatedGradients = this.performWeightedAggregation(weightedUpdates);

    // 4. Update global model
    const learningRate = this.calculateLearningRate();
    const newGlobalModel = new Float32Array(this.state.globalModel.length);

    for (let i = 0; i < newGlobalModel.length; i++) {
      newGlobalModel[i] = this.state.globalModel[i] - learningRate * aggregatedGradients[i];
    }

    // 5. Calculate metadata
    const totalSamples = selectedUpdates.reduce((sum, u) => sum + u.sampleCount, 0);
    const avgLoss = selectedUpdates.reduce((sum, u) => sum + (u.loss || 0), 0) / selectedUpdates.length;
    const weightedLoss = selectedUpdates.reduce(
      (sum, u) => sum + (u.loss || 0) * u.sampleCount,
      0
    ) / totalSamples;
    const avgStaleness = selectedUpdates.reduce((sum, u) => sum + u.staleness, 0) / selectedUpdates.length;

    // 6. Update state
    this.state.globalModel = newGlobalModel;
    this.state.globalVersion++;
    this.state.totalUpdatesProcessed += selectedUpdates.length;
    this.state.convergenceHistory.push(weightedLoss);

    // Track best loss
    if (weightedLoss < this.state.bestLoss) {
      this.state.bestLoss = weightedLoss;
    }

    // 7. Remove processed updates from buffer
    this.removeProcessedUpdates(selectedUpdates);

    // 8. Reset aggregation timer
    this.lastAggregationTime = Date.now();

    const aggregationTime = Date.now() - startTime;

    return {
      aggregatedModel: newGlobalModel,
      roundNumber: this.state.globalVersion,
      globalRound: this.state.globalVersion,
      participantCount: selectedUpdates.length,
      totalSamples,
      avgLoss,
      weightedLoss,
      aggregationTime,
      hasConverged: false, // Async FL doesn't have traditional convergence
      metadata: {
        strategy: this.config.name,
        bufferSize: this.state.updateBuffer.length,
        avgStaleness,
        stalenessWeighting: this.config.stalenessWeighting,
        learningRate,
        totalUpdatesReceived: this.state.totalUpdatesReceived,
        totalUpdatesProcessed: this.state.totalUpdatesProcessed,
      },
    };
  }

  /**
   * Add update to buffer according to strategy
   */
  private addToBuffer(update: BufferedUpdate): void {
    // Remove oldest if buffer is full
    if (this.state.updateBuffer.length >= this.config.bufferSize) {
      switch (this.config.bufferStrategy) {
        case 'fifo':
          this.state.updateBuffer.shift();
          break;
        case 'lifo':
          this.state.updateBuffer.pop();
          break;
        case 'priority':
          // Remove least recent (oldest timestamp)
          const oldestIndex = this.state.updateBuffer.reduce((oldestIdx, u, idx, arr) =>
            u.timestamp < arr[oldestIdx].timestamp ? idx : oldestIdx,
            0
          );
          this.state.updateBuffer.splice(oldestIndex, 1);
          break;
      }
    }

    // Add new update
    this.state.updateBuffer.push(update);
  }

  /**
   * Select updates from buffer for aggregation
   */
  private selectUpdatesFromBuffer(): BufferedUpdate[] {
    const count = Math.min(
      this.config.maxBufferSize,
      this.state.updateBuffer.length
    );

    switch (this.config.bufferStrategy) {
      case 'fifo':
        return this.state.updateBuffer.slice(0, count);
      case 'lifo':
        return this.state.updateBuffer.slice(-count);
      case 'priority':
        // Sort by staleness (prefer fresher updates)
        const sorted = [...this.state.updateBuffer].sort((a, b) => a.staleness - b.staleness);
        return sorted.slice(0, count);
      default:
        return this.state.updateBuffer.slice(0, count);
    }
  }

  /**
   * Calculate staleness-aware weights
   */
  private calculateStalenessWeights(updates: BufferedUpdate[]): Array<{
    update: BufferedUpdate;
    weight: number;
  }> {
    return updates.map(update => {
      let weight = 1.0;

      switch (this.config.stalenessWeighting) {
        case 'uniform':
          weight = 1.0;
          break;

        case 'linear':
          // Linear decay: weight = 1 / (1 + staleness * decay)
          weight = 1.0 / (1.0 + update.staleness * this.config.stalenessDecay);
          break;

        case 'exponential':
          // Exponential decay: weight = exp(-staleness * decay)
          weight = Math.exp(-update.staleness * this.config.stalenessDecay);
          break;
      }

      return { update, weight };
    });
  }

  /**
   * Perform weighted aggregation
   */
  private performWeightedAggregation(
    weightedUpdates: Array<{ update: BufferedUpdate; weight: number }>
  ): Float32Array {
    const dim = this.state.globalModel.length;
    const aggregated = new Float32Array(dim);

    // Calculate total weight
    const totalWeight = weightedUpdates.reduce((sum, { weight }) => sum + weight, 0);

    // Weighted average
    for (const { update, weight } of weightedUpdates) {
      const normalizedWeight = weight / totalWeight;
      for (let i = 0; i < dim; i++) {
        aggregated[i] += update.gradients[i] * normalizedWeight;
      }
    }

    return aggregated;
  }

  /**
   * Calculate adaptive learning rate
   */
  private calculateLearningRate(): number {
    if (!this.config.adaptiveLearningRate) {
      return this.config.localLearningRate;
    }

    // Decay learning rate over time
    const decay = Math.pow(this.config.lrDecay, this.state.globalVersion);
    return this.config.localLearningRate * decay;
  }

  /**
   * Remove processed updates from buffer
   */
  private removeProcessedUpdates(processed: BufferedUpdate[]): void {
    const processedIds = new Set(processed.map(u => u.participantId + u.timestamp));
    this.state.updateBuffer = this.state.updateBuffer.filter(
      u => !processedIds.has(u.participantId + u.timestamp)
    );
  }

  /**
   * Check if aggregation should be triggered
   */
  private checkAggregationTrigger(): void {
    const shouldAggregate = this.shouldAggregateNow();

    if (shouldAggregate) {
      // Trigger aggregation (this would be handled by the coordinator)
      this.emit('aggregation_triggered', {
        bufferSize: this.state.updateBuffer.length,
      });
    }
  }

  /**
   * Determine if aggregation should happen now
   */
  private shouldAggregateNow(): boolean {
    const now = Date.now();
    const timeSinceLastAggregation = now - this.lastAggregationTime;

    switch (this.config.aggregationTrigger) {
      case 'timer':
        return timeSinceLastAggregation >= this.config.aggregationInterval;

      case 'count':
        return this.state.updateBuffer.length >= this.config.aggregationCount;

      case 'hybrid':
        return (
          timeSinceLastAggregation >= this.config.aggregationInterval &&
          this.state.updateBuffer.length >= this.config.minBufferSize
        );

      default:
        return false;
    }
  }

  /**
   * Get buffer status
   */
  getBufferStatus(): {
    bufferSize: number;
    totalUpdatesReceived: number;
    totalUpdatesProcessed: number;
    avgStaleness: number;
    bufferUtilization: number;
  } {
    const avgStaleness = this.state.stalenessHistory.length > 0
      ? this.state.stalenessHistory.reduce((sum, v) => sum + v, 0) / this.state.stalenessHistory.length
      : 0;

    return {
      bufferSize: this.state.updateBuffer.length,
      totalUpdatesReceived: this.state.totalUpdatesReceived,
      totalUpdatesProcessed: this.state.totalUpdatesProcessed,
      avgStaleness,
      bufferUtilization: this.state.updateBuffer.length / this.config.bufferSize,
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = {
      globalModel: new Float32Array(0),
      globalVersion: 0,
      updateBuffer: [],
      totalUpdatesReceived: 0,
      totalUpdatesProcessed: 0,
      stalenessHistory: [],
      convergenceHistory: [],
      bestLoss: Infinity,
    };
    this.lastAggregationTime = Date.now();

    if (this.aggregationTimer) {
      clearTimeout(this.aggregationTimer);
      this.aggregationTimer = null;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.aggregationTimer) {
      clearTimeout(this.aggregationTimer);
      this.aggregationTimer = null;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create default AsyncFed configuration
 */
export function createDefaultAsyncFedConfig(): AsyncFedConfig {
  return {
    name: 'fed-async',
    bufferSize: 100,
    bufferStrategy: 'fifo',
    stalenessThreshold: 5,
    stalenessWeighting: 'linear',
    stalenessDecay: 0.5,
    minBufferSize: 2,
    maxBufferSize: 50,
    aggregationTrigger: 'hybrid',
    aggregationInterval: 5000,
    aggregationCount: 10,
    versioningEnabled: true,
    maxConcurrentVersions: 10,
    localLearningRate: 0.01,
    adaptiveLearningRate: true,
    lrDecay: 0.995,
  };
}

/**
 * Create AsyncFed configuration for fast learning
 */
export function createFastAsyncFedConfig(): AsyncFedConfig {
  return {
    ...createDefaultAsyncFedConfig(),
    name: 'fed-async-fast',
    bufferSize: 50,
    stalenessThreshold: 10, // Accept staler updates
    stalenessDecay: 0.3, // Less aggressive staleness weighting
    aggregationInterval: 2000, // Aggregate more frequently
    localLearningRate: 0.02,
    lrDecay: 0.99,
  };
}

/**
 * Create AsyncFed configuration for stable learning
 */
export function createStableAsyncFedConfig(): AsyncFedConfig {
  return {
    ...createDefaultAsyncFedConfig(),
    name: 'fed-async-stable',
    bufferSize: 200,
    stalenessThreshold: 3, // Only accept fresh updates
    stalenessDecay: 0.7, // More aggressive staleness weighting
    aggregationInterval: 10000, // Aggregate less frequently
    localLearningRate: 0.005,
    lrDecay: 0.999,
  };
}

/**
 * POLLN Checkpoint and Rollback System for Federated Learning
 * Pattern-Organized Large Language Network
 *
 * References:
 * - Chen et al., "Delta-Gradient Compression for Efficient and Accurate Federated Learning" (2022)
 * - Reisizadeh et al., "Robust Federated Learning: The Case of Noisy and Heterogeneous Data" (2021)
 *
 * Checkpoint system enables:
 * 1. Periodic model snapshots for rollback capability
 * 2. Recovery from bad updates or malicious participants
 * 3. Experimentation with rollback and replay
 * 4. Privacy budget management across checkpoints
 *
 * Rollback scenarios:
 * - Malicious update detected
 * - Loss spike indicating training instability
 * - Privacy budget exhausted
 * - Model quality degradation
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface CheckpointConfig {
  enabled: boolean;
  interval: number; // Rounds between checkpoints
  maxCheckpoints: number;
  compressionEnabled: boolean;
  includeParticipantStates: boolean;
  includePrivacyBudgets: boolean;
  autoRollbackEnabled: boolean;
  rollbackTriggers: {
    lossIncreaseThreshold: number;
    qualityDecreaseThreshold: number;
    byzantineDetectionThreshold: number;
  };
}

export interface FederationCheckpoint {
  checkpointId: string;
  roundNumber: number;
  globalModel: Float32Array;
  modelHash: string;
  participantStates: Map<string, ParticipantState>;
  privacyBudgets: Map<string, PrivacyBudget>;
  metadata: {
    timestamp: number;
    loss: number;
    qualityScore: number;
    participantCount: number;
    compressionRatio: number;
  };
}

export interface ParticipantState {
  participantId: string;
  lastUpdateRound: number;
  contributionScore: number;
  reliability: number;
  metadata: Record<string, unknown>;
}

export interface PrivacyBudget {
  epsilonSpent: number;
  deltaSpent: number;
  epsilonLimit: number;
  deltaLimit: number;
  roundsParticipated: number;
}

export interface RollbackDecision {
  shouldRollback: boolean;
  reason: string;
  targetCheckpoint: string;
  confidence: number;
}

// ============================================================================
// Checkpoint Manager Implementation
// ============================================================================

/**
 * CheckpointManager
 *
 * Manages periodic snapshots of federated learning state
 * and handles rollback decisions.
 */
export class CheckpointManager {
  private config: CheckpointConfig;
  private checkpoints: Map<string, FederationCheckpoint> = new Map();
  private currentRound: number = 0;
  private lastCheckpointRound: number = 0;

  constructor(config: Partial<CheckpointConfig> = {}) {
    this.config = {
      enabled: true,
      interval: 5, // Checkpoint every 5 rounds
      maxCheckpoints: 10,
      compressionEnabled: true,
      includeParticipantStates: true,
      includePrivacyBudgets: true,
      autoRollbackEnabled: true,
      rollbackTriggers: {
        lossIncreaseThreshold: 0.5, // 50% loss increase
        qualityDecreaseThreshold: 0.2, // 20% quality decrease
        byzantineDetectionThreshold: 0.3, // 30% participants Byzantine
      },
      ...config,
    };
  }

  /**
   * Create checkpoint if conditions are met
   */
  async createCheckpoint(
    roundNumber: number,
    globalModel: Float32Array,
    participantStates?: Map<string, ParticipantState>,
    privacyBudgets?: Map<string, PrivacyBudget>,
    metadata?: Partial<FederationCheckpoint['metadata']>
  ): Promise<FederationCheckpoint | null> {
    if (!this.config.enabled) {
      return null;
    }

    this.currentRound = roundNumber;

    // Check if we should create a checkpoint
    if (!this.shouldCreateCheckpoint(roundNumber)) {
      return null;
    }

    const checkpointId = this.generateCheckpointId(roundNumber);

    // Compress model if enabled
    const modelToStore = this.config.compressionEnabled
      ? await this.compressModel(globalModel)
      : new Float32Array(globalModel);

    const checkpoint: FederationCheckpoint = {
      checkpointId,
      roundNumber,
      globalModel: modelToStore,
      modelHash: this.calculateModelHash(globalModel),
      participantStates: this.config.includeParticipantStates
        ? new Map(participantStates || [])
        : new Map(),
      privacyBudgets: this.config.includePrivacyBudgets
        ? new Map(privacyBudgets || [])
        : new Map(),
      metadata: {
        timestamp: Date.now(),
        loss: metadata?.loss || 0,
        qualityScore: metadata?.qualityScore || 0,
        participantCount: metadata?.participantCount || 0,
        compressionRatio: this.config.compressionEnabled
          ? globalModel.length / modelToStore.length
          : 1.0,
      },
    };

    // Store checkpoint
    this.checkpoints.set(checkpointId, checkpoint);
    this.lastCheckpointRound = roundNumber;

    // Prune old checkpoints
    this.pruneCheckpoints();

    return checkpoint;
  }

  /**
   * Evaluate if rollback should occur
   */
  async evaluateRollback(
    currentMetrics: {
      loss: number;
      qualityScore: number;
      byzantineRatio: number;
    }
  ): Promise<RollbackDecision> {
    if (!this.config.autoRollbackEnabled) {
      return {
        shouldRollback: false,
        reason: 'Auto-rollback disabled',
        targetCheckpoint: '',
        confidence: 0,
      };
    }

    const latestCheckpoint = this.getLatestCheckpoint();
    if (!latestCheckpoint) {
      return {
        shouldRollback: false,
        reason: 'No checkpoint available',
        targetCheckpoint: '',
        confidence: 0,
      };
    }

    // Check loss increase
    const lossIncrease = currentMetrics.loss - latestCheckpoint.metadata.loss;
    const lossIncreaseRatio =
      latestCheckpoint.metadata.loss > 0
        ? lossIncrease / latestCheckpoint.metadata.loss
        : 0;

    if (lossIncreaseRatio > this.config.rollbackTriggers.lossIncreaseThreshold) {
      return {
        shouldRollback: true,
        reason: `Loss increased by ${(lossIncreaseRatio * 100).toFixed(1)}%`,
        targetCheckpoint: latestCheckpoint.checkpointId,
        confidence: Math.min(lossIncreaseRatio / this.config.rollbackTriggers.lossIncreaseThreshold, 1),
      };
    }

    // Check quality decrease
    const qualityDecrease = latestCheckpoint.metadata.qualityScore - currentMetrics.qualityScore;
    const qualityDecreaseRatio =
      latestCheckpoint.metadata.qualityScore > 0
        ? qualityDecrease / latestCheckpoint.metadata.qualityScore
        : 0;

    if (qualityDecreaseRatio > this.config.rollbackTriggers.qualityDecreaseThreshold) {
      return {
        shouldRollback: true,
        reason: `Quality decreased by ${(qualityDecreaseRatio * 100).toFixed(1)}%`,
        targetCheckpoint: latestCheckpoint.checkpointId,
        confidence: Math.min(qualityDecreaseRatio / this.config.rollbackTriggers.qualityDecreaseThreshold, 1),
      };
    }

    // Check Byzantine ratio
    if (currentMetrics.byzantineRatio > this.config.rollbackTriggers.byzantineDetectionThreshold) {
      return {
        shouldRollback: true,
        reason: `${(currentMetrics.byzantineRatio * 100).toFixed(1)}% participants detected as Byzantine`,
        targetCheckpoint: latestCheckpoint.checkpointId,
        confidence: Math.min(
          currentMetrics.byzantineRatio / this.config.rollbackTriggers.byzantineDetectionThreshold,
          1
        ),
      };
    }

    return {
      shouldRollback: false,
      reason: 'Metrics within acceptable range',
      targetCheckpoint: '',
      confidence: 0,
    };
  }

  /**
   * Rollback to a specific checkpoint
   */
  async rollbackToCheckpoint(checkpointId: string): Promise<FederationCheckpoint | null> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      console.error(`Checkpoint ${checkpointId} not found`);
      return null;
    }

    // Decompress model if necessary
    const restoredModel = this.config.compressionEnabled
      ? await this.decompressModel(checkpoint.globalModel)
      : new Float32Array(checkpoint.globalModel);

    // Create restored checkpoint with decompressed model
    const restored: FederationCheckpoint = {
      ...checkpoint,
      globalModel: restoredModel,
    };

    return restored;
  }

  /**
   * Rollback to latest checkpoint
   */
  async rollbackToLatest(): Promise<FederationCheckpoint | null> {
    const latest = this.getLatestCheckpoint();
    if (!latest) {
      return null;
    }
    return this.rollbackToCheckpoint(latest.checkpointId);
  }

  /**
   * Rollback to best checkpoint (by quality)
   */
  async rollbackToBest(): Promise<FederationCheckpoint | null> {
    let bestCheckpoint: FederationCheckpoint | null = null;
    let bestQuality = -Infinity;

    for (const checkpoint of this.checkpoints.values()) {
      if (checkpoint.metadata.qualityScore > bestQuality) {
        bestQuality = checkpoint.metadata.qualityScore;
        bestCheckpoint = checkpoint;
      }
    }

    if (!bestCheckpoint) {
      return null;
    }

    return this.rollbackToCheckpoint(bestCheckpoint.checkpointId);
  }

  /**
   * Get checkpoint by ID
   */
  getCheckpoint(checkpointId: string): FederationCheckpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  /**
   * Get latest checkpoint
   */
  getLatestCheckpoint(): FederationCheckpoint | undefined {
    let latest: FederationCheckpoint | undefined;
    let latestRound = -1;

    for (const checkpoint of this.checkpoints.values()) {
      if (checkpoint.roundNumber > latestRound) {
        latestRound = checkpoint.roundNumber;
        latest = checkpoint;
      }
    }

    return latest;
  }

  /**
   * Get all checkpoints
   */
  getAllCheckpoints(): FederationCheckpoint[] {
    return Array.from(this.checkpoints.values()).sort((a, b) => a.roundNumber - b.roundNumber);
  }

  /**
   * Get checkpoints in round range
   */
  getCheckpointsInRange(minRound: number, maxRound: number): FederationCheckpoint[] {
    return this.getAllCheckpoints().filter(
      cp => cp.roundNumber >= minRound && cp.roundNumber <= maxRound
    );
  }

  /**
   * Delete checkpoint
   */
  deleteCheckpoint(checkpointId: string): boolean {
    return this.checkpoints.delete(checkpointId);
  }

  /**
   * Clear all checkpoints
   */
  clearAllCheckpoints(): void {
    this.checkpoints.clear();
    this.lastCheckpointRound = 0;
  }

  /**
   * Get checkpoint statistics
   */
  getStats(): {
    totalCheckpoints: number;
    totalSize: number;
    avgCompressionRatio: number;
    oldestRound: number;
    newestRound: number;
  } {
    const checkpoints = this.getAllCheckpoints();

    if (checkpoints.length === 0) {
      return {
        totalCheckpoints: 0,
        totalSize: 0,
        avgCompressionRatio: 1.0,
        oldestRound: 0,
        newestRound: 0,
      };
    }

    let totalSize = 0;
    let totalCompressionRatio = 0;

    for (const cp of checkpoints) {
      totalSize += cp.globalModel.length * 4; // Float32 = 4 bytes
      totalCompressionRatio += cp.metadata.compressionRatio;
    }

    return {
      totalCheckpoints: checkpoints.length,
      totalSize,
      avgCompressionRatio: totalCompressionRatio / checkpoints.length,
      oldestRound: checkpoints[0].roundNumber,
      newestRound: checkpoints[checkpoints.length - 1].roundNumber,
    };
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private shouldCreateCheckpoint(roundNumber: number): boolean {
    // Create checkpoint at specified interval
    if (roundNumber - this.lastCheckpointRound >= this.config.interval) {
      return true;
    }

    return false;
  }

  private generateCheckpointId(roundNumber: number): string {
    return `cp_${roundNumber}_${Date.now()}`;
  }

  private calculateModelHash(model: Float32Array): string {
    // Simple hash calculation
    let hash = 0;
    for (let i = 0; i < model.length; i++) {
      const value = Math.floor(model[i] * 1000);
      hash = ((hash << 5) - hash) + value;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private async compressModel(model: Float32Array): Promise<Float32Array> {
    // Simple compression: reduce precision to Float16 equivalent
    // In practice, would use more sophisticated compression
    const compressed = new Float32Array(model.length);
    for (let i = 0; i < model.length; i++) {
      // Round to 3 decimal places (roughly Float16 precision)
      compressed[i] = Math.round(model[i] * 1000) / 1000;
    }
    return compressed;
  }

  private async decompressModel(compressed: Float32Array): Promise<Float32Array> {
    // Return as-is since our "compression" just reduced precision
    return new Float32Array(compressed);
  }

  private pruneCheckpoints(): void {
    // Remove oldest checkpoints if we exceed max
    while (this.checkpoints.size > this.config.maxCheckpoints) {
      let oldestRound = Infinity;
      let oldestId = '';

      for (const [id, cp] of this.checkpoints.entries()) {
        if (cp.roundNumber < oldestRound) {
          oldestRound = cp.roundNumber;
          oldestId = id;
        }
      }

      if (oldestId) {
        this.checkpoints.delete(oldestId);
      }
    }
  }

  /**
   * Get configuration
   */
  getConfig(): CheckpointConfig {
    return { ...this.config };
  }

  /**
   * Reset
   */
  reset(): void {
    this.checkpoints.clear();
    this.currentRound = 0;
    this.lastCheckpointRound = 0;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createDefaultCheckpointConfig(): CheckpointConfig {
  return {
    enabled: true,
    interval: 5,
    maxCheckpoints: 10,
    compressionEnabled: true,
    includeParticipantStates: true,
    includePrivacyBudgets: true,
    autoRollbackEnabled: true,
    rollbackTriggers: {
      lossIncreaseThreshold: 0.5,
      qualityDecreaseThreshold: 0.2,
      byzantineDetectionThreshold: 0.3,
    },
  };
}

export function createAggressiveCheckpointConfig(): CheckpointConfig {
  return {
    ...createDefaultCheckpointConfig(),
    interval: 2, // More frequent checkpoints
    maxCheckpoints: 20,
    autoRollbackEnabled: true,
    rollbackTriggers: {
      lossIncreaseThreshold: 0.2, // More sensitive
      qualityDecreaseThreshold: 0.1,
      byzantineDetectionThreshold: 0.2,
    },
  };
}

export function createMinimalCheckpointConfig(): CheckpointConfig {
  return {
    ...createDefaultCheckpointConfig(),
    interval: 10, // Less frequent checkpoints
    maxCheckpoints: 5,
    compressionEnabled: false,
    includeParticipantStates: false,
    includePrivacyBudgets: false,
    autoRollbackEnabled: false,
  };
}

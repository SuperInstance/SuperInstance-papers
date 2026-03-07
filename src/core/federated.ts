/**
 * POLLN Federated Learning Coordinator
 * Pattern-Organized Large Language Network
 *
 * Phase 3: Collective Intelligence - Federated Learning
 *
 * Overview:
 * This coordinator manages federated learning across multiple colonies,
 * enabling privacy-preserving collaborative training while maintaining
 * data locality and differential privacy guarantees.
 *
 * Key Features:
 * - FedAvg (Federated Averaging) algorithm
 * - Gradient clipping and noise injection
 * - Privacy budget management via BES integration
 * - Model versioning and distribution
 * - Secure aggregation simulation
 * - Colony registration and round management
 *
 * Privacy Architecture:
 * - Per-agent noise for differential privacy
 * - Gradient clipping to bound sensitivity
 * - Secure aggregation (simulated)
 * - Privacy budget tracking per privacy tier
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { BES, PrivacyTier, PRIVACY_PARAMS } from './embedding.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Federation participant (colony) information
 */
export interface ColonyInfo {
  id: string;
  gardenerId: string;
  registeredAt: number;
  lastActive: number;
  agentCount: number;
  computeCapability: number; // 0-1 scale
  privacyPreference: PrivacyTier;
  isActive: boolean;
}

/**
 * Model version information
 */
export interface ModelVersion {
  version: number;
  globalRound: number;
  createdAt: number;
  modelHash: string;
  parameterCount: number;
  checksum: string;
  participatingColonies: string[];
  aggregatedGradients: number[];
  metadata: {
    epsilonUsed: number;
    deltaUsed: number;
    avgClipNorm: number;
    totalSamples: number;
  };
}

/**
 * Local gradient update from a colony
 */
export interface GradientUpdate {
  colonyId: string;
  roundNumber: number;
  gradients: number[];
  sampleCount: number;
  clipNorm?: number;
  metadata: {
    agentId: string;
    privacyTier: PrivacyTier;
    epsilonSpent: number;
    deltaSpent: number;
    compressed: boolean;
    trainingLoss: number;
  };
  timestamp: number;
}

/**
 * Federated learning round configuration
 */
export interface FederatedRoundConfig {
  roundNumber: number;
  targetModelVersion: number;
  minParticipants: number;
  maxParticipants: number;
  learningRate: number;
  clipThreshold: number;
  targetPrivacyTier: PrivacyTier;
  timeout: number; // milliseconds
  aggregationMethod: 'fedavg' | 'fedprox' | 'fedavgm';
}

/**
 * Federated round status
 */
export interface FederatedRoundStatus {
  roundNumber: number;
  status: 'pending' | 'active' | 'aggregating' | 'complete' | 'failed' | 'timeout';
  startTime: number;
  endTime?: number;
  participants: string[];
  gradientUpdates: GradientUpdate[];
  aggregatedModel?: ModelVersion;
  errors: Array<{ colonyId: string; error: string }>;
}

/**
 * Privacy accounting for federated learning
 */
export interface PrivacyAccounting {
  colonyId: string;
  privacyTier: PrivacyTier;
  epsilonSpent: number;
  deltaSpent: number;
  roundsParticipated: number;
  gradientsContributed: number;
  lastUpdated: number;
}

/**
 * Federation configuration
 */
export interface FederationConfig {
  // Colony management
  maxColonies: number;
  colonyTimeout: number; // milliseconds
  minColoniesForRound: number;

  // Federated learning
  defaultLearningRate: number;
  defaultClipThreshold: number;
  roundTimeout: number;
  maxRoundsPerDay: number;

  // Privacy
  defaultPrivacyTier: PrivacyTier;
  enableSecureAggregation: boolean;
  noiseDistribution: 'gaussian' | 'laplacian';

  // Model management
  maxModelVersions: number;
  compressionEnabled: boolean;

  // Aggregation
  aggregationMethod: 'fedavg' | 'fedprox' | 'fedavgm';
  participantSelection: 'all' | 'random' | 'weighted';
}

// ============================================================================
// Federated Learning Coordinator
// ============================================================================

/**
 * FederatedLearningCoordinator
 *
 * Manages federated learning across colonies with privacy preservation.
 * Implements FedAvg algorithm with differential privacy guarantees.
 *
 * Key insights from research:
 * - FedAvg: Weighted average of local updates
 * - Gradient clipping: Bound sensitivity for DP
 * - Noise injection: Per-agent or per-update noise
 * - Secure aggregation: Prevent server from seeing individual updates
 */
export class FederatedLearningCoordinator extends EventEmitter {
  private config: FederationConfig;
  private bes: BES;

  // Colony management
  private colonies: Map<string, ColonyInfo> = new Map();

  // Model management
  private currentModel: ModelVersion | null = null;
  private modelHistory: ModelVersion[] = [];

  // Round management
  private currentRound: FederatedRoundStatus | null = null;
  private roundHistory: FederatedRoundStatus[] = [];
  private globalRoundCounter: number = 0;

  // Privacy accounting
  private privacyAccounting: Map<string, PrivacyAccounting> = new Map();

  // Statistics
  private stats = {
    totalRounds: 0,
    successfulRounds: 0,
    failedRounds: 0,
    totalGradientsAggregated: 0,
    totalPrivacyBudgetUsed: 0,
  };

  constructor(config?: Partial<FederationConfig>, bes?: BES) {
    super();

    this.config = {
      maxColonies: 100,
      colonyTimeout: 3600000, // 1 hour
      minColoniesForRound: 3,
      defaultLearningRate: 0.01,
      defaultClipThreshold: 1.0,
      roundTimeout: 300000, // 5 minutes
      maxRoundsPerDay: 100,
      defaultPrivacyTier: 'MEADOW',
      enableSecureAggregation: true,
      noiseDistribution: 'gaussian',
      maxModelVersions: 10,
      compressionEnabled: true,
      aggregationMethod: 'fedavg',
      participantSelection: 'all',
      ...config,
    };

    // Initialize BES for privacy management
    this.bes = bes || new BES({
      defaultDimensionality: 512,
      defaultPrivacyTier: this.config.defaultPrivacyTier,
    });

    // Initialize first model version
    this.initializeModel();
  }

  // ==========================================================================
  // Federation Management
  // ==========================================================================

  /**
   * Register a colony for federated learning
   */
  async registerColony(
    colonyId: string,
    gardenerId: string,
    options?: Partial<{
      agentCount: number;
      computeCapability: number;
      privacyPreference: PrivacyTier;
    }>
  ): Promise<ColonyInfo> {
    // Check if already registered
    if (this.colonies.has(colonyId)) {
      const existing = this.colonies.get(colonyId)!;
      existing.lastActive = Date.now();
      existing.isActive = true;
      return existing;
    }

    // Check capacity
    if (this.colonies.size >= this.config.maxColonies) {
      throw new Error('Maximum colony capacity reached');
    }

    const colony: ColonyInfo = {
      id: colonyId,
      gardenerId,
      registeredAt: Date.now(),
      lastActive: Date.now(),
      agentCount: options?.agentCount || 1,
      computeCapability: options?.computeCapability || 0.5,
      privacyPreference: options?.privacyPreference || this.config.defaultPrivacyTier,
      isActive: true,
    };

    this.colonies.set(colonyId, colony);

    // Initialize privacy accounting
    this.privacyAccounting.set(colonyId, {
      colonyId,
      privacyTier: colony.privacyPreference,
      epsilonSpent: 0,
      deltaSpent: 0,
      roundsParticipated: 0,
      gradientsContributed: 0,
      lastUpdated: Date.now(),
    });

    this.emit('colony_registered', colony);
    return colony;
  }

  /**
   * Unregister a colony
   */
  async unregisterColony(colonyId: string): Promise<boolean> {
    const colony = this.colonies.get(colonyId);
    if (!colony) return false;

    colony.isActive = false;
    this.colonies.delete(colonyId);
    this.privacyAccounting.delete(colonyId);

    this.emit('colony_unregistered', { colonyId });
    return true;
  }

  /**
   * Get federation status
   */
  getFederationStatus(): {
    activeColonies: number;
    totalColonies: number;
    currentRound?: FederatedRoundStatus;
    currentModel?: ModelVersion;
    globalRound: number;
  } {
    const activeColonies = Array.from(this.colonies.values()).filter(c => c.isActive).length;

    return {
      activeColonies,
      totalColonies: this.colonies.size,
      currentRound: this.currentRound || undefined,
      currentModel: this.currentModel || undefined,
      globalRound: this.globalRoundCounter,
    };
  }

  /**
   * Get all registered colonies
   */
  getColonies(): ColonyInfo[] {
    return Array.from(this.colonies.values());
  }

  // ==========================================================================
  // Round Management
  // ==========================================================================

  /**
   * Start a new federated learning round
   */
  async startRound(config?: Partial<FederatedRoundConfig>): Promise<FederatedRoundStatus> {
    if (this.currentRound && this.currentRound.status === 'active') {
      throw new Error('Round already in progress');
    }

    const activeColonies = Array.from(this.colonies.values()).filter(c => c.isActive);
    if (activeColonies.length < this.config.minColoniesForRound) {
      throw new Error(`Insufficient colonies: ${activeColonies.length} < ${this.config.minColoniesForRound}`);
    }

    // Select participants based on strategy
    const participants = this.selectParticipants(activeColonies);

    const roundConfig: FederatedRoundConfig = {
      roundNumber: this.globalRoundCounter + 1,
      targetModelVersion: this.currentModel?.version || 0,
      minParticipants: this.config.minColoniesForRound,
      maxParticipants: participants.length,
      learningRate: this.config.defaultLearningRate,
      clipThreshold: this.config.defaultClipThreshold,
      targetPrivacyTier: this.config.defaultPrivacyTier,
      timeout: this.config.roundTimeout,
      aggregationMethod: this.config.aggregationMethod,
      ...config,
    };

    this.currentRound = {
      roundNumber: roundConfig.roundNumber,
      status: 'active',
      startTime: Date.now(),
      participants: participants.map(c => c.id),
      gradientUpdates: [],
      errors: [],
    };

    this.emit('round_started', {
      roundNumber: roundConfig.roundNumber,
      participants: participants.map(c => c.id),
    });

    // Set timeout for round completion
    setTimeout(() => {
      if (this.currentRound && this.currentRound.status === 'active') {
        this.completeRound('timeout');
      }
    }, roundConfig.timeout);

    return this.currentRound;
  }

  /**
   * Submit gradient updates from a colony
   */
  async submitGradients(update: GradientUpdate): Promise<void> {
    if (!this.currentRound || this.currentRound.status !== 'active') {
      throw new Error('No active round');
    }

    if (!this.currentRound.participants.includes(update.colonyId)) {
      throw new Error('Colony not participating in current round');
    }

    if (update.roundNumber !== this.currentRound.roundNumber) {
      throw new Error('Round number mismatch');
    }

    // Apply privacy mechanisms
    const privateUpdate = await this.applyPrivacyMechanisms(update);

    // Store update
    this.currentRound.gradientUpdates.push(privateUpdate);

    // Update privacy accounting
    this.updatePrivacyAccounting(update.colonyId, update.metadata);

    this.emit('gradients_received', {
      colonyId: update.colonyId,
      roundNumber: update.roundNumber,
    });

    // Check if round is complete
    if (this.currentRound.gradientUpdates.length >= this.currentRound.participants.length) {
      // Don't await - let it complete asynchronously
      this.completeRound('complete').catch(err => {
        console.error('Error completing round:', err);
      });
    }
  }

  /**
   * Complete a federated learning round
   */
  private async completeRound(
    outcome: 'complete' | 'timeout' | 'failed'
  ): Promise<ModelVersion | null> {
    if (!this.currentRound) return null;

    const roundNumber = this.currentRound.roundNumber;
    this.currentRound.status = outcome === 'complete' ? 'aggregating' : outcome;
    this.currentRound.endTime = Date.now();

    if (outcome === 'complete' && this.currentRound.gradientUpdates.length > 0) {
      try {
        // Aggregate gradients
        const aggregatedModel = await this.aggregateGradients(this.currentRound);
        this.currentRound.aggregatedModel = aggregatedModel;

        // Update current model
        this.currentModel = aggregatedModel;
        this.modelHistory.push(aggregatedModel);

        // Prune old models
        if (this.modelHistory.length > this.config.maxModelVersions) {
          this.modelHistory = this.modelHistory.slice(-this.config.maxModelVersions);
        }

        this.globalRoundCounter++;
        this.stats.successfulRounds++;
        this.currentRound.status = 'complete';

        this.emit('round_complete', {
          roundNumber: this.currentRound.roundNumber,
          modelVersion: aggregatedModel.version,
        });

        // Archive round
        this.roundHistory.push(this.currentRound);
        this.currentRound = null;

        return aggregatedModel;
      } catch (error) {
        if (this.currentRound) {
          this.currentRound.status = 'failed';
          this.currentRound.errors.push({
            colonyId: 'aggregator',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        this.stats.failedRounds++;
      }
    } else {
      this.stats.failedRounds++;
    }

    // Archive round
    if (this.currentRound) {
      this.roundHistory.push(this.currentRound);
      this.currentRound = null;
    }

    this.emit('round_ended', {
      roundNumber,
      outcome,
    });

    return null;
  }

  /**
   * Select participants for a round
   */
  private selectParticipants(colonies: ColonyInfo[]): ColonyInfo[] {
    switch (this.config.participantSelection) {
      case 'random':
        // Random selection weighted by compute capability
        const weighted = colonies.map(c => ({
          colony: c,
          weight: c.computeCapability,
        }));
        return this.weightedRandomSelect(weighted).map(i => i.colony);

      case 'weighted':
        // Select top colonies by compute capability
        return colonies
          .sort((a, b) => b.computeCapability - a.computeCapability)
          .slice(0, Math.min(colonies.length, 10));

      case 'all':
      default:
        return colonies;
    }
  }

  /**
   * Weighted random selection
   */
  private weightedRandomSelect<T extends { weight: number }>(
    items: T[],
    count?: number
  ): T[] {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const selected: T[] = [];
    const remaining = [...items];

    const maxCount = count || Math.min(items.length, 10);

    while (selected.length < maxCount && remaining.length > 0) {
      let random = Math.random() * totalWeight;
      let selectedIndex = -1;

      for (let i = 0; i < remaining.length; i++) {
        random -= remaining[i].weight;
        if (random <= 0) {
          selectedIndex = i;
          break;
        }
      }

      if (selectedIndex === -1) selectedIndex = remaining.length - 1;

      selected.push(remaining[selectedIndex]);
      remaining.splice(selectedIndex, 1);
    }

    return selected;
  }

  // ==========================================================================
  // Gradient Aggregation
  // ==========================================================================

  /**
   * Aggregate gradients using FedAvg or other methods
   */
  private async aggregateGradients(
    round: FederatedRoundStatus
  ): Promise<ModelVersion> {
    const updates = round.gradientUpdates;
    if (updates.length === 0) {
      throw new Error('No gradient updates to aggregate');
    }

    let aggregatedGradients: number[];

    switch (this.config.aggregationMethod) {
      case 'fedavg':
        aggregatedGradients = this.fedAvg(updates);
        break;

      case 'fedprox':
        aggregatedGradients = this.fedProx(updates);
        break;

      case 'fedavgm':
        aggregatedGradients = this.fedAvgM(updates);
        break;

      default:
        aggregatedGradients = this.fedAvg(updates);
    }

    // Calculate metadata
    const totalSamples = updates.reduce((sum, u) => sum + u.sampleCount, 0);
    const avgClipNorm = updates.reduce((sum, u) => sum + (u.clipNorm || 0), 0) / updates.length;
    const epsilonUsed = updates.reduce((sum, u) => sum + u.metadata.epsilonSpent, 0);

    const modelVersion: ModelVersion = {
      version: (this.currentModel?.version || 0) + 1,
      globalRound: round.roundNumber,
      createdAt: Date.now(),
      modelHash: this.computeModelHash(aggregatedGradients),
      parameterCount: aggregatedGradients.length,
      checksum: this.computeChecksum(aggregatedGradients),
      participatingColonies: updates.map(u => u.colonyId),
      aggregatedGradients,
      metadata: {
        epsilonUsed,
        deltaUsed: updates.reduce((sum, u) => sum + u.metadata.deltaSpent, 0),
        avgClipNorm,
        totalSamples,
      },
    };

    this.stats.totalRounds++;
    this.stats.totalGradientsAggregated += updates.length;
    this.stats.totalPrivacyBudgetUsed += epsilonUsed;

    return modelVersion;
  }

  /**
   * Federated Averaging (FedAvg)
   * Weighted average by sample count
   */
  private fedAvg(updates: GradientUpdate[]): number[] {
    if (updates.length === 0) return [];

    const totalSamples = updates.reduce((sum, u) => sum + u.sampleCount, 0);
    const gradientDim = updates[0].gradients.length;

    // Initialize aggregated gradients
    const aggregated = new Array(gradientDim).fill(0);

    // Weighted sum
    for (const update of updates) {
      const weight = update.sampleCount / totalSamples;
      for (let i = 0; i < gradientDim; i++) {
        aggregated[i] += update.gradients[i] * weight;
      }
    }

    return aggregated;
  }

  /**
   * FedProx - Proximal term for straggler mitigation
   */
  private fedProx(updates: GradientUpdate[]): number[] {
    // FedProx adds a proximal term to handle heterogeneous data
    // For simplicity, we use FedAvg with a proximal penalty
    const fedAvgGradients = this.fedAvg(updates);

    // Apply proximal term (simplified)
    const mu = 0.01; // Proximal term coefficient
    return fedAvgGradients.map(g => g * (1 - mu));
  }

  /**
   * FedAvgM - FedAvg with momentum
   */
  private fedAvgM(updates: GradientUpdate[]): number[] {
    const fedAvgGradients = this.fedAvg(updates);

    // Apply momentum if we have previous model
    if (this.currentModel && this.modelHistory.length > 0) {
      const momentum = 0.9;
      const previousGradients = this.currentModel.aggregatedGradients;

      return fedAvgGradients.map((g, i) => {
        const prevG = previousGradients[i] || 0;
        return momentum * prevG + (1 - momentum) * g;
      });
    }

    return fedAvgGradients;
  }

  // ==========================================================================
  // Privacy Controls
  // ==========================================================================

  /**
   * Apply privacy mechanisms to gradient updates
   */
  private async applyPrivacyMechanisms(update: GradientUpdate): Promise<GradientUpdate> {
    let gradients = [...update.gradients];

    // 1. Gradient clipping
    gradients = this.clipGradients(gradients, update.clipNorm || this.config.defaultClipThreshold);

    // 2. Add noise for differential privacy
    if (update.metadata.privacyTier !== 'LOCAL') {
      gradients = this.addNoise(gradients, update.metadata.privacyTier);
    }

    return {
      ...update,
      gradients,
      clipNorm: update.clipNorm || this.config.defaultClipThreshold,
    };
  }

  /**
   * Clip gradients to bound sensitivity
   */
  private clipGradients(gradients: number[], threshold: number): number[] {
    const norm = Math.sqrt(gradients.reduce((sum, g) => sum + g * g, 0));

    if (norm > threshold) {
      const scale = threshold / norm;
      return gradients.map(g => g * scale);
    }

    return gradients;
  }

  /**
   * Add noise for differential privacy
   */
  private addNoise(gradients: number[], privacyTier: PrivacyTier): number[] {
    const params = PRIVACY_PARAMS[privacyTier];
    if (!params || params.epsilon === Infinity) return gradients;

    const sensitivity = this.config.defaultClipThreshold;
    const noiseScale = sensitivity / params.epsilon;

    return gradients.map(() => {
      if (this.config.noiseDistribution === 'gaussian') {
        return this.gaussianNoise(0, noiseScale);
      } else {
        return this.laplacianNoise(0, sensitivity / params.epsilon);
      }
    });
  }

  /**
   * Generate Gaussian noise using Box-Muller transform
   */
  private gaussianNoise(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  /**
   * Generate Laplacian noise
   */
  private laplacianNoise(mean: number, scale: number): number {
    const u = Math.random() - 0.5;
    return mean - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Simulate secure aggregation
   * In production, this would use cryptographic protocols
   */
  private simulateSecureAggregation(updates: GradientUpdate[]): GradientUpdate[] {
    if (!this.config.enableSecureAggregation) return updates;

    // Simulate encryption/decryption
    // In reality, this would use additive secret sharing
    return updates.map(update => ({
      ...update,
      metadata: {
        ...update.metadata,
        compressed: true,
      },
    }));
  }

  /**
   * Update privacy accounting for a colony
   */
  private updatePrivacyAccounting(
    colonyId: string,
    metadata: GradientUpdate['metadata']
  ): void {
    const accounting = this.privacyAccounting.get(colonyId);
    if (!accounting) return;

    accounting.epsilonSpent += metadata.epsilonSpent;
    accounting.deltaSpent += metadata.deltaSpent;
    accounting.roundsParticipated += 1;
    accounting.gradientsContributed += 1;
    accounting.lastUpdated = Date.now();
  }

  /**
   * Get privacy accounting for a colony
   */
  getPrivacyAccounting(colonyId: string): PrivacyAccounting | undefined {
    return this.privacyAccounting.get(colonyId);
  }

  /**
   * Get all privacy accounting
   */
  getAllPrivacyAccounting(): PrivacyAccounting[] {
    return Array.from(this.privacyAccounting.values());
  }

  // ==========================================================================
  // Model Distribution
  // ==========================================================================

  /**
   * Get current model version
   */
  getCurrentModel(): ModelVersion | null {
    return this.currentModel;
  }

  /**
   * Get model version by number
   */
  getModel(version: number): ModelVersion | undefined {
    return this.modelHistory.find(m => m.version === version);
  }

  /**
   * Get all model versions
   */
  getModelHistory(): ModelVersion[] {
    return [...this.modelHistory];
  }

  /**
   * Distribute model to colonies
   */
  async distributeModel(version: number): Promise<{
    success: string[];
    failed: Array<{ colonyId: string; error: string }>;
  }> {
    const model = this.getModel(version);
    if (!model) {
      throw new Error(`Model version ${version} not found`);
    }

    const success: string[] = [];
    const failed: Array<{ colonyId: string; error: string }> = [];

    for (const colony of this.colonies.values()) {
      if (!colony.isActive) continue;

      try {
        // In production, this would send model to colony
        // For now, we just track success
        success.push(colony.id);
      } catch (error) {
        failed.push({
          colonyId: colony.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.emit('model_distributed', {
      version,
      successCount: success.length,
      failedCount: failed.length,
    });

    return { success, failed };
  }

  /**
   * Verify model consistency
   */
  async verifyModelConsistency(version: number): Promise<boolean> {
    const model = this.getModel(version);
    if (!model) return false;

    // Verify checksum
    const computedChecksum = this.computeChecksum(model.aggregatedGradients);
    return computedChecksum === model.checksum;
  }

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  /**
   * Compute model hash
   */
  private computeModelHash(gradients: number[]): string {
    // Simple hash computation
    const str = JSON.stringify(gradients.slice(0, 100)); // Sample for efficiency
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Compute checksum
   */
  private computeChecksum(gradients: number[]): string {
    const sum = gradients.reduce((s, g) => s + g, 0);
    return sum.toFixed(10);
  }

  /**
   * Initialize first model version
   */
  private initializeModel(): void {
    this.currentModel = {
      version: 1,
      globalRound: 0,
      createdAt: Date.now(),
      modelHash: 'initial',
      parameterCount: 0,
      checksum: '0.0000000000',
      participatingColonies: [],
      aggregatedGradients: [],
      metadata: {
        epsilonUsed: 0,
        deltaUsed: 0,
        avgClipNorm: 0,
        totalSamples: 0,
      },
    };
  }

  // ==========================================================================
  // Statistics and Monitoring
  // ==========================================================================

  /**
   * Get coordinator statistics
   */
  getStats(): {
    totalRounds: number;
    successfulRounds: number;
    failedRounds: number;
    totalGradientsAggregated: number;
    totalPrivacyBudgetUsed: number;
    activeColonies: number;
    currentModelVersion: number;
    globalRound: number;
  } {
    return {
      ...this.stats,
      activeColonies: Array.from(this.colonies.values()).filter(c => c.isActive).length,
      currentModelVersion: this.currentModel?.version || 0,
      globalRound: this.globalRoundCounter,
    };
  }

  /**
   * Get round history
   */
  getRoundHistory(limit?: number): FederatedRoundStatus[] {
    if (limit) {
      return this.roundHistory.slice(-limit);
    }
    return [...this.roundHistory];
  }

  /**
   * Reset coordinator (for testing)
   */
  reset(): void {
    this.colonies.clear();
    this.modelHistory = [];
    this.roundHistory = [];
    this.privacyAccounting.clear();
    this.currentRound = null;
    this.globalRoundCounter = 0;
    this.stats = {
      totalRounds: 0,
      successfulRounds: 0,
      failedRounds: 0,
      totalGradientsAggregated: 0,
      totalPrivacyBudgetUsed: 0,
    };
    this.initializeModel();
  }
}

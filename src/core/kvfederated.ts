/**
 * POLLN KV-Federated Integration
 * Pattern-Organized Large Language Network
 *
 * Integration between KV-cache anchor system and federated learning.
 * Enables privacy-preserving sharing of KV-anchors across colonies.
 *
 * Key Features:
 * - FederatedKVSync: Share high-value anchors between colonies
 * - PrivacyAwareAnchors: Apply differential privacy to anchor embeddings
 * - AnchorAggregation: FedAvg-style anchor embedding aggregation
 *
 * Privacy Architecture:
 * - Per-tier privacy controls (LOCAL, COLONY, MEADOW)
 * - Differential privacy for anchor embeddings
 * - Privacy budget tracking for anchor sharing
 * - Quality-weighted aggregation with privacy preservation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { PrivacyTier } from './embedding.js';
import { KVAnchor, KVAnchorPool, AnchorMatch } from './kvanchor.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Anchor with privacy metadata for federated sharing
 */
export interface PrivateKVAnchor extends KVAnchor {
  privacyTier: PrivacyTier;
  dpMetadata?: {
    epsilon: number;
    delta: number;
    noiseScale: number;
  };
  sourceColonyId: string;
  crossColonyReuseCount: number;
}

/**
 * Anchor sync package for federated learning
 */
export interface AnchorSyncPackage {
  packageId: string;
  roundNumber: number;
  sourceColonyId: string;
  anchors: PrivateKVAnchor[];
  metadata: {
    totalAnchors: number;
    avgQualityScore: number;
    privacyTier: PrivacyTier;
    epsilonSpent: number;
    deltaSpent: number;
    compressionRatio: number;
  };
  timestamp: number;
}

/**
 * Aggregated anchor from multiple colonies
 */
export interface AggregatedAnchor {
  anchorId: string;
  layerId: number;
  aggregatedEmbedding: number[];
  aggregatedKeys: Float32Array;
  aggregatedValues: Float32Array;
  sourceColonies: string[];
  qualityScores: number[];
  weights: number[];
  aggregationMetadata: {
    colonyCount: number;
    avgQuality: number;
    minQuality: number;
    maxQuality: number;
    privacyPreserved: boolean;
  };
  createdAt: number;
}

/**
 * Privacy budget tracking for anchor sharing
 */
export interface AnchorPrivacyBudget {
  colonyId: string;
  privacyTier: PrivacyTier;
  epsilonSpent: number;
  deltaSpent: number;
  epsilonLimit: number;
  deltaLimit: number;
  anchorsShared: number;
  anchorsReceived: number;
  lastUpdated: number;
}

/**
 * Configuration for federated KV sync
 */
export interface FederatedKVSyncConfig {
  // Privacy controls
  defaultPrivacyTier: PrivacyTier;
  enableDifferentialPrivacy: boolean;
  noiseDistribution: 'gaussian' | 'laplacian';

 // Privacy budgets per tier
  privacyBudgets: {
    LOCAL: { epsilon: number; delta: number };
    COLONY: { epsilon: number; delta: number };
    MEADOW: { epsilon: number; delta: number };
    PUBLIC: { epsilon: number; delta: number };
    RESEARCH: { epsilon: number; delta: number };
  };

  // Anchor sharing
  minQualityForSharing: number;
  maxAnchorsPerSync: number;
  minCrossColonyReuse: number;

  // Aggregation
  aggregationMethod: 'fedavg' | 'weighted' | 'quality-weighted';
  minParticipatingColonies: number;
  qualityWeightExponent: number;

  // Sync management
  syncInterval: number;
  maxSyncRounds: number;
}

/**
 * Configuration for privacy-aware anchors
 */
export interface PrivacyAwareAnchorConfig {
  enableDifferentialPrivacy: boolean;
  clipThreshold: number;
  noiseScale: number;
  minPrivacyTier: PrivacyTier;
  preserveUtility: boolean;
  adaptiveNoise: boolean;
  noiseDistribution?: 'gaussian' | 'laplacian';
}

/**
 * Configuration for anchor aggregation
 */
export interface AnchorAggregationConfig {
  method: 'fedavg' | 'weighted' | 'quality-weighted';
  minQualityThreshold: number;
  maxAnchorsPerBatch: number;
  aggregationStrategy: 'mean' | 'weighted-mean' | 'geometric';
  pruningThreshold: number;
  diversityPenalty: number;
  qualityWeightExponent?: number;
}

/**
 * Statistics for federated KV sync
 */
export interface FederatedKVStats {
  totalSyncRounds: number;
  totalAnchorsShared: number;
  totalAnchorsReceived: number;
  totalAnchorsAggregated: number;
  avgAnchorQuality: number;
  crossColonyReuseRate: number;
  privacyBudgetUsed: number;
  compressionSavings: number;
}

// ============================================================================
// Federated KV Sync
// ============================================================================

/**
 * FederatedKVSync
 *
 * Manages synchronization of KV-anchors across colonies with privacy preservation.
 * High-value anchors are shared, aggregated, and distributed back to colonies.
 */
export class FederatedKVSync extends EventEmitter {
  private config: FederatedKVSyncConfig;
  private anchorPool: KVAnchorPool;
  private privacyBudgets: Map<string, AnchorPrivacyBudget> = new Map();
  private aggregatedAnchors: Map<string, AggregatedAnchor> = new Map();
  private syncHistory: AnchorSyncPackage[] = [];
  private currentRound: number = 0;

  // Statistics
  private stats: FederatedKVStats = {
    totalSyncRounds: 0,
    totalAnchorsShared: 0,
    totalAnchorsReceived: 0,
    totalAnchorsAggregated: 0,
    avgAnchorQuality: 0,
    crossColonyReuseRate: 0,
    privacyBudgetUsed: 0,
    compressionSavings: 0,
  };

  constructor(
    anchorPool: KVAnchorPool,
    config?: Partial<FederatedKVSyncConfig>
  ) {
    super();

    this.anchorPool = anchorPool;
    this.config = {
      defaultPrivacyTier: 'MEADOW',
      enableDifferentialPrivacy: true,
      noiseDistribution: 'gaussian',
      privacyBudgets: {
        LOCAL: { epsilon: Infinity, delta: 1.0 },
        COLONY: { epsilon: 2.0, delta: 1e-4 },
        MEADOW: { epsilon: 1.0, delta: 1e-5 },
        RESEARCH: { epsilon: 0.5, delta: 1e-6 },
        PUBLIC: { epsilon: 0.3, delta: 1e-7 },
      },
      minQualityForSharing: 0.7,
      maxAnchorsPerSync: 50,
      minCrossColonyReuse: 2,
      aggregationMethod: 'quality-weighted',
      minParticipatingColonies: 2,
      qualityWeightExponent: 2,
      syncInterval: 60000, // 1 minute
      maxSyncRounds: 100,
      ...config,
    };
  }

  /**
   * Register a colony for federated anchor sync
   */
  async registerColony(
    colonyId: string,
    privacyTier: PrivacyTier = this.config.defaultPrivacyTier
  ): Promise<AnchorPrivacyBudget> {
    const budget: AnchorPrivacyBudget = {
      colonyId,
      privacyTier,
      epsilonSpent: 0,
      deltaSpent: 0,
      epsilonLimit: this.config.privacyBudgets[privacyTier]?.epsilon ?? Infinity,
      deltaLimit: this.config.privacyBudgets[privacyTier]?.delta ?? 0,
      anchorsShared: 0,
      anchorsReceived: 0,
      lastUpdated: Date.now(),
    };

    this.privacyBudgets.set(colonyId, budget);

    this.emit('colony_registered', { colonyId, privacyTier });
    return budget;
  }

  /**
   * Prepare anchors for federated sharing from a colony
   */
  async prepareAnchorsForSharing(
    colonyId: string,
    privacyTier?: PrivacyTier
  ): Promise<AnchorSyncPackage> {
    const budget = this.privacyBudgets.get(colonyId);
    if (!budget) {
      throw new Error(`Colony ${colonyId} not registered`);
    }

    const effectivePrivacyTier = privacyTier || budget.privacyTier;
    const poolStats = this.anchorPool.getStats();
    const allAnchors = Object.entries(poolStats.anchorsByLayer)
      .flatMap(([layerId, _]) => this.anchorPool.getAnchorsForLayer(parseInt(layerId)));

    // Filter high-value anchors
    const highValueAnchors = allAnchors
      .filter(anchor => this.shouldShareAnchor(anchor, budget))
      .slice(0, this.config.maxAnchorsPerSync);

    // Apply privacy mechanisms
    const privateAnchors = await this.applyPrivacyToAnchors(
      highValueAnchors,
      colonyId,
      effectivePrivacyTier
    );

    // Calculate metadata
    const avgQuality = privateAnchors.reduce((sum, a) => sum + a.qualityScore, 0) / privateAnchors.length;
    const totalEpsilon = privateAnchors.reduce((sum, a) => sum + (a.dpMetadata?.epsilon || 0), 0);
    const totalDelta = privateAnchors.reduce((sum, a) => sum + (a.dpMetadata?.delta || 0), 0);

    const syncPackage: AnchorSyncPackage = {
      packageId: uuidv4(),
      roundNumber: ++this.currentRound,
      sourceColonyId: colonyId,
      anchors: privateAnchors,
      metadata: {
        totalAnchors: privateAnchors.length,
        avgQualityScore: avgQuality,
        privacyTier: effectivePrivacyTier,
        epsilonSpent: totalEpsilon,
        deltaSpent: totalDelta,
        compressionRatio: this.calculateAvgCompressionRatio(privateAnchors),
      },
      timestamp: Date.now(),
    };

    // Update privacy budget
    budget.epsilonSpent += totalEpsilon;
    budget.deltaSpent += totalDelta;
    budget.anchorsShared += privateAnchors.length;
    budget.lastUpdated = Date.now();

    // Update statistics
    this.stats.totalSyncRounds++;
    this.stats.totalAnchorsShared += privateAnchors.length;

    this.syncHistory.push(syncPackage);
    this.emit('anchors_prepared', syncPackage);

    return syncPackage;
  }

  /**
   * Receive and integrate anchors from other colonies
   */
  async receiveAnchorsFromColony(
    syncPackage: AnchorSyncPackage
  ): Promise<number> {
    const receivingColonyId = 'local'; // In production, would be actual colony ID
    const budget = this.privacyBudgets.get(receivingColonyId);
    if (!budget) {
      throw new Error(`Receiving colony not registered`);
    }

    let integratedCount = 0;

    for (const anchor of syncPackage.anchors) {
      // Check if we should integrate this anchor
      if (this.shouldIntegrateAnchor(anchor)) {
        // Store as received anchor for potential aggregation
        await this.integrateAnchor(anchor, receivingColonyId);
        integratedCount++;
      }
    }

    // Update statistics
    budget.anchorsReceived += integratedCount;
    budget.lastUpdated = Date.now();
    this.stats.totalAnchorsReceived += integratedCount;

    this.emit('anchors_received', {
      packageId: syncPackage.packageId,
      integratedCount,
      sourceColonyId: syncPackage.sourceColonyId,
    });

    return integratedCount;
  }

  /**
   * Track cross-colony anchor reuse
   */
  trackCrossColonyReuse(anchorId: string, colonyId: string): void {
    const anchor = this.anchorPool.getAnchor(anchorId);
    if (!anchor) return;

    // Update cross-colony reuse tracking
    // Note: We need to extend the KVAnchor type to include crossColonyReuseCount
    // For now, we'll track this internally
    let reuseCount = 0;
    const trackedAnchor = this.aggregatedAnchors.get(anchorId);
    if (trackedAnchor) {
      // This is an aggregated anchor
      reuseCount = trackedAnchor.sourceColonies.length;
    } else {
      // This is a regular anchor, initialize tracking
      reuseCount = 1;
      const privateAnchor = anchor as unknown as PrivateKVAnchor;
      if (privateAnchor.crossColonyReuseCount !== undefined) {
        privateAnchor.crossColonyReuseCount++;
        reuseCount = privateAnchor.crossColonyReuseCount;
      }
    }

    this.emit('cross_colony_reuse', {
      anchorId,
      colonyId,
      reuseCount,
    });
  }

  /**
   * Get privacy budget for a colony
   */
  getPrivacyBudget(colonyId: string): AnchorPrivacyBudget | undefined {
    return this.privacyBudgets.get(colonyId);
  }

  /**
   * Get sync statistics
   */
  getStats(): FederatedKVStats {
    return { ...this.stats };
  }

  /**
   * Get sync history
   */
  getSyncHistory(limit?: number): AnchorSyncPackage[] {
    if (limit) {
      return this.syncHistory.slice(-limit);
    }
    return [...this.syncHistory];
  }

  /**
   * Reset sync state
   */
  reset(): void {
    this.privacyBudgets.clear();
    this.aggregatedAnchors.clear();
    this.syncHistory = [];
    this.currentRound = 0;
    this.stats = {
      totalSyncRounds: 0,
      totalAnchorsShared: 0,
      totalAnchorsReceived: 0,
      totalAnchorsAggregated: 0,
      avgAnchorQuality: 0,
      crossColonyReuseRate: 0,
      privacyBudgetUsed: 0,
      compressionSavings: 0,
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private shouldShareAnchor(anchor: KVAnchor, budget: AnchorPrivacyBudget): boolean {
    // Check quality threshold
    if (anchor.qualityScore < this.config.minQualityForSharing) {
      return false;
    }

    // Check privacy budget
    if (budget.privacyTier !== 'LOCAL') {
      const budgets = this.config.privacyBudgets[budget.privacyTier];
      if (budget.epsilonSpent >= budgets.epsilon) {
        return false;
      }
    }

    // Check cross-colony reuse threshold
    const privateAnchor = anchor as PrivateKVAnchor;
    if (privateAnchor.crossColonyReuseCount < this.config.minCrossColonyReuse) {
      return false;
    }

    return true;
  }

  private async applyPrivacyToAnchors(
    anchors: KVAnchor[],
    colonyId: string,
    privacyTier: PrivacyTier
  ): Promise<PrivateKVAnchor[]> {
    const privacyAware = new PrivacyAwareAnchors({
      enableDifferentialPrivacy: this.config.enableDifferentialPrivacy,
      clipThreshold: 1.0,
      noiseScale: this.config.privacyBudgets[privacyTier].epsilon,
      minPrivacyTier: 'LOCAL',
      preserveUtility: true,
      adaptiveNoise: true,
    });

    const privateAnchors: PrivateKVAnchor[] = [];

    for (const anchor of anchors) {
      const privateAnchor = await privacyAware.applyPrivacyToAnchor(
        anchor,
        privacyTier,
        colonyId
      );
      privateAnchors.push(privateAnchor);
    }

    return privateAnchors;
  }

  private shouldIntegrateAnchor(anchor: PrivateKVAnchor): boolean {
    // Check quality threshold
    if (anchor.qualityScore < this.config.minQualityForSharing) {
      return false;
    }

    // Check if similar anchor already exists
    const poolStats = this.anchorPool.getStats();
    const existingAnchors = Object.entries(poolStats.anchorsByLayer)
      .flatMap(([layerId, _]) => this.anchorPool.getAnchorsForLayer(parseInt(layerId)));

    for (const existing of existingAnchors) {
      const similarity = this.cosineSimilarity(anchor.embedding, existing.embedding);
      if (similarity > 0.9) {
        // Too similar, don't integrate
        return false;
      }
    }

    return true;
  }

  private async integrateAnchor(
    anchor: PrivateKVAnchor,
    colonyId: string
  ): Promise<void> {
    // Store anchor for aggregation
    // In production, this would add to the anchor pool
    this.aggregatedAnchors.set(anchor.anchorId, {
      anchorId: anchor.anchorId,
      layerId: anchor.layerId,
      aggregatedEmbedding: anchor.embedding,
      aggregatedKeys: anchor.compressedKeys,
      aggregatedValues: anchor.compressedValues,
      sourceColonies: [anchor.sourceColonyId],
      qualityScores: [anchor.qualityScore],
      weights: [1.0],
      aggregationMetadata: {
        colonyCount: 1,
        avgQuality: anchor.qualityScore,
        minQuality: anchor.qualityScore,
        maxQuality: anchor.qualityScore,
        privacyPreserved: anchor.dpMetadata !== undefined,
      },
      createdAt: Date.now(),
    });
  }

  private calculateAvgCompressionRatio(anchors: PrivateKVAnchor[]): number {
    if (anchors.length === 0) return 0;
    return anchors.reduce((sum, a) => sum + a.compressionRatio, 0) / anchors.length;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }
}

// ============================================================================
// Privacy Aware Anchors
// ============================================================================

/**
 * PrivacyAwareAnchors
 *
 * Applies differential privacy mechanisms to KV-anchors before sharing.
 * Adds calibrated noise to anchor embeddings while preserving utility.
 */
export class PrivacyAwareAnchors {
  private config: PrivacyAwareAnchorConfig;

  constructor(config?: Partial<PrivacyAwareAnchorConfig>) {
    this.config = {
      enableDifferentialPrivacy: true,
      clipThreshold: 1.0,
      noiseScale: 1.0,
      minPrivacyTier: 'LOCAL',
      preserveUtility: true,
      adaptiveNoise: true,
      noiseDistribution: 'gaussian',
      ...config,
    };
  }

  /**
   * Apply privacy mechanisms to a single anchor
   */
  async applyPrivacyToAnchor(
    anchor: KVAnchor,
    privacyTier: PrivacyTier,
    sourceColonyId: string
  ): Promise<PrivateKVAnchor> {
    let embedding = [...anchor.embedding];
    let keys: Float32Array = new Float32Array(anchor.compressedKeys.slice().buffer as ArrayBuffer);
    let values: Float32Array = new Float32Array(anchor.compressedValues.slice().buffer as ArrayBuffer);

    let dpMetadata: PrivateKVAnchor['dpMetadata'] = undefined;

    // Skip privacy for LOCAL tier
    if (privacyTier === 'LOCAL' || !this.config.enableDifferentialPrivacy) {
      return {
        ...anchor,
        privacyTier,
        dpMetadata,
        sourceColonyId,
        crossColonyReuseCount: 0,
      };
    }

    // 1. Clip embeddings to bound sensitivity
    embedding = this.clipEmbedding(embedding, this.config.clipThreshold);

    // 2. Add noise for differential privacy
    const noiseScale = this.calculateNoiseScale(privacyTier);
    embedding = this.addNoiseToEmbedding(embedding, noiseScale);

    // 3. Add noise to compressed keys and values (less critical)
    if (this.config.preserveUtility) {
      // Less noise to keys/values to preserve utility
      const kvNoiseScale = noiseScale * 0.5;
      keys = this.addNoiseToFloat32Array(keys, kvNoiseScale);
      values = this.addNoiseToFloat32Array(values, kvNoiseScale);
    }

    dpMetadata = {
      epsilon: this.getEpsilonForTier(privacyTier),
      delta: 1e-5,
      noiseScale,
    };

    return {
      ...anchor,
      embedding,
      compressedKeys: keys,
      compressedValues: values,
      privacyTier,
      dpMetadata,
      sourceColonyId,
      crossColonyReuseCount: 0,
    };
  }

  /**
   * Apply privacy mechanisms to multiple anchors
   */
  async applyPrivacyToAnchors(
    anchors: KVAnchor[],
    privacyTier: PrivacyTier,
    sourceColonyId: string
  ): Promise<PrivateKVAnchor[]> {
    const privateAnchors: PrivateKVAnchor[] = [];

    for (const anchor of anchors) {
      const privateAnchor = await this.applyPrivacyToAnchor(
        anchor,
        privacyTier,
        sourceColonyId
      );
      privateAnchors.push(privateAnchor);
    }

    return privateAnchors;
  }

  /**
   * Check if privacy budget allows sharing
   */
  checkPrivacyBudget(budget: AnchorPrivacyBudget, anchorsToShare: number): boolean {
    if (budget.privacyTier === 'LOCAL') {
      return true;
    }

    const epsilonPerAnchor = this.getEpsilonForTier(budget.privacyTier);
    const totalEpsilon = epsilonPerAnchor * anchorsToShare;

    return budget.epsilonSpent + totalEpsilon <= budget.epsilonLimit;
  }

  /**
   * Get epsilon value for privacy tier
   */
  private getEpsilonForTier(tier: PrivacyTier): number {
    switch (tier) {
      case 'LOCAL':
        return Infinity;
      case 'MEADOW':
        return 1.0;
      case 'RESEARCH':
        return 0.5;
      case 'PUBLIC':
        return 0.3;
      default:
        return 1.0;
    }
  }

  /**
   * Calculate noise scale based on privacy tier
   */
  private calculateNoiseScale(privacyTier: PrivacyTier): number {
    const epsilon = this.getEpsilonForTier(privacyTier);
    if (epsilon === Infinity) return 0;

    return this.config.clipThreshold / epsilon;
  }

  /**
   * Clip embedding to bound sensitivity
   */
  private clipEmbedding(embedding: number[], threshold: number): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));

    if (norm > threshold) {
      const scale = threshold / norm;
      return embedding.map(v => v * scale);
    }

    return embedding;
  }

  /**
   * Add noise to embedding vector
   */
  private addNoiseToEmbedding(embedding: number[], noiseScale: number): number[] {
    return embedding.map(() => {
      if (this.config.noiseDistribution === 'gaussian') {
        return this.gaussianNoise(0, noiseScale);
      } else {
        return this.laplacianNoise(0, noiseScale);
      }
    });
  }

  /**
   * Add noise to Float32Array
   */
  private addNoiseToFloat32Array(array: Float32Array, noiseScale: number): Float32Array {
    const noisy = new Float32Array(array.length);

    for (let i = 0; i < array.length; i++) {
      if (this.config.noiseDistribution === 'gaussian') {
        noisy[i] = array[i] + this.gaussianNoise(0, noiseScale);
      } else {
        noisy[i] = array[i] + this.laplacianNoise(0, noiseScale);
      }
    }

    return noisy;
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
}

// ============================================================================
// Anchor Aggregation
// ============================================================================

/**
 * AnchorAggregation
 *
 * Aggregates anchors from multiple colonies using FedAvg-style algorithms.
 * Weights anchors by quality and reuse count for optimal aggregation.
 */
export class AnchorAggregation {
  private config: AnchorAggregationConfig;

  constructor(config?: Partial<AnchorAggregationConfig>) {
    this.config = {
      method: 'quality-weighted',
      minQualityThreshold: 0.6,
      maxAnchorsPerBatch: 100,
      aggregationStrategy: 'weighted-mean',
      pruningThreshold: 0.3,
      diversityPenalty: 0.1,
      qualityWeightExponent: 2,
      ...config,
    };
  }

  /**
   * Aggregate anchors from multiple colonies
   */
  async aggregateAnchors(
    anchorPackages: AnchorSyncPackage[]
  ): Promise<AggregatedAnchor[]> {
    if (anchorPackages.length < 2) {
      throw new Error('Need at least 2 anchor packages for aggregation');
    }

    // Group anchors by layer
    const anchorsByLayer = this.groupAnchorsByLayer(anchorPackages);

    const aggregatedAnchors: AggregatedAnchor[] = [];

    // Aggregate each layer group
    for (const [layerId, anchors] of anchorsByLayer.entries()) {
      // Cluster similar anchors
      const clusters = this.clusterSimilarAnchors(anchors);

      // Aggregate each cluster
      for (const cluster of clusters) {
        const aggregated = await this.aggregateAnchorCluster(cluster, layerId);
        if (aggregated) {
          aggregatedAnchors.push(aggregated);
        }
      }
    }

    // Prune low-quality aggregated anchors
    const pruned = this.pruneLowQualityAnchors(aggregatedAnchors);

    return pruned;
  }

  /**
   * FedAvg-style aggregation for anchor embeddings
   */
  fedAvgAggregation(anchors: PrivateKVAnchor[]): {
    embedding: number[];
    keys: Float32Array;
    values: Float32Array;
  } {
    if (anchors.length === 0) {
      return { embedding: [], keys: new Float32Array(0), values: new Float32Array(0) };
    }

    // Average embeddings
    const embeddingDim = anchors[0].embedding.length;
    const avgEmbedding = new Array(embeddingDim).fill(0);

    for (const anchor of anchors) {
      for (let i = 0; i < embeddingDim; i++) {
        avgEmbedding[i] += anchor.embedding[i] / anchors.length;
      }
    }

    // Average compressed keys and values
    const keyDim = anchors[0].compressedKeys.length;
    const valueDim = anchors[0].compressedValues.length;

    const avgKeys = new Float32Array(keyDim);
    const avgValues = new Float32Array(valueDim);

    for (const anchor of anchors) {
      for (let i = 0; i < keyDim; i++) {
        avgKeys[i] += anchor.compressedKeys[i] / anchors.length;
      }
      for (let i = 0; i < valueDim; i++) {
        avgValues[i] += anchor.compressedValues[i] / anchors.length;
      }
    }

    return {
      embedding: avgEmbedding,
      keys: avgKeys,
      values: avgValues,
    };
  }

  /**
   * Quality-weighted aggregation
   */
  qualityWeightedAggregation(anchors: PrivateKVAnchor[]): {
    embedding: number[];
    keys: Float32Array;
    values: Float32Array;
  } {
    if (anchors.length === 0) {
      return { embedding: [], keys: new Float32Array(0), values: new Float32Array(0) };
    }

    // Calculate weights based on quality
    const exponent = this.config.qualityWeightExponent ?? 2;
    const weights = anchors.map(a => Math.pow(a.qualityScore, exponent));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Weighted average embeddings
    const embeddingDim = anchors[0].embedding.length;
    const weightedEmbedding = new Array(embeddingDim).fill(0);

    for (let i = 0; i < anchors.length; i++) {
      const normalizedWeight = weights[i] / totalWeight;
      for (let j = 0; j < embeddingDim; j++) {
        weightedEmbedding[j] += anchors[i].embedding[j] * normalizedWeight;
      }
    }

    // Weighted average compressed keys and values
    const keyDim = anchors[0].compressedKeys.length;
    const valueDim = anchors[0].compressedValues.length;

    const weightedKeys = new Float32Array(keyDim);
    const weightedValues = new Float32Array(valueDim);

    for (let i = 0; i < anchors.length; i++) {
      const normalizedWeight = weights[i] / totalWeight;
      for (let j = 0; j < keyDim; j++) {
        weightedKeys[j] += anchors[i].compressedKeys[j] * normalizedWeight;
      }
      for (let j = 0; j < valueDim; j++) {
        weightedValues[j] += anchors[i].compressedValues[j] * normalizedWeight;
      }
    }

    return {
      embedding: weightedEmbedding,
      keys: weightedKeys,
      values: weightedValues,
    };
  }

  /**
   * Get aggregation statistics
   */
  getAggregationStats(): {
    totalAggregated: number;
    avgQualityImprovement: number;
    pruningRate: number;
    diversityScore: number;
  } {
    // In production, this would track actual aggregation history
    return {
      totalAggregated: 0,
      avgQualityImprovement: 0,
      pruningRate: 0,
      diversityScore: 0,
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private groupAnchorsByLayer(
    packages: AnchorSyncPackage[]
  ): Map<number, PrivateKVAnchor[]> {
    const grouped = new Map<number, PrivateKVAnchor[]>();

    for (const pkg of packages) {
      for (const anchor of pkg.anchors) {
        if (!grouped.has(anchor.layerId)) {
          grouped.set(anchor.layerId, []);
        }
        grouped.get(anchor.layerId)!.push(anchor);
      }
    }

    return grouped;
  }

  private clusterSimilarAnchors(anchors: PrivateKVAnchor[]): PrivateKVAnchor[][] {
    if (anchors.length === 0) return [];

    const clusters: PrivateKVAnchor[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < anchors.length; i++) {
      if (used.has(i)) continue;

      const cluster = [anchors[i]];
      used.add(i);

      // Find similar anchors
      for (let j = i + 1; j < anchors.length; j++) {
        if (used.has(j)) continue;

        const similarity = this.cosineSimilarity(
          anchors[i].embedding,
          anchors[j].embedding
        );

        if (similarity > 0.85) {
          cluster.push(anchors[j]);
          used.add(j);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  private async aggregateAnchorCluster(
    cluster: PrivateKVAnchor[],
    layerId: number
  ): Promise<AggregatedAnchor | null> {
    if (cluster.length === 0) return null;

    // Filter by quality threshold
    const qualityFiltered = cluster.filter(a => a.qualityScore >= this.config.minQualityThreshold);
    if (qualityFiltered.length === 0) return null;

    // Aggregate based on method
    let aggregated: {
      embedding: number[];
      keys: Float32Array;
      values: Float32Array;
    };

    switch (this.config.method) {
      case 'fedavg':
        aggregated = this.fedAvgAggregation(qualityFiltered);
        break;
      case 'weighted':
      case 'quality-weighted':
        aggregated = this.qualityWeightedAggregation(qualityFiltered);
        break;
      default:
        aggregated = this.fedAvgAggregation(qualityFiltered);
    }

    const qualityScores = qualityFiltered.map(a => a.qualityScore);
    const exponent = this.config.qualityWeightExponent ?? 2;
    const weights = qualityFiltered.map(a => Math.pow(a.qualityScore, exponent));

    return {
      anchorId: `aggregated-layer${layerId}-${Date.now()}`,
      layerId,
      aggregatedEmbedding: aggregated.embedding,
      aggregatedKeys: aggregated.keys,
      aggregatedValues: aggregated.values,
      sourceColonies: qualityFiltered.map(a => a.sourceColonyId),
      qualityScores,
      weights,
      aggregationMetadata: {
        colonyCount: new Set(qualityFiltered.map(a => a.sourceColonyId)).size,
        avgQuality: qualityScores.reduce((s, q) => s + q, 0) / qualityScores.length,
        minQuality: Math.min(...qualityScores),
        maxQuality: Math.max(...qualityScores),
        privacyPreserved: qualityFiltered.some(a => a.dpMetadata !== undefined),
      },
      createdAt: Date.now(),
    };
  }

  private pruneLowQualityAnchors(anchors: AggregatedAnchor[]): AggregatedAnchor[] {
    // Filter by average quality
    return anchors.filter(
      anchor => anchor.aggregationMetadata.avgQuality >= this.config.pruningThreshold
    );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }
}

/**
 * POLLN Behavioral Embedding Space (BES)
 * Pollen Grain Implementation
 */

import { v4 as uuidv4 } from 'uuid';

export type PrivacyTier = 'LOCAL' | 'MEADOW' | 'RESEARCH' | 'PUBLIC';

export interface PollenGrainConfig {
  gardenerId: string;
  dimensionality: number;
  privacyTier: PrivacyTier;
}

export interface PollenGrain {
  id: string;
  gardenerId: string;
  embedding: number[];
  dimensionality: number;
  sourceLogCount: number;
  privacyTier: PrivacyTier;
  dpMetadata?: {
    epsilon: number;
    delta: number;
    noiseScale: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface BESConfig {
  defaultDimensionality: number;
  defaultPrivacyTier: PrivacyTier;
  maxDimensionality: number;
  minDimensionality: number;
}

export const PRIVACY_PARAMS: Record<PrivacyTier, { dimensionality: number; epsilon: number; delta: number }> = {
  LOCAL: { dimensionality: 1024, epsilon: Infinity, delta: 0 },
  MEADOW: { dimensionality: 512, epsilon: 1.0, delta: 1e-5 },
  RESEARCH: { dimensionality: 256, epsilon: 0.5, delta: 1e-6 },
  PUBLIC: { dimensionality: 128, epsilon: 0.3, delta: 1e-7 },
};

export interface PrivacyBudgetStatus {
  tier: PrivacyTier;
  used: number;
  total: number;
  remaining: number;
}

/**
 * BES (Behavioral Embedding Space) Implementation
 *
 * Based on Round 2 Research: Multi-tier privacy with DP
 */
export class BES {
  private config: BESConfig;
  private grains: Map<string, PollenGrain> = new Map();
  private privacyBudgets: Map<PrivacyTier, { used: number; total: number }>;

  constructor(config?: Partial<BESConfig>) {
    this.config = {
      defaultDimensionality: 1024,
      defaultPrivacyTier: 'LOCAL',
      maxDimensionality: 1024,
      minDimensionality: 32,
      ...config
    };

    // Initialize privacy budgets
    this.privacyBudgets = new Map([
      ['LOCAL', { used: 0, total: Infinity }],
      ['MEADOW', { used: 0, total: 1.0 }],
      ['RESEARCH', { used: 0, total: 0.5 }],
      ['PUBLIC', { used: 0, total: 0.3 }],
    ]);
  }

  /**
   * Create a pollen grain (behavioral embedding)
   */
  async createGrain(
    embedding: number[],
    gardenerId: string,
    options?: Partial<PollenGrainConfig>
  ): Promise<PollenGrain> {
    const id = uuidv4();
    const now = Date.now();

    // Determine dimensionality based on privacy tier
    const privacyTier = options?.privacyTier || this.config.defaultPrivacyTier;
    const targetDim = this.getDimensionality(privacyTier);

    // Apply dimensionality reduction if needed
    const reducedEmbedding = this.reduceDimensionality(embedding, targetDim);

    // Apply differential privacy if not local
    const { noisyEmbedding, dpMetadata } = this.applyDP(reducedEmbedding, privacyTier);

    const grain: PollenGrain = {
      id,
      gardenerId,
      embedding: noisyEmbedding,
      dimensionality: targetDim,
      sourceLogCount: 1,
      privacyTier,
      dpMetadata,
      createdAt: now,
      updatedAt: now,
    };

    this.grains.set(id, grain);
    this.updatePrivacyBudget(privacyTier, dpMetadata?.epsilon || 0);

    return grain;
  }

  /**
   * Get dimensionality for privacy tier
   */
  private getDimensionality(tier: PrivacyTier): number {
    const params = PRIVACY_PARAMS[tier];
    return params?.dimensionality || this.config.defaultDimensionality;
  }

  /**
   * Reduce dimensionality based on privacy tier
   */
  private reduceDimensionality(
    embedding: number[],
    targetDimensionality: number
  ): number[] {
    if (embedding.length <= targetDimensionality) {
      return embedding;
    }

    // Simple truncation for reduction
    // In production, this would use PCA or learned projection
    return embedding.slice(0, targetDimensionality);
  }

  /**
   * Apply differential privacy
   */
  private applyDP(
    embedding: number[],
    tier: PrivacyTier
  ): { noisyEmbedding: number[]; dpMetadata: { epsilon: number; delta: number; noiseScale: number } | undefined } {
    if (tier === 'LOCAL') {
      return { noisyEmbedding: embedding, dpMetadata: undefined };
    }

    const params = PRIVACY_PARAMS[tier];
    const noiseScale = params.epsilon * 0.1;

    // Gaussian mechanism: add noise to each dimension
    const noise = embedding.map(() => {
      const u1 = Math.random();
      const u2 = Math.random();
      // Box-Muller transform for normal distribution
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * noiseScale;
    });

    const noisyEmbedding = embedding.map((val, i) => val + noise[i]);

    return {
      noisyEmbedding,
      dpMetadata: {
        epsilon: params.epsilon,
        delta: params.delta,
        noiseScale,
      }
    };
  }

  /**
   * Get pollen grain
   */
  getGrain(id: string): PollenGrain | undefined {
    return this.grains.get(id);
  }

  /**
   * Find similar grains using cosine similarity
   */
  findSimilar(
    query: number[],
    threshold: number = 0.8,
    limit: number = 10
  ): PollenGrain[] {
    const candidates: { grain: PollenGrain; similarity: number }[] = [];

    for (const grain of this.grains.values()) {
      const similarity = this.cosineSimilarity(query, grain.embedding);
      if (similarity >= threshold) {
        candidates.push({ grain, similarity });
      }
    }

    // Sort by similarity and return top results
    return candidates
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(c => c.grain);
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  /**
   * Update privacy budget
   */
  private updatePrivacyBudget(tier: PrivacyTier, used: number): void {
    const budget = this.privacyBudgets.get(tier);
    if (budget) {
      budget.used += used;
      if (budget.used > budget.total) {
        console.warn(`Privacy budget exhausted for ${tier}`);
      }
    }
  }

  /**
   * Get privacy budget status
   */
  getPrivacyBudgetStatus(tier: PrivacyTier): PrivacyBudgetStatus | undefined {
    const budget = this.privacyBudgets.get(tier);
    if (!budget) return undefined;

    return {
      tier,
      used: budget.used,
      total: budget.total,
      remaining: budget.total === Infinity ? Infinity : budget.total - budget.used,
    };
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalGrains: number;
    grainsByTier: Record<PrivacyTier, number>;
    privacyBudgetStatus: Record<PrivacyTier, PrivacyBudgetStatus>;
  } {
    const grainsByTier: Record<PrivacyTier, number> = {
      LOCAL: 0,
      MEADOW: 0,
      RESEARCH: 0,
      PUBLIC: 0,
    };

    for (const grain of this.grains.values()) {
      grainsByTier[grain.privacyTier]++;
    }

    const privacyBudgetStatus: Record<PrivacyTier, PrivacyBudgetStatus> = {} as Record<PrivacyTier, PrivacyBudgetStatus>;
    for (const tier of this.privacyBudgets.keys()) {
      const status = this.getPrivacyBudgetStatus(tier);
      if (status) privacyBudgetStatus[tier] = status;
    }

    return {
      totalGrains: this.grains.size,
      grainsByTier,
      privacyBudgetStatus,
    };
  }
}

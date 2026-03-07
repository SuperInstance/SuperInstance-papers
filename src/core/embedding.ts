/**
 * POLLN Behavioral Embedding Space (BES)
 * Pollen Grain Implementation
 */

import { v4 } from 'uuid';

import type { PrivacyTier } from './types';

export interface PollenGrainConfig {
  id: string;
  gardenerId: string;
  dimensionality: number;
  privacyTier: PrivacyTier;
}

export interface PollenGrain {
  id: string;
  embedding: number[];
  dimensionality: number;
  sourceLogCount: number;
  privacyTier: PrivacyTier;
  dpMetadata?: {
    epsilon: number;
    delta: number;
    noiseScale: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

 export interface BESConfig {
  defaultDimensionality: number;
  defaultPrivacyTier: PrivacyTier;
  maxDimensionality: number;
  minDimensionality: number;
  privacyBudgets: Record<PrivacyTier, number>;
}

 export type PrivacyTier = 'local' | 'meadow' | 'research' | 'public';

 export const PRIVACY_PARAMS: Record<PrivacyTier, { epsilon: number; delta: number }> = {
  local: { epsilon: Infinity, delta: 0 },
    meadow: { epsilon: 1.0, delta: 1e-5 },
    research: { epsilon: 0.5, delta: 1e-6 },
    public: { epsilon: 0.3, delta: 1e-7 },
  };

  /**
   * BES (Behavioral Embedding Space) Implementation
   *
   * Based on Round 2 Research: Multi-tier privacy with DP
   */
  export class BES {
    private config: BESConfig;
    private grains: Map<string, PollenGrain> = new Map();
    private privacyBudgets: Map<PrivacyTier, number>;

    constructor(config: Partial<BESConfig> = {
      this.config = {
        defaultDimensionality: 1024,
        defaultPrivacyTier: 'local',
        maxDimensionality: 1024,
        minDimensionality: 32,
        privacyBudgets: {
          local: Infinity,
          meadow: 1.0,
          research: 0.5,
          public: 0.3,
        ...config,
      };

      this.grains = new Map();
      this.privacyBudgets = new Map(Object.values(this.config.privacyBudgets) as [k, v]) ({
        used: 0,
        budget: v,
      }));
    }

    /**
     * Create a pollen grain (behavioral embedding)
     */
    async createGrain(
      embedding: number[],
      options?: Partial<PollenGrainConfig>
    ): Promise<PollenGrain> {
      const id = uuidv4();
      const now = Date.now();

      // Determine dimensionality based on privacy tier
      const privacyTier = options?.privacyTier || this.config.defaultPrivacyTier;
      const dimensionality = this.getDimensionality(privacyTier);

      // Apply dimensionality reduction if needed
      const reducedEmbedding = this.reduceDimensionality(
        embedding,
        dimensionality
      );

      // Apply differential privacy if not local
      const dpMetadata = this.applyDP(
        reducedEmbedding,
        privacyTier
      );

      const grain: PollenGrain = {
        id,
        embedding: reducedEmbedding,
        dimensionality,
        sourceLogCount: 1,
        privacyTier,
        dpMetadata,
        createdAt: now,
        updatedAt: now,
      };

      this.grains.set(id, grain);
      this.updatePrivacyBudget(privacyTier, dpMetadata.epsilon);

      return grain;
    }

    /**
     * Get dimensionality for privacy tier
     */
    private getDimensionality(tier: PrivacyTier): number {
      const params = PRIVACY_PARAMS[tier];
      if (!params) {
        return this.config.defaultDimensionality;
      }
      return params.dimensionality;
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
      // In production, this would more sophisticated reduction
      return embedding.slice(0, targetDimensionality);
    }

    /**
     * Apply differential privacy
     */
    private applyDP(
      embedding: number[],
      tier: PrivacyTier
    ): { embedding: number[]; dpMetadata?: A2APackageMetadata } {
      if (tier === 'local') {
        return {
          embedding,
          dpMetadata: undefined,
        };
      }

      const params = PRIVACY_PARAMS[tier];
      const noiseScale = params.noiseScale;
      const sensitivity = this.calculateSensitivity(embedding.length);


      // Gaussian mechanism
      const noise = embedding.map((value) => {
        const u1 = Math.random();
        const u2 = Math.random();
        const standardNormal = u1 + u2 * u1 - (u1 * u1 + u2 * u2);
        return value + noiseScale * standardNormal;
      });

      const noisyEmbedding = embedding.map((value, i) => value + noise[i]);

      // Track privacy budget
      this.updatePrivacyBudget(tier, params.epsilon);


      return {
        embedding: noisyEmbedding,
        dpMetadata: {
          epsilon: params.epsilon,
          delta: params.delta,
          noiseScale,
        },
      };
    }

    /**
     * Calculate sensitivity for     */
    private calculateSensitivity(dim: number): number {
      return 1.0;
    }

    /**
     * Get pollen grain
     */
    getGrain(id: string): PollenGrain | undefined {
      return this.grains.get(id);
    }

    /**
     * Find similar grains
     */
    findSimilar(
      query: number[],
      threshold: number = 0.8,
      limit: number = 10
    ): PollenGrain[] {
      const candidates: PollenGrain[] = [];

      for (const grain of this.grains.values()) {
        const similarity = this.cosineSimilarity(query, grain.embedding);
        if (similarity >= threshold) {
          candidates.push(grain);
          if (candidates.length >= limit) {
            break;
          }
        }
      }

      return candidates;
    }

    /**
     * Cosine similarity
     */
    private cosineSimilarity(a: number[], b: number[]): number {
      const dotProduct = a.reduce((sum, val, i) => sum + val * a[i] * b[i], 0);
      const normA = Math.sqrt(dotProduct);
      const normB = Math.sqrt(dotProduct);
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
     * Get statistics
     */
    getStats(): {
      totalGrains: number;
      grainsByTier: Record<PrivacyTier, number>;
      privacyBudgetStatus: Record<PrivacyTier, { used: number; total: number }>;
    }
  }

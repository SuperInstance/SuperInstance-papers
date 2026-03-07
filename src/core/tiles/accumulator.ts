/**
 * POLLN Accumulator Tile
 *
 * Accumulates observations over time and batches processing
 */

import { v4 } from 'uuid';
import {
  BaseTile,
  TileCategory,
  TileConfig,
  TileContext,
  TileResult,
  Observation,
  PollenGrain,
} from '../tile.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Accumulated entry
 */
export interface AccumulatedEntry {
  timestamp: number;
  value: unknown;
  weight: number;
  metadata?: Record<string, unknown>;
}

/**
 * Accumulator tile configuration
 */
export interface AccumulatorTileConfig extends TileConfig {
  maxAccumulated?: number;
  flushThreshold?: number;
  aggregationStrategy?: 'mean' | 'max' | 'weighted_mean' | 'last';
}

/**
 * Accumulated output
 */
export interface AccumulatorOutput {
  aggregated: unknown;
  count: number;
  flushed: boolean;
}

// ============================================================================
// ACCUMULATOR TILE
// ============================================================================

/**
 * AccumulatorTile - Collects and batches observations
 *
 * Features:
 * - Accumulates inputs over time
 * - Configurable flush threshold
 * - Multiple aggregation strategies
 * - Weight-based accumulation
 */
export class AccumulatorTile extends BaseTile<unknown, AccumulatorOutput> {
  private accumulated: AccumulatedEntry[] = [];
  private maxAccumulated: number;
  private flushThreshold: number;
  private aggregationStrategy: string;

  constructor(config: AccumulatorTileConfig) {
    super({
      ...config,
      name: config.name || 'accumulator',
      category: config.category ?? TileCategory.ROLE,
    });

    this.maxAccumulated = config.maxAccumulated ?? 1000;
    this.flushThreshold = config.flushThreshold ?? 100;
    this.aggregationStrategy = config.aggregationStrategy ?? 'mean';
  }

  /**
   * Execute accumulation
   */
  async execute(
    input: unknown,
    context: TileContext
  ): Promise<TileResult<AccumulatorOutput>> {
    const startTime = Date.now();

    // Add to accumulation
    const entry: AccumulatedEntry = {
      timestamp: Date.now(),
      value: input,
      weight: this.computeWeight(input, context),
      metadata: { contextId: context.causalChainId },
    };

    this.accumulated.push(entry);

    // Check flush threshold
    const shouldFlush = this.accumulated.length >= this.flushThreshold;

    // Trim if over max
    if (this.accumulated.length > this.maxAccumulated) {
      this.accumulated = this.accumulated.slice(-this.maxAccumulated);
    }

    // Compute aggregated output
    const aggregated = shouldFlush
      ? this.aggregate()
      : this.partialAggregate();

    return {
      output: {
        aggregated,
        count: this.accumulated.length,
        flushed: shouldFlush,
      },
      success: true,
      confidence: Math.min(1, this.accumulated.length / this.flushThreshold),
      executionTimeMs: Date.now() - startTime,
      energyUsed: this.accumulated.length * 0.1,
      observations: shouldFlush ? this.flushObservations() : [],
    };
  }

  /**
   * Compute weight for an entry
   */
  private computeWeight(input: unknown, context: TileContext): number {
    // Weight based on context and predicted value
    let weight = 1.0;

    if (context.predictedValue !== undefined) {
      weight *= (context.predictedValue + 1) / 2; // Normalize to [0, 1]
    }

    if (context.energyBudget < 50) {
      weight *= 0.5; // Lower weight when energy constrained
    }

    return weight;
  }

  /**
   * Aggregate all accumulated values
   */
  private aggregate(): unknown {
    if (this.accumulated.length === 0) return null;

    const values = this.accumulated.map(e => e.value);
    const weights = this.accumulated.map(e => e.weight);

    switch (this.aggregationStrategy) {
      case 'mean':
        return this.aggregateMean(values);

      case 'max':
        return this.aggregateMax(values);

      case 'weighted_mean':
        return this.aggregateWeightedMean(values, weights);

      case 'last':
        return values[values.length - 1];

      default:
        return this.aggregateMean(values);
    }
  }

  /**
   * Partial aggregation (before flush)
   */
  private partialAggregate(): unknown {
    // Return running statistics
    return {
      count: this.accumulated.length,
      progress: this.accumulated.length / this.flushThreshold,
      latest: this.accumulated[this.accumulated.length - 1]?.value,
    };
  }

  /**
   * Mean aggregation
   */
  private aggregateMean(values: unknown[]): unknown {
    // Only works for numeric arrays
    if (this.isNumericArray(values)) {
      const nums = values as number[];
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    }

    // For objects, return count-based summary
    return { count: values.length, type: typeof values[0] };
  }

  /**
   * Max aggregation
   */
  private aggregateMax(values: unknown[]): unknown {
    if (this.isNumericArray(values)) {
      return Math.max(...(values as number[]));
    }
    return values[values.length - 1]; // Return last for non-numeric
  }

  /**
   * Weighted mean aggregation
   */
  private aggregateWeightedMean(values: unknown[], weights: number[]): unknown {
    if (this.isNumericArray(values)) {
      const nums = values as number[];
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const weightedSum = nums.reduce((sum, v, i) => sum + v * weights[i], 0);
      return weightedSum / totalWeight;
    }
    return this.aggregateMean(values);
  }

  /**
   * Check if array is numeric
   */
  private isNumericArray(values: unknown[]): boolean {
    return values.every(v => typeof v === 'number');
  }

  /**
   * Flush observations for learning
   */
  private flushObservations(): Observation[] {
    const observations: Observation[] = this.accumulated.map(entry => ({
      timestamp: entry.timestamp,
      input: entry.value,
      output: entry.value,
      reward: entry.weight,
      context: entry.metadata ?? {},
    }));

    // Clear accumulation after flush
    this.accumulated = [];

    return observations;
  }

  /**
   * Force flush without execution
   */
  forceFlush(): AccumulatedEntry[] {
    const flushed = [...this.accumulated];
    this.accumulated = [];
    return flushed;
  }

  /**
   * Get current accumulation count
   */
  get count(): number {
    return this.accumulated.length;
  }

  /**
   * Deserialize from pollen grain
   */
  static deserialize(grain: PollenGrain): AccumulatorTile {
    const configData = grain.config ?? {};
    const config: AccumulatorTileConfig = {
      id: grain.tileId,
      name: grain.tileName,
      category: grain.category,
      maxAccumulated: (configData['maxAccumulated'] as number) ?? 1000,
      flushThreshold: (configData['flushThreshold'] as number) ?? 100,
      aggregationStrategy: (configData['aggregationStrategy'] as AccumulatorTileConfig['aggregationStrategy']) ?? 'mean',
      initialWeights: grain.weights,
    };

    return new AccumulatorTile(config);
  }

  /**
   * Override serialization
   */
  override serialize(): PollenGrain {
    const grain = super.serialize();
    grain.config = {
      maxAccumulated: this.maxAccumulated,
      flushThreshold: this.flushThreshold,
      aggregationStrategy: this.aggregationStrategy,
      currentCount: this.accumulated.length,
    };
    return grain;
  }
}

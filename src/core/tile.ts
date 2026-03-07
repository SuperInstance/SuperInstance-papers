/**
 * POLLN Living Tile System
 * Tiles that observe, learn, and adapt
 */

import { EventEmitter } from 'events';
import { v4 } from 'uuid';

// ============================================================================
// TILE INTERFACES
// ============================================================================

/**
 * A Tile is a self-contained, trainable, shareable unit of behavior.
 * Like a ScratchJr block, but alive - it observes, learns, and adapts.
 */
export interface Tile<TInput = unknown, TOutput = unknown> {
  // Identity
  id: string;
  name: string;
  category: TileCategory;
  version: string;

  // Core function
  execute(input: TInput, context: TileContext): Promise<TileResult<TOutput>>;

  // Learning
  observe(outcome: TileOutcome): void;
  adapt(): void;

  // Serialization
  serialize(): PollenGrain;
  static deserialize(grain: PollenGrain): Tile;

}

/**
 * Tile categories - different lifespans and behavior patterns
 */
export enum TileCategory {
  // Ephemeral: Born, task, die (like blood cells)
  EPHEMERAL = 'EPHEMERAL',

  // Role: Medium lifespan, knowledge transfer (like skin cells)
  ROLE = 'ROLE',

  // Infrastructure: Long-lived, stable (like bone cells)
  INFRASTRUCTURE = 'INFRASTRUCTURE',
}

/**
 * Tile execution context
 */
export interface TileContext {
  colonyId: string;
  keeperId: string;
  timestamp: number;
  parentTileId?: string;
  causalChainId: string;
  energyBudget: number;
}

/**
 * Tile execution result
 */
export interface TileResult<T> {
  output: T;
  success: boolean;
  confidence: number;
  executionTimeMs: number;
  energyUsed: number;
  observations: Observation[];
}
/**
 * Observation for learning
 */
export interface Observation {
  timestamp: number;
  input: unknown;
  output: unknown;
  reward: number;
  context: Record<string, unknown>;
}

/**
 * Outcome of tile execution
 */
export interface TileOutcome {
  success: boolean;
  reward: number;
  sideEffects: string[];
  learnedPatterns: string[];
}

/**
 * Pollen Grain - a serialized, trained tile ready for sharing
 */
export interface PollenGrain {
  id: string;
  tileId: string;
  tileName: string;
  category: TileCategory;

  // Compressed learned behavior
  embedding: number[];
  weights: Record<string, number>;

  // Training provenance
  trainingEpisodes: number;
  successRate: number;
  avgReward: number;

  // Metadata
  createdAt: number;
  sourceKeeperId: string;
  signature: string;
}

// ============================================================================
// BASE TILE IMPLEMENTATION
// ============================================================================

/**
 * Base implementation of a living tile
 */
export abstract class BaseTile<TInput = unknown, TOutput = unknown>
  extends EventEmitter
  implements Tile<TInput, TOutput>
{
  public readonly id: string;
  public readonly name: string;
  public readonly category: TileCategory;

  // Learning state
  protected observations: Observation[] = [];
  protected weights: Map<string, number> = new Map();
  protected lastAdaptation: number = 0;

  // Configuration
  protected readonly config: TileConfig;

  constructor(config: TileConfig) {
    super();
    this.id = config.id || v4();
    this.name = config.name;
    this.category = config.category || TileCategory.ROLE;
    this.config = config;
  }

  /**
   * Execute the tile's core behavior
   */
  abstract async execute(
    input: TInput,
    context: TileContext
  ): Promise<TileResult<TOutput>>;

  /**
   * Observe an outcome for learning
   */
  observe(outcome: TileOutcome): void {
    const observation: Observation = {
      timestamp: Date.now(),
      input: outcome,
      reward: outcome.reward,
      context: { success: outcome.success },
    };
    this.observations.push(observation);

    // Periodically adapt based on observations
    if (this.observations.length % 100 === 0) {
      this.adapt();
      this.observations = this.observations.slice(-50); // Keep last 50
    }
  }

  /**
   * Adapt behavior based on observations
   */
  adapt(): void {
    // Calculate average reward
    const avgReward = this.observations.reduce((sum, o) => sum + o.reward, 0) / this.observations.length;

    // Update weights based on reward signal
    for (const [key, value] of this.weights) {
      const observationsForKey = this.observations.filter(o => o.context[key] !== undefined);
      if (observationsForKey.length > 0) {
        const keyAvgReward = observationsForKey.reduce((sum, o) => sum + o.reward, 0) / observationsForKey.length;
        // Hebbian-style weight update
        this.weights.set(key, value + 0.1 * (keyAvgReward - 0.5));
      }
    }

    this.lastAdaptation = Date.now();
    this.emit('adapted', { avgReward, observations: this.observations.length });
  }

  /**
   * Serialize tile to pollen grain for sharing
   */
  serialize(): PollenGrain {
    return {
      id: v4(),
      tileId: this.id,
      tileName: this.name,
      category: this.category,
      embedding: this.compressToEmbedding(),
      weights: Object.from(this.weights),
      trainingEpisodes: this.observations.length,
      successRate: this.calculateSuccessRate(),
      avgReward: this.calculateAvgReward(),
      createdAt: Date.now(),
      sourceKeeperId: 'system', // Would be set by colony
      signature: 'pending', // Would be signed by colony
    };
  }

  /**
   * Deserialize pollen grain into tile
   */
  static deserialize(grain: PollenGrain): BaseTile {
    // This would be implemented by concrete tile classes
    throw new Error('deserialize must to be implemented by concrete tile classes');
  }

  // Protected helper methods

  protected compressToEmbedding(): number[] {
    // Simple compression: take top N weight values
    const weights = Array.from(this.weights.values()).sort((a, b) => b - a).slice(0, 64);
    return weights;
  }

  protected calculateSuccessRate(): number {
    if (this.observations.length === 0) return 0;
    const successes = this.observations.filter(o => o.reward > 0.5).length;
    return successes / this.observations.length;
  }

  protected calculateAvgReward(): number {
    if (this.observations.length === 0) return 0;
    return this.observations.reduce((sum, o) => sum + o.reward, 0) / this.observations.length;
  }
}

/**
 * Tile configuration
 */
export interface TileConfig {
  id?: string;
  name: string;
  category?: TileCategory;
  initialWeights?: Record<string, number>;
  maxObservations?: number;
}

// ============================================================================
// TILE COMPOSITION
// ============================================================================

/**
 * Compose multiple tiles into a pipeline
 */
export class TilePipeline {
  private tiles: BaseTile[] = [];

  add(tile: BaseTile): this {
    this.tiles.push(tile);
  }

  async execute<TInput, TOutput>(
    input: TInput,
    context: TileContext
  ): Promise<TileResult<TOutput>> {
    let currentInput: unknown = input;
    const allObservations: Observation[] = [];
    const startTime = Date.now();

    for (const tile of this.tiles) {
      const result = await tile.execute(currentInput, context);
      currentInput = result.output;
      allObservations.push(...result.observations);

      // Each tile observes the chain's outcome
      tile.observe({
        success: result.success,
        reward: result.confidence,
        sideEffects: [],
        learnedPatterns: [],
      });
    }

    return {
      output: currentInput as TOutput,
      success: true,
      confidence: 1.0,
      executionTimeMs: Date.now() - startTime,
      energyUsed: 0, // Would be calculated
      observations: allObservations,
    };
  }
}

// ============================================================================
// TILE LIFECYCLE
// ============================================================================

/**
 * Manage tile lifecycles based on category
 */
export class TileLifecycleManager {
  private tiles: Map<string, BaseTile> = new Map();
  private creationTime: Map<string, number> = new Map();

  /**
   * Check if tile should be terminated based on its category
   */
  shouldTerminate(tileId: string): boolean {
    const tile = this.tiles.get(tileId);
    if (!tile) return false;

    const age = Date.now() - (this.creationTime.get(tileId) || 0);

    switch (tile.category) {
      case TileCategory.EPHEMERAL:
        // Ephemeral tiles die after task completion or timeout
        return tile.observations.length > 0 && age > 60000; // 1 minute

      case TileCategory.ROLE:
        // Role tiles die when performance degrades
        const successRate = tile['calculateSuccessRate']?.() ?? 1;
        return successRate < 0.3 && age > 86400000; // 1 day

      case TileCategory.INFRASTRUCTURE:
        // Infrastructure tiles rarely die
        return false;

      default:
        return false;
    }
  }

  /**
   * Get lifespan description for category
   */
  static getLifespanDescription(category: TileCategory): string {
    switch (category) {
      case TileCategory.EPHEMERAL:
        return 'Task-bound (minutes to hours)';
      case TileCategory.ROLE:
        return 'Performance-bound (days to weeks)';
      case TileCategory.INFRASTRUCTURE:
        return 'Age-bound (months to years)';
    }
  }
}

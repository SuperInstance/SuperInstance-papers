/**
 * POLLN Living Tile System
 * Tiles that observe, learn, and adapt
 *
 * Unified with Agent system - Tiles ARE specialized Agents
 * with observation-based learning and serialization capabilities.
 */

import { EventEmitter } from 'events';
import { v4 } from 'uuid';
import type { A2APackage as A2APackageType, PrivacyLevel, SubsumptionLayer } from './types.js';

// ============================================================================
// TILE INTERFACES
// ============================================================================

/**
 * A Tile is a self-contained, trainable, shareable unit of behavior.
 * Like a ScratchJr block, but alive - it observes, learns, and adapts.
 *
 * Tiles extend the Agent concept with:
 * - Observation-based learning (not just reward-based)
 * - Serialization to PollenGrains for sharing
 * - Variant management for diversity
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

  // A2A Package support (unified with Agent system)
  createPackage<T>(payload: T, context: TileContext): A2APackageType<T>;
}

/**
 * Tile categories - different lifespans and behavior patterns
 *
 * Unified naming: aligns with biological metaphors
 * - EPHEMERAL: Like blood cells - born, task, die
 * - ROLE: Like skin cells - medium lifespan, knowledge transfer
 * - CORE: Like bone cells - long-lived, infrastructure
 */
export enum TileCategory {
  // Ephemeral: Task-bound (minutes to hours), no succession
  EPHEMERAL = 'EPHEMERAL',

  // Role: Performance-bound (days to weeks), knowledge handoff
  ROLE = 'ROLE',

  // Core: Age-bound (months to years), backup and recovery
  CORE = 'CORE',
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

  // Value network integration
  predictedValue?: number;
  valueConfidence?: number;

  // Plinko selection context
  temperature?: number;
  variantIndex?: number;

  // A2A Package chain
  parentPackageIds?: string[];
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

  // Value network feedback
  actualValue?: number;

  // A2A Package created
  packageId?: string;
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

  // TD(λ) eligibility trace
  eligibilityTrace?: number;
}

/**
 * Outcome of tile execution
 */
export interface TileOutcome {
  success: boolean;
  reward: number;
  sideEffects: string[];
  learnedPatterns: string[];

  // Value prediction error (for TD learning)
  tdError?: number;
}

/**
 * Pollen Grain - a serialized, trained tile ready for sharing
 *
 * This is the "seed" that can be planted in other colonies
 */
export interface PollenGrain {
  id: string;
  tileId: string;
  tileName: string;
  tileType: string; // Class name for deserialization
  category: TileCategory;

  // Compressed learned behavior
  embedding: number[];
  weights: Record<string, number>;

  // Tile-specific configuration (JSON-serializable)
  config?: Record<string, unknown>;

  // Training provenance
  trainingEpisodes: number;
  successRate: number;
  avgReward: number;

  // Value network state
  valueFunction: number;

  // Metadata
  createdAt: number;
  sourceKeeperId: string;
  sourceColonyId: string;
  signature: string;

  // Differential privacy
  privacyBudget?: {
    epsilon: number;
    delta: number;
  };

  // Variant info
  variantId?: string;
  generation?: number;
}

/**
 * Tile variant - multiple versions competing
 */
export interface TileVariant {
  id: string;
  parentTileId: string;
  mutationType: 'parameter_noise' | 'crossover' | 'distillation' | 'dropout';

  // Performance tracking
  executions: number;
  successes: number;
  avgReward: number;

  // Selection probability
  selectionWeight: number;
  lastSelected: number;
}

// ============================================================================
// BASE TILE IMPLEMENTATION
// ============================================================================

/**
 * Base implementation of a living tile
 *
 * Unifies with Agent system by:
 * - Maintaining value function (karmic record)
 * - Creating A2A packages for communication
 * - Supporting Plinko selection
 */
export abstract class BaseTile<TInput = unknown, TOutput = unknown>
  extends EventEmitter
  implements Tile<TInput, TOutput>
{
  public readonly id: string;
  public readonly name: string;
  public readonly category: TileCategory;
  public readonly version: string = '1.0.0';

  // Learning state
  protected observations: Observation[] = [];
  protected weights: Map<string, number> = new Map();
  protected lastAdaptation: number = 0;

  // Value function (unified with Agent system)
  protected valueFunction: number = 0.5;
  protected successCount: number = 0;
  protected failureCount: number = 0;

  // Variant management
  protected variants: TileVariant[] = [];
  protected activeVariant: string | null = null;

  // Configuration
  protected readonly config: TileConfig;

  // TD(λ) eligibility traces
  protected eligibilityTraces: Map<string, number> = new Map();
  protected readonly tdLambda: number = 0.8;
  protected readonly discountFactor: number = 0.99;

  constructor(config: TileConfig) {
    super();
    this.id = config.id || v4();
    this.name = config.name;
    this.category = config.category ?? TileCategory.ROLE;
    this.config = config;

    // Initialize weights
    if (config.initialWeights) {
      for (const [key, value] of Object.entries(config.initialWeights)) {
        this.weights.set(key, value);
      }
    }

    // Initialize primary variant
    this.variants.push({
      id: v4(),
      parentTileId: this.id,
      mutationType: 'parameter_noise',
      executions: 0,
      successes: 0,
      avgReward: 0.5,
      selectionWeight: 1.0,
      lastSelected: Date.now(),
    });
    this.activeVariant = this.variants[0].id;
  }

  /**
   * Execute the tile's core behavior
   */
  abstract execute(
    input: TInput,
    context: TileContext
  ): Promise<TileResult<TOutput>>;

  /**
   * Observe an outcome for learning
   *
   * Implements TD(λ) learning with eligibility traces
   */
  observe(outcome: TileOutcome): void {
    const observation: Observation = {
      timestamp: Date.now(),
      input: outcome,
      output: outcome,
      reward: outcome.reward,
      context: { success: outcome.success },
      eligibilityTrace: 1.0,
    };

    // Update eligibility traces
    this.updateEligibilityTraces();

    this.observations.push(observation);

    // Update value function
    this.updateValueFunction(outcome.reward, outcome.tdError);

    // Update active variant stats
    this.updateVariantStats(outcome);

    // Periodically adapt based on observations
    const adaptInterval = this.config.adaptInterval ?? 100;
    if (this.observations.length % adaptInterval === 0) {
      this.adapt();
      this.trimObservations();
    }

    this.emit('observed', { outcome, observations: this.observations.length });
  }

  /**
   * Update eligibility traces for TD(λ) learning
   */
  private updateEligibilityTraces(): void {
    // Decay all traces
    for (const [key, trace] of this.eligibilityTraces) {
      this.eligibilityTraces.set(key, trace * this.tdLambda * this.discountFactor);
    }
  }

  /**
   * Update value function using TD learning
   */
  protected updateValueFunction(reward: number, tdError?: number): void {
    const error = tdError ?? (reward - this.valueFunction);
    const learningRate = 0.1;

    this.valueFunction = Math.max(0, Math.min(1,
      this.valueFunction + learningRate * error
    ));

    this.successCount += reward > 0.5 ? 1 : 0;
    this.failureCount += reward < 0.5 ? 1 : 0;
  }

  /**
   * Update variant performance stats
   */
  private updateVariantStats(outcome: TileOutcome): void {
    const variant = this.variants.find(v => v.id === this.activeVariant);
    if (!variant) return;

    variant.executions++;
    if (outcome.success) variant.successes++;

    // Exponential moving average for reward
    const alpha = 0.1;
    variant.avgReward = alpha * outcome.reward + (1 - alpha) * variant.avgReward;
    variant.lastSelected = Date.now();
  }

  /**
   * Adapt behavior based on observations
   *
   * Implements Hebbian learning with reward modulation
   */
  adapt(): void {
    if (this.observations.length === 0) return;

    // Calculate average reward
    const avgReward = this.observations.reduce((sum, o) => sum + o.reward, 0) / this.observations.length;

    // Update weights based on reward signal (Hebbian + reward modulation)
    for (const [key, value] of this.weights) {
      const observationsForKey = this.observations.filter(o => o.context[key] !== undefined);
      if (observationsForKey.length > 0) {
        const keyAvgReward = observationsForKey.reduce((sum, o) => sum + o.reward, 0) / observationsForKey.length;

        // Hebbian-style weight update with reward modulation
        const rewardModulation = avgReward > 0.5 ? 1.1 : 0.9;
        const newWeight = value + 0.1 * (keyAvgReward - 0.5) * rewardModulation;

        this.weights.set(key, Math.max(-1, Math.min(1, newWeight)));
      }
    }

    // Update variant selection weights based on performance
    this.updateVariantWeights();

    this.lastAdaptation = Date.now();
    this.emit('adapted', { avgReward, observations: this.observations.length });
  }

  /**
   * Update variant selection weights using softmax
   */
  private updateVariantWeights(): void {
    if (this.variants.length === 0) return;

    // Calculate softmax probabilities based on avgReward
    const rewards = this.variants.map(v => v.avgReward);
    const maxReward = Math.max(...rewards);
    const expRewards = rewards.map(r => Math.exp((r - maxReward) * 2)); // Temperature = 0.5
    const sumExp = expRewards.reduce((a, b) => a + b, 0);

    this.variants.forEach((v, i) => {
      v.selectionWeight = expRewards[i] / sumExp;
    });
  }

  /**
   * Select a variant using Plinko-style stochastic selection
   */
  selectVariant(temperature: number = 1.0): TileVariant {
    if (this.variants.length === 1) {
      return this.variants[0];
    }

    // Add Gumbel noise for exploration
    const gumbelNoise = this.variants.map(() =>
      -Math.log(-Math.log(Math.random()))
    );

    // Compute selection scores
    const scores = this.variants.map((v, i) =>
      (v.selectionWeight + temperature * gumbelNoise[i]) / temperature
    );

    // Select highest score
    const maxIndex = scores.indexOf(Math.max(...scores));
    const selected = this.variants[maxIndex];
    this.activeVariant = selected.id;

    return selected;
  }

  /**
   * Create an A2A Package (unified with Agent system)
   */
  createPackage<T>(payload: T, context: TileContext): A2APackage<T> {
    return {
      id: v4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: context.colonyId,
      type: 'tile_result',
      payload,
      parentIds: context.parentPackageIds ?? [],
      causalChainId: context.causalChainId,
      privacyLevel: this.getPrivacyLevel(),
      layer: this.getSubsumptionLayer(),
    };
  }

  /**
   * Get privacy level based on tile category
   */
  protected getPrivacyLevel(): PrivacyLevel {
    switch (this.category) {
      case TileCategory.EPHEMERAL:
        return 'COLONY' as PrivacyLevel;
      case TileCategory.ROLE:
        return 'COLONY' as PrivacyLevel;
      case TileCategory.CORE:
        return 'PRIVATE' as PrivacyLevel;
      default:
        return 'COLONY' as PrivacyLevel;
    }
  }

  /**
   * Get subsumption layer based on tile category
   */
  protected getSubsumptionLayer(): SubsumptionLayer {
    switch (this.category) {
      case TileCategory.EPHEMERAL:
        return 'REFLEX' as SubsumptionLayer;
      case TileCategory.ROLE:
        return 'HABITUAL' as SubsumptionLayer;
      case TileCategory.CORE:
        return 'DELIBERATE' as SubsumptionLayer;
      default:
        return 'HABITUAL' as SubsumptionLayer;
    }
  }

  /**
   * Serialize tile to pollen grain for sharing
   */
  serialize(): PollenGrain {
    return {
      id: v4(),
      tileId: this.id,
      tileName: this.name,
      tileType: this.constructor.name,
      category: this.category,
      embedding: this.compressToEmbedding(),
      weights: Object.fromEntries(this.weights),
      trainingEpisodes: this.observations.length,
      successRate: this.calculateSuccessRate(),
      avgReward: this.calculateAvgReward(),
      valueFunction: this.valueFunction,
      createdAt: Date.now(),
      sourceKeeperId: this.config.keeperId ?? 'system',
      sourceColonyId: this.config.colonyId ?? 'system',
      signature: 'pending', // Would be signed by colony
      variantId: this.activeVariant ?? undefined,
      generation: this.calculateGeneration(),
    };
  }

  /**
   * Spawn a new variant through mutation
   */
  spawnVariant(mutationType: TileVariant['mutationType'] = 'parameter_noise'): TileVariant {
    const variant: TileVariant = {
      id: v4(),
      parentTileId: this.id,
      mutationType,
      executions: 0,
      successes: 0,
      avgReward: 0.5,
      selectionWeight: 0.1, // Start with low weight
      lastSelected: Date.now(),
    };

    // Apply mutation to create variant-specific weights
    switch (mutationType) {
      case 'parameter_noise':
        // Small random perturbations to weights
        for (const [key, value] of this.weights) {
          const noise = (Math.random() - 0.5) * 0.1;
          this.weights.set(`${key}_variant_${variant.id}`, value + noise);
        }
        break;
      case 'dropout':
        // Randomly disable some weights
        const keys = Array.from(this.weights.keys());
        const dropKeys = keys.filter(() => Math.random() < 0.2);
        for (const key of dropKeys) {
          this.weights.set(`${key}_variant_${variant.id}`, 0);
        }
        break;
      // crossover and distillation would require another tile
    }

    this.variants.push(variant);
    this.emit('variant_spawned', { variantId: variant.id, mutationType });

    return variant;
  }

  /**
   * Prune underperforming variants
   */
  pruneVariants(minExecutions: number = 10): number {
    const before = this.variants.length;

    // Keep at least one variant
    if (this.variants.length <= 1) return 0;

    // Remove variants with poor performance after enough trials
    this.variants = this.variants.filter(v => {
      // Always keep if not enough executions
      if (v.executions < minExecutions) return true;

      // Remove if significantly below average
      const avgPerformance = this.variants.reduce((s, v) => s + v.avgReward, 0) / this.variants.length;
      return v.avgReward >= avgPerformance * 0.7;
    });

    const pruned = before - this.variants.length;
    if (pruned > 0) {
      this.emit('variants_pruned', { count: pruned });
    }

    return pruned;
  }

  // Protected helper methods

  protected compressToEmbedding(): number[] {
    // Simple compression: take top N weight values
    const weights = Array.from(this.weights.values())
      .sort((a, b) => Math.abs(b) - Math.abs(a))
      .slice(0, 64);

    // Pad to 64 dimensions
    while (weights.length < 64) {
      weights.push(0);
    }

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

  protected calculateGeneration(): number {
    // Count variant generations
    return this.variants.length;
  }

  protected trimObservations(): void {
    const maxObservations = this.config.maxObservations ?? 1000;
    if (this.observations.length > maxObservations) {
      // Keep most recent and highest reward observations
      this.observations = this.observations
        .sort((a, b) => b.reward - a.reward)
        .slice(0, maxObservations / 2)
        .concat(
          this.observations
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, maxObservations / 2)
        );
    }
  }

  /**
   * Get tile statistics
   */
  getStats(): {
    observations: number;
    weights: number;
    valueFunction: number;
    successRate: number;
    variants: number;
    avgReward: number;
  } {
    return {
      observations: this.observations.length,
      weights: this.weights.size,
      valueFunction: this.valueFunction,
      successRate: this.calculateSuccessRate(),
      variants: this.variants.length,
      avgReward: this.calculateAvgReward(),
    };
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
  adaptInterval?: number;

  // Colony/keeper context
  colonyId?: string;
  keeperId?: string;

  // Learning parameters
  learningRate?: number;
  tdLambda?: number;
  discountFactor?: number;

  // Variant settings
  maxVariants?: number;
  variantMutationRate?: number;
}

// Re-export PrivacyLevel and SubsumptionLayer from types
export { PrivacyLevel, SubsumptionLayer } from './types.js';

// Use A2APackage from types
type A2APackage<T = unknown> = import('./types.js').A2APackage<T>;

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
    return this;
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
      case TileCategory.EPHEMERAL: {
        // Ephemeral tiles die after task completion or timeout
        const stats = tile.getStats();
        return stats.observations > 0 && age > 60000; // 1 minute
      }

      case TileCategory.ROLE:
        // Role tiles die when performance degrades
        const successRate = tile['calculateSuccessRate']?.() ?? 1;
        return successRate < 0.3 && age > 86400000; // 1 day

      case TileCategory.CORE:
        // Core tiles rarely die - only on critical failure
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
      case TileCategory.CORE:
        return 'Age-bound (months to years)';
      default:
        return 'Unknown';
    }
  }
}

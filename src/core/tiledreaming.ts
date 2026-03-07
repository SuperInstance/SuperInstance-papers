/**
 * POLLN Tile Dreaming System
 *
 * Overnight optimization for tiles using world model dreaming.
 * Tiles "sleep" to consolidate experiences and optimize behavior.
 *
 * Key concepts:
 * - Tiles collect experiences during active execution
 * - During sleep cycles, tiles replay experiences through the world model
 * - Policy optimization improves tile behavior without real-world interaction
 * - Variants compete during dreams, underperforming ones are pruned
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { BaseTile, TileVariant, Observation, PollenGrain, TileContext } from './tile.js';
import type { WorldModel, DreamEpisode } from './worldmodel.js';
import type { ValueNetwork } from './valuenetwork.js';

// ============================================================================
// TILE DREAMING TYPES
// ============================================================================

/**
 * Configuration for tile dreaming
 */
export interface TileDreamingConfig {
  // Sleep cycle parameters
  sleepIntervalMs: number;          // Time between sleep cycles
  minExperiencesForSleep: number;   // Minimum experiences needed
  sleepDurationMs: number;          // Duration of sleep cycle

  // Dream parameters
  dreamBatchSize: number;           // Dreams per sleep cycle
  dreamHorizon: number;             // Steps per dream
  imaginationDepth: number;         // How deep to imagine consequences

  // Optimization parameters
  learningRate: number;             // Policy learning rate
  variantTournamentSize: number;    // Variants to compare per dream
  pruningThreshold: number;         // Performance threshold for pruning
  mutationRate: number;             // Rate of variant mutations

  // Memory consolidation
  consolidationWindow: number;      // Experiences to consolidate
  memoryCompressionRatio: number;   // How much to compress memories
  keepImportantMemories: number;    // Important memories to always keep
}

/**
 * Tile experience for dreaming
 */
export interface TileExperience {
  id: string;
  tileId: string;
  variantId: string | null;

  // Experience data
  input: unknown;
  output: unknown;
  context: TileContext;

  // Learning signal
  reward: number;
  tdError: number;
  advantage: number;

  // Metadata
  timestamp: number;
  importance: number;
  consolidated: boolean;
}

/**
 * Dream result for a tile
 */
export interface TileDreamResult {
  tileId: string;
  episodesGenerated: number;
  policyUpdated: boolean;
  variantsPruned: number;
  variantsCreated: number;
  avgDreamReward: number;
  improvement: number;
  consolidatedMemories: number;
  timestamp: number;
}

/**
 * Sleep cycle report
 */
export interface SleepReport {
  startTime: number;
  endTime: number;
  tilesProcessed: number;
  totalEpisodes: number;
  totalImprovement: number;
  variantsPruned: number;
  variantsCreated: number;
  memoriesConsolidated: number;
}

// ============================================================================
// TILE DREAMER IMPLEMENTATION
// ============================================================================

/**
 * TileDreamer - Manages overnight optimization for tiles
 *
 * Features:
 * - Sleep cycles for tile optimization
 * - Experience replay through world model
 * - Variant tournament selection
 * - Memory consolidation
 */
export class TileDreamer extends EventEmitter {
  private config: TileDreamingConfig;
  private worldModel: WorldModel;
  private valueNetwork: ValueNetwork | null;

  // Tile registry
  private tiles: Map<string, BaseTile> = new Map();
  private experiences: Map<string, TileExperience[]> = new Map();

  // Sleep state
  private isSleeping: boolean = false;
  private lastSleepTime: number = 0;
  private sleepCycleCount: number = 0;

  // Tracking
  private dreamHistory: TileDreamResult[] = [];
  private sleepReports: SleepReport[] = [];

  constructor(
    worldModel: WorldModel,
    valueNetwork: ValueNetwork | null = null,
    config?: Partial<TileDreamingConfig>
  ) {
    super();

    this.worldModel = worldModel;
    this.valueNetwork = valueNetwork;

    this.config = {
      sleepIntervalMs: 3600000,      // 1 hour
      minExperiencesForSleep: 10,
      sleepDurationMs: 60000,        // 1 minute
      dreamBatchSize: 10,
      dreamHorizon: 20,
      imaginationDepth: 3,
      learningRate: 0.01,
      variantTournamentSize: 3,
      pruningThreshold: 0.3,
      mutationRate: 0.1,
      consolidationWindow: 100,
      memoryCompressionRatio: 0.5,
      keepImportantMemories: 10,
      ...config,
    };
  }

  // ===========================================================================
  // TILE REGISTRATION
  // ===========================================================================

  /**
   * Register a tile for dreaming optimization
   */
  registerTile(tile: BaseTile): void {
    this.tiles.set(tile.id, tile);
    this.experiences.set(tile.id, []);

    this.emit('tile_registered', { tileId: tile.id, name: tile.name });
  }

  /**
   * Unregister a tile
   */
  unregisterTile(tileId: string): void {
    this.tiles.delete(tileId);
    this.experiences.delete(tileId);
  }

  // ===========================================================================
  // EXPERIENCE COLLECTION
  // ===========================================================================

  /**
   * Add experience for a tile
   */
  addExperience(
    tileId: string,
    input: unknown,
    output: unknown,
    context: TileContext,
    reward: number
  ): void {
    const experiences = this.experiences.get(tileId);
    if (!experiences) return;

    const tile = this.tiles.get(tileId);
    if (!tile) return;

    // Compute TD error if value network available
    let tdError = 0;
    let advantage = reward;
    if (this.valueNetwork) {
      const stateVec = this.encodeState(input, context);
      const stateMap = new Map<string, unknown>([['embedding', stateVec]]);
      const valuePred = this.valueNetwork.predict(stateMap);
      tdError = reward - valuePred.value;
      advantage = tdError;
    }

    // Compute importance for prioritized replay
    const importance = this.computeImportance(reward, tdError);

    const experience: TileExperience = {
      id: uuidv4(),
      tileId,
      variantId: tile['activeVariant'] ?? null,
      input,
      output,
      context,
      reward,
      tdError,
      advantage,
      timestamp: Date.now(),
      importance,
      consolidated: false,
    };

    experiences.push(experience);

    // Trim old experiences
    if (experiences.length > this.config.consolidationWindow * 2) {
      this.trimExperiences(tileId);
    }
  }

  /**
   * Compute importance score for experience
   */
  private computeImportance(reward: number, tdError: number): number {
    // Higher importance for surprising (high TD error) or high reward experiences
    return Math.abs(tdError) * 0.7 + Math.abs(reward - 0.5) * 0.3;
  }

  /**
   * Trim experiences, keeping important ones
   */
  private trimExperiences(tileId: string): void {
    const experiences = this.experiences.get(tileId);
    if (!experiences) return;

    // Sort by importance
    experiences.sort((a, b) => b.importance - a.importance);

    // Keep top experiences
    const keepCount = Math.floor(this.config.consolidationWindow * this.config.memoryCompressionRatio);
    const trimmed = experiences.slice(0, Math.max(keepCount, this.config.keepImportantMemories));

    this.experiences.set(tileId, trimmed);
  }

  // ===========================================================================
  // SLEEP CYCLES
  // ===========================================================================

  /**
   * Check if sleep cycle should run
   */
  shouldSleep(): boolean {
    if (this.isSleeping) return false;

    const timeSinceLastSleep = Date.now() - this.lastSleepTime;
    if (timeSinceLastSleep < this.config.sleepIntervalMs) return false;

    // Check if any tile has enough experiences
    for (const [tileId, experiences] of this.experiences) {
      if (experiences.length >= this.config.minExperiencesForSleep) {
        return true;
      }
    }

    return false;
  }

  /**
   * Run a sleep cycle for all tiles
   */
  async sleep(): Promise<SleepReport> {
    if (this.isSleeping) {
      throw new Error('Already sleeping');
    }

    this.isSleeping = true;
    const startTime = Date.now();

    this.emit('sleep_started', { time: startTime });

    let tilesProcessed = 0;
    let totalEpisodes = 0;
    let totalImprovement = 0;
    let variantsPruned = 0;
    let variantsCreated = 0;
    let memoriesConsolidated = 0;

    // Process each tile with enough experiences
    for (const [tileId, tile] of this.tiles) {
      const experiences = this.experiences.get(tileId) ?? [];
      if (experiences.length < this.config.minExperiencesForSleep) continue;

      // Run dreaming for this tile
      const result = await this.dreamForTile(tileId);

      tilesProcessed++;
      totalEpisodes += result.episodesGenerated;
      totalImprovement += result.improvement;
      variantsPruned += result.variantsPruned;
      variantsCreated += result.variantsCreated;
      memoriesConsolidated += result.consolidatedMemories;

      this.dreamHistory.push(result);
    }

    const endTime = Date.now();
    this.isSleeping = false;
    this.lastSleepTime = endTime;
    this.sleepCycleCount++;

    const report: SleepReport = {
      startTime,
      endTime,
      tilesProcessed,
      totalEpisodes,
      totalImprovement,
      variantsPruned,
      variantsCreated,
      memoriesConsolidated,
    };

    this.sleepReports.push(report);
    this.emit('sleep_completed', report);

    return report;
  }

  /**
   * Run dreaming optimization for a specific tile
   */
  private async dreamForTile(tileId: string): Promise<TileDreamResult> {
    const tile = this.tiles.get(tileId);
    const experiences = this.experiences.get(tileId) ?? [];

    if (!tile) {
      return this.emptyDreamResult(tileId);
    }

    let episodesGenerated = 0;
    let avgDreamReward = 0;
    let policyUpdated = false;

    // Generate dream episodes from experiences
    const dreamRewards: number[] = [];
    for (let i = 0; i < this.config.dreamBatchSize; i++) {
      // Sample starting experience
      const startExp = this.sampleExperience(experiences);
      if (!startExp) continue;

      // Generate dream episode through world model
      const dream = await this.generateDreamEpisode(startExp);
      episodesGenerated++;
      dreamRewards.push(dream.totalReward);

      // Update policy based on dream
      this.updatePolicyFromDream(tile, dream);
      policyUpdated = true;
    }

    avgDreamReward = dreamRewards.length > 0
      ? dreamRewards.reduce((a, b) => a + b, 0) / dreamRewards.length
      : 0;

    // Run variant tournament
    const { pruned, created } = this.runVariantTournament(tile);

    // Consolidate memories
    const consolidatedMemories = this.consolidateMemories(tileId);

    // Calculate improvement
    const stats = tile.getStats();
    const improvement = avgDreamReward > 0 ? avgDreamReward : 0;

    return {
      tileId,
      episodesGenerated,
      policyUpdated,
      variantsPruned: pruned,
      variantsCreated: created,
      avgDreamReward,
      improvement,
      consolidatedMemories,
      timestamp: Date.now(),
    };
  }

  /**
   * Sample experience prioritized by importance
   */
  private sampleExperience(experiences: TileExperience[]): TileExperience | null {
    if (experiences.length === 0) return null;

    // Compute sampling probabilities
    const totalImportance = experiences.reduce((sum, e) => sum + e.importance, 0);
    let r = Math.random() * totalImportance;

    for (const exp of experiences) {
      r -= exp.importance;
      if (r <= 0) return exp;
    }

    return experiences[experiences.length - 1];
  }

  /**
   * Generate dream episode from starting experience
   */
  private async generateDreamEpisode(startExp: TileExperience): Promise<DreamEpisode> {
    // Encode starting state
    const startState = this.encodeState(startExp.input, startExp.context);

    // Generate dream through world model
    const dream = this.worldModel.dream(
      startState,
      this.config.dreamHorizon,
      (state: number[]) => this.selectDreamAction(state)
    );

    return dream;
  }

  /**
   * Select action during dreaming
   */
  private selectDreamAction(state: number[]): number {
    // Add exploration noise during dreaming
    if (Math.random() < this.config.mutationRate) {
      return Math.floor(Math.random() * 10); // Random action
    }

    // Use simple greedy selection based on state
    let bestAction = 0;
    let bestScore = -Infinity;

    for (let a = 0; a < 10; a++) {
      const score = this.evaluateAction(state, a);
      if (score > bestScore) {
        bestScore = score;
        bestAction = a;
      }
    }

    return bestAction;
  }

  /**
   * Evaluate action quality for dreaming
   */
  private evaluateAction(state: number[], action: number): number {
    // Simple heuristic: dot product of state and action encoding
    const actionVec = this.encodeAction(action);
    let score = 0;
    for (let i = 0; i < Math.min(state.length, actionVec.length); i++) {
      score += state[i] * actionVec[i];
    }
    return score;
  }

  /**
   * Encode action as vector
   */
  private encodeAction(action: number): number[] {
    const vec = new Array(10).fill(0);
    vec[action] = 1;
    return vec;
  }

  /**
   * Update tile policy from dream episode
   */
  private updatePolicyFromDream(tile: BaseTile, dream: DreamEpisode): void {
    // Extract learning signal from dream
    const avgReward = dream.rewards.reduce((a, b) => a + b, 0) / dream.rewards.length;

    // Create observation from dream
    const dreamObservation = {
      timestamp: Date.now(),
      input: dream.startState,
      output: { actions: dream.actions, finalState: dream.states[dream.states.length - 1] },
      reward: avgReward,
      context: { dreamId: dream.id, isDream: true },
      eligibilityTrace: 1.0,
    };

    // Add to tile's observations
    tile['observations'].push(dreamObservation);

    // Trigger adaptation
    if (tile['observations'].length % 10 === 0) {
      tile.adapt();
    }
  }

  /**
   * Run variant tournament during sleep
   */
  private runVariantTournament(tile: BaseTile): { pruned: number; created: number } {
    const stats = tile.getStats();
    let pruned = 0;
    let created = 0;

    // Prune underperforming variants
    pruned = tile.pruneVariants(this.config.pruningThreshold);

    // Potentially create new variant if performance is good
    if (stats.successRate > 0.7 && stats.variants < 5) {
      const mutationTypes: Array<'parameter_noise' | 'crossover' | 'distillation' | 'dropout'> =
        ['parameter_noise', 'crossover', 'distillation', 'dropout'];

      const mutationType = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];
      tile.spawnVariant(mutationType);
      created = 1;
    }

    return { pruned, created };
  }

  /**
   * Consolidate memories for a tile
   */
  private consolidateMemories(tileId: string): number {
    const experiences = this.experiences.get(tileId);
    if (!experiences) return 0;

    let consolidated = 0;

    // Mark old, high-reward experiences as consolidated
    const threshold = Date.now() - this.config.consolidationWindow * 1000;
    for (const exp of experiences) {
      if (!exp.consolidated && exp.timestamp < threshold && exp.reward > 0.7) {
        exp.consolidated = true;
        consolidated++;
      }
    }

    return consolidated;
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Encode state for world model
   */
  private encodeState(input: unknown, context: TileContext): number[] {
    // Create a simple encoding from input and context
    const state: number[] = [];

    // Add context features
    state.push(context.energyBudget / 100);
    state.push(context.predictedValue ?? 0.5);
    state.push(context.temperature ?? 1.0);

    // Add input hash (simplified)
    const inputStr = JSON.stringify(input);
    let hash = 0;
    for (let i = 0; i < inputStr.length; i++) {
      hash = ((hash << 5) - hash) + inputStr.charCodeAt(i);
      hash = hash & hash;
    }
    state.push(Math.abs(hash % 1000) / 1000);

    // Pad to latent dimension
    const latentDim = this.worldModel.getConfig().latentDim;
    while (state.length < latentDim) {
      state.push(0);
    }

    return state.slice(0, latentDim);
  }

  /**
   * Create empty dream result
   */
  private emptyDreamResult(tileId: string): TileDreamResult {
    return {
      tileId,
      episodesGenerated: 0,
      policyUpdated: false,
      variantsPruned: 0,
      variantsCreated: 0,
      avgDreamReward: 0,
      improvement: 0,
      consolidatedMemories: 0,
      timestamp: Date.now(),
    };
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Get dream history for a tile
   */
  getDreamHistory(tileId?: string): TileDreamResult[] {
    if (tileId) {
      return this.dreamHistory.filter(r => r.tileId === tileId);
    }
    return [...this.dreamHistory];
  }

  /**
   * Get sleep reports
   */
  getSleepReports(): SleepReport[] {
    return [...this.sleepReports];
  }

  /**
   * Get current sleep state
   */
  getSleepState(): {
    isSleeping: boolean;
    lastSleepTime: number;
    sleepCycleCount: number;
    registeredTiles: number;
    pendingExperiences: number;
  } {
    let pendingExperiences = 0;
    for (const exps of this.experiences.values()) {
      pendingExperiences += exps.length;
    }

    return {
      isSleeping: this.isSleeping,
      lastSleepTime: this.lastSleepTime,
      sleepCycleCount: this.sleepCycleCount,
      registeredTiles: this.tiles.size,
      pendingExperiences,
    };
  }

  /**
   * Force immediate sleep cycle
   */
  async forceSleep(): Promise<SleepReport> {
    this.lastSleepTime = 0; // Reset to allow immediate sleep
    return this.sleep();
  }
}

// ============================================================================
// TILE DREAMING INTEGRATION
// ============================================================================

// Type for the dreaming tile mixin
type DreamingTileConstructor<T> = new (...args: any[]) => T & {
  _dreamer: TileDreamer;
};

/**
 * Mixin to add dreaming support to tiles
 * Uses type assertion to work around TypeScript's restrictions on
 * private/protected members in exported anonymous classes
 */
export function withDreaming<T extends new (...args: any[]) => BaseTile>(
  Base: T,
  dreamer: TileDreamer
): DreamingTileConstructor<InstanceType<T>> {
  const DreamingTile = class extends (Base as new (...args: any[]) => object) {
    _dreamer: TileDreamer = dreamer;

    constructor(...args: any[]) {
      super(...args);
      dreamer.registerTile(this as unknown as BaseTile);
    }

    /**
     * Override execute to collect experiences
     */
    async execute(input: any, context: TileContext): Promise<any> {
      // Cast to access the base implementation
      const baseProto = Object.getPrototypeOf(Object.getPrototypeOf(this));
      const result = await baseProto.execute.call(this, input, context);

      // Add experience to dreamer
      dreamer.addExperience(
        (this as any).id,
        input,
        result.output,
        context,
        result.success ? result.confidence : 0
      );

      return result;
    }
  };

  return DreamingTile as DreamingTileConstructor<InstanceType<T>>;
}
